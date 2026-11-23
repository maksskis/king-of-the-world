(function () {
  const X = (G.X = {});
  const ASK_SEC = 20;
  X.maxParty = 4;
  X.travelTime = (f) => 12 + 2 * f;
  X.returnTime = (f) => 8 + 3 * f;

  // Порог отступления по доле здоровья отряда для каждого приказа
  const RETREAT = { aggressive: 0.2, balanced: 0.4, careful: 0.6 };

  X.enemy = function (f) {
    const boss = f % 5 === 0;
    let key;
    if (boss) key = (f / 5) % 2 === 1 ? 'troll' : 'lich';
    else {
      const pool = f <= 3 ? ['slime', 'goblin', 'spider'] : f <= 7 ? ['goblin', 'skeleton', 'wolf', 'spider'] : ['skeleton', 'orc', 'wolf', 'spider'];
      key = G.U.pick(pool);
    }
    const count = boss ? 1 : G.U.randInt(2, 4);
    const hp = Math.round(45 * Math.pow(1.25, f - 1) * (boss ? 3 : 1) * (count / 3));
    const atk = Math.round(7 * Math.pow(1.18, f - 1) * (boss ? 1.6 : 1) * (0.7 + count * 0.1) * 10) / 10;
    return { key, count, hp, max: hp, atk, boss, f };
  };

  X.members = () => (G.S.exp ? G.S.exp.party.map(G.T.get).filter(Boolean) : []);
  function snap(members) {
    return members.map((a) => {
      const s = G.T.stats(a);
      return { a, cls: a.cls, hp: a.hp, max: s.hp, atk: s.atk, def: s.def };
    });
  }
  function xlog(k, p, c) {
    const e = G.S.exp;
    e.log.push({ k, p: p || {}, c: c || 'info' });
    if (e.log.length > 40) e.log.shift();
  }

  // Абстрактный бой по раундам. Не меняет исходные данные.
  X.fight = function (ps, enemy, stance) {
    const P = ps.map((p) => Object.assign({}, p));
    let eh = enemy.hp, rounds = 0, taken = 0;
    const dealtM = stance === 'attack' ? 1.35 : 0.75, takenM = stance === 'attack' ? 1.2 : 0.55;
    while (rounds < 40) {
      rounds++;
      const alive = P.filter((p) => p.hp > 0);
      if (!alive.length) break;
      let d = 0;
      for (const p of alive) d += p.cls === 'priest' ? p.atk * 0.6 : p.atk;
      eh -= d * dealtM * G.U.rand(0.85, 1.15);
      if (eh <= 0) break;
      const hits = enemy.boss ? 1 : Math.min(enemy.count, 2);
      for (let h = 0; h < hits; h++) {
        const al = P.filter((p) => p.hp > 0);
        if (!al.length) break;
        const wars = al.filter((p) => p.cls === 'warrior');
        const tg = wars.length && Math.random() < 0.6 ? G.U.pick(wars) : G.U.pick(al);
        const dmg = ((enemy.atk / hits) * takenM * G.U.rand(0.85, 1.15) * 20) / (20 + tg.def);
        tg.hp = Math.max(0, tg.hp - dmg);
        taken += dmg;
      }
      for (const pr of P) {
        if (pr.cls !== 'priest' || pr.hp <= 0) continue;
        const al = P.filter((p) => p.hp > 0 && p.hp < p.max).sort((a, b) => a.hp / a.max - b.hp / b.max);
        if (al.length) al[0].hp = Math.min(al[0].max, al[0].hp + pr.atk * 0.9);
      }
    }
    const win = eh <= 0;
    return { win, wiped: !win && P.every((p) => p.hp <= 0), P, taken };
  };

  X.chance = function (stance) {
    const e = G.S.exp;
    if (!e || !e.enemy) return 0;
    const ps = snap(X.members());
    let w = 0;
    const N = 40;
    for (let i = 0; i < N; i++) if (X.fight(ps, e.enemy, stance).win) w++;
    return w / N;
  };
  X.fleeChance = function () {
    const arch = X.members().filter((a) => a.hp > 0 && a.cls === 'archer').length;
    return G.U.clamp(0.65 + 0.08 * arch - 0.02 * G.S.exp.enemy.f, 0.2, 0.9);
  };
  X.hpRatio = function () {
    let h = 0, m = 0;
    for (const a of X.members()) { h += Math.max(0, a.hp); m += G.T.stats(a).hp; }
    return m ? h / m : 0;
  };

  X.start = function (ids, tactic, maxFloor) {
    if (G.S.exp || G.E.lvl('tavern') < 1) return;
    const party = ids.map(G.T.get).filter((a) => a && a.st === 'idle' && a.hp > 0).slice(0, X.maxParty);
    if (!party.length) return;
    for (const a of party) a.st = 'dungeon';
    const t = X.travelTime(1);
    G.S.exp = { party: party.map((a) => a.id), tactic, maxFloor, floor: 0, phase: 'travel', t, tt: t, enemy: null, pend: null, loot: {}, log: [], recall: false };
    xlog('xStart', { n: party.length });
    G.log('logExpStart', { n: party.length }, 'info');
    G.UI.dirty();
  };

  X.present = () => document.visibilityState === 'visible' && !G.offlineSim;

  X.ask = function (kind) {
    const e = G.S.exp;
    if (G.S.dng.live && X.present()) {
      e.pend = { kind, dl: Date.now() + ASK_SEC * 1000 };
      G.UI.openDecision();
    } else X.decide(kind, X.autoChoice(kind), true);
  };

  X.autoChoice = function (kind) {
    const e = G.S.exp;
    if (kind === 'enc') {
      const ca = X.chance('attack'), cd = X.chance('defend');
      if (e.tactic === 'aggressive') {
        if (ca < 0.15 && cd < 0.15) return 'flee';
        return ca >= cd * 0.9 ? 'attack' : 'defend';
      }
      if (e.tactic === 'balanced') {
        if (Math.max(ca, cd) < 0.4) return 'flee';
        return ca >= cd ? 'attack' : 'defend';
      }
      if (cd >= 0.7) return 'defend';
      return ca >= 0.85 ? 'attack' : 'flee';
    }
    if (e.recall || e.floor >= e.maxFloor) return 'return';
    return X.hpRatio() < RETREAT[e.tactic] ? 'return' : 'deeper';
  };

  X.tick = function (dt) {
    const e = G.S.exp;
    if (!e) return;
    if (e.pend) {
      if (Date.now() > e.pend.dl || !X.present()) X.decide(e.pend.kind, X.autoChoice(e.pend.kind), true);
      return;
    }
    if (e.phase === 'travel') {
      for (const a of X.members()) {
        if (a.hp > 0) { const mx = G.T.stats(a).hp; a.hp = Math.min(mx, a.hp + mx * 0.004 * dt); }
      }
      e.t -= dt;
      if (e.t <= 0) {
        e.enemy = X.enemy(e.floor + 1);
        e.phase = 'enc';
        xlog('xEnc', { f: e.floor + 1, m: X.enemyName(e.enemy) });
        G.UI.dirty();
        X.ask('enc');
      }
    } else if (e.phase === 'ret') {
      e.t -= dt;
      if (e.t <= 0) X.finish(true);
    } else if (e.phase === 'enc' || e.phase === 'after') X.ask(e.phase);
  };

  X.enemyName = function (en) {
    const M = G.D.MON[en.key];
    if (en.boss) return M.name;
    return { ru: M.pl.ru + ' ×' + en.count, en: M.pl.en + ' ×' + en.count };
  };

  X.decide = function (kind, ch, auto) {
    const e = G.S.exp;
    if (!e) return;
    if (e.pend && e.pend.kind !== kind) return;
    if (!e.pend && e.phase !== (kind === 'enc' ? 'enc' : 'after')) return;
    e.pend = null;
    G.UI.closeDecision();
    xlog(auto ? 'xAuto' : 'xOrder', { c: ch });
    if (kind === 'enc') {
      if (ch === 'flee') {
        if (Math.random() < X.fleeChance()) {
          xlog('xFled', {}, 'warn');
          for (const r in e.loot) e.loot[r] = Math.floor(e.loot[r] * 0.7);
          X.goHome();
          G.UI.dirty();
          return;
        }
        xlog('xFleeFail', {}, 'bad');
        for (const a of X.members()) {
          if (a.hp <= 0) continue;
          const s = G.T.stats(a);
          a.hp = Math.max(0, a.hp - (e.enemy.atk * 0.5 * 20) / (20 + s.def));
        }
        ch = 'defend';
      }
      X.resolve(ch);
    } else if (ch === 'deeper') {
      e.phase = 'travel';
      e.t = e.tt = X.travelTime(e.floor + 1);
      xlog('xDeeper', { f: e.floor + 1 });
    } else X.goHome();
    G.UI.dirty();
  };

  X.goHome = function () {
    const e = G.S.exp;
    e.phase = 'ret';
    e.t = e.tt = X.returnTime(Math.max(1, e.floor));
    xlog('xReturn', {});
  };

  X.resolve = function (stance) {
    const e = G.S.exp;
    const ms = X.members();
    const ps = snap(ms);
    const before = ps.map((p) => p.hp);
    const r = X.fight(ps, e.enemy, stance);
    r.P.forEach((p, i) => { ps[i].a.hp = p.hp; });
    const fell = ps.filter((p, i) => before[i] > 0 && p.a.hp <= 0).map((p) => p.a);
    const deathChance = r.win ? 0.15 : 0.5;
    const dead = fell.filter(() => Math.random() < deathChance);

    if (r.win) {
      e.floor++;
      if (e.floor > G.S.dng.best) G.S.dng.best = e.floor;
      const L = X.loot(e.floor, e.enemy.boss);
      for (const k in L) e.loot[k] = (e.loot[k] || 0) + L[k];
      const xp = Math.round(12 * Math.pow(1.17, e.floor - 1) * (e.enemy.boss ? 2 : 1));
      for (const a of ms) if (a.hp > 0) G.T.giveXp(a, xp);
      xlog('xWin', { f: e.floor, d: Math.round(r.taken), loot: L }, 'good');
      for (const a of dead) { xlog('xFallen', { name: a.name }, 'bad'); G.T.kill(a, true); }
      for (const a of fell) if (!dead.includes(a)) xlog('xDowned', { name: a.name }, 'warn');
      e.enemy = null;
      if (!X.members().some((a) => a.hp > 0)) { X.goHome(); return; }
      e.phase = 'after';
      X.ask('after');
    } else if (r.wiped) {
      xlog('xWiped', { f: e.floor + 1 }, 'bad');
      for (const a of dead) { xlog('xFallen', { name: a.name }, 'bad'); G.T.kill(a, true); }
      e.loot = {};
      X.finish(false);
    } else {
      xlog('xStalemate', {}, 'warn');
      X.goHome();
    }
  };

  X.loot = function (f, boss) {
    const m = boss ? 2.5 : 1;
    const L = { gold: Math.round(12 * Math.pow(1.2, f - 1) * m), bone: Math.round((1 + f * 0.6) * m) };
    if (f >= 2) L.crystal = Math.max(1, Math.round(f * 0.5 * m));
    if (f >= 4) L.mithril = Math.round((Math.floor(f / 4) + (Math.random() < 0.5 ? 1 : 0)) * m);
    return L;
  };

  X.recall = function () {
    const e = G.S.exp;
    if (!e || e.phase === 'ret') return;
    e.recall = true;
    xlog('xRecall', {}, 'warn');
    if (e.phase === 'travel') X.goHome();
    G.UI.dirty();
  };

  X.finish = function (ok) {
    const e = G.S.exp;
    if (!e) return;
    G.E.addAll(e.loot);
    for (const a of X.members()) {
      if (a.hp <= 0) G.T.wound(a, 90);
      else a.st = 'idle';
    }
    G.log(ok ? 'logExpBack' : 'logExpFail', { f: e.floor, loot: e.loot }, ok ? 'good' : 'bad');
    G.S.lastExp = { ok, floor: e.floor, loot: e.loot, log: e.log.slice(-14) };
    G.S.exp = null;
    G.UI.closeDecision();
    G.UI.dirty();
    G.save();
  };
})();
