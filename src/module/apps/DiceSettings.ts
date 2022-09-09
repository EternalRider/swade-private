import { SWADE } from '../config';

/**
 * This class defines a submenu for the system settings which will handle the DSN Settings
 */
export default class DiceSettings extends FormApplication<
  FormApplicationOptions,
  any,
  undefined
> {
  config: any;
  customWildDieDefaultColors: any;
  constructor() {
    super();
    this.config = SWADE.diceConfig;
    this.customWildDieDefaultColors =
      this.config.flags.dsnCustomWildDieColors.default;
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: SWADE.diceConfig.id,
      title: SWADE.diceConfig.title,
      template: 'systems/swade/templates/apps/dice-config.hbs',
      classes: ['swade', 'dice-config', 'dice-so-nice', 'swade-app'],
      width: 500,
      height: 'auto' as const,
      resizable: false,
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
    };
  }

  /**
   * @override
   */
  activateListeners(html: JQuery) {
    super.activateListeners(html);

    html.find('#reset').on('click', () => this._resetSettings());
    html
      .find('#submit')
      .on('click', () => this.close().then(() => location.reload()));
  }

  /**
   * @override
   */
  getData(): any {
    const settings = {};
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
      if (flag === 'dsnWildDie') {
        settings[flag].isSelectOptGroup = true;
        settings[flag].groups = this._prepareColorsetList();
      }
    }

    const data = {
      settings,
      hasCustomWildDie: settings['dsnWildDie'].value !== 'customWildDie',
      textureList: game.dice3d?.exports.Utils.prepareTextureList(),
      fontList: game.dice3d?.exports.Utils.prepareFontList(),
      materialList: this._prepareMaterialList(),
    };

    return data;
  }

  async _updateObject(_event, formData): Promise<void> {
    const expandedFormdata = expandObject(formData) as any;
    //handle basic settings
    for (const [key, value] of Object.entries(expandedFormdata.swade)) {
      //handle custom wild die
      if (expandedFormdata.swade.dsnWildDie === 'customWildDie') {
        await game.user?.setFlag('swade', 'dsnCustomWildDieColors', {
          diceColor:
            expandedFormdata.diceColor ||
            this.customWildDieDefaultColors.diceColor,
          edgeColor:
            expandedFormdata.edgeColor ||
            this.customWildDieDefaultColors.edgeColor,
          labelColor:
            expandedFormdata.labelColor ||
            this.customWildDieDefaultColors.labelColor,
          outlineColor:
            expandedFormdata.outlineColor ||
            this.customWildDieDefaultColors.outlineColor,
        });
      }
      await game.user?.setFlag('swade', key, value);
    }
    this.render(true);
  }

  async _resetSettings() {
    for (const flag in this.config.flags) {
      const resetValue = this.config.flags[flag].default;
      if (game.user?.getFlag('swade', flag) !== resetValue) {
        await game.user?.setFlag('swade', flag, resetValue);
      }
    }
    this.render(true);
  }

  private _prepareColorsetList() {
    const dsnList = game.dice3d!.exports.Utils.prepareColorsetList();
    delete dsnList.Colors.custom;
    dsnList.Colors.none = game.i18n.localize('SWADE.DSNNone');
    return dsnList;
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
