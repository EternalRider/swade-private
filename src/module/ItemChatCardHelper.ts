import { Attribute } from '../globals';
import {
  ItemAction,
  TraitRollModifier,
} from '../interfaces/additional.interface';
import IRollOptions from '../interfaces/RollOptions.interface';
import { SWADE } from './config';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
import SwadeMeasuredTemplate from './documents/SwadeMeasuredTemplate';
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

    // Get the Actor from a synthetic Token
    // This is a variable type because we might switch it later if this turns out
    // to be a resistance-type trait roll.
    let actor = this.getChatCardActor(card);
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

    const actionObj = foundry.utils.getProperty(
      item,
      'system.actions.additional.' + action,
    ) as ItemAction | undefined;

    // "Resist" types target the actor with a currently selected token, not the
    // one that spawned the chat card. So swap that actor in.
    if (actionObj?.type === 'resist') {
      // swap the selected token's actor in as the target for the roll
      if (!canvas.tokens || canvas.tokens.controlled.length !== 1) {
        ui.notifications.warn('SWADE.NoTokenSelectedForResistRoll', {
          localize: true,
        });
        button.disabled = false;
        return null;
      }
      actor = canvas.tokens?.controlled[0].actor ?? actor;
    } else if (!(game.user!.isGM || message.isAuthor || actor.isOwner)) {
      // For non-resist types, don't allow a roll unless the message author is
      // the user clicking the button.
      button.disabled = false;
      return null;
    }

    //if it's a power and the No Power Points rule is in effect
    if (item.type === 'power' && game.settings.get('swade', 'noPowerPoints')) {
      const ppCost = $(card).find('input.pp-adjust').val() as number;
      let modifier = Math.ceil(ppCost / 2);
      modifier = Math.min(modifier * -1, modifier);
      if (action === 'formula' || (actionObj && actionObj.type === 'skill')) {
        additionalMods.push({
          label: game.i18n.localize('ITEM.TypePower'),
          value: modifier,
        });
      }
    }

    if (action === 'template') {
      const template = button.dataset.template;
      SwadeMeasuredTemplate.fromPreset(template);
      button.disabled = false;
      return null;
    }

    const roll = await this.handleAction(item, actor, action, additionalMods);

    //Only refresh the card if there is a roll and the item isn't a power
    if (roll && item.type !== 'power') await this.refreshItemCard(actor);

    // Re-enable the button
    button.disabled = false;
    return roll;
  }

  static getChatCardActor(card: HTMLElement): SwadeActor | null {
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
    const actorId = card.dataset.actorId!;
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
    let roll: Promise<Roll | null> | Roll | null = null;

    switch (action) {
      case 'damage':
        roll = await this.handleDamageAction(item, actor, additionalMods);
        break;
      case 'formula':
        roll = await this.handleFormulaAction(item, actor, additionalMods);
        break;
      case 'arcane-device':
        roll = await actor.makeArcaneDeviceSkillRoll(
          getProperty(item, 'system.arcaneSkillDie'),
        );
        break;
      case 'reload':
        if (
          getProperty(item, 'system.currentShots') >=
          getProperty(item, 'system.shots')
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
        await item.reload();
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

  static async handleFormulaAction(
    item: SwadeItem,
    actor: SwadeActor,
    additionalMods: TraitRollModifier[] = [],
  ) {
    const traitName = getProperty(item, 'system.actions.skill');
    if (!item.canExpendResources()) {
      Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
      return null;
    }
    additionalMods.push(...item.getTraitModifiers());
    const trait = getTrait(traitName, actor);
    const roll = await this.doTraitAction(trait, actor, {
      additionalMods,
    });
    if (roll) await item.consume();
    // if (roll) await this.subtractShots(actor, item.id!);
    this.callActionHook(actor, item, 'formula', roll);
    return roll;
  }

  static async handleDamageAction(
    item: SwadeItem,
    actor: SwadeActor,
    additionalMods: TraitRollModifier[] = [],
  ) {
    if (getProperty(item, 'system.actions.dmgMod')) {
      additionalMods.push({
        label: game.i18n.localize('SWADE.ItemDmgMod'),
        value: getProperty(item, 'system.actions.dmgMod'),
      });
    }
    const roll = await item.rollDamage({ additionalMods });
    this.callActionHook(actor, item, 'damage', roll);
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
      item,
      `system.actions.additional.${actionKey}`,
    ) as ItemAction;
    const ammoManagement =
      game.settings.get('swade', 'ammoManagement') && !item.isMeleeWeapon;

    // if there isn't actually any action then return early
    if (!action) return null;

    let roll: Promise<Roll> | Roll | null = null;

    if (action.type === 'skill' || action.type === 'resist') {
      //set the trait name and potentially override it via the action
      let traitName = getProperty(item, 'system.actions.skill');
      if (action.skillOverride) traitName = action.skillOverride;

      //find the trait and either get the skill item or the key of the attribute
      const trait = getTrait(traitName, actor);

      if (action.skillMod && parseInt(action.skillMod) !== 0) {
        additionalMods.push({
          label: game.i18n.localize('SWADE.ActionTraitMod'),
          value: action.skillMod,
        });
      }
      const currentShots = getProperty(item, 'system.currentShots');

      if (item.type === 'weapon') {
        if (!item.canExpendResources(action.shotsUsed)) {    
          Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
          return null
        }
      }

      additionalMods.push(...item.getTraitModifiers());

      roll = await this.doTraitAction(trait, actor, {
        flavour: action.name,
        rof: action.rof,
        additionalMods,
      });

      if (roll && item.type === 'weapon') {
        await item.consume(action.shotsUsed ?? 0);
        // await this.subtractShots(actor, item.id!, action.shotsUsed ?? 0);
      }
    } else if (action.type === 'damage') {
      //Do Damage stuff
      if (getProperty(item, 'system.actions.dmgMod') !== '') {
        additionalMods.push({
          label: game.i18n.localize('SWADE.ItemDmgMod'),
          value: getProperty(item, 'system.actions.dmgMod'),
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

    // Some chat cards have buttons that can be clicked by other actors in the game,
    // eg. resistance actions. When this happens, we cannot update the chat card, as
    // the acting Actor does not own the card. Skip over these cases; there is no
    // update necessary. Card updates are for things like ammo management and only make sense
    // when they're being done by the actor that owns the card.
    if (!message.isAuthor) return;

    const content = new DOMParser().parseFromString(
      message.content,
      'text/html',
    );

    const messageData = $(content).find('.chat-card.item-card').first().data();

    const item = actor.items.get(messageData.itemId);
    if (item?.type === 'weapon') {
      const currentShots = item.system.currentShots;
      const maxShots = item.system.shots;

      //update message content
      $(content)
        .find('.ammo-counter .current-shots')
        .first()
        .text(currentShots);
      $(content).find('.ammo-counter .max-shots').first().text(maxShots);
    }

    if (item?.type === 'power') {
      const arcane = item.system.arcane || 'general';
      const curPP = getProperty(actor, `system.powerPoints.${arcane}.value`);
      const maxPP = getProperty(actor, `system.powerPoints.${arcane}.max`);
      //update message content
      $(content).find('.pp-counter .current-pp').first().text(curPP);
      $(content).find('.pp-counter .max-pp').first().text(maxPP);
    }

    if (item?.type === 'consumable') {
      //update message content
      const charges = item.system.charges;
      $(content).find('.pp-counter .current-pp').first().text(charges.value);
      $(content).find('.pp-counter .max-pp').first().text(charges.max);
    }

    if (item?.isArcaneDevice) {
      const currentPP = getProperty(item, 'system.powerPoints.value');
      const maxPP = getProperty(item, 'system.powerPoints.max');
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
