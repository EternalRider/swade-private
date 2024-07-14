import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { Updates } from '../../../globals';
import { SWADE } from '../../config';
import { firstOwner, getStatusEffectDataById } from '../../util';
import type SwadeCombat from './SwadeCombat';

declare global {
  interface DocumentClassConfig {
    Combatant: typeof SwadeCombatant;
  }

  interface FlagConfig {
    Combatant: {
      swade: {
        suitValue?: number;
        cardValue?: number;
        cardString?: string;
        hasJoker?: boolean;
        groupId?: string;
        isGroupLeader?: boolean;
        roundHeld?: number;
        turnLost?: boolean;
        firstRound?: number;
        groupColor?: string;
        [key: string]: unknown;
      };
    };
  }
}

export default class SwadeCombatant extends Combatant {
  get isIncapacitated(): boolean {
    return !!this.actor?.system?.isIncapacitated;
  }

  override get isDefeated(): boolean {
    if (!this.actor?.isWildcard) {
      return this.isIncapacitated || super.isDefeated;
    }
    return super.isDefeated;
  }

  get followers(): SwadeCombatant[] {
    const combat = this.parent as SwadeCombat;
    return (combat?.combatants.filter((f) => f.groupId === this.id) ??
      []) as SwadeCombatant[];
  }

  get suitValue() {
    return this.getFlag('swade', 'suitValue');
  }

  async setCardValue(cardValue: number) {
    return this.setFlag('swade', 'cardValue', cardValue);
  }

  get cardValue() {
    return this.getFlag('swade', 'cardValue');
  }

  async setSuitValue(suitValue: number) {
    return this.setFlag('swade', 'suitValue', suitValue);
  }

  get cardString() {
    return this.getFlag('swade', 'cardString');
  }

  async setCardString(cardString: string) {
    return this.setFlag('swade', 'cardString', cardString);
  }

  get hasJoker() {
    return !!this.getFlag('swade', 'hasJoker');
  }

  async setJoker(joker: boolean) {
    return this.setFlag('swade', 'hasJoker', joker);
  }

  get groupId() {
    return this.getFlag('swade', 'groupId');
  }

  async setGroupId(groupId: string) {
    return this.setFlag('swade', 'groupId', groupId);
  }

  async unsetGroupId() {
    return this.unsetFlag('swade', 'groupId');
  }

  get isGroupLeader() {
    return !!this.getFlag('swade', 'isGroupLeader');
  }

  async setIsGroupLeader(groupLeader: boolean) {
    return this.setFlag('swade', 'isGroupLeader', groupLeader);
  }

  async unsetIsGroupLeader() {
    return this.unsetFlag('swade', 'isGroupLeader');
  }

  get roundHeld() {
    return this.getFlag('swade', 'roundHeld');
  }

  async setRoundHeld(roundHeld: number) {
    return this.setFlag('swade', 'roundHeld', roundHeld);
  }

  get turnLost() {
    return !!this.getFlag('swade', 'turnLost');
  }

  async setTurnLost(turnLost: boolean) {
    return this.setFlag('swade', 'turnLost', turnLost);
  }

