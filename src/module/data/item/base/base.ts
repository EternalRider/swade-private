import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { constants } from '../../../constants';
import type SwadeItem from '../../../documents/item/SwadeItem';
import { slugify } from '../../../util';
import { choiceSets, itemDescription } from '../common';
import { ChoiceSets, ItemDescription } from '../item-common.interface';

declare namespace SwadeBaseItemData {
  interface Schema extends DataSchema, ItemDescription, ChoiceSets {}
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

  protected override async _preCreate(
    data: foundry.documents.BaseItem.ConstructorData,
    options: Item.DatabaseOperations['create'],
    user: BaseUser,
  ) {
    await super._preCreate(data, options, user);

    if (this.parent?.actor?.type === 'group' && !this.isPhysicalItem) {
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
}

export { SwadeBaseItemData };
