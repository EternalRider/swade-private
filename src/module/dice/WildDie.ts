import { DeepPartial } from 'fvtt-types/utils';

export default class WildDie extends foundry.dice.terms.Die {
  static override DENOMINATION = 'w';

  static get defaultTermData(): DeepPartial<foundry.dice.terms.Die.TermData> {
    return {
      number: 1,
      faces: 6,
      modifiers: ['x'],
      options: { flavor: game.i18n.localize('SWADE.WildDie') },
    };
  }

  override get denomination() {
    return `dw${this.faces !== 6 ? this.faces : ''}`;
  }

  override get formula(): string {
    return '1dw' + this.faces;
  }

  constructor(termData: TermData = {}) {
    termData = { ...WildDie.defaultTermData, ...termData };
    termData.modifiers = WildDie.defaultTermData.modifiers;

    //In order to make wild dice have variable sides we need to work around the current parsing, which treats the side as a modifier
    if (typeof termData.faces !== 'number') {
      //first grab the modifiers from the formula
      const modifiers: string | undefined = termData.formula?.match(
        WildDie.REGEXP,
      )[3];
      //find the first number from the modifier string, that's our sides.
      const match = modifiers?.match(/\d+/);

      const potentialFaces = match?.at(0) ?? null;
      termData.faces = Number.isNumeric(potentialFaces)
        ? Number(potentialFaces)
        : WildDie.defaultTermData.faces;
    }

    const user = game.user;
    if (game.dice3d?.DiceFactory) {
      // Get the user's configured Wild Die data.
      const dieSystem = user?.getFlag('swade', 'dsnWildDiePreset') || 'none';
      const colorSet = user?.getFlag('swade', 'dsnWildDie');
      // If the color preset is not none
      if (dieSystem !== 'none') {
        // If dieSystem is defined... (new users might not have one defined)
        if (dieSystem) {
          // Set the color preset.
          foundry.utils.setProperty(termData, 'options.colorset', colorSet);
          // Set the system value.
          foundry.utils.setProperty(
            termData,
            'options.appearance.system',
            dieSystem,
          );
          // Get the die model for the respective die type
          const dicePreset = game.dice3d.DiceFactory.systems
            .get(dieSystem)
            ?.dice.get(`d${termData?.faces}`);
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

type TermData = DeepPartial<foundry.dice.terms.Die.TermData>;
