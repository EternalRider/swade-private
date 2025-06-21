import type { AnyObject, ValueOf } from 'fvtt-types/utils';
import {
  DerivedModifier,
  RollModifier,
} from '../../../interfaces/additional.interface';
import { SWADE } from '../../config';
import { constants } from '../../constants';
import type SwadeActor from '../../documents/actor/SwadeActor';
import SwadeItem from '../../documents/item/SwadeItem';
import { createEmbedElement } from '../../util';
import { LocalDocumentField } from '../fields/LocalDocumentField';
import { MemberField } from '../fields/MemberField';
import { ShieldData, WeaponData } from '../item';
import { boundTraitDie, makeTraitDiceFields } from '../shared';
import * as migrations from './_migration';
import { SwadeBaseActorData, TokenSize } from './base/base';

declare namespace VehicleData {
  interface Schema
    extends SwadeBaseActorData.Schema,
      ReturnType<typeof createVehicleSchema> {}
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
      parry: {
        sources: Array<DerivedModifier>;
        effects: Array<DerivedModifier>;
      };
    };
    cargo: {
      value: number;
    };
    mods: {
      value: number;
    };
    crew: {
      required: number;
      members: Array<CrewMember>;
    };
  }

  interface DerivedData {
    scale: number;
    cargo: {
      value: number;
      items: SwadeItem<CargoItemType>[];
    };
  }

  interface CrewMember {
    uuid: string;
    actor: SwadeActor<VehicleData.CrewActorType> | null;
    role: ValueOf<typeof constants.CREW_ROLE>;
    weapons: SwadeItem<'weapon'>[];
    sort: number;
  }
  type CrewActorType = 'character' | 'npc';
  type CargoItemType = 'gear' | 'weapon' | 'armor' | 'shield' | 'consumable';
}

