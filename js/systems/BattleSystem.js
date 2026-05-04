import { shuffleArray, createStarterDeck, getRandomCards } from './CardSystem.js';
import { BEHAVIOR } from '../entities/factories.js';

/** Status effect helpers */
const STATUS = {
  weak:   { name:'易伤',  dmgMult: 0.75, color:'#ff8844' },  // deals 75% damage
  vuln:   { name:'脆弱',  dmgMult: 1.5,  color:'#ff4488' },  // takes 150% damage
  poison: { name:'中毒',  color:'#44ff44' },
  strength:  { name:'力量',  color:'#ff4444' },
  dexterity: { name:'敏捷',  color:'#4488ff' },
};

/** Probability distributions per behavior type.
 *  Each entry: { attack, buff, debuff, block } — weights for intent selection.
 */
const BEHAVIOR_WEIGHTS = {
  [BEHAVIOR.AGGRESSIVE]: { attack: 80, buff: 10, debuff: 5, block: 5 },
  [BEHAVIOR.DEFENSIVE]:  { attack: 40, buff: 10, debuff: 10, block: 40 },
  [BEHAVIOR.STATUS]:     { attack: 40, buff: 10, debuff: 40, block: 10 },
  [BEHAVIOR.BALANCED]:   { attack: 50, buff: 20, debuff: 15, block: 15 },
  [BEHAVIOR.RITUALIST]:  { attack: 30, buff: 55, debuff: 10, block: 5 },
  [BEHAVIOR.SWARM]:      { attack: 75, buff: 10, debuff: 10, block: 5 },
  [BEHAVIOR.ELITE]:      { attack: 45, buff: 20, debuff: 15, block: 20 },
  [BEHAVIOR.BOSS]:       { attack: 40, buff: 20, debuff: 25, block: 15 },
};

export class BattleSystem {
  constructor(eventBus, combatSystem, selectedArchetypes = null) {
    this.eb = eventBus;
    this.combat = combatSystem;
    this.selectedArchetypes = selectedArchetypes;
    this.persistentDeck = [];
    this.reset();
  }

  reset() {
    this.phase = null;
    this.enemies = [];
    this.player = null;
    this.energy = 0;
    this.maxEnergy = 3;
    this.hand = [];
    this.drawPile = [];
    this.discardPile = [];
    this.turn = 0;
    this.intents = new Map();
    this.rewardCards = null;
    this._retainBlock = false;
    this._permanentRetainBlock = false;
  }

  /* ─── Status helpers ─── */
  _ensureStatuses(entity) {
    let s = entity.getComponent('statuses');
    if (!s) {
      s = { weak:0, vuln:0, poison:0, strength:0, dexterity:0 };
      entity.addComponent('statuses', s);
    }
    return s;
  }

  getStatusString(entity) {
    const s = entity.getComponent('statuses');
    if (!s) return '';
    const parts = [];
    if (s.strength) parts.push(`力量+${s.strength}`);
    if (s.dexterity) parts.push(`敏捷+${s.dexterity}`);
    if (s.weak) parts.push(`易伤${s.weak}`);
    if (s.vuln) parts.push(`脆弱${s.vuln}`);
    if (s.poison) parts.push(`中毒${s.poison}`);
    return parts.join(' ');
  }

  /* ─── Battle start ─── */
  start(player, enemies, depth = 1) {
    this.reset();
    this.player = player;
    this.enemies = enemies;
    this.depth = depth;
    // Initialize persistent deck on first battle, then carry forward
    if (this.persistentDeck.length === 0) {
      this.persistentDeck = [...createStarterDeck()];
    }
    this.drawPile = shuffleArray([...this.persistentDeck]);
    this.discardPile = [];
    this.energy = this.maxEnergy;

    for (const e of enemies) {
      this._ensureStatuses(e);
      // Keep the block from createMonster (if any), don't reset to 0
    }
    this._ensureStatuses(player);

    this._drawCards(5);
    this.phase = 'player';
    this.turn = 1;
    this.rewardCards = null;
    this._computeIntents();
    this.eb.emit('battle:start', { enemies, player });
  }

