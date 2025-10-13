import { SwadePopout } from './hud-popout';
import { debounce } from './hud-utils';
import { setupHudActionButtonListeners } from './hud-actions';
import { setupHudStatHandlers } from './hud-stat-handlers';
import { debounceRender } from './hud-utils';

/**
 * Toggles a popout window for a specific HUD tab
 *
 * If the clicked popout is already open, it closes it.
 * If a different popout is open, it closes all popouts and opens the new one.
 * This provides a hybrid behavior: toggle for same tab, replace for different tabs.
 *
 * @param {any} hudInstance - The main HUD instance that owns the popout
 * @param {string} template - Path to the Handlebars template for this popout
 * @param {string} side - Which side to position the popout ('left' or 'right')
 * @param {string} popoutProperty - Property name on hudInstance to store the popout reference
 * @param {Function} [setupCallback=null] - Optional callback function to run after popout creation
 * @param {HTMLElement} setupCallback.element - The popout's DOM element
 * @param {Actor} setupCallback.actor - The actor associated with the HUD
 * @returns {Promise<SwadePopout|null>} The created popout instance, or null if closed
 */
async function togglePopout(
  hudInstance: any,
  template: string,
  side: string,
  popoutProperty: string,
  setupCallback: ((element: HTMLElement, actor: any) => void) | null = null,
): Promise<SwadePopout | null> {
  // Check if this specific popout is already open
  if (hudInstance[popoutProperty]) {
    // Close the existing popout and return null (don't open anything)
    await hudInstance[popoutProperty].close();
    hudInstance[popoutProperty] = null;
    return null;
  }

  // Popout is not open, so close ALL existing popouts first
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
    if (hudInstance[prop]) {
      await hudInstance[prop].close();
      hudInstance[prop] = null;
    }
  }

  // Now create the new popout
  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType: popoutProperty
      .replace('current', '')
      .replace('Popout', '')
      .toLowerCase(),
    title: '',
    template,
    width: 400,
    height: 600,
    hudInstance,
  });
  hudInstance[popoutProperty] = popout;
  await popout.render(true);

  // Run setup callback if provided
  if (setupCallback && popout.element) {
    await setupCallback(popout.element, hudInstance.actor);
  }

  return popout;
}

/**
 * Sets up click event handlers for all HUD tabs
 *
 * This function attaches event listeners to each tab element in the main HUD
 * and handles the creation of their respective popout windows. Each tab follows
 * the same pattern but may have different setup requirements.
 *
 * @param {HTMLElement} html - The root HTML element of the HUD
 * @param {any} hudInstance - The main HUD instance
 * @returns {Promise<void>}
 */
