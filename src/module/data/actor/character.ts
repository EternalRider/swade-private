import type { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import type BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { ItemMetadata } from '../../../globals';
import { CommonActorData } from './common';

declare namespace CharacterData {
  interface Schema
    extends CommonActorData.Schema,
      ReturnType<(typeof CharacterData)['wildcardData']> {}

  interface BaseData extends CommonActorData.BaseData {}

  interface DerivedData extends CommonActorData.DerivedData {}
}

export class CharacterData extends CommonActorData<
  CharacterData.Schema,
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

  protected async _preCreate(
    createData: foundry.documents.BaseActor.ConstructorData,
    _options: DocumentModificationOptions,
    _user: BaseUser,
  ) {
    this.parent.updateSource({
      prototypeToken: {
        actorLink: true,
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
      },
    });

    const coreSkillList = game.settings.get('swade', 'coreSkills');

    //only do this if this is a PC with no prior skills
    if (coreSkillList.length > 0 && this.parent.itemTypes.skill.length === 0) {
      //Get list of core skills from settings
      const coreSkills = coreSkillList.split(',').map((s) => s.trim());

      //Set compendium source
      const pack = game.packs.get(
        game.settings.get('swade', 'coreSkillsCompendium'),
        { strict: true },
      ) as CompendiumCollection<ItemMetadata>;

      const skillIndex = await pack.getDocuments();

      // extract skill data
      const skills = skillIndex
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

    const isImported = foundry.utils.hasProperty(
      createData,
      'flags.core.sourceId',
    );

    //Handle starting currency
    if (!isImported) {
      this.updateSource({ 'details.currency': this.#startingCurrency });
    }
  }
}
