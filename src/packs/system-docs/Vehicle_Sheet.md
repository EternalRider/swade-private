---
id: xXe8NXRCtmpUUigh
title: Vehicle Sheet
sort: 800000
key: '!journal.pages!8uC7RTgJOg8SW4cf.xXe8NXRCtmpUUigh'
---

In the _Savage Worlds Adventure Edition_ system for Foundry VTT, vehicles are created as Actors rather than items.

## Tweaks

As expected, the settings under Tweaks for vehicle sheets have some differences from Character Sheet and NPC Sheet.

- **Max Wounds:** The Maximum number of Wounds the vehicle can take before it is Wrecked.
- **Ignore Wounds:** The number of Wound penalties the vehicle can ignore for the operator’s maneuvering rolls.
- **Maximum Cargo Weight:** The maximum cargo weight a vehicle can hold before becoming encumbered. The system does not apply any Trait penalties if the cargo weight exceeds this value. (This is an unofficial stat not present in the core rules, but some GMs might find this useful for more realistic settings.)
- **Maximum Mods:** The maximum number of Mods allowed on the vehicle. See Vehicles in System Settings.

### Initiative

These options affect how drawing Action Cards for Initiative is handled for the given character, respecting the rules for those Edges and Hindrances accordingly. See Running Savage Worlds in Foundry VTT for more details.

### Additional Stats

Displays fields for Additional Stats as defined in the System Settings’ Setting Configurator.

## Prototype Token

You can configure a default token directly from the sheet via the Prototype Token option in the character sheet’s title bar.

Details about Prototype Tokens can be found on the [Foundry VTT website](https://foundryvtt.com/article/tokens/).

## Vehicle Sheet Header

The vehicle sheet header contains the majority of the vehicle’s stats, specifically the following:

- Handling
- Top Speed
- Size
- Toughness
- Armor
- Scale
- Classification

### Statuses

The vehicle sheet also contains checkboxes for the following statuses:

- Out of Control
- Wrecked

## Summary Tab

### Operator

The operator is the individual making the maneuvering rolls for the vehicle. You can drag any NPC or character from the Actors Directory onto the vehicle sheet to assign the operator for the vehicle.

### Wounds

This field displays the current number of Wounds the Vehicle has. The slider increases and decreases the Wounds with a range of 0 to its maximum number of Wounds before being Wrecked.

### Maneuver Check

When the Maneuver Check button is clicked, the system rolls the Operation Skill based on the operator’s Skill die type. If the operator does not have the associated Skill, it rolls an Unskilled Attempt.

### Required Crew

This pair of fields includes the minimum required crew needed to operate the vehicle and the current number of required crew available.

With a crew notation of “2+8”, the first number is the minimum number needed and would be entered into the field on the right.

### Optional Passengers

This pair of fields includes the maximum number of passengers that can be accommodated on the vehicle and how many are currently present.

With a crew notation of “2+8”, the second number is the maximum number allowed and would be entered into the field on the right.

### Mods

Modifications added to the vehicle are listed in this section.

### Weapons

The weapons list is populated by marking any weapons in the Cargo tab as Vehicular and Equipped.

**Chat Card:** As with the eye or chat icons on other sheets, the eye icon to the right of the weapon listing will create an interactive card in the Chat displaying any actions assigned to the weapon.

## Cargo Tab

The Cargo tab is where all inventory for the vehicle is initially listed. Vehicular weapons that are equipped are relocated to the Weapons section of the Summary tab.

Cargo can be added by either the “+Add” button or by dragging items from the Items Directory in the sidebar.

## Description Tab

The Description Tab contains three fields.

- **Operation Skill:** Select from Boating, Driving, Piloting, or Riding.
- **Alternative Skill:** If no pre-defined Skill is selected, you may enter a custom Skill name.
- **Description:** You can add any special notes about this vehicle in this field.