export async function setupTabHandlers(html: HTMLElement, hudInstance: any) {
  // Traits tab
  const traitsTab = html.querySelector('#traits-tab');
  if (traitsTab) {
    traitsTab.addEventListener(
      'click',
      debounce(async (ev) => {
        ev.stopPropagation();
        await togglePopout(
          hudInstance,
          'systems/swade/templates/actors/hud/hud-traits-panel.hbs',
          'left',
          'currentTraitsPopout',
          (element) =>
            setupHudActionButtonListeners(
              element,
              hudInstance.actor,
              hudInstance,
            ),
        );
      }, 50),
    );
  }

  // Weapons tab
  const weaponsTab = html.querySelector('#weapons-tab');
  if (weaponsTab) {
    weaponsTab.addEventListener(
      'click',
      debounce(async (ev) => {
        ev.stopPropagation();
        await togglePopout(
          hudInstance,
          'systems/swade/templates/actors/hud/hud-weapons-panel.hbs',
          'left',
          'currentWeaponsPopout',
          async (element) => {
            setupHudActionButtonListeners(
              element,
              hudInstance.actor,
              hudInstance,
            );
            // Setup stat handlers for equip status indicators
            // Pass the HUD token so the handlers (combat toggle) have a valid token reference
            setupHudStatHandlers(
              element,
              hudInstance.actor,
              null,
              hudInstance.token,
            );
          },
        );
      }, 50),
    );
  }

  // Edges tab
  const edgesTab = html.querySelector('#edges-tab');
  if (edgesTab) {
    edgesTab.addEventListener(
      'click',
      debounce(async (ev) => {
        ev.stopPropagation();
        await togglePopout(
          hudInstance,
          'systems/swade/templates/actors/hud/hud-edges-panel.hbs',
          'left',
          'currentEdgesPopout',
          (element) =>
            setupHudActionButtonListeners(
              element,
              hudInstance.actor,
              hudInstance,
            ),
        );
      }, 80),
    );
  }

  // Actions tab
  const actionsTab = html.querySelector('#actions-tab');
  if (actionsTab) {
    actionsTab.addEventListener(
      'click',
      debounce(async (ev) => {
        ev.stopPropagation();
        const popout = await togglePopout(
          hudInstance,
          'systems/swade/templates/actors/hud/hud-actions-panel.hbs',
          'left',
          'currentActionsPopout',
        );
        if (popout && popout.element) {
          setupHudActionButtonListeners(
            popout.element,
            hudInstance.actor,
            hudInstance,
          );
        }
      }, 50),
    );
  }

  // Conditions tab
  const conditionsTab = html.querySelector('#conditions-tab');
  if (conditionsTab) {
    conditionsTab.addEventListener(
      'click',
      debounce(async (ev) => {
        ev.stopPropagation();
        const popout = await togglePopout(
          hudInstance,
          'systems/swade/templates/actors/hud/hud-conditions-panel.hbs',
          'right',
          'currentConditionsPopout',
        );
        if (popout && popout.element) {
          // Setup condition handlers for toggling status effects
          setupConditionHandlers(popout.element, hudInstance);

          // Handle header clicks for expanding
          const itemHeaders = popout.element.querySelectorAll(
            '[data-toggle="expand"]',
          );
          itemHeaders.forEach((header) => {
            header.addEventListener(
              'click',
              debounce((event) => {
                if (event.target.tagName !== 'BUTTON') {
                  event.preventDefault();
                }

                const item = header.closest('.swadehud-item');
                if (!item) return;

                // Check what was clicked
                const clickedElement = event.target;

                // If clicked on toggle icon, don't expand/collapse
                if (clickedElement.closest('.swadehud-condition-toggle-icon')) {
                  return;
                }

                // If clicked on name, expand/collapse
                if (
                  clickedElement.classList.contains('swadehud-item-name') ||
                  clickedElement.closest('.swadehud-item-name')
                ) {
                  item.classList.toggle('expanded');
                  return;
                }

                // Default: expand/collapse
                item.classList.toggle('expanded');
              }, 100),
            );
          });
        }
      }, 80),
    );
  }

  // Effects tab
  const effectsTab = html.querySelector('#effects-tab');
  if (effectsTab) {
    effectsTab.addEventListener(
      'click',
      debounce(async (ev) => {
        ev.stopPropagation();
        const popout = await togglePopout(
          hudInstance,
          'systems/swade/templates/actors/hud/hud-effects-panel.hbs',
          'right',
          'currentEffectsPopout',
        );

        // Setup effect handlers
        if (popout && popout.element) {
          // Handle header clicks for expanding
          const itemHeaders = popout.element.querySelectorAll(
            '[data-toggle="expand"]',
          );
          itemHeaders.forEach((header) => {
            header.addEventListener(
              'click',
              debounce((event) => {
                if (event.target.tagName !== 'BUTTON') {
                  event.preventDefault();
                }

                const item = header.closest('.swadehud-item');
                if (!item) return;

                // Check what was clicked
                const clickedElement = event.target;

                // If clicked on toggle icon, don't expand/collapse
                if (clickedElement.closest('.swadehud-effect-toggle-icon')) {
                  return;
                }

                // If clicked on name, expand/collapse
                if (
                  clickedElement.classList.contains('swadehud-item-name') ||
                  clickedElement.closest('.swadehud-item-name')
                ) {
                  item.classList.toggle('expanded');
                  return;
                }

                // Default: expand/collapse
                item.classList.toggle('expanded');
              }, 100),
            );
          });
        }
      }, 80),
    );
  }

  // Powers tab
  const powersTab = html.querySelector('#powers-tab');
  if (powersTab) {
    powersTab.addEventListener(
      'click',
      debounce(async (ev) => {
        ev.stopPropagation();
        const popout = await togglePopout(
          hudInstance,
          'systems/swade/templates/actors/hud/hud-powers-panel.hbs',
          'right',
          'currentPowersPopout',
        );
        if (popout && popout.element) {
          setupHudActionButtonListeners(
            popout.element,
            hudInstance.actor,
            hudInstance,
          );
          // Setup stat handlers for power point indicators
          // Ensure handlers receive the HUD token when available
          setupHudStatHandlers(
            popout.element,
            hudInstance.actor,
            null,
            hudInstance.token,
          );
        }
      }, 80),
    );
  }

  // Gear tab
  const gearTab = html.querySelector('#gear-tab');
  if (gearTab) {
    gearTab.addEventListener(
      'click',
      debounce(async (ev) => {
        ev.stopPropagation();
        await togglePopout(
          hudInstance,
          'systems/swade/templates/actors/hud/hud-gear-panel.hbs',
          'right',
          'currentGearPopout',
          async (element) => {
            setupHudActionButtonListeners(
              element,
              hudInstance.actor,
              hudInstance,
            );
            // Setup stat handlers for equip status indicators
            // Pass token so combat toggle works from popouts
            setupHudStatHandlers(
              element,
              hudInstance.actor,
              null,
              hudInstance.token,
            );
          },
        );
      }, 80),
    );
  }

  // Biography button (in core area)
  const bioButton = html.querySelector('#bio-button');
  if (bioButton) {
    bioButton.addEventListener(
      'click',
      debounce(async (ev) => {
        ev.stopPropagation();
        await togglePopout(
          hudInstance,
          'systems/swade/templates/actors/hud/hud-bio-panel.hbs',
          'right',
          'currentBioPopout',
        );
      }, 80),
    );
  }
}