  /* ─── Intent system ─── */
  _computeIntents() {
    this.intents.clear();
    for (const enemy of this.enemies) {
      if (enemy.getComponent('stats').hp <= 0) continue;
      const s = enemy.getComponent('stats');
      const es = this._ensureStatuses(enemy);
      const info = enemy.getComponent('monsterInfo') || {};
      const behavior = info.behavior || BEHAVIOR.AGGRESSIVE;
      const weights = BEHAVIOR_WEIGHTS[behavior] || BEHAVIOR_WEIGHTS[BEHAVIOR.AGGRESSIVE];

      // Boss/Elite: use pattern-based intents every 3rd turn
      if ((behavior === BEHAVIOR.BOSS || behavior === BEHAVIOR.ELITE) && this.turn > 1 && this.turn % 3 === 0) {
        this._addSpecialIntent(enemy, s, es, behavior);
        continue;
      }

      const total = weights.attack + weights.buff + weights.debuff + weights.block;
      let roll = Math.random() * total;

      if ((roll -= weights.attack) < 0) {
        this._addAttackIntent(enemy, s, es);
      } else if ((roll -= weights.buff) < 0) {
        this._addBuffIntent(enemy, s, es);
      } else if ((roll -= weights.debuff) < 0) {
        this._addDebuffIntent(enemy, s, es);
      } else {
        this._addBlockIntent(enemy, s, es);
      }
    }
  }

  _addAttackIntent(enemy, s, es) {
    const variance = Math.floor(Math.random() * 3) - 1;
    let dmg = Math.max(1, s.attack + variance + (es.strength || 0));
    if (this._getStatusEffect(this.player, 'weak')) dmg = Math.floor(dmg * 0.75);
    this.intents.set(enemy.id, { type:'attack', value:dmg, desc:`⚔ ${dmg}`, color:'#ff6666' });
  }

  _addBuffIntent(enemy, s, es) {
    const info = enemy.getComponent('monsterInfo') || {};
    const behavior = info.behavior || BEHAVIOR.AGGRESSIVE;
    if (behavior === BEHAVIOR.RITUALIST) {
      // Ritualists gain more strength
      const buffAmt = 2 + Math.floor(Math.random() * 2);
      this.intents.set(enemy.id, { type:'buff', stat:'strength', value:buffAmt, desc:`🛡 +${buffAmt}力`, color:'#ff4444',
        onExecute: () => { es.strength = (es.strength || 0) + buffAmt; this.eb.emit('battle:enemyBuff', { enemy, stat:'strength', value:buffAmt }); }
      });
    } else if (behavior === BEHAVIOR.DEFENSIVE || behavior === BEHAVIOR.ELITE) {
      // Defensive enemies gain block
      const blockAmt = 6 + Math.floor(Math.random() * 4);
      this.intents.set(enemy.id, { type:'buff', stat:'block_self', value:blockAmt, desc:`🛡 +${blockAmt}甲`, color:'#4488ff',
        onExecute: () => { s.block = (s.block || 0) + blockAmt; this.eb.emit('battle:enemyBuff', { enemy, stat:'block', value:blockAmt }); }
      });
    } else {
      const buffAmt = 1 + Math.floor(Math.random() * 2);
      this.intents.set(enemy.id, { type:'buff', stat:'strength', value:buffAmt, desc:`🛡 +${buffAmt}力`, color:'#6688ff',
        onExecute: () => { es.strength = (es.strength || 0) + buffAmt; this.eb.emit('battle:enemyBuff', { enemy, stat:'strength', value:buffAmt }); }
      });
    }
  }

  _addDebuffIntent(enemy, s, es) {
    const info = enemy.getComponent('monsterInfo') || {};
    const behavior = info.behavior || BEHAVIOR.AGGRESSIVE;
    if (behavior === BEHAVIOR.STATUS && Math.random() < 0.5) {
      // Status-dealers apply poison aggressively
      const poisonAmt = 2 + Math.floor(Math.random() * 3);
      this.intents.set(enemy.id, { type:'debuff', status:'poison', value:poisonAmt, desc:`💀 毒${poisonAmt}`, color:'#44ff44',
        onExecute: () => {
          const ps = this._ensureStatuses(this.player);
          ps.poison = (ps.poison || 0) + poisonAmt;
          this.eb.emit('battle:enemyDebuff', { enemy, status:'poison', value:poisonAmt });
        }
      });
    } else if (behavior === BEHAVIOR.BOSS && Math.random() < 0.5) {
      // Bosses apply vuln
      this.intents.set(enemy.id, { type:'debuff', status:'vuln', value:2, desc:`💀 脆弱2`, color:'#ff4488',
        onExecute: () => {
          const ps = this._ensureStatuses(this.player);
          ps.vuln = (ps.vuln || 0) + 2;
          this.eb.emit('battle:enemyDebuff', { enemy, status:'vuln', value:2 });
        }
      });
    } else {
      // Default weak debuff
      this.intents.set(enemy.id, { type:'debuff', status:'weak', value:1, desc:`💀 易伤`, color:'#cc66ff',
        onExecute: () => {
          const ps = this._ensureStatuses(this.player);
          ps.weak = (ps.weak || 0) + 1;
          this.eb.emit('battle:enemyDebuff', { enemy, status:'weak', value:1 });
        }
      });
    }
  }

