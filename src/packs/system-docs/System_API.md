---
id: BrbvJQ3OnkmO3cip
title: System API
sort: 1000000
key: '!journal.pages!8uC7RTgJOg8SW4cf.BrbvJQ3OnkmO3cip'
---

THIS IS A WORK IN PROGRESS

## SWADE Hooks

- `swadeChatCard(actor, item, html, userId)`

  Called when a new chat card is created. Contains the chat card author's actor, the item, and the html of the card.

- `swadeAction(actor, item, action, roll, userId)`

  Called when an action is called on an item card. Contains information about the chat card, the action, and the roll.

- `swadeRollDamage(actor, item, roll, modifiers, options)`

  A hook event that is fired before damage is rolled, giving the opportunity to programatically adjust a roll and its modifiers

- `swadeRollAttribute(actor, attribute, roll, modifiers, options)`

  A hook event that is fired before an attribute is rolled, giving the opportunity to programmatically adjust a roll and its modifiers

- `swadeRollSkill(actor, skill, roll, modifiers, options)`

  A hook event that is fired before a skill is rolled, giving the opportunity to programmatically adjust a roll and its modifiers

## Classes

### ItemChatCardHelper

The `ItemChatCardHelper` is a helper class originally created for Item Chat Cards. You can find the class in the global `game` object under `game.swade.itemChatCardHelper`.

#### static async handleAction

**Parameters**

| Parameter |    type    |
| :-------: | :--------: |
|  `item`   | SwadeItem  |
|  `actor`  | SwadeActor |
| `action`  |   string   |

handleAction is the centrally used function to handle basic and additional actions. The `action` parameter has a few reserved options.

- formula: a basic Skill test on a weapon, shield or power
- damage: basic Damage on a weapon, shield or power
- reload: reloading a weapon

Any other strings passed will be treated as an additional action. If no action with the name/id exists then the function ends without doing anything.
