import {
  DataField,
  SchemaField,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/fields.mjs';
import { DataModelValidationFailure } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/validation-failure.mjs';
import { SimpleMerge } from '@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs';
import type SwadeActor from '../../documents/actor/SwadeActor';
import { PaceSchema } from '../actor/base/creature.schemas';
import { makeDiceField } from '../shared';
import { EffectChangeData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/_types.mjs';

const fields = foundry.data.fields;

function makePaceField(label: string, initial: number | null = null) {
  return new fields.NumberField({
    nullable: true,
    integer: true,
    min: 0,
    initial,
    label,
  });
}

function definePaceSchema(): PaceSchema {
  return {
    base: new fields.StringField({
      required: true,
      initial: 'ground',
      choices: {
        ground: 'SWADE.Movement.Pace.Ground.Label',
        fly: 'SWADE.Movement.Pace.Fly.Label',
        swim: 'SWADE.Movement.Pace.Swim.Label',
        burrow: 'SWADE.Movement.Pace.Burrow.Label',
      },
      label: 'SWADE.Movement.Pace.Base.Label',
      hint: 'SWADE.Movement.Pace.Base.Hint',
    }),
    ground: makePaceField('SWADE.Movement.Pace.Ground.Label', 6),
    fly: makePaceField('SWADE.Movement.Pace.Fly.Label'),
    swim: makePaceField('SWADE.Movement.Pace.Swim.Label'),
    burrow: makePaceField('SWADE.Movement.Pace.Burrow.Label'),
    running: new fields.SchemaField({
      die: makeDiceField(6, 'SWADE.RunningDie'),
      mod: new fields.NumberField({
        initial: 0,
        integer: true,
        label: 'SWADE.RunningMod',
      }),
    }),
  };
}

export class PaceSchemaField<
  Options extends SchemaField.Options<PaceSchema> = SchemaField.DefaultOptions,
> extends foundry.data.fields.SchemaField<PaceSchema, Options> {
  constructor() {
    super(definePaceSchema(), { label: 'SWADE.Pace' } as Options);
  }

  static get paceKeys(): Exclude<keyof PaceSchema, 'base' | 'running'>[] {
    return ['ground', 'fly', 'swim', 'burrow'];
  }

  protected override _validateType(
    value: SchemaField.InitializedType<
      PaceSchema,
      SimpleMerge<Options, SchemaField.DefaultOptions>
    >,
    options?: DataField.ValidationOptions<DataField.Any> | undefined,
  ): boolean | void | DataModelValidationFailure {
    let result = super._validateType(value, options);
    if (!value?.base) return result;
    if (value[value.base] === null) {
      if (!result || typeof result === 'boolean') {
        result = new foundry.data.validation.DataModelValidationFailure({});
      }
      result.fields[this.fieldPath] =
        new foundry.data.validation.DataModelValidationFailure({
          invalidValue: value.base,
          message: game.i18n.localize('SWADE.Validation.InvalidBasePace'),
        });
      throw result.asError();
    }
    return result;
  }

  protected override _castChangeDelta(delta) {
    //@ts-expect-error Protected prototype property
    return fields.NumberField.prototype._castChangeDelta(delta);
  }

  // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
  protected override _applyChangeAdd(
    value: SchemaField.InitializedType<PaceSchema>,
    delta: number,
    _model: SwadeActor,
    _change: EffectChangeData,
  ) {
    for (const key of PaceSchemaField.paceKeys) {
      value[key]! += delta;
    }
    return value;
  }

  // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
  protected override _applyChangeMultiply(
    value: SchemaField.InitializedType<PaceSchema>,
    delta: number,
    _model: SwadeActor,
    _change: EffectChangeData,
  ) {
    for (const key of PaceSchemaField.paceKeys) {
      if (value[key] !== null) value[key]! *= delta;
    }
    return value;
  }

  // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
  protected _applyChangeDowngrade(
    value: SchemaField.InitializedType<PaceSchema>,
    delta: number,
    _model: SwadeActor,
    _change: EffectChangeData,
  ) {
    for (const key of PaceSchemaField.paceKeys) {
      if (value[key] !== null) value[key] = Math.min(value[key]!, delta);
    }
    return value;
  }
}
