import { PotentialSource } from '../../../globals';
import * as migrations from './_migration';
import * as shims from './_shims';
import { SwadeBaseItemData } from './base';
import { actions, category, favorite, templates } from './common';
import {
  Actions,
  Category,
  Favorite,
  Templates,
} from './item-common.interface';

declare namespace ActionData {
  interface Schema
    extends SwadeBaseItemData.Schema,
      Favorite,
      Category,
      Templates,
      Actions {}
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class ActionData extends SwadeBaseItemData<
  ActionData.Schema,
  ActionData.BaseData,
  ActionData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): ActionData.Schema {
    return {
      ...super.defineSchema(),
      ...favorite(),
      ...category(),
      ...templates(),
      ...actions(),
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

export { ActionData };
