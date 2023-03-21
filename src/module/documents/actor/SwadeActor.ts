import { StatusEffect } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import {
  Context,
  DocumentModificationOptions,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { ActorDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData';
import { Attribute, ItemMetadata } from '../../../globals';
import { TraitRollModifier } from '../../../interfaces/additional.interface';
import { Advance } from '../../../interfaces/Advance.interface';
import IRollOptions from '../../../interfaces/RollOptions.interface';
import RollDialog from '../../apps/RollDialog';
import { createConvictionEndMessage } from '../../chat';
import { SWADE } from '../../config';
import { constants } from '../../constants';
import { SwadeRoll } from '../../dice/SwadeRoll';
import { TraitRoll } from '../../dice/TraitRoll';
import WildDie from '../../dice/WildDie';
import { Logger } from '../../Logger';
import {
  getRankFromAdvanceAsString,
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
}

export default class SwadeActor extends Actor {
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

  /**
   * @returns true when the actor is a Wild Card
   */
  get isWildcard(): boolean {
    if (this.type === 'vehicle') {
      return false;
    } else {
      return this.system.wildcard || this.type === 'character';
    }
  }

  /** @returns true when the actor has an arcane background or a special ability that grants powers. */
  get hasArcaneBackground(): boolean {
    const abEdge = this.itemTypes.edge.find(
      (i) => i.type === 'edge' && i.system.isArcaneBackground,
    );
    const abAbility = this.itemTypes.ability.find(
      (i) => i.type === 'ability' && i.system.grantsPowers,
    );
    return !!abEdge || !!abAbility;
  }

  /** @returns true when the actor is currently in combat and has drawn a joker */
  get hasJoker(): boolean {
    //return early if no combat is running
    if (!game?.combats?.active) return false;

    let combatant: SwadeCombatant | undefined;
    const hasToken = !!this.token;
    const isLinked = this.prototypeToken.actorLink;
    if (isLinked || !hasToken) {
      //linked token
      combatant = game.combat?.combatants.find((c) => c.actor?.id === this.id);
    } else {
      //unlinked token
      combatant = game.combat?.combatants.find(
        (c) => c.token?.id === this.token?.id,
      );
    }
    return combatant?.hasJoker ?? false;
  }

  get bennies(): number {
    if (this.type === 'vehicle') return 0;
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

  /** @return whether this character is currently encumbered, factoring in whether the rule is even enforced */
  get isEncumbered(): boolean {
    const applyEncumbrance = game.settings.get('swade', 'applyEncumbrance');
    if (this.type === 'vehicle' || !applyEncumbrance) {
      return false;
    }
    if (this.system.details.encumbrance.isEncumbered) return true;
    const encumbrance = this.system.details.encumbrance;
    return encumbrance.value > encumbrance.max;
  }

  get race(): SwadeItem | undefined {
    if (this.type === 'vehicle') return;
    const races = this.items.filter(
      (i) => i.type === 'ability' && i.system.subtype === 'race',
    );
    if (races.length > 1) {
      Logger.warn(`Actor ${this.name} (${this.id}) has more than one race!`);
    }
    return races[0];
  }

  get archetype(): SwadeItem | undefined {
    if (this.type === 'vehicle') return;
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

  override prepareBaseData() {
    this._prepareCharacterBaseData();
  }

  override prepareEmbeddedDocuments() {
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
    this._prepareCharacterDerivedData();

    /**
     * A hook event that is fired after the system has completed its data preparation and allows modules to adjust the derived data afterwards
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the attribute
     */
    Hooks.callAll('swadeActorPrepareDerivedData', this);
  }

  private _prepareCharacterBaseData() {
    //typeguard against vehicles
    if (this.type === 'vehicle') return;
    //auto calculations
    if (this.system.details.autoCalcToughness) {
      //if we calculate the toughness then we set the values to 0 beforehand so the active effects can be applies
      this.system.stats.toughness.value = 0;
      this.system.stats.toughness.armor = 0;
    }
    if (this.system.details.autoCalcParry) {
      //same procedure as with Toughness
      this.system.stats.parry.value = 0;
    }
  }

  private _prepareCharacterDerivedData() {
    //typeguard against vehicles
    if (this.type === 'vehicle') return;

    //die type bounding for attributes
    for (const key in this.system.attributes) {
      const attribute = this.system.attributes[key];
      attribute.die = this._boundTraitDie(attribute.die);
      attribute['wild-die'].sides = Math.min(attribute['wild-die'].sides, 12);
    }

    //handle carry capacity
    foundry.utils.setProperty(
      this,
      'system.details.encumbrance.value',
      this.calcInventoryWeight(),
    );
    foundry.utils.setProperty(
      this,
      'system.details.encumbrance.max',
      this.calcMaxCarryCapacity(),
    );

    //handle advances
    const advances = this.system.advances;
    if (advances.mode === 'expanded') {
      const advRaw = getProperty(
        this._source,
        'system.advances.list',
      ) as Advance[];
      const list = new Collection<Advance>();
      advRaw.forEach((adv) => list.set(adv.id, adv));
      const activeAdvances = list.filter((a) => !a.planned).length;
      advances.list = list;
      advances.value = activeAdvances;
      advances.rank = getRankFromAdvanceAsString(activeAdvances);
    }

    let pace = this.system.stats.speed.value;

    //subtract encumbrance, if necessary
    if (this.isEncumbered) pace -= 2;

    //modify pace with wounds
    if (game.settings.get('swade', 'enableWoundPace')) {
      //bound maximum wound penalty to -3
      const wounds = Math.min(this.system.wounds.value, 3);
      //subtract wounds
      pace -= wounds;
    }
    //make sure the pace doesn't go below 1
    this.system.stats.speed.adjusted = Math.max(pace, 1);

    //set scale
    this.system.stats.scale = this.calcScale(this.system.stats.size);

    // Toughness calculation
    const shouldAutoCalcToughness = this.system.details.autoCalcToughness;
    if (shouldAutoCalcToughness) {
      const adjustedTough = this.system.stats.toughness.value;
      const adjustedArmor = this.system.stats.toughness.armor;

      //add some sensible lower limits
      const finalArmor = Math.max(this.calcArmor() + adjustedArmor, 0);
      const finalTough = Math.max(
        this.calcToughness(false) + adjustedTough + finalArmor,
        1,
      );
      this.system.stats.toughness.value = finalTough;
      this.system.stats.toughness.armor = finalArmor;
    }

    const shouldAutoCalcParry = this.system.details.autoCalcParry;
    if (shouldAutoCalcParry) {
      const adjustedParry = this.system.stats.parry.value;
      const completeParry = Math.max(this.calcParry() + adjustedParry, 0);
      this.system.stats.parry.value = completeParry;
    }
  }

  async rollAttribute(
    attribute: Attribute,
    options: IRollOptions = {},
  ): Promise<TraitRoll | null> {
    if (this.type === 'vehicle') return null;
    if (options.rof && options.rof > 1) {
      ui.notifications.warn(
        'Attribute Rolls with RoF greater than 1 are not currently supported',
      );
    }
    const label: string = SWADE.attributes[attribute].long;
    const abl = this.system.attributes[attribute];
    const rolls = new Array<Roll>();

    const attrRoll = new Roll('');
    attrRoll.terms.push(
      this._buildTraitDie(abl.die.sides, game.i18n.localize(label)),
    );
    rolls.push(attrRoll);

    if (this.isWildcard) {
      const wildRoll = new Roll('');
      wildRoll.terms.push(this._buildWildDie(abl['wild-die'].sides));
      rolls.push(wildRoll);
    }

    const basePool = PoolTerm.fromRolls(rolls);
    basePool.modifiers.push('kh');

    const modifiers = this.getTraitRollModifiers(
      abl.die,
      options,
      game.i18n.localize(label),
    );

    //add encumbrance penalty if necessary
    if (attribute === 'agility' && this.isEncumbered) {
      modifiers.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }

    const roll = TraitRoll.fromTerms([basePool]);
    roll.modifiers = modifiers;

    /**
     * A hook event that is fired before an attribute is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the attribute
     * @param {String} attribute                The name of the attribute, in lower case
     * @param {TraitRoll} roll                  The built base roll, without any modifiers
     * @param {TraitRollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.call('swadeRollAttribute', this, attribute, roll, modifiers, options);

    if (options.suppressChat) {
      return TraitRoll.fromTerms([
        ...roll.terms,
        ...TraitRoll.parse(
          roll.modifiers.reduce(modifierReducer, ''),
          this.getRollData(),
        ),
      ]);
    }

    // Roll and return
    return RollDialog.asPromise({
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
    }) as Promise<TraitRoll | null>;
  }

  async rollSkill(
    skillId: string | null | undefined,
    options: IRollOptions = { rof: 1 },
    tempSkill?: SwadeItem,
  ): Promise<TraitRoll | null> {
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

    //Build Flavour
    let flavour = '';
    if (options.flavour) {
      flavour = ` - ${options.flavour}`;
    }

    /**
     * A hook event that is fired before a skill is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
     * @category Hooks
     * @param {SwadeActor} actor                The actor that rolls the skill
     * @param {SwadeItem} skill                 The Skill item that is being rolled
     * @param {TraitRoll} roll                  The built base roll, without any modifiers
     * @param {TraitRollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.call('swadeRollSkill', this, skill, roll, modifiers, options);

    if (options.suppressChat) {
      return TraitRoll.fromTerms([
        ...roll.terms,
        ...TraitRoll.parse(
          roll.modifiers.reduce(modifierReducer, ''),
          this.getRollData(),
        ),
      ]);
    }

    // Roll and return
    return RollDialog.asPromise({
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
    }) as Promise<TraitRoll | null>;
  }

  async rollWealthDie() {
    if (this.type === 'vehicle') return null;
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
    if (this.type === 'vehicle') return null;

    const runningDieSides = this.system.stats.speed.runningDie;
    const runningMod = this.system.stats.speed.runningMod;
    const pace = this.system.stats.speed.adjusted;
    const runningDie = `1d${runningDieSides}[${game.i18n.localize(
      'SWADE.RunningDie',
    )}]`;

    const mods: TraitRollModifier[] = [
      { label: game.i18n.localize('SWADE.Pace'), value: pace },
    ];

    if (runningMod) {
      mods.push({
        label: game.i18n.localize('SWADE.Modifier'),
        value: runningMod,
      });
    }

    if (this.isEncumbered) {
      mods.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }

    return RollDialog.asPromise({
      roll: new SwadeRoll(runningDie, this.getRollData(), { modifiers: mods }),
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
      //@ts-expect-error something something
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
    const modifier: TraitRollModifier = {
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
    if (this.type === 'vehicle') return;
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
    if (this.type === 'vehicle') return;
    const combatant = this.token?.combatant;
    const notHiddenNPC =
      !combatant?.isNPC || (combatant?.isNPC && !combatant?.hidden);
    if (game.settings.get('swade', 'notifyBennies') && notHiddenNPC) {
      const message = await renderTemplate(SWADE.bennies.templates.add, {
        target: this,
        speaker: game.user,
      });
      const chatData = {
        content: message,
      };
      await CONFIG.ChatMessage.documentClass.create(chatData);
    }
    await this.update({
      'system.bennies.value': this.bennies + 1,
    });

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

  async toggleConviction() {
    if (this.type === 'vehicle') return;
    const current = this.system.details.conviction.value;
    const active = this.system.details.conviction.active;
    if (current > 0 && !active) {
      await this.update({
        'system.details.conviction.value': current - 1,
        'system.details.conviction.active': true,
      });
      await CONFIG.ChatMessage.documentClass.create({
        speaker: {
          actor: this.id,
          alias: this.name,
        },
        content: game.i18n.localize('SWADE.ConvictionActivate'),
      });
    } else {
      await this.update({
        'system.details.conviction.active': false,
      });
      await createConvictionEndMessage(this);
    }
  }

  async toggleActiveEffect(
    effectData: StatusEffect,
    options: { overlay?: boolean; active?: boolean } = { overlay: false },
  ) {
    //get the active tokens
    const tokens = this.getActiveTokens();
    //if there's tokens, iterate over them to toggle the effect directly
    if (tokens.length > 0) {
      for (const token of tokens) {
        await token.document.toggleActiveEffect(effectData, options);
      }
      return;
    }

    //else toggle the effect directly on the actor
    const existingEffect = this.effects.find(
      (e) => e.statusId === effectData.id,
    );
    const state = options.active ?? !existingEffect;
    if (!state && existingEffect) {
      //remove the existing effect
      await existingEffect.delete();
    } else if (state) {
      //add new effect
      const createData = foundry.utils.deepClone(
        effectData,
      ) as Partial<StatusEffect>;
      //set the status id
      setProperty(createData, 'flags.core.statusId', effectData.id);
      if (options.overlay) setProperty(createData, 'flags.core.overlay', true);
      //remove id property to not violate validation
      delete createData.id;
      await this.createEmbeddedDocuments('ActiveEffect', [createData]);
    }
  }

  /**
   * Reset the bennies of the Actor to their default value
   * @param displayToChat display a message to chat
   */
  async refreshBennies(displayToChat = true) {
    if (this.type === 'vehicle') return;
    if (displayToChat) {
      const message = await renderTemplate(SWADE.bennies.templates.refresh, {
        target: this,
        speaker: game.user,
      });
      const chatData = {
        content: message,
      };
      CONFIG.ChatMessage.documentClass.create(chatData);
    }
    let newValue = this.system.bennies.max;
    const hardChoices = game.settings.get('swade', 'hardChoices');
    if (
      hardChoices &&
      this.isWildcard &&
      this.type === 'npc' &&
      !this.hasPlayerOwner
    ) {
      newValue = 0;
    }
    await this.update({ 'system.bennies.value': newValue });
  }

  /** Calculates the total Wound Penalties */
  calcWoundPenalties(): number {
    let total = 0;
    const wounds = getProperty(this, 'system.wounds.value') as number;
    const ignoredWounds = getProperty(this, 'system.wounds.ignored') as number;

    //clamp the value between 0 and the maximum
    total = Math.clamped(wounds - ignoredWounds, 0, 3);
    return total * -1;
  }

  /** Calculates the total Fatigue Penalties */
  calcFatiguePenalties(): number {
    let total = 0;
    const fatigue = getProperty(this, 'system.fatigue.value') as number;
    const ignoredFatigue = getProperty(
      this,
      'system.fatigue.ignored',
    ) as number;

    //get the bigger of the two values so we don't accidentally return a negative value for the penalty
    total = Math.max(fatigue - ignoredFatigue, 0);
    return total * -1;
  }

  calcStatusPenalties(): number {
    let retVal = 0;
    const isDistracted = getProperty(this, 'system.status.isDistracted');
    const isEntangled = getProperty(this, 'system.status.isEntangled');
    const isBound = getProperty(this, 'system.status.isBound');
    if (isDistracted || isEntangled || isBound) {
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
   * Function for shortcut roll in item (@str + 1d6)
   * return something like : {agi: "1d8x+1", sma: "1d6x", spi: "1d6x", str: "1d6x-1", vig: "1d6x"}
   */
  override getRollData(): Record<string, number | string> {
    const out: Record<string, any> = {
      wounds: this.system.wounds.value || 0,
    };

    //return early if the actor is a vehicle
    if (this.type === 'vehicle') {
      out.topspeed = this.system.topspeed || 0;
      return out;
    }

    // Attributes
    const attributes = this.system.attributes;
    for (const [key, attribute] of Object.entries(attributes)) {
      const short = key.substring(0, 3);
      const name = game.i18n.localize(SWADE.attributes[key].long);
      const die = attribute.die.sides;
      const mod = attribute.die.modifier || 0;
      const modString = mod !== 0 ? mod.signedString() : '';
      let val = `1d${die}x[${name}]${modString}`;
      if (die <= 1) val = `1d${die}[${name}]${modString}`;
      out[short] = val;
    }

    const skills = this.itemTypes.skill;
    for (const skill of skills) {
      if (skill.type !== 'skill') continue;
      const skillDie = Number(skill.system.die.sides);
      const skillMod = Number(skill.system.die.modifier);
      const name = skill.name!.slugify({ strict: true });
      const skillModString = skillMod !== 0 ? skillMod.signedString() : '';
      out[name] = `1d${skillDie}[${skill.name}]${skillModString}`;
    }
    out.fatigue = this.system.fatigue.value || 0;
    out.pace = this.system.stats.speed.adjusted || 0;

    return out;
  }

  /** Calculates the correct armor value based on SWADE v5.5 and returns that value */
  calcArmor(): number {
    return this._getArmorForLocation(constants.ARMOR_LOCATIONS.TORSO);
  }

  /**
   * Calculates the Toughness value and returns it, optionally with armor
   * @param includeArmor include armor in final value (true/false). Default is true
   */
  calcToughness(includeArmor = true): number {
    if (this.type === 'vehicle') return 0;
    let finalToughness = 0;

    //get the base values we need
    const vigor = this.system.attributes.vigor.die.sides;
    const vigMod = this.system.attributes.vigor.die.modifier;
    const toughMod = this.system.stats.toughness.modifier;

    finalToughness = Math.round(vigor / 2) + 2;

    const size = this.system.stats.size ?? 0;
    finalToughness += size;
    finalToughness += toughMod;

    if (vigMod > 0) {
      finalToughness += Math.floor(vigMod / 2);
    }

    //add the toughness from the armor
    for (const armor of this.itemTypes.armor) {
      if (armor.type !== 'armor') continue;
      if (armor.isReadied && armor.system.locations.torso) {
        finalToughness += armor.system.toughness;
      }
    }

    if (includeArmor) {
      finalToughness += this.calcArmor();
    }

    return Math.max(finalToughness, 1);
  }

  /** Calculates the maximum carry capacity based on the strength die and any adjustment steps */
  calcMaxCarryCapacity(): number {
    if (this.type === 'vehicle') return 0;
    const unit = game.settings.get('swade', 'weightUnit');
    const strength = deepClone(this.system.attributes.strength);
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
      i.type === 'armor' ||
      i.type === 'weapon' ||
      i.type === 'shield' ||
      i.type === 'gear' ||
      i.type === 'consumable'
        ? i.system
        : null,
    );
    let retVal = 0;
    if (this.type === 'vehicle') {
      for (const item of items) {
        if (!item) continue;
        retVal += item.weight * item.quantity;
      }
    } else {
      for (const item of items) {
        if (!item) continue;
        if (item.equipStatus !== constants.EQUIP_STATE.STORED) {
          retVal += item.weight * item.quantity;
        }
      }
    }
    return retVal;
  }

  calcParry(): number {
    if (this.type === 'vehicle') return 0;
    let parryTotal = 0;
    const parryBase = game.settings.get('swade', 'parryBaseSkill');
    const parryBaseSkill = this.itemTypes.skill.find(
      (i) => i.name === parryBase,
    );

    let skillDie = 0;
    let skillMod = 0;
    if (parryBaseSkill) {
      skillDie = getProperty(parryBaseSkill.system, 'die.sides') ?? 0;
      skillMod = getProperty(parryBaseSkill.system, 'die.modifier') ?? 0;
    }

    //base parry calculation
    parryTotal = skillDie / 2 + 2;

    //add modifier if the skill die is 12
    if (skillDie >= 12) {
      parryTotal += Math.floor(skillMod / 2);
    }

    //add shields
    for (const shield of this.itemTypes.shield) {
      if (shield.type !== 'shield') continue;
      if (shield.system.equipStatus === constants.EQUIP_STATE.EQUIPPED) {
        parryTotal += shield.system.parry ?? 0;
      }
    }

    //add equipped weapons
    //TODO check for off-hand weapons and ambidexterity
    for (const weapon of this.itemTypes.weapon) {
      if (weapon.type !== 'weapon') continue;
      if (weapon.system.equipStatus >= constants.EQUIP_STATE.EQUIPPED) {
        parryTotal += weapon.system.parry ?? 0;
        //add trademark weapon bonus
        parryTotal += weapon.system.trademark;
      }
    }

    return parryTotal;
  }

  /** Helper Function for Vehicle Actors, to roll Maneuvering checks */
  async rollManeuverCheck() {
    if (this.type !== 'vehicle') return;
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
    if (this.type !== 'vehicle') return;
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

  private _handleComplexSkill(
    skill: SwadeItem,
    options: IRollOptions,
  ): [TraitRoll, TraitRollModifier[]] {
    if (this.type === 'vehicle') {
      throw new Error('Only Extras and Wildcards can roll skills!');
    }
    if (skill.type !== 'skill') {
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

    const rollMods = this.getTraitRollModifiers(
      skillData.die,
      options,
      skill.name,
    );

    //add encumbrance penalty if necessary
    if (skill.system.attribute === 'agility' && this.isEncumbered) {
      rollMods.push({
        label: game.i18n.localize('SWADE.Encumbered'),
        value: -2,
      });
    }

    return [TraitRoll.fromTerms([basePool]), rollMods];
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

  getTraitRollModifiers(
    die: TraitDie,
    options: IRollOptions,
    name?: string | null,
  ): TraitRollModifier[] {
    const mods = new Array<TraitRollModifier>();

    //Trait modifier
    if (die.modifier !== 0) {
      mods.push({
        label: name
          ? `${name} ${game.i18n.localize('SWADE.Modifier')}`
          : game.i18n.localize('SWADE.TraitMod'),
        value: die.modifier,
      });
    }

    const wounds = this.calcWoundPenalties();
    const fatigue = this.calcFatiguePenalties();
    const numbness = this.system.woundsOrFatigue.ignored;
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
        value: 2,
      });
    }

    if (this.type !== 'vehicle') {
      //Status penalties
      if (this.system.status.isEntangled) {
        mods.push({
          label: game.i18n.localize('SWADE.Entangled'),
          value: -2,
        });
      } else if (this.system.status.isBound) {
        mods.push({
          label: game.i18n.localize('SWADE.Bound'),
          value: -2,
        });
      } else if (this.system.status.isDistracted) {
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

  private _calcImperialCapacity(strength: TraitDie): number {
    const modifier = Math.max(strength.modifier, 0);
    return (strength.sides / 2 - 1 + modifier) * 20;
  }

  private _calcMetricCapacity(strength: TraitDie): number {
    const modifier = Math.max(strength.modifier, 0);
    return (strength.sides / 2 - 1 + modifier) * 10;
  }

  /**
   * @param location The location of the armor such as head, torso, arms or legs
   * @returns The total amount of armor for that location
   */
  private _getArmorForLocation(location: ArmorLocation): number {
    if (this.type === 'vehicle') return 0;

    let totalArmorVal = 0;

    //get armor items and retrieve their data
    const armorList = this.itemTypes.armor.map((i) =>
      i.type === 'armor' ? i.system : null,
    );

    const nonNaturalArmors = armorList
      .filter((i) => {
        const isEquipped = i?.equipStatus > constants.EQUIP_STATE.CARRIED;
        const isLocation = i?.locations[location];
        const isNaturalArmor = i?.isNaturalArmor;
        return isEquipped && !isNaturalArmor && isLocation;
      })
      .sort((a, b) => {
        const aValue = Number(a?.armor);
        const bValue = Number(b?.armor);
        return bValue - aValue;
      });

    if (nonNaturalArmors.length === 1) {
      totalArmorVal = Number(nonNaturalArmors[0]!.armor);
    } else if (nonNaturalArmors.length > 1) {
      totalArmorVal =
        Number(nonNaturalArmors[0]?.armor) +
        Math.floor(Number(nonNaturalArmors[1]?.armor) / 2);
    }

    //add natural armor
    armorList
      .filter((i) => {
        const isEquipped = i?.equipStatus !== constants.EQUIP_STATE.STORED;
        const isLocation = i?.locations[location];
        const isNaturalArmor = i?.isNaturalArmor;
        return isNaturalArmor && isEquipped && isLocation;
      })
      .forEach((i) => {
        totalArmorVal += Number(i?.armor);
      });

    return totalArmorVal;
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
    user: User,
  ) {
    await super._preCreate(createData, options, user);
    //return early if it's a vehicle
    if (createData.type === 'vehicle') return;

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
            //@ts-expect-error We're just adding some base data for a skill here.
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
        //@ts-expect-error We're just adding some base data for a skill here.
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
      let currency = 0;
      if (this.type === 'character') {
        currency = game.settings.get('swade', 'pcStartingCurrency');
      } else if (this.type === 'npc') {
        currency = game.settings.get('swade', 'npcStartingCurrency');
      }
      this.updateSource({ 'system.details.currency': currency });
    }
  }

  protected override _onUpdate(
    changed: DeepPartial<SwadeActorDataSource> & Record<string, unknown>,
    options: DocumentModificationOptions,
    user: string,
  ) {
    super._onUpdate(changed, options, user);
    if (this.type === 'npc') {
      ui.actors?.render(true);
    }
    if (hasProperty(changed, 'system.bennies') && this.hasPlayerOwner) {
      ui.players?.render(true);
    }
  }
}

type ArmorLocation = ValueOf<typeof constants.ARMOR_LOCATIONS>;
