import { AnyObject } from 'fvtt-types/utils';
import {
  AdditionalStats,
  DieSidesOption,
  EquipState,
  ItemActions,
} from '../../globals';
import { ItemAction } from '../../interfaces/additional.interface';
import ActiveEffectWizard from '../apps/ActiveEffectWizard';
import { RequirementsEditor } from '../apps/RequirementsEditor';
import { SwadeItemTweaks } from '../apps/SwadeDocumentTweaks';
import { SWADE } from '../config';
import { constants } from '../constants';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';
import SwadeItem from '../documents/item/SwadeItem';
import { ItemGrant } from '../documents/item/SwadeItem.interface';
import { Logger } from '../Logger';
import { Accordion } from '../style/Accordion';
import { getDieSidesRange } from '../util';

export default class SwadeItemSheetV2 extends foundry.appv1.sheets.ItemSheet {
  collapsibleStates: CollapsibleStates = {
    powers: {},
    actions: {},
    effects: {},
  };
  #effectCreateDropDown: ContextMenu;

  static override get defaultOptions() {
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
      dragDrop: [
        { dropSelector: null, dragSelector: '.effect-list li details' },
      ],
      resizable: true,
    });
  }

  override get template(): string {
    return `systems/swade/templates/item/${this.type}.hbs`;
  }

  get type(): this['item']['type'] {
    return this.item.type;
  }

  get hasInlineDelete(): boolean {
    const types = [
      'edge',
      'hindrance',
      'ability',
      'ancestry',
      'skill',
      'power',
      'action',
    ];
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
      trait: 'SWADE.Trait',
      damage: 'SWADE.Dmg',
      resist: 'SWADE.Resist',
      macro: 'DOCUMENT.Macro',
    };
  }

  get macroActorTypes(): Record<string, string> {
    return {
      default: 'SWADE.MacroActor.Default',
      self: 'SWADE.MacroActor.Self',
      target: 'SWADE.MacroActor.Target',
    };
  }

  override activateListeners(jquery: JQuery<HTMLElement>): void {
    super.activateListeners(jquery);
    this.#setupAccordions();

    const html = jquery[0];

    this.#setupEffectCreateMenu(html);

    html.querySelector('.profile-img')?.addEventListener('contextmenu', () => {
      if (!this.item.img) return;
      new ImagePopout({
        src: this.item.img,
        title: this.item.name!,
        shareable: this.item?.isOwner ?? game.user?.isGM,
        uuid: this.item.uuid,
      }).render({ force: true });
    });

    if (!this.isEditable) return;

    // Disable overridden inputs
    const overrides = foundry.utils.flattenObject(this.item.overrides);
    for (const key of Object.keys(overrides)) {
      html
        .querySelectorAll(`[name="${key}"]`)
        .forEach((el) => el.setAttribute('disabled', 'override'));
    }

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
    html
      .querySelector('.inline-delete')
      ?.addEventListener('click', () => this.item.delete());

    html.querySelector('.add-action')?.addEventListener('click', () => {
      const id = foundry.utils.randomID(8);
      this.collapsibleStates[id] = true;
      this.item.update({
        ['system.actions.additional.' + id]: {
          name: game.i18n.format('DOCUMENT.New', {
            type: game.i18n.localize('TYPES.Item.action'),
          }),
          type: constants.ACTION_TYPE.TRAIT,
        },
      });
    });

    html.querySelectorAll('.action-delete').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const id = ev.currentTarget.dataset.actionId;
        const action = foundry.utils.getProperty(
          this.item,
          `system.actions.additional.${id}`,
        ) as ItemAction;
        const text = game.i18n.format('SWADE.DeleteEmbeddedActionPrompt', {
          action: action.name,
        });
        await foundry.applications.api.DialogV2.confirm({
          content: `<p class="text-center">${text}</p>`,
          classes: ['dialog', 'swade-app'],
          yes: {
            callback: async () =>
              await this.item.update({
                [`system.actions.additional.-=${id}`]: null,
              }),
          },
        });
      }),
    );

    html.querySelectorAll('.power-delete').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const id = ev.currentTarget?.closest('details')?.dataset.powerId;
        const power = this.item.embeddedPowers.get(id);
        const text = game.i18n.format('SWADE.DeleteEmbeddedPowerPrompt', {
          power: power?.name,
        });
        await foundry.applications.api.DialogV2.confirm({
          content: `<p class="text-center">${text}</p>`,
          classes: ['dialog', 'swade-app'],
          yes: {
            callback: async () => await this.#deleteEmbeddedDocument(id),
          },
        });
      }),
    );

    html.querySelectorAll('.grant-delete').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const uuid = ev.currentTarget?.closest('.granted-item')?.dataset.uuid;
        const grants = this.item.grantsItems;
        grants.findSplice((v) => v.uuid === uuid);
        await this.item.update({ 'system.grants': grants });
      }),
    );

    html.querySelectorAll('.grant-name').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const uuid = ev.currentTarget?.closest('.granted-item')?.dataset.uuid;
        const doc = (await fromUuid(uuid)) as SwadeItem | null;
        // TODO: change args once this sheet is AppV2
        doc?.sheet?.render(true);
      }),
    );

    html.querySelectorAll('.effect-action').forEach((el) =>
      el.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const a = ev.currentTarget;
        const effectId = a.closest('details')!.dataset.effectId! as string;
        const effect = this.item.effects.get(effectId, { strict: true });
        const action = a.dataset.action as string;
        const toggle = a.dataset.toggle as string;

        switch (action) {
          case 'edit':
            return effect.sheet?.render({ force: true });
          case 'delete':
            return effect.delete();
          case 'toggle':
            return effect.update(this.#toggleEffect(effect, toggle));
        }
      }),
    );

    html.querySelectorAll('.power .damage').forEach((el) =>
      el.addEventListener('click', (ev) => {
        const id = ev.currentTarget?.closest('details')?.dataset.powerId;
        const tempPower = new SwadeItem(this.item.embeddedPowers.get(id));
        tempPower.rollDamage();
      }),
    );

    html.querySelectorAll('.additional-stats .rollable').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const stat = ev.currentTarget.dataset.stat!;
        await this.item.system.rollAdditionalStat(stat);
      }),
    );

    html
      .querySelectorAll('.use-consumable')
      .forEach((el) =>
        el.addEventListener('click', async () => await this.item.consume()),
      );

    html.querySelectorAll('.loaded-ammo-name').forEach((el) =>
      el.addEventListener('mouseenter', async (ev) => {
        const loadedAmmo = this.item.getFlag('swade', 'loadedAmmo');
        const content = `<h3>${loadedAmmo?.name}</h3>${loadedAmmo?.system.description}`;
        game.tooltip.activate(ev.currentTarget, {
          html: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            content,
            {
              secrets: this.item.isOwner,
            },
          ),
          cssClass: 'themed theme-dark',
        });
      }),
    );

    html
      .querySelector('button.open-requirements-editor')
      ?.addEventListener('click', () =>
        new RequirementsEditor({ edge: this.item }).render({ force: true }),
      );
  }

  override async getData(
    options: OptionsPartial = {},
  ): Promise<SwadeItemSheetData> {
    const additionalStats = this.#getAdditionalStats();

    const data: SwadeItemSheetData = {
      itemType: this.#getItemType(),
      enrichedDescription: await this.#enrichText(this.item.system.description),
      hasInlineDelete: this.hasInlineDelete,
      isPhysicalItem: this.isPhysicalItem,
      hasCategory: this.item.canHaveCategory,
      actionTypes: this.actionTypes,
      macroActorTypes: this.macroActorTypes,
      hasAdditionalStats: Object.keys(additionalStats).length > 0,
      additionalStats: additionalStats,
      collapsibleStates: this.collapsibleStates,
      showMods: game.settings.get('swade', 'vehicleMods'),
      showEnergy: game.settings.get('swade', 'vehicleEnergy'),
      isArcaneDevice: this.item.isArcaneDevice,
      ranges: this.#rangeSuggestions(),
      equipStatusOptions: this.#equipStatusOptions(),
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
        isArchetype: subtype === constants.ABILITY_TYPE.ARCHETYPE,
      };
      data.abilitySubtypeOptions = this.#getAbilitySubtypeOptions(
        SWADE.abilitySheet,
      );
    }

    if (this.item.canGrantItems) {
      data.grantedItems = await this.#getGrantedItems();
    }
    data.grantOnTriggers = this.#getGrantOnTriggers();
    for (const effect of this.item.effects) {
      foundry.utils.setProperty(
        effect,
        'enrichedDescription',
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          effect.description,
          {
            secrets: this.item.isOwner,
          },
        ),
      );
    }

    if (this.type === 'weapon') {
      data.ppReload = false;
      data.trademarkWeaponOptions = this.#trademarkWeaponOptions();
      switch (this.item.system.reloadType) {
        case constants.RELOAD_TYPE.NONE:
        case constants.RELOAD_TYPE.SINGLE:
        case constants.RELOAD_TYPE.FULL:
          data.ammoList = this.actor?.itemTypes.gear
            .filter((i) => i.system.isAmmo)
            .map((i) => i.name) as string[];
          break;
        case constants.RELOAD_TYPE.MAGAZINE:
          data.ammoList = this.actor?.itemTypes.consumable
            .filter(
              (i) =>
                i.type === 'consumable' &&
                i.system.subtype === constants.CONSUMABLE_TYPE.MAGAZINE,
            )
            .map((i) => i.name) as string[];
          data.ammoLoaded = this.item.getFlag('swade', 'loadedAmmo')?.name;
          break;
        case constants.RELOAD_TYPE.PP:
          data.ammoList = Object.keys(this.actor?.system?.powerPoints ?? {});
          data.ppReload = true;
          break;
        case constants.RELOAD_TYPE.BATTERY:
          data.ammoList = this.actor?.itemTypes.consumable
            .filter(
              (i) =>
                i.type === 'consumable' &&
                i.system.subtype === constants.CONSUMABLE_TYPE.BATTERY,
            )
            .map((i) => i.name) as string[];
          data.ammoLoaded = this.item.getFlag('swade', 'loadedAmmo')?.name;
          break;
        case constants.RELOAD_TYPE.SELF:
          // Doesn't use external ammo
          break;
      }
      data.reloadTypeOptions = this.#reloadTypeOptions();
      data.rangeTypeOptions = {
        [constants.WEAPON_RANGE_TYPE.MELEE]: 'SWADE.Weapon.RangeType.Melee',
        [constants.WEAPON_RANGE_TYPE.RANGED]: 'SWADE.Weapon.RangeType.Ranged',
        [constants.WEAPON_RANGE_TYPE.MIXED]: 'SWADE.Weapon.RangeType.Mixed',
      };
    }

    if (this.type === 'consumable') {
      data.subtypes = {
        [constants.CONSUMABLE_TYPE.REGULAR]: 'SWADE.ConsumableType.Regular',
        [constants.CONSUMABLE_TYPE.MAGAZINE]: 'SWADE.ReloadType.Magazine',
        [constants.CONSUMABLE_TYPE.BATTERY]: 'SWADE.ReloadType.Battery',
      };
    }

    if (
      [
        'consumable',
        'gear',
        'shield',
        'armor',
        'action',
        'power',
        'weapon',
      ].includes(this.type)
    ) {
      data.bonusDamageDieSideOptions = getDieSidesRange(4, 12);
    }

    if (this.item.type === 'hindrance') {
      data.severityOptions = {
        major: 'SWADE.HindranceSeverity.Major',
        minor: 'SWADE.HindranceSeverity.Minor',
        either: 'SWADE.HindranceSeverity.Either',
      };
    }

    if (this.item.type === 'skill') {
      data.dieSideOptions =
        this.item.parent?.type === 'npc'
          ? getDieSidesRange(4, 24)
          : getDieSidesRange(4, 20);
      data.wildDieSideOptions = getDieSidesRange(4, 12);
      data.attributeOptions = this.#getAttributeOptions();
    }

    if (this.item.isArcaneDevice) {
      data.embeddedPowers = this.item.embeddedPowers;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [key, power] of data.embeddedPowers!) {
        power.enrichedDescription = await this.#enrichText(
          power.system.description,
        );
      }
      data.dieSideOptions =
        this.item.parent?.type === 'npc'
          ? getDieSidesRange(4, 24)
          : getDieSidesRange(4, 20);
    }
    const superData = (await super.getData(options)) as Record<string, unknown>;
    superData.cssClass += ' ' + this.type; // add the item type for easier CSS selection

    return foundry.utils.mergeObject(superData, data);
  }

  protected override _getHeaderButtons() {
    const buttons = super._getHeaderButtons();

    if (this.isEditable) {
      buttons.unshift({
        label: 'SWADE.DocumentTweaks',
        class: 'configure-actor',
        icon: 'fa-solid fa-gears',
        onclick: () =>
          new SwadeItemTweaks({ document: this.item }).render({ force: true }),
      });
      buttons.unshift({
        label: 'SWADE.RefreshOnly',
        class: 'refresh-item',
        icon: 'fa-solid fa-arrows-rotate',
        onclick: () => this.item.refreshFromCompendium(),
      });
    }

    return buttons;
  }

  protected override _getSubmitData(updateData: AnyObject = {}) {
    const data = super._getSubmitData(updateData);
    if (this.item.type !== 'skill') {
      // Prevent submitting overridden values
      const overrides = foundry.utils.flattenObject(this.item.overrides);
      Object.keys(overrides).forEach((v) => delete data[v]);
    }
    return data;
  }

  protected override _canDragStart(_selector: string): boolean {
    return this.isEditable;
  }

  protected override _canDragDrop(_selector: string): boolean {
    return this.isEditable;
  }

  protected override async _onDragStart(event: DragEvent) {
    const src = event.target as HTMLElement;

    // Create drag data
    let dragData;

    // Active Effect
    if (src.dataset.effectId) {
      const effect = this.item.effects.get(src.dataset.effectId);
      dragData = effect.toDragData();
    } else {
      dragData = this.item.toDragData();
    }

    // Set data transfer
    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
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
          await this.#onDropActiveEffect(event, data);
          break;
        case 'Item':
          await this.#onDropItem(event, data);
          break;
        case 'Macro':
          await this.#onDropMacro(event, data);
          break;
        default:
          break;
      }
    } catch (error) {
      Logger.error(error);
    }
  }

  async #onDropActiveEffect(_event: DragEvent, data) {
    const effect = await CONFIG.ActiveEffect.documentClass.fromDropData(data);
    if (!this.item.isOwner || !effect) return false;
    if (this.item.uuid === effect.parent?.uuid) return false;
    return CONFIG.ActiveEffect.documentClass.create(effect.toObject(), {
      parent: this.item,
    });
  }

  async #onDropItem(event: DragEvent, data) {
    const item = await CONFIG.Item.documentClass.fromDropData(data);
    Logger.debug(
      `Trying to add ${data.type} ${item.uuid} to ${this.item.type}/${this.item.name}`,
    );

    if (item.type === 'ability' && item.system.subtype !== 'special') {
      return Logger.warn('SWADE.CannotAddAncestryToAncestry', {
        localize: true,
        toast: true,
      });
    }

    const target = event.target as HTMLElement;
    const classList = target.closest<HTMLElement>('.tab.active')?.classList;

    if (classList?.contains('properties')) {
      await this.#addGrantedItem(item);
    } else if (classList?.contains('powers')) {
      await this.#addArcaneDevicePower(item);
    } else if (classList?.contains('actions')) {
      await this.#addOrReplaceActions(item);
    }
  }

  async #onDropMacro(event: DragEvent, data) {
    const target = event.target as HTMLElement;
    const actionId = target.closest<HTMLElement>('.tab.actions.active .action')
      ?.dataset.actionId as string;
    const action = this.item.system.actions.additional[actionId] as ItemAction;
    if (action.type !== constants.ACTION_TYPE.MACRO) return;
    await this.item.update({
      [`system.actions.additional.${actionId}.uuid`]: data.uuid,
    });
  }

  async #addGrantedItem(item: SwadeItem) {
    if (
      !this.item.canGrantItems ||
      this.item.isEmbedded ||
      item.uuid === this.item.uuid
    )
      return;

    const grants = this.item.grantsItems;
    grants.push({
      name: item.name,
      img: item.img,
      uuid: item.uuid,
    });
    await this.item.update({ 'system.grants': grants });
  }

  async #addArcaneDevicePower(item: SwadeItem) {
    if (!this.item.isArcaneDevice || item.type !== 'power') return;
    const collection = this.item.embeddedPowers;
    collection.set(foundry.utils.randomID(), item.toObject());
    await this.#saveEmbeddedPowers(collection);
  }

  async #addOrReplaceActions(item: SwadeItem) {
    const actionKey = 'system.actions.additional';
    const actions = foundry.utils.getProperty(this.item, actionKey) as
      | ItemActions
      | undefined;
    if (typeof actions === 'undefined') return; //no actions on this item, return before we break something;
    if (foundry.utils.isEmpty(actions)) {
      //if no actions are present then we simply copy the actions from the dropped item
      return this.item.update({
        [actionKey]: foundry.utils.getProperty(item, actionKey),
      });
    }
    //otherwise we ask to copy or replace the current actions
    const existingActions = foundry.utils.getProperty(
      item,
      actionKey,
    ) as ItemActions;
    foundry.applications.api.DialogV2.wait({
      window: {
        title: game.i18n.localize('SWADE.AddOrReplaceActions.Title'),
      },
      classes: ['dialog', 'swade-app'],
      content: game.i18n.format('SWADE.AddOrReplaceActions.Content', {
        source: item.name,
        type: game.i18n.localize('TYPES.Item.' + item.type),
      }),
      buttons: [
        {
          action: 'add',
          label: game.i18n.localize('SWADE.AddOrReplaceActions.Add'),
          icon: '<i class="fa-solid fa-copy"></i>',
          default: true,
          callback: () => {
            const newActions: ItemActions = {};
            //give the actions new keys to make sure there are no id collisions
            for (const action of Object.values(existingActions)) {
              newActions[foundry.utils.randomID(8)] = action;
            }
            this.item.update({ [actionKey]: newActions });
          },
        },
        {
          action: 'replace',
          label: game.i18n.localize('SWADE.AddOrReplaceActions.Replace'),
          icon: '<i class="fa-solid fa-rotate"></i>',
          callback: () =>
            this.item.update(
              { [actionKey]: existingActions },
              { recursive: false, diff: false },
            ),
        },
      ],
    });
  }

  async #deleteEmbeddedDocument(id: string) {
    const flagContent = this.item.getFlag('swade', 'embeddedPowers') ?? [];
    const map = new Map(flagContent as Array<[string, ItemData]>);
    map.delete(id);
    this.item.setFlag('swade', 'embeddedPowers', Array.from(map));
  }

  async #saveEmbeddedPowers(map: Map<string, ItemData<'power'>>) {
    return this.item.setFlag('swade', 'embeddedPowers', Array.from(map));
  }

  #getAdditionalStats(): AdditionalStats {
    const stats = foundry.utils.deepClone(
      this.item.system.additionalStats,
    ) as AdditionalStats;
    const options = game.settings.get('swade', 'settingFields').item;
    for (const [key, attr] of Object.entries(stats)) {
      if (!options[key] || !attr.dtype) {
        delete stats[key];
        continue;
      }
      if (attr.dtype === 'Selection') {
        const optionString = options[key].optionString ?? '';
        attr.options = optionString
          .split(';')
          .reduce((a, v) => ({ ...a, [v.trim()]: v.trim() }), {});
      }
    }
    return stats;
  }

  #getGrantedItems(): ItemGrant[] {
    if (!this.item.canGrantItems) return [];
    const grants = this.item.grantsItems;
    const enriched = new Array<ItemGrant>();
    for (const grant of grants) {
      const item = fromUuidSync(grant.uuid) as SwadeItem | null;
      enriched.push({
        name: grant.mutation?.name ?? item?.name ?? grant.name,
        img: grant.mutation?.img ?? item?.img ?? grant.img,
        uuid: grant.uuid,
        missing: !item,
        major:
          foundry.utils.getProperty(grant.mutation, 'system.major') ??
          foundry.utils.getProperty(item, 'system.isMajor'),
      });
    }
    return enriched;
  }

  #getGrantOnTriggers(): Record<number, string>[] {
    const options = [
      { key: 0, label: 'SWADE.ItemEquipStatus.Added' },
      { key: 1, label: 'SWADE.ItemEquipStatus.Carried' },
      { key: 2, label: 'SWADE.ItemEquipStatus.Readied' },
    ];
    return this.item.type === 'consumable' ? options.slice(0, 2) : options;
  }
  #getAbilitySubtypeOptions(
    abilityLocalization: typeof SWADE.abilitySheet,
  ): Record<string, string> {
    return {
      special: abilityLocalization.special.dropdown,
      archetype: abilityLocalization.archetype.dropdown,
    };
  }
  #getItemType(): string {
    if (this.type === 'ability') {
      const subtype = this.item.system.subtype;
      switch (subtype) {
        case constants.ABILITY_TYPE.ARCHETYPE:
          return SWADE.abilitySheet.archetype.dropdown;
        default:
          return SWADE.abilitySheet.special.dropdown;
      }
    }
    return `TYPES.Item.${this.type}`;
  }

  #getAttributeOptions(): Record<string, string> {
    return {
      agility: 'SWADE.AttrAgi',
      smarts: 'SWADE.AttrSma',
      spirit: 'SWADE.AttrSpr',
      strength: 'SWADE.AttrStr',
      vigor: 'SWADE.AttrVig',
      '': '',
    };
  }
  async #enrichText(text: string): Promise<string> {
    const enriched =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(text, {
        relativeTo: this.item,
        rollData: this.item.getRollData(),
        secrets: this.document.isOwner,
      });
    return enriched;
  }

  #setupAccordions() {
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

    this.form
      ?.querySelectorAll<HTMLDetailsElement>('.effect-list details')
      .forEach((el) => {
        new Accordion(el, '.content', { duration: 200 });
        const id = el.dataset.effectId as string;
        el.querySelector('summary')?.addEventListener('click', () => {
          const states = this.collapsibleStates.effects;
          const currentState = Boolean(states[id]);
          states[id] = !currentState;
        });
      });
  }

  #setupEffectCreateMenu(html: HTMLElement) {
    this.#effectCreateDropDown =
      new foundry.applications.ux.ContextMenu.implementation(
        html,
        '.effects .header',
        [
          {
            name: 'SWADE.ActiveEffects.AddGuided',
            icon: '<i class="fa-solid fa-hat-wizard"></i>',
            condition: this.object.isOwner,
            callback: () =>
              new ActiveEffectWizard({ document: this.document }).render({
                force: true,
              }),
          },
          {
            name: 'SWADE.ActiveEffects.AddModifier',
            icon: '<i class="fa-solid fa-bolt"></i>',
            condition: this.object.isOwner,
            callback: () => this.#createActiveEffect('modifier'),
          },
          {
            name: 'SWADE.ActiveEffects.AddUnguided',
            icon: '<i class="fa-solid fa-file-plus"></i>',
            condition: this.object.isOwner,
            callback: () => this.#createActiveEffect('base'),
          },
        ],
        {
          eventName: 'click',
          jQuery: false,
        },
      );
  }

  async #createActiveEffect(type: ActiveEffect.SubType) {
    const name = SwadeActiveEffect.defaultName({ type, parent: this.item });
    return ActiveEffect.create(
      { name, type },
      { parent: this.item, renderSheet: true },
    );
  }

  #toggleEffect(
    doc: SwadeActiveEffect,
    toggle: string,
  ): Record<string, unknown> {
    const oldVal = !!foundry.utils.getProperty(doc, toggle);
    return { [toggle]: !oldVal };
  }

  #rangeSuggestions() {
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

  #equipStatusOptions(): Record<number, string> {
    let states: Record<number, string> = {
      [constants.EQUIP_STATE.STORED]: 'SWADE.ItemEquipStatus.Stored',
      [constants.EQUIP_STATE.CARRIED]: 'SWADE.ItemEquipStatus.Carried',
    };

    if (this.item.type === 'weapon') {
      if (this.item.system.isVehicular && this.actor?.type === 'vehicle') {
        states = {
          ...states,
          [constants.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Installed',
        };
      } else {
        states = {
          ...states,
          [constants.EQUIP_STATE.MAIN_HAND]: 'SWADE.ItemEquipStatus.MainHand',
          [constants.EQUIP_STATE.OFF_HAND]: 'SWADE.ItemEquipStatus.OffHand',
          [constants.EQUIP_STATE.TWO_HANDS]: 'SWADE.ItemEquipStatus.TwoHands',
        };
      }
    } else if (this.item.type === 'armor' || this.item.type === 'shield') {
      states = {
        ...states,
        [constants.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Equipped',
      };
    } else if (this.item.type === 'gear') {
      if (this.item.system.equippable) {
        states = {
          ...states,
          [constants.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Equipped',
        };
      } else if (this.item.system.isVehicular) {
        states = {
          ...states,
          [constants.EQUIP_STATE.EQUIPPED]: 'SWADE.ItemEquipStatus.Installed',
        };
      }
    }
    return states;
  }

  #trademarkWeaponOptions(): Record<number, string> {
    return {
      0: 'SWADE.TrademarkWeapon.None',
      1: 'SWADE.TrademarkWeapon.Regular',
      2: 'SWADE.TrademarkWeapon.Improved',
    };
  }

  #reloadTypeOptions(): Record<string, string> {
    return {
      [constants.RELOAD_TYPE.NONE]: 'SWADE.ReloadType.None',
      [constants.RELOAD_TYPE.SELF]: 'SWADE.ReloadType.Self',
      [constants.RELOAD_TYPE.SINGLE]: 'SWADE.ReloadType.Single',
      [constants.RELOAD_TYPE.FULL]: 'SWADE.ReloadType.Full',
      [constants.RELOAD_TYPE.MAGAZINE]: 'SWADE.ReloadType.Magazine',
      [constants.RELOAD_TYPE.BATTERY]: 'SWADE.ReloadType.Battery',
      [constants.RELOAD_TYPE.PP]: 'SWADE.ReloadType.PP',
    };
  }
}

