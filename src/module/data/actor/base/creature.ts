import { DeepPartial } from 'fvtt-types/utils';
import { Advance } from '../../../../interfaces/Advance.interface';
import {
  DerivedModifier,
  RollModifier,
} from '../../../../interfaces/additional.interface';
import { SWADE } from '../../../config';
import { constants } from '../../../constants';
import type SwadeActor from '../../../documents/actor/SwadeActor';
import type SwadeItem from '../../../documents/item/SwadeItem';
import {
  addUpModifiers,
  getRankFromAdvanceAsString,
  getScaleName,
  signedNumberString,
} from '../../../util';
import { PaceSchemaField } from '../../fields/PaceSchemaField';
import { ShieldData } from '../../item/shield';
import { WeaponData } from '../../item/weapon';
import {
  boundTraitDie,
  makeDiceField,
  makeTraitDiceFields,
} from '../../shared';
import * as migration from '../_migration';
import * as quarantine from '../_quarantine';
import * as shims from '../_shims';
import { SwadeBaseActorData, TokenSize } from './base';
import { WildCardDataSchema } from './creature.schemas';

const fields = foundry.data.fields;

declare namespace CreatureData {
  interface Schema
    extends SwadeBaseActorData.Schema,
      ReturnType<typeof creatureSchema> {}

  type BaseData = {
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
      scale: number;
      toughness: {
        sources: Array<DerivedModifier>;
        effects: Array<DerivedModifier>;
        armorEffects: Array<DerivedModifier>;
      };
      parry: {
        sources: Array<DerivedModifier>;
        effects: Array<DerivedModifier>;
      };
      gangUpDamage: boolean;
      globalMods: {
        trait: Array<DerivedModifier>;
        agility: Array<DerivedModifier>;
        smarts: Array<DerivedModifier>;
        spirit: Array<DerivedModifier>;
        strength: Array<DerivedModifier>;
        vigor: Array<DerivedModifier>;
        attack: Array<DerivedModifier>;
        damage: Array<DerivedModifier>;
        ap: Array<DerivedModifier>;
        bennyTrait: Array<DerivedModifier>;
        bennyDamage: Array<DerivedModifier>;
        attackRanged: Array<DerivedModifier>;
        attackMelee: Array<DerivedModifier>;
        targetAttack: Array<DerivedModifier>;
        targetAttackRanged: Array<DerivedModifier>;
        targetAttackMelee: Array<DerivedModifier>;
        targetDamage: Array<DerivedModifier>;
        gangUp: Array<DerivedModifier>;
      };
    };
  };

  type DerivedData = {
    advances: {
      list: Collection<Advance>;
    };
    details: {
      encumbrance: {
        max: number;
        value: number;
        isEncumbered: boolean;
      };
    };
    pace: {
      default: number;
    };
  };
}

