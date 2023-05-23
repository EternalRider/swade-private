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
  RELOAD_TYPE: {
    NONE: 'none',
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
  } as const
};
