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
  try {
    registerSwadeHUDHelpers();

    await foundry.applications.handlebars.loadTemplates(SWADEHUD.templates);

    // Initialize description caching system
    initializeDescriptionCache();

    // Initialize template caching system for better performance
    await initializeTemplateCache();

    // Add HUD to global game object
    game.swade.hud = SWADEHUD;
  } catch (error) {
    // Error during HUD initialization
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
