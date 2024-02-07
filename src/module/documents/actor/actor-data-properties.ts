import {
  DerivedModifier,
  RollModifier,
} from '../../../interfaces/additional.interface';
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
  system: CharacterDataPropertiesData;
  type: 'character';
}

interface SwadeNpcDataSource {
  system: CharacterDataPropertiesData;
  type: 'npc';
}

interface SwadeVehicleDataSource {
  system: VehicleDataPropertiesData;
  type: 'vehicle';
}

export type CharacterDataPropertiesData = CharacterDataSourceData & {
  attributes: {
    agility: {
      effects: RollModifier[];
    };
    smarts: {
      effects: RollModifier[];
    };
    spirit: {
      effects: RollModifier[];
    };
    strength: {
      effects: RollModifier[];
    };
    vigor: {
      effects: RollModifier[];
    };
  };
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
      bennyTrait: RollModifier[];
      bennyDamage: RollModifier[];
    };
    parry: {
      sources: DerivedModifier[];
      effects: DerivedModifier[];
    };
    toughness: {
      sources: DerivedModifier[];
      effects: DerivedModifier[];
      armorEffects: DerivedModifier[];
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
  globalMods: {
    attack: RollModifier[];
    damage: RollModifier[];
    ap: RollModifier[];
  };
};
