/**
 * ============================================================
 *  Chaos Protocol — Plugin Template
 * ============================================================
 *  Copy this file to add new game mechanics. Plugins hook into
 *  the EventBus to extend behaviour without modifying core code.
 *
 *  AVAILABLE EVENTS (emit in data):
 *    game:init         { gm }          — GameManager initialized
 *    game:newLevel     { gm, depth }   — New floor generated
 *    game:over         { gm }          — Player died
 *
 *    turn:before       { turn }        — Before player acts
 *    turn:afterPlayer  { turn }        — After player, before enemies
 *    turn:afterEnemies { turn }        — After all enemies
 *    turn:end          { turn, gm }    — Turn fully resolved
 *
 *    entity:spawn      { entity, gm }  — Entity added to game
 *    entity:despawn    { entity, gm }  — Entity removed
 *    entity:move       { entity, x, y }— Entity moved
 *    entity:death      { entity, killer }
 *    entity:heal       { entity, amount }
 *
 *    combat:melee      { attacker, defender, damage }
 *
 *    player:beforeAction { dx, dy, gm }
 *    player:move       { x, y }        — Player moved
 *    player:pickup     { entity, gm }  — Player picked up item
 *
 *    plugin:loaded     { plugin }
 *    plugin:unloaded   { plugin }
 *
 *  USAGE:
 *    import { MyPlugin } from './plugins/my-plugin.js';
 *    pluginSystem.register(new MyPlugin(options));
 * ============================================================
 */

export class PluginTemplate {
  /**
   * Unique plugin identifier — use kebab-case.
   * @type {string}
   */
  name = 'template-plugin';

  /**
   * Human-readable version.
   * @type {string}
   */
  version = '1.0.0';

  /**
   * List of plugin names this depends on (optional).
   * @type {string[]}
   */
  dependencies = [];

  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Called once when the plugin is registered.
   * @param {EventBus} eb
   */
  init(eb) {
    // e.g. console.log(`${this.name} initialized`);
  }

  /**
   * Event subscriptions — return an object of { eventName: handler }.
   * Handlers receive the data payload from eb.emit(event, data).
   * @returns {Object<string, Function>}
   */
  get events() {
    return {
      'game:init': (data) => {
        // const { gm } = data;
      },
      'game:newLevel': (data) => {
        // const { gm, depth } = data;
      },
      'turn:end': (data) => {
        // const { turn, gm } = data;
      },
      'entity:death': (data) => {
        // const { entity, killer } = data;
      },
      'combat:melee': (data) => {
        // const { attacker, defender, damage } = data;
      },
      'player:move': (data) => {
        // const { x, y } = data;
      },
    };
  }

  /**
   * Called when the plugin is unregistered. Clean up event listeners
   * if you used manual eb.on() in init().
   * @param {EventBus} eb
   */
  destroy(eb) {
    // Cleanup
  }
}
