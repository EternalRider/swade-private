import { PotentialSource } from '../../../globals';
import { constants } from '../../constants';
import {
  actions,
  arcaneDevice,
  bonusDamage,
  category,
  equippable,
  favorite,
  grantEmbedded,
  itemDescription,
  physicalItem,
  templates,
  vehicular,
} from './common';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';

export interface WeaponData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof WeaponData)['defineSchema']>
  > {}

export class WeaponData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof WeaponData)['defineSchema']>
  >
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
      ...bonusDamage(),
      ...favorite(),
      ...templates(),
      ...category(),
      ...grantEmbedded(),
      damage: new fields.StringField({ initial: '' }),
      range: new fields.StringField({ initial: '' }),
      rangeType: new fields.NumberField({
        integer: true,
        nullable: true,
        initial: null,
        choices: Object.values(constants.WEAPON_RANGE_TYPE),
      }),
      rof: new fields.NumberField({ initial: 1 }),
      ap: new fields.NumberField({ initial: 0, integer: true }),
      parry: new fields.NumberField({ initial: 0 }),
      minStr: new fields.StringField({ initial: '' }),
      shots: new fields.NumberField({ initial: 0 }),
      currentShots: new fields.NumberField({ initial: 0 }),
      ammo: new fields.StringField({ initial: '' }),
      reloadType: new fields.StringField({
        initial: constants.RELOAD_TYPE.NONE,
        choices: Object.values(constants.RELOAD_TYPE),
      }),
      ppReloadCost: new fields.NumberField({ initial: 2 }),
      trademark: new fields.NumberField({ initial: 0, min: 0, integer: true }),
      isHeavyWeapon: new fields.BooleanField(),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<WeaponData>) {
    quarantine.ensurePricesAreNumeric(source);
    quarantine.ensureWeightsAreNumeric(source);
    quarantine.ensureAPisNumeric(source);
    quarantine.ensureRoFisNumeric(source);
    quarantine.ensureShotsAreNumeric(source);

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

  get isMelee(): boolean {
    return (
      this.rangeType === constants.WEAPON_RANGE_TYPE.MIXED ||
      this.rangeType === constants.WEAPON_RANGE_TYPE.MELEE
    );
  }

  get isRanged(): boolean {
    return (
      this.rangeType === constants.WEAPON_RANGE_TYPE.MIXED ||
      this.rangeType === constants.WEAPON_RANGE_TYPE.RANGED
    );
  }
}
