import { PotentialSource } from '../../../globals';
import { constants } from '../../constants';
import {
  additionalStats,
  category,
  favorite,
  grants,
  itemDescription,
} from './common';
import * as migrations from './_migration';

export interface AbilityData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof AbilityData)['defineSchema']>
  > {}

export class AbilityData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof AbilityData)['defineSchema']>
  >
> {
  /** @inheritdoc */
  static override defineSchema() {
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
        textSearch: true,
      }),
      grantsPowers: new fields.BooleanField(),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<AbilityData>) {
    migrations.renameRaceToAncestry(source);
    return super.migrateData(source);
  }

  get canHaveCategory() {
    return true;
  }

  get canGrantItems() {
    return true;
  }
}
