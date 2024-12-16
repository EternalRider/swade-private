import { BaseEffectData } from './base';

export { BaseEffectData } from './base';

export const config = {
  base: BaseEffectData,
};

declare global {
  interface DataModelConfig {
    ActiveEffect: {
      base: typeof BaseEffectData;
    };
  }
}
