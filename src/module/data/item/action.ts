import { PotentialSource } from '../../../globals';
import {
  actions,
  additionalStats,
  category,
  favorite,
  itemDescription,
  templates,
} from './common';
import * as migrations from './_migration';
import * as shims from './_shims';

export interface ActionData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof ActionData)['defineSchema']>
  > {}

export class ActionData extends foundry.abstract.TypeDataModel<
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
  static override migrateData(source: PotentialSource<ActionData>) {
    migrations.renameActionProperties(source);
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

  get canHaveCategory() {
    return true;
  }
}
