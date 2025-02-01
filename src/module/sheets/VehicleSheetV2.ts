import type { DeepPartial } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import {
  SwadeApplicationTab,
  SwadeDocumentSheetConfiguration,
} from '../../globals';
import { RollModifier } from '../../interfaces/additional.interface';
import AttributeManager from '../apps/AttributeManager';
import { constants } from '../constants';
import SwadeActiveEffect from '../documents/active-effect/SwadeActiveEffect';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { Logger } from '../Logger';
import { SwadeActorSheetV2 } from './SwadeActorSheetV2';

class SwadeVehicleSheetV2 extends SwadeActorSheetV2<SwadeVehicleSheetV2.RenderContext> {
  declare actor: SwadeActor<'vehicle'>;
  static override DEFAULT_OPTIONS: DeepPartial<
    SwadeDocumentSheetConfiguration<SwadeActor<'vehicle'>>
  > = {
    classes: ['vehicle', 'standard-form'],
    position: { height: 700, width: 700 },
    window: { resizable: true },
    actions: {
      maneuverCheck: SwadeVehicleSheetV2.maneuverCheck,
      resetDriver: SwadeVehicleSheetV2.resetDriver,
      rollAttribute: SwadeVehicleSheetV2.rollAttribute,
      changeEquip: SwadeVehicleSheetV2.changeEquip,
      manageAttributes: SwadeVehicleSheetV2.manageAttributes,
      createCargo: SwadeVehicleSheetV2.createCargo,
    },
  };

  static override PARTS = {
    header: {
      template: 'systems/swade/templates/actors/vehicle2/header.hbs',
    },
    tabs: { template: 'templates/generic/tab-navigation.hbs' },
    traits: {
      template: 'systems/swade/templates/actors/vehicle2/tab-traits.hbs',
    },
    crew: {
      template: 'systems/swade/templates/actors/vehicle2/tab-crew.hbs',
    },
    cargo: {
      template: 'systems/swade/templates/actors/vehicle2/tab-cargo.hbs',
    },
    description: {
      template: 'systems/swade/templates/actors/vehicle2/tab-desc.hbs',
    },
  };

  static override TABS: Record<string, Partial<SwadeApplicationTab>> = {
    traits: {
      id: 'traits',
      group: 'primary',
      label: 'SWADE.Summary',
    },
    crew: {
      id: 'crew',
      group: 'primary',
      label: 'SWADE.Crew',
    },
    cargo: {
      id: 'cargo',
      group: 'primary',
      label: 'SWADE.Cargo',
    },
    description: {
      id: 'description',
      group: 'primary',
      label: 'SWADE.Desc',
    },
  };

  protected override _getTabs() {
    this.tabGroups.primary ??= this.actor.limited ? 'description' : 'traits';
    return super._getTabs();
  }

  protected override async _preparePartContext(
    partId: keyof typeof SwadeVehicleSheetV2.PARTS,
    context: SwadeVehicleSheetV2.RenderContext,
    _options: DeepPartial<foundry.applications.api.HandlebarsApplicationMixin.HandlebarsRenderOptions>,
  ) {
    const itemTypes = this.actor.itemTypes;
    switch (partId) {
      case 'header':
        context.hasEnergy =
          game.settings.get('swade', 'vehicleEnergy') &&
          this.actor.system.energy.enabled;
        break;
      case 'traits':
        context.effects = this._prepareEffects();
        context.showModCount = game.settings.get('swade', 'vehicleMods');
        context.gearMods = this._prepareMods('gear');
        context.weaponMods = this._prepareMods('weapon');
        context.attributes = this._prepareAttributes();
        break;
      case 'crew':
        context.opSkills = this._prepareOpSkillList();
        context.operator = await this.actor.getDriver();
        context.driverOptions = this._prepareDriverOptions();
        context.showEdges = game.settings.get('swade', 'vehicleEdges');
        context.abilities = itemTypes.ability;
        context.edges = itemTypes.edge;
        context.hindrances = itemTypes.hindrance;
        break;
      case 'cargo':
        context.cargo = this._prepareCargo();
        break;
      case 'description':
        context.enrichedDescription = await TextEditor.enrichHTML(
          this.actor.system.description,
          {
            secrets: this.actor.isOwner,
            rollData: this.actor.getRollData(),
            relativeTo: this.actor,
          },
        );
        break;
    }
    return context;
  }

  _prepareEffects() {
    const effects: Record<string, SwadeActiveEffect[]> = {
      passive: [],
      temporary: [],
      inactive: [],
    };
    for (const e of this.actor.allApplicableEffects()) {
      if (e.isTemporary && e.active) effects.temporary.push(e);
      else if (e.active) effects.passive.push(e);
      else effects.inactive.push(e);
    }

    for (const category of Object.values(effects)) {
      category.sort((a, b) => a.sort - b.sort);
    }

    return effects;
  }

  _prepareMods(type: 'gear' | 'weapon') {
    const mods = this.actor.items.filter(
      (i) =>
        i.type === type &&
        i.system.isVehicular &&
        i.system.equipStatus > constants.EQUIP_STATE.CARRIED,
    );
    return mods;
  }

