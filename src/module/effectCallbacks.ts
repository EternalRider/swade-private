import { constants } from './constants';
import { TraitRoll } from './dice/TraitRoll';
import SwadeActiveEffect from './documents/active-effect/SwadeActiveEffect';
import SwadeActor from './documents/actor/SwadeActor';

/** @internal */
export function registerEffectCallbacks() {
  const effectCallbacks = game.swade.effectCallbacks;
  effectCallbacks.set('shaken', removeShaken);
  effectCallbacks.set('stunned', removeStunned);
  effectCallbacks.set('bleeding-out', bleedOut);
  effectCallbacks.set('wild-attack', wildAttack);
}

async function wildAttack(effect: SwadeActiveEffect) {
  const parent = effect.parent;
  if (!(parent instanceof SwadeActor)) return;
  await parent.toggleActiveEffect('vulnerable');
  await effect.delete();
}

async function removeShaken(effect: SwadeActiveEffect) {
  let failedRoll = false;
  let acceptedResult = false;
  while (effect.parent?.effects.has(effect.id)) {
    await new Promise<void>((resolve) => {
      let roll: TraitRoll | null = null;
      let processed = false;
      const buttons: foundry.applications.api.DialogV2.Button<Promise<void>>[] = [
        {
          action: 'roll',
          label: game.i18n.localize('SWADE.EffectCallbacks.Shaken.RollSpirit'),
          icon: '<i class="fas fa-dice"></i>',
          callback: async () => {
            processed = true;
            const parent = effect.parent;
            if (!(parent instanceof SwadeActor) || parent?.type === 'vehicle') {
              return;
            }
            const flavor = game.i18n.localize(
              'SWADE.EffectCallbacks.Shaken.Flavor',
            );
            roll = await parent.rollAttribute('spirit', {
              title: flavor,
              flavour: flavor,
              additionalMods: [
                {
                  label: game.i18n.localize(
                    'SWADE.EffectCallbacks.Shaken.UnshakeModifier',
                  ),
                  value: parent.system.attributes.spirit.unShakeBonus,
                },
              ],
            });
            if (
              (roll?.successes ?? constants.ROLL_RESULT.FAIL) >=
              constants.ROLL_RESULT.SUCCESS
            ) {
              await effect.delete();
              ui.notifications.info('SWADE.EffectCallbacks.Shaken.Success', {
                localize: true,
              });
              resolve();
            } else {
              failedRoll = true;
              resolve();
            }
          },
        },
      ];

      if (failedRoll) {
        buttons.push(
          {
            action: 'accept',
            label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.Accept'),
            icon: '<i class="fas fa-check"></i>',
            callback: async () => {
              processed = true;
              failedRoll = false;
              acceptedResult = true;
              await effect.resetDuration();
              resolve();
            },
          },
          {
            action: 'benny',
            label: game.i18n.localize('SWADE.BenniesSpend'),
            icon: '<i class="fas fa-coins"></i>',
            callback: async () => {
              processed = true;
              const parent = effect.parent;
              if (!(parent instanceof SwadeActor)) return;
              failedRoll = false;
              await parent?.spendBenny();
              await effect.delete();
              resolve();
            },
          },
          {
            action: 'gmBenny',
            label: game.i18n.localize('SWADE.BenniesSpendGM'),
            icon: '<i class="fas fa-coins"></i>',
            callback: async () => {
              processed = true;
              const parent = effect.parent;
              if (!(parent instanceof SwadeActor)) return;
              failedRoll = false;
              await game.user?.spendBenny();
              await effect.delete();
              resolve();
            },
          },
        );
      }

      if (!game.user?.isGM) {
        foundry.utils.findSplice(
          buttons,
          (button) => button.action === 'gmBenny',
        );
      }

      const content = game.i18n.localize('SWADE.EffectCallbacks.Shaken.Question');
      const data: foundry.applications.api.DialogV2.Configuration = {
        window: {
          title: game.i18n.format('SWADE.EffectCallbacks.Shaken.Title', {
            name: effect.parent?.name,
          }),
        },
        content: `<p>${content}</p>`,
        buttons,
        default: 'roll',
        close: async () => {
          if (!processed) {
            await effect.resetDuration();
            resolve();
          }
        },
        render: (_ev, dialog: foundry.applications.api.DialogV2) => {
          const html = dialog.element;
          const button = html.querySelector('button[data-action="benny"]');
          const gmButton = html.querySelector('button[data-action="gmBenny"]');
          const gmHasNoBennies = game.user?.isGM && game.user.bennies <= 0;
          const characterHasNoBennies =
            effect.parent instanceof SwadeActor && effect.parent.bennies <= 0;
          if (characterHasNoBennies && button) button.disabled = true;
          if (gmHasNoBennies && gmButton) gmButton.disabled = true;
        },
        classes: ['dialog', 'dialog-buttons-column', 'swade-app'],
      };
      foundry.applications.api.DialogV2.wait(data);
    });
    if (acceptedResult) return;
  }
}

