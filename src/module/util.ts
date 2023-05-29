import { StatusEffect } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import { RollModifier } from '../interfaces/additional.interface';
import { SWADE } from './config';
import { constants } from './constants';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';

/**
 * A simple function to allow quick access to an item such as a skill or weapon. Skills are rolled while other items are posted to the chat as a chatcard
 * @param itemName the name of the item that should be called
 */
export function rollItemMacro(itemName: string) {
  const speaker = ChatMessage.getSpeaker();
  let actor: SwadeActor | undefined = undefined;
  if (speaker.token) actor = game.actors?.tokens[speaker.token];
  if (!actor && speaker.actor) actor = game.actors?.get(speaker.actor);
  if (!actor || !actor.isOwner) {
    return null;
  }
  const item = actor.items.getName(itemName);
  if (!item) {
    ui.notifications.warn(
      `Your controlled Actor does not have an item named ${itemName}`,
    );
    return null;
  }
  //Roll the skill
  if (item.type === 'skill') {
    return item.roll();
  } else {
    // Show the item
    return item.show();
  }
}

/**
 * @internal
 * @param string The string to look for
 * @param localize Switch which determines if the string is a localization key
 */
export function notificationExists(string: string, localize = false): boolean {
  let stringToFind = string;
  if (localize) stringToFind = game.i18n.localize(string);
  const active = ui.notifications.active || [];
  return active.some((n) => n.text() === stringToFind);
}

/** @internal */
export async function shouldShowBennyAnimation(): Promise<boolean> {
  const value = game.user?.getFlag('swade', 'dsnShowBennyAnimation');
  const defaultValue = getProperty(
    SWADE,
    'diceConfig.flags.dsnShowBennyAnimation.default',
  ) as boolean;

  if (typeof value === 'undefined') {
    await game.user?.setFlag('swade', 'dsnShowBennyAnimation', defaultValue);
    return defaultValue;
  } else {
    return value;
  }
}

/**
 * @internal
 * @param traitName The name of the trait to be found
 * @param actor The actor to find it from
 * @returns Returns a string of the trait name in the data model if it's an attribute or an Item if it is a skill. If it can find neither an attribute nor a skill then it returns null
 */
export function getTrait(
  traitName: string,
  actor: SwadeActor,
): SwadeItem | string | undefined {
  let trait: SwadeItem | string | undefined = undefined;
  for (const attr of Object.keys(SWADE.attributes)) {
    const attributeName = game.i18n.localize(SWADE.attributes[attr].long);
    if (attributeName === traitName) {
      trait = attr;
    }
  }
  if (!trait) {
    trait = actor.items.find((i) => i.type === 'skill' && i.name === traitName);
  }
  return trait;
}

/** @internal */
export async function reshuffleActionDeck() {
  const deck = game.cards?.get(game.settings.get('swade', 'actionDeck'));
  await deck?.recall({ chatNotification: false });
  await deck?.shuffle({ chatNotification: false });
}

/**
 * @internal
 * A generic reducer function that can be used to reduce an array of trait roll modifiers into a string that can be parsed by the Foundry VTT Roll class
 * @param acc The accumulator string
 * @param cur The current trait roll modifier
 * @returns A string which contains all trait roll modifiers, reduced into a parsable string
 */
export function modifierReducer(acc: string, cur: RollModifier): string {
  return (acc += `${cur.value}[${cur.label}]`);
}

/** Normalize a given modifier value to a string for display and evaluation */
export function normalizeRollModifiers(mod: RollModifier): RollModifier {
  let normalizedValue: string;
  if (typeof mod.value === 'string') {
    //if the modifier starts with a reserved symbol take it as is
    if (mod.value[0].match(/[@+-]/)) {
      normalizedValue = mod.value;
    } else if (Number.isNumeric(mod.value)) {
      normalizedValue = mod.value ? Number(mod.value).signedString() : '+0';
    } else {
      normalizedValue = '+' + mod.value;
    }
  } else if (typeof mod.value === 'number') {
    normalizedValue = mod.value.signedString();
  } else {
    throw new Error('Invalid modifier value ' + mod.value);
  }
  return {
    value: normalizedValue,
    label: mod.label,
    ignore: mod.ignore,
  };
}

