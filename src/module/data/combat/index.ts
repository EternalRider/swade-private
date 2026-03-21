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
      base: typeof BaseCombat<BaseCombat.Schema, BaseCombat.BaseData, BaseCombat.DerivedData>;
      chase: typeof Chase;
      dramaticTask: typeof DramaticTask;
    };
    Combatant: {
      base: typeof BaseCombatantModel<
        BaseCombatantModel.Schema,
        BaseCombatantModel.BaseData,
        BaseCombatantModel.DerivedData
      >;
    };
  }
}
