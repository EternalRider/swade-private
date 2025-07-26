// import { Updates } from '../../globals';
import SwadeCombat from '../documents/combat/SwadeCombat';
import SwadeCombatant from '../documents/combat/SwadeCombatant';

/** This class defines a a new Combat Tracker specifically designed for SWADE */
export default class SwadeCombatTracker extends foundry.applications.sidebar
  .tabs.CombatTracker {
  static override DEFAULT_OPTIONS = {
    classes: ['swade'],
    actions: {
      toggleGroupExpand: this.#toggleGroupExpand,
      toggleHold: this.#onSwadeCombatantControl,
      toggleTurnLost: this.#onSwadeCombatantControl,
      actNow: this.#onSwadeCombatantControl,
      actAfter: this.#onSwadeCombatantControl,
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

    const [noGroup, grouped] = (context.turns ?? []).partition(
      (c) => !!c?.group,
    );

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

  protected async _prepareTurnContext(
    combat: Combat.Stored,
    combatant: Combatant.Stored,
    index,
  ) {
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
    const firstRound = combatant.system.firstRound ?? 0;
    // The Combatant can draw on or after their first round, but not if they're in a group or defeated.
    return (
      firstRound <= (combatant.combat?.round ?? 0) &&
      !(!!combatant.group || combatant.defeated)
    );
  }

  protected _canRedrawInitiative(combatant: SwadeCombatant): boolean {
    return combatant.isOwner && !combatant.group; // Followers can neither draw nor redraw.
  }

  protected override async _onRender(context, options) {
    await super._onRender(context, options);

    new foundry.applications.ux.DragDrop({
      dragSelector: '.combatant',
      dropSelector: '.combatant-group, .combat-tracker',
      permissions: {
        dragstart: () => game.user.isGM,
        drop: () => game.user.isGM,
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        dragleave: this._onDragLeave.bind(this),
        drop: this._onDrop.bind(this),
      },
    }).bind(this.element);

    if (options.parts && options.parts.includes('dramaticTask')) {
      const tokenInput = this.element.querySelector<HTMLInputElement>(
        'input[name="system.tokens.value"]',
      );

      tokenInput?.addEventListener('change', () =>
        this.viewed?.update({ 'system.tokens.value': tokenInput.value }),
      );
    }
  }

  protected async _onDragStart(event: DragEvent) {
    const li = event.currentTarget;
    const combatant = this.viewed.combatants.get(li.dataset.combatantId);
    if (!combatant) return;
    const dragData = combatant.toDragData();
    event.dataTransfer!.setData('text/plain', JSON.stringify(dragData));
  }

  protected _onDragOver(event: DragEvent) {
    (event.target as HTMLElement)
      ?.closest('li.combatant-group')
      ?.classList.add('dropTarget');
  }

  protected _onDragLeave(event: DragEvent): void {
    (event.target as HTMLElement)
      ?.closest('li.combatant-group')
      ?.classList.remove('dropTarget');
  }

  protected async _onDrop(event: DragEvent) {
    // Combat Tracker contains combatant groups, which means this would fire twice
    event.stopPropagation();
    const data =
      foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

    const combatant = await SwadeCombatant.fromDropData(data);

    if (!combatant) return;

    const groupLI = (event.target as HTMLElement).closest(
      '.combatant-group',
    ) as HTMLLIElement | undefined;
    if (groupLI) {
      groupLI.classList.remove('dropTarget');
      combatant.update({ group: groupLI.dataset.groupId });
    } else {
      combatant.update({ group: null });
    }
  }

  protected override async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    this._createContextMenu(this._getGroupContextOptions, '.combatant-group', {
      hookName: 'getCombatantGroupContextOptions',
      fixed: true,
      parentClassHooks: false,
    });
  }

  protected override _getEntryContextOptions() {
    const entryOptions = super._getEntryContextOptions();

    const getCombatant = (li: HTMLLIElement) =>
      this.viewed!.combatants.get(li.dataset.combatantId);
    const getCombatantGroup = (li: HTMLLIElement) =>
      this.viewed!.groups.get(li.closest('.combatant-group')?.dataset.groupId);

    entryOptions.push(
      {
        name: 'SWADE.MakeGroupLeader',
        icon: '<i class="fa-solid fa-users"></i>',
        condition: (li: HTMLLIElement) => {
          const combatant = getCombatant(li);
          return combatant.group && !combatant.isGroupLeader;
        },
        callback: (li: HTMLLIElement) =>
          getCombatant(li).setIsGroupLeader(true),
      },
      {
        name: 'SWADE.RemoveGroupLeader',
        icon: '<i class="fa-solid fa-users-slash"></i>',
        condition: (li: HTMLLIElement) => {
          if (getCombatantGroup(li)?.members.size !== 1) {
            return getCombatant(li).isGroupLeader;
          }
          return false;
        },
        callback: (li: HTMLLIElement) =>
          getCombatant(li).setIsGroupLeader(false),
      },
    );

    return entryOptions;
  }

  protected override _getCombatContextOptions() {
    const entryOptions = super._getCombatContextOptions();

    entryOptions.push({
      name: game.i18n.format('DOCUMENT.Create', {
        type: game.i18n.localize('DOCUMENT.CombatantGroup'),
      }),
      icon: '<i class="fa-solid fa-users-rectangle"></i>',
      callback: () => {
        const groupCls = CombatantGroup.implementation;
        groupCls.create(
          {
            name: groupCls.defaultName({ parent: this.viewed }),
            img: 'icons/environment/people/charge.webp',
          },
          { parent: this.viewed },
        );
      },
    });

    return entryOptions;
  }

  /**
   * Get the context menu entries for Combatant Groups in the tracker.
   * Only available to game masters.
   * @returns {ContextMenu.Entry[]}
   */
  protected _getGroupContextOptions() {
    const getCombatantGroup = (li: HTMLLIElement) =>
      this.viewed!.groups.get(li.dataset.groupId);
    return [
      {
        name: game.i18n.format('DOCUMENT.Update', {
          type: game.i18n.localize('DOCUMENT.CombatantGroup'),
        }),
        icon: '<i class="fa-solid fa-edit"></i>',
        condition: (li) => getCombatantGroup(li).isOwner,
        callback: (li: HTMLLIElement) =>
          getCombatantGroup(li)?.sheet.render({
            force: true,
            position: {
              top: Math.min(li.offsetTop, window.innerHeight - 350),
              left: window.innerWidth - 720,
            },
          }),
      },
      {
        name: 'COMBAT.ClearMovementHistories',
        icon: '<i class="fa-solid fa-shoe-prints"></i>',
        condition: game.user.isGM,
        callback: (li: HTMLLIElement) =>
          getCombatantGroup(li).clearMovementHistories(),
      },
      {
        name: game.i18n.format('DOCUMENT.Delete', {
          type: game.i18n.localize('DOCUMENT.CombatantGroup'),
        }),
        icon: '<i class="fa-solid fa-trash"></i>',
        condition: game.user.isGM,
        callback: (li: HTMLLIElement) => getCombatantGroup(li).delete(),
      },
      {
        name: 'OWNERSHIP.Configure',
        icon: '<i class="fa-solid fa-lock"></i>',
        condition: game.user.isGM,
        callback: (li) =>
          new foundry.applications.apps.DocumentOwnershipConfig({
            document: getCombatantGroup(li),
            position: {
              top: Math.min(li.offsetTop, window.innerHeight - 350),
              left: window.innerWidth - 720,
            },
          }).render({ force: true }),
      },
    ];
  }

  /* -------------------------------------------------- */
  /*   Actions                                          */
  /* -------------------------------------------------- */

  static async #toggleGroupExpand(
    this: SwadeCombatTracker,
    event: PointerEvent,
    target: HTMLElement,
  ) {
    // Don't proceed if the click event was actually on one of the combatants
    const entry = event.target.closest('[data-combatant-id]');
    if (entry) return;

    const combat = this.viewed;
    const groupId = target.dataset.groupId;
    await combat.toggleGroupExpand(groupId);
  }

  static async #onSwadeCombatantControl(
    this: SwadeCombatTracker,
    _event: PointerEvent,
    target: HTMLElement,
  ) {
    const combatantId = target?.closest('[data-combatant-id]')?.dataset
      .combatantId;
    const combatant: SwadeCombatant | null =
      this.viewed?.combatants.get(combatantId);
    if (!combatant) return;

    switch (target.dataset.action) {
      case 'toggleHold':
        return await combatant.toggleHold();
      case 'toggleTurnLost':
        return await combatant.toggleTurnLost();
      case 'actNow':
        return await combatant.actNow();
      case 'actAfter':
        return await combatant.actAfterCurrentCombatant();
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
