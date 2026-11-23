(function () {
  const K = (G.K = {});
  const D = G.D;

  // ---------- сводные бонусы: таланты + исследования + советники + династия ----------
  let cache = null;
  G.invalidateBonus = () => { cache = null; };
  G.bonus = function (key) {
    if (!cache) {
      cache = {};
      const S = G.S;
      const addEff = (eff, mult) => { for (const k in eff) cache[k] = (cache[k] || 0) + eff[k] * mult; };
      for (const t of D.TALENTS) if (S.king.tal[t.id]) addEff(t.eff, S.king.tal[t.id]);
      for (const r of D.RESEARCH) if (S.research.done[r.id]) addEff(r.eff, 1);
      for (const a of D.ADVISORS) if (S.advisors[a.id]) addEff(a.eff, S.advisors[a.id]);
      for (const p of D.PERKS) if (S.dyn.perks[p.id]) addEff(p.eff, S.dyn.perks[p.id]);
    }
    return cache[key] || 0;
  };

  // ---------- уровень короля ----------
  K.need = () => D.kingXp(G.S.king.lvl);
  K.xp = function (n) {
    const k = G.S.king;
    if (k.lvl >= D.KING_MAX) return;
    k.xp += n * (1 + G.bonus('xp'));
    while (k.lvl < D.KING_MAX && k.xp >= K.need()) {
      k.xp -= K.need();
      k.lvl++;
      G.log('logKingLvl', { l: k.lvl }, 'epic');
      for (const sp of D.SPELLS) if (sp.lvl === k.lvl) G.log('logSpellNew', { s: { k: 'sp_' + sp.id } }, 'epic');
      G.SFX.play('level');
      G.UI.dirty();
    }
  };

  K.tpTotal = () => G.S.king.lvl - 1;
  K.tpSpent = () => D.TALENTS.reduce((a, x) => a + (G.S.king.tal[x.id] || 0), 0); // старые таланты не считаются
  K.talMax = (x) => x.max || D.TAL_MAX;
  K.tp = () => K.tpTotal() - K.tpSpent();
  K.learn = function (id) {
    const t = D.TALENTS.find((x) => x.id === id);
    if (!t || K.tp() <= 0 || (G.S.king.tal[id] || 0) >= K.talMax(t)) return;
    G.S.king.tal[id] = (G.S.king.tal[id] || 0) + 1;
    G.invalidateBonus();
    G.SFX.play('level');
    G.UI.dirty();
  };

  // ---------- заклинания ----------
  K.spell = (id) => D.SPELLS.find((s) => s.id === id);
  K.spellCd = (sp) => sp.cd * Math.max(0.4, 1 - G.bonus('spellCd'));
  K.meteorDmg = () => 25 + 15 * G.S.king.lvl;
  K.ready = function (id) {
    const sp = K.spell(id);
    if (!sp || G.S.king.lvl < sp.lvl || (G.S.king.cd[id] || 0) > 0) return false;
    if (sp.battle && !(G.W && G.W.active())) return false;
    return true;
  };
  K.cast = function (id) {
    if (!K.ready(id)) return;
    const sp = K.spell(id);
    const k = G.S.king;
    if (id === 'rush') k.buff.rush = sp.dur;
    else if (id === 'rallyS') k.buff.rally = sp.dur;
    else G.W.spell(id);
    k.cd[id] = K.spellCd(sp);
    G.log('logCast', { s: { k: 'sp_' + id } }, 'epic');
    G.SFX.play('spell');
    G.UI.dirty();
  };
  K.rally = () => ((G.S.king.buff.rally || 0) > 0 ? 1.5 : 1);

  K.tick = function (dt) {
    const k = G.S.king;
    for (const id in k.cd) if (k.cd[id] > 0) k.cd[id] = Math.max(0, k.cd[id] - dt);
    for (const id in k.buff) if (k.buff[id] > 0) k.buff[id] = Math.max(0, k.buff[id] - dt);
  };

  // ---------- советники ----------
  K.advLvl = (id) => G.S.advisors[id] || 0;
  K.advCost = (id) => D.advisorCost(K.advLvl(id));
  K.advOpen = (a) => G.E.lvl('castle') >= a.castle;
  K.hireAdv = function (id) {
    const a = D.ADVISORS.find((x) => x.id === id);
    if (!a || !K.advOpen(a) || K.advLvl(id) >= D.ADV_MAX) return;
    if (!G.E.pay(K.advCost(id))) return;
    G.S.advisors[id] = K.advLvl(id) + 1;
    G.invalidateBonus();
    G.log(K.advLvl(id) === 1 ? 'logAdvHired' : 'logAdvUp', { a: { k: 'ad_' + id }, l: K.advLvl(id) }, 'good');
    G.SFX.play('coin');
    G.UI.dirty();
  };

  // ---------- династия ----------
  K.epochMul = () => 1 + 0.25 * G.S.dyn.epoch;
  K.epochReward = () => 1 + 0.2 * G.S.dyn.epoch;
  K.legacyGain = function () {
    const S = G.S;
    const depth = Object.values(S.dng.best).reduce((a, b) => a + b, 0);
    return Math.floor((S.gate.best + depth + G.E.lvl('castle') * 3 + S.king.lvl * 2) / 5) + (S.camp.won ? 10 : 0);
  };
  K.perkRank = (id) => G.S.dyn.perks[id] || 0;
  K.perkCost = (id) => 1 + K.perkRank(id);
  K.buyPerk = function (id) {
    if (K.perkRank(id) >= D.PERK_MAX || G.S.dyn.pts < K.perkCost(id)) return;
    G.S.dyn.pts -= K.perkCost(id);
    G.S.dyn.perks[id] = K.perkRank(id) + 1;
    G.invalidateBonus();
    G.UI.dirty();
  };
  K.abdicate = function () {
    if (!G.S.camp.won) return;
    const dyn = G.S.dyn;
    dyn.pts += K.legacyGain();
    dyn.epoch++;
    const lang = G.S.lang, sound = G.S.sound;
    G.S = G.newState(dyn);
    G.S.lang = lang;
    G.S.sound = sound;
    G.invalidateBonus();
    const st = K.perkRank('start');
    if (st) G.E.addAll({ gold: 100 * st, wood: 100 * st, stone: 100 * st });
    G.log('logEpoch', { n: dyn.epoch + 1 }, 'epic');
    G.save();
    location.reload();
  };
})();
