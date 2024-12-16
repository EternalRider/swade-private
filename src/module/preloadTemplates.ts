/** @internal */
export async function preloadHandlebarsTemplates() {
  const templatePaths = {
    //NPC partials
    'swade.npc-attributes':
      'systems/swade/templates/actors/partials/attributes.hbs',
    'swade.npc-summary':
      'systems/swade/templates/actors/partials/npc-summary-tab.hbs',
    'swade.npc-powers':
      'systems/swade/templates/actors/partials/powers-tab.hbs',
    'swade.npc-setting': 'systems/swade/templates/setting-fields.hbs',
    'swade.npc-action-card':
      'systems/swade/templates/shared-partials/action-card.hbs',

    //Vehicle Partials
    'swade.vehicle-summary':
      'systems/swade/templates/actors/vehicle-partials/summary-tab.hbs',
    'swade.vehicle-cargo':
      'systems/swade/templates/actors/vehicle-partials/cargo-tab.hbs',
    'swade.vehicle-description':
      'systems/swade/templates/actors/vehicle-partials/description-tab.hbs',
    'swade.vehicle-vitals':
      'systems/swade/templates/actors/vehicle-partials/vitals.hbs',
    'swade.vehicle-crew':
      'systems/swade/templates/actors/vehicle-partials/crew-tab.hbs',

    //Gear Cards
    'swade.weapon-card':
      'systems/swade/templates/actors/partials/weapon-card.hbs',
    'swade.armor-card':
      'systems/swade/templates/actors/partials/armor-card.hbs',
    // TODO: Investigate if this is in use anywhere
    'swade.powers-card':
      'systems/swade/templates/actors/partials/powers-card.hbs',
    'swade.shield-card':
      'systems/swade/templates/actors/partials/shield-card.hbs',
    'swade.misc-card': 'systems/swade/templates/actors/partials/misc-card.hbs',
    'swade.consumable-card':
      'systems/swade/templates/actors/partials/consumable-card.hbs',

    // TODO: Investigate if this is in use anywhere
    //die type list
    'swade.die-sides': 'systems/swade/templates/die-sides-options.hbs',
    'swade.attribute-select': 'systems/swade/templates/attribute-select.hbs',
    // Chat
    'swade.roll-formula': 'systems/swade/templates/chat/roll-formula.hbs',

    //Items
    'swade.effect-list': 'systems/swade/templates/effect-list.hbs',

    //official sheet

    //tabs
    'swade.character-tab-summary':
      'systems/swade/templates/actors/character/tabs/summary.hbs',
    'swade.character-tab-edges':
      'systems/swade/templates/actors/character/tabs/edges.hbs',
    'swade.character-tab-effects':
      'systems/swade/templates/actors/character/tabs/effects.hbs',
    'swade.character-tab-inventory':
      'systems/swade/templates/actors/character/tabs/inventory.hbs',
    'swade.character-tab-powers':
      'systems/swade/templates/actors/character/tabs/powers.hbs',
    'swade.character-tab-actions':
      'systems/swade/templates/actors/character/tabs/actions.hbs',
    'swade.character-tab-about':
      'systems/swade/templates/actors/character/tabs/about.hbs',

    //misc partials
    'swade.character-attributes':
      'systems/swade/templates/actors/character/partials/attributes.hbs',
    'swade.character-item-card':
      'systems/swade/templates/actors/character/partials/item-card.hbs',
    'swade.character-skill-card':
      'systems/swade/templates/actors/character/partials/skill-card.hbs',
    'swade.character-setting-field':
      'systems/swade/templates/actors/character/partials/setting-fields.hbs',

    //Sidebar
    'swade.combat-tracker':
      'systems/swade/templates/sidebar/combat-tracker.hbs', // TODO: Investigate if this is in use anywhere
    'swade.combatant-details':
      'systems/swade/templates/sidebar/combatant-details.hbs',

    //Item V2
    'swade.item-header': 'systems/swade/templates/item/partials/header.hbs',
    'swade.item-additional-stats':
      'systems/swade/templates/item/partials/additional-stats.hbs',
    'swade.item-action-properties':
      'systems/swade/templates/item/partials/action-properties.hbs',
    'swade.item-bonus-damage':
      'systems/swade/templates/item/partials/bonus-damage.hbs',
    'swade.item-equipped': 'systems/swade/templates/item/partials/equipped.hbs',
    'swade.item-grants': 'systems/swade/templates/item/partials/grants.hbs',
    'swade.item-templates':
      'systems/swade/templates/item/partials/templates.hbs',
    'swade.item-tab-powers':
      'systems/swade/templates/item/partials/tabs/powers.hbs',
    'swade.item-tab-description':
      'systems/swade/templates/item/partials/tabs/description.hbs',
    'swade.item-tab-actions':
      'systems/swade/templates/item/partials/tabs/actions.hbs',
    'swade.item-tab-effects':
      'systems/swade/templates/item/partials/tabs/effects.hbs',
  };

  return loadTemplates(templatePaths);
}
