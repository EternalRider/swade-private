import { RollModifier } from '../../interfaces/additional.interface';
import { constants } from '../constants';
import { VehicleData } from '../data/actor/vehicle';
import { DamageRoll } from '../dice/DamageRoll';
import SwadeUser from '../documents/SwadeUser';
import SwadeActor from '../documents/actor/SwadeActor';
import type SwadeChatMessage from '../documents/chat/SwadeChatMessage';
import { getStatusEffectDataById } from '../util';

// Create string variable for the SWADE CSS class for App Windows.
const appCssClasses = ['swade-app'];

export async function damageApplicator(message: SwadeChatMessage) {
  // Get a significant roll from the chat message.
  const roll = message.significantRoll;
  // If there's not a significant roll  or it's not a damage roll, return.
  if (!roll || !(roll instanceof DamageRoll)) return;
  // Collect the user's controlled tokens.
  const controlledTokens = game?.canvas?.tokens?.controlled;
  // If there are not any controlled tokens, issue a warning.
  if (!controlledTokens?.length) {
    // If no targets selected, issue warning notification.
    return ui.notifications.warn('SWADE.DamageApplicator.NoTargetsSelected', {
      localize: true,
    });
  }

  // Get the damage and ap from the roll data
  const damageContext: DamageContext = {
    isHeavyWeapon: roll.isHeavyWeapon,
    status: Status.NONE,
    wounds: {
      applied: 0,
      taken: 0,
      soaked: 0,
    },
    damage: {
      total: roll.total ?? 0,
      ap: roll.ap ?? 0,
    },
  };

  // For each token controlled...
  for (const token of controlledTokens) {
    // Get the actor from the token data.
    const actor = token.actor!;
    // Trigger calculation of Wounds
    calcWounds(actor.uuid, damageContext);
  }
}

// Function for translating damage to Wounds.
export async function calcWounds(
  targetUuid: string,
  damageContext: DamageContext,
) {
  const actor = await fromUuid(targetUuid);

  if (!(actor instanceof SwadeActor)) return;
  // Get Toughness values.
  let armor = 0;
  let value = 0;
  // If it's not a vehicle
  if (!(actor.system instanceof VehicleData)) {
    // Get the values from the stats child object.
    armor = Number(actor.system.stats.toughness.armor);
    value = Number(actor.system.stats.toughness.value);
  } else if (actor.system instanceof VehicleData) {
    // If the Actor is a vehicle, get the values from the system object.
    armor = Number(actor.system.toughness.armor);
    value = Number(actor.system.toughness.total);
  }
  // AP vs Armor
  const apNeg = Math.min(damageContext.damage.ap, armor);
  // Calculate Toughness after subtracting AP.
  const newT = value - apNeg;
  // Calculate how much the damage is over the relative Toughness.
  // Doesn't use DamageRoll.successes because of the need to adjust damage
  const excess = damageContext.damage.total - newT;
  // Translate damage raises to Wounds.
  let woundsInflicted = Math.floor(excess / 4);
  // Check if Wound Cap is in play.
  const woundCap = game.settings.get('swade', 'woundCap');
  // If Wound Cap, limit Wounds inflicted (i.e. Wounds to Soak) to 4
  if (woundCap && woundsInflicted > 4) {
    woundsInflicted = 4;
  }
  // Set default status to apply as none.
  let statusToApply = Status.NONE;
  // If damage meets or beats Toughness without a raise.
  if (excess >= 0 && excess < 4) {
    // Set status to Shaken.
    statusToApply = Status.SHAKEN;
    // If already shaken, set status to wounded and wounds inflicted to 1.
    if (
      // @ts-expect-error isShaken is undefined, which is falsy and works fine
      actor.system.status.isShaken &&
      woundsInflicted === 0 &&
      !actor.getFlag('swade', 'hardy')
    ) {
      woundsInflicted = 1;
      statusToApply = Status.WOUNDED;
      damageContext.doubleShaken = true;
    }
    // If damage is at least a raise over Toughness, set status to wounded
  } else if (excess >= 4) {
    statusToApply = Status.WOUNDED;
  }

  /**
   * A hook event that is fired before wounds are calculated
   * Returning `false` in a hook callback will cancel the workflow entirely
   * @category Hooks
   * @since 3.3.0
   * @param {SwadeActor} actor              The actor that is being damaged
   * @param {DamageContext} damageContext   The damage context
   * @param {number} woundsInflicted        The amount of wounds that will be inflicted
   * @param {Status} statusToApply          The resulting status that would be applied
   */
  const permit = Hooks.call(
    'swadePreCalcWounds',
    actor,
    damageContext,
    woundsInflicted,
    statusToApply,
  );

  if (permit !== false) {
    // Trigger Soak prompt.
    await soakPrompt(actor, damageContext, woundsInflicted, statusToApply);
  }
}

