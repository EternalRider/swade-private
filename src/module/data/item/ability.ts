import { constants } from '../../constants';
import {
  additionalStats,
  category,
  favorite,
  grants,
  itemDescription,
} from './common';

export interface AbilityData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof AbilityData)['defineSchema']>
  > {}

export class AbilityData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof AbilityData)['defineSchema']>
  >
> {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...favorite(),
      ...category(),
      ...grants(),
      ...additionalStats(),
      subtype: new fields.StringField({
        initial: constants.ABILITY_TYPE.SPECIAL,
        choices: Object.values(constants.ABILITY_TYPE),
        textSearch: true
      }),
      grantsPowers: new fields.BooleanField(),
    };
  }
}
