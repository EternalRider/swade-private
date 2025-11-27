import SwadeActorHUD from '../apps/SwadeActorHUD';
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
  handleSwadeHUDTokenDeleted,
  getHudApp,
  hideSwadeHUD,
  isSwadePC,
  switchHudToToken,
  toggleSwadeHUD,
} from '../hud/hud-control';

/**
 * List of Handlebars template paths used by the SWADE HUD system.
 * @type {string[]}
 */
const templatePaths = ['systems/swade/templates/actors/hud/hud-character.hbs'];

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
    await foundry.applications.handlebars.loadTemplates(swadeHud.templates);

    // Initialize description caching system
    initializeDescriptionCache();

    // Initialize template caching system for better performance
    await initializeTemplateCache();

    // Add HUD to global game object
    game.swade.hud = swadeHud;
  } catch (error) {
    console.error('SWADE HUD: Error during initialization:', error);
  }
});

/**
 * Sets up canvas interaction hooks for the SWADE HUD.
 * Handles right-click events on tokens to show the HUD.
 * @function
 */
Hooks.once('canvasReady', () => {
  // Right-click functionality removed in favor of keybinds and macros
});

/**
 * Handles token control changes for the SWADE HUD.
 * Implements multi-token support - keeps HUD open when switching between controlled tokens.
 * @function
 * @param {any} token - The token being controlled.
 * @param {boolean} controlled - Whether the token is controlled.
 */
// The project's fvtt typings mark Hooks.on as deprecated; this usage is intentional and
// compatible with the runtime Foundry API. Suppress the deprecation lint for this hook.
// eslint-disable-next-line deprecation/deprecation
Hooks.on('controlToken', async (token: any, controlled: boolean) => {
  try {
    if (!isSwadePC(token)) return;

    if (controlled) {
      // Token is being controlled - only switch if HUD is already open
      if (getHudApp()) {
        // HUD is already open, switch to this token
        await switchHudToToken(token);
      }
      // Don't open HUD automatically on token selection
    }

    // After any token control change, check if HUD should be closed
    setTimeout(() => {
      const controlledTokens = canvas.tokens?.controlled || [];
      const swadeControlledTokens = controlledTokens.filter((t: any) =>
        isSwadePC(t),
      );

      if (swadeControlledTokens.length === 0 && getHudApp()) {
        // No more controlled SWADE tokens, close HUD
        hideSwadeHUD();
      }
    }, 10);
  } catch (error) {
    console.error('SWADE HUD: Error handling token control:', error);
  }
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
  (window as any).toggleSwadeHUD = toggleSwadeHUD;
  (window as any).toggleSwadeHUDProper = toggleSwadeHUD;

  (window as any).hideSwadeHUD = hideSwadeHUD;

  // Expose the proper toggle function for macros and keybindings
  (window as any).toggleSwadeHUDProper = toggleSwadeHUD;

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
