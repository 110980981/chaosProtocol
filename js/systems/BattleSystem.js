import { shuffleArray, createStarterDeck, getRandomCards, getRandomCard } from './CardSystem.js';

/** Status effect helpers */
const STATUS = {
  weak:   { name:'易伤',  dmgMult: 0.75, color:'#ff8844' },  // deals 75% damage
  vuln:   { name:'脆弱',  dmgMult: 1.5,  color:'#ff4488' },  // takes 150% damage
  poison: { name:'中毒',  color:'#44ff44' },
  strength:  { name:'力量',  color:'#ff4444' },
  dexterity: { name:'敏捷',  color:'#4488ff' },
};

export class BattleSystem {
  constructor(eventBus, combatSystem) {
    this.eb = eventBus;
    this.combat = combatSystem;
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
    this.rewardCards = null; // set after victory
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
  start(player, enemies) {
    this.reset();
    this.player = player;
    this.enemies = enemies;
    this.drawPile = shuffleArray([...createStarterDeck()]);
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

      // Intent types based on enemy and randomness
      const roll = Math.random();
      if (roll < 0.7 || this.turn === 1) {
        // Attack intent
        const variance = Math.floor(Math.random() * 3) - 1;
        let dmg = Math.max(1, s.attack + variance + (es.strength || 0));
        if (this._getStatusEffect(this.player, 'weak')) dmg = Math.floor(dmg * 0.75);
        this.intents.set(enemy.id, { type:'attack', value:dmg, desc:`⚔ ${dmg}`, color:'#ff6666' });
      } else if (roll < 0.85) {
        // Buff intent
        const buffAmt = 1 + Math.floor(Math.random() * 2);
        this.intents.set(enemy.id, { type:'buff', stat:'strength', value:buffAmt, desc:`🛡 +${buffAmt}力`, color:'#6688ff',
          onExecute: () => { es.strength = (es.strength || 0) + buffAmt; this.eb.emit('battle:enemyBuff', { enemy, stat:'strength', value:buffAmt }); }
        });
      } else {
        // Debuff intent
        this.intents.set(enemy.id, { type:'debuff', status:'weak', value:1, desc:`💀 易伤`, color:'#cc66ff',
          onExecute: () => {
            const ps = this._ensureStatuses(this.player);
            ps.weak = (ps.weak || 0) + 1;
            this.eb.emit('battle:enemyDebuff', { enemy, status:'weak', value:1 });
          }
        });
      }
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
    this.discardPile.push(card);

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
            const rawDmg = eff.value;
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
          if (ps) ps.block = (ps.block || 0) + this._modBlock(eff.value, this.player);
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
          const es = this._ensureStatuses(primaryTarget);
          es[eff.status] = (es[eff.status] || 0) + eff.value;
          this.eb.emit('battle:statusApplied', { target: primaryTarget, status: eff.status, value: eff.value });
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

    // Block expires
    const ps = this.player.getComponent('stats');
    if (ps) ps.block = 0;

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
    this.rewardCards = getRandomCards(3);
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
    this.drawPile.push(card);
    this.rewardCards = null;
    return card;
  }
}
