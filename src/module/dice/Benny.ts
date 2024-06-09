export default class Benny extends foundry.dice.terms.DiceTerm {
  constructor(termData: foundry.dice.terms.DiceTerm.TermData) {
    termData.faces = 2;
    super(termData);
  }

  /** @override */
  static override DENOMINATION = 'b';

  /** @override */
  override get isDeterministic(): boolean {
    return true;
  }

  /** @override */
  override getResultLabel(_result: foundry.dice.terms.DiceTerm.Result): string {
    return 'b';
  }
}
