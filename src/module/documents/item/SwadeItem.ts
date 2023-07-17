import {
  Context,
  DocumentModificationOptions,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { ChatMessageDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData';
import {
  ItemDataConstructorData,
  ItemDataSource,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData';
import { EquipState, ReloadType, Updates } from '../../../globals';
import {
  ItemAction,
  RollModifier,
} from '../../../interfaces/additional.interface';
import IRollOptions from '../../../interfaces/RollOptions.interface';
import Reloadinator from '../../apps/Reloadinator';
import { RollDialog } from '../../apps/RollDialog';
import { constants } from '../../constants';
import { DamageRoll } from '../../dice/DamageRoll';
import { Logger } from '../../Logger';
import {
  addUpModifiers,
  getKeyByValue,
  modifierReducer,
  notificationExists,
} from '../../util';
import { TraitDie } from '../actor/actor-data-source';
import SwadeActor from '../actor/SwadeActor';
import SwadeUser from '../SwadeUser';
import {
  ItemChatCardAction,
  ItemChatCardChip,
  ItemChatCardData,
  ItemChatCardPowerPoints,
  ItemGrant,
  ItemGrantChainLink,
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
        const isNew = uuid.startsWith('Compendium.') && uuid.includes('.Item.');
        if (isNew) continue;
        const arr = uuid.split('.');
        arr.splice(arr.length - 1, 0, 'Item');
        grant.uuid = arr.join('.');
      }
    }
    return data;
  }

  constructor(data?: ItemDataConstructorData, context?: Context<SwadeActor>) {
    super(data, context);
    this.overrides = this.overrides ?? {};
  }

  get isMeleeWeapon(): boolean {
    if (this.type !== 'weapon') return false;
    const shots = this.system.shots;
    const currentShots = this.system.currentShots;
    return !Number(shots) && !Number(currentShots);
  }

  get range() {
    //return early if the type doesn't match
    if (this.type !== 'weapon' && this.type !== 'power') return;
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
    return ['gear', 'armor', 'shield', 'weapon'].includes(this.type);
  }

  get isArcaneDevice(): boolean {
    if (!this.canBeArcaneDevice) return false;
    return getProperty(this, 'system.isArcaneDevice') as boolean;
  }

  get isReadied(): boolean {
    const type = this.type;
    if (
      type === 'weapon' ||
      type === 'armor' ||
      type === 'shield' ||
      type === 'gear'
    ) {
      return this.system.equipStatus > constants.EQUIP_STATE.CARRIED;
    }
    return false;
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

  get canHaveCategory(): boolean {
    const types = ['edge', 'action', 'ability'];
    return types.includes(this.type) || this.isPhysicalItem;
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
    return (
      this.isPhysicalItem ||
      ['hindrance', 'edge', 'ability'].includes(this.type)
    );
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
    if (this.type !== 'skill') return 0;

    let mod = this.system.die.modifier;
    const attribute = this.system.attribute;
    const globals = this.actor?.system.stats.globalMods as Record<
      string,
      RollModifier[]
    >;
    mod += this.system.effects.reduce(addUpModifiers, 0);
    mod += globals.trait?.reduce(addUpModifiers, 0) ?? 0;
    if (attribute) mod += globals[attribute]?.reduce(addUpModifiers, 0);
    return mod;
  }

  async rollDamage(options: IRollOptions = {}): Promise<DamageRoll | null> {
    const modifiers = new Array<RollModifier>();
    let damage = '';
    if (options.dmgOverride) {
      damage = options.dmgOverride;
    } else if (['weapon', 'power'].includes(this.type)) {
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
    modifiers.push(...this.actor.system.stats.globalMods.damage);
    if (options.additionalMods) {
      modifiers.push(...options.additionalMods);
    }

    const terms = DamageRoll.parse(
      rollParts.join(''),
      this.parent?.getRollData() ?? {},
    );
    const baseRoll = new Array<string>();
    for (const term of terms) {
      if (term instanceof Die) {
        if (!term.modifiers.includes('x')) {
          term.modifiers.push('x');
        }
        if (!term.flavor) {
          term.options.flavor = game.i18n.localize('SWADE.BaseDamage');
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

    const roll = new DamageRoll(
      baseRoll.join(''),
      {},
      {
        modifiers: modifiers,
      },
    );
    if ('isRerollable' in options) roll.setRerollable(options.isRerollable);
    /**
     * A hook event that is fired before damage is rolled, giving the opportunity to programatically adjust a roll and its modifiers
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
    if (
      (this.type === 'weapon' && state === equipState.EQUIPPED) ||
      (this.type === 'consumable' && state > equipState.CARRIED)
    ) {
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
    const chips = new Array<ItemChatCardChip>();
    const type = this.type;
    if (type === 'hindrance') {
      let label = game.i18n.localize('SWADE.Major');
      if (this.system.major) {
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
          text: this.system.parry,
          title: game.i18n.localize('SWADE.Parry'),
        },
        {
          icon: '<i class="fas fas fa-umbrella"></i>',
          text: this.system.cover,
          title: game.i18n.localize('SWADE.Cover._name'),
        },
        {
          icon: '<i class="fas fa-dumbbell"></i>',
          text: this.system.minStr,
        },
        {
          icon: '<i class="fas fa-sticky-note"></i>',
          text: await TextEditor.enrichHTML(this.system.notes, enrichOptions),
          title: game.i18n.localize('SWADE.Notes'),
        },
      );
    }
    if (type === 'armor') {
      for (const [location, covered] of Object.entries(this.system.locations)) {
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
          text: this.system.armor,
        },
        {
          icon: '<i class="fas fa-dumbbell"></i>',
          text: this.system.minStr,
        },
        {
          icon: '<i class="fas fa-sticky-note"></i>',
          text: await TextEditor.enrichHTML(this.system.notes, enrichOptions),
          title: game.i18n.localize('SWADE.Notes'),
        },
      );
    }
    if (type === 'edge') {
      chips.push({
        text: this.system.requirements.value,
      });
      if (this.system.isArcaneBackground) {
        chips.push({ text: game.i18n.localize('SWADE.Arcane') });
      }
    }
    if (type === 'power') {
      chips.push(
        {
          text: this.system.rank,
        },
        { text: this.system.arcane },
        {
          text: this.system.pp + game.i18n.localize('SWADE.PPAbbreviation'),
        },
        {
          icon: '<i class="fas fa-ruler"></i>',
          text: this.system.range,
          title: game.i18n.localize('SWADE.Range._name'),
        },
        {
          icon: '<i class="fas fa-shield-alt"></i>',
          text: this.system.ap,
          title: game.i18n.localize('SWADE.Ap'),
        },
        {
          icon: '<i class="fas fa-hourglass-half"></i>',
          text: this.system.duration,
          title: game.i18n.localize('SWADE.Dur'),
        },
        {
          text: this.system.trapping,
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
          text: this.system.damage,
          title: game.i18n.localize('SWADE.Dmg'),
        },
        {
          icon: '<i class="fas fa-shield-alt"></i>',
          text: this.system.ap,
          title: game.i18n.localize('SWADE.Ap'),
        },
        {
          icon: '<i class="fas fa-user-shield"></i>',
          text: this.system.parry,
          title: game.i18n.localize('SWADE.Parry'),
        },
        {
          icon: '<i class="fas fa-ruler"></i>',
          text: this.system.range,
          title: game.i18n.localize('SWADE.Range._name'),
        },
        {
          icon: '<i class="fas fa-tachometer-alt"></i>',
          text: this.system.rof,
          title: game.i18n.localize('SWADE.RoF'),
        },
        {
          icon: '<i class="fas fa-sticky-note"></i>',
          text: await TextEditor.enrichHTML(this.system.notes, enrichOptions),
          title: game.i18n.localize('SWADE.Notes'),
        },
      );
    }

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

  override prepareBaseData() {
    super.prepareBaseData();
    if (this.type === 'skill') {
      this.system.effects ??= new Array<RollModifier>();
    }
  }

  override prepareDerivedData() {
    super.prepareBaseData();
    if (this.type === 'skill') {
      this.system.die = this._boundTraitDie(this.system.die);
      this.system['wild-die'].sides = Math.min(
        this.system['wild-die'].sides,
        12,
      );
    }
  }

  /** A shorthand function to roll skills directly */
  async roll(options: IRollOptions = {}) {
    //return early if there's no parent or this isn't a skill
    if (this.type !== 'skill' || !this.parent) return null;
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
    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    const hasAmmoManagement =
      this.type === 'weapon' &&
      !this.isMeleeWeapon &&
      ammoManagement &&
      getProperty(this, 'system.reloadType') !== constants.RELOAD_TYPE.NONE;
    const hasMagazine =
      hasAmmoManagement &&
      this.system.reloadType === constants.RELOAD_TYPE.MAGAZINE;
    const hasDamage = !!getProperty(this, 'system.damage');
    const hasTraitRoll =
      ['weapon', 'power', 'shield', 'action'].includes(this.type) &&
      !!getProperty(this, 'system.actions.skill');
    const hasReloadButton =
      ammoManagement &&
      this.type === 'weapon' &&
      getProperty(this, 'system.shots') > 0 &&
      getProperty(this, 'system.reloadType') !== constants.RELOAD_TYPE.NONE &&
      getProperty(this, 'system.reloadType') !== constants.RELOAD_TYPE.SELF;

    const additionalActions: Record<string, ItemAction> =
      getProperty(this, 'system.actions.additional') || {};

    const hasTraitActions = Object.values(additionalActions).some(
      (v) => v.type === 'skill',
    );
    const hasDamageActions = Object.values(additionalActions).some(
      (v) => v.type === 'damage',
    );
    const hasResistRoll = Object.values(additionalActions).some(
      (v) => v.type === 'resist',
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
      hasTemplates,
      showDamageRolls: hasDamage || hasDamageActions,
      trait: getProperty(this, 'system.actions.skill'),
      hasTraitRoll,
      showTraitRolls: hasTraitRoll || hasTraitActions,
      hasResistRoll: hasResistRoll,
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
      user: game.user?.id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: this.parent?.id,
        token: token?.id,
        scene: token?.parent?.id,
        alias: this.parent?.name,
      },
      flags: { core: { canPopout: true } },
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
    const modifiers = new Array<RollModifier>();
    if (getProperty(this, 'system.actions.skillMod')) {
      modifiers.push({
        label: game.i18n.localize('SWADE.ItemTraitMod'),
        value: getProperty(this, 'system.actions.skillMod'),
      });
    }
    if (this.type === 'weapon') {
      modifiers.push(...this.actor.system.stats.globalMods.attack);
      if (this.system.equipStatus === constants.EQUIP_STATE.OFF_HAND) {
        modifiers.push({
          label: game.i18n.localize('SWADE.OffHandPenalty'),
          value: -2,
        });
      }
      if (this.system.trademark > 0) {
        modifiers.push({
          label: game.i18n.localize('SWADE.TrademarkWeapon.Label'),
          value: '+' + this.system.trademark,
        });
      }
    }

    return modifiers;
  }

  canExpendResources(shotsUsed = 1): boolean {
    switch (this.type) {
      case 'weapon': {
        if (!game.settings.get('swade', 'ammoManagement') || this.isMeleeWeapon)
          return true;

        const noReload = this.system.reloadType === constants.RELOAD_TYPE.NONE;
        const selfReload =
          this.system.reloadType === constants.RELOAD_TYPE.SELF;
        const ammo = this?.parent.items.getName(this.system.ammo);
        if (noReload && !ammo) {
          return false;
        } else if (noReload) {
          const ammoCount =
            ammo?.type === 'consumable'
              ? ammo?.system['charges']['value']
              : ammo?.system['quantity'];
          return shotsUsed <= ammoCount;
        } else if (selfReload) {
          const usesRemaining =
            this.system.shots * (this.system.quantity - 1) +
            this.system.currentShots;
          return shotsUsed <= usesRemaining;
        } else {
          return shotsUsed <= this.system.currentShots;
        }
      }
      default:
        return true;
    }
  }

  async consume(charges = 1) {
    const useQuantity = this.type === 'consumable';
    const useAmmo = this.type === 'weapon';
    const useResource = this.type === 'gear';

    const usage = this._getUsageUpdates({
      charges,
      useQuantity,
      useAmmo,
      useResource,
    });
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

    if (this.type === 'consumable' && this.system.messageOnUse) {
      await this._createChargeUsageMessage(charges);
    }

    await this._postConsumptionCleanup(updatedItems);
  }

  async reload() {
    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    if (this.type !== 'weapon' || !ammoManagement) return;

    const ammoName = this.system.ammo;
    //return if there's no ammo set
    if (!ammoName && this.needsFullReloadProcedure()) {
      if (!notificationExists('SWADE.NoAmmoSet', true)) {
        Logger.info('SWADE.NoAmmoSet', { toast: true, localize: true });
      }
      return;
    }

    const ammo = this.parent?.items.getName(ammoName);
    const missingAmmo = this.system.shots - this.system.currentShots;
    const reloadType = this.system.reloadType;

    if (this.needsFullReloadProcedure() && !ammo) {
      if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
        Logger.warn('SWADE.NotEnoughAmmo', {
          toast: true,
          localize: true,
        });
      }
      return;
    }

    if (this.system.currentShots >= this.system.shots) {
      if (!notificationExists('SWADE.ReloadUnneeded', true)) {
        Logger.info('SWADE.ReloadUnneeded', {
          localize: true,
          toast: true,
        });
      }
      return;
    }

    switch (reloadType) {
      case constants.RELOAD_TYPE.SINGLE:
        await this._handleSingleReload(ammo as SwadeItem);
        break;
      case constants.RELOAD_TYPE.FULL:
        await this._handleFullReload(ammo as SwadeItem, missingAmmo);
        break;
      case constants.RELOAD_TYPE.MAGAZINE:
      case constants.RELOAD_TYPE.BATTERY:
        await this._handleReloadFromConsumable(reloadType);
        break;
      case constants.RELOAD_TYPE.PP:
        await this._handlePowerPointReload();
        break;
      case constants.RELOAD_TYPE.NONE:
      case constants.RELOAD_TYPE.SELF:
      default:
        // Shouldn't ever arrive here because the Reload button shouldn't display
        break;
    }
  }

  async removeAmmo() {
    const loadedAmmo = this?.getFlag('swade', 'loadedAmmo');
    if (this.type !== 'weapon' || !this.actor || !loadedAmmo) return;
    const reloadType = this.system.reloadType;
    if (
      reloadType !== constants.RELOAD_TYPE.MAGAZINE &&
      reloadType !== constants.RELOAD_TYPE.BATTERY
    )
      return;

    if (loadedAmmo) {
      const updates: Updates[] = [
        {
          _id: this.id,
          'system.currentShots': 0,
          'flags.swade': { '-=loadedAmmo': null },
        },
      ];

      if (!this.needsFullReloadProcedure()) {
        await this.actor.updateEmbeddedDocuments('Item', updates);
        return;
      }

      const isFull = this.system.currentShots === this.system.shots;
      if (reloadType === constants.RELOAD_TYPE.MAGAZINE) {
        const existingStack = this.actor.items.find(
          (i) =>
            i.type === 'consumable' &&
            i.name === loadedAmmo.name &&
            i.system.equipStatus >= constants.EQUIP_STATE.CARRIED &&
            i.system.subtype === constants.CONSUMABLE_TYPE.MAGAZINE &&
            i.system.charges.value === i.system.charges.max,
        );
        if (existingStack && isFull) {
          updates.push({
            _id: existingStack.id,
            'system.quantity': existingStack.system.quantity + 1,
          });
        } else {
          const newItemData = foundry.utils.mergeObject(loadedAmmo, {
            'system.charges.value': this.system.currentShots,
          });
          await CONFIG.Item.documentClass.create(newItemData, {
            parent: this.actor,
          });
        }
      } else if (reloadType === constants.RELOAD_TYPE.BATTERY) {
        const existingStack = this.actor.items.find(
          (i) =>
            i.type === 'consumable' &&
            i.name === loadedAmmo.name &&
            i.system.equipStatus >= constants.EQUIP_STATE.CARRIED &&
            i.system.subtype === constants.CONSUMABLE_TYPE.BATTERY &&
            i.system.charges.value === 100,
        );

        if (existingStack && isFull) {
          updates.push({
            _id: existingStack.id,
            'system.quantity': existingStack.system.quantity + 1,
          });
        } else {
          const factor = this.system.currentShots / this.system.shots;
          const newItemData = foundry.utils.mergeObject(loadedAmmo, {
            'system.charges.value': Math.ceil(factor * 100),
          });
          await CONFIG.Item.documentClass.create(newItemData, {
            parent: this.actor,
          });
        }
      }

      await this.actor.updateEmbeddedDocuments('Item', updates);
    }
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

  protected async _postConsumptionCleanup(
    updatedItems: StoredDocument<SwadeItem>[],
  ) {
    const shouldDelete = (item: SwadeItem) => {
      return (
        item?.type === 'consumable' &&
        item.system.destroyOnEmpty &&
        item.system.quantity === 0 &&
        item.isOwned
      );
    };

    for (const update of updatedItems) {
      const item = this.parent?.items.get(update.id);
      if (item && shouldDelete(item)) {
        await item.delete();
      }
    }
    if (shouldDelete(this)) {
      await this.delete();
    }
  }

  protected _getUsageUpdates({
    charges,
    useQuantity,
    useAmmo,
    useResource,
  }: UsageUpdatesContext): UsageUpdates | false {
    const actorUpdates: Updates = {};
    const itemUpdates: Updates = {};
    const resourceUpdates = new Array<Updates>();

    if (useQuantity) {
      const canConsume = this._handleUseConsumable(charges, itemUpdates);
      if (canConsume === false) return false;
    }

    if (useAmmo) {
      const canConsume = this._handleConsumeAmmo(
        charges,
        itemUpdates,
        resourceUpdates,
      );
      if (canConsume === false) return false;
    }

    if (useResource) {
      const canConsume = this._handleConsumeResource(charges, itemUpdates);
      if (canConsume === false) return false;
    }

    return { actorUpdates, itemUpdates, resourceUpdates };
  }

  protected _handleUseConsumable(
    chargesToUse: number,
    itemUpdates: Updates,
  ): void | boolean {
    //type guard
    if (this.type !== 'consumable') return false;

    //gather variables
    const currentCharges = this.system.charges.value;
    const maxCharges = this.system.charges.max;
    const quantity = this.system.quantity;
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
    itemUpdates['system.quantity'] = Math.max(0, newQuantity);
    itemUpdates['system.charges.value'] = newCharges;
  }

  private _handleConsumeAmmo(
    chargesToUse: number,
    itemUpdates: Updates,
    resourceUpdates: Updates[],
  ): void | boolean {
    if (!game.settings.get('swade', 'ammoManagement')) return false;

    if (this.system.reloadType === constants.RELOAD_TYPE.NONE) {
      if (!this._isReloadPossible()) return false;
      const ammo = this.parent?.items.getName(this.system.ammo);
      if (ammo?.type === 'consumable') {
        ammo?.consume(chargesToUse);
      } else {
        const quantity = ammo?.system['quantity'];
        if (!ammo || chargesToUse > quantity) {
          Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
          return false;
        }
        resourceUpdates.push({
          _id: ammo.id,
          'data.quantity': quantity - chargesToUse,
        });
      }
    } else if (this.system.reloadType === constants.RELOAD_TYPE.SELF) {
      const currentShots = this.system.currentShots;
      const maxShots = this.system.shots;
      const usesShots = !!maxShots && !!currentShots;
      const usesRemaining =
        maxShots * (this.system.quantity - 1) + currentShots;
      if (!usesShots || chargesToUse > usesRemaining) {
        Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
        return false;
      }

      let newShots;
      let newQuantity;
      if (chargesToUse < currentShots) {
        itemUpdates['system.currentShots'] = currentShots - chargesToUse;
      } else {
        const quantityUsed = Math.ceil(chargesToUse / maxShots);
        const remainingQty = this.system.quantity - quantityUsed;
        if (remainingQty < 1) {
          newShots = 0;
          newQuantity = 0;
        } else {
          const remainder =
            chargesToUse - (currentShots + (quantityUsed - 1) * maxShots);
          newShots = maxShots - remainder;
          newQuantity = remainingQty;
        }
        itemUpdates['system.currentShots'] = newShots;
        itemUpdates['system.quantity'] = newQuantity;
      }
    } else {
      const currentShots = this.system.currentShots;
      const usesShots = !!this.system.shots && !!currentShots;

      if (!usesShots || chargesToUse > currentShots) {
        Logger.warn('SWADE.NotEnoughAmmo', { toast: true, localize: true });
        return false;
      }
      itemUpdates['system.currentShots'] = currentShots - chargesToUse;
    }
  }

  private _handleConsumeResource(
    chargesToUse: number,
    itemUpdates: Updates,
  ): void | boolean {
    itemUpdates['system.quantity'] = this.system.quantity - chargesToUse;
  }

  private _isReloadPossible(): boolean {
    if (this.type !== 'weapon') return false;
    //gather general datapoints;
    const isPC = this.parent?.type === 'character';
    const isNPC = this.parent?.type === 'npc';
    const isVehicle = this.parent?.type === 'vehicle';
    const npcAmmoFromInventory = game.settings.get('swade', 'npcAmmo');
    const vehicleAmmoFromInventory = game.settings.get('swade', 'vehicleAmmo');
    const useAmmoFromInventory = game.settings.get(
      'swade',
      'ammoFromInventory',
    );

    return (
      (isVehicle && vehicleAmmoFromInventory) ||
      (isNPC && npcAmmoFromInventory) ||
      (isPC && useAmmoFromInventory)
    );
  }

  needsFullReloadProcedure(): boolean {
    if (this.type !== 'weapon') return false;
    //gather general datapoints;
    const isPC = this.parent?.type === 'character';
    const isNPC = this.parent?.type === 'npc';
    const isVehicle = this.parent?.type === 'vehicle';
    const npcAmmoFromInventory = game.settings.get('swade', 'npcAmmo');
    const vehicleAmmoFromInventory = game.settings.get('swade', 'vehicleAmmo');
    const useAmmoFromInventory = game.settings.get(
      'swade',
      'ammoFromInventory',
    );

    return (
      (isVehicle && vehicleAmmoFromInventory) ||
      (isNPC && npcAmmoFromInventory) ||
      (isPC && useAmmoFromInventory)
    );
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

  /** @returns the power points for the AB that this power belongs to or null when the item is not a power */
  private _getPowerPoints(): ItemChatCardPowerPoints | null {
    if (this.type === 'power') {
      const actor = this.parent!;
      const arcane = this.system.arcane || 'general';
      const value = foundry.utils.getProperty(
        actor,
        `system.powerPoints.${arcane}.value`,
      );
      const max = foundry.utils.getProperty(
        actor,
        `system.powerPoints.${arcane}.max`,
      );
      return { value, max };
    } else if (this.isArcaneDevice) {
      return foundry.utils.getProperty(
        this,
        'system.powerPoints',
      ) as ItemChatCardPowerPoints;
    }
    return null;
  }
  /** returns a flattened array of item grants, going down the chain of grants */
  async getItemGrantChain(
    ignored = new Set<string>(),
  ): Promise<ItemGrantChainLink[]> {
    if (!this.canGrantItems || ignored.has(this.uuid)) return [];
    ignored.add(this.uuid);
    const grantedItems = (await Promise.all(
      this.grantsItems.map((g) => fromUuid(g.uuid)),
    )) as SwadeItem[];

    const grants = grantedItems.map((item) => {
      return {
        item: item,
        grant: this.grantsItems.find((g) => g.uuid === item.uuid) as ItemGrant,
      };
    });

    const children = await Promise.all(
      grants.flatMap((g) => g.item.getItemGrantChain(ignored)),
    );

    return [...new Set([...grants, ...children.deepFlatten()])];
  }

  protected async _createChargeUsageMessage(charges: number) {
    return CONFIG.ChatMessage.documentClass.create({
      speaker: ChatMessage.getSpeaker(),
      content: `<p>${charges} charge(s) used on <em>${this.name}</em></p>`,
    });
  }

  private async _handleSingleReload(ammo: SwadeItem) {
    if (ammo.system.quantity > 0) {
      if (this.needsFullReloadProcedure()) await ammo.consume(1);
      await this.update({
        'system.currentShots': this.system.currentShots + 1,
      });
      Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    } else {
      if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
        Logger.warn('SWADE.NotEnoughAmmo', {
          toast: true,
          localize: true,
        });
      }
    }
  }

  private async _handleFullReload(ammo: SwadeItem, missingAmmo: number) {
    if (!this.needsFullReloadProcedure()) {
      return this._handleSimpleReload();
    }
    if (ammo.type === 'consumable') {
      return this._handleConsumableReload(ammo, missingAmmo);
    }
    if (ammo.system.quantity <= 0) {
      if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
        Logger.warn('SWADE.NotEnoughAmmo', {
          toast: true,
          localize: true,
        });
      }
      return;
    }
    let ammoInMagazine = this.system.shots;
    if (ammo.system.quantity < missingAmmo) {
      // partial reload
      ammoInMagazine = this.system.currentShots + ammo.system.quantity;
      await ammo.consume(ammo.system.quantity);
      if (!notificationExists('SWADE.NotEnoughAmmoToReload', true)) {
        Logger.warn('SWADE.NotEnoughAmmoToReload', {
          toast: true,
          localize: true,
        });
      }
    } else {
      await ammo.consume(missingAmmo);
    }
    await this.update({ 'system.currentShots': ammoInMagazine });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
  }

  private async _handleConsumableReload(ammo: SwadeItem, missingAmmo: number) {
    if (ammo.system.charges.value <= 0) {
      if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
        Logger.warn('SWADE.NotEnoughAmmo', {
          toast: true,
          localize: true,
        });
      }
      return;
    }

    const allCharges = ammo.system.charges.value * ammo.system.quantity;

    let ammoInMagazine = this.system.shots;
    if (allCharges < missingAmmo) {
      // partial reload
      ammoInMagazine = this.system.currentShots + allCharges;
      await ammo.consume(allCharges);
      if (!notificationExists('SWADE.NotEnoughAmmoToReload', true)) {
        Logger.warn('SWADE.NotEnoughAmmoToReload', {
          toast: true,
          localize: true,
        });
      }
    } else {
      await ammo.consume(missingAmmo);
    }
    await this.update({ 'system.currentShots': ammoInMagazine });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
  }

  private async _handleReloadFromConsumable(reloadType: ReloadType) {
    if (!this.needsFullReloadProcedure()) {
      return this._handleSimpleReload();
    }
    let magazines = new Array<SwadeItem>();
    if (reloadType === constants.RELOAD_TYPE.MAGAZINE) {
      magazines =
        this.actor?.itemTypes.consumable.filter(
          (i) =>
            i.type === 'consumable' &&
            i.system.subtype === constants.CONSUMABLE_TYPE.MAGAZINE &&
            i.name === this.system.ammo &&
            i.system.equipStatus >= constants.EQUIP_STATE.CARRIED,
        ) ?? [];
    } else if (reloadType === constants.RELOAD_TYPE.BATTERY) {
      magazines =
        this.actor?.itemTypes.consumable.filter(
          (i) =>
            i.type === 'consumable' &&
            i.system.subtype === constants.CONSUMABLE_TYPE.BATTERY &&
            i.name === this.system.ammo &&
            i.system.equipStatus >= constants.EQUIP_STATE.CARRIED,
        ) ?? [];
    }

    if (magazines.filter((m) => m.system.charges.value > 0).length === 0) {
      if (!notificationExists('SWADE.NoMags', true)) {
        Logger.warn('SWADE.NoMags', {
          toast: true,
          localize: true,
        });
      }
      return;
    }
    const reloaded = await Reloadinator.asPromise({ weapon: this, magazines });

    if (reloaded) {
      Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    }
  }

  private async _handlePowerPointReload() {
    const powerPoints = this.actor?.system.powerPoints[this.system.ammo];
    if (!powerPoints) {
      if (!notificationExists('SWADE.NoAmmoPP', true)) {
        Logger.warn('SWADE.NoAmmoPP', {
          toast: true,
          localize: true,
        });
      }
      return;
    }
    if (powerPoints?.value < this.system.ppReloadCost) {
      if (!notificationExists('SWADE.NotEnoughAmmo', true)) {
        Logger.warn('SWADE.NotEnoughAmmo', {
          toast: true,
          localize: true,
        });
      }
      return;
    }
    await this.actor?.update({
      ['system.powerPoints.' + this.system.ammo + '.value']:
        powerPoints.value - this.system.ppReloadCost,
    });
    await this.update({ 'system.currentShots': this.system.shots });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
  }

  private async _handleSimpleReload() {
    await this.update({
      'system.currentShots': this.system.shots,
    });
    Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
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
  }

  protected override _onDelete(
    options: DocumentModificationOptions,
    userId: string,
  ) {
    super._onDelete(options, userId);
    if (this.parent) this.removeGranted();
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
}
