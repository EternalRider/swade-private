import { category, favorite, grants, itemDescription } from './common';

export interface EdgeData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof EdgeData)['defineSchema']>
  > {}

export class EdgeData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<ReturnType<(typeof EdgeData)['defineSchema']>>
> {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...favorite(),
      ...category(),
      ...grants(),
      isArcaneBackground: new fields.BooleanField(),
      requirements: new fields.SchemaField({
        value: new fields.StringField({ initial: '', textSearch: true }),
      }),
    };
  }
}
