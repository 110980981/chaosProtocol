import { VIS } from './MapSystem.js';

export class FOVSystem {
  constructor(mapSystem) {
    this.map = mapSystem;
    this.radius = 9;
  }

  compute(cx, cy) {
    if (!this.map.inBounds(cx, cy)) return;

    // Demote visible → explored
    for (let y = 0; y < this.map.h; y++)
      for (let x = 0; x < this.map.w; x++)
        if (this.map.tiles[y][x].vis === VIS.VISIBLE)
          this.map.tiles[y][x].vis = VIS.EXPLORED;

    // Player tile always visible
    this._setVis(cx, cy);

    // Raycast to every tile within radius using Bresenham
    const r2 = this.radius * this.radius;
    for (let y = cy - this.radius; y <= cy + this.radius; y++) {
      for (let x = cx - this.radius; x <= cx + this.radius; x++) {
        if (!this.map.inBounds(x, y)) continue;
        if (x === cx && y === cy) continue;
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2) continue;

        if (this._hasLineSight(cx, cy, x, y)) {
          this._setVis(x, y);
        }
      }
    }
  }

  _hasLineSight(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0, y = y0;

    while (true) {
      // Stop before the final tile
      if (x === x1 && y === y1) return true;

      // The tile that blocks sight, excluding origin and target
      if ((x !== x0 || y !== y0) && this.map.tiles[y][x].blocksSight) {
        return false;
      }

      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  _setVis(x, y) { this.map.tiles[y][x].vis = VIS.VISIBLE; }
}
