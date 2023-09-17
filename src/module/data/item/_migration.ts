import { constants } from '../../constants';

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

export function renameRaceToAncestry(source: any) {
  if (source.subtype === 'race') {
    source.subtype = constants.ABILITY_TYPE.ANCESTRY;
  }
}
