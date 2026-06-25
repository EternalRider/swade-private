import { DeepPartial } from 'fvtt-types/utils';
import { AdditionalStats, Attribute, DieSidesOption, SwadeApplicationTab } from '../../globals';
import AttributeManager from '../apps/AttributeManager';
import { constants } from '../constants';
import { ActionData } from '../data/item';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';
import SwadeItem from '../documents/item/SwadeItem';
import { getDieSidesRange } from '../util';
import { SwadeActorSheetV2, SheetPowers } from './SwadeActorSheetV2';

export default class SwadeNPCSheet extends SwadeActorSheetV2<NpcSheetRenderContext> {
  #activeArcane = 'general';

  static override DEFAULT_OPTIONS = {
    classes: ['swade-application', 'npc'],
    position: {
      width: 660,
      height: 600,
    },
    window: {
      resizable: true,
    },
    actions: {
      createGear: SwadeNPCSheet.#createGear,
      displayAttributeManager: SwadeNPCSheet.#displayAttributeManager,
      displayModifierDialog: SwadeNPCSheet.#displayModifierDialog,
      filterPowers: SwadeNPCSheet.#filterPowers,
      openEffectOrigin: SwadeNPCSheet.#openEffectOrigin,
      'pp-refresh': SwadeNPCSheet._handleCounterAdjust,
      rollAttribute: SwadeNPCSheet.#rollAttribute,
      rollDamage: SwadeNPCSheet.#rollDamage,
      rollRunningDie: SwadeNPCSheet.#rollRunningDie,
      rollSkill: SwadeNPCSheet.#rollSkill,
      toggleConviction: SwadeNPCSheet.#toggleConviction,
      toggleStatusEffect: SwadeNPCSheet._toggleStatusEffect,
      useConsumable: SwadeNPCSheet.#useConsumable,
    },
  };

  static override PARTS = {
    sheet: {
      template: 'systems/swade/templates/actors/npc-sheet.hbs',
      scrollable: ['.tab.sheet-body'],
      templates: ['templates/generic/tab-navigation.hbs'],
    },
    limited: {
      template: 'systems/swade/templates/actors/limited-sheet.hbs',
    },
  };

  static override TABS: Record<string, Partial<SwadeApplicationTab>> = {
    summary: {
      id: 'summary',
      group: 'primary',
      label: 'SWADE.Summary',
      cssClass: 'item',
      tabCssClass: 'sheet-body',
    },
    powers: {
      id: 'powers',
      group: 'primary',
      label: 'SWADE.Pow',
      cssClass: 'item',
      tabCssClass: 'sheet-body',
    },
  };

  override tabGroups = {
    primary: 'summary',
  };

  protected override _configureRenderOptions(options): void {
    super._configureRenderOptions(options);
    if (this.document.limited) {
      options.parts = ['limited'];
    } else {
      options.parts.findSplice((i) => i === 'limited');
    }
  }

  override async _onRender(
    context: NpcSheetRenderContext,
    options: DeepPartial<foundry.applications.api.DocumentSheet.RenderOptions>
  ) {
    await super._onRender(context, options);

    this.element.querySelectorAll('li.item, .attribute').forEach((el) => {
      // Add draggable attribute and dragstart listener.
      el.draggable = true;
      el.addEventListener('dragstart', this._onDragStart.bind(this), false);
    });

    //Toggle Equipment Card & Power Card collapsible
    this.element
      .querySelectorAll('.gear-card .card-header .item-name,.power-card .card-header .item-name')
      .forEach((el) =>
        el.addEventListener('click', (ev) => {
          const card = ev.currentTarget.closest('.gear-card,.power-card');
          const content = card.querySelector('.card-content');
          content.classList.toggle('collapsed');
        })
      );

    // TODO: Could just make these normal tooltips, though they'd not be instant
    this.element.querySelector('.attribute.size input')?.addEventListener('mouseenter', (event) => {
      game.tooltip.deactivate();
      game.tooltip.activate(event.target as HTMLElement, {
        html: this.actor.system.getSizeTooltip(),
        cssClass: 'themed theme-dark',
      });
    });

    this.element.querySelector('.attribute.pace input')?.addEventListener('mouseenter', (event) => {
      game.tooltip.deactivate();
      game.tooltip.activate(event.target as HTMLElement, {
        html: this.actor.system.getPaceTooltip(),
        cssClass: 'themed theme-dark',
      });
    });

    this._filterPowers(context);
  }

