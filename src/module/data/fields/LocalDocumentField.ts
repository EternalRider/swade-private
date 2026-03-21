import { AnyObject } from 'fvtt-types/utils';

declare namespace LocalDocumentField {
  interface Options extends foundry.data.fields.ForeignDocumentField.Options {
    types?: string[];
  }
}

class LocalDocumentField<
  DocumentType extends foundry.abstract.Document.AnyConstructor,
  Options extends LocalDocumentField.Options =
    foundry.data.fields.ForeignDocumentField.DefaultOptions,
  AssignmentType = foundry.data.fields.ForeignDocumentField.AssignmentType<
    DocumentType,
    Options
  >,
  InitializedType = foundry.data.fields.ForeignDocumentField.InitializedType<
    DocumentType,
    Options
  >,
  PersistedType extends string | null | undefined =
    foundry.data.fields.ForeignDocumentField.PersistedType<Options>,
> extends foundry.data.fields.ForeignDocumentField<
  DocumentType,
  Options,
  AssignmentType,
  InitializedType,
  PersistedType
> {
  override _cast(value: unknown) {
    if (typeof value === 'string') return value;
    if (value instanceof this.model) return value._id;
    throw new Error(
      `The value provided to a ${this.constructor.name} must be a ${this.model.name} instance.`
    );
  }
  override initialize(
    value: PersistedType,
    model: foundry.abstract.Document.Any,
    _options?: AnyObject
  ): InitializedType | (() => InitializedType | null) {
    if (this.idOnly) return value;
    if (
      model?.pack &&
      !foundry.utils.isSubclass(this.model, foundry.documents.BaseFolder)
    )
      return null;
    if (!value) return null;
    return () =>
      model.parent?.collections[this.model.collectionName].get(value);
  }

  override _toInput(
    config:
      | foundry.data.fields.DataField.ToInputConfig<InitializedType>
      | foundry.data.fields.DataField.ToInputConfigWithOptions<InitializedType> = {}
  ) {
    // Prepare array of visible options
    const collection =
      config.actor?.collections[this.model.collectionName] ?? [];
    const value =
      typeof config.value === 'string' ? config.value : config.value?.id;
    const current = collection.get(value);
    let hasCurrent = false;
    const options = collection.reduce((arr, doc) => {
      if (this.options.types?.length && !this.options.types.includes(doc.type))
        return arr;
      if (!doc.visible) return arr;
      if (doc === current) hasCurrent = true;
      arr.push({ value: doc.id, label: doc.name });
      return arr;
    }, []);
    if (current && !hasCurrent)
      options.unshift({ value: config.value, label: current.name });
    Object.assign(config, { options });

    // Allow blank
    if (!this.required || this.nullable) config.blank = '';

    // Create select input
    return foundry.applications.fields.createSelectInput(config);
  }
}

export { LocalDocumentField };
