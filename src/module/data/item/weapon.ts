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

export interface WeaponData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof WeaponData)['defineSchema']>
  > {}

export class WeaponData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof WeaponData)['defineSchema']>
  >
> {
  static defineSchema() {
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
      rof: new fields.NumberField({ initial: 1 }),
      ap: new fields.NumberField({ initial: 0 }),
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
      trademark: new fields.NumberField({ initial: 0 }),
      isHeavyWeapon: new fields.BooleanField(),
    };
  }
}
