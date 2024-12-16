import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { PotentialSource } from '../../../globals';
import { constants } from '../../constants';
import { ItemChatCardChip } from '../../documents/item/SwadeItem.interface';
import { createEmbedElement } from '../../util';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { SwadePhysicalItemData } from './base';
import {
  actions,
  activities,
  arcaneDevice,
  category,
  equippable,
  favorite,
  grantEmbedded,
} from './common';
import {
  Actions,
  Activities,
  ArcaneDevice,
  Category,
  Equippable,
  Favorite,
  GrantEmbedded,
} from './item-common.interface';

declare namespace ShieldData {
  interface Schema
    extends SwadePhysicalItemData.Schema,
      Equippable,
      ArcaneDevice,
      Actions,
      Activities,
      Favorite,
      Category,
      GrantEmbedded {
    minStr: foundry.data.fields.StringField<{ initial: '' }>;
    parry: foundry.data.fields.NumberField<{ initial: 0; integer: true }>;
    cover: foundry.data.fields.NumberField<{ initial: 0; integer: true }>;
  }
  interface BaseData extends SwadePhysicalItemData.BaseData {}
  interface DerivedData extends SwadePhysicalItemData.DerivedData {}
}

class ShieldData extends SwadePhysicalItemData<
  ShieldData.Schema,
  ShieldData.BaseData,
  ShieldData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): ShieldData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...equippable(),
      ...arcaneDevice(),
      ...actions(),
      ...activities(),
      ...favorite(),
      ...category(),
      ...grantEmbedded(),
      minStr: new fields.StringField({ initial: '', label: 'SWADE.MinStr' }),
      parry: new fields.NumberField({
        initial: 0,
        integer: true,
        label: 'SWADE.Parry',
      }),
      cover: new fields.NumberField({
        initial: 0,
        integer: true,
        label: 'SWADE.Cover._name',
      }),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<ShieldData>) {
    quarantine.ensurePricesAreNumeric(source);
    quarantine.ensureWeightsAreNumeric(source);
    migrations.renameActionProperties(source);
    return super.migrateData(source);
  }

  /** @inheritdoc */
  protected override _initialize(options?: any) {
    super._initialize(options);
    this._applyShims();
  }

  protected _applyShims() {
    shims.actionProperties(this);
  }

  get canBeArcaneDevice() {
    return true;
  }

  get isReadied(): boolean {
    return Number(this.equipStatus) > constants.EQUIP_STATE.CARRIED;
  }

  async getChatChips(
    enrichOptions: Partial<TextEditor.EnrichmentOptions>,
  ): Promise<ItemChatCardChip[]> {
    const chips = new Array<ItemChatCardChip>();
    if (this.isReadied) {
      chips.push({
        icon: '<i class="fas fa-tshirt"></i>',
        title: game.i18n.localize('SWADE.Equipped'),
      });
    } else {
      chips.push({
        icon: '<i class="fas fa-tshirt" style="color:grey"></i>',
        title: game.i18n.localize('SWADE.Unequipped'),
      });
    }
    chips.push(
      {
        icon: '<i class="fas fa-user-shield"></i>',
        text: this.parry,
        title: game.i18n.localize('SWADE.Parry'),
      },
      {
        icon: '<i class="fas fas fa-umbrella"></i>',
        text: this.cover,
        title: game.i18n.localize('SWADE.Cover._name'),
      },
      {
        icon: '<i class="fas fa-dumbbell"></i>',
        text: this.minStr,
      },
      {
        icon: '<i class="fas fa-sticky-note"></i>',
        text: await TextEditor.enrichHTML(this.notes ?? '', enrichOptions),
        title: game.i18n.localize('SWADE.Notes'),
      },
    );
    return chips;
  }

  protected override async _preCreate(
    data: foundry.documents.BaseItem.ConstructorData,
    options: Item.DatabaseOperations['create'],
    user: BaseUser,
  ) {
    await super._preCreate(data, options, user);
    if (this.parent?.actor?.type === 'npc') {
      this.updateSource({ equipStatus: constants.EQUIP_STATE.EQUIPPED });
    }
  }
  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription = await TextEditor.enrichHTML(
      this.description,
      options,
    );
    return await createEmbedElement(
      this,
      'systems/swade/templates/embeds/shield-embeds.hbs',
      ['item-embed', 'shield'],
    );
  }
}

export { ShieldData };
