import { DeepPartial } from 'fvtt-types/utils';
import { PotentialSource } from '../../../globals';
import { createEmbedElement } from '../../util';
import * as migrations from './_migration';
import * as shims from './_shims';
import { SwadeBaseItemData } from './base';
import { actions, category, favorite, limitedUses, templates } from './common';
import {
  Actions,
  Category,
  Favorite,
  LimitedUses,
  Templates,
} from './item-common.interface';
import type SwadeItem from '../../documents/item/SwadeItem';

declare namespace ActionData {
  interface Schema
    extends SwadeBaseItemData.Schema,
      Favorite,
      Category,
      Templates,
      LimitedUses,
      Actions {
    hidden: foundry.data.fields.BooleanField<{
      initial: boolean;
      label: string;
      hint: string;
    }>;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class ActionData extends SwadeBaseItemData<
  ActionData.Schema,
  ActionData.BaseData,
  ActionData.DerivedData
> {
  static override defineSchema(): ActionData.Schema {
    return {
      ...super.defineSchema(),
      ...favorite(),
      ...category(),
      ...templates(),
      ...actions(),
      ...limitedUses(),
      hidden: new foundry.data.fields.BooleanField({
        initial: false,
        label: 'SWADE.Actions.Hidden.Label',
        hint: 'SWADE.Actions.Hidden.Hint',
      }),
    };
  }

  static override migrateData(source: PotentialSource<ActionData>) {
    migrations.renameActionProperties(source);
    return super.migrateData(source);
  }

  get canHaveCategory() {
    return true;
  }

  declare enrichedDescription?: string;

  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
      ...options,
    });
    return await createEmbedElement(
      this,
      'systems/swade/templates/embeds/action-embeds.hbs',
      ['item-embed', 'action'],
    );
  }

  protected _applyShims() {
    shims.actionProperties(this);
  }

  protected override _initialize(options?: any) {
    super._initialize(options);
    this._applyShims();
  }

  #triggerActivityUpdate() {
    const items =
      this.parent.actor?.items.filter(
        (i) => 'activities' in i.system && i.system.activities.has(this.swid),
      ) ?? [];
    for (const item of items) {
      item._safePrepareData();
      item.sheet.render();
    }
  }

  protected override _onUpdate(
    changed: DeepPartial<
      foundry.abstract.TypeDataModel.ParentAssignmentType<
        ActionData.Schema,
        SwadeItem
      >
    >,
    options: Item.Database.OnUpdateOperation,
    userId: string,
  ): void {
    super._onUpdate(changed, options, userId);
    if (foundry.utils.hasProperty(changed, 'system.actions'))
      this.#triggerActivityUpdate();
  }
  protected override _onCreate(
    data: foundry.abstract.TypeDataModel.ParentAssignmentType<
      ActionData.Schema,
      SwadeItem
    >,
    options: Item.Database.OnCreateOperation,
    userId: string,
  ): void {
    super._onCreate(data, options, userId);
    this.#triggerActivityUpdate();
  }
  protected override _onDelete(
    options: Item.Database.OnDeleteOperation,
    userId: string,
  ): void {
    super._onDelete(options, userId);
    this.#triggerActivityUpdate();
  }
}

export { ActionData };