  _addBlockIntent(enemy, s, es) {
    const blockAmt = 4 + Math.floor(Math.random() * 6) + (es.dexterity || 0);
    this.intents.set(enemy.id, { type:'block', value:blockAmt, desc:`🛡 ${blockAmt}甲`, color:'#4488ff',
      onExecute: () => { s.block = (s.block || 0) + blockAmt; this.eb.emit('battle:enemyBuff', { enemy, stat:'block', value:blockAmt }); }
    });
  }

  _addSpecialIntent(enemy, s, es) {
    const info = enemy.getComponent('monsterInfo') || {};
    const behavior = info.behavior || BEHAVIOR.AGGRESSIVE;
    // Every 3 turns: elites/bosses do a special attack (higher damage or AoE)
    if (behavior === BEHAVIOR.BOSS) {
      // Boss cleave: high damage ignoring some block
      const dmg = Math.floor((s.attack + (es.strength || 0)) * 1.8);
      this.intents.set(enemy.id, { type:'attack', value:dmg, desc:`⚔⚔ ${dmg}！！`, color:'#ff0000' });
    } else {
      // Elite: double attack
      const dmg1 = Math.max(1, Math.floor((s.attack + (es.strength || 0)) * 0.7));
      const dmg2 = Math.max(1, Math.floor((s.attack + (es.strength || 0)) * 0.7));
      this.intents.set(enemy.id, { type:'multi_attack', hits:[dmg1, dmg2], desc:`×2  ${dmg1}`, color:'#ff8844',
        onExecute: () => {
          for (const hit of [dmg1, dmg2]) {
            this._enemyAttack(enemy, hit);
          }
        }
      });
    }
  }

  getIntent(enemy) {
    return this.intents.get(enemy.id) || { type:'none', value:0, desc:'', color:'#888' };
  }

  /* ─── Status effect helpers ─── */
  _getStatusEffect(entity, type) {
    const s = entity.getComponent('statuses');
    return s ? s[type] || 0 : 0;
  }

  _modDamage(cardDmg, attacker, defender) {
    let dmg = cardDmg;
    dmg += this._getStatusEffect(attacker, 'strength');
    if (this._getStatusEffect(defender, 'vuln') > 0) dmg = Math.floor(dmg * 1.5);
    if (this._getStatusEffect(attacker, 'weak') > 0) dmg = Math.floor(dmg * 0.75);
    const ds = defender.getComponent('stats');
    if (ds && ds.defense) dmg = Math.max(1, dmg - ds.defense);
    // Absorb by block
    if (ds && ds.block > 0) {
      if (ds.block >= dmg) { ds.block -= dmg; return 0; }
      dmg -= ds.block; ds.block = 0;
    }
    return dmg;
  }

  _modBlock(cardBlock, entity) {
    let block = cardBlock;
    block += this._getStatusEffect(entity, 'dexterity');
    return Math.max(0, block);
  }

  /* ─── Tick statuses (end of turn) ─── */
  _tickStatuses(entity) {
    const s = entity.getComponent('statuses');
    if (!s) return;
    // Poison damage
    if (s.poison > 0) {
      const st = entity.getComponent('stats');
      if (st) { st.hp -= s.poison; this.eb.emit('combat:poison', { entity, damage: s.poison }); }
      s.poison = Math.max(0, s.poison - 1);
    }
    // Tick down debuffs
    if (s.weak > 0) s.weak--;
    if (s.vuln > 0) s.vuln--;
    // Buffs (strength, dexterity) persist
  }

