import { SWADE } from '../../config';
import { constants } from '../../constants';
import { validateSwid } from '../item/common';
import { ChoicesType } from '../item/item-common.interface';
import { AddStatsValueField } from './AddStatsValueField';

declare namespace RequirementsField {
  interface Schema extends foundry.data.fields.DataSchema {
    type: foundry.data.fields.StringField<{
      required: true;
      initial: typeof constants.REQUIREMENT_TYPE.RANK;
      choices: ChoicesType<typeof constants.REQUIREMENT_TYPE>;
    }>;
    selector: foundry.data.fields.StringField<{
      required: true;
      validate: typeof validateSwid;
    }>;
    value: AddStatsValueField;
    label: foundry.data.fields.StringField<{ required: false }>;
    combinator: foundry.data.fields.StringField<{
      initial: 'and';
      choices: ['and', 'or'];
    }>;
  }
}

class RequirementsField extends foundry.abstract
  .DataModel<RequirementsField.Schema> {
  static get sortOrder() {
    return [
      constants.REQUIREMENT_TYPE.WILDCARD,
      constants.REQUIREMENT_TYPE.RANK,
      constants.REQUIREMENT_TYPE.ATTRIBUTE,
      constants.REQUIREMENT_TYPE.SKILL,
      constants.REQUIREMENT_TYPE.EDGE,
      constants.REQUIREMENT_TYPE.HINDRANCE,
      constants.REQUIREMENT_TYPE.ANCESTRY,
      constants.REQUIREMENT_TYPE.POWER,
      constants.REQUIREMENT_TYPE.OTHER,
    ];
  }

  /** Returns a sorting function to sort requirements */
  static sortFunction(
    order: string[] = this.sortOrder,
  ): (a: RequirementsField, b: RequirementsField) => number {
    return (a, b) => order.indexOf(a.type) - order.indexOf(b.type);
  }

  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      /**The type of requirement */
      type: new fields.StringField({
        choices: Object.values(constants.REQUIREMENT_TYPE),
        initial: constants.REQUIREMENT_TYPE.RANK,
        required: true,
        label: 'Type',
      }),
      /** The actual requirement value, such as an attribute, skill or edge swid */
      selector: new fields.StringField({
        required: true,
        validate: validateSwid,
        label: 'SWADE.Requirements.Editor.SWID',
      }),
      /** For attribute and skill requirements this is used  to denote the die type, for Ranks it is used to denote the rank*/
      value: new AddStatsValueField({
        initial: '',
        required: true,
        label: 'SWADE.Requirements.Editor.Value',
      }),
      /** A simple label, for display */
      label: new fields.StringField({ required: false }),
      combinator: new fields.StringField({
        initial: 'and',
        choices: ['and', 'or'],
        label: 'SWADE.Requirements.Combinator',
      }),
    };
  }

  override toString(): string {
    switch (this.type) {
      case constants.REQUIREMENT_TYPE.WILDCARD:
        return this.value
          ? game.i18n.localize('SWADE.WildCard')
          : game.i18n.localize('SWADE.Extra');
      case constants.REQUIREMENT_TYPE.RANK:
        return SWADE.ranks[this.value];
      case constants.REQUIREMENT_TYPE.ATTRIBUTE:
        return `${SWADE.attributes[this.selector]?.long} d${this.value}+`;
      case constants.REQUIREMENT_TYPE.SKILL:
        return `${this.label} d${this.value}+`;
      case constants.REQUIREMENT_TYPE.POWER:
        return `<i>${this.label}</i>`;
      case constants.REQUIREMENT_TYPE.EDGE:
      case constants.REQUIREMENT_TYPE.HINDRANCE:
      case constants.REQUIREMENT_TYPE.ANCESTRY:
      case constants.REQUIREMENT_TYPE.OTHER:
      default:
        return this.label ?? '';
    }
  }
}

export { RequirementsField };
