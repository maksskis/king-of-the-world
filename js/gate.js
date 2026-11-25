(function () {
  const W = (G.W = {});
  const D = G.D;
  const LW = 320, LH = 130, SC = 3, TOP = 80; // TOP — небо над полем боя
  const LANES = [100, 112, 124];
  let B = null, raf = 0, lastT = 0, cv = null, ctx = null, bg = null;
  const abg = {}; // фоны поединков (Арена по облику города, области Путешествия)

  // active — идёт бой у ворот; running — идёт любой бой в окне (ворота, Арена, Путешествие)
  W.active = () => !!B && B.state === 'run' && !B.duel;
  W.running = () => !!B && B.state === 'run';
  W.battle = () => B;
  W.wallHp = () => Math.round(120 * Math.pow(1.6, G.E.lvl('gate') - 1) * (1 + G.bonus('gateHp')));
  W.kingDmg = function () {
    const w = G.F.equipped('king', 'weapon');
    return Math.round((2 + (w ? G.F.stat(w, 'atk') : 0)) * (1 + G.bonus('click')));
  };
  const sprKey = (k) => D.MON[k].spr || 'm_' + k;

  // Состав волны детерминирован, чтобы предпросмотр совпадал с боем
  W.comp = function (n) {
    if (n === 'final') return ['orc', 'orc', 'wolf', 'wolf', 'drowned', 'drowned', 'orc', 'troll', 'dragon'];
    const list = [];
    const count = 3 + Math.floor((n - 1) * 1.2);
    const pool = ['slime'];
    if (n >= 2) pool.push('goblin');
    if (n >= 4) pool.push('wolf');
    if (n >= 6) pool.push('skeleton');
    if (n >= 9) pool.push('orc');
    if (n >= 12) pool.push('drowned');
    const rng = G.U.seeded(n * 7919);
    for (let i = 0; i < count; i++) list.push(pool[Math.floor(rng() * pool.length)]);
    if (n % 5 === 0) list.push(n % 10 === 0 ? 'lich' : 'troll');
    return list;
  };
  // Скорость монстров: каждые 5 волн +12% (волны 1–5 — обычная, 6–10 — +12%, 11–15 — +24% …), не больше ×2;
  // финальная битва идёт как 21-я волна
  W.spdMul = (n) => Math.min(2, 1 + 0.12 * Math.floor(((n === 'final' ? 21 : n) - 1) / 5));
  W.hpMul = (n) => (n === 'final' ? 6 : Math.pow(1.16, n - 1)) * G.K.epochMul();
  W.atkMul = (n) => (n === 'final' ? 3 : Math.pow(1.1, n - 1)) * G.K.epochMul();
  W.preview = function (n) {
    const c = {};
    let hp = 0;
    for (const k of W.comp(n)) {
      c[k] = (c[k] || 0) + 1;
      hp += D.MON[k].hp * W.hpMul(n);
    }
    return { counts: c, hp: Math.round(hp) };
  };
  W.reward = (n) => {
    const m = G.K.epochReward();
    if (n === 'final') return { gold: Math.round(5000 * m), mithril: 50, crystal: 50 };
    return { gold: Math.ceil(15 * Math.pow(1.15, n - 1) * m), bone: Math.floor(n / 2) + 1 };
  };
  W.finalReady = () => G.S.camp.awake && !G.S.camp.won;
  // Почему нельзя начать волну: нет стен, ворота на перестройке или некому защищать
  W.whyNot = function () {
    if (G.E.lvl('gate') < 1) return 'noWalls';
    if (G.E.busy('gate')) return 'gateBusy';
    if (G.S.guards <= 0 && !G.S.advs.some((a) => a.st === 'gate' && a.hp > 0)) return 'noDefenders';
    return '';
  };

  // Расстановка героев: ближний бой — передние ряды, дальний — за ним (по 3 в ряду)
  function layout(advs) {
    const order = { warrior: 0, rogue: 1, priest: 2, shaman: 3, archer: 4, mage: 5 };
    advs = advs.slice().sort((p, q) => order[p.cls] - order[q.cls]);
    // больше 6 героев — ряды по 4 (4 линии вместо 3), чтобы отряд не уходил за стену
    const per = advs.length > 6 ? 4 : 3, lanes = per === 4 ? [98, 107, 116, 125] : LANES;
    const meleeN = advs.filter((a) => G.X.isFront(a.cls)).length, meleeRows = Math.ceil(meleeN / per);
    const rows = meleeRows + Math.ceil((advs.length - meleeN) / per), step = rows > 3 ? 11 : 15;
    return advs.map((a, idx) => {
      const melee = G.X.isFront(a.cls), k = melee ? idx : idx - meleeN;
      const row = melee ? Math.floor(k / per) : meleeRows + Math.floor(k / per), i = k;
      const s = G.T.stats(a);
      const sk = (k) => G.T.skillSum(a, k), C = D.CLS[a.cls];
      return {
        a, cls: a.cls, max: s.hp, atk: s.atk, def: s.def * (1 + G.bonus('defDef')), cd: Math.random() * 0.5, x: 66 - row * step - (i % per) * 2, y: lanes[i % per], hit: 0, swing: 0,
        dodge: Math.min(0.5, sk('dodge') + (C.dodge || 0)), crit: Math.min(0.6, sk('crit') + (C.crit || 0)), critMul: Math.min(4, 2 + sk('critDmg')), regen: Math.min(0.1, sk('regen')),
        bind: 1.5 + 8 * sk('stun'), // сколько секунд держат оковы шамана
        bossAtk: sk('bossAtk'), thorns: Math.min(0.8, sk('thorns')),
      };
    });
  }

  W.start = function (final) {
    if (W.running() || W.whyNot()) return;
    const n = final ? 'final' : G.S.gate.sel;
    if (final && !W.finalReady()) return;
    if (!final && n > G.S.gate.best + 1) return;
    const advs = G.S.advs.filter((a) => a.st === 'gate' && a.hp > 0);
    const defs = layout(advs);
    const queue = W.comp(n);
    B = {
      n, state: 'run', t: 0, queue, mons: [], defs, guards: [], proj: [], fl: [], slash: [], boom: 0,
      gate: W.wallHp(), gateMax: W.wallHp(), spawnT: 0.6, gold: 0, bone: 0, kills: 0, shake: 0, total: queue.length,
      guardDr: Math.min(0.3, G.T.partySum(advs, 'guard')),
    };
    for (let i = 0; i < G.S.guards; i++) B.guards.push({ cd: Math.random() * 1.2 });
    cv = document.getElementById('battlecv');
    cv.width = LW * SC;
    cv.height = (LH + TOP) * SC;
    ctx = cv.getContext('2d');
    if (!bg) bg = G.SPR.battleBg();
    G.UI.showBattle(true);
    G.log(final ? 'logFinalStart' : 'logWaveStart', { n }, final ? 'epic' : 'info');
    G.SFX.play('horn');
    lastT = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  };

  // «Дальше»: сразу следующая волна после победы
  W.canNext = () => !!B && !B.duel && B.state === 'won' && B.n !== 'final' && !W.whyNot();
  W.next = function () {
    if (!W.canNext()) return;
    W.close();
    W.start(false);
  };

  W.close = function () {
    if (W.running()) return;
    B = null;
    cancelAnimationFrame(raf);
    G.UI.showBattle(false);
    G.UI.dirty();
  };

  function frame(now) {
    if (!B) return;
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (B.state === 'run') (B.duel ? updateArena : update)(dt);
    if (!B) return;
    updateFx(dt);
    draw();
    if (B.duel) G.UI.duelHud(B); else G.UI.battleHud(B);
    raf = requestAnimationFrame(frame);
  }

  function float(x, y, text, color) { B.fl.push({ x, y, text, color, t: 0 }); }
  const aliveDefs = () => B.defs.filter((d) => d.a.hp > 0);
  function front() {
    let best = null;
    for (const m of B.mons) if (!m.dead && m.x < LW - 4 && (!best || m.x < best.x)) best = m;
    return best;
  }
  const dmgMul = () => (1 + G.bonus('defAtk')) * G.K.rally();

  function spawn() {
    const k = B.queue.shift();
    const M = D.MON[k];
    const spr = G.SPR.canvas(sprKey(k));
    const lane = M.boss ? 1 : Math.floor(Math.random() * 3);
    B.mons.push({
      k, hp: M.hp * W.hpMul(B.n) * (M.boss ? D.BOSS.gateHp : 1), max: M.hp * W.hpMul(B.n) * (M.boss ? D.BOSS.gateHp : 1),
      atk: M.atk * W.atkMul(B.n) * (M.boss ? D.BOSS.gateAtk : 1), spd: M.spd * W.spdMul(B.n) * G.U.rand(0.9, 1.1),
      x: LW + 10 + spr.width / 2, y: LANES[lane] + G.U.randInt(-2, 2), w: spr.width, h: spr.height, cd: 0.3, flash: 0, dead: false, deadT: 0,
      boss: !!M.boss, walk: 0, jit: G.U.randInt(0, 8),
    });
  }

  function hitMon(m, dmg, col) {
    if (m.dead) return;
    m.hp -= dmg;
    m.flash = 0.1;
    float(m.x, m.y - m.h - 2, G.U.fmt(Math.max(1, Math.round(dmg))), col);
    if (m.hp <= 0) kill(m);
  }

  function kill(m) {
    m.dead = true;
    m.deadT = 0.5;
    B.kills++;
    G.S.stats.kills++;
    const g = Math.ceil(D.MON[m.k].gold * Math.pow(1.13, (B.n === 'final' ? 20 : B.n) - 1) * G.K.epochReward());
    B.gold += g;
    G.E.add('gold', g);
    float(m.x, m.y - m.h - 10, '+' + g, '#f7c948');
    if (m.boss || Math.random() < 0.25) {
      const bn = m.boss ? 3 + Math.floor((B.n === 'final' ? 20 : B.n) / 2) : 1;
      B.bone += bn;
      G.E.add('bone', bn);
    }
    G.SFX.play('hit');
  }

  function monsterAttack(m, alive) {
    if (alive.length) {
      const front = alive.filter((d) => G.X.isFront(d.cls));
      const pool = front.length ? front : alive;
      const d = pool[Math.floor(Math.random() * pool.length)];
      if (d.dodge && Math.random() < d.dodge) { float(d.x, d.y - 18, G.t('dodged'), '#9ad0ff'); return; }
      const dmg = Math.max(1, ((m.atk * 20) / (20 + d.def)) * (1 - B.guardDr));
      d.a.hp = Math.max(0, d.a.hp - dmg);
      if (d.thorns) hitMon(m, dmg * d.thorns * 1.5, '#c8a060'); // шипы
      d.hit = 0.15;
      float(d.x, d.y - 18, '-' + Math.ceil(dmg), '#ff6a6a');
      if (d.a.hp <= 0) float(d.x, d.y - 26, G.t('downed'), '#ffb0b0');
    } else {
      B.gate -= m.atk;
      B.shake = 0.15;
      // «Колья у ворот»: часть удара возвращается монстру
      if (G.bonus('thorns') > 0) hitMon(m, m.atk * G.bonus('thorns'), '#c8a060');
      float(30, 74, '-' + Math.ceil(m.atk), '#ff6a6a');
      if (B.gate <= 0) { B.gate = 0; end(false); }
    }
  }

  // Заклинания короля
  W.spell = function (id) {
    if (!W.active()) return;
    if (id === 'meteor') {
      B.boom = 0.4;
      B.shake = 0.3;
      const dmg = G.K.meteorDmg();
      for (const m of B.mons) if (!m.dead && m.x < LW) hitMon(m, dmg, '#ff9a3c');
    } else if (id === 'heal') {
      for (const d of B.defs) {
        if (d.a.hp <= 0) continue;
        const h = d.max * 0.5;
        d.a.hp = Math.min(d.max, d.a.hp + h);
        float(d.x, d.y - 20, '+' + Math.round(h), '#7dff7a');
      }
      B.gate = Math.min(B.gateMax, B.gate + B.gateMax * 0.3);
      float(30, 70, '+' + Math.round(B.gateMax * 0.3), '#7dff7a');
    }
  };

  function update(dt) {
    B.t += dt;
    if (B.shake > 0) B.shake -= dt;
    if (B.boom > 0) B.boom -= dt;
    if (B.queue.length) {
      B.spawnT -= dt;
      if (B.spawnT <= 0) {
        spawn();
        const next = B.queue[0];
        B.spawnT = next && D.MON[next].boss ? 3 : G.U.rand(0.7, 1.5) * (B.n > 10 ? 0.8 : 1);
      }
    }
    let alive = aliveDefs();
    const line = alive.length ? 76 : 42;
    // «Каменщики на стенах» чинят ворота прямо в бою
    if (G.bonus('gateRegen') > 0) B.gate = Math.min(B.gateMax, B.gate + B.gateMax * G.bonus('gateRegen') * dt);

    for (const m of B.mons) {
      if (m.dead) continue;
      if (m.flash > 0) m.flash -= dt;
      if (m.stun > 0) { m.stun -= dt; continue; }
      const stop = line + m.w / 2 + m.jit;
      if (m.x > stop) { m.x -= m.spd * dt; m.walk += dt; }
      else {
        m.cd -= dt;
        if (m.cd <= 0) { m.cd = 1.1; monsterAttack(m, alive); if (B.state !== 'run') return; alive = aliveDefs(); }
      }
    }

    const gdmg = G.T.guardDmg() * G.K.rally();
    B.guards.forEach((g, i) => {
      g.cd -= dt;
      if (g.cd > 0) return;
      const tg = front();
      if (!tg) { g.cd = 0.2; return; }
      g.cd = 1.2 / (1 + G.bonus('guardSpd'));
      B.proj.push({ x: 6 + (i % 6) * 5, y: 6, tg, dmg: gdmg, kind: 'arrow', spd: 240 });
    });

    const war = 1 + Math.min(0.3, alive.reduce((s, d) => s + G.T.skillSum(d.a, 'partyAtk'), 0)); // боевой клич
    const mul = dmgMul() * war;
    const aura = alive.reduce((s, d) => s + G.T.skillSum(d.a, 'aura'), 0);
    for (const d of alive) {
      // «Второе дыхание» и аура мага: восстановление здоровья раз в 1,5 с
      const rg = d.regen + aura;
      if (rg > 0) d.a.hp = Math.min(d.max, d.a.hp + (d.max * rg * dt) / 1.5);
      d.cd -= dt;
      if (d.hit > 0) d.hit -= dt;
      if (d.swing > 0) d.swing -= dt;
      if (d.cd > 0) continue;
      const tg = front();
      const bm = tg && tg.boss && d.bossAtk ? 1 + d.bossAtk : 1;
      if (d.cls === 'priest') {
        const hurt = alive.filter((o) => o.a.hp < o.max * 0.9).sort((p, q) => p.a.hp / p.max - q.a.hp / q.max)[0];
        if (hurt) {
          const h = d.atk * 1.5 * (1 + G.T.skillSum(d.a, 'heal'));
          hurt.a.hp = Math.min(hurt.max, hurt.a.hp + h);
          float(hurt.x, hurt.y - 18, '+' + Math.round(h), '#7dff7a');
          d.cd = 1.5;
        } else if (tg) { B.proj.push({ x: d.x + 4, y: d.y - 8, tg, dmg: d.atk * 0.8 * mul, kind: 'holy', spd: 200 }); d.cd = 1.5; }
        else d.cd = 0.2;
        continue;
      }
      if (!tg) { d.cd = 0.2; continue; }
      if (d.cls === 'warrior') {
        if (tg.x - tg.w / 2 <= d.x + 24) { const cr = Math.random() < d.crit; hitMon(tg, d.atk * mul * bm * (cr ? 2 : 1), cr ? '#ffd84a' : '#ffffff'); d.cd = 1.0; d.swing = 0.15; }
        else d.cd = 0.15;
      } else if (d.cls === 'archer') {
        B.proj.push({ x: d.x + 4, y: d.y - 9, tg, dmg: d.atk * mul * bm * (Math.random() < d.crit ? 2 : 1), kind: 'arrow', spd: 260 });
        if (Math.random() < G.T.skillSum(d.a, 'volley')) B.proj.push({ x: d.x + 4, y: d.y - 12, tg, dmg: d.atk * mul, kind: 'arrow', spd: 240 });
        d.cd = 1.0;
      } else if (d.cls === 'mage') {
        B.proj.push({ x: d.x + 4, y: d.y - 12, tg, dmg: d.atk * 1.3 * mul * bm, kind: 'orb', spd: 170, splash: 26, sm: 0.5 + G.T.skillSum(d.a, 'splash') });
        d.cd = 1.5;
      } else if (d.cls === 'rogue') {
        // быстрые броски кинжалов, крит бьёт сильнее обычного
        const cr = Math.random() < d.crit;
        B.proj.push({ x: d.x + 4, y: d.y - 9, tg, dmg: d.atk * mul * bm * (cr ? d.critMul : 1), kind: 'knife', spd: 300, crit: cr });
        d.cd = 0.7;
      } else if (d.cls === 'shaman') {
        // дух-оковы: врагов рядом с целью сковывает на несколько секунд
        B.proj.push({ x: d.x + 4, y: d.y - 12, tg, dmg: d.atk * 0.8 * mul * bm, kind: 'spirit', spd: 160, bind: d.bind });
        d.cd = 2.8;
      }
    }

    for (const p of B.proj) {
      if (p.done) continue;
      if (p.tg.dead) { p.done = true; continue; }
      const tx = p.tg.x, ty = p.tg.y - p.tg.h / 2;
      const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy), step = p.spd * dt;
      p.ang = Math.atan2(dy, dx);
      if (dist <= step + 2) {
        p.done = true;
        const col = p.kind === 'orb' ? '#c08aff' : p.kind === 'holy' ? '#fff2a8' : p.kind === 'spirit' ? '#7fe7ff' : p.crit ? '#ffd84a' : '#ffffff';
        const main = p.tg;
        hitMon(main, p.dmg, col);
        if (p.bind) {
          for (const m of B.mons) {
            if (m.dead || Math.abs(m.x - main.x) > 28 || Math.abs(m.y - main.y) > 20) continue;
            m.stun = Math.max(m.stun || 0, p.bind * (m.boss ? 0.5 : 1));
          }
          if (!main.dead) float(main.x, main.y - main.h - 10, G.t('stunned'), '#7fe7ff');
        }
        if (p.splash) {
          for (const m of B.mons) {
            if (m !== main && !m.dead && Math.abs(m.x - main.x) < p.splash && Math.abs(m.y - main.y) < 16) hitMon(m, p.dmg * p.sm, col);
          }
        }
      } else { p.x += (dx / dist) * step; p.y += (dy / dist) * step; }
    }
    B.proj = B.proj.filter((p) => !p.done);

    if (!B.queue.length && B.mons.every((m) => m.dead)) end(true);
  }

  function updateFx(dt) {
    for (const f of B.fl) { f.t += dt; f.y -= 14 * dt; }
    B.fl = B.fl.filter((f) => f.t < 0.9);
    for (const s of B.slash) s.t += dt;
    B.slash = B.slash.filter((s) => s.t < 0.2);
    for (const m of B.mons) if (m.dead) m.deadT -= dt;
    B.mons = B.mons.filter((m) => !m.dead || m.deadT > 0 || m.champ);
  }

  function end(win) {
    if (B.state !== 'run') return;
    B.state = win ? 'won' : 'lost';
    const n = B.n, final = n === 'final';
    const downed = B.defs.filter((d) => d.a.hp <= 0 && G.T.get(d.a.id));
    if (win) {
      const r = W.reward(n);
      G.E.addAll(r);
      B.gold += r.gold;
      B.bone += r.bone || 0;
      const xp = Math.round(10 * Math.pow(1.15, (final ? 25 : n) - 1));
      for (const d of B.defs) G.T.giveXp(d.a, d.a.hp > 0 ? xp : Math.round(xp / 2));
      for (const d of downed) G.T.wound(d.a, 60);
      if (final) {
        G.S.camp.won = true;
        G.K.xp(D.KXP.final);
        G.log('logFinalWon', {}, 'epic');
      } else {
        const rec = n > G.S.gate.best; // новая волна — полный опыт Короля, повтор — малая доля
        if (rec) G.S.gate.best = n;
        G.S.stats.waves = (G.S.stats.waves || 0) + 1;
        G.S.gate.sel = Math.min(G.S.gate.best + 1, n + 1);
        G.K.xp(D.KXP.wave * n * n * (rec ? 1 : D.KXP.rep)); // опыт Короля за сражение
        G.log('logWaveWon', { n, loot: { gold: B.gold, bone: B.bone } }, 'good');
      }
      B.result = { win, final, gold: B.gold, bone: B.bone, xp, wounded: downed.length };
      G.SFX.play('win');
    } else {
      const lost = {};
      for (const r of ['gold', 'wood', 'stone', 'iron']) {
        const v = Math.floor(G.S.res[r] * 0.15 * Math.max(0, 1 - G.bonus('lootProtect')));
        if (v > 0) { G.S.res[r] -= v; lost[r] = v; }
      }
      G.S.folk = Math.floor((G.S.folk || 0) * 0.85); // часть жителей разбегается
      const cand = ['lumber', 'quarry', 'mine', 'forge', 'tavern', 'barracks', 'arena', 'warehouse', 'academy'].filter((k) => G.E.lvl(k) > 1 && !G.E.consOf(k));
      let broken = null;
      if (cand.length) {
        broken = G.U.pick(cand);
        G.S.b[broken].lvl--;
        G.E.clampWorkers();
      }
      const dead = [];
      for (const d of downed) {
        if (Math.random() < G.T.deathChance(0.4)) { dead.push(d.a.name); G.T.kill(d.a, false); }
        else G.T.wound(d.a, 90);
      }
      B.result = { win, final, lost, broken, dead };
      G.log(final ? 'logFinalLost' : 'logWaveLost', { n, loot: lost }, 'bad');
      if (broken) G.log('logBroken', { b: { k: 'bn_' + broken }, l: G.S.b[broken].lvl }, 'bad');
      G.SFX.play('lose');
    }
    G.UI.dirty();
    G.UI.slotsDirty = true;
    G.UI.battleResult(B.result);
    G.save();
  }

  // ---------- Поединок (Арена, Путешествие): показ боя по записи раундов ----------
  // Исход уже посчитан (G.X.duel); здесь он проигрывается: герои бьют, противник отвечает, жрецы лечат.
  // opt: mode, n (ранг или этап), title, cname, bg() — фон, bgKey, filter — оттенок противника, finish() — итог
  W.arena = (res, en, tm, rank) => W.duel(res, en, tm, {
    mode: 'arena', n: rank, title: G.t('arenaRank', { r: rank }), cname: G.t('mn_' + en.key),
    bg: () => G.SPR.arenaBg(), bgKey: 'arena@' + G.SPR.style(), finish: G.A.finish,
  });
  W.duel = function (res, en, tm, opt) {
    if (W.running()) return false;
    cancelAnimationFrame(raf);
    const defs = layout(tm);
    for (const d of defs) { d.hpv = d.a.hp; d.x += 70; } // на Арене отряд стоит ближе к центру

    const spr = G.SPR.canvas(sprKey(en.key));
    const sc = spr.height <= 20 ? 2 : 1.5;
    const mon = {
      k: en.key, hp: en.hp, max: en.hp, x: 215, y: LANES[1] + 4, w: spr.width, h: spr.height, sc, flash: 0, dead: false, deadT: 0,
      boss: true, champ: true, walk: 0, stun: 0, lunge: 0, jit: 0, filter: opt.filter || null,
    };
    const rt = Math.max(0.45, Math.min(1, 14 / Math.max(1, res.tl.length)));
    B = {
      mode: opt.mode, duel: true, n: opt.n, title: opt.title, cname: opt.cname, bg: opt.bg, bgKey: opt.bgKey || opt.mode + ':' + opt.n, finish: opt.finish,
      state: 'run', t: 0, queue: [], mons: [mon], defs, guards: [], proj: [], fl: [], slash: [], boom: 0, shake: 0,
      tl: res.tl, ids: tm.map((a) => a.id), clickable: opt.mode === 'journey', clickDmg: 0, forceWin: false, ri: -1, rs: 0, rt, step: 0, wait: 0.7, stance: res.stance, total: 1, champ: en.key,
    };
    cv = document.getElementById('battlecv');
    cv.width = LW * SC;
    cv.height = (LH + TOP) * SC;
    ctx = cv.getContext('2d');
    G.UI.showBattle(true, opt.mode);
    G.SFX.play('horn');
    lastT = performance.now();
    raf = requestAnimationFrame(frame);
    return true;
  };
  const defById = (id) => B.defs.find((d) => d.a.id === id);

  function arenaRound(R) {
    const m = B.mons[0], T = B.rt, s = B.rs;
    // 1) герои атакуют
    if (B.step === 0) {
      B.step = 1;
      for (const d of B.defs) {
        if (d.hpv <= 0) continue;
        if (d.cls === 'warrior') { d.swing = 0.2; B.slash.push({ x: m.x - 4 + G.U.randInt(-3, 3), y: m.y - 10, t: 0 }); }
        else {
          const kind = d.cls === 'archer' ? 'arrow' : d.cls === 'rogue' ? 'knife' : d.cls === 'mage' ? 'orb' : d.cls === 'shaman' ? 'spirit' : 'holy';
          B.proj.push({ x: d.x + 4, y: d.y - 10, tg: m, kind, spd: 260 });
        }
      }
    }
    // 2) урон по чемпиону
    if (B.step === 1 && s >= 0.35 * T) {
      B.step = 2;
      const e = R.ev.find((x) => x[0] === 'fr_party' || x[0] === 'fr_partyCrit');
      if (e) {
        const crit = e[0] === 'fr_partyCrit';
        float(m.x, m.y - m.h * m.sc - 8, '-' + G.U.fmt(e[1].d), crit ? '#ffd84a' : '#ffffff');
        if (crit) B.shake = 0.12;
      }
      m.hp = Math.max(0, R.ehp - B.clickDmg);
      m.flash = 0.12;
      G.SFX.play('hit');
      if (m.hp <= 0) { if (R.ehp > 0) B.forceWin = true; m.dead = true; m.deadT = 1.2; B.step = 9; return; }
    }
    // 3) чемпион отвечает
    if (B.step === 2 && s >= 0.55 * T) {
      B.step = 3;
      for (const [k, p] of R.ev) {
        const d = p && p.id != null ? defById(p.id) : null;
        if (k === 'fr_stun') { m.stun = 0.9 * T; float(m.x, m.y - m.h * m.sc - 14, G.t('stunned'), '#7fe7ff'); }
        else if (k === 'fr_dodge' && d) float(d.x, d.y - 20, G.t('dodged'), '#9ad0ff');
        else if (k === 'fr_dmg' && d) { m.lunge = 0.18; d.hpv = Math.max(0, d.hpv - p.d); d.hit = 0.15; float(d.x, d.y - 20, '-' + Math.ceil(p.d), '#ff6a6a'); }
        else if (k === 'fr_down' && d) float(d.x, d.y - 28, G.t('downed'), '#ffb0b0');
      }
    }
    // 4) лечение и итог раунда
    if (B.step === 3 && s >= 0.8 * T) {
      B.step = 4;
      for (const [k, p] of R.ev) {
        if (k !== 'fr_heal') continue;
        const d = defById(p.id);
        if (d) float(d.x, d.y - 20, '+' + p.h, '#7dff7a');
      }
      R.hp.forEach((v, i) => { const d = defById(B.ids[i]); if (d) d.hpv = v; });
    }
  }

  function updateArena(dt) {
    B.t += dt;
    if (B.shake > 0) B.shake -= dt;
    const m = B.mons[0];
    if (m.flash > 0) m.flash -= dt;
    if (m.stun > 0) m.stun -= dt;
    if (m.lunge > 0) m.lunge -= dt;
    for (const d of B.defs) { if (d.hit > 0) d.hit -= dt; if (d.swing > 0) d.swing -= dt; }
    for (const p of B.proj) {
      const tx = p.tg.x, ty = p.tg.y - (p.tg.h * (p.tg.sc || 1)) / 2;
      const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy), step = p.spd * dt;
      p.ang = Math.atan2(dy, dx);
      if (dist <= step + 2) p.done = true;
      else { p.x += (dx / dist) * step; p.y += (dy / dist) * step; }
    }
    B.proj = B.proj.filter((p) => !p.done);
    if (B.wait > 0) { B.wait -= dt; return; }
    if (B.step === 9) { if (m.deadT <= 0.2) endArena(); return; }
    B.rs += dt;
    if (B.ri < 0 || B.rs >= B.rt) {
      B.ri++;
      B.rs = 0;
      B.step = 0;
      if (B.ri >= B.tl.length) { B.wait = 0; endArena(); return; }
    }
    arenaRound(B.tl[B.ri]);
  }

  function endArena() {
    if (!B || B.state !== 'run') return;
    let ovr = null;
    if (B.forceWin) ovr = { win: true, hp: B.ids.map((id) => { const d = defById(id); return d ? Math.max(0, d.hpv) : 0; }) };
    else {
      const last = B.tl[B.tl.length - 1];
      if (last) {
        B.mons[0].hp = Math.max(0, last.ehp - B.clickDmg);
        last.hp.forEach((v, i) => { const d = defById(B.ids[i]); if (d) d.hpv = v; });
      }
    }
    const r = B.finish(ovr) || { win: false, rank: B.n, s: B.n, loot: null, xp: 0, wounded: 0 };
    B.state = r.win ? 'won' : 'lost';
    B.result = r;
    if (r.win && !B.mons[0].dead) { B.mons[0].dead = true; B.mons[0].deadT = 1.2; }
    G.SFX.play(r.win ? 'win' : 'lose');
    G.UI.duelResult(B, r);
    G.save();
  }
  // «Пропустить»: сразу к итогу
  W.arenaSkip = function () {
    if (!B || !B.duel || B.state !== 'run') return;
    B.proj = [];
    endArena();
  };

  // Клик Короля по боссу Путешествия: урон копится; если босс падает раньше, чем по записи, — победа досрочно
  function duelClick(ev) {
    const r = cv.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * LW, y = ((ev.clientY - r.top) / r.height) * (LH + TOP) - TOP;
    B.slash.push({ x, y, t: 0 });
    G.SFX.play('click');
    const m = B.mons[0];
    if (!m || m.dead || B.step === 9) return;
    const w = m.w * (m.sc || 1), h = m.h * (m.sc || 1);
    if (x < m.x - w / 2 - 6 || x > m.x + w / 2 + 6 || y < m.y - h - 6 || y > m.y + 4) return;
    const crit = Math.random() < G.bonus('clickCrit');
    const d = W.kingDmg() * (crit ? 3 : 1);
    B.clickDmg += d;
    m.hp = Math.max(0, m.hp - d);
    m.flash = 0.1;
    float(m.x, m.y - h - 2, '−' + G.U.fmt(Math.round(d)), crit ? '#ff9a3c' : '#f7c948');
    G.K.xp(D.KXP.hit);
    if (m.hp <= 0) { B.forceWin = true; m.dead = true; m.deadT = 1.2; B.step = 9; B.wait = 0; }
  }

  // Клик короля по монстру
  W.click = function (ev) {
    if (B && B.duel && B.clickable && B.state === 'run') { duelClick(ev); return; }
    if (!B || B.state !== 'run' || B.duel) return;
    const r = cv.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * LW, y = ((ev.clientY - r.top) / r.height) * (LH + TOP) - TOP;
    let hit = null;
    for (const m of B.mons) {
      if (m.dead) continue;
      if (x >= m.x - m.w / 2 - 5 && x <= m.x + m.w / 2 + 5 && y >= m.y - m.h - 5 && y <= m.y + 4) {
        if (!hit || m.x < hit.x) hit = m;
      }
    }
    B.slash.push({ x, y, t: 0 });
    if (hit) {
      const crit = Math.random() < G.bonus('clickCrit');
      hitMon(hit, W.kingDmg() * (crit ? 3 : 1), crit ? '#ff9a3c' : '#f7c948');
      G.K.xp(D.KXP.hit);
    }
    G.SFX.play('click');
  };

  function draw() {
    ctx.setTransform(SC, 0, 0, SC, 0, TOP * SC);
    ctx.imageSmoothingEnabled = false;
    const sx = B.shake > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;
    if (B.duel) {
      ctx.drawImage(abg[B.bgKey] || (abg[B.bgKey] = B.bg()), sx, -TOP);
    } else {
      ctx.drawImage(bg, sx, -TOP);
      const g = B.gate / B.gateMax;
      ctx.fillStyle = '#1b1424';
      if (g < 0.66) { ctx.fillRect(24 + sx, 86, 1, 10); ctx.fillRect(25 + sx, 95, 1, 6); }
      if (g < 0.33) { ctx.fillRect(29 + sx, 100, 1, 12); ctx.fillRect(22 + sx, 110, 4, 1); }
      const gs = G.SPR.canvas('guard');
      for (let i = 0; i < Math.min(6, B.guards.length); i++) ctx.drawImage(gs, 1 + i * 5 + sx, 0);
    }

    const ents = [];
    for (const m of B.mons) ents.push({ y: m.y, m });
    for (const d of B.defs) ents.push({ y: d.y, d });
    ents.sort((p, q) => p.y - q.y);
    for (const e of ents) { if (e.m) drawMon(e.m); else drawDef(e.d); }

    for (const p of B.proj) {
      if (p.kind === 'arrow') {
        ctx.strokeStyle = '#e8e0c8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(p.ang || 0) * 5, p.y - Math.sin(p.ang || 0) * 5);
        ctx.stroke();
      } else if (p.kind === 'knife') {
        ctx.strokeStyle = p.crit ? '#ffd84a' : '#dfe6f2';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(p.ang || 0) * 3, p.y - Math.sin(p.ang || 0) * 3);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.kind === 'orb' ? '#c08aff' : p.kind === 'spirit' ? '#7fe7ff' : '#fff2a8';
        ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
      }
    }

    if (B.boom > 0) {
      ctx.globalAlpha = Math.min(0.5, B.boom);
      ctx.fillStyle = '#ff9a3c';
      ctx.fillRect(0, -TOP, LW, LH + TOP);
      ctx.globalAlpha = 1;
    }
    if (G.K.rally() > 1) {
      ctx.strokeStyle = '#f7c948';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5 - TOP, LW - 1, LH + TOP - 1);
    }

    for (const s of B.slash) {
      ctx.globalAlpha = 1 - s.t / 0.2;
      ctx.strokeStyle = '#fff2a8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s.x - 5, s.y - 5); ctx.lineTo(s.x + 5, s.y + 5);
      ctx.moveTo(s.x + 5, s.y - 5); ctx.lineTo(s.x - 5, s.y + 5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.font = '600 7px Rubik, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1b1424';
    for (const f of B.fl) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / 0.9);
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function hpBar(x, y, w, frac, col) {
    ctx.fillStyle = '#1b1424';
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, w + 2, 4);
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x), Math.round(y), Math.max(0, Math.round(w * frac)), 2);
  }

  function drawMon(m) {
    const key = sprKey(m.k);
    const spr = G.SPR.canvas(m.flash > 0 ? key + '|w' : key);
    const bob = !m.dead && Math.sin(m.walk * 12) > 0 ? -1 : 0;
    const sc = m.sc || 1, lunge = m.lunge > 0 ? -5 : 0;
    const x = Math.round(m.x - (m.w * sc) / 2 + lunge), y = Math.round(m.y - m.h * sc + bob);
    if (m.dead) ctx.globalAlpha = Math.max(0, m.deadT / (m.champ ? 1.2 : 0.5));
    if (m.filter && m.filter !== 'none') ctx.filter = m.filter;
    ctx.drawImage(spr, x, y, m.w * sc, m.h * sc);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    if (!m.dead && m.stun > 0) {
      ctx.strokeStyle = '#7fe7ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y - 1, m.w / 2 + 1, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (!m.dead && (m.hp < m.max || m.champ)) hpBar(x, y - 4, Math.max(10, m.w * sc - 2), m.hp / m.max, m.boss ? '#ff9a3c' : '#d64545');
  }

  function drawDef(d) {
    const spr = G.SPR.canvas(d.hit > 0 ? 'c_' + d.cls + '|w' : 'c_' + d.cls);
    const x = Math.round(d.x - 8 + (d.swing > 0 ? (B.duel ? 6 : 2) : 0)), y = Math.round(d.y - 16);
    const hp = d.hpv != null ? d.hpv : d.a.hp;
    if (hp <= 0) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.translate(x + 8, y + 12);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(spr, -8, -8);
      ctx.restore();
      return;
    }
    ctx.drawImage(spr, x, y);
    hpBar(x + 1, y - 4, 14, hp / d.max, '#7ddc7a');
  }
})();
