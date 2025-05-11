import {
  AdditionalStats,
  Attribute,
  DieSidesOption,
  LinkedAttribute,
} from '../../globals';
import { Advance } from '../../interfaces/Advance.interface';
import {
  ItemAction,
  RollModifier,
} from '../../interfaces/additional.interface';
import ItemChatCardHelper from '../ItemChatCardHelper';
import { Logger } from '../Logger';
import ActiveEffectWizard from '../apps/ActiveEffectWizard';
import { AdvanceEditor } from '../apps/AdvanceEditor';
import AttributeManager from '../apps/AttributeManager';
import { SwadeActorTweaks } from '../apps/SwadeDocumentTweaks';
import SwadeMeasuredTemplate from '../canvas/SwadeMeasuredTemplate';
import { SWADE } from '../config';
import { constants } from '../constants';
import { VehicleData } from '../data/actor';
import { ActionData } from '../data/item';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { Accordion } from '../style/Accordion';
import * as util from '../util';

export default class CharacterSheet extends foundry.appv1.sheets.ActorSheet {
  _equipStateMenu: ContextMenu;
  _effectCreateDropDown: ContextMenu;
  _accordions: Record<string, { object: Accordion; open: boolean }> = {};

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swade-official', 'sheet', 'actor'],
      width: game.settings.get('swade', 'charSheetDefaultWidth'),
      height: 700,
      resizable: true,
      scrollY: ['section.tab'],
      tabs: [
        {
          group: 'primary',
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'summary',
        },
        {
          group: 'about',
          navSelector: '.about-tabs',
          contentSelector: '.about-body',
          initial: 'advances',
        },
      ],
    });
  }

  override get template(): string {
    const base = 'systems/swade/templates/actors/character/';
    if (this.actor.limited) return base + 'limited.hbs';
    return base + 'sheet.hbs';
  }

  override activateListeners(jquery: JQuery<HTMLFormElement>): void {
    super.activateListeners(jquery);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    const html = jquery[0];

    this.#disableOverrides(html);
    this.#setupEquipStatusMenu(html);
    this.#setupEffectCreateMenu(html);
    this.#setupItemContextMenu(html);
    this.#setupAccordions(html);

    // Input focus and update
    const inputs = html.querySelectorAll('input');
    inputs.forEach((el) =>
      el.addEventListener('focus', (ev) => ev.currentTarget.select()),
    );

    html
      .querySelector('[name="system.details.currency"]')
      ?.addEventListener('change', this._onChangeInputDelta.bind(this));

    // Drag events for macros.
    html.querySelectorAll('li.item, .attribute').forEach((el) => {
      // Add draggable attribute and dragstart listener.
      el.draggable = true;
      el.addEventListener('dragstart', this._onDragStart.bind(this), false);
    });

    html
      .querySelectorAll('.status input[type="checkbox"]')
      .forEach((el) =>
        el.addEventListener('change', this._toggleStatusEffect.bind(this)),
      );

    //Display Advances on About tab
    html
      .querySelector('.character-detail.advances a')
      ?.addEventListener('click', async () => {
        this.activateTab('about', { group: 'primary' });
        this.activateTab('advances', { group: 'about' });
      });

    //Toggle Conviction
    html
      .querySelector('.conviction-toggle')
      ?.addEventListener('click', async () => {
        await this.actor.toggleConviction();
      });

    //Roll Attribute
    html.querySelectorAll('.attribute button').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const attribute = ev.currentTarget.dataset.attribute as Attribute;
        await this.actor.rollAttribute(attribute);
      }),
    );

    html.querySelector('.attribute-manager')?.addEventListener('click', () => {
      new AttributeManager(this.actor).render(true);
    });

    // Roll Skill
    html.querySelectorAll('.skill-card .skill-die').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const element = ev.currentTarget as HTMLElement;
        const item = element.parentElement!.dataset.itemId!;
        await this.actor.rollSkill(item);
      }),
    );

    //Running Die
    html.querySelector('.running-die')?.addEventListener('click', async () => {
      await this.actor.rollRunningDie();
    });

    // Roll Damage
    html.querySelectorAll('.damage-roll').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const id = ev.currentTarget.closest('.item')?.dataset.itemId;
        await this.actor.items.get(id)?.rollDamage();
      }),
    );

    // Use Consumable
    html.querySelectorAll('.use-consumable').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const id = ev.currentTarget.closest('.item')?.dataset.itemId;
        await this.actor.items.get(id)?.consume();
      }),
    );

    //Edit Item
    html.querySelectorAll('.item-edit').forEach((el) =>
      el.addEventListener('click', (ev) => {
        const li = ev.currentTarget.closest('.item');
        const item = this.actor.items.get(li?.dataset.itemId, { strict: true });
        item.sheet?.render(true);
      }),
    );

    //Show Item
    html.querySelectorAll('.item-show').forEach((el) =>
      el.addEventListener('click', (ev) => {
        const li = ev.currentTarget.closest('.item');
        const item = this.actor.items.get(li?.dataset.itemId, { strict: true });
        item.show();
      }),
    );

    // Delete Item
    html.querySelectorAll('.item-delete').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const li = ev.currentTarget.closest('.item');
        const item = this.actor.items.get(li?.dataset.itemId);
        item?.deleteDialog();
      }),
    );

    html.querySelectorAll('.item-create').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        this._inlineItemCreate(ev.currentTarget as HTMLButtonElement);
      }),
    );

    //Item toggles
    html.querySelectorAll('.item-toggle').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const target = ev.currentTarget;
        const li = target.closest('.item');
        const itemID = li?.dataset.itemId;
        const item = this.actor.items.get(itemID, { strict: true });
        const toggle = target.dataset.toggle as string;
        await item.update(this._toggleItem(item, toggle));
      }),
    );

    html.querySelectorAll('.effect-action').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const a = ev.currentTarget;
        const effectId = a.closest('.effect')!.dataset.effectId as string;
        const sourceId = a.closest('.effect')!.dataset.sourceId as string;
        const sourceItem = this.actor.items.get(sourceId)!;
        const effect = sourceId
          ? (sourceItem.effects.get(effectId) as SwadeActiveEffect)
          : (this.actor.effects.get(effectId) as SwadeActiveEffect);
        if (!effect) return;
        const action = a.dataset.action as string;
        const toggle = a.dataset.toggle as string;
        if (!effect) return;

        switch (action) {
          case 'edit':
            return effect.sheet?.render({ force: true });
          case 'delete':
            return effect.deleteDialog();
          case 'toggle':
            return effect.update(this._toggleItem(effect, toggle));
          case 'open-origin':
            if (sourceItem) {
              sourceItem.sheet?.render(true);
            }
            return;
          default:
            Logger.warn(`The action ${action} is not currently supported`);
            break;
        }
      }),
    );

    html.querySelector('.armor-display')?.addEventListener('click', () => {
      const armorPropertyPath = 'system.stats.toughness.armor';
      const armorValue = foundry.utils.getProperty(
        this.actor,
        armorPropertyPath,
      );
      const label = game.i18n.localize('SWADE.Armor');
      const template = `
      <form><div class="form-group">
        <label>${game.i18n.format('SWADE.EdF', { item: label })}</label>
        <input name="modifier" value="${armorValue}" type="number"/>
      </div></form>`;

      foundry.applications.api.DialogV2.wait({
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
            callback: (html: HTMLElement) => {
              const newData = {};
              newData[armorPropertyPath] = html.querySelector(
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
    });

    html.querySelector('.parry-display')?.addEventListener('click', () => {
      const parryPropertyPath = 'system.stats.parry.shield';
      const parryMod = foundry.utils.getProperty(
        this.actor,
        parryPropertyPath,
      ) as number;
      const label = game.i18n.localize('SWADE.ShieldBonus');
      const template = `
      <form><div class="form-group">
        <label>${game.i18n.format('SWADE.EdF', { item: label })}</label>
        <input name="modifier" value="${parryMod}" type="number"/>
      </div></form>`;

      foundry.applications.api.DialogV2.wait({
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
            callback: (html: HTMLElement) => {
              const newData = {};
              newData[parryPropertyPath] = html.querySelector(
                'input[name="modifier"]',
              )?.value as number;
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
    });

    //Item Action Buttons
    html
      .querySelectorAll('.card-buttons button')
      .forEach((el) =>
        el.addEventListener('click', this._handleItemActions.bind(this)),
      );

    //Additional Stats roll
    html.querySelectorAll('.additional-stats .roll').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        const button = ev.currentTarget;
        const stat = button.dataset.stat!;
        await this.actor.system.rollAdditionalStat(stat);
      }),
    );

    //Wealth Die Roll
    html
      .querySelector('.currency .roll')
      ?.addEventListener('click', () => this.actor.rollWealthDie());

    //Advances
    html.querySelectorAll('.advance-action').forEach((el) =>
      el.addEventListener('click', async (ev) => {
        if (this.actor.type === 'vehicle') return;
        const button = ev.currentTarget;
        const id = button.closest('li.advance')?.dataset.advanceId;
        switch (button.dataset.action) {
          case 'edit':
            new AdvanceEditor({
              advance: this.actor.system.advances.list.get(id, {
                strict: true,
              }),
              actor: this.actor,
            }).render(true);
            break;
          case 'delete':
            await this.#deleteAdvance(id);
            break;
          case 'toggle-planned':
            await this.#toggleAdvancePlanned(id);
            break;
          default:
            throw new Error(`Action ${button.dataset.action} not supported`);
        }
      }),
    );

    html
      .querySelector<HTMLImageElement>('.profile-img')
      ?.addEventListener('contextmenu', () => {
        if (!this.actor.img) return;
        new ImagePopout({
          src: this.actor.img,
          title: this.actor.name!,
          shareable: this.actor.isOwner ?? game.user?.isGM,
          uuid: this.actor.uuid,
        }).render(true);
      });

    html
      .querySelectorAll<HTMLButtonElement>('.adjust-counter')
      .forEach((el) =>
        el.addEventListener('click', this._handleCounterAdjust.bind(this)),
      );

    html
      .querySelectorAll<HTMLButtonElement>(
        '.character-detail.ancestry button, .character-detail.archetype button',
      )
      .forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          const id = ev.currentTarget.dataset.itemId as string;
          this.actor.items.get(id)?.sheet?.render(true);
        });
      });

    html
      .querySelector('.stat.size input')
      ?.addEventListener('mouseenter', (event) => {
        game.tooltip.deactivate();
        game.tooltip.activate(event.target as HTMLElement, {
          html: this.actor.system.getSizeTooltip(),
        });
      });

    html
      .querySelector('.stat.pace input')
      ?.addEventListener('mouseenter', (event) => {
        game.tooltip.deactivate();
        game.tooltip.activate(event.target as HTMLElement, {
          html: this.actor.system.getPaceTooltip(),
        });
      });
  }

  override async getData(
    options?: Partial<DocumentSheetOptions>,
  ): Promise<SwadeActorSheetData> {
    if (this.actor.system instanceof VehicleData) throw new Error();

    //retrieve the items and sort them by their sort value
    const items = Array.from(this.actor.items.contents as SwadeItem[]).sort(
      (a, b) => a.sort - b.sort,
    );
    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    for (const item of items) {
      // Basic template rendering data
      const system = item.system;
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
        item.type === 'weapon' &&
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

      const enrichedDescription = await TextEditor.enrichHTML(
        item.system.description,
        itemEnrichmentOptions,
      );

      const enrichedNotes = await TextEditor.enrichHTML(
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
      if (item.type === 'power')
        foundry.utils.setProperty(item, 'powerPoints', item.powerPointObject);
    }

    const itemTypes: Record<string, SwadeItem[]> = {};
    const hiddenActionOverride = this.actor.getFlag(
      'swade',
      'hiddenActionOverride',
    );
    for (const item of items) {
      const type = item.type;
      itemTypes[type] ??= [];
      if (
        item.system instanceof ActionData &&
        item.system.hidden &&
        !hiddenActionOverride
      ) {
        continue; //do not display hidden actions
      }
      itemTypes[type].push(item);
    }

    const additionalStats = this.#getAdditionalStats();

    const data: SwadeActorSheetData = {
      itemTypes: itemTypes,
      parryTooltip: this.actor.getPTTooltip('parry'),
      toughnessTooltip: this.actor.getPTTooltip('toughness'),
      armorTooltip: this.actor.getArmorTooltip(),
      skills: await this.#getSkillsForDisplay(),
      powers: this.#getPowers(),
      additionalStats: additionalStats,
      hasAdditionalStats: !foundry.utils.isEmpty(additionalStats),
      currentBennies: Array.fromRange(this.actor.bennies, 1),
      bennyImageURL: game.settings.get('swade', 'bennyImageSheet'),
      useAttributeShorts: game.settings.get('swade', 'useAttributeShorts'),
      sheetEffects: await this._getEffects(),
      enrichedText: await this._getEnrichedText(),
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
      advances: {
        expanded: this.actor.system.advances.mode === 'expanded',
        list: await this.#getAdvances(),
      },
      // Putting this at the end because of race condition for grandchild updates
      attributes: this.#getAttributesForDisplay(),
      wealthDieTypes: this.#getWealthDieTypes(),
    };
    return { ...(await super.getData(options)), ...data };
  }

  protected override async _render(...args): Promise<void> {
    await super._render(...args);
    for (const accordion of Object.values(this._accordions)) {
      if (accordion.open && accordion.object.el) {
        await this.#onOpenAccordion(accordion.object.el);
        accordion.object.el.open = true;
      }
    }
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
      if (typesToRender.includes(item.type)) item.sheet?.render(true);
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
  protected override _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Document Tweaks
    if (this.options.editable && this.actor.isOwner) {
      const tweaks: Application.HeaderButton = {
        label: game.i18n.localize('SWADE.Tweaks'),
        class: 'configure-actor',
        icon: 'fa-solid fa-gears',
        onclick: () =>
          new SwadeActorTweaks({ document: this.actor }).render({
            force: true,
          }),
      };

      buttons = [tweaks, ...buttons];
    }
    return buttons;
  }

  protected _toggleItem(
    doc: SwadeItem | SwadeActiveEffect,
    toggle: string,
  ): Record<string, boolean> {
    const oldVal = !!foundry.utils.getProperty(doc, toggle);
    return { [toggle]: !oldVal };
  }

  protected async _chooseItemType(choices?: any) {
    if (!choices) {
      choices = {
        weapon: game.i18n.localize('TYPES.Item.weapon'),
        armor: game.i18n.localize('TYPES.Item.armor'),
        shield: game.i18n.localize('TYPES.Item.shield'),
        gear: game.i18n.localize('TYPES.Item.gear'),
        effect: 'Active Effect',
      };
    }
    const templateData = {
        types: choices,
        hasTypes: true,
        name: game.i18n.format('DOCUMENT.New', {
          type: game.i18n.localize('DOCUMENT.Item'),
        }),
      },
      dlg = await renderTemplate(
        'templates/sidebar/document-create.html',
        templateData,
      );
    //Create Dialog window
    return new Promise((resolve) => {
      foundry.applications.api.DialogV2.wait({
        window: {
          title: game.i18n.format('DOCUMENT.Create', {
            type: game.i18n.localize('DOCUMENT.Item'),
          }),
        },
        content: dlg,
        buttons: [
          {
            action: 'ok',
            label: 'OK',
            icon: '<i class="fas fa-check"></i>',
            default: true,
            callback: (html: HTMLElement) => {
              resolve({
                type: html.querySelector('select[name="type"]')?.value,
                name: html.querySelector('input[name="name"]')?.value,
              });
            },
          },
          {
            action: 'cancel',
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('Cancel'),
          },
        ],
      });
    });
  }

  protected async _createActiveEffect(
    data: ActiveEffect.CreateData = {
      name: game.i18n.format('DOCUMENT.New', {
        type: game.i18n.localize('DOCUMENT.ActiveEffect'),
      }),
    },
    renderSheet = true,
  ) {
    return getDocumentClass('ActiveEffect').create(data, {
      renderSheet: renderSheet,
      parent: this.actor,
    });
  }

  protected async _getEnrichedText(): Promise<
    SwadeActorSheetData['enrichedText']
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
          value: modifier.signedString(),
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

  protected async _inlineItemCreate(button: HTMLButtonElement) {
    const type = button.dataset.type as Item.SubType | 'choice' | 'advance';
    // item creation helper func
    const createItem = (type: Item.SubType, name?: string) => {
      const itemData = {
        name: name ?? SwadeItem.defaultName({ type, parent: this.actor }),
        type: type,
        system: Object.assign({}, button.dataset),
      };
      delete itemData.system.type;
      return itemData;
    };
    switch (type) {
      case 'choice':
        this._chooseItemType().then(async (dialogInput: any) => {
          if (dialogInput.type === 'effect') {
            this._createActiveEffect({ name: dialogInput.name });
          } else {
            const itemData = createItem(dialogInput.type, dialogInput.name);
            await CONFIG.Item.documentClass.create(itemData, {
              renderSheet: true,
              parent: this.actor,
            });
          }
        });
        break;
      case 'advance':
        this.#addAdvance();
        break;
      default:
        await CONFIG.Item.documentClass.create(createItem(type), {
          renderSheet: true,
          parent: this.actor,
        });
        break;
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

  protected async _toggleStatusEffect(ev: JQuery.ChangeEvent) {
    const key = ev.target.dataset.key as string;
    // this is just to make sure the status is false in the source data
    await this.actor.update({ [`system.status.${key}`]: false });
    await this.actor.toggleActiveEffect(ev.target.dataset.id as string);
  }

  protected async _handleCounterAdjust(ev: PointerEvent) {
    const target = ev.currentTarget as HTMLElement;
    const action = target.dataset.action;

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

  async #addAdvance() {
    if (this.actor.type === 'vehicle') return;
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
    }).render(true);
  }

  async #deleteAdvance(id: string) {
    if (this.actor.type === 'vehicle') return;
    foundry.applications.api.DialogV2.confirm({
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
          if (this.actor.type === 'vehicle') return;
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
    if (this.actor.type === 'vehicle') return;
    foundry.applications.api.DialogV2.confirm({
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
          if (this.actor.type === 'vehicle') return;
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
    if (this.actor.type === 'vehicle') return [];
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
    return TextEditor.enrichHTML(text, {
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
              typeof value === 'number' ? value.signedString() : value;
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
              typeof value === 'number' ? value.signedString() : value;
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
    const items: ContextMenu.Entry[] = [
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
    this._equipStateMenu = new ContextMenu(html, selector, items, options);
  }

  #setupEffectCreateMenu(html: HTMLElement) {
    this._effectCreateDropDown = new ContextMenu(
      html,
      '.effects .effect-add',
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
      { eventName: 'click', jQuery: false },
    );
  }

  #setupItemContextMenu(html: HTMLElement) {
    const items: ContextMenu.Entry[] = [
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
          if (itemId) this.actor.items.get(itemId)?.sheet?.render(true);
          if (effectId)
            this.actor.effects.get(effectId)?.sheet?.render({ force: true });
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
          cloned?.sheet?.render(true);
        },
      },
      {
        name: 'SWADE.Del',
        icon: '<i class="fa-solid fa-trash"></i>',
        callback: (i) => {
          const itemId = i.dataset.itemId;
          const effectId = i.dataset.effectId;
          if (itemId) this.actor.items.get(itemId)?.deleteDialog();
          if (effectId) this.actor.effects.get(effectId)?.deleteDialog();
        },
      },
    ];

    ContextMenu.create(this, html, 'li.item', items, { jQuery: false });
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

type OptionsPartial = Partial<ActorSheet<DocumentSheetOptions<SwadeActor>>>;

interface SwadeActorSheetData extends OptionsPartial {
  attributes: Record<string, TraitDisplay>;
  skills: SkillDisplay[];
  itemTypes: Record<string, SwadeItem[]>;
  parryTooltip: string;
  toughnessTooltip: string;
  armorTooltip: string;
  settingrules: Record<string, unknown>;
  currentBennies: number[];
  powers: SheetPowers;
  hasAdditionalStats: boolean;
  additionalStats: AdditionalStats;
  bennyImageURL: string;
  useAttributeShorts: boolean;
  enrichedText: {
    appearance: string;
    goals: string;
    notes: string;
    biography: string;
    advances?: string;
  };
  advances: {
    expanded: boolean;
    list: Array<{
      rank: string;
      list: Advance[];
    }>;
  };
  sheetEffects: {
    temporary: SheetEffect[];
    permanent: SheetEffect[];
    favorite: SheetEffect[];
  };
  wealthDieTypes: DieSidesOption[];
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
