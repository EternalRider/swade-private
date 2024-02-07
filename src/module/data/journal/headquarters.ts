export class HeadquartersData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof HeadquartersData)['defineSchema']>
  >,
  JournalEntryPage
> {
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      advantage: new fields.HTMLField(),
      complication: new fields.HTMLField(),
      upgrades: new fields.HTMLField(),
      form: new fields.SchemaField({
        description: new fields.HTMLField(),
        acquisition: new fields.HTMLField(),
        maintenance: new fields.HTMLField(),
      }),
    };
  }
}
