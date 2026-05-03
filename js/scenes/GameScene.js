import { GameManager } from '../core/GameManager.js';
import { TurnSystem } from '../core/TurnSystem.js';
import { MapSystem, TILE, VIS } from '../systems/MapSystem.js';
import { FOVSystem } from '../systems/FOVSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { BattleSystem } from '../systems/BattleSystem.js';
import { ARCHETYPES, getArchetypeCardCount } from '../systems/CardSystem.js';
import { createPlayer } from '../entities/factories.js';

export class GameScene extends Phaser.Scene {
  constructor(shared) {
    super({ key: 'GameScene' });
    this.shared = shared;
  }

  init() {
    this.eb = this.shared.eventBus;
    this.ps = this.shared.pluginSystem;
    this.gm = this.shared.gameManager;

    this.TS = 24;
    this.entityLabels = [];
    this.messages = [];
    this.hudTexts = [];
    this.msgTexts = [];
    this.dpadButtons = [];
    this.gameOver = false;
    this.mode = 'explore';
    this._battleDir = null;
    this.battleUI = [];    // Battle UI elements
    this.deckUI = [];      // Deck view UI elements
    this.selectedCard = -1;
  }

  shutdown() {
    this.eb?.removeContext(this);
  }

  create() {
    this._calcTS();

    this.mapSystem = new MapSystem(60, 40);
    this.fovSystem = new FOVSystem(this.mapSystem);
    this.combatSystem = new CombatSystem(this.eb);
    this.gm.init(this.mapSystem, this.combatSystem);
    this.turnSystem = new TurnSystem(this.gm, this.eb);

    this.gfx = this.add.graphics();

    this.gm.player = createPlayer(0, 0);

    // Show archetype selection before starting the game
    this._showArchetypeSelection();
  }

  _startGame(selectedArchetypes) {
    this.battleSystem = new BattleSystem(this.eb, this.combatSystem, selectedArchetypes);

    this.gm.newLevel(this.gm.depth);
    this.fovSystem.compute(this.gm.player.x, this.gm.player.y);

    const ww = this.mapSystem.w * this.TS;
    const wh = this.mapSystem.h * this.TS;
    this.cameras.main.setBounds(0, 0, ww, wh);
    this._centerCam();

    this._setupInput();
    this._createHUD();
    this._createMsgLog();
    this._createDPad();
    this._bindEvents();

    this._renderAll();
    this._updateHUD();
  }

