# Chaos Protocol — 混沌协议

**Extensible roguelike framework with card battle system.**

Built with [Phaser.js 3](https://phaser.io/) — no build step, open in a browser and play.

## Quick Start

```bash
./start.sh       # Start server and open browser
./stop.sh        # Stop server
npm start        # Same as ./start.sh
npm run serve    # Python http.server (no auto-open)
```

Open `http://localhost:8080` in a browser. Works on mobile + desktop.

## Gameplay

Explore procedurally generated dungeons. When you bump into a monster, enter **card battle** (Slay the Spire-style):

- **Energy**: 3 per turn — spend on cards
- **Cards**: Attack, defend, apply status effects, buff yourself
- **Intents**: Monsters show what they'll do (attack / buff / debuff)
- **Status effects**: Strength, Dexterity, Vulnerable, Weak, Poison
- **Rewards**: After victory, ~40% chance to choose 1 of 3 cards to add to your deck. Deck persists between battles.
- **Deck viewer**: Tap "📋 卡组" in the HUD to inspect your deck anytime
- **Progression**: Enemies scale with depth. Deeper = more HP, block, and special abilities

## Architecture

```
index.html          ← Load Phaser (local lib/phaser.min.js) + ES module entry
lib/                ← Phaser.js 3.60 (vendored, no CDN dependency)
js/
├── main.js         ← Phaser config, shared instance wiring
├── core/
│   ├── EventBus.js    ← Pub/sub decoupling all systems
│   ├── Entity.js      ← Component entity (addComponent / getComponent)
│   ├── GameManager.js ← Central state, entity registry, level transitions
│   ├── PluginSystem.js← Plugin registration + lifecycle
│   └── TurnSystem.js  ← Explore-mode turn loop (chase, no explore attacks)
├── entities/
│   └── factories.js   ← Entity factory functions (player, monsters, items)
├── systems/
│   ├── MapSystem.js   ← Random dungeon generation (rooms + corridors)
│   ├── FOVSystem.js   ← Bresenham raycasting field-of-view
│   ├── CombatSystem.js← Basic melee resolution (used outside card battles)
│   ├── CardSystem.js  ← Card definitions, deck management
│   └── BattleSystem.js← Card battle state machine, status effects, rewards
├── scenes/
│   └── GameScene.js   ← Phaser scene: rendering, input (swipe/d-pad/kbd), HUD, battle UI
└── plugins/
    ├── registry.js    ← Built-in plugin registration
    ├── template.js    ← Plugin creation template with event reference
    └── example-xp.js  ← XP / leveling example plugin
```

### Key Design Decisions

- **No build step**: ES modules loaded directly in the browser. Phaser from CDN.
- **Event-driven**: All inter-system communication via EventBus. Plugins hook into events.
- **Entity-Component**: `entity.addComponent('stats', { hp: 30 })` — easy to extend.
- **Plugin system**: New mechanics are self-contained plugins, no core modification needed.

### Available Events (for plugins)

`game:init` `game:newLevel` `game:over`
`turn:before` `turn:afterPlayer` `turn:afterEnemies` `turn:end`
`entity:spawn` `entity:despawn` `entity:move` `entity:death` `entity:heal`
`combat:melee` `combat:poison`
`player:beforeAction` `player:move` `player:pickup` `player:levelUp`
`battle:start` `battle:won` `battle:lost` `battle:turnStart` `battle:cardPlayed`
`battle:playerBuff` `battle:statusApplied` `battle:enemyBuff` `battle:enemyDebuff`
`plugin:loaded` `plugin:unloaded`

## Adding New Cards

Edit `js/systems/CardSystem.js` and add an entry to `CARD_DB`:

```javascript
{ id:'fireball', name:'火球', cost:2,
  effects:[{type:'damage',value:15},{type:'status',status:'vuln',value:1}],
  desc:'15 伤害 + 脆弱 1 层', type:'attack', rarity:'common' },
```

## Adding New Monsters

Edit `js/entities/factories.js` and add to `MONSTER_TEMPLATES`:

```javascript
// [name, glyph, color, hp, atk, def, xp, minDepth]
['恶魔', 'D', '#ff4444', 40, 8, 3, 40, 5],
```

## Adding New Game Mechanics

Copy `js/plugins/template.js` → `js/plugins/my-plugin.js`, implement event handlers, and register in `js/plugins/registry.js`.

## Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move | WASD / Arrow keys | Swipe or virtual d-pad (bottom-right) |
| Wait | `.` | — |
| Interact / Pick up | `Enter` / `,` / `g` | Tap game area |
| Descend stairs | `>` | Tap d-pad center (⬇) |
| View deck | — | Tap "📋 卡组" in HUD |
| Play card | — | Tap card in battle |
| End turn | — | Tap "结束回合" in battle |

## Tech Stack

- **Runtime**: Browser (Chrome, Safari, Firefox)
- **Engine**: Phaser.js 3.60 (vendored in `lib/`)
- **Language**: JavaScript (ES Modules)
- **Dev server**: Python / Node http-server
- **No dependencies, no build step**
