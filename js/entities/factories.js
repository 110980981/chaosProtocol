import { Entity } from '../core/Entity.js';

/* ─── Monster behavior types ─── */
export const BEHAVIOR = {
  AGGRESSIVE: 'aggressive',     // Mostly attacks
  DEFENSIVE:  'defensive',      // Blocks & counterattacks
  STATUS:     'status',         // Applies poison/weak
  BALANCED:   'balanced',       // Mixed approach
  RITUALIST:  'ritualist',      // Self-buffs over time (scales)
  SWARM:      'swarm',          // Low HP, comes in groups
  ELITE:      'elite',          // Tougher, better loot
  BOSS:       'boss',           // Unique boss mechanics
};

/* ─── Monster templates ───
 *   { name, glyph, color, hpBase, atk, def, xp, minDepth, behavior, desc }
 *   Stats scale with depth (hpMul, atkBonus, defBonus).
 *   desc is shown in battle for flavor.
 */
const MONSTER_TEMPLATES = [
  // ── Depth 1+: Basic enemies ──
  { name:'老鼠', glyph:'r', color:'#aaaa44', hpBase:14, atk:3, def:0, xp:5,  minDepth:1, behavior:BEHAVIOR.AGGRESSIVE, desc:'一只龇牙的老鼠' },
  { name:'蝙蝠', glyph:'b', color:'#cc8844', hpBase:12, atk:4, def:0, xp:6,  minDepth:1, behavior:BEHAVIOR.AGGRESSIVE, desc:'黑暗中扑翅的身影' },
  { name:'蛇',   glyph:'s', color:'#44cc44', hpBase:16, atk:4, def:1, xp:8,  minDepth:1, behavior:BEHAVIOR.STATUS,     desc:'嘶嘶作响的毒蛇' },
  { name:'史莱姆',glyph:'j', color:'#44dd88', hpBase:15, atk:3, def:0, xp:7,  minDepth:1, behavior:BEHAVIOR.BALANCED,   desc:'软泥怪缓缓蠕动' },
  { name:'哥布林',glyph:'g', color:'#88aa44', hpBase:10, atk:5, def:0, xp:6,  minDepth:1, behavior:BEHAVIOR.SWARM,     desc:'矮小的绿皮偷袭者' },

  // ── Depth 2+: Intermediate enemies ──
  { name:'骷髅',   glyph:'S', color:'#dddddd', hpBase:22, atk:5, def:2, xp:15, minDepth:2, behavior:BEHAVIOR.DEFENSIVE, desc:'复活的骸骨战士' },
  { name:'幽魂',   glyph:'W', color:'#8844cc', hpBase:18, atk:6, def:0, xp:20, minDepth:2, behavior:BEHAVIOR.STATUS,    desc:'冰冷的哀嚎灵体' },
  { name:'暗影刺客',glyph:'X', color:'#6644aa', hpBase:16, atk:8, def:0, xp:18, minDepth:2, behavior:BEHAVIOR.AGGRESSIVE,desc:' shadows中的致命利刃' },

  // ── Depth 3+: Strong enemies ──
  { name:'兽人',    glyph:'O', color:'#44dd44', hpBase:28, atk:7, def:2, xp:25, minDepth:3, behavior:BEHAVIOR.RITUALIST, desc:'挥舞战斧的绿皮战士' },
  { name:'石像鬼',  glyph:'G', color:'#888888', hpBase:35, atk:6, def:5, xp:30, minDepth:3, behavior:BEHAVIOR.DEFENSIVE, desc:'坚如磐石的活雕像' },
  { name:'毒蜘蛛',  glyph:'T', color:'#66bb22', hpBase:20, atk:5, def:1, xp:22, minDepth:3, behavior:BEHAVIOR.STATUS,    desc:'八足剧毒猎手' },

  // ── Depth 4+: High-tier enemies ──
  { name:'恶魔',     glyph:'D', color:'#ff4444', hpBase:38, atk:8, def:3, xp:35, minDepth:4, behavior:BEHAVIOR.RITUALIST, desc:'来自地狱的燃烧之躯' },
  { name:'吸血鬼',   glyph:'V', color:'#cc2266', hpBase:30, atk:7, def:2, xp:32, minDepth:4, behavior:BEHAVIOR.BALANCED,   desc:'渴血的夜之贵族' },

  // ── Elite (depth 2+) ──
  { name:'精英·守卫', glyph:'E', color:'#ffaa00', hpBase:42, atk:9, def:3, xp:50, minDepth:2, behavior:BEHAVIOR.ELITE, desc:'全身重甲的精英战士' },
  { name:'精英·祭祀', glyph:'C', color:'#cc44ff', hpBase:36, atk:7, def:2, xp:55, minDepth:2, behavior:BEHAVIOR.ELITE, desc:'邪神低语的狂信徒' },

  // ── Boss (depth 5, 10, ...) ──
  { name:'深渊领主', glyph:'A', color:'#ff2200', hpBase:80, atk:12, def:5, xp:200, minDepth:5, behavior:BEHAVIOR.BOSS, desc:'深渊的支配者降临！' },
];

