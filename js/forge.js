(function () {
  const F = (G.F = {});
  const lvl = () => G.E.lvl('forge');

  F.speed = () => (1 + 0.15 * (lvl() - 1)) * (1 + 0.25 * G.S.b.forge.w);
  F.qMax = () => 1 + Math.floor(lvl() / 2);
  F.maxSmiths = () => lvl();
  F.smithCost = function () {
    const n = G.S.b.forge.w;
    return { gold: Math.ceil(50 * Math.pow(1.5, n)), iron: Math.ceil(10 * Math.pow(1.4, n)) };
  };
  F.hireSmith = function () {
    if (G.S.b.forge.w >= F.maxSmiths()) return;
    if (!G.E.pay(F.smithCost())) return;
    G.S.b.forge.w++;
    G.UI.dirty();
  };

  F.cost = (type, ti) => (type === 'armor' ? G.D.TIERS[ti].acost : G.D.TIERS[ti].wcost);
  F.unlocked = (ti) => lvl() >= G.D.TIERS[ti].req;

  F.craft = function (type, ti) {
    if (lvl() < 1 || !F.unlocked(ti)) return;
    if (G.S.forge.q.length >= F.qMax()) return;
    if (!G.E.pay(F.cost(type, ti))) return;
    const t = G.D.TIERS[ti].time;
    G.S.forge.q.push({ type, ti, t, total: t });
    G.UI.dirty();
  };

  // Чем выше уровень кузницы и больше кузнецов, тем сильнее смещение к редким вещам
  F.rarWeights = function () {
    const k = 0.12 * (lvl() - 1) + 0.04 * G.S.b.forge.w;
    return G.D.IRAR.map((r, i) => r.w * Math.pow(1 + k, i));
  };
  F.rarChances = function () {
    const w = F.rarWeights();
    const s = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / s);
  };

  F.tick = function (dt) {
    const q = G.S.forge.q;
    if (!q.length || lvl() < 1) return;
    q[0].t -= dt * F.speed();
    while (q.length && q[0].t <= 0) {
      const over = -q[0].t;
      const job = q.shift();
      F.finish(job);
      if (q.length) q[0].t -= over;
    }
  };

  // Клик по кузнице на карте
  F.boost = function () {
    const q = G.S.forge.q;
    if (!q.length) return false;
    q[0].t -= 0.4 * F.speed();
    F.tick(0);
    return true;
  };

  F.finish = function (job) {
    const it = F.make(job.type, job.ti, G.U.weighted(F.rarWeights()));
    G.S.items.push(it);
    G.S.stats.crafted++;
    G.log('logCrafted', { item: F.nameObj(it) }, it.rar >= 3 ? 'epic' : 'good');
    G.UI.dirty();
  };

  F.make = function (type, ti, rar) {
    const T = G.D.TIERS[ti], R = G.D.IRAR[rar], ty = G.D.ITYPES[type];
    const it = { id: G.U.uid(), type, ti, rar, atk: 0, def: 0, hp: 0, aff: [], epi: -1, eq: null };
    const roll = () => G.U.rand(0.92, 1.08);
    if (ty.slot === 'weapon') it.atk = Math.max(1, Math.round(T.atk * R.mult * ty.mod * roll()));
    else {
      it.def = Math.max(1, Math.round(T.def * R.mult * roll()));
      it.hp = Math.max(1, Math.round(T.hp * R.mult * roll()));
    }
    for (let i = 0; i < R.aff; i++) {
      const k = G.U.pick(['atk', 'def', 'hp']);
      let v;
      if (k === 'atk') v = Math.max(1, Math.round(T.atk * G.U.rand(0.2, 0.45)));
      else if (k === 'def') v = Math.max(1, Math.round(T.def * G.U.rand(0.25, 0.5)));
      else v = Math.max(2, Math.round(T.hp * G.U.rand(0.3, 0.6)));
      it[k] += v;
      it.aff.push({ k, v });
    }
    if (rar === 4) it.epi = G.U.randInt(0, G.D.EPITHETS.length - 1);
    return it;
  };

  F.nameObj = function (it) {
    const ty = G.D.ITYPES[it.type], T = G.D.TIERS[it.ti], R = G.D.IRAR[it.rar];
    const g = ty.g;
    let ru = (R.adj[g] ? R.adj[g] + ' ' + T.adj[g] : cap(T.adj[g])) + ' ' + ty.name.ru.toLowerCase();
    let en = (R.adj.en ? R.adj.en + ' ' : '') + T.adj.en + ' ' + ty.name.en;
    if (it.epi >= 0) {
      ru += ' ' + G.D.EPITHETS[it.epi][0];
      en += ' ' + G.D.EPITHETS[it.epi][1];
    }
    return { ru, en };
  };
  F.name = (it) => G.tn(F.nameObj(it));
  F.jobName = (j) => {
    const ty = G.D.ITYPES[j.type], T = G.D.TIERS[j.ti];
    return { ru: cap(T.adj[ty.g]) + ' ' + ty.name.ru.toLowerCase(), en: T.adj.en + ' ' + ty.name.en };
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  F.slotOf = (it) => G.D.ITYPES[it.type].slot;
  F.score = (it) => it.atk * 3 + it.def * 2 + it.hp * 0.5;
  F.sellValue = (it) => Math.round((it.ti + 1) * (it.ti + 1) * 10 * G.D.IRAR[it.rar].mult);
  F.get = (id) => G.S.items.find((i) => i.id === id);

  F.canUse = function (it, owner) {
    const ty = G.D.ITYPES[it.type];
    if (owner === 'king') return ty.slot === 'weapon';
    const a = G.T.get(owner);
    if (!a) return false;
    return ty.slot === 'armor' || ty.cls === a.cls;
  };
  F.equipped = (owner, slot) => G.S.items.find((i) => i.eq === owner && F.slotOf(i) === slot) || null;

  F.equip = function (id, owner) {
    const it = F.get(id);
    if (!it || !F.canUse(it, owner)) return;
    const a = owner === 'king' ? null : G.T.get(owner);
    if (a && a.st === 'dungeon') return;
    const holder = it.eq && it.eq !== 'king' ? G.T.get(it.eq) : null;
    if (holder && holder.st === 'dungeon') return;
    // Сохраняем долю здоровья при смене брони
    const before = a ? G.T.stats(a).hp : 0;
    const hb = holder ? G.T.stats(holder).hp : 0;
    const cur = F.equipped(owner, F.slotOf(it));
    if (cur) cur.eq = null;
    it.eq = owner;
    if (a) a.hp = Math.min(G.T.stats(a).hp, a.hp * (G.T.stats(a).hp / Math.max(1, before)));
    if (holder) holder.hp = Math.min(G.T.stats(holder).hp, holder.hp * (G.T.stats(holder).hp / Math.max(1, hb)));
  };

  F.unequip = function (id) {
    const it = F.get(id);
    if (!it) return;
    const a = it.eq && it.eq !== 'king' ? G.T.get(it.eq) : null;
    if (a && a.st === 'dungeon') return;
    it.eq = null;
    if (a) a.hp = Math.min(a.hp, G.T.stats(a).hp);
  };

  F.sell = function (id) {
    const it = F.get(id);
    if (!it || it.eq) return;
    const v = F.sellValue(it);
    G.S.items = G.S.items.filter((i) => i !== it);
    G.E.add('gold', v);
    G.log('logSold', { item: F.nameObj(it), g: v }, 'info');
    G.UI.dirty();
  };

  // Продать все свободные обычные и добротные вещи
  F.junk = () => G.S.items.filter((i) => !i.eq && i.rar <= 1);
  F.sellJunk = function () {
    const list = F.junk();
    if (!list.length) return;
    let v = 0;
    for (const it of list) v += F.sellValue(it);
    G.S.items = G.S.items.filter((i) => !list.includes(i));
    G.E.add('gold', v);
    G.log('logSoldMany', { n: list.length, g: v }, 'info');
    G.UI.dirty();
  };
})();
