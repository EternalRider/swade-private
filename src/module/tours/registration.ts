import SwadeTour from './SwadeTour';

export default async function registerSWADETours() {
  try {
    game.tours.register(
      'swade',
      'ammunition',
      await SwadeTour.fromJSON('/systems/swade/tours/ammunition.json'),
    );
    game.tours.register(
      'swade',
      'tweaks',
      await SwadeTour.fromJSON('/systems/swade/tours/tweaks.json'),
    );
    game.tours.register(
      'swade',
      'additional-stats',
      await SwadeTour.fromJSON('/systems/swade/tours/additional-stats.json'),
    );
    game.tours.register(
      'swade',
      'auras',
      await SwadeTour.fromJSON('/systems/swade/tours/auras.json'),
    );
    game.tours.register(
      'swade',
      'advances',
      await SwadeTour.fromJSON('systems/swade/tours/advances.json'),
    );
    game.tours.register(
      'swade',
      'headquarters',
      await SwadeTour.fromJSON('systems/swade/tours/headquarters.json'),
    );
  } catch (err) {
    console.log(err);
  }
}
