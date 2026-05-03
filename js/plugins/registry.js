import { XPPlugin } from './example-xp.js';

export function registerBuiltInPlugins(ps) {
  ps.register(new XPPlugin());
  console.log(`[Plugins] ${ps.getAll().length} built-in plugins loaded`);
}
