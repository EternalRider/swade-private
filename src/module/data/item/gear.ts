import {
  actions,
  arcaneDevice,
  category,
  equippable,
  favorite,
  grantEmbedded,
  itemDescription,
  physicalItem,
  vehicular,
} from './common';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';

export interface GearData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof GearData)['defineSchema']>
  > {}

export class GearData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<ReturnType<(typeof GearData)['defineSchema']>>
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
      ...favorite(),
      ...category(),
      ...grantEmbedded(),
      isAmmo: new fields.BooleanField(),
    };
  }

  /** @inheritdoc */
  static override migrateData(source) {
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
