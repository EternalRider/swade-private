import { renameActionProperties } from './_migration';
import * as shims from './_shims';
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
  /** @inheritdoc */
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
  static override migrateData(source: object): object {
    renameActionProperties(source);
    return super.migrateData(source);
  }

  /** @inheritdoc */
  protected override _initialize(options?: any) {
    super._initialize(options);
    this._applyShims();
  }

  protected _applyShims() {
    shims.actionProperties(this);
  }
}
