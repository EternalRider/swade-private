import { createEmbedElement, createEnrichedTextEmbed, slugify } from '../../util';
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
    // Get list of core skills from settings
    const coreSkills = game.settings
      .get('swade', 'coreSkills')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '');

    // Only do this if this is a PC with no prior skills
    if (coreSkills.length > 0 && this.parent.itemTypes.skill.length === 0) {
      const coreSkillsPack = game.settings.get('swade', 'coreSkillsCompendium');
      // Set compendium source, including a fallback to the system compendium of the required one cannot be found
      const pack = (game.packs.get(coreSkillsPack) ??
        game.packs.get('swade.skills')) as foundry.documents.collections.CompendiumCollection<'Item'>;

      if (!pack) return; // Critical fallback point, simply skip core skills if neither pack can be located

      const skillIndex = await pack.getDocuments();

      const skills: foundry.abstract.TypeDataModel.ParentAssignmentType<SkillData.Schema, Item.OfType<'skill'>>[] = [];

      // Create core skills not in compendium (for custom skill names entered by the user)
      for (const skillName of coreSkills) {
        const skill = skillIndex.find(
          (skill) => skill.type === 'skill' && (skillName === skill.name || slugify(skillName) === skill.system.swid)
        );

        if (skill) {
          skills.push(skill.toObject());
        } else {
          // Skill not found, create bare skill.
          skills.push({
            name: skillName,
            type: 'skill',
            img: 'systems/swade/assets/icons/skill.svg',
            system: { attribute: '' },
          });
        }
      }

      // Set all the skills to be core skills
      for (const skill of skills) {
        if (skill.type === 'skill') skill.system.isCoreSkill = true;
      }

      // Add the Untrained skill (from the compendium if it exists there, else as a bare skill)
      const untrained = game.i18n.localize('SWADE.Unskilled');
      const untrainedSkill = skillIndex.find(
        (skill) => skill.type === 'skill' && (untrained === skill.name || slugify(untrained) === skill.system.swid)
      );
      if (untrainedSkill) {
        skills.push(untrainedSkill.toObject());
      } else {
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
      }

      // Add the skills to the creation data
      this.parent.updateSource({ items: skills });
    }
  }

  protected override async _preCreate(
    createData: foundry.abstract.TypeDataModel.ParentAssignmentType<CharacterData.Schema, Actor.OfType<'character'>>,
    options: Actor.Database.PreCreateOptions,
    user: User.Implementation
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
    if (!this.parent._stats.compendiumSource && !this.parent._stats.duplicateSource) {
      this.updateSource({ 'details.currency': this.#startingCurrency });
    }
  }

  declare enrichedBiography?: string;

  override async toEmbed(
    config: foundry.applications.ux.TextEditor.DocumentHTMLEmbedConfig,
    options: foundry.applications.ux.TextEditor.EnrichmentOptions
  ): Promise<HTMLElement | HTMLCollection | null> {
    // If description=true, render only the description
    if (config.description === true) {
      return createEnrichedTextEmbed(this.details.biography.value || '', config, options);
    }

    config.caption = false;

    // Enrich biography text
    this.enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.details.biography.value,
      { ...options }
    );

    // Combine weapons and armor into a displayable gear array
    const displayableGear = this.parent.itemTypes.armor.concat(this.parent.itemTypes.weapon);
    foundry.utils.setProperty(this, 'displayableGear', displayableGear);

    // Enrich and strip ability descriptions to plain text
    if (this.parent.itemTypes.ability) {
      for (const ability of this.parent.itemTypes.ability) {
        const enrichedHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          ability.system.description,
          { ...options }
        );
        ability.plainTextDescription = enrichedHTML.replace(/<[^>]*>/g, ''); // Strip HTML tags
      }
    }

    // Create the embed element
    const embed = await createEmbedElement(this, 'systems/swade/templates/embeds/actor-embeds.hbs', [
      'actor-embed',
      'character',
    ]);

    if (embed) {
      // See src/globals.d.ts for docs
      Hooks.callAll('swadeActorEmbed', embed, this.parent, config, options);
    }

    return embed;
  }
}
