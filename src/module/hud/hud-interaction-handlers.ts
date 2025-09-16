import { hudPanelConfig, hudPanelDefaultSize } from './hud-panel-constants';
/**
 * Generic function to show a HUD panel popout.
 * Handles closing existing popout, creating, and rendering the new one.
 * @param {any} hudInstance - The HUD instance.
 * @param {string} panelType - The type of panel (e.g., 'weapons', 'traits').
 * @param {string} title - The window title.
 * @param {string} template - The Handlebars template path.
 * @param {number} width - The panel width.
 * @param {number} height - The panel height.
 * @param {string} popoutKey - The key in hudInstance.popouts to store the popout.
 */
function showPanel(
  hudInstance: any,
  panelType: string,
  title: string,
  template: string,
  width: number,
  height: number,
  popoutKey: string,
) {
  if (!hudInstance.actor) return;
  if (hudInstance.popouts[popoutKey]) {
    hudInstance.popouts[popoutKey].close();
    hudInstance.popouts[popoutKey] = null;
  }
  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType,
    title,
    template,
    width,
    height,
    hudInstance,
  });
  hudInstance.popouts[popoutKey] = popout;
  popout.render(true).catch((error: any) => {
    console.error(`SWADE HUD: Error rendering ${panelType} popout:`, error);
  });
}
import { SwadePopout } from './hud-popout';

/**
 * Set up tab button click handlers for HUD panels.
 * Handles switching between different HUD panel tabs.
 * @param {HTMLElement} html - The HUD panel HTML element.
 * @param {any} hudInstance - The HUD instance.
 */
export function setupTabHandlers(html: HTMLElement, hudInstance: any) {
  // Tab button click handlers
  const tabButtons = html.querySelectorAll('.swadehud-tabbtn');
  tabButtons.forEach((button, _index) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const tabId = (button as HTMLElement).id;

      // Handle different tab types
      switch (tabId) {
        case 'weapons-tab':
          showWeaponsPanel(hudInstance);
          break;
        case 'traits-tab':
          showTraitsPanel(hudInstance);
          break;
        case 'edges-tab':
          showEdgesPanel(hudInstance);
          break;
        case 'actions-tab':
          showActionsPanel(hudInstance);
          break;
        case 'gear-tab':
          showGearPanel(hudInstance);
          break;
        case 'conditions-tab':
          showConditionsPanel(hudInstance);
          break;
        case 'effects-tab':
          showEffectsPanel(hudInstance);
          break;
        case 'powers-tab':
          showPowersPanel(hudInstance);
          break;
        default:
          // Unknown tab clicked - do nothing
          break;
      }
    });
  });
}

// Panel display functions
/**
 * Show the weapons panel popout for the HUD instance.
 * Closes existing popout if open, otherwise opens a new one.
 * @param {any} hudInstance - The HUD instance.
 */
function showWeaponsPanel(hudInstance: any) {
  const config = hudPanelConfig.weapons;
  showPanel(
    hudInstance,
    'weapons',
    config.title(hudInstance.actor.name),
    config.template,
    hudPanelDefaultSize.width,
    hudPanelDefaultSize.height,
    'weapons',
  );
}

function showTraitsPanel(hudInstance: any) {
  const config = hudPanelConfig.traits;
  showPanel(
    hudInstance,
    'traits',
    config.title(hudInstance.actor.name),
    config.template,
    hudPanelDefaultSize.width,
    hudPanelDefaultSize.height,
    'traits',
  );
}

function showEdgesPanel(hudInstance: any) {
  const config = hudPanelConfig.edges;
  showPanel(
    hudInstance,
    'edges',
    config.title(hudInstance.actor.name),
    config.template,
    hudPanelDefaultSize.width,
    hudPanelDefaultSize.height,
    'edges',
  );
}

function showActionsPanel(hudInstance: any) {
  const config = hudPanelConfig.actions;
  showPanel(
    hudInstance,
    'actions',
    config.title(hudInstance.actor.name),
    config.template,
    hudPanelDefaultSize.width,
    hudPanelDefaultSize.height,
    'actions',
  );
}

function showGearPanel(hudInstance: any) {
  const config = hudPanelConfig.gear;
  showPanel(
    hudInstance,
    'gear',
    config.title(hudInstance.actor.name),
    config.template,
    hudPanelDefaultSize.width,
    hudPanelDefaultSize.height,
    'gear',
  );
}

function showConditionsPanel(hudInstance: any) {
  const config = hudPanelConfig.conditions;
  showPanel(
    hudInstance,
    'conditions',
    config.title(hudInstance.actor.name),
    config.template,
    hudPanelDefaultSize.width,
    hudPanelDefaultSize.height,
    'conditions',
  );
}

function showEffectsPanel(hudInstance: any) {
  const config = hudPanelConfig.effects;
  showPanel(
    hudInstance,
    'effects',
    config.title(hudInstance.actor.name),
    config.template,
    hudPanelDefaultSize.width,
    hudPanelDefaultSize.height,
    'effects',
  );
}

function showPowersPanel(hudInstance: any) {
  const config = hudPanelConfig.powers;
  showPanel(
    hudInstance,
    'powers',
    config.title(hudInstance.actor.name),
    config.template,
    hudPanelDefaultSize.width,
    hudPanelDefaultSize.height,
    'powers',
  );
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

  // Handle description/bio button
  const bioButton = html.querySelector('#bio-button');
  if (bioButton) {
    bioButton.addEventListener('click', () => {
      showBiographyPanel(hudInstance);
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

function showBiographyPanel(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Close existing bio popout if open
  if (hudInstance.currentBioPopout) {
    hudInstance.currentBioPopout.close();
    hudInstance.currentBioPopout = null;
    // Do not return; continue to open new popout
  }

  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType: 'bio',
    title: `${hudInstance.actor.name} - Biography`,
    template: 'systems/swade/templates/actors/hud/hud-bio-panel.hbs',
    width: 500,
    height: 600,
    hudInstance: hudInstance,
  });

  hudInstance.currentBioPopout = popout;
  popout.render(true);
}

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

function handleSoakClick(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Get current wounds
  const currentWounds = hudInstance.actor.system.wounds?.value || 0;

  if (currentWounds > 0) {
    // Create a soak roll dialog or directly reduce wounds
    // For now, just reduce wounds by 1 (this would typically show a dialog)
    const newWounds = Math.max(0, currentWounds - 1);
    hudInstance.actor.update({ 'system.wounds.value': newWounds });
  }
}

function handleIncapacitatedClick(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Toggle incapacitated status
  const isIncapacitated = hudInstance.actor.system.isIncapacitated || false;
  const newIncapacitatedState = !isIncapacitated;

  // This would typically update a status effect or actor flag
  hudInstance.actor.update({ 'system.isIncapacitated': newIncapacitatedState });
}

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
