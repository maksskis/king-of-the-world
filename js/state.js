(function () {
  const KEY = 'crown-steel-save-v1';

  G.newState = function () {
    return {
      v: 1,
      lang: 'ru',
      res: { gold: 25, wood: 0, stone: 0, iron: 0, bone: 0, crystal: 0, mithril: 0 },
      seen: { gold: true, wood: true, stone: true },
      b: {
        castle: { lvl: 1, w: 0 },
        lumber: { lvl: 1, w: 0 },
        quarry: { lvl: 1, w: 0 },
        mine: { lvl: 0, w: 0 },
        forge: { lvl: 0, w: 0 },
        tavern: { lvl: 0, w: 0 },
        barracks: { lvl: 0, w: 0 },
        gate: { lvl: 1, w: 0 },
        dungeon: { lvl: 1, w: 0 },
      },
      king: { tools: 0 },
      items: [],
      advs: [],
      guards: 0,
      tavern: { cands: [], t: 0 },
      forge: { q: [] },
      gate: { best: 0, sel: 1 },
      exp: null,
      lastExp: null,
      dng: { best: 0, live: true, tactic: 'balanced', maxFloor: 3 },
      stats: { clicks: 0, kills: 0, crafted: 0 },
      goal: 0,
      log: [],
      lastSave: Date.now(),
    };
  };

  function merge(def, s) {
    for (const k in def) {
      if (s[k] === undefined) s[k] = def[k];
      else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) && s[k] && typeof s[k] === 'object') merge(def[k], s[k]);
    }
    return s;
  }

  G.save = function () {
    if (!G.S) return;
    try {
      G.S.lastSave = Date.now();
      G.S.lang = G.LANG;
      localStorage.setItem(KEY, JSON.stringify(G.S));
    } catch (e) { /* хранилище недоступно — играем без сохранения */ }
  };

  G.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return merge(G.newState(), JSON.parse(raw));
    } catch (e) {
      return null;
    }
  };

  G.wipe = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  };

  G.exportSave = () => btoa(unescape(encodeURIComponent(JSON.stringify(G.S))));
  G.importSave = function (str) {
    const s = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    if (!s || !s.res || !s.b) throw new Error('bad save');
    return merge(G.newState(), s);
  };

  // Записи журнала хранят ключ и параметры, чтобы перерисовываться при смене языка.
  G.log = function (k, p, c) {
    const S = G.S;
    S.log.push({ k, p: p || {}, c: c || 'info', t: Date.now() });
    if (S.log.length > 60) S.log.splice(0, S.log.length - 60);
    if (G.UI) G.UI.logDirty = true;
  };
})();
