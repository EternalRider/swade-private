import { PotentialSource } from '../../../globals';
import { SWADE } from '../../config';
import { constants } from '../../constants';
import type { AbilityData } from './ability';
import { EdgeData } from './edge';

export function renameActionProperties(source: any) {
  if (!source.actions) return;
  const actions = source.actions;
  if (!actions.trait && actions.skill) {
    actions.trait = actions.skill;
    delete actions.skill;
  }
  if (!actions.traitMod && actions.skillMod) {
    actions.traitMod = actions.skillMod;
    delete actions.skillMod;
  }
  for (const [id, action] of Object.entries<any>(actions.additional ?? {})) {
    if (id.startsWith('-=') && action === null) continue; //skip null actions, happens on delete
    //remap skill to trait type actions
    action.type = action.type === 'skill' ? 'trait' : action.type;

    //set the new properties
    if (!action.resourcesUsed && action.shotsUsed) {
      action.resourcesUsed = action.shotsUsed;
      delete action.shotsUsed;
    }
    if (!action.dice && action.rof) {
      if (typeof action.rof === 'string') {
        if (Number.isNumeric(action.rof)) action.dice = Number(action.rof);
      } else if (typeof action.rof === 'number') {
        action.dice = action.rof;
      }
      delete action.rof;
    }
    if (!action.modifier && (action.skillMod || action.dmgMod)) {
      if (action.type === constants.ACTION_TYPE.TRAIT) {
        action.modifier = action.skillMod;
      }
      if (action.type === constants.ACTION_TYPE.DAMAGE) {
        action.modifier = action.dmgMod;
      }
      delete action.skillMod;
      delete action.dmgMod;
    }
    if (!action.override && (action.skillOverride || action.dmgOverride)) {
      if (action.type === constants.ACTION_TYPE.TRAIT) {
        action.override = action.skillOverride;
      }
      if (action.type === constants.ACTION_TYPE.DAMAGE) {
        action.override = action.dmgOverride;
      }
      delete action.skillOverride;
      delete action.dmgOverride;
    }
  }
}

export function renameRaceToAncestry(source: PotentialSource<AbilityData>) {
  if (source.subtype === 'race') source.subtype = 'ancestry';
}

export function convertRequirementsToList(source: PotentialSource<EdgeData>) {
  if (
    !source.requirements ||
    Array.isArray(source.requirements) ||
    Object.keys(source.requirements).every((k) => Number.isNumeric(k))
  ) {
    return;
  }
  const oldValue = source.requirements['value'] as string;
  const mapped: any[] = oldValue
    .split(',')
    .filter(Boolean)
    .map((r) => r.trim()) //trim excess whitespaces before we do the actual mapping
    .map((requirement: string) => {
      if (SWADE.ranks.includes(requirement)) {
        return {
          type: constants.REQUIREMENT_TYPE.RANK,
          value: SWADE.ranks.indexOf(requirement),
        };
      }
      if (
        requirement === game.i18n.localize('SWADE.WildCard') ||
        requirement === 'Wild Card'
      ) {
        return {
          type: constants.REQUIREMENT_TYPE.WILDCARD,
          value: true,
        };
      }
      return {
        type: constants.REQUIREMENT_TYPE.OTHER,
        label: requirement,
      };
    });
  //make sure at least 1 rank requirement is present in case none could be detected
  if (!mapped.find((r) => r.type === constants.REQUIREMENT_TYPE.RANK)) {
    mapped.unshift({
      type: constants.REQUIREMENT_TYPE.RANK,
      value: constants.RANK.NOVICE,
    });
  }
  source.requirements = mapped;
}
