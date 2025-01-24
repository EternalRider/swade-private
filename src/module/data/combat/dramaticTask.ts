import type SwadeActor from '../../documents/actor/SwadeActor';
import { BaseCombat } from './baseCombat';
import type { RollModifier } from '../../../interfaces/additional.interface';

function dtSchema() {
  const fields = foundry.data.fields;
  return {
    tokens: new fields.SchemaField({
      value: new fields.NumberField(),
      max: new fields.NumberField(),
    }),
    maxTurns: new fields.NumberField(),
  };
}

export class DramaticTask extends BaseCombat<ReturnType<typeof dtSchema>> {
  static override defineSchema(): {} {
    return dtSchema();
  }

  override rollModifiers(actor: SwadeActor): RollModifier[] {
    const combatant = this.parent.getCombatantsByActor(actor)[0];
    const mods = super.rollModifiers(actor);

    if (combatant.suitValue === 1) {
      mods.push({
        label: game.i18n.localize('SWADE.Complication'),
        value: -2,
      });
    }
    return mods;
  }
}
