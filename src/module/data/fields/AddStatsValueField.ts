export class AddStatsValueField extends foundry.data.fields.DataField {
  constructor(options: foundry.data.fields.DataField.Options.Any = {}) {
    super(options as foundry.data.fields.DataField.DefaultOptions);
  }

  protected _cast(value: string | number | boolean) {
    if (typeof value !== 'string') return value;
    if (['true', 'false'].includes(value)) return value === 'true';
    if (Number.isNumeric(value)) return Number(value);
    return value;
  }

  protected override _validateType(
    value: any,
    _options: foundry.data.fields.DataField.ValidationOptions = {},
  ): boolean | void {
    const validTypes = ['string', 'number', 'boolean'];
    if (!!value && !validTypes.includes(foundry.utils.getType(value))) {
      throw new Error('must be text, a number, or a boolean');
    }
  }
}
