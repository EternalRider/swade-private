import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { EquipState, PotentialSource, Updates } from '../../../globals';
import { Logger } from '../../Logger';
import { constants } from '../../constants';
import { UsageUpdates } from '../../documents/item/SwadeItem.interface';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { SwadePhysicalItemData } from './base';
import {
  actions,
  bonusDamage,
  category,
  equippable,
  favorite,
  grantEmbedded,  
} from './common';
import {
  Actions,
  Category,
  ChoicesType,
  Equippable,
  Favorite,
  GrantEmbedded,
} from './item-common.interface';

declare namespace ConsumableData {
  interface Schema
    extends SwadePhysicalItemData.Schema,
      Equippable,
      Favorite,
      Category,
      Actions,
      GrantEmbedded {
    charges: foundry.data.fields.SchemaField<{
      value: foundry.data.fields.NumberField<{ initial: 1 }>;
      max: foundry.data.fields.NumberField<{ initial: 1 }>;
    }>;
    messageOnUse: foundry.data.fields.BooleanField<{ initial: true }>;
    destroyOnEmpty: foundry.data.fields.BooleanField;
    subtype: foundry.data.fields.StringField<{
      initial: typeof constants.CONSUMABLE_TYPE.REGULAR;
      choices: ChoicesType<typeof constants.CONSUMABLE_TYPE>;
      textSearch: true;
    }>;
  }
  interface BaseData extends SwadePhysicalItemData.BaseData {}
  interface DerivedData extends SwadePhysicalItemData.DerivedData {}
}

class ConsumableData extends SwadePhysicalItemData<
  ConsumableData.Schema,
  ConsumableData.BaseData,
  ConsumableData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): ConsumableData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...equippable(),
      ...favorite(),
      ...category(),
      ...actions(),
      ...bonusDamage(),
      ...grantEmbedded(),
      charges: new fields.SchemaField({
        value: new fields.NumberField({ initial: 1 }),
        max: new fields.NumberField({ initial: 1 }),
      }),
      messageOnUse: new fields.BooleanField({ initial: true }),
      destroyOnEmpty: new fields.BooleanField(),
      subtype: new fields.StringField({
        initial: constants.CONSUMABLE_TYPE.REGULAR,
        choices: Object.values(constants.CONSUMABLE_TYPE),
        textSearch: true,
      }),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<ConsumableData>) {
    quarantine.ensurePricesAreNumeric(source);
    quarantine.ensureWeightsAreNumeric(source);
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

  /** Used by SwadeItem.#postConsumptionCleanup */
  get _shouldDelete(): boolean {
    return this.destroyOnEmpty && this.quantity === 0 && this.parent.isOwned;
  }

  /** Used by SwadeItem.setEquipState */
  _rejectEquipState(state: EquipState): boolean {
    return state > constants.EQUIP_STATE.CARRIED;
  }

  /** Used by SwadeItem.consume */
  _getUsageUpdates(chargesToUse: number): UsageUpdates | false {
    const actorUpdates: Updates = {};
    const itemUpdates: Updates = {};
    const resourceUpdates = new Array<Updates>();

    //gather variables
    const currentCharges = Number(this.charges.value);
    const maxCharges = Number(this.charges.max);
    const quantity = Number(this.quantity);
    const maxChargesOnStack = (quantity - 1) * maxCharges + currentCharges;

    //abort early if too much is being used
    if (chargesToUse > maxChargesOnStack) {
      ui.notifications.warn('SWADE.Consumable.NotEnoughCharges', {
        localize: true,
      });
      return false;
    }

    const totalRemainingCharges = maxChargesOnStack - chargesToUse;
    const newQuantity = Math.ceil(totalRemainingCharges / maxCharges);
    let newCharges = totalRemainingCharges % maxCharges;

    if (newCharges === 0 && newQuantity < quantity && newQuantity !== 0) {
      newCharges = maxCharges;
    }

    //write updates
    itemUpdates['system.quantity'] = Math.max(0, newQuantity);
    itemUpdates['system.charges.value'] = newCharges;

    return { actorUpdates, itemUpdates, resourceUpdates };
  }

  protected override async _preUpdate(
    data: foundry.documents.BaseItem.ConstructorData,
    options: DocumentModificationOptions,
    user: BaseUser,
  ) {
    await super._preUpdate(data, options, user);
    if (
      foundry.utils.hasProperty(data, 'system.quantity') &&
      this.subtype !== constants.CONSUMABLE_TYPE.REGULAR &&
      this.charges.value !== 0 &&
      this.charges.value !== this.charges.max
    ) {
      if (data.system.quantity > 1 && this.charges.value < this.charges.max) {
        delete data.system.quantity;
        Logger.warn(
          'Partially filled magazines can only have a quantity of 1',
          { toast: true },
        );
      }
    }
    if (
      foundry.utils.hasProperty(data, 'system.charges.max') &&
      this.subtype === constants.CONSUMABLE_TYPE.BATTERY
    ) {
      foundry.utils.setProperty(data, 'system.charges.max', 100);
    }
    if (
      foundry.utils.getProperty(data, 'system.subtype') ===
      constants.CONSUMABLE_TYPE.BATTERY
    ) {
      foundry.utils.setProperty(data, 'system.charges.max', 100);
    }
  }
}

export { ConsumableData };
