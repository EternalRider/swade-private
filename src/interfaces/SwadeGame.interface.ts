import ActiveEffectWizard from '../module/apps/ActiveEffectWizard';
import { AdvanceEditor } from '../module/apps/AdvanceEditor';
import AttributeManager from '../module/apps/AttributeManager';
import CompendiumTOC from '../module/apps/CompendiumTOC';
import RollDialog from '../module/apps/RollDialog';
import SettingConfigurator from '../module/apps/SettingConfigurator';
import SwadeDocumentTweaks from '../module/apps/SwadeDocumentTweaks';
import CharacterSummarizer from '../module/CharacterSummarizer';
import Benny from '../module/dice/Benny';
import WildDie from '../module/dice/WildDie';
import SwadeActiveEffect from '../module/documents/SwadeActiveEffect';
import ItemChatCardHelper from '../module/ItemChatCardHelper';
import * as migrations from '../module/migration';
import CharacterSheet from '../module/sheets/official/CharacterSheet';
import SwadeItemSheetV2 from '../module/sheets/SwadeItemSheetV2';
import SwadeNPCSheet from '../module/sheets/SwadeNPCSheet';
import SwadeVehicleSheet from '../module/sheets/SwadeVehicleSheet';
import SwadeSocketHandler from '../module/SwadeSocketHandler';
import { getStatusEffectDataById, rollItemMacro } from '../module/util';

export interface SwadeGame {
  sheets: {
    CharacterSheet: typeof CharacterSheet;
    SwadeNPCSheet: typeof SwadeNPCSheet;
    SwadeVehicleSheet: typeof SwadeVehicleSheet;
    SwadeItemSheetV2: typeof SwadeItemSheetV2;
  };
  apps: {
    SwadeDocumentTweaks: typeof SwadeDocumentTweaks;
    AdvanceEditor: typeof AdvanceEditor;
    SettingConfigurator: typeof SettingConfigurator;
    CompendiumTOC: typeof CompendiumTOC;
    AttributeManager: typeof AttributeManager;
    ActiveEffectWizard: typeof ActiveEffectWizard;
  };
  dice: {
    Benny: typeof Benny;
    WildDie: typeof WildDie;
  };
  util: {
    getStatusEffectDataById: typeof getStatusEffectDataById;
  };
  CharacterSummarizer: typeof CharacterSummarizer;
  RollDialog: typeof RollDialog;
  sockets: SwadeSocketHandler;
  rollItemMacro: typeof rollItemMacro;
  migrations: typeof migrations;
  itemChatCardHelper: typeof ItemChatCardHelper;
  effectCallbacks: Collection<StatusEffectCallback>;
  ready: boolean;
}

export type StatusEffectCallback = (effect: SwadeActiveEffect) => Promise<void>;
