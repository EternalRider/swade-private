export class PokerData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof PokerData)['defineSchema']>
  >,
  Card
> {
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      isJoker: new fields.BooleanField(),
      suit: new fields.NumberField({ min: 1, max: 4 }), // Possible that it's preferable to do this with choices
    };
  }
}
