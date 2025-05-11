import { constants } from '../../constants';
import { AddStatsValueField } from '../fields/AddStatsValueField';

const fields = foundry.data.fields;
export function makeAdditionalStatsSchema() {
  return new fields.TypedObjectField(
    new fields.SchemaField({
      label: new fields.StringField({
        nullable: false,
        label: 'SWADE.AdditionalStats.Label',
      }),
      dtype: new fields.StringField({
        nullable: false,
        required: true,
        choices: Object.values(constants.ADDITIONAL_STATS_TYPE),
        label: 'SWADE.AdditionalStats.Type',
      }),
      hasMaxValue: new fields.BooleanField({
        label: 'SWADE.AdditionalStats.HasMaxValue',
      }),
      value: new AddStatsValueField({ label: 'SWADE.AdditionalStats.Value' }),
      max: new AddStatsValueField({ label: 'SWADE.AdditionalStats.MaxLabel' }),
      optionString: new fields.StringField({
        required: false,
        initial: undefined,
        label: 'SWADE.AdditionalStats.OptionLabel',
      }),
      modifier: new fields.StringField({
        required: false,
        initial: undefined,
        label: 'SWADE.Modifier',
      }),
    }),
    { initial: {}, label: 'SWADE.AddStats' },
  );
}
