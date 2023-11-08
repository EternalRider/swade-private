import { constants } from '../../constants';
import { ItemChatCardChip } from '../../documents/item/SwadeItem.interface';
import { favorite, grants, itemDescription } from './common';

export interface HindranceData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof HindranceData)['defineSchema']>
  > {}

export class HindranceData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof HindranceData)['defineSchema']>
  >
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...favorite(),
      ...grants(),
      severity: new fields.StringField({
        choices: Object.values(constants.HINDRANCE_SEVERITY),
        initial: constants.HINDRANCE_SEVERITY.EITHER,
        blank: false,
      }),
      major: new fields.BooleanField(),
    };
  }

  get isMajor(): boolean {
    return (
      this.severity === constants.HINDRANCE_SEVERITY.MAJOR ||
      (this.severity === constants.HINDRANCE_SEVERITY.EITHER &&
        this.major === true)
    );
  }

  get canGrantItems() {
    return true;
  }

  async getChatChips(): Promise<ItemChatCardChip[]> {
    return [
      {
        text: this.isMajor
          ? game.i18n.localize('SWADE.Major')
          : game.i18n.localize('SWADE.Minor'),
      },
    ];
  }
}
