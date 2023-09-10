import { AdditionalStats } from '../../globals';
import { AdditionalStat } from '../../interfaces/additional.interface';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';

export default class SwadeDocumentTweaks extends FormApplication<
  FormApplicationOptions,
  SwadeActor | SwadeItem
> {
  constructor(
    doc: SwadeActor | SwadeItem,
    options: Partial<FormApplicationOptions> = {},
  ) {
    super(doc, options);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 380,
      classes: ['swade', 'doc-tweaks', 'swade-app'],
      template: 'systems/swade/templates/actors/apps/tweaks-dialog.hbs',
      height: 'auto' as const,
      tabs: [
        {
          group: 'primary',
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'traits',
        },
      ],
    });
  }

  /* -------------------------------------------- */

  /** Add the Document name into the window title*/
  override get title() {
    return `${this.object.name}: ${game.i18n.localize('SWADE.Tweaks')}`;
  }

  /* -------------------------------------------- */

  /**@inheritdoc */
  override async getData(options?: ApplicationOptions) {
    const settingFields = this._getPrototypeSettingFields();

    for (const key in settingFields) {
      if (this.object.system.additionalStats[key]) {
        settingFields[key].useField = true;
      }
    }
    const data = {
      doc: this.object,
      settingFields: settingFields,
      itemTabActive: this.object instanceof SwadeItem ? 'active' : '',
      isItem: this.object instanceof SwadeItem,
      isActor: this.object instanceof SwadeActor,
      isCharacter: this.object.type === 'character',
      isNPC: this.object.type === 'npc',
      isVehicle: this.object.type === 'vehicle',
      advanceTypes: this._getAdvanceTypes(),
    };

    return foundry.utils.mergeObject(data, await super.getData(options));
  }

  /** @inheritdoc */
  protected override async _updateObject(_event, formData) {
    const expandedFormData = expandObject(formData);

    //recombine the formdata
    foundry.utils.setProperty(
      expandedFormData,
      'system.additionalStats',
      this._handleAdditionalStats(expandedFormData),
    );

    // Update the actor
    await this.object.update(expandedFormData);
  }

  private _getPrototypeSettingFields() {
    const fields = game.settings.get('swade', 'settingFields');
    let settingFields: AdditionalStats = {};
    if (this.object instanceof SwadeActor) {
      settingFields = fields.actor;
    } else if (this.object instanceof SwadeItem) {
      settingFields = fields.item;
    }
    return structuredClone(settingFields);
  }

  private _handleAdditionalStats(expandedFormData) {
    const formFields = expandedFormData.system.additionalStats ?? {};
    const prototypeFields = this._getPrototypeSettingFields();
    const newFields = structuredClone<AdditionalStats>(
      this.object.system.additionalStats,
    );
    //handle setting specific fields
    for (const [key, field] of Object.entries<AdditionalStat>(formFields)) {
      const fieldExistsOnDoc = this.object.system.additionalStats[key];
      if (field.useField && fieldExistsOnDoc) {
        //update existing field
        newFields[key].hasMaxValue = prototypeFields[key].hasMaxValue;
        newFields[key].dtype = prototypeFields[key].dtype;
        if (newFields[key].dtype === 'Boolean') newFields[key]['-=max'] = null;
      } else if (field.useField && !fieldExistsOnDoc) {
        //add new field
        newFields[key] = prototypeFields[key];
      } else {
        //delete field
        //@ts-expect-error This is only done to delete the key
        newFields[`-=${key}`] = null;
        delete newFields[key];
      }
    }

    //handle "stray" fields that exist on the actor but have no prototype
    for (const key in this.object.system.additionalStats) {
      if (!prototypeFields[key]) {
        //@ts-expect-error This is only done to delete the key
        newFields[`-=${key}`] = null;
      }
    }
    return newFields;
  }

  protected override _getSubmitData(updateData = {}) {
    const data = super._getSubmitData(updateData);
    // Prevent submitting overridden values
    const overrides = foundry.utils.flattenObject(this.object.overrides);
    for (const k of Object.keys(overrides)) {
      delete data[k];
    }
    return data;
  }

  private _getAdvanceTypes(): Record<string, string> {
    return {
      legacy: 'SWADE.Advances.Modes.Legacy',
      expanded: 'SWADE.Advances.Modes.Expanded',
    };
  }
}
