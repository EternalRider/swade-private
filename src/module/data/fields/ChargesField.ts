import { constants } from '../../constants';
import { ConsumableData } from '../item';
import { FormulaField } from './FormulaField';

export interface ChargeData {
  id: string;
  sort: number;
  name: string;
  value: number;
  max: number;
  rechargeAmount: FormulaField;
  rechargeType: string;
}

export interface ChargesSchema extends foundry.data.fields.DataSchema {
  hasCharges: boolean;
  charges: Record<string, ChargeData>;
}

class ChargesField<
  Schema extends ChargesSchema = ChargesSchema,
  Options extends
  foundry.data.fields.SchemaField.Options<Schema> = foundry.data.fields.SchemaField.DefaultOptions,
> extends foundry.data.fields.SchemaField<Schema, Options> {

  constructor(hasCharges: boolean) {
    const fields = ChargesData.defineSchema();
    fields.hasCharges.initial = hasCharges;
    super(fields);
  }

  /** @override */
  initialize(value, model, options = {}) {
    return new ChargesData(value, { parent: model, ...options });
  }
}

export class ChargesData extends foundry.abstract.DataModel<ChargesSchema> {

  static randomID() {
    return foundry.utils.randomID(8);
  }

  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      hasCharges: new fields.BooleanField({ initial: false, label: 'SWADE.HasCharges' }),
      charges: new fields.TypedObjectField(
        new fields.SchemaField({
          id: new fields.StringField({ initial: ChargesData.randomID, required: false }),
          sort: new fields.IntegerSortField(),
          name: new fields.StringField({ initial: game.i18n.localize('SWADE.Charges'), required: true }),
          value: new fields.NumberField({ initial: 1, nullable: false, positive: true }),
          max: new fields.NumberField({ initial: 1, nullable: false, positive: true, min: 1 }),
          rechargeAmount: new FormulaField(),
          rechargeType: new fields.StringField({
            initial: constants.CHARGE_RECHARGE_TYPE.MANUAL,
            choices: Object.values(constants.CHARGE_RECHARGE_TYPE),
            label: 'SWADE.RechargeType',
          }),
        }),
        {
          initial: () => {
            const id = ChargesData.randomID();
            return {
              [id]: {
                id: id,
                sort: 0,
                name: game.i18n.localize('SWADE.Charges'),
                value: 1,
                max: 1,
                rechargeType: constants.CHARGE_RECHARGE_TYPE.MANUAL,
              }
            };
          },
        },
      ),
    };
  }

  static sortFunction(a: ChargeData, b: ChargeData): number {
    return a.sort - b.sort;
  }

  get array(): Array<ChargeData> {
    return (Object.values(this.charges) as Array<ChargeData>);
  }

  get sorted(): Array<ChargeData> {
    return this.array.sort(ChargesData.sortFunction);
  }

  get default(): ChargeData {
    return this.sorted[0];
  }

  get size(): number {
    return Object.keys(this.charges).length;
  }
}

export { ChargesField };
