---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.CS16YycneYYnmWVZ'
  _id: CS16YycneYYnmWVZ
  name: Active Effects
  sort: 400000
---

**What are Active Effects?** Active Effects (or AE for short) are a part of the core Foundry experience which allow you to modify an `Actor` (characters, npcs, and vehicles) on a temporary or permanent basis. Many of the rules of Savage Worlds are best captured through active effects.

## How to use Active Effects

Active effects can either be directly stored on an actor, usually as a temporary effect with a duration (e.g. the Protection power granting +2 armor to its recipient), or on an item that is carried by the actor usually as a more permanent boon (e.g. a bonus to speed from the Fleet-Footed edge).

For a list of attribute keys please scroll to the bottom

### Active Effects on Actors

To add an AE to a character, go to the `Effects` page and click the **\+ Add Active Effect** button. You can then either choose to use the Active Effect Wizard or to Add Empty Effect. On an NPC or Vehicle, simply use the + button on the section that says "Effects" to open the Active Effect Wizard.

#### The Active Effect Wizard.

The Active Effect Wizard provides a guided builder for creating active effects. At the top, you can establish the effect's name, icon, how many rounds it should last, and whether it expires at the start or end of the affected actor's turn.

On the left, you can see a preview of what changes you've selected, choose which mode will apply, and how much. Note that anything that asks for "die sides" is usually measuring in even numbers, so a d6 is 6, a d8 is 8, etc.

On the right, you can select from a wide variety of changes. You can expand or collapse each group by clicking on its header; the more common groups are expanded by default, while the less common ones are collapsed by default.

#### Editing Active Effects

When you add an empty effect or edit an existing one, you are presented with a slightly enhanced version of the default Foundry active effect sheet. At the top is the effect's name and the usual icon selector, with four tabs just below it.

The first tab, Details, lets you tint the icon, write a description for the effect, suspend the effect from applying to the actor, and see the UUID of the effect's origin if it was applied from another source.

The second tab, Duration, lets you specify the duration of an effect in either real-world time or in combat turns.

The third tab, Turn Behavior, lets you choose when exactly the effect expires. Most effects in Savage Worlds expire at the end of a character's turn. (Note: The system does not currently support automated effect expiration being tied to the effect creator's turn). The "Lose Turn on Hold" checkbox allows an effect to break holds, such as the Shaken or Stunned condition.

The fourth tab, Effects, lists all changes applied by the effect. A single effect can have any number of changes; for example, Liquid Courage from the core rules changes half a dozen stats while active.

#### Change Modes

Foundry Virtual Tabletop provides five core change modes, which the Savage Worlds system does not change, but an explanation is still provided here for your convenience.

1. _Custom_: The savage worlds system does not currently use the custom change mode
2. _Multiply_: This change mode can also be used to divide by using a decimal value. This mode is very rarely used. When applied to a boolean (`true` or `false`) value, it acts as an AND operation.
3. _Add_: The most common change mode in Savage Worlds, you can add negative numbers to instead subtract. When applied to a boolean value, it acts as an OR operation.
4. _Downgrade_: If the change key's value is higher than this, reduce it to this value.
5. _Upgrade_: If the change key's value is lower than this, increase it to this value.
6. _Override_: Completely replace the change key's value with this.

The order of operations follows the above list exactly; if one or more effects add to a value then downgrade it, the add is applied first and the downgrade is applied second.

### Active Effects on Items

> You can currently add Active Effects to every type of Item except Skills.

To add an Active Effect to an `Item` first find the _Effects_ tab on the item sheet. Like actors, you can either use the active effect wizard or add an empty effect. By default, effects are applied to actors, which is controlled by a toggle on the effect's Details tab. An effect that is suspended still shows on the actor's sheet, just crossed out; an effect that isn't applied will not be on the actor's sheet at all and will not do anything, even if the effect is not suspended.

### Active Effects that affect Items.

Active Effects in the Savage Worlds system can affect other items. This is done via special syntax in the attribute key. Use Change Mode and Value as usual.

The syntax is `@ItemType{Item Name or ID}[attribute key]` so if you want to add AP to an M-16 you do `@Weapon{M-16}[system.ap]` If you want to improve a skill you do `@Skill{Shooting}[system.die.sides]`
