import { PotentialSource } from '../../../globals';
import { constants } from '../../constants';
import { createEnrichedTextEmbed, createEmbedElement } from '../../util';
import { ChargesData } from '../fields';
import * as migrations from './_migration';
import { SwadeBaseItemData } from './base';
import { builder, category, favorite, grants } from './common';
import {
  Builder,
  Category,
  ChoicesType,
  Favorite,
  Grants,
} from './item-common.interface';

declare namespace AbilityData {
  interface Schema
    extends SwadeBaseItemData.Schema,
      Favorite,
      Category,
      Grants,
      Builder {
    subtype: foundry.data.fields.StringField<{
      initial: typeof constants.ABILITY_TYPE.SPECIAL;
      choices: ChoicesType<typeof constants.ABILITY_TYPE>;
      textSearch: true;
    }>;
    grantsPowers: foundry.data.fields.BooleanField<{ label: string }>;
    charges: foundry.data.fields.EmbeddedDataField<typeof ChargesData>;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class AbilityData extends SwadeBaseItemData<
  AbilityData.Schema,
  AbilityData.BaseData,
  AbilityData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): AbilityData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...favorite(),
      ...category(),
      ...grants(),
      ...builder(),
      subtype: new fields.StringField({
        initial: constants.ABILITY_TYPE.SPECIAL,
        choices: Object.values(constants.ABILITY_TYPE),
        textSearch: true,
        label: 'SWADE.Subtype',
      }),
      grantsPowers: new fields.BooleanField({
        label: 'SWADE.GrantsPowers',
      }),
      charges: new fields.EmbeddedDataField(ChargesData),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<AbilityData>) {
    migrations.renameRaceToAncestry(source);
    return super.migrateData(source);
  }

  get canHaveCategory() {
    return true;
  }

  get canGrantItems() {
    return true;
  }

  protected override async _preCreate(
    data: foundry.abstract.TypeDataModel.ParentAssignmentType<
      AbilityData.Schema,
      Item<'ability'>
    >,
    options: Item.Database.PreCreateOptions,
    user: User.Implementation,
  ) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    //Stop Archetypes from being added to the actor as an item if the actor already has one
    const subType = this.subtype;
    if (
      subType === constants.ABILITY_TYPE.ARCHETYPE &&
      !!this.parent.actor?.archetype
    ) {
      ui.notifications?.warn('SWADE.Validation.OnlyOneArchetype', {
        localize: true,
      });
      return false;
    }
  }

  declare enrichedDescription?: string;

  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    // If description=true, render only the description
    if (config.description === true) {
      return createEnrichedTextEmbed(this.description || '', config, options);
    }

    config.caption = false;
    this.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.description,
        {
          ...options,
        },
      );
    return await createEmbedElement(
      this,
      'systems/swade/templates/embeds/ability-embeds.hbs',
      ['item-embed', 'ability'],
    );
  }
}

export { AbilityData };
