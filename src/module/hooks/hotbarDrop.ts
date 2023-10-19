import { Attribute } from '../../globals';
import { SWADE } from '../config';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';

const attributes = new Set(Object.keys(SWADE.attributes));

export async function onHotbarDrop(
  _hotbar: Hotbar,
  data: DropData,
  slot: number,
) {
  if (data.type === 'Item') return onDropItem(data, slot);
  if (data.type === 'Attribute') return onDropAttribute(data, slot);
}

async function onDropItem(data: DropData, slot: number) {
  const item = (await fromUuid(data.uuid)) as SwadeItem;
  if (!item) return;
  // Create the macro command
  const macro = await CONFIG.Macro.documentClass.create({
    name: item.name as string,
    img: item.img as string,
    type: CONST.MACRO_TYPES.SCRIPT,
    command: `game.swade.rollItemMacro("${item?.name}");`,
  });
  await game.user?.assignHotbarMacro(macro!, slot);
}

async function onDropAttribute(data: DropData, slot: number) {
  const attribute = data.attribute as string;
  // Create the macro command
  const macro = await CONFIG.Macro.documentClass.create({
    name: SWADE.attributes[attribute].long,
    img: 'systems/swade/assets/icons/attribute.svg',
    type: CONST.MACRO_TYPES.SCRIPT,
    command: `game.swade.rollItemMacro("${attribute}");`,
  });
  await game.user?.assignHotbarMacro(macro!, slot);
}

/**
 * A simple function to allow quick access to an item such as a skill or weapon. Skills are rolled while other items are posted to the chat as a chatcard
 * @param identifier the name of the item that should be called
 */
export function rollItemMacro(identifier: string) {
  const speaker = ChatMessage.getSpeaker();
  let actor: SwadeActor | undefined = undefined;
  if (speaker.token) actor = game.actors?.tokens[speaker.token];
  if (!actor && speaker.actor) actor = game.actors?.get(speaker.actor);
  if (!actor?.isOwner) return null;

  if (attributes.has(identifier)) {
    return onRollAttribute(actor, identifier as Attribute);
  }
  return onRollItem(actor, identifier);
}

async function onRollItem(actor: SwadeActor, identifier: string) {
  const item = actor.items.getName(identifier) as SwadeItem;
  if (!item) {
    return ui.notifications.warn(
      `Your controlled Actor does not have an item named ${identifier}`,
    );
  }
  //Roll the skill
  if (item.type === 'skill') {
    return item.roll();
  } else {
    // Show the item
    return item.show();
  }
}

function onRollAttribute(actor: SwadeActor, attribute: Attribute) {
  return actor.rollAttribute(attribute);
}

interface DropData {
  type: string;
  uuid: string;
  attribute?: Attribute;
}
