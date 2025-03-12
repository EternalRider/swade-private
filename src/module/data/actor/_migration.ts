import { constants } from '../../constants';

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

export function migrateDriver(source: any) {
  if (foundry.utils.hasProperty(source, 'driver.id') && !!source.driver.id) {
    foundry.utils.mergeObject(source.crew, {
      members: [{ uuid: source.driver.id, role: constants.CREW_ROLE.OPERATOR }],
    });
    delete source.driver.id;
    Object.defineProperty(source.driver, 'id', {
      configurable: true,
      get: () => {
        foundry.utils.logCompatibilityWarning(
          'The driver.id property has been replaced by the crew member list',
          { since: '4.4', until: '5.1' },
        );
        return source.crew.members.find(
          (m) => m.role === constants.CREW_ROLE.OPERATOR,
        )?.uuid;
      },
    });
  }
}
