/** 流派 (Archetype) definitions — like Hearthstone card packs */
export const ARCHETYPES = {
  berserker: { id:'berserker', name:'狂战', desc:'力量与爆发', color:0xff4444 },
  ironwall:  { id:'ironwall',  name:'铁壁', desc:'防御与反击', color:0x4488ff },
  shadow:    { id:'shadow',    name:'暗影', desc:'毒素与削弱', color:0xaa44ff },
  holy:      { id:'holy',      name:'圣光', desc:'治愈与祝福', color:0xffdd44 },
  nature:    { id:'nature',    name:'自然', desc:'均衡与生长', color:0x44dd44 },
};

const CARD_DB = [
  // ── Basic (starter deck only, always available) ──
  { id:'strike', name:'打击', cost:1, effects:[{type:'damage',value:6}], desc:'造成 6 伤害', type:'attack', rarity:'basic' },
  { id:'defend', name:'防御', cost:1, effects:[{type:'block', value:5}], desc:'获得 5 格挡', type:'skill', rarity:'basic' },
  { id:'heal',   name:'治疗', cost:1, effects:[{type:'heal', value:8}], desc:'恢复 8 生命', type:'skill', rarity:'basic' },

  // ── 狂战 (Berserker) ── 力量 × 多段 = 爆炸输出
  //   key synergy: 剑舞/怒火 叠力量 → 连击/狂暴打击 力量倍乘
  { id:'sword_dance',   name:'剑舞',    cost:1, effects:[{type:'buff',stat:'strength',value:1}], desc:'获得 1 力量',          type:'power',  rarity:'common', archetype:'berserker' },
  { id:'double_strike', name:'连击',    cost:1, effects:[{type:'damage',value:5},{type:'damage',value:5}], desc:'造成 5 伤害 ×2 (每点力量 ×2)', type:'attack', rarity:'common', archetype:'berserker' },
  { id:'strike2',       name:'重击',    cost:2, effects:[{type:'damage',value:14}], desc:'造成 14 伤害',           type:'attack', rarity:'common', archetype:'berserker' },
  { id:'rage',          name:'怒火',    cost:1, effects:[{type:'buff',stat:'strength',value:2},{type:'damage',value:3}], desc:'+2 力量 +3 伤害', type:'power',  rarity:'rare',   archetype:'berserker' },
  { id:'war_cry',       name:'战吼',    cost:2, effects:[{type:'damage',value:10},{type:'buff',stat:'strength',value:1}], desc:'10 伤害 +1 力量',   type:'attack', rarity:'rare',   archetype:'berserker' },
  { id:'frenzy_strike', name:'狂暴打击', cost:1, effects:[{type:'damage',value:6, per_str:2}], desc:'6 伤害 +2×力量',  type:'attack', rarity:'rare',   archetype:'berserker' },
  { id:'blood_thirst',  name:'血渴',    cost:0, effects:[{type:'damage',value:3},{type:'heal',value:2}], desc:'3 伤害 吸血 2',      type:'attack', rarity:'rare',   archetype:'berserker' },

  // ── 铁壁 (Iron Wall) ── 叠甲 → 盾猛 = 一锤定音
  //   key synergy: 铁壁/坚守 叠格挡 → 盾牌猛击 格挡转伤害 | 铁甲 格挡不消失
  { id:'fortify',       name:'铁壁',    cost:2, effects:[{type:'block',value:14}], desc:'获得 14 格挡',          type:'skill', rarity:'common', archetype:'ironwall' },
  { id:'shield_bash',   name:'盾击',    cost:1, effects:[{type:'block',value:6},{type:'damage',value:6}], desc:'6 格挡 +6 伤害',  type:'skill', rarity:'common', archetype:'ironwall' },
  { id:'stand_firm',    name:'坚守',    cost:1, effects:[{type:'block',value:8},{type:'heal',value:3}], desc:'8 格挡 +恢复 3',   type:'skill', rarity:'common', archetype:'ironwall' },
  { id:'shield_slam',   name:'盾牌猛击', cost:1, effects:[{type:'block_damage'}], desc:'造成格挡值的伤害',      type:'attack', rarity:'common', archetype:'ironwall' },
  { id:'iron_armor',    name:'铁甲',    cost:2, effects:[{type:'block',value:12},{type:'retain_block'}], desc:'12 格挡，格挡不消失', type:'skill', rarity:'rare', archetype:'ironwall' },
  { id:'bulwark',       name:'铜墙铁壁', cost:2, effects:[{type:'block',value:14},{type:'buff',stat:'dexterity',value:1}], desc:'14 格挡 +1 敏捷', type:'skill', rarity:'rare', archetype:'ironwall' },
  { id:'retaliate',     name:'反击',    cost:2, effects:[{type:'block',value:10},{type:'damage',value:4,target:'all'}], desc:'10 格挡，全体 4 反击', type:'skill', rarity:'rare', archetype:'ironwall' },

  // ── 暗影 (Shadow) ── 叠毒 → 毒爆 = 指数级伤害
  //   key synergy: 毒刺/淬毒匕首 叠毒 → 毒爆 翻倍 | 暗影步 毒层数倍乘伤害
  { id:'poison_stab',   name:'毒刺',    cost:1, effects:[{type:'damage',value:4},{type:'status',status:'poison',value:3}], desc:'4 伤害 +3 中毒',        type:'attack', rarity:'common', archetype:'shadow' },
  { id:'weaken',        name:'弱点打击', cost:1, effects:[{type:'damage',value:5},{type:'status',status:'weak',value:1}], desc:'5 伤害 +易伤 1 层',      type:'attack', rarity:'common', archetype:'shadow' },
  { id:'shadow_step',   name:'暗影步',   cost:1, effects:[{type:'damage',value:6, per_poison:2}], desc:'6 伤害 +2×中毒', type:'attack', rarity:'common', archetype:'shadow' },
  { id:'venom_blade',   name:'淬毒匕首', cost:2, effects:[{type:'damage',value:8},{type:'status',status:'poison',value:5}], desc:'8 伤害 +5 中毒',         type:'attack', rarity:'rare',   archetype:'shadow' },
  { id:'poison_cloud',  name:'毒雾',    cost:2, effects:[{type:'status',status:'poison',value:5,target:'all'}], desc:'全体中毒 5 层',              type:'skill',  rarity:'rare',   archetype:'shadow' },
  { id:'toxin_burst',   name:'毒爆',    cost:1, effects:[{type:'multiply_status',status:'poison',multiplier:2}], desc:'中毒层数翻倍',               type:'skill',  rarity:'rare',   archetype:'shadow' },
  { id:'shadow_assault',name:'暗影突袭', cost:2, effects:[{type:'damage',value:12},{type:'status',status:'vuln',value:2}], desc:'12 伤害 +脆弱 2 层',      type:'attack', rarity:'rare',   archetype:'shadow' },

  // ── 圣光 (Holy Light) ── 光暗相生，愈战愈强
  //   key synergy: 祝福 双buff → 圣洁 buff数倍乘 | 圣光弹 攻守兼备
  { id:'holy_bolt',         name:'圣光弹',    cost:1, effects:[{type:'damage',value:6},{type:'heal',value:4}], desc:'6 伤害 +恢复 4',            type:'attack', rarity:'common', archetype:'holy' },
  { id:'divine_protection', name:'神圣庇护',  cost:1, effects:[{type:'block',value:6},{type:'heal',value:6}], desc:'6 格挡 +恢复 6',            type:'skill',  rarity:'common', archetype:'holy' },
  { id:'sanctity',          name:'圣洁',      cost:1, effects:[{type:'damage',value:4, per_str:2, per_dex:2}], desc:'4 伤害 +2×(力量+敏捷)', type:'attack', rarity:'common', archetype:'holy' },
  { id:'blessing',          name:'祝福',      cost:0, effects:[{type:'buff',stat:'strength',value:1},{type:'buff',stat:'dexterity',value:1}], desc:'+1 力量 +1 敏捷', type:'power',  rarity:'rare',   archetype:'holy' },
  { id:'holy_radiance',     name:'圣光普照',  cost:2, effects:[{type:'damage',value:5,target:'all'},{type:'heal',value:8}], desc:'全体 5 伤害 +恢复 8',  type:'attack', rarity:'rare',   archetype:'holy' },
  { id:'redemption',        name:'救赎',      cost:2, effects:[{type:'heal',value:15},{type:'buff',stat:'strength',value:1}], desc:'恢复 15 +1 力量',     type:'skill',  rarity:'rare',   archetype:'holy' },

  // ── 自然 (Nature) ── 均衡成长，身板硬朗
  //   key synergy: 每张牌都是混合效果, 自然之怒 力敏双成长
  { id:'cleave',          name:'横扫',      cost:1, effects:[{type:'damage',value:5,target:'all'}], desc:'对所有敌人 5 伤害',             type:'attack', rarity:'common', archetype:'nature' },
  { id:'thorn_vine',      name:'荆棘缠绕',   cost:1, effects:[{type:'block',value:6},{type:'damage',value:3,target:'all'}], desc:'6 格挡，全体 3 荆棘伤害', type:'skill',  rarity:'common', archetype:'nature' },
  { id:'forest_blessing', name:'森林祝福',   cost:1, effects:[{type:'buff',stat:'strength',value:1},{type:'heal',value:5}], desc:'+1 力量 +恢复 5',        type:'power',  rarity:'common', archetype:'nature' },
  { id:'rejuvenate',      name:'恢复',      cost:1, effects:[{type:'heal',value:10},{type:'block',value:4}], desc:'恢复 10 +4 格挡',          type:'skill',  rarity:'common', archetype:'nature' },
  { id:'nature_wrath',    name:'自然之怒',   cost:1, effects:[{type:'damage',value:4, per_str:2},{type:'block',value:4, per_dex:2}], desc:'4 伤害+2×力量，4 格挡+2×敏捷', type:'attack', rarity:'rare', archetype:'nature' },
  { id:'life_bloom',      name:'生命绽放',   cost:2, effects:[{type:'heal',value:12},{type:'buff',stat:'dexterity',value:1}], desc:'恢复 12 +1 敏捷',         type:'skill',  rarity:'rare',   archetype:'nature' },
  { id:'force_of_nature', name:'自然之力',   cost:2, effects:[{type:'damage',value:12},{type:'heal',value:6}], desc:'12 伤害 +恢复 6',          type:'attack', rarity:'rare',   archetype:'nature' },
];

/** Total card count per archetype */
export function getArchetypeCardCount(archetypeId) {
  return CARD_DB.filter(c => c.archetype === archetypeId).length;
}

export function getCard(id) {
  const t = CARD_DB.find(c => c.id === id);
  return t ? { ...t } : null;
}

/**
 * Pick random non-basic cards from selected archetypes.
 * @param {number} count - how many cards to return
 * @param {string[]} selectedArchetypes - archetype IDs to filter by
 * @param {string[]} excludeIds - card IDs to exclude
 */
export function getRandomCards(count, selectedArchetypes = null, excludeIds = []) {
  let pool = CARD_DB.filter(c => c.rarity !== 'basic' && !excludeIds.includes(c.id));
  if (selectedArchetypes && selectedArchetypes.length > 0) {
    pool = pool.filter(c => c.archetype && selectedArchetypes.includes(c.archetype));
  }
  const cards = [];
  const available = [...pool];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    cards.push({ ...available[idx] });
    available.splice(idx, 1);
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
