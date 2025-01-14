import { AnyObject } from '@league-of-foundry-developers/foundry-vtt-types/utils';

export class FormulaField extends foundry.data.fields.DataField {
  protected _cast(value: any): string {
    if (typeof value !== 'string') {
      value = value.toString();
    }
    return value.replace('Sm', '@sma').replace(' x ', '*');
  }

  protected override _validateType(
    value: any,
    _options: foundry.data.fields.DataField.ValidationOptions<foundry.data.fields.DataField.Any> = {},
  ): boolean | void {
    if (Number(value) === 0) return true;
    return Roll.validate(value);
  }

  override initialize(
    value: string,
    model: foundry.abstract.DataModel.Any,
    _options?: AnyObject,
  ): number {
    value = this._cast(value);
    if (!model.parent?.actor) return 0;
    const rollData = model.parent?.actor?.getRollData();
    const roll = new Roll(value, rollData);
    const simplifiedTerms = new Array<foundry.dice.terms.RollTerm>();
    for (const term of roll.terms) {
      const simplified = this.#simplifyTerm(term);
      if (Array.isArray(simplified)) simplifiedTerms.push(...simplified);
      else simplifiedTerms.push(simplified);
    }
    roll.terms = simplifiedTerms;
    const evaluated = new Roll(roll.resetFormula()).evaluateSync();
    return evaluated.total;
  }

  #simplifyTerm(
    term: foundry.dice.terms.RollTerm,
  ): foundry.dice.terms.RollTerm | foundry.dice.terms.RollTerm[] {
    if (term instanceof foundry.dice.terms.DiceTerm) {
      return new foundry.dice.terms.NumericTerm({
        number: (term.number ?? 1) * (term.faces ?? 0),
      });
    }
    if (term instanceof foundry.dice.terms.ParentheticalTerm) {
      term.roll.terms = term.roll.terms.map(this.#simplifyTerm.bind(this));
      term.roll = new Roll(term.roll.resetFormula());
      term.term = term.roll.formula;
      return term;
    }
    return term;
  }

  override toObject(value): string {
    return value.toString();
  }
}
