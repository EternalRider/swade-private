---
id: CS16YycneYYnmWVZ
title: Active Effects
sort: 400000
key: '!journal.pages!8uC7RTgJOg8SW4cf.CS16YycneYYnmWVZ'
---

## What are Active Effects?

Active Effects (or AE for short) is a part of the core Foundry experience which allow `Items` i.e. Edges, Hindrances, equipment, etc to affect a character. This can enable such things as Edges directly affecting a characters stats, like the Fleet-Footed Edge.

### Limitations

Currently there are a few limitations to Active Effects

- You can only add, delete or edit an Active Effect on an item when it is not on a character, which means you can only make changes to the item in the sidebar.
- Active Effects can only affect the character they are on, not other `Items` the character owns. This means you cannot at this time create an Ability that changes a skill, as both are owned by the character, but not directly part of the character.

## How to use Active Effects

Active Effects broadly speaking come in two flavours

- On an `Item` such as an Edge or Hindrance
- On the character directly

For a list of attribute keys please look down below

### Active Effects on Actors

#### Player Characters

To add an AE to a character, go to the `Traits` page and click the **\+ Add** button next to **Quick Access**.

![](systems/swade/assets/docs/PC_QuickAccess_Dropdown.png)

Select the type **Active Effect** and enter a name.

![](systems/swade/assets/docs/PC_QuickAccess_AddEffect.png)

Once you click _Create New_ a new AE will be created on the character and its sheet will be opened. From there you can set an icon, duration, etc. At this point in time the AE will not actually do anything. To add an Effect to the AE navigate to the **Effects** tab and click the plus sign. This will add an empty change you can fill out. In most cases you can leave the change mode to _Add_, which adds (or subtracts) the entered value from the property selected by the attribute key.

- To toggle the AE click the on/off symbol next to its name in the list
- To edit the AE, click the edit icon next to its name in the list
- To delete the AE, click the trash bin icon next to its name in the list

#### NPC Characters

Working with Active Effects on NPCs works exactly the same as on player characters, except that the AE have their own section on the NPC sheet and click on the **+** symbol there will quickly create a new AE.

### Active Effects on Items

> You can currently add Active Effects to every type of Item except _Skills_. You can only add, delete or > edit an Active Effect on an item when it is not on a character, which means you can only make changes to > the item in the sidebar.

To add an Active Effect to an `Item` first find the _Active Effects_ header on the item sheet. If the item has an _Actions & Effects_ tab then you can find it there. To add an Active Effect simply click the **+** Icon at the right side of the header.

![](systems/swade/assets/docs/NPC_QuickAccess_AddEffect.png)

Clicking this icon will add a new Active Effect and open it's sheet so you can add the information and effects you require. For a list of attribute keys please look down below.

### Active Effects that affect Items.

Active Effects can also now affect other items. This is done via special syntax in the attribute key. Use Change Mode and Value as usual.

The syntax is `@ItemType{Item Name or ID}[attribute key]` so if you want to add AP to an M-16 you do `@Weapon{M-16}[system.ap]` If you want to improve a skill you do `@Skill{Shooting}[system.die.sides]`

## Attribute Keys

### Actors

#### General

- Default Bennies: `system.bennies.max`
- Current Bennies: `system.bennies.value`
- Max Wounds: `system.wounds.max`
- Current Wounds: `system.wounds.value`
- Max Fatigue: `system.fatigue.max`
- Current Fatigue: `system.fatigue.value`
- Ignored Wounds: `system.wounds.ignored`
- Running Die: `system.stats.speed.runningDie`
- Running Modifier: `system.stats.speed.runningMod`
- Wealth Die

  - Die Sides: `system.details.wealth.die`
  - Modifier: `system.details.wealth.modifier`
  - Wild-Die Sides: `system.details.wealth.wild-die`

#### Initiative

- Level Headed: `system.initiative.hasLevelHeaded`
- Improved Level Headed: `system.initiative.hasImpLevelHeaded`
- Hesitant: `system.initiative.hasHesitant`
- Quick: `system.initiative.hasQuick`

#### Status

- Shaken: `system.status.isShaken`
- Distracted: `system.status.isDistracted`
- Vulnerable: `system.status.isVulnerable`
- Stunned: `system.status.isStunned`
- Entangled: `system.status.isEntangled`
- Bound: `system.status.isBound`

#### Attributes

- Die Type: `system.attributes.<attribute>.die.sides`
- Wild Die: `system.attributes.<attribute>.wild-die.sides`
- Modifier: `system.attributes.<attribute>.die.modifier`
- Encumbrance die step modifier: `system.attributes.strength.encumbranceSteps`
- Unshake bonus: `system.attributes.spirit.unShakeBonus`
- Soak Bonus: `system.attributes.vigor.soakBonus`
- Animal Smarts: `system.attributes.smarts.animal`

#### Derived Stats

- Size: `system.stats.size`
- Pace: `system.stats.speed.value`
- Parry: `system.stats.parry.value`
- Toughness: `system.stats.toughness.value`
- Armor: `system.stats.toughness.armor`
- Parry mod and toughness mod become obsolete with the introduction of Active Effects

#### Additional Stats

- Value: `system.additionalStats.[*key of the Additional Stat*].value`
- Maximum (if applicable): `system.additionalStats.[*key of the Additional Stat*].max`
