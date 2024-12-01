import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { createEmbedElement } from '../../util';
import { CreatureData } from './base/creature';

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
  NpcData.Schema,
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
    createData: foundry.documents.BaseActor.ConstructorData,
    _options: Actor.DatabaseOperations['create'],
    _user: BaseUser,
  ) {
    const isImported = foundry.utils.hasProperty(
      createData,
      'flags.core.sourceId',
    );

    //Handle starting currency
    if (!isImported) {
      this.updateSource({ 'details.currency': this.#startingCurrency });
    }
  }

  protected override _onUpdate(
    _changed: foundry.documents.BaseActor.UpdateData,
    _options: Actor.DatabaseOperations['update'],
    _userId: string,
  ) {
    ui.actors?.render(true);
  }

  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
  
    // Enrich biography text
    this.enrichedBiography = await TextEditor.enrichHTML(
      this.details.biography.value,
      options,
    );
  
    // Combine weapons and armor into a displayable gear array
    const displayableGear = this.parent.itemTypes.armor.concat(
      this.parent.itemTypes.weapon,
    );
    foundry.utils.setProperty(this, 'displayableGear', displayableGear);
  
    // Enrich and strip ability descriptions to plain text
    if (this.parent.itemTypes.ability) {
      for (const ability of this.parent.itemTypes.ability) {
        const enrichedHTML = await TextEditor.enrichHTML(
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
