import SwadeCards from '../documents/card/SwadeCards';

export class CardPicker extends Application {
  static asPromise(
    ctx: CardPickContext,
    options?: Partial<ApplicationOptions>,
  ): Promise<CardPickResult> {
    return new Promise<CardPickResult>(
      (resolve) => new CardPicker(ctx, resolve, options),
    );
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['card-picker', 'swade-app'],
      height: 'auto' as const,
      width: 400,
      template: 'systems/swade/templates/apps/card-picker.hbs',
    });
  }

  constructor(
    ctx: CardPickContext,
    resolve: (result: CardPickResult) => void,
    options?: Partial<ApplicationOptions>,
  ) {
    super(options);
    this.#initContext(ctx);
    this.#callback = resolve;
    this.render(true);
  }

  #ctx: CardPickContext;

  #callback: (result: CardPickResult) => void;
  #isResolved = false;

  override get title() {
    return game.i18n.format('SWADE.PickACard', {
      name: this.#ctx.combatantName,
    });
  }

  get #cards(): Card[] {
    return this.#ctx.cards;
  }

  override activateListeners(jquery: JQuery<HTMLElement>): void {
    super.activateListeners(jquery);
    const html = jquery[0];

    html
      .querySelector<HTMLButtonElement>('.submit')
      ?.addEventListener('click', this.#submit.bind(this));
    html
      .querySelector<HTMLButtonElement>('.redraw')
      ?.addEventListener('click', this.#drawCard.bind(this));
  }

  override async getData(
    options?: Partial<ApplicationOptions>,
  ): Promise<object> {
    const data = {
      cards: this.#cards,
      oldCard: this.#ctx.oldCardId,
      highestCardID: foundry.utils
        .deepClone(this.#ctx.cards)
        .sort(this.#sortCards.bind(this))[0].id,
      allowRedraw: this.#allowRedraw(),
    };
    return foundry.utils.mergeObject(await super.getData(options), data);
  }

  #initContext(ctx: CardPickContext): void {
    if (ctx.isQuickDraw) {
      ctx.enableRedraw =
        ctx.enableRedraw || !ctx.cards.every((card) => card.value! <= 5);
    }

    this.#ctx = ctx;
  }

  #submit() {
    const cardId = this.element
      .find('input[name=card]:checked')
      .data('card-id') as string | undefined;
    const picked = this.#cards.find((c) => c.id === cardId);
    this.#resolve({
      cards: this.#cards,
      picked: picked || this.#getFallBackCard(),
    });
  }

  #resolve(result: CardPickResult) {
    this.#isResolved = true;
    this.#callback(result);
    this.close();
  }

  async #drawCard() {
    const discardPile: Cards = game.cards!.get(
      game.settings.get('swade', 'actionDeckDiscardPile'),
      { strict: true },
    );
    const cards = await this.#ctx.deck.dealForInitiative(discardPile);
    this.#cards.push(...cards);
    this.render();
  }

  #allowRedraw(): boolean {
    if (this.#ctx.isQuickDraw) {
      return this.#cards.every((card) => card.value! <= 5);
    }
    return !!this.#ctx.oldCardId || !!this.#ctx.enableRedraw;
  }

  #getFallBackCard(): Card {
    let picked: Card | undefined;
    if (this.#ctx.oldCardId) {
      picked = this.#cards.find((c) => c.id === this.#ctx.oldCardId);
    } else {
      picked = this.#cards.find((c) => c.system['isJoker']) || this.#cards[0];
    }
    return picked as Card;
  }

  #sortCards(a: Card, b: Card): number {
    const cardA = a.value ?? 0;
    const cardB = b.value ?? 0;
    const card = cardB - cardA;
    if (card !== 0) return card;
    const suitA = a.system['suit'] ?? 0;
    const suitB = b.system['suit'] ?? 0;
    return suitB - suitA;
  }

  override close(options?: Application.CloseOptions) {
    if (!this.#isResolved) {
      this.#callback({
        cards: this.#cards,
        picked: this.#getFallBackCard(),
      });
    }
    return super.close(options);
  }
}

export interface CardPickResult {
  picked: Card;
  cards: Card[];
}

export interface CardPickContext {
  /** a deck from which to draw cards, should the need arise */
  deck: SwadeCards;
  /** an array of cards */
  cards: Card[];
  /** name of the combatant */
  combatantName: string;
  /** id of the old card, if you're picking cards for a redraw */
  oldCardId?: string;
  /** determines whether a redraw is allowed */
  enableRedraw?: boolean;
  /** determines whether this draw includes the Quick edge */
  isQuickDraw?: boolean;
}
