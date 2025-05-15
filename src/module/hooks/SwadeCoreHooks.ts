/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Plugin } from 'prosemirror-state';
import { CanvasDropData } from '../../globals';
import CharacterSummarizer from '../CharacterSummarizer';
import { Logger } from '../Logger';
import ActionCardEditor from '../apps/ActionCardEditor';
import { CompendiumTOC } from '../apps/CompendiumTOC';
import SwadeToken from '../canvas/SwadeToken';
import * as chaseUtils from '../chaseUtils';
import * as chat from '../chat';
import { SWADE } from '../config';
import { constants } from '../constants';
import { BaseEffectData } from '../data/effect/base';
import { ModifierData } from '../data/effect/modifier';
import SwadeActor from '../documents/actor/SwadeActor';
import SwadeCards from '../documents/card/SwadeCards';
import SwadeChatMessage from '../documents/chat/SwadeChatMessage';
import SwadeCombat from '../documents/combat/SwadeCombat';
import * as migrations from '../migration/migration';
import { ProseMirrorTableResultDropFillerPlugin } from '../models/ProseMirrorTableResultDropFillerPlugin';
import { registerCompendiumArt } from '../setup/compendiumArt';
import * as setup from '../setup/setupHandler';
import PlayerBennyDisplay from '../style/PlayerBennyDisplay';
import { UserSummary } from '../style/UserSummary';
import { stringToHTML } from '../util';
import { onHotbarDrop } from './hotbarDrop';

/** Hook callbacks for core hooks surrounding system setup and functionality */
export default class SwadeCoreHooks {
  static onSetup() {
    registerCompendiumArt();

    // Improve discoverability of map notes
    game.settings.settings.get('core.notesDisplayToggle').default = true;
  }

  static async onReady() {
    //set up the compendium tables of content
    for (const pack of game.packs) {
      const isRightType = ['Actor', 'Item', 'JournalEntry'].includes(
        pack.metadata.type,
      );
      const tocBlockList = game.settings.get('swade', 'tocBlockList');
      const isBlocked = tocBlockList[pack.collection];
      if (isRightType && !isBlocked) {
        // @ts-expect-error The type check isn't properly narrowing
        pack.apps = [new CompendiumTOC({ collection: pack })];
      }
    }

    SWADE.diceConfig.flags = {
      dsnShowBennyAnimation: {
        type: Boolean,
        default: true,
        label: game.i18n.localize('SWADE.ShowBennyAnimation'),
        hint: game.i18n.localize('SWADE.ShowBennyAnimationDesc'),
      },
      dsnWildDiePreset: {
        type: String,
        default: 'none',
        label: game.i18n.localize('SWADE.WildDiePreset'),
        hint: game.i18n.localize('SWADE.WildDiePresetDesc'),
      },
      dsnWildDie: {
        type: String,
        default: 'none',
        label: game.i18n.localize('SWADE.WildDieTheme'),
        hint: game.i18n.localize('SWADE.WildDieThemeDesc'),
      },
      dsnCustomWildDieColors: {
        type: Object,
        default: {
          labelColor: '#000000',
          diceColor: game.user?.color,
          outlineColor: game.user?.color,
          edgeColor: game.user?.color,
        },
      },
      dsnCustomWildDieOptions: {
        type: Object,
        default: {
          font: 'auto',
          material: 'auto',
          texture: 'none',
        },
      },
    };

    //setup world and do migrations
    if (game.user?.isGM) {
      //set up the world if needed
      await setup.setupWorld();

      // Determine whether a system migration is required and feasible
      const currentVersion = game.settings.get(
        'swade',
        'systemMigrationVersion',
      );
      //TODO Adjust this version every time a migration needs to be triggered
      const needsMigrationVersion = '3.2.3';
      //Minimal compatible version needed for the migration
      const compatibleMigrationVersion = '3.0.0';
      //If the needed migration version is newer than the old migration version then migrate the world
      const needsMigration = foundry.utils.isNewerVersion(
        needsMigrationVersion,
        currentVersion,
      );
      if (needsMigration) {
        // Perform the migration
        if (
          currentVersion !== '0.0.0' &&
          !foundry.utils.isNewerVersion(
            currentVersion,
            compatibleMigrationVersion,
          )
        ) {
          Logger.warn('SWADE.SysMigrationWarning', {
            toast: true,
            permanent: true,
            localize: true,
          });
        }
        await migrations.migrateWorld();
      }
    }

    // set the system as ready
    game.swade.ready = true;

    /**
     * @category Hooks
     * This hook is called once swade is done setting up itself
     */
    Hooks.callAll('swadeReady');
  }