// Function for prompting to Soak.
async function soakPrompt(
  actor: SwadeActor,
  damageContext: DamageContext,
  woundsInflicted: number,
  statusToApply: Status,
) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const name = speaker.alias;

  // Set singular Wound or plural Wounds for chat message
  const woundsText = `${woundsInflicted} ${
    woundsInflicted > 1
      ? game.i18n.localize('SWADE.Wounds')
      : game.i18n.localize('SWADE.Wound')
  }`;
  // Text for Wounds about to be taken.
  let message = game.i18n.format(
    'SWADE.DamageApplicator.WoundsAboutToBeTaken',
    {
      name: name,
      wounds: woundsText,
    },
  );

  // Create a title and prompt variable to be assigned later.
  let title = '';
  let prompt = '';

  // Create a collection of buttons with an adjust button included by default.
  const buttons: Record<string, DialogButton> = {
    adjust: {
      label: game.i18n.localize(
        'SWADE.DamageApplicator.SoakDialog.AdjustDamage',
      ),
      icon: '<i class="fas fa-plus-minus"></i>',
      callback: async (html: JQuery<HTMLElement>) => {
        damageContext.damage.ap = Number(html.find('#ap').val());
        damageContext.damage.total = Number(html.find('#damage').val());
        // Calculate the Wounds.
        await calcWounds(actor.uuid, damageContext);
      },
    },
    take: {
      label: game.i18n.format('SWADE.DamageApplicator.SoakDialog.TakeWounds', {
        wounds: woundsText,
      }),
      icon: '<i class="fas fa-droplet"></i>',
      callback: async () => {
        const existingWounds = actor.system.wounds.value;
        const maxWounds = actor.system.wounds.max;
        const totalWounds = existingWounds + woundsInflicted;
        const newWoundsValue =
          totalWounds < maxWounds ? totalWounds : maxWounds;
        await actor.update({ 'system.wounds.value': newWoundsValue });
        if (totalWounds > maxWounds) {
          await applyIncapacitated(actor);
        } else {
          await applyShaken(actor);
          await ChatMessage.create({
            content: game.i18n.format(
              'SWADE.DamageApplicator.Result.IsShakenWithWounds',
              {
                name: name,
                wounds: woundsText,
              },
            ),
            speaker: speaker,
          });
        }
        if (
          actor.isWildcard &&
          game.settings.get('swade', 'grittyDamage') &&
          !damageContext.doubleShaken
        ) {
          await rollInjuryTable();
        }
        /**
         * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
         * @category Hooks
         * @param {SwadeActor} actor            The actor taking the damage
         * @param {DamageContext} damageContext Additional information people calling the hook might need
         */
        damageContext.status = statusToApply;
        damageContext.wounds.applied = woundsInflicted;
        damageContext.wounds.taken = totalWounds - existingWounds;

        Hooks.call('swadeTakeDamage', actor, damageContext);
      },
    },
    applyShaken: {
      label: game.i18n.format('SWADE.DamageApplicator.SoakDialog.ApplyShaken'),
      icon: '<i class="fas fa-face-hushed"></i>',
      callback: async (_html) => {
        message = game.i18n.format('SWADE.DamageApplicator.Result.IsShaken', {
          name: name,
        });

        // Apply Shaken Status Effect.
        await applyShaken(actor);
        // Output chat message.
        await ChatMessage.create({ content: message, speaker: speaker });

        /**
         * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
         * @category Hooks
         * @param {SwadeActor} actor            The actor taking the damage
         * @param {DamageContext} damageContext Additional information people calling the hook might need
         */

        damageContext.status = statusToApply;

        Hooks.call('swadeTakeDamage', actor, damageContext);
      },
    },
    accept: {
      label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.Accept'),
      icon: '<i class="fas fa-check"></i>',
      callback: async () => {
        await ChatMessage.create({
          content: game.i18n.format(
            'SWADE.DamageApplicator.Result.NoSignificantDamage',
            {
              name: name,
            },
          ),
          speaker: speaker,
        });

        /**
         * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
         * @category Hooks
         * @param {SwadeActor} actor            The actor taking the damage
         * @param {DamageContext} damageContext Additional information people calling the hook might need
         */

        damageContext.status = statusToApply;

        Hooks.call('swadeTakeDamage', actor, damageContext);
      },
    },
    soakBenny: {
      label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.Benny'),
      icon: '<i class="fas fa-droplet-slash"></i>',
      callback: async () => {
        actor.spendBenny();
        await attemptSoak(
          actor,
          woundsInflicted,
          statusToApply,
          woundsText,
          damageContext,
        );
      },
    },
    soakGmBenny: {
      label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.GMBenny'),
      icon: '<i class="fas fa-droplet-slash"></i>',
      callback: async () => {
        game.user?.spendBenny();
        await attemptSoak(
          actor,
          woundsInflicted,
          statusToApply,
          woundsText,
          damageContext,
        );
      },
    },
    soakFree: {
      label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.Free'),
      icon: '<i class="fas fa-droplet-slash"></i>',
      callback: async () => {
        await attemptSoak(
          actor,
          woundsInflicted,
          statusToApply,
          woundsText,
          damageContext,
        );
      },
    },
  };

  // Is the Actor a Wild Card out of Bennies?
  const actorHasBennies = actor.isWildcard && actor.bennies > 0;
  // Is the User a GM?
  const isGM = game.user?.isGM;
  // Is the GM out of Bennies?
  const gmHasBennies = isGM && game?.user?.bennies && game.user.bennies > 0;
  // Create the default button variable because this will be conditional.
  let defaultButton = '';

  // If status is not Wounded...
  if (statusToApply !== Status.WOUNDED) {
    // Delete Soak and Take Wounds buttons.
    delete buttons.take;
    delete buttons.soakBenny;
    delete buttons.soakGmBenny;
    delete buttons.soakFree;

    // Set the title
    title = game.i18n.format(
      'SWADE.DamageApplicator.SoakDialog.UnwoundedTitle',
      { name: name },
    );

    // If the status is Shaken...
    if (statusToApply === Status.SHAKEN) {
      // Delete general accept button.
      delete buttons.accept;

      // Set the prompt text.
      prompt = game.i18n.format(
        'SWADE.DamageApplicator.SoakDialog.ShakenPrompt',
        { name: name },
      );
      // Set the default button to Apply Shaken
      defaultButton = 'applyShaken';
    } else if (statusToApply === Status.NONE) {
      // Delete Apply Shaken Button
      delete buttons.applyShaken;

      // If there is no damage applied at all, change prompt to unharmed.
      prompt = game.i18n.format(
        'SWADE.DamageApplicator.SoakDialog.UnharmedPrompt',
        { name: name },
      );
      defaultButton = 'accept';
    }
  } else {
    // In all other circumstances, set the title to Wounded title.
    title = game.i18n.format('SWADE.DamageApplicator.SoakDialog.WoundedTitle', {
      name: name,
    });
    // Set the prompt text to Wounded text
    prompt = game.i18n.format(
      'SWADE.DamageApplicator.SoakDialog.WoundedPrompt',
      { name: name, wounds: woundsText },
    );

    // Since status to apply is Wounded delete Apply Shaken and Accept buttons
    delete buttons.applyShaken;
    delete buttons.accept;
    // If the Actor does not have Bennies, delete the button for spending Actor Bennies
    if (!actorHasBennies) delete buttons.soakBenny;
    // If the user is a GM and does not have Bennies, delete the button for spending GM Bennies.
    if (!gmHasBennies) delete buttons.soakGmBenny;

    // Set default button to take the Wounds.
    defaultButton = 'take';
  }
  // Construct the Dialog and render it.
  const adjustDamage = new Handlebars.SafeString(
    game.i18n.format('SWADE.DamageApplicator.AdjustDamagePrompt', {
      name: name,
    }),
  );
  const content = await renderTemplate(
    'systems/swade/templates/apps/damage/soak.hbs',
    { damageContext, adjustDamage, prompt: new Handlebars.SafeString(prompt) },
  );
  new Dialog(
    {
      title: title,
      content: content,
      buttons: buttons,
      default: defaultButton,
    },
    { height: 'auto', classes: appCssClasses },
  ).render(true);
}

