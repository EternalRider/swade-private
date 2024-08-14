import { Advance } from '../../../interfaces/Advance.interface';
import {
  DerivedModifier,
  RollModifier,
} from '../../../interfaces/additional.interface';
import { SWADE } from '../../config';
import type SwadeActor from '../../documents/actor/SwadeActor';
import { addUpModifiers, getRankFromAdvanceAsString } from '../../util';
import { DiceField, DiceTrait } from '../common.interface';
import { MappingField } from '../fields/MappingField';
import {
  boundTraitDie,
  makeAdditionalStatsSchema,
  makeDiceField,
  makeTraitDiceFields,
} from '../shared';
import * as quarantine from './_quarantine';

const fields = foundry.data.fields;

declare namespace CommonActorData {
  interface Schema extends DataSchema {
    attributes: foundry.data.fields.SchemaField<{
      agility: foundry.data.fields.SchemaField<DiceTrait>;
      smarts: foundry.data.fields.SchemaField<
        DiceTrait & {
          animal: foundry.data.fields.BooleanField;
        }
      >;
      spirit: foundry.data.fields.SchemaField<
        DiceTrait & {
          unShakeBonus: foundry.data.fields.NumberField<{
            initial: 0;
            integer: true;
          }>;
        }
      >;
      strength: foundry.data.fields.SchemaField<
        DiceTrait & {
          encumbranceSteps: foundry.data.fields.NumberField<{
            initial: 0;
            integer: true;
          }>;
        }
      >;
      vigor: foundry.data.fields.SchemaField<
        DiceTrait & {
          unStunBonus: foundry.data.fields.NumberField<{
            initial: 0;
            integer: true;
          }>;
          soakBonus: foundry.data.fields.NumberField<{
            initial: 0;
            integer: true;
          }>;
          bleedOut: foundry.data.fields.SchemaField<{
            modifier: foundry.data.fields.NumberField<{
              initial: 0;
              integer: true;
            }>;
            ignoreWounds: foundry.data.fields.BooleanField;
          }>;
        }
      >;
    }>;
    stats: foundry.data.fields.SchemaField<{
      speed: foundry.data.fields.SchemaField<{
        runningDie: DiceField;
        runningMod: foundry.data.fields.NumberField<{
          initial: 0;
          integer: true;
        }>;
        value: foundry.data.fields.NumberField<{ initial: 6; integer: true }>;
      }>;
      toughness: foundry.data.fields.SchemaField<{
        value: foundry.data.fields.NumberField<{ initial: 0; integer: true }>;
        armor: foundry.data.fields.NumberField<{ initial: 0; integer: true }>;
        modifier: foundry.data.fields.NumberField<{
          initial: 0;
          integer: true;
          required: false;
        }>;
      }>;
      parry: foundry.data.fields.SchemaField<{
        value: foundry.data.fields.NumberField<{ initial: 0; integer: true }>;
        shield: foundry.data.fields.NumberField<{ initial: 0; integer: true }>;
        modifier: foundry.data.fields.NumberField<{
          initial: 0;
          integer: true;
          required: false;
        }>;
      }>;
      size: foundry.data.fields.NumberField<{ initial: 0; integer: true }>;
    }>;
    details: foundry.data.fields.SchemaField<{
      autoCalcToughness: foundry.data.fields.BooleanField<{ initial: true }>;
      autoCalcParry: foundry.data.fields.BooleanField<{ initial: true }>;
      archetype: foundry.data.fields.StringField<{
        initial: '';
        textSearch: true;
      }>;
      appearance: foundry.data.fields.HTMLField<{
        initial: '';
        textSearch: true;
      }>;
      notes: foundry.data.fields.HTMLField<{ initial: ''; textSearch: true }>;
      goals: foundry.data.fields.HTMLField<{ initial: ''; textSearch: true }>;
      biography: foundry.data.fields.SchemaField<{
        value: foundry.data.fields.HTMLField<{ initial: ''; textSearch: true }>;
      }>;
      species: foundry.data.fields.SchemaField<{
        name: foundry.data.fields.StringField<{
          initial: '';
          textSearch: true;
        }>;
      }>;
      currency: foundry.data.fields.NumberField<{ initial: 0 }>;
      wealth: foundry.data.fields.SchemaField<{
        die: foundry.data.fields.NumberField<{
          initial: 6;
          min: -1;
          integer: true;
        }>;
        modifier: foundry.data.fields.NumberField<{ initial: 0 }>;
        'wild-die': DiceField;
      }>;
      conviction: foundry.data.fields.SchemaField<{
        value: foundry.data.fields.NumberField<{ initial: 0 }>;
        active: foundry.data.fields.BooleanField;
      }>;
    }>;
    powerPoints: MappingField<foundry.data.fields.SchemaField<{}>>;
    fatigue: foundry.data.fields.SchemaField<{
      value: foundry.data.fields.NumberField<{ initial: 0; min: 0 }>;
      max: foundry.data.fields.NumberField<{ initial: 2 }>;
      ignored: foundry.data.fields.NumberField<{ initial: 0 }>;
    }>;
    woundsOrFatigue: foundry.data.fields.SchemaField<{
      ignored: foundry.data.fields.NumberField<{ initial: 0 }>;
    }>;
    advances: foundry.data.fields.SchemaField<{
      mode: foundry.data.fields.StringField<{
        initial: 'expanded';
        choices: ['legacy', 'expanded'];
      }>;
      value: foundry.data.fields.NumberField<{ initial: 0 }>;
      rank: foundry.data.fields.StringField<{
        initial: 'Novice';
        textSearch: true;
      }>;
      details: foundry.data.fields.HTMLField<{ initial: '' }>;
      list: foundry.data.fields.ArrayField<
        foundry.data.fields.SchemaField<{
          type: foundry.data.fields.NumberField<{ initial: 0 }>;
          notes: foundry.data.fields.HTMLField<{ initial: '' }>;
          sort: foundry.data.fields.NumberField<{ initial: 0 }>;
          planned: foundry.data.fields.BooleanField;
          id: foundry.data.fields.StringField<{ initial: '' }>;
          rank: foundry.data.fields.NumberField<{ initial: 0 }>;
        }>
      >;
    }>;
    status: foundry.data.fields.SchemaField<{
      isShaken: foundry.data.fields.BooleanField;
      isDistracted: foundry.data.fields.BooleanField;
      isVulnerable: foundry.data.fields.BooleanField;
      isStunned: foundry.data.fields.BooleanField;
      isEntangled: foundry.data.fields.BooleanField;
      isBound: foundry.data.fields.BooleanField;
      isIncapacitated: foundry.data.fields.BooleanField;
    }>;
    initiative: foundry.data.fields.SchemaField<{
      hasHesitant: foundry.data.fields.BooleanField;
      hasLevelHeaded: foundry.data.fields.BooleanField;
      hasImpLevelHeaded: foundry.data.fields.BooleanField;
      hasQuick: foundry.data.fields.BooleanField;
    }>;
    additionalStats: ReturnType<typeof makeAdditionalStatsSchema>;
  }

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
      };
    };
  }

  interface DerivedData {
    advances: {
      list: Collection<Advance>;
    };
    stats: {
      speed: {
        adjusted: number;
      };
    };
    details: {
      encumbrance: {
        max: number;
        value: number;
        isEncumbered: boolean;
      };
    };
  }
}

