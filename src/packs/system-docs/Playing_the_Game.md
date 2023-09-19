---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.IQk83Jmto9VQWXNS'
  id: IQk83Jmto9VQWXNS
  name: Playing the Game
  sort: 0
---

If this is your first time using the Foundry Virtual Tabletop, please check out the official [Knowledge Base](https://foundryvtt.com/kb/) for the software; the Savage Worlds system builds on top of the base Foundry functionality, and this guide is focused on the system-specific details.

## Combat Tracker

The SWADE system applies a couple of modifications to Foundry’s Combat Tracker to align it with Savage Worlds’ Initiative rules.

Characters are given cards drawn from the Action Deck table.

If a character has the Level Headed, Improved Level Headed, or Hesitant active in the Tweaks settings in their Actor sheet, the Combat Tracker will take into account those features.

At the start of a new round, Action Cards are automatically drawn for each character. If a Joker was drawn in the previous round, the cards are shuffled (read: the table is reset) before Action Cards are distributed.

## Rewarding Bennies

GMs can quickly reward Bennies from the Players List in the bottom left of the screen.

To the right of each player listing is the number of Bennies they currently have. Clicking on this number increments the number of Bennies by one.

Right-clicking on any player name displays a context menu with additional options:

- **Give a Benny:** Gives the player a single benny as above.
- **Refresh Bennies:** Resets the selected player’s characters’ Bennies to their Bennies Reset value as indicated in their character sheet.
- **Refresh All Bennies:** Resets all player’s Bennies as above.

## Using Area Templates

The _Savage Worlds Adventure Edition_ system for Foundry adds custom Cone, Blast and Stream Templates to the Measurement Controls toolbar. The icons for the templates are as follows:

- **<span class='fa-solid fa-location-pin fa-rotate-90'></span>** Cone Template
- **<span class='fa-solid fa-rectangle-wide'></span>** Stream Template
- **<span class='fa-solid fa-circle-1 fa-2xs'></span>** Small Blast Template
- **<span class='fa-solid fa-circle-2 fa-sm'></span>** Medium Blast Template
- **<span class='fa-solid fa-circle-3 fa-lg'></span>** Large Blast Template

For more information on how to use the area of effect templates in Foundry, see [Measurement and Templates on the Foundry VTT website](https://foundryvtt.com/article/measurement/).

## Vision

The _Savage Worlds Adventure Edition_ system expands upon the base [Foundry token vision handling](https://foundryvtt.com/article/tokens#token-vision).

### Detection Modes

_Savage Worlds_ supports two additional detection modes; **See Heat** and **Sense Heat**. These two modes allow a token to see any token in range that does _not_ have the **cold-bodied** status; See Heat is blocked by walls, while Sense Heat is not. This detection mode ignores both ordinary illumination as well as the foundry-native invisible condition. Tokens that are visible only through this heat vision have a unique color filter overlaid.

![Infravision Demo](systems/swade/assets/docs/Infravision.png)
