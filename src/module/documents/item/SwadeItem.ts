import { AnyObject, DeepPartial } from 'fvtt-types/utils';
import { EquipState, ItemActions } from '../../../globals';
import IRollOptions from '../../../interfaces/RollOptions.interface';
import {
  ItemAction,
  RollModifier,
} from '../../../interfaces/additional.interface';
import { Logger } from '../../Logger';
import { ChoiceDialog } from '../../apps/ChoiceDialog';
import { RollDialog } from '../../apps/RollDialog';
import { constants } from '../../constants';
import { SwadePhysicalItemData } from '../../data/item/base';
import { DamageRoll } from '../../dice/DamageRoll';
import { getKeyByValue, modifierReducer, slugify } from '../../util';
import type SwadeActiveEffect from '../active-effect/SwadeActiveEffect';
import {
  ChoiceSet,
  ItemChatCardAction,
  ItemChatCardChip,
  ItemChatCardData,
  ItemDisplayPowerPoints,
  ItemGrant,
  ItemGrantChainLink,
} from './SwadeItem.interface';

declare global {
  interface DocumentClassConfig {
    Item: typeof SwadeItem<Item.SubType>;
  }
  interface FlagConfig {
    Item: {
      swade: {
        embeddedPowers: [string, Item.CreateData][];
        hasGranted?: string[];
        loadedAmmo?: Item.CreateData;
      };
    };
  }
  namespace Item {
    namespace Database {
      interface Create {
        isItemGrant?: boolean;
      }
    }
  }
}

class SwadeItem<
  Subtype extends Item.SubType = Item.SubType,
