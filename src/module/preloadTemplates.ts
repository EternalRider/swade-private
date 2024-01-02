/** @internal */
export async function preloadHandlebarsTemplates() {
  const templatePaths = [
    //NPC partials
    'systems/swade/templates/actors/partials/attributes.hbs',
    'systems/swade/templates/actors/partials/npc-summary-tab.hbs',
    'systems/swade/templates/actors/partials/powers-tab.hbs',
    'systems/swade/templates/setting-fields.hbs',
    'systems/swade/templates/shared-partials/action-card.hbs',

    //Vehicle Partials
    'systems/swade/templates/actors/vehicle-partials/summary-tab.hbs',
    'systems/swade/templates/actors/vehicle-partials/cargo-tab.hbs',
    'systems/swade/templates/actors/vehicle-partials/description-tab.hbs',
    'systems/swade/templates/actors/vehicle-partials/vitals.hbs',
    'systems/swade/templates/actors/vehicle-partials/crew-tab.hbs',

    //Gear Cards
    'systems/swade/templates/actors/partials/weapon-card.hbs',
    'systems/swade/templates/actors/partials/armor-card.hbs',
    'systems/swade/templates/actors/partials/powers-card.hbs',
    'systems/swade/templates/actors/partials/shield-card.hbs',
    'systems/swade/templates/actors/partials/misc-card.hbs',
    'systems/swade/templates/actors/partials/consumable-card.hbs',

    //die type list
    'systems/swade/templates/die-sides-options.hbs',
    'systems/swade/templates/attribute-select.hbs',

    // Chat
    'systems/swade/templates/chat/roll-formula.hbs',

    //Items
    'systems/swade/templates/effect-list.hbs',

    //official sheet

    //tabs
    'systems/swade/templates/actors/character/tabs/summary.hbs',
    'systems/swade/templates/actors/character/tabs/edges.hbs',
    'systems/swade/templates/actors/character/tabs/effects.hbs',
    'systems/swade/templates/actors/character/tabs/inventory.hbs',
    'systems/swade/templates/actors/character/tabs/powers.hbs',
    'systems/swade/templates/actors/character/tabs/actions.hbs',
    'systems/swade/templates/actors/character/tabs/about.hbs',

    //misc partials
    'systems/swade/templates/actors/character/partials/attributes.hbs',
    'systems/swade/templates/actors/character/partials/item-card.hbs',
    'systems/swade/templates/actors/character/partials/skill-card.hbs',
    'systems/swade/templates/actors/character/partials/setting-fields.hbs',

    //Sidebar
    'systems/swade/templates/sidebar/combat-tracker.hbs',

    //Item V2
    'systems/swade/templates/item/partials/header.hbs',
    'systems/swade/templates/item/partials/additional-stats.hbs',
    'systems/swade/templates/item/partials/action-properties.hbs',
    'systems/swade/templates/item/partials/bonus-damage.hbs',
    'systems/swade/templates/item/partials/equipped.hbs',
    'systems/swade/templates/item/partials/grants.hbs',
    'systems/swade/templates/item/partials/templates.hbs',
    'systems/swade/templates/item/partials/tabs/powers.hbs',
    'systems/swade/templates/item/partials/tabs/description.hbs',
    'systems/swade/templates/item/partials/tabs/actions.hbs',
    'systems/swade/templates/item/partials/tabs/effects.hbs',
  ];

  return loadTemplates(templatePaths);
}
