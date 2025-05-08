import { ActorMetadata, ItemMetadata, JournalMetadata } from '../../globals';
import { Logger } from '../Logger';
import { SWADE } from '../config';
import { constants } from '../constants';
import SwadeItem from '../documents/item/SwadeItem';

export class CompendiumTOC<
  DocumentClass extends Actor.ImplementationClass | Item.ImplementationClass | JournalEntry.ImplementationClass,
  RenderContext extends CompendiumTOCData & foundry.applications.sidebar.apps.Compendium.RenderContext,
  Configuration extends TOCApplicationOptions<CompendiumTOCMetadata> & foundry.applications.sidebar.apps.Compendium.Configuration
> extends foundry.applications.sidebar.apps.Compendium<
  DocumentClass,
  RenderContext,
  Configuration,
  foundry.applications.api.ApplicationV2.RenderOptions
> {
  #disclaimer?: string;
  #fullTextSearch: boolean;
  #dragDrop: foundry.applications.ux.DragDrop[];
  #filters: foundry.applications.ux.SearchFilter[];

  static override DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    window: {
      resizable: true
    },
    position: {
      width: 800
    },
    dragDrop: [
      { dropSelector: null, dragSelector: '.toc-entry' },
      { dropSelector: null, dragSelector: '.journal' }
    ],
    filters: [
      { inputSelector: '[name="search"]', contentSelector: '.content' },
      { inputSelector: '[name="category"]', contentSelector: '.content' }
    ],
    actions: {
      toggleSearchMode: CompendiumTOC.#onToggleSearchMode,
      createDocument: CompendiumTOC.#onCreateDocument,
      openDocument: CompendiumTOC.#onOpenDocument
    },
    classes: ['swade-app', 'compendium-toc']
  }, { inplace: false });

  static override PARTS = {
    directory: { template: 'systems/swade/templates/apps/compendium-toc.hbs' }
  };

  static ALLOWED_TYPES = ['Actor', 'Item', 'JournalEntry'];

  static CF_ENTITY = '#[CF_tempEntity]';

  constructor(options?: Configuration) {
    super(options);
    this.#disclaimer = options?.disclaimer;
    this.#fullTextSearch = false;
    this.#dragDrop = this.#createDragDropHandlers();
    this.#filters = this.#createFiltersHandlers();
  }

  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this)
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        drop: this._onDrop.bind(this)
      };
      return new foundry.applications.ux.DragDrop.implementation(d);
    });
  }

  #createFiltersHandlers() {
    return this.options.filters.map((f) => {
      f.callback = this._onSearchFilter.bind(this);
      // f.initial = this.element.querySelector(f.inputSelector)?.value;
      return new foundry.applications.ux.SearchFilter(f);
    });
  }

  get isJournal(): boolean {
    return this.documentName === 'JournalEntry';
  }

  get isActor(): boolean {
    return this.documentName === 'Actor';
  }

  get columnWidth(): string {
    switch (this.documentName) {
      case 'JournalEntry':
        return '230px';
      default:
        return '300px';
    }
  }

  get maxColumns(): number {
    switch (this.documentName) {
      case 'JournalEntry':
        return 3;
      default:
        return 5;
    }
  }

  protected override _initializeApplicationOptions(options) {
    if (!options.classes?.includes('themed')) {
      options.classes ??= [];
      options.classes.push('themed', 'theme-light');
    }
    return super._initializeApplicationOptions(options);
  }

  override async _onRender(context, options) {
    await super._onRender(context, options);
    const html = this.element;
    this.#dragDrop.forEach((d) => d.bind(html));
    this.#filters.forEach((f) => f.bind(html));
    html
      .querySelectorAll<HTMLDivElement>('.content')
      .forEach((e) => (e.style.columnWidth = this.columnWidth));
    new ResizeObserver(this._onObserveResize.bind(this)).observe(html);
  }

  override async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const tocContext: CompendiumTOCData = {
      isJournal: this.isJournal,
      isActor: this.isActor,
      header: game.i18n.localize('SWADE.CompendiumTOC.Header'),
      wildCardMarker: CONFIG.SWADE.wildCardIcons.compendium,
      columnWidth: this.columnWidth,
      disclaimer: this.#disclaimer,
      searchMode: {
        icon: 'fa-search',
        tooltip: 'SIDEBAR.SearchModeName',
      },
    }

    if (this.#fullTextSearch) {
      tocContext.searchMode.icon = 'fa-file-magnifying-glass';
      tocContext.searchMode.tooltip = 'SIDEBAR.SearchModeFull';
    }
  
    if (this.isJournal) {
      tocContext.entries = await this._getJournalEntries();
    } else {
      tocContext.categories = await this._groupContent();
    }

    if (this.isActor) {
      tocContext.actorCategories = Array.from(this.collection.index.reduce((acc, actor) => acc.add(actor.system?.category ?? ''), new Set([''])));
    }
    return foundry.utils.mergeObject(context, tocContext);
  }

  protected override _onDragStart(event: DragEvent) {
    const src = event.currentTarget as HTMLElement;
    if (!src.dataset.entryId) return;
    const indexData = this.collection.index.get(src.dataset.entryId);
    if (!indexData) return;
    const dragData = {
      type: this.documentName,
      uuid: indexData.uuid,
    };
    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  protected async _onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const data = JSON.parse(event.dataTransfer!.getData('text/plain')) as {
        type: string;
        uuid: string;
      };
      const entry = await fromUuid(data.uuid);
      await super._createDroppedEntry(entry);
    } catch (error) {
      Logger.error(error);
    }
    this.render(true);
  }

  static #onToggleSearchMode(
    this: CompendiumTOC,
    _event: PointerEvent,
    _target: HTMLElement
  ) {
    this.#fullTextSearch = !this.#fullTextSearch;
    this.render();
  }

  static #onCreateDocument(
    this: CompendiumTOC,
    _event: PointerEvent,
    _target: HTMLElement
  ) {
    this.documentClass.createDialog(
      {},
      {
        renderSheet: true,
        pack: this.collection.metadata.id
      }
    );
  }

  static async #onOpenDocument(
    this: CompendiumTOC,
    _event: PointerEvent,
    target: HTMLElement
  ) {
    const entryId = target?.closest('[data-entry-id]')?.dataset.entryId;
    const pageId = target?.closest('[data-page-id]')?.dataset.pageId;
    if (!entryId) return;
    const options: Record<string, unknown> = {};
    if (pageId) options.pageId = pageId;
    const doc = await this.collection.getDocument(entryId);
    if (!doc) return;
    if (doc.sheet instanceof Application) 
      await doc.sheet?._render(true, options);
    else if (doc.sheet instanceof foundry.applications.api.ApplicationV2)
      await doc.sheet.render({ force: true });
    if (pageId) doc.sheet.goToPage(pageId);
  }

  protected override _createContextMenus() {
    const selector = this.isJournal ? '.journal header' : '[data-entry-id]';
    this._createContextMenu(this._getEntryContextOptions, selector, {
      fixed: true,
      hookName: `get${this.documentName}ContextOptions`,
      parentClassHooks: false
    });
  }

  protected override _onSearchFilter(
    _event: KeyboardEvent,
    _query: string,
    _rgx: RegExp,
    html: HTMLElement,
  ) {
    const selector = this.isJournal ? '.page' : '.toc-entry';
    const children = html.querySelectorAll<HTMLLIElement>(selector);
    const pack = game.packs.get(this.collection.metadata.id, { strict: true });
    const category = this.element.querySelector('[name="category"]')?.value;
    const queryRaw = this.element.querySelector('[name="search"]')?.value ?? '';
    const query = foundry.applications.ux.SearchFilter.cleanQuery(queryRaw);
    const rgx = new RegExp(RegExp.escape(query), 'i');
    let searchFields: Array<string> = [];
    switch (this.collection.metadata.type) {
      case 'Actor':
        searchFields = CONFIG.SWADE.textSearch.actor;
        break;
      // case 'Adventure':
      //   searchFields = CONFIG.SWADE.textSearch.adventure;
      //   break;
      // case 'Cards':
      //   searchFields = CONFIG.SWADE.textSearch.cards;
      //   break;
      case 'Item':
        searchFields = CONFIG.SWADE.textSearch.item;
        break;
      case 'JournalEntry':
        searchFields = CONFIG.SWADE.textSearch.journalentry.concat(
          CONFIG.JournalEntry.compendiumIndexFields,
        );
        break;
      // case 'Macro':
      //   searchFields = CONFIG.SWADE.textSearch.macro;
      //   break;
      // case 'Playlist':
      //   searchFields = CONFIG.SWADE.textSearch.playlist;
      //   break;
      // case 'RollTable':
      //   searchFields = CONFIG.SWADE.textSearch.rolltable;
      //   break;
      // case 'Scene':
      //   searchFields = CONFIG.SWADE.textSearch.scene;
      //   break;
    }
    pack.getIndex({ fields: searchFields }).then(() => {
      const searchConfig = {
        filters: []
      };
      if (category?.length) searchConfig.filters.push({
        field: 'system.category',
        value: category
      });
      if (this.#fullTextSearch) {
        searchConfig.query = query;
      }
      let searchResults = pack.search(searchConfig);
      if (this.isJournal) searchResults = searchResults.flatMap(i => i.pages);
      if (!this.#fullTextSearch) {
        searchResults = searchResults.filter(i => rgx.test(i.name));
      }
      for (const li of children) {
        if (searchResults.some((e) => [li.dataset.entryId, li.dataset.pageId].includes(e._id))) {
          li.style.display = 'flex';
        } else {
          li.style.display = 'none';
        }
      }
      this._fitColumns(this.element, html);
    });
  }

  protected async _groupContent(): Promise<CompendiumCategory[]> {
    if (this.documentName === 'Item') {
      return this._groupItems();
    } else {
      return this._groupActors();
    }
  }

  protected async _groupActors(): Promise<CompendiumCategory[]> {
    const collection = this.collection as CompendiumCollection<ActorMetadata>;
    const documents = (await collection.getIndex({
      fields: [
        /** legacy data start */
        'data.wildcard',
        'token.img',
        'token.scale',
        /** legacy data end*/
        'system.wildcard',
        'system.category',
        'prototypeToken.randomImg',
        'prototypeToken.texture.src',
        'prototypeToken.texture.scaleX',
        'prototypeToken.texture.scaleY',
      ],
    })) as Collection<ActorIndexEntry>;
    const actors = documents.filter(
      (doc) => doc.name !== CompendiumTOC.CF_ENTITY,
    );

    const actorsByType: Record<string, ActorIndexEntry[]> = {};
    for (const actor of actors) {
      const type = actor.type;
      if (!actorsByType[type]) actorsByType[type] = [];
      actorsByType[type].push(actor);
    }

    const categories: CompendiumCategory[] = [];

    for (const type in actorsByType) {
      const actors = actorsByType[type];
      categories.push({
        category: game.i18n.localize(`TYPES.Actor.${type}`),
        entries: await this._groupUnCategorized(actors),
      });
    }

    return categories
      .sort((a, b) => a.category.localeCompare(b.category))
      .filter((cat) => cat.groups?.length || cat.entries?.length);
  }

  protected async _groupItems(): Promise<CompendiumCategory[]> {
    const collection = this.collection as CompendiumCollection<ItemMetadata>;
    const documents = await collection.getDocuments();
    const items = documents.filter(
      (doc) => doc.name !== CompendiumTOC.CF_ENTITY,
    );

    //set up category groups
    const categories: CompendiumCategory[] = [];

    //always group powers by type and then rank
    const powers: foundry.abstract.Document.Stored<SwadeItem<'power'>>[] =
      items.filter((i) => i.type === 'power');
    if (powers.length) {
      categories.push({
        category: game.i18n.localize('TYPES.Item.power'),
        groups: this._groupPowers(powers),
      });
    }
    const edges: foundry.abstract.Document.Stored<SwadeItem<'edge'>>[] =
      items.filter((i) => i.type === 'edge');
    if (edges.length) {
      categories.push({
        category: game.i18n.localize('TYPES.Item.edge'),
        groups: this._groupEdges(edges),
      });
    }
    const hindrances: foundry.abstract.Document.Stored<
      SwadeItem<'hindrance'>
    >[] = items.filter((i) => i.type === 'hindrance');
    if (hindrances.length) {
      categories.push({
        category: game.i18n.localize('TYPES.Item.hindrance'),
        entries: this._groupHindrances(hindrances),
      });
    }

    //sort all items by type
    const itemsByType: Record<string, Item.Stored[]> = {};
    const leftovers = items.filter(
      (i) => !['edge', 'power', 'hindrance'].includes(i.type),
    );
    for (const item of leftovers) {
      const type = item.type;
      if (!itemsByType[type]) itemsByType[type] = [];
      itemsByType[type].push(item);
    }

    const itemsByCategory: Record<string, Item.Stored[]> = {};

    //first we handle items by type
    for (const type in itemsByType) {
      const items = itemsByType[type];
      const typeLabel = game.i18n.localize(`TYPES.Item.${type}`);

      const [unCategorized, categorized] = items.partition(
        (i) =>
          i.canHaveCategory &&
          !!foundry.utils.getProperty(i, 'system.category'),
      );

      //handle the un-categorized things first, which are sorted by type
      categories.push({
        category: typeLabel,
        entries: await this._groupUnCategorized(unCategorized),
      });

      //sort categorized items by category
      for (const item of categorized) {
        const category = foundry.utils.getProperty(item, 'system.category');
        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        itemsByCategory[category].push(item);
      }
    }

    for (const category in itemsByCategory) {
      const items = itemsByCategory[category];
      categories.push({
        category: category,
        entries: await this._groupUnCategorized(items),
      });
    }

    return categories
      .sort((a, b) => a.category.localeCompare(b.category))
      .filter((cat) => cat.groups?.length || cat.entries?.length);
  }

  protected _groupHindrances(
    hindrances: foundry.abstract.Document.Stored<SwadeItem<'hindrance'>>[],
  ): CompendiumEntry[] {
    return hindrances
      .map((hindrance) => {
        let suffix: string;
        if (hindrance.system.isMajor) {
          suffix = game.i18n.localize('SWADE.Major');
        } else if (
          hindrance.system.severity === constants.HINDRANCE_SEVERITY.MINOR
        ) {
          suffix = game.i18n.localize('SWADE.Minor');
        } else {
          suffix = `(${game.i18n.localize('SWADE.HindMajor')} / ${game.i18n.localize('SWADE.HindMinor')})`;
        }
        const name = `${hindrance.name} ${suffix}`;
        return {
          name: name.trim(),
          id: hindrance.id,
          img: hindrance.img,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)) as CompendiumEntry[];
  }

  protected _groupPowers(powers: Item.Stored[]): CompendiumGroup[] {
    const groups: Record<string, Item.Stored[]> = {};
    for (const power of powers) {
      const rank = foundry.utils.getProperty(power, 'system.rank') as string;
      if (!groups[rank]) groups[rank] = [];
      groups[rank].push(power);
    }

    return Object.entries(groups)
      .sort((a, b) => SWADE.ranks.indexOf(a[0]) - SWADE.ranks.indexOf(b[0]))
      .map((val) => {
        return {
          group: val[0],
          entries: val[1]
            .map((entry) => {
              return {
                name: entry.name as string,
                id: entry.id,
                img: entry.img,
              };
            })
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      }) as CompendiumGroup[];
  }

  protected _groupEdges(
    edges: foundry.abstract.Document.Stored<SwadeItem<'edge'>>[],
  ): CompendiumGroup[] {
    const groups: Record<
      string,
      foundry.abstract.Document.Stored<SwadeItem<'edge'>>[]
    > = {};
    for (const edge of edges) {
      const cat: string = foundry.utils.getProperty(edge, 'system.category');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(edge);
    }
    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map((val) => {
        return {
          group: val[0],
          entries: val[1]
            .map((entry) => {
              const requirements = entry.system.requirementString ?? '';
              return {
                name: entry.name as string,
                id: entry.id,
                img: entry.img,
                requirements: requirements.replace(/<\/?i>/g, ''),
              };
            })
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      }) as CompendiumGroup[];
  }

  protected async _groupUnCategorized(
    docs: Item.Stored[] | ActorIndexEntry[],
  ): Promise<CompendiumEntry[]> {
    const mapped = docs.map(async (doc) => {
      const isItem = doc?.documentName === 'Item';
      if (isItem) {
        const requirements = doc.system.requirementString ?? '';
        return {
          name: doc.name as string,
          id: doc.id,
          img: doc.img,
          requirements: requirements.replace(/<\/?i>/g, ''),
        };
      }
      return {
        name: doc.name as string,
        id: doc._id,
        img: await this._getActorTokenImage(doc),
        isWildcard: this._actorIsWildcard(doc),
      };
    });
    const resolved = await Promise.all(mapped);
    return resolved.sort((a, b) => a.name.localeCompare(b.name));
  }

  protected async _getJournalEntries(): Promise<CompendiumEntry[]> {
    const collection = this.collection as CompendiumCollection<JournalMetadata>;
    const journals = await collection.getDocuments();
    const entries: CompendiumEntry[] = journals
      .filter((doc) => doc.name !== CompendiumTOC.CF_ENTITY)
      .sort(this._sortDocs)
      .map((doc) => {
        let pages: CompendiumPage[] = [];
        if (doc.pages.size > 1) {
          pages = doc.pages
            .map((p) => {
              return {
                id: p.id!,
                name: p.name,
                sort: p.sort,
              };
            })
            .sort(this._sortDocs);
        }
        return {
          name: doc.name!,
          id: doc.id,
          pages: pages,
        };
      });
    return entries;
  }

  private _onObserveResize(
    entries: ResizeObserverEntry[],
    _observer: ResizeObserver,
  ) {
    for (const entry of entries) {
      const content = entry.target.querySelector<HTMLElement>('.content')!;
      this._fitColumns(entry.target, content);
      //move the searchbar
      const search = entry.target.querySelector<HTMLInputElement>('.search');
      if (entry.target.clientWidth < 400) {
        search?.classList.remove('top-row');
        search?.classList.add('second-row');
      } else {
        search?.classList.add('top-row');
        search?.classList.remove('second-row');
      }
    }
  }

  private _fitColumns(parent: Element, content: HTMLElement) {
    let isOverFlowing = content.scrollHeight > parent.clientHeight;
    let columnCount = 1;
    do {
      content.style.columnCount = columnCount.toString();
      isOverFlowing = content.scrollHeight > parent.clientHeight;
      columnCount++;
    } while (isOverFlowing && columnCount <= this.maxColumns);
  }

  private _sortDocs(a, b) {
    const sort = a.sort - b.sort;
    if (sort !== 0) return sort;
    return a.name.localeCompare(b.name);
  }

  private _requestTokenImages(actorId: string, pack: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      game.socket.emit('requestTokenImages', actorId, { pack }, result => {
        if (result.error) return reject(new Error(result.error));
        resolve(result.files);
      });
    });
  }

  private async _getActorTokenImage(actor: ActorIndexEntry): Promise<TokenArt> {
    let path!: string;
    let scale = 1;
    const pack = this.collection.metadata.id;
    const prototypeToken = actor.prototypeToken;
    //Priority 1: Compendium Artpacks
    if (game.swade.compendiumArt.map.has(`Compendium.${pack}.${actor._id}`)) {
      return this._getCompendiumArt(actor);
    }
    //Priority 2: random token art
    else if (prototypeToken?.randomImg) {
      try {
        [path] = await this._requestTokenImages(actor._id, this.collection.metadata.id);
      } catch (error) {
        Logger.error(error);
      }
    } else if (prototypeToken?.texture.src) {
      //Priority 3: Normal token art
      const texture = prototypeToken.texture;
      path = texture.src;
      scale = (texture.scaleX! + texture.scaleY!) / 2; // get the average
    } else if (actor.token.img) {
      //legacy code
      path = actor.token.img;
      scale = actor.token.scale;
    } else {
      //lowest Priority actor image
      path = actor.img;
    }

    return { path, scale };
  }

  private _actorIsWildcard(actor: ActorIndexEntry): boolean {
    // eslint-disable-next-line deprecation/deprecation
    return actor.system?.wildcard || actor.data?.wildcard;
  }

  private _getCompendiumArt(actor: ActorIndexEntry): TokenArt {
    const pack = this.collection.metadata.id;
    const art = game.swade.compendiumArt.map.get(
      `Compendium.${pack}.${actor._id}`,
    );
    let path = '';
    let scale = 1;
    if (art) {
      actor.img = art.actor;
      if (typeof art.token === 'string') {
        path = art.token;
      } else {
        path = art.token.img;
        scale = art.token.scale;
      }
    }
    return { path, scale };
  }
}

