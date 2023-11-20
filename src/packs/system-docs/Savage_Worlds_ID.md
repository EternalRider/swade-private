---
foundry:
  _key: '!journal.pages!8uC7RTgJOg8SW4cf.sEULsXQtiNxTDent'
  _id: sEULsXQtiNxTDent
  name: The Savage Worlds ID
  sort: 450000
---

The Savage Worlds ID (or SWID for short) is a semi-unique string in Item documents that is generated from an Item's name. SWIDS are **not** automatically updated when you change the name of an item, allowing the system to identify an item without considering the name, as the SWID stays stable.

The SWID itself is a [strictly slugged string](https://itnext.io/whats-a-slug-f7e74b6c23e0), so `Hard to Kill` becomes `hard-to-kill`, `Kämpfen` becomes `kampfen` etc

The parry calculation is a good example for this. To calculate the parry score we need to find the Fighting skill, but this may be called something different in other languages. As long as the skill item has the SWID of `fighting` we can identify it regardless of name.

The `any` and `none` swids are reserved.

### For Users

All Item documents have a Savage Worlds ID, which can be seen and edited in the Tweaks window. You can manually set a swid there too, but we recommend using the button next to the input to let the system generate one for you based on the Item's current name. Changing the Savage Worlds ID of an item may break references to this item so please be cautious.

### For Developers

The swid can be found under `item.system.swid`. Should you want to generate a SWID yourself you can do so via the provided `game.swade.util.slugify` method.

The system will automatically assign a SWID to a newly created Item if none was provided in the initial creation data.

The `SwadeActor` class provides two utility functions for retrieving items via their swid, both functions take a swid as the first argument and optionally a `type` (such as `skill` or `edge`).

- `SwadeActor#getItemsBySwid`, returns an array of SwadeItems that match the swid (and optionally type)
- `SwadeActor#getSingleItemBySwid`, returns the first item that matched the swid (and optionally type) or `undefined` if no item was found.
