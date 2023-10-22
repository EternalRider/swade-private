import { DerivedModifier } from '../../../interfaces/additional.interface';
import { makeAdditionalStatsSchema } from '../shared';

export interface VehicleData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof VehicleData)['defineSchema']>
  > {}

export class VehicleData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof VehicleData)['defineSchema']>
  >
> {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      size: new fields.NumberField({ initial: 0 }),
      scale: new fields.NumberField({ initial: 0 }),
      classification: new fields.StringField({ initial: '', textSearch: true }),
      handling: new fields.NumberField({ initial: 0 }),
      cost: new fields.NumberField({ initial: 0 }),
      topspeed: new fields.StringField({ initial: '' }),
      description: new fields.HTMLField({ initial: '', textSearch: true }),
      toughness: new fields.SchemaField({
        total: new fields.NumberField({ initial: 0 }),
        armor: new fields.NumberField({ initial: 0 }),
      }),
      wounds: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0 }),
        max: new fields.NumberField({ initial: 3 }),
        ignored: new fields.NumberField({ initial: 0 }),
      }),
      crew: new fields.SchemaField({
        required: new fields.SchemaField({
          value: new fields.NumberField({ initial: 1 }),
          max: new fields.NumberField({ initial: 1 }),
        }),
        optional: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0 }),
          max: new fields.NumberField({ initial: 0 }),
        }),
      }),
      driver: new fields.SchemaField({
        id: new fields.StringField({ initial: null, nullable: true }),
        skill: new fields.StringField({ initial: '' }),
        skillAlternative: new fields.StringField({ initial: '' }),
      }),
      status: new fields.SchemaField({
        isOutOfControl: new fields.BooleanField(),
        isWrecked: new fields.BooleanField(),
      }),
      initiative: new fields.SchemaField({
        hasHesitant: new fields.BooleanField(),
        hasLevelHeaded: new fields.BooleanField(),
        hasImpLevelHeaded: new fields.BooleanField(),
        hasQuick: new fields.BooleanField(),
      }),
      additionalStats: makeAdditionalStatsSchema(),
      maxCargo: new fields.NumberField({ initial: 0 }),
      maxMods: new fields.NumberField({ initial: 0 }),
    };
  }

  /** @inheritdoc */
  override prepareBaseData() {
    //setup the global modifier container object
    this.stats = {
      globalMods: {
        attack: new Array<DerivedModifier>(),
        damage: new Array<DerivedModifier>(),
        ap: new Array<DerivedModifier>(),
      },
    };
  }

  /** @inheritdoc */
  override prepareDerivedData() {
    this.scale = this.parent.calcScale(this.size);
  }

  get encumbered() {
    return false;
  }
}
