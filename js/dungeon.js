(function () {
  const X = (G.X = {});
  const D = G.D;
  const ASK_SEC = 20, ROUND = 1.2, MAX_ROUNDS = 40;
  X.maxParty = 4;
  X.travelTime = (f) => 10 + 2 * f;
  X.returnTime = (f) => 8 + 2 * f;
  const RETREAT = { aggressive: 0.2, balanced: 0.4, careful: 0.6 };

  // ---------- локации ----------
  X.loc = (id) => D.LOCS[id];
  X.locOpen = function (id) {
    const L = D.LOCS[id];
    if (G.E.lvl('tavern') < 1) return false;
    return !L.unlock || G.R.done(L.unlock);
  };
  X.best = (id) => G.S.dng.best[id] || 0;
  X.floors = (id) => D.LOCS[id].floors || Infinity;

  X.enemy = function (locId, f) {
    const L = D.LOCS[locId];
    const boss = f % 5 === 0 || f === L.floors;
    const key = boss ? L.boss(f) : G.U.pick(L.pool(f));
    const count = boss ? 1 : G.U.randInt(2, 4);
    const diff = L.diff * G.K.epochMul();
    const hp = Math.round(45 * Math.pow(1.25, f - 1) * diff * (boss ? 3 : 1) * (count / 3));
    const atk = Math.round(7 * Math.pow(1.18, f - 1) * Math.pow(diff, 0.8) * (boss ? 1.6 : 1) * (0.7 + count * 0.1) * 10) / 10;
    return { key, count, hp, max: hp, atk, boss, f };
  };
  X.enemyName = function (en) {
    if (en.boss) return { k: 'mn_' + en.key };
    return { k: 'mp_' + en.key, suffix: ' ×' + en.count };
  };

  X.members = () => (G.S.exp ? G.S.exp.party.map(G.T.get).filter(Boolean) : []);
  function snap(members) {
    return members.map((a) => {
      const s = G.T.stats(a);
      return { a, cls: a.cls, hp: a.hp, max: s.hp, atk: s.atk, def: s.def, heal: G.T.skillSum(a, 'heal'), splash: G.T.skillSum(a, 'splash'), guard: G.T.skillSum(a, 'guard') };
    });
  }
  function xlog(k, p, c) {
    const e = G.S.exp;
    e.log.push({ k, p: p || {}, c: c || 'info' });
    if (e.log.length > 40) e.log.shift();
  }
  function flog(k, p, c) {
    const e = G.S.exp;
    e.flog.push({ k, p: p || {}, c: c || 'info' });
    if (e.flog.length > 9) e.flog.shift();
  }
  const MULT = { attack: [1.35, 1.2], defend: [0.75, 0.55] };

  // Один раунд боя над массивом бойцов (общий для живого боя и оценки шансов)
  function roundCore(P, en, ehp, stance, out) {
    const [dealtM, takenM] = MULT[stance];
    const alive = P.filter((p) => p.hp > 0);
    let d = 0;
    for (const p of alive) {
      d += p.cls === 'priest' ? p.atk * 0.6 : p.atk;
      if (p.cls === 'mage' && en.count > 1) d += p.atk * (0.3 + p.splash);
    }
    d *= dealtM * G.U.rand(0.85, 1.15);
    ehp -= d;
    if (out) out.push(['fr_party', { d: Math.round(d) }, 'good']);
    if (ehp <= 0) return ehp;
    const dr = Math.min(0.3, alive.reduce((s, p) => s + p.guard, 0));
    const hits = en.boss ? 1 : Math.min(en.count, 2);
    for (let h = 0; h < hits; h++) {
      const al = P.filter((p) => p.hp > 0);
      if (!al.length) break;
      const wars = al.filter((p) => p.cls === 'warrior');
      const tg = wars.length && Math.random() < 0.6 ? G.U.pick(wars) : G.U.pick(al);
      const dmg = (((en.atk / hits) * takenM * G.U.rand(0.85, 1.15) * 20) / (20 + tg.def)) * (1 - dr);
      tg.hp = Math.max(0, tg.hp - dmg);
      if (out) {
        out.push(['fr_dmg', { name: tg.a.name, d: Math.round(dmg) }, 'bad']);
        if (tg.hp <= 0) out.push(['fr_down', { name: tg.a.name }, 'bad']);
      }
    }
    for (const pr of P) {
      if (pr.cls !== 'priest' || pr.hp <= 0) continue;
      const al = P.filter((p) => p.hp > 0 && p.hp < p.max).sort((a, b) => a.hp / a.max - b.hp / b.max);
      if (!al.length) continue;
      const h = pr.atk * 0.9 * (1 + pr.heal);
      al[0].hp = Math.min(al[0].max, al[0].hp + h);
      if (out) out.push(['fr_heal', { name: pr.a.name, who: al[0].a.name, h: Math.round(h) }, 'good']);
    }
    return ehp;
  }

  X.sim = function (ps, en, stance) {
    const P = ps.map((p) => Object.assign({}, p));
    let ehp = en.hp, r = 0;
    while (r++ < MAX_ROUNDS && P.some((p) => p.hp > 0)) {
      ehp = roundCore(P, en, ehp, stance, null);
      if (ehp <= 0) return true;
    }
    return false;
  };
  X.chance = function (stance) {
    const e = G.S.exp;
    if (!e || !e.enemy) return 0;
    const ps = snap(X.members());
    let w = 0;
    for (let i = 0; i < 40; i++) if (X.sim(ps, e.enemy, stance)) w++;
    return w / 40;
  };
  X.fleeChance = function () {
    const ms = X.members().filter((a) => a.hp > 0);
    const arch = ms.filter((a) => a.cls === 'archer').length;
    return G.U.clamp(0.65 + 0.08 * arch + G.T.partySum(ms, 'flee') - 0.02 * G.S.exp.floor, 0.2, 0.95);
  };
  X.hpRatio = function () {
    let h = 0, m = 0;
    for (const a of X.members()) { h += Math.max(0, a.hp); m += G.T.stats(a).hp; }
    return m ? h / m : 0;
  };

  X.start = function (ids, loc, tactic, maxFloor) {
    if (G.S.exp || !X.locOpen(loc)) return;
    const party = ids.map(G.T.get).filter((a) => a && a.st === 'idle' && a.hp > 0).slice(0, X.maxParty);
    if (!party.length) return;
    for (const a of party) a.st = 'dungeon';
    const t = X.travelTime(1);
    G.S.exp = {
      loc, party: party.map((a) => a.id), tactic, maxFloor: Math.min(maxFloor, X.floors(loc)),
      floor: 1, cleared: 0, phase: 'travel', t, tt: t, enemy: null, stance: null, ehp: 0, rt: 0, round: 0,
      fell: [], flog: [], pend: null, loot: {}, log: [], recall: false,
    };
    xlog('xStart', { n: party.length, l: { k: 'loc_' + loc } });
    G.log('logExpStart', { n: party.length, l: { k: 'loc_' + loc } }, 'info');
    G.SFX.play('horn');
    G.UI.dirty();
  };

  X.present = () => document.visibilityState === 'visible' && !G.offlineSim;
  X.ask = function (kind) {
    const e = G.S.exp;
    if (G.S.dng.live && X.present()) {
      e.pend = { kind, dl: Date.now() + ASK_SEC * 1000 };
      G.UI.openDecision();
      G.SFX.play('alert');
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
    if (e.recall || e.floor >= e.maxFloor || e.floor >= X.floors(e.loc)) return 'return';
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
        e.enemy = X.enemy(e.loc, e.floor);
        e.phase = 'enc';
        xlog('xEnc', { f: e.floor, m: X.enemyName(e.enemy) });
        G.UI.dirty();
        X.ask('enc');
      }
    } else if (e.phase === 'fight') {
      e.rt += dt;
      while (G.S.exp && G.S.exp.phase === 'fight' && e.rt >= ROUND) { e.rt -= ROUND; X.round(); }
    } else if (e.phase === 'ret') {
      e.t -= dt;
      if (e.t <= 0) X.finish(true);
    } else if (e.phase === 'enc' || e.phase === 'after') X.ask(e.phase);
  };

  X.decide = function (kind, ch, auto) {
    const e = G.S.exp;
    if (!e) return;
    if (e.pend && e.pend.kind !== kind) return;
    if (!e.pend && e.phase !== kind) return;
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
      e.phase = 'fight';
      e.stance = ch;
      e.ehp = e.enemy.hp;
      e.rt = ROUND * 0.6;
      e.round = 0;
      e.fell = [];
      e.flog = [];
      flog('fr_start', { m: X.enemyName(e.enemy), s: { k: 'ch_' + ch } }, 'warn');
    } else if (ch === 'deeper') {
      e.floor++;
      e.phase = 'travel';
      e.t = e.tt = X.travelTime(e.floor);
      xlog('xDeeper', { f: e.floor });
    } else X.goHome();
    G.UI.dirty();
  };

  // Живой раунд: меняет здоровье бойцов и пишет строчки боя
  X.round = function () {
    const e = G.S.exp;
    const ms = X.members();
    const ps = snap(ms);
    const before = ps.map((p) => p.hp);
    const out = [];
    e.ehp = roundCore(ps, e.enemy, e.ehp, e.stance, out);
    e.round++;
    ps.forEach((p, i) => {
      p.a.hp = p.hp;
      if (before[i] > 0 && p.hp <= 0 && !e.fell.includes(p.a.id)) e.fell.push(p.a.id);
    });
    for (const [k, p, c] of out) flog(k, p, c);
    G.SFX.play('hit');
    G.UI.dirty();
    if (e.ehp <= 0) X.endFight(true);
    else if (!ms.some((a) => a.hp > 0)) X.endFight(false);
    else if (e.round >= MAX_ROUNDS) { xlog('xStalemate', {}, 'warn'); X.goHome(); }
  };

  X.endFight = function (win) {
    const e = G.S.exp;
    const L = D.LOCS[e.loc];
    const fell = e.fell.map(G.T.get).filter(Boolean);
    const dead = fell.filter(() => Math.random() < G.T.deathChance(win ? 0.15 : 0.5));
    for (const a of dead) { xlog('xFallen', { name: a.name }, 'bad'); G.T.kill(a, true); }
    e.party = e.party.filter((id) => G.T.get(id));
    if (!win) {
      xlog('xWiped', { f: e.floor }, 'bad');
      e.loot = {};
      X.finish(false);
      return;
    }
    e.cleared = e.floor;
    if (e.floor > X.best(e.loc)) G.S.dng.best[e.loc] = e.floor;
    const ms = X.members();
    const lootMul = (1 + G.T.partySum(ms, 'loot')) * G.K.epochReward();
    const loot = L.loot(e.floor, e.enemy.boss);
    for (const k in loot) { loot[k] = Math.round(loot[k] * lootMul); e.loot[k] = (e.loot[k] || 0) + loot[k]; }
    const xp = Math.round(12 * Math.pow(1.17, e.floor - 1) * L.diff * (e.enemy.boss ? 2 : 1));
    for (const a of ms) if (a.hp > 0) G.T.giveXp(a, xp);
    G.K.xp(4 * e.floor * L.diff);
    xlog('xWin', { f: e.floor, loot }, 'good');
    flog('fr_win', { f: e.floor }, 'good');
    for (const a of fell) if (!dead.includes(a)) xlog('xDowned', { name: a.name }, 'warn');
    e.enemy = null;
    G.SFX.play('win');
    if (L.final && e.floor >= L.floors && !G.S.camp.awake) {
      G.S.camp.awake = true;
      G.log('logDragonAwake', {}, 'epic');
      G.UI.story('awake');
    }
    if (!ms.some((a) => a.hp > 0) || e.floor >= X.floors(e.loc)) { X.goHome(); return; }
    e.phase = 'after';
    X.ask('after');
  };

  X.goHome = function () {
    const e = G.S.exp;
    e.phase = 'ret';
    e.t = e.tt = X.returnTime(Math.max(1, e.cleared));
    xlog('xReturn', {});
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
    G.log(ok ? 'logExpBack' : 'logExpFail', { f: e.cleared, l: { k: 'loc_' + e.loc }, loot: e.loot }, ok ? 'good' : 'bad');
    G.S.lastExp = { ok, loc: e.loc, floor: e.cleared, loot: e.loot, log: e.log.slice(-14) };
    G.S.exp = null;
    G.UI.closeDecision();
    G.UI.dirty();
    G.save();
  };
})();