class CommonActorData<
  Schema extends CommonActorData.Schema = CommonActorData.Schema,
  BaseData extends CommonActorData.BaseData = CommonActorData.BaseData,
  DerivedData extends CommonActorData.DerivedData = CommonActorData.DerivedData,
> extends foundry.abstract.TypeDataModel<
  Schema,
  SwadeActor,
  BaseData,
  DerivedData
> {
  static override defineSchema(): CommonActorData.Schema {
    return {
      attributes: new fields.SchemaField(
        {
          agility: new fields.SchemaField(makeTraitDiceFields(), {
            label: 'SWADE.AttrAgi',
          }),
          smarts: new fields.SchemaField(
            {
              ...makeTraitDiceFields(),
              animal: new fields.BooleanField({ label: 'SWADE.AnimalSmarts' }),
            },
            { label: 'SWADE.AttrSma' },
          ),
          spirit: new fields.SchemaField(
            {
              ...makeTraitDiceFields(),
              unShakeBonus: new fields.NumberField({
                initial: 0,
                integer: true,
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
      stats: new fields.SchemaField(
        {
          speed: new fields.SchemaField(
            {
              runningDie: makeDiceField(6, 'SWADE.RunningDie'),
              runningMod: new fields.NumberField({
                initial: 0,
                integer: true,
                label: 'SWADE.RunningMod',
              }),
              value: new fields.NumberField({
                initial: 6,
                integer: true,
                label: 'SWADE.BasePace',
              }),
            },
            { label: 'SWADE.Pace' },
          ),
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
        },
        { label: 'SWADE.Stats' },
      ),
      details: new fields.SchemaField(
        {
          autoCalcToughness: new fields.BooleanField({
            initial: true,
            label: 'SWADE.InclArmor',
          }),
          autoCalcParry: new fields.BooleanField({
            initial: true,
            label: 'SWADE.AutoCalcParry',
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
      powerPoints: new MappingField(this.makePowerPointsSchema(), {
        initialKeys: ['general'],
        required: true,
        label: 'SWADE.PP',
      }),
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
            choices: ['legacy', 'expanded'],
            label: 'SWADE.Advances.Modes.Label',
          }),
          value: new fields.NumberField({ initial: 0, label: 'SWADE.Advance' }),
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
              rank: new fields.NumberField({ initial: 0, label: 'SWADE.Rank' }),
            }),
            { label: 'SWADE.Adv' },
          ),
        },
        { label: 'SWADE.Adv' },
      ),
      status: new fields.SchemaField(
        {
          isShaken: new fields.BooleanField({ label: 'SWADE.Shaken' }),
          isDistracted: new fields.BooleanField({ label: 'SWADE.Distracted' }),
          isVulnerable: new fields.BooleanField({ label: 'SWADE.Vulnerable' }),
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
        },
        { label: 'SWADE.Init' },
      ),
      additionalStats: makeAdditionalStatsSchema(),
    };
  }

  protected static wildcardData = (baseBennies: number, maxWounds: number) => ({
    bennies: new fields.SchemaField(
      {
        value: new fields.NumberField({
          initial: 0,
          label: 'SWADE.CurrentBennies',
        }),
        max: new fields.NumberField({
          initial: baseBennies,
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
          label: 'SWADE.Wounds',
        }),
        max: new fields.NumberField({
          initial: maxWounds,
          label: 'SWADE.WoundsMax',
        }),
        ignored: new fields.NumberField({
          initial: 0,
          label: 'SWADE.IgnWounds',
        }),
      },
      { label: 'SWADE.Wounds' },
    ),
  });

  protected static makePowerPointsSchema = () => {
    return new fields.SchemaField(
      {
        value: new fields.NumberField({ initial: 0, label: 'SWADE.CurPP' }),
        max: new fields.NumberField({ initial: 0, label: 'SWADE.MaxPP' }),
      },
      { label: 'SWADE.PP' },
    );
  };

  /** @inheritdoc */
  static override migrateData(source) {
    quarantine.ensureStrengthDie(source);
    quarantine.ensureCurrencyIsNumeric(source);
    quarantine.ensureGeneralPowerPoints(source);
    quarantine.ensurePowerPointsAreNumeric(source);
    return super.migrateData(source);
  }

  // specifying this to resolve depth issue
  override prepareBaseData(this: CommonActorData) {
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
    };
  }

  // specifying this to resolve depth issue
  override prepareDerivedData(this: CommonActorData) {
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
    this.stats.scale = this.parent.calcScale(this.stats.size);

    // Doing all pace calculations in here because of encumbrance
    let pace = this.stats.speed.value;

    //modify pace with wounds, core rules p. 95
    if (game.settings.get('swade', 'enableWoundPace')) {
      const woundPenalties = this.parent.calcWoundPenalties(false);
      pace += woundPenalties;
      // Minimum of 1"
      pace = Math.max(pace, 1);
    }

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

    //subtract encumbrance, if necessary
    if (this.encumbered) pace -= 2;

    //Clamp the pace so it's not a negative value
    this.stats.speed.adjusted = Math.max(pace, 0);

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
  }

  get encumbered(): boolean {
    if (!game.settings.get('swade', 'applyEncumbrance')) {
      return false;
    }
    const encumbrance = this.details.encumbrance;
    if (encumbrance.isEncumbered) return true;
    return encumbrance.value > encumbrance.max;
  }

  get isIncapacitated(): boolean {
    return (
      this.status.isIncapacitated ||
      this.parent?.statuses.has(CONFIG.specialStatusEffects.INCAPACITATED)
    );
  }

  // specifying this to resolve depth issue
  getRollData(
    this: CommonActorData,
    includeModifiers: boolean,
  ): Record<string, number | string> {
    const out: Record<string, number | string> = {
      wounds: this.wounds.value || 0,
      fatigue: this.fatigue.value || 0,
      pace: this.stats.speed.adjusted || 0,
    };

    const globalMods = this.stats.globalMods;

    // Attributes
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
            value: attribute.die.modifier as number,
          },
          ...globalMods[key],
          ...globalMods.trait,
        ])
          .filter((m) => m.ignore !== true)
          .reduce(addUpModifiers, 0) as number;
      }
      let modString = mod !== 0 ? mod.signedString() : '';
      if (mod) modString += `[${game.i18n.localize('SWADE.TraitMod')}]`;
      let val = `1d${die}x[${name}]${modString}`;
      if (die <= 1) val = `1d${die}[${name}]${modString}`;
      out[short] = val;
    }

    for (const skill of this.parent.itemTypes.skill) {
      const die = skill.system.die.sides;
      let mod = Number(skill.system.die.modifier);
      if (includeModifiers) mod = skill.modifier;
      const name = skill.name!.slugify({ strict: true });
      let modString = mod !== 0 ? mod.signedString() : '';
      if (mod) modString += `[${game.i18n.localize('SWADE.TraitMod')}]`;
      out[name] = `1d${die}[${skill.name}]${modString}`;
    }

    return out;
  }

  // specifying this to resolve depth issue
  async refreshBennies(this: CommonActorData, notify = true) {
    if (notify && game.settings.get('swade', 'notifyBennies')) {
      const message = await renderTemplate(SWADE.bennies.templates.refresh, {
        target: this.parent,
        speaker: game.user,
      });
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
}

export { CommonActorData };
