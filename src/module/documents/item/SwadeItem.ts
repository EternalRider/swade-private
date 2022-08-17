import {
  Context,
  DocumentModificationOptions,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { ChatMessageDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData';
import {
  ItemDataConstructorData,
  ItemDataSource,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData';
import { EquipState, Updates } from '../../../globals';
import {
  ItemAction,
  TraitRollModifier,
} from '../../../interfaces/additional.interface';
import IRollOptions from '../../../interfaces/RollOptions.interface';
import { constants } from '../../constants';
import { Logger } from '../../Logger';
import * as util from '../../util';
import SwadeActor from '../actor/SwadeActor';
import {
  ItemChatCardAction,
  ItemChatCardChip,
  ItemChatCardData,
  ItemChatCardPowerPoints,
  SwadeConsumeItemCallback,
  UsageUpdates,
  UsageUpdatesContext,
} from './SwadeItem.interface';

declare global {
  interface DocumentClassConfig {
    Item: typeof SwadeItem;
  }
  interface FlagConfig {
    Item: {
      swade: {
        embeddedAbilities: [string, ItemDataSource][];
        embeddedPowers: [string, ItemDataSource][];
        [key: string]: unknown;
      };
    };
  }
}

export default class SwadeItem extends Item {
  overrides: DeepPartial<Record<string, string | number | boolean>> = {};

  static RANGE_REGEX = /[0-9]+\/*/g;

  constructor(data?: ItemDataConstructorData, context?: Context<SwadeActor>) {
    super(data, context);
    this.overrides = this.overrides ?? {};
  }

  get isMeleeWeapon(): boolean {
    if (this.data.type !== 'weapon') return false;
    const shots = this.data.data.shots;
    const currentShots = this.data.data.currentShots;
    return (!shots && !currentShots) || (shots === 0 && currentShots === 0);
  }

  get range() {
    //return early if the type doesn't match
    if (this.data.type !== 'weapon' && this.data.type !== 'power') return;
    //match the range string via Regex
    const match = this.data.data.range.match(SwadeItem.RANGE_REGEX);
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
    return ['gear', 'armor', 'shield', 'weapon'].includes(this.type);
  }

  get isArcaneDevice(): boolean {
    if (!this.canBeArcaneDevice) return false;
    return getProperty(this.data.data, 'isArcaneDevice') as boolean;
  }

  get isPhysicalItem(): boolean {
    const types = [
      'weapon',
      'armor',
      'shield',
      'gear',
      'consumable',
      'container',
    ];
    return types.includes(this.type);
  }

  get isReadied(): boolean {
    const type = this.data.type;
    if (
      type === 'weapon' ||
      type === 'armor' ||
      type === 'shield' ||
      type === 'gear'
    ) {
      return this.data.data.equipStatus > constants.EQUIP_STATE.CARRIED;
    }
    return false;
  }

  override prepareDerivedData() {
    const type = this.data.type;
    if (
      type === 'weapon' ||
      type === 'armor' ||
      type === 'shield' ||
      type === 'gear'
    ) {
      // TODO remove with 1.3.0
      Object.defineProperty(this.data.data, 'equipped', {
        get() {
          Logger.warn(
            'This property is depreciated and will be removed with v1.3.0, please use equipStatus instead',
          );
          return this.equipStatus > constants.EQUIP_STATE.CARRIED;
        },
      });
    }
  }

  rollDamage(options: IRollOptions = {}) {
    const modifiers = new Array<TraitRollModifier>();
    let itemData;
    if (['weapon', 'power', 'shield'].includes(this.type)) {
      itemData = this.data.data;
    } else {
      return null;
    }
    const label = this.name;
    let ap = getProperty(this.data, 'data.ap');

    if (ap) {
      ap = ` - ${game.i18n.localize('SWADE.Ap')} ${ap}`;
    } else {
      ap = ` - ${game.i18n.localize('SWADE.Ap')} 0`;
    }

    let rollParts = [itemData.damage];

    if (this.type === 'shield' || options.dmgOverride) {
      rollParts = [options.dmgOverride];
    }
    //Additional Mods
    if (options.additionalMods) {
      modifiers.push(...options.additionalMods);
    }

    const terms = Roll.parse(
      rollParts.join(''),
      this.parent?.getRollData() ?? {},
    );
    const baseRoll = new Array<string>();
    for (const term of terms) {
      if (term instanceof Die) {
        if (!term.modifiers.includes('x') && !term.options.flavor) {
          term.modifiers.push('x');
        }
        baseRoll.push(term.formula);
      } else if (term instanceof StringTerm) {
        baseRoll.push(this._makeExplodable(term.term));
      } else {
        baseRoll.push(term.expression);
      }
    }

    //Conviction Modifier
    if (
      this.parent?.data.type !== 'vehicle' &&
      game.settings.get('swade', 'enableConviction') &&
      this.parent?.data.data.details.conviction.active
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

    const roll = new Roll(baseRoll.join(''));

    /**
     * A hook event that is fired before damage is rolled, giving the opportunity to programatically adjust a roll and its modifiers
     * @function rollDamage
     * @category Hooks
     * @param {Actor} actor                     The actor that owns the item which rolls the damage
     * @param {Item} item                       The item that is used to create the damage value
     * @param {Roll} roll                       The built base roll, without any modifiers
     * @param {TraitRollModifier[]} modifiers   An array of modifiers which are to be added to the roll
     * @param {IRollOptions} options            The options passed into the roll function
     */
    Hooks.call('swadeRollDamage', this.actor, this, roll, modifiers, options);

    if (options.suppressChat) {
      return Roll.fromTerms([
        ...roll.terms,
        ...Roll.parse(
          modifiers.reduce(util.modifierReducer, ''),
          this.getRollData(),
        ),
      ]);
    }

    // Roll and return
    return game.swade.RollDialog.asPromise({
      roll: roll,
      mods: modifiers,
      speaker: ChatMessage.getSpeaker({ actor: this.actor! }),
      flavor: `${label} ${game.i18n.localize('SWADE.Dmg')}${ap}${flavour}`,
      title: `${label} ${game.i18n.localize('SWADE.Dmg')}`,
      item: this,
      flags: { swade: { colorMessage: false } },
    });
  }

  async setEquipState(state: EquipState): Promise<EquipState> {
    const equipState = constants.EQUIP_STATE;
    Logger.debug(
      `Trying to set state ${util.getKeyByValue(equipState, state)} on item ${
        this.name
      } with type ${this.type}`,
    );
    if (
      (this.data.type === 'weapon' && state === equipState.EQUIPPED) ||
      (this.data.type === 'consumable' && state > equipState.CARRIED)
    ) {
      Logger.warn('You cannot set this state on the item ' + this.name, {
        toast: true,
      });
      return this.data.data.equipStatus;
    }
    await this.update({ 'data.equipStatus': state });
    return state;
  }

  getChatData(
    enrichOptions: Partial<TextEditor.EnrichOptions> = {},
  ): ItemChatCardData {
    // Item properties
    const chips = new Array<ItemChatCardChip>();
    const type = this.data.type;
    if (type === 'hindrance') {
      let label = game.i18n.localize('SWADE.Major');
      if (this.data.data.major) {
        label = game.i18n.localize('SWADE.Minor');
      }
      chips.push({ text: label });
    }
    if (type === 'shield') {
      if (this.isReadied) {
        chips.push({
          icon: '<i class="fas fa-tshirt"></i>',
          title: game.i18n.localize('SWADE.Equipped'),
        });
      } else {
        chips.push({
          icon: '<i class="fas fa-tshirt" style="color:grey"></i>',
          title: game.i18n.localize('SWADE.Unequipped'),
        });
      }
      chips.push(
        {
          icon: '<i class="fas fa-user-shield"></i>',
          text: this.data.data.parry,
          title: game.i18n.localize('SWADE.Parry'),
        },
        {
          icon: '<i class="fas fas fa-umbrella"></i>',
          text: this.data.data.cover,
          title: game.i18n.localize('SWADE.Cover._name'),
        },
        {
          icon: '<i class="fas fa-dumbbell"></i>',
          text: this.data.data.minStr,
        },
        {
          icon: '<i class="fas fa-sticky-note"></i>',
          text: TextEditor.enrichHTML(this.data.data.notes, enrichOptions),
          title: game.i18n.localize('SWADE.Notes'),
        },
      );
    }
    if (type === 'armor') {
      for (const [location, covered] of Object.entries(
        this.data.data.locations,
      )) {
        if (!covered) continue;
        chips.push({
          text: game.i18n.localize(
            `SWADE.${location.charAt(0).toUpperCase() + location.slice(1)}`,
          ),
        });
      }
      if (this.isReadied) {
        chips.push({
          icon: '<i class="fas fa-tshirt"></i>',
          title: game.i18n.localize('SWADE.Equipped'),
        });
      } else {
        chips.push({
          icon: '<i class="fas fa-tshirt" style="color:grey"></i>',
          title: game.i18n.localize('SWADE.Unequipped'),
        });
      }
      chips.push(
        {
          icon: '<i class="fas fa-shield-alt"></i>',
          title: game.i18n.localize('SWADE.Armor'),
          text: this.data.data.armor,
        },
        {
          icon: '<i class="fas fa-dumbbell"></i>',
          text: this.data.data.minStr,
        },
        {
          icon: '<i class="fas fa-sticky-note"></i>',
          text: TextEditor.enrichHTML(this.data.data.notes, enrichOptions),
          title: game.i18n.localize('SWADE.Notes'),
        },
      );
    }
    if (type === 'edge') {
      chips.push({
        text: this.data.data.requirements.value,
      });
      if (this.data.data.isArcaneBackground) {
        chips.push({ text: game.i18n.localize('SWADE.Arcane') });
      }
    }
    if (type === 'power') {
      chips.push(
        {
          text: this.data.data.rank,
        },
        { text: this.data.data.arcane },
        {
          text: this.data.data.pp + game.i18n.localize('SWADE.PPAbbreviation'),
        },
        {
          icon: '<i class="fas fa-ruler"></i>',
          text: this.data.data.range,
          title: game.i18n.localize('SWADE.Range._name'),
        },
        {
          icon: '<i class="fas fa-shield-alt"></i>',
          text: this.data.data.ap,
          title: game.i18n.localize('SWADE.Ap'),
        },
        {
          icon: '<i class="fas fa-hourglass-half"></i>',
          text: this.data.data.duration,
          title: game.i18n.localize('SWADE.Dur'),
        },
        {
          text: this.data.data.trapping,
        },
      );
    }
    if (type === 'weapon') {
      if (this.isReadied) {
        chips.push({
          icon: '<i class="fas fa-tshirt"></i>',
          title: game.i18n.localize('SWADE.Equipped'),
        });
      } else {
        chips.push({
          icon: '<i class="fas fa-tshirt" style="color:grey"></i>',
          title: game.i18n.localize('SWADE.Unequipped'),
        });
      }
      chips.push(
        {
          icon: '<i class="fas fa-fist-raised"></i>',
          text: this.data.data.damage,
          title: game.i18n.localize('SWADE.Dmg'),
        },
        {
          icon: '<i class="fas fa-shield-alt"></i>',
          text: this.data.data.ap,
          title: game.i18n.localize('SWADE.Ap'),
        },
        {
          icon: '<i class="fas fa-user-shield"></i>',
          text: this.data.data.parry,
          title: game.i18n.localize('SWADE.Parry'),
        },
        {
          icon: '<i class="fas fa-ruler"></i>',
          text: this.data.data.range,
          title: game.i18n.localize('SWADE.Range._name'),
        },
        {
          icon: '<i class="fas fa-tachometer-alt"></i>',
          text: this.data.data.rof,
          title: game.i18n.localize('SWADE.RoF'),
        },
        {
          icon: '<i class="fas fa-sticky-note"></i>',
          text: TextEditor.enrichHTML(this.data.data.notes, enrichOptions),
          title: game.i18n.localize('SWADE.Notes'),
        },
      );
    }

    //Additional actions
    const itemActions = getProperty(
      this.data.data,
      'actions.additional',
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
      description: TextEditor.enrichHTML(
        this.data.data.description,
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
    if (this.data.type !== 'skill' || !this.parent) return null;
    return this.parent.rollSkill(this.id, options);
  }

  /**
   * Assembles data and creates a chat card for the item
   * @returns the rendered chatcard
   */
  async show() {
    // Basic template rendering data
    if (!this.actor) return;
    const token = this.actor.token;

    const tokenId = token ? `${token.parent?.id}.${token.id}` : null;
    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    const hasAmmoManagement =
      this.type === 'weapon' &&
      !this.isMeleeWeapon &&
      ammoManagement &&
      !getProperty(this.data.data, 'autoReload');
    const hasDamage = !!getProperty(this.data.data, 'damage');
    const hasTraitRoll =
      ['weapon', 'power', 'shield'].includes(this.data.type) &&
      !!getProperty(this.data.data, 'actions.skill');
    const hasReloadButton =
      ammoManagement &&
      this.type === 'weapon' &&
      getProperty(this.data.data, 'shots') > 0 &&
      !getProperty(this.data.data, 'autoReload');

    const additionalActions: Record<string, ItemAction> =
      getProperty(this.data.data, 'actions.additional') || {};

    const hasTraitActions = Object.values(additionalActions).some(
      (v) => v.type === 'skill',
    );
    const hasDamageActions = Object.values(additionalActions).some(
      (v) => v.type === 'damage',
    );

    const templateData = {
      actorId: this.parent?.id,
      tokenId: tokenId,
      item: this,
      data: this.getChatData(),
      hasAmmoManagement,
      hasReloadButton,
      hasDamage,
      showDamageRolls: hasDamage || hasDamageActions,
      trait: getProperty(this.data, 'data.actions.skill'),
      hasTraitRoll,
      showTraitRolls: hasTraitRoll || hasTraitActions,
      powerPoints: this._getPowerPoints(),
      settingRules: {
        noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
      },
    };

    // Render the chat card template
    const template = 'systems/swade/templates/chat/item-card.hbs';
    const html = await renderTemplate(template, templateData);

    // Basic chat message data
    const chatData: ChatMessageDataConstructorData = {
      user: game.user!.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: this.parent?.id,
        token: tokenId,
        scene: token?.parent?.id,
        alias: this.parent?.name,
      },
      flags: { 'core.canPopout': true },
    };

    if (
      game.settings.get('swade', 'hideNpcItemChatCards') &&
      this.actor!.data.type === 'npc'
    ) {
      chatData.whisper = game.users!.filter((u) => u.isGM).map((u) => u.id!);
    }

    // Toggle default roll mode
    const rollMode = game.settings.get('core', 'rollMode');
    if (['gmroll', 'blindroll'].includes(rollMode))
      chatData.whisper = ChatMessage.getWhisperRecipients('GM').map(
        (u) => u.id!,
      );
    if (rollMode === 'selfroll') chatData.whisper = [game.user!.id!];
    if (rollMode === 'blindroll') chatData.blind = true;

    // Create the chat message
    const chatCard = await ChatMessage.create(chatData);
    Hooks.call('swadeChatCard', this.actor, this, chatCard, game.user!.id);
    return chatCard;
  }

  getTraitModifiers(): TraitRollModifier[] {
    const modifiers = new Array<TraitRollModifier>();
    if (getProperty(this.data.data, 'actions.skillMod')) {
      modifiers.push({
        label: game.i18n.localize('SWADE.ItemTraitMod'),
        value: getProperty(this.data.data, 'actions.skillMod'),
      });
    }
    if (this.data.type === 'weapon') {
      if (this.data.data.equipStatus === constants.EQUIP_STATE.OFF_HAND) {
        modifiers.push({
          label: game.i18n.localize('SWADE.OffHandPenalty'),
          value: -2,
        });
      }
      if (this.data.data.trademark > 0) {
        modifiers.push({
          label: game.i18n.localize('SWADE.TrademarkWeapon.Label'),
          value: '+' + this.data.data.trademark,
        });
      }
    }

    return modifiers;
  }

  async consume(charges = 1) {
    const useQuantity = this.data.type === 'consumable';
    const useResource = this.data.type === 'weapon';

    const usage = this._getUsageUpdates({
      charges,
      useQuantity,
      useResource,
    });
    if (!usage) return;

    const { actorUpdates, itemUpdates, resourceUpdates } = usage;

    /**
     * A hook event that is fired before an item is consumed, giving the opportunity to programmatically adjust the usage and/or trigger custom logic
     * @category Hooks
     * @param item               The item that is used being consumed
     * @param charges            The charges used.
     * @param usage              The determined usage updates that resulted from consuming this item
     */
    Hooks.call<SwadeConsumeItemCallback>(
      'swadePreConsumeItem',
      this,
      charges,
      usage,
    );

    let updatedItems = new Array<StoredDocument<SwadeItem>>();
    // Persist the updates
    if (!foundry.utils.isObjectEmpty(itemUpdates)) {
      await this.update(itemUpdates);
    }
    if (!foundry.utils.isObjectEmpty(actorUpdates)) {
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
    Hooks.call<SwadeConsumeItemCallback>(
      'swadeConsumeItem',
      this,
      charges,
      usage,
    );

    await this._postConsumptionCleanup(updatedItems);
  }

  protected async _postConsumptionCleanup(
    updatedItems: StoredDocument<SwadeItem>[],
  ) {
    for (const update of updatedItems) {
      const item = this.parent?.items.get(update.id);
      if (
        item?.data.type === 'consumable' &&
        item.data.data.destroyOnEmpty &&
        item.data.data.quantity === 0
      ) {
        await this.delete();
      }
    }
    if (
      this.data.type === 'consumable' &&
      this.data.data.destroyOnEmpty &&
      this.data.data.quantity === 0
    ) {
      await this.delete();
    }
  }

  protected _getUsageUpdates({
    charges,
    useQuantity,
    useResource,
  }: UsageUpdatesContext): UsageUpdates | false {
    const actorUpdates: Updates = {};
    const itemUpdates: Updates = {};
    const resourceUpdates = new Array<Updates>();

    if (useQuantity) {
      const canConsume = this._handleUseConsumable(charges, itemUpdates);
      if (canConsume === false) return false;
    }

    if (useResource) {
      const canConsume = this._handleConsumeResource(
        charges,
        itemUpdates,
        resourceUpdates,
      );
      if (canConsume === false) return false;
    }

    return { actorUpdates, itemUpdates, resourceUpdates };
  }

  protected _handleUseConsumable(
    chargesToUse: number,
    itemUpdates: Updates,
  ): void | boolean {
    //type guard
    if (this.data.type !== 'consumable') return false;

    //gather variables
    const currentCharges = this.data.data.charges.value;
    const maxCharges = this.data.data.charges.max;
    const quantity = this.data.data.quantity;
    const maxChargesOnStack = (quantity - 1) * maxCharges + currentCharges;

    //abort early if too much is being used
    if (chargesToUse > maxChargesOnStack) return false;

    const totalRemainingCharges = maxChargesOnStack - chargesToUse;
    const newQuantity = Math.ceil(totalRemainingCharges / maxCharges);
    let newCharges = totalRemainingCharges % maxCharges;

    if (newCharges === 0 && newQuantity < quantity && newQuantity !== 0) {
      newCharges = maxCharges;
    }

    //write updates
    itemUpdates['data.quantity'] = Math.max(0, newQuantity);
    itemUpdates['data.charges.value'] = newCharges;
  }

  private _handleConsumeResource(
    chargesToUse: number,
    itemUpdates: Updates,
    resourceUpdates: Updates[],
  ): void | boolean {
    if (this.data.type === 'weapon') {
      if (this.data.data.autoReload) {
        const ammo = this.parent?.items.getName(this.data.data.ammo);
        const quantity = ammo?.data.data['quantity'];
        if (!ammo || chargesToUse > quantity) {
          Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
          return false;
        }
        resourceUpdates.push({
          _id: ammo.id,
          'data.quantity': quantity - chargesToUse,
        });
      } else {
        const currentShots = this.data.data.currentShots;
        const usesShots = !!this.data.data.shots && !!currentShots;
        if (!usesShots || chargesToUse > currentShots) {
          Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
          return false;
        }
        itemUpdates['data.currentShots'] = currentShots - chargesToUse;
      }
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

  /** @returns the power points for the AB that this power belongs to or null when the item is not a power */
  private _getPowerPoints(): ItemChatCardPowerPoints | null {
    if (this.data.type === 'power') {
      const actor = this.parent!;

      let value: number = getProperty(actor.data.data, 'powerPoints.value');
      let max: number = getProperty(actor.data.data, 'powerPoints.max');
      const arcane = this.data.data.arcane;
      if (arcane) {
        value = getProperty(actor.data.data, `powerPoints.${arcane}.value`);
        max = getProperty(actor.data.data, `powerPoints.${arcane}.max`);
      }
      return { value, max };
    }
    if (this.isArcaneDevice) {
      return getProperty(
        this.data.data,
        'powerPoints',
      ) as ItemChatCardPowerPoints;
    }
    return null;
  }

  protected override async _preCreate(
    data: ItemDataConstructorData,
    options: DocumentModificationOptions,
    user: User,
  ) {
    await super._preCreate(data, options, user);
    //Set default image if no image already exists
    if (!data.img) {
      this.data.update({ img: `systems/swade/assets/icons/${data.type}.svg` });
    }

    if (this.parent) {
      if (data.type === 'skill' && options.renderSheet !== null) {
        options.renderSheet = true;
      }
      if (
        this.parent.type === 'npc' &&
        hasProperty(this.data.data, 'equippable')
      ) {
        let newState: EquipState = constants.EQUIP_STATE.EQUIPPED;
        if (data.type === 'weapon') {
          newState = constants.EQUIP_STATE.MAIN_HAND;
        }
        this.data.update({
          data: {
            equipStatus: newState,
          },
        });
      }
    }
  }

  protected override async _preDelete(options, user: User) {
    await super._preDelete(options, user);
    //delete all transferred active effects from the actor
    if (this.parent) {
      const toDelete = this.parent.effects
        .filter((e) => e.data.origin === this.uuid)
        .map((ae) => ae.id!);
      await this.parent.deleteEmbeddedDocuments('ActiveEffect', toDelete);
    }
  }

  protected override async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);

    if (this.parent && hasProperty(changed, 'data.equipStatus')) {
      //toggle all active effects when an item equip status changes
      const newState = getProperty(changed, 'data.equipStatus') as EquipState;
      const updates = this.parent.effects
        .filter((ae) => ae.data.origin === this.uuid)
        .map((ae) => {
          return {
            _id: ae.id,
            disabled: newState < constants.EQUIP_STATE.EQUIPPED,
          };
        });
      await this.parent.updateEmbeddedDocuments('ActiveEffect', updates);
    }
  }
}
