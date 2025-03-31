import { RollModifier } from '../../../interfaces/additional.interface';
import { Logger } from '../../Logger';
import { constants } from '../../constants';
import { GroupData, VehicleData } from '../../data/actor';
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
        related?: Record<string, ActiveEffect.CreateData>;
      };
    };
  }
}

export default class SwadeActiveEffect<
  Subtype extends ActiveEffect.SubType = ActiveEffect.SubType,
> extends ActiveEffect<Subtype> {
  static override defaultName(
    context: foundry.abstract.Document.DefaultNameContext<
      ActiveEffect.SubType,
      Exclude<ActiveEffect.Parent, null>
    > = {},
  ): string {
    // Base active effect should just be called "Active Effect"
    if (!('type' in context) || context.type === 'base') {
      return game.i18n.format('DOCUMENT.New', {
        type: game.i18n.localize('DOCUMENT.ActiveEffect'),
      });
    }
    return super.defaultName(context);
  }

  get affectsItems() {
    const affectedItems = new Array<SwadeItem>();
    this.changes.forEach((c: ActiveEffect.EffectChangeData) =>
      affectedItems.push(...this._getAffectedItems(this.parent!, c)),
    );
    return affectedItems.length > 0;
  }

  get statusId() {
    return this.statuses.first();
  }

  override get isSuppressed(): boolean {
    if (this.parent?.type === 'group') return true;
    return false;
  }

  /** A convenience accessor that returns the effect's containing actor, if it has one */
  get actor(): SwadeActor | undefined {
    const parent = this.parent;
    if (parent instanceof SwadeActor) return parent;
    if (parent instanceof SwadeItem && parent.actor instanceof SwadeActor)
      return parent.actor;
  }

  get expiresAtStartOfTurn(): boolean {
    const expiration = this.system.expiration ?? -1;
    return [
      constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto,
      constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt,
    ].includes(expiration);
  }

  get expiresAtEndOfTurn(): boolean {
    const expiration = this.system.expiration ?? -1;
    return [
      constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto,
      constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt,
    ].includes(expiration);
  }

  get expirationText(): string {
    const expiration = this.system.expiration ?? -1;
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

  /**
   * Filters through active effects to apply them to items, e.g. skills and weapons
   * * match[0] = the whole expression
   * * match[1] = ItemType
   * * match[2] = Item Name or ID
   * * match[3] = attribute key
   */
  static ITEM_REGEXP = /@([a-zA-Z0-9]+)\{(.+)\}\[([\S.]+)\]/;

  static ATTR_REGEXP =
    /system\.attributes\.(agility|smarts|spirit|strength|vigor)\.die\.modifier/;

  static GLOBAL_REGEXP = /system\.stats\.globalMods\.(\w+)/;

  static PT_REGEXP = /system\.stats\.(parry|toughness)\.(value|armor)/;

  static override migrateData(data: any) {
    super.migrateData(data);
    if ('changes' in data) {
      for (const change of data.changes) {
        const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
        if (match) {
          const newKey = match[3].trim().replace(/^data\./, 'system.');
          change.key = `@${match[1].trim()}{${match[2].trim()}}[${newKey}]`;
        }

        //fix up effects that had an action related key
        change.key = change.key.replaceAll(
          'system.actions.skillMod',
          'system.actions.traitMod',
        );
        change.key = change.key.replaceAll(
          'system.actions.skill',
          'system.actions.trait',
        );
        change.key = change.key.replaceAll(
          'system.stats.speed.value',
          'system.pace',
        );
        change.key = change.key.replaceAll(
          'system.stats.speed.adjusted',
          'system.pace',
        );
        change.key = change.key.replaceAll(
          'system.stats.speed.runningDie',
          'system.pace.running.die',
        );
        change.key = change.key.replaceAll(
          'system.stats.speed.runningMod',
          'system.pace.running.mod',
        );
      }
    }

    const flags = data.flags?.swade;

    if (flags) {
      const keys = [
        'removeEffect',
        'expiration',
        'loseTurnOnHold',
        'favorite',
        'conditionalEffect',
      ];
      const flags = data.flags.swade;
      data.system ??= {};

      for (const key of keys) {
        if (key in flags) {
          data.system[key] = flags[key];
          delete flags[key];
        }
      }
    }
    return data;
  }

  override apply(
    doc: SwadeActor | SwadeItem,
    change: ActiveEffect.EffectChangeData,
  ) {
    const itemMatch = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
    const attrMatch = change.key.match(SwadeActiveEffect.ATTR_REGEXP);
    const globalMatch = change.key.match(SwadeActiveEffect.GLOBAL_REGEXP);
    const ptMatch = change.key.match(SwadeActiveEffect.PT_REGEXP);
    if (itemMatch) {
      this._handleItemMatch(itemMatch, change, doc);
    } else if (
      attrMatch &&
      change.mode === CONST.ACTIVE_EFFECT_MODES.ADD &&
      doc instanceof SwadeActor
    ) {
      this._handleAttributeMatch(attrMatch, change, doc);
    } else if (globalMatch && doc instanceof SwadeActor) {
      this._handleGlobalModifierMatch(globalMatch, change, doc);
    } else if (ptMatch && doc instanceof SwadeActor) {
      this._handlePTModifierMatch(ptMatch, change, doc);
    } else {
      return super.apply(doc as SwadeActor, change);
    }
  }

  private _getAffectedItems(
    parent: SwadeActor | SwadeItem,
    change: ActiveEffect.EffectChangeData,
  ) {
    const items = new Array<SwadeItem>();
    const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
    if (!match) return items;
    //get the properties from the match
    const type = match[1].trim().toLowerCase();
    const name = match[2].trim();
    //filter the items down, according to type and name/id
    const collection =
      parent instanceof SwadeItem ? (parent.parent?.items ?? []) : parent.items;
    items.push(
      ...collection.filter(
        (i) => i.type === type && (i.name === name || i.id === name),
      ),
    );
    return items;
  }

  /**
   * Removes Effects from Items
   * @param parent The parent object
   */
  private _removeEffectsFromItems(parent: SwadeActor | SwadeItem) {
    const affectedItems = new Array<SwadeItem>();
    this.changes.forEach((c) =>
      affectedItems.push(...this._getAffectedItems(parent, c)),
    );
    for (const item of affectedItems) {
      for (const change of this.changes as ActiveEffect.EffectChangeData[]) {
        const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
        if (!match) continue;
        const key = match[3].trim();
        if (
          key === 'system.die.modifier' &&
          match[1].trim().toLowerCase() === 'skill' &&
          change.mode === CONST.ACTIVE_EFFECT_MODES.ADD
        ) {
          foundry.utils.setProperty(item, 'system.effects', []);
        } else {
          //restore original data from source
          const source = foundry.utils.getProperty(item._source, key);
          foundry.utils.setProperty(item, key, source);
        }
      }
      if (item.sheet?.rendered) item.sheet.render(true);
    }
  }

  private _updateTraitRollEffects(
    effectsArray: RollModifier[],
    value: number | string,
    ignore = false,
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
      ignore: this.system.conditionalEffect || ignore,
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

  private async _applyRelatedEffects() {
    const related = this.getFlag('swade', 'related') ?? {};
    if (!this.actor || !this.statusId) return;
    const toCreate: ActiveEffect.CreateData[] = [];
    for (const [id, mutation] of Object.entries(related)) {
      const statusEffect = getStatusEffectDataById(id);
      //skip if the effect already exists on the actor
      if (this.actor.statuses.has(id) || !statusEffect) continue;
      //apply the mutation if one exists
      const effect = foundry.utils.mergeObject(
        statusEffect,
        { statuses: [id], ...mutation },
        { performDeletions: true },
      );
      toCreate.push(effect);
    }
    await this.actor?.createEmbeddedDocuments('ActiveEffect', toCreate);
  }

  private _handleItemMatch(
    match: RegExpMatchArray,
    change: ActiveEffect.EffectChangeData,
    doc: SwadeActor | SwadeItem,
  ) {
    //get the properties from the match
    const key = match[3].trim();
    const value = change.value;
    //get the affected items
    const affectedItems = this._getAffectedItems(doc, change);
    //apply the AE to each item
    for (const item of affectedItems) {
      const overrides = foundry.utils.flattenObject(item.overrides ?? {});
      // Specialized handling of modifiers so they are listed separately in the RollDialog
      if (
        key === 'system.die.modifier' &&
        match[1].trim().toLowerCase() === 'skill' &&
        change.mode === CONST.ACTIVE_EFFECT_MODES.ADD
      ) {
        const effectKey = 'system.effects';
        overrides[effectKey] ??= new Array<RollModifier>();
        this._updateTraitRollEffects(overrides[effectKey], value);
        // NOT calling super.apply because normal apply doesn't handle objects
        foundry.utils.setProperty(item, effectKey, overrides[effectKey]);
      } else {
        //mock up a new change object with the key and value we extracted from the original key and feed it into the super apply method alongside the item
        const mockChange = { ...change, key, value };
        // @ts-expect-error AE.apply doesn't actually require an Actor, just a Document
        const changes = super.apply(item, mockChange);
        Object.assign(overrides, changes);
      }
      item.overrides = foundry.utils.expandObject(overrides);
    }
  }

  private _handleAttributeMatch(
    match: RegExpMatchArray,
    change: ActiveEffect.EffectChangeData,
    doc: SwadeActor,
  ) {
    const overrides = foundry.utils.flattenObject(doc.overrides ?? {});
    const effectKey = 'system.attributes.' + match[1] + '.effects';
    if (!(effectKey in overrides))
      overrides[effectKey] = new Array<RollModifier>();
    this._updateTraitRollEffects(overrides[effectKey], change.value);
    // NOT calling super.apply because normal apply doesn't handle objects
    foundry.utils.setProperty(doc, effectKey, overrides[effectKey]);
    doc.overrides = foundry.utils.expandObject(overrides);
  }

  private _handleGlobalModifierMatch(
    match: RegExpMatchArray,
    change: ActiveEffect.EffectChangeData,
    doc: SwadeActor,
  ) {
    if (doc.system instanceof GroupData) return; // Really shouldn't be a vehicle or group
    if (
      change.mode === CONST.ACTIVE_EFFECT_MODES.ADD &&
      doc.system.stats.globalMods.hasOwnProperty(match[1])
    ) {
      const overrides = foundry.utils.flattenObject(doc.overrides ?? {});
      const effectKey = 'system.stats.globalMods.' + match[1];
      if (!(effectKey in overrides))
        overrides[effectKey] = new Array<RollModifier>();
      this._updateTraitRollEffects(overrides[effectKey], change.value, false);
      // NOT calling super.apply because normal apply doesn't handle objects
      foundry.utils.setProperty(doc, effectKey, overrides[effectKey]);
      doc.overrides = foundry.utils.expandObject(overrides);
    } else {
      Logger.warn(
        'Invalid Global Modifier ' + change.key + 'on effect ' + this.id,
      );
    }
  }

  private _handlePTModifierMatch(
    match: RegExpMatchArray,
    change: ActiveEffect.EffectChangeData,
    doc: SwadeActor,
  ) {
    if (doc.system instanceof VehicleData || doc.system instanceof GroupData)
      return; // Really shouldn't be a vehicle or group
    if (change.mode === CONST.ACTIVE_EFFECT_MODES.CUSTOM) {
      super.apply(doc, change);
      return;
    }
    const autoCalc =
      match[1] === 'parry'
        ? doc.system.details.autoCalcParry
        : doc.system.details.autoCalcToughness;
    const target =
      match[2] === 'armor'
        ? 'armorEffects' // Armor gets its own display
        : autoCalc
          ? 'effects'
          : 'sources';
    doc.system.stats[match[1]][target].push({
      label: this.name,
      value: Number(change.value),
      mode: change.mode,
    });
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

    const expiration = this.system.expiration;
    const startOfTurnAuto =
      expiration === constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto;
    const startOfTurnPrompt =
      expiration === constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt;
    const endOfTurnAuto =
      expiration === constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto;
    const endOfTurnPrompt =
      expiration === constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt;

    if (startOfTurnAuto || endOfTurnAuto) {
      await this.delete();
    } else if (startOfTurnPrompt || endOfTurnPrompt) {
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
      label: this.name,
    });
    const content = game.i18n.format('SWADE.RemoveEffectBody', {
      label: this.name,
      parent: this.parent?.name,
    });
    const buttons: Record<string, DialogButton> = {
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
    changed: ActiveEffect.UpdateData,
    options: ActiveEffect.Database.OnUpdateOperation,
    userId: string,
  ) {
    await super._onUpdate(changed, options, userId);
    if (this.system.loseTurnOnHold) {
      const activeCombat = game.combats?.active;
      if (!this.actor || !activeCombat) return;
      // If the Actor is a Token, get the combatant by the Token ID instead of Actor ID because Tokens share Actor IDs. Otherwise, get the combatant by Actor ID.
      const combatant = this.actor.isToken
        ? activeCombat?.getCombatantsByToken(
            this.actor.token?.id as string,
          )?.[0]
        : activeCombat?.getCombatantsByActor(this.actor.id as string)?.[0];
      if (combatant?.getFlag('swade', 'roundHeld')) {
        await combatant?.update({ 'flags.swade.turnLost': true });
        await combatant?.toggleHold();
      }
    }
  }

  protected override async _preUpdate(
    changed: ActiveEffect.UpdateData,
    options: ActiveEffect.Database.PreUpdateOptions,
    user: User.Implementation,
  ) {
    super._preUpdate(changed, options, user);
    //return early if the parent isn't an actor or we're not actually affecting items
    if (this.affectsItems && this.parent) {
      this._removeEffectsFromItems(this.parent);
    }
  }

  protected override async _preDelete(
    options: ActiveEffect.Database.PreDeleteOptions,
    user: User.Implementation,
  ) {
    super._preDelete(options, user);
    const parent = this.parent;
    //remove the effects from the item
    if (this.affectsItems && parent instanceof SwadeActor) {
      this._removeEffectsFromItems(parent);
    }
    // Get the active Combat if there is one.
    const combat = game.combats?.active;
    const combatant = this?.actor?.getCombatant(combat);
    if (combat && combatant) {
      // If status is Holding, turn off Hold for Combatant.
      if (this.statusId === 'holding') {
        await combatant?.update({ 'flags.swade.-=roundHeld': null });
      }
    }
  }

  protected override async _preCreate(
    data: ActiveEffect.CreateData,
    options: ActiveEffect.Database.PreUpdateOptions,
    user: User.Implementation,
  ): Promise<boolean | void> {
    //make sure active effects can't be added to group actors
    if (this.parent?.type === 'group') return false;
    super._preCreate(data, options, user);
    if (!data.img) {
      let path = 'systems/swade/assets/icons/active-effect.svg';
      if (this.parent instanceof SwadeItem) path = this.parent.img as string;
      this.updateSource({ img: path });
    }
    const isDefaultName = data.name === SwadeActiveEffect.defaultName();
    if (this.parent instanceof SwadeItem && (!data.name || isDefaultName)) {
      this.updateSource({ name: this.parent.name });
    }
    if (!this.origin && this.parent) {
      this.updateSource({ origin: this.parent.uuid });
    }

    //localize names, just to be sure
    this.updateSource({ name: game.i18n.localize(this.name) });

    //automatically favorite status effects
    if (this.statusId) this.updateSource({ 'system.favorite': true });

    //set the world time at creation
    this.updateSource({ duration: { startTime: game.time.worldTime } });

    // Get the active Combat if there is one.
    const combat = game.combats?.active;
    const combatant = this.actor?.getCombatant(combat);
    if (combat && combatant) {
      // If status is Holding, turn on Hold for Combatant.
      if (this.statusId === 'holding') {
        await combatant.setRoundHeld(combat.current.round as number);
      }
      // If there's no duration value and there's a combat, at least set the combat ID which then sets a startRound and startTurn, too.
      if (!data.duration?.combat) {
        this.updateSource({ 'duration.combat': combat.id });
      }
      if (this.system.loseTurnOnHold) {
        if (combatant.roundHeld) {
          await Promise.allSettled([
            combatant.update({ 'flags.swade.turnLost': true }),
            combatant.toggleHold(),
          ]);
        }
      }
    }

    //Update wild attack damage based on a flag
    if (this.statuses.has('wild-attack')) {
      const damageModIndex = this.changes.findIndex(
        (c) => c.key === 'system.stats.globalMods.damage',
      );
      const newDamage = this.actor?.getFlag('swade', 'wildAttackDamage');
      if (['number', 'string'].includes(typeof newDamage)) {
        const newChanges = foundry.utils.deepClone(this.changes);
        newChanges[damageModIndex].value = String(newDamage);
        this.updateSource({ changes: newChanges });
      }
    }
  }

  protected override _onCreate(
    data: ActiveEffect.CreateData,
    options: ActiveEffect.Database.OnCreateOperation,
    userId: string,
  ): void {
    super._onCreate(data, options, userId);
    if (userId === game.userId) this._applyRelatedEffects();
  }

  protected override _displayScrollingStatus(enabled: boolean) {
    super._displayScrollingStatus(enabled);
    const tokens = (this.target as SwadeActor)?.getActiveTokens(true);
    const isNegative = CONFIG.SWADE.negativeStatusEffects.includes(
      this.statusId ?? '',
    );

    const negativeColor = '#D41159';
    const positiveColor = '#1A85FF';
    const colorCode = enabled
      ? isNegative // if the AE is added and negative, flash negative color, else flash positive color
        ? negativeColor
        : positiveColor
      : isNegative // if the AE is getting removed and negative, flash negative color, else flash positive color
        ? positiveColor
        : negativeColor;
    const color = Color.from(colorCode);
    for (const token of tokens) {
      token.ring?.flashColor(color, {
        duration: 1000,
        easing: CONFIG.Token.ring?.ringClass.createSpikeEasing(0.4),
      });
    }
  }
}
