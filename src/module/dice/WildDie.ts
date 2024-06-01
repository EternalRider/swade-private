export default class WildDie extends Die {
  static get defaultTermData() {
    return {
      number: 1,
      faces: 6,
      modifiers: ['x'],
      options: { flavor: game.i18n.localize('SWADE.WildDie') },
    };
  }
  constructor(termData?: Partial<Die.TermData>) {
    termData = foundry.utils.mergeObject(WildDie.defaultTermData, termData);
    const user = game.user;
    if (game.dice3d) {
      // Get the user's configured Wild Die data.
      const dieSystem = user?.getFlag('swade', 'dsnWildDiePreset') || 'none';
      const colorSet = user?.getFlag('swade', 'dsnWildDie');
      // If the color preset is not none
      if (dieSystem !== 'none') {
        // If dieSystem is defined... (new users might not have one defined)
        if (dieSystem) {
          // Set the color preset.
          setProperty(termData, 'options.colorset', colorSet);
          // Set the system value.
          setProperty(termData, 'options.appearance.system', dieSystem);
          // Get the die model for the respective die type
          const dicePreset = game.dice3d?.DiceFactory?.systems[
            dieSystem
          ]?.dice?.find((d) => d.type === `d${termData?.faces}`);
          if (dicePreset) {
            if (dicePreset.modelFile && !dicePreset.modelLoaded) {
              // Load the modelFile
              dicePreset.loadModel(game.dice3d?.DiceFactory.loaderGLTF);
            }
            dicePreset.loadTextures();
          }
        }
      }
    }
    super(termData);
  }
}
