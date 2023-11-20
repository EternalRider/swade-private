---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.pUgyiLLEp1WQh7Ag'
  _id: pUgyiLLEp1WQh7Ag
  name: System Settings
  sort: 500000
---

The Official Savage Worlds system for Foundry VTT offers a number of game settings you can configure to fine tune your game. This is not a comprehensive list, but instead provides additional info beyond the hint associated with each setting.

## Automatic Initiative

Progressing to the next round using the Combat Tracker automatically deals Action Cards if this is enabled. If a Joker was drawn, Foundry automatically shuffles the deck before dealing initiative for the new round.

## Card Deck to Use for Initiative

This setting allows you to select a custom card deck to use for initiative. For example, if you purchase a module containing a custom Action Deck or upload the [VTT Deadlands: the Weird West Action Deck](https://www.peginc.com/store/vtt-deadlands-the-weird-west-action-deck/), you can select that deck to use for Initiative.

## Ammunition Management

Automates ammunition usage. This is further controlled by weapon settings.

- If both halves of the Shots counter are empty, the weapon won't use ammo. Otherwise, the system tries to match ammo options by name; if the ammo field is empty, it will suggest options from your inventory.

- If Reload Procedure is set to **none**, using any trait roll will directly pull from the linked ammunition, bypassing the Shots counter.

  - If the ammo is a _gear_ type item, it will use the quantity.

  - If the ammo is a _consumable_ type item, it will use the charges.

- If the Reload Procedure is set to **self**, using the weapon will reduce its quantity and reset its shots counter whenever it runs out (e.g. for a throwing axe set max shots to 1, but for a can of bear spray that has 5 uses per can set max shots to 5)

- If the Reload Procedure is set to **single**, each press of the Reload button will reduce the quantity of the gear item by 1 and increase the shots counter by 1.

- If the Reload Procedure is set to **full**, each press of the Reload button will attempt to completely refill the shots counter and reduce the gear item by the corresponding amount. If there isn't enough ammo left in your inventory, it will conduct a partial reload and reduce the quantity to zero.

- If the Reload Procedure is set to **magazine**, you reload by selecting specific consumables that both match the name listed in the Ammo field as well as are themselves set to the Magazine subtype. In addition, the magazine's max charges must be set to match the weapon's max shots. This lets you select from magazines from a dialog that shows their current shots remaining. This does not currently allow for ammo with special properties.

- If the Reload Procedure is set to **battery**, it works similar to a magazine but the consumable's max charges are always out of 100\. A partially used battery has its charges set proportional to the shots used (e.g. if you discharge a battery after firing 10/20 shots, the battery will have 50/100 charges).

- If the Reload Procedure is set to **Power Points**, each press of the Reload button will reduce the linked power points by the "Power Points to Reload" value and refresh the shots counter to max.
