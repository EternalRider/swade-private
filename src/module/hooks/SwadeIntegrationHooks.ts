import {
  DsnCustomWildDieColors,
  DsnCustomWildDieOptions,
} from '../../interfaces/DiceIntegration interface';
import { Dice3D } from '../../types/DiceSoNice';
import DiceSettings from '../apps/DiceSettings';
import { PACKAGE_ID, SWADE } from '../config';

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
    const currentDSNVersion = game.modules!.get('dice-so-nice').version;
    if (isNewerVersion(currentDSNVersion, '4.5.0')) {
      //TODO: Remove with swade v1.2
      SWADE.dsnColorSets = game?.dice3d!.exports.COLORSETS;
      SWADE.dsnTextureList = game?.dice3d!.exports.TEXTURELIST;
    } else {
      import(foundry.utils.getRoute('/modules/dice-so-nice/DiceColors.js'))
        .then((obj) => {
          SWADE.dsnColorSets = obj.COLORSETS;
          SWADE.dsnTextureList = obj.TEXTURELIST;
        })
        .catch((err) => console.error(err));
    }

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
        description: 'DICESONICE.ColorCustom',
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

  static onDevModeReady({ registerPackageDebugFlag }: DevModeApi) {
    registerPackageDebugFlag(PACKAGE_ID);
  }
}
