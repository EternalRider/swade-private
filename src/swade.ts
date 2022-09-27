import { AdvanceEditor } from './module/apps/AdvanceEditor';
import RollDialog from './module/apps/RollDialog';
import SettingConfigurator from './module/apps/SettingConfigurator';
import SwadeDocumentTweaks from './module/apps/SwadeDocumentTweaks';
import CharacterSummarizer from './module/CharacterSummarizer';
import { SWADE } from './module/config';
import DetectionModeInfravision from './module/vision';
import Benny from './module/dice/Benny';
import WildDie from './module/dice/WildDie';
import SwadeActor from './module/documents/actor/SwadeActor';
import SwadeItem from './module/documents/item/SwadeItem';
import SwadeActiveEffect from './module/documents/SwadeActiveEffect';
import SwadeCards from './module/documents/SwadeCards';
import SwadeCombat from './module/documents/SwadeCombat';
import SwadeCombatant from './module/documents/SwadeCombatant';
import SwadeMeasuredTemplate from './module/documents/SwadeMeasuredTemplate';
import SwadeUser from './module/documents/SwadeUser';
import { registerEffectCallbacks } from './module/effectCallbacks';
import { registerCustomHelpers } from './module/handlebarsHelpers';
import SwadeCoreHooks from './module/hooks/SwadeCoreHooks';
import SwadeIntegrationHooks from './module/hooks/SwadeIntegrationHooks';
import ItemChatCardHelper from './module/ItemChatCardHelper';
import { registerKeybindings } from './module/keybindings';
import { Logger } from './module/Logger';
import * as migrations from './module/migration';
import { preloadHandlebarsTemplates } from './module/preloadTemplates';
import {
  register3DBennySettings,
  registerSettingRules,
  registerSettings,
} from './module/settings';
import CharacterSheet from './module/sheets/official/CharacterSheet';
import SwadeItemSheet from './module/sheets/SwadeItemSheet';
import SwadeItemSheetV2 from './module/sheets/SwadeItemSheetV2';
import SwadeNPCSheet from './module/sheets/SwadeNPCSheet';
import SwadeVehicleSheet from './module/sheets/SwadeVehicleSheet';
import SwadeCombatTracker from './module/sidebar/SwadeCombatTracker';
import SwadeSocketHandler from './module/SwadeSocketHandler';
import { deepFreeze, rollItemMacro } from './module/util';
import './swade.scss';

/* ------------------------------------ */
/* Initialize system					          */
/* ------------------------------------ */
Hooks.once('init', () => {
  Logger.info(`Initializing Savage Worlds Adventure Edition\n${SWADE.ASCII}`);

  //Record Configuration Values
  CONFIG.SWADE = SWADE;
  //freeze the constants
  deepFreeze(CONFIG.SWADE.CONST);

  //set up global game object
  game.swade = {
    sheets: {
      CharacterSheet,
      SwadeItemSheet,
      SwadeItemSheetV2,
      SwadeNPCSheet,
      SwadeVehicleSheet,
    },
    apps: {
      SwadeDocumentTweaks,
      AdvanceEditor,
      SettingConfigurator,
    },
    dice: {
      Benny,
      WildDie,
    },
    rollItemMacro,
    sockets: new SwadeSocketHandler(),
    migrations: migrations,
    itemChatCardHelper: ItemChatCardHelper,
    CharacterSummarizer,
    RollDialog,
    effectCallbacks: new Collection(),
  };

  //register custom Handlebars helpers
  registerCustomHelpers();

  //register document classes
  CONFIG.Actor.documentClass = SwadeActor;
  CONFIG.Item.documentClass = SwadeItem;
  CONFIG.Combat.documentClass = SwadeCombat;
  CONFIG.Combatant.documentClass = SwadeCombatant;
  CONFIG.ActiveEffect.documentClass = SwadeActiveEffect;
  CONFIG.User.documentClass = SwadeUser;
  CONFIG.Cards.documentClass = SwadeCards;

  //register custom object classes
  CONFIG.MeasuredTemplate.objectClass = SwadeMeasuredTemplate;

  //register custom sidebar tabs
  CONFIG.ui.combat = SwadeCombatTracker;

  //set up round timers to 6 seconds
  CONFIG.time.roundTime = 6;

  //register card presets
  CONFIG.Cards.presets = {
    pokerLight: {
      label: 'SWADE.ActionDeckPresetLight',
      src: 'systems/swade/cards/action-deck-light.json',
      type: 'deck',
    },
    pokerDark: {
      label: 'SWADE.ActionDeckPresetDark',
      src: 'systems/swade/cards/action-deck-dark.json',
      type: 'deck',
    },
  };

  //register custom status effects
  CONFIG.statusEffects = foundry.utils.deepClone(SWADE.statusEffects);
  CONFIG.specialStatusEffects.COLDBODIED = 'cold-bodied'

  //register detection modes
  CONFIG.Canvas.detectionModes.seeInfravision = new DetectionModeInfravision({
    id: "seeInfravision",
    label: "DETECTION.SeeInfravision",
    type: DetectionMode.DETECTION_TYPES.SIGHT
  })
  CONFIG.Canvas.detectionModes.senseInfravision = new DetectionModeInfravision({
    id: "senseInfravision",
    label: "DETECTION.SenseInfravision",
    walls: false,
    type: DetectionMode.DETECTION_TYPES.OTHER
  }),

  //@ts-expect-error Types don't properly recognize dotnotation
  CONFIG.Actor.compendiumIndexFields.push('system.wildcard');

  //Preload Handlebars templates
  preloadHandlebarsTemplates();

  // Register custom system settings
  registerSettings();
  registerSettingRules();
  register3DBennySettings();

  //register keyboard shortcuts
  registerKeybindings();

  registerEffectCallbacks();

  // Register sheets
  Actors.unregisterSheet('core', ActorSheet);
  Items.unregisterSheet('core', ItemSheet);

  Actors.registerSheet('swade', CharacterSheet, {
    types: ['character'],
    makeDefault: true,
    label: 'SWADE.OfficialSheet',
  });
  Actors.registerSheet('swade', SwadeNPCSheet, {
    types: ['npc'],
    makeDefault: true,
    label: 'SWADE.CommunityNPCSheet',
  });
  Actors.registerSheet('swade', SwadeVehicleSheet, {
    types: ['vehicle'],
    makeDefault: true,
    label: 'SWADE.CommunityVicSheet',
  });
  Items.registerSheet('swade', SwadeItemSheetV2, {
    makeDefault: true,
    label: 'SWADE.ItemSheet',
  });
  Items.registerSheet('swade', SwadeItemSheet, {
    makeDefault: false,
    label: 'SWADE.CommunityItemSheet',
    types: [
      'weapon',
      'armor',
      'shield',
      'gear',
      'skill',
      'edge',
      'hindrance',
      'ability',
      'power',
    ],
  });

  CONFIG.Dice.terms.b = Benny;
});

