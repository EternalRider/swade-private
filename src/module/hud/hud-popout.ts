import { prepareHudContext } from './hud-context';
import { getEnrichedDescription } from './hud-context';
import { setupHudActionButtonListeners } from './hud-actions';

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

export class SwadePopout {
  private _template: string;
  private context: any;
  private options: any;
  private element: HTMLElement | null = null;
  private actor: any;
  private panelType: string;

  constructor(options: SwadePopoutOptions) {
    this._template = options.template;
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

  async _prepareContext(_options: any) {
    console.log(
      'SWADE HUD: _prepareContext called with template:',
      this._template,
    );

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

  async render(_force = false, options: any = {}) {
    console.log(
      'SWADE HUD: SwadePopout render called for panel:',
      this.panelType,
    );

    // Prepare context first
    await this._prepareContext(options);

    // Render the template with the context
    let htmlContent;
    const renderTemplate = foundry?.applications?.handlebars?.renderTemplate;
    if (typeof renderTemplate === 'function') {
      console.log('SWADE HUD: Rendering template:', this._template);
      htmlContent = await renderTemplate(this._template, this.context);
    }

    // Create the element if it doesn't exist
    if (!this.element) {
      this.element = document.createElement('div');
    }
    this.element.innerHTML = htmlContent || '';

    // Position the element in the center of the viewport
    if (this.element) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const rect = this.element.getBoundingClientRect();
      const centerX = viewportWidth / 2 - rect.width / 2;
      const centerY = viewportHeight / 2 - rect.height / 2;
      this.element.style.position = 'fixed';
      this.element.style.left = `${centerX}px`;
      this.element.style.top = `${centerY}px`;
      this.element.style.transform = 'translate(0, 0)';
      // Set a reasonable max height
      this.element.style.maxHeight = '80vh';
      this.element.style.maxWidth = '90vw';
      this.element.style.overflow = 'auto';
      this.element.style.zIndex = '1000';
      // Add to DOM if not already present
      if (!document.body.contains(this.element)) {
        document.body.appendChild(this.element);
      }
    }

    // Add animation class to make it visible
    setTimeout(() => {
      if (this.element) {
        this.element.classList.add('popout-animate');
      }
    }, 10); // Small delay to ensure DOM is ready

    // Activate listeners
    this.activateListeners();

    console.log('SWADE HUD: Popout rendered and added to DOM');
    return this;
  }

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
      // Setup benny and conviction stat click handlers (bottom row)
      // Bennies
      const bennyStat = this.element.querySelector(
        '.swadehud-bottomstat--benny',
      );
      if (bennyStat && this.actor) {
        // Remove previous listeners if any
        bennyStat.replaceWith(bennyStat.cloneNode(true));
        const newBennyStat = this.element.querySelector(
          '.swadehud-bottomstat--benny',
        );
        if (newBennyStat) {
          newBennyStat.addEventListener('click', async (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            // Left click: spend benny
            if (event.button === 0 && this.actor.spendBenny) {
              try {
                await this.actor.spendBenny();
              } catch (e) {
                /* ignore */
              }
              this.render();
            }
          });
          newBennyStat.addEventListener(
            'contextmenu',
            async (event: MouseEvent) => {
              event.preventDefault();
              event.stopPropagation();
              // Right click: get benny
              if (event.button === 2 && this.actor.getBenny) {
                try {
                  await this.actor.getBenny();
                } catch (e) {
                  /* ignore */
                }
                this.render();
              }
            },
          );
        }
      }

      // Conviction
      const convictionStat = this.element.querySelector(
        '.swadehud-bottomstat--conviction',
      );
      if (convictionStat && this.actor) {
        convictionStat.replaceWith(convictionStat.cloneNode(true));
        const newConvictionStat = this.element.querySelector(
          '.swadehud-bottomstat--conviction',
        );
        if (newConvictionStat) {
          newConvictionStat.addEventListener(
            'click',
            async (event: MouseEvent) => {
              event.preventDefault();
              event.stopPropagation();
              // Left click: spend conviction
              if (event.button === 0 && this.actor.spendConviction) {
                try {
                  await this.actor.spendConviction();
                } catch (e) {
                  /* ignore */
                }
                this.render();
              }
            },
          );
          newConvictionStat.addEventListener(
            'contextmenu',
            async (event: MouseEvent) => {
              event.preventDefault();
              event.stopPropagation();
              // Right click: get conviction
              if (event.button === 2 && this.actor.getConviction) {
                try {
                  await this.actor.getConviction();
                } catch (e) {
                  /* ignore */
                }
                this.render();
              }
            },
          );
        }
      }
    } catch (error) {
      console.error('SWADE HUD: Error enriching item description:', error);
      descDiv.innerHTML = '<em>Error loading description</em>';
    }
  }

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
        case 3:
          statusText = 'Equipped';
          tooltipText = 'Equipped (Left: Store, Right: Carry)';
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

    console.log(
      'SWADE HUD: prepareEffectsPanelData - sheetEffects:',
      sheetEffects,
    );

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
      source?: { name: any; id: any };
    };
    const temporaryEffects: EffectData[] = [];
    const permanentEffects: EffectData[] = [];

    for (const effect of sheetEffects) {
      console.log(
        `SWADE HUD: Processing effect ${effect.name} (ID: ${effect.id}, disabled: ${effect.disabled})`,
      );

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

    console.log(
      'SWADE HUD: prepareEffectsPanelData - temporaryEffects:',
      temporaryEffects.length,
      'permanentEffects:',
      permanentEffects.length,
    );

    return {
      sheetEffects: {
        temporary: temporaryEffects,
        permanent: permanentEffects,
      },
      hasEffects: temporaryEffects.length > 0 || permanentEffects.length > 0,
    };
  }

  private preparePowersPanelData(_context: any) {
    // Group powers by arcane type
    const powers = this.actor.items.filter((i: any) => i.type === 'power');
    const groupedPowers: { [key: string]: any[] } = {};

    powers.forEach((power: any) => {
      const arcane = power.system?.arcane || 'General';
      if (!groupedPowers[arcane]) {
        groupedPowers[arcane] = [];
      }
      groupedPowers[arcane].push(power);
    });

    // Ensure power points exist for each arcane type
    const powerPoints = this.actor.system.powerPoints || {};
    Object.keys(groupedPowers).forEach((arcane) => {
      if (!powerPoints[arcane]) {
        powerPoints[arcane] = { value: 0, max: 0 };
      }
    });

    // Sort powers within each group alphabetically
    Object.keys(groupedPowers).forEach((arcane) => {
      groupedPowers[arcane].sort((a: any, b: any) => {
        const nameA = game.i18n.localize(a.name || a.id);
        const nameB = game.i18n.localize(b.name || b.id);
        return nameA.localeCompare(nameB);
      });
    });

    return {
      groupedPowers,
      powerPoints,
      hasPowers: powers.length > 0,
    };
  }

  private async prepareBioPanelData(context: any) {
    const biography = context.system?.details?.biography || {};
    const notes = context.system?.details?.notes || '';

    // Enrich biography content if available
    let enrichedBiography = '';
    if (biography.value) {
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

    return {
      biography: {
        enrichedValue: enrichedBiography,
      },
      enrichedNotes: enrichedNotes,
      hasBiography: !!(enrichedBiography || enrichedNotes),
    };
  }

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

    // Add item interaction handlers based on panel type
    this.setupPanelSpecificListeners(this.element);
  }

  private setupPanelSpecificListeners(html: HTMLElement) {
    switch (this.panelType) {
      case 'weapons': {
        this.setupWeaponsPanelListeners(html);
        break;
      }
      case 'traits':
        // Add any trait-specific listeners here if needed
        break;
      // Add other cases as needed
    }
    //       const isExpanded = item.classList.contains('expanded');

    //       if (isExpanded && !wasExpanded) {
    //         // Lazy enrich description if needed
    //         const itemId = item.getAttribute('data-item-id');
    //         if (itemId && this.actor) {
    //           const itemData = this.actor.items.get(itemId);
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
  // itemHeaders.forEach((header) => {
  //   header.addEventListener('click', (event) => {
  //     // Don't prevent default if clicking on a button
  //     if ((event.target as HTMLElement).tagName !== 'BUTTON') {
  //       event.preventDefault();
  //     }

  //     const item = (header as HTMLElement).closest('.swadehud-item');
  //     if (!item) return;

  //     // Check what was clicked
  //     const clickedElement = event.target as HTMLElement;

  //     // If clicked on dice icon, don't expand/collapse
  //     if (clickedElement.classList.contains('swadehud-roll-icon') ||
  //         clickedElement.closest('.swadehud-roll-icon')) {
  //       return;
  //     }

  //     // If clicked on name, expand/collapse
  //     if (clickedElement.classList.contains('swadehud-item-name') ||
  //         clickedElement.closest('.swadehud-item-name')) {
  //       const wasExpanded = item.classList.contains('expanded');
  //       item.classList.toggle('expanded');
  //       const isExpanded = item.classList.contains('expanded');

  //       if (isExpanded && !wasExpanded) {
  //         // Lazy enrich description if needed
  //         const itemId = item.getAttribute('data-item-id');
  //         if (itemId && this.actor) {
  //           const itemData = this.actor.items.get(itemId);
  //           if (itemData) {
  //             // Enrich description
  //             this.enrichItemDescription(item as HTMLElement, itemData);
  //           }
  //         }
  //       }
  //     }
  //   });
  // });

  // Handle attribute and skill rolling - only on dice icon
  // (Moved into setupTraitsPanelListeners or another appropriate method)

  private setupEdgesPanelListeners(_html: HTMLElement) {
    // Handle item expand/collapse - handled by setupHudActionButtonListeners
    // const itemHeaders = html.querySelectorAll('[data-toggle="expand"]');
    // itemHeaders.forEach((header) => {
    //   header.addEventListener('click', (event) => {
    //     // Don't prevent default if clicking on a button
    //     if ((event.target as HTMLElement).tagName !== 'BUTTON') {
    //       event.preventDefault();
    //     }
    //     const item = (header as HTMLElement).closest('.swadehud-item');
    //     if (!item) return;
    //     // Check what was clicked
    //     const clickedElement = event.target as HTMLElement;
    //     // If clicked on name, expand/collapse
    //     if (clickedElement.classList.contains('swadehud-item-name') ||
    //         clickedElement.closest('.swadehud-item-name')) {
    //       const wasExpanded = item.classList.contains('expanded');
    //       item.classList.toggle('expanded');
    //       const isExpanded = item.classList.contains('expanded');
    //       if (isExpanded && !wasExpanded) {
    //         // Lazy enrich description if needed
    //         const itemId = item.getAttribute('data-item-id');
    //         if (itemId && this.actor) {
    //           const itemData = this.actor.items.get(itemId);
    //           if (itemData) {
    //             // Enrich description
    //             this.enrichItemDescription(item as HTMLElement, itemData);
    //           }
    //         }
    //       }
    //     }
    //   });
    // });
    // Edge activation buttons - handled by setupHudActionButtonListeners
    // const edgeButtons = html.querySelectorAll('.swadehud-edge-activate');
    // edgeButtons.forEach(button => {
    //   button.addEventListener('click', (event) => {
    //     event.preventDefault();
    //     const edgeId = (button as HTMLElement).dataset.edgeId;
    //     if (edgeId) {
    //       this.handleEdgeActivation(edgeId);
    //     }
    //   });
    // });
  }

  private setupActionsPanelListeners(_html: HTMLElement) {
    // Handle item expand/collapse - handled by setupHudActionButtonListeners
    // const itemHeaders = html.querySelectorAll('[data-toggle="expand"]');
    // itemHeaders.forEach((header) => {
    //   header.addEventListener('click', (event) => {
    //     // Don't prevent default if clicking on a button
    //     if ((event.target as HTMLElement).tagName !== 'BUTTON') {
    //       event.preventDefault();
    //     }
    //     const item = (header as HTMLElement).closest('.swadehud-item');
    //     if (!item) return;
    //     // Check what was clicked
    //     const clickedElement = event.target as HTMLElement;
    //     // If clicked on name, expand/collapse
    //     if (clickedElement.classList.contains('swadehud-item-name') ||
    //         clickedElement.closest('.swadehud-item-name')) {
    //       const wasExpanded = item.classList.contains('expanded');
    //       item.classList.toggle('expanded');
    //       const isExpanded = item.classList.contains('expanded');
    //       if (isExpanded && !wasExpanded) {
    //         // Lazy enrich description if needed
    //         const itemId = item.getAttribute('data-item-id');
    //         if (itemId && this.actor) {
    //           const itemData = this.actor.items.get(itemId);
    //           if (itemData) {
    //             // Enrich description
    //             this.enrichItemDescription(item as HTMLElement, itemData);
    //           }
    //         }
    //       }
    //     }
    //   });
    // });
    // Action buttons - handled by setupHudActionButtonListeners
    // const actionButtons = html.querySelectorAll('.swadehud-action-trait, .swadehud-action-resist, .swadehud-action-damage, .swadehud-action-macro, .swadehud-action-reload, .swadehud-action-consume, .swadehud-action-template');
    // actionButtons.forEach(button => {
    //   button.addEventListener('click', async (event) => {
    //     event.preventDefault();
    //     const itemId = (button as HTMLElement).dataset.itemId;
    //     const actionId = (button as HTMLElement).dataset.action;
    //     const actionType = (button as HTMLElement).classList[0]?.replace('swadehud-action-', '');
    //     if (itemId && this.actor) {
    //       const item = this.actor.items.get(itemId);
    //       if (!item) return;
    //       try {
    //         switch (actionType) {
    //         case 'trait':
    //         case 'resist':
    //         case 'damage':
    //           // These are handled by the item's roll methods
    //           if (actionId && item.system.actions?.additional?.[actionId]) {
    //             await item.roll(actionId);
    //           }
    //           break;
    //         case 'macro':
    //           // Run macro if available
    //           if (actionId && item.system.actions?.additional?.[actionId]) {
    //             // Macros would need to be handled by the game system
    //             console.log('SWADE HUD: Macro action not implemented:', actionId);
    //           }
    //           break;
    //         case 'reload':
    //           // Handle reload action
    //           await item.reload();
    //           break;
    //         case 'consume':
    //           // Handle consume action
    //           await item.use();
    //           break;
    //         case 'template':
    //           // Handle template placement
    //           const templateType = (button as HTMLElement).dataset.template;
    //           if (templateType) {
    //             await item.placeTemplate(templateType);
    //           }
    //           break;
    //         default:
    //           console.log('SWADE HUD: Unknown action type:', actionType);
    //           break;
    //       }
    //       } catch (error) {
    //         console.error('SWADE HUD: Error executing action:', error);
    //         ui.notifications?.error('Failed to execute action');
    //       }
    //     }
    //   });
    // });
  }

  private setupGearPanelListeners(html: HTMLElement) {
    // Handle item expand/collapse - handled by setupHudActionButtonListeners
    // const itemHeaders = html.querySelectorAll('[data-toggle="expand"]');
    // itemHeaders.forEach((header) => {
    //   header.addEventListener('click', (event) => {
    //     // Don't prevent default if clicking on a button
    //     if ((event.target as HTMLElement).tagName !== 'BUTTON') {
    //       event.preventDefault();
    //     }

    //     const item = (header as HTMLElement).closest('.swadehud-item');
    //     if (!item) return;

    //     // Check what was clicked
    //     const clickedElement = event.target as HTMLElement;

    //     // If clicked on equip indicator, don't expand/collapse
    //     if (clickedElement.classList.contains('swadehud-equip-indicator') ||
    //         clickedElement.closest('.swadehud-equip-indicator')) {
    //       return;
    //     }

    //     // If clicked on name, expand/collapse
    //     if (clickedElement.classList.contains('swadehud-item-name') ||
    //         clickedElement.closest('.swadehud-item-name')) {
    //       const wasExpanded = item.classList.contains('expanded');
    //       item.classList.toggle('expanded');
    //       const isExpanded = item.classList.contains('expanded');

    //       if (isExpanded && !wasExpanded) {
    //         // Lazy enrich description if needed
    //         const itemId = item.getAttribute('data-item-id');
    //         if (itemId && this.actor) {
    //           const itemData = this.actor.items.get(itemId);
    //           if (itemData) {
    //             // Enrich description
    //             this.enrichItemDescription(item as HTMLElement, itemData);
    //           }
    //         }
    //       }
    //     }
    //   });
    // });

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
              user: game.user.id,
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
    // Handle item expand/collapse
    // const itemHeaders = html.querySelectorAll('[data-toggle="expand"]');
    // itemHeaders.forEach((header) => {
    //   header.addEventListener('click', (event) => {
    //     // Don't prevent default if clicking on a button
    //     if ((event.target as HTMLElement).tagName !== 'BUTTON') {
    //       event.preventDefault();
    //     }

    //     const item = (header as HTMLElement).closest('.swadehud-item');
    //     if (!item) return;

    //     // Check what was clicked
    //     const clickedElement = event.target as HTMLElement;

    //     // If clicked on name, expand/collapse
    //     if (clickedElement.classList.contains('swadehud-item-name') ||
    //         clickedElement.closest('.swadehud-item-name')) {
    //       const wasExpanded = item.classList.contains('expanded');
    //       item.classList.toggle('expanded');
    //       const isExpanded = item.classList.contains('expanded');

    //       if (isExpanded && !wasExpanded) {
    //         // Lazy enrich description if needed
    //         const itemId = item.getAttribute('data-item-id');
    //         if (itemId && this.actor) {
    //           const itemData = this.actor.items.get(itemId);
    //           if (itemData) {
    //             // Enrich description
    //             this.enrichItemDescription(item as HTMLElement, itemData);
    //           }
    //         }
    //       }
    //     }
    //   });
    // });

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

    console.log(
      'SWADE HUD: setupEffectsPanelListeners called with html:',
      html,
    );

    // Handle item expand/collapse
    // const itemHeaders = html.querySelectorAll('[data-toggle="expand"]');
    // itemHeaders.forEach((header) => {
    //   header.addEventListener('click', (event) => {
    //     // Don't prevent default if clicking on a button
    //     if ((event.target as HTMLElement).tagName !== 'BUTTON') {
    //       event.preventDefault();
    //     }

    //     const item = (header as HTMLElement).closest('.swadehud-item');
    //     if (!item) return;

    //     // Check what was clicked
    //     const clickedElement = event.target as HTMLElement;

    //     // If clicked on name, expand/collapse
    //     if (clickedElement.classList.contains('swadehud-item-name') ||
    //         clickedElement.closest('.swadehud-item-name')) {
    //       const wasExpanded = item.classList.contains('expanded');
    //       item.classList.toggle('expanded');
    //       const isExpanded = item.classList.contains('expanded');

    //       if (isExpanded && !wasExpanded) {
    //         // Lazy enrich description if needed
    //         const itemId = item.getAttribute('data-item-id');
    //         if (itemId && this.actor) {
    //           const itemData = this.actor.items.get(itemId);
    //           if (itemData) {
    //             // Enrich description
    //             this.enrichItemDescription(item as HTMLElement, itemData);
    //           }
    //         }
    //       }
    //     }
    //   });
    // });

    // Handle effect toggles
    const effectToggles = html.querySelectorAll('.swadehud-effect-toggle-icon');
    console.log('SWADE HUD: Found effect toggles:', effectToggles.length);

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
              (e) => e.name === effectName,
            );
            if (!effect) {
              for (const item of this.actor.items) {
                effect = Array.from(item.effects || []).find(
                  (e) => e.name === effectName,
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
    // Handle item expand/collapse
    // const itemHeaders = html.querySelectorAll('[data-toggle="expand"]');
    // itemHeaders.forEach((header) => {
    //   header.addEventListener('click', (event) => {
    //     // Don't prevent default if clicking on a button
    //     if ((event.target as HTMLElement).tagName !== 'BUTTON') {
    //       event.preventDefault();
    //     }
    //     const item = (header as HTMLElement).closest('.swadehud-item');
    //     if (!item) return;
    //     // Check what was clicked
    //     const clickedElement = event.target as HTMLElement;
    //     // If clicked on name, expand/collapse
    //     if (clickedElement.classList.contains('swadehud-item-name') ||
    //         clickedElement.closest('.swadehud-item-name')) {
    //       const wasExpanded = item.classList.contains('expanded');
    //       item.classList.toggle('expanded');
    //       const isExpanded = item.classList.contains('expanded');
    //       if (isExpanded && !wasExpanded) {
    //         // Lazy enrich description if needed
    //         const itemId = item.getAttribute('data-item-id');
    //         if (itemId && this.actor) {
    //           const itemData = this.actor.items.get(itemId);
    //           if (itemData) {
    //             // Enrich description
    //             this.enrichItemDescription(item as HTMLElement, itemData);
    //           }
    //         }
    //       }
    //     }
    //   });
    // });
    // Bio panel doesn't need special listeners for now
    // The description button is handled in the main HUD
  }

  private setupPowersPanelListeners(_html: HTMLElement) {
    // Handle item expand/collapse
    // const itemHeaders = html.querySelectorAll('[data-toggle="expand"]');
    // itemHeaders.forEach((header) => {
    //   header.addEventListener('click', (event) => {
    //     // Don't prevent default if clicking on a button
    //     if ((event.target as HTMLElement).tagName !== 'BUTTON') {
    //       event.preventDefault();
    //     }
    //     const item = (header as HTMLElement).closest('.swadehud-item');
    //     if (!item) return;
    //     // Check what was clicked
    //     const clickedElement = event.target as HTMLElement;
    //     // If clicked on name, expand/collapse
    //     if (clickedElement.classList.contains('swadehud-item-name') ||
    //         clickedElement.closest('.swadehud-item-name')) {
    //       const wasExpanded = item.classList.contains('expanded');
    //       item.classList.toggle('expanded');
    //       const isExpanded = item.classList.contains('expanded');
    //       if (isExpanded && !wasExpanded) {
    //         // Lazy enrich description if needed
    //         const itemId = item.getAttribute('data-item-id');
    //         if (itemId && this.actor) {
    //           const itemData = this.actor.items.get(itemId);
    //           if (itemData) {
    //             // Enrich description
    //             this.enrichItemDescription(item as HTMLElement, itemData);
    //           }
    //         }
    //       }
    //     }
    //   });
    // });
    // Power activation buttons - handled by setupHudActionButtonListeners
    // const powerButtons = html.querySelectorAll('.swadehud-power-activate');
    // powerButtons.forEach(button => {
    //   button.addEventListener('click', (event) => {
    //     event.preventDefault();
    //     const powerId = (button as HTMLElement).dataset.powerId;
    //     if (powerId) {
    //       this.handlePowerActivation(powerId);
    //     }
    //   });
    // });
  }

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
        const skill = this.actor.system.skills[traitKey];
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
    const edge = this.actor.items.get(edgeId);
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
    const action = this.actor.items.get(actionId);
    if (!action) return;

    try {
      await action.use();
    } catch (error) {
      console.error('SWADE HUD: Error executing action:', error);
      ui.notifications?.error('Failed to execute action');
    }
  }

  private async handleGearAction(gearId: string, action: string) {
    const gear = this.actor.items.get(gearId);
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
    const power = this.actor.items.get(powerId);
    if (!power) return;

    try {
      await power.use();
    } catch (error) {
      console.error('SWADE HUD: Error activating power:', error);
      ui.notifications?.error('Failed to activate power');
    }
  }

  async close() {
    if (!this.element || !this.element.parentNode) return this;

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
