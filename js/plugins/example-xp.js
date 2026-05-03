/**
 * Example Plugin: XP & Leveling System
 * =====================================
 *  Adds experience points, level-ups, and stat growth.
 *  Demonstrates: event hooks, entity component modification,
 *  UI messages, and extending core game behaviour.
 */
export class XPPlugin {
  name = 'xp-leveling';
  version = '1.0.0';

  init(eb) {
    this.eb = eb;
    console.log('[XP] Leveling system ready');
  }

  get events() {
    return {
      'entity:death': (data) => this._onDeath(data),
      'player:beforeAction': () => this._checkBuffs(),
      'turn:end': (data) => this._onTurnEnd(data),
    };
  }

  _onDeath({ entity, killer }) {
    if (!killer || !killer.hasComponent('player')) return;
    const ks = killer.getComponent('stats');
    const es = entity.getComponent('stats');
    if (!ks || !es) return;

    ks.xp = (ks.xp || 0) + (es.xp || 0);

    // Check level-up
    while (ks.xp >= (ks.xpNext || 20)) {
      ks.xp -= ks.xpNext || 20;
      ks.level = (ks.level || 1) + 1;
      ks.xpNext = Math.floor((ks.xpNext || 20) * 1.5);
      ks.maxHp += 5;
      ks.hp = Math.min(ks.hp + 5, ks.maxHp);
      ks.attack += 1;
      ks.defense += Math.floor(ks.level / 3) + 1;

      this.eb?.emit('player:levelUp', { entity: killer, stats: ks, level: ks.level });
    }
  }

  _checkBuffs() {
    // Example: could check for temporary buffs expiring
  }

  _onTurnEnd({ turn, gm }) {
    // Example: passive HP regen every 10 turns
    if (turn > 0 && turn % 10 === 0) {
      const p = gm.player;
      if (p) {
        const s = p.getComponent('stats');
        if (s && s.hp > 0 && s.hp < s.maxHp) {
          s.hp = Math.min(s.hp + 1, s.maxHp);
        }
      }
    }
  }
}
