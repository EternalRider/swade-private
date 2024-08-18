import { PotentialSource } from '../../../globals';
import { createEmbedElement } from '../../util';
import * as migrations from './_migration';
import * as shims from './_shims';
import { SwadeBaseItemData } from './base';
import { actions, bonusDamage, category, favorite, templates } from './common';
import {
  Actions,
  BonusDamage,
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
      Actions,
      BonusDamage {}
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
      ...bonusDamage(),
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

  async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription = await TextEditor.enrichHTML(this.description, options);
    return await createEmbedElement(this,'systems/swade/templates/embeds/action-embeds.hbs', 'action-embed');
  }

  protected _applyShims() {
    shims.actionProperties(this);
  }

  get canHaveCategory() {
    return true;
  }
}

export { ActionData };
