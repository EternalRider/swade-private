---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.npC8fXZCPkW9vegg'
  _id: npC8fXZCPkW9vegg
  name: Combat
  sort: 100000
---

## Damage

For precise rules on how damage, soaking and all other related rules work, please consult your rule book.

### How to handle damage

In order to resolve damage with a token select the token you want to handle damage for and then click **Resolve Damage**.

![Damage Roll Card](systems/swade/assets/docs/Damage_Roll_Card.png)

This will trigger the Damage Applicator which will allow you to make some adjustments before either taking the damage as is or attempting to soak. The damage application doesn't currently take into account things like Ballistic Protection, other damage resistances or vulnerabilities, so please adjust the final damage number accordingly.

![Damage Applicator](systems/swade/assets/docs/Damage_Applicator.png)

## The Combat Tracker

The SWADE system applies a couple of modifications to [Foundry’s Combat Tracker](https://foundryvtt.com/article/combat/) to align it with Savage Worlds’ Initiative rules.

### Combatant Display

Rather than rolling dice, combatants in Savage Worlds are dealt cards to determine their initiative. As such, the numeric value display in the default Foundry combat tracker has been replaced by the suit and value of the combatant's action card.

In addition to the core-provided Toggle Visibility, Mark Defeated, and Ping Combatant buttons, SWADE adds additional buttons to the actor display:

- **Incapacitated.**: Actors can be incapacitated without being removed from initiative (which Defeated may do depending on your combat options), for example if they are at risk of bleeding out.

- **Hold.** Once combat has begun, Combatants can go on hold to delay their turn. While on hold, they have additional options.
  - _Toggle Lose Turn._ Some conditions automatically knock a character out of hold and cause them to lose their turn; this can be configured in the Active Effect sheet as well as with world scripts. Otherwise, there's a button to manually toggle this lost turn.
  - _Act Now._ A character that's on hold can interrupt the current combatant, rearranging the initiative order. This button does NOT prompt any kind of contested roll to determine whether a character succeeds in interrupting.
  - _Act After Current Combatant._ Alternatively, a character that's on hold can simply place themselves next in the countdown.

### Updating a Combatant

Sometimes you need to manually set a combatant's action card. To do that, you can right click a combatant to open a context menu and click "Update Combatant" to open a dialog that lets you alter a combatant's name, image, and action card. This is core functionality that SWADE has extended to match our use of the action deck in place of numerical initiative.

### The Action Deck

Combatants are given cards drawn from the Action Deck. At the start of a new round, Action Cards are automatically drawn for each combatant. If there's not enough action cards left in the deck then the cards are dealt out until there's no cards left, and then discarded cards are shuffled back in to deal out. If there's more combatants than action cards available in total (>54), please group the combatants (detailed below).

**Jokers.** If a Joker was drawn in the previous round, the cards are shuffled before Action Cards are distributed. The bonus to trait and damage rolls is automatically applied, however keep in mind that if the combatant is tied to an unlinked token (as is often the case with extras), the actor in the sidebar will not benefit - you need to roll from _that token's_ sheet. You can tell whether you're looking at an unlinked token by looking at the header of the sheet.

**Setting the Action Deck.** You can right click a deck of poker cards to set it as the action deck. You can also update it in the "World Basics" tab of the SWADE Setting Configurator.

**Drawing New Cards.** Users may left click on the drawn card of any combatants they have ownership over to draw a new card; they will be prompted whether to spend one of the actor's bennies, a GM benny (if they're a GM), or draw a new card for free.

### Tweaks

If a character has Level Headed, Improved Level Headed, Quick, or Hesitant active in the Tweaks settings in their Actor sheet, the Combat Tracker will take into account those features and prompt the player as necessary. The Active GM will receive a dialog box informing them of any players that are still making choices.

### Grouping Combatants

You can group combatants together by dragging them onto a desired "leader" in the combat tracker; this is useful for extras and companions that should go together. Only the leader is dealt an action card and only that actor's initiative modifiers matter.

**Context Menu Options:** Right clicking a combatant provides a number of helpful choices for managing groups of actors

- **Make Group Leader**: Marks this combatant as a group leader which other combatants can be assigned as followers.
- **Set Group Color**: Add a helpful tint to the border of this combatant.
- **Remove Group Leader**: Disbands a group and removes all followers.
- **Add Selected Tokens as Followers**: Creates combatants if necessary and adds them as followers to this combatant.
- **Group by Name**: Sets this combatant as a leader of all others with a matching name.
- **Unfollow {name}**: Removes this combatant as a follower. This will NOT re-sort the tracker, so if you have not configured group colors it may not be obvious who is following who until the next round when action cards are dealt again.
- **Follow {name}**: Adjusts this combatant to follow the named group leader in this combat. If this combatant is ALSO a group leader, its followers will be brought along to follow the new leader.

If combat is currently going and a combatant stops following a group leader, it will will be assigned an initiative value equal to their now ex-leader's card.

### The Ambush Assistant

Listed below "Begin Combat", game masters can choose "Start Surprise Round" to open an application where they can drag-sort actors into one of the following three categories:

- Holding (for the ambushers)
- Normal Draw (for characters who succeed in noticing an ambush)
- No turn (for characters caught unawares)

After sorting all combatants, you can "Begin Combat" to deal out action cards; characters who start combat on hold still receive action cards and are sorted appropriately and can receive the benefits of a Joker. (If a character who does not start on hold receives the highest action card in the countdown, characters on hold will need to interrupt the first character's turn to act). Characters who lost out on their first turn will still receive an action card as normal the following round.
