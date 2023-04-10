import { StatusEffect } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import type SwadeActor from '../documents/actor/SwadeActor';
import type SwadeChatMessage from '../documents/chat/SwadeChatMessage';
import { DamageRoll } from '../dice/DamageRoll';

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
  const damage = roll.total ?? 0;
  const ap = roll.ap;
  // For each token controlled...
  for (const token of controlledTokens) {
    // Get the actor from the token data.
    const actor = token.actor!;
    // Get the player who is controlling the character.
    const characterPlayer = game.users?.find(
      (u) => u.character?.id === actor?.id,
    );
    // Trigger calculation of Wounds
    calcWounds(actor.uuid, damage, ap);
  }
}

// Function for translating damage to Wounds.
export async function calcWounds(
  targetUuid: string,
  damage: number,
  ap: number,
) {
  // Get the target of the damage.
  const target = (await fromUuid(targetUuid)) as SwadeActor | TokenDocument;
  // If the target document is a Token, change the actor value to target.actor, otherwise use the target document itself.
  const actor: SwadeActor =
    target?.documentName === 'Token' ? target?.actor! : target;
  // Get Toughness values.
  let armor = 0;
  let value = 0;
  // If it's not a vehicle
  if (actor.type !== 'vehicle') {
    // Get the values from the stats child object.
    armor = Number(actor.system.stats.toughness.armor);
    value = Number(actor.system.stats.toughness.value);
  } else if (actor.type === 'vehicle') {
    // If the Actor is a vehicle, get the values from the system object.
    armor = Number(actor.system.toughness.armor);
    value = Number(actor.system.toughness.total);
  }
  // AP vs Armor
  const apNeg = Math.min(ap, armor);
  // Calculate Toughness after subtracting AP.
  const newT = value - apNeg;
  // Calculate how much the damage is over the relative Toughness.
  const excess = damage - newT;
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
    statusToApply = Status.NONE;
    // If already shaken, set status to wounded and wounds inflicted to 1.
    if (actor.system.status.isShaken && woundsInflicted === 0) {
      woundsInflicted = 1;
      statusToApply = Status.WOUNDED;
    }
    // If damage is at least a raise over Toughness, set status to wounded
  } else if (excess >= 4) {
    statusToApply = Status.WOUNDED;
  }

  // Trigger Soak prompt.
  await soakPrompt(
    actor,
    damage,
    ap,
    woundsInflicted,
    statusToApply,
  );
}

