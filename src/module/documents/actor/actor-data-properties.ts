import { RollModifier } from '../../../interfaces/additional.interface';
import { Advance } from '../../../interfaces/Advance.interface';
import {
  CharacterDataSourceData,
  VehicleDataSourceData,
} from './actor-data-source';

declare global {
  interface DataConfig {
    Actor: SwadeActorDataProperties;
  }
}

export type SwadeActorDataProperties =
  | SwadeCharacterDataSource
  | SwadeNpcDataSource
  | SwadeVehicleDataSource;

interface SwadeCharacterDataSource {
  data: CharacterDataPropertiesData;
  type: 'character';
}

interface SwadeNpcDataSource {
  data: CharacterDataPropertiesData;
  type: 'npc';
}

interface SwadeVehicleDataSource {
  data: VehicleDataPropertiesData;
  type: 'vehicle';
}

export type CharacterDataPropertiesData = CharacterDataSourceData & {
  stats: {
    speed: {
      adjusted: number;
    };
    scale: number;
    globalMods: {
      trait: RollModifier[];
      agility: RollModifier[];
      smarts: RollModifier[];
      spirit: RollModifier[];
      strength: RollModifier[];
      vigor: RollModifier[];
      attack: RollModifier[];
      damage: RollModifier[];
      ap: RollModifier[];
    };
  };
  details: {
    encumbrance: {
      max: number;
      value: number;
      isEncumbered: boolean;
    };
  };
  advances: {
    list: Collection<Advance>;
  };
};

export type VehicleDataPropertiesData = VehicleDataSourceData & {
  //add derived data here
};