Hooks.once('setup', SwadeCoreHooks.onSetup);
Hooks.once('ready', SwadeCoreHooks.onReady);
Hooks.on('preCreateItem', SwadeCoreHooks.onPreCreateItem);
Hooks.on('getSceneControlButtons', SwadeCoreHooks.onGetSceneControlButtons);
Hooks.on('dropActorSheetData', SwadeCoreHooks.onDropActorSheetData);
Hooks.on('hotbarDrop', SwadeCoreHooks.onHotbarDrop);

/* ------------------------------------ */
/* Application Render					          */
/* ------------------------------------ */
Hooks.on('renderCombatantConfig', SwadeCoreHooks.onRenderCombatantConfig);
Hooks.on('renderActiveEffectConfig', SwadeCoreHooks.onRenderActiveEffectConfig);
Hooks.on('renderCompendium', SwadeCoreHooks.onRenderCompendium);
Hooks.on('renderChatMessage', SwadeCoreHooks.onRenderChatMessage);
Hooks.on('renderPlayerList', SwadeCoreHooks.onRenderPlayerList);
Hooks.on('renderUserConfig', SwadeCoreHooks.onRenderUserConfig);

/* ------------------------------------ */
/* Sidebar Tab Render					          */
/* ------------------------------------ */
Hooks.on('renderActorDirectory', SwadeCoreHooks.onRenderActorDirectory);
Hooks.on('renderSettings', SwadeCoreHooks.onRenderSettings);
Hooks.on('renderCombatTracker', SwadeCoreHooks.onRenderCombatTracker);
Hooks.on('renderChatLog', SwadeCoreHooks.onRenderChatLog);
Hooks.on('renderChatPopout', SwadeCoreHooks.onRenderChatLog);

/* ------------------------------------ */
/* Context Options    				          */
/* ------------------------------------ */
Hooks.on('getUserContextOptions', SwadeCoreHooks.onGetUserContextOptions);
Hooks.on('getActorEntryContext', SwadeCoreHooks.onGetCombatTrackerEntryContext);
Hooks.on('getChatLogEntryContext', SwadeCoreHooks.onGetChatLogEntryContext);
Hooks.on(
  'getActorDirectoryEntryContext',
  SwadeCoreHooks.onGetActorDirectoryEntryContext,
);
Hooks.on(
  'getCombatTrackerEntryContext',
  SwadeCoreHooks.onGetCombatTrackerEntryContext,
);
Hooks.on(
  'getCardsDirectoryEntryContext',
  SwadeCoreHooks.onGetCardsDirectoryEntryContext,
);
Hooks.on(
  'getCompendiumDirectoryEntryContext',
  SwadeCoreHooks.onGetCompendiumDirectoryEntryContext,
);

/* ------------------------------------ */
/* Third Party Integrations		          */
/* ------------------------------------ */

/** Dice So Nice*/
Hooks.once('diceSoNiceInit', SwadeIntegrationHooks.onDiceSoNiceInit);
Hooks.once('diceSoNiceReady', SwadeIntegrationHooks.onDiceSoNiceReady);

/** Developer Mode */
Hooks.once('devModeReady', SwadeIntegrationHooks.onDevModeReady);
