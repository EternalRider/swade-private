export function _shimPace(source) {
  const descriptor = { configurable: true };
  const options: foundry.utils.LogCompatibilityWarningOptions = {
    since: '4.2',
    until: '5.0',
  };
  const shim = {};
  Object.defineProperties(shim, {
    value: {
      ...descriptor,
      get: () => {
        foundry.utils.logCompatibilityWarning(
          'The system.stats.speed.value property has been moved to the new system.pace object',
          options
        );
        return source.pace[source.pace.base];
      },
      set: (pace: number) => {
        foundry.utils.logCompatibilityWarning(
          'The system.stats.speed.value property has been moved to the new system.pace object',
          options
        );
        source.pace[source.pace.base] = pace;
      },
    },
    adjusted: {
      ...descriptor,
      get: () => {
        foundry.utils.logCompatibilityWarning(
          'The system.stats.speed.adjusted property has been moved to the new system.pace object',
          options
        );
        return source.pace[source.pace.base];
      },
      set: (pace: number) => {
        foundry.utils.logCompatibilityWarning(
          'The system.stats.speed.adjusted property has been moved to the new system.pace object',
          options
        );
        source.pace[source.pace.base] = pace;
      },
    },
    runningDie: {
      ...descriptor,
      get: () => {
        foundry.utils.logCompatibilityWarning(
          'The system.stats.speed.runningDie property has been moved to the new system.pace.running object',
          options
        );
        return source.pace.running.die;
      },
      set: (sides: number) => {
        foundry.utils.logCompatibilityWarning(
          'The system.stats.speed.runningDie property has been moved to the new system.pace.running object',
          options
        );
        source.pace.running.die = sides;
      },
    },
    runningMod: {
      ...descriptor,
      get: () => {
        foundry.utils.logCompatibilityWarning(
          'The system.stats.speed.runningMod property has been moved to the new system.pace.running object',
          options
        );
        return source.pace.running.mod;
      },
      set: (modifier: number) => {
        foundry.utils.logCompatibilityWarning(
          'The system.stats.speed.runningMod property has been moved to the new system.pace.running object',
          options
        );
        source.pace.running.mod = modifier;
      },
    },
  });

  foundry.utils.setProperty(source, 'stats.speed', shim);
}
