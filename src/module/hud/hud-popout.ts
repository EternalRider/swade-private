import { setupHudActionButtonListeners } from './hud-actions';
import {
  getAllApplicableEffects,
  getEnrichedDescription,
  getItemsByType,
  prepareHudContext,
  renderCachedTemplate,
} from './hud-context';
import { hudPanelConfig } from './hud-panel-constants';
import { setupHudStatHandlers } from './hud-stat-handlers';
import { debounce } from './hud-utils';

/**
 * Options for creating a SwadePopout HUD panel.
 * @typedef {Object} SwadePopoutOptions
 * @property {any} actor - The actor to display in the HUD panel.
 * @property {any} [token] - The token associated with the actor.
 * @property {string} panelType - The type of HUD panel (e.g., 'weapons', 'traits').
 * @property {string} title - The title of the HUD panel window.
 * @property {string} template - The Handlebars template path for rendering.
 * @property {number} [width] - Optional width of the panel.
 * @property {number} [height] - Optional height of the panel.
 * @property {{ left: number, top: number }} [position] - Optional position for the panel.
 * @property {any} [hudInstance] - Reference to the HUD instance for positioning.
 */
export interface SwadePopoutOptions {
  actor: any;
  token?: any;
  panelType: string;
  title: string;
  template: string;
  width?: number;
  height?: number;
  position?: { left: number; top: number };
  hudInstance?: any;
}

/**
 * SWADE HUD popout panel for displaying actor data in various panel types.
 * Handles rendering, context preparation, event listeners, and UI logic.
 */
export class SwadePopout {
  private _isInitialRender = true;
  private _template: string;
  private context: any;
  private options: any;
  public element: HTMLElement | null = null;
  // Stored hook handler so we can unregister when the popout closes
  private _actorUpdateHandler: any = null;
  private actor: any;
  private panelType: string;

  /**
   * Create a new SwadePopout HUD panel.
   * @param {SwadePopoutOptions} options - Options for the HUD panel.
   */
  constructor(options: SwadePopoutOptions) {
    // Use centralized hudPanelConfig for template paths
    this._template =
      hudPanelConfig[options.panelType]?.template || options.template;
    this.context = {};
    this.options = options;
    this.actor = options.actor;
    this.panelType = options.panelType;
  }

  static DEFAULT_OPTIONS = {
    id: 'swadehud-popout',
    window: {
      title: 'SWADE HUD Panel',
      positioned: true,
      resizable: true,
      draggable: true,
      minimizable: false,
      frame: true,
    },
    position: { width: 400, height: 600 },
    classes: ['swadehud', 'swadehud-popout'],
  };

  static PARTS = {
    body: { template: '' }, // Will be set dynamically
  };

  /**
   * Prepare the rendering context for the HUD panel based on actor and panel type.
   * @param {any} _options - Options for context preparation.
   * @returns {Promise<any>} The prepared context object.
   */
  async _prepareContext(_options: any) {
    // Always get fresh actor data for context preparation
    const freshActor = this.actor?.id
      ? game.actors.get(this.actor.id) || this.actor
      : this.actor;
    // Ensure panel preparation methods use the fresh actor reference so live updates are reflected
    this.actor = freshActor;
    const context = await prepareHudContext(freshActor, this.options.token);

    // Add panel-specific context based on panel type
    switch (this.panelType) {
      case 'weapons':
        Object.assign(context, this.prepareWeaponsPanelData(context));
        break;
      case 'traits':
        Object.assign(context, this.prepareTraitsPanelData(context));
        break;
      case 'edges':
        Object.assign(context, this.prepareEdgesPanelData(context));
        break;
      case 'actions':
        Object.assign(context, this.prepareActionsPanelData(context));
        break;
      case 'gear':
        Object.assign(context, this.prepareGearPanelData(context));
        break;
      case 'conditions':
        Object.assign(context, await this.prepareConditionsPanelData(context));
        break;
      case 'effects':
        Object.assign(context, await this.prepareEffectsPanelData(context));
        break;
      case 'powers':
        Object.assign(context, this.preparePowersPanelData(context));
        break;
      case 'bio':
        Object.assign(context, await this.prepareBioPanelData(context));
        break;
      default:
        break;
    }

    this.context = context;
    return context;
  }

