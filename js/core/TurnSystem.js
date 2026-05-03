export class TurnSystem {
  constructor(gm, eventBus) {
    this.gm = gm;
    this.eb = eventBus;
    this._busy = false;
  }

  process(playerAction) {
    if (this._busy) return;
    this._busy = true;

    this.eb.emit('turn:before', { turn: this.gm.turn });
    if (typeof playerAction === 'function') playerAction();
    this.eb.emit('turn:afterPlayer', { turn: this.gm.turn });

    this._processEnemies();
    this.eb.emit('turn:afterEnemies', { turn: this.gm.turn });

    this.gm.turn++;
    this.eb.emit('turn:end', { turn: this.gm.turn, gm: this.gm });
    this._busy = false;
  }

  _processEnemies() {
    const player = this.gm.player;
    for (const e of this.gm.entities) {
      if (!e.hasComponent('ai')) continue;
      if (e.getComponent('stats')?.hp <= 0) continue;

      const dx = Math.sign(player.x - e.x);
      const dy = Math.sign(player.y - e.y);

      // Don't attack in explore mode — just move toward player
      // Combat only happens via card battle (initiated by player bump)
      if (e.x + dx === player.x && e.y + dy === player.y) {
        continue; // adjacent to player — wait for card battle
      }

      const targets = [
        { x: e.x + dx, y: e.y + dy },
        { x: e.x + dx, y: e.y },
        { x: e.x, y: e.y + dy },
      ];
      for (const t of targets) {
        if (this.gm.mapSystem.isWalkable(t.x, t.y) && !this.gm.getBlockingEntityAt(t.x, t.y)) {
          e.x = t.x; e.y = t.y;
          this.gm.updateEntityMap(e);
          this.eb.emit('entity:move', { entity: e, x: t.x, y: t.y });
          break;
        }
      }
    }
  }
}
