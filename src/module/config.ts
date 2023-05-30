/* eslint-disable @typescript-eslint/naming-convention */
import { StatusEffect } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import { AbilitySubType } from '../globals';
import { RollModifierGroup } from '../interfaces/additional.interface';
import { TemplateConfig } from '../interfaces/TemplateConfig.interface';
import SwadeMeasuredTemplate from './canvas/SwadeMeasuredTemplate';
import { constants } from './constants';
import { statusEffects } from './statusEffects';

/** @internal */
export const PACKAGE_ID = 'swade';

/** @internal */
export const SWADE: SwadeConfig = {
  ASCII: `
  ███████╗██╗    ██╗ █████╗ ██████╗ ███████╗
  ██╔════╝██║    ██║██╔══██╗██╔══██╗██╔════╝
  ███████╗██║ █╗ ██║███████║██║  ██║█████╗
  ╚════██║██║███╗██║██╔══██║██║  ██║██╔══╝
  ███████║╚███╔███╔╝██║  ██║██████╔╝███████╗
  ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═════╝ ╚══════╝`,

  attributes: {
    agility: {
      long: 'SWADE.AttrAgi',
      short: 'SWADE.AttrAgiShort',
    },
    smarts: {
      long: 'SWADE.AttrSma',
      short: 'SWADE.AttrSmaShort',
    },
    spirit: {
      long: 'SWADE.AttrSpr',
      short: 'SWADE.AttrSprShort',
    },
    strength: {
      long: 'SWADE.AttrStr',
      short: 'SWADE.AttrStrShort',
    },
    vigor: {
      long: 'SWADE.AttrVig',
      short: 'SWADE.AttrVigShort',
    },
  },

  bennies: {
    templates: {
      refresh: 'systems/swade/templates/chat/benny-refresh.hbs',
      refreshAll: 'systems/swade/templates/chat/benny-refresh-all.hbs',
      add: 'systems/swade/templates/chat/benny-add.hbs',
      spend: 'systems/swade/templates/chat/benny-spend.hbs',
      gmadd: 'systems/swade/templates/chat/benny-gmadd.hbs',
      joker: 'systems/swade/templates/chat/jokers-wild.hbs',
    },
  },

  vehicles: {
    maxHandlingPenalty: -4,
    opSkills: ['', 'Boating', 'Driving', 'Piloting', 'Riding'],
  },

  settingConfig: {
    settings: [
      'coreSkills',
      'coreSkillsCompendium',
      'enableConviction',
      'jokersWild',
      'vehicleMods',
      'vehicleEdges',
      'gmBennies',
      'enableWoundPace',
      'ammoManagement',
      'ammoFromInventory',
      'npcAmmo',
      'vehicleAmmo',
      'noPowerPoints',
      'alwaysGeneralPP',
      'wealthType',
      'currencyName',
      'npcsUseCurrency',
      'hardChoices',
      'dumbLuck',
      'grittyDamage',
      'woundCap',
      'unarmoredHero',
      'heroesNeverDie',
      'injuryTable',
      'actionDeck',
      'applyEncumbrance',
      'actionDeckDiscardPile',
      'pcStartingCurrency',
      'npcStartingCurrency',
      'bennyImageSheet',
      'bennyImage3DFront',
      'bennyImage3DBack',
      '3dBennyFrontBump',
      '3dBennyBackBump',
    ],
  },

  diceConfig: {
    flags: {},
  },

  statusEffects: statusEffects,

  wildCardIcons: {
    regular: 'systems/swade/assets/ui/wildcard.svg',
    compendium: 'systems/swade/assets/ui/wildcard-dark.svg',
  },

  measuredTemplatePresets: [
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CONE, distance: 9 },
      button: {
        name: constants.TEMPLATE_PRESET.CONE,
        title: 'SWADE.Templates.Cone.Long',
        icon: 'fa-solid fa-location-pin fa-rotate-90',
        visible: true,
        button: true,
        onClick: () => {
          SwadeMeasuredTemplate.fromPreset(constants.TEMPLATE_PRESET.CONE);
        },
      },
    },
    {
      data: {
        t: foundry.CONST.MEASURED_TEMPLATE_TYPES.RAY,
        distance: 12,
        width: 1,
      },
      button: {
        name: constants.TEMPLATE_PRESET.STREAM,
        title: 'SWADE.Templates.Stream.Long',
        icon: 'fa-solid fa-rectangle-wide',
        visible: true,
        button: true,
        onClick: () => {
          SwadeMeasuredTemplate.fromPreset(constants.TEMPLATE_PRESET.STREAM);
        },
      },
    },
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 1 },
      button: {
        name: constants.TEMPLATE_PRESET.SBT,
        title: 'SWADE.Templates.Small.Long',
        icon: 'fa-solid fa-circle-1 fa-2xs',
        visible: true,
        button: true,
        onClick: () => {
          SwadeMeasuredTemplate.fromPreset(constants.TEMPLATE_PRESET.SBT);
        },
      },
    },
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 2 },
      button: {
        name: constants.TEMPLATE_PRESET.MBT,
        title: 'SWADE.Templates.Medium.Long',
        icon: 'fa-solid fa-circle-2 fa-sm',
        visible: true,
        button: true,
        onClick: () => {
          SwadeMeasuredTemplate.fromPreset(constants.TEMPLATE_PRESET.MBT);
        },
      },
    },
    {
      data: { t: CONST.MEASURED_TEMPLATE_TYPES.CIRCLE, distance: 3 },
      button: {
        name: constants.TEMPLATE_PRESET.LBT,
        title: 'SWADE.Templates.Large.Long',
        icon: 'fa-solid fa-circle-3 fa-lg',
        visible: true,
        button: true,
        onClick: () => {
          SwadeMeasuredTemplate.fromPreset(constants.TEMPLATE_PRESET.LBT);
        },
      },
    },
  ],

  activeMeasuredTemplatePreview: null,

  abilitySheet: {
    special: {
      dropdown: 'SWADE.SpecialAbility',
      abilities: 'SWADE.SpecialAbilities',
    },
    race: {
      dropdown: 'SWADE.Race',
      abilities: 'SWADE.RacialAbilities',
    },
    archetype: {
      dropdown: 'SWADE.Archetype',
      abilities: 'SWADE.ArchetypeAbilities',
    },
  },

  prototypeRollGroups: [
    {
      name: 'SWADE.ModTrait',
      modifiers: [
        { label: 'SWADE.TargetVulnerable', value: '+2' },
        { label: 'SWADE.Encumbered', value: -2 },
      ],
      rollType: constants.ROLL_TYPE.TRAIT,
    },
    {
      name: 'SWADE.ModAttack',
      modifiers: [
        { label: 'SWADE.Aiming', value: '+2' },
        { label: 'SWADE.Snapfire', value: -2 },
        { label: 'SWADE.UnstablePlatform', value: -2 },
        { label: 'SWADE.CalledShot.Hand', value: '-4' },
        { label: 'SWADE.CalledShot.HeadOrVitals', value: '-4' },
        { label: 'SWADE.CalledShot.Limbs', value: '-2' },
      ],
      rollType: constants.ROLL_TYPE.ATTACK,
    },
    {
      name: 'SWADE.ModDamage',
      modifiers: [
        { label: 'SWADE.CalledShot.HeadOrVitals', value: '+4' },
        { label: 'SWADE.Weakness', value: '+4' },
        { label: 'SWADE.Resistance', value: '-4' },
      ],
      rollType: constants.ROLL_TYPE.DAMAGE,
    },
    {
      name: 'SWADE.Range._name',
      modifiers: [
        { label: 'SWADE.Range.Medium', value: -2 },
        { label: 'SWADE.Range.Long', value: -4 },
        { label: 'SWADE.Range.Extreme', value: -8 },
      ],
      rollType: constants.ROLL_TYPE.TRAIT,
    },
    {
      name: 'SWADE.Cover._name',
      modifiers: [
        { label: 'SWADE.Cover.Light', value: -2 },
        { label: 'SWADE.Cover.Medium', value: -4 },
        { label: 'SWADE.Cover.Heavy', value: -6 },
        { label: 'SWADE.Cover.Total', value: -8 },
      ],
      rollType: constants.ROLL_TYPE.TRAIT,
    },
    {
      name: 'SWADE.Illumination._name',
      modifiers: [
        { label: 'SWADE.Illumination.Dim', value: -2 },
        { label: 'SWADE.Illumination.Dark', value: -4 },
        { label: 'SWADE.Illumination.Pitch', value: -6 },
      ],
      rollType: constants.ROLL_TYPE.TRAIT,
    },
  ],

  CONST: constants,

  ranks: [
    'SWADE.Ranks.Novice',
    'SWADE.Ranks.Seasoned',
    'SWADE.Ranks.Veteran',
    'SWADE.Ranks.Heroic',
    'SWADE.Ranks.Legendary',
  ],
};

/** @internal */
export interface SwadeConfig {
  //a piece of ASCII art for the init log message
  ASCII: string;

  CONST: typeof constants;

  //An object to store localization strings
  attributes: {
    agility: {
      long: string;
      short: string;
    };
    smarts: {
      long: string;
      short: string;
    };
    spirit: {
      long: string;
      short: string;
    };
    strength: {
      long: string;
      short: string;
    };
    vigor: {
      long: string;
      short: string;
    };
  };

  bennies: {
    templates: {
      refresh: string;
      refreshAll: string;
      add: string;
      spend: string;
      gmadd: string;
      joker: string;
    };
  };

  vehicles: {
    maxHandlingPenalty: number;
    opSkills: Array<string>;
  };

  settingConfig: {
    settings: Array<string>;
  };

  diceConfig: {
    flags: Record<string, any>;
  };

  statusEffects: StatusEffect[];

  wildCardIcons: {
    regular: string;
    compendium: string;
  };

  measuredTemplatePresets: Array<TemplateConfig>;

  activeMeasuredTemplatePreview: SwadeMeasuredTemplate | null;

  abilitySheet: Record<AbilitySubType, { dropdown: string; abilities: string }>;

  prototypeRollGroups: RollModifierGroup[];

  ranks: string[];
}