// Function to roll for Soaking Wounds.
async function attemptSoak(
  actor: SwadeActor,
  woundsInflicted: number,
  statusToApply: Status,
  woundsText: string,
  damageContext: DamageContext,
  bestSoakAttempt: number = 0,
  options?: {
    reroll?: boolean;
  },
) {
  if (actor.system instanceof VehicleData) {
    // No handling for vehicle soaks... yet
    return ui.notifications.warn(
      'SWADE.DamageApplicator.SoakDialog.NoVehicleSoak',
      {
        localize: true,
      },
    );
  }
  const soakModifiers: RollModifier[] = [
    {
      label: game.i18n.localize('SWADE.DamageApplicator.SoakModifier'),
      value: actor.system.attributes.vigor.soakBonus,
    },
  ];
  if (game.settings.get('swade', 'unarmoredHero') && actor.isUnarmored) {
    soakModifiers.push({
      label: game.i18n.localize('SWADE.Settings.UnarmoredHero.Name'),
      value: 2,
    });
  }
  if (options?.reroll) {
    soakModifiers.push(...actor.system.stats.globalMods.bennyTrait);
  }
  // Roll Vigor and get the data.
  const vigorRoll = await actor.rollAttribute('vigor', {
    title: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.SoakRoll'),
    flavour: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.SoakRoll'),
    additionalMods: soakModifiers,
    isRerollable: false,
  });

  if (game.dice3d) {
    game.dice3d
      .waitFor3DAnimationByMessageID(vigorRoll?.messageId)
      .then(() => applySoak());
  } else {
    applySoak();
  }

  async function applySoak() {
    const speaker = ChatMessage.getSpeaker({ actor });
    const name = speaker.alias;

    let message = '';
    // Calculate how many Wounds have been Soaked with the roll
    const woundsSoaked = vigorRoll?.successes ?? 0;
    // Get the number of current Wounds the Actor has.
    const existingWounds = actor.system.wounds.value;
    // Get the maximum amount of Wounds the Actor can suffer before Incapacitation.
    const maxWounds = actor.system.wounds.max;
    // Calculate how many Wounds are remaining after Soaking.
    let woundsRemaining = woundsInflicted - woundsSoaked;
    // If there are no remaining Wounds, output message that they Soaked all the Wounds.
    if (woundsRemaining <= 0) {
      statusToApply = Status.NONE;
      message = game.i18n.format('SWADE.DamageApplicator.Result.SoakedAll', {
        name: name,
      });
      await ChatMessage.create({ content: message, speaker: speaker });

      const isShaken = actor.system.status.isShaken;
      // If they're already Shaken, remove the Status Effect.
      if (isShaken) await actor.toggleActiveEffect('shaken', { active: false });

      /**
       * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
       * @category Hooks
       * @param {SwadeActor} actor            The actor taking the damage
       * @param {DamageContext} damageContext Additional information people calling the hook might need
       */
      damageContext.status = statusToApply;
      damageContext.wounds.soaked = woundsSoaked;

      Hooks.call('swadeTakeDamage', actor, damageContext);
    } else {
      // Otherwise, calculate how many Wounds the Actor now has.
      const totalWounds = existingWounds + woundsRemaining;
      // Set the Wounds, but if it's beyond the maximum, set it to the maximum.
      const newWoundsValue = totalWounds < maxWounds ? totalWounds : maxWounds;
      if (bestSoakAttempt !== 0 && woundsRemaining > bestSoakAttempt) {
        // If they already attempted to Soak, set Wounds remaining to whatever their best roll yielded so far.
        woundsRemaining = bestSoakAttempt;
      }
      // Construct text for number of Wounds remaining.
      const woundsRemainingText = `${woundsRemaining} ${
        woundsRemaining > 1 || woundsRemaining === 0
          ? game.i18n.localize('SWADE.Wounds')
          : game.i18n.localize('SWADE.Wound')
      }`;

      // Build default buttons
      const buttons: Record<string, DialogButton> = {
        take: {
          label: game.i18n.format(
            'SWADE.DamageApplicator.RerollSoakDialog.TakeWounds',
            {
              wounds: woundsRemainingText,
            },
          ),
          icon: '<i class="fas fa-droplet"></i>',
          callback: async () => {
            // Construct text for the new Wounds value to be accepted (singular or plural Wounds).
            const newWoundsValueText = `${newWoundsValue} ${
              newWoundsValue > 1 || newWoundsValue === 0 // newWoundsValue should never be zero here
                ? game.i18n.localize('SWADE.Wounds')
                : game.i18n.localize('SWADE.Wound')
            }`;
            // Update Wounds on the Actor
            await actor.update({
              'system.wounds.value': newWoundsValue,
            });
            // Apply status effects based on Shaken or Incapacitated.
            if (totalWounds > maxWounds) {
              // If their total Wounds is greater than their max Wounds, apply Status Effects: Incapacitated.
              await applyIncapacitated(actor);
            } else {
              // If their total Wounds not greater than their max Wounds, apply Status Effects: Shaken.
              await applyShaken(actor);
              message = game.i18n.format(
                'SWADE.DamageApplicator.Result.IsShakenWithWounds',
                {
                  name: name,
                  wounds: newWoundsValueText,
                },
              );
            }
            // Output Chat Message.
            if (message) {
              await ChatMessage.create({ content: message, speaker: speaker });
            }

            // If Gritty Damage is in play, roll on the Injury Table.
            if (
              actor.isWildcard &&
              game.settings.get('swade', 'grittyDamage') &&
              !damageContext.doubleShaken
            ) {
              await rollInjuryTable();
            }

            /**
             * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
             * @category Hooks
             * @param {SwadeActor} actor            The actor taking the damage
             * @param {DamageContext} damageContext Additional information people calling the hook might need
             */
            damageContext.status = statusToApply;
            damageContext.wounds.applied = woundsRemaining;
            damageContext.wounds.taken = newWoundsValue - existingWounds;
            damageContext.wounds.soaked = Math.min(
              woundsSoaked,
              woundsInflicted,
            );

            Hooks.call('swadeTakeDamage', actor, damageContext);
          },
        },
        rerollBenny: {
          label: game.i18n.localize(
            'SWADE.DamageApplicator.RerollSoakDialog.Benny',
          ),
          icon: '<i class="fas fa-dice"></i>',
          callback: async () => {
            actor.spendBenny();
            await attemptSoak(
              actor,
              woundsInflicted,
              statusToApply,
              woundsText,
              damageContext,
              woundsRemaining,
              { reroll: true },
            );
          },
        },
        rerollGmBenny: {
          label: game.i18n.localize(
            'SWADE.DamageApplicator.RerollSoakDialog.GMBenny',
          ),
          icon: '<i class="fas fa-dice"></i>',
          callback: async () => {
            game.user?.spendBenny();
            await attemptSoak(
              actor,
              woundsInflicted,
              statusToApply,
              woundsText,
              damageContext,
              woundsRemaining,
              { reroll: true },
            );
          },
        },
        rerollFree: {
          label: game.i18n.localize(
            'SWADE.DamageApplicator.RerollSoakDialog.Free',
          ),
          icon: '<i class="fas fa-dice"></i>',
          callback: async () => {
            await attemptSoak(
              actor,
              woundsInflicted,
              statusToApply,
              woundsText,
              damageContext,
              woundsRemaining,
            );
          },
        },
      };
      // Is the Actor a Wild Card out of Bennies?
      const actorHasBennies = actor.isWildcard && actor.bennies > 0;
      // Is the User a GM?
      const isGM = game.user?.isGM;
      // Is the GM out of Bennies?
      const gmHasBennies = isGM && game?.user?.bennies && game.user.bennies > 0;

      // If the Actor does not have Bennies, delete the button for spending Actor Bennies
      if (!actorHasBennies) delete buttons.rerollBenny;
      // If the user is a GM and does not have Bennies, delete the button for spending GM Bennies.
      if (!gmHasBennies) delete buttons.rerollGmBenny;

      let content = game.i18n.format(
        'SWADE.DamageApplicator.RerollSoakDialog.Prompt',
        {
          name: name,
          wounds: woundsRemainingText,
        },
      );

      // Crit fail check to deny rerolling soaks. Per RAW Extras can't soak,
      //  so no need to handle the confirmation die
      if (vigorRoll?.isCritfail && !game.settings.get('swade', 'dumbLuck')) {
        delete buttons.rerollBenny;
        delete buttons.rerollGmBenny;
        delete buttons.rerollFree;

        content = game.i18n.format(
          'SWADE.DamageApplicator.RerollSoakDialog.PromptCritFail',
          {
            name: name,
            wounds: woundsRemainingText,
          },
        );
      }

      // Create and render Dialog.
      new Dialog(
        {
          title: game.i18n.format(
            'SWADE.DamageApplicator.RerollSoakDialog.Title',
            {
              name: name,
            },
          ),
          content: content,
          buttons: buttons,
          default: 'take',
        },
        { classes: appCssClasses },
      ).render(true);
    }
  }
}

