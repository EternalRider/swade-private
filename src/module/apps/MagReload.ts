import type SwadeItem from '../documents/item/SwadeItem';

export default class MagReload extends Application<ApplicationOptions> {
  #callback: (reloaded: boolean) => void;
  #isResolved = false;
  #userWantsToDiscard = false;
  magazines: SwadeItem[];
  weapon: SwadeItem;

  static asPromise(ctx: MagReloadContext): Promise<boolean> {
    return new Promise((resolve) => new MagReload(ctx, resolve));
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: 'Select a magazine',
      template: 'systems/swade/templates/apps/magreload.hbs',
      classes: ['swade', 'magazine-manager', 'swade-app'],
      width: 400,
      height: 'auto' as const,
      filters: [
        {
          inputSelector: '.searchBox',
          contentSelector: '.selections',
        },
      ],
    });
  }

  get insertedMagazine() {
    return this.weapon.getFlag('swade', 'loadedAmmo');
  }

  get weaponIsEmpty() {
    return (
      this.weapon.type === 'weapon' && this.weapon.system.currentShots === 0
    );
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
        btn.addEventListener('click', this._onClickMagazine.bind(this)),
      );
    html[0]
      .querySelector<HTMLInputElement>('.discard-mag')
      ?.addEventListener('click', (ev) => {
        const target = ev.currentTarget as HTMLInputElement;
        this.#userWantsToDiscard = target.checked;
      });
  }

  async getData(options?: Partial<ApplicationOptions>) {
    const renderData = {
      magazineGroups: this.#prepareMagazineList(),
      canDiscard:
        this.weapon.system.currentShots === 0 && this.insertedMagazine,
    };
    return foundry.utils.mergeObject(renderData, await super.getData(options));
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    if (!this.#isResolved) this.#callback(false);
    await super.close(options);
  }

  private async _onClickMagazine(ev: MouseEvent) {
    ev.preventDefault();
    if (this.weapon.type !== 'weapon') return;
    const target = ev.currentTarget as HTMLButtonElement;
    const selectedMagazine = this.#selectMagazine(
      target.dataset.itemId as string,
    );
    if (selectedMagazine?.type !== 'consumable') return;

    const currentShots = this.weapon.system.currentShots;
    const magContent = selectedMagazine.system.charges.value;
    //return early if the new and old mag have the same content as there's nothing to do
    if (currentShots === magContent) return;

    const magStackSize = selectedMagazine.system.quantity;
    const discardEmptyMagazine =
      this.#userWantsToDiscard && this.weaponIsEmpty && this.insertedMagazine;

    //discard empty magazine if desired
    if (discardEmptyMagazine || !this.insertedMagazine) {
      await this.#loadMagazineFromInventory(selectedMagazine, magStackSize);
    } else if (magStackSize > 1) {
      await this.#exchangeMagWithStack(selectedMagazine, magStackSize);
    } else {
      //last resort: just update the charges
      await selectedMagazine.update({ 'system.charges.value': currentShots });
    }

    await this.#loadMagIntoWeapon(selectedMagazine);
    this.#resolve();
  }

  #selectMagazine(id: string) {
    return this.magazines.find((i) => i.id === id)!;
  }

  #resolve() {
    this.#isResolved = true;
    this.#callback(true);
    this.close();
  }

  #prepareMagazineList(): MagazineGroups {
    const groups: MagazineGroups = Object.fromEntries(
      this.magazines.map((m) => [m.name!, []]),
    );
    const filteredMags = this.magazines.filter(
      (m) => m.system.charges.value > 0,
    );

    for (const mag of filteredMags) {
      const charges = getProperty(mag, 'system.charges.value') as number;
      const capacity = getProperty(mag, 'system.charges.max') as number;

      groups[mag.name!].push({
        id: mag.id!,
        name: mag.name!,
        charges,
        capacity,
        percentage: Math.round((charges / capacity) * 100),
        quantity: mag.system.quantity > 1 ? mag.system.quantity : undefined,
      });
    }

    Object.values(groups).forEach((v) =>
      v.sort((a, b) => b.percentage - a.percentage),
    );
    return groups;
  }

  /** set the shots in the weapon and the inserted magazine */
  async #loadMagIntoWeapon(magazine: SwadeItem) {
    const magToInsert = foundry.utils.mergeObject(magazine.toObject(), {
      'system.quantity': 1,
    });
    await this.weapon.update({
      'system.currentShots': magazine.system.charges.value,
      'flags.swade.loadedAmmo': magToInsert,
    });
  }

  /** simply overwrite the old magazine with the new one to "discard" the old one */
  async #loadMagazineFromInventory(magazine: SwadeItem, magStackSize: number) {
    if (magStackSize > 1) {
      await magazine.update({ 'system.quantity': magStackSize - 1 });
    } else {
      await magazine.delete();
    }
  }

  async #exchangeMagWithStack(magazine: SwadeItem, magStackSize: number) {
    const currentShots = this.weapon.system.currentShots;
    //take from the stack, and put the remaining shots into a new mag
    await magazine.update({ 'system.quantity': magStackSize - 1 });
    const emptyMagStack = this.magazines.find(
      (m) => m.type === 'consumable' && m.system.charges.value === 0,
    );
    if (!emptyMagStack || (!this.weaponIsEmpty && this.insertedMagazine)) {
      //Otherwise just clone the magazine and update the data
      await magazine.clone(
        { system: { quantity: 1, 'charges.value': currentShots } },
        { save: true },
      );
    } else {
      //check if there's a stack we can add to
      await emptyMagStack.update({
        'system.quantity': emptyMagStack.system.quantity + 1,
      });
    }
  }
}

interface MagReloadContext {
  weapon: SwadeItem;
  magazines: SwadeItem[];
}

interface RenderedMagazine {
  id: string;
  name: string;
  charges: number;
  capacity: number;
  percentage: number;
  quantity?: number;
}

type MagazineGroups = Record<string, RenderedMagazine[]>;
