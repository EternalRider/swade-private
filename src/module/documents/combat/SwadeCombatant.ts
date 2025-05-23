import { AnyMutableObject } from 'fvtt-types/utils';
import { Updates } from '../../../globals';
import { Logger } from '../../Logger';
import { getStatusEffectDataById } from '../../util';
// import type SwadeCombat from './SwadeCombat';

declare global {
  interface DocumentClassConfig {
    Combatant: typeof SwadeCombatant;
  }
}

export default class SwadeCombatant<
  out SubType extends Combatant.SubType = Combatant.SubType,
> extends Combatant<SubType> {
  static override migrateData(data: AnyMutableObject) {
    const flags = data.flags?.swade;

    if (flags) {
      const keys = [
        'suitValue',
        'cardValue',
        'cardString',
        'hasJoker',
        'roundHeld',
        'turnLost',
        'firstRound',
      ];
      data.system ??= {};

      for (const key of keys) {
        if (key in flags) {
          data.system[key] = flags[key];
          delete flags[key];
        }
      }
    }

    return super.migrateData(data);
  }

  get isIncapacitated(): boolean {
    return (this.actor &&
      'isIncapacitated' in this.actor.system &&
      this.actor.system.isIncapacitated) as boolean;
  }

  override get isDefeated(): boolean {
    if (!this.actor?.isWildcard) {
      return this.isIncapacitated || super.isDefeated;
    }
    return super.isDefeated;
  }

  get suitValue() {
    return this.system.suitValue;
  }

  async setCardValue(cardValue: number) {
    return this.update({ 'system.cardValue': cardValue });
  }

  get cardValue() {
    return this.system.cardValue;
  }

  async setSuitValue(suitValue: number) {
    return this.update({ 'system.suitValue': suitValue });
  }

  get cardString() {
    return this.system.cardString;
  }

  async setCardString(cardString: string) {
    return this.update({ 'system.cardString': cardString });
  }

  get hasJoker() {
    return !!this.system.hasJoker;
  }

  async setJoker(joker: boolean) {
    return this.update({ 'system.hasJoker': joker });
  }

  get isGroupLeader() {
    if (!this.group) return false;
    else {
      if (this.group.system?.leader)
        return this.group.system.leader === this.id;
      else return this.group.members?.first() === this;
    }
  }

  async setIsGroupLeader(groupLeader: boolean) {
    if (!this.group) return null;
    return this.group.update({ 'system.leader': groupLeader ? this.id : null });
  }

  async unsetIsGroupLeader() {
    return this.group?.update({ 'system.leader': null });
  }

  get roundHeld() {
    return this.system.roundHeld;
  }

  async setRoundHeld(roundHeld: number) {
    return this.update({ 'system.roundHeld': roundHeld });
  }

  get turnLost() {
    return !!this.system.turnLost;
  }

  async setTurnLost(turnLost: boolean) {
    return this.update({ 'system.turnLost': turnLost });
  }

  get cardsToDraw(): number {
    let cardsToDraw = 1;
    if (!!this.initiative && !this.roundHeld) return cardsToDraw;
    const actor = this.actor;
    if (!actor || !('initiative' in actor.system)) return cardsToDraw;
    const initiative = actor.system.initiative;
    if (initiative?.hasLevelHeaded || initiative?.hasHesitant) cardsToDraw = 2;
    if (initiative?.hasImpLevelHeaded) cardsToDraw = 3;
    if (actor.type !== 'vehicle' && this.isIncapacitated) cardsToDraw = 1;
    return cardsToDraw;
  }

  async assignNewActionCard(cardId: string) {
    const combat = this.combat;
    if (!combat) return;
    //grab the action deck;
    const deck = game.cards!.get(game.settings.get('swade', 'actionDeck'), {
      strict: true,
    });
    const card = deck.cards.get(cardId, { strict: true });

    const cardValue = card.value as number;
    const suitValue = card.system['suit'] as number;
    const hasJoker = card.system['isJoker'] as boolean;
    const cardString = card.description;

    //move the card to the discard pile, if its not drawn
    if (!card.drawn) {
      const discardPile = game.cards!.get(
        game.settings.get('swade', 'actionDeckDiscardPile'),
        { strict: true },
      );
      await card.discard(discardPile, { chatNotification: false });
    }

    //update the combatant with the new card
    const updates = new Array<Updates>();
    const initiative = cardValue + suitValue / 10;
    updates.push({
      _id: this.id,
      initiative,
      system: { cardValue, suitValue, hasJoker, cardString },
    });

    await combat?.updateEmbeddedDocuments('Combatant', updates);
  }

  async toggleHold() {
    if (!this.parent) return;
    const data = getStatusEffectDataById('holding');
    if (!data) throw new Error('Could not find an effect with ID of "holding"');
    if (!this.roundHeld) {
      const round = Math.max(this.parent.round, 1);
      await Promise.all([
        this.setRoundHeld(round),
        this.actor?.toggleActiveEffect(data, { active: true }),
      ]);
    } else {
      await Promise.all([
        this.update({ 'system.-=roundHeld': null }),
        this.actor?.toggleActiveEffect(data, { active: false }),
      ]);
    }
    await this.parent.debounceSetup(); //hold icon wouldn't always clear
  }

  async toggleTurnLost() {
    if (!this.parent) return;
    const data = getStatusEffectDataById('holding');
    if (!data) throw new Error('Could not find an effect with ID of "holding"');
    if (!this.turnLost) {
      await this.update({
        system: {
          turnLost: true,
          '-=roundHeld': null,
        },
      });
      await this.actor?.toggleActiveEffect(data, { active: false });
    } else {
      await this.update({
        system: {
          roundHeld: this.parent.round,
          turnLost: false,
        },
      });
      await this.actor?.toggleActiveEffect(data, { active: false });
    }
  }

  async actNow() {
    if (!this.parent || !game.user?.isGM) return;
    const data = getStatusEffectDataById('holding');
    if (!data) throw new Error('Could not find an effect with ID of "holding"');
    let targetCombatant = this.parent.combatant as SwadeCombatant | undefined;
    if (this.id === targetCombatant?.id) {
      targetCombatant = this.parent.turns.find((c) => !c.roundHeld)!;
    }
    const targetInitiative = targetCombatant?.initiative ?? 0;
    let initiative = targetInitiative + 0.0001;
    // Get the other turns that interrupted this target combatant
    const otherInterruptors = this.parent.turns.filter(
      (t) =>
        (t.initiative ?? 0) < targetInitiative + 1 &&
        (t.initiative ?? 0) > targetInitiative,
    );
    for (const t of otherInterruptors) {
      // Decrement the initiative to be assigned by a tiny decimal value per other interruptor.
      if (Math.abs((t.initiative ?? 0) - initiative) < Number.EPSILON)
        initiative = (t.initiative ?? 0) - 0.000001;
    }
    await this.update({
      initiative,
      system: {
        cardValue: targetCombatant?.cardValue,
        suitValue: targetCombatant?.suitValue,
        cardString: '',
        '-=roundHeld': null,
      },
    });
    await this.actor?.toggleActiveEffect(data, { active: false });
    await this.parent.update({
      turn: this.parent.turns.findIndex((c) => c.id === this.id),
    });
    await this.parent.render(false);
  }

  async actAfterCurrentCombatant() {
    if (!this.parent || !game.user?.isGM) return;
    const data = getStatusEffectDataById('holding');
    if (!data) throw new Error('Could not find an effect with ID of "holding"');
    const currentCombatant = this.parent.combatant as SwadeCombatant;
    await this.update({
      initiative: (currentCombatant?.initiative ?? 0) - 0.0001,
      system: {
        cardValue: currentCombatant?.cardValue,
        suitValue: currentCombatant?.suitValue,
        cardString: '',
        '-=roundHeld': null,
      },
    });
    await this.actor?.toggleActiveEffect(data, { active: false });
    await this.parent.update({
      turn: this.parent.turns.findIndex((c) => c.id === currentCombatant?.id),
    });
    await this.parent.render(false);
  }

  override async _preCreate(
    data: Combatant.CreateData,
    options: Combatant.Database.PreUpdateOptions,
    user: User.Implementation,
  ) {
    if (this.actor?.type === 'group') {
      Logger.warn('SWADE.Validation.NoGroupCombatants', {
        localize: true,
        toast: true,
      });
      return false;
    }
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
  }
}
