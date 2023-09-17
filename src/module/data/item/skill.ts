import { boundTraitDie, makeTraitDiceFields } from '../shared';
import { itemDescription } from './common';

export interface SkillData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof SkillData)['defineSchema']>
  > {}

export class SkillData extends foundry.abstract.TypeDataModel<
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

  override prepareBaseData() {
    this.effects ??= new Array<RollModifier>();
  }

  override prepareDerivedData() {
    this.die = boundTraitDie(this.die);
    this['wild-die'].sides = Math.min(this['wild-die'].sides, 12);
  }
}
