(function () {
  const E = (G.E = {});
  const PROD = ['lumber', 'quarry', 'mine'];

  E.lvl = (k) => (G.S.b[k] ? G.S.b[k].lvl : 0);
  E.maxLevel = (k) => (k === 'castle' ? G.D.B.castle.max : Math.min(G.D.MAXLVL, E.lvl('castle') + 2));
  E.upCost = (k) => G.U.scaleCost(G.D.B[k].base, Math.pow(G.D.B[k].mult, E.lvl(k)));

  E.can = function (cost) {
    for (const r in cost) if ((G.S.res[r] || 0) < cost[r]) return false;
    return true;
  };
  E.pay = function (cost) {
    if (!E.can(cost)) return false;
    for (const r in cost) G.S.res[r] -= cost[r];
    return true;
  };
  E.add = function (r, n) {
    G.S.res[r] = (G.S.res[r] || 0) + n;
    if (n > 0) G.S.seen[r] = true;
  };
  E.addAll = function (obj) {
    for (const r in obj) if (obj[r] > 0) E.add(r, obj[r]);
  };

  E.upgrade = function (k) {
    const d = G.D.B[k];
    if (d.noLevel) return;
    const L = E.lvl(k);
    if (L >= E.maxLevel(k)) return;
    if (!E.pay(E.upCost(k))) return;
    G.S.b[k].lvl = L + 1;
    G.log(L === 0 ? 'logBuilt' : 'logUpgraded', { b: d.name, l: L + 1 }, 'good');
    if (k === 'tavern' && L === 0) G.T.refresh(true);
    G.UI.dirty();
    G.UI.slotsDirty = true;
  };

  // Сила клика короля при добыче
  E.power = () => 1 + G.S.king.tools;
  E.clickAmount = function (k) {
    const L = E.lvl(k);
    if (k === 'castle') return E.power() * (1 + 0.5 * (L - 1));
    return E.power() * (1 + 0.2 * (L - 1));
  };
  E.gather = function (k) {
    const d = G.D.B[k];
    if (!d.click || E.lvl(k) < 1) return 0;
    const n = E.clickAmount(k);
    E.add(d.click, n);
    G.S.stats.clicks++;
    return n;
  };

  E.maxWorkers = (k) => (E.lvl(k) > 0 ? E.lvl(k) * 2 + 1 : 0);
  E.workerRate = (k) => 0.3 * (1 + 0.25 * (E.lvl(k) - 1));
  E.workerCost = (k) => ({ gold: Math.ceil(12 * Math.pow(1.3, G.S.b[k].w)) });
  E.hireWorker = function (k) {
    const b = G.S.b[k];
    if (b.w >= E.maxWorkers(k)) return;
    if (!E.pay(E.workerCost(k))) return;
    b.w++;
    G.UI.dirty();
  };
  // После разрушения здания лишние работники уходят
  E.clampWorkers = function () {
    for (const k of PROD) G.S.b[k].w = Math.min(G.S.b[k].w, E.maxWorkers(k));
    G.S.b.forge.w = Math.min(G.S.b.forge.w, E.lvl('forge'));
  };

  E.pop = () => PROD.reduce((s, k) => s + G.S.b[k].w, 0) + G.S.b.forge.w + G.S.guards + G.S.advs.length;
  E.tax = () => E.lvl('castle') * 0.4 + 0.05 * E.pop();

  // Королевский рынок: излишки материалов превращаются в золото
  E.PRICE = { wood: 0.1, stone: 0.1, iron: 0.2, bone: 1.5, crystal: 4, mithril: 8 };
  E.sellAmount = (r) => Math.floor((G.S.res[r] || 0) / 2);
  E.sellGold = (r) => Math.floor(E.sellAmount(r) * E.PRICE[r]);
  E.sellRes = function (r) {
    const n = E.sellAmount(r), g = E.sellGold(r);
    if (!E.PRICE[r] || g < 1) return;
    G.S.res[r] -= n;
    E.add('gold', g);
    G.log('logTrade', { n, r: G.D.RES_NAME[r], g }, 'info');
  };

  E.rates = function () {
    const r = { gold: E.tax() };
    for (const k of PROD) {
      const b = G.S.b[k];
      if (b.lvl > 0 && b.w > 0) {
        const res = G.D.B[k].prod;
        r[res] = (r[res] || 0) + b.w * E.workerRate(k);
      }
    }
    return r;
  };

  E.tick = function (dt) {
    const r = E.rates();
    for (const k in r) E.add(k, r[k] * dt);
  };

  E.maxTools = () => E.lvl('castle') * 3;
  E.toolsCost = function () {
    const l = G.S.king.tools;
    const c = { gold: Math.ceil(25 * Math.pow(1.7, l)) };
    if (l >= 1) c.iron = Math.ceil(8 * Math.pow(1.6, l - 1));
    return c;
  };
  E.upgradeTools = function () {
    if (G.S.king.tools >= E.maxTools()) return;
    if (!E.pay(E.toolsCost())) return;
    G.S.king.tools++;
    G.log('logTools', { n: E.power() }, 'good');
    G.UI.dirty();
  };

  // Цели-подсказки
  E.checkGoal = function () {
    const S = G.S;
    const g = G.D.GOALS[S.goal];
    if (!g || !g.test(S)) return;
    E.addAll(g.reward);
    G.log('logGoal', { gi: S.goal, loot: g.reward }, 'good');
    S.goal++;
    G.UI.dirty();
  };
})();
