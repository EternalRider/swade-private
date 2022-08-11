import { ItemDataSource } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/itemData';
import { EquipState } from '../../globals';
import {
  AdditionalStat,
  ItemAction,
} from '../../interfaces/additional.interface';
import SwadeDocumentTweaks from '../apps/SwadeDocumentTweaks';
import { SWADE } from '../config';
import { constants } from '../constants';
import SwadeItem from '../documents/item/SwadeItem';
import { Accordion } from '../style/Accordion';
import { copyToClipboard } from '../util';

export default class SwadeItemSheetV2 extends ItemSheet<
  DocumentSheetOptions,
  SwadeItemSheetData
> {
  collapsibleStates: CollapsibleStates = { powers: {}, actions: {} };

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
      resizable: true,
    });
  }

  override get template(): string {
    return `systems/swade/templates/item/${this.type}.hbs`;
  }

  get type(): this['item']['data']['type'] {
    return this.item.data.type;
  }

  get hasInlineDelete(): boolean {
    const types = ['edge', 'hindrance', 'ability', 'skill', 'power'];
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
    return { skill: 'SWADE.Trait', damage: 'SWADE.Dmg' };
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    this._setupAccordions();

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

    if (
      this.item.isArcaneDevice ||
      (this.item.data.type === 'ability' &&
        this.item.data.data.subtype !== 'special')
    ) {
      this.form?.addEventListener('drop', this._onDrop.bind(this));
    }

    // Delete Item from within Sheet. Only really used for Skills, Edges, Hindrances and Powers
    html.find('.inline-delete').on('click', this.item.delete.bind(this));

    html.find('.add-action').on('click', () => {
      const id = randomID(8);
      this.collapsibleStates[id] = true;
      this.item.update({
        ['data.actions.additional.' + id]: {
          name: 'New Action',
          type: 'skill',
        },
      });
    });

    html.find('.action-delete').on('click', async (ev) => {
      const id = ev.currentTarget.dataset.actionId;
      const action = getProperty(
        this.item.data,
        `data.actions.additional.${id}`,
      ) as ItemAction;
      const text = game.i18n.format('SWADE.DeleteEmbeddedActionPrompt', {
        action: action.name,
      });
      await Dialog.confirm({
        content: `<p class="text-center">${text}</p>`,
        yes: () => {
          this.item.update({
            'data.actions.additional': {
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
      const power = this._getEmbeddedPowers().get(id);
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

    html.find('.add-effect').on('click', async (ev) => {
      const newEffect = await CONFIG.ActiveEffect.documentClass.create(
        {
          label: game.i18n.format('DOCUMENT.New', {
            type: game.i18n.localize('DOCUMENT.ActiveEffect'),
          }),
          icon: '/icons/svg/mystery-man.svg',
          transfer: Boolean(ev.currentTarget.dataset.transfer),
        },
        { parent: this.item },
      );
      newEffect?.sheet?.render(true);
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
          return effect.update({ disabled: !effect.data.disabled });
      }
    });

    html.find('.delete-embedded').on('click', async (ev) => {
      const id = ev.currentTarget.dataset.id!;
      await this._deleteEmbeddedDocument('ability', id);
    });

    html.find('.power .damage').on('click', (ev) => {
      const id = $(ev.currentTarget).parents('details').data('powerId');
      const tempPower = new SwadeItem(this._getEmbeddedPowers().get(id));
      tempPower.rollDamage();
    });

    html.find('.additional-stats .rollable').on('click', async (ev) => {
      const stat = ev.currentTarget.dataset.stat!;
      const statData = this.item.data.data.additionalStats[stat]!;
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
    const additionalStats = this.item.data.data.additionalStats ?? {};

    const data: SwadeItemSheetData = {
      itemType: game.i18n.localize(`ITEM.Type${this.type.capitalize()}`),
      hasInlineDelete: this.hasInlineDelete,
      isPhysicalItem: this.isPhysicalItem,
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

    if (this.item.data.type === 'ability') {
      const subtype = this.item.data.data.subtype;
      data.abilityConfig = {
        localization: SWADE.abilitySheet,
        abilityHeader: SWADE.abilitySheet[subtype].abilities,
        isRaceOrArchetype: subtype === 'race' || subtype === 'archetype',
      };
      data.embeddedAbilities = this._prepareEmbeddedAbilities();
    }

    if (this.type === 'weapon') {
      data.ammoList = this.actor?.itemTypes.gear.map((i) => i.data.name);
    }

    if (this.item.isArcaneDevice) {
      data.embeddedPowers = this._getEmbeddedPowers();
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
    // Prevent submitting overridden values
    const overrides = foundry.utils.flattenObject(this.item.overrides);
    Object.keys(overrides).forEach((v) => delete data[v]);
    return data;
  }

  protected override async _onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    let data;
    let item: StoredDocument<SwadeItem> | SwadeItem;

    //get the data and accept it
    try {
      //get the data
      data = JSON.parse(event.dataTransfer!.getData('text/plain'));

      if ('pack' in data) {
        const pack = game.packs.get(data.pack, { strict: true });
        item = (await pack.getDocument(data.id)) as StoredDocument<SwadeItem>;
      } else if ('actorId' in data) {
        item = new SwadeItem(data.data);
      } else {
        item = game.items!.get(data.id, { strict: true });
      }

      if (
        data.type !== 'Item' ||
        (item.data.type === 'ability' && item.data.data.subtype !== 'special')
      ) {
        ui.notifications.warn('SWADE.CannotAddRaceToRace', { localize: true });
        return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }

    //prep item data
    const itemData = item.data.toObject();

    if (
      this.item.data.type === 'ability' &&
      this.item.data.data.subtype !== 'special'
    ) {
      const collection = this._getEmbeddedAbilities();
      collection.set(randomID(), itemData);
      await this._saveEmbeddedAbilities(collection);
    }

    if (this.item.canBeArcaneDevice && item.data.type === 'power') {
      const collection = this._getEmbeddedPowers();
      collection.set(randomID(), itemData);
      await this._saveEmbeddedPowers(collection);
    }

    return super._onDrop(event);
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

  private _getEmbeddedAbilities() {
    const flagContent = this.item.getFlag('swade', 'embeddedAbilities') ?? [];
    return new Map(flagContent as Array<[string, ItemDataSource]>);
  }

  private _prepareEmbeddedAbilities(): Array<Record<string, unknown>> {
    const collection = this._getEmbeddedAbilities();
    const items = new Array<Record<string, unknown>>();
    for (const [key, val] of collection) {
      const type =
        val.type === 'ability'
          ? game.i18n.localize('SWADE.SpecialAbility')
          : game.i18n.localize(`ITEM.Type${val.type.capitalize()}`);

      let majorMinor = '';
      if (val.type === 'hindrance') {
        if (val.data.major) {
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

  private _getEmbeddedPowers() {
    const flagContent = this.item.getFlag('swade', 'embeddedPowers') ?? [];
    return new Map(flagContent as Array<[string, ItemDataSource]>);
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

    if (
      this.item.data.type === 'weapon' &&
      !(this.item.data.data.isVehicular && this.item.parent?.type === 'vehicle')
    ) {
      states = {
        ...states,
        [constants.EQUIP_STATE.MAIN_HAND]: 'SWADE.ItemEquipStatus.MainHand',
        [constants.EQUIP_STATE.OFF_HAND]: 'SWADE.ItemEquipStatus.OffHand',
        [constants.EQUIP_STATE.TWO_HANDS]: 'SWADE.ItemEquipStatus.TwoHands',
      };
    }
    if (
      this.item.data.type === 'armor' ||
      this.item.data.type === 'shield' ||
      (this.item.data.type === 'gear' && this.item.data.data.equippable)
    ) {
      states = {
        ...states,
        [constants.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Equipped',
      };
    }
    return states;
  }
}

interface SwadeItemSheetData extends OptionsPartial {
  itemType: string;
  hasInlineDelete: boolean;
  isPhysicalItem: boolean;
  actionTypes: Record<string, string>;
  hasAdditionalStats: boolean;
  additionalStats: Record<string, AdditionalStat>;
  collapsibleStates: CollapsibleStates;
  isArcaneDevice: boolean;
  settingRules: {
    modSlots: boolean;
    noPowerPoints: boolean;
  };
  equipStatusOptions: Record<EquipState, string>;
  ranges: string[];
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