export function setupRollButtonHandlers(html: HTMLElement, hudInstance: any) {
  // Handle portrait click to open character sheet
  const portrait = html.querySelector('.swadehud-portrait');
  if (portrait) {
    portrait.addEventListener('click', () => {
      if (hudInstance.actor) {
        hudInstance.actor.sheet.render(true);
      }
    });
  }

  // Handle stat circle clicks (wounds, fatigue)
  const statCircles = html.querySelectorAll('.swadehud-stat-clickable');
  // Only attach stat circle handlers for wounds/fatigue, not for benny/conviction (handled in SwadeActorHUD)
  statCircles.forEach((circle) => {
    const statPath = circle.getAttribute('data-stat-path');
    if (
      statPath === 'system.bennies.value' ||
      statPath === 'system.conviction.value'
    )
      return;
    circle.addEventListener('click', (event) => {
      event.preventDefault();
      handleStatClick(event, hudInstance);
    });
    circle.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      handleStatRightClick(event, hudInstance);
    });
  });

  // Handle bottom row stat clicks
  const bottomStats = html.querySelectorAll('.swadehud-bottomstat--label');
  // Only attach bottom stat handlers for non-benny/non-conviction stats (handled in SwadeActorHUD)
  bottomStats.forEach((stat) => {
    const statPath = stat.getAttribute('data-stat-path');
    const isConviction = stat.classList.contains(
      'swadehud-conviction-clickable',
    );
    if (statPath === 'system.bennies.value' || isConviction) return;
    stat.addEventListener('click', (event) => {
      event.preventDefault();
      handleBottomStatClick(event, hudInstance);
    });
    stat.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      handleBottomStatRightClick(event, hudInstance);
    });
  });
}

