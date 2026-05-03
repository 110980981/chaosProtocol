import { Entity } from './Entity.js';
import * as Factories from '../entities/factories.js';

export class GameManager {
  constructor(eventBus, pluginSystem) {
    this.eb = eventBus;
    this.ps = pluginSystem;
    this.entities = [];
    this.entityMap = {};
    this.player = null;
    this.turn = 0;
    this.depth = 1;
    this.mapSystem = null;
    this.combatSystem = null;
    this.running = false;
  }

  init(mapSystem, combatSystem) {
    this.mapSystem = mapSystem;
    this.combatSystem = combatSystem;
    this.running = true;
    this.eb.emit('game:init', { gm: this });
  }

  newLevel(depth) {
    if (depth) this.depth = depth;
    this.entities = [];
    this.entityMap = {};
    this.turn = 0;

    this.mapSystem.generate(this.depth);
    this._placePlayer();
    this._spawnMonsters();
    this._spawnItems();
    this._placeStairs();
    this.eb.emit('game:newLevel', { gm: this, depth: this.depth });
  }

  _placePlayer() {
    const room = this.mapSystem.rooms[0];
    if (!room) return;
    this.player.x = room.cx;
    this.player.y = room.cy;
    this.addEntity(this.player);
  }

  _spawnMonsters() {
    for (let i = 1; i < this.mapSystem.rooms.length; i++) {
      const r = this.mapSystem.rooms[i];
      const count = Math.random() < 0.4 + this.depth * 0.1
        ? 1 + Math.floor(Math.random() * (1 + Math.floor(this.depth / 2)))
        : 0;
      for (let j = 0; j < count; j++) {
        const x = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
        const y = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
        this.addEntity(Factories.createMonster(x, y, this.depth));
      }
    }
  }

  _spawnItems() {
    // Guarantee a health potion in the starting room
    if (this.mapSystem.rooms[0]) {
      const r0 = this.mapSystem.rooms[0];
      this.addEntity(Factories.createHealthPotion(r0.x + 1 + Math.floor(Math.random() * (r0.w - 2)), r0.y + 1 + Math.floor(Math.random() * (r0.h - 2))));
    }
    for (let i = 0; i < this.mapSystem.rooms.length; i++) {
      if (Math.random() < 0.35) {
        const r = this.mapSystem.rooms[i];
        const x = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
        const y = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
        const item = Math.random() < 0.7
          ? Factories.createHealthPotion(x, y)
          : Factories.createStrengthPotion(x, y);
        this.addEntity(item);
      }
    }
  }

  _placeStairs() {
    const lastRoom = this.mapSystem.rooms[this.mapSystem.rooms.length - 1];
    if (lastRoom) {
      const s = Factories.createStairsDown(lastRoom.cx, lastRoom.cy);
      this.addEntity(s);
    }
  }

  addEntity(entity) {
    this.entities.push(entity);
    this.updateEntityMap(entity);
    this.eb.emit('entity:spawn', { entity, gm: this });
  }

  removeEntity(entity) {
    this.entities = this.entities.filter(e => e.id !== entity.id);
    delete this.entityMap[`${entity.x},${entity.y}`];
    this.eb.emit('entity:despawn', { entity, gm: this });
  }

  updateEntityMap(entity) {
    this.entityMap[`${entity.x},${entity.y}`] = entity;
  }

  getEntityAt(x, y) { return this.entityMap[`${x},${y}`]; }

  getBlockingEntityAt(x, y) {
    const e = this.getEntityAt(x, y);
    return e && e.hasComponent('blocks') ? e : null;
  }

  getItemsAt(x, y) {
    return this.entities.filter(e => e !== this.player && e.x === x && e.y === y && e.hasComponent('item'));
  }

  isBlocked(x, y) {
    return this.mapSystem.isWall(x, y) || this.getBlockingEntityAt(x, y);
  }
}