  /**
   * Render the HUD panel using the cached template and prepared context.
   * @param {boolean} [_force=false] - Force re-rendering.
   * @param {Record<string, unknown>} [options={}] - Additional rendering options.
   * @returns {Promise<this>} The SwadePopout instance.
   */
  async render(_force = false, options: Record<string, unknown> = {}) {
    // Prepare context with fresh actor data (handled in _prepareContext)
    await this._prepareContext(options);

    // Render the template with the context using cached templates for better performance
    let htmlContent;
    try {
      htmlContent = await renderCachedTemplate(this._template, this.context);
    } catch (error) {
      console.error('SWADE HUD: Error rendering cached template:', error);
      // Fallback to standard rendering if cached rendering fails
      const renderTemplate = foundry?.applications?.handlebars?.renderTemplate;
      if (typeof renderTemplate === 'function') {
        htmlContent = await renderTemplate(this._template, this.context);
      }
    }

    // Create the popout element with note box structure
    if (!this.element) {
      this.element = document.createElement('div');
    } else {
      // Clear existing content for re-renders
      this.element.innerHTML = '';
    }
    this.element.className = `swadehud-popout swadehud-popout--${this.options.side || 'right'}`;

    // Create note box structure with HUD-specific classes
    const noteHeader = document.createElement('div');
    noteHeader.className = 'swadehud-note-header';

    const noteMain = document.createElement('div');
    noteMain.className = 'swadehud-note-main';
    noteMain.innerHTML = htmlContent || '';

    const noteFooter = document.createElement('div');
    noteFooter.className = 'swadehud-note-footer';

    // Add close button to popout (not header)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'swadehud-popout-close close-visible';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    this.element.appendChild(closeBtn);

    // Assemble the note box
    this.element.appendChild(noteHeader);
    this.element.appendChild(noteMain);
    this.element.appendChild(noteFooter);

    // Center the popout over the HUD if hudInstance is provided, else center in viewport
    if (this.options.hudInstance && this.options.hudInstance.element) {
      const hudRect = this.options.hudInstance.element.getBoundingClientRect();
      const centerX = hudRect.left + hudRect.width / 2;
      const centerY = hudRect.top + hudRect.height / 2;
      this.element.style.position = 'fixed';
      this.element.style.left = `${centerX}px`;
      this.element.style.top = `${centerY}px`;
      this.element.style.transform = 'translate(-50%, -50%)';
      this.element.style.maxWidth = '90vw';
    }

    if (!document.body.contains(this.element)) {
      document.body.appendChild(this.element);
    }

    // Add animation class to make it visible, unless options.animate === false
    setTimeout(() => {
      if (this.element && options.animate !== false) {
        this.element.classList.add('popout-animate');
      }
    }, 10);

    // Activate listeners
    this.activateListeners();
    // Attach shared stat handlers
    if (this.element && this.actor) {
      // Always get fresh actor data for stat handlers
      const freshActor = this.actor?.id
        ? game.actors.get(this.actor.id) || this.actor
        : this.actor;
      setupHudStatHandlers(
        this.element,
        freshActor,
        () => this.render(false, { animate: false }),
        this.options.token ?? null
      );
    }

    // Register an actor update hook to selectively refresh values inside this popout
    // Use a stored handler reference so we can remove it when closing the popout
    if (this.actor && !this._actorUpdateHandler) {
      this._actorUpdateHandler = (
        updatedActor: any,
        _diff: any,
        _options: any,
        _userId: string
      ) => {
        try {
          if (
            !updatedActor ||
            updatedActor.id !== (this.actor && this.actor.id)
          )
            return;
          // Prefer the actor document from game collection if possible
          const fresh = game.actors.get(updatedActor.id) || updatedActor;
          this._handleActorUpdate(fresh, _diff);
        } catch (err) {
          // swallow - don't break the HUD for update errors
          console.error('SwadePopout actor update handler error', err);
        }
      };
      // The Foundry Hooks API is intentionally used here; the types mark this as deprecated
      // for the project's typings but runtime usage is correct. Suppress the deprecation linter.
      Hooks.on('updateActor', this._actorUpdateHandler);
    }

    return this;
  }

  /**
   * Enrich the item description for display in the HUD panel.
   * @param {HTMLElement} itemElement - The item element in the DOM.
   * @param {any} itemData - The item data object.
   */
  private async enrichItemDescription(itemElement: HTMLElement, itemData: any) {
    const descDiv = itemElement.querySelector('.swadehud-item-description');
    if (!descDiv) return;

    try {
      let enrichedDescription = '';
      if (itemData.system?.description) {
        enrichedDescription = await getEnrichedDescription(itemData);
      }

      if (enrichedDescription) {
        descDiv.innerHTML = enrichedDescription;
      } else {
        descDiv.innerHTML = '<em>No description available</em>';
      }
    } catch (error) {
      console.error('SWADE HUD: Error enriching item description:', error);
      descDiv.innerHTML = '<em>Error loading description</em>';
    }
  }

  /**
   * Update the equipment status indicator display for an item.
   * @param {HTMLElement} indicator - The indicator element.
   * @param {number} newStatus - The new equipment status value.
   * @param {string} itemType - The type of item (e.g., 'weapon', 'armor').
   */
  private updateEquipStatusDisplay(
    indicator: HTMLElement,
    newStatus: number,
    itemType: string
  ) {
    // Update the indicator text and tooltip based on new status
    let statusText = '';
    let tooltipText = '';

    if (itemType === 'weapon') {
      switch (newStatus) {
        case 0:
          statusText = 'Stored';
          tooltipText = 'Stored (Left: Carry, Right: Off Hand)';
          break;
        case 1:
          statusText = 'Carried';
          tooltipText = 'Carried (Left: Main Hand, Right: Store)';
          break;
        case 2:
          statusText = 'Off Hand';
          tooltipText = 'Off Hand (Left: Store, Right: Two Hands)';
          break;
        case 4:
          statusText = 'Main Hand';
          tooltipText = 'Main Hand (Left: Two Hands, Right: Carry)';
          break;
        case 5:
          statusText = 'Two Hands';
          tooltipText = 'Two Hands (Left: Off Hand, Right: Main Hand)';
          break;
        default:
          statusText = 'Stored';
          tooltipText = 'Stored (Left: Carry, Right: Off Hand)';
      }
    } else {
      switch (newStatus) {
        case 0:
          statusText = 'Stored';
          tooltipText = 'Stored (Left: Carry, Right: Equip)';
          break;
        case 1:
          statusText = 'Carried';
          tooltipText = 'Carried (Left: Equip, Right: Store)';
          break;
        case 3:
          statusText = 'Equipped';
          tooltipText = 'Equipped (Left: Store, Right: Carry)';
          break;
        default:
          statusText = 'Stored';
          tooltipText = 'Stored (Left: Carry, Right: Equip)';
      }
    }

    // Update the indicator element
    indicator.textContent = statusText;
    indicator.setAttribute('title', tooltipText);
    indicator.setAttribute('data-equip-status', newStatus.toString());
  }

  // Removed duplicate/invalid static members and override modifiers

  private prepareWeaponsPanelData(context: any) {
    return {
      weapons: context.weapons || [],
      armor: context.armor || [],
      hasWeapons: (context.weapons || []).length > 0,
      hasArmor: (context.armor || []).length > 0,
    };
  }

