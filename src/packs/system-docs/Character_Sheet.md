---
id: 0rHMnYSuYiVcQGxU
title: Character Sheet
sort: 900000
key: '!journal.pages!8uC7RTgJOg8SW4cf.0rHMnYSuYiVcQGxU'
---

## Tweaks

Character sheets have a Tweaks option in the title bar of their respective panels. Within the Tweaks settings panel, you’ll find a number of options to customize the character and its sheet.

- **Animal Smarts:** Appends an A to the Smarts Attribute to indicate the actor has Animal Smarts.
- **Running Die:** Sets the die type rolled and any modifiers for Running die rolls.
- **Max Wounds:** Sets the maximum number of Wounds the character can have before becoming Incapacitated.
- **Max Fatigue:** Sets the maximum level of Fatigue the character can have before becoming Incapacitated.
- **Bennies Reset:** Sets the number of Bennies the character has at the start of a session or when bennies are refreshed.
- **Ignore Wounds:** Used to indicate how many points of Wound penalties to ignore based on any Edges or abilities the character might have.

### Initiative

These options affect how drawing Action Cards for Initiative is handled for the given character, respecting the rules for those Edges and Hindrances accordingly. See Running Savage Worlds in Foundry VTT for more details.

### Automatic Calculations

**Toughness:** Automatically calculates stacking of Armor from any armor items equipped and adds it to the character’s base Toughness. This can be useful if characters don and doff armor from various sources during a session.

### Additional Stats

Displays fields for Additional Stats as defined in the System Settings’ Setting Configurator.

## Prototype Token

You can configure your character’s default token directly from the sheet via the Prototype Token option in the character sheet’s title bar.

Details about Prototype Tokens can be found on the [Foundry VTT website](https://foundryvtt.com/article/tokens/).

## Character Sheet Header

There are a handful of fields available at the top of the character sheet, specifically the following:

- Race
- Rank
- Advances

Additionally, if the Convictions setting configuration is enabled in Setting Configurator as noted above, the character sheet header will include a field for that value as well.

## Summary Tab

The Summary tab is essentially where all the action happens. This tab is primarily geared toward combat and Trait rolls. It includes fields for:

- tracking Wounds and Fatigue,
- applying Statuses,
- tracking and spending Bennies,
- setting values for Attributes and Derived Statistics,
- adding and rolling Skills, and
- accessing equipped gear and favorited powers/effects (see Powers Tab below).

### Wounds and Fatigue

These two fields allow you to track the Wounds and Fatigue a character has at any given time. These values will apply penalties to Trait rolls appropriately. You can also use arrow keys on the keyboard to increment or decrement the selected values.

### Statuses

This section of the sheet provides an array of Statuses that can be checked to indicate whether or not they are to be applied to the character. These statuses _do not_ synchronize status icons with their linked tokens.

### Bennies

Bennies can be spent simply by clicking on a Benny in the stack on the character sheet. (If the [_Dice So Nice!_](https://foundryvtt.com/packages/dice-so-nice/) [module](https://foundryvtt.com/packages/dice-so-nice/) is installed and active, you’ll see a Benny thrown onto the scene.) You can add Bennies to the stack by clicking the `+` button next to them.

### Attributes

#### Setting Attributes

Clicking on the die type for a given Attribute allows you to change it. If an Attribute has a permanent modifier such as d12+2, you can add the modifier in the field adjacent to the die type.

#### Rolling Attributes

You can make a Trait roll with an Attribute by clicking on its name.

### Derived Stats

The Derived Stats are based on those presented in the core rules with a few features.

#### Size

This is the Size value as per the Special Ability presented in the Bestiary of the core rules.

#### Running Die

Clicking on the label for Pace will roll the Running die and automatically add the character’s Pace to the result.

#### Parry

Parry includes any bonuses from weapons and shields

#### Toughness

Toughness and Armor are manually set values. If automatic calculation for Toughness is enabled, these values will be automatically derived from stats and equipped armor.

### Skills

#### Adding Skills

Skills can be added in one of two ways:

- Click the ‘+Add’ button at the top of the list and enter the details in the Skill sheet.
- Drag a previously created Skill from the Items Directory onto the sheet.

To edit the Skill afterward, click on the die type of the skill. This will open the item sheet for the selected Skill.

#### Making Skill Rolls

To make a Skill roll, click the name of the Skill. A dialog window will display and allow you to enter any situational modifiers associated with the roll and choose the roll mode to determine who can see the roll result in the Chat (see the [Roll Modes](https://foundryvtt.com/article/dice/#modes) on the Foundry VTT website for more details).

#### Quick Access & Effects

This section of the sheet features a list of equipped items and favorited powers.

Each item in this list can be expanded by clicking on its name. Weapons in particular display an option to roll damage for that weapon.

**Chat Cards:** These items also each have a chat icon that creates an interactive card in the Chat. This card includes a button to roll the Skill listed in the item’s action tab as well as the damage roll if any. If the item has additional actions defined, those options will also be listed on the card.

## Edges (and Hindrances) Tab

This tab includes both the character’s Hindrances and Edges.

Similarly to Skills, you have two methods for adding Hindrances and Edges:

- Click the “+Add” button to create new Edge or Hindrance Items.
- Drag and a previously created Edge or Hindrance from the Items Directory onto the sheet.

### Editing Edges and Hindrances

To edit an Edge or Hinderance, click on the edit icon for the item. This will open the item sheet for the selected Edge or Hindrance.

**Chat Cards:** Edges and Hindrances also each have a chat icon that creates an interactive card in the Chat. If the item has Actions and Effects defined, those options will be listed on the card.

## Inventory Tab

### Encumbrance

Encumbrance displays the total amount of weight the character can carry before being encumbered and the current total weight of the items in the character’s inventory regardless of whether or not it’s equipped.

### Currency

Currency stores the total amount of money the character has currently.

### Inventory

The character’s inventory of items is grouped into five categories:

- Weapons
- Armors
- Shields
- Misc

Each category has a button labeled “+Add” that allows you to manually enter an item directly to a character’s sheet instead of dragging and dropping an item from the Items Directory sidebar.

Items in the inventory can be equipped, edited, or deleted using the icons to the right of each entry’s listing.

Equipping an item adds the item to the Quick Access & Effects tab on the Summary tab.

Editing an item allows you to add details, change the quantity of items, and more (see Weapons for example).

Deleting an item is permanent. Once the item is deleted, it cannot be recovered. If you think you might need that version of the item in the future, drag it to the Items Directory before deleting it from the character sheet.

## Powers Tab

The Powers tab contains lists of powers and the number of Power Points for each Arcane Background the character has.

The “+Add Powers” button allows you to add a new power. While adding the power, you can specify the Arcane Skill used to activate the power (see Powers for more details).

A power can be added to the Quick Access & Effects list on the Summary tab by clicking the star icon to the right of its listing.

**Chat Cards:** Powers have a chat icon that creates an interactive card in the Chat. This card includes a button to roll the Arcane Skill associated with the power. If the item has additional actions defined, those options will also be listed on the card.

### Deleting a Power

To delete a power, you have to first edit the power. The delete icon will appear in the upper right corner of the displayed sheet.

## Description Tab

The Description Tab has three fields:

- **Portrait:** Click on the portrait field to select or upload an image of the character’s portrait.
- **Advances:** This rich text field allows you to track the character’s advances.
- **Biography:** Usually, this is where you can add your character’s backstory as well as a list of any special abilities the character has been granted.
