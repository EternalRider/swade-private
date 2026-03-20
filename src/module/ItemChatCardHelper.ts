import { Attribute } from '../globals';
import { ItemAction, RollModifier } from '../interfaces/additional.interface';
import IRollOptions from '../interfaces/RollOptions.interface';
import SwadeMeasuredTemplate from './canvas/SwadeMeasuredTemplate';
import { SWADE } from './config';
import { constants } from './constants';
import { VehicleData } from './data/actor/vehicle';
import { SwadeRoll } from './dice/SwadeRoll';
import { TraitRoll } from './dice/TraitRoll';
import SwadeActor from './documents/actor/SwadeActor';
import SwadeItem from './documents/item/SwadeItem';
import { Logger } from './Logger';
import { getTrait } from './util';

/**
 * A helper class for Item chat card logic
 */
export default class ItemChatCardHelper {
  static async onChatCardAction(
    event: PointerEvent
  ): Promise<SwadeRoll | null> {
    event.preventDefault();

    // Extract card data
    const button = event.target as HTMLButtonElement;
    button.disabled = true;
    const card = button.closest<HTMLElement>('.chat-card');
    const messageId = card?.closest<HTMLElement>('.message')?.dataset.messageId;
    const message = game.messages?.get(messageId);
    const action = button.dataset.action;
    const additionalMods = new Array<RollModifier>();

    if (!card || !action) return null;

    //save the message ID if we're doing automated ammo management
    SWADE['itemCardMessageId'] = messageId;

    // Get the Actor from a synthetic Token
    // This is a variable type because we might switch it later if this turns out
    // to be a resistance-type trait roll.
    let actor = this.getChatCardActor(card);
    if (!actor) return null;

    // Get the Item
    const item = actor.items.get(card.dataset.itemId!);
    if (!item) {
      Logger.error(
        `The requested item ${card.dataset.itemId} does not exist on Actor ${actor.name}`,
        { toast: true }
      );
      return null;
    }

    if (actor.system instanceof VehicleData) {
      if (item.type === 'weapon') {
        const gunner = actor.system.getCrewMemberForWeapon(
          item as SwadeItem<'weapon'>
        );
        actor = gunner ?? actor.system.operator ?? actor;
      } else {
        actor = actor.system.operator ?? actor;
      }
    }

    const actionObj = foundry.utils.getProperty(
      item,
      'system.actions.additional.' + action
    ) as ItemAction | undefined;

    // "Resist" types target the actor with a currently selected token, not the
    // one that spawned the chat card. So swap that actor in.
    if (actionObj?.type === constants.ACTION_TYPE.RESIST) {
      // swap the selected token's actor in as the target for the roll
      if (!canvas?.tokens || canvas.tokens.controlled.length !== 1) {
        ui.notifications.warn('SWADE.NoTokenSelectedForResistRoll', {
          localize: true,
        });
        button.disabled = false;
        return null;
      }
      actor = canvas.tokens.controlled[0].actor ?? actor;
    } else if (
      !actor.isOwner &&
      !message.isAuthor &&
      actionObj?.type !== constants.ACTION_TYPE.MACRO
    ) {
      // For non-resist types, don't allow a roll unless the message author is the user clicking the button or it's a macro action
      button.disabled = false;
      return null;
    }

    //if it's a power and the No Power Points rule is in effect
    if (item.type === 'power' && game.settings.get('swade', 'noPowerPoints')) {
      const ppCost = card.querySelector<HTMLInputElement>('input.pp-adjust')
        .value as number;
      let modifier = Math.ceil(ppCost / 2);
      modifier = Math.min(modifier * -1, modifier);
      if (action === 'formula' || actionObj?.type === 'trait') {
        additionalMods.push({
          label: game.i18n.localize('TYPES.Item.power'),
          value: modifier,
        });
      }
    }

    if (action === 'template') {
      const template = button.dataset.template!;
      SwadeMeasuredTemplate.fromPreset(template, item);
      button.disabled = false;
      return null;
    }

    if (!actor) return null;

    const roll = await this.handleAction(item, actor, action, {
      additionalMods,
      event,
    });

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
    {
      additionalMods = [],
      event,
    }: { additionalMods: RollModifier[]; event?: Event }
  ): Promise<SwadeRoll<any> | null> {
    let roll: SwadeRoll<any> | null = null;

    switch (action) {
      case 'damage':
        roll = await this.handleDamageAction(item, actor, additionalMods);
        break;
      case 'formula':
        roll = await this.handleFormulaAction(item, actor, additionalMods, {
          event,
        });
        break;
      case 'arcane-device':
        roll = await actor.makeArcaneDeviceSkillRoll(
          foundry.utils.getProperty(item, 'system.arcaneSkillDie')
        );
        break;
      case 'reload':
        await item.reload();
        await this.refreshItemCard(actor);
        break;
      case 'consume':
        await item.consume();
        await this.refreshItemCard(actor);
        break;
      default:
        roll = await this.handleAdditionalActions(item, actor, action, {
          mods: additionalMods,
          event,
        });
        // No need to call the hook here, as handleAdditionalActions already calls the hook
        // This is so an external API can directly use handleAdditionalActions to use an action and still fire the hook
        break;
    }
    return roll;
  }

