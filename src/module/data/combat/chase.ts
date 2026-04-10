import { BaseCombat } from './baseCombat';

function chaseSchema() {
  const fields = foundry.data.fields;
  return {
    ...BaseCombat.defineSchema(),
    maneuvering: new fields.SetField(new fields.StringField({ required: true, blank: false })),
  };
}

export class Chase extends BaseCombat<ReturnType<typeof chaseSchema>> {
  static override defineSchema(): {} {
    return chaseSchema();
  }
}
