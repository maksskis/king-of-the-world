(function () {
  const E = (G.E = {});
  const D = G.D;

  E.lvl = (k) => (G.S.b[k] ? G.S.b[k].lvl : 0);
  E.maxLevel = (k) => (k === 'castle' ? D.MAXLVL : Math.min(D.MAXLVL, E.lvl('castle') + 1));

  // ---------- склад ----------
  E.cap = function (r) {
    if (r === 'gold') return Infinity;
    const L = Math.max(1, E.lvl('warehouse'));
    return Math.floor(D.CAPS[L - 1] * (1 + G.bonus('store')));
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
  E.full = (r) => r !== 'gold' && (G.S.res[r] || 0) >= E.cap(r);

  // ---------- стройка ----------
  E.upCost = function (k) {
    const m = D.LVLMULT[Math.min(E.lvl(k), D.LVLMULT.length - 1)] * Math.max(0.6, 1 - G.bonus('buildC'));
    return G.U.scaleCost(D.B[k].base, m);
  };
  E.upTime = (k) => D.buildTime(E.lvl(k)) * Math.max(0.3, 1 - G.bonus('buildT'));
  E.builders = () => 1 + G.bonus('builders');
  E.consOf = (k) => G.S.cons.find((c) => c.k === k);
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

  // Король помогает строителям кликом
  E.boost = function (k) {
    const c = E.consOf(k);
    if (!c) return false;
    c.t -= 1;
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
    while (q.length && E.freeBuilder()) {
      const k = q[0];
      const why = E.whyNot(k);
      if (why === 'max' || why === 'noLevel') { q.shift(); G.UI.dirty(); continue; }
      if (why || !E.can(E.upCost(k))) break;
      E.startUpgrade(k);
      q.shift();
    }
  };
  E.decreeAdd = function (k) {
    if (G.S.decree.build.length >= 8) return;
    G.S.decree.build.push(k);
    G.UI.dirty();
  };

  // ---------- добыча ----------
  E.rush = () => ((G.S.king.buff.rush || 0) > 0 ? 2 : 1);
  E.power = () => (1 + G.S.king.tools) * (1 + G.bonus('gather')) * E.rush();
  E.clickAmount = function (k) {
    const L = E.lvl(k);
    if (k === 'castle') return E.power() * (1 + 0.5 * (L - 1));
    return E.power() * (1 + 0.2 * (L - 1));
  };
  E.gather = function (k) {
    const d = D.B[k];
    if (!d.click || E.lvl(k) < 1) return 0;
    const n = E.add(d.click, E.clickAmount(k));
    G.S.stats.clicks++;
    G.K.xp(0.3);
    return n;
  };

  E.maxWorkers = (k) => D.WORKERS[E.lvl(k)] || 0;
  E.workerRate = function (k) {
    const L = Math.max(1, E.lvl(k));
    return 0.25 * (1 + 0.2 * (L - 1)) * (1 + G.bonus('prod') + G.bonus('prod_' + D.B[k].prod)) * E.rush();
  };
  E.workerCost = (k) => ({ gold: Math.ceil(15 * Math.pow(1.45, G.S.b[k].w)) });
  E.hireWorker = function (k) {
    const b = G.S.b[k];
    if (b.w >= E.maxWorkers(k)) return;
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
  E.tax = () => (E.lvl('castle') * 0.3 + 0.04 * E.pop()) * (1 + G.bonus('tax'));

  E.rates = function () {
    const r = { gold: E.tax() };
    for (const k of D.PROD) {
      const b = G.S.b[k];
      if (b.lvl > 0 && b.w > 0) {
        const res = D.B[k].prod;
        r[res] = (r[res] || 0) + b.w * E.workerRate(k);
      }
    }
    return r;
  };

  E.tick = function (dt) {
    const r = E.rates();
    for (const k in r) E.add(k, r[k] * dt);
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

  // ---------- рынок ----------
  E.PRICE = { wood: 0.08, stone: 0.08, iron: 0.15, bone: 1, crystal: 3, mithril: 6 };
  E.BUY_LVL = { wood: 1, stone: 1, iron: 2, bone: 3, crystal: 4, mithril: 5 };
  E.batch = (r) => (E.PRICE[r] < 1 ? 100 : 10);
  E.sellPrice = (r) => E.PRICE[r] * (1 + 0.1 * (E.lvl('market') - 1)) * (1 + G.bonus('trade'));
  E.buyPrice = (r) => (E.PRICE[r] * 3.5 * (1 - 0.04 * (E.lvl('market') - 1))) / (1 + G.bonus('trade'));
  E.canBuy = (r) => E.lvl('market') >= E.BUY_LVL[r];
  E.sell = function (r, n) {
    if (E.lvl('market') < 1) return;
    n = Math.min(Math.floor(n), Math.floor(G.S.res[r] || 0));
    const g = Math.floor(n * E.sellPrice(r));
    if (n <= 0 || g < 1) return;
    G.S.res[r] -= n;
    E.add('gold', g);
    G.log('logSellRes', { n, r: { k: 'res_' + r }, g }, 'info');
    G.SFX.play('coin');
  };
  E.buy = function (r, n) {
    if (!E.canBuy(r)) return;
    n = Math.min(Math.floor(n), Math.floor(E.cap(r) - (G.S.res[r] || 0)));
    const g = Math.ceil(n * E.buyPrice(r));
    if (n <= 0 || !E.pay({ gold: g })) return;
    E.add(r, n);
    G.log('logBuyRes', { n, r: { k: 'res_' + r }, g }, 'info');
    G.SFX.play('coin');
  };

  // ---------- цели ----------
  E.checkGoal = function () {
    const S = G.S;
    const g = D.GOALS[S.goal];
    if (!g || !g.test(S)) return;
    E.addAll(g.reward);
    G.log('logGoal', { gi: S.goal, loot: g.reward }, 'good');
    S.goal++;
    G.SFX.play('level');
    G.UI.dirty();
  };
})();