  _showArchetypeSelection() {
    const sw = this.scale.width, sh = this.scale.height;
    const MAX_SELECT = 3;
    const selected = [];
    const ui = [];
    const archetypeIds = Object.keys(ARCHETYPES);

    // Overlay
    ui.push(this.add.rectangle(sw/2, sh/2, sw, sh, 0x000000, 0.95)
      .setScrollFactor(0).setDepth(50));

    // Title
    ui.push(this.add.text(sw/2, 20, '⚡ 流派选择', {
      fontSize: '22px', color: '#ff0', fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(51));

    // Subtitle
    ui.push(this.add.text(sw/2, 50, '选择 1~3 个流派，决定本局可获得的卡牌', {
      fontSize: '12px', color: '#aaa', fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(51));

    // Selected count display
    const countTxt = this.add.text(sw/2, 70, '已选 0/3', {
      fontSize: '14px', color: '#8cf', fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(51);
    ui.push(countTxt);

    // Archetype card grid
    const gap = 8;
    const cols = 3;
    const cardW = Math.min(140, (sw - 40 - gap * (cols - 1)) / cols);
    const cardH = 78;
    const rows = Math.ceil(archetypeIds.length / cols);
    const gridW = cols * cardW + (cols - 1) * gap;
    const gridH = rows * cardH + (rows - 1) * gap;
    const gridX = (sw - gridW) / 2;
    const gridY = 88;

    archetypeIds.forEach((id, i) => {
      const a = ARCHETYPES[id];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = gridX + col * (cardW + gap);
      const cy = gridY + row * (cardH + gap);

      const bg = this.add.rectangle(cx + cardW/2, cy + cardH/2, cardW, cardH, 0x333333, 0.9)
        .setScrollFactor(0).setDepth(52).setInteractive();
      const border = this.add.rectangle(cx + cardW/2, cy + cardH/2, cardW, cardH)
        .setScrollFactor(0).setDepth(51).setStrokeStyle(2, 0x666666);
      const nameTxt = this.add.text(cx + cardW/2, cy + 8, a.name, {
        fontSize: '16px', color: '#fff', fontFamily: 'monospace'
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(53);
      const descTxt = this.add.text(cx + cardW/2, cy + 30, a.desc, {
        fontSize: '11px', color: '#aaa', fontFamily: 'monospace'
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(53);
      const cntTxt = this.add.text(cx + cardW/2, cy + 52, `${getArchetypeCardCount(id)} 张卡牌`, {
        fontSize: '10px', color: '#888', fontFamily: 'monospace'
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(53);

      ui.push(bg, border, nameTxt, descTxt, cntTxt);

      bg.on('pointerdown', () => {
        const idx = selected.indexOf(id);
        if (idx >= 0) {
          selected.splice(idx, 1);
          bg.setFillStyle(0x333333, 0.9);
          border.setStrokeStyle(2, 0x666666);
        } else if (selected.length < MAX_SELECT) {
          selected.push(id);
          bg.setFillStyle(a.color, 0.25);
          border.setStrokeStyle(2, a.color);
        }
        countTxt.setText(`已选 ${selected.length}/${MAX_SELECT}`);
        confirmBtn.setAlpha(selected.length > 0 ? 1 : 0.4);
      });
    });

    // Confirm button
    const confirmBtn = this.add.rectangle(sw/2, sh - 40, 200, 44, 0x448844, 0.9)
      .setScrollFactor(0).setDepth(52).setInteractive().setAlpha(0.4);
    const confirmTxt = this.add.text(sw/2, sh - 40, '开始探险', {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(53);
    ui.push(confirmBtn, confirmTxt);

    confirmBtn.on('pointerdown', () => {
      if (selected.length === 0) return;
      ui.forEach(o => o.destroy());
      this._startGame(selected);
    });
  }

  /* ─── TILE SIZE ─── */
  _calcTS() {
    const sw = this.scale.width;
    const sh = this.scale.height;
    const hudH = 80;
    this.TS = Math.max(14, Math.min(
      Math.floor((sw - 8) / 22),
      Math.floor((sh - hudH) / 18)
    ));
    this.TS = Math.min(this.TS, 32);
  }

  /* ─── RENDERING ─── */
  _renderAll() {
    this._renderMap();
    this._renderEntities();
    this._centerCam();
  }

  _renderMap() {
    const g = this.gfx; g.clear();
    const ts = this.TS;
    const map = this.mapSystem;

    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = map.tiles[y][x];
        if (t.vis === VIS.UNSEEN) continue;

        let color;
        if (t.vis === VIS.EXPLORED) color = t.type === TILE.FLOOR ? 0x333333 : 0x1a1a1a;
        else color = t.type === TILE.FLOOR ? 0x555555 : 0x2a2a2a;

        g.fillStyle(color, 1);
        g.fillRect(x * ts, y * ts, ts, ts);

        if (t.vis === VIS.VISIBLE && t.type === TILE.FLOOR) {
          g.fillStyle(0x666666, 1);
          g.fillRect(x * ts + 1, y * ts + 1, ts - 2, ts - 2);
        }
      }
    }
  }

  _renderEntities() {
    const map = this.mapSystem;
    const ts = this.TS;

    this.entityLabels.forEach(t => t.destroy());
    this.entityLabels = [];

    const visible = this.gm.entities.filter(e =>
      map.inBounds(e.x, e.y) && map.tiles[e.y][e.x].vis === VIS.VISIBLE
    );

    for (const e of visible) {
      if (e.getComponent('item') && e === this.gm.getItemsAt(e.x, e.y).find(i => i.id === e.id)) {
        if (this.gm.player.x === e.x && this.gm.player.y === e.y) continue;
      }
      const label = this.add.text(
        e.x * ts + ts / 2, e.y * ts + ts / 2,
        e.glyph,
        { fontSize: `${ts}px`, color: e.color, fontFamily: 'monospace' }
      ).setOrigin(0.5).setDepth(e === this.gm.player ? 10 : 5);
      this.entityLabels.push(label);
    }
  }

  _centerCam() {
    const p = this.gm.player;
    if (p) this.cameras.main.centerOn(p.x * this.TS + this.TS / 2, p.y * this.TS + this.TS / 2);
  }

  /* ─── HUD ─── */
  _createHUD() {
    const style = { fontSize: '13px', color: '#ccc', fontFamily: 'monospace' };
    this.hudBg = this.add.rectangle(0, 0, this.scale.width, 24, 0x000000, 0.8)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(20);
    this.hudL = this.add.text(6, 4, '', style).setScrollFactor(0).setDepth(21);
    // Deck button on the right side of HUD
    this.hudDeckBtn = this.add.text(this.scale.width - 6, 4, '📋 卡组', {
      ...style, color: '#8cf'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(21).setInteractive();
    this.hudDeckBtn.on('pointerdown', () => { if (!this.gameOver) this._showDeck(); });
  }

  _updateHUD() {
    const p = this.gm.player;
    if (!p) return;
    const s = p.getComponent('stats');
    const hpBar = this._bar(s.hp, s.maxHp, 10);
    const deckSize = this.battleSystem?.persistentDeck?.length ?? 0;
    this.hudL.setText(
      `HP:${hpBar} ${s.hp}/${s.maxHp}  ATK:${s.attack}  DEF:${s.defense}  牌组:${deckSize}  深度:${this.gm.depth}`
    );
    this.hudBg.setSize(this.scale.width, 24);
  }

  _bar(cur, max, len) {
    const filled = Math.round((cur / max) * len);
    return '█'.repeat(filled) + '░'.repeat(len - filled);
  }

  /* ─── MESSAGE LOG ─── */
  _createMsgLog() {
    const style = { fontSize: '12px', fontFamily: 'monospace' };
    for (let i = 0; i < 3; i++) {
      const t = this.add.text(6, this.scale.height - 14 - i * 15, '', { ...style, color: '#aaa' })
        .setScrollFactor(0).setDepth(21);
      this.msgTexts.push(t);
    }
  }

  addMessage(msg, color = '#fff') {
    this.messages.push({ msg, color });
    if (this.messages.length > 100) this.messages.shift();
    this._renderMessages();
  }

  _renderMessages() {
    const recent = this.messages.slice(-3);
    this.msgTexts.forEach((t, i) => {
      const e = recent[i];
      if (e) { t.setText(e.msg); t.setColor(e.color); }
      else t.setText('');
    });
  }

  /* ─── TOUCH D-PAD ─── */
  _createDPad() {
    this.dpadButtons.forEach(b => b.destroy());
    this.dpadButtons = [];

    const sw = this.scale.width;
    const sh = this.scale.height;
    const size = Math.min(44, Math.floor(sw / 9));
    const gap = 2;
    const padW = size * 3 + gap * 2;
    const ox = sw - padW - 8;
    const oy = sh - size * 3 - gap * 2 - 8;

    const dirs = [
      { ch:'↖', dx:-1, dy:-1 }, { ch:'↑', dx:0, dy:-1 }, { ch:'↗', dx:1, dy:-1 },
      { ch:'←', dx:-1, dy:0 },  { ch:'⬇', dx:0, dy:0, stairs:true },  { ch:'→', dx:1, dy:0 },
      { ch:'↙', dx:-1, dy:1 },  { ch:'↓', dx:0, dy:1 },  { ch:'↘', dx:1, dy:1 },
    ];

    dirs.forEach((d, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const bx = ox + col * (size + gap);
      const isStairs = d.stairs;
      const bgColor = isStairs ? 0x224466 : 0x333333;
      const by = oy + row * (size + gap);

      const bg = this.add.rectangle(bx + size / 2, by + size / 2, size, size, bgColor, 0.5)
        .setScrollFactor(0).setDepth(25).setInteractive({ useHandCursor: false });

      const txt = this.add.text(bx + size / 2, by + size / 2, d.ch, {
        fontSize: `${size - 8}px`, color: isStairs ? '#8cf' : '#ccc', fontFamily: 'monospace'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(26);

      bg.on('pointerdown', () => {
        if (this.gameOver || this.mode === 'battle') return;
        bg.setFillStyle(isStairs ? 0x446688 : 0x666666, 0.7);
        if (isStairs) { this._stairs(); return; }
        this._handleAction(d.dx, d.dy);
      });
      bg.on('pointerup', () => bg.setFillStyle(bgColor, 0.5));
      bg.on('pointerout', () => bg.setFillStyle(bgColor, 0.5));

      this.dpadButtons.push(bg, txt);
    });

  }

  /* ─── SWIPE / TAP ─── */
  _setupInput() {
    this.input.keyboard.on('keydown', (ev) => {
      if (this.gameOver) return;
      const map = {
        'ArrowUp': [0,-1], 'ArrowDown': [0,1], 'ArrowLeft': [-1,0], 'ArrowRight': [1,0],
        'w': [0,-1], 's': [0,1], 'a': [-1,0], 'd': [1,0],
        'W': [0,-1], 'S': [0,1], 'A': [-1,0], 'D': [1,0],
        '.': [0,0],
      };
      if (map[ev.key]) { this._handleAction(map[ev.key][0], map[ev.key][1]); return; }
      if (ev.key === 'Enter' || ev.key === ',' || ev.key === 'g') { this._pickup(); return; }
      if (ev.key === '>' || ev.key === '<') { this._stairs(); }
    });

    // Swipe / tap on game area
    let tapStart = null;
    const isOnDPad = (ptr) => ptr.y > this.scale.height - 160;

    this.input.on('pointerdown', (ptr) => {
      if (this.gameOver) return;
      if (this.mode === 'battle') { this._onBattleTap(ptr); return; }
      if (isOnDPad(ptr)) { tapStart = null; return; }
      tapStart = { x: ptr.x, y: ptr.y };
    });

    this.input.on('pointerup', (ptr) => {
      if (this.gameOver || !tapStart || this.mode === 'battle') return;
      const dx = ptr.x - tapStart.x;
      const dy = ptr.y - tapStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      tapStart = null;

      // Tap on game area = pickup / interact
      if (dist < 20) { this._pickup(); return; }

      // Swipe = 8-dir movement
      if (dist > 30) {
        const angle = Math.atan2(dy, dx);
        const sector = Math.round(angle / (Math.PI / 4));
        const dirs = {
          0: [1,0], 1: [1,1], 2: [0,1], 3: [-1,1],
          4: [-1,0], '-3': [-1,-1], '-2': [0,-1], '-1': [1,-1],
        };
        this._handleAction((dirs[sector]||[0,0])[0], (dirs[sector]||[0,0])[1]);
      }
    });
  }

  /* ─── GAME ACTIONS ─── */
  _handleAction(dx, dy) {
    if (this.gameOver) return;
    const p = this.gm.player;
    if (!p || p.getComponent('stats').hp <= 0) return;

    this.eb.emit('player:beforeAction', { dx, dy, gm: this.gm });

    if (dx === 0 && dy === 0) {
      this.turnSystem.process(() => this.eb.emit('player:action', { type: 'wait' }));
      this._afterTurn();
      return;
    }

    const tx = p.x + dx, ty = p.y + dy;
    const blocker = this.gm.getBlockingEntityAt(tx, ty);

    if (blocker && blocker.hasComponent('ai')) {
      this._enterBattle(blocker, dx, dy);
      return;
    } else if (this.mapSystem.isWalkable(tx, ty)) {
      this.turnSystem.process(() => {
        p.x = tx; p.y = ty;
        this.gm.updateEntityMap(p);
        this.eb.emit('player:move', { x: tx, y: ty });
        this.fovSystem.compute(tx, ty);

        // Auto-pickup items on ground
        const items = this.gm.getItemsAt(tx, ty);
        if (items.length > 0) {
          const item = items[0];
          const ic = item.getComponent('item');
          const ps = p.getComponent('stats');
          if (ic && ic.effect === 'heal' && ps.hp < ps.maxHp) {
            const healed = this.gm.combatSystem.heal(p, ic.value);
            this.gm.removeEntity(item);
            this.addMessage(`自动使用 ${item.name}，恢复 ${healed} 点生命`, '#4f4');
          } else {
            const inv = p.getComponent('inventory');
            if (inv && inv.items.length < inv.capacity) {
              inv.items.push(item);
              this.gm.removeEntity(item);
              this.eb.emit('player:pickup', { entity: item, gm: this.gm });
            }
          }
        }
      });
    } else {
      this.turnSystem.process(() => this.eb.emit('player:action', { type: 'bump' }));
    }

    this._afterTurn();
  }

  _pickup() {
    if (this.gameOver) return;
    const p = this.gm.player;
    const items = this.gm.getItemsAt(p.x, p.y);
    if (items.length === 0) { this.addMessage('这里没有物品', '#888'); return; }

    const item = items[0];
    const ic = item.getComponent('item');
    const ps = p.getComponent('stats');

    if (ic && ic.effect === 'heal' && ps.hp < ps.maxHp) {
      const healed = this.gm.combatSystem.heal(p, ic.value);
      this.gm.removeEntity(item);
      this.addMessage(`使用 ${item.name}，恢复 ${healed} 点生命`, '#4f4');
    } else {
      const inv = p.getComponent('inventory');
      if (inv.items.length >= inv.capacity) { this.addMessage('背包已满', '#ff8'); return; }
      inv.items.push(item);
      this.gm.removeEntity(item);
      this.eb.emit('player:pickup', { entity: item, gm: this.gm });
      this.addMessage(`捡起 ${item.name}`, '#8f8');
    }
    this._renderAll();
    this._renderEntities();
  }

  _stairs() {
    if (this.gameOver) return;
    const p = this.gm.player;
    const stairs = this.gm.entities.find(e =>
      e.hasComponent('stairs') && e.x === p.x && e.y === p.y
    );
    if (!stairs) { this.addMessage('这里没有楼梯', '#888'); return; }
    this.gm.depth++;
    this.gm.newLevel(this.gm.depth);
    this.fovSystem.compute(p.x, p.y);
    this.addMessage(`向下到达第 ${this.gm.depth} 层`, '#fa0');
    this._renderAll();
    this._updateHUD();
  }

  _afterTurn() {
    const p = this.gm.player;
    const s = p.getComponent('stats');
    if (s.hp <= 0) { this._gameOver(); return; }
    this._renderAll();
    this._updateHUD();
  }

  /* ─── BIND EVENTS ─── */
  _bindEvents() {
    this.eb.on('entity:death', (data) => {
      const { entity } = data;
      if (entity.hasComponent('ai')) {
        this.addMessage(`${entity.name} 被击败了！`, '#f88');
        this.gm.removeEntity(entity);
      }
      if (entity.hasComponent('player')) this._gameOver();
      this._renderAll();
    }, this);

    this.eb.on('combat:melee', (data) => {
      const { attacker, defender, damage } = data;
      const an = attacker === this.gm.player ? '你' : attacker.name;
      const dn = defender === this.gm.player ? '你' : defender.name;
      this.addMessage(`${an} 攻击 ${dn}，造成 ${damage} 点伤害`, '#ff8');
    }, this);

    this.eb.on('entity:heal', (data) => {
      const { entity, amount } = data;
      if (entity === this.gm.player) this.addMessage(`恢复 ${amount} 点生命`, '#4f4');
    }, this);

    this.eb.on('player:levelUp', (data) => {
      const { level } = data;
      this.addMessage(`★ 升级！等级 ${level}！全属性提升！`, '#ff0');
    }, this);

    this.eb.on('player:pickup', (data) => {
      this._renderAll();
      this._renderEntities();
    }, this);

    this.scale.on('resize', () => {
      this._calcTS();
      this._createHUD();
      this._createMsgLog();
      this._createDPad();
      this._renderAll();
      this._updateHUD();
    });
  }

  /* ─── CARD BATTLE ─── */
  _enterBattle(enemy, dx, dy) {
    this._closeDeck();
    this._battleDir = { dx, dy };
    // If enemy is already dead, just clean up and step forward
    const es = enemy.getComponent('stats');
    if (es && es.hp <= 0) {
      this.gm.removeEntity(enemy);
      this._stepForward();
      this._renderAll();
      this._updateHUD();
      return;
    }
    this.mode = 'battle';
    this.messages = [];
    this.battleSystem.reset();
    this.battleSystem.start(this.gm.player, [enemy]);
    this._clearBattleUI();
    this._createBattleUI();
    this._renderBattle();
  }

  _exitBattle(won) {
    this.mode = 'explore';
    this._clearBattleUI();
    // Force-clean any dead entities from the game world
    const toRemove = this.gm.entities.filter(e =>
      e !== this.gm.player && e.getComponent('stats') && e.getComponent('stats').hp <= 0
    );
    for (const e of toRemove) {
      this.gm.removeEntity(e);
      this.eb.emit('entity:death', { entity: e, killer: this.gm.player });
    }
    if (won) this._stepForward();
    this._createDPad();
    this._renderAll();
    this._updateHUD();
    this.addMessage('战斗胜利！继续探索', '#ff0');
  }

  /** Step the player forward one tile in the direction they were going (after battle) */
  _stepForward() {
    if (!this._battleDir) return;
    const { dx, dy } = this._battleDir;
    const p = this.gm.player;
    const nx = p.x + dx, ny = p.y + dy;
    this._battleDir = null;
    if (this.mapSystem.isWalkable(nx, ny)) {
      p.x = nx; p.y = ny;
      this.gm.updateEntityMap(p);
      this.fovSystem.compute(nx, ny);
    }
  }

  _clearBattleUI() {
    this.battleUI.forEach(o => o.destroy());
    this.battleUI = [];
    this.selectedCard = -1;
  }

  _createBattleUI() {
    const sw = this.scale.width;
    const sh = this.scale.height;
    const bs = this.battleSystem;
    const enemy = bs.enemies[0];
    if (!enemy) return;

    // Dark overlay
    const overlay = this.add.rectangle(sw / 2, sh / 2, sw, sh, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(30);
    this.battleUI.push(overlay);

    // ── Enemy area (top) ──
    const eName = this.add.text(sw / 2, 16, enemy.name, {
      fontSize: '16px', color: enemy.color, fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(31);
    this.battleUI.push(eName);

    this._battleHPBar('enemy', 36);

    // Enemy intent (Slay the Spire style)
    const intent = bs.getIntent(enemy);
    if (intent.desc) {
      const intentTxt = this.add.text(sw / 2, 52, intent.desc, {
        fontSize: '18px', color: intent.color, fontFamily: 'monospace'
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(31);
      this.battleUI.push(intentTxt);
      // Intent icon background
      const intentBg = this.add.rectangle(sw / 2, 54, 70, 22, 0x440000, 0.6)
        .setScrollFactor(0).setDepth(30);
      this.battleUI.push(intentBg);
      // Bring text to front
      intentTxt.setDepth(31);
    }
    // Enemy statuses
    const eStatusTxt = this.add.text(sw / 2, 72, '', {
      fontSize: '11px', color: '#aaa', fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(31);
    this.battleUI.push(eStatusTxt);
    this._eStatus = eStatusTxt;

    // ── Player area (mid) ──
    const pName = this.add.text(16, sh * 0.45, `${this.gm.player.name}  HP:`, {
      fontSize: '14px', color: '#ccc', fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(31);
    this.battleUI.push(pName);

    this._battleHPBar('player', sh * 0.45 + 18);

    // Player statuses
    const pStatusTxt = this.add.text(17, sh * 0.45 + 32, '', {
      fontSize: '11px', color: '#aaa', fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(31);
    this.battleUI.push(pStatusTxt);
    this._pStatus = pStatusTxt;

    // Energy display
    this._battleEnergy(sw, sh);

    // ── Card hand (bottom) ──
    this._battleHand(sw, sh);

    // End turn button
    const endBtn = this.add.rectangle(sw / 2, sh - 4, sw - 40, 36, 0x884422, 0.9)
      .setScrollFactor(0).setDepth(35).setInteractive();
    const endTxt = this.add.text(sw / 2, sh - 4, '▸ 结束回合 ◂', {
      fontSize: '16px', color: '#fff', fontFamily: 'monospace'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(36);
    endBtn.on('pointerdown', () => {
      if (bs.phase !== 'player') return;
      bs.endPlayerTurn();
      if (bs.phase === 'won') { setTimeout(() => this._showRewards(), 100); return; }
      if (bs.phase === 'lost') { setTimeout(() => this._gameOver(), 100); return; }
      setTimeout(() => {
        this._clearBattleUI();
        this._createBattleUI();
        this._renderBattle();
      }, 50);
    });
    this.battleUI.push(endBtn, endTxt);
  }

  _battleHPBar(who, y) {
    const sw = this.scale.width;
    const barW = sw - 32;
    const barH = 10;
    const bg = this.add.rectangle(16 + barW / 2, y, barW, barH, 0x333333)
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(31);
    const fill = this.add.rectangle(16, y, barW, barH, who === 'enemy' ? 0xff4444 : 0x44aa44)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(32);
    const txt = this.add.text(16 + barW / 2, y - 1, '', {
      fontSize: '9px', color: '#fff', fontFamily: 'monospace'
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(33);
    // Store references
    if (who === 'enemy') { this._enemyFill = fill; this._enemyTxt = txt; this._enemyBarW = barW; }
    else { this._playerFill = fill; this._playerTxt = txt; this._playerBarW = barW; }
    this._updateHPBar(who);
    this.battleUI.push(bg, fill, txt);
  }

  _updateHPBar(who) {
    const bs = this.battleSystem;
    const barW = who === 'enemy' ? this._enemyBarW : this._playerBarW;
    const fill = who === 'enemy' ? this._enemyFill : this._playerFill;
    const txt = who === 'enemy' ? this._enemyTxt : this._playerTxt;
    if (!fill || !txt) return;
    let s, name;
    if (who === 'enemy') {
      if (!bs.enemies[0]) return;
      s = bs.enemies[0].getComponent('stats');
      name = bs.enemies[0].name;
    } else {
      s = bs.player.getComponent('stats');
      name = bs.player.name;
    }
    if (!s) return;
    const pct = Math.max(0, s.hp / s.maxHp);
    fill.setDisplaySize(barW * pct, 10);
    const block = s.block || 0;
    txt.setText(`${name}  ${s.hp}/${s.maxHp}` + (block ? `  [格挡 ${block}]` : ''));
  }

  _battleEnergy(sw, sh) {
    const bs = this.battleSystem;
    const y = sh * 0.45 + 34;
    const txt = this.add.text(16, y, '', {
      fontSize: '14px', color: '#ffcc00', fontFamily: 'monospace'
    }).setScrollFactor(0).setDepth(31);
    this.updateEnergyText = () => {
      txt.setText(`能量: ${'◆'.repeat(bs.energy)}${'◇'.repeat(Math.max(0, bs.maxEnergy - bs.energy))}  (${bs.energy}/${bs.maxEnergy})`);
    };
    this.updateEnergyText();
    this.battleUI.push(txt);
  }

  _battleHand(sw, sh) {
    const bs = this.battleSystem;
    const hand = bs.hand;
    const cardW = Math.min(80, (sw - 24) / Math.max(hand.length, 1));
    const cardH = 70;
    const gap = 4;
    const totalW = hand.length * (cardW + gap) - gap;
    const startX = (sw - totalW) / 2;
    const y = sh - 90;

    const highlight = this.add.rectangle(0, 0, cardW + 4, cardH + 4, 0xffffff, 0)
      .setScrollFactor(0).setDepth(34);
    this.battleUI.push(highlight);

    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const cx = startX + i * (cardW + gap);
      const canPlay = bs.energy >= card.cost;

      // Card background
      const bg = this.add.rectangle(cx + cardW / 2, y + cardH / 2, cardW, cardH, canPlay ? 0x444466 : 0x333333, 0.9)
        .setScrollFactor(0).setDepth(33).setInteractive();
      const border = this.add.rectangle(cx + cardW / 2, y + cardH / 2, cardW, cardH, canPlay ? 0x8888cc : 0x555555)
        .setScrollFactor(0).setDepth(32).setFillStyle();
      border.setStrokeStyle(1, canPlay ? 0xaaaaff : 0x666666);

      // Cost
      const costTxt = this.add.text(cx + 4, y + 4, `${card.cost}`, {
        fontSize: '14px', color: '#ffcc00', fontFamily: 'monospace', backgroundColor: '#00000088'
      }).setScrollFactor(0).setDepth(34);

      // Name
      const nameTxt = this.add.text(cx + cardW / 2, y + 18, card.name, {
        fontSize: '12px', color: canPlay ? '#fff' : '#888', fontFamily: 'monospace'
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(34);

      // Description
      const descTxt = this.add.text(cx + cardW / 2, y + 38, card.desc, {
        fontSize: '9px', color: canPlay ? '#aaf' : '#666', fontFamily: 'monospace', align: 'center'
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(34);

      this.battleUI.push(bg, border, costTxt, nameTxt, descTxt);

      // Interactive tap
      const idx = i;
      bg.on('pointerdown', () => {
        if (bs.phase !== 'player') return;
        if (bs.energy < card.cost) { this.addMessage('能量不足！', '#f88'); return; }
        const success = bs.playCard(idx);
        if (success) {
          this.addMessage(`打出 ${card.name}！`, '#aaf');
          if (bs.phase === 'won') { this._showRewards(); return; }
          if (bs.phase === 'lost') { this._gameOver(); return; }
          setTimeout(() => {
            this._clearBattleUI();
            this._createBattleUI();
            this._renderBattle();
          }, 50);
        }
      });
    }
  }

  _renderBattle() {
    this._updateHPBar('enemy');
    this._updateHPBar('player');
    if (this.updateEnergyText) this.updateEnergyText();
    // Update status text
    const bs = this.battleSystem;
    if (this._eStatus && bs.enemies[0]) this._eStatus.setText(bs.getStatusString(bs.enemies[0]));
    if (this._pStatus) this._pStatus.setText(bs.getStatusString(bs.player));
  }

  _onBattleTap(ptr) {
    // Battle taps are handled by card buttons directly
    // This catches taps on empty areas for logging
  }

  /* ─── Deck viewer ─── */
  _showDeck() {
    // Close existing if open
    this._closeDeck();

    const sw = this.scale.width, sh = this.scale.height;
    const deck = this.battleSystem?.persistentDeck || [];
    const ui = [];

    // Overlay
    ui.push(this.add.rectangle(sw/2, sh/2, sw, sh, 0x000000, 0.92)
      .setScrollFactor(0).setDepth(50).setInteractive());

    // Title
    ui.push(this.add.text(sw/2, 12, `我的卡组（${deck.length} 张）`, {
      fontSize: '16px', color: '#ff0', fontFamily: 'monospace'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(51));

    // Close button (top-right)
    const closeBtn = this.add.text(sw - 10, 10, '✕ 关闭', {
      fontSize: '14px', color: '#f88', fontFamily: 'monospace'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(51).setInteractive();
    closeBtn.on('pointerdown', () => this._closeDeck());
    ui.push(closeBtn);

    // Card grid
    const cardW = Math.min(110, Math.floor((sw - 24) / 3));
    const cardH = 52;
    const gapX = 4, gapY = 4;
    const cols = Math.max(2, Math.floor((sw - 16) / (cardW + gapX)));
    const startX = (sw - cols * (cardW + gapX) + gapX) / 2;
    const startY = 36;

    // Group cards by type for better readability
    const sorted = [...deck];
    const typeOrder = { 'attack': 0, 'skill': 1, 'power': 2 };
    sorted.sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9) || a.cost - b.cost);

    sorted.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gapX);
      const cy = startY + row * (cardH + gapY);

      const isPlayable = card.type === 'attack' || card.type === 'skill' || card.type === 'power';
      const bgColor = card.type === 'attack' ? 0x553333 : card.type === 'skill' ? 0x335566 : 0x444466;
      const bg = this.add.rectangle(cx + cardW/2, cy + cardH/2, cardW, cardH, bgColor, 0.85)
        .setScrollFactor(0).setDepth(51);
      const border = this.add.rectangle(cx + cardW/2, cy + cardH/2, cardW, cardH)
        .setScrollFactor(0).setDepth(50).setStrokeStyle(1, 0x888888);
      ui.push(bg, border);

      // Cost
      ui.push(this.add.text(cx + 3, cy + 3, `${card.cost}`, {
        fontSize: '13px', color: '#ffcc00', fontFamily: 'monospace'
      }).setScrollFactor(0).setDepth(52));

      // Name
      ui.push(this.add.text(cx + 18, cy + 2, card.name, {
        fontSize: '12px', color: '#fff', fontFamily: 'monospace'
      }).setScrollFactor(0).setDepth(52));

      // Description
      ui.push(this.add.text(cx + cardW/2, cy + 22, card.desc, {
        fontSize: '9px', color: '#aaf', fontFamily: 'monospace', align: 'center',
        wordWrap: { width: cardW - 8 }
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(52));

      // Type tag
      const typeLabel = card.rarity === 'rare' ? '★' : card.type === 'attack' ? '⚔' : card.type === 'skill' ? '🛡' : '✦';
      ui.push(this.add.text(cx + cardW - 4, cy + 2, typeLabel, {
        fontSize: '10px', color: card.rarity === 'rare' ? '#ff0' : '#888', fontFamily: 'monospace'
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(52));
    });

    this.deckUI = ui;
  }

  _closeDeck() {
    this.deckUI.forEach(o => o.destroy());
    this.deckUI = [];
  }

  _showRewards() {
    this._clearBattleUI();
    const sw = this.scale.width, sh = this.scale.height;
    const bs = this.battleSystem;
    const cards = bs.rewardCards || [];
    const hasCards = cards.length > 0;
    const ui = [];

    // Background
    ui.push(this.add.rectangle(sw/2, sh/2, sw, sh, 0x000000, 0.9).setScrollFactor(0).setDepth(40));

    if (hasCards) {
      // Title for card reward
      ui.push(this.add.text(sw/2, 20, '⚡ 战斗胜利', {
        fontSize: '18px', color: '#ff0', fontFamily: 'monospace'
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(41));
      ui.push(this.add.text(sw/2, 44, `选择一张牌加入牌组（当前 ${bs.persistentDeck.length} 张）`, {
        fontSize: '12px', color: '#aaa', fontFamily: 'monospace'
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(41));

      const cardW = Math.min(100, (sw - 40) / Math.min(cards.length, 3));
      const cardH = 100;
      const totalW = cards.length * (cardW + 6) - 6;
      const startX = (sw - totalW) / 2;
      const y = sh * 0.35;

      cards.forEach((card, i) => {
        const cx = startX + i * (cardW + 6);
        const bg = this.add.rectangle(cx + cardW/2, y + cardH/2, cardW, cardH, 0x444466, 0.9)
          .setScrollFactor(0).setDepth(42).setInteractive();
        const border = this.add.rectangle(cx + cardW/2, y + cardH/2, cardW, cardH)
          .setScrollFactor(0).setDepth(41).setStrokeStyle(2, 0x8888cc);
        const costTxt = this.add.text(cx + 4, y + 4, `${card.cost}`, {
          fontSize: '16px', color: '#ffcc00', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(43);
        const nameTxt = this.add.text(cx + cardW/2, y + 22, card.name, {
          fontSize: '13px', color: '#fff', fontFamily: 'monospace'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(43);
        const descTxt = this.add.text(cx + cardW/2, y + 48, card.desc, {
          fontSize: '10px', color: '#aaf', fontFamily: 'monospace', align: 'center', wordWrap: { width: cardW - 8 }
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(43);

        ui.push(bg, border, costTxt, nameTxt, descTxt);

        bg.on('pointerdown', () => {
          bs.addRewardCard(i);
          this.addMessage(`获得 ${card.name}！`, '#aaf');
          this._clearBattleUI();
          this._exitBattle(true);
        });
      });

      // Skip button
      const skipBtn = this.add.text(sw/2, sh - 40, '[ 跳过 ]', {
        fontSize: '14px', color: '#888', fontFamily: 'monospace'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(42).setInteractive();
      skipBtn.on('pointerdown', () => { this._clearBattleUI(); this._exitBattle(true); });
      ui.push(skipBtn);
    } else {
      // No card reward this time — just show recovery info
      ui.push(this.add.text(sw/2, sh/2 - 20, '⚡ 战斗胜利', {
        fontSize: '20px', color: '#ff0', fontFamily: 'monospace'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(41));
      ui.push(this.add.text(sw/2, sh/2 + 15, `牌组 ${bs.persistentDeck.length} 张 · 生命恢复 10%`, {
        fontSize: '13px', color: '#4f4', fontFamily: 'monospace'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(41));
      ui.push(this.add.text(sw/2, sh/2 + 50, '[ 点击继续 ]', {
        fontSize: '14px', color: '#888', fontFamily: 'monospace'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(42));

      const next = () => { this._clearBattleUI(); this._exitBattle(true); };
      this.time.delayedCall(400, () => {
        this.input.once('pointerdown', next);
      });
    }

    this.battleUI = ui;
  }

  /* ─── GAME OVER ─── */
  _gameOver() {
    this.gameOver = true;
    this.eb.emit('game:over', { gm: this.gm });
    this.addMessage('☠ 你死了！点击屏幕或按 R 重新开始', '#f00');

    // Restart button (mobile-friendly)
    const sw = this.scale.width, sh = this.scale.height;
    this.restartBtn = this.add.rectangle(sw / 2, sh / 2 + 30, 160, 44, 0x444444, 0.8)
      .setScrollFactor(0).setDepth(50);
    this.restartTxt = this.add.text(sw / 2, sh / 2 + 30, '重新开始', {
      fontSize: '18px', color: '#fff', fontFamily: 'monospace'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51);

    const restart = () => this.scene.restart();
    this.input.once('pointerdown', restart);
    this.input.keyboard.once('keydown', (ev) => {
      if (ev.key === 'r' || ev.key === 'R') restart();
    });
  }
}
