import SwadeItem from '../module/documents/item/SwadeItem';
import { RollModifier } from './additional.interface';

export default interface IRollOptions {
  rof?: number;
  flavour?: string;
  title?: string;
  dmgOverride?: string;
  isHeavyWeapon?: boolean;
  additionalMods?: RollModifier[];
  suppressChat?: boolean;
  isRerollable?: boolean;
  ignoreWounds?: boolean;
  item?: SwadeItem;
  ap?: number;
}
