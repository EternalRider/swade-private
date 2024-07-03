import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { PotentialSource, Updates } from '../../../globals';
import { constants } from '../../constants';
import { UsageUpdates } from '../../documents/item/SwadeItem.interface';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { SwadePhysicalItemData } from './base';
import {
  actions,
  arcaneDevice,
  category,
  equippable,
  favorite,
  grantEmbedded,
  vehicular,
} from './common';
import {
  Actions,
  ArcaneDevice,
  Category,
  Equippable,
  Favorite,
  GrantEmbedded,
  Vehicular,
} from './item-common.interface';

declare namespace GearData {
  interface Schema
    extends SwadePhysicalItemData.Schema,
      Equippable,
      ArcaneDevice,
      Vehicular,
      Actions,
      Favorite,
      Category,
      GrantEmbedded {
    isAmmo: foundry.data.fields.BooleanField;
  }
  interface BaseData extends SwadePhysicalItemData.BaseData {}
  interface DerivedData extends SwadePhysicalItemData.DerivedData {}
}

class GearData extends SwadePhysicalItemData<
  GearData.Schema,
  GearData.BaseData,
  GearData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): GearData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...equippable(),
      ...arcaneDevice(),
      ...vehicular(),
      ...actions(),
      ...favorite(),
      ...category(),
      ...grantEmbedded(),
      isAmmo: new fields.BooleanField(),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<GearData>) {
    quarantine.ensurePricesAreNumeric(source);
    quarantine.ensureWeightsAreNumeric(source);
    migrations.renameActionProperties(source);
    return super.migrateData(source);
  }

  protected override _initialize(options?: any) {
    super._initialize(options);
    this._applyShims();
  }

  protected _applyShims() {
    shims.actionProperties(this);
  }

  get canBeArcaneDevice() {
    return true;
  }

  get isReadied(): boolean {
    return Number(this.equipStatus) > constants.EQUIP_STATE.CARRIED;
  }

  /** Used by SwadeItem.consume */
  _getUsageUpdates(chargesToUse: number): UsageUpdates {
    const actorUpdates: Updates = {};
    const itemUpdates: Updates = {};
    const resourceUpdates = new Array<Updates>();

    itemUpdates['system.quantity'] = Number(this.quantity) - chargesToUse;

    return { actorUpdates, itemUpdates, resourceUpdates };
  }

  protected override async _preCreate(
    _data: foundry.documents.BaseItem.ConstructorData,
    _options: DocumentModificationOptions,
    _user: BaseUser,
  ) {
    if (this.parent?.actor?.type === 'npc') {
      this.updateSource({ equipStatus: constants.EQUIP_STATE.EQUIPPED });
    }
  }
}

export { GearData };
