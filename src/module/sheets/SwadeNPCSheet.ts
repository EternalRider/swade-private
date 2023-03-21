import { constants } from '../constants';
import { getStatusEffectDataById } from '../util';
import SwadeBaseActorSheet from './SwadeBaseActorSheet';

/**
 * @noInheritDoc
 */
export default class SwadeNPCSheet extends SwadeBaseActorSheet {
  static get defaultOptions() {
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

  get template() {
    // Later you might want to return a different template
    // based on user permissions.
    if (!game.user?.isGM && this.actor.limited) {
      return 'systems/swade/templates/actors/limited-sheet.hbs';
    }
    return 'systems/swade/templates/actors/npc-sheet.hbs';
  }

  // Override to set resizable initial size
  async _renderInner(data) {
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

    // Drag events for macros.

    if (this.actor.isOwner) {
      const handler = (ev) => this._onDragStart(ev);
      // Find all items on the character sheet.
      html.find('li.item').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
      html.find('li.active-effect').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });

      // Refresh
      html[0]
        .querySelectorAll('.adjust-counter')
        .forEach((el) =>
          el.addEventListener('click', this._handleCounterAdjust.bind(this)),
        );
      html
        .find('.adjust-counter')
        .on('click', this._handleCounterAdjust.bind(this));
    }

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Update Item via right-click
    html.find('.contextmenu-edit').on('contextmenu', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      this.actor.items.get(li.data('itemId'))?.sheet?.render(true);
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
      const createItem = function (
        type: string,
        name: string = `New ${type.capitalize()}`,
      ): any {
        const itemData = {
          name: name ? name : `New ${type.capitalize()}`,
          type: type,
          data: deepClone(header.dataset),
        };
        delete itemData.data['type'];
        return itemData;
      };

      // Getting back to main logic
      if (type == 'choice') {
        const dialogInput = await this._chooseItemType();
        const itemData = createItem(dialogInput.type, dialogInput.name);
        itemData.data.equipped = true;
        await Item.create(itemData, { renderSheet: true, parent: this.actor });
        return;
      } else {
        const itemData = createItem(type);
        itemData.data.equipped = true;
        await Item.create(itemData, { renderSheet: true, parent: this.actor });
      }
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
      { async: true, secrets: this.options.editable },
    );

    // Everything below here is only needed if user is not limited
    if (this.actor.limited) return data;

    data.parry = 0;
    data.itemsByType.shield.forEach((shield) => {
      if (shield.system.equipState === constants.EQUIP_STATE.EQUIPPED) {
        data.parry += shield.system.parry;
      }
    });

    return data;
  }

  protected async _toggleStatusEffect(ev: JQuery.ChangeEvent) {
    // Get the key from the target name
    const id = ev.target.dataset.id as string;
    const key = ev.target.dataset.key as string;
    const data = getStatusEffectDataById(id);
    // this is just to make sure the status is false in the source data
    await this.actor.update({ [`system.status.${key}`]: false });
    await this.actor.toggleActiveEffect(data);
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

  protected async _handleCounterAdjust(ev: MouseEvent) {
    const action = ev?.currentTarget?.dataset?.action;

    switch (action) {
      case 'pp-refresh': {
        const arcane = ev?.currentTarget?.dataset?.arcane;
        await this.actor.update({
          ['system.powerPoints.' + arcane + '.value']:
            this.actor.system.powerPoints[arcane].max,
        });
        break;
      }
      default:
        throw new Error('Unknown action!');
    }
  }
}
