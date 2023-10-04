import Document from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { ActorDataSource } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/actorData';
import { ActorMetadata, ItemMetadata, JournalMetadata } from '../../globals';
import { SWADE } from '../config';
import SwadeItem from '../documents/item/SwadeItem';
import { Logger } from '../Logger';

export class CompendiumTOC extends Compendium<
  CompendiumTOCMetadata,
  TOCApplicationOptions
> {
  #disclaimer?: string;
  #fullTextSearch: boolean;

  static get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swade-app', 'compendium-toc'],
      template: 'systems/swade/templates/apps/compendium-toc.hbs',
      width: 800,
      resizable: true,
      filters: [
        { inputSelector: '[name="search"]', contentSelector: '.content' },
      ],
      dragDrop: [
        { dropSelector: null, dragSelector: '.toc-entry' },
        { dropSelector: null, dragSelector: '.journal' },
      ],
    });
  }

  static ALLOWED_TYPES = ['Actor', 'Item', 'JournalEntry'];

  static CF_ENTITY = '#[CF_tempEntity]';

  constructor(
    collection: CompendiumCollection<CompendiumTOCMetadata>,
    options?: Partial<TOCApplicationOptions>,
  ) {
    super(collection, options);
    this.#disclaimer = options?.disclaimer;
    this.#fullTextSearch = false;
  }

  get isJournal(): boolean {
    return this.metadata.type === 'JournalEntry';
  }

  get isActor(): boolean {
    return this.metadata.type === 'Actor';
  }

  get columnWidth(): string {
    switch (this.metadata.type) {
      case 'JournalEntry':
        return '230px';
      default:
        return '300px';
    }
  }

  get maxColumns(): number {
    switch (this.metadata.type) {
      case 'JournalEntry':
        return 3;
      default:
        return 5;
    }
  }

  activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    html.find('a').on('click', this._onClickLink.bind(this));
    html[0]
      .querySelectorAll<HTMLDivElement>('.content')
      .forEach((e) => (e.style.columnWidth = this.columnWidth));

    // set up resize observer
    new ResizeObserver(this._onObserveResize.bind(this)).observe(html[0]);
  }

  async getData(
    options?: Partial<ApplicationOptions>,
  ): Promise<CompendiumTOCData> {
    const data: CompendiumTOCData = {
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
    };

    if (this.#fullTextSearch) {
      data.searchMode.icon = 'fa-file-magnifying-glass';
      data.searchMode.tooltip = 'SIDEBAR.SearchModeFull';
    }

    if (this.isJournal) {
      data.entries = await this._getJournalEntries();
    } else {
      data.categories = await this._groupContent();
    }
    return foundry.utils.mergeObject(await super.getData(options), data);
  }

  protected override async _onDragStart(event: DragEvent) {
    const src = event.currentTarget as HTMLElement;
    if (!src.dataset.documentId) return;
    const document = await this.collection.getDocument(src.dataset.documentId);
    if (!document) return;
    const dragData = {
      type: this.metadata.type,
      uuid: document.uuid,
    };
    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  protected override async _onDrop(event: DragEvent) {
    await super._onDrop(event);
    this.render(true);
  }

  protected async _onClickLink(ev: JQuery.ClickEvent) {
    const target = ev.currentTarget;
    if (target.className === 'toggle-search-mode') {
      this.#fullTextSearch = !this.#fullTextSearch;
    } else if (target.className === 'createDocument') {
      CONFIG[this.entryType].documentClass.createDialog(
        {},
        {
          renderSheet: true,
          pack: this.collection.metadata.id,
        },
      );
    } else {
      const documentId =
        target.closest('[data-document-id]')?.dataset.documentId;
      const pageId = target.closest('[data-page-id]')?.dataset.pageId;
      if (!documentId) return;
      const options: Record<string, unknown> = {};
      if (pageId) options.pageId = pageId;
      const doc = await this.collection.getDocument(documentId);
      doc?.sheet?.render(true, options);
    }
  }

  protected override _contextMenu(html: JQuery<HTMLElement>): void {
    const items = this._getEntryContextOptions();
    const selector = this.isJournal ? '.journal header' : '[data-document-id]';
    ContextMenu.create(this, html, selector, items);
  }

  protected override _onSearchFilter(
    _event: KeyboardEvent,
    _query: string,
    rgx: RegExp,
    html: HTMLElement,
  ) {
    const selector = this.isJournal ? '.page' : '.toc-entry';
    const children = html.querySelectorAll<HTMLLIElement>(selector);
    const pack = game.packs.get(this.collection.metadata.id);
    if (this.#fullTextSearch) {
      let searchFields: Array<String> = [];
      switch (this.collection.metadata.type) {
        case 'Actor':
          searchFields = CONFIG.SWADE.textSearch.actor;
          break;
        case 'Adventure':
          searchFields = CONFIG.SWADE.textSearch.adventure;
          break;
        case 'Cards':
          searchFields = CONFIG.SWADE.textSearch.cards;
          break;
        case 'Item':
          searchFields = CONFIG.SWADE.textSearch.item;
          break;
        case 'JournalEntry':
          searchFields = CONFIG.SWADE.textSearch.journalentry.concat(
            CONFIG.JournalEntry.compendiumIndexFields,
          );
          break;
        case 'Macro':
          searchFields = CONFIG.SWADE.textSearch.macro;
          break;
        case 'Playlist':
          searchFields = CONFIG.SWADE.textSearch.playlist;
          break;
        case 'RollTable':
          searchFields = CONFIG.SWADE.textSearch.rolltable;
          break;
        case 'Scene':
          searchFields = CONFIG.SWADE.textSearch.scene;
          break;
      }
      pack.getIndex({
        fields: searchFields,
      });
      const searchResults: Array<Document> = pack.search({ query: rgx.source });
      for (const li of children) {
        if (this.#fullTextSearch) {
          if (searchResults.some((e) => e._id === li.dataset.documentId)) {
            li.style.display = 'flex';
          } else {
            li.style.display = 'none';
          }
        }
      }
    } else {
      for (const li of children) {
        const name = li.querySelector<HTMLAnchorElement>('.name')!;
        const match = rgx.test(SearchFilter.cleanQuery(name.innerText));
        li.style.display = match ? 'flex' : 'none';
      }
    }
    this._fitColumns(this.element[0], html);
  }

  protected async _groupContent(): Promise<CompendiumCategory[]> {
    if (this.metadata.type === 'Item') {
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
        'prototypeToken.randomImg',
        'prototypeToken.texture.src',
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
    const powers = items.filter((i) => i.type === 'power');
    if (powers.length) {
      categories.push({
        category: game.i18n.localize('TYPES.Item.power'),
        groups: this._groupPowers(powers),
      });
    }
    const edges = items.filter((i) => i.type === 'edge');
    if (edges.length) {
      categories.push({
        category: game.i18n.localize('TYPES.Item.edge'),
        groups: this._groupEdges(edges),
      });
    }
    const hindrances = items.filter((i) => i.type === 'hindrance');
    if (hindrances.length) {
      categories.push({
        category: game.i18n.localize('TYPES.Item.hindrance'),
        entries: this._groupHindrances(hindrances),
      });
    }

    //sort all items by type
    const itemsByType: Record<string, StoredDocument<SwadeItem>[]> = {};
    const leftovers = items.filter(
      (i) => !['edge', 'power', 'hindrance'].includes(i.type),
    );
    for (const item of leftovers) {
      const type = item.type;
      if (!itemsByType[type]) itemsByType[type] = [];
      itemsByType[type].push(item);
    }

    const itemsByCategory: Record<string, StoredDocument<SwadeItem>[]> = {};

    //first we handle items by type
    for (const type in itemsByType) {
      const items = itemsByType[type];
      const typeLabel = game.i18n.localize(`TYPES.Item.${type}`);

      const [unCategorized, categorized] = items.partition(
        (i) => i.canHaveCategory && !!getProperty(i, 'system.category'),
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
    hindrances: StoredDocument<SwadeItem>[],
  ): CompendiumEntry[] {
    return hindrances
      .map((hindrance) => {
        const isMajor = foundry.utils.getProperty(hindrance, 'system.major');
        const name = `${hindrance.name} ${
          isMajor ? game.i18n.localize('SWADE.Major') : ''
        }`;
        return {
          name: name.trim(),
          id: hindrance.id,
          img: hindrance.img,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)) as CompendiumEntry[];
  }

  protected _groupPowers(
    powers: StoredDocument<SwadeItem>[],
  ): CompendiumGroup[] {
    const groups: Record<string, StoredDocument<SwadeItem>[]> = {};
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

  protected _groupEdges(edges: StoredDocument<SwadeItem>[]): CompendiumGroup[] {
    const groups: Record<string, StoredDocument<SwadeItem>[]> = {};
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
              return {
                name: entry.name as string,
                id: entry.id,
                img: entry.img,
              };
            })
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      });
  }

  protected async _groupUnCategorized(
    docs: StoredDocument<SwadeItem>[] | ActorIndexEntry[],
  ): Promise<CompendiumEntry[]> {
    const mapped = docs.map(async (doc) => {
      const isItem = doc?.documentName === 'Item';
      if (isItem) {
        return {
          name: doc.name as string,
          id: doc.id,
          img: doc.img,
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
                id: p.id,
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
        [path] = await Actor._requestTokenImages(actor._id, {
          pack: this.collection.metadata.id,
        });
      } catch (error) {
        Logger.error(error);
      }
    } else if (prototypeToken?.texture.src) {
      //Priority 3: Normal token art
      const texture = prototypeToken.texture;
      path = texture.src;
      scale = (texture.scaleX + texture.scaleY) / 2; // get the average
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
  searchMode: {
    icon: 'fa-search' | 'fa-file-magnifying-glass';
    tooltip: string;
  };
}

interface CompendiumEntry {
  name: string;
  id: string;
  artwork?: TokenArt;
  img?: string | null;
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

type TOCApplicationOptions = ApplicationOptions & {
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
  };
} & Partial<ActorDataSource>;
