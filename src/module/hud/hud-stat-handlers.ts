// Debounce helper
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

/**
 * Sets up add/subtract click handlers for stat elements (bennies, conviction, etc)
 * @param element The clickable stat element
 * @param actor The Foundry actor object
 * @param statPath Dot notation path to the stat (e.g., 'system.bennies.value')
 * @param min Minimum allowed value for the stat
 * @param max Maximum allowed value for the stat
 * @param onUpdate Callback function called after stat update
 */
export function setupAddSubtractClicks(
  element: HTMLElement,
  actor: any,
  statPath: string,
  min = 0,
  max: number | null = null,
  onUpdate: (() => void) | null = null,
) {
  if (!element || !actor) return;

  // Remove any existing event listeners to prevent duplicates
  element.removeEventListener('click', (element as any)._swadeHudClickHandler);
  element.removeEventListener(
    'auxclick',
    (element as any)._swadeHudAuxClickHandler,
  );
  element.removeEventListener(
    'contextmenu',
    (element as any)._swadeHudContextHandler,
  );

  // Store handlers as properties to allow removal
  (element as any)._swadeHudClickHandler = debounce(
    async (event: MouseEvent) => {
      console.log('[HUD DEBUG] Click event fired:', {
        statPath,
        event,
        actor,
        spendBenny: actor.spendBenny,
        spendConviction: actor.spendConviction,
      });
      event.preventDefault();
      event.stopPropagation();

      // Skip right-click events - handled by auxclick
      if (event.button === 2) return;

      // Special handling for bennies
      if (statPath === 'system.bennies.value') {
        if (event.button === 0 && typeof actor.spendBenny === 'function') {
          console.log('[HUD DEBUG] Calling actor.spendBenny()');
          try {
            await actor.spendBenny();
          } catch (e) {
            console.error('[HUD DEBUG] spendBenny error', e);
          }
        } else {
          console.warn(
            '[HUD DEBUG] actor.spendBenny not a function or wrong button',
            { actor },
          );
        }
        if (onUpdate) onUpdate();
      } else if (statPath === 'system.conviction.value') {
        if (event.button === 0 && typeof actor.spendConviction === 'function') {
          console.log('[HUD DEBUG] Calling actor.spendConviction()');
          try {
            await actor.spendConviction();
          } catch (e) {
            console.error('[HUD DEBUG] spendConviction error', e);
          }
        } else {
          console.warn(
            '[HUD DEBUG] actor.spendConviction not a function or wrong button',
            { actor },
          );
        }
        if (onUpdate) onUpdate();
      } else {
        // Regular stat handling
        const currentValue = getNestedProperty(actor, statPath) || 0;
        let newValue;
        if (event.button === 0) {
          newValue = Math.max(min, currentValue - 1);
        } else {
          return;
        }
        if (newValue !== currentValue) {
          try {
            await actor.update({ [statPath]: newValue });
          } catch (e) {
            console.error('[HUD DEBUG] actor.update error', e);
          }
          if (onUpdate) onUpdate();
        }
      }
    },
    50,
  );
  element.addEventListener('click', (element as any)._swadeHudClickHandler);

  // Prevent context menu on right click
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

  // Handle right-click via auxclick for browsers that don't fire click on right-click
  (element as any)._swadeHudAuxClickHandler = debounce(
    async (event: MouseEvent) => {
      console.log('[HUD DEBUG] Auxclick event fired:', {
        statPath,
        event,
        actor,
        getBenny: actor.getBenny,
        getConviction: actor.getConviction,
      });
      if (event.button === 2) {
        event.preventDefault();
        event.stopPropagation();
        if (statPath === 'system.bennies.value') {
          if (typeof actor.getBenny === 'function') {
            console.log('[HUD DEBUG] Calling actor.getBenny()');
            try {
              await actor.getBenny();
            } catch (e) {
              console.error('[HUD DEBUG] getBenny error', e);
            }
          } else {
            console.warn('[HUD DEBUG] actor.getBenny not a function', {
              actor,
            });
          }
          if (onUpdate) onUpdate();
        } else if (statPath === 'system.conviction.value') {
          if (typeof actor.getConviction === 'function') {
            console.log('[HUD DEBUG] Calling actor.getConviction()');
            try {
              await actor.getConviction();
            } catch (e) {
              console.error('[HUD DEBUG] getConviction error', e);
            }
          } else {
            console.warn('[HUD DEBUG] actor.getConviction not a function', {
              actor,
            });
          }
          if (onUpdate) onUpdate();
        } else {
          const currentValue = getNestedProperty(actor, statPath) || 0;
          const newValue =
            max !== null && max > 0
              ? Math.min(max, currentValue + 1)
              : currentValue + 1;
          if (newValue !== currentValue) {
            try {
              await actor.update({ [statPath]: newValue });
            } catch (e) {
              console.error('[HUD DEBUG] actor.update error', e);
            }
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

function getNestedProperty(obj: any, path: string) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