/**
 * Handles left-click on stat circles (wounds, fatigue) to decrement the stat value
 *
 * @param {Event} event - The click event
 * @param {any} hudInstance - The HUD instance containing the actor
 */
function handleStatClick(event: Event, hudInstance: any) {
  const target = event.target as HTMLElement;
  const circle = target.closest('.swadehud-stat-clickable') as HTMLElement;
  if (!circle || !hudInstance.actor) return;

  const statPath = circle.dataset.statPath;
  if (!statPath) return;

  // Decrement stat (left click)
  const currentValue =
    foundry.utils.getProperty(hudInstance.actor, statPath) || 0;
  const minValue = parseInt(circle.dataset.statMin || '0');
  const newValue = Math.max(minValue, currentValue - 1);

  hudInstance.actor.update({ [statPath]: newValue });
}

/**
 * Handles right-click on stat circles (wounds, fatigue) to increment the stat value
 *
 * @param {Event} event - The right-click event
 * @param {any} hudInstance - The HUD instance containing the actor
 */
function handleStatRightClick(event: Event, hudInstance: any) {
  const target = event.target as HTMLElement;
  const circle = target.closest('.swadehud-stat-clickable') as HTMLElement;
  if (!circle || !hudInstance.actor) return;

  const statPath = circle.dataset.statPath;
  if (!statPath) return;

  // Increment stat (right click)
  const currentValue =
    foundry.utils.getProperty(hudInstance.actor, statPath) || 0;
  const maxValue = parseInt(circle.dataset.statMax || '999');
  const newValue = Math.min(maxValue, currentValue + 1);

  hudInstance.actor.update({ [statPath]: newValue });
}

/**
 * Handles left-click on bottom row stat labels (bennies, combat toggle, etc.)
 * Routes to appropriate handler based on the stat type
 *
 * @param {Event} event - The click event
 * @param {any} hudInstance - The HUD instance containing the actor
 */
function handleBottomStatClick(event: Event, hudInstance: any) {
  const target = event.target as HTMLElement;
  const stat = target.closest('.swadehud-bottomstat--label') as HTMLElement;
  if (!stat || !hudInstance.actor) return;

  // Handle different stat types
  if (stat.classList.contains('swadehud-combat-toggle-clickable')) {
    handleCombatToggleClick(stat, hudInstance);
  } else if (stat.dataset.statPath) {
    // Handle bennies and other stats
    handleBennieClick(stat, hudInstance);
  }
}

/**
 * Handles right-click on bottom row stat labels (bennies, etc.)
 * Routes to appropriate handler based on the stat type
 *
 * @param {Event} event - The right-click event
 * @param {any} hudInstance - The HUD instance containing the actor
 */
function handleBottomStatRightClick(event: Event, hudInstance: any) {
  const target = event.target as HTMLElement;
  const stat = target.closest('.swadehud-bottomstat--label') as HTMLElement;
  if (!stat || !hudInstance.actor) return;

  // Handle different stat types
  if (stat.dataset.statPath) {
    // Handle bennies and other stats
    handleBennieRightClick(stat, hudInstance);
  }
}

/**
 * Handles clicking on the combat toggle button to enter/exit combat
 * Updates the token's combat state and shows appropriate notifications
 *
 * @param {HTMLElement} stat - The stat element that was clicked
 * @param {any} hudInstance - The HUD instance containing the token
 */
function handleCombatToggleClick(stat: HTMLElement, hudInstance: any) {
  // Simple combat toggle - just update UI state and show notification
  if (hudInstance.token) {
    const isInCombat = stat.dataset.inCombat === 'true';
    const newCombatState = !isInCombat;

    // Update the UI state (used for visual feedback)
    stat.dataset.inCombat = newCombatState.toString();

    // Show user feedback (variables are used here)
    const actorName = hudInstance.actor?.name || 'Unknown';
    const message = newCombatState
      ? `${actorName} combat state: ON`
      : `${actorName} combat state: OFF`;

    ui.notifications.info(message);
  }
}