  static onI18nInit() {
    //localize the ranks
    SWADE.ranks = SWADE.ranks.map((rank) => game.i18n.localize(rank));

    //localize the scales
    SWADE.scales = SWADE.scales.map((scale) => game.i18n.localize(scale));

    //localize the prototype modifiers
    for (const group of SWADE.prototypeRollGroups) {
      group.name = game.i18n.localize(group.name);
      for (const modifier of group.modifiers) {
        modifier.label = game.i18n.localize(modifier.label);
      }
    }

    //set the localized parry skill
    [CONFIG.statusEffects, SWADE.statusEffects].forEach((arr) => {
      const proneParryModifier = arr
        .find((e) => e.id === 'prone')
        ?.changes?.find((c) => c.key?.startsWith('@Skill'));
      if (proneParryModifier) {
        proneParryModifier.key = `@Skill{${game.settings.get(
          'swade',
          'parryBaseSkill',
        )}}[system.die.modifier]`;
      }
    });

    //localize the Attributes
    for (const attribute in SWADE.attributes) {
      const { long, short } = SWADE.attributes[attribute];
      SWADE.attributes[attribute] = {
        long: game.i18n.localize(long),
        short: game.i18n.localize(short),
      };
    }
  }

  static onRenderActorDirectory(
    app: ActorDirectory,
    html: HTMLElement,
    _data: any,
  ) {
    // Mark all Wildcards in the Actors sidebars with an icon
    const entries = html.querySelectorAll('.entry-name');
    const wildcards = app.collection.filter(
      (a) => a.isWildcard && a.type === 'character',
    );

    //if the player is not a GM, then don't mark the NPC wildcards
    if (!game.settings.get('swade', 'hideNPCWildcards') || game.user?.isGM) {
      const npcWildcards = app.collection.filter(
        (a) => a.isWildcard && a.type === 'npc',
      );
      wildcards.push(...npcWildcards);
    }

    for (let i = 0; i < entries.length; i++) {
      const element = entries[i];
      const actorID = element.parentElement?.dataset.entryId;
      const wildcard = wildcards.find((a) => a.id === actorID);

      if (wildcard) {
        element.innerHTML = `
					<a><img src="${SWADE.wildCardIcons.regular}" class="wildcard-icon">${wildcard.name}</a>
					`;
      }
    }
  }

  static onRenderSettings(app: Settings, html: HTMLElement) {
    //get system info
    const systemInfo = html.querySelector('.info div.system');

    //create system links
    const systemLinks = document.createElement('div');
    systemLinks.classList.add('system-links');
    const links: Array<{ label: string; url?: string; click?: EventListener }> =
      [
        {
          label: game.i18n.localize('SWADE.SystemLinks.ReportAnIssue'),
          url: 'https://gitlab.com/peginc/swade/-/issues/new',
        },
        {
          label: game.i18n.localize('SWADE.SystemLinks.Changelog'),
          url: game.system.changelog as string,
        },
        {
          label: game.i18n.localize('SWADE.SystemLinks.Wiki'),
          click: (_ev) => game.packs.get('swade.system-docs')?.render(true),
        },
      ];

    //insert links links
    links.forEach((link) => {
      const anchor = document.createElement('a');
      anchor.innerText = link.label;
      if (link.url) {
        anchor.href = link.url;
      }
      if (link.click) {
        anchor.addEventListener('click', link.click);
      }

      systemLinks.append(anchor);
    });

    systemInfo!.after(systemLinks);
  }

