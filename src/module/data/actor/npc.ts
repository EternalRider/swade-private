import commonActorData from './common';

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
}
