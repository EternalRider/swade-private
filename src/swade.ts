import type { ArtworkMapping } from './interfaces/ArtworkMapping.interface';
import type { SwadeGame } from './interfaces/SwadeGame.interface';
import CharacterSummarizer from './module/CharacterSummarizer';
import ItemChatCardHelper from './module/ItemChatCardHelper';
import { Logger } from './module/Logger';
import SwadeSocketHandler from './module/SwadeSocketHandler';
import ActiveEffectWizard from './module/apps/ActiveEffectWizard';
import { AdvanceEditor } from './module/apps/AdvanceEditor';
import AttributeManager from './module/apps/AttributeManager';
import { CompendiumTOC } from './module/apps/CompendiumTOC';
import { RollDialog } from './module/apps/RollDialog';
import SettingConfigurator from './module/apps/SettingConfigurator';
import {
  SwadeActorTweaks,
  SwadeDocumentTweaks,
  SwadeItemTweaks,
} from './module/apps/SwadeDocumentTweaks';
import SwadeMeasuredTemplate from './module/canvas/SwadeMeasuredTemplate';
import SwadeToken from './module/canvas/SwadeToken';
import { SWADE } from './module/config';
import * as data from './module/data';
import Benny from './module/dice/Benny';
import { DamageRoll } from './module/dice/DamageRoll';
import { SwadeRoll } from './module/dice/SwadeRoll';
import { TraitRoll } from './module/dice/TraitRoll';
import WildDie from './module/dice/WildDie';
import SwadeUser from './module/documents/SwadeUser';
import SwadeActiveEffect from './module/documents/active-effect/SwadeActiveEffect';
import SwadeActor from './module/documents/actor/SwadeActor';
import SwadeCards from './module/documents/card/SwadeCards';
import SwadeChatMessage from './module/documents/chat/SwadeChatMessage';
import SwadeCombat from './module/documents/combat/SwadeCombat';
import SwadeCombatant from './module/documents/combat/SwadeCombatant';
import SwadeItem from './module/documents/item/SwadeItem';
import { registerEffectCallbacks } from './module/effectCallbacks';
import { registerCustomHelpers } from './module/handlebarsHelpers';
import { registerAuraHooks } from './module/hooks/AuraHooks';
import SwadeCoreHooks from './module/hooks/SwadeCoreHooks';
import SwadeIntegrationHooks from './module/hooks/SwadeIntegrationHooks';
import { rollItemMacro } from './module/hooks/hotbarDrop';
import { registerKeybindings } from './module/keybindings';
import * as migrations from './module/migration/migration';
import { preloadHandlebarsTemplates } from './module/preloadTemplates';
import {
  register3DBennySettings,
  registerSettingRules,
  registerSettings,
} from './module/settings';
import CharacterSheet from './module/sheets/CharacterSheet';
import { GroupSheet } from './module/sheets/GroupSheet';
import SwadeItemSheetV2 from './module/sheets/SwadeItemSheetV2';
import SwadeNPCSheet from './module/sheets/SwadeNPCSheet';
import SwadeTokenConfig from './module/sheets/SwadeTokenConfig';
import SwadeVehicleSheetV2 from './module/sheets/VehicleSheetV2';
import JournalHeadquartersPageSheet from './module/sheets/journal/JournalHeadquartersPageSheet';
import SwadeChatLog from './module/sidebar/SwadeChatLog';
import SwadeCombatTracker from './module/sidebar/SwadeCombatTracker';
import SwadeTour from './module/tours/SwadeTour';
import registerSWADETours from './module/tours/registration';
import {
  deepFreeze,
  getItemsBySwid,
  getStatusEffectDataById,
  slugify,
} from './module/util';
import DetectionModeInfravision from './module/vision/DetectionModeInfravision';
import { InfravisionBackgroundVisionShader } from './module/vision/InfravisionBackgroundVisionShader';
import './swade.scss';

