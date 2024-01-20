import {
  ChoiceSet,
  MutationOption,
} from '../documents/item/SwadeItem.interface';

export class ChoiceDialog extends Application<
  ApplicationOptions
> {
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
    return this.selection.title ?? 'SWADE Choicedialog';
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    $(document).on('keydown.chooseDefault', this.#onKeyDown.bind(this));
    html[0]
      .querySelectorAll<HTMLElement>('button[data-action=pick]')
      .forEach((el) => {
        el.addEventListener('click', (ev) => {
          this.selection.choice = this.getSelection(ev) ?? null;
          this.close();
        });
      });
  }

  protected getSelection(ev: MouseEvent): number | null {
    if (!(ev.currentTarget instanceof HTMLElement)) {
      throw new Error('Unexpected error retrieving form data');
    }

    const valueElement =
      ev.currentTarget
        .closest('.choice')
        ?.querySelector<HTMLElement>('button[data-action=pick]') ??
      ev.currentTarget;
    const selectedIndex = valueElement.getAttribute('value');

    return ['', null].includes(selectedIndex) ||
      !Number.isInteger(Number(selectedIndex))
      ? null
      : Number(selectedIndex);
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    this.#callback(this.selection);
    $(document).off('keydown.chooseDefault');
    return super.close(options);
  }

  override async getData() {
    return {
      choices: this.selection.choices.map((c, index) => ({
        ...c,
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
      return this.close();
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