  /* ─── Card playing ─── */
  playCard(cardIndex, targetEnemyIndex = 0) {
    if (this.phase !== 'player') return false;
    const card = this.hand[cardIndex];
    if (!card) return false;
    if (this.energy < card.cost) return false;

    this.energy -= card.cost;
    this.hand.splice(cardIndex, 1);
    // 消耗：retain_block 牌打出后永久移除（不进入弃牌堆）
    const hasRetain = card.effects && card.effects.some(e => e.type === 'retain_block');
    if (!hasRetain) this.discardPile.push(card);

    const target = this.enemies[targetEnemyIndex];
    this._resolveEffects(card.effects, target);

    this.enemies = this.enemies.filter(e => e.getComponent('stats').hp > 0);
    if (this.enemies.length === 0) { this.phase = 'won'; this._generateRewards(); this.eb.emit('battle:won', { player: this.player }); }
    if (this.player.getComponent('stats').hp <= 0) { this.phase = 'lost'; this.eb.emit('battle:lost', { player: this.player }); }

    this.eb.emit('battle:cardPlayed', { card, player: this.player, target });
    return true;
  }

  _resolveEffects(effects, primaryTarget) {
    for (const eff of effects) {
      switch (eff.type) {
        case 'damage': {
          const targets = eff.target === 'all' ? this.enemies : [primaryTarget];
          for (const t of targets) {
            if (!t || t.getComponent('stats').hp <= 0) continue;
            let rawDmg = eff.value || 0;
            // Synergy scaling (Slay the Spire style)
            if (eff.per_str) rawDmg += this._getStatusEffect(this.player, 'strength') * eff.per_str;
            if (eff.per_dex) rawDmg += this._getStatusEffect(this.player, 'dexterity') * eff.per_dex;
            if (eff.per_poison) rawDmg += this._getStatusEffect(t, 'poison') * eff.per_poison;
            const finalDmg = this._modDamage(rawDmg, this.player, t);
            const ts = t.getComponent('stats');
            ts.hp -= finalDmg;
            this.eb.emit('combat:melee', { attacker: this.player, defender: t, damage: finalDmg });
            // Vampire Survivors: heal 10% of damage dealt
            const ps = this.player.getComponent('stats');
            if (ps) ps.hp = Math.min(ps.maxHp, ps.hp + Math.floor(finalDmg * 0.1));
            if (ts.hp <= 0) this.eb.emit('entity:death', { entity: t, killer: this.player });
          }
          break;
        }
        case 'block': {
          const ps = this.player.getComponent('stats');
          if (ps) {
            let blockVal = eff.value || 0;
            if (eff.per_dex) blockVal += this._getStatusEffect(this.player, 'dexterity') * eff.per_dex;
            ps.block = (ps.block || 0) + this._modBlock(blockVal, this.player);
          }
          break;
        }
        case 'heal': {
          const s = this.player.getComponent('stats');
          if (s) { s.hp = Math.min(s.maxHp, s.hp + eff.value); this.eb.emit('entity:heal', { entity: this.player, amount: eff.value }); }
          break;
        }
        case 'buff': {
          const s = this._ensureStatuses(this.player);
          s[eff.stat] = (s[eff.stat] || 0) + eff.value;
          this.eb.emit('battle:playerBuff', { stat: eff.stat, value: eff.value });
          break;
        }
        case 'status': {
          const targets = eff.target === 'all' ? this.enemies : [primaryTarget];
          for (const t of targets) {
            if (!t || t.getComponent('stats').hp <= 0) continue;
            const es = this._ensureStatuses(t);
            es[eff.status] = (es[eff.status] || 0) + eff.value;
            this.eb.emit('battle:statusApplied', { target: t, status: eff.status, value: eff.value });
          }
          break;
        }

        // ── Slay the Spire-style synergy effects ──
        case 'block_damage': {
          const bd = this.player.getComponent('stats');
          if (!bd || !bd.block) break;
          const bdDmg = bd.block * (eff.multiplier || 1);
          bd.block = 0;
          const bdTarget = primaryTarget;
          if (!bdTarget || bdTarget.getComponent('stats').hp <= 0) break;
          const bdFinal = this._modDamage(bdDmg, this.player, bdTarget);
          const bdTs = bdTarget.getComponent('stats');
          bdTs.hp -= bdFinal;
          this.eb.emit('combat:melee', { attacker:this.player, defender:bdTarget, damage:bdFinal });
          const bdPs = this.player.getComponent('stats');
          if (bdPs) bdPs.hp = Math.min(bdPs.maxHp, bdPs.hp + Math.floor(bdFinal * 0.1));
          if (bdTs.hp <= 0) this.eb.emit('entity:death', { entity:bdTarget, killer:this.player });
          break;
        }
        case 'multiply_status': {
          const msTargets = eff.target === 'all' ? this.enemies : [primaryTarget];
          for (const t of msTargets) {
            if (!t || t.getComponent('stats').hp <= 0) continue;
            const es = this._ensureStatuses(t);
            es[eff.status] = (es[eff.status] || 0) * eff.multiplier;
          }
          break;
        }
        case 'retain_block': {
          this._retainBlock = true;
          this._permanentRetainBlock = true;
          break;
        }
        case 'double_block': {
          const dbPs = this.player.getComponent('stats');
          if (dbPs && dbPs.block) {
            dbPs.block *= 2;
            this.eb.emit('battle:playerBuff', { stat: 'block', value: dbPs.block });
          }
          break;
        }
      }
    }
  }

