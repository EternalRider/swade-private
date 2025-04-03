import { SWADE } from './config';
import ItemChatCardHelper from './ItemChatCardHelper';
import { getParents } from './util';

export function chatListeners(html: HTMLElement) {
  html.addEventListener('click', (event) => {
    if (event.target?.closest('.card-header .item-name')) {
      // TODO: Check if this needs to be parents at all, vs just closest
      const parents = getParents(event.currentTarget as HTMLElement, '.item-card');
      const toToggle = parents.flatMap(p => Array.from(p.querySelectorAll('.card-content')));
      // TODO: css wizardry to do this sans-jQuery
      $(toToggle).slideToggle();
    }
  });

  html.addEventListener('click', async (event) => {
    if (event.target?.closest('.card-buttons button')) {
      const element = event.currentTarget as HTMLElement;
      const chatCard = element.closest<HTMLElement>('.chat-card')!;
      const actor = ItemChatCardHelper.getChatCardActor(chatCard);
      if (!actor) return;
      const itemId = element.closest('[data-item-id]')?.dataset.itemId;
      const action = element.dataset.action;
      const messageId = element.closest('[data-message-id]')?.dataset.messageId;
    
      // Bind item cards
      ItemChatCardHelper.onChatCardAction(event);
    
      //handle Power Item Card PP adjustment
      if (action === 'pp-adjust') {
        const ppToAdjust = element.closest('.flexcol')?.querySelector('input.pp-adjust')?.value as string;
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
        const adPPToAdjust = element.closest('.chat-card.item-card')?.querySelector('input.arcane-device-pp-adjust')?.value as string;
        const adjustment = element.getAttribute('data-adjust') as string;
        const item = actor.items.get(itemId, { strict: true });
        const key = 'system.powerPoints.value';
        const oldPP = foundry.utils.getProperty(item, key) as number;
        if (adjustment === 'plus') {
          await item.update({ [key]: oldPP + parseInt(adPPToAdjust, 10) });
        } else if (adjustment === 'minus') {
          await item.update({ [key]: oldPP - parseInt(adPPToAdjust, 10) });
        }
        await ItemChatCardHelper.refreshItemCard(actor, messageId);
      }
    }
  });
}

/**
 * Hide the display of chat card action buttons which cannot be performed by the user
 */
export async function hideChatActionButtons(
  msg: ChatMessage,
  html: HTMLElement,
  _data: any,
) {
  // If the user is the message author or the actor owner, proceed
  const actor = game.actors?.get(msg.speaker.actor ?? '');
  if (actor?.isOwner || game.user?.isGM || msg.isAuthor) return;
  const chatCard = html.querySelector<HTMLElement>('.swade.chat-card');
  if (chatCard) {
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
      '.benny-reroll',
      '.free-reroll',
    ];
    for (const group of toHide) {
      chatCard
        .querySelectorAll<HTMLElement>(group)
        .forEach((e) => (e.style.display = 'none'));
    }
  }

  //hide macros if the user can't execute them
  const macros = msg.getFlag('swade', 'macros') ?? [];
  let hiddenCounter = 0;
  for (const macro of macros) {
    const doc = (await fromUuid(macro.uuid)) as Macro | null;
    if (doc?.canExecute) continue;
    html
      .querySelectorAll<HTMLButtonElement>(`button[data-action="${macro.id}"]`)
      .forEach((btn) => {
        btn.style.display = 'none';
        hiddenCounter++;
      });
  }
  const macroButtonsTotal = html.querySelectorAll<HTMLButtonElement>(
    '.card-buttons.macros button',
  ).length;
  //if all macros have been hidden, then also hide the header
  if (macroButtonsTotal <= hiddenCounter) {
    const header = html.querySelector<HTMLElement>('.card-buttons.macros');
    if (header) header.style.display = 'none';
  }
}

export function createMagazineTooltip(
  _msg: ChatMessage,
  card: HTMLElement,
) {
  const magazine = card.querySelector<HTMLElement>(
    '.swade.chat-card .magazine',
  );

  magazine?.addEventListener('mouseenter', async () => {
    const actor = ItemChatCardHelper.getChatCardActor(
      card.querySelector('.swade.chat-card')!,
    );
    const itemId = card.querySelector<HTMLElement>('[data-item-id]')?.dataset
      .itemId as string;
    const item = actor?.items.get(itemId);
    const loadedAmmo = item?.getFlag('swade', 'loadedAmmo');

    const content = loadedAmmo
      ? `<h3>${loadedAmmo?.name}</h3>${loadedAmmo?.system!.description ?? ''}`
      : game.i18n.localize('SWADE.Magazine.NoneLoaded');

    game.tooltip.activate(magazine, {
      text: await TextEditor.enrichHTML(content, {
        relativeTo: item,
        rollData: item?.getRollData() ?? {},
        secrets: item?.testUserPermission(
          game.user,
          CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
        ),
      }),
    });
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
