/** 流派 (Archetype) definitions — like Hearthstone card packs */
export const ARCHETYPES = {
  berserker: { id:'berserker', name:'狂战', desc:'力量与爆发', color:0xff4444 },
  ironwall:  { id:'ironwall',  name:'铁壁', desc:'防御与反击', color:0x4488ff },
  shadow:    { id:'shadow',    name:'暗影', desc:'毒素与削弱', color:0xaa44ff },
  holy:      { id:'holy',      name:'圣光', desc:'治愈与祝福', color:0xffdd44 },
  nature:    { id:'nature',    name:'自然', desc:'均衡与生长', color:0x44dd44 },
};

/**
 * 品质系统 (Quality System)
 *   minDepth — 最低关卡深度才能掉落该品质
 *   color    — UI 中品质标识色
 */
export const QUALITY = {
  basic:     { id:'basic',     name:'基础', color:'#888888',  minDepth: 0 },
  common:    { id:'common',    name:'普通', color:'#cccccc',  minDepth: 0 },
  rare:      { id:'rare',      name:'稀有', color:'#4488ff',  minDepth: 2 },
  epic:      { id:'epic',      name:'史诗', color:'#cc44ff',  minDepth: 4 },
  legendary: { id:'legendary', name:'传说', color:'#ff8800',  minDepth: 7 },
};

/**
 * 价值模型 (Value Model)
 *   每张卡牌的总价值 = Σ(效果 × 转换系数)
 *   目标价值区间 (cost 为费用)：
 *     common:    cost × 6~8
 *     rare:      cost × 9~12
 *     epic:      cost × 13~16
 *     legendary: cost × 17~22
 *   提醒: buff 类效果价值随战斗回合数增长，常略低于基准线。
 */
const VALUE = {
  damage: 1.0,
  block:  1.0,
  heal:   1.2,
  poison: 0.8,
  weak:   2.5,
  vuln:   3.5,
  strength: 5.0,
  dexterity: 5.0,
};

const QUALITY_VALUE_MULT = {
  basic:     5,
  common:    7,
  rare:     10,
  epic:     14,
  legendary: 19,
};

/** 计算单张卡牌的价值分数 */
export function getCardValue(card) {
  let total = 0;
  for (const eff of card.effects) {
    let ev = 0;
    switch (eff.type) {
      case 'damage':
        ev = (eff.value || 0) * VALUE.damage;
        if (eff.per_str) ev += 3 * eff.per_str * VALUE.strength * 0.2;
        if (eff.per_dex) ev += 3 * eff.per_dex * VALUE.dexterity * 0.2;
        if (eff.per_poison) ev += 3 * eff.per_poison * VALUE.poison * 0.2;
        break;
      case 'block':
        ev = (eff.value || 0) * VALUE.block;
        if (eff.per_dex) ev += 3 * eff.per_dex * VALUE.dexterity * 0.2;
        break;
      case 'heal':
        ev = (eff.value || 0) * VALUE.heal;
        break;
      case 'buff':
        ev = eff.value * (VALUE[eff.stat] || 5);
        break;
      case 'status':
        ev = eff.value * (VALUE[eff.status] || 1);
        break;
      case 'retain_block':  ev = 3; break;
      case 'block_damage':  ev = 4; break;
      case 'double_block':  ev = 6; break;
      case 'multiply_status': ev = 4; break;
    }
    if (eff.target === 'all') ev *= 0.6;
    total += ev;
  }
  return Math.round(total * 10) / 10;
}

/** 获取某个品质在指定深度的掉落权重 */
function getQualityWeights(depth) {
  return {
    common:    Math.max(15, 50 - depth * 3),
    rare:      depth >= 2 ? Math.min(45, 30 + depth * 1) : 0,
    epic:      depth >= 4 ? Math.min(30, 8 + (depth - 4) * 3) : 0,
    legendary: depth >= 7 ? Math.min(15, 2 + (depth - 7) * 2) : 0,
  };
}

export function getQualityColor(qualityId) {
  const q = Object.values(QUALITY).find(q => q.id === qualityId);
  return q ? q.color : '#888';
}

export function getQualityName(qualityId) {
  const q = Object.values(QUALITY).find(q => q.id === qualityId);
  return q ? q.name : qualityId;
}

