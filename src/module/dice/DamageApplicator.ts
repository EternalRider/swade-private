import { StatusEffect } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/documents/token';
import type SwadeActor from '../documents/actor/SwadeActor';
import type SwadeChatMessage from '../documents/chat/SwadeChatMessage';
import { DamageRoll } from './DamageRoll';

// Create string variable for the SWADE CSS class for App Windows.
const appCssClasses = ['swade-app'];

export async function damageApplicator(message: SwadeChatMessage) {
  // Determine whether the chat message creator is the same as the current user.
  const roll = message.significantRoll;
  // If the chat message is a damage roll and it's the same user...
  if (!roll || !(roll instanceof DamageRoll)) return;
  // Collect the user's controlled tokens
  const controlledTokens = game?.canvas?.tokens?.controlled;
  // If there are targets, get the damage and ap, and trigger the flow with the data.
  if (!controlledTokens?.length) {
    // If no targets selected, issue warning notification.
    return ui.notifications.warn('SWADE.DamageApplicator.NoTargetsSelected', {
      localize: true,
    });
  }

  const damage = roll.total ?? 0;
  const ap = roll.ap;
  // For each token targeted...
  for (const token of controlledTokens) {
    // Determine whether there are any owners that are not GMs.
    const actor = token.actor!;
    const characterPlayer = game.users?.find(
      (u) => u.character?.id === actor?.id,
    );
    let targetUserId = '';
    if (characterPlayer) targetUserId = characterPlayer.id;
    if (promptThisUser(actor, damage, ap)) {
      calcWounds(actor.uuid, damage, ap, targetUserId);
    } else {
      game.swade.sockets.calcWounds(actor?.uuid, damage, ap, targetUserId);
    }
  }
}

// Function for translating damage to Wounds.
export async function calcWounds(targetUuid, damage, ap, targetUserId) {
  const target = (await fromUuid(targetUuid)) as SwadeActor | TokenDocument;
  // If the target is a Token, change the actor value to target.actor
  const actor: SwadeActor =
    target?.documentName === 'Token' ? target?.actor! : target;
  // Get Toughness values.
  let armor = 0;
  let value = 0;
  if (actor.type !== 'vehicle') {
    armor = Number(actor.system.stats.toughness.armor);
    value = Number(actor.system.stats.toughness.value);
  } else if (actor.type === 'vehicle') {
    // If the Actor is a vehicle, get appropriate values.
    armor = Number(actor.system.toughness.armor);
    value = Number(actor.system.toughness.total);
  }
  // AP vs Armor
  const apNeg = Math.min(ap, armor);
  // New Toughness
  const newT = value - apNeg;
  // Calculate how much over.
  const excess = damage - newT;
  // Translate damage raises to Wounds.
  let woundsInflicted = Math.floor(excess / 4);
  // Check if WoundCap is in play.
  const woundCap = game.settings.get('swade', 'woundCap');
  // If Wound Cap, limit Wounds inflicted (i.e. to Soak) to 4
  if (woundCap && woundsInflicted > 4) {
    woundsInflicted = 4;
  }
  // Default status to apply as none.
  let statusToApply = 'none';
  // If damage meets Toughness without a raise.
  if (excess >= 0 && excess < 4) {
    // Set status to Shaken.
    statusToApply = 'shaken';
    // If already shaken, set status to wounded and wounds inflicted to 1.
    if (actor.system.status.isShaken && woundsInflicted === 0) {
      woundsInflicted = 1;
      statusToApply = 'wounded';
    }
  } else if (excess >= 4) {
    // If damage is a raise over Toughness, set status to wounded
    statusToApply = 'wounded';
  }

  await soakPrompt(
    actor,
    damage,
    ap,
    woundsInflicted,
    statusToApply,
    targetUserId,
  );
}

