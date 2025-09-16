import SwadeActor from '../documents/actor/SwadeActor';

/**
 * Global cache for compiled Handlebars templates to improve rendering performance
 */
class TemplateCache {
  private compiledTemplates = new Map<string, HandlebarsTemplateDelegate>();
  private readonly templatePaths = [
    'systems/swade/templates/actors/hud/hud-actions-panel.hbs',
    'systems/swade/templates/actors/hud/hud-bio-panel.hbs',
    'systems/swade/templates/actors/hud/hud-character.hbs',
    'systems/swade/templates/actors/hud/hud-conditions-panel.hbs',
    'systems/swade/templates/actors/hud/hud-edges-panel.hbs',
    'systems/swade/templates/actors/hud/hud-effects-panel.hbs',
    'systems/swade/templates/actors/hud/hud-gear-panel.hbs',
    'systems/swade/templates/actors/hud/hud-powers-panel.hbs',
    'systems/swade/templates/actors/hud/hud-traits-panel.hbs',
    'systems/swade/templates/actors/hud/hud-weapons-panel.hbs',
  ];

  /**
   * Pre-compile and cache all HUD templates
   */
  async initialize(): Promise<void> {
    try {
      console.log('SWADE HUD: Pre-compiling HUD templates for performance...');

      // Load all template sources
      const templateSources =
        await foundry.applications.handlebars.loadTemplates(this.templatePaths);

      // Compile and cache each template
      for (const [path, source] of Object.entries(templateSources)) {
        try {
          const compiled = Handlebars.compile(source);
          this.compiledTemplates.set(path, compiled);
        } catch (error) {
          console.warn(`SWADE HUD: Failed to compile template ${path}:`, error);
        }
      }

      console.log(
        `SWADE HUD: Pre-compiled ${this.compiledTemplates.size} templates`,
      );
    } catch (error) {
      console.error('SWADE HUD: Failed to initialize template cache:', error);
    }
  }

  /**
   * Render a template using the cached compiled version if available
   */
  async render(templatePath: string, data: any = {}): Promise<string> {
    // Try cached template first
    const cachedTemplate = this.compiledTemplates.get(templatePath);
    if (cachedTemplate) {
      try {
        return cachedTemplate(data);
      } catch (error) {
        console.warn(
          `SWADE HUD: Cached template render failed for ${templatePath}, falling back to standard render:`,
          error,
        );
      }
    }

    // Fall back to standard Foundry renderTemplate
    return foundry.applications.handlebars.renderTemplate(templatePath, data);
  }

  /**
   * Check if a template is cached
   */
  has(templatePath: string): boolean {
    return this.compiledTemplates.has(templatePath);
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cachedCount: number;
    totalTemplates: number;
    cacheHitRate?: number;
  } {
    return {
      cachedCount: this.compiledTemplates.size,
      totalTemplates: this.templatePaths.length,
    };
  }

  /**
   * Clear the template cache
   */
  clear(): void {
    this.compiledTemplates.clear();
  }

  /**
   * Recompile a specific template (useful for development)
   */
  async recompile(templatePath: string): Promise<void> {
    try {
      const source = await foundry.applications.handlebars.loadTemplates([
        templatePath,
      ]);
      if (source[templatePath]) {
        const compiled = Handlebars.compile(source[templatePath]);
        this.compiledTemplates.set(templatePath, compiled);
      }
    } catch (error) {
      console.warn(
        `SWADE HUD: Failed to recompile template ${templatePath}:`,
        error,
      );
    }
  }
}

// Global template cache instance
const templateCache = new TemplateCache();

/**
 * Global cache for enriched descriptions to improve performance
 */
class DescriptionCache {
  private cache = new Map<string, { description: string; timestamp: number }>();
  private readonly maxSize = 500; // Maximum number of cached descriptions
  private readonly maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds

  /**
   * Generate a cache key for an item
   */
  private getCacheKey(item: any): string {
    if (!item?.id) return '';
    // Include modification timestamp to invalidate on updates
    const modTime =
      item._stats?.modified || item.system?._stats?.modified || Date.now();
    return `${item.id}_${modTime}`;
  }

  /**
   * Get cached description if available and not expired
   */
  get(item: any): string | null {
    const key = this.getCacheKey(item);
    if (!key) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return cached.description;
  }

