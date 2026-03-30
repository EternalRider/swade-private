import { PotentialSource } from '../../../globals';
import { constants } from '../../constants';
import { ItemChatCardChip } from '../../documents/item/SwadeItem.interface';
import { createEmbedElement, createEnrichedTextEmbed } from '../../util';
import { ChargesData } from '../fields';
import * as migrations from './_migration';
import { SwadeBaseItemData } from './base';
import { actions, favorite, grants } from './common';
import { Actions, ChoicesType, Favorite, Grants } from './item-common.interface';

declare namespace HindranceData {
  interface Schema extends SwadeBaseItemData.Schema, Favorite, Actions, Grants {
    severity: foundry.data.fields.StringField<{
      choices: ChoicesType<typeof constants.HINDRANCE_SEVERITY>;
      initial: typeof constants.HINDRANCE_SEVERITY.EITHER;
      blank: false;
    }>;
    major: foundry.data.fields.BooleanField<{ label: string }>;
    charges: foundry.data.fields.EmbeddedDataField<typeof ChargesData>;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class HindranceData extends SwadeBaseItemData<HindranceData.Schema, HindranceData.BaseData, HindranceData.DerivedData> {
  /** @inheritdoc */
  static override defineSchema(): HindranceData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...favorite(),
      ...actions(),
      ...grants(),
      charges: new fields.EmbeddedDataField(ChargesData),
      severity: new fields.StringField({
        choices: Object.values(constants.HINDRANCE_SEVERITY),
        initial: constants.HINDRANCE_SEVERITY.EITHER,
        blank: false,
        label: 'SWADE.HindranceSeverity.Label',
      }),
      major: new fields.BooleanField({ label: 'SWADE.MajHind' }),
    };
  }

  static override migrateData(source: PotentialSource<HindranceData>) {
    migrations.migrateChargesToArray(source);
    return super.migrateData(source);
  }

  get isMajor(): boolean {
    return (
      this.severity === constants.HINDRANCE_SEVERITY.MAJOR ||
      (this.severity === constants.HINDRANCE_SEVERITY.EITHER && this.major === true)
    );
  }

  get canGrantItems() {
    return true;
  }

  async getChatChips(): Promise<ItemChatCardChip[]> {
    return [
      {
        text: this.isMajor ? game.i18n.localize('SWADE.Major') : game.i18n.localize('SWADE.Minor'),
      },
    ];
  }

  declare enrichedDescription?: string;

  override async toEmbed(
    config: foundry.applications.ux.TextEditor.DocumentHTMLEmbedConfig,
    options: foundry.applications.ux.TextEditor.EnrichmentOptions
  ): Promise<HTMLElement | HTMLCollection | null> {
    // If description=true, render only the description
    if (config.description === true) {
      return createEnrichedTextEmbed(this.description || '', config, options);
    }

    config.caption = false;
    this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
      ...options,
    });
    return await createEmbedElement(this, 'systems/swade/templates/embeds/hindrance-embeds.hbs', [
      'item-embed',
      'hindrance',
    ]);
  }
}

export { HindranceData };
