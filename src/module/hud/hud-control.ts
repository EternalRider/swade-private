import SwadeActorHUD from '../apps/SwadeActorHUD';

/**
 * Get the current HUD app instance
 */
export function getHudApp(): SwadeActorHUD | null {
  return (
    (foundry.applications.instances.get('swadehud') as SwadeActorHUD) || null
  );
}

/**
 * Hide the SWADE HUD
 */
export function hideSwadeHUD() {
  const hud = getHudApp();
  if (hud) {
    hud.close();
  }
}

/**
 * Check if an actor is a SWADE PC (player character)
 */
export function isSwadePC(token: any): boolean {
  if (!token?.actor) return false;

  // Check if it's a character or NPC type
  const actorType = token.actor.type;
  if (actorType !== 'character' && actorType !== 'npc') return false;

  // For characters, check if they have control
  if (actorType === 'character') {
    return token.actor.isOwner;
  }

  // For NPCs, check if GM or if NPC is owned
  return game.user?.isGM || token.actor.isOwner;
}

/**
 * Check if the current user can access a token
 */
export function canPlayerAccessToken(token: any): boolean {
  if (!token?.actor) return false;

  // GM can access everything
  if (game.user?.isGM) return true;

  // Players can access their own tokens
  return token.actor.isOwner;
}

/**
 * Handle SWADE HUD token control (show/hide)
 */
export async function handleSwadeHUDTokenControl(
  token: any,
  controlled: boolean,
  hudClass: typeof SwadeActorHUD,
) {
  // Only handle if it's a SWADE PC
  if (!isSwadePC(token) || !canPlayerAccessToken(token)) {
    return;
  }

  const currentHud = getHudApp();

  if (controlled) {
    // Token is being controlled - show HUD
    if (currentHud) {
      // If there's already a HUD, close it first
      await currentHud.close();
    }

    // Create new HUD for this token
    const hud = new hudClass({
      actor: token.actor,
      token: token.document,
    });

    await hud.render(true);
  } else {
    // Token is being uncontrolled - hide HUD if it belongs to this token
    if (currentHud && currentHud.token?.id === token.id) {
      await currentHud.close();
    }
  }
}

/**
 * Handle SWADE HUD token deletion
 */
export function handleSwadeHUDTokenDeleted(token: any) {
  const currentHud = getHudApp();

  // Close HUD if it belongs to the deleted token
  if (currentHud && currentHud.token?.id === token.id) {
    currentHud.close();
  }
}
