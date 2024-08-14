import { ClientDocument } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/abstract/client-document.mjs';
import { DocumentType } from '@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes.mjs';

// eslint-disable-next-line @typescript-eslint/naming-convention
const { DocumentUUIDField } = foundry.data.fields;

/** A function that resolves into the fetched document or the source UUID as a string */
export type DocumentFn<T extends ClientDocument = ClientDocument> = () =>
  | T
  | string;

export class ForeignDocumentUUIDField extends DocumentUUIDField {
  declare type: DocumentType;
  declare idOnly: boolean;
  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      nullable: true,
      readonly: false,
      idOnly: false,
    });
  }

  /** @inheritdoc */
  initialize(value: string, _model, _options = {}): DocumentFn {
    if (this.idOnly) return () => value;
    const typeClass = getDocumentClass<DocumentType>(this.type);
    return () => {
      try {
        const doc = fromUuidSync(value);
        if (doc instanceof typeClass)
          return doc as CONFIG[DocumentType]['documentClass'];
        return value;
      } catch (error) {
        console.error(error);
        return value;
      }
    };
  }

  toObject(value): string {
    return value.uuid ?? value;
  }

  override _toInput(config) {
    // Prepare array of visible options
    const collection = game.scenes.viewed.tokens;
    const options: { value: string; label: string }[] = collection.reduce(
      (arr, doc: TokenDocument) => {
        if (!doc.visible) return arr;
        arr.push({ value: doc.id, label: doc.name });
        return arr;
      },
      [],
    );
    Object.assign(config, { options });

    // Allow blank
    if (!this.required || this.nullable) config.blank = '';

    // Create select input
    return foundry.applications.fields.createSelectInput(config);
  }
}
