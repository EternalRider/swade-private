import SwadeItem from '../documents/item/SwadeItem';
export default class MagReload extends FormApplication<
  FormApplicationOptions,
  object,
  MagReloadContext
> {
  #callback: (reloaded: boolean) => void;
  #isResolved = false;

  static asPromise(ctx: MagReloadContext): Promise<boolean> {
    return new Promise((resolve) => new MagReload(ctx, resolve));
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/apps/magreload.hbs',
      classes: ['swade', 'magreload', 'swade-app'],
      width: 400,
      filters: [
        {
          inputSelector: '.searchBox',
          contentSelector: '.selections',
        },
      ],
      height: 'auto' as const,
      closeOnSubmit: true,
      submitOnClose: false,
      submitOnChange: false,
    });
  }

  constructor(
    ctx: MagReloadContext,
    resolve: (reloaded: boolean) => void,
    options?: Partial<FormApplicationOptions>,
  ) {
    super(ctx, options);
    this.#callback = resolve;
    this.render(true);
  }

  get ctx() {
    return this.object;
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    if (!this.#isResolved) this.#callback(false);
    $(document).off('keydown.chooseDefault');
    return super.close(options);
  }

  protected override async _updateObject(
    _event: Event,
    _formData?: object,
  ): Promise<unknown> {
    throw new Error('Method not implemented.');
  }

  #resolve() {
    this.#isResolved = true;
    this.#callback(true);
    this.close();
  }
}

interface MagReloadContext {
  item: SwadeItem;
  magList: SwadeItem[];
}
