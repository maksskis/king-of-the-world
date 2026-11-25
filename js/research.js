(function () {
  const R = (G.R = {});
  const D = G.D;

  R.get = (id) => D.RESEARCH.find((r) => r.id === id);
  R.done = (id) => !!G.S.research.done[id];
  R.speed = () => (1 + 0.1 * (G.E.lvl('academy') - 1)) * (1 + G.bonus('resSpeed'));
  R.time = (r) => r.t / Math.max(1, R.speed());
  R.doneCount = () => D.RESEARCH.filter((r) => R.done(r.id)).length;

  // Идущие исследования: список. Сколько сразу — 1, «Совет учёных» добавляет ещё одно.
  R.slots = () => 1 + G.bonus('resSlots');
  R.active = () => G.S.research.act;
  R.cur = (id) => G.S.research.act.find((c) => c.id === id) || null;
  R.free = () => R.active().length < R.slots();

  // Старые сохранения: одно исследование в cur и записи, которых больше нет в списке
  R.sanitize = function () {
    const S = G.S.research;
    if (!Array.isArray(S.act)) S.act = [];
    if (S.cur) { if (R.get(S.cur.id)) S.act.push(S.cur); S.cur = null; }
    // «Артель зодчих» заменена «Большим залом Гильдии»: изученное, идущее и записи указа переходят к новому
    if (S.done.builders2) { delete S.done.builders2; S.done.guildhall = true; }
    for (const c of S.act) if (c.id === 'builders2') c.id = 'guildhall';
    G.S.decree.research = G.S.decree.research.map((id) => (id === 'builders2' ? 'guildhall' : id));
    S.act = S.act.filter((c) => R.get(c.id));
    G.S.decree.research = G.S.decree.research.filter((id) => R.get(id));
  };

  // Состояние: done | cur | open | locked
  R.state = function (id) {
    const r = R.get(id);
    if (R.done(id)) return 'done';
    if (R.cur(id)) return 'cur';
    if (G.E.lvl('academy') < r.acad || (r.req && !R.done(r.req))) return 'locked';
    return 'open';
  };

  R.start = function (id) {
    if (!R.free() || R.state(id) !== 'open' || !G.E.usable('academy')) return false;
    const r = R.get(id);
    if (!G.E.pay(r.cost)) return false;
    const t = R.time(r);
    G.S.research.act.push({ id, t, total: t });
    G.log('logResStart', { r: { k: 'rs_' + id } }, 'info');
    G.SFX.play('click');
    G.UI.dirty();
    return true;
  };

  // Клик по Академии ускоряет первое из идущих исследований (сильнее с уровнем Академии)
  R.boostSec = () => R.speed() * (1 + G.bonus('resBoost')) * G.K.foreman();
  R.boost = function () {
    const c = R.active()[0];
    if (!c || !G.E.usable('academy')) return false;
    c.t -= R.boostSec();
    G.K.handXp(D.KXP.help);
    R.tick(0);
    return true;
  };

  R.cancel = function (id) {
    const c = id ? R.cur(id) : R.active()[0];
    if (!c) return;
    G.E.addAll(R.get(c.id).cost);
    G.S.research.act = R.active().filter((x) => x !== c);
    G.UI.dirty();
  };

  function finish(c) {
    const r = R.get(c.id);
    G.S.research.done[c.id] = true;
    G.invalidateBonus();
    G.log('logResDone', { r: { k: 'rs_' + c.id } }, 'epic');
    if (r.eff.loc_mine) G.log('logLocOpen', { l: { k: 'loc_mine' } }, 'epic');
    if (r.eff.loc_lair) G.log('logLocOpen', { l: { k: 'loc_lair' } }, 'epic');
    G.SFX.play('level');
    G.UI.dirty();
  }

  R.tick = function (dt) {
    const S = G.S.research;
    if (!Array.isArray(S.act) || S.cur) R.sanitize();
    if (S.act.length && G.E.usable('academy')) {
      for (const c of S.act) c.t -= dt;
      const ready = S.act.filter((c) => c.t <= 0);
      if (ready.length) {
        S.act = S.act.filter((c) => c.t > 0);
        ready.forEach(finish);
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

  // Указ об исследованиях: первое доступное по списку начинается само, пока есть свободные места.
  // Недоступные пока записи пропускаются, а если не хватает только ресурсов — указ ждёт их.
  R.tickDecree = function () {
    const q = G.S.decree.research;
    let i = 0;
    while (i < q.length && R.free() && G.E.usable('academy')) {
      const id = q[i];
      if (!R.get(id)) { q.splice(i, 1); continue; }
      const st = R.state(id);
      if (st === 'done' || st === 'cur') { q.splice(i, 1); G.UI.dirty(); continue; }
      if (R.waitReason(id)) { i++; continue; }
      if (!G.E.can(R.get(id).cost)) break;
      R.start(id);
      q.splice(i, 1);
    }
  };
  R.enqueue = function (id) {
    const q = G.S.decree.research;
    if (q.includes(id) || R.done(id) || q.length >= 12) return;
    q.push(id);
    G.S.stats.resQueued = (G.S.stats.resQueued || 0) + 1;
    G.UI.dirty();
  };
})();