  private prepareTraitsPanelData(context: any) {
    // For attributes, use the original structure that the template expects
    const attributes = context.attributes || {};

    // For skills, use the array of skill items provided by prepareHudContext
    const skills = context.skills || [];

    return {
      attributes: attributes, // Use original attributes structure
      skills: skills, // Use array of skill items
      hasAttributes: Object.keys(attributes).length > 0,
      hasSkills: skills.length > 0,
    };
  }

  private prepareEdgesPanelData(context: any) {
    return {
      edges: context.edges || [],
      hindrances: context.hindrances || [],
      hasEdges: (context.edges || []).length > 0,
      hasHindrances: (context.hindrances || []).length > 0,
    };
  }

  private prepareActionsPanelData(context: any) {
    return {
      actions: context.actions || [],
      hasActions: (context.actions || []).length > 0,
    };
  }

  private prepareGearPanelData(context: any) {
    return {
      gear: context.gear || [],
      hasGear: (context.gear || []).length > 0,
      encumbrance: context.encumbrance,
    };
  }

  private async prepareConditionsPanelData(_context: any) {
    // Get available status effects - include SWADE conditions and core Foundry status effects
    const allowedConditions = [
      'bound',
      'distracted',
      'entangled',
      'prone',
      'shaken',
      'stunned',
      'vulnerable',
      'wild-attack',
      'dead',
      'invisible', // Core Foundry status effects
    ];

    const statusEffects =
      CONFIG.statusEffects
        ?.filter((effect) =>
          allowedConditions.includes(effect.id.toLowerCase())
        )
        .map(async (effect) => {
          // Check if this specific condition is active
          const isActive =
            this.actor?.effects?.some((e) => e.statuses?.has(effect.id)) ??
            false;

          // Enrich the description
          let enrichedDescription = effect.description || '';
          try {
            if (
              foundry?.applications?.ux?.TextEditor?.implementation &&
              typeof foundry.applications.ux.TextEditor.implementation
                .enrichHTML === 'function'
            ) {
              enrichedDescription =
                await foundry.applications.ux.TextEditor.implementation.enrichHTML(
                  enrichedDescription,
                  {}
                );
            } else if (
              window.TextEditor &&
              typeof window.TextEditor.enrichHTML === 'function'
            ) {
              // Fallback for older versions
              enrichedDescription = await window.TextEditor.enrichHTML(
                enrichedDescription,
                {}
              );
            }
          } catch (error) {
            console.warn(
              'SWADE HUD: Error enriching status effect description:',
              error
            );
          }

          return {
            ...effect,
            isActive,
            description: enrichedDescription,
          };
        }) ?? [];

    // Wait for all status effects to be processed
    const resolvedStatusEffects = await Promise.all(statusEffects);

    // Sort status effects alphabetically
    resolvedStatusEffects.sort((a, b) => {
      const nameA = game.i18n.localize(a.name || a.id);
      const nameB = game.i18n.localize(b.name || b.id);
      return nameA.localeCompare(nameB);
    });

    return {
      statusEffects: resolvedStatusEffects,
      hasConditions: resolvedStatusEffects.length > 0,
    };
  }

  private async prepareEffectsPanelData(_context: any) {
    // Use the system's built-in method to get all applicable effects
    const sheetEffects = await getAllApplicableEffects(this.actor);

    // Organize effects into temporary and permanent categories
    type EffectData = {
      id: any;
      name: any;
      img: any;
      disabled: any;
      description: any;
      favorite: any;
      isTemporary: any;
      isEmbedded: boolean;
      duration?: {
        expiration: any;
        rounds: any;
        startRound: any;
        startTurn: any;
        remaining: any;
        label: any;
      };
      origin?: any;
      source?: { name: string; id: string };
    };
    const temporaryEffects: EffectData[] = [];
    const permanentEffects: EffectData[] = [];

    for (const effect of sheetEffects) {
      // Enrich the effect description
      let enrichedDescription = effect.description || '';
      try {
        if (
          foundry?.applications?.ux?.TextEditor?.implementation &&
          typeof foundry.applications.ux.TextEditor.implementation
            .enrichHTML === 'function'
        ) {
          enrichedDescription =
            await foundry.applications.ux.TextEditor.implementation.enrichHTML(
              enrichedDescription,
              {}
            );
        } else if (
          window.TextEditor &&
          typeof window.TextEditor.enrichHTML === 'function'
        ) {
          // Fallback for older versions
          enrichedDescription = await window.TextEditor.enrichHTML(
            enrichedDescription,
            {}
          );
        }
      } catch (error) {
        console.warn('SWADE HUD: Error enriching effect description:', error);
      }

      const isEmbedded = effect.parent === this.actor;
      const effectData: EffectData = {
        id: effect.id,
        name: effect.name,
        img: effect.img,
        disabled: effect.disabled,
        description: enrichedDescription,
        favorite: effect.system?.favorite ?? false,
        isTemporary: effect.isTemporary,
        isEmbedded,
        duration: effect.isTemporary
          ? {
              expiration: effect.expirationText,
              rounds: effect.duration?.rounds,
              startRound: effect.duration?.startRound,
              startTurn: effect.duration?.startTurn,
              remaining: effect.duration?.remaining,
              label: effect.duration?.label,
            }
          : undefined,
      };

      if (!isEmbedded && effect.parent) {
        effectData.origin = effect.sourceName;
        effectData.source = {
          name: effect.parent.name,
          id: effect.parent.id,
        };
      }

      if (effect.isTemporary) {
        temporaryEffects.push(effectData);
      } else {
        permanentEffects.push(effectData);
      }
    }

    return {
      sheetEffects: {
        temporary: temporaryEffects,
        permanent: permanentEffects,
      },
      hasEffects: temporaryEffects.length > 0 || permanentEffects.length > 0,
    };
  }

