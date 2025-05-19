import { SWADE } from '../config';

/* eslint-disable @typescript-eslint/naming-convention */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * This class defines a submenu for the system settings which will handle the DSN Settings
 */
export default class DiceSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  config = SWADE.diceConfig;
  customWildDieDefaultColors = this.config.flags.dsnCustomWildDieColors.default;

  static override DEFAULT_OPTIONS = {
    id: 'diceConfig',
    window: {
      title: 'SWADE.DiceConf',
      resizable: false
    },
    position: {
      width: 500,
      height: 'auto' as const
    },
    // TODO: swade-app -> swade-application
    classes: ['swade', 'setting-config', 'dice-so-nice', 'swade-app', 'standard-form'],
    tag: 'form',
    form: {
      handler: DiceSettings.onSubmit,
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
    },
    actions: {
      reset: DiceSettings.#resetSettings
    }
  };

  static override PARTS = {
    form: { template: 'systems/swade/templates/apps/dice-config.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' }
  };

  // TODO: remove once swade-application
  protected override _initializeApplicationOptions(options) {
    if (!options.classes?.includes('themed')) {
      options.classes ??= [];
      options.classes.push('themed', 'theme-light');
    }
    return super._initializeApplicationOptions(options);
  }

  override async _prepareContext(options) {
    const settings: Record<string, any> = {};
    for (const flag in this.config.flags) {
      const defaultValue = this.config.flags[flag].default;
      const value = game.user?.getFlag('swade', flag);
      settings[flag] = {
        module: 'swade',
        key: flag,
        value: typeof value === 'undefined' ? defaultValue : value,
        name: this.config.flags[flag].label || '',
        hint: this.config.flags[flag].hint || '',
        type: this.config.flags[flag].type,
        isCheckbox: this.config.flags[flag].type === Boolean,
        isObject: this.config.flags[flag].type === Object,
      };
      if (flag === 'dsnWildDiePreset') {
        settings[flag].isSelect = true;
        settings[flag].choices = this._prepareSystemList();
      }
      if (flag === 'dsnWildDie') {
        settings[flag].isSelect = true;
        settings[flag].choices = this._prepareColorsetList();
        settings[flag].disabled =
          game.user?.getFlag('swade', 'dsnWildDiePreset') === 'none';
      }
    }

    const context = foundry.utils.mergeObject(await super._prepareContext(options), {
      settings,
      hasCustomWildDie: settings['dsnWildDie'].value !== 'customWildDie',
      noWildDie: game.user?.getFlag('swade', 'dsnWildDiePreset') === 'none',
      textureList: game.dice3d?.exports.Utils.prepareTextureList(),
      fontList: game.dice3d?.exports.Utils.prepareFontList(),
      materialList: this._prepareMaterialList(),
      buttons: [
        { type: 'submit', icon: 'fa-solid fa-save', label: 'SETTINGS.Save' },
        { type: 'reset', action: 'reset', icon: 'fa-solid fa-undo', cssClass: 'submit', label: 'SETTINGS.Reset'}
      ]
    });

    return context;
  }

  static async onSubmit(
    this: DiceSettings,
    event: SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended
  ) {
    const expandedFormData = foundry.utils.expandObject(formData.object) as any;
    const { diceColor, edgeColor, labelColor, outlineColor } = this.customWildDieDefaultColors;
    
    // Handle basic settings
    for (const [key, value] of Object.entries(expandedFormData.swade)) {
      await game.user?.setFlag('swade', key, value);
    }

    // Handle custom Wild Die
    if (expandedFormData.swade.dsnWildDie === 'customWildDie') {
      await game.user?.setFlag('swade', 'dsnCustomWildDieColors', {
        diceColor: expandedFormData.diceColor || diceColor,
        edgeColor: expandedFormData.edgeColor || edgeColor,
        labelColor: expandedFormData.labelColor || labelColor,
        outlineColor: expandedFormData.outlineColor || outlineColor
      });
    }

    this.render({ force: true });
    if (event.submitter) {
      this.close();
      location.reload();
    }
  }

  static async #resetSettings(
    this: DiceSettings,
    _event: PointerEvent,
    _target: HTMLElement
  ) {
    for (const flag in this.config.flags) {
      const resetValue = this.config.flags[flag].default;
      if (game.user?.getFlag('swade', flag) !== resetValue) {
        await game.user?.setFlag('swade', flag, resetValue);
      }
    }
    this.render({ force: true });
  }

  private _prepareSystemList() {
    const systems = game.dice3d!.exports.Utils.prepareSystemList();
    systems.none = game.i18n.localize('SWADE.DSNNone');
    return systems;
  }

  private _prepareColorsetList() {
    return game.dice3d!.exports.Utils.prepareColorsetList();
  }

  private _prepareMaterialList() {
    return {
      auto: 'DICESONICE.MaterialAuto',
      plastic: 'DICESONICE.MaterialPlastic',
      metal: 'DICESONICE.MaterialMetal',
      glass: 'DICESONICE.MaterialGlass',
      wood: 'DICESONICE.MaterialWood',
      chrome: 'DICESONICE.MaterialChrome',
    };
  }
}
