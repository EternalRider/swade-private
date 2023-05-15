import { PrototypeAdditionalStat } from '../interfaces/additional.interface';
import CompendiumTOCSettings from './apps/CompendiumTOCSettings';
import SettingConfigurator from './apps/SettingConfigurator';

declare global {
  namespace ClientSettings {
    interface Values {
      'swade.systemMigrationVersion': string;
      'swade.initiativeSound': boolean;
      'swade.autoInit': boolean;
      'swade.initMessage': boolean;
      'swade.actionDeck': string;
      'swade.actionDeckDiscardPile': string;
      'swade.hideNPCWildcards': boolean;
      'swade.notifyBennies': boolean;
      'swade.hideNpcItemChatCards': boolean;
      'swade.useAttributeShorts': boolean;
      'swade.coreSkills': string;
      'swade.coreSkillsCompendium': string;
      'swade.wealthType': 'currency' | 'wealthDie' | 'none';
      'swade.currencyName': string;
      'swade.npcsUseCurrency': boolean;
      'swade.jokersWild': boolean;
      'swade.parryBaseSkill': string;
      'swade.weightUnit': 'imperial' | 'metric';
      'swade.ammoManagement': boolean;
      'swade.ammoFromInventory': boolean;
      'swade.npcAmmo': boolean;
      'swade.vehicleAmmo': boolean;
      'swade.enableConviction': boolean;
      'swade.enableWoundPace': boolean;
      'swade.noPowerPoints': boolean;
      'swade.alwaysGeneralPP': boolean;
      'swade.gmBennies': number;
      'swade.vehicleMods': boolean;
      'swade.vehicleEdges': boolean;
      'swade.bennyImageSheet': string;
      'swade.bennyImage3DBack': string;
      'swade.bennyImage3DFront': string;
      'swade.3dBennyFrontBump': string;
      'swade.3dBennyBackBump': string;
      'swade.grittyDamage': boolean;
      'swade.injuryTable': string;
      'swade.woundCap': boolean;
      'swade.unarmoredHero': boolean;
      'swade.hardChoices': boolean;
      'swade.dumbLuck': boolean;
      'swade.applyEncumbrance': boolean;
      'swade.highlightTemplate': boolean;
      'swade.fantasyCompanionEntangle': boolean;
      'swade.settingFields': {
        actor: Record<string, PrototypeAdditionalStat>;
        item: Record<string, PrototypeAdditionalStat>;
      };
      'swade.tocBlockList': Record<string, boolean>;
      'swade.npcStartingCurrency': number;
      'swade.pcStartingCurrency': number;
    }
  }
}
/** @internal */
export function registerSettings() {
  game.settings.registerMenu('swade', 'setting-config', {
    name: 'SWADE.SettingConf',
    label: 'SWADE.SettingConfLabel',
    hint: 'SWADE.SettingConfDesc',
    icon: 'fa-solid fa-globe',
    type: SettingConfigurator,
    restricted: true,
  });

  game.settings.registerMenu('swade', 'toc-settings', {
    name: 'SWADE.TOCSettings.Name',
    label: 'SWADE.TOCSettings.Label',
    hint: 'SWADE.TOCSettings.Hint',
    icon: 'fa-solid fa-books',
    type: CompendiumTOCSettings,
    restricted: true,
  });

  /** Track the system version upon which point a migration was last applied */
  game.settings.register('swade', 'systemMigrationVersion', {
    name: 'System Migration Version',
    scope: 'world',
    config: false,
    type: String,
    default: '0.0.0',
  });

  game.settings.register('swade', 'initiativeSound', {
    name: 'SWADE.Settings.CardSound.Name',
    hint: 'SWADE.Settings.CardSound.Hint',
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'autoInit', {
    name: 'SWADE.Settings.AutoInit.Name',
    hint: 'SWADE.Settings.AutoInit.Hint',
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'initMessage', {
    name: 'SWADE.Settings.CreateInitChat.Name',
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'hideNPCWildcards', {
    name: 'SWADE.Settings.HideWC.Name',
    hint: 'SWADE.Settings.HideWC.Hint',
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'notifyBennies', {
    name: 'SWADE.Settings.EnableBennyNotify.Name',
    hint: 'SWADE.Settings.EnableBennyNotify.Hint',
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'hideNpcItemChatCards', {
    name: 'SWADE.Settings.HideNpcItemChatCards.Name',
    hint: 'SWADE.Settings.HideNpcItemChatCards.Hint',
    default: true,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'weightUnit', {
    name: 'SWADE.Settings.WeightUnit.Name',
    hint: 'SWADE.Settings.WeightUnit.Hint',
    default: 'imperial',
    scope: 'world',
    type: String,
    choices: {
      imperial: game.i18n.localize('SWADE.Imperial'),
      metric: game.i18n.localize('SWADE.Metric'),
    },
    config: true,
  });

  game.settings.register('swade', 'useAttributeShorts', {
    name: 'SWADE.Settings.UseAttributeShorts.Name',
    hint: 'SWADE.Settings.UseAttributeShorts.Hint',
    default: false,
    scope: 'world',
    type: Boolean,
    config: true,
  });

  game.settings.register('swade', 'parryBaseSkill', {
    name: 'SWADE.Settings.ParryBase.Name',
    hint: 'SWADE.Settings.ParryBase.Hint',
    default: 'Fighting',
    scope: 'world',
    type: String,
    config: true,
  });

  game.settings.register('swade', 'actionDeck', {
    name: 'SWADE.Settings.InitCardDeck.Name',
    scope: 'world',
    type: String,
    config: false,
    default: '',
  });

  game.settings.register('swade', 'actionDeckDiscardPile', {
    name: 'SWADE.Settings.InitDiscardPile.Name',
    scope: 'world',
    type: String,
    config: false,
    default: '',
  });

  game.settings.register('swade', 'highlightTemplate', {
    name: 'SWADE.Settings.HighlightTemplate.Name',
    hint: 'SWADE.Settings.HighlightTemplate.Hint',
    scope: 'world',
    type: Boolean,
    default: true,
    config: true,
  });

  game.settings.register('swade', 'fantasyCompanionEntangle', {
    name: 'SWADE.Settings.FantasyCompanionEntangle.Name',
    hint: 'SWADE.Settings.FantasyCompanionEntangle.Hint',
    scope: 'world',
    type: Boolean,
    default: false,
    config: true,
    requiresReload: true,
  });
}

/** @internal */
export function registerSettingRules() {
  game.settings.register('swade', 'coreSkills', {
    name: 'SWADE.Settings.CoreSkillsList.Name',
    hint: 'SWADE.Settings.CoreSkillsList.Hint',
    default: 'Athletics, Common Knowledge, Notice, Persuasion, Stealth',
    scope: 'world',
    type: String,
    config: false,
  });

  game.settings.register('swade', 'coreSkillsCompendium', {
    name: 'SWADE.Settings.CoreSkillsPack.Name',
    hint: 'SWADE.Settings.CoreSkillsPack.Hint',
    default: 'swade.skills',
    type: String,
    scope: 'world',
    config: false,
  });

  game.settings.register('swade', 'wealthType', {
    name: 'SWADE.Settings.WealthType.Name',
    hint: 'SWADE.Settings.WealthType.Hint',
    scope: 'world',
    type: String,
    choices: {
      currency: 'SWADE.Currency',
      wealthDie: 'SWADE.WealthDie.Label',
      none: 'SWADE.WealthSelectionNoneOther',
    },
    default: 'currency',
    config: false,
  });

  game.settings.register('swade', 'currencyName', {
    name: 'SWADE.Settings.CurrencyName.Name',
    hint: 'SWADE.Settings.CurrencyName.Hint',
    scope: 'world',
    type: String,
    default: 'Currency',
    config: false,
  });

  game.settings.register('swade', 'npcsUseCurrency', {
    name: 'SWADE.Settings.NPCCurrency.Name',
    hint: 'SWADE.Settings.NPCCurrency.Hint',
    scope: 'world',
    type: Boolean,
    default: true,
    config: false,
  });

  game.settings.register('swade', 'jokersWild', {
    name: 'SWADE.Settings.JokersWild.Name',
    hint: 'SWADE.Settings.JokersWild.Hint',
    default: true,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'ammoManagement', {
    name: 'SWADE.Settings.AmmoManagement.Name',
    hint: 'SWADE.Settings.AmmoManagement.Hint',
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'ammoFromInventory', {
    name: 'SWADE.Settings.PCAmmoFromInventory.Name',
    hint: 'SWADE.Settings.PCAmmoFromInventory.Hint',
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'npcAmmo', {
    name: 'SWADE.Settings.NPCAmmoFromInventory.Name',
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'vehicleAmmo', {
    name: 'SWADE.Settings.VehicleAmmoFromInventory.Name',
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'enableConviction', {
    name: 'SWADE.Settings.EnableConv.Name',
    hint: 'SWADE.Settings.EnableConv.Hint',
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'enableWoundPace', {
    name: 'SWADE.Settings.EnableWoundPace.Name',
    hint: 'SWADE.Settings.EnableWoundPace.Hint',
    default: true,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'noPowerPoints', {
    name: 'SWADE.Settings.NoPowerPoints.Name',
    hint: 'SWADE.Settings.NoPowerPoints.Hint',
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'alwaysGeneralPP', {
    name: 'SWADE.Settings.AlwaysGeneralPP.Name',
    hint: 'SWADE.Settings.AlwaysGeneralPP.Hint',
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'applyEncumbrance', {
    name: 'SWADE.Settings.ApplyEncumbrance.Name',
    hint: game.i18n.format('SWADE.Settings.ApplyEncumbrance.Hint', {
      vigor: game.i18n.localize('SWADE.AttrVig'),
      fatigue: game.i18n.localize('SWADE.Fatigue'),
    }),
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'gmBennies', {
    name: 'SWADE.Settings.GmBennies.Name',
    hint: 'SWADE.Settings.GmBennies.Hint',
    default: 0,
    scope: 'world',
    type: Number,
    config: false,
  });

  game.settings.register('swade', 'vehicleMods', {
    name: 'SWADE.Settings.VehicleMods.Name',
    hint: 'SWADE.Settings.VehicleMods.Hint',
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'vehicleEdges', {
    name: 'SWADE.Settings.VehicleEdges.Name',
    hint: 'SWADE.Settings.VehicleEdges.Hint',
    default: false,
    scope: 'world',
    type: Boolean,
    config: false,
  });

  game.settings.register('swade', 'settingFields', {
    name: 'SWADE.Settings.ArbitFields',
    default: { actor: {}, item: {} },
    scope: 'world',
    //@ts-expect-error The types can't really cope with this but Foundry can
    type: Object,
    config: false,
  });

  game.settings.register('swade', 'tocBlockList', {
    name: 'SWADE.TOCBlockList',
    default: {},
    scope: 'world',
    //@ts-expect-error The types can't really cope with this but Foundry can
    type: Object,
    config: false,
    onChange: (v) => {
      console.log(v);
    },
  });

  game.settings.register('swade', 'bennyImageSheet', {
    name: 'SWADE.Settings.BennyImageSheet.Name',
    hint: 'SWADE.Settings.BennyImageSheet.Hint',
    type: String,
    default: 'systems/swade/assets/bennie.webp',
    scope: 'world',
    config: false,
    filePicker: 'image',
  });

  game.settings.register('swade', 'woundCap', {
    name: 'SWADE.Settings.WoundCap.Name',
    hint: 'SWADE.Settings.WoundCap.Hint',
    type: Boolean,
    default: false,
    scope: 'world',
    config: false,
  });

  game.settings.register('swade', 'unarmoredHero', {
    name: 'SWADE.Settings.UnarmoredHero.Name',
    hint: 'SWADE.Settings.UnarmoredHero.Hint',
    type: Boolean,
    default: false,
    scope: 'world',
    config: false,
  });

  game.settings.register('swade', 'grittyDamage', {
    name: 'SWADE.Settings.GrittyDamage.Name',
    hint: 'SWADE.Settings.GrittyDamage.Hint',
    type: Boolean,
    default: false,
    scope: 'world',
    config: false,
  });

  game.settings.register('swade', 'injuryTable', {
    name: 'SWADE.Settings.InjuryTable.Name',
    hint: 'SWADE.Settings.InjuryTable.Hint',
    type: String,
    default: '',
    scope: 'world',
    config: false,
    choices: {},
  });

  game.settings.register('swade', 'hardChoices', {
    name: 'SWADE.Settings.HardChoices.Name',
    hint: 'SWADE.Settings.HardChoices.Hint',
    scope: 'world',
    type: Boolean,
    default: false,
    config: false,
  });

  game.settings.register('swade', 'dumbLuck', {
    name: 'SWADE.Settings.DumbLuck.Name',
    hint: 'SWADE.Settings.DumbLuck.Hint',
    scope: 'world',
    type: Boolean,
    default: false,
    config: false,
  });

  game.settings.register('swade', 'pcStartingCurrency', {
    name: 'SWADE.Settings.StartingCurrency.PC.Name',
    hint: 'SWADE.Settings.StartingCurrency.PC.Hint',
    scope: 'world',
    type: Number,
    default: 500,
    config: false,
  });

  game.settings.register('swade', 'npcStartingCurrency', {
    name: 'SWADE.Settings.StartingCurrency.NPC.Name',
    hint: 'SWADE.Settings.StartingCurrency.NPC.Hint',
    scope: 'world',
    type: Number,
    default: 0,
    config: false,
  });
}

/** @internal */
export function register3DBennySettings() {
  game.settings.register('swade', 'bennyImage3DFront', {
    name: 'SWADE.Settings.Benny3DFront.Name',
    hint: 'SWADE.Settings.Benny3DFront.Hint',
    type: String,
    default: 'systems/swade/assets/benny/benny-chip-front.png',
    scope: 'world',
    config: false,
    filePicker: 'image',
  });

  game.settings.register('swade', 'bennyImage3DBack', {
    name: 'SWADE.Settings.Benny3DBack.Name',
    hint: 'SWADE.Settings.Benny3DBack.Hint',
    type: String,
    default: 'systems/swade/assets/benny/benny-chip-front.png',
    scope: 'world',
    config: false,
    filePicker: 'image',
  });

  game.settings.register('swade', '3dBennyFrontBump', {
    name: 'SWADE.Settings.Benny3DBackBump.Name',
    hint: 'SWADE.Settings.Benny3DBackBump.Hint',
    type: String,
    default: 'systems/swade/assets/benny/benny_bump.png',
    scope: 'world',
    config: false,
    filePicker: 'image',
  });

  game.settings.register('swade', '3dBennyBackBump', {
    name: 'SWADE.Settings.Benny3DFrontBump.Name',
    hint: 'SWADE.Settings.Benny3DFrontBump.Hint',
    type: String,
    default: 'systems/swade/assets/benny/benny_bump.png',
    scope: 'world',
    config: false,
    filePicker: 'image',
  });
}
