import { DocumentOnCreateOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';
import { SwadeRoll } from '../dice/SwadeRoll';

export default class SwadeChatLog extends ChatLog {
  protected override async _processDiceCommand(
    command: string,
    matches: RegExpMatchArray[],
    chatData: foundry.documents.BaseChatMessage.ConstructorData,
    createOptions: DocumentOnCreateOptions<'ChatMessage'>,
  ): Promise<void> {
    const actor =
      ChatMessage.getSpeakerActor(chatData.speaker) || game.user.character;
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
      chatData.content = rolls.reduce((t, r) => t + (r.total as number), 0);
    }
    createOptions.rollMode = command;
  }
}
