import { createGmBennyAddMessage } from '../chat';
import { shouldShowBennyAnimation } from '../util';

declare global {
  interface DocumentClassConfig {
    User: typeof SwadeUser;
  }

  interface FlagConfig {
    User: {
      swade: {
        bennies?: number;
        dsnCustomWildDieColors: DsnCustomWildDieColors;
        dsnCustomWildDieOptions: DsnCustomWildDieOptions;
        dsnShowBennyAnimation: boolean;
        dsnWildDie?: string;
        dsnWildDiePreset: string;
        favoriteCardsDoc?: string;
        [key: string]: unknown;
      };
    };
  }
}

export default class SwadeUser extends User {
  get bennies() {
    if (this.isGM) {
      return this.getFlag('swade', 'bennies') ?? 0;
    } else if (this.character) {
      return this.character.bennies;
    }
    return 0;
  }

  async spendBenny() {
    if (this.isGM) {
      if (this.bennies === 0) return;
      const message = await renderTemplate(
        CONFIG.SWADE.bennies.templates.spend,
        {
          target: game.user,
          speaker: game.user,
        },
      );
      const chatData = {
        content: message,
      };
      if (game.settings.get('swade', 'notifyBennies')) {
        await CONFIG.ChatMessage.documentClass.create(chatData);
      }
      await this.setFlag('swade', 'bennies', this.bennies - 1);

      /**
       * A hook event that is fired after an actor spends a Benny
       * @function spendBenny
       * @category Hooks
       * @param {SwadeUser} user                     The user that spent the benny
       */
      Hooks.call('swadeSpendGameMasterBenny', this);

      if (!!game.dice3d && (await shouldShowBennyAnimation())) {
        game.dice3d.showForRoll(
          await new Roll('1dB').evaluate({ async: true }),
          game.user!,
          true,
          null,
          false,
        );
      }
    } else if (this.character) {
      await this.character.spendBenny();
    }
  }

  async getBenny() {
    if (this.isGM) {
      await this.setFlag('swade', 'bennies', this.bennies + 1);

      /**
       * A hook event that is fired after an actor spends a Benny
       * @function spendBenny
       * @category Hooks
       * @param {SwadeUser} user                     The user that received the benny
       */
      Hooks.call('swadeGetGameMasterBenny', this);

      createGmBennyAddMessage(this, true);
    } else if (this.character) {
      await this.character.getBenny();
    }
  }

  async refreshBennies(displayToChat = true) {
    if (this.isGM) {
      const gmBennies = game.settings.get('swade', 'gmBennies');
      await this.setFlag('swade', 'bennies', gmBennies);
    } else if (this.character) {
      await this.character.refreshBennies(displayToChat);
    }
    ui.players?.render(true);
  }
}

export interface DsnCustomWildDieColors {
  labelColor: string;
  diceColor: string;
  outlineColor: string;
  edgeColor: string;
}
export interface DsnCustomWildDieOptions {
  texture: Array<string>;
  material: 'plastic' | 'metal' | 'glass' | 'wood' | 'chrome';
  font: string;
}
