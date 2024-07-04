declare namespace PokerData {
  interface Schema extends DataSchema {
    isJoker: foundry.data.fields.BooleanField;
    suit: foundry.data.fields.NumberField<{ min: 1; max: 4 }>;
  }
  interface BaseData {}
  interface DerivedData {}
}

class PokerData extends foundry.abstract.TypeDataModel<
  PokerData.Schema,
  JournalEntryPage.ConfiguredInstance,
  PokerData.BaseData,
  PokerData.DerivedData
> {
  static override defineSchema(): PokerData.Schema {
    const fields = foundry.data.fields;
    return {
      isJoker: new fields.BooleanField(),
      suit: new fields.NumberField({ min: 1, max: 4 }), // Possible that it's preferable to do this with choices
    };
  }
}

export { PokerData };
