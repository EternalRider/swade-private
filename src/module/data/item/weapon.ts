import { ValueOf } from 'fvtt-types/utils';
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
import {
  createEmbedElement,
  createEnrichedTextEmbed,
  notificationExists,
} from '../../util';
import { FormulaField } from '../fields';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { SwadePhysicalItemData } from './base';
import {
  actions,
  activities,
  arcaneDevice,
  category,
  equippable,
  favorite,
  grantEmbedded,
  templates,
  vehicular,
} from './common';
import { ConsumableData } from './consumable';
import { GearData } from './gear';
import {
  Actions,
  Activities,
  ArcaneDevice,
  Category,
  ChoicesType,
  Equippable,
  Favorite,
  GrantEmbedded,
  Templates,
  Vehicular,
} from './item-common.interface';

declare namespace WeaponData {
  interface Schema
    extends SwadePhysicalItemData.Schema,
      Equippable,
      ArcaneDevice,
      Vehicular,
      Actions,
      Activities,
      Favorite,
      Templates,
      Category,
      GrantEmbedded {
    damage: FormulaField;
    range: foundry.data.fields.StringField<{ initial: '' }>;
    rangeType: foundry.data.fields.NumberField<{
      integer: true;
      nullable: true;
      initial: null;
      choices: ChoicesType<typeof constants.WEAPON_RANGE_TYPE>;
    }>;
    rof: foundry.data.fields.NumberField<{ initial: 1 }>;
    ap: foundry.data.fields.NumberField<{ initial: 0; integer: true }>;
    parry: foundry.data.fields.NumberField<{ initial: 0 }>;
    minStr: foundry.data.fields.StringField<{ initial: '' }>;
    shots: foundry.data.fields.NumberField<{ initial: 0 }>;
    currentShots: foundry.data.fields.NumberField<{ initial: 0 }>;
    ammo: foundry.data.fields.StringField<{ initial: '' }>;
    reloadType: foundry.data.fields.StringField<{
      initial: typeof constants.RELOAD_TYPE.NONE;
      choices: ChoicesType<typeof constants.RELOAD_TYPE>;
    }>;
    ppReloadCost: foundry.data.fields.NumberField<{ initial: 2 }>;
    trademark: foundry.data.fields.NumberField<{
      initial: 0;
      min: 0;
      integer: true;
    }>;
    isHeavyWeapon: foundry.data.fields.BooleanField<{ label: string }>;
  }
  interface BaseData extends SwadePhysicalItemData.BaseData {}
  interface DerivedData extends SwadePhysicalItemData.DerivedData {}
}

