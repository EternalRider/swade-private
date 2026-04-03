import { SWADE } from './config';

/** Creates a chat message for GM Bennies */
export async function createGmBennyAddMessage(user: User = game.user!, given?: boolean) {
  let template;
  const data = { target: user, speaker: user };
  if (given) template = SWADE.bennies.templates.add;
  else template = SWADE.bennies.templates.gmadd;

  const content = await foundry.applications.handlebars.renderTemplate(template, data);
  const chatData = { content };
  ChatMessage.implementation.create(chatData);
}
