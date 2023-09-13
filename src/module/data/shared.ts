import {
  DataField,
  ModelValidationError,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/fields.mjs';
import { constants } from '../constants';
import { TraitDie } from '../documents/actor/actor-data-source';

export function makeDiceField(init = 4) {
  return new foundry.data.fields.NumberField({
    initial: init,
    min: 0,
    integer: true,
    positive: true,
  });
}

export function makeTraitDiceFields() {
  const fields = foundry.data.fields;
  return {
    die: new fields.SchemaField({
      sides: makeDiceField(),
      modifier: new fields.NumberField({
        initial: 0,
        integer: true,
      }),
    }),
    'wild-die': new fields.SchemaField({
      sides: makeDiceField(6),
    }),
  };
}

export function makeAdditionalStatsSchema() {
  const fields = foundry.data.fields;
  return new MappingField(
    new fields.SchemaField({
      label: new fields.StringField({ nullable: false }),
      dtype: new fields.StringField({
        nullable: false,
        choices: Object.values(constants.ADDITIONAL_STATS_TYPE),
      }),
      hasMaxValue: new fields.BooleanField({}),
      value: new AddStatsValueField(),
      max: new AddStatsValueField(),
      optionString: new fields.StringField({
        required: false,
        initial: undefined,
      }),
      modifier: new fields.StringField({
        required: false,
        initial: undefined,
      }),
    }),
    { initial: {} },
  );
}

/**
 * @param die The die to adjust
 * @returns the properly adjusted trait die
 */
export function boundTraitDie(die: TraitDie): TraitDie {
  const sides = die.sides;
  if (sides < 4 && sides !== 1) {
    die.sides = 4;
  } else if (sides > 12) {
    const difference = sides - 12;
    die.sides = 12;
    die.modifier += difference / 2;
  }
  return die;
}

/*
 * A subclass of ObjectField that represents a mapping of keys to the provided DataField type.
 * @param {DataField} model                    The class of DataField which should be embedded in this field.
 * @param {MappingFieldOptions} [options={}]   Options which configure the behavior of the field.
 * @property {string[]} [initialKeys]          Keys that will be created if no data is provided.
 * @property {MappingFieldInitialValueBuilder} [initialValue]  Function to calculate the initial value for a key.
 * @property {boolean} [initialKeysOnly=false]  Should the keys in the initialized data be limited to the keys provided
 *                                              by `options.initialKeys`?
 */
export class MappingField extends foundry.data.fields.ObjectField {
  /**The embedded DataField definition which is contained in this field.*/
  model: DataField;
  initialKeys: string[];
  initialKeysOnly: boolean;

  constructor(model: DataField.Any, options?: any) {
    if (!(model instanceof foundry.data.fields.DataField)) {
      throw new Error(
        'MappingField must have a DataField as its contained element',
      );
    }
    super(options);
    this.model = model;
  }

  /* -------------------------------------------- */

  static override get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      initialKeys: null,
      initialValue: null,
      initialKeysOnly: false,
    });
  }

  /* -------------------------------------------- */

  protected override _cleanType(value, options) {
    Object.entries(value).forEach(
      ([k, v]) => (value[k] = this.model.clean(v, options)),
    );
    return value;
  }

  /* -------------------------------------------- */

  override getInitialValue(data: any) {
    let keys = this.initialKeys;
    const initial = super.getInitialValue(data);
    if (!keys || !foundry.utils.isEmpty(initial)) return initial;
    if (!(keys instanceof Array)) keys = Object.keys(keys);
    for (const key of keys) initial[key] = this._getInitialValueForKey(key);
    return initial;
  }

  /* -------------------------------------------- */

  /**
   * Get the initial value for the provided key.
   * @param {string} key       Key within the object being built.
   * @param {object} [object]  Any existing mapping data.
   * @returns {*}              Initial value based on provided field type.
   */
  protected _getInitialValueForKey(key: string, object?: unknown) {
    const initial = this.model.getInitialValue();
    return this.initialValue?.(key, initial, object) ?? initial;
  }

  /* -------------------------------------------- */

  protected override _validateType(value: any, options = {}) {
    if (foundry.utils.getType(value) !== 'Object')
      throw new Error('must be an Object');
    const errors = this._validateValues(value, options);
    if (!foundry.utils.isEmpty(errors)) {
      const depth = this.fieldPath.split('.').length + 1;
      const indent = '\n' + ' '.repeat(depth * 2);
      let msg = '';
      for (const [key, err] of Object.entries(errors)) {
        const name =
          !!value[key].name || !!value[key].label
            ? `${key} (${value[key].name || value[key].label})`
            : key;
        const errString = err.toString().replaceAll('\n', indent);
        msg += indent + name + ': ' + errString;
      }
      throw new foundry.data.validation.DataModelValidationError(msg);
    }
  }

  /* -------------------------------------------- */

  /**
   * Validate each value of the object.
   * @param {object} value     The object to validate.
   * @param {object} options   Validation options.
   * @returns {Object<Error>}  An object of value-specific errors by key.
   */
  protected _validateValues(value: object, options: object) {
    const errors: Record<string, ModelValidationError> = {};
    for (const [k, v] of Object.entries(value)) {
      const error = this.model.validate(v, options);
      if (error) errors[k] = error;
    }
    return errors;
  }

  /* -------------------------------------------- */

  override initialize(value, model, options = {}) {
    if (!value) return value;
    const obj = {};
    const initialKeys =
      this.initialKeys instanceof Array
        ? this.initialKeys
        : Object.keys(this.initialKeys ?? {});
    const keys = this.initialKeysOnly ? initialKeys : Object.keys(value);
    for (const key of keys) {
      const data = value[key] ?? this._getInitialValueForKey(key, value);
      obj[key] = this.model.initialize(data, model, options);
    }
    return obj;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  _getField(path) {
    if (path.length === 0) return this;
    else if (path.length === 1) return this.model;
    path.shift();
    return this.model._getField(path);
  }
}

export class AddStatsValueField extends foundry.data.fields.DataField {
  protected _cast(value: string | number | boolean) {
    return value;
  }

  protected override _validateType(
    value: any,
    _options: DataField.ValidationOptions<DataField.Any> = {},
  ): boolean | void {
    const validTypes = ['string', 'number', 'boolean'];
    if (!!value && !validTypes.includes(foundry.utils.getType(value))) {
      throw new Error('must be text, a number, or a boolean');
    }
  }
}