class WeaponData extends SwadePhysicalItemData<
  WeaponData.Schema,
  WeaponData.BaseData,
  WeaponData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): WeaponData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...equippable(),
      ...arcaneDevice(),
      ...vehicular(),
      ...actions(),
      ...activities(),
      ...favorite(),
      ...templates(),
      ...category(),
      ...grantEmbedded(),
      damage: new FormulaField({ initial: '', label: 'SWADE.Dmg' }),
      range: new fields.StringField({
        initial: '',
        label: 'SWADE.Range._name',
      }),
      rangeType: new fields.NumberField({
        integer: true,
        nullable: true,
        initial: null,
        choices: Object.values(constants.WEAPON_RANGE_TYPE),
        label: 'SWADE.Weapon.RangeType.Label',
      }),
      rof: new fields.NumberField({ initial: 1, label: 'SWADE.RoF' }),
      ap: new fields.NumberField({
        initial: 0,
        integer: true,
        label: 'SWADE.AP',
      }),
      parry: new fields.NumberField({ initial: 0, label: 'SWADE.Parry' }),
      minStr: new fields.StringField({ initial: '', label: 'SWADE.MinStr' }),
      shots: new fields.NumberField({ initial: 0, label: 'SWADE.Mag' }),
      currentShots: new fields.NumberField({
        initial: 0,
        label: 'SWADE.ShotsCurrent',
      }),
      ammo: new fields.StringField({ initial: '', label: 'SWADE.Ammo' }),
      reloadType: new fields.StringField({
        initial: constants.RELOAD_TYPE.NONE,
        choices: Object.values(constants.RELOAD_TYPE),
        label: 'SWADE.ReloadType.Label',
      }),
      ppReloadCost: new fields.NumberField({
        initial: 2,
        label: 'SWADE.PPCost',
      }),
      trademark: new fields.NumberField({
        initial: 0,
        min: 0,
        integer: true,
        label: 'SWADE.TrademarkWeapon.Label',
      }),
      isHeavyWeapon: new fields.BooleanField({ label: 'SWADE.HeavyWeapon' }),
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

  get traitModifiers(): RollModifier[] {
    const modifiers = new Array<RollModifier>();
    modifiers.push(
      ...(this.parent.actor?.system.stats.globalMods.attack ?? []),
    );
    if (
      this.equipStatus === constants.EQUIP_STATE.OFF_HAND &&
      !this.parent.actor?.getFlag('swade', 'ambidextrous')
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
    enrichOptions: Partial<TextEditor.EnrichmentOptions>,
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
        text: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.notes ?? '',
          enrichOptions,
        ),
        title: game.i18n.localize('SWADE.Notes'),
      },
    );
    return chips;
  }

  /** Used by SwadeItem.canExpendResources */
  _canExpendResources(resourcesUsed = 1): boolean {
    if (!game.settings.get('swade', 'ammoManagement') || this.isMelee)
      return true;

    if (this.reloadType === constants.RELOAD_TYPE.NONE) {
      if (!this.usesAmmoFromInventory) return true;
      const ammo = this.actor?.items.getName(this.ammo as string);
      if (!ammo) return false;
      const ammoCount =
        ammo?.type === 'consumable'
          ? ammo?.system['charges']['value']
          : ammo?.system['quantity'];
      return resourcesUsed <= ammoCount;
    } else if (this.reloadType === constants.RELOAD_TYPE.SELF) {
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
            'system.quantity': quantity - chargesToUse,
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

  override prepareDerivedData(this: WeaponData): void {
    super.prepareDerivedData();
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

    const ammoItem = parent.items.getName(this.ammo) as
      | SwadeItem<'gear' | 'consumable'>
      | undefined;
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
          ammoItem, //FIXME technically the item can be undefined here still
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

  async #handleFullReload(
    ammo: SwadeItem<'gear' | 'consumable'>,
    missing: number,
  ): Promise<boolean> {
    if (!this.usesAmmoFromInventory) {
      return this.#handleSimpleReload();
    }
    if (ammo.type === 'consumable') {
      return this.#handleConsumableReload(ammo, missing);
    }
    if (ammo.system.quantity! <= 0) {
      this.#postNotEnoughAmmoMessage();
      return false;
    }
    let ammoInMagazine = this.shots;
    if (ammo.system.quantity! < missing) {
      // partial reload
      ammoInMagazine = (this.currentShots ?? 0) + ammo.system.quantity!;
      await ammo.consume(ammo.system.quantity!);
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
    if (!(ammo.system instanceof ConsumableData)) return false;
    if ((ammo.system.charges.value ?? 0) <= 0) {
      this.#postNotEnoughAmmoMessage();
      return false;
    }

    const allCharges =
      (ammo.system.charges.value ?? 0) * (ammo.system.quantity ?? 0);

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

    let magazines = new Array<SwadeItem<'consumable'>>();
    const consumables = this.parent.actor?.itemTypes.consumable ?? [];
    const predicate = (type: ValueOf<typeof constants.CONSUMABLE_TYPE>) => {
      return (i: SwadeItem<'consumable'>) =>
        i.type === 'consumable' &&
        i.name === this.ammo &&
        i.system.subtype === type &&
        (i.system.equipStatus ?? 0) >= constants.EQUIP_STATE.CARRIED;
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

    if (
      magazines.filter((m) => (m.system.charges.value ?? 0) > 0).length === 0
    ) {
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
      return (item: SwadeItem<'consumable'>) =>
        item.type === 'consumable' &&
        item.name === loadedAmmo.name &&
        item.system.subtype === type &&
        (item.system.equipStatus ?? 0) >= constants.EQUIP_STATE.CARRIED &&
        item.system.charges.value === (charges ?? item.system.charges.max);
    };

    const consumables = parent.itemTypes
      .consumable as SwadeItem<'consumable'>[];

    if (reloadType === constants.RELOAD_TYPE.MAGAZINE) {
      const existingStack = consumables.find(
        predicate(constants.CONSUMABLE_TYPE.MAGAZINE),
      );
      if (existingStack && isFull) {
        updates.push({
          _id: existingStack.id,
          'system.quantity': (existingStack.system.quantity ?? 0) + 1,
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
          'system.quantity': (existingStack.system.quantity ?? 0) + 1,
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

  protected override async _preCreate(
    data: foundry.abstract.TypeDataModel.ParentAssignmentType<
      WeaponData.Schema,
      Item<'weapon'>
    >,
    options: Item.Database.PreCreateOptions,
    user: User.Implementation,
  ): Promise<boolean | void> {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (this.parent?.actor?.type === 'npc') {
      this.updateSource({ equipStatus: constants.EQUIP_STATE.MAIN_HAND });
    }
  }

  declare enrichedDescription?: string;

  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    // If description=true, render only the description
    if (config.description === true) {
      return createEnrichedTextEmbed(this.description || '', config, options);
    }

    config.caption = false;
    this.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.description,
        {
          ...options,
        },
      );
    return await createEmbedElement(
      this,
      'systems/swade/templates/embeds/weapon-embeds.hbs',
      ['item-embed', 'weapon'],
    );
  }
}

export { WeaponData };
