import {
  ActorRollData,
  RollPart,
  SwadeRollOptions,
} from '../../interfaces/roll.interface';
import { chunkArray } from '../util';
import { SwadeRoll } from './SwadeRoll';
import WildDie from './WildDie';

export class TraitRoll extends SwadeRoll<ActorRollData> {
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

  get isCritfail(): boolean | undefined {
    if (!this.isValidTraitRoll || !this._evaluated) return undefined;
    const term = this.terms[0];
    return (
      this.#termIsPoolTerm(term) &&
      term.dice.filter((d) => d.total === 1).length > term.dice.length / 2
    );
  }

  get groupRoll() {
    return this.options['groupRoll'] ?? false;
  }

  set groupRoll(groupRoll: boolean) {
    this.options['groupRoll'] = groupRoll;
  }

  override async getRenderData(flavor?: string, isPrivate = false) {
    const data = await super.getRenderData(flavor, isPrivate);
    data.isCritfail = this.isCritfail && !isPrivate;
    data.resultParts = this._formatResultParts();
    data.groupRoll = this.groupRoll;
    data.lockReroll =
      this.isCritfail && !game.settings.get('swade', 'dumbLuck');
    return data;
  }

  override clone() {
    const cloned = super.clone();
    if (cloned.terms[0] instanceof PoolTerm) {
      for (const poolPart of cloned.terms[0].rolls) {
        poolPart.terms.forEach((part, i, terms) => {
          if (
            part instanceof Die &&
            part.flavor === game.i18n.localize('SWADE.WildDie')
          ) {
            terms[i] = new WildDie({ faces: part.faces });
          }
        });
      }
    }
    return cloned;
  }

  protected _formatResultParts() {
    const result = new Array<RollPart>();
    if (!this.isValidTraitRoll) return result;
    const pool = this.terms[0] as PoolTerm;
    //clone the terms and remove the pool;
    const mods = this.terms.slice(1);
    //cut up the modifiers and add them up into a single number
    const modTotal = chunkArray<RollTerm>(mods, 2).reduce((acc, cur) => {
      const [op, num] = cur;
      return (acc += Number(`${op.total?.toString().trim()}${num.total}`));
    }, 0);

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

  #termIsPoolTerm(term: RollTerm): term is PoolTerm {
    return term instanceof PoolTerm;
  }
}

interface TraitRollOptions extends SwadeRollOptions {
  groupRoll?: boolean;
}
