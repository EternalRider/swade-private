import { normalizeRollValue } from '../../util';

export class FormulaField<
  Options extends
    foundry.data.fields.StringField.Options = foundry.data.fields.StringField.DefaultOptions,
> extends foundry.data.fields.StringField<Options> {
  protected override _cast(value: any) {
    if (typeof value !== 'string') {
      value = value?.toString() ?? '';
    } else {
      if (game.settings.get('core', 'language') !== 'en') {
        const smartsLong = game.i18n.localize('SWADE.AttrSma');
        const smartsShort = game.i18n.localize('SWADE.AttrSmaShortPowerRange');
        value = value
          .replace(new RegExp('^' + smartsLong), '@sma')
          .replace(new RegExp('^' + smartsShort), '@sma');
      }
      value = value
        .replaceAll(/–/g, '') // SFC, EN DASH not minus, so safe to remove
        .replaceAll(/—/g, '') // EM DASH not minus, so safe to remove
        .replaceAll(/―/g, '') // FIGURE DASH not minus, so safe to remove
        .replaceAll(/―/g, '') // HORIZONTAL BAR not minus, so safe to remove
        .replaceAll(/( )(x)([ ]*[0-9])*/g, '$1*$3') // core rules power ranges, turns ' x 5' and ' x5' into '*5' (matches <space><x><optional space><number>)
        .replaceAll(/×/g, '*') // U+00D7 Multiplication Sign, used e.g. in Fantasy Companion power ranges
        .replace(/^Smarts/, '@sma')
        .replace(/^Sm/, '@sma');
    }
    return value;
  }

  protected override _validateType(
    value: any,
    _options: foundry.data.fields.DataField.ValidationOptions = {},
  ): boolean | void {
    if (this.blank && Number(value) === 0) return true;
    return Roll.validate(value);
  }

  protected override _castChangeDelta(delta: string | number) {
    return normalizeRollValue(
      delta,
    ) as foundry.data.fields.StringField.InitializedType<Options>;
  }
}