const swadeAPI: SwadeGame = {
  sheets: {
    CharacterSheet,
    SwadeItemSheetV2,
    SwadeNPCSheet,
    SwadeVehicleSheetV2,
  },
  apps: {
    SwadeDocumentTweaks,
    SwadeActorTweaks,
    SwadeItemTweaks,
    AdvanceEditor,
    SettingConfigurator,
    CompendiumTOC,
    AttributeManager,
    ActiveEffectWizard,
  },
  dice: {
    Benny,
    WildDie,
  },
  util: {
    getStatusEffectDataById,
    slugify,
    getItemsBySwid,
  },
  compendiumArt: {
    map: new Map<string, ArtworkMapping>(),
  },
  rollItemMacro,
  sockets: new SwadeSocketHandler(),
  migrations: migrations,
  itemChatCardHelper: ItemChatCardHelper,
  CharacterSummarizer,
  RollDialog,
  effectCallbacks: new Collection(),
  ready: false,
  data,
  SwadeTour,
};

globalThis.swade = swadeAPI;

/* ------------------------------------ */
/* Initialize system					          */
/* ------------------------------------ */
Hooks.once('init', () => {
  Logger.info(`Initializing Savage Worlds Adventure Edition\n${SWADE.ASCII}`);

  //Record Configuration Values
  CONFIG.SWADE = SWADE;
  //freeze the constants
  deepFreeze(CONFIG.SWADE.CONST);

  // Initialize socket handler
  swadeAPI.sockets.registerSocketListeners();

  //set up global game object
  game.swade = swadeAPI;

  //register document classes
  CONFIG.Actor.documentClass = SwadeActor;
  CONFIG.Item.documentClass = SwadeItem;
  CONFIG.Combat.documentClass = SwadeCombat;
  CONFIG.Combatant.documentClass = SwadeCombatant;
  CONFIG.ActiveEffect.documentClass = SwadeActiveEffect;
  CONFIG.User.documentClass = SwadeUser;
  CONFIG.Cards.documentClass = SwadeCards;
  CONFIG.ChatMessage.documentClass = SwadeChatMessage;

  //register System Data Model
  CONFIG.Actor.dataModels = data.actor.config;
  CONFIG.Item.dataModels = data.item.config;
  CONFIG.JournalEntryPage.dataModels = data.journal.config;
  CONFIG.Card.dataModels = data.card.config;
  CONFIG.ChatMessage.dataModels = data.chat.config;
  CONFIG.ActiveEffect.dataModels = data.effect.config;
  CONFIG.Combat.dataModels = data.combat.combatConfig;
  CONFIG.Combatant.dataModels = data.combat.combatantConfig;
  CONFIG.CombatantGroup.dataModels = data.combat.combatantGroupConfig;

  //register custom object classes
  CONFIG.MeasuredTemplate.objectClass = SwadeMeasuredTemplate;
  // SWADE's default cone template is a very special case that we're storing at angle===0
  // This preserves access to the other types of cone definitions
  CONFIG.MeasuredTemplate.defaults.angle = 0;
  CONFIG.Token.objectClass = SwadeToken;

  // Increase initiative decimal precision, as we add/subtract tiny amounts for holding, interrupting etc.
  if (CONFIG.Combat.initiative.decimals < 7)
    CONFIG.Combat.initiative.decimals = 7;

  //register custom sidebar tabs
  CONFIG.ui.combat = SwadeCombatTracker;
  CONFIG.ui.chat = SwadeChatLog;

  //set up round timers to 6 seconds
  CONFIG.time.roundTime = 6;

  //register card presets
  CONFIG.Cards.presets = {
    actionDeck: {
      label: 'SWADE.ActionDeckPresetPEG',
      src: 'systems/swade/cards/action-deck-peg.json',
      type: 'deck',
    },
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
  Object.assign(CONFIG.specialStatusEffects, {
    COLDBODIED: 'cold-bodied',
    INCAPACITATED: 'incapacitated',
    BURROW: 'burrowing',
    FLY: 'flying',
  });

  // v11 Active Effect handling
  CONFIG.ActiveEffect.legacyTransferral = false;

  //register detection modes
  CONFIG.Canvas.detectionModes.seeHeat = new DetectionModeInfravision({
    id: 'seeHeat',
    label: 'SWADE.Vision.SeeHeat',
    type: foundry.canvas.perception.DetectionMode.DETECTION_TYPES.OTHER,
  });
  CONFIG.Canvas.detectionModes.senseHeat = new DetectionModeInfravision({
    id: 'senseHeat',
    label: 'SWADE.Vision.SenseHeat',
    walls: false,
    type: foundry.canvas.perception.DetectionMode.DETECTION_TYPES.OTHER,
  });

  CONFIG.Canvas.visionModes.infraVision =
    new foundry.canvas.perception.VisionMode({
      id: 'infraVision',
      label: 'SWADE.Vision.Infravision',
      canvas: {
        shader: foundry.canvas.rendering.shaders.ColorAdjustmentsSamplerShader,
        uniforms: {
          saturation: -0.5,
          tint: InfravisionBackgroundVisionShader.COLOR_TINT,
        },
      },
      lighting: {
        background: {
          visibility:
            foundry.canvas.perception.VisionMode.LIGHTING_VISIBILITY.DISABLED,
        },
        illumination: {
          visibility:
            foundry.canvas.perception.VisionMode.LIGHTING_VISIBILITY.DISABLED,
        },
        coloration: {
          visibility:
            foundry.canvas.perception.VisionMode.LIGHTING_VISIBILITY.DISABLED,
        },
      },
      vision: {
        darkness: { adaptive: false },
        defaults: {
          attenuation: 0,
          brightness: 0.5,
          saturation: -0.5,
          contrast: 0,
        },
        background: { shader: InfravisionBackgroundVisionShader },
      },
    });

  CONFIG.Actor.compendiumIndexFields.push('system.wildcard');
  CONFIG.Item.compendiumIndexFields.push('system.swid');

  // @ts-expect-error Yes we're calling a protected function
  foundry.appv1.sheets.JournalTextPageSheet._converter.setOption(
    'tables',
    true,
  );

  //register custom Handlebars helpers
  registerCustomHelpers();
  //Preload Handlebars templates
  preloadHandlebarsTemplates();

  // Register custom system settings
  registerSettings();
  registerSettingRules();
  register3DBennySettings();

  //register keyboard shortcuts
  registerKeybindings();

  registerEffectCallbacks();
  registerAuraHooks();

  // Register sheets
  foundry.documents.collections.Actors.unregisterSheet(
    'core',
    foundry.appv1.sheets.ActorSheet,
  );
  foundry.documents.collections.Items.unregisterSheet(
    'core',
    foundry.appv1.sheets.ItemSheet,
  );
  foundry.applications.apps.DocumentSheetConfig.unregisterSheet(
    CONFIG.Token.documentClass,
    'core',
    foundry.applications.sheets.TokenConfig,
    {},
  );

  foundry.documents.collections.Actors.registerSheet('swade', GroupSheet, {
    types: ['group'],
    makeDefault: true,
    label: 'SWADE.GroupSheet',
  });
  foundry.documents.collections.Actors.registerSheet(
    'swade',
    SwadeVehicleSheetV2,
    {
      types: ['vehicle'],
      makeDefault: true,
      label: 'SWADE.VehicleSheet',
    },
  );

  foundry.documents.collections.Actors.registerSheet('swade', CharacterSheet, {
    types: ['character', 'npc'],
    makeDefault: true,
    label: 'SWADE.OfficialSheet',
  });
  foundry.documents.collections.Actors.registerSheet('swade', SwadeNPCSheet, {
    types: ['npc'],
    makeDefault: true,
    label: 'SWADE.CommunityNPCSheet',
  });
  foundry.documents.collections.Items.registerSheet('swade', SwadeItemSheetV2, {
    makeDefault: true,
    types: [
      'ability',
      'action',
      'ancestry',
      'armor',
      'consumable',
      'edge',
      'gear',
      'hindrance',
      'power',
      'shield',
      'skill',
      'weapon',
    ],
    label: 'SWADE.ItemSheet',
  });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    JournalEntryPage,
    'swade',
    JournalHeadquartersPageSheet,
    {
      types: ['headquarters'],
      makeDefault: true,
      label: 'SWADE.HeadquartersSheet',
    },
  );
  foundry.applications.apps.DocumentSheetConfig.registerSheet(
    TokenDocument,
    'swade',
    SwadeTokenConfig,
  );

  // Register Tours
  registerSWADETours();

  //@ts-expect-error Types don't allow this, but seems a supported use case
  CONFIG.Dice.SwadeRoll = SwadeRoll;
  //@ts-expect-error Types don't allow this, but seems a supported use case
  CONFIG.Dice.TraitRoll = TraitRoll;
  //@ts-expect-error Types don't allow this, but seems a supported use case
  CONFIG.Dice.DamageRoll = DamageRoll;

  CONFIG.Dice.terms.b = Benny;
  CONFIG.Dice.rolls.unshift(SwadeRoll);
  CONFIG.Dice.rolls.push(TraitRoll, DamageRoll);
  CONFIG.Dice.types.push(WildDie);
});
Hooks.once('i18nInit', SwadeCoreHooks.onI18nInit);
Hooks.once('setup', SwadeCoreHooks.onSetup);
Hooks.once('ready', SwadeCoreHooks.onReady);

