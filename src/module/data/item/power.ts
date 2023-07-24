import {
  actions,
  bonusDamage,
  favorite,
  itemDescription,
  templates,
} from './common';

export interface PowerData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof PowerData)['defineSchema']>
  > {}

export class PowerData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof PowerData)['defineSchema']>
  >
> {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...actions(),
      ...bonusDamage(),
      ...favorite(),
      ...templates(),
      rank: new fields.StringField({ initial: '', textSearch: true }),
      pp: new fields.NumberField({ initial: 0 }),
      damage: new fields.StringField({ initial: '' }),
      range: new fields.StringField({ initial: '' }),
      duration: new fields.StringField({ initial: '' }),
      trapping: new fields.StringField({ initial: '', textSearch: true }),
      arcane: new fields.StringField({ initial: '', textSearch: true }),
      ap: new fields.NumberField({ initial: 0 }),
      innate: new fields.BooleanField(),
      modifiers: new fields.ArrayField(new fields.ObjectField()),
    };
  }
}