// Function for prompting to Soak.
async function soakPrompt(
  actor: SwadeActor,
  damage: number,
  ap: number,
  woundsInflicted: number,
  statusToApply: Status,
) {
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
      name: actor.name,
      wounds: woundsText,
    },
  );

  // Create a title and prompt variable to be assigned later.
  let title = '';
  let prompt = '';

  // Create a collection of buttons with an adjust button included by default.
  const buttons: Record<string, Dialog.Button> = {
    adjust: {
      label: game.i18n.localize(
        'SWADE.DamageApplicator.SoakDialog.AdjustDamage',
      ),
      icon: '<i class="fas fa-plus-minus"></i>',
      callback: async (html: JQuery<HTMLElement>) => {
        const damage = Number(html.find('#damage').val());
        const ap = Number(html.find('#ap').val());
        // Calculate the Wounds.
        await calcWounds(actor.uuid, damage, ap);
      },
    },
    take: {
      label: game.i18n.format(
        'SWADE.DamageApplicator.SoakDialog.TakeWounds',
        { wounds: woundsText },
      ),
      icon: '<i class="fas fa-droplet"></i>',
      callback: async () => {
        const existingWounds = actor.system.wounds.value;
        const maxWounds = actor.system.wounds.max;
        const totalWounds = existingWounds + woundsInflicted;
        const newWoundsValue =
          totalWounds < maxWounds ? totalWounds : maxWounds;
        let message = game.i18n.format(
          'SWADE.DamageApplicator.Result.IsShakenWithWounds',
          {
            name: actor.name,
            wounds: woundsText,
          },
        );
        await actor.update({ 'system.wounds.value': newWoundsValue });
        if (totalWounds > maxWounds) {
          await applyIncapacitated(actor);
          message = game.i18n.format(
            'SWADE.DamageApplicator.Result.IsIncapacitated',
            {
              name: actor.name,
            },
          );
        } else {
          await applyShaken(actor);
        }
        await ChatMessage.create({ content: message });
        if (
          actor.type !== 'vehicle' &&
          game.settings.get('swade', 'grittyDamage')
        ) {
          await rollInjuryTable();
        }
      },
    },
    applyShaken: {
      label: game.i18n.format(
        'SWADE.DamageApplicator.SoakDialog.ApplyShaken',
      ),
      icon: '<i class="fas fa-face-hushed"></i>',
      callback: async (_html) => {
        message = game.i18n.format('SWADE.DamageApplicator.Result.IsShaken', {
          name: actor.name,
        });

        // Apply Shaken Status Effect.
        await applyShaken(actor);
        // Output chat message.
        await ChatMessage.create({ content: message });
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
              name: actor.name,
            },
          ),
        });
      },
    },
    soakBenny: {
      label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.Benny'),
      icon: '<i class="fas fa-droplet-slash"></i>',
      callback: async () => {
        actor.spendBenny();
        await attemptSoak(actor, woundsInflicted, statusToApply, woundsText);
      },
    },
    soakGmBenny: {
      label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.GMBenny'),
      icon: '<i class="fas fa-droplet-slash"></i>',
      callback: async () => {
        game.user?.spendBenny();
        await attemptSoak(actor, woundsInflicted, statusToApply, woundsText);
      },
    },
    soakFree: {
      label: game.i18n.localize('SWADE.DamageApplicator.SoakDialog.Free'),
      icon: '<i class="fas fa-droplet-slash"></i>',
      callback: async () => {
        await attemptSoak(actor, woundsInflicted, statusToApply, woundsText);
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
      { name: actor.name },
    );

    // If the status is Shaken...
    if (statusToApply === Status.SHAKEN) {
      // Delete general accept button.
      delete buttons.accept;

      // Set the prompt text.
      prompt = game.i18n.format(
        'SWADE.DamageApplicator.SoakDialog.ShakenPrompt',
        { name: actor.name },
      );
      // Set the default button to Apply Shaken
      defaultButton = 'applyShaken';
    } else if (statusToApply === Status.NONE) {
      // Delete Apply Shaken Button
      delete buttons.applyShaken;

      // If there is no damage applied at all, change prompt to unharmed.
      prompt = game.i18n.format(
        'SWADE.DamageApplicator.SoakDialog.UnharmedPrompt',
        { name: actor.name },
      );
      defaultButton = 'accept';
    }
  } else {
    // In all other circumstances, set the title to Wounded title.
    title = game.i18n.format(
      'SWADE.DamageApplicator.SoakDialog.WoundedTitle',
      { name: actor.name },
    );
    // Set the prompt text to Wounded text
    prompt = game.i18n.format(
      'SWADE.DamageApplicator.SoakDialog.WoundedPrompt',
      { name: actor.name, wounds: woundsText },
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
      name: actor?.name,
    }),
  );
  const content = await renderTemplate(
    'systems/swade/templates/apps/damage/soak.hbs',
    { ap, damage, adjustDamage, prompt: new Handlebars.SafeString(prompt) },
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
  bestSoakAttempt = 0,
) {
  // TODO: Figure out how to delay the results message until after the DSN roll animation completes.
  // Roll Vigor and get the data.
  const vigorRoll = await actor.rollAttribute('vigor');
  //TODO figure out what to do if the roll is null i.e. cancelled
  let message = '';
  // Calculate how many Wounds have been Soaked with the roll
  const woundsSoaked = Math.floor(vigorRoll.total / 4);
  // Get the number of current Wounds the Actor has.
  const existingWounds = actor.system.wounds.value;
  // Get the maximum amount of Wounds the Actor can suffer before Incapacitation.
  const maxWounds = actor.system.wounds.max;
  // Calculate how many Wounds are remaining after Soaking.
  let woundsRemaining = woundsInflicted - woundsSoaked;
  // If there are no remaining Wounds, output message that they Soaked all the Wounds.
  if (woundsRemaining <= 0) {
    message = game.i18n.format('SWADE.DamageApplicator.Result.SoakedAll', {
      name: actor.name,
    });
    await ChatMessage.create({ content: message });
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
    const buttons: Record<string, Dialog.Button> = {
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
            newWoundsValue > 1 || newWoundsValue === 0
              ? game.i18n.localize('SWADE.Wounds')
              : game.i18n.localize('SWADE.Wound')
          }`;
          // If Shaken, apply it
          if (statusToApply === Status.SHAKEN) {
            await applyShaken(actor);
            // If Actor is already Shaken, change status to wounded.
            if (actor.system.status.isShaken) {
              statusToApply = Status.WOUNDED;
            } else {
              // Set message to indicate they are now Shaken.
              message = game.i18n.format(
                'SWADE.DamageApplicator.Result.IsShaken',
                {
                  name: actor.name,
                },
              );
            }
          }
          // If status is wounded
          if (statusToApply === Status.WOUNDED) {
            // Update Wounds on the Actor
            await actor.update({
              'system.wounds.value': newWoundsValue,
            });
            // Change message to Shaken with Wounds
            message = game.i18n.format(
              'SWADE.DamageApplicator.Result.IsShakenWithWounds',
              {
                name: actor.name,
                wounds: newWoundsValueText,
              },
            );
            // Apply status effects based on Shaken or Incapacitated.
            if (totalWounds > maxWounds) {
              // If their total Wounds is greater than their max Wounds, apply Status Effects: Incapacitated.
              await applyIncapacitated(actor);
              message = game.i18n.format(
                'SWADE.DamageApplicator.Result.IsIncapacitated',
                {
                  name: actor.name,
                },
              );
              await ChatMessage.create({ content: message });
            } else {
              // If their total Wounds not greater than their max Wounds, apply Status Effects: Shaken.
              await applyShaken(actor);
              message = game.i18n.format(
                'SWADE.DamageApplicator.Result.IsShakenWithWounds',
                {
                  name: actor.name,
                  wounds: newWoundsValueText,
                },
              );
            }
            // Output Chat Message.
            await ChatMessage.create({ content: message });
            // If Gritty Damage is in play, roll on the Injury Table.
            if (
              actor.type !== 'vehicle' &&
              game.settings.get('swade', 'grittyDamage')
            ) {
              await rollInjuryTable();
            }
          }
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
            woundsRemaining,
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
            woundsRemaining,
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
    // Create and render Dialog.
    new Dialog(
      {
        title: game.i18n.format(
          'SWADE.DamageApplicator.RerollSoakDialog.Title',
          {
            name: actor.name,
          },
        ),
        content: game.i18n.format(
          'SWADE.DamageApplicator.RerollSoakDialog.Prompt',
          {
            name: actor.name,
            wounds: woundsRemainingText,
          },
        ),
        buttons: buttons,
        default: 'take',
      },
      { classes: appCssClasses },
    ).render(true);
  }
}

// Function for applying Shaken Status Effect
async function applyShaken(actor: SwadeActor) {
  // Check if they are already Shaken.
  const isShaken = actor.system.status.isShaken;
  // If they're not already Shaken, apply the Status Effect.
  if (!isShaken) {
    const data = CONFIG.SWADE.statusEffects.find(
      (s) => s.id === 'shaken',
    ) as StatusEffect;
    await actor.toggleActiveEffect(data, { active: true });
  }
}

// Function for applying the Incapacitated Status Effect
async function applyIncapacitated(actor: SwadeActor) {
  // Check if they're already Incapacitated; we don't need to add another instance if so.
  const isIncapacitated = actor.effects.find((e) => e.name === game.i18n.format('SWADE.Incap'));
  // If there is not such Status Effect, then apply it.
  if (isIncapacitated === undefined) {
    const data = CONFIG.SWADE.statusEffects.find(
      (s) => s.id === 'incapacitated',
    );
    // If there's an Status Effect data for Incapacitated.
    if (data)
      await actor.toggleActiveEffect(data, { active: true, overlay: true });
  }
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
