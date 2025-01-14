import { ItemAction } from '../../../../interfaces/additional.interface';
import { constants } from '../../../constants';
import type SwadeActor from '../../../documents/actor/SwadeActor';
import type SwadeItem from '../../../documents/item/SwadeItem';
import { slugify } from '../../../util';
import { ArmorData } from '../armor';
import { choiceSets, itemDescription } from '../common';
import { ConsumableData } from '../consumable';
import { GearData } from '../gear';
import { ChoiceSets, ItemDescription } from '../item-common.interface';
import { PowerData } from '../power';
import { ShieldData } from '../shield';
import { WeaponData } from '../weapon';

declare namespace SwadeBaseItemData {
  interface Schema
    extends foundry.data.fields.DataSchema,
      ItemDescription,
      ChoiceSets {}
  type BaseData = {};
  type DerivedData = {};
}

class SwadeBaseItemData<
  Schema extends SwadeBaseItemData.Schema,
  BaseData extends SwadeBaseItemData.BaseData,
  DerivedData extends SwadeBaseItemData.DerivedData,
> extends foundry.abstract.TypeDataModel<
  Schema,
  SwadeItem,
  BaseData,
  DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): SwadeBaseItemData.Schema {
    return {
      ...itemDescription(),
      ...choiceSets(),
    };
  }
  get isPhysicalItem(): boolean {
    return false;
  }

  get actor(): SwadeActor | null | undefined {
    return this.parent?.actor;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    /// @ts-expect-error This should suffice as a type guard
    if ('activities' in this) this._prepareActivities();
  }

  /**
   * Shared utility method for preparing activities on the item.
   * WARNING: Only call on items that actually support Activities
   */
  protected _prepareActivities(
    this:
      | ArmorData
      | ConsumableData
      | GearData
      | PowerData
      | ShieldData
      | WeaponData,
  ): void {
    if (!this.actor || typeof this.activities === 'undefined') return;
    const resolved = Array.from(this.activities).flatMap((activity: string) =>
      this.actor!.getItemsBySwid(activity, 'action'),
    );
    for (const item of resolved) {
      const actions = Object.entries<ItemAction>(
        item.system.actions.additional,
      );
      for (const [key, action] of actions) {
        this.actions.additional[item.system.swid + '-' + key] = {
          ...action,
          name: action.name + ' (' + item.name + ')',
          resolved: true,
        };
      }
    }
  }

  protected override async _preCreate(
    data: foundry.documents.BaseItem.ConstructorData,
    options: Item.DatabaseOperations['create'],
    user: foundry.documents.BaseUser,
  ): Promise<false | void> {
    await super._preCreate(data, options, user);

    if (this.actor?.type === 'group' && !this.isPhysicalItem) {
      ui.notifications?.warn('Groups can only hold physical items!');
      return false;
    }

    // set a default image
    if (!data.img) {
      this.parent?.updateSource({
        img: `systems/swade/assets/icons/${data.type}.svg`,
      });
    }

    //set a swid
    if (
      !data.system?.swid ||
      data.system?.swid === constants.RESERVED_SWID.DEFAULT
    ) {
      this.updateSource({ swid: slugify(data.name) });
    }
  }

  /** Prepare any fields that are formulas  */
  prepareFormulaFields(): void {}
}

export { SwadeBaseItemData };