  static async onGetActorContextOptions(
    app: foundry.applications.api.ApplicationV2,
    options: ContextMenu.Entry[],
  ) {
    const newOptions: ContextMenu.Entry[] = [];

    // Don't want to add to context menu for compendium entries
    if (app instanceof foundry.applications.sidebar.apps.Compendium) return;

    // Invoke character summarizer on selected character
    newOptions.push({
      name: 'SWADE.ShowCharacterSummary',
      icon: '<i class="fa-solid fa-users"></i>',
      callback: (li) => {
        const actor = game.actors!.get(li.dataset.entryId, { strict: true });
        CharacterSummarizer.summarizeCharacters([actor]);
      },
      condition: (li) => {
        const actor = game.actors!.get(li.dataset.entryId, { strict: true });
        return (
          actor.permission > CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED &&
          CharacterSummarizer.isSupportedActorType(actor)
        );
      },
    });
    options.splice(0, 0, ...newOptions);
  }

  static onRenderCompendiumDirectory(
    app: CompendiumDirectory,
    html: HTMLElement,
    _data: any,
    _options: any,
  ) {
    const tocBlockList = game.settings.get('swade', 'tocBlockList');
    for (const li of html.querySelectorAll('li.directory-item')) {
      const pack = li.dataset.pack as string;
      const statusIcons = li.querySelector<HTMLDivElement>('.status-icons')!;
      if (tocBlockList[pack]) {
        const template = document.createElement('template');
        template.innerHTML = '<i class="fa-solid fa-align-slash"></i>';
        statusIcons.prepend(template.content.firstChild!);
      }
    }
  }

  static async onRenderCompendium(
    app: CompendiumCollection<CompendiumCollection.Metadata>,
    html: HTMLElement,
    _data: any,
    _options: any,
  ) {
    //don't mark if the user is not a GM
    if (game.settings.get('swade', 'hideNPCWildcards') && !game.user?.isGM)
      return;
    //Mark Wildcards in the compendium
    if (app.documentName === 'Actor') {
      //@ts-expect-error collection is now a CompendiumCollection
      const content = await app.collection.getIndex('system.wildcard');
      const ids: string[] = content
        .filter(
          (a: SwadeActor) =>
            (a.type === 'character' ||
              foundry.utils.getProperty(a, 'system.wildcard')) &&
            a.name !== '#[CF_tempEntity]',
        )
        .map((actor) => actor._id);

      const found = html.querySelectorAll('.directory-item');
      found.forEach((el) => {
        const id = el.dataset.entryId!;
        if (ids.includes(id)) {
          const name = el.children[1];
          name.insertAdjacentHTML(
            'afterbegin',
            `<img src="${SWADE.wildCardIcons.compendium}" class="wildcard-icon">`,
          );
        }
      });
    }
  }

