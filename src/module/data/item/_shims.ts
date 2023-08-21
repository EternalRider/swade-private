import { LogCompatibilityWarningOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/utils/module.mjs';
import { ItemAction } from '../../../interfaces/additional.interface';

export function actionProperties(data: any) {
  const options: LogCompatibilityWarningOptions = {
    since: '3.1',
    until: '4.0',
  };
  const descriptor = {
    enumerable: false,
    configurable: true,
  };
  Object.defineProperties(data.actions, {
    skill: {
      ...descriptor,
      get: () => {
        foundry.utils.logCompatibilityWarning(
          getReplacementMessage('skill', 'trait'),
          options,
        );
        return data.actions.trait;
      },
    },
    skillMod: {
      ...descriptor,
      get: () => {
        foundry.utils.logCompatibilityWarning(
          getReplacementMessage('skillMod', 'traitMod'),
          options,
        );
        return data.actions.traitMod;
      },
    },
  });
  for (const action of Object.values<ItemAction>(
    data.actions.additional ?? {},
  )) {
    Object.defineProperties(action, {
      rof: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(
            getReplacementMessage('rof', 'dice'),
            options,
          );
          return action.dice;
        },
      },
      shotsUsed: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(
            getReplacementMessage('shotsUsed', 'resourcesUsed'),
            options,
          );
          return action.resourcesUsed;
        },
      },
      skillOverride: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(
            'The skillOverride and dmgOverride properties have been combined into a new property named override',
            options,
          );
          return action.override;
        },
      },
      skillMod: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(
            'The skillMod and dmgMod properties have been combined into a new property named modifier',
            options,
          );
          return action.modifier;
        },
      },
      dmgOverride: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(
            'The skillOverride and dmgOverride properties have been combined into a new property named override',
            options,
          );
          return action.override;
        },
      },
      dmgMod: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(
            'The skillMod and dmgMod properties have been combined into a new property named modifier',
            options,
          );
          return action.modifier;
        },
      },
    });
  }
}

function getReplacementMessage(old: string, newName: string): string {
  return `The ${old} property has been depreciated in favor of the more aptly named ${newName} property`;
}
