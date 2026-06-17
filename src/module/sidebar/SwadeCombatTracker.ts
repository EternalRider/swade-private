import SwadeCombat from '../documents/combat/SwadeCombat';
import SwadeCombatant from '../documents/combat/SwadeCombatant';

/** This class defines a a new Combat Tracker specifically designed for SWADE */
export default class SwadeCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {
  static override DEFAULT_OPTIONS = {
    classes: ['swade'],
    actions: {
      toggleGroupExpand: this.#toggleGroupExpand,
      toggleHold: this.#onSwadeCombatantControl,
      toggleTurnLost: this.#onSwadeCombatantControl,
      actNow: this.#onSwadeCombatantControl,
      actAfter: this.#onSwadeCombatantControl,
      drawInitiative: this.#drawInitiative,
      redrawInitiative: this.#redrawInitiative,
    },
  };

  static override PARTS = {
    header: {
      template: 'templates/sidebar/tabs/combat/header.hbs',
    },
    dramaticTask: {
      template: 'systems/swade/templates/sidebar/dramatic-task.hbs',
    },
    tracker: {
      template: 'systems/swade/templates/sidebar/tracker.hbs',
      templates: ['systems/swade/templates/sidebar/turn.hbs'],
      scrollable: [''],
    },
    footer: {
      template: 'templates/sidebar/tabs/combat/footer.hbs',
    },
  };

  override scrollToTurn() {
    this.element?.querySelector('.combatant.active')?.scrollIntoView();
    this.viewed?.expandGroupIfNeeded();
  }

  protected override _onActivate() {
    super._onActivate();
    this.viewed?.expandGroupIfNeeded();
  }