  static onGetCardsContextOptions(
    app: foundry.applications.api.ApplicationV2,
    options: ContextMenu.Entry[],
  ) {
    // Don't want to add to context menu for compendium entries
    if (app instanceof foundry.applications.sidebar.apps.Compendium) return;

    const actionCardEditor: ContextMenu.Entry = {
      name: 'SWADE.OpenACEditor',
      icon: '<i class="fa-solid fa-edit"></i>',
      condition: (li) => {
        const deck = game.cards!.get(li.dataset.entryId, { strict: true });
        return (
          deck.type === 'deck' &&
          deck.isOwner &&
          deck.cards.contents.every((c) => c.type === 'poker')
        );
      },
      callback: async (li) => {
        const deck = game.cards!.get(li.dataset.entryId, { strict: true });
        new ActionCardEditor(deck).render(true);
      },
    };
    const chaseLayout: ContextMenu.Entry = {
      name: 'SWADE.LayOutChaseWithDeck',
      icon: '<i class="fa-solid fa-shipping-fast"></i>',
      condition: (li) => {
        //return early if there's no canvas or scene to lay out cards
        if (!canvas || !canvas.ready || !canvas.scene) return false;
        const cardsID = li.dataset.entryId;
        const deck = game.cards!.get(cardsID, { strict: true });
        const isActionDeck =
          game.settings.get('swade', 'actionDeck') === cardsID;
        return (
          deck.type === 'deck' &&
          !isActionDeck &&
          deck.cards.contents.every((c) => c.type === 'poker')
        );
      },
      callback: (li) => {
        const deck = game.cards!.get(li.dataset.entryId, { strict: true });
        chaseUtils.layoutChase(deck);
      },
    };
    const setActionDeck: ContextMenu.Entry = {
      name: 'SWADE.SetActionDeck',
      icon: '<i class="fas fa-swords"></i>',
      condition: (li) => {
        const cardsID = li.dataset.entryId;
        const deck = game.cards!.get(cardsID, { strict: true });
        const isActionDeck =
          game.settings.get('swade', 'actionDeck') === cardsID;
        return (
          deck.type === 'deck' &&
          !isActionDeck &&
          deck.cards.contents.every((c) => c.type === 'poker')
        );
      },
      callback: async (li) => {
        const deckId = li.dataset.entryId;
        game.settings.set('swade', 'actionDeck', deckId);
      },
    };

    options.push(actionCardEditor, chaseLayout, setActionDeck);
  }

  static onGetCompendiumContextOptions(
    app: foundry.applications.api.ApplicationV2,
    options: ContextMenu.Entry[],
  ) {
    options.push(
      {
        name: 'SWADE.CompendiumTOC.Toggle',
        icon: '<i class="fa-solid fa-book"></i>',
        condition: (li) => {
          const pack = game.packs.get(li.dataset.pack, { strict: true });
          const rightType = CompendiumTOC.ALLOWED_TYPES.includes(
            pack.metadata.type,
          );
          return !!game.user?.isGM && rightType;
        },
        callback: async (li) => {
          const confirmation = await foundry.applications.api.DialogV2.confirm({
            window: {
              title: game.i18n.localize('SWADE.CompendiumTOC.Dialog.Title'),
            },
            content: `<p>${game.i18n.localize(
              'SWADE.CompendiumTOC.Dialog.Content',
            )}</p>`,
            defaultYes: false,
          });
          if (!confirmation) return;
          const tocBlockList = game.settings.get('swade', 'tocBlockList');
          const packId = li.dataset.pack as string;
          const isCurrentlyBlocked = tocBlockList[packId] ?? false;
          Logger.debug(`Toggling ${packId} to ${!isCurrentlyBlocked}`);
          //set the new value
          tocBlockList[packId] = !isCurrentlyBlocked;
          await game.settings.set('swade', 'tocBlockList', tocBlockList);
          //reload all clients to load the new settings.
          if (game.user?.isGM) game.socket?.emit('reload');
          foundry.utils.debouncedReload();
        },
      },
      {
        name: 'SWADE.MigrateCompendium',
        icon: '<i class="fa-solid fa-right-left"></i>',
        condition: (li) => {
          const pack = game.packs.get(li.dataset.pack, { strict: true });
          const isRightPackType = ['Actor', 'Item', 'Scene'].includes(
            pack.metadata.type,
          );
          return !!game.user?.isGM && isRightPackType;
        },
        callback: async (li) =>
          await migrations.migrateCompendium(
            game.packs.get(li.dataset.pack, { strict: true }),
          ),
      },
    );
  }

  /** Add roll data to the message for formatting of dice pools*/
  static onRenderChatMessageHTML(
    msg: SwadeChatMessage,
    html: HTMLElement,
    _data: Parameters<Hooks.StaticCallbacks['renderChatMessage']>[2],
  ) {
    const makeTableResultsDraggable = () => {
      const results = html.querySelectorAll<HTMLElement>(
        '.table-draw .table-result',
      );
      if (!results.length) return;
      results.forEach((e) => {
        e.draggable = true;
        e.addEventListener('dragstart', (ev) => {
          const dragData = game.tables
            ?.get(msg.getFlag('core', 'RollTable') ?? '')
            ?.results.get(e.dataset.resultId as string)
            .toDragData();
          if (!dragData) return;
          ev.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
        });
      });
    };

    if (msg.getFlag('core', 'RollTable') && msg.rolls) {
      makeTableResultsDraggable();
    }
  }

