import { ReloadType } from '../../globals';
import { Logger } from '../Logger';
import { constants } from '../constants';
import { VehicleData } from '../data/actor/vehicle';
import { ChargesData } from '../data/fields/ChargesData';
import type SwadeUser from '../documents/SwadeUser';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { ItemGrant } from '../documents/item/SwadeItem.interface';
import { MigrationCounter } from '../models/MigrationCounter';
import { slugify } from '../util';
import { triggerServersideMigration } from './migrationUtils';

export async function migrateWorld() {
  const version = game.system.version;

  Logger.info(
    `Applying SWADE System Migration for version ${version}. Please be patient and do not close your game or shut down your server.`,
    { permanent: true, toast: true }
  );

  // Gather the World Actors/Items to migrate
  const actors = game
    .actors!.map((a) => [a, true])
    .concat(
      Array.from(game.actors.invalidDocumentIds).map((id) => [
        game.actors!.getInvalid(id),
        false,
      ])
    );

  const items = game
    .items!.map((i) => [i, true])
    .concat(
      Array.from(game.items.invalidDocumentIds).map((id) => [
        game.items!.getInvalid(id),
        false,
      ])
    );

  const packs = game.packs.filter((p) =>
    ['Actor', 'Item', 'Scene'].includes(p.documentName)
  );

  const counter = new MigrationCounter(
    items.length +
      actors.length +
      packs.length +
      game.scenes!.size +
      game.users!.size
  );

  // Migrate World Actors
  for (const [actor, valid] of actors) {
    try {
      await dedupeActorActiveEffects(actor);
      await _migratePTModifiers(actor);
      const source = valid
        ? actor.toObject()
        : game.data.actors?.find((a) => a._id === actor.id);
      const updateData = migrateActorData(source);
      if (!foundry.utils.isEmpty(updateData)) {
        console.log(`Migrating Actor document ${actor.name}`);
        await actor.update(updateData, { enforceTypes: false, diff: valid });
      }
    } catch (err) {
      err.message = `Failed swade system migration for Actor ${actor.name}: ${err.message}`;
      console.error(err);
    } finally {
      counter.increment();
    }
  }

  // Migrate World Items
  for (const [item, valid] of items) {
    try {
      const source = valid
        ? item.toObject()
        : game.data.items?.find((i) => i._id === item.id);
      const updateData = migrateItemData(source);
      if (!foundry.utils.isEmpty(updateData)) {
        console.log(`Migrating Item document ${item.name}`);
        await item.update(updateData, { enforceTypes: false, diff: valid });
      }
    } catch (err) {
      err.message = `Failed swade system migration for Item ${item.name}: ${err.message}`;
      console.error(err);
    } finally {
      counter.increment();
    }
  }

  // Migrate Actor Override Tokens
  for (const scene of game.scenes!) {
    try {
      for (const token of scene.tokens) {
        token.delta._createSyntheticActor({ reinitializeCollections: true });
        if (token.actorLink) continue; //skip linked tokens as they are already handled by the world actor migration
        const actor = token.actor;
        await dedupeActorActiveEffects(actor);
        await _migratePTModifiers(actor);
        const updateData = migrateActorData(actor?.toObject());
        if (foundry.utils.isEmpty(updateData)) continue;
        await actor?.update(updateData);
      }
      const updateData = migrateSceneData(scene);
      if (!foundry.utils.isEmpty(updateData)) {
        console.log(`Migrating Scene document ${scene.name}`);
        await scene.update(updateData, { enforceTypes: false });
        // If we do not do this, then synthetic token actors remain in cache
        // with the un-updated actorData.
        for (const token of scene.tokens.filter((t) => !t.actorLink)) {
          token.delta._createSyntheticActor({ reinitializeCollections: true });
        }
      }
    } catch (err) {
      err.message = `Failed swade system migration for Scene ${scene.name}: ${err.message}`;
      console.error(err);
    } finally {
      counter.increment();
    }
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
    } finally {
      counter.increment();
    }
  }

  // Migrate Compendium Packs
  for (const pack of packs) {
    await migrateCompendium(pack);
    counter.increment();
  }

  // Set the migration as complete
  await game.settings.set('swade', 'systemMigrationVersion', version);
  Logger.info(`SWADE System Migration to version ${version} completed!`, {
    permanent: true,
    toast: true,
  });
}

