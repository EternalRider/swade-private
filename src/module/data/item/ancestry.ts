import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { createEmbedElement } from '../../util';
import { SwadeBaseItemData } from './base';
import { grants } from './common';
import { Grants } from './item-common.interface';

declare namespace AncestryData {
  interface Schema extends SwadeBaseItemData.Schema, Grants {
    threshold: foundry.data.fields.NumberField<{
      integer: true;
      initial: 2;
    }>;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class AncestryData extends SwadeBaseItemData<
  AncestryData.Schema,
  AncestryData.BaseData,
  AncestryData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): AncestryData.Schema {
    return {
      ...super.defineSchema(),
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
    data: foundry.documents.BaseItem.ConstructorData,
    options: Item.DatabaseOperations['create'],
    user: BaseUser,
  ) {
    await super._preCreate(data, options, user);
    //Stop Ancestries/Archetypes from being added to the actor as an item if the actor already has one
    if (this.parent.actor?.ancestry) {
      ui.notifications.warn('SWADE.Validation.OnlyOneAncestry', {
        localize: true,
      });
      return false;
    }
  }
  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription = await TextEditor.enrichHTML(
      this.description,
      options,
    );
    return await createEmbedElement(
      this,
      'systems/swade/templates/embeds/ancestry-embeds.hbs',
      ['item-embed', 'ancestry'],
    );
  }
}

export { AncestryData };
