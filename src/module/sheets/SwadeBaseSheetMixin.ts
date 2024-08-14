import {
  ApplicationRenderContext,
  ApplicationTab,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client-esm/applications/_types.mjs';
import { DocumentSheetConfiguration } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client-esm/applications/api/document-sheet.mjs';
import { DeepPartial } from '@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs';
import { SwadeApplicationTab } from '../../globals';

/* eslint-disable @typescript-eslint/naming-convention */

const { HandlebarsApplicationMixin } = foundry.applications.api;

export const SwadeBaseSheetMixin = (Base) =>
  class SwadeBaseSheetMixin extends HandlebarsApplicationMixin(Base) {
    static DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration> = {
      classes: ['swade'],
      form: {
        submitOnChange: true,
        closeOnSubmit: false,
      },
      actions: {
        editImg: SwadeBaseSheetMixin._onEditImage,
      },
    };

    static TABS: Record<string, SwadeApplicationTab> = {};

    static async _onEditImage(
      this: SwadeBaseSheetMixin,
      _event: PointerEvent,
      _target: HTMLImageElement,
    ) {
      const { img } =
        this.document.constructor.getDefaultArtwork?.(
          this.document.toObject(),
        ) ?? {};
      const fp = new FilePicker({
        current: this.document.img,
        type: 'image',
        redirectToRoot: img ? [img] : [],
        callback: (path) => this.document.update({ img: path }),
        top: this.position.top + 40,
        left: this.position.left + 10,
      });
      return fp.browse();
    }

    // This is marked as private because there's no real need
    // for subclasses or external hooks to mess with it directly
    #dragDrop: DragDrop[];

    /** Returns an array of DragDrop instances */
    get dragDrop() {
      return this.#dragDrop;
    }

    tabGroups: Record<string, string> = {};

    constructor(options = {}) {
      super(options);
      this.#dragDrop = this.#createDragDropHandlers();
    }

    async _prepareContext(options: unknown) {
      const context = await super._prepareContext(options);
      return foundry.utils.mergeObject(context, {
        tabs: this._getTabs(),
        document: this.document,
      });
    }

    /**
     * Actions performed after any render of the Application.
     * Post-render steps are not awaited by the render process.
     * @param context Prepared context data
     * @param options Provided render options
     */
    protected _onRender(context: ApplicationRenderContext, options: unknown) {
      super._onRender(context, options);
      this.#dragDrop.forEach((d) => d.bind(this.element));
      this.#disableOverrides();
    }

    /**
     * Define whether a user is able to begin a dragstart workflow for a given drag selector
     * @param selector The candidate HTML selector for dragging
     * @returns Can the current user drag this selector?
     */
    protected _canDragStart(_selector: string): boolean {
      return this.isEditable;
    }

    /**
     * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
     * @param selector  The candidate HTML selector for the drop target
     * @returns Can the current user drop on this selector?
     */
    protected _canDragDrop(_selector: string): boolean {
      return this.isEditable;
    }

    /**
     * Callback actions which occur at the beginning of a drag start workflow.
     * @param event The originating DragEvent
     */
    protected _onDragStart(event: DragEvent) {
      const docRow = (event.currentTarget as HTMLElement).closest('li');
      if ('link' in (event.target as HTMLElement).dataset) return;

      // Chained operation
      const dragData = this._getEmbeddedDocument(docRow)?.toDragData();

      if (!dragData) return;

      // Set data transfer
      event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
    }

    /**
     * Callback actions which occur when a dragged element is over a drop target.
     * @param event The originating DragEvent
     */
    protected _onDragOver(_event: DragEvent) {}

    protected async _onDrop(_event: DragEvent): Promise<void> {}

    /**
     * Fetches the embedded document representing the containing HTML element
     * @param target  The element subject to search
     * @returns The embedded Item or ActiveEffect
     */
    protected _getEmbeddedDocument(
      target: HTMLElement,
    ): Item | ActiveEffect | void {
      const docRow = target.closest<HTMLLIElement>('li[data-document-class]');
      if (!docRow) return;
      if (docRow.dataset.documentClass === 'Item') {
        return this.actor.items.get(docRow.dataset.itemId);
      } else if (docRow.dataset.documentClass === 'ActiveEffect') {
        const parent =
          docRow.dataset.parentId === this.actor.id
            ? this.actor
            : this.actor.items.get(docRow?.dataset.parentId);
        return parent.effects.get(docRow?.dataset.effectId);
      } else return console.warn('Could not find document class');
    }

    /**
     * Utility method for _prepareContext to create the tab navigation.
     */
    protected _getTabs() {
      return Object.values(this.constructor.TABS).reduce(
        (acc: Record<string, ApplicationTab>, v: ApplicationTab) => {
          const isActive = this.tabGroups[v.group] === v.id;
          acc[v.id] = {
            ...v,
            active: isActive,
            cssClass: isActive ? 'active' : '',
            tabCssClass: isActive ? 'tab scrollable active' : 'tab scrollable',
          };
          return acc;
        },
        {},
      );
    }

    /**
     * Create drag-and-drop workflow handlers for this Application
     * @returns An array of DragDrop handlers
     */
    #createDragDropHandlers(): DragDrop[] {
      return this.options.dragDrop.map((d) => {
        d.permissions = {
          dragstart: this._canDragStart.bind(this),
          drop: this._canDragDrop.bind(this),
        };
        d.callbacks = {
          dragstart: this._onDragStart.bind(this),
          dragover: this._onDragOver.bind(this),
          drop: this._onDrop.bind(this),
        };
        return new DragDrop(d);
      });
    }

    /*Disables inputs subject to active effects*/
    #disableOverrides() {
      const flatOverrides = foundry.utils.flattenObject(
        this.document.overrides ?? {},
      );
      for (const override of Object.keys(flatOverrides)) {
        const input = this.element.querySelector(`[name="${override}"]`);
        if (input) input.disabled = true;
      }
    }
  };
