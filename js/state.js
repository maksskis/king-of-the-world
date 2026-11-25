(function () {
  const KEY = 'king-of-world-save-v3';

  G.newState = function (dyn) {
    const b = {};
    for (const k in G.D.B) b[k] = { lvl: G.D.B[k].start || (G.D.B[k].noLevel ? 1 : 0), w: 0 };
    return {
      v: 3,
      lang: 'ru',
      sound: true,
      style: 'A', // облик города: A–E готика или classic
      res: { gold: 0, wood: 10, stone: 0, iron: 0, bone: 0, crystal: 0, mithril: 0, adamant: 0 },
      seen: { gold: true, wood: true },
      b,
      cons: [], // идущие стройки: {k, t, total}
      decree: { build: [], research: [] }, // указы — очереди приоритетов
      research: { done: {}, act: [] }, // act: идущие исследования [{id, t, total}]
      folk: 0, folkT: 0, // жители и таймер прихода следующего
      king: { lvl: 1, xp: 0, tools: 0, tal: {}, cd: {}, buff: {}, auto: true }, // auto — автоклик включён
      advisors: {},
      items: [],
      advs: [],
      guards: 0,
      tavern: { cands: [], t: 0, rr: 0 }, // rr — сколько раз звал новых за золото с последнего прихода
      forge: { q: [] },
      gate: { best: 0, sel: 1 },
      exps: [], // отряды в походах
      lastExp: null,
      arena: { rank: 1, best: 0, cd: 0, team: [], wins: 0, last: null },
      dng: { best: {}, maxFloor: 3, start: 1, loc: 'catacombs', hp: 0.4, down: true, boss: false, avoid: 0.3 },
      camp: { awake: false, won: false },
      lg8: {}, // здания, уже давшие очко наследия за 8-й уровень в этом правлении
      dyn: dyn || { epoch: 0, pts: 0, perks: {} },
      stats: { clicks: 0, kills: 0, crafted: 0, decreed: 0, resQueued: 0, sold: 0, spells: 0, enchanted: 0 },
      goal: 0, // goalV ставит перенос прогресса целей при загрузке
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
    if (!G.S || G.resetting) return;
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
    if (!s || !s.res || !s.b || s.v !== 3) throw new Error('bad save');
    return merge(G.newState(), s);
  };

  // Записи журнала: ключ + параметры, чтобы перерисовываться при смене языка
  G.log = function (k, p, c) {
    const S = G.S;
    S.log.push({ k, p: p || {}, c: c || 'info' });
    if (S.log.length > 80) S.log.splice(0, S.log.length - 80);
    if (G.UI) G.UI.logDirty = true;
  };
})();
