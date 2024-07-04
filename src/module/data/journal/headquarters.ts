declare namespace HeadquartersData {
  interface Schema extends DataSchema {
    advantage: foundry.data.fields.HTMLField;
    complication: foundry.data.fields.HTMLField;
    upgrades: foundry.data.fields.HTMLField;
    form: foundry.data.fields.SchemaField<{
      description: foundry.data.fields.HTMLField;
      acquisition: foundry.data.fields.HTMLField;
      maintenance: foundry.data.fields.HTMLField;
    }>;
  }
  interface BaseData {}
  interface DerivedData {}
}

class HeadquartersData extends foundry.abstract.TypeDataModel<
  HeadquartersData.Schema,
  JournalEntryPage.ConfiguredInstance,
  HeadquartersData.BaseData,
  HeadquartersData.DerivedData
> {
  static override defineSchema(): HeadquartersData.Schema {
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

export { HeadquartersData };