  static async handleFormulaAction(
    item: SwadeItem,
    actor: SwadeActor,
    additionalMods: RollModifier[] = [],
    { event }: { mods: RollModifier[]; event?: Event }
  ) {
    const traitName = foundry.utils.getProperty(item, 'system.actions.trait');
    const button = event?.target as HTMLButtonElement;
    const card = button?.closest('.chat-card') as HTMLElement;

    let costOverride = undefined;
    if (item.type === 'power') {
      costOverride =
        card?.querySelector('input.pp-adjust')?.valueAsNumber ??
        item.system.ppModifiers.cost;
    }
    const canExpend =
      costOverride !== undefined
        ? item.canExpendResources(costOverride)
        : item.canExpendResources();
    if (!canExpend) {
      Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
      return null;
    }

    additionalMods.push(...item.traitModifiers);
    const trait = getTrait(traitName, actor);
    const roll = await this.doTraitAction(trait, actor, {
      additionalMods,
      item: item,
    });
    if (roll && !item.isMeleeWeapon) await item.consume();
    this.callActionHook(actor, item, 'formula', roll);
    return roll;
  }

  static async handleDamageAction(
    item: SwadeItem,
    actor: SwadeActor,
    additionalMods: RollModifier[] = []
  ) {
    const dmgMod = ItemChatCardHelper.getDamageMod(item);
    if (dmgMod) additionalMods.push(dmgMod);
    const roll = await item.rollDamage({ additionalMods });
    this.callActionHook(actor, item, 'damage', roll);
    return roll;
  }

  /**
   * Handles misc actions
   * @param item The item that this action is used on
   * @param actor The actor who has the item
   * @param key The action key
   * @returns the evaluated roll
   */
  static async handleAdditionalActions(
    item: SwadeItem,
    actor: SwadeActor,
    key: string,
    { mods = [], event }: { mods: RollModifier[]; event?: Event }
  ): Promise<SwadeRoll<any> | null> {
    const action = foundry.utils.getProperty(
      item,
      `system.actions.additional.${key}`
    ) as ItemAction;

    // if there isn't actually any action then return early
    if (!action) return null;

    let roll: SwadeRoll<any> | null = null;

    if (
      action.type === constants.ACTION_TYPE.TRAIT ||
      action.type === constants.ACTION_TYPE.RESIST
    ) {
      //set the trait name and potentially override it via the action
      const traitName =
        action.override ||
        foundry.utils.getProperty(item, 'system.actions.trait');

      //find the trait and either get the skill item or the key of the attribute
      const trait = getTrait(traitName, actor);

      if (action.modifier) {
        mods.push({
          label: action.name,
          value: action.modifier,
        });
      }

      if (item.type === 'weapon') {
        if (!item.canExpendResources(action.resourcesUsed ?? 1)) {
          Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
          return null;
        }
      }

      mods.push(...item.traitModifiers);

      roll = await this.doTraitAction(trait, actor, {
        flavour: action.name,
        rof: action.dice,
        additionalMods: mods,
        item: item,
      });
      if (
        roll &&
        item.type === 'weapon' &&
        action.type === constants.ACTION_TYPE.TRAIT
      ) {
        await item.consume(action.resourcesUsed ?? 1);
      }
    } else if (action.type === constants.ACTION_TYPE.DAMAGE) {
      //Do Damage stuff
      const dmgMod = ItemChatCardHelper.getDamageMod(item);
      if (dmgMod) mods.push(dmgMod);
      if (action.modifier) {
        mods.push({
          label: action.name,
          value: action.modifier,
        });
      }
      roll = await item.rollDamage({
        dmgOverride: action.override,
        isHeavyWeapon: action.isHeavyWeapon,
        flavour: action.name,
        additionalMods: mods,
        ap: action.ap,
      });
    } else if (action.type === constants.ACTION_TYPE.MACRO) {
      if (!action.uuid) return null;
      const macro = (await fromUuid(action.uuid)) as Macro | null;
      if (!macro) {
        Logger.warn(
          game.i18n.format('SWADE.CouldNotFindMacro', { uuid: action.uuid }),
          { toast: true }
        );
      }
      let targetActor;
      let targetToken;
      if (action.macroActor === constants.MACRO_ACTOR.SELF) {
        targetActor = item.actor;
      } else if (action.macroActor === constants.MACRO_ACTOR.TARGET) {
        targetToken = game.user!.targets.first();
        if (targetToken) targetActor = targetToken.actor;
        if (!targetActor) {
          ui.notifications.error('SWADE.CouldNotFindTarget', {
            localize: true,
          });
          return null;
        }
      }
      await macro?.execute({
        actor: targetActor,
        item,
        token: targetToken,
        event,
      });
      return null;
    }
    this.refreshItemCard(actor);
    this.callActionHook(actor, item, key, roll);
    return roll;
  }

