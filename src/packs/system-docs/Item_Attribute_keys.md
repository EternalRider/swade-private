---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.UGqkYwOYsfCVwbzZ'
  _id: UGqkYwOYsfCVwbzZ
  name: Item Attribute Keys
  sort: 400020
  title:
    level: 2
---

## Skills

(\<Skill Name\> is replaced by the name of the Skill in Title Case with no quotes, e.g. Weird Science, Fighting), alternately use the uuid of the item.

| Attribute                                       | Modes                                                           | Values                                   |
| :---------------------------------------------- | :-------------------------------------------------------------- | :--------------------------------------- |
| @Skill{\<Skill Name\>}\[system.attribute\]      | Override (5)                                                    | agility, smarts, spirit, strength, vigor |
| @Skill{\<Skill Name\>}\[system.description\]    | Add (2), Override (5)                                           | Text                                     |
| @Skill{\<Skill Name\>}\[system.isCoreSkill\]    | Override (5)                                                    | true, false                              |
| @Skill{\<Skill Name\>}\[system.die.sides\]      | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                  |
| @Skill{\<Skill Name\>}\[system.die.modifier\]   | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                  |
| @Skill{\<Skill Name\>}\[system.wild-die.sides\] | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                  |

## Powers

(\<Power Name\> is replaced by the name of the Power in Title Case with no quotes, e.g. Bolt, Boost/Lower Trait), alternately use the uuid of the item.

### General

| Attribute                                 | Modes                                                           | Values      |
| :---------------------------------------- | :-------------------------------------------------------------- | :---------- |
| @Power{\<Power Name\>}\[system.source\]   | Override (5)                                                    | Text        |
| @Power{\<Power Name\>}\[system.rank\]     | Override (5)                                                    | Numeric     |
| @Power{\<Power Name\>}\[system.pp\]       | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric     |
| @Power{\<Power Name\>}\[system.range\]    | Override (5)                                                    | Text        |
| @Power{\<Power Name\>}\[system.duration\] | Override (5)                                                    | Text        |
| @Power{\<Power Name\>}\[system.damage\]   | Override (5)                                                    | Text        |
| @Power{\<Power Name\>}\[system.ap\]       | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric     |
| @Power{\<Power Name\>}\[system.arcane\]   | Override (5)                                                    | Text        |
| @Power{\<Power Name\>}\[system.favorite\] | Override (5)                                                    | true, false |

### Description

| Attribute                                    | Modes                 | Values |
| :------------------------------------------- | :-------------------- | :----- |
| @Power{\<Power Name\>}\[system.trapping\]    | Override (5)          | Text   |
| @Power{\<Power Name\>}\[system.description\] | Add (2), Override (5) | Text   |

### Properties

| Attribute                                         | Modes                                                           | Values                                 |
| :------------------------------------------------ | :-------------------------------------------------------------- | :------------------------------------- |
| @Power{\<Power Name\>}\[system.innate\]           | Override (5)                                                    | true, fale                             |
| @Power{\<Power Name\>}\[system.templates.cone\]   | Override (5)                                                    | true, fale                             |
| @Power{\<Power Name\>}\[system.templates.stream\] | Override (5)                                                    | true, fale                             |
| @Power{\<Power Name\>}\[system.templates.small\]  | Override (5)                                                    | true, fale                             |
| @Power{\<Power Name\>}\[system.templates.medium\] | Override (5)                                                    | true, fale                             |
| @Power{\<Power Name\>}\[system.templates.large\]  | Override (5)                                                    | true, fale                             |
| @Power{\<Power Name\>}\[system.actions.trait\]    | Override (5)                                                    | Text (Trait Name)                      |
| @Power{\<Power Name\>}\[system.actions.traitMod\] | Override (5)                                                    | Text                                   |
| @Power{\<Power Name\>}\[system.actions.dmgMod\]   | Override (5)                                                    | Text                                   |
| @Power{\<Power Name\>}\[system.activities\]       | Add (2), Override (5)                                           | Text (comma separated list of actions) |
| @Power{\<Power Name\>}\[system.bonusDamageDie\]   | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                |
| @Power{\<Power Name\>}\[system.bonusDamageDice\]  | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                |

