export class CombatSystem {
  constructor(eventBus) {
    this.eb = eventBus;
  }

  meleeAttack(attacker, defender) {
    const as = attacker.getComponent('stats');
    const ds = defender.getComponent('stats');
    if (!as || !ds) return 0;

    const rawDmg = as.attack - ds.defense;
    const variance = Math.floor(Math.random() * 3) - 1;
    const damage = Math.max(1, rawDmg + variance);

    ds.hp -= damage;
    this.eb.emit('combat:melee', { attacker, defender, damage });

    if (ds.hp <= 0) this.eb.emit('entity:death', { entity: defender, killer: attacker });
    return damage;
  }

  heal(entity, amount) {
    const s = entity.getComponent('stats');
    if (!s) return 0;
    const healed = Math.min(amount, s.maxHp - s.hp);
    s.hp += healed;
    this.eb.emit('entity:heal', { entity, amount: healed });
    return healed;
  }
}
