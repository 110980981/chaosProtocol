export const TILE = { WALL: 0, FLOOR: 1 };
export const VIS = { UNSEEN: 0, EXPLORED: 1, VISIBLE: 2 };

class Tile {
  constructor(type = TILE.WALL) { this.type = type; this.vis = VIS.UNSEEN; }
  get blocked() { return this.type === TILE.WALL; }
  get blocksSight() { return this.type === TILE.WALL; }
  get walkable() { return !this.blocked; }
}

export class MapSystem {
  constructor(w = 60, h = 40) {
    this.w = w; this.h = h;
    this.tiles = [];
    this.rooms = [];
    this.roomConnections = [];
  }

  generate(depth = 1) {
    this.tiles = [];
    this.rooms = [];
    this.roomConnections = [];

    for (let y = 0; y < this.h; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.w; x++) this.tiles[y][x] = new Tile(TILE.WALL);
    }

    const maxRooms = Math.min(6 + depth, 15);
    for (let i = 0; i < 60 && this.rooms.length < maxRooms; i++) {
      const rw = 4 + Math.floor(Math.random() * 6);
      const rh = 4 + Math.floor(Math.random() * 6);
      const rx = 1 + Math.floor(Math.random() * (this.w - rw - 2));
      const ry = 1 + Math.floor(Math.random() * (this.h - rh - 2));
      const room = { x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) };

      if (this.rooms.some(r => this._overlap(r, room))) continue;
      this._carve(room);
      if (this.rooms.length > 0) this._connect(this.rooms[this.rooms.length - 1], room);
      this.rooms.push(room);
    }
  }

  _overlap(a, b) {
    return a.x - 1 < b.x + b.w && a.x + a.w + 1 > b.x &&
           a.y - 1 < b.y + b.h && a.y + a.h + 1 > b.y;
  }

  _carve(r) {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++)
        if (y > 0 && y < this.h - 1 && x > 0 && x < this.w - 1)
          this.tiles[y][x].type = TILE.FLOOR;
  }

  _connect(a, b) {
    let x = a.cx, y = a.cy;
    const corners = Math.random() < 0.5
      ? [{ dx: 0, dy: 0 }, { dx: Math.sign(b.cx - a.cx), dy: 0 }, { dx: 0, dy: Math.sign(b.cy - a.cy) }]
      : [{ dx: 0, dy: 0 }, { dx: 0, dy: Math.sign(b.cy - a.cy) }, { dx: Math.sign(b.cx - a.cx), dy: 0 }];

    for (const step of corners) {
      while (x !== b.cx || y !== b.cy) {
        if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.tiles[y][x].type = TILE.FLOOR;
        if (step.dx && x !== b.cx) x += Math.sign(b.cx - x);
        else if (step.dy && y !== b.cy) y += Math.sign(b.cy - y);
        else break;
      }
    }
  }

  inBounds(x, y) { return x >= 0 && x < this.w && y >= 0 && y < this.h; }
  isWall(x, y) { return !this.inBounds(x, y) || this.tiles[y][x].type === TILE.WALL; }
  isWalkable(x, y) { return this.inBounds(x, y) && this.tiles[y][x].walkable; }
}
