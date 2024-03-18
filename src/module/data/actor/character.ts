import { CharacterDataPropertiesData } from '../../documents/actor/actor-data-properties';
import { CommonActorData } from './common';
export interface CharacterData extends CharacterDataPropertiesData {}

export class CharacterData extends CommonActorData {
  static override defineSchema() {
    return {
      ...super.defineSchema(),
      ...this.wildcardData(3, 3),
    };
  }

  override get wildcard() {
    return true;
  }

  get startingCurrency(): number {
    return game.settings.get('swade', 'pcStartingCurrency');
  }
}
