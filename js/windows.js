// Отдельные окна: кузня, найм, персонаж, предмет, выбор снаряжения, цели, исследования.
(function () {
  const D = G.D;
  const W = (G.WIN = {});
  const h = () => G.UI.h;
  const close = () => `<button class="xclose" data-action="mclose" title="${G.t('close')}">✕</button>`;

  // ---------- кузня ----------
  W.craft = function () {
    const { ic, t, nm, esc, btn, chancesRow, bar, costHtml } = h();
    const sel = G.UI.craft;
    if (!G.F.unlocked(sel.ti)) sel.ti = 0;
    const ty = D.ITYPES[sel.type], T = D.TIERS[sel.ti], R1 = D.IRAR;
    const q = G.S.forge.q, full = q.length >= G.F.qMax();
    const cats = Object.keys(D.ITYPES).map((k) => `<button class="cat ${sel.type === k ? 'on' : ''}" data-action="craftType" data-arg="${k}" title="${esc(t('it_' + k))}">${ic('it_' + k + ':' + sel.ti, 'ic3')}<span>${t('it_' + k)}</span></button>`).join('');
    const tiers = D.TIERS.map((x, i) => {
      const open = G.F.unlocked(i);
      return `<button class="tierb ${sel.ti === i ? 'on' : ''}" data-action="craftTier" data-arg="${i}" ${open ? '' : 'disabled'}>${ic(open ? 'it_' + sel.type + ':' + i : 'i_lock', 'ic2')}<span>${t('tier_' + i)}</span>${open ? '' : `<i>${t('fromLvl', { l: x.req })}</i>`}</button>`;
    }).join('');
    const base = ty.slot === 'weapon'
      ? `${ic('i_atk')} ${Math.round(T.atk * ty.mod)}–${Math.round(T.atk * ty.mod * R1[4].mult)}`
      : `${ic('i_def')} ${T.def}–${Math.round(T.def * R1[4].mult)} · ${ic('i_hp')} ${T.hp}–${Math.round(T.hp * R1[4].mult)}`;
    const who = ty.cls ? `${ic('c_' + ty.cls)} ${t('cl_' + ty.cls)}` : `${ic('i_people')} ${t('anyClass')}`;
    const cost = G.F.cost(sel.type, sel.ti);
    const queue = q.length ? q.map((j, i) => `<div class="job">${ic('it_' + j.type + ':' + j.ti, 'ic2')}<div class="grow"><div>${esc(nm(G.F.jobName(j)))}</div>${i === 0 ? `${bar('forge')}<div class="muted small" data-b="forgeT"></div>` : `<div class="muted small">${t('queued')}</div>`}</div><button class="btn small" data-action="craftCancel" data-arg="${i}" title="${esc(t('cancelRefund'))}">${ic('i_x')} ${t('cancel')}</button></div>`).join('') : `<div class="muted small">${t('forgeIdle')}</div>`;
    return `${close()}<h2>${ic('i_anvil', 'ic2')} ${t('craftTitle')}</h2>
      <div class="craftwin">
        <div class="cats">${cats}</div>
        <div class="cmain">
          <div class="tiers">${tiers}</div>
          <div class="rcard" style="--rc:#d8d8d8">
            ${ic('it_' + sel.type + ':' + sel.ti, 'ic5')}
            <div class="grow">
              <div class="nm big">${esc(nm(G.F.jobName(sel)))}</div>
              <div class="small">${who}</div>
              <div class="small">${base}</div>
              <div class="small muted">${ic('i_clock')} ${G.U.fmtTime(T.time / G.F.speed())}</div>
            </div>
          </div>
          <div class="small muted">${t('rarityChances')}</div>
          ${chancesRow(D.IRAR, G.F.rarChances(), G.F.rarOpen, 'ir')}
          <div class="row">${costHtml(cost)}</div>
          ${btn(ic('i_hammer') + ' ' + t('craft'), 'craft', '', { cost, chips: false, cls: 'primary big', lock: full })}
          ${full ? `<div class="warn small">${t('queueFull')}</div>` : ''}
        </div>
      </div>
      <h3>${ic('i_clock')} ${t('forgeQueue')} <span class="muted">${q.length}/${G.F.qMax()}</span></h3>${queue}`;
  };

  // ---------- таверна: найм ----------
  W.hire = function () {
    const { ic, t, nm, esc, btn, chancesRow } = h();
    const S = G.S, full = S.advs.length >= G.T.maxAdvs();
    const cards = S.tavern.cands.map((c, i) => {
      const R = D.ARAR[c.rar], s = G.T.stats(c);
      return `<div class="hcard" style="--rc:${R.color}">
        <div class="por big">${ic('c_' + c.cls, 'ic4')}</div>
        <div class="nm" style="color:${R.color}">${esc(nm(c.name))}</div>
        <div class="small">${ic('c_' + c.cls)} ${t('cl_' + c.cls)} · <b style="color:${R.color}">${t('ar_' + c.rar)}</b></div>
        <div class="stats">${ic('i_hp')}${s.hp} ${ic('i_atk')}${s.atk} ${ic('i_def')}${s.def}</div>
        <div class="small muted">${t('cld_' + c.cls)}</div>
        ${btn(t('hire'), 'hire', i, { cost: { gold: c.cost }, cls: 'primary', lock: full })}
      </div>`;
    }).join('');
    return `${close()}<h2>${ic('i_people', 'ic2')} ${t('hireTitle')}</h2>
      <div class="row"><span>${t('guildSize')}: <b>${S.advs.length}/${G.T.maxAdvs()}</b></span><span class="grow"></span><span class="muted small">${ic('i_clock')} ${t('newIn')} <span data-b="tavT"></span></span>${btn(ic('i_people') + ' ' + t('reroll'), 'reroll', '', { cost: G.T.refreshCost(), cls: 'small' })}</div>
      ${full ? `<div class="warn small">${t('guildFull')}</div>` : ''}
      <div class="hgrid">${cards || `<div class="muted">${t('noCands')}</div>`}</div>
      <div class="small muted">${t('rarityChances')}</div>${chancesRow(D.ARAR, G.T.rarChances(), G.T.rarOpen, 'ar')}`;
  };

  // ---------- персонаж ----------
  W.char = function (id) {
    const { ic, t, nm, esc, bar, pips, itemTile, eqSlot } = h();
    const a = G.T.get(id);
    if (!a) return `${close()}<div class="muted">${t('gone')}</div>`;
    const R = D.ARAR[a.rar], s = G.T.stats(a), sp = G.T.sp(a);
    const battle = G.W.active();
    const slots = ['weapon', 'armor'].map((slot) => {
      const it = G.F.equipped(a.id, slot);
      const lab = slot === 'weapon' ? t('weapon') : t('armor');
      return `<button class="eq big ${it ? 'has' : ''} ${G.UI.charPick === slot ? 'on' : ''}" data-action="charPick" data-arg="${slot}" ${G.F.lockedOwner(a.id) ? 'disabled' : ''} ${it ? `style="--rc:${D.IRAR[it.rar].color}"` : ''}>
        ${it ? ic('it_' + it.type + ':' + it.ti, 'ic3') : `<span class="ph">${ic(slot === 'weapon' ? 'i_atk' : 'i_def', 'ic2')}</span>`}
        <span class="grow"><span class="small muted">${lab}</span><br>${it ? `<span style="color:${D.IRAR[it.rar].color}">${esc(G.F.name(it))}</span>` : `<span class="muted">${t('empty')}</span>`}</span></button>`;
    }).join('');
    let picker = '';
    if (G.UI.charPick) {
      const slot = G.UI.charPick, cur = G.F.equipped(a.id, slot);
      const list = G.S.items.filter((it) => G.F.slotOf(it) === slot && it.eq !== a.id && G.F.canUse(it, a.id) && !G.F.lockedOwner(it.eq)).sort((x, y) => G.F.score(y) - G.F.score(x));
      picker = `<div class="picker"><div class="row"><b>${t('chooseItem')}</b><span class="grow"></span>${cur ? `<button class="btn small" data-action="uneq" data-arg="${cur.id}">${ic('i_x')} ${t('unequip')}</button>` : ''}</div>
        <div class="igrid">${list.map((it) => itemTile(it, 'eq', it.id + '|' + a.id)).join('') || `<div class="muted small">${t('noItems')}</div>`}</div></div>`;
    }
    const skills = D.SKILLS[a.cls].map((sk) => {
      const r = (a.sk && a.sk[sk.id]) || 0;
      return `<div class="skill">${ic(sk.icon, 'ic2')}<div class="grow"><b>${t('sk_' + sk.id)}</b> ${pips(r, D.SKILL_MAX)}<div class="small muted">${t('skd_' + sk.id)}</div></div><button class="btn small" data-action="learn" data-arg="${a.id}|${sk.id}" ${sp > 0 && r < D.SKILL_MAX ? '' : 'disabled'}>+</button></div>`;
    }).join('');
    const xpw = Math.min(100, (a.xp / G.T.xpNeed(a.lvl)) * 100).toFixed(1);
    let act = '';
    if (!battle && a.st === 'idle') act += `<button class="btn" data-action="gate" data-arg="${a.id}" ${G.T.gateCount() >= G.T.gateMax() ? 'disabled' : ''}>${ic('i_tower')} ${t('toWall')}</button>`;
    if (!battle && a.st === 'gate') act += `<button class="btn" data-action="gate" data-arg="${a.id}">${ic('i_tower')} ${t('removeWall')}</button>`;
    if (a.st !== 'dungeon' && !(battle && a.st === 'gate')) act += `<button class="btn danger" data-action="dismiss" data-arg="${a.id}">${t('dismiss')}</button>`;
    return `${close()}<div class="charwin">
      <div class="chead"><div class="por big" style="--rc:${R.color}">${ic('c_' + a.cls, 'ic5')}</div>
        <div class="grow"><h2 style="color:${R.color}">${esc(nm(a.name))}</h2>
          <div>${ic('c_' + a.cls)} ${t('cl_' + a.cls)} · <b style="color:${R.color}">${t('ar_' + a.rar)}</b> · ${t('lv')} <b>${a.lvl}</b></div>
          <div class="stats big">${ic('i_hp')}<span data-b="hp:${a.id}"></span> ${ic('i_atk')}${s.atk} ${ic('i_def')}${s.def}</div>
          ${bar('hp:' + a.id, 'hp')}
          <div class="bar xp"><i style="width:${xpw}%"></i></div><div class="small muted">${t('xp')}: ${Math.floor(a.xp)} / ${G.T.xpNeed(a.lvl)}</div>
          <div class="ast">${h().stIcon(a)}</div></div></div>
      <h3>${ic('i_chest')} ${t('equipment')}</h3><div class="eqrow">${slots}</div>${picker}
      <h3>${ic('i_star')} ${t('skills')} <span class="muted">${t('skillPts')}: <b class="${sp ? 'good' : ''}">${sp}</b></span></h3><div class="skills">${skills}</div>
      <div class="right">${act}</div></div>`;
  };

  // ---------- предмет ----------
  W.item = function (id) {
    const { ic, t, esc, btn, itemMain } = h();
    const it = G.F.get(id);
    if (!it) return `${close()}<div class="muted">${t('gone')}</div>`;
    const R = D.IRAR[it.rar], ty = D.ITYPES[it.type];
    const owners = [];
    if (ty.slot === 'weapon') owners.push(['king', 'c_king', t('king')]);
    for (const a of G.S.advs) if (G.F.canUse(it, a.id)) owners.push([a.id, 'c_' + a.cls, h().nm(a.name)]);
    const locked = G.F.lockedOwner(it.eq);
    const ownerBtns = owners.map(([o, icon, name]) => `<button class="obtn ${it.eq === o ? 'on' : ''}" data-action="eq" data-arg="${it.id}|${o}" ${it.eq === o || locked || G.F.lockedOwner(o) ? 'disabled' : ''} title="${esc(name)}">${ic(icon, 'ic2')}<span>${esc(name)}</span></button>`).join('');
    const aff = it.aff.length ? `<div class="aff">${it.aff.map((a) => `+${a.v} ${t('st_' + a.k)}`).join(' · ')}</div>` : '';
    let ench = '';
    if (G.F.canEnchant()) {
      ench = it.ench >= D.ENCH_MAX ? `<div class="small good">${t('enchMax')}</div>` : btn(ic('i_gem') + ' ' + t('enchant', { n: it.ench + 1 }), 'enchant', it.id, { cost: G.F.enchCost(it), lock: locked });
    } else ench = `<div class="muted small">${ic('i_lock')} ${t('enchLocked')}</div>`;
    return `${close()}<div class="itemwin" style="--rc:${R.color}">
      <div class="ihead">${ic('it_' + it.type + ':' + it.ti, 'ic5')}<div class="grow"><h2 style="color:${R.color}">${esc(G.F.name(it))}</h2>
        <div class="small">${t('ir_' + it.rar)} · ${t('tier_' + it.ti)} · ${ty.cls ? t('cl_' + ty.cls) : t('anyClass')}</div>
        <div class="stats big">${itemMain(it)}</div>${aff}
        ${it.eq ? `<div class="eqnote">${h().ownerIcon(it.eq)} ${t('equippedBy')}: <b>${it.eq === 'king' ? t('king') : esc(h().nm(G.T.get(it.eq).name))}</b></div>` : `<div class="muted small">${t('inStorage')}</div>`}</div></div>
      <h3>${t('equipOn')}</h3><div class="owners">${ownerBtns || `<div class="muted small">${t('noOwners')}</div>`}</div>
      <h3>${ic('i_gem')} ${t('enchantTitle')} <span class="muted">+${it.ench}/${D.ENCH_MAX}</span></h3>${ench}
      <div class="right">${it.eq ? `<button class="btn" data-action="uneq" data-arg="${it.id}" ${locked ? 'disabled' : ''}>${t('unequip')}</button>` : `<button class="btn" data-action="sellItem" data-arg="${it.id}">${t('sell')} ${ic('r_gold')}${G.F.sellValue(it)}</button>`}</div></div>`;
  };

  // ---------- выбор снаряжения (для короля) ----------
  W.pick = function (arg) {
    const { ic, t, itemTile } = h();
    const [owner, slot] = arg.split('|');
    if (owner !== 'king') { G.UI.charPick = slot; return W.char(owner); }
    const cur = G.F.equipped(owner, slot);
    const list = G.S.items.filter((it) => G.F.slotOf(it) === slot && it.eq !== owner && G.F.canUse(it, owner) && !G.F.lockedOwner(it.eq)).sort((x, y) => G.F.score(y) - G.F.score(x));
    return `${close()}<h2>${ic('c_king', 'ic2')} ${t('kingEq')}</h2>
      ${cur ? `<div class="row">${itemTile(cur)}<button class="btn small" data-action="uneq" data-arg="${cur.id}">${ic('i_x')} ${t('unequip')}</button></div>` : ''}
      <h3>${t('chooseItem')}</h3><div class="igrid">${list.map((it) => itemTile(it, 'eq', it.id + '|' + owner)).join('') || `<div class="muted small">${t('noItems')}</div>`}</div>`;
  };

  // ---------- цели ----------
  W.goals = function () {
    const { ic, t, lootHtml } = h();
    const cur = G.S.goal;
    return `${close()}<h2>${ic('i_star', 'ic2')} ${t('goalsTitle')}</h2><div class="muted small">${t('goalsHint')}</div>
      <div class="glist">${D.GOALS.map((g, i) => `<div class="gitem ${i < cur ? 'done' : i === cur ? 'cur' : 'later'}">${ic(i < cur ? 'i_check' : i === cur ? 'i_star' : 'i_lock')}<span class="grow">${i + 1}. ${t('goal' + i)}</span><span class="small">${lootHtml(g.reward)}</span></div>`).join('')}</div>`;
  };

  // ---------- исследования ----------
  W.research = function () {
    const { ic, t, btn, costHtml, bar } = h();
    const AL = G.E.lvl('academy');
    const c = G.S.research.cur;
    let top = c ? `<div class="job">${ic(G.R.get(c.id).icon, 'ic2')}<div class="grow"><div>${t('rs_' + c.id)}</div>${bar('rsch')}<div class="muted small" data-b="rschT"></div></div><button class="btn small" data-action="resCancel">${ic('i_x')} ${t('cancel')}</button></div>` : `<div class="muted small">${t('resIdle')}</div>`;
    const levels = [...new Set(D.RESEARCH.map((r) => r.acad))];
    const groups = levels.map((L) => `<h3>${ic('b_academy:' + Math.min(3, Math.ceil(L / 2)), 'ic2')} ${t('acadLvl', { l: L })} ${AL < L ? `<span class="muted small">${ic('i_lock')}</span>` : ''}</h3><div class="rgrid">${D.RESEARCH.filter((r) => r.acad === L).map((r) => {
      const st = G.R.state(r.id);
      const queued = G.S.decree.research.includes(r.id);
      let act = '';
      if (st === 'done') act = `<span class="good small">${ic('i_check')} ${t('researched')}</span>`;
      else if (st === 'cur') act = `<span class="warn small">${t('researching')}</span>`;
      else if (st === 'open') act = `${btn(t('study'), 'research', r.id, { cost: r.cost, chips: false, cls: 'small primary', lock: !!c })} <button class="btn small" data-action="resQueue" data-arg="${r.id}" ${queued ? 'disabled' : ''}>${ic('i_scroll')} ${queued ? t('queuedShort') : t('toDecree')}</button>`;
      else act = `<span class="muted small">${ic('i_lock')} ${r.req && !G.R.done(r.req) ? t('needRes', { r: t('rs_' + r.req) }) : t('needAcad', { l: r.acad })}</span> <button class="btn small" data-action="resQueue" data-arg="${r.id}" ${queued ? 'disabled' : ''}>${ic('i_scroll')} ${queued ? t('queuedShort') : t('toDecree')}</button>`;
      return `<div class="rcard2 st-${st}">${ic(r.icon, 'ic3')}<div class="grow"><b>${t('rs_' + r.id)}</b><div class="small">${t('rsd_' + r.id)}</div>${st === 'done' ? '' : `<div class="row">${costHtml(r.cost)}<span class="muted small">${ic('i_clock')} ${G.U.fmtTime(G.R.time(r))}</span></div>`}<div class="row">${act}</div></div></div>`;
    }).join('')}</div>`).join('');
    return `${close()}<h2>${ic('i_book', 'ic2')} ${t('researchTitle')}</h2><div class="muted small">${t('researchHint')}</div>${top}${groups}`;
  };
})();