async function removeStunned(effect: SwadeActiveEffect) {
  const parent = effect.parent;
  if (!(parent instanceof SwadeActor)) return;
  const flavour = game.i18n.localize('SWADE.EffectCallbacks.Stunned.Title');
  const roll = await parent.rollAttribute('vigor', {
    title: flavour,
    flavour,
    additionalMods: [
      {
        label: game.i18n.localize(
          'SWADE.EffectCallbacks.Stunned.UnStunModifier',
        ),
        value: parent.system.attributes.vigor.unStunBonus,
      },
    ],
  });
  const result = roll?.successes ?? constants.ROLL_RESULT.FAIL;
  //no roll or failed
  if (result < constants.ROLL_RESULT.SUCCESS) {
    ui.notifications.info('SWADE.EffectCallbacks.Stunned.Fail', {
      localize: true,
    });
    return;
  }
  //normal success, still vulnerable
  if (result === constants.ROLL_RESULT.SUCCESS) {
    await effect.delete();
    ui.notifications.info('SWADE.EffectCallbacks.Stunned.Success', {
      localize: true,
    });
    return;
  }

  if (result >= constants.ROLL_RESULT.RAISE) {
    await effect.delete();
    ui.notifications.info('SWADE.EffectCallbacks.Stunned.Raise', {
      localize: true,
    });
    return;
  }
}

async function bleedOut(effect: SwadeActiveEffect) {
  const parent = effect.parent;
  if (!(parent instanceof SwadeActor)) return;

  const flavor = game.i18n.localize('SWADE.EffectCallbacks.BleedingOut.Title');
  const roll = await parent.rollAttribute('vigor', {
    title: flavor,
    flavour: flavor,
    additionalMods: [
      {
        label: game.i18n.localize(
          'SWADE.EffectCallbacks.BleedingOut.BleedOutModifier',
        ),
        value: parent.system.attributes.vigor.bleedOut.modifier,
      },
    ],
    ignoreWounds: parent.system.attributes.vigor.bleedOut.ignoreWounds,
  });
  const result = roll?.successes ?? constants.ROLL_RESULT.FAIL;
  //death
  if (result < constants.ROLL_RESULT.SUCCESS) {
    //delete existing temporary effects so that they don't interfere
    const toDelete = parent.effects
      .filter((e) => e.isTemporary)
      .map((e) => e.id!);
    await parent.deleteEmbeddedDocuments('ActiveEffect', toDelete);

    //set overlay
    await parent.toggleActiveEffect(CONFIG.specialStatusEffects.DEFEATED, {
      overlay: true,
    });

    //mark combatant defeated in turn tracker
    const tokens = parent.getActiveTokens();
    const toUpdate = new Array<Record<string, unknown>>();
    for (const token of tokens) {
      if (!token.combatant) continue;
      toUpdate.push({ _id: token.combatant.id, defeated: true });
    }
    if (toUpdate.length) {
      await game.combat?.updateEmbeddedDocuments('Combatant', toUpdate);
    }
    ui.notifications.info('SWADE.EffectCallbacks.BleedingOut.Fail', {
      localize: true,
    });
    return;
  }
  //hanging on
  if (result === constants.ROLL_RESULT.SUCCESS) {
    ui.notifications.info('SWADE.EffectCallbacks.BleedingOut.Success', {
      localize: true,
    });
    return;
  }

  //stabilizing
  if (result >= constants.ROLL_RESULT.RAISE) {
    await effect.delete();
    ui.notifications.info('SWADE.EffectCallbacks.BleedingOut.Raise', {
      localize: true,
    });
    return;
  }
}
