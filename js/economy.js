(function () {
  const E = (G.E = {});
  const D = G.D;

  E.lvl = (k) => (G.S.b[k] ? G.S.b[k].lvl : 0);
  // Никакое здание не может быть выше Замка: сначала улучшаем Замок, потом остальное
  E.maxLevel = (k) => (k === 'castle' ? D.MAXLVL : Math.min(D.MAXLVL, E.lvl('castle')));

  // ---------- склад ----------
  // Склад на 8-м уровне: ограничений нет, вместо вместимости — прибавка к пассивной добыче (рабочие и налоги)
  E.noCap = () => E.lvl('warehouse') >= D.MAXLVL;
  // Прибавка к пассивной добыче (рабочие и налоги): «Запертые кладовые» и Склад 8-го уровня;
  // на 8-м уровне бонусы вместимости превращаются в добычу (D.CONV)
  E.storeProd = () => (E.noCap() ? D.STORE_PROD : 0);
  E.convProd = () => (E.noCap() ? D.CONV.store * G.bonus('store') : 0);
  E.convTax = () => (E.noCap() ? D.CONV.goldCap * G.bonus('goldCap') : 0);
  E.passive = () => G.bonus('passive') + E.storeProd() + E.convProd();
  E.cap = function (r) {
    if (E.noCap()) return Infinity;
    const L = E.lvl('warehouse');
    const base = r === 'gold' ? D.goldCap(L) : D.CAPS[L];
    return Math.floor(base * (1 + G.bonus('store') + (r === 'gold' ? G.bonus('goldCap') : 0)));
  };
  E.can = function (cost) {
    for (const r in cost) if ((G.S.res[r] || 0) < cost[r]) return false;
    return true;
  };
  // Помещается ли цена на склад (иначе её никогда не накопить)
  E.fits = function (cost) {
    for (const r in cost) if (cost[r] > E.cap(r)) return false;
    return true;
  };
  E.pay = function (cost) {
    if (!E.can(cost)) return false;
    for (const r in cost) G.S.res[r] -= cost[r];
    return true;
  };
  E.add = function (r, n) {
    if (n <= 0) return 0;
    const before = G.S.res[r] || 0;
    const after = Math.min(E.cap(r), before + n);
    G.S.res[r] = Math.max(before, after);
    G.S.seen[r] = true;
    return G.S.res[r] - before;
  };
  E.addAll = function (obj) {
    for (const r in obj) if (obj[r] > 0) E.add(r, obj[r]);
  };
  E.full = (r) => (G.S.res[r] || 0) >= E.cap(r);

  // ---------- стройка ----------
  // Цена и время перехода с уровня L на L+1 (нужно и для очереди указов)
  E.costAt = (k, L) => G.U.scaleCost(D.B[k].base, D.LVLMULT[Math.min(L, D.LVLMULT.length - 1)] * Math.max(0.6, 1 - G.bonus('buildC')));
  E.timeAt = (k, L) => D.buildTime(L) * Math.max(0.3, 1 - G.bonus('buildT'));
  E.upCost = (k) => E.costAt(k, E.lvl(k));
  E.upTime = (k) => E.timeAt(k, E.lvl(k));
  E.builders = () => 1 + G.bonus('builders');
  E.consOf = (k) => G.S.cons.find((c) => c.k === k);
  // Здание на перестройке недоступно (кроме налогов замка)
  E.busy = (k) => E.lvl(k) > 0 && !!E.consOf(k);
  E.usable = (k) => E.lvl(k) > 0 && !E.busy(k);
  E.freeBuilder = () => G.S.cons.length < E.builders();

  E.whyNot = function (k) {
    const d = D.B[k];
    if (d.noLevel) return 'noLevel';
    if (E.consOf(k)) return 'building';
    const L = E.lvl(k);
    if (L >= D.MAXLVL) return 'max';
    if (L >= E.maxLevel(k)) return 'castle';
    if (!E.fits(E.upCost(k))) return 'storage';
    if (!E.freeBuilder()) return 'builders';
    return '';
  };

  E.startUpgrade = function (k) {
    if (E.whyNot(k)) return false;
    const cost = E.upCost(k);
    if (!E.pay(cost)) return false;
    const t = E.upTime(k);
    G.S.cons.push({ k, t, total: t, cost });
    G.log(E.lvl(k) === 0 ? 'logBuildStart' : 'logUpStart', { b: { k: 'bn_' + k }, l: E.lvl(k) + 1 }, 'info');
    G.SFX.play('click');
    G.UI.dirty();
    G.UI.slotsDirty = true;
    return true;
  };

  E.cancelUpgrade = function (k) {
    const c = E.consOf(k);
    if (!c) return;
    G.S.cons = G.S.cons.filter((x) => x !== c);
    E.addAll(c.cost);
    G.log('logBuildCancel', { b: { k: 'bn_' + k } }, 'info');
    G.UI.dirty();
    G.UI.slotsDirty = true;
  };

  // Король помогает строителям кликом — только с талантом «Прораб»
  E.boostSec = () => G.bonus('boost');
  E.boost = function (k) {
    const c = E.consOf(k);
    if (!c || E.boostSec() <= 0) return false;
    c.t -= E.boostSec();
    return true;
  };

  function complete(c) {
    const k = c.k;
    G.S.b[k].lvl++;
    const L = G.S.b[k].lvl;
    G.log(L === 1 ? 'logBuilt' : 'logUpgraded', { b: { k: 'bn_' + k }, l: L }, 'good');
    G.K.xp(5 * L * L);
    if (k === 'tavern' && L === 1) G.T.refresh(true);
    G.SFX.play('build');
    G.UI.dirty();
    G.UI.slotsDirty = true;
  }

  E.tickCons = function (dt) {
    for (const c of G.S.cons) c.t -= dt;
    const done = G.S.cons.filter((c) => c.t <= 0);
    if (!done.length) return;
    G.S.cons = G.S.cons.filter((c) => c.t > 0);
    done.forEach(complete);
  };

  // Указ о строительстве: строго по порядку, первым идёт первый в списке
  E.tickDecree = function () {
    const q = G.S.decree.build;
    let i = 0;
    while (i < q.length && E.freeBuilder()) {
      const k = q[i];
      const why = E.whyNot(k);
      if (why === 'max' || why === 'noLevel') { q.splice(i, 1); G.UI.dirty(); continue; }
      // ждёт уровня Замка, места на складе или само строится — пропускаем, очередь идёт дальше
      if (why === 'castle' || why === 'storage' || why === 'building') { i++; continue; }
      if (why || !E.can(E.upCost(k))) break; // ждём ресурсы: приоритет за этой записью
      E.startUpgrade(k);
      q.splice(i, 1);
    }
  };
  E.decreeAdd = function (k) {
    if (G.S.decree.build.length >= 12) return;
    G.S.decree.build.push(k);
    G.S.stats.decreed = (G.S.stats.decreed || 0) + 1;
    G.UI.dirty();
  };

  // ---------- добыча ----------
  E.rush = () => ((G.S.king.buff.rush || 0) > 0 ? 2 : 1);
  E.power = () => (1 + G.S.king.tools) * (1 + G.bonus('gather')) * E.rush();
  E.clickAmount = function (k) {
    const L = E.lvl(k);
    const own = 1 + G.bonus('gather_' + D.B[k].click); // навык здания: «Топоры», «Резцы», «Кирки»
    if (k === 'castle') return E.power() * (1 + 0.5 * (L - 1)) * own;
    return E.power() * (1 + 0.2 * (L - 1)) * own;
  };
  // Клик короля по зданию. «Удачный удар» даёт шанс ×5,
  // «Пример короля» добавляет несколько секунд работы этого здания.
  E.lastCrit = false;
  E.gather = function (k) {
    const d = D.B[k];
    if (!d.click || !E.usable(k)) return 0;
    let amount = E.clickAmount(k);
    E.lastCrit = Math.random() < G.bonus('clickCrit');
    if (E.lastCrit) amount *= 5;
    const sec = G.bonus('clickProd');
    if (sec > 0) {
      const b = G.S.b[k];
      amount += sec * (k === 'castle' ? E.tax() : b.w * E.workerRate(k));
    }
    const n = E.add(d.click, amount);
    G.S.stats.clicks++;
    G.S.stats['g_' + d.click] = (G.S.stats['g_' + d.click] || 0) + n; // собрано кликами — для целей
    G.K.xp(0.3);
    return n;
  };

  E.maxWorkers = (k) => (E.lvl(k) > 0 ? D.WORKERS[E.lvl(k)] + G.bonus('crews') + G.bonus('crews_' + k) : 0); // «Бригады» и навыки зданий дают места
  E.workerRate = function (k) {
    const L = Math.max(1, E.lvl(k));
    return 0.25 * (1 + 0.2 * (L - 1)) * (1 + G.bonus('prod') + G.bonus('prod_' + D.B[k].prod)) * (1 + E.passive()) * E.rush();
  };
  E.workerCost = (k) => ({ gold: Math.ceil(15 * Math.pow(1.45, G.S.b[k].w)) });
  E.hireWorker = function (k) {
    const b = G.S.b[k];
    if (b.w >= E.maxWorkers(k) || E.busy(k)) return;
    if (!E.pay(E.workerCost(k))) return;
    b.w++;
    G.SFX.play('coin');
    G.UI.dirty();
  };
  E.clampWorkers = function () {
    for (const k of D.PROD) G.S.b[k].w = Math.min(G.S.b[k].w, E.maxWorkers(k));
    G.S.b.forge.w = Math.min(G.S.b.forge.w, E.lvl('forge'));
  };

  E.pop = () => D.PROD.reduce((s, k) => s + G.S.b[k].w, 0) + G.S.b.forge.w + G.S.guards + G.S.advs.length;
  // Жители: жильё — 3 дома за уровень Замка и 1 дом за каждые 2 уровня остальных зданий.
  // Приходят по одному раз в 15 с (Гильдия и Рынок ускоряют), каждый платит налог.
  E.homes = () => {
    let lv = 0;
    for (const k of D.ORDER) if (k !== 'castle' && !D.B[k].noLevel) lv += E.lvl(k);
    return Math.floor(E.lvl('castle') * D.FOLK.perCastle + lv / D.FOLK.perLevels + G.bonus('housing'));
  };
  E.folk = () => Math.floor(G.S.folk || 0);
  E.folkEvery = () => D.FOLK.every / (1 + 0.1 * E.lvl('tavern') + 0.1 * E.lvl('arena'));
  E.folkTax = () => E.folk() * D.FOLK.tax;
  E.tickFolk = function (dt) {
    const S = G.S, cap = E.homes();
    if (S.folk > cap) S.folk = cap;
    if (S.folk >= cap) { S.folkT = 0; return; }
    S.folkT = (S.folkT || 0) + dt;
    const every = E.folkEvery();
    while (S.folkT >= every && S.folk < cap) { S.folkT -= every; S.folk++; }
  };
  E.tax = () => (E.lvl('castle') * 0.3 + 0.04 * E.pop() + E.folkTax()) * (1 + G.bonus('tax')) * (1 + E.passive() + E.convTax());

  E.rates = function () {
    const r = { gold: E.tax() };
    for (const k of D.PROD) {
      const b = G.S.b[k];
      if (b.lvl > 0 && b.w > 0 && !E.busy(k)) {
        const res = D.B[k].prod;
        r[res] = (r[res] || 0) + b.w * E.workerRate(k);
      }
    }
    return r;
  };

  // Торговый агент (талант): продаёт излишки, когда склад почти полон
  E.autoSell = function () {
    if (G.bonus('agent') <= 0) return; // Скупщик работает без Рынка
    for (const r of D.MAT) {
      if (!E.PRICE[r] || (G.S.res[r] || 0) < E.cap(r) * 0.95) continue;
      const n = Math.floor(E.cap(r) * 0.2);
      const g = Math.floor(n * E.sellPrice(r));
      if (n <= 0 || g < 1 || E.full('gold')) continue;
      G.S.res[r] -= n;
      E.add('gold', g);
      G.S.stats.autoSold = (G.S.stats.autoSold || 0) + g;
    }
  };

  E.tick = function (dt) {
    const r = E.rates();
    for (const k in r) E.add(k, r[k] * dt);
    E.tickFolk(dt);
    E.autoSell();
    E.tickCons(dt);
    E.tickDecree();
  };

  // ---------- королевская кирка ----------
  E.maxTools = () => E.lvl('castle') * 2;
  E.toolsCost = function () {
    const l = G.S.king.tools;
    const c = { gold: Math.ceil(40 * Math.pow(1.9, l)) };
    if (l >= 1) c.iron = Math.ceil(15 * Math.pow(1.8, l - 1));
    return c;
  };
  E.upgradeTools = function () {
    if (G.S.king.tools >= E.maxTools()) return;
    if (!E.pay(E.toolsCost())) return;
    G.S.king.tools++;
    G.log('logTools', { n: G.U.fmt1(E.power()) }, 'good');
    G.SFX.play('coin');
    G.UI.dirty();
  };

  // ---------- цена излишков (для «Скупщика»; Рынка больше нет) ----------
  E.PRICE = { wood: 0.4, stone: 0.4, iron: 0.6, bone: 2.5, crystal: 6, mithril: 12 };
  E.sellPrice = (r) => E.PRICE[r] * (1 + G.bonus('trade'));

  // ---------- цели ----------
  // Перенос прогресса: v1 — старые 30 целей (g0–g29), v2 — список из 90 целей, v3 — 119 целей, v4 — нынешний
  // (дракон — две последние цели)
  const fromOrder = (list, at) => {
    for (let i = at || 0; i < list.length; i++) { const k = D.GOALS.findIndex((g) => g.id === list[i]); if (k >= 0) return k; }
    return -1;
  };
  E.migrateGoals = function () {
    const S = G.S;
    if (S.goalV === 3) {
      const k = fromOrder(D.GOALS_V3, S.goal);
      S.goal = k < 0 ? D.GOALS.length : k;
      S.goalBase = null;
      S.goalV = 4;
      return;
    }
    if (S.goalV >= 4) return;
    const after = D.GOALS.findIndex((g) => g.id === 'g29') + 1; // всё пройдено
    if (!(S.goalV >= 2)) {
      const old = S.goal || 0;
      const idx = old >= 30 ? after : D.GOALS.findIndex((g) => g.id === 'g' + old);
      S.goal = Math.max(0, idx);
    } else {
      const idx = fromOrder(D.GOALS_V2, S.goal);
      S.goal = idx < 0 ? after : idx;
    }
    S.goalBase = null;
    S.goalV = 4;
  };
  // Дошёл ли игрок до цели id (она текущая или уже выполнена)
  E.goalAt = (id) => G.S.goal >= D.GOALS.findIndex((g) => g.id === id);
  // Цель с числом: v — значение, n — сколько нужно; d — считать только то, что сделано с момента, когда цель стала текущей
  E.goalProg = function (g) {
    if (!g || !g.v) return null;
    const S = G.S, v = g.v(S) || 0;
    if (g.d && S.goalBase == null) S.goalBase = v;
    const cur = g.d ? v - S.goalBase : v;
    return { cur: Math.max(0, Math.min(g.n, Math.floor(cur))), n: g.n };
  };
  E.goalDone = function (g) {
    const p = E.goalProg(g);
    return p ? p.cur >= p.n : g.test(G.S);
  };
  E.checkGoal = function () {
    const S = G.S;
    const g = D.GOALS[S.goal];
    if (!g || !E.goalDone(g)) return;
    E.addAll(g.reward);
    G.log('logGoal', { gi: g.t, loot: g.reward }, 'good');
    S.goal++;
    S.goalBase = null;
    E.goalProg(D.GOALS[S.goal]); // счёт новой цели начинается сейчас
    G.SFX.play('level');
    G.UI.dirty();
  };
})();
