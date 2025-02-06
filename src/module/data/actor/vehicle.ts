import type { AnyObject } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import {
  AdditionalStat,
  DerivedModifier,
  RollModifier,
} from '../../../interfaces/additional.interface';
import { constants } from '../../constants';
import { SwadeRoll } from '../../dice/SwadeRoll';
import { createEmbedElement } from '../../util';
import { ForeignDocumentUUIDField } from '../fields/ForeignDocumentUUIDField';
import { boundTraitDie, makeTraitDiceFields } from '../shared';
import * as migrations from './_migration';
import { SwadeBaseActorData, TokenSize } from './base/base';

declare namespace VehicleData {
  interface Schema extends ReturnType<typeof createVehicleSchema> {}

  interface BaseData {
    attributes: {
      agility: {
        effects: Array<RollModifier>;
      };
      smarts: {
        effects: Array<RollModifier>;
      };
      spirit: {
        effects: Array<RollModifier>;
      };
      strength: {
        effects: Array<RollModifier>;
      };
      vigor: {
        effects: Array<RollModifier>;
      };
    };
    stats: {
      globalMods: {
        attack: Array<DerivedModifier>;
        damage: Array<DerivedModifier>;
        ap: Array<DerivedModifier>;
        agility: Array<DerivedModifier>;
        smarts: Array<DerivedModifier>;
        spirit: Array<DerivedModifier>;
        strength: Array<DerivedModifier>;
        vigor: Array<DerivedModifier>;
        trait: Array<DerivedModifier>;
      };
    };
    cargo: {
      value: number;
    };
    mods: {
      value: number;
    };
  }

  interface DerivedData {
    scale: number;
  }
}

