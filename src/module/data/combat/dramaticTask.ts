import type { RollModifier } from '../../../interfaces/additional.interface';
import type SwadeActor from '../../documents/actor/SwadeActor';
import { BaseCombat } from './baseCombat';

function dramaticTaskSchema() {
  const fields = foundry.data.fields;
  return {
    ...BaseCombat.defineSchema(),
    tokens: new fields.SchemaField({
      value: new fields.NumberField({
        min: 0,
        initial: 0,
        nullable: false,
        integer: true,
      }),
      max: new fields.NumberField({
        min: 1,
        initial: 6,
        nullable: false,
        integer: true,
      }),
    }),
    maxRounds: new fields.NumberField({
      min: 1,
      initial: 4,
      nullable: false,
      integer: true,
      label: 'SWADE.DramaticTask.MaxRounds.Label',
      hint: 'SWADE.DramaticTask.MaxRounds.Hint',
    }),
  };
}

export class DramaticTask extends BaseCombat<ReturnType<typeof dramaticTaskSchema>> {
  static override defineSchema(): {} {
    return dramaticTaskSchema();
  }

  override rollModifiers(actor: SwadeActor): RollModifier[] {
    const combatant = this.parent.getCombatantsByActor(actor)[0];
    const mods = super.rollModifiers(actor);

    if (combatant?.suitValue === 1) {
      mods.push({
        label: game.i18n.localize('SWADE.Complication'),
        value: -2,
      });
    }
    return mods;
  }
}
