---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.NcFH9QGCsLMpdkH0'
  _id: NcFH9QGCsLMpdkH0
  name: Items
  sort: 200000
---

Items are the components with which you can create and equip actors in Foundry. They can be created in the Items Directory or directly on actor sheets, and they can be dragged between both locations for easy sharing.

The free SWADE system already includes items for Hindrances, Edges, and Skills, but the content descriptions include only page references. Other items such as Gear, Armor, Shields, Weapons, and Powers are available in the _Savage Worlds Adventure Edition_ compendium [package](https://peginc.com/store/savage-worlds-adventure-edition-core-rules-foundry-vtt/ 'SWADE CORE FVTT').

## Creating Items

You can create items either in the Items Directory or directly on the character sheet.

### In the Items Directory

For GMs, it’s best to create an item in the Items Directory before attempting to add it to a character sheet. This is true for several reasons:

1.  You can reuse the item among multiple actors more easily by dragging and dropping them.
2.  You can organize them in folders.
3.  Currently, Actions & Effects cannot be added to items that are owned by a character, i.e. on the character’s sheet. They can only be added to items in the Items Directory.

### On the Character Sheet

Players likely do not have the permissions needed to create items in the Items Directory. In that case, create items for an individual character directly on the sheet.

#### Reusing Character Items

You can save an item on a character’s sheet to the Items Directory in the sidebar simply by dragging and dropping it to the Items Directory. This makes a copy of the item which can then be dragged to other character sheets when needed.

## Hindrances

The basic fields for a Hindrance include the following:

- **Name:** The name of the Hindrance.
- **Major Hindrance:** A checkbox to indicate whether or not it is a Major Hindrance. If this is left unchecked, it will be regarded as a Minor Hindrance.
- **Description:** The details about the Hindrance.

## Edges

The basic fields for Edges include the following:

- **Name:** The name of the Edge
- **Requirements:** The Rank, Skill, Edge, or other requirements needed to be able to take the Edge.
- **Arcane Background:** A checkbox indicating whether or not this Edge is an Arcane Background.
- **Description:** The details and description of the Edge.

## Skills

The basic fields for Edges include the following:

- **Name:** The name of the Skill.
- **Die:** The die type of the Skill.
- **Modifier:** Any permanent modifier applied to the skill. For example, if the Skill’s die type is d12+1, this would contain the +1 modifier.
- **Linked Attribute:** The Attribute to which the Skill is linked.
- **Wild Die:** Usually a d6, but you can specify a different die type if there are special circumstances in which a specific skill has a different die type for the Wild Die.
- **Description:** The details and description of the Skill.

## Gear

The basic fields for Gear include the following:

- **Name:** The name of the item.
- **Equippable:** Determines whether the item can be equipped.
- **Vehicle Mod:** Determines whether the item can be added to a vehicle actor’s Modifications list (see System Settings).
- **Cost:** The monetary purchase value of the item.
- **Weight:** The weight of the item for calculating encumbrance.
- **Quantity:** How many of this item the character has in her inventory.
- **Description:** The details and description of the item.

## Armor

The basic fields for Armor include the following:

- **Name:** The name of the armor.
- **Equipped:** Determines whether the armor is equipped for the purposes of automatically calculating Toughness.
- **Armor:** The actual bonus the armor grants.
- **Cost:** The monetary purchase value of the armor.
- **Weight:** The weight of the armor for calculating encumbrance.
- **Quantity:** How many of this type of armor the character has in her inventory.
- **Min. Str:** The minimum Strength required to wear the armor effectively.
- **Notes:** Any special notes about the armor.
- **Natural Armor:** Determines whether or not this armor is considered natural armor for stacking and equipping purposes.
- **Hit Locations:** Specifies which parts of the body the armor protects for the purposes of called shots.
- **Description:** The details and description of the armor.

## Shields

- **Name:** The name of the shield.
- **Equipped:** Determines whether the shield is equipped for the purposes of automatically calculating Toughness.
- **Cover:** Assigns the amount of cover the shield grants when equipped.
- **Parry:** Assigns the bonus to Parry the shield grants when equipped.
- **Cost:** The monetary purchase value of the shield.
- **Weight:** The weight of the shield for calculating encumbrance.
- **Quantity:** How many of this type of shield the character has in her inventory.
- **Min. Str:** The minimum Strength required to wield the shield effectively.
- **Notes:** Any special notes about the shield.
- **Description:** The details and description of the shield.

## Weapons

- **Name:** The name of the weapon.
- **Vehicular Weapon:** Enables a vehicle to equip the weapon.
- **Equipped:** Determines whether the weapon is equipped for the purposes of automatically calculating Toughness.
- **Shots:** The amount of ammunition the weapon has. The two fields are current and maximum.
- **Damage:** The amount of damage the weapon deals. This should be written as a dice expression such as `d6 + 1`. If the weapon includes Strength damage, prepend the damage with `@str +` so that the die roller rolls the character’s Strength accordingly.
- **Range:** The range increments of the weapon, usually written as 12/24/48 for example.
- **RoF:** The maximum Rate of Fire of the weapon.
- **AP:** The amount of Armor the weapon can ignore.
- **Cost:** The monetary purchase value of the weapon.
- **Weight:** The weight of the weapon for calculating encumbrance.
- **Quantity:** How many of this type of weapon the character has in her inventory.
- **Min. Str:** The minimum Strength required to wield the weapon effectively.
- **Notes:** Any special notes about the weapon.
- **Description:** The details and description of the weapon.

## Powers

- **Name:** The name of the power.
- **P. Points:** The minimum amount of Power Points it costs to activate the power.
- **Range:** The maximum range at which the power can be used.
- **Duration:** The default length of time the power lasts.
- **Damage:** The amount of damage the power inflicts.
- **Arcane:** The name of the Arcane Skill used to activate the power. This is also how powers are grouped on the actor’s character sheet.
- **Trappings:** The unique trapping of the power.
- **Description:** The details and description of the power, including modifiers.

## Actions and Effects

Items of all types have an Actions and Effects tab.

Some items include a field for a default Skill rolled to use the item. When a Chat card for the item is displayed, this Skill is included as a button on the card. Clicking that button rolls the respective character’s Skill.

Additional Actions also include fields for a default Skill or damage modifiers.

### Actions

Some items can have multiple actions. For example, a particular ranged weapon might have a Rate of Fire which would apply a penalty to the Shooting roll and consume a number of shots. Other items might have different damage determined by range or ammo used. All of these can be defined in the Actions list, and all would also appear on the Chat card as buttons for rolling Skills or damage.

### Active Effects

Documentation coming soon!
