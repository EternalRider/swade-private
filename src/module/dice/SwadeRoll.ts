import { EmptyObject } from 'fvtt-types/utils';
import { RollModifier } from '../../interfaces/additional.interface';
import {
  RollPart,
  RollRenderOptions,
  SwadeRollData,
  SwadeRollOptions,
} from '../../interfaces/roll.interface';
import { Logger } from '../Logger';
import SwadeUser from '../documents/SwadeUser';
import SwadeActor from '../documents/actor/SwadeActor';
import { normalizeRollModifiers } from '../util';

export class SwadeRoll<D extends SwadeRollData = EmptyObject> extends Roll<D> {
  constructor(formula: string, data?: D, options: SwadeRollOptions = {}) {
    super(formula, data, options);
  }

  static override CHAT_TEMPLATE =
    'systems/swade/templates/chat/dice/swade-roll.hbs';

  static fromRoll(roll: Roll) {
    const newRoll = new this(roll.formula, roll.data, roll.options);
    Object.assign(newRoll, roll);
    return newRoll;
  }

  static async rerollFree(event: PointerEvent) {
    event.preventDefault();
    const target = event.currentTarget as HTMLButtonElement;
    const id = target.closest<HTMLElement>('.message')!.dataset.messageId!;
    const msg = game.messages!.get(id, { strict: true });
    const speaker = msg['speaker'];
    const roll = msg['rolls'][0] as SwadeRoll;

    roll.rerollMode = 'free';
    const evaluated = await roll.reroll();
    await evaluated.toMessage(
      {
        speaker: speaker,
        flavor: msg.flavor,
        flags: msg.flags,
        whisper: msg.whisper,
        blind: msg.blind,
      },
      {
        rollMode:
          msg.getFlag('swade', 'rollMode') ??
          game.settings.get('core', 'rollMode'),
      },
    );
  }

  static async rerollBenny(event: PointerEvent) {
    event.preventDefault();
    const target = event.currentTarget as HTMLButtonElement;
    const id = target.closest<HTMLElement>('.message')!.dataset.messageId!;
    const msg = game.messages!.get(id, { strict: true });
    const speaker = msg['speaker'];
    const roll = msg['rolls'][0] as SwadeRoll;
    const actor = ChatMessage.getSpeakerActor(speaker);

    const isGmBenny = !!target.dataset.gmBenny;
    const spender: SwadeUser | SwadeActor | null =
      isGmBenny && game.user?.isGM ? game.user : actor;

    if (!spender?.bennies) {
      return ui.notifications.warn('SWADE.NoBennies', { localize: true });
    }

    await spender?.spendBenny();
    roll.rerollMode = 'benny';

    roll.applyReroll(actor);

    const evaluated = await roll.reroll();
    await evaluated.toMessage(
      {
        speaker: speaker,
        flavor: msg.flavor,
        flags: msg.flags,
        whisper: msg.whisper,
        blind: msg.blind,
      },
      {
        rollMode:
          msg.getFlag('swade', 'rollMode') ??
          game.settings.get('core', 'rollMode'),
      },
    );
  }

  set rerollMode(mode: 'free' | 'benny') {
    this.options['rerollMode'] = mode;
  }

  get rerollMode() {
    return this.options['rerollMode'];
  }

  set modifiers(mods: RollModifier[]) {
    this.options['modifiers'] = mods;
  }

  get modifiers() {
    const mods = this.options['modifiers'] ?? [];
    return mods.map(normalizeRollModifiers);
  }

  setRerollable(rerollable: boolean) {
    this.options['rerollable'] = rerollable;
  }

  setMessageId(messageId: string) {
    this.options['messageId'] = messageId;
  }

  setRollType(rollType: string) {
    this.options['rollType'] = rollType;
  }

  get messageId() {
    return this.options['messageId'];
  }

  get isRerollable() {
    return this.options['rerollable'] ?? false;
  }

  get isCritfail(): boolean | undefined {
    return false;
  }

  get isCritFailConfirmationRoll() {
    return this.options['critfailConfirmationRoll'];
  }

  get rollType() {
    return this.options['rollType'];
  }

