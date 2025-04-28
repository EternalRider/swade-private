interface ScrollRenderOptions extends Application.RenderOptions {
  scroll?: boolean;
}

interface CardData {
  name: string;
  img: string;
  cardValue: number;
  suitValue: number;
  isJoker: boolean;
}

export default class ActionCardEditor extends FormApplication<
  FormApplicationOptions,
  Cards
> {
  constructor(cards: Cards, options: Partial<FormApplicationOptions> = {}) {
    super(cards, options);
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize('SWADE.ActionCardEditor'),
      template: 'systems/swade/templates/apps/action-card-editor.hbs',
      classes: ['swade', 'action-card-editor', 'swade-app'],
      scrollY: ['.card-list'],
      width: 600,
      height: 'auto' as const,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }
  override get id(): string {
    return `actionCardEditor-${this.object.id}`;
  }

  get cards() {
    return this.object as Cards;
  }

  override async getData() {
    const data = {
      deckName: this.cards.name,
      cards: Array.from(this.cards.cards.values()).sort(this._sortCards),
      suitOptions: this.#getSuitOptions(),
      cardValues: this.#getCardValues(),
    };
    return data as any;
  }
  #getSuitOptions(): Record<number, string> {
    return {
      4: 'SWADE.Cards.Spades',
      3: 'SWADE.Cards.Hearts',
      2: 'SWADE.Cards.Diamonds',
      1: 'SWADE.Cards.Clubs',
      99: 'SWADE.Cards.Jokers',
    };
  }

  #getCardValues(): Record<number, string> {
    return {
      2: 'SWADE.Cards.Two',
      3: 'SWADE.Cards.Three',
      4: 'SWADE.Cards.Four',
      5: 'SWADE.Cards.Five',
      6: 'SWADE.Cards.Six',
      7: 'SWADE.Cards.Seven',
      8: 'SWADE.Cards.Eight',
      9: 'SWADE.Cards.Nine',
      10: 'SWADE.Cards.Ten',
      11: 'SWADE.Cards.Jack',
      12: 'SWADE.Cards.Queen',
      13: 'SWADE.Cards.King',
      14: 'SWADE.Cards.Ace',
      99: 'SWADE.Cards.RedJoker',
      98: 'SWADE.Cards.BlackJoker',
      97: 'SWADE.Cards.BlueJoker',
      96: 'SWADE.Cards.GreenJoker',
    };
  }

  override activateListeners(jquery: JQuery) {
    super.activateListeners(jquery);
    const html = jquery[0];
    html
      .querySelectorAll('.card-face')
      .forEach((el) =>
        el.addEventListener('click', (ev) => this._showCard(ev)),
      );
    html
      .querySelectorAll('.add-card')
      .forEach((el) =>
        el.addEventListener('click', async () => this._createNewCard()),
      );
  }

  protected override async _updateObject(_event: Event, formData = {}) {
    const data = foundry.utils.expandObject(formData);
    const cards = Object.entries(data.card) as [string, CardData][];
    const updates = new Array<Record<string, unknown>>();
    for (const [id, value] of cards) {
      const newData: Card.CreateData = {
        name: value.name,
        faces: [
          {
            name: value.name,
            img: value.img,
          },
        ],
        value: value.cardValue,
        system: {
          isJoker: value.suitValue > 90,
          suit: value.suitValue,
        },
      };
      //grab the current card and diff it against the object we got from the form
      const current = this.cards.cards.get(id, { strict: true });
      const diff = foundry.utils.diffObject(current.toObject(), newData);
      //skip if there's no differences
      if (foundry.utils.isEmpty(diff)) continue;
      //set the ID for the update
      diff['_id'] = id;
      updates.push(foundry.utils.flattenObject(diff));
    }
    await this.cards.updateEmbeddedDocuments('Card', updates);
    this.render(true);
  }

  private _sortCards(a: Card, b: Card) {
    const suitA = a.system['suit'];
    const suitB = b.system['suit'];
    const suit = suitB - suitA;
    if (suit !== 0) return suit;
    const cardA = a.value ?? 0;
    const cardB = b.value ?? 0;
    const card = cardB - cardA;
    return card;
  }

  private _showCard(event: PointerEvent) {
    const id = event.currentTarget?.dataset.id!;
    const card = this.cards.cards.get(id);
    if (!card) return;
    new ImagePopout({
      src: card.currentFace?.img!,
      shareable: true,
    }).render(true);
  }

  private async _createNewCard() {
    const newCard = await CONFIG.Card.documentClass.create(
      {
        name: game.i18n.format('DOCUMENT.New', {
          type: game.i18n.localize('DOCUMENT.Card'),
        }),
        type: 'poker',
        faces: [
          {
            img: 'systems/swade/assets/ui/ace-white.svg',
            name: 'New Card',
          },
        ],
        face: 0,
        origin: this.cards.id,
      },
      { parent: this.cards },
    );
    if (newCard) {
      this.render(true, { scroll: true });
    }
  }

  override render(force: boolean, options?: ScrollRenderOptions) {
    super.render(force, options);
  }

  override async _render(force?: boolean, options: ScrollRenderOptions = {}) {
    await super._render(force, options);
    if (options.scroll) {
      document.querySelector(`#${this.id} .card-list`)?.scrollIntoView(false);
    }
  }
}
