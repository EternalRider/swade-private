import { ACTIVE_EFFECT_MODES } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/constants.mjs';
import { ActionType, AdditionalStatType } from '../globals';
import { constants } from '../module/constants';
import { ValueOf } from '@league-of-foundry-developers/foundry-vtt-types/utils';

export interface PrototypeAdditionalStat {
  dtype: AdditionalStatType;
  hasMaxValue: boolean;
  label: string;
  optionString?: string;
}
export interface AdditionalStat extends PrototypeAdditionalStat {
  key?: string;
  useField?: boolean;
  value?: string | number | boolean;
  max?: string | number;
  modifier?: string;
  options?: Record<string, string>;
}

export interface ItemAction {
  name: string;
  type: ActionType;
  /** how many dice are rolled, only relevant for `trait` actions */
  dice?: number;
  /** how many resources are used */
  resourcesUsed?: number;
  modifier?: string;
  /** Use this value instead of the item default, only relevant for `trait` and `damage` actions */
  override?: string;
  isHeavyWeapon?: boolean;
  uuid?: string;
  macroActor?: string;
  /** Armor Piercing */
  ap?: number;
}

export interface LimitedUse {
  name: string;
  rechargeType: LimitedUseRechargeType;
  remaining?: number;
  max?: number;
  rechargeAmount?: FormulaField;
}

/** A single trait roll modifier, containing a label and a value */
export interface RollModifier {
  /** The label of the modifier. Used in the hooks and for display */
  label: string;
  /** The value for the modifier. Can be an integer number or a a string, for example for dice expressions */
  value: string | number;
  /** An optional boolean that flags whether the modifier should be ignored and removed before the roll is evaluated */
  ignore?: boolean;
  /** Necessary for finding RollModifiers in the Skill.effects[] array */
  effectID?: string;
}

/** A trait roll modifier group, used in the RollDialog */
export interface RollModifierGroup {
  /** The name of the group */
  name: string;
  /** The array of possible modifiers in the group */
  modifiers: RollModifier[];
  /** Eligible roll types from constants.ts */
  rollType: ValueOf<typeof constants.ROLL_TYPE>;
}
/** Modifiers for derived stats like Parry and Toughness */
export interface DerivedModifier {
  /** The name of the modifier */
  label: string;
  /** The value of the modifier */
  value: number;
  /** For modifiers from active effects
   *  CUSTOM: 0;
   *  MULTIPLY: 1;
   *  ADD: 2;
   *  DOWNGRADE: 3;
   *  UPGRADE: 4;
   *  OVERRIDE: 5;
   */
  mode?: ValueOf<typeof ACTIVE_EFFECT_MODES>;
}
