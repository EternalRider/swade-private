import { CommonActorData } from './common';
export interface CharacterData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof CharacterData)['defineSchema']>
  > {}

export class CharacterData extends CommonActorData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...this.wildcardData(3, 3),
    };
  }

  get wildcard() {
    return true;
  }

  get startingCurrency(): number {
    return game.settings.get('swade', 'pcStartingCurrency');
  }
}
