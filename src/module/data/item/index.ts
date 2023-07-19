import { AbilityData } from './ability';
import { ActionData } from './action';
import { ArmorData } from './armor';
import { ConsumableData } from './consumable';
import { EdgeData } from './edge';
import { GearData } from './gear';
import { HindranceData } from './hindrance';
import { PowerData } from './power';
import { ShieldData } from './shield';
import { SkillData } from './skill';
import { WeaponData } from './weapon';

export { AbilityData } from './ability';
export { ActionData } from './action';
export { ArmorData } from './armor';
export { ConsumableData } from './consumable';
export { EdgeData } from './edge';
export { GearData } from './gear';
export { HindranceData } from './hindrance';
export { PowerData } from './power';
export { ShieldData } from './shield';
export { SkillData } from './skill';
export { WeaponData } from './weapon';

export const config = {
  ability: AbilityData,
  action: ActionData,
  armor: ArmorData,
  consumable: ConsumableData,
  edge: EdgeData,
  gear: GearData,
  hindrance: HindranceData,
  power: PowerData,
  shield: ShieldData,
  skill: SkillData,
  weapon: WeaponData,
};

declare global {
  interface SystemConfig {
    Item: {
      ability: AbilityData;
      action: ActionData;
      armor: ArmorData;
      consumable: ConsumableData;
      edge: EdgeData;
      gear: GearData;
      hindrance: HindranceData;
      power: PowerData;
      shield: ShieldData;
      skill: SkillData;
      weapon: WeaponData;
    };
  }
}