Hooks.on('hotReload', SwadeCoreHooks.onHotReload);
Hooks.on('getSceneControlButtons', SwadeCoreHooks.onGetSceneControlButtons);
Hooks.on('hotbarDrop', SwadeCoreHooks.onHotbarDrop);
Hooks.on('createProseMirrorEditor', SwadeCoreHooks.onCreateProseMirrorEditor);

/* ------------------------------------ */
/* Application Render					          */
/* ------------------------------------ */
Hooks.on('renderCombatantConfig', SwadeCoreHooks.onRenderCombatantConfig);
Hooks.on('renderActiveEffectConfig', SwadeCoreHooks.onRenderActiveEffectConfig);
Hooks.on('renderCompendium', SwadeCoreHooks.onRenderCompendium);
Hooks.on('renderChatMessageHTML', SwadeCoreHooks.onRenderChatMessageHTML);
Hooks.on('renderPlayers', SwadeCoreHooks.onRenderPlayers);
Hooks.on('renderUserConfig', SwadeCoreHooks.onRenderUserConfig);

/* ------------------------------------ */
/* Sidebar Tab Render					          */
/* ------------------------------------ */
Hooks.on('renderActorDirectory', SwadeCoreHooks.onRenderActorDirectory);
Hooks.on('renderSettings', SwadeCoreHooks.onRenderSettings);
Hooks.on(
  'renderCompendiumDirectory',
  SwadeCoreHooks.onRenderCompendiumDirectory,
);

