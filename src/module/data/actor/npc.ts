import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { createEmbedElement } from '../../util';
import { CommonActorData } from './common';

const fields = foundry.data.fields;

declare namespace NpcData {
  interface Schema
    extends CommonActorData.Schema,
      ReturnType<(typeof NpcData)['wildcardData']> {
    wildcard: foundry.data.fields.BooleanField<{ initial: false }>;
  }

  interface BaseData extends CommonActorData.BaseData {}

  interface DerivedData extends CommonActorData.DerivedData {}
}

export class NpcData extends CommonActorData<
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
    this.enrichedBiography = await TextEditor.enrichHTML(
      this.details.biography.value,
      options,
    );

    // Combine weapons and armor into a displayable gear array. For now, these are the only items we display under gear.
    // TODO: refactor to a handlebar helper
    const displayableGear = this.parent.itemTypes.armor.concat(
      this.parent.itemTypes.weapon,
    );
    foundry.utils.setProperty(this, 'displayableGear', displayableGear);

    return await createEmbedElement(
      this,
      'systems/swade/templates/embeds/actor-embeds.hbs',
      'actor-embed',
    );
  }
}
