import { constants } from '../../constants';
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

export class ChargesData extends foundry.abstract.DataModel<ChargesSchema> {
  static get initialHasCharges() {
    return false;
  }

  static randomID() {
    return foundry.utils.randomID(8);
  }

  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      hasCharges: new fields.BooleanField({ initial: this.initialHasCharges, label: 'SWADE.HasCharges' }),
      charges: new fields.ArrayField(
        new fields.SchemaField({
          id: new fields.StringField({ initial: ChargesData.randomID, required: false }),
          sort: new fields.IntegerSortField(),
          name: new fields.StringField({ initial: game.i18n.localize('SWADE.Charges'), required: true }),
          value: new fields.NumberField({ initial: 1, nullable: false, min: 0 }),
          max: new fields.NumberField({ initial: 1, nullable: false, positive: true, min: 1 }),
          rechargeAmount: new FormulaField({ initial: '' }),
          rechargeType: new fields.StringField({
            initial: constants.CHARGE_RECHARGE_TYPE.FINITE,
            choices: Object.values(constants.CHARGE_RECHARGE_TYPE),
            label: 'SWADE.RechargeType',
          }),
        }),
        {
          initial: () => {
            return [
              {
                id: ChargesData.randomID(),
                sort: 0,
                name: game.i18n.localize('SWADE.Charges'),
                value: 1,
                max: 1,
                rechargeType: constants.CHARGE_RECHARGE_TYPE.FINITE,
              },
            ];
          },
        }
      ),
    };
  }

  static sortFunction(a: ChargeData, b: ChargeData): number {
    return a.sort - b.sort;
  }

  get default(): ChargeData {
    return this.charges[0];
  }

  get size(): number {
    return this.charges.length;
  }

  find(id: string): ChargeData {
    return this.charges.find((c) => c.id === id);
  }
}

export class DefaultHasChargesData extends ChargesData {
  static get initialHasCharges() {
    return true;
  }
}
