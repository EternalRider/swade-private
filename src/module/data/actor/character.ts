import commonActorData from './common';
import * as quarantine from './_quarantine';
export interface CharacterData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof CharacterData)['defineSchema']>
  > {}

export class CharacterData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof CharacterData)['defineSchema']>
  >
> {
  static defineSchema() {
    return {
      ...commonActorData(),
    };
  }

  /** @inheritdoc */
  static override migrateData(source) {
    quarantine.ensureStrengthDie(source);
    return super.migrateData(source);
  }
}
