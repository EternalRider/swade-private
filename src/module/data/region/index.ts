import { AttackModifiersRegionBehaviorType } from './attackModifiers';

export { AttackModifiersRegionBehaviorType } from './attackModifiers';

export const config = {
  attackModifiers: AttackModifiersRegionBehaviorType
};

declare global {
  interface DataModelConfig {
    RegionBehavior: {
      attackModifiers: typeof AttackModifiersRegionBehaviorType
    };
  }
}