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

## Card Design Rules

All cards in `js/systems/CardSystem.js` must follow these rules.

### 1. Quality System (品质)

Each card has a `quality` field. Quality gates card drops by depth:

| quality    | minDepth | UI color | Drops |
|------------|----------|----------|-------|
| `basic`    | 0        | `#888`   | Starter deck only, never in rewards |
| `common`   | 0        | `#ccc`   | Always available |
| `rare`     | 2        | `#48f`   | From depth 2+ |
| `epic`     | 4        | `#c4f`   | From depth 4+ |
| `legendary`| 7        | `#f80`   | From depth 7+ |

Drop weight function (`getQualityWeights`, depth = d):
```
common:    max(15, 50 - d×3)
rare:      d≥2 ? min(45, 30 + d) : 0
epic:      d≥4 ? min(30, 8 + (d-4)×3) : 0
legendary: d≥7 ? min(15, 2 + (d-7)×2) : 0
```

### 2. Value Model (价值模型)

Card value = Σ(effect × conversion rate). Target range per cost × quality:

| quality    | value per energy |
|------------|-----------------|
| `common`   | 6～8 |
| `rare`     | 9～12 |
| `epic`     | 13～16 |
| `legendary`| 17～22 |

Effect → point conversion (see `getCardValue()`):
```
damage:   1.0    block:     1.0
heal:     1.2    poison:    0.8
weak:     2.5    vuln:      3.5
strength: 5.0    dexterity: 5.0
AOE:      ×0.6   (multi-target)
```

Rules:
- **Cost 0 cards**: value 3～6 (utility/synergy only, never raw efficiency).
- **per_str / per_poison scaling**: estimated at 3 stacks average, 20% of full value counted.
- **Synergy-only effects** (`retain_block`, `block_damage`, `double_block`, `multiply_status`): flat bonus 3～6, since value depends on combo.
- **Hybrid cards** (damage + block etc.) are allowed; each effect counts independently.
- A card's final value should be within ±15% of its target range. If outside, adjust numbers or quality tier.

### 6. Intentional Rule-Breakers

设计上允许部分卡牌突破 ±15% 的数值约束，以塑造流派特色和趣味性。常见破规模式：

- **多段 / 成长型** — base 值偏低，但随 per_str / per_dex 膨胀。
- **combo 组件** — 单卡价值低，配合另一张卡产生质变（如毒爆+中毒、深垒+格挡）。
- **0 费卡** — 免费意味着任何正收益都是高性价比，设计上故意提供低数值功能。
- **传说卡** — 高费用、高潜力，模型低估了 per_* 和 AOE 的上限。
- **混合溢价** — 一张牌同时做两件事，效率略高是正常的。

添加新卡时请先尽量贴合模型。只有当规则会扼杀设计时才使用破规模式，并注明理由。

### 3. Effects Reference (when adding new effect types)

New effect types must be added in two places:
1. `BattleSystem._resolveEffects()` — resolve logic
2. `CardSystem.VALUE` + `getCardValue()` — value model point conversion

Use `target:'all'` for area-of-effect. AOE applies ×0.6 value multiplier.

### 4. Archetype Balance Constraints

Each archetype's synergy must be supported by at least 2 common cards:
- **berserker**: strength gain + strength-scaling damage
- **ironwall**: block gain + block-consumption payoff
- **shadow**: poison stacking + poison-multiply combo
- **holy**: buff + healing sustain
- **nature**: mixed hybrid effects + scaling

### 5. Depth Scaling Reference (关卡参考)

Enemy stat scaling factors in `_buildMonster()`:
```
hpMul:    1 + (depth-1)×0.35  (+elite ×1.6)
atkBonus: floor(depth/3)
defBonus: floor(depth/4)
```
This means a depth N common monster ≈ card value of N×7 (common quality). Adjust encounter difficulty to be within player's expected deck value at that depth.
