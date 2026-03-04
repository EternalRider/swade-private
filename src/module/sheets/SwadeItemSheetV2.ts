import { DeepPartial } from 'fvtt-types/utils';
import {
  AdditionalStats,
  DieSidesOption,
  EquipState,
  ItemActions,
  SwadeApplicationTab,
} from '../../globals';
import { ItemAction } from '../../interfaces/additional.interface';
import ActiveEffectWizard from '../apps/ActiveEffectWizard';
import { RequirementsEditor } from '../apps/RequirementsEditor';
import { SwadeItemTweaks } from '../apps/SwadeDocumentTweaks';
import { SWADE } from '../config';
import { constants } from '../constants';
import { ChargesData } from '../data/fields/ChargesData';
import { PowerData } from '../data/item/power';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { ItemGrant } from '../documents/item/SwadeItem.interface';
import { Logger } from '../Logger';
import { Accordion } from '../style/Accordion';
import { getDieSidesRange } from '../util';
import { SwadeBaseSheetMixin } from './SwadeBaseSheetMixin';

// eslint-disable-next-line @typescript-eslint/naming-convention
import DocumentSheet = foundry.applications.api.DocumentSheet;

export default class SwadeItemSheetV2 extends SwadeBaseSheetMixin<
  SwadeItem,
  ItemSheetRenderContext
