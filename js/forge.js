(function () {
  const F = (G.F = {});
  const D = G.D;
  const lvl = () => G.E.lvl('forge');

  // Скорость ковки: уровень Кузницы (+12% и +25% за уровень — бывшие кузнецы встроены в уровень), «Ковка рода», «Время королей»
  F.speed = () => (1 + 0.12 * (lvl() - 1)) * (1 + 0.25 * lvl()) * (1 + G.bonus('craft')) * G.K.haste();
  F.qMax = () => Math.max(1, lvl()) + G.bonus('forgeQ'); // 1 ур. — 1 вещь, 2 ур. — 2 и т. д.

  F.cost = (type, ti) => G.U.scaleCost(type === 'armor' ? D.TIERS[ti].acost : D.TIERS[ti].wcost, Math.max(0.4, 1 - G.bonus('forgeC')));
  F.unlocked = (ti) => lvl() >= D.TIERS[ti].req;
  F.rarOpen = (i) => lvl() >= D.IRAR[i].forge;

  F.craft = function (type, ti) {
    if (!G.E.usable('forge') || !F.unlocked(ti) || G.S.forge.q.length >= F.qMax()) return;
    const cost = F.cost(type, ti);
    if (!G.E.pay(cost)) return;
    const t = D.TIERS[ti].time;
    G.S.forge.q.push({ type, ti, t, total: t, cost });
    G.SFX.play('click');
    G.UI.dirty();
  };

  // Отмена ковки: ресурсы возвращаются полностью
  F.cancel = function (i) {
    const j = G.S.forge.q[i];
    if (!j) return;
    G.S.forge.q.splice(i, 1);
    G.E.refund(j.cost || F.cost(j.type, j.ti));
    G.log('logCraftCancel', { item: F.jobName(j) }, 'info');
    G.UI.dirty();
  };

  // Редкости открываются уровнями кузницы; удача сдвигает шансы к редким
  // Веса редкостей: обычная–эпическая сдвигаются удачей, легендарная получает ровно свой шанс legP
  F.weightsFor = function (k, legP, open) {
    const m = 1 + Math.min(D.LEG.kMax, Math.max(0, k)) / 2;
    const w = D.IRAR.map((r, i) => (i < 4 && (!open || open(i)) ? r.w * Math.pow(m, i) : 0));
    const s = w.reduce((a, b) => a + b, 0);
    w[4] = legP > 0 ? (s * legP) / (1 - legP) : 0;
    return w;
  };
  F.luckK = () => 0.12 * (lvl() - 1) + 0.04 * lvl() + G.bonus('luck') + G.bonus('forgeLuck'); // Придворный маг — удача кузницы
  F.legChance = () => (F.rarOpen(4) ? D.LEG.p : 0);
  F.rarWeights = () => F.weightsFor(F.luckK(), F.legChance(), F.rarOpen);
  F.rarChances = function () {
    const w = F.rarWeights();
    const s = w.reduce((a, b) => a + b, 0) || 1;
    return w.map((x) => x / s);
  };

  F.tick = function (dt) {
    const q = G.S.forge.q;
    if (!q.length || !G.E.usable('forge')) return;
    q[0].t -= dt * F.speed() * G.E.wkBoost('forge'); // рабочие на Кузнице
    while (q.length && q[0].t <= 0) {
      const over = -q[0].t;
      const job = q.shift();
      F.finish(job);
      if (q.length) q[0].t -= over;
    }
  };
  // Удар молотом: сколько секунд ковки сокращает один клик («Подмастерья кузнеца», «Молот короля»)
  F.boostSec = () => 0.5 * (1 + G.bonus('forgeBoost')) * G.K.foreman();
  F.boost = function () {
    const q = G.S.forge.q;
    if (!q.length || !G.E.usable('forge')) return false;
    q[0].t -= F.boostSec() * F.speed();
    F.tick(0);
    G.K.handXp(D.KXP.help);
    return true;
  };

  F.finish = function (job) {
    const it = F.make(job.type, job.ti, G.U.weighted(F.rarWeights()));
    G.S.items.push(it);
    G.S.stats.crafted++;
    G.log('logCrafted', { item: F.nameObj(it) }, it.rar >= 3 ? 'epic' : 'good');
    G.SFX.play(it.rar >= 3 ? 'level' : 'build');
    G.UI.dirty();
  };

  F.make = function (type, ti, rar) {
    const T = D.TIERS[ti], R = D.IRAR[rar], ty = D.ITYPES[type];
    const it = { id: G.U.uid(), type, ti, rar, atk: 0, def: 0, hp: 0, aff: [], epi: -1, ench: 0, eq: null };
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
    if (rar === 4) it.epi = G.U.randInt(0, D.EPITHETS.length - 1);
    return it;
  };

  // Итоговая характеристика с учётом зачарования
  F.stat = (it, k) => (it[k] ? Math.round(it[k] * (1 + 0.12 * (it.ench || 0))) : 0);

  F.nameObj = function (it) {
    const ty = D.ITYPES[it.type], T = D.TIERS[it.ti], R = D.IRAR[it.rar], g = ty.g;
    const tRu = G.STR.ru['it_' + it.type].toLowerCase(), tEn = G.STR.en['it_' + it.type];
    let ru = (R.adj[g] ? R.adj[g] + ' ' + T.adj[g] : cap(T.adj[g])) + ' ' + tRu;
    let en = (R.adj.en ? R.adj.en + ' ' : '') + T.adj.en + ' ' + tEn;
    if (it.epi >= 0) { ru += ' ' + D.EPITHETS[it.epi][0]; en += ' ' + D.EPITHETS[it.epi][1]; }
    if (it.ench) { ru += ' +' + it.ench; en += ' +' + it.ench; }
    return { ru, en };
  };
  F.name = (it) => G.tn(F.nameObj(it));
  F.jobName = function (j) {
    const ty = D.ITYPES[j.type], T = D.TIERS[j.ti];
    return { ru: cap(T.adj[ty.g]) + ' ' + G.STR.ru['it_' + j.type].toLowerCase(), en: T.adj.en + ' ' + G.STR.en['it_' + j.type] };
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  F.slotOf = (it) => D.ITYPES[it.type].slot;
  F.score = (it) => F.stat(it, 'atk') * 3 + F.stat(it, 'def') * 2 + F.stat(it, 'hp') * 0.5;
  F.sellValue = (it) => Math.round((it.ti + 1) * (it.ti + 1) * 10 * D.IRAR[it.rar].mult * (1 + 0.3 * (it.ench || 0)));
  F.get = (id) => G.S.items.find((i) => i.id === id);

  F.canUse = function (it, owner) {
    const ty = D.ITYPES[it.type];
    if (owner === 'king') return ty.slot === 'weapon';
    const a = G.T.get(owner);
    if (!a) return false;
    return ty.slot === 'armor' || ty.cls === a.cls;
  };
  F.equipped = (owner, slot) => G.S.items.find((i) => i.eq === owner && F.slotOf(i) === slot) || null;
  F.lockedOwner = (owner) => {
    if (owner === 'king' || !owner) return false;
    const a = G.T.get(owner);
    return !!a && (a.st === 'dungeon' || a.st === 'arena' || a.st === 'journey' || (a.st === 'gate' && G.W.active()));
  };

  F.equip = function (id, owner) {
    const it = F.get(id);
    if (!it || !F.canUse(it, owner) || F.lockedOwner(owner) || F.lockedOwner(it.eq)) return;
    const a = owner === 'king' ? null : G.T.get(owner);
    const holder = it.eq && it.eq !== 'king' ? G.T.get(it.eq) : null;
    const before = a ? G.T.stats(a).hp : 0;
    const hb = holder ? G.T.stats(holder).hp : 0;
    const cur = F.equipped(owner, F.slotOf(it));
    if (cur) cur.eq = null;
    it.eq = owner;
    // Доля здоровья сохраняется при смене брони
    if (a) a.hp = Math.min(G.T.stats(a).hp, a.hp * (G.T.stats(a).hp / Math.max(1, before)));
    if (holder) holder.hp = Math.min(G.T.stats(holder).hp, holder.hp * (G.T.stats(holder).hp / Math.max(1, hb)));
    G.SFX.play('click');
    G.UI.dirty();
  };

  F.unequip = function (id) {
    const it = F.get(id);
    if (!it || F.lockedOwner(it.eq)) return;
    const a = it.eq && it.eq !== 'king' ? G.T.get(it.eq) : null;
    it.eq = null;
    if (a) a.hp = Math.min(a.hp, G.T.stats(a).hp);
    G.UI.dirty();
  };

  F.sell = function (id) {
    const it = F.get(id);
    if (!it || it.eq) return;
    const v = F.sellValue(it);
    G.S.items = G.S.items.filter((i) => i !== it);
    G.E.add('gold', v);
    G.log('logSold', { item: F.nameObj(it), g: v }, 'info');
    G.SFX.play('coin');
    G.UI.dirty();
  };
  F.junk = () => G.S.items.filter((i) => !i.eq && i.rar <= 1 && !i.ench);
  F.sellJunk = function () {
    const list = F.junk();
    if (!list.length) return;
    let v = 0;
    for (const it of list) v += F.sellValue(it);
    G.S.items = G.S.items.filter((i) => !list.includes(i));
    G.E.add('gold', v);
    G.log('logSoldMany', { n: list.length, g: v }, 'info');
    G.SFX.play('coin');
    G.UI.dirty();
  };

  // ---------- зачарование рунами (кристаллы) ----------
  F.canEnchant = () => G.bonus('enchant') > 0;
  F.enchCost = (it) => ({ gold: 30 * (it.ench + 1) * (it.ti + 1), crystal: 3 * (it.ench + 1) * (it.ti + 1) });
  F.enchant = function (id) {
    const it = F.get(id);
    if (!it || !F.canEnchant() || it.ench >= D.ENCH_MAX || F.lockedOwner(it.eq)) return;
    if (!G.E.pay(F.enchCost(it))) return;
    it.ench++;
    G.S.stats.enchanted = (G.S.stats.enchanted || 0) + 1;
    G.log('logEnchant', { item: F.nameObj(it) }, 'epic');
    G.SFX.play('spell');
    G.UI.dirty();
  };
})();
