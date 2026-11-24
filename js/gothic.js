// Облик города: пять готических стилей из тёмного кирпича (A–E) для Замка и всех построек.
// Рисуется так же, как остальные спрайты: пиксели в буфер, затем тёмный контур. Облик 1–4 = уровни 1–2, 3–4, 5–6, 7–8.
// Стиль выбирается в настройках; «Классика» — прежний серый кирпич из sprites.js.
(function () {
  const P = G.PAL; // общая палитра игры (sprites.js)
  const IRON = '#2a2a30', BARS = '#55555e';

  class Buf {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
    px(x, y, c) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      this.d[y * this.w + x] = c;
    }
    get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.d[y * this.w + x]; }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
        for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
          if (dx * dx + dy * dy <= 1) this.px(x, y, c);
        }
    }
    disc(cx, cy, r, c) { this.ellipse(cx, cy, r, r, c); }
    poly(pts, c) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
        for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) if (inPoly(x + 0.5, y + 0.5, pts)) this.px(x, y, c);
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
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          if (this.get(x, y) !== null) continue;
          if (this.get(x - 1, y) !== null || this.get(x + 1, y) !== null || this.get(x, y - 1) !== null || this.get(x, y + 1) !== null) add.push([x, y]);
        }
      for (const [x, y] of add) this.px(x, y, c);
    }
    canvas(white) {
      const cv = document.createElement('canvas');
      cv.width = this.w; cv.height = this.h;
      const cx = cv.getContext('2d'), img = cx.createImageData(this.w, this.h);
      for (let i = 0; i < this.d.length; i++) {
        const c = this.d[i];
        if (!c) continue;
        const n = white ? 0xffffff : parseInt(c.slice(1, 7), 16);
        img.data[i * 4] = (n >> 16) & 255; img.data[i * 4 + 1] = (n >> 8) & 255; img.data[i * 4 + 2] = n & 255; img.data[i * 4 + 3] = 255;
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

  // ---------- пять стилей ----------
  // MO шов, B1–B3 кирпич, BH блик; R крыша/шпиль; T белый камень обрамлений; WD/WL тёмное стекло; GL/GLL свет в окнах;
  // BN знамёна; FI навершия; spire — силуэт шпиля; merlon — зубцы; rose — окна-розы; buttress — контрфорсы; slit — бойницы
  const STYLES = [
    { id: 'A', name: 'Чёрный базальт',
      note: 'Почти чёрный кирпич, тонкие игольчатые шпили из сине-чёрного сланца, контрфорсы, холодный голубой свет в стрельчатых окнах, серебро.',
      MO: '#101116', B1: '#30323c', B2: '#3b3e49', B3: '#272930', BH: '#555867',
      R: '#2c3a55', RD: '#1d2639', RL: '#4f6690', RS: '#121826',
      T: '#7d8494', TD: '#585e6c', TL: '#aeb5c4',
      WD: '#18202e', WL: '#3a4c6c', GL: '#8fd3ff', GLL: '#e2f6ff',
      BN: '#2f4fa8', BND: '#1d3270', FI: '#e4e8f0', FID: '#8a93a3',
      spire: 'needle', merlon: 'pointed', rose: false, buttress: true },
    { id: 'B', name: 'Тёмный кирпич и медь',
      note: 'Тёмно-бурый кирпич, широкие шатры из позеленевшей меди, песчаник в обрамлениях, окна-розы и тёплый янтарный свет.',
      MO: '#1c100e', B1: '#58302a', B2: '#6a3b32', B3: '#452520', BH: '#8a5442',
      R: '#3f9480', RD: '#2a6658', RL: '#7fd0b6', RS: '#1a443b',
      T: '#a3906c', TD: '#776849', TL: '#d2be93',
      WD: '#281b18', WL: '#5a4236', GL: '#ffb347', GLL: '#ffe39a',
      BN: '#2f7a4a', BND: '#1d5030', FI: '#eea65c', FID: '#a5682a',
      spire: 'cone', merlon: 'square', rose: true, buttress: false },
    { id: 'C', name: 'Пепельный собор',
      note: 'Пепельно-серый кирпич, свинцовые шпили с пинаклями и краббами, ажурные парапеты, контрфорсы, белый камень и золото.',
      MO: '#212026', B1: '#53525a', B2: '#605f68', B3: '#45444b', BH: '#7b7a84',
      R: '#5d6676', RD: '#414856', RL: '#8b96aa', RS: '#2b3039',
      T: '#cfc6ad', TD: '#9a917a', TL: '#f0e9d6',
      WD: '#262634', WL: '#4a4a64', GL: '#ffd877', GLL: '#fff6d2',
      BN: '#ece6d3', BND: '#b5ad95', FI: '#f7c948', FID: '#b07d1a',
      spire: 'tiered', merlon: 'none', rose: true, buttress: true },
    { id: 'D', name: 'Ночная крепость',
      note: 'Индиговый кирпич, массивные башни с зубцами и машикулями, короткие шатры, узкие бойницы с фиолетовым светом.',
      MO: '#120f1a', B1: '#38314d', B2: '#443c5c', B3: '#2c263d', BH: '#5c527d',
      R: '#2c2442', RD: '#1c172c', RL: '#4e4172', RS: '#110d1a',
      T: '#6f6889', TD: '#4e4866', TL: '#9c94ba',
      WD: '#191426', WL: '#3a3156', GL: '#c49bff', GLL: '#f0e2ff',
      BN: '#6a2fb0', BND: '#43207a', FI: '#c9cde0', FID: '#7d8296',
      spire: 'battle', merlon: 'square', rose: false, buttress: false, slit: true },
    { id: 'E', name: 'Кровавая готика',
      note: 'Угольный кирпич, крутые багровые пирамидальные крыши с золотыми рёбрами, красные витражи, ласточкины хвосты на стенах.',
      MO: '#110c0e', B1: '#383033', B2: '#443a3e', B3: '#2c2528', BH: '#5c5054',
      R: '#8e1f26', RD: '#5f1318', RL: '#c8473f', RS: '#3a0a0e',
      T: '#6e6064', TD: '#4d4245', TL: '#988a8f',
      WD: '#2a1014', WL: '#5a2229', GL: '#ff5a3c', GLL: '#ffc09a',
      BN: '#b01f2a', BND: '#6e1219', FI: '#f7c948', FID: '#b07d1a',
      spire: 'hip', merlon: 'swallow', rose: true, buttress: true },
  ];

  // ---------- кладка и детали ----------
  function brickAt(S, x, y, ox, oy, dark) {
    const ry = y - oy, r = Math.floor(ry / 3), inRow = ry - r * 3;
    if (inRow === 2) return S.MO;
    const off = ((r % 2) + 2) % 2 ? 3 : 0;
    const rx = x - ox - off, c = Math.floor(rx / 6), inCol = rx - c * 6;
    if (inCol === 5) return S.MO;
    const k = (((c * 7 + r * 3) % 5) + 5) % 5;
    if (dark) return k === 0 ? S.B1 : S.B3;
    if (inCol === 0 && inRow === 0) return k === 0 ? S.BH : S.B2;
    return k === 0 ? S.B2 : k === 3 ? S.B3 : S.B1;
  }
  function wallO(b, S, x, y, w, h, ox, oy, dark) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) b.px(x + i, y + j, brickAt(S, x + i, y + j, ox, oy, dark)); }
  function wall(b, S, x, y, w, h, dark) { wallO(b, S, x, y, w, h, x, y, dark); }
  function polyWall(b, S, pts, ox, oy, dark) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++)
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) if (inPoly(x + 0.5, y + 0.5, pts)) b.px(x, y, brickAt(S, x, y, ox, oy, dark));
  }
  function cornice(b, S, x, y, w, t) { b.rect(x, y, w, 1, t >= 4 ? S.FI : S.TL); b.rect(x, y + 1, w, 1, S.TD); }
  // зубцы высотой 3 над стеной; y — верхний ряд
  function merlons(b, S, x, y, w) {
    if (S.merlon === 'none') { // ажурный парапет собора
      b.rect(x, y + 1, w, 2, S.T); b.rect(x, y + 1, w, 1, S.TL);
      for (let i = 1; i < w - 1; i += 3) b.px(x + i, y + 2, S.MO);
      for (let i = 2; i < w - 1; i += 6) b.px(x + i, y, S.TL);
      return;
    }
    for (let i = 0; i + 3 <= w; i += 5) {
      const X = x + i;
      if (S.merlon === 'pointed') { b.rect(X, y + 1, 3, 2, S.B1); b.px(X + 1, y, S.BH); b.px(X, y + 1, S.BH); }
      else if (S.merlon === 'swallow') { b.rect(X, y + 1, 3, 2, S.B1); b.px(X, y, S.BH); b.px(X + 2, y, S.B1); }
      else { b.rect(X, y, 3, 3, S.B1); b.rect(X, y, 3, 1, S.BH); }
    }
  }
  // стрельчатая арка: ступени сужаются кверху, steep — сколько рядов на ступень
  function arch(b, x, y, w, h, c, steep) {
    steep = steep || 1;
    const n = Math.ceil(w / 2);
    let yy = y;
    for (let s = 0; s < n - 1; s++) {
      const ww = w - 2 * (n - 1 - s);
      for (let k = 0; k < steep && yy < y + h; k++, yy++) b.rect(x + (w - ww) / 2, yy, ww, 1, c);
    }
    if (yy < y + h) b.rect(x, yy, w, y + h - yy, c);
  }
  // стрельчатое окно в каменной раме
  function lancet(b, S, x, y, w, h, lit) {
    if (S.slit && w > 2) { x += Math.floor((w - 1) / 2); w = 1; }
    const st = w <= 3 ? 2 : 1;
    arch(b, x - 1, y - st, w + 2, h + st + 1, S.T, st);
    arch(b, x, y, w, h, lit ? S.GL : S.WD, st);
    if (lit) b.px(x + Math.floor((w - 1) / 2), y, S.GLL);
    else b.px(x, y + st, S.WL);
    if (w >= 5 && w % 2) b.rect(x + (w - 1) / 2, y + st, 1, h - st, S.T);
    b.rect(x - 1, y + h, w + 2, 1, S.TL);
  }
  // окно-роза; cx, cy — центр (для пикселя p передавайте p + 0.5)
  function rose(b, S, cx, cy, r, lit) {
    b.disc(cx, cy, r + 1, S.T);
    b.disc(cx, cy, r, lit ? S.GL : S.WD);
    if (r >= 2.5) {
      const px = Math.floor(cx), py = Math.floor(cy), R = Math.floor(r);
      b.rect(px - R + 1, py, 2 * R - 1, 1, S.TD); b.rect(px, py - R + 1, 1, 2 * R - 1, S.TD);
      if (R >= 3) for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) b.px(px + dx, py + dy, S.TD);
      b.px(px, py, lit ? S.GLL : S.T);
    } else if (lit) b.px(cx - 0.5, cy - 0.5, S.GLL);
  }
  // стрельчатая дубовая дверь в каменной раме; port — опущенная решётка
  function door(b, S, x, y, w, h, port) {
    arch(b, x - 1, y - 1, w + 2, h + 1, S.T, 1);
    arch(b, x, y, w, h, P.woodD, 1);
    arch(b, x + 1, y + 1, w - 2, h - 1, P.wood, 1);
    const full = y + Math.ceil(w / 2);
    for (let i = x + 2; i < x + w - 1; i += 2) b.rect(i, full, 1, y + h - full, P.woodD);
    b.rect(x, y + h - 3, w, 1, IRON); b.rect(x, full + 1, w, 1, IRON);
    if (port) {
      const ph = Math.ceil(w / 2) + 2;
      arch(b, x + 1, y + 1, w - 2, ph, P.black, 1);
      for (let yy = y + 1; yy <= y + ph; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) {
        if (b.get(xx, yy) !== P.black) continue;
        if ((xx - x) % 2 === 0 || yy === y + ph - 2) b.px(xx, yy, BARS);
      }
      for (let xx = x + 2; xx < x + w - 1; xx += 2) b.px(xx, y + ph + 1, BARS);
    }
  }
  function buttress(b, S, x, y, h) {
    b.rect(x, y + 2, 2, h - 2, S.B3); b.rect(x, y + 2, 1, h - 2, S.B1);
    b.px(x, y + 1, S.TL); b.px(x + 1, y + 1, S.T); b.px(x + 1, y, S.TL);
    const m = y + Math.floor(h / 2);
    b.rect(x, m, 2, 1, S.TL);
  }
  function torch(b, x, y) { b.rect(x, y + 1, 1, 3, P.woodD); b.px(x, y, P.glow); b.px(x, y - 1, P.glowL); }
  function banner(b, S, x, y, w, h, t) {
    b.rect(x - 1, y - 1, w + 2, 1, S.FID);
    b.rect(x, y, w, h - 1, S.BN); b.px(x, y + h - 1, S.BN); b.px(x + w - 1, y + h - 1, S.BN);
    b.rect(x + w - 1, y, 1, h - 1, S.BND);
    const c = x + Math.floor((w - 1) / 2);
    b.px(c, y + 2, t >= 4 ? S.FI : S.FID);
    if (w >= 4) b.px(c + 1, y + 2, t >= 4 ? S.FI : S.FID);
  }
  function pennant(b, S, x, y0, y1, len) {
    b.rect(x, y0, 1, Math.max(1, y1 - y0 + 1), S.FID);
    b.poly([[x + 1, y0], [x + 1 + len, y0 + 1.5], [x + 1, y0 + 3]], S.BN);
  }
  function treeTop(b, cx, cy, r) {
    b.rect(cx - 1, cy + r - 2, 2, 3, P.woodD);
    b.disc(cx, cy, r, P.leafD); b.disc(cx - r * 0.15, cy - r * 0.15, r * 0.78, P.leaf); b.disc(cx - r * 0.38, cy - r * 0.4, r * 0.34, P.leafL);
  }
  // крутая крыша в 3/4 с черепицей-чешуёй и гребнем
  function roofG(b, S, x, y, w, h, t) {
    b.rect(x, y, w, h, S.R);
    for (let j = 2; j < h - 1; j += 3) for (let i = ((j / 3) | 0) % 2 ? 2 : 0; i < w; i += 4) b.rect(x + i, y + j, 2, 1, S.RD);
    b.rect(x, y, w, 1, S.RL);
    b.rect(x, y + h - 1, w, 1, S.RS);
    if (t >= 3 || S.spire === 'tiered') for (let i = 1; i < w - 1; i += 2) b.px(x + i, y - 1, t >= 4 ? S.FI : S.FID);
  }
  // стрельчатый щипец из кирпича; x — левый край, w — ширина (нечётная), yb — нижний ряд, h — высота
  function gable(b, S, x, yb, w, h, ox, oy) {
    polyWall(b, S, [[x, yb + 1], [x + w / 2, yb - h], [x + w, yb + 1]], ox == null ? x : ox, oy == null ? yb + 1 : oy, false);
    const c = x + (w - 1) / 2;
    b.line(x + 1, yb, c, yb - h + 1, S.TD); b.line(x + w - 2, yb, c, yb - h + 1, S.TD);
    b.line(x, yb, c, yb - h, S.TL); b.line(x + w - 1, yb, c, yb - h, S.T);
  }
  // треугольник с затенённой правой половиной
  function cone(b, x0, w0, yb, hh, cL, cR) {
    const pts = [[x0, yb + 1], [x0 + w0 / 2, yb - hh], [x0 + w0, yb + 1]], pc = Math.floor(x0 + w0 / 2 - 0.001);
    for (let yy = Math.floor(yb - hh); yy <= yb; yy++)
      for (let xx = Math.floor(x0); xx < Math.ceil(x0 + w0); xx++) if (inPoly(xx + 0.5, yy + 0.5, pts)) b.px(xx, yy, xx > pc ? cR : cL);
    return pc;
  }
  function pinnacle(b, S, x, yb, hh, t) {
    const pc = cone(b, x, 3, yb, hh, S.R, S.RD);
    b.px(pc, yb - hh - 1, t >= 4 ? S.FI : S.FID);
  }
  // Шпиль над башней: x — левый край башни, w — её ширина (нечётная), yb — нижний ряд шпиля, h — высота.
  // Возвращает вершину навершия.
  function spire(b, S, x, yb, w, h, t, kind) {
    kind = kind || S.spire;
    const px = x + (w - 1) / 2;
    let tipY;
    if (kind === 'battle') {
      const ch = Math.max(4, Math.round(h * 0.5)), cw = Math.max(3, w - 2);
      cone(b, x + (w - cw) / 2, cw, yb - 3, ch, S.R, S.RD);
      tipY = yb - 3 - ch;
      if (cw >= 7) b.line(x + (w - cw) / 2 + 1, yb - 4, px - 1, tipY + 2, S.RL);
      wall(b, S, x - 1, yb - 2, w + 2, 3, false);
      merlons(b, S, x - 1, yb - 5, w + 2);
      for (let i = x - 1; i < x + w + 1; i += 2) b.px(i, yb + 1, S.MO);
    } else {
      let x0 = x - 1, w0 = w + 2, hh = h;
      if (kind === 'needle') { x0 = x + 1; w0 = Math.max(3, w - 2); }
      if (kind === 'cone') hh = Math.round(h * 0.8);
      if (kind === 'hip') hh = Math.round(h * 0.85);
      if (kind === 'tiered') { x0 = x; w0 = w; }
      cone(b, x0, w0, yb, hh, S.R, S.RD);
      tipY = yb - hh;
      // черепица-чешуя на широких шатрах
      if (kind === 'cone' || kind === 'hip')
        for (let yy = tipY + 2; yy <= yb; yy += 2)
          for (let xx = Math.floor(x0); xx < x0 + w0; xx++) {
            if ((xx + (yy >> 1)) % 3) continue;
            const c = b.get(xx, yy);
            if (c === S.R) b.px(xx, yy, S.RD); else if (c === S.RD) b.px(xx, yy, S.RS);
          }
      if (w0 >= 5) b.line(x0 + 1, yb - 1, px - 1, tipY + 2, S.RL);
      if (kind === 'cone') b.rect(x0 - 1, yb, w0 + 2, 1, S.RS);
      if (kind === 'hip') { // золотые рёбра и краббы
        b.line(px, tipY + 1, px, Math.round(yb - hh * 0.45), S.FID);
        for (let yy = tipY + 3; yy < yb - 1; yy += 3) {
          const half = ((yy - tipY) / (hh + 1)) * (w0 / 2);
          b.px(Math.floor(px - half), yy, S.FI); b.px(Math.ceil(px + half), yy, S.FI);
        }
      }
      if (kind === 'needle' && hh >= 9) { // слуховое окошко на игле
        const yl = Math.round(yb - hh * 0.35);
        b.rect(px - 1, yl, 3, 2, S.T); b.px(px, yl - 1, S.T); b.px(px, yl + 1, t >= 3 ? S.GL : S.WD);
      }
      if (kind === 'tiered') {
        // краббы по краям и каменный пояс
        for (let yy = tipY + 3; yy < yb - 1; yy += 3) {
          const half = ((yy + 0.5 - tipY) / (hh + 1)) * (w0 / 2);
          b.px(Math.floor(px - half), yy, S.TL); b.px(Math.ceil(px + half), yy, S.TL);
        }
        const yr = Math.round(yb - hh * 0.4), hw = Math.floor(((yr - tipY) / (hh + 1)) * (w0 / 2));
        b.rect(px - hw, yr, 2 * hw + 1, 1, S.TL);
        if (w >= 7) { pinnacle(b, S, x - 1, yb, Math.round(hh * 0.4), t); pinnacle(b, S, x + w - 2, yb, Math.round(hh * 0.4), t); }
      }
    }
    // навершие
    const fc = t >= 4 ? S.FI : S.FID;
    b.rect(px, tipY - 2, 1, 2, fc);
    if (t >= 4) { b.px(px - 1, tipY - 2, S.FI); b.px(px + 1, tipY - 2, S.FI); b.px(px, tipY - 3, S.FI); }
    return { x: px, y: t >= 4 ? tipY - 3 : tipY - 2 };
  }

  // ---------- постройки ----------
  const DEF = {};

  DEF.castle = { w: 64, h: 64, draw(b, S, t) {
    const lit = t >= 3;
    b.ellipse(32, 58.5, 31, 5.5, P.leafD); b.ellipse(32, 57.5, 29, 4.5, P.leaf); b.px(9, 57, P.leafL); b.px(52, 58, P.leafL); b.px(14, 59, P.leafL);
    // крепостная стена
    wall(b, S, 15, 36, 34, 20, true); merlons(b, S, 15, 33, 34); b.rect(15, 36, 34, 1, S.MO);
    // боковые башни со шпилями
    for (const x of [2, 49]) {
      wall(b, S, x, 30, 13, 26, false);
      cornice(b, S, x - 1, 28, 15, t);
      lancet(b, S, x + 5, 35, 3, 6, lit);
      spire(b, S, x, 27, 13, 14, t);
      if (t >= 3) banner(b, S, x + 4, 45, 5, 7, t);
    }
    // донжон
    wall(b, S, 24, 20, 17, 17, false);
    wall(b, S, 22, 37, 21, 19, false);
    b.rect(22, 36, 21, 1, t >= 4 ? S.FI : S.TD);
    if (S.buttress) for (const x of [20, 43]) buttress(b, S, x, 37, 19);
    if (S.rose) { rose(b, S, 32.5, 27.5, 3, lit); lancet(b, S, 25, 24, 2, 7, lit); lancet(b, S, 38, 24, 2, 7, lit); }
    else for (const x of [26, 31, 36]) lancet(b, S, x, 24, 3, 8, lit);
    cornice(b, S, 23, 18, 19, t);
    for (let x = 24; x < 41; x += 2) b.px(x, 20, S.MO);
    const tip = spire(b, S, 26, 17, 13, 15, t);
    if (S.spire === 'tiered' || t >= 4) { pinnacle(b, S, 23, 17, 6, t); pinnacle(b, S, 39, 17, 6, t); }
    if (t >= 2) pennant(b, S, tip.x, 0, tip.y, 5);
    // ворота
    door(b, S, 27, 41, 11, 15, t >= 3);
    if (t >= 2) { torch(b, 25, 45); torch(b, 39, 45); }
    if (t >= 3) { banner(b, S, 16, 40, 3, 7, t); banner(b, S, 46, 40, 3, 7, t); }
    // цоколь и ступени
    b.rect(2, 55, 60, 2, S.MO);
    b.rect(25, 56, 15, 2, S.TL); b.rect(23, 58, 19, 2, S.T); b.rect(21, 60, 23, 2, S.TD); b.rect(21, 61, 23, 1, S.MO);
  } };

  DEF.gate = { w: 48, h: 48, draw(b, S, t) {
    if (t === 1) { // частокол, как сейчас в игре
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
    const lit = t >= 3;
    wall(b, S, 13, 20, 22, 24, true); merlons(b, S, 13, 17, 22); b.rect(13, 20, 22, 1, S.MO);
    for (const x of [2, 35]) {
      wall(b, S, x, 16, 11, 28, false);
      cornice(b, S, x - 1, 14, 13, t);
      lancet(b, S, x + 4, 21, 3, 5, lit);
      spire(b, S, x, 13, 11, 11, t);
      if (t >= 3) banner(b, S, x + 3, 30, 5, 8, t);
    }
    if (S.buttress) { buttress(b, S, 13, 22, 22); buttress(b, S, 33, 22, 22); }
    door(b, S, 17, 27, 14, 17, t >= 3);
    if (t >= 2) { torch(b, 15, 31); torch(b, 32, 31); }
    if (t >= 4) { b.rect(22, 20, 4, 4, S.BN); b.rect(23, 21, 2, 2, S.FI); b.rect(22, 19, 4, 1, S.FI); }
    b.rect(1, 43, 46, 2, S.MO);
  } };

  DEF.lumber = { w: 48, h: 48, draw(b, S, t) {
    const lit = t >= 3;
    treeTop(b, 7, 14, 6); treeTop(b, 41, 12, 6);
    if (t >= 3) treeTop(b, 42, 26, 5);
    roofG(b, S, 11, 11, 25, 13, t);
    wall(b, S, 12, 24, 23, 14, false);
    gable(b, S, 16, 24, 15, 11, 12, 24);
    if (S.rose) rose(b, S, 23.5, 20.5, 2, lit); else lancet(b, S, 22, 18, 3, 5, lit);
    door(b, S, 20, 29, 7, 9);
    lancet(b, S, 14, 28, 3, 5, lit); lancet(b, S, 30, 28, 3, 5, lit);
    if (t >= 3) b.px(23, 12, S.FI);
    for (const [x, y] of [[5, 41], [9, 41], [7, 38]]) { b.disc(x, y, 2.2, P.woodL); b.px(x - 0.5, y - 0.5, P.woodD); }
    if (t >= 2) for (const [x, y] of [[13, 42], [11, 39]]) { b.disc(x, y, 2.2, P.woodL); b.px(x - 0.5, y - 0.5, P.woodD); }
    b.rect(37, 38, 7, 5, P.wood); b.rect(37, 37, 7, 2, P.woodL);
    if (t >= 2) { b.disc(40.5, 34, 3, P.ironL); b.disc(40.5, 34, 1.2, P.ironD); b.px(40, 30, P.iron); b.px(44, 34, P.iron); b.px(37, 34, P.iron); }
    else { b.line(40, 32, 40, 37, P.woodD); b.rect(38, 31, 4, 2, P.ironL); }
    if (t >= 4) {
      const tip = spire(b, S, 21, 10, 5, 8, t);
      pennant(b, S, tip.x, Math.max(0, tip.y - 3), tip.y, 4);
      b.rect(1, 44, 12, 2, P.woodL); b.rect(2, 43, 10, 1, P.wood);
    }
  } };

  DEF.quarry = { w: 48, h: 48, draw(b, S, t) {
    b.poly([[2, 40], [4, 22], [12, 10], [24, 8], [34, 12], [40, 22], [44, 40]], P.stoneD);
    b.poly([[6, 26], [13, 13], [24, 11], [30, 14], [22, 20], [12, 28]], P.stone);
    b.poly([[13, 13], [24, 11], [20, 15]], P.stoneL);
    b.rect(14, 28, 20, 12, P.dirtD); b.rect(14, 28, 20, 1, P.dirt);
    wall(b, S, 16, 32, 7, 6, false); b.rect(16, 32, 7, 1, S.BH);
    wall(b, S, 25, 33, 6, 5, false); b.rect(25, 33, 6, 1, S.BH);
    b.line(7, 44, 12, 37, P.wood); b.poly([[9, 36], [12, 35.5], [15, 38], [14, 39], [12, 37.5], [10, 38]], P.ironL);
    if (t >= 2) {
      b.rect(38, 8, 2, 28, P.wood); b.rect(28, 8, 12, 2, P.wood); b.line(31, 10, 38, 16, P.woodD); b.rect(30, 10, 1, 10, P.dark); b.rect(28, 20, 5, 4, P.stoneM);
      const pc = cone(b, 36, 6, 7, 5, S.R, S.RD); b.rect(35, 7, 8, 1, S.RS);
      if (t >= 4) pennant(b, S, pc, 0, 2, 5); else b.px(pc, 1, S.FID);
    }
    if (t >= 3) { b.rect(36, 38, 9, 5, P.woodD); b.rect(37, 36, 7, 2, S.B2); b.px(37, 43, P.dark); b.px(43, 43, P.dark); torch(b, 3, 40); }
    if (t >= 4) { b.px(16, 16, P.gold); b.px(19, 18, P.gold); b.px(9, 24, P.gold); b.px(22, 14, P.goldL); }
  } };

  DEF.mine = { w: 48, h: 48, draw(b, S, t) {
    const lit = t >= 3, ore = '#7f93b5', oreL = '#c9d8f0', dirt = '#6b4a2e', dirtL = '#8a6440';
    b.poly([[1, 45], [5, 31], [13, 23], [25, 20], [37, 23], [44, 31], [47, 45]], dirt);
    b.poly([[7, 31], [14, 24.5], [25, 21.5], [36, 24.5], [40, 29], [25, 25], [13, 28]], dirtL);
    b.ellipse(25, 21, 11, 2.5, P.leafD); b.ellipse(23, 20.5, 6, 1.5, P.leaf);
    if (t >= 2) {
      b.line(17, 26, 25, 5, P.woodD); b.line(18, 26, 26, 5, P.wood); b.line(34, 26, 26, 5, P.woodD); b.line(33, 26, 25, 5, P.wood);
      b.rect(20, 15, 12, 1, P.woodD); b.rect(22, 10, 8, 1, P.woodD);
      b.disc(25.5, 5, 3.6, P.ironD); b.disc(25.5, 5, 2.2, P.iron); b.px(25, 5, P.k); b.px(26, 4, P.k);
    }
    if (t >= 2) { // кирпичный стрельчатый портал
      polyWall(b, S, [[15, 42], [15, 27], [19, 21], [32, 21], [37, 27], [37, 42]], 15, 24, false);
      b.line(15, 26, 19, 21, S.TL); b.rect(19, 21, 14, 1, S.TL); b.line(33, 21, 37, 26, S.T);
      arch(b, 18, 26, 16, 16, S.T, 1);
      arch(b, 19, 27, 14, 15, P.black, 1);
      b.rect(25, 26, 2, 1, S.TL);
      if (lit) { torch(b, 16, 31); torch(b, 35, 31); }
    } else {
      b.rect(19, 27, 14, 15, P.black);
      b.rect(17, 26, 2, 16, P.wood); b.rect(33, 26, 2, 16, P.wood); b.rect(16, 24, 20, 3, P.woodL); b.rect(16, 26, 20, 1, P.woodD);
    }
    b.rect(14, 42, 24, 1, P.ironD); b.rect(14, 44, 24, 1, P.ironD); for (let x = 15; x < 38; x += 3) b.rect(x, 42, 1, 3, P.woodD);
    b.poly([[33, 35], [45, 35], [44, 41], [34, 41]], P.ironD); b.rect(33, 35, 12, 1, t >= 4 ? S.FI : P.iron);
    for (const [x, y] of [[36, 34], [39, 33], [42, 34]]) { b.disc(x, y, 1.8, ore); b.px(x - 1, y - 1, oreL); }
    b.px(35, 42, P.k); b.px(43, 42, P.k);
    if (t >= 3) { // сторожка с крутой крышей
      cone(b, 1, 13, 31, 9, S.R, S.RD); b.rect(0, 31, 15, 1, S.RS);
      wall(b, S, 2, 32, 11, 9, false);
      arch(b, 5, 35, 3, 6, P.woodD, 1);
      b.rect(9, 34, 2, 3, S.GL); b.px(9, 34, S.GLL);
    }
    if (t >= 4) {
      pennant(b, S, 7, 14, 21, 5);
      for (const [x, y] of [[4, 44], [7, 43], [10, 44], [6, 41]]) { b.disc(x, y, 1.8, ore); b.px(x - 1, y - 1, oreL); }
      b.poly([[38, 43], [46, 43], [45.5, 47], [38.5, 47]], P.ironD); b.rect(38, 43, 8, 1, S.FI); b.px(42, 42, oreL);
    }
  } };

  DEF.warehouse = { w: 48, h: 48, draw(b, S, t) {
    const lit = t >= 3;
    roofG(b, S, 5, 8, 39, 16, t);
    wall(b, S, 6, 24, 37, 16, false);
    if (S.buttress) { buttress(b, S, 14, 24, 16); buttress(b, S, 33, 24, 16); }
    door(b, S, 18, 27, 13, 13);
    b.line(19, 34, 29, 38, P.woodL); b.line(29, 34, 19, 38, P.woodL);
    lancet(b, S, 9, 29, 3, 5, lit); lancet(b, S, 37, 29, 3, 5, lit);
    b.rect(1, 34, 6, 6, P.woodL); b.rect(1, 34, 6, 1, P.wood); b.line(1, 34, 6, 39, P.woodD);
    b.rect(41, 34, 6, 6, P.woodL); b.rect(41, 34, 6, 1, P.wood); b.line(46, 34, 41, 39, P.woodD);
    if (t >= 2) { b.rect(2, 29, 5, 5, P.woodL); b.line(2, 29, 6, 33, P.woodD); b.ellipse(44, 31, 3, 3, P.dirtL); b.rect(43, 28, 2, 1, P.woodD); }
    if (t >= 3) pennant(b, S, 24, 1, 7, 5);
    if (t >= 4) {
      for (const x of [9, 32]) {
        wall(b, S, x, 16, 7, 5, false);
        const pc = cone(b, x - 1, 9, 15, 5, S.RL, S.RD); b.rect(x - 1, 15, 9, 1, S.RS); b.px(pc, 9, S.FI);
        b.rect(x + 2, 17, 3, 3, S.T); b.rect(x + 3, 17, 1, 3, lit ? S.GL : S.WD);
      }
      b.rect(5, 23, 39, 1, S.FI);
    }
  } };

  DEF.arena = { w: 48, h: 48, draw(b, S, t) {
    const sand = '#d8b26a', sandD = '#b48e4c';
    b.ellipse(24, 17, 22, 9, S.B3); b.ellipse(24, 17.5, 20, 7.6, S.B1); b.ellipse(24, 18, 18, 6.5, sandD); b.ellipse(24, 18.5, 16, 5.2, sand);
    b.px(18, 18, sandD); b.px(29, 19, sandD); b.px(24, 17, P.redD);
    wall(b, S, 2, 18, 44, 22, false);
    b.ellipse(24, 40, 22, 5, S.B1);
    b.rect(2, 18, 44, 1, t >= 4 ? S.FI : S.TL);
    for (let x = 4; x < 44; x += 6) {
      arch(b, x - 1, 19, 5, 9, S.T, 2); arch(b, x, 21, 3, 6, S.MO, 2);
      arch(b, x - 1, 28, 5, 9, S.T, 2); arch(b, x, 30, 3, 6, S.MO, 2);
    }
    b.rect(2, 27, 44, 1, S.TD); b.rect(2, 36, 44, 1, S.TD);
    if (t >= 3) for (const x of [10, 34]) { b.rect(x, 22, 3, 5, S.BN); b.px(x + 1, 24, S.FI); }
    door(b, S, 20, 32, 9, 11, true);
    if (t >= 2) for (const x of [6, 24, 42]) pennant(b, S, x, 2, 10, 5);
    if (t >= 4) {
      for (let x = 4; x < 44; x += 4) b.rect(x, 9, 2, 3, (x / 4) % 2 ? S.BN : S.TL);
      spire(b, S, 0, 17, 5, 9, t); spire(b, S, 43, 17, 5, 9, t);
      b.disc(24.5, 29.5, 1.8, S.FI);
    }
  } };

  DEF.forge = { w: 48, h: 48, draw(b, S, t) {
    const lit = t >= 3;
    wall(b, S, 32, 4, 6, 12, true); b.rect(31, 3, 8, 1, S.TL); b.rect(31, 4, 8, 1, S.TD); b.rect(33, 5, 4, 1, P.glow);
    if (t >= 3) { b.px(34, 1, P.glow); b.px(36, 0, P.glowL); b.px(33, 0, P.glow); }
    roofG(b, S, 4, 12, 36, 12, t);
    wall(b, S, 5, 24, 34, 16, true);
    arch(b, 8, 26, 11, 9, S.T, 1); arch(b, 9, 27, 9, 8, P.glow, 1); arch(b, 10, 28, 7, 6, P.glowL, 1); b.rect(13, 29, 1, 6, S.TD);
    b.rect(8, 35, 11, 1, S.TL);
    door(b, S, 24, 29, 9, 11);
    if (t >= 3) { b.rect(38, 30, 1, 6, P.woodD); b.rect(46, 30, 1, 6, P.woodD); b.poly([[36, 30], [47.5, 27], [47.5, 30], [36, 32]], S.R); b.rect(36, 31, 12, 1, S.RD); }
    b.rect(38, 36, 9, 2, P.iron); b.rect(38, 36, 9, 1, P.ironL); b.rect(40, 38, 5, 4, P.ironD); b.rect(39, 42, 7, 1, P.ironD);
    if (t >= 2) { b.line(41, 31, 44, 35, P.wood); b.rect(40, 30, 3, 2, P.ironL); b.rect(1, 34, 4, 6, P.woodD); b.rect(1, 35, 4, 1, P.ironD); }
    if (t >= 4) {
      wall(b, S, 10, 4, 5, 10, true); b.rect(9, 3, 7, 1, S.TL); b.rect(9, 4, 7, 1, S.TD); b.rect(11, 5, 3, 1, P.glow); b.px(12, 1, P.glow); b.px(11, 0, P.glowL);
      b.rect(19, 16, 9, 6, S.BN); b.rect(21, 18, 5, 1, S.FI); b.rect(22, 19, 3, 2, S.FI);
      b.rect(5, 24, 34, 1, S.FI);
    }
    if (lit) b.px(9, 31, P.white);
  } };

  // Гильдия: ступенчатый щипец, как у ратуш кирпичной готики, и вывеска со скрещёнными мечами
  DEF.guild = { w: 48, h: 48, draw(b, S, t) {
    const lit = t >= 3;
    if (t >= 2) { wall(b, S, 38, 7, 4, 9, true); b.rect(37, 6, 6, 1, S.TL); b.rect(37, 7, 6, 1, S.TD); }
    roofG(b, S, 2, 14, 14, 10, t); roofG(b, S, 32, 14, 14, 10, t);
    wall(b, S, 3, 24, 12, 17, false); wall(b, S, 33, 24, 12, 17, false);
    const steps = [[14, 20, 20, 21], [17, 14, 14, 6], [20, 8, 8, 6], [22, 4, 4, 4]];
    for (const [x, y, w, h] of steps) wallO(b, S, x, y, w, h, 14, 20, false);
    const cap = t >= 4 ? S.FI : S.TL;
    for (let i = 0; i < steps.length; i++) {
      const [x, y, w] = steps[i], nx = steps[i + 1];
      if (!nx) { b.rect(x, y, w, 1, cap); continue; }
      const lw = nx[0] - x;
      b.rect(x, y, lw, 1, cap); b.rect(x + w - lw, y, lw, 1, cap);
      b.px(x, y - 1, cap); b.px(x + w - 1, y - 1, cap);
      b.rect(x + 1, y + 1, 1, 4, S.TD); b.rect(x + w - 2, y + 1, 1, 4, S.TD);
    }
    b.rect(23, 2, 2, 2, t >= 4 ? S.FI : S.FID);
    // глухие ниши и окна в щипце
    for (const x of [19, 27]) { b.rect(x, 15, 2, 4, S.WD); b.px(x, 15, S.TD); b.px(x + 1, 15, S.TD); }
    b.disc(24, 11.5, 2.4, S.T); b.disc(24, 11.5, 1.4, lit ? S.GL : S.WD);
    lancet(b, S, 16, 22, 3, 6, lit); lancet(b, S, 21, 22, 2, 6, lit); lancet(b, S, 25, 22, 2, 6, lit); lancet(b, S, 29, 22, 3, 6, lit);
    lancet(b, S, 7, 28, 3, 6, lit); lancet(b, S, 38, 28, 3, 6, lit);
    door(b, S, 20, 31, 8, 10);
    if (lit) { torch(b, 18, 33); torch(b, 29, 33); }
    // вывеска
    b.rect(13, 32, 7, 1, P.woodD); b.rect(13, 33, 5, 5, S.BN); b.line(13, 33, 17, 37, P.ironL); b.line(17, 33, 13, 37, P.ironL); b.px(15, 35, S.FI);
    b.rect(42, 36, 5, 6, P.woodD); b.rect(42, 37, 5, 1, P.ironD); b.rect(42, 40, 5, 1, P.ironD);
    if (t >= 4) {
      pennant(b, S, 24, 0, 2, 5);
      for (const x of [7, 38]) { b.rect(x - 1, 35, 5, 1, P.leaf); b.px(x - 1, 34, P.redL); b.px(x + 1, 34, P.gold); b.px(x + 3, 34, P.redL); }
    }
  } };

  DEF.barracks = { w: 48, h: 48, draw(b, S, t) {
    const lit = t >= 3;
    roofG(b, S, 3, 7, 34, 12, t);
    wall(b, S, 4, 21, 32, 19, false);
    merlons(b, S, 3, 18, 34); cornice(b, S, 3, 21, 34, t);
    door(b, S, 16, 29, 8, 11);
    lancet(b, S, 8, 26, 2, 6, lit); lancet(b, S, 30, 26, 2, 6, lit);
    if (t >= 2) for (const x of [12.5, 27.5]) { b.disc(x, 27.5, 2, S.BN); b.px(x - 0.5, 27, S.FI); }
    b.rect(41, 4, 1, 36, P.woodD); b.rect(41, 3, 1, 1, S.FI);
    banner(b, S, 42, 5, 5, 12, t);
    b.rect(38, 35, 1, 8, P.wood); b.rect(36, 37, 5, 1, P.wood); b.disc(38.5, 33, 2, P.dirtL);
    if (t >= 2) { b.line(1, 32, 1, 43, P.wood); b.px(1, 31, P.ironL); b.line(3, 33, 3, 43, P.wood); b.px(3, 32, P.ironL); }
    if (t >= 3) { b.poly([[26, 44], [30, 37], [34, 44]], S.BN); b.line(30, 37, 30, 44, S.BND); }
    if (t >= 4) {
      wall(b, S, 0, 12, 9, 17, false); cornice(b, S, -1, 10, 11, t);
      lancet(b, S, 3, 15, 3, 4, lit);
      spire(b, S, 0, 9, 9, 8, t);
    }
  } };

  DEF.academy = { w: 48, h: 48, draw(b, S, t) {
    const lit = t >= 3;
    roofG(b, S, 3, 17, 43, 10, t);
    wall(b, S, 4, 27, 41, 14, false);
    for (const x of [7, 13, 34, 40]) lancet(b, S, x, 30, 2, 7, lit);
    if (S.buttress) for (const x of [10, 16, 31, 37]) buttress(b, S, x, 28, 13);
    wall(b, S, 18, 14, 13, 27, false);
    cornice(b, S, 17, 12, 15, t);
    if (S.rose) rose(b, S, 24.5, 21.5, 3, lit); else lancet(b, S, 23, 18, 3, 8, lit);
    door(b, S, 21, 31, 7, 10);
    const tip = spire(b, S, 18, 11, 13, 11, t);
    b.rect(16, 41, 17, 1, S.TL); b.rect(14, 42, 21, 2, S.T); b.rect(14, 43, 21, 1, S.TD);
    if (t >= 3) b.px(tip.x, tip.y, S.FI);
    if (t >= 4) {
      b.disc(3, 32, 1.6, P.purpleL); b.px(3, 32, P.white); b.disc(45, 33, 1.6, P.cry); b.px(45, 33, P.white); b.disc(7, 23, 1.2, P.purpleL); b.disc(41, 22, 1.2, P.cry);
      b.rect(4, 40, 41, 1, S.FI);
    }
  } };

  const ORDER = [
    ['castle', 'Замок'], ['gate', 'Главные ворота'], ['lumber', 'Лесопилка'], ['quarry', 'Каменоломня'], ['mine', 'Шахта'],
    ['warehouse', 'Склад'], ['forge', 'Кузница'], ['guild', 'Гильдия'], ['barracks', 'Казармы'], ['academy', 'Академия'], ['arena', 'Арена'],
  ];

  // Ключ здания в игре → рисунок стиля (Таверна в игре — это Гильдия)
  const NAME = { castle: 'castle', gate: 'gate', lumber: 'lumber', quarry: 'quarry', mine: 'mine', warehouse: 'warehouse', forge: 'forge', tavern: 'guild', barracks: 'barracks', academy: 'academy', arena: 'arena' };
  const style = (id) => STYLES.find((S) => S.id === id) || null;
  function render(name, id, t, white) {
    const d = DEF[NAME[name] || name], S = style(id);
    if (!d || !S) return null;
    const b = new Buf(d.w, d.h);
    d.draw(b, S, Math.max(1, Math.min(4, t || 1)));
    b.outline(P.k);
    return b.canvas(white);
  }

  G.GOTH = { STYLES, ORDER, NAME, style, render, has: (k) => !!NAME[k] };
})();
