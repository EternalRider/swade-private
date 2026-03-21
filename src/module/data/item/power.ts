import { PotentialSource } from '../../../globals';
import { ItemChatCardChip, ItemDisplayPowerPoints } from '../../documents/item/SwadeItem.interface';
import { createEnrichedTextEmbed, createEmbedElement } from '../../util';
import { FormulaField } from '../fields';
import { FormulaDerivedValueField } from '../fields/FormulaDerivedValueField';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { SwadeBaseItemData } from './base';
import { actions, activities, favorite, templates } from './common';
import { Actions, Activities, Favorite, Templates } from './item-common.interface';

declare namespace PowerData {
  interface Schema extends SwadeBaseItemData.Schema, Actions, Activities, Favorite, Templates {
    rank: foundry.data.fields.StringField<{ initial: ''; textSearch: true }>;
    pp: foundry.data.fields.NumberField<{ initial: 0 }>;
    damage: FormulaField<{ initial: ''; blank: true; label: string }>;
    range: foundry.data.fields.StringField<{ initial: '@sma' }>;
    duration: foundry.data.fields.StringField<{ initial: '' }>;
    trapping: foundry.data.fields.StringField<{
      initial: '';
      textSearch: true;
    }>;
    arcane: foundry.data.fields.StringField<{ initial: ''; textSearch: true }>;
    ap: foundry.data.fields.NumberField<{ initial: 0 }>;
    innate: foundry.data.fields.BooleanField<{ label: string }>;
    modifiers: foundry.data.fields.ArrayField<foundry.data.fields.ObjectField, { label: string }>;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {
    power: number;
  }
}

class PowerData extends SwadeBaseItemData<PowerData.Schema, PowerData.BaseData, PowerData.DerivedData> {
  /** @inheritdoc */
  static override defineSchema(): PowerData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...actions(),
      ...activities(),
      ...favorite(),
      ...templates(),
      rank: new fields.StringField({
        initial: '',
        textSearch: true,
        label: 'SWADE.Rank',
      }),
      pp: new fields.NumberField({ initial: 0, label: 'SWADE.PP' }),
      damage: new FormulaField({
        initial: '',
        blank: true,
        label: 'SWADE.Dmg',
      }),
      range: new fields.StringField({
        initial: '@sma',
        label: 'SWADE.Range._name',
      }),
      duration: new fields.StringField({ initial: '', label: 'SWADE.Dur' }),
      trapping: new fields.StringField({
        initial: '',
        textSearch: true,
        label: 'SWADE.Trap',
      }),
      arcane: new fields.StringField({
        initial: '',
        textSearch: true,
        label: 'SWADE.Arcane',
      }),
      ap: new fields.NumberField({ initial: 0, label: 'SWADE.Ap' }),
      innate: new fields.BooleanField({ label: 'SWADE.InnatePower' }),
      modifiers: new fields.ArrayField(new fields.ObjectField(), {
        label: 'SWADE.Modifiers',
      }),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<PowerData>) {
    quarantine.ensurePowerPointsAreNumeric(source);
    migrations.renameActionProperties(source);
    return super.migrateData(source);
  }

  override prepareFormulaFields(): void {
    const field = new FormulaDerivedValueField();
    const cleaned = field.clean(this.range);
    if (Roll.validate(cleaned!)) {
      this.range = String(field.initialize(cleaned!, this));
    }
  }

  /** @inheritdoc */
  protected override _initialize(options?: any) {
    super._initialize(options);
    this._applyShims();
  }

  protected _applyShims() {
    shims.actionProperties(this);
  }

  // Called by SwadeItem.powerPoints
  get _powerPoints(): ItemDisplayPowerPoints {
    const actor = this.parent.actor!;
    const arcane = this.arcane || 'general';
    const value = foundry.utils.getProperty(actor, `system.powerPoints.${arcane}.value`) as number;
    const max = foundry.utils.getProperty(actor, `system.powerPoints.${arcane}.max`) as number;
    return { value, max };
  }

  get ppModifiers() {
    let cost = this.pp;
    const modifiers: string[] = [];
    for (const e of this.parent.effects.filter((e) => e.type === 'modifier' && e.active)) {
      cost += e.system.cost ?? 0;
      modifiers.push(e.name);
    }
    const formatter = game.i18n.getListFormatter({ type: 'unit' });
    return { cost, modifierList: formatter.format(modifiers) };
  }

  async getChatChips(): Promise<ItemChatCardChip[]> {
    return [
      { text: this.rank },
      { text: this.arcane },
      { text: this.pp + game.i18n.localize('SWADE.PPAbbreviation') },
      {
        icon: '<i class="fas fa-ruler"></i>',
        text: this.range,
        title: game.i18n.localize('SWADE.Range._name'),
      },
      {
        icon: '<i class="fas fa-shield-alt"></i>',
        text: this.ap,
        title: game.i18n.localize('SWADE.Ap'),
      },
      {
        icon: '<i class="fas fa-hourglass-half"></i>',
        text: this.duration,
        title: game.i18n.localize('SWADE.Dur'),
      },
      { text: this.trapping },
    ];
  }

  _canExpendResources(resourcesUsed = 1): boolean {
    if (this.innate) return true;
    if (!this.parent.actor) return false;
    if (game.settings.get('swade', 'noPowerPoints')) return true;
    const arcane = this.arcane || 'general';
    const ab = this.parent.actor.system.powerPoints[arcane];
    return ab.value >= resourcesUsed;
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
    return await createEmbedElement(this, 'systems/swade/templates/embeds/power-embeds.hbs', ['item-embed', 'power']);
  }
}

export { PowerData };
