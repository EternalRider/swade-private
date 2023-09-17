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
  } catch (err) {
    console.log(err);
  }
}
