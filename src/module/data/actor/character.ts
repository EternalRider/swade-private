import commonActorData from './common';
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
}
