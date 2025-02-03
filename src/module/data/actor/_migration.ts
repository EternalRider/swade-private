export function splitTopSpeed(source: any) {
  if (
    Object.hasOwn(source, 'topspeed') &&
    typeof source.topspeed === 'string'
  ) {
    const stringValue: string = source.topspeed;
    const match = stringValue.match(/^\d*/);
    if (Number.isNumeric(stringValue)) {
      source.topspeed = { value: Number(stringValue), unit: '' };
    } else if (!match) {
      source.topspeed = { value: 0, unit: '' };
    } else {
      const value = match[0];
      const unit = stringValue.slice(value.length).trim();
      source.topspeed = { value: Number(value), unit };
    }
  }
}

export function renamePace(source: any) {
  const oldSpeed = source.stats?.speed;
  if (foundry.utils.hasProperty(source, 'pace') || !oldSpeed) return;
  const oldPace = oldSpeed?.value;
  const oldRunningDie = oldSpeed?.runningDie;
  const oldRunningMod = oldSpeed?.runningMod;
  const runningDie = {
    die: typeof oldRunningMod === 'number' ? oldRunningDie : 6,
    mod: typeof oldRunningDie === 'number' ? oldRunningMod : 0,
  };
  source.pace = {
    ground: typeof oldPace === 'number' ? oldPace : 6,
    running: runningDie,
  };
}

export function shiftCargoModsMax(source: any) {
  const oldMaxCargo = source.maxCargo;
  if (oldMaxCargo) foundry.utils.setProperty(source, 'cargo.max', oldMaxCargo);
  const oldMaxMods = source.maxMods;
  if (oldMaxMods) foundry.utils.setProperty(source, 'mods.max', oldMaxMods);
}
