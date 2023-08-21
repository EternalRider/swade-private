---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.BrbvJQ3OnkmO3cip'
  id: BrbvJQ3OnkmO3cip
  name: System API
  sort: 1000000
---

[General FVTT API info - Official Knowledge Base](https://foundryvtt.com/article/intro-development/#javascript)

## SWADE Flags

Flags are additional fields that can be used to store information that doesn't conform to the system-provided schema.

You can interact with flags in two main ways. As an active effect, you can update them through `flags.swade.flag-name`. In a script, you can use the `setFlag`, `getFlag`, or `unsetFlag` functions to interact with them.

The Savage Worlds system uses flags in its code to account for certain special effects. The following flags are intended to be interacted with by users.

- Actors
  - `ambidextrous`: Allows an actor to add any parry bonus from off-hand weapons as well as blocks the automatic Off Hand penalty.
  - `hardy`: Prevents a second shaken result from the Apply Damage workflow from counting as a wound.
  - `ignoreBleedOut`: Prevents the application of the "Bleeding Out" status effect on a failed vigor roll upon incapacitation.
- Effects
  - `conditionalEffect`: Sets if the effect should be ignored by default in the roll dialog.

## SWADE Hooks

The above Knowledge Base link explains what hooks are and how to generally use them. For hooks provided by the Savage Worlds system, see the [hooks snippets on the system repository](https://gitlab.com/peginc/swade/-/snippets/2578317) for a listing of hooks.

## Classes

### ItemChatCardHelper

The `ItemChatCardHelper` is a helper class originally created for Item Chat Cards. You can find the class in the global `game` object under `game.swade.itemChatCardHelper`.

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
