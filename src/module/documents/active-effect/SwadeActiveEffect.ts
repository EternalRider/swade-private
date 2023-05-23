import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import {
  ActiveEffectDataConstructorData,
  ActiveEffectDataProperties,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData';
import { EffectChangeData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData';
import { BaseUser } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs';
import { PropertiesToSource } from '@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes';
import { RollModifier } from '../../../interfaces/additional.interface';
import { constants } from '../../constants';
import { Logger } from '../../Logger';
import { getStatusEffectDataById, isFirstOwner } from '../../util';
import SwadeActor from '../actor/SwadeActor';
import SwadeItem from '../item/SwadeItem';

declare global {
  interface DocumentClassConfig {
    ActiveEffect: typeof SwadeActiveEffect;
  }
  interface FlagConfig {
    ActiveEffect: {
      swade: {
        removeEffect?: boolean;
        expiration?: number;
        loseTurnOnHold?: boolean;
        favorite?: boolean;
        related?: Record<string, ActiveEffectDataConstructorData>;
        conditionalEffect?: boolean;
      };
    };
  }
}

export default class SwadeActiveEffect extends ActiveEffect {
  get affectsItems() {
    if (this.parent instanceof CONFIG.Actor.documentClass) {
      const affectedItems = new Array<SwadeItem>();
      this.changes.forEach((c) =>
        affectedItems.push(
          ...this._getAffectedItems(this.parent as SwadeActor, c),
        ),
      );
      return affectedItems.length > 0;
    }
    return false;
  }

  get statusId() {
    const [statusId] = getProperty(this, 'statuses') as Set<string>;
    return statusId;
  }

  get expiresAtStartOfTurn(): boolean {
    const expiration = this.getFlag('swade', 'expiration') ?? -1;
    return [
      constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto,
      constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
    ].includes(expiration);
  }

  get expiresAtEndOfTurn(): boolean {
    const expiration = this.getFlag('swade', 'expiration') ?? -1;
    return [
      constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
      constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
    ].includes(expiration);
  }

  get expirationText(): string {
    const expiration = this.getFlag('swade', 'expiration') ?? -1;
    switch (expiration) {
      case constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto:
        return game.i18n.localize('SWADE.Expiration.BeginAuto');
      case constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt:
        return game.i18n.localize('SWADE.Expiration.BeginPrompt');
      case constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto:
        return game.i18n.localize('SWADE.Expiration.EndAuto');
      case constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt:
        return game.i18n.localize('SWADE.Expiration.EndPrompt');
      default: // None
        return game.i18n.localize('SWADE.Expiration.None');
    }
  }

  /* Filters through active effects to apply them to items, e.g. skills and weapons
  match[0] = the whole expression
  match[1] = ItemType
  match[2] = Item Name or ID
  match[3] = attribute key
  */
  static ITEM_REGEXP = /@([a-zA-Z0-9]+)\{(.+)\}\[([\S.]+)\]/;

  static ATTR_REGEXP =
    /system\.attributes\.(agility|smarts|spirit|strength|vigor)\.die\.modifier/;

  static GLOBAL_REGEXP = /system\.stats\.globalMods\.(\w+)/;

  static override migrateData(data) {
    super.migrateData(data);
    if ('changes' in data) {
      for (const change of data.changes) {
        const match: RegExpMatchArray = change.key.match(
          SwadeActiveEffect.ITEM_REGEXP,
        );
        if (match) {
          const newKey = match[3].trim().replace(/^data\./, 'system.');
          change.key = `@${match[1].trim()}{${match[2].trim()}}[${newKey}]`;
        }
      }
    }
    return data;
  }

  override apply(actor: SwadeActor, change: EffectChangeData) {
    const itemMatch = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
    const attrMatch = change.key.match(SwadeActiveEffect.ATTR_REGEXP);
    const globalMatch = change.key.match(SwadeActiveEffect.GLOBAL_REGEXP);
    if (itemMatch) {
      //get the properties from the match
      const key = itemMatch[3].trim();
      const value = change.value;
      //get the affected items
      const affectedItems = this._getAffectedItems(actor, change);
      //apply the AE to each item
      for (const item of affectedItems) {
        const overrides = foundry.utils.flattenObject(item.overrides);
        // Specialized handling of modifiers so they are listed separately in the RollDialog
        if (
          key === 'system.die.modifier' &&
          itemMatch[1].trim().toLowerCase() === 'skill' &&
          change.mode === CONST.ACTIVE_EFFECT_MODES.ADD
        ) {
          const effectKey = 'system.effects';
          if (!(effectKey in overrides))
            overrides[effectKey] = new Array<RollModifier>();
          this._updateTraitRollEffects(overrides[effectKey], value);
          // NOT calling super.apply because normal apply doesn't handle objects
          setProperty(item, effectKey, overrides[effectKey]);
        } else {
          // Die sizes for Trait and Wild Die
          overrides[key] = Number.isNumeric(value) ? Number(value) : value;
          //mock up a new change object with the key and value we extracted from the original key and feed it into the super apply method alongside the item
          const mockChange = { ...change, key, value };
          //@ts-expect-error It normally expects an Actor but since it only targets the data we can re-use it for Items
          super.apply(item, mockChange);
        }
        item.overrides = foundry.utils.expandObject(overrides);
      }
    } else if (attrMatch && change.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
      const overrides = foundry.utils.flattenObject(actor.overrides);
      const effectKey = 'system.attributes.' + attrMatch[1] + '.effects';
      if (!(effectKey in overrides))
        overrides[effectKey] = new Array<RollModifier>();
      this._updateTraitRollEffects(overrides[effectKey], change.value);
      // NOT calling super.apply because normal apply doesn't handle objects
      setProperty(actor, effectKey, overrides[effectKey]);
      actor.overrides = foundry.utils.expandObject(overrides);
    } else if (globalMatch) {
      if (
        change.mode === CONST.ACTIVE_EFFECT_MODES.ADD &&
        actor.system.stats.globalMods.hasOwnProperty(globalMatch[1])
      ) {
        const overrides = foundry.utils.flattenObject(actor.overrides);
        const effectKey = 'system.stats.globalMods.' + globalMatch[1];
        if (!(effectKey in overrides))
          overrides[effectKey] = new Array<RollModifier>();
        this._updateTraitRollEffects(overrides[effectKey], change.value, false);
        // NOT calling super.apply because normal apply doesn't handle objects
        setProperty(actor, effectKey, overrides[effectKey]);
        actor.overrides = foundry.utils.expandObject(overrides);
      } else {
        Logger.warn(
          'Invalid Global Modifier ' + change.key + 'on effect ' + this.id,
        );
      }
    } else {
      return super.apply(actor, change);
    }
  }

  private _getAffectedItems(actor: SwadeActor, change: EffectChangeData) {
    const items = new Array<SwadeItem>();
    const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
    if (match) {
      //get the properties from the match
      const type = match[1].trim().toLowerCase();
      const name = match[2].trim();
      //filter the items down, according to type and name/id
      items.push(
        ...actor.items.filter(
          (i) => i.type === type && (i.name === name || i.id === name),
        ),
      );
    }
    return items;
  }

  /**
   * Removes Effects from Items
   * @param parent The parent object
   */
  private _removeEffectsFromItems(parent: SwadeActor) {
    const affectedItems = new Array<SwadeItem>();
    this.changes.forEach((c) =>
      affectedItems.push(...this._getAffectedItems(parent, c)),
    );
    for (const item of affectedItems) {
      const overrides = foundry.utils.flattenObject(item.overrides);
      for (const change of this.changes) {
        const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
        if (match) {
          const key = match[3].trim();
          if (
            key === 'system.die.modifier' &&
            match[1].trim().toLowerCase() === 'skill' &&
            change.mode === CONST.ACTIVE_EFFECT_MODES.ADD
          ) {
            setProperty(item, 'system.effects', []);
          } else {
            //delete override
            delete overrides[key];
            //restore original data from source
            const source = getProperty(item._source, key);
            setProperty(item, key, source);
          }
        }
      }
      item.overrides = foundry.utils.expandObject(overrides);
      if (item.sheet?.rendered) item.sheet.render(true);
    }
  }

  private _updateTraitRollEffects(
    effectsArray: RollModifier[],
    value: number | string,
    ignore = true,
  ): boolean {
    if (!this.id) {
      // Handling null ID - don't want to make un-deletable override
      console.warn('No ID found!');
      return false;
    }
    const modifier: RollModifier = {
      label: this.name ?? game.i18n.localize('SWADE.Addi'),
      value: Number.isNumeric(value) ? Number(value) : value,
      effectID: this.id,
      ignore: this.getFlag('swade', 'conditionalEffect') ?? ignore,
    };
    // Technically doesn't handle an effect that adds to the same item multiple times,
    // but necessary to avoid duplication on refresh
    const splice: RollModifier | null = effectsArray.findSplice(
      (e) => e.effectID === this.id,
      modifier,
    );
    if (!splice) effectsArray.push(modifier);
    return true;
  }

  /** This functions checks the effect expiration behavior and either auto-deletes or prompts for deletion */
  async expire() {
    if (!isFirstOwner(this.parent)) {
      return game.swade.sockets.removeStatusEffect(this.uuid);
    }

    const statusId = this.statusId ?? '';
    if (game.swade.effectCallbacks.has(statusId)) {
      const callbackFn = game.swade.effectCallbacks.get(statusId, {
        strict: true,
      });
      return callbackFn(this);
    }

    const expiration = this.getFlag('swade', 'expiration');
    const startOfTurnAuto =
      expiration === constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto;
    const startOfTurnPrompt =
      expiration === constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt;
    const endOfTurnAuto =
      expiration === constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto;
    const endOfTurnPrompt =
      expiration === constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt;
    const auto = startOfTurnAuto || endOfTurnAuto;
    const prompt = startOfTurnPrompt || endOfTurnPrompt;

    if (auto) {
      await this.delete();
    } else if (prompt) {
      await this.promptEffectDeletion();
    }
  }

  isExpired(pointInTurn: 'start' | 'end'): boolean {
    const isRightPointInTurn =
      (pointInTurn === 'start' && this.expiresAtStartOfTurn) ||
      (pointInTurn === 'end' && this.expiresAtEndOfTurn);
    const remaining = this.duration?.remaining ?? 0;
    return isRightPointInTurn && remaining < 1;
  }

  async promptEffectDeletion() {
    const title = game.i18n.format('SWADE.RemoveEffectTitle', {
      name: this.name,
    });
    const content = game.i18n.format('SWADE.RemoveEffectBody', {
      name: this.name,
      parent: this.parent?.name,
    });
    const buttons: Record<string, Dialog.Button> = {
      yes: {
        label: game.i18n.localize('Yes'),
        icon: '<i class="fas fa-check"></i>',
        callback: () => this.delete(),
      },
      no: {
        label: game.i18n.localize('No'),
        icon: '<i class="fas fa-times"></i>',
      },
      reset: {
        label: game.i18n.localize('SWADE.ActiveEffects.ResetDuration'),
        icon: '<i class="fas fa-repeat"></i>',
        callback: async () => {
          await this.resetDuration();
        },
      },
    };
    new Dialog({ title, content, buttons }).render(true);
  }

  async resetDuration() {
    await this.update({
      duration: {
        startRound: game.combat?.round ?? 1,
        startTime: game.time.worldTime,
      },
    });
  }

  protected override async _onUpdate(
    changed: PropertiesToSource<ActiveEffectDataProperties>,
    options: DocumentModificationOptions,
    userId: string,
  ) {
    await super._onUpdate(changed, options, userId);
    if (this.getFlag('swade', 'loseTurnOnHold')) {
      const combatant = game.combat?.combatants.find(
        (c) => c.actor?.id === this.parent?.id,
      );
      if (combatant?.getFlag('swade', 'roundHeld')) {
        await combatant?.setFlag('swade', 'turnLost', true);
        await combatant?.unsetFlag('swade', 'roundHeld');
      }
    }
  }

  protected override async _preUpdate(
    changed: ActiveEffectDataConstructorData,
    options: DocumentModificationOptions,
    user: User,
  ) {
    super._preUpdate(changed, options, user);
    //return early if the parent isn't an actor or we're not actually affecting items
    if (
      this.affectsItems &&
      this.parent instanceof CONFIG.Actor.documentClass
    ) {
      this._removeEffectsFromItems(this.parent);
    }
  }

  protected override async _preDelete(
    options: DocumentModificationOptions,
    user: User,
  ) {
    super._preDelete(options, user);
    const parent = this.parent;
    //remove the effects from the item
    if (this.affectsItems && parent instanceof CONFIG.Actor.documentClass) {
      this._removeEffectsFromItems(parent);
    }
    // Get the active Combat if there is one.
    const activeCombat = game.combats?.active;
    if (activeCombat) {
      // Get the Combatant that corresponds to the Actor.
      const combatant = activeCombat.getCombatantByActor(
        this.parent?.id as string,
      );
      // If there is a corresponding Combatant, process Combatant Controls
      if (combatant) {
        // If status is Holding, turn off Hold for Combatant.
        if (this.statusId === 'holding') {
          await combatant?.unsetFlag('swade', 'roundHeld');
        }
      }
    }
  }

  protected override async _preCreate(
    data: ActiveEffectDataConstructorData,
    options: DocumentModificationOptions,
    user: BaseUser,
  ): Promise<void> {
    super._preCreate(data, options, user);
    if (!data.icon) {
      this.updateSource({
        icon: 'systems/swade/assets/icons/active-effect.svg',
      });
    }
    // Get the active Combat if there is one.
    const activeCombat = game.combats?.active;
    if (activeCombat) {
      // Get the Combatant that corresponds to the Actor.
      const combatant = activeCombat.getCombatantByActor(
        this.parent?.id as string,
      );
      // If there is a corresponding Combatant, process Combatant Controls
      if (combatant) {
        // If status is Holding, turn on Hold for Combatant.
        if (this.statusId === 'holding') {
          await combatant.setRoundHeld(activeCombat.current.round as number);
        }
      }
    }

    //localize names, just to be sure
    this.updateSource({ name: game.i18n.localize(this.name) });

    //automatically favorite status effects
    if (data.flags?.core?.statusId) {
      this.updateSource({ 'flags.swade.favorite': true });
    }

    // If there's no duration value and there's a combat, at least set the combat ID which then sets a startRound and startTurn, too.
    if (!data.duration?.combat && game.combat) {
      this.updateSource({ 'duration.combat': game.combat.id });
    }

    //set the world time at creation
    this.updateSource({ duration: { startTime: game.time.worldTime } });

    if (this.getFlag('swade', 'loseTurnOnHold')) {
      const combatant = game.combat?.combatants.find(
        (c) => c.actor?.id === this.parent?.id,
      );
      if (combatant?.getFlag('swade', 'roundHeld')) {
        await Promise.all([
          combatant?.setFlag('swade', 'turnLost', true),
          combatant?.unsetFlag('swade', 'roundHeld'),
        ]);
      }
    }
  }

  protected override _onCreate(
    data: PropertiesToSource<ActiveEffectDataProperties>,
    options: DocumentModificationOptions,
    userId: string,
  ): void {
    super._onCreate(data, options, userId);
    const related = this.getFlag('swade', 'related');
    if (related && this.parent?.documentName === 'Actor' && !!this.statusId) {
      for (const [id, mutation] of Object.entries(related)) {
        if (this.parent.effects.find((e) => id === e.statusId)) continue; //skip if the effect already exists on the actor
        const statusEffect = getStatusEffectDataById(id);
        if (!statusEffect) continue; //skip if we can't find the effect
        //apply the mutation if one exists
        const effect = foundry.utils.isEmpty(mutation)
          ? statusEffect
          : foundry.utils.mergeObject(statusEffect, mutation, {
              performDeletions: true,
            });
        setProperty(effect, 'flags.swade.favorite', true);
        this.parent.toggleActiveEffect(effect, { active: true });
      }
    }
  }
}
