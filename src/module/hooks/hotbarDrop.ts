import SwadeItem from '../documents/item/SwadeItem';

export async function onHotbarDrop(
  _hotbar: Hotbar,
  data: { type: string; uuid: string },
  slot: number,
) {
  // Create a Macro from an Item drop.
  if (data.type !== 'Item') {
    return ui.notifications.warn('SWADE.HotbarDropOwnedItemWarning', {
      localize: true,
    });
  }
  const item = (await fromUuid(data.uuid)) as SwadeItem;
  // Create the macro command
  const macro = await CONFIG.Macro.documentClass.create({
    name: item?.name as string,
    type: CONST.MACRO_TYPES.SCRIPT,
    img: item?.img as string,
    command: `game.swade.rollItemMacro("${item?.name}");`,
  });
  await game.user?.assignHotbarMacro(macro!, slot);
}
