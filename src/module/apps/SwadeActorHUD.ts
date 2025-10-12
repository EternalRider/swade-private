import { setupHudStatHandlers } from '../hud/hud-stat-handlers';
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
import SwadeToken from '../canvas/SwadeToken';
import { HUDToken, SwadePopoutInstance } from '../../types/HUD';

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SwadeActorHUD extends HandlebarsApplicationMixin(ApplicationV2) {
  override setPosition(position?: {
    top?: number;
    left?: number;
    width?: number | 'auto';
    height?: number | 'auto';
    scale?: number;
    zIndex?: number;
  }): void | any {
    // Only allow positioning if this is user-initiated (has position data) or if it's the initial render
    const hasPositionData =
      position && (position.left !== undefined || position.top !== undefined);
    const isUserDrag =
      hasPositionData ||
      (this.element && this.element.classList.contains('dragging'));
    const isUserInteraction = hasPositionData || isUserDrag;

    // Don't reposition during custom dragging - let the drag handler control position
    if (isUserInteraction && !this.element?.classList.contains('dragging')) {
      const result = super.setPosition(position ?? {});
      if (this.element && !this._isInitialRender) {
        this.element.dispatchEvent(
          new CustomEvent('hud-moved', { bubbles: true }),
        );
      }
      return result;
    }

    // Allow initial render positioning
    if (this._isInitialRender) {
      return super.setPosition(position ?? {});
    }

    // Prevent automatic repositioning on renders
    return this;
  }

  static override DEFAULT_OPTIONS = {
    id: 'swadehud',
    window: { title: '', positioned: true, resizable: false, draggable: true },
    position: { width: 'auto' as const, height: 'auto' as const },
    classes: ['swadehud', 'app'],
  };
  static override PARTS = {
    body: { template: 'systems/swade/templates/actors/hud/hud-character.hbs' },
  };

  constructor(
    { actor, token }: { actor?: SwadeActor; token?: HUDToken } = {},
    options: Record<string, unknown> = {},
  ) {
    super(options);
    this.actor = actor ?? null;
    // Use .document if it exists, otherwise use the token itself
    const activeToken = actor?.getActiveTokens()?.[0];
    // Ensure token is always SwadeToken or null
    if (token) {
      this.token = token as HUDToken;
    } else if (
      activeToken &&
      'document' in activeToken &&
      activeToken.document instanceof SwadeToken
    ) {
      this.token = activeToken.document as HUDToken;
    } else if (activeToken instanceof SwadeToken) {
      this.token = activeToken as HUDToken;
    } else {
      this.token = null;
    }

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
  token: HUDToken | null;
  _isInitialRender: boolean;
  _positionTimeout: number | null;
  _onActorUpdate:
    | ((
        doc: SwadeActor,
        changes: Record<string, unknown>,
        opts: Record<string, unknown>,
        userId: string,
      ) => void)
    | null;
  _onActorDelete: ((doc: SwadeActor) => void) | null;
  _renderDebounced: (() => void) | null;

  // Popout instances for each tab
  currentTraitsPopout: SwadePopoutInstance | null = null;
  currentWeaponsPopout: SwadePopoutInstance | null = null;
  currentEdgesPopout: SwadePopoutInstance | null = null;
  currentActionsPopout: SwadePopoutInstance | null = null;
  currentConditionsPopout: SwadePopoutInstance | null = null;
  currentEffectsPopout: SwadePopoutInstance | null = null;
  currentPowersPopout: SwadePopoutInstance | null = null;
  currentGearPopout: SwadePopoutInstance | null = null;
  currentBioPopout: SwadePopoutInstance | null = null;

  override async _prepareContext(_options: Record<string, unknown>) {
    try {
      const context = await prepareHudContext(this.actor, this.token);
      return context;
    } catch (error) {
      console.error('SWADE HUD: Error preparing context:', error);
      return {};
    }
  }

  override async render(
    forceOrOptions?: boolean | Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<this> {
    try {
      // Support both (force, options) and (options) signatures
      let force: boolean;
      let opts: Record<string, unknown>;
      if (typeof forceOrOptions === 'boolean') {
        force = forceOrOptions;
        opts = options ?? {};
      } else {
        force = false;
        opts = forceOrOptions ?? {};
      }
      if (this.options && this.options.window) this.options.window.title = '';
      await super.render(force, opts);
      if (this.element) {
        // Only position at bottom left on initial render, not on updates
        if (this._isInitialRender) {
          // Position immediately for faster initial appearance
          this._adjustInitialPosition();
          this._isInitialRender = false;
        }
        // Inject a close button if not present
        if (!this.element.querySelector('.swadehud-popout-close')) {
          const closeBtn = document.createElement('button');
          closeBtn.className = 'swadehud-popout-close close-visible';
          closeBtn.type = 'button';
          closeBtn.setAttribute('aria-label', 'Close');
          closeBtn.innerHTML = '<i class="fas fa-times"></i>';
          this.element.insertBefore(closeBtn, this.element.firstChild);
          closeBtn.addEventListener('click', () => this.close());
        }
        this.activateListeners(this.element);
      }
      return this;
    } catch (error) {
      console.error('SWADE HUD: Error rendering HUD:', error);
      // Optionally show a fallback UI or error message here
      return this;
    }
  }

  activateListeners(html: HTMLElement) {
    try {
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

      // Attach shared stat handlers (bennies, conviction, pace, power points, soak, incapacitated, etc)
      // All stat click logic is handled centrally by setupHudStatHandlers
      if (html && this.actor && this.token) {
        setupHudStatHandlers(
          html,
          this.actor,
          () => {
            if (this._renderDebounced) this._renderDebounced();
            else this.render();
          },
          this.token,
        );
      }
    } catch (error) {
      console.error('SWADE HUD: Error activating listeners:', error);
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
    try {
      // Clean up actor update hooks
      if (this._onActorUpdate) {
        Hooks.off('updateActor', this._onActorUpdate);
        this._onActorUpdate = null;
      }
      if (this._onActorDelete) {
        Hooks.off('deleteActor', this._onActorDelete);
        this._onActorDelete = null;
      }

      // Close all open popouts
      const popoutProperties = [
        'currentTraitsPopout',
        'currentWeaponsPopout',
        'currentEdgesPopout',
        'currentActionsPopout',
        'currentConditionsPopout',
        'currentEffectsPopout',
        'currentPowersPopout',
        'currentGearPopout',
        'currentBioPopout',
      ];

      // Close all existing popouts
      for (const prop of popoutProperties) {
        if (this[prop]) {
          await this[prop].close();
          this[prop] = null;
        }
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
    } catch (error) {
      console.error('SWADE HUD: Error closing HUD:', error);
      return this;
    }
  }
}

export default SwadeActorHUD;
