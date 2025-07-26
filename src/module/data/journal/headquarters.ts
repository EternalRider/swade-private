import { EmptyObject } from 'fvtt-types/utils';

declare namespace HeadquartersData {
  interface Schema extends foundry.data.fields.DataSchema {
    advantage: foundry.data.fields.HTMLField<{ label: string }>;
    complication: foundry.data.fields.HTMLField<{ label: string }>;
    upgrades: foundry.data.fields.HTMLField<{ label: string }>;
    form: foundry.data.fields.SchemaField<{
      description: foundry.data.fields.HTMLField<{ label: string }>;
      acquisition: foundry.data.fields.HTMLField<{ label: string }>;
      maintenance: foundry.data.fields.HTMLField<{ label: string }>;
    }>;
  }
  interface BaseData extends EmptyObject {}
  interface DerivedData extends EmptyObject {}
}

class HeadquartersData extends foundry.abstract.TypeDataModel<
  HeadquartersData.Schema,
  JournalEntryPage.Implementation,
  HeadquartersData.BaseData,
  HeadquartersData.DerivedData
> {
  static override defineSchema(): HeadquartersData.Schema {
    const fields = foundry.data.fields;
    return {
      advantage: new fields.HTMLField({
        label: 'SWADE.Headquarters.Advantage',
      }),
      complication: new fields.HTMLField({
        label: 'SWADE.Headquarters.Complication',
      }),
      upgrades: new fields.HTMLField({ label: 'SWADE.Headquarters.Upgrades' }),
      form: new fields.SchemaField({
        description: new fields.HTMLField({
          label: 'SWADE.Headquarters.Description',
        }),
        acquisition: new fields.HTMLField({
          label: 'SWADE.Headquarters.Acquisition',
        }),
        maintenance: new fields.HTMLField({
          label: 'SWADE.Headquarters.Maintenance',
        }),
      }),
    };
  }
}

export { HeadquartersData };
