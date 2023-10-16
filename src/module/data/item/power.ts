import { PotentialSource } from '../../../globals';
import {
  actions,
  bonusDamage,
  favorite,
  itemDescription,
  templates,
} from './common';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';

export interface PowerData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof PowerData)['defineSchema']>
  > {}

export class PowerData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof PowerData)['defineSchema']>
  >
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...actions(),
      ...bonusDamage(),
      ...favorite(),
      ...templates(),
      rank: new fields.StringField({ initial: '', textSearch: true }),
      pp: new fields.NumberField({ initial: 0 }),
      damage: new fields.StringField({ initial: '' }),
      range: new fields.StringField({ initial: '' }),
      duration: new fields.StringField({ initial: '' }),
      trapping: new fields.StringField({ initial: '', textSearch: true }),
      arcane: new fields.StringField({ initial: '', textSearch: true }),
      ap: new fields.NumberField({ initial: 0 }),
      innate: new fields.BooleanField(),
      modifiers: new fields.ArrayField(new fields.ObjectField()),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<PowerData>) {
    quarantine.ensurePowerPointsAreNumeric(source);
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
