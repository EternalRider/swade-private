interface CardData {
  name: string;
  img: string;
  cardValue: number;
  suitValue: number;
  isJoker: boolean;
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class ActionCardEditor extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ cards, ...options }: ActionCardEditorConfiguration) {
    super(options);
    this.#cards = cards;
  }

  #cards: Cards;

  static override DEFAULT_OPTIONS = {
    window: {
      title: 'SWADE.ActionCardEditor',
      contentClasses: ['standard-form'],
    },
    position: {
      width: 600,
      height: 'auto' as const,
    },
    classes: ['swade', 'action-card-editor', 'swade-application'],
    tag: 'form',
    form: {
      handler: ActionCardEditor.onSubmit,
      closeOnSubmit: false,
      submitOnClose: false,
    },
    actions: {
      addCard: ActionCardEditor.#onAddCard,
      showCard: ActionCardEditor.#onShowCard,
      deleteCard: ActionCardEditor.#onDeleteCard,
    },
  };

  static override PARTS = {
    form: {
      template: 'systems/swade/templates/apps/action-card-editor.hbs',
      scrollable: ['.card-list'],
    },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  override get id(): string {
    return `actionCardEditor-${this.cards.id}`;
  }

  get cards() {
    return this.#cards;
  }

  override async _prepareContext(options) {
    const context = foundry.utils.mergeObject(await super._prepareContext(options), {
      deckName: this.cards.name,
      cards: Array.from(this.cards.cards.values()).sort(this._sortCards),
      suitOptions: this.#getSuitOptions(),
      cardValues: this.#getCardValues(),
      buttons: [
        {
          type: 'submit',
          icon: 'fa-regular fa-save',
          label: 'SETTINGS.Save',
        },
      ],
    });
    return context;
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

  static async onSubmit(
    this: ActionCardEditor,
    _event: SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended
  ) {
    const data = foundry.utils.expandObject(formData.object);
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
    this.render({ force: true });
  }

  private _sortCards(a: Card, b: Card) {
    const suitA = a.system['suit'] ?? 0;
    const suitB = b.system['suit'] ?? 0;
    const suit = suitB - suitA;
    if (suit !== 0) return suit;
    const cardA = a.value ?? 0;
    const cardB = b.value ?? 0;
    const card = cardB - cardA;
    return card;
  }

  static #onShowCard(this: ActionCardEditor, _event: PointerEvent, target: HTMLElement) {
    const id = target.dataset.id!;
    const card = this.cards.cards.get(id);
    if (!card.currentFace?.img) return;
    new foundry.applications.apps.ImagePopout({
      src: card.currentFace.img,
    }).render({ force: true });
  }

  static async #onAddCard(this: ActionCardEditor, _event: PointerEvent, _target: HTMLElement) {
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
      { parent: this.cards }
    );
    if (newCard) {
      await this.render({ force: true });
      this.element.querySelector('.card-list')?.scrollIntoView(false);
    }
  }

  static async #onDeleteCard(this: ActionCardEditor, _event: PointerEvent, target: HTMLElement) {
    const card = this.cards.cards.get(target.dataset.id);
    if (!card) return;
    const text = game.i18n.format('SWADE.DeleteEmbeddedCardPrompt', {
      card: card.name,
    });
    await foundry.applications.api.DialogV2.confirm({
      content: `<p class="text-center">${text}</p>`,
      classes: ['dialog', 'swade-app'],
      yes: {
        callback: async () => {
          await card.delete();
          this.render({ force: true });
        },
      },
    });
  }
}

export interface ActionCardEditorConfiguration extends Partial<foundry.applications.api.ApplicationV2.Configuration> {
  cards: Cards;
}