  async getRenderData(
    flavor?: string,
    isPrivate = false,
    displayResult = true,
  ): Promise<Record<string, unknown>> {
    if (!this._evaluated) await this.evaluate();
    const chatData = {
      isPrivate: isPrivate,
      displayResult: displayResult,
      flavor: isPrivate ? null : flavor,
      user: game.user?.id,
      tooltip: isPrivate ? '' : await this.getTooltip(),
      total: this.total,
      formulaParts: this._formatFormulaParts(),
      rerollable: this.isRerollable,
    };
    return chatData;
  }

  override async toMessage<const Create extends boolean | null | undefined>(
    messageData: SwadeRoll.MessageData = {},
    {
      rollMode = 'publicroll',
      create = true,
    }: Roll.ToMessageOptions<Create> = {},
  ): Promise<Roll.ToMessageReturn<Create>> {
    // Perform the roll, if it has not yet been rolled
    if (!this._evaluated) await this.evaluate();
    const existingRolls: SwadeRoll[] = messageData.rolls ?? [];
    messageData = foundry.utils.mergeObject(
      {
        user: game.user!.id,
        sound: CONFIG.sounds.dice,
        'flags.swade.rollMode': rollMode,
      },
      messageData,
    );

    messageData.rolls = [...existingRolls, this];
    // Either create the message or just return the chat data
    const cls = getDocumentClass('ChatMessage');
    const msg = new cls(messageData);

    // Either create or return the data
    if (create) return cls.create(msg.toObject(), { rollMode });
    if (rollMode) msg.applyRollMode(rollMode);
    return msg.toObject();
  }

  protected async _getToMessageContent(
    messageData: ChatMessage.CreateData,
  ): Promise<string> {
    return messageData.content ?? '';
  }

  override async render({
    flavor,
    template = (this.constructor as typeof SwadeRoll).CHAT_TEMPLATE,
    isPrivate = false,
    displayResult = true,
  }: RollRenderOptions = {}) {
    const data = await this.getRenderData(flavor, isPrivate, displayResult);
    return renderTemplate(template, data);
  }

  getRerollLabel(): string | undefined {
    if (this.rerollMode === 'benny') {
      return game.i18n.localize('SWADE.RerollWithBenny');
    }
    if (this.rerollMode === 'free') {
      return game.i18n.localize('SWADE.FreeReroll');
    }
  }

  /**
   * Applies reroll bonuses to the current roll
   * @param _actor The actor making a reroll
   * @returns If the roll was modified
   */
  applyReroll(_actor: Actor | null): boolean {
    Logger.warn('This function must be implemented on a subsidiary class');
    return false;
  }

  protected _formatFormulaParts(): RollPart[] {
    const result = new Array<RollPart>();
    for (const term of this.terms) {
      if (term instanceof foundry.dice.terms.PoolTerm) {
        // Compute dice from the pool
        for (const roll of term.rolls) {
          const faces = roll.terms[0]['faces'];
          const total = roll.total ?? 0;
          let img = '';
          if ([4, 6, 8, 10, 12, 20].indexOf(faces) !== -1) {
            img = `icons/svg/d${faces}-grey.svg`;
          }
          result.push({
            img,
            die: true,
            result: total,
            class: this._getRollClass(roll),
            hint: roll.dice[0].flavor,
          });
        }
      } else if (term instanceof foundry.dice.terms.Die) {
        // Grab the right dice
        const faces = term.faces!;
        let total = 0;
        term.results.forEach((result) => {
          total += result.result;
        });
        let img = '';
        if ([4, 6, 8, 10, 12, 20].indexOf(faces) !== -1) {
          img = `icons/svg/d${faces}-grey.svg`;
        }
        result.push({
          img,
          class: this._getDieClass(term),
          result: total,
          die: true,
          hint: term.flavor,
        });
      } else {
        result.push({
          result: term.expression,
          hint: term.flavor,
        });
      }
    }
    return result;
  }

  protected _getDieClass(die: foundry.dice.terms.Die) {
    const faces = die.faces!;
    let total = 0;
    die.results.forEach((result) => {
      total += result.result;
    });
    if (die.results[0].result === 1) return 'min';
    if (total > faces) return 'exploded';
    return 'color';
  }

  protected _getRollClass(roll: Roll) {
    const faces = roll.terms[0]['faces'];
    const total = roll.total ?? 0;
    if (total > faces) return 'exploded';
    if (roll.dice.some((d) => d.results[0].result === 1)) return 'min';
    return '';
  }
}

export declare namespace SwadeRoll {
  interface MessageData extends Roll.MessageData {
    rolls?: any[];
  }
}
