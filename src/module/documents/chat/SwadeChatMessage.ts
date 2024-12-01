import { RollModifier } from '../../../interfaces/additional.interface';
import { constants } from '../../constants';
import { DamageRoll } from '../../dice/DamageRoll';
import { SwadeRoll } from '../../dice/SwadeRoll';
import { TraitRoll } from '../../dice/TraitRoll';
import { count } from '../../util';

declare global {
  interface DocumentClassConfig {
    ChatMessage: typeof SwadeChatMessage;
  }

  interface FlagConfig {
    ChatMessage: {
      swade?: {
        targets?: { name: string; uuid: string }[];
        macros?: { id: string; uuid: string }[];
        isRedraw?: boolean;
        pickedCard?: string;
        cards?: any[]; //TODO properly set card source data type
        rollMode?: string;
        [key: string]: unknown;
      };
      core?: {
        canPopout?: boolean;
        RollTable?: string;
      };
    };
  }
}

export default class SwadeChatMessage extends ChatMessage {
  /** Returns the most significant roll for this chat message */
  get significantRoll(): SwadeRoll | undefined {
    return this.rolls[this.rolls.length - 1] as SwadeRoll | undefined;
  }

  get speakerActor() {
    return ChatMessage.getSpeakerActor(this.speaker);
  }

  get isCritfail(): boolean {
    const actor = this.speakerActor;
    //just return false if there's no actor.
    if (!actor) return false;
    const roll = this.significantRoll;
    const rollIsCritFail = !!roll?.isCritfail;
    const isGroupRoll = roll instanceof TraitRoll && roll.groupRoll;
    if (actor.isWildcard || isGroupRoll) return rollIsCritFail;
    return (
      rollIsCritFail &&
      this.rolls
        .filter((r: SwadeRoll) => r.isCritFailConfirmationRoll)
        .every((r: SwadeRoll) => r.total === 1)
    );
  }

  /** returns whether the message depicts a card draw result */
  get isCardDraw(): boolean {
    return (
      !!this.getFlag('swade', 'pickedCard') && !!this.getFlag('swade', 'cards')
    );
  }

  get isRollTableResult(): boolean {
    return !!this.getFlag('core', 'RollTable');
  }

  get isSwadeRoll(): boolean {
    return (
      super.isRoll && this['rolls'].every((r: Roll) => r instanceof SwadeRoll)
    );
  }

  /** returns the index of the message in the list of all messages */
  get index(): number {
    return game.messages!.contents.findIndex((m) => m.id === this.id);
  }

  override async getHTML() {
    if (this.isCardDraw) {
      const rendered = await this.#renderCardDraw();
      if (rendered) this.content = rendered;
      else return $('');
    }
    return super.getHTML();
  }

  protected override async _renderRollContent(
    messageData: ChatMessage.MessageData,
  ) {
    //use the core render unless all rolls are swade rolls
    if (this.isSwadeRoll && !this.isRollTableResult) {
      return this.#renderSwadeRollContent(messageData);
    }
    return super._renderRollContent(messageData);
  }

  async #renderCardDraw(): Promise<string> {
    const msgType = game.settings.get('swade', 'initMessage');
    const cards = this.getFlag('swade', 'cards')!.map((c) => {
      return {
        id: c._id,
        face: c.faces[c.face].img,
        name: c.faces[c.face].name || c.name,
      };
    });
    const pickedCard = this.getFlag('swade', 'pickedCard');
    const isRedraw = this.getFlag('swade', 'isRedraw');
    const [[picked], discarded] = cards.partition((c) => c.id !== pickedCard);
    if (msgType === constants.INIT_MESSAGE_TYPE.OFF && !isRedraw) {
      return ''; //empty message
    } else {
      return renderTemplate(
        'systems/swade/templates/chat/card-draw-result.hbs',
        {
          isRedraw,
          picked,
          discarded,
          largeMsg: msgType === constants.INIT_MESSAGE_TYPE.LARGE,
          index: this.index,
        },
      );
    }
  }

  async #renderSwadeRollContent(messageData: ChatMessage.MessageData) {
    const data = messageData.message;
    // Suppress the "to:" whisper flavor for private rolls
    if (this.blind || this.whisper.length) messageData.isWhisper = false;

    // Display standard Roll HTML content
    if (this.isContentVisible) {
      data.content = await this.#renderMessageBody(false, data.content);
    } else {
      // Otherwise, show "rolled privately" messages for Roll content
      const name = this.author?.name ?? game.i18n.localize('CHAT.UnknownUser');
      data.flavor = game.i18n.format('CHAT.PrivateRollContent', { user: name });
      data.content = await this.#renderMessageBody(true);
      messageData.alias = name;
    }
  }

  async #renderRolls(isPrivate: boolean): Promise<string> {
    if (isPrivate) return this.significantRoll!.render({ isPrivate });
    let html = '';
    for (let i = 0; i < this['rolls'].length; i++) {
      const roll = this['rolls'][i] as Roll;
      const displayResult = roll === this.significantRoll;
      if (roll instanceof SwadeRoll) {
        let flavor = game.i18n.localize(`SWADE.Rolls.${roll.constructor.name}`);
        if (roll.isCritFailConfirmationRoll) {
          flavor =
            roll.total === 1
              ? game.i18n.localize('SWADE.Rolls.Critfail.Confirmed')
              : game.i18n.localize('SWADE.Rolls.Critfail.Unconfirmed');
        }
        html += await roll.render({ isPrivate, displayResult, flavor });
      } else {
        html += await roll.render({ isPrivate });
      }
    }
    return html;
  }

  #formatModifiers(): RollModifier[] {
    return this.significantRoll?.modifiers.filter((v) => !v.ignore) ?? []; //remove the disabled modifiers
  }

  async #renderMessageBody(isPrivate: boolean, content?: string) {
    const roll = this.significantRoll;
    const isTraitRoll = roll instanceof TraitRoll;
    const targets = isTraitRoll ? this.getFlag('swade', 'targets') : [];
    return renderTemplate(
      'systems/swade/templates/chat/dice/roll-message.hbs',
      {
        lockReroll: this.isCritfail && !game.settings.get('swade', 'dumbLuck'),
        modifiers: this.#formatModifiers(),
        rerolled: roll?.getRerollLabel(),
        groupRoll: isTraitRoll && roll.groupRoll,
        isCritfail: this.isCritfail && !isPrivate,
        hasConfirmedCritfail: this.hasConfirmedCritfail(),
        isWildCard: this.speakerActor?.isWildcard,
        isDamageRoll: roll instanceof DamageRoll && !isPrivate,
        isPrivate: isPrivate,
        notRerollable: !roll?.isRerollable,
        isGM: game.user?.isGM,
        isAuthor: this.isAuthor || game.user?.isGM,
        rolls: await this.#renderRolls(isPrivate),
        targets: targets,
        content: content,
      },
    );
  }

  hasConfirmedCritfail(): boolean {
    const roll = this.significantRoll;
    const isTraitRoll = roll instanceof TraitRoll;
    if (!roll || !isTraitRoll) return false;
    if (this.speakerActor?.isWildcard) return !!roll.isCritfail;
    const pool = roll.terms[0] as foundry.dice.terms.PoolTerm;
    const hasMultipleTraitDice = pool.dice.length > 1;
    const hasConfirmedCritfail = this['rolls'].find(
      (r: SwadeRoll) => r.isCritFailConfirmationRoll && r.total === 1,
    );
    if (hasMultipleTraitDice) {
      return count(pool.dice, (d) => d.total === 1) > pool.dice.length / 2;
    }
    return !!hasConfirmedCritfail;
  }
}
