import SwadeItem from '../documents/item/SwadeItem';
import { ChoiceSet, MutationOption } from '../documents/item/SwadeItem.interface';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ChoiceDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  declare protected selection: ChoiceSet;

  constructor({ parent, choiceSet, resolve, ...options }: ChoiceDialogConfiguration) {
    super(options);
    this.#callback = resolve;
    this.#parent = parent;
    this.selection = choiceSet;
  }

  #callback: (value: ChoiceSet) => void;
  #parent: SwadeItem;
  #keyDownListener;

  static asPromise(ctx: Omit<ChoiceDialogConfiguration, 'resolve'>): Promise<ChoiceSet> {
    return new Promise<ChoiceSet>((resolve) => new ChoiceDialog({ ...ctx, resolve }).render({ force: true }));
  }

  static override DEFAULT_OPTIONS = {
    window: {
      title: 'SWADE ChoiceDialog',
      contentClasses: ['standard-form'],
    },
    classes: ['swade', 'choice-dialog', 'swade-application'],
    tag: 'form',
    form: {
      handler: ChoiceDialog.onSubmit,
    },
    actions: {
      close: ChoiceDialog.#onClose,
    },
  };

  static override PARTS = {
    form: { template: 'systems/swade/templates/apps/choice-dialog.hbs' },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  override async _onRender(_context, _options) {
    if (!this.#keyDownListener) {
      this.#keyDownListener = this.#onKeyDown.bind(this);
      document.addEventListener('keydown', this.#keyDownListener);
    }
  }

  static onSubmit(
    this: ChoiceDialog,
    _event: SubmitEvent,
    _form: HTMLFormElement,
    _formData: foundry.applications.ux.FormDataExtended
  ) {
    this.customSubmit();
  }

  customSubmit() {
    this.selection.choice = this.getSelection();
    return this.close();
  }

  protected getSelection(): number | null {
    const radio = this.element.querySelector('input[name="choiceset"]:checked') as HTMLInputElement;
    if (!radio) return null;
    return Number(radio?.value);
  }

  static #onClose(this: ChoiceDialog, _event: PointerEvent, _target: HTMLElement) {
    this.close();
  }

  protected override _onClose(options) {
    super._onClose(options);
    this.#callback(this.selection);
    document.removeEventListener('keydown', this.#keyDownListener);
  }

  override async _prepareContext(options) {
    const context = foundry.utils.mergeObject(await super._prepareContext(options), {
      parent: this.#parent,
      prompt: this.selection.title,
      choices: this.selection.choices.map((choice, index) => ({
        ...choice,
        value: index,
      })),
      buttons: [
        {
          type: 'submit',
          icon: 'fa-solid fa-check-double',
          label: 'SWADE.ButtonSubmit',
        },
        {
          type: 'button',
          icon: 'fa-solid fa-times',
          label: 'Close',
          action: 'close',
        },
      ],
    });
    return context;
  }

  #onKeyDown(event) {
    // Close dialog
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      return this.close();
    }

    // Confirm default choice or add a modifier
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      return this.customSubmit();
    }
  }
}

export interface ChoiceDialogConfiguration {
  parent: SwadeItem;
  choiceSet: ChoiceSet;
  resolve: (choiceSet: ChoiceSet) => void;
}
export interface ChoiceDialogData {
  mutationOption: MutationOption | null;
  resolved: boolean;
}
