import { ActorRollData } from '../../interfaces/roll.interface';
import { constants } from '../constants';
import { DamageRoll } from '../dice/DamageRoll';
import { TraitRoll } from '../dice/TraitRoll';
import type SwadeActor from '../documents/actor/SwadeActor';
import { processFormula } from '../enrichers';

const dice = '([^#]+)(?:#(.*))?'; // Dice expression with appended flavor text

export default class SwadeChatLog extends foundry.applications.sidebar.tabs.ChatLog {
  static DAMAGE_ROLL_REGEXP = new RegExp(`^(\\/d(?:amage)? )${dice}$`, 'i');
  static TRAIT_ROLL_REGEXP = new RegExp(`^(\\/t(?:rait)? )${dice}$`, 'i');

  static CHAT_COMMANDS = {
    damage: {rgx: this.DAMAGE_ROLL_REGEXP, fn: SwadeChatLog.#processSwadeDiceCommand},
    trait: {rgx: this.TRAIT_ROLL_REGEXP, fn: SwadeChatLog.#processSwadeDiceCommand},
    ...super.CHAT_COMMANDS,
  };

  static async #processSwadeDiceCommand(
    command: SwadeRollCommand,
    match: RegExpMatchArray,
    chatData: ChatMessage.CreateData,
    createOptions: ChatMessage.Database.CreateOperation<false>
  ) {
    const speaker = chatData.speaker as ChatMessage.SpeakerData | undefined;
    const actor = ChatMessage.implementation.getSpeakerActor(speaker) || game.user.character;
    const rollData = actor ? actor.getRollData() : {};
    const messageMode = game.settings.get('core', 'messageMode');
    const [formula, flavor] = match.slice(2, 4);

    switch (command) {
      case 'damage':
        await SwadeChatLog.#createRoll({
          rollClass: DamageRoll,
          formula,
          flavor,
          chatData,
          rollData,
          messageMode,
        });
        break;
      case 'trait':
        await SwadeChatLog.#processTraitRoll({
          formula,
          flavor,
          chatData,
          actor,
          rollData,
          messageMode,
        });
        break;
    }

    chatData.sound = CONFIG.sounds.dice;
    createOptions.messageMode = messageMode;
  }

  static async #processTraitRoll({ formula, flavor = '', chatData, actor, rollData, messageMode }: TraitRollContext) {
    const processed = processFormula(formula, 'trait', actor);
    try {
      await SwadeChatLog.#createRoll({
        rollClass: TraitRoll,
        formula: processed.formula,
        flavor,
        chatData,
        rollData,
        messageMode,
      });
    } catch {
      throw new Error(`${formula} is not a valid trait roll`);
    }
  }

  static async #createRoll({ rollClass, formula, flavor = '', chatData, rollData, messageMode }: RollContext): Promise<void> {
    if (flavor && !chatData.flavor) chatData.flavor = flavor;
    const roll = new rollClass(formula, rollData);
    await roll.evaluate({
      allowInteractive: messageMode !== constants.CHAT_MESSAGE_MODES.BLIND,
    });
    chatData.rolls = [roll];
  }
}

interface RollContext {
  rollClass: RollClassType;
  formula: string;
  flavor: string;
  chatData: ChatMessage.CreateData;
  rollData: ActorRollData;
  messageMode: string | null;
}
type TraitRollContext = Omit<RollContext, 'rollClass'> & {
  actor: SwadeActor | null;
};

type RollClassType = typeof DamageRoll | typeof TraitRoll;
type SwadeRollCommand = 'damage' | 'trait';
