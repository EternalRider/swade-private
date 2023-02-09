import { SWADE } from './config';
import SwadeActor from './documents/actor/SwadeActor';
import ItemChatCardHelper from './ItemChatCardHelper';

export function chatListeners(html: JQuery<HTMLElement>) {
  html.on('click', '.card-header .item-name', (event) => {
    const target = $(event.currentTarget).parents('.item-card');
    const actor = game.actors!.get(target.data('actorId'))!;
    if (
      actor &&
      (game.user!.isGM || actor.testUserPermission(game.user!, 'OBSERVER'))
    ) {
      const desc = target.find('.card-content');
      desc.slideToggle();
    }
  });

  html.on('click', '.card-buttons button', async (event) => {
    const element = event.currentTarget as HTMLElement;
    const chatCard = element.closest<HTMLElement>('.chat-card')!;
    const actor = ItemChatCardHelper.getChatCardActor(chatCard);
    if (!actor) return;
    const itemId = $(element).parents('[data-item-id]').data().itemId;
    const action = element.dataset.action;
    const messageId = $(element).parents('[data-message-id]').data().messageId;

    // Bind item cards
    ItemChatCardHelper.onChatCardAction(event);

    //handle Power Item Card PP adjustment
    if (action === 'pp-adjust') {
      const ppToAdjust = $(element)
        .closest('.flexcol')
        .find('input.pp-adjust')
        .val() as string;
      const adjustment = element.dataset.adjust;
      const power = actor.items.get(itemId, { strict: true });
      const arcane = foundry.utils.getProperty(power, 'system.arcane');
      const key = `system.powerPoints.${arcane || 'general'}.value`;
      const oldPP = foundry.utils.getProperty(actor, key) as number;
      if (adjustment === 'plus') {
        await actor.update({ [key]: oldPP + parseInt(ppToAdjust, 10) });
      } else if (adjustment === 'minus') {
        await actor.update({ [key]: oldPP - parseInt(ppToAdjust, 10) });
      }
      await ItemChatCardHelper.refreshItemCard(actor, messageId);
    }

    //handle Arcane Device Item Card PP adjustment
    if (action === 'arcane-device-pp-adjust') {
      const adPPToAdjust = $(element)
        .parents('.chat-card.item-card')
        .find('input.arcane-device-pp-adjust')
        .val() as string;
      const adjustment = element.getAttribute('data-adjust') as string;
      const item = actor.items.get(itemId, { strict: true });
      const key = 'system.powerPoints.value';
      const oldPP = getProperty(item, key) as number;
      if (adjustment === 'plus') {
        await item.update({ [key]: oldPP + parseInt(adPPToAdjust, 10) });
      } else if (adjustment === 'minus') {
        await item.update({ [key]: oldPP - parseInt(adPPToAdjust, 10) });
      }
      await ItemChatCardHelper.refreshItemCard(actor, messageId);
    }
  });
}

/**
 * Hide the display of chat card action buttons which cannot be performed by the user
 */
export function hideChatActionButtons(
  msg: ChatMessage,
  html: JQuery<HTMLElement>,
  _data: any,
) {
  // If the user is the message author or the actor owner, proceed
  const actor = game.actors?.get(msg.speaker.actor);
  if (actor?.isOwner || game.user?.isGM || msg.isAuthor) return;
  const chatCard = html.find('.swade.chat-card');
  if (chatCard.length > 0) {
    // Otherwise conceal all action button sections except for
    // resistance rolls (which can be rolled by other actors as a defense)
    const toHide = [
      '.trait-rolls',
      '.damage-rolls',
      '.template-controls',
      '.pp-controls',
      '.arcane-device-controls',
      '.pp-counter',
      '.ammo-counter',
      '.reload-controls',
    ];
    for (const group of toHide) {
      chatCard.find(group)?.css({ display: 'none' });
    }
  }

  const rollCard = html.find('.swade-roll');
  if (rollCard.length > 0) {
    const toHide = ['.benny-reroll', '.free-reroll'];
    for (const group of toHide) {
      rollCard.find(group)?.css({ display: 'none' });
    }
  }
}

/**
 * Creates an end message for Conviction
 * @param actor The Actor whose conviction is ending
 */
export async function createConvictionEndMessage(actor: SwadeActor) {
  await ChatMessage.create({
    speaker: {
      actor: actor.id,
      alias: actor.name,
      token: actor.token?.id,
    },
    content: game.i18n.localize('SWADE.ConvictionEnd'),
  });
}

/**
 * Creates a chat message for GM Bennies
 */
export async function createGmBennyAddMessage(
  user: User = game.user!,
  given?: boolean,
) {
  let message = await renderTemplate(SWADE.bennies.templates.gmadd, {
    target: user,
    speaker: user,
  });

  if (given) {
    message = await renderTemplate(SWADE.bennies.templates.add, {
      target: user,
      speaker: user,
    });
  }

  const chatData = {
    content: message,
  };
  ChatMessage.create(chatData);
}