/**
 * Handles left-click on benny counters to decrement the benny value
 *
 * @param {HTMLElement} stat - The stat element containing benny data
 * @param {any} hudInstance - The HUD instance containing the actor
 */
function handleBennieClick(stat: HTMLElement, hudInstance: any) {
  // Decrement bennies (left click)
  const statPath = stat.dataset.statPath;
  if (!statPath) return;

  const currentValue =
    foundry.utils.getProperty(hudInstance.actor, statPath) || 0;
  const minValue = parseInt(stat.dataset.statMin || '0');
  const newValue = Math.max(minValue, currentValue - 1);

  hudInstance.actor.update({ [statPath]: newValue });
}

function handleBennieRightClick(stat: HTMLElement, hudInstance: any) {
  // Increment bennies (right click)
  const statPath = stat.dataset.statPath;
  if (!statPath) return;

  const currentValue =
    foundry.utils.getProperty(hudInstance.actor, statPath) || 0;
  const newValue = currentValue + 1;

  hudInstance.actor.update({ [statPath]: newValue });
}

/**
 * Sets up event handlers for ability-related buttons in the HUD
 *
 * This function attaches click event listeners to special ability buttons
 * such as the soak button (heart icon in wounds circle) and incapacitated
 * button (bolt icon in fatigue circle). These buttons provide quick access
 * to common combat-related actions.
 *
 * @param {HTMLElement} html - The root HTML element of the HUD
 * @param {any} hudInstance - The main HUD instance containing the actor
 */
export function setupAbilityHandlers(html: HTMLElement, hudInstance: any) {
  // Handle soak button (heart icon in wounds circle)
  const soakButton = html.querySelector('.swadehud-soak-clickable');
  if (soakButton) {
    soakButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation(); // Prevent triggering the stat circle click
      handleSoakClick(hudInstance);
    });
  }

  // Handle incapacitated button (bolt icon in fatigue circle)
  const incapacitatedButton = html.querySelector(
    '.swadehud-incapacitated-clickable',
  );
  if (incapacitatedButton) {
    incapacitatedButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation(); // Prevent triggering the stat circle click
      handleIncapacitatedClick(hudInstance);
    });
  }
}

/**
 * Handles clicking on the soak button to reduce wounds
 *
 * When the soak button (heart icon in the wounds circle) is clicked,
 * this function reduces the actor's wounds by 1 if they have any wounds.
 * In a full implementation, this would typically show a soak roll dialog
 * instead of directly reducing wounds.
 *
 * @param {any} hudInstance - The HUD instance containing the actor
 */
function handleSoakClick(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Get current wounds
  const currentWounds =
    (hudInstance.actor.wounds?.value ??
      hudInstance.actor.system.wounds?.value) ||
    0;

  if (currentWounds > 0) {
    // Create a soak roll dialog or directly reduce wounds
    // For now, just reduce wounds by 1 (this would typically show a dialog)
    const newWounds = Math.max(0, currentWounds - 1);
    hudInstance.actor.update({ 'system.wounds.value': newWounds });
  }
}

/**
 * Handles clicking on the incapacitated button to toggle incapacitated status
 *
 * When the incapacitated button (bolt icon in the fatigue circle) is clicked,
 * this function toggles the actor's incapacitated status. This would typically
 * update a status effect or actor flag to reflect the incapacitated state.
 *
 * @param {any} hudInstance - The HUD instance containing the actor
 */
function handleIncapacitatedClick(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Toggle incapacitated status
  const isIncapacitated =
    (hudInstance.actor.isIncapacitated ??
      hudInstance.actor.system.isIncapacitated) ||
    false;
  const newIncapacitatedState = !isIncapacitated;

  // This would typically update a status effect or actor flag
  hudInstance.actor.update({ 'system.isIncapacitated': newIncapacitatedState });
}

