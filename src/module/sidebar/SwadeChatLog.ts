import { SwadeRoll } from '../dice/SwadeRoll';

export default class SwadeChatLog extends foundry.applications.sidebar.tabs
  .ChatLog {
  protected async _processDiceCommand(
    command: 'selfroll' | 'publicroll' | 'gmroll' | 'blindroll',
    matches: RegExpMatchArray[],
    chatData: ChatMessage.CreateData,
    createOptions: ChatMessage.Database.OnCreateOperation,
  ): Promise<void> {
    const actor =
      ChatMessage.implementation.getSpeakerActor(chatData.speaker) ||
      game.user.character;
    const rollData = actor?.getRollData() ?? {};
    const rolls: (Roll | SwadeRoll)[] = [];
    for (const match of matches) {
      if (!match) continue;
      const [formula, flavor] = match.slice(2, 4);
      if (flavor && !chatData.flavor) chatData.flavor = flavor;
      const roll = Roll.create(formula, rollData) as SwadeRoll | Roll;
      await roll.evaluate();
      rolls.push(roll);
    }
    chatData.rolls = rolls;
    chatData.sound = CONFIG.sounds.dice;
    if (!rolls.every((r) => r instanceof SwadeRoll)) {
      chatData.content = rolls
        .reduce((t, r) => t + (r.total as number), 0)
        .toString();
    }
    createOptions.rollMode = command;
  }
}
