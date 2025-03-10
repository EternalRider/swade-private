import { FormulaField } from './FormulaField';

export class FormulaDerivedValueField extends FormulaField {
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
}
