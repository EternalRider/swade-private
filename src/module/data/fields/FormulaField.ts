export class FormulaField extends foundry.data.fields.StringField {
  protected override _cast(value: any): string {
    if (typeof value !== 'string') {
      value = value?.toString() ?? '';
    } else {
      if (game.settings.get('core', 'language') !== 'en') {
        value = value
          .replace(new RegExp('^' + game.i18n.localize('SWADE.AttrSma')), '@sma')
          .replace(new RegExp('^' + game.i18n.localize('SWADE.AttrSmaShortPowerRange')), '@sma');
      }
      value = value
        .replace(/^-/, '') // core rules stun grenade
        .replace(/( )(x)([ ]*[0-9])*/g, '$1*$3') // core rules power ranges, turns ' x 5' and ' x5' into '*5' (matches <space><x><optional space><number>)
        .replace(/×/g, '*') // U+00D7 Multiplication Sign, used e.g. in Fantasy Companion power ranges
        .replace(/^Smarts/, '@sma')
        .replace(/^Sm/, '@sma');
      return value;
    }
  }

  protected override _validateType(
    value: any,
    _options: foundry.data.fields.DataField.ValidationOptions<foundry.data.fields.DataField.Any> = {},
  ): boolean | void {
    if (!value) console.log(this);
    if (this.blank && Number(value) === 0) return true;
    return Roll.validate(value);
  }
}
