import { DeepPartial } from 'fvtt-types/utils';
import { createEmbedElement } from '../../util';
import { CreatureData } from './base/creature';
import { WildCardDataSchema } from './base/creature.schemas';

const fields = foundry.data.fields;

declare namespace NpcData {
  interface Schema extends CreatureData.Schema {
    wildcard: foundry.data.fields.BooleanField<{
      initial: false;
      label: string;
    }>;
  }
  interface BaseData extends CreatureData.BaseData {}
  interface DerivedData extends CreatureData.DerivedData {}
}

export class NpcData extends CreatureData<
  NpcData.Schema & WildCardDataSchema,
  NpcData.BaseData,
  NpcData.DerivedData
> {
  static override defineSchema(): NpcData.Schema {
    return {
      ...super.defineSchema(),
      ...this.wildcardData(2, 0),
      wildcard: new fields.BooleanField({
        initial: false,
        label: 'SWADE.WildCard',
      }),
    };
  }

  get #startingCurrency(): number {
    return game.settings.get('swade', 'npcStartingCurrency') ?? 0;
  }

  protected override async _preCreate(
    createData: foundry.abstract.TypeDataModel.ParentAssignmentType<
      NpcData.Schema,
      Actor<'npc'>
    >,
    options: Actor.Database.PreCreateOptions,
    user: User.Implementation,
  ) {
    const allowed = await super._preCreate(createData, options, user);
    if (allowed === false) return false;

    //Handle starting currency
    if (
      !this.parent._stats.compendiumSource &&
      !this.parent._stats.duplicateSource
    ) {
      this.updateSource({ 'details.currency': this.#startingCurrency });
    }
  }

  protected override _onUpdate(
    changed: DeepPartial<
      foundry.abstract.TypeDataModel.ParentAssignmentType<
        NpcData.Schema,
        Actor<'npc'>
      >
    >,
    options: Actor.Database.OnUpdateOperation,
    userId: string,
  ) {
    super._onUpdate(changed, options, userId);
    ui.actors?.render(true);
  }

  declare enrichedBiography?: string;

  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;

    // Enrich biography text
    this.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.details.biography.value,
      { ...options },
    );

    // Combine weapons and armor into a displayable gear array
    const displayableGear = this.parent.itemTypes.armor.concat(
      this.parent.itemTypes.weapon,
    );
    foundry.utils.setProperty(this, 'displayableGear', displayableGear);

    // Enrich and strip ability descriptions to plain text
    if (this.parent.itemTypes.ability) {
      for (const ability of this.parent.itemTypes.ability) {
        const enrichedHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          ability.system.description,
          options,
        );
        ability.plainTextDescription = enrichedHTML.replace(/<[^>]*>/g, ''); // Strip HTML tags
      }
    }

    // Create the embed element
    return await createEmbedElement(
      this,
      'systems/swade/templates/embeds/actor-embeds.hbs',
      ['actor-embed', 'npc'],
    );
  }
}
