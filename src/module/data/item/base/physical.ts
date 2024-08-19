import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { EquipState } from '../../../../globals';
import { constants } from '../../../constants';
import { builder, physicalItem } from '../common';
import { Builder, PhysicalItem } from '../item-common.interface';
import { SwadeBaseItemData } from './base';

declare namespace SwadePhysicalItemData {
  interface Schema extends SwadeBaseItemData.Schema, PhysicalItem, Builder {}
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class SwadePhysicalItemData<
  Schema extends SwadePhysicalItemData.Schema,
  BaseData extends SwadePhysicalItemData.BaseData,
  DerivedData extends SwadePhysicalItemData.DerivedData,
> extends SwadeBaseItemData<Schema, BaseData, DerivedData> {
  /** @inheritdoc */
  static override defineSchema(): SwadePhysicalItemData.Schema {
    return {
      ...super.defineSchema(),
      ...physicalItem(),
      ...builder()
    };
  }

  override get isPhysicalItem(): boolean {
    return true;
  }

  protected override async _preUpdate(
    changed: foundry.documents.BaseItem.ConstructorData,
    options: DocumentModificationOptions,
    user: BaseUser,
  ) {
    await super._preUpdate(changed, options, user);
    const diff = foundry.utils.diffObject(this.toObject(), changed);

    if (
      !!this.parent?.actor &&
      foundry.utils.hasProperty(diff, 'system.equipStatus')
    ) {
      //toggle all active effects when an item equip status changes
      const newState = foundry.utils.getProperty(
        diff,
        'system.equipStatus',
      ) as EquipState;
      const updates = this.parent.effects.map((ae) => {
        return {
          _id: ae.id,
          disabled: newState < constants.EQUIP_STATE.OFF_HAND,
        };
      });
      await this.parent.updateEmbeddedDocuments('ActiveEffect', updates);
    }
  }
}

export { SwadePhysicalItemData };
