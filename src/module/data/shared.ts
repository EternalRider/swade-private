import { constants } from '../constants';
import { TraitDie } from '../documents/actor/actor-data-source';
import { AddStatsValueField } from './models/AddStatsValueField';
import { MappingField } from './models/MappingField';

export function makeDiceField(init = 4) {
  return new foundry.data.fields.NumberField({
    initial: init,
    min: 0,
    integer: true,
    positive: true,
  });
}

export function makeTraitDiceFields() {
  const fields = foundry.data.fields;
  return {
    die: new fields.SchemaField({
      sides: makeDiceField(),
      modifier: new fields.NumberField({
        initial: 0,
        integer: true,
      }),
    }),
    'wild-die': new fields.SchemaField({
      sides: makeDiceField(6),
    }),
  };
}

export function makeAdditionalStatsSchema() {
  const fields = foundry.data.fields;
  return new MappingField(
    new fields.SchemaField({
      label: new fields.StringField({ nullable: false }),
      dtype: new fields.StringField({
        nullable: false,
        choices: Object.values(constants.ADDITIONAL_STATS_TYPE),
      }),
      hasMaxValue: new fields.BooleanField({}),
      value: new AddStatsValueField(),
      max: new AddStatsValueField(),
      optionString: new fields.StringField({
        required: false,
        initial: undefined,
      }),
      modifier: new fields.StringField({
        required: false,
        initial: undefined,
      }),
    }),
    { initial: {} },
  );
}

/**
 * @param die The die to adjust
 * @returns the properly adjusted trait die
 */
export function boundTraitDie(die: TraitDie): TraitDie {
  const sides = die.sides;
  if (sides < 4 && sides !== 1) {
    die.sides = 4;
  } else if (sides > 12) {
    const difference = sides - 12;
    die.sides = 12;
    die.modifier += difference / 2;
  }
  return die;
}
