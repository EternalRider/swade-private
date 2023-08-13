import { makeTraitDiceFields } from '../shared';
import { itemDescription } from './common';

export interface SkillData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof SkillData)['defineSchema']>
  > {}

export class SkillData extends foundry.abstract.DataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof SkillData)['defineSchema']>
  >
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      attribute: new fields.StringField({ initial: '' }),
      isCoreSkill: new fields.BooleanField(),
      ...makeTraitDiceFields(),
    };
  }
}
