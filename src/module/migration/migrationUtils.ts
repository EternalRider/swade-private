import { Logger } from '../Logger';

export async function triggerServersideMigration(
  pack: foundry.documents.collections.CompendiumCollection<'Actor' | 'Item' | 'Scene'>
) {
  if (!game.user?.isGM) throw new Error();
  const collection = pack.collection;
  Logger.debug(`Beginning migration for Compendium pack ${collection}, please be patient.`);
  await foundry.helpers.SocketInterface.dispatch('manageCompendium', {
    action: 'migrate',
    data: collection,
  });
  Logger.debug(`Successfully migrated Compendium pack ${collection}.`);
  return pack;
}
