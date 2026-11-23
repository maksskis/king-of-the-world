(function () {
  const R = (G.R = {});
  const D = G.D;

  R.get = (id) => D.RESEARCH.find((r) => r.id === id);
  R.done = (id) => !!G.S.research.done[id];
  R.speed = () => 1 + 0.1 * (G.E.lvl('academy') - 1);
  R.time = (r) => r.t / Math.max(1, R.speed());

  // Состояние: done | cur | open | locked
  R.state = function (id) {
    const r = R.get(id);
    if (R.done(id)) return 'done';
    if (G.S.research.cur && G.S.research.cur.id === id) return 'cur';
    if (G.E.lvl('academy') < r.acad || (r.req && !R.done(r.req))) return 'locked';
    return 'open';
  };

  R.start = function (id) {
    if (G.S.research.cur || R.state(id) !== 'open' || !G.E.usable('academy')) return false;
    const r = R.get(id);
    if (!G.E.pay(r.cost)) return false;
    const t = R.time(r);
    G.S.research.cur = { id, t, total: t };
    G.log('logResStart', { r: { k: 'rs_' + id } }, 'info');
    G.SFX.play('click');
    G.UI.dirty();
    return true;
  };

  // Клик по Академии ускоряет текущее исследование (сильнее с уровнем Академии)
  R.boostSec = () => R.speed();
  R.boost = function () {
    const c = G.S.research.cur;
    if (!c || !G.E.usable('academy')) return false;
    c.t -= R.boostSec();
    R.tick(0);
    return true;
  };

  R.cancel = function () {
    const c = G.S.research.cur;
    if (!c) return;
    G.E.addAll(R.get(c.id).cost);
    G.S.research.cur = null;
    G.UI.dirty();
  };

  R.tick = function (dt) {
    const c = G.S.research.cur;
    if (c && G.E.usable('academy')) {
      c.t -= dt;
      if (c.t <= 0) {
        const r = R.get(c.id);
        G.S.research.done[c.id] = true;
        G.S.research.cur = null;
        G.invalidateBonus();
        G.log('logResDone', { r: { k: 'rs_' + c.id } }, 'epic');
        if (r.eff.loc_mine) G.log('logLocOpen', { l: { k: 'loc_mine' } }, 'epic');
        if (r.eff.loc_lair) G.log('logLocOpen', { l: { k: 'loc_lair' } }, 'epic');
        G.K.xp(20 * r.acad);
        G.SFX.play('level');
        G.UI.dirty();
      }
    }
    R.tickDecree();
  };

  // Почему запись указа пока нельзя начать: нужен уровень Академии, другое исследование или склад побольше
  R.waitReason = function (id) {
    const r = R.get(id);
    if (R.state(id) !== 'locked') return G.E.fits(r.cost) ? '' : 'storage';
    return G.E.lvl('academy') < r.acad ? 'academy' : 'req';
  };

  // Указ об исследованиях: первое доступное по списку начинается само.
  // Недоступные пока записи пропускаются, а если не хватает только ресурсов — указ ждёт их.
  R.tickDecree = function () {
    const q = G.S.decree.research;
    let i = 0;
    while (i < q.length && !G.S.research.cur && G.E.usable('academy')) {
      const id = q[i];
      const st = R.state(id);
      if (st === 'done' || st === 'cur') { q.splice(i, 1); G.UI.dirty(); continue; }
      if (R.waitReason(id)) { i++; continue; }
      if (G.E.can(R.get(id).cost)) { R.start(id); q.splice(i, 1); }
      break;
    }
  };
  R.enqueue = function (id) {
    const q = G.S.decree.research;
    if (q.includes(id) || R.done(id) || q.length >= 12) return;
    q.push(id);
    G.UI.dirty();
  };
})();
