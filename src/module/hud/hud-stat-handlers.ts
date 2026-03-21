/**
 * Shared HUD stat handler for SWADE HUD and popout.
 * Attaches all stat click/contextmenu handlers for bennies, conviction, pace, power points, etc.
 * @param {HTMLElement} element - The HUD element to attach handlers to.
 * @param {HTMLElement} element - The HUD element to attach handlers to.
 * @param {any} actor - The actor associated with the HUD.
 * @param {(() => void) | null} [onUpdate=null] - Optional callback for stat updates.
 * @param {HUDToken | null} [token=null] - Optional token reference for combat toggles.
 */
import { HUDToken } from '../../types/HUD';

import { DamageRoll } from '../dice/DamageRoll';
import SwadeChatMessage from '../documents/chat/SwadeChatMessage';

// WeakMap to store event handlers for elements to prevent duplicates
const elementHandlers = new WeakMap<
  HTMLElement,
  {
    click?: (event: MouseEvent) => void;
    auxclick?: (event: MouseEvent) => void;
    contextmenu?: (event: MouseEvent) => void;
  }
>();

export function setupHudStatHandlers(
  element: HTMLElement,
  actor: any,
  onUpdate: (() => void) | null = null,
  token: HUDToken | null = null
) {
  if (!element || !actor) return;

  // Effect dragging support (for .swadehud-effect elements)
  const effectElements = element.querySelectorAll('.swadehud-effect');
  // Event delegation for dynamically added effects
  element.addEventListener('dragstart', (event: DragEvent) => {
    const effectEl = (event.target as HTMLElement)?.closest?.('.swadehud-effect');
    if (!effectEl) return;
    const effectId = (effectEl as HTMLElement).dataset.effectId;
    const itemId = (effectEl as HTMLElement).dataset.itemId;
    if (!effectId || !itemId || !actor) return;
    const item = actor.getOwnedItem ? actor.getOwnedItem(itemId) : actor.items?.get?.(itemId);
    if (!item) return;
    const effect = item.effects?.get?.(effectId);
    if (!effect) return;
    // Set up the drag data for Foundry's effect transfer
    const dragData = {
      type: 'ActiveEffect',
      uuid: effect.uuid,
    };
    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
    event.dataTransfer!.effectAllowed = 'copy';
  });
  // Attach direct listeners as backup (for static elements)
  effectElements.forEach((effectEl) => {
    effectEl.addEventListener('dragstart', (_event) => {
      // No-op: main handling is through delegation above
    });
  });

  // Combat Toggle (use the token reference passed from the HUD)
  const combatToggleBtn = element.querySelector('.swadehud-combat-toggle-clickable');
  if (combatToggleBtn && actor) {
    combatToggleBtn.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Use provided token if it has the toggle method, otherwise attempt to
      // find a matching token on the canvas (prefer a controlled token).
      let tokenToUse: any = token;

      const hasToggle = (t: any) => t && typeof t.toggleCombatant === 'function';

      if (!hasToggle(tokenToUse)) {
        try {
          // Prefer a controlled token for this actor
          const controlledTokens = (canvas?.tokens?.controlled as any[]) || [];
          const controlledMatch = controlledTokens.find((t: any) => t?.actor?.id === actor.id);
          if (controlledMatch) tokenToUse = controlledMatch;

          // If no controlled token, fall back to any placeable token for this actor
          if (!hasToggle(tokenToUse)) {
            const placeables = (canvas?.tokens?.placeables as any[]) || [];
            const placeableMatch = placeables.find((t: any) => t?.actor?.id === actor.id);
            if (placeableMatch) tokenToUse = placeableMatch;
          }

          // If the TokenDocument exposes toggleCombatant (some Foundry APIs), prefer that
          if (
            !hasToggle(tokenToUse) &&
            tokenToUse?.document &&
            typeof tokenToUse.document.toggleCombatant === 'function'
          ) {
            tokenToUse = tokenToUse.document;
          }
        } catch (err) {
          // ignore canvas access errors
          console.warn('HUD combat toggle: canvas token lookup failed', err);
        }
      }

      if (hasToggle(tokenToUse)) {
        try {
          await tokenToUse.toggleCombatant();
          if (onUpdate) onUpdate();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          ui.notifications?.error('Failed to toggle combat state');
        }
      } else {
        ui.notifications?.error(
          'No valid token reference for this HUD. Please open the HUD from a token on the canvas.'
        );
      }
    });
  }
  if (!element || !actor) return;

  // Soak (open dialog, roll, whisper, trigger applyDamage, clean up)
  const soakBtn = element.querySelector('.swadehud-soak-clickable');
  if (soakBtn && actor) {
    soakBtn.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        // Create a simple damage input dialog
        const content = `
        <form>
          <div style="margin-bottom: 10px;">
            <label for="damage" style="display: block; margin-bottom: 5px; color: #fff;">Damage:</label>
            <input type="number" id="damage" name="damage" value="0" min="0" style="width: 100%; padding: 5px; background: #333; border: 1px solid #666; color: #fff; border-radius: 3px;">
          </div>
          <div style="margin-bottom: 10px;">
            <label for="ap" style="display: block; margin-bottom: 5px; color: #fff;">Armor Piercing (AP):</label>
            <input type="number" id="ap" name="ap" value="0" min="0" style="width: 100%; padding: 5px; background: #333; border: 1px solid #666; color: #fff; border-radius: 3px;">
          </div>
        </form>
      `;
        const dialogClass = foundry.applications?.api?.DialogV2 || window.Dialog;
        const dialog = new dialogClass({
          window: { title: 'Soak' },
          content: content,
          buttons: [
            {
              action: 'apply',
              label: 'Soak',
              icon: '<i class="fas fa-shield-halved"></i>',
              default: true,
              callback: async (_event: any, button: any) => {
                const form = button.form;
                const damage = Number(form.querySelector('#damage').value) || 0;
                const ap = Number(form.querySelector('#ap').value) || 0;
                if (damage > 0) {
                  try {
                    // Use the correct SWADE method: actor.rollDamage (not dmgRoll)
                    if (typeof actor.rollDamage === 'function') {
                      await actor.rollDamage({
                        damage: damage,
                        ap: ap,
                        whisper: [game.user.id],
                      });
                    } else {
                      // Fallback to manual DamageRoll if rollDamage is unavailable
                      const damageRoll = new DamageRoll(
                        `${damage}`,
                        {},
                        {
                          ap: ap,
                          isHeavyWeapon: false,
                        }
                      );
                      await damageRoll.evaluate();
                      const chatMessage = await SwadeChatMessage.create({
                        content: `Rolling damage from HUD: ${damage}${ap > 0 ? ` (AP ${ap})` : ''}`,
                        speaker: { actor: actor },
                        rolls: [damageRoll],
                        whisper: [game.user.id],
                      });
                      // Programmatically click Apply Damage button
                      setTimeout(async () => {
                        if (chatMessage) {
                          const messageElement = document.querySelector(`[data-message-id="${chatMessage.id}"]`);
                          if (messageElement) {
                            const damageButton = messageElement.querySelector('.calculate-wounds');
                            if (damageButton) {
                              // Find the token on the canvas
                              const actorToken = canvas?.tokens?.placeables?.find((t: any) => t.actor?.id === actor.id);
                              // Foundry Token API: must be instance of Token and have control
                              if (
                                actorToken &&
                                (actorToken as any).constructor?.name === 'Token' &&
                                typeof (actorToken as any).control === 'function' &&
                                !(actorToken as any).controlled
                              ) {
                                await (actorToken as any).control({
                                  releaseOthers: false,
                                });
                              }
                              const clickEvent = new MouseEvent('click', {
                                bubbles: true,
                                cancelable: true,
                                view: window,
                              });
                              damageButton.dispatchEvent(clickEvent);
                              setTimeout(() => {
                                if (typeof chatMessage.delete === 'function') chatMessage.delete();
                              }, 1000);
                            }
                          }
                        }
                      }, 100);
                    }
                  } catch (error) {
                    ui.notifications?.error(
                      'Failed to roll damage. Please ensure SWADE system is active and properly loaded.'
                    );
                    console.error('HUD soak error:', error);
                  }
                }
              },
            },
            {
              action: 'cancel',
              label: 'Cancel',
              callback: () => {},
            },
          ],
          modal: true,
        });
        // dialog.render is intentionally used for compatibility with Foundry's Application API.
        dialog.render(true);
      } catch (error) {
        ui.notifications?.error('Failed to open soak dialog.');
        console.error('HUD soak dialog error:', error);
      }
    });
  }

  // Incapacitated
  const incapBtn = element.querySelector('.swadehud-incapacitated-clickable');
  if (incapBtn) {
    incapBtn.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (typeof actor.toggleStatusEffect === 'function') await actor.toggleStatusEffect('incapacitated');
        if (onUpdate) onUpdate();
      } catch (error) {
        ui.notifications?.error('Failed to toggle incapacitated status.');
        console.error('HUD incapacitated error:', error);
      }
    });
  }

  // Power Points (all arcane types)
  const ppIndicators = element.querySelectorAll('.swadehud-pp-indicator.swadehud-stat-clickable');
  const powerPointsRaw = actor?.system?.powerPoints || {};
  ppIndicators.forEach((el) => {
    let statPath = (el as HTMLElement).getAttribute('data-stat-path');
    const min = Number((el as HTMLElement).getAttribute('data-stat-min')) || 0;
    const maxAttr = (el as HTMLElement).getAttribute('data-stat-max');
    const max = maxAttr !== null ? Number(maxAttr) : null;
    if (statPath && statPath.startsWith('system.powerPoints.')) {
      const parts = statPath.split('.');
      if (parts.length >= 4) {
        const arcaneFromTemplate = parts[2];
        // Find the real key in actor data (case-insensitive)
        const realArcaneKey =
          Object.keys(powerPointsRaw).find((k) => k.toLowerCase() === arcaneFromTemplate.toLowerCase()) ||
          arcaneFromTemplate;
        parts[2] = realArcaneKey;
        statPath = parts.join('.');
      }
    }
    if (statPath) setupAddSubtractClicks(el as HTMLElement, actor, statPath, min, max, onUpdate);
  });

  // Bennies
  const bennyStat = element.querySelector('[data-stat-path="system.bennies.value"]');
  if (bennyStat) setupAddSubtractClicks(bennyStat as HTMLElement, actor, 'system.bennies.value', 0, null, onUpdate);

  // Conviction
  const convictionStat = element.querySelector('.swadehud-conviction-clickable');
  if (convictionStat) {
    const starIcon = convictionStat.querySelector('.swadehud-bottomstat__icon i');
    if (starIcon) {
      // Remove existing handler if present
      const existingHandlers = elementHandlers.get(starIcon as HTMLElement);
      if (existingHandlers?.click) {
        starIcon.removeEventListener('click', existingHandlers.click);
      }

      const clickHandler = async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (typeof actor.toggleConviction === 'function') await actor.toggleConviction();
        } catch (error) {
          ui.notifications?.error('Failed to toggle conviction.');
          console.error('HUD conviction error:', error);
        }
      };

      starIcon.addEventListener('click', clickHandler);

      // Store the handler in WeakMap
      elementHandlers.set(starIcon as HTMLElement, {
        ...elementHandlers.get(starIcon as HTMLElement),
        click: clickHandler,
      });
    }
    const valueSpan = convictionStat.querySelector('.swadehud-bottomstat__value');
    if (valueSpan) {
      // Remove existing handlers if present
      const existingHandlers = elementHandlers.get(valueSpan as HTMLElement);
      if (existingHandlers?.click) {
        valueSpan.removeEventListener('click', existingHandlers.click);
      }
      if (existingHandlers?.auxclick) {
        valueSpan.removeEventListener('auxclick', existingHandlers.auxclick);
      }

      // Left click: increment conviction
      const clickHandler = async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const statPath = 'system.details.conviction.value';
          const currentValue = getNestedProperty(actor, statPath) || 0;
          await actor.update({ [statPath]: currentValue + 1 });
        } catch (error) {
          ui.notifications?.error('Failed to increment conviction.');
          console.error('HUD conviction increment error:', error);
        }
      };

      // Right click (auxclick): decrement conviction
      const auxclickHandler = async (e: MouseEvent) => {
        if (e.button === 2) {
          e.preventDefault();
          e.stopPropagation();
          try {
            const statPath = 'system.details.conviction.value';
            const currentValue = getNestedProperty(actor, statPath) || 0;
            await actor.update({ [statPath]: Math.max(0, currentValue - 1) });
          } catch (error) {
            ui.notifications?.error('Failed to decrement conviction.');
            console.error('HUD conviction decrement error:', error);
          }
        }
      };

      valueSpan.addEventListener('click', clickHandler);
      valueSpan.addEventListener('auxclick', auxclickHandler);

      // Store the handlers in WeakMap
      elementHandlers.set(valueSpan as HTMLElement, {
        click: clickHandler,
        auxclick: auxclickHandler,
      });
    }
  }

  // Pace
  const paceStat = element.querySelector('.swadehud-pace-clickable');
  if (paceStat) {
    const newPaceStat = paceStat.cloneNode(true) as HTMLElement;
    paceStat.replaceWith(newPaceStat);
    const updatePaceIcon = (base: string) => {
      const icon = newPaceStat.querySelector('.swadehud-bottomstat__icon i');
      if (icon) {
        icon.className = 'fa-solid';
        switch (base) {
          case 'fly':
            icon.classList.add('fa-dove');
            break;
          case 'swim':
            icon.classList.add('fa-water');
            break;
          case 'burrow':
            icon.classList.add('fa-mountain');
            break;
          default:
            icon.classList.add('fa-person-running');
            break;
        }
      }
      newPaceStat.setAttribute(
        'title',
        `Pace: ${base.charAt(0).toUpperCase() + base.slice(1)} (Left click: roll running, Right click: cycle)`
      );
    };

    // Remove existing handlers if present
    const existingHandlers = elementHandlers.get(newPaceStat);
    if (existingHandlers?.click) {
      newPaceStat.removeEventListener('click', existingHandlers.click);
    }
    if (existingHandlers?.contextmenu) {
      newPaceStat.removeEventListener('contextmenu', existingHandlers.contextmenu);
    }
    if (existingHandlers?.auxclick) {
      newPaceStat.removeEventListener('auxclick', existingHandlers.auxclick);
    }

    const clickHandler = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (e.button === 0 && typeof actor.rollRunningDie === 'function') await actor.rollRunningDie();
      } catch (error) {
        ui.notifications?.error('Failed to roll running die.');
        console.error('HUD pace roll error:', error);
      }
    };

    const handlePaceCycle = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const paceTypes = (newPaceStat.getAttribute('data-pace-types') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const currentBase = newPaceStat.getAttribute('data-current-base') || 'ground';
        if (paceTypes.length > 1) {
          let currentIndex = paceTypes.indexOf(currentBase);
          if (currentIndex === -1) currentIndex = 0;
          let nextBase: string | null = null;
          let attempts = 0;
          while (attempts < paceTypes.length) {
            const nextIndex = (currentIndex + attempts + 1) % paceTypes.length;
            const candidateBase = paceTypes[nextIndex];
            const candidateValue = actor?.system?.pace?.[candidateBase];
            if (candidateValue !== null && candidateValue !== undefined) {
              nextBase = candidateBase;
              break;
            }
            attempts++;
          }
          if (!nextBase) nextBase = 'ground';
          await actor.update({ 'system.pace.base': nextBase });
          newPaceStat.setAttribute('data-current-base', nextBase);
          updatePaceIcon(nextBase);
        }
      } catch (error) {
        ui.notifications?.error('Failed to cycle pace type.');
        console.error('HUD pace cycle error:', error);
      }
    };

    const contextmenuHandler = handlePaceCycle;
    const auxclickHandler = (e: MouseEvent) => {
      if (e.button === 2) handlePaceCycle(e);
    };

    newPaceStat.addEventListener('click', clickHandler);
    newPaceStat.addEventListener('contextmenu', contextmenuHandler);
    newPaceStat.addEventListener('auxclick', auxclickHandler);

    // Store the handlers in WeakMap
    elementHandlers.set(newPaceStat, {
      click: clickHandler,
      contextmenu: contextmenuHandler,
      auxclick: auxclickHandler,
    });
  }

  // Generic handling for any element that exposes a data-stat-path attribute
  // (e.g. wounds, fatigue, other numeric circles). We skip items that were
  // already wired above (powerPoints, bennies, conviction).
  try {
    const statElements = Array.from(element.querySelectorAll('[data-stat-path]')) as HTMLElement[];
    for (const statEl of statElements) {
      const statPath = statEl.getAttribute('data-stat-path');
      if (!statPath) continue;
      // Skip powerPoints (handled specially above)
      if (statPath.startsWith('system.powerPoints.')) continue;
      // Skip bennies and conviction which have their own handlers
      if (statPath === 'system.bennies.value' || statPath === 'system.conviction.value') continue;

      const min = Number(statEl.getAttribute('data-stat-min')) || 0;
      const maxAttr = statEl.getAttribute('data-stat-max');
      const max = maxAttr !== null && maxAttr !== undefined ? Number(maxAttr) : null;

      // Attach add/subtract clicks for generic stat paths
      setupAddSubtractClicks(statEl, actor, statPath, min, max, onUpdate);
    }
  } catch (err) {
    // Non-fatal: don't break the HUD if this fails
    console.warn('setupHudStatHandlers: failed to attach generic data-stat-path handlers', err);
  }
}