/* -------------------------------------------- */

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack The compendium to migrate. Only Actor, Item or Scene compendiums are processed
 */
export async function migrateCompendium(
  pack: CompendiumCollection<CompendiumCollection.Metadata>
) {
  const documentName = pack.documentName;
  if (!['Actor', 'Item', 'Scene'].includes(documentName)) return;

  // Unlock the pack for editing
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });

  // Begin by requesting server-side data model migration and get the migrated content
  await triggerServersideMigration(pack);
  const documents = await pack.getDocuments();

  // Iterate over compendium entries - applying fine-tuned migration functions
  for (const doc of documents) {
    let updateData: Record<string, any> = {};
    try {
      switch (documentName) {
        case 'Actor':
          await dedupeActorActiveEffects(doc as SwadeActor);
          await _migratePTModifiers(doc as SwadeActor);
          updateData = migrateActorData(doc.toObject());
          break;
        case 'Item':
          updateData = migrateItemData(doc.toObject());
          break;
        case 'Scene':
          updateData = migrateSceneData(doc.toObject());
          break;
      }

      // Save the entry, if data was changed
      if (foundry.utils.isEmpty(updateData)) continue;
      await doc.update(updateData);
      Logger.debug(
        `Migrated ${documentName} document ${doc.name} in Compendium ${pack.collection}`
      );
    } catch (err) {
      // Handle migration failures
      err.message = `Failed swade system migration for document ${doc.name} in pack ${pack.collection}: ${err.message}`;
      Logger.error(err);
    }
  }

  // Apply the original locked status for the pack
  await pack.configure({ locked: wasLocked });
  Logger.debug(
    `Migrated all ${documentName} documents from Compendium ${pack.collection}`
  );
}

/* -------------------------------------------- */

