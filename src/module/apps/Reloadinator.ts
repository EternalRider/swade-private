import { constants } from '../constants';
import type SwadeItem from '../documents/item/SwadeItem';

export default class Reloadinator extends Application {
  #callback: (reloaded: boolean) => void;
  #isResolved = false;
  #wantsToDiscard = false;
  magazines: SwadeItem[];
  weapon: SwadeItem;

  static asPromise(ctx: MagReloadContext): Promise<boolean> {
    return new Promise((resolve) => new Reloadinator(ctx, resolve));
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize('SWADE.Magazine.Select'),
      template: 'systems/swade/templates/apps/reload-manager.hbs',
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

  get loadedAmmo() {
    return this.weapon.getFlag('swade', 'loadedAmmo');
  }

  get noShotsInWeapon() {
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
        btn.addEventListener('click', this._onClickOption.bind(this)),
      );
    html[0]
      .querySelector<HTMLInputElement>('.discard')
      ?.addEventListener('click', (ev) => {
        const target = ev.currentTarget as HTMLInputElement;
        this.#wantsToDiscard = target.checked;
      });
  }

  override async getData(options?: Partial<ApplicationOptions>) {
    const renderData = {
      magazineGroups: this.#prepareOptionList(),
      canDiscard: this.weapon.system.currentShots === 0 && this.loadedAmmo,
    };
    return foundry.utils.mergeObject(renderData, await super.getData(options));
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    if (!this.#isResolved) this.#callback(false);
    await super.close(options);
  }

  private async _onClickOption(ev: PointerEvent) {
    ev.preventDefault();
    if (this.weapon.type !== 'weapon') return;
    const target = ev.currentTarget as HTMLButtonElement;
    const selected = this.#selectOption(target.dataset.itemId as string);
    if (selected?.type !== 'consumable') return;

    const currentShots = this.weapon.system.currentShots;
    const magContent = selected.system.charges.value;
    //return early if the new and old mag have the same content as there's nothing to do
    if (currentShots === magContent) return;

    const stackSize = selected.system.quantity;
    const discardEmpty =
      this.#wantsToDiscard && this.noShotsInWeapon && this.loadedAmmo;

    //discard empty magazine if desired
    if (discardEmpty || !this.loadedAmmo) {
      await this.#loadFromInventory(selected, stackSize);
      await this.#loadIntoWeapon(selected);
    } else if (stackSize > 0) {
      await this.#exchangeMagWithStack(selected, stackSize);
      await this.#loadIntoWeapon(selected);
    } else {
      //last resort: just update the charges
      await this.#loadIntoWeapon(selected);
      await this.#updateSelectedMag(selected, currentShots);
    }
    this.#resolve();
  }

  #selectOption(id: string) {
    return this.magazines.find((i) => i.id === id)!;
  }

  #resolve() {
    this.#isResolved = true;
    this.#callback(true);
    this.close();
  }

  #prepareOptionList(): MagazineGroups {
    const groups: MagazineGroups = Object.fromEntries(
      this.magazines.map((m) => [m.name!, []]),
    );
    const filteredMags = this.magazines.filter(
      (m) => m.system.charges.value > 0,
    );

    for (const mag of filteredMags) {
      if (mag.type !== 'consumable') continue;
      const charges = foundry.utils.getProperty(
        mag,
        'system.charges.value',
      ) as number;
      const capacity = foundry.utils.getProperty(
        mag,
        'system.charges.max',
      ) as number;
      const isBattery =
        mag.system.subtype === constants.CONSUMABLE_TYPE.BATTERY;

      groups[mag.name!].push({
        id: mag.id!,
        name: mag.name!,
        charges,
        capacity,
        percentage: Math.round((charges / capacity) * 100),
        quantity: mag.system.quantity > 1 ? mag.system.quantity : undefined,
        showPercentage: isBattery,
      });
    }

    Object.values(groups).forEach((v) =>
      v.sort((a, b) => b.percentage - a.percentage),
    );
    return groups;
  }

  /** set the shots in the weapon and the selected magazine/battery */
  async #loadIntoWeapon(selected: SwadeItem) {
    if (selected.type !== 'consumable') return;
    const selectedToInsert = foundry.utils.mergeObject(selected.toObject(), {
      'system.quantity': 1,
    });
    let shots = 0;
    if (selected.system.subtype === constants.CONSUMABLE_TYPE.MAGAZINE) {
      shots = selected.system.charges.value;
    } else if (selected.system.subtype === constants.CONSUMABLE_TYPE.BATTERY) {
      shots = this.#getShotsFromBatteryFill(selected);
    }
    await this.weapon.update({
      'system.currentShots': shots,
      'flags.swade.loadedAmmo': selectedToInsert,
    });
  }

  /** simply overwrite the old magazine with the new one to "discard" the old one */
  async #loadFromInventory(selected: SwadeItem, stackSize: number) {
    if (stackSize > 1) {
      await selected.update({ 'system.quantity': stackSize - 1 });
    } else {
      await selected.delete();
    }
  }

  async #exchangeMagWithStack(selected: SwadeItem, stackSize: number) {
    if (selected.type !== 'consumable') return;

    //find an existing magazine stack we can add to
    const emptyMagStack = this.magazines.find(
      (m) => m.type === 'consumable' && m.system.charges.value === 0,
    );
    //if there's no existing stack or we're doing a partial reload.
    if (!emptyMagStack || (!this.noShotsInWeapon && this.loadedAmmo)) {
      const subtype = selected.system.subtype;
      let newCharges = 0;
      const currentShots = this.weapon.system.currentShots;
      //get the new charges value based on current shots and consumable subtype.
      if (subtype === constants.CONSUMABLE_TYPE.MAGAZINE) {
        newCharges = currentShots;
      } else if (subtype === constants.CONSUMABLE_TYPE.BATTERY) {
        newCharges = this.#getBatteryFillFromShots(currentShots);
      }
      //copy the selected consumable and set the new charges on the clone.
      await selected.clone(
        { 'system.quantity': 1, 'system.charges.value': newCharges },
        { save: true },
      );
    } else {
      //else increase the stack by 1
      await emptyMagStack.update({
        'system.quantity': emptyMagStack.system.quantity + 1,
      });
    }

    //lastly, decrease the stack size of the selected mag or delete it entirely.
    const newStackSize = stackSize - 1;
    if (newStackSize > 0) {
      await selected.update({ 'system.quantity': newStackSize });
    } else {
      await selected.delete();
    }
  }

  async #updateSelectedMag(selected: SwadeItem, currentShots: number) {
    let shots = 0;
    const subtype = selected.system.subtype;
    if (subtype === constants.CONSUMABLE_TYPE.MAGAZINE) {
      shots = currentShots;
    } else if (subtype === constants.CONSUMABLE_TYPE.BATTERY) {
      shots = this.#getBatteryFillFromShots(currentShots);
    }
    await selected.update({ 'system.charges.value': shots });
  }

  #getBatteryFillFromShots(currentShots: number): number {
    if (this.weapon.type !== 'weapon') return 0;
    const per = (currentShots / this.weapon.system.shots) * 100;
    return Math.ceil(per);
  }

  #getShotsFromBatteryFill(battery: SwadeItem): number {
    if (this.weapon.type !== 'weapon' || battery.type !== 'consumable') {
      return 0;
    }
    const factor = battery.system.charges.value / 100;
    return Math.ceil(this.weapon.system.shots * factor);
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
  showPercentage: boolean;
  quantity?: number;
}

type MagazineGroups = Record<string, RenderedMagazine[]>;
