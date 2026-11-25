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
    return `<span class="costs">${Object.keys(c).filter((r) => c[r] > 0).map((r) => `<span class="chip${c[r] > G.E.cap(r) ? ' over' : ''}" data-r="${r}" data-n="${c[r]}" data-tip="r:${r}">${ic('r_' + r)}${U.fmt(c[r])}</span>`).join('')}</span>`;
  }
  function btn(label, action, arg, o) {
    o = o || {};
    const cost = o.cost ? ` data-cost='${JSON.stringify(o.cost)}'` : '';
    const chips = o.cost && o.chips !== false ? costHtml(o.cost) : '';
    return `<button class="btn ${o.cls || ''}" data-action="${action}" data-arg="${arg === undefined ? '' : arg}"${cost}${o.lock ? ' disabled data-lock="1"' : ''}${o.title ? ` title="${esc(o.title)}"` : ''}><span class="bl">${label}</span>${chips}</button>`;
  }
  function lootHtml(o) {
    if (!o) return '';
    return Object.keys(o).filter((r) => o[r] > 0).map((r) => `<span class="loot" data-tip="r:${r}">${ic('r_' + r)}${U.fmt(o[r])}</span>`).join(' ');
  }
  const bar = (key, cls) => `<div class="bar ${cls || ''}"><i data-w="${key}"></i></div>`;
  // Пояснения не стоят текстом под заголовком: они всплывают при наведении на заголовок (пунктир и значок «?»).
  // hint(id, html) регистрирует текст подсказки, tipTitle — заголовок с подсказкой; tip у box — ключ i18n или [id, html]
  UI.hints = {};
  const hint = (id, html) => { UI.hints[id] = html; return ` data-tip="h:${id}"`; };
  const tipTitle = (title, id, html) => `<span class="hastip"${hint(id, html == null ? t(id) : html)}>${title}<i class="qh">?</i></span>`;
  const box = (title, body, cls, tip) => `<div class="box ${cls || ''}">${title ? `<h3>${tip ? (typeof tip === 'string' ? tipTitle(title, tip) : tipTitle(title, tip[0], tip[1])) : title}</h3>` : ''}${body}</div>`;
  const kv = (icon, label, val) => `<div class="kv">${icon ? ic(icon) : ''} <span>${label}:</span> ${val}</div>`;
  const pips = (n, max) => `<span class="pips ${max > 5 ? 'many' : ''}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
  function stIcon(a) {
    if (a.st === 'gate') return ic('i_tower') + `<span>${t('st_gate')}</span>`;
    if (a.st === 'dungeon') return ic('i_flag') + `<span>${t('st_dungeon')}</span>`;
    if (a.st === 'arena') return ic('i_atk') + `<span>${t('st_arena')}</span>`;
    if (a.st === 'journey') return ic('i_ship') + `<span>${t('st_journey')}</span>`;
    if (a.st === 'wounded') return ic('i_heal') + `<span data-b="wt:${a.id}"></span>`;
    return ic('i_check') + `<span>${t('st_idle')}</span>`;
  }
  function advTile(a, action, arg, on) {
    const R = D.ARAR[a.rar];
    return `<button class="atile ${on ? 'on' : ''} st-${a.st}" data-action="${action}" data-arg="${arg}" style="--rc:${R.color}">
      <div class="por">${ic('c_' + a.cls, 'ic3')}<em>${a.lvl}</em>${G.T.sp(a) > 0 ? '<i class="sp">+</i>' : ''}${a.prest ? `<i class="prest" title="${esc(t('prestTitle', { n: a.prest, p: Math.round(D.PREST_BONUS * a.prest * 100) }))}">★${a.prest}</i>` : ''}</div>
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
  function itemTile(it, action, arg, extra) {
    const R = D.IRAR[it.rar];
    return `<button class="itile ${it.eq ? 'eq' : ''} ${UI.selItem === it.id && !action ? 'on' : ''}" data-action="${action || 'item'}" data-arg="${arg || it.id}" style="--rc:${R.color}" title="${esc(G.F.name(it))}">
      ${ic('it_' + it.type + ':' + it.ti, 'ic3')}${it.ench ? `<em class="ench">+${it.ench}</em>` : ''}${it.eq ? `<span class="eqb">${ownerIcon(it.eq)}</span>` : ''}
      <span class="ist">${itemMain(it)}</span>${extra || ''}${!action && !it.eq ? `<span class="isell" data-action="sellItem" data-arg="${it.id}" title="${esc(t('sell'))}">${t('sell')} ${ic('r_gold')}${U.fmt(G.F.sellValue(it))}</span>` : ''}</button>`;
  }
  function chancesRow(list, ch, open, lockKey) {
    return `<div class="chances">${list.map((r, i) => (open(i)
      ? `<span class="rchip" style="--rc:${r.color}">${t(lockKey + '_' + i)} <b>${(ch[i] * 100).toFixed(1)}%</b></span>`
      : `<span class="rchip locked">${ic('i_lock')} ${t(lockKey + '_' + i)} <i>${t('fromLvl', { l: (r.forge || r.tav) })}</i></span>`)).join('')}</div>`;
  }
  // Название исследования, при наведении на которое видно, что оно даёт
  const rsWord = (id) => `<span class="tipword" data-tip="s:${id}">${esc(t('rs_' + id))}</span>`;
  function fmtEntry(l) {
    const p = {};
    for (const k in l.p) {
      const v = l.p[k];
      if (k === 'loot') p[k] = lootHtml(v) || '—';
      else if (k === 'gi') p[k] = typeof v === 'string' ? t(v) : t('goal' + v);
      else if (k === 'c') p[k] = t('ch_' + v);
      else if (v && typeof v === 'object' && typeof v.k === 'string' && v.k.startsWith('rs_')) p[k] = rsWord(v.k.slice(3));
      else if (v && typeof v === 'object') p[k] = esc(nm(v));
      else p[k] = esc(String(v));
    }
    return t(l.k, p);
  }
  UI.h = { ic, bSprite, nm, monSpr, costHtml, btn, lootHtml, bar, box, kv, tipTitle, hint, pips, stIcon, advTile, itemTile, itemMain, ownerIcon, chancesRow, fmtEntry, esc, t };
  UI.dirty = () => { UI._d = true; };
  // Бои в походах обновляют только вкладку «Походы» (если она открыта) и значки — окно здания и другие вкладки не перерисовываются
  UI.expDirty = () => { UI._dx = true; };

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
    // всплывающая подсказка для всего, у чего есть data-tip: ресурсы, записи указов, карточки зданий
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) { if (UI.gtip) hideGtip(); return; }
      if (UI.gtip !== el.dataset.tip) { UI.gtip = el.dataset.tip; renderGtip(); }
      placeGtip(e);
    });
    document.addEventListener('mousemove', (e) => { if (UI.gtip) placeGtip(e); });
    // автоклик: здание под мышкой на карте или кнопка «Добыть» в его окне
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const sl = e.target.closest && e.target.closest('#slots .slot');
      const gb = !sl && e.target.closest && e.target.closest('#bpop [data-action="gather"]');
      UI.auto = sl ? { k: sl.dataset.k, btn: false } : gb ? { k: gb.dataset.arg, btn: true } : null;
      UI.autoPos = { clientX: e.clientX, clientY: e.clientY };
    });
    document.addEventListener('pointerleave', () => { UI.auto = null; });
    window.addEventListener('blur', () => { UI.auto = null; });
    setInterval(autoTick, 50);
    document.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') hideGtip(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && UI.win && UI.win !== 'decision') UI.closeModal();
      if (['1', '2', '3', '4'].includes(e.key) && G.W.battle() && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) G.W.setSpeed(G.W.SPEEDS[+e.key - 1]);
    });
    $('#brand-icon').src = G.SPR.url('i_crown');
    applyLand();
    applyStatic();
    UI.render();
  };

  // Земли эпохи: подпись у названия игры и оттенок карты
  function applyLand() {
    const ep = G.S.dyn.epoch;
    for (let i = 1; i < D.LANDS.length; i++) $('#stage').classList.toggle('land-' + i, ep > 0 && ep % D.LANDS.length === i);
    let el = $('#land');
    if (!el) { el = document.createElement('span'); el.id = 'land'; $('#brand').appendChild(el); }
    el.textContent = ep > 0 ? '· ' + G.tn(G.K.land(ep)) : '';
  }

  function applyStatic() {
    for (const el of $$('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    document.title = t('title');
    document.documentElement.lang = G.LANG;
    if ($('#land')) applyLand();
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
  // ---------- автоклик (талант «Королевская сноровка») ----------
  UI.autoRate = () => (G.bonus('autoClick') > 0 ? 1 + G.bonus('autoClick') : 0); // кликов в секунду
  function autoTick() {
    const rate = UI.autoRate();
    if (!rate || !G.S.king.auto || !UI.auto || G.W.active() || document.hidden) { UI.autoAcc = 0; return; }
    UI.autoAcc = (UI.autoAcc || 0) + 0.05 * rate;
    while (UI.autoAcc >= 1) {
      UI.autoAcc -= 1;
      const el = $(`.slot[data-k="${UI.auto.k}"]`);
      if (!el) return;
      // с кнопки «Добыть» цифры всплывают над самим зданием на карте
      let pos = UI.autoPos;
      if (UI.auto.btn) { const r = el.getBoundingClientRect(); pos = { clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.4 }; }
      UI.autoNow = true;
      try { UI.slotClick(UI.auto.k, Object.assign({ type: 'auto' }, pos), el); } finally { UI.autoNow = false; }
    }
  }

  // ---------- общая подсказка ----------
  function hideGtip() {
    UI.gtip = null;
    $('#gtip').classList.add('hidden');
  }
  function placeGtip(e) {
    const el = $('#gtip'), w = el.offsetWidth, h = el.offsetHeight;
    let x = e.clientX + 14, y = e.clientY + 16;
    if (x + w > window.innerWidth - 6) x = e.clientX - w - 12;
    if (y + h > window.innerHeight - 6) y = e.clientY - h - 12;
    el.style.left = Math.max(6, x) + 'px';
    el.style.top = Math.max(6, y) + 'px';
  }
  function resWaitText(r, why) {
    return why === 'academy' ? t('needAcad', { l: r.acad }) : why === 'req' ? t('needRes', { r: rsWord(r.req) }) : t('needStorageShort');
  }
  function gtipHtml(key) {
    const i = key.indexOf(':'), type = key.slice(0, i), id = key.slice(i + 1);
    if (type === 'r') {
      const rate = UI._rates && UI._rates[id];
      return `<b>${ic('r_' + id)} ${t('res_' + id)}</b><div>${t('tipHave')}: <b>${U.fmt(G.S.res[id] || 0)}</b> / ${U.fmt(G.E.cap(id))}${rate ? ` · <span class="good">+${U.fmt1(rate)}/${t('sec')}</span>` : ''}</div><div class="muted">${t('rd_' + id)}</div>`;
    }
    if (type === 'b') return tipHtml(id, false);
    if (type === 'h') return UI.hints[id] ? `<div class="htip">${UI.hints[id]}</div>` : '';
    if (type === 'sk') {
      const [aid, sid] = id.split('|'), a = G.T.get(aid), sk = a && D.SKILLS[a.cls].find((x) => x.id === sid);
      if (!sk) return '';
      const r = (a.sk && a.sk[sid]) || 0, sp = G.T.sp(a);
      return `<b>${ic(sk.icon)} ${t('sk_' + sid)}</b> <span class="muted">${t('skc_' + sk.cat)} · ${t('rankOf', { r, m: D.SKILL_MAX })}</span><div>${t('skd_' + sid)}</div>`
        + `<div class="${sp > 0 && r < D.SKILL_MAX ? 'good' : 'muted'}">${r >= D.SKILL_MAX ? t('maxLevel') : t('skillPts') + ': ' + sp}</div>`;
    }
    if (type === 'ad') {
      const a = D.ADVISORS.find((x) => x.id === id);
      if (!a) return '';
      const l = G.K.advLvl(id);
      return `<b>${ic('adv_' + id)} ${t('ad_' + id)}</b> <span class="muted">${t('rankOf', { r: l, m: D.ADV_MAX })}</span><div>${t('add_' + id)}</div>`
        + (G.K.advOpen(a) ? '' : `<div class="warn">${ic('i_lock')} ${t('needCastleLvl', { l: a.castle })}</div>`);
    }
    if (type === 'sp') {
      const sp = G.K.spell(id);
      if (!sp) return '';
      return `<b>${ic(sp.icon)} ${t('sp_' + id)}</b>${sp.battle ? ` <span class="muted">${t('inBattle')}</span>` : ''}<div>${t('spd_' + id, { d: G.K.meteorDmg() })}</div>`
        + `<div class="muted">${t('cooldown')}: ${U.fmtTime(G.K.spellCd(sp))}${G.S.king.lvl < sp.lvl ? ` · ${ic('i_lock')} ${t('lv')} ${sp.lvl}` : ''}</div>`;
    }
    if (type === 'cl') return `<b>${ic('c_' + id)} ${t('cl_' + id)}</b><div>${t('cld_' + id)}</div><div class="good">${ic('i_atk')} ${t('tgt_' + id)}</div>`;
    if (key === 'auto') return `<b>${ic('i_pick')} ${t('autoTitle')}: ${G.S.king.auto ? t('on') : t('off')}</b><div>${t('autoTip', { n: UI.autoRate() })}</div>`;
    if (key === 'folk') {
      const n = G.E.folk(), cap = G.E.homes();
      return `<b>${ic('c_folk')} ${t('folk')}: ${n} / ${cap}</b><div>${t('folkTax')}: <span class="good">+${U.fmt1(G.E.folkTax() * (1 + G.bonus('tax')))}/${t('sec')}</span></div>`
        + `<div>${n < cap ? t('folkNext', { s: Math.ceil(G.E.folkEvery() - (G.S.folkT || 0)) }) : t('folkFull')}</div><div class="muted">${t('folkHint', { e: U.fmt1(G.E.folkEvery()) })}</div>`;
    }
    if (type === 'pk') {
      const p = D.PERKS.find((x) => x.id === id);
      if (!p) return '';
      const r = G.K.perkRank(id), cost = G.K.perkCost(id), pts = G.S.dyn.pts;
      let h = `<b>${ic(p.icon)} ${t('pk_' + id)}</b> <span class="muted">${t('rankOf', { r, m: D.PERK_MAX })}</span><div>${t('pkd_' + id)}</div>`;
      if (id === 'found' && r < D.FOUND_ORDER.length) h += `<div class="good">${t('foundNext', { b: t('bn_' + D.FOUND_ORDER[r]) })}</div>`;
      h += r >= D.PERK_MAX ? `<div class="good">${t('maxLevel')}</div>` : `<div class="${pts >= cost ? 'good' : 'warn'}">${ic('i_crown')} ${t('perkCostTip', { c: cost, p: pts })}</div>`;
      return h + `<div class="muted">${t('perkTipHint')}</div>`;
    }
    if (type === 'tl') {
      const x = D.TALENTS.find((q) => q.id === id);
      if (!x) return '';
      const r = G.S.king.tal[id] || 0, mx = G.K.talMax(x);
      return `<b>${ic(x.icon)} ${t('tl_' + id)}</b> <span class="muted">${t('br_' + x.br)} · ${t('rankOf', { r, m: mx })}</span><div>${t('tld_' + id)}</div>`
        + `<div class="${G.K.tp() > 0 && r < mx ? 'good' : 'muted'}">${r >= mx ? t('maxLevel') : t('talTipPts', { n: G.K.tp() })}</div>`;
    }
    if (key === 'dyn') {
      const L = G.K.legacyParts();
      return `<b>${ic('i_crown')} ${t('dynasty')}</b><div>${t('dynTipWhat')}</div><div>${t('dynTipHow')}</div>`
        + `<div class="good">${t('dynTipNow', { w: L.wave, f: L.depth, c: L.castle, c3: L.castle * 3, k: L.king, k2: L.king * 2, a: L.arena, a2: L.arena * D.LEGACY.arena, j: L.jr, j5: L.jr * D.LEGACY.jr, n: L.total })}${L.dragon ? '' : ' ' + t('dynTipDragon')}</div>`
        + `<div>${t('dynTipMaxB', { n: Object.keys(G.S.lg8 || {}).length, m: G.K.maxBuildings().length })}</div>`
        + `<div class="muted">${t('dynTipPts', { p: G.S.dyn.pts })}</div>${G.S.camp.won ? '' : `<div class="warn">${ic('i_lock')} ${t('dynastyLocked')}</div>`}`;
    }
    if (type === 's') {
      const r = G.R.get(id);
      if (!r) return '';
      const st = G.R.state(id), q = G.S.decree.research.indexOf(id);
      let h = `<b>${t('rs_' + id)}</b>${r.b ? ` · <span class="muted">${[].concat(r.b).map((b) => t('bn_' + b)).join(', ')}</span>` : ''}<div>${t('rsd_' + id)}</div>`;
      if (st === 'done') h += `<div class="good">${ic('i_check')} ${t('researched')}</div>`;
      else if (st === 'cur') h += `<div class="warn">${t('researching')} ${U.fmtTime(G.R.cur(id).t)}</div>`;
      else {
        h += `<div class="row">${costHtml(r.cost)}<span class="muted">${ic('i_clock')} ${U.fmtTime(G.R.time(r))}</span></div>`;
        const why = G.R.waitReason(id);
        if (why) h += `<div class="warn">${ic('i_lock')} ${resWaitText(r, why)}</div>`;
      }
      if (q >= 0) h += `<div class="muted">${ic('i_scroll')} ${t('queuedPos', { n: q + 1 })}</div>`;
      return h;
    }
    return '';
  }
  function renderGtip() {
    if (!UI.gtip) return;
    const el = $('#gtip'), html = gtipHtml(UI.gtip);
    if (!html) { hideGtip(); return; }
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
    el.classList.remove('hidden');
  }

  // Подсказка здания: уровень, цена и время улучшения, что мешает, рабочие и место в указе
  function tipHtml(k, hint) {
    const d = D.B[k], L = G.E.lvl(k);
    let h = `<b>${t('bn_' + k)}</b>`;
    if (k === 'dungeon') {
      h += ` · ${t('deepest')}: ${G.X.best('catacombs')}`;
      if (G.S.exps.some((e) => e.phase === 'travel' || e.phase === 'ret')) h += `<div class="good">${ic('i_boot')} ${t('hurryTip')}</div>`;
      for (const e of G.S.exps) h += `<div class="warn">${ic('i_flag')} ${t('tipSquad', { l: t('loc_' + e.loc), f: e.phase === 'ret' ? e.cleared : e.floor })}</div>`;
    } else {
      h += ` · ${L ? t('lv') + ' ' + L : t('notBuilt')}`;
      const c = G.E.consOf(k);
      if (c) h += `<div class="warn">${ic('i_hammer')} ${t(L ? 'consUp' : 'consBuild', { l: L + 1 })}: ${U.fmtTime(c.t)}</div>`;
      else {
        const why = G.E.whyNot(k);
        if (why === 'max') h += `<div class="good">${t('maxLevel')}</div>`;
        else {
          h += `<div>${L ? t('upgradeTo', { l: L + 1 }) : t('build')}:</div><div class="row">${costHtml(G.E.upCost(k))}<span class="muted">${ic('i_clock')} ${U.fmtTime(G.E.upTime(k))}</span></div>`;
          if (why === 'castle') h += `<div class="warn">${t('needCastle', { l: L + 1 })}</div>`;
          else if (why === 'storage') h += `<div class="warn">${t('needStorage')}</div>`;
          else if (why === 'builders') h += `<div class="warn">${t('needBuildersShort')}</div>`;
        }
      }
      if (d.prod && L) h += `<div class="muted">${ic('i_people')} ${G.S.b[k].w}/${G.E.maxWorkers(k)} · +${U.fmt1(G.S.b[k].w * G.E.workerRate(k))}/${t('sec')}</div>`;
      // значок указа на карте: какие места в очереди занимает здание и до какого уровня
      let lv = L + (G.E.consOf(k) ? 1 : 0);
      const pos = [];
      G.S.decree.build.forEach((x, i) => { if (x === k) { lv++; pos.push(`№${i + 1} → ${lv}`); } });
      if (pos.length) h += `<div class="warn">${ic('i_scroll')} ${t('tipDecree', { n: pos.join(', ') })}</div>`;
    }
    return h + (hint === false ? '' : `<div class="muted tiphint">${t('tipOpen')}</div>`);
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
    const jb = $('#journey-btn');
    if (jb) {
      const open = G.J.open();
      jb.classList.toggle('hidden', !open);
      const html = `${ic('i_ship', 'ic2')}<span>${t('journey')}</span>`;
      if (open && jb._h !== html + G.LANG) { jb.innerHTML = html; jb._h = html + G.LANG; jb.title = t('journeyTip'); }
    }
    const wt = wallTier(), st = G.SPR.style();
    if (wt !== UI.wallTier || st !== UI.wallStyle) { UI.wallTier = wt; UI.wallStyle = st; G.SPR.mapBg($('#mapbg'), wt); }
    const dq = G.S.decree.build;
    for (const el of $$('.slot')) {
      const k = el.dataset.k, L = G.E.lvl(k), d = D.B[k];
      const key = bSprite(k), sk = key + '@' + st;
      const img = el.firstElementChild;
      if (img.dataset.key !== sk) { img.src = G.SPR.url(key); img.dataset.key = sk; }
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

  // Значок походов: этаж единственного отряда или число отрядов
  function squadBadge() {
    const ex = G.S.exps;
    if (!ex.length) return '';
    if (ex.length > 1) return ic('i_flag') + '×' + ex.length;
    return ic('i_flag') + (ex[0].phase === 'ret' ? ex[0].cleared : ex[0].floor);
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
    set('dungeon', squadBadge());
    set('tavern', G.E.usable('tavern') && S.tavern.cands.length && S.advs.length < G.T.maxAdvs() ? ic('i_people') + S.tavern.cands.length : '');
    set('academy', S.research.act.length ? ic('i_book') + (S.research.act.length > 1 ? S.research.act.length : '') : '');
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
    } else if (k === 'dungeon' && G.X.hurry()) { text = '−' + U.fmt1(G.X.hurrySec()) + t('sec'); icon = 'i_boot'; G.SFX.play('click'); }
    else if (k === 'forge' && G.F.boost()) { text = t('hammerHit') + ' −' + U.fmt1(G.F.boostSec()) + t('sec'); icon = 'i_anvil'; G.SFX.play('hit'); }
    else if (k === 'tavern') {
      const r = G.T.boost();
      if (r === 'came') { text = t('recruitsCame'); icon = 'i_people'; G.SFX.play('coin'); }
      else if (r) { text = '−' + U.fmt1(G.T.boostSec()) + t('sec'); icon = 'i_people'; G.SFX.play('click'); }
    } else if (k === 'arena' && G.A.boost()) { text = '−' + U.fmt1(G.A.boostSec()) + t('sec'); icon = 'i_clock'; G.SFX.play('click'); }
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
  // Всплывающая цифра у курсора в любом месте экрана (сцена похода в правой колонке)
  function floatAt(e, text, icon) {
    const f = document.createElement('div');
    f.className = 'float fixed';
    f.style.left = e.clientX + 'px';
    f.style.top = e.clientY + 'px';
    f.innerHTML = (icon ? ic(icon) : '') + `<span>${esc(text)}</span>`;
    document.body.appendChild(f);
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
    const ents = Object.entries(pv.counts), MAXM = 3;
    const all = ents.map(([k, c]) => `${t('mn_' + k)} ×${c}`).join(', ');
    const mons = ents.slice(0, MAXM).map(([k, c]) => `<span class="wm" title="${esc(t('mn_' + k))}">${ic(monSpr(k), 'ic-mon')}<b>${c}</b></span>`).join('')
      + (ents.length > MAXM ? `<span class="wm wmore" title="${esc(all)}">+${ents.length - MAXM}</span>` : '');
    const note = why === 'noDefenders' ? t('waveNoDefenders') : why === 'gateBusy' ? t('waveGateBusy') : '';
    el.innerHTML = `<div class="ww">
      <div class="wsec">
        <button class="wbtn" data-action="wave" data-arg="-1" ${n <= 1 ? 'disabled' : ''}>◀</button>
        <span class="wt">${t('wave')} <b>${n}</b>${n % 5 === 0 ? ` <i class="boss">${t('boss')}</i>` : ''}${G.W.spdMul(n) > 1 ? ` <i class="wfast" title="${esc(t('waveFastTip', { p: Math.round((G.W.spdMul(n) - 1) * 100) }))}">${ic('i_boot')}+${Math.round((G.W.spdMul(n) - 1) * 100)}%</i>` : ''}</span>
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
    $('#folk').innerHTML = `${ic('c_folk', 'ic2')}<div class="rcol"><div><span class="fl">${t('folk')}</span> <b data-b="folk"></b></div><div class="rline"><div class="rbar"><i data-w="folkW"></i></div><span class="rr">${ic('r_gold')}<span data-b="folkR"></span></span></div></div>`;
    $('#kbadge').innerHTML = `${ic('c_king', 'ic2')}<span class="kl">${t('lv')} <b data-b="klvl"></b></span>${bar('kxp', 'xp')}${G.K.tp() > 0 ? '<i class="sp">+</i>' : ''}`;
    $('#kbadge').title = t('king') + ' · ' + t('lv') + ' ' + k.lvl;
    const ab = $('#autobtn');
    ab.classList.toggle('hidden', !UI.autoRate());
    ab.classList.toggle('on', !!k.auto);
    ab.innerHTML = `${ic('i_pick')} ${t('autoShort')} <b>${k.auto ? t('on') : t('off')}</b>`;
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
      if (UI.win === 'settings') UI.openSettings();
      UI.dirty();
    },
    sound() { G.S.sound = !G.S.sound; applyStatic(); G.SFX.play('click'); },
    setStyle(id) {
      if (id !== 'classic' && !G.GOTH.style(id)) return;
      G.S.style = id;
      UI.slotsDirty = true;
      G.SFX.play('click');
      G.save();
      if (UI.win === 'settings') UI.openSettings();
      UI.dirty();
    },
    autoToggle() { G.S.king.auto = !G.S.king.auto; G.SFX.play('click'); UI.dirty(); },
    settings() { UI.openSettings(); },
    goals() { if (UI.win === 'goals') UI.closeModal(); ACT.gtab('all'); },
    goGoal(id) { UI.goGoal(id); },
    gtab(a) {
      UI.gtab = a === 'log' || a === 'all' ? a : 'goals';
      if (a === 'log') UI.logDirty = true;
      if (a === 'all') UI._allJump = true; // при открытии — к текущим целям
      UI.dirty();
    },
    gAccept(id) { if (G.E.acceptGoal(id)) UI.focusGoal = id; },
    gClaim(id) { G.E.claimGoal(id); },
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
    item(id) { UI.selItem = UI.selItem === id ? null : id; UI.dirty(); },
    itemClose() { UI.selItem = null; UI.dirty(); },
    eq(a) { const [id, owner] = a.split('|'); G.F.equip(id, owner); UI.pick = null; },
    uneq(id) { G.F.unequip(id); UI.pick = null; },
    sellItem(id) { G.F.sell(id); if (UI.selItem === id) UI.selItem = null; },
    sellJunk() { G.F.sellJunk(); },
    enchant(id) { G.F.enchant(id); },
    armF(f) { UI.armF = f; UI.dirty(); },
    wave(d) { const s = G.S.gate; s.sel = U.clamp(s.sel + +d, 1, s.best + 1); UI.dirty(); },
    fight() { G.W.start(false); UI.dirty(); },
    fightFinal() { G.W.start(true); UI.dirty(); },
    bclose() { G.W.close(); },
    askip() { G.W.arenaSkip(); },
    arenaNext() { G.A.fight(); },
    arenaBoost() { if (G.A.boost()) G.SFX.play('click'); },
    journey() { if (!G.J.open()) return; if (!G.W.running()) G.W.close(); UI.open('journey'); },
    journeyNext() { G.J.fight(); },
    foeHit(id, el, e) {
      const r = G.X.click(id);
      if (!r) return;
      floatAt(e, (r.crit ? t('critClick') + ' ' : '') + '−' + U.fmt(r.d), 'i_atk');
      G.SFX.play(r.crit ? 'coin' : 'hit');
    },
    jSel(s) { G.J.select(+s); },
    jPick(id) { G.J.pick(id); },
    jFight() { G.J.fight(); },
    bnext() { G.W.next(); },
    bspeed(v) { G.W.setSpeed(+v); },
    cast(id) { G.K.cast(id); },
    talent(id) { G.K.learn(id); },
    advisor(id) { G.K.hireAdv(id); },
    perk(id) { G.K.buyPerk(id); },
    abdicate() { UI.confirm(t('confirmAbdicate', { n: G.K.legacyGain() }), () => G.K.abdicate()); },
    research(id) { G.R.start(id); },
    resQueue(id) { G.R.enqueue(id); },
    resCancel(id) { G.R.cancel(id); },
    loc(id) { G.S.dng.loc = id; G.S.dng.maxFloor = Math.min(G.S.dng.maxFloor, G.X.floors(id)); UI.expView = 'new'; UI.dirty(); },
    squad(id) { UI.expView = id; UI.dirty(); },
    pickParty(id) {
      if (UI.party.has(id)) UI.party.delete(id);
      else if (UI.party.size < G.X.partyMax(G.S.dng.loc)) UI.party.add(id);
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
    send() {
      const e = G.X.start([...UI.party], G.S.dng.loc, G.S.dng.maxFloor, G.X.startFloor(G.S.dng.loc));
      UI.party.clear();
      if (e) { UI.expView = e.id; UI.lastTab = null; } // поход начался — вкладка прокручивается к нему, в самый верх
    },
    recall(id) { G.X.recall(id); },
    arenaPick(id) { G.A.pick(id); },
    arenaFight() { G.A.fight(); },
    hurry(id) { G.X.hurry(id); G.SFX.play('click'); UI.expDirty(); },
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
    p.innerHTML = goalNote(null, UI.tab) + (PANEL[UI.tab] || PANEL.decree)();
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
      const inner = [...mb.querySelectorAll('[data-keep]')].map((el) => [el.dataset.keep, el.scrollTop]);
      mb.innerHTML = G.WIN[UI.win](UI.winArg);
      mb.scrollTop = s;
      for (const [k, v] of inner) { const el = mb.querySelector(`[data-keep="${k}"]`); if (el) el.scrollTop = v; }
    }
    UI.slotsDirty = true;
    UI.refresh();
    // после передачи трона панель сама прокручивается к Династии
    if (UI.scrollTo === 'dynasty') {
      const el = $('#panel .dynbox');
      if (el) { el.scrollIntoView({ block: 'start' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 4000); }
      UI.scrollTo = null;
    }
  };

  function renderTabs() {
    const S = G.S;
    const dq = S.decree.build.length + S.decree.research.length;
    const tabs = [
      ['decree', 'tabDecree', 'i_scroll', (S.cons.length ? ic('i_hammer') + S.cons.length : '') + (S.cons.length && dq ? ' · ' : '') + (dq ? String(dq) : '')],
      ['guild', 'tabGuild', 'i_people', G.E.lvl('tavern') ? S.advs.length + '/' + G.T.maxAdvs() : ''],
      ['armory', 'tabArmory', 'i_def', S.items.length ? String(S.items.length) : ''],
      ['exp', 'tabExp', 'i_map', squadBadge()],
      ['king', 'tabKing', 'i_crown', G.K.tp() > 0 ? '+' + G.K.tp() : ''],
    ];
    $('#tabs').innerHTML = tabs.map(([k, lab, i, b]) => `<button class="tab ${UI.tab === k ? 'on' : ''}" data-action="tab" data-arg="${k}">${ic(i)}<span>${t(lab)}</span>${b ? `<em>${b}</em>` : ''}</button>`).join('');
  }

  // Под картой — панель с двумя вкладками: «★ Цель X/N» (три задания) и «Лог» (журнал событий)
  UI.gtab = 'goals';
  function renderGoal() {
    const vis = G.E.goalsVisible(), ready = vis.filter((g) => G.E.goalReady(g)).length;
    const tab = (k, html) => `<button class="gtab ${UI.gtab === k ? 'on' : ''}" data-action="gtab" data-arg="${k}">${html}</button>`;
    $('#goal').innerHTML = tab('goals', `${ic('i_star')} ${t('goalsTab')} <b>${G.E.goalsDoneCount()}/${D.GOALS.length}</b>${ready ? `<em>${ready}</em>` : ''}`)
      + tab('all', `${ic('i_book')} ${t('allGoals')}`) + tab('log', `${ic('i_scroll')} ${t('logTab')}`);
    const box = $('#gcards');
    box.classList.toggle('hidden', UI.gtab === 'log');
    box.classList.toggle('alllist', UI.gtab === 'all');
    $('#log').classList.toggle('hidden', UI.gtab !== 'log');
    if (UI.gtab === 'all') {
      const st = box.scrollTop;
      box.innerHTML = G.PANE.goalsList();
      box.scrollTop = st;
      if (UI._allJump) { UI._allJump = false; const cur = box.querySelector('.gitem.cur'); if (cur) box.scrollTop = cur.offsetTop - box.offsetTop - 8; }
      return;
    }
    if (UI.gtab !== 'goals') return;
    box.innerHTML = vis.length ? vis.map(goalCard).join('') : `<div class="gcard done"><div class="gc-l"><div class="gc-t">${ic('i_crown')} ${t('goalsDone')}</div></div></div>`;
  }
  // Карточка задания в один ряд: награда | название | прогресс | кнопка («Принять» → «Показать» → «Сдать»)
  function goalCard(g) {
    const A = G.E.goalAcc(g), ready = G.E.goalReady(g);
    const gr = g.h && g.h.act === 'research' && g.h.arg;
    let prog;
    if (!A) prog = `<span class="muted small">${t('goalNotTaken')}</span>`;
    else if (g.v) prog = `${bar('gp:' + g.id, ready ? 'gpbar done' : 'gpbar')}<b class="gprog" data-b="gp:${g.id}"></b>`;
    else prog = `<span class="small ${ready ? 'good' : 'muted'}">${ready ? ic('i_check') + ' ' + t('goalMetShort') : t('goalInWork')}</span>`;
    const btn = !A ? `<button class="btn primary" data-action="gAccept" data-arg="${g.id}" title="${t('goalAcceptHint')}">${t('goalAccept')}</button>`
      : ready ? `<button class="btn claim" data-action="gClaim" data-arg="${g.id}">${ic('i_chest')} ${t('goalClaim')}</button>`
        : `<button class="btn" data-action="goGoal" data-arg="${g.id}">${t('goalGo')} ›</button>`;
    return `<div class="gcard ${ready ? 'ready' : A ? 'acc' : 'new'}">
      <span class="gc-r">${lootHtml(g.reward)}</span>
      <span class="gc-t" data-action="goGoal" data-arg="${g.id}" ${gr ? `data-tip="s:${gr}"` : `title="${esc(t(g.t))}"`}>${t(g.t)}</span>
      <span class="gc-p">${prog}</span>
      <span class="gc-b">${btn}</span></div>`;
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
    const bh = k === 'warehouse' && L + 1 >= D.MAXLVL ? t('bh_warehouse8', { p: Math.round(D.STORE_PROD * 100) }) : t('bh_' + k);
    let h = `<div class="hint top">${bh}${look}</div><div class="row">${costHtml(cost)}<span class="muted small">${ic('i_clock')} ${U.fmtTime(G.E.upTime(k))}</span></div>`;
    if (why === 'castle') h += `<div class="warn small">${ic('i_lock')} ${t('needCastle', { l: L + 1 })}</div>`;
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
      ${mx > D.WORKERS[L] ? `<div class="good small">${t('workersBonus', { n: mx - D.WORKERS[L] })}</div>` : ''}`, '', ['workersMore', t('workersMore') + '<br>' + t('clickHint')]);
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
          ${kv('i_bag', t('goldCap'), `<b>${U.fmt(G.E.cap('gold'))}</b>`)}`, '', 'taxHint') +
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
      if (G.E.noCap()) {
        const cp = Math.round(G.E.convProd() * 100), ct = Math.round(G.E.convTax() * 100);
        const conv = cp || ct ? `<div class="small muted">${t('convNote', { p: cp, g: ct })}</div>` : '';
        return box(ic('i_bag') + ' ' + t('capacity'), rows + `<div class="good small">${ic('i_star')} ${t('noCapNote', { p: Math.round(D.STORE_PROD * 100) })}</div>${conv}`);
      }
      const next = L + 1 >= D.MAXLVL ? t('bh_warehouse8', { p: Math.round(D.STORE_PROD * 100) })
        : t('nextCap', { n: U.fmt(Math.floor(D.CAPS[L + 1] * (1 + G.bonus('store')))), g: U.fmt(Math.floor(D.goldCap(L + 1) * (1 + G.bonus('store')))) });
      return box(ic('i_bag') + ' ' + t('capacity'), rows + `<div class="hint">${next}</div>`);
    },
    arena() {
      const A = G.A, S = G.S.arena, tm = A.team(), why = A.whyNot();
      const en = A.opp(S.rank, Math.max(1, tm.length)), ch = A.chance();
      let h = box(tipTitle(ic('i_atk') + ' ' + t('arenaRank', { r: S.rank }), 'arenaHint') + ` <span class="muted">${t('arenaBest', { n: S.best || 0 })}</span>`, `
        <div class="arena-opp">${ic(monSpr(en.key), 'ic4')}<div class="grow"><b>${esc(t('mn_' + en.key))}</b> <span class="muted small">${t('arenaChamp')}</span>
          <div class="small">${ic('i_hp')} ${U.fmt(en.hp)} ${ic('i_atk')} ${U.fmt1(en.atk)}</div>
          <div class="small">${t('arenaReward')}: ${lootHtml(A.reward(S.rank))}</div>
          ${tm.length ? `<div class="small ${ch >= 0.7 ? 'good' : ch >= 0.4 ? 'warn' : 'bad'}">${t('winChance')}: <b>${Math.round(ch * 100)}%</b></div>` : ''}</div></div>
        <div class="small muted">${ic('i_clock')} ${t('arenaNext')}: <b data-b="arenaT"></b></div>
        <button class="btn primary big" data-action="arenaFight" ${why ? 'disabled' : ''}>${ic('i_atk')} ${why === 'cd' ? t('arenaWait') : why === 'team' ? t('arenaNoTeam') : why === 'busy' ? t('busyShort') : why === 'fight' ? t('arenaLive') : why === 'battle' ? t('arenaGateBusy') : t('arenaFight')}</button>`);
      const idle = G.S.advs.filter((a) => a.st === 'idle' || (S.team || []).includes(a.id));
      h += box(ic('i_people') + ' ' + t('arenaTeam') + ` <span class="muted">${S.live ? S.live.ids.length : tm.length}/${A.teamMax()}</span>`,
        idle.length ? `<div class="tiles">${idle.map((a) => advTile(a, 'arenaPick', a.id, (S.team || []).includes(a.id))).join('')}</div>` : `<div class="muted small">${G.S.advs.length ? t('noIdle') : t('guildEmpty')}</div>`);
      if (S.last) {
        const R = S.last;
        h += box(ic('i_scroll') + ' ' + t('arenaLast'), `<div class="${R.win ? 'good' : 'bad'}">${R.win ? t('arenaWon', { r: R.rank }) : t('arenaLost', { r: R.rank })}</div>${R.loot ? `<div>${lootHtml(R.loot)}</div>` : ''}<div class="flog">${R.log.map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div>`);
      }
      return h;
    },
    forge() {
      return G.PANE.craft() +
        box(ic('i_people') + ' ' + t('smiths') + ` <span class="muted">${G.S.b.forge.w}/${G.F.maxSmiths()}</span>`, `${kv('i_clock', t('craftSpeed'), `<b>×${G.F.speed().toFixed(2)}</b>`)}${G.S.b.forge.w < G.F.maxSmiths() ? btn(ic('i_people') + ' ' + t('hireSmith'), 'smith', '', { cost: G.F.smithCost() }) : ''}`, '', ['smithHint', t('smithHint') + ' ' + t('forgeClickHint')]);
    },
    tavern: () => G.PANE.hire(),
    barracks() {
      const mx = G.T.maxGuards();
      return box(ic('i_helmet') + ' ' + t('guards') + ` <span class="muted">${G.S.guards}/${mx}</span>`, `
        ${kv('i_atk', t('guardDmg'), `<b>${U.fmt1(G.T.guardDmg())}</b>`)}
        ${kv('i_tower', t('dps'), `<b>${U.fmt1((G.S.guards * G.T.guardDmg()) / 1.2)}</b>`)}
        ${G.S.guards < mx ? btn(ic('i_helmet') + ' ' + t('hireGuard'), 'guard', '', { cost: G.T.guardCost() }) : `<div class="muted small">${t('guardsFull')}</div>`}`, '', 'guardHint');
    },
    academy: () => G.PANE.research(),
    gate() {
      const why = G.W.whyNot();
      let h = box(ic('i_def') + ' ' + t('defense'), `
        ${kv('i_def', t('wallHp'), `<b>${U.fmt(G.W.wallHp())}</b>`)}
        ${kv('i_helmet', t('guards'), `<b>${G.S.guards}</b> <span class="muted small">(${t('dps')} ${U.fmt1((G.S.guards * G.T.guardDmg()) / 1.2)})</span>`)}
        ${kv('i_crown', t('kingDmg'), `<b>${G.W.kingDmg()}</b> ${t('perClick')}`)}`);
      h += box(ic('i_tower') + ' ' + t('onWall') + ` <span class="muted">${G.T.gateCount()}/${G.T.gateMax()}</span>`, defenders(), '', 'wallHint');
      h += box(ic('i_atk') + ' ' + t('waves'), `<div class="muted small">${t('bestWave')}: <b>${G.S.gate.best}</b> · ${t('wave')} ${G.S.gate.sel}</div>
        ${why ? `<div class="warn small">${t(why === 'noDefenders' ? 'waveNoDefenders' : why === 'gateBusy' ? 'waveGateBusy' : 'waveNoWalls')}</div>` : ''}
        <button class="btn primary big" data-action="fight" ${why ? 'disabled' : ''}>${ic('i_atk')} ${t('toBattle')}</button>`, '', ['waveWidgetHint', t('waveWidgetHint') + '<br>' + t('defeatHint')]);
      return h;
    },
  };

  // Кнопка быстрого действия в окне: добыть, помочь стройке или ударить молотом
  function popAction(k) {
    const d = D.B[k], L = G.E.lvl(k);
    if (G.E.consOf(k)) return G.E.boostSec() > 0 ? `<button class="btn primary big popact" data-action="gather" data-arg="${k}">${ic('i_hammer')} ${t('helpBuild', { n: U.fmt1(G.E.boostSec()) })}</button>` : '';
    if (L > 0 && d.click) return `<button class="btn primary big popact" data-action="gather" data-arg="${k}">${ic('i_pick')} ${t('gatherBtn')} <b>+${U.fmt1(G.E.clickAmount(k))}</b> ${ic('r_' + d.click)}</button>`;
    if (k === 'forge' && L > 0 && G.S.forge.q.length) return `<button class="btn big popact" data-action="gather" data-arg="${k}">${ic('i_anvil')} ${t('forgeHitBtn', { n: U.fmt1(G.F.boostSec()) })}</button>`;
    if (k === 'tavern' && L > 0 && !G.E.busy('tavern')) return `<button class="btn big popact" data-action="gather" data-arg="${k}">${ic('i_people')} ${t('recruitBoost', { n: U.fmt1(G.T.boostSec()) })} <span class="muted small">· <span data-b="tavT"></span></span></button>`;
    if (k === 'arena' && L > 0 && G.S.arena.cd > 0) return `<button class="btn big popact" data-action="gather" data-arg="${k}">${ic('i_clock')} ${t('arenaBoost', { n: U.fmt1(G.A.boostSec()) })}</button>`;
    if (k === 'academy' && L > 0 && G.R.active().length) return `<button class="btn primary big popact" data-action="gather" data-arg="${k}">${ic('i_book')} ${t('resBoostBtn', { n: U.fmt1(G.R.boostSec()) })}</button>`;
    return '';
  }
  function popPanel(k) {
    const L = G.E.lvl(k);
    let h = `<div class="bhead">${ic(bSprite(k), 'bimg')}<div class="grow"><h2>${tipTitle(t('bn_' + k), 'bd_' + k)}</h2><div class="lvl">${L ? t('levelOf', { l: L, m: D.MAXLVL }) : t('notBuilt')}</div></div></div>`;
    h += goalNote(k, null);
    h += popAction(k);
    h += upgradeBox(k);
    // здание на перестройке недоступно; замок и склад показывают справку
    if (L > 0 && BP[k] && (!G.E.busy(k) || k === 'castle' || k === 'warehouse')) h += BP[k]();
    if (k !== 'academy') h += skillsBox(k);
    return h;
  }
  // Навыки здания: его исследования в Академии — изучить отсюда или поставить в указ
  function skillsBox(k) {
    const list = D.RESEARCH.filter((r) => D.resIn(r, k));
    if (!list.length) return '';
    const AL = G.E.lvl('academy'), busyAll = !G.R.free();
    const rows = list.map((r) => {
      const st = G.R.state(r.id), q = G.S.decree.research.indexOf(r.id);
      let act;
      if (st === 'done') act = `<div class="good small">${ic('i_check')} ${t('researched')}</div>`;
      else if (st === 'cur') act = `${bar('rsch:' + r.id)}<div class="muted small" data-b="rschT:${r.id}"></div>`;
      else {
        const why = G.R.waitReason(r.id);
        act = `<div class="row">${costHtml(r.cost)}<span class="muted small">${ic('i_clock')} ${U.fmtTime(G.R.time(r))}</span></div><div class="row">`;
        if (!AL) act += `<span class="warn small">${ic('i_lock')} ${t('needAcademyShort')}</span>`;
        else if (st === 'open') act += btn(t('study'), 'research', r.id, { cost: r.cost, chips: false, cls: 'small primary', lock: busyAll || !G.E.usable('academy') });
        else act += `<span class="warn small">${ic('i_lock')} ${resWaitText(r, why)}</span>`;
        if (AL) act += ` <button class="btn small" data-action="resQueue" data-arg="${r.id}" ${q >= 0 ? 'disabled' : ''}>${ic('i_scroll')} ${q >= 0 ? t('queuedPos', { n: q + 1 }) : t('toDecree')}</button>`;
        act += '</div>';
      }
      return `<div class="bskill st-${st}" data-tip="s:${r.id}">${ic(r.icon, 'ic2')}<div class="grow"><b class="hastip">${t('rs_' + r.id)}<i class="qh">?</i></b>${act}</div></div>`;
    }).join('');
    const done = list.filter((r) => G.R.done(r.id)).length;
    return box(ic('i_book') + ' ' + t('bSkills') + ` <span class="muted">${done}/${list.length}</span>`, rows, '', 'bSkillsHint');
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
    if (G.E.lvl('tavern') < 1 && !G.S.advs.length) return box('', t('needTavern'), 'muted');
    const A = G.S.advs;
    if (!G.T.get(UI.selAdv)) UI.selAdv = A[0] ? A[0].id : null;
    let h = box(tipTitle(ic('i_people') + ' ' + t('guild'), 'guildTip') + ` <span class="muted">${A.length}/${G.T.maxAdvs()}</span>`,
      `${G.E.lvl('tavern') < 1 ? `<div class="warn small">${t('heirsWait')}</div>` : ''}${A.length ? '' : `<div class="muted small">${t('guildEmpty')}</div>`}<div class="row"><button class="btn small" data-action="goto" data-arg="tavern">${ic('i_people')} ${t('toTavern')}</button></div>`);
    if (!G.K.medic() && A.some((a) => a.hp > 0 && a.hp < G.T.stats(a).hp)) h += `<div class="warn small">${ic('i_heal')} ${t('noMedicHint')}</div>`;
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
      .concat(G.S.advs.map((a) => { const s = G.T.stats(a); return ['' + a.id, 'c_' + a.cls, nm(a.name), `${t('cl_' + a.cls)} · ${t('lv')} ${a.lvl} · ${t('st_' + a.st)}<br><span class="wst">${ic('i_atk')}${s.atk} ${ic('i_def')}${s.def} ${ic('i_hp')}${s.hp}</span>`, ['weapon', 'armor'], D.ARAR[a.rar].color]; }));
    let h = box(ic('i_people') + ' ' + t('wearersTitle'), wearers.map(([o, icon, name, sub, slots, col]) =>
      `<div class="wearer"><div class="wwho">${ic(icon, 'ic2')}<div><b style="color:${col}">${esc(name)}</b><div class="small muted">${sub}</div></div></div><div class="eqrow">${G.PANE.eqSlots(o, slots)}</div></div>${G.PANE.pickerFor(o, slots)}`).join(''), '', 'wearersHint');
    const cats = ['all', ...Object.keys(D.ITYPES)];
    h += `<div class="filters">${cats.map((c) => `<button class="fbtn ${f === c ? 'on' : ''}" data-action="armF" data-arg="${c}" title="${esc(c === 'all' ? t('all') : t('it_' + c))}">${c === 'all' ? ic('i_chest', 'ic2') : ic('it_' + c + ':0', 'ic2')}</button>`).join('')}${junk.length ? `<button class="btn small" data-action="sellJunk">${ic('r_gold')} ${t('sellJunk', { n: junk.length })}</button>` : ''}</div>`;
    h += `<div class="legend small muted"><span class="lg-eq"></span> ${t('equippedLegend')} · ${t('itemTip')}</div>`;
    if (!items.length) h += box('', G.E.lvl('forge') ? t('noItemsForge') : t('needForgeBuild'), 'muted');
    h += `<div class="igrid">${items.map((it) => itemTile(it) + (UI.selItem === it.id ? `<div class="idetail">${G.PANE.item(it.id)}</div>` : '')).join('')}</div>`;
    // выбранная вещь не попала в фильтр — показываем её под сеткой
    if (UI.selItem && !items.some((it) => it.id === UI.selItem)) h += G.PANE.item(UI.selItem);
    return h;
  }

  // ---------- вкладка «Походы» ----------
  // Вкладка «Катакомбы»: сверху условия похода, под ними отправка отряда, ниже — отряды в походе
  function expBody() {
    if (G.E.lvl('tavern') < 1) return box('', t('needTavernDungeon'), 'muted');
    const ex = G.S.exps, max = G.X.maxSquads(), loc = 'catacombs';
    if (!G.X.get(UI.expView)) UI.expView = ex.length ? ex[0].id : null;
    const e = G.X.get(UI.expView);
    const best = G.X.best(loc), nb = Object.keys(D.CAT_BOSS).map(Number).find((f) => f > best);
    let h = `<div class="lochead">${ic('b_dungeon:1', 'ic3')}<div class="grow"><h2>${tipTitle(t('loc_catacombs'), 'locd_catacombs')}</h2>
      <div class="muted small">${t('deepest')}: <b>${best}</b> · ${t('difficulty')}: <b>×${U.fmt1(G.K.epochMul())}</b>${nb ? ` · ${t('catNextBoss', { f: nb, m: t('mn_' + D.CAT_BOSS[nb]) })}` : ''}</div>
      ${G.S.camp.awake && !G.S.camp.won ? `<div class="good small">${ic('i_dragon')} ${t('catDragonAwake')}</div>` : G.S.camp.won ? `<div class="muted small">${ic('i_crown')} ${t('catDragonWon')}</div>` : ''}</div>
      ${nb ? `<span class="nextboss" title="${esc(t('catNextBoss', { f: nb, m: t('mn_' + D.CAT_BOSS[nb]) }))}">${ic(monSpr(D.CAT_BOSS[nb]), 'ic3')}<b>${nb}</b></span>` : ''}</div>`;
    const setup = ex.length < max ? expSetup(loc) : box('', `${ic('i_lock')} ${G.X.nextSquadLvl() ? t('squadsFull', { l: G.X.nextSquadLvl() }) : t('squadsFullMax')}`, 'muted');
    if (ex.length) {
      // идёт поход — отряды и сцена боя в самом верху, шапка и отправка нового отряда — ниже
      const sq = `<div class="squads"><span class="sqt">${ic('i_people')} ${t('squadsTitle', { n: ex.length, m: max })}</span>${ex.map((x, i) => `<button class="sqb ${e === x ? 'on' : ''}" data-action="squad" data-arg="${x.id}">${ic('b_dungeon:1', 'ic2')}<span><b>${t('squadN', { n: i + 1 })}</b><span class="small muted">${t('floor')} ${x.phase === 'ret' ? x.cleared : x.floor}</span></span>${bar('hpp:' + x.id, 'hp')}</button>`).join('')}</div>`;
      h = sq + (e ? expActive(e) : '') + h + setup;
    } else {
      h += setup;
      if (G.S.lastExp) {
        const R = G.S.lastExp;
        h += box(ic('i_scroll') + ' ' + t('lastReport'), `<div class="${R.ok ? 'good' : 'bad'}">${R.ok ? t('lastOk', { f: R.floor, l: t('loc_' + R.loc) }) : t('lastFail', { f: R.floor, l: t('loc_' + R.loc) })}</div><div>${lootHtml(R.loot) || '—'}${R.items ? ' · ' + t('itemsN', { n: R.items }) : ''}</div><div class="xlog">${R.log.map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div>`);
      }
    }
    return h;
  }

  function expSetup(loc) {
    const idle = G.S.advs.filter((a) => a.st === 'idle');
    for (const id of [...UI.party]) {
      const a = G.T.get(id);
      if (!a || a.st !== 'idle') UI.party.delete(id);
    }
    const pmax = G.X.partyMax(loc);
    for (const id of [...UI.party].slice(pmax)) UI.party.delete(id);
    const Dn = G.S.dng;
    Dn.maxFloor = Math.min(Dn.maxFloor, G.X.floors(loc));
    const sf = G.X.startFloor(loc), so = G.X.startOptions(loc), si = so.indexOf(sf);
    const mf = Math.max(Dn.maxFloor, sf), push = Dn.hp <= 0, off = push ? 'disabled' : '';
    const sc = G.X.scale(loc, UI.party.size);
    const big = pmax > G.X.maxParty ? ['partyScale', t('partyScale', { m: pmax, k: U.fmt1(sc.hp), a: U.fmt1(sc.atk), l: U.fmt1(sc.loot) })] : null;
    let h = box(ic('i_scroll') + ' ' + t('retreatTitle'), `
      <div class="cond"><span class="grow">${ic('i_stairs')} ${t('startFloor')}<span class="small muted cnote">${so.length > 1 ? t('startHint') : t('startLocked')}</span></span><button class="btn small" data-action="startf" data-arg="-1" ${si > 0 ? '' : 'disabled'}>◀</button><b>${sf}</b><button class="btn small" data-action="startf" data-arg="1" ${si < so.length - 1 ? '' : 'disabled'}>▶</button></div>
      <div class="cond"><span class="grow">${ic('i_flag')} ${t('maxFloor')}</span><button class="btn small" data-action="maxf" data-arg="-5">−5</button><button class="btn small" data-action="maxf" data-arg="-1">◀</button><b>${mf}</b><button class="btn small" data-action="maxf" data-arg="1">▶</button><button class="btn small" data-action="maxf" data-arg="5">+5</button></div>
      <div class="cond"><span class="grow">${ic('i_hp')} ${t('condHp')}</span><button class="btn small" data-action="condHp" data-arg="-0.1" ${push ? 'disabled' : ''}>◀</button><b class="${push ? 'bad' : ''}">${push ? '0% · ' + t('condPush') : Math.round(Dn.hp * 100) + '%'}</b><button class="btn small" data-action="condHp" data-arg="0.1">▶</button></div>
      ${push ? `<div class="warn small pushwarn">${ic('i_skull')} ${t('pushWarn', { p: Math.round(G.T.deathChance(0.15) * 100) })}</div>` : ''}
      <div class="cond ${push ? 'off' : ''}"><span class="grow">${ic('i_skull')} ${t('condDown')}</span><button class="btn small ${Dn.down && !push ? 'primary' : ''}" data-action="condDown" ${off}>${Dn.down && !push ? t('yes') : t('no')}</button></div>
      <div class="cond ${push ? 'off' : ''}"><span class="grow">${ic('i_crown')} ${t('condBoss')}</span><button class="btn small ${Dn.boss && !push ? 'primary' : ''}" data-action="condBoss" ${off}>${Dn.boss && !push ? t('yes') : t('no')}</button></div>
      <div class="cond ${push ? 'off' : ''}"><span class="grow">${ic('i_boot')} ${t('condAvoid')}</span><span class="seg">${[0, 0.3, 0.5, 0.7].map((v) => `<button class="btn small ${(push ? !v : Dn.avoid === v) ? 'primary' : ''}" data-action="condAvoid" data-arg="${v}" ${off}>${v ? '< ' + v * 100 + '%' : t('never')}</button>`).join('')}</span></div>`, '', 'retreatHint');
    const hurt = !G.K.medic() && G.S.advs.some((a) => a.hp > 0 && a.hp < G.T.stats(a).hp);
    h += box(ic('i_flag') + ' ' + t('sendTitle') + ` <span class="muted">${UI.party.size}/${pmax}</span>`, (hurt ? `<div class="warn small">${ic('i_heal')} ${t('noMedicHint')}</div>` : '') +
      (idle.length ? `<div class="tiles">${idle.map((a) => advTile(a, 'pickParty', a.id, UI.party.has(a.id))).join('')}</div>` : `<div class="muted small">${G.S.advs.length ? t('noIdle') : t('guildEmpty')}</div>`)
      + `<button class="btn primary big" data-action="send" ${UI.party.size ? '' : 'disabled'}>${ic('i_flag')} ${t('sendParty')}</button>`, '', big);
    return h;
  }

  // фигурка героя в сцене похода
  const sceneFig = (a) => `<div class="fig ${a.hp <= 0 ? 'down' : ''}" title="${esc(nm(a.name))}">${ic('c_' + a.cls, 'ic3')}${bar('hp:' + a.id, 'hp')}</div>`;
  function expActive(e) {
    const ms = G.X.members(e);
    const fl = e.phase === 'ret' ? e.cleared : e.floor;
    const ph = { travel: t('phTravel', { f: e.floor }), enc: t('phEnc'), fight: t('phFight', { r: e.round }), after: t('phAfter'), ret: t('phRet') }[e.phase];
    const showFoe = e.enemy && (e.phase === 'enc' || e.phase === 'fight');
    let h = `<div class="scene ${e.phase === 'fight' ? 'fighting' : ''}" style="background-image:url(${G.SPR.dungeonBg(e.loc)})">
      <div class="sfloor">${t('floor')} <b>${fl}</b></div>
      <div class="party ${ms.length > 4 ? 'many' : ''}"><div class="prow back">${ms.filter((a) => !G.X.isFront(a.cls)).map(sceneFig).join('')}</div><div class="prow front">${ms.filter((a) => G.X.isFront(a.cls)).map(sceneFig).join('')}</div></div>
      ${showFoe ? `<div class="foe ${e.phase === 'fight' ? 'hitme' : ''}" ${e.phase === 'fight' ? `data-action="foeHit" data-arg="${e.id}" title="${esc(t('kingHitTip', { d: G.W.kingDmg() }))}"` : ''}>${ic(monSpr(e.enemy.key), 'ic4')}<div class="fn">${esc(nm(G.X.enemyName(e.enemy)))}</div>${bar('ehp:' + e.id, 'hp')}<div class="small" data-b="ehp:${e.id}"></div></div>` : `<div class="walk">${ic('i_flag', 'ic2')}<span>${ph}</span></div>`}
    </div>`;
    let body = `<div class="phase"><span class="hastip"${hint('hurryHint', t('hurryHint') + '<br>' + t('rowsHint'))}>${ph}<i class="qh">?</i></span>${e.phase === 'fight' ? ` <span class="muted small">· ${t('kingHitHint', { d: G.W.kingDmg() })}</span>` : ''}</div>`;
    if (e.phase === 'travel' || e.phase === 'ret') body += `${bar('exp:' + e.id)}<div class="muted small" data-b="expT:${e.id}"></div>`;
    if (e.phase === 'fight' || e.flog.length) body += `<div class="flog">${e.flog.map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div>`;
    const c = e.cond || X_COND();
    body += `<div class="kv small">${e.start > 1 ? t('startFloor') + ': <b>' + e.start + '</b> · ' : ''}${t('maxFloor')}: <b>${e.maxFloor}</b> · ${c.push ? `<b class="bad">${t('condPushShort')}</b>` : `${t('condHp')}: <b>${Math.round(c.hp * 100)}%</b>`}${c.down ? ' · ' + t('condDownShort') : ''}${c.boss ? ' · ' + t('condBossShort') : ''}${c.avoid ? ' · ' + t('condAvoidShort', { p: c.avoid * 100 }) : ''}</div>`;
    body += `<div class="kv">${ic('i_chest')} ${t('backpack')}: ${lootHtml(e.loot) || '—'}${e.items && e.items.length ? ` · ${e.items.map((it) => ic('it_' + it.type + ':' + it.ti)).join('')} ${t('itemsN', { n: e.items.length })}` : ''}</div>`;
    // кнопки на постоянных местах: «Поторопить» слева (в бою — неактивна), «Вернуть отряд» — справа, далеко от неё
    const walking = e.phase === 'travel' || e.phase === 'ret';
    body += '<div class="row xbtns">';
    body += `<button class="btn small primary" data-action="hurry" data-arg="${e.id}" ${walking ? '' : 'disabled'}>${ic('i_boot')} ${t('hurryBtn', { n: U.fmt1(G.X.hurrySec()) })}</button><span class="grow"></span>`;
    body += `<button class="btn small" data-action="recall" data-arg="${e.id}" ${e.recall || e.phase === 'ret' ? 'disabled' : ''}>${e.recall || e.phase === 'ret' ? t('recalling') : t('recall')}</button>`;
    body += '</div>';
    h += box('', body);
    h += box(ic('i_scroll') + ' ' + t('chronicle'), `<div class="xlog">${e.log.map((l) => `<div class="${l.c}">${fmtEntry(l)}</div>`).join('')}</div>`);
    return h;
  }

  // ---------- вкладка «Указы» ----------
  function decreePanel() {
    const S = G.S, dq = S.decree;
    // идущие стройки
    let h = box(ic('i_hammer') + ' ' + t('buildersNow') + ` <span class="muted">${S.cons.length}/${G.E.builders()}</span>`,
      (S.cons.length ? S.cons.map((c) => `<div class="job">${ic(bSprite(c.k), 'ic2')}<div class="grow"><div>${t('bn_' + c.k)} → ${G.E.lvl(c.k) + 1}</div>${bar('cons:' + c.k)}<div class="muted small" data-b="consT:${c.k}"></div></div><button class="btn small" data-action="cancelUp" data-arg="${c.k}" title="${esc(t('cancelRefund'))}">${ic('i_x')}</button></div>`).join('') : `<div class="muted small">${t('buildersIdle')}</div>`), '', 'decreeHint');
    // очередь строительства
    const qList = (q, nameKey, icon, extra) => (dq[q].length ? dq[q].map((x, i) => `<div class="dq" data-tip="${q === 'build' ? 'b' : 's'}:${x}">${ic(icon(x), 'ic2')}<div class="grow">${i + 1}. <b>${t(nameKey + x)}</b>${extra ? extra(x, i) : ''}</div><button class="btn small" data-action="decreeUp" data-arg="${q}|${i}" ${i ? '' : 'disabled'}>▲</button><button class="btn small" data-action="decreeDown" data-arg="${q}|${i}" ${i < dq[q].length - 1 ? '' : 'disabled'}>▼</button><button class="btn small" data-action="decreeDel" data-arg="${q}|${i}">${ic('i_x')}</button></div>`).join('') : `<div class="muted small">${t('decreeEmpty')}</div>`);
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
      // здание не может обогнать Замок: учитываем улучшения Замка выше по очереди
      const skip = (txt) => ` <span class="warn small" title="${t('skipHint')}">${ic('i_lock')} ${txt} · ${t('skipped')}</span>`;
      const wait = k !== 'castle' && L + 1 > fromLvl('castle', i) ? skip(t('needCastleShort', { l: L + 1 })) : !G.E.fits(c) ? skip(t('needStorageShort')) : '';
      return ` <span class="muted small">→ ${L + 1}</span>${wait}<div class="row">${costHtml(c)}<span class="muted small">${ic('i_clock')} ${U.fmtTime(G.E.timeAt(k, L))}</span></div>`;
    };
    const bq = qList('build', 'bn_', (x) => bSprite(x), buildInfo);
    h += box(ic('i_scroll') + ' ' + t('decreeBuild'), bq + (dq.build.length ? `<div class="dtotal">${t('decreeTotal')}: ${costHtml(total)}</div>` : ''));
    // добавить стройку
    h += box(ic('i_up') + ' ' + t('decreeAddBuild'), `<div class="dgrid">${D.ORDER.filter((k) => !D.B[k].noLevel).map((k) => {
      const L = G.E.lvl(k), why = G.E.whyNot(k);
      const max = L >= D.MAXLVL;
      return `<button class="dcard" data-action="decreeAdd" data-arg="${k}" data-tip="b:${k}" ${max ? 'disabled' : ''}>${ic(bSprite(k), 'ic2')}<span class="grow"><b>${t('bn_' + k)}</b><span class="small muted">${L ? t('lv') + ' ' + L : t('notBuilt')}${why === 'castle' ? ' · ' + t('needCastleShort', { l: L + 1 }) : why === 'storage' ? ' · ' + t('needStorageShort') : ''}</span></span>${max ? '' : ic('i_scroll')}</button>`;
    }).join('')}</div>`);
    // исследования
    const open = D.RESEARCH.filter((r) => !G.R.done(r.id) && !dq.research.includes(r.id) && G.R.state(r.id) !== 'cur');
    const resInfo = (id) => { const r = G.R.get(id); return `<div class="row">${costHtml(r.cost)}<span class="muted small">${ic('i_clock')} ${U.fmtTime(G.R.time(r))}</span>${G.PANE.resWait(id)}</div>`; };
    h += box(ic('i_book') + ' ' + t('decreeRes'), qList('research', 'rs_', (x) => G.R.get(x).icon, resInfo) +
      (G.E.lvl('academy') ? `<h4>${t('decreeAddRes')}</h4><div class="dgrid">${open.map((r) => `<button class="dcard" data-action="resQueue" data-arg="${r.id}" data-tip="s:${r.id}">${ic(r.icon, 'ic2')}<span class="grow"><b class="hastip">${t('rs_' + r.id)}<i class="qh">?</i></b>${G.R.state(r.id) === 'locked' ? `<span class="small muted">${t('needAcad', { l: r.acad })}</span>` : ''}${costHtml(r.cost)}</span>${ic('i_scroll')}</button>`).join('')}</div>` : `<div class="muted small">${t('needAcademy')}</div>`));
    return h;
  }

  // ---------- вкладка «Король» ----------
  function kingPanel() {
    const k = G.S.king, tp = G.K.tp();
    let h = `<div class="bhead">${ic('c_king', 'bimg')}<div><h2>${t('king')}</h2><div class="lvl">${tipTitle(`${t('lv')} <b>${k.lvl}</b> / ${D.KING_MAX}`, 'kingXpHow')}</div>${bar('kxp', 'xp')}<div class="muted small" data-b="kxpT"></div><div class="small">${t('talentPts')}: <b class="${tp ? 'good' : ''}">${tp}</b></div></div></div>`;
    h += box(ic('i_fire') + ' ' + t('spells'), D.SPELLS.map((sp) => {
      const open = k.lvl >= sp.lvl;
      return `<div class="spl ${open ? '' : 'locked'}" data-tip="sp:${sp.id}">${ic(sp.icon, 'ic2')}<div class="grow"><b class="hastip">${t('sp_' + sp.id)}<i class="qh">?</i></b> <span class="muted small">${sp.battle ? t('inBattle') : ''}</span><div class="muted small">${t('cooldown')}: ${U.fmtTime(G.K.spellCd(sp))}</div></div>${open ? `<button class="btn small" data-action="cast" data-arg="${sp.id}" data-spell="${sp.id}">${t('cast')} <span data-b="cd:${sp.id}"></span></button>` : `<span class="muted small">${ic('i_lock')} ${t('lv')} ${sp.lvl}</span>`}</div>`;
    }).join(''));
    const br = ['hand', 'eco', 'build', 'war'];
    h += box(ic('i_star') + ' ' + t('talents') + ` <span class="muted">${tp}</span>`, `<div class="tal3">${br.map((b) => `<div class="tcol"><div class="tbr">${t('br_' + b)}</div>${D.TALENTS.filter((x) => x.br === b).map((x) => {
      const r = k.tal[x.id] || 0, mx = G.K.talMax(x);
      // описание таланта — только в подсказке при наведении (имя с пунктиром и «?»)
      return `<div class="tal" data-tip="tl:${x.id}">${ic(x.icon, 'ic2')}<div class="grow"><b class="hastip">${t('tl_' + x.id)}<i class="qh">?</i></b>${pips(r, mx)}</div><button class="btn small" data-action="talent" data-arg="${x.id}" ${tp > 0 && r < mx ? '' : 'disabled'}>+</button></div>`;
    }).join('')}</div>`).join('')}</div>`);
    h += box(ic('i_people') + ' ' + t('council'), `<div class="advs">${D.ADVISORS.map((a) => {
      const l = G.K.advLvl(a.id), open = G.K.advOpen(a);
      return `<div class="advc ${open ? '' : 'locked'}" data-tip="ad:${a.id}">${ic('adv_' + a.id, 'ic3')}<div class="grow"><b class="hastip">${t('ad_' + a.id)}<i class="qh">?</i></b> ${pips(l, D.ADV_MAX)}
        ${!open ? `<div class="small">${ic('i_lock')} ${t('needCastleLvl', { l: a.castle })}</div>` : l >= D.ADV_MAX ? `<div class="small good">${t('maxLevel')}</div>` : `<div class="advact">${btn(l ? t('promote') : t('hireAdv'), 'advisor', a.id, { cost: G.K.advCost(a.id), cls: 'small' })}</div>`}</div></div>`;
    }).join('')}</div>`);
    const dyn = G.S.dyn;
    const LP = G.K.legacyParts();
    let dh = `<div class="small">${t('epoch')}: <b>${dyn.epoch + 1}</b> · ${esc(G.tn(G.K.land(dyn.epoch)))} · <span class="tipword" data-tip="dyn">${t('legacyPts')}</span>: <b>${dyn.pts}</b> · <span class="muted">${t('legacyGainNow', { n: LP.total })}</span></div>`;
    if (G.S.camp.won) dh += `<div class="row"${hint('abdicateHint', t('abdicateHint', { land: G.tn(G.K.land(dyn.epoch + 1)) }))}>${btn(ic('i_crown') + ' ' + t('abdicate', { n: G.K.legacyGain() }), 'abdicate', '', { cls: 'danger' })}<i class="qh">?</i></div>`;
    dh += `<div class="perks">${D.PERKS.map((p) => {
      const r = G.K.perkRank(p.id);
      const nextB = p.id === 'found' && r < D.FOUND_ORDER.length ? `<div class="small good">${t('foundNext', { b: t('bn_' + D.FOUND_ORDER[r]) })}</div>` : '';
      return `<div class="perk" data-tip="pk:${p.id}">${ic(p.icon, 'ic2')}<div class="grow"><b class="hastip">${t('pk_' + p.id)}<i class="qh">?</i></b> ${pips(Math.min(r, 10), D.PERK_MAX)}${nextB}</div><button class="btn small" data-action="perk" data-arg="${p.id}" ${dyn.pts >= G.K.perkCost(p.id) && r < D.PERK_MAX ? '' : 'disabled'}>${G.K.perkCost(p.id)} ${ic('i_crown')}</button></div>`;
    }).join('')}</div>`;
    h += box(`<span class="hastip" data-tip="dyn">${ic('i_crown')} ${t('dynasty')}<i class="qh">?</i></span>`, dh, 'dynbox');
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
    UI.dirty();
  };
  UI.confirm = function (text, yes) {
    UI._yes = yes;
    UI.modal(`<p>${text}</p><div class="right"><button class="btn" data-action="mclose">${t('no')}</button> <button class="btn danger" data-action="yes">${t('yes')}</button></div>`, 'confirm');
  };
  UI.openSettings = function () {
    UI.modal(`<h2>${t('settings')}</h2>
      ${box(t('language'), `<button class="btn" data-action="lang">${G.LANG === 'ru' ? 'English' : 'Русский'}</button> <button class="btn" data-action="sound">${ic(G.S.sound ? 'i_snd' : 'i_mute')} ${t('sound')}</button>`)}
      ${box(t('cityStyle'), `<div class="muted small">${t('cityStyleHint')}</div><div class="styles">${styleCards()}</div>`)}
      ${box(t('saveTitle'), `<div class="muted small">${t('saveHint')}</div><textarea id="save-text" rows="3" spellcheck="false"></textarea><div class="row"><button class="btn small" data-action="exportSave">${t('export')}</button><button class="btn small" data-action="importSave">${t('import')}</button><span id="save-msg" class="muted small"></span></div>`)}
      ${box(t('danger'), `<button class="btn danger" data-action="reset">${t('reset')}</button>`)}
      <div class="muted small">${t('about')}</div>
      <div class="right"><button class="btn" data-action="mclose">${t('close')}</button></div>`, 'settings');
  };
  // Облик города: мини-замок каждого стиля, выбранный подсвечен
  function styleCards() {
    const cur = G.SPR.style();
    const list = G.GOTH.STYLES.map((S) => [S.id, S.id + ' · ' + t('style_' + S.id)]).concat([['classic', t('style_classic')]]);
    return list.map(([id, name]) => {
      const src = id === 'classic' ? classicCastle() : G.GOTH.render('castle', id, 4).toDataURL();
      return `<button class="stylecard ${cur === id ? 'on' : ''}" data-action="setStyle" data-arg="${id}" aria-pressed="${cur === id}"><img src="${src}" alt=""><span>${esc(name)}</span></button>`;
    }).join('');
  }
  // классический замок рисуется без учёта текущего стиля
  function classicCastle() {
    const keep = G.S.style;
    G.S.style = 'classic';
    const u = G.SPR.url('b_castle:4');
    G.S.style = keep;
    return u;
  }
  UI.offlineReport = function (rep) {
    UI.modal(`<h2>${t('welcomeBack')}</h2><p>${t('awayFor', { t: U.fmtTime(rep.sec) })}</p>${box('', lootHtml(rep.gain) || t('nothing'))}<div class="right"><button class="btn primary" data-action="mclose">${t('ok')}</button></div>`, 'offline');
  };
  UI.epochStory = function () {
    const land = G.tn(G.K.land(G.S.dyn.epoch));
    const heroes = G.S.advs.map((a) => `<span style="color:${D.ARAR[a.rar].color}">${esc(nm(a.name))}</span> (${t('cl_' + a.cls)}, ★${a.prest || 0})`).join(', ');
    UI.modal(`<div class="story">${ic('i_crown', 'story-img')}<h2>${t('story_epoch', { land })}</h2><p>${t('storyd_epoch', { land })}</p><p>${heroes ? t('storyHeroes', { h: heroes }) : t('storyNoHeroes')}</p><p class="good">${t('storyLegacy', { n: G.S.dyn.pts })}</p></div><div class="right"><button class="btn primary" data-action="mclose">${t('ok')}</button></div>`, 'story');
    G.SFX.play('win');
  };
  UI.story = function (id) {
    UI.modal(`<div class="story">${ic(id === 'awake' ? 'm_dragon' : 'i_crown', 'story-img')}<h2>${t('story_' + id)}</h2><p>${t('storyd_' + id)}</p></div><div class="right"><button class="btn primary" data-action="mclose">${t('ok')}</button></div>`, 'story');
    G.SFX.play(id === 'awake' ? 'horn' : 'win');
  };

  // ---------- бой у ворот ----------
  // Кнопки скорости боя 1 | 2 | 3 | 4 (под названием, слева); что за скорость — в подсказке при наведении
  const speedBtns = () => `<span class="spdseg">${G.W.SPEEDS.map((v, i) => `<button class="btn small spd ${G.W.speed() === v ? 'on' : ''}" data-action="bspeed" data-arg="${v}"${hint('spd' + v, t(v === 1 ? 'speedTip1' : 'speedTip', { v, k: i + 1 }))}>${i + 1}</button>`).join('')}</span>`;
  UI.speedBtns = () => { for (const b of document.querySelectorAll('.spd')) b.classList.toggle('on', +b.dataset.arg === G.W.speed()); };
  UI.showBattle = function (on, mode) {
    $('#map').classList.toggle('hidden', on);
    $('#stage').classList.toggle('in-battle', on);
    const duel = mode === 'arena' || mode === 'journey';
    $('#stage').classList.toggle('arena-mode', on && duel);
    $('#stage').classList.toggle('duel-click', on && mode === 'journey');
    $('#battle').classList.toggle('hidden', !on);
    // в бою у ворот заклинания лежат строкой в чёрной полосе под полем, вне боя — на карте
    const sb = $('#spellbar');
    if (on && !duel) $('#bf-spells').appendChild(sb);
    else if (sb.parentElement.id === 'bf-spells') $('#stage').insertBefore(sb, $('#fx'));
    // Шапка: сверху название и полоса здоровья, под ней — кнопки. У каждой кнопки своё постоянное место:
    // кнопки действий слева (не исчезают, а становятся невидимыми), выход («К карте», «В город») — справа,
    // чтобы частые клики по «Пропустить»/«Ускорить» не попадали в выход, когда кнопка пропадает
    if (on && duel) {
      // Арена и Путешествие: «Пропустить» до конца боя; после — «Ускорить» (Арена) и «Следующий бой/этап»
      const jr = mode === 'journey';
      $('#battle-head').innerHTML = `<div class="bh-top"><b id="bh-wave"></b><span id="bh-left"></span><span class="gatelab">${ic('i_hp')}</span><div class="bar gatebar champbar"><i id="bh-gate"></i></div><span id="bh-gtxt"></span></div>
        <div class="bh-btns duel">${speedBtns()}<span class="bslot"><button class="btn small" id="bh-skip" data-action="askip" title="${esc(t('arenaSkip'))}"><span class="bln">${t('arenaSkip')} </span>▶▶</button>${jr ? '' : `<button class="btn small invis" id="bh-aboost" data-action="arenaBoost" title="${esc(t('arenaBoostShort', { n: U.fmt1(G.A.boostSec()) }))}">${ic('i_clock')}<span class="bln"> ${t('arenaBoostShort', { n: U.fmt1(G.A.boostSec()) })}</span></button>`}</span>
        <span class="grow"></span><button class="btn small primary invis" id="${jr ? 'bh-jnext' : 'bh-anext'}" data-action="${jr ? 'journeyNext' : 'arenaNext'}" disabled title="${esc(jr ? t('jrNext') : t('arenaNextBtn'))}">${jr ? `<span class="bln">${t('jrNext')} </span>▶` : `<span class="bln">${t('arenaNextBtn')}</span>`}</button>${jr ? `<button class="btn small invis" id="bh-map" data-action="journey" disabled title="${esc(t('jrToMap'))}">${ic('i_map')}<span class="bl"> ${t('jrToMap')}</span></button>` : ''}<button class="btn small" id="bh-city" data-action="bclose" disabled title="${esc(t('toCity'))}">${ic('i_tower')}<span class="bl"> ${t('toCity')}</span></button></div>`;
      const stn = t('ch_' + ((G.W.battle() || {}).stance || 'attack'));
      $('#bf-text').innerHTML = `<div class="hint">${mode === 'journey' ? t('jrLiveHint', { s: stn, d: G.W.kingDmg() }) : t('arenaLiveHint', { s: stn })}</div>`;
    } else if (on) {
      $('#battle-head').innerHTML = `<div class="bh-top"><b id="bh-wave"></b><span id="bh-left"></span><span class="gatelab">${ic('i_def')}</span><div class="bar gatebar"><i id="bh-gate"></i></div><span id="bh-gtxt"></span></div>
        <div class="bh-btns">${speedBtns()}<span class="grow"></span><button class="btn small primary" id="bh-next" data-action="bnext" disabled>${t('nextWave')} ▶</button><button class="btn small" id="bh-city" data-action="bclose" disabled title="${esc(t('toCity'))}">${ic('i_tower')}<span class="bl"> ${t('toCity')}</span></button></div>`;
      $('#bf-text').innerHTML = `<div class="hint">${t('battleHint', { d: G.W.kingDmg() })}</div>`;
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
  UI.duelHud = function (B) {
    const w = $('#bh-wave');
    if (!w) return;
    const m = B.mons[0];
    if (w.textContent !== B.title) w.textContent = B.title;
    $('#bh-left').textContent = B.cname + (B.ri >= 0 && B.state === 'run' ? ' · ' + t('arenaRound', { n: Math.min(B.ri + 1, B.tl.length) }) : '');
    $('#bh-gate').style.width = (m ? (Math.max(0, m.hp) / m.max) * 100 : 0).toFixed(1) + '%';
    $('#bh-gtxt').textContent = m ? U.fmt(Math.max(0, Math.ceil(m.hp))) + '/' + U.fmt(m.max) : '';
  };
  // Итог поединка: Арена — «Ускорить» и «Следующий бой» (загорается после подготовки);
  // Путешествие — «К карте» и «Следующий этап»
  UI.duelResult = function (B, r) {
    const sk = $('#bh-skip');
    if (sk) { sk.classList.add('invis'); sk.disabled = true; }
    $('#bh-city').disabled = false;
    if (B.mode === 'journey') {
      const h = r.win
        ? `<b class="res-win">${t('jrWonTitle', { s: r.s })}</b><div>${lootHtml(r.loot)}${r.item ? ' · ' + t('jrItem', { item: fmtEntry({ k: 'xItemShort', p: { item: G.F.nameObj(r.item) } }) }) : ''} · ${t('arenaXp', { n: r.xp })}${r.wounded ? ' · ' + t('jrRest', { n: r.wounded }) : ''}</div>`
        : `<b class="res-lose">${t('jrLostTitle', { s: r.s })}</b><div>${r.wounded ? t('jrRest', { n: r.wounded }) + ' · ' : ''}<span class="muted">${t('jrLostHint')}</span></div>`;
      $('#bf-text').innerHTML = `<div class="bres">${h}</div>`;
      const mp = $('#bh-map'), jn = $('#bh-jnext');
      if (mp) { mp.classList.remove('invis'); mp.disabled = false; }
      if (jn && r.win) { jn.classList.remove('invis'); jn.disabled = false; }
      return;
    }
    const an = $('#bh-anext');
    if (an) an.classList.remove('invis');
    UI.arenaResult(r);
  };
  UI.arenaResult = function (r) {
    const h = r.win
      ? `<b class="res-win">${t('arenaWonTitle', { r: r.rank })}</b><div>${lootHtml(r.loot)} · ${t('arenaXp', { n: r.xp })}${r.wounded ? ' · ' + t('arenaRest', { n: r.wounded }) : ''} · <span class="muted">${t('arenaNextIn', { t: U.fmtTime(G.S.arena.cd) })}</span></div>`
      : `<b class="res-lose">${t('arenaLostTitle', { r: r.rank })}</b><div>${r.wounded ? t('arenaRest', { n: r.wounded }) + ' · ' : ''}<span class="muted">${t('arenaNextIn', { t: U.fmtTime(G.S.arena.cd) })}</span></div>`;
    $('#bf-text').innerHTML = `<div class="bres">${h}</div>`;
  };
  // кнопки окна Арены после боя: следующий бой ждёт конца подготовки и свободных бойцов
  function refreshDuelButtons() {
    const an = $('#bh-anext');
    if (an) {
      const why = G.A.whyNot();
      an.disabled = !!why;
      const nb = `<span class="bln">${t('arenaNextBtn')} </span>`;
      const lab = why === 'cd' ? nb + '▶ ' + U.fmtTime(G.S.arena.cd) : why === 'team' ? `${ic('i_lock')}<span class="bln"> ${t('arenaNoTeam')}</span>` : why ? nb + '▶' : nb + '▶';
      if (an._l !== lab) { an.innerHTML = lab; an._l = lab; }
      const ab = $('#bh-aboost');
      if (ab) { const off = !(G.S.arena.cd > 0); ab.classList.toggle('invis', off); ab.disabled = off; }
    }
  }
  UI.battleResult = function (r) {
    let h;
    if (r.win) h = `<b class="res-win">${r.final ? t('finalVictory') : t('victory')}</b><div>${lootHtml({ gold: r.gold, bone: r.bone })} · ${t('xpEach', { n: r.xp })}${r.wounded ? ' · ' + t('woundedN', { n: r.wounded }) : ''}</div>`;
    else h = `<b class="res-lose">${t('defeat')}</b><div>${t('plundered')}: ${lootHtml(r.lost) || '—'}${r.broken ? ' · ' + t('brokenB', { b: t('bn_' + r.broken) }) : ''}${r.dead.length ? ' · ' + t('deadN', { names: r.dead.map((n) => esc(nm(n))).join(', ') }) : ''}</div>`;
    $('#bf-text').innerHTML = `<div class="bres">${h}</div>`;
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
    bar.innerHTML = shown.map((r) => `<div class="res" data-tip="r:${r}">${ic('r_' + r)}<div class="rcol"><div><span class="rv" data-b="res:${r}"></span><span class="rc" data-b="cap:${r}"></span></div><div class="rline"><div class="rbar"><i data-w="store:${r}"></i></div><span class="rr" data-b="rate:${r}"></span></div></div></div>`).join('');
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
    expT: (id) => { const e = G.X.get(id); return e ? U.fmtTime(e.t) : ''; },
    ehp: (id) => { const e = G.X.get(id); return e && e.enemy ? U.fmt(Math.max(0, e.phase === 'fight' ? e.ehp : e.enemy.hp)) + '/' + U.fmt(e.enemy.max) : ''; },
    rschT: (id) => { const c = id ? G.R.cur(id) : G.R.active()[0]; return c ? U.fmtTime(c.t) + (G.E.busy('academy') ? ' · ' + t('paused') : '') : ''; },
    folk: () => G.E.folk() + '/' + G.E.homes(),
    tavT: () => U.fmtTime(Math.max(0, G.S.tavern.t)),
    gp: (id) => { const p = G.E.goalProg(G.E.goalById(id)); return p ? U.fmt(p.cur) + ' / ' + U.fmt(p.n) : ''; },
    arenaT: () => (G.S.arena.cd > 0 ? U.fmtTime(G.S.arena.cd) + (G.E.busy('arena') ? ' · ' + t('paused') : '') : t('arenaReady')),
    folkR: () => { const v = G.E.folkTax() * (1 + G.bonus('tax')); return v ? '+' + U.fmt1(v) : ''; },
    cd: (id) => { const v = G.S.king.cd[id] || 0; const b = id === 'rush' ? G.S.king.buff.rush : id === 'rallyS' ? G.S.king.buff.rally : 0; return b > 0 ? U.fmtTime(b) : v > 0 ? U.fmtTime(v) : ''; },
    klvl: () => String(G.S.king.lvl),
    kxpT: () => U.fmt(G.S.king.xp) + ' / ' + U.fmt(G.K.need()),
  };
  const BAR = {
    store: (r) => (G.E.noCap() ? 1 : (G.S.res[r] || 0) / G.E.cap(r)),
    cons: (k) => { const c = G.E.consOf(k); return c ? 1 - c.t / c.total : 0; },
    forge: () => { const j = G.S.forge.q[0]; return j ? 1 - j.t / j.total : 0; },
    hp: (id) => { const a = G.T.get(id); return a ? a.hp / G.T.stats(a).hp : 0; },
    exp: (id) => { const e = G.X.get(id); return e && e.tt ? 1 - e.t / e.tt : 0; },
    hpp: (id) => { const e = G.X.get(id); return e ? G.X.hpRatio(e) : 0; },
    ehp: (id) => { const e = G.X.get(id); return e && e.enemy ? (e.phase === 'fight' ? e.ehp : e.enemy.hp) / e.enemy.max : 0; },
    rsch: (id) => { const c = id ? G.R.cur(id) : G.R.active()[0]; return c ? 1 - c.t / c.total : 0; },
    folkW: () => (G.E.homes() ? G.E.folk() / G.E.homes() : 0),
    kxp: () => G.S.king.xp / G.K.need(),
    gp: (id) => { const p = G.E.goalProg(G.E.goalById(id)); return p ? p.cur / p.n : 0; },
  };

  // Подсказка цели вверху окна здания или вкладки, к которой цель ведёт
  function goalNote(k, tab) {
    const g = G.E.goalFocus(UI.focusGoal);
    const h = (g && g.h) || {};
    if (!g || (tab ? h.tab !== tab : !h.b || h.tab || h.b !== k)) return '';
    return `<div class="goal-note">${ic('i_star')} <span><b>${t('goalLabel')}:</b> ${t(g.t)}${g.v ? ` <b class="gprog" data-b="gp:${g.id}"></b>` : ''} <span class="muted small">${t('goalNoteHint')}</span></span></div>`;
  }

  // Клик по цели: открыть нужное здание или вкладку и мигнуть тем, что нажать
  UI.goGoal = function (id) {
    const g = (id && G.E.goalById(id)) || G.E.goalFocus(UI.focusGoal);
    if (!g) { ACT.goals(); return; }
    UI.focusGoal = g.id;
    const h = g.h || {};
    if (UI.win && UI.win !== 'decision') UI.closeModal();
    if (h.tab) { UI.tab = h.tab; UI.pick = null; }
    if (h.b && h.b !== 'dungeon') UI.pop = h.b;
    hideTip();
    UI.slotsDirty = true;
    G.SFX.play('click');
    UI.render();
    const scope = h.tab ? '#panel' : '#bpop';
    const el = $(`${scope} .goal-hl`) || $('.goal-hl:not(.slot)') || $(`${scope} .goal-note`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.remove('goal-flash');
      void el.offsetWidth;
      el.classList.add('goal-flash');
      setTimeout(() => el.classList.remove('goal-flash'), 1800);
    }
    const slot = h.b && $(`.slot[data-k="${h.b}"]`);
    if (slot) { slot.classList.remove('goal-ping'); void slot.offsetWidth; slot.classList.add('goal-ping'); setTimeout(() => slot.classList.remove('goal-ping'), 1800); }
  };

  // Подсветка следующей цели: здание на карте, нужная вкладка, кнопка в меню построек и кнопка действия
  function applyGoal() {
    const g = G.E.goalFocus(UI.focusGoal);
    const h = (g && g.h) || {};
    const want = new Set();
    const add = (sel) => { for (const el of $$(sel)) want.add(el); };
    const tabShown = h.tab && UI.tab === h.tab;
    if (h.b && UI.pop !== h.b && !tabShown) add(`.slot[data-k="${h.b}"]`);
    if (h.tab && !tabShown) add(`.tab[data-arg="${h.tab}"]`);
    if (h.el) add(h.el);
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
    if (UI._d && !UI.pdown) { UI.render(); UI._dx = false; }
    else if (UI._dx && !UI.pdown) {
      UI._dx = false;
      if (UI.tab === 'exp') {
        const p = $('#panel'), st = p.scrollTop;
        p.innerHTML = goalNote(null, 'exp') + PANEL.exp();
        p.scrollTop = st;
      }
      renderTabs();
    }
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
    for (const b of $$('[data-spell]')) {
      b.disabled = !G.K.ready(b.dataset.spell);
      b.classList.toggle('active', (b.dataset.spell === 'rush' && G.S.king.buff.rush > 0) || (b.dataset.spell === 'rallyS' && G.S.king.buff.rally > 0));
    }
    $('#rush-ind').classList.toggle('hidden', !(G.S.king.buff.rush > 0));
    updateBadges();
    refreshDuelButtons();
    applyGoal();
    renderTip();
    renderGtip();
  };
})();
