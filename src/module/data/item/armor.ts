import { PotentialSource } from '../../../globals';
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
} from './common';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';

export interface ArmorData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof ArmorData)['defineSchema']>
  > {}

export class ArmorData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof ArmorData)['defineSchema']>
  >
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...physicalItem(),
      ...equippable(),
      ...arcaneDevice(),
      ...actions(),
      ...bonusDamage(),
      ...favorite(),
      ...category(),
      ...grantEmbedded(),
      minStr: new fields.StringField({ initial: '' }),
      armor: new fields.NumberField({ initial: 0 }),
      toughness: new fields.NumberField({ initial: 0 }),
      isNaturalArmor: new fields.BooleanField(),
      isHeavyArmor: new fields.BooleanField(),
      locations: new fields.SchemaField({
        head: new fields.BooleanField(),
        torso: new fields.BooleanField({ initial: true }),
        arms: new fields.BooleanField(),
        legs: new fields.BooleanField(),
      }),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<ArmorData>) {
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
