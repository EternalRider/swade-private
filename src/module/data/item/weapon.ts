import {
  EquipState,
  PotentialSource,
  ReloadType,
  Updates,
} from '../../../globals';
import { RollModifier } from '../../../interfaces/additional.interface';
import { Logger } from '../../Logger';
import Reloadinator from '../../apps/Reloadinator';
import { constants } from '../../constants';
import type SwadeActor from '../../documents/actor/SwadeActor';
import type SwadeItem from '../../documents/item/SwadeItem';
import {
  ItemChatCardChip,
  UsageUpdates,
} from '../../documents/item/SwadeItem.interface';
import { notificationExists } from '../../util';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import {
  actions,
  arcaneDevice,
  bonusDamage,
  category,
  choiceSets,
  equippable,
  favorite,
  grantEmbedded,
  itemDescription,
  physicalItem,
  templates,
  vehicular,
} from './common';
import { GearData } from './gear';

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
      ...choiceSets(),
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

  get isPhysicalItem(): boolean {
    return true;
  }

  get traitModifiers(): RollModifier[] {
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
      if (!this.shots && !this.currentShots) return true;
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
    const usesAmmo = this.shots && this.currentShots;

    if (this.reloadType === constants.RELOAD_TYPE.NONE) {
      if (!this.usesAmmoFromInventory) return false;
      const ammo = this.parent.actor?.items.getName(this.ammo);
      if (ammo?.type === 'consumable') {
        ammo?.consume(chargesToUse);
      } else {
        const quantity = ammo?.system['quantity'];
        if ((usesAmmo && !ammo) || chargesToUse > quantity) {
          Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
          return false;
        } else if (usesAmmo && ammo) {
          resourceUpdates.push({
            _id: ammo.id,
            'data.quantity': quantity - chargesToUse,
          });
        }
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

  /**
   * Reload this weapon based on the reload procedure set.
   * @returns whether this weapon was successfully reloaded
   */
  async reload(): Promise<boolean> {
    const parent = this.parent.actor;
    if (!game.settings.get('swade', 'ammoManagement') || !parent) return false;

    //return if there's no ammo set
    if (this.usesAmmoFromInventory && !this.ammo) {
      if (!notificationExists('SWADE.NoAmmoSet')) {
        Logger.info('SWADE.NoAmmoSet', { toast: true, localize: true });
      }
      return false;
    }

    const ammoItem = parent.items.getName(this.ammo) as SwadeItem | undefined;
    const currentShots = this.currentShots || 0;
    const maxShots = this.shots || 0;
    const missingShots = maxShots - currentShots;
    const reloadType = this.reloadType;

    if (this.usesAmmoFromInventory && !ammoItem) {
      this.#postNotEnoughAmmoMessage();
      return false;
    }

    if (currentShots >= maxShots) {
      if (!notificationExists('SWADE.ReloadUnneeded')) {
        Logger.info('SWADE.ReloadUnneeded', {
          localize: true,
          toast: true,
        });
      }
      return false;
    }

    /**
     * Called when a reload is initiated. Returning false will cancel the reload operation;
     * @param {SwadeItem} item        The weapon being reloaded
     */
    const permitContinue = Hooks.call('swadePreReloadWeapon', this.parent);

    if (!permitContinue) return false;

    let reloaded = false;

    switch (reloadType) {
      case constants.RELOAD_TYPE.SINGLE:
        reloaded = await this.#handleSingleReload(ammoItem);
        break;
      case constants.RELOAD_TYPE.FULL:
        reloaded = await this.#handleFullReload(
          ammoItem as SwadeItem, //FIXME technically the item can be undefined here still
          missingShots,
        );
        break;
      case constants.RELOAD_TYPE.MAGAZINE:
      case constants.RELOAD_TYPE.BATTERY:
        reloaded = await this.#handleReloadFromConsumable(reloadType);
        break;
      case constants.RELOAD_TYPE.PP:
        reloaded = await this.#handlePowerPointReload();
        break;
      case constants.RELOAD_TYPE.NONE:
      case constants.RELOAD_TYPE.SELF:
      default:
        // Shouldn't ever arrive here because the Reload button shouldn't display
        break;
    }

    /**
     * Called after a weapon reload procedure has finished.
     * @param {SwadeItem} item            The weapon being reloaded
     * @param {boolean} reloaded          Whether the reload operation was successfully completed
     */
    Hooks.callAll('swadeReloadWeapon', this.parent, reloaded);
    return reloaded;
  }

  async #handleSingleReload(ammo?: SwadeItem): Promise<boolean> {
    const system = ammo?.system as GearData | undefined;
    if (this.usesAmmoFromInventory && (system?.quantity ?? 0) <= 0) {
      this.#postNotEnoughAmmoMessage();
      return false;
    } else {
      await ammo?.consume(1);
    }
    await this.parent.update({
      'system.currentShots': Number(this.currentShots) + 1,
    });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    return true;
  }

  async #handleFullReload(ammo: SwadeItem, missing: number): Promise<boolean> {
    if (!this.usesAmmoFromInventory) {
      return this.#handleSimpleReload();
    }
    if (ammo.type === 'consumable') {
      return this.#handleConsumableReload(ammo, missing);
    }
    if (system.quantity <= 0) {
      this.#postNotEnoughAmmoMessage();
      return false;
    }
    let ammoInMagazine = this.shots;
    if (ammo.system.quantity < missing) {
      // partial reload
      ammoInMagazine = this.currentShots + ammo.system.quantity;
      await ammo.consume(ammo.system.quantity);
      this.#postNotEnoughAmmoToReloadMessage();
    } else {
      await ammo.consume(missing);
    }
    await this.parent.update({ 'system.currentShots': ammoInMagazine });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    return true;
  }

  async #handleConsumableReload(
    ammo: SwadeItem,
    missing: number,
  ): Promise<boolean> {
    if (ammo.system.charges.value <= 0) {
      this.#postNotEnoughAmmoMessage();
      return false;
    }

    const allCharges = ammo.system.charges.value * ammo.system.quantity;

    let ammoInMagazine = this.shots;
    if (allCharges < missing) {
      // partial reload
      ammoInMagazine = Number(this.currentShots) + allCharges;
      await ammo.consume(allCharges);
      this.#postNotEnoughAmmoToReloadMessage();
    } else {
      await ammo.consume(missing);
    }
    await this.parent.update({ 'system.currentShots': ammoInMagazine });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    return true;
  }

  async #handleReloadFromConsumable(reloadType: ReloadType): Promise<boolean> {
    if (!this.usesAmmoFromInventory) return this.#handleSimpleReload();

    let magazines = new Array<SwadeItem>();
    const consumables = this.parent.actor?.itemTypes.consumable;
    const predicate = (type: ValueOf<typeof constants.CONSUMABLE_TYPE>) => {
      return (i: SwadeItem) =>
        i.type === 'consumable' &&
        i.name === this.ammo &&
        i.system.subtype === type &&
        i.system.equipStatus >= constants.EQUIP_STATE.CARRIED;
    };

    if (reloadType === constants.RELOAD_TYPE.MAGAZINE) {
      magazines = consumables.filter(
        predicate(constants.CONSUMABLE_TYPE.MAGAZINE),
      );
    } else if (reloadType === constants.RELOAD_TYPE.BATTERY) {
      magazines = consumables.filter(
        predicate(constants.CONSUMABLE_TYPE.BATTERY),
      );
    }

    if (magazines.filter((m) => m.system.charges.value > 0).length === 0) {
      if (!notificationExists('SWADE.NoMags')) {
        Logger.warn('SWADE.NoMags', {
          toast: true,
          localize: true,
        });
      }
      return false;
    }
    const reloaded = await Reloadinator.asPromise({
      weapon: this.parent as SwadeItem,
      magazines,
    });

    if (reloaded)
      Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    return reloaded;
  }

  async #handlePowerPointReload(): Promise<boolean> {
    const powerPoints = this.parent.actor?.system.powerPoints[this.ammo!];
    const ppReloadCost = Number(this.ppReloadCost);
    if (!powerPoints) {
      if (!notificationExists('SWADE.NoAmmoPP')) {
        Logger.warn('SWADE.NoAmmoPP', {
          toast: true,
          localize: true,
        });
      }
      return false;
    }
    if (powerPoints?.value < ppReloadCost) {
      this.#postNotEnoughAmmoMessage();
      return false;
    }
    await this.parent.actor?.update({
      ['system.powerPoints.' + this.ammo + '.value']:
        powerPoints.value - ppReloadCost,
    });
    await this.parent.update({ 'system.currentShots': this.shots });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    return true;
  }

  async #handleSimpleReload(): Promise<boolean> {
    await this.parent.update({ 'system.currentShots': this.shots });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    return true;
  }

  /** Remove the loaded ammunition from this weapon and move it into the parent actor's inventory */
  async removeAmmo() {
    const loadedAmmo = this.parent.getFlag('swade', 'loadedAmmo');
    const parent = this.parent.actor as SwadeActor | null;
    if (!parent || !loadedAmmo) return;
    const reloadType = this.reloadType;
    if (
      reloadType !== constants.RELOAD_TYPE.MAGAZINE &&
      reloadType !== constants.RELOAD_TYPE.BATTERY
    )
      return;

    const updates: Updates[] = [
      {
        _id: this.parent.id,
        'system.currentShots': 0,
        'flags.swade': { '-=loadedAmmo': null },
      },
    ];

    if (!this.usesAmmoFromInventory) {
      await parent.updateEmbeddedDocuments('Item', updates);
      return;
    }
    const isFull = this.currentShots === this.shots;
    const predicate = (
      type: ValueOf<typeof constants.CONSUMABLE_TYPE>,
      charges?: number,
    ) => {
      return (item: SwadeItem) =>
        item.type === 'consumable' &&
        item.name === loadedAmmo.name &&
        item.system.subtype === type &&
        item.system.equipStatus >= constants.EQUIP_STATE.CARRIED &&
        item.system.charges.value === (charges ?? item.system.charges.max);
    };

    const consumables = parent.itemTypes.consumable;

    if (reloadType === constants.RELOAD_TYPE.MAGAZINE) {
      const existingStack = consumables.find(
        predicate(constants.CONSUMABLE_TYPE.MAGAZINE),
      );
      if (existingStack && isFull) {
        updates.push({
          _id: existingStack.id,
          'system.quantity': existingStack.system.quantity + 1,
        });
      } else {
        const itemData = foundry.utils.mergeObject(loadedAmmo, {
          'system.charges.value': this.currentShots,
        });
        await getDocumentClass('Item').create(itemData, { parent });
      }
    } else if (reloadType === constants.RELOAD_TYPE.BATTERY) {
      const existingStack = consumables.find(
        predicate(constants.CONSUMABLE_TYPE.BATTERY, 100),
      );

      if (existingStack && isFull) {
        updates.push({
          _id: existingStack.id,
          'system.quantity': existingStack.system.quantity + 1,
        });
      } else {
        const factor = Number(this.currentShots) / Number(this.shots);
        const itemData = foundry.utils.mergeObject(loadedAmmo, {
          'system.charges.value': Math.ceil(factor * 100),
        });
        await getDocumentClass('Item').create(itemData, { parent });
      }
    }

    await parent.updateEmbeddedDocuments('Item', updates);
  }

  #postNotEnoughAmmoMessage() {
    if (!notificationExists('SWADE.NotEnoughAmmo')) {
      Logger.warn('SWADE.NotEnoughAmmo', {
        toast: true,
        localize: true,
      });
    }
  }

  #postNotEnoughAmmoToReloadMessage() {
    if (!notificationExists('SWADE.NotEnoughAmmoToReload')) {
      Logger.warn('SWADE.NotEnoughAmmoToReload', {
        toast: true,
        localize: true,
      });
    }
  }
}
