import { SWADE } from '../config';
import SwadeUser from '../documents/SwadeUser';

export default class PlayerBennyDisplay {
  element: HTMLElement;
  player: SwadeUser;
  counter: HTMLSpanElement;

  get bennies() {
    if (this.player.isGM) {
      return this.player.getFlag('swade', 'bennies') ?? 0;
    } else if (this.player.character) {
      return this.player.character.bennies;
    } else {
      return 'X';
    }
  }

  constructor(element: HTMLElement) {
    //Gather the data
    const userId = element.dataset.userId!;
    const player = game.users!.get(userId, { strict: true });
    //return early if there's not actually anything to display
    if (!player.isGM && !player.character) return;
    this.element = element;
    this.player = player;
    this.#initialize();
  }

  #initialize() {
    //Create counter
    this.counter = document.createElement('span');
    this.counter.classList.add('bennies-count');
    this.counter.addEventListener('mouseleave', this.updateBennyCount.bind(this));
    this.counter.addEventListener('mouseover', this.onMouseOver.bind(this));

    if (game.user?.isGM) {
      this._initGameMaster();
    } else {
      this.#initPlayer();
    }
    //append the counter to the player list
    this.element.append(this.counter);
  }

  /** GM interactive interface */
  private _initGameMaster() {
    this.counter.classList.add('bennies-gm');
    this.counter.innerHTML = this.bennies.toString();
    const callback = this.player.isGM ? this.onSpendBenny : this.onGiveBenny;
    this.counter.addEventListener('click', callback.bind(this));
    this.counter.title = this.player.isGM
      ? game.i18n.localize('SWADE.BenniesSpend')
      : game.i18n.localize('SWADE.BenniesGive');
  }

  /** Player view */
  #initPlayer() {
    this.counter.innerHTML = this.bennies.toString();
    if (this.player.character && game.userId === this.player.id) {
      this.counter.addEventListener('click', this.onSpendBenny.bind(this));
      this.counter.title = game.i18n.localize('SWADE.BenniesSpend');
    }
  }

  updateBennyCount(ev?: PointerEvent) {
    ev?.preventDefault();
    this.counter.innerHTML = this.bennies.toString();
  }

  onMouseOver() {
    if (game.user?.isGM && this.player.character) {
      this.counter.innerHTML = this.player.isGM ? '-' : '+';
    } else if (this.player.character && game.userId === this.player.id) {
      this.counter.innerHTML = '-';
    }
  }

  async onGiveBenny(ev?: PointerEvent) {
    ev?.preventDefault();
    await this.player.getBenny();
    this.updateBennyCount(ev);
  }

  async onSpendBenny(ev?: PointerEvent) {
    ev?.preventDefault();
    await this.player.spendBenny();
    this.updateBennyCount(ev);
  }

  static async refreshAll() {
    for (const user of game.users!.values()) {
      await user.refreshBennies(false);
    }

    const npcWildcardsToRefresh = game.actors!.filter((a) => a.type === 'npc' && a.isWildcard);

    const hardChoices = game.settings.get('swade', 'hardChoices');
    for (const actor of npcWildcardsToRefresh) {
      if (hardChoices) await actor.update({ 'system.bennies.value': 0 });
      else await actor.refreshBennies(false);
    }

    if (game.settings.get('swade', 'notifyBennies')) {
      const message = await foundry.applications.handlebars.renderTemplate(SWADE.bennies.templates.refreshAll, {});
      CONFIG.ChatMessage.documentClass.create({
        content: message,
      });
    }
    ui.players?.render({ force: true });
  }
}
