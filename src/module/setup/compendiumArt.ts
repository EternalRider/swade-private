import { ArtworkMappingFile } from '../../interfaces/ArtworkMapping.interface';
import { Logger } from '../Logger';
import { isObject } from '../util';
/**
 * Thanks goes out to lebombjames and the starfinder system on whose code this is based
 */

/**
 * Pull actor and token art from module.json files, which will replace default images on compendium actors and their
 * prototype tokens.
 *
 *
 * Examples of valid maps
 *
 *  "some.pack-name": {
 *    "someId": {
 *      "actor": "some/path/to/an/image.webp",
 *      "token": {
 *        "img": "some/path/to/an/image.webp",
 *        "scale": 2
 *      }
 *    },
 *    "someOtherId": {
 *      "actor": "some/other/path/to/an/image.webp",
 *      "token": some/other/path/to/an/image.webp"
 *      }
 *    }
 *  }
 *
 */
export async function registerCompendiumArt() {
  game.swade.compendiumArt.map.clear(); // Clear any existing map
  const modules = [...game.modules.entries()].filter(([_key, m]) => m.active); // Get a list of active modules

  for (const [id, module] of modules) {
    const mappingFlag = foundry.utils.getProperty(
      module,
      `flags.${id}.swade-art`,
    );
    const moduleArt = await getArtMap(mappingFlag); // Get maps from any active modules
    if (!moduleArt) continue;

    for (const [packName, art] of Object.entries(moduleArt)) {
      const pack = game.packs.get(packName);
      if (!pack) {
        Logger.warn(
          `Failed pack lookup from module art registration (${id}): ${packName}`,
        );
        continue;
      }

      const index = pack.indexed ? pack.index : await pack.getIndex();
      for (const [actorId, paths] of Object.entries(art)) {
        const record = index.get(actorId); // Find the current actor in the index
        if (!record) continue;

        record.img = paths.actor; // Set the actor's art in the index, which is used by compendium windows
        game.swade.compendiumArt.map.set(
          `Compendium.${packName}.${actorId}`,
          paths,
        ); // Push the actor ID and art to the map
      }
    }
  }
}

/**
 *
 * @param {object|string|null} art Either an art mapping object, or a file path to a JSON.
 * @returns {object|null} An art object, or null
 */
async function getArtMap(art): Promise<ArtworkMappingFile | null> {
  if (!art) {
    return null;
  } else if (isArtMappingObject(art)) {
    return art;
  } else if (typeof art === 'string') {
    // Instead of being in a module.json file, the art map is in a separate JSON file referenced by path
    try {
      const response = (await foundry.utils.fetchJsonWithTimeout(
        art,
      )) as ArtworkMappingFile;
      if (!response) {
        Logger.warn(`Failed loading art mapping file at ${art}`);
        return null;
      }
      return isArtMappingObject(response) ? response : null;
    } catch (error) {
      if (error instanceof Error) {
        Logger.warn(error.message);
      }
    }
  }

  return null;
}

/**
 *
 * @param {object} record An art object
 * @returns {boolean} Whether the object is a valid compendium art object or not
 */
function isArtMappingObject(record: ArtworkMappingFile): boolean {
  return (
    isObject(record) && // Ensure the map is an object
    Object.values(record).every(
      (packToArt) =>
        isObject(packToArt) && // Ensure each entry is an object with a pack name
        Object.values(packToArt).every(
          (art) =>
            (isObject(art) && // Ensure each within the pack object is an object with an actor ID
              typeof art.actor === 'string') || // Within an actor object, there must be an actor string, which is a file path
            (isObject(art.token) &&
              typeof art.token.img === 'string' &&
              typeof art.token === 'string' && // token can be a file path, or an object containing the file path and the token scale
              (art.token.scale === undefined ||
                typeof art.token.scale === 'number')),
        ),
    )
  );
}
