import IDriverData from '../../interfaces/DriverData.interface';
import { SWADE } from '../config';
import { constants } from '../constants';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import SwadeBaseActorSheet from './SwadeBaseActorSheet';

/** @noInheritDoc */
export default class SwadeVehicleSheet extends SwadeBaseActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['swade', 'sheet', 'actor', 'vehicle'],
      template: 'systems/swade/templates/actors/vehicle-sheet.hbs',
      width: 600,
      height: 540,
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.sheet-body',
          initial: 'summary',
        },
      ],
    });
  }

  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Drag events for macros.
    if (this.actor.isOwner) {
      const handler = (ev: DragEvent) => this._onDragStart(ev);
      // Find all items on the character sheet.
      html.find('li.item.weapon').each((i, li) => {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', handler, false);
      });
    }

    //Toggle Equipmnent Card collapsible
    html.find('.gear-card .card-header .item-name').on('click', (ev) => {
      const card = $(ev.currentTarget).parents('.gear-card');
      const content = card.find('.card-content');
      content.toggleClass('collapsed');
      if (content.hasClass('collapsed')) {
        content.slideUp();
      } else {
        content.slideDown();
      }
    });

    // Delete Item
    html.find('.item-delete').on('click', async (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const ownedItem = this.actor.items.get(li.data('itemId'));
      const template = `
          <form>
            <div>
              <center>${game.i18n.localize('SWADE.Del')} 
                <strong>${ownedItem?.name}</strong>?
              </center>
              <br>
            </div>
          </form>`;
      await Dialog.confirm({
        title: game.i18n.localize('SWADE.Del'),
        content: template,
        render: () => {},
        yes: async () => {
          await ownedItem?.delete();
          li.slideUp(200, () => this.render(false));
        },
        no: () => {},
      });
    });

    // Add new object
    html.find('.item-create').on('click', async (event) => {
      event.preventDefault();
      const header = event.currentTarget;
      const type = header.dataset.type ?? '';

      let itemData;

      switch (type) {
        case 'choice':
          return this._chooseItemType().then(async (dialogInput: any) => {
            const data = this._createItemData(
              dialogInput.type,
              header,
              dialogInput.name,
            );
            await CONFIG.Item.documentClass.create(data, {
              renderSheet: true,
              parent: this.actor,
            });
          });
        case 'mod':
          itemData = this._createItemData('gear', header);
          itemData.system.isVehicular = true;
          itemData.system.equipStatus = constants.EQUIP_STATE.EQUIPPED;
          itemData.name = `New ${type.capitalize()}`;
          return CONFIG.Item.documentClass.create(itemData, {
            renderSheet: true,
            parent: this.actor,
          });
        case 'vehicle-weapon':
          itemData = this._createItemData('weapon', header);
          itemData.system.isVehicular = true;
          itemData.system.equipStatus = constants.EQUIP_STATE.EQUIPPED;
          return CONFIG.Item.documentClass.create(itemData, {
            renderSheet: true,
            parent: this.actor,
          });
        default:
          itemData = this._createItemData(type, header);
          return CONFIG.Item.documentClass.create(itemData, {
            renderSheet: true,
            parent: this.actor,
          });
      }
    });

    //Reset the Driver
    html.find('.reset-driver').on('click', async () => {
      await this._resetDriver();
    });

    // Open driver sheet
    html.find('.driver-img').on('click', async () => {
      await this._openDriverSheet();
    });

    //Maneuver Check
    html
      .find('#maneuverCheck')
      .on('click', () => this.actor.rollManeuverCheck());
  }

  /**
   * @override
   */
  async getData() {
    const data = await super.getData();

    data.config = SWADE;
    data.itemsByType = {};
    data.opSkills = this._buildOpSkillList();
    for (const item of data.items) {
      let list = data.itemsByType[item.type];
      if (!list) {
        list = [];
        data.itemsByType[item.type] = list;
      }
      list.push(item);
    }

    //Prepare inventory
    data.inventory = this._determineCargo().sort(
      (a, b) => a!.name!.localeCompare(b.name!) ?? 0,
    );
    data.inventoryWeight = 0;
    data.inventory.forEach((i: SwadeItem) => {
      data.inventoryWeight += i.system['weight'] * i.system['quantity'];
    });

    //Fetch Driver data
    data.driver = await this._fetchDriver();

    // Check for enabled optional rules
    data.settingrules = {
      vehicleEdges: game.settings.get('swade', 'vehicleEdges'),
      modSlots: game.settings.get('swade', 'vehicleMods'),
    };

    if (data.settingrules.modSlots) {
      const modsUsed = this._calcModSlotsUsed();
      data.mods = {
        used: modsUsed,
        percentage: this._calcModsPercentage(modsUsed),
      };
    }
    data.equipStatusEnum = constants.EQUIP_STATE;
    data.enrichedDescription = await TextEditor.enrichHTML(
      this.actor.system.description,
      { async: true, secrets: this.options.editable },
    );
    return data;
  }

  /**
   * Determines the cargo inventory of the vehicle, sorting out all the non-vehicular items
   * @param itemsByType an object with the items filtered by type
   */
  private _determineCargo() {
    return [
      ...this.actor.items.filter(
        (i) =>
          (i.type === 'gear' || i.type === 'weapon') &&
          (!i.system.isVehicular ||
            i.system.equipStatus < constants.EQUIP_STATE.EQUIPPED),
      ),
      //TODO update once containers and consumables are added
      ...this.actor.itemTypes.armor,
      ...this.actor.itemTypes.shield,
      ...this.actor.itemTypes.consumable,
    ];
  }

  async setDriver(id: string): Promise<void> {
    const driver = game.actors?.get(id);
    if (driver && driver.type !== 'vehicle') {
      await this.actor.update({ 'system.driver.id': id });
    }
  }

  private async _fetchDriver() {
    if (this.actor.type !== 'vehicle') return null;

    const driverId = this.actor.system.driver.id;
    const driver = await this.actor.getDriver();
    const userCanViewDriver =
      game.user?.isGM ||
      (driver && driver.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.LIMITED);
    const driverData: IDriverData = {
      img: 'icons/svg/mystery-man-black.svg',
      name: 'No Driver',
      userCanSeeDriver: userCanViewDriver!,
    };

    //Return if the vehicle has no driver
    if (!driverId || !driver) {
      return driverData;
    }

    //Display the Driver data if the current user has at least Limited permission on the driver Actor
    if (userCanViewDriver) {
      driverData.img = driver.img!;
      driverData.name = driver.name!;
    } else {
      //else just show an an unknown driver
      driverData.name = 'Unknown Driver';
    }
    return driverData;
  }

  private async _resetDriver() {
    await this.actor.update({ 'system.driver.id': null });
  }

  private async _openDriverSheet() {
    if (this.actor.type !== 'vehicle') return;
    const driverId = this.actor.system.driver.id;
    if (!driverId) return;
    const driver = (await fromUuid(driverId)) as SwadeActor | null;
    driver?.sheet?.render(true);
  }

  // item creation helper func
  private _createItemData(
    type: string,
    header: HTMLElement,
    name?: string,
  ): any {
    const itemData = {
      name: name ? name : `New ${type.capitalize()}`,
      type: type,
      img: `systems/swade/assets/icons/${type}.svg`,
      system: deepClone(header.dataset),
    };
    delete itemData.system['type'];
    return itemData;
  }

  /**
   * calculate how many modslots are used
   */
  private _calcModSlotsUsed(): number {
    const mods = this.actor.items.filter(
      (i) =>
        (i.type === 'gear' || i.type === 'weapon') &&
        i.system.isVehicular &&
        i.system.equipStatus > constants.EQUIP_STATE.CARRIED,
    );
    let retVal = 0;
    for (const m of mods) {
      if (m.type !== 'weapon' && m.type !== 'gear') continue;
      const slots = m.system.mods ?? 0;
      const quantity = m.system.quantity ?? 0;
      retVal += slots * quantity;
    }
    return retVal;
  }

  /**
   * calculate how many percent of modslots are used
   * @param modsUsed number of active modslots
   */
  private _calcModsPercentage(modsUsed: number): number {
    if (this.actor.type !== 'vehicle') return 0;
    const maxMods = this.actor.system.maxMods;
    const p = (modsUsed / maxMods) * 100;

    //cap the percentage at 100
    return Math.min(p, 100);
  }

  private _buildOpSkillList() {
    const opSkills = SWADE.vehicles.opSkills;
    return opSkills.reduce((acc: Record<string, string>, cur: string) => {
      acc[cur] = cur;
      return acc;
    }, {});
  }
}
