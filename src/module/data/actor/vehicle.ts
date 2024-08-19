import { DerivedModifier } from '../../../interfaces/additional.interface';
import SwadeActor from '../../documents/actor/SwadeActor';
import { createEmbedElement } from '../../util';
import { makeAdditionalStatsSchema } from '../shared';
import * as migrations from './_migration';

declare namespace VehicleData {
  interface Schema extends DataSchema {
    size: foundry.data.fields.NumberField<{ initial: 0 }>;
    scale: foundry.data.fields.NumberField<{ initial: 0 }>;
    classification: foundry.data.fields.StringField<{
      initial: '';
      textSearch: true;
    }>;
    handling: foundry.data.fields.NumberField<{ initial: 0 }>;
    cost: foundry.data.fields.NumberField<{ initial: 0 }>;
    topspeed: foundry.data.fields.SchemaField<{
      value: foundry.data.fields.NumberField<{ initial: 0; min: 0 }>;
      unit: foundry.data.fields.StringField;
    }>;
    description: foundry.data.fields.HTMLField<{
      initial: '';
      textSearch: true;
    }>;
    toughness: foundry.data.fields.SchemaField<{
      total: foundry.data.fields.NumberField<{ initial: 0 }>;
      armor: foundry.data.fields.NumberField<{ initial: 0 }>;
    }>;
    wounds: foundry.data.fields.SchemaField<{
      value: foundry.data.fields.NumberField<{ initial: 0 }>;
      max: foundry.data.fields.NumberField<{ initial: 3 }>;
      ignored: foundry.data.fields.NumberField<{ initial: 0 }>;
    }>;
    crew: foundry.data.fields.SchemaField<{
      required: foundry.data.fields.SchemaField<{
        value: foundry.data.fields.NumberField<{ initial: 1 }>;
        max: foundry.data.fields.NumberField<{ initial: 1 }>;
      }>;
      optional: foundry.data.fields.SchemaField<{
        value: foundry.data.fields.NumberField<{ initial: 0 }>;
        max: foundry.data.fields.NumberField<{ initial: 0 }>;
      }>;
    }>;
    driver: foundry.data.fields.SchemaField<{
      id: foundry.data.fields.StringField<{ initial: null; nullable: true }>;
      skill: foundry.data.fields.StringField<{ initial: '' }>;
      skillAlternative: foundry.data.fields.StringField<{ initial: '' }>;
    }>;
    status: foundry.data.fields.SchemaField<{
      isOutOfControl: foundry.data.fields.BooleanField;
      isWrecked: foundry.data.fields.BooleanField;
    }>;
    initiative: foundry.data.fields.SchemaField<{
      hasHesitant: foundry.data.fields.BooleanField;
      hasLevelHeaded: foundry.data.fields.BooleanField;
      hasImpLevelHeaded: foundry.data.fields.BooleanField;
      hasQuick: foundry.data.fields.BooleanField;
    }>;
    additionalStats: ReturnType<typeof makeAdditionalStatsSchema>;
    maxCargo: foundry.data.fields.NumberField<{ initial: 0 }>;
    maxMods: foundry.data.fields.NumberField<{ initial: 0 }>;
  }

  interface BaseData {
    stats: {
      globalMods: {
        attack: Array<DerivedModifier>;
        damage: Array<DerivedModifier>;
        ap: Array<DerivedModifier>;
      };
    };
  }

  interface DerivedData {
    scale: number;
  }
}

export class VehicleData extends foundry.abstract.TypeDataModel<
  VehicleData.Schema,
  Actor.ConfiguredInstance,
  VehicleData.BaseData,
  VehicleData.DerivedData
