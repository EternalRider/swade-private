// Panel configuration constants for SWADE HUD panels
export const hudPanelDefaultSize = {
  width: 400,
  height: 500,
};

export const hudPanelConfig = {
  weapons: {
    template: 'systems/swade/templates/actors/hud/hud-weapons-panel.hbs',
    title: (actorName: string) => `${actorName} - Weapons`,
  },
  traits: {
    template: 'systems/swade/templates/actors/hud/hud-traits-panel.hbs',
    title: (actorName: string) => `${actorName} - Traits`,
  },
  edges: {
    template: 'systems/swade/templates/actors/hud/hud-edges-panel.hbs',
    title: (actorName: string) => `${actorName} - Edges & Hindrances`,
  },
  actions: {
    template: 'systems/swade/templates/actors/hud/hud-actions-panel.hbs',
    title: (actorName: string) => `${actorName} - Actions`,
  },
  gear: {
    template: 'systems/swade/templates/actors/hud/hud-gear-panel.hbs',
    title: (actorName: string) => `${actorName} - Gear`,
  },
  conditions: {
    template: 'systems/swade/templates/actors/hud/hud-conditions-panel.hbs',
    title: (actorName: string) => `${actorName} - Conditions`,
  },
  effects: {
    template: 'systems/swade/templates/actors/hud/hud-effects-panel.hbs',
    title: (actorName: string) => `${actorName} - Effects`,
  },
  powers: {
    template: 'systems/swade/templates/actors/hud/hud-powers-panel.hbs',
    title: (actorName: string) => `${actorName} - Powers`,
  },
};
