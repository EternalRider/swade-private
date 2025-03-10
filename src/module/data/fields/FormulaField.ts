export class FormulaField extends foundry.data.fields.StringField {
  protected override _cast(value: any): string {
    if (typeof value !== 'string') {
      value = value?.toString() ?? '';
    } else {
      return value
        .replace('-', '') // core rules stun grenade
        .replace(' x ', '*') // core rules power ranges
        .replace(/^Sm/, '@sma');
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
