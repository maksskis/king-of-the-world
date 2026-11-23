// Подземелья. Игрок выбирает только глубину похода и условия отхода —
// бой на каждом этаже идёт сам, отряд сам выбирает тактику.
(function () {
  const X = (G.X = {});
  const D = G.D;
  const ROUND = 0.8, MAX_ROUNDS = 40;
  X.maxParty = 4;
  X.travelTime = (f) => Math.round(Math.min(12, 4 + 0.4 * f));
  X.returnTime = (f) => Math.round(Math.min(15, 5 + 0.4 * f));

  // ---------- локации ----------
  X.loc = (id) => D.LOCS[id];
  X.locOpen = function (id) {
    const L = D.LOCS[id];
    if (G.E.lvl('tavern') < 1) return false;
    return !L.unlock || G.R.done(L.unlock);
  };
  X.best = (id) => G.S.dng.best[id] || 0;
  X.floors = (id) => D.LOCS[id].floors || Infinity;
  // Точки старта: 1-й этаж и каждый 5-й этаж, который отряд уже прошёл
  X.startOptions = function (id) {
    const top = Math.min(X.best(id), X.floors(id));
    const o = [1];
    for (let f = 5; f <= top; f += 5) o.push(f);
    return o;
  };
  X.startFloor = function (id) {
    const want = G.S.dng.start || 1;
    return X.startOptions(id).filter((f) => f <= want).pop();
  };

  X.enemy = function (locId, f) {
    const L = D.LOCS[locId];
    const boss = f % 5 === 0 || f === L.floors;
    const key = boss ? L.boss(f) : G.U.pick(L.pool(f));
    const count = boss ? 1 : G.U.randInt(2, 4);
    const diff = L.diff * G.K.epochMul();
    const hp = Math.round(60 * Math.pow(1.26, f - 1) * diff * (boss ? 3.5 : 1) * (count / 3));
    const atk = Math.round(9 * Math.pow(1.19, f - 1) * Math.pow(diff, 0.8) * (boss ? 1.6 : 1) * (0.7 + count * 0.1) * 10) / 10;
    return { key, count, hp, max: hp, atk, boss, f };
  };
  X.enemyName = function (en) {
    if (en.boss) return { k: 'mn_' + en.key };
    return { k: 'mp_' + en.key, suffix: ' ×' + en.count };
  };

  X.members = () => (G.S.exp ? G.S.exp.party.map(G.T.get).filter(Boolean) : []);
  // Снимок бойцов с учётом навыков и таланта «Командир походов»
  function snap(members) {
    const cap = 1 + G.bonus('captain');
    const shield = 1 + members.reduce((s, a) => s + (a.hp > 0 ? G.T.skillSum(a, 'partyDef') : 0), 0);
    return members.map((a) => {
      const s = G.T.stats(a), sk = (k) => G.T.skillSum(a, k), C = D.CLS[a.cls];
      return {
        a, cls: a.cls, hp: a.hp, max: s.hp, atk: s.atk * cap, def: s.def * cap * shield,
        heal: sk('heal'), splash: sk('splash'), guard: sk('guard'), regen: sk('regen'), aura: sk('aura'),
        dodge: sk('dodge') + (C.dodge || 0), crit: sk('crit') + (C.crit || 0), critMul: 2 + sk('critDmg'), stun: (C.stun || 0) + sk('stun'),
      };
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

  // Один раунд боя (общий для живого боя и оценки шансов)
  function roundCore(P, en, ehp, stance, out) {
    const [dealtM, takenM] = MULT[stance];
    const alive = P.filter((p) => p.hp > 0);
    let d = 0, crits = 0;
    for (const p of alive) {
      let hit = p.cls === 'priest' ? p.atk * 0.6 : p.cls === 'shaman' ? p.atk * 0.8 : p.atk;
      if (p.cls === 'mage' && en.count > 1) hit += p.atk * (0.3 + p.splash);
      if (p.crit && Math.random() < p.crit) { hit *= p.critMul; crits++; }
      d += hit;
    }
    d *= dealtM * G.U.rand(0.85, 1.15);
    ehp -= d;
    if (out) out.push([crits ? 'fr_partyCrit' : 'fr_party', { d: Math.round(d) }, 'good']);
    if (ehp <= 0) return ehp;
    const dr = Math.min(0.3, alive.reduce((s, p) => s + p.guard, 0));
    // шаманы сковывают врага: он пропускает свой ход. Шансы шаманов независимы,
    // вместе не больше 40%, босс сопротивляется вдвое.
    const binder = alive.find((p) => p.stun > 0);
    const stun = Math.min(0.4, 1 - alive.reduce((s, p) => s * (1 - p.stun), 1)) * (en.boss ? 0.5 : 1);
    const bound = stun > 0 && Math.random() < stun;
    if (bound && out) out.push(['fr_stun', { name: binder.a.name }, 'good']);
    const hits = bound ? 0 : en.boss ? 1 : Math.min(en.count, 2);
    for (let h = 0; h < hits; h++) {
      const al = P.filter((p) => p.hp > 0);
      if (!al.length) break;
      const wars = al.filter((p) => p.cls === 'warrior');
      const tg = wars.length && Math.random() < 0.6 ? G.U.pick(wars) : G.U.pick(al);
      if (tg.dodge && Math.random() < tg.dodge) { if (out) out.push(['fr_dodge', { name: tg.a.name }, 'good']); continue; }
      const dmg = (((en.atk / hits) * takenM * G.U.rand(0.85, 1.15) * 20) / (20 + tg.def)) * (1 - dr);
      tg.hp = Math.max(0, tg.hp - dmg);
      if (out) {
        out.push(['fr_dmg', { name: tg.a.name, d: Math.round(dmg) }, 'bad']);
        if (tg.hp <= 0) out.push(['fr_down', { name: tg.a.name }, 'bad']);
      }
    }
    // лечение: жрецы, аура мага, второе дыхание
    for (const pr of P) {
      if (pr.cls !== 'priest' || pr.hp <= 0) continue;
      const al = P.filter((p) => p.hp > 0 && p.hp < p.max).sort((a, b) => a.hp / a.max - b.hp / b.max);
      if (!al.length) continue;
      const h = pr.atk * 0.9 * (1 + pr.heal);
      al[0].hp = Math.min(al[0].max, al[0].hp + h);
      if (out) out.push(['fr_heal', { name: pr.a.name, who: al[0].a.name, h: Math.round(h) }, 'good']);
    }
    const aura = P.reduce((s, p) => s + (p.hp > 0 ? p.aura : 0), 0);
    for (const p of P) {
      if (p.hp <= 0) continue;
      const r = p.regen + aura;
      if (r > 0) p.hp = Math.min(p.max, p.hp + p.max * r);
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
  X.chance = function (stance, en) {
    en = en || (G.S.exp && G.S.exp.enemy);
    if (!en) return 0;
    const ps = snap(X.members());
    let w = 0;
    for (let i = 0; i < 40; i++) if (X.sim(ps, en, stance)) w++;
    return w / 40;
  };
  X.fleeChance = function () {
    const ms = X.members().filter((a) => a.hp > 0);
    const arch = ms.filter((a) => a.cls === 'archer' || a.cls === 'rogue').length;
    return G.U.clamp(0.65 + 0.08 * arch + G.T.partySum(ms, 'flee') - 0.02 * G.S.exp.floor, 0.2, 0.95);
  };
  X.hpRatio = function () {
    let h = 0, m = 0;
    for (const a of X.members()) { h += Math.max(0, a.hp); m += G.T.stats(a).hp; }
    return m ? h / m : 0;
  };

  // Условия отхода задаются перед походом
  X.cond = () => {
    const d = G.S.dng;
    if (d.hp <= 0) return { hp: 0, down: false, boss: false, avoid: 0, push: true };
    return { hp: d.hp, down: d.down, boss: d.boss, avoid: d.avoid };
  };

  X.start = function (ids, loc, maxFloor, startFloor) {
    if (G.S.exp || !X.locOpen(loc)) return;
    const party = ids.map(G.T.get).filter((a) => a && a.st === 'idle' && a.hp > 0).slice(0, X.maxParty);
    if (!party.length) return;
    for (const a of party) a.st = 'dungeon';
    const f0 = X.startOptions(loc).includes(startFloor) ? startFloor : 1;
    const t = X.travelTime(f0);
    G.S.exp = {
      loc, party: party.map((a) => a.id), maxFloor: Math.max(f0, Math.min(maxFloor, X.floors(loc))), cond: X.cond(),
      floor: f0, cleared: f0 - 1, start: f0, phase: 'travel', t, tt: t, enemy: null, stance: null, ehp: 0, rt: 0, round: 0,
      fell: [], flog: [], loot: {}, items: [], log: [], recall: false,
    };
    xlog(f0 > 1 ? 'xStartAt' : 'xStart', { n: party.length, l: { k: 'loc_' + loc }, f: f0 });
    G.log('logExpStart', { n: party.length, l: { k: 'loc_' + loc } }, 'info');
    G.SFX.play('horn');
    G.UI.dirty();
  };

  X.tick = function (dt) {
    const e = G.S.exp;
    if (!e) return;
    if (e.pend) e.pend = null; // старые сохранения с ожиданием приказа
    if (!e.cond) e.cond = X.cond();
    if (!e.items) e.items = [];
    if (e.phase === 'travel') {
      for (const a of X.members()) {
        if (a.hp > 0) { const mx = G.T.stats(a).hp; a.hp = Math.min(mx, a.hp + mx * 0.01 * dt); }
      }
      e.t -= dt;
      if (e.t <= 0) X.engage();
    } else if (e.phase === 'fight') {
      e.rt += dt;
      while (G.S.exp && G.S.exp.phase === 'fight' && e.rt >= ROUND) { e.rt -= ROUND; X.round(); }
    } else if (e.phase === 'ret') {
      e.t -= dt;
      if (e.t <= 0) X.finish(true);
    } else if (e.phase === 'enc') X.engage();
    else if (e.phase === 'after') X.afterFloor();
  };

  // Встреча с врагом: отряд сам выбирает тактику или уходит, если бой безнадёжен
  X.engage = function () {
    const e = G.S.exp;
    e.enemy = e.enemy || X.enemy(e.loc, e.floor);
    e.phase = 'enc';
    xlog('xEnc', { f: e.floor, m: X.enemyName(e.enemy) });
    const ca = X.chance('attack'), cd = X.chance('defend');
    const best = Math.max(ca, cd);
    let stance = ca >= cd ? 'attack' : 'defend';
    if (e.cond.avoid > 0 && best < e.cond.avoid) {
      if (Math.random() < X.fleeChance()) {
        xlog('xAvoid', { p: Math.round(best * 100) }, 'warn');
        e.enemy = null;
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
      stance = 'defend';
    }
    e.phase = 'fight';
    e.stance = stance;
    e.ehp = e.enemy.hp;
    e.rt = ROUND * 0.6;
    e.round = 0;
    e.fell = [];
    e.flog = [];
    flog('fr_start', { m: X.enemyName(e.enemy), s: { k: 'ch_' + stance }, p: Math.round(best * 100) }, 'warn');
    G.UI.dirty();
  };

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

  // Добыча предмета: шанс растёт с навыками «добычи», материал — с глубиной
  function dropItem(e, boss) {
    const ms = X.members();
    const chance = (boss ? 0.5 : 0.12) * (1 + G.T.partySum(ms, 'drop'));
    if (Math.random() >= chance) return;
    const depth = e.floor * D.LOCS[e.loc].diff;
    const ti = Math.min(3, Math.floor(depth / 5));
    const k = 0.05 * e.floor + G.bonus('luck');
    const rar = G.U.weighted(D.IRAR.map((r, i) => r.w * Math.pow(1 + k, i)));
    const it = G.F.make(G.U.pick(Object.keys(D.ITYPES)), ti, rar);
    e.items.push(it);
    xlog('xItem', { item: G.F.nameObj(it) }, it.rar >= 3 ? 'epic' : 'good');
  }

  X.endFight = function (win) {
    const e = G.S.exp;
    const L = D.LOCS[e.loc];
    const fell = e.fell.map(G.T.get).filter(Boolean);
    const dead = fell.filter(() => Math.random() < G.T.deathChance(win || e.cond.push ? 0.15 : 0.5));
    for (const a of dead) { xlog('xFallen', { name: a.name }, 'bad'); G.T.kill(a, true); }
    e.party = e.party.filter((id) => G.T.get(id));
    if (!win) {
      xlog('xWiped', { f: e.floor }, 'bad');
      e.loot = {};
      e.items = [];
      X.finish(false);
      return;
    }
    const boss = e.enemy.boss;
    e.cleared = e.floor;
    if (e.floor > X.best(e.loc)) G.S.dng.best[e.loc] = e.floor;
    const ms = X.members();
    const lootMul = (1 + G.T.partySum(ms, 'loot')) * G.K.epochReward();
    const loot = L.loot(e.floor, boss);
    for (const k in loot) { loot[k] = Math.round(loot[k] * lootMul); e.loot[k] = (e.loot[k] || 0) + loot[k]; }
    dropItem(e, boss);
    const xp = Math.round(12 * Math.pow(1.17, e.floor - 1) * L.diff * (boss ? 2 : 1));
    for (const a of ms) if (a.hp > 0) G.T.giveXp(a, xp);
    G.K.xp(4 * e.floor * L.diff);
    xlog('xWin', { f: e.floor, loot }, 'good');
    flog('fr_win', { f: e.floor }, 'good');
    for (const a of fell) if (!dead.includes(a)) xlog('xDowned', { name: a.name }, 'warn');
    e.enemy = null;
    e.lastBoss = boss;
    G.SFX.play('win');
    if (L.final && e.floor >= L.floors && !G.S.camp.awake) {
      G.S.camp.awake = true;
      G.log('logDragonAwake', {}, 'epic');
      G.UI.story('awake');
    }
    e.phase = 'after';
    X.afterFloor();
  };

  // После этажа: проверяем условия отхода
  X.afterFloor = function () {
    const e = G.S.exp;
    const ms = X.members();
    let why = '';
    if (!ms.some((a) => a.hp > 0)) why = 'xwDown';
    else if (e.recall) why = 'xwRecall';
    else if (e.floor >= e.maxFloor || e.floor >= X.floors(e.loc)) why = 'xwMax';
    else if (e.cond.boss && e.lastBoss) why = 'xwBoss';
    else if (e.cond.down && ms.some((a) => a.hp <= 0)) why = 'xwDown';
    else if (X.hpRatio() < e.cond.hp) why = 'xwHp';
    if (why) {
      xlog(why, { p: Math.round(e.cond.hp * 100) }, 'warn');
      X.goHome();
    } else {
      e.floor++;
      e.phase = 'travel';
      e.t = e.tt = X.travelTime(e.floor);
      xlog('xDeeper', { f: e.floor });
    }
    G.UI.dirty();
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
    for (const it of e.items || []) G.S.items.push(it);
    for (const a of X.members()) {
      if (a.hp <= 0) G.T.wound(a, 45);
      else a.st = 'idle';
    }
    G.log(ok ? 'logExpBack' : 'logExpFail', { f: e.cleared, l: { k: 'loc_' + e.loc }, loot: e.loot }, ok ? 'good' : 'bad');
    if (ok && e.items && e.items.length) G.log('logExpItems', { n: e.items.length }, 'epic');
    G.S.lastExp = { ok, loc: e.loc, floor: e.cleared, loot: e.loot, items: (e.items || []).length, log: e.log.slice(-14) };
    G.S.exp = null;
    G.UI.dirty();
    G.save();
  };
})();
