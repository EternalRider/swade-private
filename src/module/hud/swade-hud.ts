import SwadeActorHUD from '../apps/SwadeActorHUD';
import { registerSwadeHUDHelpers } from '../hud/hud-handlebars-helpers';
import {
  initializeDescriptionCache,
  initializeTemplateCache,
  clearDescriptionCache,
  getDescriptionCacheStats,
  clearTemplateCache,
  getTemplateCacheStats,
  getEnrichedDescription,
} from '../hud/hud-context';
import {
  handleSwadeHUDTokenControl,
  handleSwadeHUDTokenDeleted,
  getHudApp,
  hideSwadeHUD,
  isSwadePC,
  canPlayerAccessToken,
} from '../hud/hud-control';

/**
 * List of Handlebars template paths used by the SWADE HUD system.
 * @type {string[]}
 */
const templatePaths = ['systems/swade/templates/apps/hud-character.hbs'];

/**
 * Main SWADE HUD configuration object.
 * @property {string} ID - The module ID for the HUD system.
 * @property {string[]} templates - List of template paths used by the HUD.
 * @property {typeof SwadeActorHUD} SwadeActorHUD - The HUD application class.
 */
export const swadeHud = {
  ID: 'swade-hud',
  templates: templatePaths,
  SwadeActorHUD,
};

/**
 * Initializes the SWADE HUD system and its caches.
 * Registers Handlebars helpers, loads templates, and sets up caches.
 * Adds the HUD to the global game object.
 * @function
 */
Hooks.once('init', async function () {
  try {
    registerSwadeHUDHelpers();

    await foundry.applications.handlebars.loadTemplates(swadeHud.templates);

    // Initialize description caching system
    initializeDescriptionCache();

    // Initialize template caching system for better performance
    await initializeTemplateCache();

    // Add HUD to global game object
    game.swade.hud = swadeHud;
  } catch (error) {
    // Error during HUD initialization
  }
});

/**
 * Sets up canvas interaction hooks for the SWADE HUD.
 * Handles right-click events on tokens to show the HUD.
 * @function
 */
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

/**
 * Handles token control changes for the SWADE HUD.
 * Only shows HUD on right-click, not left-click.
 * @function
 * @param {any} token - The token being controlled.
 * @param {boolean} controlled - Whether the token is controlled.
 */
Hooks.on('controlToken', async (token: any, controlled: boolean) => {
  // Only handle left-click controls (don't show HUD on left-click)
  if (controlled && isSwadePC(token)) {
    // Don't show HUD on left-click, let right-click handler do it
    return;
  }
  await handleSwadeHUDTokenControl(token, controlled, SwadeActorHUD);
});

/**
 * Handles token deletion events for the SWADE HUD.
 * Cleans up HUD state when a token is deleted.
 * @function
 * @param {any} token - The token being deleted.
 */
Hooks.on('deleteToken', (token: any) => {
  handleSwadeHUDTokenDeleted(token);
});

/**
 * Adds console commands and cache utility functions for debugging HUD and cache performance.
 * @function
 */
Hooks.once('ready', () => {
  // Add console commands for easy access
  (window as any).toggleSwadeHUD = () => {
    const hud = getHudApp();
    if (hud) {
      hud.close();
    }
  };

  (window as any).hideSwadeHUD = hideSwadeHUD;

  // Add cache utility functions for debugging
  (window as any).clearDescriptionCache = clearDescriptionCache;
  (window as any).getDescriptionCacheStats = getDescriptionCacheStats;

  // Add template cache utility functions for debugging
  (window as any).clearTemplateCache = clearTemplateCache;
  (window as any).getTemplateCacheStats = getTemplateCacheStats;

  // Add cache performance test function
  (window as any).testDescriptionCache = async () => {
    const { descriptionCache } = await import('../hud/hud-context');
    const stats = descriptionCache.getStats();
    console.log('Description Cache Stats:', stats);

    // Test cache performance with a sample item
    const testItem = {
      id: 'test-item',
      system: {
        description:
          '<p>This is a test description with <strong>bold</strong> text.</p>',
        _stats: { modified: Date.now() },
      },
    };

    console.time('First enrichment (cache miss)');
    const desc1 = await getEnrichedDescription(testItem);
    console.timeEnd('First enrichment (cache miss)');

    console.time('Second enrichment (cache hit)');
    const desc2 = await getEnrichedDescription(testItem);
    console.timeEnd('Second enrichment (cache hit)');

    console.log('Descriptions match:', desc1 === desc2);
    console.log('Cache stats after test:', descriptionCache.getStats());

    return 'Cache test completed - check console for results';
  };
});
