import { AnyObject } from 'fvtt-types/utils';
import { AdditionalStats } from '../../globals';
import { AdditionalStat } from '../../interfaces/additional.interface';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { getDieSidesRange } from '../util';

class SwadeDocumentTweaks<
  Document extends SwadeActor | SwadeItem,
  RenderContext extends AnyObject,
> extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2)<
  Document,
  RenderContext
> {
  settingFields: AdditionalStats;

  constructor(options) {
    super(options);
    const settingFields = this.#getPrototypeSettingFields();
    for (const key in settingFields) {
      if (this.document.system.additionalStats[key] && this.document.system.additionalStats[key]?.dtype) {
        settingFields[key].useField = true;
      }
    }
    this.settingFields = settingFields;
  }

  static override DEFAULT_OPTIONS = {
    position: { width: 400, height: 600 },
    window: { contentClasses: ['standard-form'] },
    classes: ['swade', 'doc-tweaks', 'swade-application'],
    form: { closeOnSubmit: true },
  };

  override get id() {
    return `Swade${this.document.documentName}Tweaks-${this.document.documentName}-${this.document.id}`;
  }

  /** Add the Document name into the window title*/
  override get title() {
    return `${this.document.name}: ${game.i18n.localize('SWADE.Tweaks')}`;
  }

  override async _prepareContext(options) {
    return foundry.utils.mergeObject(await super._prepareContext(options), {
      settingFields: this.settingFields,
      hasSettingFields: !foundry.utils.isEmpty(this.settingFields),
      buttons: [{ type: 'submit', icon: 'fa-solid fa-save', label: 'Save Changes' }],
    });
  }

  protected override _processFormData(_event, _form, formData) {
    const expandedFormData = foundry.utils.expandObject(formData.object);

    //recombine the formdata
    foundry.utils.setProperty(
      expandedFormData,
      'system.additionalStats',
      this.#handleAdditionalStats(expandedFormData)
    );

    return expandedFormData;
  }

  #getPrototypeSettingFields() {
    const fields = game.settings.get('swade', 'settingFields');
    let settingFields: AdditionalStats = {};
    if (this.document instanceof SwadeActor) {
      settingFields = fields.actor;
    } else if (this.document instanceof SwadeItem) {
      settingFields = fields.item;
    }
    return structuredClone(settingFields);
  }

  #handleAdditionalStats(expandedFormData) {
    const formFields = expandedFormData.system.additionalStats ?? {};
    const prototypeFields = this.#getPrototypeSettingFields();
    const newFields = structuredClone<AdditionalStats>(this.document.system.additionalStats);
    //handle setting specific fields
    for (const [key, field] of Object.entries<AdditionalStat>(formFields)) {
      const fieldExistsOnDoc = this.document.system.additionalStats[key];
      if (field.useField && fieldExistsOnDoc) {
        // Fixes blank label when toggling Additional Stat while there's an active effect
        if (newFields[key].label === undefined) newFields[key].label = prototypeFields[key].label;
        //update existing field
        newFields[key].hasMaxValue = prototypeFields[key].hasMaxValue;
        newFields[key].dtype = prototypeFields[key].dtype;
        if (newFields[key].dtype === 'Boolean') newFields[key]['-=max'] = null;
      } else if (field.useField && !fieldExistsOnDoc) {
        //add new field
        newFields[key] = prototypeFields[key];
        switch (prototypeFields[key].dtype) {
          case 'Die':
          case 'String':
            newFields[key].value = '';
            if (prototypeFields[key].max) newFields[key].max = '';
            break;
          case 'Number':
            newFields[key].value = 0;
            if (prototypeFields[key].max) newFields[key].max = 0;
            break;
          case 'Boolean':
            newFields[key].value = false;
            break;
        }
      } else {
        //delete field
        newFields[`-=${key}`] = null;
        delete newFields[key];
      }
    }

    //handle "stray" fields that exist on the actor but have no prototype
    for (const key in this.document.system.additionalStats) {
      if (!prototypeFields[key]) {
        //@ts-expect-error This is only done to delete the key
        newFields[`-=${key}`] = null;
      }
    }
    return newFields;
  }

  protected override _prepareSubmitData(event, form, formData, updateData) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    // Prevent submitting overridden values
    const overrides = foundry.utils.flattenObject(this.document.overrides);
    for (const k of Object.keys(overrides)) {
      if (k.startsWith('system.')) delete submitData[`data.${k.slice(7)}`]; // Band-aid for < v10 data
      delete submitData[k];
    }
    return submitData;
  }
}

class SwadeActorTweaks extends SwadeDocumentTweaks<SwadeActor, AnyObject> {
  static override PARTS = {
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    traits: {
      template: 'systems/swade/templates/actors/apps/tweaks/tab-traits.hbs',
      scrollable: [''],
    },
    additionalStats: {
      template: 'systems/swade/templates/actors/apps/tweaks/tab-additional-stats.hbs',
      scrollable: [''],
    },
    auras: {
      template: 'systems/swade/templates/actors/apps/tweaks/tab-auras.hbs',
      scrollable: [''],
    },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  static override TABS = {
    sheet: {
      tabs: [
        { id: 'traits', label: 'SWADE.Summary' },
        { id: 'additionalStats', label: 'SWADE.AddStats' },
        { id: 'auras', label: 'SWADE.Auras.TabHeader' },
      ],
      initial: 'traits',
    },
  };

  protected override _configureRenderParts(options) {
    const hasSettingFields = !foundry.utils.isEmpty(this.settingFields);
    const parts = super._configureRenderParts(options);
    if (!hasSettingFields) delete parts.additionalStats;
    if (this.document.type === 'group') delete parts.traits;
    return parts;
  }

  override async _prepareContext(options) {
    return foundry.utils.mergeObject(await super._prepareContext(options), {
      isNPC: this.document.type === 'npc',
      isVehicle: this.document.type === 'vehicle',
      isGroup: this.document.type === 'group',
      hasModSlots: game.settings.get('swade', 'vehicleMods'),
      hasEnergy: game.settings.get('swade', 'vehicleEnergy'),
      runningDieTypes: getDieSidesRange(1, 12),
    });
  }

  override async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    if (partId === 'tabs') {
      if (!partContext.hasSettingFields) delete partContext.tabs.additionalStats;
      if (partContext.isGroup) {
        delete partContext.tabs.traits;
        if (partContext.tabs.additionalStats) partContext.tabs.additionalStats.active = true;
        else partContext.tabs.auras.active = true;
      }
    } else if (partId === 'auras') {
      partContext.auraFields = this.document.system.schema.fields.auras.element.fields;
    }
    if (partId in partContext.tabs) partContext.tab = partContext.tabs[partId];
    return partContext;
  }
}

class SwadeItemTweaks<Document extends SwadeItem, RenderContext extends AnyObject> extends SwadeDocumentTweaks<
  Document,
  RenderContext
> {
  static override DEFAULT_OPTIONS = {
    actions: {
      regenerateSWID: SwadeItemTweaks.#regenerateSWID,
    },
  };

  static override PARTS = {
    main: {
      template: 'systems/swade/templates/item/apps/tweaks.hbs',
      scrollable: [''],
    },
    footer: { template: 'templates/generic/form-footer.hbs' },
  };

  static async #regenerateSWID() {
    await this.document.regenerateSWID();
    this.render({ force: true });
  }
}

export { SwadeActorTweaks, SwadeDocumentTweaks, SwadeItemTweaks };
