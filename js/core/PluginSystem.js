export class PluginSystem {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this._plugins = new Map();
  }

  register(plugin) {
    if (this._plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" already registered.`);
      return this;
    }
    this._plugins.set(plugin.name, plugin);

    if (plugin.events) {
      for (const [evt, handler] of Object.entries(plugin.events)) {
        this.eventBus.on(evt, handler, plugin);
      }
    }

    plugin.init?.(this.eventBus);
    this.eventBus.emit('plugin:loaded', { plugin: plugin.name });
    return this;
  }

  unregister(name) {
    const plugin = this._plugins.get(name);
    if (!plugin) return;
    plugin.destroy?.(this.eventBus);
    this._plugins.delete(name);
    this.eventBus.emit('plugin:unloaded', { plugin: name });
  }

  get(name) { return this._plugins.get(name); }
  getAll() { return Array.from(this._plugins.values()); }
}
