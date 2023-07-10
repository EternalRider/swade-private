import { Logger } from '../Logger';

export async function triggerServersideMigration(
  pack: CompendiumCollection<CompendiumCollection.Metadata>,
) {
  if (!game.user?.isGM) throw new Error();
  const collection = pack.collection;
  Logger.debug(
    `Beginning migration for Compendium pack ${collection}, please be patient.`,
  );
  await SocketInterface.dispatch('manageCompendium', {
    type: collection,
    action: 'migrate',
    data: collection,
  });
  Logger.debug(`Successfully migrated Compendium pack ${collection}.`);
  return pack;
}