  /**
   * Store description in cache
   */
  set(item: any, description: string): void {
    const key = this.getCacheKey(item);
    if (!key) return;

    // Clean up old entries if cache is getting too large
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      description,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove cache entry for an item
   */
  invalidate(item: any): void {
    const key = this.getCacheKey(item);
    if (key) {
      this.cache.delete(key);
    }
  }

  /**
   * Clean up expired and excess entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    // Find expired entries
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.maxAge) {
        keysToDelete.push(key);
      }
    }

    // Remove expired entries
    keysToDelete.forEach((key) => this.cache.delete(key));

    // If still too large, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, this.cache.size - this.maxSize + 50);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Global cache instance
const descriptionCache = new DescriptionCache();

// Export cache for external access (useful for debugging/testing)
export { descriptionCache };

/**
 * Clear the entire description cache
 * Useful for debugging or memory management
 */
export function clearDescriptionCache() {
  descriptionCache.clear();
}

/**
 * Get description cache statistics
 * Returns cache size and performance info
 */
export function getDescriptionCacheStats() {
  return descriptionCache.getStats();
}

/**
 * Manually invalidate cache for a specific item
 * Useful for debugging cache issues
 */
export function invalidateItemDescription(item: any) {
  descriptionCache.invalidate(item);
}

/**
 * Initialize template caching system
 * Should be called during system initialization
 */
export async function initializeTemplateCache(): Promise<void> {
  await templateCache.initialize();
}

/**
 * Render a template using cached compiled version if available
 * Falls back to standard Foundry renderTemplate if not cached
 */
export async function renderCachedTemplate(
  templatePath: string,
  data: any = {},
): Promise<string> {
  return templateCache.render(templatePath, data);
}

/**
 * Get template cache statistics
 */
export function getTemplateCacheStats() {
  return templateCache.getStats();
}

/**
 * Clear the template cache
 */
export function clearTemplateCache() {
  templateCache.clear();
}

/**
 * Recompile a specific template (useful for development)
 */
export async function recompileTemplate(templatePath: string): Promise<void> {
  await templateCache.recompile(templatePath);
}

/**
 * Initialize cache invalidation hooks
 * Should be called during system initialization
 */
export function initializeDescriptionCache() {
  // Listen for item updates to invalidate cache
  Hooks.on('updateItem', (item: any, changes: any) => {
    // Invalidate cache if description or name changed
    if (
      changes.system?.description !== undefined ||
      changes.name !== undefined
    ) {
      descriptionCache.invalidate(item);
    }
  });

  // Listen for actor updates that might affect items
  Hooks.on('updateActor', (actor: any, changes: any) => {
    // If actor items were updated, clear cache for all items
    if (changes.items) {
      // Clear entire cache as we can't easily track which specific items changed
      descriptionCache.clear();
    }
  });

  // Clear cache when world is loaded (in case of hot reloads)
  Hooks.on('ready', () => {
    // Optional: Clear cache on world ready to ensure fresh state
    descriptionCache.clear();
  });
}

/**
 * Sorts an array of items by their localized names alphabetically
 * @param {Array} items - Array of items
 * @param {Function} nameGetter - Function to get the name from each item
 * @returns {Array} Sorted array
 */
export const sortByLocalizedName = (
  items: any[],
  nameGetter = (item: any) => item.name || item.id,
) => {
  return items.sort((a: any, b: any) => {
    const nameA = game.i18n.localize(nameGetter(a));
    const nameB = game.i18n.localize(nameGetter(b));
    return nameA.localeCompare(nameB);
  });
};

/**
 * Lazily enriches and caches the description for an item.
 * Uses global cache for better performance across renders.
 * Usage: await getEnrichedDescription(item)
 * @param {object} item - The item object with .system.description
 * @returns {Promise<string>} The enriched HTML description
 */
export async function getEnrichedDescription(item: any) {
  if (!item) {
    return '';
  }

  // Check global cache first
  const cached = descriptionCache.get(item);
  if (cached !== null) {
    return cached;
  }

  const raw = item.system?.description ?? '';
  let enriched = raw;

  try {
    if (
      foundry.applications.ux.TextEditor.implementation &&
      typeof foundry.applications.ux.TextEditor.implementation.enrichHTML ===
        'function'
    ) {
      enriched =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          raw,
          {},
        );
    } else if (
      window.TextEditor &&
      typeof window.TextEditor.enrichHTML === 'function'
    ) {
      enriched = await window.TextEditor.enrichHTML(raw, {});
    } else {
      console.warn('SWADE HUD: No TextEditor.enrichHTML function found');
    }
  } catch (error) {
    console.error('SWADE HUD: Error during enrichment:', error);
  }

  // Store in global cache
  descriptionCache.set(item, enriched);

  // Also store on item for backward compatibility
  item._enrichedDescription = enriched;

  return enriched;
}

/**
 * Prepares context for SWADE HUD templates.
 * @param {SwadeActor} actor
 * @param {TokenDocument} token
 * @returns {Promise<object>}
 */
export async function prepareHudContext(actor: SwadeActor | null, token: any) {
  if (!actor) return {};

  const context = {
    actor: actor, // Include the full actor object for template compatibility
    actorName: actor.name,
    portrait: actor.img,
    system: actor.system,
    token: token,
    isGM: game.user?.isGM,
    canEdit: actor.isOwner,

    // Character info
    attributes: actor.system.attributes,
    skills: sortByLocalizedName(
      actor.items.filter((i: any) => i.type === 'skill'),
    ),
    edges: sortByLocalizedName(
      actor.items.filter((i: any) => i.type === 'edge'),
    ),
    hindrances: sortByLocalizedName(
      actor.items.filter((i: any) => i.type === 'hindrance'),
    ),
    weapons: sortByLocalizedName(
      actor.items.filter((i: any) => i.type === 'weapon'),
    ),
    armor: sortByLocalizedName(
      actor.items.filter((i: any) => i.type === 'armor'),
    ),
    gear: sortByLocalizedName(
      actor.items.filter((i: any) => i.type === 'gear'),
    ),
    powers: sortByLocalizedName(
      actor.items.filter((i: any) => i.type === 'power'),
    ),
    actions: sortByLocalizedName(
      actor.items.filter((i: any) => i.type === 'action'),
    ),

    // Status effects
    effects: actor.effects,
    conditions: actor.statuses,

    // Combat stats
    wounds: actor.system.wounds,
    fatigue: actor.system.fatigue,
    bennies: actor.system.bennies,

    // Pace info
    pace: actor.system.pace,
    runningDie: actor.system.pace.runningDie,

    // Conviction
    conviction: actor.system.conviction,

    // Power points
    powerPoints: actor.system.powerPoints,

    // Encumbrance
    encumbrance: actor.system.encumbrance,

    // Wildcard status
    isWildcard: actor.isWildcard,

    // Configuration
    config: CONFIG.SWADE,
  };

  return context;
}
