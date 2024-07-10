import {
  ActorRollData,
  SwadeRollOptions,
} from '../../interfaces/roll.interface';
import { constants } from '../constants';
import { CharacterData, NpcData } from '../data/actor';
import { SwadeRoll } from './SwadeRoll';

export class DamageRoll extends SwadeRoll<ActorRollData> {
  static override CHAT_TEMPLATE =
    'systems/swade/templates/chat/dice/damage-roll.hbs';

  constructor(
    formula: string,
    data: ActorRollData = {},
    options: DamageRollOptions = {},
  ) {
    super(formula, data, options);
  }

  override get isRerollable() {
    return this.options['rerollable'] ?? true;
  }

  set targetNumber(tn: number) {
    this.options['targetNumber'] = tn;
  }

  // Damage is almost never going to have a targetNumber of 4, arguably should just return an error
  // TOFIX: targetNumber is not currently a valid option in the interface, either remove these paths or fix the interface setup and possibly bump these functions to SwadeRoll
  get targetNumber(): number | undefined {
    return this.options['targetNumber'];
  }

  // Returns -1 if target number isn't set, 0 on a fail, 1 on a success, 2 or more for raises
  get successes(): number {
    if (this.targetNumber === undefined) {
      console.warn('No target number set for damage roll');
      return constants.ROLL_RESULT.CRITFAIL;
    }
    if ((this.total ?? 0) < this.targetNumber)
      return constants.ROLL_RESULT.FAIL;
    if ((this.total ?? 0) < this.targetNumber + 4)
      return constants.ROLL_RESULT.SUCCESS;
    return Math.max(
      Math.floor(((this.total ?? 0) - this.targetNumber) / 4) + 1,
      0,
    ); // raises get to be 2+
  }

  override get isCritfail() {
    return false;
  }

  override get isCritFailConfirmationRoll() {
    return false;
  }

  get ap() {
    return this.options['ap'] ?? 0;
  }

  set ap(ap: number) {
    this.options['ap'] = ap;
  }

  get isHeavyWeapon() {
    return this.options['isHeavyWeapon'] ?? false;
  }

  set isHeavyWeapon(isHeavyWeapon: boolean) {
    this.options['isHeavyWeapon'] = isHeavyWeapon;
  }

  override applyReroll(actor: Actor | null): boolean {
    if (!actor || !actor.system.stats.globalMods.hasOwnProperty('bennyDamage'))
      return false;
    if (
      (actor.system as CharacterData | NpcData).stats.globalMods.bennyDamage
        ?.length > 0
    ) {
      let adjustRoll = false;
      for (const mod of (actor.system as CharacterData | NpcData).stats
        .globalMods.bennyDamage) {
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
}

interface DamageRollOptions extends SwadeRollOptions {
  ap?: number;
  isHeavyWeapon?: boolean;
}
