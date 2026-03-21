import { PotentialSource } from '../../../globals';
import { SWADE } from '../../config';
import { constants } from '../../constants';
import { ItemChatCardChip, Requirement } from '../../documents/item/SwadeItem.interface';
import { count, createEmbedElement, createEnrichedTextEmbed } from '../../util';
import { ChargesData } from '../fields';
import { RequirementsField } from '../fields/RequirementsField';
import * as migrations from './_migration';
import { SwadeBaseItemData } from './base';
import { actions, category, favorite, grants } from './common';
import { Actions, Category, Favorite, Grants } from './item-common.interface';

declare namespace EdgeData {
  interface Schema extends SwadeBaseItemData.Schema, Favorite, Category, Actions, Grants {
    isArcaneBackground: foundry.data.fields.BooleanField<{ label: string }>;
    requirements: foundry.data.fields.ArrayField<
      foundry.data.fields.EmbeddedDataField<typeof RequirementsField>,
      {
        initial: Requirement[];
        validate: (
          value: Requirement[],
          _options: foundry.data.fields.DataField.ValidationOptions
        ) => foundry.data.validation.DataModelValidationFailure | undefined;
      }
    >;
    charges: foundry.data.fields.EmbeddedDataField<typeof ChargesData>;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class EdgeData extends SwadeBaseItemData<EdgeData.Schema, EdgeData.BaseData, EdgeData.DerivedData> {
  /** @inheritdoc */
  static override defineSchema(): EdgeData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...favorite(),
      ...category(),
      ...actions(),
      ...grants(),
      charges: new fields.EmbeddedDataField(ChargesData),
      isArcaneBackground: new fields.BooleanField({ label: 'SWADE.ArcBack' }),
      requirements: new fields.ArrayField(new fields.EmbeddedDataField(RequirementsField), {
        label: 'SWADE.Req',
        initial: [
          {
            type: constants.REQUIREMENT_TYPE.RANK,
            value: SWADE.ranks[constants.RANK.NOVICE],
            combinator: 'and',
            selector: '',
          },
        ],
        validate: (value: Requirement[], _options: foundry.data.fields.DataField.ValidationOptions) => {
          const failures = new foundry.data.validation.DataModelValidationFailure({
            unresolved: true,
          });
          const ranksInvalid = this.#checkRankRequirements(value);
          if (ranksInvalid) {
            failures.elements.push({
              id: 'rank',
              name: 'Rank',
              failure: ranksInvalid,
            });
          }
          const wildCardsInvalid = this.#checkWildCardRequirements(value);
          if (wildCardsInvalid) {
            failures.elements.push({
              id: 'wildCard',
              name: 'Wild Card',
              failure: wildCardsInvalid,
            });
          }
          if (failures.elements.length) return failures;
        },
      }),
    };
  }

  get requirementString() {
    return (this.requirements ?? {}).reduce(
      (accumulator: string, current: RequirementsField, index: number, list: RequirementsField[]) => {
        accumulator += current.toString();
        if (index !== list.length - 1) {
          switch (current.combinator) {
            case 'or':
              accumulator += ' ' + game.i18n.localize('SWADE.Requirements.Or') + ' ';
              break;
            case 'and':
              accumulator += ', ';
              break;
          }
        }
        return accumulator;
      },
      ''
    );
  }

  static override migrateData(source: PotentialSource<EdgeData>) {
    migrations.convertRequirementsToList(source);
    migrations.migrateChargesToArray(source);

    // TODO: Do we need this? Added way after the old action property names were there
    migrations.renameActionProperties(source);
    return super.migrateData(source);
  }
  static #checkRankRequirements(value: Requirement[]) {
    const rankRequirements = count(value, (v) => v.type === constants.REQUIREMENT_TYPE.RANK);

    if (rankRequirements > 1) {
      return new foundry.data.validation.DataModelValidationFailure({
        message: 'Cannot have more than one rank requirement',
      });
    }
  }
  static #checkWildCardRequirements(value: Requirement[]) {
    const wildcard = count(value, (v) => v.type === constants.REQUIREMENT_TYPE.WILDCARD);

    if (wildcard > 1) {
      return new foundry.data.validation.DataModelValidationFailure({
        message: 'Cannot have more than one Wild Card/Extra requirement',
      });
    }
  }

  get canHaveCategory() {
    return true;
  }

  get canGrantItems() {
    return true;
  }

  async getChatChips(): Promise<ItemChatCardChip[]> {
    const chips = new Array<ItemChatCardChip>();
    chips.push({
      text: this.requirementString,
    });
    if (this.isArcaneBackground) {
      chips.push({ text: game.i18n.localize('SWADE.Arcane') });
    }
    return chips;
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
    return await createEmbedElement(this, 'systems/swade/templates/embeds/edge-embeds.hbs', ['item-embed', 'edge']);
  }
}

export { EdgeData };
