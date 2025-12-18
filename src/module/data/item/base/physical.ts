import { DeepPartial } from 'fvtt-types/utils';
import { EquipState, PotentialSource } from '../../../../globals';
import { constants } from '../../../constants';
import { builder, physicalItem } from '../common';
import { Builder, PhysicalItem } from '../item-common.interface';
import * as migrations from '../_migration';
import { SwadeBaseItemData } from './base';
import { ChargesData } from '../../fields';

declare namespace SwadePhysicalItemData {
  interface Schema extends SwadeBaseItemData.Schema, PhysicalItem, Builder {
    charges: foundry.data.fields.EmbeddedDataField<typeof ChargesData>;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class SwadePhysicalItemData<
  Schema extends SwadePhysicalItemData.Schema = SwadePhysicalItemData.Schema,
  BaseData extends
    SwadePhysicalItemData.BaseData = SwadePhysicalItemData.BaseData,
  DerivedData extends
    SwadePhysicalItemData.DerivedData = SwadePhysicalItemData.DerivedData,
> extends SwadeBaseItemData<Schema, BaseData, DerivedData> {
  /** @inheritdoc */
  static override defineSchema(): SwadePhysicalItemData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...physicalItem(),
      ...builder(),
      charges: new fields.EmbeddedDataField(ChargesData),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<SwadePhysicalItemData>) {
    migrations.migrateChargesToArray(source);
    return super.migrateData(source);
  }

  override get isPhysicalItem(): boolean {
    return true;
  }

  protected override async _preUpdate(
    changed: DeepPartial<
      foundry.abstract.TypeDataModel.ParentAssignmentType<Schema, Item>
    >,
    options: Item.Database.PreUpdateOptions,
    user: User.Implementation,
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
