import type { HeadquartersData } from '../../data/journal';

export default class JournalHeadquartersPageSheet extends foundry.applications.sheets.journal.JournalEntryPageHandlebarsSheet {
  static DEFAULT_OPTIONS = {
    classes: ['headquarters-journal'],
    form: {
      submitOnChange: true,
    },
  };

  static EDIT_PARTS = {
    header: super.EDIT_PARTS.header,
    content: {
      template: `systems/swade/templates/journal/page-headquarters-edit.hbs`,
      classes: ["standard-form", 'scrollable']
    },
    footer: super.EDIT_PARTS.footer
  };

  static VIEW_PARTS = {
    content: {
      template: `systems/swade/templates/journal/page-headquarters-view.hbs`,
      root: true
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.document.system as HeadquartersData;
    context.enriched = {
      advantage: await this.#enrich(system.advantage),
      complication: await this.#enrich(system.complication),
      upgrades: await this.#enrich(system.upgrades),
      form: {
        description: await this.#enrich(system.form.description),
        acquisition: await this.#enrich(system.form.acquisition),
        maintenance: await this.#enrich(system.form.maintenance),
      },
    };
    return context;
  }

  async #enrich(text: string): Promise<string> {
    return TextEditor.enrichHTML(text, { secrets: this.document.isOwner });
  }
}
