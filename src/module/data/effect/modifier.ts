import { DeepPartial } from 'fvtt-types/utils';
import type SwadeActiveEffect from '../../documents/active-effect/SwadeActiveEffect';

/**
 * @returns Schema definition for ModifierData
 */
function modifierSchema() {
  return {
    cost: new foundry.data.fields.NumberField({
      initial: null,
      integer: true,
      label: 'SWADE.ActiveEffects.ModifierCost.Label',
      hint: 'SWADE.ActiveEffects.ModifierCost.Hint',
    }),
    // Null means unlimited. Nonlinear options should be implemented as separate choices.
    limit: new foundry.data.fields.NumberField({
      initial: 1,
      integer: true,
      min: 1,
      label: 'SWADE.ActiveEffects.ModifierLimit.Label',
      hint: 'SWADE.ActiveEffects.ModifierLimit.Hint',
    }),
  };
}

declare namespace ModifierData {
  type Schema = ReturnType<typeof modifierSchema>;
}

/**
 * A data model to represent effects that modify the items they are contained on
 */
class ModifierData extends foundry.abstract.TypeDataModel<
  ModifierData.Schema,
  SwadeActiveEffect<'modifier'>
> {
  static override defineSchema() {
    return modifierSchema();
  }

  protected override async _preCreate(
    data: foundry.abstract.TypeDataModel.ParentAssignmentType<
      ModifierData.Schema,
      ActiveEffect<'modifier'>
    >,
    options: ActiveEffect.Database.PreCreateOptions,
    user: User.Implementation,
  ) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    if (this.parent instanceof Actor) return false;
    if (data.transfer) {
      console.warn('All Modifiers must be non-transferred');
    }
    data.transfer = false;
    this.parent.updateSource({ transfer: false });
  }

  protected override async _preUpdate(
    changed: DeepPartial<
      foundry.abstract.TypeDataModel.ParentAssignmentType<
        ModifierData.Schema,
        ActiveEffect<'modifier'>
      >
    >,
    options: ActiveEffect.Database.PreUpdateOptions,
    user: User.Implementation,
  ) {
    const allowed = await super._preUpdate(changed, options, user);
    if (allowed === false) return false;
    if (changed.transfer) {
      delete changed.transfer;
      console.warn('All Modifiers must be non-transferred');
    }
  }
}

export { ModifierData };
