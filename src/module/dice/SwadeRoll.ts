import { ChatMessageDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData';
import { TraitRollModifier } from '../../interfaces/additional.interface';
import {
  RollPart,
  RollRenderOptions,
  SwadeRollData,
  SwadeRollOptions,
} from '../../interfaces/roll.interface';
import { normalizeRollModifiers } from '../util';

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

  static async rerollFree(event: JQuery.ClickEvent) {
    event.preventDefault();

    const msg = game.messages!.get(
      event.currentTarget.closest('.message').dataset.messageId,
      { strict: true },
    );
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

  static async rerollBenny(event: JQuery.ClickEvent) {
    event.preventDefault();
    const target = event.currentTarget;
    const isGmBenny = target.dataset.gmBenny;
    const msg = game.messages!.get(
      target.closest('.message').dataset.messageId,
      { strict: true },
    );
    const speaker = msg['speaker'];
    const roll = msg['rolls'][0] as SwadeRoll;
    const actor = ChatMessage.getSpeakerActor(speaker);

    const spender = isGmBenny && game.user?.isGM ? game.user : actor;

    if (!spender?.bennies) {
      return ui.notifications.warn('SWADE.NoBennies', { localize: true });
    }

    await spender?.spendBenny();
    roll.rerollMode = 'benny';
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

  set modifiers(mods: TraitRollModifier[]) {
    this.options['modifiers'] = mods;
  }

  get modifiers() {
    const mods = this.options['modifiers'] ?? [];
    return mods.map(normalizeRollModifiers);
  }

  get isRerollable(): boolean {
    return false;
  }

  get isCritfail(): boolean | undefined {
    return false;
  }

  async getRenderData(
    flavor?: string,
    isPrivate = false,
  ): Promise<Record<string, unknown>> {
    if (!this._evaluated) await this.evaluate({ async: true });
    const chatData = {
      isPrivate: isPrivate,
      flavor: isPrivate ? null : flavor,
      user: game.user?.id,
      tooltip: isPrivate ? '' : await this.getTooltip(),
      total: this.total,
      formulaParts: this._formatFormulaParts(),
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
    messageData = foundry.utils.mergeObject(
      {
        user: game.user!.id,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        sound: CONFIG.sounds.dice,
        flags: {
          swade: {
            targets: Array.from(game.user!.targets).map((t) => {
              return { name: t.name, uuid: t.document.uuid };
            }),
          },
        },
      },
      messageData,
    );
    messageData['rolls'] = [this];

    Hooks.callAll('preRenderSwadeRollMessage', messageData, {
      create,
      rollMode,
    });
    // Either create the message or just return the chat data
    const cls = getDocumentClass('ChatMessage');
    const msg = new cls(messageData);

    // Either create or return the data
    if (create) {
      //@ts-expect-error foo bar
      const createdMsg = await cls.create(msg.toObject(), { rollMode });
      Hooks.callAll('renderSwadeRollMessage', createdMsg, messageData, {
        create,
        rollMode,
      });
      return createdMsg;
    }
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
    //@ts-expect-error ts resolves this to the function but it's actually the class
    template = this.constructor.CHAT_TEMPLATE,
    isPrivate = false,
  }: RollRenderOptions = {}) {
    const data = await this.getRenderData(flavor, isPrivate);
    return renderTemplate(template, data);
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

  getRerollLabel(): string | undefined {
    if (this.rerollMode === 'benny') {
      return game.i18n.localize('SWADE.RerollWithBenny');
    }
    if (this.rerollMode === 'free') {
      return game.i18n.localize('SWADE.FreeReroll');
    }
  }
}
