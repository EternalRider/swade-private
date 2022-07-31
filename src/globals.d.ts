import { AdditionalStat } from './interfaces/additional.interface';
import { SwadeGame } from './interfaces/SwadeGame.interface';
import { SWADE, SwadeConfig } from './module/config';
import { constants } from './module/constants';
import { Dice3D } from './types/DiceSoNice';

declare global {
  interface Game {
    swade: SwadeGame;
    dice3d?: Dice3D;
  }

  interface LenientGlobalVariableTypes {
    game: never; //type is entirely irrelevant, as long as it is configured
    canvas: never;
    ui: never;
  }

  interface CONFIG {
    SWADE: SwadeConfig;
  }
}

export type AbilitySubType = 'special' | 'race' | 'archetype';

export type ActorMetadata = CompendiumCollection.Metadata & { type: 'Actor' };
export type ItemMetadata = CompendiumCollection.Metadata & { type: 'Item' };
export type CardMetadata = CompendiumCollection.Metadata & { type: 'Card' };
export type JournalMetadata = CompendiumCollection.Metadata & {
  type: 'JournalEntry';
};

export type Attribute = keyof typeof SWADE.attributes;
export type LinkedAttribute = Attribute | '';
export type AdditionalStats = Record<string, AdditionalStat>;
export type EquipState = ValueOf<typeof constants.EQUIP_STATE>;