  static async doTraitAction(
    trait: string | SwadeItem | null | undefined,
    actor: SwadeActor,
    options: IRollOptions
  ): Promise<TraitRoll | null> {
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
      'text/html'
    );

    const messageData = content.querySelector('.chat-card.item-card').dataset;

    const item = actor.items.get(messageData.itemId);
    function setTextIfPresent(selector: string, text: string) {
      const field = content.querySelector(selector);
      if (field) field.textContent = text;
    }
    if (item?.type === 'weapon') {
      const currentShots = item.system.currentShots;
      const maxShots = item.system.shots;

      //update message content
      setTextIfPresent('.ammo-counter .current-shots', currentShots);
      setTextIfPresent('.ammo-counter .max-shots', maxShots);
    }

    if (item?.type === 'power') {
      const arcane = item.system.arcane || 'general';
      const curPP = foundry.utils.getProperty(
        actor,
        `system.powerPoints.${arcane}.value`
      );
      const maxPP = foundry.utils.getProperty(
        actor,
        `system.powerPoints.${arcane}.max`
      );
      //update message content
      setTextIfPresent('.pp-counter .current-pp', curPP);
      setTextIfPresent('.pp-counter .max-pp', maxPP);
    }

    if (item?.type === 'consumable') {
      //update message content
      const charges = item.system.charges.default;
      setTextIfPresent('.pp-counter .current-pp', charges.value);
      setTextIfPresent('.pp-counter .max-pp', charges.max);
    }

    if (item?.isArcaneDevice) {
      const currentPP = foundry.utils.getProperty(
        item,
        'system.powerPoints.value'
      );
      const maxPP = foundry.utils.getProperty(item, 'system.powerPoints.max');
      //update message content
      setTextIfPresent('.pp-counter .current-pp', currentPP);
      setTextIfPresent('.pp-counter .max-pp', maxPP);
    }

    //update the message and render the chatlog/chat popout
    await message.update({ content: content.body.innerHTML });
    // ui.chat?.render(true);
    for (const appId in message.apps) {
      const app = message.apps[appId] as FormApplication;
      if (app.rendered) {
        app.render(true);
      }
    }
  }

  /** @internal */
  private static callActionHook(
    actor: SwadeActor,
    item: SwadeItem,
    action: string,
    roll: SwadeRoll<any> | null
  ) {
    if (!roll) return; // Do not trigger the hook if the roll was cancelled
    /** @category Hooks */
    Hooks.call('swadeAction', actor, item, action, roll, game.userId);
  }

  private static getDamageMod(item: SwadeItem): RollModifier | null {
    const value = foundry.utils.getProperty(
      item,
      'system.actions.dmgMod'
    ) as string;
    if (!value) return null;

    // Ensure `item.name` exists to avoid errors
    const itemName = item?.name ?? game.i18n.localize('SWADE.Item');

    // Localize the label and include the item name
    let label = `${itemName} ${game.i18n.localize('SWADE.ItemDmgMod')}`;

    // If the value starts with "@", use an empty label
    if (value.startsWith('@')) {
      label = ''; // Empty label for a modifier
    }

    return { label, value };
  }
}
