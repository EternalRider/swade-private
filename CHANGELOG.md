# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/)

<!--
## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

### Known Issues
-->

## 4.0.1

### Fixed

- Data prep failure due to bad type declaration. (#1169) **by @jpmeehan5**

## 4.0.0

SWADE v4 brings compatibility with Foundry v12 and drops compatibility with Foundry v11

### Added

- Added data model for Poker cards. **by @jpmeehan5**
- `userConnected` hook event listener for modifying GM Bennies when a player logs in or drops out. (#1161) by **@kristianserrano**
- A new Context Menu option to adjust the GM's currently available Bennies. (#1161) by **@kristianserrano**

### Changed

- Updated `system.json` to match new data structure. (#1047) **by @jpmeehan5**
- The system tile in the Setup screen now uses the newer, prettier background image as new SWADE worlds. **by @jpmeehan5**
- All uses of `icon` and `label` in Active Effects has been migrated to `img` and `name` respectively, in alignment with updated schema from Foundry. (#1047) **by @jpmeehan5**
- Added stricter data validation to UUIDs for both Item Grants and Macro actions. (#1003) **by @florad92**
- The ChoiceDialog now displays the name of the parent item. (#1158) **by @florad92**
- When refreshing GM Bennies, the number set is based on the current number of active, non-GM users. (#1161) by **@kristianserrano**
  - If a user later logs in, the number of Bennies increases by 1.
  - If a user later leaves, the number of Bennies decreases by 1. (Of course the Benny is restored if they return.)
  - If a user refreshes their browser, the above `userConnected` hook event listeners trigger accordingly.
  - If a GM refreshes their Bennies before any players join, the above events will modify the GM's Bennies appropriately.
- All text enrichment is now handled asynchronously in getData. (#1155) **by @jpmeehan5**

### Deprecated

- Finished deprecation of Embedded Abilities. (#1163) **by @florad92**
- Finished deprecation of `SwadeItem._getPowerPoints()`. **by @florad92**
- Finished deprecation of `SwadeItem.getTraitModifiers()`. **by @florad92**
- Finished deprecation of `SwadeItem.needsFullReloadProcedure()`. **by @florad92**
- Finished deprecation of `SwadeActor.isEncumbered`. **by @florad92**
- Finished deprecation of `SwadeActor.race`. **by @florad92**

### Removed

- Removed `template.yml` (which compiled to template.json). Information about the document subtypes available in the system is now available in `system.json`. (#1047) **by @jpmeehan5**
- Setting configuration for the number of GM Bennies has been removed. (#1161) by **@kristianserrano**

### Fixed

- NPC item chat cards should once again be hidden when the relevant setting has been enabled (#1142) **by @florad92**
- Roll rerolls should now properly copy the roll mode from the original roll message. (#1142) **by @florad92**
- Additional Stats max value inputs should now have the correct placeholder. (#1147) **by @florad92**
- The number of GM Bennies in a player's Players List would not update when they logged in. The Players List now rerenders any time a User is updated. (#1161) by **@kristianserrano**
- The Full Reload property now works again (#1165) **by @michaeldougherty1976**
- Action items should now roll damage actions with bonus damage properly. (#1163) **by @florad92**

### Known Issues

- Due to changes in foundry's Canvas and rendering Auras have been disabled for the time being.

## 3.4.1

### Fixed

- Fixed filenames for the PEG Action deck for operating systems where file names are case-sensitive. This will not affect any existing action decks (#1133) **by @florad92**
- The trait roll dialog now works as labeled. (#1135) **by @jpmeehan5**
- The `jokerBonus` flag now correctly also modifies damage rolls. (#1137) **by @jpmeehan5**

## 3.4.0

### Added

- Added new default action deck provided by PEG. This deck is available as a preset in the Cards creation dialog. (#1115) **by @jpmeehan5**
- Added a new actor flag, `jokerBonus`, that can be used to override the default +2 bonus to trait rolls for having a joker. (#1110) **by @jpmeehan5**
- Added `SwadeRoll` the Roll class at the beginning of the `CONFIG.Dice.rolls`, making it the default for RollTables and chat rolls. (#1099) **by @florad92**
- Added a tooltip to the character name field on sheets to be able to read long character names. **by @mhilbrunner**
- Added AP as an additional field to damage actions that works as an override. (#720) **by @gunnar.busch**
- Updated Translations

### Changed

- The chat message sent when using a charge on a consumable item now respects the roll mode and can be localized. (#1105) **by @florad92**
- The advance round dialog no longer pops up multiple times. (#1116) **by @florad92**
- The `Ignore` checkbox in the Roll Dialog has been flipped to be an `Active` checkbox to avoid confusion. (#1111) **by @florad92**
- The topmost roll formula in the Roll Dialog has been removed as it was not adding any useful information. (#1111) **by @florad92**
- `SwadeActor#toggleActiveEffect` now also accepts a status ID as the first argument. (#1125) **by @florad92**
- Groups followers under leaders before combat begins. (#1087) **by @kristianserrano**
- The Combat Tracker now properly scrolls to the current turn whenever the Combat Tracker is updated. (#1098) **by @kristianserrano**
- Changes the Combat Tracker initiative button labels from "Roll" to "Deal". This is Savage Worlds after all! **by @kristianserrano**
- Players without permissions no longer see the names of actors they don't have permissions for when their image is shared from a sheet. (#1112) **by @mhilbrunner**

### Fixed

- Resolved a bug involving Joker detection for unlinked tokens. **by @jpmeehan5**
- The character sheet should now correctly show if a hindrance is Major or Minor again. (#1122) **by @florad92**
- Single reloads should no longer fail when no ammo is set while reloading from the inventory is disabled. (#1120) **by @florad92**
- Fixed a bug where a logged out player could cause their bennies to go to the GM during Joker's Wild (#1071) **by @jpmeehan5 and @michaeldougherty1976**
- Fixed some hardcoded i18n strings **by @mhilbrunner**
- Fixed errors in edges. (#1108) **by @xphenomen**
- Fixed unfollowers not being able to draw cards because the previously assigned `initiative` value remained. **by @kristianserrano**
- Fixes `hasRolled` (i.e., has drawn initiative) always being `true` even when it wasn't. **by @kristianserrano**
- Fixes an interrupting Combatant's `initiative` value not being set accurately when acting after the current Combatant.. **by @kristianserrano**
- Fixed Items with only Macro Actions not displaying the Actions in the sheet. **by @kristianserrano**

## 3.3.11

### Fixed

- Ambushing combatants should now receive cards again at the beginning of the surprise round. (#1101) **by @kristianserrano**

## 3.3.10

### Added

- Added the `SwadeActor.getCombatant` function that returns the actor's combatant for a given combat encounter. (#1089) **by @florad92**

### Fixed

- Rerolls from chat cards now respect the roll mode dropdown above the chat input. (#1092) **by @florad92**
- Creating and deleting an Active Effect on an unowned item during a combat encounter no longer causes the operation to fail. (#1089) **by @florad92**
- The CompendiumTOC should now properly scale tokens again. (#1088) **by @florad92**

## 3.3.9

### Changed

- Updated translations.

### Fixed

- Fixed a bug that would cause the main window to scroll up if the user was zoomed in during a dice roll. (#1086) **by @jpmeehan5**

## 3.3.8

### Fixed

- Fixed an issue that could cause the combat tracker to throw errors when rendering if one or more combatants have no actor. **by @florad92**
- Fixed an issue that could cause an infinite loop when determining if a combatant is defeated could cause an infinite loop when determining if a combatant is defeated could cause an infinite loop when determining if a combatant is defeated... **by @florad92**

## 3.3.7

### Changed

- Extras are now considered defeated when they are incapacitated and/or dead. **by @florad92**

### Fixed

- Fixed an issue that would prevent the Setting Configurator from opening when world compendiums were present. (#1078) **by @florad92**
- The `Defeated` status should now have the correct status ID. (#1081) **by @florad92**
- Fixes marking a character as defeated in the combat tracker resulting in not setting the `turn` value to `0` when advancing to a new round. (#1080) **by @kristianserrano**

## 3.3.6

### Added

- Armor Tooltip now provides a full breakdown of Torso armor sources. (#1019) **by @jpmeehan5**
- The width of the Character Sheet is now configurable. (#1060) **by @mhilbrunner**
- Added new documentation on how to resolve damage. (#1057) **by @florad92**

### Changed

- The dropdown to select the injury table now sorts tables by module. (#1054) **by @florad92**
- Skills now have the same set of options for the die size as attributes. (#1017) **by @florad92**
- Related Active Effects are now applied as a single operation. (#1056) **by @florad92**
- The NPC sheet now displays the benny and Conviction controls for all NPCs. (#991) **by @florad92**
- The roll chat commands now default to using the `SwadeRoll` class. (#753) **by @florad92**
- Improved the styling and visibility of Conviction messages. (#815) **by @florad92**
- Tours will now attempt to progress even if not all permissions are available, e.g. changing world settings (#1014) **by @jpmeehan5**
- Improved translation and added missing translation keys. (#1070, #1065, #1063) **by @mhilbrunner**

### Fixed

- Grouping by name now checks `combatant.name` first. (#1050) **by @kristianserrano**
- Group leaders and followers can now go on hold independently. (#532) **by @kristianserrano**
- Fixes initiative sorting. (!550, #1043) **by @kristianserrano**

## 3.3.5

### Fixed

- Fixed an error that would cause damage rolls to fail if the damage formula included `@str` on an actor with a strength of 1. (#1068) **by @florad92**

## 3.3.4

### Fixed

- Fixed an issue that would cause an erroneous warning message to be displayed for weapons that had shots set to 0/0 and a reload procedure of `None`. (#1058) **by @florad92**

## 3.3.3

### Fixed

- Fixed an issue that would cause Item Grants to be applied multiple times. (#1052) **by @florad92**

## 3.3.2

### Changed

- Consumables now show a warning when they have not enough charges left to consume all the requested charges. (#1044) **by @florad92**
- Ancestral Abilities now show a much more informative deprecation message. (#1042) **by @kristianserrano**
- Inputs subject to an active effect are now disabled on the character sheet, to match the underlying form behavior. (#1102) **by @jpmeehan5**

### Fixed

- Fixed a small issue that would prevent active effects from properly rendering in the quickaccess (#1048) **by @florad92**
- Bleeding out now properly applies the defeated condition again. (#1049) **by @jpmeehan5**

## 3.3.1

### Fixed

- Fixed an issue that causes card draws to render multiple times. **by @florad92**
- Fixed a small issue that would improperly determine local draws for initiative. **by @florad92**
- Fixed an issue with the display of Quick Access **by @jpmeehan5**
- Fixed an issue that caused the editor on item sheets to have a height of 0. **by @florad92**
- Fixed an issue that would cause the combat to reset to turn 0 when a combatant goes off hold. (#1041) **by @florad92**
- Fixed issues with misapplication of Gritty Damage rules (#1102) **by @jpmeehan5**

## 3.3.0

### Added

- Added new type of JournalEntryPage: Headquarters, which can represent a Base from the SPC, a Stronghold from the FC, or a Lodge from the HC. (#918) **by @jpmeehan5**
- Hindrances can now more precisely define whether they are Major, Minor or a choice of either. (#980) **by @florad92**
- Weapons can now more precisely define whether they are purely ranged, purely melee or a mix of both. (#951) **by @florad92**
- Added a tooltip that shows Player Character Hindrances and NPC Wild Card benny counts of the current scene when hovering over a name in the Player list. You can only see the hindrance list if you have at least Limited Ownership over the actor. Only GMs see the NPC Wild Card tooltip. (#881) **by @florad92**
- Added a new flag for actors, `wildAttackDamage`, that modifies the bonus damage granted by the Wild Attack status. (#987) **by @jpmeehan5**
- The roll dialog now displays a hint message when no modifiers are present on the roll. **by @florad92**
- Added the following new hooks: (#798) **by @florad92**
  - `swadePreReloadWeapon`
  - `swadeReloadWeapon`,
  - `swadeRefreshGmBennies`
  - `swadeRefreshBennies`
- Added context menu option to card decks to set them as the Action Deck. (#975) **by @jpmeehan5**
- Added two new global modifiers to support the Elan and No Mercy edges (`system.stats.globalMods.bennyTrait` and `system.stats.globalMods.bennyDamage` respectively). (#779) **by @jpmeehan5**
- Added a dialog to select a new group leader combatant when the current leader is marked as defeated. (#943) **by @florad92**
- Added Incapacitation effect and a corresponding toggle in the Combat Tracker. **by @florad92**
- Added more tours. **by @jpmeehan5**
  - Advances (#888)
  - Headquarters (#955)
- Added the `swadePreCalcWounds` hook. Thanks goes to @mclemente for the great ideas. (#754) **by @florad92**
- Added the Ambush Assistant application, which lets you set which combatants/group leaders start a surprise round on hold, with a normal card draw or have no turn at all. (#751) **by @florad92**
- Added dialogs that pop up when advancing/reverting a round in order to prevent accidental changing of the round. (#869) **by @florad92**
- Added the `Refresh` button to the Item sheet headers. This will refresh the item with the newest version from a compendium (if the item originally came from a compendium). Items that are not owned or grant items cannot be refreshed. (#1027) **by @javierriveracastro**
- Redrawing an Action Card now causes a card draw message to be created, even if the card remains the same. (#1036) **by @florad92**
- Added documentation for the system hooks. (#872) **by @gunnar.busch**
- Added additional translation strings.

### Changed

- Moved Combat Tracker documentation to a separate page and expanded its coverage. (#890) **by @jpmeehan5**
- The `swade-app` style framework now handles coloring the scrollbars. **by @florad92**
- Improved the display of notes in the inventory tab. (#964) **by @florad92**
- Refactored a large number of functions on SwadeActor and SwadeItem to use the system data model instead of type guards. (#935) **by @jpmeehan5**
  - Deprecated `SwadeItem.getTraitModifiers()` in favor of a proper getter, `SwadeItem.traitModifiers`
  - Deprecated `SwadeItem.needsFullReloadProcedure()` in favor a proper getter, `SwadeItem.usesAmmoFromInventory`
  - Deprecated `SwadeItem._getPowerPoints` in favor of a proper getter, `SwadeItem.powerPointObject`
  - [BREAKING] Removed \_isReloadPossible() as redundant
  - [BREAKING] Moved \_createChargeUsageMessage to #createChargeUsageMessage, making it fully private
- Rearranged item sheet header inputs for localization. (#850) **by @florad92**
- Restored the ability to open the source item for transferred effects on the NPC and Vehicle sheet by clicking on the effect's name. (#962) **by @jpmeehan5**
- Reorganized files of the character sheet to be more cohesive with the rest of the system. (#1005) **by @florad92**
- Changed the way initiative card draw results are rendered to chat. You can now choose between a compact message, the original and no message. Draw results now also include the discarded cards. (#1004) **by @florad92**
- You can no longer have negative wounds or fatigue. **by @florad92**
- Accordions on the character sheet now remember whether they were opened or closed when re-rendering the sheet. (#964) **by @florad92**
- Ending a combat encounter now removes the Hold status from any tokens that had it. **by @florad92**
- The current action deck can no longer be used to layout a chase. To lay out a chase, either create a new Action deck from the presets or duplicate the existing deck. **by @jpmeehan5**
- Linked many more labels to their relevant inputs, improving form usage. (#854) **by @jpmeehan5**
- Move the option to redraw initiative away from a context menu. You can now click the drawn card in the combat track to start drawing a new card. (#1032) **by @florad92**

### Fixed

- Assigning a new card to a combatant should no longer fail if the card had already been drawn previously. (#908) **by @florad92**
- Non-GMs can now drag&drop effects and items from and to Item Sheets. (#988) **by @florad92**
- Opening a Journal Entry Page link for the first time from the Compendium TOC will now directly take you to that specific entry, rather than just open the journal. (#953) **by @jpmeehan5**
- Item Grants no longer throw an error if an item could not be found. **by @florad92**
- Active Effects will no longer cause permission errors when applying related effects. (#1006) **by @florad92**
- The A.E.G.I.S. should no longer reset duration, name and expiration behavior when a change is added. (#1015) **by @florad92**
- Players are now once again prompted if they should draw a card during initiative. (#536) **by @florad92**
- Fixed a CSS issue with effect descriptions that used lists. **by @jpmeehan5**
- _Defeated_ Combatants no longer cause effects to expire. **by @florad92**
- Fixed broken compendium links in the Character sheet. (#965) **by @florad92**
- Actions on `action` items should now display correctly on the quickaccess (#999) **by @jpmeehan5**
- Combatants no longer loose their card if they've held their turn. (#1030) **by @florad92**
- Text enrichment on the character sheet now no longer fails for grandchild documents. (#964) **by @florad92**

## 3.2.5

### Fixed

- Fixed an issue that would reset maximum or current power points for a pool when updating either value. (#997) **by @florad92**

## 3.2.4

### Changed

- Further improved data cleanup methods for Power Points. (#995) **by @florad92**

## 3.2.3

### Added

- Added a migration to fix actors with bad power points data. **by @florad92**

### Fixed

- Fixed compendium compilation breaking the display of system docs on the Forge. (#982) **by @florad92**
- Fixed a strength of 1 resulting in a negative maximum encumbrance. (#989) **by @jpmeehan5**

## 3.2.2

### Added

- Added documentation on how to use Auras with Active Effects. **by @florad92**

### Fixed

- Auras should no longer throw errors when trying render an aura for a token without actors. (#979) **by @florad92**
- Vehicle actors should no longer throw uncaught errors when gathering roll data. (#978) **by @florad92**

## 3.2.1

### Fixed

- Fixed some console errors that could pop up when importing actors with active effects from a compendium. **by @jpmeehan5**
- The AEGIS/Active Effect Wizard should once again recognize when changes are made. (#976) **by @florad92**
- Fixed validation issues with system edge compendium. **by @florad92**
- Fixed an issue that would cause custom auras not to be filled with default values. **by @florad92**
- Deleting Items with grants should no longer display an error in the console. **by @florad92**

### Changed

- Changed handling for the `override` field on items to ensure that data doesn't linger between prepareData cycles. (#977) **by @jpmeehan5**

## 3.2.0

### Added

- Added ability to create documents within a compendium TOC. (#883) **by @jpmeehan5**
- The Compendium TOC now lists an edge's requirements. (#879) **by @jpmeehan5**
- Added more trait die options above d12 to the Attribute Manager. (#919) **by @florad92**
- Added Running and Unfamiliar as preset trait roll modifiers. (#880) **by @jpmeehan5**
- Added categories to the edges in the base system. (#925) **by @jpmeehan5**
- The NPC and Vehicle sheets now also show effects inherited from items. (#910) **by @jpmeehan5**
- Added a number of Tours to explain the system. (#800) **by @jpmeehan5**
  - Ammunition (#887)
  - Tweaks (#938)
  - Additional Stats (#937)
  - Auras (#936)
- Added the ability to display auras on the canvas. This is the first iteration of the Auras feature. Auras can be configured in an actor's tweaks. (#797) **by @florad92**
- Improved Documentation of SWADE's unique vision types. (#885) **by @jpmeehan5**
- Added indicator to granted hindrances if it's a major hindrance. (#874) **by @jpmeehan5**
- Exposed the MappingField and AddStatsValueField for developers **by @jpmeehan5**
- Added the Savage Worlds ID (SWID for short). The SWID is a non-unique identifier that allows one to identify an item and its derived from the Item's name. For more information please see the System documentation. (#957) **by @florad92**
  - Added a migration that sets SWIDs on all items based on their current name.
  - Added a new setting to set the SWID of the item that should be used to calculate Parry.
  - [BREAKING] Refactored the parry calculation to take advantage of the newly introduced SWID.
- Improved API documentation for module developers. (#945) **by @jpmeehan5**
- Added the ability to drag&drop Attributes into the Macro hotbar from the character and NPC sheet. (#145) **by @florad92**

### Changed

- [BREAKING] Macro additional actions now execute with the Foundry default actor assignment, rather than always setting `actor` to be the actor that's the source of the macro action. The 3.1 functionality is available through a dropdown menu underneath the UUID to change the `actor` from "Default" to "Self". (#924) **by @jpmeehan5**
- [BREAKING] The Scale value on vehicles is now automatically derived from their size. **by @jpmeehan5**
- Clicking on an inherited effect on the Character sheet no longer opens the source item in addition to expanding the description. Instead, a tooltip will display on hover that states the source's name. (#929) **by @jpmeehan5**
- Introduced tabs to the Actor Tweaks window. (#932) **by @florad92**
- Refactored SwadeActor and SwadeItem data preparation to make use of the system data model. (#934) **by @jpmeehan5**
- Replaced all references, including in translation keys, to race with ancestry. A migration has been provided. (#942) **by @florad92**
- If created on an Item, Active Effects will now default to using the name and image of the parent Item. (#927) **by @florad92**
- Changed the background parchment image for compendiums and character sheets for one that tiles better when expanded. **by @florad92**
- Refactored how Edges record their requirements. There are several requirement types which can take a SWID as a reference to the item or value being required. (#625) **by @florad92**
- The Advance Editor now saves changes automatically. (#972) **by @florad92**
- Updated development dependencies (only relevant to developers building local versions). **by @florad92**

### Deprecated

- SwadeActor.isEncumbered is deprecated in favor of SwadeActor.system.encumbered, and will be removed in Version 4.0. (#934) **by @jpmeehan5**
- Deprecated the `parryBaseSkill` setting in favor of the `parryBaseSwid`

### Fixed

- Scaled Token images should now properly display in the Compendium TOC. (#895) **by @florad92**
- Ignoring wounds now correctly also reduces wound penalties to pace. (#920) **by @jpmeehan5**
- Fixed override data on items targeted by Active Effects. (#933) **by @jpmeehan5**
- Restored icons for skills on the Character Sheet. (#921) **by @florad92**
- Resist actions on weapons should no longer attempt to consume ammunition. (#923) **by @florad92**
- Fixed incorrect placeholders for additional stats. (#939) **by @florad92**
- Adding actions to an item via drag&drop should once again work as expected on items without prior actions. (#940) **by @florad92**
- Fixed an issue that would prevent magazine and battery reloads performing properly. (#948) **by @florad92**
- Chat messages for Major and Minor hindrances are no longer reversed. **by @jpmeehan5**
- Fixed the currency field overriding, rather than adding or subtracting, if the enter key was pressed. (#517) **by @jpmeehan5**
- Fixed an issue where the Power Point field on actors would not be properly initialized with a `general` field. **by @jpmeehan5 and @florad92**
- Fixed a race condition that could cause attribute dice to display the wrong value. (#926) **by @jpmeehan5**
- Fixed additional stat display breaking if it was enabled then disabled while you have an active effect. (#669) **by @jpmeehan5**
- Restored functionality of Item creation buttons on the Vehicle Sheet. (#956) **by @florad92**
- Fixed the display of bulleted lists in power descriptions. (#954) **by @jpmeehan5**
- Fixed a bug with source HTML editors in the biography sub-tab of the about tab. (#950) **by @jpmeehan5**
- Fixed a bug that prevented the execution of macro actions under certain circumstances. (#970) **by @florad92**

## 3.1.4

### Fixed

- Added a migration to active effects that replaces the `skillMod` and `skill` keys with the newer `traitMod` and `trait` keys (#915) **by @florad92**

## 3.1.3

### Fixed

- Fixed an issue in the action property shims that would prevent the use of active effects on said properties. **by @florad92**
- Fixed added some data sanitization to actors. (#911) **by @florad92**
- Fixed bug that prevented actor sheet from rendering if a piece of armor had a missing armor or toughness value **by @jpmeehan5**

## 3.1.2

### Fixed

- Fixed an issue that prevent adding Items to an actor via the character sheet. (#904) **by @jpmeehan5**
- Actors with a wealth die status of Broke are no longer considered invalid. (#909) **by @florad92**

## 3.1.1

### Fixed

- Fixed an issue that could cause incorrect data to be created when updating an item

## 3.1.0

### Added

- Enabled full text search in Compendiums and added many fields to be searchable. (#792)
  - Actors: archetype, appearance, notes, goals, species name, rank, vehicle classification.
  - Items: Ability subtype, notes, source, requirements, rank, trapping, power's arcane background.
  - You can find the searchable fields listed in `CONFIG.textSearch.{docname}`, e.g. `CONFIG.textSearch.actor`.
- Added the `Desperate Attack` modifiers to the Roll Dialog. (#847) **by @florad92**
- Added a new Reload Procedure: `self`, for javelins, grenades, spray canisters, and anything else that depletes its own quantity to attack. (#763) **by @jpmeehan5**
- Added the new action type `macro` which allows users to save the UUID of a Macro to then later execute it. The triggering item is available in the Macro context under the `item` variable. Please keep in mind that normal permission limitations for Macros still apply! (#684) **by @florad92**
- Added the ability for Action Items to specify Measured Templates. (#837) **by @florad92**
- Added new property `shield` to `system.stats.parry` to represent a Character's shield bonus to parry. (#712) **by @jpmeehan5**
- Added tooltip to Parry and Toughness to list out their sources. (#832) **by @jpmeehan5**
- Added tooltip to Armor that shows both sources and Armor by location. (#137) **by @jpmeehan5**
- Improved handling of off-hand weapons and added support for Ambidextrous edge via `flags.swade.ambidextrous`. (#590) **by @jpmeehan5**
- Added the ability to read Active Effect descriptions in the Item Sheet. (#861) **by @florad92**
- Added Item actions to consumables. (#581) **by @florad92**
- Added support for ignoring wounds from a second Shaken result via `flags.swade.hardy` and bleeding out from a failed vigor roll upon incapacitation via `flags.swade.ignoreBleedOut`. (#785) **by @jpmeehan5**
- Hovering over the Size input on the character or NPC sheet displays the actor's scale in a tooltip. An Actor's scale has been available at `system.stats.scale` for data purposes. (#60) **by @jpmeehan5**
- You can now configure localized vehicle operator skills. (#373) **by @mclemente**

### Changed

- Updated base system Compendiums to SWADE 5.0. (#863) **by @jpmeehan5**
- **[BREAKING]** Implemented the System Data Model, which provides strong type checking on all fields. (#794) **by @florad92 and @jpmeehan5**
- The character sheet now displays the full modifier for a trait roll and even includes a tooltip breaking down the constituent modifiers. (#826) **by @florad92**
- Roll modifiers from active effects are no longer ignored by default. (#826) **by @florad92**
- The `Entangled` status now applies the `Vulnerable` status instead of the `Distracted` status. (#846) **by @florad92**
- Changed the label for the input which determines the amount of trait dice that are being rolled for actions to make it more universal. (#823) **by @florad92**
- The `swadeAction` Hook is no longer triggered if the trait or damage roll was cancelled. (#812) **by @florad92**
- The `Frightened` status effect now applies the Hesitant Hindrance and also disables other initiative related edges. (#811) **by @florad92**
- **[BREAKING]** Changed the property name of the default trait of an item from `skill` to `trait`. This means `system.actions.skill` has now become `system.actions.trait`. A migration and data shims have been provided. (#837) **by @florad92**
- **[BREAKING]** Changed the properties of additional actions to reflect their more universal nature, see the list below. A migration and data shims have been provided. (#837) **by @florad92**
  - `rof` -> `dice`
  - `shotsUsed` -> `resourcesUsed`
  - `skillMod` and `dmgMod` have been combined into `modifier`
  - `skillOverride` and `dmgOverride` have been combined into `override`
- **[BREAKING]** Folded `system.stats.parry.modifier` and `system.stats.toughness.modifier` into the existing `system.stats.parry.value` and `system.stats.toughness.value` with a migration into becoming an Active Effect. **by @jpmeehan5**
- The secondary parry value now represents `system.stats.parry.shield` instead of `system.stats.parry.modifier`, and operates like armor - it's a calculated field if parry is auto calculated on the Actor, otherwise it's manually editable. **by @jpmeehan5**
- **[BREAKING]** The calcArmor, calcToughness, and calcParry methods are now private - the appropriate properties should be accessed by `system.stats.toughness.armor`, `system.stats.toughness.value`, and `system.stats.parry.value` respectively. These properties were already accessible and were the correct avenue of access prior to this update. **by @jpmeehan5**
- Improved the UI for editing actions on Items. (#864) **by @florad92**
- The SWADE Cone template is now a special case when a cone's angle is set to 0. Otherwise, cones will use the base Foundry calculations as determined by your core settings. (#873) **by @jpmeehan5**
- Improved styles for the character sheet for dealing with linebreaks in the attributes section. (#255) **by @florad92**
- Significantly updated the system journal documentation to modern system functionality. (#868) **by @jpmeehan5**

### Deprecated

- Started depreciation of Embedded Abilities in favor of Item Grants. (#827) **by @florad92**

### Removed

- Removed the setting that replaced the core `Entangled` effect with the version from the Fantasy Companion as that version has replaced the core version. (#846) **by @florad92**
- Removed the `SWADE.Settings.FantasyCompanionEntangle` translation keys as they are no longer needed. (#846) **by @florad92**
- Removed the ability to convert Journal Compendiums to decks. (#858) **by @florad92**

### Fixed

- Compendium TOC Category Headers should no longer be orphaned at the bottom of a column. (#806) **by @florad92**
- Cleaned up errors that would display in console after successfully deleting an Item that had grants. (#803) **by @florad92**
- Improved magazine reload related i18n. (#865) **by @florad92**
- Overriding parry or toughness now works correctly when the fields are set to auto calculation. (#462) **by @jpmeehan5**
- Fixed turn alert sounds playing twice when round advanced. (#841) **by @jpmeehan5**
- Fixed an issue that would cause active effects changing skill modifiers not to be disabled correctly. (#862) **by @florad92**
- Fixed an issue where the Active Effect Wizard would not save the name of the effect on refresh. **by @jpmeehan5**
- Fixed the NPC sheet not having an option to create consumables (#899) **by @jpmeehan5**
- Fixed the NPC sheet not including consumable weights while calculating encumbrance. **by @jpmeehan5**
- Attribute rolls now respect global modifiers again. (#901) **by @florad92**

## 3.0.6

### Changed

- When an actor with the Hesitant hindrance draws a joker as one of their two cards they now get the joker automatically instead of choosing whether or not they receive that card. **by @florad92**

### Fixed

- Power Point reloads should now once again work regardless of whether reloading from the inventory is set. (#857) **by @florad92**
- Redrawing cards in combat now correctly no longer applies Initiative edges. (#855) **by @florad92**
- Fixed missing styles on the effect favorite button of the Item Sheet. (#860) **by @florad92**

## 3.0.5

### Added

- Added a migration that will fix broken Item Grant UUIDs from world Items. Some grants have been broken by a previous migration which added an additional document type to the start of the UUID (#842) **by @florad92**

### Fixed

- Fixed an issue that would cause the effect duration dialog to display `undefined` instead of the name of the effect. (#844) **by @florad92, based on a solution by @SalieriC**
- Fixed an i18n issue that would cause new item names to start with `New` regardless of language. (#840) **by @florad92**
- Fixed an issue that prevented active effects from being deleted via the quickaccess. (#849) **by @florad92**
- Fixed an issue with Item Grants ignoring name and image overrides (#848) by **by @florad92**

## 3.0.4

### Added

- Added A migration that should de-duplicate active effects, deleting v10 active effects that were copied from an Item.

### Changed

- Enabled the display of an item's description in the quickaccess independent of whether it has actions or not. **by @florad92**

### Fixed

- Fixed an issue that prevented vehicle actors from using weapons. (#833) **by @florad92**
- The ability to toggle all AE from quickaccess has been restored. (#831) **by @florad92**
- Added a translation string to differentiate between roll as a verb and as a noun. (#828) **by @florad92**
- Full Reloads with base consumables should now work as expected again. (#835) **by @florad92**
- The `Prone` condition should now use the localized Parry Base skill, as defined in the settings. (#838) **by @florad92**

## 3.0.3

### Added

- Added additional translation strings.

### Changed

- Refactored the detection of jokers to better take advantage of core foundry methods. **by @florad92**
- Other refactors and optimizations to the `isWildcard` and `hasArcaneBackground` getters. **by @florad92**
- Refactored the way critical failures are detected. Single-die rolls made by extras now request the critical failure to be confirmed, while multi-die rolls are automatically detected as critical failures. This gives GMs the option to leave the roll as a regular failure, in case a critical failure offers no different outcome. Critical Failures for wildcards should now also be detected more accurate to the rules. **by @florad92**

### Fixed

- Fixed related status effects not applying properly. **by @florad92**

## 3.0.2

### Fixed

- The cone template should once again have the expected shape. (#819) **by @florad92**
- Took care of depreciation warnings which could happen in the combatant config. (#820) **by @florad92**
- Updated localizations.

## 3.0.1

### Fixed

- The `Called Shot: Limbs` modifier should once again be localized properly (#817) **by @florad92**
- The Ranks should now be properly localized again in the character sheet. (#818) **by @florad92**
- The wild attack and coldbodied icon SVGs were missing their width and height attributes which could make foundry fail to load scenes on Firefox. **by @florad92**

## 3.0.0

### Added

- Increased FVTT maximum version to 11. (#715) **by @jpmeehan5**
- Added module recommendations to the system manifest. (#791) **by @florad92**
- Added system thumbnail image for the setup screen (#813) **by @jpmeehan5**
- Added the `category` property to Action and Ability items. (#805) **by @jpmeehan5**
- You can view an effect's duration and description by clicking on its name in the Effects tab. (Courtesy of Foundry v11, Effects now have a rich text editor to add descriptions). (#769) **by @jpmeehan5**
- Wild Attack has been added as a status that provides a global attack and damage boost. (#613) **by @jpmeehan5**
- You may now apply global modifiers to trait rolls, attack rolls, damage rolls, or attributes & their linked skills. (#420) **by @jpmeehan5**
  - AE key is `system.stats.globalMods` with properties `trait`, `agility`, `smarts`, `spirit`, `strength`, `vigor`, `trait`, `attack`, `damage`, and 'AP', so a bonus to say agility and all agility-linked skills would call `system.stats.globalMods.agility`.
- Wild Cards who are incapacitated by damage are now prompted to resist injury, bleeding out, and possible death (#249) **by @jpmeehan5**
- Added support for the Heroes Never Die setting rule (#756) **by @jpmeehan5**
- Added new "swadeIncapacitation" hook that triggers when an actor is incapacitated by damage (#756) **by @jpmeehan5**
- `MeasuredTemplate` placables now contain the UUID of the triggering item as a flag under `swade.origin` (#796) **by @mclemente**
- Player character actors are now automatically created with linked actor data the Token disposition set to Friendly in all cases. (#808) **by @florad92**

### Changed

- Addressed deprecation warnings pertinent to v11. (#715) **by @jpmeehan5**
- The base system compendiums now come in a folder, courtesy of FVTT version 11's built-in compendium folders. (#781) **by @jpmeehan5**
- You may now edit active effects on an item that is on an actor (#770) **by @jpmeehan5**
- Active Effects attached to an item no longer transfer to the actor when applied. Instead, they remain on the item and can be favorited to show up in the Quick Access menu. (#770) **by @jpmeehan5**
- **[Breaking]** Trait roll modifiers from active effects that ADD to trait.die.modifier no longer directly increase that value. Instead, they are saved in an array that is applied during the roll dialog, allowing you to see each modifier individually and toggle them with the Ignore checkbox. (#447) **by @jpmeehan5**

### Fixed

- Addressed compendium bugs created in the update to v11 (#793) **by @jpmeehan5**
- Extras using the Character sheet can now once again set their Max bennies via the tweaks window. (!342) **by @kristianserrano**
- Added missing translation keys for Additional Stats. (#809) **by @florad92**
- Improved translation keys for Additional Stats placeholders (#810) **by @florad92**

## 2.4.2

### Added

m

- Added the `Upgrade` option to the possible modes in the AEGIS. (#786) **by @florad92**
- Added an input for the Soak Bonus to the Tweaks window. (#790) **by @florad92**

### Changed

- Restricted the input calculation to only affect the currency field on the NPC and Character sheet. (#772) **by @florad92**

### Fixed

- Fixed an issue with token bars which could lead to errors when maximum wounds or maximum fatigue are 0. (#787) **by @florad92**
- Roll results should no longer linewrap if they are too long. (#776) **by @florad92**

## 2.4.1

### Fixed

- Fixed the locale code for brazilian portuguese.

## 2.4

### Added

- Added the ability to set the equip status/location by holding modifier keys (Ctrl, Shift, Alt) when dropping inventory items onto the official Character and Vehicle sheets. (#727) **by @florad92**
  - Shift: Weapons and other equippable items are equipped.
  - Ctrl: Items are set to be carried
  - Alt: Items are set to be Stored
- Added the `swadePreRollSkill` and `swadePreRollAttribute` hooks. (#757) **by @florad92**
- Added a soak modifier. This value can be found in the tweaks dialog and the AE Key is `system.attributes.vigor.soakBonus`. (#745) **by @jpmeehan5**
- Added support for the `Unarmored Hero` Setting Rule. The toggle for this rule can be found in the _Setting Configurator_. (#756) **by @jpmeehan5**
- Added Support for the following languages, through the Foundry-Hub Weblate integration.
  - Español
  - Català
  - Galego
  - Euskera
  - Português (Brasil)

### Changed

- Token attribute bars for wounds now properly go from green to yellow to red as wounds accumulate. (#742) **by @florad92**
- Token attribute bars for fatigue now go from light to dark blue as fatigue accumulates. (#742) **by @florad92**
- Changing the _Fantasy Companion Entangle_ setting will now properly ask for a client reload. **by @florad92**
- **[BREAKING]** the the `swadeRollSkill` and `swadeRollAttribute` hooks now fire AFTER the roll has been constructed evaluated through the Roll Dialog. (#757) **by @florad92**
- The Prone status effect now applies the proper penalties. (#251) **by @jpmeehan5**
- A power's AP now only displays if a value is actually present. (#551) **by @jpmeehan5**
- Updated translations.

### Fixed

- Fixed a small issue with a label in the Tweaks window. (#780) **by @florad92**
- Fixed an issue that would cause the roll modifier normalizations would fail to recognize a number without a leading sign. (#782) **by @florad92**
- Shields should once again display their notes in the inventory tab of the Character Sheet. (#783) **by @florad92**
- Fixed an issue where improper status penalties were applied when the character was _Entangled_. (#784) **by @florad92**
- Fixed a small spacing issue on the NPC sheet. (#760) **by @jpmeehan5**

### Known Issues

- Holding down Shift when dragging an item from the sidebar will prevent the drag event. This is seems to be a foundry or browser quirk.

## 2.3.6

### Fixed

- Fixed an issue that would cause status effects to apply multiple times. (#766)
- Fixed an issue that would cause battery reloads to behave abnormally under certain conditions. (#764)
- Pace is no longer clamped to a minimum of 1 but wound penalties alone cannot reduce it below 1. (#768)
- Fixed a display issue in the document tweaks.
- Fixed an issue which could allow characters to reload with magazines/batteries that are not actually in their inventory.

## 2.3.5

### Added

- Added additional translation strings
- Added a the `swadeTakeDamage` hook that is called after damage is applied. (#733)

### Changed

- Changed "Equipped" to "Installed" for vehicle mods and weapons. (#758)
- Successfully soaking all wounds from an attack now clears the Shaken condition if the targeted actor was already Shaken. (#741)
- Rolling a critical failure on a soak roll now stops rerolls, unless the Dumb Luck setting rule is enabled. (#744)

### Fixed

- Fixed an issue that could stop weapon sheets from rendering if their reload type was set to PP Reload without having a parent actor. (#761)
- Fixed an issue that could cause a status effect to apply related effects multiple times. (#762)
- Fixed a broken translation string in the Tweaks window. (#759)

## 2.3.4

## Fixed

- Fixed an issue that would cause the vehicle sheet to throw an error when trying to open the driver sheet but no driver was set. (#752)
- Fixed an issue where the Damage Application would not identify damage as being enough to Shake the target. (#740)
- The drag&drop workflow for combatants has been restored on the popped-out combat tracker. (#750)
- Melee weapons should no longer throw a warning about ammo consumption. (#748)
- Item Grants should now properly reflect name and image changes in the source item. (#696)

## 2.3.3

### Fixed

- Fixed an issue where the result of a vigor soak roll was not properly recognized. (#738)
- Fixed an issue where weapons would not be properly recognized as melee weapons. (#737)

## 2.3.2

### Fixed

- Fixed an issue where reloads would not be properly processed when set to full or single reloads and no ammo was set

## 2.3.1

### Added

- Added the option to force migration on an Item, Actor or Scene compendium. You can find this option by right-clicking a compendium in the sidebar.

### Changed

- Closing the roll dialog when soaking counts the same as rolling a 0.
- Consumables will now automatically be set to have a max of 100 charges when they are set to be batteries.
- Improved the reload UI for batteries. They now display the battery charge percentage instead of charges like magazines.

### Fixed

- Dropping items onto the Properties tab of item sheets should now be properly recognized on the whole tab
- Fixed an issue where reloads would stop early when the actor was not set to reload from the inventory

## 2.3.0

### Added

- Added swade-specific roll classes which can be found in the global `CONFIG.Dice` object.
  - `SwadeRoll` which is used for general rolls like running and the wealth die. (#691)
  - `TraitRoll` which is used for skill and attribute rolls. (#677)
  - `DamageRoll` which is used for damage rolls. (#678)
- Added support for the "Dumb Luck" setting rule which allows rerolls on critical failures. You can find the toggle in the Setting Configurator. (#588)
- Added race and archetype getters to the `SwadeActor` that return the appropriate item if the actor has one.
- Added the option to display a disclaimer at the top of a Compendium TOC. The disclaimer is set with the `options` object when instantiating a TOC.
- Item actions can now be flagged to be Heavy Damage. Thanks goes to Drental! (!290)
- Added the ability to refresh power points. Thanks goes to ChaosOS! (#666) (!291)
- Added the ability to specify the number of additional damage dice to be rolled. Thanks goes to John Stevens! (#707) (!293)
- Added the ability to toggle encumbrance using an Active Effect. (#708)
- Added the unshake bonus to the tweaks menu. Thanks goes to John Stevens! (#709) (!294)
- Added the ability for certain status effects to add related status effects when they are created.
- Added a toggle to consumables that can mark consumables as batteries or magazines. Thanks goes to ChaosOS! (#578) (#725) (!292)
- Added the ability for consumable items to be used to refill shots in weapons. (#714) (#725)(#578) (!292)
  - Magazines are consumables that can be loaded into and removed from a weapon.
  - The contents of the magazine are loaded into the weapon. For example if a weapon has 1 shot left and you load a magazine with 30 rounds then a magazine with 1 shot is placed in the inventory and the 30 shots are put into the weapon.
  - Empty magazines and batteries can be discarded in the reload dialog. If you choose not to discard the magazine or battery it will be placed into a stack in the inventory.
  - Batteries are consumable that refill a weapon based on a percentage charge, e.g a weapon with a capacity of 10 will gain 2 shots from a battery with 20/100 charges.
  - Tooltips that contain information about the currently loaded ammunition are available on the item chat card and the weapon item sheet.
- Added the ability to reload weapons with Power Points. To enable this feature set the reload type to "Power Points" and set the Ammunition field to the Arcane Background that should be used.
- Added font color variables to `.swade-app` class
- Added additional translation strings.

### Changed

- Changed the roll dialog to expect one of the three new `Roll` classes
- The small, medium and large burst template checkboxes now show the full name of the template on hover in the weapon and power item sheets.
- Races and archetypes have been reworked and now get added to the character. A character can only have one race and one archetype at a given time and a warning will be shown if you attempt to add a second. For player characters the race and archetype can be accessed by clicking their names on the sheet header. NPCs have their race and archetype shown in the `Special Abilities` section of the NPC sheet.
- The Compendium TOC should now load much quicker for actor compendiums. (#680)
- Weapons now properly display the item damage modifier in addition to the regular base damage in the inventory. (#661)
- Replaced some unused translations (#703)
  - `SWADE.ItemEdit` -> `SWADE.Ed`
  - `SWADE.ItemDelete` -> `SWADE.Del`
- The `WIKI` link now leads to the System Documentation compendium instead of to the GitLab wiki. (#701)
- NPC actors can now also use the official character sheet and the themed setting versions. Thanks goes to Kristian Serrano! (!297)
- Changed the way reloading behaves. (!292)
  - The "Does not need reload action" checkbox has been replaced by the Reload Type "None"

### Fixed

- The Unskilled Attempt should once again receive the appropriate -2 modifier when created. (#698)
- Added locale-based sorting to character summarizer. (#706)
- Restored the ability to sort powers via drag&drop on the character sheet. (#710)
- Restored the ability to sort items via drag&drop on the npc sheet. (#710)
- Descriptions in item chat cards can now be viewed by anyone who can see the chat cards instead of just Users with Owner or Observer permissions. (#722)
- Having multiple copies of the same linked actor as tokens on the scene should no longer cause status effects to be removed if an even number of tokens is present. (#724)

## 2.2.5

### Fixed

- Selection type additional stats show up properly again on item sheets

### Changed

- Invalid additional stats keys now get corrected in the Setting Configurator.
- Item Grants on consumables can no longer be set to trigger when the item is readied as consumables cannot be readied. (#694)

## 2.2.4

### Fixed

- Armor should no longer add to toughness unless it is equipped
- The selection options input for item additional stats should now be displayed again properly.
- Selection-type additional stats should no longer keep item and actor sheets from opening if the string is empty.

## 2.2.3

### Fixed

- The system TOC should once again be enabled and also not overwrite setting TOC apps.
- Fixed a technical issue that could cause granted items to be granted multiple times.

## 2.2.2

### Fixed

- Dropping Macros now should properly revert to core behavior if the item isn't owned (#682)
- Setting themed Compendium TOC apps should no longer get overwritten by the system version

## 2.2.2

### Fixed

- Dropping Macros now should properly revert to core behavior if the item isn't owned (#682)
- Setting themed Compendium TOC apps should no longer get overwritten by the system version

## 2.2.1

### Changed

- Player character sheets now always show quantity on the inventory tab. (#679)

### Fixed

- Fixed missing editor on item sheets. (#681)

## 2.2.0

### Added

- Added the `swadeReady` hook that is called when the system has done all the necessary setup it needs. Alongside the hook there is now a global indicator called `game.swade.ready` that returns whether the system is ready. (#630)
- Added the new property `unStunBonus` to the `vigor` attribute. The full active effect key is `system.attributes.vigor.unStunBonus` and the effect expiration workflow for the Stunned effect has been adjusted as well to respect this modifier. (#652)
- Added a limited version of the Player Character sheet that only displays appearance, biography, name and artwork. (#573)
- Added the `Selection` additional stat. You can set a semicolon separated list in the Setting Configurator which will be available to items and actors as a dropdown style Additional Stat. (#541)
- Added an option to turn off currency for NPCs to the Setting Configurator. (#634)
- Consumable type items can now display a small chat notification when a charge is used. This can be toggled per item and defaults to enabled. (#610)
- Added the ability for items to grant other items. Physical items (such as weapons and gear) can grant items when the granting item is equipped or added to the actor. Edges, Hindrances and Abilities grant items only when they're added to the actor. When a granting item is removed, all items granted by the granting item are removed alongside it.
  - To add a item to be granted simply drag&drop it from the item sidebar or a compendium onto the item sheet of the granting item.
  - Any item type can be granted.
  - Unlike races and archetypes, granted items are copied from their original item (in the world or compendium, wherever it came from) so you can make changes to the granted item before it is granted and the changes will be reflected without you having to delete and re-add the granted item. When a granting item is removed, all items granted by the granting item are removed alongside it.
- Added the `swadeActorPrepareDerivedData` hook which runs for every actor during their data preparation and gives modules the opportunity to more easily and cleanly adjust actor data such as replacing the maximum carry capacity.
- Added the ability to ignore points of fatigue by adding to the `system.fatigue.ignored` property and also added an input for this to the Tweaks window. (#596)
- Added support to reduce the total penalty of Wounds and Fatigue (such as from the Relief power in the Fantasy companion). To set the amount of ignored points you can use an ActiveEffect using the key `system.woundsOrFatigue.ignored`. (#596)
- Added a section for ActiveEffects to the vehicle sheet. (#550)
- Power items can now be marked as innate. This data is not used currently but helps lay foundations for future expansions of the power system. (#671)
- Added a System Documentation Journal compendium. The docs are a snapshot of the current system wiki and somewhat outdated. We will over time update the docs to make them more easily usable and up to date. Thanks to ChaosOS! (#624)
- Added additional translation strings.

### Changed

- The Wild Die config now also supports selecting a die preset instead of just a theme. Thanks to Kristian Serrano! (!257)
- In order to better facilitate Item Grants alongside Race/Archetype embedded items you are now required to drop items onto their respective tabs, see the list below:
  - Granted items -> Properties tab
  - Arcane Device powers -> Powers tab
  - Embedded Items -> Archetype/Racial Abilities tab

### Fixed

- ActiveEffects with a duration set in seconds will now properly reset the time when prompted to do so in the expiration dialogue.
- Dragging an item from an actor sheet to the hotbar should no longer create the core macro alongside the swade macro (#674)
- Fixed tokens not properly rendering under occlusion (such as overhead tiles) (#670)

### Known Issues

- Item Grants with circular references are currently possible and might result in 1 or more extra items created but should not cause endless loops.

## 2.1.7

### Fixed

- Shields once again display cover in the inventory. (#659)
- Shields should no longer show a No Ammo warning when using the default trait action. (#660)
- Active Effects with negative values on values should no longer produce a `NaN` result. (#646)

## 2.1.6

### Added

- Added `Infravision` vision mode to go along with the `See Heat` and `Sense Heat` detection modes. To use the Vision mode go to the Token settings and select the vision mode from the dropdown.
- Added additional translation strings.

### Changed

- Improved the visual representation of See/Sense Heat detection modes.

### Fixed

- Fixed an issue that would prevent the roll dialog to add bonus damage to dice rolls.
- Fixed the missing migration that was supposed to happen with system version `2.1.0`. If nothing happens you can run `game.swade.migrations.migrateWorld()` in either the devtools or as a script macro.

### Known Issues

- In order to properly use the See/Sense Heat detection modes you need to add an instance of Basic Sight to the token detection, even if it has Basic Sight already. Add the Basic Sight after you've added the See/Sense Heat mode, set the range to 0 and uncheck the checkbox to disable Basic Sight.

## 2.1.5

### Changed

- Action trait modifiers now use the term "Action Trait Modifier" in the roll instead of the action name.

### Fixed

- Action chat cards should now display the default trait again.
- Unsigned integers should no longer cause action modifiers to fail.
- Damage actions should use the proper damage values again.
- Skills on NPC sheets should be sorted alphabetically again.
- Clicking on bennies on the character sheet once again causes one to be spent.

## 2.1.4

### Fixed

- Power Points on the actor sheet should once again be in sync with Power Points in chat cards. (#645)
- Power Points should show up on the Quick Access properly again. (#645)
- Power Point pools that are not the "All" pool on the NPC sheet should once again have the proper Power Point controls displayed.

## 2.1.3

### Fixed

- Powers can once again be added to arcane devices. (#627)
- The text editor in the Advance Editor should once again be functional. (#642)

## 2.1.2

### Fixed

- Default trait and damage actions should once again work on chat cards as expected

## 2.1.1

### Fixed

- Resistance rolls should now properly trigger off of non-action items again.
- Fixed the missing Effects tab on the Actions item sheet.

## v2.1.0

### Added

- Added an "Is Ammunition" checkbox to Gear type items. Weapon item sheets now filter this for the ammunition suggestions as well. Please keep in mind that these are just suggestions. You can set anything as ammunition for a weapon if you put its name into the appropriate input. (#556)
- You can now configure the starting currency for both Player Characters and NPCs in the Setting Configurator. Note that this is only relevant for newly created Actors. Actors that get imported retain their already set currency amount. (#569)
- Player Character actors can now record whether they're Incapacitated. As per the rules, Incapacitated characters only draw a single card every round, no matter which Edges or Hindrances they have. Extras are marked as defeated/dead when they become Incapacitated. (#579 / #317)
- Added the _Attribute Manager_ app, which can be opened via the small gear icon next to the Attribute header on the player character and NPC sheets. Using the _Attribute Manager_ you can now set the _base values_ for the die, modifier and wild die of all attributes. Using Active Effects will now properly convert the value from die sides to a static modifier e.g. adding 2 sides to a d12 will result in d12+1. (#362)
- Weapons and Armor items can now record whether they're Heavy Weapons or Heavy Armor respectively. (#548)
- Added the `SwadeActor#hasHeavyArmor` getter which returns whether the actor has any heavy armor equipped. (#548)
- Added an application to the system settings which can be used to quickly set which compendiums use the Compendium TOC app. (#608)
- Added the Active Effect Guided Implementation System (AEGIS, or just Active Effect Wizard), which is an application to quickly create Active Effects from common Presets. The app can be opened on the Character and Item sheets by clicking on the "Add Active Effect" button on the effects tab and selecting the appropriate option from the dropdown. If the resulting Active Effect has no changes after submission, the Foundry Active Effect sheet is opened. On the NPC sheet you can open the app by clicking the **+** icon in the header of the effects section. Alternatively you can Shift-Click to add and open an empty Active Effect. (#557)
- Toggling the `Hold` status effect now also toggles the hold status of a combatant in the Combat tracker. Thanks to Kristian Serrano. (!247)
- Added Vision and Detection modes for Infravision. Thanks to Joseph Meehan. (!248)
  - The vision and detection modes do not work when the scene has Global Illumination enabled.
  - `See Heat` is restricted by walls.
  - `Sense Heat` is not restricted by walls.
  - Tokens with the `Invisible` Status Effect can still be detected with Infravision.
  - Adding the `Cold-Bodied` Status Effect makes a token invisible to Infravision.
- Added the ability to remove items from the Quick Access directly to the Quick Access. Thanks to Kristian Serrano. (!249)
- Added a toggle for always showing the general Power Point pool on an actor sheet. Thanks to Joseph Meehan. (!255)
- Added a new Item type - Action Items. Thanks to Richard Gaywood.
  - Just like other items, Action Items can contain trait rolls, and these can contain all the usual modifiers.
  - Action Items do not need to be attached to, or associated with, specific gear.
  - Action Items can be dragged onto character sheets and will appear in the Actions tab.
  - These are good for reminding yourself of specific rules in the moment, eg Grappling, Networking, Pushing, Chases, etc.
- Added a new action type - Resist. Thanks to Richard Gaywood.
  - Resist rolls are Trait rolls, but instead of being linked to the character who placed the card in chat they apply to whichever token is selected when the button is clicked.
  - These are good for resistance types, eg. adding an Evade resistance to a dragon's breath weapon so defenders can easily roll Athletics when they are targeted.
- Added Increment/Decrement buttons to the Fatigue, Wounds and Bennies Counters in the character sheet.
- Added the utility function `getStatusEffectDataById` to the new global `game.swade.util` object.
- Added the new `SwadeActor.toggleConviction` function. (#637)
- Added additional translation strings.

### Changed

- [BREAKING CHANGE] The general Power Point pool has been moved from `system.powerPoints` to `system.powerPoints.general` and is now treated like AB-specific pools. A migration for actors and active effects has been provided. Please keep in mind that the migration for token attribute bars has only been made for _prototype Tokens_. Actual tokens will need to be adjusted by hand. (#369)
- Moved the logic for rolling the running die to the `SwadeActor` class. This also means the Shift workflow has been removed as a consequence.
- Changed the order of sheet tabs on the character sheet to put mechanically relevant tabs more into the center.
- Changed the item sheet for skills to adjust the base die, modifier and wild die for a given skill. These can still be affected via Active Effects as before but will now properly convert the value from die sides to a static modifier e.g. adding 2 sides to a d12 will result in d12+1. (#362)
- Status Effects have been updated to use v10 attribute keys.
- Replaced the icons for the Measured Templates to be more represent the actual template sizes. (#631)
- Disabled the ability for players to draw cards in the combat tracker. (#633)

### Fixed

- Fixed a wrong translation key related to measured templates. (#619)
- Fixed a bug that would cause a button in the Action Card Editor to appear empty when Foundry was set to german. (#620)
- Dropping owned items onto the hotbar should create proper macros again. (#621)
- Fixed a few i18n issues with the Setting Configurator. (#636)

## v2.0.6

### Fixed

- Fixed some spelling mistakes in the german translation.
- Fixed checkbox type additional stats not appearing correctly on the character sheet.

### Removed

- Removed additional depreciation warnings in the core hooks and vehicle sheet.

## v2.0.5

### Removed

- Removed more depreciation warnings from `SwadeActiveEffect` class

## Fixed

- The Destroy On Empty checkbox in the consumable item sheet should now work properly again
- The compendium TOC app should now respect the order of pages in a journal entry again.

## v2.0.4

### Removed

- Removed more references to the v9 datapaths in item sheet templates.

### Fixed

- Fixed search on Journal Entry compendiums in the TOC App.
- Improved Journal Entry and page sorting.

## v2.0.3

### Added

- Added a category input to the item sheets. weapons, armor, shields, consumables, gear and edges can have categories.
- Added the Compendium TOC App. This application will be automatically be be used as the UI for Item, Actor and JournalEntry compendiums. You can toggle the usage of the Compendium TOC by right-clicking the compendium and selecting the `Toggle use Compendium TOC`. Documents in a compendium are grouped as follows: (#572)
  - Actors are grouped by type
  - Edges are grouped by type and then by category
  - Powers are grouped by type and then by rank
  - Other items are grouped by category, if they have one, and by type if they don't
- Added additional translation strings

### Fixed

- Removed some more compatibility warnings (#592)
- The Wild Die config should no longer break when using non-english languages

### Known Issues

- The compendium TOC isn't be automatically registered with freshly created world compendiums. Please refresh after creating a new compendium in your world.

## v2.0.2

### Fixed

- Fixed text enrichment for NPC and vehicle sheets.

## v2.0.1

### Fixed

- Character Sheet Editors now have enriched text again
- Item Sheet descriptions now have enriched text again

## v2.0.0

### Added

- Added migration for Item-affecting Active Effects.
- Added migration for embedded abilities and embedded powers.
- Added the Stream template as a preset to the scene controls.
- Enabled weapons and powers to save which templates they can produce.
- Added buttons to activate placable template previews to the item chat cards.
- Added Additional translation strings.

### Changed

- Migrated the system over to the new Foundry data model. This makes it completely incompatible with v9
- Moved the following translation strings:
  - `SWADE.Cone` -> `SWADE.Templates.Cone.Long`
  - `SWADE.SBT` -> `SWADE.Templates.Small.Long`
  - `SWADE.MBT` -> `SWADE.Templates.Medium.Long`
  - `SWADE.LBT` -> `SWADE.Templates.Short.Long`

### Removed

- Removed the ability for images to be dropped to the canvas from Journal Entries. This feature was a holdover from the days when Cards were still journal entries and with the new journal system it has become utterly broken. If the demand is there we can look at reintroducing this feature.

## v1.2.5

### Added

- Added a Setter to the depreciated `equipped` property in order to prevent Active Effects from breaking.

### Fixed

- The NPC sheet now uses `CONFIG.statusEffects` instead of wrongfully using `CONFIG.SWADE.statusEffects`.
- Armors are no longer apply if they're not equipped. (#576)

## v1.2.4

### Changed

- Made the system manifest v10 compatible. (#566)

### Fixed

- Fixed translation key in Multi-Action Penalty modifier.

### v1.2.3

### Change

- Improved the icons for Main hand and off-hand held weapons. (#564)

### Fixed

- Fixed a bug that would prevent weapons being able to be set as trademark weapons. (#563)

### v1.2.2

### Fixed

- Added the missing Effects tab to the Ability item sheet.
- Fixed a bug that would cause inline weapon creation to fail on vehicle sheets.
- Fixed a bug that prevented equipped mods and weapons to show up on item sheets.

### v1.2.1

### Added

- Added a hint to the Ability sheet in case it is a race or archetype and it has no racial abilities. (#562)

### Removed

- Removed Effects tab from Power sheet.

### Fixed

- Items from the inventory can now be dragged and reordered again. (#561)

## v1.2.0

### Added

- Added `Wild Die` class which extends the Foundry Die class and sets some sensible defaults for the Wild Die. It is also being used for all trait rolls. (#529)
- Added `Wild Die` and `Benny` dice classes to the global `game.swade.dice` object. (#529)
- Added an option to force Measured Templates highlighting to act like it is on a gridless scene even if it is not. This can be toggled via the `Always Highlight Templates` option in the System Settings and defaults to on. (#516).
- You can now right-click an actor's portrait on all actor sheets to enlarge it.
- Added `flavour` option to `IRollOptions` interface.
- Refactored the way Active Effect expiration is handled. This takes 3 main forms: (#531)
  - There is now a `Reset Duration` button for expiration Prompts.
  - For Users: The `Shaken`, `Stunned` and `Bleeding Out` effects now trigger workflows and interactions to resolve them.
  - For Developers: There is now an expiration callback API Collection which you can find at `game.swade.effectCallbacks` any time during or after the `init` hook. This collection uses status effect IDs as keys and functions as values. Each function is passed the expiring Active Effect object as its sole parameter. These functions can be asynchronous and are awaited. When an effect expires the system looks for the effect's ID in the collection. If it finds one it executes it, otherwise a fallback is used. You can also delete or overwrite existing callbacks so please be mindful.
- Added Basic Powers as a system compendium. (#499)
- Added modifier presets for `Aiming`, `Wild Attack`, `Target is Vulnerable` and `Off-Hand Penalty`.
- Added the `swade-app` CSS class, a new and convenient way to quickly style applications within Foundry. The class has been applied to the following existing apps:
  - Setting Configurator
  - Wild Die Config
  - Advance Editor
  - Roll Dialog
  - Document Tweaks
- Added V2 Item sheets, which are completely redesigned from the ground up. They feature a new layout and visual styles more in line with the existing character sheet.
- Added `collapsible` and `eachInMap` Handlebars helpers.
- Added `SwadeItem#isArcaneDevice` getter.
- Added `SwadeItem#canBeArcaneDevice` getter.
- Inventory items can now have the following states instead of just being equipped or unequipped. Stored items do NOT count against the carry capacity and weapons held in the off-hand do NOT give any parry bonus. (#361)
  - Weapons:
    - Stored
    - Carried
    - Off-Hand
    - Main Hand
    - Two Hands
  - Others:
    - Stored
    - Carried
    - Equipped
- Added migration and depreciation notice for `equipped` property. (#361)
- Weapons can now be marked as Trademark or Improved Trademark weapons which will result in appropriate bonuses being added to trait rolls. (#527)
- Added `consumable` item type to the system. Each consumable has a number of charges as well as a Destroy when Empty toggle. (#513)
- Added Consumable Item sheet. (#513)
- Added `swadePreConsumeItem` hook and `swadeConsumeItem` hooks. (#513)
- Added toggle to use the Fantasy Companion version of the Entangled status. (#546)
- Added additional translation strings.

### Changed

- You can now no longer roll your Wealth Die if you are broke. (#275)
- You can now pass `title` and `flavour` overrides to skill and attribute rolls
- Restructured the UI of the Roll Dialog to have a more logical flow, guiding the User over the process of checking and constructing their roll. (#505)
- Replaced the Preset select list with a new list that can be filtered and which adds a modifier by clicking on it in the list. (#505)
- Converted language files from flat to nested keys for better organization (#528)
- Enabled item image zoom functionality on item sheets even if the item is not editable, such as when it is in a locked compendium
- [BREAKING] Changed some translation strings, see the list in the ticket (#528)

### Deprecated

- Started depreciation of `SwadeActor#getRollShortcuts()` as it is redundant to `SwadeActor#getRollData()` and will be removed in v1.3.0. (#530)
- Started depreciation of `SwadeItemSheet` as it is being replaced by the `SwadeItemSheetV2`
- Finished depreciation of string and number types in the `additionalMods` portion of `IRollOptions`
- Started depreciation of `equipped` property on items of types `weapon`, `armor`, `shield` and `gear` as it has been replaced by the new `equipStatus` property and will be removed in v1.3.0. (#361)

### Removed

- Removed following Translation keys (#528)
  - `SWADE.AutoLinkDesc`
  - `SWADE.AutoLink`
  - `SWADE.Ace`
  - `SWADE.SomethingWrongWithCardComp`

### Fixed

- Rolling damage and Trait rolls with a Strength of 1 no longer results in an error. (#308)
- Players spending a benny while Hard Choices is enabled should no longer see a permission error (#553)
- Fixed an issue that would prevent the advances shortcut on the character sheet from working properly

### Known Issues

- The menu that used to select an item's equip status (stored, carried, etc) does not render properly on the RIFTS sheet.

## v1.1.9

### Fixed

- Fixed an issue where Joker's Wild would be triggered by coming out of Hold

## v1.1.8

### Fixed

- Active Effects from the Effects tab of the character sheet are now draggable (#542)
- Tightened the conditions for triggering Joker's Wild. (#543)

## v1.1.7

### Added

- Added Item sheet header button to copy the document link for a given item to the clipboard.
- Added an edit button to the Race and Archetype inputs on the Character sheet, which can display document links

### Changed

- When dropping race and archetype items onto a character sheet, the link is now set as the value for the race and archetype instead of the name

### Fixed

- Fixed floating promises resulting in an irregular amount of Bennies handed out during Joker's Wild.

## v1.1.6

### Changed

- DSN integration now uses the global export object instead of a dynamic file import (#535).

### Fixed

- Fixed overeager benny distribution in case of dealing a joker (#534).

## v1.1.5

### Added

- Added `SwadeCombatant.handOutBennies()` function which deals out bennies in case of Joker's wild, if applicable. This function is automatically called when dealing action cards.

### Changed

- Changed the way action card dealing is handled in the codebase, drastically reducing the number of update calls. This should make the whole process snappier.

## v1.1.4

### Added

- Added the number of the advance to the list of advances. (#524)
- Added more clear styling to advance planning toggle (#525)
- Added additional translation keys

## v1.1.3

### Removed

- Removed some unnecessary in the character sheet styles. This is a necessary step towards fixing the setting-specific character sheets

## v1.1.2

### Added

- Added proper symbol for Strength 1 on the character sheet
- Added some hover styles to the attribute dropdown on the character sheet

### Fixed

- Fixed duplicate messages when a gamemaster gets a Benny
- Fixed equip toggle accidentally showing up for all gear items, even if they're not equippable

## v1.1.1

### Fixed

- Fixed a small bug that would prevent automatic creation of an action deck in a world

## v1.1.0

### Added

- Added default duration of 10 rounds to Berserk status effect template.
- Added End of Turn prompt expiration to Berserk status effect template.
- Added Start of Turn auto expiration to Defending status effect template.
- Added `CONFIG.SWADE.CONST` object which will contain constants and enums
- Numerical inputs on the character sheet now accept delta inputs such as `-20` and will save the calculated value.
- _Bound_ and _Entangled_ now also apply all other conditions as described in the rules.
- Added some informative links to system documentation links to the settings tab, under the system version.
- Added the ability to favorite the following item types, as well as Active Effects:
  - Edges
  - Hindrances
  - Special Abilities
  - Powers
  - Weapons
  - Armor
  - Shields
  - Gear
- Added `SwadeActor#rollWealthDie()` function.
- Added the currency controls on NPC sheet.
- Powers can now record an AP value.
- Added new Keybindings, all of which are editable.
  - You can now select a favorite card hand in the user config and open it with the `H` keybinding.
  - You can now spend a Benny by pressing `B` and receive a Benny by pressing `Alt+B`.
- Added new expanded Advancement tracking. In the new Advancement tab you can add advances which are counted up and displayed in the header. Advances are also used to calculate the rank. Each advance can be set to be planned, in which case it won't be used to calculate the rank. Planned Advances are shown in the list with faded colors. To delete or edit and advance you can use the buttons on the right side, similar to how the inventory works.
  - This new system is on by default. If you want to switch back to the legacy way of recording advances you can do so in the actor tweaks
  - All actors have the new Expanded advances activated, though only the Official Sheet for player characters currently supports this.
- Active Effects now record the world time (`game.time.worldTime`) as their start time on creation.
- Added additional translation strings

### Changed

- Changed the way the system is delivered. The system is now bundled as a singular JS file, reducing the number of JS files from 44 to 1. In addition to that we're now delivering sourcemaps which should help with troubleshooting. For more information please visit [ticket #464] (https://gitlab.com/peginc/swade/-/issues/464). All in all this should not have any noticeable drawbacks for end users and should slightly increase the responsiveness of the system on world load.
- Changed the way the Quick Access behaves. Instead of automatically displaying all equipped items it now only displays favored items. See `Added` for the list of document types that can be favored. Status Effects are automatically shown in the Quick Access.
- The inputs for the Crew and Passengers on Vehicles now are now saved as numbers instead of strings.
- Split up the About tab into subsections: `Advances`,`Background` and `Notes`. The `Background` subsection now contains the biography, along some additional fields for character appearance and goals.
- Changed the way the skill dice look in the skill list.
- Changed the name of the Discard Pile that is created by default by the system to make the name more clear.
- Changed the way disabled inputs look on the character sheet to make them more distinctive.
- The system now overrides the builtin card presets instead of removing them.
- Changed the sheet header on the character sheet. Now you can look at your character portrait everywhere. Please keep in mind that this may break the other official character sheets slightly.

### Deprecated

- Started deprecation of `game.swade.SwadeEntityTweaks`. The class has been moved to `game.swade.apps.SwadeDocumentTweaks` and the old accessor will be removed with v1.2.0.
- Started deprecation of `ArmorLocation` enum. This enum has been moved to `CONFIG.SWADE.CONST.ARMOR_LOCATIONS` and the old enum will be removed with v1.2.0.
- Started deprecation of `TemplatePreset` enum. This enum has been moved to `CONFIG.SWADE.CONST.TEMPLATE_PRESET` and the old enum will be removed with v1.2.0.
- Started deprecation of `StatusEffectExpiration` enum. This enum has been moved to `CONFIG.SWADE.CONST.STATUS_EFFECT_EXPIRATION` and the old enum will be removed with v1.2.0.

### Removed

- Removed the Basic Action Cards compendium. Please be aware that only the compendium is removed. The image files for existing decks are still in the system assets.

### Fixed

- Fixed the longstanding issue of pressing enter on the character sheet would trigger the first button in the sheet's DOM.
- Tabs on the character sheet should now retain their scroll position again.
- Users can no longer create initiative groups with combatants they can not edit in the combat tracker.
- Fixed a stylesheet issue that would cause lists not to render properly in edge/hindrance/ability descriptions.
- Fixed a potential issue which could allow the action deck to run out of cards when multiple cards are drawn but none selected. If a joker has been drawn but no card was selected then the joker is automatically picked.
- Fixed a potential issue where no new combat rounds would be started if multiple GMs are logged in.

## v1.0.10

### Removed

- Removed the option to automatically link Wildcard actors

## v1.0.9

### Added

- Added `canBeArcaneDevice` getter to `SwadeItem` class

### Fixed

- Fixed an issue that would prevent Racial/Archetype abilities from being removable from a sheet
- Fixed incorrect translation strings on NPC sheet

## v1.0.8

### Fixed

- Fixed an issue that would cause actor imports to fail. (This time for real, fingers crossed)

## v1.0.7

### Fixed

- Fixed an issue that would cause actor imports to fail

## v1.0.6

### Added

- Added additional translation strings

### Changed

- Renamed `dealForInitative` to `dealForInitiative`. The old function will still be available until v1.1

### Fixed

- Fixed abbreviation for PP in german translation
- The autolink Wildcards setting should now only apply to NPCs again
- Fixed a few spelling mistakes in code comments

## v1.0.5

### Fixed

- Fixed an issue where Active Effects changes wouldn't be applied to an Item if the attribute key contained a non-alphanumerical character
- Fixed an issue where Active Effects changes wouldn't be applied to an Item if the name of the target item contained period
- Damned Regular Expressions

## v1.0.4

### Added

- Added Actor and Item sheet classes to the global `game.swade.sheets` object,
- Added Tweaks application class to the global `game.swade.apps` object
- Added AE changes to Berserk status effect

### Changed

- The system will no longer force vision on on all newly created actors.. If you want to keep similar functionality I suggest using the default token settings in Foundry Core settings

### Fixed

- Fixed a bug which would cause Wildcards to only be marked as such on the sidebar if the actor had at least 1 player owner
- Restored the ability for gear, edges and hindrances to be sorted on the character sheet
- Giving a combatant a new card via the Combatant Config now properly applies the new card to all followers as well
- Fixed a bug that causes Active Effect sheets to have multiple expiration tabs if multiple sheets were opened simultaneously

## v1.0.3

### Changed

- Action Decks created by the system setup function are now automatically shuffled after creation

### Fixed

- Wildcards no longer require a user with owner permissions to display their status in the actor directory

## v1.0.3

### Added

- Added `SwadeActor#toggleActiveEffect` which has the same interface as `TokenDocument#toggleActiveEffect` and behaves roughly the same. When toggling an effect on a linked actor, the effect is applied to all tokens of the actor in the scene.

### Changed

- Changed warning that displays when not enough cards are available to draw initiative. It should be more informative now.
- Renamed Expiration tab to Turn Behavior and added description explaining when the Active Effect ends. (thanks to Kristian Serrano)

### Fixed

- Fixed a bug where status effects were accidentally added to all tokens with the same base actor, even if the token actor was not linked
- Fixed a bug that prevented Player Character actors from being automatically linked on creation. In addition to that, the creation now also respects the automatic wildcard linking setting. Imported actors retain whatever config they have in the compendium
- Wildcards in a compendium are now marked again with an icon
- Fixed an error that would prevent weapons to fire if they have 1 shot only (thanks to Jae Davas)
- Fixed an issue that would prevent the PP for a specific power to show in the Quick Access

## v1.0.2

### Fixed

- Fixed a bug that would prevent a status effect from being removed on the sheet if it was created on the sheet while the actor didn't have a token

### Fixed

- Fixed a bug that would duplicate cards when dealing initiative

## v1.0.0

### Added

- Added a `range` getter on the `SwadeItem` that will return the range brackets from the item, if it is a weapon or power
- Added presets for a Light and Dark Action Deck using `poker` type cards. You can create an Action deck by going to the _Card Stacks_ tab and creating a new stack using the presets.
- Added a multi-action penalty selection for trait rolls in the roll dialog
- Added a Dropdown to the roll Dialog which contains a list of common roll modifiers. To add a modifier, select it from the dropdown and click the add button.
- Added a setting to the Setting Configurator, which controls whether encumbrance penalties are applied in the appropriate places. This setting defaults to off and needs to be enabled by the GM. Please keep in mind that Vigor tests to resist fatigue are not supported at this time
- Added `SwadeActor.isEncumbered` getter which returns true or false and considers whether the setting is even enabled
- Incorporated the chase layout macro into the system. You can right-click on any deck in the system to lay out cards on the currently viewed scene. **This option is only available if the canvas and a scene are available to lay out cards**. There is also a new button in the tile controls to remove all chase cards from the currently viewed scene. Many thanks go out to `Kristian Serrano#5077` and `brunocalado#1650` for creating the macro and allowing it to be added to the system.
- Added the ability to convert old, legacy type decks to Foundry VTT card decks. To do this right-click on a compendium containing cards and then select "Convert to Deck"
- Added Expiration tab to Active Effect sheets
- Status Effects are now synced to the token HUD. In order to achieve this we have move the status effect checkboxes to apply Active Effects. (Thanks to Kristian Serrano)
- Added Active Effect duration support (Thanks to Kristian Serrano)
  - When creating an Active Effect during combat you can now set a duration as well as expiration behavior (such as automatic removal or a prompt). The following status effects now come pre-configured with an expiration:
    - Shaken
    - Distracted
    - Stunned
    - Vulnerable
    - Bleeding Out
    - Protection
- Added additional translation strings

### Changed

- When no name is given for a modifier, the Roll Dialog will default to `Additional`
- In the Roll Dialog when a custom modifier value is entered and the enter key is pressed then the modifier is added to the list instead of directly submitting the roll
- Ported the Initiative system over from the JournalEntry based cards to the Foundry VTT Cards API. Card are dealt from a deck of your choosing (set in the `Setting Configurator`) into a discard pile of your choosing (also in the set in the `Setting Configurator`). By default the system will create an Action Deck and a Discard Pile if none are present or the ones that were chosen in the settings are not available
- Changed the way the `Setting Configurator` is organized. It now has tabs to reduce the overall size and improve the organization. Some settings have been moved into the general system settings.
- Renamed a few translation keys, see the list
  - `SWADE.Rng` -> `SWADE.Range._name`
  - `SWADE.Cover` -> `SWADE.Cover._name`
  - `SWADE.CoverShield` -> `SWADE.Cover.Shield`
  - `SWADE.Mod` -> `SWADE.Modifier`
- Removed all references to entities in migration messages
- Updated the Action Card Editor to now work with the Cards API instead of the legacy deck system
- Improved styling and visibility on the initiative chat cards. Hovering a card will now enlarge it (Thanks to Kristian Serrano)

### Removed

- Finalized depreceation of old roll dialog by removing its class and template.

### Fixed

- Fixed Wildcards not being marked as such in the Actors sidebar tab
- Fixed item creation dialogs and translations that still refered to entities instead of documents
- Vehicle cargo tabs display quantity and weight for items again
- World migrations now migrate compendiums again. If you're not sure if you were affected please run the following sniüüet as either a script macro or directly in the dev tools: `game.swade.migrations.migrateWorld()`

### Known Issues

- Encumbrance penalties currently _DO NOT_ currently support Vigor tests to resist fatigue

## [v0.22.5]

### Fixed

- Fixed a bug that would prevent archetypes from recieving items

## [v0.22.4]

### Fixed

- Fixed a bug that would case a prototype token update to fail when changing the wildcard status on npc actors.

## [v0.22.3]

### Added

- Added Archetype field to character sheet.
- Added Archetype subtype to the Race item. Archetypes work identically to races with the only difference being that the race fills out the race field on the actor it is added to and the archetype filling the archetype field.

### Changed

- Changed the way races and archetypes are added to an Actor. When duplicates (by name and type) are found, they are added, but with a changed name to reflect their source and a dialog detailing which (potential) duplicates have been found/added is shown to the user. If no duplicates are found then no dialog is shown. I have done this as I don't want to make assumptions about which item of a specific name/type is the right one (especially when it comes to skills) and this they are both added and duplicates marked.

### Fixed

- Changed references to objects and a variables that have been marked depreceated

## [v0.22.2]

### Changed

- Made all roll evaluation calls explicitly asynchronous to supress the console warning.

### Fixed

- Fixed leaky CSS in the Setting Configurator
- Fixed The Measured Template presets failing to display properly when switching between presets

## [v0.22.1]

### Changed

- Hardened the Roll dialog a bit more against empty modifier values
- The global item trait and damage modifiers are now only added when they're filled instead of automatically showing up as `+0`

### Fixed

- Under certain circumstances the ItemChatCard helper wouldn't let you use a weapon or power because it was mistankenly thinking the item was missing ammo. This has been fixed

## [v0.22.0]

### Added

- Added a the ability to determine armor per location (head, torso, arms, legs) via the getter `actor.armorPerLocation`
- Added the ability to set a front and back Bump Map for the 3D benny should DSN be installed
- Added a bump map for the default 3D benny
- Added a new roll Dialog that allows players and GMs to more easily add and remove bonuses to the roll.
- Added additional translation strings
- Added compatability for Foundry v9. Large thanks goes to the SWADE dev community for their help in testing and fixing various small issues.

### Changed

- Bound characters now have the status penalty applies correctly. (credit goes to javierriveracastro)
- Moved the following application classes to the new `apps` folder. This has no bearing on features, but might be relevant for anybody who imports these files in their own code
  - ActionCardEditor
  - RollDialog
  - SettingConfigurator
  - SwadeCombatGroupColor
  - SwadeEntityTweaks
  - DiceSettings

### Deprecated

- Deprecated the old roll dialog. It will be removed with version `1.0.0`
- Deprecated the use of bare numbers and strings as modifiers in rolls. Instead please pass an array with objects containing a `label` and a `value` property. See the example below
  ```JS
   [
    {
      label: "Foo",
      value: -2
    },
    {
      label: "Bar",
      value: "+1d6x"
    }
   ]
  ```

### Fixed

- Fixed a bug that would display the wrong card as the old one when drawing a new card for initiative

## [v0.21.4]

### Fixed

- Fixed a small issue with the display of items on the NPC sheet
- Made all items on the NPC sheet draggable
- Fixed an issue which would prevent the quickaccess from displaying properly

## [v0.21.3]

### Added

- Added the ability for Armor to have a toughness bonus. This bonus is only applied when the armor is marked as torso and is equiped.
- Added the first iteration support for _Arcane Devices_. Any weapon, armor, shield or gear item can now be designated to be an Arcane Device, allowing you to add powers to it and store power points.
  1. Create or open a physical item. This can be from within a character's inventory as well.
  1. Mark the checkbox to indicate the item is an Arcane Device.
  1. On the item's Powers tab, enter the amount of Power Points stored.
  1. Drag and drop a power to add it to the item. Powers can be dragged from a character's list of powers or from elsewhere. If desired, you can delete any unwanted powers.
  1. Set the creator's arcane skill. This is used for the new "Activate Device" button on the item/chat cards.

### Changed

- Moved all roll evaluation from synchronous to asynchronous in order to future-proof the rolls
- The weapon Item Sheet now properly saves AP as a number. A migration has been provided to fix items that have AP saved as a text
- Shortened Attribute names are now also applied to the skill list on the character sheet

### Fixed

- Fixed a small issue that would prevent chat cards from being used with unlinked token actors
- Item chat cards will now be generated with the tokens parent scene saved, not the currently active scene
- The running die now correctly uses the adjusted pace for the total distance
- Fixed an issue where Vehicle modslots where not properly calculated

## [v0.21.2]

### Changed

- Changed the `CONFIG.SWADE.templates` global variable to `CONFIG.SWADE.measuredTemplatePresets`
- Changed the `CONFIG.SWADE.activeTemplate` global variable to `CONFIG.SWADE.activeMeasuredTemplatePreview`

### Fixed

- Fixed a small issue with the Tweaks window behaving wierdly when editing values which were affected by an Active Effect

## [v0.21.1]

### Changed

- Refactored the way the one-click template Presets are added to the menu.

### Fixed

- Restored the ability for items to be reordered via Drag&Drop

## [v0.21.0]

### Added

- Added encumbrance limit and current capacity to actor data model under `data.details.encumbrance`
- Added the ability to toggle between metric and imperial Encumbrance limit calculation. This option can be found in the Setting Configurator.Please keep in mind that changing this will **not** change the weight values of items.
- Added an option to use abbreviated Attribute names for PCs/NPCs. The setting is _global_ and can be found in the system settings.
- Added additional translation strings
- Clicking the name of an item in the Gear tab now expands a box to reveal the description, bringing the UX in line with the powers and Edges/Hindrances.
- Added Support for the _Hard Choices_ rule. Enabling this means that all NPC wildcards (without player owners) set their bennies to 0 when refreshed and Whenever a player character spends a benny the GM will be awarded one. For the full experience, please set the GM bennies to 0 in the setting configurator.
- Added a `Parry` slot on weapons. All _equipped_ weapons are now factored into the parry score calculation.
- Added support to modify owned Item via Active Effects (such as skills.). The syntax for the Attribute Key is as follows `@<Type>{<Item name or ID>}[<Attribute Key on the item>]`. As a practical example, to modify the die type on the Notice skill the Attribute Key is `@Skill{Notice}[data.die.sides]`
- Added the ability to Select the images used for Bennies on the character sheet and the 3D Bennies (if DSN is installed and activated). This setting can be found in the Setting Configurator. Please keep in mind that changing the 3D bennies will require you to reload the page and changing the Character sheet bennies will require you to reopen the sheet.

### Changed

- The encumbrance value on the character sheet is now properly truncated to 3 decimal points
- The ammo field on weapons is now always shown.

### Fixed

- The Active Effect controls on the Item sheet are now disabled again if the item is owned by an actor
- Vehicle weapons now count towards the mod slots again
- The Equipped toggle should now work properly again on the Item sheet
- Restored all TinyMCE controls for the Description on the NPC sheet
- Pace now displays properly when not using the automatic adjustment
- Hidden Combatants now no longer generate chat messages when recieving a Benny.

## [v0.20.4]

### Added

- Combatants can now be grouped by name
  - Only appears if other combatants share the same name.
  - Groups all combatants with the same name with the selected combatant as the leader.
- Add Selected Tokens as Followers
  - Appears only when there are tokens selected.
  - Creates combatants for each of the selected tokens (unless one already exists)

### Changed

- Combatants can now only be dragged by GMs and owners of the combatant's actor

### Fixed

- Fixed combatant sorting for unstarted combat encounters
- Races should now properly copy their contents again

## [v0.20.3]

### Fixed

- Fixed a small bug that would prevent active effects from being created inline on the player character sheet
- Fixed a small bug that would prevent weapons from being displayed in the cargo tab on the vehicle sheet
- Fixed `SwadeCombatant.setCardValue()` function

## [v0.20.2]

### Fixed

- Fixed an issue where newly created Action Card tables would not have a roll formula.

## [v0.20.1]

### Changed

- Changed the way Action Card tables are built to account for the fact that the compendium index no longer has all necessary information

### Fixed

- Fixed an issue where combatant sorting would fail if grouped and ungrouped combatants were present
- Fixed an issue that prevented non-GMs from seeing which combatant was dealt which card
- Fixed an issue which would prevent actors from being created when no core skills are defined.
- Fixed an issue that prevent equipment from being equiped or unequiped
- Fixed several issues which would prevent grouped combatants to properly interact with the Holding feature

## [v0.20.0]

### Added

- Added the _Action Card Editor_. This is an alternative interface for Journal Entry compendiums. Any GM can open it by right-clicking a Journal Entry compendium and selecting the "Open in Action Card editor option. This is primarily meant for people that want to create their own Action Card decks.
- Added the character summarizer, which is based on @penllawen 's Summarizer Macro. The Summarizer provides a compact statblock for any NPC or Player character in the form of HTML.
  Currently the summarizer is only usable via a macro, see example
  ```JS
  const actor = game.actors.getName("SomeActor");
  const summarizer = new game.swade.CharacterSummarizer(actor);
  summarizer.getSummary(); //Returns the finished summary as HTML in a string
  ```
- Added new Combat Tracker UI
  - Overhauled the Combat Tracker UI
  - Added a button to the Combat Tracker that lets you shuffle the Action Card deck without having to open up its Rollable Table
  - Combatants are color coded by user color.
- Added Group Initiative
  - Right-click combatants to create group leaders or follow other group leaders.
  - Drag and drop combatants onto other combatants to quickly create leaders and groups.
  - The leader of a group is dealt a card and all followers act on that initiative card.
  - Followers will have the same color indicator as the group leader. Right-click the group leader to customize the group color.
  - **Known Issues:**
    - This is version 1.0 of the group initiative feature. It's possible there are cases we might have overlooked. If you identify any odd behaviors, [please submit an issue](https://gitlab.com/peginc/swade/-/issues).
    - Before combat begins, there is a strange behavior with sorting that occurs when the bottom combatant is grouped with another combatant. This only occurs before combat has begun. The combatants are properly sorted and grouped once initiative is dealt.

### Changed

- Hold, Act Now, Act After Current Combatant, and Toggle Lose Turn context menu options have been moved to the combatant control buttons next to the Visible and Defeated buttons.

### Fixed

- Fixed a bug that would prevent the wild die to be edited on skills

## [v0.19.5]

### Changed

- Changed compatability flag to 0.8.8
- All active effects can now be delete, but transfered effects can have their name clicked to open the sheet of the transfering item.

## [v0.19.4]

### Fixed

- Fixed ammo not subtracting

## [v0.19.3]

### Fixed

- Fixed currency and wealth die not saving
- Fixed Actions no longer subtracting ammo

## [v0.19.2]

### Fixed

- Fixed missing descriptions on NPC sheets

## [v0.19.1]

### Added

- Added the missing Holy/Unholy Warrior edge

### Fixed

- Fixed an issue where arcane backgrounds would not display the powers tab
- Fixed an issue where the smarts die type would always stay as a d4
- Fixed an issue where the contents of the rank field would reset

## [v0.19.0]

### Added

- Added compatability for Foundry VTT 0.8
- When Equipping/unequipping an equippable item _all_ Active Effects that come from that item are now toggled as well
- Added the ability to migrate data models
- Added the ability to set Combatants on Hold in the Combat Tracker. This is done by right-clicking the combatant. You can also set Combatants who are on hold to Act Now and Act after the current combatant, as well as the ability to mark a combatant to have lost their turn until the next round. Thanks to Kristian Serrano for submitting this.
- Added additional translation strings

### Changed

- Vehicles now save the UUID instead of the ID of their operator. As a result you can now use operators from compendiums directly. Existing vehicles will be migrated
- Hostile NPC Wildcards and GMs now recieve a benny each when an NPC Wildcard with a hostile token dispostion draws a Joker in combat
- Improved performance of the action card drawing by reducing the number of asynchronous operations
- Disabled autocomplete on roll dialogs
- Moved the pace input to the tweaks on PCs and NPCs. The pace that is adjusted by wounds can now be found in `data.stats.speed.adjusted`.

### Removed

- Removed the Legacy character sheet.

### Fixed

- Fixed a styling issue which on the character sheet

## [v0.18.4]

### Fixed

- Fixed double Conviction messages for NPCs
- Fixed the conviction activation animation not playing on the NPC sheet

## [v0.18.3]

### Added

- Added `SwadeActor#status` getter which returns an object that contains the current status as booleans

### Fixed

- Fixed Vehicle operators not working properly when no token exists
- Duplicating PCs no longer duplicates core skills

## [v0.18.2]

### Changed

- Changed the labels of the system Compendiums to _Basic Skills_, _Basic Edges_, _Basic Hindrances_ and _Basic Action Cards_ to better differentiate them from the Core Rules
- Renamed the Combat Tracker contextmenu option for rerolling Initiative to give it a more appropriate name and symbol

### Fixed

- Fixed weird behavior of the Biography Editor on the official character sheet

## [v0.18.1]

### Changed

- The `options` parameter for `SwadeActor#rollSkill` and `SwadeActor#rollAttribute` is now optional

### Fixed

- Fixed a small bug which would cause Power chat cards to concatinate numbers instead of adding them when adjusting power points

## [v0.18.0]

### Added

- Added missing translation keys for vehicles
- Added a convenience shortcut on the official sheet which opens the parent itemsheet of transfered Active Effects
- Added Die type additional stat
- Added focus state to checkboxes
- Added support for the No Power Points rule, which can be activated via the Setting Configurator. When this setting rule is effect the recording of power points is disabled and the PP Cost input is instead used to calculate the penalty on the trait roll based on the total PP Cost entered. This works with the inline interaction on the character sheet as well as the chat cards
- Added the ability to define a list of Core Skills in the Setting Configurator
- Added the ability to set which compendium the core skills will be drawn from. This defaults to the system compendium
- Added the ability to drag&drop Active Effects between actors. Please keep in mind that is only possible for AE which are not transfered from an item.
- Added the ability to use Attributes (such a Spirit or Agility) with actions instead of only skills. Adjusted UI of the _Actions & Effects_ tab accordingly. Please keep in mind that Attributes do not currently support actions with an RoF greater than 1 and will roll as if the RoF is 1
- Added a suggestion list to the ammunition field of owned weapons
- Added support for the Quick edge
- Added additional dice labels to damage rolls for Bonus damage and attribute shortcuts
- Jokers now add the appropriate +2 bonus to all trait and damage rolls
- Added `SwadeActor#hasJoker` getter which returns a boolean value
- Added added `profile-img` class to the image element that displays a characters image on the Official Sheet
- Added additional translation strings
- Edges, Hindrances and Special Abilities can now be dragged&dropped to the Hotbar from the character sheet

### Changed

- NPCs now automatically equip equipable items
- Changed order of the stats for Vehicles, armor, shields and weapons to properly reflect the order in the books
- Overhauled the way currencies are handled. You can now select one of **three** options in the Setting Configurator
  1. **Currency**, the system as it has been until now. Selecting this option now also adds an additional input field that lets you name the currency yourself.
  1. **Wealth**, representing the Wealth setting rule, which replaces the currency field with dice controls.
  1. **None / Other**, which hides the currency field. This is ideal for the people that prefer tracking currency and wealth via inventory items.
- Chnaged how rolls are displayed in chat. Trait rolls will now display the result dice, adjusted with all modifiers
- The biography text editor on the character sheet now expands to display it's entire contents
- Updated the item chat cards so their design matches the layout on the character sheet

### Deprecated

- Started depreceation of current hotbar macro functions in favour of posting the chat card

### Fixed

- Fixed how Conviction is rolled. It is now a single `d6` whose result is added to all rolls in a trait roll

## [v0.17.2]

### Changed

- Renamed Community character sheet to Legacy character sheet
- Legacy character sheets and NPC sheets now properly display the powers tab when the actor has a special ability that grants powers

### Fixed

- Removed polish language definition from system manifest

## [v0.17.1]

### Added

- Added `main-grid` class as the parent element for the official character sheet

### Changed

- Changed the order of edges and hindrances on the official character sheet
- Removed restrictions on what can be added to a race as a racial ability. Now the only thing that cannot be added is another race
- Changed the layout of the Ability item sheet, putting the description above the active effects/racial abilities
- Special Abilities can now act like Arcane Backgrounds, unlocking the powers tab
- Item sheets can now scroll
- Active Effects and Actions lists on Item sheets now scroll when they become too long

### Fixed

- Fixed a small bug which would cause toughness not to be calculated correctly
- Fixed a small bug which would cause natural armor not to be calculated when no actual armor is equipped

## [v0.17.0]

### Added

- Added an option to automatically hide NPC Item Chatcards. This setting is on by default and can be found in the System Settings. You can still make a card public by right-click it and selecting the right option from the context menu
- The system now grants a Benny to all player characters when one of them is dealt a Joker. This can be turned off in the Setting Configurator
- Added the ability to automatically calculate parry. This option can be set in actor Tweaks and will default to on for all newly created actors after this point. The calculation also takes any shields which are equipped into account
- Added a new Field to the setting configurator which lets you set the name of the Skill which will be used as the base to calculate Parry. It will default to _Fighting_. Changing this setting will require you to reload the world to have the change take effect
- Added Active Effect to the Defend status which adds +4 Parry
- Added new Status _Protection_ which adds an Active Effect that adds 0 to both toughness and armor, making it easy to apply the power. All you need to do is to put the modifier (4 or 6) into the appropriate Active Effect change.
- Added new Item type `ability`. This item type has two subtypes, `race` and `special`. If the item has the subtype `race` you can drag&drop the following items onto it to create racial abilities:

  - Skills
  - Edges
  - Hindrances
  - Ability items with the subtype `special`

  You can delete these embedded racial abilities from the race item but not edit them.

  When you have prepared the race you can then drag&drop it onto any non-vehicle actor.

  Once that is done, several things happen:

  - The racial abilities are taken from the race and added to the actor
  - Any active effects that were added to the race are copied to the actor
  - The actors race is set to the name of the race item that was dropped onto the actors
    - If one of the racial abilities is a skill and the skill is already present on the actor, the die and modifier are set to the value of the racial ability. Otherwise a new skill is created
  - The race item itself is _not_ added to the actor, it merely acts as a carrier.

- Added blank option to linked attribute selection on skills
- Added new translation keys

### Changed

- Improved permission control for the reroll options
- Newly created Scenes will now default to ther gridless option. This only applies to scenes created in the Sidebar. Scenes imported from compendiums or other sources will retain their scene config
- Set default value of Benny animation to true
- Refactored some of the new turn combat logic
- Set minimum Toughness to 1 when auto-calculating
- Changed the font size of the cards in the Combat Tracker to `20px` for easier readability
- [BREAKING] Refactored the underlying structure of the official sheet so it is easier to modify and skin
- Changed the path of the icons used to describe dice in the roll cards to be relative
- Moved running die roll to a button next to the Pace input which also displays the current running die as an image
- Changed the way the skills display on the official character sheet. They are now more in line with the rest of the sheet. Thanks a lot to Kristian Serrano for that.
- Renamed most of the tabs on the character sheet to be more in line with Savage Worlds terminology
- Actor sheets now display Active Effects which come from Items they own. Item sheets now have _all_ interactions with Active Effects removed when the item is owned by an Actor as they cannot be interacted with anyway.
- Changed the colors of active/inactve tabs on the item sheets and community sheet.

### Removed

- Consolidated the quickaccess item cards into a single file. Thanks a lot to Kristian Serrano for that.
- Removed the polish translation, as announced with v0.16.0

### Fixed

gioness if it is marked as natural armor, has at least the torso location and is equipped

- Fixed a small issue where roll shortcuts would not properly work with multiplications and divisions
- Fixed a bug which would cause preset templates to behave eratically. Many thanks go out to Moerill who was instrumental in solving this.
- Fixed a small bug which would prevent the toughness auto-calculation from taking into account AE that adjust the size of the character

## [v0.16.2]

### Added

- Added missing translations on the official sheet
- Added the ability to reroll rolls in chat by right-clicking the roll in chat and selecting the right option from the context-menu.

### Changed

- Moved the carry capacity calculation to the `Actor` class and adjusted sheet classes accordingly. This should keep it consistent between all sheets.
- Moved the DSN integration settings away from a `client` setting to a flag on the user. This will make these settings consistent across all browsers, but not all worlds.
- Moved URL for the benny image asset on the official sheet to `CONFIG.SWADE.bennies.sheetImage`
- Updated benny assets

### Fixed

- Fixed a bug which would cause chatcards to reopen again after being closed and updated from the chatlog,
- Added missing translation key for Power Trappings
- Added missing labels for major and minor hindrances on the official character sheet
- Fixed a bug which would cause NPC and Vehicle ammo tracking not to behave correctly

## [v0.16.1]

### Changed

- Updated german translation

### Fixed

- Fixed a bug which would stop the system from loading if Dice So Nice was not installed
- Fixed a spelling mistake in the english translation

## [v0.16.0]

### Added

- Added warnings to all item types which display when any action related to an Active Effect is taken on an owned Item
- Added Benny spending animation to all sheets as well as to the player view
- Added a new Configuration Submenu for _Dice So Nice!_ related settings.
- Added option to toggle whether the Benny spending animation should be played. This setting can be found in the new Dice Configuration system settings submenu and is only available if DSN is installed
- Added the ability to set a custom Wild Die color theme. This setting can be found in the new Dice Configuration system settings submenu and is only available if DSN is installed
- Added Ammo Management. Ammo management is a system option that is turned off by default. When activated it allows you to to track how many shots are expended by an attack as well as reload the gun if it's empty. When active you cannot perform an action unless you have enough ammunition in the magazine. Weapons have recieved 2 new options. One marks the weapon if it doesn't need to be reloaded, such as bows. The other is a text field that lets you enter the name of an item that is used as ammunition. There are also options to which enable the usage of ammo from the inventory. Say you have a gun which is missing 10 shots from a magazine while this feature is enabled. Reloading the weapon will pull 10 shots from the appropriate item that you set as ammunition on the weapon from the characters inventory. A warning is displayed if not enough ammunition for a full reload is available.
- Expanded Power Chat Card to now include options to directly adjust PP. This can be used to easily spend PP without having to do it via the character sheet
- Added Shaken icon
- Added Incapacitated icon
- Added additional translation options

### Changed

- Changed background color of SVG skill and `Item` to be more in line with the _Savage Worlds_ color scheme
- Increased width of Power Point input fields on the Official CHaracter sheet.
- Turned the `SwadeCombat` file into a proper class that extends `Combat`
- Skills will now always open their sheet when created on an actor, even when drag&dropped onto the sheet from somewhere.
- Generalized the operation skill dropdown on vehicles by adding the possible skills as an array to the `CONFIG.SWADE.vehicles` object
- Moved paths to Wild Card icon files to `CONFIG.SWADE.wildCardIcons` which means modules can now add their own custom wildcard icons. Testing showed the ideal place is the `setup` Hook.
- Parametrized paths to the benny textures in `CONFIG.SWADE.bennies.textures`. Can be used the same way as the wildcard icons
- Updated a few strings in the german translation

### Deprecated

- Started deprecation of the polish translation as I cannot maintain it. It will be removed from the game system with v0.17.0

### Removed

- Removed ability to interact with Active Effects on skill Items
- Removed ability to interact with Active Effects on owned Items entirely
- Removed Translations with `SSO` prefix and unified translation under the `SWADE` prefix. Adjusted Official sheet accordingly
- Removed unused gradient definitions from skill and `Item` SVG icons

### Fixed

- Fixed maximum wound penalty for pace
- Checkbox styles are properly scoped to the system now
- Fixed a small bug which would not reset initiative properly when clicking the `Reset All` button in the Combat Tracker

## [v0.15.3]

### Added

- Added Drag&Drop functionality to Misc items in the Inventory of the character sheet

### Changed

- Restricted autopopulation of core skills to player characters only

### Fixed

- Implicit dice such as `d4` now explode properly again
- Fixed an unintentional linebreak on the community character sheet
- Fixed a small issue where using the `suppressChat` option on a damage roll would break the roll

## [v0.15.2]

### Added

- Added compatability for Foundry 0.7.9

### Fixed

- Fixed a small error in the token status effects

## [v0.15.1]

### Added

- Added the getter `hasArcaneBackground` accessor to the `SwadeActor` class which returns a boolean
- Added SWADE-Specific status icons
- Added additional translation options

### Changed

- Changed the color scheme of the community sheets to more closely resemble the official sheet

### Fixed

- Fixed a small bug which would prevent chat cards to be posted from vehicle actors
- Fixed a small issue that would cause multiple instances of Core Skills to be created on an actor when multiple GMs are logged in

## [v0.15.0]

### Added

- Added official character sheet. For more information visit `<insert link here>`
- Added Actions to `Shield` type items
- Added ability to define skill override in an action, so the action uses an alternative skill
- Added ability to record how many shots are fired by using this action. This does nothing for now, but can be used by macros or features down the line
- Added additional translation options

### Changed

- Changed unknown driver display to black icon to differentiate from an actor that has the default icon
- Changed Roll Data (the shortcuts with the `@` notation). You can now easily access the following values:
  - all attributes of the selected token (@str, @agi, etc),
  - all skills of the selected token. Names are all lower case, spaces are replaced with dashes and all non-alphanumeric characters (everything that isn't a number or a to z) is removed. E.g. `Language (Native)` can be called with `@language-native`
  - Traits will also include their modifier shoud they have one
  - Current Wounds
  - Current Fatige

### Removed

- Removed spanish translation from core game system because a properly maintained community translation is available here: https://foundryvtt.com/packages/swade-es/

### Fixed

- Fixed a small bug that would cause rolls to crash when attributes had a modifier with value `null`
- Fixed a small bug which would prevent vehicle sheets from rendering under certain circumstances.
- Fixed a small bug which would prevent items on the vehicle sheet from dragging
- Fixed several spelling mistakes

## [v0.14.1]

### Added

- Added additional translation options

### Changed

- Changed the way dice results are displayed. The chat message now displays the rolls as following
  - If applicable, Modifiers are displayed as a list in the flavour text
  - In the middle the adjusted dice rolls, with all the modifiers already applied. Should a roll contain a natural 1 the result will be colored red so you can at a glance tell if you're dealing with snake eyes or Innocent Bystander
  - When clicking to expand the roll you can now see the unmodified dice rolls, in case you want to reference them
- Changed version compatability for Foundry VTT `0.7.7`
- Refactored the dice rolling logic to take more advantage of the Foundry VTT Dice API. This should also take care of most parsing issues for rolls triggered via the sheet and chat cards

## [v0.14]

### Added

- Added Skill and Attribute names to dice when rolling
- Added `SwadeEntityTweaks` class to game object as `game.swade.SwadeEntityTweaks`.
- Added labels to the various Sheet classes
- Added natural armor capabilities
- Added Localization for Actor and Item types (english only)
- Added `suppressChat` option to `Actor.rollSkill`, `Actor.rollAttribute` and `Item.RollDamage` options. When this option is set to true, the method returns an unroll `Roll` class instead of opening the Dialog and rolling. Example: `actor.rollSkill(randomSkillID, {suppressChat: true})`
- Added logic that will optionally adjust pace with the wounds
- Added support for active effects, including UI.
  - **Attention** Should an active effect that modifies something like parry or pace not work it may because the data is still saved as a string. To fix this first enter some bogus value into the field and then the proper base value. This will force the field to update the datatype correctly and the Active Effect should now work properly.
  - **Attention** Editing an Active Effect on an item that is owned by a character is not currently possible as it isn't directly supported in Foundry Core
- Added two new modifier fields to the data model for `character` and `npc` type actors. Both are primarily meant for active effects
  - `data.strength.encumbranceSteps` - Used for Edges which modify the strength die for the purpose of calculating encumbrance. setting this value to 1 means the strength die is considered 1 step higher for the purpose of encumbrance (up to a maximum of a d12)
  - `data.spirit.unShakeBonus` - Should be used for edges which give a bonus or penalty to the unshaking test

### Changed

- Added package name to Action deck selection
- Simplified explosion syntax from `x=` to `x`
- Refactored `getData` of all actor sheets take out duplicate or unused sections
- [POTENTIALLY BREAKING] Changed data types of input fields for attributes and derived values to `Number`. This was a necessary step in order to make Active Effects work properly.
- Changed display text of the Red and Black Joker action cards to "Red J" and "Blk J" respectively to improve readability

### Fixed

- Fixed a small bug which would cause Group Rolls not to behave properly
- Fixed a styling error with Item sheets
- Fixed a bug which caused sheet-inline item creation dialogs to not work properly
- Fixed a bug which would cause skill rolls to throw a permission error when players were making an unskilled attempt
- Fixed a small bug which would cause some token values of actors to be overwritten on import

### Removed

- Removed Handlebars helpers that overwrote helpers defined by Foundry core

## [v0.13]

### Added

- Added support for chat message popout for item chat cards
- Added more localization to Item Chat Cards
- Added ability to assign any card to a combatant via combatant config
- Added image to Action Cards Table. Won't apply to currently existing tables, so either delete the table and re-load the world or set it manually

### Changed

- Changed all the listeners on the sheet classes to no longer use depreceated jQuery Methods
- Updated the Vehicle sheet driver logic to use the new `dropActorSheetData` drop
- Updated Combatant sorting in Combat tracker to be in line with the new method structure
- Moved template presets up in menu so the `Delete All` button is last
- Replaced all instances of the now depreceated `Actor#isPC` with the new `Entity#hasPlayerOwner` property
- Turned on toughness calculation by default for PCs/NPCs made after this patch

### Deprecated

- Finished the deprecation of the util functions `isIncapacitated` and `setIncapacitationSymbol`

### Fixed

- Fix roll dialogs
- Fix item creation dialog
- Fix macro creation drag handler
- Fixed a small bug which could lead to the wrong modifiers on a running die
- Fixed dice roll formatting in the chatlog
- Fixed initiative display
- Fixed a bug which would cause an infinite update cycle when opening actor sheets from a compendium

## [v0.12.1]

### Fixed

- Fixed a bug which would overwrite actor creation data

## [v0.12.0]

### Added

- Added TypeDoc to the repository and configured two scripts to generate the documentation as either a standard web page or in Markdown format.
- Added a way to render sheets only after the templaes are fully loaded. this should help with slower connections.
- Added ability to set a d1 for traits
- Added toggle for Animal smarts
- Option to roll the Running Die. Adjust the die the Tweaks. Set a die type and a modifier as necessary. Click _Pace_ on the actor sheet to roll the running die, including dialog, or shift-click to skip the dialog. **Attention** For existing actors you may need to go into the tweaks, set the proper die and then hit _Save Changes_. Actors created after this patch will have a d6 automatically.
- Added the ability to create chat cards for edges and inventory items. (Thanks to U~Man for that)
- Added the ability to add a skill and modifiers to a weapon or power
- Added the ability to define actions on a weapon or item. There are two types of actions; skill and damage, each allowing you to pre-define some custom shortcuts for attacks
- Additional stats are now present on all items and actors
- Added the ability for players to spend bennies directly from the player list

### Deprecated

- started the deprecation of the util functions `isIncapacitated` and `setIncapacitationSymbol`. They will be fully removed in v0.13
- Finished deprecation of `SwadeActor.configureInitiative()`

### Changed

- Upgraded TypeScript to version `3.9.7` (Repo only)
- Adjusted character/NPC sheet layout a bit
- Updated the SVG icons so they can be used on the canvas
- Changed design and makeup of checkboxes as they were causing issues with unlinked actors
- Changed input type of currency field so it accepts non-numeric inputs

### Fixed

- Fixed a bug where actors of the same name would show up as a wildcard in the actor sidebar if any of them was a wildcard
- Fixed a small bug which could occasionally cause errors when handling additional stats for entities in compendiums

## [v0.11.3]

### Fixed

- Fixed a bug that would prevent Item or Actor sheets from opening if they hadn't been migrated

## [v0.11.2]

### Fixed

- Fixed a bug that would prevent non-GMs from opening items in the sidebar

## [v0.11.1]

### Fixed

- Fixed a small bug that would allow observers to open the Armor/Parry edit windows

## [v0.11.0]

### Added

- Added Classification field to Vehicle Sheet
- Added `calcToughness` function to `SwadeActor` class, that calculates the toughness and then returns the value as a number
- Added auto-calculation to toughness if armor is changed or something about the vigor die is changed.
- Added `isWildcard` getter to `SwadeActor` class
- Added Group Rolls for NPC Extras
- Added `currentShots` property to `weapons`. Addjusted sheets accordingly
- Added Setting Configurator in the Settings
- Added Capability to create custom stats.
  - To use custom stats, create them in the Setting Configurator, then enable them in the Actor/Item Tweaks
  - These custom stats are available on the following sheets: Character, NPC, Weapon, Armor, Shield, Gear
  - **Attention**: Due to a quirk in Foundry's update logic I recommend you only edit unlinked actors in the sidebar and then replace existing tokens that exist on the map with new ones from the side bar
- Added ability to automatically calculate toughness, including armor. This is determined by a toggle in the Actor Tweaks and does not work for Vehicles. The Toughness input field is not editable while automatic toughness calculation is active.
- Added Powers Tab back into NPC Sheets
- On character sheets, added quantity notation to most inventory entries
- Added Initiative capability to `vehicle` type actors. Please keep in mind that Conviction extension does not work at this time. It's heavily recommended that you only add the Operator to the Combat Tracker if you use the Conviction setting rule.

### Changed

- Parry and Pace fields now accept non-numerical inputs
- Power sheet now acceptsnon-numerical input for Power Points
- NPC Hindrances now only show the Major keyword, no longer Minor
- Updated german localization (thanks to KarstenW for that one)
- Changed size of status tickbox container from `100px` to `120px` to allow for longer words
- Re-enabled the Arcane Background toggle on Edges, when they are owned

### Deprecated

- Started deprecation of `SwadeActor.configureInitiative()` function. It will be fully removed with v0.12.0

### Removed

- Removed Status icon two-way binding
- Removed Notes column for misc. Items in the character sheet inventory
- Removed Conviction Refresh message as there is no reliable way to get the current active combatant at the top of a round

### Fixed

- Fixed a bug that would remove fatigue of max wounds was set to 0 on NPC sheets
- Fixed a small bug that would prevent item deletion from NPC sheets
- Fixed a small bug which would cause wound penalties on vehicles to register as a bonus instead
- Fixed a small bug which allowed observers to roll Attribute tests

## [v0.10.2]

### Added

- Added Source code option to advancement tracker editor

### Changed

- Removed armor calculation from NPC actors as it is a likely culprit for a bug. Proper solution to follow

## [v0.10.1]

### Fixed

- Fixed a bug that would cause Drag&Drop macros from actor sheets to be cloned, leading to multiple identical macros on the hotbar (identical in ID too), which could lead to players having macros they couldn't interact with properly.

## [v0.10.0]

### Added

- Added Refresh All Bennies option and Message
- Added the Savage Worlds Cone shape which replaces the vanilla Foundry cone shape for rounded cones (thanks to Godna and Moerill for that one)
- `SwadeTemplate` class, which allows the creation of predefined `MeasuredTemplate`s (based on code by errational and Atropos)
- Buttons for predefined Blast and Cone Templates
- Added Vehicles
  - Added Vehicle `Actor` type
  - Added Vehicular flag to `weapon` and `gear` Items
  - Added Vehicle Sheet
    - Drag&Drop an actor to set an operator
    - Roll Maneuvering checks directly from the vehicle sheet
      - Set Maneuvering skill in the `Description` tab
- Added optional Setting Rules for Vehicles using Modslots and Vehicles using Edges/Hindrances
- Added localization options for Vehicles
- Added `makeUnskilledAttempt` method to `SwadeActor` class
- Added `rollManeuveringCheck` method to `SwadeActor` class
- Added Drag&Drop to PC powers

### Fixed

- Fixed a small bug which would cause the Action Cards deck not to reset when combat was ended in a Round in which a Joker was drawn
- Fixed a small bug which would cause Gear descriptions not to enrich properly on `Actor` sheets
- Fixed broken Drag&Drop for NPC sheets

### Changed

- Changed how many Bennies the GM gets on a refresh. The number is now configured in a setting (Default 0);
- Weapon Notes now support inline rolls and Entity linking

## [v0.9.4]

### Added

- Added some more localization options

### Changed

- Changed the card redraw dialog. It now displays the image of the card as well as a redraw button when appropriate
- Reworked the NPC sheet a bit (thanks to U~Man for that)

### Removed

- Removed the Weapons, Gear, Shields, Armor and Powers compendia due to copyright concerns

## [v0.9.3]

### Added

- Added Benny reset function for each user
  - GM Bennies are calculated based on the number of users
- Benny spend/recieve chat messages
- Added a function to calculate the valuer of the worn armor to the `SwadeActor` entity

## [v0.9.2]

### Fixed

- Fixed a bug that would prevent GMs from rerolling initiative for a given combatant

## [v0.9.1]

### Added

- Added a function to the `SwadeActor` class that calculates and sets the proper armor value
- Added checkboxes to the Armor sheets to mark hit locations

### Changed

- Renamed a few classes to make their function more easily apparent
- Changed `Conviction` Setting Rule to be compliant with SWADE 5.5
- Made Skill names multiline

## Removed

- Took away the player's option to draw their own cards, now only the GM can do that

### Fixed

- Fixed a small bug which would prevent NPCs from rolling power damage
- Fixed a small bug that would prevent multiple combat instances to work at the same time

## [v0.9.0]

### Added

- Layout rework (Thanks to U~Man)

  - Added multiple arcane support, filling the Arcane field of power items will sort it in the powers tab and gives it its own PP pool when the filter is enabled
  - Moved sheet config options (initiative, wounds) to a Tweaks dialog in the sheet header
  - Moved Race and Rank fields to the sheet header
  - Moved Size to Derived stats
  - Fixed Issue with rich HTML links not being processed in power and edge descriptions
  - Each inventory item type has relevant informations displayed in the inventory tab
  - Reworked base colors
  - Moved condition toggles and derived stats to the Summary tab
  - For PCs sheet, lists no longer overflows the sheet size.
  - For PCs sheet, power cards have a fixed size
  - Added an Advances text field above the Description
  - Changed the default item icons to stick with the new layout colors
  - Added dice icons to attributes select boxes
  - Weapon damage can be rolled in the inventory
  - Added an item edit control on NPC inventory

- Added drag&drop capability for PCs and NPCs so you can pull weapons and skills into the hotbar and create macros.
- Added a bunch of icons for skills
- Added the ability to choose cards when rerolling a card

### Changed

- Adjusted Weapon/Armor/Gear/Power Item sheets to be more compact

### Fixed

- Fixed a bug which would duplicate core skills when a PC was duplicated

## [v0.8.6] 2020-05-22

### Fixed

- Fixed Compatability with Foundry v0.6.0

## [v0.8.5] 2020-05-21

### Added

- Added Size modifier to sheet
- Added Roll Raise Button to Damage rolls which automatically applies the extra +1d6 bonus damage for a raise
- Player CHaracters will now automatically recieve the core skills.
- Added FAQ (Thanks to Tenuki Go for getting that started);
- Toggling a `npc` Actor between Wildcard and not-wildcard will link/unlink the actor data. Wildcards will become linked and Extras will become unlinked. This can still be overriden manually in the Token config. This functionality also comes with a system setting to enable/disable it
- Actors of the type `npc` will be created with their tokens not actor-linked

### Fixed

- Fixed a small bug which caused ignored wounds to behave oddly.
- Fixed duplicates and false naming in the Gear compendia (Thanks to Tenuki Go for getting that done);
- Fixed Journal image drop again
- Fixed a small bug where in-sheet created items would not have the correct icon

## [v0.8.4] 2020-05-17

### Fixed

- Fixed a small bug that would prevent the population of the Action Cards table

## [v0.8.3] 2020-05-16

### Fixed

- Fixed a small bug that would allow combat initiative to draw multiples of a card

## [v0.8.2] 2020-05-16

### Added

- Added option to turn off chat messages for Initiative
- Made Hindrance section available for Extras as well
- Made PC gear cards more responsive
- Added more i18n strings
- Compendium packs for Core Rulebook equipment (Thanks to Tanuki Go on GitLab for that)
- Added buttons to quickly add skills, equipment etc (Thanks to U~Man for that)

### Changed

- Updated SWADE for FoundryVTT 0.5.6/0.5.7

### Removed

- Removed French translation as it will become a seperate module for easier maintenance.

### Fixed

- Fixed a small bug which would cause the wrong sheet to be update if two character/npc sheets were opened at the same time.

## [v0.8.1] 2020-05-10

### Added

- Powers now have a damage field. If the field is not empty it shows up on the summary tab. Kudos to Adam on Gitlab
- Fixed an issue with Item Sheets that caused checkboxes to no longer show up
- Stat fields for NPC equimpent only show up when they actually have stats.

## [v0.8.0] 2020-05-09

### Added

- Initiative! Supports all Edges (for Quick simply use the reroll option)
- Added localization strings for Conviction
- Fields in weapon cards will now only be shown when the value isn't empty
- Ability to ignore Wounds (for example by being a `Construct` or having `Nerves of Steel`)

## Changed

- Massively changed the UI and all sheets of SWADE to make it more clean and give it more space.
- Changed data type of the `Toughness` field from `Number` to `String` so you can add armor until a better solution can be found
- Updated French translation (thanks to LeRatierBretonnien)

### Fixed

- Fixed a bug that would display a permission error for players when a token they weren't allowed to update got updated
- Status Effect binding now also works for tokens that are not linked to their base actor
- Fixed a small localization error in the Weapon item sheet
- Fixed requirements for the `Sweep` Edge
- Fixed page reference for the `Sound/Silence` Power
- Fixed an issue with Skill descriptions not being saved correctly

## [v0.7.3] 2020-05-01

### Added

- Added the option to view Item artwork by right-clicking the item image in the sheet

### Changed

- Optimnized setup code a bit

### Fixed

- Added missing Bloodthirsty Hindrance
- Fixed a spelling mistake in the `Improved Level Headed` Edge

## [v0.7.2] 2020-04-28

### Fixed

- Fixed a small bug that would cause an error to be displayed when a player opened te sheet of an actor they only had `Limited` permission on

## [v0.7.1] 2020-04-28

### Added

- Status effect penalties will now be factored into rolls made from the sheet (credit to @atomdmac on GitLab)
- Added option to turn Conviction on or off as it is an optional rule

### Fixed

- Fixed a minor spelling mistake in the german translation

## [v0.7.0] 2020-04-20

### Added

- Damage rolls can now take an `@` modifer to automatically add the attribute requested. For example `@str` will resolve to the Strength attribute, which will be added to the damage roll.
- Added Limited Sheet for NPCs. If the viewer has the `Limited` Permission they get a different sheet which only contains the character artwork, the name of the NPC and their description
- Added Confirm Dialogue when deleting items from the inventory of `character` Actors

### Changed

- Changed automated roll formula a bit to make the code more readable.

### Fixed

- Fixed a small bug where the description of an Edge or Hindrance could show up on multiple `character` sheets at once

## [0.6.1] 2020-04-20

### Added

- Trait rolls now take Wound and Fatigue penalties into account
- `Gear` Items can now be marked as equippable

### Fixed

- Added missing Damage roll option for NPC sheets

## [0.6.0] 2020-04-18

### Added

- Rolls for Attributes, Skills and Weapon Damage (kudos to U~man!)
- Checkboxes for Shaken/Distracted/Vulnerable to Character and NPC Actor sheets
- Two-Way-Binding between Token and Actor for the three status effects (Shaken/Distracted/Vulnerable)
- Setting to determine whether NPC Wildcards should be marked as Wildcards for players

### Changed

- Updated hooks to be compatible with Foundry 0.5.4/0.5.5
- More clearly marked Item description fields
- Renamed `Untrained Skill` to simply `Untrained`

### Fixed

- Power descriptions are now rendered with formatting
- Added missing `Arrogant` hindrance

## [0.5.4] 2020-04-13

### Removed

- Removed empty option from skill attribute select as every skill needs to have a linked attribute anyway

### Fixed

- Rank and Advances fields now point to the correct properties. Make sure to write down what Rank and how many advances all characters have before updating to this version

## [v0.5.3] 2020-04-11

## Added

- Added Quantity fields to relevant Item sheets
- Added Localization options for Conviction
- JournalEntry images can now be dragged onto the canvas (credit goes to U~man)

## Changed

- Changed initiative formula to `1d54`. This is temporarily while a proper Initiative system is being developed

## Fixed

- Fixed localization mistake in de.json

## [v0.5.2] 2020-04-07

### Added

- Compendiums! (Thanks to Anathema M for help there)
  - Edges
  - Hindrances
  - Skills
  - Powers
  - Action Cards (no you can't pull them onto the map, but that's gonna come in the future)
- French Localization (Thanks to Leratier Bretonnien & U~Man for that)
- Spanish Localization (Thanks to Jose Lozano for this one)

### Changed

- Upgraded Tabs to `TabsV2`
- Slight improvements to localization

## [v0.5.0] 2020-03-27

### Added

- Wildcards will now be marked with a card symbol next to their name
- Wound/Fatigue/Benny/Conviction tracking on the Wildcard Sheet
- Extra sheets!
- Polish localization. Credit goes to Piteq#5990 on Discord

### Changed

- Moved Icons to assets folder and split them into icons and UI elements
- Character Image now respects aspect ratio
- The Actor types Wildcard and Extra have been changed to Character and NPC. NPCs can be flagged as Wildcards
- Whole bunch of changes to Actor sheets for both Characters and NPCs

### Fixed

- Localization errors that caused field labels on `Weapon` and `Power` Items to disappear

## [v0.4.0] - 2020-03-12

### Added

- Full localization support for the following languages:
  - English
  - Deutsch

## [0.3.0] - 2020-03-10

### Changed

- Completely reworked how Attribute and Skill dice are handled by the data model
- Modified `wildcard` Actor sheet to fit new data model
- Modifed `skill` Item sheet to fit new data model

## [0.2.0] - 2020-03-09

### Added

- Powers support! (The sheet layout for that will be need some adjustment in the future though)
- Fleshed out Inventory tab on the Wildcard sheet
- Items of the type `Edge` can now be designated as a power Edge. If an Actor has a power Edge, the Powers tab will be automatially displayed on the Wildcard sheet
- Equip/Unequip functionality for weapons, armor and shields from the Inventory Tab
- Weapon/Armor/Shield Notes functionality added to Items/Actor Sheet Summary tab

### Changed

- Rolled `Equipment` and `Valuable` Item types into new `Gear` Item type
- Streamlined the `template.json` to better distinguish Wildcards and Extras

### Fixed

- Various code improvements and refactoring
- Finished gear cards on the Summary tab of the Actor sheets

## [0.1.0] - 2020-02-26

### Added

- Wildcard Actor sheet
- Item sheets for the following
  - Skills
  - Edges
  - Hindrances
  - Weapons
  - Armor
  - Shields
  - Powers
  - Equipment
  - Valuables
