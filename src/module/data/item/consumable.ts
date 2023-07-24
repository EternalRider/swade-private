import { constants } from '../../constants';
import {
  category,
  equippable,
  favorite,
  grantEmbedded,
  itemDescription,
  physicalItem,
} from './common';

export interface ConsumableData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof ConsumableData)['defineSchema']>
  > {}

export class ConsumableData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof ConsumableData)['defineSchema']>
  >
> {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...physicalItem(),
      ...equippable(),
      ...favorite(),
      ...category(),
      ...grantEmbedded(),
      charges: new fields.SchemaField({
        value: new fields.NumberField({ initial: 1 }),
        max: new fields.NumberField({ initial: 1 }),
      }),
      messageOnUse: new fields.BooleanField({ initial: true }),
      destroyOnEmpty: new fields.BooleanField(),
      subtype: new fields.StringField({
        initial: constants.CONSUMABLE_TYPE.REGULAR,
        choices: Object.values(constants.CONSUMABLE_TYPE),
        textSearch: true
      }),
    };
  }
}
