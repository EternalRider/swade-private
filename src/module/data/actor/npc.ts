import { CharacterDataPropertiesData } from '../../documents/actor/actor-data-properties';
import { CommonActorData } from './common';

const fields = foundry.data.fields;

export interface NpcData extends CharacterDataPropertiesData {}

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
