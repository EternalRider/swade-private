import { PotentialSource } from '../../../globals';
import { constants } from '../../constants';
import { ItemChatCardChip } from '../../documents/item/SwadeItem.interface';
import { createEnrichedTextEmbed, createEmbedElement } from '../../util';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { SwadePhysicalItemData } from './base';
import { actions, activities, arcaneDevice, category, equippable, favorite, grantEmbedded } from './common';
import {
  Actions,
  Activities,
  ArcaneDevice,
  Category,
  Equippable,
  Favorite,
  GrantEmbedded,
} from './item-common.interface';

declare namespace ArmorData {
  interface Schema
    extends
      SwadePhysicalItemData.Schema,
      Equippable,
      ArcaneDevice,
      Actions,
      Activities,
      Favorite,
      Category,
      GrantEmbedded {
    minStr: foundry.data.fields.StringField<{ initial: ''; label: string }>;
    armor: foundry.data.fields.NumberField<{ initial: 0; label: string }>;
    toughness: foundry.data.fields.NumberField<{ initial: 0; label: string }>;
    isNaturalArmor: foundry.data.fields.BooleanField<{ label: string }>;
    isHeavyArmor: foundry.data.fields.BooleanField<{ label: string }>;
    locations: foundry.data.fields.SchemaField<{
      head: foundry.data.fields.BooleanField<{ label: string }>;
      torso: foundry.data.fields.BooleanField<{ label: string; initial: true }>;
      arms: foundry.data.fields.BooleanField<{ label: string }>;
      legs: foundry.data.fields.BooleanField<{ label: string }>;
    }>;
    energy: foundry.data.fields.SchemaField<
      {
        value: foundry.data.fields.NumberField<{
          integer: true;
          initial: 0;
          label: string;
        }>;
        max: foundry.data.fields.NumberField<{
          integer: true;
          initial: 0;
          label: string;
        }>;
        enabled: foundry.data.fields.BooleanField<{ label: string }>;
      },
      { label: string }
    >;
    mods: foundry.data.fields.SchemaField<{
      value: foundry.data.fields.NumberField<{
        integer: true;
        initial: 0;
        label: string;
      }>;
      max: foundry.data.fields.NumberField<{
        integer: true;
        initial: 0;
        label: string;
      }>;
    }>;
  }
  interface BaseData extends SwadePhysicalItemData.BaseData {}
  interface DerivedData extends SwadePhysicalItemData.DerivedData {}
}
class ArmorData extends SwadePhysicalItemData<ArmorData.Schema, ArmorData.BaseData, ArmorData.DerivedData> {
  static override defineSchema(): ArmorData.Schema {
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
      energy: new fields.SchemaField(
        {
          value: new fields.NumberField({
            integer: true,
            initial: 0,
            label: 'SWADE.Energy.Value',
          }),
          max: new fields.NumberField({
            integer: true,
            initial: 0,
            label: 'SWADE.Energy.Max',
          }),
          enabled: new fields.BooleanField({ label: 'SWADE.Energy.Enable' }),
        },
        { label: 'SWADE.Energy.Label' }
      ),
      mods: new fields.SchemaField({
        value: new fields.NumberField({
          integer: true,
          initial: 0,
          label: 'SWADE.Mods',
        }),
        max: new fields.NumberField({
          integer: true,
          initial: 0,
          label: 'SWADE.MaxMods',
        }),
      }),
    };
  }

  static override migrateData(source: PotentialSource<ArmorData>) {
    quarantine.ensurePricesAreNumeric(source);
    quarantine.ensureWeightsAreNumeric(source);
    migrations.renameActionProperties(source);
    return super.migrateData(source);
  }

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

  async getChatChips(enrichOptions: Partial<TextEditor.EnrichmentOptions>): Promise<ItemChatCardChip[]> {
    const chips = new Array<ItemChatCardChip>();
    for (const [location, covered] of Object.entries(this.locations)) {
      if (!covered) continue;
      chips.push({
        text: game.i18n.localize(`SWADE.${location.charAt(0).toUpperCase() + location.slice(1)}`),
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
        text: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.notes ?? '', enrichOptions),
        title: game.i18n.localize('SWADE.Notes'),
      }
    );
    return chips;
  }

  protected override async _preCreate(
    data: foundry.abstract.TypeDataModel.ParentAssignmentType<ArmorData.Schema, Item<'armor'>>,
    options: Item.Database.PreCreateOptions,
    user: User.Implementation
  ) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (this.parent?.actor?.type === 'npc') {
      this.updateSource({ equipStatus: constants.EQUIP_STATE.EQUIPPED });
    }
  }

  declare enrichedDescription?: string;

  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions
  ): Promise<HTMLElement | HTMLCollection | null> {
    // If description=true, render only the description
    if (config.description === true) {
      return createEnrichedTextEmbed(this.description || '', config, options);
    }

    config.caption = false;
    this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
      ...options,
    });
    return await createEmbedElement(this, 'systems/swade/templates/embeds/armor-embeds.hbs', ['item-embed', 'armor']);
  }
}

export { ArmorData };
