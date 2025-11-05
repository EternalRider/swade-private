import { constants } from '../constants';
import type SwadeItem from '../documents/item/SwadeItem';

// eslint-disable-next-line @typescript-eslint/naming-convention
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class Reloadinator extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  declare magazines: SwadeItem[];
  declare weapon: SwadeItem;

  constructor({
    weapon,
    magazines,
    resolve,
    ...options
  }: MagReloadConfiguration) {
    super(options);
    this.#callback = resolve;
    this.magazines = magazines;
    this.weapon = weapon;
  }

  #callback: (reloaded: boolean) => void;
  #isResolved = false;
  #wantsToDiscard = false;

  static asPromise(
    ctx: Omit<MagReloadConfiguration, 'resolve'>,
  ): Promise<boolean> {
    return new Promise((resolve) =>
      new Reloadinator({ ...ctx, resolve }).render({ force: true }),
    );
  }

  static override DEFAULT_OPTIONS = {
    window: {
      title: 'SWADE.Magazine.Select',
    },
    position: {
      width: 400,
      height: 'auto',
    },
    classes: ['swade', 'magazine-manager', 'swade-application'],
    actions: {
      selectMag: Reloadinator.#onSelectMag,
      discard: Reloadinator.#onDiscard,
    },
  };

  static override PARTS = {
    main: { template: 'systems/swade/templates/apps/reload-manager.hbs' },
  };

  get loadedAmmo() {
    return this.weapon.getFlag('swade', 'loadedAmmo');
  }

  get noShotsInWeapon() {
    return (
      this.weapon.type === 'weapon' && this.weapon.system.currentShots === 0
    );
  }

  static #onDiscard(
    this: Reloadinator,
    _event: PointerEvent,
    target: HTMLInputElement,
  ) {
    this.#wantsToDiscard = target.checked;
  }

  override async _prepareContext(options) {
    const context = foundry.utils.mergeObject(
      await super._prepareContext(options),
      {
        magazineGroups: this.#prepareOptionList(),
        canDiscard: this.weapon.system.currentShots === 0 && this.loadedAmmo,
      },
    );
    return context;
  }

  protected override _onClose(options) {
    super._onClose(options);
    if (!this.#isResolved) this.#callback(false);
  }

  static async #onSelectMag(
    this: Reloadinator,
    event: PointerEvent,
    target: HTMLButtonElement,
  ) {
    event.preventDefault();
    if (this.weapon.type !== 'weapon') return;
    const selected = this.#selectOption(target.dataset.itemId as string);
    if (selected?.type !== 'consumable') return;

    const currentShots = this.weapon.system.currentShots;
    const magContent = selected.system.charges.default.value;
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
      (m) => m.system.charges.default.value > 0,
    );

    for (const mag of filteredMags) {
      if (mag.type !== 'consumable') continue;
      const charges = foundry.utils.getProperty(
        mag,
        'system.charges.default.value',
      ) as number;
      const capacity = foundry.utils.getProperty(
        mag,
        'system.charges.default.max',
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
      shots = selected.system.charges.default.value;
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
      (m) => m.type === 'consumable' && m.system.charges.default.value === 0,
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
        { 'system.quantity': 1, [`system.charges.charges.${selected.system.charges.default.id}.value`]: newCharges },
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
    await selected.update({ [`system.charges.charges.${selected.system.charges.default.id}.value`]: shots });
  }

  #getBatteryFillFromShots(currentShots: number): number {
    if (this.weapon.type !== 'weapon') return 0;
    const per = (currentShots / this.weapon.system.shots) * 100;
    return Math.round(per);
  }

  #getShotsFromBatteryFill(battery: SwadeItem): number {
    if (this.weapon.type !== 'weapon' || battery.type !== 'consumable') {
      return 0;
    }
    const factor = battery.system.charges.default.value / 100;
    return Math.round(this.weapon.system.shots * factor);
  }
}

interface MagReloadConfiguration {
  weapon: SwadeItem;
  magazines: SwadeItem[];
  resolve: (reloaded: boolean) => void;
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
