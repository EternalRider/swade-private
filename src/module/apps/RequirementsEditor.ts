import { SWADE } from '../config';
import { constants } from '../constants';
import { SLUG_REGEX } from '../data/item/common';
import { EdgeData } from '../data/item/edge';
import SwadeItem from '../documents/item/SwadeItem';
import { Requirement } from '../documents/item/SwadeItem.interface';

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RequirementsEditor extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  constructor({ edge, ...options }: RequirementsEditorConfiguration) {
    if (!(edge['system'] instanceof EdgeData)) {
      throw new TypeError('Invalid item type ' + edge['type']);
    }
    super(options);

    this.#requirements = foundry.utils.getProperty(
      edge,
      'system.requirements',
    ) as Requirement[];
    this.#edge = edge;
  }

  #requirements: Partial<Requirement>[];
  #edge: SwadeItem;

  static override DEFAULT_OPTIONS = {
    window: {
      title: 'SWADE.Req',
      contentClasses: ['standard-form'],
    },
    position: {
      width: 600,
      height: 'auto',
    },
    classes: ['swade', 'requirements-editor', 'swade-application'],
    tag: 'form',
    form: {
      handler: RequirementsEditor.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
      submitOnClose: false,
    },
    actions: {
      add: RequirementsEditor.#addRequirement,
      delete: RequirementsEditor.#deleteRequirement,
    },
  };

  static override PARTS = {
    form: { template: 'systems/swade/templates/apps/requirements-editor.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  get edge() {
    return this.#edge;
  }

  override _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);
    const target = event.target;
    if (!target) return;
    if (target.name.endsWith('.type')) {
      this.#resetValue(target);
    }
  }

  static async onSubmit(
    this: RequirementsEditor,
    event: SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended,
  ) {
    const requirements = Object.values<Requirement>(
      // This maps the incoming formdata to an actual array of requirements
      foundry.utils.expandObject(formData.object).system?.requirements ?? {},
    );
    const changes = { type: 'edge', system: { requirements } };
    try {
      this.edge.validate({ changes, clean: true });
      this.#requirements = requirements;
    } catch (error) {
      ui.notifications.error(error);
    } finally {
      this.render({ force: true });
      if (event.submitter) {
        const isValid = this.form?.checkValidity();
        if (isValid) {
          await this.#updateDocument();
          this.close();
        }
      }
    }
  }

  override async _prepareContext(options) {
    const context = foundry.utils.mergeObject(
      await super._prepareContext(options),
      {
        requirements: this.#requirements,
        types: constants.REQUIREMENT_TYPE,
        typeChoices: this.#getRequirementTypeChoices(),
        rankChoices: this.#getRankChoices(),
        dieChoices: this.#getDieChoices(),
        attributeChoices: this.#getAttributeChoices(),
        combinatorChoices: this.#getCombinatorChoices(),
        slugPattern: SLUG_REGEX.source,
        edge: this.edge,
        buttons: [
          { type: 'submit', icon: 'fa-solid fa-save', label: 'Save Changes' },
        ],
      },
    );
    return context;
  }

  static async #addRequirement(
    this: RequirementsEditor,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    const newReq =
      this.#requirements.length > 0
        ? { type: constants.REQUIREMENT_TYPE.OTHER, label: '' }
        : {
            type: constants.REQUIREMENT_TYPE.RANK,
            value: constants.RANK.NOVICE,
          };

    this.#requirements.push(newReq);
    this.render({ force: true });
  }

  static async #deleteRequirement(
    this: RequirementsEditor,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    const index = target.closest('li')?.dataset.index;
    this.#requirements.findSplice((_v, i) => i === Number(index));
    this.render({ force: true });
  }

  /** reset all selector and value inputs */
  #resetValue(target: HTMLElement) {
    target
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

  #getCombinatorChoices(): Record<string, string> {
    return {
      and: 'SWADE.Requirements.And',
      or: 'SWADE.Requirements.Or',
    };
  }

  async #updateDocument() {
    await this.edge.update(
      { 'system.requirements': this.#requirements },
      { diff: false },
    );
  }
}
interface RequirementsEditorConfiguration
  extends Partial<foundry.applications.api.ApplicationV2.Configuration> {
  edge: SwadeItem;
}
