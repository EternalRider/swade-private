import { RollInitiativeOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/combat';
import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import BaseUser from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents/user.mjs';
import { Updates } from '../../../globals';
import { reshuffleActionDeck } from '../../util';

import { PlayerCardDrawHerder } from '../../apps/PlayerCardDrawHerder';
import SwadeUser from '../SwadeUser';
import type SwadeActiveEffect from '../active-effect/SwadeActiveEffect';
import SwadeCards from '../card/SwadeCards';
import SwadeCombatant from './SwadeCombatant';

declare global {
  interface DocumentClassConfig {
    Combat: typeof SwadeCombat;
  }
}

export default class SwadeCombat extends Combat {
  /** Compares two combatants by initiative card */
  static #cardSortCombatants(a: SwadeCombatant, b: SwadeCombatant): number {
    const cardA = a.cardValue ?? 0;
    const cardB = b.cardValue ?? 0;
    const card = cardB - cardA;
    if (card !== 0) return card;
    const suitA = a.suitValue ?? 0;
    const suitB = b.suitValue ?? 0;
    return suitB - suitA;
  }

  /** Compares two combatants by ID. */
  static #idSortCombatants(a: SwadeCombatant, b: SwadeCombatant): number {
    return a.id! > b.id! ? 1 : -1;
  }

  get actionDeck(): SwadeCards {
    return game.cards!.get(game.settings.get('swade', 'actionDeck'), {
      strict: true,
    });
  }

  override async rollInitiative(
    ids: string | string[],
    { messageOptions, updateTurn }: RollInitiativeOptions = {},
  ) {
    // Structure input data
    ids = typeof ids === 'string' ? [ids] : ids;
    const currentId = this.combatant?.id;

    const messages: DeepPartial<ChatMessageData>[] = [];
    const updates: Updates[] = [];
    let skipMessage = false;

    //Check if enough cards are available
    if (ids.length > this.actionDeck.availableCards.length) {
      const message = game.i18n.format('SWADE.NoCardsLeft', {
        needed: ids.length,
        current: actionCardDeck.availableCards.length,
      });
      ui.notifications.warn(message);
      return this as Combat;
    }

    // Iterate over Combatants, performing an initiative draw for each
    for (const id of ids) {
      // Get Combatant data
      const c = this.combatants.get(id, { strict: true }) as SwadeCombatant;
      if (!c.isOwner) continue;
      const roundHeld = !!c.roundHeld;
      const inGroup = !!c.groupId;

      //Do not draw cards for defeated or holding combatants
      if (c.isDefeated || roundHeld || inGroup) continue;

      // Set up edges
      const hasHesitant = c.actor?.system.initiative.hasHesitant;
      const hasQuick = c.actor?.system.initiative.hasQuick;
      const isIncapacitated = c.actor?.system.status.isIncapacitated;

      // Figure out how many cards to draw
      const cardsToDraw = this._determineCardsToDraw(c as SwadeCombatant);

      // Draw initiative
      let card: Card;
      const cards = await this.drawCard(cardsToDraw);
      if (!!c.initiative && !roundHeld) {
        // handle redraws
        const oldCard = await this.findCard(c?.cardValue!, c?.suitValue!);
        if (oldCard) {
          cards.push(oldCard);
          card = await this.pickACard({
            cards: cards,
            combatantName: c.name,
            oldCardId: oldCard?.id!,
          });
          if (card === oldCard) {
            skipMessage = true;
          }
        } else {
          card = cards[0];
        }
      } else if (isIncapacitated) {
        card = cards[0];
      } else if (hasHesitant) {
        // Hesitant
        const joker = cards.find((c) => c.system['isJoker']);
        if (joker) {
          // if one of the cards drawn was a joker, simply use that
          card = joker;
        } else {
          //sort cards to pick the lower one
          cards.sort((a, b) => {
            const cardA = a.value!;
            const cardB = b.value!;
            const card = cardA - cardB;
            if (card !== 0) return card;
            const suitA = a.system['suit'];
            const suitB = b.system['suit'];
            const suit = suitA - suitB;
            return suit;
          });
          card = cards[0];
        }
      } else if (cardsToDraw > 1) {
        //Level Headed
        card = await this.pickACard({
          cards: cards,
          combatantName: c.name,
          enableRedraw: hasQuick,
          isQuickDraw: hasQuick,
        });
      } else if (hasQuick) {
        card = cards[0];
        const cardValue = card?.value!;
        //if the card value is less than 5 then pick a card otherwise use the card
        if (cardValue <= 5) {
          card = await this.pickACard({
            cards: [card],
            combatantName: c.name,
            enableRedraw: true,
            isQuickDraw: true,
          });
        }
      } else {
        //normal card draw
        card = cards[0];
      }

      const newFlags = {
        cardValue: card.value!,
        suitValue: card.system['suit'],
        hasJoker: card.system['isJoker'],
        cardString: card.description,
      };

      const initiative = card?.system['suit'] + card.value;

      const update = {
        _id: id,
        initiative,
        flags: { swade: newFlags },
      };

      //Handle group leader changes
      if (c.isGroupLeader) update.flags.swade.suitValue += 0.9;
      updates.push(update);

      //handle potential followers
      const followers =
        game.combat?.combatants.filter((f) => f.groupId === c.id) ?? [];
      let s = newFlags.suitValue;
      for (const f of followers) {
        s -= 0.02;
        updates.push({
          _id: f.id,
          initiative: initiative,
          'flags.swade': foundry.utils.mergeObject(newFlags, {
            suitValue: s,
          }),
        });
      }

      // Construct chat message data
      const template = `
            <section class="initiative-draw">
              <div class="action-card-filter-container">
                <img class="result-image" src="${card?.currentFace?.img}">
              </div>
              <h4 class="result-text result-text-card">${card?.name}</h4>
            </section>
          `;

      const messageData = foundry.utils.mergeObject(
        {
          speaker: ChatMessage.getSpeaker({
            actor: c.actor,
            token: c.token,
            alias: c.name,
          }),
          whisper:
            c.token?.hidden || c.hidden
              ? game?.users?.filter((u) => u.isGM)
              : [],
          content: template,
        },
        messageOptions,
      );
      messages.push(messageData);
    }

    if (!updates.length) return this as Combat;

    // Update the combat instance with the new combatants
    await this.updateEmbeddedDocuments('Combatant', updates);

    if (!skipMessage) this._playInitiativeSound();

    // Create multiple chat messages
    if (game.settings.get('swade', 'initMessage') && !skipMessage) {
      await CONFIG.ChatMessage.documentClass.createDocuments(messages);
    }

    const combatants = ids.map(
      (id) => this.combatants.get(id, { strict: true }) as SwadeCombatant,
    );

    for (const c of combatants) {
      await c.handOutBennies();
    }

    if (this.combatants.contents.every((c) => !!c.initiative)) {
      await this.update({ turn: 0 });
      this._handleStartOfTurnExpirations();
    } else if (updateTurn && currentId) {
      // Ensure the turn order remains with the same combatant
      await this.update({
        turn: this.turns.findIndex((t) => t.id === currentId),
      });
    }

    // Return the updated Combat
    return this as Combat;
  }

  protected override _sortCombatants(
    a: SwadeCombatant,
    b: SwadeCombatant,
  ): number {
    const currentRound = game.combats?.viewed?.round ?? 0;

    if (
      (a.roundHeld && currentRound !== a.roundHeld) ||
      (b.roundHeld && currentRound !== b.roundHeld)
    ) {
      const isOnHoldA = a.roundHeld && (a.roundHeld ?? 0 < currentRound);
      const isOnHoldB = b.roundHeld && (b.roundHeld ?? 0 < currentRound);

      if (isOnHoldA && !isOnHoldB) {
        return -1;
      }
      if (!isOnHoldA && isOnHoldB) {
        return 1;
      }
    }

    //decide whether to sort by name or card
    if (a.flags?.swade && b.flags?.swade) {
      return SwadeCombat.#cardSortCombatants(a, b);
    }
    return SwadeCombat.#idSortCombatants(a, b);
  }

  /**
   * Draws cards from the Action Cards deck
   * @param count number of cards to draw
   * @returns an array with the drawn cards
   */
  async drawCard(count = 1): Promise<Card[]> {
    const pileId = game.settings.get('swade', 'actionDeckDiscardPile');
    const discardPile = game.cards!.get(pileId, { strict: true });
    return this.actionDeck.dealForInitiative(discardPile, count);
  }

  /** Ask the user to pick a card for a given combatant name */
  async pickACard({
    cards,
    combatantName,
    oldCardId,
    enableRedraw,
    isQuickDraw,
  }: IPickACard): Promise<Card> {
    // any card

    let immediateRedraw = false;
    if (isQuickDraw) {
      enableRedraw = !cards.some((card) => card.value! > 5);
    }

    const sortedCards = deepClone(cards);
    sortedCards.sort((a: Card, b: Card) => {
      const cardA = a.value ?? 0;
      const cardB = b.value ?? 0;
      const card = cardB - cardA;
      if (card !== 0) return card;
      const suitA = a.system['suit'] ?? 0;
      const suitB = b.system['suit'] ?? 0;
      return suitB - suitA;
    });
    const highestCardID = sortedCards[0].id;
    let card: Card | undefined;

    const template = 'systems/swade/templates/initiative/choose-card.hbs';
    const html = await renderTemplate(template, {
      cards: cards,
      oldCard: oldCardId,
      highestCardID: highestCardID,
    });

    const buttons: Record<string, Dialog.Button> = {
      ok: {
        icon: '<i class="fas fa-check"></i>',
        label: game.i18n.localize('SWADE.Ok'),
        callback: (html: JQuery<HTMLElement>) => {
          const choice = html.find('input[name=card]:checked');
          const cardId = choice.data('card-id') as string;
          card = cards.find((c) => c.id === cardId);
        },
      },
      redraw: {
        icon: '<i class="fas fa-plus"></i>',
        label: game.i18n.localize('SWADE.Redraw'),
        callback: () => {
          immediateRedraw = true;
        },
      },
    };

    if (!oldCardId && !enableRedraw) {
      delete buttons.redraw;
    }

    return new Promise((resolve) => {
      new Dialog({
        title: game.i18n.format('SWADE.PickACard', {
          name: combatantName,
        }),
        content: html,
        buttons: buttons,
        default: 'ok',
        close: async () => {
          if (immediateRedraw) {
            const newCards = await this.drawCard();
            card = await this.pickACard({
              cards: [...cards, ...newCards],
              combatantName,
              oldCardId,
              enableRedraw,
              isQuickDraw,
            });
          }
          //if no card has been chosen then choose first in array, unless there was a joker in which case that is chosen
          if (!card) {
            if (oldCardId) {
              card = cards.find((c) => c.id === oldCardId);
            } else {
              card = cards.find((c) => c.system['isJoker']) || cards[0];
            }
          }
          resolve(card as Card);
        },
      }).render(true);
    });
  }

  /**
   * Find a card from the deck based on it's suit and value
   * @param cardValue
   * @param cardSuit
   */
  findCard(cardValue: number, cardSuit: number): Card | undefined {
    return this.actionDeck.cards.find(
      (c) =>
        c.type === 'poker' &&
        c.value === cardValue &&
        c.system['suit'] === cardSuit,
    );
  }

  override async resetAll() {
    for (const combatant of this.combatants) {
      combatant.updateSource(
        this._getInitResetUpdate(combatant as SwadeCombatant),
      );
    }
    await this.update(
      { turn: 0, combatants: this.combatants.toObject() },
      { diff: false },
    );
    return this as Combat;
  }

  override async startCombat() {
    //Init autoroll
    if (game.settings.get('swade', 'autoInit')) {
      const combatantIds = this.combatants
        .filter((c) => c.initiative === null)
        .map((c) => c.id!);
      await this.rollInitiative(combatantIds);
    }
    return super.startCombat();
  }

  override async nextTurn() {
    await this._handleEndOfTurnExpirations();
    const turn = this.turn ?? -1;

    // Determine the next turn number
    let next: number | null = null;
    if (this.settings.skipDefeated) {
      for (const [i, t] of this.turns.entries()) {
        if (i <= turn) continue;
        // Skip defeated, lost turns, and followers on hold (their leaders act for them)
        if (t.isDefeated || t.turnLost || (t.groupId && t.roundHeld)) continue;
        next = i;
        break;
      }
    } else {
      next = turn + 1;
    }

    // Maybe advance to the next round
    const round = this.round;
    if (this.round === 0 || next === null || next >= this.turns.length) {
      return this.nextRound();
    }

    // Update the document, passing data through a hook first
    const updateData = { round, turn: next };
    const updateOptions = { advanceTime: CONFIG.time.turnTime, direction: 1 };
    Hooks.callAll('combatTurn', this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    await this._handleStartOfTurnExpirations();
    return this as Combat;
  }

  override async nextRound() {
    if (game.user?.isGM) await this._nextRoundAsGM();
    else await this._nextRoundAsUser();
    return this as Combat;
  }

  protected _getInitResetUpdate(
    combatant: SwadeCombatant,
  ): Record<string, unknown> {
    const roundHeld = combatant.roundHeld;
    const turnLost = combatant.turnLost;
    const groupId = combatant.groupId;
    if (roundHeld) {
      if (turnLost && groupId) {
        return {
          initiative: null,
          'flags.swade': {
            hasJoker: false,
            '-=turnLost': null,
          },
        };
      } else {
        return {
          initiative: null,
          'flags.swade.hasJoker': false,
        };
      }
    } else if (!roundHeld || turnLost) {
      return {
        initiative: null,
        'flags.swade': {
          suitValue: null,
          cardValue: null,
          hasJoker: false,
          cardString: '',
          turnLost: false,
        },
      };
    }
    return {
      initiative: null,
      'flags.swade': {
        suitValue: null,
        cardValue: null,
        hasJoker: false,
        cardString: '',
        turnLost: false,
      },
    };
  }

  protected async _handleStartOfTurnExpirations() {
    const expirations =
      this.combatant?.actor?.effects.filter(
        (effect: SwadeActiveEffect) =>
          effect.isTemporary && effect.isExpired('start'),
      ) ?? [];
    for (const effect of expirations) {
      await effect.expire();
    }
  }

  protected async _handleEndOfTurnExpirations() {
    const expirations =
      this.combatant?.actor?.effects.filter(
        (effect) => effect.isTemporary && effect.isExpired('end'),
      ) ?? [];
    for (const effect of expirations) {
      await effect.expire();
    }
  }

  protected async _playInitiativeSound() {
    if (game.settings.get('swade', 'initiativeSound')) {
      const data = {
        src: 'systems/swade/assets/card-flip.wav',
        volume: 0.8,
        autoplay: true,
        loop: false,
      };
      AudioHelper.play(data, true);
    }
  }

  protected override _playCombatSound(announcement: string): void {
    if (this.previous.round === 0 || this.previous.round === this.current.round)
      super._playCombatSound(announcement);
  }

  protected _determineCardsToDraw(combatant: SwadeCombatant): number {
    let cardsToDraw = 1;
    if (!!combatant.initiative && !combatant.roundHeld) return cardsToDraw;
    const actor = combatant.actor!;
    const initiative = actor.system.initiative;
    if (initiative?.hasLevelHeaded || initiative?.hasHesitant) {
      cardsToDraw = 2;
    }
    if (initiative?.hasImpLevelHeaded) {
      cardsToDraw = 3;
    }
    if (actor.type !== 'vehicle' && actor.system.status.isIncapacitated) {
      cardsToDraw = 1;
    }
    return cardsToDraw;
  }

  protected async _nextRoundAsGM() {
    //reset the deck if a joker had been drawn
    if (this.combatants.some((c: SwadeCombatant) => c.hasJoker)) {
      await reshuffleActionDeck();
      ui.notifications.info('SWADE.DeckShuffled', { localize: true });
    }

    //reset the combatants
    await this.resetAll();

    //advance the round to the next one
    await super.nextRound();

    const autoInit = game.settings.get('swade', 'autoInit');

    //no auto init, we're done;
    if (!autoInit) return;

    // if automatic init is on we draw cards
    await this._promptAllPlayersForInitiative();
    //grab the NPCs, we're drawing them locally
    await this.rollNPC();
  }

  /** As a user emit a socket event that asks a Game master to trigger the next round workflow and roll the owned tokens */
  protected _nextRoundAsUser() {
    game.swade.sockets.newRound(this.id!);
  }

  protected async _promptAllPlayersForInitiative() {
    const [localDraws, remoteDraws] = this.combatants
      .filter((c) => c.hasPlayerOwner && !c.isNPC)
      .map((c) => {
        return {
          combatant: c as SwadeCombatant,
          user: c.players[0] as SwadeUser,
        };
      })
      .sort((a, b) => a.user.name.localeCompare(b.user.name))
      .partition((v) => this._determineIfRemoteDraw(v.user, v.combatant));

    for (const { combatant } of localDraws) {
      await this.rollInitiative(combatant.id as string);
    }
    if (remoteDraws.length > 0) {
      await PlayerCardDrawHerder.asPromise({
        draws: remoteDraws,
        combatId: this.id as string,
      });
    }
  }

  protected _determineIfRemoteDraw(
    user: SwadeUser,
    combatant: SwadeCombatant,
  ): boolean {
    const initiative = combatant.actor?.system.initiative;
    const edges =
      initiative.hasLevelHeaded ||
      initiative.hasImpLevelHeaded ||
      initiative.hasQuick;
    return user.active && edges;
  }

  override async _preDelete(
    options: DocumentModificationOptions,
    user: BaseUser,
  ) {
    await super._preDelete(options, user);
    const jokerDrawn = this.combatants.some((c: SwadeCombatant) => c.hasJoker);

    //reset the deck when combat is ended
    if (jokerDrawn) {
      await reshuffleActionDeck();
      ui.notifications.info('SWADE.DeckShuffled', { localize: true });
    }
  }
}

interface IPickACard {
  /** an array of cards */
  cards: Card[];
  /** name of the combatant */
  combatantName: string;
  /** id of the old card, if you're picking cards for a redraw */
  oldCardId?: string;
  /** determines whether a redraw is allowed */
  enableRedraw?: boolean;
  /** determines whether this draw includes the Quick edge */
  isQuickDraw?: boolean;
}
