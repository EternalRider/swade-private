export interface PrototypeAdditionalStat {
  dtype: 'String' | 'Number' | 'Boolean' | 'Die' | 'Selection';
  hasMaxValue: boolean;
  label: string;
  optionString?: string;
}
export interface AdditionalStat extends PrototypeAdditionalStat {
  key?: string;
  useField?: boolean;
  value?: string | number;
  max?: string | number;
  modifier?: string;
  options?: Record<string, string>;
}

export interface ItemAction {
  name: string;
  type: 'skill' | 'damage' | 'resist';
  rof?: number;
  shotsUsed?: number;
  skillMod?: string;
  skillOverride?: string;
  dmgMod?: string;
  dmgOverride?: string;
  isHeavyWeapon?: boolean;
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
  rollType: number;
}