// Function to determine if this client's user should be prompted.
function promptThisUser(actor: SwadeActor, damage: number, ap: number) {
  // Find the player who has selected this Target Actor as their character and is active, if any.
  const activeCharacterPlayer = game.users?.find(
    (u) => u.character?.id === actor.id && u.active,
  );
  // Is the active character player the current user?
  const userIsActiveCharacterPlayer =
    activeCharacterPlayer && activeCharacterPlayer.id === game.userId;
  // Is the default ownership "owner" (3)?
  const defaultOwnership = actor.ownership.default === 3;
  // Does the current user have ownership of the Actor?
  const userHasOwnerPermission = actor.ownership[game.userId] === 3;
  // Is the user a GM?
  const userIsGM = game.user?.isGM;
  // Are there any players (not GMs) with ownership that are active?
  const activePlayerOwners = Object.keys(actor.ownership).filter((id) => {
    return game.users?.find((u) => u.id === id && !u.isGM && u.active);
  });
  // Are there multiple active players?
  const multipleActivePlayers = game.users?.filter((u) => u.active && !u.isGM);
  // Are there multiple active players who own the actor?
  const multipleActiveOwners =
    activePlayerOwners.length > 1 ||
    (multipleActivePlayers &&
      multipleActivePlayers.length > 1 &&
      defaultOwnership);
  // Is there any player owner available?
  const noUniquePlayerOwnerAvailable =
    !activeCharacterPlayer && multipleActiveOwners;
  // Prompt this user if the user is the player to whom the Target Actor is assigned,
  // or if the user is a player and has owner permissions and there are not other active players with owner permissions.
  if (
    userIsActiveCharacterPlayer ||
    (!userIsGM && userHasOwnerPermission && !multipleActiveOwners)
  )
    return true;
  // Prompt this user if the user is a player, is not assigned the Target Actor, and there are no other active players with owner permissions,
  // but the user either has owner permissions or the Target Actor's default ownership is owner.
  if (
    !activeCharacterPlayer &&
    !userIsGM &&
    !multipleActiveOwners &&
    (userHasOwnerPermission || defaultOwnership)
  )
    return true;
  // Prompt the GM to select a player to prompt if they are the GM and there are multiple active players with owner permission.
  if (userIsGM && noUniquePlayerOwnerAvailable) {
    const buttons = {};
    const activePlayers = game.users?.filter((u) => !u.isGM && u.active);
    if (activePlayers) {
      for (const player of activePlayers) {
        buttons[player.id] = {
          label: player.name,
          callback: () => {
            game.swade.sockets.calcWounds(actor.uuid, damage, ap, player.id);
          },
        };
      }
    }
    new Dialog(
      {
        title: game.i18n.format(
          'SWADE.DamageApplicator.ChoosePlayerDialog.Title',
        ),
        content: `${game.i18n.format(
          'SWADE.DamageApplicator.ChoosePlayerDialog.Prompt',
          {
            name: actor.name,
          },
        )}`,
        buttons: buttons,
        default: '',
      },
      { classes: appCssClasses },
    ).render(true);
    return false;
  }
  // Prompt the user if they are the GM and there is no player assigned the Target Actor, no other active player owners with assigned permissions, and no other players that have default ownership.
  if (
    userIsGM &&
    !activeCharacterPlayer &&
    !activePlayerOwners.length &&
    !multipleActiveOwners &&
    !defaultOwnership
  )
    return true;
  return false;
}