  static async onUpdateCombat(
    _document: SwadeCombat,
    _change: any,
    _options: any,
    _userId: string,
  ) {
    ui.combat.scrollToTurn();
  }

  /** Change current GM Bennies count */
  static async onUserConnected(user: User.Implementation, connected: boolean) {
    const gm = game.users.activeGM;
    const hasStaticBennies = game.settings.get('swade', 'staticGmBennies');
    if (user.isGM || hasStaticBennies || !gm?.isSelf) return false;
    const newBennies = connected ? gm.bennies + 1 : gm.bennies - 1;
    await gm.setFlag('swade', 'bennies', newBennies);
    ui.players?.render({ force: true });
  }

  /** Add benny management to the player list */
  static async onRenderPlayers(
    _list: PlayerList,
    html: HTMLElement,
    _options: any,
  ) {
    const users = html.querySelectorAll<HTMLLIElement>('.player');
    //add the Benny Display;
    users.forEach((el) => new PlayerBennyDisplay(el));
    users.forEach((el) => new UserSummary(el));
  }

  static onRenderUserConfig(
    app: UserConfig,
    html: HTMLElement,
    data: Record<string, unknown>,
  ) {
    // resize the element so it'll fit the new stuff
    html.style.height = 'auto';

    //get possible
    const possibleCardsDocs = game.cards!.filter(
      (c) =>
        c.type === 'hand' &&
        c.permission === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    );

    const form = html.querySelector<HTMLDivElement>('.standard-form');
    const footer = html.querySelector<HTMLDivElement>('.form-footer');
    if (!form || !footer) return;

    //return early to avoid double rendering
    if (html.querySelector('div.swade-favorite-cards')) return;

    const userConfigLabel = game.i18n.localize(
      'SWADE.Keybindings.OpenFavoriteCards.UserConfigLabel',
    );
    const options = possibleCardsDocs.map((c) => {
      const favoriteCards = game.user?.getFlag('swade', 'favoriteCardsDoc');
      const sel = c.id === favoriteCards ? 'selected' : '';
      return `<option value="${c.id}" ${sel}>${c.name}</option>`;
    });

    const template = `
    <fieldset>
      <legend>${userConfigLabel}</legend>
      <div class="form-group stacked swade-favorite-cards">
        <select name="flags.swade.favoriteCardsDoc">
        <option value="">${game.i18n.localize('SWADE.Keybindings.OpenFavoriteCards.HandNone')}</option>
        ${options.join('\n')}
        </select>
      </div>
    </fieldset>
    `;

    form.insertBefore(stringToHTML<HTMLFieldSetElement>(template), footer);
  }

  static onHotbarDrop(
    _hotbar: Hotbar,
    data: { type: string; uuid: string },
    slot: number,
  ) {
    if (data.type === 'Item' || data.type === 'Attribute') {
      onHotbarDrop(_hotbar, data, slot);
      return false;
    }
  }

