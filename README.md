# Eventide Teleporter

![Foundry v13](https://img.shields.io/badge/foundry-v13-green)
[![License: LGPL 2.1+](https://img.shields.io/badge/License-LGPL_2.1+-blue.svg)](https://www.gnu.org/licenses/lgpl-2.1.html)

This module is built to handle teleporting players around the map for a gm. It comes with 3 modes:
- **Off:** the module doesn't activate
- **Slow:** While holding the keybinding (settible: default m) you can click to teleport all selected tokens to your mouse position
- **Fast:** When you press the keybinding any selected tokens will telport to your mouse cursor.

## Installation:

1. In Foundry VTT, navigate to the "Modules" tab
2. Click "Install System"
3. In the "Manifest URL" field, paste: https://github.com/EventideMiles/eventide-teleporter/releases/latest/download/module.json
4. Click "Install"
5. Enable the module in your world modules list.

### Alternative Installation:

1. Download the module from the [Foundry VTT Module Registry](https://foundryvtt.com/packages/eventide-teleporter) or [GitHub Releases](https://github.com/lunarrush/eventide-teleporter/releases).
2. Extract the downloaded zip file to your FoundryVTT `Data/modules` directory.
3. Enable the module in your world modules list.

## Usage

- The default keybinding is m. You can change it in foundry's Configure Controls menu.
- The module will add a button to the left-hand side with the scene controls.
- Clicking the button will cycle through the modes.
  - **Off:** the module doesn't activate
  - **Slow:** While holding the keybinding (settible: default m) you can click to teleport all selected tokens to your mouse position
  - **Fast:** When you press the keybinding any selected tokens will telport to your mouse cursor.

# Module Settings
- **Snap to Grid:** If enabled, the module will snap the teleported tokens to the nearest grid square center. (default: true)
- **Mode:** The mode to use when the module is activated. (default: slow)

# License
This project is licensed under LGPL 2.1+. See the LICENSE.md file for more details.