import { TraitRollModifier } from '../../../interfaces/additional.interface';
import { SwadeRoll } from '../../dice/SwadeRoll';
import { TraitRoll } from '../../dice/TraitRoll';

declare global {
  interface DocumentClassConfig {
    ChatMessage: typeof SwadeChatMessage;
  }

  interface FlagConfig {
    ChatMessage: {
      swade: {
        targets?: { name: string; uuid: string }[];
        [key: string]: unknown;
      };
    };
  }
}

export default class SwadeChatMessage extends ChatMessage {
  /** Returns the most significant roll for this chat message */
  get significantRoll(): SwadeRoll | undefined {
    if (this.rolls.length === 0) return;
    return this.rolls[this.rolls.length - 1];
  }

  get #isCritfail(): boolean {
    return !!this.significantRoll?.isCritfail;
  }

  protected override async _renderRollContent(
    messageData: ChatMessage.MessageData,
  ) {
    //use the core render unless all rolls are swade rolls
    if (this['rolls'].every((r: Roll) => r instanceof SwadeRoll)) {
      return this._renderSwadeRollContent(messageData);
    }
    return super._renderRollContent(messageData);
  }

  protected async _renderSwadeRollContent(
    messageData: ChatMessage.MessageData,
  ) {
    const data = messageData.message;
    // Suppress the "to:" whisper flavor for private rolls
    if (this.blind || this.whisper.length) messageData.isWhisper = false;

    // Display standard Roll HTML content
    if (this.isContentVisible) {
      data.content = await this.#renderMessageBody(false, data.content);
    } else {
      // Otherwise, show "rolled privately" messages for Roll content
      const name = this.user?.name ?? game.i18n.localize('CHAT.UnknownUser');
      data.flavor = game.i18n.format('CHAT.PrivateRollContent', { user: name });
      data.content = await this.#renderMessageBody(true);
      messageData.alias = name;
    }
  }

  async #renderRolls(isPrivate: boolean): Promise<string> {
    let html = '';
    for (const r of this.rolls) {
      html += await r.render({ isPrivate });
    }
    return html;
  }

  #formatModifiers(): TraitRollModifier[] {
    return this.significantRoll?.modifiers.filter((v) => !v.ignore) ?? []; //remove the disabled modifiers
  }

  async #renderMessageBody(isPrivate: boolean, content?: string) {
    const roll = this.significantRoll;
    return renderTemplate(
      'systems/swade/templates/chat/dice/roll-message.hbs',
      {
        lockReroll: this.#isCritfail && !game.settings.get('swade', 'dumbLuck'),
        modifiers: this.#formatModifiers(),
        rerolled: roll?.getRerollLabel(),
        groupRoll: roll instanceof TraitRoll && roll.groupRoll,
        isCritfail: this.#isCritfail && !isPrivate,
        isPrivate: isPrivate,
        isGM: game.user?.isGM,
        isAuthor: this.isAuthor || game.user?.isGM,
        rolls: await this.#renderRolls(isPrivate),
        targets: this.getFlag('swade', 'targets'),
        content: content,
      },
    );
  }
}
