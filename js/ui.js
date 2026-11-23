(function () {
  const UI = (G.UI = { tab: 'build', sel: 'castle', _d: true, slotsDirty: true, logDirty: true, party: new Set(), pdown: false, lastTab: '' });
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const t = (k, p) => G.t(k, p);
  const tn = (o) => G.tn(o);
  const U = G.U;
  const ic = (k, cls) => `<img class="${cls || 'ic'}" src="${G.SPR.url(k)}" alt="">`;
  const tierOf = (L) => (L >= 6 ? 3 : L >= 3 ? 2 : 1);
  const bSprite = (k) => {
    const L = G.E.lvl(k);
    if (k === 'dungeon') return 'b_dungeon';
    return L === 0 ? 'b_site' : 'b_' + k + ':' + tierOf(L);
  };
  UI.ic = ic;
  UI.dirty = () => { UI._d = true; };

  // ---------- инициализация ----------
  UI.init = function () {
    G.SPR.mapBg($('#mapbg'));
    buildSlots();
    document.addEventListener('click', onClick);
    document.addEventListener('pointerdown', () => { UI.pdown = true; }, true);
    const up = () => { UI.pdown = false; };
    document.addEventListener('pointerup', up, true);
    document.addEventListener('pointercancel', up, true);
    $('#battlecv').addEventListener('pointerdown', (e) => G.W.click(e));
    $('#modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal' && $('#modal').dataset.kind !== 'decision') UI.closeModal();
    });
    $('#brand-icon').src = G.SPR.url('i_crown');
    applyStatic();
    UI.render();
  };

  function applyStatic() {
    for (const el of $$('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    document.title = t('title');
    document.documentElement.lang = G.LANG;
    $('#lang-btn').textContent = G.LANG === 'ru' ? 'EN' : 'RU';
  }

  // ---------- карта ----------
  function buildSlots() {
    const box = $('#slots');
    box.innerHTML = '';
    for (const k of G.D.ORDER) {
      const d = G.D.B[k];
      const el = document.createElement('div');
      el.className = 'slot';
      el.dataset.k = k;
      el.style.left = (d.x / 320) * 100 + '%';
      el.style.top = (d.y / 200) * 100 + '%';
      el.innerHTML = '<img class="slot-img" alt="" draggable="false"><div class="slot-label"></div><div class="slot-badge"></div>';
      box.appendChild(el);
    }
    box.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.slot');
      if (!el) return;
      e.preventDefault();
      UI.slotClick(el.dataset.k, e, el);
    });
    UI.slotsDirty = true;
  }

  function updateSlots() {
    UI.slotsDirty = false;
    for (const el of $$('.slot')) {
      const k = el.dataset.k, L = G.E.lvl(k), d = G.D.B[k];
      const key = bSprite(k);
      const img = el.firstElementChild;
      if (img.dataset.key !== key) { img.src = G.SPR.url(key); img.dataset.key = key; }
      el.querySelector('.slot-label').innerHTML = U.esc(tn(d.name)) + (d.noLevel ? '' : L ? ` <b>${L}</b>` : ` <i>${t('site')}</i>`);
      el.classList.toggle('sel', UI.sel === k && (UI.tab === 'build' || (k === 'dungeon' && UI.tab === 'exp')));
      el.classList.toggle('unbuilt', L === 0 && !d.noLevel);
    }
  }

  function updateBadges() {
    const S = G.S;
    const set = (k, html) => {
      const el = $(`.slot[data-k="${k}"] .slot-badge`);
      if (el && el._h !== html) { el.innerHTML = html; el._h = html; el.classList.toggle('on', !!html); }
    };
    set('forge', S.forge.q.length ? ic('i_hammer') + S.forge.q.length : '');
    set('dungeon', S.exp ? (S.exp.pend ? '!' : ic('i_flag') + S.exp.floor) : '');
    set('tavern', G.E.lvl('tavern') && S.tavern.cands.length && S.advs.length < G.T.maxAdvs() ? ic('i_people') + S.tavern.cands.length : '');
    set('gate', G.W.active() ? ic('i_atk') : '');
  }

  UI.slotClick = function (k, e, el) {
    const prevSel = UI.sel, prevTab = UI.tab;
    if (G.W.active()) return;
    UI.sel = k;
    UI.tab = k === 'dungeon' ? 'exp' : 'build';
    const L = G.E.lvl(k), d = G.D.B[k];
    if (L > 0 && d.click) {
      const n = G.E.gather(k);
      fxFloat(e, '+' + U.fmt1(n), 'r_' + d.click);
      bump(el);
    } else if (k === 'forge' && L > 0 && G.F.boost()) {
      fxFloat(e, t('hammerHit'), 'i_hammer');
      bump(el);
    }
    if (prevSel !== k || prevTab !== UI.tab) { UI.dirty(); UI.slotsDirty = true; }
  };

  function fxFloat(e, text, icon) {
    const st = $('#stage').getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'float';
    f.style.left = e.clientX - st.left + 'px';
    f.style.top = e.clientY - st.top + 'px';
    f.innerHTML = (icon ? ic(icon) : '') + `<span>${U.esc(text)}</span>`;
    $('#fx').appendChild(f);
    setTimeout(() => f.remove(), 900);
  }
  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // ---------- действия ----------
  function onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const f = ACT[el.dataset.action];
    if (f) f(el.dataset.arg, el, e);
  }

  const ACT = {
    lang() {
      G.LANG = G.LANG === 'ru' ? 'en' : 'ru';
      G.S.lang = G.LANG;
      applyStatic();
      UI.slotsDirty = true;
      UI.logDirty = true;
      $('#resbar').dataset.sig = '';
      UI.dirty();
      if ($('#modal').dataset.kind === 'decision') UI.openDecision();
      else if (!$('#modal').classList.contains('hidden') && $('#modal').dataset.kind === 'settings') UI.openSettings();
    },
    settings() { UI.openSettings(); },
    tab(a) { UI.tab = a; UI.slotsDirty = true; UI.dirty(); },
    sel(k) { UI.sel = k; UI.tab = k === 'dungeon' ? 'exp' : 'build'; UI.slotsDirty = true; UI.dirty(); },
    up(k) { G.E.upgrade(k); },
    worker(k) { G.E.hireWorker(k); },
    tools() { G.E.upgradeTools(); },
    smith() { G.F.hireSmith(); },
    craft(a) { const [ty, ti] = a.split('|'); G.F.craft(ty, +ti); },
    hire(i) { G.T.hire(+i); },
    reroll() { G.T.refresh(false); },
    guard() { G.T.hireGuard(); },
    gate(id) { G.T.setGate(id); },
    dismiss(id) {
      const a = G.T.get(id);
      if (a) UI.confirm(t('confirmDismiss', { name: U.esc(tn(a.name)) }), () => G.T.dismiss(id));
    },
    eqOpen(a) { const [owner, slot] = a.split('|'); UI.openEquip(owner, slot); },
    eq(a) { const [id, owner] = a.split('|'); G.F.equip(id, owner); UI.closeModal(); UI.dirty(); },
    uneq(id) { G.F.unequip(id); UI.closeModal(); UI.dirty(); },
    sell(id) { G.F.sell(id); },
    sellJunk() { G.F.sellJunk(); },
    trade(r) { G.E.sellRes(r); },
    wave(d) { const s = G.S.gate; s.sel = U.clamp(s.sel + +d, 1, s.best + 1); UI.dirty(); },
    fight() { G.W.start(); UI.dirty(); },
    bclose() { G.W.close(); },
    pick(id) {
      if (UI.party.has(id)) UI.party.delete(id);
      else if (UI.party.size < G.X.maxParty) UI.party.add(id);
      UI.dirty();
    },
    tac(v) { G.S.dng.tactic = v; UI.dirty(); },
    maxf(d) { G.S.dng.maxFloor = U.clamp(G.S.dng.maxFloor + +d, 1, 999); UI.dirty(); },
    send() { G.X.start([...UI.party], G.S.dng.tactic, G.S.dng.maxFloor); UI.party.clear(); },
    recall() { G.X.recall(); },
    live() { G.S.dng.live = !G.S.dng.live; UI.dirty(); },
    dec(a) { const [kind, ch] = a.split('|'); G.X.decide(kind, ch, false); },
    openDec() { UI.openDecision(); },
    mclose() { UI.closeModal(); },
    yes() { const f = UI._yes; UI._yes = null; UI.closeModal(); if (f) f(); },
    exportSave() {
      const ta = $('#save-text');
      ta.value = G.exportSave();
      ta.select();
      try { navigator.clipboard.writeText(ta.value); } catch (e) { /* буфер недоступен */ }
      $('#save-msg').textContent = t('exported');
    },
    importSave() {
      try {
        const s = G.importSave($('#save-text').value);
        G.S = s;
        G.LANG = s.lang || 'ru';
        G.save();
        location.reload();
      } catch (e) { $('#save-msg').textContent = t('importFail'); }
    },
    reset() {
      UI.confirm(t('confirmReset'), () => { G.resetting = true; G.wipe(); location.reload(); });
    },
  };

  // ---------- рендер панели ----------
  UI.render = function () {
    UI._d = false;
    const p = $('#panel');
    const st = UI.lastTab === UI.tab + UI.sel ? p.scrollTop : 0;
    let h = '';
    if (UI.tab === 'build') h = renderBuilding(UI.sel);
    else if (UI.tab === 'guild') h = renderGuild();
    else if (UI.tab === 'armory') h = renderArmory();
    else h = renderExp();
    p.innerHTML = h;
    p.scrollTop = st;
    UI.lastTab = UI.tab + UI.sel;
    renderTabs();
    renderGoal();
    UI.refresh();
  };

  function renderTabs() {
    const S = G.S;
    const tabs = [
      ['build', 'tabBuild', 'i_pick', ''],
      ['guild', 'tabGuild', 'i_people', G.E.lvl('tavern') ? S.advs.length + '/' + G.T.maxAdvs() : ''],
      ['armory', 'tabArmory', 'i_def', S.items.length ? String(S.items.length) : ''],
      ['exp', 'tabExp', 'i_skull', S.exp ? (S.exp.pend ? '!' : t('floorShort') + S.exp.floor) : ''],
    ];
    $('#tabs').innerHTML = tabs.map(([k, lab, i, b]) => `<button class="tab ${UI.tab === k ? 'on' : ''}" data-action="tab" data-arg="${k}">${ic(i)}<span>${t(lab)}</span>${b ? `<em>${b}</em>` : ''}</button>`).join('');
  }

  function renderGoal() {
    const i = G.S.goal;
    const el = $('#goal');
    if (i >= G.D.GOALS.length) { el.innerHTML = `${ic('i_star')} <span>${t('goalsDone')}</span>`; return; }
    el.innerHTML = `${ic('i_star')} <b>${t('goalLabel')}:</b> <span>${t('goal' + i)}</span> <span class="muted">${t('reward')}: ${lootHtml(G.D.GOALS[i].reward)}</span>`;
  }

  function costHtml(c) {
    return `<span class="costs">${Object.keys(c).filter((r) => c[r] > 0).map((r) => `<span class="chip" data-r="${r}" data-n="${c[r]}">${ic('r_' + r)}${U.fmt(c[r])}</span>`).join('')}</span>`;
  }
  function btn(label, action, arg, cost, cls, lock) {
    return `<button class="btn ${cls || ''}" data-action="${action}" data-arg="${arg === undefined ? '' : arg}"${cost ? ` data-cost='${JSON.stringify(cost)}'` : ''}${lock ? ' disabled data-lock="1"' : ''}><span class="bl">${label}</span>${cost ? costHtml(cost) : ''}</button>`;
  }
  function lootHtml(o) {
    if (!o) return '';
    return Object.keys(o).filter((r) => o[r] > 0).map((r) => `<span class="loot">${ic('r_' + r)}${U.fmt(o[r])}</span>`).join(' ');
  }
  UI.lootHtml = lootHtml;

  function navRow() {
    return `<div class="nav">${G.D.ORDER.map((k) => `<button class="navb ${UI.sel === k ? 'on' : ''}" data-action="sel" data-arg="${k}" title="${U.esc(tn(G.D.B[k].name))}">${ic(bSprite(k), 'ic2')}</button>`).join('')}</div>`;
  }

  function renderBuilding(k) {
    if (k === 'dungeon') return navRow() + renderExpBody();
    const d = G.D.B[k], L = G.E.lvl(k);
    let h = navRow();
    h += `<div class="bhead">${ic(bSprite(k), 'bimg')}<div><h2>${tn(d.name)}</h2><div class="lvl">${L ? t('level', { l: L }) : t('notBuilt')}</div><p class="desc">${tn(d.desc)}</p></div></div>`;
    h += upgradeBlock(k);
    if (L > 0 && PANELS[k]) h += PANELS[k]();
    return h;
  }

  function upgradeBlock(k) {
    const L = G.E.lvl(k), mx = G.E.maxLevel(k);
    if (L >= mx) {
      const msg = (k === 'castle' && L >= G.D.B.castle.max) || L >= G.D.MAXLVL ? t('maxLevel') : t('needCastle', { l: L - 1 });
      return `<div class="box muted">${msg}</div>`;
    }
    return `<div class="box"><h3>${L ? t('upgradeTo', { l: L + 1 }) : t('build')}</h3>${btn(L ? t('upgrade') : t('build'), 'up', k, G.E.upCost(k), 'primary')}<div class="hint">${t('h_' + k)}</div></div>`;
  }

  function prodPanel(k) {
    const b = G.S.b[k], r = G.D.B[k].prod, mx = G.E.maxWorkers(k);
    return `<div class="box"><h3>${t('workers')} <span class="muted">${b.w}/${mx}</span></h3>
      <div class="kv">${ic('r_' + r)} ${t('production')}: <b>${U.fmt1(b.w * G.E.workerRate(k))}</b>/${t('sec')} <span class="muted">(${U.fmt1(G.E.workerRate(k))} ${t('perWorker')})</span></div>
      <div class="kv">${ic('i_pick')} ${t('clickGives')}: <b>+${U.fmt1(G.E.clickAmount(k))}</b> ${ic('r_' + r)}</div>
      ${b.w < mx ? btn(t('hireWorker'), 'worker', k, G.E.workerCost(k)) : `<div class="muted">${t('workersFull')}</div>`}
      <div class="hint">${t('clickHint')}</div></div>`;
  }

  function eqSlot(owner, slot, a) {
    const it = G.F.equipped(owner, slot);
    const lock = (a && a.st === 'dungeon') || (G.W.active() && a && a.st === 'gate');
    const lab = slot === 'weapon' ? t('weapon') : t('armor');
    const style = it ? ` style="--rc:${G.D.IRAR[it.rar].color}"` : '';
    const body = it ? ic('it_' + it.type + ':' + it.ti, 'ic2') + `<span>${itemShort(it)}</span>` : `<span class="muted">+ ${lab}</span>`;
    return `<button class="eq ${it ? 'has' : ''}" data-action="eqOpen" data-arg="${owner}|${slot}" title="${lab}"${style}${lock ? ' disabled' : ''}>${body}</button>`;
  }
  function itemShort(it) {
    const p = [];
    if (it.atk) p.push(ic('i_atk') + it.atk);
    if (it.def) p.push(ic('i_def') + it.def);
    if (it.hp) p.push(ic('i_hp') + it.hp);
    return p.join(' ');
  }
  function itemRow(it, act, showOwner) {
    const R = G.D.IRAR[it.rar];
    const aff = it.aff.length ? `<div class="aff small">${it.aff.map((a) => '+' + a.v + ' ' + t('st_' + a.k)).join(', ')}</div>` : '';
    const own = showOwner && it.eq ? `<div class="muted small">${t('heldBy')}: ${ownerName(it.eq)}</div>` : '';
    return `<div class="item" style="--rc:${R.color}">${ic('it_' + it.type + ':' + it.ti, 'ic3')}<div class="grow"><div class="nm" style="color:${R.color}">${U.esc(G.F.name(it))}</div><div class="small">${tn(R.name)} · ${itemShort(it)}</div>${aff}${own}</div>${act || ''}</div>`;
  }
  function ownerName(id) {
    if (id === 'king') return t('king');
    const a = G.T.get(id);
    return a ? U.esc(tn(a.name)) : '?';
  }
  function statusText(a) {
    if (a.st === 'wounded') return t('st_wounded') + ' <span data-b="wt:' + a.id + '"></span>';
    return t('st_' + a.st);
  }

  function miniAdv(a, act) {
    const R = G.D.ARAR[a.rar], s = G.T.stats(a);
    return `<div class="mini" style="--rc:${R.color}">${ic('c_' + a.cls, 'ic2')}<div class="grow"><div><span class="nm" style="color:${R.color}">${U.esc(tn(a.name))}</span> <span class="muted small">${tn(G.D.CLS[a.cls].name)} · ${t('lv')}${a.lvl}</span></div>
      <div class="small">${ic('i_atk')}${s.atk} ${ic('i_def')}${s.def} ${ic('i_hp')}<span data-b="hp:${a.id}"></span> <span class="status st-${a.st}">${statusText(a)}</span></div>
      <div class="bar hp"><i data-w="hp:${a.id}"></i></div></div>${act || ''}</div>`;
  }

  function advCard(a, o) {
    const C = G.D.CLS[a.cls], R = G.D.ARAR[a.rar], s = G.T.stats(a);
    const cand = o.cand !== undefined;
    let h = `<div class="card" style="--rc:${R.color}"><div class="por">${ic('c_' + a.cls, 'ic3')}</div><div class="grow">
      <div class="nm" style="color:${R.color}">${U.esc(tn(a.name))}</div>
      <div class="muted small">${tn(C.name)} · ${tn(R.name)} · ${t('lv')} ${a.lvl}</div>
      <div class="stats">${ic('i_hp')}${cand ? s.hp : `<span data-b="hp:${a.id}"></span>`} ${ic('i_atk')}${s.atk} ${ic('i_def')}${s.def}</div>`;
    if (cand) {
      h += `<div class="muted small">${tn(C.desc)}</div>`;
      h += btn(t('hire'), 'hire', o.cand, { gold: a.cost }, 'small', o.full);
    } else {
      const xpw = Math.min(100, (a.xp / G.T.xpNeed(a.lvl)) * 100).toFixed(1);
      h += `<div class="bar hp"><i data-w="hp:${a.id}"></i></div>
        <div class="bar xp" title="${t('xp')}"><i style="width:${xpw}%"></i></div>
        <div class="eqrow">${eqSlot(a.id, 'weapon', a)}${eqSlot(a.id, 'armor', a)}</div>
        <div class="row"><span class="status st-${a.st}">${statusText(a)}</span><span class="grow"></span>`;
      const battle = G.W.active();
      if (a.st === 'idle' && !battle) h += `<button class="btn small" data-action="gate" data-arg="${a.id}" ${G.T.gateCount() >= G.T.gateMax() ? 'disabled' : ''}>${t('toWall')}</button>`;
      if (a.st === 'gate' && !battle) h += `<button class="btn small" data-action="gate" data-arg="${a.id}">${t('removeWall')}</button>`;
      if (a.st !== 'dungeon' && !(battle && a.st === 'gate')) h += `<button class="btn small danger" data-action="dismiss" data-arg="${a.id}">${t('dismiss')}</button>`;
      h += `</div>`;
    }
    return h + `</div></div>`;
  }

  function chancesRow(list, ch) {
    return `<div class="chances">${list.map((r, i) => `<span style="color:${r.color}">${tn(r.name)} ${(ch[i] * 100).toFixed(1)}%</span>`).join('')}</div>`;
  }

  function statPreview(ty, ti) {
    const T = G.D.TIERS[ti], it = G.D.ITYPES[ty];
    return it.slot === 'weapon' ? `${ic('i_atk')}~${Math.round(T.atk * it.mod)}` : `${ic('i_def')}~${T.def} ${ic('i_hp')}~${T.hp}`;
  }

  const PANELS = {
    castle() {
      const kw = G.F.equipped('king', 'weapon');
      return `<div class="box"><h3>${t('treasury')}</h3>
        <div class="kv">${ic('r_gold')} ${t('taxes')}: <b data-b="tax"></b>/${t('sec')}</div>
        <div class="kv">${ic('i_pick')} ${t('clickGives')}: <b>+${U.fmt1(G.E.clickAmount('castle'))}</b> ${ic('r_gold')}</div>
        <div class="hint">${t('taxHint')}</div></div>
        <div class="box"><h3>${ic('i_crown')} ${t('king')}</h3>
        <div class="kv">${ic('i_pick')} ${t('gatherPower')}: <b>${G.E.power()}</b></div>
        ${G.S.king.tools < G.E.maxTools() ? btn(t('upTools', { l: G.S.king.tools + 1 }), 'tools', '', G.E.toolsCost()) : `<div class="muted small">${t('toolsMax')}</div>`}
        <div class="kv">${ic('i_atk')} ${t('kingDmg')}: <b>${G.W.kingDmg()}</b> ${kw ? '' : `<span class="muted small">(${t('fists')})</span>`}</div>
        <div class="eqrow">${eqSlot('king', 'weapon')}</div>
        <div class="hint">${t('kingHint')}</div></div>
        <div class="box"><h3>${t('market')}</h3><div class="market">${Object.keys(G.E.PRICE).filter((r) => G.S.seen[r]).map((r) => `<button class="btn small" data-action="trade" data-arg="${r}" data-sell="${r}">${ic('r_' + r)}<span data-b="sellAmt:${r}"></span> → ${ic('r_gold')}<span data-b="sellGold:${r}"></span></button>`).join('')}</div><div class="hint">${t('marketHint')}</div></div>`;
    },
    lumber: () => prodPanel('lumber'),
    quarry: () => prodPanel('quarry'),
    mine: () => prodPanel('mine'),
    forge() {
      const q = G.S.forge.q, full = q.length >= G.F.qMax();
      let h = `<div class="box"><h3>${t('forgeQueue')} <span class="muted">${q.length}/${G.F.qMax()}</span></h3>`;
      if (!q.length) h += `<div class="muted">${t('forgeIdle')}</div>`;
      q.forEach((j, i) => {
        h += `<div class="job">${ic('it_' + j.type + ':' + j.ti, 'ic2')}<div class="grow"><div>${tn(G.F.jobName(j))}</div>${i === 0 ? '<div class="bar"><i data-w="forge"></i></div><div class="muted small" data-b="forgeT"></div>' : `<div class="muted small">${t('queued')}</div>`}</div></div>`;
      });
      h += `<div class="hint">${t('forgeClickHint')}</div></div>`;
      h += `<div class="box"><h3>${t('smiths')} <span class="muted">${G.S.b.forge.w}/${G.F.maxSmiths()}</span></h3><div class="kv">${ic('i_clock')} ${t('craftSpeed')}: <b>×${G.F.speed().toFixed(2)}</b></div>${G.S.b.forge.w < G.F.maxSmiths() ? btn(t('hireSmith'), 'smith', '', G.F.smithCost()) : ''}<div class="hint">${t('smithHint')}</div></div>`;
      h += `<div class="box"><h3>${t('rarityChances')}</h3>${chancesRow(G.D.IRAR, G.F.rarChances())}</div>`;
      G.D.TIERS.forEach((T, ti) => {
        const un = G.F.unlocked(ti);
        h += `<div class="box"><h3>${ic('it_sword:' + ti)} ${tn(T.name)} ${un ? '' : `<span class="muted small">${t('needForge', { l: T.req })}</span>`}</h3>`;
        if (un) {
          h += '<div class="recipes">' + Object.keys(G.D.ITYPES).map((ty) => {
            const it = G.D.ITYPES[ty];
            const who = it.cls ? tn(G.D.CLS[it.cls].name) : t('anyClass');
            return `<div class="recipe">${ic('it_' + ty + ':' + ti, 'ic2')}<div class="grow"><div>${tn(it.name)} <span class="muted small">${who}</span></div><div class="small">${statPreview(ty, ti)}</div></div>${btn(t('craft'), 'craft', ty + '|' + ti, G.F.cost(ty, ti), 'small', full)}</div>`;
          }).join('') + '</div>';
        }
        h += '</div>';
      });
      return h;
    },
    tavern() {
      const S = G.S, full = S.advs.length >= G.T.maxAdvs();
      let h = `<div class="box"><h3>${t('guildSize')} <span class="muted">${S.advs.length}/${G.T.maxAdvs()}</span></h3>${full ? `<div class="warn small">${t('guildFull')}</div>` : `<div class="muted small">${t('guildHint')}</div>`}</div>`;
      h += `<div class="box"><h3>${t('candidates')}</h3><div class="muted small">${t('newIn')} <span data-b="tavT"></span></div></div>`;
      if (!S.tavern.cands.length) h += `<div class="muted box">${t('noCands')}</div>`;
      S.tavern.cands.forEach((c, i) => { h += advCard(c, { cand: i, full }); });
      h += `<div class="box">${btn(t('reroll'), 'reroll', '', G.T.refreshCost(), 'small')}<h3 style="margin-top:10px">${t('rarityChances')}</h3>${chancesRow(G.D.ARAR, G.T.rarChances())}</div>`;
      return h;
    },
    barracks() {
      const mx = G.T.maxGuards();
      return `<div class="box"><h3>${t('guards')} <span class="muted">${G.S.guards}/${mx}</span></h3>
        <div class="kv">${ic('i_atk')} ${t('guardDmg')}: <b>${U.fmt1(G.T.guardDmg())}</b></div>
        <div class="kv">${ic('i_helmet')} ${t('dps')}: <b>${U.fmt1((G.S.guards * G.T.guardDmg()) / 1.2)}</b></div>
        ${G.S.guards < mx ? btn(t('hireGuard'), 'guard', '', G.T.guardCost()) : `<div class="muted">${t('guardsFull')}</div>`}
        <div class="hint">${t('guardHint')}</div></div>`;
    },
    gate() {
      const s = G.S.gate, n = s.sel, pv = G.W.preview(n), rw = G.W.reward(n);
      const battle = G.W.active();
      const defs = G.S.advs.filter((a) => a.st === 'gate');
      const avail = G.S.advs.filter((a) => a.st === 'idle');
      let h = `<div class="box"><h3>${t('defense')}</h3>
        <div class="kv">${ic('i_def')} ${t('wallHp')}: <b>${U.fmt(G.W.wallHp())}</b></div>
        <div class="kv">${ic('i_helmet')} ${t('guards')}: <b>${G.S.guards}</b> <span class="muted small">(${t('dps')} ${U.fmt1((G.S.guards * G.T.guardDmg()) / 1.2)})</span></div>
        <div class="kv">${ic('i_crown')} ${t('kingDmg')}: <b>${G.W.kingDmg()}</b> ${t('perClick')}</div>
        <h4>${t('onWall')} <span class="muted">${defs.length}/${G.T.gateMax()}</span></h4>`;
      h += defs.length ? defs.map((a) => miniAdv(a, battle ? '' : `<button class="btn small" data-action="gate" data-arg="${a.id}">${t('removeWall')}</button>`)).join('') : `<div class="muted small">${G.E.lvl('tavern') ? t('noDefenders') : t('noDefendersTavern')}</div>`;
      if (!battle && avail.length && defs.length < G.T.gateMax()) {
        h += `<h4>${t('available')}</h4>` + avail.map((a) => miniAdv(a, `<button class="btn small" data-action="gate" data-arg="${a.id}">${t('toWall')}</button>`)).join('');
      }
      h += '</div>';
      h += `<div class="box"><h3>${t('waves')}</h3>
        <div class="wavesel"><button class="btn small" data-action="wave" data-arg="-1" ${n <= 1 || battle ? 'disabled' : ''}>◀</button><b>${t('wave')} ${n}</b><button class="btn small" data-action="wave" data-arg="1" ${n > s.best || battle ? 'disabled' : ''}>▶</button><span class="muted small">${t('bestWave')}: ${s.best}</span></div>
        <div class="enemies">${Object.entries(pv.counts).map(([k, c]) => `<span class="en" title="${U.esc(tn(G.D.MON[k].name))}">${ic('m_' + k, 'ic2')}×${c}</span>`).join('')}</div>
        <div class="kv">${ic('i_hp')} ${t('totalHp')}: <b>${U.fmt(pv.hp)}</b>${n % 5 === 0 ? ` <span class="warn small">${t('bossWave')}</span>` : ''}</div>
        <div class="kv">${ic('i_chest')} ${t('reward')}: ${lootHtml(rw)} <span class="muted small">+ ${t('perKill')}</span></div>
        <button class="btn primary big" data-action="fight" ${battle ? 'disabled' : ''}>${ic('i_atk')} ${t('callWave')}</button>
        <div class="hint">${t('defeatHint')}</div></div>`;
      return h;
    },
  };

  // ---------- гильдия ----------
  function renderGuild() {
    const A = G.S.advs;
    if (G.E.lvl('tavern') < 1) return `<div class="box muted">${t('needTavern')}</div>`;
    let h = `<div class="box"><h3>${t('guild')} <span class="muted">${A.length}/${G.T.maxAdvs()}</span></h3><div class="muted small">${A.length ? t('guildTip') : t('guildEmpty')}</div></div>`;
    h += A.map((a) => advCard(a, {})).join('');
    return h;
  }

  // ---------- арсенал ----------
  function renderArmory() {
    const items = [...G.S.items].sort((a, b) => b.rar - a.rar || b.ti - a.ti || G.F.score(b) - G.F.score(a));
    const junk = G.F.junk();
    let h = `<div class="box"><h3>${ic('i_crown')} ${t('kingEq')}</h3><div class="eqrow">${eqSlot('king', 'weapon')}</div><div class="muted small">${t('kingDmg')}: ${G.W.kingDmg()}</div></div>`;
    h += `<div class="box"><h3>${t('armory')} <span class="muted">${items.length}</span></h3><div class="muted small">${t('armoryTip')}</div>${junk.length ? btn(t('sellJunk', { n: junk.length }), 'sellJunk', '', null, 'small') : ''}</div>`;
    if (!items.length) h += `<div class="muted box">${G.E.lvl('forge') ? t('noItemsForge') : t('needForgeBuild')}</div>`;
    h += items.map((it) => itemRow(it, it.eq ? `<span class="tag">${ownerName(it.eq)}</span>` : `<button class="btn small" data-action="sell" data-arg="${it.id}">${t('sell')} ${ic('r_gold')}${G.F.sellValue(it)}</button>`, false)).join('');
    return h;
  }

  UI.openEquip = function (owner, slot) {
    const cur = G.F.equipped(owner, slot);
    const a = owner === 'king' ? null : G.T.get(owner);
    if (owner !== 'king' && !a) return;
    const list = G.S.items.filter((it) => {
      if (G.F.slotOf(it) !== slot || it.eq === owner || !G.F.canUse(it, owner)) return false;
      const h = it.eq && it.eq !== 'king' ? G.T.get(it.eq) : null;
      return !(h && h.st === 'dungeon');
    }).sort((x, y) => G.F.score(y) - G.F.score(x));
    let h = `<h2>${slot === 'weapon' ? t('weapon') : t('armor')}</h2><div class="muted">${owner === 'king' ? t('king') : U.esc(tn(a.name)) + ' · ' + tn(G.D.CLS[a.cls].name)}</div>`;
    if (cur) h += `<div class="box"><div class="small muted">${t('equipped')}</div>${itemRow(cur, `<button class="btn small" data-action="uneq" data-arg="${cur.id}">${t('unequip')}</button>`)}</div>`;
    h += list.length ? list.map((it) => itemRow(it, `<button class="btn small primary" data-action="eq" data-arg="${it.id}|${owner}">${t('equip')}</button>`, true)).join('') : `<div class="muted box">${t('noItems')}</div>`;
    h += `<div class="right"><button class="btn" data-action="mclose">${t('close')}</button></div>`;
    UI.modal(h, 'equip');
  };

  // ---------- подземелье ----------
  function renderExp() { return renderExpBody(); }

  function renderExpBody() {
    const d = G.D.B.dungeon;
    let h = `<div class="bhead">${ic('b_dungeon', 'bimg')}<div><h2>${tn(d.name)}</h2><p class="desc">${tn(d.desc)}</p><div class="muted small">${t('deepest')}: <b>${G.S.dng.best}</b></div></div></div>`;
    if (G.E.lvl('tavern') < 1) return h + `<div class="box muted">${t('needTavernDungeon')}</div>`;
    const e = G.S.exp;
    h += e ? expActive(e) : expSetup();
    if (!e && G.S.lastExp) {
      const L = G.S.lastExp;
      h += `<div class="box"><h3>${t('lastReport')}</h3><div class="${L.ok ? 'good' : 'bad'}">${L.ok ? t('lastOk', { f: L.floor }) : t('lastFail', { f: L.floor })}</div><div>${lootHtml(L.loot) || '—'}</div><div class="xlog">${L.log.slice().reverse().map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div></div>`;
    }
    return h;
  }

  function expSetup() {
    const idle = G.S.advs.filter((a) => a.st === 'idle');
    for (const id of [...UI.party]) {
      const a = G.T.get(id);
      if (!a || a.st !== 'idle') UI.party.delete(id);
    }
    let h = `<div class="box"><h3>${t('party')} <span class="muted">${UI.party.size}/${G.X.maxParty}</span></h3>`;
    h += idle.length ? idle.map((a) => miniAdv(a, `<button class="btn small ${UI.party.has(a.id) ? 'primary' : ''}" data-action="pick" data-arg="${a.id}">${UI.party.has(a.id) ? '✓ ' + t('inParty') : t('addParty')}</button>`)).join('') : `<div class="muted small">${G.S.advs.length ? t('noIdle') : t('guildEmpty')}</div>`;
    h += '</div>';
    const D = G.S.dng;
    h += `<div class="box"><h3>${t('orders')}</h3><div class="seg">${['aggressive', 'balanced', 'careful'].map((v) => `<button class="btn small ${D.tactic === v ? 'primary' : ''}" data-action="tac" data-arg="${v}">${t('tac_' + v)}</button>`).join('')}</div>
      <div class="muted small">${t('tacd_' + D.tactic)}</div>
      <div class="wavesel">${t('maxFloor')}: <button class="btn small" data-action="maxf" data-arg="-1">◀</button><b>${D.maxFloor}</b><button class="btn small" data-action="maxf" data-arg="1">▶</button></div>
      <button class="btn small ${D.live ? 'primary' : ''}" data-action="live">${D.live ? '✓' : '✗'} ${t('liveDec')}</button>
      <div class="muted small">${t('liveHint')}</div></div>`;
    h += `<button class="btn primary big" data-action="send" ${UI.party.size ? '' : 'disabled'}>${ic('i_flag')} ${t('sendParty')}</button>`;
    return h;
  }

  function expActive(e) {
    const ms = G.X.members();
    const ph = { travel: t('phTravel', { f: e.floor + 1 }), enc: t('phEnc', { f: e.floor + 1 }), after: t('phAfter', { f: e.floor }), ret: t('phRet') }[e.phase];
    let h = `<div class="box"><h3>${ic('i_flag')} ${ph}</h3>`;
    if (e.phase === 'travel' || e.phase === 'ret') h += '<div class="bar"><i data-w="exp"></i></div><div class="muted small" data-b="expT"></div>';
    if (e.pend) h += `<button class="btn primary big" data-action="openDec">${t('awaitOrder')}</button>`;
    h += `<div class="kv small">${t('orders')}: <b>${t('tac_' + e.tactic)}</b> · ${t('maxFloor')}: <b>${e.maxFloor}</b> · ${t('floor')}: <b>${e.floor}</b></div>`;
    h += ms.map((a) => miniAdv(a, '')).join('');
    h += `<div class="kv">${ic('i_chest')} ${t('backpack')}: ${lootHtml(e.loot) || '—'}</div>`;
    if (e.phase !== 'ret') h += `<button class="btn small" data-action="recall" ${e.recall ? 'disabled' : ''}>${e.recall ? t('recalling') : t('recall')}</button>`;
    h += '</div>';
    h += `<div class="box"><h3>${t('chronicle')}</h3><div class="xlog">${e.log.slice().reverse().map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div></div>`;
    return h;
  }

  function choice(arg, title, desc, p, flee) {
    const pct = p === undefined ? '' : `<span class="pct ${p >= 0.7 ? 'good' : p >= 0.4 ? 'mid' : 'bad'}">${flee ? t('escape') : t('winChance')}: ${Math.round(p * 100)}%</span>`;
    return `<button class="choice" data-action="dec" data-arg="${arg}"><b>${title}</b><span class="small">${desc}</span>${pct}</button>`;
  }

  UI.openDecision = function () {
    const e = G.S.exp;
    if (!e || !e.pend) return;
    const ms = G.X.members();
    let h;
    if (e.pend.kind === 'enc') {
      const en = e.enemy;
      h = `<h2>${t('decEncTitle', { f: en.f })}</h2>
        <div class="enc">${ic('m_' + en.key, 'ic4')}<div><div class="nm">${U.esc(tn(G.X.enemyName(en)))}</div><div class="small">${ic('i_hp')} ${U.fmt(en.hp)} ${ic('i_atk')} ${U.fmt1(en.atk)}</div>${en.boss ? `<div class="warn small">${t('bossFloor')}</div>` : ''}</div></div>
        ${ms.map((a) => miniAdv(a, '')).join('')}
        <div class="choices">${choice('enc|attack', t('ch_attack'), t('chd_attack'), G.X.chance('attack'))}${choice('enc|defend', t('ch_defend'), t('chd_defend'), G.X.chance('defend'))}${choice('enc|flee', t('ch_flee'), t('chd_flee'), G.X.fleeChance(), true)}</div>`;
    } else {
      h = `<h2>${t('decAfterTitle', { f: e.floor })}</h2>
        ${ms.map((a) => miniAdv(a, '')).join('')}
        <div class="kv">${ic('i_chest')} ${t('backpack')}: ${lootHtml(e.loot) || '—'}</div>
        <div class="muted small">${t('nextFloor', { f: e.floor + 1 })}${(e.floor + 1) % 5 === 0 ? ' — ' + t('bossFloor') : ''}</div>
        <div class="choices">${choice('after|deeper', t('ch_deeper'), t('chd_deeper'))}${choice('after|return', t('ch_return'), t('chd_return'))}</div>`;
    }
    h += `<div class="countdown">${ic('i_clock')} ${t('autoIn')} <b data-b="decT"></b> · ${t('autoOrder')}: <b>${t('ch_' + G.X.autoChoice(e.pend.kind))}</b></div>`;
    UI.modal(h, 'decision');
  };

  // ---------- модальные окна ----------
  UI.modal = function (html, kind) {
    const m = $('#modal');
    $('#modal-box').innerHTML = html;
    m.classList.remove('hidden');
    m.dataset.kind = kind || '';
    UI.refresh();
  };
  UI.closeModal = function () {
    const m = $('#modal');
    m.classList.add('hidden');
    m.dataset.kind = '';
    if (G.S.exp && G.S.exp.pend) setTimeout(() => UI.openDecision(), 0);
  };
  UI.closeDecision = function () {
    const m = $('#modal');
    if (m.dataset.kind === 'decision') { m.classList.add('hidden'); m.dataset.kind = ''; }
  };
  UI.confirm = function (text, yes) {
    UI._yes = yes;
    UI.modal(`<p>${text}</p><div class="right"><button class="btn" data-action="mclose">${t('no')}</button> <button class="btn danger" data-action="yes">${t('yes')}</button></div>`, 'confirm');
  };
  UI.openSettings = function () {
    UI.modal(`<h2>${t('settings')}</h2>
      <div class="box"><h3>${t('language')}</h3><button class="btn" data-action="lang">${G.LANG === 'ru' ? 'English' : 'Русский'}</button></div>
      <div class="box"><h3>${t('saveTitle')}</h3><div class="muted small">${t('saveHint')}</div>
        <textarea id="save-text" rows="3" spellcheck="false"></textarea>
        <div class="row"><button class="btn small" data-action="exportSave">${t('export')}</button><button class="btn small" data-action="importSave">${t('import')}</button><span id="save-msg" class="muted small"></span></div></div>
      <div class="box"><h3>${t('danger')}</h3><button class="btn danger" data-action="reset">${t('reset')}</button></div>
      <div class="muted small">${t('about')}</div>
      <div class="right"><button class="btn" data-action="mclose">${t('close')}</button></div>`, 'settings');
  };
  UI.offlineReport = function (rep) {
    UI.modal(`<h2>${t('welcomeBack')}</h2><p>${t('awayFor', { t: U.fmtTime(rep.sec) })}</p><div class="box">${lootHtml(rep.gain) || t('nothing')}</div><div class="right"><button class="btn primary" data-action="mclose">${t('ok')}</button></div>`, 'offline');
  };

  // ---------- бой ----------
  UI.showBattle = function (on) {
    $('#map').classList.toggle('hidden', on);
    $('#battle').classList.toggle('hidden', !on);
    if (on) {
      $('#battle-head').innerHTML = `<b id="bh-wave"></b><span id="bh-left"></span><span class="gatelab">${ic('i_def')}</span><div class="bar gatebar"><i id="bh-gate"></i></div><span id="bh-gtxt"></span>`;
      $('#battle-foot').innerHTML = `<div class="hint">${t('battleHint', { d: G.W.kingDmg() })}</div>`;
    }
    UI.slotsDirty = true;
    UI.dirty();
  };
  UI.battleHud = function (B) {
    const left = B.queue.length + B.mons.filter((m) => !m.dead).length;
    const w = $('#bh-wave');
    if (!w) return;
    w.textContent = t('wave') + ' ' + B.n;
    $('#bh-left').textContent = t('monstersLeft') + ': ' + left + '/' + B.total;
    $('#bh-gate').style.width = ((B.gate / B.gateMax) * 100).toFixed(1) + '%';
    $('#bh-gtxt').textContent = Math.ceil(B.gate) + '/' + B.gateMax;
  };
  UI.battleResult = function (r) {
    let h;
    if (r.win) {
      h = `<div class="res-win">${t('victory')}</div><div>${lootHtml({ gold: r.gold, bone: r.bone })} · ${t('xpEach', { n: r.xp })}${r.wounded ? ' · ' + t('woundedN', { n: r.wounded }) : ''}</div>`;
    } else {
      h = `<div class="res-lose">${t('defeat')}</div><div>${t('plundered')}: ${lootHtml(r.lost) || '—'}${r.broken ? ' · ' + t('brokenB', { b: tn(G.D.B[r.broken].name) }) : ''}${r.dead.length ? ' · ' + t('deadN', { names: r.dead.map((n) => U.esc(tn(n))).join(', ') }) : ''}</div>`;
    }
    $('#battle-foot').innerHTML = h + `<button class="btn primary" data-action="bclose">${t('backToCity')}</button>`;
  };

  // ---------- журнал ----------
  function fmtEntry(l) {
    const p = {};
    for (const k in l.p) {
      const v = l.p[k];
      if (k === 'loot') p[k] = lootHtml(v) || '—';
      else if (k === 'gi') p[k] = t('goal' + v);
      else if (k === 'c') p[k] = t('ch_' + v);
      else if (v && typeof v === 'object') p[k] = U.esc(tn(v));
      else p[k] = U.esc(String(v));
    }
    return t(l.k, p);
  }
  function renderLog() {
    UI.logDirty = false;
    $('#log').innerHTML = G.S.log.slice(-40).reverse().map((l) => {
      const d = new Date(l.t);
      const tm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      return `<div class="le ${l.c}"><span class="lt">${tm}</span> ${fmtEntry(l)}</div>`;
    }).join('');
  }

  // ---------- полоса ресурсов ----------
  function renderResbar() {
    const bar = $('#resbar');
    const shown = G.D.RES.filter((r) => G.S.seen[r] || G.S.res[r] > 0);
    const sig = shown.join(',');
    if (bar.dataset.sig === sig) return;
    bar.dataset.sig = sig;
    bar.innerHTML = shown.map((r) => `<div class="res" title="${U.esc(tn(G.D.RES_NAME[r]))}">${ic('r_' + r)}<span class="rv" data-b="res:${r}"></span><span class="rr" data-b="rate:${r}"></span></div>`).join('');
  }

  // ---------- живые значения ----------
  const BIND = {
    res: (r) => U.fmt(G.S.res[r]),
    rate: (r) => { const v = UI._rates[r]; return v ? '+' + U.fmt1(v) + '/' + t('sec') : ''; },
    tax: () => U.fmt1(G.E.tax()),
    sellAmt: (r) => U.fmt(G.E.sellAmount(r)),
    sellGold: (r) => U.fmt(G.E.sellGold(r)),
    forgeT: () => { const j = G.S.forge.q[0]; return j ? U.fmtTime(j.t / G.F.speed()) : ''; },
    tavT: () => U.fmtTime(G.S.tavern.t),
    hp: (id) => { const a = G.T.get(id); return a ? Math.ceil(a.hp) + '/' + G.T.stats(a).hp : ''; },
    wt: (id) => { const a = G.T.get(id); return a && a.st === 'wounded' ? U.fmtTime(a.wt) : ''; },
    expT: () => (G.S.exp ? U.fmtTime(G.S.exp.t) : ''),
    decT: () => { const e = G.S.exp; return e && e.pend ? U.fmtTime((e.pend.dl - Date.now()) / 1000) : ''; },
  };
  const BAR = {
    forge: () => { const j = G.S.forge.q[0]; return j ? 1 - j.t / j.total : 0; },
    hp: (id) => { const a = G.T.get(id); return a ? a.hp / G.T.stats(a).hp : 0; },
    exp: () => { const e = G.S.exp; return e && e.tt ? 1 - e.t / e.tt : 0; },
  };

  UI.refresh = function () {
    if (UI._d && !UI.pdown) UI.render();
    if (UI.slotsDirty) updateSlots();
    if (UI.logDirty) renderLog();
    UI._rates = G.E.rates();
    renderResbar();
    for (const el of $$('[data-b]')) {
      const [k, a] = el.dataset.b.split(':');
      const f = BIND[k];
      if (!f) continue;
      const v = f(a);
      if (el.textContent !== v) el.textContent = v;
    }
    for (const el of $$('[data-w]')) {
      const [k, a] = el.dataset.w.split(':');
      const f = BAR[k];
      if (f) el.style.width = (U.clamp(f(a) || 0, 0, 1) * 100).toFixed(1) + '%';
    }
    for (const b of $$('[data-cost]')) {
      if (b.dataset.lock === '1') continue;
      const c = b._c || (b._c = JSON.parse(b.dataset.cost));
      b.disabled = !G.E.can(c);
    }
    for (const ch of $$('.chip')) ch.classList.toggle('lack', (G.S.res[ch.dataset.r] || 0) < +ch.dataset.n);
    for (const b of $$('[data-sell]')) b.disabled = G.E.sellGold(b.dataset.sell) < 1;
    updateBadges();
  };
})();
