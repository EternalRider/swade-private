import { Updates } from '../../../globals';
import { reshuffleActionDeck, reshuffleActionDeckIfJokerDrawn } from '../../util';

import { DeepPartial } from 'fvtt-types/utils';
import { AmbushAssistant } from '../../apps/AmbushAssistant';
import { CardPickContext, CardPickResult, CardPicker } from '../../apps/CardPicker';
import { PlayerCardDrawHerder } from '../../apps/PlayerCardDrawHerder';
import { constants } from '../../constants';
import { stringNonbreakingSpaces } from '../../util';
import SwadeUser from '../SwadeUser';
import type SwadeActiveEffect from '../active-effect/SwadeActiveEffect';
import SwadeActor from '../actor/SwadeActor';
import SwadeCards from '../card/SwadeCards';
import SwadeCombatant from './SwadeCombatant';

declare global {
  interface DocumentClassConfig {
    Combat: typeof SwadeCombat<Combat.SubType>;
  }
}

export default class SwadeCombat<out SubType extends Combat.SubType = Combat.SubType> extends Combat<SubType> {
  /** an internal helper flag that's being checked to see if we're currently asking to advance the round */
  #roundAdvanceDialog = false;

  /** Sorts two objects with name and id fields alphabetically by name, using the ID as tie breaker.*/
  static sortByNameAndID(a, b): number {
    if (a.name === b.name) return a.id! > b.id! ? 1 : -1;
    return a.name! > b.name! ? 1 : -1;
  }

  static INITIATIVE_SOUND = 'systems/swade/assets/card-flip.wav';

  /**
   * @privateRemarks Adapted from v13 implementation
   */
  static override async createDialog(
    data = {},
    createOptions = {},
    dialogOptions: DeepPartial<foundry.applications.api.DialogV2.WaitOptions> = {}
  ): Promise<SwadeCombat | null | undefined> {
    const typeOptions = Object.entries(CONFIG.Combat.typeLabels).map(([value, label]) => ({ value, label }));
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

    html += CONFIG.Combat.dataModels.dramaticTask.schema.getField('tokens.max')?.toFormGroup({
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
              const fd = new foundry.applications.ux.FormDataExtended(button.form as HTMLFormElement);
              foundry.utils.mergeObject(data, fd.object);
              return this.create(data, {
                renderSheet: false,
                ...createOptions,
              });
            },
          },
          rejectClose: false,
          render: (_event: Event, dialog: foundry.applications.api.DialogV2) => {
            const html = dialog.element;
            const typeSelect = html.querySelector<HTMLSelectElement>('select[name="type"]');
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
        dialogOptions
      )
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
    loop: false,
  };

  #debouncedCombatSound: SwadeCombat['_playCombatSound'] = foundry.utils.debounce(super._playCombatSound, 200);

  async rerollInitiative(id: string) {
    if (!id?.length) return;
    const c = this.combatants.get(id, { strict: true }) as SwadeCombatant;
    if (!c || !c.isOwner) return;
    const actor = c.actor;

    const buttons: foundry.applications.api.DialogV2.Button[] = [
      {
        action: 'gmBenny',
        label: stringNonbreakingSpaces(game.i18n.localize('SWADE.Rolls.GMBenny')),
        icon: '<i class="fas fa-coins"></i>',
      },
      {
        action: 'benny',
        label: stringNonbreakingSpaces(game.i18n.localize('SWADE.Rolls.Benny')),
        icon: '<i class="fas fa-coins"></i>',
      },
      {
        action: 'free',
        label: stringNonbreakingSpaces(game.i18n.localize('SWADE.Rolls.Free')),
      },
    ];

    if (!game.user?.isGM) buttons.shift();

    const gmHasNoBennies = game.user?.isGM && game.user?.bennies <= 0;
    const characterHasNoBennies = actor && actor instanceof SwadeActor && actor.bennies <= 0;
    let content = game.i18n.localize('SWADE.Combat.RedrawDialog.Content');
    if (characterHasNoBennies && !game.user?.isGM) {
      content = game.i18n.localize('SWADE.Combat.RedrawDialog.ContentNoBenny');
    }
    const data: foundry.applications.api.DialogV2.Configuration = {
      window: {
        title: game.i18n.format('SWADE.Combat.RedrawFor', {
          name: c.actor?.name,
        }),
      },
      content: `<p>${content}</p>`,
      buttons,
      default: 'benny',
      render: (_ev, dialog: foundry.applications.api.DialogV2) => {
        const html = dialog.element;
        const button = html.querySelector('button[data-action="benny"]');
        const gmButton = html.querySelector('button[data-action="gmBenny"]');
        if (characterHasNoBennies && button) button.disabled = true;
        if (gmHasNoBennies && gmButton) gmButton.disabled = true;
      },
      classes: ['dialog', 'swade-app'],
    };

    const choice = await foundry.applications.api.DialogV2.wait(data);
    if (
      choice === 'free' ||
      (choice === 'gmBenny' && (await game.user?.spendBenny())) ||
      (choice === 'benny' && (await actor?.spendBenny()))
    ) {
      await this.rollInitiative(id);
    }
  }

