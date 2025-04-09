import { Updates } from '../../globals';
import SwadeCombatGroupColor from '../apps/SwadeCombatGroupColor';
import SwadeCombat from '../documents/combat/SwadeCombat';
import SwadeCombatant from '../documents/combat/SwadeCombatant';

/** This class defines a a new Combat Tracker specifically designed for SWADE */
export default class SwadeCombatTracker extends CombatTracker {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/sidebar/combat-tracker.hbs',
      classes: ['tab', 'sidebar-tab', 'swade'],
    });
  }

  /** @privateRemarks scrollToTurn override because core Foundry targets .active which is applied on .combat-control elements as well */
  override scrollToTurn() {
    const combat = this.viewed;
    if (!combat || combat.turn === null) return;
    const active = this.element.querySelector('.combatant.active');
    const container = active?.parentElement;
    if (!active || !container) return;
    const nViewable = Math.floor(container.offsetHeight / active.offsetHeight);
    container.scrollTop =
      combat.turn * active.offsetHeight - (nViewable / 2) * active.offsetHeight;
    super.scrollToTurn();
  }

  override async getData(options?: Partial<ApplicationOptions>) {
    const data = (await super.getData(options)) as any;
    for (const turn of data.turns) {
      const combatant = this.viewed?.combatants.get(turn.id, { strict: true });
      foundry.utils.mergeObject(
        turn,
        {
          isVehicle: combatant?.actor?.type === 'vehicle',
          isIncapacitated: combatant?.isIncapacitated,
          cardString: combatant?.cardString,
          initiative: combatant?.initiative,
          roundHeld: combatant?.roundHeld,
          isOnHold: !!combatant?.roundHeld,
          turnLost: combatant?.turnLost,
          isGroupLeader: combatant?.isGroupLeader,
          groupId: combatant?.groupId,
          hasRolled: !!combatant?.initiative && !!combatant?.cardString,
          canDrawInit: this._canDrawInitiative(combatant as SwadeCombatant),
          canRedraw: this._canRedrawInitiative(combatant as SwadeCombatant),
        },
        { inplace: true },
      );
    }
    data.cardsIcon = CONFIG.Cards.sidebarIcon;
    data.isDramaticTask = this.viewed?.type === 'dramaticTask';
    data.isChase = this.viewed?.type === 'chase';
    data.typeLabel = CONFIG.Combat.typeLabels[this.viewed?.type];
    return data;
  }

  override activateListeners(jquery: JQuery<HTMLElement>) {
    super.activateListeners(jquery);
    const html = jquery[0];
    if (!game.user?.isGM) this._contextMenu(jquery);
    //make combatants draggable for GMs
    html.querySelectorAll<HTMLLIElement>('.combatant').forEach((li) => {
      const id = li.dataset.combatantId!;
      const comb = this.viewed?.combatants.get(id) as SwadeCombatant | null;
      if (comb?.isOwner || game.user?.isGM) {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.classList.add('draggable');
        li.addEventListener('dragstart', this._onDragStart.bind(this));
        li.addEventListener('drop', this._onDrop.bind(this));
        li.addEventListener('dragover', this._onDragOver.bind(this));
        li.addEventListener('dragleave', this._onDragLeave.bind(this));
      }
    });
    const tokenInput = html.querySelector<HTMLInputElement>(
      'input[name="system.tokens.value"]',
    );
    tokenInput?.addEventListener('change', () =>
      this.viewed?.update({ 'system.tokens.value': tokenInput.value }),
    );
  }

  /**
   * Handle new Combat creation request by presenting a form asking what type
   */
  protected override async _onCombatCreate(
    event: JQuery.ClickEvent,
  ): Promise<void> {
    event.preventDefault();
    const cls = getDocumentClass('Combat');
    await cls.createDialog({ active: true });
  }

  protected _canDrawInitiative(combatant: SwadeCombatant): boolean {
    if (!combatant.isOwner) return false;
    const firstRound = combatant.getFlag('swade', 'firstRound') ?? 0;
    // The Combatant can draw on or after their first round, but not if they're in a group or defeated.
    return (
      firstRound <= (combatant.combat?.round ?? 0) &&
      !(!!combatant.groupId || combatant.defeated)
    );
  }

  protected _canRedrawInitiative(combatant: SwadeCombatant): boolean {
    return combatant.isOwner && !combatant.groupId; // Followers can neither draw nor redraw.
  }

  protected override async _onCombatantControl(event: JQuery.ClickEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const btn = event.target as HTMLElement;
    const li = btn.closest('.combatant') as HTMLLIElement;
    const c = this.viewed!.combatants.get(li.dataset.combatantId as string, {
      strict: true,
    }) as SwadeCombatant;
    // Switch control action
    switch (btn.dataset.control) {
      // Toggle combatant defeated status to reallocate potential followers.
      case 'toggleIncapacitated':
        return this._onToggleIncapacitated(c);
      // Toggle combatant roundHeld property
      case 'toggleHold':
        return this._onToggleHoldStatus(c);
      // Toggle combatant turnLost property
      case 'toggleLostTurn':
        return this._onToggleTurnLostStatus(c);
      // Toggle combatant turnLost property
      case 'actNow':
        return this._onActNow(c);
      // Toggle combatant turnLost property
      case 'actAfter':
        return this._onActAfterCurrentCombatant(c);
      default:
        return super._onCombatantControl(event, btn);
    }
  }

  /** Toggle Defeated and reallocate followers */
  protected override async _onToggleDefeatedStatus(c: SwadeCombatant) {
    let fInitiative = c.initiative ?? 0;
    if (c.isGroupLeader && c.followers.some((f) => !f.isDefeated)) {
      const selected = await this.#promptNewLeaderSelection(c);
      if (!selected) return; //abort toggle since no new leader was designated?
      const updates: Updates[] = [
        {
          //make the selected combatant the leader
          _id: selected.id,
          initiative: c.initiative,
          cardString: c.cardString,
          'flags.swade': {
            '-=groupId': null,
            isGroupLeader: true,
          },
        },
      ];
      //un-assign the old leader
      updates.push({
        _id: c.id,
        initiative: fInitiative + 0.001,
        'flags.swade': {
          groupId: selected.id,
          isGroupLeader: false,
        },
      });
      if (c.groupId) updates['flags.swade.-=groupId'] = null;
      for (const f of c.followers.filter((f) => f.id !== selected.id)) {
        updates.push({
          _id: f.id,
          initiative: (fInitiative -= 0.001),
          'flags.swade.groupId': selected.id,
        });
      }
      await this.viewed?.updateEmbeddedDocuments('Combatant', updates);
    }
    await super._onToggleDefeatedStatus(c);
  }

  /** Toggle Incapacitation */
  protected async _onToggleIncapacitated(c: SwadeCombatant) {
    if (!c.actor) return;
    if (!c.actor.isWildcard) {
      await this._onToggleDefeatedStatus(c);
      // if (!c.actor.statuses.has('incapacitated')) return;
    }
    await c.actor.toggleStatusEffect('incapacitated', { overlay: true });
  }

  /** Toggle Hold */
  protected async _onToggleHoldStatus(c: SwadeCombatant) {
    await c.toggleHold();
  }

  /** Toggle Turn Lost */
  protected async _onToggleTurnLostStatus(c: SwadeCombatant) {
    await c.toggleTurnLost();
  }

  /** Act Now */
  protected async _onActNow(c: SwadeCombatant) {
    await c.actNow();
  }

  /** Act After Current Combatant */
  protected async _onActAfterCurrentCombatant(c: SwadeCombatant) {
    await c.actAfterCurrentCombatant();
  }

  protected override _onDragStart(ev: DragEvent): void {
    const target = ev.currentTarget as HTMLLIElement;
    if (!this.viewed) return;
    ev.dataTransfer?.setData(
      'text/plain',
      JSON.stringify(
        this.viewed.combatants
          .get(target.dataset.combatantId as string, { strict: true })
          .toDragData(),
      ),
    );
  }

  protected override async _onDrop(ev: DragEvent) {
    const data = JSON.parse(
      ev.dataTransfer!.getData('text/plain'),
    ) as foundry.abstract.Document.DropData<SwadeCombatant>;
    const combatant = await SwadeCombatant.fromDropData(data);
    const target = ev.currentTarget as HTMLLIElement;
    const leaderId = target.dataset.combatantId!;
    const leader = this.viewed?.combatants.get(leaderId, { strict: true });
    if (!leader || !combatant || combatant.id === leaderId) return;
    if (!leader.canUserModify(game.user!, 'update')) return;
    // If a follower, set as group leader
    if (!leader.isGroupLeader) {
      await leader.update({
        'flags.swade': {
          isGroupLeader: true,
          '-=groupId': null,
        },
      });
    }

    const initiative = (leader.initiative as number) - 0.001;
    const cardValue = leader.cardValue;
    const suitValue = leader.suitValue as number;
    const hasJoker = leader.hasJoker;
    // Set groupId of dragged combatant to the selected target's id
    await combatant.update({
      initiative,
      'flags.swade': {
        cardValue,
        suitValue,
        hasJoker,
        groupId: leaderId,
      },
    });
    // If a leader, update its followers
    if (combatant.isGroupLeader) {
      const followers =
        this.viewed?.combatants.filter((f) => f.groupId === combatant.id) ?? [];
      for (const f of followers) {
        await f.update({
          initiative,
          'flags.swade': {
            cardValue,
            suitValue,
            hasJoker,
            groupId: leaderId,
          },
        });
      }
      await combatant.unsetIsGroupLeader();
    }
  }

  protected override _onDragOver(ev: DragEvent): void {
    (ev.target as HTMLElement)
      ?.closest('li.combatant')
      ?.classList.add('dropTarget');
  }

  protected _onDragLeave(ev: DragEvent): void {
    (ev.target as HTMLElement)
      ?.closest('li.combatant')
      ?.classList.remove('dropTarget');
  }

  protected override _getEntryContextOptions() {
    const options = super._getEntryContextOptions();
    //since the context menu is also displayed for regular users we gotta add a GM only condition
    for (const option of options) {
      if (option.condition) continue;
      option.condition = () => game.user?.isGM ?? false;
    }
    //delete the redraw option
    options.findSplice((v) => v.name === 'COMBAT.CombatantReroll');

    const groupOptions = new Array<ContextMenuEntry>();

    // Set as group leader
    groupOptions.push({
      name: 'SWADE.MakeGroupLeader',
      icon: '<i class="fa-solid fa-users"></i>',
      condition: (li) => {
        const combatantId = li.getAttribute('data-combatant-id') as string;
        const combatant = this.viewed!.combatants.get(combatantId, {
          strict: true,
        }) as SwadeCombatant;
        return !combatant.isGroupLeader && !!combatant?.actor?.isOwner;
      },
      callback: this.#onMakeGroupLeader.bind(this),
    });

    // Set Group Color
    groupOptions.push({
      name: 'SWADE.SetGroupColor',
      icon: '<i class="fa-solid fa-palette"></i>',
      condition: (li) => {
        const combatantId = li.getAttribute('data-combatant-id') as string;
        const combatant = this.viewed?.combatants.get(combatantId, {
          strict: true,
        }) as SwadeCombatant;
        return combatant.isGroupLeader && !!game.user?.isGM;
      },
      callback: this.#onSetGroupColor.bind(this),
    });

    // Remove Group Leader
    groupOptions.push({
      name: 'SWADE.RemoveGroupLeader',
      icon: '<i class="fa-solid fa-users-slash"></i>',
      condition: (li) => {
        const combatantId = li.getAttribute('data-combatant-id') as string;
        const combatant = this.viewed?.combatants.get(combatantId)!;
        return combatant.isGroupLeader && combatant!.actor!.isOwner;
      },
      callback: this.#onRemoveGroupLeader.bind(this),
    });

    // Add selected tokens as followers
    groupOptions.push({
      name: 'SWADE.AddTokenFollowers',
      icon: '<i class="fa-solid fa-users"></i>',
      condition: (li) => {
        const combatant = this.viewed?.combatants.get(
          li.getAttribute('data-combatant-id') as string,
        ) as SwadeCombatant;
        const selectedTokens = (canvas?.tokens?.controlled ?? []).filter(
          (t) => t.id !== combatant.tokenId,
        );
        return (
          canvas?.ready &&
          selectedTokens.length > 0 &&
          selectedTokens.every((t) => t!.actor!.isOwner)
        );
      },
      callback: this.#onAddSelectedAsFollowers.bind(this),
    });

    // Set all combatants with this one's name or Actor name as its followers.
    groupOptions.push({
      name: 'SWADE.GroupByName',
      icon: '<i class="fa-solid fa-users"></i>',
      condition: (li) => {
        const combatantId = li.getAttribute('data-combatant-id') as string;
        const combatant = this.viewed?.combatants.get(combatantId)!;
        return (
          !!this.viewed!.combatants.find(
            (c) =>
              (c.name === combatant.name ||
                c.actor?.name === combatant.actor?.name) &&
              c.id !== combatantId,
          ) && game.user!.isGM
        );
      },
      callback: this.#onGroupByName.bind(this),
    });

    // Get group leaders for follow leader options
    const groupLeaders = (this.viewed?.combatants.filter(
      (c: SwadeCombatant) => c.isOwner && c.isGroupLeader,
    ) ?? []) as SwadeCombatant[];
    // Enable follow and unfollow if there are group leaders.
    // Loop through leaders
    for (const gl of groupLeaders) {
      // Follow a leader
      groupOptions.push({
        name: game.i18n.format('SWADE.Follow', { name: gl.name }),
        icon: '<i class="fa-solid fa-user-friends"></i>',
        condition: (li) => {
          const combatantId = li.getAttribute('data-combatant-id') as string;
          const combatant = this.viewed?.combatants.get(combatantId)!;
          return combatant.groupId !== gl.id && combatantId !== gl.id;
        },
        callback: (li) => this.#onFollowLeader(li, gl),
      });

      // Unfollow a leader
      groupOptions.push({
        name: game.i18n.format('SWADE.Unfollow', { name: gl.name }),
        icon: '<i class="fa-solid fa-user-friends"></i>',
        condition: (li) => {
          const combatantId = li.attr('data-combatant-id') as string;
          const combatant = this.viewed?.combatants.get(combatantId)!;
          return combatant.groupId === gl.id;
        },
        callback: this.#onUnfollowLeader.bind(this),
      });
    }

    options.splice(0, 0, ...groupOptions);
    return options;
  }

  protected override async _onCombatantMouseDown(
    event: PointerEvent,
  ): Promise<boolean | void> {
    if ((event.target as HTMLElement).classList.contains('dealt')) {
      return this.#onRedrawCard(event);
    }
    return super._onCombatantMouseDown(event, event.target);
  }

  async #promptNewLeaderSelection(c: SwadeCombatant): Promise<SwadeCombatant> {
    const candidates = c.followers
      .filter((f) => !f.isDefeated)
      .sort(SwadeCombat.nameSortCombatants);
    if (candidates.length === 1) return candidates[0];

    let selected = await Dialog.prompt({
      title: game.i18n.localize('SWADE.SelectNewGroupLeader'),
      label: 'OK',
      rejectClose: false,
      options: { classes: [...Dialog.defaultOptions.classes, 'swade-app'] },
      content: await renderTemplate(
        'systems/swade/templates/apps/pick-new-group-leader.hbs',
        {
          candidates: c.followers
            .filter((f) => !f.isDefeated)
            .sort(SwadeCombat.nameSortCombatants),
        },
      ),
      callback: (html: JQuery<HTMLElement>) => {
        const id = html
          .find<HTMLInputElement>('input[type="radio"]:checked')
          .val();
        return this.viewed?.combatants.get(id as string);
      },
    });
    selected ??= candidates[0]; //take the first available one if none was selected
    return selected as SwadeCombatant;
  }

  #onSetGroupColor(li: JQuery<HTMLElement>) {
    const combatantId = li.attr('data-combatant-id') as string;
    const combatant = this.viewed?.combatants.get(combatantId);
    new SwadeCombatGroupColor(combatant as SwadeCombatant).render(true);
  }

  async #onMakeGroupLeader(li: JQuery<HTMLElement>) {
    const combatantId = li.attr('data-combatant-id') as string;
    const combatant = this.viewed!.combatants.get(combatantId)!;
    await combatant.update({
      'flags.swade': {
        isGroupLeader: true,
        '-=groupId': null,
      },
    });
  }

  async #onRemoveGroupLeader(li: JQuery<HTMLElement>) {
    const combatantId = li.attr('data-combatant-id') as string;
    const combatant = this.viewed?.combatants.get(
      combatantId,
    ) as SwadeCombatant;
    // Remove combatants from this leader's group.
    if (this.viewed) {
      for (const f of combatant.followers) await f.unsetGroupId();
    }
    // Remove as group leader
    await combatant.unsetIsGroupLeader();
  }

  async #onAddSelectedAsFollowers(li: JQuery<HTMLElement>) {
    const targetCombatantId = li.attr('data-combatant-id') as string;
    const targetCombatant = this.viewed?.combatants.get(
      targetCombatantId,
    ) as SwadeCombatant;
    const selectedTokens = (canvas?.tokens?.controlled ?? []).filter(
      (t) => t.id !== targetCombatant.tokenId,
    );
    if (selectedTokens.length < 1) return; //return if no valid tokens are found
    await targetCombatant.update({
      'flags.swade': {
        cardValue: targetCombatant.cardValue!,
        suitValue: targetCombatant.suitValue!,
        isGroupLeader: true,
        groupId: null,
      },
    });
    // Filter for tokens that do not already have combatants
    const newTokens = selectedTokens.filter((t) => !t.inCombat);
    // Construct array of new combatants data
    const createData = newTokens?.map((t) => {
      return {
        tokenId: t.id,
        actorId: t.actorId,
        hidden: t.hidden,
      };
    });
    // Create the combatants and create array of combatants created
    const combatants = await game?.combat?.createEmbeddedDocuments(
      'Combatant',
      createData,
    );
    // Filter for tokens that already have combatants to add them as followers later
    const existingCombatantTokens = selectedTokens.filter((t) => t.inCombat);
    // If there were preexisting combatants in the selection...
    if (existingCombatantTokens.length > 0) {
      // Get their combatant objects and push them into the combatants array
      for (const t of existingCombatantTokens) {
        const c = game?.combat?.getCombatantsByToken(t.id)[0];
        if (c) {
          combatants?.push(c);
        }
      }
    }
    let fInitiative = targetCombatant.initiative ?? 0;
    if (combatants?.length) {
      for (const c of combatants) {
        await c.update({
          initiative: (fInitiative -= 0.001),
          'flags.swade': {
            groupId: targetCombatantId,
            '-=isGroupLeader': null,
          },
        });
      }
    }
  }

  async #onGroupByName(li: JQuery<HTMLElement>) {
    const combatantId = li.attr('data-combatant-id') as string;
    const combatant = this.viewed?.combatants.get(combatantId, {
      strict: true,
    }) as SwadeCombatant;
    const matchingCombatants = this.viewed?.combatants.filter(
      (c) =>
        (c.name === combatant.name ||
          c.actor?.name === combatant.actor?.name) &&
        c.id !== combatant.id,
    ) as SwadeCombatant[];
    if (matchingCombatants && combatant) {
      await combatant.unsetGroupId();
      await combatant.setIsGroupLeader(true);
      let fInitiative = combatant.initiative ?? 0;
      for (const c of matchingCombatants) {
        await c.update({ initiative: (fInitiative -= 0.001) });
        await c?.setGroupId(combatantId);
        await c?.setCardValue(c!.cardValue!);
        await c?.setSuitValue(c!.suitValue!);
      }
    }
  }

  async #onFollowLeader(li: HTMLElement, gl: SwadeCombatant) {
    const combatantId = li.getAttribute('data-combatant-id') as string;
    const combatant = this.viewed?.combatants.get(combatantId, {
      strict: true,
    }) as SwadeCombatant;

    const groupId = gl.id;
    const initiative = (gl.initiative as number) - 0.001;
    const cardValue = gl.cardValue;
    const suitValue = gl.suitValue;
    const hasJoker = gl.hasJoker;
    const updates: Updates[] = [
      //make sure the new leader is actually registered as a leader
      {
        _id: gl.id,
        'flags.swade.isGroupLeader': true,
      },
      // Set groupId of dragged combatant to the selected target's id
      {
        _id: combatant.id,
        initiative,
        'flags.swade': {
          cardValue,
          suitValue,
          hasJoker,
          groupId,
        },
      },
    ];
    if (combatant.isGroupLeader) {
      let fInitiative = initiative;
      for (const follower of combatant.followers) {
        updates.push({
          _id: follower.id,
          initiative: (fInitiative -= 0.001),
          'flags.swade': {
            cardValue,
            suitValue,
            hasJoker,
            groupId,
          },
        });
      }
      await combatant.unsetIsGroupLeader();
    }
    await this.viewed?.updateEmbeddedDocuments('Combatant', updates);
  }

  async #onUnfollowLeader(li: HTMLElement) {
    const combatantId = li.getAttribute('data-combatant-id') as string;
    const combatant = this.viewed?.combatants.get(
      combatantId,
    ) as SwadeCombatant | null;
    // If the current Combatant is the holding combatant, just remove Hold status.
    await combatant?.unsetGroupId();
    // Set the initiative to null so that they can draw init (hasRolled becomes false).
    await combatant?.update({ initiative: null });
  }

  async #onRedrawCard(ev: PointerEvent) {
    const combatantId = (ev.currentTarget as HTMLElement).closest<HTMLElement>(
      '.combatant',
    )?.dataset.combatantId as string;
    const combatant = this.viewed!.combatants.get(combatantId, {
      strict: true,
    });

    const isVehicle = combatant.actor?.type === 'vehicle';

    const buttons: Record<string, DialogButton> = {
      gm: {
        label: game.i18n.localize('SWADE.Rolls.GMBenny'),
        callback: async () => {
          game.user?.spendBenny();
          await this.viewed?.rollInitiative(combatantId);
        },
      },
      benny: {
        label: game.i18n.localize('SWADE.Benny'),
        callback: async () => {
          await combatant.actor?.spendBenny();
          await this.viewed?.rollInitiative(combatantId);
        },
      },
      free: {
        label: game.i18n.localize('SWADE.Free'),
        callback: async () => {
          await this.viewed?.rollInitiative(combatantId);
        },
      },
    };

    if (!game.user?.isGM) delete buttons.gm;

    const data: DialogData = {
      title: game.i18n.localize('SWADE.Redraw'),
      content:
        '<p class="text-center">' +
        game.i18n.localize('SWADE.Combat.RedrawDialog.Content') +
        '</p>',
      default: 'benny',
      buttons,
      render: (el: JQuery<HTMLElement>) => {
        if (isVehicle || (game.user?.isGM && game.user.bennies <= 0)) {
          el.find('[data-button="gm"]').attr('disabled', 'true');
        }
        if (isVehicle || combatant.bennies === 0) {
          el.find('[data-button="benny"]').attr('disabled', 'true');
        }
      },
    };
    new Dialog(data, {
      classes: [...Dialog.defaultOptions.classes, 'swade-app'],
      height: 'auto' as const,
    }).render(true);
  }
}
