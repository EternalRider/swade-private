import { CharacterData } from './character';
import { NpcData } from './npc';
import { VehicleData } from './vehicle';

export { CharacterData } from './character';
export { NpcData } from './npc';
export { VehicleData } from './vehicle';

export const config = {
  character: CharacterData,
  npc: NpcData,
  vehicle: VehicleData,
};

declare global {
  interface DataModelConfig {
    Actor: {
      character: CharacterData;
      npc: NpcData;
      vehicle: VehicleData;
    };
  }
}
