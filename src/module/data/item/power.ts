import { PotentialSource } from '../../../globals';
import {
  actions,
  bonusDamage,
  favorite,
  itemDescription,
  templates,
} from './common';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import {
  ItemChatCardChip,
  ItemDisplayPowerPoints,
} from '../../documents/item/SwadeItem.interface';

export interface PowerData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof PowerData)['defineSchema']>
  > {}

export class PowerData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof PowerData)['defineSchema']>
  >
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...actions(),
      ...bonusDamage(),
      ...favorite(),
      ...templates(),
      rank: new fields.StringField({ initial: '', textSearch: true }),
      pp: new fields.NumberField({ initial: 0 }),
      damage: new fields.StringField({ initial: '' }),
      range: new fields.StringField({ initial: '' }),
      duration: new fields.StringField({ initial: '' }),
      trapping: new fields.StringField({ initial: '', textSearch: true }),
      arcane: new fields.StringField({ initial: '', textSearch: true }),
      ap: new fields.NumberField({ initial: 0 }),
      innate: new fields.BooleanField(),
      modifiers: new fields.ArrayField(new fields.ObjectField()),
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
      {
        text: this.rank,
      },
      { text: this.arcane },
      {
        text: this.pp + game.i18n.localize('SWADE.PPAbbreviation'),
      },
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
      {
        text: this.trapping,
      },
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
