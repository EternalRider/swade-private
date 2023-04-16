/* eslint-disable deprecation/deprecation */
import { ActiveEffectDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData';
import { ActorDataSource } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData';
import { EffectChangeDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData';
import { ItemDataSource } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData';
import {
  ActorData,
  ItemData,
  SceneData,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs';
import { Updates } from '../globals';
import { constants } from './constants';
import SwadeUser from './documents/SwadeUser';
import { Logger } from './Logger';

export async function migrateWorld() {
  Logger.info(
    `Applying SWADE System Migration for version ${game.system.version}. Please be patient and do not close your game or shut down your server.`,
    { toast: true },
  );

  // Migrate World Actors
  for (const actor of game.actors!) {
    try {
      const updateData = migrateActorData(actor.toObject());
      if (!foundry.utils.isEmpty(updateData)) {
        Logger.info(`Migrating Actor document ${actor.name}`);
        await actor.update(updateData, { enforceTypes: false });
      }
    } catch (err) {
      err.message = `Failed swade system migration for Actor ${actor.name}: ${err.message}`;
      Logger.error(err);
    }
  }

  // Migrate World Items
  for (const item of game.items!) {
    try {
      const updateData = migrateItemData(item.toObject());
      if (!foundry.utils.isEmpty(updateData)) {
        Logger.info(`Migrating Item document ${item.name}`);
        await item.update(updateData, { enforceTypes: false });
      }
    } catch (err) {
      err.message = `Failed swade system migration for Item ${item.name}: ${err.message}`;
      Logger.error(err);
    }
  }

  // Migrate Compendium Packs
  for (const p of game.packs) {
    if (!['Actor', 'Item', 'Scene'].includes(p.metadata.type)) continue;
    await migrateCompendium(p);
  }

  // Migrate users
  for (const user of game.users!) {
    try {
      const updateData = migrateUser(user);
      if (!foundry.utils.isEmpty(updateData)) {
        Logger.info(`Migrating User document ${user.name}`);
        await user.update(updateData, { enforceTypes: false });
      }
    } catch (err) {
      err.message = `Failed swade system migration for user ${user.name}: ${err.message}`;
      Logger.error(err);
    }
  }

  // Set the migration as complete
  const version = game.system.version;
  await game.settings.set('swade', 'systemMigrationVersion', version);
  Logger.info(`SWADE System Migration to version ${version} completed!`, {
    permanent: true,
    toast: true,
  });
}

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack The compendium to migrate. Only Actor, Item or Scene compendiums are processed
 */
export async function migrateCompendium(
  pack: CompendiumCollection<CompendiumCollection.Metadata>,
) {
  const type = pack.metadata.type;
  if (!['Actor', 'Item', 'Scene'].includes(type)) return;

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  // Begin by requesting server-side data model migration and get the migrated content
  await pack.migrate();
  const documents = await pack.getDocuments();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for (const doc of documents) {
    let updateData: Record<string, any> = {};
    try {
      switch (type) {
        case 'Actor':
          updateData = migrateActorData(doc.toObject() as ActorDataSource);
          break;
        case 'Item':
          updateData = migrateItemData(doc.toObject() as ItemDataSource);
          break;
        case 'Scene':
          updateData = migrateSceneData(doc.data as SceneData);
          break;
      }
      if (foundry.utils.isEmpty(updateData)) continue;

      // Save the entry, if data was changed
      await doc.update(updateData);
      Logger.info(
        `Migrated ${type} document ${doc.name} in Compendium ${pack.collection}`,
      );
    } catch (err) {
      // Handle migration failures
      err.message = `Failed swade system migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
      Logger.error(err);
    }
  }

  // Apply the original locked status for the pack
  await pack.configure({ locked: wasLocked });
  Logger.info(
    `Migrated all ${type} documents from Compendium ${pack.metadata.label}`,
  );
}

/* -------------------------------------------- */
/*  Document Type Migration Helpers             */
/* -------------------------------------------- */

/**
 * Migrate a single Actor document to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {object} actor    The actor data object to update
 * @return {Object}         The updateData to apply
 */
export function migrateActorData(actor: ActorDataSource) {
  const updateData: UpdateData = {};

  // Actor Data Updates
  _migrateVehicleOperator(actor, updateData);
  _migrateGeneralPowerPoints(actor, updateData);

  // Migrate Owned Items
  if (!actor.items) return updateData;
  const items = actor.items.reduce((arr, i) => {
    // Migrate the Owned Item
    const itemUpdate = migrateItemData(i);

    // Update the Owned Item
    if (!foundry.utils.isEmpty(itemUpdate)) {
      itemUpdate._id = i._id;
      arr.push(foundry.utils.expandObject(itemUpdate));
    }

    return arr;
  }, new Array<UpdateData>());

  if (items.length > 0) updateData.items = items;
  return updateData;
}

export function migrateItemData(data: ItemDataSource) {
  const updateData: UpdateData = {};
  _migrateWeaponAPToNumber(data, updateData);
  _migratePowerEquipToFavorite(data, updateData);
  _migrateItemEquipState(data, updateData);
  _migrateWeaponAutoReload(data, updateData);
  _ensureBatteryMaxCharges(data, updateData);
  return updateData;
}

/**
 * Migrate a single Scene document to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} scene  The Scene data to Update
 * @return {Object}       The updateData to apply
 */
export function migrateSceneData(scene: SceneData) {
  const tokens = scene.tokens.map((token) => {
    const t = token.toObject();
    const update: Updates = {};
    if (Object.keys(update).length) foundry.utils.mergeObject(t, update);
    if (!t.actorId || t.actorLink) {
      t.actorData = {};
    } else if (!game?.actors?.has(t.actorId)) {
      t.actorId = null;
      t.actorData = {};
    } else if (!t.actorLink) {
      const actorData = foundry.utils.duplicate(t.actorData) as ActorDataSource;
      actorData.type = token.actor?.type;
      const update = migrateActorData(actorData);
      ['items', 'effects'].forEach((embeddedName) => {
        if (!update[embeddedName]?.length) return;
        const updates = new Map<string, any>(
          update[embeddedName].map((u) => [u._id, u]),
        );
        t.actorData[embeddedName].forEach((original) => {
          const update = updates.get(original._id);
          if (update) foundry.utils.mergeObject(original, update);
        });
        delete update[embeddedName];
      });
      foundry.utils.mergeObject(t.actorData, update);
    }
    return t;
  });
  return { tokens };
}

export function migrateUser(user: SwadeUser) {
  const updateData: UpdateData = {};
  _migrateWildDieFlag(user, updateData);
  return updateData;
}

/**
 * Purge the data model of any inner objects which have been flagged as _deprecated.
 * @param {object} data   The data to clean
 * @private
 */
export function removeDeprecatedObjects(data: ItemData | ActorData) {
  for (const [k, v] of Object.entries(data)) {
    if (getType(v) === 'Object') {
      if (v['_deprecated'] === true) {
        Logger.info(`Deleting deprecated object key ${k}`);
        delete data[k];
      } else removeDeprecatedObjects(v);
    }
  }
  return data;
}

function _migrateVehicleOperator(
  data: ActorDataSource,
  updateData: UpdateData,
) {
  if (data.type !== 'vehicle') return updateData;
  const driverId = data.system.driver.id;
  const hasOldID = !!driverId && driverId.split('.').length === 1;
  if (hasOldID) {
    updateData['system.driver.id'] = `Actor.${driverId}`;
  }
  return updateData;
}

function _migrateGeneralPowerPoints(
  data: ActorDataSource,
  updateData: UpdateData,
) {
  if (data.type === 'vehicle') return updateData;

  const isOld =
    foundry.utils.hasProperty(data, 'system.powerPoints.value') &&
    foundry.utils.hasProperty(data, 'system.powerPoints.max');
  if (!isOld) return updateData;

  //migrate basic PP
  const powerPoints = data.system.powerPoints;
  updateData['system.powerPoints.general.value'] = powerPoints.value;
  updateData['system.powerPoints.general.max'] = powerPoints.max;
  updateData['system.powerPoints.-=max'] = null;
  updateData['system.powerPoints.-=value'] = null;

  //migrate prototype Token
  if (data.prototypeToken.bar1.attribute === 'powerPoints') {
    updateData['prototypeToken.bar1.attribute'] = 'powerPoints.general';
  }
  if (data.prototypeToken.bar2.attribute === 'powerPoints') {
    updateData['prototypeToken.bar2.attribute'] = 'powerPoints.general';
  }

  //check the active effects
  const effects = new Array<ActiveEffectDataConstructorData>();
  for (const effect of data.effects) {
    const changes = new Array<EffectChangeDataConstructorData>();
    for (const change of effect.changes) {
      if (change.key === 'system.powerPoints.value') {
        changes.push({
          ...change,
          key: 'system.powerPoints.general.value',
        });
      }
      if (change.key === 'system.powerPoints.max') {
        changes.push({
          ...change,
          key: 'system.powerPoints.general.max',
        });
      }
    }
    if (changes.length > 0) {
      effects.push({ _id: effect._id, changes: changes });
    }
  }
  if (effects.length > 0) updateData.effects = effects;
}

function _migrateWeaponAPToNumber(
  data: ItemDataSource,
  updateData: UpdateData,
) {
  if (data.type !== 'weapon') return updateData;

  if (data.system.ap && typeof data.system.ap === 'string') {
    updateData['system.ap'] = Number(data.system.ap);
  }
}

function _migratePowerEquipToFavorite(
  data: ItemDataSource,
  updateData: UpdateData,
) {
  if (data.type !== 'power') return updateData;
  const isOld = foundry.utils.hasProperty(data, 'system.equipped');
  if (isOld) {
    updateData['system.favorite'] = getProperty(data, 'system.equipped');
    updateData['system.-=equipped'] = null;
    updateData['system.-=equippable'] = null;
  }
}

function _migrateItemEquipState(data: ItemDataSource, updateData: UpdateData) {
  if (
    data.type !== 'armor' &&
    data.type !== 'weapon' &&
    data.type !== 'shield' &&
    data.type !== 'gear'
  ) {
    return;
  }
  const isOld = foundry.utils.hasProperty(data, 'system.equipped');
  if (!isOld) return;
  updateData['system.-=equipped'] = null;
  if (data.type === 'weapon') {
    updateData['system.equipStatus'] = data.system.equipped
      ? constants.EQUIP_STATE.MAIN_HAND
      : constants.EQUIP_STATE.CARRIED;
  } else {
    updateData['system.equipStatus'] = data.system.equipped
      ? constants.EQUIP_STATE.EQUIPPED
      : constants.EQUIP_STATE.CARRIED;
  }
  return updateData;
}

function _migrateWildDieFlag(user: SwadeUser, updateData: UpdateData) {
  const dsnWildDie = user?.getFlag('swade', 'dsnWildDie');
  const isOld = dsnWildDie === 'none';
  if (!isOld) return;

  updateData['flags.swade'] = {
    '-=dsnWildDie': null,
    dsnWildDiePreset: 'none',
  };

  return updateData;
}

function _migrateWeaponAutoReload(
  data: ItemDataSource,
  updateData: UpdateData,
) {
  if (data.type !== 'weapon') return;
  const hasOld = foundry.utils.hasProperty(data, 'system.autoReload');
  if (!hasOld) return;
  const autoReload = data.system.autoReload;
  updateData['system.reloadType'] = autoReload
    ? constants.RELOAD_TYPE.NONE
    : constants.RELOAD_TYPE.FULL;
  //remove the old property
  updateData['system.-=autoReload'] = null;
}

function _ensureBatteryMaxCharges(
  data: ItemDataSource,
  updateData: UpdateData,
) {
  if (data.type !== 'consumable') return;
  if (data.system.subtype === constants.CONSUMABLE_TYPE.BATTERY) {
    updateData['system.charges.max'] = 100;
  }
}

type UpdateData = Record<string, unknown>;
