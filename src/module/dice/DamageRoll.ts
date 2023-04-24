import {
  ActorRollData,
  SwadeRollOptions,
} from '../../interfaces/roll.interface';
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
    return true;
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
}

interface DamageRollOptions extends SwadeRollOptions {
  ap?: number;
  isHeavyWeapon?: boolean;
}
