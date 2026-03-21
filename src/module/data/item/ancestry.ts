import { PotentialSource } from '../../../globals';
import { createEmbedElement, createEnrichedTextEmbed } from '../../util';
import * as migrations from './_migration';
import { SwadeBaseItemData } from './base';
import { actions, grants } from './common';
import { Actions, Grants } from './item-common.interface';

declare namespace AncestryData {
  interface Schema extends SwadeBaseItemData.Schema, Actions, Grants {
    threshold: foundry.data.fields.NumberField<{
      integer: true;
      initial: 2;
    }>;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class AncestryData extends SwadeBaseItemData<AncestryData.Schema, AncestryData.BaseData, AncestryData.DerivedData> {
  /** @inheritdoc */
  static override defineSchema(): AncestryData.Schema {
    return {
      ...super.defineSchema(),
      ...actions(),
      ...grants(),
      threshold: new foundry.data.fields.NumberField({
        integer: true,
        initial: 2,
      }),
    };
  }

  get canGrantItems() {
    return true;
  }

  protected override async _preCreate(
    data: foundry.abstract.TypeDataModel.ParentAssignmentType<AncestryData.Schema, Item<'ancestry'>>,
    options: Item.Database.PreCreateOptions,
    user: User.Implementation
  ) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    //Stop Ancestries/Archetypes from being added to the actor as an item if the actor already has one
    if (this.parent.actor?.ancestry) {
      ui.notifications.warn('SWADE.Validation.OnlyOneAncestry', {
        localize: true,
      });
      return false;
    }
  }

  declare enrichedDescription?: string;

  override async toEmbed(
    config: foundry.applications.ux.TextEditor.DocumentHTMLEmbedConfig,
    options: foundry.applications.ux.TextEditor.EnrichmentOptions
  ): Promise<HTMLElement | HTMLCollection | null> {
    // If description=true, render only the description
    if (config.description === true) {
      return createEnrichedTextEmbed(this.description || '', config, options);
    }

    config.caption = false;
    this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
      ...options,
    });
    return await createEmbedElement(this, 'systems/swade/templates/embeds/ancestry-embeds.hbs', [
      'item-embed',
      'ancestry',
    ]);
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<AncestryData>) {
    // TODO: Do we need this? Added way after the old action property names were there
    migrations.renameActionProperties(source);
    return super.migrateData(source);
  }
}

export { AncestryData };
