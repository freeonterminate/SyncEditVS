# SyncEdit

A Visual Studio Code extension that replicates Delphi's SyncEdit feature.

日本語での説明は [README.ja.md](./README.ja.md) をご覧ください。

## Overview

SyncEdit detects words that appear multiple times within a selected range and allows you to edit all instances at once using multi-cursor editing.  
It brings the Delphi-style synchronized editing experience to VSCode.

## Demo

![SyncEdit demo](https://github.com/freeonterminate/SyncEditVS/blob/main/syncedit.gif?raw=true)

---

## Features

- Detects words that appear more than once within the selected range
- Places multi-cursors at all occurrences
- Simultaneous editing of all matching words
- Highlights target words with color and the selected region with background
- Customizable and theme-based color presets
- Press `Tab` to switch to the next repeated word
- Cancel SyncEdit with `ESC`, mouse click, or moving the cursor outside the selection

---

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| `SyncEdit: Start` | `Ctrl+Shift+J` | Start SyncEdit for repeated words in the selection |
| `SyncEdit: Next Word` | `Tab` | Move to the next repeated word |
| `SyncEdit: Cancel` | `Esc` | Exit SyncEdit mode |

> All keybindings can be changed in settings.

---

## Extension Settings (`settings.json`)

```json
"syncEdit.colorPreset": "custom",
"syncEdit.wordTextColor": "#ff3399",
"syncEdit.regionBackgroundColor": "#264f78aa"
```

- `colorPreset`: choose from `"fun"`, `"dark"`, `"light"`, `"high-contrast"`
- `"custom"` allows custom color settings below to take effect
- Colors should be in RGBA format (e.g. `#ff0000cc`)

---

## Localization

- 🇯🇵 Japanese
- 🇺🇸 English  
The UI will switch automatically based on your VSCode display language.

---

## License

MIT

---

## Author

[piksware](https://piksware.com/)
