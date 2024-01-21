import { DropData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/abstract/client-document';
import { Updates } from '../../globals';
import SwadeCombatGroupColor from '../apps/SwadeCombatGroupColor';
import SwadeCombat from '../documents/combat/SwadeCombat';
import SwadeCombatant from '../documents/combat/SwadeCombatant';
import { getStatusEffectDataById, reshuffleActionDeck } from '../util';

/** This class defines a a new Combat Tracker specifically designed for SWADE */
export default class SwadeCombatTracker extends CombatTracker {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/sidebar/combat-tracker.hbs',
      classes: ['tab', 'sidebar-tab', 'swade'],
    });
  }

  override activateListeners(jquery: JQuery<HTMLElement>) {
    super.activateListeners(jquery);
    const html = jquery[0];
    if (!game.user?.isGM) this._contextMenu(jquery);
    //make combatants draggable for GMs
    html.querySelectorAll<HTMLLIElement>('li.combatant').forEach((li) => {
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

    html
      .querySelectorAll<HTMLElement>('.combat-control[data-control=resetDeck]')
      .forEach((e) =>
        e.addEventListener('click', this._onReshuffleActionDeck.bind(this)),
      );
  }

  override async getData(options?: Partial<ApplicationOptions>) {
    const data = (await super.getData(options)) as any;
    for (const turn of data.turns) {
      const combatant = this.viewed?.combatants.get(turn.id, { strict: true });
      foundry.utils.mergeObject(
        turn,
        {
          isVehicle: combatant?.actor.type === 'vehicle',
          isIncapacitated: combatant?.isIncapacitated,
          cardString: combatant?.cardString,
          roundHeld: combatant?.roundHeld,
          turnLost: combatant?.turnLost,
          emptyInit: !!combatant?.groupId || turn.defeated,
          canDrawInit: this._canDrawInitiative(combatant as SwadeCombatant),
        },
        { inplace: true },
      );
    }
    data.cardsIcon = CONFIG.Cards.sidebarIcon;
    return data;
  }

  /** Reset the Action Deck */
  protected async _onReshuffleActionDeck(event: PointerEvent) {
    event.stopImmediatePropagation();
    await reshuffleActionDeck();
    ui.notifications.info('SWADE.ActionDeckResetNotification', {
      localize: true,
    });
  }

  protected _canDrawInitiative(combatant: SwadeCombatant): boolean {
    if (!combatant.isOwner) return false;
    const firstRound = combatant.getFlag('swade', 'firstRound') ?? 0;
    return (
      !!combatant.groupId ||
      combatant.defeated ||
      firstRound >= (combatant.combat?.round ?? 0)
    );
  }

  protected override async _onCombatantControl(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const btn = event.currentTarget as HTMLElement;
    const li = btn.closest('.combatant') as HTMLLIElement;
    const c = this.viewed!.combatants.get(li.dataset.combatantId as string, {
      strict: true,
    }) as SwadeCombatant;
    // Switch control action
    switch (btn.dataset.control) {
      // Toggle combatant defeated flag to reallocate potential followers.
      case 'toggleIncapacitated':
        return this._onToggleIncapacitated(c);
      // Toggle combatant roundHeld flag
      case 'toggleHold':
        return this._onToggleHoldStatus(c);
      // Toggle combatant turnLost flag
      case 'toggleLostTurn':
        return this._onToggleTurnLostStatus(c);
      // Toggle combatant turnLost flag
      case 'actNow':
        return this._onActNow(c);
      // Toggle combatant turnLost flag
      case 'actAfter':
        return this._onActAfterCurrentCombatant(c);
      default:
        return super._onCombatantControl(event);
    }
  }

  /** Toggle Defeated and reallocate followers */
  protected override async _onToggleDefeatedStatus(c: SwadeCombatant) {
    if (c.isGroupLeader && c.followers.some((f) => !f.isDefeated)) {
      const selected = await this.#promptNewLeaderSelection(c);
      if (!selected) return; //abort toggle since no new leader was designated?
      const updates: Updates[] = [
        {
          //make the selected combatant the leader
          _id: selected.id,
          'flags.swade.-=groupId': null,
          'flags.swade.isGroupLeader': true,
        },
      ];
      //un-assign the old leader
      const cUpdate = { _id: c.id, 'flags.swade.isGroupLeader': false };
      if (c.groupId) updates['flags.swade.-=groupId'] = null;
      updates.push(
        cUpdate,
        ...c.followers
          .filter((f) => f.id !== selected.id)
          .map((f) => {
            //re-allocate the followers
            return { _id: f.id, 'flags.swade.groupId': selected.id };
          }),
      );
      await this.viewed?.updateEmbeddedDocuments('Combatant', updates);
    }
    await super._onToggleDefeatedStatus(c);
  }

  /** Toggle Incapacitation */
  protected async _onToggleIncapacitated(c: SwadeCombatant) {
    if (!c.actor.isWildcard) await this._onToggleDefeatedStatus(c);
    const token = c.token;
    if (!token) return;
    const effect = getStatusEffectDataById(
      CONFIG.specialStatusEffects.INCAPACITATED,
    );
    if (token.object) {
      await token.object.toggleEffect(effect, { overlay: true });
    } else {
      await token.toggleActiveEffect(effect, { overlay: true });
    }
  }

  /** Toggle Hold */
  protected async _onToggleHoldStatus(c: SwadeCombatant) {
    const data = getStatusEffectDataById('holding');
    if (!c.roundHeld) {
      // Add flag for on hold to show icon on token
      await c.setRoundHeld(this.viewed!.round);
      await c.actor?.toggleActiveEffect(data, { active: true });
      if (c.isGroupLeader) {
        for (const f of c.followers) {
          await f.setRoundHeld(this.viewed!.round);
          await f.actor?.toggleActiveEffect(data, { active: true });
        }
      }
    } else {
      await c.unsetFlag('swade', 'roundHeld');
      await c.actor?.toggleActiveEffect(data, { active: false });
    }
  }

  /** Toggle Turn Lost */
  protected async _onToggleTurnLostStatus(c: SwadeCombatant) {
    const data = getStatusEffectDataById('holding');
    if (!c.turnLost) {
      const groupId = c.groupId;
      if (groupId) {
        const leader = await this.viewed?.combatants.find(
          (l) => l.id === groupId,
        );
        if (leader) await c.setTurnLost(true);
      } else {
        await c.update({
          'flags.swade': {
            turnLost: true,
            '-=roundHeld': null,
          },
        });
        await c.actor?.toggleActiveEffect(data, { active: false });
      }
    } else {
      await c.update({
        'flags.swade': {
          roundHeld: this.viewed?.round,
          '-=turnLost': null,
        },
      });
      await c.actor?.toggleActiveEffect(data, { active: false });
    }
  }

  /** Act Now */
  protected async _onActNow(c: SwadeCombatant) {
    const data = getStatusEffectDataById('holding');
    let targetCombatant = this.viewed!.combatant as SwadeCombatant;
    if (c.id === targetCombatant?.id) {
      targetCombatant = this.viewed!.turns.find((c) => !c.roundHeld)!;
    }
    await c.update({
      flags: {
        swade: {
          cardValue: targetCombatant?.cardValue,
          suitValue: targetCombatant?.suitValue! + 0.01,
          '-=roundHeld': null,
        },
      },
    });
    await c.actor?.toggleActiveEffect(data, { active: false });
    if (c.isGroupLeader) {
      let s = c.suitValue!;
      for await (const f of c.followers) {
        s -= 0.001;
        await f.update({
          flags: {
            swade: {
              cardValue: c.cardValue,
              suitValue: s,
              '-=roundHeld': null,
            },
          },
        });
        await f.actor?.toggleActiveEffect(data, { active: false });
      }
    }

    await this.viewed?.update({
      turn: this.viewed.turns.findIndex((c) => c.id === c.id),
    });
  }

  /** Act After Current Combatant */
  protected async _onActAfterCurrentCombatant(c: SwadeCombatant) {
    const data = getStatusEffectDataById('holding');
    const currentCombatant = this.viewed!.combatant as SwadeCombatant;
    await c.update({
      flags: {
        swade: {
          cardValue: currentCombatant?.cardValue,
          suitValue: currentCombatant?.suitValue! - 0.01,
          '-=roundHeld': null,
        },
      },
    });
    await c.actor?.toggleActiveEffect(data, { active: false });
    if (c.isGroupLeader) {
      let s = c.suitValue!;
      for await (const f of c.followers) {
        s -= 0.001;
        await f.update({
          flags: {
            swade: {
              cardValue: c.cardValue,
              suitValue: s,
              '-=roundHeld': null,
            },
          },
        });
        await f.actor?.toggleActiveEffect(data, { active: false });
      }
    }

    await this.viewed?.update({
      turn: this.viewed.turns.findIndex((c) => c.id === currentCombatant?.id),
    });
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
    ) as DropData<SwadeCombatant>;
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

    const fInitiative = leader.initiative;
    const fCardValue = leader.cardValue;
    const fSuitValue = (leader.suitValue as number) - 0.01;
    const fHasJoker = leader.hasJoker;
    // Set groupId of dragged combatant to the selected target's id
    await combatant.update({
      initiative: fInitiative,
      'flags.swade': {
        cardValue: fCardValue,
        suitValue: fSuitValue,
        hasJoker: fHasJoker,
        groupId: leaderId,
      },
    });
    // If a leader, update its followers
    if (combatant.isGroupLeader) {
      const followers =
        this.viewed?.combatants.filter((f) => f.groupId === combatant.id) ?? [];
      for (const f of followers) {
        await f.update({
          initiative: fInitiative,
          'flags.swade': {
            cardValue: fCardValue,
            suitValue: fSuitValue,
            hasJoker: fHasJoker,
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
    const index = options.findIndex((v) => v.name === 'COMBAT.CombatantReroll');
    if (index !== -1) {
      options[index].name = 'SWADE.Redraw';
      options[index].icon = '<i class="fa-solid fa-sync-alt"></i>';
      const redrawOptions = new Array<ContextMenuEntry>();

      redrawOptions.push({
        name: 'SWADE.RedrawBenny',
        icon: '<i class="fa-solid fa-sync-alt"></i>',
        condition: (li) => {
          const combatantId = li.attr('data-combatant-id') as string;
          const combatant = this.viewed!.combatants.get(combatantId, {
            strict: true,
          }) as SwadeCombatant;
          return combatant.isOwner;
        },
        callback: async (li) => {
          const combatantId = li.attr('data-combatant-id') as string;
          const combatant = this.viewed!.combatants.get(combatantId);
          if (!combatant) return;
          await combatant.actor?.spendBenny();
          this.viewed?.rollInitiative(combatant.id as string);
        },
      });

      options.splice(index + 1, 0, ...redrawOptions);
    }

    const groupOptions = new Array<ContextMenuEntry>();

    // Set as group leader
    groupOptions.push({
      name: 'SWADE.MakeGroupLeader',
      icon: '<i class="fa-solid fa-users"></i>',
      condition: (li) => {
        const combatantId = li.attr('data-combatant-id') as string;
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
        const combatantId = li.attr('data-combatant-id') as string;
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
        const combatantId = li.attr('data-combatant-id') as string;
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
          li.attr('data-combatant-id') as string,
        ) as SwadeCombatant;
        const selectedTokens = (canvas?.tokens?.controlled ?? []).filter(
          (t) => t.actor.id !== combatant.actorId,
        );
        return (
          canvas?.ready &&
          selectedTokens.length > 0 &&
          selectedTokens.every((t) => t!.actor!.isOwner)
        );
      },
      callback: this.#onAddSelectedAsFollowers.bind(this),
    });

    // Set all combatants with this one's name as its followers.
    groupOptions.push({
      name: 'SWADE.GroupByName',
      icon: '<i class="fa-solid fa-users"></i>',
      condition: (li) => {
        const combatantId = li.attr('data-combatant-id') as string;
        const combatant = this.viewed?.combatants.get(combatantId)!;
        return (
          !!this.viewed!.combatants.find(
            (c) => c.name === combatant.name && c.id !== combatantId,
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
          const combatantId = li.attr('data-combatant-id') as string;
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
    const combatantId = li.attr('data-combatant-id') as string;
    const combatant = this.viewed?.combatants.get(
      combatantId,
    ) as SwadeCombatant;
    const selectedTokens = (canvas?.tokens?.controlled ?? []).filter(
      (t) => t.actor.id !== combatant.actorId,
    );
    if (selectedTokens.length < 1) return; //return if no valid tokens are found
    const cardValue = combatant.cardValue! + 0.99;
    await combatant.update({
      flags: {
        swade: {
          cardValue: cardValue,
          suitValue: combatant.suitValue!,
          isGroupLeader: true,
          '-=groupId': null,
        },
      },
    });
    // Filter for tokens that do not already have combatants
    const newTokens = selectedTokens.filter((t) => !t.inCombat);
    // Filter for tokens that already have combatants to add them as followers later
    const existingCombatantTokens = selectedTokens.filter((t) => t.inCombat);
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
    // If there were preexisting combatants...
    if (existingCombatantTokens.length > 0) {
      // Push them into the combatants array
      for (const t of existingCombatantTokens) {
        const c = game?.combat?.getCombatantByToken(t.id);
        if (c) {
          combatants?.push(c);
        }
      }
    }
    if (combatants) {
      for (const c of combatants) {
        await c.update({
          flags: {
            swade: {
              groupId: combatantId,
              '-=isGroupLeader': null,
            },
          },
        });
      }
    }

    let suitValue = combatant.suitValue!;
    for (const f of combatant.followers) {
      await f.update({
        flags: {
          swade: {
            cardValue: cardValue,
            suitValue: (suitValue -= 0.01),
          },
        },
      });
    }
  }

  async #onGroupByName(li: JQuery<HTMLElement>) {
    const combatantId = li.attr('data-combatant-id') as string;
    const combatant = this.viewed?.combatants.get(combatantId, {
      strict: true,
    }) as SwadeCombatant;
    const matchingCombatants = this.viewed?.combatants.filter(
      (c) => c.name === combatant?.name && c.id !== combatant.id,
    ) as SwadeCombatant[];
    if (matchingCombatants && combatant) {
      await combatant.unsetGroupId();
      await combatant.setIsGroupLeader(true);
      for (const c of matchingCombatants) {
        await c?.setGroupId(combatantId);
        await c?.setCardValue(c!.cardValue!);
        await c?.setSuitValue(c!.suitValue! - 0.01);
      }
    }
  }

  async #onFollowLeader(li: JQuery<HTMLElement>, gl: SwadeCombatant) {
    const combatantId = li.attr('data-combatant-id') as string;
    const combatant = this.viewed?.combatants.get(combatantId, {
      strict: true,
    }) as SwadeCombatant;

    const groupId = gl.id;
    const fInitiative = gl.initiative;
    const fCardValue = gl.cardValue;
    const fSuitValue = gl.suitValue;
    const fHasJoker = gl.hasJoker;
    const updates: Updates[] = [
      //make sure the new leader is actually registered as a leader
      {
        _id: gl.id,
        'flags.swade.isGroupLeader': true,
      },
      // Set groupId of dragged combatant to the selected target's id
      {
        _id: combatant.id,
        initiative: fInitiative,
        'flags.swade': {
          cardValue: fCardValue,
          suitValue: fSuitValue,
          hasJoker: fHasJoker,
          groupId: groupId,
        },
      },
    ];
    if (combatant.isGroupLeader) {
      for (const follower of combatant.followers) {
        updates.push({
          _id: follower.id,
          initiative: fInitiative,
          flags: {
            swade: {
              cardValue: fCardValue,
              suitValue: fSuitValue,
              hasJoker: fHasJoker,
              groupId: groupId,
            },
          },
        });
      }
      await combatant.unsetIsGroupLeader();
    }
    await this.viewed?.updateEmbeddedDocuments('Combatant', updates);
  }

  async #onUnfollowLeader(li: JQuery<HTMLElement>) {
    const combatantId = li.attr('data-combatant-id') as string;
    const combatant = this.viewed?.combatants.get(
      combatantId,
    ) as SwadeCombatant | null;
    // If the current Combatant is the holding combatant, just remove Hold status.
    await combatant?.unsetGroupId();
  }
}
