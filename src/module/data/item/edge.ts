import { DataField } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/fields.mjs';
import { PotentialSource } from '../../../globals';
import { SWADE } from '../../config';
import { constants } from '../../constants';
import {
  ItemChatCardChip,
  Requirement,
} from '../../documents/item/SwadeItem.interface';
import { count } from '../../util';
import { RequirementsField } from '../fields/RequirementsField';
import { category, favorite, grants, itemDescription } from './common';
import * as migrations from './_migration';

export interface EdgeData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof EdgeData)['defineSchema']>
  > {}

export class EdgeData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<ReturnType<(typeof EdgeData)['defineSchema']>>
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...favorite(),
      ...category(),
      ...grants(),
      isArcaneBackground: new fields.BooleanField(),
      requirements: new fields.ArrayField(
        new fields.EmbeddedDataField(RequirementsField),
        {
          initial: [
            {
              type: constants.REQUIREMENT_TYPE.RANK,
              value: SWADE.ranks[constants.RANK.NOVICE],
              selector: 'and',
            },
          ],
          validate: (
            value: Requirement[],
            _options: DataField.ValidationOptions<DataField.Any>,
          ) => {
            const failures =
              new foundry.data.validation.DataModelValidationFailure({
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
        },
      ),
    };
  }

  get requirementString() {
    return this.requirements.reduce(
      (
        accumulator: string,
        current: RequirementsField,
        index: number,
        list: RequirementsField[],
      ) => {
        accumulator += current.toString();
        if (index !== list.length - 1) {
          switch (current.combinator) {
            case 'or':
              accumulator +=
                ' ' + game.i18n.localize('SWADE.Requirements.Or') + ' ';
              break;
            case 'and':
              accumulator += ', ';
              break;
          }
        }
        return accumulator;
      },
      '',
    );
  }

  static override migrateData(source: PotentialSource<EdgeData>) {
    migrations.convertRequirementsToList(source);
    return super.migrateData(source);
  }

  static #checkRankRequirements(value: Requirement[]) {
    const rankRequirements = count(
      value,
      (v) => v.type === constants.REQUIREMENT_TYPE.RANK,
    );

    if (rankRequirements > 1) {
      return new foundry.data.validation.DataModelValidationFailure({
        message: 'Cannot have more than one rank requirement',
      });
    }
  }
  static #checkWildCardRequirements(value: Requirement[]) {
    const wildcard = count(
      value,
      (v) => v.type === constants.REQUIREMENT_TYPE.WILDCARD,
    );

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
}
