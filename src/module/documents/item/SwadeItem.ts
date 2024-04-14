import {
  Context,
  DocumentModificationOptions,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { ChatMessageDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData';
import {
  ItemDataConstructorData,
  ItemDataSource,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData';
import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { EquipState } from '../../../globals';
import IRollOptions from '../../../interfaces/RollOptions.interface';
import {
  ItemAction,
  RollModifier,
} from '../../../interfaces/additional.interface';
import { Logger } from '../../Logger';
import { ChoiceDialog } from '../../apps/ChoiceDialog';
import { RollDialog } from '../../apps/RollDialog';
import { constants } from '../../constants';
import { DamageRoll } from '../../dice/DamageRoll';
import { getKeyByValue, modifierReducer, slugify } from '../../util';
import SwadeUser from '../SwadeUser';
import SwadeActor from '../actor/SwadeActor';
import SwadeChatMessage from '../chat/SwadeChatMessage';
import {
  ItemChatCardAction,
  ItemChatCardChip,
  ItemChatCardData,
  ItemDisplayPowerPoints,
  ItemGrant,
  ItemGrantChainLink,
} from './SwadeItem.interface';

declare global {
  interface FlagConfig {
    Item: {
      swade: {
        embeddedAbilities: [string, ItemDataSource][];
        embeddedPowers: [string, ItemDataSource][];
        hasGranted?: string[];
        loadedAmmo?: ItemDataSource;
        [key: string]: unknown;
      };
    };
  }
}

export default class SwadeItem extends Item {
  overrides: DeepPartial<ItemDataConstructorData> = {};
  static RANGE_REGEX = /[0-9]+\/*/g;

  static override migrateData(data: ItemDataConstructorData) {
    super.migrateData(data);
    if (data.flags?.swade?.embeddedAbilities) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [key, item] of data.flags.swade.embeddedAbilities) {
        if (item.system && !item.data) continue;
        item.system = { ...item.data };
        delete item.data;
      }
    }
    if (data.flags?.swade?.embeddedPowers) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [key, item] of data.flags.swade.embeddedPowers) {
        if (item.system && !item.data) continue;
        item.system = { ...item.data };
        delete item.data;
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
    return data;
  }

  constructor(data?: ItemDataConstructorData, context?: Context<SwadeActor>) {
    super(data, context);
    this.overrides ??= {};
  }

  get isMeleeWeapon(): boolean {
    return this.system['isMelee'] ?? false;
  }

  get range() {
    // Validates that this item type has a range property
    if (!this.system.range) return;
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
    return this.system.canBeArcaneDevice || false;
  }

  get isArcaneDevice(): boolean {
    if (!this.canBeArcaneDevice) return false;
    return getProperty(this, 'system.isArcaneDevice') as boolean;
  }

  /** @returns the power points for the AB that this power belongs to or null when the item is not a power */
  get powerPointObject(): ItemDisplayPowerPoints | null {
    const typeResult = this.system._powerPoints;
    if (typeResult !== undefined) return typeResult;
    else if (this.isArcaneDevice) {
      return foundry.utils.getProperty(
        this,
        'system.powerPoints',
      ) as ItemDisplayPowerPoints;
    }
    return null;
  }

  get isReadied(): boolean {
    return this.system.isReadied || false;
  }

  get isPhysicalItem(): boolean {
    return this.system.isPhysicalItem || false;
  }

  get canHaveCategory(): boolean {
    return this.system.canHaveCategory || this.isPhysicalItem;
  }

  get embeddedAbilities() {
    const flagContent = this.getFlag('swade', 'embeddedAbilities') ?? [];
    return new Map(flagContent);
  }

  get embeddedPowers() {
    const flagContent = this.getFlag('swade', 'embeddedPowers') ?? [];
    return new Map(flagContent);
  }

  get canGrantItems(): boolean {
    return this.isPhysicalItem || this.system.canGrantItems;
  }

  get grantsItems(): ItemGrant[] {
    if (!this.canGrantItems) return [];
    return getProperty(this, 'system.grants') as ItemGrant[];
  }

  get hasGranted(): string[] {
    return this.getFlag('swade', 'hasGranted') ?? [];
  }

  get grantedBy(): SwadeItem | undefined {
    if (this.parent) {
      return this.parent.items.find((i) => i.hasGranted.includes(this.id!));
    }
  }

  get modifier(): number {
    return this.system.modifier || 0;
  }

  get traitModifiers(): RollModifier[] {
    const modifiers = new Array<RollModifier>();
    if (getProperty(this, 'system.actions.traitMod')) {
      modifiers.push({
        label: game.i18n.localize('SWADE.ItemTraitMod'),
        value: getProperty(this, 'system.actions.traitMod'),
      });
    }
    if (this.system.traitModifiers)
      modifiers.push(...this.system.traitModifiers);
    return modifiers;
  }

  get usesAmmoFromInventory(): boolean {
    return !!this.system.usesAmmoFromInventory;
  }

  async rollDamage(options: IRollOptions = {}): Promise<DamageRoll | null> {
    const modifiers = new Array<RollModifier>();
    let damage = '';
    if (options.dmgOverride) {
      damage = options.dmgOverride;
    } else if (this.system.damage) {
      damage = this.system.damage;
    } else {
      return null;
    }
    const label = this.name;
    let ap: number = foundry.utils.getProperty(this, 'system.ap') ?? 0;
    const isHeavyWeapon: boolean =
      foundry.utils.getProperty(this, 'system.isHeavyWeapon') ||
      options.isHeavyWeapon;
    let apFlavor = ` - ${game.i18n.localize('SWADE.Ap')} 0`;

    this.actor.system.stats.globalMods.ap.forEach((e) => {
      ap += Number(e.value);
    });

    if (ap) {
      apFlavor = ` - ${game.i18n.localize('SWADE.Ap')} ${ap}`;
    }
    const rollParts = [damage];

    //Additional Mods
    if (this.actor) {
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
      if (term instanceof Die) {
        if (!term.modifiers.includes('x') && term.faces > 1) {
          term.modifiers.push('x');
        }
        if (!term.flavor) {
          term.options.flavor = game.i18n.localize('SWADE.BaseDamage');
        }
        baseRoll.push(term.formula);
      } else if (term instanceof StringTerm) {
        baseRoll.push(this._makeExplodable(term.term));
      } else if (term instanceof NumericTerm) {
        baseRoll.push(term.formula);
      } else {
        baseRoll.push(term.expression);
      }
    }

    //Conviction Modifier
    if (
      this.parent?.type !== 'vehicle' &&
      game.settings.get('swade', 'enableConviction') &&
      this.parent?.system.details.conviction.active
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
        value: '+2',
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
      return DamageRoll.fromTerms<DamageRoll['constructor']>([
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
    if (this.system._rejectEquipState?.(state)) {
      Logger.warn('You cannot set this state on the item ' + this.name, {
        toast: true,
      });
      return this.system.equipStatus;
    }
    await this.update({ 'system.equipStatus': state });
    return state;
  }

  async getChatData(
    enrichOptions: Partial<TextEditor.EnrichOptions> = { async: true },
  ): Promise<ItemChatCardData> {
    // Item properties
    const chips =
      typeof this.system.getChatChips === 'function'
        ? await this.system.getChatChips(enrichOptions)
        : new Array<ItemChatCardChip>();

    //Additional actions
    const itemActions = getProperty(
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

    const data: ItemChatCardData = {
      description: await TextEditor.enrichHTML(
        this.system.description,
        enrichOptions,
      ),
      chips: chips,
      actions: actions,
    };
    return data;
  }

  /** A shorthand function to roll skills directly */
  async roll(options: IRollOptions = {}) {
    //return early if there's no parent or this isn't a skill
    if (!this.system.canRoll) return null;
    return this.parent.rollSkill(this.id, options);
  }

  /**
   * Assembles data and creates a chat card for the item
   * @returns the rendered chat card
   */
  async show() {
    // Basic template rendering data
    if (!this.actor) return;
    const token = this.actor.token;

    const tokenId = token ? `${token.parent?.id}.${token.id}` : null;
    const hasAmmoManagement = !!this.system.hasAmmoManagement;
    const hasMagazine =
      hasAmmoManagement &&
      this.system.reloadType === constants.RELOAD_TYPE.MAGAZINE;
    const hasDamage = !!getProperty(this, 'system.damage');
    const hasTrait = !!getProperty(this, 'system.actions.trait');
    const hasReloadButton = !!this.system.hasReloadButton;

    const additionalActions: Record<string, ItemAction> =
      getProperty(this, 'system.actions.additional') || {};

    const hasTraitActions = Object.values(additionalActions).some(
      (v) => v.type === constants.ACTION_TYPE.TRAIT,
    );
    const hasDamageActions = Object.values(additionalActions).some(
      (v) => v.type === constants.ACTION_TYPE.DAMAGE,
    );
    const hasResistRolls = Object.values(additionalActions).some(
      (v) => v.type === constants.ACTION_TYPE.RESIST,
    );
    const hasMacros = Object.values(additionalActions).some(
      (v) => v.type === constants.ACTION_TYPE.MACRO,
    );
    const hasTemplates =
      !!this.system.templates &&
      Object.values(this.system.templates).some((v) => v);

    const templateData = {
      actorId: this.parent?.id,
      tokenId: tokenId,
      item: this,
      data: await this.getChatData(),
      hasAmmoManagement,
      hasMagazine,
      hasReloadButton,
      hasDamage,
      hasTrait,
      hasTemplates,
      showDamageRolls: hasDamage || hasDamageActions,
      trait: getProperty(this, 'system.actions.trait'),
      showTraitRolls: hasTrait || hasTraitActions,
      hasResistRolls,
      hasMacros,
      powerPoints: this.powerPointObject,
      settingRules: {
        noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
      },
    };

    // Render the chat card template
    const template = 'systems/swade/templates/chat/item-card.hbs';
    const html = await renderTemplate(template, templateData);

    // Basic chat message data
    const chatData: ChatMessageDataConstructorData = {
      user: game.user?.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: this.parent?.id,
        token: token?.id,
        scene: token?.parent?.id,
        alias: this.parent?.name,
      },
      flags: {
        core: { canPopout: true },
        swade: {
          macros: Object.entries(additionalActions)
            .filter(([_k, v]) => v.type === constants.ACTION_TYPE.MACRO)
            .map(([k, v]) => {
              return { id: k, uuid: v.uuid };
            }),
        },
      },
    };

    if (
      game.settings.get('swade', 'hideNpcItemChatCards') &&
      this.actor?.type === 'npc'
    ) {
      chatData.whisper = game.users!.filter((u) => u.isGM).map((u) => u.id!);
    }

    // Toggle default roll mode
    const rollMode = game.settings.get('core', 'rollMode');
    if (['gmroll', 'blindroll'].includes(rollMode))
      chatData.whisper = CONFIG.ChatMessage.documentClass
        .getWhisperRecipients('GM')
        .map((u) => u.id!);
    if (rollMode === 'selfroll') chatData.whisper = [game.user!.id!];
    if (rollMode === 'blindroll') chatData.blind = true;

    // Create the chat message
    const chatCard = await CONFIG.ChatMessage.documentClass.create(chatData);
    Hooks.call('swadeChatCard', this.actor, this, chatCard, game.user!.id);
    return chatCard;
  }

  getTraitModifiers(): RollModifier[] {
    foundry.utils.logCompatibilityWarning(
      'SwadeItem.getTraitModifiers() is deprecated in favor of SwadeItem.traitModifiers',
      { since: '3.3', until: '4.0' },
    );
    return this.traitModifiers;
  }

  canExpendResources(resourcesUsed = 1): boolean {
    const typecheck = this.system._canExpendResources?.(resourcesUsed);
    if (typecheck === undefined) return true;
    else return typecheck;
  }

  async consume(charges = 1): Promise<void> {
    const usage = this.system._getUsageUpdates?.(charges);
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

    let updatedItems = new Array<StoredDocument<SwadeItem>>();
    // Persist the updates
    if (!foundry.utils.isEmpty(itemUpdates)) {
      await this.update(itemUpdates);
    }
    if (!foundry.utils.isEmpty(actorUpdates)) {
      await this.actor?.update(actorUpdates);
    }
    if (resourceUpdates.length) {
      updatedItems = (await this.actor?.updateEmbeddedDocuments(
        'Item',
        resourceUpdates,
      )) as Array<StoredDocument<SwadeItem>>;
    }

    /**
     * A hook event that is fired after an item is consumed but before cleanup happens
     * @category Hooks
     * @param item               The item that is used being consumed
     * @param charges            The charges used.
     * @param usage              The determined usage updates that resulted from consuming this item
     */
    Hooks.call('swadeConsumeItem', this, charges, usage);

    if (this.system.messageOnUse) {
      await this.#createChargeUsageMessage(charges);
    }

    await this.#postConsumptionCleanup(updatedItems);
  }

  async reload() {
    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    if (typeof this.system.reload !== 'function' || !ammoManagement) return;
    else this.system.reload();
  }

  async removeAmmo() {
    this.system.removeAmmo?.();
  }

  async grantEmbedded(target = this.parent) {
    if (!this.canGrantItems || !target) return;
    const grantChain = await this.getItemGrantChain();

    for (const link of grantChain) {
      if (link.grant.mutation) {
        link.item.updateSource(link.grant.mutation);
      }
    }
    //create the items
    const grantedItems = await SwadeItem.createDocuments(
      grantChain.map((l) => l.item.toObject()),
      {
        parent: target,
        renderSheet: null,
        isItemGrant: true,
      },
    );
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
    const grantedItems = (await Promise.all(
      this.grantsItems.map((g) => fromUuid(g.uuid)),
    )) as SwadeItem[];

    const grants: ItemGrantChainLink[] = [];
    for (const item of grantedItems) {
      const choiceUpdate = await item.handleChoices(item.toObject());
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

  /**
   * @deprecated
   * @since 3.3.0
   */
  needsFullReloadProcedure(): boolean {
    foundry.utils.logCompatibilityWarning(
      'SwadeItem.needsFullReloadProcedure() is deprecated in favor of SwadeItem.usesAmmoFromInventory',
      { since: '3.3', until: '4.0' },
    );
    return !!this.system.usesAmmoFromInventory;
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

  async #postConsumptionCleanup(updatedItems: StoredDocument<SwadeItem>[]) {
    for (const update of updatedItems) {
      const item = this.parent?.items.get(update.id);
      if (item && item.system._shouldDelete) {
        await item.delete();
      }
    }
    if (this.system._shouldDelete) {
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

  private _getPowerPoints(): ItemDisplayPowerPoints | null {
    foundry.utils.logCompatibilityWarning(
      'SwadeItem._getPowerPoints() is deprecated in favor of SwadeItem.powerPoints',
      { since: '3.3', until: '4.0' },
    );
    return this.powerPointObject;
  }

  async #createChargeUsageMessage(
    charges: number,
  ): Promise<SwadeChatMessage | undefined> {
    return CONFIG.ChatMessage.documentClass.create({
      speaker: ChatMessage.getSpeaker(),
      content: `<p>${charges} charge(s) used on <em>${this.name}</em></p>`,
    });
  }

  protected override async _preCreate(
    data: ItemDataConstructorData,
    options: DocumentModificationOptions,
    user: User,
  ) {
    await super._preCreate(data, options, user);
    //Set default image if no image already exists
    if (!data.img) {
      this.updateSource({
        img: `systems/swade/assets/icons/${data.type}.svg`,
      });
    }

    //set a swid

    if (
      !data.system?.swid ||
      data.system?.swid === constants.RESERVED_SWID.DEFAULT
    ) {
      this.updateSource({ 'system.swid': slugify(data.name) });
    }

    if (this.parent) {
      if (data.type === 'skill' && options.renderSheet !== null) {
        options.renderSheet = true;
      }
      if (
        this.parent.type === 'npc' &&
        hasProperty(this, 'system.equippable')
      ) {
        let newState: EquipState = constants.EQUIP_STATE.EQUIPPED;
        if (data.type === 'weapon') {
          newState = constants.EQUIP_STATE.MAIN_HAND;
        }
        this.updateSource({ 'system.equipStatus': newState });
      }
    }

    const choiceUpdate = await this.handleChoices(data);
    if (Object.keys(choiceUpdate).length > 0) {
      this.updateSource(choiceUpdate);
    }
  }

  async handleChoices(data: ItemDataConstructorData) {
    const choiceUpdate = {};
    if (data.system?.choiceSets?.length > 0) {
      for (const choiceSet of data.system.choiceSets) {
        if (choiceSet.choice !== null) continue;

        Object.assign(
          choiceSet,
          await ChoiceDialog.asPromise({ choiceSet: choiceSet }),
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
        'system.choiceSets': data.system.choiceSets,
      });
    }
    return choiceUpdate;
  }

  protected override async _preDelete(
    options: DocumentModificationOptions,
    user: BaseUser,
  ): Promise<void> {
    await super._preDelete(options, user);
    if (this.parent) await this.removeGranted();
  }

  protected override async _preUpdate(
    changed: DeepPartial<ItemDataConstructorData>,
    options: DocumentModificationOptions,
    user: SwadeUser,
  ) {
    await super._preUpdate(changed, options, user);

    if (this.parent && hasProperty(changed, 'system.equipStatus')) {
      //toggle all active effects when an item equip status changes
      const newState = getProperty(changed, 'system.equipStatus') as EquipState;
      const updates = this.effects.map((ae) => {
        return {
          _id: ae.id,
          disabled: newState < constants.EQUIP_STATE.OFF_HAND,
        };
      });
      await this.updateEmbeddedDocuments('ActiveEffect', updates);
    }
    //handle and potentially reject magazine/battery updates
    if (this.type === 'consumable') {
      if (
        foundry.utils.hasProperty(changed, 'system.quantity') &&
        this.system.subtype !== constants.CONSUMABLE_TYPE.REGULAR &&
        this.system.charges.value !== 0 &&
        this.system.charges.value !== this.system.charges.max
      ) {
        const quantity = changed.system.quantity;
        const charges = this.system.charges;
        if (quantity > 1 && charges.value < charges.max) {
          delete changed.system.quantity;
          Logger.warn(
            'Partially filled magazines can only have a quantity of 1',
            { toast: true, localize: true },
          );
        }
      }
      if (
        foundry.utils.hasProperty(changed, 'system.charges.max') &&
        this.system.subtype === constants.CONSUMABLE_TYPE.BATTERY
      ) {
        foundry.utils.setProperty(changed, 'system.charges.max', 100);
      }
      if (
        foundry.utils.getProperty(changed, 'system.subtype') ===
        constants.CONSUMABLE_TYPE.BATTERY
      ) {
        foundry.utils.setProperty(changed, 'system.charges.max', 100);
      }
    }
  }

  protected static override async _onCreateDocuments(
    items: SwadeItem[],
    context,
  ) {
    if (!context.isItemGrant) {
      for (const item of items) {
        const grantOn = getProperty(item, 'system.grantOn');
        const equipStatus = getProperty(item, 'system.equipStatus');
        const nonPhysGranter = ['edge', 'ability', 'hindrance'].includes(
          item.type,
        );
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
    await super._onCreateDocuments(items, context);
  }

  protected override _onUpdate(
    changed: DeepPartial<ItemDataSource>,
    options: DocumentModificationOptions,
    userId: string,
  ) {
    super._onUpdate(changed, options, userId);
    if (!game.users!.get(userId)?.isSelf) return; //return early to prevent multi-application
    const grantOn = getProperty(this, 'system.grantOn');
    if (
      this.canGrantItems &&
      this.parent &&
      grantOn &&
      hasProperty(changed, 'system.equipStatus')
    ) {
      const equipStatus = getProperty(this, 'system.equipStatus');
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
      'system.favorite': this.system.favorite,
      'system.equipStatus': this.system.equipStatus,
      'system.quantity': this.system.quantity,
    });
    await this.update(updates);
    return this;
  }

  async findSimilarInCompendium(): Promise<SwadeItem | null> {
    const sourceId = this.getFlag('core', 'sourceId') as string;
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
}