/** @internal */
export function firstOwner(doc) {
  /* null docs could mean an empty lookup, null docs are not owned by anyone */
  if (!doc) return null;
  const ownership: Ownership =
    (doc instanceof TokenDocument ? doc.actor?.ownership : doc.ownership) ?? {};
  const playerOwners = Object.entries(ownership)
    .filter(([id, level]) => {
      const user = game.users?.get(id);
      return (
        user?.active &&
        !user.isGM &&
        level === CONST.DOCUMENT_PERMISSION_LEVELS.OWNER
      );
    })
    .map(([id, _level]) => id);

  if (playerOwners.length > 0) {
    return game.users?.get(playerOwners[0]);
  }

  /* if no online player owns this actor, fall back to first GM */
  return firstGM();
}

/**
 * @internal
 * Players first, then GM
 */
export function isFirstOwner(doc) {
  return game.userId === firstOwner(doc)?.id;
}

/** @internal */
export function firstGM() {
  return game.users?.find((u) => u.isGM && u.active);
}

/** @internal */
export function isFirstGM() {
  return game.userId === firstGM()?.id;
}

/** @internal */
export function getRankFromAdvance(advance: number): number {
  if (advance <= 3) {
    return constants.RANK.NOVICE;
  } else if (advance.between(4, 7)) {
    return constants.RANK.SEASONED;
  } else if (advance.between(8, 11)) {
    return constants.RANK.VETERAN;
  } else if (advance.between(12, 15)) {
    return constants.RANK.HEROIC;
  } else {
    return constants.RANK.LEGENDARY;
  }
}

/** @internal */
export function getRankFromAdvanceAsString(advance: number): string {
  return game.i18n.localize(SWADE.ranks[getRankFromAdvance(advance)]);
}

/**
 * @internal
 * @param textToCopy
 */
export async function copyToClipboard(textToCopy: string) {
  await game.clipboard.copyPlainText(textToCopy);
  ui.notifications.info('Copied to clipboard');
}

/** @internal */
export function getStatusEffectDataById(idToSearchFor: string) {
  const filter = (e: StatusEffect) => e.id === idToSearchFor;
  let data = CONFIG.statusEffects.find(filter);
  //fallback for when the effect doesn't exist in the global object
  if (!data) data = SWADE.statusEffects.find(filter);
  return data as StatusEffect;
}

/** @internal */
export function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}

/** @internal */
export function deepFreeze<T>(o: T) {
  Object.values(o).forEach((v) => Object.isFrozen(v) || deepFreeze(v));
  return Object.freeze(o);
}

/** @internal */
export function setupFantasyCompanionEntangle() {
  const index = CONFIG.statusEffects.findIndex((v) => v.id === 'entangled');
  const entangled = CONFIG.statusEffects[index];
  if (index < 0) return;
  const changes = [
    {
      key: 'data.status.isEntangled',
      mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: 'true',
    },
    {
      key: 'data.status.isVulnerable',
      mode: foundry.CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: 'true',
    },
  ];

  CONFIG.statusEffects[index] = foundry.utils.mergeObject(entangled, {
    changes,
  });
}

/** @internal */
export function isObject(value) {
  return !!value && typeof value === 'object';
}

/** Separates an array into a series of smaller arrays of a given size */
export function chunkArray<T>(array: T[], size: number): Array<T[]> {
  const result: Array<T[]> = [];
  for (let i = 0; i < array.length; i += size) {
    const chunk = array.slice(i, i + size);
    result.push(chunk);
  }
  return result;
}

/** Maps a number from a given range to an equivalent number of another range */
export function mapRange(
  num: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMin === inMax || outMin === outMax) return 0;
  const mapped = ((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  return Math.clamped(mapped, outMin, outMax);
}

type Ownership = Record<string, number>;
