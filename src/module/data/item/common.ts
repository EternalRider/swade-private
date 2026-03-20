import { constants } from '../../constants';
import { FormulaField } from '../fields/FormulaField';
import { makeAdditionalStatsSchema, makeDiceField } from '../shared';

const fields = foundry.data.fields;

/** source for regex: https://ihateregex.io/expr/url-slug/ */

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/g;

export const itemDescription = () => ({
  description: new fields.HTMLField({
    initial: '',
    textSearch: true,
    label: 'SWADE.Desc',
  }),
  notes: new fields.StringField({
    initial: '',
    textSearch: true,
    label: 'SWADE.Notes',
  }),
  source: new fields.StringField({
    initial: '',
    textSearch: true,
    label: 'SWADE.Source',
  }),
  swid: new fields.StringField({
    initial: constants.RESERVED_SWID.DEFAULT,
    blank: false,
    required: true,
    label: 'SWADE.SWID.Long',
    validate: (
      value: string,
      _options: foundry.data.fields.DataField.ValidationOptions
    ) => {
      validateSwid(value);
    },
  }),
  ...additionalStats(),
});

export const builder = () => ({
  build: new fields.SchemaField({
    cost: new fields.NumberField({ label: 'SWADE.BuildCost' }),
    // Null means unlimited. Nonlinear options should be implemented as separate choices.
    limit: new fields.NumberField({
      label: 'SWADE.BuildLimit',
      initial: 1,
      integer: true,
      min: 1,
    }),
    level: new fields.NumberField({
      label: 'SWADE.BuildLevel',
      initial: 1,
      integer: true,
      min: 1,
    }),
  }),
});

export const physicalItem = () => ({
  quantity: new fields.NumberField({ initial: 1, label: 'SWADE.Quantity' }),
  weight: new fields.NumberField({ initial: 0, label: 'SWADE.Weight' }),
  price: new fields.NumberField({ initial: 0, label: 'SWADE.Price' }),
});

export const arcaneDevice = () => ({
  isArcaneDevice: new fields.BooleanField({ label: 'SWADE.ArcaneDevice' }),
  arcaneSkillDie: new fields.SchemaField({
    sides: makeDiceField(),
    modifier: new fields.NumberField({ initial: 0, label: 'SWADE.Modifier' }),
  }),
  powerPoints: new fields.ObjectField({ label: 'SWADE.PP' }),
});

export const equippable = () => ({
  equippable: new fields.BooleanField({ label: 'SWADE.Equippable' }),
  equipStatus: new fields.NumberField({ initial: 1, label: 'SWADE.Equipped' }),
});

export const vehicular = () => ({
  isVehicular: new fields.BooleanField({ label: 'SWADE.VehicleMod' }),
  mods: new fields.NumberField({ initial: 1, label: 'SWADE.Mods' }),
});

export const bonusDamage = () => ({
  bonusDamageDie: makeDiceField(6),
  bonusDamageDice: new fields.NumberField({
    initial: 1,
    label: 'SWADE.NumberOfDice.Label',
  }),
});

const additionalActionSchema = () =>
  new fields.SchemaField({
    name: new fields.StringField({
      blank: false,
      nullable: false,
      label: 'SWADE.Name',
    }),
    type: new fields.StringField({
      initial: constants.ACTION_TYPE.TRAIT,
      choices: Object.values(constants.ACTION_TYPE),
      label: 'Type',
    }),
    dice: new fields.NumberField({ initial: undefined, required: false }),
    resourcesUsed: new fields.NumberField({
      initial: undefined,
      required: false,
      label: 'SWADE.ResourcesUsed.Label',
    }),
    modifier: new fields.StringField({
      initial: undefined,
      required: false,
      label: 'SWADE.Modifier',
    }),
    override: new fields.StringField({
      initial: undefined,
      required: false,
      label: 'SWADE.ActionsOverride',
    }),
    ap: new fields.NumberField({
      initial: undefined,
      required: false,
      nullable: true,
      label: 'SWADE.Name',
    }),
    uuid: new fields.DocumentUUIDField({
      type: 'Macro',
      nullable: true,
      required: true,
      blank: false,
      initial: null,
      label: 'UUID',
    }),
    macroActor: new fields.StringField({
      initial: constants.MACRO_ACTOR.DEFAULT,
      required: false,
      choices: Object.values(constants.MACRO_ACTOR),
      label: 'DOCUMENT.Actor',
    }),
    isHeavyWeapon: new fields.BooleanField({
      initial: false,
      required: false,
      label: 'SWADE.HeavyWeapon',
    }),
  });

