/* eslint-disable @typescript-eslint/naming-convention */
import { StatusEffect } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import { AbilitySubType } from '../globals';
import { TraitRollModifierGroup } from '../interfaces/additional.interface';
import { TemplateConfig } from '../interfaces/TemplateConfig.interface';
import { constants } from './constants';
import SwadeMeasuredTemplate from './documents/SwadeMeasuredTemplate';
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

  imagedrop: {
    height: 300,
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
    id: 'settingConfig',
    title: 'SWADE Setting Rule Configurator',
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
      'wealthType',
      'currencyName',
      'hardChoices',
      'actionDeck',
      'applyEncumbrance',
      'actionDeckDiscardPile',
      'bennyImageSheet',
      'bennyImage3DFront',
      'bennyImage3DBack',
      '3dBennyFrontBump',
      '3dBennyBackBump',
    ],
  },

  diceConfig: {
    id: 'diceConfig',
    title: 'SWADE Dice Settings',
    flags: {},
  },

  actionCardEditor: {
    id: 'actionCardEditor',
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
        icon: 'text-icon cone',
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
        icon: 'fa-solid fa-wave-square',
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
        icon: 'text-icon sbt',
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
        icon: 'text-icon mbt',
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
        icon: 'text-icon lbt',
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
      name: 'SWADE.Range._name',
      modifiers: [
        { label: 'SWADE.Range.Medium', value: -2 },
        { label: 'SWADE.Range.Long', value: -4 },
        { label: 'SWADE.Range.Extreme', value: -8 },
      ],
    },
    {
      name: 'SWADE.Cover._name',
      modifiers: [
        { label: 'SWADE.Cover.Light', value: -2 },
        { label: 'SWADE.Cover.Medium', value: -4 },
        { label: 'SWADE.Cover.Heavy', value: -6 },
        { label: 'SWADE.Cover.Total', value: -8 },
      ],
    },
    {
      name: 'SWADE.Illumination._name',
      modifiers: [
        { label: 'SWADE.Illumination.Dim', value: -2 },
        { label: 'SWADE.Illumination.Dark', value: -4 },
        { label: 'SWADE.Illumination.Pitch', value: -6 },
      ],
    },
    {
      name: 'SWADE.ModOther',
      modifiers: [
        { label: 'SWADE.TargetVulnerable', value: '+2' },
        { label: 'SWADE.WildAttack', value: '+2' },
        { label: 'SWADE.Aiming', value: '+2' },
        { label: 'SWADE.Snapfire', value: -2 },
        { label: 'SWADE.UnstablePlatform', value: -2 },
        { label: 'SWADE.Encumbered', value: -2 },
        { label: 'SWADE.OffHandPenalty', value: -2 },
      ],
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

  imagedrop: {
    height: number;
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
    id: string;
    title: string;
    settings: Array<string>;
  };

  diceConfig: {
    id: string;
    title: string;
    flags: Record<string, any>;
  };

  actionCardEditor: {
    id: string;
  };

  statusEffects: StatusEffect[];

  wildCardIcons: {
    regular: string;
    compendium: string;
  };

  measuredTemplatePresets: Array<TemplateConfig>;

  activeMeasuredTemplatePreview: SwadeMeasuredTemplate | null;

  abilitySheet: Record<AbilitySubType, { dropdown: string; abilities: string }>;

  prototypeRollGroups: TraitRollModifierGroup[];

  ranks: string[];
}
