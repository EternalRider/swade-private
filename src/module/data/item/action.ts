import {
  actions,
  additionalStats,
  category,
  favorite,
  itemDescription,
} from './common';

export interface ActionData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof ActionData)['defineSchema']>
  > {}

export class ActionData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof ActionData)['defineSchema']>
  >
> {
  static defineSchema() {
    return {
      ...itemDescription(),
      ...favorite(),
      ...category(),
      ...actions(),
      ...additionalStats(),
    };
  }
}
