import { PotentialSource } from '../../../globals';
import {
  ItemChatCardChip,
  ItemDisplayPowerPoints,
} from '../../documents/item/SwadeItem.interface';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { SwadeBaseItemData } from './base';
import { actions, bonusDamage, favorite, templates } from './common';
import {
  Actions,
  BonusDamage,
  Favorite,
  Templates,
} from './item-common.interface';

declare namespace PowerData {
  interface Schema
    extends SwadeBaseItemData.Schema,
      Actions,
      BonusDamage,
      Favorite,
      Templates {
    rank: foundry.data.fields.StringField<{ initial: ''; textSearch: true }>;
    pp: foundry.data.fields.NumberField<{ initial: 0 }>;
    damage: foundry.data.fields.StringField<{ initial: '' }>;
    range: foundry.data.fields.StringField<{ initial: '' }>;
    duration: foundry.data.fields.StringField<{ initial: '' }>;
    trapping: foundry.data.fields.StringField<{
      initial: '';
      textSearch: true;
    }>;
    arcane: foundry.data.fields.StringField<{ initial: ''; textSearch: true }>;
    ap: foundry.data.fields.NumberField<{ initial: 0 }>;
    innate: foundry.data.fields.BooleanField;
    modifiers: foundry.data.fields.ArrayField<foundry.data.fields.ObjectField>;
  }
  interface BaseData extends SwadeBaseItemData.BaseData {}
  interface DerivedData extends SwadeBaseItemData.DerivedData {}
}

class PowerData extends SwadeBaseItemData<
  PowerData.Schema,
  PowerData.BaseData,
  PowerData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): PowerData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...actions(),
      ...bonusDamage(),
      ...favorite(),
      ...templates(),
      rank: new fields.StringField({ initial: '', textSearch: true, label: 'SWADE.Rank' }),
      pp: new fields.NumberField({ initial: 0, label: 'SWADE.PP' }),
      damage: new fields.StringField({ initial: '', label: 'SWADE.Dmg' }),
      range: new fields.StringField({ initial: '', label: 'SWADE.Range._name' }),
      duration: new fields.StringField({ initial: '', label: 'SWADE.Dur' }),
      trapping: new fields.StringField({ initial: '', textSearch: true, label: 'SWADE.Trap' }),
      arcane: new fields.StringField({ initial: '', textSearch: true,  label: 'SWADE.Arcane' }),
      ap: new fields.NumberField({ initial: 0, label: 'SWADE.AP' }),
      innate: new fields.BooleanField({ label: 'SWADE.InnatePower' }),
      modifiers: new fields.ArrayField(new fields.ObjectField(), { label: 'SWADE.Modifiers' }),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<PowerData>) {
    quarantine.ensurePowerPointsAreNumeric(source);
    migrations.renameActionProperties(source);
    return super.migrateData(source);
  }

  /** @inheritdoc */
  protected override _initialize(options?: any) {
    super._initialize(options);
    this._applyShims();
  }

  protected _applyShims() {
    shims.actionProperties(this);
  }

  // Called by SwadeItem.powerPoints
  get _powerPoints(): ItemDisplayPowerPoints {
    const actor = this.parent.actor!;
    const arcane = this.arcane || 'general';
    const value = foundry.utils.getProperty(
      actor,
      `system.powerPoints.${arcane}.value`,
    );
    const max = foundry.utils.getProperty(
      actor,
      `system.powerPoints.${arcane}.max`,
    );
    return { value, max };
  }

  async getChatChips(): Promise<ItemChatCardChip[]> {
    return [
      { text: this.rank },
      { text: this.arcane },
      { text: this.pp + game.i18n.localize('SWADE.PPAbbreviation') },
      {
        icon: '<i class="fas fa-ruler"></i>',
        text: this.range,
        title: game.i18n.localize('SWADE.Range._name'),
      },
      {
        icon: '<i class="fas fa-shield-alt"></i>',
        text: this.ap,
        title: game.i18n.localize('SWADE.Ap'),
      },
      {
        icon: '<i class="fas fa-hourglass-half"></i>',
        text: this.duration,
        title: game.i18n.localize('SWADE.Dur'),
      },
      { text: this.trapping },
    ];
  }

  _canExpendResources(resourcesUsed = 1): boolean {
    if (!this.parent.actor) return false;
    if (game.settings.get('swade', 'noPowerPoints')) return true;
    const arcane = this.arcane || 'general';
    const ab = this.parent.actor.system.powerPoints[arcane];
    return ab.value >= resourcesUsed;
  }
}

export { PowerData };
