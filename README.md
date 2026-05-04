# Chaos Protocol — 混沌协议

**可扩展的 Roguelike 框架 + 卡牌战斗系统。**

基于 [Phaser.js 3](https://phaser.io/) — 无需构建，打开浏览器即可玩。

## 快速开始

```bash
./start.sh       # 启动服务并自动打开浏览器
./stop.sh        # 停止服务
npm start        # 同上
npm run serve    # 仅启动 Python 服务（不打开浏览器）
```

浏览器访问 `http://localhost:8080`，支持手机和电脑。

## 玩法

探索程序生成的地牢，撞到怪物进入**卡牌战斗**（类似《杀戮尖塔》）：

- **能量**：每回合 3 点，用来出牌
- **卡牌**：攻击、防御、状态效果、增益
- **意图**：怪物会显示下一步行动（攻击 / 增益 / 减益）
- **状态效果**：力量、敏捷、易伤、脆弱、中毒
- **奖励**：胜利后约 40% 概率获得 3 选 1 卡牌，牌组跨战斗继承
- **查看卡组**：点击 HUD 上的「📋 卡组」随时查看
- **背包系统**：按 `I`/`B` 或点击 HUD 上的「[背包]」打开背包，使用物品
- **物品**：踩到 `!` 标记拾取。生命药水自动使用，力量药水进入背包
- **成长**：敌人随深度增强，更深处有更高 HP、格挡和特殊能力

## 流派系统（v2.0）

每次游戏开始前，选择 **1~3 个流派**，它们决定本局可获得哪些卡牌：

| 流派 | 主题 | 卡牌数 | 核心玩法 |
|------|------|--------|---------|
| ⚔ **狂战** | 力量 & 爆发 | 7张 | 叠力量 → 多段攻击力倍乘 |
| 🛡 **铁壁** | 防御 & 反击 | 7张 | 叠格挡 → 盾牌猛击一锤定音 |
| 🌑 **暗影** | 毒素 & 削弱 | 7张 | 叠毒 → 毒爆翻倍 → 毒伤倍乘 |
| ✦ **圣光** | 治愈 & 祝福 | 6张 | 叠 buff → 圣洁 buff 数倍乘 |
| 🌿 **自然** | 均衡 & 生长 | 7张 | 力敏双修，万物生长 |

### 协同机制（杀戮尖塔风格）

卡牌之间存在明确的连招配合：

**狂战 连招：** 剑舞 → 连击(力量×2) → 狂暴打击(6+2×力量)

**铁壁 连招：** 铁壁 → 铁甲(格挡不消失) → 盾牌猛击(格挡→伤害)

**暗影 连招：** 毒刺 → 毒爆(中毒翻倍!) → 暗影步(6+2×中毒)

**圣光 连招：** 祝福(0费双buff) → 圣洁(4+2×[力+敏])

**自然 连招：** 森林祝福(+力) → 自然之怒(力增伤/敏增盾)

### 流派选择界面

开局展示流派选择面板，可随时重开游戏更换搭配。不同流派组合带来完全不同的 Build 体验。

## 项目结构

```
index.html          ← 入口（加载本地 lib/phaser.min.js + ES 模块）
lib/                ← Phaser.js 3.60（本地化，不依赖 CDN）
js/
├── main.js         ← Phaser 配置，共享实例连接
├── core/
│   ├── EventBus.js    ← 发布/订阅，解耦所有系统
│   ├── Entity.js      ← 组件实体（addComponent / getComponent）
│   ├── GameManager.js ← 核心状态、实体注册、楼层切换
│   ├── PluginSystem.js← 插件注册与生命周期
│   └── TurnSystem.js  ← 探索模式回合循环（怪物追击）
├── entities/
│   └── factories.js   ← 实体工厂（玩家、怪物、物品）
├── systems/
│   ├── MapSystem.js   ← 随机地牢生成（房间 + 走廊）
│   ├── FOVSystem.js   ← Bresenham 射线视野
│   ├── CombatSystem.js← 基础近战（卡牌战斗外用）
│   ├── CardSystem.js  ← 卡牌定义、牌组管理
│   └── BattleSystem.js← 卡牌战斗状态机、状态效果、奖励
├── scenes/
│   └── GameScene.js   ← Phaser 场景：渲染、输入、HUD、战斗 UI
└── plugins/
    ├── registry.js    ← 内置插件注册
    ├── template.js    ← 插件创建模板（含事件参考）
    └── example-xp.js  ← 经验/升级示例插件
```

### 核心设计理念

- **无需构建**：ES 模块直接在浏览器加载，Phaser 本地化
- **事件驱动**：所有系统间通过 EventBus 通信，插件通过事件接入
- **实体组件**：`entity.addComponent('stats', { hp: 30 })` — 易于扩展
- **插件系统**：新机制封装为独立插件，无需修改核心

### 插件可用事件

`game:init` `game:newLevel` `game:over`
`turn:before` `turn:afterPlayer` `turn:afterEnemies` `turn:end`
`entity:spawn` `entity:despawn` `entity:move` `entity:death` `entity:heal`
`combat:melee` `combat:poison`
`player:beforeAction` `player:move` `player:pickup` `player:levelUp`
`battle:start` `battle:won` `battle:lost` `battle:turnStart` `battle:cardPlayed`
`battle:playerBuff` `battle:statusApplied` `battle:enemyBuff` `battle:enemyDebuff`
`plugin:loaded` `plugin:unloaded`

## 添加新卡牌

编辑 `js/systems/CardSystem.js`，在对应流派的 `CARD_DB` 区域添加：

```javascript
// 简单卡牌
{ id:'fireball', name:'火球', cost:2,
  effects:[{type:'damage',value:15},{type:'status',status:'vuln',value:1}],
  desc:'15 伤害 + 脆弱 1 层', type:'attack', rarity:'common', archetype:'berserker' },

// 协同卡牌（力量倍乘）
{ id:'heavy_blow', name:'重锤', cost:2,
  effects:[{type:'damage',value:10, per_str:3}],
  desc:'10 伤害 +3×力量', type:'attack', rarity:'rare', archetype:'berserker' },

// 协同卡牌（格挡转化）
{ id:'body_slam', name:'冲锋', cost:1,
  effects:[{type:'block_damage'}],
  desc:'造成格挡值的伤害', type:'attack', rarity:'common', archetype:'ironwall' },

// 协同卡牌（中毒倍乘）
{ id:'catalyst', name:'催化', cost:1,
  effects:[{type:'multiply_status',status:'poison',multiplier:3}],
  desc:'中毒层数 ×3', type:'skill', rarity:'rare', archetype:'shadow' },
```

### 可用效果类型

| 类型 | 参数 | 说明 |
|------|------|------|
| `damage` | `value`, `target:'all'`, `per_str`, `per_poison`, `per_dex` | 伤害（支持协同倍乘） |
| `block` | `value`, `per_dex` | 格挡 |
| `heal` | `value` | 治疗 |
| `buff` | `stat:'strength'/'dexterity'`, `value` | 增益 |
| `status` | `status`, `value`, `target:'all'` | 状态效果 |
| `block_damage` | — | 格挡值转化为伤害 |
| `multiply_status` | `status`, `multiplier` | 状态层数翻倍 |
| `retain_block` | — | 本回合格挡不消失 |

## 添加新流派

在 `js/systems/CardSystem.js` 的 `ARCHETYPES` 中添加定义，然后在 `CARD_DB` 中添加该流派卡牌，最后在 `getRandomCards` 中自动生效：

## 添加新怪物

编辑 `js/entities/factories.js`，添加到 `MONSTER_TEMPLATES`：

```javascript
// [名称, 字符, 颜色, HP, 攻击, 防御, XP, 最低深度]
['恶魔', 'D', '#ff4444', 40, 8, 3, 40, 5],
```

## 添加新机制

复制 `js/plugins/template.js` → `js/plugins/my-plugin.js`，实现事件处理器，然后在 `js/plugins/registry.js` 中注册。

## 操作说明

| 操作 | 键盘 | 手机 |
|------|------|------|
| 移动 | WASD / 方向键 | 滑动或方向键（右下角） |
| 等待 | `.` | — |
| 交互 / 拾取 | `Enter` / `,` / `g` | 点击游戏区域 |
| 下楼 | `>` | 点击方向键中间 (⬇) |
| 查看卡组 | `D` | 点击 HUD 上的「📋 卡组」 |
| 打开背包 | `I` / `B` | 点击 HUD 上的「[背包]」 |
| 出牌 | — | 战斗中点击卡牌 |
| 结束回合 | — | 点击「结束回合」按钮 |

## 技术栈

- **运行环境**：浏览器（Chrome、Safari、Firefox）
- **引擎**：Phaser.js 3.60（本地 `lib/`）
- **语言**：JavaScript（ES Modules）
- **开发服务器**：Python / Node http-server
- **无依赖、无构建步骤**
