import { ActiveEffectDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/activeEffectData';
import { AdditionalStats, Attribute } from '../../../globals';
import {
  ItemAction,
  TraitRollModifier,
} from '../../../interfaces/additional.interface';
import { Advance } from '../../../interfaces/Advance.interface';
import ActiveEffectWizard from '../../apps/ActiveEffectWizard';
import { AdvanceEditor } from '../../apps/AdvanceEditor';
import AttributeManager from '../../apps/AttributeManager';
import SwadeDocumentTweaks from '../../apps/SwadeDocumentTweaks';
import { SWADE } from '../../config';
import { constants } from '../../constants';
import SwadeActiveEffect from '../../documents/active-effect/SwadeActiveEffect';
import SwadeItem from '../../documents/item/SwadeItem';
import SwadeMeasuredTemplate from '../../documents/SwadeMeasuredTemplate';
import ItemChatCardHelper from '../../ItemChatCardHelper';
import { Logger } from '../../Logger';
import PopUpMenu from '../../PopUpMenu';
import * as util from '../../util';

export default class CharacterSheet extends ActorSheet<
  DocumentSheetOptions,
  SwadeActorSheetData
> {
  _equipStateMenu: PopUpMenu;
  _effectCreateDropDown: ContextMenu;

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swade-official', 'sheet', 'actor'],
      width: 650,
      height: 700,
      resizable: true,
      scrollY: ['section.tab'],
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'summary',
        },
        {
          navSelector: '.about-tabs',
          contentSelector: '.about-body',
          initial: 'advances',
        },
      ],
    });
  }

  get template(): string {
    const base = 'systems/swade/templates/official/';
    if (this.actor.limited) return base + 'limited.hbs';
    return base + 'sheet.hbs';
  }

  override activateListeners(html: JQuery<HTMLFormElement>): void {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    this._setupEquipStatusMenu(html);
    this._setupEffectCreateMenu(html);
    this._setupItemContextMenu(html);

    this.form?.addEventListener('keypress', (ev: KeyboardEvent) => {
      const target = ev.target as HTMLButtonElement;
      const targetIsButton = 'button' === target?.type;
      if (!targetIsButton && ev.key === 'Enter') {
        ev.preventDefault();
        this.submit({ preventClose: true });
        return false;
      }
    });

    // Input focus and update
    const inputs = html.find('input');
    inputs.on('focus', (ev) => ev.currentTarget.select());

    inputs
      .addBack()
      .find('[data-dtype="Number"]')
      .on('change', this._onChangeInputDelta.bind(this));

    // Drag events for macros.
    // Find all items on the character sheet.
    html.find('li.item').each((i, li) => {
      // Add draggable attribute and dragstart listener.
      li.setAttribute('draggable', 'true');
      li.addEventListener('dragstart', (ev) => this._onDragStart(ev), false);
    });

    html
      .find('.status input[type="checkbox"]')
      .on('change', this._toggleStatusEffect.bind(this));

    //Display Advances on About tab
    html.find('.character-detail.advances a').on('click', async () => {
      this._tabs[0].activate('about');
      this._tabs[1].activate('advances');
    });

    //Toggle Conviction
    html.find('.conviction-toggle').on('click', async () => {
      await this.actor.toggleConviction();
    });

    //Roll Attribute
    html.find('.attribute button').on('click', async (ev) => {
      const attribute = ev.currentTarget.dataset.attribute as Attribute;
      await this.actor.rollAttribute(attribute);
    });

    html.find('.attribute-manager').on('click', () => {
      new AttributeManager(this.actor).render(true);
    });

    //Toggle Equipment Card collapsible
    html.find('.skill-card .skill-name.item-name').on('click', (ev) => {
      $(ev.currentTarget)
        .parents('.item.skill.skill-card')
        .find('.card-content')
        .slideToggle();
    });

    // Roll Skill
    html.find('.skill-card .skill-die').on('click', async (ev) => {
      const element = ev.currentTarget as HTMLElement;
      const item = element.parentElement!.dataset.itemId!;
      await this.actor.rollSkill(item);
    });

    //Running Die
    html.find('.running-die').on('click', async () => {
      await this.actor.rollRunningDie();
    });

    // Roll Damage
    html.find('.damage-roll').on('click', async (ev) => {
      const id = $(ev.currentTarget).parents('.item').data('itemId');
      await this.actor.items.get(id)?.rollDamage();
    });

    // Use Consumable
    html.find('.use-consumable').on('click', async (ev) => {
      const id = $(ev.currentTarget).parents('.item').data('itemId');
      await this.actor.items.get(id)?.consume();
    });

    //Toggle Equipment Card collapsible
    html.find('.gear-card .item-name').on('click', (ev) => {
      $(ev.currentTarget)
        .parents('.gear-card')
        .find('.card-content')
        .slideToggle();
    });

    //Edit Item
    html.find('.item-edit').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'), { strict: true });
      item.sheet?.render(true);
    });

    //Show Item
    html.find('.item-show').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'), { strict: true });
      item.show();
    });

    // Delete Item
    html.find('.item-delete').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item?.deleteDialog();
    });

    html.find('.item-create').on('click', async (ev) => {
      this._inlineItemCreate(ev.currentTarget as HTMLButtonElement);
    });

    //Item toggles
    html.find('.item-toggle').on('click', async (ev) => {
      const target = ev.currentTarget;
      const li = $(target).parents('.item');
      const itemID = li.data('itemId');
      const item = this.actor.items.get(itemID, { strict: true });
      const toggle = target.dataset.toggle as string;
      await item.update(this._toggleItem(item, toggle));
    });

    html.find('.effect-action').on('click', async (ev) => {
      const a = ev.currentTarget;
      const effectId = a.closest('li')!.dataset.effectId as string;
      const effect = this.actor.effects.get(effectId, { strict: true });
      const action = a.dataset.action as string;
      const toggle = a.dataset.toggle as string;
      let item: SwadeItem | null = null;

      switch (action) {
        case 'edit':
          return effect.sheet?.render(true);
        case 'delete':
          return effect.deleteDialog();
        case 'toggle':
          return effect.update(this._toggleItem(effect, toggle));
        case 'open-origin':
          item = (await fromUuid(effect.data.origin!)) as SwadeItem;
          if (item) item?.sheet?.render(true);
          break;
        default:
          Logger.warn(`The action ${action} is not currently supported`);
          break;
      }
    });

    html.find('.item .item-name').on('click', (ev) => {
      $(ev.currentTarget).parents('.item').find('.description').slideToggle();
    });

    html.find('.armor-display').on('click', () => {
      const armorPropertyPath = 'system.stats.toughness.armor';
      const armorvalue = getProperty(this.actor, armorPropertyPath);
      const label = game.i18n.localize('SWADE.Armor');
      const template = `
      <form><div class="form-group">
        <label>${game.i18n.localize('SWADE.Ed')} ${label}</label>
        <input name="modifier" value="${armorvalue}" type="number"/>
      </div></form>`;

      new Dialog({
        title: `${game.i18n.localize('SWADE.Ed')} ${this.actor.name} ${label}`,
        content: template,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize('SWADE.Ok'),
            callback: (html: JQuery) => {
              const newData = {};
              newData[armorPropertyPath] = html
                .find('input[name="modifier"]')
                .val();
              this.actor.update(newData);
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('Cancel'),
          },
        },
        default: 'ok',
      }).render(true);
    });

    html.find('.parry-display').on('click', () => {
      const parryPropertyPath = 'system.stats.parry.modifier';
      const parryMod = getProperty(this.actor, parryPropertyPath) as number;
      const label = game.i18n.localize('SWADE.Parry');
      const template = `
      <form><div class="form-group">
        <label>${game.i18n.localize('SWADE.Ed')} ${label}</label>
        <input name="modifier" value="${parryMod}" type="number"/>
      </div></form>`;

      new Dialog({
        title: `${game.i18n.localize('SWADE.Ed')} ${this.actor.name} ${label}`,
        content: template,
        buttons: {
          ok: {
            icon: '<i class="fas fa-check"></i>',
            label: game.i18n.localize('SWADE.Ok'),
            callback: (html: JQuery) => {
              const newData = {};
              newData[parryPropertyPath] = html
                .find('input[name="modifier"]')
                .val() as number;
              this.actor.update(newData);
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('Cancel'),
          },
        },
        default: 'ok',
      }).render(true);
    });

    //Item Action Buttons
    html
      .find('.card-buttons button')
      .on('click', this._handleItemActions.bind(this));

    //Additional Stats roll
    html.find('.additional-stats .roll').on('click', async (ev) => {
      const button = ev.currentTarget;
      const stat = button.dataset.stat!;
      const statData = this.actor.system.additionalStats[stat]!;
      let modifier = statData.modifier || '';
      if (!!modifier && !modifier.match(/^[+-]/)) {
        modifier = '+' + modifier;
      }
      //return early if there's no data to roll
      if (!statData.value) return;
      const roll = new Roll(
        `${statData.value}${modifier}`,
        this.actor.getRollData(),
      );
      await roll.evaluate({ async: true });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: statData.label,
      });
    });

    //Wealth Die Roll
    html.find('.currency .roll').on('click', () => this.actor.rollWealthDie());

    //Advances
    html.find('.advance-action').on('click', (ev) => {
      if (this.actor.type === 'vehicle') return;
      const button = ev.currentTarget;
      const id = $(button).parents('li.advance').data().advanceId;
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
          this._deleteAdvance(id);
          break;
        case 'toggle-planned':
          this._toggleAdvancePlanned(id);
          break;
        default:
          throw new Error(`Action ${button.dataset.action} not supported`);
      }
    });

    html[0]
      .querySelector<HTMLImageElement>('.profile-img')
      ?.addEventListener('contextmenu', () => {
        if (!this.actor.img) return;
        new ImagePopout(this.actor.img, {
          title: this.actor.name!,
          shareable: this.actor.isOwner ?? game.user?.isGM,
        }).render(true);
      });

    html[0]
      .querySelectorAll('.adjust-counter')
      .forEach((el) =>
        el.addEventListener('click', this._handleCounterAdjust.bind(this)),
      );

    html[0]
      .querySelectorAll(
        '.character-detail.race button, .character-detail.archetype button',
      )
      .forEach((btn) => {
        btn.addEventListener('click', (ev) => {
          const id = ev.currentTarget.dataset.itemId as string;
          this.actor.items.get(id)?.sheet?.render(true);
        });
      });
  }

  override async getData(
    options?: Partial<DocumentSheetOptions>,
  ): Promise<SwadeActorSheetData> {
    if (this.actor.type === 'vehicle') return super.getData(options);

    //retrieve the items and sort them by their sort value
    const items = Array.from(this.actor.items.values()).sort(
      (a, b) => a.sort - b.sort,
    );

    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    for (const item of items) {
      // Basic template rendering data
      const system = item.system;
      const itemActions = getProperty(system, 'actions.additional') ?? {};
      const actions = new Array<any>();

      for (const action in itemActions) {
        actions.push({
          key: action,
          type: itemActions[action].type,
          name: itemActions[action].name,
        });
      }
      const hasDamage =
        !!getProperty(system, 'damage') ||
        !!actions.find((action) => action.type === 'damage');
      const skill =
        getProperty(system, 'actions.skill') ||
        !!actions.find((action) => action.type === 'skill');
      const hasSkillRoll =
        ['weapon', 'power', 'shield', 'action'].includes(item.type) &&
        getProperty(system, 'actions.skill');
      const hasActionRoll = ['action'].includes(item.type);
      const hasAmmoManagement =
        ammoManagement &&
        item.type === 'weapon' &&
        !item.isMeleeWeapon &&
        system.reloadType !== constants.RELOAD_TYPE.NONE;
      const hasReloadButton =
        ammoManagement &&
        system.shots > 0 &&
        system.reloadType !== constants.RELOAD_TYPE.NONE;

      foundry.utils.setProperty(item, 'actions', actions);
      foundry.utils.setProperty(item, 'hasDamage', hasDamage);
      foundry.utils.setProperty(item, 'skill', skill);
      foundry.utils.setProperty(item, 'hasSkillRoll', hasSkillRoll);
      foundry.utils.setProperty(item, 'hasAmmoManagement', hasAmmoManagement);
      foundry.utils.setProperty(item, 'hasReloadButton', hasReloadButton);
      foundry.utils.setProperty(item, 'hasActionRoll', hasActionRoll);
      if (item.type === 'power') {
        const powerPoints = this._getPowerPoints(item);
        foundry.utils.setProperty(item, 'powerPoints', powerPoints);
      }
    }

    const itemTypes: Record<string, SwadeItem[]> = {};
    for (const item of items) {
      const type = item.type;
      if (!itemTypes[type]) itemTypes[type] = [];
      itemTypes[type].push(item);
    }

    const parry = this.actor.itemTypes.shield.reduce((acc, cur) => {
      if (
        cur.type !== 'shield' &&
        cur.system.equipStatus === constants.EQUIP_STATE.EQUIPPED
      ) {
        return (acc += cur.system.parry);
      }
      return acc;
    }, 0);

    const additionalStats = this._getAdditionalStats();

    const data: SwadeActorSheetData = {
      itemTypes: itemTypes,
      parry: parry,
      powers: this._getPowers(),
      additionalStats: additionalStats,
      hasAdditionalStats: !foundry.utils.isEmpty(additionalStats),
      currentBennies: Array.fromRange(this.actor.bennies, 1),
      bennyImageURL: game.settings.get('swade', 'bennyImageSheet'),
      useAttributeShorts: game.settings.get('swade', 'useAttributeShorts'),
      sortedSkills: this.actor.itemTypes.skill.sort((a, b) =>
        a.name!.localeCompare(b.name!),
      ),
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
        list: this._getAdvances(),
      },
    };

    return foundry.utils.mergeObject(await super.getData(options), data);
  }

  protected override async _onDropItem(
    event: DragEvent,
    data: ActorSheet.DropData.Item,
  ): Promise<unknown> {
    await super._onDropItem(event, data);
    const item = (await fromUuid(data.uuid)) as SwadeItem;
    //check if it's the proper type and subtype
    if (item.type !== 'ability') return;
    const subType = item.system.subtype;
    if (subType === 'special') return;

    //process embedded documents
    const map = item.embeddedAbilities;
    const creationData = new Array<any>();
    const duplicates = new Array<{ type: string; name: string }>();
    for (const entry of map.values()) {
      const existingItems = this.actor.items.filter(
        (i) => i.type === entry.type && i.name === entry.name,
      );
      if (existingItems.length > 0) {
        duplicates.push({
          type: game.i18n.localize(`ITEM.Type${entry.type.capitalize()}`),
          name: entry.name,
        });
        entry.name += ` (${item.name})`;
      }
      creationData.push(entry);
    }
    if (creationData.length > 0) {
      await this.actor.createEmbeddedDocuments('Item', creationData, {
        //@ts-expect-error Normally the flag is a boolean
        renderSheet: null,
      });
    }
    if (duplicates.length > 0) {
      Dialog.prompt({
        title: game.i18n.localize('SWADE.Duplicates'),
        rejectClose: false,
        content: await renderTemplate(
          '/systems/swade/templates/apps/duplicate-items-dialog.hbs',
          {
            duplicates: duplicates.sort((a, b) => a.type.localeCompare(b.type)),
            bodyText: game.i18n.format('SWADE.DuplicateItemsBodyText', {
              type: game.i18n.localize(SWADE.abilitySheet[subType].dropdown),
              name: item.name,
              target: this.actor.name,
            }),
          },
        ),
        callback: () => {},
      });
    }
  }

  private _getAdvances() {
    if (this.actor.type === 'vehicle') return [];
    const retVal = new Array<{ rank: string; list: Advance[] }>();
    const advances = this.actor.system.advances.list;
    for (const advance of advances) {
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

  protected _getPowerPoints(item: SwadeItem) {
    if (item.type === 'power' && item.actor) {
      const arcane = item.system.arcane;
      let current = getProperty(item.actor, 'system.powerPoints.value');
      let max = getProperty(item.actor, 'system.powerPoints.max');
      if (arcane) {
        current = getProperty(item.actor, `system.powerPoints.${arcane}.value`);
        max = getProperty(item.actor, `system.powerPoints.${arcane}.max`);
      }
      return { current, max };
    }
  }

  /** Extend and override the sheet header buttons */
  protected override _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Document Tweaks
    if (this.options.editable && this.actor.isOwner) {
      const button = {
        label: game.i18n.localize('SWADE.Tweaks'),
        class: 'configure-actor',
        icon: 'fas fa-dice',
        onclick: () => new SwadeDocumentTweaks(this.actor).render(true),
      };
      buttons = [button, ...buttons];
    }
    return buttons;
  }

  protected _toggleItem(
    doc: SwadeItem | SwadeActiveEffect,
    toggle: string,
  ): Record<string, unknown> {
    const oldVal = !!getProperty(doc, toggle);
    return { _id: doc.id, [toggle]: !oldVal };
  }

  protected async _chooseItemType(choices?: any) {
    if (!choices) {
      choices = {
        weapon: game.i18n.localize('ITEM.TypeWeapon'),
        armor: game.i18n.localize('ITEM.TypeArmor'),
        shield: game.i18n.localize('ITEM.TypeShield'),
        gear: game.i18n.localize('ITEM.TypeGear'),
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
      new Dialog({
        title: game.i18n.format('DOCUMENT.Create', {
          type: game.i18n.localize('DOCUMENT.Item'),
        }),
        content: dlg,
        buttons: {
          ok: {
            label: 'OK',
            icon: '<i class="fas fa-check"></i>',
            callback: (html: JQuery) => {
              resolve({
                type: html.find('select[name="type"]').val(),
                name: html.find('input[name="name"]').val(),
              });
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('Cancel'),
          },
        },
        default: 'ok',
      }).render(true);
    });
  }

  protected async _createActiveEffect(
    data: ActiveEffectDataConstructorData = {
      label: game.i18n.format('DOCUMENT.New', {
        type: game.i18n.localize('DOCUMENT.ActiveEffect'),
      }),
    },
    renderSheet = true,
  ) {
    return CONFIG.ActiveEffect.documentClass.create(data, {
      renderSheet: renderSheet,
      parent: this.actor,
    });
  }

  protected async _getEnrichedText(): Promise<
    SwadeActorSheetData['enrichedText']
  > {
    return {
      appearance: await this._enrichText(this.actor.system.details.appearance),
      goals: await this._enrichText(this.actor.system.details.goals),
      biography: await this._enrichText(
        this.actor.system.details.biography.value,
      ),
      notes: await this._enrichText(this.actor.system.details.notes),
      advances: await this._enrichText(this.actor.system.advances.details),
    };
  }

  private async _enrichText(text: string) {
    return TextEditor.enrichHTML(text, {
      async: false,
      secrets: this.options.editable,
    });
  }

  protected async _getEffects() {
    const temporary = new Array<SheetEffect>();
    const permanent = new Array<SheetEffect>();
    for (const effect of this.actor.effects) {
      const val: SheetEffect = {
        id: effect.id!,
        label: effect.label,
        icon: effect.icon,
        disabled: effect.disabled,
        favorite: effect.getFlag('swade', 'favorite') ?? false,
      };
      if (effect.origin) {
        val.origin = await effect.getSourceName();
      }
      if (effect.isTemporary) {
        temporary.push(val);
      } else {
        permanent.push(val);
      }
    }
    return { temporary, permanent };
  }

  protected async _handleItemActions(ev: JQuery.ClickEvent) {
    const button = ev.currentTarget as HTMLButtonElement;
    const action = button.dataset.action!;
    const itemId = $(button).parents('.chat-card.item-card').data().itemId;
    const item = this.actor.items.get(itemId, { strict: true });
    const additionalMods = new Array<TraitRollModifier>();
    const ppToAdjust = $(button)
      .parents('.chat-card.item-card')
      .find('input.pp-adjust')
      .val() as string;
    const arcaneDevicePPToAdjust = $(button)
      .parents('.chat-card.item-card')
      .find('input.arcane-device-pp-adjust')
      .val() as string;

    //if it's a power and the No Power Points rule is in effect
    if (item.type === 'power' && game.settings.get('swade', 'noPowerPoints')) {
      let modifier = Math.ceil(parseInt(ppToAdjust, 10) / 2);
      modifier = Math.min(modifier * -1, modifier);
      const actionObj = getProperty(
        item.data,
        `data.actions.additional.${action}.skillOverride`,
      ) as ItemAction;
      //filter down further to make sure we only apply the penalty to a trait roll
      if (action === 'formula' || (!!actionObj && actionObj.type === 'skill')) {
        additionalMods.push({
          label: game.i18n.localize('ITEM.TypePower'),
          value: modifier.signedString(),
        });
      }
    } else if (action === 'pp-adjust') {
      //handle Power Item Card PP adjustment
      const adjustment = button.getAttribute('data-adjust') as string;
      const power = this.actor.items.get(itemId, { strict: true });
      const arcane = getProperty(power, 'system.arcane') || 'general';
      const key = `system.powerPoints.${arcane}.value`;
      let newPP = getProperty(this.actor, key) as number;
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
      let newPP = getProperty(item, key);
      if (adjustment === 'plus') {
        newPP += parseInt(arcaneDevicePPToAdjust, 10);
      } else if (adjustment === 'minus') {
        newPP -= parseInt(arcaneDevicePPToAdjust, 10);
      }
      await item.update({ [key]: newPP });
    } else if (action === 'template') {
      //Handle template placement
      const template = button.dataset.template!;
      SwadeMeasuredTemplate.fromPreset(template);
    } else {
      ItemChatCardHelper.handleAction(item, this.actor, action, additionalMods);
    }
  }

  protected async _inlineItemCreate(button: HTMLButtonElement) {
    const type = button.dataset.type!;
    // item creation helper func
    const createItem = function (
      type: string,
      name: string = `New ${type.capitalize()}`,
    ): any {
      const itemData = {
        name: name ? name : `New ${type.capitalize()}`,
        type: type,
        system: button.dataset,
      };
      delete itemData.system.type;
      return itemData;
    };
    switch (type) {
      case 'choice':
        this._chooseItemType().then(async (dialogInput: any) => {
          if (dialogInput.type === 'effect') {
            this._createActiveEffect({ label: dialogInput.name });
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
        this._addAdvance();
        break;
      default:
        await CONFIG.Item.documentClass.create(createItem(type), {
          renderSheet: true,
          parent: this.actor,
        });
        break;
    }
  }

  private async _addAdvance() {
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

  private async _deleteAdvance(id: string) {
    if (this.actor.type === 'vehicle') return;
    Dialog.confirm({
      title: game.i18n.localize('SWADE.Advances.Delete'),
      content: `<form>
      <div style="text-align: center;">
        <p>Are you sure?</p>
      </div>
    </form>`,
      defaultYes: false,
      yes: () => {
        if (this.actor.type === 'vehicle') return;
        const advances = this.actor.system.advances.list;
        advances.delete(id);
        const arr = advances.toJSON();
        arr.forEach((a, i) => (a.sort = i + 1));
        this.actor.update({ 'system.advances.list': arr });
      },
    });
  }

  private async _toggleAdvancePlanned(id: string) {
    if (this.actor.type === 'vehicle') return;
    Dialog.confirm({
      title: game.i18n.localize('SWADE.Advances.Toggle'),
      content: `<form>
        <div style="text-align: center;">
          <p>Are you sure?</p>
        </div>
      </form>`,
      defaultYes: false,
      yes: () => {
        if (this.actor.type === 'vehicle') return;
        const advances = this.actor.system.advances.list;
        const advance = advances.get(id, { strict: true });
        advance.planned = !advance.planned;
        advances.set(id, advance);
        this.actor.update(
          { 'syste,.advances.list': advances.toJSON() },
          { diff: false },
        );
      },
    });
  }

  private _getAdditionalStats(): AdditionalStats {
    const stats = structuredClone<AdditionalStats>(
      this.actor.system.additionalStats,
    );
    for (const [key, attr] of Object.entries(stats)) {
      if (attr.dtype === 'Selection') {
        const options = game.settings.get('swade', 'settingFields').actor;
        const optionString = options[key].optionString ?? '';
        attr.options = optionString
          .split(';')
          .reduce((a, v) => ({ ...a, [v.trim()]: v.trim() }), {});
      }
    }
    return stats;
  }

  private _getPowers(): SheetPowers {
    //Deal with ABs and Powers
    const arcaneBackgrounds: Record<string, SheetArcaneBackground> = {};

    for (const power of this.actor.itemTypes.power) {
      const ab = power.system.arcane || 'general';
      if (!arcaneBackgrounds[ab]) {
        arcaneBackgrounds[ab] = {
          valuePath: `system.powerPoints.${ab}.value`,
          value: getProperty(this.actor, `system.powerPoints.${ab}.value`),
          maxPath: `system.powerPoints.${ab}.max`,
          max: getProperty(this.actor, `system.powerPoints.${ab}.max`),
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

  /**
   * Handle input changes to numeric form fields, allowing them to accept delta-typed inputs
   * @param {Event} event  Triggering event.
   */
  protected _onChangeInputDelta(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (['+', '-'].includes(value[0])) {
      const delta = parseInt(value, 10);
      input.value = getProperty(this.actor, input.name) + delta;
    } else if (value[0] === '=') {
      input.value = value.slice(1);
    }
  }

  protected async _toggleStatusEffect(ev: JQuery.ChangeEvent) {
    // Get the key from the target name
    const id = ev.target.dataset.id as string;
    const key = ev.target.dataset.key as string;
    const data = util.getStatusEffectDataById(id);
    // this is just to make sure the status is false in the source data
    await this.actor.update({ [`system.status.${key}`]: false });
    await this.actor.toggleActiveEffect(data);
  }

  protected async _handleCounterAdjust(ev: MouseEvent) {
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
        const arcane = target.dataset.arcane;
        const valueKey = 'system.powerPoints.' + arcane + '.value';
        const maxKey = 'system.powerPoints.' + arcane + '.max';
        const currentPP = foundry.utils.getProperty(this.actor, valueKey);
        const maxPP = foundry.utils.getProperty(this.actor, maxKey);
        if (currentPP >= maxPP) return;
        await this.actor.update({
          [valueKey]: Math.min(currentPP + 5, maxPP),
        });
        break;
      }
      default:
        throw new Error('Unknown action!');
    }
  }

  protected _setupEquipStatusMenu(html: JQuery<HTMLElement> = $('body')) {
    const items: ContextMenuEntry[] = [
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.Stored'),
        icon: '<i class="fas fa-archive"></i>',
        condition: true,
        callback: (i: JQuery<HTMLOListElement>) => {
          const id = i.parents('li.item').data().itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.STORED);
        },
      },
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.Carried'),
        icon: '<i class="fas fa-shopping-bag"></i>',
        condition: true,
        callback: (i: JQuery<HTMLOListElement>) => {
          const id = i.parents('li.item').data().itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.CARRIED);
        },
      },
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.Equipped'),
        icon: '<i class="fas fa-tshirt"></i>',
        condition: (i: JQuery<HTMLOListElement>) => {
          const id = i.parents('li.item').data().itemId;
          const item = this.actor.items.get(id, { strict: true });
          if (item.type === 'gear') return item.system.equippable;
          return !['weapon', 'consumable'].includes(item.type);
        },
        callback: (i: JQuery<HTMLOListElement>) => {
          const id = i.parents('li.item').data().itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.EQUIPPED);
        },
      },
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.OffHand'),
        icon: '<i class="fas fa-hand-paper"></i>',
        condition: (i: JQuery<HTMLOListElement>) => {
          const id = i.parents('li.item').data().itemId;
          const item = this.actor.items.get(id, { strict: true });
          return item.type === 'weapon';
        },
        callback: (i: JQuery<HTMLOListElement>) => {
          const id = i.parents('li.item').data().itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.OFF_HAND);
        },
      },
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.MainHand'),
        icon: '<i class="fas fa-hand-paper fa-flip-horizontal"></i>',
        condition: (i: JQuery<HTMLOListElement>) => {
          const id = i.parents('li.item').data().itemId;
          const item = this.actor.items.get(id, { strict: true });
          return item.type === 'weapon';
        },
        callback: (i: JQuery<HTMLOListElement>) => {
          const id = i.parents('li.item').data().itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.MAIN_HAND);
        },
      },
      {
        name: game.i18n.localize('SWADE.ItemEquipStatus.TwoHands'),
        icon: '<i class="fas fa-sign-language"></i>',
        condition: (i: JQuery<HTMLOListElement>) => {
          const id = i.parents('li.item').data().itemId;
          const item = this.actor.items.get(id, { strict: true });
          return item.type === 'weapon';
        },
        callback: (i: JQuery<HTMLOListElement>) => {
          const id = i.parents('li.item').data().itemId;
          const item = this.actor.items.get(id, { strict: true });
          item.setEquipState(constants.EQUIP_STATE.TWO_HANDS);
        },
      },
    ];

    const selector = ' .inventory .item-controls .equip-status';
    const options = { eventName: 'click' };
    this._equipStateMenu = new PopUpMenu(html, selector, items, options);
  }

  protected _setupEffectCreateMenu(html: JQuery<HTMLElement> = $('body')) {
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
      { eventName: 'click' },
    );
  }

  protected _setupItemContextMenu(html: JQuery<HTMLElement>) {
    const items: ContextMenuEntry[] = [
      {
        name: 'SWADE.Reload',
        icon: '<i class="fa-solid fa-right-to-bracket"></i>',
        condition: (i) => {
          const item = this.actor.items.get(i.data('itemId'));
          return (
            item?.type === 'weapon' &&
            !!item.system.shots &&
            game.settings.get('swade', 'ammoManagement')
          );
        },
        callback: (i) => this.actor.items.get(i.data('itemId'))?.reload(),
      },
      {
        name: 'SWADE.RemoveAmmo',
        icon: '<i class="fa-solid fa-right-from-bracket"></i>',
        condition: (i) => {
          const item = this.actor.items.get(i.data('itemId'));
          const isWeapon = item?.type === 'weapon';
          const loadedAmmo = item?.getFlag('swade', 'loadedAmmo');
          return (
            isWeapon &&
            !!loadedAmmo &&
            item.needsFullReloadProcedure() &&
            (item.system.reloadType === constants.RELOAD_TYPE.MAGAZINE ||
              item.system.reloadType === constants.RELOAD_TYPE.BATTERY)
          );
        },
        callback: (i) => this.actor.items.get(i.data('itemId'))?.removeAmmo(),
      },
      {
        name: 'SWADE.Ed',
        icon: '<i class="fa-solid fa-edit"></i>',
        callback: (i) =>
          this.actor.items.get(i.data('itemId'))?.sheet?.render(true),
      },
      {
        name: 'SWADE.Duplicate',
        icon: '<i class="fa-solid fa-copy"></i>',
        condition: (i) =>
          !!this.actor.items.get(i.data('itemId'))?.isPhysicalItem,
        callback: async (i) => {
          const item = this.actor.items.get(i.data('itemId'));
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
        callback: (i) => this.actor.items.get(i.data('itemId'))?.deleteDialog(),
      },
    ];

    ContextMenu.create(this, html, 'li.item', items);
  }
}

interface SheetEffect {
  id: string;
  icon: string | undefined | null;
  disabled: boolean;
  favorite: boolean;
  origin?: string;
  label: string;
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

type OptionsPartial = Partial<ActorSheet.Data<DocumentSheetOptions>>;

interface SwadeActorSheetData extends OptionsPartial {
  itemTypes: Record<string, SwadeItem[]>;
  parry: number;
  settingrules: Record<string, unknown>;
  currentBennies: number[];
  powers: SheetPowers;
  hasAdditionalStats: boolean;
  additionalStats: AdditionalStats;
  bennyImageURL: string;
  useAttributeShorts: boolean;
  sortedSkills: SwadeItem[];
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
  };
}
