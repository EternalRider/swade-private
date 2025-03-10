import { BaseEffectData } from './base';
import { ModifierData } from './modifier';

export { BaseEffectData } from './base';

export const config = {
  base: BaseEffectData,
  modifier: ModifierData,
};

declare global {
  interface DataModelConfig {
    ActiveEffect: {
      base: typeof BaseEffectData;
      modifier: typeof ModifierData;
    };
  }
}
