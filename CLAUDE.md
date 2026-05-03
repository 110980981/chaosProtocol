# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (Termux / desktop)
python3 -m http.server 8080

# Or with Node
npx http-server -p 8080
```

Then open `http://localhost:8080` in a browser, or connect from another device on the same LAN using the machine's IP.

## Architecture Overview

**Chaos Protocol** is an extensible roguelike framework built with Phaser.js (CDN-loaded, no build step). It uses ES modules natively in the browser.

### Core systems (js/core/)
- **EventBus** — Central pub/sub. All inter-system communication goes through events. Plugins hook in here.
- **Entity** — Lightweight component entity. Add behaviors via `addComponent(name, data)`.
- **GameManager** — Central state: entity registry, depth, turn count, level transitions.
- **TurnSystem** — Turn loop: player action → enemy AI → end-of-turn hooks.
- **PluginSystem** — Register/unregister plugins. Each plugin provides event handlers.

### Systems (js/systems/)
- **MapSystem** — BSP-style random dungeon generation (rooms + L-corridors), tile queries.
- **FOVSystem** — Recursive shadowcasting field-of-view with configurable radius.
- **CombatSystem** — Melee combat resolution with damage variance.

### Scene (js/scenes/)
- **GameScene** — Phaser scene handling all rendering (Graphics for tiles, Text for entities), input (keyboard + swipe + virtual d-pad), HUD, and message log.

### Plugins (js/plugins/)
- **registry.js** — Registers built-in plugins.
- **template.js** — Copy this to create new plugins. Documents all available events.
- **example-xp.js** — XP/leveling system adding stat growth, level-up events, and passive regen.

### Key events available for plugins
`game:init`, `game:newLevel`, `game:over`, `turn:before`, `turn:afterPlayer`, `turn:afterEnemies`, `turn:end`, `entity:spawn`, `entity:despawn`, `entity:move`, `entity:death`, `entity:heal`, `combat:melee`, `player:beforeAction`, `player:move`, `player:pickup`, `player:levelUp`

## Adding new mechanics

1. Copy `js/plugins/template.js` → `js/plugins/my-thing.js`
2. Fill in event handlers and `init()`
3. Import and register in `js/plugins/registry.js`
4. Add new entities via `js/entities/factories.js`

The event bus keeps plugins decoupled — no plugin needs to import another.
