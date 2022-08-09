export const constants = {
  ARMOR_LOCATIONS: {
    HEAD: 'head',
    TORSO: 'torso',
    LEGS: 'legs',
    ARMS: 'arms',
  },
  TEMPLATE_PRESET: {
    CONE: 'swcone',
    SBT: 'sbt',
    MBT: 'mbt',
    LBT: 'lbt',
  },
  STATUS_EFFECT_EXPIRATION: {
    StartOfTurnAuto: 0,
    StartOfTurnPrompt: 1,
    EndOfTurnAuto: 2,
    EndOfTurnPrompt: 3,
  },
  ADVANCE_TYPE: {
    EDGE: 0,
    SINGLE_SKILL: 1,
    TWO_SKILLS: 2,
    ATTRIBUTE: 3,
    HINDRANCE: 4,
  },
  RANK: {
    NOVICE: 0,
    SEASONED: 1,
    VETERAN: 2,
    HEROIC: 3,
    LEGENDARY: 4,
  },
  EQUIP_STATE: {
    STORED: 0,
    CARRIED: 1,
    OFF_HAND: 2,
    EQUIPPED: 3,
    MAIN_HAND: 4,
    TWO_HANDS: 5,
  } as const,
};
