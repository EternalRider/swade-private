import { Attribute } from '../globals';
import {
  ItemAction,
  TraitRollModifier,
} from '../interfaces/additional.interface';
import IRollOptions from '../interfaces/RollOptions.interface';
import { SWADE } from './config';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
import { Logger } from './Logger';
import { getTrait, notificationExists } from './util';

/**
 * A helper class for Item chat card logic
 */
export default class ItemChatCardHelper {
  static async onChatCardAction(event): Promise<Roll | null> {
    event.preventDefault();

    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;
    const card = button.closest('.chat-card');
    const messageId = card.closest('.message').dataset.messageId;
    const message = game.messages?.get(messageId)!;
    const action = button.dataset.action;
    const additionalMods = new Array<TraitRollModifier>();

    //save the message ID if we're doing automated ammo management
    SWADE['itemCardMessageId'] = messageId;

    // Validate permission to proceed with the roll
    if (!(game.user!.isGM || message.isAuthor)) return null;

    // Get the Actor from a synthetic Token
    const actor = this.getChatCardActor(card);
    if (!actor) return null;

    // Get the Item
    const item = actor.items.get(card.dataset.itemId);
    if (!item) {
      Logger.error(
        `The requested item ${card.dataset.itemId} does not exist on Actor ${actor.name}`,
        { toast: true },
      );
      return null;
    }

    //if it's a power and the No Power Points rule is in effect
    if (
      item.data.type === 'power' &&
      game.settings.get('swade', 'noPowerPoints')
    ) {
      const ppCost = $(card).find('input.pp-adjust').val() as number;
      let modifier = Math.ceil(ppCost / 2);
      modifier = Math.min(modifier * -1, modifier);
      const actionObj = getProperty(
        item.data.data,
        `actions.additional.${action}`,
      ) as ItemAction;
      if (action === 'formula' || (actionObj && actionObj.type === 'skill')) {
        additionalMods.push({
          label: game.i18n.localize('ITEM.TypePower'),
          value: modifier,
        });
      }
    }

    const roll = await this.handleAction(item, actor, action, additionalMods);

    //Only refresh the card if there is a roll and the item isn't a power
    if (roll && item.type !== 'power') await this.refreshItemCard(actor);

    // Re-enable the button
    button.disabled = false;
    return roll;
  }

