/** Card definitions — extend this to add new cards */

const CARD_DB = [
  // ── Basic (starter deck) ──
  { id:'strike', name:'打击', cost:1, effects:[{type:'damage',value:6}], desc:'造成 6 伤害', type:'attack', rarity:'basic' },
  { id:'defend', name:'防御', cost:1, effects:[{type:'block', value:5}], desc:'获得 5 格挡', type:'skill', rarity:'basic' },

  // ── Common ──
  { id:'strike2',   name:'重击',   cost:2, effects:[{type:'damage',value:14}], desc:'造成 14 伤害', type:'attack', rarity:'common' },
  { id:'double_strike', name:'连击', cost:1, effects:[{type:'damage',value:5},{type:'damage',value:5}], desc:'造成 5 伤害 ×2', type:'attack', rarity:'common' },
  { id:'cleave',    name:'横扫',   cost:1, effects:[{type:'damage',value:5,target:'all'}], desc:'对所有敌人 5 伤害', type:'attack', rarity:'common' },
  { id:'fortify',   name:'铁壁',   cost:2, effects:[{type:'block',value:14}], desc:'获得 14 格挡', type:'skill', rarity:'common' },
  { id:'heal',      name:'治疗',   cost:1, effects:[{type:'heal',value:8}], desc:'恢复 8 生命', type:'skill', rarity:'common' },

  // ── Status effects ──
  { id:'weaken',    name:'弱点打击', cost:1, effects:[{type:'damage',value:5},{type:'status',status:'weak',value:1}], desc:'5 伤害 + 易伤 1 层', type:'attack', rarity:'common' },
  { id:'vuln',      name:'破甲',    cost:1, effects:[{type:'damage',value:4},{type:'status',status:'vuln',value:2}], desc:'4 伤害 + 脆弱 2 层', type:'attack', rarity:'common' },
  { id:'sword_dance', name:'剑舞', cost:1, effects:[{type:'buff',stat:'strength',value:1}], desc:'获得 1 力量', type:'power', rarity:'common' },
  { id:'dodge',     name:'闪避',    cost:1, effects:[{type:'buff',stat:'dexterity',value:1}], desc:'获得 1 敏捷', type:'skill', rarity:'common' },
  { id:'poison_stab', name:'毒刺', cost:1, effects:[{type:'damage',value:4},{type:'status',status:'poison',value:3}], desc:'4 伤害 + 中毒 3 层', type:'attack', rarity:'common' },

  // ── Rare (Vampire Survivors inspired) ──
  { id:'blood_thirst', name:'血渴',   cost:0, effects:[{type:'damage',value:3},{type:'heal',value:2}], desc:'3 伤害 吸血 2', type:'attack', rarity:'rare' },
  { id:'whirlwind',    name:'旋风斩', cost:2, effects:[{type:'damage',value:8,target:'all'},{type:'block',value:4}], desc:'全体 8 伤害 +4 格挡', type:'attack', rarity:'rare' },
  { id:'rage',         name:'怒火',   cost:1, effects:[{type:'buff',stat:'strength',value:2},{type:'damage',value:3}], desc:'+2 力量 +3 伤害', type:'power', rarity:'rare' },
  { id:'recovery',     name:'再生',   cost:1, effects:[{type:'heal',value:12},{type:'buff',stat:'dexterity',value:1}], desc:'恢复 12 + 1 敏捷', type:'skill', rarity:'rare' },
];

export function getCard(id) {
  const t = CARD_DB.find(c => c.id === id);
  return t ? { ...t } : null;
}

export function getRandomCard(pool) {
  const filtered = CARD_DB.filter(c => {
    if (pool === 'all') return true;
    if (pool === 'common') return c.rarity === 'basic' || c.rarity === 'common';
    return true;
  });
  return { ...filtered[Math.floor(Math.random() * filtered.length)] };
}

export function getRandomCards(count, excludeIds = []) {
  const pool = CARD_DB.filter(c => c.rarity !== 'basic' && !excludeIds.includes(c.id));
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
