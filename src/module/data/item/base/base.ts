import { DeepPartial } from 'fvtt-types/utils';
import { AdditionalStat, ItemAction } from '../../../../interfaces/additional.interface';
import { constants } from '../../../constants';
import { SwadeRoll } from '../../../dice/SwadeRoll';
import type SwadeActor from '../../../documents/actor/SwadeActor';
import type SwadeItem from '../../../documents/item/SwadeItem';
import { slugify } from '../../../util';
import { ArmorData } from '../armor';
import { additionalStats, choiceSets, itemDescription } from '../common';
import { ConsumableData } from '../consumable';
import { GearData } from '../gear';
import { AdditionalStats, ChoiceSets, ItemDescription } from '../item-common.interface';
import { PowerData } from '../power';
import { ShieldData } from '../shield';
import { WeaponData } from '../weapon';

declare namespace SwadeBaseItemData {
  interface Schema extends foundry.data.fields.DataSchema, ItemDescription, ChoiceSets, AdditionalStats {}
  type BaseData = {};
  type DerivedData = {};
}

class SwadeBaseItemData<
  Schema extends SwadeBaseItemData.Schema = SwadeBaseItemData.Schema,
  BaseData extends SwadeBaseItemData.BaseData = SwadeBaseItemData.BaseData,
  DerivedData extends SwadeBaseItemData.DerivedData = SwadeBaseItemData.DerivedData,
> extends foundry.abstract.TypeDataModel<Schema, SwadeItem, BaseData, DerivedData> {
  /** @inheritdoc */
  static override defineSchema(): SwadeBaseItemData.Schema {
    return {
      ...itemDescription(),
      ...choiceSets(),
      ...additionalStats(),
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

  async rollAdditionalStat(stat: string) {
    const statData: AdditionalStat = this.additionalStats[stat];
    //return early if there's no data to roll or if it's not a die stat
    if (!statData || !statData.value || statData.dtype !== constants.ADDITIONAL_STATS_TYPE.DIE) return;
    let modifier = statData.modifier || '';
    if (modifier && !modifier.match(/^[+-]/)) {
      modifier = '+' + modifier;
    }
    const roll = new SwadeRoll(`${statData.value}${modifier}`, this.actor?.getRollData() ?? {});
    await roll.evaluate();
    const message = await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: statData.label,
    });
    return message;
  }

  /**
   * Shared utility method for preparing activities on the item.
   * WARNING: Only call on items that actually support Activities
   */
  protected _prepareActivities(
    this: ArmorData | ConsumableData | GearData | PowerData | ShieldData | WeaponData
  ): void {
    if (!this.actor || typeof this.activities === 'undefined') return;
    const resolved = Array.from(this.activities).flatMap((activity: string) =>
      this.actor!.getItemsBySwid(activity, 'action')
    );
    for (const item of resolved) {
      const actions = Object.entries<ItemAction>(item.system.actions.additional);
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
    data: foundry.abstract.TypeDataModel.ParentAssignmentType<Schema, Item>,
    options: Item.Database.PreCreateOptions,
    user: User.Implementation
  ): Promise<boolean | void> {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

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
    if (!data.system?.swid || data.system?.swid === constants.RESERVED_SWID.DEFAULT) {
      this.updateSource({ swid: slugify(data.name) });
    }
  }

  protected override async _preUpdate(
    changes: DeepPartial<foundry.abstract.TypeDataModel.ParentAssignmentType<Schema, Item>>,
    options: Item.Database.PreUpdateOptions,
    user: User.Implementation
  ) {
    await super._preUpdate(changes, options, user);
    if (changes?.system?.swid === constants.RESERVED_SWID.DEFAULT) {
      changes.system.swid = slugify(changes.name);
    }
  }

  /** Prepare any fields that are formulas  */
  prepareFormulaFields(): void {}
}

export { SwadeBaseItemData };