> extends Item<Subtype> {
  /** Used for item enrichers */
  declare plainTextDescription?: string;
  static RANGE_REGEX = /[0-9]+\/*/g;

  static override migrateData(data: Item.CreateData & AnyObject) {
    super.migrateData(data);
    if (data.flags?.swade?.embeddedPowers) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [key, item] of data.flags.swade.embeddedPowers) {
        if (item.system && !(item as any).data) continue;
        item.system = { ...(item as any).data };
        delete (item as any).data;
      }
    }
    if (data?.system?.grants) {
      for (const grant of data.system.grants as ItemGrant[]) {
        const uuid = grant.uuid;
        if (uuid.startsWith('Compendium.') && !uuid.includes('.Item.')) {
          const arr = uuid.split('.');
          arr.splice(arr.length - 1, 0, 'Item');
          grant.uuid = arr.join('.');
        }
        //bad UUID with multiple Item strings
        if (uuid.split('.').filter((v) => v === 'Item').length > 1) {
          const arr = uuid.split('.').filter((v) => v !== 'Item'); //remove all instances of Item
          arr.unshift('Item'); // add a single Item to the front
          grant.uuid = arr.join('.');
        }
      }
    }
    // eslint-disable-next-line deprecation/deprecation
    if (
      data.type === 'ability' &&
      ['ancestry', 'race'].includes(data.system?.subtype as string)
    ) {
      data.type = 'ancestry';
    }
    return data;
  }

  /**
   * An object that tracks which tracks the changes to the data model which were applied by active effects
   */
  overrides: DeepPartial<Item.CreateData> = {};

  get isMeleeWeapon(): boolean {
    return this.system['isMelee'] ?? false;
  }

  get range() {
    // Validates that this item type has a range property
    if (!('range' in this.system) || !this.system.range) return;
    //match the range string via Regex
    const match = this.system.range.match(SwadeItem.RANGE_REGEX);
    //return early if nothing is found
    if (!match) return;
    //split the string and convert the values to numbers
    const ranges = match.join('').split('/');
    //make sure the array is 4 values long
    const increments = Array.from(
      { ...ranges, length: 4 },
      (v) => Number(v) || 0,
    );
    return {
      short: increments[0],
      medium: increments[1],
      long: increments[2],
      extreme: increments[3] || increments[2] * 4,
    };
  }

  /**
   * @returns whether this item can be an arcane device
   */
  get canBeArcaneDevice(): boolean {
    if ('canBeArcaneDevice' in this.system)
      return this.system.canBeArcaneDevice;
    return false;
  }

  get isArcaneDevice(): boolean {
    if (!this.canBeArcaneDevice) return false;
    return foundry.utils.getProperty(this, 'system.isArcaneDevice') as boolean;
  }

  /** @returns the power points for the AB that this power belongs to or null when the item is not a power */
  get powerPointObject(): ItemDisplayPowerPoints | null {
    if ('_powerPoints' in this.system) {
      return this.system._powerPoints;
    } else if (this.isArcaneDevice) {
      return foundry.utils.getProperty(
        this,
        'system.powerPoints',
      ) as ItemDisplayPowerPoints;
    }
    return null;
  }

  get isReadied(): boolean {
    if ('isReadied' in this.system) return this.system.isReadied;
    return false;
  }

  get isPhysicalItem(): boolean {
    return this.system instanceof SwadePhysicalItemData;
  }

  get canHaveCategory(): boolean {
    if ('canHaveCategory' in this.system) return this.system.canHaveCategory;
    return this.isPhysicalItem;
  }

  get embeddedPowers() {
    const flagContent = this.getFlag('swade', 'embeddedPowers') ?? [];
    return new Map(flagContent);
  }

  get canGrantItems(): boolean {
    return (
      this.isPhysicalItem ||
      ('canGrantItems' in this.system ? this.system.canGrantItems : false)
    );
  }

  get grantsItems(): ItemGrant[] {
    if (!this.canGrantItems) return [];
    return foundry.utils.getProperty(this, 'system.grants') as ItemGrant[];
  }

  get hasGranted(): string[] {
    return this.getFlag('swade', 'hasGranted') ?? [];
  }

  get grantedBy(): SwadeItem | undefined {
    if (this.parent) {
      return this.parent.items.find((i: SwadeItem) =>
        i.hasGranted.includes(this.id!),
      ) as SwadeItem;
    }
  }

  get modifier(): number {
    if ('modifier' in this.system) return this.system.modifier;
    return 0;
  }

  get traitModifiers(): RollModifier[] {
    const modifiers = new Array<RollModifier>();

    // Ensure `this` is properly referenced
    const itemName = this?.name ?? game.i18n.localize('SWADE.Item'); // Use optional chaining to prevent errors

    if (foundry.utils.getProperty(this, 'system.actions.traitMod')) {
      modifiers.push({
        label: `${itemName} ${game.i18n.localize('SWADE.ItemTraitMod')}`, // Combine name and localized string
        value: foundry.utils.getProperty(this, 'system.actions.traitMod'),
      });
    }

    if (this.system?.traitModifiers) {
      // Ensure `this.system` exists before accessing properties
      modifiers.push(...this.system.traitModifiers);
    }

    return modifiers;
  }

  get usesAmmoFromInventory(): boolean {
    if ('usesAmmoFromInventory' in this.system)
      return !!this.system.usesAmmoFromInventory;
    return false;
  }

  // Special implementation to help with modifiers on temp docs
  override clone<Save extends boolean | null | undefined = false>(
    data: Item.CreateData = {},
    options: foundry.abstract.Document.CloneContext<Save> = {},
  ): foundry.abstract.Document.Clone<Save> {
    if (options.save) return super.clone<true>(data, options);
    if (this.parent) this.parent._embeddedPreparation = true;
    const item = super.clone<false>(data, options);
    if (item.parent) {
      delete item.parent._embeddedPreparation;
    }
    return item;
  }

  override prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments();
    if (!this.actor || this.actor._embeddedPreparation) this.applyModifiers();
  }

  /**
   * Apply modifier effects to this item.
   */
  applyModifiers() {
    const overrides: DeepPartial<Item.CreateData> = {};

    const changes: Array<
      ActiveEffect.EffectChangeData & { effect: SwadeActiveEffect }
    > = [];
    // TODO: In v13 just use the getter on the embedded collection
    for (const effect of this.effects.filter((e) => e.type === 'modifier')) {
      if (!effect.active) continue;
      changes.push(
        ...effect.changes.map((change) => {
          const c = foundry.utils.deepClone(change);
          c.effect = effect;
          c.priority = c.priority ?? c.mode * 10;
          return c;
        }),
      );
    }
    changes.sort((a, b) => a.priority - b.priority);
    // Apply all changes
    for (const change of changes) {
      if (!change.key) continue;
      const changes = change.effect.apply(this, change);
      Object.assign(overrides, changes);
    }

    // Expand the set of final overrides
    this.overrides = foundry.utils.expandObject(overrides);
  }

  async rollDamage(options: IRollOptions = {}): Promise<DamageRoll | null> {
    const modifiers = new Array<RollModifier>();
    let damage = '';
    if (options.dmgOverride) {
      damage = options.dmgOverride;
    } else if ('damage' in this.system && this.system.damage) {
      damage = this.system.damage;
    } else {
      return null;
    }
    const label = this.name;
    let ap: number =
      options.ap ?? foundry.utils.getProperty(this, 'system.ap') ?? 0;
    const isHeavyWeapon: boolean =
      foundry.utils.getProperty(this, 'system.isHeavyWeapon') ||
      options.isHeavyWeapon;
    let apFlavor = ` - ${game.i18n.localize('SWADE.Ap')} 0`;

    if (this.actor && 'stats' in this.actor.system) {
      this.actor?.system.stats.globalMods.ap.forEach((e) => {
        ap += Number(e.value);
      });
    }

    if (ap) {
      apFlavor = ` - ${game.i18n.localize('SWADE.Ap')} ${ap}`;
    }
    const rollParts = [damage];

    //Additional Mods
    if (this.actor && 'stats' in this.actor.system) {
      modifiers.push(...this.actor.system.stats.globalMods.damage);
    }
    if (options.additionalMods) {
      modifiers.push(...options.additionalMods);
    }

    const terms = DamageRoll.parse(
      rollParts.join(''),
      this.actor?.getRollData() ?? {},
    );
    const baseRoll = new Array<string>();
    for (const term of terms) {
      if (term instanceof foundry.dice.terms.Die) {
        if (!term.modifiers.includes('x') && Number(term.faces) > 1) {
          term.modifiers.push('x');
        }
        if (!term.flavor) {
          term.options.flavor = game.i18n.localize('SWADE.BaseDamage');
        }
        baseRoll.push(term.formula);
      } else if (term instanceof foundry.dice.terms.StringTerm) {
        baseRoll.push(this._makeExplodable(term.term));
      } else if (term instanceof foundry.dice.terms.NumericTerm) {
        baseRoll.push(term.formula);
      } else {
        baseRoll.push(term.expression);
      }
    }

    //Conviction Modifier
    if (
      this.parent &&
      'details' in this.parent.system &&
      game.settings.get('swade', 'enableConviction') &&
      foundry.utils.getProperty(this.parent.system, 'details.conviction.active')
    ) {
      modifiers.push({
        label: game.i18n.localize('SWADE.Conv'),
        value: '+1d6x',
      });
    }

    let flavour = '';
    if (options.flavour) {
      flavour = ` - ${options.flavour}`;
    }

    //Joker Modifier
    if (this.parent?.hasJoker) {
      modifiers.push({
        label: game.i18n.localize('SWADE.Joker'),
        value: this.parent.getFlag('swade', 'jokerBonus') ?? 2,
      });
    }

    const roll = new DamageRoll(baseRoll.join(''), {}, { modifiers });
    if ('isRerollable' in options) roll.setRerollable(!!options.isRerollable);
    /**
     * A hook event that is fired before damage is rolled, giving the opportunity to programatically adjust a roll and its modifiers
     * Returning `false` in a hook callback will cancel the roll entirely
     * @category Hooks
     * @param {SwadeActor} actor                The actor that owns the item which rolls the damage
     * @param {SwadeItem} item                  The item that is used to create the damage value
     * @param {DamageRoll} roll                 The built base roll, without any modifiers
     * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.call('swadeRollDamage', this.actor, this, roll, modifiers, options);

    if (options.suppressChat) {
      return DamageRoll.fromTerms<DamageRoll>([
        ...roll.terms,
        ...DamageRoll.parse(
          roll.modifiers.reduce(modifierReducer, ''),
          this.getRollData(),
        ),
      ]);
    }

    const finalFlavor = `${label} ${game.i18n.localize(
      'SWADE.Dmg',
    )}${apFlavor}${flavour}`;

    // Roll and return
    return RollDialog.asPromise({
      roll: roll,
      mods: modifiers,
      speaker: ChatMessage.getSpeaker({ actor: this.actor! }),
      flavor: finalFlavor,
      title: `${label} ${game.i18n.localize('SWADE.Dmg')}`,
      item: this,
      ap: ap,
      isHeavyWeapon: isHeavyWeapon,
    }) as Promise<DamageRoll | null>;
  }

  async setEquipState(state: EquipState): Promise<EquipState> {
    const equipState = constants.EQUIP_STATE;
    Logger.debug(
      `Trying to set state ${getKeyByValue(equipState, state)} on item ${
        this.name
      } with type ${this.type}`,
    );
    if (
      '_rejectEquipState' in this.system &&
      this.system._rejectEquipState(state)
    ) {
      Logger.warn('You cannot set this state on the item ' + this.name, {
        toast: true,
      });
      return this.system.equipStatus as EquipState;
    }
    await this.update({ 'system.equipStatus': state });
    return state;
  }

  override getRollData(): Record<string, unknown> {
    return super.getRollData() as Record<string, unknown>;
  }

  async getChatData(
    enrichOptions: Partial<TextEditor.EnrichmentOptions> = {},
  ): Promise<ItemChatCardData> {
    // Item properties
    const chips =
      'getChatChips' in this.system
        ? await this.system.getChatChips(enrichOptions)
        : new Array<ItemChatCardChip>();

    //Additional actions
    const itemActions = foundry.utils.getProperty(
      this,
      'system.actions.additional',
    ) as Record<string, ItemAction>;

    const actions = new Array<ItemChatCardAction>();
    for (const action in itemActions) {
      actions.push({
        key: action,
        type: itemActions[action].type,
        name: itemActions[action].name,
      });
    }

    const hasAmmoManagement =
      'hasAmmoManagement' in this.system && this.system.hasAmmoManagement;
    const hasMagazine =
      hasAmmoManagement &&
      'reloadType' in this.system &&
      this.system.reloadType === constants.RELOAD_TYPE.MAGAZINE;
    const hasDamage = !!foundry.utils.getProperty(this, 'system.damage');
    const hasTrait = !!foundry.utils.getProperty(this, 'system.actions.trait');
    const hasReloadButton =
      'hasReloadButton' in this.system && this.system.hasReloadButton;

    const additionalActions: ItemActions =
      foundry.utils.getProperty(this, 'system.actions.additional') || {};
    const actionValues = Object.values(additionalActions);

    const hasTraitActions = actionValues.some(
      (v) => v.type === constants.ACTION_TYPE.TRAIT,
    );
    const hasDamageActions = actionValues.some(
      (v) => v.type === constants.ACTION_TYPE.DAMAGE,
    );
    const hasResistRolls = actionValues.some(
      (v) => v.type === constants.ACTION_TYPE.RESIST,
    );
    const hasMacros = actionValues.some(
      (v) => v.type === constants.ACTION_TYPE.MACRO,
    );
    const hasTemplates =
      'templates' in this.system &&
      Object.values(this.system.templates).some(Boolean);

    const effects: string[] = [];
    for (const effect of this.effects.filter(
      (e) => !e.transfer && e.type !== 'modifier',
    )) {
      effects.push(
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          effect.link,
        ),
      );
    }

    const data: ItemChatCardData = {
      description:
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.system.description,
          enrichOptions,
        ),
      chips: chips,
      actions: actions,
    };

    const templateData = {
      item: this,
      data,
      effects,
      hasAmmoManagement,
      hasMagazine,
      hasReloadButton,
      hasDamage,
      hasTrait,
      hasTemplates,
      showDamageRolls: hasDamage || hasDamageActions,
      trait: foundry.utils.getProperty(this, 'system.actions.trait'),
      showTraitRolls: hasTrait || hasTraitActions,
      hasResistRolls,
      hasMacros,
      powerPoints: this.powerPointObject,
      settingRules: {
        noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
      },
    };

    return templateData;
  }

  /** A shorthand function to roll skills directly */
  async roll(options: IRollOptions = {}) {
    //return early if there's no parent or this isn't a skill
    if (!('canRoll' in this.system) || !this.system.canRoll) return null;
    return this.parent!.rollSkill(this.id, options);
  }

  override async deleteDialog(
    options?: Partial<Dialog.Options> | undefined,
  ): Promise<false | this | null | undefined> {
    if (!this.parent) return super.deleteDialog(options);
    const type = game.i18n.localize(`TYPES.Item.${this.type}`);
    const proceed = await foundry.applications.api.DialogV2.confirm({
      rejectClose: false,
      window: {
        title: `${game.i18n.format('DOCUMENT.Delete', { type })}: ${this.name}`,
      },
      content: `<h3>${game.i18n.localize('AreYouSure')}</h3><p>${game.i18n.format('SWADE.DeleteFromParentWarningPermanent', { name: this.name, parent: this.parent.name })}</p>`,
    });
    if (!proceed) return false;
    return this.delete();
  }

  /**
   * Assembles data and creates a chat card for the item
   * @returns the rendered chat card
   */
  async show() {
    // Basic template rendering data
    if (!this.actor) return;

    // Basic chat message data
    const chatData: ChatMessage.CreateData = {
      type: 'itemCard',
      title: this.name,
      author: game.user?.id,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      speaker: ChatMessage.getSpeaker({
        actor: this.parent,
        token: this.actor?.token,
        scene: this.actor?.token?.parent,
        alias: this.parent?.name,
      }),
      system: { uuid: this.uuid },
      flags: { core: { canPopout: true } },
    };

    const msgClass = getDocumentClass('ChatMessage');

    if (
      game.settings.get('swade', 'hideNpcItemChatCards') &&
      this.actor?.type === 'npc'
    ) {
      chatData.whisper = game.users!.filter((u) => u.isGM).map((u) => u.id!);
    } else {
      // Apply the roll mode to the message
      msgClass.applyRollMode(
        chatData,
        game.settings.get('core', 'rollMode') ?? 'roll',
      );
    }

    // Create the chat message
    const chatCard = await msgClass.create(chatData);
    Hooks.call('swadeChatCard', this.actor, this, chatCard, game.user!.id);
    return chatCard;
  }

  canExpendResources(resourcesUsed = 1): boolean {
    if ('_canExpendResources' in this.system) {
      return this.system._canExpendResources(resourcesUsed);
    } else return true;
  }

  async consume(charges = 1): Promise<void> {
    if (!('_getUsageUpdates' in this.system)) return;
    const usage = this.system._getUsageUpdates(charges);
    if (!usage) return;

    /**
     * A hook event that is fired before an item is consumed, giving the opportunity to programmatically adjust the usage and/or trigger custom logic
     * @category Hooks
     * @param item               The item that is used being consumed
     * @param charges            The charges used.
     * @param usage              The determined usage updates that resulted from consuming this item
     */
    Hooks.call('swadePreConsumeItem', this, charges, usage);

    const { actorUpdates, itemUpdates, resourceUpdates } = usage;

    let updatedItems = new Array<Item.Stored>();
    // Persist the updates
    if (!foundry.utils.isEmpty(itemUpdates)) {
      await this.update(itemUpdates);
    }
    if (!foundry.utils.isEmpty(actorUpdates)) {
      await this.actor?.update(actorUpdates);
    }
    if (resourceUpdates.length) {
      updatedItems = await this.actor?.updateEmbeddedDocuments(
        'Item',
        resourceUpdates,
      );
    }

    /**
     * A hook event that is fired after an item is consumed but before cleanup happens
     * @category Hooks
     * @param item               The item that is used being consumed
     * @param charges            The charges used.
     * @param usage              The determined usage updates that resulted from consuming this item
     */
    Hooks.call('swadeConsumeItem', this, charges, usage);

    if ('messageOnUse' in this.system && this.system.messageOnUse) {
      await this.#createChargeUsageMessage(charges);
    }

    await this.#postConsumptionCleanup(updatedItems);
  }

  async reload(): Promise<boolean> {
    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    if (!('reload' in this.system) || !ammoManagement) return false;
    else return this.system.reload();
  }

  async removeAmmo() {
    if ('removeAmmo' in this.system) this.system.removeAmmo();
  }

  async grantEmbedded(target: Item.Parent = this.parent) {
    if (!this.canGrantItems || !target) return;
    const grantChain = await this.getItemGrantChain();

    for (const link of grantChain) {
      if (link.grant.mutation) {
        link.item.updateSource(link.grant.mutation);
      }
    }
    //create the items
    const grantedItems =
      (await SwadeItem.createDocuments(
        grantChain.map((l) => l.item.toObject()),
        {
          parent: target,
          renderSheet: undefined,
          isItemGrant: true,
        },
      )) ?? [];
    const created = grantedItems.map((i) => i.id);
    await this.setFlag('swade', 'hasGranted', created);
    Logger.debug([this.name, this.hasGranted]);
  }

  /**
   * Renders a dialog to confirm the swid change and if accepted updates the SWID on the item.
   * @returns The generated swid or undefined if no change was made.
   */
  async regenerateSWID() {
    const html = `
    <div class="warning-message">
      <p>${game.i18n.localize('SWADE.SWID.ChangeWarning2')}</p>
      <p>${game.i18n.localize('SWADE.SWID.ChangeWarning3')}</p>
    </div>
    `;
    const confirmation = await Dialog.confirm({
      title: game.i18n.localize('SWADE.SWID.Regenerate'),
      content: html,
      defaultYes: false,
      options: {
        classes: [...Dialog.defaultOptions.classes, 'swade-app'],
      },
    });
    if (!confirmation) return;
    const swid = slugify(this.name);
    await this.update({ 'system.swid': swid });
    return swid;
  }

  /** @returns a flattened array of item grants, going down the chain of grants */
  async getItemGrantChain(
    ignored = new Set<string>(),
  ): Promise<ItemGrantChainLink[]> {
    if (!this.canGrantItems || ignored.has(this.uuid)) return [];
    ignored.add(this.uuid);
    const grantedItems = (
      await Promise.all(this.grantsItems.map((g) => fromUuid(g.uuid)))
    ).filter((i) => !!i) as SwadeItem[];

    const grants: ItemGrantChainLink[] = [];
    for (const item of grantedItems) {
      const grant = this.grantsItems.find((g) => g.uuid === item.uuid)!;
      const choiceUpdate = await item.handleChoices(
        foundry.utils.mergeObject(item.toObject(), grant.mutation ?? {}),
      );

      grants.push({
        item: new SwadeItem(
          foundry.utils.mergeObject(item.toObject(), choiceUpdate),
        ),
        grant: this.grantsItems.find((g) => g.uuid === item.uuid) as ItemGrant,
      });
    }

    const children = await Promise.all(
      grants.flatMap((g) => g.item.getItemGrantChain(ignored)),
    );

    return [...new Set([...grants, ...children.deepFlatten()])];
  }

  async removeGranted(target = this.parent) {
    if (this.hasGranted.length < 1) return;
    //grab the granted ids and put them into a set to filter possible duplicates
    const granted = new Set(
      //filter the list of granted items to only try and remove the ones that still exist on the parent
      this.hasGranted.filter((grant) => this.parent?.items.has(grant)),
    );
    granted.delete(this.id as string); //delete self in case there are circular dependencies.
    await target?.deleteEmbeddedDocuments('Item', Array.from(granted));
    await this.unsetFlag('swade', 'hasGranted');
  }

  async #postConsumptionCleanup(updatedItems: Item.Stored[]) {
    for (const update of updatedItems) {
      const item = this.parent?.items.get(update.id);
      if (item && item.system._shouldDelete) {
        await item.delete();
      }
    }
    if ('_shouldDelete' in this.system && this.system._shouldDelete) {
      await this.delete();
    }
  }

  private _makeExplodable(expression: string): string {
    // Make all dice of a roll able to explode
    const diceRegExp = /\d*d\d+[^kdrxc]/g;
    expression = expression + ' '; // Just because of my poor reg_exp foo
    const diceStrings: string[] = expression.match(diceRegExp) || [];
    const used = new Array<string>();
    for (const match of diceStrings) {
      if (used.indexOf(match) === -1) {
        expression = expression.replace(
          new RegExp(match.slice(0, -1), 'g'),
          match.slice(0, -1) + 'x',
        );
        used.push(match);
      }
    }
    return expression;
  }

  async #createChargeUsageMessage(charges: number) {
    const msgClass = getDocumentClass('ChatMessage');
    const createData = {
      speaker: msgClass.getSpeaker({ actor: this.actor! }),
      content: game.i18n.format('SWADE.Consumable.ChargesUsed', {
        charges,
        name: this.name,
      }),
    };
    msgClass.applyRollMode(
      createData,
      game.settings.get('core', 'rollMode') ?? 'roll',
    );
    return msgClass.create(createData);
  }

  async refreshFromCompendium(): Promise<this | null> {
    if (!this.isOwned) {
      ui.notifications.error(game.i18n.localize('SWADE.NotOwnedError'));
      return null;
    }
    if (this.grantsItems.length > 0) {
      ui.notifications.error(game.i18n.localize('SWADE.GrantsItemsError'));
      return null;
    }
    const newItem = await this.findSimilarInCompendium();
    if (!newItem) {
      ui.notifications.warn(game.i18n.localize('SWADE.NoUpdatedItemFound'));
      return null;
    }
    const updates = {
      name: newItem.name,
      img: newItem.img,
      system: foundry.utils.deepClone(newItem.system),
    };
    foundry.utils.mergeObject(updates, {
      'system.favorite':
        'favorite' in this.system ? this.system.favorite : null,
      'system.equipStatus':
        'equipStatus' in this.system ? this.system.equipStatus : null,
      'system.quantity':
        'quantity' in this.system ? this.system.quantity : null,
    });
    await this.update(updates);
    return this;
  }

  async findSimilarInCompendium(): Promise<SwadeItem | null> {
    const sourceId = this._stats.compendiumSource;
    let possibleItem: SwadeItem | null = null;
    if (sourceId) {
      possibleItem = (await fromUuid(sourceId)) as SwadeItem | null;
      if (possibleItem) return possibleItem;
    }

    const searchFields = [
      { name: 'system.source', weight: 15 },
      { name: 'name', weight: 10 },
      { name: 'img', weight: 6 },
      { name: 'system.category', weight: 1 },
      { name: 'system.swid', weight: 4 },
    ];
    let possibleItemWeight = 20;
    for (const pack of game.packs) {
      if (pack.metadata.system !== 'swade' || pack.metadata.type !== 'Item') {
        continue;
      }
      const documents = await pack.getDocuments({ type: this.type });
      for (const potentialItem of documents) {
        let currentWeight = 0;
        for (const search of searchFields) {
          if (
            foundry.utils.getProperty(potentialItem, search.name) ==
            foundry.utils.getProperty(this, search.name)
          ) {
            currentWeight += search.weight;
          }
        }
        if (currentWeight > possibleItemWeight) {
          possibleItem = potentialItem;
          possibleItemWeight = currentWeight;
        }
      }
    }
    return possibleItem;
  }

  async handleChoices(data: Item.CreateData) {
    const choiceUpdate = {};
    if (data.system?.choiceSets?.length > 0) {
      for (const choiceSet of data.system.choiceSets as Array<ChoiceSet>) {
        if (choiceSet.choice !== null) continue;

        Object.assign(
          choiceSet,
          await ChoiceDialog.asPromise({ choiceSet: choiceSet, parent: this }),
        );

        if (choiceSet.choice === null) continue;

        const mutationOption = choiceSet.choices[choiceSet.choice] ?? {};
        const update = mutationOption.mutation ?? {};
        if (mutationOption.addToName) {
          update.name = data.name + ` (${mutationOption.name})`;
        }
        foundry.utils.mergeObject(choiceUpdate, update);
      }
      foundry.utils.mergeObject(choiceUpdate, {
        'system.choiceSets': data.system!.choiceSets,
      });
    }
    return choiceUpdate;
  }

  protected override async _preCreate(
    data: Item.CreateData,
    options: Item.DatabaseeOptions,
    user: User.Implementation,
  ) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    const choiceUpdate = await this.handleChoices(data);
    if (Object.keys(choiceUpdate).length > 0) {
      this.updateSource(choiceUpdate);
    }
  }

  protected override async _preDelete(
    options: Item.DatabaseeOptions,
    user: User.Implementation,
  ): Promise<void> {
    await super._preDelete(options, user);
    if (this.parent) await this.removeGranted();
  }

  protected override _onUpdate(
    changed: Item.UpdateData,
    options: Item.Database.OnUpdateOperation,
    userId: string,
  ) {
    super._onUpdate(changed, options, userId);
    if (userId !== game.userId) return; //return early to prevent multi-application
    const grantOn: number | undefined = foundry.utils.getProperty(
      this,
      'system.grantOn',
    );
    if (
      this.canGrantItems &&
      this.parent &&
      grantOn &&
      foundry.utils.hasProperty(changed, 'system.equipStatus')
    ) {
      const equipStatus = foundry.utils.getProperty(this, 'system.equipStatus');
      const shouldGrant =
        (grantOn === constants.GRANT_ON.CARRIED &&
          equipStatus >= constants.EQUIP_STATE.CARRIED) ||
        (grantOn === constants.GRANT_ON.READIED && this.isReadied);
      if (shouldGrant && this.hasGranted.length <= 0) {
        this.grantEmbedded();
      } else if (!shouldGrant) {
        this.removeGranted();
      }
    }
  }

  protected static override async _onCreateOperation(
    items: Item.Implementation[],
    operation: Item.Database.Create,
    user: User.Implementation,
  ) {
    if (!operation.isItemGrant && user.isSelf) {
      for (const item of items) {
        const grantOn: number | undefined = foundry.utils.getProperty(
          item,
          'system.grantOn',
        );
        const equipStatus: number | undefined = foundry.utils.getProperty(
          item,
          'system.equipStatus',
        );
        const nonPhysGranter = [
          'edge',
          'ability',
          'ancestry',
          'hindrance',
        ].includes(item.type);
        const shouldGrant =
          grantOn === constants.GRANT_ON.ADDED ||
          nonPhysGranter ||
          (grantOn === constants.GRANT_ON.CARRIED &&
            equipStatus === constants.EQUIP_STATE.CARRIED) ||
          (grantOn === constants.GRANT_ON.READIED && item.isReadied);
        if (item.canGrantItems && item.isEmbedded && shouldGrant) {
          await item.grantEmbedded();
        }
      }
    }
    await super._onCreateOperation(items, operation, user);
  }
}

export default SwadeItem;
