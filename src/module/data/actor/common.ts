import { DerivedModifier } from '../../../interfaces/additional.interface';
import { Advance } from '../../../interfaces/Advance.interface';
import { getRankFromAdvanceAsString } from '../../util';
import { MappingField } from '../fields/MappingField';
import {
  boundTraitDie,
  makeAdditionalStatsSchema,
  makeDiceField,
  makeTraitDiceFields,
} from '../shared';
import * as quarantine from './_quarantine';

const fields = foundry.data.fields;

export class CommonActorData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof CommonActorData)['defineSchema']>
  >
> {
  static defineSchema() {
    return {
      attributes: new fields.SchemaField({
        agility: new fields.SchemaField(makeTraitDiceFields()),
        smarts: new fields.SchemaField({
          ...makeTraitDiceFields(),
          animal: new fields.BooleanField(),
        }),
        spirit: new fields.SchemaField({
          ...makeTraitDiceFields(),
          unShakeBonus: new fields.NumberField({ initial: 0, integer: true }),
        }),
        strength: new fields.SchemaField({
          ...makeTraitDiceFields(),
          encumbranceSteps: new fields.NumberField({
            initial: 0,
            integer: true,
          }),
        }),
        vigor: new fields.SchemaField({
          ...makeTraitDiceFields(),
          unStunBonus: new fields.NumberField({ initial: 0, integer: true }),
          soakBonus: new fields.NumberField({ initial: 0, integer: true }),
          bleedOut: new fields.SchemaField({
            modifier: new fields.NumberField({ initial: 0, integer: true }),
            ignoreWounds: new fields.BooleanField(),
          }),
        }),
      }),
      stats: new fields.SchemaField({
        speed: new fields.SchemaField({
          runningDie: makeDiceField(6),
          runningMod: new fields.NumberField({ initial: 0, integer: true }),
          value: new fields.NumberField({ initial: 6, integer: true }),
        }),
        toughness: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, integer: true }),
          armor: new fields.NumberField({ initial: 0, integer: true }),
          modifier: new fields.NumberField({
            initial: 0,
            integer: true,
            required: false,
          }),
        }),
        parry: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0, integer: true }),
          shield: new fields.NumberField({ initial: 0, integer: true }),
          modifier: new fields.NumberField({
            initial: 0,
            integer: true,
            required: false,
          }),
        }),
        size: new fields.NumberField({ initial: 0, integer: true }),
      }),
      details: new fields.SchemaField({
        autoCalcToughness: new fields.BooleanField({ initial: true }),
        autoCalcParry: new fields.BooleanField({ initial: true }),
        archetype: new fields.StringField({ initial: '', textSearch: true }),
        appearance: new fields.HTMLField({ initial: '', textSearch: true }),
        notes: new fields.HTMLField({ initial: '', textSearch: true }),
        goals: new fields.HTMLField({ initial: '', textSearch: true }),
        biography: new fields.SchemaField({
          value: new fields.HTMLField({ initial: '', textSearch: true }),
        }),
        species: new fields.SchemaField({
          name: new fields.StringField({ initial: '', textSearch: true }),
        }),
        currency: new fields.NumberField({ initial: 0 }),
        wealth: new fields.SchemaField({
          die: new fields.NumberField({ initial: 6, min: -1, integer: true }),
          modifier: new fields.NumberField({ initial: 0 }),
          'wild-die': makeDiceField(6),
        }),
        conviction: new fields.SchemaField({
          value: new fields.NumberField({ initial: 0 }),
          active: new fields.BooleanField(),
        }),
      }),
      powerPoints: new MappingField(this.makePowerPointsSchema(), {
        initialKeys: ['general'],
        required: true,
      }),
      fatigue: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0 }),
        max: new fields.NumberField({ initial: 2 }),
        ignored: new fields.NumberField({ initial: 0 }),
      }),
      woundsOrFatigue: new fields.SchemaField({
        ignored: new fields.NumberField({ initial: 0 }),
      }),
      advances: new fields.SchemaField({
        mode: new fields.StringField({
          initial: 'expanded',
          choices: ['legacy', 'expanded'],
        }),
        value: new fields.NumberField({ initial: 0 }),
        rank: new fields.StringField({ initial: 'Novice', textSearch: true }),
        details: new fields.HTMLField({ initial: '' }),
        list: new fields.ArrayField(
          new fields.SchemaField({
            //TODO Create special data field for Advances
            type: new fields.NumberField({ initial: 0 }),
            notes: new fields.HTMLField({ initial: '' }),
            sort: new fields.NumberField({ initial: 0 }),
            planned: new fields.BooleanField(),
            id: new fields.StringField({ initial: '' }),
            rank: new fields.NumberField({ initial: 0 }),
          }),
        ),
      }),
      status: new fields.SchemaField({
        isShaken: new fields.BooleanField(),
        isDistracted: new fields.BooleanField(),
        isVulnerable: new fields.BooleanField(),
        isStunned: new fields.BooleanField(),
        isEntangled: new fields.BooleanField(),
        isBound: new fields.BooleanField(),
        isIncapacitated: new fields.BooleanField(),
      }),
      initiative: new fields.SchemaField({
        hasHesitant: new fields.BooleanField(),
        hasLevelHeaded: new fields.BooleanField(),
        hasImpLevelHeaded: new fields.BooleanField(),
        hasQuick: new fields.BooleanField(),
      }),
      additionalStats: makeAdditionalStatsSchema(),
    };
  }

  protected static wildcardData = (
    baseBennies: number,
    maxWounds: number,
    wildcard: boolean,
  ) => ({
    bennies: new fields.SchemaField({
      value: new fields.NumberField({ initial: 0 }),
      max: new fields.NumberField({ initial: baseBennies }),
    }),
    wounds: new fields.SchemaField({
      value: new fields.NumberField({ initial: 0 }),
      max: new fields.NumberField({ initial: maxWounds }),
      ignored: new fields.NumberField({ initial: 0 }),
    }),
    wildcard: new fields.BooleanField({ initial: wildcard }),
  });

  protected static makePowerPointsSchema = () => {
    return new fields.SchemaField({
      value: new fields.NumberField({ initial: 0 }),
      max: new fields.NumberField({ initial: 0 }),
    });
  };

  /** @inheritdoc */
  static override migrateData(source) {
    quarantine.ensureStrengthDie(source);
    quarantine.ensureCurrencyIsNumeric(source);
    quarantine.ensureGeneralPowerPoints(source);
    return super.migrateData(source);
  }

  override prepareBaseData() {
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
    };
  }

  override prepareDerivedData() {
    //die type bounding for attributes
    for (const key in this.attributes) {
      const attribute = this.attributes[key];
      attribute.die = boundTraitDie(attribute.die);
      attribute['wild-die'].sides = Math.min(attribute['wild-die'].sides, 12);
    }

    //handle advances
    const advances = this.advances;
    if (advances.mode === 'expanded') {
      const advRaw = getProperty(this._source, 'advances.list') as Advance[];
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
}
