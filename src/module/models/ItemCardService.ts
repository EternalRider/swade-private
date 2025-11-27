import { Attribute } from '../../globals';
import {
  ItemAction,
  RollModifier,
} from '../../interfaces/additional.interface';
import IRollOptions from '../../interfaces/RollOptions.interface';
import { constants } from '../constants';
import { DamageRoll } from '../dice/DamageRoll';
import { TraitRoll } from '../dice/TraitRoll';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';
import { Logger } from '../Logger';
import { getTrait } from '../util';

export default class ItemCardService {
  gatherRollModifiers(ctx: ModifierDeterminationContext): RollModifier[] {
    const { item, html, action, actionObj } = ctx;
    const mods: RollModifier[] = [];

    //if it's a power and the No Power Points rule is in effect add the power cost as a modifier to the roll
    if (item.type === 'power' && game.settings.get('swade', 'noPowerPoints')) {
      const ppCost =
        html.querySelector<HTMLInputElement>('input.pp-adjust')
          ?.valueAsNumber ?? 0;
      let modifier = Math.ceil(ppCost / 2);
      modifier = Math.min(modifier * -1, modifier);
      if (
        action === 'formula' ||
        actionObj?.type === constants.ACTION_TYPE.TRAIT
      ) {
        mods.push({
          label: game.i18n.localize('TYPES.Item.power'),
          value: modifier,
        });
      }
    }

    return mods;
  }

