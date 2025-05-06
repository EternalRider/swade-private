import { constants } from '../constants';
import type { NpcData } from '../data/actor';
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
    const jquery = await super._renderInner(data);
    const html = jquery[0];
    this.form = html;

    // Resize resizable classes
    const resizable = html.querySelectorAll('.resizable');
    resizable.forEach((el) => {
      const heightDelta =
        (this.position.height as number) - (this.options.height as number);
      el.style.height = `${heightDelta + parseInt(el.dataset.baseSize!)}px`;
    });

    // Filter power list
    const arcane = !this.options['activeArcane']
      ? 'All'
      : this.options['activeArcane'];
    html.querySelector('.arcane-tabs .arcane')?.classList.remove('active');
    html.querySelector(`[data-arcane='${arcane}']`)?.classList.add('active');
    this._filterPowers(html, arcane);

    return jquery;
  }

  override activateListeners(jquery: JQuery): void {
    super.activateListeners(jquery);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    const html = jquery[0];

    // Refresh
    html
      .querySelectorAll('.adjust-counter')
      .forEach((el) =>
        el.addEventListener('click', this._handleCounterAdjust.bind(this)),
      );

    this._setupItemContextMenu(html);

    // Drag events for macros.
    html.querySelectorAll('.attribute').forEach((el) => {
      // Add draggable attribute and dragstart listener.
      el.draggable = true;
      el.addEventListener('dragstart', this._onDragStart.bind(this), false);
    });

    // Delete Item
    html.querySelectorAll('.item-delete').forEach((el) =>
      el.addEventListener('click', (ev) => {
        const li = ev.currentTarget?.closest('.gear-card');
        this.actor.items.get(li.dataset.itemId)?.deleteDialog();
      }),
    );

    // Roll Skill
    html.querySelectorAll('.skill.item a').forEach((el) =>
      el.addEventListener('click', (event) => {
        const element = event.currentTarget as Element;
        const item = element.parentElement!.dataset.itemId as string;
        this.actor.rollSkill(item);
      }),
    );

    // Add new object
    html.querySelectorAll('.item-create').forEach((el) =>
      el.addEventListener('click', async (event) => {
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
      }),
    );

    //Toggle Equipmnent Card collapsible
    html.querySelectorAll('.gear-card .card-header .item-name').forEach((el) =>
      el.addEventListener('click', (ev) => {
        const card = ev.currentTarget.closest('.gear-card');
        const content = card.querySelector('.card-content');
        content.classList.toggle('collapsed');
      }),
    );

    // Active Effects
    html
      .querySelectorAll('.status-container input[type="checkbox"]')
      .forEach((el) =>
        el.addEventListener('change', this._toggleStatusEffect.bind(this)),
      );

    html
      .querySelector('.attribute.size input')
      ?.addEventListener('mouseenter', (event) => {
        game.tooltip.deactivate();
        game.tooltip.activate(event.target as HTMLElement, {
          content: (this.actor.system as NpcData).getSizeTooltip(),
        });
      });

    // TODO: fix this tooltip. No mouseenter event on a readonly input
    html
      .querySelector('.attribute.pace input')
      ?.addEventListener('mouseenter', (event) => {
        game.tooltip.deactivate();
        game.tooltip.activate(event.target as HTMLElement, {
          content: (this.actor.system as NpcData).getPaceTooltip(),
        });
      });
  }

  override async getData() {
    const data: any = await super.getData();

    // Progress attribute abbreviation toggle
    data.useAttributeShorts = game.settings.get('swade', 'useAttributeShorts');

    data.enrichedBiography = await TextEditor.enrichHTML(
      (this.actor.system as NpcData).details.biography.value,
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

  protected async _toggleStatusEffect(ev: Event) {
    const key = ev.target.dataset.key as string;
    // this is just to make sure the status is false in the source data
    await this.actor.update({ [`system.status.${key}`]: false });
    await this.actor.toggleActiveEffect(ev.target.dataset.id as string);
  }

  protected async _handleCounterAdjust(ev: PointerEvent) {
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

  protected _setupItemContextMenu(html: HTMLElement) {
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
        callback: (i) =>
          this.actor.items.get(i.dataset.itemId)?.sheet?.render(true),
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
        callback: (i) => this.actor.items.get(i.dataset.itemId)?.deleteDialog(),
      },
    ];

    foundry.applications.ux.ContextMenu.create(this, html, 'li.item', items, {
      jQuery: false,
    });
  }
}
