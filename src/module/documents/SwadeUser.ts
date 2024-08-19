import { createGmBennyAddMessage } from '../chat';
import { shouldShowBennyAnimation } from '../util';
import { DocumentModificationOptions } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/document.mjs';

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
      if (this.bennies <= 0) return;
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
       * A hook event that is fired after a game master spends a Benny
       * @function spendBenny
       * @category Hooks
       * @param {SwadeUser} user                     The user that spent the benny
       */
      Hooks.call('swadeSpendGameMasterBenny', this);

      if (!!game.dice3d && (await shouldShowBennyAnimation())) {
        game.dice3d.showForRoll(
          await new Roll('1dB').evaluate(),
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
       * A hook event that is fired after a game master spends a Benny
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

  async refreshBennies(notify = true) {
    if (this.isGM) {
      const hasStaticBennies = game.settings.get('swade', 'staticGmBennies');
      const gmBennies = hasStaticBennies
        ? game.settings.get('swade', 'gmBennies')
        : game.users.filter((u) => u.active && !u.isGM).length;
      await this.setFlag('swade', 'bennies', gmBennies);

      /**
       * Called when a GM refreshes their bennies.
       * @param {SwadeUser} user            The GM User
       */
      Hooks.callAll('swadeRefreshGmBennies', this);
    } else if (this.character) {
      await this.character.refreshBennies(notify);
    }
    ui.players?.render(true);
  }

  protected override async _onUpdate(
    changed: foundry.documents.BaseUser.UpdateData,
    options: DocumentModificationOptions,
    userId: string,
  ) {
    await super._onUpdate(changed, options, userId);

    // If the user is a gm and their bennies were changed, re-render the players display
    if (
      this.isGM &&
      foundry.utils.getProperty(changed, 'flags.swade.bennies') !== undefined
    )
      ui.players.render(true);
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
