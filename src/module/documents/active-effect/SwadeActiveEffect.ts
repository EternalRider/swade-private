import { RollModifier } from '../../../interfaces/additional.interface';
import { Logger } from '../../Logger';
import { constants } from '../../constants';
import { GroupData } from '../../data/actor';
import { getStatusEffectDataById, isFirstOwner } from '../../util';
import SwadeActor from '../actor/SwadeActor';
import SwadeItem from '../item/SwadeItem';

declare global {
  interface DocumentClassConfig {
    ActiveEffect: typeof SwadeActiveEffect<ActiveEffect.SubType>;
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
    context: foundry.abstract.Document.DefaultNameContext<'ActiveEffect', NonNullable<ActiveEffect.Parent>> = {}
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
    this.system.changes.forEach((c: ActiveEffect.ChangeData) =>
      affectedItems.push(...SwadeActiveEffect._getAffectedItems(this.parent!, c))
    );
    return affectedItems.length > 0;
  }

  get statusId() {
    return this.statuses.first();
  }

  override get isSuppressed(): boolean {
    if (super.isSuppressed === false) return false;
    if (this.parent?.type === 'group') return true;
    return false;
  }

  /** A convenience accessor that returns the effect's containing actor, if it has one */
  get actor(): SwadeActor | undefined {
    const parent = this.parent;
    if (parent instanceof SwadeActor) return parent;
    if (parent instanceof SwadeItem && parent.actor instanceof SwadeActor) return parent.actor;
  }

  get expiresAtStartOfTurn(): boolean {
    return this.duration.expiry.startsWith('turnStart');
  }

  get expiresAtEndOfTurn(): boolean {
    return this.duration.expiry.startsWith('turnEnd');
  }

  get expirationText(): string {
    let localizationKey = 'SWADE.Expiration.';
    const suffix = this.duration.expiry.endsWith("Prompt") ? 'Prompt' : 'Auto';
    if (this.duration.expiry === 'turnStart') localizationKey += `Begin${suffix}`;
    else if (this.duration.expiry === 'turnEnd') localizationKey += `End${suffix}`;
    else localizationKey += 'None';
    return _loc(localizationKey);
  }

  /**
   * Filters through active effects to apply them to items, e.g. skills and weapons
   * * match[0] = the whole expression
   * * match[1] = ItemType
   * * match[2] = Item Name or ID
   * * match[3] = attribute key
   */
  static ITEM_REGEXP = /@([a-zA-Z0-9]+)\{(.+)\}\[([\S.]+)\]/;

  static ATTR_REGEXP = /system\.attributes\.(agility|smarts|spirit|strength|vigor)\.die\.modifier/;

  static GLOBAL_REGEXP = /system\.stats\.globalMods\.(\w+)/;

  static PT_REGEXP = /system\.stats\.(parry|toughness)\.(value|armor)/;

  static override migrateData(data: any) {
    // First migrate old flags
    const flags = data.flags?.swade;
    data.system ??= {};
    if (flags) {
      const keys = ['removeEffect', 'expiration', 'loseTurnOnHold', 'favorite', 'conditionalEffect'];
      const flags = data.flags.swade;

      for (const key of keys) {
        if (key in flags) {
          data.system[key] = flags[key];
          delete flags[key];
        }
      }
    }
    // A little duration migration before Core gets to it
    if (data.duration && !data.duration.expiry && (data.duration.units === 'rounds') && Number.isNumeric(data.duration.value)) {
      data.duration.expiry = (data.system.expiration < 2) ? 'turnStart' : 'turnEnd';
      if (data.system.expiration % 2) data.duration.expiry += 'Prompt';
    }
    return super.migrateData(data);
  }

  static override applyChange(doc: SwadeActor | SwadeItem, change: ActiveEffect.ChangeData, options) {
    const itemMatch = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
    const attrMatch = change.key.match(SwadeActiveEffect.ATTR_REGEXP);
    const globalMatch = change.key.match(SwadeActiveEffect.GLOBAL_REGEXP);
    const ptMatch = change.key.match(SwadeActiveEffect.PT_REGEXP);
    if (itemMatch) {
      this._handleItemMatch(itemMatch, change, doc, options);
    } else if (attrMatch && change.type === constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD && doc instanceof SwadeActor) {
      this._handleAttributeMatch(attrMatch, change, doc);
    } else if (globalMatch && doc instanceof SwadeActor) {
      this._handleGlobalModifierMatch(globalMatch, change, doc);
    } else if (ptMatch && doc instanceof SwadeActor) {
      this._handlePTModifierMatch(ptMatch, change, doc, options);
    } else {
      return super.applyChange(doc as SwadeActor, change, options);
    }
  }

  private static _getAffectedItems(parent: SwadeActor | SwadeItem, change: ActiveEffect.ChangeData) {
    const items = new Array<SwadeItem>();
    const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
    if (!match) return items;
    //get the properties from the match
    const type = match[1].trim().toLowerCase();
    const name = match[2].trim();
    //filter the items down, according to type and name/id
    const collection = parent instanceof SwadeItem ? (parent.parent?.items ?? []) : parent.items;
    items.push(...collection.filter((i) => i.type === type && (i.name === name || i.id === name)));
    return items;
  }

  /**
   * Removes Effects from Items
   * @param parent The parent object
   */
  private _removeEffectsFromItems(parent: SwadeActor | SwadeItem) {
    const affectedItems = new Array<SwadeItem>();
    this.changes.forEach((c) => affectedItems.push(...SwadeActiveEffect._getAffectedItems(parent, c)));
    for (const item of affectedItems) {
      for (const change of this.changes as ActiveEffect.ChangeData[]) {
        const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
        if (!match) continue;
        const key = match[3].trim();
        const type = match[1].trim().toLowerCase();
        if (key === 'system.die.modifier' && type === 'skill' && change.type === constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD) {
          foundry.utils.setProperty(item, 'system.effects', []);
        } else {
          //restore original data from source
          item.reset();
        }
      }
      if (item.sheet?.rendered) item.sheet.render({ force: true });
    }
  }

  private static _updateTraitRollEffects(effectsArray: RollModifier[], change: ActiveEffect.ChangeData, ignore = false): boolean {
    const modifier: RollModifier = {
      label: change.effect.name ?? game.i18n.localize('SWADE.Addi'),
      value: Number.isNumeric(change.value) ? Number(change.value) : change.value,
      effectID: change.effect.id,
      ignore: change.effect.system.conditionalEffect || ignore,
    };
    // Technically doesn't handle an effect that adds to the same item multiple times,
    // but necessary to avoid duplication on refresh
    const splice: RollModifier | null = effectsArray.findSplice((e) => e.effectID === change.effect.id, modifier);
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
      const statuses = Array.from(statusEffect.statuses ?? []);
      statuses.push(id);
      const effect = foundry.utils.mergeObject(
        statusEffect,
        { statuses, ...mutation },
        { applyOperators: true, inplace: false }
      );
      toCreate.push(effect);
    }
    await this.actor?.createEmbeddedDocuments('ActiveEffect', toCreate, { keepId: true });
  }

  private static _handleItemMatch(match: RegExpMatchArray, change: ActiveEffect.ChangeData, doc: SwadeActor | SwadeItem, options) {
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
        change.type === constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD
      ) {
        const effectKey = 'system.effects';
        overrides[effectKey] ??= new Array<RollModifier>();
        this._updateTraitRollEffects(overrides[effectKey], change);
        // NOT calling super.apply because normal apply doesn't handle objects
        foundry.utils.setProperty(item, effectKey, overrides[effectKey]);
      } else {
        //mock up a new change object with the key and value we extracted from the original key and feed it into the super apply method alongside the item
        const mockChange = { ...change, key, value };
        // @ts-expect-error AE.apply doesn't actually require an Actor, just a Document
        const changes = super.applyChange(item, mockChange, options);
        Object.assign(overrides, changes);
      }
      item.overrides = foundry.utils.expandObject(overrides);
    }
  }

  private static _handleAttributeMatch(match: RegExpMatchArray, change: ActiveEffect.ChangeData, doc: SwadeActor) {
    const overrides = foundry.utils.flattenObject(doc.overrides ?? {});
    const effectKey = 'system.attributes.' + match[1] + '.effects';
    if (!(effectKey in overrides)) overrides[effectKey] = new Array<RollModifier>();
    this._updateTraitRollEffects(overrides[effectKey], change);
    // NOT calling super.apply because normal apply doesn't handle objects
    foundry.utils.setProperty(doc, effectKey, overrides[effectKey]);
    doc.overrides = foundry.utils.expandObject(overrides);
  }

  private static _handleGlobalModifierMatch(match: RegExpMatchArray, change: ActiveEffect.ChangeData, doc: SwadeActor) {
    if (doc.system instanceof GroupData) return; // Really shouldn't be a group
    if (change.type === constants.ACTIVE_EFFECT_CHANGE_TYPE.ADD && doc.system.stats.globalMods[match[1]] !== undefined) {
      const overrides = foundry.utils.flattenObject(doc.overrides ?? {});
      const effectKey = 'system.stats.globalMods.' + match[1];
      if (!(effectKey in overrides)) overrides[effectKey] = new Array<RollModifier>();
      this._updateTraitRollEffects(overrides[effectKey], change, false);
      // NOT calling super.apply because normal apply doesn't handle objects
      foundry.utils.setProperty(doc, effectKey, overrides[effectKey]);
      doc.overrides = foundry.utils.expandObject(overrides);
    } else {
      Logger.warn('Invalid Global Modifier ' + change.key + 'on effect ' + change.effect.id);
    }
  }

  private static _handlePTModifierMatch(match: RegExpMatchArray, change: ActiveEffect.ChangeData, doc: SwadeActor, options) {
    // Really shouldn't be a group
    if (doc.system instanceof GroupData) return;
    if (change.type === constants.ACTIVE_EFFECT_CHANGE_TYPE.CUSTOM) {
      super.applyChange(doc, change, options);
      return;
    }
    const autoCalc = match[1] === 'parry' ? doc.system.details.autoCalcParry : doc.system.details.autoCalcToughness;
    const target =
      match[2] === 'armor'
        ? 'armorEffects' // Armor gets its own display
        : autoCalc
          ? 'effects'
          : 'sources';
    doc.system.stats[match[1]][target]?.push({
      label: change.effect.name,
      value: Number(change.value),
      type: change.type,
    });
  }

  async handleTurnExpirations(pointInTurn: 'start' | 'end', context: object = {}) {
    if (!this.isTemporary) return;

    const duration = this.updateDuration(context);
    const remaining = duration.remaining ?? 0;

    // SWADE rules count the current turn as part of the duration, so if duration is in rounds, check < 2 instead of 1.
    if (remaining < 1 || (duration.units === 'rounds' && remaining < 2)) {
      if (pointInTurn === 'start' && duration.expiry?.startsWith('turnStart') ||
          pointInTurn === 'end' && duration.expiry?.startsWith('turnEnd')) {
        await this.expire();
      }
    }
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

    if (this.duration?.expiry?.includes('Prompt')) {
      await this.promptEffectDeletion();
    } else {
      await this.delete();
    }
  }

  async promptEffectDeletion() {
    const title = game.i18n.format('SWADE.RemoveEffectTitle', {
      label: this.name,
    });
    const content = game.i18n.format('SWADE.RemoveEffectBody', {
      label: this.name,
      parent: this.parent?.name ?? '',
    });
    const buttons: foundry.applications.api.DialogV2.Button[] = [
      {
        action: 'yes',
        label: game.i18n.localize('COMMON.Yes'),
        icon: '<i class="fas fa-check"></i>',
        callback: () => this.delete(),
      },
      {
        action: 'no',
        label: game.i18n.localize('COMMON.No'),
        icon: '<i class="fas fa-times"></i>',
      },
      {
        action: 'reset',
        label: game.i18n.localize('SWADE.ActiveEffects.ResetDuration'),
        icon: '<i class="fas fa-repeat"></i>',
        callback: async () => {
          await this.resetDuration();
        },
      },
    ];
    foundry.applications.api.Dialog.wait({ window: {title}, position: {width: 600}, content, buttons });
  }

  async resetDuration() {
    await this.update({
      start: {
        round: game.combat?.round ?? 1,
        time: game.time.worldTime,
      },
    });
  }

  protected override async _onUpdate(
    changed: ActiveEffect.UpdateData,
    options: ActiveEffect.Database.OnUpdateOperation,
    userId: string
  ) {
    await super._onUpdate(changed, options, userId);
    if (this.system.loseTurnOnHold) {
      const activeCombat = game.combats?.active;
      if (!this.actor || !activeCombat) return;
      // If the Actor is a Token, get the combatant by the Token ID instead of Actor ID because Tokens share Actor IDs. Otherwise, get the combatant by Actor ID.
      const combatant = this.actor.isToken
        ? activeCombat?.getCombatantsByToken(this.actor.token?.id as string)?.[0]
        : activeCombat?.getCombatantsByActor(this.actor.id as string)?.[0];
      if (combatant?.system.roundHeld) {
        await combatant?.update({ 'system.turnLost': true });
        await combatant?.toggleHold();
      }
    }
  }

  protected override async _preUpdate(
    changed: ActiveEffect.UpdateData,
    options: ActiveEffect.Database.PreUpdateOptions,
    user: User.Implementation
  ) {
    super._preUpdate(changed, options, user);
    //return early if the parent isn't an actor or we're not actually affecting items
    if (this.affectsItems && this.parent) {
      this._removeEffectsFromItems(this.parent);
    }
  }

  protected override async _preDelete(options: ActiveEffect.Database.PreDeleteOptions, user: User.Implementation) {
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
    options: ActiveEffect.Database.PreCreateOptions,
    user: User.Implementation
  ): Promise<boolean | void> {
    //make sure active effects can't be added to group actors
    if (this.parent?.type === 'group') return false;

    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

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

    // Get the active Combat if there is one.
    const combat = game.combats?.active;
    const combatant = this.actor?.getCombatant(combat);
    if (combat && combatant) {
      // If status is Holding, turn on Hold for Combatant.
      if (this.statusId === 'holding') {
        await combatant.setRoundHeld(combat.current.round as number);
      }
      if (this.system.loseTurnOnHold) {
        if (combatant.roundHeld) {
          await Promise.allSettled([combatant.update({ 'system.turnLost': true }), combatant.toggleHold()]);
        }
      }
      // Vulnerable & Distracted should expire this round if combatant hasn't gone yet, and be attached to target combatant
      if (['vulnerable000000', 'distracted000000'].includes(this._id)) {
        const sourceUpdate = { 'start.combatant': combatant.id };
        if ((combat.turn !== null) && (combat.turn < combatant.turnNumber) && (this.duration.units === 'rounds')) {
          sourceUpdate['duration.value'] = this.duration.value - 1;
        }
        this.updateSource(sourceUpdate);
      }
    }

    //Update wild attack damage based on a flag
    if (this.statuses.has('wild-attack')) {
      const damageModIndex = this.changes.findIndex((c) => c.key === 'system.stats.globalMods.damage');
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
    userId: string
  ): void {
    super._onCreate(data, options, userId);
    if (userId === game.userId) this._applyRelatedEffects();
  }

  protected override _displayScrollingStatus(enabled: boolean) {
    super._displayScrollingStatus(enabled);
    const tokens = (this.target as SwadeActor)?.getActiveTokens(true);
    const isNegative = CONFIG.SWADE.negativeStatusEffects.includes(this.statusId ?? '');

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
