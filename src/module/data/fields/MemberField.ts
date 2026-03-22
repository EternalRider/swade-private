import { ForeignDocumentUUIDField } from './ForeignDocumentUUIDField';

type DataSchema = foundry.data.fields.DataSchema;

export interface MemberSchema extends DataSchema {
  uuid: ForeignDocumentUUIDField<{ type: 'Actor' }>;
}

function makeBaseMemberSchema(): MemberSchema {
  return {
    uuid: new ForeignDocumentUUIDField({
      type: 'Actor',
      required: true,
      nullable: false,
      validate: (value: any, _options: foundry.data.fields.DataField.ValidationOptions) => {
        if (value.startsWith('Compendium')) {
          return new foundry.data.validation.DataModelValidationFailure({
            unresolved: true,
            invalidValue: value,
            message: 'Cannot contain an actor from a Compendium!',
          });
        }
      },
    }),
  };
}

export class MemberField<
  Schema extends MemberSchema = MemberSchema,
  Options extends foundry.data.fields.SchemaField.Options<Schema> = foundry.data.fields.SchemaField.DefaultOptions,
> extends foundry.data.fields.SchemaField<Schema, Options> {
  constructor(schema: foundry.data.fields.DataSchema, options?: Options) {
    super({ ...schema, ...makeBaseMemberSchema() } as Schema, options);
  }
}