const CARD_DB = [
  // ── Basic (starter deck only) ──
  { id:'strike', name:'打击', cost:1, effects:[{type:'damage',value:6}], desc:'造成 6 伤害', type:'attack', quality:'basic' },
  { id:'defend', name:'防御', cost:1, effects:[{type:'block', value:5}], desc:'获得 5 格挡', type:'skill', quality:'basic' },
  { id:'heal',   name:'治疗', cost:1, effects:[{type:'heal', value:8}], desc:'恢复 8 生命', type:'skill', quality:'basic' },

  // ── 狂战 (Berserker) ── 力量 × 多段 = 爆炸输出
  { id:'sword_dance',   name:'剑舞',    cost:1, effects:[{type:'buff',stat:'strength',value:1}], desc:'获得 1 力量',               type:'power',  quality:'common', archetype:'berserker' },
  { id:'double_strike', name:'连击',    cost:1, effects:[{type:'damage',value:5},{type:'damage',value:5}], desc:'5 伤害 ×2',          type:'attack', quality:'common', archetype:'berserker' },
  { id:'strike2',       name:'重击',    cost:2, effects:[{type:'damage',value:14}], desc:'造成 14 伤害',                type:'attack', quality:'common', archetype:'berserker' },
  { id:'rage',          name:'怒火',    cost:1, effects:[{type:'buff',stat:'strength',value:2},{type:'damage',value:3}], desc:'+2 力量 +3 伤害',   type:'power',  quality:'rare',   archetype:'berserker' },
  { id:'war_cry',       name:'战吼',    cost:2, effects:[{type:'damage',value:12},{type:'buff',stat:'strength',value:1}], desc:'12 伤害 +1 力量',    type:'attack', quality:'rare',   archetype:'berserker' },
  { id:'frenzy_strike', name:'狂暴打击', cost:1, effects:[{type:'damage',value:6, per_str:2}], desc:'6 伤害 +2×力量',      type:'attack', quality:'rare',   archetype:'berserker' },
  { id:'blood_thirst',  name:'血渴',    cost:0, effects:[{type:'damage',value:3},{type:'heal',value:2}], desc:'3 伤害 吸血 2',      type:'attack', quality:'rare',   archetype:'berserker' },
  // 史诗 / 传说
  { id:'berserker_fury',  name:'狂战之怒', cost:2, effects:[{type:'buff',stat:'strength',value:3},{type:'damage',value:8}], desc:'+3 力量 +8 伤害',        type:'power',  quality:'epic',      archetype:'berserker' },
  { id:'colossus_smash',  name:'巨人粉碎', cost:3, effects:[{type:'damage',value:20, per_str:3}], desc:'20 伤害 +3×力量',         type:'attack', quality:'legendary', archetype:'berserker' },

  // ── 铁壁 (Iron Wall) ── 叠甲 → 盾猛
  { id:'fortify',       name:'铁壁',    cost:2, effects:[{type:'block',value:14}], desc:'获得 14 格挡',                           type:'skill', quality:'common', archetype:'ironwall' },
  { id:'shield_bash',   name:'盾击',    cost:1, effects:[{type:'block',value:6},{type:'damage',value:7}], desc:'6 格挡 +7 伤害',      type:'skill', quality:'common', archetype:'ironwall' },
  { id:'stand_firm',    name:'坚守',    cost:1, effects:[{type:'block',value:6},{type:'heal',value:4}], desc:'6 格挡 +恢复 4',       type:'skill', quality:'common', archetype:'ironwall' },
  { id:'shield_slam',   name:'盾牌猛击', cost:1, effects:[{type:'block_damage',multiplier:2}], desc:'消耗所有格挡，造成 2 倍格挡伤害', type:'attack', quality:'common', archetype:'ironwall' },
  { id:'iron_armor',    name:'铁甲',    cost:2, effects:[{type:'block',value:10},{type:'retain_block'}], desc:'10 格挡，永久保留格挡（消耗）', type:'skill', quality:'rare', archetype:'ironwall' },
  { id:'bulwark',       name:'铜墙铁壁', cost:2, effects:[{type:'block',value:14},{type:'buff',stat:'dexterity',value:1}], desc:'14 格挡 +1 敏捷', type:'skill', quality:'rare', archetype:'ironwall' },
  { id:'entrench',      name:'深垒',    cost:2, effects:[{type:'double_block'}], desc:'格挡翻倍',                                type:'skill', quality:'rare', archetype:'ironwall' },
  { id:'retaliate',     name:'反击',    cost:2, effects:[{type:'block',value:14},{type:'damage',value:6,target:'all'}], desc:'14 格挡，全体 6 反击', type:'skill', quality:'rare', archetype:'ironwall' },
  // 史诗 / 传说
  { id:'fortress',  name:'堡垒',    cost:2, effects:[{type:'block',value:22}], desc:'获得 22 格挡', type:'skill', quality:'epic',      archetype:'ironwall' },
  { id:'bastion',   name:'不落要塞', cost:3, effects:[{type:'block',value:30},{type:'retain_block'}], desc:'30 格挡，永久保留格挡（消耗）', type:'skill', quality:'legendary', archetype:'ironwall' },

  // ── 暗影 (Shadow) ── 叠毒 → 毒爆
  { id:'poison_stab',   name:'毒刺',    cost:1, effects:[{type:'damage',value:4},{type:'status',status:'poison',value:3}], desc:'4 伤害 +3 中毒',        type:'attack', quality:'common', archetype:'shadow' },
  { id:'weaken',        name:'弱点打击', cost:1, effects:[{type:'damage',value:5},{type:'status',status:'weak',value:1}], desc:'5 伤害 +易伤 1 层',      type:'attack', quality:'common', archetype:'shadow' },
  { id:'shadow_step',   name:'暗影步',   cost:1, effects:[{type:'damage',value:6, per_poison:2}], desc:'6 伤害 +2×中毒',    type:'attack', quality:'common', archetype:'shadow' },
  { id:'venom_blade',   name:'淬毒匕首', cost:2, effects:[{type:'damage',value:8},{type:'status',status:'poison',value:5}], desc:'8 伤害 +5 中毒',         type:'attack', quality:'rare',   archetype:'shadow' },
  { id:'poison_cloud',  name:'毒雾',    cost:2, effects:[{type:'status',status:'poison',value:5,target:'all'}], desc:'全体中毒 5 层',                  type:'skill',  quality:'rare',   archetype:'shadow' },
  { id:'toxin_burst',   name:'毒爆',    cost:1, effects:[{type:'multiply_status',status:'poison',multiplier:2}], desc:'中毒层数翻倍',                   type:'skill',  quality:'rare',   archetype:'shadow' },
  { id:'shadow_assault',name:'暗影突袭', cost:2, effects:[{type:'damage',value:12},{type:'status',status:'vuln',value:2}], desc:'12 伤害 +脆弱 2 层',      type:'attack', quality:'rare',   archetype:'shadow' },
  // 史诗 / 传说
  { id:'deadly_venom',  name:'致命毒液', cost:2, effects:[{type:'damage',value:6},{type:'status',status:'poison',value:6}], desc:'6 伤害 +6 中毒',           type:'attack', quality:'epic',      archetype:'shadow' },
  { id:'annihilate',    name:'湮灭',    cost:3, effects:[{type:'damage',value:0, per_poison:4}], desc:'造成 4×目标中毒层数的伤害',                    type:'attack', quality:'legendary', archetype:'shadow' },

  // ── 圣光 (Holy Light) ── 光暗相生，愈战愈强
  { id:'holy_bolt',         name:'圣光弹',    cost:1, effects:[{type:'damage',value:5},{type:'heal',value:4}], desc:'5 伤害 +恢复 4',             type:'attack', quality:'common', archetype:'holy' },
  { id:'divine_protection', name:'神圣庇护',  cost:1, effects:[{type:'block',value:5},{type:'heal',value:5}], desc:'5 格挡 +恢复 5',             type:'skill',  quality:'common', archetype:'holy' },
  { id:'sanctity',          name:'圣洁',      cost:1, effects:[{type:'damage',value:4, per_str:2, per_dex:2}], desc:'4 伤害 +2×(力量+敏捷)',   type:'attack', quality:'common', archetype:'holy' },
  { id:'blessing',          name:'祝福',      cost:0, effects:[{type:'buff',stat:'strength',value:1},{type:'buff',stat:'dexterity',value:1}], desc:'+1 力量 +1 敏捷', type:'power', quality:'rare', archetype:'holy' },
  { id:'holy_radiance',     name:'圣光普照',  cost:2, effects:[{type:'damage',value:5,target:'all'},{type:'heal',value:8}], desc:'全体 5 伤害 +恢复 8', type:'attack', quality:'rare', archetype:'holy' },
  { id:'redemption',        name:'救赎',      cost:2, effects:[{type:'heal',value:15},{type:'buff',stat:'strength',value:1}], desc:'恢复 15 +1 力量',  type:'skill',  quality:'rare', archetype:'holy' },
  // 史诗 / 传说
  { id:'divine_judgment', name:'神圣审判', cost:2, effects:[{type:'damage',value:10,target:'all'},{type:'heal',value:8}], desc:'全体 10 伤害 +恢复 8', type:'attack', quality:'epic',      archetype:'holy' },
  { id:'salvation',       name:'救赎之光', cost:3, effects:[{type:'heal',value:20},{type:'buff',stat:'strength',value:2},{type:'buff',stat:'dexterity',value:2}], desc:'恢复 20 +2 力量 +2 敏捷', type:'power', quality:'legendary', archetype:'holy' },

  // ── 自然 (Nature) ── 均衡成长
  { id:'cleave',          name:'横扫',      cost:1, effects:[{type:'damage',value:5,target:'all'}], desc:'对所有敌人 5 伤害',              type:'attack', quality:'common', archetype:'nature' },
  { id:'thorn_vine',      name:'荆棘缠绕',   cost:1, effects:[{type:'block',value:6},{type:'damage',value:3,target:'all'}], desc:'6 格挡，全体 3 荆棘伤害', type:'skill', quality:'common', archetype:'nature' },
  { id:'forest_blessing', name:'森林祝福',   cost:1, effects:[{type:'buff',stat:'strength',value:1},{type:'heal',value:5}], desc:'+1 力量 +恢复 5',        type:'power',  quality:'common', archetype:'nature' },
  { id:'rejuvenate',      name:'恢复',      cost:1, effects:[{type:'heal',value:6},{type:'block',value:4}], desc:'恢复 6 +4 格挡',           type:'skill',  quality:'common', archetype:'nature' },
  { id:'nature_wrath',    name:'自然之怒',   cost:1, effects:[{type:'damage',value:4, per_str:2},{type:'block',value:4, per_dex:2}], desc:'4 伤害+2×力量，4 格挡+2×敏捷', type:'attack', quality:'rare', archetype:'nature' },
  { id:'life_bloom',      name:'生命绽放',   cost:2, effects:[{type:'heal',value:12},{type:'buff',stat:'dexterity',value:1}], desc:'恢复 12 +1 敏捷',          type:'skill',  quality:'rare',   archetype:'nature' },
  { id:'force_of_nature', name:'自然之力',   cost:2, effects:[{type:'damage',value:12},{type:'heal',value:6}], desc:'12 伤害 +恢复 6',          type:'attack', quality:'rare',   archetype:'nature' },
  // 史诗 / 传说
  { id:'wild_growth', name:'野蛮生长', cost:2, effects:[{type:'damage',value:8,target:'all'},{type:'heal',value:8}], desc:'全体 8 伤害 +恢复 8', type:'attack', quality:'epic',      archetype:'nature' },
  { id:'primal_fury', name:'原始之怒', cost:3, effects:[{type:'damage',value:8,target:'all',per_str:2}], desc:'全体 8 伤害 +2×力量',            type:'attack', quality:'legendary', archetype:'nature' },
];

