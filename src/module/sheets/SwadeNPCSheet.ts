import { constants } from '../constants';
import { getDieSidesRange } from '../util';
import SwadeBaseActorSheet from './SwadeBaseActorSheet';

/**
 * @noInheritDoc
 */
export default class SwadeNPCSheet extends SwadeBaseActorSheet {
  static override get defaultOptions() {
    return {
      ...super.defaultOptions,
      classes: ['swade', 'sheet', 'actor', 'npc'],
      width: 660,
      height: 600,
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'summary',
        },
      ],
    };
  }

  override get template() {
    // Later you might want to return a different template
    // based on user permissions.
    if (!game.user?.isGM && this.actor.limited) {
      return 'systems/swade/templates/actors/limited-sheet.hbs';
    }
    return 'systems/swade/templates/actors/npc-sheet.hbs';
  }

  // Override to set resizable initial size
  override async _renderInner(data) {
    const html = await super._renderInner(data);
    this.form = html[0];

    // Resize resizable classes
    const resizable = html.find('.resizable');
    resizable.each((_, el) => {
      const heightDelta =
        (this.position.height as number) - (this.options.height as number);
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize!)}px`;
    });

    // Filter power list
    const arcane = !this.options['activeArcane']
      ? 'All'
      : this.options['activeArcane'];
    html.find('.arcane-tabs .arcane').removeClass('active');
    html.find(`[data-arcane='${arcane}']`).addClass('active');
    this._filterPowers(html, arcane);

    return html;
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Refresh
    html[0]
      .querySelectorAll('.adjust-counter')
      .forEach((el) =>
        el.addEventListener('click', this._handleCounterAdjust.bind(this)),
      );

    this._setupItemContextMenu(html);

    // Drag events for macros.
    html.find('.attribute').each((i, el) => {
      // Add draggable attribute and dragstart listener.
      el.draggable = true;
      el.addEventListener('dragstart', this._onDragStart.bind(this), false);
    });

    // Delete Item
    html.find('.item-delete').on('click', (ev) => {
      const li = $(ev.currentTarget).parents('.gear-card');
      this.actor.items.get(li.data('itemId'))?.deleteDialog();
    });

    // Roll Skill
    html.find('.skill.item a').on('click', (event) => {
      const element = event.currentTarget as Element;
      const item = element.parentElement!.dataset.itemId as string;
      this.actor.rollSkill(item);
    });

    // Add new object
    html.find('.item-create').on('click', async (event) => {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type!;

      // item creation helper func
      const createItem = (type: string, name?: string) => {
        const itemData = {
          name:
            name ??
            game.i18n.format('DOCUMENT.New', { type: type.capitalize() }),
          type: type,
          system: Object.assign({}, header.dataset),
        };
        delete itemData.system['type'];
        return itemData;
      };

      let itemData: any;

      // Getting back to main logic
      if (type === 'choice') {
        const dialogInput = await this._chooseItemType();
        itemData = createItem(dialogInput.type, dialogInput.name);
      } else {
        itemData = createItem(type);
      }
      foundry.utils.setProperty(
        itemData,
        'system.equipStatus',
        constants.EQUIP_STATE.EQUIPPED,
      );
      await this.actor.createEmbeddedDocuments('Item', [itemData], {
        renderSheet: true,
      });
    });

    //Toggle Equipmnent Card collapsible
    html.find('.gear-card .card-header .item-name').on('click', (ev) => {
      const card = $(ev.currentTarget).parents('.gear-card');
      const content = card.find('.card-content');
      content.toggleClass('collapsed');
      if (content.hasClass('collapsed')) {
        content.slideUp();
      } else {
        content.slideDown();
      }
    });

    // Active Effects
    html
      .find('.status-container input[type="checkbox"]')
      .on('change', this._toggleStatusEffect.bind(this));
  }

  override async getData() {
    const data: any = await super.getData();

    // Progress attribute abbreviation toggle
    data.useAttributeShorts = game.settings.get('swade', 'useAttributeShorts');

    data.enrichedBiography = await TextEditor.enrichHTML(
      this.actor.system.details.biography.value,
      {
        relativeTo: this.actor,
        rollData: this.actor.getRollData(),
        secrets: this.options.editable && this.document.isOwner,
      },
    );
    data.wealthDieTypes = getDieSidesRange(4, 12);

    // Everything below here is only needed if user is not limited
    if (this.actor.limited) return data;

    data.parryTooltip = this.actor.getPTTooltip('parry');
    data.toughnessTooltip = this.actor.getPTTooltip('toughness');
    data.armorTooltip = this.actor.getArmorTooltip();
    return data;
  }

  protected async _toggleStatusEffect(ev: JQuery.ChangeEvent) {
    const key = ev.target.dataset.key as string;
    // this is just to make sure the status is false in the source data
    await this.actor.update({ [`system.status.${key}`]: false });
    await this.actor.toggleActiveEffect(ev.target.dataset.id as string);
  }

  protected async _handleCounterAdjust(ev: MouseEvent) {
    const target = ev.currentTarget as HTMLElement;
    const action = target.dataset.action;

    switch (action) {
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
            item.usesAmmoFromInventory &&
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
