import { TraitRollModifier } from './additional.interface';

export default interface IRollOptions {
  rof?: number;
  flavour?: string;
  title?: string;
  dmgOverride?: string;
  isHeavyWeapon?: boolean;
  additionalMods?: TraitRollModifier[];
  suppressChat?: boolean;
}
