import { favorite, grants, itemDescription } from './common';

export interface HindranceData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof HindranceData)['defineSchema']>
  > {}

export class HindranceData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof HindranceData)['defineSchema']>
  >
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...favorite(),
      ...grants(),
      major: new fields.BooleanField(),
    };
  }
}
