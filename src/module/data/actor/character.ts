import { ItemMetadata } from '../../../globals';
import { createEmbedElement } from '../../util';
import type { SkillData } from '../item';
import { CreatureData } from './base/creature';
import { WildCardDataSchema } from './base/creature.schemas';

declare namespace CharacterData {
  interface Schema extends CreatureData.Schema {}
  interface BaseData extends CreatureData.BaseData {}
  interface DerivedData extends CreatureData.DerivedData {}
}

export class CharacterData extends CreatureData<
  CharacterData.Schema & WildCardDataSchema,
  CharacterData.BaseData,
  CharacterData.DerivedData
> {
  static override defineSchema() {
    return {
      ...super.defineSchema(),
      ...this.wildcardData(3, 3),
    };
  }

  get wildcard() {
    return true;
  }

  get #startingCurrency(): number {
    return game.settings.get('swade', 'pcStartingCurrency') ?? 0;
  }

  async #addCoreSkills() {
    //Get list of core skills from settings
    const coreSkills = game.settings
      .get('swade', 'coreSkills')
      .split(',')
      .map((s) => s.trim());

    //only do this if this is a PC with no prior skills
    if (coreSkills.length > 0 && this.parent.itemTypes.skill.length === 0) {
      const coreSkillsPack = game.settings.get('swade', 'coreSkillsCompendium');
      //Set compendium source, including a fallback to the system compendium of the required one cannot be found
      const pack = (game.packs.get(coreSkillsPack) ??
        game.packs.get('swade.skills')) as CompendiumCollection<ItemMetadata>;

      if (!pack) return; //critical fallback point, simply skip core skills if neither pack can be located

      const skillIndex = await pack.getDocuments();

      // extract skill data
      const skills: foundry.abstract.TypeDataModel.ParentAssignmentType<
        SkillData.Schema,
        Item<'skill'>
      >[] = skillIndex
        .filter((i) => i.type === 'skill')
        .filter((i) => coreSkills.includes(i.name!))
        .map((s) => s.toObject());

      // Create core skills not in compendium (for custom skill names entered by the user)
      for (const skillName of coreSkills) {
        if (!skillIndex.find((skill) => skillName === skill.name)) {
          skills.push({
            name: skillName,
            type: 'skill',
            img: 'systems/swade/assets/icons/skill.svg',
            system: { attribute: '' },
          });
        }
      }

      //set all the skills to be core skills
      for (const skill of skills) {
        if (skill.type === 'skill') skill.system.isCoreSkill = true;
      }

      //Add the Untrained skill
      skills.push({
        name: game.i18n.localize('SWADE.Unskilled'),
        type: 'skill',
        img: 'systems/swade/assets/icons/skill.svg',
        system: {
          attribute: '',
          die: {
            sides: 4,
            modifier: -2,
          },
        },
      });

      //Add the items to the creation data
      this.parent.updateSource({ items: skills });
    }
  }

  protected override async _preCreate(
    createData: foundry.abstract.TypeDataModel.ParentAssignmentType<
      CharacterData.Schema,
      Actor<'character'>
    >,
    options: Actor.Database.PreCreateOptions,
    user: User.Implementation,
  ) {
    const allowed = await super._preCreate(createData, options, user);
    if (allowed === false) return false;
    this.parent.updateSource({
      prototypeToken: {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
      },
    });

    await this.#addCoreSkills();

    //Handle starting currency
    if (
      !this.parent._stats.compendiumSource &&
      !this.parent._stats.duplicateSource
    ) {
      this.updateSource({ 'details.currency': this.#startingCurrency });
    }
  }

  declare enrichedBiography?: string;

  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;

    // Enrich biography text
    this.enrichedBiography = await TextEditor.enrichHTML(
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
      ['actor-embed', 'character'],
    );
  }
}