>(DocumentSheet) {
  collapsibleStates: CollapsibleStates = {
    powers: {},
    actions: {},
    effects: {},
  };
  #effectCreateDropDown: ContextMenu<false>;

  static override DEFAULT_OPTIONS = {
    classes: [
      'swade-item-sheet',
      'swade',
      'swade-application',
      'standard-form',
    ],
    position: {
      width: 600,
      height: 560,
    },
    window: {
      resizable: true,
    },
    dragDrop: [{ dropSelector: null, dragSelector: '.effect-list li details' }],
    actions: {
      inlineDelete: SwadeItemSheetV2.#inlineDelete,
      addAction: SwadeItemSheetV2.#addAction,
      addCharge: SwadeItemSheetV2.#addCharge,
      deleteAction: SwadeItemSheetV2.#deleteAction,
      deleteCharge: SwadeItemSheetV2.#deleteCharge,
      deletePower: SwadeItemSheetV2.#deletePower,
      deleteGrant: SwadeItemSheetV2.#deleteGrant,
      openItem: SwadeItemSheetV2.#openItem,
      editEffect: SwadeItemSheetV2.#effectAction,
      deleteEffect: SwadeItemSheetV2.#effectAction,
      toggleEffect: SwadeItemSheetV2.#effectAction,
      rechargeManual: SwadeItemSheetV2.#rechargeAction,
      rechargeEncounter: SwadeItemSheetV2.#rechargeAction,
      rechargeDay: SwadeItemSheetV2.#rechargeAction,
      rollDamage: SwadeItemSheetV2.#rollDamage,
      rollAdditionalStat: SwadeItemSheetV2.#rollAdditionalStat,
      useConsumable: SwadeItemSheetV2.#useConsumable,
      openRequirementsEditor: SwadeItemSheetV2.#openRequirementsEditor,
      openTweaks: SwadeItemSheetV2.#openTweaks,
    },
  };

  static override PARTS = {
    ability: {
      template: 'systems/swade/templates/item/ability.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.charges',
        '.editor-container .editor-content',
      ],
    },
    action: {
      template: 'systems/swade/templates/item/action.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.charges',
        '.editor-container .editor-content',
      ],
    },
    ancestry: {
      template: 'systems/swade/templates/item/ancestry.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.charges',
        '.editor-container .editor-content',
      ],
    },
    armor: {
      template: 'systems/swade/templates/item/armor.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.charges',
        '.editor-container .editor-content',
      ],
    },
    consumable: {
      template: 'systems/swade/templates/item/consumable.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.charges',
        '.editor-container .editor-content',
      ],
    },
    edge: {
      template: 'systems/swade/templates/item/edge.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.charges',
        '.editor-container .editor-content',
      ],
    },
    gear: {
      template: 'systems/swade/templates/item/gear.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.charges',
        '.editor-container .editor-content',
      ],
    },
    hindrance: {
      template: 'systems/swade/templates/item/hindrance.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.charges',
        '.editor-container .editor-content',
      ],
    },
    power: {
      template: 'systems/swade/templates/item/power.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.charges',
        '.editor-container .editor-content',
      ],
    },
    shield: {
      template: 'systems/swade/templates/item/shield.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.charges',
        '.editor-container .editor-content',
      ],
    },
    skill: {
      template: 'systems/swade/templates/item/skill.hbs',
      scrollable: [''],
    },
    weapon: {
      template: 'systems/swade/templates/item/weapon.hbs',
      templates: ['templates/generic/tab-navigation.hbs'],
      scrollable: [
        '.properties',
        '.actions',
        '.editor-container .editor-content',
      ],
    },
  };

  static override TABS: Record<string, Partial<SwadeApplicationTab>> = {
    description: {
      id: 'description',
      group: 'main',
      label: 'SWADE.Desc',
      cssClass: 'item',
      tabCssClass: 'description',
    },
    properties: {
      id: 'properties',
      group: 'main',
      label: 'SWADE.Properties',
      cssClass: 'item',
      tabCssClass: 'properties',
    },
    charges: {
      id: 'charges',
      group: 'main',
      label: 'SWADE.Charges',
      cssClass: 'item',
      tabCssClass: 'charges',
    },
    powers: {
      id: 'powers',
      group: 'main',
      label: 'SWADE.Pow',
      cssClass: 'item',
      tabCssClass: 'powers',
    },
    actions: {
      id: 'actions',
      group: 'main',
      label: 'SWADE.Actions.Name',
      cssClass: 'item',
      tabCssClass: 'actions',
    },
    effects: {
      id: 'effects',
      group: 'main',
      label: 'SWADE.Effects',
      cssClass: 'item',
      tabCssClass: 'effects',
    },
  };

  override tabGroups = {
    main: 'description',
  };

  override async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    if (this.isEditable) {
      const tweaksTemplate = document.createElement('template');
      tweaksTemplate.innerHTML = `<button type="button" class="header-control icon fa-solid fa-gears"
        data-tooltip="SWADE.Tweaks" aria-label="SWADE.Tweaks"
        data-action="openTweaks">${game.i18n.localize('SWADE.Tweaks')}</button>`;
      const targetElem = frame.querySelector('[data-action="toggleControls"]');
      targetElem?.before(tweaksTemplate.content.firstChild!);
    }
    return frame;
  }
  protected override _configureRenderOptions(options): void {
    super._configureRenderOptions(options);
    options.parts = [this.document.type];
  }

  get item(): SwadeItem {
    return this.document;
  }

  get actor(): SwadeActor | null {
    return this.item.actor;
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

  override async _onRender(
    context: ItemSheetRenderContext,
    options: DeepPartial<DocumentSheet.RenderOptions>,
  ) {
    await super._onRender(context, options);

    this.form?.addEventListener('keypress', (ev: KeyboardEvent) => {
      const target = ev.target as HTMLButtonElement;
      const targetIsButton = 'button' === target?.type;
      if (!targetIsButton && ev.key === 'Enter') {
        ev.preventDefault();
        this.submit({ preventClose: true });
        return false;
      }
    });

    this.element.querySelectorAll('.loaded-ammo-name').forEach((el) =>
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

    // Charge input fields
    // TODO: This needed?
    this.element.querySelectorAll('.charge-field').forEach((el) =>
      el.addEventListener('change', async (ev) => {
        const charges = this.item.system.charges;
        charges.default[ev.currentTarget.dataset.name] = Number(
          ev.currentTarget.value,
        );
        this.item.update({ 'system.charges.charges': charges.charges });
      }),
    );

    new ChargeDragSort(this.element, this.item);

    // TODO: This without accordions, maybe
    this.#setupAccordions();
  }

  override async _onFirstRender(
    context: ItemSheetRenderContext,
    options: DeepPartial<DocumentSheet.RenderOptions>,
  ) {
    await super._onFirstRender(context, options);

    this.#setupEffectCreateMenu(this.element);
  }

  // Delete Item from within Sheet. Only really used for Skills, Edges, Hindrances and Powers
  static async #inlineDelete(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    await this.item.delete();
  }

  static async #addAction(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    const id = foundry.utils.randomID(8);
    this.collapsibleStates[id] = true;
    await this.item.update({
      ['system.actions.additional.' + id]: {
        name: game.i18n.format('DOCUMENT.New', {
          type: game.i18n.localize('TYPES.Item.action'),
        }),
        type: constants.ACTION_TYPE.TRAIT,
      },
    });
  }

  static async #addCharge(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    const id = ChargesData.randomID();
    const charges = this.item.system.charges.charges;
    charges.push({
      id: id,
      sort: charges.length,
      name: game.i18n.format('DOCUMENT.New', {
        type: game.i18n.localize('TYPES.Item.charge'),
      }),
      rechargeType: constants.CHARGE_RECHARGE_TYPE.FINITE,
    });
    this.item.update({ 'system.charges.charges': charges });
  }

  static async #deleteAction(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    const id = target.dataset.actionId;
    const action = foundry.utils.getProperty(
      this.item,
      `system.actions.additional.${id}`,
    ) as ItemAction;
    if (!action) return;
    const text = game.i18n.format('SWADE.DeleteEmbeddedActionPrompt', {
      action: action.name,
    });
    await foundry.applications.api.Dialog.confirm({
      content: `<p class="text-center">${text}</p>`,
      classes: ['dialog', 'swade-app'],
      yes: {
        callback: async () =>
          await this.item.update({
            [`system.actions.additional.-=${id}`]: null,
          }),
      },
    });
  }

  static async #deleteCharge(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    const id = target.dataset.chargeId;
    const charge = this.item.system.charges.find(id);
    const text = game.i18n.format('SWADE.DeleteEmbeddedChargePrompt', {
      charge: charge.name,
    });
    await foundry.applications.api.DialogV2.confirm({
      content: `<p class="text-center">${text}</p>`,
      classes: ['dialog', 'swade-app'],
      yes: {
        callback: async () => {
          let sort = 0;
          const charges = this.item.system.charges.charges;
          charges.findSplice((c) => c.id === id);
          charges.forEach((c) => (c.sort = sort++));
          await this.item.update({ 'system.charges.charges': charges });
        },
      },
    });
  }

  static async #deletePower(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    const id = target.closest('details')?.dataset.powerId;
    if (!id) return;
    const power = this.item.embeddedPowers.get(id);
    if (!power) return;
    const text = game.i18n.format('SWADE.DeleteEmbeddedPowerPrompt', {
      power: power.name,
    });
    await foundry.applications.api.DialogV2.confirm({
      content: `<p class="text-center">${text}</p>`,
      classes: ['dialog', 'swade-app'],
      yes: {
        callback: async () => await this.#deleteEmbeddedDocument(id),
      },
    });
  }

  static async #deleteGrant(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    const uuid = target.closest<HTMLLIElement>('.granted-item')?.dataset.uuid;
    const grants = this.item.grantsItems;
    grants.findSplice((v) => v.uuid === uuid);
    await this.item.update({ 'system.grants': grants });
  }

  static async #openItem(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    const uuid = target.closest<HTMLLIElement>('.granted-item')?.dataset.uuid;
    const doc = (await fromUuid(uuid)) as SwadeItem | null;
    doc?.sheet?.render({ force: true });
  }

  static async #effectAction(
    this: SwadeItemSheetV2,
    event: PointerEvent,
    target: HTMLElement,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const effectId = target.closest('details')!.dataset.effectId as string;
    const effect = this.item.effects.get(effectId, { strict: true });
    const action = target.dataset.action as string;
    const toggle = target.dataset.toggle as string;
    switch (action) {
      case 'editEffect':
        return effect.sheet?.render({ force: true });
      case 'deleteEffect':
        return effect.delete();
      case 'toggleEffect':
        return effect.update(this.#toggleEffect(effect, toggle));
    }
  }

  static async #rechargeAction(
    this: SwadeItemSheetV2,
    event: PointerEvent,
    target: HTMLElement,
  ) {
    const action = target.dataset.action;
    if (action === 'rechargeManual') {
      const id = target.dataset.chargeId;
      const charge = this.item.system.charges.find(id);
      const text = game.i18n.format('SWADE.RechargeManualConfirm', {
        name: charge.name,
      });
      return await foundry.applications.api.DialogV2.confirm({
        content: `<p class="text-center">${text}</p>`,
        classes: ['dialog', 'swade-app'],
        yes: {
          callback: async () => {
            this.item.rechargeCharge(charge);
          },
        },
      });
    }
    const rechargeType =
      constants.CHARGE_RECHARGE_TYPE[
        action === 'rechargeEncounter' ? 'ENCOUNTER' : 'DAY'
      ];
    const text = game.i18n.localize('SWADE.RechargeEncounterConfirm');
    await foundry.applications.api.DialogV2.confirm({
      content: `<p class="text-center">${text}</p>`,
      classes: ['dialog', 'swade-app'],
      yes: {
        callback: async () => {
          this.item.rechargeAllChargesOfType(rechargeType);
        },
      },
    });
  }

  static async #rollDamage(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    const id = target.closest('details')?.dataset.powerId;
    if (!id) return;
    const tempPower = new SwadeItem(this.item.embeddedPowers.get(id));
    tempPower.rollDamage();
  }

  static async #rollAdditionalStat(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    const stat = target.dataset.stat;
    await this.item.system.rollAdditionalStat(stat);
  }

  static async #useConsumable(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    await this.item.consume();
  }

  static async #openRequirementsEditor(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    new RequirementsEditor({ edge: this.item }).render({ force: true });
  }

  static async #openTweaks(
    this: SwadeItemSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    new SwadeItemTweaks({ document: this.document }).render({ force: true });
  }

  protected override disableOverrides() {
    super.disableOverrides();
    if (this.item.type === 'skill') {
      // Disable overridden inputs, but keep skill die fields editable
      const overrides = foundry.utils.flattenObject(this.item.overrides);
      const allowSkillKey = (key: string) =>
        key.startsWith('system.die.') || key.startsWith('system.wild-die.');
      for (const key of Object.keys(overrides)) {
        if (!allowSkillKey(key)) continue;
        this.element
          .querySelectorAll<HTMLInputElement>(`[name="${key}"]`)
          .forEach((el) => (el.disabled = false));
      }
    }
  }

  override async _prepareContext(options): Promise<ItemSheetRenderContext> {
    const origContext = await super._prepareContext(options);

    const additionalStats = this.#getAdditionalStats();

    const context: ItemSheetRenderContext = foundry.utils.mergeObject(
      origContext,
      {
        actionTypes: this.actionTypes,
        chargeRechargeTypes: SWADE.chargeRechargeTypes,
        additionalStats: additionalStats,
        collapsibleStates: this.collapsibleStates,
        enrichedDescription: await this.#enrichText(
          this.item.system.description,
        ),
        equipStatusOptions: this.#equipStatusOptions(),
        grantOnTriggers: this.#getGrantOnTriggers(),
        hasAdditionalStats: Object.keys(additionalStats).length > 0,
        hasCategory: this.item.canHaveCategory,
        hasInlineDelete: this.hasInlineDelete,
        isArcaneDevice: this.item.isArcaneDevice,
        isPhysicalItem: this.isPhysicalItem,
        item: this.item,
        itemType: this.#getItemType(),
        macroActorTypes: this.macroActorTypes,
        ranges: this.#rangeSuggestions(),
        settingRules: {
          modSlots: game.settings.get('swade', 'vehicleMods'),
          noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
        },
        showEnergy: !!game.settings.get('swade', 'vehicleEnergy'),
        showMods: game.settings.get('swade', 'vehicleMods'),
      },
    );

    if (this.item.canGrantItems) {
      context.grantedItems = this.#getGrantedItems();
    }

    // TODO: Can't say I love this, context prep shouldn't be setting properties outside the context
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

    switch (this.type) {
      case 'ability': {
        const subtype = (this.item as SwadeItem<'ability'>).system.subtype;
        context.abilityConfig = {
          localization: SWADE.abilitySheet,
          abilityHeader: SWADE.abilitySheet[subtype].abilities,
          isArchetype: subtype === constants.ABILITY_TYPE.ARCHETYPE,
        };
        context.abilitySubtypeOptions = this.#getAbilitySubtypeOptions(
          SWADE.abilitySheet,
        );
        break;
      }
      case 'weapon':
        context.ppReload = false;
        context.trademarkWeaponOptions = this.#trademarkWeaponOptions();
        switch ((this.item as SwadeItem<'weapon'>).system.reloadType) {
          case constants.RELOAD_TYPE.NONE:
          case constants.RELOAD_TYPE.SINGLE:
          case constants.RELOAD_TYPE.FULL:
            context.ammoList = this.actor?.itemTypes.gear
              .filter((i) => i.system.isAmmo)
              .map((i) => i.name) as string[];
            break;
          case constants.RELOAD_TYPE.MAGAZINE:
            context.ammoList = this.actor?.itemTypes.consumable
              .filter(
                (i) =>
                  i.type === 'consumable' &&
                  i.system.subtype === constants.CONSUMABLE_TYPE.MAGAZINE,
              )
              .map((i) => i.name) as string[];
            context.ammoLoaded = this.item.getFlag('swade', 'loadedAmmo')?.name;
            break;
          case constants.RELOAD_TYPE.PP:
            context.ammoList = Object.keys(
              this.actor?.system?.powerPoints ?? {},
            );
            context.ppReload = true;
            break;
          case constants.RELOAD_TYPE.BATTERY:
            context.ammoList = this.actor?.itemTypes.consumable
              .filter(
                (i) =>
                  i.type === 'consumable' &&
                  i.system.subtype === constants.CONSUMABLE_TYPE.BATTERY,
              )
              .map((i) => i.name) as string[];
            context.ammoLoaded = this.item.getFlag('swade', 'loadedAmmo')?.name;
            break;
          case constants.RELOAD_TYPE.SELF:
            // Doesn't use external ammo
            break;
        }
        context.reloadTypeOptions = this.#reloadTypeOptions();
        context.rangeTypeOptions = {
          [constants.WEAPON_RANGE_TYPE.MELEE]: 'SWADE.Weapon.RangeType.Melee',
          [constants.WEAPON_RANGE_TYPE.RANGED]: 'SWADE.Weapon.RangeType.Ranged',
          [constants.WEAPON_RANGE_TYPE.MIXED]: 'SWADE.Weapon.RangeType.Mixed',
        };
        break;
      case 'consumable':
        context.subtypes = {
          [constants.CONSUMABLE_TYPE.REGULAR]: 'SWADE.ConsumableType.Regular',
          [constants.CONSUMABLE_TYPE.MAGAZINE]: 'SWADE.ReloadType.Magazine',
          [constants.CONSUMABLE_TYPE.BATTERY]: 'SWADE.ReloadType.Battery',
        };
        break;
      case 'hindrance':
        context.severityOptions = {
          major: 'SWADE.HindranceSeverity.Major',
          minor: 'SWADE.HindranceSeverity.Minor',
          either: 'SWADE.HindranceSeverity.Either',
        };
        break;
      case 'skill':
        context.dieSideOptions =
          this.actor?.type === 'npc'
            ? getDieSidesRange(4, 24)
            : getDieSidesRange(4, 20);
        context.wildDieSideOptions = getDieSidesRange(4, 12);
        context.attributeOptions = this.#getAttributeOptions();
        break;
    }

    if (
      [
        'action',
        'armor',
        'consumable',
        'gear',
        'power',
        'shield',
        'weapon',
      ].includes(this.type)
    ) {
      context.bonusDamageDieSideOptions = getDieSidesRange(4, 12);
    }

    if (this.item.isArcaneDevice) {
      context.embeddedPowers = this.item.embeddedPowers;
      for (const [, power] of context.embeddedPowers!) {
        power.enrichedDescription = await this.#enrichText(
          power.system.description,
        );
      }
      context.dieSideOptions =
        this.item.parent?.type === 'npc'
          ? getDieSidesRange(4, 24)
          : getDieSidesRange(4, 20);
    } else {
      delete context.tabs.powers;
    }

    if (this.item.system.charges?.hasCharges) {
      context.hasEncounterCharge = false;
      context.hasDayCharge = false;
      for (const charge of this.item.system.charges.charges) {
        context.hasEncounterCharge ||=
          charge.rechargeType == constants.CHARGE_RECHARGE_TYPE.ENCOUNTER;
        context.hasDayCharge ||=
          charge.rechargeType == constants.CHARGE_RECHARGE_TYPE.DAY;
      }
    } else {
      delete context.tabs.charges;
    }

    return context;
  }

  protected override _getHeaderControls() {
    const controls = super._getHeaderControls();

    if (this.isEditable) {
      controls.unshift({
        label: 'SWADE.RefreshOnly',
        icon: 'fa-solid fa-arrows-rotate',
        onClick: () => this.item.refreshFromCompendium(),
      });
    }

    return controls;
  }

  protected override _prepareSubmitData(
    event: SubmitEvent,
    form: HTMLFormElement,
    formData: FormDataExtended,
    updateData?: unknown,
  ) {
    const submitData = super._prepareSubmitData(
      event,
      form,
      formData,
      updateData,
    );
    if (this.type !== 'skill') {
      // Prevent submitting overridden values
      const overrides = foundry.utils.flattenObject(this.item.overrides);
      Object.keys(overrides).forEach((v) => delete submitData[v]);
    }
    const chargesData = foundry.utils.expandObject(formData.object)?.charges;
    if (chargesData) {
      let changed = false;
      for (const chargeId of Object.keys(chargesData)) {
        //Combine the data from the form with the full data to get complete reference point
        const chargeData = chargesData[chargeId];
        const charge = this.item.system.charges.find(chargeId);
        foundry.utils.mergeObject(chargeData, charge, { overwrite: false });

        //Compare the new data with the existing data to see if the user has made any changes
        if (
          JSON.stringify(chargeData, Object.keys(chargeData).sort()) !==
          JSON.stringify(charge, Object.keys(charge).sort())
        ) {
          foundry.utils.mergeObject(charge, chargeData);
          changed = true;
        }
      }

      if (changed) {
        foundry.utils.setProperty(
          submitData,
          'system.charges.charges',
          this.item.system.charges.charges,
        );
      }
    }
    return submitData;
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

  async #saveEmbeddedPowers(map: Map<string, PowerData>) {
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
        el.querySelector('summary')?.addEventListener('click', (ev) => {
          if (ev.target.type === 'button') return;
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
            condition: this.item.isOwner,
            callback: () =>
              new ActiveEffectWizard({ document: this.document }).render({
                force: true,
              }),
          },
          {
            name: 'SWADE.ActiveEffects.AddModifier',
            icon: '<i class="fa-solid fa-bolt"></i>',
            condition: this.item.isOwner,
            callback: () => this.#createActiveEffect('modifier'),
          },
          {
            name: 'SWADE.ActiveEffects.AddUnguided',
            icon: '<i class="fa-solid fa-file-plus"></i>',
            condition: this.item.isOwner,
            callback: () => this.#createActiveEffect('base'),
          },
        ],
        {
          eventName: 'click',
          jQuery: false,
          fixed: true,
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

class ChargeDragSort {
  dragging: any = null;
  dropTarget: any = null;
  chargesList: any = null;
  item: SwadeItem;

  constructor(html, item) {
    this.item = item;
    this.chargesList = html.querySelector('.charges-list');
    if (!this.chargesList) {
      return;
    }

    this.chargesList.querySelectorAll('li').forEach((el) => {
      el.ondragstart = this.onDragStart.bind(this);
      el.ondragover = this.onDragOver.bind(this);
      el.ondragend = this.onDragEnd.bind(this);
    });

    this.chargesList.querySelectorAll('.sort-handle').forEach((el) => {
      const li = el.closest('li');
      el.onmousedown = li.setAttribute('draggable', 'true');
      el.onmouseup = li.setAttribute('draggable', 'false');
    });
  }

  onDragStart(ev) {
    ev.dataTransfer.setData('text/plain', JSON.stringify({ type: 'Charge' }));
    this.dragging = ev.currentTarget;
    this.dragging.classList.add('dragging');
    const liRect = this.dragging.getBoundingClientRect();
    ev.dataTransfer.setDragImage(
      this.dragging,
      ev.x - liRect.left,
      ev.y - liRect.top,
    );
  }

  onDragOver(ev) {
    ev.preventDefault();
    const li = ev.currentTarget.closest('li');
    if (this.dragging && li != this.dragging) {
      if (this.dragging.parentElement == li.parentElement) {
        this.dropTarget = li;
        if (this.dragging.parentNode === this.dropTarget.parentNode) {
          this.dropTarget =
            this.dropTarget !== this.dragging.nextElementSibling
              ? this.dropTarget
              : this.dropTarget.nextElementSibling;
        }
      }
    }

    if (this.dropTarget) {
      this.chargesList.insertBefore(this.dragging, this.dropTarget);
    } else {
      this.chargesList.appendChild(this.dragging);
    }
  }

  onDragEnd() {
    this.dragging.classList.remove('dragging');
    this.dragging = null;

    let sort = 0;
    const charges = this.item.system.charges.charges;
    for (const charge of this.chargesList.children) {
      charges.find((c) => c.id == charge.dataset.chargeId).sort = sort++;
    }
    charges.sort(ChargesData.sortFunction);
    this.item.update({ 'system.charges.charges': charges });
  }
}

interface ItemSheetRenderContext
  extends DocumentSheet.RenderContext<SwadeItem> {
  abilityConfig?: {
    localization: typeof SWADE.abilitySheet;
    abilityHeader: string;
    isArchetype: boolean;
  };
  abilitySubtypeOptions: Record<string, string>;
  actionTypes: Record<string, string>;
  additionalStats: AdditionalStats;
  ammoList?: string[];
  ammoLoaded?: string;
  attributeOptions?: Record<string, string>;
  bonusDamageDieSideOptions?: DieSidesOption[];
  chargeRechargeTypes: Record<string, string>;
  collapsibleStates: CollapsibleStates;
  dieSideOptions?: DieSidesOption[];
  dieSides?: DieSidesOption[];
  embeddedPowers?: Map<string, Item.CreateData>;
  enrichedDescription: string;
  equipStatusOptions: Record<EquipState, string>;
  grantedItems?: ItemGrant[];
  grantOnTriggers?: Record<number, string>[];
  hasAdditionalStats: boolean;
  hasCategory: boolean;
  hasDayCharge: boolean;
  hasEncounterCharge: boolean;
  hasInlineDelete: boolean;
  isArcaneDevice: boolean;
  isPhysicalItem: boolean;
  item: SwadeItem;
  itemType: string;
  macroActorTypes: Record<string, string>;
  ppReload?: boolean;
  ranges: string[];
  rangeTypeOptions?: Record<number, string>;
  reloadTypeOptions?: Record<number, string>;
  settingRules: {
    modSlots: boolean;
    noPowerPoints: boolean;
  };
  severityOptions?: Record<string, string>;
  showEnergy: boolean;
  showMods: boolean;
  subtypes?: Record<string, string>;
  trademarkWeaponOptions?: Record<number, string>;
  wildDieSideOptions?: DieSidesOption[];
}

interface CollapsibleStates {
  actions: Record<string, boolean>;
  powers: Record<string, boolean>;
  effects: Record<string, boolean>;
}
