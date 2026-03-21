import SwadeCards from '../documents/card/SwadeCards';
import SwadeCombatant from '../documents/combat/SwadeCombatant';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CardPicker extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ ctx, resolve, ...options }: CardPickConfiguration) {
    super(options);
    this.#initContext(ctx);
    this.#callback = resolve;
    this.#hookId = Hooks.on('updateCombatant', this.#onCombatantUpdate.bind(this));
  }

  #ctx: CardPickContext;
  #callback: (result: CardPickResult) => void;
  #isResolved = false;
  #hookId: number;

  static asPromise({ ctx, ...options }: Omit<CardPickConfiguration, 'resolve'>): Promise<CardPickResult> {
    if (ctx.autoPick) {
      const sortedCards = foundry.utils.deepClone(ctx.cards).sort((a: Card, b: Card) => {
        const cardA = a.value ?? 0;
        const cardB = b.value ?? 0;
        const card = cardA - cardB;
        if (card !== 0) return card;
        const suitA = a.system['suit'] as number;
        const suitB = b.system['suit'] as number;
        return suitA - suitB;
      });
      return Promise.resolve({
        picked: sortedCards[0],
        cards: ctx.cards,
      });
    }
    return new Promise<CardPickResult>((resolve) =>
      new CardPicker({ ctx, resolve, ...options }).render({ force: true })
    );
  }

  static override DEFAULT_OPTIONS = {
    classes: ['card-picker', 'swade-application'],
    window: {
      contentClasses: ['standard-form'],
    },
    position: {
      width: 400,
      height: 'auto' as const,
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
    const buttons = [
      {
        type: 'button',
        action: 'submit',
        icon: 'fa-solid fa-check',
        label: 'SWADE.Ok',
      },
    ];

    if (this.#allowRedraw()) {
      buttons.push({
        type: 'button',
        action: 'redraw',
        icon: 'fa-solid fa-plus',
        label: 'SWADE.Redraw',
      });
    }

    const context = foundry.utils.mergeObject(await super._prepareContext(options), {
      cards: this.#cards,
      oldCard: this.#ctx.oldCardId,
      highestCardID: foundry.utils.deepClone(this.#cards).sort(this.#sortCards.bind(this))[0].id,
      buttons,
    });

    return context;
  }

  #initContext(ctx: CardPickContext): void {
    if (ctx.isQuickDraw) {
      ctx.enableRedraw = ctx.enableRedraw || !ctx.cards.every((card) => card.value! <= 5);
    }

    this.#ctx = ctx;
  }

  static #onSubmit(this: CardPicker, _event: PointerEvent, _target: HTMLElement) {
    const cardId = (this.element.querySelector('input[name=card]:checked') as HTMLInputElement)?.dataset.cardId as
      | string
      | undefined;
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

  static async #onRedraw(this: CardPicker, _event: PointerEvent, _target: HTMLElement) {
    const discardPile = (game.cards as any).get(game.settings.get('swade', 'actionDeckDiscardPile'), {
      strict: true,
    }) as Cards;
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

  #onCombatantUpdate(combatant: SwadeCombatant, changes: any) {
    if (combatant.id === this.#ctx.combatantId && changes.initiative !== undefined) {
      const sortedCards = foundry.utils.deepClone(this.#cards).sort(this.#sortCards.bind(this));
      this.#resolve({
        picked: sortedCards[0],
        cards: this.#cards,
      });
    }
  }

  override close(options?: foundry.applications.api.ApplicationV2.ClosingOptions): Promise<this> {
    Hooks.off('updateCombatant', this.#hookId);
    return super.close(options);
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

interface CardPickConfiguration extends Partial<foundry.applications.api.ApplicationV2.Configuration> {
  ctx: CardPickContext;
  resolve: (result: CardPickResult) => void;
}

export interface CardPickContext {
  /** an array of cards */
  cards: Card[];
  /** name of the combatant */
  combatantName: string;
  /** a deck from which to draw cards, should the need arise */
  deck?: SwadeCards;
  /** id of the combatant */
  combatantId?: string | null;
  /** id of the old card, if you're picking cards for a redraw */
  oldCardId?: string | null;
  /** determines whether a redraw is allowed */
  enableRedraw?: boolean;
  /** determines whether this draw includes the Quick edge */
  isQuickDraw?: boolean;
  /** auto pick the highest card */
  autoPick?: boolean;
}
