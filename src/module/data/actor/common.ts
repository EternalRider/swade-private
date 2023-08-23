import {
  makeAdditionalStatsSchema,
  makeDiceField,
  makeTraitDiceFields,
  MappingField,
} from '../shared';

const fields = foundry.data.fields;

const makePowerPointsSchema = () => {
  return new fields.SchemaField({
    value: new fields.NumberField({ initial: 0 }),
    max: new fields.NumberField({ initial: 0 }),
  });
};

const commonActorData = (baseBennies = 3, maxWounds = 3, wildcard = true) => ({
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
      encumbranceSteps: new fields.NumberField({ initial: 0, integer: true }),
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
  powerPoints: new MappingField(makePowerPointsSchema(), {
    initialKeys: ['general'],
    required: true,
  }),
  fatigue: new fields.SchemaField({
    value: new fields.NumberField({ initial: 0 }),
    max: new fields.NumberField({ initial: 2 }),
    ignored: new fields.NumberField({ initial: 0 }),
  }),
  wounds: new fields.SchemaField({
    value: new fields.NumberField({ initial: 0 }),
    max: new fields.NumberField({ initial: maxWounds }),
    ignored: new fields.NumberField({ initial: 0 }),
  }),
  woundsOrFatigue: new fields.SchemaField({
    ignored: new fields.NumberField({ initial: 0 }),
  }),
  bennies: new fields.SchemaField({
    value: new fields.NumberField({ initial: 0 }),
    max: new fields.NumberField({ initial: baseBennies }),
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
  wildcard: new fields.BooleanField({ initial: wildcard }),
});
export default commonActorData;
