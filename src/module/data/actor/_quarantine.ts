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
  if (
    !Object.hasOwn(source.powerPoints, 'value') ||
    !Object.hasOwn(source.powerPoints, 'max')
  )
    return;
  source.powerPoints.general = {
    value: source.powerPoints.value,
    max: source.powerPoints.max,
  };
  delete source.powerPoints.value;
  delete source.powerPoints.max;
}