  get cardsToDraw(): number {
    let cardsToDraw = 1;
    if (!!this.initiative && !this.roundHeld) return cardsToDraw;
    const actor = this.actor;
    if (!actor) return cardsToDraw;
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
      'flags.swade': { cardValue, suitValue, hasJoker, cardString },
    });

    //update followers, if applicable
    if (this.isGroupLeader) {
      const followers = combat!.combatants.filter((f) => f.groupId === this.id);
      let fInitiative = initiative;
      for (const follower of followers) {
        updates.push({
          _id: follower.id,
          initiative: (fInitiative -= 0.001), //card value is the primary sort value, followed by the suit, so treat the suit as a decimal value.
          'flags.swade': {
            cardString,
            cardValue,
            hasJoker,
            suitValue,
          },
        });
      }
    }
    await combat?.updateEmbeddedDocuments('Combatant', updates);
  }

  async toggleHold() {
    if (!this.parent) return;
    const data = getStatusEffectDataById('holding');
    if (!this.roundHeld) {
      const round = Math.max(this.parent.round, 1);
      // Add flag for on hold to show icon on token
      await Promise.all([
        this.setRoundHeld(round),
        this.actor?.toggleActiveEffect(data, { active: true }),
      ]);
    } else {
      await Promise.all([
        this.unsetFlag('swade', 'roundHeld'),
        this.actor?.toggleActiveEffect(data, { active: false }),
      ]);
    }
    await this.parent.debounceSetup(); //hold icon wouldn't always clear
  }

  async toggleTurnLost() {
    if (!this.parent) return;
    const data = getStatusEffectDataById('holding');
    if (!this.turnLost) {
      await this.update({
        'flags.swade': {
          turnLost: true,
          '-=roundHeld': null,
        },
      });
      await this.actor?.toggleActiveEffect(data, { active: false });
    } else {
      await this.update({
        'flags.swade': {
          roundHeld: this.parent.round,
          '-=turnLost': null,
        },
      });
      await this.actor?.toggleActiveEffect(data, { active: false });
    }
  }

  async actNow() {
    if (!this.parent || !game.user?.isGM) return;
    const data = getStatusEffectDataById('holding');
    let targetCombatant = this.parent.combatant as SwadeCombatant;
    if (this.id === targetCombatant?.id) {
      targetCombatant = this.parent.turns.find((c) => !c.roundHeld)!;
    }
    const targetInitiative = targetCombatant?.initiative ?? 0;
    let initiative = targetInitiative + 0.0001;
    // Get the other turns that interrupted this target combatant
    const otherInterruptors = this.parent.turns.filter(
      (t) =>
        t.initiative < targetInitiative + 1 && t.initiative > targetInitiative,
    );
    for (const t of otherInterruptors) {
      // Decrement the initiative to be assigned by a tiny decimal value per other interruptor.
      if (Math.abs(t.initiative - initiative) < Number.EPSILON)
        initiative = t.initiative - 0.000001;
    }
    await this.update({
      initiative,
      flags: {
        swade: {
          cardValue: targetCombatant?.cardValue,
          suitValue: targetCombatant?.suitValue,
          cardString: '',
          '-=roundHeld': null,
        },
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
    const currentCombatant = this.parent.combatant as SwadeCombatant;
    await this.update({
      initiative: currentCombatant?.initiative - 0.0001,
      flags: {
        swade: {
          cardValue: currentCombatant?.cardValue,
          suitValue: currentCombatant?.suitValue,
          cardString: '',
          '-=roundHeld': null,
        },
      },
    });
    await this.actor?.toggleActiveEffect(data, { active: false });
    await this.parent.update({
      turn: this.parent.turns.findIndex((c) => c.id === currentCombatant?.id),
    });
    await this.parent.render(false);
  }

  override async _preCreate(
    data: CombatantDataConstructorData,
    options: DocumentModificationOptions,
    user: BaseUser,
  ) {
    await super._preCreate(data, options, user);
    const combatants = game?.combat?.combatants.size ?? 0;
    const tokenID =
      data.tokenId instanceof TokenDocument ? data.tokenId.id : data.tokenId;
    const tokenIndex =
      canvas.tokens?.controlled.map((t) => t.id).indexOf(tokenID as string) ??
      0;
    const sortValue = tokenIndex + combatants;
    this.updateSource({
      flags: {
        swade: {
          firstRound: this.combat?.round,
          cardValue: sortValue,
          suitValue: sortValue,
        },
      },
    });
  }

  override _onUpdate(
    changed: foundry.documents.BaseCombatant.UpdateData,
    options: DocumentModificationOptions,
    userId: string,
  ) {
    super._onUpdate(changed, options, userId);
    const hasCardChanged =
      foundry.utils.hasProperty(changed, 'flags.swade.cardValue') ||
      foundry.utils.hasProperty(changed, 'flags.swade.suitValue');
    const holdRemoved = foundry.utils.hasProperty(
      changed,
      'flags.swade.-=roundHeld',
    );
    if (hasCardChanged && !holdRemoved && game.userId === userId) {
      this.handOutBennies();
    }
  }

  /** Checks if this combatant has a joker and hands out bennies based on the actor type and disposition */
  async handOutBennies() {
    if (
      !game.settings.get('swade', 'jokersWild') ||
      this.groupId ||
      !this.hasJoker ||
      !this.parent
    )
      return;
    await this.#createJokersWildMessage();
    // TODO: This is actually going to be a collection, rather than an array
    const combatants = this.parent.combatants as SwadeCombatant[];
    const isTokenHostile =
      this.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
    //Give bennies to PCs
    if (this.actor?.type === 'character') {
      await this.#friendlyBennies(combatants);
    } else if (this.actor?.type === 'npc' && isTokenHostile) {
      await this.#adversaryBennies(combatants);
    }
  }

  async #friendlyBennies(combatants: SwadeCombatant[]) {
    //filter combatants for PCs and give them bennies
    const pcs = combatants.filter((c) => c.actor?.type === 'character');
    await this.#triggerBennies(pcs);
  }

  async #adversaryBennies(combatants: SwadeCombatant[]) {
    //give all GMs a benny
    const gmUsers = game.users!.filter((u) => u.active && u.isGM);
    for (const gm of gmUsers) await gm.getBenny();
    //give all enemy wildcards a benny
    const hostiles = combatants.filter((c) => {
      const isHostile =
        c.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
      return c.actor?.type === 'npc' && isHostile && c.actor?.isWildcard;
    });
    await this.#triggerBennies(hostiles);
  }

  async #triggerBennies(combatants: SwadeCombatant[]) {
    for (const c of combatants) {
      if (c.actor?.isOwner) await c.actor?.getBenny();
      else
        game.swade.sockets.giveBenny(
          [firstOwner(c.actor)?.id as string],
          [c.actor.uuid as string],
        );
    }
  }

  async #createJokersWildMessage() {
    await getDocumentClass('ChatMessage').create({
      user: game.userId,
      content: await renderTemplate(SWADE.bennies.templates.joker, {
        speaker: game.user,
      }),
    });
  }
}
