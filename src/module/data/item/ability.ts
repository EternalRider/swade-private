import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { PotentialSource } from '../../../globals';
import { constants } from '../../constants';
import * as migrations from './_migration';
import { SwadeBaseItemData } from './base';
import { builder, category, favorite, grants } from './common';
import {
  Builder,
  Category,
  ChoicesType,
  Favorite,
  Grants,
} from './item-common.interface';

declare namespace AbilityData {
  interface Schema
    extends SwadeBaseItemData.Schema,
      Favorite,
      Category,
      Grants, 
      Builder {
    subtype: foundry.data.fields.StringField<{
      initial: typeof constants.ABILITY_TYPE.SPECIAL;
      choices: ChoicesType<typeof constants.ABILITY_TYPE>;
      textSearch: true;
    }>;
    grantsPowers: foundry.data.fields.BooleanField;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class AbilityData extends SwadeBaseItemData<
  AbilityData.Schema,
  AbilityData.BaseData,
  AbilityData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): AbilityData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...favorite(),
      ...category(),
      ...grants(),
      ...builder(),
      subtype: new fields.StringField({
        initial: constants.ABILITY_TYPE.SPECIAL,
        choices: Object.values(constants.ABILITY_TYPE),
        textSearch: true,
      }),
      grantsPowers: new fields.BooleanField(),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<AbilityData>) {
    migrations.renameRaceToAncestry(source);
    return super.migrateData(source);
  }

  get canHaveCategory() {
    return true;
  }

  get canGrantItems() {
    return true;
  }

  protected override async _preCreate(
    data: foundry.documents.BaseItem.ConstructorData,
    options: DocumentModificationOptions,
    user: BaseUser,
  ) {
    await super._preCreate(data, options, user);
    //Stop Archetypes from being added to the actor as an item if the actor already has one
    const subType = this.subtype;
    if (
      subType === constants.ABILITY_TYPE.ARCHETYPE &&
      !!this.parent.actor?.archetype
    ) {
      ui.notifications.warn('SWADE.Validation.OnlyOneArchetype', {
        localize: true,
      });
      return false;
    }
  }
}

export { AbilityData };
