---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.xx4bfi2ngT6ZT68p'
  id: xx4bfi2ngT6ZT68p
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
- Pace: `system.stats.speed.value`
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