## Weapons

(\<Weapon Name\> is replaced by the name of the Weapon in Title Case with no quotes, e.g. Dagger, Brass Knuckles), alternately use the uuid of the item.

### General

| Attribute                                       | Modes                                                           | Values                                                                                                    |
| :---------------------------------------------- | :-------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| @Weapon{\<Weapon Name\>}\[system.source\]       | Override (5)                                                    | Text                                                                                                      |
| @Weapon{\<Weapon Name\>}\[system.category\]     | Override (5)                                                    | Text                                                                                                      |
| @Weapon{\<Weapon Name\>}\[system.quantity\]     | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                                                                   |
| @Weapon{\<Weapon Name\>}\[system.price\]        | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                                                                   |
| @Weapon{\<Weapon Name\>}\[system.equipStatus\]  | Override (5)                                                    | Numeric: Stored (0), Carried (1), Off-Hand (2), Equipped (3), Main Hand (4), Two Hands (5), Backpack (-1) |
| @Weapon{\<Weapon Name\>}\[system.range\]        | Override (5)                                                    | Text                                                                                                      |
| @Weapon{\<Weapon Name\>}\[system.damage\]       | Override (5)                                                    | Text                                                                                                      |
| @Weapon{\<Weapon Name\>}\[system.ap\]           | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                                                                   |
| @Weapon{\<Weapon Name\>}\[system.currentShots\] | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                                                                   |
| @Weapon{\<Weapon Name\>}\[system.shots\]        | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                                                                   |

### Description

| Attribute                                      | Modes                 | Values |
| :--------------------------------------------- | :-------------------- | :----- |
| @Weapon{\<Weapon Name\>}\[system.description\] | Add (2), Override (5) | Text   |

### Properties

| Attribute                                                  | Modes                                                           | Values                                                          |
| :--------------------------------------------------------- | :-------------------------------------------------------------- | :-------------------------------------------------------------- |
| @Weapon{\<Weapon Name\>}\[system.trademark\]               | Override (5)                                                    | Numeric: None (0), Regular (1), Improved (2)                    |
| @Weapon{\<Weapon Name\>}\[system.parry\]                   | Override (5)                                                    | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.rof\]                     | Override (5)                                                    | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.minStr\]                  | Override (5)                                                    | Text                                                            |
| @Weapon{\<Weapon Name\>}\[system.weight\]                  | Override (5)                                                    | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.notes\]                   | Override (5)                                                    | Text                                                            |
| @Weapon{\<Weapon Name\>}\[system.ammo\]                    | Override (5)                                                    | Text                                                            |
| @Weapon{\<Weapon Name\>}\[system.reloadType\]              | Override (5)                                                    | Text: none, self, single, full, magazine, battery, power points |
| @Weapon{\<Weapon Name\>}\[system.ppReloadCost\]            | Override (5)                                                    | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.rangeType\]               | Override (5)                                                    | Numeric: Melee (0), Ranged (1), Mixed (2)                       |
| @Weapon{\<Weapon Name\>}\[system.actions.trait\]           | Override (5)                                                    | Text (Trait Name)                                               |
| @Weapon{\<Weapon Name\>}\[system.actions.traitMod\]        | Override (5)                                                    | Text                                                            |
| @Weapon{\<Weapon Name\>}\[system.actions.dmgMod\]          | Override (5)                                                    | Text                                                            |
| @Weapon{\<Weapon Name\>}\[system.activities\]              | Add (2), Override (5)                                           | Text (comma separated list of actions)                          |
| @Weapon{\<Weapon Name\>}\[system.bonusDamageDie\]          | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.bonusDamageDice\]         | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.isArcaneDevice\]          | Override (5)                                                    | true, false                                                     |
| @Weapon{\<Weapon Name\>}\[system.arcaneSkillDie.sides\]    | Override (5)                                                    | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.arcaneSkillDie.modifier\] | Override (5)                                                    | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.powerPoints.value\]       | Override (5)                                                    | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.powerPoints.max\]         | Override (5)                                                    | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.isVehicular\]             | Override (5)                                                    | true, false                                                     |
| @Weapon{\<Weapon Name\>}\[system.mods\]                    | Override (5)                                                    | Numeric                                                         |
| @Weapon{\<Weapon Name\>}\[system.isHeavyWeapon\]           | Override (5)                                                    | true, false                                                     |
| @Power{\<Power Name\>}\[system.templates.cone\]            | Override (5)                                                    | true, fale                                                      |
| @Power{\<Power Name\>}\[system.templates.stream\]          | Override (5)                                                    | true, fale                                                      |
| @Power{\<Power Name\>}\[system.templates.small\]           | Override (5)                                                    | true, fale                                                      |
| @Power{\<Power Name\>}\[system.templates.medium\]          | Override (5)                                                    | true, fale                                                      |
| @Power{\<Power Name\>}\[system.templates.large\]           | Override (5)                                                    | true, fale                                                      |
| @Weapon{\<Weapon Name\>}\[system.grantOn\]                 | Override (5)                                                    | Numeric: Added (0), Carried (1), Readied (2)                    |

