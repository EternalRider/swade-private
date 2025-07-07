---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.xx4bfi2ngT6ZT68p'
  _id: xx4bfi2ngT6ZT68p
  name: Attribute Keys
  sort: 400010
  title:
    level: 2
---

These attribute keys are useful for Active Effects, macros, and anything else that interacts with the Foundry Virtual Tabletop API.

### Characters and NPCs

Both Characters and NPCs share similar data structures; the main difference is that characters are _always_ wild cards.

#### General

- Bennies from Reset: `system.bennies.max`
- Max Wounds: `system.wounds.max`
- Ignored Wounds: `system.wounds.ignored`
- Max Fatigue: `system.fatigue.max`
- Ignored Fatigue: `system.fatigue.ignored`
- Numb (Ignore wounds and fatigue): `system.woundsOrFatigue.ignored`
- Enable Conviction: `system.details.conviction.active`
- Size: `system.stats.size`
- Wealth Die
  - Die Sides: `system.details.wealth.die`
  - Modifier: `system.details.wealth.modifier`
  - Wild-Die Sides: `system.details.wealth.wild-die`

#### Movement

- Pace, all speeds: `system.pace`
  - Ground Pace: `system.pace.ground`
  - Fly Pace: `system.pace.fly`
  - Swim Pace: `system.pace.swim`
  - Burrow Pace: `system.pace.burrow`
- Running Die: `system.pace.running.die`
- Running Modifier: `system.pace.running.mod`

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
- Incapacitated: `system.status.isIncapacitated`

#### Attributes

- Die Type: `system.attributes.<attribute>.die.sides`
- Wild Die: `system.attributes.<attribute>.wild-die.sides`
- Modifier: `system.attributes.<attribute>.die.modifier`
- Encumbrance die step modifier: `system.attributes.strength.encumbranceSteps`
- Unshake bonus: `system.attributes.spirit.unShakeBonus`
- Animal Smarts: `system.attributes.smarts.animal`
- Soak Bonus: `system.attributes.vigor.soakBonus`
- Ignore wounds while bleeding out: `system.attributes.vigor.bleedOut.ignoreWounds`
- Bonus to resist bleeding out: `system.attributes.vigor.bleedOut.modifier`

#### Global Modifiers

These are more generic roll bonuses that improve all rolls of a certain category, rather than being tied to a specific attribute or skill. The keys tied to attributes (e.g. Agility) modify both the relevant attribute rolls as well as any skills linked to that attribute.

- Trait: `system.stats.globalMods.trait`
- Agility: `system.stats.globalMods.agility`
- Smarts: `system.stats.globalMods.smarts`
- Spirit: `system.stats.globalMods.spirit`
- Strength: `system.stats.globalMods.strength`
- Vigor: `system.stats.globalMods.vigor`
- Attack: `system.stats.globalMods.attack`
- Damage: `system.stats.globalMods.damage`
- Armor Piercing: `system.stats.globalMods.ap`
- Bennied Trait: `system.stats.globalMods.bennyTrait`
- Bennied Damage: `system.stats.globalMods.bennyDamage`

#### Derived Stats

- Parry: `system.stats.parry.value`
- Toughness: `system.stats.toughness.value`
- Armor: `system.stats.toughness.armor`

Note: Armor, Parry, and Toughness changes will not adjust the actual value if automatic calculations are turned off; they will just display in the hover tooltip. Parry and Toughness have individual toggles available in tweaks, while Armor is tied to Toughness.

#### Additional Stats

- Value: `system.additionalStats.[*key of the Additional Stat*].value`
- Maximum (if applicable): `system.additionalStats.[*key of the Additional Stat*].max`

#### Flags

The following flags enable specialized behavior.

- `flags.swade.ambidextrous`: Allows an actor to add any parry bonus from off-hand weapons as well as blocks the automatic Off Hand penalty.
- `flags.swade.hardy`: Prevents a second shaken result from the Apply Damage workflow from counting as a wound.
- `flags.swade.ignoreBleedOut`: Prevents the application of the "Bleeding Out" status effect on a failed vigor roll upon incapacitation.
- `flags.swade.wildAttackDamage`: Replaces the bonus damage from Wild Attack; if you add 4 to this value, Wild Attacks will grant +4 damage instead of +2.
- `flags.swade.jokerBonus`: Replaces the bonus to trait rolls from having a Joker; if you add 4 to this value, Jokers will grant +4 to trait rolls instead of +2.

### Auras

Every aspect of an aura can be configured by an Active Effect. Generally, the makeup of an aura key is `system.auras`, followed by user-chosen ID for the aura (such as `command` or `courage`) and then the property that should be affected.

You can set up a complete aura this way too. Values that are not supplied by the Active Effect are filled with default values.

- `system.auras.<aura id>.enabled`: Whether the aura is enabled or not. Default: `false`
- `system.auras.<aura id>.walls`: Whether the aura constrained by light-blocking walls or not. Default: `false`
- `system.auras.<aura id>.color`: The color of the aura. Default: the player's color
- `system.auras.<aura id>.alpha`: The transparency of the color. Goes from 0 (completely see-through) to 1 (completely opaque). Default: `0.25`
- `system.auras.<aura id>.radius`: The radius of the aura past the border of the token. Default: `5`
- `system.auras.<aura id>.visibleTo`: Who is this aura visible to? The available options are Hostile (-1), Neutral (0), Friendly (1). These are _not_ relative dispositions. Observers can always see the auras. Default: empty
