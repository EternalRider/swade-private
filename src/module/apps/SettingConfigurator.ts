import { AdditionalStats } from '../../globals';
import { SWADE } from '../config';

export default class SettingConfigurator extends FormApplication<
  FormApplicationOptions,
  any,
  undefined
> {
  config: typeof SWADE.settingConfig;
  settingStats: any;
  constructor() {
    super();
    this.config = SWADE.settingConfig;
  }

  static get defaultOptions(): FormApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'settingConfig',
      title: game.i18n.localize('SWADE.SettingConf'),
      template: 'systems/swade/templates/apps/setting-config.hbs',
      classes: ['setting-config', 'sheet', 'swade-app'],
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'basics',
        },
      ],
      scrollY: ['.sheet-body .tab'],
      width: 600,
      height: 700,
      resizable: false,
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
    });
  }

  getData(): any {
    const settingFields = game.settings.get('swade', 'settingFields');
    const data = {
      settingRules: {},
      actorSettingStats: settingFields.actor,
      itemSettingStats: settingFields.item,
      dice3d: !!game.dice3d,
      dtypes: {
        String: 'SWADE.String',
        Number: 'SWADE.Number',
        Boolean: 'SWADE.Checkbox',
        Die: 'SWADE.Die',
        Selection: 'SWADE.Selection',
      },
      coreSkillPackChoices: this._buildCoreSkillPackChoices(),
      actionDeckChoices: this._buildActionDeckChoices(),
      discardPileChoices: this._buildActionDeckDiscardPileChoices(),
    };
    for (const setting of this.config.settings) {
      data.settingRules[setting] = game.settings.get('swade', setting);
    }
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('#reset').click(() => this._resetSettings());
    html.find('#submit').click(() => this.close());
    html
      .find('.attributes')
      .on('click', '.attribute-control', (e) =>
        this._onClickAttributeControl(e),
      );
  }

  async _updateObject(event, formData) {
    //Gather Data
    const expandedFormdata = expandObject(formData);
    const formActorAttrs = expandedFormdata.actorSettingStats || {};
    const formItemAttrs = expandedFormdata.itemSettingStats || {};

    //Set the "easy" settings
    for (const key in expandedFormdata.settingRules) {
      const settingValue = expandedFormdata.settingRules[key];
      if (
        this.config.settings.includes(key) &&
        settingValue !== game.settings.get('swade', key)
      ) {
        await game.settings.set('swade', key, settingValue);
      }
    }

    // Handle the free-form attributes list
    const settingFields = game.settings.get('swade', 'settingFields');
    const actorStats = this._handleKeyValidityCheck(formActorAttrs);
    const itemStats = this._handleKeyValidityCheck(formItemAttrs);
    const saveValue = {
      actor: this._handleRemovableAttributes(actorStats, settingFields.actor),
      item: this._handleRemovableAttributes(itemStats, settingFields.item),
    };
    await game.settings.set('swade', 'settingFields', saveValue);

    this.render(true);
  }

  async _resetSettings() {
    for (const setting of this.config.settings) {
      const resetValue = game.settings.settings.get(
        `swade.${setting}`,
      )!.default;
      if (game.settings.get('swade', setting) !== resetValue) {
        await game.settings.set('swade', setting, resetValue);
      }
    }
    this.render(true);
  }

  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const settingFields = game.settings.get('swade', 'settingFields') as any;
    const form = this.form;

    // Add new attribute
    if (action === 'createChar') {
      const nk = Object.keys(settingFields.actor).length + 1;
      const newElement = document.createElement('div');
      newElement.innerHTML = `<input type="text" name="actorSettingStats.attr${nk}.key" value="attr${nk}"/>`;
      const newKey = newElement.children[0];
      form?.appendChild(newKey);
      await this._onSubmit(event);
      this.render(true);
    }

    if (action === 'createItem') {
      const nk = Object.keys(settingFields.item).length + 1;
      const newElement = document.createElement('div');
      newElement.innerHTML = `<input type="text" name="itemSettingStats.attr${nk}.key" value="attr${nk}"/>`;
      const newKey = newElement.children[0];
      form?.appendChild(newKey);
      await this._onSubmit(event);
      this.render(true);
    }

    // Remove existing attribute
    if (action === 'delete') {
      const li = a.closest('.attribute');
      li.parentElement.removeChild(li);
      this._onSubmit(event).then(() => this.render(true));
    }
  }

  private _handleKeyValidityCheck(stats: AdditionalStats) {
    const retVal: AdditionalStats = {};
    for (const stat of Object.values(stats)) {
      let key = stat.key!.trim();
      if (/[\s.]/.test(key)) {
        const invalidKey = key;
        key = key.slugify().replace('.', '-');
        ui.notifications.warn(
          `Additional Stat key ${invalidKey} is invalid and has been changed to ${key}`,
          { permanent: true },
        );
      }
      delete stat.key;
      retVal[key] = stat;
    }
    return retVal;
  }

  /**
   * Remove attributes which are no longer use
   * @param attributes
   * @param base
   */
  private _handleRemovableAttributes(
    attributes: AdditionalStats,
    base: AdditionalStats,
  ) {
    for (const k of Object.keys(base)) {
      if (!attributes.hasOwnProperty(k)) {
        delete attributes[k];
      }
    }
    return attributes;
  }

  private _buildCoreSkillPackChoices() {
    return game.packs
      ?.filter((p) => {
        const index = Array.from(p.index.values()).filter(
          //remove the CF entities
          (e) => e.name !== '#[CF_tempEntity]',
        );
        const isItem = p.metadata.type === 'Item';
        return isItem && index.every((v) => v['type'] === 'skill');
      })
      .reduce((acc, p) => {
        let packName = 'System';
        if (p.metadata['packageType'] !== 'system') {
          packName = game.modules.get(p.metadata['packageName'])?.['title'];
        }
        acc[p.collection] = `${p.metadata.label} (${packName})`;
        return acc;
      }, {} as Record<string, string>);
  }

  private _buildActionDeckChoices() {
    const deckChoices: Record<string, string> = {};
    game.cards
      ?.filter((stack) => {
        const cards = Array.from(stack.cards.values());
        return stack.type === 'deck' && cards.every((c) => c.type === 'poker');
      })
      .forEach((d) => (deckChoices[d.id] = d.name!));
    return deckChoices;
  }

  private _buildActionDeckDiscardPileChoices() {
    const discardPiles: Record<string, string> = {};
    game.cards
      ?.filter((stack) => stack.type === 'pile')
      .forEach((p) => (discardPiles[p.id] = p.name!));
    return discardPiles;
  }
}