  _prepareOpSkillList(): foundry.applications.fields.SelectInputConfig {
    const skills = game.settings.get('swade', 'vehicleSkills');
    const skillList = skills.split(/[,]/);

    const options: foundry.applications.fields.FormSelectOption[] =
      skillList.map((skill) => {
        const name = skill.trim();
        return {
          value: name,
          label: name,
          selected: name === this.actor.system.driver.skill,
        };
      });
    return {
      options,
      blank: '',
    };
  }

  _prepareDriverOptions(): foundry.applications.fields.FormSelectOption[] {
    const scene = canvas.scene;
    if (!scene) return [];
    return scene.tokens
      .filter((t) => !['group', 'vehicle'].includes(t.actor?.type) && t.visible)
      .map((t) => ({ value: t.actor.uuid, label: t.name }));
  }

  _prepareAttributes(): SwadeVehicleSheetV2.AttributeContext {
    const enabled = Object.values(this.actor.system.attributes).some(
      (a) => a.enabled,
    );
    const globals = this.actor?.system.stats.globalMods as Record<
      string,
      RollModifier[]
    >;
    const list = Object.entries(this.actor.system.attributes)
      .filter(([_key, value]) => value.enabled)
      .map(([key, attr]) => {
        const field = this.actor.system.schema.getField(['attributes', key]);
        const mods: RollModifier[] = [
          {
            label: game.i18n.localize('SWADE.TraitMod'),
            value: attr.die.modifier,
          },
          ...attr.effects,
          ...globals[key],
          ...globals.trait,
        ].filter((m) => m.ignore !== true);
        let tooltip = `<strong>${game.i18n.localize(
          CONFIG.SWADE.attributes[key].long,
        )}</strong>`;
        if (mods.length) {
          tooltip += `<ul style="text-align:start;">${mods
            .map(({ label, value }) => {
              const mapped =
                typeof value === 'number' ? value.signedString() : value;
              return `<li>${label}: ${mapped}</li>`;
            })
            .join('')}</ul>`;
        }
        return {
          value: attr,
          field,
          tooltip,
        };
      });

    return { enabled, list };
  }

  _prepareCargo() {
    const itemTypes = this.actor.itemTypes;
    const notMod = (i: SwadeItem<'gear' | 'weapon'>) =>
      !i.system.isVehicular ||
      i.system.equipStatus! < constants.EQUIP_STATE.EQUIPPED;
    return [
      ...itemTypes.gear.filter(notMod),
      ...itemTypes.weapon.filter(notMod),
      ...itemTypes.armor,
      ...itemTypes.shield,
      ...itemTypes.consumable,
    ];
  }

  /** Actions */

  protected static async maneuverCheck(
    this: SwadeVehicleSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    this.actor.rollManeuverCheck();
  }

  protected static async resetDriver(
    this: SwadeVehicleSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    this.actor.update({ 'system.driver.id': null });
  }

  protected static async manageAttributes(
    this: SwadeVehicleSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    new AttributeManager(this.actor).render(true);
  }

  protected static async rollAttribute(
    this: SwadeVehicleSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    const attribute = target.dataset.attribute as
      | 'agility'
      | 'smarts'
      | 'spirit'
      | 'strength';
    await this.actor.rollAttribute(attribute);
  }

  protected static async changeEquip(
    this: SwadeVehicleSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    console.log(this, event, target);
    const item = this._getEmbeddedDocument(target);
    console.log(item);
  }

  protected static async createCargo(
    this: SwadeVehicleSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ) {
    await SwadeItem.createDialog(
      {},
      {
        parent: this.actor,
        types: ['gear', 'armor', 'weapon', 'shield', 'consumable'],
      },
    );
  }

  /** Drop Handling */

  protected override async _onDropActor(
    _event: DragEvent,
    data: DropData<SwadeActor>,
  ) {
    if (!this.actor.isOwner) return false;
    const actor =
      await getDocumentClass('Actor').fromDropData<typeof SwadeActor>(data);
    if (!actor) return false;
    if (actor.type === 'group' || actor.type === 'vehicle') {
      Logger.warn(
        `You cannot set ${game.i18n.localize('TYPES.Actor.' + actor.type)} Actors as the operator of a vehicle!`,
        { toast: true, localize: true },
      );
      return false;
    }
    await this.actor.update({
      'system.driver.id': actor.uuid,
    });
    return true;
  }
}

declare namespace SwadeVehicleSheetV2 {
  interface AttributeContext {
    enabled: boolean;
    list: Array<{
      value: unknown;
      field: foundry.data.fields.SchemaField.Any;
      tooltip: string;
    }>;
  }

  interface RenderContext extends SwadeActorSheetV2.RenderContext {
    hasEnergy: boolean;
    effects: Record<string, SwadeActiveEffect[]>;
    showModCount: boolean;
    gearMods: SwadeItem<'gear'>[];
    weaponMods: SwadeItem<'weapon'>[];
    attributes: AttributeContext;
    opSkills: foundry.applications.fields.SelectInputConfig;
    operator: SwadeActor | null;
    driverOptions: foundry.applications.fields.FormSelectOption[];
    showEdges: boolean;
    abilities: SwadeItem<'ability'>[];
    edges: SwadeItem<'edge'>[];
    hindrances: SwadeItem<'hindrance'>[];
    cargo: SwadeItem[];
    enrichedDescription: string;
  }
}

export default SwadeVehicleSheetV2;
