import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { PotentialSource } from '../../../globals';
import { constants } from '../../constants';
import { ItemChatCardChip } from '../../documents/item/SwadeItem.interface';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { SwadePhysicalItemData } from './base';
import {
  actions,
  arcaneDevice,
  bonusDamage,
  category,
  equippable,
  favorite,
  grantEmbedded,
} from './common';
import {
  Actions,
  ArcaneDevice,
  BonusDamage,
  Category,
  Equippable,
  Favorite,
  GrantEmbedded,
} from './item-common.interface';
import { createEmbedElement } from '../../util';

declare namespace ArmorData {
  interface Schema
    extends SwadePhysicalItemData.Schema,
      Equippable,
      ArcaneDevice,
      Actions,
      BonusDamage,
      Favorite,
      Category,
      GrantEmbedded {
    minStr: foundry.data.fields.StringField<{ initial: '' }>;
    armor: foundry.data.fields.NumberField<{ initial: 0 }>;
    toughness: foundry.data.fields.NumberField<{ initial: 0 }>;
    isNaturalArmor: foundry.data.fields.BooleanField;
    isHeavyArmor: foundry.data.fields.BooleanField;
    locations: foundry.data.fields.SchemaField<{
      head: foundry.data.fields.BooleanField;
      torso: foundry.data.fields.BooleanField<{ initial: true }>;
      arms: foundry.data.fields.BooleanField;
      legs: foundry.data.fields.BooleanField;
    }>;
  }
  interface BaseData extends SwadePhysicalItemData.BaseData {}
  interface DerivedData extends SwadePhysicalItemData.DerivedData {}
}
class ArmorData extends SwadePhysicalItemData<
  ArmorData.Schema,
  ArmorData.BaseData,
  ArmorData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): ArmorData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...equippable(),
      ...arcaneDevice(),
      ...actions(),
      ...bonusDamage(),
      ...favorite(),
      ...category(),
      ...grantEmbedded(),
      minStr: new fields.StringField({ initial: '', label: 'SWADE.MinStr' }),
      armor: new fields.NumberField({ initial: 0, label: 'SWADE.Armor' }),
      toughness: new fields.NumberField({ initial: 0, label: 'SWADE.Tough' }),
      isNaturalArmor: new fields.BooleanField({ label: 'SWADE.NaturalArmor' }),
      isHeavyArmor: new fields.BooleanField({ label: 'SWADE.HeavyArmor' }),
      locations: new fields.SchemaField({
        head: new fields.BooleanField({ label: 'SWADE.Head' }),
        torso: new fields.BooleanField({ initial: true, label: 'SWADE.Torso' }),
        arms: new fields.BooleanField({ label: 'SWADE.Arms' }),
        legs: new fields.BooleanField({ label: 'SWADE.Legs' }),
      }),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<ArmorData>) {
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
    for (const [location, covered] of Object.entries(this.locations)) {
      if (!covered) continue;
      chips.push({
        text: game.i18n.localize(
          `SWADE.${location.charAt(0).toUpperCase() + location.slice(1)}`,
        ),
      });
    }
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
        icon: '<i class="fas fa-shield-alt"></i>',
        title: game.i18n.localize('SWADE.Armor'),
        text: this.armor,
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
    options: DocumentModificationOptions,
    user: BaseUser,
  ) {
    await super._preCreate(data, options, user);
    if (this.parent?.actor?.type === 'npc') {
      this.updateSource({ equipStatus: constants.EQUIP_STATE.EQUIPPED });
    }
  }

  async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription = await TextEditor.enrichHTML(this.description, options);
    return await createEmbedElement(this,'systems/swade/templates/embeds/armor-embeds.hbs', 'armor-embed');
  }

}

export { ArmorData };
