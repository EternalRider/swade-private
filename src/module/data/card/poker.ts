import { EmptyObject } from 'fvtt-types/utils';

declare namespace PokerData {
  interface Schema extends foundry.data.fields.DataSchema {
    isJoker: foundry.data.fields.BooleanField<{ label: string }>;
    suit: foundry.data.fields.NumberField<{ min: 1; max: 4 }>;
  }
  interface BaseData extends EmptyObject {}
  interface DerivedData extends EmptyObject {}
}

class PokerData extends foundry.abstract.TypeDataModel<
  PokerData.Schema,
  Card.ConfiguredInstance,
  PokerData.BaseData,
  PokerData.DerivedData
> {
  static override defineSchema(): PokerData.Schema {
    const fields = foundry.data.fields;
    return {
      isJoker: new fields.BooleanField({ label: 'SWADE.IsJoker' }),
      suit: new fields.NumberField({ min: 1, max: 4, label: 'SWADE.CardSuit' }), // Possible that it's preferable to do this with choices
    };
  }
}

export { PokerData };
