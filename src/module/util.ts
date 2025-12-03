import { DieSidesOption } from '../globals';
import { RollModifier } from '../interfaces/additional.interface';
import { Logger } from './Logger';
import { SWADE } from './config';
import { constants } from './constants';
import SwadeUser from './documents/SwadeUser';
import SwadeActor, { BestNonStackingMods } from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
import { VehicleData } from './data/actor';

/**
 * @internal
 * @param string The string to look for
 * @param localize Switch which determines if the string is a localization key
 */
export function notificationExists(string: string, localize = true): boolean {
  let stringToFind = string;
  if (localize) stringToFind = game.i18n.localize(string);
  const active = ui.notifications.active || [];
  return active.some((n) => n.text() === stringToFind);
}

/** @internal */
export async function shouldShowBennyAnimation(): Promise<boolean> {
  const value = game.user?.getFlag('swade', 'dsnShowBennyAnimation');
  const defaultValue = foundry.utils.getProperty(
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
  if (!trait) {
    trait = actor.items.find(
      (i) => i.type === 'skill' && i.system.swid === slugify(traitName),
    );
  }
  return trait;
}

/** @internal */
export async function reshuffleActionDeck() {
  const deck = game.cards?.get(game.settings.get('swade', 'actionDeck'));
  await deck?.recall({ chatNotification: false });
  await deck?.shuffle({ chatNotification: false });
}

/** @internal */
export async function reshuffleActionDeckIfJokerDrawn() {
  const deck = game.cards?.get(game.settings.get('swade', 'actionDeck'));
  if (deck?.isJokerDrawn()) {
    await deck?.recall({ chatNotification: false });
    await deck?.shuffle({ chatNotification: false });
    ui.notifications.info('SWADE.DeckShuffled', { localize: true });
  }
}

/**
 * @internal
 * A generic reducer function that can be used to reduce an array of trait roll modifiers into a string that can be parsed by the Foundry VTT Roll class
 * @param acc The accumulator string
 * @param cur The current trait roll modifier
 * @returns A string which contains all trait roll modifiers, reduced into a parsable string
 */
export function modifierReducer(acc: string, cur: RollModifier): string {
  if (typeof cur.value === 'string' && cur.value.startsWith('@')) {
    return (acc += '+' + cur.value);
  }
  return (acc += `${cur.value}[${cur.label}]`);
}

/** Normalize a given modifier value to a string for display and evaluation */
export function normalizeRollModifiers(mod: RollModifier): RollModifier {
  return {
    value: normalizeRollValue(mod.value),
    label: mod.label,
    ignore: mod.ignore,
  };
}

export function normalizeRollValue(value: string | number): string {
  let normalized: string;
  if (typeof value === 'string') {
    //if the modifier starts with a reserved symbol take it as is
    if (value[0].match(/[@+-]/)) {
      normalized = value;
    } else {
      //otherwise prepend a + and call it a day
      normalized = '+' + value;
    }
  } else if (typeof value === 'number') {
    normalized = signedNumberString(value);
  } else {
    throw new Error('Invalid modifier value ' + value);
  }
  return normalized;
}

export function signedNumberString(value: unknown): string {
  if (typeof value === 'number') return (value < 0 ? '' : '+') + value;
  else return '+0';
}

export function addUpModifiers(acc: number, cur: RollModifier) {
  if (cur.ignore) return acc;
  return (acc += Number(cur.value));
}

/** @internal */
export function firstOwner(doc) {
  /* null docs could mean an empty lookup, null docs are not owned by anyone */
  if (!doc) return;
  const ownership: Ownership =
    (doc instanceof TokenDocument ? doc.actor?.ownership : doc.ownership) ?? {};
  const playerOwners = Object.entries(ownership)
    .filter(([id, level]) => {
      const user = game.users?.get(id);
      return (
        user?.active &&
        !user.isGM &&
        level === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
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
  return firstOwner(doc)?.isSelf;
}

/** @internal */
export function firstGM() {
  return game.users!.activeGM as SwadeUser | null;
}

/** @internal */
export function isFirstGM() {
  return firstGM()?.isSelf ?? false;
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
export function getScaleName(scaleMod: number): string {
  const modMax = 6;

  if (scaleMod < -modMax) {
    return game.i18n.format('SWADE.Scales.SmallerThan', {
      scale: getScaleName(-modMax),
    });
  }
  if (scaleMod > modMax) {
    return game.i18n.format('SWADE.Scales.LargerThan', {
      scale: getScaleName(modMax),
    });
  }
  const index = Math.floor((scaleMod + modMax) / 2);
  return SWADE.scales[index];
}

/** @internal */
export function getRankFromAdvanceAsString(advance: number): string {
  return SWADE.ranks[getRankFromAdvance(advance)];
}

/** @internal */
export async function copyToClipboard(textToCopy: string) {
  await game.clipboard.copyPlainText(textToCopy);
  ui.notifications.info('Copied to clipboard');
}

/** @internal */
export function getStatusEffectDataById(idToSearchFor: string) {
  const filter = (e: any) => e.id === idToSearchFor;
  const data =
    CONFIG.statusEffects.find(filter) || SWADE.statusEffects.find(filter);
  // Future deprecation - removing this would require deeper API changes
  // foundry.utils.logCompatibilityWarning(
  //   'You are accessing `game.swade.util.getStatusEffectDataById`. ' +
  //     'This is now deprecated in favor of `ActiveEffect.fromStatusEffect`, which returns a temporary active effect for use',
  //   {
  //     since: '4.0',
  //     until: '5.0',
  //   },
  // );
  return data as CONFIG.StatusEffect | undefined;
}
/** @internal */
export function getDieSidesRange(
  minimumSides: number,
  maximumSides: number,
): DieSidesOption[] {
  const options: DieSidesOption[] = [
    { key: 1, label: '1' },
    { key: 4, label: 'd4' },
    { key: 6, label: 'd6' },
    { key: 8, label: 'd8' },
    { key: 10, label: 'd10' },
    { key: 12, label: 'd12' },
    { key: 14, label: 'd12+1' },
    { key: 16, label: 'd12+2' },
    { key: 18, label: 'd12+3' },
    { key: 20, label: 'd12+4' },
    { key: 22, label: 'd12+5' },
    { key: 24, label: 'd12+6' },
  ];
  return options.filter((x) => x.key >= minimumSides && x.key <= maximumSides);
}

/** @internal */
export function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}

/**
 * @internal
 * @source https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze#examples
 */
export function deepFreeze(object) {
  // Retrieve the property names defined on object
  const propNames = Reflect.ownKeys(object);
  // Freeze properties before freezing self
  for (const name of propNames) {
    const value = object[name];
    if ((value && typeof value === 'object') || typeof value === 'function') {
      deepFreeze(value);
    }
  }
  return Object.freeze(object);
}

/** @internal */
export function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Separates an array into a series of smaller arrays of a given size */
export function chunkArray<T>(array: T[], size: number = 2): Array<T[]> {
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
  return Math.clamp(mapped, outMin, outMax);
}

/**
 * @param arr The array to count in
 * @param condition A function that represents a condition and returns a boolean
 * @returns the number of items in the array that fulfill the condition
 */
export function count<T>(arr: Array<T>, condition: (e: T) => boolean): number {
  return arr.filter(condition).length;
}

/** Takes an input and returns the slugged string of it. */
export function slugify(input: unknown) {
  const slugged = String(input)
    .normalize('NFKD') // split accented characters into their base characters and diacritical marks
    .replace(/[\u0300-\u036f]/g, '') // remove all the accents, which happen to be all in the \u03xx UNICODE block.
    .toLowerCase() // convert to lowercase
    .replace(/[^a-z0-9 -]/g, '') // remove non-alphanumeric characters
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .replace(/-+/g, '-') // remove consecutive hyphens
    .replace(/^-+/g, '') //remove leading hyphens
    .replace(/-+$/g, '') //remove trailing hyphens
    .trim(); // trim leading or trailing whitespace
  Logger.debug([input, slugged]);
  return slugged;
}

/**
 * Convert a template string into HTML DOM nodes
 * @param str The template string
 * @returns The template HTML
 */
export function stringToHTML<T extends Element = Element>(str: string): T {
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/html');
  return doc.body.firstElementChild as T;
}

/**
 * Converts all spaces in a string to non-breaking spaces
 * @param str The input string
 * @returns The input string with spaces replaced with non-breaking ones
 */
export function stringNonbreakingSpaces(str: string) {
  return str.replace(' ', '\u00A0');
}

/**
 * Utility function to create an HTML element for the purpose of storing embed content.
 * TODO: Evaluate if this is better somewhere else
 * @param objectToEmbed The object that the embed is for
 * @param template The handlebars template path to use
 * @param className The class name to attach to the outermost element for purposes of controlled styling
 */
export async function createEmbedElement(
  objectToEmbed: any,
  template: string,
  className: string[],
): Promise<HTMLElement | HTMLCollection | null> {
  const content = await foundry.applications.handlebars.renderTemplate(
    template,
    objectToEmbed,
  );
  const elem = document.createElement('div');
  elem.classList;
  elem.className = className.join(' ');
  elem.innerHTML = content;
  return elem;
}

/**
 * Searches world items and compendium collections for all items that match the given SWID, optionally narrowing down the search by item type
 * @param swid the swid to look for
 * @param type An optional item type for narrowing the possible list of resulting items
 * @returns a list of items that has matched the swid and type
 */
export async function getItemsBySwid<T extends Item.SubType>(
  swid: string,
  type?: T,
): Promise<SwadeItem<T>[]> {
  //get world items first
  let items: SwadeItem[] = game.items.filter((i) => i.system.swid === swid);
  //filter by type if necessary
  if (type) items = items.filter((i) => i.type === type);

  //get compendium items next
  let itemPacks = game.packs.filter((p) => p.documentName === 'Item');
  //remove system compendium
  if (SWADE.swid.ignoreSystem) {
    itemPacks = itemPacks.filter((p) => p.metadata.packageName !== 'swade');
  }
  for (const pack of itemPacks) {
    await pack.getIndex();
    const index = pack.index.filter((i) => i.system?.swid === swid);
    const ids = index.map((e) => e._id);
    if (ids.length < 1) continue;
    const query: Record<string, unknown> = { _id__in: ids };
    //filter by type if necessary
    if (type) query.type = type;
    const documents = await pack.getDocuments(query);
    items.push(...documents);
  }
  return items;
}

/**
 * Returns edge-to-edge distance of two `TokenDocument`s on the same scene
 * @param tokenA one `TokenDocument`
 * @param tokenB the other `TokenDocument`
 * @returns the distance, in whatever units the scene grid uses
 */
export function getEdgeToEdgeDistance(
  tokenA: TokenDocument,
  tokenB: TokenDocument,
): number {
  const scene = tokenA.parent;
  if (!scene) return 0;
  const conversionFactor = scene.grid.distance / scene.grid.size;
  const combinedRadii =
    tokenA.object!.externalRadius + tokenB.object!.externalRadius;
  const distance = scene.grid.measurePath([
    tokenA.getCenterPoint(),
    tokenB.getCenterPoint(),
  ]).distance;
  return distance - combinedRadii * conversionFactor;
}

/**
 *
 * @param sourceToken     The attacking token
 * @param targetToken     The token being targeted for the purposes of determining modifiers
 * @param item            The item being used for the attack
 * @param isRangedAttack  `true` if ranged weapon or mixed with non-`fighting` skill
 * @param isMeleeAttack   `true` if melee weapon or mixed with `fighting` skill
 * @returns A list of modifiers to be applied, and an object with the best non-stacking modifiers (e.g. illumination and darkness)
 */
export function getDefaultAttackModifiers(
  sourceToken: TokenDocument | undefined | undefined,
  targetToken: TokenDocument | undefined,
  item: SwadeItem,
  isRangedAttack: boolean,
  isMeleeAttack: boolean,
): {
  additionalMods: RollModifier[];
  bestNonStackingMods: BestNonStackingMods;
} {
  const rollGroups = CONFIG.SWADE.rollModifiers;
  const rangeMods = rollGroups.range.modifiers;
  const coverMods = rollGroups.cover.modifiers;
  const illuminationMods = rollGroups.illumination.modifiers;

  const additionalMods: RollModifier[] = [];
  let currActor = sourceToken?.actor || item.actor!;
  let vehicleActor: SwadeActor | undefined;
  if (currActor.system instanceof VehicleData && item.type === 'weapon') {
    vehicleActor = currActor;
    const gunner = currActor.system.getCrewMemberForWeapon(
      item as SwadeItem<'weapon'>,
    );
    currActor = gunner ?? currActor.system.operator ?? currActor;
  }

  // Attacker Attack Modifiers (Active Effects)
  const attackerGlobalMods = foundry.utils.getProperty(
    currActor,
    'system.stats.globalMods',
  ) as any;

  if (
    isRangedAttack &&
    attackerGlobalMods?.attackRanged &&
    Array.isArray(attackerGlobalMods.attackRanged)
  ) {
    additionalMods.push(
      ...attackerGlobalMods.attackRanged.map((m: any) => ({
        label: m.label,
        value: m.value,
      })),
    );
  }
  if (
    isMeleeAttack &&
    attackerGlobalMods?.attackMelee &&
    Array.isArray(attackerGlobalMods.attackMelee)
  ) {
    additionalMods.push(
      ...attackerGlobalMods.attackMelee.map((m: any) => ({
        label: m.label,
        value: m.value,
      })),
    );
  }

  if (vehicleActor) {
    const vehicleGlobalMods = foundry.utils.getProperty(
      vehicleActor,
      'system.stats.globalMods',
    ) as any;
    if (
      isRangedAttack &&
      vehicleGlobalMods?.attackRanged &&
      Array.isArray(vehicleGlobalMods.attackRanged)
    ) {
      additionalMods.push(
        ...vehicleGlobalMods.attackRanged.map((m: any) => ({
          label: m.label,
          value: m.value,
        })),
      );
    }
    if (
      isMeleeAttack &&
      vehicleGlobalMods?.attackMelee &&
      Array.isArray(vehicleGlobalMods.attackMelee)
    ) {
      additionalMods.push(
        ...vehicleGlobalMods.attackMelee.map((m: any) => ({
          label: m.label,
          value: m.value,
        })),
      );
    }
  }

  // Unstable Platform
  if (
    isRangedAttack &&
    sourceToken?.regions?.some((r) =>
      r.behaviors.some(
        (b) =>
          !b.disabled &&
          b.type === 'attackModifiers' &&
          b.system.unstablePlatform,
      ),
    )
  ) {
    if (currActor && !currActor.getSingleItemBySwid('steady-hands', 'edge'))
      additionalMods.push(rollGroups.attack.modifiers.unstable);
  }

  let bestIllumination: RollModifier | undefined;
  let bestCover: RollModifier | undefined;

  if (sourceToken && targetToken) {
    const targetActor = targetToken.actor;
    const scene = targetToken.parent as Scene;
    // For use with range increments & prone
    const distanceToTarget =
      scene.grid.measurePath([
        sourceToken.getCenterPoint(),
        targetToken.getCenterPoint(),
      ])?.distance ?? 0;

    // Illumination & Cover
    const targetBehaviors: RegionBehavior<'attackModifiers'>[] = Array.from(
      targetToken.regions!.map(
        (r) =>
          r.behaviors.filter(
            (b) => !b.disabled && b.type === 'attackModifiers',
          ) as RegionBehavior<'attackModifiers'>[],
      ),
    ).deepFlatten();

    if (
      isRangedAttack &&
      targetToken.hasStatusEffect('prone') &&
      distanceToTarget >= 3
    ) {
      bestCover = {
        label: 'SWADE.Cover.MediumProne',
        value: -4,
      };
    }
    for (const behavior of targetBehaviors) {
      const { illumination, cover } = behavior.system;
      if (illumination) {
        const currModifier = illuminationMods[illumination];
        if (!bestIllumination || currModifier.value < bestIllumination.value) {
          bestIllumination = currModifier;
        }
      }
      if (cover) {
        const currModifier = coverMods[cover];
        if (!bestCover || currModifier.value < bestCover.value) {
          bestCover = currModifier;
        }
      }
    }

    // Shield cover
    const equippedShields = (targetActor?.itemTypes.shield.filter(
      (i: SwadeItem<'shield'>) => i.isReadied,
    ) ?? []) as SwadeItem<'shield'>[];
    const shieldCoverMod = -equippedShields.reduce((bestCover, shield) => {
      return Math.max(shield.system.cover, bestCover);
    }, 0);
    if (shieldCoverMod) {
      if (!bestCover || (bestCover.value as number) > shieldCoverMod) {
        bestCover = {
          label: 'SWADE.Cover.Shield',
          value: shieldCoverMod,
        };
      }
    }

    // Dodge
    if (isRangedAttack) {
      const dodgeItem = targetActor?.getSingleItemBySwid('dodge', 'edge');
      if (dodgeItem && (!bestCover || (bestCover.value as number) > -2)) {
        bestCover = {
          label: dodgeItem.name,
          value: -2,
        };
      }
    }

    // Combat Acrobat
    const combatAcrobatItem = targetActor?.getSingleItemBySwid(
      'combat-acrobat',
      'edge',
    );
    if (combatAcrobatItem && !targetActor?.system.encumbered) {
      additionalMods.push({
        label: combatAcrobatItem.name,
        value: -1,
      });
    }

    // Range
    const range = item.range;
    if (range) {
      if (distanceToTarget > range.long) additionalMods.push(rangeMods.extreme);
      else if (distanceToTarget > range.medium)
        additionalMods.push(rangeMods.long);
      else if (distanceToTarget > range.short)
        additionalMods.push(rangeMods.medium);
    }

    // Vulnerable
    if (targetToken.hasStatusEffect('vulnerable'))
      additionalMods.push(rollGroups.trait.modifiers.targetVulnerable);

    // Gang-up, including (Improved) Block
    if (
      isMeleeAttack &&
      sourceToken &&
      sourceToken.disposition * targetToken.disposition === -1
    ) {
      const ignoreStatuses = ['defeated', 'incapacitated', 'stunned'];
      const numAttackerAllies = scene.tokens.filter((t) => {
        if (t.disposition !== sourceToken.disposition) return false;
        if (ignoreStatuses.some((status) => t.hasStatusEffect(status)))
          return false;
        return getEdgeToEdgeDistance(targetToken, t) < 1;
      }).length;
      const numDefenderAllies = scene.tokens.filter((t) => {
        if (t.disposition !== targetToken.disposition) return false;
        if (ignoreStatuses.some((status) => t.hasStatusEffect(status)))
          return false;
        if (getEdgeToEdgeDistance(targetToken, t) >= 1) return false;
        return getEdgeToEdgeDistance(sourceToken, t) < 1;
      }).length;
      let gangUpBonus = Math.min(4, numAttackerAllies - numDefenderAllies);

      if (
        attackerGlobalMods?.gangUp &&
        Array.isArray(attackerGlobalMods.gangUp)
      ) {
        attackerGlobalMods.gangUp.forEach((m: any) => {
          gangUpBonus += Number(m.value);
        });
      }

      if (vehicleActor) {
        const vehicleGlobalMods = foundry.utils.getProperty(
          vehicleActor,
          'system.stats.globalMods',
        ) as any;
        if (
          vehicleGlobalMods?.gangUp &&
          Array.isArray(vehicleGlobalMods.gangUp)
        ) {
          vehicleGlobalMods.gangUp.forEach((m: any) => {
            gangUpBonus += Number(m.value);
          });
        }
      }

      if (targetActor?.getSingleItemBySwid('improved-block', 'edge'))
        gangUpBonus -= 2;
      else if (targetActor?.getSingleItemBySwid('block', 'edge'))
        gangUpBonus -= 1;
      if (gangUpBonus > 0)
        additionalMods.push({
          label: 'SWADE.GangUp',
          value: gangUpBonus,
        });
    }

    // Size
    const sizeActor = item.actor?.type === 'vehicle' ? item.actor : currActor;
    const attackerScale =
      sizeActor.system.stats?.scale ?? sizeActor.system.scale ?? 0;
    const defenderScale =
      targetActor.system.stats?.scale ?? targetActor.system.scale ?? 0;
    const scaleDifference = defenderScale - attackerScale;
    if (scaleDifference !== 0) {
      additionalMods.push({
        label: 'SWADE.ScaleDifference',
        value: scaleDifference,
      });
    }

    // Target Attack Modifiers (Active Effects)
    const globalMods = foundry.utils.getProperty(
      targetActor,
      'system.stats.globalMods',
    ) as any;
    if (globalMods?.targetAttack && Array.isArray(globalMods.targetAttack)) {
      additionalMods.push(
        ...globalMods.targetAttack.map((m: any) => ({
          label: m.label,
          value: m.value,
        })),
      );
    }
    if (
      isRangedAttack &&
      globalMods?.targetAttackRanged &&
      Array.isArray(globalMods.targetAttackRanged)
    ) {
      additionalMods.push(
        ...globalMods.targetAttackRanged.map((m: any) => ({
          label: m.label,
          value: m.value,
        })),
      );
    }
    if (
      isMeleeAttack &&
      globalMods?.targetAttackMelee &&
      Array.isArray(globalMods.targetAttackMelee)
    ) {
      additionalMods.push(
        ...globalMods.targetAttackMelee.map((m: any) => ({
          label: m.label,
          value: m.value,
        })),
      );
    }
  }
  return {
    additionalMods,
    bestNonStackingMods: { bestIllumination, bestCover },
  };
}

/**
 * Utility function to handle enriched text embedding for SWADE documents.
 * Used by toEmbed methods to provide consistent behavior when config.description === true.
 */
export async function createEnrichedTextEmbed(
  description: string,
  config: TextEditor.DocumentHTMLEmbedConfig,
  options: TextEditor.EnrichmentOptions,
): Promise<HTMLElement> {
  const enrichedDescription =
    await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      description,
      options,
    );

  const elem = document.createElement('div');
  elem.className = 'swade-embed-description';
  if (config.classes) {
    elem.classList.add(...config.classes.split(' '));
  }
  elem.innerHTML = enrichedDescription;
  return elem;
}

type Ownership = Record<string, number>;