/* ------------------------------------ */
/* Context Options    				          */
/* ------------------------------------ */
Hooks.on('getUserContextOptions', SwadeCoreHooks.onGetUserContextOptions);
Hooks.on('getActorContextOptions', SwadeCoreHooks.onGetActorContextOptions);
Hooks.on('getCardsContextOptions', SwadeCoreHooks.onGetCardsContextOptions);
Hooks.on(
  'getCompendiumContextOptions',
  SwadeCoreHooks.onGetCompendiumContextOptions,
);

/* ------------------------------------ */
/* Update Hooks              	          */
/* ------------------------------------ */
Hooks.on('userConnected', SwadeCoreHooks.onUserConnected);
Hooks.on('updateCombat', SwadeCoreHooks.onUpdateCombat);
Hooks.on('targetToken', SwadeCoreHooks.onTargetToken);

/* ------------------------------------ */
/* Canvas Interactions  			          */
/* ------------------------------------ */
Hooks.on('dropCanvasData', SwadeCoreHooks.onDropCanvasData);

/* ------------------------------------ */
/* System Hooks              	          */
/* ------------------------------------ */
// Hooks.on('renderSwadeRollMessage', SwadeSystemHooks.onRenderSwadeRollMessage);

/* ------------------------------------ */
/* Third Party Integrations		          */
/* ------------------------------------ */

/** Dice So Nice*/
Hooks.once('diceSoNiceInit', SwadeIntegrationHooks.onDiceSoNiceInit);
Hooks.once('diceSoNiceReady', SwadeIntegrationHooks.onDiceSoNiceReady);
Hooks.on('diceSoNiceRollStart', SwadeIntegrationHooks.onDiceSoNiceRollStart);

/** Developer Mode */
Hooks.once('devModeReady', SwadeIntegrationHooks.onDevModeReady);

/** Item Piles */
Hooks.once('item-piles-ready', SwadeIntegrationHooks.onItemPilesReady);