// TODO: Evaluate how much we care about keeping this
interface CompendiumTOCData
  extends Partial<Compendium.Data<CompendiumTOCMetadata>> {
  isJournal: boolean;
  isActor: boolean;
  header: string;
  wildCardMarker: string;
  columnWidth: string;
  disclaimer?: string;
  entries?: CompendiumEntry[];
  categories?: CompendiumCategory[];
  actorCategories?: string[];
  searchMode: {
    icon: 'fa-search' | 'fa-file-magnifying-glass';
    tooltip: string;
  };
}

interface CompendiumEntry {
  name: string;
  id: string;
  artwork?: TokenArt;
  img?: string | null | TokenArt;
  /** only relevant for actors */
  isWildcard?: boolean;
  /** array of pages in the journal entry */
  pages?: CompendiumPage[];
}

interface CompendiumPage {
  id: string;
  name: string;
  sort?: number;
}

export type CompendiumTOCMetadata = CompendiumCollection.Metadata & {
  type: 'Actor' | 'Item' | 'JournalEntry';
};

type TOCApplicationOptions<Metadata extends CompendiumCollection.Metadata> =
  Compendium.Options<Metadata> & {
    disclaimer?: string;
  };

interface CompendiumCategory {
  category: string;
  groups?: CompendiumGroup[];
  entries?: CompendiumEntry[];
}

interface CompendiumGroup {
  group: string;
  entries: CompendiumEntry[];
}

interface TokenArt {
  path: string;
  scale: number;
}

type ActorIndexEntry = {
  _id: string;
  name: string;
  type: 'character' | 'npc' | 'vehicle';
  img: string;
  data: { wildcard: boolean };
  prototypeToken?: {
    randomImg: boolean;
    texture: {
      src: string;
    };
  };
  token: {
    img: string;
    scale: number;
  };
} & foundry.documents.BaseActor;
