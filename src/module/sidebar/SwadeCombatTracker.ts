import SwadeCombatGroupColor from '../apps/SwadeCombatGroupColor';
import type SwadeCombatant from '../documents/combat/SwadeCombatant';
import * as utils from '../util';

/**
 * This class defines a a new Combat Tracker specifically designed for SWADE
 */
export default class SwadeCombatTracker extends CombatTracker {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: 'systems/swade/templates/sidebar/combat-tracker.hbs',
      classes: ['tab', 'sidebar-tab', 'swade'],
    });
  }
  activateListeners(jquery: JQuery<HTMLElement>) {
    const html = jquery[0];
    super.activateListeners(jquery);
    if (!game.user?.isGM) this._contextMenu(jquery);
    //make combatants draggable for GMs
    html.querySelectorAll<HTMLElement>('.combatant').forEach((li) => {
      const id = li.dataset.combatantId!;
      const comb = this.viewed?.combatants.get(id) as SwadeCombatant | null;
      if (comb?.isOwner || game.user?.isGM) {
        // Add draggable attribute and dragstart listener.
        li.setAttribute('draggable', 'true');
        li.classList.add('draggable');
        //On dragStart
        li.addEventListener('dragstart', this._onDragStart.bind(this));
        li.addEventListener('drop', this._onDrop.bind(this));
        // On dragOver
        li.addEventListener(
          'dragover',
          (e) =>
            (e.target as HTMLElement)
              ?.closest('li.combatant')
              ?.classList.add('dropTarget'),
        );
        // On dragleave
        li.addEventListener(
          'dragleave',
          (e) =>
            (e.target as HTMLElement)
              ?.closest('li.combatant')
              ?.classList.remove('dropTarget'),
        );
      }
    });

    html
      .querySelectorAll<HTMLElement>('.combat-control[data-control=resetDeck]')
      .forEach((e) =>
        e.addEventListener('click', this._onReshuffleActionDeck.bind(this)),
      );
  }

  async getData(options?: Partial<ApplicationOptions>) {
    const data = (await super.getData(options)) as any;
    for (const turn of data.turns) {
      const combatant = this.viewed?.combatants.get(turn.id, { strict: true });
      foundry.utils.mergeObject(
        turn,
        {
          cardString: combatant?.cardString,
          roundHeld: combatant?.roundHeld,
          turnLost: combatant?.turnLost,
          emptyInit: !!combatant?.groupId || turn.defeated,
          canDrawInit: this._canDrawInitiative(combatant as SwadeCombatant),
        },
        { inplace: true },
      );
    }
    return data;
  }

  // Reset the Action Deck
  async _onReshuffleActionDeck(event: PointerEvent) {
    event.stopImmediatePropagation();
    await utils.reshuffleActionDeck();
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
    const btn = event.currentTarget;
    const li = btn.closest('.combatant');
    const c = this.viewed!.combatants.get(li.dataset.combatantId, {
      strict: true,
    }) as SwadeCombatant;
    // Switch control action
    switch (btn.dataset.control) {
      // Toggle combatant defeated flag to reallocate potential followers.
      case 'toggleDefeated':
        return this._onToggleDefeatedStatus(c);
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
  // Toggle Defeated and reallocate followers
  protected override async _onToggleDefeatedStatus(c: SwadeCombatant) {
    await super._onToggleDefeatedStatus(c);
    if (c.isGroupLeader) {
      const newLeader = await this.viewed!.combatants.find(
        (f) => f.groupId === c.id && !f.isDefeated,
      )!;
      await newLeader.update({
        flags: {
          swade: {
            '-=groupId': null,
            isGroupLeader: true,
          },
        },
      });
      for (const f of c.followers) {
        await f.setGroupId(newLeader.id!);
      }
      await c.unsetIsGroupLeader();
    }
    if (c.groupId) {
      await c.unsetGroupId();
    }
  }
  // Toggle Hold
  protected async _onToggleHoldStatus(c: SwadeCombatant) {
    const data = utils.getStatusEffectDataById('holding');
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
  // Toggle Turn Lost
  protected async _onToggleTurnLostStatus(c: SwadeCombatant) {
    const data = utils.getStatusEffectDataById('holding');
    if (!c.turnLost) {
      const groupId = c.groupId;
      if (groupId) {
        const leader = await this.viewed?.combatants.find(
          (l) => l.id === groupId,
        );
        if (leader) {
          await c.setTurnLost(true);
        }
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
  // Act Now
  protected async _onActNow(combatant: SwadeCombatant) {
    const data = utils.getStatusEffectDataById('holding');
    let targetCombatant = this.viewed!.combatant as SwadeCombatant;
    if (combatant.id === targetCombatant?.id) {
      targetCombatant = this.viewed!.turns.find((c) => !c.roundHeld)!;
    }
    await combatant.update({
      flags: {
        swade: {
          cardValue: targetCombatant?.cardValue,
          suitValue: targetCombatant?.suitValue! + 0.01,
          '-=roundHeld': null,
        },
      },
    });
    await combatant.actor?.toggleActiveEffect(data, { active: false });
    if (combatant.isGroupLeader) {
      let s = combatant.suitValue!;
      for await (const f of combatant.followers) {
        s -= 0.001;
        await f.update({
          flags: {
            swade: {
              cardValue: combatant.cardValue,
              suitValue: s,
              '-=roundHeld': null,
            },
          },
        });
        await f.actor?.toggleActiveEffect(data, { active: false });
      }
    }

    await this.viewed?.update({
      turn: this.viewed.turns.findIndex((c) => c.id === combatant.id),
    });
  }
  // Act After Current Combatant
  protected async _onActAfterCurrentCombatant(combatant: SwadeCombatant) {
    const data = utils.getStatusEffectDataById('holding');
    const currentCombatant = this.viewed!.combatant as SwadeCombatant;
    await combatant.update({
      flags: {
        swade: {
          cardValue: currentCombatant?.cardValue,
          suitValue: currentCombatant?.suitValue! - 0.01,
          '-=roundHeld': null,
        },
      },
    });
    await combatant.actor?.toggleActiveEffect(data, { active: false });
    if (combatant.isGroupLeader) {
      let s = combatant.suitValue!;
      for await (const f of combatant.followers) {
        s -= 0.001;
        await f.update({
          flags: {
            swade: {
              cardValue: combatant.cardValue,
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

    const dragData: CombatantDragData = {
      combatId: this.viewed.id,
      combatantId: target.dataset.combatantId as string,
    };

    ev.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  }

  protected override async _onDrop(ev: DragEvent) {
    const data = JSON.parse(
      ev.dataTransfer!.getData('text/plain'),
    ) as CombatantDragData;
    const target = ev.currentTarget as HTMLLIElement;
    const combatantId = data.combatantId;
    const leaderId = target.dataset.combatantId!;
    if (combatantId === leaderId) return;

    const combat = game.combats!.get(data.combatId, { strict: true });
    const leader = combat?.combatants.get(leaderId, { strict: true });
    if (!leader.canUserModify(game.user!, 'update')) return;
    const combatant = combat?.combatants.get(combatantId, {
      strict: true,
    }) as SwadeCombatant;
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
    const fSuitValue = leader.suitValue! - 0.01;
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
      const followers = combat.combatants.filter(
        (f) => f.groupId === combatant.id,
      );
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
          const combatant = game.combat!.combatants.get(combatantId, {
            strict: true,
          }) as SwadeCombatant;
          return combatant.isOwner;
        },
        callback: async (li) => {
          const combatantId = li.attr('data-combatant-id') as string;
          const combatant = game.combat!.combatants.get(combatantId);
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
        const combatant = game.combat!.combatants.get(combatantId, {
          strict: true,
        }) as SwadeCombatant;
        return !combatant.isGroupLeader && !!combatant?.actor?.isOwner;
      },
      callback: async (li) => {
        const combatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat!.combatants.get(combatantId)!;
        await combatant.update({
          'flags.swade': {
            isGroupLeader: true,
            '-=groupId': null,
          },
        });
      },
    });

    // Set Group Color
    groupOptions.push({
      name: 'SWADE.SetGroupColor',
      icon: '<i class="fa-solid fa-palette"></i>',
      condition: (li) => {
        const combatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat?.combatants.get(combatantId, {
          strict: true,
        }) as SwadeCombatant;
        return combatant.isGroupLeader && !!game.user?.isGM;
      },
      callback: (li) => {
        const combatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat?.combatants.get(combatantId);
        new SwadeCombatGroupColor(combatant as SwadeCombatant).render(true);
      },
    });

    // Remove Group Leader
    groupOptions.push({
      name: 'SWADE.RemoveGroupLeader',
      icon: '<i class="fa-solid fa-users-slash"></i>',
      condition: (li) => {
        const combatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat?.combatants.get(combatantId)!;
        return combatant.isGroupLeader && combatant!.actor!.isOwner;
      },
      callback: async (li) => {
        const combatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat?.combatants.get(
          combatantId,
        ) as SwadeCombatant;
        // Remove combatants from this leader's group.
        if (game.combat) {
          for (const f of combatant.followers) {
            await f.unsetGroupId();
          }
        }
        // Remove as group leader
        await combatant.unsetIsGroupLeader();
      },
    });

    // Add selected tokens as followers
    groupOptions.push({
      name: 'SWADE.AddTokenFollowers',
      icon: '<i class="fa-solid fa-users"></i>',
      condition: (li) => {
        const combatant = game.combat?.combatants.get(
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
      callback: async (li) => {
        const combatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat?.combatants.get(
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
        const existingCombatantTokens = selectedTokens.filter(
          (t) => t.inCombat,
        );
        // Construct array of new combatants data
        const createData = newTokens?.map((t) => {
          return {
            tokenId: t.id,
            actorId: t.actorId,
            hidden: t.hidden,
          };
        });
        // Create the combatants and create array of combatants created
        const combatants = (await game?.combat?.createEmbeddedDocuments(
          'Combatant',
          createData,
        )) as Array<SwadeCombatant>;
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
      },
    });

    // Set all combatants with this one's name as its followers.
    groupOptions.push({
      name: 'SWADE.GroupByName',
      icon: '<i class="fa-solid fa-users"></i>',
      condition: (li) => {
        const combatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat?.combatants.get(combatantId)!;
        return (
          !!game.combat!.combatants.find(
            (c) => c.name === combatant.name && c.id !== combatantId,
          ) && game.user!.isGM
        );
      },
      callback: async (li) => {
        const combatantId = li.attr('data-combatant-id') as string;
        const combatant = game.combat?.combatants.get(combatantId, {
          strict: true,
        }) as SwadeCombatant;
        const matchingCombatants = game.combat?.combatants.filter(
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
      },
    });

    // Get group leaders for follow leader options
    const groupLeaders = (game.combat?.combatants.filter(
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
          const combatant = game.combat?.combatants.get(combatantId)!;
          return combatant.groupId !== gl.id && combatantId !== gl.id;
        },
        callback: async (li) => {
          const combatantId = li.attr('data-combatant-id') as string;
          const combatant = game.combat?.combatants.get(
            combatantId,
          ) as SwadeCombatant;

          const groupId = gl.id ?? undefined;
          await gl.setIsGroupLeader(true);
          const fInitiative = getProperty(gl, 'data.initiative');
          const fCardValue = gl.cardValue;
          const fSuitValue = gl.suitValue! - 0.01;
          const fHasJoker = gl.hasJoker;
          // Set groupId of dragged combatant to the selected target's id

          await combatant.update({
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
          if (combatant.isGroupLeader) {
            const followers =
              game.combat?.combatants.filter(
                (f) => f.groupId === combatant.id,
              ) ?? [];

            for (const follower of followers) {
              await follower.update({
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
        },
      });

      // Unfollow a leader
      groupOptions.push({
        name: game.i18n.format('SWADE.Unfollow', { name: gl.name }),
        icon: '<i class="fa-solid fa-user-friends"></i>',
        condition: (li) => {
          const combatantId = li.attr('data-combatant-id') as string;
          const combatant = game.combat?.combatants.get(combatantId)!;
          return combatant.groupId === gl.id;
        },
        callback: async (li) => {
          const combatantId = li.attr('data-combatant-id') as string;
          const combatant = game.combat?.combatants.get(
            combatantId,
          ) as SwadeCombatant | null;
          // If the current Combatant is the holding combatant, just remove Hold status.
          await combatant?.unsetGroupId();
        },
      });
    }

    options.splice(0, 0, ...groupOptions);
    return options;
  }
}

interface CombatantDragData {
  combatId: string;
  combatantId: string;
}
