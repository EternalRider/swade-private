import { SwadePopout } from './hud-popout';

// Tab handlers for HUD panels
export function setupTabHandlers(html: HTMLElement, hudInstance: any) {
  // Tab button click handlers
  const tabButtons = html.querySelectorAll('.swadehud-tabbtn');
  console.log('SWADE HUD: Found tab buttons:', tabButtons.length);
  tabButtons.forEach((button, index) => {
    console.log(`SWADE HUD: Tab button ${index}:`, (button as HTMLElement).id);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const tabId = (button as HTMLElement).id;
      console.log('SWADE HUD: Tab clicked:', tabId);

      // Handle different tab types
      switch (tabId) {
        case 'weapons-tab':
          console.log('SWADE HUD: Opening weapons panel');
          showWeaponsPanel(hudInstance);
          break;
        case 'traits-tab':
          console.log('SWADE HUD: Opening traits panel');
          showTraitsPanel(hudInstance);
          break;
        case 'edges-tab':
          console.log('SWADE HUD: Opening edges panel');
          showEdgesPanel(hudInstance);
          break;
        case 'actions-tab':
          console.log('SWADE HUD: Opening actions panel');
          showActionsPanel(hudInstance);
          break;
        case 'gear-tab':
          console.log('SWADE HUD: Opening gear panel');
          showGearPanel(hudInstance);
          break;
        case 'conditions-tab':
          console.log('SWADE HUD: Opening conditions panel');
          showConditionsPanel(hudInstance);
          break;
        case 'effects-tab':
          console.log('SWADE HUD: Opening effects panel');
          showEffectsPanel(hudInstance);
          break;
        case 'powers-tab':
          console.log('SWADE HUD: Opening powers panel');
          showPowersPanel(hudInstance);
          break;
        default:
          console.log('SWADE HUD: Unknown tab clicked:', tabId);
      }
    });
  });
}

// Panel display functions
function showWeaponsPanel(hudInstance: any) {
  console.log(
    'SWADE HUD: showWeaponsPanel called, actor:',
    hudInstance.actor?.name,
  );
  if (!hudInstance.actor) {
    console.log('SWADE HUD: No actor found, returning');
    return;
  }

  // Close existing weapons popout if open
  if (hudInstance.currentWeaponsPopout) {
    console.log('SWADE HUD: Closing existing weapons popout');
    hudInstance.currentWeaponsPopout.close();
    hudInstance.currentWeaponsPopout = null;
    return;
  }

  console.log('SWADE HUD: Creating new weapons popout');
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

  console.log('SWADE HUD: Weapons popout created, rendering...');
  hudInstance.currentWeaponsPopout = popout;
  popout
    .render(true)
    .then(() => {
      console.log('SWADE HUD: Weapons popout render complete');
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
  console.log(
    'SWADE HUD: showGearPanel called, actor:',
    hudInstance.actor?.name,
  );
  if (!hudInstance.actor) {
    console.log('SWADE HUD: No actor found, returning');
    return;
  }

  // Close existing gear popout if open
  if (hudInstance.currentGearPopout) {
    console.log('SWADE HUD: Closing existing gear popout');
    hudInstance.currentGearPopout.close();
    hudInstance.currentGearPopout = null;
    return;
  }

  console.log('SWADE HUD: Creating new gear popout');
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

  console.log('SWADE HUD: Gear popout created, rendering...');
  hudInstance.currentGearPopout = popout;
  popout
    .render(true)
    .then(() => {
      console.log('SWADE HUD: Gear popout render complete');
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
  statCircles.forEach((circle) => {
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
  bottomStats.forEach((stat) => {
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
  if (stat.classList.contains('swadehud-conviction-clickable')) {
    handleConvictionClick(stat, hudInstance);
  } else if (stat.classList.contains('swadehud-combat-toggle-clickable')) {
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
  if (stat.classList.contains('swadehud-conviction-clickable')) {
    handleConvictionRightClick(stat, hudInstance);
  } else if (stat.dataset.statPath) {
    // Handle bennies and other stats
    handleBennieRightClick(stat, hudInstance);
  }
}

function handleConvictionClick(stat: HTMLElement, hudInstance: any) {
  // Toggle conviction active state
  const isActive = stat.dataset.convictionActive === 'true';
  const newActiveState = !isActive;

  hudInstance.actor.update({
    'system.details.conviction.active': newActiveState,
  });
}

function handleConvictionRightClick(stat: HTMLElement, hudInstance: any) {
  // Increment conviction value
  const currentValue = parseInt(stat.dataset.convictionValue || '0');
  const newValue = currentValue + 1;

  hudInstance.actor.update({
    'system.details.conviction.value': newValue,
  });
}

function handleCombatToggleClick(stat: HTMLElement, hudInstance: any) {
  // Toggle combat state for the token
  if (hudInstance.token) {
    const isInCombat = stat.dataset.inCombat === 'true';
    const newCombatState = !isInCombat;

    // This would typically be handled by the combat system
    console.log('SWADE HUD: Toggle combat state to:', newCombatState);
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
    console.log('SWADE HUD: Soaking damage, current wounds:', currentWounds);

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

  console.log(
    'SWADE HUD: Toggling incapacitated state to:',
    newIncapacitatedState,
  );

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
