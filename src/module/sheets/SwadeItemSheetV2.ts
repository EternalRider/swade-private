import { ItemDataSource } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData';
import { EquipState } from '../../globals';
import {
  AdditionalStat,
  ItemAction,
} from '../../interfaces/additional.interface';
import ActiveEffectWizard from '../apps/ActiveEffectWizard';
import SwadeDocumentTweaks from '../apps/SwadeDocumentTweaks';
import { SWADE } from '../config';
import { constants } from '../constants';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { Logger } from '../Logger';
import { Accordion } from '../style/Accordion';
import { copyToClipboard } from '../util';

export default class SwadeItemSheetV2 extends ItemSheet<
  DocumentSheetOptions,
  SwadeItemSheetData
> {
  collapsibleStates: CollapsibleStates = { powers: {}, actions: {} };
  _effectCreateDropDown: ContextMenu;

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 600,
      height: 560,
      classes: ['swade-item-sheet', 'swade', 'swade-app'],
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'summary',
        },
      ],
      scrollY: ['.properties', '.actions', '.editor-container .editor-content'],
      dragDrop: [{ dropSelector: null, dragSelector: '.effect-list li' }],
      resizable: true,
    });
  }

  override get template(): string {
    return `systems/swade/templates/item/${this.type}.hbs`;
  }

  get type(): this['item']['data']['type'] {
    return this.item.type;
  }

  get hasInlineDelete(): boolean {
    const types = ['edge', 'hindrance', 'ability', 'skill', 'power', 'action'];
    return types.includes(this.type);
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

  get actionTypes(): Record<string, string> {
    return {
      skill: 'SWADE.Trait',
      damage: 'SWADE.Dmg',
      resist: 'SWADE.Resist',
    };
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    this._setupAccordions();
    this._setupEffectCreateMenu(html);

    html.find('.profile-img').on('contextmenu', () => {
      if (!this.item.img) return;
      new ImagePopout(this.item.img, {
        title: this.item.name!,
        shareable: this.item?.isOwner ?? game.user?.isGM,
      }).render(true);
    });

    if (!this.isEditable) return;

    this.form?.addEventListener('keypress', (ev: KeyboardEvent) => {
      const target = ev.target as HTMLButtonElement;
      const targetIsButton = 'button' === target?.type;
      if (!targetIsButton && ev.key === 'Enter') {
        ev.preventDefault();
        this.submit({ preventClose: true });
        return false;
      }
    });

    // Delete Item from within Sheet. Only really used for Skills, Edges, Hindrances and Powers
    html.find('.inline-delete').on('click', () => this.item.delete());

    html.find('.add-action').on('click', () => {
      const id = randomID(8);
      this.collapsibleStates[id] = true;
      this.item.update({
        ['system.actions.additional.' + id]: {
          name: 'New Action',
          type: 'skill',
        },
      });
    });

    html.find('.action-delete').on('click', async (ev) => {
      const id = ev.currentTarget.dataset.actionId;
      const action = getProperty(
        this.item,
        `system.actions.additional.${id}`,
      ) as ItemAction;
      const text = game.i18n.format('SWADE.DeleteEmbeddedActionPrompt', {
        action: action.name,
      });
      await Dialog.confirm({
        content: `<p class="text-center">${text}</p>`,
        yes: () => {
          this.item.update({
            'system.actions.additional': {
              [`-=${id}`]: null,
            },
          });
        },
        defaultYes: false,
        options: foundry.utils.mergeObject(Dialog.defaultOptions, {
          classes: ['dialog', 'swade-app'],
        }),
      });
    });

    html.find('.power-delete').on('click', async (ev) => {
      const id = $(ev.currentTarget).parents('details').data('powerId');
      const power = this.item.embeddedPowers.get(id);
      const text = game.i18n.format('SWADE.DeleteEmbeddedPowerPrompt', {
        power: power?.name,
      });
      await Dialog.confirm({
        content: `<p class="text-center">${text}</p>`,
        yes: async () => await this._deleteEmbeddedDocument('power', id),
        defaultYes: false,
        options: foundry.utils.mergeObject(Dialog.defaultOptions, {
          classes: ['dialog', 'swade-app'],
        }),
      });
    });

    html.find('.effect-action').on('click', (ev) => {
      const a = ev.currentTarget;
      const effectId = a.closest('li')!.dataset.effectId!;
      const effect = this.item.effects.get(effectId, { strict: true });
      const action = a.dataset.action;
      switch (action) {
        case 'edit':
          return effect.sheet?.render(true);
        case 'delete':
          return effect.delete();
        case 'toggle':
          return effect.update({ disabled: !effect.disabled });
      }
    });

    html.find('.delete-embedded').on('click', async (ev) => {
      const id = ev.currentTarget.dataset.id!;
      await this._deleteEmbeddedDocument('ability', id);
    });

    html.find('.power .damage').on('click', (ev) => {
      const id = $(ev.currentTarget).parents('details').data('powerId');
      const tempPower = new SwadeItem(this.item.embeddedPowers.get(id));
      tempPower.rollDamage();
    });

    html.find('.additional-stats .rollable').on('click', async (ev) => {
      const stat = ev.currentTarget.dataset.stat!;
      const statData = this.item.system.additionalStats[stat]!;
      let modifier = statData.modifier ?? '';
      if (!modifier.match(/^[+-]/)) {
        modifier = '+' + modifier;
      }
      //return of there's no value to roll
      if (!statData.value) return;
      const roll = new Roll(`${statData.value}${modifier}`);
      await roll.evaluate({ async: true });
      await roll.toMessage({
        speaker: CONFIG.ChatMessage.documentClass.getSpeaker(),
        flavor: `${this.item.name} - ${statData.label}`,
      });
    });

    html
      .find('.use-consumable')
      .on('click', async () => await this.item.consume());
  }

  override async getData(
    options?: Partial<DocumentSheetOptions>,
  ): Promise<SwadeItemSheetData> {
    const additionalStats = this.item.system.additionalStats;

    const data: SwadeItemSheetData = {
      itemType: game.i18n.localize(`ITEM.Type${this.type.capitalize()}`),
      enrichedDescription: await TextEditor.enrichHTML(
        this.item.system.description,
        {
          async: true,
          secrets: this.isEditable,
        },
      ),
      hasInlineDelete: this.hasInlineDelete,
      isPhysicalItem: this.isPhysicalItem,
      hasCategory: this.item.canHaveCategory,
      actionTypes: this.actionTypes,
      hasAdditionalStats: Object.keys(additionalStats).length > 0,
      additionalStats: additionalStats,
      collapsibleStates: this.collapsibleStates,
      isArcaneDevice: this.item.isArcaneDevice,
      ranges: this._rangeSuggestions(),
      equipStatusOptions: this._equipStatusOptions(),
      settingRules: {
        modSlots: game.settings.get('swade', 'vehicleMods'),
        noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
      },
    };

    if (this.item.type === 'ability') {
      const subtype = this.item.system.subtype;
      data.abilityConfig = {
        localization: SWADE.abilitySheet,
        abilityHeader: SWADE.abilitySheet[subtype].abilities,
        isRaceOrArchetype: subtype === 'race' || subtype === 'archetype',
      };
      data.embeddedAbilities = this._prepareEmbeddedAbilities();
    }

    if (this.type === 'weapon') {
      data.trademarkWeaponOptions = this._trademarkWeaponOptions();
      data.ammoList = this.actor?.itemTypes.gear
        .filter((i) => i.system.isAmmo)
        .map((i) => i.name) as string[];
    }

    if (this.item.isArcaneDevice) {
      data.embeddedPowers = this.item.embeddedPowers;
    }
    return foundry.utils.mergeObject(await super.getData(options), data);
  }

  protected override _getHeaderButtons() {
    const buttons = super._getHeaderButtons();

    if (this.isEditable) {
      buttons.unshift({
        label: 'SWADE.DocumentTweaks',
        class: 'configure-actor',
        icon: 'fas fa-dice',
        onclick: () => new SwadeDocumentTweaks(this.item).render(true),
      });
    }

    buttons.unshift({
      label: 'SWADE.DocumentLink',
      class: 'copy-link',
      icon: 'fas fa-link',
      onclick: () => copyToClipboard(this.item.link),
    });
    return buttons;
  }

  protected override _getSubmitData(updateData: object | null = {}) {
    const data = super._getSubmitData(updateData);
    if (this.item.type !== 'skill') {
      // Prevent submitting overridden values
      const overrides = foundry.utils.flattenObject(this.item.overrides);
      Object.keys(overrides).forEach((v) => delete data[v]);
    }
    return data;
  }

  protected override async _onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    try {
      //get the data
      const data = JSON.parse(event.dataTransfer!.getData('text/plain')) as {
        type: string;
        uuid: string;
      };
      switch (data.type) {
        case 'ActiveEffect':
          await this._onDropActiveEffect(event, data);
          break;
        case 'Item':
          await this._onDropItem(event, data);
          break;
        default:
          break;
      }
    } catch (error) {
      Logger.error(error);
    }
  }

  private async _onDropActiveEffect(_event: DragEvent, data) {
    if (!this.item.isOwner || !data.data) return;
    if (await this._isSourceSameAsDestination(data)) return;
    return CONFIG.ActiveEffect.documentClass.create(data.data, {
      parent: this.item,
    });
  }

  private async _onDropItem(_event: DragEvent, data) {
    Logger.debug(
      `Trying to add ${data.type} ${data.uuid} to ${this.item.type}/${this.item.name}`,
    );
    const item = (await fromUuid(data.uuid)) as SwadeItem;

    if (item.type === 'ability' && item.system.subtype !== 'special') {
      return Logger.warn('SWADE.CannotAddRaceToRace', {
        localize: true,
        toast: true,
      });
    }
    //prep item data
    const itemData = item.toObject();

    if (
      this.item.type === 'ability' &&
      this.item.system.subtype !== 'special'
    ) {
      const collection = this.item.embeddedAbilities;
      collection.set(foundry.utils.randomID(), itemData);
      await this._saveEmbeddedAbilities(collection);
    }

    if (this.item.isArcaneDevice && item.type === 'power') {
      const collection = this.item.embeddedPowers;
      collection.set(foundry.utils.randomID(), itemData);
      await this._saveEmbeddedPowers(collection);
    }
  }

  /** Is the drop data coming from the same item? */
  private async _isSourceSameAsDestination(data) {
    let other;

    //item owned by token actor
    if (data.sceneId && data.tokenId) {
      other = game.scenes
        ?.get(data.sceneId)
        ?.tokens.get(data.tokenId)
        ?.actor?.items.get(data.itemId);
    }

    //standalone item
    if (!other && data.itemId) {
      if (data.pack) {
        other = await game.packs.get(data.pack)?.getDocument(data.itemId);
      } else {
        other = game.items?.get(data.itemId);
      }
    }

    //item owned by standalone actor
    if (!other && data.actorId) {
      if (data.pack) {
        const actor = (await game.packs
          .get(data.pack)
          ?.getDocument(data.actorId)) as StoredDocument<SwadeActor>;
        other = actor?.items.get(data.itemId);
      } else {
        other = game.actors?.get(data.actorId)?.items.get(data.itemId);
      }
    }
    return this.item === other;
  }

  protected override async _onDragStart(event: DragEvent) {
    const src = event.target as HTMLElement;

    // Create drag data
    const dragData: Record<string, unknown> = {
      actorId: this.actor?.id,
      sceneId: this.actor?.isToken ? canvas.scene?.id : null,
      tokenId: this.actor?.isToken ? this.actor?.token?.id : null,
      itemId: this.item.id,
      pack: this.item.pack,
    };

    // Active Effect
    if (src.dataset.effectId) {
      const effect = this.item.effects.get(src.dataset.effectId);
      dragData.type = 'ActiveEffect';
      dragData.data = effect?.data.toObject();
    }

    // Set data transfer
    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  private async _deleteEmbeddedDocument(type: 'power' | 'ability', id: string) {
    const flagKey = {
      ability: 'embeddedAbilities',
      power: 'embeddedPowers',
    };
    const flagContent = this.item.getFlag('swade', flagKey[type]) ?? [];
    const map = new Map(flagContent as Array<[string, ItemDataSource]>);
    map.delete(id);
    this.item.setFlag('swade', flagKey[type], Array.from(map));
  }

  private _prepareEmbeddedAbilities(): Array<Record<string, unknown>> {
    const collection = this.item.embeddedAbilities;
    const items = new Array<Record<string, unknown>>();
    for (const [key, val] of collection) {
      const type =
        val.type === 'ability'
          ? game.i18n.localize('SWADE.SpecialAbility')
          : game.i18n.localize(`ITEM.Type${val.type.capitalize()}`);

      let majorMinor = '';
      if (val.type === 'hindrance') {
        if (val.data?.major ?? val.system.major) {
          majorMinor = game.i18n.localize('SWADE.Major');
        } else {
          majorMinor = game.i18n.localize('SWADE.Minor');
        }
      }
      items.push({
        id: key,
        img: val.img,
        name: val.name,
        type,
        majorMinor,
      });
    }
    return items;
  }

  private async _saveEmbeddedAbilities(map: Map<string, ItemDataSource>) {
    return this.item.setFlag('swade', 'embeddedAbilities', Array.from(map));
  }

  private async _saveEmbeddedPowers(map: Map<string, ItemDataSource>) {
    return this.item.setFlag('swade', 'embeddedPowers', Array.from(map));
  }

  private _setupAccordions() {
    this.form
      ?.querySelectorAll<HTMLDetailsElement>('.actions-list details')
      .forEach((el) => {
        new Accordion(el, '.content', { duration: 200 });
        const id = el.dataset.actionId as string;
        el.querySelector('summary')?.addEventListener('click', () => {
          const states = this.collapsibleStates.actions;
          const currentState = Boolean(states[id]);
          states[id] = !currentState;
        });
      });

    this.form
      ?.querySelectorAll<HTMLDetailsElement>('.powers-list details')
      .forEach((el) => {
        new Accordion(el, '.content', { duration: 200 });
        const id = el.dataset.powerId as string;
        el.querySelector('summary')?.addEventListener('click', () => {
          const states = this.collapsibleStates.powers;
          const currentState = Boolean(states[id]);
          states[id] = !currentState;
        });
      });
  }

  private _setupEffectCreateMenu(html: JQuery<HTMLElement> = $('body')) {
    this._effectCreateDropDown = new ContextMenu(
      html,
      '.effects .header',
      [
        {
          name: 'SWADE.ActiveEffects.AddGuided',
          icon: '<i class="fa-solid fa-hat-wizard"></i>',
          condition: this.object.isOwner,
          callback: (_li) => {
            new ActiveEffectWizard(this.object).render(true);
          },
        },
        {
          name: 'SWADE.ActiveEffects.AddUnguided',
          icon: '<i class="fa-solid fa-file-plus"></i>',
          condition: this.object.isOwner,
          callback: (_li) => {
            this._createActiveEffect();
          },
        },
      ],
      { eventName: 'click' },
    );
  }

  private async _createActiveEffect() {
    const newEffect = await CONFIG.ActiveEffect.documentClass.create(
      {
        label: game.i18n.format('DOCUMENT.New', {
          type: game.i18n.localize('DOCUMENT.ActiveEffect'),
        }),
        transfer: true,
      },
      { parent: this.item },
    );
    newEffect?.sheet?.render(true);
  }

  private _rangeSuggestions() {
    return [
      '3/6/12',
      '4/8/16',
      '5/10/20',
      '10/20/40',
      '12/24/48',
      '15/30/60',
      '20/40/60',
      '20/40/80',
      '24/48/96',
      '25/50/100',
      '30/60/120',
      '50/100/200',
      '75/150/300',
      '300/600/1200',
    ];
  }

  private _equipStatusOptions(): Record<number, string> {
    let states: Record<number, string> = {
      [constants.EQUIP_STATE.STORED]: 'SWADE.ItemEquipStatus.Stored',
      [constants.EQUIP_STATE.CARRIED]: 'SWADE.ItemEquipStatus.Carried',
    };

    if (this.item.type === 'weapon') {
      if (this.item.system.isVehicular && this.actor?.type === 'vehicle') {
        states = {
          ...states,
          [constants.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Equipped',
        };
      } else {
        states = {
          ...states,
          [constants.EQUIP_STATE.MAIN_HAND]: 'SWADE.ItemEquipStatus.MainHand',
          [constants.EQUIP_STATE.OFF_HAND]: 'SWADE.ItemEquipStatus.OffHand',
          [constants.EQUIP_STATE.TWO_HANDS]: 'SWADE.ItemEquipStatus.TwoHands',
        };
      }
    } else if (
      this.item.type === 'armor' ||
      this.item.type === 'shield' ||
      (this.item.type === 'gear' &&
        (this.item.system.equippable || this.item.system.isVehicular))
    ) {
      states = {
        ...states,
        [constants.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Equipped',
      };
    }
    return states;
  }

  private _trademarkWeaponOptions(): Record<number, string> {
    return {
      0: 'None',
      1: 'SWADE.TrademarkWeapon.Regular',
      2: 'SWADE.TrademarkWeapon.Improved',
    };
  }
}

interface SwadeItemSheetData extends OptionsPartial {
  itemType: string;
  hasInlineDelete: boolean;
  isPhysicalItem: boolean;
  hasCategory: boolean;
  actionTypes: Record<string, string>;
  hasAdditionalStats: boolean;
  additionalStats: Record<string, AdditionalStat>;
  collapsibleStates: CollapsibleStates;
  isArcaneDevice: boolean;
  enrichedDescription: string;
  settingRules: {
    modSlots: boolean;
    noPowerPoints: boolean;
  };
  equipStatusOptions: Record<EquipState, string>;
  ranges: string[];
  trademarkWeaponOptions?: Record<number, string>;
  embeddedPowers?: Map<string, ItemDataSource>;
  embeddedAbilities?: Array<Record<string, unknown>>;
  ammoList?: string[];
  abilityConfig?: {
    localization: typeof SWADE.abilitySheet;
    abilityHeader: string;
    isRaceOrArchetype: boolean;
  };
}

type OptionsPartial = Partial<ItemSheet.Data<DocumentSheetOptions>>;

interface CollapsibleStates {
  actions: Record<string, boolean>;
  powers: Record<string, boolean>;
}