  static onGetUserContextOptions(
    app: foundry.applications.api.ApplicationV2,
    context: ContextMenu.Entry[],
  ) {
    const players = app.element;
    if (!players) return;
    context.push(
      {
        name: game.i18n.localize('SWADE.BenniesGive'),
        icon: '<i class="fa-solid fa-plus"></i>',
        condition: (li) =>
          game.user!.isGM && game.users?.get(li.dataset.userId!)!.isGM!,
        callback: async (li) => {
          const selectedUser = game.users?.get(li.dataset.userId!)!;
          await selectedUser.setFlag(
            'swade',
            'bennies',
            (selectedUser.getFlag('swade', 'bennies') ?? 0) + 1,
          );
          ui.players?.render({ force: true });
          if (game.settings.get('swade', 'notifyBennies')) {
            //In case one GM gives another GM a benny a different message should be displayed
            const givenEvent = selectedUser !== game.user;
            chat.createGmBennyAddMessage(selectedUser, givenEvent);
          }
        },
      },
      {
        name: game.i18n.localize('SWADE.BenniesRefresh'),
        icon: '<i class="fa-solid fa-sync"></i>',
        condition: () => game.user!.isGM,
        callback: (li) => game.users?.get(li.dataset.userId!)?.refreshBennies(),
      },
      {
        name: game.i18n.localize('SWADE.AllBenniesRefresh'),
        icon: '<i class="fa-solid fa-sync"></i>',
        condition: () => game.user!.isGM,
        callback: () => PlayerBennyDisplay.refreshAll(),
      },
      {
        name: game.i18n.localize('SWADE.BenniesAdjustGM'),
        icon: '<i class="fa-solid fa-coins"></i>',
        condition: (li) =>
          game.user!.isGM && game.users?.get(li.dataset.userId!)!.isGM!,
        callback: async (li) => {
          const gm = game.users?.get(li.dataset.userId!);
          const hasStaticBennies = game.settings.get(
            'swade',
            'staticGmBennies',
          );
          const gmBennies = hasStaticBennies
            ? game.settings.get('swade', 'gmBennies')
            : game.users.filter((u) => u.active && !u.isGM).length;
          await foundry.applications.api.DialogV2.wait({
            window: { title: game.i18n.localize('SWADE.BenniesAdjustGM') },
            position: {
              left: ui.players.element.offsetLeft,
              top: ui.players.element.offsetTop - 183,
            },
            content: `
                <p>${game.i18n.localize('SWADE.BenniesAdjustGMText')}</p>
                <label
                  style="display: block; width: max-content;"
                  for"gm-bennies">
                  ${game.i18n.localize('SWADE.Bennies')}:
                  <input
                    id="gm-bennies"
                    type="number"
                    min="0"
                    style="width: 5ch; height: .75lh; text-align: center;"
                    name="gm-bennies"
                    value="${gmBennies}"
                    autofocus
                  >
                </label>
            `,
            buttons: [
              {
                action: 'cancel',
                label: game.i18n.localize('SWADE.Cancel'),
              },
              {
                action: 'submit',
                label: game.i18n.localize('SWADE.ButtonSubmit'),
                default: true,
                callback: async (event, button, dialog) =>
                  await gm?.setFlag(
                    'swade',
                    'bennies',
                    Number(button.form!.elements['gm-bennies'].value),
                  ),
              },
            ],
          });
        },
      },
    );
  }

  // TODO: Properly type this
  static onGetSceneControlButtons(
    sceneControlButtons: Record<string, SceneControls.Control>,
  ) {
    //get the measured template tools
    const measure = sceneControlButtons.templates;
    //add buttons
    const numTools = Object.keys(measure.tools).length;
    const newTemplateButtons = SWADE.measuredTemplatePresets.map((t, i) => ({
      ...t.button,
      order: numTools + i,
    }));
    measure.tools.clear.order = numTools + newTemplateButtons.length;
    foundry.utils.mergeObject(
      measure.tools,
      newTemplateButtons.reduce((acc, t) => ({ ...acc, [t.name]: t }), {}),
    );
  }

