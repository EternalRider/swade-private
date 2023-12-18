import SwadeActiveEffect from './documents/active-effect/SwadeActiveEffect';
import { isFirstGM, isFirstOwner } from './util';

export default class SwadeSocketHandler {
  identifier = 'system.swade';

  constructor() {
    this.registerSocketListeners();
  }

  /** registers all the socket listeners */
  registerSocketListeners(): void {
    game.socket?.on(this.identifier, (data) => {
      switch (data.type) {
        case 'deleteConvictionMessage':
          this.#onDeleteConvictionMessage(data);
          break;
        case 'newRound':
          this.#onNewRound(data);
          break;
        case 'removeStatusEffect':
          this.#onRemoveStatusEffect(data);
          break;
        case 'giveBennies':
          this.#onGiveBenny(data);
          break;
        case 'promptInitiative':
          this.#onPromptInitiative(data);
          break;
        default:
          this.#onUnknownSocket(data.type);
          break;
      }
    });
  }

  emit<T extends EventData>(data: T) {
    return game.socket?.emit(this.identifier, data);
  }

  deleteConvictionMessage(messageId: string) {
    this.emit<DeleteConvictionMessageEvent>({
      type: 'deleteConvictionMessage',
      messageId,
      userId: game.userId!,
    });
  }

  #onDeleteConvictionMessage(data: DeleteConvictionMessageEvent) {
    const message = game.messages?.get(data.messageId);
    //only delete the message if the user is a GM and the event emitter is one of the recipients
    if (game.user!.isGM && message?.whisper.includes(data.userId)) {
      message?.delete();
    }
  }

  removeStatusEffect(uuid: string) {
    this.emit<RemoveStatusEffectEvent>({
      type: 'removeStatusEffect',
      effectUUID: uuid,
    });
  }

  async #onRemoveStatusEffect(data: RemoveStatusEffectEvent) {
    const effect = (await fromUuid(data.effectUUID)) as SwadeActiveEffect;
    if (isFirstOwner(effect.parent)) {
      effect.expire();
    }
  }

  newRound(combatId: string) {
    this.emit<NewRoundEvent>({
      type: 'newRound',
      combatId: combatId,
    });
  }

  //advance round
  async #onNewRound(data: NewRoundEvent) {
    const combat = game.combats!.get(data.combatId, { strict: true });
    if (isFirstGM()) combat.nextRound();
  }

  giveBenny(users: string[]) {
    this.emit<GiveBenniesEvent>({ type: 'giveBennies', users });
  }

  async #onGiveBenny(data: GiveBenniesEvent) {
    if (data.users.includes(game.userId!)) {
      await game.user?.getBenny();
    }
  }

  promptInitiative(combatId: string, userId: string, combatantId: string) {
    if (!game.user?.isGM) return;
    this.emit<PromptInitiativeEvent>({
      type: 'promptInitiative',
      userId,
      combatId,
      combatantIds: [combatantId],
    });
  }

  #onPromptInitiative(data: PromptInitiativeEvent) {
    if (game.userId !== data.userId) return;
    const combat = game.combats!.get(data.combatId, { strict: true });
    combat.rollInitiative(data.combatantIds);
  }

  #onUnknownSocket(type: string) {
    console.warn(`The socket event ${type} is not supported`);
  }
}

interface EventData {
  type: string;
}

interface RemoveStatusEffectEvent extends EventData {
  effectUUID: string;
}

interface DeleteConvictionMessageEvent extends EventData {
  userId: string;
  messageId: string;
}

interface NewRoundEvent extends EventData {
  combatId: string;
}

interface PromptInitiativeEvent extends EventData {
  userId: string;
  combatId: string;
  combatantIds: string[];
}

interface GiveBenniesEvent extends EventData {
  users: string[];
}
