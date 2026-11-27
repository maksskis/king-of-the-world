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
  // Серая кирпичная кладка (Замок, Главные ворота): ряды по 2 пикселя через шов, кирпичи по 5 со сдвигом
  const BRK = { MO: '#43424a', B1: '#8c8b92', B2: '#a4a3aa', B3: '#74737b', BH: '#bebdc4' };
  function brickWall(b, x, y, w, h, dark) {
    b.rect(x, y, w, h, BRK.MO);
    for (let r = 0; r * 3 < h; r++) {
      const yy = y + r * 3, off = r % 2 ? 3 : 0;
      for (let c = -1; c * 6 < w + 6; c++) {
        const x0 = Math.max(x, x + c * 6 + off), x1 = Math.min(x + w, x + c * 6 + off + 5);
        if (x1 <= x0) continue;
        const k = (((c * 7 + r * 3) % 5) + 5) % 5;
        const col = dark ? (k === 0 ? BRK.B1 : BRK.B3) : k === 0 ? BRK.B2 : k === 3 ? BRK.B3 : BRK.B1;
        b.rect(x0, yy, x1 - x0, Math.min(2, y + h - yy), col);
        if (!dark && x1 - x0 > 2) b.px(x0, yy, k === 0 ? BRK.BH : BRK.B2);
      }
    }
  }
  // широкие зубцы
  function brickMerlons(b, x, y, w) { for (let i = 0; i + 3 <= w; i += 5) { b.rect(x + i, y, 3, 3, BRK.B1); b.rect(x + i, y, 3, 1, BRK.BH); } }
  // башня с широкой зубчатой верхушкой
  function brickTower(b, x, y, w, h) {
    brickWall(b, x, y, w, h, false);
    b.rect(x - 1, y - 3, w + 2, 3, BRK.B1); b.rect(x - 1, y - 3, w + 2, 1, BRK.BH); b.rect(x - 1, y, w + 2, 1, BRK.MO);
    brickMerlons(b, x - 1, y - 6, w + 2);
  }

  function tierCols(t) {
    return [[P.iron, P.ironD, P.ironL], [P.bone, P.boneD, P.boneL], [P.mith, P.mithD, P.mithL], [P.red, P.redD, P.gold], ['#8a7dff', '#4a3cb0', '#e0dcff']][t] || [P.iron, P.ironD, P.ironL];
  }
  const GEM = [P.cry, P.red, P.mith, P.gold, '#c08aff'];

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
  // Адамантий: тёмный слиток с сине-фиолетовым отливом
  DEF.r_adamant = { w: 12, h: 12, draw(b) { b.poly([[1, 8], [4, 3], [11, 3], [8, 8]], '#4a3cb0'); b.poly([[1, 8], [8, 8], [8, 11], [1, 11]], '#2c2270'); b.poly([[8, 8], [11, 3], [11, 6], [8, 11]], '#3a2e90'); b.line(4, 4, 9, 4, '#e0dcff'); b.px(3, 6, '#8a7dff'); b.px(6, 9, '#8a7dff'); } };
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
  // кружка с пеной — отдых рабочих («Сытный обед», «Выносливость рода»)
  DEF.i_mug = { w: 12, h: 12, draw(b) { b.rect(2, 3, 6, 8, P.wood); b.rect(2, 3, 1, 8, P.woodL); b.rect(2, 6, 6, 1, P.woodD); b.rect(2, 9, 6, 1, P.woodD); b.rect(8, 5, 2, 1, P.woodD); b.rect(9, 5, 1, 4, P.woodD); b.rect(8, 8, 2, 1, P.woodD); b.rect(1, 1, 8, 2, P.white); b.px(2, 0, P.white); b.px(5, 0, P.white); b.px(7, 3, P.white); } };
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
  DEF.i_ship = { w: 12, h: 12, draw(b) { b.rect(5, 1, 1, 8, P.woodD); b.poly([[6, 1.5], [10.5, 7], [6, 7]], P.plaster); b.poly([[5, 2], [1.5, 7], [5, 7]], P.plasterD); b.poly([[0.5, 8], [11.5, 8], [9.5, 11], [2.5, 11]], P.wood); b.rect(1, 8, 11, 1, P.woodL); b.px(6, 0, P.red); b.px(7, 0, P.red); } };
  DEF.i_tower = { w: 12, h: 12, draw(b) { b.rect(3, 3, 6, 8, P.stone); crenels(b, 3, 1, 7, P.stone); b.rect(5, 7, 2, 4, P.woodD); b.rect(5, 4, 2, 1, P.dark); } };

  // ---------- предметы (16×16), аргумент — тир ----------
  DEF.it_sword = { w: 16, h: 16, draw(b, t) { const [m, d, l] = tierCols(+t); for (let i = 0; i < 8; i++) { b.px(5 + i, 10 - i, l); b.px(6 + i, 10 - i, m); b.px(6 + i, 11 - i, d); } b.line(3, 9, 7, 13, P.gold); b.px(7, 13, P.goldD); b.px(4, 12, P.woodD); b.px(3, 13, P.woodD); b.px(2, 14, P.gold); } };
  DEF.it_bow = { w: 16, h: 16, draw(b, t) { const [m] = tierCols(+t); for (let y = 1; y <= 14; y++) { const s = Math.sin((Math.PI * (y - 1)) / 13); const x = Math.round(10 - 6 * s); b.px(x, y, P.woodD); b.px(x + 1, y, P.wood); } b.rect(12, 1, 1, 14, '#e8e8e8'); b.rect(4, 6, 2, 4, m); b.px(10, 1, m); b.px(10, 14, m); } };
  DEF.it_staff = { w: 16, h: 16, draw(b, t) { const [m] = tierCols(+t); b.line(3, 14, 10, 7, P.woodD); b.line(4, 14, 11, 7, P.wood); b.px(9, 6, m); b.px(13, 6, m); b.px(10, 7, m); b.px(12, 7, m); b.disc(11.5, 4, 2.6, GEM[+t] || P.cry); b.px(11, 3, P.white); } };
  DEF.it_mace = { w: 16, h: 16, draw(b, t) { const [m, d, l] = tierCols(+t); b.line(2, 14, 8, 8, P.woodD); b.line(3, 14, 9, 8, P.wood); b.disc(10.5, 5.5, 3.3, m); b.px(10, 1, d); b.px(14, 5, d); b.px(6, 6, d); b.px(13, 2, d); b.px(7, 2, d); b.px(13, 8, d); b.px(9, 4, l); b.px(10, 4, l); } };
  DEF.it_armor = { w: 16, h: 16, draw(b, t) { const [m, d, l] = tierCols(+t); b.poly([[2, 3], [5.5, 2], [10.5, 2], [14, 3], [14, 7], [12, 7.5], [12, 14], [4, 14], [4, 7.5], [2, 7]], m); b.rect(8, 4, 1, 9, d); b.rect(4, 11, 8, 1, P.woodD); b.rect(7, 11, 2, 1, P.gold); b.px(5, 4, l); b.px(5, 5, l); b.px(3, 4, l); for (let x = 6; x < 10; x++) b.px(x, 2, null); b.px(7, 3, null); b.px(8, 3, null); } };

  // Кинжал и тотем — оружие разбойника и шамана
  DEF.it_dagger = { w: 16, h: 16, draw(b, t) { const [m, d, l] = tierCols(+t); for (let i = 0; i < 6; i++) { b.px(7 + i, 8 - i, l); b.px(8 + i, 8 - i, m); b.px(8 + i, 9 - i, d); } b.line(5, 8, 8, 11, P.gold); b.px(6, 11, P.woodD); b.px(5, 12, P.woodD); b.px(4, 13, P.wood); b.px(3, 14, P.gold); } };
  DEF.it_totem = { w: 16, h: 16, draw(b, t) {
    const [m] = tierCols(+t);
    b.rect(7, 6, 2, 9, P.woodD); b.rect(7, 6, 1, 9, P.wood); b.rect(7, 10, 2, 1, m);
    b.poly([[5, 2], [1.5, 1], [2.5, 4.5], [5, 4.5]], m); b.poly([[11, 2], [14.5, 1], [13.5, 4.5], [11, 4.5]], m);
    b.rect(5, 1, 6, 5, P.wood); b.rect(5, 1, 6, 1, P.woodL); b.px(6, 3, P.k); b.px(9, 3, P.k); b.rect(7, 4, 2, 1, P.k); b.px(7, 1, GEM[+t] || P.cry); b.px(8, 1, GEM[+t] || P.cry);
    b.px(6, 7, P.red); b.px(6, 8, P.red); b.px(9, 7, P.white); b.px(9, 8, P.white);
  } };

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
  DEF.c_rogue = { w: 16, h: 16, draw(b) {
    b.rect(5, 12, 2, 3, '#2c2638'); b.rect(9, 12, 2, 3, '#2c2638');
    b.poly([[4, 7], [12, 7], [12.5, 13], [3.5, 13]], '#4a4058'); b.rect(4, 10, 8, 1, P.woodD); b.px(8, 10, P.gold);
    b.disc(8, 4.6, 3.4, '#2c2638'); b.disc(8, 5.2, 2.1, P.skin); b.rect(6, 6, 4, 1, '#2c2638'); b.px(7, 5, P.k); b.px(9, 5, P.k);
    b.px(10, 7, P.red); b.px(11, 8, P.red);
    b.line(12, 8, 14, 5, P.ironL); b.px(12, 9, P.woodD); b.px(13, 8, P.gold);
    b.line(4, 8, 2, 5, P.ironL); b.px(4, 9, P.woodD); b.px(3, 8, P.gold);
  } };
  DEF.c_shaman = { w: 16, h: 16, draw(b) {
    b.rect(5, 12, 2, 3, P.woodD); b.rect(9, 12, 2, 3, P.woodD);
    b.poly([[4, 7], [12, 7], [13, 14.5], [3, 14.5]], '#7a5a3a'); b.rect(4, 7, 8, 1, P.boneL); b.px(6, 10, '#3fb8c8'); b.px(8, 10, '#3fb8c8'); b.px(10, 10, '#3fb8c8');
    b.disc(8, 4.8, 2.5, P.skin); b.px(7, 5, P.k); b.px(9, 5, P.k); b.px(6, 6, '#3fb8c8'); b.px(10, 6, '#3fb8c8');
    b.rect(5, 2, 6, 1, P.wood); b.px(5, 1, P.red); b.px(6, 0, P.white); b.px(8, 0, P.red); b.px(10, 0, P.white); b.px(11, 1, P.green);
    b.rect(13, 4, 1, 11, P.woodD); b.disc(13.5, 2.6, 1.7, '#7fe7ff'); b.px(12, 5, P.red); b.px(12, 6, P.white);
    b.px(1, 7, '#7fe7ff'); b.px(2, 5, '#7fe7ff');
  } };
  DEF.c_folk = { w: 16, h: 16, draw(b) {
    b.rect(3, 12, 2, 3, P.woodD); b.rect(6, 12, 2, 3, P.woodD); b.rect(10, 12, 2, 3, P.woodD); b.rect(12, 12, 2, 3, P.woodD);
    b.rect(2, 7, 7, 6, P.leafD); b.rect(2, 10, 7, 1, P.woodD); b.disc(5.5, 4.6, 2.3, P.skin); b.rect(3, 2, 5, 1, P.wood); b.rect(4, 1, 3, 1, P.wood); b.px(4, 5, P.k); b.px(6, 5, P.k);
    b.poly([[9, 8], [14, 8], [14.5, 13], [8.5, 13]], P.red); b.rect(9, 8, 5, 1, P.robe); b.disc(11.5, 5.4, 2.1, P.skin); b.rect(9, 3, 5, 2, P.boneL); b.px(11, 6, P.k); b.px(12, 6, P.k);
  } };
  DEF.c_king = { w: 16, h: 16, draw(b) {
    b.poly([[3, 7], [13, 7], [14, 14.5], [2, 14.5]], P.red); b.rect(3, 7, 10, 2, P.robe); b.rect(7, 9, 2, 6, P.gold);
    b.disc(8, 4.8, 2.6, P.skin); b.poly([[6, 6], [10, 6], [8, 9]], P.boneD); b.px(7, 5, P.k); b.px(9, 5, P.k);
    b.rect(5, 1, 6, 2, P.gold); b.px(5, 0, P.gold); b.px(8, 0, P.gold); b.px(10, 0, P.gold); b.px(7, 1, P.red);
  } };
  // Рабочий у здания: облик — по зданию. Добывают: лесоруб (Лесопилка), каменотёс (Каменоломня), шахтёр (Шахта),
  // сборщик налогов (Замок). Ускоряют: учёный (Академия), кузнец (Кузница), гладиатор (Арена), вербовщик (Гильдия),
  // воин (Катакомбы). Четыре кадра 16×16: бег в наклоне, удар о стену (вспышка, пыль), два шага прогулки. Смотрит вправо.
  const WK_LOOK = {
    lumber: { shirt: '#b0392e', trim: '#c85a48', check: '#7a2620', legs: '#4a3a2a', hat: 'knit', hatC: '#3f7a3a', beard: '#6a3e1e', back: 'axe' },
    quarry: { shirt: '#8c8c94', trim: '#aeb0b8', apron: '#7a5a3a', legs: '#5a4a3a', hat: 'cap', hatC: '#8a6a40', back: 'pick' },
    mine: { shirt: '#4a5468', trim: '#5e6a80', legs: '#3a4252', hat: 'miner', hatC: '#c8a040', soot: '#4a3e38', back: 'pick' },
    castle: { shirt: '#3a5aa8', trim: P.gold, legs: '#2a3a6a', hat: 'beret', hatC: '#7a2a6a', back: 'bag' },
    academy: { shirt: '#6a4a9a', trim: '#8a6ac0', robe: true, hat: 'hood', hatC: '#5a3a88', back: 'book' },
    forge: { shirt: '#3a3640', trim: '#4a4650', apron: '#6a4426', bare: true, legs: '#2a2630', hat: 'band', hatC: '#b0392e', beard: '#2a2020', back: 'hammer' },
    arena: { shirt: '#a83232', trim: '#d8b040', legs: '#6a3a2a', hat: 'crest', hatC: '#c08a3a', back: 'sword' },
    tavern: { shirt: '#3a7a4a', trim: '#5a9a5a', legs: '#4a3a2a', hat: 'feather', hatC: '#2a4a2a', back: 'flag' },
    dungeon: { shirt: P.iron, trim: P.ironL, legs: '#4a4a58', hat: 'helm', hatC: P.iron, armor: true, back: 'shield' },
  };
  // позы: корпус (bx, by, bw, bh; lean — верх корпуса подан вперёд), голова (hx, hy), ноги, руки, точка предмета за спиной
  const WK_POSE = [
    { lean: 1, bx: 4, by: 7, bw: 6, bh: 6, hx: 10, hy: 4.8, legs: [[3, 13, 2, 2], [2, 14, 1, 1], [9, 12, 2, 2], [10, 14, 2, 1]], arms: [[11, 8], [12, 9]], back: [5, 5] },
    { bx: 7, by: 7, bw: 6, bh: 6, hx: 11.5, hy: 4.6, legs: [[5, 12, 2, 3], [9, 13, 2, 2], [4, 14, 1, 1]], arms: [[13, 8], [13, 9]], back: [7, 5] },
    { bx: 5, by: 7, bw: 6, bh: 6, hx: 8, hy: 4.6, legs: [[5, 12, 2, 3], [9, 13, 2, 2], [10, 14, 1, 1]], arms: [[5, 9], [10, 10]], back: [6, 5] },
    { bx: 5, by: 7, bw: 6, bh: 5, hx: 8, hy: 4.9, legs: [[6, 13, 2, 2], [5, 14, 1, 1], [8, 12, 2, 3]], arms: [[5, 10], [10, 9]], back: [6, 5] },
  ];
  // предмет за спиной: инструмент или знак ремесла
  function wkBack(b, kind, x, y) {
    if (kind === 'axe' || kind === 'pick' || kind === 'hammer') {
      b.line(x, y, x - 2, y + 5, P.wood);
      if (kind === 'axe') { b.rect(x - 1, y - 1, 2, 2, P.ironL); b.px(x + 1, y, P.iron); }
      else if (kind === 'pick') b.line(x - 2, y, x + 2, y - 1, P.iron);
      else b.rect(x - 1, y - 1, 3, 2, P.iron);
    } else if (kind === 'bag') { b.disc(x - 1.5, y + 3, 2.1, P.goldD); b.px(x - 2, y + 2, P.gold); b.px(x - 1, y + 1, P.woodD); }
    else if (kind === 'book') { b.rect(x - 3, y + 1, 3, 4, '#3a5aa8'); b.rect(x - 3, y + 1, 3, 1, '#6a8ad8'); b.px(x - 1, y + 2, P.white); b.px(x - 1, y + 3, P.white); }
    else if (kind === 'sword') { b.line(x, y - 2, x - 2, y + 4, P.ironL); b.px(x - 2, y + 5, P.woodD); b.px(x - 3, y + 4, P.gold); b.px(x - 1, y + 4, P.gold); }
    else if (kind === 'flag') { b.line(x - 1, y - 3, x - 1, y + 6, P.wood); b.rect(x - 4, y - 3, 3, 2, '#d8b040'); b.px(x - 4, y - 1, '#d8b040'); }
    else if (kind === 'shield') { b.rect(x - 4, y + 1, 4, 5, '#3a5aa8'); b.rect(x - 4, y + 1, 4, 1, '#6a8ad8'); b.px(x - 2, y + 3, P.gold); b.px(x, y - 1, P.ironL); b.px(x + 1, y - 2, P.ironL); }
  }
  DEF.wk = { w: 64, h: 16, draw(b, k) {
    const L = WK_LOOK[k] || WK_LOOK.quarry;
    WK_POSE.forEach((p, f) => {
      const o = 16 * f, X = (x) => o + x;
      const hx = Math.round(p.hx), hy = Math.round(p.hy);
      // пиксель корпуса: в наклоне верхние 3 строки сдвинуты вперёд на 1
      const bp = (dx, dy, c) => b.px(X(p.bx + dx + (p.lean && dy < 3 ? 1 : 0)), p.by + dy, c);
      const brow = (dy, c) => { for (let i = 0; i < p.bw; i++) bp(i, dy, c); };
      wkBack(b, L.back, X(p.back[0]), p.back[1]);
      // ноги; у учёного — мантия до земли
      if (!L.robe) for (const [x, y, w, h] of p.legs) b.rect(X(x), y, w, h, L.legs);
      const bh = L.robe ? 15 - p.by : p.bh;
      for (let dy = 0; dy < bh; dy++) brow(dy, L.shirt);
      brow(0, L.trim);
      if (L.robe) { brow(bh - 1, L.trim); bp(p.bw - 2, 2, L.trim); bp(p.bw - 2, 4, L.trim); }
      else if (L.armor) { brow(3, P.ironD); bp(p.bw - 1, 0, P.white); bp(2, 1, P.ironD); bp(2, 2, P.ironD); }
      else brow(3, P.woodD);
      if (L.check) { bp(1, 1, L.check); bp(3, 1, L.check); bp(5, 1, L.check); bp(2, 4, L.check); bp(4, 4, L.check); }
      if (L.apron) for (let dy = 1; dy < bh; dy++) { bp(p.bw - 3, dy, L.apron); bp(p.bw - 2, dy, L.apron); bp(p.bw - 1, dy, L.apron); }
      // руки: голые у кузнеца, в латах у воина
      const arm = L.armor ? P.ironL : L.bare ? P.skin : P.skin;
      for (const [x, y] of p.arms) b.px(X(x), y, arm);
      if (L.bare) for (const [x, y] of p.arms) b.px(X(x - 1), y, P.skin);
      // голова и головной убор
      const c = L.hatC;
      if (L.hat === 'hood') {
        b.disc(X(p.hx - 0.6), p.hy - 0.3, 2.8, c); b.px(X(hx - 2), hy - 4, c);
        b.rect(X(hx), hy - 1, 2, 3, P.skin); b.px(X(hx + 1), hy, P.k);
      } else {
        b.disc(X(p.hx), p.hy, 2.3, P.skin); b.px(X(hx + 1), hy, P.k);
      }
      if (L.hat === 'knit') { b.rect(X(hx - 2), hy - 3, 5, 2, c); b.px(X(hx), hy - 4, P.white); }
      else if (L.hat === 'cap') { b.rect(X(hx - 2), hy - 3, 5, 1, c); b.rect(X(hx - 1), hy - 4, 3, 1, c); b.px(X(hx + 3), hy - 2, c); }
      else if (L.hat === 'miner') { b.rect(X(hx - 2), hy - 4, 5, 2, c); b.rect(X(hx - 3), hy - 2, 7, 1, '#9a7a30'); b.px(X(hx + 2), hy - 3, P.glowL); b.px(X(hx + 3), hy - 3, P.glow); }
      else if (L.hat === 'beret') { b.rect(X(hx - 3), hy - 3, 6, 1, c); b.rect(X(hx - 2), hy - 4, 4, 1, c); b.px(X(hx - 3), hy - 4, P.white); b.px(X(hx - 4), hy - 5, P.white); }
      else if (L.hat === 'band') { b.rect(X(hx - 2), hy - 2, 5, 1, c); b.px(X(hx - 3), hy - 1, c); }
      else if (L.hat === 'crest') { b.rect(X(hx - 2), hy - 3, 5, 2, c); b.px(X(hx + 2), hy - 1, c); b.rect(X(hx - 2), hy - 5, 4, 1, '#d83a3a'); b.px(X(hx - 3), hy - 4, '#d83a3a'); }
      else if (L.hat === 'feather') { b.rect(X(hx - 3), hy - 2, 7, 1, c); b.rect(X(hx - 1), hy - 4, 3, 2, c); b.line(X(hx - 2), hy - 5, X(hx - 4), hy - 3, '#d83a3a'); }
      else if (L.hat === 'helm') { b.rect(X(hx - 2), hy - 3, 5, 4, c); b.rect(X(hx - 2), hy - 3, 5, 1, P.ironL); b.rect(X(hx), hy, 3, 1, P.k); }
      if (L.beard) { b.rect(X(hx - 1), hy + 1, 3, 2, L.beard); b.px(X(hx + 1), hy + 1, L.beard); }
      if (L.soot) { b.px(X(hx), hy + 1, L.soot); b.px(X(hx - 1), hy, L.soot); }
      // удар: вспышка на стене и пыль; бег — пыль из-под ног
      if (f === 1) {
        b.px(X(15), 3, P.glowL); b.px(X(14), 2, P.glow); b.px(X(15), 6, P.white); b.px(X(14), 7, P.glowL);
        b.px(X(15), 9, P.glow); b.px(X(15), 12, P.glowL); b.px(X(13), 0, P.glowL);
        b.px(X(2), 14, P.dirtL); b.px(X(3), 13, P.dirtL); b.px(X(1), 12, P.dirtL); b.px(X(12), 14, P.dirtL);
      } else if (f === 0) { b.px(X(1), 13, P.dirtL); b.px(X(0), 12, P.dirtL); }
    });
  } };
  // Что вылетает из здания при ударе рабочего (12×12): wood — щепки, stone — камешки, iron — искры и окалина,
  // gold — монеты, book — листки и искра, spark — искры кузни, dust — пыль, bone — косточки, star — звёздочки
  DEF.wkfx = { w: 12, h: 12, draw(b, t) {
    const C = {
      wood: [P.wood, P.woodL, P.woodD], stone: [P.stoneL || '#b8b0a8', '#8a8480', '#d8d2cc'], iron: [P.glowL, P.glow, P.ironL],
      gold: [P.gold, P.goldL, P.goldD], book: [P.white, '#9ad0ff', P.white], spark: [P.glowL, P.glow, '#ff6a2a'],
      dust: [P.dirtL, P.dirt, P.dirtL], bone: [P.boneL || '#eee4cc', P.white, P.boneL || '#eee4cc'], star: [P.gold, P.goldL, P.white],
    }[t] || [P.dirtL, P.dirt, P.dirtL];
    const pts = [[2, 3], [6, 1], [9, 4], [1, 8], [5, 6], [10, 9], [7, 10], [3, 11]];
    pts.forEach(([x, y], i) => {
      const c = C[i % 3];
      if (t === 'gold' && i % 3 === 0) { b.rect(x, y, 2, 2, c); b.px(x, y, P.goldL); }
      else if (t === 'wood' || t === 'stone' || t === 'bone') { b.rect(x, y, 2, 1, c); if (i % 2) b.px(x + 1, y + 1, C[2]); }
      else b.px(x, y, c);
    });
    if (t === 'star' || t === 'book' || t === 'spark' || t === 'iron') { b.px(5, 5, C[0]); b.px(4, 5, C[1]); b.px(6, 5, C[1]); b.px(5, 4, C[1]); b.px(5, 6, C[1]); }
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
  // Древний дракон: крупнее и грозней, цвета — из выбранного облика города (тёмная чешуя, крылья цвета крыш,
  // глаза и пламя — цвета огней в окнах, рога и когти — камень обрамлений, шипы — навершия); «Классика» — красный
  DEF.m_dragon = { w: 64, h: 48, draw(b) {
    const S = G.GOTH && G.GOTH.style(G.SPR.style());
    const K = S ? { body: S.B1, dark: S.MO, hi: S.BH, mid: S.B2, wing: S.RD, wingL: S.R, wingH: S.RL, eye: S.GL, eyeL: S.GLL, horn: S.TL, hornD: S.T, spike: S.FI, belly: S.TD }
      : { body: P.red, dark: P.redD, hi: P.redL, mid: '#a83030', wing: P.redD, wingL: P.red, wingH: P.redL, eye: P.gold, eyeL: P.goldL, horn: P.boneL, hornD: P.boneD, spike: P.gold, belly: P.glowL };
    // дальнее крыло
    b.poly([[34, 20], [44, 4], [52, 2], [50, 10], [58, 9], [52, 18], [42, 24]], K.dark);
    // ближнее крыло: перепонка и кости-пальцы
    b.poly([[30, 22], [36, 6], [46, 0], [63, 3], [55, 9], [62, 13], [52, 16], [57, 22], [44, 24]], K.wing);
    b.poly([[33, 21], [38, 8], [46, 3], [58, 5], [50, 10], [56, 14], [48, 16], [51, 21], [42, 23]], K.wingL);
    b.line(36, 7, 46, 0, K.wingH); b.line(46, 0, 63, 3, K.wingH); b.line(40, 12, 58, 5, K.hornD); b.line(40, 15, 56, 14, K.hornD); b.line(41, 19, 51, 21, K.hornD);
    // хвост с шипом
    b.poly([[46, 30], [56, 32], [62, 38], [63, 43], [58, 40], [52, 36], [44, 35]], K.body);
    b.poly([[58, 40], [63, 38], [63, 46], [59, 45]], K.spike);
    // тело и брюхо
    b.ellipse(36, 31, 13, 9, K.body); b.ellipse(34, 28, 9, 4, K.mid);
    b.ellipse(33, 36, 10, 3.5, K.belly); for (let x = 25; x < 42; x += 3) b.rect(x, 34, 1, 5, K.dark);
    // задняя лапа и передняя лапа с когтями
    b.poly([[42, 34], [49, 37], [49, 45], [44, 45], [44, 40], [40, 38]], K.body); b.rect(43, 45, 7, 2, K.dark);
    b.px(43, 47, K.horn); b.px(46, 47, K.horn); b.px(49, 47, K.horn);
    b.poly([[24, 34], [29, 35], [27, 44], [22, 44]], K.body); b.rect(20, 44, 8, 2, K.dark);
    b.px(20, 46, K.horn); b.px(23, 46, K.horn); b.px(26, 46, K.horn);
    // шея
    b.poly([[26, 27], [16, 14], [22, 11], [33, 24]], K.body); b.line(18, 13, 30, 25, K.hi);
    // голова: вытянутая морда, нижняя челюсть с клыками
    b.poly([[1, 19], [8, 13], [18, 10], [23, 14], [20, 19], [10, 21]], K.body);
    b.poly([[3, 21], [12, 21], [19, 19], [16, 24], [6, 24]], K.mid);
    b.rect(4, 20, 9, 1, '#0d0a12');
    for (const x of [5, 8, 11]) { b.px(x, 19, '#ffffff'); b.px(x + 1, 21, '#ffffff'); }
    b.px(2, 18, K.dark); b.px(3, 17, K.dark); // ноздря
    // рога назад-вверх и гребень
    b.poly([[15, 11], [25, 1], [27, 2], [19, 12]], K.horn); b.line(17, 11, 25, 3, K.hornD);
    b.poly([[19, 12], [30, 6], [30, 8], [21, 14]], K.horn);
    for (const [x, y] of [[24, 13], [27, 16], [30, 19], [34, 22], [38, 22], [42, 23], [46, 26], [50, 29]]) b.poly([[x - 1.5, y + 1], [x, y - 3], [x + 1.5, y + 1]], K.spike);
    // горящий глаз и угли из пасти
    b.rect(13, 13, 3, 2, K.eye); b.px(14, 13, K.eyeL); b.px(12, 14, '#0d0a12');
    b.px(0, 20, K.eye); b.px(1, 22, K.eyeL); b.px(0, 23, K.eye);
  } };
  // Костяной колосс — страж 25-го этажа: великан-скелет с рогами и костяной палицей
  DEF.m_colossus = { w: 30, h: 32, draw(b) {
    const bn = P.bone, bd = P.boneD;
    b.rect(10, 23, 3, 8, bn); b.rect(17, 23, 3, 8, bn); b.rect(9, 30, 5, 2, bd); b.rect(16, 30, 5, 2, bd);
    b.rect(9, 20, 12, 3, bd);
    b.ellipse(15, 14, 8, 7, bn); for (let y = 10; y < 20; y += 2) b.rect(8, y, 14, 1, bd); b.rect(14, 8, 2, 13, bd);
    b.disc(15, 14, 1.6, P.ghost);
    b.line(22, 11, 27, 19, bn); b.line(23, 11, 28, 19, bd);
    b.line(8, 11, 4, 17, bn); b.line(7, 11, 3, 17, bd);
    b.ellipse(3, 21, 3, 5, bn); b.px(2, 19, bd); b.px(4, 22, bd); b.px(3, 24, bd);
    b.disc(15, 5, 5, bn); b.rect(11, 4, 3, 2, P.k); b.rect(16, 4, 3, 2, P.k); b.px(12, 5, '#ff3b3b'); b.px(17, 5, '#ff3b3b');
    b.rect(12, 8, 7, 2, bd); for (let x = 12; x < 19; x += 2) b.px(x, 8, P.white);
    b.poly([[11, 2], [6, -1], [9, 4]], bd); b.poly([[19, 2], [24, -1], [21, 4]], bd);
  } };
  // Демон бездны — страж 50-го этажа: багровый, с перепончатыми крыльями, рогами и огнём в лапе
  DEF.m_demon = { w: 32, h: 32, draw(b) {
    const c = '#5a1418', cl = '#8a2222', cd = '#3a0c10';
    b.poly([[12, 11], [1, 3], [3, 12], [0, 17], [10, 17]], cd); b.poly([[20, 11], [31, 3], [29, 12], [32, 17], [22, 17]], cd);
    b.line(1, 3, 10, 15, P.redD); b.line(31, 3, 22, 15, P.redD);
    b.line(22, 25, 28, 28, c); b.poly([[28, 26], [31, 28], [28, 30]], P.redD);
    b.rect(11, 24, 3, 6, cd); b.rect(18, 24, 3, 6, cd); b.rect(10, 30, 4, 2, P.k); b.rect(18, 30, 4, 2, P.k);
    b.ellipse(16, 18, 7, 8, c); b.ellipse(15, 17, 4, 5, cl);
    b.line(10, 15, 5, 19, c); b.line(10, 16, 5, 20, c); b.px(4, 20, P.boneL); b.px(4, 18, P.boneL);
    b.disc(4, 21, 2.2, P.glow); b.px(4, 20, P.glowL); b.px(3, 18, P.glow);
    b.disc(15, 9, 4.5, c); b.rect(12, 11, 6, 1, P.k); b.px(13, 11, P.white); b.px(16, 11, P.white);
    b.px(13, 8, P.glowL); b.px(17, 8, P.glowL);
    b.poly([[11, 7], [7, 0], [12, 5]], P.boneD); b.poly([[19, 7], [23, 0], [18, 5]], P.boneD);
  } };
  // Повелитель кошмаров — страж 75-го этажа: тень в рваном капюшоне с косой и фиолетовым светом
  DEF.m_wraith = { w: 28, h: 32, draw(b) {
    const r = '#1a1426', rl = '#2c2240', glow = '#c08aff';
    b.line(5, 3, 10, 31, P.woodD);
    b.poly([[3, 2], [13, 0], [15, 2], [6, 4], [2, 8]], P.ironL); b.line(3, 7, 7, 3, P.ironD);
    b.poly([[10, 5], [18, 5], [23, 30], [19, 27], [16, 31], [13, 27], [10, 31], [7, 27]], r);
    b.poly([[12, 7], [16, 7], [19, 26], [14, 24]], rl);
    b.line(11, 14, 8, 17, r); b.line(11, 15, 8, 18, r);
    b.disc(14, 7, 5, r); b.disc(13.5, 8, 3, '#05030a'); b.px(12, 8, glow); b.px(15, 8, glow);
    for (const [x, y] of [[3, 14], [24, 10], [22, 20], [2, 24], [25, 27]]) b.px(x, y, glow);
  } };
  // Страж драконьего сна — страж 100-го этажа: каменный рыцарь в чешуйчатых латах с огненными трещинами,
  // щит с гербом дракона и двуручный меч; его поражение будит Древнего дракона
  DEF.m_warden = { w: 32, h: 34, draw(b) {
    const st = '#3a3440', sp = '#4a4250', sl = '#5e5468';
    b.rect(11, 26, 4, 7, st); b.rect(18, 26, 4, 7, st); b.rect(10, 32, 6, 2, P.k); b.rect(17, 32, 6, 2, P.k);
    b.poly([[7, 12], [25, 12], [26, 26], [6, 26]], sp);
    for (let y = 14; y < 26; y += 3) for (let x = 8 + (y % 2); x < 25; x += 4) b.px(x, y, sl);
    b.line(10, 15, 13, 22, P.glow); b.line(20, 14, 18, 20, P.glow); b.px(16, 24, P.glowL);
    b.rect(26, 12, 3, 10, sp); b.line(29, 1, 29, 27, P.ironL); b.line(30, 1, 30, 27, P.ironD); b.rect(27, 21, 5, 1, P.goldD);
    b.rect(12, 4, 9, 8, sl); b.rect(13, 7, 7, 1, P.glow); b.px(16, 7, P.glowL);
    b.poly([[12, 5], [8, 0], [13, 4]], P.gold); b.poly([[21, 5], [25, 0], [20, 4]], P.gold);
    b.poly([[1, 13], [10, 13], [10, 24], [5.5, 29], [1, 24]], P.goldD); b.poly([[2.5, 14.5], [8.5, 14.5], [8.5, 23], [5.5, 27], [2.5, 23]], P.redD);
    b.px(5, 17, P.gold); b.px(4, 18, P.gold); b.px(6, 18, P.gold); b.px(5, 19, P.gold); b.px(5, 21, P.gold);
  } };

  // ---------- здания 3/4 (48×48), аргумент — облик 1..4: меняется на 3, 5 и 7 уровнях ----------
  DEF.b_lumber = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    treeTop(b, 7, 14, 6); treeTop(b, 41, 12, 6);
    if (t >= 3) treeTop(b, 40, 27, 5);
    if (t >= 3) roof3q(b, 11, 12, 24, 12, P.roof, P.roofD, P.roofL);
    else roof3q(b, 11, 12, 24, 12, P.woodM, P.woodD, P.woodL);
    brickWall(b, 12, 24, 22, 14, false); // кирпич, как у Замка
    b.rect(20, 29, 6, 9, P.woodD); b.px(24, 33, P.gold);
    windowLit(b, 14, 27, 4, 3); windowLit(b, 28, 27, 4, 3);
    for (const [x, y] of [[5, 41], [9, 41], [7, 38]]) { b.disc(x, y, 2.2, P.woodL); b.px(x - 0.5, y - 0.5, P.woodD); }
    if (t >= 2) for (const [x, y] of [[13, 42], [11, 39]]) { b.disc(x, y, 2.2, P.woodL); b.px(x - 0.5, y - 0.5, P.woodD); }
    b.rect(37, 38, 7, 5, P.wood); b.rect(37, 37, 7, 2, P.woodL); b.line(40, 32, 40, 37, P.woodD); b.rect(38, 31, 4, 2, P.ironL);
    if (t >= 2) { b.disc(37, 20, 3, t >= 4 ? P.gold : P.ironL); b.px(37, 20, P.ironD); }
    if (t >= 4) { b.rect(23, 3, 1, 10, P.woodD); b.poly([[24, 3], [30, 4.5], [24, 6]], P.green); b.px(26, 4, P.gold); b.rect(1, 44, 12, 2, P.woodL); b.rect(2, 43, 10, 1, P.wood); }
  } };
  DEF.b_quarry = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    b.poly([[2, 40], [4, 22], [12, 10], [24, 8], [34, 12], [40, 22], [44, 40]], P.stoneD);
    b.poly([[6, 26], [13, 13], [24, 11], [30, 14], [22, 20], [12, 28]], P.stone);
    b.poly([[13, 13], [24, 11], [20, 15]], P.stoneL);
    b.rect(14, 28, 20, 12, P.dirtD); b.rect(14, 28, 20, 1, P.dirt);
    brickWall(b, 16, 32, 7, 6, false); brickWall(b, 25, 33, 6, 5, false); // штабеля кирпича
    b.line(7, 44, 12, 37, P.wood); b.poly([[9, 36], [12, 35.5], [15, 38], [14, 39], [12, 37.5], [10, 38]], P.ironL);
    if (t >= 2) { b.rect(38, 6, 2, 30, P.wood); b.rect(28, 6, 12, 2, P.wood); b.line(31, 8, 38, 14, P.woodD); b.rect(30, 8, 1, 10, P.dark); b.rect(28, 18, 5, 4, P.stoneM); }
    if (t >= 3) { b.rect(36, 38, 9, 5, P.woodD); b.rect(37, 36, 7, 2, P.stoneL); b.px(37, 43, P.dark); b.px(43, 43, P.dark); }
    if (t >= 4) { b.rect(39, 0, 1, 6, P.woodD); b.poly([[40, 0], [46, 1.5], [40, 3]], P.blue); b.px(16, 16, P.gold); b.px(19, 18, P.gold); b.px(9, 24, P.gold); b.px(22, 14, P.goldL); b.rect(2, 42, 4, 1, P.woodD); b.px(3, 41, P.glow); b.px(3, 40, P.glowL); }
  } };
  // Шахта: деревянный вход в склон, копёр с колесом, рельсы и вагонетка с синей железной рудой —
  // не путается ни с серой скалой каменоломни, ни с пещерой катакомб
  DEF.b_mine = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    const ore = '#7f93b5', oreL = '#c9d8f0', dirt = '#6b4a2e', dirtL = '#8a6440';
    b.poly([[1, 45], [5, 31], [13, 23], [25, 20], [37, 23], [44, 31], [47, 45]], dirt);
    b.poly([[7, 31], [14, 24.5], [25, 21.5], [36, 24.5], [40, 29], [25, 25], [13, 28]], dirtL);
    b.ellipse(25, 21, 11, 2.5, P.leafD); b.ellipse(23, 20.5, 6, 1.5, P.leaf);
    if (t >= 2) {
      // копёр: деревянная вышка с колесом над стволом
      b.line(17, 26, 25, 5, P.woodD); b.line(18, 26, 26, 5, P.wood); b.line(34, 26, 26, 5, P.woodD); b.line(33, 26, 25, 5, P.wood);
      b.rect(20, 15, 12, 1, P.woodD); b.rect(22, 10, 8, 1, P.woodD);
      b.disc(25.5, 5, 3.6, P.ironD); b.disc(25.5, 5, 2.2, P.iron); b.px(25, 5, P.k); b.px(26, 4, P.k);
      b.line(25, 8, 25, 25, P.k);
    }
    // вход в штольню
    const stone = t >= 4;
    b.rect(19, 27, 14, 15, P.black);
    if (stone) { brickWall(b, 15, 26, 4, 16, false); brickWall(b, 33, 26, 4, 16, false); brickWall(b, 15, 23, 22, 4, false); }
    else { b.rect(17, 26, 2, 16, P.wood); b.rect(33, 26, 2, 16, P.wood); b.rect(16, 24, 20, 3, P.woodL); b.rect(16, 26, 20, 1, P.woodD); }
    // рельсы и вагонетка с рудой
    b.rect(14, 42, 24, 1, P.ironD); b.rect(14, 44, 24, 1, P.ironD); for (let x = 15; x < 38; x += 3) b.rect(x, 42, 1, 3, P.woodD);
    b.poly([[33, 35], [45, 35], [44, 41], [34, 41]], P.ironD); b.rect(33, 35, 12, 1, t >= 4 ? P.gold : P.iron);
    for (const [x, y] of [[36, 34], [39, 33], [42, 34]]) { b.disc(x, y, 1.8, ore); b.px(x - 1, y - 1, oreL); }
    b.px(35, 42, P.k); b.px(43, 42, P.k);
    if (t >= 3) {
      // сарай для инструмента и фонарь у входа
      b.poly([[1, 31], [7, 25], [13, 31]], P.roofD); b.rect(1, 31, 12, 1, P.roof);
      b.rect(2, 32, 10, 9, P.wood); for (let x = 4; x < 12; x += 3) b.rect(x, 32, 1, 9, P.woodD);
      b.rect(5, 35, 3, 6, P.woodD); b.rect(9, 33, 2, 2, P.glow);
      b.rect(15, 28, 1, 4, P.woodD); b.px(15, 27, P.glow); b.px(15, 26, P.glowL);
    }
    if (t >= 4) {
      // флаг, горка руды и вторая вагонетка
      b.rect(7, 17, 1, 8, P.woodD); b.poly([[8, 17], [14, 18.5], [8, 20]], P.blue); b.px(10, 18, P.gold);
      for (const [x, y] of [[4, 44], [7, 43], [10, 44], [6, 41]]) { b.disc(x, y, 1.8, ore); b.px(x - 1, y - 1, oreL); }
      b.poly([[38, 43], [46, 43], [45.5, 47], [38.5, 47]], P.ironD); b.rect(38, 43, 8, 1, P.gold); b.px(42, 42, oreL);
    }
  } };
  DEF.b_warehouse = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    roof3q(b, 5, 8, 38, 16, P.roof, P.roofD, P.roofL);
    b.rect(23, 8, 2, 16, P.roofD);
    brickWall(b, 6, 24, 36, 16, false);
    b.rect(17, 27, 14, 13, P.woodD); b.line(17, 27, 30, 39, P.woodL); b.line(30, 27, 17, 39, P.woodL); b.rect(23, 27, 1, 13, P.k);
    b.rect(1, 34, 6, 6, P.woodL); b.rect(1, 34, 6, 1, P.wood); b.line(1, 34, 6, 39, P.woodD);
    b.rect(41, 34, 6, 6, P.woodL); b.rect(41, 34, 6, 1, P.wood); b.line(46, 34, 41, 39, P.woodD);
    if (t >= 2) { b.rect(2, 29, 5, 5, P.woodL); b.line(2, 29, 6, 33, P.woodD); b.ellipse(44, 31, 3, 3, P.dirtL); b.rect(43, 28, 2, 1, P.woodD); }
    if (t >= 3) { b.rect(22, 2, 1, 7, P.woodD); b.poly([[23, 2], [29, 3.5], [23, 5]], P.blue); b.rect(9, 26, 6, 4, P.glow); b.rect(33, 26, 6, 4, P.glow); }
    if (t >= 4) { b.rect(5, 23, 38, 1, P.gold); b.rect(11, 13, 7, 6, P.wood); b.poly([[10, 13], [14.5, 9], [19, 13]], P.roofD); b.rect(13, 15, 3, 3, P.glow); b.rect(30, 13, 7, 6, P.wood); b.poly([[29, 13], [33.5, 9], [38, 13]], P.roofD); b.rect(32, 15, 3, 3, P.glow); }
  } };
  // Арена: кирпичный амфитеатр с песчаной ареной и арками
  DEF.b_arena = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    const { MO, B1, B3, BH } = BRK, sand = '#d8b26a', sandD = '#b48e4c';
    // внутренний край и песок
    b.ellipse(24, 17, 22, 9, B3); b.ellipse(24, 18, 18, 6.5, sandD); b.ellipse(24, 18.5, 16, 5.2, sand);
    b.px(18, 18, sandD); b.px(29, 19, sandD); b.px(24, 17, P.redD);
    // кирпичный фасад: нижняя половина овала
    brickWall(b, 2, 18, 44, 22, false);
    b.ellipse(24, 40, 22, 5, B1); b.rect(2, 18, 44, 1, BH);
    // два яруса арок
    for (let x = 4; x < 44; x += 6) {
      b.rect(x, 22, 3, 5, MO); b.px(x + 1, 21, MO);
      b.rect(x, 31, 3, 5, MO); b.px(x + 1, 30, MO);
    }
    b.rect(2, 28, 44, 1, B3);
    // ворота
    b.rect(20, 33, 8, 10, P.woodD); b.ellipse(24, 33, 4, 2.5, P.woodD); for (let x = 21; x < 28; x += 2) b.rect(x, 32, 1, 11, P.wood);
    b.rect(20, 36, 8, 1, '#3a3a40'); b.rect(20, 40, 8, 1, '#3a3a40');
    if (t >= 2) {
      // флаги на стене
      for (const x of [6, 24, 42]) { b.rect(x, 2, 1, 9, P.woodD); b.poly([[x + 1, 2], [x + 6, 3.5], [x + 1, 5]], P.red); }
    }
    if (t >= 3) {
      // золотые щиты между арками нижнего яруса
      for (const x of [10, 37]) { b.rect(x, 32, 3, 3, P.gold); b.px(x + 1, 35, P.gold); b.px(x + 1, 33, P.red); }
    }
    if (t >= 4) {
      // навес над трибунами и золотой венок над воротами
      for (let x = 4; x < 44; x += 4) b.rect(x, 9, 2, 3, (x / 4) % 2 ? '#e0602a' : P.white);
      b.disc(24, 29.5, 2.2, P.gold); b.px(24, 29.5, P.goldD);
    }
  } };
  DEF.b_forge = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    brickWall(b, 32, 4, 6, 12, true); b.rect(31, 3, 8, 2, BRK.MO); b.rect(33, 5, 4, 1, P.glow);
    if (t >= 3) { b.px(34, 1, P.glow); b.px(36, 0, P.glowL); b.px(33, 0, P.glow); }
    roof3q(b, 4, 12, 36, 12, P.slate, P.slateD, P.slateL);
    brickWall(b, 5, 24, 34, 16, true);
    b.rect(9, 28, 9, 7, P.glow); b.rect(10, 29, 7, 5, P.glowL); b.rect(13, 28, 1, 7, P.woodD);
    b.rect(24, 28, 9, 12, P.woodD); b.rect(24, 28, 9, 1, P.k); b.px(31, 34, P.gold);
    if (t >= 3) { b.rect(38, 30, 1, 6, P.woodD); b.rect(46, 30, 1, 6, P.woodD); b.poly([[36, 30], [47.5, 27], [47.5, 30], [36, 32]], P.slateL); b.rect(36, 31, 12, 1, P.slateD); }
    b.rect(38, 36, 9, 2, P.iron); b.rect(38, 36, 9, 1, P.ironL); b.rect(40, 38, 5, 4, P.ironD); b.rect(39, 42, 7, 1, P.ironD);
    if (t >= 2) { b.line(41, 31, 44, 35, P.wood); b.rect(40, 30, 3, 2, P.ironL); b.rect(1, 34, 4, 6, P.woodD); b.rect(1, 35, 4, 1, P.ironD); }
    if (t >= 4) { brickWall(b, 10, 4, 5, 10, true); b.rect(9, 3, 7, 2, BRK.MO); b.rect(11, 5, 3, 1, P.glow); b.px(12, 1, P.glow); b.px(11, 0, P.glowL); b.rect(18, 16, 9, 6, P.woodD); b.rect(20, 18, 5, 1, P.gold); b.rect(21, 19, 3, 2, P.gold); b.rect(5, 24, 34, 1, P.gold); }
  } };
  DEF.b_tavern = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    if (t >= 2) { brickWall(b, 34, 2, 4, 8, true); b.rect(33, 1, 6, 2, BRK.MO); }
    roof3q(b, 4, 6, 40, 12, P.roof, P.roofD, P.roofL);
    b.rect(6, 18, 36, 10, P.plaster); for (const x of [6, 15, 24, 33, 41]) b.rect(x, 18, 1, 10, P.woodD); b.rect(6, 27, 36, 1, P.woodD);
    windowLit(b, 9, 20, 4, 4); windowLit(b, 27, 20, 4, 4); windowLit(b, 35, 20, 4, 4);
    brickWall(b, 6, 28, 36, 13, false);
    windowLit(b, 9, 31, 5, 4); windowLit(b, 33, 31, 5, 4);
    b.rect(20, 31, 8, 10, P.woodD); b.px(26, 36, P.gold);
    b.rect(18, 19, 1, 6, P.woodD); b.rect(16, 24, 7, 5, P.blueD); b.line(17, 24, 21, 28, P.ironL); b.line(21, 24, 17, 28, P.ironL); b.rect(18, 25, 3, 2, P.gold); b.px(19, 27, P.gold);
    b.rect(42, 36, 5, 6, P.woodD); b.rect(42, 37, 5, 1, P.ironD); b.rect(42, 40, 5, 1, P.ironD);
    if (t >= 3) { b.rect(20, 9, 8, 6, P.plaster); b.poly([[19, 9], [24, 5], [29, 9]], P.roofD); b.rect(22, 11, 4, 3, P.glow); b.rect(23, 11, 1, 3, P.woodD); b.px(5, 18, P.glowL); b.px(42, 18, P.glowL); b.rect(1, 36, 5, 6, P.woodD); b.rect(1, 37, 5, 1, P.ironD); }
    if (t >= 4) { b.rect(10, 0, 1, 8, P.woodD); b.poly([[11, 0], [17, 1.5], [11, 3]], P.purple); b.px(13, 1, P.gold); for (const x of [9, 27, 35]) { b.rect(x, 24, 4, 1, P.leaf); b.px(x, 23, P.redL); b.px(x + 2, 23, P.gold); b.px(x + 3, 23, P.redL); } b.rect(18, 25, 3, 2, P.goldL); b.px(19, 27, P.goldL); }
  } };
  DEF.b_barracks = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    roof3q(b, 3, 10, 34, 12, P.roofD, '#5a1f1b', P.roof);
    brickWall(b, 4, 22, 32, 18, false);
    b.rect(16, 29, 8, 11, P.woodD); b.rect(8, 26, 3, 4, P.dark); b.rect(29, 26, 3, 4, P.dark);
    b.rect(41, 4, 1, 36, P.woodD); b.rect(42, 5, 5, 10, P.red); b.poly([[42, 14.5], [47, 14.5], [44.5, 17]], P.red); b.rect(43, 8, 3, 3, P.gold);
    b.rect(38, 35, 1, 8, P.wood); b.rect(36, 37, 5, 1, P.wood); b.disc(38.5, 33, 2, P.dirtL);
    if (t >= 2) { b.disc(12, 24.5, 1.8, P.blue); b.disc(28, 24.5, 1.8, P.blue); b.line(1, 32, 1, 43, P.wood); b.px(1, 31, P.ironL); b.line(3, 33, 3, 43, P.wood); b.px(3, 32, P.ironL); }
    if (t >= 3) { b.rect(4, 22, 32, 1, P.gold); b.poly([[26, 44], [30, 36], [34, 44]], P.plaster); }
    if (t >= 4) { brickWall(b, 0, 6, 9, 20, false); brickMerlons(b, 0, 3, 9); b.rect(3, 11, 3, 4, P.dark); b.rect(3, 0, 1, 5, P.woodD); b.poly([[4, 0], [9, 1.5], [4, 3]], P.red); b.disc(20, 26, 2.2, P.gold); b.px(20, 26, P.red); }
  } };
  DEF.b_academy = { w: 48, h: 48, draw(b, t) {
    t = +t || 1;
    if (t >= 2) { b.rect(19, 1, 10, 12, P.plaster); b.rect(19, 1, 10, 1, P.white); windowLit(b, 22, 5, 4, 4); }
    b.ellipse(24, 14, 10, 6, t >= 3 ? P.gold : P.teal); b.ellipse(22, 12, 5, 3, t >= 3 ? P.goldL : P.tealL);
    roof3q(b, 4, 14, 40, 10, P.teal, P.tealD, P.tealL);
    brickWall(b, 5, 24, 38, 16, false); b.rect(5, 24, 38, 1, BRK.MO);
    for (const x of [8, 15, 30, 37]) { b.rect(x, 25, 3, 14, P.white); b.rect(x, 25, 3, 1, P.plasterD); }
    b.rect(20, 28, 8, 12, P.blueD); b.ellipse(24, 28, 4, 2, P.blueD); b.rect(23, 30, 2, 3, P.gold);
    b.rect(3, 40, 42, 2, P.stoneM); b.rect(5, 42, 38, 2, P.stone);
    if (t >= 3) { b.px(24, 7, P.white); b.rect(41, 8, 1, 6, P.woodD); b.poly([[42, 8], [47, 9.5], [42, 11]], P.purple); }
    if (t >= 4) { b.line(28, 4, 34, 1, P.gold); b.line(28, 5, 34, 2, P.goldD); b.px(35, 1, P.cry); b.disc(3, 30, 1.6, P.purpleL); b.px(3, 30, P.white); b.disc(45, 32, 1.6, P.cry); b.px(45, 32, P.white); b.disc(7, 21, 1.2, P.purpleL); b.rect(5, 39, 38, 1, P.gold); }
  } };
  // Кирпичный замок: серый кирпич, центральная башня с оранжевым шатром над галереей с окнами,
  // боковые башни с широкими зубчатыми верхушками, арочные ворота с железными полосами.
  // Облик 1–4: окна загораются, вымпел на шатре, знамёна на башнях, золотая отделка.
  DEF.b_castle = { w: 64, h: 64, draw(b, t) {
    t = +t || 1;
    const { MO, B1, B2, B3, BH } = BRK;
    const RO = '#e0602a', ROL = '#f39446', ROD = '#b4421c', ROS = '#8a2f12';
    const glow = t >= 3 ? P.glow : '#d6d6dc', glowD = t >= 3 ? P.glowL : '#9c9ca6';
    const bricks = (x, y, w, h, dark) => brickWall(b, x, y, w, h, dark);
    const merlons = (x, y, w) => brickMerlons(b, x, y, w);
    // зелёный вал под замком
    b.ellipse(32, 58.5, 31, 5.5, P.leafD); b.ellipse(32, 57.5, 29, 4.5, P.leaf); b.px(9, 57, P.leafL); b.px(52, 58, P.leafL); b.px(14, 59, P.leafL);
    // крепостная стена между башнями
    bricks(15, 35, 34, 21, true); merlons(16, 32, 33); b.rect(15, 35, 34, 1, MO);
    // боковые башни с широкими верхушками
    for (const x of [3, 49]) {
      bricks(x, 30, 12, 26, false);
      b.rect(x - 1, 27, 14, 3, B1); b.rect(x - 1, 27, 14, 1, BH); b.rect(x - 1, 30, 14, 1, MO);
      merlons(x - 1, 24, 14);
      b.rect(x + 5, 38, 2, 4, MO);
    }
    // центральная башня и надвратная часть
    bricks(24, 23, 16, 14, false);
    bricks(22, 37, 20, 19, false);
    b.rect(22, 36, 20, 1, t >= 4 ? P.gold : ROD); // оранжевый пояс
    // нависающий парапет с консолями и галерея окон
    b.rect(21, 19, 22, 4, B1); b.rect(21, 19, 22, 1, BH);
    for (let x = 22; x < 42; x += 3) b.rect(x, 22, 2, 1, MO);
    b.rect(22, 15, 20, 4, MO);
    for (let x = 23; x < 41; x += 4) { b.rect(x, 16, 3, 3, glow); b.px(x, 16, glowD); }
    // высокий оранжевый конический шатёр с полями
    b.poly([[21, 15.5], [32, -0.5], [43, 15.5]], RO);
    b.poly([[32, -0.5], [43, 15.5], [33, 15.5]], ROD);
    b.line(31, 2, 24, 13, ROL); b.line(30, 6, 27, 11, ROL);
    b.rect(20, 14, 24, 2, ROS); b.rect(20, 14, 13, 1, ROD);
    // арочные ворота с железными полосами
    b.rect(27, 45, 10, 11, P.woodD); b.ellipse(32, 45, 5, 4, P.woodD);
    b.rect(28, 44, 8, 12, P.wood); b.ellipse(32, 44.5, 4, 3, P.wood);
    for (let x = 30; x < 36; x += 2) b.rect(x, 43, 1, 13, P.woodD);
    b.rect(27, 47, 10, 1, '#3a3a40'); b.rect(27, 52, 10, 1, '#3a3a40'); b.px(34, 49, '#d8d8dc');
    b.line(26, 45, 28, 41, BH); b.line(29, 40, 35, 40, BH); b.line(36, 41, 38, 45, BH); b.rect(26, 45, 1, 11, BH); b.rect(38, 45, 1, 11, B3);
    if (t >= 2) {
      // вымпел на шатре и бойницы горят
      b.rect(32, -1, 1, 1, P.woodD);
      b.poly([[33, 0], [38, 1], [33, 2]], P.red);
      b.rect(8, 38, 2, 4, P.glow); b.rect(54, 38, 2, 4, P.glow);
    }
    if (t >= 3) {
      // знамёна на боковых башнях и стене
      b.rect(5, 31, 4, 6, P.red); b.px(6, 33, P.gold); b.px(7, 33, P.gold);
      b.rect(55, 31, 4, 6, P.red); b.px(56, 33, P.gold); b.px(57, 33, P.gold);
      b.rect(18, 39, 3, 8, P.blue); b.px(19, 41, P.gold); b.rect(43, 39, 3, 8, P.blue); b.px(44, 41, P.gold);
    }
    if (t >= 4) {
      // королевская отделка: золотые навершия, пурпурные стяги
      b.px(32, 0, P.gold); b.rect(21, 19, 22, 1, P.gold);
      b.rect(5, 31, 4, 6, P.purple); b.px(6, 33, P.gold); b.px(7, 33, P.gold);
      b.rect(55, 31, 4, 6, P.purple); b.px(56, 33, P.gold); b.px(57, 33, P.gold);
    }
    // тёмный цоколь и ступени от ворот вниз на площадь
    b.rect(3, 55, 58, 2, MO);
    b.rect(25, 56, 14, 2, BH); b.rect(23, 58, 18, 2, B2); b.rect(21, 60, 22, 2, B1); b.rect(21, 61, 22, 1, MO);
    b.outline(P.k);
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
    // кирпичные ворота: башни как у Замка, надвратная стена с зубцами, арка с железными полосами
    const { MO, B1, B3, BH } = BRK;
    brickWall(b, 12, 16, 24, 28, true); brickMerlons(b, 13, 13, 22); b.rect(12, 16, 24, 1, MO);
    for (const x of [2, 36]) {
      brickTower(b, x, 12, 10, 32);
      b.rect(x + 4, 20, 2, 5, t >= 3 ? P.glow : MO);
    }
    b.rect(12, 23, 24, 1, t >= 4 ? P.gold : '#b4421c'); // оранжевый пояс, как у Замка
    // арка и ворота
    b.rect(17, 30, 14, 14, P.woodD); b.ellipse(24, 30, 7, 5, P.woodD);
    b.rect(18, 29, 12, 15, P.wood); b.ellipse(24, 29.5, 6, 4, P.wood);
    for (let x = 20; x < 29; x += 2) b.rect(x, 26, 1, 18, P.woodD);
    b.rect(17, 33, 14, 1, '#3a3a40'); b.rect(17, 39, 14, 1, '#3a3a40'); b.px(27, 36, '#d8d8dc');
    b.line(16, 30, 19, 25, BH); b.line(20, 24, 28, 24, BH); b.line(29, 25, 32, 30, BH); b.rect(16, 30, 1, 14, BH); b.rect(32, 30, 1, 14, B3);
    if (t >= 2) {
      // факелы у ворот
      b.rect(14, 31, 1, 3, P.woodD); b.px(14, 30, P.glow); b.px(14, 29, P.glowL);
      b.rect(33, 31, 1, 3, P.woodD); b.px(33, 30, P.glow); b.px(33, 29, P.glowL);
    }
    if (t >= 3) {
      // решётка над воротами и алые знамёна на башнях
      for (let x = 19; x < 30; x += 2) b.rect(x, 26, 1, 3, '#3a3a40');
      b.rect(4, 27, 6, 9, P.red); b.px(6, 30, P.gold); b.px(7, 30, P.gold);
      b.rect(38, 27, 6, 9, P.red); b.px(40, 30, P.gold); b.px(41, 30, P.gold);
    }
    if (t >= 4) {
      // оранжевые шатры на башнях и золотой герб
      for (const x of [2, 36]) {
        b.poly([[x - 1, 6.5], [x + 5, -1], [x + 11, 6.5]], '#e0602a');
        b.poly([[x + 5, -1], [x + 11, 6.5], [x + 5.5, 6.5]], '#b4421c');
        b.rect(x - 1, 6, 12, 1, '#8a2f12');
      }
      b.disc(24, 19, 2.6, P.gold); b.px(24, 19, P.red);
    }
    b.rect(1, 43, 46, 2, MO);
    b.outline(P.k);
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
    // облик города: готические стили A–E рисует gothic.js, «Классика» — эти спрайты
    const st = G.SPR.style();
    if ((st !== 'classic' || name === 'b_dungeon') && name.startsWith('b_') && G.GOTH && G.GOTH.has(name.slice(2))) {
      const cv = G.GOTH.render(name.slice(2), st, +arg || 1, white);
      if (cv) return cv;
    }
    const d = DEF[name];
    if (!d) return new Buf(1, 1).canvas();
    const b = new Buf(d.w, d.h);
    d.draw(b, arg);
    b.outline(P.k);
    return b.canvas(white);
  }
  G.SPR = {
    style: () => (G.S && G.S.style) || 'A',
    canvas(key) {
      const ck = key.startsWith('b_') || key.startsWith('m_dragon') ? key + '@' + G.SPR.style() : key;
      return cache[ck] || (cache[ck] = build(key));
    },
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
    const GS = G.GOTH && G.GOTH.style(G.SPR.style());
    const WS = GS ? { s: GS.B1, d: GS.MO, l: GS.BH, m: GS.B2, ring: GS.TL, top: GS.BN } : { s: P.stone, d: P.stoneD, l: P.stoneL, m: P.stoneM, ring: P.stoneL, top: P.red };
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

    // двор замка: газон с живой изгородью внутри площади и дорожка к южной дороге
    for (let y = M.cy - 28; y < M.cy + 40; y++) {
      for (let x = M.cx - 48; x < M.cx + 48; x++) {
        const d = Math.hypot((x - M.cx) / 45, (y - M.cy - 6) / 31);
        if (d > 1) continue;
        const n = r();
        b.px(x, y, d > 0.93 ? (n < 0.3 ? '#3c7f34' : '#2f6b2a') : n < 0.07 ? '#6fb45c' : ((x >> 3) + (y >> 3)) % 2 ? '#5c9f4b' : '#589a47');
      }
    }
    for (let y = M.cy + 26; y < M.cy + 46; y++) {
      for (let x = M.cx - 5; x <= M.cx + 5; x++) {
        const edge = x === M.cx - 5 || x === M.cx + 5 || y % 4 === 0;
        b.px(x, y, edge ? '#8a8378' : (x + (y >> 2)) % 3 ? '#bfb6a6' : '#aea596');
      }
    }
    // тень под замком на траве: он стоит на земле, а не лежит на мостовой
    for (let y = M.cy + 6; y < M.cy + 32; y++) {
      for (let x = M.cx - 40; x < M.cx + 44; x++) {
        const d = Math.hypot((x - M.cx - 4) / 37, (y - M.cy - 20) / 9);
        if (d <= 1) b.px(x, y, d > 0.8 ? '#4a8a3c' : '#3f7a34');
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
            else if (inner) b.px(x, y, seg % 2 ? WS.l : WS.d);
            else b.px(x, y, (seg + Math.floor(d * 400)) % 5 === 0 ? WS.d : d > WALL_OUT - 0.01 ? WS.d : WS.s);
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
        b.disc(tx, ty, 8, P.k); b.disc(tx, ty, 7, WS.d); b.disc(tx, ty - 1, 6, WS.s); b.disc(tx, ty - 1, 4.5, WS.m);
        for (let j = 0; j < 8; j++) { const aa = (j / 8) * Math.PI * 2; b.px(tx + Math.cos(aa) * 5.5, ty - 1 + Math.sin(aa) * 5.5, WS.ring); }
        b.px(tx, ty - 1, WS.top);
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

    // пруд у леса (до деревьев — кроны нависают над берегом): неровный берег, мелководье светлее, глубина темнее,
    // блики, кувшинки, камыши и камни на берегу
    const PX = 31, PY = 266, PRX = 27, PRY = 14;
    const pond = (x, y) => {
      const dx = (x + 0.5 - PX) / PRX, dy = (y + 0.5 - PY) / PRY, a = Math.atan2(dy, dx);
      return Math.hypot(dx, dy) / (1 + 0.1 * Math.sin(a * 3 + 0.7) + 0.06 * Math.sin(a * 5 + 2.1) + 0.04 * Math.sin(a * 9));
    };
    {
      const rp = G.U.seeded(31);
      for (let y = PY - PRY - 6; y <= PY + PRY + 6; y++) {
        for (let x = Math.max(0, PX - PRX - 8); x <= PX + PRX + 8; x++) {
          const d = pond(x, y), n = rp(), ch = (x + y) % 2;
          if (d < 0.5 || (d < 0.56 && ch)) b.px(x, y, n < 0.06 ? '#2a5f99' : '#22507f');
          else if (d < 0.8 || (d < 0.85 && ch)) b.px(x, y, n < 0.05 ? '#3a7cb8' : '#2d68a3');
          else if (d < 0.94) b.px(x, y, n < 0.1 ? '#5c9bc9' : '#447fb6');
          else if (d < 1) b.px(x, y, '#6aa6c9');
          else if (d < 1.06) b.px(x, y, n < 0.3 ? '#57583a' : '#646343');
          else if (d < 1.13 && n < 0.75 - (d - 1.06) * 8) b.px(x, y, n < 0.2 ? '#7a7148' : '#6e6a44');
        }
      }
      // блики на воде и отражение неба
      for (const [x, y, w] of [[PX - 13, PY - 6, 6], [PX - 4, PY - 2, 4], [PX + 6, PY + 3, 7], [PX - 9, PY + 5, 3], [PX + 12, PY - 4, 3]]) {
        for (let i = 0; i < w; i++) if (pond(x + i, y) < 0.9) b.px(x + i, y, i === 0 || i === w - 1 ? '#5c9bc9' : '#a9d3ec');
      }
      // кувшинки
      for (const [x, y, f] of [[PX + 9, PY - 6, 1], [PX + 14, PY - 3, 0], [PX - 16, PY + 4, 0]]) {
        b.rect(x - 1, y, 4, 2, '#3f8a34'); b.px(x, y - 1, '#4f9a3c'); b.px(x + 1, y - 1, '#4f9a3c'); b.px(x + 2, y + 1, '#2f6b2a');
        if (f) { b.px(x + 1, y, '#ff9ec2'); b.px(x + 1, y - 1, '#ffd0e0'); }
      }
      // камыши: стебли на кромке, сверху коричневые початки
      for (const [x, y, h] of [[PX + 21, PY + 3, 6], [PX + 23, PY + 1, 7], [PX + 25, PY + 4, 5], [PX + 19, PY + 6, 5], [PX - 22, PY + 6, 5], [PX - 20, PY + 9, 6], [PX + 3, PY + 14, 5], [PX + 6, PY + 13, 6]]) {
        for (let i = 0; i < h; i++) b.px(x, y - i, i < 2 ? '#2f6b2a' : '#3f8a34');
        b.px(x, y - h, '#6b4a2a'); b.px(x, y - h - 1, '#7d5a33');
        b.px(x + 1, y - 2, '#4f9a3c');
      }
      // камни на берегу
      for (const [x, y] of [[PX - 25, PY - 4], [PX + 17, PY - 12], [PX - 6, PY + 15]]) {
        b.rect(x, y, 3, 2, '#7d8089'); b.px(x, y, '#a3a7b0'); b.px(x + 1, y, '#a3a7b0'); b.rect(x, y + 2, 3, 1, '#4a4c52');
      }
    }

    // деревья: лес по углам снаружи, сады внутри
    const rt = G.U.seeded(77);
    const trees = [];
    for (let i = 0; i < 260; i++) {
      const x = rt() * W, y = rt() * H;
      const d = ell(x, y);
      if (d > MOAT + 0.05 && !(x > 262 && y < 78) && !(x > 300 && y > 250) && !(Math.abs(x - M.cx) < 18 && y > 250)) {
        const s = 5 + rt() * 3; // случайные числа берём как раньше, чтобы лес не переставился
        if (pond(x, y) > 1.25) trees.push([x, y, s]);
      }
    }
    for (const [x, y] of [[140, 182], [246, 182], [120, 100], [266, 100], [192, 92], [60, 152], [324, 152], [100, 222], [286, 222]]) trees.push([x, y, 4.5]);
    trees.sort((p, q) => p[1] - q[1]);
    for (const [x, y, s] of trees) treeTop(b, x, y, s, ell(x, y) < 1 ? '#3f7a34' : '#24461d');

    // горы снаружи
    // горный массив в правом верхнем углу, только снаружи стены и рва
    const rm = G.U.seeded(5);
    const peaks = [[338, -6, 30, 52], [372, 6, 22, 44], [300, 6, 20, 36], [356, 30, 18, 34], [378, 46, 14, 28]];
    peaks.sort((p, q) => p[1] + p[3] - (q[1] + q[3]));
    for (const [cx, top, hw, h] of peaks) {
      const ridge = cx + 2;
      for (let y = Math.max(0, top); y <= top + h && y < H; y++) {
        const f = (y - top) / h, half = hw * f;
        for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
          if (x < 0 || x >= W || ell(x, y) < MOAT + 0.05) continue;
          const edge = x <= cx - half + 1 || x >= cx + half - 1;
          const snowLine = 0.34 + 0.06 * Math.sin(x * 0.9);
          const left = x < ridge - (y - top) * 0.15;
          let c;
          if (f < snowLine) c = left ? '#f2f4f8' : '#c6cdda';
          else { const n = rm(); c = left ? (n < 0.15 ? '#8a909b' : '#9ba1ac') : n < 0.15 ? '#565c67' : '#6a707b'; }
          b.px(x, y, edge ? '#454a54' : c);
        }
      }
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

  // Арена для окна боя: ночное небо, трибуны со зрителями из кирпича выбранного облика, песок
  G.SPR.arenaBg = function () {
    const OFF = 80, W = 320, H = 130 + OFF, b = new Buf(W, H), r = G.U.seeded(77);
    const GS = G.GOTH && G.GOTH.style(G.SPR.style());
    const K = GS || { MO: BRK.MO, B1: BRK.B1, B2: BRK.B2, B3: BRK.B3, BH: BRK.BH, T: P.stoneL, TL: P.white, TD: P.stoneD, BN: P.red, FI: P.gold };
    const sky = ['#140f24', '#1a1330', '#1d1530', '#261b3d', '#30214a'];
    for (let y = 0; y < 40 + OFF; y++) { const c = sky[Math.min(4, Math.floor(y / 24))]; for (let x = 0; x < W; x++) b.px(x, y, c); }
    for (let i = 0; i < 70; i++) b.px(Math.floor(r() * W), Math.floor(r() * (20 + OFF)), r() < 0.5 ? '#ffffff' : '#c8b8ff');
    b.disc(48, 30, 8, '#f3e9c8'); b.disc(45, 28, 2, '#d8ccaa');
    // верх трибун: парапет с зубцами и флагами
    const top = 18 + OFF;
    for (let x = 0; x < W; x += 5) { b.rect(x, top - 3, 3, 3, K.B1); b.px(x, top - 3, K.BH); }
    b.rect(0, top, W, 3, K.B1); b.rect(0, top, W, 1, K.BH);
    for (let x = 20; x < W; x += 70) { b.rect(x, top - 16, 1, 13, P.woodD); b.poly([[x + 1, top - 16], [x + 9, top - 13.5], [x + 1, top - 11]], K.BN); }
    // ярусы трибун со зрителями
    const crowd = [P.skin, P.skinD, P.red, P.blue, P.plaster, P.green, P.purple, P.dirtL, P.gold];
    for (let tier = 0; tier < 5; tier++) {
      const y0 = top + 3 + tier * 9;
      b.rect(0, y0, W, 9, tier % 2 ? K.B3 : K.B1);
      b.rect(0, y0 + 7, W, 1, K.T); b.rect(0, y0 + 8, W, 1, K.MO);
      for (let x = 1; x < W - 1; x += 3) {
        if (r() < 0.18) continue;
        const c = crowd[Math.floor(r() * crowd.length)], hy = y0 + 2 + (r() < 0.3 ? -1 : 0);
        b.px(x, hy, P.skin); b.rect(x, hy + 1, 2, 3, c);
      }
    }
    // стена арены с арками и знамёнами
    const wy = top + 48;
    for (let y = wy; y < wy + 14; y++) for (let x = 0; x < W; x++) {
      const rr = Math.floor((y - wy) / 3), inRow = (y - wy) % 3, off = rr % 2 ? 3 : 0, inCol = (x + off) % 6;
      b.px(x, y, inRow === 2 || inCol === 5 ? K.MO : ((Math.floor((x + off) / 6) + rr) % 4 === 0 ? K.B2 : K.B1));
    }
    b.rect(0, wy, W, 1, K.TL);
    for (let x = 10; x < W; x += 40) {
      b.rect(x, wy + 4, 6, 10, '#0d0a12'); b.rect(x + 1, wy + 3, 4, 1, '#0d0a12'); b.rect(x + 2, wy + 2, 2, 1, '#0d0a12');
      if ((x / 40) % 2) { b.rect(x + 18, wy + 2, 5, 9, K.BN); b.px(x + 20, wy + 4, K.FI); }
    }
    // песок
    const sand = ['#d8b26a', '#cfa85f', '#c49c56', '#b48e4c'];
    for (let y = wy + 14; y < H; y++) for (let x = 0; x < W; x++) {
      const n = r();
      b.px(x, y, y < wy + 16 ? sand[3] : n < 0.08 ? sand[3] : n < 0.25 ? sand[2] : n < 0.6 ? sand[1] : sand[0]);
    }
    for (let i = 0; i < 6; i++) { const y = wy + 24 + i * 7; for (let x = 0; x < W; x++) if ((x + i * 7) % 11 < 6) b.px(x, y, sand[2]); }
    return b.canvas();
  };

  // Поле боя Путешествия по областям: пустоши, топи, огненные горы, ледяной край, тёмная цитадель
  G.SPR.journeyBg = function (ri) {
    const OFF = 80, W = 320, H = 130 + OFF, b = new Buf(W, H), r = G.U.seeded(500 + ri);
    const SET = [
      { sky: ['#1a1430', '#2a1f3d', '#4a3550', '#7a5560'], far: '#3b2c3a', near: '#2c2230', g: ['#8a7a55', '#9c8a60', '#7a6a48', '#6b5c3e'] },
      { sky: ['#101a20', '#16262a', '#203630', '#2c4a3a'], far: '#1c3028', near: '#15241e', g: ['#3f5a3a', '#4a6a40', '#35502f', '#2a4026'], pools: '#2a4a48' },
      { sky: ['#200c0c', '#3a1210', '#5a1c10', '#8a3010'], far: '#2a1410', near: '#1c0c0a', g: ['#3a2420', '#4a2c24', '#2c1a18', '#5a3020'], lava: '#ff6a2a' },
      { sky: ['#0e1830', '#1a2c50', '#2c4470', '#4a6a90'], far: '#8aa4c0', near: '#6a84a0', g: ['#cfe3ee', '#e4f0f6', '#b8d0de', '#a4bccc'] },
      { sky: ['#0a0812', '#140e20', '#1e142e', '#2c1c40'], far: '#24182e', near: '#180f22', g: ['#2a2433', '#342c40', '#221c2a', '#3a2c4a'], glow: '#9a5cff' },
    ];
    const C = SET[ri % SET.length];
    for (let y = 0; y < 72 + OFF; y++) { const c = C.sky[Math.min(3, Math.floor((y / (72 + OFF)) * 4))]; for (let x = 0; x < W; x++) b.px(x, y, c); }
    for (let i = 0; i < 60; i++) b.px(Math.floor(r() * W), Math.floor(r() * (40 + OFF)), r() < 0.6 ? '#ffffff' : '#c8b8ff');
    for (let x = 0; x < W; x++) {
      const h1 = Math.round(40 + OFF + 12 * Math.sin(x * 0.03 + ri) + 6 * Math.sin(x * 0.11));
      for (let y = h1; y < 72 + OFF; y++) b.px(x, y, C.far);
      if (ri % 5 === 3 && y0snow(h1)) for (let y = h1; y < h1 + 2; y++) b.px(x, y, '#ffffff');
      const h2 = Math.round(56 + OFF + 6 * Math.sin(x * 0.07 + 2 * ri) + 3 * Math.sin(x * 0.19));
      for (let y = h2; y < 72 + OFF; y++) b.px(x, y, C.near);
    }
    function y0snow(h) { return h < 44 + OFF; }
    for (let y = 72 + OFF; y < H; y++) for (let x = 0; x < W; x++) { const n = r(); b.px(x, y, n < 0.1 ? C.g[3] : n < 0.25 ? C.g[2] : n < 0.6 ? C.g[0] : C.g[1]); }
    if (C.pools) for (let i = 0; i < 5; i++) b.ellipse(30 + r() * 260, 80 + OFF + r() * 10, 10 + r() * 12, 2.5, C.pools);
    if (C.lava) for (let i = 0; i < 7; i++) { let x = r() * W, y = 74 + OFF + r() * 50; for (let k = 0; k < 14; k++) { b.px(x, y, C.lava); x += r() * 3 - 1; y += r() * 2 - 0.5; } }
    if (C.glow) for (let i = 0; i < 30; i++) b.px(Math.floor(r() * W), 74 + OFF + Math.floor(r() * 56), C.glow);
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
