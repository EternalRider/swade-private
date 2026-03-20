import type { ValueOf } from 'fvtt-types/utils';
import { SwadeGame } from './interfaces/SwadeGame.interface';
import {
  AdditionalStat,
  ItemAction,
  RollModifier,
} from './interfaces/additional.interface';
import { AuraPointSource } from './module/canvas/AuraPointSource';
import { SWADE, SwadeConfig } from './module/config';
import { constants } from './module/constants';
import { Dice3D } from './types/DiceSoNice';
import { TraitRoll } from './module/dice/TraitRoll';
import IRollOptions from './interfaces/RollOptions.interface';

declare global {
  interface Game {
    swade: SwadeGame;
    dice3d?: Dice3D;
  }

  interface AssumeHookRan {
    ready: never;
  }

  interface CONFIG {
    SWADE: SwadeConfig;
  }

  namespace CONFIG {
    interface SpecialStatusEffects extends CONFIG.DefaultSpecialStatusEffects {
      COLDBODIED: string;
      INCAPACITATED: string;
    }

    interface AuraCanvas extends CONFIG.Canvas {
      auras: {
        collection: foundry.utils.Collection<AuraPointSource>;
        filter: VisualEffectsMaskingFilter;
      };
    }
  }
}

export interface CanvasDropData
  extends
    foundry.abstract.Document.DropData<foundry.abstract.Document.Any>,
    foundry.abstract.Document.DropData.UUID,
    Canvas.DropPosition {}

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
export type ChargeRechargeType = ValueOf<typeof constants.CHARGE_RECHARGE_TYPE>;
export type AbilitySubType = ValueOf<typeof constants.ABILITY_TYPE>;
export type AdditionalStatType = ValueOf<
  typeof constants.ADDITIONAL_STATS_TYPE
>;

export type PotentialSource<T extends {}> = T & Record<string | number, any>;

export type PhysicalItem =
  | 'weapon'
  | 'armor'
  | 'shield'
  | 'consumable'
  | 'gear';

export interface DieSidesOption {
  key: number;
  label: string;
}

export interface SwadeApplicationTab
  extends foundry.applications.api.ApplicationV2.Tab {
  tabCssClass: string;
}

export interface SwadeDocumentSheetConfiguration<
  Document extends foundry.abstract.Document.Any,
> extends foundry.applications.api.DocumentSheetV2.Configuration<Document> {
  dragDrop: DragDrop.Configuration[];
}

declare module 'fvtt-types/configuration' {
  namespace Hooks {
    interface HookConfig {
      /**
       * A hook for modules to adjust the display of actor embeds
       * @param embed     The embedded content to mutate
       * @param actor     The actor being embedded
       * @param config    Configuration passed to the embed call
       * @param options   Options passed to the enrichment call
       */
      swadeActorEmbed(
        embed: HTMLElement | HTMLCollection,
        actor: Actor.Implementation,
        config: foundry.applications.ux.TextEditor.DocumentHTMLEmbedConfig,
        options: foundry.applications.ux.TextEditor.EnrichmentOptions
      ): void;

      /**
       * A hook event that is fired after an actor has been awarded a benny
       * @param actor  The actor that received the benny
       */
      swadeGetBenny(actor: Actor.Implementation): void;

      /**
       * A hook event that is fired after the system has completed its data preparation and allows modules to adjust the derived data afterwards
       * @param actor  The actor whose data is being prepared
       */
      swadeActorPrepareDerivedData(actor: Actor.Implementation): void;

      /**
       * A hook event that is fired before an attribute is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
       * Returning `false` in a hook callback will cancel the roll entirely
       * @param actor       The actor that rolls the attribute
       * @param attribute   The name of the attribute, in lower case
       * @param roll        The built base roll, without any modifiers
       * @param modifiers   An array of modifiers which are to be added to the roll
       * @param options     The options passed into the roll function
       */
      swadePreRollAttribute(
        actor: Actor.Implementation,
        attribute: string,
        roll: TraitRoll,
        modifiers: RollModifier[],
        options: IRollOptions
      ): boolean | void;

      /**
       * A hook event that is fired after an attribute is rolled
       * @param actor           The actor that rolls the attribute
       * @param attribute       The name of the attribute, in lower case
       * @param roll            The built base roll, without any modifiers
       * @param modifiers       An array of modifiers which are to be added to the roll
       * @param options         The options passed into the roll function
       */
      swadeRollAttribute(
        actor: Actor.Implementation,
        attribute: string,
        roll: TraitRoll,
        modifiers: RollModifier[],
        options: IRollOptions
      ): void;

      /**
       * A hook event that is fired before a skill is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
       * Returning `false` in a hook callback will cancel the roll entirely
       * @param actor       The actor that rolls the skill
       * @param skill       The Skill item that is being rolled
       * @param roll        The built base roll, without any modifiers
       * @param modifiers   An array of modifiers which are to be added to the roll
       * @param options     The options passed into the roll function
       */
      swadePreRollSkill(
        actor: Actor.Implementation,
        skill: Item.OfType<'skill'>,
        roll: TraitRoll,
        modifiers: RollModifier[],
        options: IRollOptions
      ): boolean | void;

      /**
       * A hook event that is fired after a skill is rolled
       * @param actor       The actor that rolls the skill
       * @param skill       The Skill item that is being rolled
       * @param roll        The built base roll, without any modifiers
       * @param modifiers   An array of modifiers which are to be added to the roll
       * @param options     The options passed into the roll function
       */
      swadeRollSkill(
        actor: Actor.Implementation,
        skill: Item.OfType<'skill'>,
        roll: TraitRoll,
        modifiers: RollModifier[],
        options: IRollOptions
      ): void;

      /**
       * A hook event that is fired after an actor spends a Benny
       * @param actor   The actor that spent the benny
       */
      swadeSpendBenny(actor: Actor.Implementation): void;
    }
  }
}