export function setupConditionHandlers(element: HTMLElement, hudInstance: any) {
  // Handle condition toggle icons
  const conditionToggleIcons = element.querySelectorAll(
    '.swadehud-condition-toggle-icon',
  );
  conditionToggleIcons.forEach((icon) => {
    // Remove existing event listeners to prevent duplicates
    const newIcon = icon.cloneNode(true) as HTMLElement;
    icon.parentNode!.replaceChild(newIcon, icon);

    newIcon.addEventListener('click', async (ev) => {
      ev.stopPropagation(); // Prevent triggering expand/collapse
      const statusId = newIcon.dataset.statusId;
      if (!hudInstance.actor || !statusId) return;

      try {
        // Simple toggle: just add/remove the specific status that was clicked
        const isCurrentlyActive =
          hudInstance.actor.effects?.some((e: any) =>
            e.statuses?.has(statusId),
          ) ?? false;

        if (isCurrentlyActive) {
          // Remove the status
          const effectsToRemove =
            hudInstance.actor.effects?.filter((e: any) =>
              e.statuses?.has(statusId),
            ) ?? [];
          for (const effect of effectsToRemove) {
            await effect.delete();
          }
        } else {
          // Add the status
          await hudInstance.actor.toggleStatusEffect(statusId);
        }

        // Update all condition icons after a short delay to allow related effects to be applied
        setTimeout(() => {
          // Re-query the DOM for current elements since we cloned/replaced them
          const currentIcons = element.querySelectorAll(
            '.swadehud-condition-toggle-icon',
          );
          currentIcons.forEach((icon) => {
            const iconElement = icon as HTMLElement;
            const iconStatusId = iconElement.dataset.statusId;
            const iconIsActive =
              hudInstance.actor.effects?.some((e: any) =>
                e.statuses?.has(iconStatusId),
              ) ?? false;
            iconElement.classList.toggle('active', iconIsActive);

            // Update icon appearance
            const iconI = iconElement.querySelector('i') || iconElement;
            if (
              iconI.classList.contains('fa-toggle-on') ||
              iconI.classList.contains('fa-toggle-off')
            ) {
              iconI.classList.remove('fa-toggle-on', 'fa-toggle-off');
              iconI.classList.add(
                iconIsActive ? 'fa-toggle-on' : 'fa-toggle-off',
              );
            }

            // Update tooltip
            const effect = (CONFIG as any).statusEffects?.find(
              (e: any) => e.id === iconStatusId,
            );
            if (effect) {
              iconElement.title = iconIsActive
                ? `Remove ${(game as any).i18n.localize(effect.name)}`
                : `Add ${(game as any).i18n.localize(effect.name)}`;
            }
          });

          // Force HUD re-render to ensure all updates are reflected
          debounceRender(hudInstance);
        }, 100); // Increased delay to allow related effects to be applied
      } catch (error) {
        console.error('Error toggling condition:', error);
        (ui as any).notifications.error('Failed to toggle condition');
      }
    });
  });

  // Add click handler for clear all button
  const clearButton = element.querySelector('.swadehud-clear-conditions');
  if (clearButton) {
    // Remove existing event listeners to prevent duplicates
    const newClearButton = clearButton.cloneNode(true) as HTMLElement;
    clearButton.parentNode!.replaceChild(newClearButton, clearButton);

    newClearButton.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (!hudInstance.actor) return;

      try {
        // Get all active status effects that are in our allowed conditions
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
          'invisible', // Include core Foundry status effects
        ];
        const activeEffects =
          hudInstance.actor.effects?.filter(
            (e: any) =>
              e.statuses &&
              Array.from(e.statuses).some((status: string) =>
                allowedConditions.includes(status.toLowerCase()),
              ),
          ) ?? [];

        // Remove all active status effects
        for (const effect of activeEffects) {
          await effect.delete();
        }

        // Update all condition icons to inactive state
        // Re-query the DOM for current elements since we cloned/replaced them
        const currentIcons = element.querySelectorAll(
          '.swadehud-condition-toggle-icon',
        );
        currentIcons.forEach((icon) => {
          const iconElement = icon as HTMLElement;
          iconElement.classList.remove('active');
          const statusId = iconElement.dataset.statusId;

          // Update icon appearance
          const iconI = iconElement.querySelector('i') || iconElement;
          if (iconI.classList.contains('fa-toggle-on')) {
            iconI.classList.remove('fa-toggle-on');
            iconI.classList.add('fa-toggle-off');
          }

          const effect = (CONFIG as any).statusEffects?.find(
            (e: any) => e.id === statusId,
          );
          if (effect) {
            iconElement.title = `Add ${(game as any).i18n.localize(effect.name)}`;
          }
        });

        // Force HUD re-render to ensure all updates are reflected
        debounceRender(hudInstance);

        // Show notification
        (ui as any).notifications.info('All conditions cleared');

        // Force a HUD refresh to update all condition displays
        if (hudInstance.render) {
          debounceRender(hudInstance);
        }
      } catch (error) {
        console.error('Error clearing conditions:', error);
        (ui as any).notifications.error('Failed to clear conditions');
      }
    });
  }
}