// Function for prompting to Soak.
async function soakPrompt(
  actor,
  damage,
  ap,
  woundsInflicted,
  statusToApply,
  targetUserId,
) {
  // Set Wounds text for chat message
  const woundsText = `${woundsInflicted} ${
    woundsInflicted > 1
      ? game.i18n.format('SWADE.Wounds')
      : game.i18n.format('SWADE.Wound')
  }`;
  // Text for Wounds about to be taken.
  let message = game.i18n.format(
    'SWADE.DamageApplicator.WoundsAboutToBeTaken',
    {
      name: actor.name,
      wounds: woundsText,
    },
  );

  if (
    !!targetUserId &&
    game.userId !== targetUserId &&
    actor.ownership.default !== 3
  )
    return;

  if (
    (!targetUserId && promptThisUser(actor, damage, ap)) ||
    (targetUserId && game.userId === targetUserId)
  ) {
    // Construct the Dialog for Soaking
    let title = '';

    let prompt = '';
    const buttons: Record<string, Dialog.Button> = {
      adjust: {
        label: game.i18n.format(
          'SWADE.DamageApplicator.SoakDialog.AdjustDamage',
        ),
        callback: async (html: JQuery<HTMLElement>) => {
          const damage = Number(html.find('#damage').val());
          const ap = Number(html.find('#ap').val());
          // Calculate the Wounds.
          await calcWounds(actor.uuid, damage, ap, targetUserId);
        },
      },
    };
    let defaultButton = '';

    if (statusToApply !== 'wounded') {
      title = game.i18n.format(
        'SWADE.DamageApplicator.SoakDialog.UnwoundedTitle',
        { name: actor.name },
      );
      if (statusToApply === 'shaken') {
        prompt = game.i18n.format(
          'SWADE.DamageApplicator.SoakDialog.ShakenPrompt',
          { name: actor.name },
        );
        buttons.applyShaken = {
          label: game.i18n.format(
            'SWADE.DamageApplicator.SoakDialog.ApplyShaken',
          ),
          callback: async (_html) => {
            message = game.i18n.format(
              'SWADE.DamageApplicator.Result.IsShaken',
              { name: actor.name },
            );
            // Apply Shaken Status Effect.
            await applyShaken(actor);
            // Output chat message.
            await ChatMessage.create({ content: message });
          },
        };
        defaultButton = 'applyShaken';
      } else if (statusToApply === 'none') {
        prompt = game.i18n.format(
          'SWADE.DamageApplicator.SoakDialog.UnharmedPrompt',
          { name: actor.name },
        );
        buttons.accept = {
          label: game.i18n.format('SWADE.DamageApplicator.SoakDialog.Accept'),
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
        };
      }
    } else {
      title = game.i18n.format(
        'SWADE.DamageApplicator.SoakDialog.WoundedTitle',
        { name: actor.name },
      );
      prompt = game.i18n.format(
        'SWADE.DamageApplicator.SoakDialog.WoundedPrompt',
        { name: actor.name, wounds: woundsText },
      );
      buttons.soakBenny = {
        label: game.i18n.format('SWADE.DamageApplicator.SoakDialog.Benny'),
        callback: async () => {
          if (actor.isWildcard && actor.bennies > 0) {
            actor.spendBenny();
          } else if (
            !actor.isWildcard &&
            game.user?.isGM &&
            game.user.bennies > 0
          ) {
            game.user.spendBenny();
          }
          await attemptSoak(actor, woundsInflicted, statusToApply, woundsText);
        },
      };
      buttons.soakFree = {
        label: game.i18n.format('SWADE.DamageApplicator.SoakDialog.Free'),
        callback: async () => {
          await attemptSoak(actor, woundsInflicted, statusToApply, woundsText);
        },
      };
      buttons.take = {
        label: game.i18n.format(
          'SWADE.DamageApplicator.SoakDialog.TakeWounds',
          { wounds: woundsText },
        ),
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
      };
      defaultButton = 'take';
    }

    const soakDialog = new Dialog(
      {
        title: title,
        content: `
        ${prompt}
        <form>
          <fieldset>
          ${game.i18n.format('SWADE.DamageApplicator.AdjustDamagePrompt', {
            name: actor?.name,
          })}
          <label for="damage">${game.i18n.format('SWADE.Dmg')}</label>
          <input type="number" id="damage" value="${damage}" autofocus>
          <label for="ap">${game.i18n.format('SWADE.Ap')}</label>
          <input type="number" id="ap" value="${ap}">
          </fieldset>
        </form>
      `,
        buttons: buttons,
        default: defaultButton,
      },
      { height: 'auto', classes: appCssClasses },
    );
    // If Bennies aren't available, remove that option.
    if (
      (actor.isWildcard && actor.bennies <= 0) ||
      (!actor.isWildcard && game.user?.isGM && game.user.bennies <= 0)
    ) {
      delete soakDialog.data.buttons.soakBenny;
    }
    // Render the Dialog.
    soakDialog.render(true);
  }
}

