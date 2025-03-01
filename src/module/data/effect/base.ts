import { constants } from '../../constants';
import type SwadeActiveEffect from '../../documents/active-effect/SwadeActiveEffect';

function baseEffectSchema() {
  const fields = foundry.data.fields;

  return {
    removeEffect: new fields.BooleanField({ label: 'SWADE.RemoveEffectLabel' }),
    expiration: new fields.NumberField({
      choices: foundry.utils.invertObject(constants.STATUS_EFFECT_EXPIRATION),
      nullable: true,
      label: 'SWADE.Expiration.Behavior',
    }),
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

class BaseEffectData extends foundry.abstract.TypeDataModel<
  BaseEffectData.Schema,
  SwadeActiveEffect<'base'>
> {
  static override defineSchema(): BaseEffectData.Schema {
    return baseEffectSchema();
  }
}

export { BaseEffectData };
