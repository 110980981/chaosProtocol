import { Entity } from '../core/Entity.js';

export function createPlayer(x, y) {
  return new Entity(x, y, { name: '玩家', glyph: '@', color: '#44aaff' })
    .addComponent('stats', { hp: 50, maxHp: 50, attack: 5, defense: 2, level: 1, xp: 0, xpNext: 20 })
    .addComponent('blocks', {})
    .addComponent('inventory', { items: [], capacity: 10 })
    .addComponent('player', {});
}

const MONSTER_TEMPLATES = [
  //        name   glyph color    hp  atk def  xp  minDepth
  ['老鼠', 'r', '#aaaa44', 14, 3, 0, 5,  1],
  ['蝙蝠', 'b', '#cc8844', 12, 4, 0, 6,  1],
  ['蛇',   's', '#44cc44', 16, 4, 1, 8,  1],
  ['骷髅', 'S', '#dddddd', 22, 5, 2, 15, 2],
  ['幽灵', 'W', '#8844cc', 18, 6, 0, 20, 2],
  ['兽人', 'O', '#44dd44', 28, 7, 2, 25, 3],
  ['石像鬼','G', '#888888', 35, 6, 4, 30, 4],
];

export function createMonster(x, y, depth = 1) {
  // Pick from monsters available at this depth
  const pool = MONSTER_TEMPLATES.filter(t => t[7] <= depth);
  const t = pool[Math.floor(Math.random() * pool.length)];
  const hpMul = 1 + (depth - 1) * 0.35;

  const stats = {
    hp: Math.floor(t[3] * hpMul),
    maxHp: Math.floor(t[3] * hpMul),
    attack: t[4] + Math.floor(depth / 3),
    defense: t[5] + Math.floor(depth / 4),
    xp: t[6] * depth,
  };

  // Higher depth monsters may start with block
  if (depth >= 3 && Math.random() < 0.3) stats.block = 3 + Math.floor(depth / 2);

  return new Entity(x, y, { name: t[0], glyph: t[1], color: t[2] })
    .addComponent('stats', stats)
    .addComponent('blocks', {})
    .addComponent('ai', {});
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
