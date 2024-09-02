import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { constants } from '../../../constants';
import { slugify } from '../../../util';
import { choiceSets, itemDescription } from '../common';
import { ChoiceSets, ItemDescription } from '../item-common.interface';

declare namespace SwadeBaseItemData {
  interface Schema extends DataSchema, ItemDescription, ChoiceSets {}
  interface BaseData {}
  interface DerivedData {}
}

class SwadeBaseItemData<
  Schema extends SwadeBaseItemData.Schema,
  BaseData extends SwadeBaseItemData.BaseData,
  DerivedData extends SwadeBaseItemData.DerivedData,
> extends foundry.abstract.TypeDataModel<
  Schema,
  Item.ConfiguredInstance,
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

  protected async _preCreate(
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
