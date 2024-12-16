import { CharacterData } from './character';
import { GroupData } from './group';
import { NpcData } from './npc';
import { VehicleData } from './vehicle';

export * as base from './base';
export { CharacterData } from './character';
export { GroupData } from './group';
export { NpcData } from './npc';
export { VehicleData } from './vehicle';

export const config = {
  character: CharacterData,
  npc: NpcData,
  vehicle: VehicleData,
  group: GroupData,
};

declare global {
  interface DataModelConfig {
    Actor: {
      character: typeof CharacterData;
      npc: typeof NpcData;
      vehicle: typeof VehicleData;
      group: typeof GroupData;
    };
  }
}