  override async rollInitiative(
    ids: string | string[],
    { messageOptions, updateTurn, autoPick }: Combat.InitiativeOptions & { autoPick?: boolean } = {}
  ) {
    // Structure input data
    ids = Array.isArray(ids) ? ids : [ids];

    const currentId = this.combatant?.id;
    const messages: ChatMessage.CreateData[] = [];
    const combatantUpdates: Combatant.UpdateData[] = [];
    const groupUpdates: Updates[] = [];

    // Check if enough cards are available, groups only need 1 for the leader.
    const cardsNeeded = ids.filter((id) => {
      const c = this.combatants.get(id, { strict: true }) as SwadeCombatant;
      return !c.group || c.isGroupLeader;
    }).length;
    if (cardsNeeded > this.actionDeck.availableCards.length) {
      const message = game.i18n.format('SWADE.NoCardsLeft', {
        needed: cardsNeeded,
        current: this.actionDeck.availableCards.length,
      });
      ui.notifications.error(message);
      throw new Error(message);
    }

    // Iterate over Combatants, performing an initiative draw for each
    for (const id of ids) {
      // Get Combatant data
      const c = this.combatants.get(id, { strict: true }) as SwadeCombatant;
      if (!c.isOwner) continue;
      const roundHeld = !!c.roundHeld;
      //Do not draw cards for defeated, holding or non-leader grouped combatants
      if (c.isDefeated || roundHeld || (c.group && !c.isGroupLeader) || c.turnLost) continue;

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
        const oldCard = this.findCard(c.cardValue as number, c.suitValue as number);
        if (oldCard) {
          cardsToPickFrom.push(oldCard);
          const result = await this.pickACard({
            cards: cardsToPickFrom,
            combatantName: c.name as string,
            oldCardId: oldCard?.id,
            combatantId: c.id,
            autoPick,
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
          combatantId: c.id,
          autoPick,
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
            combatantId: c.id,
            autoPick,
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

      const initiative = (pickedCard.value as number) + (pickedCard?.system['suit'] as number) / 10;

      const update = {
        _id: id,
        initiative,
        system: systemData,
      };

      //Handle group leader changes
      combatantUpdates.push(update);
      if (game.user.isGM && c.isGroupLeader) {
        groupUpdates.push({
          _id: c.group.id,
          initiative: update.initiative,
        });
      }

      if (game.settings.get('swade', 'initMessage') !== constants.INIT_MESSAGE_TYPE.OFF || isRedraw) {
        // Construct chat message data
        const messageData = foundry.utils.mergeObject(
          {
            speaker: ChatMessage.getSpeaker({
              actor: c.actor,
              token: c.token,
              alias: c.name,
            }),
            whisper: c.token?.hidden || c.hidden ? game?.users?.filter((u) => u.isGM) : [],
            content: '', // Keep the content empty so we don't trigger validation warnings
            'flags.swade': {
              isRedraw,
              pickedCard: pickedCard.id,
              cards: cardsToPickFrom.map((c) => c.toObject()),
            },
          },
          messageOptions
        );
        messages.push(messageData);
      }
    }

    if (!combatantUpdates.length) return this;

    // Update the combat instance with the new combatants
    await this.updateEmbeddedDocuments('Combatant', combatantUpdates, {turnEvents: false});
    await this.updateEmbeddedDocuments('CombatantGroup', groupUpdates, {turnEvents: false});

    // Create multiple chat messages
    this._playInitiativeSound();
    await getDocumentClass('ChatMessage').createDocuments(messages);

    if (updateTurn && currentId) {
      // Ensure the turn order remains with the same combatant
      await this.update({
        turn: this.turns.findIndex((t) => t.id === currentId),
      });
    }

    if (this.turn === 0) {
      ui.combat.scrollToTurn();
    }

    // Return the updated Combat
    return this;
  }

  protected static _hasSameOwner(a: SwadeCombatant, b: SwadeCombatant) {
    if (a?.players && b?.players) {
      for (const playerA of a.players) {
        for (const playerB of b.players) {
          if (playerA.id === playerB.id) return true;
        }
      }
    }
    return false;
  }

  protected static _hasCommandEdge(a: SwadeCombatant) {
    return a?.actor?.getItemsBySwid('command', 'edge')?.length ? true : false;
  }

  override _sortCombatants(a: SwadeCombatant, b: SwadeCombatant): number {
    const currentRound = game.combat?.round ?? 0;

    // Combatant initiative, using the leader's initiative if in a group.
    let iniA = Number.isNumeric(a.initiative) ? a.initiative : -Infinity;
    if (a.group)
      iniA = Number.isNumeric(a.group.system?.leaderCombatant?.initiative)
        ? a.group.system?.leaderCombatant?.initiative
        : -Infinity;
    let iniB = Number.isNumeric(b.initiative) ? b.initiative : -Infinity;
    if (b.group)
      iniB = Number.isNumeric(b.group.system?.leaderCombatant?.initiative)
        ? b.group.system?.leaderCombatant?.initiative
        : -Infinity;

    // Sort inside a group, where the order isn't based on initiative.
    if (a.group && b.group && a.group.id == b.group.id) {
      const leader = a.group.system?.leaderCombatant;

      // Leaders always come first.
      if (a.isGroupLeader && !b.isGroupLeader) return -1;
      if (b.isGroupLeader && !a.isGroupLeader) return 1;

      if (a.hasPlayerOwner && b.hasPlayerOwner) {
        // If both are owned by the same player, we need other tie breakers further down.
        if (!SwadeCombat._hasSameOwner(a, b)) {
          // If owned by different players...
          if (leader) {
            // ...if one of the players also owns the leader, their combatants go first.
            if (SwadeCombat._hasSameOwner(a, leader)) return -1;
            if (SwadeCombat._hasSameOwner(b, leader)) return 1;
          }
          // Otherwise, sort by player name and ID.
          return SwadeCombat.sortByNameAndID(a.players?.[0], b.players?.[0]);
        }
      } else {
        // Player owned combatants before GM-owned.
        if (a.hasPlayerOwner && !b.hasPlayerOwner) return -1;
        if (!a.hasPlayerOwner && b.hasPlayerOwner) return 1;
      }

      // Wildcards before extras.
      if (a.actor?.isWildcard && !b.actor?.isWildcard) return -1;
      if (!a.actor?.isWildcard && b.actor?.isWildcard) return 1;

      // Combatants with Command edge before those without.
      if (SwadeCombat._hasCommandEdge(a) && !SwadeCombat._hasCommandEdge(b)) return -1;
      if (!SwadeCombat._hasCommandEdge(a) && SwadeCombat._hasCommandEdge(b)) return 1;
    } // End of sort inside group.

    // Combatants on hold come before those not on hold.
    if ((a.roundHeld && currentRound !== a.roundHeld) || (b.roundHeld && currentRound !== b.roundHeld)) {
      const isOnHoldA = a.roundHeld && (a.roundHeld ?? 0 < currentRound);
      const isOnHoldB = b.roundHeld && (b.roundHeld ?? 0 < currentRound);
      if (isOnHoldA && !isOnHoldB) return -1;
      if (!isOnHoldA && isOnHoldB) return 1;
    }

    // For identical initiative, tie break by name and ID.
    if (iniA === iniB) {
      return SwadeCombat.sortByNameAndID(a, b);
    }

    // Sort by initiative value.
    return iniB - iniA;
  }

  protected async onCreateCombatantFollow(documents, userId) {
    if (game.userId !== userId) return;

    // If CTRL is pressed, add all combatants as one group.
    if (game.keyboard?.isModifierActive(KeyboardManager.MODIFIER_KEYS.CONTROL)) {
      const group = await this.createGroup();
      if (!group) return;
      for (const d of documents) {
        if (!(d instanceof SwadeCombatant)) continue;
        await d.setGroup(group.id);
      }
      return;
    }

    // CTRL is not pressed, see if any of the added combatants have 'Follow' set and follow respective combatants.
    for (const d of documents) {
      if (!(d instanceof SwadeCombatant)) continue;
      const follow = d?.actor?.system?.initiative?.follow;
      if (follow?.length) {
        await d.follow(follow);
      }
    }
  }

  protected override _onCreateDescendantDocuments<
    DescendantDocumentType extends Combat.DescendantClass,
    Parent extends Combat.Stored,
    CreateData extends foundry.abstract.Document.CreateDataFor<DescendantDocumentType>,
    Operation extends foundry.abstract.types.DatabaseCreateOperation<CreateData, Parent, false>,
  >(
    parent: Parent,
    collection: DescendantDocumentType['metadata']['collection'],
    documents: InstanceType<DescendantDocumentType>,
    data: CreateData[],
    options: foundry.abstract.Document.Database.CreateOptions<Operation>,
    userId: string
  ) {
    super._onCreateDescendantDocuments(parent, collection, documents, data, options, userId);
    if (collection === 'combatants') {
      this.onCreateCombatantFollow(documents, userId);
    } else if (collection === 'groups') {
      this.#onModifyCombatantGroups(parent, documents, options);
    }
  }

  protected override async _manageTurnEvents() {
    const isFromLastRound = this.previous && (this.previous.turn === (this.turns.length - 1)) && (this.turn === 0) && (this.previous.round === this.round - 1);
    if (isFromLastRound) {
      const trueLast = this.combatants.reduce((c, acc) => c.system.lastInitiative < acc.system.lastInitiative ? c : acc, {system: {initiative: Infinity}});
      if (trueLast) this.previous.combatantId = trueLast.id;
    }
    await super._manageTurnEvents();
  }

  protected override _onUpdateDescendantDocuments<
    DescendantDocumentType extends Combat.DescendantClass,
    Parent extends Combat.Stored,
    UpdateData extends foundry.abstract.Document.UpdateDataFor<DescendantDocumentType>,
    Operation extends foundry.abstract.types.DatabaseUpdateOperation<UpdateData, Parent>,
  >(
    parent: Parent,
    collection: DescendantDocumentType['metadata']['collection'],
    documents: InstanceType<DescendantDocumentType>,
    changes: UpdateData[],
    options: foundry.abstract.Document.Database.UpdateOptions<Operation>,
    userId: string
  ) {
    super._onUpdateDescendantDocuments(parent, collection, documents, changes, options, userId);
    if (
      (collection === 'combatants' && changes?.some((change) => Object.hasOwn(change, 'initiative'))) ||
      collection === 'groups' ||
      changes?.some((change) => Object.hasOwn(change, 'initiative'))
    ) {
      this.#onModifyCombatantGroups(parent, documents, options);
    }
    if (game.user.isActiveGM && this.system.awaitingNextRound && !this.combatants.some(c => !c.isDefeated && (c.initiative === null))) {
      this.update({turn: this.turns.length - 1, 'system.awaitingNextRound': false}, {turnEvents: false}).then(() => super.nextRound())
    }
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
    userId: string
  ) {
    super._onDeleteDescendantDocuments(parent, collection, documents, ids, options, userId);
    if (collection === 'groups' || (collection === 'combatants' && documents?.some((d) => d.isGroupLeader))) {
      this.#onModifyCombatantGroups(parent, documents, options);
    }
  }

  async #onModifyCombatantGroups(parent: Combat.Stored, _documents, options) {
    if (game.user.activeGM?.isSelf) {
      for (const group of this.groups) {
        if (
          group.initiative &&
          (!group.leaderCombatant?.initiative ||
            !group.leaderCombatant?.system?.cardValue ||
            !group.leaderCombatant.isGroupLeader)
        ) {
          await group.update({ initiative: null });
        }
      }
    }
    this.setupTurns();
    if (ui.combat?.viewed === parent && options.render !== false) {
      ui.combat?.render();
    }
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
      (c) => c.type === 'poker' && c.value === cardValue && c.system['suit'] === cardSuit
    );
  }

  override setupTurns() {
    const ret = super.setupTurns();
    this.expandGroupIfNeeded();
    return ret;
  }

  override async resetAll({ updateTurn = false } = {}) {
    const currentId = this.combatant?.id;

    for (const combatant of this.combatants) {
      await combatant.resetInitiative();
    }

    this.setupTurns();

    const update = {
      turn: 0,
      combatants: this.combatants.toObject(),
      groups: this.groups.toObject(),
    };
    if (updateTurn && currentId) update.turn = this.turns.findIndex((t) => t.id === currentId);

    await this.update(update, { turnEvents: false, diff: false });
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

  createGroup(name = '', icon = '') {
    const groupCls = CombatantGroup.implementation;
    return groupCls.create(
      {
        name: name ? name : groupCls.defaultName({ parent: this }),
        img: icon ? icon : CONFIG.SWADE.combat.group.icon,
      },
      { parent: this }
    );
  }

  /**
   * Returns the group of the given combatant if existing in the combat.
   * @param leader The combatant to look for.
   * @returns The combatant's group, if any.
   */
  async getGroupForCombatant(
    leader: string | SwadeCombatant,
    options = { createIfNotInGroup: false, preferDisposition: undefined }
  ) {
    let leaderCombatant: SwadeCombatant | undefined = undefined;
    if (leader && leader instanceof SwadeCombatant && this.id === leader.combat?.id) {
      leaderCombatant = leader;
    } else if (leader?.length) {
      const possibleLeaders = this.combatants?.filter(
        (c) => c?.name === leader || c?.token?.name === leader || c?.actor.name === leader
      );
      if (typeof options.preferDisposition !== 'undefined') {
        leaderCombatant = possibleLeaders?.find((c) => c.token?.disposition === options?.preferDisposition);
      }
      if (!leaderCombatant) leaderCombatant = possibleLeaders?.shift();
    }
    if (!leaderCombatant) return undefined;
    if (leaderCombatant.group) return leaderCombatant.group;
    if (options?.createIfNotInGroup) {
      const group = await this.createGroup();
      if (!group) return undefined;
      await leaderCombatant.setGroup(group.id);
      await leaderCombatant.setIsGroupLeader(true);
      return group;
    }

    return undefined;
  }

  /**
   * Removes the combatant group with the given ID (if it exists) by removing all its members from it.
   * @param groupId The combatant group to remove.
   */
  async removeGroup(groupId, options = { deleteMembers: false }) {
    if (!groupId) return;
    const group = this.groups?.get(groupId);
    if (!group) return;

    if (group.members?.size > 0) {
      await Promise.all(
        group.members?.map(async (m) => {
          await m?.removeFromGroup();
          if (options?.deleteMembers) {
            await m?.delete();
          }
        })
      );
    } else {
      await group.delete();
    }
  }

  getGroupLeader(groupId) {
    const group = this.groups.get(groupId);
    return group?.system?.leaderCombatant;
  }

  toggleGroupExpand(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return;
    group._expanded = !group._expanded;
    return ui.combat?.render(true);
  }

  async expandGroupIfNeeded() {
    if (this.combatant?.group && !this.combatant.group._expanded) {
      return this.toggleGroupExpand(this.combatant.group.id);
    }
  }

  protected override async _onStartTurn(combatant: SwadeCombatant, context: object) {
    await super._onStartTurn(combatant, context);
    await this._handleTurnExpirations(combatant, 'start', context);
  }

  protected override async _onEndTurn(combatant: SwadeCombatant, context: object) {
    await super._onEndTurn(combatant, context);
    await this._handleTurnExpirations(combatant, 'end', context);
  }

  override async nextTurn() {
    if (this.system.awaitingNextRound) {
      return void ui.notifications.warn('SWADE.Combat.MustDrawInitiative', {localize: true});
    }
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
    await this.expandGroupIfNeeded();
    return this;
  }

  override async previousTurn() {
    await super.previousTurn();
    await this.expandGroupIfNeeded();
    return this;
  }

  override async nextRound() {
    if (game.user.isGM) await this._nextRoundAsGM();
    else await this._nextRoundAsUser();
    await this.expandGroupIfNeeded();
    return this;
  }

  override async previousRound() {
    const revert = await foundry.applications.api.Dialog.confirm({
      window: {title: game.i18n.localize('SWADE.Combat.RevertRoundTitle')},
      content: '<p>' + game.i18n.localize('SWADE.Combat.RevertRoundContent') + '</p>',
      yes: {default: true},
      rejectClose: false,
      options: { classes: [...Dialog.defaultOptions.classes, 'swade-app'] },
    });
    if (!revert) return this;
    const combatantUpdates = [];
    for (const combatant of this.combatants) {
      if (combatant.group && this.getGroupLeader(combatant.group.id) !== combatant) continue;
      combatantUpdates.push({_id: combatant.id, initiative: combatant.system.lastInitiative, system: {
        cardString: '',
        cardValue: null,
        hasJoker: false,
        suitValue: null
      }});
    }
    await this.updateEmbeddedDocuments('Combatant', combatantUpdates, {turnEvents: false});
    await this.update({'system.awaitingNextRound': false});
    await super.previousRound();
    await this.expandGroupIfNeeded();
    return this;
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

  protected async _handleTurnExpirations(combatant: SwadeCombatant, event: 'start'|'end', context: object) {
    if (!combatant?.actor || combatant.isDefeated) return;
    for (const effect of combatant.actor.effects) {
      await effect.handleTurnExpirations(event, context);
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
    if (this.system.awaitingNextRound) {
      return void ui.notifications.warn('SWADE.Combat.MustDrawInitiative', {localize: true});
    }
    if (this.#roundAdvanceDialog) return;
    this.#roundAdvanceDialog = true; //set the flag
    //run the dialog
    const advance = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('SWADE.Combat.AdvanceRoundTitle') },
      content: '<p>' + game.i18n.localize('SWADE.Combat.AdvanceRoundContent') + '</p>',
      rejectClose: false,
      classes: ['swade-app'],
    });
    this.#roundAdvanceDialog = false; //unset the flag
    if (!advance) return;

    await reshuffleActionDeckIfJokerDrawn();

    //reset the combatants
    await this.resetAll();

    // mark "waiting for next round"
    await this.update({'system.awaitingNextRound': true});

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
        (c: SwadeCombatant) => c.hasPlayerOwner && !c.isNPC && c.initiative === null && (!c.group || c.isGroupLeader)
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

  protected _determineIfRemoteDraw(user: SwadeUser, combatant: SwadeCombatant): boolean {
    if (!combatant.actor || !('initiative' in combatant.actor.system)) return false;
    const initiative = combatant.actor.system.initiative;
    const edges = initiative.hasLevelHeaded || initiative.hasImpLevelHeaded || initiative.hasQuick;
    const groupOwner = !combatant.group || combatant.group.isOwner;
    return user.active && edges && groupOwner;
  }

  override async _preDelete(options: Combat.Database.PreDeleteOptions, user: User.Implementation) {
    await super._preDelete(options, user);

    // Reset the deck when combat is ended.
    await reshuffleActionDeckIfJokerDrawn();

    // Remove the holding status from any combatants that have it.
    await Promise.allSettled(
      this.combatants
        .filter((c) => c.actor?.statuses.has('holding') ?? false)
        .flatMap((c) => c.actor?.effects.filter((e) => e.statuses.has('holding')))
        .map((e) => e.delete())
    );
  }
}
