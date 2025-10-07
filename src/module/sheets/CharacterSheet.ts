import { DeepPartial } from 'fvtt-types/utils';
import {
  AdditionalStats,
  Attribute,
  DieSidesOption,
  LinkedAttribute,
  SwadeApplicationTab,
} from '../../globals';
import { Advance } from '../../interfaces/Advance.interface';
import {
  ItemAction,
  RollModifier,
} from '../../interfaces/additional.interface';
import ItemChatCardHelper from '../ItemChatCardHelper';
import ActiveEffectWizard from '../apps/ActiveEffectWizard';
import { AdvanceEditor } from '../apps/AdvanceEditor';
import AttributeManager from '../apps/AttributeManager';
import { SwadeActorTweaks } from '../apps/SwadeDocumentTweaks';
import SwadeMeasuredTemplate from '../canvas/SwadeMeasuredTemplate';
import { SWADE } from '../config';
import { constants } from '../constants';
import { ActionData } from '../data/item';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';
import SwadeItem from '../documents/item/SwadeItem';
import { Accordion } from '../style/Accordion';
import * as util from '../util';
import { SwadeActorSheetV2 } from './SwadeActorSheetV2';

export default class CharacterSheet extends SwadeActorSheetV2<CharacterSheetRenderContext> {
  _equipStateMenu: ContextMenu<false>;
  _effectCreateDropDown: ContextMenu<false>;
  _accordions: Record<string, { object: Accordion; open: boolean }> = {};

  static override DEFAULT_OPTIONS = {
    classes: ['swade-application', 'swade-official'],
    position: {
      width: 650,
      height: 700,
    },
    window: {
      resizable: true
    },
    actions: {
      toggleStatusEffect: CharacterSheet._toggleStatusEffect,
      toggleConviction: CharacterSheet.#toggleConviction,
      displayAdvances: CharacterSheet.#displayAdvances,
      rollAttribute: CharacterSheet.#rollAttribute,
      displayAttributeManager: CharacterSheet.#displayAttributeManager,
      rollSkill: CharacterSheet.#rollSkill,
      rollRunningDie: CharacterSheet.#rollRunningDie,
      rollDamage: CharacterSheet.#rollDamage,
      rollWealthDie: CharacterSheet.#rollWealthDie,
      useConsumable: CharacterSheet.#useConsumable,
      openEffectOrigin: CharacterSheet.#openEffectOrigin,
      displayModifierDialog: CharacterSheet.#displayModifierDialog,
      editAdvance: CharacterSheet.#advanceAction,
      deleteAdvance: CharacterSheet.#advanceAction,
      togglePlannedAdvance: CharacterSheet.#advanceAction,
      adjustCounter: CharacterSheet._handleCounterAdjust,
      openAncestryArchetype: CharacterSheet.#openAncestryArchetype,
      addAdvance: CharacterSheet.#addAdvance,
      createFavorite: CharacterSheet.#createFavorite
    }
  };

  static override PARTS = {
    header: { template: 'systems/swade/templates/actors/character/header.hbs' },
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    summary: { template: 'systems/swade/templates/actors/character/tabs/summary.hbs', scrollable: [''] },
    edges: { template: 'systems/swade/templates/actors/character/tabs/edges.hbs', scrollable: [''] },
    inventory: { template: 'systems/swade/templates/actors/character/tabs/inventory.hbs', scrollable: [''] },
    powers: { template: 'systems/swade/templates/actors/character/tabs/powers.hbs', scrollable: [''] },
    effects: { template: 'systems/swade/templates/actors/character/tabs/effects.hbs', scrollable: [''] },
    actions: { template: 'systems/swade/templates/actors/character/tabs/actions.hbs', scrollable: [''] },
    about: { template: 'systems/swade/templates/actors/character/tabs/about.hbs', scrollable: [''] },
    limited: { template: 'systems/swade/templates/actors/character/limited.hbs' }
  };

  static override TABS: Record<string, Partial<SwadeApplicationTab>> = {
    summary: {
      id: 'summary',
      group: 'primary',
      label: 'SWADE.Summary',
      cssClass: 'item',
      tabCssClass: 'gridcell sheet-body'
    },
    edges: {
      id: 'edges',
      group: 'primary',
      label: 'SWADE.EdgesHindrances',
      cssClass: 'item',
      tabCssClass: 'gridcell sheet-body'
    },
    inventory: {
      id: 'inventory',
      group: 'primary',
      label: 'SWADE.Inv',
      cssClass: 'item',
      tabCssClass: 'gridcell sheet-body'
    },
    powers: {
      id: 'powers',
      group: 'primary',
      label: 'SWADE.Pow',
      cssClass: 'item',
      tabCssClass: 'gridcell sheet-body'
    },
    effects: {
      id: 'effects',
      group: 'primary',
      label: 'SWADE.Effects',
      cssClass: 'item',
      tabCssClass: 'gridcell sheet-body'
    },
    actions: {
      id: 'actions',
      group: 'primary',
      label: 'SWADE.Actions.Name',
      cssClass: 'item',
      tabCssClass: 'gridcell sheet-body'
    },
    about: {
      id: 'about',
      group: 'primary',
      label: 'SWADE.About',
      cssClass: 'item',
      tabCssClass: 'gridcell sheet-body'
    },
    advances: {
      id: 'advances',
      group: 'about',
      label: 'SWADE.Adv',
      cssClass: 'item'
    },
    background: {
      id: 'background',
      group: 'about',
      label: 'SWADE.Background',
      cssClass: 'item'
    },
    notes: {
      id: 'notes',
      group: 'about',
      label: 'SWADE.Notes',
      cssClass: 'item'
    }
  };

  override tabGroups = {
    primary: 'summary',
    about: 'advances'
  };

