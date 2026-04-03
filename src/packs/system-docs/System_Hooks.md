---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.du4BEcZ8G47otEeF'
  _id: du4BEcZ8G47otEeF
  name: System Hooks
  sort: 1100000
---

This page is intended for developers and power uses seeking to dig deeper into the Savage Worlds system. This focuses exclusively on the enhancements made by the Savage Worlds system; for general FVTT API info, check the [Official Knowledge Base](https://foundryvtt.com/article/intro-development/#javascript).

## SWADE Hooks

The [Knowledge Base](https://foundryvtt.com/article/intro-development/#javascript) explains what hooks are and how to generally use them. Here is a list of all hooks defined by the swade system and the available data for them

```javascript
/**
 * This hook is called once swade is done setting up itself
 */
Hooks.on('swadeReady', () => {
  // do stuff here
});
```

```javascript
/**
 * A hook event that is fired after an actor spends a Benny
 * @param {SwadeUser} user    The user that spent the benny
 */
Hooks.on('swadeSpendGameMasterBenny', (user) => {
  // Returning `false` in a hook callback will cancel the benny animation
});
```

```javascript
/**
 * A hook event that is fired after a game master spends a Benny
 * @param {SwadeUser} user    The user that received the benny
 */
Hooks.on('swadeGetGameMasterBenny', (user) => {
  // Returning `false` in a hook callback will cancel the benny animation
});
```

```javascript
/**
 * A hook event that is fired after an actor spends a Benny
 * @param {SwadeActor} actor    The actor that spent the benny
 */
Hooks.on('swadeSpendBenny', (actor) => {
  // Returning `false` in a hook callback will cancel the benny animation
});
```

```javascript
/**
 * A hook event that is fired after an actor has been awarded a benny
 * @param {SwadeActor} actor    The actor that received the benny
 */
Hooks.on('swadeGetBenny', (actor) => {
  // Returning `false` in a hook callback will cancel the benny message
});
```

```javascript
/**
 * A hook event that is fired after the system has completed its data preparation and allows modules to adjust the derived data afterwards
 * @param {SwadeActor} actor                The actor whose data is being prepared
 */
Hooks.on('swadeActorPrepareDerivedData', (actor) => {
  // Updates to the actor are saved.
});
```

```javascript
/**
 * Called when a new chat card is created from an item.
 * @param {SwadeActor} actor        The parent actor of the triggering item
 * @param {SwadeItem} item          The triggering item
 * @param {SwadeChatMessage} html   The chat message being sent
 * @param {string} userId           The userId of the person who is creating the chat card
 */
Hooks.on('swadeChatCard', (actor, item, html, userId) => {
  // Returning `false` in a hook callback will cancel showing the chat message
});
```

```javascript
/**
 * Called when an action is called on an item card.
 * @param {SwadeActor} actor      The actor performing the action
 * @param {SwadeItem} item        The item being used
 * @param {string} action         What type of action is being rolled
 * @param {SwadeRoll} roll        The roll being made
 */
Hooks.on('swadeAction', (actor, item, action, roll) => {
  // Returning `false` in a hook callback will cancel the roll entirely
});
```

```javascript
/**
 * A hook event that is fired before damage is rolled, giving the opportunity to programatically adjust a roll and its modifiers
 * @param {SwadeActor} actor                The actor that owns the item which rolls the damage
 * @param {SwadeItem} item                  The item that is used to create the damage value
 * @param {DamageRoll} roll                 The built base roll, without any modifiers
 * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
 * @param {IRollOptions} options            The options passed into the roll function
 */
Hooks.on('swadeRollDamage', (actor, item, roll, modifiers, options) => {
  // Returning `false` in a hook callback will cancel the roll entirely
});
```

```javascript
/**
 * A hook event that is fired before an item is consumed, giving the opportunity to programmatically adjust the usage and/or trigger custom logic
 * @param item               The item that is used being consumed
 * @param charges            The charges used.
 * @param usage              The determined usage updates that resulted from consuming this item
 */
Hooks.on('swadePreConsumeItem', (item, charges, usage) => {
  // Returning `false` in a hook callback will cancel the item consumption process
});
```

```javascript
/**
 * A hook event that is fired after an item is consumed but before cleanup happens
 * @param item               The item that is used being consumed
 * @param charges            The charges used.
 * @param usage              The determined usage updates that resulted from consuming this item
 */
Hooks.on('swadeConsumeItem', (item, charges, usage) => {
  // Returning `false` in a hook callback will cancel the default charge messaging and cleanup of empty items
});
```

```javascript
/* A hook event that is fired before an attribute is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
 * @param {SwadeActor} actor                The actor that rolls the attribute
 * @param {String} attribute                The name of the attribute, in lower case
 * @param {TraitRoll} roll                  The built base roll, without any modifiers
 * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
 * @param {IRollOptions} options            The options passed into the roll function
 */
Hooks.on('swadePreRollAttribute', (actor, attribute, roll, modifiers, options) => {
  // Returning `false` in a hook callback will cancel the roll entirely
});
```

```javascript
/**
 * A hook event that is fired after an attribute is rolled
 * @param {SwadeActor} actor                The actor that rolls the attribute
 * @param {String} attribute                The name of the attribute, in lower case
 * @param {TraitRoll} roll                  The built base roll, without any modifiers
 * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
 * @param {IRollOptions} options            The options passed into the roll function
 */
Hooks.on('swadeRollAttribute', (actor, attribute, roll, modifiers, options) => {
  // do stuff here
});
```

```javascript
/**
 * A hook event that is fired before a skill is rolled, giving the opportunity to programmatically adjust a roll and its modifiers
 * @param {SwadeActor} actor                The actor that rolls the skill
 * @param {SwadeItem} skill                 The Skill item that is being rolled
 * @param {TraitRoll} roll                  The built base roll, without any modifiers
 * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
 * @param {IRollOptions} options            The options passed into the roll function
 */
Hooks.on('swadePreRollSkill', (actor, skill, roll, modifiers, options) => {
  // Returning `false` in a hook callback will cancel the roll entirely
});
```

```javascript
/**
 * A hook event that is fired after a skill is rolled
 * @param {SwadeActor} actor                The actor that rolls the skill
 * @param {SwadeItem} skill                 The Skill item that is being rolled
 * @param {TraitRoll} roll                  The built base roll, without any modifiers
 * @param {RollModifier[]} modifiers   An array of modifiers which are to be added to the roll
 * @param {IRollOptions} options            The options passed into the roll function
 */
Hooks.on('swadeRollSkill', (actor, skill, roll, modifiers, options) => {
  // do stuff here
});
```

```javascript
/**
 * A hook event that is fired after damage has been applied, intended for things like other injury table conditions
 * @param {SwadeActor} actor            The actor taking the damage
 * @param {DamageContext} damageContext Additional information people calling the hook might need
 */
Hooks.on('swadeTakeDamage', (actor, damageContext) => {
  // do stuff here
});
```

```javascript
/**
 * A hook event that is fired before the vigor roll to determine what occurs upon an actor receiving more than their maximum wounds
 * @param {SwadeActor} actor            The actor who took the wounds
 * @param {ToggleStatus[]} statuses     Statuses to apply to the actor, starts with 'incapacitated' inside
 */
Hooks.on('swadeIncapacitation', (actor, statuses) => {
  // returning false will end the Incapacitation workflow, including the roll to resist possible injury
});
```

```javascript
/**
 * Called when a reload is initiated.
 * @since 3.3.0
 * @param {SwadeItem} item        The weapon being reloaded
 */
Hooks.on('swadePreReloadWeapon', (item) => {
  //  Returning false will cancel the reload operation
});
```

```javascript
/**
 * Called after a weapon reload procedure has finished.
 * @since 3.3.0
 * @param {SwadeItem} item            The weapon being reloaded
 * @param {boolean} reloaded          Whether the reload operation was successfully completed
 */
Hooks.on('swadeReloadWeapon', (item) => {
  //  do stuff
});
```

```javascript
/**
 * Called when a GM refreshes their bennies.
 * @since 3.3.0
 * @param {SwadeUser} user            The GM User
 */
Hooks.on('swadeRefreshGmBennies', (user) => {
  //  do stuff
});
```

```javascript
/**
 * Called an actor refreshes their bennies.
 * @since 3.3.0
 * @param {SwadeActor} actor            The Actor refreshing their bennies
 */
Hooks.on('swadeRefreshBennies', (user) => {
  //  do stuff
});
```

```javascript
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
Hooks.on('swadePreCalcWounds', (actor, damageContext, woundsInflicted, statusToApply) => {
  //  Returning false will cancel damage application
});
```
