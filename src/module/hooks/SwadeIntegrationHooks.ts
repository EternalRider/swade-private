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
      (d: foundry.dice.terms.RollTerm) =>
        d.options.flavor === game.i18n.localize('SWADE.WildDie'),
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
      foundry.utils.setProperty(
        wildDie,
        'options.appearance',
        customAppearance,
      );
    } else {
      // Set the preset
      foundry.utils.setProperty(wildDie, 'options.colorset', colorSet);
    }
    // Get the dicePreset for the given die type
    const dicePreset = game.dice3d?.DiceFactory.systems
      .get(dieSystem)
      ?.dice.get('d' + wildDie.faces);
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

  static onItemPilesReady() {
    const versions = {
      '5.0.0': {
        VERSION: '1.1.0',

        // The actor class type is the type of actor that will be used for the default item pile actor that is created on first item drop.
        ACTOR_CLASS_TYPE: 'npc',

        // The item class type is the type of item that will be used for the default loot item
        ITEM_CLASS_LOOT_TYPE: '',

        // The item class type is the type of item that will be used for the default weapon item
        ITEM_CLASS_WEAPON_TYPE: 'weapon',

        // The item class type is the type of item that will be used for the default equipment item
        ITEM_CLASS_EQUIPMENT_TYPE: 'gear',

        // The item quantity attribute is the path to the attribute on items that denote how many of that item that exists
        ITEM_QUANTITY_ATTRIBUTE: 'system.quantity',

        // The item price attribute is the path to the attribute on each item that determine how much it costs
        ITEM_PRICE_ATTRIBUTE: 'system.price',

        // Item types and the filters actively remove items from the item pile inventory UI that users cannot loot, such as spells, feats, and classes
        ITEM_FILTERS: [
          {
            path: 'type',
            filters: 'ancestry,edge,hindrance,skill,power,ability,action',
          },
        ],

        // Item similarities determines how item piles detect similarities and differences in the system
        ITEM_SIMILARITIES: ['name', 'type', 'system.swid'],

        // Currencies in item piles is a versatile system that can accept actor attributes (a number field on the actor's sheet) or items (actual items in their inventory)
        // In the case of attributes, the path is relative to the actor
        // In the case of items, it is recommended you export the item with `.toObject()` and strip out any module data
        CURRENCIES: [
          {
            type: 'attribute',
            name: 'SWADE.Currency',
            img: 'icons/svg/coins.svg',
            abbreviation: '{#}T',
            data: {
              path: 'system.details.currency',
            },
            primary: true,
            exchangeRate: 1,
          },
        ],

        CURRENCY_DECIMAL_DIGITS: 0.01,
      },
    };

    const data = Object.entries(versions).find(([version]) => {
      return foundry.utils.isNewerVersion(game.system.version, version);
    });

    if (!data) return;

    // @ts-expect-error This always exists if this function is called, bot not necessarily otherwise
    return game.itempiles.API.addSystemIntegration(data[1]);
  }
}
