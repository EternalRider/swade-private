import { DataModel } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs';
import { DataField } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/fields.mjs';
import { AnyObject } from '@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs';

export class FormulaField extends foundry.data.fields.DataField {
  constructor(options: DataFieldOptions.Any = {}) {
    super(options as DataField.DefaultOptions);
  }

  protected _cast(value: any): string {
    if (typeof value !== 'string') {
      value = value.toString();
    }
    return value.replace('Sm', '@sma').replace(' x ', '*');
  }

  protected override _validateType(
    value: any,
    _options: DataField.ValidationOptions<DataField.Any> = {},
  ): boolean | void {
    if (Number(value) === 0) return true;
    return Roll.validate(value);
  }

  override initialize(
    value: string,
    model: DataModel.Any,
    _options?: AnyObject,
  ): number {
    value = this._cast(value);
    if (!model.parent.actor) return 0;
    const rollData = model.parent.actor.getRollData();
    const roll = new Roll(value, rollData);
    roll.terms = roll.terms.map((term) => {
      if (term instanceof foundry.dice.terms.DiceTerm) {
        return new foundry.dice.terms.NumericTerm({
          number: (term.number ?? 1) * (term.faces ?? 0),
        });
      }
      return term;
    });
    const evaluated = new Roll(roll.resetFormula(), rollData).evaluateSync();
    return evaluated.total;
  }

  override toObject(value): string {
    return value;
  }
}