  override _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    const defaultWidth = game.settings.get('swade', 'charSheetDefaultWidth');
    if (defaultWidth) foundry.utils.setProperty(options, 'position.width', defaultWidth);
    return options;
  }

  protected override _configureRenderOptions(options): void {
    super._configureRenderOptions(options);
    if (this.document.limited) {
      options.parts = ['limited'];
    } else {
      options.parts.findSplice(i => i === 'limited');
    }
  }

  override async _onRender(
    context: CharacterSheetRenderContext,
    options: DeepPartial<foundry.applications.api.DocumentSheet.RenderOptions>
  ) {
    await super._onRender(context, options);

    // TODO: Can this be done cleaner?
    this.#disableOverrides(this.form!);

    this.element
      .querySelector('[name="system.details.currency"]')
      ?.addEventListener('change', this._onChangeInputDelta.bind(this));

    this.element.querySelectorAll('li.item, .attribute').forEach((el) => {
      // Add draggable attribute and dragstart listener.
      el.draggable = true;
      el.addEventListener('dragstart', this._onDragStart.bind(this), false);
    });

    // Item Action Buttons
    // TODO: This one's tough since we intentionally support arbitrary `data-action` values
    this.element
      .querySelectorAll('.card-buttons button')
      .forEach((el) =>
        el.addEventListener('click', this._handleItemActions.bind(this)),
      );

    this.element.querySelectorAll('input').forEach((el) => {
      el.addEventListener('focus', (ev) => ev.currentTarget.select());
      el.addEventListener('keypress', (ev: KeyboardEvent) => {
        const targetIsButton = 'button' === ev?.target?.type;
        if (!targetIsButton && ev.key === 'Enter') {
          ev.preventDefault();
          this.submit({ preventClose: true });
          return false;
        }
      });
    });

    // TODO: Could just make these normal tooltips, though they'd not be instant
    this.element
      .querySelector('.stat.size input')
      ?.addEventListener('mouseenter', (event) => {
        game.tooltip.deactivate();
        game.tooltip.activate(event.target as HTMLElement, {
          html: this.actor.system.getSizeTooltip(),
          cssClass: 'themed theme-dark',
        });
      });

    this.element
      .querySelector('.stat.pace input')
      ?.addEventListener('mouseenter', (event) => {
        game.tooltip.deactivate();
        game.tooltip.activate(event.target as HTMLElement, {
          html: this.actor.system.getPaceTooltip(),
          cssClass: 'themed theme-dark',
        });
      });

    // TODO: This without accordions, maybe
    this.#setupAccordions(this.form!);
  }

  override async _onFirstRender(
    context: CharacterSheetRenderContext,
    options: DeepPartial<foundry.applications.api.DocumentSheet.RenderOptions>
  ) {
    await super._onFirstRender(context, options);

    // TODO: This is just undoing the direct parent _onFirstRender
    const collapsibles = this.element.querySelectorAll('details');
    for (const details of collapsibles) {
      details.open = false;
    }

    this.#setupEquipStatusMenu(this.element);
    this.#setupEffectCreateMenu(this.element);
    this.#setupItemContextMenu(this.element);
  }

  override async _prepareContext(options): Promise<CharacterSheetRenderContext> {
    const origContext = await super._prepareContext(options);

    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    const hiddenActionOverride = this.actor.getFlag(
      'swade',
      'hiddenActionOverride',
    );
    const itemTypes: Record<string, SwadeItem[]> = {};
    for (const item of origContext.items) {
      // Basic template rendering data
      const system = item.system;
      const type = item.type;
      itemTypes[type] ??= [];
      if (
        !(system instanceof ActionData) ||
        !item.system.hidden ||
        hiddenActionOverride
      ) {
        itemTypes[type].push(item);
      }
      const itemActions =
        foundry.utils.getProperty(system, 'actions.additional') ?? {};
      const actions = new Array<any>();

      for (const action in itemActions) {
        actions.push({
          key: action,
          type: itemActions[action].type,
          name: itemActions[action].name,
        });
      }
      const hasDamage =
        !!foundry.utils.getProperty(system, 'damage') ||
        actions.some((a) => a.type === constants.ACTION_TYPE.DAMAGE);
      const hasTraitRoll =
        !!foundry.utils.getProperty(system, 'actions.trait') ||
        actions.some((a) => a.type === constants.ACTION_TYPE.TRAIT);
      const hasMacros = actions.some(
        (a) => a.type === constants.ACTION_TYPE.MACRO,
      );
      const hasAmmoManagement =
        ammoManagement &&
        type === 'weapon' &&
        !item.isMeleeWeapon &&
        system.reloadType !== constants.RELOAD_TYPE.NONE;
      const hasReloadButton =
        ammoManagement &&
        system.shots > 0 &&
        system.reloadType !== constants.RELOAD_TYPE.NONE &&
        system.reloadType !== constants.RELOAD_TYPE.SELF;

      const itemEnrichmentOptions: Partial<TextEditor.EnrichmentOptions> = {
        relativeTo: item,
        rollData: item.getRollData(),
        secrets: this.document.isOwner,
      };

      const enrichedDescription =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          item.system.description,
          itemEnrichmentOptions,
        );

      const enrichedNotes =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          item.system.notes as string,
          itemEnrichmentOptions,
        );

      foundry.utils.setProperty(item, 'actions', actions);
      foundry.utils.setProperty(item, 'hasDamage', hasDamage);
      foundry.utils.setProperty(item, 'hasTraitRoll', hasTraitRoll);
      foundry.utils.setProperty(item, 'hasAmmoManagement', hasAmmoManagement);
      foundry.utils.setProperty(item, 'hasReloadButton', hasReloadButton);
      foundry.utils.setProperty(item, 'hasMacros', hasMacros);
      foundry.utils.setProperty(
        item,
        'enrichedDescription',
        enrichedDescription,
      );
      foundry.utils.setProperty(item, 'enrichedNotes', enrichedNotes);
      if (type === 'power')
        foundry.utils.setProperty(item, 'powerPoints', item.powerPointObject);
    }

    const additionalStats = this.#getAdditionalStats();

    const context: CharacterSheetRenderContext = foundry.utils.mergeObject(origContext, {
      additionalStats: additionalStats,
      advances: {
        expanded: this.actor.system.advances.mode === 'expanded',
        list: await this.#getAdvances(),
      },
      armorTooltip: this.actor.getArmorTooltip(),
      bennyImageURL: game.settings.get('swade', 'bennyImageSheet'),
      currentBennies: Array.fromRange(this.actor.bennies, 1),
      enrichedText: await this._getEnrichedText(),
      hasAdditionalStats: !foundry.utils.isEmpty(additionalStats),
      itemTypes: itemTypes,
      parryTooltip: this.actor.getPTTooltip('parry'),
      powers: this.#getPowers(),
      settingrules: {
        conviction: game.settings.get('swade', 'enableConviction'),
        noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
        wealthType: game.settings.get('swade', 'wealthType'),
        currencyName: game.settings.get('swade', 'currencyName'),
        weightUnit:
          game.settings.get('swade', 'weightUnit') === 'imperial'
            ? 'lbs'
            : 'kg',
      },
      sheetEffects: await this._getEffects(),
      skills: await this.#getSkillsForDisplay(),
      toughnessTooltip: this.actor.getPTTooltip('toughness'),
      useAttributeShorts: game.settings.get('swade', 'useAttributeShorts'),
      // Putting this at the end because of race condition for grandchild updates
      attributes: this.#getAttributesForDisplay(),
      wealthDieTypes: this.#getWealthDieTypes(),
    });
    
    return context;
  }

  override async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (partId in context.tabs) context.tab = context.tabs[partId];
    // TODO: Un-grossify this
    if (partId === 'about') {
      context.subtabs = Object.fromEntries(Object.entries(this._getTabs()).filter(i => i[1].group === 'about'));
    }
    if (partId === 'tabs') {
      const tabEntries = Object.entries(context.tabs).filter(i => i[1].group === 'primary');
      if (!this.actor.hasPowers && !this.actor.hasArcaneBackground) {
        tabEntries.findSplice(i => i[0] === 'powers');
      }
      context.tabs = Object.fromEntries(tabEntries);

    }
    return context;
  }

  // TODO: Nuke accordions?
  override async render(...args): Promise<this> {
    await super.render(...args);
    for (const accordion of Object.values(this._accordions)) {
      if (accordion.open && accordion.object.el) {
        await this.#onOpenAccordion(accordion.object.el);
        accordion.object.el.open = true;
      }
    }
    return this;
  }

  protected override _onDragStart(event: DragEvent): void {
    const currentTarget = event.currentTarget as HTMLElement;
    if (currentTarget.classList.contains('attribute')) {
      return this._onDragAttribute(event);
    }
    super._onDragStart(event);
  }

  protected _onDragAttribute(event: DragEvent) {
    const btn = (event.currentTarget as HTMLElement).querySelector('button');
    event.dataTransfer?.setData(
      'text/plain',
      JSON.stringify({
        type: 'Attribute',
        uuid: this.actor.uuid,
        attribute: btn?.dataset.attribute as Attribute,
      }),
    );
  }

  protected override async _onDropItem(
    event: DragEvent,
    data: ActorSheet.DropData.Item,
  ): Promise<Item[] | boolean> {
    if (!this.actor.isOwner) return false;
    const item = (await Item.fromDropData(data)) as SwadeItem;
    if (!item) return false;

    const itemData = item.toObject();

    //handle relative item sorting
    if (this.actor.uuid === item.parent?.uuid) {
      return this._onSortItem(event, itemData) as Promise<SwadeItem[]>;
    }

    //handle keyboard modifiers on drop for physical items.
    if (item.isPhysicalItem) {
      this._handleDropModifierKeys(event, itemData);
    }

    return this._onDropItemCreate(itemData);
  }

  protected override async _onDropItemCreate(
    itemData: Item['_source'][] | Item['_source'],
  ): Promise<Item.Implementation[]> {
    const items = await super._onDropItemCreate(itemData);
    const typesToRender = ['power', 'skill'];
    for (const item of items) {
      if (typesToRender.includes(item.type)) item.sheet?.render({ force: true });
    }
    return items;
  }

  protected _handleDropModifierKeys(event: DragEvent, item: Item.CreateData) {
    const key = 'system.equipStatus';
    if (event.shiftKey) {
      if (item.type === 'weapon') {
        foundry.utils.setProperty(item, key, constants.EQUIP_STATE.MAIN_HAND);
      } else if (foundry.utils.getProperty(item, 'system.equippable')) {
        foundry.utils.setProperty(item, key, constants.EQUIP_STATE.EQUIPPED);
      }
    } else if (event.ctrlKey) {
      foundry.utils.setProperty(item, key, constants.EQUIP_STATE.CARRIED);
    } else if (event.altKey) {
      foundry.utils.setProperty(item, key, constants.EQUIP_STATE.STORED);
    }
  }

  /** Extend and override the sheet header buttons */
  protected override _getHeaderControls() {
    let controls = super._getHeaderControls();

    // Document Tweaks
    if (this.options.editable && this.actor.isOwner) {
      const tweaks: foundry.applications.api.Application.HeaderControlsEntry = {
        label: game.i18n.localize('SWADE.Tweaks'),
        icon: 'fa-solid fa-gears',
        onClick: () =>
          new SwadeActorTweaks({ document: this.actor }).render({
            force: true,
          }),
      };

      controls = [tweaks, ...controls];
    }
    return controls;
  }

  static async #openEffectOrigin(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ) {
    const effectId = target.closest('.effect')!.dataset.effectId as string;
    const sourceId = target.closest('.effect')!.dataset.parentId as string;
    const sourceItem = this.actor.items.get(sourceId)!;
    const effect = sourceId
      ? (sourceItem.effects.get(effectId) as SwadeActiveEffect)
      : (this.actor.effects.get(effectId) as SwadeActiveEffect);
    if (!effect || !sourceItem) return;
    sourceItem.sheet?.render({ force: true });
  }

  static async #openAncestryArchetype(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ) {
    const id = target.dataset.itemId as string;
    this.actor.items.get(id)?.sheet?.render({ force: true });
  }

  static async #advanceAction(
    this: CharacterSheet,
    _event: PointerEvent,
    target: HTMLElement
  ) {
    const id = target.closest('li.advance')?.dataset.advanceId;
    switch (target.dataset.action) {
      case 'editAdvance':
        new AdvanceEditor({
          advance: this.actor.system.advances.list.get(id, {
            strict: true,
          }),
          actor: this.actor,
        }).render({ force: true });
        break;
      case 'deleteAdvance':
        await this.#deleteAdvance(id);
        break;
      case 'togglePlannedAdvance':
        await this.#toggleAdvancePlanned(id);
        break;
      default:
        throw new Error(`Action ${target.dataset.action} not supported`);
    }
  }

  protected async _createActiveEffect(
    data: ActiveEffect.CreateData = {},
    renderSheet = true,
  ) {
    if (!data.name?.length) data.name = game.i18n.format('DOCUMENT.New', {
      type: game.i18n.localize('DOCUMENT.ActiveEffect'),
    });
    return getDocumentClass('ActiveEffect').create(data, {
      renderSheet: renderSheet,
      parent: this.actor,
    });
  }

  protected async _getEnrichedText(): Promise<
    CharacterSheetRenderContext['enrichedText']
  > {
    return {
      appearance: await this.#enrichText(this.actor.system.details.appearance),
      goals: await this.#enrichText(this.actor.system.details.goals),
      biography: await this.#enrichText(
        this.actor.system.details.biography.value,
      ),
      notes: await this.#enrichText(this.actor.system.details.notes),
      advances: await this.#enrichText(this.actor.system.advances.details),
    };
  }

  protected async _getEffects() {
    const temporary = new Array<SheetEffect>();
    const permanent = new Array<SheetEffect>();
    const favorite = new Array<SheetEffect>();
    for (const effect of this.actor.allApplicableEffects()) {
      const val: SheetEffect = {
        id: effect.id!,
        name: effect.name,
        img: effect.img,
        disabled: effect.disabled,
        description: effect.description,
        favorite: effect.system.favorite ?? false,
      };
      if (effect.parent !== this.actor) {
        val.origin = effect.sourceName; // legacy inclusion to maintain NPC/Vehicle sheets until they can be upgraded
        val.source = {
          // modern character sheet style supporting v11 non-transferred Active Effects
          name: effect.parent.name,
          id: effect.parent.id,
        };
      }
      if (effect.isTemporary) {
        if (effect.duration.type === 'turns') {
          val.duration = {
            expiration: effect.expirationText, // constants.STATUS_EFFECT_EXPIRATION
            rounds: effect.duration.rounds,
            startRound: effect.duration.startRound,
            startTurn: effect.duration.startTurn,
            remaining: effect.duration.remaining,
            label: effect.duration.label,
          };
        }
        temporary.push(val);
      } else {
        permanent.push(val);
      }
      if (val.favorite) {
        val.tooltip = val.hasOwnProperty('source')
          ? game.i18n.localize('SWADE.ActiveEffects.Source') +
            ': ' +
            val.source!.name
          : '';
        favorite.push(val);
      }
    }
    return { temporary, permanent, favorite };
  }

  protected async _handleItemActions(ev: PointerEvent) {
    const button = ev.currentTarget as HTMLButtonElement;
    const action = button.dataset.action!;
    const itemId = button.closest('.chat-card.item-card')?.dataset.itemId;
    const item = this.actor.items.get(itemId, { strict: true });
    const additionalMods = new Array<RollModifier>();
    const ppToAdjust = button
      .closest('.chat-card.item-card')
      ?.querySelector('input.pp-adjust')?.value as string;
    const arcaneDevicePPToAdjust = button
      .closest('.chat-card.item-card')
      ?.querySelector('input.arcane-device-pp-adjust')?.value as string;

    //if it's a power and the No Power Points rule is in effect
    if (item.type === 'power' && game.settings.get('swade', 'noPowerPoints')) {
      let modifier = Math.ceil(parseInt(ppToAdjust, 10) / 2);
      modifier = Math.min(modifier * -1, modifier);
      const actionObj = foundry.utils.getProperty(
        item,
        `system.actions.additional.${action}.traitOverride`,
      ) as ItemAction;
      //filter down further to make sure we only apply the penalty to a trait roll
      if (
        action === 'formula' ||
        actionObj?.type === constants.ACTION_TYPE.TRAIT
      ) {
        additionalMods.push({
          label: game.i18n.localize('TYPES.Item.power'),
          value: util.signedNumberString(modifier),
        });
      }
    } else if (action === 'pp-adjust') {
      //handle Power Item Card PP adjustment
      const adjustment = button.getAttribute('data-adjust') as string;
      const power = this.actor.items.get(itemId, { strict: true });
      const arcane =
        foundry.utils.getProperty(power, 'system.arcane') || 'general';
      const key = `system.powerPoints.${arcane}.value`;
      let newPP = foundry.utils.getProperty(this.actor, key) as number;
      if (adjustment === 'plus') {
        newPP += parseInt(ppToAdjust, 10);
      } else if (adjustment === 'minus') {
        newPP -= parseInt(ppToAdjust, 10);
      }
      await this.actor.update({ [key]: newPP });
    } else if (action === 'arcane-device-pp-adjust') {
      //handle Arcane Device Item Card PP adjustment
      const adjustment = button.getAttribute('data-adjust') as string;
      const item = this.actor.items.get(itemId)!;
      const key = 'system.powerPoints.value';
      let newPP = foundry.utils.getProperty(item, key);
      if (adjustment === 'plus') {
        newPP += parseInt(arcaneDevicePPToAdjust, 10);
      } else if (adjustment === 'minus') {
        newPP -= parseInt(arcaneDevicePPToAdjust, 10);
      }
      await item.update({ [key]: newPP });
    } else if (action === 'template') {
      //Handle template placement
      const template = button.dataset.template!;
      SwadeMeasuredTemplate.fromPreset(template, item);
    } else {
      ItemChatCardHelper.handleAction(item, this.actor, action, {
        additionalMods,
        event: ev,
      });
    }
  }

  /**
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs
   * @param {Event} event  Triggering event.
   */
  protected _onChangeInputDelta(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (['+', '-'].includes(value[0])) {
      const delta = parseInt(value, 10);
      input.value = foundry.utils.getProperty(this.actor, input.name) + delta;
    } else if (value[0] === '=') {
      input.value = value.slice(1);
    }
  }

  protected static async _toggleStatusEffect(this: CharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const key = target.dataset.key as string;
    // this is just to make sure the status is false in the source data
    await this.actor.update({ [`system.status.${key}`]: false });
    await this.actor.toggleActiveEffect(target.dataset.id as string);
  }

  static async #toggleConviction(this: CharacterSheet, _event: PointerEvent, _target: HTMLElement) {
    await this.actor.toggleConviction();
  }

  static #displayAdvances(this: CharacterSheet, _event: PointerEvent, _target: HTMLElement) {
    this.changeTab('about', 'primary');
    this.changeTab('advances', 'about');
  }

  static async #rollAttribute(this: CharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const attribute = target.dataset.attribute as Attribute;
    await this.actor.rollAttribute(attribute);
  }

  static async #rollSkill(this: CharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const item = target.parentElement!.dataset.itemId!;
    await this.actor.rollSkill(item);
  }

  static async #rollRunningDie(this: CharacterSheet, _event: PointerEvent, _target: HTMLElement) {
    await this.actor.rollRunningDie();
  }

  static #displayAttributeManager(this: CharacterSheet, _event: PointerEvent, _target: HTMLElement) {
    new AttributeManager({ actor: this.actor }).render({ force: true });
  }

  static #displayModifierDialog(this: CharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const displayProperty = target.dataset.displayProperty;
    let propertyPath;
    let propertyLabel;
    if (displayProperty === 'armor') {
      propertyPath = 'system.stats.toughness.armor';
      propertyLabel = game.i18n.localize('SWADE.Armor')
    } else if (displayProperty === 'parry') {
      propertyPath = 'system.stats.parry.shield';
      propertyLabel = game.i18n.localize('SWADE.ShieldBonus');
    } else {
      return;
    }
    const propertyValue = foundry.utils.getProperty(
      this.actor,
      propertyPath,
    );
    const label = propertyLabel;
    const template = `
    <form><div class="form-group">
      <label>${game.i18n.format('SWADE.EdF', { item: label })}</label>
      <input name="modifier" value="${propertyValue}" type="number"/>
    </div></form>`;

    foundry.applications.api.Dialog.wait({
      window: {
        title: `${game.i18n.format('SWADE.EdF', { item: this.actor.name + ' ' + label })}`,
      },
      content: template,
      buttons: [
        {
          action: 'ok',
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('SWADE.Ok'),
          default: true,
          callback: (_event, button: HTMLButtonElement) => {
            const newData = {};
            newData[propertyPath] =
              button.form!.querySelector<HTMLInputElement>(
                'input[name="modifier"]',
              )?.value;
            this.actor.update(newData);
          },
        },
        {
          action: 'cancel',
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('Cancel'),
        },
      ],
    });
  }

  static async #rollDamage(this: CharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const id = target.closest('.item')?.dataset.itemId;
    await this.actor.items.get(id)?.rollDamage();
  }

  static async #rollWealthDie(this: CharacterSheet, _event: PointerEvent, _target: HTMLElement) {
    await this.actor.rollWealthDie();
  }

  static async #useConsumable(this: CharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const id = target.closest('.item')?.dataset.itemId;
    await this.actor.items.get(id)?.consume();
  }

  protected static async _handleCounterAdjust(this: CharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const action = target.dataset.subAction;

    switch (action) {
      case 'fatigue-plus':
        await this.actor.update({
          'system.fatigue.value': this.actor.system.fatigue.value + 1,
        });
        break;
      case 'fatigue-minus':
        await this.actor.update({
          'system.fatigue.value': Math.max(
            0,
            this.actor.system.fatigue.value - 1,
          ),
        });
        break;
      case 'wounds-plus':
        await this.actor.update({
          'system.wounds.value': this.actor.system.wounds.value + 1,
        });
        break;
      case 'wounds-minus':
        await this.actor.update({
          'system.wounds.value': Math.max(
            0,
            this.actor.system.wounds.value - 1,
          ),
        });
        break;
      case 'spend-benny':
        await this.actor.spendBenny();
        break;
      case 'get-benny':
        await this.actor.getBenny();
        break;
      case 'pp-refresh': {
        const arcane = target.dataset.arcane as string;
        const key = `system.powerPoints.${arcane}.value`;
        const currentPP = foundry.utils.getProperty(this.actor, key);
        const maxPP = foundry.utils.getProperty(
          this.actor,
          `system.powerPoints.${arcane}.max`,
        );
        if (currentPP >= maxPP) return;
        await this.actor.update({ [key]: Math.min(currentPP + 5, maxPP) });
        break;
      }
      default:
        throw new Error('Unknown action!');
    }
  }

  static async #addAdvance(this: CharacterSheet, _event: PointerEvent, _target: HTMLElement) {
    const advances = this.actor.system.advances.list;
    const newAdvance: Advance = {
      id: foundry.utils.randomID(8),
      type: constants.ADVANCE_TYPE.EDGE,
      sort: advances.size + 1,
      planned: false,
      notes: '',
    };
    advances.set(newAdvance.id, newAdvance);
    await this.actor.update({ 'system.advances.list': advances.toJSON() });
    new AdvanceEditor({
      advance: newAdvance,
      actor: this.actor,
    }).render({ force: true });
  }

  static async #createFavorite(this: CharacterSheet, _event: PointerEvent, target: HTMLElement) {
    const typeLabels = { ...CONFIG.Item.typeLabels, effect: 'DOCUMENT.ActiveEffect' };
    const choices = target.dataset.choices?.split(',') ?? ['weapon', 'power', 'armor', 'shield', 'consumable', 'effect', 'action', 'gear'];
    const templateData = {
      types: Object.fromEntries(choices.map(i => [i, game.i18n.localize(typeLabels[i])])),
      hasTypes: true,
      name: ''
    };
    const dlg = await foundry.applications.handlebars.renderTemplate(
      'templates/sidebar/document-create.html',
      templateData
    );
    const response = await foundry.applications.api.Dialog.input({
      window: {
        title: game.i18n.format('DOCUMENT.Create', {
          type: game.i18n.localize('DOCUMENT.Item')
        })
      },
      content: dlg
    }) as {type: Item.SubType | 'effect', name: string | undefined} | null;
    const createItem = (type: Item.SubType, name?: string) => {
      const itemData = {
        name: name?.length ? name : SwadeItem.defaultName({ type, parent: this.actor }),
        type,
        system: Object.assign({favorite: true}, target.dataset)
      };
      delete itemData.system.type;
      delete itemData.system.choices;
      delete itemData.system.action;
      return itemData;
    }
    if (response?.type === 'effect') {
      this._createActiveEffect({ name: response.name, 'system.favorite': true });
    } else if (response?.type) {
      const itemData = createItem(response.type, response.name);
      await CONFIG.Item.documentClass.create(itemData, {
        renderSheet: true,
        parent: this.actor
      });
    }
  }

  async #deleteAdvance(id: string) {
    foundry.applications.api.Dialog.confirm({
      window: {
        title: game.i18n.localize('SWADE.Advances.Delete'),
      },
      content: `<form>
        <div style="text-align: center;">
          <p>${game.i18n.localize('SWADE.DialogConfirmPrompt')}</p>
        </div>
      </form>`,
      yes: {
        default: true,
        callback: () => {
          const advances = this.actor.system.advances.list;
          advances.delete(id);
          const arr = advances.toJSON();
          arr.forEach((a, i) => (a.sort = i + 1));
          this.actor.update({ 'system.advances.list': arr });
        },
      },
      no: {
        default: false,
      },
    });
  }

  async #toggleAdvancePlanned(id: string) {
    foundry.applications.api.Dialog.confirm({
      window: {
        title: game.i18n.localize('SWADE.Advances.Toggle'),
      },
      content: `<form>
        <div style="text-align: center;">
          <p>${game.i18n.localize('SWADE.DialogConfirmPrompt')}</p>
        </div>
      </form>`,
      yes: {
        default: true,
        callback: async () => {
          const advances = this.actor.system.advances.list;
          const advance = advances.get(id, { strict: true });
          advance.planned = !advance.planned;
          advances.set(id, advance);
          await this.actor.update(
            { 'system.advances.list': advances.toJSON() },
            { diff: false },
          );
        },
      },
      no: {
        default: false,
      },
    });
  }

  async #getAdvances() {
    const retVal = new Array<{ rank: string; list: Advance[] }>();
    const advances = this.actor.system.advances.list;
    for (const advance of advances) {
      advance.enrichedNotes = await this.#enrichText(advance.notes);
      const sort = advance.sort;
      const rankIndex = util.getRankFromAdvance(advance.sort);
      const rank = util.getRankFromAdvanceAsString(sort);
      if (!retVal[rankIndex]) {
        retVal.push({
          rank: rank,
          list: [],
        });
      }
      retVal[rankIndex].list.push(advance);
    }
    return retVal;
  }

  async #enrichText(text: string) {
    return foundry.applications.ux.TextEditor.implementation.enrichHTML(text, {
      relativeTo: this.actor,
      rollData: this.actor.getRollData(),
      secrets: this.document.isOwner,
    });
  }

  #disableOverrides(html: HTMLFormElement) {
    const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
    const disabledText = game.i18n.localize('SWADE.disabledAE');
    for (const override of Object.keys(flatOverrides)) {
      html.querySelectorAll(`[name="${override}"]`).forEach((input) => {
        input.disabled = true;
        if (input.dataset.tooltip) {
          input.dataset.tooltip += '<br>' + disabledText;
        } else input.dataset.tooltip = disabledText;
      });
    }
  }

  #getAdditionalStats(): AdditionalStats {
    const stats = structuredClone<AdditionalStats>(
      this.actor.system.additionalStats,
    );
    const options = game.settings.get('swade', 'settingFields').actor;
    for (const [key, attr] of Object.entries(stats)) {
      if (!options[key] || !attr.dtype) {
        delete stats[key];
        continue;
      }
      if (attr.dtype === 'Selection') {
        const optionString = options[key]?.optionString ?? '';
        attr.options = optionString
          .split(';')
          .reduce((a, v) => ({ ...a, [v.trim()]: v.trim() }), {});
      }
    }
    return stats;
  }

  #getPowers(): SheetPowers {
    //Deal with ABs and Powers
    const arcaneBackgrounds: Record<string, SheetArcaneBackground> = {};

    for (const power of this.actor.itemTypes.power) {
      const ab = power.system.arcane || 'general';
      if (!arcaneBackgrounds[ab]) {
        arcaneBackgrounds[ab] = {
          valuePath: `system.powerPoints.${ab}.value`,
          value: foundry.utils.getProperty(
            this.actor,
            `system.powerPoints.${ab}.value`,
          ),
          maxPath: `system.powerPoints.${ab}.max`,
          max: foundry.utils.getProperty(
            this.actor,
            `system.powerPoints.${ab}.max`,
          ),
          powers: [],
        };
      }
      arcaneBackgrounds[ab].powers.push(power);
    }

    //sort the powers by their sort value
    for (const entry of Object.values(arcaneBackgrounds)) {
      entry.powers.sort((a, b) => a.sort - b.sort);
    }

    const hasPowersWithoutArcane =
      arcaneBackgrounds?.general?.powers.length > 0;
    const showGeneral =
      hasPowersWithoutArcane || game.settings.get('swade', 'alwaysGeneralPP');

    return {
      arcaneBackgrounds,
      hasPowersWithoutArcane,
      showGeneral,
    };
  }

  #getAttributesForDisplay(): Record<string, TraitDisplay> {
    if (this.actor.type === 'vehicle') throw Error();
    const attributes: Record<string, TraitDisplay> = {};
    const globals = this.actor?.system.stats.globalMods as Record<
      string,
      RollModifier[]
    >;
    for (const key in this.actor.system.attributes) {
      const attr = this.actor.system.attributes[key];
      const mods: RollModifier[] = [
        {
          label: game.i18n.localize('SWADE.TraitMod'),
          value: attr.die.modifier,
        },
        ...attr.effects,
        ...globals[key],
        ...globals.trait,
      ].filter((m) => m.ignore !== true);
      let tooltip = `<strong>${game.i18n.localize(
        SWADE.attributes[key].long,
      )}</strong>`;
      if (mods.length) {
        tooltip += `<ul style="text-align:start;">${mods
          .map(({ label, value }) => {
            const mapped =
              typeof value === 'number'
                ? util.signedNumberString(value)
                : value;
            return `<li>${label}: ${mapped}</li>`;
          })
          .join('')}</ul>`;
      }
      attributes[key] = {
        die: attr.die.sides,
        modifier: mods.reduce(util.addUpModifiers, 0),
        tooltip,
      };
    }

    return attributes;
  }

  async #getSkillsForDisplay(): Promise<SkillDisplay[]> {
    const globals = this.actor?.system.stats.globalMods as Record<
      string,
      RollModifier[]
    >;
    const skills: SkillDisplay[] = [];

    for (const skill of this.actor.items.filter((i) => i.type === 'skill')) {
      const attribute = skill.system.attribute;
      const mods: RollModifier[] = [
        {
          label: game.i18n.localize('SWADE.TraitMod'),
          value: skill.system.die.modifier,
        },
        ...skill.system.effects,
        ...(globals[attribute] ?? []),
        ...globals.trait,
      ].filter((m) => m.ignore !== true);
      let tooltip = `<strong>${skill.name}</strong>`;
      if (mods.length) {
        tooltip += `<ul style="text-align:start;">${mods
          .map(({ label, value }) => {
            const mapped =
              typeof value === 'number'
                ? util.signedNumberString(value)
                : value;
            return `<li>${label}: ${mapped}</li>`;
          })
          .join('')}</ul>`;
      }
      skills.push({
        label: skill.name as string,
        img: skill.img as string,
        die: skill.system.die.sides as number,
        description: await this.#enrichText(skill.system.description),
        modifier: mods.reduce(util.addUpModifiers, 0),
        isCoreSkill: skill.system.isCoreSkill,
        isOwner: skill.isOwner,
        id: skill.id,
        attribute,
        tooltip,
      });
    }

    return skills.sort((a, b) => a.label.localeCompare(b.label));
  }

  #getWealthDieTypes(): DieSidesOption[] {
    const options: DieSidesOption[] = util.getDieSidesRange(4, 12);
    options.unshift({ key: 0, label: 'SWADE.WealthDie.Broke.Label' });
    return options;
  }

  #setupEquipStatusMenu(html: HTMLElement) {
    const items: ContextMenu.Entry<HTMLElement>[] = [
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.Stored'),
        icon: '<i class="fas fa-archive"></i>',
        condition: true,
        callback: (i: HTMLOListElement) => {
          const id = i.closest('.item')?.dataset.itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.STORED);
        },
      },
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.Carried'),
        icon: '<i class="fas fa-shopping-bag"></i>',
        condition: true,
        callback: (i: HTMLOListElement) => {
          const id = i.closest('.item')?.dataset.itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.CARRIED);
        },
      },
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.Equipped'),
        icon: '<i class="fas fa-tshirt"></i>',
        condition: (i: HTMLOListElement) => {
          const id = i.closest('.item')?.dataset.itemId;
          const item = this.actor.items.get(id, { strict: true });
          if (item.type === 'gear') return item.system.equippable;
          return !['weapon', 'consumable'].includes(item.type);
        },
        callback: (i: HTMLOListElement) => {
          const id = i.closest('.item')?.dataset.itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.EQUIPPED);
        },
      },
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.OffHand'),
        icon: '<i class="fas fa-hand-paper"></i>',
        condition: (i: HTMLOListElement) => {
          const id = i.closest('.item')?.dataset.itemId;
          const item = this.actor.items.get(id, { strict: true });
          return item.type === 'weapon';
        },
        callback: (i: HTMLOListElement) => {
          const id = i.closest('.item')?.dataset.itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.OFF_HAND);
        },
      },
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.MainHand'),
        icon: '<i class="fas fa-hand-paper fa-flip-horizontal"></i>',
        condition: (i: HTMLOListElement) => {
          const id = i.closest('.item').dataset.itemId;
          const item = this.actor.items.get(id, { strict: true });
          return item.type === 'weapon';
        },
        callback: (i: HTMLOListElement) => {
          const id = i.closest('.item')?.dataset.itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.MAIN_HAND);
        },
      },
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.TwoHands'),
        icon: '<i class="fas fa-sign-language"></i>',
        condition: (i: HTMLOListElement) => {
          const id = i.closest('.item')?.dataset.itemId;
          const item = this.actor.items.get(id, { strict: true });
          return item.type === 'weapon';
        },
        callback: (i: HTMLOListElement) => {
          const id = i.closest('.item')?.dataset.itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.TWO_HANDS);
        },
      },
    ];

    const selector = ' .inventory .item-controls .equip-status';
    const options = { eventName: 'click', jQuery: false, fixed: true };
    this._equipStateMenu =
      new foundry.applications.ux.ContextMenu.implementation(
        html,
        selector,
        items,
        options,
      );
  }

  #setupEffectCreateMenu(html: HTMLElement) {
    this._effectCreateDropDown =
      new foundry.applications.ux.ContextMenu.implementation(
        html,
        '.effects .effect-add',
        [
          {
            name: 'SWADE.ActiveEffects.AddGuided',
            icon: '<i class="fa-solid fa-hat-wizard"></i>',
            condition: this.document.isOwner,
            callback: (_li) => {
              new ActiveEffectWizard({ document: this.document }).render({
                force: true,
              });
            },
          },
          {
            name: 'SWADE.ActiveEffects.AddUnguided',
            icon: '<i class="fa-solid fa-file-plus"></i>',
            condition: this.document.isOwner,
            callback: (_li) => {
              this._createActiveEffect();
            },
          },
        ],
        { eventName: 'click', jQuery: false, fixed: true },
      );
  }

  #setupItemContextMenu(html: HTMLElement) {
    const items: ContextMenu.Entry<HTMLElement>[] = [
      {
        name: 'SWADE.Reload',
        icon: '<i class="fa-solid fa-right-to-bracket"></i>',
        condition: (i) => {
          const item = this.actor.items.get(i.dataset.itemId);
          return (
            item?.type === 'weapon' &&
            !!item.system.shots &&
            game.settings.get('swade', 'ammoManagement')
          );
        },
        callback: (i) => this.actor.items.get(i.dataset.itemId)?.reload(),
      },
      {
        name: 'SWADE.RemoveAmmo',
        icon: '<i class="fa-solid fa-right-from-bracket"></i>',
        condition: (i) => {
          const item = this.actor.items.get(i.dataset.itemId);
          const isWeapon = item?.type === 'weapon';
          const loadedAmmo = item?.getFlag('swade', 'loadedAmmo');
          return (
            isWeapon &&
            !!loadedAmmo &&
            item.usesAmmoFromInventory &&
            (item.system.reloadType === constants.RELOAD_TYPE.MAGAZINE ||
              item.system.reloadType === constants.RELOAD_TYPE.BATTERY)
          );
        },
        callback: (i) => this.actor.items.get(i.dataset.itemId)?.removeAmmo(),
      },
      {
        name: 'SWADE.Ed',
        icon: '<i class="fa-solid fa-edit"></i>',
        callback: (i) => {
          const itemId = i.dataset.itemId;
          const effectId = i.dataset.effectId;
          if (itemId) this.actor.items.get(itemId)?.sheet?.render({ force: true });
          if (effectId) {
            const allEffects: ActiveEffect[] = Array.from(
              this.actor.allApplicableEffects(),
            );
            allEffects
              .find((ef) => ef.id === effectId)
              ?.sheet?.render({ force: true });
          }
        },
      },
      {
        name: 'SWADE.Duplicate',
        icon: '<i class="fa-solid fa-copy"></i>',
        condition: (i) =>
          !!this.actor.items.get(i.dataset.itemId)?.isPhysicalItem,
        callback: async (i) => {
          const item = this.actor.items.get(i.dataset.itemId);
          const cloned = await item?.clone(
            { name: game.i18n.format('DOCUMENT.CopyOf', { name: item.name }) },
            { save: true },
          );
          cloned?.sheet?.render({ force: true });
        },
      },
      {
        name: 'SWADE.Del',
        icon: '<i class="fa-solid fa-trash"></i>',
        callback: (i) => {
          const itemId = i.dataset.itemId;
          const effectId = i.dataset.effectId;
          if (itemId) this.actor.items.get(itemId)?.deleteDialog();
          if (effectId) {
            const allEffects: ActiveEffect[] = Array.from(
              this.actor.allApplicableEffects(),
            );
            allEffects.find((ef) => ef.id === effectId)?.deleteDialog();
          }
        },
      },
    ];

    new foundry.applications.ux.ContextMenu.implementation(
      html,
      'li.item, li.effect',
      items,
      {jQuery: false, fixed: true},
    );
  }

  #setupAccordions(html: HTMLFormElement) {
    const elements = html.querySelectorAll<HTMLDetailsElement>(
      'details[data-collapsible-id]',
    );
    for (const el of elements) {
      const id = el.dataset.collapsibleId;
      if (!id) continue;
      this._accordions[id] = {
        ...this._accordions[id],
        object: new Accordion(el, '.content', {
          onOpen: (details) => {
            this.#onOpenAccordion(details);
            this._accordions[id].open = true;
          },
          onClose: () => (this._accordions[id].open = false),
        }),
      };
    }
  }

  async #onOpenAccordion(element: HTMLDetailsElement) {
    if (element.dataset.enriched === 'true') return;
    const docId =
      element.closest('li')?.dataset.itemId ??
      element.closest('li')?.dataset.effectId;
    if (!docId) return;
    const doc =
      this.actor.items.get(docId) ??
      Array.from(this.actor.allApplicableEffects()).find((e) => e.id === docId);
    const text =
      doc instanceof SwadeItem ? doc?.system?.description : doc?.description;
    if (!text) return;
    element.querySelector<HTMLElement>(
      '.content .description, .content.description',
    )!.innerHTML = await this.#enrichText(text);
    element.setAttribute('data-enriched', true.toString());
  }
}

