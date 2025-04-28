import { BaseCombat } from './baseCombat';
import { BaseCombatantModel } from './baseCombatant';
import { BaseCombatantGroupModel } from './baseCombatantGroup';
import { Chase } from './chase';
import { DramaticTask } from './dramaticTask';

export { BaseCombat, BaseCombatantModel as BaseCombatant, Chase, DramaticTask };

export const combatConfig = {
  base: BaseCombat,
  chase: Chase,
  dramaticTask: DramaticTask,
};

export const combatantConfig = {
  base: BaseCombatantModel,
};

export const combatantGroupConfig = {
  base: BaseCombatantGroupModel,
};

declare global {
  interface DataModelConfig {
    Combat: {
      base: typeof BaseCombat;
      chase: typeof Chase;
      dramaticTask: typeof DramaticTask;
    };
    Combatant: {
      base: typeof BaseCombatantModel;
    };
    CombatantGroup: {
      base: typeof BaseCombatantGroupModel;
    };
  }
}
