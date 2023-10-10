import { ArtworkMapping } from './interfaces/ArtworkMapping.interface';
import ActiveEffectWizard from './module/apps/ActiveEffectWizard';
import { AdvanceEditor } from './module/apps/AdvanceEditor';
import AttributeManager from './module/apps/AttributeManager';
import { CompendiumTOC } from './module/apps/CompendiumTOC';
import { RollDialog } from './module/apps/RollDialog';
import SettingConfigurator from './module/apps/SettingConfigurator';
import SwadeDocumentTweaks from './module/apps/SwadeDocumentTweaks';
import SwadeMeasuredTemplate from './module/canvas/SwadeMeasuredTemplate';
import SwadeToken from './module/canvas/SwadeToken';
import CharacterSummarizer from './module/CharacterSummarizer';
import { SWADE } from './module/config';
import * as data from './module/data';
import Benny from './module/dice/Benny';
import { DamageRoll } from './module/dice/DamageRoll';
import { SwadeRoll } from './module/dice/SwadeRoll';
import { TraitRoll } from './module/dice/TraitRoll';
import WildDie from './module/dice/WildDie';
import SwadeActiveEffect from './module/documents/active-effect/SwadeActiveEffect';
import SwadeActor from './module/documents/actor/SwadeActor';
import SwadeCards from './module/documents/card/SwadeCards';
import SwadeChatMessage from './module/documents/chat/SwadeChatMessage';
import SwadeCombat from './module/documents/combat/SwadeCombat';
import SwadeCombatant from './module/documents/combat/SwadeCombatant';
import SwadeItem from './module/documents/item/SwadeItem';
import SwadeUser from './module/documents/SwadeUser';
import { registerEffectCallbacks } from './module/effectCallbacks';
import { registerCustomHelpers } from './module/handlebarsHelpers';
import { registerAuraHooks } from './module/hooks/AuraHooks';
import SwadeCoreHooks from './module/hooks/SwadeCoreHooks';
import SwadeIntegrationHooks from './module/hooks/SwadeIntegrationHooks';
import ItemChatCardHelper from './module/ItemChatCardHelper';
import { registerKeybindings } from './module/keybindings';
import { Logger } from './module/Logger';
import * as migrations from './module/migration/migration';
import { preloadHandlebarsTemplates } from './module/preloadTemplates';
import {
  register3DBennySettings,
  registerSettingRules,
  registerSettings,
} from './module/settings';
import CharacterSheet from './module/sheets/official/CharacterSheet';
import SwadeItemSheetV2 from './module/sheets/SwadeItemSheetV2';
import SwadeNPCSheet from './module/sheets/SwadeNPCSheet';
import SwadeVehicleSheet from './module/sheets/SwadeVehicleSheet';
import SwadeCombatTracker from './module/sidebar/SwadeCombatTracker';
import SwadeSocketHandler from './module/SwadeSocketHandler';
import registerSWADETours from './module/tours/registration';
import {
  deepFreeze,
  getStatusEffectDataById,
  rollItemMacro,
} from './module/util';
import DetectionModeInfravision from './module/vision/DetectionModeInfravision';
import { InfravisionBackgroundVisionShader } from './module/vision/InfravisionBackgroundVisionShader';
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
      SwadeItemSheetV2,
      SwadeNPCSheet,
      SwadeVehicleSheet,
    },
    apps: {
      SwadeDocumentTweaks,
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
    fields: data.fields,
  };

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

  //register custom object classes
  CONFIG.MeasuredTemplate.objectClass = SwadeMeasuredTemplate;
  // SWADE's default cone template is a very special case that we're storing at angle===0
  // This preserves access to the other types of cone definitions
  CONFIG.MeasuredTemplate.defaults.angle = 0;
  CONFIG.Token.objectClass = SwadeToken;

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
  CONFIG.specialStatusEffects.COLDBODIED = 'cold-bodied';

  // v11 Active Effect handling
  CONFIG.ActiveEffect.legacyTransferral = false;

  //register detection modes
  CONFIG.Canvas.detectionModes.seeHeat = new DetectionModeInfravision({
    id: 'seeHeat',
    label: 'SWADE.Vision.SeeHeat',
    type: DetectionMode.DETECTION_TYPES.OTHER,
  });
  CONFIG.Canvas.detectionModes.senseHeat = new DetectionModeInfravision({
    id: 'senseHeat',
    label: 'SWADE.Vision.SenseHeat',
    walls: false,
    type: DetectionMode.DETECTION_TYPES.OTHER,
  });

  CONFIG.Canvas.visionModes.infraVision = new VisionMode({
    id: 'infraVision',
    label: 'SWADE.Vision.Infravision',
    canvas: {
      shader: ColorAdjustmentsSamplerShader,
      uniforms: {
        saturation: -0.5,
        tint: InfravisionBackgroundVisionShader.COLOR_TINT,
      },
    },
    lighting: {
      background: { visibility: VisionMode.LIGHTING_VISIBILITY.DISABLED },
      illumination: { visibility: VisionMode.LIGHTING_VISIBILITY.DISABLED },
      coloration: { visibility: VisionMode.LIGHTING_VISIBILITY.DISABLED },
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

  //@ts-expect-error Types don't properly recognize dotnotation
  JournalTextPageSheet._converter.setOption('tables', true);

  //@ts-expect-error Revist once types have caught up
  CONFIG.specialStatusEffects.INCAPACITATED = 'incapacitated';

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
  Actors.unregisterSheet('core', ActorSheet);
  Items.unregisterSheet('core', ItemSheet);

  Actors.registerSheet('swade', CharacterSheet, {
    types: ['character', 'npc'],
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

  // Register Tours
  registerSWADETours();

  //@ts-expect-error Types don't allow it but is possible and feasible
  CONFIG.Dice.SwadeRoll = SwadeRoll;
  //@ts-expect-error Types don't allow it but is possible and feasible
  CONFIG.Dice.TraitRoll = TraitRoll;
  //@ts-expect-error Types don't allow it but is possible and feasible
  CONFIG.Dice.DamageRoll = DamageRoll;

  CONFIG.Dice.terms.b = Benny;
  CONFIG.Dice.rolls.push(SwadeRoll, TraitRoll, DamageRoll);
  CONFIG.Dice.types.push(WildDie);
});
Hooks.once('i18nInit', SwadeCoreHooks.onI18nInit);
Hooks.once('setup', SwadeCoreHooks.onSetup);
Hooks.once('ready', SwadeCoreHooks.onReady);

Hooks.on('hotReload', SwadeCoreHooks.onHotReload);
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
Hooks.on('renderChatLog', SwadeCoreHooks.onRenderChatLog);
Hooks.on('renderChatPopout', SwadeCoreHooks.onRenderChatLog);
Hooks.on(
  'renderCompendiumDirectory',
  SwadeCoreHooks.onRenderCompendiumDirectory,
);

/* ------------------------------------ */
/* Context Options    				          */
/* ------------------------------------ */
Hooks.on('getUserContextOptions', SwadeCoreHooks.onGetUserContextOptions);
Hooks.on('getActorEntryContext', SwadeCoreHooks.onGetCombatTrackerEntryContext);
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
