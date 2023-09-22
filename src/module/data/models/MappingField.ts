import {
  DataField,
  ModelValidationError,
  ObjectField,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/fields.mjs';

/**
 * A subclass of ObjectField that represents a mapping of keys to the provided DataField type.
 * @param model The class of DataField which should be embedded in this field.
 * @param options Options which configure the behavior of the field.
 */
export class MappingField extends foundry.data.fields.ObjectField {
  /**The embedded DataField definition which is contained in this field.*/
  declare model: DataField.Any;
  /** Keys that will be created if no data is provided. */
  declare initialKeys?: string[];
  /** Function to calculate the initial value for a key. */
  declare initialKeysOnly?: boolean;
  /**  Should the keys in the initialized data be limited to the keys provided by `initialKeys`? */
  declare initialValue?: MappingFieldInitialValueBuilder;

  constructor(model: DataField.Any, options: MappingFieldOptions = {}) {
    if (!(model instanceof foundry.data.fields.DataField)) {
      throw new Error(
        'MappingField must have a DataField as its contained element',
      );
    }
    super(options as ObjectField.DefaultOptions);
    this.model = model;
  }

  static override get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      initialKeys: null,
      initialValue: null,
      initialKeysOnly: false,
    });
  }

  protected override _cleanType(value, options) {
    Object.entries(value).forEach(
      ([k, v]) => (value[k] = this.model.clean(v, options)),
    );
    return value;
  }

  override getInitialValue(data: any) {
    let keys = this.initialKeys;
    const initial = super.getInitialValue(data);
    if (!keys || !foundry.utils.isEmpty(initial)) return initial;
    if (!(keys instanceof Array)) keys = Object.keys(keys);
    for (const key of keys) initial[key] = this._getInitialValueForKey(key);
    return initial;
  }

  /**
   * Get the initial value for the provided key.
   * @param key Key within the object being built.
   * @param object  Any existing mapping data.
   * @returns Initial value based on provided field type.
   */
  protected _getInitialValueForKey(key: string, object?: Record<string, any>) {
    const initial = this.model.getInitialValue();
    return this.initialValue?.(key, initial, object) ?? initial;
  }

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

  /**
   * Validate each value of the object.
   * @param value The object to validate.
   * @param options Validation options.
   * @returns An object of value-specific errors by key.
   */
  protected _validateValues(value: object, options: object) {
    const errors: Record<string, ModelValidationError> = {};
    for (const [k, v] of Object.entries(value)) {
      const error = this.model.validate(v, options);
      if (error) errors[k] = error;
    }
    return errors;
  }

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

  /** @inheritdoc */
  _getField(path) {
    if (path.length === 0) return this;
    else if (path.length === 1) return this.model;
    path.shift();
    return this.model._getField(path);
  }
}

/**
 * @param key The key within the object where this new value is being generated.
 * @param initial The generic initial data provided by the contained model.
 * @param existing Any existing mapping data.
 * @returns Value to use as default for this key.
 */
export type MappingFieldInitialValueBuilder = (
  key: string,
  initial: any,
  existing?: Record<string, any>,
) => any;

export interface MappingFieldOptions extends Partial<DataFieldOptions<object>> {
  /** Keys that will be created if no data is provided. */
  initialKeys?: string[];
  /** Function to calculate the initial value for a key. */
  initialValue?: MappingFieldInitialValueBuilder;
  /**  Should the keys in the initialized data be limited to the keys provided by `initialKeys`? */
  initialKeysOnly?: boolean;
}
