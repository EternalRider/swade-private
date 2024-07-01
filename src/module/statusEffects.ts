import { StatusEffect } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import { constants } from './constants';

/** @internal */
export const statusEffects: StatusEffect[] = [
  {
    img: 'systems/swade/assets/icons/status/status_shaken.svg',
    id: 'shaken',
    _id: 'shaken0000000000',
    name: 'SWADE.Shaken',
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'system.status.isShaken',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
    flags: {
      swade: {
        expiration: constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
        loseTurnOnHold: true,
      },
    },
  },
  {
    img: 'icons/svg/stoned.svg',
    id: 'incapacitated',
    _id: 'incapacitated000',
    name: 'SWADE.Incap',
    changes: [
      {
        key: 'system.status.isIncapacitated',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
  },
  {
    img: 'icons/svg/skull.svg',
    id: 'dead',
    _id: 'dead000000000000',
    name: 'COMBAT.CombatantDefeated',
    flags: { swade: { related: { incapacitated: {} } } },
    // statuses: ['incapacitated'], TODO: After status effect handling rework
  },
  {
    img: 'systems/swade/assets/icons/status/status_aiming.svg',
    id: 'aiming',
    _id: 'aiming0000000000',
    name: 'SWADE.Aiming',
  },
  {
    img: 'systems/swade/assets/icons/status/status_enraged.svg',
    id: 'berserk',
    _id: 'berserk000000000',
    name: 'SWADE.Berserk',
    duration: {
      rounds: 10,
    },
    changes: [
      {
        key: 'system.attributes.strength.die.sides',
        value: '2',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'system.stats.toughness.value',
        value: '2',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'system.wounds.ignored',
        value: '1',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    flags: {
      swade: {
        expiration: constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
      },
    },
  },
  {
    img: 'systems/swade/assets/icons/status/status_wild_attack.svg',
    id: 'wild-attack',
    _id: 'wildattack000000',
    name: 'SWADE.WildAttack',
    duration: {
      rounds: 0,
    },
    changes: [
      {
        key: 'system.status.isVulnerable',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
      {
        key: 'system.stats.globalMods.attack',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
        value: '2',
      },
      {
        key: 'system.stats.globalMods.damage',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
        value: '2',
      },
    ],
    flags: {
      swade: {
        expiration: constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
      },
    },
    statuses: ['vulnerable'],
  },
  {
    img: 'systems/swade/assets/icons/status/status_defending.svg',
    id: 'defending',
    _id: 'defending0000000',
    name: 'SWADE.Defending',
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'system.stats.parry.value',
        value: '4',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    flags: {
      swade: {
        expiration: constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto,
      },
    },
  },
  {
    img: 'systems/swade/assets/icons/status/status_flying.svg',
    id: 'flying',
    _id: 'flying0000000000',
    name: 'SWADE.Flying',
  },
  {
    img: 'systems/swade/assets/icons/status/status_holding.svg',
    id: 'holding',
    _id: 'holding000000000',
    name: 'SWADE.Holding',
  },
  {
    img: 'systems/swade/assets/icons/status/status_bound.svg',
    id: 'bound',
    _id: 'bound00000000000',
    name: 'SWADE.Bound',
    changes: [
      {
        key: 'system.status.isBound',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
      {
        key: 'system.status.isDistracted',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
    flags: { swade: { related: { entangled: {} } } },
    statuses: ['distracted'], // , 'entangled' // TODO: After status effect handling rework
  },
  {
    img: 'systems/swade/assets/icons/status/status_entangled.svg',
    id: 'entangled',
    _id: 'entangled0000000',
    name: 'SWADE.Entangled',
    changes: [
      {
        key: 'system.status.isEntangled',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
      {
        key: 'system.status.isVulnerable',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
    statuses: ['vulnerable'],
  },
  {
    img: 'systems/swade/assets/icons/status/status_frightened.svg',
    id: 'frightened',
    _id: 'frightened000000',
    name: 'SWADE.Frightened',
    changes: [
      {
        key: 'system.initiative.hasHesitant',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
        priority: 99, //High priority to make sure the effect overrides existing effects
      },
      {
        key: 'system.initiative.hasLevelHeaded',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'false',
        priority: 99, //High priority to make sure the effect overrides existing effects
      },
      {
        key: 'system.initiative.hasImpLevelHeaded',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'false',
        priority: 99, //High priority to make sure the effect overrides existing effects
      },
      {
        key: 'system.initiative.hasQuick',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'false',
        priority: 99, //High priority to make sure the effect overrides existing effects
      },
    ],
  },
  {
    img: 'systems/swade/assets/icons/status/status_distracted.svg',
    id: 'distracted',
    _id: 'distracted000000',
    name: 'SWADE.Distr',
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'system.status.isDistracted',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
    flags: {
      swade: {
        expiration: constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
      },
    },
  },
  {
    img: 'systems/swade/assets/icons/status/status_encumbered.svg',
    id: 'encumbered',
    _id: 'encumbered000000',
    name: 'SWADE.Encumbered',
    changes: [
      {
        key: 'system.details.encumbrance.isEncumbered',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
  },
  {
    img: 'systems/swade/assets/icons/status/status_prone.svg',
    id: 'prone',
    _id: 'prone00000000000',
    name: 'SWADE.Prone',
    changes: [
      {
        key: 'system.stats.parry.value',
        value: '-2',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: '@Skill{Fighting}[system.die.modifier]',
        value: '-2',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
  },
  {
    img: 'systems/swade/assets/icons/status/status_stunned.svg',
    id: 'stunned',
    _id: 'stunned000000000',
    name: 'SWADE.Stunned',
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'system.status.isStunned',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
    flags: {
      swade: {
        expiration: constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
        loseTurnOnHold: true,
        related: {
          distracted: {},
          prone: {},
          vulnerable: { '-=duration': null },
        },
      },
    },
    // statuses: ['distracted', 'prone', 'vulnerable'], // TODO: After status effect handling rework
  },
  {
    img: 'systems/swade/assets/icons/status/status_vulnerable.svg',
    id: 'vulnerable',
    _id: 'vulnerable000000',
    name: 'SWADE.Vuln',
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'system.status.isVulnerable',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
    flags: {
      swade: {
        expiration: constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
      },
    },
  },
  {
    img: 'systems/swade/assets/icons/status/status_bleeding_out.svg',
    id: 'bleeding-out',
    _id: 'bleedingout00000',
    name: 'SWADE.BleedingOut',
    duration: {
      rounds: 1,
    },
    flags: {
      swade: {
        expiration: constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
      },
    },
  },
  {
    img: 'systems/swade/assets/icons/status/status_diseased.svg',
    id: 'diseased',
    _id: 'diseased00000000',
    name: 'SWADE.Diseased',
  },
  {
    img: 'systems/swade/assets/icons/status/status_heart_attack.svg',
    id: 'heart-attack',
    _id: 'heartattack00000',
    name: 'SWADE.HeartAttack',
  },
  {
    img: 'systems/swade/assets/icons/status/status_on_fire.svg',
    id: 'on-fire',
    _id: 'onfire0000000000',
    name: 'SWADE.OnFire',
  },
  {
    img: 'systems/swade/assets/icons/status/status_poisoned.svg',
    id: 'poisoned',
    _id: 'poisoned00000000',
    name: 'SWADE.Poisoned',
  },
  {
    img: 'systems/swade/assets/icons/status/status_cover_shield.svg',
    id: 'cover-shield',
    _id: 'covershield00000',
    name: 'SWADE.Cover.Shield',
  },
  {
    img: 'systems/swade/assets/icons/status/status_cover.svg',
    id: 'cover',
    _id: 'cover00000000000',
    name: 'SWADE.Cover._name',
  },
  {
    img: 'systems/swade/assets/icons/status/status_reach.svg',
    id: 'reach',
    _id: 'reach00000000000',
    name: 'SWADE.Reach',
  },
  {
    img: 'systems/swade/assets/icons/status/status_torch.svg',
    id: 'torch',
    _id: 'torch00000000000',
    name: 'SWADE.Torch',
  },
  {
    id: 'invisible',
    _id: 'invisible0000000',
    name: 'EFFECT.StatusInvisible',
    img: 'icons/svg/invisible.svg',
  },
  {
    img: 'icons/svg/blind.svg',
    id: 'blind',
    _id: 'blind00000000000',
    name: 'EFFECT.StatusBlind',
  },
  {
    img: 'systems/swade/assets/icons/status/status_coldbodied.svg',
    id: 'cold-bodied',
    _id: 'coldbodied000000',
    name: 'SWADE.ColdBodied',
  },
  {
    img: 'systems/swade/assets/icons/status/status_smite.svg',
    id: 'smite',
    _id: 'smite00000000000',
    name: 'SWADE.Smite',
  },
  {
    img: 'systems/swade/assets/icons/status/status_protection.svg',
    id: 'protection',
    _id: 'protection000000',
    name: 'SWADE.Protection',
    duration: {
      rounds: 5,
    },
    changes: [
      {
        key: 'system.stats.toughness.value',
        value: '0',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'system.stats.toughness.armor',
        value: '0',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
    ],
    flags: {
      swade: {
        expiration: constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
      },
    },
  },
];
