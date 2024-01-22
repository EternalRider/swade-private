import { Advance } from '../../interfaces/Advance.interface';
import { AdvanceEditor } from '../apps/AdvanceEditor';
import SettingConfigurator from '../apps/SettingConfigurator';
import SwadeDocumentTweaks from '../apps/SwadeDocumentTweaks';
import { constants } from '../constants';
import { CommonActorData } from '../data/actor/common';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';

export default class SwadeTour extends Tour {
  configurator?: SettingConfigurator;
  actor?: SwadeActor;
  item?: SwadeItem;
  tweaks?: SwadeDocumentTweaks;
  advanceEditor?: AdvanceEditor;

  override async _preStep() {
    await super._preStep();

    const currentStep = this.currentStep as SwadeTourStep;

    // Actions
    if (currentStep.actions) await this.performActions(currentStep.actions);

    // Modify any game settings we need to make the magic happen
    if (currentStep.settings) await this.updateSettings(currentStep.settings);

    // If we need an actor, make it and render
    if (currentStep.actor) await this.makeActor(currentStep.actor);

    // Alternatively, if we need to fetch an item from the actor
    // let's do that and potentially render the sheet
    if (currentStep.itemName) {
      if (!this.actor) {
        console.warn('No actor found for step ' + currentStep.title);
      }
      const localizedName = game.i18n.localize(currentStep.itemName);
      this.item = this.actor?.items.getName(localizedName)!;
      const app = this.item!.sheet;
      //@ts-expect-error Calling _render because it's async unlike render
      if (!app.rendered) await app._render(true);
      // Assumption: Any given tour user might need to move back and forth between items, but only one actor is active at a time, so itemName is always specified when operating on an embedded item sheet but the framework doesn't allow bouncing back and forth between actors
      currentStep.selector = currentStep.selector?.replace(
        'itemSheetID',
        app!.id,
      );
    }

    // Create an advance for possible use later
    if (currentStep.advance) await this.makeAdvance(currentStep.advance);

    if (currentStep.tab)
      // If there's tab info, switch to that tab
      await this.switchTab(currentStep.tab);
    // Leaving to the end because we're only ever going to need one actor at a time and it's created much earlier
    currentStep.selector = currentStep.selector?.replace(
      'actorSheetID',
      this.actor?.sheet?.id!,
    );
    // Same with Tweaks dialog
    currentStep.selector = currentStep.selector?.replace(
      'tweaks',
      this.tweaks?.id || '',
    );
  }

  async performActions(actions: Array<string>) {
    for (const action of actions) {
      switch (action) {
        case 'closeTweaks':
          this.tweaks?.close();
          break;
      }
    }
  }

  /**
   * Update settings as required by the tour
   * @param settings Settings to update
   */
  async updateSettings(settings: Record<string, any>) {
    for (const [k, v] of Object.entries(settings)) {
      if (k !== 'settingFields') await game.settings.set('swade', k, v);
      else {
        const settingFields = game.settings.get('swade', k);
        foundry.utils.mergeObject(settingFields, v);
        await game.settings.set('swade', k, settingFields);
      }
    }
    // There's no automatic update of the configurator after setting updates
    if (this.configurator?.rendered) {
      this.configurator.render();
    }
  }

  /**
   * Make and render an actor
   * @param actor Actor Data
   */
  async makeActor(actor: Partial<SwadeActor>) {
    actor.name = game.i18n.localize(actor.name!);
    if (actor.items) {
      for (const item of actor.items) {
        item.name = game.i18n.localize(item.name);
      }
    }
    this.actor = (await getDocumentClass('Actor').create(actor)) as SwadeActor;
    //@ts-expect-error Calling _render because it's async unlike render
    await this.actor.sheet?._render(true);
  }

  async makeAdvance(advance: TourAdvance) {
    if (!this.actor || !(this.actor.system instanceof CommonActorData)) return;
    const advances = this.actor.system.advances.list;
    advances.set(advance.id, advance);
    await this.actor.update({ 'system.advances.list': advances.toJSON() });
    if (advance.dialog) {
      this.advanceEditor = new AdvanceEditor({ advance, actor: this.actor });
      //@ts-expect-error Calling _render because it's async unlike render
      await this.advanceEditor._render(true);
    }
  }

  /**
   * Flip between tabs of various applications
   * @param tab The tab to switch to
   */
  async switchTab(tab: Exclude<SwadeTourStep['tab'], undefined>) {
    switch (tab.parent) {
      case constants.TOUR_TAB_PARENTS.SIDEBAR:
        ui.sidebar.activateTab(tab.id);
        break;
      case constants.TOUR_TAB_PARENTS.GAMESETTINGS: {
        const app = game.settings.sheet as SettingsConfig;
        //@ts-expect-error Calling _render because it's async unlike render
        await app._render(true);
        app.activateTab(tab.id);
        break;
      }
      case constants.TOUR_TAB_PARENTS.CONFIGURATOR: {
        if (!this.configurator) {
          const configurator: ClientSettings.PartialSettingSubmenuConfig =
            game.settings.menus.get('swade.setting-config')!;
          this.configurator = new configurator.type();
        }
        //@ts-expect-error Calling _render because it's async unlike render
        await this.configurator._render(true);
        this.configurator!.activateTab(tab.id);
        break;
      }
      case constants.TOUR_TAB_PARENTS.ACTOR: {
        if (!this.actor) {
          console.warn('No Actor Found');
          break;
        }
        const app = this.actor.sheet;
        app?.activateTab(tab.id);
        break;
      }
      case constants.TOUR_TAB_PARENTS.ITEM: {
        if (!this.item) {
          console.warn('No Item Found');
          break;
        }
        const app = this.item.sheet;
        app?.activateTab(tab.id);
        break;
      }
      case constants.TOUR_TAB_PARENTS.TWEAKS: {
        if (!this.tweaks) {
          this.tweaks = new SwadeDocumentTweaks(this.actor!);
          //@ts-expect-error Calling _render because it's async unlike render
          await this.tweaks._render(true);
        }
        this.tweaks.activateTab(tab.id);
      }
    }
  }
}

interface SwadeTourStep extends TourStep {
  tab?: {
    parent: string;
    id: string;
  };
  actor?: Partial<SwadeActor>;
  itemName?: string;
  advance?: TourAdvance;
  settings?: Record<string, any>;
  actions?: Array<string>;
}

interface TourAdvance extends Advance {
  dialog: boolean;
}
