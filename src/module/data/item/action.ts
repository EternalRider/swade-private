import { _renameActionProperties } from '../../migration/migration';
import {
  actions,
  additionalStats,
  category,
  favorite,
  itemDescription,
  templates,
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
  static override defineSchema() {
    return {
      ...itemDescription(),
      ...favorite(),
      ...category(),
      ...templates(),
      ...actions(),
      ...additionalStats(),
    };
  }

  /** @inheritdoc */
  static override migrateData(source) {
    _renameActionProperties(source);
    return super.migrateData(source);
  }
}
