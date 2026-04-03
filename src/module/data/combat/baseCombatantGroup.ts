import type { EmptyObject } from 'fvtt-types/utils';

function baseCombatantGroupSchema() {
  const fields = foundry.data.fields;
  return {
    leader: new fields.DocumentIdField({ readonly: false }),
    suitValue: new fields.NumberField(),
    cardValue: new fields.NumberField(),
    cardString: new fields.StringField(),
    hasJoker: new fields.BooleanField(),
    roundHeld: new fields.NumberField(),
    turnLost: new fields.BooleanField(),
    firstRound: new fields.NumberField(),
    lastInitiative: new fields.NumberField(),
  };
}

declare namespace BaseCombatantGroupModel {
  interface Schema extends ReturnType<typeof baseCombatantGroupSchema> {}
  interface BaseData extends EmptyObject {}
  interface DerivedData extends EmptyObject {}
}

class BaseCombatantGroupModel<
  Schema extends BaseCombatantGroupModel.Schema = BaseCombatantGroupModel.Schema,
  BaseData extends BaseCombatantGroupModel.BaseData = BaseCombatantGroupModel.BaseData,
  DerivedData extends BaseCombatantGroupModel.DerivedData = BaseCombatantGroupModel.DerivedData,
> extends foundry.abstract.TypeDataModel<Schema, foundry.abstract.Document.Any, BaseData, DerivedData> {
  static override defineSchema() {
    return baseCombatantGroupSchema();
  }

  /**
   * @returns The leader as a combatant, or first member, else undefined.
   */
  get leaderCombatant() {
    if (this.leader) {
      const c = this.parent.members.find((c) => c.id === this.leader);
      if (c) return c;
    }
    return this.parent.members.first();
  }
}

export { BaseCombatantGroupModel };
