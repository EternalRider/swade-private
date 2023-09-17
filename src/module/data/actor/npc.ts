import { CommonActorData } from './common';

export interface NpcData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof NpcData)['defineSchema']>
  > {}

export class NpcData extends CommonActorData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...this.wildcardData(2, 0, false),
    };
  }
}
