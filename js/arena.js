// Арена: герои бьются с чемпионами по рангам за кости, кристаллы и мифрил —
// те же ресурсы, что дают подземелья и ворота. Проигрыш не убивает, только ранит.
(function () {
  const A = (G.A = {});
  const D = G.D;

  A.lvl = () => G.E.lvl('arena');
  A.S = () => G.S.arena;
  // Размер команды: 1 боец, со 2-го уровня — 2, с 4-го — 3, с 6-го — 4, на 8-м — 5
  A.teamMax = () => (A.lvl() < 1 ? 0 : Math.min(5, 1 + Math.floor(A.lvl() / 2)));
  // Подготовка к следующему бою: 60 с, быстрее с уровнем Арены и «Славой арены»
  A.cdTime = () => ((60 / (1 + 0.1 * (A.lvl() - 1))) * Math.max(0.4, 1 - G.bonus('arenaCd'))) / G.K.haste();
  A.CHAMPS = ['goblin', 'wolf', 'skeleton', 'orc', 'spider', 'drowned', 'troll', 'golem', 'lich'];

  // Сила чемпиона по рангу: до 10-го ранга — крутой рост, дальше мягче (как этажи Катакомб после 15-го),
  // чтобы Арена росла всю эпоху: 20-й ранг берёт отряд с ~65-го этажа, 30-й — отряд конца эпохи (~100-й этаж)
  A.SOFT = { r: 10, hp: 1.12, atk: 1.09, pay: 0.3 };
  A.growth = function (rank) {
    const f = 1 + (Math.min(rank, A.SOFT.r) - 1) * 1.5, x = Math.max(0, rank - A.SOFT.r);
    return { f, hp: Math.pow(1.26, f - 1) * Math.pow(A.SOFT.hp, x), atk: Math.pow(1.19, f - 1) * Math.pow(A.SOFT.atk, x) };
  };
  // «Вес» ранга для наград и опыта Короля: после 10-го ранги идут чаще, каждый весит 0,3 —
  // за ту же силу Арена платит столько же, сколько до смягчения
  A.payRank = (rank) => (rank <= A.SOFT.r ? rank : A.SOFT.r + (rank - A.SOFT.r) * A.SOFT.pay);
  // Соперник ранга: один чемпион, сила растёт с рангом и размером команды
  A.opp = function (rank, n) {
    n = Math.max(1, n || 1);
    const g = A.growth(rank), diff = G.K.epochMul();
    const key = A.CHAMPS[Math.min(A.CHAMPS.length - 1, Math.floor((rank - 1) / 3))];
    const hp = Math.round(60 * g.hp * 2.4 * n * diff);
    const atk = Math.round(9 * g.atk * 1.35 * Math.pow(n, 0.9) * Math.pow(diff, 0.8) * 10) / 10;
    return { key, count: 1, hp, max: hp, atk, boss: true, f: g.f, hits: n >= 3 ? 2 : 1 };
  };
  // Награда за победу на ранге
  A.reward = function (rank) {
    const m = (1 + 0.15 * (A.lvl() - 1)) * (1 + G.bonus('arenaLoot')) * G.K.epochReward();
    const pr = A.payRank(rank);
    const o = { gold: 10 * pr, bone: 3 + 2 * pr };
    // кристаллы и мифрил — только когда их уже добывают в Катакомбах (25-й и 50-й этаж)
    const cat = G.S.dng.best.catacombs || 0;
    if (rank >= 2 && cat >= D.CRYSTAL_FLOOR) o.crystal = Math.round(1 + pr * 0.7);
    if (rank >= 4 && cat >= D.MITHRIL_FLOOR) o.mithril = Math.floor(pr / 2);
    for (const k in o) o[k] = Math.max(1, Math.round(o[k] * m));
    return o;
  };

  // Команда: только свободные и не раненые герои
  A.team = () => (A.S().team || []).map(G.T.get).filter((a) => a && a.st === 'idle' && a.hp > 0).slice(0, A.teamMax());
  A.pick = function (id) {
    const S = A.S();
    S.team = (S.team || []).filter((x) => G.T.get(x));
    if (S.team.includes(id)) S.team = S.team.filter((x) => x !== id);
    else if (A.team().length < A.teamMax()) S.team.push(id);
    G.UI.dirty();
  };
  A.chance = function () {
    const tm = A.team();
    return tm.length ? G.X.chanceFor(tm, A.opp(A.S().rank, tm.length)) : 0;
  };
  A.whyNot = function () {
    if (A.lvl() < 1) return 'build';
    if (A.S().live) return 'fight';
    if (G.E.busy('arena')) return 'busy';
    if (A.S().cd > 0) return 'cd';
    if (!A.team().length) return 'team';
    if (G.W.running()) return 'battle';
    return '';
  };

  // Бой: исход считается сразу, а окно боя проигрывает его по раундам.
  // Пока идёт показ, бойцы заняты; награда и раны — в A.finish (в конце показа, по «Пропустить» или при загрузке).
  A.fight = function () {
    if (A.whyNot()) return;
    const S = A.S(), tm = A.team(), rank = S.rank;
    const en = A.opp(rank, tm.length);
    const res = G.X.duel(tm, en);
    S.live = {
      rank, key: en.key, ids: tm.map((a) => a.id), win: res.win, hp: res.ps.map((p) => Math.max(0, p.hp)),
      loot: res.win ? A.reward(rank) : null, log: res.out.map(([k, p, c]) => ({ k, p, c })),
    };
    for (const a of tm) a.st = 'arena';
    if (!G.W.arena(res, en, tm, rank)) A.finish();
    G.UI.dirty();
  };

  A.finish = function () {
    const S = A.S(), L = S.live;
    if (!L) return null;
    S.live = null;
    const xp = Math.round(10 * Math.pow(1.15, A.payRank(L.rank))); // опыт героев — тоже по «весу» ранга
    let wounded = 0;
    L.ids.forEach((id, i) => {
      const a = G.T.get(id);
      if (!a) return;
      if (a.st === 'arena') a.st = 'idle';
      a.hp = Math.min(G.T.stats(a).hp, L.hp[i]);
      if (a.hp <= 0) { G.T.wound(a, 30); wounded++; } // на Арене не гибнут
      else G.T.giveXp(a, xp);
    });
    if (L.win) G.K.xp(Math.round(D.KXP.arena * A.payRank(L.rank))); // опыт Короля за сражение
    if (L.win) {
      G.E.addAll(L.loot);
      S.rank = L.rank + 1;
      S.best = Math.max(S.best || 0, L.rank);
      S.wins = (S.wins || 0) + 1;
      G.log('logArenaWin', { r: L.rank, loot: L.loot }, 'good');
    } else G.log('logArenaLose', { r: L.rank }, 'bad');
    S.last = { win: L.win, rank: L.rank, key: L.key, loot: L.loot, log: L.log };
    S.cd = A.cdTime();
    G.UI.dirty();
    G.UI.slotsDirty = true;
    return { win: L.win, rank: L.rank, key: L.key, loot: L.loot, xp, wounded };
  };

  A.tick = function (dt) {
    const S = A.S();
    if (S.cd > 0 && G.E.usable('arena')) S.cd = Math.max(0, S.cd - dt);
  };
  // Клик по Арене ускоряет подготовку к бою
  A.boostSec = () => 1 * G.K.foreman();
  A.boost = function () {
    const S = A.S();
    if (!(S.cd > 0) || !G.E.usable('arena')) return false;
    S.cd = Math.max(0, S.cd - A.boostSec());
    G.K.handXp(D.KXP.help);
    return true;
  };
})();