// Function for applying Shaken Status Effect
async function applyShaken(actor: SwadeActor) {
  if (actor.system instanceof VehicleData) return;
  // If they're not already Shaken, apply the Status Effect.
  if (!actor.system.status.isShaken) {
    await actor.toggleActiveEffect('shaken', { active: true });
  }
}

// Function for applying the Incapacitated Status Effect
async function applyIncapacitated(actor: SwadeActor) {
  const speaker = ChatMessage.getSpeaker({ actor });
  const name = speaker.alias;

  const statuses: ToggleStatus[] = [];
  const statusIncapacitated = getStatusEffectDataById('incapacitated');
  if (statusIncapacitated) {
    statuses.push({
      effectData: statusIncapacitated,
      options: { active: true, overlay: true },
    });
  }
  if (Hooks.call('swadeIncapacitation', actor, statuses) && actor.isWildcard) {
    let resistRoll: number = await resistInjury(actor);
    const ignoreBleedOut =
      game.settings.get('swade', 'heroesNeverDie') ||
      actor.getFlag('swade', 'ignoreBleedOut');
    if (ignoreBleedOut && resistRoll === constants.ROLL_RESULT.CRITFAIL)
      resistRoll = constants.ROLL_RESULT.FAIL;
    let message = '';
    const statusBleedingOut = getStatusEffectDataById('bleeding-out');
    switch (resistRoll) {
      case constants.ROLL_RESULT.CRITFAIL:
        message = game.i18n.format(
          'SWADE.DamageApplicator.Incapacitation.Dies',
          { name: name },
        );
        break;
      case constants.ROLL_RESULT.FAIL:
        await rollInjuryTable();
        message = game.i18n.format(
          ignoreBleedOut
            ? 'SWADE.DamageApplicator.Incapacitation.PermanentInjuryHND'
            : 'SWADE.DamageApplicator.Incapacitation.PermanentInjury',
          { name: name },
        );
        // If there's an Status Effect data for Bleeding Out.
        if (statusBleedingOut && !ignoreBleedOut) {
          const incapIndex = statuses.findIndex(
            (s) => s.effectData.id === 'incapacitated',
          );
          statuses[incapIndex].options.overlay = false;
          statuses.push({
            effectData: statusBleedingOut,
            options: { active: true, overlay: true },
          });
        }
        break;
      case constants.ROLL_RESULT.SUCCESS:
        await rollInjuryTable();
        message = game.i18n.format(
          'SWADE.DamageApplicator.Incapacitation.TemporaryInjury',
          { name: name },
        );
        break;
      default: // Raises
        await rollInjuryTable();
        message = game.i18n.format(
          'SWADE.DamageApplicator.Incapacitation.ShortInjury',
          { name: name },
        );
        break;
    }
    await ChatMessage.create({ content: message, speaker: speaker });
  }
  statuses.forEach((s) => {
    actor.toggleActiveEffect(s.effectData, s.options);
  });
}

