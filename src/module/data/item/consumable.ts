import { DeepPartial } from 'fvtt-types/utils';
import { EquipState, PotentialSource, Updates } from '../../../globals';
import { Logger } from '../../Logger';
import { constants } from '../../constants';
import { UsageUpdates } from '../../documents/item/SwadeItem.interface';
import { createEmbedElement } from '../../util';
import * as migrations from './_migration';
import * as quarantine from './_quarantine';
import * as shims from './_shims';
import { SwadePhysicalItemData } from './base';
import {
  actions,
  activities,
  category,
  equippable,
  favorite,
  grantEmbedded,
} from './common';
import {
  Actions,
  Activities,
  Category,
  ChoicesType,
  Equippable,
  Favorite,
  GrantEmbedded,
} from './item-common.interface';
import { DefaultHasChargesData } from '../fields/ChargesData';

declare namespace ConsumableData {
  interface Schema
    extends SwadePhysicalItemData.Schema,
      Equippable,
      Favorite,
      Category,
      Actions,
      Activities,
      GrantEmbedded {
    messageOnUse: foundry.data.fields.BooleanField<{ initial: true }>;
    destroyOnEmpty: foundry.data.fields.BooleanField<{ label: string }>;
    subtype: foundry.data.fields.StringField<{
      initial: typeof constants.CONSUMABLE_TYPE.REGULAR;
      choices: ChoicesType<typeof constants.CONSUMABLE_TYPE>;
      textSearch: true;
    }>;
    charges: foundry.data.fields.EmbeddedDataField<typeof DefaultHasChargesData>;
  }
  interface BaseData extends SwadePhysicalItemData.BaseData {}
  interface DerivedData extends SwadePhysicalItemData.DerivedData {}
}

class ConsumableData extends SwadePhysicalItemData<
  ConsumableData.Schema,
  ConsumableData.BaseData,
  ConsumableData.DerivedData
> {
  /** @inheritdoc */
  static override defineSchema(): ConsumableData.Schema {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      ...equippable(),
      ...favorite(),
      ...category(),
      ...actions(),
      ...activities(),
      ...grantEmbedded(),
      messageOnUse: new fields.BooleanField({
        initial: true,
        label: 'SWADE.MessageOnUse.Label',
      }),
      destroyOnEmpty: new fields.BooleanField({
        label: 'SWADE.DestroyOnEmpty',
      }),
      subtype: new fields.StringField({
        initial: constants.CONSUMABLE_TYPE.REGULAR,
        choices: Object.values(constants.CONSUMABLE_TYPE),
        textSearch: true,
        label: 'SWADE.Subtype',
      }),
      charges: new fields.EmbeddedDataField(DefaultHasChargesData),
    };
  }

  /** @inheritdoc */
  static override migrateData(source: PotentialSource<ConsumableData>) {
    quarantine.ensurePricesAreNumeric(source);
    quarantine.ensureWeightsAreNumeric(source);
    migrations.renameActionProperties(source);
    migrations.convertCharges(source);
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

  /** Used by SwadeItem.#postConsumptionCleanup */
  get _shouldDelete(): boolean {
    return this.destroyOnEmpty && this.quantity === 0 && this.parent.isOwned;
  }

  /** Used by SwadeItem.setEquipState */
  _rejectEquipState(state: EquipState): boolean {
    return state > constants.EQUIP_STATE.CARRIED;
  }

  /** Used by SwadeItem.consume */
  _getUsageUpdates(chargesToUse: number): UsageUpdates | false {
    const actorUpdates: Updates = {};
    const itemUpdates: Updates = {};
    const resourceUpdates = new Array<Updates>();

    //gather variables
    const charge = this.charges.default;
    const currentCharges = charge.value;
    const maxCharges = charge.max;
    const quantity = Number(this.quantity);
    const maxChargesOnStack = (quantity - 1) * maxCharges + currentCharges;

    //abort early if too much is being used
    if (chargesToUse > maxChargesOnStack) {
      ui.notifications.warn('SWADE.Consumable.NotEnoughCharges', {
        localize: true,
      });
      return false;
    }

    const totalRemainingCharges = maxChargesOnStack - chargesToUse;
    const newQuantity = Math.ceil(totalRemainingCharges / maxCharges);
    let newCharges = totalRemainingCharges % maxCharges;

    if (newCharges === 0 && newQuantity < quantity && newQuantity !== 0) {
      newCharges = maxCharges;
    }

    //write updates
    itemUpdates['system.quantity'] = Math.max(0, newQuantity);
    itemUpdates[`system.charges.charges.${charge.id}.value`] = newCharges;

    return { actorUpdates, itemUpdates, resourceUpdates };
  }

  protected override async _preUpdate(
    changed: DeepPartial<
      foundry.abstract.TypeDataModel.ParentAssignmentType<
        ConsumableData.Schema,
        Item<'consumable'>
      >
    >,
    options: Item.Database.PreUpdateOptions,
    user: User.Implementation,
  ) {
    await super._preUpdate(changed, options, user);
    const defaultCharge = this.charges.default;
    if (
      foundry.utils.hasProperty(changed, 'system.quantity') &&
      this.subtype !== constants.CONSUMABLE_TYPE.REGULAR &&
      defaultCharge.value !== 0 &&
      defaultCharge.value !== defaultCharge.max
    ) {
      if (
        (changed.system?.quantity ?? 0) > 1 &&
        defaultCharge.value! < defaultCharge.max!
      ) {
        delete changed.system!.quantity;
        Logger.warn(
          'Partially filled magazines can only have a quantity of 1',
          { toast: true },
        );
      }
    }
    if (
      foundry.utils.hasProperty(changed, `system.charges.charges.${defaultCharge.id}.max`) &&
      this.subtype === constants.CONSUMABLE_TYPE.BATTERY
    ) {
      foundry.utils.setProperty(changed, `system.charges.charges.${defaultCharge.id}.max`, 100);
    }
    if (
      foundry.utils.getProperty(changed, 'system.subtype') ===
      constants.CONSUMABLE_TYPE.BATTERY
    ) {
      foundry.utils.setProperty(changed, `system.charges.charges.${defaultCharge.id}.max`, 100);
    }
  }

  declare enrichedDescription?: string;

  override async toEmbed(
    config: TextEditor.DocumentHTMLEmbedConfig,
    options: TextEditor.EnrichmentOptions,
  ): Promise<HTMLElement | HTMLCollection | null> {
    config.caption = false;
    this.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.description, {
      ...options,
    });
    return await createEmbedElement(
      this,
      'systems/swade/templates/embeds/consumable-embeds.hbs',
      ['item-embed', 'consumable'],
    );
  }
}

export { ConsumableData };
