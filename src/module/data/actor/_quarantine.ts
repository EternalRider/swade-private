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
