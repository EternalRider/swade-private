import type { HeadquartersData } from '../../data/journal';

export default class JournalHeadquartersPageSheet extends JournalPageSheet {
  static override get defaultOptions() {
    const options = foundry.utils.mergeObject(super.defaultOptions, {
      submitOnChange: true,
    });
    options.classes.push('headquarters-journal');
    return options;
  }

  override get template() {
    return `systems/swade/templates/journal/page-headquarters-${
      this.isEditable ? 'edit' : 'view'
    }.hbs`;
  }

  override async getData(options) {
    const context = super.getData(options);
    const system = this.document.system as HeadquartersData;
    context.title = Object.fromEntries(
      Array.fromRange(4, 1).map((n) => [
        `level${n}`,
        context.data.title.level + n - 1,
      ]),
    );
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

  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
  }

  async #enrich(text: string): Promise<string> {
    return TextEditor.enrichHTML(text, { secrets: this.document.isOwner });
  }
}
