// Процедурный пиксель-арт: фигуры рисуются по пикселям в буфер и обводятся контуром.
// Город — в виде «три четверти» (крыши видны сверху-спереди), как в классических RPG.
(function () {
  const P = (G.PAL = {
    k: '#1b1424', dark: '#2a2233', black: '#0d0a12', white: '#ffffff',
    gold: '#f7c948', goldD: '#b07d1a', goldL: '#fff2a8',
    wood: '#9a6234', woodD: '#6b3f1d', woodL: '#c98f56', woodM: '#7f4f28',
    stone: '#8d939c', stoneD: '#5d636c', stoneL: '#c3c8cf', stoneM: '#a6acb5',
    iron: '#a8b0be', ironD: '#6b7383', ironL: '#dde2ea', rust: '#c0663a',
    bone: '#ece2c6', boneD: '#b9aa86', boneL: '#fffaf0',
    cry: '#63d4ff', cryD: '#2b7fd4',
    mith: '#8ff3df', mithD: '#3fae9c', mithL: '#d8fff6',
    red: '#c83a3a', redD: '#8a2222', redL: '#ff7a6a',
    green: '#4caf50', greenD: '#2e6b31', greenL: '#8be08b',
    leaf: '#3d8b3d', leafD: '#24572a', leafL: '#5fb35a', leafX: '#173d1d',
    skin: '#f1c49b', skinD: '#c98f66',
    blue: '#3a5fc8', blueD: '#22388a', blueL: '#7a9cff',
    purple: '#8a4ad0', purpleD: '#552a8a', purpleL: '#c08aff',
    roof: '#b4423a', roofD: '#7f2b25', roofL: '#d8645a',
    slate: '#4a5468', slateD: '#333b4c', slateL: '#6a768e',
    teal: '#2f8f9a', tealD: '#1f6670', tealL: '#5fc0c8',
    plaster: '#e8dcc0', plasterD: '#bfae8a',
    dirt: '#b08d5a', dirtD: '#8a6a40', dirtL: '#c9a46e', glow: '#ffb347', glowL: '#ffe39a',
    robe: '#e6e6f0', robeD: '#a9a9c0', gob: '#6cbf4a', gobD: '#3f8a2a', orc: '#4a8a3a', orcD: '#2f5f25',
    troll: '#6f8494', trollD: '#4f6170', trollL: '#8fa3b0', night: '#3a2a4a', ghost: '#7dff7a',
    water: '#3a7bd5', waterD: '#2a5ea8', waterL: '#7fb4f0',
  });

  class Buf {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
    px(x, y, c) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.d[y * this.w + x] = c;
    }
    get(x, y) {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
      return this.d[y * this.w + x];
    }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) this.px(x, y, c);
        }
      }
    }
    disc(cx, cy, r, c) { this.ellipse(cx, cy, r, r, c); }
    poly(pts, c) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) if (inPoly(x + 0.5, y + 0.5, pts)) this.px(x, y, c);
      }
    }
    line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.px(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    outline(c) {
      const add = [];
      for (let y = 0; y < this.h; y++) {
        for (let x = 0; x < this.w; x++) {
          if (this.get(x, y) !== null) continue;
          if (this.get(x - 1, y) !== null || this.get(x + 1, y) !== null || this.get(x, y - 1) !== null || this.get(x, y + 1) !== null) add.push([x, y]);
        }
      }
      for (const [x, y] of add) this.px(x, y, c);
    }
    canvas(white) {
      const cv = document.createElement('canvas');
      cv.width = this.w; cv.height = this.h;
      const cx = cv.getContext('2d');
      const img = cx.createImageData(this.w, this.h);
      for (let i = 0; i < this.d.length; i++) {
        const c = this.d[i];
        if (!c) continue;
        const rgb = white ? [255, 255, 255] : hex(c);
        img.data[i * 4] = rgb[0]; img.data[i * 4 + 1] = rgb[1]; img.data[i * 4 + 2] = rgb[2]; img.data[i * 4 + 3] = 255;
      }
      cx.putImageData(img, 0, 0);
      return cv;
    }
  }
  function inPoly(x, y, pts) {
    let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  }
  const hexCache = {};
  function hex(c) {
    if (hexCache[c]) return hexCache[c];
    const n = parseInt(c.slice(1, 7), 16);
    return (hexCache[c] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }

  // ---------- помощники ----------
  // Крона дерева сверху: тень, крона, блик
  function treeTop(b, cx, cy, r, shadow) {
    if (shadow) b.ellipse(cx + 2, cy + r * 0.7, r, r * 0.55, shadow);
    b.rect(cx - 1, cy + r - 2, 2, 3, P.woodD);
    b.disc(cx, cy, r, P.leafD);
    b.disc(cx - r * 0.15, cy - r * 0.15, r * 0.78, P.leaf);
    b.disc(cx - r * 0.38, cy - r * 0.4, r * 0.34, P.leafL);
  }
  // Скатная крыша в 3/4: черепица рядами, конёк сверху, тень под свесом
  function roof3q(b, x, y, w, h, c, cd, cl) {
    b.rect(x, y, w, h, c);
    for (let j = 2; j < h - 1; j += 3) for (let i = ((j / 3) | 0) % 2 ? 2 : 0; i < w; i += 4) b.rect(x + i, y + j, 2, 1, cd);
    b.rect(x, y, w, 1, cl);
    b.rect(x, y + h - 1, w, 1, cd);
  }
  function wallPlanks(b, x, y, w, h, c, cd) {
    b.rect(x, y, w, h, c);
    for (let j = 2; j < h; j += 3) b.rect(x, y + j, w, 1, cd);
  }
  function wallBricks(b, x, y, w, h, c, cd) {
    b.rect(x, y, w, h, c);
    for (let j = 1; j < h; j += 3) for (let i = (j % 2) * 2; i < w; i += 5) b.px(x + i, y + j, cd);
  }
  function windowLit(b, x, y, w, h) { b.rect(x, y, w, h, P.glow); b.rect(x, y, w, 1, P.glowL); b.rect(x + Math.floor(w / 2), y, 1, h, P.woodD); }
  function crenels(b, x, y, w, c) { for (let i = 0; i < w; i += 3) b.rect(x + i, y, 2, 2, c); }
  function tierCols(t) {
    return [[P.iron, P.ironD, P.ironL], [P.bone, P.boneD, P.boneL], [P.mith, P.mithD, P.mithL], [P.red, P.redD, P.gold]][t] || [P.iron, P.ironD, P.ironL];
  }
  const GEM = [P.cry, P.red, P.mith, P.gold];

  const DEF = {};

  // ---------- ресурсы (12×12) ----------
  DEF.r_gold = { w: 12, h: 12, draw(b) { b.disc(6, 6, 5, P.goldD); b.disc(5.6, 5.6, 4.2, P.gold); b.rect(5, 4, 2, 4, P.goldD); b.px(3, 4, P.goldL); b.px(4, 3, P.goldL); } };
  DEF.r_wood = { w: 12, h: 12, draw(b) { b.rect(1, 4, 8, 5, P.wood); b.rect(1, 5, 8, 1, P.woodD); b.rect(2, 7, 6, 1, P.woodD); b.ellipse(9, 6.5, 2.2, 2.6, P.woodL); b.px(9, 6, P.woodD); } };
  DEF.r_stone = { w: 12, h: 12, draw(b) { b.poly([[1, 10.5], [1.5, 6], [4, 2.5], [8, 1.5], [10.5, 5], [10.5, 10.5]], P.stone); b.rect(4, 3, 4, 1, P.stoneL); b.rect(3, 4, 2, 2, P.stoneL); b.rect(2, 9, 8, 1, P.stoneD); b.px(8, 6, P.stoneD); b.px(6, 7, P.stoneD); } };
  // Железо — стальной брусок в три четверти с тёмным контуром, чтобы не путать с серым камнем
  DEF.r_iron = { w: 12, h: 12, draw(b) {
    b.poly([[1, 6.5], [4, 3.5], [11, 3.5], [8.5, 6.5]], '#b9cdee');
    b.poly([[1, 6.5], [8.5, 6.5], [8.5, 10.5], [1, 10.5]], '#6a80a8');
    b.poly([[8.5, 6.5], [11, 3.5], [11, 8], [8.5, 10.5]], '#3d4a6b');
    b.px(3, 5, P.white); b.px(4, 5, P.white); b.rect(2, 9, 6, 1, '#55698f');
    b.outline(P.k);
  } };
  DEF.i_stairs = { w: 12, h: 12, draw(b) { b.rect(1, 2, 10, 9, P.dark); b.rect(1, 9, 10, 2, P.stoneL); b.rect(3, 7, 8, 2, P.stoneM); b.rect(5, 5, 6, 2, P.stone); b.rect(7, 3, 4, 2, P.stoneD); } };
  DEF.r_mithril = { w: 12, h: 12, draw(b) { b.poly([[1, 10.5], [3.5, 4], [8.5, 4], [11, 10.5]], P.mith); b.rect(3, 4, 6, 2, P.mithL); b.rect(1, 9, 10, 1, P.mithD); b.px(8, 7, P.white); } };
  DEF.r_bone = { w: 12, h: 12, draw(b) { b.rect(3, 5, 6, 2, P.bone); b.disc(2.6, 4.6, 1.7, P.bone); b.disc(2.6, 7.4, 1.7, P.bone); b.disc(9.4, 4.6, 1.7, P.bone); b.disc(9.4, 7.4, 1.7, P.bone); b.rect(3, 6, 6, 1, P.boneD); } };
  DEF.r_crystal = { w: 12, h: 12, draw(b) { b.poly([[6, 1], [10.5, 5], [6, 11], [1.5, 5]], P.cry); b.poly([[6, 1], [6, 11], [1.5, 5]], P.cryD); b.px(7, 3, P.white); b.px(8, 4, P.white); } };

  // ---------- значки (12×12) ----------
  DEF.i_atk = { w: 12, h: 12, draw(b) { for (let i = 0; i < 6; i++) { b.px(5 + i, 6 - i, P.ironL); b.px(5 + i, 7 - i, P.iron); } b.line(3, 5, 6, 8, P.goldD); b.px(4, 8, P.woodD); b.px(3, 9, P.woodD); b.px(2, 10, P.gold); } };
  DEF.i_def = { w: 12, h: 12, draw(b) { b.poly([[2, 1.5], [10, 1.5], [10, 6], [6, 10.5], [2, 6]], P.blue); b.rect(5, 2, 2, 7, P.gold); b.rect(3, 4, 6, 2, P.gold); b.px(3, 2, P.blueL); } };
  DEF.i_shield2 = { w: 12, h: 12, draw(b) { b.poly([[2, 1.5], [10, 1.5], [10, 6], [6, 10.5], [2, 6]], P.redD); b.poly([[6, 2.5], [7.2, 5], [9.5, 5], [7.6, 6.5], [8.3, 9], [6, 7.6], [3.7, 9], [4.4, 6.5], [2.5, 5], [4.8, 5]], P.gold); } };
  DEF.i_hp = { w: 12, h: 12, draw(b) { b.disc(4, 4.5, 2.7, P.red); b.disc(8, 4.5, 2.7, P.red); b.poly([[1.4, 5], [10.6, 5], [6, 10.5]], P.red); b.px(3, 3, P.redL); b.px(3, 4, P.redL); } };
  DEF.i_heal = { w: 12, h: 12, draw(b) { b.rect(4, 1, 4, 10, P.green); b.rect(1, 4, 10, 4, P.green); b.rect(5, 2, 2, 8, P.greenL); b.rect(2, 5, 8, 2, P.greenL); } };
  DEF.i_crown = { w: 12, h: 12, draw(b) { b.rect(2, 6, 8, 4, P.gold); b.poly([[2, 6.5], [2, 2], [4.5, 6.5]], P.gold); b.poly([[4.5, 6.5], [6, 1.5], [7.5, 6.5]], P.gold); b.poly([[7.5, 6.5], [10, 2], [10, 6.5]], P.gold); b.rect(2, 9, 8, 1, P.goldD); b.px(6, 7, P.red); b.px(3, 7, P.cry); b.px(8, 7, P.cry); } };
  DEF.i_skull = { w: 12, h: 12, draw(b) { b.disc(6, 5, 4.2, P.bone); b.rect(4, 8, 4, 3, P.bone); b.rect(3, 4, 2, 2, P.k); b.rect(7, 4, 2, 2, P.k); b.px(5, 7, P.boneD); b.px(6, 7, P.boneD); b.px(5, 10, P.boneD); } };
  DEF.i_pick = { w: 12, h: 12, draw(b) { b.line(2, 10, 7, 5, P.wood); b.line(3, 10, 8, 5, P.woodD); b.poly([[3.5, 2], [7, 2.5], [10, 5], [10.5, 8.5], [9, 8], [8, 5.5], [6, 4], [3.5, 3.5]], P.stoneL); } };
  DEF.i_clock = { w: 12, h: 12, draw(b) { b.disc(6, 6, 5, P.stoneL); b.disc(6, 6, 4, P.white); b.line(6, 6, 6, 3, P.k); b.line(6, 6, 8, 7, P.k); } };
  DEF.i_helmet = { w: 12, h: 12, draw(b) { b.ellipse(6, 6, 4.5, 4.5, P.iron); b.rect(2, 6, 8, 4, P.iron); b.rect(3, 6, 6, 1, P.k); b.rect(5, 7, 2, 3, P.ironD); b.px(4, 3, P.ironL); b.px(5, 2, P.ironL); } };
  DEF.i_star = { w: 12, h: 12, draw(b) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 2.2 : 5; pts.push([6 + Math.cos(a) * r, 6.3 + Math.sin(a) * r]); } b.poly(pts, P.gold); b.px(5, 4, P.goldL); } };
  DEF.i_chest = { w: 12, h: 12, draw(b) { b.rect(1, 5, 10, 5, P.wood); b.rect(1, 3, 10, 3, P.woodL); b.rect(1, 5, 10, 1, P.woodD); b.rect(5, 5, 2, 2, P.gold); b.rect(3, 3, 1, 7, P.ironD); b.rect(8, 3, 1, 7, P.ironD); } };
  DEF.i_flag = { w: 12, h: 12, draw(b) { b.rect(3, 1, 1, 10, P.woodD); b.poly([[4, 1.5], [10, 3.5], [4, 6]], P.red); } };
  DEF.i_hammer = { w: 12, h: 12, draw(b) { b.line(2, 10, 7, 5, P.wood); b.line(3, 10, 8, 5, P.woodD); b.poly([[5, 3], [8, 0.5], [11, 3.5], [8.5, 6]], P.iron); b.px(8, 2, P.ironL); } };
  DEF.i_anvil = { w: 12, h: 12, draw(b) { b.rect(1, 3, 10, 2, P.iron); b.rect(1, 3, 10, 1, P.ironL); b.poly([[1, 3], [-1, 3], [1, 5]], P.iron); b.rect(4, 5, 4, 3, P.ironD); b.rect(2, 8, 8, 2, P.ironD); } };
  DEF.i_people = { w: 12, h: 12, draw(b) { b.disc(4, 3.5, 2, P.skin); b.rect(2, 6, 4, 4, P.blue); b.disc(8.5, 4, 2, P.skin); b.rect(6.5, 6.5, 4, 4, P.red); } };
  DEF.i_boot = { w: 12, h: 12, draw(b) { b.rect(3, 1, 4, 7, P.wood); b.rect(3, 7, 7, 3, P.wood); b.rect(3, 9, 7, 1, P.woodD); b.rect(3, 2, 4, 1, P.woodL); } };
  DEF.i_fire = { w: 12, h: 12, draw(b) { b.poly([[6, 0.5], [9.5, 5], [10, 8], [8, 10.8], [4, 10.8], [2, 8], [2.5, 5], [4, 6], [4.5, 3]], P.red); b.poly([[6, 3.5], [8, 7], [7.5, 10], [4.5, 10], [4, 7.5]], P.glow); b.rect(5, 8, 2, 2, P.glowL); } };
  DEF.i_coin = { w: 12, h: 12, draw(b) { b.ellipse(6, 9, 4.5, 1.6, P.goldD); b.ellipse(6, 7, 4.5, 1.6, P.gold); b.ellipse(6, 5, 4.5, 1.6, P.goldD); b.ellipse(6, 3, 4.5, 1.6, P.gold); b.px(4, 3, P.goldL); } };
  DEF.i_scale = { w: 12, h: 12, draw(b) { b.rect(5, 2, 1, 8, P.goldD); b.rect(1, 2, 10, 1, P.gold); b.rect(3, 10, 6, 1, P.goldD); b.ellipse(2.5, 6, 2, 1.2, P.gold); b.ellipse(9, 6, 2, 1.2, P.gold); b.line(1, 3, 1, 5, P.goldD); b.line(10, 3, 10, 5, P.goldD); } };
  DEF.i_bag = { w: 12, h: 12, draw(b) { b.ellipse(6, 7, 4.5, 4, P.dirtL); b.rect(4, 1, 4, 3, P.dirtL); b.rect(4, 3, 4, 1, P.woodD); b.px(4, 6, P.white); b.px(5, 5, P.white); } };
  DEF.i_book = { w: 12, h: 12, draw(b) { b.rect(2, 1, 8, 10, P.blue); b.rect(2, 1, 1, 10, P.blueD); b.rect(4, 3, 4, 1, P.gold); b.rect(9, 2, 1, 8, P.plaster); } };
  DEF.i_gem = { w: 12, h: 12, draw(b) { b.poly([[3, 1.5], [9, 1.5], [11, 4.5], [6, 10.5], [1, 4.5]], P.purple); b.poly([[1, 4.5], [11, 4.5], [6, 10.5]], P.purpleD); b.px(4, 3, P.purpleL); b.px(5, 3, P.white); } };
  DEF.i_map = { w: 12, h: 12, draw(b) { b.rect(1, 2, 10, 8, P.plaster); b.rect(1, 2, 10, 1, P.plasterD); b.line(2, 8, 5, 5, P.red); b.line(5, 5, 8, 6, P.red); b.px(9, 4, P.red); b.px(8, 3, P.red); b.px(10, 3, P.red); b.rect(4, 7, 2, 1, P.leaf); } };
  DEF.i_dragon = { w: 12, h: 12, draw(b) { b.poly([[2, 9], [3, 4], [6, 2], [9, 3], [11, 6], [9, 7], [7, 6], [6, 9]], P.red); b.poly([[3, 4], [1, 1], [4, 3]], P.redD); b.poly([[6, 2], [6, 0], [7.5, 2]], P.redD); b.px(7, 4, P.gold); b.rect(9, 5, 2, 1, P.glowL); } };
  DEF.i_lock = { w: 12, h: 12, draw(b) { b.rect(2, 5, 8, 6, P.gold); b.rect(3, 2, 1, 3, P.iron); b.rect(8, 2, 1, 3, P.iron); b.rect(3, 1, 6, 1, P.iron); b.rect(5, 7, 2, 2, P.goldD); } };
  DEF.i_check = { w: 12, h: 12, draw(b) { b.line(2, 6, 4, 8, P.greenL); b.line(2, 7, 4, 9, P.green); b.line(4, 8, 9, 3, P.greenL); b.line(4, 9, 10, 3, P.green); } };
  DEF.i_x = { w: 12, h: 12, draw(b) { b.line(2, 2, 9, 9, P.redL); b.line(3, 2, 10, 9, P.red); b.line(9, 2, 2, 9, P.redL); b.line(10, 2, 3, 9, P.red); } };
  DEF.i_up = { w: 12, h: 12, draw(b) { b.poly([[6, 1], [11, 6.5], [8, 6.5], [8, 10.5], [4, 10.5], [4, 6.5], [1, 6.5]], P.green); b.rect(5, 6, 2, 4, P.greenL); } };
  DEF.i_snd = { w: 12, h: 12, draw(b) { b.rect(1, 4, 3, 4, P.stoneL); b.poly([[3, 4], [7, 1], [7, 11], [3, 8]], P.stoneL); b.line(9, 3, 10, 5, P.white); b.line(10, 6, 9, 8, P.white); } };
  DEF.i_mute = { w: 12, h: 12, draw(b) { b.rect(1, 4, 3, 4, P.stoneD); b.poly([[3, 4], [7, 1], [7, 11], [3, 8]], P.stoneD); b.line(8, 4, 11, 7, P.red); b.line(11, 4, 8, 7, P.red); } };
  DEF.i_scroll = { w: 12, h: 12, draw(b) { b.rect(2, 2, 8, 8, P.plaster); b.rect(1, 1, 10, 2, P.plasterD); b.rect(1, 9, 10, 2, P.plasterD); b.rect(3, 4, 6, 1, P.woodD); b.rect(3, 6, 5, 1, P.woodD); b.px(8, 8, P.red); } };
  DEF.i_tower = { w: 12, h: 12, draw(b) { b.rect(3, 3, 6, 8, P.stone); crenels(b, 3, 1, 7, P.stone); b.rect(5, 7, 2, 4, P.woodD); b.rect(5, 4, 2, 1, P.dark); } };

  // ---------- предметы (16×16), аргумент — тир ----------
  DEF.it_sword = { w: 16, h: 16, draw(b, t) { const [m, d, l] = tierCols(+t); for (let i = 0; i < 8; i++) { b.px(5 + i, 10 - i, l); b.px(6 + i, 10 - i, m); b.px(6 + i, 11 - i, d); } b.line(3, 9, 7, 13, P.gold); b.px(7, 13, P.goldD); b.px(4, 12, P.woodD); b.px(3, 13, P.woodD); b.px(2, 14, P.gold); } };
  DEF.it_bow = { w: 16, h: 16, draw(b, t) { const [m] = tierCols(+t); for (let y = 1; y <= 14; y++) { const s = Math.sin((Math.PI * (y - 1)) / 13); const x = Math.round(10 - 6 * s); b.px(x, y, P.woodD); b.px(x + 1, y, P.wood); } b.rect(12, 1, 1, 14, '#e8e8e8'); b.rect(4, 6, 2, 4, m); b.px(10, 1, m); b.px(10, 14, m); } };
  DEF.it_staff = { w: 16, h: 16, draw(b, t) { const [m] = tierCols(+t); b.line(3, 14, 10, 7, P.woodD); b.line(4, 14, 11, 7, P.wood); b.px(9, 6, m); b.px(13, 6, m); b.px(10, 7, m); b.px(12, 7, m); b.disc(11.5, 4, 2.6, GEM[+t] || P.cry); b.px(11, 3, P.white); } };
  DEF.it_mace = { w: 16, h: 16, draw(b, t) { const [m, d, l] = tierCols(+t); b.line(2, 14, 8, 8, P.woodD); b.line(3, 14, 9, 8, P.wood); b.disc(10.5, 5.5, 3.3, m); b.px(10, 1, d); b.px(14, 5, d); b.px(6, 6, d); b.px(13, 2, d); b.px(7, 2, d); b.px(13, 8, d); b.px(9, 4, l); b.px(10, 4, l); } };
  DEF.it_armor = { w: 16, h: 16, draw(b, t) { const [m, d, l] = tierCols(+t); b.poly([[2, 3], [5.5, 2], [10.5, 2], [14, 3], [14, 7], [12, 7.5], [12, 14], [4, 14], [4, 7.5], [2, 7]], m); b.rect(8, 4, 1, 9, d); b.rect(4, 11, 8, 1, P.woodD); b.rect(7, 11, 2, 1, P.gold); b.px(5, 4, l); b.px(5, 5, l); b.px(3, 4, l); for (let x = 6; x < 10; x++) b.px(x, 2, null); b.px(7, 3, null); b.px(8, 3, null); } };

  // ---------- классы (16×16) ----------
  DEF.c_warrior = { w: 16, h: 16, draw(b) {
    b.rect(5, 12, 2, 3, P.woodD); b.rect(9, 12, 2, 3, P.woodD);
    b.rect(4, 7, 8, 6, P.iron); b.rect(4, 7, 8, 1, P.ironL); b.rect(7, 8, 2, 4, P.red);
    b.disc(8, 4.5, 2.8, P.skin); b.rect(5, 1, 6, 3, P.iron); b.rect(5, 1, 6, 1, P.ironL); b.rect(7, 3, 2, 2, P.ironD);
    b.px(6, 4, P.k); b.px(9, 4, P.k);
    b.rect(13, 2, 1, 8, P.ironL); b.rect(12, 9, 3, 1, P.gold); b.px(13, 10, P.woodD); b.px(13, 11, P.woodD);
    b.rect(1, 7, 3, 5, P.blue); b.px(2, 9, P.gold);
  } };
  DEF.c_archer = { w: 16, h: 16, draw(b) {
    b.rect(5, 12, 2, 3, P.woodD); b.rect(9, 12, 2, 3, P.woodD);
    b.rect(4, 7, 8, 6, P.leaf); b.rect(4, 10, 8, 1, P.woodD);
    b.rect(12, 4, 2, 7, P.woodD); b.px(12, 3, P.red); b.px(13, 3, P.red);
    b.disc(8, 4.5, 3.4, P.leafD); b.disc(8, 5.2, 2.2, P.skin); b.px(7, 5, P.k); b.px(9, 5, P.k);
    for (let y = 3; y <= 13; y++) { const s = Math.sin((Math.PI * (y - 3)) / 10); b.px(Math.round(3 - 2 * s), y, P.wood); }
    b.rect(3, 3, 1, 11, '#e8e8e8');
  } };
  DEF.c_mage = { w: 16, h: 16, draw(b) {
    b.poly([[4, 7], [12, 7], [13, 14.5], [3, 14.5]], P.purple); b.rect(7, 8, 2, 7, P.purpleD);
    b.disc(8, 5.5, 2.5, P.skin); b.poly([[6, 6.5], [10, 6.5], [8, 10.5]], P.white); b.px(7, 5, P.k); b.px(9, 5, P.k);
    b.rect(4, 3, 9, 1, P.purpleD); b.poly([[5.5, 3.5], [10.5, 3.5], [9.5, 0.2]], P.purple); b.px(8, 2, P.gold);
    b.rect(13, 3, 1, 12, P.wood); b.disc(13.5, 2.5, 1.6, P.cry);
  } };
  DEF.c_priest = { w: 16, h: 16, draw(b) {
    b.poly([[4, 7], [12, 7], [13, 14.5], [3, 14.5]], P.robe); b.rect(7, 7, 2, 8, P.gold);
    b.disc(8, 4.2, 3.3, P.robeD); b.disc(8, 4.8, 2.3, P.skin); b.px(7, 5, P.k); b.px(9, 5, P.k);
    b.rect(13, 6, 1, 8, P.wood); b.disc(13.5, 4.5, 1.7, P.gold);
  } };
  DEF.c_king = { w: 16, h: 16, draw(b) {
    b.poly([[3, 7], [13, 7], [14, 14.5], [2, 14.5]], P.red); b.rect(3, 7, 10, 2, P.robe); b.rect(7, 9, 2, 6, P.gold);
    b.disc(8, 4.8, 2.6, P.skin); b.poly([[6, 6], [10, 6], [8, 9]], P.boneD); b.px(7, 5, P.k); b.px(9, 5, P.k);
    b.rect(5, 1, 6, 2, P.gold); b.px(5, 0, P.gold); b.px(8, 0, P.gold); b.px(10, 0, P.gold); b.px(7, 1, P.red);
  } };
  DEF.guard = { w: 10, h: 13, draw(b) { b.rect(3, 6, 4, 4, P.red); b.disc(5, 3.8, 2, P.skin); b.rect(3, 1, 4, 2, P.iron); b.rect(3, 10, 1, 2, P.woodD); b.rect(6, 10, 1, 2, P.woodD); b.line(8, 2, 8, 10, P.wood); } };

  // ---------- советники (16×16) ----------
  DEF.adv_treasurer = { w: 16, h: 16, draw(b) { b.poly([[4, 7], [12, 7], [13, 14.5], [3, 14.5]], P.greenD); b.disc(8, 4.6, 2.6, P.skin); b.rect(5, 1, 6, 2, P.greenD); b.px(7, 5, P.k); b.px(9, 5, P.k); b.disc(12, 11, 2.5, P.gold); b.px(11, 10, P.goldL); } };
  DEF.adv_marshal = { w: 16, h: 16, draw(b) { b.rect(4, 7, 8, 7, P.blueD); b.rect(4, 7, 8, 2, P.gold); b.disc(8, 4.6, 2.6, P.skin); b.rect(5, 1, 6, 3, P.iron); b.poly([[8, 0], [10, 1], [8, 2]], P.red); b.px(7, 5, P.k); b.px(9, 5, P.k); b.rect(13, 3, 1, 10, P.ironL); } };
  DEF.adv_builder = { w: 16, h: 16, draw(b) { b.rect(4, 7, 8, 7, P.wood); b.rect(4, 10, 8, 1, P.woodD); b.disc(8, 4.6, 2.6, P.skin); b.rect(5, 1, 6, 2, P.glow); b.px(7, 5, P.k); b.px(9, 5, P.k); b.line(11, 13, 14, 8, P.woodD); b.rect(12, 6, 4, 2, P.iron); } };
  DEF.adv_magister = { w: 16, h: 16, draw(b) { b.poly([[4, 7], [12, 7], [13, 14.5], [3, 14.5]], P.blueD); b.rect(7, 7, 2, 8, P.purpleL); b.disc(8, 5, 2.5, P.skin); b.poly([[6, 6.5], [10, 6.5], [8, 11]], P.white); b.rect(4, 3, 9, 1, P.blueD); b.poly([[5.5, 3.5], [10.5, 3.5], [8, 0.2]], P.blue); b.px(7, 5, P.k); b.px(9, 5, P.k); b.rect(1, 9, 3, 4, P.purple); } };

  // ---------- монстры (смотрят влево) ----------
  DEF.m_slime = { w: 16, h: 12, draw(b) { b.ellipse(8, 7.5, 6.5, 3.8, P.green); b.ellipse(8, 9, 6.5, 2.2, P.green); b.rect(3, 10, 10, 1, P.greenD); b.px(9, 5, P.greenL); b.px(10, 5, P.greenL); b.px(11, 6, P.greenL); b.rect(4, 7, 1, 2, P.k); b.rect(7, 7, 1, 2, P.k); } };
  DEF.m_goblin = { w: 14, h: 16, draw(b) {
    b.rect(5, 12, 2, 3, P.gobD); b.rect(8, 12, 2, 3, P.gobD);
    b.rect(4, 8, 7, 5, P.woodD); b.rect(4, 8, 7, 1, P.wood);
    b.disc(7, 5, 3, P.gob); b.poly([[4, 4], [1, 2.5], [4.5, 6]], P.gob); b.poly([[10, 4], [13, 2.5], [9.5, 6]], P.gob);
    b.px(5, 5, P.red); b.px(7, 5, P.red); b.px(5, 7, P.k); b.px(6, 7, P.white);
    b.line(2, 8, 3, 12, P.ironL);
  } };
  DEF.m_wolf = { w: 20, h: 14, draw(b) {
    b.ellipse(11, 7.5, 6.5, 3, P.stone); b.rect(6, 9, 10, 1, P.stoneL);
    b.ellipse(4.5, 5.5, 3, 2.5, P.stone); b.rect(1, 6, 3, 2, P.stone); b.px(1, 6, P.k);
    b.poly([[3.5, 4], [4.5, 1.5], [6, 4]], P.stoneD); b.poly([[5.5, 4], [7, 2], [8, 4.5]], P.stoneD);
    b.px(4, 5, '#ffd84a');
    b.rect(6, 10, 2, 3, P.stoneD); b.rect(9, 10, 2, 3, P.stoneD); b.rect(13, 10, 2, 3, P.stoneD); b.rect(15, 10, 2, 2, P.stoneD);
    b.line(17, 7, 18, 4, P.stone);
  } };
  DEF.m_skeleton = { w: 14, h: 16, draw(b) {
    b.disc(7, 3.8, 2.8, P.bone); b.rect(5, 6, 4, 1, P.bone); b.px(5, 3, P.k); b.px(8, 3, P.k);
    b.rect(7, 7, 1, 5, P.bone); b.rect(5, 8, 5, 1, P.bone); b.rect(5, 10, 5, 1, P.bone); b.rect(5, 12, 5, 1, P.bone);
    b.line(6, 13, 5, 14, P.bone); b.line(9, 13, 10, 14, P.bone);
    b.line(5, 8, 3, 11, P.bone); b.line(9, 8, 11, 11, P.bone); b.line(1, 7, 3, 11, P.ironL);
  } };
  DEF.m_orc = { w: 20, h: 18, draw(b) {
    b.rect(7, 14, 3, 3, P.woodD); b.rect(11, 14, 3, 3, P.woodD);
    b.rect(6, 8, 10, 7, P.orc); b.rect(6, 10, 10, 3, P.woodD); b.rect(6, 10, 10, 1, P.wood);
    b.disc(10, 5, 3.5, P.orc); b.rect(7, 6, 6, 2, P.orc); b.px(7, 8, P.white); b.px(11, 8, P.white);
    b.px(8, 4, P.red); b.px(11, 4, P.red);
    b.line(4, 3, 4, 15, P.wood); b.poly([[4, 3], [1, 4.5], [1, 8], [4, 9]], P.ironL); b.px(2, 6, P.ironD);
    b.rect(16, 9, 2, 4, P.orc);
  } };
  DEF.m_spider = { w: 18, h: 12, draw(b) {
    const c = '#3a2a44';
    b.line(9, 6, 5, 2, c); b.line(10, 6, 8, 1, c); b.line(12, 6, 13, 1, c); b.line(13, 6, 16, 2, c);
    b.line(9, 7, 4, 10, c); b.line(10, 7, 7, 10, c); b.line(12, 7, 13, 10, c); b.line(13, 7, 16, 10, c);
    b.ellipse(11.5, 6, 4, 3, c); b.disc(6, 6.5, 2.2, c);
    b.px(5, 6, P.red); b.px(6, 5, P.red); b.px(12, 5, P.purpleL); b.px(13, 6, P.purpleL);
  } };
  DEF.m_bat = { w: 18, h: 12, draw(b) {
    const c = '#4a2f5a', cd = '#2f1d3a';
    b.poly([[8, 5], [1, 1], [2, 4], [0.5, 6], [3, 6], [4, 9]], c); b.poly([[10, 5], [17, 1], [16, 4], [17.5, 6], [15, 6], [14, 9]], c);
    b.ellipse(9, 6, 2.6, 3.2, cd); b.px(8, 5, P.red); b.px(10, 5, P.red); b.px(8, 2, cd); b.px(10, 2, cd);
  } };
  DEF.m_drowned = { w: 14, h: 16, draw(b) {
    b.rect(5, 12, 2, 3, P.tealD); b.rect(8, 12, 2, 3, P.tealD);
    b.rect(4, 7, 7, 6, '#5a6b4a'); b.rect(4, 9, 7, 1, '#3f4d33');
    b.disc(7, 4.5, 2.8, P.teal); b.px(5, 4, P.ghost); b.px(8, 4, P.ghost); b.rect(5, 6, 3, 1, P.tealD);
    b.line(3, 8, 1, 12, P.teal); b.line(11, 8, 12, 11, P.teal); b.px(4, 2, P.leaf); b.px(9, 1, P.leaf); b.px(10, 2, P.leaf);
  } };
  DEF.m_golem = { w: 22, h: 24, draw(b, t) {
    const c = t === 'r' ? '#7a3a2a' : P.stoneD, cl = t === 'r' ? '#a85a3a' : P.stone, crack = t === 'r' ? P.glow : P.cry;
    b.rect(6, 18, 4, 5, c); b.rect(12, 18, 4, 5, c);
    b.poly([[4, 8], [18, 8], [19, 18], [3, 18]], cl); b.rect(4, 8, 14, 2, c);
    b.disc(11, 5, 4, cl); b.px(9, 5, crack); b.px(12, 5, crack);
    b.rect(0, 9, 4, 9, c); b.rect(18, 9, 4, 9, c);
    b.line(8, 11, 10, 15, crack); b.line(13, 12, 14, 16, crack);
  } };
  DEF.m_troll = { w: 28, h: 28, draw(b) {
    b.rect(8, 22, 4, 4, P.trollD); b.rect(16, 22, 4, 4, P.trollD);
    b.ellipse(14, 16, 8, 7, P.troll); b.ellipse(14, 18, 5, 4, P.trollL);
    b.ellipse(5, 15, 2.5, 5, P.troll); b.ellipse(23, 15, 2.5, 5, P.troll);
    b.disc(12, 7, 4.5, P.troll); b.px(10, 6, P.gold); b.px(13, 6, P.gold); b.rect(9, 8, 2, 2, P.trollD);
    b.px(10, 11, P.white); b.px(14, 11, P.white);
    b.poly([[1, 3], [5, 2], [6, 13], [3, 13]], P.wood); b.px(2, 5, P.ironL); b.px(4, 8, P.ironL);
  } };
  DEF.m_lich = { w: 20, h: 24, draw(b) {
    b.poly([[6, 9], [15, 9], [17, 22.5], [4, 22.5]], P.night); b.rect(5, 21, 12, 1, P.purple);
    b.disc(10.5, 6, 4, P.night); b.disc(10.5, 6.5, 2.6, P.bone); b.px(9, 6, P.ghost); b.px(11, 6, P.ghost);
    b.rect(8, 1, 6, 2, P.gold); b.px(8, 0, P.gold); b.px(10, 0, P.gold); b.px(13, 0, P.gold);
    b.rect(3, 4, 1, 18, P.woodD); b.disc(3.5, 3, 1.8, P.ghost);
  } };
  DEF.m_dragon = { w: 52, h: 38, draw(b) {
    const c = P.red, cd = P.redD, cl = P.redL;
    b.poly([[20, 16], [34, 2], [44, 1], [38, 8], [48, 6], [40, 14], [30, 20]], cd);
    b.poly([[22, 16], [33, 5], [41, 4], [36, 10], [44, 9], [36, 15]], c);
    b.poly([[40, 24], [50, 20], [51, 25], [45, 26]], c);
    b.ellipse(30, 25, 12, 7, c); b.ellipse(30, 28, 9, 3.5, P.glowL);
    b.poly([[20, 22], [12, 12], [8, 13], [16, 25]], c);
    b.ellipse(8, 12, 6, 4, c); b.poly([[2, 12], [-1, 14], [4, 15]], c); b.rect(1, 13, 5, 1, cd);
    b.poly([[8, 8], [11, 3], [11, 9]], P.boneD); b.poly([[5, 9], [6, 4], [8, 9]], P.boneD);
    b.px(6, 11, P.gold); b.px(7, 11, P.gold);
    b.rect(22, 30, 4, 6, cd); b.rect(34, 30, 4, 6, cd); b.px(21, 35, P.boneL); b.px(33, 35, P.boneL);
    b.line(26, 18, 34, 18, cl);
  } };

  // ---------- здания 3/4 (48×48), аргумент — облик 1..3 ----------
  DEF.b_lumber = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    treeTop(b, 7, 14, 6); treeTop(b, 41, 12, 6);
    if (t >= 3) treeTop(b, 40, 27, 5);
    roof3q(b, 11, 12, 24, 12, P.woodM, P.woodD, P.woodL);
    wallPlanks(b, 12, 24, 22, 14, P.wood, P.woodD);
    b.rect(20, 29, 6, 9, P.woodD); b.px(24, 33, P.gold);
    windowLit(b, 14, 27, 4, 3); windowLit(b, 28, 27, 4, 3);
    for (const [x, y] of [[5, 41], [9, 41], [7, 38]]) { b.disc(x, y, 2.2, P.woodL); b.px(x - 0.5, y - 0.5, P.woodD); }
    if (t >= 2) for (const [x, y] of [[13, 42], [11, 39]]) { b.disc(x, y, 2.2, P.woodL); b.px(x - 0.5, y - 0.5, P.woodD); }
    b.rect(37, 38, 7, 5, P.wood); b.rect(37, 37, 7, 2, P.woodL); b.line(40, 32, 40, 37, P.woodD); b.rect(38, 31, 4, 2, P.ironL);
    if (t >= 2) { b.disc(37, 20, 3, P.ironL); b.px(37, 20, P.ironD); }
  } };
  DEF.b_quarry = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    b.poly([[2, 40], [4, 22], [12, 10], [24, 8], [34, 12], [40, 22], [44, 40]], P.stoneD);
    b.poly([[6, 26], [13, 13], [24, 11], [30, 14], [22, 20], [12, 28]], P.stone);
    b.poly([[13, 13], [24, 11], [20, 15]], P.stoneL);
    b.rect(14, 28, 20, 12, P.dirtD); b.rect(14, 28, 20, 1, P.dirt);
    b.rect(16, 32, 7, 6, P.stoneM); b.rect(16, 32, 7, 1, P.stoneL); b.rect(25, 33, 6, 5, P.stoneM); b.rect(25, 33, 6, 1, P.stoneL);
    b.line(7, 44, 12, 37, P.wood); b.poly([[9, 36], [12, 35.5], [15, 38], [14, 39], [12, 37.5], [10, 38]], P.ironL);
    if (t >= 2) { b.rect(38, 6, 2, 30, P.wood); b.rect(28, 6, 12, 2, P.wood); b.line(31, 8, 38, 14, P.woodD); b.rect(30, 8, 1, 10, P.dark); b.rect(28, 18, 5, 4, P.stoneM); }
    if (t >= 3) { b.rect(36, 38, 9, 5, P.woodD); b.rect(37, 36, 7, 2, P.stoneL); b.px(37, 43, P.dark); b.px(43, 43, P.dark); }
  } };
  DEF.b_mine = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    b.ellipse(24, 30, 22, 17, P.stoneD); b.ellipse(16, 22, 8, 5, P.stone); b.ellipse(24, 15, 12, 3, P.leafD); b.ellipse(22, 14, 7, 2, P.leaf);
    b.rect(17, 26, 14, 16, P.black); b.ellipse(24, 26, 7, 5, P.black);
    b.rect(15, 23, 2, 19, P.wood); b.rect(31, 23, 2, 19, P.wood); b.rect(14, 21, 20, 3, P.woodL); b.rect(14, 23, 20, 1, P.woodD);
    b.rect(18, 42, 12, 1, P.ironD); b.rect(18, 44, 12, 1, P.ironD); for (let x = 18; x < 30; x += 3) b.rect(x, 42, 1, 3, P.woodD);
    b.rect(34, 36, 10, 6, P.ironD); b.rect(34, 36, 10, 1, P.iron); b.rect(35, 33, 8, 3, P.rust); b.px(36, 42, P.dark); b.px(42, 42, P.dark);
    if (t >= 2) { b.rect(23, 17, 2, 3, P.glow); b.px(23, 16, P.woodD); b.px(24, 16, P.woodD); }
    if (t >= 3) { b.px(37, 33, P.gold); b.px(40, 33, P.gold); b.rect(4, 36, 8, 5, P.ironD); b.rect(5, 34, 6, 2, P.rust); }
  } };
  DEF.b_warehouse = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    roof3q(b, 5, 8, 38, 16, P.roof, P.roofD, P.roofL);
    b.rect(23, 8, 2, 16, P.roofD);
    b.rect(6, 24, 36, 16, P.wood); for (let x = 8; x < 42; x += 4) b.rect(x, 24, 1, 16, P.woodD);
    b.rect(17, 27, 14, 13, P.woodD); b.line(17, 27, 30, 39, P.woodL); b.line(30, 27, 17, 39, P.woodL); b.rect(23, 27, 1, 13, P.k);
    b.rect(1, 34, 6, 6, P.woodL); b.rect(1, 34, 6, 1, P.wood); b.line(1, 34, 6, 39, P.woodD);
    b.rect(41, 34, 6, 6, P.woodL); b.rect(41, 34, 6, 1, P.wood); b.line(46, 34, 41, 39, P.woodD);
    if (t >= 2) { b.rect(2, 29, 5, 5, P.woodL); b.line(2, 29, 6, 33, P.woodD); b.ellipse(44, 31, 3, 3, P.dirtL); b.rect(43, 28, 2, 1, P.woodD); }
    if (t >= 3) { b.rect(22, 2, 1, 7, P.woodD); b.poly([[23, 2], [29, 3.5], [23, 5]], P.blue); b.rect(9, 26, 6, 4, P.glow); b.rect(33, 26, 6, 4, P.glow); }
  } };
  DEF.b_market = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    const stall = (x, y, c1, c2, goods) => {
      b.rect(x + 1, y + 8, 1, 10, P.woodD); b.rect(x + 14, y + 8, 1, 10, P.woodD);
      b.rect(x + 1, y + 14, 14, 4, P.wood); b.rect(x + 1, y + 14, 14, 1, P.woodL);
      for (let i = 0; i < 4; i++) b.px(x + 3 + i * 3, y + 13, goods[i % goods.length]);
      b.rect(x, y, 16, 8, c1); for (let i = 0; i < 16; i += 4) b.rect(x + i, y, 2, 8, c2);
      for (let i = 0; i < 16; i += 4) b.rect(x + i, y + 8, 2, 1, c1);
    };
    stall(3, 14, P.red, P.white, [P.red, P.gold, P.green]);
    stall(29, 14, P.blue, P.white, [P.cry, P.purple, P.bone]);
    if (t >= 2) stall(16, 4, P.green, P.white, [P.gold, P.wood]);
    b.rect(20, 34, 8, 6, P.wood); b.rect(20, 34, 8, 1, P.woodL); b.disc(24, 31, 3, P.gold); b.px(23, 30, P.goldL);
    b.rect(6, 38, 5, 6, P.woodD); b.rect(6, 39, 5, 1, P.ironD); b.rect(37, 38, 5, 6, P.woodD); b.rect(37, 39, 5, 1, P.ironD);
    if (t >= 3) { b.rect(23, 0, 1, 6, P.woodD); b.poly([[24, 0], [30, 1.5], [24, 3]], P.gold); }
  } };
  DEF.b_forge = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    b.rect(32, 4, 6, 12, P.stone); b.rect(31, 3, 8, 2, P.stoneD); b.rect(33, 5, 4, 1, P.glow);
    if (t >= 3) { b.px(34, 1, P.glow); b.px(36, 0, P.glowL); b.px(33, 0, P.glow); }
    roof3q(b, 4, 12, 36, 12, P.slate, P.slateD, P.slateL);
    wallBricks(b, 5, 24, 34, 16, P.stoneD, P.stone);
    b.rect(9, 28, 9, 7, P.glow); b.rect(10, 29, 7, 5, P.glowL); b.rect(13, 28, 1, 7, P.woodD);
    b.rect(24, 28, 9, 12, P.woodD); b.rect(24, 28, 9, 1, P.k); b.px(31, 34, P.gold);
    b.rect(38, 36, 9, 2, P.iron); b.rect(38, 36, 9, 1, P.ironL); b.rect(40, 38, 5, 4, P.ironD); b.rect(39, 42, 7, 1, P.ironD);
    if (t >= 2) { b.line(41, 31, 44, 35, P.wood); b.rect(40, 30, 3, 2, P.ironL); b.rect(1, 34, 4, 6, P.woodD); b.rect(1, 35, 4, 1, P.ironD); }
  } };
  DEF.b_tavern = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    if (t >= 2) { b.rect(34, 2, 4, 8, P.stone); b.rect(33, 1, 6, 2, P.stoneD); }
    roof3q(b, 4, 6, 40, 12, P.roof, P.roofD, P.roofL);
    b.rect(6, 18, 36, 10, P.plaster); for (const x of [6, 15, 24, 33, 41]) b.rect(x, 18, 1, 10, P.woodD); b.rect(6, 27, 36, 1, P.woodD);
    windowLit(b, 9, 20, 4, 4); windowLit(b, 27, 20, 4, 4); windowLit(b, 35, 20, 4, 4);
    wallPlanks(b, 6, 28, 36, 13, P.wood, P.woodD);
    windowLit(b, 9, 31, 5, 4); windowLit(b, 33, 31, 5, 4);
    b.rect(20, 31, 8, 10, P.woodD); b.px(26, 36, P.gold);
    b.rect(18, 19, 1, 6, P.woodD); b.rect(16, 24, 7, 5, P.woodL); b.rect(18, 25, 3, 3, P.gold); b.px(21, 26, P.goldD);
    b.rect(42, 36, 5, 6, P.woodD); b.rect(42, 37, 5, 1, P.ironD); b.rect(42, 40, 5, 1, P.ironD);
    if (t >= 3) { b.px(5, 18, P.glowL); b.px(42, 18, P.glowL); b.rect(1, 36, 5, 6, P.woodD); b.rect(1, 37, 5, 1, P.ironD); }
  } };
  DEF.b_barracks = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    roof3q(b, 3, 10, 34, 12, P.roofD, '#5a1f1b', P.roof);
    wallBricks(b, 4, 22, 32, 18, P.stone, P.stoneD);
    b.rect(16, 29, 8, 11, P.woodD); b.rect(8, 26, 3, 4, P.dark); b.rect(29, 26, 3, 4, P.dark);
    b.rect(41, 4, 1, 36, P.woodD); b.rect(42, 5, 5, 10, P.red); b.poly([[42, 14.5], [47, 14.5], [44.5, 17]], P.red); b.rect(43, 8, 3, 3, P.gold);
    b.rect(38, 35, 1, 8, P.wood); b.rect(36, 37, 5, 1, P.wood); b.disc(38.5, 33, 2, P.dirtL);
    if (t >= 2) { b.disc(12, 24.5, 1.8, P.blue); b.disc(28, 24.5, 1.8, P.blue); b.line(1, 32, 1, 43, P.wood); b.px(1, 31, P.ironL); b.line(3, 33, 3, 43, P.wood); b.px(3, 32, P.ironL); }
    if (t >= 3) { b.rect(4, 22, 32, 1, P.gold); b.poly([[26, 44], [30, 36], [34, 44]], P.plaster); }
  } };
  DEF.b_academy = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    if (t >= 2) { b.rect(19, 1, 10, 12, P.plaster); b.rect(19, 1, 10, 1, P.white); windowLit(b, 22, 5, 4, 4); }
    b.ellipse(24, 14, 10, 6, t >= 3 ? P.gold : P.teal); b.ellipse(22, 12, 5, 3, t >= 3 ? P.goldL : P.tealL);
    roof3q(b, 4, 14, 40, 10, P.teal, P.tealD, P.tealL);
    b.rect(5, 24, 38, 16, P.plaster); b.rect(5, 24, 38, 1, P.plasterD);
    for (const x of [8, 15, 30, 37]) { b.rect(x, 25, 3, 14, P.white); b.rect(x, 25, 3, 1, P.plasterD); }
    b.rect(20, 28, 8, 12, P.blueD); b.ellipse(24, 28, 4, 2, P.blueD); b.rect(23, 30, 2, 3, P.gold);
    b.rect(3, 40, 42, 2, P.stoneM); b.rect(5, 42, 38, 2, P.stone);
    if (t >= 3) { b.px(24, 7, P.white); b.rect(41, 8, 1, 6, P.woodD); b.poly([[42, 8], [47, 9.5], [42, 11]], P.purple); }
  } };
  DEF.b_castle = { w: 64, h: 64, draw(b, t) {
    t = +t || 1;
    // задняя стена с зубцами
    wallBricks(b, 8, 16, 48, 14, P.stone, P.stoneD); crenels(b, 8, 14, 48, P.stone);
    // главная башня (донжон)
    wallBricks(b, 22, 10, 20, 32, P.stoneM, P.stone);
    b.poly([[20, 11], [32, -1 + (t >= 3 ? 0 : 3)], [44, 11]], P.blue); b.poly([[32, -1 + (t >= 3 ? 0 : 3)], [44, 11], [32, 11]], P.blueD);
    if (t >= 3) { b.px(32, 0, P.gold); b.px(32, 1, P.gold); }
    windowLit(b, 30, 16, 4, 5);
    // угловые башни
    for (const x of [4, 48]) {
      wallBricks(b, x, 22, 12, 34, P.stone, P.stoneD);
      crenels(b, x, 20, 12, P.stone);
      b.poly([[x - 1, 21], [x + 6, 9], [x + 13, 21]], P.blue); b.poly([[x + 6, 9], [x + 13, 21], [x + 6, 21]], P.blueD);
      b.rect(x + 5, 30, 2, 4, P.dark);
    }
    // передняя стена
    wallBricks(b, 15, 36, 34, 20, P.stoneM, P.stone); crenels(b, 15, 34, 34, P.stoneM);
    b.rect(26, 42, 12, 14, P.woodD); b.ellipse(32, 42, 6, 3, P.woodD); for (let x = 28; x < 37; x += 3) b.rect(x, 40, 1, 16, P.wood);
    b.px(36, 49, P.gold);
    windowLit(b, 18, 42, 3, 4); windowLit(b, 43, 42, 3, 4);
    if (t >= 2) {
      b.rect(10, 4, 1, 6, P.woodD); b.poly([[11, 4], [16, 5.5], [11, 7]], P.red);
      b.rect(54, 4, 1, 6, P.woodD); b.poly([[55, 4], [60, 5.5], [55, 7]], P.red);
      b.rect(19, 46, 3, 7, P.red); b.px(20, 48, P.gold); b.rect(42, 46, 3, 7, P.red); b.px(43, 48, P.gold);
    }
    if (t >= 3) { b.rect(15, 36, 34, 1, P.gold); b.rect(22, 10, 20, 1, P.gold); }
  } };
  DEF.b_gate = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    if (t === 1) {
      for (const x of [2, 36]) {
        b.rect(x, 10, 10, 34, P.wood); for (let i = x + 2; i < x + 10; i += 3) b.rect(i, 10, 1, 34, P.woodD);
        for (let i = x; i < x + 10; i += 3) b.poly([[i, 10], [i + 1.5, 6], [i + 3, 10]], P.woodL);
        b.rect(x, 8, 10, 2, P.woodM); b.rect(x + 4, 18, 2, 4, P.black);
      }
      b.rect(12, 16, 24, 26, P.woodM); for (let x = 13; x < 36; x += 3) b.rect(x, 16, 1, 26, P.woodD);
      for (let x = 12; x < 36; x += 3) b.poly([[x, 16], [x + 1.5, 12], [x + 3, 16]], P.woodL);
      b.rect(17, 24, 14, 18, P.woodD); for (let x = 18; x < 31; x += 3) b.rect(x, 24, 1, 18, P.wood);
      b.rect(17, 30, 14, 1, P.dark); b.rect(17, 36, 14, 1, P.dark);
      return;
    }
    wallBricks(b, 12, 14, 24, 28, P.stoneD, P.stone); crenels(b, 12, 12, 24, P.stoneD);
    for (const x of [2, 36]) {
      wallBricks(b, x, 8, 10, 36, P.stone, P.stoneD); crenels(b, x, 6, 10, P.stone);
      b.rect(x + 4, 16, 2, 5, P.black);
    }
    b.rect(17, 24, 14, 18, P.woodD); b.ellipse(24, 24, 7, 4, P.woodD);
    for (let x = 18; x < 31; x += 3) b.rect(x, 21, 1, 21, P.wood);
    b.rect(17, 30, 14, 1, P.ironD); b.rect(17, 36, 14, 1, P.ironD);
    if (t >= 2) { b.rect(13, 26, 1, 3, P.woodD); b.px(13, 25, P.glow); b.rect(34, 26, 1, 3, P.woodD); b.px(34, 25, P.glow); }
    if (t >= 3) { b.rect(4, 24, 6, 9, P.red); b.rect(38, 24, 6, 9, P.red); b.px(6, 27, P.gold); b.px(7, 27, P.gold); b.px(40, 27, P.gold); b.px(41, 27, P.gold); }
  } };
  DEF.b_dungeon = { w: 48, h: 48, draw(b) {
    b.poly([[1, 46], [5, 26], [14, 12], [26, 8], [37, 14], [44, 28], [47, 46]], P.stoneD);
    b.poly([[5, 26], [14, 12], [26, 8], [21, 17], [12, 24]], P.stone);
    b.rect(14, 34, 20, 12, P.black); b.ellipse(24, 34, 10, 8, P.black);
    b.disc(24, 19, 4, P.bone); b.rect(22, 21, 5, 2, P.bone); b.rect(21, 18, 2, 2, P.k); b.rect(25, 18, 2, 2, P.k);
    b.rect(9, 33, 1, 6, P.woodD); b.px(9, 32, P.glow); b.px(9, 31, P.glowL);
    b.rect(38, 33, 1, 6, P.woodD); b.px(38, 32, P.glow); b.px(38, 31, P.glowL);
    b.px(21, 39, '#ff3b3b'); b.px(26, 39, '#ff3b3b');
  } };
  DEF.b_scaffold = { w: 48, h: 48, draw(b) {
    for (const x of [4, 22, 41]) b.rect(x, 6, 2, 38, P.woodL);
    for (const y of [10, 24, 38]) b.rect(3, y, 42, 2, P.wood);
    b.line(5, 38, 23, 24, P.woodD); b.line(24, 24, 42, 10, P.woodD);
    b.rect(28, 40, 9, 4, P.stone); b.rect(29, 38, 7, 2, P.stoneM); b.rect(8, 41, 10, 3, P.woodL);
  } };
  DEF.b_site = { w: 48, h: 48, draw(b) {
    b.ellipse(24, 38, 20, 7, P.dirt); b.ellipse(24, 38, 16, 5, P.dirtL);
    b.rect(10, 14, 2, 26, P.wood); b.rect(36, 14, 2, 26, P.wood); b.rect(9, 14, 30, 2, P.woodL); b.rect(10, 26, 28, 2, P.wood); b.line(11, 26, 36, 16, P.woodD);
    b.rect(14, 34, 8, 4, P.stone); b.rect(15, 32, 6, 2, P.stoneM); b.rect(25, 35, 9, 3, P.wood); b.rect(26, 33, 8, 2, P.woodL);
    b.rect(41, 30, 1, 10, P.woodD); b.rect(38, 26, 8, 5, P.woodL); b.px(41, 28, P.k); b.px(42, 28, P.k);
  } };

  // ---------- кэш ----------
  const cache = {};
  function build(key) {
    let white = false, k = key;
    if (k.endsWith('|w')) { white = true; k = k.slice(0, -2); }
    const [name, arg] = k.split(':');
    const d = DEF[name];
    if (!d) return new Buf(1, 1).canvas();
    const b = new Buf(d.w, d.h);
    d.draw(b, arg);
    b.outline(P.k);
    return b.canvas(white);
  }
  G.SPR = {
    canvas(key) { return cache[key] || (cache[key] = build(key)); },
    url(key) {
      const c = this.canvas(key);
      if (!c._url) c._url = c.toDataURL();
      return c._url;
    },
  };

  // ---------- фон карты города 384×300 ----------
  // wt — облик стен: 0 нет, 1 частокол, 2 камень и башни, 3 камень, башни и ров
  G.SPR.mapBg = function (cv, wt) {
    wt = wt || 0;
    const M = G.D.MAP, W = M.w, H = M.h, b = new Buf(W, H), r = G.U.seeded(1337);
    const ell = (x, y) => Math.hypot((x + 0.5 - M.cx) / M.wrx, (y + 0.5 - M.wcy) / M.wry);
    const WALL_IN = 0.955, WALL_OUT = 1.0, MOAT = 1.065;

    // трава: внутри ухоженная, снаружи дикая
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n = r(), d = ell(x, y);
        const tile = ((x >> 4) + (y >> 4)) % 2;
        if (d < WALL_IN) b.px(x, y, n < 0.06 ? '#6fb45c' : n < 0.16 ? '#4f9040' : tile ? '#5c9f4b' : '#589a47');
        else b.px(x, y, n < 0.08 ? '#2f5a26' : n < 0.18 ? '#447c37' : '#3b6e30');
      }
    }
    // пучки травы
    for (let i = 0; i < 420; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H);
      const inside = ell(x, y) < WALL_IN;
      b.px(x, y, inside ? '#7cc466' : '#5a9447'); b.px(x, y - 1, inside ? '#7cc466' : '#5a9447');
    }

    // дороги: от площади к каждой постройке и к воротам
    const road = (x0, y0, x1, y1, w) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      for (let s = 0; s <= len; s += 0.5) {
        const x = x0 + ((x1 - x0) * s) / len, y = y0 + ((y1 - y0) * s) / len;
        for (let j = -w; j <= w; j++) for (let i = -w; i <= w; i++) {
          if (i * i + j * j > w * w) continue;
          const n = r();
          b.px(x + i, y + j, Math.abs(i) === w || Math.abs(j) === w ? P.dirtD : n < 0.12 ? P.dirtD : n < 0.2 ? P.dirtL : P.dirt);
        }
      }
    };
    for (const k of G.D.ORDER) {
      const d = G.D.B[k];
      if (k === 'castle' || k === 'dungeon' || k === 'gate') continue;
      road(M.cx, M.cy, d.x, d.y + 10, 3);
    }
    road(M.cx, M.cy, M.cx, H, 4);
    const DG = G.D.B.dungeon;
    road(M.cx + 4, 292, DG.x - 8, DG.y + 10, 2);

    // мощёная площадь вокруг замка
    for (let y = M.cy - 46; y < M.cy + 50; y++) {
      for (let x = M.cx - 62; x < M.cx + 62; x++) {
        const d = Math.hypot((x - M.cx) / 60, (y - M.cy - 2) / 46);
        if (d > 1) continue;
        const bx = Math.floor((x + (Math.floor(y / 4) % 2) * 3) / 6), by = Math.floor(y / 4);
        const edge = (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0 || y % 4 === 0;
        b.px(x, y, d > 0.95 ? P.stoneD : edge ? '#8a8378' : (bx + by) % 3 === 0 ? '#bfb6a6' : '#aea596');
      }
    }

    // стена-кольцо: облик зависит от уровня ворот
    if (wt >= 1) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const d = ell(x, y);
          if (wt >= 3 && d >= WALL_OUT && d < MOAT) {
            const n = r();
            b.px(x, y, d > MOAT - 0.008 || d < WALL_OUT + 0.006 ? P.waterD : n < 0.05 ? P.waterL : P.water);
          } else if (d >= WALL_IN && d < WALL_OUT) {
            const a = Math.atan2((y - M.wcy) / M.wry, (x - M.cx) / M.wrx);
            const seg = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 220);
            const inner = d < WALL_IN + 0.012;
            if (wt === 1) b.px(x, y, seg % 2 ? (inner ? P.woodL : P.wood) : P.woodD);
            else if (inner) b.px(x, y, seg % 2 ? P.stoneL : P.stoneD);
            else b.px(x, y, (seg + Math.floor(d * 400)) % 5 === 0 ? P.stoneD : d > WALL_OUT - 0.01 ? P.stoneD : P.stone);
          }
        }
      }
      // башни: деревянные вышки или каменные башни
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.PI / 10;
        if (Math.abs(a - Math.PI / 2) < 0.4) continue;
        const tx = M.cx + M.wrx * 0.978 * Math.cos(a), ty = M.wcy + M.wry * 0.978 * Math.sin(a);
        if (wt === 1) {
          b.rect(tx - 4, ty - 4, 8, 8, P.k); b.rect(tx - 3, ty - 3, 6, 6, P.wood); b.rect(tx - 3, ty - 3, 6, 1, P.woodL);
          continue;
        }
        b.ellipse(tx + 1, ty + 3, 9, 5, '#2f5a26');
        b.disc(tx, ty, 8, P.k); b.disc(tx, ty, 7, P.stoneD); b.disc(tx, ty - 1, 6, P.stone); b.disc(tx, ty - 1, 4.5, P.stoneM);
        for (let j = 0; j < 8; j++) { const aa = (j / 8) * Math.PI * 2; b.px(tx + Math.cos(aa) * 5.5, ty - 1 + Math.sin(aa) * 5.5, P.stoneL); }
        b.px(tx, ty - 1, P.red);
      }
      if (wt >= 3) {
        for (let y = M.wcy + M.wry - 6; y < M.wcy + M.wry + 14; y++) {
          for (let x = M.cx - 9; x <= M.cx + 9; x++) b.px(x, y, Math.abs(x - M.cx) === 9 ? P.woodD : y % 3 === 0 ? P.woodM : P.wood);
        }
      }
    }

    // тени под постройками
    for (const k of G.D.ORDER) {
      const d = G.D.B[k];
      if (k === 'gate') continue;
      b.ellipse(d.x + 3, d.y + d.size * 0.36, d.size * 0.46, d.size * 0.14, ell(d.x, d.y) < 1 ? '#3f7a34' : '#2a4f22');
    }

    // деревья: лес по углам снаружи, сады внутри
    const rt = G.U.seeded(77);
    const trees = [];
    for (let i = 0; i < 260; i++) {
      const x = rt() * W, y = rt() * H;
      const d = ell(x, y);
      if (d > MOAT + 0.05 && !(x > 300 && y < 60) && !(x > 300 && y > 250) && !(Math.abs(x - M.cx) < 18 && y > 250)) trees.push([x, y, 5 + rt() * 3]);
    }
    for (const [x, y] of [[140, 182], [246, 182], [120, 100], [266, 100], [192, 92], [60, 152], [324, 152], [100, 222], [286, 222]]) trees.push([x, y, 4.5]);
    trees.sort((p, q) => p[1] - q[1]);
    for (const [x, y, s] of trees) treeTop(b, x, y, s, ell(x, y) < 1 ? '#3f7a34' : '#24461d');

    // пруд и горы снаружи
    b.ellipse(26, 268, 22, 12, P.waterD); b.ellipse(26, 267, 20, 10, P.water); b.ellipse(20, 264, 6, 2, P.waterL);
    for (const [x, y, s] of [[318, 10, 14], [370, 58, 12], [300, 40, 10], [376, 14, 10]]) {
      b.poly([[x - s, y + s * 0.6], [x - s * 0.2, y - s], [x + s, y + s * 0.6]], P.stoneD);
      b.poly([[x - s * 0.2, y - s], [x + s * 0.15, y - s * 0.4], [x - s * 0.5, y + s * 0.1]], P.stoneL);
    }
    // цветы внутри стен
    for (let i = 0; i < 140; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H);
      if (ell(x, y) < 0.9 && b.get(x, y) && b.get(x, y).startsWith('#5')) b.px(x, y, r() < 0.4 ? '#ffd84a' : r() < 0.5 ? '#ff8ab0' : '#ffffff');
    }

    cv.width = W;
    cv.height = H;
    cv.getContext('2d').drawImage(b.canvas(), 0, 0);
  };

  // ---------- фон боя у ворот 320×130 ----------
  G.SPR.battleBg = function () {
    const OFF = 80, W = 320, H = 130 + OFF, b = new Buf(W, H), r = G.U.seeded(42);
    const sky = ['#140f24', '#1a1330', '#1d1530', '#261b3d', '#30214a', '#3d2a55', '#4d3360'];
    for (let y = 0; y < 72 + OFF; y++) { const c = sky[Math.min(6, Math.floor(y / 19))]; for (let x = 0; x < W; x++) b.px(x, y, c); }
    for (let i = 0; i < 90; i++) b.px(Math.floor(r() * W), Math.floor(r() * (45 + OFF)), r() < 0.5 ? '#ffffff' : '#c8b8ff');
    b.disc(262, 34, 9, '#f3e9c8'); b.disc(259, 31, 2, '#d8ccaa'); b.disc(266, 37, 1.5, '#d8ccaa');
    for (const [cx, cy, w] of [[70, 30, 40], [180, 20, 50], [300, 60, 30]]) for (let i = 0; i < w; i++) b.px(cx + i, cy + Math.round(Math.sin(i / 5)), '#3a2c55');
    for (let x = 0; x < W; x++) {
      const h1 = Math.round(46 + OFF + 8 * Math.sin(x * 0.05) + 5 * Math.sin(x * 0.13 + 1));
      for (let y = h1; y < 72 + OFF; y++) b.px(x, y, '#2a1f3d');
      const h2 = Math.round(58 + OFF + 5 * Math.sin(x * 0.08 + 2) + 3 * Math.sin(x * 0.21));
      for (let y = h2; y < 72 + OFF; y++) b.px(x, y, '#22192f');
    }
    for (let y = 72 + OFF; y < H; y++) for (let x = 0; x < W; x++) { const n = r(); b.px(x, y, n < 0.1 ? '#2f5524' : n < 0.2 ? '#447a35' : '#3a6a2e'); }
    for (let y = 90 + OFF; y < 126 + OFF; y++) {
      const e = Math.floor(r() * 3);
      for (let x = 30; x < W; x++) {
        if ((y === 90 + OFF || y === 125 + OFF) && (x + e) % 4 === 0) continue;
        const n = r();
        b.px(x, y, n < 0.12 ? P.dirtD : n < 0.2 ? P.dirtL : P.dirt);
      }
    }
    b.rect(0, 14 + OFF, 34, 116, '#6d727c');
    for (let j = 15 + OFF; j < H; j += 3) for (let i = (j % 2) * 2; i < 34; i += 5) b.px(i, j, '#565b64');
    crenels(b, 0, 10 + OFF, 34, '#6d727c');
    b.rect(33, 10 + OFF, 1, 120, '#4a4f58');
    b.rect(18, 78 + OFF, 15, 48, P.woodD); for (let x = 20; x < 33; x += 3) b.rect(x, 78 + OFF, 1, 48, P.wood);
    b.rect(18, 92 + OFF, 15, 1, P.ironD); b.rect(18, 108 + OFF, 15, 1, P.ironD);
    b.rect(37, 70 + OFF, 1, 6, P.woodD); b.px(37, 69 + OFF, P.glow); b.px(37, 68 + OFF, P.glowL);
    return b.canvas();
  };

  // Карта мира для вкладки «Походы» (160×80)
  let worldUrl = null;
  G.SPR.worldBg = function () {
    if (worldUrl) return worldUrl;
    const W = 160, H = 80, b = new Buf(W, H), r = G.U.seeded(21);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = r();
      b.px(x, y, n < 0.08 ? '#4a7a3a' : n < 0.16 ? '#3b6a30' : '#447436');
    }
    // река
    for (let x = 0; x < W; x++) { const y = Math.round(56 + 6 * Math.sin(x / 14) - x * 0.1); b.rect(x, y, 1, 3, P.water); b.px(x, y, P.waterL); }
    // горы на севере и востоке
    for (const [x, y, s] of [[110, 14, 9], [124, 10, 11], [140, 16, 10], [96, 8, 7], [150, 6, 8], [132, 30, 7]]) {
      b.poly([[x - s, y + s * 0.7], [x, y - s * 0.6], [x + s, y + s * 0.7]], P.stoneD);
      b.poly([[x, y - s * 0.6], [x + s * 0.3, y - s * 0.1], [x - s * 0.3, y]], P.white);
    }
    // лес
    for (let i = 0; i < 70; i++) { const x = 20 + r() * 70, y = 18 + r() * 30; b.disc(x, y, 2.2, P.leafD); b.px(x - 1, y - 1, P.leafL); }
    // дороги от столицы
    const path = (x0, y0, x1, y1) => { const len = Math.hypot(x1 - x0, y1 - y0); for (let s = 0; s < len; s += 2) b.px(x0 + ((x1 - x0) * s) / len, y0 + ((y1 - y0) * s) / len, P.dirtL); };
    path(24, 62, 52, 32); path(24, 62, 102, 52); path(24, 62, 130, 22);
    worldUrl = b.canvas().toDataURL();
    return worldUrl;
  };

  // Фон сцены подземелья для окна похода (160×56)
  G.SPR.dungeonBg = function (loc) {
    const W = 160, H = 56, b = new Buf(W, H), r = G.U.seeded(loc === 'mine' ? 9 : loc === 'lair' ? 13 : 5);
    const wall = loc === 'lair' ? ['#3a1a1a', '#4a2222', '#2a1010'] : loc === 'mine' ? ['#1f2a33', '#2a3a44', '#151e25'] : ['#2a2233', '#352b40', '#1d1726'];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = r();
      b.px(x, y, y > 40 ? (n < 0.2 ? wall[2] : wall[0]) : (x + (Math.floor(y / 6) % 2) * 6) % 12 === 0 || y % 6 === 0 ? wall[2] : n < 0.1 ? wall[1] : wall[0]);
    }
    for (const x of [24, 136]) { b.rect(x, 14, 2, 8, P.woodD); b.px(x, 12, P.glow); b.px(x + 1, 13, P.glowL); b.px(x, 11, P.glowL); }
    if (loc === 'mine') for (let x = 0; x < W; x += 2) b.px(x, 52, P.waterD);
    if (loc === 'lair') for (let i = 0; i < 30; i++) b.px(r() * W, 42 + r() * 14, P.gold);
    return b.canvas().toDataURL();
  };
})();