export function createMonster(x, y, depth = 1) {
  const pool = MONSTER_TEMPLATES.filter(t => t.minDepth <= depth && t.behavior !== BEHAVIOR.BOSS);
  const t = pool[Math.floor(Math.random() * pool.length)];
  return _buildMonster(x, y, t, depth);
}

export function createEliteMonster(x, y, depth = 1) {
  const pool = MONSTER_TEMPLATES.filter(t => t.behavior === BEHAVIOR.ELITE && t.minDepth <= depth);
  if (pool.length === 0) return createMonster(x, y, depth);
  const t = pool[Math.floor(Math.random() * pool.length)];
  return _buildMonster(x, y, t, depth, true);
}

export function createBossMonster(x, y, depth = 1) {
  const pool = MONSTER_TEMPLATES.filter(t => t.behavior === BEHAVIOR.BOSS && t.minDepth <= depth);
  if (pool.length === 0) return createEliteMonster(x, y, depth);
  const t = pool[Math.floor(Math.random() * pool.length)];
  return _buildMonster(x, y, t, depth, true);
}

function _buildMonster(x, y, t, depth, isElite = false) {
  const hpMul = isElite ? 1.6 : 1 + (depth - 1) * 0.35;
  const atkBonus = Math.floor(depth / 3);
  const defBonus = Math.floor(depth / 4);

  const stats = {
    hp: Math.floor(t.hpBase * hpMul),
    maxHp: Math.floor(t.hpBase * hpMul),
    attack: (isElite ? t.atk + 3 : t.atk) + atkBonus,
    defense: (isElite ? t.def + 2 : t.def) + defBonus,
    xp: (isElite ? t.xp * 2 : t.xp) * depth,
    behavior: t.behavior,
  };

  // Higher depth / elite monsters may start with block
  if (isElite || (depth >= 3 && Math.random() < 0.3)) {
    stats.block = (isElite ? 8 : 3) + Math.floor(depth / 2);
  }

  // Swarm enemies have half HP but come in larger groups
  if (t.behavior === BEHAVIOR.SWARM) {
    stats.hp = Math.floor(stats.hp * 0.7);
    stats.maxHp = Math.floor(stats.maxHp * 0.7);
  }

  return new Entity(x, y, { name: t.name, glyph: t.glyph, color: t.color })
    .addComponent('stats', stats)
    .addComponent('blocks', {})
    .addComponent('ai', {})
    .addComponent('monsterInfo', { behavior: t.behavior, desc: t.desc });
}

/* ─── Existing item factories (unchanged) ─── */

export function createPlayer(x, y) {
  return new Entity(x, y, { name: '玩家', glyph: '@', color: '#44aaff' })
    .addComponent('stats', { hp: 50, maxHp: 50, attack: 5, defense: 2, level: 1, xp: 0, xpNext: 20 })
    .addComponent('blocks', {})
    .addComponent('inventory', { items: [], capacity: 10 })
    .addComponent('player', {});
}

export function createHealthPotion(x, y, value = 15) {
  return new Entity(x, y, { name: '生命药水', glyph: '!', color: '#ff4444' })
    .addComponent('item', { type: 'potion', effect: 'heal', value, stackable: true });
}

export function createStrengthPotion(x, y) {
  return new Entity(x, y, { name: '力量药水', glyph: '!', color: '#ff8844' })
    .addComponent('item', { type: 'potion', effect: 'buffAttack', value: 2, duration: 20 });
}

export function createStairsDown(x, y) {
  return new Entity(x, y, { name: '向下的楼梯', glyph: '>', color: '#ffaa00' })
    .addComponent('stairs', { direction: 'down' });
}

export function createStairsUp(x, y) {
  return new Entity(x, y, { name: '向上的楼梯', glyph: '<', color: '#ffaa00' })
    .addComponent('stairs', { direction: 'up' });
}
