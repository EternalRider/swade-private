import { constants } from '../../constants';
import { ItemChatCardChip } from '../../documents/item/SwadeItem.interface';
import { createEmbedElement } from '../../util';
import { SwadeBaseItemData } from './base';
import { favorite, grants } from './common';
import { ChoicesType, Favorite, Grants } from './item-common.interface';

declare namespace HindranceData {
  interface Schema extends SwadeBaseItemData.Schema, Favorite, Grants {
    severity: foundry.data.fields.StringField<{
      choices: ChoicesType<typeof constants.HINDRANCE_SEVERITY>;
      initial: typeof constants.HINDRANCE_SEVERITY.EITHER;
      blank: false;
    }>;
    major: foundry.data.fields.BooleanField;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class HindranceData extends SwadeBaseItemData<
  HindranceData.Schema,
  HindranceData.BaseData,
  HindranceData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): HindranceData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...favorite(),
      ...grants(),
      severity: new fields.StringField({
        choices: Object.values(constants.HINDRANCE_SEVERITY),
        initial: constants.HINDRANCE_SEVERITY.EITHER,
        blank: false,
        label: 'SWADE.HindranceSeverity.Label',
      }),
      major: new fields.BooleanField({ label: 'SWADE.MajHind' }),
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

  async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription = await TextEditor.enrichHTML(this.description, options);
    return await createEmbedElement(this,'systems/swade/templates/embeds/hindrance-embeds.hbs', 'hindrance-embed');
  }

}

export { HindranceData };
