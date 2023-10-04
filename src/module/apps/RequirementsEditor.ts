import { SWADE } from '../config';
import { constants } from '../constants';
import { RequirementsField } from '../data/fields';
import SwadeItem from '../documents/item/SwadeItem';

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
      submitOnClose: true,
    });
  }

  get edge() {
    return this.object as SwadeItem;
  }

  get requirements() {
    return this.edge.system.requirements as RequirementsField[];
  }

  override activateListeners(jquery: JQuery<HTMLElement>): void {
    const html = jquery[0];
    super.activateListeners(jquery);
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
      .querySelector('button[type="submit"]')
      ?.addEventListener('click', () => this.close());
  }

  override async getData(
    options?: Partial<FormApplicationOptions>,
  ): Promise<object> {
    return foundry.utils.mergeObject(await super.getData(options), {
      types: constants.REQUIREMENT_TYPE,
      typeChoices: this.#getRequirementTypeChoices(),
      rankChoices: this.#getRankChoices(),
      attributeChoices: this.#getAttributeChoices(),
    });
  }

  protected async _updateObject(_e: Event, formData: object = {}) {
    const expanded = foundry.utils.expandObject(formData);
    try {
      await this.edge.update(expanded);
    } catch (_error) {
      /** */
    } finally {
      this.render(true);
    }
  }

  async #addRequirement() {
    const newReq =
      this.requirements.length > 0
        ? { type: constants.REQUIREMENT_TYPE.OTHER, value: '' }
        : {
            type: constants.REQUIREMENT_TYPE.RANK,
            value: constants.RANK.NOVICE,
          };
    await this.edge.update(
      {
        'system.requirements': [
          ...this.requirements,
          foundry.utils.mergeObject(newReq, { combinator: 'and' }),
        ],
      },
      { diff: false },
    );
    this.render(true);
  }

  async #deleteRequirement(event: PointerEvent) {
    const index = (event.currentTarget as HTMLElement).closest('li')?.dataset
      .index;
    const arr = structuredClone(this.requirements);
    arr.findSplice((_v, i) => i === Number(index));
    try {
      await this.edge.update({ 'system.requirements': arr }, { diff: false });
    } catch (error) {
      /** NOOP */
    } finally {
      this.render(true);
    }
  }

  #resetValue(event: Event) {
    const parent = (event.currentTarget as HTMLElement).closest(
      'li',
    ) as HTMLElement;
    //reset all selector and value inputs
    const inputs = parent.querySelectorAll<
      HTMLInputElement | HTMLSelectElement
    >('[name$="selector"], [name$="value"]');
    inputs.forEach((el) => (el.value = ''));
  }

  #getRankChoices(): Record<string, string> {
    return SWADE.ranks.reduce((acc, cur, i) => {
      acc[i] = cur;
      return acc;
    }, {});
  }

  #getAttributeChoices(): Record<string, string> {
    return Object.entries(SWADE.attributes).reduce((acc, [key, value]) => {
      acc[key] = value.long;
      return acc;
    }, {});
  }

  #getRequirementTypeChoices(): Record<string, string> {
    return {
      [constants.REQUIREMENT_TYPE.RANK]: 'SWADE.Rank',
      [constants.REQUIREMENT_TYPE.ATTRIBUTE]: 'SWADE.Attribute',
      [constants.REQUIREMENT_TYPE.SKILL]: 'TYPES.Item.skill',
      [constants.REQUIREMENT_TYPE.EDGE]: 'TYPES.Item.edge',
      [constants.REQUIREMENT_TYPE.HINDRANCE]: 'TYPES.Item.hindrance',
      [constants.REQUIREMENT_TYPE.ANCESTRY]: 'SWADE.Ancestry',
      [constants.REQUIREMENT_TYPE.OTHER]: 'SWADE.Requirements.Other',
    };
  }
}
