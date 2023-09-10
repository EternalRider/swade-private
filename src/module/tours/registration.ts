import SwadeTour from './SwadeTour';

export default async function registerSWADETours() {
  try {
    game.tours.register(
      'swade',
      'ammunition',
      await SwadeTour.fromJSON('/systems/swade/tours/ammunition.json'),
    );
  } catch (err) {
    console.log(err);
  }
}
