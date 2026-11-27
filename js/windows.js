// Встроенные блоки вкладок (без отдельных окон): кузня, найм, исследования, персонаж, предмет, выбор снаряжения.
// Отдельным окном остаются только цели.
(function () {
  const D = G.D;
  const P = (G.PANE = {});
  const W = (G.WIN = {});
  const h = () => G.UI.h;

  // ---------- выбор снаряжения (встроенный) ----------
  P.picker = function (owner, slot) {
    const { ic, t, itemTile } = h();
    const cur = G.F.equipped(owner, slot);
    const gains = new Map(P.fits(owner, slot).map((it) => [it, P.gain(it, owner)]));
    const list = [...gains.keys()].sort((x, y) => P.gainScore(gains.get(y)) - P.gainScore(gains.get(x)) || G.F.score(y) - G.F.score(x));
    return `<div class="picker"><div class="row"><b>${list.length ? h().tipTitle(`${t('chooseItem')}: ${slot === 'weapon' ? t('weapon') : t('armor')}`, 'diffHint', t(cur ? 'diffHint' : 'diffHintEmpty')) : `${t('chooseItem')}: ${slot === 'weapon' ? t('weapon') : t('armor')}`}</b><span class="grow"></span>
      ${cur ? `<button class="btn small" data-action="uneq" data-arg="${cur.id}">${ic('i_x')} ${t('unequip')}</button>` : ''}
      <button class="btn small" data-action="pickClose">${t('close')}</button></div>
      <div class="igrid">${list.map((it) => itemTile(it, 'eq', it.id + '|' + owner, P.diffHtml(gains.get(it)))).join('') || `<div class="muted small">${t('noItems')}</div>`}</div></div>`;
  };
  // Как изменятся итоговые статы владельца, если надеть вещь вместо той, что в этой ячейке сейчас
  // (с учётом заточки, звёзд престижа, навыков героя и талантов Короля)
  P.ownerStats = function (owner) {
    if (owner === 'king') return { atk: G.W.kingDmg() };
    const a = G.T.get(owner);
    return a ? G.T.stats(a) : {};
  };
  P.gain = function (it, owner) {
    const cur = G.F.equipped(owner, G.F.slotOf(it)), was = it.eq;
    const before = P.ownerStats(owner);
    if (cur) cur.eq = null;
    it.eq = owner;
    const after = P.ownerStats(owner);
    it.eq = was;
    if (cur) cur.eq = owner;
    const d = {};
    for (const k in before) d[k] = (after[k] || 0) - before[k];
    return d;
  };
  P.gainScore = (d) => (d.atk || 0) * 3 + (d.def || 0) * 2 + (d.hp || 0) * 0.5;
  P.diffHtml = function (d) {
    const { ic, t } = h();
    const parts = ['atk', 'def', 'hp'].filter((k) => d[k]).map((k) => `<span class="${d[k] > 0 ? 'up' : 'dn'}">${d[k] > 0 ? '▲' : '▼'}${Math.abs(d[k])}${ic('i_' + k)}</span>`);
    return `<span class="idiff">${parts.join('') || `<span class="same">${t('sameStats')}</span>`}</span>`;
  };
  // Вещи, которые можно надеть этому владельцу в эту ячейку
  P.fits = (owner, slot) => G.S.items.filter((it) => G.F.slotOf(it) === slot && it.eq !== owner && G.F.canUse(it, owner) && !G.F.lockedOwner(it.eq));
  P.eqSlots = function (owner, slots) {
    const { ic, t, esc } = h();
    return slots.map((slot) => {
      const it = G.F.equipped(owner, slot);
      let n = 0;
      const lab = slot === 'weapon' ? t('weapon') : t('armor');
      const open = G.UI.pick === owner + '|' + slot;
      return `<button class="eq big ${it ? 'has' : ''} ${open ? 'on' : ''}" data-action="pick" data-arg="${owner}|${slot}" ${G.F.lockedOwner(owner) ? 'disabled' : ''} ${it ? `style="--rc:${D.IRAR[it.rar].color}"` : ''}>
        ${it ? ic('it_' + it.type + ':' + it.ti, 'ic3') : `<span class="ph">${ic(slot === 'weapon' ? 'i_atk' : 'i_def', 'ic2')}</span>`}
        <span class="grow"><span class="small muted">${lab}</span><br>${it ? `<span style="color:${D.IRAR[it.rar].color}">${esc(G.F.name(it))}</span><br><span class="eqst">${h().itemMain(it)}${it.ench ? ` <em class="ench">+${it.ench}</em>` : ''}</span>` : `<span class="muted">${t('empty')}</span>${(n = P.fits(owner, slot).filter((x) => !x.eq).length) ? ` <span class="avail">${t('availN', { n })}</span>` : ''}`}</span></button>`;
    }).join('');
  };
  function pickerFor(owner, slots) {
    const p = G.UI.pick;
    if (!p) return '';
    const [o, slot] = p.split('|');
    return o === owner && slots.includes(slot) ? P.picker(owner, slot) : '';
  }
  P.pickerFor = pickerFor;

  // ---------- кузня ----------
  P.craft = function () {
    const { ic, t, nm, esc, btn, chancesRow, bar, costHtml } = h();
    const sel = G.UI.craft;
    if (!G.F.unlocked(sel.ti)) sel.ti = 0;
    const ty = D.ITYPES[sel.type], T = D.TIERS[sel.ti];
    const q = G.S.forge.q, qMax = G.F.qMax(), full = q.length >= qMax;
    const cats = Object.keys(D.ITYPES).map((k) => `<button class="cat ${sel.type === k ? 'on' : ''}" data-action="craftType" data-arg="${k}" title="${esc(t('it_' + k))}">${ic('it_' + k + ':' + sel.ti, 'ic2')}<span>${t('it_' + k)}</span></button>`).join('');
    const tiers = D.TIERS.map((x, i) => {
      const open = G.F.unlocked(i);
      return `<button class="tierb ${sel.ti === i ? 'on' : ''}" data-action="craftTier" data-arg="${i}" ${open ? '' : 'disabled'}>${ic(open ? 'it_' + sel.type + ':' + i : 'i_lock', 'ic2')}<span>${t('tier_' + i)}</span>${open ? '' : `<i>${t('fromLvl', { l: x.req })}</i>`}</button>`;
    }).join('');
    const top = D.IRAR[4].mult;
    const base = ty.slot === 'weapon'
      ? `${ic('i_atk')} ${Math.round(T.atk * ty.mod)}–${Math.round(T.atk * ty.mod * top)}`
      : `${ic('i_def')} ${T.def}–${Math.round(T.def * top)} · ${ic('i_hp')} ${T.hp}–${Math.round(T.hp * top)}`;
    const who = ty.cls ? `${ic('c_' + ty.cls)} ${t('cl_' + ty.cls)}` : `${ic('i_people')} ${t('anyClass')}`;
    const cost = G.F.cost(sel.type, sel.ti);
    // очередь: ячейка на каждый уровень кузницы, остальные под замком
    const slots = [];
    for (let i = 0; i < D.MAXLVL + G.bonus('forgeQ'); i++) {
      const j = q[i];
      if (j) {
        slots.push(`<div class="qslot full">${ic('it_' + j.type + ':' + j.ti, 'ic2')}<div class="grow"><div class="small">${esc(nm(G.F.jobName(j)))}</div>${i === 0 ? `${bar('forge')}<div class="muted small" data-b="forgeT"></div>` : `<div class="muted small">${t('queued')}</div>`}</div><button class="btn small" data-action="craftCancel" data-arg="${i}" title="${esc(t('cancelRefund'))}">${ic('i_x')}</button></div>`);
      } else if (i < qMax) slots.push(`<div class="qslot empty"><span class="muted small">${t('slotFree')}</span></div>`);
      else slots.push(`<div class="qslot locked">${ic('i_lock')} <span class="muted small">${t('slotFromLvl', { l: i + 1 - G.bonus('forgeQ') })}</span></div>`);
    }
    return `<div class="box"><h3>${ic('i_anvil')} ${t('craftTitle')}</h3>
      <div class="cats row">${cats}</div>
      <div class="tiers">${tiers}</div>
      <div class="rcard">${ic('it_' + sel.type + ':' + sel.ti, 'ic4')}<div class="grow"><div class="nm big">${esc(nm(G.F.jobName(sel)))}</div><div class="small">${who}</div><div class="small">${base}</div><div class="small muted">${ic('i_clock')} ${G.U.fmtTime(T.time / G.F.speed())}</div></div></div>
      <div class="small muted">${t('rarityChances')}</div>${chancesRow(D.IRAR, G.F.rarChances(), G.F.rarOpen, 'ir')}
      <div class="row">${costHtml(cost)}</div>
      ${btn(ic('i_hammer') + ' ' + (full ? t('queueFull') : t('craft')), 'craft', '', { cost, chips: false, cls: 'primary big', lock: full })}</div>
      <div class="box"><h3>${h().tipTitle(ic('i_clock') + ' ' + t('forgeQueue'), 'forgeQueueHint')} <span class="muted">${q.length}/${qMax}</span></h3><div class="qgrid">${slots.join('')}</div></div>`;
  };

  // ---------- таверна: найм прямо в панели ----------
  P.hire = function () {
    const { ic, t, nm, esc, btn, chancesRow } = h();
    const S = G.S, full = S.advs.length >= G.T.maxAdvs();
    const cards = S.tavern.cands.map((c, i) => {
      const R = D.ARAR[c.rar], s = G.T.stats(c);
      return `<div class="hcard" style="--rc:${R.color}">
        <div class="por">${ic('c_' + c.cls, 'ic3')}</div>
        <div class="nm" style="color:${R.color}">${esc(nm(c.name))}</div>
        <div class="small"><span class="hastip" data-tip="cl:${c.cls}">${ic('c_' + c.cls)} ${t('cl_' + c.cls)}<i class="qh">?</i></span> · <b style="color:${R.color}">${t('ar_' + c.rar)}</b></div>
        <div class="stats">${ic('i_hp')}${s.hp} ${ic('i_atk')}${s.atk} ${ic('i_def')}${s.def}</div>
        ${btn(t('hire'), 'hire', i, { cost: { gold: G.T.hireCost(c) }, cls: 'primary small', lock: full })}</div>`;
    }).join('');
    return `<div class="box"><h3>${h().tipTitle(ic('i_people') + ' ' + t('candidates'), 'rerollHint', t('rerollHint') + (G.S.tavern.rr ? ' ' + t('rerollCount', { n: G.S.tavern.rr }) : ''))} <span class="muted">${t('guildSize')}: ${S.advs.length}/${G.T.maxAdvs()}</span></h3>
      ${full ? `<div class="warn small">${t('guildFull')}</div>` : ''}
      <div class="hgrid">${cards || `<div class="muted">${t('noCands')}</div>`}</div>
      <div class="row"><span class="muted small">${ic('i_clock')} ${t('newIn')} <span data-b="tavT"></span></span><span class="grow"></span>${btn(ic('i_people') + ' ' + t('reroll'), 'reroll', '', { cost: G.T.refreshCost(), cls: 'small' })}</div>
      <div class="row"><button class="btn small" data-action="tab" data-arg="guild">${ic('i_people')} ${t('toGuild')}</button></div></div>
      <div class="box"><h3>${ic('i_star')} ${t('rarityChances')}</h3>${chancesRow(D.ARAR, G.T.rarChances(), G.T.rarOpen, 'ar')}</div>`;
  };

  // ---------- исследования прямо в панели академии ----------
  P.research = function () {
    const { ic, t, btn, costHtml, bar } = h();
    const AL = G.E.lvl('academy');
    const act = G.R.active(), full = !G.R.free();
    let top = act.length ? act.map((c) => `<div class="job" data-tip="s:${c.id}">${ic(G.R.get(c.id).icon, 'ic2')}<div class="grow"><div>${t('rs_' + c.id)}</div>${bar('rsch:' + c.id)}<div class="muted small" data-b="rschT:${c.id}"></div></div><button class="btn small" data-action="resCancel" data-arg="${c.id}" title="${t('cancelRefund')}">${ic('i_x')}</button></div>`).join('') + `<div class="hint">${t('resBoostHint', { n: G.U.fmt1(G.R.boostSec()) })}</div>` : `<div class="muted small">${t('resIdle')}</div>`;
    if (act.length && !full) top += `<div class="good small">${t('resSlotFree')}</div>`;
    // очередь указа: порядок можно менять стрелками
    const q = G.S.decree.research;
    const queue = q.length ? q.map((id, i) => {
      const r = G.R.get(id), st = G.R.state(id);
      const note = P.resWait(id);
      return `<div class="dq" data-tip="s:${id}">${ic(r.icon, 'ic2')}<div class="grow">${i + 1}. <b class="hastip">${t('rs_' + id)}<i class="qh">?</i></b><div class="row">${costHtml(r.cost)}<span class="muted small">${ic('i_clock')} ${G.U.fmtTime(G.R.time(r))}</span>${note}</div></div>
        <button class="btn small" data-action="decreeUp" data-arg="research|${i}" ${i ? '' : 'disabled'} title="${t('prioUp')}">▲</button><button class="btn small" data-action="decreeDown" data-arg="research|${i}" ${i < q.length - 1 ? '' : 'disabled'} title="${t('prioDown')}">▼</button><button class="btn small" data-action="decreeDel" data-arg="research|${i}" title="${t('cancel')}">${ic('i_x')}</button></div>`;
    }).join('') : `<div class="muted small">${t('acadQueueEmpty')}</div>`;
    top += `<div class="muted small">${t('resDone', { n: G.R.doneCount(), m: D.RESEARCH.length })} · ${t('resSpeed', { n: G.R.speed().toFixed(1) })}</div>`;
    const levels = [...new Set(D.RESEARCH.map((r) => r.acad))].sort((a, b) => a - b);
    const groups = levels.map((L) => `<h4>${t('acadLvl', { l: L })} ${AL < L ? ic('i_lock') : ''}</h4><div class="rgrid">${D.RESEARCH.filter((r) => r.acad === L).map((r) => {
      const st = G.R.state(r.id);
      const queued = G.S.decree.research.includes(r.id);
      let ra = '';
      if (st === 'done') ra = `<span class="good small">${ic('i_check')} ${t('researched')}</span>`;
      else if (st === 'cur') ra = `<span class="warn small">${t('researching')}</span>`;
      else {
        if (st === 'open') ra += btn(t('study'), 'research', r.id, { cost: r.cost, chips: false, cls: 'small primary', lock: full });
        else ra += `<span class="muted small">${ic('i_lock')} ${r.req && !G.R.done(r.req) ? t('needRes', { r: `<span class="tipword" data-tip="s:${r.req}">${t('rs_' + r.req)}</span>` }) : t('needAcad', { l: r.acad })}</span>`;
        ra += ` <button class="btn small" data-action="resQueue" data-arg="${r.id}" ${queued ? 'disabled' : ''}>${ic('i_scroll')} ${queued ? t('queuedPos', { n: G.S.decree.research.indexOf(r.id) + 1 }) : t('toDecree')}</button>`;
      }
      return `<div class="rcard2 st-${st}" data-tip="s:${r.id}">${ic(r.icon, 'ic2')}<div class="grow"><b class="hastip">${t('rs_' + r.id)}<i class="qh">?</i></b>${st === 'done' ? '' : `<div class="row">${costHtml(r.cost)}<span class="muted small">${ic('i_clock')} ${G.U.fmtTime(G.R.time(r))}</span></div>`}<div class="row">${ra}</div></div></div>`;
    }).join('')}</div>`).join('');
    return `<div class="box"><h3>${ic('i_book')} ${t('researchNow')} <span class="muted">${act.length}/${G.R.slots()}</span></h3>${top}</div>
      <div class="box"><h3>${h().tipTitle(ic('i_scroll') + ' ' + t('acadQueue'), 'acadQueueHint')} <span class="muted">${q.length}/12</span></h3>${queue}</div>
      <div class="box"><h3>${h().tipTitle(ic('i_book') + ' ' + t('researchTitle'), 'researchHint')}</h3>${groups}</div>`;
  };

  // Пометка у записи указа, которую указ пока пропускает
  P.resWait = function (id) {
    const { ic, t } = h();
    const r = G.R.get(id), why = G.R.waitReason(id);
    if (!why) return '';
    const txt = why === 'academy' ? t('needAcad', { l: r.acad }) : why === 'req' ? t('needRes', { r: t('rs_' + r.req) }) : t('needStorageShort');
    return `<span class="warn small" title="${t('skipHint')}">${ic('i_lock')} ${txt} · ${t('skipped')}</span>`;
  };

  // ---------- карточка авантюриста (во вкладке «Гильдия») ----------
  P.char = function (id) {
    const { ic, t, nm, esc, bar, pips } = h();
    const a = G.T.get(id);
    if (!a) return '';
    const R = D.ARAR[a.rar], s = G.T.stats(a), sp = G.T.sp(a);
    const skills = D.SKILLS[a.cls].map((sk) => {
      const r = (a.sk && a.sk[sk.id]) || 0;
      return `<div class="skill cat-${sk.cat}" data-tip="sk:${a.id}|${sk.id}">${ic(sk.icon, 'ic2')}<div class="grow"><span class="skcat">${ic(D.SKILL_CATS[sk.cat])} ${t('skc_' + sk.cat)}</span><b class="hastip">${t('sk_' + sk.id)}<i class="qh">?</i></b><div class="skrank">${pips(r, D.SKILL_MAX)}<span class="small muted">${r}/${D.SKILL_MAX}</span></div></div><button class="btn small" data-action="learn" data-arg="${a.id}|${sk.id}" ${sp > 0 && r < D.SKILL_MAX ? '' : 'disabled'}>+</button></div>`;
    }).join('');
    const xpw = Math.min(100, (a.xp / G.T.xpNeed(a.lvl)) * 100).toFixed(1);
    const canDismiss = a.st !== 'dungeon' && a.st !== 'arena' && a.st !== 'journey' && !(G.W.active() && a.st === 'gate');
    return `<div class="box charbox" style="--rc:${R.color}">
      <div class="chead"><div class="por big" style="--rc:${R.color}">${ic('c_' + a.cls, 'ic4')}</div>
        <div class="grow"><h2 style="color:${R.color}">${esc(nm(a.name))}</h2>
          <div><span class="hastip" data-tip="cl:${a.cls}">${ic('c_' + a.cls)} ${t('cl_' + a.cls)}<i class="qh">?</i></span> · <b style="color:${R.color}">${t('ar_' + a.rar)}</b> · ${t('lv')} <b>${a.lvl}</b>${a.prest ? ` · <b class="gold">★${a.prest}</b>` : ''}</div>
          ${a.prest ? `<div class="small good">${t('prestTitle', { n: a.prest, p: Math.round(D.PREST_BONUS * a.prest * 100) })}</div>` : ''}
          <div class="stats big">${ic('i_hp')}<span data-b="hp:${a.id}"></span> ${ic('i_atk')}${s.atk} ${ic('i_def')}${s.def}</div>
          ${bar('hp:' + a.id, 'hp')}
          <div class="bar xp"><i style="width:${xpw}%"></i></div><div class="small muted">${t('xp')}: ${Math.floor(a.xp)} / ${G.T.xpNeed(a.lvl)}</div>
          <div class="ast">${h().tipTitle(h().stIcon(a), 'assignHint')}</div></div></div>
      <h3>${ic('i_chest')} ${t('equipment')}</h3><div class="eqrow">${P.eqSlots(a.id, ['weapon', 'armor'])}</div>${pickerFor(a.id, ['weapon', 'armor'])}
      <h3>${h().tipTitle(ic('i_star') + ' ' + t('skills'), 'skillRanksHint')} <span class="muted">${t('skillPts')}: <b class="${sp ? 'good' : ''}">${sp}</b></span></h3><div class="skills">${skills}</div>
      ${canDismiss ? `<div class="right"><button class="btn danger small" data-action="dismiss" data-arg="${a.id}">${t('dismiss')}</button></div>` : ''}</div>`;
  };

  // ---------- карточка предмета (во вкладке «Арсенал») ----------
  P.item = function (id) {
    const { ic, t, esc, btn, itemMain } = h();
    const it = G.F.get(id);
    if (!it) return '';
    const R = D.IRAR[it.rar], ty = D.ITYPES[it.type];
    const owners = [];
    if (ty.slot === 'weapon') owners.push(['king', 'c_king', t('king')]);
    for (const a of G.S.advs) if (G.F.canUse(it, a.id)) owners.push([a.id, 'c_' + a.cls, h().nm(a.name)]);
    const locked = G.F.lockedOwner(it.eq);
    const ownerBtns = owners.map(([o, icon, name]) => `<button class="obtn ${it.eq === o ? 'on' : ''}" data-action="eq" data-arg="${it.id}|${o}" ${it.eq === o || locked || G.F.lockedOwner(o) ? 'disabled' : ''} title="${esc(name)}">${ic(icon, 'ic2')}<span>${esc(name)}</span>${it.eq === o ? `<span class="small muted">${t('equippedBy')}</span>` : P.diffHtml(P.gain(it, o))}</button>`).join('');
    const aff = it.aff.length ? `<div class="aff">${it.aff.map((a) => `+${a.v} ${t('st_' + a.k)}`).join(' · ')}</div>` : '';
    let ench;
    if (!G.F.canEnchant()) ench = `<div class="muted small">${ic('i_lock')} ${t('enchLocked')}</div>`;
    else if (it.ench >= D.ENCH_MAX) ench = `<div class="small good">${t('enchMax')}</div>`;
    else ench = btn(ic('i_gem') + ' ' + t('enchant', { n: it.ench + 1 }), 'enchant', it.id, { cost: G.F.enchCost(it), lock: locked, cls: 'small' });
    const holder = it.eq === 'king' ? t('king') : it.eq ? esc(h().nm(G.T.get(it.eq).name)) : '';
    return `<div class="box itembox" style="--rc:${R.color}">
      <div class="ihead">${ic('it_' + it.type + ':' + it.ti, 'ic4')}<div class="grow"><h3 style="color:${R.color}">${esc(G.F.name(it))}</h3>
        <div class="small">${t('ir_' + it.rar)} · ${t('tier_' + it.ti)} · ${ty.cls ? t('cl_' + ty.cls) : t('anyClass')}</div>
        <div class="stats big">${itemMain(it)}</div>${aff}
        ${it.eq ? `<div class="eqnote">${h().ownerIcon(it.eq)} ${t('equippedBy')}: <b>${holder}</b></div>` : `<div class="muted small">${t('inStorage')}</div>`}</div>
        <button class="btn small" data-action="itemClose">${t('close')}</button></div>
      <div class="small muted">${t('equipOn')}</div><div class="owners">${ownerBtns || `<div class="muted small">${t('noOwners')}</div>`}</div>
      <div class="row">${ench}<span class="grow"></span>${it.eq ? `<button class="btn small" data-action="uneq" data-arg="${it.id}" ${locked ? 'disabled' : ''}>${t('unequip')}</button>` : `<button class="btn small" data-action="sellItem" data-arg="${it.id}">${t('sell')} ${ic('r_gold')}${G.F.sellValue(it)}</button>`}</div></div>`;
  };

  // ---------- Древо династии: после передачи трона (новая эпоха на паузе) и из вкладки «Король» ----------
  const TREE_CH = 84, ROMAN = ['I', 'II', 'III'];
  const BK_NEG = { hireC: 1, save: 1, buildC: 1 }; // эти бонусы уменьшают (цены, шанс гибели)
  // что даёт навык рода при текущем ранге — одной строкой
  P.perkNow = function (p, r) {
    const { t } = h();
    if (p.id === 'found') return t('bk_found', { n: Math.min(r, D.FOUND_ORDER.length) });
    if (p.id === 'start') return t('bk_start', { n: 500 * r });
    if (p.id === 'housing') return t('bk_housing', { n: p.eff.housing * r });
    if (p.id === 'example') return t('bk_clickProd', { n: G.U.fmt1(p.eff.clickProd * r) });
    return Object.keys(p.eff).map((k) => `${BK_NEG[k] ? '−' : '+'}${Math.round(p.eff[k] * r * 100)}% ${t('bk_' + k)}`).join(', ');
  };
  // «Бонусы рода» — сводка эффектов престижа без названий навыков: одинаковые эффекты складываются в одну строку
  P.dynEffects = function () {
    const { t } = h();
    const sum = {}, icon = {}, order = [];
    for (const p of D.PERKS) {
      const r = G.K.perkRank(p.id);
      if (!r) continue;
      if (p.id === 'found') { sum.found = r; icon.found = p.icon; order.push('found'); continue; }
      for (const k in p.eff) {
        if (sum[k] == null) { sum[k] = 0; icon[k] = p.icon; order.push(k); }
        sum[k] += p.eff[k] * r;
      }
    }
    return order.map((k) => {
      const v = sum[k];
      if (k === 'found') return [icon[k], t('bk_found', { n: Math.min(v, D.FOUND_ORDER.length) })];
      if (k === 'start') return [icon[k], t('bk_start', { n: 500 * v })];
      if (k === 'housing') return [icon[k], t('bk_housing', { n: v })];
      if (k === 'clickProd') return [icon[k], t('bk_clickProd', { n: G.U.fmt1(v) })];
      return [icon[k], `${BK_NEG[k] ? '−' : '+'}${Math.round(v * 100)}% ${t('bk_' + k)}`];
    });
  };
  P.dynTree = function () {
    const { ic } = h();
    const K = G.K, sel = G.UI.dynSel, H = D.DYN_ROWS * TREE_CH, pts = G.S.dyn.pts, NC = D.DYN_COLS, MID = (NC - 1) / 2, asc = !!G.S.ascend;
    const X = (c) => (c + 0.5) * 100, Y = (r) => r * TREE_CH + TREE_CH / 2;
    const lines = [];
    const seg = (pts2, cls) => lines.push(`<polyline class="${cls}" points="${pts2.map(([x, y]) => x + ',' + y).join(' ')}"/>`);
    for (let i = 1; i < D.DYN_TIERS.length; i++) seg([[X(MID), Y(D.DYN_TIERS[i - 1].r)], [X(MID), Y(D.DYN_TIERS[i].r)]], K.tierOpen(i) ? 'on' : '');
    for (const [id, n] of Object.entries(D.DYN_TREE)) {
      const cls = K.perkRank(id) > 0 ? 'own' : K.perkOpen(id) ? 'on' : '';
      if (n.p) { const q = D.DYN_TREE[n.p]; seg([[X(q.c), Y(q.r)], [X(n.c), Y(n.r)]], cls); continue; }
      const hr = D.DYN_TIERS[n.t].r, mx = X(MID) + (n.c < MID ? -50 : 50);
      seg(n.r === hr ? [[X(MID), Y(hr)], [X(n.c), Y(n.r)]] : [[X(MID), Y(hr)], [mx, Y(hr)], [mx, Y(n.r)], [X(n.c), Y(n.r)]], cls);
    }
    const pos = (c, r) => `left:${((c + 0.5) * 100) / NC}%;top:${Y(r)}px`;
    let nodes = D.DYN_TIERS.map((tr, i) => `<button class="dnode hub ${K.tierOpen(i) ? '' : 'locked'} ${sel === 'tier' + i ? 'sel' : ''}" data-action="dynSel" data-arg="tier${i}" style="${pos(MID, tr.r)}">${ic('i_scroll', 'ic2')}<b class="tnum">${ROMAN[i]}</b></button>`).join('');
    for (const p of D.PERKS) {
      const n = D.DYN_TREE[p.id];
      if (!n) continue;
      const r = K.perkRank(p.id), open = K.perkOpen(p.id), max = r >= D.PERK_MAX;
      const st = !open ? 'locked' : max ? 'max' : r > 0 ? 'own' : '';
      const can = asc && open && !max && pts >= K.perkCost(p.id);
      nodes += `<button class="dnode ${st} ${can ? 'can' : ''} ${sel === p.id ? 'sel' : ''}" data-action="dynSel" data-arg="${p.id}" data-tip="pk:${p.id}" style="${pos(n.c, n.r)}">${ic(p.icon, 'ic2')}${r ? `<em class="drank">${r}</em>` : ''}${open ? '' : `<i class="dlock">${ic('i_lock')}</i>`}</button>`;
    }
    // звезда стоит у самой высокой открытой ступени и не двигается при выборе навыков
    let top = 0;
    D.DYN_TIERS.forEach((tr, i) => { if (K.tierOpen(i)) top = i; });
    const star = `<div class="dyn-star" aria-hidden="true" style="top:${Y(D.DYN_TIERS[top].r)}px"></div>`;
    return `${star}<div class="dtree" data-keep="dtree"><div class="dtree-in" style="height:${H}px"><svg class="dlines" viewBox="0 0 ${NC * 100} ${H}" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>${nodes}</div></div>`;
  };
  // карточка выбранного: ступень или навык рода
  P.dynDetail = function (sel) {
    const { ic, t, pips } = h();
    const K = G.K;
    if (sel && sel.startsWith('tier')) {
      const i = +sel.slice(4), tr = D.DYN_TIERS[i], open = K.tierOpen(i);
      return `<div class="ddet"><div class="ddh">${ic('i_scroll', 'ic3')}<div><h3>${t('tierN', { r: ROMAN[i] })}</h3><div class="${open ? 'good' : 'warn'} small">${open ? t('tierOpenTxt') : t('tierNeed', { n: tr.need, c: K.perkRanks() })}</div></div></div>
        <div class="small muted">${t('tierHint')}</div></div>`;
    }
    const p = sel && D.PERKS.find((x) => x.id === sel);
    if (!p) return `<div class="muted small">${t('dynPick')}</div>`;
    const r = K.perkRank(p.id), n = D.DYN_TREE[p.id], open = K.perkOpen(p.id), max = r >= D.PERK_MAX, cost = K.perkCost(p.id), pts = G.S.dyn.pts;
    let need = '';
    if (!open) need = n && !K.tierOpen(n.t) ? t('nodeNeedTier', { r: ROMAN[n.t], n: D.DYN_TIERS[n.t].need }) : t('nodeNeedParent', { p: t('pk_' + n.p) });
    const nextB = p.id === 'found' && r < D.FOUND_ORDER.length ? `<div class="small good">${t('foundNext', { b: t('bn_' + D.FOUND_ORDER[r]) })}</div>` : '';
    return `<div class="ddet"><div class="ddh">${ic(p.icon, 'ic3')}<div><h3>${t('pk_' + p.id)}</h3>${pips(Math.min(r, 10), D.PERK_MAX)}<div class="small muted">${t('rankOf', { r, m: D.PERK_MAX })}</div></div></div>
      <div>${t('pkd_' + p.id)}</div>
      ${r ? `<div class="small good">${t('dynNow')}: ${P.perkNow(p, r)}</div>` : ''}${!max ? `<div class="small">${t('dynNext')}: ${P.perkNow(p, r + 1)}</div>` : ''}${nextB}
      ${need ? `<div class="warn small">${ic('i_lock')} ${need}</div>` : ''}
      ${max ? `<div class="good small">${t('maxLevel')}</div>` : `<button class="btn primary" data-action="perk" data-arg="${p.id}" ${G.S.ascend && open && pts >= cost ? '' : 'disabled'}>${t('nodeUp')} · ${cost} ${ic('i_crown')}</button>`}
      ${!max && !G.S.ascend ? `<div class="muted small">${ic('i_lock')} ${t('dynOnlyAscend')}</div>` : ''}</div>`;
  };
  W.dynasty = function (arg) {
    const { ic, t, esc } = h();
    const asc = arg === 'ascend' && G.S.ascend;
    const dyn = G.S.dyn;
    const bon = P.dynEffects().map(([icon, txt]) => `<li>${ic(icon)}<span>${txt}</span></li>`).join('');
    return `<div class="dynwin">
      <div class="dynhead">
        <div class="grow"><h2>${ic('i_crown', 'ic2')} ${t('dynTree')}</h2><div class="muted">${t('epoch')} ${dyn.epoch + 1}</div></div>
        <div class="dynpts">${ic('i_crown')} ${t('legacyPts')}: <b>${dyn.pts}</b></div>
        ${asc ? '' : `<button class="xclose" data-action="mclose" title="${t('close')}">✕</button>`}
      </div>
      <div class="dynbody">
        <div class="dyncenter">${P.dynTree()}</div>
        <div class="dyncard ddetail">${P.dynDetail(G.UI.dynSel)}</div>
        <div class="dyncard dbonus"><h3>${t('perkBonusTitle')}</h3>
          <div class="muted small">${t('dynEpochInfo', { n: dyn.epoch + 1, e: G.U.fmt1(G.K.epochMul()), r: G.U.fmt1(G.K.epochReward()) })}</div>
          ${bon ? `<ul class="dbon">${bon}</ul>` : `<div class="muted small">${t('perkNoBonus')}</div>`}</div>
      </div>
      <div class="dynfoot">${asc ? `<button class="btn primary big" data-action="ascBegin">${ic('i_crown')} ${t('ascBegin')}</button>` : `<button class="btn" data-action="mclose">${t('close')}</button>`}</div>
    </div>`;
  };

  // ---------- окно целей ----------
  // ---------- Путешествие: области по 5 этапов, на каждом свой босс ----------
  W.journey = function () {
    const { ic, t, lootHtml, advTile, monSpr, esc } = h();
    const J = G.J, S = J.S(), shown = J.shownRegions();
    let map = '';
    for (let ri = 0; ri < shown; ri++) {
      const R = J.REGIONS[ri % J.REGIONS.length], lap = Math.floor(ri / J.REGIONS.length);
      const a = ri * J.PER + 1, b = a + J.PER - 1, locked = !J.unlocked(a);
      let nodes = '';
      for (let st = a; st <= b; st++) {
        const cls = st <= S.best ? 'done' : J.unlocked(st) ? 'cur' : 'locked';
        nodes += `<button class="jnode ${cls} ${S.sel === st ? 'sel' : ''} ${st % J.PER === 0 ? 'big' : ''}" data-action="jSel" data-arg="${st}" ${cls === 'locked' ? 'disabled' : ''} title="${esc(t(J.bossName(st)))}">
          <span class="jimg" style="filter:${R.filter}">${ic(monSpr(J.bossKey(st)), 'ic3')}</span><b>${st}</b>${cls === 'done' ? ic('i_check') : cls === 'locked' ? ic('i_lock') : ''}</button>`;
      }
      map += `<div class="jreg ${locked ? 'locked' : ''}" data-r="${R.id}"><div class="jrh"><b>${t('jr_' + R.id)}${lap ? ' ' + 'I'.repeat(lap + 1) : ''}</b><span class="muted small">${t('jrStages', { a, b })}</span></div><div class="jpath">${nodes}</div></div>`;
    }
    // выбранный этап
    const st = S.sel, R = J.region(st), tm = J.team(), n = Math.max(1, tm.length), en = J.opp(st, n), first = st > S.best, why = J.whyNot();
    const idle = G.S.advs.filter((a) => (a.st === 'idle' && a.hp > 0) || S.team.includes(a.id));
    const chance = tm.length ? Math.round(J.chance() * 100) : 0;
    const whyTxt = why === 'stage' ? t('jrNeedPrev', { s: st - 1 }) : why === 'team' ? t('arenaNoTeam') : why === 'battle' ? t('jrBusy') : why === 'fight' ? t('arenaLive') : '';
    const det = `<div class="jdetail">
      <div class="jboss"><span class="jbig" style="filter:${R.filter}">${ic(monSpr(en.key), 'ic4')}</span>
        <div class="grow"><div class="muted small">${t('jr_' + R.id)} · ${t('jrStage', { s: st })}</div><h3>${esc(t(J.bossName(st)))}</h3>
          <div>${ic('i_hp')} ${G.U.fmt(en.hp)} · ${ic('i_atk')} ${G.U.fmt(en.atk)} <span class="muted small">${t('jrForTeam', { n })}</span></div>
          <div class="small">${t(first ? 'jrRewardFirst' : 'jrRewardAgain')}: ${lootHtml(J.reward(st, first))}${J.itemChance(st, first) ? ` · ${ic('i_chest')} ${t('jrItemChance', { p: Math.round(J.itemChance(st, first) * 100) })}` : ''}</div>
          ${tm.length ? `<div class="small ${chance >= 60 ? 'good' : chance >= 30 ? 'warn' : 'bad'}">${t('winChance')}: ${chance}%</div>` : ''}
        </div></div>
      <button class="btn primary big" data-action="jFight" ${why ? 'disabled' : ''}>${ic('i_atk')} ${why ? whyTxt : t('jrFight')}</button>
      <h3>${h().tipTitle(ic('i_people') + ' ' + t('arenaTeam'), 'jrHint')} <span class="muted">${tm.length}/${J.teamMax()}</span></h3>
      ${idle.length ? `<div class="tiles">${idle.map((a) => advTile(a, 'jPick', a.id, S.team.includes(a.id) && a.st === 'idle')).join('')}</div>` : `<div class="muted small">${t('noIdle')}</div>`}
      </div>`;
    return `<button class="xclose" data-action="mclose" title="${t('close')}">✕</button><h2>${h().tipTitle(ic('i_ship', 'ic2') + ' ' + t('journey'), 'journeyHint', t('journeyHint', { b: S.best }))}</h2>
      <div class="jwrap"><div class="jmap" data-keep="jmap">${map}</div>${det}</div>`;
  };

  // Список всех целей: сданные, три текущих (с кнопками) и закрытые — во вкладке «Все цели» под картой и в окне
  P.goalsList = function () {
    const { ic, t, lootHtml } = h();
    const Q = G.E.gq(), vis = G.E.goalsVisible().map((g) => g.id);
    return `<div class="glist">${D.GOALS.map((g, i) => {
        const done = !!Q.done[g.id], cur = vis.includes(g.id), A = Q.acc[g.id], ready = A && A.r;
        const btn = !cur ? '' : !A ? `<button class="btn small primary" data-action="gAccept" data-arg="${g.id}">${t('goalAccept')}</button>`
          : ready ? `<button class="btn small claim" data-action="gClaim" data-arg="${g.id}">${t('goalClaim')}</button>` : `<button class="btn small" data-action="goGoal" data-arg="${g.id}">${t('goalGo')} ›</button>`;
        return `<div class="gitem ${done ? 'done' : cur ? 'cur' : 'later'}" ${g.h && g.h.act === 'research' && g.h.arg ? `data-tip="s:${g.h.arg}"` : ''}>${ic(done ? 'i_check' : cur ? 'i_star' : 'i_lock')}<span class="grow">${i + 1}. ${t(g.t)}${cur && A && g.v ? ` <b class="gprog" data-b="gp:${g.id}" ${g.d ? `title="${t('goalProgTip')}"` : ''}></b>` : ''}</span><span class="small">${lootHtml(g.reward)}</span>${btn}</div>`;
      }).join('')}</div>`;
  };
  W.goals = function () {
    const { ic, t } = h();
    return `<button class="xclose" data-action="mclose" title="${t('close')}">✕</button><h2>${h().tipTitle(ic('i_star', 'ic2') + ' ' + t('goalsTitle'), 'goalsHint')}</h2>${P.goalsList()}`;
  };
})();
