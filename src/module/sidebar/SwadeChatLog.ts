import { ActorRollData } from '../../interfaces/roll.interface';
import { DamageRoll } from '../dice/DamageRoll';
import { TraitRoll } from '../dice/TraitRoll';
import type SwadeActor from '../documents/actor/SwadeActor';
import { processFormula } from '../enrichers';

const dice = '([^#]+)(?:#(.*))?'; // Dice expression with appended flavor text

export default class SwadeChatLog extends foundry.applications.sidebar.tabs
  .ChatLog {
  static DAMAGE_ROLL_REGEXP = new RegExp(`^(\\/d(?:amage)? )${dice}$`, 'i');
  static TRAIT_ROLL_REGEXP = new RegExp(`^(\\/t(?:rait)? )${dice}$`, 'i');

  static MESSAGE_PATTERNS = {
    damage: this.DAMAGE_ROLL_REGEXP,
    trait: this.TRAIT_ROLL_REGEXP,
    ...super.MESSAGE_PATTERNS,
  };

  #swadeRollCommands: SwadeRollCommand[] = ['damage', 'trait'];

  override async processMessage(
    message: string,
    options: any = {},
  ): Promise<ChatMessage.Implementation | undefined> {
    let { speaker } = options;
    message = message.trim();
    if (!message) return;
    const cls = ChatMessage.implementation;
    speaker ??= cls.getSpeaker();

    // Parse the message to determine the matching handler
    const parsed = this.constructor.parse(message);
    const command = parsed[0];

    const isSwadeRoll = this.#swadeRollCommands.includes(command);

    if (!isSwadeRoll) return super.processMessage(message, options);

    // Set up basic chat data
    const chatData: ChatMessage.CreateData = { speaker, user: game.user.id };

    if (Hooks.call('chatMessage', this, message, chatData) === false) return;

    const createOptions: ChatMessage.Database.CreateOperation<false> = {};

    const match = parsed[1];

    await this.#processSwadeDiceCommand(
      command,
      match,
      chatData,
      createOptions,
    );

    return cls.create(chatData, createOptions);
  }

  async #processSwadeDiceCommand(
    command: SwadeRollCommand,
    match: RegExpMatchArray,
    chatData: ChatMessage.CreateData,
    createOptions: ChatMessage.Database.CreateOperation<false>,
  ) {
    const actor =
      ChatMessage.implementation.getSpeakerActor(chatData.speaker) ||
      game.user.character;
    const rollData = actor ? actor.getRollData() : {};
    const rollMode = game.settings.get('core', 'rollMode');
    const [formula, flavor] = match.slice(2, 4);

    switch (command) {
      case 'damage':
        await this.#createRoll({
          rollClass: DamageRoll,
          formula,
          flavor,
          chatData,
          rollData,
          rollMode,
        });
        break;
      case 'trait':
        await this.#processTraitRoll({
          formula,
          flavor,
          chatData,
          actor,
          rollData,
          rollMode,
        });
        break;
    }

    chatData.sound = CONFIG.sounds.dice;
    createOptions.rollMode = rollMode;
  }

  async #processTraitRoll({
    formula,
    flavor = '',
    chatData,
    actor,
    rollData,
    rollMode,
  }: TraitRollContext) {
    const processed = processFormula(formula, 'trait', actor);
    try {
      await this.#createRoll({
        rollClass: TraitRoll,
        formula: processed.formula,
        flavor,
        chatData,
        rollData,
        rollMode,
      });
    } catch (error) {
      throw new Error(`${formula} is not a valid trait roll`);
    }
  }

  async #createRoll({
    rollClass,
    formula,
    flavor = '',
    chatData,
    rollData,
    rollMode,
  }: RollContext): Promise<void> {
    if (flavor && !chatData.flavor) chatData.flavor = flavor;
    const roll = new rollClass(formula, rollData);
    await roll.evaluate({
      allowInteractive: rollMode !== CONST.DICE_ROLL_MODES.BLIND,
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
  rollMode: string | null;
}
type TraitRollContext = Omit<RollContext, 'rollClass'> & {
  actor: SwadeActor | null;
};

type RollClassType = typeof DamageRoll | typeof TraitRoll;
type SwadeRollCommand = 'damage' | 'trait';
