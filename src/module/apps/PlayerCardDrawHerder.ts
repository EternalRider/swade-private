import { Logger } from '../Logger';
import type SwadeUser from '../documents/SwadeUser';
import type SwadeCombatant from '../documents/combat/SwadeCombatant';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class PlayerCardDrawHerder extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  declare ctx: HerderInternalContext;

  constructor(
    ctx: HerderConstructionContext,
    resolve: () => void,
    options?: Partial<foundry.applications.api.ApplicationV2.Configuration>
  ) {
    super(options);
    this.#callback = resolve;
    this.ctx = this.#initContext(ctx);
    this.#promptAllPlayers();
  }

  #isResolved = false;
  #callback: () => void;

  static asPromise(ctx: HerderConstructionContext): Promise<void> {
    return new Promise((resolve) =>
      new PlayerCardDrawHerder(ctx, resolve).render({ force: true })
    );
  }

  static override DEFAULT_OPTIONS = {
    window: {
      title: 'SWADE.PlayerCardDrawHelper.Title',
      contentClasses: ['standard-form'],
    },
    classes: ['swade-application'],
    position: {
      width: 400,
      height: 'auto' as const,
    },
    actions: {
      close: this.#onClose,
      override: this.#onOverride,
    },
  };

  static override PARTS = {
    herder: {
      template: 'systems/swade/templates/apps/player-card-draw-herder.hbs',
    },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  static #onClose(
    this: PlayerCardDrawHerder,
    _event: PointerEvent,
    _target: HTMLElement
  ) {
    return this.close();
  }

  static async #onOverride(
    this: PlayerCardDrawHerder,
    _event: PointerEvent,
    target: HTMLElement
  ) {
    const userId = target.dataset.userId;
    if (!userId) return;
    const draw = this.ctx.draws.find((d) => d.user.id === userId);
    if (!draw) return;
    const combat = game.combats?.get(this.ctx.combatId);
    if (!combat) return;
    await combat.rollInitiative(draw.combatant.id as string, {
      autoPick: true,
    });
  }

  override async _prepareContext(options) {
    const context = foundry.utils.mergeObject(
      await super._prepareContext(options),
      {
        draws: this.ctx.draws.map((draw) => {
          const base = {
            user: draw.user.name,
            combatant: draw.combatant.name,
            icon: this.#getIconForDraw(draw),
            userId: draw.user.id,
          };
          if (draw.state === PlayerDrawState.DRAWING) {
            (base as any).overrideButton = {
              type: 'button',
              action: 'override',
              icon: 'fa-solid fa-gavel',
              dataset: { userId: draw.user.id },
            };
          }
          return base;
        }),
        buttons: [{ type: 'button', action: 'close', label: 'Close' }],
      }
    );

    return context;
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
        draw.combatant.id as string
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
          _changed: Combatant.UpdateData,
          _options: Combatant.Database.OnUpdateOperation,
          triggeringUser: string
        ) => {
          if (triggeringUser !== userId || combatant.id !== combatantId) return;
          Logger.debug(`User ${game.users?.get(userId)?.name} drew a card!`);
          //clean up
          this.#cancelHook(hookId);
          this.#markPlayer(triggeringUser, PlayerDrawState.DONE);
          resolve();
        }
      );
      //poke the player client
      game.swade.sockets.promptInitiative(
        this.ctx.combatId,
        userId,
        combatantId
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
          '--fa-animation-duration: 2s'
        );
        break;
      case PlayerDrawState.DONE:
        classes.push('fa-check');
        style.push('color: var(--color-level-success)');
        break;
    }
    return new Handlebars.SafeString(
      `<i class='${classes.join(' ')}' style='${style.join(';')}'></i>`
    );
  }

  protected override _onClose(options) {
    super._onClose(options);
    if (!this.#isResolved) this.#callback();
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
