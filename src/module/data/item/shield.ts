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

export interface ShieldData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof ShieldData)['defineSchema']>
  > {}

export class ShieldData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof ShieldData)['defineSchema']>
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
      parry: new fields.NumberField({ initial: 0, integer: true }),
      cover: new fields.NumberField({ initial: 0, integer: true }),
    };
  }

  /** @inheritdoc */
  static override migrateData(source) {
    _renameActionProperties(source);
    return super.migrateData(source);
  }
}
