let nextId = 1;

export class Entity {
  constructor(x, y, template = {}) {
    this.id = nextId++;
    this.name = template.name || 'entity';
    this.x = x;
    this.y = y;
    this.glyph = template.glyph || '?';
    this.color = template.color || '#fff';
    this._components = new Map();
  }

  addComponent(name, data = {}) { this._components.set(name, data); return this; }
  getComponent(name) { return this._components.get(name); }
  hasComponent(name) { return this._components.has(name); }
  removeComponent(name) { return this._components.delete(name); }
  get components() { return Object.fromEntries(this._components); }
}
