import { DataField } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/fields.mjs';
import { constants } from '../../constants';
import { MappingField } from '../fields/MappingField';
import { makeAdditionalStatsSchema, makeDiceField } from '../shared';

const fields = foundry.data.fields;

/** source for regex: https://ihateregex.io/expr/url-slug/ */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/g;

export const itemDescription = () => ({
  description: new fields.HTMLField({ initial: '', textSearch: true }),
  notes: new fields.StringField({ initial: '', textSearch: true }),
  source: new fields.StringField({ initial: '', textSearch: true }),
  swid: new fields.StringField({
    initial: constants.RESERVED_SWID.DEFAULT,
    blank: false,
    required: true,
    validate: (
      value: string,
      _options: DataField.ValidationOptions<foundry.data.fields.StringField>,
    ) => {
      validateSwid(value);
    },
  }),
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
        macroActor: new fields.StringField({
          initial: constants.MACRO_ACTOR.DEFAULT,
          required: false,
          choices: Object.values(constants.MACRO_ACTOR),
        }),
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

export const choiceSets = () => ({
  choiceSets: new fields.ArrayField(
    new fields.SchemaField({
      title: new fields.StringField({ initial: '', required: true }),
      choice: new fields.NumberField({ initial: null, nullable: true }),
      choices: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ initial: '', required: true }),
          addToName: new fields.BooleanField({ initial: true, nullable: false}),
          mutation: new fields.ObjectField({ required: false }),
        }),
      ),
    }),
  ),
});

export function validateSwid(value: string) {
  //`any` is a reserved word
  if (value === constants.RESERVED_SWID.ANY) {
    return new foundry.data.validation.DataModelValidationFailure({
      unresolved: true,
      invalidValue: value,
      message: 'any is a reserved swid!',
    });
  }
  //if the value matches the regex we have likely a valid swid
  if (!value.match(SLUG_REGEX)) {
    return new foundry.data.validation.DataModelValidationFailure({
      unresolved: true,
      invalidValue: value,
      message: value + ' is not a valid SWID',
    });
  }
}
