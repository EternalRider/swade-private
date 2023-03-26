import type SwadeItem from '../documents/item/SwadeItem';

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
  }

  async getData(options?: Partial<ApplicationOptions>) {
    const renderData = {
      magazineGroups: this.#prepareMagazineList(),
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
    let magazine = this.#selectMagazine(target.dataset.itemId as string);
    if (magazine?.type !== 'consumable') return;

    const currentShots = this.weapon.system.currentShots;
    const magContent = magazine.system.charges.value;
    const magStackSize = magazine.system.quantity;

    //return early if the new and old mag have the same content as there's nothing to do
    if (currentShots === magContent) return;

    //If the selected magazine has a stacksize greater than 1 then create a new consumable with the new charges
    if (magStackSize > 1) {
      const newMagItemData = foundry.utils.mergeObject(magazine.toObject(), {
        'system.quantity': 1,
        'system.charges.value': currentShots,
      });
      //persist updates
      await magazine.update({ 'system.quantity': magStackSize - 1 });
      magazine = await CONFIG.Item.documentClass.create(newMagItemData, {
        parent: magazine.parent!,
      });
    }

    //set the shots in the weapon
    await this.weapon.update({ 'system.currentShots': magContent });

    //destroy the magazine if it is empty and set to do so
    if (currentShots === 0 && magazine?.system.destroyOnEmpty) {
      await magazine.delete();
    } else {
      //else just update the charges
      await magazine?.update({ 'system.charges.value': currentShots });
    }

    this.#resolve();
  }

  #selectMagazine(id: string) {
    return this.magazines.find((i) => i.id === id);
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
    for (const mag of this.magazines) {
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
