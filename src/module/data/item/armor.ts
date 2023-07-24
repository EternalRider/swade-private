import { _renameActionProperties } from '../../migration/migration';
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
} from './common';

export interface ArmorData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof ArmorData)['defineSchema']>
  > {}

export class ArmorData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof ArmorData)['defineSchema']>
  >
> {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...physicalItem(),
      ...equippable(),
      ...arcaneDevice(),
      ...actions(),
      ...bonusDamage(),
      ...favorite(),
      ...category(),
      ...grantEmbedded(),
      minStr: new fields.StringField({ initial: '' }),
      armor: new fields.NumberField({ initial: 0 }),
      toughness: new fields.NumberField({ initial: 0 }),
      isNaturalArmor: new fields.BooleanField(),
      isHeavyArmor: new fields.BooleanField(),
      locations: new fields.SchemaField({
        head: new fields.BooleanField(),
        torso: new fields.BooleanField({ initial: true }),
        arms: new fields.BooleanField(),
        legs: new fields.BooleanField(),
      }),
    };
  }

  /** @inheritdoc */
  static override migrateData(source) {
    _renameActionProperties(source);
    return super.migrateData(source);
  }
}
