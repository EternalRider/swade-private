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
    trait: new fields.StringField({ initial: '' }),
    traitMod: new fields.StringField({ initial: '' }),
    dmgMod: new fields.StringField({ initial: '' }),
    additional: new MappingField(
      new fields.SchemaField({
        name: new fields.StringField({ blank: false, nullable: false }),
        type: new fields.StringField({
          initial: constants.ACTION_TYPE.TRAIT,
          choices: Object.values(constants.ACTION_TYPE),
        }),
        dice: new fields.NumberField({ initial: undefined, required: false }),
        resourcesUsed: new fields.NumberField({
          initial: undefined,
          required: false,
        }),
        modifier: new fields.StringField({
          initial: undefined,
          required: false,
        }),
        override: new fields.StringField({
          initial: undefined,
          required: false,
        }),
        uuid: new fields.StringField({ initial: undefined, required: false }),
        isHeavyWeapon: new fields.BooleanField({
          initial: false,
          required: false,
        }),
      }),
      { initial: {} },
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
