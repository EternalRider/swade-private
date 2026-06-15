import { AnyMutableObject } from 'fvtt-types/utils';
import { Updates } from '../../../globals';
import { Logger } from '../../Logger';
import { getStatusEffectDataById } from '../../util';
// import type SwadeCombat from './SwadeCombat';

declare global {
  interface DocumentClassConfig {
    Combatant: typeof SwadeCombatant<Combatant.SubType>;
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
        'jokerBenniesGiven',
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
    return (this.actor && 'isIncapacitated' in this.actor.system && this.actor.system.isIncapacitated) as boolean;
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
      if (this.group.system?.leader) return this.group.system.leader === this.id;
      else return this.group.members?.first() === this;
    }
  }

  get groupLeader() {
    if (!this.group) return undefined;
    return this.group.system.leaderCombatant;
  }

  async setIsGroupLeader(groupLeader: boolean) {
    if (!this.group) return null;

    if (!groupLeader) {
      // No longer group leader, remove initiative.
      await this.resetInitiative();
    } else if (this.groupLeader?.id != this.id) {
      // Remove initiative of previous group leader.
      await this.groupLeader?.resetInitiative();
    }

    return this.group.update({ 'system.leader': groupLeader ? this.id : null });
  }

  async setGroup(groupId) {
    const group = this.combat?.groups.get(groupId);
    if (!group) return undefined;

    const existingLeader = this.combat?.getGroupLeader(groupId);
    await this.update({ group: groupId });

    if (existingLeader) {
      // If the group already has a leader, clear this combatant's initiative. No initiative for followers!
      await this.resetInitiative();
    } else {
      // If the group had no leader, become the leader.
      await this.setIsGroupLeader(true);
    }
  }

  /**
   * Follows the given combatant if existing in the combat, joining its group or forming one if necessary.
   * @param leader The combatant to follow.
   * @returns The joined group, if any.
   */
  async follow(leader: string | SwadeCombatant) {
    const group = await this.combat?.getGroupForCombatant(leader, {
      createIfNotInGroup: true,
      preferDisposition: this.token?.disposition,
    });
    if (!group) return undefined;

    await this.setGroup(group.id);
    return group;
  }

  async removeFromGroup() {
    const group = this.group;
    if (!group) return undefined;
    await this.resetGroupInitiativeIfLeader();
    await this.update({ group: null });
    if (group?.members?.size < 1) {
      // Group is now empty, delete.
      await group?.delete();
    }
  }

  protected _getInitResetUpdate(): Record<string, unknown> | undefined {
    if (this.roundHeld) {
      if (this.turnLost) {
        return {
          initiative: null,
          system: {
            hasJoker: false,
            '-=turnLost': null,
            jokerBenniesGiven: false,
          },
        };
      } else {
        // Keep the card.
        return;
      }
    }
    let lastInitiative = this.initiative ?? 0;
    if (this.group && !this.isGroupLeader) {
      lastInitiative ??= this.group.initiative ?? this.group.system.lastInitiative;
      const leaderTurnNumber = this.parent.getGroupLeader(this.group.id).turnNumber;
      const adjustment = 0.01 * (leaderTurnNumber - this.turnNumber);
      lastInitiative -= adjustment;
    }
    return {
      initiative: null,
      system: {
        suitValue: null,
        cardValue: null,
        hasJoker: false,
        cardString: '',
        turnLost: false,
        lastInitiative,
        jokerBenniesGiven: false,
      }
    };
  }

  async resetInitiative() {
    const update = this._getInitResetUpdate();
    if (update) {
      await this.update(update);
    }
    return this.resetGroupInitiativeIfLeader();
  }

  async resetGroupInitiativeIfLeader() {
    if (!game.user.isGM || !this.isGroupLeader || !this?.group?.initiative) return;
    return this.group?.update({ initiative: null, 'system.lastInitiative': this.group.initiative });
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

  async assignNewActionCard(cardId: string | null) {
    const combat = this.combat;
    if (!combat) return;
    //grab the action deck;
    const deck = game.cards!.get(game.settings.get('swade', 'actionDeck'), {
      strict: true,
    });
    if (!cardId) return this.resetInitiative();

    const card = deck.cards.get(cardId, { strict: true });

    const cardValue = card.value as number;
    const suitValue = card.system['suit'] as number;
    const hasJoker = card.system['isJoker'] as boolean;
    const cardString = card.description;

    //move the card to the discard pile, if its not drawn
    if (!card.drawn) {
      const discardPile = game.cards!.get(game.settings.get('swade', 'actionDeckDiscardPile'), { strict: true });
      await card.discard(discardPile, { chatNotification: false });
    }

    //update the combatant with the new card
    const updates = new Array<Updates>();
    const initiative = cardValue + suitValue / 10;
    updates.push({
      _id: this.id,
      initiative,
      system: { cardValue, suitValue, hasJoker, cardString, jokerBenniesGiven: false },
    });

    await combat?.updateEmbeddedDocuments('Combatant', updates);
  }

  async toggleHold() {
    if (!this.parent) return;
    const data = getStatusEffectDataById('holding');
    if (!data) throw new Error('Could not find an effect with ID of "holding"');
    if (!this.roundHeld) {
      const round = Math.max(this.parent.round, 1);
      await Promise.all([this.setRoundHeld(round), this.actor?.toggleActiveEffect(data, { active: true })]);
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

  override async update(data, operation) {
    const ret = await super.update(data, operation);
    if (game.users.activeGM?.isSelf && Object.hasOwn(data, 'initiative') && this.isGroupLeader) {
      await this.group?.update({ initiative: this.initiative });
    }
    return ret;
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
      (t) => (t.initiative ?? 0) < targetInitiative + 1 && (t.initiative ?? 0) > targetInitiative
    );
    for (const t of otherInterruptors) {
      // Decrement the initiative to be assigned by a tiny decimal value per other interruptor.
      if (Math.abs((t.initiative ?? 0) - initiative) < Number.EPSILON) initiative = (t.initiative ?? 0) - 0.000001;
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
    user: User.Implementation
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