  protected override _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (game.user.isGM && !this.viewed?.round && this.viewed?.combatants?.size)
      parts.footer.template = 'systems/swade/templates/sidebar/footer.hbs';
    return parts;
  }

  protected override async _preparePartContext(partId, context, options) {
    await super._preparePartContext(partId, context, options);
    switch (partId) {
      case 'dramaticTask':
        await this._prepareDramaticTaskContext(context, options);
        break;
    }
    return context;
  }

  protected async _prepareDramaticTaskContext(context, _options) {
    context.isDramaticTask = this.viewed?.type === 'dramaticTask';
  }

  protected async _prepareTrackerContext(context, options) {
    await super._prepareTrackerContext(context, options);

    const combat = this.viewed as SwadeCombat | null;

    const [noGroup, grouped] = (context.turns ?? []).partition((c) => !!c?.group);

    const groups = Object.groupBy(grouped, (c) => c.group.id);

    const currentTurn = combat?.turns[combat.turn];

    context.groupTurns = combat?.groups.reduce((acc, cg) => {
      const {
        _expanded: isExpanded,
        id,
        name,
        isOwner,
        defeated: isDefeated,
        hidden,
        disposition,
        initiative,
        img,
      } = cg;
      const turns = groups[id] ?? [];
      const active = turns.some((t) => t.id === currentTurn?.id);
      const leader = cg.system.leaderCombatant;

      const turn = {
        isGroup: true,
        id,
        name,
        isOwner,
        isDefeated,
        hidden,
        disposition,
        initiative,
        turns,
        img,
        active,
      };

      if (leader) {
        Object.assign(turn, {
          cardString: leader?.cardString,
          initiative: leader?.initiative,
          roundHeld: leader?.roundHeld,
          isOnHold: !!leader?.roundHeld,
          turnLost: leader?.turnLost,
          hasRolled: !!leader?.initiative && !!leader?.cardString,
          canDrawInit: this._canDrawInitiative(leader),
          canRedraw: this._canRedrawInitiative(leader),
        });
      }

      turn.css = [
        isExpanded ? 'expanded' : null,
        active ? 'active' : null,
        hidden ? 'hide' : null,
        isDefeated ? 'defeated' : null,
      ].filterJoin(' ');

      acc.push(turn);

      return acc;
    }, noGroup);

    context.groupTurns?.sort(combat._sortCombatants);
  }

  protected async _prepareTurnContext(combat: Combat.Stored, combatant: Combatant.Stored, index) {
    const turn = await super._prepareTurnContext(combat, combatant, index);

    Object.assign(turn, {
      group: combatant.group,
      isVehicle: combatant?.actor?.type === 'vehicle',
      isIncapacitated: combatant?.isIncapacitated,
      isLeader: combatant.isGroupLeader,
      cardString: combatant?.cardString,
      initiative: combatant?.initiative,
      roundHeld: combatant?.roundHeld,
      isOnHold: !!combatant?.roundHeld,
      turnLost: combatant?.turnLost,
      hasRolled: !!combatant?.initiative && !!combatant?.cardString,
      canDrawInit: this._canDrawInitiative(combatant as SwadeCombatant),
      canRedraw: this._canRedrawInitiative(combatant as SwadeCombatant),
    });

    return turn;
  }

  protected _canDrawInitiative(combatant: SwadeCombatant): boolean {
    if (!combatant.isOwner) return false;

    // Can't draw if defeated.
    if (combatant.defeated || combatant.isDefeated) return false;

    // Can't draw if in a group, unless this combatant is the leader.
    if (combatant.group && !combatant.isGroupLeader) return false;

    // Combatant can draw on or after their first round.
    const firstRound = combatant.system.firstRound ?? 0;
    if (firstRound > (combatant.combat?.round ?? 0)) {
      return false;
    }

    return true;
  }

  protected _canRedrawInitiative(combatant: SwadeCombatant): boolean {
    return combatant.isOwner;
  }

  protected override async _onRender(context, options) {
    await super._onRender(context, options);

    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: '.combatant',
      dropSelector: '.combatant-group, .combatant, .combat-tracker',
      permissions: {
        dragstart: () => game.user.isGM,
        drop: () => game.user.isGM,
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
        dragend: this._onDragEnd.bind(this),
      },
    }).bind(this.element);

    if (options.parts && options.parts.includes('dramaticTask')) {
      const tokenInput = this.element.querySelector<HTMLInputElement>('input[name="system.tokens.value"]');

      tokenInput?.addEventListener('change', () => this.viewed?.update({ 'system.tokens.value': tokenInput.value }));
    }
  }

  protected getDropTargets() {
    return this.element.querySelectorAll('.dropTarget');
  }

  protected isDropTarget(target: HTMLElement) {
    this.getDropTargets()?.forEach((e) => {
      if (e === target) return true;
    });
    return false;
  }

  protected removeDropTargets() {
    this.getDropTargets()?.forEach((e) => {
      e.classList.remove('dropTarget');
    });
  }

  protected getClosestPossibleDropTarget(target: HTMLElement) {
    if (!target) return undefined;
    const group = target.closest('li.combatant-group');
    if (group) return group;
    return target.closest('li.combatant');
  }

  protected async _onDragStart(event: DragEvent) {
    const li = event.currentTarget;
    const combatant = this.viewed?.combatants?.get(li.dataset.combatantId);
    if (!combatant) return;
    const dragData = combatant.toDragData();
    event.dataTransfer!.setData('text/plain', JSON.stringify(dragData));
  }

  protected _onDragOver(event: DragEvent) {
    const target = this.getClosestPossibleDropTarget(event.target);
    if (!target) return;
    if (this.isDropTarget(target)) return;

    this.removeDropTargets();
    target.classList.add('dropTarget');
  }

  protected async _onDrop(event: DragEvent) {
    // Combat Tracker contains combatant groups, which means this would fire twice
    event.stopPropagation();
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (!data) return;
    switch (data.type as string) {
      case Combatant.documentName:
        await this._handleCombatantDrop(event, data as Combatant.DropData);
        break;
      case ActiveEffect.documentName:
        await this._handleActiveEffectDrop(event, data as ActiveEffect.DropData);
        break;
      default:
        console.warn(`Cannot drop ${data.type} documents onto combatants!`);
    }
  }

  protected async _handleCombatantDrop(event: DragEvent, data: Combatant.DropData) {
    const combatant = await SwadeCombatant.fromDropData(data);
    if (!combatant) return;

    const groupLI = (event.target as HTMLElement).closest<HTMLLIElement>('li.combatant-group');

    if (groupLI) {
      // Drop on group: move to group if it exists and not already in it.
      const groupId = groupLI.dataset.groupId;
      if (groupId !== combatant.group?.id && this.viewed?.groups.get(groupId)) {
        await combatant.setGroup(groupLI.dataset.groupId);
      }
    } else {
      // Drop elsewhere: if dropped combatant is already in group, remove from group.
      if (combatant.group) {
        combatant.removeFromGroup();
      } else {
        // Else if dropped on other combatant, create a group around and follow that combatant.
        const targetCombatantLI = (event.target as HTMLElement).closest<HTMLLIElement>('li.combatant');
        const targetCombatant = this.viewed?.combatants?.get(targetCombatantLI?.dataset.combatantId);
        if (!targetCombatant || targetCombatant.id == combatant.id) return;
        const group = await this.viewed?.createGroup();
        if (!group) return;
        await targetCombatant.setGroup(group.id);
        await combatant.setGroup(group.id);
      }
    }
  }

  protected async _handleActiveEffectDrop(event: DragEvent, data: ActiveEffect.DropData) {
    const dropTarget = (event.target as HTMLElement).closest<HTMLLIElement>('.combatant.dropTarget');
    if (!dropTarget) return;
    const combatant = this.viewed?.combatants.get(dropTarget.dataset.combatantId);
    if (!combatant || !combatant.actor) return;
    const effect = await ActiveEffect.fromDropData(data);
    if (!effect) return;

    await ActiveEffect.implementation.create(effect.toObject(), { parent: combatant.actor });
  }

  protected _onDragEnd(_event: DragEvent): void {
    this.removeDropTargets();
  }

  protected override async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    this._createContextMenu(this._getGroupContextOptions, '.combatant-group', {
      hookName: 'getCombatantGroupContextOptions',
      fixed: true,
      parentClassHooks: false,
    });

    this.viewed?.expandGroupIfNeeded();
  }

  protected getMatchingCombatantsByName(combatant: SwadeCombatant) {
    if (!combatant) return [];

    const matching = this.viewed?.combatants?.filter(
      (c) => (c.name === combatant.name || c.actor?.name === combatant.actor?.name) && c.id !== combatant.id && !c.group
    );

    return matching;
  }

  async #onGroupByName(combatant: SwadeCombatant) {
    if (!combatant || !this.viewed) return;
    const matchingCombatants = this.getMatchingCombatantsByName(combatant);
    if (!matchingCombatants?.length) return;

    const group = await this.viewed.createGroup();
    if (!group) return;

    await combatant.setGroup(group.id);
    await combatant.setIsGroupLeader(true);

    for (const c of matchingCombatants) {
      await c.setGroup(group.id);
    }
  }

  protected override _getEntryContextOptions() {
    const entryOptions = super._getEntryContextOptions();

    // Remove the default re-draw action.
    entryOptions.findSplice((v) => v.name === 'COMBATANT.ACTIONS.Reroll');

    const getCombatant = (li: HTMLLIElement) => this.viewed!.combatants.get(li.dataset.combatantId);

    entryOptions.push(
      {
        label: 'SWADE.MakeGroupLeader',
        icon: '<i class="fa-solid fa-users"></i>',
        visible: (li: HTMLLIElement) => {
          const combatant = getCombatant(li);
          return game.user.isGM && combatant?.group && !combatant?.isGroupLeader;
        },
        onClick: (_event, li: HTMLLIElement) => getCombatant(li).setIsGroupLeader(true),
      },
      {
        label: 'SWADE.GroupByName',
        icon: '<i class="fa-solid fa-users"></i>',
        visible: (li: HTMLLIElement) => {
          const combatant = getCombatant(li);
          return game.user.isGM && !combatant?.group && this.getMatchingCombatantsByName(combatant)?.length;
        },
        onClick: (_event, li: HTMLLIElement) => this.#onGroupByName(getCombatant(li)),
      }
    );

    return entryOptions;
  }

  protected override _getCombatContextOptions() {
    const entryOptions = super._getCombatContextOptions();

    entryOptions.push({
      label: game.i18n.format('DOCUMENT.Create', {
        type: game.i18n.localize('DOCUMENT.CombatantGroup'),
      }),
      icon: '<i class="fa-solid fa-users-rectangle"></i>',
      onClick: () => this.viewed?.createGroup(),
    });

    return entryOptions;
  }

  /**
   * Get the context menu entries for Combatant Groups in the tracker.
   * Only available to game masters.
   * @returns {ContextMenu.Entry[]}
   */
  protected _getGroupContextOptions() {
    const getCombatantGroup = (li: HTMLLIElement) => this.viewed!.groups.get(li.dataset.groupId!);
    const entryOptions = [
      {
        label: game.i18n.format('DOCUMENT.Update', {
          type: game.i18n.localize('DOCUMENT.CombatantGroup'),
        }),
        icon: '<i class="fa-solid fa-edit"></i>',
        visible: (li) => getCombatantGroup(li)?.isOwner,
        onClick: (_event, li: HTMLLIElement) =>
          getCombatantGroup(li)?.sheet.render({
            force: true,
            position: {
              top: Math.min(li.offsetTop, window.innerHeight - 350),
              left: window.innerWidth - 720,
            },
          }),
      },
      {
        label: 'COMBAT.ClearMovementHistories',
        icon: '<i class="fa-solid fa-shoe-prints"></i>',
        visible: game.user.isGM,
        onClick: (_event, li: HTMLLIElement) => getCombatantGroup(li)?.clearMovementHistories(),
      },
      {
        label: game.i18n.format('DOCUMENT.Delete', {
          type: game.i18n.localize('DOCUMENT.CombatantGroup'),
        }),
        icon: '<i class="fa-solid fa-trash"></i>',
        visible: game.user.isGM,
        onClick: (_event, li: HTMLLIElement) => this.viewed?.removeGroup(getCombatantGroup(li)?.id),
      },
      {
        label: game.i18n.localize('SWADE.DeleteGroupAndCombatants'),
        icon: '<i class="fa-solid fa-dumpster"></i>',
        visible: (li) => game.user.isGM && getCombatantGroup(li)?.members?.size,
        onClick: (_event, li: HTMLLIElement) =>
          this.viewed?.removeGroup(getCombatantGroup(li)?.id, {
            deleteMembers: true,
          }),
      },
      {
        label: 'OWNERSHIP.Configure',
        icon: '<i class="fa-solid fa-lock"></i>',
        visible: game.user.isGM,
        onClick: (_event, li) =>
          new foundry.applications.apps.DocumentOwnershipConfig({
            document: getCombatantGroup(li),
            position: {
              top: Math.min(li.offsetTop, window.innerHeight - 350),
              left: window.innerWidth - 720,
            },
          }).render({ force: true }),
      },
    ];
    return entryOptions;
  }

  /* -------------------------------------------------- */
  /*   Actions                                          */
  /* -------------------------------------------------- */

  static async #drawInitiative(this, _event, target) {
    let combatantId = null;

    const groupId = target?.closest('.combatant-group')?.dataset?.groupId;
    if (groupId) {
      combatantId = this.viewed?.getGroupLeader(groupId)?.id;
    } else {
      combatantId = target?.closest('[data-combatant-id]')?.dataset?.combatantId;
    }

    if (!this.viewed || !combatantId?.length) return undefined;

    return this.viewed?.rollInitiative(combatantId);
  }

  static async #redrawInitiative(this, _event, target) {
    let combatantId = null;

    const groupId = target?.closest('.combatant-group')?.dataset?.groupId;
    if (groupId) {
      combatantId = this.viewed?.getGroupLeader(groupId)?.id;
    } else {
      combatantId = target?.closest('[data-combatant-id]')?.dataset?.combatantId;
    }

    if (!this.viewed || !combatantId?.length) return undefined;

    return this.viewed?.rerollInitiative(combatantId);
  }

  static async #toggleGroupExpand(this: SwadeCombatTracker, event: PointerEvent, target: HTMLElement) {
    // Don't proceed if the click event was actually on one of the combatants
    const entry = event.target?.closest<HTMLElement>('[data-combatant-id]');
    if (entry) return;

    const combat = this.viewed;
    const groupId = target.dataset.groupId;
    await combat?.toggleGroupExpand(groupId);
  }

  static async #onSwadeCombatantControl(
    this: SwadeCombatTracker,
    _event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    const combatantId = target?.closest<HTMLElement>('[data-combatant-id]')?.dataset.combatantId;
    if (!combatantId) return;
    const combatant: SwadeCombatant | undefined = this.viewed?.combatants.get(combatantId);
    if (!combatant) return;

    switch (target.dataset.action) {
      case 'toggleHold':
        return combatant.toggleHold();
      case 'toggleTurnLost':
        return combatant.toggleTurnLost();
      case 'actNow':
        return combatant.actNow();
      case 'actAfter':
        return combatant.actAfterCurrentCombatant();
    }
  }

  /**
   * Handle new Combat creation request by presenting a form asking what type
   */
  protected override async _onCombatCreate(event: PointerEvent): Promise<void> {
    event.preventDefault();
    const cls = getDocumentClass('Combat');
    await cls.createDialog({ active: true });
  }
}