async function resistInjury(
  actor: SwadeActor,
  bestRoll: number = constants.ROLL_RESULT.CRITFAIL,
): Promise<number> {
  const speaker = ChatMessage.getSpeaker({ actor });
  const name = speaker.alias;

  const vigorRoll = await actor.rollAttribute('vigor', {
    title: game.i18n.localize(
      'SWADE.DamageApplicator.Incapacitation.InjuryRoll',
    ),
    flavour: game.i18n.localize(
      'SWADE.DamageApplicator.Incapacitation.InjuryRoll',
    ),
    isRerollable: false,
  });

  const result: number = vigorRoll?.successes ?? constants.ROLL_RESULT.FAIL;

  if (result > constants.ROLL_RESULT.SUCCESS)
    return constants.ROLL_RESULT.RAISE;
  else if (result === constants.ROLL_RESULT.CRITFAIL)
    return constants.ROLL_RESULT.CRITFAIL;

  bestRoll = Math.max(bestRoll, result);

  const incapLabel: string = game.i18n.localize(
    result === constants.ROLL_RESULT.SUCCESS
      ? 'SWADE.DamageApplicator.Incapacitation.TakeSuccess'
      : 'SWADE.DamageApplicator.Incapacitation.TakeFail',
  );

  // Build default buttons
  const buttons: Record<string, DialogButton> = {
    take: {
      label: incapLabel,
      icon: '<i class="fa-solid fa-skull"></i>',
      callback: () => new Object({ reroll: false, who: null }),
    },
    rerollBenny: {
      label: game.i18n.localize(
        'SWADE.DamageApplicator.RerollSoakDialog.Benny',
      ),
      icon: '<i class="fas fa-dice"></i>',
      callback: () => new Object({ reroll: true, who: actor }),
    },
    rerollGmBenny: {
      label: game.i18n.localize(
        'SWADE.DamageApplicator.RerollSoakDialog.GMBenny',
      ),
      icon: '<i class="fas fa-dice"></i>',
      callback: () => new Object({ reroll: false, who: game.user }),
    },
    rerollFree: {
      label: game.i18n.localize('SWADE.DamageApplicator.RerollSoakDialog.Free'),
      icon: '<i class="fas fa-dice"></i>',
      callback: () => new Object({ reroll: true, who: null }),
    },
  };
  // Is the Actor a Wild Card out of Bennies?
  const actorHasBennies = actor.isWildcard && actor.bennies > 0;
  // Is the User a GM?
  const isGM = game.user?.isGM;
  // Is the GM out of Bennies?
  const gmHasBennies = isGM && game?.user?.bennies && game.user.bennies > 0;

  // If the Actor does not have Bennies, delete the button for spending Actor Bennies
  if (!actorHasBennies) delete buttons.rerollBenny;
  // If the user is a GM and does not have Bennies, delete the button for spending GM Bennies.
  if (!gmHasBennies) delete buttons.rerollGmBenny;

  // @ts-expect-error Dialog.wait is defined as of v11
  const dialogResult: RerollDialogReturn = await Dialog.wait(
    {
      title: game.i18n.format('SWADE.DamageApplicator.Incapacitation.Title', {
        name: name,
      }),
      content: game.i18n.format(
        'SWADE.DamageApplicator.Incapacitation.Prompt',
        {
          name: name,
        },
      ),
      buttons: buttons,
      default: 'take',
    },
    { classes: appCssClasses },
  );

  if (dialogResult.reroll) {
    if (dialogResult.who) dialogResult.who?.spendBenny();
    const newRoll = await resistInjury(actor, bestRoll);
    if (newRoll === constants.ROLL_RESULT.CRITFAIL) return newRoll;
    bestRoll = Math.max(newRoll, bestRoll);
  }
  return bestRoll;
}