  static async onRenderCombatantConfig(
    app: CombatantConfig,
    html: HTMLFormElement,
    options: any,
  ) {
    // resize the element so it'll fit the new stuff
    html.style.height = 'auto';

    //remove the old initiative input
    html
      .querySelector('input[name="initiative"]')
      ?.closest('div.form-group')
      ?.remove();

    //grab cards and sort them
    const deck: SwadeCards = game.cards.get(
      game.settings.get('swade', 'actionDeck'),
      {
        strict: true,
      },
    );

    const cards = Array.from(deck.cards.values() as Card[]).sort((a, b) => {
      const cardA = a.value!;
      const cardB = b.value!;
      const card = cardA - cardB;
      if (card !== 0) return card;
      const suitA = a.system['suit'] as number;
      const suitB = b.system['suit'] as number;
      const suit = suitA - suitB;
      return suit;
    });

    //prep list of cards for selection

    const cardList = new Array<any>();
    for (const card of cards) {
      const cardValue = card.value!;
      const suitValue = card.system['suit'];
      const color =
        suitValue === 2 || suitValue === 3 ? 'color: red;' : 'color: black;';
      const isDealt =
        options.document.cardValue === cardValue &&
        options.document.suitValue === suitValue;

      const isAvailable = card?.drawn ? 'text-decoration: line-through;' : '';

      cardList.push({
        id: card.id,
        isDealt,
        color,
        isAvailable,
        name: card.name,
        cardString: card.description,
        isJoker: card.system['isJoker'],
      });
    }
    const numberOfJokers = cards.filter(
      (card) => card.system['isJoker'],
    ).length;

    //render and inject new HTML
    const path = 'systems/swade/templates/combatant-config-cardlist.hbs';
    const elementTemplate = document.createElement('template');
    elementTemplate.innerHTML = await renderTemplate(path, {
      cardList,
      numberOfJokers,
    });
    html.querySelector('footer')?.before(...elementTemplate.content.children);

    //Attach click event to button which will call the combatant update as we can't easily modify the submit function of the FormApplication
    html
      .querySelector('footer button')
      ?.addEventListener('click', async (ev: PointerEvent) => {
        const selectedCard = (ev.currentTarget as HTMLButtonElement)
          .closest('.combatant-config')
          ?.querySelector<HTMLInputElement>('input[name=action-card]:checked');
        if (!selectedCard) return;
        const cardId = selectedCard.dataset.cardId as string;
        await app.document.assignNewActionCard(cardId);
      });
  }

  static onRenderActiveEffectConfig(
    app: ActiveEffectConfig,
    html: HTMLElement,
  ) {
    const effect = app.document as ActiveEffect;
    if (effect.system instanceof BaseEffectData) {
      const systemSchema = effect.system.schema;

      const conditionalGroup =
        systemSchema.fields.conditionalEffect.toFormGroup(
          { localize: true },
          { value: effect.system.conditionalEffect, disabled: !app.isEditable },
        );

      const expirationOptions: foundry.applications.fields.FormSelectOption[] =
        [
          {
            label: 'SWADE.Expiration.BeginAuto',
            value: String(constants.STATUS_EFFECT_EXPIRATION.StartOfTurnAuto),
          },
          {
            label: 'SWADE.Expiration.BeginPrompt',
            value: String(constants.STATUS_EFFECT_EXPIRATION.StartOfTurnPrompt),
          },
          {
            label: 'SWADE.Expiration.EndAuto',
            value: String(constants.STATUS_EFFECT_EXPIRATION.EndOfTurnAuto),
          },
          {
            label: 'SWADE.Expiration.EndPrompt',
            value: String(constants.STATUS_EFFECT_EXPIRATION.EndOfTurnPrompt),
          },
        ];
      const expirationGroup = systemSchema.fields.expiration.toFormGroup(
        { localize: true },
        {
          options: expirationOptions,
          localize: true,
          value: effect.system.expiration,
          blank: 'SWADE.Expiration.None',
          disabled: !app.isEditable,
          dataset: { dtype: 'Number' }, // necessary in v12, can be removed in v13
        },
      );
      const loseTurnOnHoldGroup =
        systemSchema.fields.loseTurnOnHold.toFormGroup(
          { localize: true },
          { value: effect.system.loseTurnOnHold, disabled: !app.isEditable },
        );

      const noneActive = !html.querySelector('section.active');

      const tab = `
        <a ${noneActive ? 'class="active"' : ''}data-action="tab" data-group="sheet" data-tab="expiration">
          <i class="fa-solid fa-step-forward"></i> ${game.i18n.localize(
            'SWADE.Expiration.TabLabel',
          )}
        </a>
      `;
      const durationSection = `
        <section class="tab${noneActive ? ' active' : ''}" data-group="sheet" data-tab="expiration" data-application-part="expiration">
          ${game.i18n.localize('SWADE.Expiration.Description')}
          ${expirationGroup.outerHTML}
          ${loseTurnOnHoldGroup.outerHTML}
        </section>
      `;

      html
        .querySelector('section[data-tab="details"] .form-group.stacked')
        ?.insertAdjacentElement('afterend', conditionalGroup);
      html
        .querySelector('nav.sheet-tabs a[data-tab="duration"]')
        ?.insertAdjacentHTML('afterend', tab);
      if (!html.querySelector('section.tab[data-tab="expiration"]')) {
        html
          .querySelector('section[data-tab="duration"]')
          ?.insertAdjacentHTML('afterend', durationSection);
      }
    } else if (effect.system instanceof ModifierData) {
      const costGroup = effect.system.schema.fields.cost.toFormGroup(
        { localize: true },
        { value: effect.system.cost },
      );
      const limitGroup = effect.system.schema.fields.limit.toFormGroup(
        { localize: true },
        { value: effect.system.limit },
      );
      const descriptionGroup = html.querySelector(
        'section[data-tab="details"] .form-group.stacked',
      );
      descriptionGroup?.insertAdjacentElement('afterend', limitGroup);
      descriptionGroup?.insertAdjacentElement('afterend', costGroup);
      app.setPosition();
    }
  }