/** 每种品质卡牌数量统计 */
export function getArchetypeCardCount(archetypeId) {
  return CARD_DB.filter(c => c.archetype === archetypeId).length;
}

export function getCard(id) {
  const t = CARD_DB.find(c => c.id === id);
  return t ? { ...t } : null;
}

/**
 * 深度感知的随机卡牌选取
 *   - 根据 depth 过滤可掉落品质
 *   - 按品质权重 roll 品质 → 再 roll 该品质下的卡牌
 */
export function getRandomCards(count, selectedArchetypes = null, excludeIds = [], depth = 1) {
  // 基础池：非基础、未排除、品质达标
  let pool = CARD_DB.filter(c => {
    if (c.quality === 'basic') return false;
    if (excludeIds.includes(c.id)) return false;
    const qDef = Object.values(QUALITY).find(q => q.id === c.quality);
    if (!qDef || qDef.minDepth > depth) return false;
    return true;
  });

  // 按流派过滤
  if (selectedArchetypes && selectedArchetypes.length > 0) {
    pool = pool.filter(c => c.archetype && selectedArchetypes.includes(c.archetype));
  }

  if (pool.length === 0) return [];

  const weights = getQualityWeights(depth);
  const cards = [];
  const available = [...pool];

  for (let i = 0; i < count && available.length > 0; i++) {
    // 按深度权重抽取品质
    const activeQualities = Object.keys(weights).filter(q => weights[q] > 0);
    const totalWeight = activeQualities.reduce((sum, q) => sum + weights[q], 0);
    if (totalWeight <= 0) break;

    let roll = Math.random() * totalWeight;
    let pickedQuality = activeQualities[activeQualities.length - 1];
    for (const q of activeQualities) {
      roll -= weights[q];
      if (roll < 0) { pickedQuality = q; break; }
    }

    // 找该品质的可用卡牌
    const qualityCards = available.filter(c => c.quality === pickedQuality);
    if (qualityCards.length === 0) continue;

    const idx = Math.floor(Math.random() * qualityCards.length);
    const picked = qualityCards[idx];
    cards.push({ ...picked });

    // 从可用池移除(不重复选同一张)
    const availIdx = available.indexOf(picked);
    if (availIdx >= 0) available.splice(availIdx, 1);
  }

  return cards;
}

export function createStarterDeck() {
  const deck = [];
  for (let i = 0; i < 5; i++) deck.push(getCard('strike'));
  for (let i = 0; i < 4; i++) deck.push(getCard('defend'));
  deck.push(getCard('heal'));
  return deck;
}

export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
