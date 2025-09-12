import SwadeActor from '../documents/actor/SwadeActor';

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
 * Usage: await getEnrichedDescription(item)
 * @param {object} item - The item object with .system.description
 * @returns {Promise<string>} The enriched HTML description
 */
export async function getEnrichedDescription(item: any) {
  if (!item) {
    return '';
  }
  // If already enriched, return cached value
  if (item._enrichedDescription) {
    return item._enrichedDescription;
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
