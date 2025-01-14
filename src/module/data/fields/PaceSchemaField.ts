import { SimpleMerge } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import type SwadeActor from '../../documents/actor/SwadeActor';
import { PaceSchema } from '../actor/base/creature.schemas';
import { makeDiceField } from '../shared';

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
  Options extends
    foundry.data.fields.SchemaField.Options<PaceSchema> = foundry.data.fields.SchemaField.DefaultOptions,
> extends foundry.data.fields.SchemaField<PaceSchema, Options> {
  constructor() {
    super(definePaceSchema(), { label: 'SWADE.Pace' } as Options);
  }

  static get paceKeys(): Exclude<keyof PaceSchema, 'base' | 'running'>[] {
    return ['ground', 'fly', 'swim', 'burrow'];
  }

  protected override _validateType(
    value: foundry.data.fields.SchemaField.InitializedType<
      PaceSchema,
      SimpleMerge<Options, foundry.data.fields.SchemaField.DefaultOptions>
    >,
    options?:
      | foundry.data.fields.DataField.ValidationOptions<foundry.data.fields.DataField.Any>
      | undefined,
  ): boolean | void | foundry.data.validation.DataModelValidationFailure {
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
    value: foundry.data.fields.SchemaField.InitializedType<PaceSchema>,
    delta: number,
    _model: SwadeActor,
    _change: ActiveEffect.EffectChangeData,
  ) {
    for (const key of PaceSchemaField.paceKeys) {
      value[key]! += delta;
    }
    return value;
  }

  // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
  protected override _applyChangeMultiply(
    value: foundry.data.fields.SchemaField.InitializedType<PaceSchema>,
    delta: number,
    _model: SwadeActor,
    _change: ActiveEffect.EffectChangeData,
  ) {
    for (const key of PaceSchemaField.paceKeys) {
      if (value[key] !== null) value[key]! *= delta;
    }
    return value;
  }

  // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
  protected override _applyChangeDowngrade(
    value: foundry.data.fields.SchemaField.InitializedType<PaceSchema>,
    delta: number,
    _model: SwadeActor,
    _change: ActiveEffect.EffectChangeData,
  ) {
    for (const key of PaceSchemaField.paceKeys) {
      if (value[key] !== null) value[key] = Math.min(value[key]!, delta);
    }
    return value;
  }

  // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
  protected override _applyChangeUpgrade(
    value: foundry.data.fields.SchemaField.InitializedType<PaceSchema>,
    delta: number,
    _model: SwadeActor,
    _change: ActiveEffect.EffectChangeData,
  ) {
    for (const key of PaceSchemaField.paceKeys) {
      if (value[key] !== null) value[key] = Math.max(value[key]!, delta);
    }
    return value;
  }

  // @ts-expect-error Breaking inheritance intentionally via the _castChangeDelta trick
  protected override _applyChangeOverride(
    value: foundry.data.fields.SchemaField.InitializedType<PaceSchema>,
    delta: number,
    _model: SwadeActor,
    _change: ActiveEffect.EffectChangeData,
  ) {
    for (const key of PaceSchemaField.paceKeys) {
      value[key] = delta;
    }
    return value;
  }
}