function validateCrewMember(
  value: any,
  _options: foundry.data.fields.DataField.ValidationOptions<foundry.data.fields.DataField>,
) {
  const actor = fromUuidSync(value.uuid);
  // Optional chaining `actor.type` so that on game load, when `fromUuidSync` can only return null, this doesn't throw.
  if (['vehicle', 'group'].includes(actor?.type)) {
    return new foundry.data.validation.DataModelValidationFailure({
      unresolved: true,
      invalidValue: value,
      message: `Cannot contain an actor of type ${actor.type}!`,
    });
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
    stats: new fields.SchemaField({
      parry: new fields.SchemaField(
        {
          value: new fields.NumberField({
            initial: 0,
            integer: true,
            label: 'SWADE.Parry',
          }),
          shield: new fields.NumberField({
            initial: 0,
            integer: true,
            label: 'SWADE.ShieldBonus',
          }),
          modifier: new fields.NumberField({
            initial: 0,
            integer: true,
            required: false,
            label: 'SWADE.Modifier',
          }),
        },
        { label: 'SWADE.Parry' },
      ),
    }),
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
        members: new fields.ArrayField(
          new MemberField(
            {
              role: new fields.StringField({
                initial: constants.CREW_ROLE.GUNNER,
                choices: {
                  [constants.CREW_ROLE.OPERATOR]:
                    'SWADE.Vehicle.Crew.Roles.Operator',
                  [constants.CREW_ROLE.GUNNER]:
                    'SWADE.Vehicle.Crew.Roles.Gunner',
                  [constants.CREW_ROLE.OTHER]: 'SWADE.Vehicle.Crew.Roles.Other',
                },
                label: 'SWADE.Vehicle.Crew.Role',
              }),
              sort: new fields.IntegerSortField(),
              weapons: new fields.ArrayField(
                new LocalDocumentField(SwadeItem, { types: ['weapon'] }),
              ),
            },
            { validate: validateCrewMember },
          ),
        ),
      },
      { label: 'SWADE.Crew' },
    ),
    driver: new fields.SchemaField(
      {
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
    details: new fields.SchemaField(
      {
        autoCalcParry: new fields.BooleanField({
          initial: true,
          hint: 'SWADE.AutoCalcParry',
        }),
      },
      { label: 'SWADE.Details' },
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
  declare enrichedDescription?: string;

  static override defineSchema() {
    return {
      ...super.defineSchema(),
      ...createVehicleSchema(),
    };
  }

  static override migrateData(source: AnyObject): AnyObject {
    migrations.splitTopSpeed(source);
    migrations.shiftCargoModsMax(source);
    migrations.migrateDriver(source);
    return super.migrateData(source);
  }

  get encumbered() {
    return false;
  }

  get wildcard() {
    return false;
  }

  override get tokenSize(): TokenSize {
    const value = Math.max(1, Math.floor(this.size! / 4) + 1);
    return { width: value, height: value };
  }

  get operators(): (SwadeActor<VehicleData.CrewActorType> | null)[] {
    return this.crew.members
      .filter(
        (m: VehicleData.CrewMember) =>
          !!m.actor && m.role === constants.CREW_ROLE.OPERATOR,
      )
      .map((m: VehicleData.CrewMember) => m.actor);
  }

  get operator(): SwadeActor<VehicleData.CrewActorType> | null {
    return this.operators[0] ?? null;
  }

  async rollManeuverCheck(
    actor: SwadeActor<VehicleData.CrewActorType> | null = this.operator,
  ) {
    //Return early if no driver was found
    if (!actor) return;

    //Get skillname
    const skillName = this.driver.skill || this.driver.skillAlternative;

    // Calculate the final handling
    const handling = this.handling!;
    const wounds = this.parent.calcWoundPenalties();

    //Handling is capped at a certain penalty
    const totalHandling = Math.max(
      handling + wounds,
      SWADE.vehicles.maxHandlingPenalty,
    );

    //Find the operating skill
    const skill = actor.itemTypes.skill.find((i) => i.name === skillName);
    return actor.rollSkill(skill?.id, {
      additionalMods: [
        {
          label: game.i18n.localize('SWADE.Handling'),
          value: totalHandling,
        },
      ],
    });
  }

  override prepareBaseData(this: VehicleData<VehicleData.Schema>) {
    super.prepareBaseData();
    //setup the global modifier container object
    this.stats.globalMods = {
      attack: new Array<DerivedModifier>(),
      damage: new Array<DerivedModifier>(),
      ap: new Array<DerivedModifier>(),
      agility: new Array<DerivedModifier>(),
      smarts: new Array<DerivedModifier>(),
      spirit: new Array<DerivedModifier>(),
      strength: new Array<DerivedModifier>(),
      vigor: new Array<DerivedModifier>(),
      trait: new Array<DerivedModifier>(),
    };
    this.stats.parry.sources = new Array<DerivedModifier>();
    this.stats.parry.effects = new Array<DerivedModifier>();

    //parry autocalc
    if (this.details.autoCalcParry) this.stats.parry.value = 0;

    for (const attribute of Object.values(this.attributes)) {
      attribute.effects = new Array<RollModifier>();
    }
    this.mods.value = 0;
    this.cargo.value = 0;
    this.crew.members = this.crew.members
      .sort((a, b) => a.sort - b.sort)
      .map(this._mapCrewMember.bind(this));
    this.crew.required.value = this.crew.members.length;
  }

  override prepareDerivedData(this: VehicleData<VehicleData.Schema>) {
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
    this.cargo.items = this.#prepareCargo();
    this.cargo.value = this.cargo.items.reduce(
      (acc, item: SwadeItem<VehicleData.CargoItemType>) => {
        return acc + (item.system.quantity ?? 0) * (item.system.weight ?? 0);
      },
      0,
    );

    if (this.details.autoCalcParry)
      this.stats.parry.value = this.parent.calcParry();
  }

  override getParryBaseSkill() {
    const skillCandidates = this.operator?.itemTypes.skill ?? [];
    return (skillCandidates.find((s) => s.name === this.driver.skill) ||
      skillCandidates.find((s) => s.name === this.driver.skillAlternative)) as
      | SwadeItem<'skill'>
      | undefined;
  }

  calcParry(): number {
    /** base value of all parry calculations */
    const parryBaseValue = 2;

    let parryTotal = 0;
    const sources: DerivedModifier[] = this.stats.parry.sources;
    const parryBaseSkill = this.getParryBaseSkill();

    const skillDie = parryBaseSkill?.system?.die.sides ?? 0;
    const skillMod = parryBaseSkill?.system?.die.modifier ?? 0;

    //base parry calculation
    parryTotal = Math.round(skillDie / 2) + parryBaseValue;

    //add modifier if the skill die is 12
    if (skillDie >= 12) {
      parryTotal += Math.floor(skillMod / 2);
    }

    if (parryBaseSkill) {
      sources.push({
        label: foundry.utils.getProperty(parryBaseSkill, 'name'),
        value: parryTotal,
      });
    } else {
      sources.push({
        label: game.i18n.localize('SWADE.BaseParry'),
        value: parryBaseValue,
      });
    }

    this.stats.parry.shield = 0;

    const itemTypes = this.parent.itemTypes;

    //add shields
    for (const shield of itemTypes.shield) {
      if (!(shield.system instanceof ShieldData)) continue;
      if (shield.system.equipStatus === constants.EQUIP_STATE.EQUIPPED) {
        const shieldParry = shield.system.parry ?? 0;
        parryTotal += shieldParry;
        this.stats.parry.shield += shieldParry;
        sources.push({
          label: shield.name,
          value: shieldParry,
        });
      }
    }

    //add equipped weapons
    const ambidextrous = this.parent.getFlag('swade', 'ambidextrous') as
      | undefined
      | boolean;
    for (const weapon of itemTypes.weapon) {
      if (!(weapon.system instanceof WeaponData)) continue;
      let parryBonus = 0;

      if (Number(weapon.system.equipStatus) >= constants.EQUIP_STATE.OFF_HAND) {
        // only add parry bonus if it's in the main hand or actor is ambidextrous
        if (
          Number(weapon.system.equipStatus) >= constants.EQUIP_STATE.EQUIPPED ||
          ambidextrous
        )
          parryBonus += weapon.system.parry ?? 0;

        //add trademark weapon bonus
        parryBonus += Number(weapon.system.trademark);
      }
      if (parryBonus !== 0) {
        sources.push({
          label: weapon.name,
          value: parryBonus,
        });
      }
      parryTotal += parryBonus;
    }

    return parryTotal;
  }

  getCrewMemberForWeapon(
    weapon: SwadeItem<'weapon'>,
  ): SwadeActor<VehicleData.CrewActorType> | undefined {
    if (weapon.type !== 'weapon') return;
    const user = this.crew.members
      .filter((m: VehicleData.CrewMember) =>
        m.weapons.map((i) => i.id).includes(weapon.id),
      )
      .find(
        (m: VehicleData.CrewMember) =>
          m.actor?.type === 'npc' || m.actor?.isOwner,
      )?.actor;
    return user;
  }

  override async toEmbed(
    this: VehicleData,
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.description,
        {
          ...options,
        },
      );
    const embed = await createEmbedElement(
      this,
      'systems/swade/templates/embeds/vehicle-embeds.hbs',
      ['actor-embed', 'vehicle'],
    );

    if (embed) {
      Hooks.callAll('swadeActorEmbed', embed, this.parent, config, options);
    }

    return embed;
  }

  override getRollData(
    this: VehicleData<VehicleData.Schema>,
  ): Record<string, number | string> {
    const out: Record<string, number | string> = {
      wounds: this.wounds.value || 0,
      topspeed: this.topspeed.value || 0,
    };
    return { ...out, ...super.getRollData() };
  }

  protected _mapCrewMember(member: any): VehicleData.CrewMember {
    const actor = member.uuid;
    if (typeof actor === 'string') return { ...member, actor: null };
    const weapons = member.weapons.map((fn) => fn());
    return {
      ...member,
      name: actor.token?.name ?? actor.name,
      img: actor.token?.texture?.src ?? actor.img,
      uuid: actor.uuid,
      actor,
      weapons,
    };
  }

  #prepareCargo(): SwadeItem<VehicleData.CargoItemType>[] {
    const itemTypes = this.parent.itemTypes;
    const notMod = (i: SwadeItem<'gear' | 'weapon'>) =>
      !i.system.isVehicular ||
      i.system.equipStatus! < constants.EQUIP_STATE.EQUIPPED;
    return [
      ...itemTypes.gear.filter(notMod),
      ...itemTypes.weapon.filter(notMod),
      ...itemTypes.armor,
      ...itemTypes.shield,
      ...itemTypes.consumable,
    ];
  }
}

export { VehicleData };
