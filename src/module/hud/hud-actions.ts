import { debounce } from './hud-utils.ts';
import { getEnrichedDescription } from './hud-context.ts';
import SwadeActor from '../documents/actor/SwadeActor';

export function setupHudActionButtonListeners(
  popout: HTMLElement,
  actor: SwadeActor | null,
  _hudInstance: any,
) {
  // Get SWADE's ItemChatCardHelper
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const ItemChatCardHelper =
    game.swade?.itemChatCardHelper ||
    game.system?.itemChatCardHelper ||
    CONFIG.SWADE?.itemChatCardHelper;

  if (!ItemChatCardHelper) {
    console.error(
      'SWADE ItemChatCardHelper not available - action buttons will not work',
    );
    return;
  }

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
        const rollType = clickedElement.dataset.type;
        const rollKey = clickedElement.dataset.key;
        if (rollType === 'attribute') {
          try {
            // Try SWADE's ItemChatCardHelper for attributes
            if (
              ItemChatCardHelper &&
              typeof ItemChatCardHelper.rollTrait === 'function'
            ) {
              ItemChatCardHelper.rollTrait(actor, rollKey, {
                type: 'attribute',
              });
            } else if (typeof actor?.rollTrait === 'function') {
              actor.rollTrait(rollKey, { type: 'attribute' });
            } else if (typeof actor?.rollAttribute === 'function') {
              actor.rollAttribute(rollKey);
            } else if (typeof actor?.rollAbility === 'function') {
              actor.rollAbility(rollKey);
            } else {
              console.error(
                'No rolling methods found. Available actor methods:',
                Object.getOwnPropertyNames(actor).filter((name) =>
                  name.includes('roll'),
                ),
              );
              console.error(
                'ItemChatCardHelper available:',
                !!ItemChatCardHelper,
              );
              if (ItemChatCardHelper) {
                console.error(
                  'ItemChatCardHelper methods:',
                  Object.getOwnPropertyNames(ItemChatCardHelper),
                );
              }
            }
          } catch (error) {
            console.error('Error rolling attribute:', error);
          }
        } else if (rollType === 'skill') {
          try {
            if (actor && typeof actor.rollSkill === 'function') {
              actor.rollSkill(rollKey);
            }
          } catch (error) {
            console.error('Error rolling skill:', error);
          }
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
          const itemId = item.dataset.itemId;

          let itemData = null;
          if (actor?.items.get && typeof actor.items.get === 'function') {
            itemData = actor.items.get(itemId);
          } else if (
            actor?.items.find &&
            typeof actor.items.find === 'function'
          ) {
            itemData = actor.items.find((i: any) => i.id === itemId);
          } else if (Array.isArray(actor?.items)) {
            itemData = actor.items.find((i: any) => i.id === itemId);
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
        const itemId = item.dataset.itemId;

        let itemData = null;
        if (actor?.items.get && typeof actor.items.get === 'function') {
          itemData = actor.items.get(itemId);
        } else if (
          actor?.items.find &&
          typeof actor.items.find === 'function'
        ) {
          itemData = actor.items.find((i: any) => i.id === itemId);
        } else if (Array.isArray(actor?.items)) {
          itemData = actor.items.find((i: any) => i.id === itemId);
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
              user: game.user.id,
              speaker: ChatMessage.getSpeaker({ actor: actor }),
              content: content,
              type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            });
          }
        }
      }, 100),
    );
  });
}
