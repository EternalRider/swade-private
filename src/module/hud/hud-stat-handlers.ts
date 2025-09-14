/**
 * Shared HUD stat handler for SWADE HUD and popout.
 * Attaches all stat click/contextmenu handlers for bennies, conviction, pace, power points, etc.
 */
export function setupHudStatHandlers(
  element: HTMLElement,
  actor: any,
  onUpdate: (() => void) | null = null,
) {
  if (!element || !actor) return;

  // Soak (open dialog, roll, whisper, trigger applyDamage, clean up)
  const soakBtn = element.querySelector('.swadehud-soak-clickable');
  if (soakBtn && actor) {
    soakBtn.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
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
                  // Use Roll for a simple numeric roll
                  const damageRoll = new Roll(`${damage}`);
                  (await (damageRoll as any).evaluate?.()) ||
                    (damageRoll as any).evaluate();
                  // Create a whispered chat message
                  const chatMessage = (await ChatMessage.create({
                    content: `Rolling damage from HUD: ${damage}${ap > 0 ? ` (AP ${ap})` : ''}`,
                    speaker: { actor },
                    rolls: [damageRoll],
                    whisper: [game.user.id],
                    type:
                      (foundry as any).CONST?.CHAT_MESSAGE_STYLES?.ROLL || 5,
                  })) as any;
                  // Wait for the chat message to render, then click Apply Damage
                  setTimeout(async () => {
                    try {
                      if (!chatMessage) return;
                      const messageElement = document.querySelector(
                        `[data-message-id="${chatMessage.id}"]`,
                      );
                      if (messageElement) {
                        const damageButton =
                          messageElement.querySelector('.calculate-wounds');
                        if (damageButton) {
                          // Ensure the actor's token is controlled for damage application
                          const actorToken = (
                            canvas.tokens?.placeables as any[]
                          )?.find?.((t: any) => t.actor?.id === actor.id);
                          if (actorToken && !actorToken.controlled) {
                            await actorToken.control?.({
                              releaseOthers: false,
                            });
                          }
                          // Programmatically click the Apply Damage button
                          const clickEvent = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                          });
                          damageButton.dispatchEvent(clickEvent);
                          // Clean up the whisper message after processing
                          setTimeout(() => {
                            chatMessage.delete();
                          }, 1000);
                        }
                      }
                    } catch (clickError) {
                      /* silent */
                    }
                  }, 100);
                } catch (error) {
                  ui.notifications?.error(
                    'Failed to apply damage. Please ensure SWADE system is active and properly loaded.',
                  );
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
      dialog.render(true);
    });
  }

  // Incapacitated
  const incapBtn = element.querySelector('.swadehud-incapacitated-clickable');
  if (incapBtn) {
    incapBtn.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof actor.toggleStatusEffect === 'function')
        await actor.toggleStatusEffect('incapacitated');
      if (onUpdate) onUpdate();
    });
  }

  // Power Points (all arcane types)
  const ppIndicators = element.querySelectorAll(
    '.swadehud-pp-indicator.swadehud-stat-clickable',
  );
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
          Object.keys(powerPointsRaw).find(
            (k) => k.toLowerCase() === arcaneFromTemplate.toLowerCase(),
          ) || arcaneFromTemplate;
        parts[2] = realArcaneKey;
        statPath = parts.join('.');
      }
    }
    if (statPath)
      setupAddSubtractClicks(
        el as HTMLElement,
        actor,
        statPath,
        min,
        max,
        onUpdate,
      );
  });

  // Bennies
  const bennyStat = element.querySelector(
    '[data-stat-path="system.bennies.value"]',
  );
  if (bennyStat)
    setupAddSubtractClicks(
      bennyStat as HTMLElement,
      actor,
      'system.bennies.value',
      0,
      null,
      onUpdate,
    );

  // Conviction
  const convictionStat = element.querySelector(
    '.swadehud-conviction-clickable',
  );
  if (convictionStat) {
    const starIcon = convictionStat.querySelector(
      '.swadehud-bottomstat__icon i',
    );
    if (starIcon) {
      starIcon.addEventListener('click', async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof actor.toggleConviction === 'function')
          await actor.toggleConviction();
      });
    }
    const valueSpan = convictionStat.querySelector(
      '.swadehud-bottomstat__value',
    );
    if (valueSpan) {
      valueSpan.addEventListener('click', async (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const statPath = 'system.details.conviction.value';
        const currentValue = getNestedProperty(actor, statPath) || 0;
        await actor.update({ [statPath]: currentValue + 1 });
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
        `Pace: ${base.charAt(0).toUpperCase() + base.slice(1)} (Left click: roll running, Right click: cycle)`,
      );
    };
    newPaceStat.addEventListener('click', async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button === 0 && typeof actor.rollRunningDie === 'function')
        await actor.rollRunningDie();
    });
    const handlePaceCycle = async (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const paceTypes = (newPaceStat.getAttribute('data-pace-types') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const currentBase =
        newPaceStat.getAttribute('data-current-base') || 'ground';
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
    };
    newPaceStat.addEventListener('contextmenu', handlePaceCycle);
    newPaceStat.addEventListener('auxclick', (e: MouseEvent) => {
      if (e.button === 2) handlePaceCycle(e);
    });
  }
}

