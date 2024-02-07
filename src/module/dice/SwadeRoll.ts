import { ChatMessageDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData';
import { RollModifier } from '../../interfaces/additional.interface';
import {
  RollPart,
  RollRenderOptions,
  SwadeRollData,
  SwadeRollOptions,
} from '../../interfaces/roll.interface';
import { normalizeRollModifiers } from '../util';
import { Logger } from '../Logger';

export class SwadeRoll<T extends SwadeRollData = {}> extends Roll<T> {
  constructor(formula: string, data?: T, options: SwadeRollOptions = {}) {
    super(formula, data, options);
  }

  static override CHAT_TEMPLATE =
    'systems/swade/templates/chat/dice/swade-roll.hbs';

  static fromRoll(roll: Roll) {
    const newRoll = new this(roll.formula, roll.data, roll.options);
    Object.assign(newRoll, roll);
    return newRoll;
  }

  static async rerollFree(event: MouseEvent) {
    event.preventDefault();
    const target = event.currentTarget as HTMLButtonElement;
    const id = target.closest<HTMLElement>('.message')!.dataset.messageId!;
    const msg = game.messages!.get(id, { strict: true });
    const speaker = msg['speaker'];
    const roll = msg['rolls'][0] as SwadeRoll;

    roll.rerollMode = 'free';
    const evaluated = await roll.reroll({ async: true });
    await evaluated.toMessage({
      speaker: speaker,
      flavor: msg['flavor'],
      flags: msg['flags'],
    });
  }

  static async rerollBenny(event: MouseEvent) {
    event.preventDefault();
    const target = event.currentTarget as HTMLButtonElement;
    const id = target.closest<HTMLElement>('.message')!.dataset.messageId!;
    const msg = game.messages!.get(id, { strict: true });
    const speaker = msg['speaker'];
    const roll = msg['rolls'][0] as SwadeRoll;
    const actor = ChatMessage.getSpeakerActor(speaker);

    const isGmBenny = target.dataset.gmBenny;
    const spender = isGmBenny && game.user?.isGM ? game.user : actor;

    if (!spender?.bennies) {
      return ui.notifications.warn('SWADE.NoBennies', { localize: true });
    }

    await spender?.spendBenny();
    roll.rerollMode = 'benny';

    roll.applyReroll(actor);

    const evaluated = await roll.reroll({ async: true });
    await evaluated.toMessage({
      speaker: speaker,
      flavor: msg['flavor'],
      flags: msg['flags'],
    });
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

  get isRerollable() {
    return this.options['rerollable'] ?? false;
  }

  get isCritfail(): boolean | undefined {
    return false;
  }

  get isCritFailConfirmationRoll() {
    return this.options['critfailConfirmationRoll'];
  }

  async getRenderData(
    flavor?: string,
    isPrivate = false,
    displayResult = true,
  ): Promise<Record<string, unknown>> {
    if (!this._evaluated) await this.evaluate({ async: true });
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

  //@ts-expect-error The types for this are a MESS
  override async toMessage<
    T extends DeepPartial<ChatMessageDataConstructorData> = {},
  >(
    messageData: T,
    {
      rollMode = 'publicroll',
      create = true,
    }: {
      rollMode?: keyof CONFIG.Dice.RollModes | 'roll';
      create?: boolean | undefined;
    } = {},
  ) {
    // Perform the roll, if it has not yet been rolled
    if (!this._evaluated) await this.evaluate({ async: true });
    const tempRolls = messageData['rolls'] ?? [];
    messageData = foundry.utils.mergeObject(
      {
        user: game.user!.id,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        sound: CONFIG.sounds.dice,
      },
      messageData,
    );

    messageData['rolls'] = [...tempRolls, this];
    // Either create the message or just return the chat data
    const cls = getDocumentClass('ChatMessage');
    const msg = new cls(messageData);

    // Either create or return the data
    //@ts-expect-error foo bar
    if (create) return cls.create(msg.toObject(), { rollMode });
    if (rollMode) msg.applyRollMode(rollMode);
    return msg.toObject();
  }

  protected async _getToMessageContent(
    messageData: ChatMessageDataConstructorData,
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
      if (term instanceof PoolTerm) {
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
      } else if (term instanceof Die) {
        // Grab the right dice
        const faces = term.faces;
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

  protected _getDieClass(die: Die) {
    const faces = die.faces;
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
