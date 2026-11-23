window.G = window.G || {};

(function () {
  const U = (G.U = {});
  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];

  U.fmt = function (n) {
    if (n === undefined || n === null || isNaN(n)) return '0';
    if (!isFinite(n)) return '∞';
    const neg = n < 0;
    n = Math.abs(n);
    let s;
    if (n < 1000) s = String(Math.floor(n));
    else {
      let i = 0;
      while (n >= 1000 && i < SUF.length - 1) { n /= 1000; i++; }
      s = (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + SUF[i];
    }
    return neg ? '-' + s : s;
  };

  U.fmt1 = function (n) {
    if (Math.abs(n) >= 100) return U.fmt(n);
    return String(Math.round(n * 10) / 10);
  };

  U.fmtTime = function (s) {
    s = Math.max(0, Math.ceil(s));
    const en = G.LANG === 'en';
    if (s < 60) return s + (en ? 's' : 'с');
    if (s < 3600) {
      const m = Math.floor(s / 60), r = s % 60;
      return m + ':' + String(r).padStart(2, '0');
    }
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h + (en ? 'h ' : 'ч ') + m + (en ? 'm' : 'м');
  };

  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.uid = () => Math.random().toString(36).slice(2, 10);

  U.weighted = function (ws) {
    let sum = 0;
    for (const w of ws) sum += w;
    let r = Math.random() * sum;
    for (let i = 0; i < ws.length; i++) {
      r -= ws[i];
      if (r < 0) return i;
    }
    return ws.length - 1;
  };

  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.scaleCost = function (base, m) {
    const o = {};
    for (const k in base) o[k] = Math.ceil(base[k] * m);
    return o;
  };

  // Детерминированный генератор (mulberry32) — для фона карты и состава волн.
  U.seeded = function (seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
})();
