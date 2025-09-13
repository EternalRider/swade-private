import { setupAddSubtractClicks } from '../hud/hud-stat-handlers';
import { prepareHudContext } from '../hud/hud-context';
import { setupHudActionButtonListeners } from '../hud/hud-actions';
import {
  setupTabHandlers,
  setupRollButtonHandlers,
  setupAbilityHandlers,
  setupPortraitHandler,
  setupDragHandler,
} from '../hud/hud-interaction-handlers';
import SwadeActor from '../documents/actor/SwadeActor';

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SwadeActorHUD extends HandlebarsApplicationMixin(ApplicationV2) {
  setPosition(...args: any[]) {
    // Only allow positioning if this is user-initiated (has position data) or if it's the initial render
    const hasPositionData =
      args.length > 0 &&
      args[0] &&
      (args[0].left !== undefined || args[0].top !== undefined);
    const isUserDrag =
      hasPositionData ||
      (this.element && this.element.classList.contains('dragging'));
    const isUserInteraction = hasPositionData || isUserDrag;

    // Don't reposition during custom dragging - let the drag handler control position
    if (isUserInteraction && !this.element?.classList.contains('dragging')) {
      const result = super.setPosition ? super.setPosition(...args) : undefined;
      if (this.element && !this._isInitialRender) {
        this.element.dispatchEvent(
          new CustomEvent('hud-moved', { bubbles: true }),
        );
      }
      return result;
    }

    // Allow initial render positioning
    if (this._isInitialRender) {
      const result = super.setPosition ? super.setPosition(...args) : undefined;
      return result;
    }

    // Prevent automatic repositioning on renders
    return this;
  }

  static override DEFAULT_OPTIONS = {
    id: 'swadehud',
    window: { title: '', positioned: true, resizable: false, draggable: true },
    position: { width: 'auto', height: 'auto' },
    classes: ['swadehud', 'app'],
  };
  static override PARTS = {
    body: { template: 'systems/swade/templates/apps/hud-character.hbs' },
  };

  constructor(
    { actor, token }: { actor?: SwadeActor; token?: any } = {},
    options: any = {},
  ) {
    super(options);
    this.actor = actor ?? null;
    this.token = token ?? actor?.getActiveTokens()?.[0]?.document ?? null;

    // Track if this is the initial render to avoid repositioning on updates
    this._isInitialRender = true;
    this._positionTimeout = null;

    // Set up actor update hooks for real-time synchronization
    this._onActorUpdate = (
      doc: any,
      _changes: any,
      _opts: any,
      _userId: string,
    ) => {
      if (doc.id === this.actor?.id) {
        // Debounce rapid updates to prevent excessive re-renders
        if (this._renderDebounced) {
          this._renderDebounced();
        } else {
          this.render();
        }
      }
    };

    this._onActorDelete = (doc: any) => {
      if (doc.id === this.actor?.id) {
        this.close();
      }
    };

    // Hook into actor updates if we have an actor
    if (this.actor) {
      Hooks.on('updateActor', this._onActorUpdate);
      Hooks.on('deleteActor', this._onActorDelete);
    }

    // Create debounced render method to handle rapid updates
    this._renderDebounced = foundry.utils.debounce(() => {
      if (this.rendered) this.render();
    }, 50);
  }

  actor: SwadeActor | null;
  token: any;
  _isInitialRender: boolean;
  _positionTimeout: any;
  _onActorUpdate: any;
  _onActorDelete: any;
  _renderDebounced: any;
  currentTraitsPopout: any;
  currentWeaponsPopout: any;
  currentEdgesPopout: any;
  currentActionsPopout: any;
  currentConditionsPopout: any;
  currentEffectsPopout: any;
  currentPowersPopout: any;
  currentGearPopout: any;
  currentBioPopout: any;

  override async _prepareContext(_options: any) {
    const context = await prepareHudContext(this.actor, this.token);
    console.log('HUD Context:', context);
    return context;
  }

  override async render(force = false, options: any = {}) {
    this.options.window.title = '';
    console.log(
      'SWADE HUD: Starting render, actor:',
      this.actor?.name,
      'token:',
      this.token?.name,
    );
    console.log('SWADE HUD: PARTS config:', this.constructor.PARTS);
    const result = await super.render(force, options);
    console.log('SWADE HUD: Render complete, element exists:', !!this.element);
    if (this.element) {
      console.log('SWADE HUD: Full element HTML:', this.element.innerHTML);
      console.log('SWADE HUD: Element children:', this.element.children.length);
      for (let i = 0; i < this.element.children.length; i++) {
        console.log(
          `SWADE HUD: Child ${i}:`,
          this.element.children[i].tagName,
          this.element.children[i].className,
        );
      }
      // Only position at bottom left on initial render, not on updates
      if (this._isInitialRender) {
        // Position immediately for faster initial appearance
        this._adjustInitialPosition();
        this._isInitialRender = false;
      }
      this.activateListeners(this.element);
    }
    return result;
  }

  activateListeners(html: HTMLElement) {
    // Setup action button listeners for main HUD
    setupHudActionButtonListeners(html, this.actor, this);

    // Setup tab handlers for panel switching
    setupTabHandlers(html, this);

    // Setup roll button handlers for various actions
    setupRollButtonHandlers(html, this);

    // Setup ability handlers for special actions (soak, incapacitated)
    setupAbilityHandlers(html, this);

    // Setup portrait handler
    setupPortraitHandler(html, this);

    // Setup drag handler for moving the HUD
    setupDragHandler(html);

    // Setup benny and conviction stat click handlers (bottom row)
    // Bennies
    const bennyStat = html.querySelector(
      '[data-stat-path="system.bennies.value"]',
    );
    if (bennyStat && this.actor) {
      setupAddSubtractClicks(
        bennyStat as HTMLElement,
        this.actor,
        'system.bennies.value',
        0,
        null,
        () => this.render(),
      );
    }

    // Conviction (now uses data-stat-path for consistency)
    const convictionStat = html.querySelector(
      '[data-stat-path="system.conviction.value"]',
    );
    if (convictionStat && this.actor) {
      setupAddSubtractClicks(
        convictionStat as HTMLElement,
        this.actor,
        'system.conviction.value',
        0,
        null,
        () => this.render(),
      );
    }
  }

  /**
   * Adjusts the initial position set by base class for smooth reveal
   */
  _adjustInitialPosition() {
    if (!this.element) return;

    // Position at bottom-left by default
    this.element.style.position = 'fixed';
    this.element.style.left = '10px';
    this.element.style.top = `${window.innerHeight - this.element.offsetHeight - 10}px`;
    this.element.style.zIndex = '1000';

    // Show HUD immediately
    this.element.classList.add('hud-positioned');
  }

  override async close(options: any = {}) {
    // Clean up actor update hooks
    if (this._onActorUpdate) {
      Hooks.off('updateActor', this._onActorUpdate);
      this._onActorUpdate = null;
    }
    if (this._onActorDelete) {
      Hooks.off('deleteActor', this._onActorDelete);
      this._onActorDelete = null;
    }

    // Close any open popouts
    if (this.currentTraitsPopout) {
      await this.currentTraitsPopout.close();
    }
    if (this.currentWeaponsPopout) {
      await this.currentWeaponsPopout.close();
    }
    if (this.currentEdgesPopout) {
      await this.currentEdgesPopout.close();
    }
    if (this.currentActionsPopout) {
      await this.currentActionsPopout.close();
    }
    if (this.currentConditionsPopout) {
      await this.currentConditionsPopout.close();
    }
    if (this.currentEffectsPopout) {
      await this.currentEffectsPopout.close();
    }
    if (this.currentPowersPopout) {
      await this.currentPowersPopout.close();
    }
    if (this.currentGearPopout) {
      await this.currentGearPopout.close();
    }
    if (this.currentBioPopout) {
      await this.currentBioPopout.close();
    }

    // Remove positioned class to hide HUD
    if (this.element) {
      this.element.classList.remove('hud-positioned');
    }

    // Clear any pending positioning timeout
    if (this._positionTimeout) {
      clearTimeout(this._positionTimeout);
      this._positionTimeout = null;
    }

    // Reset initial render flag for next open
    this._isInitialRender = true;

    return super.close(options);
  }
}

export default SwadeActorHUD;