interface SwadeItemSheetData extends OptionsPartial {
  itemType: string;
  hasInlineDelete: boolean;
  isPhysicalItem: boolean;
  hasCategory: boolean;
  actionTypes: Record<string, string>;
  macroActorTypes: Record<string, string>;
  hasAdditionalStats: boolean;
  additionalStats: AdditionalStats;
  collapsibleStates: CollapsibleStates;
  showMods: boolean;
  showEnergy: boolean;
  isArcaneDevice: boolean;
  enrichedDescription: string;
  settingRules: {
    modSlots: boolean;
    noPowerPoints: boolean;
  };
  equipStatusOptions: Record<EquipState, string>;
  ranges: string[];
  trademarkWeaponOptions?: Record<number, string>;
  reloadTypeOptions?: Record<number, string>;
  embeddedPowers?: Map<string, ItemData<'power'>>;
  ammoList?: string[];
  ammoLoaded?: string;
  ppReload?: boolean;
  abilityConfig?: {
    localization: typeof SWADE.abilitySheet;
    abilityHeader: string;
    isArchetype: boolean;
  };
  abilitySubtypeOptions: Record<string, string>;
  dieSides;
  subtypes?: Record<string, string>;
  grantedItems?: ItemGrant[];
  severityOptions?: Record<string, string>;
  rangeTypeOptions?: Record<number, string>;
  grantOnTriggers?: Record<number, string>[];
  attributeOptions?: Record<string, string>;
  dieSideOptions?: DieSidesOption[];
  wildDieSideOptions?: DieSidesOption[];
  bonusDamageDieSideOptions?: DieSidesOption[];
}

type OptionsPartial = Partial<DocumentSheet.Options<Item>>;

interface CollapsibleStates {
  actions: Record<string, boolean>;
  powers: Record<string, boolean>;
  effects: Record<string, boolean>;
}
