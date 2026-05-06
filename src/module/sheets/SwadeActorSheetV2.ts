import { DeepPartial } from 'fvtt-types/utils';
import { SwadeDocumentSheetConfiguration, Updates } from '../../globals';
import { SwadeActorTweaks } from '../apps/SwadeDocumentTweaks';
import type SwadeUser from '../documents/SwadeUser';
import type SwadeActor from '../documents/actor/SwadeActor';
import type SwadeItem from '../documents/item/SwadeItem';
import { SwadeBaseSheetMixin } from './SwadeBaseSheetMixin';

const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;

export class SwadeActorSheetV2<
  RenderContext extends SwadeActorSheetV2.RenderContext = SwadeActorSheetV2.RenderContext,
> extends SwadeBaseSheetMixin<SwadeActor, RenderContext>(ActorSheetV2) {
  declare actor: SwadeActor; //TODO Fix?
  static override DEFAULT_OPTIONS: DeepPartial<SwadeDocumentSheetConfiguration<SwadeActor>> = {
    classes: ['actor'],
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: null }],
    actions: {
      createDocument: SwadeActorSheetV2.createEmbeddedDocument,
      showItem: SwadeActorSheetV2.showItem,
      openItem: SwadeActorSheetV2.openItem,
      deleteItem: SwadeActorSheetV2.deleteItem,
      openEffect: SwadeActorSheetV2.openItem,
      deleteEffect: SwadeActorSheetV2.deleteItem,
      toggleProperty: SwadeActorSheetV2.toggleProperty,
      openTweaks: SwadeActorSheetV2.openTweaks,
      rollAdditionalStat: SwadeActorSheetV2.rollAdditionalStat,
    },
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

  static async createEmbeddedDocument(this: SwadeActorSheetV2, event: PointerEvent, target: HTMLElement) {
    event.preventDefault(); // helps buttons in the headers of <details> elements
    const documentClass = getDocumentClass(target.dataset.documentClass as 'Item' | 'ActiveEffect');
    const docData = {
      name: documentClass.defaultName({
        type: target.dataset.type,
        parent: this.actor,
      }),
    };
    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (['action', 'documentClass', 'renderSheet'].includes(dataKey)) continue;
      // Nested properties use dot notation like `data-system.prop`
      foundry.utils.setProperty(docData, dataKey, value);
    }

    await documentClass.create(docData, {
      parent: this.actor,
      renderSheet: target.dataset.renderSheet,
    });
  }

  static showItem(this: SwadeActorSheetV2, _event: PointerEvent, target: HTMLElement) {
    (this._getEmbeddedDocument(target) as SwadeItem)?.show();
  }

  static openItem(this: SwadeActorSheetV2, _event: PointerEvent, target: HTMLElement) {
    this._getEmbeddedDocument(target)?.sheet?.render({ force: true });
  }

  static async deleteItem(this: SwadeActorSheetV2, _event: PointerEvent, target: HTMLElement) {
    this._getEmbeddedDocument(target)?.deleteDialog();
  }

  static openEffect(this: SwadeActorSheetV2, _event: PointerEvent, target: HTMLElement) {
    this._getEmbeddedDocument(target)?.sheet?.render({ force: true });
  }

  static async deleteEffect(this: SwadeActorSheetV2, _event: PointerEvent, target: HTMLElement) {
    this._getEmbeddedDocument(target)?.deleteDialog();
  }

  static async toggleProperty(this: SwadeActorSheetV2, _event: PointerEvent, target: HTMLElement) {
    const document = this._getEmbeddedDocument(target);
    if (!document) return;
    const toggle = target.dataset.toggle as string;
    const oldVal = !!foundry.utils.getProperty(document, toggle);
    await document.update({ [toggle]: !oldVal });
  }

  static async openTweaks(this: SwadeActorSheetV2, _event: PointerEvent, _target: HTMLElement) {
    new SwadeActorTweaks({ document: this.document }).render({ force: true });
  }

  static async rollAdditionalStat(this: SwadeActorSheetV2, _event: PointerEvent, target: HTMLElement) {
    await this.actor.system.rollAdditionalStat(target.dataset.stat);
  }

  override async _prepareContext(options) {
    const superContext = await super._prepareContext(options);
    return {
      ...superContext,
      // Validates both permissions and compendium status
      owner: this.document.isOwner,
      limited: this.document.limited,
      // Add the actor document.
      actor: this.actor,
      items: Array.from(this.actor.items.values()).sort((a, b) => a.sort - b.sort),
      // Add the actor's data to context.data for easier access, as well as flags.
      system: this.actor.system,
      flags: this.actor.flags,
      // Adding a pointer to CONFIG.SWADE
      config: CONFIG.SWADE,
    };
  }

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param event The originating DragEvent
   */
  protected override async _onDrop(event: DragEvent) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event) as object;
    const actor = this.actor;
    const allowed = Hooks.call('dropActorSheetData', actor, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data['type']) {
      case 'ActiveEffect':
        await this._onDropActiveEffect(event, data);
        break;
      case 'Actor':
        await this._onDropActor(event, data);
        break;
      case 'Item':
        await this._onDropItem(event, data);
        break;
      case 'Folder':
        await this._onDropFolder(event, data);
        break;
    }
  }

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param event The concluding DragEvent which contains drop data
   * @param data  The data transfer extracted from the event
   * @returns The created ActiveEffect object or false if it couldn't be created.
   */
  protected async _onDropActiveEffect(event: DragEvent, data: object): Promise<ActiveEffect | boolean> {
    const aeCls = getDocumentClass('ActiveEffect');
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    if (effect.target === this.actor) return this._onSortActiveEffect(event, effect);
    return aeCls.create(effect, { parent: this.actor })!;
  }

  /**
   * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
   */
  protected async _onSortActiveEffect(event: DragEvent, effect: ActiveEffect) {
    const dropTarget = (event.target as HTMLElement)?.closest<HTMLElement>('[data-effect-id]');
    if (!dropTarget) return;
    const target = this._getEmbeddedDocument(dropTarget);
    if (!target) return;

    // Don't sort on yourself
    if (effect.uuid === target.uuid) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings: ActiveEffect[] = [];
    for (const el of dropTarget.parentElement!.children) {
      const siblingId = (el as HTMLElement).dataset.effectId;
      const parentId = (el as HTMLElement).dataset.parentId;
      if (siblingId && parentId && (siblingId !== effect.id || parentId !== effect.parent?.id)) {
        const sibling = this._getEmbeddedDocument(el as HTMLElement);
        if (sibling) siblings.push(sibling as ActiveEffect);
      }
    }

    // Perform the sort
    const sortUpdates = foundry.utils.performIntegerSort(effect, {
      target,
      siblings,
    });

    // Split the updates up by parent document
    const directUpdates: Updates[] = [];

    const grandchildUpdateData = sortUpdates.reduce((items, u) => {
      const parentId = u.target.parent.id;
      const update = { _id: u.target.id, ...u.update };
      if (parentId === this.actor.id) {
        directUpdates.push(update);
        return items;
      }
      if (items[parentId]) items[parentId].push(update);
      else items[parentId] = [update];
      return items;
    }, {});

    // Effects-on-items updates
    for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
      await this.actor.items.get(itemId).updateEmbeddedDocuments('ActiveEffect', updates);
    }

    // Update on the main actor
    return this.actor.updateEmbeddedDocuments('ActiveEffect', directUpdates);
  }

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param event The concluding DragEvent which contains drop data
   * @param data  The data transfer extracted from the event
   * @returns A data object which describes the result of the drop, or false if the drop was not permitted.
   */
  protected async _onDropActor(_event: DragEvent, _data: object): Promise<object | boolean> {
    return false;
  }

  /**
   * Handle dropping of an item reference or item data onto an Actor Sheet
   * @param event The concluding DragEvent which contains drop data
   * @param data  The data transfer extracted from the event
   * @returns The created or updated Item instances, or false if the drop was not permitted.
   */
  protected async _onDropItem(event: DragEvent, data: object): Promise<Item[] | boolean> {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);

    // Handle item sorting within the same Actor
    if (this.actor.uuid === item.parent?.uuid) return this._onSortItem(event, item);

    // Create the owned item
    return this._onDropItemCreate(item, event);
  }

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param event The concluding DragEvent which contains drop data
   * @param data  The data transfer extracted from the event
   */
  protected async _onDropFolder(event: DragEvent, data: object): Promise<Item[]> {
    if (!this.actor.isOwner) return [];
    const folder = await getDocumentClass('Folder').fromDropData(data);
    if (folder.type !== 'Item') return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      })
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
   * @param itemData  The item data requested for creation
   * @param event The concluding DragEvent which provided the drop data
   */
  protected async _onDropItemCreate(itemData: object[] | object, _event: DragEvent): Promise<Item[]> {
    itemData = itemData instanceof Array ? itemData : [itemData];
    return this.actor.createEmbeddedDocuments('Item', itemData);
  }

  /**
   * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
   */
  protected _onSortItem(event: Event, item: Item) {
    // Get the drag source and drop target
    const items = this.actor.items;
    const dropTarget = event.target?.closest('[data-item-id]');
    if (!dropTarget) return;
    const target = items.get(dropTarget.dataset.itemId);

    // Don't sort on yourself
    if (item.id === target.id) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings: Item[] = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.itemId;
      if (siblingId && siblingId !== item.id) siblings.push(items.get(el.dataset.itemId));
    }

    // Perform the sort
    const sortUpdates = foundry.utils.performIntegerSort<Item>(item, {
      target,
      siblings,
    });
    const updateData = sortUpdates.map((u) => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.actor.updateEmbeddedDocuments('Item', updateData);
  }
}

export namespace SwadeActorSheetV2 {
  export type RenderContext = {
    user: SwadeUser;
    editable: boolean;
    owner: boolean;
    limited: boolean;
    // Add the actor document.
    actor: SwadeActor;
    items: SwadeItem[];
    // Add the actor's data to context.data for easier access, as well as flags.
    system: SwadeActor['system'];
    flags: SwadeActor['flags'];
    // Adding a pointer to CONFIG.SWADE
    config: typeof CONFIG.SWADE;
  };
}
