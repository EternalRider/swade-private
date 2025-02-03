import { BaseCombat } from './baseCombat';
import { BaseCombatant } from './baseCombatant';
import { Chase } from './chase';
import { DramaticTask } from './dramaticTask';

export { BaseCombat, BaseCombatant, Chase, DramaticTask };

export const combatConfig = {
  base: BaseCombat,
  chase: Chase,
  dramaticTask: DramaticTask,
};

export const combatantConfig = {
  base: BaseCombatant,
};

declare global {
  interface DataModelConfig {
    Combat: {
      base: typeof BaseCombat;
      chase: typeof Chase;
      dramaticTask: typeof DramaticTask;
    };
    Combatant: {
      base: typeof BaseCombatant;
    };
  }
}
