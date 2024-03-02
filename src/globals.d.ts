import { AdditionalStat, ItemAction } from './interfaces/additional.interface';
import { SwadeGame } from './interfaces/SwadeGame.interface';
import { AuraPointSource } from './module/canvas/AuraPointSource';
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
    Canvas: {
      auras: {
        collection: foundry.utils.Collection<AuraPointSource>;
        filter: VisualEffectsMaskingFilter;
      };
    };
  }
}

export interface HotReloadData {
  packageType: string;
  packageId: string;
  content: string;
  path: string;
  extension: string;
}

export type ActorMetadata = CompendiumCollection.Metadata & { type: 'Actor' };
export type ItemMetadata = CompendiumCollection.Metadata & { type: 'Item' };
export type CardMetadata = CompendiumCollection.Metadata & { type: 'Card' };
export type JournalMetadata = CompendiumCollection.Metadata & {
  type: 'JournalEntry';
};

export type Attribute = keyof typeof SWADE.attributes;
export type LinkedAttribute = Attribute | '';
export type AdditionalStats = Record<string, AdditionalStat>;
export type ItemActions = Record<string, ItemAction>;
export type Updates = Record<string, unknown>;

export type EquipState = ValueOf<typeof constants.EQUIP_STATE>;
export type ReloadType = ValueOf<typeof constants.RELOAD_TYPE>;
export type ConsumableType = ValueOf<typeof constants.CONSUMABLE_TYPE>;
export type ActionType = ValueOf<typeof constants.ACTION_TYPE>;
export type AbilitySubType = ValueOf<typeof constants.ABILITY_TYPE>;
export type AdditionalStatType = ValueOf<
  typeof constants.ADDITIONAL_STATS_TYPE
>;

export type PotentialSource<T extends {}> = T & { [key: string | number]: any };

export interface DieSidesOption {
  key: number;
  label: string;
}