> {
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      size: new fields.NumberField({ initial: 0, label: 'SWADE.Size' }),
      scale: new fields.NumberField({ initial: 0, label: 'SWADE.Scale' }),
      classification: new fields.StringField({
        initial: '',
        textSearch: true,
        label: 'SWADE.Class',
      }),
      handling: new fields.NumberField({ initial: 0, label: 'SWADE.Handling' }),
      cost: new fields.NumberField({ initial: 0, label: 'SWADE.Price' }),
      topspeed: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, min: 0, label: 'SWADE.Topspeed' }),
        unit: new fields.StringField({ label: 'SWADE.SpeedUnit' }),
      }, { label: 'SWADE.Topspeed' }),
      description: new fields.HTMLField({
        initial: '',
        textSearch: true,
        label: 'SWADE.Desc',
      }),
      toughness: new fields.SchemaField({
        total: new fields.NumberField({ initial: 0, label: 'SWADE.Tough' }),
        armor: new fields.NumberField({ initial: 0, label: 'SWADE.Armor' }),
      }, { label: 'SWADE.Tough' }),
      wounds: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, label: 'SWADE.Wounds' }),
        max: new fields.NumberField({ initial: 3, label: 'SWADE.WoundsMax' }),
        ignored: new fields.NumberField({ initial: 0, label: 'SWADE.IgnWounds' }),
      }, { label: 'SWADE.Wounds' }),
      crew: new fields.SchemaField({
        required: new fields.SchemaField({
          value: new fields.NumberField({ initial: 1, label: 'SWADE.Value' }),
          max: new fields.NumberField({ initial: 1, label: 'SWADE.MaxLabel' }),
        }, { label: 'SWADE.RequiredCrew' }),
        optional: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, label: 'SWADE.Value' }),
          max: new fields.NumberField({ initial: 0, label: 'SWADE.MaxLabel' }),
        }, { label: 'SWADE.Passengers' }),
      }, { label: 'SWADE.Crew' }),
      driver: new fields.SchemaField({
        id: new fields.StringField({ initial: null, nullable: true, label: 'SWADE.ID' }),
        skill: new fields.StringField({ initial: '', label: 'SWADE.OpSkill' }),
        skillAlternative: new fields.StringField({ initial: '', label: 'SWADE.AltSkill' }),
      }, { label: 'SWADE.Operator' }),
      status: new fields.SchemaField({
        isOutOfControl: new fields.BooleanField({ label: 'SWADE.OutOfControl' }),
        isWrecked: new fields.BooleanField({ label: 'SWADE.Wrecked' }),
      }, { label: 'SWADE.Status' }),
      initiative: new fields.SchemaField({
        hasHesitant: new fields.BooleanField({ label: 'SWADE.Hesitant' }),
        hasLevelHeaded: new fields.BooleanField({ label: 'SWADE.LevelHeaded' }),
        hasImpLevelHeaded: new fields.BooleanField({ label: 'SWADE.ImprovedLevelHeaded' }),
        hasQuick: new fields.BooleanField({ label: 'SWADE.Quick' }),
      }, { label: 'SWADE.Init' }),
      additionalStats: makeAdditionalStatsSchema(),
      maxCargo: new fields.NumberField({ initial: 0, label: 'SWADE.MaxCargo' }),
      maxMods: new fields.NumberField({ initial: 0, label: 'SWADE.MaxMods' }),
    };
  }

  static override migrateData(source: object): object {
    migrations.splitTopSpeed(source);
    return super.migrateData(source);
  }

  declare parent: SwadeActor;

  /** @inheritdoc */
  override prepareBaseData() {
    //setup the global modifier container object
    this.stats = {
      globalMods: {
        attack: new Array<DerivedModifier>(),
        damage: new Array<DerivedModifier>(),
        ap: new Array<DerivedModifier>(),
      },
    };
  }

  /** @inheritdoc */
  override prepareDerivedData() {
    this.scale = this.parent.calcScale(this.size);
  }
  async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription = await TextEditor.enrichHTML(this.description, options);
    return await createEmbedElement(this,'systems/swade/templates/embeds/vehicle-embeds.hbs', 'vehicle-embed');
  }

  get encumbered() {
    return false;
  }

  get wildcard() {
    return false;
  }

  getRollData(): Record<string, number | string> {
    const out: Record<string, number | string> = {
      wounds: this.wounds.value || 0,
      topspeed: this.topspeed.value || 0,
    };
    return out;
  }
}
