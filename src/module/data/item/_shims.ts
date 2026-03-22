export function actionProperties(data: any) {
  const options: foundry.utils.LogCompatibilityWarningOptions = {
    since: '3.1',
    until: '4.0',
  };
  const descriptor = { configurable: true };

  Object.defineProperties(data.actions, {
    skill: {
      ...descriptor,
      get: () => {
        foundry.utils.logCompatibilityWarning(getReplacementMessage('skill', 'trait'), options);
        return data.actions.trait;
      },
      set: (skill: string) => {
        foundry.utils.logCompatibilityWarning(getReplacementMessage('skill', 'trait'), options);
        data.actions.trait = skill;
      },
    },
    skillMod: {
      ...descriptor,
      get: () => {
        foundry.utils.logCompatibilityWarning(getReplacementMessage('skillMod', 'traitMod'), options);

        return data.actions.traitMod;
      },
      set: (skillMod: string) => {
        foundry.utils.logCompatibilityWarning(getReplacementMessage('skill', 'traitMod'), options);
        data.actions.traitMod = skillMod;
      },
    },
  });

  for (const action of Object.values<any>(data.actions.additional)) {
    Object.defineProperties(action, {
      rof: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(getReplacementMessage('rof', 'dice'), options);
          return action.dice;
        },
        set: (rof: number) => {
          foundry.utils.logCompatibilityWarning(getReplacementMessage('rof', 'dice'), options);
          action.dice = rof;
        },
      },
      shotsUsed: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(getReplacementMessage('shotsUsed', 'resourcesUsed'), options);
          return action.resourcesUsed;
        },
        set: (shots: number) => {
          foundry.utils.logCompatibilityWarning(getReplacementMessage('shotsUsed', 'resourcesUsed'), options);
          action.resourcesUsed = shots;
        },
      },
      skillOverride: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(
            'The skillOverride and dmgOverride properties have been combined into a new property named override',
            options
          );
          return action.override;
        },
        set: (skillOverride: string) => {
          foundry.utils.logCompatibilityWarning(
            'The skillOverride and dmgOverride properties have been combined into a new property named override',
            options
          );
          action.override = skillOverride;
        },
      },
      skillMod: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(
            'The skillMod and dmgMod properties have been combined into a new property named modifier',
            options
          );
          return action.modifier;
        },
        set: (skillMod: string) => {
          foundry.utils.logCompatibilityWarning(
            'The skillMod and dmgMod properties have been combined into a new property named modifier',
            options
          );
          action.modifier = skillMod;
        },
      },
      dmgOverride: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(
            'The skillOverride and dmgOverride properties have been combined into a new property named override',
            options
          );
          return action.override;
        },
        set: (dmgOverride: string) => {
          foundry.utils.logCompatibilityWarning(
            'The skillOverride and dmgOverride properties have been combined into a new property named override',
            options
          );
          action.override = dmgOverride;
        },
      },
      dmgMod: {
        ...descriptor,
        get: () => {
          foundry.utils.logCompatibilityWarning(
            'The skillMod and dmgMod properties have been combined into a new property named modifier',
            options
          );
          return action.modifier;
        },
        set: (dmgMod: string) => {
          foundry.utils.logCompatibilityWarning(
            'The skillMod and dmgMod properties have been combined into a new property named modifier',
            options
          );
          action.modifier = dmgMod;
        },
      },
    });
  }
}

function getReplacementMessage(old: string, newName: string): string {
  return `The ${old} property has been depreciated in favor of the more aptly named ${newName} property`;
}
