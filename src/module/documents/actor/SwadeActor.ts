import {
  StatusEffect,
  ToggleActiveEffectOptions,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import {
  Context,
  DocumentModificationOptions,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { Attribute, ItemMetadata } from '../../../globals';
import { AuraData } from '../../../interfaces/AuraData.interface';
import IRollOptions from '../../../interfaces/RollOptions.interface';
import {
  DerivedModifier,
  RollModifier,
} from '../../../interfaces/additional.interface';
import { Logger } from '../../Logger';
import { RollDialog, RollDialogContext } from '../../apps/RollDialog';
import { AuraPointSource } from '../../canvas/AuraPointSource';
import { SWADE } from '../../config';
import { constants } from '../../constants';
import { VehicleData } from '../../data/actor';
import {
  ArmorData,
  ConsumableData,
  GearData,
  ShieldData,
  SkillData,
  WeaponData,
} from '../../data/item';
import { SwadeRoll } from '../../dice/SwadeRoll';
import { TraitRoll } from '../../dice/TraitRoll';
import WildDie from '../../dice/WildDie';
import {
  getStatusEffectDataById,
  mapRange,
  modifierReducer,
  shouldShowBennyAnimation,
} from '../../util';
import SwadeCombatant from '../combat/SwadeCombatant';
import SwadeItem from '../item/SwadeItem';
import { SwadeActorDataSource, TraitDie } from './actor-data-source';

declare global {
  interface DocumentClassConfig {
    Actor: typeof SwadeActor;
  }
  interface FlagConfig {
    swade: {
      ambidextrous?: boolean;
      auras?: Record<string, AuraData>;
      elan?: boolean;
      hardy?: boolean;
      ignoreBleedOut?: boolean;
      wildAttackDamage?: string | number;
      jokerBonus?: string | number;
    };
  }
}

export default class SwadeActor extends Actor {
  static getWoundsColor(current: number, max: number) {
    const minDegrees = 30;
    const maxDegrees = 120;
    //get the degrees on the HSV wheel, going from 30° (greenish-yellow) to 120° (green)
    const degrees = mapRange(current, 0, max, minDegrees, maxDegrees);
    //invert the degrees and map them from 0 to a third
    const hue = mapRange(maxDegrees - degrees, 0, maxDegrees, 0, 1 / 3);
    //get a usable color value with 100% saturation and 90% value
    return Color.fromHSV([hue, 1, 0.9]);
  }

  static getFatigueColor(current: number, max: number) {
    //get the angle (200°) and map it into the proper range
    const hue = mapRange(200, 0, 360, 0, 1);
    //get the value from the parameter
    const value = mapRange(current, 0, max, 0, 1);
    return Color.fromHSV([hue, value, 0.75]);
  }

  constructor(data: ActorDataConstructorData, ctx?: Context<TokenDocument>) {
    if (game.swade.ready && ctx?.pack && data._id) {
      const art = game.swade.compendiumArt.map.get(
        `Compendium.${ctx.pack}.${data._id}`,
      );
      if (art) {
        data.img = art.actor;
        const tokenArt =
          typeof art.token === 'string'
            ? { texture: { src: art.token } }
            : {
                texture: {
                  src: art.token.img,
                  scaleX: art.token.scale,
                  scaleY: art.token.scale,
                },
              };
        data.prototypeToken = mergeObject(data.prototypeToken ?? {}, tokenArt);
      }
    }
    super(data, ctx);
  }

  /** @returns true when the actor is a Wild Card */
  get isWildcard(): boolean {
    return !!this.system.wildcard;
  }

  /** @returns true when the actor has an arcane background or a special ability that grants powers. */
  get hasArcaneBackground(): boolean {
    return !!this.items.find(
      (i) =>
        (i.type === 'edge' && i.system.isArcaneBackground) ||
        (i.type === 'ability' && i.system.grantsPowers),
    );
  }

  /** @returns true when the actor is currently in combat and has drawn a joker */
  get hasJoker(): boolean {
    const combatant = this.getCombatant(game.combats?.active);
    return (combatant?.hasJoker as boolean) ?? false;
  }

  get bennies(): number {
    if (this.system instanceof VehicleData) return 0;
    return this.system.bennies.value;
  }

  /** @returns an object that contains booleans which denote the current status of the actor */
  get status() {
    return this.system.status;
  }

  get armorPerLocation(): Record<ArmorLocation, number> {
    return {
      head: this._getArmorForLocation(constants.ARMOR_LOCATIONS.HEAD),
      torso: this._getArmorForLocation(constants.ARMOR_LOCATIONS.TORSO),
      arms: this._getArmorForLocation(constants.ARMOR_LOCATIONS.ARMS),
      legs: this._getArmorForLocation(constants.ARMOR_LOCATIONS.LEGS),
    };
  }

  get hasHeavyArmor(): boolean {
    return this.itemTypes.armor.some(
      (a) =>
        !!foundry.utils.getProperty(a, 'system.isHeavyArmor') &&
        foundry.utils.getProperty(a, 'system.equipStatus') >=
          constants.EQUIP_STATE.EQUIPPED,
    );
  }

  get isUnarmored(): boolean {
    return this.itemTypes.armor.every(
      (a) =>
        foundry.utils.getProperty(a, 'system.equipStatus') <
        constants.EQUIP_STATE.EQUIPPED,
    );
  }

  /** @return whether this actor is currently encumbered, factoring in whether the rule is even enforced
   * @deprecated since version 3.2, use actor.system.encumbered instead
   */
  get isEncumbered(): boolean {
    foundry.utils.logCompatibilityWarning(
      'SwadeActor.isEncumbered is deprecated in favor of SwadeActor.system.encumbered',
      { since: '3.2', until: '4.0' },
    );
    return this.system.encumbered;
  }

  get race() {
    foundry.utils.logCompatibilityWarning(
      'The race getter has been 1 with the more appropriate ancestry getter',
      { since: '3.2', until: '4.0' },
    );
    return this.ancestry;
  }

  get ancestry(): SwadeItem | undefined {
    if (this.system instanceof VehicleData) return;
    const ancestries = this.items.filter(
      (i) =>
        i.type === 'ability' &&
        i.system.subtype === constants.ABILITY_TYPE.ANCESTRY,
    );
    if (ancestries.length > 1) {
      Logger.warn(
        `Actor ${this.name} (${this.id}) has more than one ancestry!`,
      );
    }
    return ancestries[0];
  }

  get archetype(): SwadeItem | undefined {
    if (this.system instanceof VehicleData) return;
    const archetypes = this.items.filter(
      (i) => i.type === 'ability' && i.system.subtype === 'archetype',
    );
    if (archetypes.length > 1) {
      Logger.warn(
        `Actor ${this.name} (${this.id}) has more than one archetype!`,
      );
    }
    return archetypes[0];
  }

  override get itemTypes() {
    const types: Record<string, SwadeItem[]> = Object.fromEntries(
      game.documentTypes.Item.map((t) => [t, []]),
    );
    for (const item of this.items.values()) {
      types[item.type].push(item);
    }
    //sort the items before returning them
    for (const type in types) {
      types[type].sort((a, b) => a.sort - b.sort);
    }
    return types;
  }

  get auras(): Record<string, AuraData> {
    const auras = (this.flags.swade?.auras ?? {}) as Record<string, AuraData>;
    const specialAuras = ['aura1', 'aura2'];
    let aura;
    for (const key in auras) {
      if (specialAuras.includes(key)) continue;
      aura = auras[key] ?? {};
      auras[key] = foundry.utils.mergeObject(
        aura,
        AuraPointSource.defaultData,
        { overwrite: false },
      );
    }

    //special case: the user-defined auras
    auras.aura1 = foundry.utils.mergeObject(
      auras.aura1 ?? {},
      AuraPointSource.defaultData,
      { overwrite: false },
    );
    auras.aura2 = foundry.utils.mergeObject(
      auras.aura2 ?? {},
      AuraPointSource.defaultData,
      { overwrite: false },
    );
    return auras;
  }

  override prepareEmbeddedDocuments() {
    for (const item of this.items) item.overrides = {};
    for (const effect of this.effects) {
      effect._safePrepareData();
    }
    this.applyActiveEffects();
    for (const item of this.items) {
      item._safePrepareData();
    }
  }

  override prepareDerivedData() {
    this._filterOverrides();

    /**
     * A hook event that is fired after the system has completed its data preparation and allows modules to adjust the derived data afterwards
     * @category Hooks
     * @param {SwadeActor} actor                The actor whose data is being prepared
     */
    Hooks.callAll('swadeActorPrepareDerivedData', this);
  }

  async rollAttribute(
    attribute: Attribute,
    options: IRollOptions = {},
  ): Promise<TraitRoll | null> {
    if (this.system instanceof VehicleData) return null;
    if (options.rof && options.rof > 1) {
      ui.notifications.warn(
        'Attribute Rolls with RoF greater than 1 are not currently supported',
      );
    }
    const label: string = SWADE.attributes[attribute].long;
    const abl = this.system.attributes[attribute];
    const rolls = new Array<Roll>();

    rolls.push(
      Roll.fromTerms([
        this._buildTraitDie(abl.die.sides, game.i18n.localize(label)),
      ]),
    );

    if (this.isWildcard) {
      rolls.push(Roll.fromTerms([this._buildWildDie(abl['wild-die'].sides)]));
    }

    const basePool = PoolTerm.fromRolls(rolls);
    basePool.modifiers.push('kh');

    const effects = structuredClone<RollModifier[]>([
      ...abl.effects,
      ...this.system.stats.globalMods[attribute],
      ...this.system.stats.globalMods.trait,
    ]);

    if (options.additionalMods) {
      options.additionalMods.push(...effects);
    } else {
      options.additionalMods = effects;
    }

    const modifiers = this.getTraitRollModifiers(
      abl.die,
      options,
      game.i18n.localize(label),
    );

    //add encumbrance penalty if necessary
    if (attribute === 'agility' && this.system.encumbered) {
      modifiers.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }

    const roll = TraitRoll.fromTerms([basePool]) as TraitRoll;
    roll.modifiers = modifiers;
    if ('isRerollable' in options) roll.setRerollable(options.isRerollable!);

    /**
     * A hook event that is fired before an attribute is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
     * Returning `false` in a hook callback will cancel the roll entirely
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the attribute
     * @param {String} attribute                The name of the attribute, in lower case
     * @param {TraitRoll} roll                  The built base roll, without any modifiers
     * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    const permitContinue = Hooks.callAll(
      'swadePreRollAttribute',
      this,
      attribute,
      roll,
      modifiers,
      options,
    );
    if (!permitContinue) return null;

    if (options.suppressChat) {
      // @ts-expect-error Error checking is wrong here roll is a TraitRoll
      return TraitRoll.fromTerms([
        ...roll.terms,
        ...TraitRoll.parse(
          roll.modifiers.reduce(modifierReducer, ''),
          this.getRollData(false),
        ),
      ]) as TraitRoll;
    }

    // Roll and return
    const retVal = await RollDialog.asPromise({
      roll: roll,
      mods: modifiers,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor:
        options.flavour ??
        `${game.i18n.localize(label)} ${game.i18n.localize(
          'SWADE.AttributeTest',
        )}`,
      title:
        options.title ??
        `${game.i18n.localize(label)} ${game.i18n.localize(
          'SWADE.AttributeTest',
        )}`,
      actor: this,
    });

    /**
     * A hook event that is fired after an attribute is rolled
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the attribute
     * @param {String} attribute                The name of the attribute, in lower case
     * @param {TraitRoll} roll                  The built base roll, without any modifiers
     * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.callAll(
      'swadeRollAttribute',
      this,
      attribute,
      roll,
      modifiers,
      options,
    );

    return retVal as TraitRoll | null;
  }

  async rollSkill(
    skillId: string | null | undefined,
    options: IRollOptions = { rof: 1 },
    tempSkill?: SwadeItem,
  ): Promise<TraitRoll | null> {
    if (this.system instanceof VehicleData) {
      Logger.error('Only Extras and Wildcards can roll skills!', {
        toast: true,
      });
      return null;
    }
    let skill: SwadeItem | undefined;
    skill = this.items.find((i) => i.id == skillId);
    if (tempSkill) {
      skill = tempSkill;
    }

    if (!skill) {
      return this.makeUnskilledAttempt(options);
    }

    const skillRoll = this._handleComplexSkill(skill, options);
    const roll = skillRoll[0];
    const modifiers = skillRoll[1];
    roll.modifiers = modifiers;
    if ('isRerollable' in options) roll.setRerollable(options.isRerollable!);

    //Build Flavour
    let flavour = '';
    if (options.flavour) {
      flavour = ` - ${options.flavour}`;
    }

    /**
     * A hook event that is fired before a skill is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
     * Returning `false` in a hook callback will cancel the roll entirely
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the skill
     * @param {SwadeItem} skill                 The Skill item that is being rolled
     * @param {TraitRoll} roll                  The built base roll, without any modifiers
     * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    const permitContinue = Hooks.call(
      'swadePreRollSkill',
      this,
      skill,
      roll,
      modifiers,
      options,
    );

    if (!permitContinue) return null;

    if (options.suppressChat) {
      return TraitRoll.fromTerms([
        ...roll.terms,
        ...TraitRoll.parse(
          roll.modifiers.reduce(modifierReducer, ''),
          this.getRollData(false),
        ),
      ]) as TraitRoll;
    }

    const rollDialogContext: RollDialogContext = {
      roll: roll,
      mods: modifiers,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor:
        options.flavour ??
        `${skill.name} ${game.i18n.localize('SWADE.SkillTest')}${flavour}`,
      title:
        options.title ??
        `${skill.name} ${game.i18n.localize('SWADE.SkillTest')}`,
      actor: this,
    };

    if (options.item) rollDialogContext.item = options.item;

    // Roll and return
    const retVal = await RollDialog.asPromise(rollDialogContext);

    /**
     * A hook event that is fired after a skill is rolled
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the skill
     * @param {SwadeItem} skill                 The Skill item that is being rolled
     * @param {TraitRoll} roll                  The built base roll, without any modifiers
     * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.callAll('swadeRollSkill', this, skill, roll, modifiers, options);

    return retVal as TraitRoll | null;
  }

  async rollWealthDie() {
    if (this.system instanceof VehicleData) return null;
    const die = this.system.details.wealth.die ?? 6;
    const mod = this.system.details.wealth.modifier ?? 0;
    const wildDie = this.system.details.wealth['wild-die'] ?? 6;
    if (die < 4) {
      ui.notifications.warn('SWADE.WealthDie.Broke.Hint', { localize: true });
      return null;
    }
    const rolls = [
      Roll.fromTerms([
        this._buildTraitDie(die, game.i18n.localize('SWADE.WealthDie.Label')),
      ]),
    ];
    if (this.isWildcard) {
      rolls.push(Roll.fromTerms([this._buildWildDie(wildDie)]));
    }

    const pool = PoolTerm.fromRolls(rolls);
    pool.modifiers.push('kh');

    const roll = SwadeRoll.fromTerms([pool]);
    const mods = [{ label: 'Modifier', value: mod }];
    roll.modifiers = mods;

    return RollDialog.asPromise({
      roll: roll,
      mods: mods,
      speaker: ChatMessage.getSpeaker(),
      actor: this,
      flavor: game.i18n.localize('SWADE.WealthDie.Label'),
      title: game.i18n.localize('SWADE.WealthDie.Label'),
    });
  }

  async rollRunningDie() {
    if (this.system instanceof VehicleData) return null;

    const runningDieSides = this.system.stats.speed.runningDie;
    const runningMod = this.system.stats.speed.runningMod;
    const pace = this.system.stats.speed.adjusted;
    const runningDie = `1d${runningDieSides}[${game.i18n.localize(
      'SWADE.RunningDie',
    )}]`;

    const mods: RollModifier[] = [
      { label: game.i18n.localize('SWADE.Pace'), value: pace },
    ];

    if (runningMod) {
      mods.push({
        label: game.i18n.localize('SWADE.Modifier'),
        value: runningMod,
      });
    }

    if (this.system.encumbered) {
      mods.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }

    return RollDialog.asPromise({
      roll: new SwadeRoll(runningDie, this.getRollData(false), {
        modifiers: mods,
      }),
      mods: mods,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: game.i18n.localize('SWADE.Running'),
      title: game.i18n.localize('SWADE.Running'),
      actor: this,
    });
  }

  async makeUnskilledAttempt(options: IRollOptions = {}) {
    const tempSkill = new SwadeItem({
      name: game.i18n.localize('SWADE.Unskilled'),
      type: 'skill',
      system: {
        die: {
          sides: 4,
          modifier: 0,
        },
        'wild-die': {
          sides: 6,
        },
      },
    });
    const modifier: RollModifier = {
      label: game.i18n.localize('SWADE.Unskilled'),
      value: -2,
    };
    if (options.additionalMods) {
      options.additionalMods.push(modifier);
    } else {
      options.additionalMods = [modifier];
    }
    return this.rollSkill(null, options, tempSkill);
  }

  async makeArcaneDeviceSkillRoll(
    arcaneSkillDie: TraitDie,
    options: IRollOptions = {},
  ) {
    const tempSkill = new SwadeItem({
      name: game.i18n.localize('SWADE.ArcaneSkill'),
      type: 'skill',
      data: {
        die: arcaneSkillDie,
        'wild-die': {
          sides: 6,
        },
      },
    });
    return this.rollSkill(null, options, tempSkill);
  }

  async spendBenny() {
    //return early if there no bennies to spend
    if (this.bennies < 1) return;
    if (game.settings.get('swade', 'notifyBennies')) {
      const message = await renderTemplate(SWADE.bennies.templates.spend, {
        target: this,
        speaker: game.user,
      });
      const chatData = { content: message };
      await CONFIG.ChatMessage.documentClass.create(chatData);
    }
    await this.update({ 'system.bennies.value': this.bennies - 1 });
    if (game.settings.get('swade', 'hardChoices')) {
      const gms = game
        .users!.filter((u) => u.isGM && u.active)
        .map((u) => u.id);
      game.swade.sockets.giveBenny(gms);
    }

    /**
     * A hook event that is fired after an actor spends a Benny
     * @category Hooks
     * @param {SwadeActor} actor                     The actor that spent the benny
     */
    Hooks.call('swadeSpendBenny', this);

    if (!!game.dice3d && (await shouldShowBennyAnimation())) {
      game.dice3d.showForRoll(
        await new Roll('1dB').evaluate({ async: true }),
        game.user!,
        true,
        null,
        false,
      );
    }
  }

  async getBenny() {
    if (this.system instanceof VehicleData) return;
    const combatant = this.token?.combatant as SwadeCombatant | undefined;
    await this.update({ 'system.bennies.value': this.bennies + 1 });

    const hiddenNPC = combatant?.isNPC && combatant?.hidden;
    if (game.settings.get('swade', 'notifyBennies') && !hiddenNPC) {
      const content = await renderTemplate(SWADE.bennies.templates.add, {
        target: this,
        speaker: game.user,
      });
      await getDocumentClass('ChatMessage').create({ content });
    }

    /**
     * A hook event that is fired after an actor has been awarded a benny
     * @category Hooks
     * @param {SwadeActor} actor                     The actor that received the benny
     */
    Hooks.call('swadeGetBenny', this);

    if (!!game.dice3d && (await shouldShowBennyAnimation())) {
      game.dice3d.showForRoll(
        await new Roll('1dB').evaluate({ async: true }),
        game.user!,
        true,
        null,
        false,
      );
    }
  }

  /**
   * Toggles the actor's conviction state on/off, subtracting the relevant resource
   * @param toChat Whether to post a chat message when toggling, defaults to `true`
   */
  async toggleConviction(toChat = true): Promise<void> {
    if (this.system instanceof VehicleData) return;
    const current = this.system.details.conviction.value;
    const active = this.system.details.conviction.active;
    let template = '';

    if (current > 0 && !active) {
      await this.update({
        'system.details.conviction.value': current - 1,
        'system.details.conviction.active': true,
      });
      template = CONFIG.SWADE.conviction.templates.start;
    } else {
      await this.update({
        'system.details.conviction.active': false,
      });
      template = CONFIG.SWADE.conviction.templates.end;
    }
    if (!toChat) return;
    const msgClass = getDocumentClass('ChatMessage');
    await msgClass.create({
      speaker: msgClass.getSpeaker({ actor: this }),
      content: await renderTemplate(template, {
        icon: CONFIG.SWADE.conviction.icon,
        actor: this,
      }),
    });
  }

  /** @see {TokenDocument#toggleActiveEffect} */
  async toggleActiveEffect(
    effect: StatusEffect | string,
    { overlay = false, active }: ToggleActiveEffectOptions = {},
  ) {
    const statusEffect =
      typeof effect === 'string' ? getStatusEffectDataById(effect) : effect;
    if (!statusEffect?.id) return false;

    // Remove existing single-status effects.
    const existing = this.effects.reduce((acc, cur) => {
      if (cur.statuses.size === 1 && cur.statuses.has(statusEffect.id)) {
        acc.push(cur.id);
      }
      return acc;
    }, new Array<string>());
    const state = active ?? !existing.length;
    if (!state && existing.length) {
      await this.deleteEmbeddedDocuments('ActiveEffect', existing);
    }
    // Add a new effect
    else if (state) {
      const aeClass = getDocumentClass('ActiveEffect');
      const data = foundry.utils.deepClone(statusEffect);
      foundry.utils.setProperty(data, 'statuses', [statusEffect.id]);
      delete data.id; //remove the ID to not trigger validation errors
      aeClass.migrateDataSafe(data);
      aeClass.cleanData(data);
      data.name = game.i18n.localize(data.name as string);
      if (overlay) foundry.utils.setProperty(data, 'flags.core.overlay', true);
      await aeClass.create(data, { parent: this });
    }
    return state;
  }

  /**
   * Reset the bennies of the Actor to their default value
   */
  async refreshBennies(notify = true) {
    this.system.refreshBennies?.(notify);
  }

  /** Calculates the total Wound Penalties
   * and returns them as a negative number */
  calcWoundPenalties(ignoreAll: boolean = false): number {
    if (ignoreAll) return 0;
    let total = 0;
    const wounds = foundry.utils.getProperty(
      this,
      'system.wounds.value',
    ) as number;
    const ignoredWounds = foundry.utils.getProperty(
      this,
      'system.wounds.ignored',
    ) as number;

    //clamp the value between 0 and the maximum
    total = Math.clamp(wounds - ignoredWounds, 0, 3);
    return total * -1;
  }

  /** Calculates the total Fatigue Penalties */
  calcFatiguePenalties(): number {
    let total = 0;
    const fatigue = foundry.utils.getProperty(
      this,
      'system.fatigue.value',
    ) as number;
    const ignoredFatigue = foundry.utils.getProperty(
      this,
      'system.fatigue.ignored',
    ) as number;

    //get the bigger of the two values so we don't accidentally return a negative value for the penalty
    total = Math.max(fatigue - ignoredFatigue, 0);
    return total * -1;
  }

  calcStatusPenalties(): number {
    let retVal = 0;
    const isDistracted = foundry.utils.getProperty(
      this,
      'system.status.isDistracted',
    );
    if (isDistracted) {
      retVal -= 2;
    }
    return retVal;
  }

  calcScale(size: number): number {
    let scale = 0;
    if (Number.between(size, 20, 12)) scale = 6;
    else if (Number.between(size, 11, 8)) scale = 4;
    else if (Number.between(size, 7, 4)) scale = 2;
    else if (Number.between(size, 3, -1)) scale = 0;
    else if (size === -2) scale = -2;
    else if (size === -3) scale = -4;
    else if (size === -4) scale = -6;
    return scale;
  }

  /**
   * Returns an array of items that match a given SWID and optionally an item type
   * @param swid The SWID of the item(s) which you want to retrieve
   * @param type Optionally, a type name to restrict the search
   * @returns an array containing the found items
   */
  getItemsBySwid(swid: string, type?: string): SwadeItem[] {
    const swidFilter = (i: SwadeItem) => i.system.swid === swid;
    if (!type) return this.items.filter(swidFilter);
    const itemTypes = this.itemTypes;
    if (!Object.hasOwn(itemTypes, type))
      throw new Error(`Type ${type} is invalid!`);
    return itemTypes[type].filter(swidFilter);
  }

  /**
   * Fetch an item that matches a given SWID and optionally an item type
   * @param swid The SWID of the item(s) which you want to retrieve
   * @param type Optionally, a type name to restrict the search
   * @returns The matching item, or undefined if none was found.
   */
  getSingleItemBySwid(swid: string, type?: string): SwadeItem | undefined {
    return this.getItemsBySwid(swid, type)[0];
  }

  /**
   * Function for shortcut roll in item (@str + 1d6)
   * return something like : {agi: "1d8x+1", sma: "1d6x", spi: "1d6x", str: "1d6x-1", vig: "1d6x"}
   */
  override getRollData(
    includeModifiers = true,
  ): Record<string, number | string> {
    return this.system.getRollData(includeModifiers);
  }

  /** Calculates the maximum carry capacity based on the strength die and any adjustment steps */
  calcMaxCarryCapacity(): number {
    if (this.system instanceof VehicleData) return 0;
    const unit = game.settings.get('swade', 'weightUnit');
    const strength = foundry.utils.deepClone(this.system.attributes.strength);
    const stepAdjust = Math.max(strength.encumbranceSteps * 2, 0);
    strength.die.sides += stepAdjust;
    //bound the adjusted strength die to 12
    const encumbDie = this._boundTraitDie(strength.die);

    if (unit === 'imperial') {
      return this._calcImperialCapacity(encumbDie);
    } else if (unit === 'metric') {
      return this._calcMetricCapacity(encumbDie);
    } else {
      throw new Error(`Value ${unit} is an unknown value!`);
    }
  }

  calcInventoryWeight(): number {
    const items = this.items.map((i) =>
      i.system instanceof ArmorData ||
      i.system instanceof WeaponData ||
      i.system instanceof ShieldData ||
      i.system instanceof GearData ||
      i.system instanceof ConsumableData
        ? i.system
        : null,
    );
    let retVal = 0;
    if (this.system instanceof VehicleData) {
      for (const item of items) {
        if (!item) continue;
        retVal += Number(item.weight) * Number(item.quantity);
      }
    } else {
      for (const item of items) {
        if (!item) continue;
        if (item.equipStatus !== constants.EQUIP_STATE.STORED) {
          retVal += Number(item.weight) * Number(item.quantity);
        }
      }
    }
    return retVal;
  }

  /** Helper Function for Vehicle Actors, to roll Maneuvering checks */
  async rollManeuverCheck() {
    if (!(this.system instanceof VehicleData)) return;
    const driver = await this.getDriver();

    //Return early if no driver was found
    if (!driver) return;

    //Get skillname
    let skillName = this.system.driver.skill;
    if (skillName === '') {
      skillName = this.system.driver.skillAlternative;
    }

    // Calculate handling
    const handling = this.system.handling;
    const wounds = this.calcWoundPenalties();
    const basePenalty = handling + wounds;

    //Handling is capped at a certain penalty
    const totalHandling = Math.max(
      basePenalty,
      SWADE.vehicles.maxHandlingPenalty,
    );

    //Find the operating skill
    const skill = driver.itemTypes.skill.find((i) => i.name === skillName);
    driver.rollSkill(skill?.id, {
      additionalMods: [
        {
          label: game.i18n.localize('SWADE.Handling'),
          value: totalHandling,
        },
      ],
    });
  }

  async getDriver(): Promise<SwadeActor | undefined> {
    if (!(this.system instanceof VehicleData)) return;
    const driverId = this.system.driver.id;
    let driver: SwadeActor | undefined = undefined;
    if (driverId) {
      try {
        driver = (await fromUuid(driverId)) as SwadeActor;
      } catch (error) {
        ui.notifications.error('The Driver could not be found!');
      }
    }
    return driver;
  }

  getTraitRollModifiers(
    die: TraitDie,
    options: IRollOptions,
    name?: string | null,
  ): RollModifier[] {
    const mods = new Array<RollModifier>();

    //Trait modifier
    if (die.modifier !== 0) {
      mods.push({
        label: name
          ? `${name} ${game.i18n.localize('SWADE.Modifier')}`
          : game.i18n.localize('SWADE.TraitMod'),
        value: die.modifier,
      });
    }

    const wounds = this.calcWoundPenalties(!!options.ignoreWounds);
    const fatigue = this.calcFatiguePenalties();
    const numbness = this.system.woundsOrFatigue?.ignored;
    if (numbness > 0) {
      const label = `${game.i18n.localize('SWADE.Wounds')}/${game.i18n.localize(
        'SWADE.Fatigue',
      )}`;
      mods.push({
        label: label,
        value: Math.min(wounds + fatigue + numbness, 0),
      });
    } else {
      //Wounds
      mods.push({
        label: game.i18n.localize('SWADE.Wounds'),
        value: wounds,
      });
      //Fatigue
      mods.push({
        label: game.i18n.localize('SWADE.Fatigue'),
        value: fatigue,
      });
    }

    //Additional Mods
    if (options.additionalMods) {
      mods.push(...options.additionalMods);
    }

    //Joker
    if (this.hasJoker) {
      mods.push({
        label: game.i18n.localize('SWADE.Joker'),
        value: (this.getFlag('swade', 'jokerBonus') as string | number) ?? 2,
      });
    }

    if (!(this.system instanceof VehicleData)) {
      //Status penalties
      if (this.system.status.isDistracted) {
        mods.push({
          label: game.i18n.localize('SWADE.Distr'),
          value: -2,
        });
      }

      //Conviction Die
      const useConviction =
        this.isWildcard &&
        this.system.details.conviction.active &&
        game.settings.get('swade', 'enableConviction');
      if (useConviction) {
        mods.push({
          label: game.i18n.localize('SWADE.Conv'),
          value: '+1d6x',
        });
      }
    }

    return mods
      .filter((m) => m.value) //filter out the nullish values
      .sort((a, b) => a.label.localeCompare(b.label)); //sort the mods alphabetically by label
  }

  private _handleComplexSkill(
    skill: SwadeItem,
    options: IRollOptions,
  ): [TraitRoll, RollModifier[]] {
    if (this.system instanceof VehicleData) {
      throw new Error('Only Extras and Wildcards can roll skills!');
    }
    if (!(skill.system instanceof SkillData)) {
      throw new Error('Detected-non skill in skill roll construction');
    }
    if (!options.rof) options.rof = 1;
    const skillData = skill.system;

    const rolls = new Array<Roll>();

    //Add all necessary trait die
    for (let i = 0; i < options.rof; i++) {
      rolls.push(
        Roll.fromTerms([this._buildTraitDie(skillData.die.sides, skill.name!)]),
      );
    }

    //Add Wild Die
    if (this.isWildcard) {
      rolls.push(
        Roll.fromTerms([this._buildWildDie(skillData['wild-die'].sides)]),
      );
    }

    const kh = options.rof > 1 ? `kh${options.rof}` : 'kh';
    const basePool = PoolTerm.fromRolls(rolls);
    basePool.modifiers.push(kh);
    const attGlobalMods: RollModifier[] =
      this.system.stats.globalMods[skill.system.attribute ?? ''] ?? [];
    const effects = structuredClone<RollModifier[]>([
      ...(skillData.effects ?? []),
      ...attGlobalMods,
      ...this.system.stats.globalMods.trait,
    ]);

    if (options.additionalMods) options.additionalMods.push(...effects);
    else options.additionalMods = effects;

    const rollMods = this.getTraitRollModifiers(
      skillData.die,
      options,
      skill.name,
    );

    //add encumbrance penalty if necessary
    if (skill.system.attribute === 'agility' && this.system.encumbered) {
      rollMods.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }

    return [TraitRoll.fromTerms<TraitRoll>([basePool]), rollMods];
  }

  /**
   * @param sides number of sides of the die
   * @param flavor flavor of the die
   * @param modifiers modifiers to the die
   * @returns a Die instance that already has the exploding modifier by default
   */
  private _buildTraitDie(sides: number, flavor: string): Die {
    const modifiers: (keyof Die.Modifiers)[] = [];
    if (sides > 1) modifiers.push('x');
    return new Die({
      faces: sides,
      modifiers: modifiers,
      options: { flavor: flavor.replace(/[^a-zA-Z\d\s:\u00C0-\u00FF]/g, '') },
    });
  }

  /**
   * @param die The die to adjust
   * @returns the properly adjusted trait die
   */
  private _boundTraitDie(die: TraitDie): TraitDie {
    const sides = die.sides;
    if (sides < 4 && sides !== 1) {
      die.sides = 4;
    } else if (sides > 12) {
      const difference = sides - 12;
      die.sides = 12;
      die.modifier += difference / 2;
    }
    return die;
  }

  private _buildWildDie(sides = 6): WildDie {
    return new WildDie({ faces: sides });
  }

  private _calcImperialCapacity(strength: TraitDie): number {
    const modifier = Math.max(strength.modifier, 0);
    return Math.max((strength.sides / 2 - 1 + modifier) * 20, 0);
  }

  private _calcMetricCapacity(strength: TraitDie): number {
    const modifier = Math.max(strength.modifier, 0);
    return Math.max((strength.sides / 2 - 1 + modifier) * 10, 0);
  }

  /** Calculates the correct armor value based on SWADE v5.0 and returns that value */
  calcArmor(): number {
    const torsoArmor = this._getArmorForLocation(
      constants.ARMOR_LOCATIONS.TORSO,
    );
    return this._calcDerivedEffects('armor', torsoArmor);
  }

  /** Calculates the Toughness value without armor and returns it */
  calcToughness(): number {
    if (this.system instanceof VehicleData) return 0;
    /** base value of all toughness calculations */
    const toughnessBaseValue = 2;

    const sources: DerivedModifier[] = this.system.stats.toughness.sources;

    //get the base values we need
    const vigor: number = this.system.attributes.vigor.die.sides;
    const vigMod: number = this.system.attributes.vigor.die.modifier;
    // const toughMod = this.system.stats.toughness.modifier;

    let finalToughness = Math.round(vigor / 2) + toughnessBaseValue;
    if (vigMod > 0) {
      finalToughness += Math.floor(vigMod / 2);
    }
    sources.push({
      label: game.i18n.localize('SWADE.AttrVig'),
      value: finalToughness,
    });

    const size: number = this.system.stats.size ?? 0;
    finalToughness += size;
    if (size !== 0) {
      sources.push({
        label: game.i18n.localize('SWADE.Size'),
        value: size,
      });
    }

    //add the toughness from the armor
    for (const armor of this.itemTypes.armor) {
      if (!(armor.system instanceof ArmorData)) continue;
      if (armor.isReadied && armor.system.locations.torso) {
        finalToughness += Number(armor.system.toughness);
        sources.push({
          label: armor.name,
          value: armor.system.toughness,
        });
      }
    }
    return this._calcDerivedEffects('toughness', finalToughness);
  }

  calcParry(): number {
    if (this.system instanceof VehicleData) return 0;
    /** base value of all parry calculations */
    const parryBaseValue = 2;

    let parryTotal = 0;
    const sources: DerivedModifier[] = this.system.stats.parry.sources;
    const parryBaseSkill = this.getSingleItemBySwid(
      game.settings.get('swade', 'parryBaseSwid'),
      'skill',
    );

    const skillDie = (parryBaseSkill?.system as SkillData)?.die.sides ?? 0;
    const skillMod = (parryBaseSkill?.system as SkillData)?.die.modifier ?? 0;

    //base parry calculation
    parryTotal = Math.round(skillDie / 2) + parryBaseValue;

    //add modifier if the skill die is 12
    if (skillDie >= 12) {
      parryTotal += Math.floor(skillMod / 2);
    }

    if (parryBaseSkill) {
      sources.push({
        label: foundry.utils.getProperty(parryBaseSkill, 'name'),
        value: parryTotal,
      });
    } else {
      sources.push({
        label: game.i18n.localize('SWADE.BaseParry'),
        value: parryBaseValue,
      });
    }

    this.system.stats.parry.shield = 0;

    //add shields
    for (const shield of this.itemTypes.shield) {
      if (!(shield.system instanceof ShieldData)) continue;
      if (shield.system.equipStatus === constants.EQUIP_STATE.EQUIPPED) {
        const shieldParry = shield.system.parry ?? 0;
        parryTotal += shieldParry;
        this.system.stats.parry.shield += shieldParry;
        sources.push({
          label: shield.name,
          value: shieldParry,
        });
      }
    }

    //add equipped weapons
    const ambidextrous = this.getFlag('swade', 'ambidextrous') as
      | undefined
      | boolean;
    for (const weapon of this.itemTypes.weapon) {
      if (!(weapon.system instanceof WeaponData)) continue;
      let parryBonus = 0;

      if (Number(weapon.system.equipStatus) >= constants.EQUIP_STATE.OFF_HAND) {
        // only add parry bonus if it's in the main hand or actor is ambidextrous
        if (
          Number(weapon.system.equipStatus) >= constants.EQUIP_STATE.EQUIPPED ||
          ambidextrous
        )
          parryBonus += weapon.system.parry ?? 0;

        //add trademark weapon bonus
        parryBonus += Number(weapon.system.trademark);
      }
      if (parryBonus !== 0) {
        sources.push({
          label: weapon.name,
          value: parryBonus,
        });
      }
      parryTotal += parryBonus;
    }

    return this._calcDerivedEffects('parry', parryTotal);
  }

  private _calcDerivedEffects(
    target: 'parry' | 'toughness' | 'armor',
    derivedStat: number,
  ): number {
    if (this.system instanceof VehicleData) return 0; // typeguarding
    const effects: DerivedModifier[] =
      target === 'armor'
        ? this.system.stats.toughness.armorEffects
        : this.system.stats[target].effects;
    const sources: DerivedModifier[] =
      target === 'armor'
        ? new Array<DerivedModifier>() // currently gets discarded
        : this.system.stats[target].sources;

    effects.forEach((e: DerivedModifier) => {
      switch (e.mode) {
        case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
          derivedStat *= e.value;
          sources.push({
            label: e.label,
            value: e.value,
            mode: e.mode,
          });
          break;
        case CONST.ACTIVE_EFFECT_MODES.ADD:
          derivedStat += e.value;
          sources.push({
            label: e.label,
            value: e.value,
            mode: e.mode,
          });
          break;
        case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
          if (derivedStat > e.value) {
            derivedStat = e.value;
            sources.length = 0;
            sources.push({
              label: e.label,
              value: e.value,
              mode: e.mode,
            });
          }
          break;
        case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
          if (derivedStat < e.value) {
            derivedStat = e.value;
            sources.length = 0;
            sources.push({
              label: e.label,
              value: e.value,
              mode: e.mode,
            });
          }
          break;
        case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
          derivedStat = e.value;
          sources.length = 0;
          sources.push({
            label: e.label,
            value: e.value,
            mode: e.mode,
          });
          break;
      }
    });
    return derivedStat;
  }

  /**
   * @param location The location of the armor such as head, torso, arms or legs
   * @returns The total amount of armor for that location
   */
  private _getArmorForLocation(location: ArmorLocation): number {
    if (this.system instanceof VehicleData) return 0;

    return Object.values(this._getArmorSourcesForLocation(location)).reduce(
      (acc, value) => (acc += value),
      0,
    );
  }

  /**
   * @param location The location of the armor such as head, torso, arms or legs
   * @returns A record of armor sources and values
   */
  private _getArmorSourcesForLocation(
    location: ArmorLocation,
  ): Record<string, number> {
    const armorSources = {};
    if (this.system instanceof VehicleData) return armorSources;

    const [regularArmor, naturalArmor] = this.itemTypes.armor
      .filter((i) => {
        //filter away armor that doesn't match the location and isn't equipped
        const system = i.system as ArmorData;
        const isEquipped = system.equipStatus! > constants.EQUIP_STATE.CARRIED;
        return isEquipped && system.locations[location];
      })
      .map((i) => {
        // map the data into a usable format
        const system = i.system as ArmorData;
        return {
          name: i.name,
          armor: system.armor as number,
          isNaturalArmor: system.isNaturalArmor as boolean,
        } satisfies ArmorCalcContext;
      })
      .sort((a, b) => b.armor - a.armor) // sort the items by armor value, descending
      .partition((i) => i.isNaturalArmor); //split them into natural and regular armor

    const isCoreStacking =
      game.settings.get('swade', 'armorStacking') ===
      constants.ARMOR_STACKING.CORE;

    const [baseArmor, extraArmor] = regularArmor;
    if (baseArmor) {
      armorSources[baseArmor.name] = baseArmor.armor;
      if (extraArmor && isCoreStacking) {
        armorSources[extraArmor.name] = Math.floor(extraArmor.armor / 2);
      }
    }

    //add the natural armor to the object
    return naturalArmor.reduce((acc, cur) => {
      acc[cur.name] = cur.armor;
      return acc;
    }, armorSources);
  }

  getPTTooltip(target: 'parry' | 'toughness'): string {
    if (this.system instanceof VehicleData) return '';
    let tooltip =
      target === 'parry'
        ? `<h4>${game.i18n.localize('SWADE.Parry')}
       ${this.system.stats.parry.value}
      (${this.system.stats.parry.shield})</h4>`
        : `<h4>${game.i18n.localize('SWADE.Tough')}
       ${this.system.stats.toughness.value}
      (${this.system.stats.toughness.armor})</h4>`;

    tooltip += this._sourcesToTooltip(this.system.stats[target].sources);

    return tooltip;
  }

  getArmorTooltip(): string {
    if (this.system instanceof VehicleData) return '';
    let tooltip = '';

    const armor = this.armorPerLocation;
    tooltip += game.i18n.localize('SWADE.Head') + `: ${armor.head}<br>`;
    tooltip += game.i18n.localize('SWADE.Torso') + `: ${armor.torso}<br>`;
    tooltip += game.i18n.localize('SWADE.Arms') + `: ${armor.arms}<br>`;
    tooltip += game.i18n.localize('SWADE.Legs') + `: ${armor.legs}<hr>`;

    tooltip += this._sourcesToTooltip(this.system.stats.toughness.armorEffects);

    tooltip += Object.entries(
      this._getArmorSourcesForLocation(constants.ARMOR_LOCATIONS.TORSO),
    ).reduce((acc, [source, value]) => acc + `${source}: ${value}<br>`, '');

    return tooltip;
  }

  /**
   * Looks up the combatant instance for this actor in a given Combat encounter, taking into account whether the actor is an unlinked token or not.
   * @param combat The combat instance to look in.
   * @returns The found combatant for this actor, if one exists
   */
  getCombatant(combat?: Combat): SwadeCombatant | undefined {
    if (!combat) return;
    const combatant = this.isToken
      ? combat?.getCombatantByToken(this.token?.id as string)
      : combat?.getCombatantByActor(this.id as string);
    return combatant as SwadeCombatant;
  }

  private _sourcesToTooltip(sources: DerivedModifier[]): string {
    let tooltip = '';

    sources.forEach((source) => {
      let effect = '';
      switch (source.mode) {
        case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
          effect = 'x' + source.value;
          break;
        case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
          effect =
            game.i18n.localize('EFFECT.MODE_DOWNGRADE') + ' ' + source.value;
          break;
        case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
          effect =
            game.i18n.localize('EFFECT.MODE_UPGRADE') + ' ' + source.value;
          break;
        case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
          effect =
            game.i18n.localize('EFFECT.MODE_OVERRIDE') + ' ' + source.value;
          break;
        case CONST.ACTIVE_EFFECT_MODES.ADD:
        default:
          effect = (source.value ?? 0).signedString();
      }
      tooltip += `${source.label}: ${effect}<br>`;
    });

    return tooltip;
  }

  private _filterOverrides() {
    const overrides = foundry.utils.flattenObject(this.overrides);
    for (const k of Object.keys(overrides)) {
      if (k.startsWith('@')) {
        delete overrides[k];
      }
    }
    this.overrides = foundry.utils.expandObject(overrides);
  }

  protected override async _preCreate(
    createData: ActorDataConstructorData,
    options: DocumentModificationOptions,
    user: BaseUser,
  ) {
    await super._preCreate(createData, options, user);
    //return early if it's a vehicle
    if (createData.type === 'vehicle') return;

    if (this.type === 'character') {
      this.updateSource({
        prototypeToken: {
          actorLink: true,
          disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        },
      });
    }

    const isImported = foundry.utils.hasProperty(
      createData,
      'flags.core.sourceId',
    );

    const coreSkillList = game.settings.get('swade', 'coreSkills');
    //only do this if this is a PC with no prior skills
    if (
      coreSkillList.length > 0 &&
      this.type === 'character' &&
      this.itemTypes.skill.length === 0
    ) {
      //Get list of core skills from settings
      const coreSkills = coreSkillList.split(',').map((s) => s.trim());

      //Set compendium source
      const pack = game.packs.get(
        game.settings.get('swade', 'coreSkillsCompendium'),
        { strict: true },
      ) as CompendiumCollection<ItemMetadata>;

      const skillIndex = await pack.getDocuments();

      // extract skill data
      const skills = skillIndex
        .filter((i) => i.type === 'skill')
        .filter((i) => coreSkills.includes(i.name!))
        .map((s) => s.toObject());

      // Create core skills not in compendium (for custom skill names entered by the user)
      for (const skillName of coreSkills) {
        if (!skillIndex.find((skill) => skillName === skill.name)) {
          skills.push({
            name: skillName,
            type: 'skill',
            img: 'systems/swade/assets/icons/skill.svg',
            system: {
              attribute: '',
            },
          });
        }
      }

      //set all the skills to be core skills
      for (const skill of skills) {
        if (skill.type === 'skill') skill.system.isCoreSkill = true;
      }

      //Add the Untrained skill
      skills.push({
        name: game.i18n.localize('SWADE.Unskilled'),
        type: 'skill',
        img: 'systems/swade/assets/icons/skill.svg',
        system: {
          attribute: '',
          die: {
            sides: 4,
            modifier: -2,
          },
        },
      });

      //Add the items to the creation data
      this.updateSource({ items: skills });
    }

    //Handle starting currency
    if (!isImported) {
      const currency = this.system.startingCurrency ?? 0;
      this.updateSource({ 'system.details.currency': currency });
    }
  }

  protected override _onUpdate(
    changed: DeepPartial<SwadeActorDataSource> & Record<string, unknown>,
    options: DocumentModificationOptions,
    userId: string,
  ) {
    super._onUpdate(changed, options, userId);
    // Updating for Wild Card display toggle
    if (this.type === 'npc') {
      ui.actors?.render(true);
    }
    if (hasProperty(changed, 'system.bennies') && this.hasPlayerOwner) {
      ui.players?.render(true);
    }
  }
}

type ArmorLocation = ValueOf<typeof constants.ARMOR_LOCATIONS>;

interface ArmorCalcContext {
  name: string;
  armor: number;
  isNaturalArmor: boolean;
}