  private preparePowersPanelData(_context: any) {
    // Use the same logic as CharacterSheet.ts to source powers
    const powers: any[] = getItemsByType(this.actor, 'power');

    // Use CharacterSheet.ts logic for powers and powerPoints
    const arcaneBackgrounds: Record<
      string,
      {
        valuePath: string;
        value: any;
        maxPath: string;
        max: any;
        powers: any[];
      }
    > = {};
    for (const power of powers) {
      const ab = power.system.arcane || 'general';
      if (!arcaneBackgrounds[ab]) {
        arcaneBackgrounds[ab] = {
          valuePath: `system.powerPoints.${ab}.value`,
          value: foundry.utils.getProperty(
            this.actor,
            `system.powerPoints.${ab}.value`
          ),
          maxPath: `system.powerPoints.${ab}.max`,
          max: foundry.utils.getProperty(
            this.actor,
            `system.powerPoints.${ab}.max`
          ),
          powers: [],
        };
      }
      arcaneBackgrounds[ab].powers.push(power);
    }
    // Sort powers by sort value within each arcane background
    for (const entry of Object.values(arcaneBackgrounds)) {
      entry.powers.sort((a, b) => a.sort - b.sort);
    }
    // For template compatibility, convert arcaneBackgrounds to groupedPowers and powerPoints
    const groupedPowers: Record<string, any[]> = {};
    const powerPoints: Record<string, { value: number; max: number }> = {};

    // Ensure context.system.powerPoints exists and copy entries so templates that
    // use display keys (e.g., 'General') via lookup() still work, while keeping
    // lowercase keys for data-stat-paths used elsewhere.
    if (!this.context.system) this.context.system = {};
    if (!this.context.system.powerPoints) this.context.system.powerPoints = {};

    Object.entries(arcaneBackgrounds).forEach(([ab, data]) => {
      // Display key: capitalize first letter unless 'general'
      const displayKey =
        ab === 'general' ? 'General' : ab.charAt(0).toUpperCase() + ab.slice(1);
      groupedPowers[displayKey] = data.powers;
      powerPoints[displayKey] = { value: data.value, max: data.max };
      // Set the lowercase key in context.system.powerPoints so data-stat-paths like
      // 'system.powerPoints.general.value' will resolve correctly during runtime updates.
      this.context.system.powerPoints[ab] = {
        value: data.value ?? 0,
        max: data.max ?? 0,
      };
    });

    // Always provide General if needed
    if (!powerPoints['General']) {
      powerPoints['General'] = { value: 0, max: 0 };
    }

    // Ensure context.system.powerPoints has a General fallback as well
    if (!this.context.system.powerPoints['general']) {
      this.context.system.powerPoints['general'] = { value: 0, max: 0 };
    }
    if (!this.context.system.powerPoints['General']) {
      this.context.system.powerPoints['General'] = {
        value: powerPoints['General'].value,
        max: powerPoints['General'].max,
      };
    }

    return {
      groupedPowers,
      powerPoints,
      hasPowers: powers.length > 0,
    };
  }

  private async prepareBioPanelData(context: any) {
    const biography = context.system?.details?.biography || {};
    const notes = context.system?.details?.notes || '';

    // Use actor.enrichedBiography if available, else enrich
    let enrichedBiography = '';
    if (this.actor?.enrichedBiography) {
      enrichedBiography = this.actor.enrichedBiography;
    } else if (biography.value) {
      try {
        enrichedBiography = await getEnrichedDescription({
          system: { description: biography.value },
        });
      } catch (error) {
        console.warn('SWADE HUD: Error enriching biography:', error);
        enrichedBiography = biography.value;
      }
    }

    // Enrich notes if available
    let enrichedNotes = '';
    if (notes) {
      try {
        enrichedNotes = await getEnrichedDescription({
          system: { description: notes },
        });
      } catch (error) {
        console.warn('SWADE HUD: Error enriching notes:', error);
        enrichedNotes = notes;
      }
    }

    // Ensure compatibility with template expectations
    if (!context.system) context.system = {};
    if (!context.system.details) context.system.details = {};
    if (!context.system.details.biography)
      context.system.details.biography = {};
    context.system.details.biography.enrichedValue = enrichedBiography;
    context.system.details.enrichedNotes = enrichedNotes;
    return {
      biography: {
        enrichedValue: enrichedBiography,
      },
      enrichedNotes: enrichedNotes,
      hasBiography: !!(enrichedBiography || enrichedNotes),
    };
  }

