// Подземелья. Игрок выбирает только глубину похода и условия отхода —
// бой на каждом этаже идёт сам, отряд сам выбирает тактику.
(function () {
  const X = (G.X = {});
  const D = G.D;
  const ROUND = 0.8, MAX_ROUNDS = 40;
  X.maxParty = 4;
  // Ближний бой стоит в первом ряду, дальний и поддержка — сзади. Враг чаще бьёт первый ряд.
  X.FRONT = { warrior: 1, rogue: 1 };
  X.isFront = (cls) => !!X.FRONT[cls];
  X.FRONT_HIT = 0.75;
  // Клик по Катакомбам торопит отряды в пути между этажами и по дороге домой
  X.hurrySec = () => 1;
  X.hurry = function (id) {
    let n = 0;
    for (const e of id ? [X.get(id)].filter(Boolean) : X.list()) {
      if (e.phase !== 'travel' && e.phase !== 'ret') continue;
      e.t -= X.hurrySec();
      n++;
    }
    if (n) X.tick(0);
    return n > 0;
  };
  // Сколько отрядов в походе одновременно: 1, с 4-го уровня Гильдии — 2, с 7-го — 3
  X.maxSquads = () => (G.E.lvl('tavern') < 1 ? 0 : 1 + Math.floor((G.E.lvl('tavern') - 1) / 3));
  X.nextSquadLvl = () => { const L = G.E.lvl('tavern'); return L < 4 ? 4 : L < 7 ? 7 : 0; };
  // Размер отряда: 4, а в Логово дракона — сколько вмещает Гильдия
  X.partyMax = () => Math.max(1, G.T.maxAdvs()); // во всех локациях — сколько вмещает Гильдия
  // Отряд больше 4 героев делает врагов сильнее: здоровье и урон растут быстрее числа героев,
  // а ударов за ход больше (на 5–8 героев — вдвое, на 9 — втрое). Добыча растёт вместе с отрядом.
  X.scale = (loc, n) => {
    const k = Math.max(1, n / X.maxParty);
    return { k, hp: Math.pow(k, 1.3), atk: Math.pow(k, 1.2), hits: Math.ceil(k - 1e-9), loot: k };
  };
  X.list = () => G.S.exps;
  X.get = (id) => G.S.exps.find((e) => e.id === id) || null;
  // Старые сохранения: один поход в G.S.exp
  X.sanitize = function () {
    if (!Array.isArray(G.S.exps)) G.S.exps = [];
    if (G.S.exp) { G.S.exps.push(G.S.exp); G.S.exp = null; }
    for (const e of G.S.exps) {
      if (!e.id) e.id = G.U.uid();
      if (!e.n) e.n = e.party.length;
      if (e.pend) e.pend = null;
      if (!e.cond) e.cond = X.cond();
      if (!e.items) e.items = [];
    }
  };
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

  X.enemy = function (locId, f, n) {
    const L = D.LOCS[locId];
    const boss = f % 5 === 0 || f === L.floors;
    const key = boss ? L.boss(f) : G.U.pick(L.pool(f));
    const count = boss ? 1 : G.U.randInt(2, 4);
    const diff = L.diff * G.K.epochMul();
    const hp = Math.round(60 * Math.pow(1.26, f - 1) * diff * (boss ? D.BOSS.hp : 1) * (count / 3));
    const sc = X.scale(locId, n || X.maxParty);
    const hpS = Math.round(hp * sc.hp);
    const atk = Math.round(9 * Math.pow(1.19, f - 1) * Math.pow(diff, 0.8) * (boss ? D.BOSS.atk : 1) * (0.7 + count * 0.1) * sc.atk * 10) / 10;
    return { key, count, hp: hpS, max: hpS, atk, boss, f, hits: sc.hits };
  };
  X.enemyName = function (en) {
    if (en.boss) return { k: 'mn_' + en.key };
    return { k: 'mp_' + en.key, suffix: ' ×' + en.count };
  };

  X.members = (e) => (e ? e.party.map(G.T.get).filter(Boolean) : []);
  // Снимок бойцов с учётом навыков и таланта «Командир походов»
  function snap(members) {
    const cap = 1 + G.bonus('captain');
    const shield = 1 + Math.min(0.6, members.reduce((s, a) => s + (a.hp > 0 ? G.T.skillSum(a, 'partyDef') : 0), 0));
    return members.map((a) => {
      const s = G.T.stats(a), sk = (k) => G.T.skillSum(a, k), C = D.CLS[a.cls];
      return {
        a, cls: a.cls, hp: a.hp, max: s.hp, atk: s.atk * cap, def: s.def * cap * shield,
        heal: sk('heal'), splash: sk('splash'), guard: sk('guard'), regen: Math.min(0.1, sk('regen')), aura: Math.min(0.06, sk('aura')),
        dodge: Math.min(0.5, sk('dodge') + (C.dodge || 0)), crit: Math.min(0.6, sk('crit') + (C.crit || 0)), critMul: Math.min(4, 2 + sk('critDmg')), stun: Math.min(0.35, (C.stun || 0) + sk('stun')),
      };
    });
  }
  function xlog(e, k, p, c) {
    e.log.push({ k, p: p || {}, c: c || 'info' });
    if (e.log.length > 40) e.log.shift();
  }
  function flog(e, k, p, c) {
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
    const hits = bound ? 0 : (en.boss ? 1 : Math.min(en.count, 2)) * (en.hits || 1);
    for (let h = 0; h < hits; h++) {
      const al = P.filter((p) => p.hp > 0);
      if (!al.length) break;
      const front = al.filter((p) => X.isFront(p.cls));
      const tg = front.length && Math.random() < X.FRONT_HIT ? G.U.pick(front) : G.U.pick(al);
      if (tg.dodge && Math.random() < tg.dodge) { if (out) out.push(['fr_dodge', { name: tg.a.name, id: tg.a.id }, 'good']); continue; }
      const dmg = (((en.atk / hits) * takenM * G.U.rand(0.85, 1.15) * 20) / (20 + tg.def)) * (1 - dr);
      tg.hp = Math.max(0, tg.hp - dmg);
      if (out) {
        out.push(['fr_dmg', { name: tg.a.name, d: Math.round(dmg), id: tg.a.id }, 'bad']);
        if (tg.hp <= 0) out.push(['fr_down', { name: tg.a.name, id: tg.a.id }, 'bad']);
      }
    }
    // лечение: жрецы, аура мага, второе дыхание
    for (const pr of P) {
      if (pr.cls !== 'priest' || pr.hp <= 0) continue;
      const al = P.filter((p) => p.hp > 0 && p.hp < p.max).sort((a, b) => a.hp / a.max - b.hp / b.max);
      if (!al.length) continue;
      const h = pr.atk * 0.9 * (1 + pr.heal);
      al[0].hp = Math.min(al[0].max, al[0].hp + h);
      if (out) out.push(['fr_heal', { name: pr.a.name, who: al[0].a.name, h: Math.round(h), id: al[0].a.id }, 'good']);
    }
    const aura = P.reduce((s, p) => s + (p.hp > 0 ? p.aura : 0), 0);
    for (const p of P) {
      if (p.hp <= 0) continue;
      const r = p.regen + aura;
      if (r > 0) p.hp = Math.min(p.max, p.hp + p.max * r);
    }
    return ehp;
  }

  // Шанс победы для произвольной группы героев (Арена)
  X.chanceFor = function (members, en) {
    const ps = snap(members);
    let best = 0;
    for (const stance of ['attack', 'defend']) {
      let w = 0;
      for (let i = 0; i < 30; i++) if (X.sim(ps, en, stance)) w++;
      best = Math.max(best, w / 30);
    }
    return best;
  };
  // Полный бой сразу (Арена): тактику выбирает отряд, возвращает исход, здоровье бойцов, строки боя
  // и запись по раундам (tl), по которой окно боя проигрывает схватку
  X.duel = function (members, en) {
    const ps = snap(members), out = [], tl = [];
    let ca = 0, cd = 0;
    for (let i = 0; i < 20; i++) { if (X.sim(ps, en, 'attack')) ca++; if (X.sim(ps, en, 'defend')) cd++; }
    const stance = ca >= cd ? 'attack' : 'defend';
    let ehp = en.hp, r = 0;
    while (r < MAX_ROUNDS && ps.some((p) => p.hp > 0)) {
      r++;
      const ev = [];
      ehp = roundCore(ps, en, ehp, stance, ev);
      out.push(...ev);
      tl.push({ ev, ehp: Math.max(0, ehp), hp: ps.map((p) => Math.max(0, p.hp)) });
      if (ehp <= 0) break;
    }
    return { win: ehp <= 0, rounds: r, ps, stance, out: out.slice(-10), tl };
  };

  X.sim = function (ps, en, stance) {
    const P = ps.map((p) => Object.assign({}, p));
    let ehp = en.hp, r = 0;
    while (r++ < MAX_ROUNDS && P.some((p) => p.hp > 0)) {
      ehp = roundCore(P, en, ehp, stance, null);
      if (ehp <= 0) return true;
    }
    return false;
  };
  X.chance = function (stance, en, e) {
    if (!en || !e) return 0;
    const ps = snap(X.members(e));
    let w = 0;
    for (let i = 0; i < 40; i++) if (X.sim(ps, en, stance)) w++;
    return w / 40;
  };
  X.fleeChance = function (e) {
    const ms = X.members(e).filter((a) => a.hp > 0);
    const arch = ms.filter((a) => a.cls === 'archer' || a.cls === 'rogue').length;
    return G.U.clamp(0.65 + 0.08 * arch + G.T.partySum(ms, 'flee') - 0.02 * e.floor, 0.2, 0.95);
  };
  X.hpRatio = function (e) {
    let h = 0, m = 0;
    for (const a of X.members(e)) { h += Math.max(0, a.hp); m += G.T.stats(a).hp; }
    return m ? h / m : 0;
  };

  // Условия отхода задаются перед походом
  X.cond = () => {
    const d = G.S.dng;
    if (d.hp <= 0) return { hp: 0, down: false, boss: false, avoid: 0, push: true };
    return { hp: d.hp, down: d.down, boss: d.boss, avoid: d.avoid };
  };

  X.start = function (ids, loc, maxFloor, startFloor) {
    if (X.list().length >= X.maxSquads() || !X.locOpen(loc)) return null;
    const party = ids.map(G.T.get).filter((a) => a && a.st === 'idle' && a.hp > 0).slice(0, X.partyMax(loc));
    if (!party.length) return null;
    for (const a of party) a.st = 'dungeon';
    const f0 = X.startOptions(loc).includes(startFloor) ? startFloor : 1;
    const t = X.travelTime(f0);
    const e = {
      id: G.U.uid(), loc, party: party.map((a) => a.id), n: party.length, maxFloor: Math.max(f0, Math.min(maxFloor, X.floors(loc))), cond: X.cond(),
      floor: f0, cleared: f0 - 1, start: f0, phase: 'travel', t, tt: t, enemy: null, stance: null, ehp: 0, rt: 0, round: 0,
      fell: [], flog: [], loot: {}, items: [], log: [], recall: false,
    };
    G.S.exps.push(e);
    xlog(e, f0 > 1 ? 'xStartAt' : 'xStart', { n: party.length, l: { k: 'loc_' + loc }, f: f0 });
    G.log('logExpStart', { n: party.length, l: { k: 'loc_' + loc } }, 'info');
    G.SFX.play('horn');
    G.UI.dirty();
    return e;
  };

  X.tick = function (dt) {
    if (!Array.isArray(G.S.exps) || G.S.exp) X.sanitize();
    for (const e of [...G.S.exps]) tickOne(e, dt);
  };
  function tickOne(e, dt) {
    if (e.phase === 'travel') {
      for (const a of X.members(e)) {
        if (a.hp > 0) { const mx = G.T.stats(a).hp; a.hp = Math.min(mx, a.hp + mx * 0.01 * dt); }
      }
      e.t -= dt;
      if (e.t <= 0) X.engage(e);
    } else if (e.phase === 'fight') {
      e.rt += dt;
      while (X.get(e.id) && e.phase === 'fight' && e.rt >= ROUND) { e.rt -= ROUND; X.round(e); }
    } else if (e.phase === 'ret') {
      e.t -= dt;
      if (e.t <= 0) X.finish(e, true);
    } else if (e.phase === 'enc') X.engage(e);
    else if (e.phase === 'after') X.afterFloor(e);
  }

  // Встреча с врагом: отряд сам выбирает тактику или уходит, если бой безнадёжен
  X.engage = function (e) {
    e.enemy = e.enemy || X.enemy(e.loc, e.floor, e.n);
    e.phase = 'enc';
    xlog(e, 'xEnc', { f: e.floor, m: X.enemyName(e.enemy) });
    const ca = X.chance('attack', e.enemy, e), cd = X.chance('defend', e.enemy, e);
    const best = Math.max(ca, cd);
    let stance = ca >= cd ? 'attack' : 'defend';
    if (e.cond.avoid > 0 && best < e.cond.avoid) {
      if (Math.random() < X.fleeChance(e)) {
        xlog(e, 'xAvoid', { p: Math.round(best * 100) }, 'warn');
        e.enemy = null;
        X.goHome(e);
        G.UI.expDirty(); // только вкладка «Походы», другие меню не трогаем
        return;
      }
      xlog(e, 'xFleeFail', {}, 'bad');
      for (const a of X.members(e)) {
        if (a.hp <= 0) continue;
        const st = G.T.stats(a);
        a.hp = Math.max(0, a.hp - (e.enemy.atk * 0.5 * 20) / (20 + st.def));
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
    flog(e, 'fr_start', { m: X.enemyName(e.enemy), s: { k: 'ch_' + stance }, p: Math.round(best * 100) }, 'warn');
    G.UI.expDirty(); // только вкладка «Походы», другие меню не трогаем
  };

  X.round = function (e) {
    const ms = X.members(e);
    const ps = snap(ms);
    const before = ps.map((p) => p.hp);
    const out = [];
    e.ehp = roundCore(ps, e.enemy, e.ehp, e.stance, out);
    e.round++;
    ps.forEach((p, i) => {
      p.a.hp = p.hp;
      if (before[i] > 0 && p.hp <= 0 && !e.fell.includes(p.a.id)) e.fell.push(p.a.id);
    });
    for (const [k, p, c] of out) flog(e, k, p, c);
    G.SFX.play('hit');
    G.UI.expDirty(); // только вкладка «Походы», другие меню не трогаем
    if (e.ehp <= 0) X.endFight(e, true);
    else if (!ms.some((a) => a.hp > 0)) X.endFight(e, false);
    else if (e.round >= MAX_ROUNDS) { xlog(e, 'xStalemate', {}, 'warn'); X.goHome(e); }
  };

  // Добыча предмета: шанс растёт с навыками «добычи», материал — с глубиной
  function dropItem(e, boss) {
    const ms = X.members(e);
    const chance = (boss ? 0.5 : 0.12) * (1 + G.T.partySum(ms, 'drop'));
    if (Math.random() >= chance) return;
    const depth = e.floor * D.LOCS[e.loc].diff;
    const ti = Math.min(3, Math.floor(depth / 5));
    const k = 0.03 * e.floor + G.bonus('luck') + (boss ? 0.3 : 0);
    const rar = G.U.weighted(G.F.weightsFor(k, D.LEG.p));
    const it = G.F.make(G.U.pick(Object.keys(D.ITYPES)), ti, rar);
    e.items.push(it);
    xlog(e, 'xItem', { item: G.F.nameObj(it) }, it.rar >= 3 ? 'epic' : 'good');
  }

  X.endFight = function (e, win) {
    const L = D.LOCS[e.loc];
    const fell = e.fell.map(G.T.get).filter(Boolean);
    const dead = fell.filter(() => Math.random() < G.T.deathChance(win || e.cond.push ? 0.15 : 0.5));
    for (const a of dead) { xlog(e, 'xFallen', { name: a.name }, 'bad'); G.T.kill(a, true); }
    e.party = e.party.filter((id) => G.T.get(id));
    if (!win) {
      xlog(e, 'xWiped', { f: e.floor }, 'bad');
      e.loot = {};
      e.items = [];
      X.finish(e, false);
      return;
    }
    const boss = e.enemy.boss;
    e.cleared = e.floor;
    if (e.floor > X.best(e.loc)) G.S.dng.best[e.loc] = e.floor;
    const ms = X.members(e);
    const lootMul = (1 + G.T.partySum(ms, 'loot')) * G.K.epochReward() * X.scale(e.loc, e.n).loot;
    const loot = L.loot(e.floor, boss);
    for (const k in loot) { loot[k] = Math.round(loot[k] * lootMul); e.loot[k] = (e.loot[k] || 0) + loot[k]; }
    dropItem(e, boss);
    const xp = Math.round(12 * Math.pow(1.17, e.floor - 1) * L.diff * (boss ? 2 : 1));
    for (const a of ms) if (a.hp > 0) G.T.giveXp(a, xp);
    G.K.xp(4 * e.floor * L.diff);
    xlog(e, 'xWin', { f: e.floor, loot }, 'good');
    flog(e, 'fr_win', { f: e.floor }, 'good');
    for (const a of fell) if (!dead.includes(a)) xlog(e, 'xDowned', { name: a.name }, 'warn');
    e.enemy = null;
    e.lastBoss = boss;
    G.SFX.play('win');
    if (L.final && e.floor >= L.floors && !G.S.camp.awake) {
      G.S.camp.awake = true;
      G.log('logDragonAwake', {}, 'epic');
      G.UI.story('awake');
    }
    e.phase = 'after';
    X.afterFloor(e);
  };

  // После этажа: проверяем условия отхода
  X.afterFloor = function (e) {
    const ms = X.members(e);
    let why = '';
    if (!ms.some((a) => a.hp > 0)) why = 'xwDown';
    else if (e.recall) why = 'xwRecall';
    else if (e.floor >= e.maxFloor || e.floor >= X.floors(e.loc)) why = 'xwMax';
    else if (e.cond.boss && e.lastBoss) why = 'xwBoss';
    else if (e.cond.down && ms.some((a) => a.hp <= 0)) why = 'xwDown';
    else if (X.hpRatio(e) < e.cond.hp) why = 'xwHp';
    if (why) {
      xlog(e, why, { p: Math.round(e.cond.hp * 100) }, 'warn');
      X.goHome(e);
    } else {
      e.floor++;
      e.phase = 'travel';
      e.t = e.tt = X.travelTime(e.floor);
      xlog(e, 'xDeeper', { f: e.floor });
    }
    G.UI.expDirty(); // только вкладка «Походы», другие меню не трогаем
  };

  X.goHome = function (e) {
    e.phase = 'ret';
    e.t = e.tt = X.returnTime(Math.max(1, e.cleared));
    xlog(e, 'xReturn', {});
  };

  X.recall = function (id) {
    const e = X.get(id);
    if (!e || e.phase === 'ret') return;
    e.recall = true;
    xlog(e, 'xRecall', {}, 'warn');
    if (e.phase === 'travel') X.goHome(e);
    G.UI.expDirty(); // только вкладка «Походы», другие меню не трогаем
  };

  X.finish = function (e, ok) {
    if (!X.get(e.id)) return;
    G.E.addAll(e.loot);
    for (const it of e.items || []) G.S.items.push(it);
    for (const a of X.members(e)) {
      if (a.hp <= 0) G.T.wound(a, 45);
      else a.st = 'idle';
    }
    G.log(ok ? 'logExpBack' : 'logExpFail', { f: e.cleared, l: { k: 'loc_' + e.loc }, loot: e.loot }, ok ? 'good' : 'bad');
    if (ok && e.items && e.items.length) G.log('logExpItems', { n: e.items.length }, 'epic');
    G.S.lastExp = { ok, loc: e.loc, floor: e.cleared, loot: e.loot, items: (e.items || []).length, log: e.log.slice(-14) };
    G.S.exps = G.S.exps.filter((x) => x !== e);
    G.UI.dirty();
    G.save();
  };
})();
