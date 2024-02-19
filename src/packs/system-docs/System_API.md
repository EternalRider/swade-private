---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.BrbvJQ3OnkmO3cip'
  _id: BrbvJQ3OnkmO3cip
  name: System API
  sort: 1000000
---

This page is intended for developers and power uses seeking to dig deeper into the Savage Worlds system. This focuses exclusively on the enhancements made by the Savage Worlds system; for general FVTT API info, check the [Official Knowledge Base](https://foundryvtt.com/article/intro-development/#javascript).

## SWADE Flags

Flags are additional fields that can be used to store information that doesn't conform to the system-provided schema.

You can interact with flags in two main ways. As an active effect, you can update them through `flags.swade.flag-name`. In a script, you can use the `setFlag`, `getFlag`, or `unsetFlag` functions to interact with them.

The Savage Worlds system uses flags in its code to account for certain special effects. The following flags are intended to be interacted with by users.

- Actors
  - `ambidextrous`: Allows an actor to add any parry bonus from off-hand weapons as well as blocks the automatic Off Hand penalty.
  - `hardy`: Prevents a second shaken result from the Apply Damage workflow from counting as a wound.
  - `ignoreBleedOut`: Prevents the application of the "Bleeding Out" status effect on a failed vigor roll upon incapacitation.
  - `wildAttackDamage`: Replaces the bonus damage from Wild Attack; if you add 4 to this value, Wild Attacks will grant +4 damage instead of +2.
- Effects
  - `conditionalEffect`: Sets if the effect should be ignored by default in the roll dialog.

## SWADE Hooks

The [Knowledge Base](https://foundryvtt.com/article/intro-development/#javascript) explains what hooks are and how to generally use them. For hooks provided by the Savage Worlds system, see the @UUID[Compendium.swade.system-docs.JournalEntry.8uC7RTgJOg8SW4cf.JournalEntryPage.du4BEcZ8G47otEeF]{Hooks Page} for a listing of hooks.

## Classes

The Savage Worlds system exposes a number of [classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes) used within the system. Some are already exposed by the base Foundry API, such as the various document types (`new Actor` works regardless of system). The below documentation focuses on the other classes not otherwise exposed by the FVTT API.

### Rolls

**Path:** CONFIG.DICE

The TraitRoll and DamageRoll classes extend the base Foundry roll system and are constructed in a similar fashion.

#### Swade Roll Options

In addition to the base options afforded to rolls, the options object for both Trait Rolls and Damage Rolls include the following properties

- modifiers (_RollModifier_): An array of roll modifier (see below for details)
- rerollMode (_string_): Takes 'benny' or 'free', used by the roll chat card reroll buttons.
- rerollable (_boolean_): Can this roll be rerolled

##### Roll Modifiers

A roll modifier is made up of four parts

- label (_string_): The label of the modifier. Used in the hooks and for display
- value (_string_ or _number_): The value for the modifier. Can be an integer number or a a string, for example for dice expressions
- ignore (_boolean_): An optional boolean that flags whether the modifier should be ignored and removed before the roll is evaluated

#### TraitRoll(formula, data = {}, options = {})

Trait Rolls encompass both attribute and skill rolls. The formula argument should be a valid [Pool Term](https://foundryvtt.com/api/classes/client.PoolTerm.html).

##### Options

- critfailConfirmationRoll (_boolean_): Sets the roll to be a crit fail confirmation roll (used for extras)
- groupRoll (_boolean_): Sets the roll to be a group roll
- targetNumber (_number_): The target number for the roll (defaults to 4)

##### Functions

- `roll.isCritfail`: Checks if an evaluated roll was a critical failure
- `roll.successes`: Returns -1 on a CritFail, 0 on a fail, 1 on a success, 2 or more for raises.

#### DamageRoll(formula, data = {}, options = {})

Damage rolls generally sum up all the results rather than return the highest from a pool.

##### Options

- ap (_number_): The armor piercing value for the damage roll
- isHeavyWeapon (_boolean_): Whether the damage counts as a heavy weapon (RIFTS calls this Mega Damage)

### ItemChatCardHelper

**Path:** game.swade.itemChatCardHelper

The `ItemChatCardHelper` is a helper class originally created for Item Chat Cards. Its primary function is [static](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/static), so you can invoke it directly with `game.swade.itemChatCardHelper.handleAction()` without first constructing the class with `new`.

##### static async handleAction(item, actor, action, additionalMods)

**Parameters**

|    Parameter     |      type      |
| :--------------: | :------------: |
|      `item`      |   SwadeItem    |
|     `actor`      |   SwadeActor   |
|     `action`     |     string     |
| `additionalMods` | RollModifier[] |

handleAction is the centrally used function to handle basic and additional actions. The `action` parameter has a few reserved options.

- `formula`: a basic Skill test on a weapon, shield or power
- `damage`: basic Damage on a weapon, shield or power
- `arcane-device`: a Skill roll using the item's arcane die
- `reload`: reloading a weapon
- `consume`: consume resources, e.g. consumable charges or weapon ammo

Any other strings passed will be treated as an additional action. If no action with the name/id exists then the function ends without doing anything.

### Tours

**Path:** game.swade.SwadeTour

The SwadeTour class significantly improves upon the tour functionality provided by the core software. Modules wishing to use or extend the SwadeTour class must then register their tour as part of the `init` hook, with `game.tours.register(moduleID, tourName, await SwadeTour.fromJSON('modules/moduleID/path/to/tour.json'), );`. Use the existing tours as guidance for your own (`/systems/swade/tours/`). The main improvements upon the base SwadeTour class are new properties for the `steps` field.

#### Step Properties

- actor: Makes an actor with the provided data. Embedded items simply go in the `items` property. The name field of each item can be a localization string.
- itemName: Renders the item sheet for the provided matching item name
- settings: An object to merge into the current settings; the leading key is what setting to update.
- tab: Takes the parent and ID of the tab to activate

#### Selector Swaps

The IDs of actors and items created for a SwadeTour are not static. To help target the rendered sheets, the following strings are replaced by the application ID

- #itemSheetID
- #actorSheetID
- #tweaks

#### Hooks


swade(Action|PreCalcWounds|TakeDamage|Incapacitation|RefreshBennies|PreReloadWeapon|ReloadWeapon|SpendGameMasterBenny|GetGameMasterBenny|RefreshGmBennies|ActorPrepareDerivedData|PreRollAttribute|RollAttribute|PreRollSkill|RollSkill|SpendBenny|GetBenny|RollDamage|ChatCard|PreConsumeItem|ConsumeItem|Ready)


