(function () {
  const T = (G.T = {});
  const D = G.D;
  const tl = () => G.E.lvl('tavern');

  T.REFRESH = 180;
  // Мест в Гильдии: 1 + уровень, «Большой зал Гильдии» добавляет ещё 2
  T.maxAdvs = () => (tl() > 0 ? 1 + tl() + G.bonus('advCap') : 0);
  T.candCount = () => (tl() >= 3 ? 4 : 3);
  T.rarOpen = (i) => tl() >= D.ARAR[i].tav;

  T.rarWeights = function () {
    const k = 0.15 * (tl() - 1);
    return D.ARAR.map((r, i) => (T.rarOpen(i) ? r.w * Math.pow(1 + k, i) : 0));
  };
  T.rarChances = function () {
    const w = T.rarWeights();
    const s = w.reduce((a, b) => a + b, 0) || 1;
    return w.map((x) => x / s);
  };

  T.gen = function () {
    const rar = G.U.weighted(T.rarWeights());
    const cls = G.U.pick(Object.keys(D.CLS));
    const n = G.U.pick(D.NAMES);
    const name = { ru: n[0], en: n[1] };
    if (rar === 3) {
      const e = G.U.pick(D.ADV_EPI);
      name.ru += ' ' + e[0];
      name.en += ' ' + e[1];
    }
    const a = { id: G.U.uid(), name, cls, rar, lvl: 1, xp: 0, hp: 0, st: 'idle', wt: 0, sk: {}, cost: Math.ceil(D.ARAR[rar].cost * G.U.rand(0.9, 1.1)) };
    a.hp = T.stats(a).hp;
    return a;
  };

  // «Позвать новых» дорожает в 1,6 раза с каждым нажатием; цена сбрасывается, когда новые люди приходят сами (раз в 3 минуты)
  T.refreshCost = () => ({ gold: Math.ceil(20 * Math.max(1, tl()) * Math.pow(1.6, G.S.tavern.rr || 0)) });
  // цена найма с навыком «Вербовщики» и наследием династии
  T.hireCost = (c) => Math.ceil(c.cost * Math.max(0.4, 1 - G.bonus('hireC')));
  // Клик по Гильдии: новые люди приходят на секунду раньше; когда таймер дошёл до нуля — приходят сразу
  T.boostSec = () => (1 + 0.25 * Math.max(0, tl() - 1)) * G.K.foreman();
  T.boost = function () {
    if (tl() < 1 || G.E.busy('tavern')) return false;
    G.S.tavern.t -= T.boostSec();
    G.K.handXp(D.KXP.help);
    if (G.S.tavern.t <= 0) { T.refresh(true); G.log('logRecruitsCame', {}, 'good'); return 'came'; }
    return true;
  };
  T.refresh = function (free) {
    if (!free && (G.E.busy('tavern') || !G.E.pay(T.refreshCost()))) return;
    G.S.tavern.cands = Array.from({ length: T.candCount() }, T.gen);
    if (free) { G.S.tavern.t = T.REFRESH; G.S.tavern.rr = 0; } // пришли сами — цена снова базовая
    else G.S.tavern.rr = (G.S.tavern.rr || 0) + 1; // позвал за золото — следующий раз дороже, таймер не сбрасывается
    G.UI.dirty();
  };

  T.hire = function (i) {
    const c = G.S.tavern.cands[i];
    if (!c || G.S.advs.length >= T.maxAdvs() || !G.E.usable('tavern')) return;
    if (!G.E.pay({ gold: T.hireCost(c) })) return;
    G.S.tavern.cands.splice(i, 1);
    delete c.cost;
    c.st = 'idle';
    G.S.advs.push(c);
    G.S.stats.hires = (G.S.stats.hires || 0) + 1;
    G.log('logHired', { name: c.name, cls: { k: 'cl_' + c.cls } }, 'good');
    G.SFX.play('coin');
    G.UI.dirty();
  };

  // ---------- навыки ----------
  T.skills = (a) => D.SKILLS[a.cls];
  T.skillSum = function (a, key) {
    let v = 0;
    for (const s of D.SKILLS[a.cls]) if (a.sk && a.sk[s.id] && s.eff[key]) v += D.rankEff(a.sk[s.id]) * s.eff[key];
    return v;
  };
  T.sp = (a) => a.lvl - 1 + (a.skFree || 0) - Object.values(a.sk || {}).reduce((x, y) => x + y, 0); // skFree — ранги, сохранённые престижем
  T.prestMul = (a) => 1 + D.PREST_BONUS * (a.prest || 0);
  T.learn = function (id, sid) {
    const a = T.get(id);
    if (!a || T.sp(a) <= 0) return;
    a.sk = a.sk || {};
    if ((a.sk[sid] || 0) >= D.SKILL_MAX) return;
    const before = T.stats(a).hp;
    a.sk[sid] = (a.sk[sid] || 0) + 1;
    if (a.hp > 0) a.hp += T.stats(a).hp - before;
    G.SFX.play('level');
    G.UI.dirty();
  };
  // Суммарный эффект навыков по отряду (живые бойцы)
  T.partySum = (list, key) => list.reduce((s, a) => s + (a.hp > 0 ? T.skillSum(a, key) : 0), 0);

  T.stats = function (a) {
    const C = D.CLS[a.cls], m = D.ARAR[a.rar].mult, L = a.lvl - 1;
    let hp = (C.hp + C.ghp * L) * m, atk = (C.atk + C.gatk * L) * m, def = (C.def + C.gdef * L) * m;
    for (const it of G.S.items) {
      if (it.eq === a.id) { atk += G.F.stat(it, 'atk'); def += G.F.stat(it, 'def'); hp += G.F.stat(it, 'hp'); }
    }
    const pm = T.prestMul(a) * (1 + G.bonus('heroPow')); // звёзды престижа и «Кровь героев»
    hp *= pm; atk *= pm; def *= pm;
    hp *= 1 + T.skillSum(a, 'hp');
    atk *= 1 + T.skillSum(a, 'atk');
    def *= 1 + T.skillSum(a, 'def');
    return { hp: Math.round(hp), atk: Math.round(atk), def: Math.round(def) };
  };

  T.xpNeed = (l) => Math.round(40 * Math.pow(1.4, l - 1));
  T.giveXp = function (a, n) {
    a.xp += n * (1 + G.bonus('xp') + G.bonus('advXp') + T.skillSum(a, 'xp'));
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

  // Мест на стене — столько же, сколько в Гильдии: все герои могут встать на защиту
  T.gateMax = () => T.maxAdvs();
  T.gateCount = () => G.S.advs.filter((a) => a.st === 'gate').length;
  T.setGate = function (id) {
    const a = T.get(id);
    if (!a || G.W.active()) return;
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

  // Гибель. В подземелье снаряжение остаётся с телом.
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

  T.deathChance = (base) => Math.max(0.02, base - G.bonus('save'));
  T.wound = function (a, sec) {
    a.st = 'wounded';
    a.wt = sec / ((G.bonus('recover') ? 2 : 1) * (1 + G.bonus('medic')));
    a.hp = 0;
  };

  T.tick = function (dt) {
    if (tl() > 0) {
      G.S.tavern.t -= dt;
      if (G.S.tavern.t <= 0) T.refresh(true);
    }
    const inBattle = G.W.active();
    for (const a of G.S.advs) {
      if (a.st === 'wounded') {
        const mx = T.stats(a).hp;
        a.hp = Math.min(mx, a.hp + (mx - a.hp) * Math.min(1, dt / Math.max(dt, a.wt)));
        a.wt -= dt;
        if (a.wt <= 0) {
          a.st = 'idle';
          G.log('logRecovered', { name: a.name }, 'info');
          G.UI.dirty();
        }
      } else if (G.K.medic() && (a.st === 'idle' || (a.st === 'gate' && !inBattle))) {
        // сами восстанавливаются только с талантом «Лекари»
        const mx = T.stats(a).hp;
        if (a.hp < mx) a.hp = Math.min(mx, a.hp + mx * 0.03 * (1 + G.bonus('medic')) * dt);
      }
    }
  };

  // ---------- стража ----------
  T.maxGuards = () => (G.E.lvl('barracks') > 0 ? 2 * G.E.lvl('barracks') + G.bonus('guards') : 0);
  T.guardCost = function () {
    const n = G.S.guards;
    const m = Math.max(0.4, 1 - G.bonus('guardC'));
    return { gold: Math.ceil(30 * Math.pow(1.3, n) * m), iron: Math.ceil(8 * Math.pow(1.22, n) * m) };
  };
  T.guardDmg = () => 2 * (1 + 0.3 * (G.E.lvl('barracks') - 1)) * (1 + G.bonus('guardAtk') + G.bonus('defAtk'));
  T.hireGuard = function () {
    if (G.S.guards >= T.maxGuards() || !G.E.usable('barracks')) return;
    if (!G.E.pay(T.guardCost())) return;
    G.S.guards++;
    G.SFX.play('coin');
    G.UI.dirty();
  };
})();
