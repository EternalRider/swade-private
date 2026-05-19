import { constants } from '../../constants';
import SwadeActiveEffect from '../../documents/active-effect/SwadeActiveEffect';

function baseEffectSchema() {
  const fields = foundry.data.fields;

  return {
    ...foundry.data.ActiveEffectTypeDataModel.defineSchema(),
    removeEffect: new fields.BooleanField({ label: 'SWADE.RemoveEffectLabel' }),
    loseTurnOnHold: new fields.BooleanField({
      label: 'SWADE.Expiration.LooseTurnOnHold',
    }),
    favorite: new fields.BooleanField({ label: 'SWADE.Favorite' }),
    conditionalEffect: new fields.BooleanField({
      label: 'SWADE.ActiveEffects.Conditional',
    }),
  };
}

declare namespace BaseEffectData {
  type Schema = ReturnType<typeof baseEffectSchema>;
}

class BaseEffectData extends foundry.data.ActiveEffectTypeDataModel<BaseEffectData.Schema, SwadeActiveEffect<'modifier'>> {
  static override defineSchema(): BaseEffectData.Schema {
    return baseEffectSchema();
  }

  static override migrateData(data: any) {
    super.migrateData(data);
    if ('changes' in data) {
      for (const change of data.changes) {
        const match = change.key.match(SwadeActiveEffect.ITEM_REGEXP);
        if (match) {
          const newKey = match[3].trim().replace(/^data\./, 'system.');
          change.key = `@${match[1].trim()}{${match[2].trim()}}[${newKey}]`;
        }

        //fix up effects that had an action related key
        change.key = change.key.replaceAll('system.actions.skillMod', 'system.actions.traitMod');
        change.key = change.key.replaceAll('system.actions.skill', 'system.actions.trait');
        change.key = change.key.replaceAll('system.stats.speed.value', 'system.pace');
        change.key = change.key.replaceAll('system.stats.speed.adjusted', 'system.pace');
        change.key = change.key.replaceAll('system.stats.speed.runningDie', 'system.pace.running.die');
        change.key = change.key.replaceAll('system.stats.speed.runningMod', 'system.pace.running.mod');
        change.key = change.key.replaceAll('flags.swade.auras', 'system.auras');
      }
    }

    return data;
  }
}

export { BaseEffectData };