## Armor

(\<Armor Name\> is replaced by the name of the Armor in Title Case with no quotes, e.g. Leather Armor, Chainmail)

### General

| Attribute                                    | Modes                                                           | Values                                                                                                    |
| :------------------------------------------- | :-------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| @Armor{\<Armor Name\>}\[system.source\]      | Override (5)                                                    | Text                                                                                                      |
| @Armor{\<Armor Name\>}\[system.category\]    | Override (5)                                                    | Text                                                                                                      |
| @Armor{\<Armor Name\>}\[system.quantity\]    | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                                                                   |
| @Armor{\<Armor Name\>}\[system.price\]       | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                                                                   |
| @Armor{\<Armor Name\>}\[system.equipStatus\] | Override (5)                                                    | Numeric: Stored (0), Carried (1), Off-Hand (2), Equipped (3), Main Hand (4), Two Hands (5), Backpack (-1) |
| @Armor{\<Armor Name\>}\[system.armor\]       | Override (5)                                                    | Numeric                                                                                                   |
| @Armor{\<Armor Name\>}\[system.toughness\]   | Override (5)                                                    | Numeric                                                                                                   |

### Description

| Attribute                                    | Modes                 | Values |
| :------------------------------------------- | :-------------------- | :----- |
| @Armor{\<Armor Name\>}\[system.description\] | Add (2), Override (5) | Text   |

### Properties

| Attribute                                                | Modes                                                           | Values                                       |
| :------------------------------------------------------- | :-------------------------------------------------------------- | :------------------------------------------- |
| @Armor{\<Armor Name\>}\[system.isNaturalArmor\]          | Override (5)                                                    | true, false                                  |
| @Armor{\<Armor Name\>}\[system.isHeavyArmor\]            | Override (5)                                                    | true, false                                  |
| @Armor{\<Armor Name\>}\[system.isArcaneDevice\]          | Override (5)                                                    | true, false                                  |
| @Armor{\<Armor Name\>}\[system.arcaneSkillDie.sides\]    | Override (5)                                                    | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.arcaneSkillDie.modifier\] | Override (5)                                                    | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.powerPoints.value\]       | Override (5)                                                    | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.powerPoints.max\]         | Override (5)                                                    | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.minStr\]                  | Override (5)                                                    | Text                                         |
| @Armor{\<Armor Name\>}\[system.weight\]                  | Override (5)                                                    | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.mods.value\]              | Override (5)                                                    | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.mods.max\]                | Override (5)                                                    | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.energy.value\]            | Override (5)                                                    | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.energy.max\]              | Override (5)                                                    | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.energy.enabled\]          | Override (5)                                                    | true, false                                  |
| @Armor{\<Armor Name\>}\[system.notes\]                   | Override (5)                                                    | Text                                         |
| @Armor{\<Armor Name\>}\[system.actions.trait\]           | Override (5)                                                    | Text (Trait Name)                            |
| @Armor{\<Armor Name\>}\[system.actions.traitMod\]        | Override (5)                                                    | Text                                         |
| @Armor{\<Armor Name\>}\[system.actions.dmgMod\]          | Override (5)                                                    | Text                                         |
| @Armor{\<Armor Name\>}\[system.bonusDamageDie\]          | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.bonusDamageDice\]         | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                      |
| @Armor{\<Armor Name\>}\[system.activities\]              | Add (2), Override (5)                                           | Text (comma separated list of actions)       |
| @Armor{\<Armor Name\>}\[system.grantOn\]                 | Override (5)                                                    | Numeric: Added (0), Carried (1), Readied (2) |

