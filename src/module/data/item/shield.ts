import { PotentialSource } from '../../../globals';
import {
  actions,
  arcaneDevice,
  bonusDamage,
  category,
  equippable,
  favorite,
  grantEmbedded,
  itemDescription,
  physicalItem,
} from './common';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { constants } from '../../constants';
import { ItemChatCardChip } from '../../documents/item/SwadeItem.interface';

export interface ShieldData
  extends foundry.data.fields.SchemaField.InnerInitializedType<
    ReturnType<(typeof ShieldData)['defineSchema']>
  > {}

export class ShieldData extends foundry.abstract.TypeDataModel<
  foundry.data.fields.SchemaField<
    ReturnType<(typeof ShieldData)['defineSchema']>
  >,
  Item
> {
  /** @inheritdoc */
  static override defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...itemDescription(),
      ...physicalItem(),
      ...equippable(),
      ...arcaneDevice(),
      ...actions(),
      ...bonusDamage(),
      ...favorite(),
      ...category(),
      ...grantEmbedded(),
      minStr: new fields.StringField({ initial: '' }),
      parry: new fields.NumberField({ initial: 0, integer: true }),
      cover: new fields.NumberField({ initial: 0, integer: true }),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<ShieldData>) {
    quarantine.ensurePricesAreNumeric(source);
    quarantine.ensureWeightsAreNumeric(source);
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

  get canBeArcaneDevice() {
    return true;
  }

  get isReadied(): boolean {
    return Number(this.equipStatus) > constants.EQUIP_STATE.CARRIED;
  }

  get isPhysicalItem() {
    return true;
  }

  async getChatChips(
    enrichOptions: Partial<TextEditor.EnrichOptions>,
  ): Promise<ItemChatCardChip[]> {
    const chips = new Array<ItemChatCardChip>();
    if (this.isReadied) {
      chips.push({
        icon: '<i class="fas fa-tshirt"></i>',
        title: game.i18n.localize('SWADE.Equipped'),
      });
    } else {
      chips.push({
        icon: '<i class="fas fa-tshirt" style="color:grey"></i>',
        title: game.i18n.localize('SWADE.Unequipped'),
      });
    }
    chips.push(
      {
        icon: '<i class="fas fa-user-shield"></i>',
        text: this.parry,
        title: game.i18n.localize('SWADE.Parry'),
      },
      {
        icon: '<i class="fas fas fa-umbrella"></i>',
        text: this.cover,
        title: game.i18n.localize('SWADE.Cover._name'),
      },
      {
        icon: '<i class="fas fa-dumbbell"></i>',
        text: this.minStr,
      },
      {
        icon: '<i class="fas fa-sticky-note"></i>',
        text: await TextEditor.enrichHTML(this.notes ?? '', enrichOptions),
        title: game.i18n.localize('SWADE.Notes'),
      },
    );
    return chips;
  }
}
