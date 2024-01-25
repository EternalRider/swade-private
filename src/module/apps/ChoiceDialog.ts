import {
  ChoiceSet,
  MutationOption,
} from '../documents/item/SwadeItem.interface';

export class ChoiceDialog extends Application<ApplicationOptions> {
  #callback: (value: ChoiceSet) => void;
  protected selection: ChoiceSet;

  static asPromise(ctx: ChoiceDialogContext): Promise<ChoiceSet> {
    return new Promise<ChoiceSet>((resolve) => new ChoiceDialog(ctx, resolve));
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/apps/choice-dialog.hbs',
      classes: ['swade', 'choice-dialog', 'swade-app'],
      width: 'auto' as const,
      height: 'auto' as const,
    });
  }

  constructor(
    data: ChoiceDialogContext,
    resolve: (choiceSet: ChoiceSet) => void,
    options?: Partial<FormApplicationOptions>,
  ) {
    super(options);
    this.#callback = resolve;
    this.selection = data.choiceSet;
    this.render(true);
  }

  override get title(): string {
    return 'SWADE Choicedialog';
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    // override escape and enter keys for this Application
    $(document).on('keydown.chooseDefault', this.#onKeyDown.bind(this));

    html[0]
      .querySelector<HTMLButtonElement>('button#close')
      ?.addEventListener('click', this.close.bind(this));

    html[0]
      .querySelector<HTMLButtonElement>('button#submit-choice')
      ?.addEventListener('click', (ev) => {
        this.customSubmit();
      });
  }

  customSubmit() {
    this.selection.choice = this.getSelection();
    return this.close();
  }
  protected getSelection(): number | null {
    const radio = this.element[0].querySelector('input[name="choiceset"]:checked') as HTMLInputElement;
    return radio?.value !== 'none' ? Number(radio?.value) : null;
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    this.#callback(this.selection);
    $(document).off('keydown.chooseDefault');
    return super.close(options);
  }

  override async getData() {
    return {
      prompt: this.selection.title,
      choices: this.selection.choices.map((choice, index) => ({
        ...choice,
        value: index,
      })),
    };
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

export interface ChoiceDialogContext {
  choiceSet: ChoiceSet;
}
export interface ChoiceDialogData {
  mutationOption: MutationOption | null;
  resolved: boolean;
}