  async handleFormulaAction(
    item: SwadeItem,
    actor: SwadeActor,
    additionalMods: RollModifier[] = [],
    html?: HTMLElement,
  ) {
    const traitName = foundry.utils.getProperty(item, 'system.actions.trait');

    let costOverride = undefined;
    if (item.type === 'power') {
      costOverride =
        html?.querySelector<HTMLInputElement>('input.pp-adjust')
          ?.valueAsNumber ?? item.system.ppModifiers.cost;
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
    const roll = await this.#doTraitAction(trait, actor, {
      additionalMods,
      item,
    });
    if (roll && !item.isMeleeWeapon) await item.consume();
    this.#callActionHook(item, actor, 'formula', roll);
    return roll;
  }

  async handleDamageAction(
    item: SwadeItem,
    actor: SwadeActor,
    additionalMods: RollModifier[] = [],
  ) {
    const dmgMod = this.#getDamageMod(item);
    if (dmgMod) additionalMods.push(dmgMod);
    const roll = await item.rollDamage({ additionalMods });
    this.#callActionHook(item, actor, 'damage', roll);
    return roll;
  }

  /**
   * Handles misc actions
   * @param item The item that this action is used on
   * @param actor The actor who has the item
   * @param key The action key
   * @returns the evaluated roll
   */
  async handleAdditionalAction(
    item: SwadeItem,
    actor: SwadeActor,
    action: ItemAction | undefined,
    key: string,
    additionalMods: RollModifier[] = [],
    event?: Event,
  ): Promise<TraitRoll | DamageRoll | null> {
    if (!action) return null;
    let roll: TraitRoll | DamageRoll | null = null;

    if (
      action.type === constants.ACTION_TYPE.TRAIT ||
      action.type === constants.ACTION_TYPE.RESIST
    ) {
      roll = await this.#handleTraitAction(action, item, actor, additionalMods);
    } else if (action.type === constants.ACTION_TYPE.DAMAGE) {
      //Do Damage stuff
      roll = await this.#handleDamageAction(action, item, additionalMods);
    } else if (action.type === constants.ACTION_TYPE.MACRO) {
      await this.#handleMacroAction(action, item, event);
      return null;
    }
    this.#callActionHook(item, actor, key, roll);
    return roll;
  }

  async handlePowerPoints(
    item: SwadeItem,
    actor: SwadeActor,
    btn: HTMLButtonElement,
    html: HTMLElement,
  ): Promise<void> {
    //bail early if the No Power points rule is in effect
    if (game.settings.get('swade', 'noPowerPoints')) return;
    const ppCost =
      html.querySelector<HTMLInputElement>('input.pp-adjust')?.valueAsNumber ??
      0;
    const adjustment = btn.dataset.adjust;

    if (item.type === 'power') {
      //handle Power Item Card PP adjustment
      const arcane = foundry.utils.getProperty(item, 'system.arcane');
      const key = `system.powerPoints.${arcane || 'general'}.value`;
      const oldPP = foundry.utils.getProperty(actor, key) as number;
      if (adjustment === 'plus') {
        await actor.update({ [key]: oldPP + ppCost });
      } else if (adjustment === 'minus') {
        await actor.update({ [key]: oldPP - ppCost });
      }
    } else if (item.type === 'weapon' && item.isArcaneDevice) {
      //handle Arcane Device Item Card PP adjustment
      const key = 'system.powerPoints.value';
      const oldPP = foundry.utils.getProperty(item, key) as number;
      if (adjustment === 'plus') {
        await item.update({ [key]: oldPP + ppCost });
      } else if (adjustment === 'minus') {
        await item.update({ [key]: oldPP - ppCost });
      }
    }
  }

  async #handleTraitAction(
    action: ItemAction,
    item: SwadeItem,
    actor: SwadeActor,
    additionalMods: RollModifier[],
  ): Promise<TraitRoll | null> {
    //set the trait name and potentially override it via the action
    const traitName =
      action.override ||
      foundry.utils.getProperty(item, 'system.actions.trait');

    //find the trait and either get the skill item or the key of the attribute
    const trait = getTrait(traitName, actor);

    if (action.modifier) {
      additionalMods.push({
        label: action.name,
        value: action.modifier,
      });
    }

    if (
      item.type === 'weapon' &&
      !item.canExpendResources(action.resourcesUsed ?? 1)
    ) {
      Logger.warn('SWADE.NotEnoughAmmo', { localize: true, toast: true });
      return null;
    }

    additionalMods.push(...item.traitModifiers);

    const roll = await this.#doTraitAction(trait, actor, {
      flavour: action.name,
      rof: action.dice,
      additionalMods,
      item: item,
    });
    const shouldConsume =
      !!roll &&
      item.type === 'weapon' &&
      action.type === constants.ACTION_TYPE.TRAIT;
    if (shouldConsume) {
      await item.consume(action.resourcesUsed ?? 1);
    }
    return roll;
  }

  async #handleDamageAction(
    action: ItemAction,
    item: SwadeItem,
    additionalMods: RollModifier[],
  ): Promise<DamageRoll | null> {
    const dmgMod = this.#getDamageMod(item);
    if (dmgMod) additionalMods.push(dmgMod);
    if (action.modifier) {
      additionalMods.push({
        label: action.name,
        value: action.modifier,
      });
    }
    return item.rollDamage({
      dmgOverride: action.override,
      isHeavyWeapon: action.isHeavyWeapon,
      flavour: action.name,
      ap: action.ap,
      additionalMods,
    });
  }

  async #handleMacroAction(
    action: ItemAction,
    item: SwadeItem,
    event?: Event,
  ): Promise<void> {
    if (!action.uuid) return;
    const macro = (await fromUuid(action.uuid)) as Macro | null;
    if (!macro) {
      Logger.warn(
        game.i18n.format('SWADE.CouldNotFindMacro', { uuid: action.uuid }),
        { toast: true },
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
      }
    }
    await macro?.execute({
      actor: targetActor,
      item,
      token: targetToken,
      event,
    });
  }

  #getDamageMod(item: SwadeItem): RollModifier | null {
    const value: string | undefined = foundry.utils.getProperty(
      item,
      'system.actions.dmgMod',
    );
    if (!value) return null;

    let label = '';
    //localize the label if it's not parsed from roll data
    if (!value.startsWith('@')) {
      label = `${item.name} ${game.i18n.localize('SWADE.ItemDmgMod')}`; // Localize the label and include the item name
    }
    return { label, value };
  }

  async #doTraitAction(
    trait: string | SwadeItem | undefined,
    actor: SwadeActor,
    options: IRollOptions,
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

  #callActionHook(
    item: SwadeItem,
    actor: SwadeActor,
    action: string,
    roll: TraitRoll | DamageRoll | null,
  ) {
    if (!roll) return; // Do not trigger the hook if the roll was cancelled
    /** @category Hooks */
    Hooks.call('swadeAction', actor, item, action, roll, game.userId);
  }
}

interface ModifierDeterminationContext {
  html: HTMLElement;
  item: SwadeItem;
  action: string;
  actionObj: ItemAction | undefined;
}
