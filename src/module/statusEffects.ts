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
    system: {
      loseTurnOnHold: true,
    },
  },
  incapacitated: {
    img: 'icons/svg/stoned.svg',
    id: 'incapacitated',
    _id: 'incapacitated000',
    name: 'SWADE.Incap',
  },
  dead: {
    img: 'icons/svg/skull.svg',
    id: 'dead',
    _id: 'dead000000000000',
    name: 'COMBATANT.FIELDS.defeated.label',
    statuses: ['incapacitated'],
  },
  aiming: {
    img: 'systems/swade/assets/icons/status/status_aiming.svg',
    id: 'aiming',
    _id: 'aiming0000000000',
    name: 'SWADE.Aiming',
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
  },
  bound: {
    img: 'systems/swade/assets/icons/status/status_bound.svg',
    id: 'bound',
    _id: 'bound00000000000',
    name: 'SWADE.Bound',
    flags: { swade: { related: { entangled: {} } } },
    statuses: ['distracted'],
  },
  entangled: {
    img: 'systems/swade/assets/icons/status/status_entangled.svg',
    id: 'entangled',
    _id: 'entangled0000000',
    name: 'SWADE.Entangled',
    statuses: ['vulnerable'],
  },
  frightened: {
    img: 'systems/swade/assets/icons/status/status_frightened.svg',
    id: 'frightened',
    _id: 'frightened000000',
    name: 'SWADE.Frightened',
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
  },
  encumbered: {
    img: 'systems/swade/assets/icons/status/status_encumbered.svg',
    id: 'encumbered',
    _id: 'encumbered000000',
    name: 'SWADE.Encumbered',
  },
  prone: {
    img: 'systems/swade/assets/icons/status/status_prone.svg',
    id: 'prone',
    _id: 'prone00000000000',
    name: 'SWADE.Prone',
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
  },
  diseased: {
    img: 'systems/swade/assets/icons/status/status_diseased.svg',
    id: 'diseased',
    _id: 'diseased00000000',
    name: 'SWADE.Diseased',
  },
  'heart-attack': {
    img: 'systems/swade/assets/icons/status/status_heart_attack.svg',
    id: 'heart-attack',
    _id: 'heartattack00000',
    name: 'SWADE.HeartAttack',
  },
  'on-fire': {
    img: 'systems/swade/assets/icons/status/status_on_fire.svg',
    id: 'on-fire',
    _id: 'onfire0000000000',
    name: 'SWADE.OnFire',
  },
  poisoned: {
    img: 'systems/swade/assets/icons/status/status_poisoned.svg',
    id: 'poisoned',
    _id: 'poisoned00000000',
    name: 'SWADE.Poisoned',
  },
  'cover-shield': {
    img: 'systems/swade/assets/icons/status/status_cover_shield.svg',
    id: 'cover-shield',
    _id: 'covershield00000',
    name: 'SWADE.Cover.Shield',
  },
  cover: {
    img: 'systems/swade/assets/icons/status/status_cover.svg',
    id: 'cover',
    _id: 'cover00000000000',
    name: 'SWADE.Cover._name',
  },
  reach: {
    img: 'systems/swade/assets/icons/status/status_reach.svg',
    id: 'reach',
    _id: 'reach00000000000',
    name: 'SWADE.Reach',
  },
  torch: {
    img: 'systems/swade/assets/icons/status/status_torch.svg',
    id: 'torch',
    _id: 'torch00000000000',
    name: 'SWADE.Torch',
  },
  burrowing: {
    img: 'systems/swade/assets/icons/status/status_burrowing.svg',
    id: 'burrowing',
    _id: 'burrowing0000000',
    name: 'SWADE.Burrowing',
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
  },
  blind: {
    img: 'icons/svg/blind.svg',
    id: 'blind',
    _id: 'blind00000000000',
    name: 'EFFECT.StatusBlind',
  },
  'cold-bodied': {
    img: 'systems/swade/assets/icons/status/status_coldbodied.svg',
    id: 'cold-bodied',
    _id: 'coldbodied000000',
    name: 'SWADE.ColdBodied',
  },
  smite: {
    img: 'systems/swade/assets/icons/status/status_smite.svg',
    id: 'smite',
    _id: 'smite00000000000',
    name: 'SWADE.Smite',
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