interface SheetEffect {
  id: string;
  img: string | undefined | null;
  description: string;
  disabled: boolean;
  favorite: boolean;
  origin?: string;
  source?: {
    name: string;
    id: string;
  };
  name: string;
  tooltip?: string;
  duration?: {
    expiration: number; // constants.STATUS_EFFECT_EXPIRATION
    rounds: number;
    startRound: number;
    startTurn: number;
    remaining: number;
  };
}

interface SheetPowers {
  hasPowersWithoutArcane: boolean;
  arcaneBackgrounds: Record<string, SheetArcaneBackground>;
  showGeneral: boolean;
}

interface SheetArcaneBackground {
  valuePath: string;
  value: any;
  maxPath: string;
  max: any;
  powers: SwadeItem[];
}

interface TraitDisplay {
  die: number;
  modifier: number;
  tooltip: string;
}
interface SkillDisplay extends TraitDisplay {
  label: string;
  img: string;
  description: string;
  attribute: LinkedAttribute;
  isCoreSkill: boolean;
  isOwner: boolean;
  id: string;
}

interface CharacterSheetRenderContext extends SwadeActorSheetV2.RenderContext {
  additionalStats: AdditionalStats;
  advances: {
    expanded: boolean;
    list: Array<{
      rank: string;
      list: Advance[]
    }>;
  };
  attributes: Record<string, TraitDisplay>;
  armorTooltip: string;
  bennyImageURL: string;
  currentBennies: number[];
  enrichedText: {
    appearance: string;
    goals: string;
    notes: string;
    biography: string;
    advances?: string;
  };
  hasAdditionalStats: boolean;
  itemTypes: Record<string, SwadeItem[]>;
  parryTooltip: string;
  powers: SheetPowers;
  settingrules: Record<string, unknown>;
  sheetEffects: {
    temporary: SheetEffect[];
    permanent: SheetEffect[];
    favorite: SheetEffect[];
  };
  skills: SkillDisplay[];
  toughnessTooltip: string;
  useAttributeShorts: boolean;
  wealthDieTypes: DieSidesOption[];
}