export function migrateUser(user: SwadeUser) {
  const updateData: UpdateData = {};
  _migrateWildDieFlag(user, updateData);
  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate any active effects attached to the provided parent.
 * @param {object} parent           Data of the parent being migrated.
 * @returns {object[]}              Updates to apply on the embedded effects.
 */
export function migrateEffects(parent) {
  if (!parent.effects) return {};
  return parent.effects.reduce((arr, e) => {
    const effectData =
      e instanceof CONFIG.ActiveEffect.documentClass ? e.toObject() : e;
    const effectUpdate = migrateEffectData(effectData);
    if (!foundry.utils.isEmpty(effectUpdate)) {
      effectUpdate._id = effectData._id;
      arr.push(foundry.utils.expandObject(effectUpdate));
    }
    return arr;
  }, []);
}

/* -------------------------------------------- */

/* Update all compendium packs using the new system data model. */
//TODO re-enable once datamodel has been implemented
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function refreshAllCompendiums() {
  for (const pack of game.packs) {
    await refreshCompendium(pack);
  }
}

/* -------------------------------------------- */

/**
 * Update all Documents in a compendium using the new system data model.
 * @param pack  Pack to refresh.
 */
async function refreshCompendium(
  pack: CompendiumCollection<CompendiumCollection.Metadata>
) {
  if (!pack?.documentName) return;
  // swade.moduleArt.suppressArt = true;

  const DocumentClass = getDocumentClass(pack.documentName);
  const wasLocked = pack.locked;
  await pack.configure({ locked: false });
  await pack.migrate();

  ui.notifications.info(`Beginning to refresh Compendium ${pack.collection}`);
  const documents = await pack.getDocuments();
  for (const doc of documents) {
    const data = doc.toObject();
    await doc.delete();
    await DocumentClass.create(data, {
      keepId: true,
      keepEmbeddedIds: true,
      pack: pack.collection,
    });
  }
  await pack.configure({ locked: wasLocked });
  // swade.moduleArt.suppressArt = false;
  ui.notifications.info(
    `Refreshed all documents from Compendium ${pack.collection}`
  );
}

/* -------------------------------------------- */

/* -------------------------------------------- */
/*  Document Type Migration Helpers             */
/* -------------------------------------------- */

/**
 * Migrate a single Actor document to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {object} actor    The actor data object to update
 * @return {Object}         The updateData to apply
 */
export function migrateActorData(actor: ActorData) {
  const updateData: UpdateData = {};

  // Actor Data Updates
  _migrateVehicleOperator(actor, updateData);
  _migrateGeneralPowerPoints(actor, updateData);

  // Migrate embedded effects
  if (actor.effects) {
    const effects = migrateEffects(actor);
    if (effects.length > 0) updateData.effects = effects;
  }

  // Migrate Owned Items
  if (!actor.items) return updateData;
  const items = actor.items.reduce((arr, i) => {
    // Migrate the Owned Item
    const itemData = i instanceof CONFIG.Item.documentClass ? i.toObject() : i;
    const itemUpdate = migrateItemData(itemData);

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

/* -------------------------------------------- */

/**
 * Migrate a single Item document to incorporate latest data model changes
 *
 * @param {object} item             Item data to migrate
 * @returns {object}                The updateData to apply
 */
export function migrateItemData(item: Item.CreateData) {
  const updateData: UpdateData = {};
  _migrateWeaponAPToNumber(item, updateData);
  _migratePowerEquipToFavorite(item, updateData);
  _migrateItemEquipState(item, updateData);
  _migrateWeaponAutoReload(item, updateData);
  _ensureBatteryMaxCharges(item, updateData);
  _fixWorldItemGrants(item, updateData);
  _generateSWID(item, updateData);
  _setRangeType(item, updateData);

  // Migrate embedded effects
  if (item.effects) {
    const effects = migrateEffects(item);
    if (effects.length > 0) updateData.effects = effects;
  }

  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate a single Scene document to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} scene  The Scene data to Update
 * @return {Object}       The updateData to apply
 */
export function migrateSceneData(_scene: Scene | SceneData) {
  const updateData: UpdateData = {};
  return updateData;
}

/* -------------------------------------------- */

/**
 * Migrate the provided active effect data.
 * @param {object} _effect           Effect data to migrate.
 * @returns {object}                The updateData to apply.
 */
export function migrateEffectData(_effect: ActiveEffectData) {
  const updateData: UpdateData = {};
  _effect.changes.forEach((c) => {
    if (c.key === 'system.stats.parry.modifier')
      c.key = 'system.stats.parry.value';
    if (c.key === 'system.stats.toughness.modifier')
      c.key = 'system.stats.toughness.value';
  });
  updateData.changes = _effect.changes;
  return updateData;
}

/* -------------------------------------------- */

/**
 * Purge the data model of any inner objects which have been flagged as _deprecated.
 * @param {object} data   The data to clean
 * @private
 */
export function removeDeprecatedObjects(data: Item.CreateData | ActorData) {
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

export async function dedupeActorActiveEffects(actor: SwadeActor) {
  const toDelete = new Array<string>();
  const filteredEffects: SwadeActiveEffect[] = actor.appliedEffects.filter(
    (e) => e.parent instanceof SwadeItem
  );

  for (const effect of filteredEffects) {
    actor.effects
      .filter((e) => e.name === effect.name)
      .forEach((e) => {
        const parentId = effect.parent.id as string;
        if (e.origin.includes('.Item.' + parentId)) toDelete.push(e.id!);
      });
  }
  await actor.deleteEmbeddedDocuments('ActiveEffect', toDelete);
}

async function _migratePTModifiers(actor: SwadeActor) {
  if (actor.system instanceof VehicleData) return;
  const parryModifier = actor._source.system.stats.parry.modifier ?? 0;
  const toughModifier = actor._source.system.stats.toughness.modifier ?? 0;
  const effects = new Array<ActiveEffect.CreateData>();
  const updateData: UpdateData = {};
  if (parryModifier) {
    updateData['system.stats.parry.modifier'] = 0;
    effects.push({
      name:
        game.i18n.localize('SWADE.Addi') +
        ' ' +
        game.i18n.localize('SWADE.Parry'),
      changes: [
        {
          key: 'system.stats.parry.value',
          value: parryModifier,
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          priority: null,
        },
      ],
      description: 'Created by 3.1 Migration',
    });
  }
  if (toughModifier) {
    updateData['system.stats.toughness.modifier'] = 0;
    effects.push({
      name:
        game.i18n.localize('SWADE.Addi') +
        ' ' +
        game.i18n.localize('SWADE.Tough'),
      changes: [
        {
          key: 'system.stats.toughness.value',
          value: toughModifier,
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          priority: null,
        },
      ],
      description: 'Created by 3.1 Migration',
    });
  }
  if (effects.length > 0) {
    actor.createEmbeddedDocuments('ActiveEffect', effects);
    actor.updateSource(updateData);
  }
}

function _migrateVehicleOperator(
  data: Actor.UpdateData,
  updateData: UpdateData
) {
  if (data.type !== 'vehicle') return updateData;
  const driverId = data.system.driver?.id;
  const hasOldID = !!driverId && driverId.split('.').length === 1;
  if (hasOldID) {
    updateData['system.driver.id'] = `Actor.${driverId}`;
  }
  return updateData;
}

function _migrateGeneralPowerPoints(
  data: Actor.UpdateData,
  updateData: UpdateData
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
  const effects = new Array<ActiveEffect.CreateData>();
  for (const effect of data.effects) {
    const changes = new Array<ActiveEffect.EffectChangeData>();
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
  data: Item.CreateData,
  updateData: UpdateData
) {
  if (data.type !== 'weapon') return updateData;

  if (data.system.ap && typeof data.system.ap === 'string') {
    updateData['system.ap'] = Number(data.system.ap);
  }
}

function _migratePowerEquipToFavorite(
  data: Item.CreateData,
  updateData: UpdateData
) {
  if (data.type !== 'power') return updateData;
  const isOld = foundry.utils.hasProperty(data, 'system.equipped');
  if (isOld) {
    updateData['system.favorite'] = foundry.utils.getProperty(
      data,
      'system.equipped'
    );
    updateData['system.-=equipped'] = null;
    updateData['system.-=equippable'] = null;
  }
}

function _migrateItemEquipState(data: Item.CreateData, updateData: UpdateData) {
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
  data: Item.CreateData,
  updateData: UpdateData
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
  data: Item.CreateData,
  updateData: UpdateData
) {
  if (data.type !== 'consumable') return;
  if (data.system.subtype === constants.CONSUMABLE_TYPE.BATTERY) {
    if (
      data.system.charges?.hasCharges === undefined ||
      !data.system.charges.charges ||
      !data.system.charges.charges.length
    ) {
      //We don't have a charge object so create one
      updateData.system.charges ??= {};
      updateData.system.charges.hasCharges = true;

      updateData.system.charges.charges = [];
      updateData.system.charges.charges.push({
        id: ChargesData.randomID(),
        value: data.system.charges?.value ?? 100,
        max: data.system.charges?.max ?? 100,
      });
    } else {
      ('');
      data.system.charges.charges[0].max = 100;
      updateData['system.charges.charges'] = data.system.charges.charges;
    }
  }
}

function _fixWorldItemGrants(data: Item.CreateData, updateData: UpdateData) {
  if (!data.system.grants) return;
  updateData['system.grants'] = structuredClone(data.system.grants);
  for (const grant of updateData['system.grants'] as Array<ItemGrant>) {
    if (grant.uuid.startsWith('Item.Item.')) {
      const newUUID = grant.uuid.split('.');
      newUUID.shift(); //discard the first part
      grant.uuid = newUUID.join('.');
    }
  }
}

function _generateSWID(data: Item.CreateData, updateData: UpdateData) {
  if (data.system.swid === constants.RESERVED_SWID.DEFAULT) {
    updateData['system.swid'] = slugify(data.name);
  }
}

function _setRangeType(data: Item.CreateData, updateData: UpdateData) {
  if (data.type !== 'weapon' || data.system.rangeType !== null) return;
  const hasShots = !!data.system.shots;
  const hasRange = !!data.system.range;
  const reload = data.system.reloadType as ReloadType;

  let rangeType;

  if (!hasShots && !hasRange) {
    rangeType = constants.WEAPON_RANGE_TYPE.MELEE;
  } else if (hasShots && hasRange) {
    if (reload === constants.RELOAD_TYPE.SELF) {
      rangeType = constants.WEAPON_RANGE_TYPE.MIXED;
    } else {
      rangeType = constants.WEAPON_RANGE_TYPE.RANGED;
    }
  } else {
    rangeType = constants.WEAPON_RANGE_TYPE.MIXED;
  }
  updateData['system.rangeType'] = rangeType;
}

type UpdateData = Record<string, any>;