  static onHotReload({
    packageType,
    packageId,
    content,
    path,
    extension,
  }: HotReloadData) {
    //return the hook early if it's not a swade system change;
    if (packageType !== 'system' && packageId !== 'swade') return;
    //stop the hook on empty changes
    if (!content) return false;
    if (extension === 'js') location.reload();
  }

  static onCreateProseMirrorEditor(
    uuid: string,
    plugins: Record<string, Plugin>,
    _options: unknown,
  ) {
    const [prefix] = uuid.split('#');
    const doc = fromUuidSync(prefix, { strict: false });
    if (doc instanceof JournalEntryPage && doc.type === 'headquarters') {
      // Delete the default content link plugin.
      delete plugins.contentLinks;
      plugins.headquarterFiller = ProseMirrorTableResultDropFillerPlugin.build(
        ProseMirror.defaultSchema,
      );
    }
  }

  static async onTargetToken(user: User, token: Token, targeted: boolean) {
    if (!targeted) return;
    token.ring?.flashColor(user.color, {
      duration: 1000,
      easing: (pt: number) => {
        return (Math.sin(2 * Math.PI * pt - Math.PI / 2) + 1) / 2;
      },
    });
  }

  static async onDropCanvasData(canvas: Canvas, data: CanvasDropData) {
    const { uuid, x, y, type } = data;
    if (type !== 'ActiveEffect' || !canvas.tokens?.active) return;
    //grab the tokens at the drop position
    const tokensAtDropPosition = [...canvas.tokens.placeables]
      .sort((a, b) => b.document.sort - a.document.sort)
      .sort((a, b) => b.document.elevation - a.document.elevation)
      .filter((t) => t.localShape.contains(x, y));
    const targets = new Set<SwadeToken>(tokensAtDropPosition);
    if (!targets?.size) return;
    const controlled = new Set<SwadeToken>(canvas.tokens?.controlled);
    if (controlled.size && targets.isSubset(controlled)) {
      //add the controlled to the target if the set of targeted tokens is a subset of the controlled tokens
      controlled.forEach((t) => targets.add(t));
    }
    const effect = await fromUuid(uuid);
    if (!effect) return;
    const effectData = foundry.utils.mergeObject(effect.toObject(), {
      system: { favorite: true },
      origin: effect.parent.uuid,
    });
    await Promise.allSettled(
      targets.map((token) =>
        token.actor.createEmbeddedDocuments('ActiveEffect', [effectData]),
      ),
    );
  }
}