function creatureSchema() {
  const toughnessTraitChoices = Object.entries(SWADE.attributes).reduce(
    (choices, [key, value]) => {
      choices[key] = value.long;
      return choices;
    },
    {} as Record<string, string>,
  );

  return {
    attributes: new fields.SchemaField(
      {
        agility: new fields.SchemaField(makeTraitDiceFields(), {
          label: 'SWADE.AttrAgi',
        }),
        smarts: new fields.SchemaField(
          {
            ...makeTraitDiceFields(),
            animal: new fields.BooleanField({
              label: 'SWADE.AnimalSmarts',
            }),
          },
          { label: 'SWADE.AttrSma' },
        ),
        spirit: new fields.SchemaField(
          {
            ...makeTraitDiceFields(),
            unShakeBonus: new fields.NumberField({
              initial: 0,
              integer: true,
              label: 'SWADE.EffectCallbacks.Shaken.UnshakeModifier',
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
          },
          { label: 'SWADE.AttrStr' },
        ),
        vigor: new fields.SchemaField(
          {
            ...makeTraitDiceFields(),
            unStunBonus: new fields.NumberField({
              initial: 0,
              integer: true,
              label: 'SWADE.EffectCallbacks.Stunned.UnStunModifier',
            }),
            soakBonus: new fields.NumberField({
              initial: 0,
              integer: true,
              label: 'SWADE.DamageApplicator.SoakModifier',
            }),
            bleedOut: new fields.SchemaField({
              modifier: new fields.NumberField({
                initial: 0,
                integer: true,
                label: 'SWADE.EffectCallbacks.BleedingOut.BleedOutModifier',
              }),
              ignoreWounds: new fields.BooleanField({
                label: 'SWADE.IgnWounds',
              }),
            }),
          },
          { label: 'SWADE.AttrVig' },
        ),
      },
      { label: 'SWADE.Attributes' },
    ),
    pace: new PaceSchemaField(),
    stats: new fields.SchemaField(
      {
        toughness: new fields.SchemaField(
          {
            value: new fields.NumberField({
              initial: 0,
              integer: true,
              label: 'SWADE.Tough',
            }),
            armor: new fields.NumberField({
              initial: 0,
              integer: true,
              label: 'SWADE.Armor',
            }),
            modifier: new fields.NumberField({
              initial: 0,
              integer: true,
              required: false,
              label: 'SWADE.Modifier',
            }),
          },
          { label: 'SWADE.Tough' },
        ),
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
        size: new fields.NumberField({
          initial: 0,
          integer: true,
          label: 'SWADE.Size',
        }),
        gangUpDamage: new fields.BooleanField({
          initial: false,
          label: 'SWADE.GangUpDamage',
          hint: 'SWADE.GangUpHint',
        }),
      },
      { label: 'SWADE.Stats' },
    ),
    details: new fields.SchemaField(
      {
        autoCalcToughness: new fields.BooleanField({
          initial: true,
          hint: 'SWADE.InclArmor',
        }),
        toughnessTrait: new fields.StringField({
          initial: 'vigor',
          blank: false,
          nullable: false,
          choices: toughnessTraitChoices,
          label: 'SWADE.Attribute',
        }),
        autoCalcParry: new fields.BooleanField({
          initial: true,
          hint: 'SWADE.AutoCalcParry',
        }),
        parryBaseSwid: new fields.StringField({
          initial: '',
          label: 'SWADE.Settings.ParryBase.Name',
          hint: 'SWADE.Settings.ParryBase.Hint',
        }),
        archetype: new fields.StringField({
          initial: '',
          textSearch: true,
          label: 'SWADE.Archetype',
        }),
        appearance: new fields.HTMLField({
          initial: '',
          textSearch: true,
          label: 'SWADE.Appearance',
        }),
        notes: new fields.HTMLField({
          initial: '',
          textSearch: true,
          label: 'SWADE.Notes',
        }),
        goals: new fields.HTMLField({
          initial: '',
          textSearch: true,
          label: 'SWADE.CharacterGoals',
        }),
        biography: new fields.SchemaField(
          {
            value: new fields.HTMLField({
              initial: '',
              textSearch: true,
              label: 'SWADE.Biography',
            }),
          },
          { label: 'SWADE.Biography' },
        ),
        species: new fields.SchemaField(
          {
            name: new fields.StringField({
              initial: '',
              textSearch: true,
              label: 'SWADE.Ancestry',
            }),
          },
          { label: 'SWADE.Ancestry' },
        ),
        currency: new fields.NumberField({
          initial: 0,
          label: 'SWADE.Currency',
        }),
        wealth: new fields.SchemaField(
          {
            die: new fields.NumberField({
              initial: 6,
              min: -1,
              integer: true,
              label: 'SWADE.WealthDie.Sides',
            }),
            modifier: new fields.NumberField({
              initial: 0,
              label: 'SWADE.WealthDie.Modifier',
            }),
            'wild-die': makeDiceField(6, 'SWADE.WealthDie.WildSides'),
          },
          { label: 'SWADE.WealthDie.Label' },
        ),
        conviction: new fields.SchemaField(
          {
            value: new fields.NumberField({
              initial: 0,
              label: 'SWADE.Value',
            }),
            active: new fields.BooleanField({
              label: 'SWADE.ConvictionActive',
            }),
          },
          { label: 'SWADE.Conv' },
        ),
      },
      { label: 'SWADE.Details' },
    ),
    powerPoints: new fields.TypedObjectField(
      CreatureData.makePowerPointsSchema(),
      {
        initial: {
          general: CreatureData.makePowerPointsSchema().getInitialValue(),
        },
        required: true,
        label: 'SWADE.PP',
      },
    ),
    fatigue: new fields.SchemaField(
      {
        value: new fields.NumberField({
          initial: 0,
          min: 0,
          label: 'SWADE.Fatigue',
        }),
        max: new fields.NumberField({
          initial: 2,
          label: 'SWADE.FatigueMax',
        }),
        ignored: new fields.NumberField({
          initial: 0,
          label: 'SWADE.IgnFatigue',
        }),
      },
      { label: 'SWADE.Fatigue' },
    ),
    woundsOrFatigue: new fields.SchemaField(
      {
        ignored: new fields.NumberField({
          initial: 0,
          label: 'SWADE.IgnFatigueWounds',
        }),
      },
      { label: 'SWADE.FatigueWounds' },
    ),
    advances: new fields.SchemaField(
      {
        mode: new fields.StringField({
          initial: 'expanded',
          blank: false,
          nullable: false,
          choices: {
            legacy: 'SWADE.Advances.Modes.Legacy',
            expanded: 'SWADE.Advances.Modes.Expanded',
          },
          label: 'SWADE.Advances.Modes.Label',
        }),
        value: new fields.NumberField({
          initial: 0,
          label: 'SWADE.Advance',
        }),
        rank: new fields.StringField({
          initial: 'Novice',
          textSearch: true,
          label: 'SWADE.Rank',
        }),
        details: new fields.HTMLField({
          initial: '',
          label: 'SWADE.Details',
        }),
        list: new fields.ArrayField(
          new fields.SchemaField({
            //TODO Create special data field for Advances
            type: new fields.NumberField({ initial: 0, label: 'Type' }),
            notes: new fields.HTMLField({
              initial: '',
              label: 'SWADE.Notes',
            }),
            sort: new fields.NumberField({
              initial: 0,
              label: 'SWADE.SortNum',
            }),
            planned: new fields.BooleanField({
              label: 'SWADE.Advances.Planned',
            }),
            id: new fields.StringField({ initial: '', label: 'SWADE.ID' }),
            rank: new fields.NumberField({
              initial: 0,
              label: 'SWADE.Rank',
            }),
          }),
          { label: 'SWADE.Adv' },
        ),
      },
      { label: 'SWADE.Adv' },
    ),
    status: new fields.SchemaField(
      {
        isShaken: new fields.BooleanField({ label: 'SWADE.Shaken' }),
        isDistracted: new fields.BooleanField({
          label: 'SWADE.Distr',
        }),
        isVulnerable: new fields.BooleanField({
          label: 'SWADE.Vuln',
        }),
        isStunned: new fields.BooleanField({ label: 'SWADE.Stunned' }),
        isEntangled: new fields.BooleanField({ label: 'SWADE.Entangled' }),
        isBound: new fields.BooleanField({ label: 'SWADE.Bound' }),
        isIncapacitated: new fields.BooleanField({ label: 'SWADE.Incap' }),
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
        follow: new fields.StringField({
          label: 'SWADE.FollowLabel',
          initial: '',
        }),
      },
      { label: 'SWADE.Init' },
    ),
  };
}

class CreatureData<
  Schema extends CreatureData.Schema &
    WildCardDataSchema = CreatureData.Schema & WildCardDataSchema,
  BaseData extends CreatureData.BaseData = CreatureData.BaseData,
  DerivedData extends CreatureData.DerivedData = CreatureData.DerivedData,
> extends SwadeBaseActorData<Schema, BaseData, DerivedData> {
  static override defineSchema(): CreatureData.Schema {
    return {
      ...super.defineSchema(),
      ...creatureSchema(),
    };
  }

  protected static wildcardData = (
    baseBennies: number,
    maxWounds: number,
  ): WildCardDataSchema => ({
    bennies: new fields.SchemaField(
      {
        value: new fields.NumberField({
          initial: 0,
          min: 0,
          integer: true,
          label: 'SWADE.CurrentBennies',
        }),
        max: new fields.NumberField({
          initial: baseBennies,
          min: 0,
          integer: true,
          label: 'SWADE.BenniesMaxNum',
        }),
      },
      { label: 'SWADE.Bennies' },
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
          initial: maxWounds,
          min: 0,
          integer: true,
          label: 'SWADE.WoundsMax',
        }),
        ignored: new fields.NumberField({
          initial: 0,
          min: 0,
          integer: true,
          label: 'SWADE.IgnWounds',
        }),
      },
      { label: 'SWADE.Wounds' },
    ),
  });

  static makePowerPointsSchema = () => {
    return new fields.SchemaField(
      {
        value: new fields.NumberField({
          initial: 0,
          min: 0,
          integer: true,
          label: 'SWADE.CurPP',
        }),
        max: new fields.NumberField({
          initial: 0,
          min: 0,
          integer: true,
          label: 'SWADE.MaxPP',
        }),
      },
      { label: 'SWADE.PP' },
    );
  };

  static override migrateData(source) {
    quarantine.ensureStrengthDie(source);
    quarantine.ensureCurrencyIsNumeric(source);
    quarantine.ensureGeneralPowerPoints(source);
    quarantine.ensurePowerPointsAreNumeric(source);
    migration.renamePace(source);
    return super.migrateData(source);
  }

  static override shimData(source) {
    shims._shimPace(source);
    return source;
  }

  override get tokenSize(): TokenSize {
    const value = Math.max(
      1,
      Math.floor((this as CreatureData).stats.size! / 4) + 1,
    );
    return { width: value, height: value };
  }

  get encumbered(): boolean {
    if (!game.settings.get('swade', 'applyEncumbrance')) {
      return false;
    }
    const encumbrance = (this as CreatureData).details.encumbrance;
    if (encumbrance.isEncumbered) return true;
    return encumbrance.value > encumbrance.max;
  }

  get isIncapacitated(): boolean {
    return (
      (this as CreatureData).status.isIncapacitated ||
      this.parent?.statuses.has(CONFIG.specialStatusEffects.INCAPACITATED)
    );
  }

  // specifying this to resolve depth issue
  override prepareBaseData() {
    super.prepareBaseData();
    for (const key in this.attributes) {
      const attribute = this.attributes[key];
      attribute.effects = new Array<RollModifier>();
    }

    //auto calculations
    if (this.details.autoCalcToughness) {
      //if we calculate the toughness then we set the values to 0 beforehand so the active effects can be applies
      this.stats.toughness.value = 0;
      this.stats.toughness.armor = 0;
    }
    if (this.details.autoCalcParry) {
      //same procedure as with Toughness
      this.stats.parry.value = 0;
    }

    // Prepping the parry & toughness sources
    this.stats.toughness.sources = new Array<DerivedModifier>();
    this.stats.toughness.effects = new Array<DerivedModifier>();
    this.stats.toughness.armorEffects = new Array<DerivedModifier>();
    this.stats.parry.sources = new Array<DerivedModifier>();
    this.stats.parry.effects = new Array<DerivedModifier>();

    //setup the global modifier container object
    this.stats.globalMods = {
      trait: new Array<DerivedModifier>(),
      agility: new Array<DerivedModifier>(),
      smarts: new Array<DerivedModifier>(),
      spirit: new Array<DerivedModifier>(),
      strength: new Array<DerivedModifier>(),
      vigor: new Array<DerivedModifier>(),
      attack: new Array<DerivedModifier>(),
      damage: new Array<DerivedModifier>(),
      ap: new Array<DerivedModifier>(),
      bennyTrait: new Array<DerivedModifier>(),
      bennyDamage: new Array<DerivedModifier>(),
      attackRanged: new Array<DerivedModifier>(),
      attackMelee: new Array<DerivedModifier>(),
      targetAttack: new Array<DerivedModifier>(),
      targetAttackRanged: new Array<DerivedModifier>(),
      targetAttackMelee: new Array<DerivedModifier>(),
      targetDamage: new Array<DerivedModifier>(),
      gangUp: new Array<DerivedModifier>(),
    };
  }

  // specifying this to resolve depth issue
  override prepareDerivedData() {
    super.prepareDerivedData();
    //die type bounding for attributes
    for (const key in this.attributes) {
      const attribute = this.attributes[key];
      attribute.die = boundTraitDie(attribute.die);
      attribute['wild-die'].sides = Math.min(attribute['wild-die'].sides, 12);
    }

    //handle advances
    const advances = this.advances;
    if (advances.mode === 'expanded') {
      const advRaw = foundry.utils.getProperty(
        this._source,
        'advances.list',
      ) as Advance[];
      const list = new Collection<Advance>();
      advRaw.forEach((adv) => list.set(adv.id, adv));
      const activeAdvances = list.filter((a) => !a.planned).length;
      advances.list = list;
      advances.value = activeAdvances;
      advances.rank = getRankFromAdvanceAsString(activeAdvances);
    }

    //set scale
    this.stats.scale = this.parent.calcScale(this.stats.size!);

    //handle carry capacity
    foundry.utils.setProperty(
      this,
      'details.encumbrance.value',
      this.parent.calcInventoryWeight(),
    );
    foundry.utils.setProperty(
      this,
      'details.encumbrance.max',
      this.parent.calcMaxCarryCapacity(),
    );

    // Call hook before pace calculation to allow modules to adjust encumbrance.max
    Hooks.callAll('swadeActorPrepareDerivedData', this.parent);

    this.#preparePace();

    // Toughness calculation
    if (this.details.autoCalcToughness) {
      const torsoArmor = this.parent.calcArmor();
      this.stats.toughness.armor = torsoArmor;
      this.stats.toughness.value = this.parent.calcToughness() + torsoArmor;
      this.stats.toughness.sources.push({
        label: game.i18n.localize('SWADE.Armor'),
        value: torsoArmor,
      });
    }

    if (this.details.autoCalcParry) {
      this.stats.parry.value = this.parent.calcParry();
    }
    for (const item of this.parent.items) {
      item.system.prepareFormulaFields();
    }
  }

  /**
   * Creates an HTMLElement for displaying in a tooltip, adding some context to an actor's size
   */
  getSizeTooltip(this: CreatureData): HTMLElement {
    const scale = this.stats?.scale?.signedString();
    const element = document.createElement('div');
    const p = document.createElement('p');
    p.innerText = game.i18n.format('SWADE.Scales.Description', {
      scale: scale,
      name: getScaleName(this.stats?.scale),
    });
    element.appendChild(p);
    return element;
  }

  override getParryBaseSkill() {
    const actorParryBaseSwid = (this.details.parryBaseSwid ?? '')
      .trim()
      .toLowerCase();
    const defaultParryBaseSwid = String(
      game.settings.get('swade', 'parryBaseSwid') ?? '',
    )
      .trim()
      .toLowerCase();
    const parryBaseSwid = actorParryBaseSwid || defaultParryBaseSwid;

    return this.parent.getSingleItemBySwid(parryBaseSwid, 'skill');
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

  /**
   * Creates an HTMLElement for displaying in a tooltip, adding some context to an actor's movement speed
   * @returns the constructed HTMLElement
   */
  getPaceTooltip(this: CreatureData): HTMLElement {
    const element = document.createElement('div');
    //current pace
    const heading = document.createElement('h4');
    heading.innerText =
      game.i18n.localize('SWADE.Movement.Base') +
      ': ' +
      game.i18n.localize(
        'SWADE.Movement.Pace.' + this.pace.base!.capitalize() + '.Label',
      );
    element.appendChild(heading);

    //attempt to add other pace values as a list
    const availableKeys = PaceSchemaField.paceKeys
      .filter((key) => !!this.pace[key])
      .filter((key) => key !== this.pace.base!);
    if (availableKeys.length) {
      const subheading = document.createElement('h5');
      subheading.innerText = game.i18n.localize('SWADE.Movement.Other');
      element.appendChild(subheading);
      const paceList = document.createElement('ul');
      for (const key of availableKeys) {
        const li = document.createElement('li');
        const localized = game.i18n.localize(
          `SWADE.Movement.Pace.${key.capitalize()}.Label`,
        );
        li.innerText = `${localized}: ${this.pace[key]}`;
        paceList.appendChild(li);
      }
      element.appendChild(paceList);
    }

    //if the parent isn't a combatant add the out of combat pace
    if (!this.parent.getCombatant()) {
      element.appendChild(document.createElement('hr'));
      const p = document.createElement('span');
      const runningDie = this.pace.running.die!;
      const minutes = this.attributes.vigor.die.sides! / 2;
      const pace = (runningDie + this.pace.default) * 2;
      p.innerText = game.i18n.format('SWADE.Movement.Running.OutOfCombat', {
        pace: pace.toString(),
        minutes: minutes.toString(),
      });
      element.appendChild(p);
    }
    return element;
  }

  // specifying this to resolve depth issue
  override getRollData(
    this: CreatureData,
    includeModifiers = true,
  ): Record<string, number | string> {
    const out: Record<string, number | string> = {
      wounds: this.wounds.value || 0,
      fatigue: this.fatigue.value || 0,
      pace: this.pace.default || 0,
      size: this.stats.size || 0,
    };

    const globalMods = this.stats.globalMods;

    /** Attributes */
    const attributes = this.attributes;
    for (const [key, attribute] of Object.entries(attributes)) {
      const short = key.substring(0, 3);
      const name = game.i18n.localize(SWADE.attributes[key].long);
      const die = attribute.die.sides;
      let mod = attribute.die.modifier || 0;
      if (includeModifiers) {
        mod = structuredClone<RollModifier[]>([
          {
            label: game.i18n.localize('SWADE.TraitMod'),
            value: attribute.die.modifier!,
          },
          ...globalMods[key],
          ...globalMods.trait,
        ])
          .filter((m) => m.ignore !== true)
          .reduce(addUpModifiers, 0) as number;
      }
      let modString = mod !== 0 ? signedNumberString(mod) : '';
      if (mod) modString += `[${game.i18n.localize('SWADE.TraitMod')}]`;
      let val = `1d${die}x[${name}]${modString}`;
      if (die! <= 1) val = `1d${die}[${name}]${modString}`;
      out[short] = val;
    }
    /** Skills */
    for (const skill of this.parent.itemTypes.skill as SwadeItem<'skill'>[]) {
      const die = skill.system.die.sides;
      let mod = skill.system.die.modifier;
      if (includeModifiers) mod = skill.modifier;
      const name = skill.name!.slugify({ strict: true });
      let modString = mod !== 0 ? signedNumberString(mod) : '';
      if (mod) modString += `[${game.i18n.localize('SWADE.TraitMod')}]`;
      out[name] = `1d${die}[${skill.name}]${modString}`;
    }

    out.attribute = Object.entries(this.attributes)
      .map(([key, attribute]) => {
        const name = game.i18n.localize(SWADE.attributes[key].long);
        const die = attribute.die.sides;
        let mod = attribute.die.modifier || 0;
        if (includeModifiers) {
          mod = structuredClone<RollModifier[]>([
            {
              label: game.i18n.localize('SWADE.TraitMod'),
              value: attribute.die.modifier!,
            },
            ...globalMods[key],
            ...globalMods.trait,
          ])
            .filter((m) => m.ignore !== true)
            .reduce(addUpModifiers, 0) as number;
        }
        let modString = mod !== 0 ? signedNumberString(mod) : '';
        if (mod) modString += `[${game.i18n.localize('SWADE.TraitMod')}]`;
        let val = `1d${die}x[${name}]${modString}`;
        if (die! <= 1) val = `1d${die}[${name}]${modString}`;
        return [key, val];
      })
      .reduce((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {});

    out.skill = this.parent.itemTypes.skill
      .map((skill: SwadeItem<'skill'>) => {
        const die = skill.system.die.sides;
        let mod = skill.system.die.modifier;
        if (includeModifiers) mod = skill.modifier;
        let modString = mod !== 0 ? signedNumberString(mod) : '';
        if (mod) modString += `[${game.i18n.localize('SWADE.TraitMod')}]`;
        return [skill.system.swid, `1d${die}[${skill.name}]${modString}`];
      })
      .reduce((acc, [k, v]) => {
        acc[k] = v;
        return acc;
      }, {});

    return { ...out, ...super.getRollData() };
  }

  // specifying this to resolve depth issue
  async refreshBennies(this: CreatureData, notify = true) {
    if (notify && game.settings.get('swade', 'notifyBennies')) {
      const message = await foundry.applications.handlebars.renderTemplate(
        SWADE.bennies.templates.refresh,
        {
          target: this.parent,
          speaker: getDocumentClass('ChatMessage').getSpeaker({
            actor: this.parent,
          }),
        },
      );
      const chatData = { content: message };
      getDocumentClass('ChatMessage').create(chatData);
    }
    let newValue = this.bennies.max;
    const hardChoices = game.settings.get('swade', 'hardChoices');
    if (hardChoices && this.wildcard && !this.parent.hasPlayerOwner) {
      newValue = 0;
    }
    await this.parent.update({ 'system.bennies.value': newValue });

    /**
     * Called an actor refreshes their bennies
     * @param {SwadeActor} actor            The Actor refreshing their bennies
     */
    Hooks.callAll('swadeRefreshBennies', this.parent);
  }

  #preparePace(this: CreatureData) {
    const encumbered = this.encumbered;
    const woundPenalties = this.parent?.calcWoundPenalties(false) ?? 0;
    const enableWoundPace = game.settings.get('swade', 'enableWoundPace');

    for (const key of PaceSchemaField.paceKeys) {
      if (this.pace[key] === null) continue; //skip null values
      let value = this.pace[key]!;
      if (enableWoundPace) value += woundPenalties; //modify pace with wounds, core rules p. 95
      if (encumbered) value -= 2; //subtract encumbrance, if necessary
      this.pace[key] = Math.max(value, 1); //Clamp the pace so it's a minimum of 1
    }

    this.pace.default = this.pace[this.pace.base!];
  }

  protected override async _preUpdate(
    changed: DeepPartial<
      foundry.abstract.TypeDataModel.ParentAssignmentType<
        CreatureData.Schema,
        SwadeActor
      >
    >,
    options: Actor.Database.PreUpdateOptions,
    user: User.Implementation,
  ) {
    const allowed = await super._preUpdate(changed, options, user);
    if (allowed === false) return false;
    if (foundry.utils.hasProperty(changed, 'system.wounds.value')) {
      foundry.utils.setProperty(
        options,
        'swade.wounds.value',
        this.wounds.value,
      );
    }
    if (foundry.utils.hasProperty(changed, 'system.fatigue.value')) {
      foundry.utils.setProperty(
        options,
        'swade.fatigue.value',
        this.fatigue.value,
      );
    }
  }
}

export { CreatureData };