  static getChatCardActor(card): SwadeActor | null {
    // Case 1 - a synthetic actor from a Token
    const tokenKey = card.dataset.tokenId;
    if (tokenKey) {
      const [sceneId, tokenId] = tokenKey.split('.');
      const scene = game.scenes?.get(sceneId);
      if (!scene) return null;
      const token = scene.tokens.get(tokenId);
      if (!token) return null;
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors?.get(actorId) ?? null;
  }

  /**
   * Handles the basic skill/damage/reload AND the additional actions
   * @param item
   * @param actor
   * @param action
   */
  static async handleAction(
    item: SwadeItem,
    actor: SwadeActor,
    action: string,
    additionalMods: TraitRollModifier[] = [],
  ): Promise<Roll | null> {
    const traitName = getProperty(item.data.data, 'actions.skill');
    let roll: Promise<Roll | null> | Roll | null = null;
    const ammo = actor.items.getName(getProperty(item.data.data, 'ammo'));
    const usesAmmoManagement =
      game.settings.get('swade', 'ammoManagement') && !item.isMeleeWeapon;
    const drawsAmmoFromInv = getProperty(item.data.data, 'autoReload');
    const ammoAvailable = ammo && getProperty(ammo.data.data, 'quantity') > 0;
    const enoughShots = getProperty(item.data.data, 'currentShots') > 0;
    const canReload = this.isReloadPossible(actor) && usesAmmoManagement;

    const cannotShoot =
      (canReload && drawsAmmoFromInv && !ammoAvailable) ||
      (canReload && !enoughShots);

    switch (action) {
      case 'damage':
        if (getProperty(item.data.data, 'actions.dmgMod')) {
          additionalMods.push({
            label: game.i18n.localize('SWADE.ItemDmgMod'),
            value: getProperty(item.data.data, 'actions.dmgMod'),
          });
        }
        roll = await item.rollDamage({ additionalMods });
        this.callActionHook(actor, item, action, roll);
        break;
      case 'formula':
        //check if we have enough ammo available
        if (item.data.type !== 'power' && cannotShoot) {
          Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
          return null;
        }
        additionalMods.push(...item.getTraitModifiers());
        roll = await this.doTraitAction(getTrait(traitName, actor), actor, {
          additionalMods,
        });
        if (roll) await this.subtractShots(actor, item.id!);
        this.callActionHook(actor, item, action, roll);
        break;
      case 'arcane-device':
        roll = await actor.makeArcaneDeviceSkillRoll(
          getProperty(item.data.data, 'arcaneSkillDie'),
        );
        break;
      case 'reload':
        if (
          getProperty(item.data.data, 'currentShots') >=
          getProperty(item.data.data, 'shots')
        ) {
          //check to see we're not posting the message twice
          if (!notificationExists('SWADE.ReloadUnneeded', true)) {
            Logger.info('SWADE.ReloadUnneeded', {
              localize: true,
              toast: true,
            });
          }
          break;
        }
        await this.reloadWeapon(actor, item);
        await this.refreshItemCard(actor);
        break;
      case 'consume':
        await item.consume();
        await this.refreshItemCard(actor);
        break;
      default:
        roll = await this.handleAdditionalActions(
          item,
          actor,
          action,
          additionalMods,
        );
        // No need to call the hook here, as handleAdditionalActions already calls the hook
        // This is so an external API can directly use handleAdditionalActions to use an action and still fire the hook
        break;
    }
    return roll;
  }

  /**
   * Handles misc actions
   * @param item The item that this action is used on
   * @param actor The actor who has the item
   * @param actionKey The action key
   * @returns the evaluated roll
   */
  static async handleAdditionalActions(
    item: SwadeItem,
    actor: SwadeActor,
    actionKey: string,
    additionalMods: TraitRollModifier[] = [],
  ): Promise<Roll | null> {
    const action = getProperty(
      item.data.data,
      `actions.additional.${actionKey}`,
    ) as ItemAction;
    const ammoManagement =
      game.settings.get('swade', 'ammoManagement') && !item.isMeleeWeapon;

    // if there isn't actually any action then return early
    if (!action) return null;

    let roll: Promise<Roll> | Roll | null = null;

    if (action.type === 'skill') {
      //set the trait name and potentially override it via the action
      let traitName = getProperty(item.data.data, 'actions.skill');
      if (action.skillOverride) traitName = action.skillOverride;

      //find the trait and either get the skill item or the key of the attribute
      const trait = getTrait(traitName, actor);

      if (action.skillMod && parseInt(action.skillMod) !== 0) {
        additionalMods.push({
          label: action.name ?? game.i18n.localize('SWADE.ActionTraitMod'),
          value: action.skillMod,
        });
      }
      const currentShots = getProperty(item.data.data, 'currentShots');

      if (item.data.type === 'weapon') {
        //do autoreload stuff if applicable
        const hasAutoReload = item.data.data.autoReload;
        const ammo = actor.items.getName(item.data.data.ammo);
        const canAutoReload = !!ammo && ammo.data.data['quantity'] <= 0;
        if (
          ammoManagement &&
          ((hasAutoReload && !canAutoReload) ||
            (!!action.shotsUsed && currentShots < action.shotsUsed))
        ) {
          Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
          return null;
        }
      }

      additionalMods.push(...item.getTraitModifiers());

      roll = await this.doTraitAction(trait, actor, {
        flavour: action.name,
        rof: action.rof,
        additionalMods,
      });

      if (roll && item.data.type === 'weapon') {
        await this.subtractShots(actor, item.id!, action.shotsUsed ?? 0);
      }
    } else if (action.type === 'damage') {
      //Do Damage stuff
      if (getProperty(item.data.data, 'actions.dmgMod') !== '') {
        additionalMods.push({
          label: game.i18n.localize('SWADE.ItemDmgMod'),
          value: getProperty(item.data.data, 'actions.dmgMod'),
        });
      }
      if (action.dmgMod) {
        additionalMods.push({
          label: action.name,
          value: action.dmgMod,
        });
      }
      roll = await item.rollDamage({
        dmgOverride: action.dmgOverride,
        flavour: action.name,
        additionalMods,
      });
    }
    this.callActionHook(actor, item, actionKey, roll);
    return roll;
  }

  static async doTraitAction(
    trait: string | SwadeItem | null | undefined,
    actor: SwadeActor,
    options: IRollOptions,
  ): Promise<Roll | null> {
    const rollSkill = trait instanceof SwadeItem || !trait;
    const rollAttribute = typeof trait === 'string';
    if (rollSkill) {
      //get the id from the item or null if there was no trait
      const id = trait instanceof SwadeItem ? trait.id : null;
      return actor.rollSkill(id, options);
    } else if (rollAttribute) {
      return actor.rollAttribute(trait as Attribute, options);
    } else {
      return null;
    }
  }

  /**
   * Subtract shots from the item
   * @param actor The actor that holds the weapon and the ammo
   * @param itemId The id of the weapon
   * @param shotsUsed
   */
  static async subtractShots(
    actor: SwadeActor,
    itemId: string,
    shotsUsed = 1,
  ): Promise<void> {
    const item = actor.items.get(itemId)!;
    const currentShots = parseInt(getProperty(item.data.data, 'currentShots'));
    const hasAutoReload = getProperty(item.data.data, 'autoReload') as boolean;
    const ammoManagement = game.settings.get('swade', 'ammoManagement');
    const isReloadPossible = this.isReloadPossible(actor);

    //handle Auto Reload
    if (hasAutoReload) {
      if (!isReloadPossible) return;
      const ammo = actor.items.getName(getProperty(item.data.data, 'ammo'))!;
      if (!ammo && !isReloadPossible) return;
      const current = getProperty(ammo.data.data, 'quantity');
      const newQuantity = current - shotsUsed;
      await ammo.update({ 'data.quantity': newQuantity });
      //handle normal shot consumption
    } else if (ammoManagement && !!shotsUsed && currentShots - shotsUsed >= 0) {
      await item.update({ 'data.currentShots': currentShots - shotsUsed });
    }
  }

  static async reloadWeapon(actor: SwadeActor, weapon: SwadeItem) {
    if (weapon.data.type !== 'weapon') return;
    const ammoName = weapon.data.data.ammo;
    //return if there's no ammo set
    if (!ammoName) {
      if (!notificationExists('SWADE.NoAmmoSet', true)) {
        Logger.info('SWADE.NoAmmoSet', { toast: true, localize: true });
      }
      return;
    }

    const isReloadPossible = this.isReloadPossible(actor);
    const ammo = actor.items.getName(ammoName);
    const shots = weapon.data.data.shots;
    let ammoInMagazine = shots;
    const missingAmmo = shots - weapon.data.data.currentShots;

    if (isReloadPossible) {
      if (!ammo) {
        if (!notificationExists('SWADE.NotEnoughAmmoToReload', true)) {
          Logger.warn('SWADE.NotEnoughAmmoToReload', {
            toast: true,
            localize: true,
          });
        }
        return;
      }

      const ammoInInventory = getProperty(ammo.data, 'data.quantity') as number;
      let leftoverAmmoInInventory = ammoInInventory - missingAmmo;
      if (ammoInInventory < missingAmmo) {
        ammoInMagazine = weapon.data.data.currentShots + ammoInInventory;
        leftoverAmmoInInventory = 0;
        if (!notificationExists('SWADE.NotEnoughAmmoToReload', true)) {
          Logger.warn('SWADE.NotEnoughAmmoToReload', {
            toast: true,
            localize: true,
          });
        }
      }

      //update the ammo item
      await ammo.update({
        'data.quantity': leftoverAmmoInInventory,
      });
    }

    //update the weapon
    await weapon.update({ 'data.currentShots': ammoInMagazine });

    //check to see we're not posting the message twice
    if (!notificationExists('SWADE.ReloadSuccess', true)) {
      Logger.info('SWADE.ReloadSuccess', { toast: true, localize: true });
    }
  }

  static async refreshItemCard(actor: SwadeActor, messageId?: string) {
    //get ChatMessage and remove temporarily stored id from CONFIG object
    let message;
    if (messageId) {
      message = game.messages?.get(messageId);
    } else {
      message = game.messages?.get(SWADE['itemCardMessageId']);
      delete SWADE['itemCardMessageId'];
    }
    if (!message) return; //solves for the case where ammo management isn't turned on so there's no errors

    const content = new DOMParser().parseFromString(
      getProperty(message, 'data.content'),
      'text/html',
    );

    const messageData = $(content).find('.chat-card.item-card').first().data();

    const item = actor.items.get(messageData.itemId);
    if (item?.data.type === 'weapon') {
      const currentShots = item.data.data.currentShots;
      const maxShots = item.data.data.shots;

      //update message content
      $(content)
        .find('.ammo-counter .current-shots')
        .first()
        .text(currentShots);
      $(content).find('.ammo-counter .max-shots').first().text(maxShots);
    }

    if (item?.data.type === 'power') {
      const arcane = item.data.data.arcane;
      let currentPP = getProperty(actor.data.data, 'powerPoints.value');
      let maxPP = getProperty(actor.data.data, 'powerPoints.max');
      if (arcane) {
        currentPP = getProperty(actor.data.data, `powerPoints.${arcane}.value`);
        maxPP = getProperty(actor.data.data, `powerPoints.${arcane}.max`);
      }
      //update message content
      $(content).find('.pp-counter .current-pp').first().text(currentPP);
      $(content).find('.pp-counter .max-pp').first().text(maxPP);
    }

    if (item?.data.type === 'consumable') {
      //update message content
      const charges = item.data.data.charges;
      $(content).find('.pp-counter .current-pp').first().text(charges.value);
      $(content).find('.pp-counter .max-pp').first().text(charges.max);
    }

    if (item?.isArcaneDevice) {
      const currentPP = getProperty(item.data.data, 'powerPoints.value');
      const maxPP = getProperty(item.data.data, 'powerPoints.max');
      //update message content
      $(content).find('.pp-counter .current-pp').first().text(currentPP);
      $(content).find('.pp-counter .max-pp').first().text(maxPP);
    }

    //update the message and render the chatlog/chat popout
    await message.update({ content: content.body.innerHTML });
    ui.chat?.render(true);
    for (const appId in message.apps) {
      const app = message.apps[appId] as FormApplication;
      if (app.rendered) {
        app.render(true);
      }
    }
  }

  static isReloadPossible(actor: SwadeActor): boolean {
    const isPC = actor.data.type === 'character';
    const isNPC = actor.data.type === 'npc';
    const isVehicle = actor.data.type === 'vehicle';
    const npcAmmoFromInventory = game.settings.get('swade', 'npcAmmo');
    const vehicleAmmoFromInventory = game.settings.get('swade', 'vehicleAmmo');
    const useAmmoFromInventory = game.settings.get(
      'swade',
      'ammoFromInventory',
    );
    return (
      (isVehicle && vehicleAmmoFromInventory) ||
      (isNPC && npcAmmoFromInventory) ||
      (isPC && useAmmoFromInventory)
    );
  }

  /** @internal */
  static callActionHook(
    actor: SwadeActor,
    item: SwadeItem,
    action: string,
    roll: Roll<{}> | null,
  ) {
    /**
     * @category Hooks
     */
    Hooks.call('swadeAction', actor, item, action, roll, game.userId);
  }
}
