import {
  actions,
  arcaneDevice,
  category,
  equippable,
  favorite,
  grantEmbedded,
  itemDescription,
  physicalItem,
  vehicular,
} from './common';

export interface GearData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof GearData)['defineSchema']>
  > {}

export class GearData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<ReturnType<(typeof GearData)['defineSchema']>>
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
      ...favorite(),
      ...category(),
      ...grantEmbedded(),
      isAmmo: new fields.BooleanField(),
    };
  }
}
