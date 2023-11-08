import { CommonActorData } from './common';

const fields = foundry.data.fields;

export interface NpcData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof NpcData)['defineSchema']>
  > {}

export class NpcData extends CommonActorData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...this.wildcardData(2, 0),
      wildcard: new fields.BooleanField({ initial: false }),
    };
  }

  get startingCurrency(): number {
    return game.settings.get('swade', 'npcStartingCurrency');
  }
}
