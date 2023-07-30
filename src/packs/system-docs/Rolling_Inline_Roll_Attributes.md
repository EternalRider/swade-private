---
id: hwX4nBBG8gzqnJE0
title: Rolling Inline Roll Attributes
sort: 300000
key: '!journal.pages!8uC7RTgJOg8SW4cf.hwX4nBBG8gzqnJE0'
---

You can roll dice directly from the chat using the `/roll` or `/r` command. When rolling via the chat, it's possible to build inline macros so that you can roll any attribute or skill directly.

**Example:** Rolling your character's Strength die with a +4 modifier

```
/r @str + 4
```

These `@` shortcuts are called RollData or Roll Attributes. A list of them is provided below:

- Strength: `@str`
- Agility: `@agi`
- Smarts: `@sma`
- Spirit: `@spi`
- Vigor: `@vig`
- Wounds: `@wounds`
- Fatigue: `@fatigue`
- Skills: `@skill-slug`\*

\* A slug is a name that is converted to all lowercase with spaces replaced with `-`. "Shooting" becomes `@shooting`. "Weird Science" becomes `@weird-science` and so on.

For more examples on how to format rolls in chat, visit the [Foundry VTT website](https://foundryvtt.com/article/dice/).
