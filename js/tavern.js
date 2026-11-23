(function () {
  const T = (G.T = {});
  const tl = () => G.E.lvl('tavern');

  T.REFRESH = 180;
  T.maxAdvs = () => (tl() > 0 ? 2 + tl() : 0);

  T.rarWeights = function () {
    const k = 0.15 * (tl() - 1);
    return G.D.ARAR.map((r, i) => r.w * Math.pow(1 + k, i));
  };
  T.rarChances = function () {
    const w = T.rarWeights();
    const s = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / s);
  };

  T.gen = function () {
    const rar = G.U.weighted(T.rarWeights());
    const cls = G.U.pick(Object.keys(G.D.CLS));
    const n = G.U.pick(G.D.NAMES);
    const name = { ru: n[0], en: n[1] };
    if (rar === 3) {
      const e = G.U.pick(G.D.ADV_EPI);
      name.ru += ' ' + e[0];
      name.en += ' ' + e[1];
    }
    const a = { id: G.U.uid(), name, cls, rar, lvl: 1, xp: 0, hp: 0, st: 'idle', wt: 0, cost: Math.ceil(G.D.ARAR[rar].cost * G.U.rand(0.9, 1.1)) };
    a.hp = T.stats(a).hp;
    return a;
  };

  T.refreshCost = () => ({ gold: 15 * Math.max(1, tl()) });
  T.refresh = function (free) {
    if (!free && !G.E.pay(T.refreshCost())) return;
    G.S.tavern.cands = [T.gen(), T.gen(), T.gen()];
    G.S.tavern.t = T.REFRESH;
    G.UI.dirty();
  };

  T.hire = function (i) {
    const c = G.S.tavern.cands[i];
    if (!c || G.S.advs.length >= T.maxAdvs()) return;
    if (!G.E.pay({ gold: c.cost })) return;
    G.S.tavern.cands.splice(i, 1);
    delete c.cost;
    c.st = 'idle';
    G.S.advs.push(c);
    G.log('logHired', { name: c.name, cls: G.D.CLS[c.cls].name }, 'good');
    G.UI.dirty();
  };

  T.stats = function (a) {
    const C = G.D.CLS[a.cls], m = G.D.ARAR[a.rar].mult, L = a.lvl - 1;
    let hp = (C.hp + C.ghp * L) * m, atk = (C.atk + C.gatk * L) * m, def = (C.def + C.gdef * L) * m;
    for (const it of G.S.items) {
      if (it.eq === a.id) { atk += it.atk; def += it.def; hp += it.hp; }
    }
    return { hp: Math.round(hp), atk: Math.round(atk), def: Math.round(def) };
  };

  T.xpNeed = (l) => Math.round(40 * Math.pow(1.4, l - 1));
  T.giveXp = function (a, n) {
    a.xp += n;
    let up = false;
    while (a.xp >= T.xpNeed(a.lvl)) {
      a.xp -= T.xpNeed(a.lvl);
      const before = T.stats(a).hp;
      a.lvl++;
      if (a.hp > 0) a.hp += T.stats(a).hp - before;
      up = true;
    }
    if (up) G.log('logLevel', { name: a.name, l: a.lvl }, 'good');
  };

  T.get = (id) => G.S.advs.find((a) => a.id === id);

  T.gateMax = () => Math.min(6, 2 + G.E.lvl('gate'));
  T.gateCount = () => G.S.advs.filter((a) => a.st === 'gate').length;
  T.setGate = function (id) {
    const a = T.get(id);
    if (!a || (G.W && G.W.active())) return;
    if (a.st === 'idle') {
      if (T.gateCount() >= T.gateMax()) return;
      a.st = 'gate';
    } else if (a.st === 'gate') a.st = 'idle';
    G.UI.dirty();
  };

  T.dismiss = function (id) {
    const a = T.get(id);
    if (!a || a.st === 'dungeon') return;
    for (const it of G.S.items) if (it.eq === id) it.eq = null;
    G.S.advs = G.S.advs.filter((x) => x.id !== id);
    G.log('logDismiss', { name: a.name }, 'info');
    G.UI.dirty();
  };

  // Гибель авантюриста. В подземелье снаряжение остаётся с телом.
  T.kill = function (a, inDungeon) {
    let lost = 0;
    for (const it of G.S.items) {
      if (it.eq !== a.id) continue;
      if (inDungeon) { it.eq = '__lost'; lost++; } else it.eq = null;
    }
    if (lost) G.S.items = G.S.items.filter((i) => i.eq !== '__lost');
    G.S.advs = G.S.advs.filter((x) => x.id !== a.id);
    G.log(lost ? 'logDiedLost' : 'logDied', { name: a.name, n: lost }, 'bad');
    G.UI.dirty();
  };

  T.wound = function (a, sec) {
    a.st = 'wounded';
    a.wt = sec;
    a.hp = 0;
  };

  T.tick = function (dt) {
    if (tl() > 0) {
      G.S.tavern.t -= dt;
      if (G.S.tavern.t <= 0) T.refresh(true);
    }
    const inBattle = G.W && G.W.active();
    for (const a of G.S.advs) {
      if (a.st === 'wounded') {
        const mx = T.stats(a).hp;
        a.wt -= dt;
        a.hp = Math.min(mx, a.hp + (mx * dt) / 90);
        if (a.wt <= 0) {
          a.st = 'idle';
          G.log('logRecovered', { name: a.name }, 'info');
          G.UI.dirty();
        }
      } else if (a.st === 'idle' || (a.st === 'gate' && !inBattle)) {
        const mx = T.stats(a).hp;
        if (a.hp < mx) a.hp = Math.min(mx, a.hp + mx * 0.03 * dt);
      }
    }
  };

  // Стража
  T.maxGuards = () => 3 * G.E.lvl('barracks');
  T.guardCost = function () {
    const n = G.S.guards;
    return { gold: Math.ceil(20 * Math.pow(1.22, n)), iron: Math.ceil(4 * Math.pow(1.18, n)) };
  };
  T.guardDmg = () => 2 * (1 + 0.3 * (G.E.lvl('barracks') - 1));
  T.hireGuard = function () {
    if (G.S.guards >= T.maxGuards()) return;
    if (!G.E.pay(T.guardCost())) return;
    G.S.guards++;
    G.UI.dirty();
  };
})();
