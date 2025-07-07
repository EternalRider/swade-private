import { Updates } from '../../../globals';
import { reshuffleActionDeck } from '../../util';

import { DeepPartial } from 'fvtt-types/utils';
import { AmbushAssistant } from '../../apps/AmbushAssistant';
import { CardPickResult, CardPicker } from '../../apps/CardPicker';
import { PlayerCardDrawHerder } from '../../apps/PlayerCardDrawHerder';
import SwadeUser from '../SwadeUser';
import type SwadeActiveEffect from '../active-effect/SwadeActiveEffect';
import SwadeCards from '../card/SwadeCards';
import SwadeCombatant from './SwadeCombatant';

declare global {
  interface DocumentClassConfig {
    Combat: typeof SwadeCombat<Combat.SubType>;
  }
}

export default class SwadeCombat<
  out SubType extends Combat.SubType = Combat.SubType,
> extends Combat<SubType> {
  /** an internal helper flag that's being checked to see if we're currently asking to advance the round */
  #roundAdvanceDialog: boolean = false;

  /** Compares two combatants by name. */
  static nameSortCombatants(a: SwadeCombatant, b: SwadeCombatant): number {
    if (a.name === b.name) return SwadeCombat.#idSortCombatants(a, b);
    return a.name! > b.name! ? 1 : -1;
  }

  /** Compares two combatants by ID. */
  static #idSortCombatants(a: SwadeCombatant, b: SwadeCombatant): number {
    return a.id! > b.id! ? 1 : -1;
  }

  static INITIATIVE_SOUND = 'systems/swade/assets/card-flip.wav';

  /**
   * @privateRemarks Adapted from v13 implementation
   */
  static override async createDialog(
    data = {},
    createOptions = {},
    dialogOptions: DeepPartial<foundry.applications.api.DialogV2.WaitOptions> = {},
  ): Promise<SwadeCombat | null | undefined> {
    const typeOptions = Object.entries(CONFIG.Combat.typeLabels).map(
      ([value, label]) => ({ value, label }),
    );
    const typeSelect = foundry.applications.fields.createSelectInput({
      options: typeOptions,
      value: 'base',
      localize: true,
      name: 'type',
    });
    const typeGroup = foundry.applications.fields.createFormGroup({
      label: game.i18n.localize('Type'),
      input: typeSelect,
    });

    let html = typeGroup.outerHTML;

    if (game.scenes.current) {
      const linkInput = document.createElement('input');
      linkInput.type = 'checkbox';
      linkInput.name = 'scene';
      linkInput.setAttribute('checked', '');
      linkInput.setAttribute('value', game.scenes.current.id);
      const linkGroup = foundry.applications.fields.createFormGroup({
        label: game.i18n.localize('SWADE.Combat.LinkScene'),
        input: linkInput,
      });
      html += linkGroup.outerHTML;
    }

    //inputs for dramatic task relevant data
    html += CONFIG.Combat.dataModels.dramaticTask.schema
      .getField('maxRounds')
      ?.toFormGroup({ classes: ['slim', 'hidden'], localize: true })?.outerHTML;

    html += CONFIG.Combat.dataModels.dramaticTask.schema
      .getField('tokens.max')
      ?.toFormGroup({
        label: 'SWADE.DramaticTask.MaxTokens.Label',
        hint: 'SWADE.DramaticTask.MaxTokens.Hint',
        classes: ['slim', 'hidden'],
        localize: true,
      })?.outerHTML;

    // Collect data
    const label = game.i18n.localize(this.metadata.label);
    const title = game.i18n.format('DOCUMENT.Create', { type: label });

    // Render the confirmation dialog window
    return foundry.applications.api.DialogV2.prompt<{}, SwadeCombat>(
      foundry.utils.mergeObject(
        {
          content: html,
          window: { title },
          position: { width: 360 },
          ok: {
            label: title,
            callback: (_event: PointerEvent, button: HTMLButtonElement) => {
              const fd = new FormDataExtended(button.form as HTMLFormElement);
              foundry.utils.mergeObject(data, fd.object);
              return this.create(data, {
                renderSheet: false,
                ...createOptions,
              });
            },
          },
          rejectClose: false,
          render: (
            _event: Event,
            dialog: foundry.applications.api.DialogV2,
          ) => {
            const html = dialog.element;
            const typeSelect = html.querySelector<HTMLSelectElement>(
              'select[name="type"]',
            );
            const roundsInput = html
              .querySelector<HTMLDivElement>('input[name="system.maxRounds"]')
              ?.closest('.form-group');
            const tokenInput = html
              .querySelector<HTMLDivElement>('input[name="system.tokens.max"]')
              ?.closest('.form-group');

            typeSelect?.addEventListener('change', () => {
              if (typeSelect.value === 'dramaticTask') {
                roundsInput?.classList.remove('hidden');
                tokenInput?.classList.remove('hidden');
              } else {
                roundsInput?.classList.add('hidden');
                tokenInput?.classList.add('hidden');
              }
            });
          },
        },
        dialogOptions,
      ),
    );
  }

  get actionDeck(): SwadeCards {
    return game.cards!.get(game.settings.get('swade', 'actionDeck'), {
      strict: true,
    });
  }

  get automaticInitiative(): boolean {
    return game.settings.get('swade', 'autoInit');
  }

  #initSoundData: foundry.audio.AudioHelper.PlayData = {
    src: SwadeCombat.INITIATIVE_SOUND,
    volume: 0.8,
    autoplay: true,
    loop: false,
  };

  #debouncedCombatSound: SwadeCombat['_playCombatSound'] =
    foundry.utils.debounce(super._playCombatSound, 200);

  override async rollInitiative(
    ids: string | string[],
    { messageOptions, updateTurn }: Combat.InitiativeOptions = {},
  ) {
    // Structure input data
    ids = Array.isArray(ids) ? ids : [ids];

    const currentId = this.combatant?.id;
    const messages: ChatMessage.CreateData[] = [];
    const combatantUpdates: Combatant.UpdateData[] = [];
    const groupUpdates: Updates[] = [];

    //Check if enough cards are available
    if (ids.length > this.actionDeck.availableCards.length) {
      const message = game.i18n.format('SWADE.NoCardsLeft', {
        needed: ids.length,
        current: this.actionDeck.availableCards.length,
      });
      ui.notifications.warn(message);
      return this;
    }
    // Iterate over Combatants, performing an initiative draw for each
    for (const id of ids) {
      // Get Combatant data
      const c = this.combatants.get(id, { strict: true }) as SwadeCombatant;
      if (!c.isOwner) continue;
      const roundHeld = !!c.roundHeld;
      //Do not draw cards for defeated, holding or non-leader grouped combatants
      if (
        c.isDefeated ||
        roundHeld ||
        (c.group && !c.isGroupLeader) ||
        c.turnLost
      )
        continue;

      // Set up edges
      let hasHesitant = false;
      let hasQuick = false;
      const actorModel = c.actor?.system;
      if (actorModel && 'initiative' in actorModel) {
        hasHesitant = actorModel.initiative.hasHesitant ?? false;
        hasQuick = actorModel.initiative.hasQuick ?? false;
      }
      const isIncapacitated = c.isIncapacitated;

      // Figure out how many cards to draw
      const cardsToDraw = c.cardsToDraw;

      // Draw initiative
      let pickedCard: Card;
      let cardsToPickFrom = await this.drawCard(cardsToDraw);
      const isRedraw = typeof c.initiative === 'number' && !roundHeld;

      if (isRedraw) {
        // handle redraws
        const oldCard = this.findCard(c?.cardValue!, c?.suitValue!);
        if (oldCard) {
          cardsToPickFrom.push(oldCard);
          const result = await this.pickACard({
            cards: cardsToPickFrom,
            combatantName: c.name!,
            oldCardId: oldCard?.id!,
          });
          pickedCard = result.picked;
          cardsToPickFrom = result.cards;
        } else {
          pickedCard = cardsToPickFrom[0];
        }
      } else if (isIncapacitated) {
        pickedCard = cardsToPickFrom[0];
      } else if (hasHesitant) {
        // Hesitant
        const joker = cardsToPickFrom.find((c) => c.system['isJoker']);
        if (joker) {
          // if one of the cards drawn was a joker, simply use that
          pickedCard = joker;
        } else {
          //sort cards to pick the lower one
          cardsToPickFrom.sort((a, b) => {
            const cardA = a.value!;
            const cardB = b.value!;
            const card = cardA - cardB;
            if (card !== 0) return card;
            const suitA = a.system['suit'] as number;
            const suitB = b.system['suit'] as number;
            const suit = suitA - suitB;
            return suit;
          });
          pickedCard = cardsToPickFrom[0];
        }
      } else if (cardsToDraw > 1) {
        //Level Headed
        const result = await this.pickACard({
          cards: cardsToPickFrom,
          combatantName: c.name!,
          enableRedraw: hasQuick,
          isQuickDraw: hasQuick,
        });
        pickedCard = result.picked;
        cardsToPickFrom = result.cards;
      } else if (hasQuick) {
        pickedCard = cardsToPickFrom[0];
        const cardValue = pickedCard.value!;
        //if the card value is less than 5 then pick a card otherwise use the card
        if (cardValue <= 5) {
          const result = await this.pickACard({
            cards: [pickedCard],
            combatantName: c.name!,
            enableRedraw: true,
            isQuickDraw: true,
          });
          pickedCard = result.picked;
          cardsToPickFrom = result.cards;
        }
      } else {
        //normal card draw
        pickedCard = cardsToPickFrom[0];
      }
      const systemData = {
        cardValue: pickedCard.value!,
        suitValue: pickedCard.system['suit'],
        hasJoker: pickedCard.system['isJoker'],
        cardString: pickedCard.description,
      };

      const initiative =
        (pickedCard.value as number) +
        (pickedCard?.system['suit'] as number) / 10;

      const update = {
        _id: id,
        initiative,
        system: systemData,
      };

      //Handle group leader changes
      combatantUpdates.push(update);
      if (c.isGroupLeader) {
        groupUpdates.push({
          _id: c.group.id,
          initiative: update.initiative,
        });
      }

      // Construct chat message data
      const messageData = foundry.utils.mergeObject(
        {
          speaker: ChatMessage.getSpeaker({
            actor: c.actor,
            token: c.token,
            alias: c.name,
          }),
          whisper:
            c.token?.hidden || c.hidden
              ? game?.users?.filter((u) => u.isGM)
              : [],
          content: '', //keep the content empty so we don't trigger validation warnings
          'flags.swade': {
            isRedraw,
            pickedCard: pickedCard.id,
            cards: cardsToPickFrom.map((c) => c.toObject()),
          },
        },
        messageOptions,
      );
      messages.push(messageData);
    }

    if (!combatantUpdates.length) return this;

    // Update the combat instance with the new combatants
    await this.updateEmbeddedDocuments('Combatant', combatantUpdates);
    await this.updateEmbeddedDocuments('CombatantGroup', groupUpdates);

    // Create multiple chat messages
    this._playInitiativeSound();
    await getDocumentClass('ChatMessage').createDocuments(messages);

    const activeCombatants = this.combatants.filter((c) => !c.isDefeated);
    if (activeCombatants.every((c) => !!c.initiative)) {
      await this.update({ turn: 0 });
      this._handleStartOfTurnExpirations();
    } else if (updateTurn && currentId) {
      // Ensure the turn order remains with the same combatant
      await this.update({
        turn: this.turns.findIndex((t) => t.id === currentId),
      });
    }

    // Return the updated Combat
    return this;
  }

  override _sortCombatants(a: SwadeCombatant, b: SwadeCombatant): number {
    const currentRound = game.combat?.round ?? 0;

    if (
      (a.roundHeld && currentRound !== a.roundHeld) ||
      (b.roundHeld && currentRound !== b.roundHeld)
    ) {
      const isOnHoldA = a.roundHeld && (a.roundHeld ?? 0 < currentRound);
      const isOnHoldB = b.roundHeld && (b.roundHeld ?? 0 < currentRound);
      if (isOnHoldA && !isOnHoldB) return -1;
      if (!isOnHoldA && isOnHoldB) return 1;
    }
    if (b.initiative === a.initiative) {
      return SwadeCombat.nameSortCombatants(a, b);
    } else {
      return super._sortCombatants(a, b);
    }
  }

  protected override _onCreateDescendantDocuments<
    DescendantDocumentType extends Combat.DescendantClass,
    Parent extends Combat.Stored,
    CreateData extends
      foundry.abstract.Document.CreateDataFor<DescendantDocumentType>,
    Operation extends foundry.abstract.types.DatabaseCreateOperation<
      CreateData,
      Parent,
      false
    >,
  >(
    parent: Parent,
    collection: DescendantDocumentType['metadata']['collection'],
    documents: InstanceType<DescendantDocumentType>,
    data: CreateData[],
    options: foundry.abstract.Document.Database.CreateOptions<Operation>,
    userId: string,
  ) {
    super._onCreateDescendantDocuments(
      parent,
      collection,
      documents,
      data,
      options,
      userId,
    );
    if (collection === 'groups')
      this.#onModifyCombatantGroups(parent, documents, options);
  }

  protected override _onUpdateDescendantDocuments<
    DescendantDocumentType extends Combat.DescendantClass,
    Parent extends Combat.Stored,
    UpdateData extends
      foundry.abstract.Document.UpdateDataFor<DescendantDocumentType>,
    Operation extends foundry.abstract.types.DatabaseUpdateOperation<
      UpdateData,
      Parent
    >,
  >(
    parent: Parent,
    collection: DescendantDocumentType['metadata']['collection'],
    documents: InstanceType<DescendantDocumentType>,
    changes: UpdateData[],
    options: foundry.abstract.Document.Database.UpdateOptions<Operation>,
    userId: string,
  ) {
    super._onUpdateDescendantDocuments(
      parent,
      collection,
      documents,
      changes,
      options,
      userId,
    );
    if (collection === 'groups')
      this.#onModifyCombatantGroups(parent, documents, options);
  }

  protected override _onDeleteDescendantDocuments<
    DescendantDocumentType extends Combat.DescendantClass,
    Parent extends Combat.Stored,
    Operation extends foundry.abstract.types.DatabaseDeleteOperation<Parent>,
  >(
    parent: Parent,
    collection: DescendantDocumentType['metadata']['collection'],
    documents: InstanceType<DescendantDocumentType>,
    ids: string[],
    options: foundry.abstract.Document.Database.DeleteOptions<Operation>,
    userId: string,
  ) {
    super._onDeleteDescendantDocuments(
      parent,
      collection,
      documents,
      ids,
      options,
      userId,
    );
    if (collection === 'groups')
      this.#onModifyCombatantGroups(parent, documents, options);
  }

  #onModifyCombatantGroups(parent: Combat.Stored, _documents, options) {
    this.setupTurns();
    if (ui.combat.viewed === parent && options.render !== false)
      ui.combat.render();
  }

  /**
   * Draws cards from the Action Cards deck
   * @param count number of cards to draw
   * @returns an array with the drawn cards
   */
  async drawCard(count = 1): Promise<Card[]> {
    const pileId = game.settings.get('swade', 'actionDeckDiscardPile');
    const discardPile = game.cards!.get(pileId, { strict: true });
    return this.actionDeck.dealForInitiative(discardPile, count);
  }

  /** Ask the user to pick a card for a given combatant name */
  async pickACard(ctx: CardPickContext): Promise<CardPickResult> {
    return CardPicker.asPromise({ ctx: { ...ctx, deck: this.actionDeck } });
  }

  /**
   * Find a card from the deck based on it's suit and value
   * @param cardValue
   * @param cardSuit
   */
  findCard(cardValue: number, cardSuit: number): Card | undefined {
    return this.actionDeck.cards.find(
      (c) =>
        c.type === 'poker' &&
        c.value === cardValue &&
        c.system['suit'] === cardSuit,
    );
  }

  override async resetAll() {
    for (const combatant of this.combatants) {
      const update = this._getInitResetUpdate(combatant as SwadeCombatant);
      if (update) combatant.updateSource(update);
    }
    for (const group of this.groups) {
      group.updateSource({
        initiative: group.system.leaderCombatant._source.initiative,
      });
    }
    await this.update(
      {
        turn: 0,
        combatants: this.combatants.toObject(),
        groups: this.groups.toObject(),
      },
      { diff: false },
    );
    return this;
  }

  override async startCombat() {
    //Init autoroll
    if (this.automaticInitiative) {
      // if automatic init is on we draw cards
      await this._promptAllPlayersForInitiative();
      //grab the NPCs, we're drawing them locally
      await this.rollNPC();
    }
    return super.startCombat();
  }

  startSurpriseCombat() {
    new AmbushAssistant(this).render(true);
  }

  toggleGroupExpand(groupId) {
    const group = this.groups.get(groupId);
    group._expanded = !group._expanded;
    return ui.combat.render({ parts: ['tracker'] });
  }

  override async nextTurn() {
    await this._handleEndOfTurnExpirations();
    const turn = this.turn ?? -1;

    // Determine the next turn number
    let next: number | null = null;
    if (this.settings.skipDefeated) {
      for (const [i, t] of this.turns.entries()) {
        if (i <= turn) continue;
        // Skip defeated, lost turns
        if (t.isDefeated || t.turnLost) continue;
        next = i;
        break;
      }
    } else {
      next = turn + 1;
    }

    // Maybe advance to the next round
    const round = this.round;
    if (this.round === 0 || next === null || next >= this.turns.length) {
      return this.nextRound();
    }

    // Update the document, passing data through a hook first
    const updateData = { round, turn: next };
    const updateOptions = { advanceTime: CONFIG.time.turnTime, direction: 1 };
    Hooks.callAll('combatTurn', this, updateData, updateOptions);
    await this.update(updateData, updateOptions);
    await this._handleStartOfTurnExpirations();
    if (this.combatant?.group && !this.combatant.group._expanded) {
      await this.toggleGroupExpand(this.combatant.group.id);
    }
    return this;
  }

  override async nextRound() {
    if (game.user.isGM) await this._nextRoundAsGM();
    else await this._nextRoundAsUser();
    if (this.combatant?.group && !this.combatant.group._expanded) {
      await this.toggleGroupExpand(this.combatant.group.id);
    }
    return this;
  }

  override async previousRound() {
    const revert = await Dialog.confirm({
      title: game.i18n.localize('SWADE.Combat.RevertRoundTitle'),
      content:
        '<p>' + game.i18n.localize('SWADE.Combat.RevertRoundContent') + '</p>',
      defaultYes: true,
      rejectClose: false,
      options: { classes: [...Dialog.defaultOptions.classes, 'swade-app'] },
    });
    if (!revert) return this;
    return super.previousRound();
  }

  /**
   * Called by CombatTracker#_onCombatControl
   */
  async resetDeck() {
    await reshuffleActionDeck();
    ui.notifications.info('SWADE.ActionDeckResetNotification', {
      localize: true,
    });
  }

  protected _getInitResetUpdate(
    combatant: SwadeCombatant,
  ): Record<string, unknown> | undefined {
    const roundHeld = combatant.roundHeld;
    const turnLost = combatant.turnLost;
    if (roundHeld) {
      if (turnLost) {
        return {
          initiative: null,
          system: {
            hasJoker: false,
            '-=turnLost': null,
          },
        };
      } else {
        //keep the card
        return;
      }
    } else if (!roundHeld || turnLost) {
      return {
        initiative: null,
        system: {
          suitValue: null,
          cardValue: null,
          hasJoker: false,
          cardString: '',
          turnLost: false,
        },
      };
    }
    return {
      initiative: null,
      system: {
        suitValue: null,
        cardValue: null,
        hasJoker: false,
        cardString: '',
        turnLost: false,
      },
    };
  }

  protected async _handleStartOfTurnExpirations() {
    if (!this.combatant || this.combatant.isDefeated) return;
    const expirations =
      this.combatant?.actor?.effects.filter(
        (effect: SwadeActiveEffect) =>
          effect.isTemporary && effect.isExpired('start'),
      ) ?? [];
    for (const effect of expirations) {
      await effect.expire();
    }
  }

  protected async _handleEndOfTurnExpirations() {
    if (!this.combatant || this.combatant.isDefeated) return;
    const expirations =
      this.combatant?.actor?.effects.filter(
        (effect) => effect.isTemporary && effect.isExpired('end'),
      ) ?? [];
    for (const effect of expirations) {
      await effect.expire();
    }
  }

  protected async _playInitiativeSound() {
    if (!game.settings.get('swade', 'initiativeSound')) return;
    foundry.audio.AudioHelper.play(this.#initSoundData, true);
  }

  protected override _playCombatSound(type: string): void {
    if (this.turn === this.turns.length - 1 && type === 'nextUp') return; //skip if it's the last turn in the round
    this.#debouncedCombatSound(type);
  }

  protected async _nextRoundAsGM() {
    if (this.#roundAdvanceDialog) return;
    this.#roundAdvanceDialog = true; //set the flag
    //run the dialog
    const advance = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('SWADE.Combat.AdvanceRoundTitle') },
      content:
        '<p>' + game.i18n.localize('SWADE.Combat.AdvanceRoundContent') + '</p>',
      rejectClose: false,
      classes: ['swade-app'],
    });
    this.#roundAdvanceDialog = false; //unset the flag
    if (!advance) return;
    //reset the deck if a joker had been drawn
    if (this.combatants.some((c: SwadeCombatant) => c.hasJoker)) {
      await reshuffleActionDeck();
      ui.notifications.info('SWADE.DeckShuffled', { localize: true });
    }

    //reset the combatants
    await this.resetAll();

    //advance the round to the next one
    await super.nextRound();

    //no auto init, we're done;
    if (!this.automaticInitiative) return;

    // if automatic init is on we draw cards
    await this._promptAllPlayersForInitiative();
    //grab the NPCs, we're drawing them locally
    await this.rollNPC();
  }

  /** As a user emit a socket event that asks a Game master to trigger the next round workflow and roll the owned tokens */
  protected _nextRoundAsUser() {
    game.swade.sockets.newRound(this.id!);
  }

  protected async _promptAllPlayersForInitiative() {
    const [localDraws, remoteDraws] = this.combatants
      .filter(
        (c: SwadeCombatant) =>
          c.hasPlayerOwner &&
          !c.isNPC &&
          c.initiative === null &&
          (!c.group || c.isGroupLeader),
      )
      .map((c: SwadeCombatant) => {
        return { combatant: c, user: c.players[0]! };
      })
      .sort((a, b) => a.user.name.localeCompare(b.user.name))
      .partition((v) => this._determineIfRemoteDraw(v.user, v.combatant));

    for (const { combatant } of localDraws) {
      await this.rollInitiative(combatant.id as string);
    }
    if (remoteDraws.length > 0) {
      await PlayerCardDrawHerder.asPromise({
        draws: remoteDraws,
        combatId: this.id as string,
      });
    }
  }

  protected _determineIfRemoteDraw(
    user: SwadeUser,
    combatant: SwadeCombatant,
  ): boolean {
    if (!combatant.actor || !('initiative' in combatant.actor.system))
      return false;
    const initiative = combatant.actor.system.initiative;
    const edges =
      initiative.hasLevelHeaded ||
      initiative.hasImpLevelHeaded ||
      initiative.hasQuick;
    const groupOwner = !combatant.group || combatant.group.isOwner;
    return user.active && edges && groupOwner;
  }

  override async _preDelete(
    options: Combat.Database.PreDeleteOptions,
    user: User.Implementation,
  ) {
    await super._preDelete(options, user);
    const jokerDrawn = this.combatants.some((c: SwadeCombatant) => c.hasJoker);

    //reset the deck when combat is ended
    if (jokerDrawn) {
      await reshuffleActionDeck();
      ui.notifications.info('SWADE.DeckShuffled', { localize: true });
    }

    //remove the holding status from any combatants that have it
    await Promise.allSettled(
      this.combatants
        .filter((c) => c.actor?.statuses.has('holding') ?? false)
        .flatMap((c) =>
          c.actor?.effects.filter((e) => e.statuses.has('holding')),
        )
        .map((e) => e.delete()),
    );
  }
}

interface CardPickContext {
  /** an array of cards */
  cards: Card[];
  /** name of the combatant */
  combatantName: string;
  /** id of the old card, if you're picking cards for a redraw */
  oldCardId?: string;
  /** determines whether a redraw is allowed */
  enableRedraw?: boolean;
  /** determines whether this draw includes the Quick edge */
  isQuickDraw?: boolean;
}
