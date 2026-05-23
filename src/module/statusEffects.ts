import { constants } from './constants';

/** @internal */
export const statusEffects: Record<string, CONFIG.StatusEffect> = {
  shaken: {
    img: 'systems/swade/assets/icons/status/status_shaken.svg',
    id: 'shaken',
    _id: 'shaken0000000000',
    name: 'SWADE.Shaken',
    duration: {
      value: 0,
      units: 'rounds',
      expiry: 'turnStartPrompt',
    },
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    system: {
      loseTurnOnHold: true,
    },
  },
  incapacitated: {
    img: 'icons/svg/stoned.svg',
    id: 'incapacitated',
    _id: 'incapacitated000',
    name: 'SWADE.Incap',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  dead: {
    img: 'icons/svg/skull.svg',
    id: 'dead',
    _id: 'dead000000000000',
    name: 'COMBATANT.FIELDS.defeated.label',
    statuses: ['incapacitated'],
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  aiming: {
    img: 'systems/swade/assets/icons/status/status_aiming.svg',
    id: 'aiming',
    _id: 'aiming0000000000',
    name: 'SWADE.Aiming',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  berserk: {
    img: 'systems/swade/assets/icons/status/status_enraged.svg',
    id: 'berserk',
    _id: 'berserk000000000',
    name: 'SWADE.Berserk',
    duration: {
      value: 10,
      units: 'rounds',
      expiry: 'turnEndPrompt',
    },
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    system: {
      changes: [
        {
          key: 'system.attributes.strength.die.sides',
          value: '2',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD,
        },
        {
          key: 'system.stats.toughness.value',
          value: '2',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD,
        },
        {
          key: 'system.wounds.ignored',
          value: '1',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD,
        },
      ],
    },
  },
  'wild-attack': {
    img: 'systems/swade/assets/icons/status/status_wild_attack.svg',
    id: 'wild-attack',
    _id: 'wildattack000000',
    name: 'SWADE.WildAttack',
    duration: {
      value: 0,
      units: 'rounds',
      expiry: 'turnEnd',
    },
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    system: {
      changes: [
        {
          key: 'system.stats.globalMods.attack',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD,
          value: '2',
        },
        {
          key: 'system.stats.globalMods.damage',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD,
          value: '2',
        },
      ],
    },
    flags: { swade: { related: { vulnerable: {} } } },
  },
  defending: {
    img: 'systems/swade/assets/icons/status/status_defending.svg',
    id: 'defending',
    _id: 'defending0000000',
    name: 'SWADE.Defending',
    duration: {
      value: 1,
      units: 'rounds',
      expiry: 'turnStart',
    },
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    system: {
      changes: [
        {
          key: 'system.stats.parry.value',
          value: '4',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD,
        },
      ],
    },
  },
  holding: {
    img: 'systems/swade/assets/icons/status/status_holding.svg',
    id: 'holding',
    _id: 'holding000000000',
    name: 'SWADE.Holding',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  bound: {
    img: 'systems/swade/assets/icons/status/status_bound.svg',
    id: 'bound',
    _id: 'bound00000000000',
    name: 'SWADE.Bound',
    flags: { swade: { related: { entangled: {} } } },
    statuses: ['distracted'],
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  entangled: {
    img: 'systems/swade/assets/icons/status/status_entangled.svg',
    id: 'entangled',
    _id: 'entangled0000000',
    name: 'SWADE.Entangled',
    statuses: ['vulnerable'],
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  frightened: {
    img: 'systems/swade/assets/icons/status/status_frightened.svg',
    id: 'frightened',
    _id: 'frightened000000',
    name: 'SWADE.Frightened',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    system: {
      changes: [
        {
          key: 'system.initiative.hasHesitant',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.OVERRIDE,
          value: 'true',
          priority: 99, //High priority to make sure the effect overrides existing effects
        },
        {
          key: 'system.initiative.hasLevelHeaded',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.OVERRIDE,
          value: 'false',
          priority: 99, //High priority to make sure the effect overrides existing effects
        },
        {
          key: 'system.initiative.hasImpLevelHeaded',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.OVERRIDE,
          value: 'false',
          priority: 99, //High priority to make sure the effect overrides existing effects
        },
        {
          key: 'system.initiative.hasQuick',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.OVERRIDE,
          value: 'false',
          priority: 99, //High priority to make sure the effect overrides existing effects
        },
      ],
    },
  },
  distracted: {
    img: 'systems/swade/assets/icons/status/status_distracted.svg',
    id: 'distracted',
    _id: 'distracted000000',
    name: 'SWADE.Distr',
    duration: {
      value: 1,
      units: 'rounds',
      expiry: 'turnEnd',
    },
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  encumbered: {
    img: 'systems/swade/assets/icons/status/status_encumbered.svg',
    id: 'encumbered',
    _id: 'encumbered000000',
    name: 'SWADE.Encumbered',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  prone: {
    img: 'systems/swade/assets/icons/status/status_prone.svg',
    id: 'prone',
    _id: 'prone00000000000',
    name: 'SWADE.Prone',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    system: {
      changes: [
        {
          key: 'system.stats.parry.value',
          value: '-2',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD,
        },
        {
          key: '@Skill{Fighting}[system.die.modifier]',
          value: '-2',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD,
        },
      ],
    },
  },
  stunned: {
    img: 'systems/swade/assets/icons/status/status_stunned.svg',
    id: 'stunned',
    _id: 'stunned000000000',
    name: 'SWADE.Stunned',
    duration: {
      value: 0,
      units: 'rounds',
      expiry: 'turnStartPrompt',
    },
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    system: {
      loseTurnOnHold: true,
    },
    flags: {
      swade: {
        related: {
          distracted: {},
          prone: {},
        },
      },
    },
    statuses: ['vulnerable'],
  },
  vulnerable: {
    img: 'systems/swade/assets/icons/status/status_vulnerable.svg',
    id: 'vulnerable',
    _id: 'vulnerable000000',
    name: 'SWADE.Vuln',
    duration: {
      value: 1,
      units: 'rounds',
      expiry: 'turnEnd',
    },
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  'bleeding-out': {
    img: 'systems/swade/assets/icons/status/status_bleeding_out.svg',
    id: 'bleeding-out',
    _id: 'bleedingout00000',
    name: 'SWADE.BleedingOut',
    duration: {
      value: 0,
      units: 'rounds',
      expiry: 'turnStartPrompt',
    },
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  diseased: {
    img: 'systems/swade/assets/icons/status/status_diseased.svg',
    id: 'diseased',
    _id: 'diseased00000000',
    name: 'SWADE.Diseased',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  'heart-attack': {
    img: 'systems/swade/assets/icons/status/status_heart_attack.svg',
    id: 'heart-attack',
    _id: 'heartattack00000',
    name: 'SWADE.HeartAttack',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  'on-fire': {
    img: 'systems/swade/assets/icons/status/status_on_fire.svg',
    id: 'on-fire',
    _id: 'onfire0000000000',
    name: 'SWADE.OnFire',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  poisoned: {
    img: 'systems/swade/assets/icons/status/status_poisoned.svg',
    id: 'poisoned',
    _id: 'poisoned00000000',
    name: 'SWADE.Poisoned',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  'cover-shield': {
    img: 'systems/swade/assets/icons/status/status_cover_shield.svg',
    id: 'cover-shield',
    _id: 'covershield00000',
    name: 'SWADE.Cover.Shield',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  cover: {
    img: 'systems/swade/assets/icons/status/status_cover.svg',
    id: 'cover',
    _id: 'cover00000000000',
    name: 'SWADE.Cover._name',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  reach: {
    img: 'systems/swade/assets/icons/status/status_reach.svg',
    id: 'reach',
    _id: 'reach00000000000',
    name: 'SWADE.Reach',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  torch: {
    img: 'systems/swade/assets/icons/status/status_torch.svg',
    id: 'torch',
    _id: 'torch00000000000',
    name: 'SWADE.Torch',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  burrowing: {
    img: 'systems/swade/assets/icons/status/status_burrowing.svg',
    id: 'burrowing',
    _id: 'burrowing0000000',
    name: 'SWADE.Burrowing',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    system: {
      changes: [
        {
          key: 'system.pace.base',
          value: 'burrow',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.OVERRIDE,
        },
      ],
    },
  },
  flying: {
    img: 'systems/swade/assets/icons/status/status_flying.svg',
    id: 'flying',
    _id: 'flying0000000000',
    name: 'SWADE.Flying',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    system: {
      changes: [
        {
          key: 'system.pace.base',
          value: 'fly',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.OVERRIDE,
        },
      ],
    },
  },
  invisible: {
    id: 'invisible',
    _id: 'invisible0000000',
    name: 'EFFECT.StatusInvisible',
    img: 'icons/svg/invisible.svg',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  blind: {
    img: 'icons/svg/blind.svg',
    id: 'blind',
    _id: 'blind00000000000',
    name: 'EFFECT.StatusBlind',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  'cold-bodied': {
    img: 'systems/swade/assets/icons/status/status_coldbodied.svg',
    id: 'cold-bodied',
    _id: 'coldbodied000000',
    name: 'SWADE.ColdBodied',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  smite: {
    img: 'systems/swade/assets/icons/status/status_smite.svg',
    id: 'smite',
    _id: 'smite00000000000',
    name: 'SWADE.Smite',
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
  },
  protection: {
    img: 'systems/swade/assets/icons/status/status_protection.svg',
    id: 'protection',
    _id: 'protection000000',
    name: 'SWADE.Protection',
    duration: {
      value: 5,
      units: 'rounds',
      expiry: 'turnEndPrompt',
    },
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    system: {
      changes: [
        {
          key: 'system.stats.toughness.value',
          value: '0',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD,
        },
        {
          key: 'system.stats.toughness.armor',
          value: '0',
          type: constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD,
        },
      ],
    },
  },
};
