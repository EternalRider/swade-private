import SwadeActiveEffect from './documents/SwadeActiveEffect';
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
          this._onDeleteConvictionMessage(data);
          break;
        case 'newRound':
          this._onNewRound(data);
          break;
        case 'removeStatusEffect':
          this._onRemoveStatusEffect(data);
          break;
        case 'giveBennies':
          this._onGiveBenny(data);
          break;
        case 'onRollWildDie':
          this._onRollWildDie(data);
          break;
        default:
          this._onUnknownSocket(data.type);
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

  removeStatusEffect(uuid: string) {
    this.emit<RemoveStatusEffectEvent>({
      type: 'removeStatusEffect',
      effectUUID: uuid,
    });
  }

  newRound(combatId: string) {
    this.emit<NewRoundEvent>({
      type: 'newRound',
      combatId: combatId,
    });
  }

  giveBenny(users: string[]) {
    this.emit<GiveBenniesEvent>({ type: 'giveBennies', users });
  }

  onRollWildDie(dieType: string, colorPreset: string) {
    this.emit<RollWildDieEvent>({
      type: 'onRollWildDie',
      user: game.userId!,
      dieType,
      colorPreset,
    });
  }

  protected async _onRemoveStatusEffect(data: RemoveStatusEffectEvent) {
    const effect = (await fromUuid(data.effectUUID)) as SwadeActiveEffect;
    if (isFirstOwner(effect.parent)) {
      effect.expire();
    }
  }

  protected _onDeleteConvictionMessage(data: DeleteConvictionMessageEvent) {
    const message = game.messages?.get(data.messageId);
    //only delete the message if the user is a GM and the event emitter is one of the recipients
    if (game.user!.isGM && message?.data.whisper.includes(data.userId)) {
      message?.delete();
    }
  }

  //advance round
  protected async _onNewRound(data: NewRoundEvent) {
    if (isFirstGM()) {
      game.combats?.get(data.combatId, { strict: true }).nextRound();
    }
  }

  protected _onUnknownSocket(type: string) {
    console.warn(`The socket event ${type} is not supported`);
  }

  protected async _onGiveBenny(data: GiveBenniesEvent) {
    if (data.users.includes(game.userId!)) {
      await game.user?.getBenny();
    }
  }

  protected async _onRollWildDie(data: RollWildDieEvent) {
    const user = game.users?.get(data.user);
    if (data.user != game?.userId) {
      // Get the other user's configured Wild Die data.
      const dieSystem = user?.getFlag('swade', 'dsnWildDiePreset');
      const colorPreset = user?.getFlag('swade', 'dsnWildDie') || 'none';
      // Change the Wild Die theme.
      Hooks.once('diceSoNiceRollStart', (_messageId, context) => {
        const wildDie = context.roll.terms.find(
          (d) => d.options.flavor === game.i18n.localize('SWADE.WildDie'),
        );
        if (colorPreset !== 'none') {
          if (colorPreset === 'customWildDie') {
            // Build the custom appearance and set it
            const customColors = user?.getFlag(
              'swade',
              'dsnCustomWildDieColors',
            );
            const customOptions = user?.getFlag(
              'swade',
              'dsnCustomWildDieOptions',
            );
            const customAppearance = {
              colorset: 'custom',
              foreground: customColors?.labelColor,
              background: customColors?.diceColor,
              edge: customColors?.edgeColor,
              outline: customColors?.outlineColor,
              font: customOptions?.font,
              material: customOptions?.material,
              texture: customOptions?.texture,
              system: dieSystem,
            };
            setProperty(wildDie, 'options.appearance', customAppearance);
          } else {
            // Set the preset
            setProperty(wildDie, 'options.colorset', colorPreset);
          }
          // Get the dicePreset for the given die type
          const dicePreset = game.dice3d?.DiceFactory.systems[
            dieSystem
          ].dice.find((d) => d.type === data.dieType);
          if (dicePreset) {
            if (dicePreset?.modelFile && !dicePreset.modelLoaded) {
              // Load the modelFile
              dicePreset.loadModel(game.dice3d?.DiceFactory.loaderGLTF);
            }
            // Load the textures
            dicePreset.loadTextures();
          }
        }
      });
    }
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

interface GiveBenniesEvent extends EventData {
  users: string[];
}

interface RollWildDieEvent extends EventData {
  user: string;
  dieType: string;
  colorPreset: string;
}
