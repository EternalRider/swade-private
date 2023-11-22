import { TraitDie } from '../../documents/actor/actor-data-source';

export function ensureStrengthDie(source: any) {
  const strength: TraitDie | undefined = source.attributes?.strength?.die;
  if (!strength || !Object.hasOwn(strength, 'sides')) return; //bail early
  if (typeof strength.sides === 'string' && Number.isNumeric(strength.sides)) {
    strength.sides = Number(strength.sides); // reassign data to numbers if necessary
  }
  //limit the die to a minimum of 1
  strength.sides = Math.max(1, strength.sides);
}

export function ensureCurrencyIsNumeric(source: any) {
  if (!source.details || !Object.hasOwn(source.details, 'currency')) return; // return early in case of update
  if (
    source.details.currency === null ||
    typeof source.details.currency === 'number'
  )
    return;
  if (typeof source.details.currency === 'string') {
    // remove all symbols that aren't numeric or a decimal point
    source.details.currency = Number(
      source.details.currency.replaceAll(/[^0-9.]/g, ''),
    );
  }
}

export function ensureGeneralPowerPoints(source: any) {
  if (!source.powerPoints) return;
  source.powerPoints.general ??= {};

  if (Object.hasOwn(source.powerPoints, 'value')) {
    const value = source.powerPoints.value;
    source.powerPoints.general.value = Number.isNumeric(value)
      ? Number(value)
      : 0;
    delete source.powerPoints.value;
  }

  if (Object.hasOwn(source.powerPoints, 'max')) {
    const max = source.powerPoints.max;
    source.powerPoints.general.max = Number.isNumeric(max) ? Number(max) : 0;
    delete source.powerPoints.max;
  }
}

export function ensurePowerPointsAreNumeric(source: any) {
  if (!source.powerPoints) return;
  for (const [key, pool] of Object.entries<any>(source.powerPoints)) {
    if (key.startsWith('-=') || pool === null) continue; //bail condition for deletions
    pool.value = Number.isNumeric(pool.value) ? Number(pool.value) : 0;
    pool.max = Number.isNumeric(pool.max) ? Number(pool.max) : 0;
  }
}
