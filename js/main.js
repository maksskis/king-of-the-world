(function () {
  const OFFLINE_CAP = 8 * 3600;

  G.tick = function (dt) {
    G.K.tick(dt);
    G.E.tick(dt);
    G.R.tick(dt);
    G.F.tick(dt);
    G.T.tick(dt);
    G.X.tick(dt);
    G.A.tick(dt);
    G.E.checkGoal();
  };

  // Прогон симуляции секундными шагами (офлайн и фоновые вкладки)
  G.simulate = function (sec) {
    while (sec > 0) {
      const d = Math.min(1, sec);
      G.tick(d);
      sec -= d;
    }
  };

  G.offline = function (sec) {
    sec = Math.min(sec, OFFLINE_CAP);
    const before = Object.assign({}, G.S.res);
    G.offlineSim = true;
    G.simulate(sec);
    G.offlineSim = false;
    const gain = {};
    for (const r in G.S.res) {
      const d = G.S.res[r] - (before[r] || 0);
      if (d >= 1) gain[r] = Math.floor(d);
    }
    return { sec, gain };
  };

  G.init = function () {
    const loaded = G.load();
    G.S = loaded || G.newState();
    G.R.sanitize();
    G.X.sanitize();
    // Рынок заменён Ареной: его уровень, стройка и место в указе переходят Арене
    if (G.S.b.market) {
      G.S.b.arena.lvl = Math.max(G.S.b.arena.lvl, G.S.b.market.lvl);
      delete G.S.b.market;
      for (const c of G.S.cons) if (c.k === 'market') c.k = 'arena';
      G.S.decree.build = G.S.decree.build.map((k) => (k === 'market' ? 'arena' : k));
    }
    G.E.migrateGoals();
    G.K.sanitizeTalents();
    G.LANG = G.S.lang || 'ru';
    G.invalidateBonus();
    G.UI.init();
    if (G.S.arena.live) G.A.finish(); // бой на Арене прервался перезагрузкой — подводим итог сразу
    if (G.J.S().live) G.J.finish();
    G.K.xp(0); // опыт по старой кривой сразу даёт уровни
    let rep = null;
    if (loaded) {
      const away = (Date.now() - (loaded.lastSave || Date.now())) / 1000;
      if (away > 5) rep = G.offline(away);
    } else {
      G.log('logWelcome', {}, 'info');
    }
    if (G.E.lvl('tavern') > 0 && !G.S.tavern.cands.length) G.T.refresh(true);
    G.UI.dirty();
    G.UI.refresh();
    if (rep && rep.sec > 60) G.UI.offlineReport(rep);
    if (G.S.story === 'epoch') { G.S.story = null; G.UI.tab = 'king'; G.UI.scrollTo = 'dynasty'; G.UI.dirty(); G.UI.refresh(); G.UI.epochStory(); }

    let last = performance.now();
    setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (dt > 2) G.simulate(Math.min(dt, OFFLINE_CAP));
      else G.tick(dt);
      G.UI.refresh();
    }, 100);
    setInterval(G.save, 10000);
    window.addEventListener('beforeunload', G.save);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') G.save(); });
  };

  window.addEventListener('DOMContentLoaded', G.init);
})();
