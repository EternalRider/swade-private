import { EquipState, PotentialSource, Updates } from '../../../globals';
import { constants } from '../../constants';
import {
  actions,
  category,
  choiceSets,
  equippable,
  favorite,
  grantEmbedded,
  itemDescription,
  physicalItem,
} from './common';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { UsageUpdates } from '../../documents/item/SwadeItem.interface';

export interface ConsumableData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof ConsumableData)['defineSchema']>
  > {}

export class ConsumableData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof ConsumableData)['defineSchema']>
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
      ...favorite(),
      ...category(),
      ...actions(),
      ...grantEmbedded(),
      ...choiceSets(),
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

  get isPhysicalItem() {
    return true;
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
    if (chargesToUse > maxChargesOnStack) return false;

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
}
