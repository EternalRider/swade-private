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
  await new Promise((resolve) => {
    let roll: TraitRoll | null = null;
    let processed = false;
    const buttons: Record<string, Dialog.Button> = {
      roll: {
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
          }
          resolve(roll);
        },
      },
      benny: {
        label: game.i18n.localize('SWADE.BenniesSpend'),
        icon: '<i class="fas fa-coins"></i>',
        callback: async () => {
          processed = true;
          const parent = effect.parent;
          if (!(parent instanceof SwadeActor)) return;
          await parent?.spendBenny();
          await effect.delete();
          resolve(roll);
        },
      },
      gmBenny: {
        label: game.i18n.localize('SWADE.BenniesSpendGM'),
        icon: '<i class="fas fa-coins"></i>',
        callback: async () => {
          processed = true;
          const parent = effect.parent;
          if (!(parent instanceof SwadeActor)) return;
          await game.user?.spendBenny();
          await effect.delete();
          resolve(roll);
        },
      },
    };

    if (!game.user?.isGM) delete buttons.gmBenny;

    const content = game.i18n.localize('SWADE.EffectCallbacks.Shaken.Question');
    const data: Dialog.Data = {
      title: game.i18n.format('SWADE.EffectCallbacks.Shaken.Title', {
        name: effect.parent?.name,
      }),
      content: `<p><${content}/p>`,
      buttons,
      default: 'roll',
      close: async () => {
        if (!processed) {
          await effect.resetDuration();
          resolve(roll);
        }
      },
      render: (html: JQuery<HTMLElement>) => {
        const button = html.find('button[data-button="benny"]');
        const gmButton = html.find('button[data-button="gmBenny"]');
        const gmHasNoBennies = game.user?.isGM && game.user.bennies <= 0;
        const characterHasNoBennies =
          effect.parent instanceof SwadeActor && effect.parent.bennies <= 0;
        if (characterHasNoBennies) button.prop('disabled', true);
        if (gmHasNoBennies) gmButton?.prop('disabled', true);
      },
    };
    const options: DialogOptions = mergeObject(Dialog.defaultOptions, {
      classes: ['dialog', 'dialog-buttons-column', 'swade-app'],
    });
    new Dialog(data, options).render(true);
  });
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
    return ui.notifications.info('SWADE.EffectCallbacks.Stunned.Fail', {
      localize: true,
    });
  }
  //normal success, still vulnerable
  if (result === constants.ROLL_RESULT.SUCCESS) {
    await effect.delete();
    return ui.notifications.info('SWADE.EffectCallbacks.Stunned.Success', {
      localize: true,
    });
  }

  if (result >= constants.ROLL_RESULT.RAISE) {
    await effect.delete();
    return ui.notifications.info('SWADE.EffectCallbacks.Stunned.Raise', {
      localize: true,
    });
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
    return ui.notifications.info('SWADE.EffectCallbacks.BleedingOut.Fail', {
      localize: true,
    });
  }
  //hanging on
  if (result === constants.ROLL_RESULT.SUCCESS) {
    return ui.notifications.info('SWADE.EffectCallbacks.BleedingOut.Success', {
      localize: true,
    });
  }

  //stabilizing
  if (result >= constants.ROLL_RESULT.RAISE) {
    await effect.delete();
    return ui.notifications.info('SWADE.EffectCallbacks.BleedingOut.Raise', {
      localize: true,
    });
  }
}
