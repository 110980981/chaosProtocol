export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, callback, context = null) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push({ callback, context });
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;
    this._listeners.set(event, listeners.filter(l => l.callback !== callback));
  }

  emit(event, data = {}) {
    const listeners = this._listeners.get(event);
    if (!listeners) return;
    for (const l of listeners) {
      try { l.callback.call(l.context, data); } catch (e) { console.error(`EventBus[${event}]:`, e); }
    }
  }

  /** Remove all listeners registered with a given context (for scene cleanup). */
  removeContext(context) {
    for (const [event, listeners] of this._listeners) {
      this._listeners.set(event, listeners.filter(l => l.context !== context));
    }
  }

  clear() { this._listeners.clear(); }
}
