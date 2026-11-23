(function () {
  const UI = (G.UI = {
    tab: 'city', sel: 'castle', _d: true, slotsDirty: true, logDirty: true, party: new Set(), pdown: false,
    lastTab: '', craft: { type: 'sword', ti: 0 }, armF: 'all', win: null, winArg: null, charPick: null,
  });
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const t = (k, p) => G.t(k, p);
  const U = G.U, D = G.D;
  const esc = U.esc;

  // ---------- общие помощники (используются и в окнах) ----------
  const ic = (k, cls) => `<img class="${cls || 'ic'}" src="${G.SPR.url(k)}" alt="">`;
  const tierOf = (L) => (L >= 6 ? 3 : L >= 3 ? 2 : 1);
  const bSprite = (k) => {
    if (k === 'dungeon') return 'b_dungeon';
    const L = G.E.lvl(k);
    return L === 0 ? 'b_site' : 'b_' + k + ':' + tierOf(L);
  };
  const nm = (v) => (!v ? '' : typeof v === 'string' ? v : v.k ? t(v.k) + (v.suffix || '') : G.tn(v));
  const monSpr = (k) => D.MON[k].spr || 'm_' + k;
  function costHtml(c) {
    return `<span class="costs">${Object.keys(c).filter((r) => c[r] > 0).map((r) => `<span class="chip${c[r] > G.E.cap(r) ? ' over' : ''}" data-r="${r}" data-n="${c[r]}">${ic('r_' + r)}${U.fmt(c[r])}</span>`).join('')}</span>`;
  }
  function btn(label, action, arg, o) {
    o = o || {};
    const cost = o.cost ? ` data-cost='${JSON.stringify(o.cost)}'` : '';
    const chips = o.cost && o.chips !== false ? costHtml(o.cost) : '';
    return `<button class="btn ${o.cls || ''}" data-action="${action}" data-arg="${arg === undefined ? '' : arg}"${cost}${o.lock ? ' disabled data-lock="1"' : ''}${o.title ? ` title="${esc(o.title)}"` : ''}><span class="bl">${label}</span>${chips}</button>`;
  }
  function lootHtml(o) {
    if (!o) return '';
    return Object.keys(o).filter((r) => o[r] > 0).map((r) => `<span class="loot">${ic('r_' + r)}${U.fmt(o[r])}</span>`).join(' ');
  }
  const bar = (key, cls) => `<div class="bar ${cls || ''}"><i data-w="${key}"></i></div>`;
  const box = (title, body, cls) => `<div class="box ${cls || ''}">${title ? `<h3>${title}</h3>` : ''}${body}</div>`;
  const kv = (icon, label, val) => `<div class="kv">${icon ? ic(icon) : ''} <span>${label}:</span> ${val}</div>`;
  const pips = (n, max) => `<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
  function stIcon(a) {
    if (a.st === 'gate') return ic('i_tower') + `<span>${t('st_gate')}</span>`;
    if (a.st === 'dungeon') return ic('i_flag') + `<span>${t('st_dungeon')}</span>`;
    if (a.st === 'wounded') return ic('i_heal') + `<span data-b="wt:${a.id}"></span>`;
    return ic('i_check') + `<span>${t('st_idle')}</span>`;
  }
  function advTile(a, action, arg, on) {
    const R = D.ARAR[a.rar];
    return `<button class="atile ${on ? 'on' : ''} st-${a.st}" data-action="${action}" data-arg="${arg}" style="--rc:${R.color}">
      <div class="por">${ic('c_' + a.cls, 'ic3')}<em>${a.lvl}</em>${G.T.sp(a) > 0 ? '<i class="sp">+</i>' : ''}</div>
      <div class="an" style="color:${R.color}">${esc(nm(a.name))}</div>
      <div class="muted small">${t('cl_' + a.cls)}</div>
      ${bar('hp:' + a.id, 'hp')}
      <div class="ast">${stIcon(a)}</div></button>`;
  }
  function itemMain(it) {
    const p = [];
    if (it.atk) p.push(ic('i_atk') + G.F.stat(it, 'atk'));
    if (it.def) p.push(ic('i_def') + G.F.stat(it, 'def'));
    if (it.hp) p.push(ic('i_hp') + G.F.stat(it, 'hp'));
    return p.join(' ');
  }
  function ownerIcon(id) {
    if (id === 'king') return ic('c_king', 'ic-own');
    const a = G.T.get(id);
    return a ? ic('c_' + a.cls, 'ic-own') : '';
  }
  function itemTile(it, action, arg) {
    const R = D.IRAR[it.rar];
    return `<button class="itile ${it.eq ? 'eq' : ''}" data-action="${action || 'item'}" data-arg="${arg || it.id}" style="--rc:${R.color}" title="${esc(G.F.name(it))}">
      ${ic('it_' + it.type + ':' + it.ti, 'ic3')}${it.ench ? `<em class="ench">+${it.ench}</em>` : ''}${it.eq ? `<span class="eqb">${ownerIcon(it.eq)}</span>` : ''}
      <span class="ist">${itemMain(it)}</span></button>`;
  }
  function chancesRow(list, ch, open, lockKey) {
    return `<div class="chances">${list.map((r, i) => (open(i)
      ? `<span class="rchip" style="--rc:${r.color}">${t(lockKey + '_' + i)} <b>${(ch[i] * 100).toFixed(1)}%</b></span>`
      : `<span class="rchip locked">${ic('i_lock')} ${t(lockKey + '_' + i)} <i>${t('fromLvl', { l: (r.forge || r.tav) })}</i></span>`)).join('')}</div>`;
  }
  function fmtEntry(l) {
    const p = {};
    for (const k in l.p) {
      const v = l.p[k];
      if (k === 'loot') p[k] = lootHtml(v) || '—';
      else if (k === 'gi') p[k] = t('goal' + v);
      else if (k === 'c') p[k] = t('ch_' + v);
      else if (v && typeof v === 'object') p[k] = esc(nm(v));
      else p[k] = esc(String(v));
    }
    return t(l.k, p);
  }
  UI.h = { ic, bSprite, nm, monSpr, costHtml, btn, lootHtml, bar, box, kv, pips, stIcon, advTile, itemTile, itemMain, ownerIcon, chancesRow, fmtEntry, esc, t };
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
      if (e.target.id === 'modal' && UI.win !== 'decision' && UI.win !== 'story') UI.closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && UI.win && UI.win !== 'decision') UI.closeModal();
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
    $('#snd-btn').innerHTML = ic(G.S.sound ? 'i_snd' : 'i_mute');
  }

  // ---------- карта ----------
  function buildSlots() {
    const box = $('#slots');
    box.innerHTML = '';
    for (const k of D.ORDER) {
      const d = D.B[k], s = d.size;
      const el = document.createElement('div');
      el.className = 'slot' + (k === 'castle' ? ' castle' : '');
      el.dataset.k = k;
      el.style.left = ((d.x - s / 2) / D.MAP.w) * 100 + '%';
      el.style.top = ((d.y - s / 2) / D.MAP.h) * 100 + '%';
      el.style.width = (s / D.MAP.w) * 100 + '%';
      el.style.height = (s / D.MAP.h) * 100 + '%';
      el.innerHTML = `<img class="slot-img" alt="" draggable="false"><div class="slot-label"></div><div class="slot-prog hidden"><i data-w="cons:${k}"></i></div><div class="slot-badge"></div>`;
      box.appendChild(el);
    }
    box.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.slot');
      if (!el) return;
      e.preventDefault();
      UI.slotClick(el.dataset.k, e, el);
    });
  }

  function updateSlots() {
    UI.slotsDirty = false;
    for (const el of $$('.slot')) {
      const k = el.dataset.k, L = G.E.lvl(k), d = D.B[k];
      const key = bSprite(k);
      const img = el.firstElementChild;
      if (img.dataset.key !== key) { img.src = G.SPR.url(key); img.dataset.key = key; }
      el.querySelector('.slot-label').innerHTML = esc(t('bn_' + k)) + (d.noLevel ? '' : L ? ` <b>${L}</b>` : ` <i>${t('site')}</i>`);
      el.classList.toggle('sel', UI.sel === k && (UI.tab === 'city' || (k === 'dungeon' && UI.tab === 'exp')));
      el.classList.toggle('unbuilt', L === 0 && !d.noLevel);
      el.querySelector('.slot-prog').classList.toggle('hidden', !G.E.consOf(k));
    }
  }

  function updateBadges() {
    const S = G.S;
    const set = (k, html) => {
      const el = $(`.slot[data-k="${k}"] .slot-badge`);
      if (el && el._h !== html) { el.innerHTML = html; el._h = html; el.classList.toggle('on', !!html); }
    };
    const fullB = (r) => (G.E.full(r) ? ic('i_bag') + '!' : '');
    set('lumber', fullB('wood'));
    set('quarry', fullB('stone'));
    set('mine', G.E.lvl('mine') ? fullB('iron') : '');
    set('forge', S.forge.q.length ? ic('i_anvil') + S.forge.q.length : '');
    set('dungeon', S.exp ? (S.exp.pend ? '!' : ic('i_flag') + (S.exp.phase === 'ret' ? S.exp.cleared : S.exp.floor)) : '');
    set('tavern', G.E.lvl('tavern') && S.tavern.cands.length && S.advs.length < G.T.maxAdvs() ? ic('i_people') + S.tavern.cands.length : '');
    set('academy', S.research.cur ? ic('i_book') : '');
    set('gate', G.W.active() ? ic('i_atk') : G.W.finalReady() ? ic('i_dragon') + '!' : '');
    set('warehouse', D.MAT.some((r) => G.S.seen[r] && G.E.full(r)) ? ic('i_bag') + '!' : '');
  }

  UI.slotClick = function (k, e, el) {
    if (G.W.active()) return;
    const prev = UI.sel + UI.tab;
    UI.sel = k;
    UI.tab = k === 'dungeon' ? 'exp' : 'city';
    const L = G.E.lvl(k), d = D.B[k];
    let text = '', icon = null;
    if (L > 0 && d.click) {
      const n = G.E.gather(k);
      if (n > 0) { text = '+' + U.fmt1(n); icon = 'r_' + d.click; G.SFX.play('gather'); }
      else { text = t('full'); icon = 'i_bag'; }
    } else if (k === 'forge' && L > 0 && G.F.boost()) { text = t('hammerHit'); icon = 'i_anvil'; G.SFX.play('hit'); }
    if (G.E.boost(k)) { text += (text ? ' ' : '') + '−1' + t('sec'); icon = icon || 'i_hammer'; G.SFX.play('click'); }
    if (text) { fxFloat(e, text, icon); bump(el); }
    if (prev !== UI.sel + UI.tab) { UI.dirty(); UI.slotsDirty = true; }
  };

  function fxFloat(e, text, icon) {
    const st = $('#stage').getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'float';
    f.style.left = e.clientX - st.left + 'px';
    f.style.top = e.clientY - st.top + 'px';
    f.innerHTML = (icon ? ic(icon) : '') + `<span>${esc(text)}</span>`;
    $('#fx').appendChild(f);
    setTimeout(() => f.remove(), 900);
  }
  function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // Виджет волны под стеной
  function renderWave() {
    const el = $('#wave-w');
    if (G.W.active() || G.W.battle()) { el.innerHTML = ''; return; }
    const s = G.S.gate, n = s.sel, pv = G.W.preview(n);
    const defs = G.T.gateCount();
    const mons = Object.entries(pv.counts).map(([k, c]) => `<span class="wm" title="${esc(t('mn_' + k))}">${ic(monSpr(k), 'ic-mon')}<b>${c}</b></span>`).join('');
    el.innerHTML = `<div class="ww">
      <button class="wbtn" data-action="wave" data-arg="-1" ${n <= 1 ? 'disabled' : ''}>◀</button>
      <span class="wt">${t('wave')} <b>${n}</b>${n % 5 === 0 ? ` <i class="boss">${t('boss')}</i>` : ''}</span>
      <button class="wbtn" data-action="wave" data-arg="1" ${n > s.best ? 'disabled' : ''}>▶</button>
      <span class="wmons">${mons}</span>
      <button class="wdef" data-action="sel" data-arg="gate" title="${esc(t('defense'))}">${ic('i_helmet')}${G.S.guards} ${ic('i_people')}${defs}/${G.T.gateMax()}</button>
      <button class="btn primary small" data-action="fight">${ic('i_atk')} ${t('toBattle')}</button>
      ${G.W.finalReady() ? `<button class="btn danger small" data-action="fightFinal">${ic('i_dragon')} ${t('finalBattle')}</button>` : ''}
    </div>`;
  }

  function renderSpells() {
    const k = G.S.king;
    const list = D.SPELLS.filter((sp) => k.lvl >= sp.lvl);
    $('#spellbar').innerHTML = list.map((sp) => `<button class="spell" data-action="cast" data-arg="${sp.id}" data-spell="${sp.id}" title="${esc(t('sp_' + sp.id) + ' — ' + t('spd_' + sp.id))}">${ic(sp.icon, 'ic2')}<span class="cd" data-b="cd:${sp.id}"></span></button>`).join('');
  }

  function renderKingBadge() {
    const k = G.S.king;
    $('#kbadge').innerHTML = `${ic('c_king', 'ic2')}<span class="kl">${t('lv')} <b data-b="klvl"></b></span>${bar('kxp', 'xp')}${G.K.tp() > 0 ? '<i class="sp">+</i>' : ''}`;
    $('#kbadge').title = t('king') + ' · ' + t('lv') + ' ' + k.lvl;
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
      if (UI.win === 'decision') UI.openDecision();
      else if (UI.win === 'settings') UI.openSettings();
      UI.dirty();
    },
    sound() { G.S.sound = !G.S.sound; applyStatic(); G.SFX.play('click'); },
    settings() { UI.openSettings(); },
    goals() { UI.open('goals'); },
    tab(a) { UI.tab = a; UI.slotsDirty = true; UI.dirty(); if (UI.win && UI.win !== 'decision') UI.closeModal(); },
    sel(k) { UI.sel = k; UI.tab = k === 'dungeon' ? 'exp' : 'city'; UI.slotsDirty = true; UI.dirty(); },
    up(k) { G.E.startUpgrade(k); },
    cancelUp(k) { G.E.cancelUpgrade(k); },
    decreeAdd(k) { G.E.decreeAdd(k); },
    decreeDel(a) { const [q, i] = a.split('|'); G.S.decree[q].splice(+i, 1); UI.dirty(); },
    decreeUp(a) {
      const [q, i] = a.split('|');
      const arr = G.S.decree[q], j = +i;
      if (j > 0) { [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]]; UI.dirty(); }
    },
    worker(k) { G.E.hireWorker(k); },
    tools() { G.E.upgradeTools(); },
    smith() { G.F.hireSmith(); },
    sell(a) { const [r, n] = a.split('|'); G.E.sell(r, n === 'half' ? (G.S.res[r] || 0) / 2 : +n); UI.dirty(); },
    buy(a) { const [r, n] = a.split('|'); G.E.buy(r, +n); UI.dirty(); },
    openCraft() { UI.open('craft'); },
    craftType(ty) { UI.craft.type = ty; UI.dirty(); },
    craftTier(ti) { UI.craft.ti = +ti; UI.dirty(); },
    craft() { G.F.craft(UI.craft.type, UI.craft.ti); },
    craftCancel(i) { G.F.cancel(+i); },
    openHire() { UI.open('hire'); },
    hire(i) { G.T.hire(+i); },
    reroll() { G.T.refresh(false); },
    guard() { G.T.hireGuard(); },
    gate(id) { G.T.setGate(id); },
    char(id) { UI.charPick = null; UI.open('char', id); },
    charPick(slot) { UI.charPick = UI.charPick === slot ? null : slot; UI.dirty(); },
    learn(a) { const [id, sid] = a.split('|'); G.T.learn(id, sid); },
    dismiss(id) {
      const a = G.T.get(id);
      if (a) UI.confirm(t('confirmDismiss', { name: esc(nm(a.name)) }), () => G.T.dismiss(id));
    },
    pick(a) {
      const [owner, slot] = a.split('|');
      if (owner === 'king') UI.open('pick', a);
      else { UI.charPick = slot; UI.open('char', owner); }
    },
    item(id) { UI.open('item', id); },
    eq(a) { const [id, owner] = a.split('|'); G.F.equip(id, owner); UI.charPick = null; if (UI.win === 'pick') UI.closeModal(); },
    uneq(id) { G.F.unequip(id); },
    sellItem(id) { G.F.sell(id); if (UI.win === 'item') UI.closeModal(); },
    sellJunk() { G.F.sellJunk(); },
    enchant(id) { G.F.enchant(id); },
    armF(f) { UI.armF = f; UI.dirty(); },
    wave(d) { const s = G.S.gate; s.sel = U.clamp(s.sel + +d, 1, s.best + 1); UI.dirty(); },
    fight() { G.W.start(false); UI.dirty(); },
    fightFinal() { G.W.start(true); UI.dirty(); },
    bclose() { G.W.close(); },
    cast(id) { G.K.cast(id); },
    talent(id) { G.K.learn(id); },
    advisor(id) { G.K.hireAdv(id); },
    perk(id) { G.K.buyPerk(id); },
    abdicate() { UI.confirm(t('confirmAbdicate', { n: G.K.legacyGain() }), () => G.K.abdicate()); },
    openRes() { UI.open('research'); },
    research(id) { G.R.start(id); },
    resQueue(id) { G.R.enqueue(id); },
    resCancel() { G.R.cancel(); },
    loc(id) { if (!G.S.exp) { G.S.dng.loc = id; G.S.dng.maxFloor = Math.min(G.S.dng.maxFloor, G.X.floors(id)); UI.dirty(); } },
    pickParty(id) {
      if (UI.party.has(id)) UI.party.delete(id);
      else if (UI.party.size < G.X.maxParty) UI.party.add(id);
      UI.dirty();
    },
    tac(v) { G.S.dng.tactic = v; UI.dirty(); },
    maxf(d) { G.S.dng.maxFloor = U.clamp(G.S.dng.maxFloor + +d, 1, Math.min(999, G.X.floors(G.S.dng.loc))); UI.dirty(); },
    send() { G.X.start([...UI.party], G.S.dng.loc, G.S.dng.tactic, G.S.dng.maxFloor); UI.party.clear(); },
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
      try { navigator.clipboard.writeText(ta.value).catch(() => {}); } catch (e) { /* текст уже выделен */ }
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
    reset() { UI.confirm(t('confirmReset'), () => { G.resetting = true; G.wipe(); location.reload(); }); },
  };
  UI.ACT = ACT;

  // ---------- рендер ----------
  UI.render = function () {
    UI._d = false;
    const p = $('#panel');
    const key = UI.tab + ':' + UI.sel;
    const st = UI.lastTab === key ? p.scrollTop : 0;
    p.innerHTML = (PANEL[UI.tab] || PANEL.city)();
    p.scrollTop = st;
    UI.lastTab = key;
    renderTabs();
    renderGoal();
    renderWave();
    renderSpells();
    renderKingBadge();
    if (UI.win && G.WIN[UI.win]) {
      const mb = $('#modal-box'), s = mb.scrollTop;
      mb.innerHTML = G.WIN[UI.win](UI.winArg);
      mb.scrollTop = s;
    }
    UI.slotsDirty = true;
    UI.refresh();
  };

  function renderTabs() {
    const S = G.S;
    const tabs = [
      ['city', 'tabCity', 'i_tower', S.cons.length ? ic('i_hammer') + S.cons.length : ''],
      ['guild', 'tabGuild', 'i_people', G.E.lvl('tavern') ? S.advs.length + '/' + G.T.maxAdvs() : ''],
      ['armory', 'tabArmory', 'i_def', S.items.length ? String(S.items.length) : ''],
      ['exp', 'tabExp', 'i_map', S.exp ? (S.exp.pend ? '!' : ic('i_flag') + (S.exp.phase === 'ret' ? S.exp.cleared : S.exp.floor)) : ''],
      ['king', 'tabKing', 'i_crown', G.K.tp() > 0 ? '+' + G.K.tp() : ''],
    ];
    $('#tabs').innerHTML = tabs.map(([k, lab, i, b]) => `<button class="tab ${UI.tab === k ? 'on' : ''}" data-action="tab" data-arg="${k}">${ic(i)}<span>${t(lab)}</span>${b ? `<em>${b}</em>` : ''}</button>`).join('');
  }

  function renderGoal() {
    const i = G.S.goal;
    const el = $('#goal');
    if (i >= D.GOALS.length) { el.innerHTML = `${ic('i_star')} <span>${t('goalsDone')}</span> <span class="more">${t('allGoals')}</span>`; return; }
    el.innerHTML = `${ic('i_star')} <b>${t('goalLabel')} ${i + 1}/${D.GOALS.length}:</b> <span>${t('goal' + i)}</span> <span class="muted">${lootHtml(D.GOALS[i].reward)}</span> <span class="more">${t('allGoals')} ›</span>`;
  }

  // ---------- панели вкладок ----------
  function navRow() {
    return `<div class="nav">${D.ORDER.map((k) => `<button class="navb ${UI.sel === k ? 'on' : ''}" data-action="sel" data-arg="${k}" title="${esc(t('bn_' + k))}">${ic(bSprite(k), 'ic2')}${D.B[k].noLevel ? '' : `<em>${G.E.lvl(k) || '–'}</em>`}${G.E.consOf(k) ? '<i class="dot"></i>' : ''}</button>`).join('')}</div>`;
  }

  function upgradeBox(k) {
    const c = G.E.consOf(k), L = G.E.lvl(k);
    if (c) {
      return box(ic('i_hammer') + ' ' + t(L ? 'consUp' : 'consBuild', { l: L + 1 }),
        `${bar('cons:' + k)}<div class="row"><span class="muted small">${ic('i_clock')} <span data-b="consT:${k}"></span></span><span class="grow"></span><button class="btn small" data-action="cancelUp" data-arg="${k}">${ic('i_x')} ${t('cancel')}</button></div><div class="hint">${t('consHint')}</div>`, 'cons');
    }
    const why = G.E.whyNot(k);
    if (why === 'max') return box('', `${ic('i_star')} ${t('maxLevel')}`, 'muted');
    const cost = G.E.upCost(k);
    let h = `<div class="hint top">${t('bh_' + k)}</div><div class="row">${costHtml(cost)}<span class="muted small">${ic('i_clock')} ${U.fmtTime(G.E.upTime(k))}</span></div>`;
    if (why === 'castle') h += `<div class="warn small">${ic('i_lock')} ${t('needCastle', { l: L })}</div>`;
    else if (why === 'storage') h += `<div class="warn small">${ic('i_bag')} ${t('needStorage')}</div>`;
    else if (why === 'builders') h += `<div class="warn small">${ic('i_hammer')} ${t('needBuilders')}</div>`;
    h += `<div class="row">${btn(ic('i_hammer') + ' ' + (L ? t('upgrade') : t('build')), 'up', k, { cost, chips: false, cls: 'primary', lock: !!why })}
      <button class="btn small" data-action="decreeAdd" data-arg="${k}" title="${esc(t('toDecreeHint'))}">${ic('i_scroll')} ${t('toDecree')}</button></div>`;
    return box(ic('i_up') + ' ' + (L ? t('upgradeTo', { l: L + 1 }) : t('build')), h);
  }

  function prodPanel(k) {
    const b = G.S.b[k], r = D.B[k].prod, mx = G.E.maxWorkers(k), L = G.E.lvl(k);
    const next = L < D.MAXLVL ? `<div class="muted small">${t('workersNext', { n: D.WORKERS[L + 1] })}</div>` : '';
    return box(ic('i_people') + ' ' + t('workers') + ` <span class="muted">${b.w}/${mx}</span>`, `
      ${kv('r_' + r, t('production'), `<b>${U.fmt1(b.w * G.E.workerRate(k))}</b>/${t('sec')} <span class="muted small">(${U.fmt1(G.E.workerRate(k))} ${t('perWorker')})</span>`)}
      ${kv('i_pick', t('clickGives'), `<b>+${U.fmt1(G.E.clickAmount(k))}</b> ${ic('r_' + r)}`)}
      ${G.E.full(r) ? `<div class="warn small">${ic('i_bag')} ${t('storageFull')}</div>` : ''}
      ${b.w < mx ? btn(ic('i_people') + ' ' + t('hireWorker'), 'worker', k, { cost: G.E.workerCost(k) }) : `<div class="muted small">${t('workersFull')}</div>${next}`}
      <div class="hint">${t('clickHint')}</div>`);
  }

  function defenders() {
    const battle = G.W.active();
    const defs = G.S.advs.filter((a) => a.st === 'gate');
    const avail = G.S.advs.filter((a) => a.st === 'idle');
    let h = `<div class="tiles">${defs.map((a) => advTile(a, battle ? 'char' : 'gate', a.id, true)).join('')}`;
    if (!battle && defs.length < G.T.gateMax()) h += avail.map((a) => advTile(a, 'gate', a.id, false)).join('');
    h += '</div>';
    if (!G.S.advs.length) h += `<div class="muted small">${G.E.lvl('tavern') ? t('noDefenders') : t('noDefendersTavern')}</div>`;
    return h;
  }

  const BP = {
    castle() {
      return box(ic('r_gold') + ' ' + t('treasury'), `
          ${kv('r_gold', t('taxes'), `<b data-b="tax"></b>/${t('sec')}`)}
          ${kv('i_pick', t('clickGives'), `<b>+${U.fmt1(G.E.clickAmount('castle'))}</b> ${ic('r_gold')}`)}
          <div class="hint">${t('taxHint')}</div>`) +
        box(ic('i_crown') + ' ' + t('king'), `
          ${kv('i_pick', t('gatherPower'), `<b>${U.fmt1(G.E.power())}</b>`)}
          ${G.S.king.tools < G.E.maxTools() ? btn(ic('i_pick') + ' ' + t('upTools', { l: G.S.king.tools + 1 }), 'tools', '', { cost: G.E.toolsCost() }) : `<div class="muted small">${t('toolsMax')}</div>`}
          ${kv('i_atk', t('kingDmg'), `<b>${G.W.kingDmg()}</b>`)}
          <div class="eqrow">${eqSlot('king', 'weapon')}</div>
          <button class="btn small" data-action="tab" data-arg="king">${ic('i_crown')} ${t('openKing')}</button>`);
    },
    lumber: () => prodPanel('lumber'),
    quarry: () => prodPanel('quarry'),
    mine: () => prodPanel('mine'),
    warehouse() {
      const L = G.E.lvl('warehouse');
      const rows = D.MAT.filter((r) => G.S.seen[r]).map((r) => `<div class="srow">${ic('r_' + r)}<span class="grow">${t('res_' + r)}</span><span class="small" data-b="store:${r}"></span>${bar('store:' + r, 'store')}</div>`).join('');
      const next = L < D.MAXLVL ? Math.floor(D.CAPS[L] * (1 + G.bonus('store'))) : 0;
      return box(ic('i_bag') + ' ' + t('capacity') + ` <span class="muted">${U.fmt(G.E.cap('wood'))}</span>`, rows + (next ? `<div class="hint">${t('nextCap', { n: U.fmt(next) })}</div>` : ''));
    },
    market() {
      const rows = D.MAT.filter((r) => G.S.seen[r]).map((r) => {
        const bt = G.E.batch(r);
        const buy = G.E.canBuy(r);
        return `<div class="trade">${ic('r_' + r, 'ic2')}<div class="grow"><div class="nm">${t('res_' + r)}</div>
          <div class="small"><span class="good">${t('rateSell', { n: bt, g: U.fmt1(G.E.sellPrice(r) * bt) })}</span> · ${buy ? `<span class="warn">${t('rateBuy', { n: bt, g: U.fmt1(G.E.buyPrice(r) * bt) })}</span>` : `<span class="muted">${t('buyLocked', { l: G.E.BUY_LVL[r] })}</span>`}</div></div>
          <div class="tbtns"><button class="btn small" data-action="sell" data-arg="${r}|${bt}" data-sellr="${r}" data-n="${bt}">−${bt}</button><button class="btn small" data-action="sell" data-arg="${r}|half" data-sellr="${r}" data-n="2">−½</button>${buy ? `<button class="btn small" data-action="buy" data-arg="${r}|${bt}" data-buyr="${r}" data-n="${bt}">+${bt}</button>` : ''}</div></div>`;
      }).join('');
      return box(ic('i_scale') + ' ' + t('rates'), rows + `<div class="hint">${t('marketHint')}</div>`);
    },
    forge() {
      const q = G.S.forge.q;
      let h = q.length ? q.map((j, i) => `<div class="job">${ic('it_' + j.type + ':' + j.ti, 'ic2')}<div class="grow"><div>${esc(nm(G.F.jobName(j)))}</div>${i === 0 ? `${bar('forge')}<div class="muted small" data-b="forgeT"></div>` : `<div class="muted small">${t('queued')}</div>`}</div><button class="btn small" data-action="craftCancel" data-arg="${i}" title="${esc(t('cancelRefund'))}">${ic('i_x')}</button></div>`).join('') : `<div class="muted">${t('forgeIdle')}</div>`;
      h += `<button class="btn primary big" data-action="openCraft">${ic('i_anvil')} ${t('openCraft')}</button><div class="hint">${t('forgeClickHint')}</div>`;
      let s = box(ic('i_anvil') + ' ' + t('forgeQueue') + ` <span class="muted">${q.length}/${G.F.qMax()}</span>`, h);
      s += box(ic('i_people') + ' ' + t('smiths') + ` <span class="muted">${G.S.b.forge.w}/${G.F.maxSmiths()}</span>`, `${kv('i_clock', t('craftSpeed'), `<b>×${G.F.speed().toFixed(2)}</b>`)}${G.S.b.forge.w < G.F.maxSmiths() ? btn(ic('i_people') + ' ' + t('hireSmith'), 'smith', '', { cost: G.F.smithCost() }) : ''}<div class="hint">${t('smithHint')}</div>`);
      s += box(ic('i_gem') + ' ' + t('rarityChances'), chancesRow(D.IRAR, G.F.rarChances(), G.F.rarOpen, 'ir'));
      return s;
    },
    tavern() {
      const S = G.S, full = S.advs.length >= G.T.maxAdvs();
      let h = `<div class="cands">${S.tavern.cands.map((c) => `<span class="cand" style="--rc:${D.ARAR[c.rar].color}" title="${esc(nm(c.name))}">${ic('c_' + c.cls, 'ic3')}</span>`).join('')}</div>`;
      h += `<div class="muted small">${t('newIn')} <span data-b="tavT"></span></div>`;
      h += `<button class="btn primary big" data-action="openHire">${ic('i_people')} ${t('openHire')}</button>`;
      if (full) h += `<div class="warn small">${t('guildFull')}</div>`;
      return box(ic('i_people') + ' ' + t('guildSize') + ` <span class="muted">${S.advs.length}/${G.T.maxAdvs()}</span>`, h) +
        box(ic('i_star') + ' ' + t('rarityChances'), chancesRow(D.ARAR, G.T.rarChances(), G.T.rarOpen, 'ar'));
    },
    barracks() {
      const mx = G.T.maxGuards();
      return box(ic('i_helmet') + ' ' + t('guards') + ` <span class="muted">${G.S.guards}/${mx}</span>`, `
        ${kv('i_atk', t('guardDmg'), `<b>${U.fmt1(G.T.guardDmg())}</b>`)}
        ${kv('i_tower', t('dps'), `<b>${U.fmt1((G.S.guards * G.T.guardDmg()) / 1.2)}</b>`)}
        ${G.S.guards < mx ? btn(ic('i_helmet') + ' ' + t('hireGuard'), 'guard', '', { cost: G.T.guardCost() }) : `<div class="muted small">${t('guardsFull')}</div>`}
        <div class="hint">${t('guardHint')}</div>`);
    },
    academy() {
      const c = G.S.research.cur;
      let h = c ? `<div class="job">${ic(G.R.get(c.id).icon, 'ic2')}<div class="grow"><div>${t('rs_' + c.id)}</div>${bar('rsch')}<div class="muted small" data-b="rschT"></div></div><button class="btn small" data-action="resCancel" title="${esc(t('cancelRefund'))}">${ic('i_x')}</button></div>` : `<div class="muted">${t('resIdle')}</div>`;
      h += `<div class="muted small">${t('resDone', { n: Object.keys(G.S.research.done).length, m: D.RESEARCH.length })} · ${t('resSpeed', { n: G.R.speed().toFixed(1) })}</div>`;
      h += `<button class="btn primary big" data-action="openRes">${ic('i_book')} ${t('openRes')}</button>`;
      return box(ic('i_book') + ' ' + t('researchNow'), h);
    },
    gate() {
      let h = box(ic('i_def') + ' ' + t('defense'), `
        ${kv('i_def', t('wallHp'), `<b>${U.fmt(G.W.wallHp())}</b>`)}
        ${kv('i_helmet', t('guards'), `<b>${G.S.guards}</b> <span class="muted small">(${t('dps')} ${U.fmt1((G.S.guards * G.T.guardDmg()) / 1.2)})</span>`)}
        ${kv('i_crown', t('kingDmg'), `<b>${G.W.kingDmg()}</b> ${t('perClick')}`)}`);
      h += box(ic('i_tower') + ' ' + t('onWall') + ` <span class="muted">${G.T.gateCount()}/${G.T.gateMax()}</span>`, `<div class="hint top">${t('wallHint')}</div>` + defenders());
      h += box(ic('i_atk') + ' ' + t('waves'), `<div class="muted small">${t('bestWave')}: <b>${G.S.gate.best}</b></div><div class="hint">${t('waveWidgetHint')}</div><div class="hint">${t('defeatHint')}</div>`);
      return h;
    },
  };

  function eqSlot(owner, slot) {
    const it = G.F.equipped(owner, slot);
    const lab = slot === 'weapon' ? t('weapon') : t('armor');
    const style = it ? ` style="--rc:${D.IRAR[it.rar].color}"` : '';
    const body = it ? ic('it_' + it.type + ':' + it.ti, 'ic2') + `<span>${itemMain(it)}</span>` : `<span class="muted">+ ${lab}</span>`;
    return `<button class="eq ${it ? 'has' : ''}" data-action="pick" data-arg="${owner}|${slot}" title="${lab}"${style}${G.F.lockedOwner(owner) ? ' disabled' : ''}>${body}</button>`;
  }
  UI.h.eqSlot = eqSlot;

  function cityPanel() {
    const k = UI.sel;
    if (k === 'dungeon') return navRow() + expBody();
    const L = G.E.lvl(k);
    let h = navRow();
    h += `<div class="bhead">${ic(bSprite(k), 'bimg')}<div><h2>${t('bn_' + k)}</h2><div class="lvl">${L ? t('levelOf', { l: L, m: D.MAXLVL }) : t('notBuilt')}</div><p class="desc">${t('bd_' + k)}</p></div></div>`;
    h += upgradeBox(k);
    if (L > 0 && BP[k]) h += BP[k]();
    return h;
  }

  function guildPanel() {
    if (G.E.lvl('tavern') < 1) return box('', t('needTavern'), 'muted');
    const A = G.S.advs;
    let h = box(ic('i_people') + ' ' + t('guild') + ` <span class="muted">${A.length}/${G.T.maxAdvs()}</span>`,
      `<div class="muted small">${A.length ? t('guildTip') : t('guildEmpty')}</div><div class="row"><button class="btn primary" data-action="openHire">${ic('i_people')} ${t('openHire')}</button></div>`);
    h += `<div class="tiles">${A.map((a) => advTile(a, 'char', a.id)).join('')}</div>`;
    return h;
  }

  function armoryPanel() {
    const f = UI.armF;
    const items = G.S.items.filter((i) => f === 'all' || i.type === f).sort((a, b) => (b.eq ? 1 : 0) - (a.eq ? 1 : 0) || b.rar - a.rar || b.ti - a.ti || G.F.score(b) - G.F.score(a));
    const junk = G.F.junk();
    let h = box(ic('i_crown') + ' ' + t('kingEq'), `<div class="eqrow">${eqSlot('king', 'weapon')}</div><div class="muted small">${t('kingDmg')}: ${G.W.kingDmg()}</div>`);
    const cats = ['all', ...Object.keys(D.ITYPES)];
    h += `<div class="filters">${cats.map((c) => `<button class="fbtn ${f === c ? 'on' : ''}" data-action="armF" data-arg="${c}" title="${esc(c === 'all' ? t('all') : t('it_' + c))}">${c === 'all' ? ic('i_chest', 'ic2') : ic('it_' + c + ':0', 'ic2')}</button>`).join('')}${junk.length ? `<button class="btn small" data-action="sellJunk">${ic('r_gold')} ${t('sellJunk', { n: junk.length })}</button>` : ''}</div>`;
    h += `<div class="legend small muted"><span class="lg-eq"></span> ${t('equippedLegend')}</div>`;
    if (!items.length) h += box('', G.E.lvl('forge') ? t('noItemsForge') : t('needForgeBuild'), 'muted');
    h += `<div class="igrid">${items.map((it) => itemTile(it)).join('')}</div>`;
    return h;
  }

  // ---------- походы ----------
  function worldMap() {
    const cur = G.S.exp ? G.S.exp.loc : G.S.dng.loc;
    const nodes = D.LOC_ORDER.map((id) => {
      const L = D.LOCS[id], open = G.X.locOpen(id);
      const best = G.X.best(id);
      return `<button class="wnode ${cur === id ? 'on' : ''} ${open ? '' : 'locked'}" data-action="loc" data-arg="${id}" style="left:${L.pos[0]}%;top:${L.pos[1]}%" ${open ? '' : 'disabled'}>
        ${ic(L.icon, 'ic3')}<span class="wn">${t('loc_' + id)}</span><span class="wb">${open ? `${ic('i_flag')}${best}${L.floors ? '/' + L.floors : ''}` : ic('i_lock')}</span></button>`;
    }).join('');
    return `<div class="wmap" style="background-image:url(${G.SPR.worldBg()})"><span class="wcap" style="left:12%;top:74%">${ic('i_crown', 'ic2')}<span class="wn">${t('capital')}</span></span>${nodes}</div>`;
  }

  function expBody() {
    if (G.E.lvl('tavern') < 1) return box('', t('needTavernDungeon'), 'muted');
    const e = G.S.exp;
    const loc = e ? e.loc : G.S.dng.loc;
    let h = worldMap();
    const L = D.LOCS[loc];
    h += `<div class="lochead">${ic(L.icon, 'ic3')}<div><h2>${t('loc_' + loc)}</h2><div class="desc">${t('locd_' + loc)}</div><div class="muted small">${t('deepest')}: <b>${G.X.best(loc)}</b>${L.floors ? ' / ' + L.floors : ''} · ${t('difficulty')}: <b>×${U.fmt1(L.diff * G.K.epochMul())}</b></div></div></div>`;
    if (!G.X.locOpen(loc)) return h + box('', `${ic('i_lock')} ${t('locLocked', { r: t('rs_' + L.unlock) })}`, 'muted');
    h += e ? expActive(e) : expSetup(loc);
    if (!e && G.S.lastExp) {
      const R = G.S.lastExp;
      h += box(ic('i_scroll') + ' ' + t('lastReport'), `<div class="${R.ok ? 'good' : 'bad'}">${R.ok ? t('lastOk', { f: R.floor, l: t('loc_' + R.loc) }) : t('lastFail', { f: R.floor, l: t('loc_' + R.loc) })}</div><div>${lootHtml(R.loot) || '—'}</div><div class="xlog">${R.log.map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div>`);
    }
    return h;
  }

  function expSetup(loc) {
    const idle = G.S.advs.filter((a) => a.st === 'idle');
    for (const id of [...UI.party]) {
      const a = G.T.get(id);
      if (!a || a.st !== 'idle') UI.party.delete(id);
    }
    const Dn = G.S.dng;
    Dn.maxFloor = Math.min(Dn.maxFloor, G.X.floors(loc));
    let h = box(ic('i_people') + ' ' + t('party') + ` <span class="muted">${UI.party.size}/${G.X.maxParty}</span>`,
      idle.length ? `<div class="tiles">${idle.map((a) => advTile(a, 'pickParty', a.id, UI.party.has(a.id))).join('')}</div>` : `<div class="muted small">${G.S.advs.length ? t('noIdle') : t('guildEmpty')}</div>`);
    const tacIcon = { aggressive: 'i_atk', balanced: 'i_scale', careful: 'i_def' };
    h += box(ic('i_scroll') + ' ' + t('orders'), `<div class="seg">${['aggressive', 'balanced', 'careful'].map((v) => `<button class="btn small ${Dn.tactic === v ? 'primary' : ''}" data-action="tac" data-arg="${v}">${ic(tacIcon[v])} ${t('tac_' + v)}</button>`).join('')}</div>
      <div class="muted small">${t('tacd_' + Dn.tactic)}</div>
      <div class="wavesel">${t('maxFloor')}: <button class="btn small" data-action="maxf" data-arg="-1">◀</button><b>${Dn.maxFloor}</b><button class="btn small" data-action="maxf" data-arg="1">▶</button></div>
      <button class="btn small ${Dn.live ? 'primary' : ''}" data-action="live">${Dn.live ? '✓' : '✗'} ${t('liveDec')}</button>
      <div class="muted small">${t('liveHint')}</div>`);
    h += `<button class="btn primary big" data-action="send" ${UI.party.size ? '' : 'disabled'}>${ic('i_flag')} ${t('sendParty')}</button>`;
    return h;
  }

  function expActive(e) {
    const ms = G.X.members();
    const fl = e.phase === 'ret' ? e.cleared : e.floor;
    const ph = { travel: t('phTravel', { f: e.floor }), enc: t('phEnc'), fight: t('phFight', { r: e.round }), after: t('phAfter'), ret: t('phRet') }[e.phase];
    const showFoe = e.enemy && (e.phase === 'enc' || e.phase === 'fight');
    let h = `<div class="scene ${e.phase === 'fight' ? 'fighting' : ''}" style="background-image:url(${G.SPR.dungeonBg(e.loc)})">
      <div class="sfloor">${t('floor')} <b>${fl}</b></div>
      <div class="party">${ms.map((a) => `<div class="fig ${a.hp <= 0 ? 'down' : ''}">${ic('c_' + a.cls, 'ic3')}${bar('hp:' + a.id, 'hp')}</div>`).join('')}</div>
      ${showFoe ? `<div class="foe">${ic(monSpr(e.enemy.key), 'ic4')}<div class="fn">${esc(nm(G.X.enemyName(e.enemy)))}</div>${bar('ehp', 'hp')}<div class="small" data-b="ehp"></div></div>` : `<div class="walk">${ic('i_flag', 'ic2')}<span>${ph}</span></div>`}
    </div>`;
    let body = `<div class="phase">${ph}</div>`;
    if (e.phase === 'travel' || e.phase === 'ret') body += `${bar('exp')}<div class="muted small" data-b="expT"></div>`;
    if (e.pend) body += `<button class="btn primary big" data-action="openDec">${ic('i_scroll')} ${t('awaitOrder')}</button>`;
    if (e.phase === 'fight' || e.flog.length) body += `<div class="flog">${e.flog.map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div>`;
    body += `<div class="kv small">${t('orders')}: <b>${t('tac_' + e.tactic)}</b> · ${t('maxFloor')}: <b>${e.maxFloor}</b></div>`;
    body += `<div class="kv">${ic('i_chest')} ${t('backpack')}: ${lootHtml(e.loot) || '—'}</div>`;
    if (e.phase !== 'ret') body += `<button class="btn small" data-action="recall" ${e.recall ? 'disabled' : ''}>${e.recall ? t('recalling') : t('recall')}</button>`;
    h += box('', body);
    h += box(ic('i_scroll') + ' ' + t('chronicle'), `<div class="xlog">${e.log.map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div>`);
    return h;
  }

  // ---------- король ----------
  function kingPanel() {
    const k = G.S.king, tp = G.K.tp();
    let h = `<div class="bhead">${ic('c_king', 'bimg')}<div><h2>${t('king')}</h2><div class="lvl">${t('lv')} <b>${k.lvl}</b> / ${D.KING_MAX}</div>${bar('kxp', 'xp')}<div class="muted small" data-b="kxpT"></div><div class="small">${t('talentPts')}: <b class="${tp ? 'good' : ''}">${tp}</b></div><div class="hint">${t('kingXpHint')}</div></div></div>`;
    // заклинания
    h += box(ic('i_fire') + ' ' + t('spells'), D.SPELLS.map((sp) => {
      const open = k.lvl >= sp.lvl;
      return `<div class="spl ${open ? '' : 'locked'}">${ic(sp.icon, 'ic2')}<div class="grow"><b>${t('sp_' + sp.id)}</b> <span class="muted small">${sp.battle ? t('inBattle') : ''}</span><div class="small">${t('spd_' + sp.id, { d: G.K.meteorDmg() })}</div><div class="muted small">${t('cooldown')}: ${U.fmtTime(G.K.spellCd(sp))}</div></div>${open ? `<button class="btn small" data-action="cast" data-arg="${sp.id}" data-spell="${sp.id}">${t('cast')} <span data-b="cd:${sp.id}"></span></button>` : `<span class="muted small">${ic('i_lock')} ${t('lv')} ${sp.lvl}</span>`}</div>`;
    }).join(''));
    // таланты
    const br = ['war', 'build', 'trade'];
    h += box(ic('i_star') + ' ' + t('talents') + ` <span class="muted">${tp}</span>`, `<div class="tal3">${br.map((b) => `<div class="tcol"><div class="tbr">${t('br_' + b)}</div>${D.TALENTS.filter((x) => x.br === b).map((x) => {
      const r = k.tal[x.id] || 0;
      return `<div class="tal">${ic(x.icon, 'ic2')}<div class="grow"><b>${t('tl_' + x.id)}</b><div class="small muted">${t('tld_' + x.id)}</div>${pips(r, D.TAL_MAX)}</div><button class="btn small" data-action="talent" data-arg="${x.id}" ${tp > 0 && r < D.TAL_MAX ? '' : 'disabled'}>+</button></div>`;
    }).join('')}</div>`).join('')}</div>`);
    // советники
    h += box(ic('i_people') + ' ' + t('council'), `<div class="advs">${D.ADVISORS.map((a) => {
      const l = G.K.advLvl(a.id), open = G.K.advOpen(a);
      return `<div class="advc ${open ? '' : 'locked'}">${ic('adv_' + a.id, 'ic3')}<div class="grow"><b>${t('ad_' + a.id)}</b> ${pips(l, D.ADV_MAX)}<div class="small muted">${t('add_' + a.id)}</div>
        ${!open ? `<div class="small">${ic('i_lock')} ${t('needCastleLvl', { l: a.castle })}</div>` : l >= D.ADV_MAX ? `<div class="small good">${t('maxLevel')}</div>` : btn(l ? t('promote') : t('hireAdv'), 'advisor', a.id, { cost: G.K.advCost(a.id), cls: 'small' })}</div></div>`;
    }).join('')}</div>`);
    // указы
    const dq = G.S.decree;
    const qList = (q, nameKey, icon) => (dq[q].length ? dq[q].map((x, i) => `<div class="dq">${ic(icon(x), 'ic2')}<span class="grow">${i + 1}. ${t(nameKey + x)}</span><button class="btn small" data-action="decreeUp" data-arg="${q}|${i}" ${i ? '' : 'disabled'}>▲</button><button class="btn small" data-action="decreeDel" data-arg="${q}|${i}">${ic('i_x')}</button></div>`).join('') : `<div class="muted small">${t('decreeEmpty')}</div>`);
    h += box(ic('i_scroll') + ' ' + t('decrees'), `<div class="hint top">${t('decreeHint')}</div>
      <h4>${ic('i_hammer')} ${t('decreeBuild')} <span class="muted">${G.S.cons.length}/${G.E.builders()} ${t('buildersBusy')}</span></h4>${qList('build', 'bn_', (x) => bSprite(x))}
      <div class="addrow">${D.ORDER.filter((x) => !D.B[x].noLevel).map((x) => `<button class="navb" data-action="decreeAdd" data-arg="${x}" title="${esc(t('bn_' + x))}">${ic(bSprite(x), 'ic2')}</button>`).join('')}</div>
      <h4>${ic('i_book')} ${t('decreeRes')}</h4>${qList('research', 'rs_', (x) => G.R.get(x).icon)}
      <button class="btn small" data-action="openRes" ${G.E.lvl('academy') ? '' : 'disabled'}>${ic('i_book')} ${t('openRes')}</button>`);
    // династия
    const dyn = G.S.dyn;
    let dh = `<div class="small">${t('epoch')}: <b>${dyn.epoch + 1}</b> · ${t('legacyPts')}: <b>${dyn.pts}</b></div>`;
    if (G.S.camp.won) dh += `<div class="row">${btn(ic('i_crown') + ' ' + t('abdicate', { n: G.K.legacyGain() }), 'abdicate', '', { cls: 'danger' })}</div><div class="hint">${t('abdicateHint')}</div>`;
    else dh += `<div class="muted small">${ic('i_lock')} ${t('dynastyLocked')}</div>`;
    dh += `<div class="perks">${D.PERKS.map((p) => {
      const r = G.K.perkRank(p.id);
      return `<div class="perk">${ic(p.icon, 'ic2')}<div class="grow"><b>${t('pk_' + p.id)}</b> ${pips(Math.min(r, 10), D.PERK_MAX)}<div class="small muted">${t('pkd_' + p.id)}</div></div><button class="btn small" data-action="perk" data-arg="${p.id}" ${dyn.pts >= G.K.perkCost(p.id) && r < D.PERK_MAX ? '' : 'disabled'}>${G.K.perkCost(p.id)} ${ic('i_crown')}</button></div>`;
    }).join('')}</div>`;
    h += box(ic('i_crown') + ' ' + t('dynasty'), dh);
    return h;
  }

  const PANEL = { city: cityPanel, guild: guildPanel, armory: armoryPanel, exp: expBody, king: kingPanel };

  // ---------- окна ----------
  UI.open = function (kind, arg) {
    UI.win = kind;
    UI.winArg = arg;
    const m = $('#modal');
    m.classList.remove('hidden');
    m.dataset.kind = kind;
    $('#modal-box').className = 'w-' + kind;
    $('#modal-box').innerHTML = G.WIN[kind](arg);
    $('#modal-box').scrollTop = 0;
    UI.refresh();
  };
  UI.modal = function (html, kind) {
    UI.win = kind || 'plain';
    UI.winArg = null;
    const m = $('#modal');
    $('#modal-box').className = 'w-' + UI.win;
    $('#modal-box').innerHTML = html;
    m.classList.remove('hidden');
    m.dataset.kind = UI.win;
    UI.refresh();
  };
  UI.closeModal = function () {
    $('#modal').classList.add('hidden');
    UI.win = null;
    UI.winArg = null;
    if (G.S.exp && G.S.exp.pend) setTimeout(() => UI.openDecision(), 0);
    UI.dirty();
  };
  UI.closeDecision = function () {
    if (UI.win === 'decision') { $('#modal').classList.add('hidden'); UI.win = null; }
  };
  UI.confirm = function (text, yes) {
    UI._yes = yes;
    UI.modal(`<p>${text}</p><div class="right"><button class="btn" data-action="mclose">${t('no')}</button> <button class="btn danger" data-action="yes">${t('yes')}</button></div>`, 'confirm');
  };
  UI.openSettings = function () {
    UI.modal(`<h2>${t('settings')}</h2>
      ${box(t('language'), `<button class="btn" data-action="lang">${G.LANG === 'ru' ? 'English' : 'Русский'}</button> <button class="btn" data-action="sound">${ic(G.S.sound ? 'i_snd' : 'i_mute')} ${t('sound')}</button>`)}
      ${box(t('saveTitle'), `<div class="muted small">${t('saveHint')}</div><textarea id="save-text" rows="3" spellcheck="false"></textarea><div class="row"><button class="btn small" data-action="exportSave">${t('export')}</button><button class="btn small" data-action="importSave">${t('import')}</button><span id="save-msg" class="muted small"></span></div>`)}
      ${box(t('danger'), `<button class="btn danger" data-action="reset">${t('reset')}</button>`)}
      <div class="muted small">${t('about')}</div>
      <div class="right"><button class="btn" data-action="mclose">${t('close')}</button></div>`, 'settings');
  };
  UI.offlineReport = function (rep) {
    UI.modal(`<h2>${t('welcomeBack')}</h2><p>${t('awayFor', { t: U.fmtTime(rep.sec) })}</p>${box('', lootHtml(rep.gain) || t('nothing'))}<div class="right"><button class="btn primary" data-action="mclose">${t('ok')}</button></div>`, 'offline');
  };
  UI.story = function (id) {
    UI.modal(`<div class="story">${ic(id === 'awake' ? 'm_dragon' : 'i_crown', 'story-img')}<h2>${t('story_' + id)}</h2><p>${t('storyd_' + id)}</p></div><div class="right"><button class="btn primary" data-action="mclose">${t('ok')}</button></div>`, 'story');
    G.SFX.play(id === 'awake' ? 'horn' : 'win');
  };

  UI.openDecision = function () {
    const e = G.S.exp;
    if (!e || !e.pend) return;
    const ms = G.X.members();
    const party = `<div class="dparty">${ms.map((a) => `<div class="fig ${a.hp <= 0 ? 'down' : ''}">${ic('c_' + a.cls, 'ic3')}<div class="small">${esc(nm(a.name))}</div>${bar('hp:' + a.id, 'hp')}</div>`).join('')}</div>`;
    const choice = (arg, icon, title, desc, p, flee) => `<button class="choice" data-action="dec" data-arg="${arg}">${ic(icon, 'ic2')}<b>${title}</b><span class="small">${desc}</span>${p === undefined ? '' : `<span class="pct ${p >= 0.7 ? 'good' : p >= 0.4 ? 'mid' : 'bad'}">${flee ? t('escape') : t('winChance')}: ${Math.round(p * 100)}%</span>`}</button>`;
    let h;
    if (e.pend.kind === 'enc') {
      const en = e.enemy;
      h = `<h2>${t('decEncTitle', { f: en.f, l: t('loc_' + e.loc) })}</h2>
        <div class="enc">${ic(monSpr(en.key), 'ic4')}<div><div class="nm">${esc(nm(G.X.enemyName(en)))}</div><div class="small">${ic('i_hp')} ${U.fmt(en.hp)} ${ic('i_atk')} ${U.fmt1(en.atk)}</div>${en.boss ? `<div class="warn small">${t('bossFloor')}</div>` : ''}</div></div>
        ${party}
        <div class="choices">${choice('enc|attack', 'i_atk', t('ch_attack'), t('chd_attack'), G.X.chance('attack'))}${choice('enc|defend', 'i_def', t('ch_defend'), t('chd_defend'), G.X.chance('defend'))}${choice('enc|flee', 'i_boot', t('ch_flee'), t('chd_flee'), G.X.fleeChance(), true)}</div>`;
    } else {
      const nf = e.floor + 1;
      h = `<h2>${t('decAfterTitle', { f: e.floor })}</h2>${party}
        <div class="kv">${ic('i_chest')} ${t('backpack')}: ${lootHtml(e.loot) || '—'}</div>
        <div class="muted small">${t('nextFloor', { f: nf })}${nf % 5 === 0 ? ' — ' + t('bossFloor') : ''}</div>
        <div class="choices">${choice('after|deeper', 'i_flag', t('ch_deeper'), t('chd_deeper'))}${choice('after|return', 'i_chest', t('ch_return'), t('chd_return'))}</div>`;
    }
    h += `<div class="countdown">${ic('i_clock')} ${t('autoIn')} <b data-b="decT"></b> · ${t('autoOrder')}: <b>${t('ch_' + G.X.autoChoice(e.pend.kind))}</b></div>`;
    UI.modal(h, 'decision');
  };

  // ---------- бой у ворот ----------
  UI.showBattle = function (on) {
    $('#map').classList.toggle('hidden', on);
    $('#stage').classList.toggle('in-battle', on);
    $('#battle').classList.toggle('hidden', !on);
    if (on) {
      $('#battle-head').innerHTML = `<b id="bh-wave"></b><span id="bh-left"></span><span class="gatelab">${ic('i_def')}</span><div class="bar gatebar"><i id="bh-gate"></i></div><span id="bh-gtxt"></span>`;
      $('#battle-foot').innerHTML = `<div class="hint">${t('battleHint', { d: G.W.kingDmg() })}</div>`;
    }
    UI.slotsDirty = true;
    UI.dirty();
  };
  UI.battleHud = function (B) {
    const w = $('#bh-wave');
    if (!w) return;
    const left = B.queue.length + B.mons.filter((m) => !m.dead).length;
    w.textContent = B.n === 'final' ? t('finalBattle') : t('wave') + ' ' + B.n;
    $('#bh-left').textContent = t('monstersLeft') + ': ' + left + '/' + B.total;
    $('#bh-gate').style.width = ((B.gate / B.gateMax) * 100).toFixed(1) + '%';
    $('#bh-gtxt').textContent = Math.ceil(B.gate) + '/' + B.gateMax;
  };
  UI.battleResult = function (r) {
    let h;
    if (r.win) h = `<div class="res-win">${r.final ? t('finalVictory') : t('victory')}</div><div>${lootHtml({ gold: r.gold, bone: r.bone })} · ${t('xpEach', { n: r.xp })}${r.wounded ? ' · ' + t('woundedN', { n: r.wounded }) : ''}</div>`;
    else h = `<div class="res-lose">${t('defeat')}</div><div>${t('plundered')}: ${lootHtml(r.lost) || '—'}${r.broken ? ' · ' + t('brokenB', { b: t('bn_' + r.broken) }) : ''}${r.dead.length ? ' · ' + t('deadN', { names: r.dead.map((n) => esc(nm(n))).join(', ') }) : ''}</div>`;
    $('#battle-foot').innerHTML = h + `<button class="btn primary" data-action="bclose">${t('backToCity')}</button>`;
    if (r.win && r.final) setTimeout(() => UI.story('won'), 600);
  };

  // ---------- журнал: новые записи снизу ----------
  function renderLog() {
    UI.logDirty = false;
    const el = $('#log');
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    el.innerHTML = G.S.log.slice(-50).map((l) => `<div class="le ${l.c}">${fmtEntry(l)}</div>`).join('');
    if (atBottom || !UI._logInit) el.scrollTop = el.scrollHeight;
    UI._logInit = true;
  }

  // ---------- ресурсы ----------
  function renderResbar() {
    const bar = $('#resbar');
    const shown = D.RES.filter((r) => G.S.seen[r] || G.S.res[r] > 0);
    const sig = shown.join(',') + G.LANG;
    if (bar.dataset.sig === sig) return;
    bar.dataset.sig = sig;
    bar.innerHTML = shown.map((r) => `<div class="res" title="${esc(t('res_' + r))}">${ic('r_' + r)}<div class="rcol"><div><span class="rv" data-b="res:${r}"></span>${r === 'gold' ? '' : `<span class="rc" data-b="cap:${r}"></span>`}</div><div class="rline">${r === 'gold' ? '' : `<div class="rbar"><i data-w="store:${r}"></i></div>`}<span class="rr" data-b="rate:${r}"></span></div></div></div>`).join('');
  }

  // ---------- живые значения ----------
  const BIND = {
    res: (r) => U.fmt(G.S.res[r]),
    cap: (r) => '/' + U.fmt(G.E.cap(r)),
    rate: (r) => { const v = UI._rates[r]; return v ? '+' + U.fmt1(v) : ''; },
    store: (r) => U.fmt(G.S.res[r]) + ' / ' + U.fmt(G.E.cap(r)),
    tax: () => U.fmt1(G.E.tax()),
    consT: (k) => { const c = G.E.consOf(k); return c ? U.fmtTime(c.t) : ''; },
    forgeT: () => { const j = G.S.forge.q[0]; return j ? U.fmtTime(j.t / G.F.speed()) : ''; },
    tavT: () => U.fmtTime(G.S.tavern.t),
    hp: (id) => { const a = G.T.get(id); return a ? Math.ceil(a.hp) + '/' + G.T.stats(a).hp : ''; },
    wt: (id) => { const a = G.T.get(id); return a && a.st === 'wounded' ? U.fmtTime(a.wt) : ''; },
    expT: () => (G.S.exp ? U.fmtTime(G.S.exp.t) : ''),
    ehp: () => { const e = G.S.exp; return e && e.enemy ? U.fmt(Math.max(0, e.phase === 'fight' ? e.ehp : e.enemy.hp)) + '/' + U.fmt(e.enemy.max) : ''; },
    decT: () => { const e = G.S.exp; return e && e.pend ? U.fmtTime((e.pend.dl - Date.now()) / 1000) : ''; },
    rschT: () => { const c = G.S.research.cur; return c ? U.fmtTime(c.t) : ''; },
    cd: (id) => { const v = G.S.king.cd[id] || 0; const b = id === 'rush' ? G.S.king.buff.rush : id === 'rallyS' ? G.S.king.buff.rally : 0; return b > 0 ? U.fmtTime(b) : v > 0 ? U.fmtTime(v) : ''; },
    klvl: () => String(G.S.king.lvl),
    kxpT: () => U.fmt(G.S.king.xp) + ' / ' + U.fmt(G.K.need()),
  };
  const BAR = {
    store: (r) => (G.S.res[r] || 0) / G.E.cap(r),
    cons: (k) => { const c = G.E.consOf(k); return c ? 1 - c.t / c.total : 0; },
    forge: () => { const j = G.S.forge.q[0]; return j ? 1 - j.t / j.total : 0; },
    hp: (id) => { const a = G.T.get(id); return a ? a.hp / G.T.stats(a).hp : 0; },
    exp: () => { const e = G.S.exp; return e && e.tt ? 1 - e.t / e.tt : 0; },
    ehp: () => { const e = G.S.exp; return e && e.enemy ? (e.phase === 'fight' ? e.ehp : e.enemy.hp) / e.enemy.max : 0; },
    rsch: () => { const c = G.S.research.cur; return c ? 1 - c.t / c.total : 0; },
    kxp: () => G.S.king.xp / G.K.need(),
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
    for (const b of $$('[data-sellr]')) b.disabled = (G.S.res[b.dataset.sellr] || 0) < +b.dataset.n;
    for (const b of $$('[data-buyr]')) {
      const r = b.dataset.buyr, n = +b.dataset.n;
      b.disabled = G.S.res.gold < Math.ceil(n * G.E.buyPrice(r)) || G.S.res[r] + n > G.E.cap(r);
    }
    for (const b of $$('[data-spell]')) {
      b.disabled = !G.K.ready(b.dataset.spell);
      b.classList.toggle('active', (b.dataset.spell === 'rush' && G.S.king.buff.rush > 0) || (b.dataset.spell === 'rallyS' && G.S.king.buff.rally > 0));
    }
    $('#rush-ind').classList.toggle('hidden', !(G.S.king.buff.rush > 0));
    updateBadges();
  };
})();
