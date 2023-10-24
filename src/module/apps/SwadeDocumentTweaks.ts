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

  override get id() {
    return `DocumentTweaks-${this.object.documentName}-${this.object.id}`;
  }

  /** Add the Document name into the window title*/
  override get title() {
    return `${this.object.name}: ${game.i18n.localize('SWADE.Tweaks')}`;
  }

  activateListeners(jquery: JQuery<HTMLFormElement>): void {
    super.activateListeners(jquery);
    const html = jquery[0];

    html
      .querySelectorAll('.tab[data-tab="auras"] select')
      .forEach((el) =>
        el.addEventListener('contextmenu', this.#resetVisibility.bind(this)),
      );
    html
      .querySelector('.regenerate-swid')
      ?.addEventListener('click', this.#regenerateSWID.bind(this));
  }

  /**@inheritdoc */
  override async getData(options?: ApplicationOptions) {
    const settingFields = this.#getPrototypeSettingFields();

    for (const key in settingFields) {
      if (
        this.object.system.additionalStats[key] &&
        this.object.system.additionalStats[key]?.dtype
      ) {
        settingFields[key].useField = true;
      }
    }
    const data = {
      doc: this.object,
      settingFields: settingFields,
      hasSettingFields: !foundry.utils.isEmpty(settingFields),
      itemTabActive: this.object instanceof SwadeItem ? 'active' : '',
      isItem: this.object instanceof SwadeItem,
      isActor: this.object instanceof SwadeActor,
      isCharacter: this.object.type === 'character',
      isNPC: this.object.type === 'npc',
      isVehicle: this.object.type === 'vehicle',
      hasModSlots: game.settings.get('swade', 'vehicleMods'),
      advanceTypes: this.#getAdvanceTypes(),
      auras: {
        units: canvas.scene?.grid?.units ?? game.system.gridUnits,
        auras: this.object.auras,
        defaultColor: game.user.color ?? '#000000',
        visibilityChoices: [
          {
            key: foundry.CONST.TOKEN_DISPOSITIONS.HOSTILE,
            label: 'TOKEN.DISPOSITION.HOSTILE',
          },
          {
            key: foundry.CONST.TOKEN_DISPOSITIONS.NEUTRAL,
            label: 'TOKEN.DISPOSITION.NEUTRAL',
          },
          {
            key: foundry.CONST.TOKEN_DISPOSITIONS.FRIENDLY,
            label: 'TOKEN.DISPOSITION.FRIENDLY',
          },
        ],
      },
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
      this.#handleAdditionalStats(expandedFormData),
    );

    // Update the actor
    await this.object.update(expandedFormData);
  }

  #getPrototypeSettingFields() {
    const fields = game.settings.get('swade', 'settingFields');
    let settingFields: AdditionalStats = {};
    if (this.object instanceof SwadeActor) {
      settingFields = fields.actor;
    } else if (this.object instanceof SwadeItem) {
      settingFields = fields.item;
    }
    return structuredClone(settingFields);
  }

  #handleAdditionalStats(expandedFormData) {
    const formFields = expandedFormData.system.additionalStats ?? {};
    const prototypeFields = this.#getPrototypeSettingFields();
    const newFields = structuredClone<AdditionalStats>(
      this.object.system.additionalStats,
    );
    //handle setting specific fields
    for (const [key, field] of Object.entries<AdditionalStat>(formFields)) {
      const fieldExistsOnDoc = this.object.system.additionalStats[key];
      if (field.useField && fieldExistsOnDoc) {
        // Fixes blank label when toggling Additional Stat while there's an active effect
        if (newFields[key].label === undefined)
          newFields[key].label = prototypeFields[key].label;
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

  /** @inheritdoc */
  protected override _getSubmitData(updateData = {}) {
    const data = super._getSubmitData(updateData);
    // Prevent submitting overridden values
    const overrides = foundry.utils.flattenObject(this.object.overrides);
    for (const k of Object.keys(overrides)) {
      if (k.startsWith('system.')) delete data[`data.${k.slice(7)}`]; // Band-aid for < v10 data
      delete data[k];
    }
    return data;
  }

  #getAdvanceTypes(): Record<string, string> {
    return {
      legacy: 'SWADE.Advances.Modes.Legacy',
      expanded: 'SWADE.Advances.Modes.Expanded',
    };
  }

  async #resetVisibility(ev: PointerEvent) {
    const target = ev.currentTarget as HTMLSelectElement;
    const auraId = target.dataset.auraId as string;
    await this.object.update(
      {
        'flags.swade.auras': { [auraId]: { visibleTo: [] } },
      },
      { diff: false },
    );
    this.render();
  }

  async #regenerateSWID() {
    await (this.object as SwadeItem).regenerateSWID();
    this.render();
  }
}