function getNestedProperty(obj: any, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  } as T;
}

export function setupAddSubtractClicks(
  element: HTMLElement,
  actor: any,
  statPath: string,
  min = 0,
  max: number | null = null,
  onUpdate: (() => void) | null = null
) {
  if (!element || !actor) return;

  // Remove existing handlers if they exist
  const existingHandlers = elementHandlers.get(element);
  if (existingHandlers) {
    if (existingHandlers.click) {
      element.removeEventListener('click', existingHandlers.click);
    }
    if (existingHandlers.auxclick) {
      element.removeEventListener('auxclick', existingHandlers.auxclick);
    }
    if (existingHandlers.contextmenu) {
      element.removeEventListener('contextmenu', existingHandlers.contextmenu);
    }
  }

  // Create new handlers
  const newHandlers = {
    click: debounce(async (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.button === 2) return;
      if (statPath === 'system.bennies.value') {
        if (event.button === 0 && typeof actor.spendBenny === 'function') await actor.spendBenny();
        if (onUpdate) onUpdate();
      } else if (statPath === 'system.conviction.value') {
        if (event.button === 0 && typeof actor.toggleConviction === 'function') await actor.toggleConviction();
        if (onUpdate) onUpdate();
      } else if (statPath.startsWith('system.powerPoints.')) {
        const parts = statPath.split('.');
        const arcane = parts[2];
        const property = parts[3];
        const currentPowerPoints = foundry.utils.getProperty(actor, 'system.powerPoints') || {};
        const arcaneData = {
          ...(currentPowerPoints[arcane] || { value: 0, max: 0 }),
        };
        const currentValue = arcaneData[property] || 0;
        let newValue;
        if (event.button === 0) {
          // Left click: increment
          newValue = Math.min(arcaneData.max || max || Infinity, currentValue + 1);
        } else if (event.button === 2) {
          // Right click: decrement
          newValue = Math.max(min, currentValue - 1);
        } else {
          return;
        }
        if (newValue !== currentValue) {
          arcaneData[property] = newValue;
          const updateData = { [`system.powerPoints.${arcane}`]: arcaneData };
          await actor.update(updateData);
          if (onUpdate) onUpdate();
        }
      } else {
        const currentValue = getNestedProperty(actor, statPath) || 0;
        let newValue;
        if (event.button === 0) newValue = max !== null && max > 0 ? Math.min(max, currentValue + 1) : currentValue + 1;
        else return;
        if (newValue !== currentValue) {
          await actor.update({ [statPath]: newValue });
          if (onUpdate) onUpdate();
        }
      }
    }, 20),
    contextmenu: (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    },
    auxclick: debounce(async (event: MouseEvent) => {
      if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
        if (statPath === 'system.bennies.value') {
          if (typeof actor.getBenny === 'function') await actor.getBenny();
          if (onUpdate) onUpdate();
        } else if (statPath === 'system.conviction.value') {
          // For conviction, right click also increments (no decrement for conviction)
          if (typeof actor.toggleConviction === 'function') {
            await actor.toggleConviction();
            if (onUpdate) onUpdate();
          } else {
            const currentValue = getNestedProperty(actor, statPath) || 0;
            const newValue = max !== null && max > 0 ? Math.min(max, currentValue + 1) : currentValue + 1;
            if (newValue !== currentValue) {
              await actor.update({ [statPath]: newValue });
              if (onUpdate) onUpdate();
            }
          }
        } else {
          const currentValue = getNestedProperty(actor, statPath) || 0;
          const newValue = Math.max(min, currentValue - 1);
          if (newValue !== currentValue) {
            await actor.update({ [statPath]: newValue });
            if (onUpdate) onUpdate();
          }
        }
      }
    }, 20),
  };

  // Store the handlers in the WeakMap
  elementHandlers.set(element, newHandlers);

  // Add the event listeners
  element.addEventListener('click', newHandlers.click);
  element.addEventListener('contextmenu', newHandlers.contextmenu);
  element.addEventListener('auxclick', newHandlers.auxclick);
}
