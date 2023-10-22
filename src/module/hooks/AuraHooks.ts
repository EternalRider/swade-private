import { AuraPointSource } from '../canvas/AuraPointSource';
import SwadeToken from '../canvas/SwadeToken';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';

export function registerAuraHooks() {
  Hooks.on('canvasInit', () => {
    CONFIG.Canvas.auras = {
      collection: new foundry.utils.Collection<AuraPointSource>(),
      filter: VisualEffectsMaskingFilter.create({
        filterMode: VisualEffectsMaskingFilter.FILTER_MODES.BACKGROUND,
        uVisionSampler: canvas.masks.vision.renderTexture,
      }),
    };
  });

  Hooks.on('drawGridLayer', (layer: GridLayer) => {
    layer.auras = layer.addChildAt(
      new PIXI.Container(),
      layer.getChildIndex(layer.borders),
    );
    layer.auras.filters = [CONFIG.Canvas.auras.filter];
    canvas.effects.visualEffectsMaskingFilters.add(CONFIG.Canvas.auras.filter);
  });

  Hooks.on('tearDownGridLayer', (_layer: GridLayer) => {
    canvas.effects.visualEffectsMaskingFilters.delete(
      CONFIG.Canvas.auras.filter,
    );
  });

  Hooks.on('drawToken', (token: SwadeToken) => {
    addAuras(token);
    updateAurasForToken(token);
  });

  Hooks.on('updateToken', (doc: TokenDocument, changes: any) => {
    if (!doc.rendered) return;
    const keys = ['x', 'y', 'disposition'];
    if (keys.some((key) => foundry.utils.hasProperty(changes, key))) {
      updateAurasForToken(doc.object as SwadeToken);
    }
  });

  Hooks.on('destroyToken', (token: SwadeToken) => {
    token.auras.forEach((aura) => {
      aura.destroy();
      CONFIG.Canvas.auras.collection.delete(aura.sourceId);
    });
    token.auras.clear();
  });

  Hooks.on('updateActiveEffect', (effect: SwadeActiveEffect) => {
    if (!game.canvas.ready) return;
    if (effect.changes.some((e) => e.key.startsWith('flags.swade.auras'))) {
      effect.actor?.getActiveTokens().forEach((t) => addAuras(t));
      updateAllAuras();
    }
  });

  Hooks.on('initializeLightSources', () => updateAllAuras());
  Hooks.on('controlToken', () => updateAllAuras());
  Hooks.on('hoverToken', () => updateAllAuras());
  Hooks.on('refreshToken', (token: SwadeToken) => {
    game.settings.get('core', 'visionAnimation')
      ? updateAurasForToken(token)
      : refreshAuras();
  });
}

function addAuras(token: SwadeToken) {
  if (!token.actor) return missingActorMsg(token);
  for (const id in token.actor.auras) {
    if (token.auras.has(id)) continue;
    token.auras.set(id, new AuraPointSource({ object: token, id }));
  }
}

function updateAllAuras() {
  for (const token of canvas.tokens.placeables) {
    updateAurasForToken(token);
  }
}

function updateAurasForToken(token: SwadeToken) {
  if (!token.actor) {
    Array.from(token.auras.entries()).forEach(([id, aura]) => {
      removeAura(token, aura, id);
    });
    return missingActorMsg(token);
  }
  const origin = token.getMovementAdjustedPoint(token.center);
  const auraData = token.actor.auras;
  for (const [id, aura] of token.auras.entries()) {
    const data = auraData[id];
    if (!data) {
      removeAura(token, aura, id);
      continue;
    }
    const { externalRadius } = token;
    aura.initialize({
      x: origin.x,
      y: origin.y,
      disabled: !data.enabled,
      radius: canvas.dimensions?.size * data.radius + externalRadius,
      externalRadius: externalRadius,
      rotation: token.document.rotation,
      preview: token.isPreview,
      walls: data.walls,
    });

    CONFIG.Canvas.auras.collection.set(aura.sourceId, aura);
  }
  refreshAuras();
}

function refreshAuras() {
  canvas.grid?.auras?.removeChildren();
  for (const aura of CONFIG.Canvas.auras.collection) {
    if (!aura.active) continue;
    canvas.grid?.auras?.addChild(aura.graphics);
  }
}

function removeAura(token: SwadeToken, aura: AuraPointSource, id: string) {
  CONFIG.Canvas.auras.collection.delete(aura.sourceId);
  aura.destroy();
  token.auras.delete(id);
}

function missingActorMsg(token: SwadeToken) {
  console.warn(`Token ${token.name} (${token.document.uuid}) has no actor!`);
}
