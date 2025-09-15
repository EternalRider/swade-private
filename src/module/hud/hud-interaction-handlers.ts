import { SwadePopout } from './hud-popout';

// Tab handlers for HUD panels
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
function showWeaponsPanel(hudInstance: any) {
  if (!hudInstance.actor) {
    return;
  }

  // Close existing weapons popout if open
  if (hudInstance.currentWeaponsPopout) {
    hudInstance.currentWeaponsPopout.close();
    hudInstance.currentWeaponsPopout = null;
    return;
  }

  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType: 'weapons',
    title: `${hudInstance.actor.name} - Weapons`,
    template: 'systems/swade/templates/actors/hud/hud-weapons-panel.hbs',
    width: 450,
    height: 600,
    hudInstance: hudInstance,
  });

  hudInstance.currentWeaponsPopout = popout;
  popout
    .render(true)
    .then(() => {
      // Weapons popout render complete
    })
    .catch((error) => {
      console.error('SWADE HUD: Error rendering weapons popout:', error);
    });
}

function showTraitsPanel(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Close existing traits popout if open
  if (hudInstance.currentTraitsPopout) {
    hudInstance.currentTraitsPopout.close();
    hudInstance.currentTraitsPopout = null;
    return;
  }

  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType: 'traits',
    title: `${hudInstance.actor.name} - Traits`,
    template: 'systems/swade/templates/actors/hud/hud-traits-panel.hbs',
    width: 400,
    height: 500,
    hudInstance: hudInstance,
  });

  hudInstance.currentTraitsPopout = popout;
  popout.render(true);
}

function showEdgesPanel(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Close existing edges popout if open
  if (hudInstance.currentEdgesPopout) {
    hudInstance.currentEdgesPopout.close();
    hudInstance.currentEdgesPopout = null;
    return;
  }

  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType: 'edges',
    title: `${hudInstance.actor.name} - Edges & Hindrances`,
    template: 'systems/swade/templates/actors/hud/hud-edges-panel.hbs',
    width: 400,
    height: 500,
    hudInstance: hudInstance,
  });

  hudInstance.currentEdgesPopout = popout;
  popout.render(true);
}

function showActionsPanel(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Close existing actions popout if open
  if (hudInstance.currentActionsPopout) {
    hudInstance.currentActionsPopout.close();
    hudInstance.currentActionsPopout = null;
    return;
  }

  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType: 'actions',
    title: `${hudInstance.actor.name} - Actions`,
    template: 'systems/swade/templates/actors/hud/hud-actions-panel.hbs',
    width: 400,
    height: 500,
    hudInstance: hudInstance,
  });

  hudInstance.currentActionsPopout = popout;
  popout.render(true);
}

function showGearPanel(hudInstance: any) {
  if (!hudInstance.actor) {
    return;
  }

  // Close existing gear popout if open
  if (hudInstance.currentGearPopout) {
    hudInstance.currentGearPopout.close();
    hudInstance.currentGearPopout = null;
    return;
  }

  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType: 'gear',
    title: `${hudInstance.actor.name} - Gear`,
    template: 'systems/swade/templates/actors/hud/hud-gear-panel.hbs',
    width: 400,
    height: 500,
    hudInstance: hudInstance,
  });

  hudInstance.currentGearPopout = popout;
  popout
    .render(true)
    .then(() => {
      // Gear popout render complete
    })
    .catch((error) => {
      console.error('SWADE HUD: Error rendering gear popout:', error);
    });
}

function showConditionsPanel(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Close existing conditions popout if open
  if (hudInstance.currentConditionsPopout) {
    hudInstance.currentConditionsPopout.close();
    hudInstance.currentConditionsPopout = null;
    return;
  }

  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType: 'conditions',
    title: `${hudInstance.actor.name} - Conditions`,
    template: 'systems/swade/templates/actors/hud/hud-conditions-panel.hbs',
    width: 350,
    height: 400,
    hudInstance: hudInstance,
  });

  hudInstance.currentConditionsPopout = popout;
  popout.render(true);
}

function showEffectsPanel(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Close existing effects popout if open
  if (hudInstance.currentEffectsPopout) {
    hudInstance.currentEffectsPopout.close();
    hudInstance.currentEffectsPopout = null;
    return;
  }

  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType: 'effects',
    title: `${hudInstance.actor.name} - Effects`,
    template: 'systems/swade/templates/actors/hud/hud-effects-panel.hbs',
    width: 350,
    height: 400,
    hudInstance: hudInstance,
  });

  hudInstance.currentEffectsPopout = popout;
  popout.render(true);
}

function showPowersPanel(hudInstance: any) {
  if (!hudInstance.actor) return;

  // Close existing powers popout if open
  if (hudInstance.currentPowersPopout) {
    hudInstance.currentPowersPopout.close();
    hudInstance.currentPowersPopout = null;
    return;
  }

  const popout = new SwadePopout({
    actor: hudInstance.actor,
    token: hudInstance.token,
    panelType: 'powers',
    title: `${hudInstance.actor.name} - Powers`,
    template: 'systems/swade/templates/actors/hud/hud-powers-panel.hbs',
    width: 400,
    height: 500,
    hudInstance: hudInstance,
  });

  hudInstance.currentPowersPopout = popout;
  popout.render(true);
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
    return;
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
