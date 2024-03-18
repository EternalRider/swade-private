import { SwadeRoll } from '../dice/SwadeRoll';

export class SwadeChatLog extends ChatLog {
  protected override async _processDiceCommand(
    command: string,
    matches: RegExpMatchArray,
    chatData: ChatMessageDataConstructorData,
    createOptions: DocumentModificationContext,
  ): Promise<void> {
    const actor =
      ChatMessage.getSpeakerActor(chatData.speaker) || game.user.character;
    const rollData = actor ? actor.getRollData() : {};
    const rolls: SwadeRoll[] = [];
    for (const match of matches) {
      if (!match) continue;
      const [formula, flavor] = match.slice(2, 4);
      if (flavor && !chatData.flavor) chatData.flavor = flavor;
      const roll = new SwadeRoll(formula, rollData);
      await roll.evaluate({ async: true });
      rolls.push(roll);
    }
    chatData.type = CONST.CHAT_MESSAGE_TYPES.ROLL;
    chatData.rolls = rolls;
    chatData.sound = CONFIG.sounds.dice;
    createOptions.rollMode = command;
  }
}