function createVehicleSchema() {
  const fields = foundry.data.fields;
  return {
    attributes: new fields.SchemaField(
      {
        // Found in HC Haunted Car
        agility: new fields.SchemaField(
          {
            ...makeTraitDiceFields(),
            enabled: new fields.BooleanField({
              label: 'SWADE.VehicleAttributes.Agility',
            }),
          },
          {
            label: 'SWADE.AttrAgi',
          },
        ),
        // HC Haunted Car & Sentient Vehicles
        smarts: new fields.SchemaField(
          {
            ...makeTraitDiceFields(),
            enabled: new fields.BooleanField({
              label: 'SWADE.VehicleAttributes.Smarts',
            }),
          },
          { label: 'SWADE.AttrSma' },
        ),
        // HC Haunted Car & Sentient Vehicles
        spirit: new fields.SchemaField(
          {
            ...makeTraitDiceFields(),
            enabled: new fields.BooleanField({
              label: 'SWADE.VehicleAttributes.Spirit',
            }),
          },
          { label: 'SWADE.AttrSpr' },
        ),
        strength: new fields.SchemaField(
          {
            ...makeTraitDiceFields(),
            encumbranceSteps: new fields.NumberField({
              initial: 0,
              integer: true,
              label: 'SWADE.EncumbranceSteps',
            }),
            enabled: new fields.BooleanField({
              label: 'SWADE.VehicleAttributes.Strength',
            }),
          },
          { label: 'SWADE.AttrStr' },
        ),
        vigor: new fields.SchemaField(
          {
            ...makeTraitDiceFields(),
            enabled: new fields.BooleanField({
              label: 'SWADE.VehicleAttributes.Vigor',
            }),
          },
          { label: 'SWADE.AttrVig' },
        ),
      },
      { label: 'SWADE.Attributes' },
    ),
    size: new fields.NumberField({
      initial: 0,
      integer: true,
      nullable: false,
      label: 'SWADE.Size',
    }),
    scale: new fields.NumberField({
      initial: 0,
      integer: true,
      nullable: false,
      label: 'SWADE.Scale',
    }),
    classification: new fields.StringField({
      initial: '',
      textSearch: true,
      label: 'SWADE.Class',
    }),
    handling: new fields.NumberField({
      initial: 0,
      integer: true,
      label: 'SWADE.Handling',
    }),
    cost: new fields.NumberField({ initial: 0, label: 'SWADE.Price' }),
    topspeed: new fields.SchemaField(
      {
        value: new fields.NumberField({
          initial: 0,
          min: 0,
          label: 'SWADE.Topspeed',
        }),
        unit: new fields.StringField({ label: 'SWADE.SpeedUnit' }),
      },
      { label: 'SWADE.Topspeed' },
    ),
    description: new fields.HTMLField({
      initial: '',
      textSearch: true,
      label: 'SWADE.Desc',
    }),
    toughness: new fields.SchemaField(
      {
        total: new fields.NumberField({ initial: 0, label: 'SWADE.Tough' }),
        armor: new fields.NumberField({ initial: 0, label: 'SWADE.Armor' }),
      },
      { label: 'SWADE.Tough' },
    ),
    wounds: new fields.SchemaField(
      {
        value: new fields.NumberField({
          initial: 0,
          min: 0,
          integer: true,
          label: 'SWADE.Wounds',
        }),
        max: new fields.NumberField({
          initial: 3,
          min: 0,
          integer: true,
          label: 'SWADE.WoundsMax',
        }),
        ignored: new fields.NumberField({
          initial: 0,
          integer: true,
          label: 'SWADE.IgnWounds',
        }),
      },
      { label: 'SWADE.Wounds' },
    ),
    energy: new fields.SchemaField(
      {
        value: new fields.NumberField({
          initial: 0,
          integer: true,
          min: 0,
          label: 'SWADE.Energy.Value',
        }),
        max: new fields.NumberField({
          initial: 0,
          integer: true,
          min: 0,
          label: 'SWADE.Energy.Max',
        }),
        enabled: new fields.BooleanField({ label: 'SWADE.Energy.Enable' }),
      },
      { label: 'SWADE.Energy.Label' },
    ),
    crew: new fields.SchemaField(
      {
        required: new fields.SchemaField(
          {
            value: new fields.NumberField({
              initial: 1,
              integer: true,
              min: 0,
              label: 'SWADE.Value',
            }),
            max: new fields.NumberField({
              initial: 1,
              integer: true,
              min: 0,
              label: 'SWADE.MaxLabel',
            }),
          },
          { label: 'SWADE.RequiredCrew' },
        ),
        optional: new fields.SchemaField(
          {
            value: new fields.NumberField({
              initial: 0,
              integer: true,
              min: 0,
              label: 'SWADE.Value',
            }),
            max: new fields.NumberField({
              initial: 0,
              integer: true,
              min: 0,
              label: 'SWADE.MaxLabel',
            }),
          },
          { label: 'SWADE.Passengers' },
        ),
      },
      { label: 'SWADE.Crew' },
    ),
    driver: new fields.SchemaField(
      {
        id: new ForeignDocumentUUIDField({
          idOnly: true,
          label: 'SWADE.ID',
          type: 'Actor',
        }),
        skill: new fields.StringField({
          initial: '',
          label: 'SWADE.OpSkill',
        }),
        skillAlternative: new fields.StringField({
          initial: '',
          label: 'SWADE.AltSkill',
        }),
      },
      { label: 'SWADE.Operator' },
    ),
    status: new fields.SchemaField(
      {
        isOutOfControl: new fields.BooleanField({
          label: 'SWADE.OutOfControl',
        }),
        isWrecked: new fields.BooleanField({ label: 'SWADE.Wrecked' }),
        isDistracted: new fields.BooleanField({
          label: 'SWADE.Distr',
        }),
        isVulnerable: new fields.BooleanField({
          label: 'SWADE.Vuln',
        }),
      },
      { label: 'SWADE.Status' },
    ),
    initiative: new fields.SchemaField(
      {
        hasHesitant: new fields.BooleanField({ label: 'SWADE.Hesitant' }),
        hasLevelHeaded: new fields.BooleanField({
          label: 'SWADE.LevelHeaded',
        }),
        hasImpLevelHeaded: new fields.BooleanField({
          label: 'SWADE.ImprovedLevelHeaded',
        }),
        hasQuick: new fields.BooleanField({ label: 'SWADE.Quick' }),
      },
      { label: 'SWADE.Init' },
    ),
    cargo: new fields.SchemaField({
      max: new fields.NumberField({ initial: 0, label: 'SWADE.MaxCargo' }),
    }),
    mods: new fields.SchemaField({
      max: new fields.NumberField({ initial: 0, label: 'SWADE.MaxMods' }),
    }),
  };
}

