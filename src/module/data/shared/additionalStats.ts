import { constants } from '../../constants';
import { AddStatsValueField } from '../fields/AddStatsValueField';
import { MappingField } from '../fields/MappingField';

const fields = foundry.data.fields;
export function makeAdditionalStatsSchema() {
  return new MappingField(
    new fields.SchemaField({
      label: new fields.StringField({ nullable: false }),
      dtype: new fields.StringField({
        nullable: false,
        required: true,
        choices: Object.values(constants.ADDITIONAL_STATS_TYPE),
      }),
      hasMaxValue: new fields.BooleanField({}),
      value: new AddStatsValueField(),
      max: new AddStatsValueField(),
      optionString: new fields.StringField({
        required: false,
        initial: undefined,
      }),
      modifier: new fields.StringField({
        required: false,
        initial: undefined,
      }),
    }),
    { initial: {} },
  );
}
