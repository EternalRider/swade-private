import SwadeItem from '../documents/item/SwadeItem';

export default class MagReload extends Application<ApplicationOptions> {
  #callback: (reloaded: boolean) => void;
  #isResolved = false;
  magazines: SwadeItem[];
  weapon: SwadeItem;

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
    super(options);
    this.#callback = resolve;
    this.magazines = ctx.magazines;
    this.weapon = ctx.weapon;
    this.render(true);
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    html[0]
      .querySelectorAll<HTMLButtonElement>('button[data-item-id]')
      .forEach((btn) =>
        btn.addEventListener('click', this.#handleReload.bind(this)),
      );
  }

  async getData(options?: Partial<ApplicationOptions>) {
    const renderData = {
      magazines: this.magazines,
    };
    return foundry.utils.mergeObject(renderData, await super.getData(options));
  }

  override close(options?: Application.CloseOptions): Promise<void> {
    if (!this.#isResolved) this.#callback(false);
    $(document).off('keydown.chooseDefault');
    return super.close(options);
  }

  async #handleReload(ev: MouseEvent) {
    if (this.weapon.type !== 'weapon') return;
    const target = ev.currentTarget as HTMLButtonElement;
    let magazine = this.#selectMagazine(target.dataset.itemId as string);
    //assume weapon has a mag inserted.
    const currentShots = this.weapon.system.currentShots;
    const magStackSize = magazine.system.quantity;
    const newCurrentShots = magazine.system.charges.value;
    //If the selected magazine has a stacksize greater than 1 then create a new consumable with the new charges
    if (magStackSize > 1) {
      const newMagItemData = foundry.utils.mergeObject(magazine.toObject(), {
        'system.quantity': 1,
        'system.charges.value': currentShots,
      });
      //persist updates
      await magazine.update({ 'system.quantity': magStackSize - 1 });
      magazine = (await CONFIG.Item.documentClass.create(newMagItemData, {
        parent: magazine.parent!,
      })) as SwadeItem;
    }

    await Promise.all([
      magazine.update({ 'system.charges.value': currentShots }),
      this.weapon.update({
        'system.currentShots': newCurrentShots,
      }),
    ]);
    this.#resolve();
  }

  #selectMagazine(id: string) {
    return this.magazines.find((i) => i.id === id) as SwadeItem;
  }

  #resolve() {
    this.#isResolved = true;
    this.#callback(true);
    this.close();
  }
}

interface MagReloadContext {
  weapon: SwadeItem;
  magazines: SwadeItem[];
}
