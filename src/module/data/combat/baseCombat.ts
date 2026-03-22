import type { EmptyObject } from 'fvtt-types/utils';
import type SwadeCombat from '../../documents/combat/SwadeCombat';
import type SwadeActor from '../../documents/actor/SwadeActor';
import type { RollModifier } from '../../../interfaces/additional.interface';

function baseCombatSchema() {
  return {};
}

export declare namespace BaseCombat {
  interface Schema extends ReturnType<typeof baseCombatSchema> {}
  interface BaseData extends EmptyObject {}
  interface DerivedData extends EmptyObject {}
}

export class BaseCombat<
  Schema extends BaseCombat.Schema = BaseCombat.Schema,
  BaseData extends BaseCombat.BaseData = BaseCombat.BaseData,
  DerivedData extends BaseCombat.DerivedData = BaseCombat.DerivedData,
> extends foundry.abstract.TypeDataModel<Schema, SwadeCombat, BaseData, DerivedData> {
  static override defineSchema() {
    return baseCombatSchema();
  }

  /**
   * Determine roll modifiers for an actor based on the current combat type, e.g. Jokers or Complications for clubs
   * @param actor The actor making a roll
   * @returns An array of roll modifiers to push/concat
   */
  rollModifiers(actor: SwadeActor): RollModifier[] {
    const combatant = this.parent.getCombatantsByActor(actor)[0];
    const mods: RollModifier[] = [];

    if (combatant?.hasJoker) {
      mods.push({
        label: game.i18n.localize('SWADE.Joker'),
        value: actor.getFlag('swade', 'jokerBonus') ?? 2,
      });
    }

    return mods;
  }
}
