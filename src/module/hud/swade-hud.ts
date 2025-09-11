import SwadeActorHUD from '../apps/SwadeActorHUD';
import { registerSwadeHUDHelpers } from '../hud/hud-handlebars-helpers';
import {
  handleSwadeHUDTokenControl,
  handleSwadeHUDTokenDeleted,
  getHudApp,
  hideSwadeHUD,
  isSwadePC,
  canPlayerAccessToken,
} from '../hud/hud-control';

// eslint-disable-next-line @typescript-eslint/naming-convention
const TEMPLATE_PATHS = ['systems/swade/templates/apps/hud-character.hbs'];

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SWADEHUD = {
  ID: 'swade-hud',
  templates: TEMPLATE_PATHS,
  SwadeActorHUD,
};

// Initialize HUD system
Hooks.once('init', async function () {
  console.log('SWADE HUD: Initializing HUD system...');

  try {
    registerSwadeHUDHelpers();
    console.log('SWADE HUD: Handlebars helpers registered');

    await foundry.applications.handlebars.loadTemplates(SWADEHUD.templates);
    console.log('SWADE HUD: Templates loaded successfully');

    // Add HUD to global game object
    game.swade.hud = SWADEHUD;
    console.log(
      'SWADE HUD: HUD system initialized and added to game.swade.hud',
    );
  } catch (error) {
    console.error('SWADE HUD: Error during initialization:', error);
  }
});

// Set up canvas interaction hooks
Hooks.once('canvasReady', () => {
  // Listen for right-click on tokens to show HUD
  canvas.stage.on('rightdown', (event: any) => {
    const token = canvas.tokens.placeables.find((t: any) => {
      const bounds = t.getBounds();
      return bounds.contains(event.data.global.x, event.data.global.y);
    });

    if (token && isSwadePC(token) && canPlayerAccessToken(token)) {
      // Prevent default context menu
      event.data.originalEvent.preventDefault();

      // Show HUD for this token
      handleSwadeHUDTokenControl(token, true, SwadeActorHUD);
    }
  });
});

// Handle token control changes
Hooks.on('controlToken', async (token: any, controlled: boolean) => {
  // Only handle left-click controls (don't show HUD on left-click)
  if (controlled && isSwadePC(token)) {
    // Don't show HUD on left-click, let right-click handler do it
    return;
  }
  await handleSwadeHUDTokenControl(token, controlled, SwadeActorHUD);
});

// Handle token deletion
Hooks.on('deleteToken', (token: any) => {
  handleSwadeHUDTokenDeleted(token);
});

// Add console commands for easy access
Hooks.once('ready', () => {
  // Add console commands for easy access
  (window as any).toggleSwadeHUD = () => {
    const hud = getHudApp();
    if (hud) {
      hud.close();
    } else {
      console.log('No active HUD to toggle');
    }
  };

  (window as any).hideSwadeHUD = hideSwadeHUD;

  console.info(
    'SWADE HUD system loaded. Use toggleSwadeHUD() or hideSwadeHUD() in console.',
  );
});
