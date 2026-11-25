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

  // «Прораб»: множитель всех ускорений кликом, кроме стройки (Кузница, Академия, Арена, Гильдия, Катакомбы)
  K.foreman = () => 1 + G.bonus('boostAll');
  // «Лекари»: без них герои сами не восстанавливают здоровье
  K.medic = () => (G.S.king.tal.medic || 0) > 0;
  // Старые сохранения: убранные таланты возвращают очки, ранги сверх нового предела — тоже
  K.sanitizeTalents = function () {
    const tal = G.S.king.tal;
    for (const id of Object.keys(tal)) {
      const x = D.TALENTS.find((q) => q.id === id);
      if (!x) delete tal[id];
      else if (tal[id] > K.talMax(x)) tal[id] = K.talMax(x);
    }
    G.invalidateBonus();
  };

  // ---------- уровень короля ----------
  // Опыт за клики самого игрока (добыча и помощь зданиям); автоклик «Королевской сноровки» опыта не даёт
  K.handXp = (n) => { if (!(G.UI && G.UI.autoNow)) K.xp(n); };
  K.need = () => D.kingXp(G.S.king.lvl);
  K.xp = function (n) {
    const k = G.S.king;
    if (k.lvl >= D.KING_MAX) return;
    k.xp += n * (1 + G.bonus('xp') + G.bonus('kingXp'));
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
  K.spellCd = (sp) => sp.cd * Math.max(0.25, 1 - G.bonus('spellCd')); // Придворный маг 5-го уровня: −75%
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
    G.S.stats.spells = (G.S.stats.spells || 0) + 1;
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
  // Из чего складываются очки за передачу трона: лучшая волна, этажи подземелий, Замок ×3, Король ×2,
  // лучший ранг Арены ×2, этапы Путешествия, пройденные в этом правлении, ×5 — всё ÷5, и +10 за дракона
  K.legacyParts = function () {
    const S = G.S, Lg = D.LEGACY;
    const depth = Object.values(S.dng.best).reduce((a, b) => a + b, 0);
    const arena = (S.arena && S.arena.best) || 0, jr = G.J.S().best || 0;
    const sum = S.gate.best + depth + G.E.lvl('castle') * 3 + S.king.lvl * 2 + arena * Lg.arena + jr * Lg.jr;
    return { wave: S.gate.best, depth, castle: G.E.lvl('castle'), king: S.king.lvl, arena, jr, dragon: !!S.camp.won, total: Math.floor(sum / 5) + (S.camp.won ? 10 : 0) };
  };
  K.legacyGain = () => K.legacyParts().total;
  // Здания 8-го уровня: +1 очко наследия сразу, один раз за правление на каждое здание
  K.maxBuildings = () => D.ORDER.filter((k) => !D.B[k].noLevel);
  K.checkMaxBuildings = function () {
    const S = G.S;
    if (!S.lg8) S.lg8 = {};
    for (const k of K.maxBuildings()) {
      if (S.lg8[k] || G.E.lvl(k) < D.MAXLVL) continue;
      S.lg8[k] = 1;
      S.dyn.pts += D.LEGACY.maxB;
      G.log('logLegacyMaxB', { b: { k: 'bn_' + k }, n: D.LEGACY.maxB }, 'epic');
      G.UI.dirty();
    }
  };
  K.perkRank = (id) => G.S.dyn.perks[id] || 0;
  K.perkCost = (id) => 1 + K.perkRank(id);
  K.buyPerk = function (id) {
    if (K.perkRank(id) >= D.PERK_MAX || G.S.dyn.pts < K.perkCost(id)) return;
    G.S.dyn.pts -= K.perkCost(id);
    G.S.dyn.perks[id] = K.perkRank(id) + 1;
    G.invalidateBonus();
    if (id === 'found') K.applyFounders(); // здание появляется сразу
    G.UI.dirty();
  };
  // «Основатели»: первые N зданий из списка важности стоят 1-го уровня
  K.applyFounders = function () {
    const n = K.perkRank('found');
    for (const k of D.FOUND_ORDER.slice(0, n)) if (G.S.b[k].lvl < 1 && !G.E.consOf(k)) G.S.b[k].lvl = 1;
    G.UI.slotsDirty = true;
  };
  // Название земли эпохи: после шести краёв названия идут по кругу с номером
  K.land = (epoch) => {
    const L = D.LANDS[epoch % D.LANDS.length], n = Math.floor(epoch / D.LANDS.length);
    return n ? { ru: L.ru + ' ' + (n + 1), en: L.en + ' ' + (n + 1) } : L;
  };
  // Герои уходят с наследником и тоже проходят престиж: уровень сбрасывается до 1-го,
  // навыки остаются (не тратят новые очки), +1 звезда престижа; надетые вещи перекованы в железо той же редкости
  K.carryHeroes = function (old) {
    const advs = [], items = [];
    for (const a of old.advs) {
      const sk = Object.assign({}, a.sk || {});
      const kept = Object.values(sk).reduce((x, y) => x + y, 0);
      advs.push({ id: a.id, name: a.name, cls: a.cls, rar: a.rar, lvl: 1, xp: 0, hp: 0, st: 'idle', wt: 0, sk, skFree: kept, prest: (a.prest || 0) + 1, cost: a.cost });
    }
    for (const it of old.items) {
      if (!it.eq || it.eq === '__lost') continue;
      if (it.eq !== 'king' && !advs.some((a) => a.id === it.eq)) continue;
      const ni = G.F.make(it.type, 0, it.rar);
      ni.eq = it.eq;
      items.push(ni);
    }
    return { advs, items };
  };

  K.abdicate = function () {
    if (!G.S.camp.won) return;
    const dyn = G.S.dyn;
    dyn.pts += K.legacyGain();
    dyn.epoch++;
    const lang = G.S.lang, sound = G.S.sound, style = G.S.style;
    const heirs = K.carryHeroes(G.S);
    G.S = G.newState(dyn);
    G.S.lang = lang;
    G.S.sound = sound;
    G.S.style = style;
    G.S.advs = heirs.advs;
    G.S.items = heirs.items;
    for (const a of G.S.advs) a.hp = G.T.stats(a).hp;
    G.S.story = 'epoch'; // после перезагрузки — рассказ о новых землях
    G.invalidateBonus();
    const st = K.perkRank('start');
    if (st) G.E.addAll({ gold: 500 * st, wood: 500 * st, stone: 500 * st });
    K.applyFounders();
    G.log('logEpoch', { n: dyn.epoch + 1 }, 'epic');
    G.save();
    location.reload();
  };
})();
