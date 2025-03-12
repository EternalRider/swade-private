import { SimpleMerge } from 'fvtt-types/utils';

/** A function that resolves into the fetched document or the source UUID as a string */
export type DocumentFn<
  T extends foundry.abstract.Document.Any = foundry.abstract.Document.Any,
> = () => T | string;

declare namespace ForeignDocumentUUIDField {
  type Options = foundry.data.fields.DocumentUUIDField.Options;
  type DefaultOptions = SimpleMerge<
    foundry.data.fields.DocumentUUIDField.DefaultOptions,
    {
      nullable: true;
      readonly: false;
      idOnly: false;
    }
  >;
}

export class ForeignDocumentUUIDField<
  const Options extends
    ForeignDocumentUUIDField.Options = ForeignDocumentUUIDField.DefaultOptions,
  const AssignmentType = foundry.data.fields.StringField.AssignmentType<Options>,
  const InitializedType =
    | foundry.data.fields.StringField.InitializedType<Options>
    | foundry.abstract.Document.Any,
  const PersistedType extends
    | string
    | null
    | undefined = foundry.data.fields.StringField.InitializedType<Options>,
> extends foundry.data.fields.DocumentUUIDField<
  Options,
  AssignmentType,
  InitializedType,
  PersistedType
> {
  declare type: foundry.abstract.Document.Type;
  declare idOnly: boolean;

  static override get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      nullable: true,
      readonly: false,
      idOnly: false,
    });
  }

  override initialize(value: PersistedType, _model, _options = {}) {
    if (this.idOnly) return () => value;
    const typeClass = getDocumentClass<this['type']>(this.type);
    return () => {
      try {
        const doc = fromUuidSync(value);
        if (doc instanceof typeClass)
          return doc as foundry.abstract.Document.ConfiguredClassForName<
            this['type']
          >;
        return value;
      } catch (error) {
        console.error(error);
        return value ?? null;
      }
    };
  }

  override toObject(value): PersistedType {
    return value?.uuid ?? value;
  }

  override _toInput(config) {
    if (!config.options) {
      // Prepare array of visible options
      const collection = game.scenes.viewed?.tokens;
      const options: foundry.applications.fields.FormSelectOption[] = (
        collection ?? []
      ).reduce((arr, doc: TokenDocument.Implementation) => {
        if (!doc.visible || !doc.actor) return arr;
        arr.push({ value: doc.actor.uuid, label: doc.name });
        return arr;
      }, []);
      Object.assign(config, { options });
    }

    // Allow blank
    if (!this.required || this.nullable) config.blank ??= '';

    // Create select input
    return foundry.applications.fields.createSelectInput(config);
  }
}
