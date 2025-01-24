import { BaseCombat } from './baseCombat';
import { DramaticTask } from './dramaticTask';
import { Chase } from './chase';
import { BaseCombatant } from './baseCombatant';

export { BaseCombat, Chase, DramaticTask, BaseCombatant };

export const combatConfig = {
  base: BaseCombat,
  chase: Chase,
  dt: DramaticTask,
};

export const combatantConfig = {
  base: BaseCombatant,
};

declare global {
  interface DataModelConfig {
    Combat: {
      base: typeof BaseCombat;
      chase: typeof Chase;
      dt: typeof DramaticTask;
    };
    Combatant: {
      base: typeof BaseCombatant;
    };
  }
}
