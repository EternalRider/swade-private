import { Logger } from '../Logger';
import type SwadeUser from '../documents/SwadeUser';
import type SwadeCombatant from '../documents/combat/SwadeCombatant';

export class PlayerCardDrawHerder extends Application<ApplicationOptions> {
  #callback: () => void;
  #isResolved = false;
  ctx: HerderInternalContext;

  static asPromise(ctx: HerderConstructionContext): Promise<void> {
    return new Promise((resolve) => new PlayerCardDrawHerder(ctx, resolve));
  }

  constructor(
    ctx: HerderConstructionContext,
    resolve: () => void,
    options?: Partial<ApplicationOptions>,
  ) {
    super(options);
    this.#callback = resolve;
    this.ctx = this.#initContext(ctx);
    this.#promptAllPlayers();
    this.render(true);
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize('SWADE.PlayerCardDrawHelper.Title'),
      template: 'systems/swade/templates/apps/player-card-draw-herder.hbs',
      classes: ['swade-app'],
      width: 400,
      height: 'auto' as const,
      id: 'foo',
    });
  }

  override activateListeners(jquery: JQuery<HTMLElement>): void {
    const html = jquery[0];
    html
      .querySelector<HTMLButtonElement>('.close')
      ?.addEventListener('click', this.close.bind(this));
  }

  override getData(options?: Partial<ApplicationOptions>) {
    const data = {
      draws: this.ctx.draws.map((draw) => {
        return {
          user: draw.user.name,
          combatant: draw.combatant.name,
          icon: this.#getIconForDraw(draw),
        };
      }),
    };
    return foundry.utils.mergeObject(super.getData(options), data);
  }

  #initContext(ctx: HerderConstructionContext): HerderInternalContext {
    const internal = { ...ctx };
    internal.draws = internal.draws.map((draw) => {
      return {
        ...draw,
        state: PlayerDrawState.PENDING,
      };
    }) as PlayerDrawInternal[];
    return internal as HerderInternalContext;
  }

  async #promptAllPlayers() {
    for (const draw of this.ctx.draws) {
      Logger.debug('Waiting for user' + draw.user.name);
      //mark the user as drawing
      this.#markPlayer(draw.user.id as string, PlayerDrawState.DRAWING);
      await this.#promptPlayerForInitiative(
        draw.user.id as string,
        draw.combatant.id as string,
      );
    }
    this.#resolve();
  }

  async #promptPlayerForInitiative(userId: string, combatantId: string) {
    let hookId: number;

    //build and execute the main show
    await new Promise<void>((resolve) => {
      //register the hook
      hookId = Hooks.on(
        'updateCombatant',
        (
          combatant: SwadeCombatant,
          _changed: foundry.documents.BaseCombatant.UpdateData,
          _options: Combatant.DatabaseOperations['update'],
          triggeringUser: string,
        ) => {
          if (triggeringUser !== userId || combatant.id !== combatantId) return;
          Logger.debug(`User ${game.users?.get(userId)?.name} drew a card!`);
          //clean up
          this.#cancelHook(hookId);
          this.#markPlayer(triggeringUser, PlayerDrawState.DONE);
          resolve();
        },
      );
      //poke the player client
      game.swade.sockets.promptInitiative(
        this.ctx.combatId,
        userId,
        combatantId,
      );
    });
  }

  #cancelHook(id: number) {
    Hooks.off('updateCombatant', id);
  }

  #markPlayer(userId: string, newState: PlayerDrawState) {
    const draw = this.ctx.draws.find((draw) => draw.user.id === userId);
    if (draw) draw.state = newState;
    setTimeout(() => this.render());
  }

  #resolve() {
    this.#isResolved = true;
    this.#callback();
  }

  #getIconForDraw(draw: PlayerDrawInternal): Handlebars.SafeString {
    const style: string[] = [];
    const classes: string[] = ['fa-xl', 'fa-solid'];
    switch (draw.state) {
      case PlayerDrawState.PENDING:
        classes.push('fa-hourglass');
        style.push('color: var(--color-text-dark-inactive)');
        break;
      case PlayerDrawState.DRAWING:
        classes.push('fa-cards', 'fa-fade');
        style.push(
          'color: var(--color-level-info)',
          '--fa-animation-duration: 2s',
        );
        break;
      case PlayerDrawState.DONE:
        classes.push('fa-check');
        style.push('color: var(--color-level-success)');
        break;
    }
    return new Handlebars.SafeString(
      `<i class='${classes.join(' ')}' style='${style.join(';')}'></i>`,
    );
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    if (!this.#isResolved) this.#callback();
    return super.close(options);
  }
}

export interface HerderConstructionContext {
  combatId: string;
  draws: PlayerDraw[];
}

export interface PlayerDraw {
  user: SwadeUser;
  combatant: SwadeCombatant;
}

interface HerderInternalContext {
  combatId: string;
  draws: PlayerDrawInternal[];
}

interface PlayerDrawInternal extends PlayerDraw {
  state: PlayerDrawState;
}

enum PlayerDrawState {
  PENDING = 'pending',
  DRAWING = 'drawing',
  DONE = 'done',
}
