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
      advantage: new fields.HTMLField({ label: 'SWADE.Headquarters.Advantage' }),
      complication: new fields.HTMLField({ label: 'SWADE.Headquarters.Complication' }),
      upgrades: new fields.HTMLField({ label: 'SWADE.Headquarters.Upgrades' }),
      form: new fields.SchemaField({
        description: new fields.HTMLField({ label: 'SWADE.Headquarters.Description' }),
        acquisition: new fields.HTMLField({ label: 'SWADE.Headquarters.Acquisition' }),
        maintenance: new fields.HTMLField({ label: 'SWADE.Headquarters.Maintenance' }),
      }),
    };
  }
}

export { HeadquartersData };
