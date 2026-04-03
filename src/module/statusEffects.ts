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
      changes: [
        {
          key: 'system.status.isShaken',
          type: 'override',
          value: 'true',
        },
      ],
      loseTurnOnHold: true,
    },
  },
  incapacitated: {
    img: 'icons/svg/stoned.svg',
    id: 'incapacitated',
    _id: 'incapacitated000',
    name: 'SWADE.Incap',
    system: {
      changes: [
        {
          key: 'system.status.isIncapacitated',
          type: 'override',
          value: 'true',
        },
      ],
    },
  },
  dead: {
    img: 'icons/svg/skull.svg',
    id: 'dead',
    _id: 'dead000000000000',
    name: 'COMBAT.CombatantDefeated',
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
          type: 'add',
        },
        {
          key: 'system.stats.toughness.value',
          value: '2',
          type: 'add',
        },
        {
          key: 'system.wounds.ignored',
          value: '1',
          type: 'add',
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
          key: 'system.status.isVulnerable',
          type: 'override',
          value: 'true',
        },
        {
          key: 'system.stats.globalMods.attack',
          type: 'add',
          value: '2',
        },
        {
          key: 'system.stats.globalMods.damage',
          type: 'add',
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
          type: 'add',
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
    system: {
      changes: [
        {
          key: 'system.status.isBound',
          type: 'override',
          value: 'true',
        },
        {
          key: 'system.status.isDistracted',
          type: 'override',
          value: 'true',
        },
      ],
    },
    flags: { swade: { related: { entangled: {} } } },
    statuses: ['distracted'], // , 'entangled' // TODO: After status effect handling rework
  },
  entangled: {
    img: 'systems/swade/assets/icons/status/status_entangled.svg',
    id: 'entangled',
    _id: 'entangled0000000',
    name: 'SWADE.Entangled',
    system: {
      changes: [
        {
          key: 'system.status.isEntangled',
          type: 'override',
          value: 'true',
        },
        {
          key: 'system.status.isVulnerable',
          type: 'override',
          value: 'true',
        },
      ],
    },
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
          type: 'override',
          value: 'true',
          priority: 99, //High priority to make sure the effect overrides existing effects
        },
        {
          key: 'system.initiative.hasLevelHeaded',
          type: 'override',
          value: 'false',
          priority: 99, //High priority to make sure the effect overrides existing effects
        },
        {
          key: 'system.initiative.hasImpLevelHeaded',
          type: 'override',
          value: 'false',
          priority: 99, //High priority to make sure the effect overrides existing effects
        },
        {
          key: 'system.initiative.hasQuick',
          type: 'override',
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
    system: {
      changes: [
        {
          key: 'system.status.isDistracted',
          type: 'override',
          value: 'true',
        },
      ],
    },
  },
  encumbered: {
    img: 'systems/swade/assets/icons/status/status_encumbered.svg',
    id: 'encumbered',
    _id: 'encumbered000000',
    name: 'SWADE.Encumbered',
    system: {
      changes: [
        {
          key: 'system.details.encumbrance.isEncumbered',
          type: 'override',
          value: 'true',
        },
      ],
    },
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
          type: 'add',
        },
        {
          key: '@Skill{Fighting}[system.die.modifier]',
          value: '-2',
          type: 'add',
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
      changes: [
        {
          key: 'system.status.isStunned',
          type: 'override',
          value: 'true',
        },
        {
          key: 'system.status.isVulnerable',
          type: 'override',
          value: 'true',
        }
      ],
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
    statuses: ['vulnerable'], // TODO: After status effect handling rework
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
    system: {
      changes: [
        {
          key: 'system.status.isVulnerable',
          type: 'override',
          value: 'true',
        },
      ],
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
          type: 'override',
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
          type: 'override',
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
          type: 'add',
        },
        {
          key: 'system.stats.toughness.armor',
          value: '0',
          type: 'add',
        },
      ],
    },
  },
};
