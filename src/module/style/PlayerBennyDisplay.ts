import { SWADE } from '../config';

export default class PlayerBennyDisplay {
  static async append(player: HTMLElement, _options: any) {
    const user = game.users!.get(player.dataset.userId!, { strict: true });

    const counter = document.createElement('span');
    counter.classList.add('bennies-count');
    counter.addEventListener('mouseleave', PlayerBennyDisplay.updateBennyCount);

    // GM interactive interface
    if (game.user?.isGM) {
      counter.classList.add('bennies-gm');
      const callback = user.isGM
        ? PlayerBennyDisplay.onSpendBenny
        : PlayerBennyDisplay.onGiveBenny;
      counter.addEventListener('click', callback);
      counter.addEventListener(
        'mouseover',
        () => (counter.innerHTML = user.isGM ? '-' : '+'),
      );
      counter.title = user.isGM
        ? game.i18n.localize('SWADE.BenniesSpend')
        : game.i18n.localize('SWADE.BenniesGive');

      // Manage GM Bennies
      if (user.isGM) {
        const bennies = user.getFlag('swade', 'bennies');
        // Set bennies to number as defined in GM benny setting
        if (!bennies) {
          const gmBennies = game.settings.get('swade', 'gmBennies');
          await user.setFlag('swade', 'bennies', gmBennies);
          counter.innerHTML = gmBennies.toString();
        } else {
          const bennies = user.getFlag('swade', 'bennies') ?? 0;
          counter.innerHTML = bennies.toString();
        }
      } else if (user.character) {
        counter.innerHTML = user.character.bennies.toString();
      }
    } else {
      // Player view
      if (user.isGM) {
        const bennies = user.getFlag('swade', 'bennies') ?? 0;
        counter.innerHTML = bennies.toString();
      } else if (user.character) {
        counter.addEventListener('click', PlayerBennyDisplay.onSpendBenny);
        counter.addEventListener('mouseover', () => (counter.innerHTML = '-'));
        counter.title = game.i18n.localize('SWADE.BenniesSpend');
        counter.innerHTML = user.character.bennies.toString();
      }
    }
    player.append(counter);
  }

  static async refreshAll() {
    for (const user of game.users!.values()) {
      await user.refreshBennies(false);
    }

    const npcWildcardsToRefresh = game.actors!.filter(
      (a) => a.type === 'npc' && a.isWildcard,
    );

    const hardChoices = game.settings.get('swade', 'hardChoices');
    for (const actor of npcWildcardsToRefresh) {
      if (hardChoices) {
        await actor.update({ 'system.bennies.value': 0 });
      } else {
        await actor.refreshBennies(false);
      }
    }

    if (game.settings.get('swade', 'notifyBennies')) {
      const message = await renderTemplate(
        SWADE.bennies.templates.refreshAll,
        {},
      );
      CONFIG.ChatMessage.documentClass.create({
        content: message,
      });
    }
    ui.players?.render(true);
  }

  static async onGiveBenny(ev: MouseEvent) {
    const target = ev.currentTarget as HTMLElement;
    const userId = target.parentElement?.dataset.userId;
    const user = game.users?.get(userId!, { strict: true });
    await user?.getBenny();
    ui.players?.render(true);
  }

  static async onSpendBenny(ev: MouseEvent) {
    ev.preventDefault();
    const target = ev.currentTarget as HTMLElement;
    const userId = target.parentElement?.dataset.userId;
    const user = game.users?.get(userId!);
    await user?.spendBenny();
  }

  private static updateBennyCount(ev: MouseEvent) {
    ev.preventDefault();
    const target = ev.currentTarget as HTMLElement;
    const userId = target.parentElement?.dataset.userId!;
    const user = game.users!.get(userId, { strict: true });
    target.innerHTML = user.bennies.toString();
  }
}
