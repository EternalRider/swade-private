import {
  EquipState,
  PotentialSource,
  ReloadType,
  Updates,
} from '../../../globals';
import { constants } from '../../constants';
import {
  actions,
  arcaneDevice,
  bonusDamage,
  category,
  equippable,
  favorite,
  grantEmbedded,
  itemDescription,
  physicalItem,
  templates,
  vehicular,
} from './common';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import {
  ItemChatCardChip,
  UsageUpdates,
} from '../../documents/item/SwadeItem.interface';
import { Logger } from '../../Logger';
import { notificationExists } from '../../util';
import Reloadinator from '../../apps/Reloadinator';
import SwadeItem from '../../documents/item/SwadeItem';
import { RollModifier } from '../../../interfaces/additional.interface';

export interface WeaponData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof WeaponData)['defineSchema']>
  > {}

export class WeaponData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof WeaponData)['defineSchema']>
  >,
  Item
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...physicalItem(),
      ...equippable(),
      ...arcaneDevice(),
      ...vehicular(),
      ...actions(),
      ...bonusDamage(),
      ...favorite(),
      ...templates(),
      ...category(),
      ...grantEmbedded(),
      damage: new fields.StringField({ initial: '' }),
      range: new fields.StringField({ initial: '' }),
      rangeType: new fields.NumberField({
        integer: true,
        nullable: true,
        initial: null,
        choices: Object.values(constants.WEAPON_RANGE_TYPE),
      }),
      rof: new fields.NumberField({ initial: 1 }),
      ap: new fields.NumberField({ initial: 0, integer: true }),
      parry: new fields.NumberField({ initial: 0 }),
      minStr: new fields.StringField({ initial: '' }),
      shots: new fields.NumberField({ initial: 0 }),
      currentShots: new fields.NumberField({ initial: 0 }),
      ammo: new fields.StringField({ initial: '' }),
      reloadType: new fields.StringField({
        initial: constants.RELOAD_TYPE.NONE,
        choices: Object.values(constants.RELOAD_TYPE),
      }),
      ppReloadCost: new fields.NumberField({ initial: 2 }),
      trademark: new fields.NumberField({ initial: 0, min: 0, integer: true }),
      isHeavyWeapon: new fields.BooleanField(),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<WeaponData>) {
    quarantine.ensurePricesAreNumeric(source);
    quarantine.ensureWeightsAreNumeric(source);
    quarantine.ensureAPisNumeric(source);
    quarantine.ensureRoFisNumeric(source);
    quarantine.ensureShotsAreNumeric(source);

    migrations.renameActionProperties(source);
    return super.migrateData(source);
  }

  /** @inheritdoc */
  protected override _initialize(options?: any) {
    super._initialize(options);
    this._applyShims();
  }

  protected _applyShims() {
    shims.actionProperties(this);
  }

  get isMelee(): boolean {
    return (
      this.rangeType === constants.WEAPON_RANGE_TYPE.MIXED ||
      this.rangeType === constants.WEAPON_RANGE_TYPE.MELEE
    );
  }

  get isRanged(): boolean {
    return (
      this.rangeType === constants.WEAPON_RANGE_TYPE.MIXED ||
      this.rangeType === constants.WEAPON_RANGE_TYPE.RANGED
    );
  }

  get canBeArcaneDevice() {
    return true;
  }

  get isReadied(): boolean {
    return Number(this.equipStatus) > constants.EQUIP_STATE.CARRIED;
  }

  get isPhysicalItem() {
    return true;
  }

  get traitModifiers() {
    const modifiers = new Array<RollModifier>();
    modifiers.push(...this.parent.actor.system.stats.globalMods.attack);
    if (
      this.equipStatus === constants.EQUIP_STATE.OFF_HAND &&
      !this.parent.actor.getFlag('swade', 'ambidextrous')
    ) {
      modifiers.push({
        label: game.i18n.localize('SWADE.OffHandPenalty'),
        value: -2,
      });
    }
    if (Number(this.trademark) > 0) {
      modifiers.push({
        label: game.i18n.localize('SWADE.TrademarkWeapon.Label'),
        value: '+' + this.trademark,
      });
    }
    return modifiers;
  }
  get usesAmmoFromInventory(): boolean {
    if (this.reloadType === constants.RELOAD_TYPE.PP) return false;
    const isPC = this.parent.actor?.type === 'character';
    const isNPC = this.parent.actor?.type === 'npc';
    const isVehicle = this.parent.actor?.type === 'vehicle';
    const npcAmmoFromInventory = game.settings.get('swade', 'npcAmmo');
    const vehicleAmmoFromInventory = game.settings.get('swade', 'vehicleAmmo');
    const useAmmoFromInventory = game.settings.get(
      'swade',
      'ammoFromInventory',
    );
    return (
      (isVehicle && vehicleAmmoFromInventory) ||
      (isNPC && npcAmmoFromInventory) ||
      (isPC && useAmmoFromInventory)
    );
  }

  get hasAmmoManagement(): boolean {
    return (
      !this.isMelee &&
      game.settings.get('swade', 'ammoManagement') &&
      this.reloadType !== constants.RELOAD_TYPE.NONE
    );
  }

  get hasReloadButton(): boolean {
    return (
      game.settings.get('swade', 'ammoManagement') &&
      (this.shots ?? 0) > 0 &&
      this.reloadType !== constants.RELOAD_TYPE.NONE &&
      this.reloadType !== constants.RELOAD_TYPE.SELF
    );
  }

  /** Used by SwadeItem.setEquipState */
  _rejectEquipState(state: EquipState): boolean {
    return state === constants.EQUIP_STATE.EQUIPPED;
  }

  async getChatChips(
    enrichOptions: Partial<TextEditor.EnrichOptions>,
  ): Promise<ItemChatCardChip[]> {
    const chips = new Array<ItemChatCardChip>();
    if (this.isReadied) {
      chips.push({
        icon: '<i class="fas fa-tshirt"></i>',
        title: game.i18n.localize('SWADE.Equipped'),
      });
    } else {
      chips.push({
        icon: '<i class="fas fa-tshirt" style="color:grey"></i>',
        title: game.i18n.localize('SWADE.Unequipped'),
      });
    }
    chips.push(
      {
        icon: '<i class="fas fa-fist-raised"></i>',
        text: this.damage,
        title: game.i18n.localize('SWADE.Dmg'),
      },
      {
        icon: '<i class="fas fa-shield-alt"></i>',
        text: this.ap,
        title: game.i18n.localize('SWADE.Ap'),
      },
      {
        icon: '<i class="fas fa-user-shield"></i>',
        text: this.parry,
        title: game.i18n.localize('SWADE.Parry'),
      },
      {
        icon: '<i class="fas fa-ruler"></i>',
        text: this.range,
        title: game.i18n.localize('SWADE.Range._name'),
      },
      {
        icon: '<i class="fas fa-tachometer-alt"></i>',
        text: this.rof,
        title: game.i18n.localize('SWADE.RoF'),
      },
      {
        icon: '<i class="fas fa-sticky-note"></i>',
        text: await TextEditor.enrichHTML(this.notes ?? '', enrichOptions),
        title: game.i18n.localize('SWADE.Notes'),
      },
    );
    return chips;
  }

  /** Used by SwadeItem.canExpendResources */
  _canExpendResources(resourcesUsed = 1): boolean {
    if (!game.settings.get('swade', 'ammoManagement') || this.isMelee)
      return true;

    const noReload = this.reloadType === constants.RELOAD_TYPE.NONE;
    const selfReload = this.reloadType === constants.RELOAD_TYPE.SELF;
    const ammo = this.parent?.actor.items.getName(this.ammo);
    if (noReload && !ammo) {
      return false;
    } else if (noReload) {
      const ammoCount =
        ammo?.type === 'consumable'
          ? ammo?.system['charges']['value']
          : ammo?.system['quantity'];
      return resourcesUsed <= ammoCount;
    } else if (selfReload) {
      const usesRemaining =
        Number(this.shots) * (Number(this.quantity) - 1) +
        Number(this.currentShots);
      return resourcesUsed <= usesRemaining;
    } else {
      return resourcesUsed <= Number(this.currentShots);
    }
  }

  /** Used by SwadeItem.consume */
  _getUsageUpdates(chargesToUse: number): UsageUpdates | false {
    const actorUpdates: Updates = {};
    const itemUpdates: Updates = {};
    const resourceUpdates = new Array<Updates>();

    if (!game.settings.get('swade', 'ammoManagement')) return false;

    if (this.reloadType === constants.RELOAD_TYPE.NONE) {
      if (!this.usesAmmoFromInventory) return false;
      const ammo = this.parent.actor?.items.getName(this.ammo);
      if (ammo?.type === 'consumable') {
        ammo?.consume(chargesToUse);
      } else {
        const quantity = ammo?.system['quantity'];
        if (!ammo || chargesToUse > quantity) {
          Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
          return false;
        }
        resourceUpdates.push({
          _id: ammo.id,
          'data.quantity': quantity - chargesToUse,
        });
      }
    } else if (this.reloadType === constants.RELOAD_TYPE.SELF) {
      const currentShots = Number(this.currentShots);
      const maxShots = Number(this.shots);
      const usesShots = !!maxShots && !!currentShots;
      const quantity = Number(this.quantity);
      const usesRemaining = maxShots * (quantity - 1) + currentShots;
      if (!usesShots || chargesToUse > usesRemaining) {
        Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
        return false;
      }

      let newShots: number;
      let newQuantity: number;
      if (chargesToUse < currentShots) {
        itemUpdates['system.currentShots'] = currentShots - chargesToUse;
      } else {
        const quantityUsed = Math.ceil(chargesToUse / maxShots);
        const remainingQty = quantity - quantityUsed;
        if (remainingQty < 1) {
          newShots = 0;
          newQuantity = 0;
        } else {
          const remainder =
            chargesToUse - (currentShots + (quantityUsed - 1) * maxShots);
          newShots = maxShots - remainder;
          newQuantity = remainingQty;
        }
        itemUpdates['system.currentShots'] = newShots;
        itemUpdates['system.quantity'] = newQuantity;
      }
    } else {
      const currentShots = this.currentShots;
      const usesShots = !!this.shots && !!currentShots;

      if (!usesShots || chargesToUse > currentShots) {
        Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
        return false;
      }
      itemUpdates['system.currentShots'] = currentShots - chargesToUse;
    }

    return { actorUpdates, itemUpdates, resourceUpdates };
  }

  async reload() {
    const parentActor = this.parent.actor;
    if (!game.settings.get('swade', 'ammoManagement') || !parentActor) return;

    const ammoName = this.ammo;
    //return if there's no ammo set
    const needsFullReloadProcedure = this.usesAmmoFromInventory;
    if (needsFullReloadProcedure && !ammoName) {
      if (!notificationExists('SWADE.NoAmmoSet', true)) {
        Logger.info('SWADE.NoAmmoSet', { toast: true, localize: true });
      }
      return;
    }

    const ammo = parentActor.items.getName(ammoName);
    const currentShots = Number(this.currentShots);
    const maxShots = Number(this.shots);
    const missingAmmo = maxShots - currentShots;
    const reloadType = this.reloadType;

    if (needsFullReloadProcedure && !ammo) {
      if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
        Logger.warn('SWADE.NotEnoughAmmo', {
          toast: true,
          localize: true,
        });
      }
      return;
    }

    if (currentShots >= maxShots) {
      if (!notificationExists('SWADE.ReloadUnneeded', true)) {
        Logger.info('SWADE.ReloadUnneeded', {
          localize: true,
          toast: true,
        });
      }
      return;
    }

    switch (reloadType) {
      case constants.RELOAD_TYPE.SINGLE:
        await this.#handleSingleReload(ammo as SwadeItem);
        break;
      case constants.RELOAD_TYPE.FULL:
        await this.#handleFullReload(ammo as SwadeItem, missingAmmo);
        break;
      case constants.RELOAD_TYPE.MAGAZINE:
      case constants.RELOAD_TYPE.BATTERY:
        await this.#handleReloadFromConsumable(reloadType);
        break;
      case constants.RELOAD_TYPE.PP:
        await this.#handlePowerPointReload();
        break;
      case constants.RELOAD_TYPE.NONE:
      case constants.RELOAD_TYPE.SELF:
      default:
        // Shouldn't ever arrive here because the Reload button shouldn't display
        break;
    }
  }

  async #handleSingleReload(ammo: SwadeItem) {
    if (ammo.system.quantity > 0) {
      if (this.usesAmmoFromInventory) await ammo.consume(1);
      await this.parent.update({
        'system.currentShots': Number(this.currentShots) + 1,
      });
      Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    } else {
      if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
        Logger.warn('SWADE.NotEnoughAmmo', {
          toast: true,
          localize: true,
        });
      }
    }
  }

  async #handleFullReload(ammo: SwadeItem, missingAmmo: number) {
    if (!this.usesAmmoFromInventory) {
      return this.#handleSimpleReload();
    }
    if (ammo.type === 'consumable') {
      return this.#handleConsumableReload(ammo, missingAmmo);
    }
    if (ammo.system.quantity <= 0) {
      if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
        Logger.warn('SWADE.NotEnoughAmmo', {
          toast: true,
          localize: true,
        });
      }
      return;
    }
    let ammoInMagazine = this.shots;
    if (ammo.system.quantity < missingAmmo) {
      // partial reload
      ammoInMagazine = this.currentShots + ammo.system.quantity;
      await ammo.consume(ammo.system.quantity);
      if (!notificationExists('SWADE.NotEnoughAmmoToReload', true)) {
        Logger.warn('SWADE.NotEnoughAmmoToReload', {
          toast: true,
          localize: true,
        });
      }
    } else {
      await ammo.consume(missingAmmo);
    }
    await this.parent.update({ 'system.currentShots': ammoInMagazine });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
  }

  async #handleConsumableReload(ammo: SwadeItem, missingAmmo: number) {
    if (ammo.system.charges.value <= 0) {
      if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
        Logger.warn('SWADE.NotEnoughAmmo', {
          toast: true,
          localize: true,
        });
      }
      return;
    }

    const allCharges = ammo.system.charges.value * ammo.system.quantity;

    let ammoInMagazine = this.shots;
    if (allCharges < missingAmmo) {
      // partial reload
      ammoInMagazine = Number(this.currentShots) + allCharges;
      await ammo.consume(allCharges);
      if (!notificationExists('SWADE.NotEnoughAmmoToReload', true)) {
        Logger.warn('SWADE.NotEnoughAmmoToReload', {
          toast: true,
          localize: true,
        });
      }
    } else {
      await ammo.consume(missingAmmo);
    }
    await this.parent.update({ 'system.currentShots': ammoInMagazine });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
  }

  async #handleReloadFromConsumable(reloadType: ReloadType) {
    if (!this.usesAmmoFromInventory) {
      return this.#handleSimpleReload();
    }
    let magazines = new Array<SwadeItem>();
    if (reloadType === constants.RELOAD_TYPE.MAGAZINE) {
      magazines =
        this.parent.actor?.itemTypes.consumable.filter(
          (i) =>
            i.type === 'consumable' &&
            i.system.subtype === constants.CONSUMABLE_TYPE.MAGAZINE &&
            i.name === this.ammo &&
            i.system.equipStatus >= constants.EQUIP_STATE.CARRIED,
        ) ?? [];
    } else if (reloadType === constants.RELOAD_TYPE.BATTERY) {
      magazines =
        this.parent.actor?.itemTypes.consumable.filter(
          (i) =>
            i.type === 'consumable' &&
            i.system.subtype === constants.CONSUMABLE_TYPE.BATTERY &&
            i.name === this.ammo &&
            i.system.equipStatus >= constants.EQUIP_STATE.CARRIED,
        ) ?? [];
    }

    if (magazines.filter((m) => m.system.charges.value > 0).length === 0) {
      if (!notificationExists('SWADE.NoMags', true)) {
        Logger.warn('SWADE.NoMags', {
          toast: true,
          localize: true,
        });
      }
      return;
    }
    const reloaded = await Reloadinator.asPromise({
      weapon: this.parent,
      magazines,
    });

    if (reloaded) {
      Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    }
  }

  async #handlePowerPointReload() {
    const powerPoints = this.parent.actor?.system.powerPoints[this.ammo!];
    const ppReloadCost = Number(this.ppReloadCost);
    if (!powerPoints) {
      if (!notificationExists('SWADE.NoAmmoPP', true)) {
        Logger.warn('SWADE.NoAmmoPP', {
          toast: true,
          localize: true,
        });
      }
      return;
    }
    if (powerPoints?.value < ppReloadCost) {
      if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
        Logger.warn('SWADE.NotEnoughAmmo', {
          toast: true,
          localize: true,
        });
      }
      return;
    }
    await this.parent.actor?.update({
      ['system.powerPoints.' + this.ammo + '.value']:
        powerPoints.value - ppReloadCost,
    });
    await this.parent.update({ 'system.currentShots': this.shots });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
  }

  async #handleSimpleReload() {
    await this.parent.update({
      'system.currentShots': this.shots,
    });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
  }

  async removeAmmo() {
    const loadedAmmo = this.parent.getFlag('swade', 'loadedAmmo');
    const parentActor = this.parent.actor;
    if (!parentActor || !loadedAmmo) return;
    const reloadType = this.reloadType;
    if (
      reloadType !== constants.RELOAD_TYPE.MAGAZINE &&
      reloadType !== constants.RELOAD_TYPE.BATTERY
    )
      return;

    if (loadedAmmo) {
      const updates: Updates[] = [
        {
          _id: this.parent.id,
          'system.currentShots': 0,
          'flags.swade': { '-=loadedAmmo': null },
        },
      ];

      if (!this.usesAmmoFromInventory) {
        await parentActor.updateEmbeddedDocuments('Item', updates);
        return;
      }

      const isFull = this.currentShots === this.shots;
      if (reloadType === constants.RELOAD_TYPE.MAGAZINE) {
        const existingStack = parentActor.items.find(
          (i) =>
            i.type === 'consumable' &&
            i.name === loadedAmmo.name &&
            i.system.equipStatus >= constants.EQUIP_STATE.CARRIED &&
            i.system.subtype === constants.CONSUMABLE_TYPE.MAGAZINE &&
            i.system.charges.value === i.system.charges.max,
        );
        if (existingStack && isFull) {
          updates.push({
            _id: existingStack.id,
            'system.quantity': existingStack.system.quantity + 1,
          });
        } else {
          const newItemData = foundry.utils.mergeObject(loadedAmmo, {
            'system.charges.value': this.currentShots,
          });
          await CONFIG.Item.documentClass.create(newItemData, {
            parent: parentActor,
          });
        }
      } else if (reloadType === constants.RELOAD_TYPE.BATTERY) {
        const existingStack = parentActor.items.find(
          (i) =>
            i.type === 'consumable' &&
            i.name === loadedAmmo.name &&
            i.system.equipStatus >= constants.EQUIP_STATE.CARRIED &&
            i.system.subtype === constants.CONSUMABLE_TYPE.BATTERY &&
            i.system.charges.value === 100,
        );

        if (existingStack && isFull) {
          updates.push({
            _id: existingStack.id,
            'system.quantity': existingStack.system.quantity + 1,
          });
        } else {
          const factor = Number(this.currentShots) / Number(this.shots);
          const newItemData = foundry.utils.mergeObject(loadedAmmo, {
            'system.charges.value': Math.ceil(factor * 100),
          });
          await CONFIG.Item.documentClass.create(newItemData, {
            parent: parentActor,
          });
        }
      }

      await parentActor.updateEmbeddedDocuments('Item', updates);
    }
  }
}
