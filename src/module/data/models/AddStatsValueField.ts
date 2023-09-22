import { DataField } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/fields.mjs';

export class AddStatsValueField extends foundry.data.fields.DataField {
  protected _cast(value: string | number | boolean) {
    return value;
  }

  protected override _validateType(
    value: any,
    _options: DataField.ValidationOptions<DataField.Any> = {},
  ): boolean | void {
    const validTypes = ['string', 'number', 'boolean'];
    if (!!value && !validTypes.includes(foundry.utils.getType(value))) {
      throw new Error('must be text, a number, or a boolean');
    }
  }
}
