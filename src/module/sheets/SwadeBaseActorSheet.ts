import { AdditionalStats, Attribute } from '../../globals';
import { AdditionalStat } from '../../interfaces/additional.interface';
import ActiveEffectWizard from '../apps/ActiveEffectWizard';
import AttributeManager from '../apps/AttributeManager';
import SwadeDocumentTweaks from '../apps/SwadeDocumentTweaks';
import { SWADE } from '../config';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';
import SwadeItem from '../documents/item/SwadeItem';
import { Logger } from '../Logger';
/** @noInheritDoc */
export default class SwadeBaseActorSheet extends ActorSheet {
  override activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    const inputs = html.find<HTMLInputElement>('input');
    inputs.on('focus', (ev) => ev.currentTarget.select());
    inputs
      .addBack()
      .find('[name="system.details.currency"]')
      .on('change', this._onChangeInputDelta.bind(this));

    // Drag events for macros.
    html.find('li.active-effect, li.item').each((i, el) => {
      // Add draggable attribute and dragstart listener.
      el.draggable = true;
      el.addEventListener('dragstart', this._onDragStart.bind(this), false);
    });

    // Update Item
    html.find('.item-edit').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item?.sheet?.render(true);
    });

    html.find('.item-show').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      this.actor.items.get(li.data('itemId'))?.show();
    });

    // Edit armor modifier
    html.find('.armor-value').on('click', (ev) => {
      const target = ev.currentTarget.dataset.target ?? '';
      this._modifyDefense(target);
    });

    // Roll attribute
    html.find('.attribute-value').on('click', (event) => {
      const attribute = event.currentTarget.dataset.attribute as Attribute;
      this.actor.rollAttribute(attribute);
    });

    html.find('.attribute-manager').on('click', () => {
      new AttributeManager(this.actor).render(true);
    });

    // Roll Damage
    html.find('.damage-roll').on('click', (event) => {
      const element = event.currentTarget as Element;
      const id = $(element).parents('[data-item-id]').attr('data-item-id')!;
      const item = this.actor.items.get(id, { strict: true });
      return item.rollDamage();
    });

    // Use Consumable
    html.find('.use-consumable').on('click', async (event) => {
      const element = event.currentTarget as Element;
      const id = $(element).parents('[data-item-id]').attr('data-item-id')!;
      const item = this.actor.items.get(id, { strict: true });
      return item.consume();
    });

    //Add Benny
    html.find('.benny-add').on('click', () => {
      this.actor.getBenny();
    });

    //Remove Benny
    html.find('.benny-subtract').on('click', () => {
      this.actor.spendBenny();
    });

    //Toggle Conviction
    html.find('.conviction-toggle').on('click', async () => {
      await this.actor.toggleConviction();
    });

    // Filter power list
    html.find('.arcane-tabs .arcane').on('click', (ev: any) => {
      const arcane = ev.currentTarget.dataset.arcane;
      html.find('.arcane-tabs .arcane').removeClass('active');
      ev.currentTarget.classList.add('active');
      this._filterPowers(html, arcane);
    });

    //Running Die
    html.find('.running-die').on('click', async () => {
      await this.actor.rollRunningDie();
    });

    html.find('.effect-action').on('click', async (ev) => {
      const a = ev.currentTarget;
      const data = a.closest('li')!.dataset;
      const effectUuid = data.effectUuid;
      const effect = (await fromUuid(effectUuid)) as SwadeActiveEffect;
      const action = a.dataset.action;
      switch (action) {
        case 'edit':
          return effect.sheet?.render(true);
        case 'delete':
          return effect.deleteDialog();
        case 'toggle':
          return effect.update({ disabled: !effect?.disabled });
        case 'open-origin':
          (effect.parent as SwadeItem).sheet.render(true);
          break;
        default:
          Logger.warn(`The action ${action} is not currently supported`);
          break;
      }
    });

    html.find('.add-effect').on('click', async (ev) => {
      const transfer = $(ev.currentTarget).data('transfer');
      if (ev.shiftKey) {
        await CONFIG.ActiveEffect.documentClass.create(
          {
            name: game.i18n.format('DOCUMENT.New', {
              type: game.i18n.localize('DOCUMENT.ActiveEffect'),
            }),
            icon: 'systems/swade/assets/icons/active-effect.svg',
            transfer: transfer,
          },
          { renderSheet: true, parent: this.actor },
        );
      } else {
        new ActiveEffectWizard(this.actor).render(true);
      }
    });

    html.find('.additional-stats .roll').on('click', async (ev) => {
      const button = ev.currentTarget;
      const stat = button.dataset.stat;
      const statData = foundry.utils.getProperty(
        this.actor,
        `system.additionalStats.${stat}`,
      ) as AdditionalStat;
      let modifier = statData.modifier ?? '0';
      if (!!modifier && !modifier.match(/^[+-]/)) {
        modifier = '+' + modifier;
      }
      const roll = new Roll(
        `${statData.value}${modifier}`,
        this.actor.getRollData(),
      );
      await roll.evaluate();
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker(),
        flavor: statData.label,
      });
    });

    //Wealth Die Roll
    html.find('.currency .roll').on('click', () => this.actor.rollWealthDie());

    html.find('.profile-img').on('contextmenu', () => {
      if (!this.actor.img) return;
      new ImagePopout(this.actor.img, {
        title: this.actor.name!,
        shareable: this.actor.isOwner ?? game.user?.isGM ?? false,
        uuid: this.actor.uuid,
      }).render(true);
    });
  }

  override async getData() {
    const data: any = await super.getData();
    data.config = SWADE;

    data.allApplicableEffects = Array.from(this.actor.allApplicableEffects());

    const itemsByType: Record<string, SwadeItem[]> = {};
    for (const item of this.actor.items) {
      const type = item.type;
      itemsByType[type] ??= [];
      itemsByType[type].push(item);
    }

    data.itemsByType = itemsByType;

    data.sortedSkills = this.actor.items
      .filter((i) => i.type === 'skill')
      .sort((a, b) => a.name!.localeCompare(b.name!));

    if (this.actor.type !== 'vehicle') {
      //Encumbrance
      data.inventoryWeight = this._calcInventoryWeight([
        ...(data.itemsByType['gear'] ?? []),
        ...(data.itemsByType['weapon'] ?? []),
        ...(data.itemsByType['armor'] ?? []),
        ...(data.itemsByType['shield'] ?? []),
        ...(data.itemsByType['consumable'] ?? []),
      ]);
      data.maxCarryCapacity = this.actor.calcMaxCarryCapacity();

      if (this.actor.type === 'character') {
        data.powersOptions =
          'class="powers-list resizable" data-base-size="560"';
      } else {
        data.powersOptions = 'class="powers-list"';
      }

      // Display the current active arcane
      data.activeArcane = this.options['activeArcane'];
      const arcanes = new Array<string>();
      const powers = data.itemsByType.power;
      powers?.forEach((pow: any) => {
        const arcane: string = pow.system.arcane;
        if (!arcane) return;
        if (!arcanes.find((el) => el === arcane)) {
          arcanes.push(arcane);
          // Add powerpoints data relevant to the detected arcane
          if (!hasProperty(this.actor, `system.powerPoints.${arcane}`)) {
            data.actor.system.powerPoints[arcane] = {
              value: 0,
              max: 0,
            };
          }
        }
      });
      data.arcanes = arcanes;

      // Check for enabled optional rules
      data.settingrules = {
        conviction: game.settings.get('swade', 'enableConviction'),
        noPowerPoints: game.settings.get('swade', 'noPowerPoints'),
        wealthType: game.settings.get('swade', 'wealthType'),
        currencyName: game.settings.get('swade', 'currencyName'),
        npcsUseCurrency: game.settings.get('swade', 'npcsUseCurrency'),
      };
    }

    const additionalStats: AdditionalStats = this.#getAdditionalStats();
    data.additionalStats = additionalStats;
    data.hasAdditionalStatsFields = Object.keys(additionalStats).length > 0;
    return data;
  }

  /** Extend and override the sheet header buttons */
  protected override _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Token Configuration
    if (this.actor.isOwner) {
      buttons = [
        {
          label: game.i18n.localize('SWADE.Tweaks'),
          class: 'configure-actor',
          icon: 'fa-solid fa-gears',
          onclick: (ev) => this._onConfigureEntity(ev),
        },
        ...buttons,
      ];
    }
    return buttons;
  }

  protected _onConfigureEntity(event: JQuery.ClickEvent) {
    event.preventDefault();
    new SwadeDocumentTweaks(this.actor).render(true);
  }

  protected async _chooseItemType(
    choices?: any,
  ): Promise<{ type: string; name: string }> {
    if (!choices) {
      choices = {
        weapon: game.i18n.localize('TYPES.Item.weapon'),
        armor: game.i18n.localize('TYPES.Item.armor'),
        shield: game.i18n.localize('TYPES.Item.shield'),
        gear: game.i18n.localize('TYPES.Item.gear'),
        consumable: game.i18n.localize('TYPES.Item.consumable'),
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
            label: game.i18n.localize('SWADE.Ok'),
            icon: '<i class="fas fa-check"></i>',
            callback: (html: JQuery<HTMLElement>) => {
              resolve({
                type: html.find('select[name="type"]').val() as string,
                name: html.find('input[name="name"]').val() as string,
              });
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize('SWADE.Cancel'),
          },
        },
        default: 'ok',
      }).render(true);
    });
  }

  protected _checkNull(items: Item[]): Item[] {
    if (items && items.length) {
      return items;
    }
    return [];
  }

  protected override async _onResize(event: any) {
    super._onResize(event);
    const html = $(event.path);
    const selector = `#${this.id} .resizable`;
    const resizable = html.find(selector);
    resizable.each((_, el) => {
      const heightDelta =
        (this.position.height as number) - (this.options.height as number);
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize!)}px`;
    });
  }

  protected _modifyDefense(target: string) {
    let targetLabel;
    let targetProperty;
    switch (target) {
      case 'parry':
        targetLabel = `${game.i18n.localize(
          'SWADE.Parry',
        )} ${game.i18n.localize('SWADE.ShieldBonus')}`;
        targetProperty = 'parry.shield';
        break;
      case 'armor':
        targetLabel = `${game.i18n.localize('SWADE.Armor')}`;
        targetProperty = 'toughness.armor';
        break;
      case 'toughness':
        targetLabel = `${game.i18n.localize(
          'SWADE.Tough',
        )} ${game.i18n.localize('SWADE.Modifier')}`;
        targetProperty = 'toughness.modifier';
        break;
      default:
        targetLabel = `${game.i18n.localize(
          'SWADE.Tough',
        )} ${game.i18n.localize('SWADE.Modifier')}`;
        targetProperty = 'toughness.value';
        break;
    }

    const targetPropertyPath =
      this.actor.type === 'vehicle'
        ? `system.${targetProperty}`
        : `system.stats.${targetProperty}`;
    const targetPropertyValue = foundry.utils.getProperty(
      this.actor,
      targetPropertyPath,
    );

    const title = `${(game.i18n.format('SWADE.EdF'), { item: this.actor.name + ' ' + targetLabel })}`;

    const template = `
      <form><div class="form-group">
        <label>${game.i18n.format('SWADE.EdF', { item: targetLabel })}</label>
        <input name="modifier" value="${targetPropertyValue}" type="text"/>
      </div></form>`;
    new Dialog({
      title: title,
      content: template,
      buttons: {
        set: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('SWADE.Ok'),
          callback: (html: JQuery) => {
            const mod = html.find('input[name="modifier"]').val();
            const newData = {};
            newData[targetPropertyPath] = parseInt(mod as string);
            this.actor.update(newData);
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('SWADE.Cancel'),
        },
      },
      default: 'set',
    }).render(true);
  }

  protected _filterPowers(html: JQuery, arcane: string) {
    this.options['activeArcane'] = arcane;
    // Show, hide powers
    html.find('.power').each((id: number, pow: any) => {
      if (pow.dataset.arcane == arcane || arcane == 'All') {
        pow.classList.add('active');
      } else {
        pow.classList.remove('active');
      }
    });
    // Show, Hide powerpoints
    html.find('.power-counter').each((id: number, ct: any) => {
      if (ct.dataset.arcane == arcane) {
        ct.classList.add('active');
      } else {
        ct.classList.remove('active');
      }
    });
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

  protected _calcInventoryWeight(items): number {
    let retVal = 0;
    items.forEach((i: any) => {
      retVal += i.system.weight * i.system.quantity;
    });
    return retVal;
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

  #getAdditionalStats(): AdditionalStats {
    const stats = structuredClone<AdditionalStats>(
      this.actor.system.additionalStats,
    );
    for (const [key, attr] of Object.entries(stats)) {
      if (!attr.dtype) delete stats[key];
      if (attr.dtype === 'Selection') {
        const options = game.settings.get('swade', 'settingFields').actor;
        attr.options = options[key].optionString
          ?.split(';')
          .reduce((a, v) => ({ ...a, [v.trim()]: v.trim() }), {});
      }
    }
    return stats;
  }
}