// Function for rolling on the Injury Table.
async function rollInjuryTable() {
  // Get the Injury Table from settings.
  const injuryTable = (await fromUuid(
    game.settings.get('swade', 'injuryTable'),
  )) as RollTable;
  // If a table is found, draw from the table.
  if (injuryTable) {
    await injuryTable.draw();
  } else {
    // Issue an error if no table is selected.
    ui.notifications.error('SWADE.DamageApplicator.NoInjuryTable', {
      localize: true,
    });
  }
}

enum Status {
  NONE,
  SHAKEN,
  WOUNDED,
}

/**
 * An interface that supports the swadeTakeDamage hook
 * @category Interfaces
 */
interface DamageContext {
  /** Whether or not the damage source is flagged as a heavy weapon */
  isHeavyWeapon?: boolean;
  /** Was this a result of a second shaken result? */
  doubleShaken?: boolean;
  /** The Status inflicted by the damage */
  status?: Status;
  wounds: {
    /** The number of wounds the actor would outright take */
    applied?: number;
    /** The actual final number of wounds the actor is taking, mitigated by the actor's max wounds */
    taken?: number;
    /** The number of wounds soaked by the actor, capped by the wounds inflicted */
    soaked?: number;
  };
  damage: {
    /** Raw damage value, after adjustments */
    total: number;
    /** AP value, after adjustments */
    ap: number;
  };
}

/**
 * An interface that supports the swadeTakeDamage hook
 * @category Interfaces
 */
interface ToggleStatus {
  effectData: CONFIG.StatusEffect;
  options: {
    overlay: boolean;
    active: boolean;
  };
}

interface RerollDialogReturn {
  reroll: boolean;
  who: SwadeActor | SwadeUser;
}
