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
  // Сколько редких ресурсов добыто (для целей «Собери 500 костей» и т. п.); награды целей и возвраты не считаются
  const EARN = { bone: 1, crystal: 1, mithril: 1, adamant: 1 };
  let quiet = false;
  E.add = function (r, n) {
    if (n <= 0) return 0;
    const before = G.S.res[r] || 0;
    const after = Math.min(E.cap(r), before + n);
    G.S.res[r] = Math.max(before, after);
    G.S.seen[r] = true;
    const got = G.S.res[r] - before;
    if (got > 0 && EARN[r] && !quiet) G.S.stats['e_' + r] = (G.S.stats['e_' + r] || 0) + got;
    return got;
  };
  E.addAll = function (obj) {
    for (const r in obj) if (obj[r] > 0) E.add(r, obj[r]);
  };
  // Возврат ресурсов (отмена стройки, ковки, исследования): не идёт в счёт «добыто»
  E.refund = function (obj) {
    quiet = true;
    try { E.addAll(obj); } finally { quiet = false; }
  };
  // Награда цели — целиком, даже сверх вместимости склада (иначе на полном складе она сгорала бы);
  // излишек тратится как обычно, добыча этого ресурса ждёт, пока запас не опустится ниже вместимости
  E.grant = function (obj) {
    for (const r in obj) if (obj[r] > 0) { G.S.res[r] = (G.S.res[r] || 0) + obj[r]; G.S.seen[r] = true; }
  };
  E.full = (r) => (G.S.res[r] || 0) >= E.cap(r);

  // ---------- стройка ----------
  // Цена и время перехода с уровня L на L+1 (нужно и для очереди указов)
  E.costAt = (k, L) => G.U.scaleCost(D.B[k].base, D.LVLMULT[Math.min(L, D.LVLMULT.length - 1)] * Math.max(0.5, 1 - G.bonus('buildC'))); // «Бережливость» и «Бережливость рода» — не больше −50%
  // ускорение стройки делит время (а не вычитает проценты) — сколько ни складывай, время не станет нулём
  E.timeAt = (k, L) => D.buildTime(L) / (1 + G.bonus('buildT')) / G.K.haste();
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
    E.refund(c.cost);
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
    G.K.handXp(D.KXP.help); // опыт Короля за помощь стройке
    return true;
  };

  function complete(c) {
    const k = c.k;
    G.S.b[k].lvl++;
    const L = G.S.b[k].lvl;
    G.log(L === 1 ? 'logBuilt' : 'logUpgraded', { b: { k: 'bn_' + k }, l: L }, 'good');
    G.K.xp(D.KXP.build * L * L); // опыт Короля за постройку
    if (L >= D.MAXLVL) G.K.checkMaxBuildings(); // +1 очко наследия за здание 8-го уровня
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
    G.S.stats['d_' + k] = (G.S.stats['d_' + k] || 0) + 1; // для цели «Добавь в указ улучшение Замка»
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
      amount += sec * ((k === 'castle' ? E.tax() : 0) + (b.w || 0) * E.workerRate(k)); // налоги и добыча рабочих этого здания
    }
    const n = E.add(d.click, amount);
    G.S.stats.clicks++;
    G.S.stats['c_' + k] = (G.S.stats['c_' + k] || 0) + 1; // кликов по этому зданию — для целей
    G.S.stats['g_' + d.click] = (G.S.stats['g_' + d.click] || 0) + n; // собрано кликами — для целей
    G.K.handXp(D.KXP.click); // опыт Короля за добычу
    return n;
  };

  // ---------- рабочие (итерация 59) ----------
  // Рабочие — часть жителей: каждый 2–4-й пришедший житель становится рабочим (G.S.wk — всего, G.S.b[k].w — на здании).
  // Ставятся бесплатно, до 3 на здание; места открываются с 1, 4 и 7-го уровня (Катакомбы — по уровню Замка).
  E.WK = D.WORK.b;
  E.workable = (k) => E.WK.includes(k);
  E.wkLvl = (k) => (k === 'dungeon' ? E.lvl('castle') : E.lvl(k));
  E.wkSlots = (k) => (E.workable(k) ? D.WORK.slotLvl.filter((l) => E.wkLvl(k) >= l).length : 0);
  E.wkNextSlot = (k) => D.WORK.slotLvl.find((l) => E.wkLvl(k) < l) || 0;
  E.wkTotal = () => G.S.wk || 0;
  E.wkUsed = () => E.WK.reduce((s, k) => s + (G.S.b[k] ? G.S.b[k].w || 0 : 0), 0);
  E.wkFree = () => Math.max(0, E.wkTotal() - E.wkUsed());
  // Скорость рабочих: таланты, исследования, навыки рода и «Время королей»
  E.wkSpeed = () => (1 + G.bonus('wSpeed')) * G.K.haste();
  E.wkHit = () => D.WORK.hit / E.wkSpeed(); // секунд между ударами
  // Работает ли рабочий сейчас: здание построено, не на перестройке; на добыче — склад не полон
  E.wkActive = (k) => (k === 'dungeon' ? G.E.lvl('tavern') > 0 : E.usable(k)) && !(D.B[k].click && E.full(D.B[k].click));
  // Добыча одного рабочего в секунду: удар силы pow[уровень] × (1 + 0,2 за уровень), раз в hit секунд
  E.workerRate = function (k) {
    const L = Math.max(1, E.lvl(k)), d = D.B[k];
    const mul = k === 'castle' ? 1 + G.bonus('tax') : 1 + G.bonus('prod') + G.bonus('prod_' + d.prod);
    return (D.WORK.pow[L] * (1 + 0.2 * (L - 1)) / E.wkHit()) * mul * (1 + E.passive()) * E.rush();
  };
  // Ускорение дела здания рабочими: Академия, Кузница, Арена, Гильдия, Катакомбы — +50% за рабочего
  E.wkBoost = (k) => { const w = (G.S.b[k] && G.S.b[k].w) || 0; return w > 0 && E.wkActive(k) ? 1 + D.WORK.boost * w * E.wkSpeed() : 1; };
  E.assignWorker = function (k) {
    const b = G.S.b[k];
    if (!b || !E.workable(k) || E.wkFree() <= 0 || (b.w || 0) >= E.wkSlots(k)) return false;
    b.w = (b.w || 0) + 1;
    G.SFX.play('click');
    G.UI.dirty(); G.UI.slotsDirty = true;
    return true;
  };
  E.unassignWorker = function (k) {
    const b = G.S.b[k];
    if (!b || !(b.w > 0)) return false;
    b.w--;
    G.UI.dirty(); G.UI.slotsDirty = true;
    return true;
  };
  // Места и число рабочих после потерь (прорыв ворот, разрушенное здание): лишние снимаются с конца списка
  E.clampWorkers = function () {
    const S = G.S;
    for (const k in S.b) if (!E.workable(k)) S.b[k].w = 0; else S.b[k].w = Math.max(0, Math.min(S.b[k].w || 0, E.wkSlots(k)));
    S.wk = Math.min(S.wk || 0, E.folk());
    let over = E.wkUsed() - E.wkTotal();
    for (let i = E.WK.length - 1; i >= 0 && over > 0; i--) { const b = S.b[E.WK[i]]; const n = Math.min(b.w, over); b.w -= n; over -= n; }
    G.UI.slotsDirty = true;
  };
  // Житель пришёл: каждый 2–4-й — рабочий (самый первый житель эпохи — сразу рабочий)
  function folkArrived() {
    const S = G.S;
    S.wkN = (S.wkN == null ? 1 : S.wkN) - 1;
    if (S.wkN <= 0) {
      S.wk = (S.wk || 0) + 1;
      S.wkN = G.U.randInt(D.WORK.every[0], D.WORK.every[1]);
      G.log('logWorker', { n: S.wk }, 'good');
      G.UI.slotsDirty = true;
    }
  }
  // Сохранения до итерации 59: нанятые рабочие и кузнецы → рабочие из жителей
  E.migrateWorkers = function () {
    const S = G.S;
    if (S.wkV >= 1) return;
    S.wkV = 1;
    const f = E.folk();
    S.wk = f > 0 ? 1 + Math.floor((f - 1) / 3) : 0;
    S.wkN = f > 0 ? G.U.randInt(D.WORK.every[0], D.WORK.every[1]) : 1;
    const old = {};
    for (const k in S.b) { old[k] = S.b[k].w || 0; S.b[k].w = 0; }
    // больше всего прежних рабочих — первыми получают новых
    const order = ['lumber', 'quarry', 'mine', 'forge'].filter((k) => old[k] > 0).sort((a, b) => old[b] - old[a]);
    let left = S.wk;
    for (let round = 0; round < 3 && left > 0; round++) {
      for (const k of order) if (left > 0 && S.b[k].w < Math.min(E.wkSlots(k), old[k])) { S.b[k].w++; left--; }
    }
  };

  E.pop = () => E.wkUsed() + G.S.guards + G.S.advs.length; // население для налога: рабочие на местах, стража, герои
  // Жители: жильё — 5 домов за уровень Замка и 1 дом за каждые 2 уровня остальных зданий.
  // Приходят по одному раз в 15 с (Гильдия и Арена ускоряют), каждый платит налог; каждый 2–4-й — рабочий.
  E.homes = () => {
    let lv = 0;
    for (const k of D.ORDER) if (k !== 'castle' && !D.B[k].noLevel) lv += E.lvl(k);
    return Math.floor(E.lvl('castle') * D.FOLK.perCastle + lv / D.FOLK.perLevels + G.bonus('housing'));
  };
  E.folk = () => Math.floor(G.S.folk || 0);
  E.folkEvery = () => D.FOLK.every / (1 + 0.1 * E.lvl('tavern') + 0.1 * E.lvl('arena')) / G.K.haste();
  E.folkTax = () => E.folk() * D.FOLK.tax;
  E.tickFolk = function (dt) {
    const S = G.S, cap = E.homes();
    if (S.folk > cap) { S.folk = cap; if ((S.wk || 0) > S.folk) E.clampWorkers(); }
    if (S.folk >= cap) { S.folkT = 0; return; }
    S.folkT = (S.folkT || 0) + dt;
    const every = E.folkEvery();
    while (S.folkT >= every && S.folk < cap) { S.folkT -= every; S.folk++; folkArrived(); }
  };
  E.tax = () => (E.lvl('castle') * 0.3 + 0.04 * E.pop() + E.folkTax()) * (1 + G.bonus('tax')) * (1 + E.passive() + E.convTax());

  E.rates = function () {
    const r = { gold: E.tax() };
    for (const k of ['castle', ...D.PROD]) {
      const b = G.S.b[k];
      if (b.lvl > 0 && b.w > 0 && !E.busy(k)) {
        const res = D.B[k].click;
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
  E.PRICE = { wood: 0.4, stone: 0.4, iron: 0.6, bone: 2.5, crystal: 6, mithril: 12, adamant: 40 };
  E.sellPrice = (r) => E.PRICE[r] * (1 + G.bonus('trade'));

  // ---------- цели ----------
  // Перенос прогресса: v1 — старые 30 целей (g0–g29), v2 — 90 целей, v3 — 119, v4 — 114, v5–v6 — 115, v7 — нынешние 100
  // (дракон — две последние цели)
  // убранные цели, у которых есть прямая замена: Шахта 5 → Катакомбы 20, Шахта до конца → 50, 30-й этаж → 75
  const ALIAS = { n44: 'c20', n58: 'c50', m35: 'c75' };
  const fromOrder = (list, at) => {
    for (let i = at || 0; i < list.length; i++) { const id = ALIAS[list[i]] || list[i]; const k = D.GOALS.findIndex((g) => g.id === id); if (k >= 0) return k; }
    return -1;
  };
  E.migrateGoals = function () {
    const S = G.S, v6 = S.goalV === 6 && !!S.gq;
    migrateOld();
    if (!S.gq) {
      const Q = E.gq();
      for (let i = 0; i < Math.min(S.goal || 0, D.GOALS.length); i++) Q.done[D.GOALS[i].id] = 1;
    } else if (v6) fromV6();
    S.goalV = 7;
  };
  // v6 (115 целей) → v7 (100 целей, итерация 58): новые цели, оказавшиеся позади уже сданных, отмечаются сданными
  // (без награды — игрок их перерос); убранные принятые цели снимаются; у принятых с поднятым порогом
  // отметка «выполнено» снимается, если новый порог ещё не взят
  function fromV6() {
    const Q = E.gq(), old = new Set(D.GOALS_V6);
    let last = -1;
    D.GOALS.forEach((g, i) => { if (old.has(g.id) && Q.done[g.id]) last = i; });
    D.GOALS.forEach((g, i) => { if (!old.has(g.id) && i < last) Q.done[g.id] = 1; });
    for (const id in Q.acc) {
      const g = E.goalById(id);
      if (!g || Q.done[id]) delete Q.acc[id];
      else if (Q.acc[id].r && !E.goalMet(g)) Q.acc[id].r = 0;
    }
  }
  function migrateOld() {
    const S = G.S;
    // v3 и v4 — переносим по порядку той версии (v4 → v5: цели Шахты и Логова заменены целями Катакомб)
    if (S.goalV === 3 || S.goalV === 4) {
      const k = fromOrder(S.goalV === 3 ? D.GOALS_V3 : D.GOALS_V4, S.goal);
      S.goal = k < 0 ? D.GOALS.length : k;
      S.goalBase = null;
      S.goalV = 5;
      return;
    }
    if (S.goalV >= 5 || S.gq) return;
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
    S.goalV = 5;
  }
  // ---------- задания (цели) ----------
  // Видны 3 первых несданных задания. Задание нужно принять — с этого момента идёт прогресс (для заданий «сделай ещё N»
  // счёт начинается с принятия). Выполненное задание остаётся выполненным, пока его не сдадут; при сдаче — награда.
  // G.S.gq = { done: {id: 1} — сданные, acc: {id: {b: значение при принятии, r: 1 — выполнено}} }
  E.GQ_SHOWN = 3;
  E.gq = function () {
    const S = G.S;
    if (!S.gq) S.gq = { done: {}, acc: {} };
    return S.gq;
  };
  E.goalById = (id) => D.GOALS.find((g) => g.id === id) || null;
  E.goalsVisible = function () {
    const Q = E.gq(), out = [];
    for (const g of D.GOALS) { if (!Q.done[g.id]) { out.push(g); if (out.length >= E.GQ_SHOWN) break; } }
    return out;
  };
  E.goalsDoneCount = function () { const Q = E.gq(); return D.GOALS.filter((g) => Q.done[g.id]).length; };
  E.goalAcc = (g) => (g ? E.gq().acc[g.id] || null : null);
  // Прогресс задания с числом; у «сделай ещё N» до принятия — 0
  E.goalProg = function (g) {
    if (!g || !g.v) return null;
    const A = E.goalAcc(g), v = g.v(G.S) || 0;
    const cur = g.d ? (A ? v - A.b : 0) : v;
    return { cur: Math.max(0, Math.min(g.n, Math.floor(cur))), n: g.n };
  };
  E.goalMet = function (g) {
    const p = E.goalProg(g);
    return p ? p.cur >= p.n : g.test(G.S);
  };
  E.goalReady = (g) => { const A = E.goalAcc(g); return !!(A && A.r); };
  E.acceptGoal = function (id) {
    const g = E.goalById(id), Q = E.gq();
    if (!g || Q.done[id] || Q.acc[id] || !E.goalsVisible().includes(g)) return false;
    Q.acc[id] = { b: g.v ? g.v(G.S) || 0 : 0, r: 0 };
    G.SFX.play('click');
    E.checkGoal();
    G.UI.dirty();
    return true;
  };
  E.claimGoal = function (id) {
    const g = E.goalById(id), Q = E.gq(), A = Q.acc[id];
    if (!g || !A || !A.r) return false;
    E.grant(g.reward);
    Q.done[id] = 1;
    delete Q.acc[id];
    G.log('logGoal', { gi: g.t, loot: g.reward }, 'good');
    G.SFX.play('level');
    G.UI.dirty();
    return true;
  };
  // Каждый такт: принятые задания, которые выполнены, отмечаются готовыми к сдаче
  E.checkGoal = function () {
    for (const g of E.goalsVisible()) {
      const A = E.goalAcc(g);
      if (!A || A.r || !E.goalMet(g)) continue;
      A.r = 1;
      G.log('logGoalReady', { gi: g.t }, 'good');
      G.SFX.play('coin');
      G.UI.dirty();
    }
  };
  // Задание, которое подсвечивается на карте и в окнах: выбранное игроком или первое принятое невыполненное
  E.goalFocus = function (pref) {
    const vis = E.goalsVisible();
    const g = pref && vis.find((x) => x.id === pref);
    if (g && !E.goalReady(g)) return g;
    return vis.find((x) => E.goalAcc(x) && !E.goalReady(x)) || null;
  };
})();