  /**
   * Activate event listeners for the HUD panel, including close button and item interactions.
   */
  activateListeners() {
    if (!this.element) return;

    // Clean up any previously-attached anonymous event listeners on elements
    // inside this popout by replacing interactive nodes with clones. This
    // prevents duplicate handlers when activateListeners is called multiple
    // times for the same popout instance.
    this.cleanupEventListeners();

    // Add close button handler
    const closeBtn = this.element.querySelector('.swadehud-popout-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // Setup action button listeners for all panels
    setupHudActionButtonListeners(
      this.element,
      this.actor,
      this.options.hudInstance
    );

    // All stat click logic is handled centrally by setupHudStatHandlers
    // (bennies, conviction, pace, power points, soak, incapacitated, etc)
    // Do not add stat click handlers here; use only the shared handler.

    // Add item interaction handlers based on panel type
    this.setupPanelSpecificListeners(this.element);
  }

  /**
   * Remove previously-attached event listeners on interactive elements by
   * cloning and replacing nodes that commonly gain anonymous listeners.
   * This is a pragmatic approach which ensures anonymous handlers are
   * removed without needing to track every listener reference.
   */
  private cleanupEventListeners() {
    if (!this.element) return;

    // Selector of interactive elements that commonly receive listeners.
    const selectors = [
      '.swadehud-popout-close',
      '.swadehud-equip-indicator',
      '.swadehud-effect-toggle-icon',
      '.swadehud-condition-toggle-icon',
      '[data-toggle]',
      '.swadehud-item-name',
      '[data-action]',
      '.swadehud-chat',
      '.swadehud-stat-clickable',
      '.swadehud-bottomstat--label',
      '.swadehud-roll-icon',
    ];

    const nodes = this.element.querySelectorAll(selectors.join(','));
    nodes.forEach((node) => {
      try {
        const el = node as HTMLElement;
        const clone = el.cloneNode(true) as HTMLElement;
        // Remove any internal bookkeeping properties that might have been set
        // on the element instance before replacing it.
        // Note: dataset flags will be lost on clone which is desired here.
        el.parentNode?.replaceChild(clone, el);
      } catch (err) {
        // Non-fatal - continue cleaning other nodes
        console.warn(
          'SWADE HUD: cleanupEventListeners failed for node',
          node,
          err
        );
      }
    });
  }

  /**
   * Set up panel-specific event listeners based on the panel type.
   * @param {HTMLElement} html - The HUD panel HTML element.
   */
  private setupPanelSpecificListeners(html: HTMLElement) {
    switch (this.panelType) {
      case 'weapons': {
        this.setupWeaponsPanelListeners(html);
        break;
      }
      case 'traits':
        this.setupTraitsPanelListeners(html);
        // Add listeners for trait-specific HUD panel interactions if needed
        break;
      case 'edges':
        this.setupEdgesPanelListeners(html);
        break;
      case 'actions':
        this.setupActionsPanelListeners(html);
        break;
      case 'gear':
        this.setupGearPanelListeners(html);
        break;
      case 'conditions':
        this.setupConditionsPanelListeners(html);
        break;
      case 'effects':
        this.setupEffectsPanelListeners(html);
        break;
      case 'powers':
        this.setupPowersPanelListeners(html);
        break;
      case 'bio':
        this.setupBioPanelListeners(html);
        break;
      default:
        break;
    }

    // Equipment status toggles
    const equipIndicators = html.querySelectorAll('.swadehud-equip-indicator');
    equipIndicators.forEach((indicator) => {
      // Set initial display state
      const itemId = (indicator as HTMLElement).dataset.itemId;
      if (itemId && this.actor) {
        const item = this.actor.items.get(itemId);
        if (item) {
          this.updateEquipStatusDisplay(
            indicator as HTMLElement,
            item.system.equipStatus || 0,
            item.type
          );
        }
      }

      // Left click handler
      indicator.addEventListener('click', (event) => {
        event.preventDefault();
        const itemId = (indicator as HTMLElement).dataset.itemId;
        if (itemId) {
          this.handleEquipToggle(itemId, event);
        }
      });

      // Right click handler
      indicator.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const itemId = (indicator as HTMLElement).dataset.itemId;
        if (itemId) {
          this.handleEquipToggle(itemId, event);
        }
      });
    });
  }

  // Add a no-op setupWeaponsPanelListeners to prevent errors (weapon actions handled elsewhere)
  private setupWeaponsPanelListeners(_html: HTMLElement) {}

  private setupEdgesPanelListeners(_html: HTMLElement) {}

  private setupActionsPanelListeners(_html: HTMLElement) {}

  private setupGearPanelListeners(html: HTMLElement) {
    // Handle equip status clicks
    const equipIndicators = html.querySelectorAll('.swadehud-equip-indicator');
    equipIndicators.forEach((indicator) => {
      indicator.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const itemElement = (indicator as HTMLElement).closest(
          '.swadehud-item'
        );
        if (!itemElement || !this.actor) return;

        const itemId = itemElement.getAttribute('data-item-id');
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (!item) return;

        const currentStatus = item.system.equipStatus || 0;
        let newStatus;

        if ((event as MouseEvent).button === 0) {
          // Left click - cycle forward
          if (item.type === 'weapon') {
            switch (currentStatus) {
              case 0:
                newStatus = 1;
                break; // STORED -> CARRIED
              case 1:
                newStatus = 4;
                break; // CARRIED -> MAIN_HAND
              case 4:
                newStatus = 5;
                break; // MAIN_HAND -> TWO_HANDS
              case 5:
                newStatus = 2;
                break; // TWO_HANDS -> OFF_HAND
              case 2:
                newStatus = 0;
                break; // OFF_HAND -> STORED
              default:
                newStatus = 0;
            }
          } else {
            switch (currentStatus) {
              case 0:
                newStatus = 1;
                break; // STORED -> CARRIED
              case 1:
                newStatus = 3;
                break; // CARRIED -> EQUIPPED
              case 3:
                newStatus = 0;
                break; // EQUIPPED -> STORED
              default:
                newStatus = 0;
            }
          }
        } else if ((event as MouseEvent).button === 2) {
          // Right click - cycle backward
          if (item.type === 'weapon') {
            switch (currentStatus) {
              case 0:
                newStatus = 2;
                break; // STORED -> OFF_HAND
              case 1:
                newStatus = 0;
                break; // CARRIED -> STORED
              case 4:
                newStatus = 1;
                break; // MAIN_HAND -> CARRIED
              case 5:
                newStatus = 4;
                break; // TWO_HANDS -> MAIN_HAND
              case 2:
                newStatus = 5;
                break; // OFF_HAND -> TWO_HANDS
              default:
                newStatus = 0;
            }
          } else {
            switch (currentStatus) {
              case 0:
                newStatus = 3;
                break; // STORED -> EQUIPPED
              case 1:
                newStatus = 0;
                break; // CARRIED -> STORED
              case 3:
                newStatus = 1;
                break; // EQUIPPED -> CARRIED
              default:
                newStatus = 0;
            }
          }
        }

        if (newStatus !== undefined && newStatus !== currentStatus) {
          try {
            await item.update({ 'system.equipStatus': newStatus });
            // Update the display
            this.updateEquipStatusDisplay(
              indicator as HTMLElement,
              newStatus,
              item.type
            );
          } catch (error) {
            console.error('SWADE HUD: Error updating equip status:', error);
          }
        }
      });

      // Prevent context menu on right click
      indicator.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        return false;
      });
    });

    // Chat button handling is centralized in `setupHudActionButtonListeners`.
    // The popout should not attach its own chat handlers to avoid duplicate
    // message creation when the centralized action listeners are applied.
  }

  private setupConditionsPanelListeners(html: HTMLElement) {
    // Handle condition toggles
    const conditionToggles = html.querySelectorAll(
      '.swadehud-condition-toggle-icon'
    );
    conditionToggles.forEach((toggle) => {
      const statusId = (toggle as HTMLElement).dataset.statusId;
      if (statusId && this.actor) {
        // Set initial active state
        const isActive =
          this.actor.effects?.some((e) => e.statuses?.has(statusId)) ?? false;
        if (isActive) {
          toggle.classList.add('active');
        } else {
          toggle.classList.remove('active');
        }
      }

      toggle.addEventListener('click', async (event) => {
        event.preventDefault();
        const statusId = (toggle as HTMLElement).dataset.statusId;
        if (statusId && this.actor) {
          try {
            const isActive =
              this.actor.effects?.some((e) => e.statuses?.has(statusId)) ??
              false;
            if (isActive) {
              // Remove the condition
              const effect = this.actor.effects.find((e) =>
                e.statuses?.has(statusId)
              );
              if (effect) {
                await effect.delete();
                // Update visual state only
                toggle.classList.remove('active');
              } else {
                console.warn('No effect found for status:', statusId);
              }
            } else {
              // Add the condition
              await this.actor.toggleStatusEffect(statusId);
              // Update visual state only
              toggle.classList.add('active');
            }
            // Do NOT re-render the entire popout panel here
          } catch (error) {
            console.error('SWADE HUD: Error toggling condition:', error);
          }
        }
      });
    });

    // Handle clear all conditions button
    const clearButton = html.querySelector('.swadehud-clear-conditions');
    if (clearButton) {
      clearButton.addEventListener('click', async (event) => {
        event.preventDefault();
        if (this.actor) {
          try {
            // Remove all status effects
            const effectsToDelete = this.actor.effects.filter(
              (e) => e.statuses?.size > 0
            );
            for (const effect of effectsToDelete) {
              if (effect) {
                await effect.delete();
              }
            }
            // Re-render the popout to update toggles
            if (typeof this.render === 'function') {
              await this.render(false, { animate: false });
            }
          } catch (error) {
            console.error('SWADE HUD: Error clearing conditions:', error);
          }
        }
      });
    }
  }

  private setupEffectsPanelListeners(html: HTMLElement) {
    // Debounced HUD re-render using shared debounce utility
    const debouncedRender = debounce((hudInstance: any) => {
      if (hudInstance && typeof hudInstance.render === 'function') {
        hudInstance.render();
      }
    }, 100);
    if (!html) {
      console.error(
        'SWADE HUD: setupEffectsPanelListeners called with undefined html'
      );
      return;
    }

    // Handle effect toggles
    const effectToggles = html.querySelectorAll('.swadehud-effect-toggle-icon');

    effectToggles.forEach((toggle) => {
      const effectId = (toggle as HTMLElement).dataset.effectId;
      if (!(effectId && this.actor)) return;

      // Try to find the effect in actor.effects
      let effect = this.actor.effects.get(effectId);
      if (!effect) {
        for (const item of this.actor.items) {
          effect = item.effects?.get?.(effectId);
          if (effect) break;
        }
      }
      // Fallback: try to find by name (strip duration text)
      if (!effect) {
        const effectName = (
          toggle.closest('.swadehud-item')?.querySelector('.swadehud-item-name')
            ?.textContent || ''
        )
          .replace(/\s*Rounds:\s*\d+$/, '')
          .trim();
        if (effectName) {
          effect = Array.from(this.actor.effects).find(
            (e: any) => e.name === effectName
          );
          if (!effect) {
            for (const item of this.actor.items) {
              effect = Array.from(item.effects || []).find(
                (e: any) => e.name === effectName
              );
              if (effect) break;
            }
          }
        }
      }

      // Set initial active state if found
      if (effect) {
        const isActive = !effect.disabled;
        toggle.classList.toggle('active', isActive);
        const effectName = effect.name || effect.label;
        toggle.setAttribute(
          'title',
          effect.disabled ? `Enable ${effectName}` : `Disable ${effectName}`
        );
      }

      // Always attach the event listener
      toggle.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        // Re-find effect on click in case of updates
        let effect = this.actor.effects.get(effectId);
        if (!effect) {
          for (const item of this.actor.items) {
            effect = item.effects?.get?.(effectId);
            if (effect) break;
          }
        }
        if (!effect) {
          const effectName = (
            toggle
              .closest('.swadehud-item')
              ?.querySelector('.swadehud-item-name')?.textContent || ''
          )
            .replace(/\s*Rounds:\s*\d+$/, '')
            .trim();
          if (effectName) {
            effect = Array.from(this.actor.effects).find(
              (e: any) => e.name === effectName
            );
            if (!effect) {
              for (const item of this.actor.items) {
                effect = Array.from(item.effects || []).find(
                  (e: any) => e.name === effectName
                );
                if (effect) break;
              }
            }
          }
        }
        if (!effect) {
          console.error('No effect found with ID:', effectId);
          return;
        }
        try {
          const currentlyDisabled = effect.disabled;
          const newDisabledState = !currentlyDisabled;
          await effect.update({ disabled: newDisabledState });

          // Re-read actor data to get updated effects
          const updatedActor = game.actors.get(this.actor.id);
          if (updatedActor) {
            this.actor = updatedActor;
          }

          // Update all effect toggles visually, including related statuses
          setTimeout(() => {
            const currentToggleIcons = html.querySelectorAll(
              '.swadehud-effect-toggle-icon'
            );
            currentToggleIcons.forEach((icon) => {
              const itemEl = icon.closest(
                '.swadehud-item'
              ) as HTMLElement | null;
              if (!itemEl || !itemEl.dataset.effectId) return;
              const iconEffectId = itemEl.dataset.effectId;
              // Find the current effect state
              let currentEffect = this.actor.effects?.find(
                (e: any) => e._id === iconEffectId
              );
              if (!currentEffect) {
                for (const item of this.actor.items) {
                  currentEffect = item.effects?.find(
                    (e: any) => e._id === iconEffectId
                  );
                  if (currentEffect) break;
                }
              }
              if (currentEffect) {
                (icon as HTMLElement).classList.toggle(
                  'active',
                  !currentEffect.disabled
                );
                const effectName = currentEffect.name || currentEffect.label;
                (icon as HTMLElement).title = currentEffect.disabled
                  ? `Enable ${effectName}`
                  : `Disable ${effectName}`;
              }
            });
            // Debounced HUD re-render to update all panels and statuses
            debouncedRender(this.options.hudInstance);
          }, 50);
        } catch (error) {
          console.error('SWADE HUD: Error toggling effect:', error);
        }
      });
    });
  }

  private setupBioPanelListeners(_html: HTMLElement) {}

  private setupPowersPanelListeners(_html: HTMLElement) {}

  private setupTraitsPanelListeners(_html: HTMLElement) {}

  // Action handlers
  private async handleWeaponAction(itemId: string, action: string) {
    const item = this.actor.items.get(itemId);
    if (!item) return;

    try {
      switch (action) {
        case 'formula':
          await item.rollFormula();
          break;
        case 'damage':
          await item.rollDamage();
          break;
        default:
          // Handle additional actions
          await item.roll(action);
          break;
      }
    } catch (error) {
      console.error('SWADE HUD: Error handling weapon action:', error);
      ui.notifications?.error('Failed to execute weapon action');
    }
  }

  private async handleEquipToggle(itemId: string, event: Event) {
    const item = this.actor.items.get(itemId);
    if (!item) return;

    try {
      const currentStatus = item.system.equipStatus || 0;
      let newStatus = currentStatus;

      if (event.type === 'click') {
        // Left click: cycle forward
        newStatus = (currentStatus + 1) % 6;
      } else if (event.type === 'contextmenu') {
        // Right click: cycle backward
        newStatus = currentStatus === 0 ? 5 : currentStatus - 1;
      }

      await item.update({ 'system.equipStatus': newStatus });

      // Update the visual indicator
      const target = event.target as HTMLElement;
      const indicator = target.closest(
        '.swadehud-equip-indicator'
      ) as HTMLElement;
      if (indicator) {
        this.updateEquipStatusDisplay(indicator, newStatus, item.type);
      }
    } catch (error) {
      console.error('SWADE HUD: Error toggling equipment status:', error);
      ui.notifications?.error('Failed to toggle equipment status');
    }
  }

  private async handleTraitRoll(traitKey: string, isSkill: boolean) {
    try {
      if (isSkill) {
        const skill = this.actor.getSkill(traitKey);
        if (skill) {
          await this.actor.rollSkill(traitKey);
        }
      } else {
        await this.actor.rollAttribute(traitKey);
      }
    } catch (error) {
      console.error('SWADE HUD: Error rolling trait:', error);
      ui.notifications?.error('Failed to roll trait');
    }
  }

  private async handleEdgeActivation(edgeId: string) {
    const edge = this.actor.getOwnedItem(edgeId);
    if (!edge) return;

    try {
      // Edges typically don't have direct activation, but we can show their description
      const description = await edge.getEnrichedDescription();
      const dialog = new Dialog({
        title: edge.name,
        content: `<div style="max-height: 400px; overflow-y: auto; padding: 10px;">${description}</div>`,
        buttons: {
          close: { label: 'Close' },
        },
      });
      dialog.render(true);
    } catch (error) {
      console.error('SWADE HUD: Error activating edge:', error);
      ui.notifications?.error('Failed to activate edge');
    }
  }

  private async handleActionExecution(actionId: string) {
    const action = this.actor.getOwnedItem(actionId);
    if (!action) return;

    try {
      await action.use();
    } catch (error) {
      console.error('SWADE HUD: Error executing action:', error);
      ui.notifications?.error('Failed to execute action');
    }
  }

  private async handleGearAction(gearId: string, action: string) {
    const gear = this.actor.getOwnedItem(gearId);
    if (!gear) return;

    try {
      switch (action) {
        case 'use':
          await gear.use();
          break;
        case 'equip': {
          const currentStatus = gear.system.equipStatus || 0;
          const newStatus = currentStatus === 0 ? 1 : 0;
          await gear.update({ 'system.equipStatus': newStatus });
          break;
        }
        default:
          break;
      }
    } catch (error) {
      console.error('SWADE HUD: Error handling gear action:', error);
      ui.notifications?.error('Failed to handle gear action');
    }
  }

  private async handlePowerActivation(powerId: string) {
    const power = this.actor.getOwnedItem(powerId);
    if (!power) return;

    try {
      await power.use();
    } catch (error) {
      console.error('SWADE HUD: Error activating power:', error);
      ui.notifications?.error('Failed to activate power');
    }
  }

  /**
   * Close the HUD popout panel with animation and remove it from the DOM.
   * @returns {Promise<this>} The SwadePopout instance.
   */
  async close() {
    if (!this.element) return this;

    // Add close animation class
    this.element.classList.remove('popout-animate');
    this.element.classList.add('popout-close-animate');

    // Wait for animation to complete before removing
    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      this.element = null;
    }, 300); // Match CSS transition duration
    // Remove actor update hook if registered
    if (this._actorUpdateHandler) {
      try {
        Hooks.off('updateActor', this._actorUpdateHandler);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        // ignore
      }
      this._actorUpdateHandler = null;
    }
    return this;
  }

  /**
   * Handle actor updates by selectively refreshing DOM elements that have a data-stat-path
   * attribute. This mirrors the equip-status update approach by only touching changed
   * elements which improves performance and avoids full re-renders where unnecessary.
   * @param {any} freshActor - The updated actor document.
   * @param {any} diff - The diff object passed from the update hook.
   */
  private _handleActorUpdate(freshActor: any, _diff: any) {
    if (!this.element) return;
    try {
      // For each element that exposes a data-stat-path attribute, compute its new value
      // and update the textContent or value accordingly
      const statEls = Array.from(
        this.element.querySelectorAll('[data-stat-path]')
      ) as HTMLElement[];
      for (const el of statEls) {
        const path = el.getAttribute('data-stat-path');
        if (!path) continue;
        // Use foundry's getProperty-like access via lodash-style path
        const baseSource = freshActor.system ?? freshActor;
        // Try the provided path first. If it fails (e.g., template uses display key 'General'
        // but actor stores 'general'), attempt a lowercase fallback for the powerPoints key.
        let newVal = foundry.utils.getProperty(baseSource, path);
        if (newVal === undefined) {
          // PowerPoints keys sometimes use display case in templates (e.g., 'General').
          // Detect 'system.powerPoints.<Key>...' via string parsing and try lowercase/fallback keys.
          if (
            typeof path === 'string' &&
            path.startsWith('system.powerPoints.')
          ) {
            const after = path.slice('system.powerPoints.'.length);
            const key = after.split('.')[0] ?? '';
            if (key.toLowerCase() === 'general') {
              const rest = path.slice(`system.powerPoints.${key}`.length);
              const altPath = `system.powerPoints.${key.toLowerCase()}${rest}`;
              newVal =
                foundry.utils.getProperty(baseSource, altPath) ??
                foundry.utils.getProperty(freshActor, altPath);
              if (newVal === undefined && freshActor?.system?.powerPoints) {
                const ppObj = freshActor.system.powerPoints;
                const foundKey = Object.keys(ppObj).find(
                  (k) => k.toLowerCase() === key.toLowerCase()
                );
                if (foundKey) {
                  const altPath2 = `system.powerPoints.${foundKey}${rest}`;
                  newVal =
                    foundry.utils.getProperty(baseSource, altPath2) ??
                    foundry.utils.getProperty(freshActor, altPath2);
                }
              }
            }
          }
        }
        // As a last resort, try on the full actor object (non-system root)
        if (newVal === undefined)
          newVal = foundry.utils.getProperty(freshActor, path);

        // If the path ends with '.value', prefer showing 'value/max' when a corresponding '.max' exists
        let display = newVal;
        if (typeof path === 'string' && path.endsWith('.value')) {
          const maxPath = path.slice(0, -'.value'.length) + '.max';
          let maxVal =
            foundry.utils.getProperty(baseSource, maxPath) ??
            foundry.utils.getProperty(freshActor, maxPath);
          // If maxVal is undefined, try lowercase key fallback similar to above
          if (
            (maxVal === undefined || maxVal === null) &&
            typeof path === 'string'
          ) {
            if (
              path.startsWith('system.powerPoints.') &&
              path.endsWith('.value')
            ) {
              const inside = path.slice(
                'system.powerPoints.'.length,
                -'.value'.length
              );
              const key = inside.split('.')[0] ?? '';
              const altMaxPath = `system.powerPoints.${key.toLowerCase()}.max`;
              maxVal =
                foundry.utils.getProperty(baseSource, altMaxPath) ??
                foundry.utils.getProperty(freshActor, altMaxPath);
            }
          }
          if (maxVal !== undefined && maxVal !== null) {
            display = `${newVal ?? 0}/${maxVal}`;
          }
        }
        // Update element depending on element type
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement
        ) {
          (el as HTMLInputElement).value = String(display ?? '');
        } else {
          // If element contains a Font Awesome icon, preserve the <i> node and show numbers in a sibling span
          // Match a broad set of Font Awesome class variants (fa-solid, fa-bolt-lightning, fas, far, fab, etc.)
          // querySelector is marked deprecated in the project's fvtt typings but runtime usage is
          // intentional here; suppress the deprecation rule for this DOM lookup.
          const icon = el.querySelector && el.querySelector('i[class*="fa"]');
          if (icon) {
            // Ensure there is a span for the numeric value
            let valSpan = el.querySelector(
              '.swadehud-stat-value'
            ) as HTMLElement | null;
            if (!valSpan) {
              valSpan = document.createElement('span');
              valSpan.className = 'swadehud-stat-value';
              // Insert after the icon
              icon.parentNode?.insertBefore(valSpan, icon.nextSibling);
            }
            // Remove any raw text nodes inside the element to avoid duplicated numbers
            for (const node of Array.from(el.childNodes)) {
              if (node.nodeType === Node.TEXT_NODE) node.remove();
            }
            // Put a leading space then the numeric display to separate from the icon.
            valSpan.textContent =
              display !== undefined && display !== null
                ? ` ${String(display)}`
                : '';
          } else {
            el.textContent =
              display !== undefined && display !== null ? String(display) : '';
          }
        }
      }
    } catch (err) {
      console.error('SwadePopout _handleActorUpdate error', err);
    }
  }
}
