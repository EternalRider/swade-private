import { RollModifier } from '../../../interfaces/additional.interface';
import { damageApplicator } from '../../apps/DamageApplicator';
import { constants } from '../../constants';
import { DamageRoll } from '../../dice/DamageRoll';
import { SwadeRoll } from '../../dice/SwadeRoll';
import { TraitRoll } from '../../dice/TraitRoll';
import { Accordion } from '../../style/Accordion';
import { count } from '../../util';

declare global {
  interface DocumentClassConfig {
    ChatMessage: typeof SwadeChatMessage;
  }

  interface FlagConfig {
    ChatMessage: {
      swade?: {
        targets?: { name: string; uuid: string }[];
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
    return this.isRoll && this.rolls.every((r: Roll) => r instanceof SwadeRoll);
  }

  /** returns the index of the message in the list of all messages */
  get index(): number {
    return game.messages!.contents.findIndex((m) => m.id === this.id);
  }

  override async renderHTML(options = {}): Promise<HTMLElement> {
    if (this.isSwadeRoll && !this.isRollTableResult) {
      const messageData = await this.#getSwadeRollMessageData(options);
      const html = await this.#renderSwadeRollMessage(messageData);
      Hooks.callAll('renderChatMessageHTML', this, html, messageData);
      return html;
    }

    if (this.isCardDraw) {
      const rendered = await this.#renderCardDraw();
      if (rendered) this.content = rendered;
    }

    return super.renderHTML(options);
  }

  // and later
  _onClickDiceRoll(event: PointerEvent) {
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.classList.toggle('expanded');
  }

  async #renderCardDraw(): Promise<string> {
    const msgType = game.settings.get('swade', 'initMessage');
    const cards = this.getFlag('swade', 'cards')!.map((c) => {
      return {
        id: c._id,
        face: c.faces[c.face].img,
        name: c.faces[c.face].name || c.name,
        suit: c.suit,
      };
    });
    const pickedCard = this.getFlag('swade', 'pickedCard');
    const isRedraw = this.getFlag('swade', 'isRedraw');
    const [[picked], discarded] = cards.partition((c) => c.id !== pickedCard);
    return foundry.applications.handlebars.renderTemplate(
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

  async #getSwadeRollMessageData(options): Promise<ChatMessage.MessageData> {
    const { canDelete = this.isAuthor, canClose = false } = options;
    // Determine some metadata
    const data = this.toObject(false);
    data.content =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.content,
        {
          rollData: this.getRollData(),
        },
      );

    // Construct message data
    const isWhisper = !!this.whisper.length;
    const messageData: ChatMessage.MessageData = {
      canDelete,
      canClose,
      message: data,
      user: game.user,
      author: this.author,
      alias: this.alias,
      cssClass: [
        this.style === CONST.CHAT_MESSAGE_STYLES.IC ? 'ic' : null,
        this.style === CONST.CHAT_MESSAGE_STYLES.EMOTE ? 'emote' : null,
        this.blind ? 'blind' : null,
        isWhisper ? 'whisper' : null,
      ].filterJoin(' '),
      isWhisper,
      whisperTo: this.whisper
        .map((u) => game.users.get(u)?.name)
        .filterJoin(', '),
    };
    return messageData;
  }

  async #renderSwadeRollMessage(
    messageData: ChatMessage.MessageData,
  ): Promise<HTMLElement> {
    await this.#renderSwadeRollContent(messageData);

    // Render shell with empty content to prevent bare <li> elements in
    // message content from auto-closing the root <li> during HTML parsing
    const content = messageData.message.content;
    messageData.message.content = '';
    const templateStr = await foundry.applications.handlebars.renderTemplate(
      CONFIG.ChatMessage.template,
      messageData,
    );
    messageData.message.content = content;
    const parsed = foundry.utils.parseHTML(templateStr);
    const html: HTMLElement = (
      parsed instanceof HTMLElement ? parsed : parsed[0]
    ) as HTMLElement;
    const contentEl = html.querySelector('.message-content');
    if (contentEl) contentEl.innerHTML = content;
    this.#attachRollMessageListeners(html);

    return html;
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

  #attachRollMessageListeners(html: HTMLElement) {
    html
      .querySelectorAll('.dice-roll')
      .forEach((el) =>
        el.addEventListener('click', this._onClickDiceRoll.bind(this)),
      );

    html
      .querySelector('.swade-roll-message button.free-reroll')
      ?.addEventListener('click', SwadeRoll.rerollFree);
    html
      .querySelectorAll('.swade-roll-message button.benny-reroll')
      .forEach((btn) => btn.addEventListener('click', SwadeRoll.rerollBenny));
    html
      .querySelector('.swade-roll-message .confirm-critfail')
      ?.addEventListener('click', () => TraitRoll.confirmCritfail(this));

    html
      .querySelector('.swade-roll-message button.calculate-wounds')
      ?.addEventListener('click', () => damageApplicator(this));
    html
      .querySelectorAll<HTMLDetailsElement>('details.modifiers')
      .forEach((detail) => new Accordion(detail));
    html
      .querySelectorAll<HTMLLIElement>('.swade-roll-message .target')
      .forEach((target) => {
        target.addEventListener('mouseenter', (ev) => {
          if (!canvas.ready) return;
          const target = ev.currentTarget as HTMLLIElement;
          const tokenDoc = fromUuidSync(
            target.dataset.tokenUuid ?? '',
          ) as TokenDocument | null;
          const tokenObj = tokenDoc?.object;
          if (tokenObj?.isVisible && !tokenObj?.controlled) {
            tokenObj?._onHoverIn(ev);
          }
        });
        target.addEventListener('mouseleave', (ev) => {
          if (!canvas.ready) return;
          const target = ev.currentTarget as HTMLLIElement;
          const tokenDoc = fromUuidSync(
            target.dataset.tokenUuid ?? '',
          ) as TokenDocument | null;
          const tokenObj = tokenDoc?.object;
          if (tokenObj?.isVisible && !tokenObj?.controlled) {
            tokenObj?._onHoverOut(ev);
          }
        });
        target.addEventListener('click', (ev) => {
          if (!canvas.ready) return;
          const target = ev.currentTarget as HTMLLIElement;
          const tokenDoc = fromUuidSync(
            target.dataset.tokenUuid ?? '',
          ) as TokenDocument | null;
          if (tokenDoc?.object?.isVisible) tokenDoc?.object?.control();
        });
      });
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
    const targets = this.getFlag('swade', 'targets') ?? [];
    return foundry.applications.handlebars.renderTemplate(
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