  override async _onFirstRender(
    context: NpcSheetRenderContext,
    options: DeepPartial<foundry.applications.api.DocumentSheet.RenderOptions>
  ) {
    await super._onFirstRender(context, options);
    this.#setupItemContextMenu(this.element);
  }

  override async _prepareContext(options): Promise<NpcSheetRenderContext> {
    if (this.tabGroups.primary === 'powers' && !this.actor.hasPowers && !this.actor.hasArcaneBackground) {
      this.tabGroups.primary = 'summary';
    }
    const context = await super._prepareContext(options);
    const enrichedBiography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.details.biography.value,
      {
        relativeTo: this.actor,
        rollData: this.actor.getRollData(),
        secrets: this.options.editable && this.document.isOwner,
      }
    );
    const hiddenActionOverride = this.actor.getFlag('swade', 'hiddenActionOverride');
    const itemTypes = {};
    for (const item of context.items) {
      const { system, type } = item;
      itemTypes[type] ??= [];
      if (!(system instanceof ActionData) || !item.system.hidden || hiddenActionOverride) {
        itemTypes[type].push(item);
      }
    }

    const additionalStats = this.#getAdditionalStats();
    return {
      ...context,
      additionalStats: additionalStats,
      allApplicableEffects: Array.from(this.actor.allApplicableEffects()),
      armorTooltip: this.actor.getArmorTooltip(),
      enrichedBiography,
      hasAdditionalStatsFields: Object.keys(additionalStats).length > 0,
      itemTypes,
      parryTooltip: this.actor.getPTTooltip('parry'),
      powers: this.getPowers(),
      settingrules: {
        conviction: game.settings.get('swade', 'enableConviction'),
        noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
        wealthType: game.settings.get('swade', 'wealthType'),
        currencyName: game.settings.get('swade', 'currencyName'),
        npcsUseCurrency: game.settings.get('swade', 'npcsUseCurrency'),
      },
      sortedSkills: this.actor.itemTypes.skill.toSorted((a, b) => a.name.localeCompare(b.name)),
      toughnessTooltip: this.actor.getPTTooltip('toughness'),
      useAttributeShorts: game.settings.get('swade', 'useAttributeShorts'),
      wealthDieTypes: getDieSidesRange(4, 12),
    };
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
      })
    );
  }

  static async #openEffectOrigin(this: SwadeNPCSheet, _event: PointerEvent, target: HTMLElement) {
    const effectId = target.closest('.effect')!.dataset.effectId as string;
    const sourceId = target.closest('.effect')!.dataset.parentId as string;
    const sourceItem = this.actor.items.get(sourceId)!;
    const effect = sourceId
      ? (sourceItem.effects.get(effectId) as SwadeActiveEffect)
      : (this.actor.effects.get(effectId) as SwadeActiveEffect);
    if (!effect || !sourceItem) return;
    sourceItem.sheet?.render({ force: true });
  }

  #getAdditionalStats(): AdditionalStats {
    const stats = structuredClone<AdditionalStats>(this.actor.system.additionalStats);
    const options = game.settings.get('swade', 'settingFields').actor;
    for (const [key, attr] of Object.entries(stats)) {
      if (!options[key] || !attr.dtype) {
        delete stats[key];
        continue;
      }
      if (attr.dtype === 'Selection') {
        const optionString = options[key]?.optionString ?? '';
        attr.options = optionString.split(';').reduce((a, v) => ({ ...a, [v.trim()]: v.trim() }), {});
      }
    }
    return stats;
  }

  protected static async _toggleStatusEffect(this: SwadeNPCSheet, _event: PointerEvent, target: HTMLElement) {
    await this.actor.toggleActiveEffect(target.dataset.id as string);
  }

  static async #toggleConviction(this: SwadeNPCSheet, _event: PointerEvent, _target: HTMLElement) {
    await this.actor.toggleConviction();
  }

  static async #useConsumable(this: SwadeNPCSheet, _event: PointerEvent, target: HTMLElement) {
    const id = target.closest('.item')?.dataset.itemId;
    await this.actor.items.get(id)?.consume();
  }

  static async #rollAttribute(this: SwadeNPCSheet, _event: PointerEvent, target: HTMLElement) {
    const attribute = target.dataset.attribute as Attribute;
    await this.actor.rollAttribute(attribute);
  }

  static async #rollDamage(this: SwadeNPCSheet, _event: PointerEvent, target: HTMLElement) {
    const id = target.closest('.item')?.dataset.itemId;
    await this.actor.items.get(id)?.rollDamage();
  }

  static async #rollSkill(this: SwadeNPCSheet, _event: PointerEvent, target: HTMLElement) {
    const item = target.parentElement!.dataset.itemId!;
    await this.actor.rollSkill(item);
  }

  static async #rollRunningDie(this: SwadeNPCSheet, _event: PointerEvent, _target: HTMLElement) {
    await this.actor.rollRunningDie();
  }

  static #displayAttributeManager(this: SwadeNPCSheet, _event: PointerEvent, _target: HTMLElement) {
    new AttributeManager({ actor: this.actor }).render({ force: true });
  }

  static #displayModifierDialog(this: SwadeNPCSheet, _event: PointerEvent, target: HTMLElement) {
    const displayProperty = target.dataset.displayProperty;
    let propertyPath;
    let propertyLabel;
    if (displayProperty === 'armor') {
      propertyPath = 'system.stats.toughness.armor';
      propertyLabel = game.i18n.localize('SWADE.Armor');
    } else if (displayProperty === 'parry') {
      propertyPath = 'system.stats.parry.shield';
      propertyLabel = game.i18n.localize('SWADE.ShieldBonus');
    } else {
      return;
    }
    const propertyValue = foundry.utils.getProperty(this.actor, propertyPath);
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
            newData[propertyPath] = button.form!.querySelector<HTMLInputElement>('input[name="modifier"]')?.value;
            this.actor.update(newData);
          },
        },
        {
          action: 'cancel',
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('COMMON.Cancel'),
        },
      ],
    });
  }

  _filterPowers(context: NpcSheetRenderContext | null = null) {
    // Initialize selected AB to first real, non-general AB, if possible.
    if (this.#activeArcane === 'general' && !context?.powers?.showGeneral) {
      for (const key of Object.keys(context?.powers?.arcaneBackgrounds ?? {})) {
        if (key?.length < 1 || key === 'general') continue;
        this.#activeArcane = key;
        break;
      }
    }

    // Toggle AB selectors, PP counters and powers display depending on selected AB.
    this.element.querySelectorAll('.arcane, .power, .power-counter').forEach((el) => {
      el.classList.toggle('active', el.dataset.arcane === this.#activeArcane);
    });
  }

  static #filterPowers(this: SwadeNPCSheet, _event: PointerEvent, target: HTMLElement) {
    this.#activeArcane = target.dataset.arcane ?? 'general';
    this._filterPowers();
  }

  static async #createGear(this: SwadeNPCSheet, _event: PointerEvent, _target: HTMLElement) {
    const choices = ['weapon', 'armor', 'shield', 'gear', 'consumable'];
    const templateData = {
      types: Object.fromEntries(choices.map((i) => [i, game.i18n.localize(CONFIG.Item.typeLabels[i])])),
      hasTypes: true,
      name: '',
    };
    const dlg = await foundry.applications.handlebars.renderTemplate(
      'templates/sidebar/document-create.html',
      templateData
    );
    const response = (await foundry.applications.api.Dialog.input({
      window: {
        title: game.i18n.format('DOCUMENT.Create', {
          type: game.i18n.localize('DOCUMENT.Item'),
        }),
      },
      content: dlg,
    })) as { type: Item.SubType; name: string | undefined } | null;
    if (!response?.type) return;
    const itemData = {
      name: response.name || SwadeItem.defaultName({ type, parent: this.actor }),
      type: response.type,
    };
    await CONFIG.Item.documentClass.create(itemData, {
      renderSheet: true,
      parent: this.actor,
    });
  }

  protected static async _handleCounterAdjust(this: SwadeNPCSheet, _event: PointerEvent, target: HTMLElement) {
    const arcane = target.dataset.arcane;
    const valueKey = 'system.powerPoints.' + arcane + '.value';
    const maxKey = 'system.powerPoints.' + arcane + '.max';
    const currentPP = foundry.utils.getProperty(this.actor, valueKey);
    const maxPP = foundry.utils.getProperty(this.actor, maxKey);
    if (currentPP >= maxPP) return;
    await this.actor.update({
      [valueKey]: Math.min(currentPP + 5, maxPP),
    });
  }

  #setupItemContextMenu(html: HTMLElement) {
    const items: foundry.applications.ux.ContextMenu.Entry<HTMLElement>[] = [
      {
        label: 'SWADE.Reload',
        icon: '<i class="fa-solid fa-right-to-bracket"></i>',
        visible: (i) => {
          const item = this.actor.items.get(i.dataset.itemId);
          return item?.type === 'weapon' && !!item.system.shots && game.settings.get('swade', 'ammoManagement');
        },
        onClick: (_event, i) => this.actor.items.get(i.dataset.itemId)?.reload(),
      },
      {
        label: 'SWADE.RemoveAmmo',
        icon: '<i class="fa-solid fa-right-from-bracket"></i>',
        visible: (i) => {
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
        onClick: (_event, i) => this.actor.items.get(i.dataset.itemId)?.removeAmmo(),
      },
      {
        label: 'SWADE.Ed',
        icon: '<i class="fa-solid fa-edit"></i>',
        onClick: (_event, i) => {
          const itemId = i.dataset.itemId;
          const effectId = i.dataset.effectid;
          if (itemId) this.actor.items.get(itemId)?.sheet?.render({ force: true });
          if (effectId) {
            const allEffects: ActiveEffect[] = Array.from(this.actor.allApplicableEffects());
            allEffects.find((ef) => ef.id === effectId)?.sheet?.render({ force: true });
          }
        },
      },
      {
        label: 'SWADE.Duplicate',
        icon: '<i class="fa-solid fa-copy"></i>',
        visible: (i) => !!this.actor.items.get(i.dataset.itemId)?.isPhysicalItem,
        onClick: async (_event, i) => {
          const item = this.actor.items.get(i.dataset.itemId);
          const cloned = await item?.clone(
            { name: game.i18n.format('DOCUMENT.CopyOf', { name: item.name }) },
            { save: true }
          );
          cloned?.sheet?.render({ force: true });
        },
      },
      {
        label: 'SWADE.Del',
        icon: '<i class="fa-solid fa-trash"></i>',
        onClick: (_event, i) => {
          const itemId = i.dataset.itemId;
          const effectId = i.dataset.effectId;
          if (itemId) this.actor.items.get(itemId)?.deleteDialog();
          if (effectId) {
            const allEffects: ActiveEffect[] = Array.from(this.actor.allApplicableEffects());
            allEffects.find((ef) => ef.id === effectId)?.deleteDialog();
          }
        },
      },
    ];

    new foundry.applications.ux.ContextMenu.implementation(html, 'li.item, li.effect', items, {
      jQuery: false,
      fixed: true,
    });
  }
}

interface NpcSheetRenderContext extends SwadeActorSheetV2.RenderContext {
  additionalStats: AdditionalStats;
  allApplicableEffects: ActiveEffect[];
  armorTooltip: string;
  enrichedBiography: string;
  hasAdditionalStatsFields: boolean;
  itemTypes: Record<string, SwadeItem[]>;
  parryTooltip: string;
  powers: SheetPowers;
  settingrules: Record<string, unknown>;
  sortedSkills: SwadeItem[];
  toughnessTooltip: string;
  useAttributeShorts: boolean;
  wealthDieTypes: DieSidesOption[];
}
