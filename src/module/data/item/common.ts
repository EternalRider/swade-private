import { constants } from '../../constants';
import {
  makeAdditionalStatsSchema,
  makeDiceField,
  MappingField,
} from '../shared';

const fields = foundry.data.fields;

export const itemDescription = () => ({
  description: new fields.HTMLField({ initial: '', textSearch: true }),
  notes: new fields.StringField({ initial: '', textSearch: true }),
  source: new fields.StringField({ initial: '', textSearch: true }),
  ...additionalStats(),
});
export const physicalItem = () => ({
  quantity: new fields.NumberField({ initial: 1 }),
  weight: new fields.NumberField({ initial: 0 }),
  price: new fields.NumberField({ initial: 0 }),
});
export const arcaneDevice = () => ({
  isArcaneDevice: new fields.BooleanField(),
  arcaneSkillDie: new fields.SchemaField({
    sides: makeDiceField(),
    modifier: new fields.NumberField({ initial: 0 }),
  }),
  powerPoints: new fields.ObjectField({}),
});
export const equippable = () => ({
  equippable: new fields.BooleanField(),
  equipStatus: new fields.NumberField({ initial: 1 }),
});
export const vehicular = () => ({
  isVehicular: new fields.BooleanField(),
  mods: new fields.NumberField({ initial: 1 }),
});
export const actions = () => ({
  actions: new fields.SchemaField({
    skill: new fields.StringField({ initial: '' }),
    skillMod: new fields.StringField({ initial: '' }),
    dmgMod: new fields.StringField({ initial: '' }),
    additional: new MappingField(
      new fields.SchemaField({
        name: new fields.StringField({ initial: '' }),
        type: new fields.StringField({
          initial: constants.ACTION_TYPE.SKILL,
          choices: Object.values(constants.ACTION_TYPE),
        }),
        rof: new fields.NumberField({ initial: 1, required: false }),
        shotsUsed: new fields.NumberField({ initial: 1, required: false }),
        skillMod: new fields.StringField({ initial: '', required: false }),
        skillOverride: new fields.StringField({ initial: '', required: false }),
        dmgMod: new fields.StringField({ initial: '', required: false }),
        dmgOverride: new fields.StringField({ initial: '', required: false }),
        isHeavyWeapon: new fields.BooleanField({ required: false }),
      }),
    ),
  }),
});
export const bonusDamage = () => ({
  bonusDamageDie: makeDiceField(6),
  bonusDamageDice: new fields.NumberField({ initial: 1 }),
});
export const favorite = () => ({
  favorite: new fields.BooleanField(),
});
export const templates = () => ({
  templates: new fields.SchemaField({
    cone: new fields.BooleanField(),
    stream: new fields.BooleanField(),
    small: new fields.BooleanField(),
    medium: new fields.BooleanField(),
    large: new fields.BooleanField(),
  }),
});
export const additionalStats = () => ({
  additionalStats: makeAdditionalStatsSchema(),
});
export const category = () => ({
  category: new fields.StringField({ initial: '' }),
});
export const grantEmbedded = () => ({
  ...grants(),
  grantOn: new fields.NumberField({ initial: constants.GRANT_ON.CARRIED }),
});

export const grants = () => ({
  grants: new fields.ArrayField(
    //TODO create schema field for item grants
    new fields.SchemaField({
      uuid: new fields.StringField({ initial: '', required: true }),
      img: new fields.StringField({ initial: null, nullable: true }),
      name: new fields.StringField({ initial: null, nullable: true }),
      mutation: new fields.ObjectField({ required: false }),
    }),
  ),
});
