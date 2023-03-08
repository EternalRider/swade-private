import { ChatMessageDataConstructorData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatMessageData';
import { TraitRoll } from '../dice/TraitRoll';
import SwadeChatMessage from '../documents/chat/SwadeChatMessage';

export default class SwadeSystemHooks {
  static onRenderSwadeRollMessage(
    msg: SwadeChatMessage,
    _data: DeepPartial<ChatMessageDataConstructorData>,
    options: any,
  ) {
    const isExtra =
      msg.speakerActor?.type === 'npc' && !msg.speakerActor.isWildcard;
    const roll = msg.significantRoll;
    if (
      roll instanceof TraitRoll &&
      isExtra &&
      roll.total === 1 &&
      !roll.groupRoll
    ) {
      new Roll('1d6[Confirmation Die]').toMessage(
        {
          flavor: 'Critical Failure confirmed if die comes up as 1',
          speaker: msg['speaker'],
        },
        { rollMode: options.rollMode },
      );
    }
  }
}
