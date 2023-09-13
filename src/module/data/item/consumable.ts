import { constants } from '../../constants';
import {
  actions,
  category,
  equippable,
  favorite,
  grantEmbedded,
  itemDescription,
  physicalItem,
} from './common';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';

export interface ConsumableData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof ConsumableData)['defineSchema']>
  > {}

export class ConsumableData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof ConsumableData)['defineSchema']>
  >
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
  static override migrateData(source: object): object {
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
}
