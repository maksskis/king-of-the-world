(function () {
  const OFFLINE_CAP = 8 * 3600;

  G.tick = function (dt) {
    G.K.tick(dt);
    G.E.tick(dt);
    G.R.tick(dt);
    G.F.tick(dt);
    G.T.tick(dt);
    G.X.tick(dt);
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
    G.LANG = G.S.lang || 'ru';
    G.invalidateBonus();
    G.UI.init();
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
