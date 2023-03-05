import { ActorRollData } from '../../interfaces/roll.interface';
import { SwadeRoll } from './SwadeRoll';

export class DamageRoll extends SwadeRoll<ActorRollData> {
  static override CHAT_TEMPLATE =
    'systems/swade/templates/chat/dice/damage-roll.hbs';

  override get isRerollable() {
    return true;
  }

  override get isCritfail() {
    return false;
  }
}