export const actions = () => ({
  actions: new fields.SchemaField({
    trait: new fields.StringField({ initial: '', label: 'SWADE.Trait' }),
    traitMod: new FormulaField({ initial: '', label: 'SWADE.TraitMod' }),
    dmgMod: new FormulaField({ initial: '', label: 'SWADE.DmgMod' }),
    additional: new fields.TypedObjectField(additionalActionSchema(), {
      initial: {},
    }),
  }),
  ...bonusDamage(),
});

export const activities = () => ({
  activities: new fields.SetField(
    new fields.StringField({ blank: false, nullable: false }),
    {
      label: 'SWADE.Actions.Activities.Label',
      hint: 'SWADE.Actions.Activities.Hint',
    }
  ),
});

export const favorite = () => ({
  favorite: new fields.BooleanField({ label: 'SWADE.Favorite' }),
});

export const templates = () => ({
  templates: new fields.SchemaField(
    {
      scone: new fields.BooleanField({ label: 'SWADE.SmallCone.Short' }),
      cone: new fields.BooleanField({ label: 'SWADE.Cone.Short' }),
      stream: new fields.BooleanField({ label: 'SWADE.Stream.Short' }),
      small: new fields.BooleanField({ label: 'SWADE.Small.Short' }),
      medium: new fields.BooleanField({ label: 'SWADE.Medium.Short' }),
      large: new fields.BooleanField({ label: 'SWADE.Large.Short' }),
    },
    { label: 'SWADE.Templates.Possible' }
  ),
});

export const additionalStats = () => ({
  additionalStats: makeAdditionalStatsSchema(),
});

export const category = () => ({
  category: new fields.StringField({ initial: '', label: 'SWADE.Category' }),
});

export const grantEmbedded = () => ({
  ...grants(),
  grantOn: new fields.NumberField({
    initial: constants.GRANT_ON.CARRIED,
    label: 'SWADE.ItemGrants.When',
  }),
});

export const grants = () => ({
  grants: new fields.ArrayField(
    //TODO create schema field for item grants
    new fields.SchemaField({
      uuid: new fields.DocumentUUIDField({
        type: 'Item',
        nullable: false,
        required: true,
        label: 'SWADE.Item',
      }),
      img: new fields.StringField({
        initial: null,
        nullable: true,
        label: 'Image',
      }),
      name: new fields.StringField({
        initial: null,
        nullable: true,
        label: 'SWADE.Name',
      }),
      mutation: new fields.ObjectField({
        required: false,
        label: 'SWADE.ItemGrants.Mutation',
      }),
    })
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
          addToName: new fields.BooleanField({
            initial: true,
            nullable: false,
          }),
          mutation: new fields.ObjectField({
            required: false,
            label: 'SWADE.ItemGrants.Mutation',
          }),
        })
      ),
    })
  ),
});

export function validateSwid(value: string) {
  //`any` is a reserved word
  if (value === constants.RESERVED_SWID.ANY) {
    return new foundry.data.validation.DataModelValidationFailure({
      unresolved: true,
      invalidValue: value,
      message: 'any is a reserved SWID!',
    });
  }
  //if the value matches the regex we have likely a valid swid
  if (!value.match(SLUG_REGEX)) {
    return new foundry.data.validation.DataModelValidationFailure({
      unresolved: true,
      invalidValue: value,
      message: value + ' is not a valid SWID!',
    });
  }
}
