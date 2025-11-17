import { PhysicalItem } from '../globals';

/* eslint-disable @typescript-eslint/naming-convention */
export const constants = {
  /** @enum */
  ARMOR_LOCATIONS: {
    HEAD: 'head',
    TORSO: 'torso',
    LEGS: 'legs',
    ARMS: 'arms',
  },
  /** @enum */
  TEMPLATE_PRESET: {
    CONE: 'swcone',
    SCONE: 'swscone',
    STREAM: 'stream',
    SBT: 'sbt',
    MBT: 'mbt',
    LBT: 'lbt',
  },
  /** @enum */
  STATUS_EFFECT_EXPIRATION: {
    StartOfTurnAuto: 0,
    StartOfTurnPrompt: 1,
    EndOfTurnAuto: 2,
    EndOfTurnPrompt: 3,
  },
  /** @enum */
  ADVANCE_TYPE: {
    EDGE: 0,
    SINGLE_SKILL: 1,
    TWO_SKILLS: 2,
    ATTRIBUTE: 3,
    HINDRANCE: 4,
  },
  /** @enum */
  RANK: {
    NOVICE: 0,
    SEASONED: 1,
    VETERAN: 2,
    HEROIC: 3,
    LEGENDARY: 4,
  },
  /** @enum */
  EQUIP_STATE: {
    STORED: 0,
    CARRIED: 1,
    OFF_HAND: 2,
    EQUIPPED: 3,
    MAIN_HAND: 4,
    TWO_HANDS: 5,
  } as const,
  /**
   * Array position corresponds to value of EQUIP_STATE
   * @enum
   */
  EQUIP_STATE_ICONS: [
    'fas fa-archive',
    'fas fa-shopping-bag',
    'fas fa-hand-paper',
    'fas fa-tshirt',
    'fas fa-hand-paper fa-flip-horizontal',
    'fas fa-sign-language',
  ],
  /** @enum */
  RELOAD_TYPE: {
    NONE: 'none',
    SELF: 'self',
    SINGLE: 'single',
    FULL: 'full',
    MAGAZINE: 'magazine',
    BATTERY: 'battery',
    PP: 'pp',
  } as const,
  /** @enum */
  GRANT_ON: {
    ADDED: 0,
    CARRIED: 1,
    READIED: 2,
  } as const,
  /** @enum */
  CONSUMABLE_TYPE: {
    REGULAR: 'regular',
    MAGAZINE: 'magazine',
    BATTERY: 'battery',
  } as const,
  /** @enum */
  ABILITY_TYPE: {
    SPECIAL: 'special',
    ARCHETYPE: 'archetype',
  } as const,
  /** @enum */
  ACTION_TYPE: {
    TRAIT: 'trait',
    DAMAGE: 'damage',
    RESIST: 'resist',
    MACRO: 'macro',
  } as const,
  /** @enum */
  MACRO_ACTOR: {
    DEFAULT: 'default',
    SELF: 'self',
    TARGET: 'target',
  } as const,
  /** @enum */
  ROLL_RESULT: {
    CRITFAIL: -1,
    FAIL: 0,
    SUCCESS: 1,
    RAISE: 2,
  } as const,
  /** @enum */
  ROLL_TYPE: {
    ANY: 0,
    TRAIT: 1,
    ATTACK: 2,
    DAMAGE: 3,
  } as const,
  /** @enum */
  ADDITIONAL_STATS_TYPE: {
    STRING: 'String',
    NUMBER: 'Number',
    BOOLEAN: 'Boolean',
    DIE: 'Die',
    SELECT: 'Selection',
  } as const,
  /** @enum */
  TOUR_TAB_PARENTS: {
    SIDEBAR: 'sidebar',
    GAMESETTINGS: 'settings',
    CONFIGURATOR: 'configurator',
    ACTOR: 'actor',
    ITEM: 'item',
    TWEAKS: 'tweaks',
  } as const,
  /** @enum */
  REQUIREMENT_TYPE: {
    WILDCARD: 'wildCard',
    RANK: 'rank',
    ATTRIBUTE: 'attribute',
    SKILL: 'skill',
    EDGE: 'edge',
    HINDRANCE: 'hindrance',
    ANCESTRY: 'ancestry',
    POWER: 'power',
    OTHER: 'other',
  } as const,
  /** @enum */
  RESERVED_SWID: {
    DEFAULT: 'none',
    ANY: 'any',
  } as const,
  /** @enum */
  HINDRANCE_SEVERITY: {
    MAJOR: 'major',
    MINOR: 'minor',
    EITHER: 'either',
  } as const,
  /** @enum */
  WEAPON_RANGE_TYPE: {
    MELEE: 0,
    RANGED: 1,
    MIXED: 2,
  } as const,
  /** @enum */
  INIT_MESSAGE_TYPE: {
    OFF: 'off',
    COMPACT: 'compact',
    LARGE: 'large',
  } as const,
  /** @enum */
  ARMOR_STACKING: {
    CORE: 'core',
    SWPF: 'swpf',
  } as const,
  /**@enum */
  SUPPLY_LEVEL: {
    VERY_HIGH: 3,
    HIGH: 2,
    LOW: 1,
    OUT: 0,
  } as const,
  PHYSICAL_ITEMS: [
    'weapon',
    'armor',
    'shield',
    'consumable',
    'gear',
  ] as PhysicalItem[],
  CREW_ROLE: {
    OPERATOR: 'operator',
    GUNNER: 'gunner',
    OTHER: 'other',
  },
  RULER_COLORS: {
    GREEN: 0x33bc4e,
    YELLOW: 0xf1d836,
    ORANGE: 0xffa500,
    RED: 0xe72124,
  } as const,
};
