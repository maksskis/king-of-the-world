// Путешествие: карта земель за пределами королевства. Открывается после победы над Древним драконом и остаётся
// открытым навсегда (хранится в династии). Каждая область — 5 этапов (1–5, 6–10, …), на каждом этапе свой босс.
// После 25-го этапа области идут по второму кругу («II»), боссы сильнее. Бой показывается в окне боя, как на Арене.
(function () {
  const J = (G.J = {});
  const D = G.D;

  // filter — оттенок спрайтов боссов области (CSS-фильтр холста)
  J.REGIONS = [
    { id: 'wastes', bosses: ['orc', 'wolf', 'troll', 'golem', 'lich'], filter: 'none' },
    { id: 'swamp', bosses: ['spider', 'drowned', 'slime', 'troll', 'lich'], filter: 'hue-rotate(60deg) saturate(0.85)' },
    { id: 'fire', bosses: ['orc', 'golem', 'bat', 'guardian', 'dragon'], filter: 'hue-rotate(-30deg) saturate(1.7)' },
    { id: 'ice', bosses: ['wolf', 'troll', 'golem', 'skeleton', 'lich'], filter: 'hue-rotate(170deg) saturate(0.65) brightness(1.2)' },
    { id: 'dark', bosses: ['skeleton', 'spider', 'guardian', 'lich', 'dragon'], filter: 'grayscale(0.4) brightness(0.75) contrast(1.35)' },
  ];
  J.PER = 5;

  J.S = function () {
    const d = G.S.dyn;
    if (!d.jr) d.jr = {};
    const s = d.jr;
    if (s.best == null) s.best = 0;
    if (!s.sel) s.sel = 1;
    if (!Array.isArray(s.team)) s.team = [];
    return s;
  };
  J.open = () => !!J.S().open;
  J.unlock = function () {
    const S = J.S();
    if (S.open) return;
    S.open = true;
    G.log('logJourneyOpen', {}, 'epic');
  };

  J.regionIdx = (s) => Math.floor((s - 1) / J.PER);
  J.region = (s) => J.REGIONS[J.regionIdx(s) % J.REGIONS.length];
  J.lap = (s) => Math.floor(J.regionIdx(s) / J.REGIONS.length); // 0 — первый круг
  J.bossKey = (s) => J.region(s).bosses[(s - 1) % J.PER];
  J.bossName = (s) => 'jb_' + J.region(s).id + '_' + ((s - 1) % J.PER);
  J.regionName = (ri) => ({ k: 'jr_' + J.REGIONS[ri % J.REGIONS.length].id, lap: Math.floor(ri / J.REGIONS.length) });
  J.unlocked = (s) => s >= 1 && s <= J.S().best + 1;
  J.shownRegions = () => Math.max(1, J.regionIdx(J.S().best + 1) + 2); // пройденные, текущая и следующая (закрытая)

  // Сколько героев берут в путешествие: сколько вмещает Гильдия
  J.teamMax = () => G.X.partyMax();
  J.team = () => J.S().team.map(G.T.get).filter((a) => a && a.st === 'idle' && a.hp > 0).slice(0, J.teamMax());
  J.pick = function (id) {
    const S = J.S();
    S.team = S.team.filter((x) => G.T.get(x));
    if (S.team.includes(id)) S.team = S.team.filter((x) => x !== id);
    else if (J.team().length < J.teamMax()) S.team.push(id);
    G.UI.dirty();
  };
  J.select = function (s) {
    if (!J.unlocked(s)) return;
    J.S().sel = s;
    G.UI.dirty();
  };

  // Босс этапа: растёт с этапом и с размером отряда; урон делится на 2 удара (у драконов на 3)
  J.opp = function (s, n) {
    n = Math.max(1, n || 1);
    const key = J.bossKey(s), diff = G.K.epochMul();
    const hp = Math.round(1500 * Math.pow(1.22, s - 1) * n * diff);
    const atk = Math.round(110 * Math.pow(1.16, s - 1) * Math.pow(n, 0.85) * Math.pow(diff, 0.8) * 10) / 10;
    return { key, count: 1, hp, max: hp, atk, boss: true, f: s, hits: key === 'dragon' ? 3 : 2 };
  };
  // Награда: полная за первую победу, четверть — за повтор. Последний этап области даёт вещь всегда, остальные — в 30% случаев.
  J.reward = function (s, first) {
    const m = G.K.epochReward() * (first ? 1 : 0.25);
    const o = { gold: 400 * Math.pow(1.2, s - 1), bone: 15 + 6 * s, crystal: 4 + 2 * s, mithril: 1 + Math.floor(s / 2) };
    for (const k in o) o[k] = Math.max(1, Math.round(o[k] * m));
    return o;
  };
  J.itemChance = (s, first) => (!first ? 0 : s % J.PER === 0 ? 1 : 0.3);
  J.xp = (s) => Math.round(25 * Math.pow(1.12, s));
  J.chance = function () {
    const tm = J.team();
    return tm.length ? G.X.chanceFor(tm, J.opp(J.S().sel, tm.length)) : 0;
  };
  J.whyNot = function () {
    const S = J.S();
    if (!S.open) return 'locked';
    if (S.live) return 'fight';
    if (!J.unlocked(S.sel)) return 'stage';
    if (!J.team().length) return 'team';
    if (G.W.running()) return 'battle';
    return '';
  };

  J.fight = function () {
    if (J.whyNot()) return;
    const S = J.S(), s = S.sel, tm = J.team();
    const en = J.opp(s, tm.length);
    const res = G.X.duel(tm, en);
    const first = s > S.best;
    S.live = { s, ids: tm.map((a) => a.id), win: res.win, hp: res.ps.map((p) => Math.max(0, p.hp)), first };
    for (const a of tm) a.st = 'journey';
    if (G.UI.win === 'journey') G.UI.closeModal();
    const reg = J.region(s);
    const ok = G.W.duel(res, en, tm, {
      mode: 'journey', n: s, title: G.t('jrStage', { s }), cname: G.t(J.bossName(s)), filter: reg.filter,
      bg: () => G.SPR.journeyBg(J.REGIONS.indexOf(reg)), finish: J.finish,
    });
    if (!ok) J.finish();
    G.UI.dirty();
  };

  // ovr — итог, если босса добил Король кликами раньше записи: победа и здоровье бойцов на тот момент
  J.finish = function (ovr) {
    const S = J.S(), L = S.live;
    if (!L) return null;
    S.live = null;
    if (ovr) { L.win = ovr.win; L.hp = ovr.hp; }
    L.loot = L.win ? J.reward(L.s, L.first) : null;
    L.item = null;
    if (L.win && Math.random() < J.itemChance(L.s, L.first)) {
      const ti = Math.min(D.TIERS.length - 1, 1 + Math.floor(L.s / 6));
      const rar = G.U.weighted(G.F.weightsFor(0.4 + 0.08 * L.s + G.bonus('luck'), D.LEG.p));
      L.item = G.F.make(G.U.pick(Object.keys(D.ITYPES)), ti, rar);
    }
    const xp = J.xp(L.s);
    let wounded = 0;
    L.ids.forEach((id, i) => {
      const a = G.T.get(id);
      if (!a) return;
      if (a.st === 'journey') a.st = 'idle';
      a.hp = Math.min(G.T.stats(a).hp, L.hp[i]);
      if (a.hp <= 0) { G.T.wound(a, 60); wounded++; } // в Путешествии не гибнут, но отдыхают дольше
      else G.T.giveXp(a, xp);
    });
    G.K.xp(10 * L.s);
    if (L.win) {
      G.E.addAll(L.loot);
      if (L.item) { G.S.items.push(L.item); G.log('logJourneyItem', { item: G.F.nameObj(L.item) }, L.item.rar >= 3 ? 'epic' : 'good'); }
      if (L.s > S.best) S.best = L.s;
      S.sel = Math.min(S.best + 1, L.s + 1);
      G.log('logJourneyWin', { s: L.s, m: { k: J.bossName(L.s) }, loot: L.loot }, 'good');
    } else G.log('logJourneyLose', { s: L.s, m: { k: J.bossName(L.s) } }, 'bad');
    S.last = { win: L.win, s: L.s };
    G.UI.dirty();
    G.UI.slotsDirty = true;
    return { win: L.win, s: L.s, loot: L.loot, item: L.item, xp, wounded, first: L.first };
  };
})();