// Function to roll for Soaking Wounds.
async function attemptSoak(
  actor,
  woundsInflicted,
  statusToApply,
  woundsText,
  bestSoakAttempt = 0,
) {
  // TODO: Figure out how to delay the results message until after the DSN roll animation completes.
  // Roll Vigor and get the data.
  const vigorRoll = await actor.rollAttribute('vigor');
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
        ? game.i18n.format('SWADE.Wounds')
        : game.i18n.format('SWADE.Wound')
    }`;
    // Open Dialog to reroll with a Benny, reroll for free, or accept the Wounds.
    const rerollSoakDialog = new Dialog(
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
        buttons: {
          rerollBenny: {
            label: game.i18n.format(
              'SWADE.DamageApplicator.RerollSoakDialog.Benny',
            ),
            callback: async () => {
              if (actor.isWildcard) {
                actor.spendBenny();
              } else if (!actor.isWildcard && game?.user?.isGM) {
                game.user.spendBenny();
              }
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
            label: game.i18n.format(
              'SWADE.DamageApplicator.RerollSoakDialog.Free',
            ),
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
          accept: {
            label: game.i18n.format(
              'SWADE.DamageApplicator.RerollSoakDialog.TakeWounds',
              {
                wounds: woundsRemainingText,
              },
            ),
            callback: async () => {
              // Construct text for the new Wounds value to be accepted (singular or plural Wounds).
              const newWoundsValueText = `${newWoundsValue} ${
                newWoundsValue > 1 || newWoundsValue === 0
                  ? game.i18n.format('SWADE.Wounds')
                  : game.i18n.format('SWADE.Wound')
              }`;
              if (statusToApply === 'shaken') {
                await applyShaken(actor);
                if (actor.system.status.isShaken) {
                  statusToApply = 'wounded';
                } else {
                  // Is Shaken
                  message = game.i18n.format(
                    'SWADE.DamageApplicator.Result.IsShaken',
                    {
                      name: actor.name,
                    },
                  );
                }
              }
              if (statusToApply === 'wounded') {
                // Update Wounds
                await actor.update({
                  'system.wounds.value': newWoundsValue,
                });
                // Is Shaken with Wounds
                message = game.i18n.format(
                  'SWADE.DamageApplicator.Result.IsShakenWithWounds',
                  {
                    name: actor.name,
                    wounds: newWoundsValueText,
                  },
                );
                // Apply Status Effects: Incapacitated or Shaken.
                if (totalWounds > maxWounds) {
                  await applyIncapacitated(actor);
                  message = game.i18n.format(
                    'SWADE.DamageApplicator.Result.IsIncapacitated',
                    {
                      name: actor.name,
                    },
                  );
                  await ChatMessage.create({ content: message });
                } else {
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
                // If Gritty Damage is in play, prompt for Gritty Damage.
                if (
                  actor.type !== 'vehicle' &&
                  game.settings.get('swade', 'grittyDamage')
                ) {
                  await rollInjuryTable();
                }
              }
            },
          },
        },
        default: 'accept',
      },
      { classes: appCssClasses },
    );
    // If no Bennies available, remove the option from the Dialog.
    if (
      (actor.isWildcard && actor.bennies <= 0) ||
      (!actor.isWildcard && game.user?.isGM && game.user.bennies <= 0)
    ) {
      delete rerollSoakDialog.data.buttons.rerollBenny;
    }
    // Render the Dialog.
    rerollSoakDialog.render(true);
  }
}

async function applyShaken(actor: SwadeActor) {
  const isShaken = actor.system.status.isShaken;
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
  const isIncapacitated = actor.effects.find((e) => e.name === 'Incapacitated');
  // If there is not such Status Effect, then apply it.
  if (isIncapacitated === undefined) {
    const data = CONFIG.SWADE.statusEffects.find(
      (s) => s.id === 'incapacitated',
    );
    if (data) {
      await actor.toggleActiveEffect(data, { active: true, overlay: true });
    }
  }
}

async function rollInjuryTable() {
  const injuryTable = (await fromUuid(
    game.settings.get('swade', 'injuryTable'),
  )) as RollTable;
  if (injuryTable) {
    await injuryTable.draw();
  } else {
    ui.notifications.error('SWADE.DamageApplicator.NoInjuryTable', {
      localize: true,
    });
  }
}
