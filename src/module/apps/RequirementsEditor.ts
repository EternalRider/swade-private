import { SWADE } from '../config';
import { constants } from '../constants';
import { SLUG_REGEX } from '../data/item/common';
import { EdgeData } from '../data/item/edge';
import SwadeItem from '../documents/item/SwadeItem';
import { Requirement } from '../documents/item/SwadeItem.interface';

export class RequirementsEditor extends FormApplication<
  FormApplicationOptions,
  SwadeItem
> {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/apps/requirements-editor.hbs',
      title: game.i18n.localize('SWADE.Req'),
      classes: ['swade', 'requirements-editor', 'swade-app'],
      width: 600,
      height: 'auto' as const,
      submitOnChange: true,
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }

  #requirements: Partial<Requirement>[];

  constructor(edge: SwadeItem, options: Partial<FormApplicationOptions> = {}) {
    if (!(edge['system'] instanceof EdgeData)) {
      throw new TypeError('Invalid item type ' + edge['type']);
    }
    super(edge, options);
    this.#requirements = foundry.utils.getProperty(
      edge,
      'system.requirements',
    ) as Requirement[];
  }

  get edge() {
    return this.object as SwadeItem;
  }

  override activateListeners(jquery: JQuery<HTMLFormElement>): void {
    const html = jquery[0];

    html
      .querySelectorAll('select[name$="type"]') //select all type dropdowns
      .forEach((el) =>
        el.addEventListener('change', this.#resetValue.bind(this)),
      );
    html
      .querySelector('[data-action="add"]')
      ?.addEventListener('click', this.#addRequirement.bind(this));
    html
      .querySelectorAll('[data-action="delete"]')
      .forEach((e) =>
        e.addEventListener('click', this.#deleteRequirement.bind(this)),
      );
    html
      .querySelector('footer .submit')
      ?.addEventListener('click', async () => {
        const isValid = html.checkValidity();
        if (!isValid) return;
        await this.submit();
        await this.#updateDocument();
        this.close();
      });
    super.activateListeners(jquery);
  }

  override async getData(
    options?: Partial<FormApplicationOptions>,
  ): Promise<object> {
    return foundry.utils.mergeObject(await super.getData(options), {
      requirements: this.#requirements,
      types: constants.REQUIREMENT_TYPE,
      typeChoices: this.#getRequirementTypeChoices(),
      rankChoices: this.#getRankChoices(),
      dieChoices: this.#getDieChoices(),
      attributeChoices: this.#getAttributeChoices(),
      slugPattern: SLUG_REGEX.source,
    });
  }

  protected async _updateObject(_e: Event, formData: object = {}) {
    const requirements = Object.values<Requirement>(
      //this maps the incoming formdata to an actual array of requirements
      foundry.utils.expandObject(formData).system.requirements,
    );
    const changes = { type: 'edge', system: { requirements } };
    try {
      this.edge.validate({ changes, clean: true });
      this.#requirements = requirements;
    } catch (error) {
      ui.notifications.error(error);
    } finally {
      this.render(true);
    }
  }

  async #addRequirement() {
    const newReq =
      this.#requirements.length > 0
        ? { type: constants.REQUIREMENT_TYPE.OTHER, label: '' }
        : {
            type: constants.REQUIREMENT_TYPE.RANK,
            value: constants.RANK.NOVICE,
          };

    this.#requirements.push(newReq);
    this.render(true);
  }

  async #deleteRequirement(event: PointerEvent) {
    const index = (event.currentTarget as HTMLElement).closest('li')?.dataset
      .index;
    this.#requirements.findSplice((_v, i) => i === Number(index));
    this.render(true);
  }

  /** reset all selector and value inputs */
  #resetValue(event: Event) {
    (event.currentTarget as HTMLElement)
      .closest('li')
      ?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        '[name$="selector"], [name$="value"]',
      )
      .forEach((el) => (el.value = ''));
  }

  #getRankChoices(): Record<string, string> {
    return SWADE.ranks.reduce((acc, cur, i) => {
      acc[i] = cur;
      return acc;
    }, {});
  }

  #getDieChoices(): Record<number, string> {
    return { 4: 'd4+', 6: 'd6+', 8: 'd8+', 10: 'd10+', 12: 'd12+' };
  }

  #getAttributeChoices(): Record<string, string> {
    return Object.entries(SWADE.attributes).reduce((acc, [key, value]) => {
      acc[key] = value.long;
      return acc;
    }, {});
  }

  #getRequirementTypeChoices(): Record<string, string> {
    return {
      [constants.REQUIREMENT_TYPE.WILDCARD]: 'SWADE.WildCard',
      [constants.REQUIREMENT_TYPE.RANK]: 'SWADE.Rank',
      [constants.REQUIREMENT_TYPE.ATTRIBUTE]: 'SWADE.Attribute',
      [constants.REQUIREMENT_TYPE.SKILL]: 'TYPES.Item.skill',
      [constants.REQUIREMENT_TYPE.EDGE]: 'TYPES.Item.edge',
      [constants.REQUIREMENT_TYPE.HINDRANCE]: 'TYPES.Item.hindrance',
      [constants.REQUIREMENT_TYPE.ANCESTRY]: 'SWADE.Ancestry',
      [constants.REQUIREMENT_TYPE.POWER]: 'TYPES.Item.power',
      [constants.REQUIREMENT_TYPE.OTHER]: 'SWADE.Requirements.Other',
    };
  }

  async #updateDocument() {
    await this.edge.update(
      { 'system.requirements': this.#requirements },
      { diff: false },
    );
  }
}
