(function () {
  const UI = (G.UI = {
    tab: 'decree', pop: 'castle', _d: true, slotsDirty: true, logDirty: true, party: new Set(), pdown: false,
    lastTab: '', craft: { type: 'sword', ti: 0 }, armF: 'all', win: null, winArg: null,
    selAdv: null, selItem: null, pick: null, wallTier: -1,
  });
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const t = (k, p) => G.t(k, p);
  const U = G.U, D = G.D;
  const esc = U.esc;

  // ---------- общие помощники ----------
  const ic = (k, cls) => `<img class="${cls || 'ic'}" src="${G.SPR.url(k)}" alt="">`;
  // облик здания: 1–2 уровень — 1, 3–4 — 2, 5–6 — 3, 7–8 — 4
  const tierOf = (L) => Math.max(1, Math.min(4, Math.ceil(L / 2)));
  const bSprite = (k) => {
    if (k === 'dungeon') return 'b_dungeon';
    const L = G.E.lvl(k);
    return L === 0 ? 'b_site' : 'b_' + k + ':' + tierOf(L);
  };
  const nm = (v) => (!v ? '' : typeof v === 'string' ? v : v.k ? t(v.k) + (v.suffix || '') : G.tn(v));
  const monSpr = (k) => D.MON[k].spr || 'm_' + k;
  const X_COND = () => G.X.cond();
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
    return `<button class="itile ${it.eq ? 'eq' : ''} ${UI.selItem === it.id && !action ? 'on' : ''}" data-action="${action || 'item'}" data-arg="${arg || it.id}" style="--rc:${R.color}" title="${esc(G.F.name(it))}">
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
      el.innerHTML = `<img class="slot-img" alt="" draggable="false"><img class="slot-scaf hidden" alt="" draggable="false" src="${G.SPR.url('b_scaffold')}">
        <span class="slot-hammer hidden">${ic('i_hammer')}</span><div class="slot-label"></div>
        <div class="slot-prog hidden"><i data-w="cons:${k}"></i></div><div class="slot-badge"></div><div class="slot-dec"></div>`;
      box.appendChild(el);
    }
    box.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.slot');
      if (!el) return;
      e.preventDefault();
      UI.slotClick(el.dataset.k, e, el);
    });
    box.addEventListener('pointermove', (e) => {
      const el = e.target.closest('.slot');
      if (!el || e.pointerType === 'touch' || UI.pop === el.dataset.k) { hideTip(); return; }
      UI.tipK = el.dataset.k;
      placeTip(e);
      renderTip();
    });
    box.addEventListener('pointerleave', hideTip);
  }

  // Окно здания — своя колонка рядом с картой, вкладки справа работают независимо.
  // Катакомбы открывают вкладку «Походы».
  UI.openPop = function (k) {
    if (k === 'dungeon') { if (UI.tab !== 'exp') { UI.tab = 'exp'; UI.dirty(); } return; }
    if (UI.pop === k) return;
    UI.pop = k;
    hideTip();
    UI.slotsDirty = true;
    UI.dirty();
  };

  // ---------- подсказка при наведении: уровень, цена и время улучшения ----------
  function hideTip() {
    UI.tipK = null;
    $('#tip').classList.add('hidden');
  }
  function placeTip(e) {
    const st = $('#stage').getBoundingClientRect(), tip = $('#tip');
    let x = e.clientX - st.left + 14, y = e.clientY - st.top + 14;
    if (x + 250 > st.width) x = e.clientX - st.left - 260;
    if (y + 140 > st.height) y = e.clientY - st.top - 150;
    tip.style.left = Math.max(4, x) + 'px';
    tip.style.top = Math.max(4, y) + 'px';
  }
  function tipHtml(k) {
    const d = D.B[k], L = G.E.lvl(k);
    let h = `<b>${t('bn_' + k)}</b>`;
    if (k === 'dungeon') {
      h += ` · ${t('deepest')}: ${G.X.best('catacombs')}`;
      if (G.S.exp) h += `<div class="warn">${ic('i_flag')} ${t('tipExp', { f: G.S.exp.phase === 'ret' ? G.S.exp.cleared : G.S.exp.floor })}</div>`;
    } else {
      h += ` · ${L ? t('lv') + ' ' + L : t('notBuilt')}`;
      const c = G.E.consOf(k);
      if (c) h += `<div class="warn">${ic('i_hammer')} ${t(L ? 'consUp' : 'consBuild', { l: L + 1 })}: ${U.fmtTime(c.t)}</div>`;
      else {
        const why = G.E.whyNot(k);
        if (why === 'max') h += `<div class="good">${t('maxLevel')}</div>`;
        else {
          h += `<div>${L ? t('upgradeTo', { l: L + 1 }) : t('build')}:</div><div class="row">${costHtml(G.E.upCost(k))}<span class="muted">${ic('i_clock')} ${U.fmtTime(G.E.upTime(k))}</span></div>`;
          if (why === 'castle') h += `<div class="warn">${t('needCastle', { l: L })}</div>`;
          else if (why === 'storage') h += `<div class="warn">${t('needStorage')}</div>`;
          else if (why === 'builders') h += `<div class="warn">${t('needBuildersShort')}</div>`;
        }
      }
      if (d.prod && L) h += `<div class="muted">${ic('i_people')} ${G.S.b[k].w}/${G.E.maxWorkers(k)} · +${U.fmt1(G.S.b[k].w * G.E.workerRate(k))}/${t('sec')}</div>`;
    }
    return h + `<div class="muted tiphint">${t('tipOpen')}</div>`;
  }
  function renderTip() {
    if (!UI.tipK) return;
    const tip = $('#tip'), html = tipHtml(UI.tipK);
    if (tip._h !== html) { tip.innerHTML = html; tip._h = html; }
    tip.classList.remove('hidden');
  }

  function wallTier() {
    const L = G.E.lvl('gate');
    return L === 0 ? 0 : L >= 6 ? 3 : L >= 3 ? 2 : 1;
  }

  function updateSlots() {
    UI.slotsDirty = false;
    const wt = wallTier();
    if (wt !== UI.wallTier) { UI.wallTier = wt; G.SPR.mapBg($('#mapbg'), wt); }
    const dq = G.S.decree.build;
    for (const el of $$('.slot')) {
      const k = el.dataset.k, L = G.E.lvl(k), d = D.B[k];
      const key = bSprite(k);
      const img = el.firstElementChild;
      if (img.dataset.key !== key) { img.src = G.SPR.url(key); img.dataset.key = key; }
      el.querySelector('.slot-label').innerHTML = esc(t('bn_' + k)) + (d.noLevel || !L ? '' : ` <b>${L}</b>`);
      el.classList.toggle('sel', UI.pop === k);
      el.classList.toggle('unbuilt', L === 0 && !d.noLevel);
      const cons = !!G.E.consOf(k);
      el.classList.toggle('building', cons);
      el.querySelector('.slot-prog').classList.toggle('hidden', !cons);
      el.querySelector('.slot-hammer').classList.toggle('hidden', !cons);
      el.querySelector('.slot-scaf').classList.toggle('hidden', !(cons && L > 0));
      // значок указа: позиции здания в очереди строительства
      const pos = dq.map((x, i) => (x === k ? i + 1 : 0)).filter(Boolean);
      const decEl = el.querySelector('.slot-dec');
      const html = pos.length ? ic('i_scroll') + pos.join(',') : '';
      if (decEl._h !== html) { decEl.innerHTML = html; decEl._h = html; decEl.classList.toggle('on', !!html); }
    }
  }

  function updateBadges() {
    const S = G.S;
    const set = (k, html) => {
      const el = $(`.slot[data-k="${k}"] .slot-badge`);
      if (el && el._h !== html) { el.innerHTML = html; el._h = html; el.classList.toggle('on', !!html); }
    };
    const fullB = (k, r) => (G.E.lvl(k) && G.E.full(r) ? ic('i_bag') + '!' : '');
    set('lumber', fullB('lumber', 'wood'));
    set('quarry', fullB('quarry', 'stone'));
    set('mine', fullB('mine', 'iron'));
    set('castle', fullB('castle', 'gold'));
    set('forge', S.forge.q.length ? ic('i_anvil') + S.forge.q.length : '');
    set('dungeon', S.exp ? (S.exp.pend ? '!' : ic('i_flag') + (S.exp.phase === 'ret' ? S.exp.cleared : S.exp.floor)) : '');
    set('tavern', G.E.usable('tavern') && S.tavern.cands.length && S.advs.length < G.T.maxAdvs() ? ic('i_people') + S.tavern.cands.length : '');
    set('academy', S.research.cur ? ic('i_book') : '');
    set('gate', G.W.active() ? ic('i_atk') : G.W.finalReady() ? ic('i_dragon') + '!' : '');
    set('warehouse', D.MAT.some((r) => G.S.seen[r] && G.E.full(r)) ? ic('i_bag') + '!' : '');
  }

  // Клик по зданию: добыча или помощь стройке, заодно открывается окно здания
  UI.slotClick = function (k, e, el) {
    if (G.W.active()) return;
    const L = G.E.lvl(k), d = D.B[k];
    let text = '', icon = null;
    if (G.E.consOf(k)) {
      if (G.E.boost(k)) { text = '−' + U.fmt1(G.E.boostSec()) + t('sec'); icon = 'i_hammer'; G.SFX.play('click'); }
      else if (L > 0) { text = t('busyShort'); icon = 'i_hammer'; }
    } else if (L > 0 && d.click) {
      const n = G.E.gather(k);
      if (n > 0) { text = (G.E.lastCrit ? t('critClick') + ' ' : '') + '+' + U.fmt1(n); icon = 'r_' + d.click; G.SFX.play(G.E.lastCrit ? 'coin' : 'gather'); }
      else { text = t('full'); icon = 'i_bag'; }
    } else if (k === 'forge' && G.F.boost()) { text = t('hammerHit'); icon = 'i_anvil'; G.SFX.play('hit'); }
    else if (k === 'academy' && G.R.boost()) { text = '−' + U.fmt1(G.R.boostSec()) + t('sec'); icon = 'i_book'; G.SFX.play('click'); }
    if (text) { fxFloat(e, text, icon); bump(el); }
    if (e.type === 'pointerdown') UI.openPop(k);
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
    const why = G.W.whyNot();
    if (why === 'noWalls') {
      el.innerHTML = `<div class="ww muted" title="${esc(t('waveNoWalls'))}">${ic('i_lock')} <span>${t('waveNoWallsShort')}</span> <button class="btn small" data-action="goto" data-arg="gate">${t('show')}</button></div>`;
      return;
    }
    const s = G.S.gate, n = s.sel, pv = G.W.preview(n);
    const defs = G.T.gateCount();
    const mons = Object.entries(pv.counts).map(([k, c]) => `<span class="wm" title="${esc(t('mn_' + k))}">${ic(monSpr(k), 'ic-mon')}<b>${c}</b></span>`).join('');
    const note = why === 'noDefenders' ? t('waveNoDefenders') : why === 'gateBusy' ? t('waveGateBusy') : '';
    el.innerHTML = `<div class="ww">
      <div class="wsec">
        <button class="wbtn" data-action="wave" data-arg="-1" ${n <= 1 ? 'disabled' : ''}>◀</button>
        <span class="wt">${t('wave')} <b>${n}</b>${n % 5 === 0 ? ` <i class="boss">${t('boss')}</i>` : ''}</span>
        <button class="wbtn" data-action="wave" data-arg="1" ${n > s.best ? 'disabled' : ''}>▶</button>
      </div>
      <div class="wsec wmons" title="${esc(t('waveEnemies'))}">${mons}</div>
      <button class="wsec wdef ${why === 'noDefenders' ? 'warnb' : ''}" data-action="goto" data-arg="gate" title="${esc(t('defense'))}">${ic('i_helmet')}<span class="wl"> ${t('guardsShort')}:</span> <b>${G.S.guards}</b> · ${ic('i_tower')}<span class="wl"> ${t('onWallShort')}:</span> <b>${defs}/${G.T.gateMax()}</b></button>
      <div class="wsec wgo">
        <button class="btn primary small" data-action="fight" ${why ? 'disabled' : ''} title="${esc(note)}">${why ? `${ic(why === 'gateBusy' ? 'i_hammer' : 'i_lock')} ${t(why === 'gateBusy' ? 'waveGateBusyShort' : 'waveNoDefShort')}` : `${ic('i_atk')} ${t('toBattle')}`}</button>
        ${G.W.finalReady() && !why ? `<button class="btn danger small" data-action="fightFinal">${ic('i_dragon')} ${t('finalBattle')}</button>` : ''}</div>
    </div>`;
  }

  function renderSpells() {
    const k = G.S.king;
    const list = D.SPELLS.filter((sp) => k.lvl >= sp.lvl);
    $('#spellbar').innerHTML = list.map((sp) => `<button class="spell" data-action="cast" data-arg="${sp.id}" data-spell="${sp.id}" title="${esc(t('sp_' + sp.id) + ' — ' + t('spd_' + sp.id, { d: G.K.meteorDmg() }))}">${ic(sp.icon, 'ic2')}<span class="cd" data-b="cd:${sp.id}"></span></button>`).join('');
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
    tab(a) { UI.tab = a; UI.pick = null; UI.slotsDirty = true; UI.dirty(); if (UI.win && UI.win !== 'decision') UI.closeModal(); },
    sel(k) { UI.openPop(k); },
    goto(k) { UI.openPop(k); },
    gather(k, el, e) { UI.slotClick(k, e, $(`.slot[data-k="${k}"]`)); },
    up(k) { G.E.startUpgrade(k); },
    cancelUp(k) { G.E.cancelUpgrade(k); },
    decreeAdd(k) { G.E.decreeAdd(k); UI.slotsDirty = true; },
    decreeDel(a) { const [q, i] = a.split('|'); G.S.decree[q].splice(+i, 1); UI.slotsDirty = true; UI.dirty(); },
    decreeUp(a) {
      const [q, i] = a.split('|');
      const arr = G.S.decree[q], j = +i;
      if (j > 0) { [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]]; UI.slotsDirty = true; UI.dirty(); }
    },
    decreeDown(a) {
      const [q, i] = a.split('|');
      const arr = G.S.decree[q], j = +i;
      if (j < arr.length - 1) { [arr[j + 1], arr[j]] = [arr[j], arr[j + 1]]; UI.slotsDirty = true; UI.dirty(); }
    },
    worker(k) { G.E.hireWorker(k); },
    tools() { G.E.upgradeTools(); },
    smith() { G.F.hireSmith(); },
    sell(a) { const [r, n] = a.split('|'); G.E.sell(r, n === 'half' ? (G.S.res[r] || 0) / 2 : +n); UI.dirty(); },
    buy(a) { const [r, n] = a.split('|'); G.E.buy(r, +n); UI.dirty(); },
    craftType(ty) { UI.craft.type = ty; UI.dirty(); },
    craftTier(ti) { UI.craft.ti = +ti; UI.dirty(); },
    craft() { G.F.craft(UI.craft.type, UI.craft.ti); },
    craftCancel(i) { G.F.cancel(+i); },
    hire(i) { G.T.hire(+i); },
    reroll() { G.T.refresh(false); },
    guard() { G.T.hireGuard(); },
    gate(id) { G.T.setGate(id); },
    char(id) { UI.selAdv = id; UI.pick = null; UI.dirty(); },
    learn(a) { const [id, sid] = a.split('|'); G.T.learn(id, sid); },
    dismiss(id) {
      const a = G.T.get(id);
      if (a) UI.confirm(t('confirmDismiss', { name: esc(nm(a.name)) }), () => { G.T.dismiss(id); UI.selAdv = null; });
    },
    pick(a) { UI.pick = UI.pick === a ? null : a; UI.dirty(); },
    pickClose() { UI.pick = null; UI.dirty(); },
    item(id) { UI.selItem = UI.selItem === id ? null : id; UI.dirty(); $('#panel').scrollTop = 0; },
    itemClose() { UI.selItem = null; UI.dirty(); },
    eq(a) { const [id, owner] = a.split('|'); G.F.equip(id, owner); UI.pick = null; },
    uneq(id) { G.F.unequip(id); UI.pick = null; },
    sellItem(id) { G.F.sell(id); UI.selItem = null; },
    sellJunk() { G.F.sellJunk(); },
    enchant(id) { G.F.enchant(id); },
    armF(f) { UI.armF = f; UI.dirty(); },
    wave(d) { const s = G.S.gate; s.sel = U.clamp(s.sel + +d, 1, s.best + 1); UI.dirty(); },
    fight() { G.W.start(false); UI.dirty(); },
    fightFinal() { G.W.start(true); UI.dirty(); },
    bclose() { G.W.close(); },
    bnext() { G.W.next(); },
    cast(id) { G.K.cast(id); },
    talent(id) { G.K.learn(id); },
    advisor(id) { G.K.hireAdv(id); },
    perk(id) { G.K.buyPerk(id); },
    abdicate() { UI.confirm(t('confirmAbdicate', { n: G.K.legacyGain() }), () => G.K.abdicate()); },
    research(id) { G.R.start(id); },
    resQueue(id) { G.R.enqueue(id); },
    resCancel() { G.R.cancel(); },
    loc(id) { if (!G.S.exp) { G.S.dng.loc = id; G.S.dng.maxFloor = Math.min(G.S.dng.maxFloor, G.X.floors(id)); UI.dirty(); } },
    pickParty(id) {
      if (UI.party.has(id)) UI.party.delete(id);
      else if (UI.party.size < G.X.maxParty) UI.party.add(id);
      UI.dirty();
    },
    maxf(d) { const Dn = G.S.dng; Dn.maxFloor = U.clamp(Math.max(Dn.maxFloor, G.X.startFloor(Dn.loc)) + +d, G.X.startFloor(Dn.loc), Math.min(999, G.X.floors(Dn.loc))); UI.dirty(); },
    startf(d) {
      const Dn = G.S.dng, o = G.X.startOptions(Dn.loc);
      Dn.start = o[U.clamp(o.indexOf(G.X.startFloor(Dn.loc)) + +d, 0, o.length - 1)];
      Dn.maxFloor = Math.max(Dn.maxFloor, Dn.start);
      UI.dirty();
    },
    condHp(d) { G.S.dng.hp = U.clamp(Math.round((G.S.dng.hp + +d) * 10) / 10, 0, 0.9); UI.dirty(); },
    condDown() { G.S.dng.down = !G.S.dng.down; UI.dirty(); },
    condBoss() { G.S.dng.boss = !G.S.dng.boss; UI.dirty(); },
    condAvoid(v) { G.S.dng.avoid = +v; UI.dirty(); },
    send() { G.X.start([...UI.party], G.S.dng.loc, G.S.dng.maxFloor, G.X.startFloor(G.S.dng.loc)); UI.party.clear(); },
    recall() { G.X.recall(); },
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
    const key = UI.tab;
    const st = UI.lastTab === key ? p.scrollTop : 0;
    p.innerHTML = (PANEL[UI.tab] || PANEL.decree)();
    p.scrollTop = st;
    UI.lastTab = key;
    renderTabs();
    renderPop();
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
    const dq = S.decree.build.length + S.decree.research.length;
    const tabs = [
      ['decree', 'tabDecree', 'i_scroll', (S.cons.length ? ic('i_hammer') + S.cons.length : '') + (S.cons.length && dq ? ' · ' : '') + (dq ? String(dq) : '')],
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

  // ---------- окно здания ----------
  function upgradeBox(k) {
    const c = G.E.consOf(k), L = G.E.lvl(k);
    if (c) {
      const boost = G.E.boostSec() > 0 ? t('consHintBoost', { n: U.fmt1(G.E.boostSec()) }) : t('consHintNoBoost');
      return box(ic('i_hammer') + ' ' + t(L ? 'consUp' : 'consBuild', { l: L + 1 }),
        `${bar('cons:' + k)}<div class="row"><span class="muted small">${ic('i_clock')} <span data-b="consT:${k}"></span></span><span class="grow"></span><button class="btn small" data-action="cancelUp" data-arg="${k}">${ic('i_x')} ${t('cancel')}</button></div>${L ? `<div class="warn small">${ic('i_lock')} ${t('busyNote')}</div>` : ''}<div class="hint">${boost}</div>`, 'cons');
    }
    const why = G.E.whyNot(k);
    if (why === 'max') return box('', `${ic('i_star')} ${t('maxLevel')}`, 'muted');
    const cost = G.E.upCost(k);
    const queued = G.S.decree.build.filter((x) => x === k).length;
    const look = [3, 5, 7].includes(L + 1) ? ` <span class="newlook">${ic('i_star')} ${t('newLook')}</span>` : '';
    let h = `<div class="hint top">${t('bh_' + k)}${look}</div><div class="row">${costHtml(cost)}<span class="muted small">${ic('i_clock')} ${U.fmtTime(G.E.upTime(k))}</span></div>`;
    if (why === 'castle') h += `<div class="warn small">${ic('i_lock')} ${t('needCastle', { l: L })}</div>`;
    else if (why === 'storage') h += `<div class="warn small">${ic('i_bag')} ${t('needStorage')}</div>`;
    else if (why === 'builders') h += `<div class="warn small">${ic('i_hammer')} ${t('needBuilders')}</div>`;
    h += `<div class="row">${btn(ic('i_hammer') + ' ' + (L ? t('upgrade') : t('build')), 'up', k, { cost, chips: false, cls: 'primary', lock: !!why })}
      <button class="btn small" data-action="decreeAdd" data-arg="${k}" title="${esc(t('toDecreeHint'))}">${ic('i_scroll')} ${t('toDecree')}${queued ? ` (${queued})` : ''}</button></div>`;
    return box(ic('i_up') + ' ' + (L ? t('upgradeTo', { l: L + 1 }) : t('build')), h);
  }

  function prodPanel(k) {
    const b = G.S.b[k], r = D.B[k].prod, mx = G.E.maxWorkers(k), L = G.E.lvl(k);
    const next = L < D.MAXLVL ? `<div class="muted small">${t('workersNext', { n: D.WORKERS[L + 1] })}</div>` : '';
    return box(ic('i_people') + ' ' + t('workers') + ` <span class="muted">${b.w}/${mx}</span>`, `
      ${kv('r_' + r, t('production'), `<b>${U.fmt1(b.w * G.E.workerRate(k))}</b>/${t('sec')} <span class="muted small">(${U.fmt1(G.E.workerRate(k))} ${t('perWorker')})</span>`)}
      ${kv('i_pick', t('clickGives'), `<b>+${U.fmt1(G.E.clickAmount(k))}</b> ${ic('r_' + r)}`)}
      ${G.E.full(r) ? `<div class="warn small">${ic('i_bag')} ${t('storageFull')}</div>` : ''}
      ${b.w < mx ? btn(ic('i_people') + ' ' + t('hireWorker'), 'worker', k, { cost: G.E.workerCost(k) }) : `<div class="muted small">${t('workersFull')}</div>`}${next}
      <div class="hint">${t('clickHint')}</div>`);
  }

  function defenders() {
    const battle = G.W.active();
    const defs = G.S.advs.filter((a) => a.st === 'gate');
    const avail = G.S.advs.filter((a) => a.st === 'idle');
    let h = `<div class="tiles">${defs.map((a) => advTile(a, battle ? 'noop' : 'gate', a.id, true)).join('')}`;
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
          ${kv('i_bag', t('goldCap'), `<b>${U.fmt(G.E.cap('gold'))}</b>`)}
          <div class="hint">${t('taxHint')}</div>`) +
        box(ic('i_crown') + ' ' + t('king'), `
          ${kv('i_pick', t('gatherPower'), `<b>${U.fmt1(G.E.power())}</b>`)}
          ${G.S.king.tools < G.E.maxTools() ? btn(ic('i_pick') + ' ' + t('upTools', { l: G.S.king.tools + 1 }), 'tools', '', { cost: G.E.toolsCost() }) : `<div class="muted small">${t('toolsMax')}</div>`}
          ${kv('i_atk', t('kingDmg'), `<b>${G.W.kingDmg()}</b>`)}
          <div class="eqrow">${G.PANE.eqSlots('king', ['weapon'])}</div>${G.PANE.pickerFor('king', ['weapon'])}
          <button class="btn small" data-action="tab" data-arg="king">${ic('i_crown')} ${t('openKing')}</button>`);
    },
    lumber: () => prodPanel('lumber'),
    quarry: () => prodPanel('quarry'),
    mine: () => prodPanel('mine'),
    warehouse() {
      const L = G.E.lvl('warehouse');
      const rows = ['gold', ...D.MAT].filter((r) => G.S.seen[r]).map((r) => `<div class="srow">${ic('r_' + r)}<span class="grow">${t('res_' + r)}</span><span class="small" data-b="store:${r}"></span>${bar('store:' + r, 'store')}</div>`).join('');
      const next = L < D.MAXLVL ? t('nextCap', { n: U.fmt(Math.floor(D.CAPS[L + 1] * (1 + G.bonus('store')))), g: U.fmt(Math.floor(D.goldCap(L + 1) * (1 + G.bonus('store')))) }) : '';
      return box(ic('i_bag') + ' ' + t('capacity'), rows + (next ? `<div class="hint">${next}</div>` : ''));
    },
    market() {
      const rows = D.MAT.filter((r) => G.S.seen[r]).map((r) => {
        const bt = G.E.batch(r);
        const buy = G.E.canBuy(r);
        return `<div class="trade">${ic('r_' + r, 'ic2')}<div class="grow"><div class="nm">${t('res_' + r)}</div>
          <div class="small"><span class="good">${t('rateSell', { n: bt, g: U.fmt1(G.E.sellPrice(r) * bt) })}</span> · ${buy ? `<span class="warn">${t('rateBuy', { n: bt, g: U.fmt1(G.E.buyPrice(r) * bt) })}</span>` : `<span class="muted">${t('buyLocked', { l: G.E.BUY_LVL[r] })}</span>`}</div></div>
          <div class="tbtns"><button class="btn small" data-action="sell" data-arg="${r}|${bt}" data-sellr="${r}" data-n="${bt}">−${bt}</button><button class="btn small" data-action="sell" data-arg="${r}|half" data-sellr="${r}" data-n="2">−½</button>${buy ? `<button class="btn small" data-action="buy" data-arg="${r}|${bt}" data-buyr="${r}" data-n="${bt}">+${bt}</button>` : ''}</div></div>`;
      }).join('');
      const agent = G.bonus('agent') > 0 ? `<div class="small good">${ic('i_scale')} ${t('agentOn', { g: U.fmt(G.S.stats.autoSold || 0) })}</div>` : `<div class="small muted">${t('agentOff')}</div>`;
      return box(ic('i_scale') + ' ' + t('rates'), rows + agent + `<div class="hint">${t('marketHint')}</div>`);
    },
    forge() {
      return G.PANE.craft() +
        box(ic('i_people') + ' ' + t('smiths') + ` <span class="muted">${G.S.b.forge.w}/${G.F.maxSmiths()}</span>`, `${kv('i_clock', t('craftSpeed'), `<b>×${G.F.speed().toFixed(2)}</b>`)}${G.S.b.forge.w < G.F.maxSmiths() ? btn(ic('i_people') + ' ' + t('hireSmith'), 'smith', '', { cost: G.F.smithCost() }) : ''}<div class="hint">${t('smithHint')} ${t('forgeClickHint')}</div>`);
    },
    tavern: () => G.PANE.hire(),
    barracks() {
      const mx = G.T.maxGuards();
      return box(ic('i_helmet') + ' ' + t('guards') + ` <span class="muted">${G.S.guards}/${mx}</span>`, `
        ${kv('i_atk', t('guardDmg'), `<b>${U.fmt1(G.T.guardDmg())}</b>`)}
        ${kv('i_tower', t('dps'), `<b>${U.fmt1((G.S.guards * G.T.guardDmg()) / 1.2)}</b>`)}
        ${G.S.guards < mx ? btn(ic('i_helmet') + ' ' + t('hireGuard'), 'guard', '', { cost: G.T.guardCost() }) : `<div class="muted small">${t('guardsFull')}</div>`}
        <div class="hint">${t('guardHint')}</div>`);
    },
    academy: () => G.PANE.research(),
    gate() {
      const why = G.W.whyNot();
      let h = box(ic('i_def') + ' ' + t('defense'), `
        ${kv('i_def', t('wallHp'), `<b>${U.fmt(G.W.wallHp())}</b>`)}
        ${kv('i_helmet', t('guards'), `<b>${G.S.guards}</b> <span class="muted small">(${t('dps')} ${U.fmt1((G.S.guards * G.T.guardDmg()) / 1.2)})</span>`)}
        ${kv('i_crown', t('kingDmg'), `<b>${G.W.kingDmg()}</b> ${t('perClick')}`)}`);
      h += box(ic('i_tower') + ' ' + t('onWall') + ` <span class="muted">${G.T.gateCount()}/${G.T.gateMax()}</span>`, `<div class="hint top">${t('wallHint')}</div>` + defenders());
      h += box(ic('i_atk') + ' ' + t('waves'), `<div class="muted small">${t('bestWave')}: <b>${G.S.gate.best}</b> · ${t('wave')} ${G.S.gate.sel}</div>
        ${why ? `<div class="warn small">${t(why === 'noDefenders' ? 'waveNoDefenders' : why === 'gateBusy' ? 'waveGateBusy' : 'waveNoWalls')}</div>` : ''}
        <button class="btn primary big" data-action="fight" ${why ? 'disabled' : ''}>${ic('i_atk')} ${t('toBattle')}</button>
        <div class="hint">${t('waveWidgetHint')}</div><div class="hint">${t('defeatHint')}</div>`);
      return h;
    },
  };

  // Кнопка быстрого действия в окне: добыть, помочь стройке или ударить молотом
  function popAction(k) {
    const d = D.B[k], L = G.E.lvl(k);
    if (G.E.consOf(k)) return G.E.boostSec() > 0 ? `<button class="btn primary big popact" data-action="gather" data-arg="${k}">${ic('i_hammer')} ${t('helpBuild', { n: U.fmt1(G.E.boostSec()) })}</button>` : '';
    if (L > 0 && d.click) return `<button class="btn primary big popact" data-action="gather" data-arg="${k}">${ic('i_pick')} ${t('gatherBtn')} <b>+${U.fmt1(G.E.clickAmount(k))}</b> ${ic('r_' + d.click)}</button>`;
    if (k === 'forge' && L > 0 && G.S.forge.q.length) return `<button class="btn big popact" data-action="gather" data-arg="${k}">${ic('i_anvil')} ${t('forgeHitBtn')}</button>`;
    if (k === 'academy' && L > 0 && G.S.research.cur) return `<button class="btn primary big popact" data-action="gather" data-arg="${k}">${ic('i_book')} ${t('resBoostBtn', { n: U.fmt1(G.R.boostSec()) })}</button>`;
    return '';
  }
  function popPanel(k) {
    const L = G.E.lvl(k);
    let h = `<div class="bhead">${ic(bSprite(k), 'bimg')}<div class="grow"><h2>${t('bn_' + k)}</h2><div class="lvl">${L ? t('levelOf', { l: L, m: D.MAXLVL }) : t('notBuilt')}</div><p class="desc">${t('bd_' + k)}</p></div></div>`;
    h += popAction(k);
    // здание на перестройке недоступно; замок и склад показывают справку
    if (L > 0 && BP[k] && (!G.E.busy(k) || k === 'castle' || k === 'warehouse')) h += BP[k]();
    h += upgradeBox(k);
    return h;
  }
  // Окно здания: всегда на виду, при выборе другого здания плавно сменяется
  function renderPop() {
    const el = $('#bpop');
    if (!D.B[UI.pop] || UI.pop === 'dungeon') UI.pop = 'castle';
    const k = UI.pop, same = el._k === k, s = el.scrollTop;
    el.innerHTML = popPanel(k);
    el.scrollTop = same ? s : 0;
    if (!same && el._k) {
      el.classList.remove('pop-in');
      void el.offsetWidth;
      el.classList.add('pop-in');
    }
    el._k = k;
  }

  // ---------- вкладка «Гильдия»: авантюристы, снаряжение, навыки ----------
  function guildPanel() {
    if (G.E.lvl('tavern') < 1) return box('', t('needTavern'), 'muted');
    const A = G.S.advs;
    if (!G.T.get(UI.selAdv)) UI.selAdv = A[0] ? A[0].id : null;
    let h = box(ic('i_people') + ' ' + t('guild') + ` <span class="muted">${A.length}/${G.T.maxAdvs()}</span>`,
      `<div class="muted small">${A.length ? t('guildTip') : t('guildEmpty')}</div><div class="row"><button class="btn small" data-action="goto" data-arg="tavern">${ic('i_people')} ${t('toTavern')}</button></div>`);
    h += `<div class="tiles">${A.map((a) => advTile(a, 'char', a.id, a.id === UI.selAdv)).join('')}</div>`;
    if (UI.selAdv) h += G.PANE.char(UI.selAdv);
    return h;
  }

  // ---------- вкладка «Арсенал» ----------
  function armoryPanel() {
    const f = UI.armF;
    if (UI.selItem && !G.F.get(UI.selItem)) UI.selItem = null;
    const items = G.S.items.filter((i) => f === 'all' || i.type === f).sort((a, b) => (b.eq ? 1 : 0) - (a.eq ? 1 : 0) || b.rar - a.rar || b.ti - a.ti || G.F.score(b) - G.F.score(a));
    const junk = G.F.junk();
    // Кто что носит: король и каждый авантюрист, ячейки нажимаются для замены
    const wearers = [['king', 'c_king', t('king'), `${t('kingDmg')}: ${G.W.kingDmg()}`, ['weapon'], '#f7c948']]
      .concat(G.S.advs.map((a) => ['' + a.id, 'c_' + a.cls, nm(a.name), `${t('cl_' + a.cls)} · ${t('lv')} ${a.lvl} · ${t('st_' + a.st)}`, ['weapon', 'armor'], D.ARAR[a.rar].color]));
    let h = box(ic('i_people') + ' ' + t('wearersTitle'), `<div class="hint top">${t('wearersHint')}</div>` + wearers.map(([o, icon, name, sub, slots, col]) =>
      `<div class="wearer"><div class="wwho">${ic(icon, 'ic2')}<div><b style="color:${col}">${esc(name)}</b><div class="small muted">${sub}</div></div></div><div class="eqrow">${G.PANE.eqSlots(o, slots)}</div></div>${G.PANE.pickerFor(o, slots)}`).join(''));
    if (UI.selItem) h += G.PANE.item(UI.selItem);
    const cats = ['all', ...Object.keys(D.ITYPES)];
    h += `<div class="filters">${cats.map((c) => `<button class="fbtn ${f === c ? 'on' : ''}" data-action="armF" data-arg="${c}" title="${esc(c === 'all' ? t('all') : t('it_' + c))}">${c === 'all' ? ic('i_chest', 'ic2') : ic('it_' + c + ':0', 'ic2')}</button>`).join('')}${junk.length ? `<button class="btn small" data-action="sellJunk">${ic('r_gold')} ${t('sellJunk', { n: junk.length })}</button>` : ''}</div>`;
    h += `<div class="legend small muted"><span class="lg-eq"></span> ${t('equippedLegend')} · ${t('itemTip')}</div>`;
    if (!items.length) h += box('', G.E.lvl('forge') ? t('noItemsForge') : t('needForgeBuild'), 'muted');
    h += `<div class="igrid">${items.map((it) => itemTile(it)).join('')}</div>`;
    return h;
  }

  // ---------- вкладка «Походы» ----------
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
      h += box(ic('i_scroll') + ' ' + t('lastReport'), `<div class="${R.ok ? 'good' : 'bad'}">${R.ok ? t('lastOk', { f: R.floor, l: t('loc_' + R.loc) }) : t('lastFail', { f: R.floor, l: t('loc_' + R.loc) })}</div><div>${lootHtml(R.loot) || '—'}${R.items ? ' · ' + t('itemsN', { n: R.items }) : ''}</div><div class="xlog">${R.log.map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div>`);
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
    const sf = G.X.startFloor(loc), so = G.X.startOptions(loc), si = so.indexOf(sf);
    const mf = Math.max(Dn.maxFloor, sf), push = Dn.hp <= 0, off = push ? 'disabled' : '';
    let h = box(ic('i_people') + ' ' + t('party') + ` <span class="muted">${UI.party.size}/${G.X.maxParty}</span>`,
      idle.length ? `<div class="tiles">${idle.map((a) => advTile(a, 'pickParty', a.id, UI.party.has(a.id))).join('')}</div>` : `<div class="muted small">${G.S.advs.length ? t('noIdle') : t('guildEmpty')}</div>`);
    h += box(ic('i_scroll') + ' ' + t('retreatTitle'), `<div class="hint top">${t('retreatHint')}</div>
      <div class="cond"><span class="grow">${ic('i_stairs')} ${t('startFloor')}<span class="small muted cnote">${so.length > 1 ? t('startHint') : t('startLocked')}</span></span><button class="btn small" data-action="startf" data-arg="-1" ${si > 0 ? '' : 'disabled'}>◀</button><b>${sf}</b><button class="btn small" data-action="startf" data-arg="1" ${si < so.length - 1 ? '' : 'disabled'}>▶</button></div>
      <div class="cond"><span class="grow">${ic('i_flag')} ${t('maxFloor')}</span><button class="btn small" data-action="maxf" data-arg="-5">−5</button><button class="btn small" data-action="maxf" data-arg="-1">◀</button><b>${mf}</b><button class="btn small" data-action="maxf" data-arg="1">▶</button><button class="btn small" data-action="maxf" data-arg="5">+5</button></div>
      <div class="cond"><span class="grow">${ic('i_hp')} ${t('condHp')}</span><button class="btn small" data-action="condHp" data-arg="-0.1" ${push ? 'disabled' : ''}>◀</button><b class="${push ? 'bad' : ''}">${push ? '0% · ' + t('condPush') : Math.round(Dn.hp * 100) + '%'}</b><button class="btn small" data-action="condHp" data-arg="0.1">▶</button></div>
      ${push ? `<div class="warn small pushwarn">${ic('i_skull')} ${t('pushWarn', { p: Math.round(G.T.deathChance(0.15) * 100) })}</div>` : ''}
      <div class="cond ${push ? 'off' : ''}"><span class="grow">${ic('i_skull')} ${t('condDown')}</span><button class="btn small ${Dn.down && !push ? 'primary' : ''}" data-action="condDown" ${off}>${Dn.down && !push ? t('yes') : t('no')}</button></div>
      <div class="cond ${push ? 'off' : ''}"><span class="grow">${ic('i_crown')} ${t('condBoss')}</span><button class="btn small ${Dn.boss && !push ? 'primary' : ''}" data-action="condBoss" ${off}>${Dn.boss && !push ? t('yes') : t('no')}</button></div>
      <div class="cond ${push ? 'off' : ''}"><span class="grow">${ic('i_boot')} ${t('condAvoid')}</span><span class="seg">${[0, 0.3, 0.5, 0.7].map((v) => `<button class="btn small ${(push ? !v : Dn.avoid === v) ? 'primary' : ''}" data-action="condAvoid" data-arg="${v}" ${off}>${v ? '< ' + v * 100 + '%' : t('never')}</button>`).join('')}</span></div>`);
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
    if (e.phase === 'fight' || e.flog.length) body += `<div class="flog">${e.flog.map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div>`;
    const c = e.cond || X_COND();
    body += `<div class="kv small">${e.start > 1 ? t('startFloor') + ': <b>' + e.start + '</b> · ' : ''}${t('maxFloor')}: <b>${e.maxFloor}</b> · ${c.push ? `<b class="bad">${t('condPushShort')}</b>` : `${t('condHp')}: <b>${Math.round(c.hp * 100)}%</b>`}${c.down ? ' · ' + t('condDownShort') : ''}${c.boss ? ' · ' + t('condBossShort') : ''}${c.avoid ? ' · ' + t('condAvoidShort', { p: c.avoid * 100 }) : ''}</div>`;
    body += `<div class="kv">${ic('i_chest')} ${t('backpack')}: ${lootHtml(e.loot) || '—'}${e.items && e.items.length ? ` · ${e.items.map((it) => ic('it_' + it.type + ':' + it.ti)).join('')} ${t('itemsN', { n: e.items.length })}` : ''}</div>`;
    if (e.phase !== 'ret') body += `<button class="btn small" data-action="recall" ${e.recall ? 'disabled' : ''}>${e.recall ? t('recalling') : t('recall')}</button>`;
    h += box('', body);
    h += box(ic('i_scroll') + ' ' + t('chronicle'), `<div class="xlog">${e.log.map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div>`);
    return h;
  }

  // ---------- вкладка «Указы» ----------
  function decreePanel() {
    const S = G.S, dq = S.decree;
    // идущие стройки
    let h = box(ic('i_hammer') + ' ' + t('buildersNow') + ` <span class="muted">${S.cons.length}/${G.E.builders()}</span>`,
      (S.cons.length ? S.cons.map((c) => `<div class="job">${ic(bSprite(c.k), 'ic2')}<div class="grow"><div>${t('bn_' + c.k)} → ${G.E.lvl(c.k) + 1}</div>${bar('cons:' + c.k)}<div class="muted small" data-b="consT:${c.k}"></div></div><button class="btn small" data-action="cancelUp" data-arg="${c.k}" title="${esc(t('cancelRefund'))}">${ic('i_x')}</button></div>`).join('') : `<div class="muted small">${t('buildersIdle')}</div>`) +
      `<div class="hint">${t('decreeHint')}</div>`);
    // очередь строительства
    const qList = (q, nameKey, icon, extra) => (dq[q].length ? dq[q].map((x, i) => `<div class="dq">${ic(icon(x), 'ic2')}<div class="grow">${i + 1}. <b>${t(nameKey + x)}</b>${extra ? extra(x, i) : ''}</div><button class="btn small" data-action="decreeUp" data-arg="${q}|${i}" ${i ? '' : 'disabled'}>▲</button><button class="btn small" data-action="decreeDown" data-arg="${q}|${i}" ${i < dq[q].length - 1 ? '' : 'disabled'}>▼</button><button class="btn small" data-action="decreeDel" data-arg="${q}|${i}">${ic('i_x')}</button></div>`).join('') : `<div class="muted small">${t('decreeEmpty')}</div>`);
    // для каждой записи: уровень, цена и время этого перехода
    const fromLvl = (k, i) => {
      let L = G.E.lvl(k) + (G.E.consOf(k) ? 1 : 0);
      for (let j = 0; j < i; j++) if (dq.build[j] === k) L++;
      return L;
    };
    const total = {};
    const buildInfo = (k, i) => {
      const L = fromLvl(k, i);
      if (L >= D.MAXLVL) return ` <span class="muted small">${t('maxLevel')}</span>`;
      const c = G.E.costAt(k, L);
      for (const r in c) total[r] = (total[r] || 0) + c[r];
      return ` <span class="muted small">→ ${L + 1}</span><div class="row">${costHtml(c)}<span class="muted small">${ic('i_clock')} ${U.fmtTime(G.E.timeAt(k, L))}</span></div>`;
    };
    const bq = qList('build', 'bn_', (x) => bSprite(x), buildInfo);
    h += box(ic('i_scroll') + ' ' + t('decreeBuild'), bq + (dq.build.length ? `<div class="dtotal">${t('decreeTotal')}: ${costHtml(total)}</div>` : ''));
    // добавить стройку
    h += box(ic('i_up') + ' ' + t('decreeAddBuild'), `<div class="dgrid">${D.ORDER.filter((k) => !D.B[k].noLevel).map((k) => {
      const L = G.E.lvl(k), why = G.E.whyNot(k);
      const max = L >= D.MAXLVL;
      return `<button class="dcard" data-action="decreeAdd" data-arg="${k}" ${max ? 'disabled' : ''}>${ic(bSprite(k), 'ic2')}<span class="grow"><b>${t('bn_' + k)}</b><span class="small muted">${L ? t('lv') + ' ' + L : t('notBuilt')}${why === 'castle' ? ' · ' + t('needCastleShort', { l: L }) : why === 'storage' ? ' · ' + t('needStorageShort') : ''}</span></span>${max ? '' : ic('i_scroll')}</button>`;
    }).join('')}</div>`);
    // исследования
    const open = D.RESEARCH.filter((r) => !G.R.done(r.id) && !dq.research.includes(r.id) && G.R.state(r.id) !== 'cur');
    const resInfo = (id) => { const r = G.R.get(id); return `<div class="row">${costHtml(r.cost)}<span class="muted small">${ic('i_clock')} ${U.fmtTime(G.R.time(r))}</span></div>`; };
    h += box(ic('i_book') + ' ' + t('decreeRes'), qList('research', 'rs_', (x) => G.R.get(x).icon, resInfo) +
      (G.E.lvl('academy') ? `<h4>${t('decreeAddRes')}</h4><div class="dgrid">${open.map((r) => `<button class="dcard" data-action="resQueue" data-arg="${r.id}">${ic(r.icon, 'ic2')}<span class="grow"><b>${t('rs_' + r.id)}</b><span class="small muted">${G.R.state(r.id) === 'locked' ? t('needAcad', { l: r.acad }) : t('rsd_' + r.id)}</span>${costHtml(r.cost)}</span>${ic('i_scroll')}</button>`).join('')}</div>` : `<div class="muted small">${t('needAcademy')}</div>`));
    return h;
  }

  // ---------- вкладка «Король» ----------
  function kingPanel() {
    const k = G.S.king, tp = G.K.tp();
    let h = `<div class="bhead">${ic('c_king', 'bimg')}<div><h2>${t('king')}</h2><div class="lvl">${t('lv')} <b>${k.lvl}</b> / ${D.KING_MAX}</div>${bar('kxp', 'xp')}<div class="muted small" data-b="kxpT"></div><div class="small">${t('talentPts')}: <b class="${tp ? 'good' : ''}">${tp}</b></div><div class="hint">${t('kingXpHint')}</div></div></div>`;
    h += box(ic('i_fire') + ' ' + t('spells'), D.SPELLS.map((sp) => {
      const open = k.lvl >= sp.lvl;
      return `<div class="spl ${open ? '' : 'locked'}">${ic(sp.icon, 'ic2')}<div class="grow"><b>${t('sp_' + sp.id)}</b> <span class="muted small">${sp.battle ? t('inBattle') : ''}</span><div class="small">${t('spd_' + sp.id, { d: G.K.meteorDmg() })}</div><div class="muted small">${t('cooldown')}: ${U.fmtTime(G.K.spellCd(sp))}</div></div>${open ? `<button class="btn small" data-action="cast" data-arg="${sp.id}" data-spell="${sp.id}">${t('cast')} <span data-b="cd:${sp.id}"></span></button>` : `<span class="muted small">${ic('i_lock')} ${t('lv')} ${sp.lvl}</span>`}</div>`;
    }).join(''));
    const br = ['hand', 'eco', 'build', 'war'];
    h += box(ic('i_star') + ' ' + t('talents') + ` <span class="muted">${tp}</span>`, `<div class="tal3">${br.map((b) => `<div class="tcol"><div class="tbr">${t('br_' + b)}</div>${D.TALENTS.filter((x) => x.br === b).map((x) => {
      const r = k.tal[x.id] || 0, mx = G.K.talMax(x);
      return `<div class="tal">${ic(x.icon, 'ic2')}<div class="grow"><b>${t('tl_' + x.id)}</b><div class="small muted">${t('tld_' + x.id)}</div>${pips(r, mx)}</div><button class="btn small" data-action="talent" data-arg="${x.id}" ${tp > 0 && r < mx ? '' : 'disabled'}>+</button></div>`;
    }).join('')}</div>`).join('')}</div>`);
    h += box(ic('i_people') + ' ' + t('council'), `<div class="advs">${D.ADVISORS.map((a) => {
      const l = G.K.advLvl(a.id), open = G.K.advOpen(a);
      return `<div class="advc ${open ? '' : 'locked'}">${ic('adv_' + a.id, 'ic3')}<div class="grow"><b>${t('ad_' + a.id)}</b> ${pips(l, D.ADV_MAX)}<div class="small muted">${t('add_' + a.id)}</div>
        ${!open ? `<div class="small">${ic('i_lock')} ${t('needCastleLvl', { l: a.castle })}</div>` : l >= D.ADV_MAX ? `<div class="small good">${t('maxLevel')}</div>` : btn(l ? t('promote') : t('hireAdv'), 'advisor', a.id, { cost: G.K.advCost(a.id), cls: 'small' })}</div></div>`;
    }).join('')}</div>`);
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

  const PANEL = { guild: guildPanel, armory: armoryPanel, exp: expBody, decree: decreePanel, king: kingPanel };

  // ---------- окна (только цели, решения, настройки, подтверждения) ----------
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
      $('#battle-head').innerHTML = `<b id="bh-wave"></b><span id="bh-left"></span><span class="gatelab">${ic('i_def')}</span><div class="bar gatebar"><i id="bh-gate"></i></div><span id="bh-gtxt"></span>
        <span class="grow"></span><button class="btn small" id="bh-city" data-action="bclose" disabled>${ic('i_tower')} ${t('toCity')}</button><button class="btn small primary" id="bh-next" data-action="bnext" disabled>${t('nextWave')} ▶</button>`;
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
    $('#battle-foot').innerHTML = `<div class="bres">${h}</div>`;
    $('#bh-city').disabled = false;
    $('#bh-next').disabled = !G.W.canNext();
    $('#bh-next').title = G.W.canNext() ? '' : t(r.win ? 'nextNeedDef' : 'nextAfterLoss');
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
    bar.innerHTML = shown.map((r) => `<div class="res" title="${esc(t('res_' + r))}">${ic('r_' + r)}<div class="rcol"><div><span class="rv" data-b="res:${r}"></span><span class="rc" data-b="cap:${r}"></span></div><div class="rline"><div class="rbar"><i data-w="store:${r}"></i></div><span class="rr" data-b="rate:${r}"></span></div></div></div>`).join('');
  }

  // ---------- живые значения ----------
  const BIND = {
    res: (r) => U.fmt(G.S.res[r]),
    cap: (r) => '/' + U.fmt(G.E.cap(r)),
    rate: (r) => { const v = UI._rates[r]; return v ? '+' + U.fmt1(v) : ''; },
    store: (r) => U.fmt(G.S.res[r]) + ' / ' + U.fmt(G.E.cap(r)),
    tax: () => U.fmt1(G.E.tax()),
    consT: (k) => { const c = G.E.consOf(k); return c ? U.fmtTime(c.t) : ''; },
    forgeT: () => { const j = G.S.forge.q[0]; return j ? U.fmtTime(j.t / G.F.speed()) + (G.E.busy('forge') ? ' · ' + t('paused') : '') : ''; },
    tavT: () => U.fmtTime(G.S.tavern.t),
    hp: (id) => { const a = G.T.get(id); return a ? Math.ceil(a.hp) + '/' + G.T.stats(a).hp : ''; },
    wt: (id) => { const a = G.T.get(id); return a && a.st === 'wounded' ? U.fmtTime(a.wt) : ''; },
    expT: () => (G.S.exp ? U.fmtTime(G.S.exp.t) : ''),
    ehp: () => { const e = G.S.exp; return e && e.enemy ? U.fmt(Math.max(0, e.phase === 'fight' ? e.ehp : e.enemy.hp)) + '/' + U.fmt(e.enemy.max) : ''; },
    decT: () => { const e = G.S.exp; return e && e.pend ? U.fmtTime((e.pend.dl - Date.now()) / 1000) : ''; },
    rschT: () => { const c = G.S.research.cur; return c ? U.fmtTime(c.t) + (G.E.busy('academy') ? ' · ' + t('paused') : '') : ''; },
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

  // Подсветка следующей цели: здание на карте, нужная вкладка, кнопка в меню построек и кнопка действия
  function applyGoal() {
    const g = D.GOALS[G.S.goal];
    const h = (g && g.h) || {};
    const want = new Set();
    const add = (sel) => { for (const el of $$(sel)) want.add(el); };
    const tabShown = h.tab && UI.tab === h.tab;
    if (h.b && UI.pop !== h.b && !tabShown) add(`.slot[data-k="${h.b}"]`);
    if (h.tab && !tabShown) add(`.tab[data-arg="${h.tab}"]`);
    // кнопки действия ищем там, где они сейчас видны: в окне здания или в панели вкладки
    const scope = h.tab ? '#panel' : '#bpop';
    for (const a of [].concat(h.act || [])) {
      const arg = h.arg && a !== 'send' && a !== 'pickParty' ? h.arg : a === 'up' || a === 'worker' || a === 'gather' ? h.b : null;
      add(arg ? `${scope} [data-action="${a}"][data-arg="${arg}"]` : `${scope} [data-action="${a}"], #wave-w [data-action="${a}"]`);
    }
    for (const el of $$('.goal-hl')) if (!want.has(el)) el.classList.toggle('goal-hl', false);
    for (const el of want) el.classList.toggle('goal-hl', true);
  }

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
    for (const b of $$('[data-sellr]')) b.disabled = (G.S.res[b.dataset.sellr] || 0) < +b.dataset.n || G.E.full('gold');
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
    applyGoal();
    renderTip();
  };
})();
