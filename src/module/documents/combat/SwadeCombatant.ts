import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { CombatantDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/combatantData';
import { Updates } from '../../../globals';
import { SWADE } from '../../config';

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
        [key: string]: unknown;
      };
    };
  }
}

export default class SwadeCombatant extends Combatant {
  override get isDefeated() {
    const actor = this.actor;
    if (actor?.isWildcard) return super.isDefeated;
    return actor?.status.isIncapacitated || super.isDefeated;
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
    return this.getFlag('swade', 'hasJoker') ?? false;
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
    return this.getFlag('swade', 'isGroupLeader') ?? false;
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
    return this.getFlag('swade', 'turnLost') ?? false;
  }

  async setTurnLost(turnLost: boolean) {
    return this.setFlag('swade', 'turnLost', turnLost);
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
    updates.push({
      _id: this.id,
      initiative: suitValue + cardValue,
      'flags.swade': { cardValue, suitValue, hasJoker, cardString },
    });

    //update followers, if applicable
    if (this.isGroupLeader) {
      const followers = combat!.combatants.filter((f) => f.groupId === this.id);
      for (const follower of followers) {
        updates.push({
          _id: follower.id,
          initiative: suitValue + cardValue,
          'flags.swade': {
            cardString,
            cardValue,
            hasJoker,
            suitValue: suitValue - 0.001,
          },
        });
      }
    }
    await combat?.updateEmbeddedDocuments('Combatant', updates);
  }

  override async _preCreate(
    data: CombatantDataConstructorData,
    options: DocumentModificationOptions,
    user: User,
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
          cardValue: sortValue,
          suitValue: sortValue,
        },
      },
    });
  }

  override _onUpdate(
    changed: DeepPartial<Combatant['data']['_source']>,
    options: DocumentModificationOptions,
    userId: string,
  ) {
    super._onUpdate(changed, options, userId);
    const hasCardChanged =
      hasProperty(changed, 'flags.swade.cardValue') ||
      hasProperty(changed, 'flags.swade.suitValue');
    const holdRemoved = hasProperty(changed, 'flags.swade.-=roundHeld');
    if (hasCardChanged && !holdRemoved) {
      this.handOutBennies();
    }
  }

  /** Checks if this combatant has a joker and hands out bennies based on the actor type and disposition */
  async handOutBennies() {
    if (
      !game.settings.get('swade', 'jokersWild') ||
      this.groupId ||
      !this.hasJoker
    )
      return;
    const combatants = game.combat?.combatants ?? [];
    const isTokenHostile =
      this.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
    //Give bennies to PCs
    if (this.actor?.type === 'character') {
      await this._createJokersWildMessage();
      //filter combatants for PCs and give them bennies
      const pcs = combatants.filter((c) => c.actor?.type === 'character');
      for (const c of pcs) {
        await c.actor?.getBenny();
      }
    } else if (this.actor?.type === 'npc' && isTokenHostile) {
      await this._createJokersWildMessage();
      //give all GMs a benny
      const gmUsers = game.users?.filter((u) => u.active && u.isGM) ?? [];
      for (const gm of gmUsers) {
        await gm.getBenny();
      }
      //give all enemy wildcards a benny
      const hostiles = combatants.filter((c) => {
        const isHostile =
          c.token?.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE;
        return c.actor?.type === 'npc' && isHostile && c.actor?.isWildcard;
      });
      for (const c of hostiles ?? []) {
        await c.actor?.getBenny();
      }
    }
  }

  private async _createJokersWildMessage() {
    const template = await renderTemplate(SWADE.bennies.templates.joker, {
      speaker: game.user,
    });
    await CONFIG.ChatMessage.documentClass.create({
      user: game.userId,
      content: template,
    });
  }
}
