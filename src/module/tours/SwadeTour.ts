import { Advance } from '../../interfaces/Advance.interface';
import { AdvanceEditor } from '../apps/AdvanceEditor';
import SettingConfigurator from '../apps/SettingConfigurator';
import { SwadeActorTweaks } from '../apps/SwadeDocumentTweaks';
import { constants } from '../constants';
import { CreatureData } from '../data/actor/base';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeItem from '../documents/item/SwadeItem';

export default class SwadeTour extends foundry.nue.Tour {
  configurator?: SettingConfigurator;
  actor?: SwadeActor;
  item?: SwadeItem;
  tweaks?: SwadeActorTweaks;
  advanceEditor?: AdvanceEditor;
  journalEntry?: JournalEntry;
  journalEntryPage?: JournalEntryPage;

  override async _preStep() {
    await super._preStep();

    const currentStep = this.currentStep as SwadeTourStep;

    let earlyReturn;

    // Actions
    if (currentStep.actions)
      earlyReturn = await this.performActions(currentStep.actions);

    if (earlyReturn === true) return;
    if (earlyReturn === false) return this.exit();

    // Modify any game settings we need to make the magic happen
    if (currentStep.settings)
      earlyReturn = await this.updateSettings(currentStep.settings);

    if (earlyReturn === true) return;
    if (earlyReturn === false) return this.exit();

    // If we need an actor, make it and render
    if (currentStep.actor)
      earlyReturn = await this.makeActor(currentStep.actor);

    if (earlyReturn === true) return;
    if (earlyReturn === false) return this.exit();

    // Journal and Journal Page creation
    if (currentStep.journalEntry)
      earlyReturn = await this.makeJournalEntry(currentStep.journalEntry);
    if (currentStep.journalEntryPage)
      earlyReturn = await this.makeJournalEntryPage(
        currentStep.journalEntryPage,
      );

    if (earlyReturn === true) return;
    if (earlyReturn === false) return this.exit();

    if (currentStep.itemName) await this.renderItem(currentStep.itemName);

    // Create an advance for possible use later
    if (currentStep.advance) await this.makeAdvance(currentStep.advance);

    if (currentStep.tab)
      // If there's tab info, switch to that tab
      await this.switchTab(currentStep.tab);
    // Leaving to the end because we're only ever going to need one actor at a time and it's created much earlier
    currentStep.selector = currentStep.selector?.replace(
      'actorSheetID',
      this.actor?.sheet?.id || '',
    );
    // Same with Tweaks dialog
    currentStep.selector = currentStep.selector?.replace(
      'tweaks',
      this.tweaks?.id || '',
    );
    // And of course the journal pages
    currentStep.selector = currentStep.selector?.replace(
      'journalSheetID',
      this.journalEntry?.sheet?.id || '',
    );
    currentStep.selector = currentStep.selector?.replace(
      'journalPageSheetID',
      this.journalEntryPage?.sheet?.id || '',
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
    if (!game!.user!.can('SETTINGS_MODIFY')) {
      const alreadySet = Object.entries(settings).every(([k, v]) => {
        if (k === 'settingFields') {
          const additionalFields = game.settings.get('swade', k);
          return Object.entries(additionalFields).every(([documentType, f]) => {
            if (!v[documentType]) return true;
            return Object.entries(v[documentType]).every(
              ([field, value]: [string, Record<string, any>]) => {
                return foundry.utils.objectsEqual(f[field], value);
              },
            );
          });
        } else {
          return game.settings.get('swade', k) === v;
        }
      });
      if (!alreadySet) {
        ui.notifications.error('SWADE.TOURS.ERROR.SettingPermission', {
          localize: true,
        });
        this.exit();
        return false;
      } else {
        const settingsDone = this.steps.findIndex(
          (s, i) =>
            i > this.stepIndex! &&
            !s.selector!.startsWith('#settingConfig') &&
            !s.selector!.startsWith('#client-settings'),
        );
        await this.earlyProgress(settingsDone);
        return true;
      }
    }

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
    const actCls = getDocumentClass('Actor') as typeof SwadeActor;

    if (!actCls.canUserCreate(game.user!)) {
      ui.notifications.error('SWADE.TOURS.ERROR.ActorCreatePermission', {
        localize: true,
      });
      this.exit();
      return false;
    }

    actor.name = game.i18n.localize(actor.name!);
    if (actor.items) {
      for (const item of actor.items) {
        item.name = game.i18n.localize(item.name);
      }
    }
    this.actor = (await actCls.create(actor)) as SwadeActor;
    //@ts-expect-error Calling _render because it's async unlike render
    await this.actor.sheet?._render(true);
  }

  /**
   * Renders an item by name
   * @param itemName  Item to fetch on the actor
   */
  async renderItem(itemName: string) {
    // Alternatively, if we need to fetch an item from the actor
    // let's do that and potentially render the sheet
    if (!this.actor) {
      console.warn('No actor found for step ' + this.currentStep!.title);
    }
    const localizedName = game.i18n.localize(itemName);
    this.item = this.actor?.items.getName(localizedName) as SwadeItem;
    const app = this.item!.sheet;
    //@ts-expect-error Calling _render because it's async unlike render
    if (!app.rendered) await app._render(true);
    // Assumption: Any given tour user might need to move back and forth between items
    // but only one actor is active at a time, so itemName is always specified when operating on an embedded item sheet
    // but the framework doesn't allow bouncing back and forth between actors
    this.currentStep!.selector = this.currentStep!.selector!.replace(
      'itemSheetID',
      app!.id,
    );
  }

  async makeAdvance(advance: TourAdvance) {
    if (!this.actor || !(this.actor.system instanceof CreatureData)) return;
    const advances = this.actor.system.advances.list;
    advances.set(advance.id, advance);
    await this.actor.update({ 'system.advances.list': advances.toJSON() });
    if (advance.dialog) {
      this.advanceEditor = new AdvanceEditor({ advance, actor: this.actor });
      //@ts-expect-error Calling _render because it's async unlike render
      await this.advanceEditor._render(true);
    }
  }

  async makeJournalEntry(journalEntry: Partial<JournalEntry>) {
    const journalCls = getDocumentClass('JournalEntry');

    if (!journalCls.canUserCreate(game.user!)) {
      ui.notifications.error('SWADE.TOURS.ERROR.JournalCreatePermission', {
        localize: true,
      });
      this.exit();
      return false;
    }
    journalEntry.name = game.i18n.localize(journalEntry.name!);
    this.journalEntry = await journalCls.create(journalEntry);
    //@ts-expect-error Calling _render because it's async unlike render
    await this.journalEntry.sheet?._render(true);
  }

  async makeJournalEntryPage(journalEntryPage: Partial<JournalEntryPage>) {
    journalEntryPage.name = game.i18n.localize(journalEntryPage.name!);
    this.journalEntryPage = await getDocumentClass('JournalEntryPage').create(
      journalEntryPage,
      { parent: this.journalEntry },
    );
    await this.journalEntryPage.sheet?._render(true);
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
          this.tweaks = new SwadeActorTweaks({ document: this.actor! });
          await this.tweaks._render(true);
        }
        this.tweaks.activateTab(tab.id);
      }
    }
  }

  async earlyProgress(stepIndex) {
    const progress = game.settings.get('core', 'tourProgress') as Record<
      string,
      Record<string, number>
    >;
    const namespace = this.namespace!;
    if (!(namespace in progress)) progress[namespace] = {};
    progress[namespace][this.id!] = stepIndex;
    game.settings.set('core', 'tourProgress', progress);
    this._reloadProgress();
    await this._preStep();
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
  journalEntry?: Partial<JournalEntry>;
  journalEntryPage?: Partial<JournalEntryPage>;
}

interface TourAdvance extends Advance {
  dialog: boolean;
}
