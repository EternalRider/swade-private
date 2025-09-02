import { AdditionalStats } from '../../globals';
import { SWADE } from '../config';
import SwadeCards from '../documents/card/SwadeCards';

/* eslint-disable @typescript-eslint/naming-convention */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class SettingConfigurator extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  config = SWADE.settingConfig;

  static override DEFAULT_OPTIONS = {
    id: 'settingConfig',
    window: {
      title: 'SWADE.SettingConf',
      resizable: false,
      contentClasses: ['standard-form'],
    },
    position: {
      width: 600,
      height: 700,
    },
    classes: ['setting-config', 'sheet', 'swade-application'],
    tag: 'form',
    form: {
      handler: SettingConfigurator.onSubmit,
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
    },
    actions: {
      reset: SettingConfigurator.#resetSettings,
      createChar: SettingConfigurator.#onCreateChar,
      createItem: SettingConfigurator.#onCreateItem,
      delete: SettingConfigurator.#onDelete,
    },
  };

  static override PARTS = {
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    basics: {
      template: 'systems/swade/templates/apps/configurator/basics.hbs',
      scrollable: [''],
    },
    setting: {
      template: 'systems/swade/templates/apps/configurator/setting.hbs',
      scrollable: [''],
    },
    bennies: {
      template: 'systems/swade/templates/apps/configurator/bennies.hbs',
      scrollable: [''],
    },
    additionalStats: {
      template:
        'systems/swade/templates/apps/configurator/additional-stats.hbs',
      scrollable: [''],
    },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  static override TABS = {
    sheet: {
      tabs: [
        { id: 'basics', label: 'SWADE.WorldBasics' },
        { id: 'setting', label: 'SWADE.SettingRules' },
        { id: 'bennies', label: 'SWADE.Bennies' },
        { id: 'additionalStats', label: 'SWADE.AddStats' },
      ],
      initial: 'basics',
    },
  };

  override async _prepareContext(options) {
    const settingFields = game.settings.get('swade', 'settingFields');
    const context = foundry.utils.mergeObject(
      await super._prepareContext(options),
      {
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
        coreSkillPackChoices: this.#buildCoreSkillPackChoices(),
        actionDeckChoices: this.#buildActionDeckChoices(),
        discardPileChoices: this.#buildActionDeckDiscardPileChoices(),
        injuryTableChoices: await this.#buildInjuryTableChoices(),
        armorStackingChoices: this.#getArmorStackingChoices(),
        wealthTypes: this.#getWealthTypes(),
        buttons: [
          { type: 'submit', icon: 'fa-solid fa-save', label: 'SETTINGS.Save' },
          {
            type: 'reset',
            action: 'reset',
            icon: 'fa-solid fa-undo',
            cssClass: 'submit',
            label: 'SETTINGS.Reset',
          },
        ],
      },
    );
    for (const setting of this.config.settings) {
      context.settingRules[setting] = game.settings.get('swade', setting);
    }
    return context;
  }

  override async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(
      partId,
      context,
      options,
    );
    if (partId in partContext.tabs) partContext.tab = partContext.tabs[partId];
    return partContext;
  }

  static async onSubmit(
    this: SettingConfigurator,
    event: SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended,
  ) {
    // Gather Data
    const expandedFormData = foundry.utils.expandObject(formData.object);
    const formActorAttrs = expandedFormData.actorSettingStats || {};
    const formItemAttrs = expandedFormData.itemSettingStats || {};

    // Set the "easy" settings
    for (const [key, settingValue] of Object.entries(
      expandedFormData.settingRules,
    )) {
      if (
        this.config.settings.includes(key) &&
        settingValue !== game.settings.get('swade', key)
      ) {
        await game.settings.set('swade', key, settingValue);
      }
    }

    // Handle the free-form attributes list
    const settingFields = game.settings.get('swade', 'settingFields');
    const actorStats = this.#handleKeyValidityCheck(formActorAttrs);
    const itemStats = this.#handleKeyValidityCheck(formItemAttrs);
    const saveValue = {
      actor: this.#handleRemovableAttributes(actorStats, settingFields.actor),
      item: this.#handleRemovableAttributes(itemStats, settingFields.item),
    };
    await game.settings.set('swade', 'settingFields', saveValue);

    await this.render({ force: true });

    if (event.submitter) this.close();
  }

  static async #resetSettings(
    this: SettingConfigurator,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    for (const setting of this.config.settings) {
      const resetValue = game.settings.settings.get(
        `swade.${setting}`,
      )!.default;
      if (game.settings.get('swade', setting) !== resetValue) {
        await game.settings.set('swade', setting, resetValue);
      }
    }
    this.render({ force: true });
  }

  async #createHelper(event: PointerEvent, isItem: boolean) {
    const documentType = isItem ? 'item' : 'actor';
    event.preventDefault();
    const settingFields = game.settings.get('swade', 'settingFields') as any;
    const form = this.form;
    const nk = Object.keys(settingFields[documentType]).length + 1;
    const newElement = document.createElement('div');
    newElement.innerHTML = `<input type="text" name="${documentType}SettingStats.attr${nk}.key" value="attr${nk}"/>`;
    const newKey = newElement.children[0];
    form
      ?.querySelector('[data-application-part="additionalStats"]')
      ?.appendChild(newKey);
    await this._onSubmitForm(this.options.form!, event);
    await this.render({ force: true });
  }

  static async #onCreateChar(
    this: SettingConfigurator,
    event: PointerEvent,
    _target: HTMLElement,
  ) {
    await this.#createHelper(event, false);
  }

  static async #onCreateItem(
    this: SettingConfigurator,
    event: PointerEvent,
    _target: HTMLElement,
  ) {
    await this.#createHelper(event, true);
  }

  static async #onDelete(
    this: SettingConfigurator,
    event: PointerEvent,
    target: HTMLElement,
  ) {
    event.preventDefault();
    const li = target.closest('.attribute');
    if (li) li.parentElement?.removeChild(li);
    await this._onSubmitForm(this.options.form!, event);
    this.render({ force: true });
  }

  #handleKeyValidityCheck(stats: AdditionalStats) {
    const retVal: AdditionalStats = {};
    for (const stat of Object.values(stats)) {
      let key = stat.key!.trim();
      if (/[\s.]/.test(key)) {
        const invalidKey = key;
        key = key.slugify().replace('.', '-');
        ui.notifications.warn(
          game.i18n.format('SWADE.AdditionalStats.KeyErr', {
            invalid: invalidKey,
            key: key,
          }),
          { permanent: true },
        );
      }
      delete stat.key;
      retVal[key] = stat;
    }
    return retVal;
  }

  /**
   * Remove attributes which are no longer in use.
   * @param attributes
   * @param base
   */
  #handleRemovableAttributes(
    attributes: AdditionalStats,
    base: AdditionalStats,
  ) {
    if (!attributes || !base) return {};
    for (const k of Object.keys(base)) {
      if (!attributes.hasOwnProperty(k)) {
        delete attributes[k];
      }
    }
    return attributes;
  }

  #getArmorStackingChoices(): Record<string, string> {
    return {
      core: 'SWADE.Settings.ArmorStacking.Choices.Core',
      swpf: 'SWADE.Settings.ArmorStacking.Choices.SWPF',
    };
  }

  #getWealthTypes(): Record<string, string> {
    return {
      currency: 'SWADE.Currency',
      wealthDie: 'SWADE.WealthDie.Label',
      none: 'SWADE.WealthSelectionNoneOther',
    };
  }

  #buildCoreSkillPackChoices() {
    const packChoices = Array();

    const packs = game.packs?.filter((p) => {
      const index = Array.from(p.index.values()).filter(
        // Remove the CF entities
        (e) => e.name !== '#[CF_tempEntity]',
      );
      const isItem = p.metadata.type === 'Item';
      return isItem && index.every((v) => v['type'] === 'skill');
    });

    for (const p of packs) {
      let packName = game.i18n.localize('System');
      if (p.metadata['packageType'] === 'world') {
        packName = game.i18n.localize('World');
      } else if (p.metadata['packageType'] !== 'system') {
        packName = game.modules.get(p.metadata['packageName'])?.['title'];
      }
      packChoices.push({ key: p.collection, label: `${p.metadata.label} (${packName})` });
    }

    return packChoices;
  }

  #buildActionDeckChoices() {
    const deckChoices: Record<string, string> = {};
    game.cards
      ?.filter((stack: SwadeCards) => {
        const cards = Array.from(stack.cards.values());
        return stack.type === 'deck' && cards.every((c) => c.type === 'poker');
      })
      .forEach((d) => (deckChoices[d.id] = d.name!));
    return deckChoices;
  }

  #buildActionDeckDiscardPileChoices() {
    const discardPiles: Record<string, string> = {};
    game.cards
      ?.filter((stack) => stack.type === 'pile')
      .forEach((p) => (discardPiles[p.id] = p.name!));
    return discardPiles;
  }

  #buildInjuryTableChoices(): OptionGroup[] {
    const injuryTables: OptionGroup[] = [];

    //add world tables, if necessary
    if (game.tables?.contents.length) {
      injuryTables.push({
        group: game.i18n.localize('SWADE.SettingConfigurator.WorldTables'),
        options: game.tables!.contents.map((t) => {
          return { key: t.uuid as string, label: t.name as string };
        }),
      });
    }

    const rollTablePacks = game.packs.filter(
      (p) => p.metadata.type === 'RollTable',
    );
    const worldPacks = rollTablePacks.filter(
      (p) => p.metadata.packageType === 'world',
    );

    //add world compendium packs, if necessary
    if (worldPacks.length) {
      injuryTables.push({
        group: game.i18n.localize('SWADE.SettingConfigurator.WorldCompendiums'),
        options: worldPacks
          .flatMap((p) => p.index.contents)
          .map((i) => {
            return { key: i.uuid as string, label: i.name as string };
          }),
      });
    }

    //add an entry for every module, if necessary
    for (const module of game.modules.values()) {
      const packs = rollTablePacks.filter(
        (p) => p.metadata.packageName === module.id,
      );
      if (!packs.length) continue;
      injuryTables.push({
        group: module.title!,
        options: packs
          .flatMap((p) => p.index.contents)
          .map((i) => {
            return { key: i.uuid as string, label: i.name as string };
          }),
      });
    }

    injuryTables.sort((a, b) => a.group.localeCompare(b.group));
    return injuryTables;
  }
}

interface OptionGroup {
  group: string;
  options: GroupOptions;
}
type GroupOptions = Array<{ key: string; label: string }>;
