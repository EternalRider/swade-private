import { EmptyObject } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import {
  ActorRollData,
  RollPart,
  SwadeRollOptions,
} from '../../interfaces/roll.interface';
import { constants } from '../constants';
import SwadeChatMessage from '../documents/chat/SwadeChatMessage';
import { chunkArray, count } from '../util';
import { SwadeRoll } from './SwadeRoll';
import WildDie from './WildDie';

export class TraitRoll extends SwadeRoll<ActorRollData> {
  static async confirmCritfail(msg: SwadeChatMessage) {
    const label = game.i18n.localize('SWADE.Rolls.Critfail.ConfirmDie');
    const options = { critfailConfirmationRoll: true };
    const roll = await new SwadeRoll(`1d6[${label}]`, {}, options).evaluate();
    await game.dice3d?.showForRoll(
      roll,
      game.user!,
      true,
      msg['whisper'] || null,
      msg['blind'],
      undefined,
      msg['speaker'],
    );
    await msg.update({ rolls: [roll, ...msg['rolls']] });
  }
  constructor(
    formula: string,
    data: ActorRollData = {},
    options: TraitRollOptions = {},
  ) {
    super(formula, data, options);
  }

  static override CHAT_TEMPLATE =
    'systems/swade/templates/chat/dice/trait-roll.hbs';

  get isValidTraitRoll(): boolean {
    return this.#termIsPoolTerm(this.terms[0]);
  }

  override get isCritfail() {
    const term = this.terms[0];
    if (!this.#termIsPoolTerm(term) || !this._evaluated) return undefined;
    const wildDie = term.dice.find((d) => d instanceof WildDie);
    const majorityOfDiceAreOne =
      count(term.dice, (d) => d.total === 1) > term.dice.length / 2;
    if (wildDie) return majorityOfDiceAreOne && wildDie.total === 1;
    return majorityOfDiceAreOne;
  }

  get groupRoll() {
    return this.options['groupRoll'] ?? false;
  }

  set groupRoll(groupRoll: boolean) {
    this.options['groupRoll'] = groupRoll;
  }

  override get isRerollable() {
    return this.options['rerollable'] ?? true;
  }

  override get isCritFailConfirmationRoll() {
    return false;
  }

  set targetNumber(tn: number) {
    this.options['targetNumber'] = tn;
  }

  get targetNumber() {
    return this.options['targetNumber'] ?? 4;
  }

  /**
   * @returns Critfail: -1, Fail: 0, Success: 1, Raises: 2 or more
   */
  get successes(): number {
    if (this.isCritfail) return constants.ROLL_RESULT.CRITFAIL;
    if ((this.total ?? 0) < this.targetNumber)
      return constants.ROLL_RESULT.FAIL;
    if ((this.total ?? 0) < this.targetNumber + 4)
      return constants.ROLL_RESULT.SUCCESS;
    return Math.max(
      Math.floor(((this.total ?? 0) - this.targetNumber) / 4) + 1,
      0,
    );
  }

  override async getRenderData(flavor?: string, isPrivate = false) {
    const data = await super.getRenderData(flavor, isPrivate);
    data.resultParts = this._formatResultParts();
    return data;
  }

  override clone() {
    const cloned = super.clone();
    if (cloned.terms[0] instanceof foundry.dice.terms.PoolTerm) {
      for (const poolPart of cloned.terms[0].rolls) {
        poolPart.terms.forEach((part, i, terms) => {
          if (
            part instanceof foundry.dice.terms.Die &&
            part.flavor === game.i18n.localize('SWADE.WildDie')
          ) {
            terms[i] = new WildDie({ faces: part.faces });
          }
        });
      }
    }
    return cloned;
  }

  override async toMessage<T extends ChatMessage.CreateData = EmptyObject>(
    messageData: T = {} as T,
    {
      rollMode = 'publicroll',
      create = true,
    }: {
      rollMode?: keyof CONFIG.Dice.RollModes | 'roll';
      create?: boolean | undefined;
    } = {},
  ) {
    foundry.utils.setProperty(
      messageData,
      'flags.swade.targets',
      Array.from(game.user!.targets).map((t) => {
        return { name: t.name, uuid: t.document.uuid };
      }),
    );

    return super.toMessage(messageData, { rollMode, create });
  }

  override applyReroll(actor: Actor.ConfiguredInstance | null): boolean {
    if (
      !actor ||
      !('stats' in actor.system) ||
      !('bennyTrait' in actor.system.stats.globalMods)
    )
      return false;
    if (actor.system.stats.globalMods.bennyTrait?.length > 0) {
      let adjustRoll = false;
      for (const mod of actor.system.stats.globalMods.bennyTrait) {
        const hasMod = this.modifiers.find((m) => m.label === mod.label);
        if (!hasMod) {
          adjustRoll = true;
          this.options['modifiers'].push(mod);
          this.terms.push(
            new foundry.dice.terms.OperatorTerm({ operator: '+' }),
            new foundry.dice.terms.StringTerm({
              term: String(mod.value),
              options: { flavor: mod.label },
            }),
          );
        }
      }
      if (adjustRoll) {
        this.resetFormula();
        return true;
      }
    }
    return false;
  }

  protected _formatResultParts() {
    const result = new Array<RollPart>();
    if (!this.isValidTraitRoll) return result;
    const pool = this.terms[0] as foundry.dice.terms.PoolTerm;
    //clone the terms and remove the pool;
    const mods = this.terms.slice(1);
    //cut up the modifiers and add them up into a single number
    const modTotal = chunkArray<foundry.dice.terms.RollTerm>(mods, 2).reduce(
      (acc, cur) => {
        const [op, num] = cur;
        return (acc += Number(`${op.total?.toString().trim()}${num.total}`));
      },
      0,
    );

    for (let i = 0; i < pool.rolls.length; i++) {
      const roll = pool.rolls[i];
      const faces = roll.terms[0]['faces'];
      if (pool.results[i].discarded) continue; //skip discard results
      let img = '';
      if ([4, 6, 8, 10, 12, 20].indexOf(faces) !== -1) {
        img = `icons/svg/d${faces}-grey.svg`;
      }
      //add the modifier total to each result of the base pool
      result.push({
        img,
        result: (roll.total as number) + modTotal,
        class: this._getRollClass(roll),
        die: true,
        hint: roll.dice[0].flavor,
      });
    }
    return result;
  }

  #termIsPoolTerm(
    term: foundry.dice.terms.RollTerm,
  ): term is foundry.dice.terms.PoolTerm {
    return term instanceof foundry.dice.terms.PoolTerm;
  }
}

interface TraitRollOptions extends SwadeRollOptions {
  groupRoll?: boolean;
  targetNumber?: number;
}