/**
 * Sets up event handlers for portrait interactions in the HUD
 *
 * This function attaches click event listeners to the portrait container
 * and portrait image elements. Clicking either opens the associated
 * actor's character sheet for detailed viewing and editing.
 *
 * @param {HTMLElement} html - The root HTML element of the HUD
 * @param {any} hudInstance - The main HUD instance containing the actor
 */
export function setupPortraitHandler(html: HTMLElement, hudInstance: any) {
  // Handle portrait click to open character sheet
  const portrait = html.querySelector('.swadehud-portrait');
  if (portrait) {
    portrait.addEventListener('click', () => {
      if (hudInstance.actor) {
        hudInstance.actor.sheet.render(true);
      }
    });
  }

  // Handle portrait image click (same as portrait container)
  const portraitImg = html.querySelector('.swadehud-portrait-img');
  if (portraitImg) {
    portraitImg.addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent double-triggering
      if (hudInstance.actor) {
        hudInstance.actor.sheet.render(true);
      }
    });
  }
}

export function setupDragHandler(html: HTMLElement) {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let elementStartX = 0;
  let elementStartY = 0;

  // Make the entire HUD draggable
  html.addEventListener('mousedown', (event) => {
    // Only start drag on left mouse button and not on interactive elements
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    const isInteractive = target.closest(
      '.swadehud-stat-clickable, .swadehud-bottomstat--label, .swadehud-tabbtn, .swadehud-portrait, button, input, select, textarea',
    );

    if (isInteractive) return; // Don't drag when clicking interactive elements

    isDragging = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;

    const rect = html.getBoundingClientRect();
    elementStartX = rect.left;
    elementStartY = rect.top;

    html.classList.add('dragging');
    html.style.cursor = 'grabbing';

    event.preventDefault();
  });

  // Handle mouse move during drag
  document.addEventListener('mousemove', (event) => {
    if (!isDragging) return;

    const deltaX = event.clientX - dragStartX;
    const deltaY = event.clientY - dragStartY;

    const newLeft = elementStartX + deltaX;
    const newTop = elementStartY + deltaY;

    // Constrain to viewport bounds
    const rect = html.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;

    const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft));
    const constrainedTop = Math.max(0, Math.min(newTop, maxTop));

    html.style.left = `${constrainedLeft}px`;
    html.style.top = `${constrainedTop}px`;
    html.style.right = 'auto';
    html.style.bottom = 'auto';
  });

  // Handle mouse up to end drag
  document.addEventListener('mouseup', () => {
    if (!isDragging) return;

    isDragging = false;
    html.classList.remove('dragging');
    html.style.cursor = '';

    // Dispatch custom event for position change
    html.dispatchEvent(new CustomEvent('hud-moved', { bubbles: true }));
  });
}
