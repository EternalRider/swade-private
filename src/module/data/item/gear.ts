import { PotentialSource, Updates } from '../../../globals';
import {
  actions,
  arcaneDevice,
  category,
  choiceSets,
  equippable,
  favorite,
  grantEmbedded,
  itemDescription,
  physicalItem,
  vehicular,
} from './common';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { constants } from '../../constants';
import { UsageUpdates } from '../../documents/item/SwadeItem.interface';

export interface GearData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof GearData)['defineSchema']>
  > {}

export class GearData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof GearData)['defineSchema']>
  >,
  Item
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...physicalItem(),
      ...equippable(),
      ...arcaneDevice(),
      ...vehicular(),
      ...actions(),
      ...favorite(),
      ...category(),
      ...grantEmbedded(),
      ...choiceSets(),
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

  /** @inheritdoc */
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

  get isPhysicalItem() {
    return true;
  }

  /** Used by SwadeItem.consume */
  _getUsageUpdates(chargesToUse: number): UsageUpdates {
    const actorUpdates: Updates = {};
    const itemUpdates: Updates = {};
    const resourceUpdates = new Array<Updates>();

    itemUpdates['system.quantity'] = Number(this.quantity) - chargesToUse;

    return { actorUpdates, itemUpdates, resourceUpdates };
  }
}
