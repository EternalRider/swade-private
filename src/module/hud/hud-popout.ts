import { prepareHudContext } from './hud-context';
import { getEnrichedDescription } from './hud-context';
import { renderCachedTemplate } from './hud-context';
import { setupHudActionButtonListeners } from './hud-actions';
import { setupHudStatHandlers } from './hud-stat-handlers';

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
  private element: HTMLElement | null = null;
  private actor: any;
  private panelType: string;

  /**
   * Create a new SwadePopout HUD panel.
   * @param {SwadePopoutOptions} options - Options for the HUD panel.
   */
  constructor(options: SwadePopoutOptions) {
    // Set the correct template for the powers panel
    if (options.panelType === 'powers') {
      this._template =
        'systems/swade/templates/actors/hud/hud-powers-panel.hbs';
    } else {
      this._template = options.template;
    }
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
    const context = await prepareHudContext(this.actor, this.options.token);

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
    // Prepare context first
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

    // Create the element if it doesn't exist
    if (!this.element) {
      this.element = document.createElement('div');
    }
    this.element.innerHTML = htmlContent || '';

    // Always apply swadehud-popout class for modal look
    this.element.classList.add('swadehud-popout');

    // Always inject a close button if not present
    if (!this.element.querySelector('.swadehud-popout-close')) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'swadehud-popout-close close-visible';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '<i class="fas fa-times"></i>';
      this.element.insertBefore(closeBtn, this.element.firstChild);
    }

    // Center the popout over the HUD if hudInstance is provided, else center in viewport
    if (this.element) {
      // Ensure only one popout is open at a time
      const existing = document.querySelector('.swadehud-popout');
      if (existing && existing !== this.element) {
        existing.remove();
      }
      this.element.style.position = 'fixed';
      let left = '50%';
      let top = '50%';
      let transform = 'translate(-50%, -50%)';
      if (this.options.hudInstance && this.options.hudInstance.element) {
        const hudRect =
          this.options.hudInstance.element.getBoundingClientRect();
        // Center over HUD
        const centerX = hudRect.left + hudRect.width / 2;
        const centerY = hudRect.top + hudRect.height / 2;
        left = `${centerX}px`;
        top = `${centerY}px`;
        transform = 'translate(-50%, -50%)';
      }
      this.element.style.left = left;
      this.element.style.top = top;
      this.element.style.transform = transform;
      this.element.style.maxHeight = '40vh'; // Even shorter popout
      this.element.style.maxWidth = '90vw';
      this.element.style.overflow = 'auto';
      this.element.style.zIndex = '1000';
      // Modal dark background (uses CSS var for dark theme)
      this.element.style.background = 'var(--swadehud-gradient-popout, #222)';
      // Add to DOM if not already present
      if (!document.body.contains(this.element)) {
        document.body.appendChild(this.element);
      }
    }

    // Add animation class to make it visible, unless options.animate === false
    setTimeout(() => {
      if (this.element && options.animate !== false) {
        this.element.classList.add('popout-animate');
      }
    }, 10); // Small delay to ensure DOM is ready

    // Activate listeners
    this.activateListeners();
    // Attach shared stat handlers
    if (this.element && this.actor) {
      // Re-render the popout after stat update to reflect live changes
      setupHudStatHandlers(
        this.element,
        this.actor,
        () => this.render(false, { animate: false }),
        this.options.token ?? null,
      );
    }

    return this;
  }

  /**
   * Enrich the item description for display in the HUD panel.
   * @param {HTMLElement} itemElement - The item element in the DOM.
   * @param {any} itemData - The item data object.
   */
  private async enrichItemDescription(itemElement: HTMLElement, itemData: any) {
    // ...existing code...
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
      // ...existing code...
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
    itemType: string,
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
          allowedConditions.includes(effect.id.toLowerCase()),
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
                  {},
                );
            } else if (
              window.TextEditor &&
              typeof window.TextEditor.enrichHTML === 'function'
            ) {
              // Fallback for older versions
              enrichedDescription = await window.TextEditor.enrichHTML(
                enrichedDescription,
                {},
              );
            }
          } catch (error) {
            console.warn(
              'SWADE HUD: Error enriching status effect description:',
              error,
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
    const sheetEffects = await this.actor.allApplicableEffects();

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
              {},
            );
        } else if (
          window.TextEditor &&
          typeof window.TextEditor.enrichHTML === 'function'
        ) {
          // Fallback for older versions
          enrichedDescription = await window.TextEditor.enrichHTML(
            enrichedDescription,
            {},
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
    const powers: any[] =
      this.actor.itemTypes && this.actor.itemTypes.power
        ? this.actor.itemTypes.power
        : [];
    console.log('[SWADE HUD] preparePowersPanelData: actor', this.actor);
    console.log('[SWADE HUD] preparePowersPanelData: powers', powers);

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
            `system.powerPoints.${ab}.value`,
          ),
          maxPath: `system.powerPoints.${ab}.max`,
          max: foundry.utils.getProperty(
            this.actor,
            `system.powerPoints.${ab}.max`,
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
    const groupedPowers: { [key: string]: any[] } = {};
    const powerPoints: Record<string, { value: number; max: number }> = {};
    Object.entries(arcaneBackgrounds).forEach(([ab, data]) => {
      // Display key: capitalize first letter unless 'general'
      const displayKey =
        ab === 'general' ? 'General' : ab.charAt(0).toUpperCase() + ab.slice(1);
      groupedPowers[displayKey] = data.powers;
      powerPoints[displayKey] = { value: data.value, max: data.max };
    });
    // Always provide General if needed
    if (!powerPoints['General']) {
      powerPoints['General'] = { value: 0, max: 0 };
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
      this.options.hudInstance,
    );

    // All stat click logic is handled centrally by setupHudStatHandlers
    // (bennies, conviction, pace, power points, soak, incapacitated, etc)
    // Do not add stat click handlers here; use only the shared handler.

    // Add item interaction handlers based on panel type
    this.setupPanelSpecificListeners(this.element);
  }

  /**
   * Set up panel-specific event listeners based on the panel type.
   * @param {HTMLElement} html - The HUD panel HTML element.
   */
  private setupPanelSpecificListeners(html: HTMLElement) {
    // ...existing code...
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
    //       const isExpanded = item.classList.contains('expanded');

    //       if (isExpanded && !wasExpanded) {
    //         // Lazy enrich description if needed
    //         const itemId = item.getAttribute('data-item-id');
    //         if (itemId && this.actor) {
    //           const itemData = this.actor.getOwnedItem(itemId);
    //           if (itemData) {
    //             // Enrich description
    //             this.enrichItemDescription(item as HTMLElement, itemData);
    //           }
    //         }
    //       }
    //     }
    //   });
    // });

    // Weapon action buttons - handled by setupHudActionButtonListeners
    // const actionButtons = html.querySelectorAll('.swadehud-action-trait, .swadehud-damage, .swadehud-action-resist, .swadehud-action-damage, .swadehud-action-macro');
    // actionButtons.forEach(button => {
    //   button.addEventListener('click', (event) => {
    //     event.preventDefault();
    //     const itemId = (button as HTMLElement).dataset.itemId;
    //     const action = (button as HTMLElement).dataset.action;

    //     if (itemId && action) {
    //       this.handleWeaponAction(itemId, action);
    //     }
    //   });
    // });

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
            item.type,
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
  private setupWeaponsPanelListeners(_html: HTMLElement) {
    // ...existing code...
  }

  private setupEdgesPanelListeners(_html: HTMLElement) {
    // ...existing code...
  }

  private setupActionsPanelListeners(_html: HTMLElement) {
    // ...existing code...
  }

  private setupGearPanelListeners(html: HTMLElement) {
    // ...existing code...

    // Handle equip status clicks
    const equipIndicators = html.querySelectorAll('.swadehud-equip-indicator');
    equipIndicators.forEach((indicator) => {
      indicator.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const itemElement = (indicator as HTMLElement).closest(
          '.swadehud-item',
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
              item.type,
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

    // Handle chat buttons
    const chatButtons = html.querySelectorAll('.swadehud-chat');
    chatButtons.forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();

        const itemElement = (button as HTMLElement).closest('.swadehud-item');
        if (!itemElement || !this.actor) return;

        const itemId = itemElement.getAttribute('data-item-id');
        if (!itemId) return;

        const item = this.actor.items.get(itemId);
        if (!item) return;

        try {
          if (typeof item.show === 'function') {
            await item.show();
          } else {
            const chatData = await item.getChatData();
            const content = await renderTemplate(
              'systems/swade/templates/chat/item-card.hbs',
              {
                item: item,
                data: chatData,
                actor: this.actor,
              },
            );

            await ChatMessage.create({
              speaker: ChatMessage.getSpeaker({ actor: this.actor }),
              content: content,
              type: (foundry as any).CONST?.CHAT_MESSAGE_TYPES?.OTHER || 1,
            });
          }
        } catch (error) {
          console.error('SWADE HUD: Error showing item in chat:', error);
        }
      });
    });
  }

  private setupConditionsPanelListeners(html: HTMLElement) {
    // ...existing code...

    // Handle condition toggles
    const conditionToggles = html.querySelectorAll(
      '.swadehud-condition-toggle-icon',
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
                e.statuses?.has(statusId),
              );
              if (effect) {
                await effect.delete();
                // Update visual state
                toggle.classList.remove('active');
              }
            } else {
              // Add the condition
              await this.actor.toggleStatusEffect(statusId);
              // Update visual state
              toggle.classList.add('active');
            }
            // Re-render the popout to reflect status changes, skip animation
            if (typeof this.render === 'function') {
              await this.render(false, { animate: false });
            }
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
              (e) => e.statuses?.size > 0,
            );
            for (const effect of effectsToDelete) {
              await effect.delete();
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
    if (!html) {
      console.error(
        'SWADE HUD: setupEffectsPanelListeners called with undefined html',
      );
      return;
    }

    // ...existing code...

    // Handle effect toggles
    const effectToggles = html.querySelectorAll('.swadehud-effect-toggle-icon');

    effectToggles.forEach((toggle) => {
      const effectId = (toggle as HTMLElement).dataset.effectId;
      if (!(effectId && this.actor)) return;

      // Try to find the effect in actor.effects
      let effect = this.actor.effects.get(effectId);
      // If not found, search all items' effects
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
            (e: any) => e.name === effectName,
          );
          if (!effect) {
            for (const item of this.actor.items) {
              effect = Array.from(item.effects || []).find(
                (e: any) => e.name === effectName,
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
          effect.disabled ? `Enable ${effectName}` : `Disable ${effectName}`,
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
              (e: any) => e.name === effectName,
            );
            if (!effect) {
              for (const item of this.actor.items) {
                effect = Array.from(item.effects || []).find(
                  (e: any) => e.name === effectName,
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
          // Update visual state
          toggle.classList.toggle('active', !newDisabledState);
          const effectName = effect.name || effect.label;
          toggle.setAttribute(
            'title',
            newDisabledState ? `Enable ${effectName}` : `Disable ${effectName}`,
          );
        } catch (error) {
          console.error('SWADE HUD: Error toggling effect:', error);
        }
      });
    });
  }

  private setupBioPanelListeners(_html: HTMLElement) {
    // ...existing code...
  }

  private setupPowersPanelListeners(_html: HTMLElement) {
    // ...existing code...
  }

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
        '.swadehud-equip-indicator',
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

    return this;
  }
}
