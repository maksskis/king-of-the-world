// Процедурный пиксель-арт: фигуры рисуются по пикселям в буфер,
// затем автоматически обводятся тёмным контуром.
(function () {
  const P = (G.PAL = {
    k: '#1b1424', dark: '#2a2233', black: '#0d0a12', white: '#ffffff',
    gold: '#f7c948', goldD: '#b07d1a', goldL: '#fff2a8',
    wood: '#9a6234', woodD: '#6b3f1d', woodL: '#c98f56',
    stone: '#8d939c', stoneD: '#5d636c', stoneL: '#c3c8cf', stoneM: '#a6acb5',
    iron: '#a8b0be', ironD: '#6b7383', ironL: '#dde2ea', rust: '#c0663a',
    bone: '#ece2c6', boneD: '#b9aa86', boneL: '#fffaf0',
    cry: '#63d4ff', cryD: '#2b7fd4',
    mith: '#8ff3df', mithD: '#3fae9c', mithL: '#d8fff6',
    red: '#c83a3a', redD: '#8a2222', redL: '#ff7a6a',
    green: '#4caf50', greenD: '#2e6b31', greenL: '#8be08b',
    leaf: '#3d8b3d', leafD: '#24572a', leafL: '#5fb35a',
    skin: '#f1c49b', skinD: '#c98f66',
    blue: '#3a5fc8', blueD: '#22388a', blueL: '#7a9cff',
    purple: '#8a4ad0', purpleD: '#552a8a', purpleL: '#c08aff',
    roof: '#b4423a', roofD: '#7a2a25', roofB: '#4a6fd0',
    dirt: '#a08055', dirtD: '#7a5f3d', glow: '#ffb347', glowL: '#ffe39a',
    robe: '#e6e6f0', robeD: '#a9a9c0', gob: '#6cbf4a', gobD: '#3f8a2a', orc: '#4a8a3a', orcD: '#2f5f25',
    troll: '#6f8494', trollD: '#4f6170', trollL: '#8fa3b0', night: '#3a2a4a', ghost: '#7dff7a',
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
    rect(x, y, w, h, c) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    }
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
    const n = parseInt(c.slice(1), 16);
    return (hexCache[c] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }

  // ---------- помощники ----------
  function tree(b, cx, by, r) {
    b.rect(cx - 1, by - 3, 2, 3, P.woodD);
    b.disc(cx, by - 3 - r * 0.8, r, P.leafD);
    b.disc(cx - 0.5, by - 3.5 - r, r * 0.8, P.leaf);
    b.disc(cx - r * 0.35, by - 3.5 - r * 1.25, r * 0.35, P.leafL);
  }
  function crenels(b, x, y, w, c) { for (let i = 0; i < w; i += 3) b.rect(x + i, y, 2, 2, c); }
  function bricks(b, x, y, w, h, c) {
    for (let j = 1; j < h; j += 3) for (let i = (j % 2) * 2; i < w; i += 5) b.px(x + i, y + j, c);
  }
  function tierCols(t) {
    return [[P.iron, P.ironD, P.ironL], [P.bone, P.boneD, P.boneL], [P.mith, P.mithD, P.mithL]][t] || [P.iron, P.ironD, P.ironL];
  }
  const GEM = [P.cry, P.red, P.mith];

  const DEF = {};

  // ---------- ресурсы (12×12) ----------
  DEF.r_gold = { w: 12, h: 12, draw(b) { b.disc(6, 6, 5, P.goldD); b.disc(5.6, 5.6, 4.2, P.gold); b.rect(5, 4, 2, 4, P.goldD); b.px(3, 4, P.goldL); b.px(4, 3, P.goldL); } };
  DEF.r_wood = { w: 12, h: 12, draw(b) { b.rect(1, 4, 8, 5, P.wood); b.rect(1, 5, 8, 1, P.woodD); b.rect(2, 7, 6, 1, P.woodD); b.ellipse(9, 6.5, 2.2, 2.6, P.woodL); b.px(9, 6, P.woodD); } };
  DEF.r_stone = { w: 12, h: 12, draw(b) { b.poly([[1, 10.5], [1.5, 6], [4, 2.5], [8, 1.5], [10.5, 5], [10.5, 10.5]], P.stone); b.rect(4, 3, 4, 1, P.stoneL); b.rect(3, 4, 2, 2, P.stoneL); b.rect(2, 9, 8, 1, P.stoneD); b.px(8, 6, P.stoneD); b.px(6, 7, P.stoneD); } };
  DEF.r_iron = { w: 12, h: 12, draw(b) { b.poly([[1, 10.5], [3.5, 4], [8.5, 4], [11, 10.5]], P.iron); b.rect(3, 4, 6, 2, P.ironL); b.rect(1, 9, 10, 1, P.ironD); } };
  DEF.r_mithril = { w: 12, h: 12, draw(b) { b.poly([[1, 10.5], [3.5, 4], [8.5, 4], [11, 10.5]], P.mith); b.rect(3, 4, 6, 2, P.mithL); b.rect(1, 9, 10, 1, P.mithD); b.px(8, 7, P.white); } };
  DEF.r_bone = { w: 12, h: 12, draw(b) { b.rect(3, 5, 6, 2, P.bone); b.disc(2.6, 4.6, 1.7, P.bone); b.disc(2.6, 7.4, 1.7, P.bone); b.disc(9.4, 4.6, 1.7, P.bone); b.disc(9.4, 7.4, 1.7, P.bone); b.rect(3, 6, 6, 1, P.boneD); } };
  DEF.r_crystal = { w: 12, h: 12, draw(b) { b.poly([[6, 1], [10.5, 5], [6, 11], [1.5, 5]], P.cry); b.poly([[6, 1], [6, 11], [1.5, 5]], P.cryD); b.px(7, 3, P.white); b.px(8, 4, P.white); } };

  // ---------- значки (12×12) ----------
  DEF.i_atk = { w: 12, h: 12, draw(b) { for (let i = 0; i < 6; i++) { b.px(5 + i, 6 - i, P.ironL); b.px(5 + i, 7 - i, P.iron); } b.line(3, 5, 6, 8, P.goldD); b.px(4, 8, P.woodD); b.px(3, 9, P.woodD); b.px(2, 10, P.gold); } };
  DEF.i_def = { w: 12, h: 12, draw(b) { b.poly([[2, 1.5], [10, 1.5], [10, 6], [6, 10.5], [2, 6]], P.blue); b.rect(5, 2, 2, 7, P.gold); b.rect(3, 4, 6, 2, P.gold); b.px(3, 2, P.blueL); } };
  DEF.i_hp = { w: 12, h: 12, draw(b) { b.disc(4, 4.5, 2.7, P.red); b.disc(8, 4.5, 2.7, P.red); b.poly([[1.4, 5], [10.6, 5], [6, 10.5]], P.red); b.px(3, 3, P.redL); b.px(3, 4, P.redL); } };
  DEF.i_crown = { w: 12, h: 12, draw(b) { b.rect(2, 6, 8, 4, P.gold); b.poly([[2, 6.5], [2, 2], [4.5, 6.5]], P.gold); b.poly([[4.5, 6.5], [6, 1.5], [7.5, 6.5]], P.gold); b.poly([[7.5, 6.5], [10, 2], [10, 6.5]], P.gold); b.rect(2, 9, 8, 1, P.goldD); b.px(6, 7, P.red); b.px(3, 7, P.cry); b.px(8, 7, P.cry); } };
  DEF.i_skull = { w: 12, h: 12, draw(b) { b.disc(6, 5, 4.2, P.bone); b.rect(4, 8, 4, 3, P.bone); b.rect(3, 4, 2, 2, P.k); b.rect(7, 4, 2, 2, P.k); b.px(5, 7, P.boneD); b.px(6, 7, P.boneD); b.px(5, 10, P.boneD); } };
  DEF.i_pick = { w: 12, h: 12, draw(b) { b.line(2, 10, 7, 5, P.wood); b.line(3, 10, 8, 5, P.woodD); b.poly([[3.5, 2], [7, 2.5], [10, 5], [10.5, 8.5], [9, 8], [8, 5.5], [6, 4], [3.5, 3.5]], P.stoneL); } };
  DEF.i_clock = { w: 12, h: 12, draw(b) { b.disc(6, 6, 5, P.stoneL); b.disc(6, 6, 4, P.white); b.line(6, 6, 6, 3, P.k); b.line(6, 6, 8, 7, P.k); } };
  DEF.i_helmet = { w: 12, h: 12, draw(b) { b.ellipse(6, 6, 4.5, 4.5, P.iron); b.rect(2, 6, 8, 4, P.iron); b.rect(3, 6, 6, 1, P.k); b.rect(5, 7, 2, 3, P.ironD); b.px(4, 3, P.ironL); b.px(5, 2, P.ironL); } };
  DEF.i_star = { w: 12, h: 12, draw(b) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 2.2 : 5; pts.push([6 + Math.cos(a) * r, 6.3 + Math.sin(a) * r]); } b.poly(pts, P.gold); b.px(5, 4, P.goldL); } };
  DEF.i_chest = { w: 12, h: 12, draw(b) { b.rect(1, 5, 10, 5, P.wood); b.rect(1, 3, 10, 3, P.woodL); b.rect(1, 5, 10, 1, P.woodD); b.rect(5, 5, 2, 2, P.gold); b.rect(3, 3, 1, 7, P.ironD); b.rect(8, 3, 1, 7, P.ironD); } };
  DEF.i_flag = { w: 12, h: 12, draw(b) { b.rect(3, 1, 1, 10, P.woodD); b.poly([[4, 1.5], [10, 3.5], [4, 6]], P.red); } };
  DEF.i_hammer = { w: 12, h: 12, draw(b) { b.line(2, 10, 7, 5, P.wood); b.line(3, 10, 8, 5, P.woodD); b.poly([[5, 3], [8, 0.5], [11, 3.5], [8.5, 6]], P.iron); b.px(8, 2, P.ironL); } };
  DEF.i_people = { w: 12, h: 12, draw(b) { b.disc(4, 3.5, 2, P.skin); b.rect(2, 6, 4, 4, P.blue); b.disc(8.5, 4, 2, P.skin); b.rect(6.5, 6.5, 4, 4, P.red); } };

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
  DEF.guard = { w: 10, h: 13, draw(b) { b.rect(3, 6, 4, 4, P.red); b.disc(5, 3.8, 2, P.skin); b.rect(3, 1, 4, 2, P.iron); b.rect(3, 10, 1, 2, P.woodD); b.rect(6, 10, 1, 2, P.woodD); b.line(8, 2, 8, 10, P.wood); } };

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

  // ---------- здания (40×40), аргумент — ступень облика 1..3 ----------
  DEF.b_castle = { w: 40, h: 40, draw(b, t) {
    t = +t || 1;
    if (t >= 2) {
      b.rect(16, 7, 8, 11, P.stoneM); b.poly([[15, 7.5], [20, 0.5], [25, 7.5]], P.roofB); b.poly([[20, 0.5], [25, 7.5], [20, 7.5]], P.blueD);
      b.rect(19, 10, 2, 3, P.glow);
    }
    b.rect(3, 14, 9, 24, P.stone); b.rect(28, 14, 9, 24, P.stone);
    bricks(b, 3, 14, 9, 24, P.stoneD); bricks(b, 28, 14, 9, 24, P.stoneD);
    b.rect(12, 18, 16, 20, P.stoneM); bricks(b, 12, 18, 16, 20, P.stone); crenels(b, 12, 16, 16, P.stoneM);
    b.poly([[2, 14.5], [7.5, 4], [13, 14.5]], P.roofB); b.poly([[7.5, 4], [13, 14.5], [7.5, 14.5]], P.blueD);
    b.poly([[27, 14.5], [32.5, 4], [38, 14.5]], P.roofB); b.poly([[32.5, 4], [38, 14.5], [32.5, 14.5]], P.blueD);
    b.rect(17, 29, 6, 9, P.woodD); b.rect(18, 28, 4, 1, P.woodD); b.rect(20, 29, 1, 9, P.wood); b.px(19, 33, P.gold);
    b.rect(7, 20, 1, 3, P.dark); b.rect(32, 20, 1, 3, P.dark); b.rect(15, 21, 2, 3, P.glow); b.rect(23, 21, 2, 3, P.glow);
    if (t >= 3) {
      b.rect(12, 18, 16, 1, P.gold);
      b.rect(13, 24, 2, 6, P.red); b.px(13, 30, P.red); b.rect(25, 24, 2, 6, P.red); b.px(26, 30, P.red);
      b.px(7, 4, P.gold); b.px(32, 4, P.gold);
    }
  } };
  DEF.b_lumber = { w: 40, h: 40, draw(b, t) {
    t = +t || 1;
    tree(b, 6, 24, 5); tree(b, 33, 22, 5);
    if (t >= 3) tree(b, 26, 13, 4);
    b.rect(12, 22, 16, 13, P.wood); for (let y = 24; y < 35; y += 3) b.rect(12, y, 16, 1, P.woodD);
    b.poly([[10, 22.5], [20, 13], [30, 22.5]], P.roof); b.poly([[20, 13], [30, 22.5], [20, 22.5]], P.roofD);
    b.rect(18, 28, 4, 7, P.woodD); b.rect(14, 25, 2, 2, P.glow);
    for (const [x, y] of [[4, 35], [8, 35], [6, 32]]) { b.disc(x, y, 2.1, P.woodL); b.px(x - 0.5, y - 0.5, P.woodD); }
    if (t >= 2) { for (const [x, y] of [[12, 36], [10, 33]]) { b.disc(x, y, 2.1, P.woodL); b.px(x - 0.5, y - 0.5, P.woodD); } }
    b.rect(31, 32, 6, 4, P.wood); b.rect(31, 31, 6, 1, P.woodL); b.line(34, 27, 34, 31, P.woodD); b.rect(32, 26, 3, 2, P.ironL);
    if (t >= 2) { b.disc(25, 30, 2.6, P.ironL); b.px(25, 30, P.ironD); }
  } };
  DEF.b_quarry = { w: 40, h: 40, draw(b, t) {
    t = +t || 1;
    if (t >= 2) {
      b.rect(31, 6, 2, 22, P.wood); b.rect(22, 6, 13, 2, P.wood); b.line(26, 8, 32, 13, P.woodD);
      b.rect(24, 8, 1, 8, P.dark); b.rect(22, 16, 5, 4, P.stoneM); b.rect(22, 16, 5, 1, P.stoneL);
    }
    b.poly([[2, 37], [5, 24], [12, 17], [19, 21], [22, 37]], P.stoneD);
    b.poly([[5, 24], [12, 17], [14, 22], [8, 27]], P.stone);
    b.poly([[17, 37], [21, 28], [29, 22], [36, 27], [38, 37]], P.stone);
    b.poly([[21, 28], [29, 22], [30, 27], [24, 31]], P.stoneL);
    b.rect(23, 32, 6, 5, P.stoneM); b.rect(23, 32, 6, 1, P.stoneL); b.rect(30, 33, 5, 4, P.stoneM); b.rect(30, 33, 5, 1, P.stoneL);
    b.line(10, 36, 15, 29, P.wood); b.poly([[12, 28], [15, 27.5], [18, 30], [17, 31], [15, 29.5], [13, 30]], P.ironL);
    if (t >= 3) { b.rect(3, 31, 7, 4, P.woodD); b.rect(4, 29, 5, 2, P.stoneL); b.px(4, 35, P.dark); b.px(8, 35, P.dark); }
  } };
  DEF.b_mine = { w: 40, h: 40, draw(b, t) {
    t = +t || 1;
    b.ellipse(20, 34, 19, 18, P.stoneD); b.ellipse(13, 24, 6, 4, P.stone); b.ellipse(20, 17, 9, 2.5, P.leafD);
    b.rect(14, 26, 12, 12, P.black); b.ellipse(20, 26, 6, 4, P.black);
    b.rect(12, 23, 2, 15, P.wood); b.rect(26, 23, 2, 15, P.wood); b.rect(11, 22, 18, 2, P.woodL);
    b.rect(15, 37, 10, 1, P.ironD);
    b.rect(29, 32, 8, 5, P.ironD); b.rect(29, 32, 8, 1, P.iron); b.rect(30, 30, 6, 2, P.rust); b.px(30, 37, P.dark); b.px(35, 37, P.dark);
    if (t >= 2) { b.rect(19, 19, 2, 3, P.glow); b.px(19, 18, P.woodD); b.px(20, 18, P.woodD); }
    if (t >= 3) { b.px(31, 30, P.gold); b.px(34, 30, P.gold); b.px(17, 32, P.glowL); }
  } };
  DEF.b_forge = { w: 40, h: 40, draw(b, t) {
    t = +t || 1;
    b.rect(24, 5, 5, 12, P.stone); b.rect(23, 4, 7, 2, P.stoneD);
    if (t >= 3) { b.px(26, 2, P.glow); b.px(25, 1, P.glowL); b.px(27, 0, P.glow); }
    b.rect(5, 19, 25, 18, P.stoneD); bricks(b, 5, 19, 25, 18, P.stone);
    b.poly([[3, 19.5], [17.5, 10], [32, 19.5]], P.dark); b.poly([[17.5, 10], [32, 19.5], [17.5, 19.5]], '#1f1828');
    b.rect(8, 24, 7, 6, P.glow); b.rect(9, 25, 5, 4, P.glowL); b.rect(11, 24, 1, 6, P.woodD);
    b.rect(19, 26, 7, 11, P.woodD); b.px(24, 31, P.gold);
    b.rect(31, 31, 8, 2, P.ironD); b.rect(31, 31, 8, 1, P.iron); b.rect(33, 33, 4, 4, P.ironD); b.rect(32, 37, 6, 1, P.ironD);
    if (t >= 2) { b.line(33, 27, 36, 30, P.wood); b.rect(32, 26, 3, 2, P.ironL); }
  } };
  DEF.b_tavern = { w: 40, h: 40, draw(b, t) {
    t = +t || 1;
    if (t >= 2) b.rect(27, 4, 3, 7, P.stone);
    b.rect(6, 23, 28, 14, P.wood); for (let y = 25; y < 37; y += 3) b.rect(6, y, 28, 1, P.woodD);
    b.rect(8, 13, 24, 10, P.woodL); b.rect(8, 13, 1, 10, P.woodD); b.rect(31, 13, 1, 10, P.woodD); b.rect(8, 18, 24, 1, P.woodD); b.rect(19, 13, 1, 10, P.woodD);
    b.poly([[5, 13.5], [20, 3], [35, 13.5]], P.roof); b.poly([[20, 3], [35, 13.5], [20, 13.5]], P.roofD);
    b.rect(11, 15, 3, 3, P.glow); b.rect(26, 15, 3, 3, P.glow);
    b.rect(9, 27, 4, 4, P.glow); b.rect(27, 27, 4, 4, P.glow);
    b.rect(17, 28, 6, 9, P.woodD); b.px(21, 32, P.gold);
    b.rect(16, 24, 8, 3, P.woodL); b.px(19, 25, P.gold); b.px(20, 25, P.gold); b.px(21, 25, P.goldD);
    b.rect(34, 32, 4, 5, P.woodD); b.rect(34, 33, 4, 1, P.ironD); b.rect(34, 35, 4, 1, P.ironD);
    if (t >= 3) { b.px(7, 22, P.glowL); b.px(32, 22, P.glowL); b.rect(2, 33, 3, 4, P.woodD); b.rect(2, 34, 3, 1, P.ironD); }
  } };
  DEF.b_barracks = { w: 40, h: 40, draw(b, t) {
    t = +t || 1;
    b.rect(5, 19, 24, 18, P.stone); bricks(b, 5, 19, 24, 18, P.stoneD);
    b.poly([[3, 19.5], [17, 9], [31, 19.5]], P.roofD); b.poly([[17, 9], [31, 19.5], [17, 19.5]], '#5a1f1b');
    b.rect(14, 27, 6, 10, P.woodD); b.rect(8, 23, 2, 3, P.dark); b.rect(24, 23, 2, 3, P.dark);
    b.rect(33, 6, 1, 31, P.woodD); b.rect(34, 7, 4, 9, P.red); b.poly([[34, 15.5], [38, 15.5], [36, 18]], P.red);
    b.px(35, 10, P.gold); b.px(36, 10, P.gold); b.px(35, 11, P.gold); b.px(36, 11, P.gold);
    b.line(30, 26, 30, 37, P.wood); b.px(30, 25, P.ironL); b.line(31, 28, 31, 37, P.wood); b.px(31, 27, P.ironL);
    if (t >= 2) { b.disc(11, 21.5, 1.6, P.blue); b.disc(23, 21.5, 1.6, P.blue); }
    if (t >= 3) { b.rect(5, 19, 24, 1, P.gold); b.px(17, 9, P.gold); }
  } };
  DEF.b_gate = { w: 40, h: 40, draw(b, t) {
    t = +t || 1;
    b.rect(12, 12, 16, 26, P.stoneD); bricks(b, 12, 12, 16, 26, P.stone);
    b.rect(2, 8, 10, 30, P.stone); b.rect(28, 8, 10, 30, P.stone);
    bricks(b, 2, 8, 10, 30, P.stoneD); bricks(b, 28, 8, 10, 30, P.stoneD);
    crenels(b, 2, 6, 10, P.stone); crenels(b, 28, 6, 10, P.stone); crenels(b, 12, 10, 16, P.stoneD);
    b.rect(14, 22, 12, 16, P.woodD); b.ellipse(20, 22, 6, 3.5, P.woodD);
    for (let x = 16; x < 26; x += 3) b.rect(x, 20, 1, 18, P.wood);
    b.rect(14, 27, 12, 1, P.ironD); b.rect(14, 33, 12, 1, P.ironD);
    b.rect(6, 16, 1, 4, P.black); b.rect(33, 16, 1, 4, P.black);
    if (t >= 2) { b.rect(12, 24, 1, 3, P.woodD); b.px(12, 23, P.glow); b.rect(27, 24, 1, 3, P.woodD); b.px(27, 23, P.glow); }
    if (t >= 3) { b.rect(5, 22, 4, 7, P.red); b.rect(31, 22, 4, 7, P.red); b.px(6, 24, P.gold); b.px(7, 24, P.gold); b.px(32, 24, P.gold); b.px(33, 24, P.gold); }
  } };
  DEF.b_dungeon = { w: 40, h: 40, draw(b) {
    b.poly([[1, 38], [5, 22], [12, 11], [22, 8], [31, 13], [37, 24], [39, 38]], P.stoneD);
    b.poly([[5, 22], [12, 11], [22, 8], [18, 15], [10, 20]], P.stone);
    b.rect(12, 28, 16, 10, P.black); b.ellipse(20, 28, 8, 7, P.black);
    b.disc(20, 15, 3.6, P.bone); b.rect(18, 17, 5, 2, P.bone); b.rect(18, 14, 2, 2, P.k); b.rect(21, 14, 2, 2, P.k);
    b.rect(8, 27, 1, 5, P.woodD); b.px(8, 26, P.glow); b.px(8, 25, P.glowL);
    b.rect(31, 27, 1, 5, P.woodD); b.px(31, 26, P.glow); b.px(31, 25, P.glowL);
    b.px(18, 32, '#ff3b3b'); b.px(21, 32, '#ff3b3b');
  } };
  DEF.b_site = { w: 40, h: 40, draw(b) {
    b.ellipse(20, 33, 17, 5, P.dirt);
    b.rect(10, 14, 2, 21, P.wood); b.rect(28, 14, 2, 21, P.wood); b.rect(9, 14, 22, 2, P.woodL); b.rect(10, 24, 20, 1, P.wood); b.line(11, 24, 28, 15, P.woodD);
    b.rect(14, 30, 6, 3, P.stone); b.rect(15, 28, 4, 2, P.stoneM); b.rect(21, 31, 7, 2, P.wood); b.rect(22, 29, 6, 2, P.woodL);
    b.rect(33, 26, 1, 8, P.woodD); b.rect(31, 22, 6, 4, P.woodL); b.px(33, 24, P.k); b.px(34, 24, P.k);
  } };

  // ---------- кэш ----------
  const cache = {};
  function build(key) {
    let white = false;
    let k = key;
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
    has: (name) => !!DEF[name],
  };

  // ---------- фон карты города 320×200 ----------
  G.SPR.mapBg = function (cv) {
    const W = 320, H = 200, b = new Buf(W, H), r = G.U.seeded(1337);
    const WALL = 253;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n = r();
        if (x > WALL + 6) b.px(x, y, n < 0.1 ? '#36602a' : n < 0.2 ? '#2f5524' : '#3a6a2e');
        else b.px(x, y, n < 0.08 ? '#5c9a46' : n < 0.18 ? '#4a8238' : '#538f3f');
      }
    }
    const road = (x, y, w, h) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const n = r();
        b.px(x + i, y + j, n < 0.15 ? P.dirtD : n < 0.25 ? '#b39066' : P.dirt);
      }
    };
    road(8, 124, 312, 7);
    road(127, 42, 7, 84);
    road(57, 104, 6, 22);
    road(167, 108, 6, 18);
    road(201, 52, 6, 74);
    road(29, 46, 6, 80);
    road(33, 129, 6, 21);
    road(109, 129, 6, 21);
    // тропа к подземелью
    for (let i = 0; i < 64; i++) road(262 + Math.floor(i * 0.5), 126 - i, 6, 2);

    // лесная опушка сверху и слева
    const trees = [[4, 12], [6, 60], [3, 92], [56, 10], [64, 26], [80, 8], [96, 20], [168, 10], [240, 12], [228, 40], [232, 70], [160, 52], [88, 54], [240, 160], [206, 186], [180, 158], [150, 172], [222, 118]];
    const rt = G.U.seeded(77);
    for (const [x, y] of trees) {
      const s = 4 + Math.floor(rt() * 3);
      b.disc(x, y - 3 - s * 0.8, s + 1, '#1f3a1c');
      tree(b, x, y + 4, s);
    }
    // валуны у каменоломни
    for (const [x, y, s] of [[8, 192, 3], [70, 176, 2.5], [62, 192, 2], [140, 190, 2.5]]) {
      b.disc(x, y, s + 1, P.k); b.disc(x, y, s, P.stone); b.px(x - 1, y - 1, P.stoneL);
    }
    // цветы
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(r() * WALL), y = Math.floor(r() * H);
      b.px(x, y, r() < 0.5 ? '#ffd84a' : r() < 0.5 ? '#ff8ab0' : '#ffffff');
    }
    // снаружи: мёртвые деревья и камни
    for (const [x, y] of [[300, 90], [312, 140], [272, 176], [302, 186], [268, 10]]) {
      b.line(x, y, x, y - 8, P.woodD); b.line(x, y - 5, x - 3, y - 8, P.woodD); b.line(x, y - 6, x + 3, y - 10, P.woodD);
    }
    // крепостная стена
    for (let y = 0; y < H; y++) {
      for (let x = WALL; x < WALL + 7; x++) b.px(x, y, (y % 6 === 0 || (x === WALL + 3 && y % 12 < 6)) ? P.stoneD : P.stone);
      b.px(WALL - 1, y, P.k); b.px(WALL + 7, y, P.k);
    }
    for (let y = 0; y < H; y += 4) b.rect(WALL - 2, y, 2, 2, P.stone);

    const ctx = cv.getContext('2d');
    cv.width = W; cv.height = H;
    ctx.drawImage(b.canvas(), 0, 0);
  };

  // ---------- фон боя у ворот 320×130 ----------
  G.SPR.battleBg = function () {
    const W = 320, H = 130, b = new Buf(W, H), r = G.U.seeded(42);
    const sky = ['#1d1530', '#261b3d', '#30214a', '#3d2a55', '#4d3360'];
    for (let y = 0; y < 72; y++) { const c = sky[Math.min(4, Math.floor(y / 14))]; for (let x = 0; x < W; x++) b.px(x, y, c); }
    for (let i = 0; i < 50; i++) b.px(Math.floor(r() * W), Math.floor(r() * 45), r() < 0.5 ? '#ffffff' : '#c8b8ff');
    b.disc(262, 18, 8, '#f3e9c8'); b.disc(259, 16, 2, '#d8ccaa'); b.disc(265, 21, 1.5, '#d8ccaa');
    for (let x = 0; x < W; x++) {
      const h1 = Math.round(46 + 8 * Math.sin(x * 0.05) + 5 * Math.sin(x * 0.13 + 1));
      for (let y = h1; y < 72; y++) b.px(x, y, '#2a1f3d');
      const h2 = Math.round(58 + 5 * Math.sin(x * 0.08 + 2) + 3 * Math.sin(x * 0.21));
      for (let y = h2; y < 72; y++) b.px(x, y, '#22192f');
    }
    for (let y = 72; y < H; y++) for (let x = 0; x < W; x++) { const n = r(); b.px(x, y, n < 0.1 ? '#2f5524' : n < 0.2 ? '#447a35' : '#3a6a2e'); }
    for (let y = 90; y < 126; y++) {
      const e = Math.floor(r() * 3);
      for (let x = 30; x < W; x++) {
        if ((y === 90 || y === 125) && (x + e) % 4 === 0) continue;
        const n = r();
        b.px(x, y, n < 0.12 ? P.dirtD : n < 0.2 ? '#b39066' : P.dirt);
      }
    }
    b.rect(0, 14, 34, 116, '#6d727c'); bricks(b, 0, 14, 34, 116, '#565b64'); crenels(b, 0, 10, 34, '#6d727c');
    b.rect(33, 10, 1, 120, '#4a4f58');
    b.rect(18, 78, 15, 48, P.woodD); for (let x = 20; x < 33; x += 3) b.rect(x, 78, 1, 48, P.wood);
    b.rect(18, 92, 15, 1, P.ironD); b.rect(18, 108, 15, 1, P.ironD);
    b.rect(37, 70, 1, 6, P.woodD); b.px(37, 69, P.glow); b.px(37, 68, P.glowL);
    return b.canvas();
  };
})();