  /* ─── End player turn ─── */
  endPlayerTurn() {
    if (this.phase !== 'player') return;
    this.phase = 'enemy';

    // Discard hand
    this.discardPile.push(...this.hand);
    this.hand = [];

    // Execute enemy intents
    for (const enemy of this.enemies) {
      if (enemy.getComponent('stats').hp <= 0) continue;
      const intent = this.intents.get(enemy.id);
      if (!intent) continue;

      if (intent.onExecute) {
        intent.onExecute();
      } else if (intent.type === 'attack') {
        this._enemyAttack(enemy, intent.value);
      }
    }

    // Tick statuses on ALL combatants
    for (const enemy of this.enemies) this._tickStatuses(enemy);
    this._tickStatuses(this.player);

    // Block expires (unless retained — permanent via consumed retain_block cards)
    const ps = this.player.getComponent('stats');
    if (!this._retainBlock && !this._permanentRetainBlock && ps) ps.block = 0;
    this._retainBlock = false;

    // Cleanup dead enemies
    this.enemies = this.enemies.filter(e => e.getComponent('stats').hp > 0);
    if (this.enemies.length === 0) { this.phase = 'won'; this._generateRewards(); this.eb.emit('battle:won', { player: this.player }); return; }
    if (ps && ps.hp <= 0) { this.phase = 'lost'; this.eb.emit('battle:lost', { player: this.player }); return; }

    // New turn
    this.turn++;
    this.energy = this.maxEnergy;
    this._drawCards(5);
    this.phase = 'player';
    this._computeIntents();
    this.eb.emit('battle:turnStart', { turn: this.turn });
  }

  _enemyAttack(enemy, rawDamage) {
    const ps = this.player.getComponent('stats');
    if (!ps) return;
    const block = ps.block || 0;
    if (block >= rawDamage) {
      ps.block = block - rawDamage;
      this.eb.emit('combat:melee', { attacker: enemy, defender: this.player, damage: rawDamage, blocked: true });
    } else {
      const dmg = rawDamage - block;
      ps.block = 0;
      ps.hp -= dmg;
      this.eb.emit('combat:melee', { attacker: enemy, defender: this.player, damage: dmg });
    }
  }

  /* ─── Draw ─── */
  _drawCards(n) {
    for (let i = 0; i < n; i++) {
      if (this.drawPile.length === 0) {
        if (this.discardPile.length === 0) break;
        this.drawPile = shuffleArray([...this.discardPile]);
        this.discardPile = [];
      }
      this.hand.push(this.drawPile.pop());
    }
  }

  /* ─── Post-battle rewards ─── */
  _generateRewards() {
    // 40% chance to offer card rewards, to control deck growth
    if (Math.random() < 0.4) {
      this.rewardCards = getRandomCards(3, this.selectedArchetypes, [], this.depth || 1);
    } else {
      this.rewardCards = null;
    }
    // Small HP recovery after battle
    const ps = this.player.getComponent('stats');
    if (ps) {
      const healAmt = Math.floor(ps.maxHp * 0.1);
      ps.hp = Math.min(ps.maxHp, ps.hp + healAmt);
    }
  }

  /** Add chosen card to deck (called from UI) */
  addRewardCard(cardIndex) {
    if (!this.rewardCards || cardIndex >= this.rewardCards.length) return null;
    const card = this.rewardCards[cardIndex];
    this.persistentDeck.push(card);
    this.drawPile.push(card);
    this.rewardCards = null;
    return card;
  }
}
