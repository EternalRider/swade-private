import { RollModifier } from '../../../interfaces/additional.interface';
import { TraitDie } from '../../documents/actor/actor-data-source';
import { addUpModifiers } from '../../util';
import { boundTraitDie, makeTraitDiceFields } from '../shared';
import { choiceSets, itemDescription } from './common';

export interface SkillData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof SkillData)['defineSchema']>
  > {}

export interface SkillData {
  effects: RollModifier[];
}

export class SkillData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof SkillData)['defineSchema']>
  >,
  Item
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...choiceSets(),
      attribute: new fields.StringField({ initial: '' }),
      isCoreSkill: new fields.BooleanField(),
      ...makeTraitDiceFields(),
    };
  }

  override prepareBaseData() {
    this.effects ??= new Array<RollModifier>();
  }

  override prepareDerivedData() {
    // TODO: Remove the manual cast after SchemaField issues resolved
    this.die = boundTraitDie(this.die as TraitDie);
    // TODO: Remove the manual cast after SchemaField issues resolved
    this['wild-die'].sides = Math.min(this['wild-die'].sides as number, 12);
  }

  get modifier(): number {
    // TODO: Remove the manual cast after SchemaField issues resolved
    let mod = this.die.modifier as number;
    const attribute = this.attribute;
    const globals = this.parent.actor?.system.stats.globalMods as Record<
      string,
      RollModifier[]
    >;
    mod += this.effects?.reduce(addUpModifiers, 0);
    mod += globals?.trait.reduce(addUpModifiers, 0) ?? 0;
    if (attribute) mod += globals?.[attribute]?.reduce(addUpModifiers, 0);
    return mod;
  }

  get canRoll(): boolean {
    return !!this.parent.actor;
  }
}