## Shields

(\<Shield Name\> is replaced by the name of the Shield in Title Case with no quotes, e.g. Buckler, Large Shield)

### General

| Attribute                                      | Modes                                                           | Values                                                                                                    |
| :--------------------------------------------- | :-------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| @Shield{\<Shield Name\>}\[system.source\]      | Override (5)                                                    | Text                                                                                                      |
| @Shield{\<Shield Name\>}\[system.category\]    | Override (5)                                                    | Text                                                                                                      |
| @Shield{\<Shield Name\>}\[system.quantity\]    | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                                                                   |
| @Shield{\<Shield Name\>}\[system.price\]       | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                                                                                   |
| @Shield{\<Shield Name\>}\[system.equipStatus\] | Override (5)                                                    | Numeric: Stored (0), Carried (1), Off-Hand (2), Equipped (3), Main Hand (4), Two Hands (5), Backpack (-1) |
| @Shield{\<Shield Name\>}\[system.parry\]       | Override (5)                                                    | Numeric                                                                                                   |
| @Shield{\<Shield Name\>}\[system.cover\]       | Override (5)                                                    | Numeric                                                                                                   |

### Description

| Attribute                                      | Modes                 | Values |
| :--------------------------------------------- | :-------------------- | :----- |
| @Shield{\<Shield Name\>}\[system.description\] | Add (2), Override (5) | Text   |

### Properties

| Attribute                                                  | Modes                                                           | Values                                       |
| :--------------------------------------------------------- | :-------------------------------------------------------------- | :------------------------------------------- |
| @Shield{\<Shield Name\>}\[system.isArcaneDevice\]          | Override (5)                                                    | true, false                                  |
| @Shield{\<Shield Name\>}\[system.arcaneSkillDie.sides\]    | Override (5)                                                    | Numeric                                      |
| @Shield{\<Shield Name\>}\[system.arcaneSkillDie.modifier\] | Override (5)                                                    | Numeric                                      |
| @Shield{\<Shield Name\>}\[system.powerPoints.value\]       | Override (5)                                                    | Numeric                                      |
| @Shield{\<Shield Name\>}\[system.powerPoints.max\]         | Override (5)                                                    | Numeric                                      |
| @Shield{\<Shield Name\>}\[system.minStr\]                  | Override (5)                                                    | Text                                         |
| @Shield{\<Shield Name\>}\[system.weight\]                  | Override (5)                                                    | Numeric                                      |
| @Shield{\<Shield Name\>}\[system.notes\]                   | Override (5)                                                    | Text                                         |
| @Shield{\<Shield Name\>}\[system.actions.trait\]           | Override (5)                                                    | Text (Trait Name)                            |
| @Shield{\<Shield Name\>}\[system.actions.traitMod\]        | Override (5)                                                    | Text                                         |
| @Shield{\<Shield Name\>}\[system.actions.dmgMod\]          | Override (5)                                                    | Text                                         |
| @Shield{\<Shield Name\>}\[system.bonusDamageDie\]          | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                      |
| @Shield{\<Shield Name\>}\[system.bonusDamageDice\]         | Multiply (1), Add (2), Downgrade (3), Upgrade (4), Override (5) | Numeric                                      |
| @Shield{\<Shield Name\>}\[system.activities\]              | Add (2), Override (5)                                           | Text (comma separated list of actions)       |
| @Shield{\<Shield Name\>}\[system.grantOn\]                 | Override (5)                                                    | Numeric: Added (0), Carried (1), Readied (2) |

##