function getNestedProperty(obj: any, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): T {
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
  onUpdate: (() => void) | null = null,
) {
  if (!element || !actor) return;
  element.removeEventListener('click', (element as any)._swadeHudClickHandler);
  element.removeEventListener(
    'auxclick',
    (element as any)._swadeHudAuxClickHandler,
  );
  element.removeEventListener(
    'contextmenu',
    (element as any)._swadeHudContextHandler,
  );
  (element as any)._swadeHudClickHandler = debounce(
    async (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.button === 2) return;
      if (statPath === 'system.bennies.value') {
        if (event.button === 0 && typeof actor.spendBenny === 'function')
          await actor.spendBenny();
        if (onUpdate) onUpdate();
      } else if (statPath === 'system.conviction.value') {
        if (event.button === 0 && typeof actor.toggleConviction === 'function')
          await actor.toggleConviction();
        if (onUpdate) onUpdate();
      } else if (statPath.startsWith('system.powerPoints.')) {
        const parts = statPath.split('.');
        const arcane = parts[2];
        const property = parts[3];
        const currentPowerPoints =
          foundry.utils.getProperty(actor, 'system.powerPoints') || {};
        const arcaneData = {
          ...(currentPowerPoints[arcane] || { value: 0, max: 0 }),
        };
        const currentValue = arcaneData[property] || 0;
        let newValue;
        if (event.button === 0) newValue = Math.max(min, currentValue - 1);
        else return;
        if (newValue !== currentValue) {
          arcaneData[property] = newValue;
          const updateData = { [`system.powerPoints.${arcane}`]: arcaneData };
          await actor.update(updateData);
          if (onUpdate) onUpdate();
        }
      } else {
        const currentValue = getNestedProperty(actor, statPath) || 0;
        let newValue;
        if (event.button === 0) newValue = Math.max(min, currentValue - 1);
        else return;
        if (newValue !== currentValue) {
          await actor.update({ [statPath]: newValue });
          if (onUpdate) onUpdate();
        }
      }
    },
    50,
  );
  element.addEventListener('click', (element as any)._swadeHudClickHandler);
  (element as any)._swadeHudContextHandler = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return false;
  };
  element.addEventListener(
    'contextmenu',
    (element as any)._swadeHudContextHandler,
  );
  (element as any)._swadeHudAuxClickHandler = debounce(
    async (event: MouseEvent) => {
      if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
        if (statPath === 'system.bennies.value') {
          if (typeof actor.getBenny === 'function') await actor.getBenny();
          if (onUpdate) onUpdate();
        } else if (statPath === 'system.conviction.value') {
          const currentValue = getNestedProperty(actor, statPath) || 0;
          const newValue =
            max !== null && max > 0
              ? Math.min(max, currentValue + 1)
              : currentValue + 1;
          if (newValue !== currentValue) {
            await actor.update({ [statPath]: newValue });
            if (onUpdate) onUpdate();
          }
        } else if (statPath.startsWith('system.powerPoints.')) {
          const parts = statPath.split('.');
          const arcane = parts[2];
          const property = parts[3];
          const currentPowerPoints =
            foundry.utils.getProperty(actor, 'system.powerPoints') || {};
          const arcaneData = {
            ...(currentPowerPoints[arcane] || { value: 0, max: 0 }),
          };
          const currentValue = arcaneData[property] || 0;
          const newValue =
            max !== null && max > 0
              ? Math.min(max, currentValue + 1)
              : currentValue + 1;
          if (newValue !== currentValue) {
            arcaneData[property] = newValue;
            const updateData = { [`system.powerPoints.${arcane}`]: arcaneData };
            await actor.update(updateData);
            if (onUpdate) onUpdate();
          }
        } else {
          const currentValue = getNestedProperty(actor, statPath) || 0;
          const newValue =
            max !== null && max > 0
              ? Math.min(max, currentValue + 1)
              : currentValue + 1;
          if (newValue !== currentValue) {
            await actor.update({ [statPath]: newValue });
            if (onUpdate) onUpdate();
          }
        }
      }
    },
    50,
  );
  element.addEventListener(
    'auxclick',
    (element as any)._swadeHudAuxClickHandler,
  );
}
