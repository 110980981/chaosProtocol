import { EventBus } from './core/EventBus.js';
import { PluginSystem } from './core/PluginSystem.js';
import { GameManager } from './core/GameManager.js';
import { GameScene } from './scenes/GameScene.js';
import { registerBuiltInPlugins } from './plugins/registry.js';

// Create shared core instances
const eventBus = new EventBus();
const pluginSystem = new PluginSystem(eventBus);
const gameManager = new GameManager(eventBus, pluginSystem);

// Register built-in plugins
registerBuiltInPlugins(pluginSystem);

// Expose globally for debugging / plugin access
window.CHAOS = { eventBus, pluginSystem, gameManager };

// Pass shared instances via Phaser's data mechanism
const shared = { eventBus, pluginSystem, gameManager };

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: new GameScene(shared),
  input: {
    keyboard: true,
    mouse: false,
    touch: true,
  },
  fps: { target: 30, forceSetTimeOut: true },
  render: { pixelArt: true, antialias: false },
};

new Phaser.Game(config);
