import { StatusEffect } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import { constants } from './constants';

/** @internal */
export const statusEffects: StatusEffect[] = [
  {
    icon: 'systems/swade/assets/icons/status/status_shaken.svg',
    id: 'shaken',
    label: 'SWADE.Shaken',
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'data.status.isShaken',
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
    icon: 'icons/svg/skull.svg',
    id: 'incapacitated',
    label: 'SWADE.Incap',
    changes: [
      {
        key: 'system.status.isIncapacitated',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
  },
  {
    icon: 'systems/swade/assets/icons/status/status_aiming.svg',
    id: 'aiming',
    label: 'SWADE.Aiming',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_enraged.svg',
    id: 'berserk',
    label: 'SWADE.Berserk',
    duration: {
      rounds: 10,
    },
    changes: [
      {
        key: 'data.attributes.strength.die.sides',
        value: '2',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.stats.toughness.value',
        value: '2',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.wounds.ignored',
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
    icon: 'systems/swade/assets/icons/status/status_defending.svg',
    id: 'defending',
    label: 'SWADE.Defending',
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'data.stats.parry.modifier',
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
    icon: 'systems/swade/assets/icons/status/status_flying.svg',
    id: 'flying',
    label: 'SWADE.Flying',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_holding.svg',
    id: 'holding',
    label: 'SWADE.Holding',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_bound.svg',
    id: 'bound',
    label: 'SWADE.Bound',
    changes: [
      {
        key: 'data.status.isBound',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
      {
        key: 'data.status.isDistracted',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
      {
        key: 'data.status.isVulnerable',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
  },
  {
    icon: 'systems/swade/assets/icons/status/status_entangled.svg',
    id: 'entangled',
    label: 'SWADE.Entangled',
    changes: [
      {
        key: 'data.status.isEntangled',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
      {
        key: 'data.status.isDistracted',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
    ],
  },
  {
    icon: 'systems/swade/assets/icons/status/status_frightened.svg',
    id: 'frightened',
    label: 'SWADE.Frightened',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_distracted.svg',
    id: 'distracted',
    label: 'SWADE.Distr',
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'data.status.isDistracted',
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
    icon: 'systems/swade/assets/icons/status/status_encumbered.svg',
    id: 'encumbered',
    label: 'SWADE.Encumbered',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_prone.svg',
    id: 'prone',
    label: 'SWADE.Prone',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_stunned.svg',
    id: 'stunned',
    label: 'SWADE.Stunned',
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'data.status.isStunned',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
      {
        key: 'data.status.isDistracted',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
        value: 'true',
      },
      {
        key: 'data.status.isVulnerable',
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
    icon: 'systems/swade/assets/icons/status/status_vulnerable.svg',
    id: 'vulnerable',
    label: 'SWADE.Vuln',
    duration: {
      rounds: 1,
    },
    changes: [
      {
        key: 'data.status.isVulnerable',
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
    icon: 'systems/swade/assets/icons/status/status_bleeding_out.svg',
    id: 'bleeding-out',
    label: 'SWADE.BleedingOut',
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
    icon: 'systems/swade/assets/icons/status/status_diseased.svg',
    id: 'diseased',
    label: 'SWADE.Diseased',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_heart_attack.svg',
    id: 'heart-attack',
    label: 'SWADE.HeartAttack',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_on_fire.svg',
    id: 'on-fire',
    label: 'SWADE.OnFire',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_poisoned.svg',
    id: 'poisoned',
    label: 'SWADE.Poisoned',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_cover_shield.svg',
    id: 'cover-shield',
    label: 'SWADE.Cover.Shield',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_cover.svg',
    id: 'cover',
    label: 'SWADE.Cover._name',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_reach.svg',
    id: 'reach',
    label: 'SWADE.Reach',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_torch.svg',
    id: 'torch',
    label: 'SWADE.Torch',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_invisible.svg',
    id: 'invisible',
    label: 'SWADE.Invisible',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_coldbodied.svg',
    id: 'cold-bodied',
    label: 'SWADE.ColdBodied'
  },
  {
    icon: 'systems/swade/assets/icons/status/status_smite.svg',
    id: 'smite',
    label: 'SWADE.Smite',
  },
  {
    icon: 'systems/swade/assets/icons/status/status_protection.svg',
    id: 'protection',
    label: 'SWADE.Protection',
    duration: {
      rounds: 5,
    },
    changes: [
      {
        key: 'data.stats.toughness.value',
        value: '0',
        mode: foundry.CONST.ACTIVE_EFFECT_MODES.ADD,
      },
      {
        key: 'data.stats.toughness.armor',
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