class VehicleData<
  Schema extends VehicleData.Schema = VehicleData.Schema,
  BaseData extends VehicleData.BaseData = VehicleData.BaseData,
  DerivedData extends VehicleData.DerivedData = VehicleData.DerivedData,
> extends SwadeBaseActorData<Schema, BaseData, DerivedData> {
  static override defineSchema() {
    return {
      ...super.defineSchema(),
      ...createVehicleSchema(),
    };
  }

  static override migrateData(source: AnyObject): AnyObject {
    migrations.splitTopSpeed(source);
    migrations.shiftCargoModsMax(source);
    return super.migrateData(source);
  }

  override get tokenSize(): TokenSize {
    const value = Math.max(1, Math.floor(this.size! / 4) + 1);
    return { width: value, height: value };
  }

  override prepareBaseData(this: VehicleData) {
    //setup the global modifier container object
    this.stats = {
      globalMods: {
        attack: new Array<DerivedModifier>(),
        damage: new Array<DerivedModifier>(),
        ap: new Array<DerivedModifier>(),
        agility: new Array<DerivedModifier>(),
        smarts: new Array<DerivedModifier>(),
        spirit: new Array<DerivedModifier>(),
        strength: new Array<DerivedModifier>(),
        vigor: new Array<DerivedModifier>(),
        trait: new Array<DerivedModifier>(),
      },
    };
    for (const attribute of Object.values(this.attributes)) {
      attribute.effects = new Array<RollModifier>();
    }
    this.mods.value = 0;
    this.cargo.value = 0;
  }

  override prepareDerivedData(this: VehicleData) {
    super.prepareDerivedData();
    //die type bounding for attributes
    for (const key in this.attributes) {
      const attribute = this.attributes[key];
      attribute.die = boundTraitDie(attribute.die);
      attribute['wild-die'].sides = Math.min(attribute['wild-die'].sides, 12);
    }

    this.scale = this.parent.calcScale(this.size!);
    this.mods.value += this.parent.items.reduce((total: number, i) => {
      // probably need to check for equip status too
      if (
        'mods' in i.system &&
        i.system.isVehicular &&
        i.system.equipStatus > constants.EQUIP_STATE.CARRIED
      ) {
        return total + (i.system.mods ?? 0);
      }
      return total;
    }, 0);
  }

  declare enrichedDescription?: string;

  override async toEmbed(
    this: VehicleData,
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription = await TextEditor.enrichHTML(this.description, {
      ...options,
    });
    return await createEmbedElement(
      this,
      'systems/swade/templates/embeds/vehicle-embeds.hbs',
      ['actor-embed', 'vehicle'],
    );
  }

  get encumbered() {
    return false;
  }

  get wildcard() {
    return false;
  }

  getRollData(this: VehicleData): Record<string, number | string> {
    const out: Record<string, number | string> = {
      wounds: this.wounds.value || 0,
      topspeed: this.topspeed.value || 0,
    };
    return out;
  }
  async rollAdditionalStat(stat: string) {
    const statData: AdditionalStat = this.additionalStats[stat];
    if (statData.dtype !== 'Die') return;
    let modifier = statData.modifier || '';
    if (!!modifier && !modifier.match(/^[+-]/)) {
      modifier = '+' + modifier;
    }
    //return early if there's no data to roll
    if (!statData.value) return;
    const roll = new SwadeRoll(
      `${statData.value}${modifier}`,
      this.getRollData(),
    );
    await roll.evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.parent }),
      flavor: statData.label,
    });
  }
}

export { VehicleData };
