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
  } catch (err) {
    console.log(err);
  }
}
