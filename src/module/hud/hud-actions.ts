import { debounce } from './hud-utils';
import { getEnrichedDescription } from './hud-context';
import SwadeActor from '../documents/actor/SwadeActor';

/**
 * Set up all HUD action button listeners for the SWADE HUD popout panels.
 * Handles item expand/collapse, rolling, chat, and action buttons.
 * @param {HTMLElement} popout - The HUD popout element.
 * @param {SwadeActor | null} actor - The actor associated with the HUD.
 * @param {any} _hudInstance - The HUD instance (optional, for context).
 */
export function setupHudActionButtonListeners(
  popout: HTMLElement,
  actor: SwadeActor | null,
  _hudInstance: any,
) {
  // Get SWADE's ItemChatCardHelper
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const ItemChatCardHelper = game.swade?.itemChatCardHelper;

  // Handle item expand/collapse and rolling
  const itemHeaders = popout.querySelectorAll('[data-toggle="expand"]');
  itemHeaders.forEach((header, index) => {
    // Check if listener is already attached
    if ((header as any)._swadeHudListener) {
      header.removeEventListener('click', (header as any)._swadeHudListener);
    }

    const listener = debounce((event: Event) => {
      // Don't prevent default if clicking on a button
      if ((event.target as HTMLElement).tagName !== 'BUTTON') {
        event.preventDefault();
      }

      const item = header.closest('.swadehud-item');
      if (!item) {
        console.error(
          'SWADE HUD: Could not find item element for header',
          index,
        );
        return;
      }

      // Check what was clicked
      const clickedElement = event.target as HTMLElement;

      // If clicked on dice icon, roll
      if (clickedElement.classList.contains('swadehud-roll-icon')) {
        const rollType = (clickedElement as HTMLElement).dataset.type;
        const rollKey = (clickedElement as HTMLElement).dataset.key;
        if (
          rollType === 'attribute' &&
          typeof actor?.rollAttribute === 'function' &&
          rollKey
        ) {
          // Only allow valid attribute keys
          const validAttributes = [
            'agility',
            'smarts',
            'spirit',
            'strength',
            'vigor',
          ];
          if (validAttributes.includes(rollKey)) {
            actor.rollAttribute(rollKey as any);
          }
        } else if (
          rollType === 'skill' &&
          typeof actor?.rollSkill === 'function' &&
          rollKey
        ) {
          actor.rollSkill(rollKey);
        }
        return;
      }

      // If clicked on toggle icon, don't expand/collapse
      if (
        clickedElement.classList.contains('swadehud-condition-toggle-icon') ||
        clickedElement.classList.contains('swadehud-effect-toggle-icon') ||
        clickedElement.classList.contains('swadehud-equip-indicator') ||
        clickedElement.classList.contains('swadehud-stat-clickable') ||
        clickedElement.closest('.swadehud-condition-toggle-icon') ||
        clickedElement.closest('.swadehud-effect-toggle-icon') ||
        clickedElement.closest('.swadehud-equip-indicator') ||
        clickedElement.closest('.swadehud-stat-clickable')
      ) {
        return;
      }

      // If clicked on name, expand/collapse
      if (
        clickedElement.classList.contains('swadehud-item-name') ||
        clickedElement.closest('.swadehud-item-name')
      ) {
        // Default: expand/collapse
        item.classList.toggle('expanded');
        const isExpanded = item.classList.contains('expanded');

        if (isExpanded) {
          // Lazy enrich description if needed
          const itemId = (item as HTMLElement).dataset.itemId;

          let itemData: any = null;
          if (actor && typeof (actor as any).getOwnedItem === 'function') {
            itemData = (actor as any).getOwnedItem(itemId);
          } else if (
            actor?.items?.get &&
            typeof actor.items.get === 'function'
          ) {
            itemData = actor.items.get(String(itemId)) ?? null;
          } else if (
            actor?.items?.find &&
            typeof actor.items.find === 'function'
          ) {
            itemData = actor.items.find((i: any) => i.id === itemId) ?? null;
          } else if (Array.isArray(actor?.items)) {
            itemData = actor.items.find((i: any) => i.id === itemId) ?? null;
          }

          if (itemData) {
            // Enrich description asynchronously
            getEnrichedDescription(itemData)
              .then((enrichedDesc) => {
                const descElement = item.querySelector(
                  '.swadehud-item-description',
                );
                if (descElement) {
                  descElement.innerHTML = enrichedDesc;
                }
              })
              .catch((error) => {
                console.error('Error enriching description:', error);
              });
          }
        }
        return;
      }

      // Default expand/collapse behavior
      const wasExpanded = item.classList.contains('expanded');
      item.classList.toggle('expanded');
      const isExpanded = item.classList.contains('expanded');

      if (isExpanded && !wasExpanded) {
        // Lazy enrich description if needed
        const itemId = (item as HTMLElement).dataset.itemId;

        let itemData: any = null;
        if (actor && typeof (actor as any).getOwnedItem === 'function') {
          itemData = (actor as any).getOwnedItem(itemId);
        } else if (actor?.items?.get && typeof actor.items.get === 'function') {
          itemData = actor.items.get(String(itemId)) ?? null;
        } else if (
          actor?.items?.find &&
          typeof actor.items.find === 'function'
        ) {
          itemData = actor.items.find((i: any) => i.id === itemId) ?? null;
        } else if (Array.isArray(actor?.items)) {
          itemData = actor.items.find((i: any) => i.id === itemId) ?? null;
        }

        if (itemData) {
          // Enrich description asynchronously
          getEnrichedDescription(itemData)
            .then((enrichedDesc) => {
              const descElement = item.querySelector(
                '.swadehud-item-description',
              );
              if (descElement) {
                descElement.innerHTML = enrichedDesc;
              }
            })
            .catch((error) => {
              console.error('Error enriching description:', error);
            });
        }
      }
    }, 100);

    (header as any)._swadeHudListener = listener;
    header.addEventListener('click', listener);
  });

  // Handle all action buttons using SWADE's system
  const actionButtons = popout.querySelectorAll('[data-action]');
  actionButtons.forEach((btn) => {
    btn.addEventListener(
      'click',
      debounce(async (event: Event) => {
        event.preventDefault();
        const actionId = (btn as HTMLElement).dataset.action;
        const itemId = (btn as HTMLElement).dataset.itemId;
        const template = (btn as HTMLElement).dataset.template;

        if (!actor || !itemId || !actionId) return;

        const item = actor.items.get(itemId);
        if (!item) return;

        try {
          // Handle template placement actions directly (SWADE's ItemChatCardHelper.onChatCardAction handles this)
          if (actionId === 'template' && template) {
            // Use SWADE's SwadeMeasuredTemplate directly
            const swadeMeasuredTemplate = CONFIG.MeasuredTemplate?.objectClass;
            if (swadeMeasuredTemplate?.fromPreset) {
              await swadeMeasuredTemplate.fromPreset(template, item);
              return;
            } else {
              console.error('SwadeMeasuredTemplate not available');
              return;
            }
          }

          // Use SWADE's ItemChatCardHelper to handle the action
          await ItemChatCardHelper.handleAction(item, actor, actionId, {
            additionalMods: [],
            event: event,
          });
        } catch (error) {
          // Silent error handling for production
          console.error('Error handling action:', error);
        }
      }, 50),
    );
  });

  // Handle chat buttons for showing item cards
  const chatButtons = popout.querySelectorAll(
    '.swadehud-chat, .swadehud-power-chat, .swadehud-edge-chat, .swadehud-hindrance-chat, .swadehud-ability-chat, .swadehud-action-chat',
  );
  chatButtons.forEach((btn) => {
    btn.addEventListener(
      'click',
      debounce(async (ev: Event) => {
        (ev as Event).preventDefault();
        const itemId = (btn as HTMLElement).dataset.itemId;
        if (!actor || !itemId) return;

        const item = actor.items.get(itemId);
        if (item) {
          if (typeof item.show === 'function') {
            await item.show();
          } else {
            const chatData = await item.getChatData();
            const content = await renderTemplate(
              'systems/swade/templates/chat/item-card.hbs',
              {
                item: item,
                data: chatData,
                actor: actor,
              },
            );

            await ChatMessage.create({
              // user: game.user.id, // Removed invalid property
              speaker: ChatMessage.getSpeaker({ actor: actor }),
              content: content,
              type: (foundry as any).CONST?.CHAT_MESSAGE_TYPES?.OTHER || 1,
            });
          }
        }
      }, 100),
    );
  });
}
