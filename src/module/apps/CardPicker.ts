import SwadeCards from '../documents/card/SwadeCards';

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CardPicker extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ ctx, resolve, ...options }: CardPickConfiguration) {
    super(options);
    this.#initContext(ctx);
    this.#callback = resolve;
  }

  #ctx: CardPickContext;
  #callback: (result: CardPickResult) => void;
  #isResolved = false;

  static asPromise({
    ctx,
    ...options
  }: Omit<CardPickConfiguration, 'resolve'>): Promise<CardPickResult> {
    return new Promise<CardPickResult>((resolve) =>
      new CardPicker({ ctx, resolve, ...options }).render({ force: true }),
    );
  }

  static override DEFAULT_OPTIONS = {
    classes: ['card-picker', 'swade-application'],
    window: {
      contentClasses: ['standard-form'],
    },
    position: {
      width: 400,
      height: 'auto',
    },
    actions: {
      submit: this.#onSubmit,
      redraw: this.#onRedraw,
    },
  };

  static override PARTS = {
    picker: { template: 'systems/swade/templates/apps/card-picker.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  override get title() {
    return game.i18n.format('SWADE.PickACard', {
      name: this.#ctx.combatantName,
    });
  }

  get #cards(): Card[] {
    return this.#ctx.cards;
  }

  override async _prepareContext(options) {
    const context = foundry.utils.mergeObject(
      await super._prepareContext(options),
      {
        cards: this.#cards,
        oldCard: this.#ctx.oldCardId,
        highestCardID: foundry.utils
          .deepClone(this.#cards)
          .sort(this.#sortCards.bind(this))[0].id,
        buttons: [
          {
            type: 'button',
            action: 'submit',
            icon: 'fa-solid fa-check',
            label: 'SWADE.Ok',
          },
        ],
      },
    );

    if (this.#allowRedraw()) {
      context.buttons.push({
        type: 'button',
        action: 'redraw',
        icon: 'fa-solid fa-plus',
        label: 'SWADE.Redraw',
      });
    }

    return context;
  }

  #initContext(ctx: CardPickContext): void {
    if (ctx.isQuickDraw) {
      ctx.enableRedraw =
        ctx.enableRedraw || !ctx.cards.every((card) => card.value! <= 5);
    }

    this.#ctx = ctx;
  }

  static #onSubmit(
    this: CardPicker,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    const cardId = this.element.querySelector('input[name=card]:checked')
      ?.dataset.cardId as string | undefined;
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

  static async #onRedraw(
    this: CardPicker,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
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

  protected override _onClose(options) {
    super._onClose(options);
    if (!this.#isResolved) {
      this.#callback({
        cards: this.#cards,
        picked: this.#getFallBackCard(),
      });
    }
  }
}

export interface CardPickResult {
  picked: Card;
  cards: Card[];
}

interface CardPickConfiguration
  extends Partial<foundry.applications.api.ApplicationV2.Configuration> {
  ctx: CardPickContext;
  resolve: (result: CardPickResult) => void;
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
