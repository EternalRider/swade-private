import {
  DsnCustomWildDieColors,
  DsnCustomWildDieOptions,
} from '../../interfaces/DiceIntegration interface';
import { Dice3D } from '../../types/DiceSoNice';
import DiceSettings from '../apps/DiceSettings';
import { PACKAGE_ID, SWADE } from '../config';
import SwadeUser from '../documents/SwadeUser';

/** Hook callbacks for third-party integrations */
export default class SwadeIntegrationHooks {
  static onDiceSoNiceInit(_dice3d: Dice3D) {
    game.settings.registerMenu('swade', 'dice-config', {
      name: game.i18n.localize('SWADE.DiceConf'),
      label: game.i18n.localize('SWADE.DiceConfLabel'),
      hint: game.i18n.localize('SWADE.DiceConfDesc'),
      icon: 'fas fa-dice',
      type: DiceSettings,
      restricted: false,
    });
  }

  static onDiceSoNiceReady(dice3d: Dice3D) {
    const customWilDieColors =
      game.user!.getFlag('swade', 'dsnCustomWildDieColors') ||
      (SWADE.diceConfig.flags.dsnCustomWildDieColors
        .default as DsnCustomWildDieColors);

    const customWilDieOptions =
      game.user!.getFlag('swade', 'dsnCustomWildDieOptions') ||
      (SWADE.diceConfig.flags.dsnCustomWildDieOptions
        .default as DsnCustomWildDieOptions);

    dice3d.addSystem(
      { id: 'swade', name: 'Savage Worlds Adventure Edition' },
      'preferred',
    );

    dice3d.addColorset(
      {
        name: 'customWildDie',
        description: 'SWADE.CustomWildDie',
        category: 'DICESONICE.Colors',
        foreground: customWilDieColors.labelColor,
        background: customWilDieColors.diceColor,
        outline: customWilDieColors.outlineColor,
        edge: customWilDieColors.edgeColor,
        texture: customWilDieOptions.texture,
        material: customWilDieOptions.material,
        font: customWilDieOptions.font,
      },
      'no',
    );

    dice3d.addDicePreset(
      {
        type: 'db',
        system: 'swade',
        colorset: 'black',
        labels: [
          game.settings.get('swade', 'bennyImage3DFront'),
          game.settings.get('swade', 'bennyImage3DBack'),
        ].filter(Boolean),
        bumpMaps: [
          game.settings.get('swade', '3dBennyFrontBump'),
          game.settings.get('swade', '3dBennyBackBump'),
        ].filter(Boolean),
      },
      'd2',
    );
  }

  static onDiceSoNiceRollStart(_messageId: string, context: any) {
    const user = context.user as SwadeUser;
    if (user.id === game.userId) return;
    const wildDie = context.roll.terms.find(
      (d) => d.options.flavor === game.i18n.localize('SWADE.WildDie'),
    );

    const dieSystem = wildDie?.options?.appearance?.system;
    //return early if the colorset is none
    if (!dieSystem || dieSystem === 'none') return;

    const colorSet = wildDie.options.colorset;
    if (colorSet === 'customWildDie') {
      // Build the custom appearance and set it
      const customColors = user.getFlag('swade', 'dsnCustomWildDieColors');
      const customOptions = user.getFlag('swade', 'dsnCustomWildDieOptions');
      const customAppearance = {
        colorset: 'custom',
        foreground: customColors?.labelColor,
        background: customColors?.diceColor,
        edge: customColors?.edgeColor,
        outline: customColors?.outlineColor,
        font: customOptions?.font,
        material: customOptions?.material,
        texture: customOptions?.texture,
        system: dieSystem,
      };
      setProperty(wildDie, 'options.appearance', customAppearance);
    } else {
      // Set the preset
      setProperty(wildDie, 'options.colorset', colorSet);
    }
    // Get the dicePreset for the given die type
    const dicePreset = game.dice3d?.DiceFactory.systems[dieSystem].dice.find(
      (d) => d.type === 'd' + wildDie.faces,
    );
    if (!dicePreset) return;
    if (dicePreset?.modelFile && !dicePreset.modelLoaded) {
      // Load the modelFile
      dicePreset.loadModel(game.dice3d?.DiceFactory.loaderGLTF);
    }
    // Load the textures
    dicePreset.loadTextures();
  }

  static onDevModeReady({ registerPackageDebugFlag }: DevModeApi) {
    registerPackageDebugFlag(PACKAGE_ID);
  }
}
