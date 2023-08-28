import commonActorData from './common';
import * as quarantine from './_quarantine';

export interface NpcData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof NpcData)['defineSchema']>
  > {}

export class NpcData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<ReturnType<(typeof NpcData)['defineSchema']>>
> {
  static defineSchema() {
    return {
      ...commonActorData(2, 0, false),
    };
  }

  /** @inheritdoc */
  static override migrateData(source) {
    quarantine.ensureStrengthDie(source);
    quarantine.ensureCurrencyIsNumeric(source);
    return super.migrateData(source);
  }
}
