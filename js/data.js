// Все числа и описания игрового мира. Тексты — в i18n.js по ключам.
(function () {
  const D = (G.D = {});

  D.RES = ['gold', 'wood', 'stone', 'iron', 'bone', 'crystal', 'mithril'];
  D.MAT = ['wood', 'stone', 'iron', 'bone', 'crystal', 'mithril'];

  // ---------- уровни и стройка ----------
  D.MAXLVL = 8;
  // Лимит склада по уровню склада (0 — склада ещё нет)
  D.CAPS = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];
  D.goldCap = (L) => 250 * Math.pow(2, L); // 1 ур. — 500, 2 ур. — 1000 и т. д.
  D.LVLMULT = [1, 2, 4, 8, 16, 32, 64, 128]; // множитель цены перехода L -> L+1
  D.buildTime = (L) => 20 * Math.pow(2, L); // секунды на переход L -> L+1
  D.WORKERS = [0, 1, 2, 3, 4, 6, 8, 10, 12]; // мест для рабочих по уровню

  // ---------- карта города 384×300: замок в центре, постройки по кругу ----------
  D.MAP = { w: 384, h: 320, cx: 192, cy: 136, rx: 132, ry: 84, wrx: 182, wry: 124, wcy: 138 };
  D.B = {
    // В начале есть только замок. Первой строится лесопилка: золото с замка + 10 стартового дерева.
    // цена Замка помещается на Склад того же уровня: Склад не может обогнать Замок
    castle: { base: { gold: 150, wood: 90, stone: 90 }, click: 'gold', size: 64, start: 1 },
    academy: { base: { gold: 200, wood: 100, stone: 100 }, ang: -90 },
    barracks: { base: { gold: 120, wood: 80, stone: 90, iron: 30 }, ang: -50 },
    market: { base: { gold: 100, wood: 90, stone: 60 }, ang: -10 },
    forge: { base: { gold: 100, wood: 60, stone: 80, iron: 20 }, ang: 30 },
    warehouse: { base: { gold: 40, wood: 60, stone: 40 }, ang: 70 },
    tavern: { base: { gold: 150, wood: 100, stone: 60 }, ang: 110 },
    mine: { base: { gold: 80, wood: 60, stone: 50 }, ang: 150, click: 'iron', prod: 'iron' },
    quarry: { base: { gold: 30, wood: 25 }, ang: 190, click: 'stone', prod: 'stone' },
    lumber: { base: { gold: 25, wood: 10 }, ang: 230, click: 'wood', prod: 'wood' },
    gate: { base: { gold: 80, wood: 60, stone: 150 }, x: 192, y: 258, size: 48 },
    dungeon: { noLevel: true, x: 334, y: 284 },
  };
  for (const k in D.B) {
    const b = D.B[k];
    b.size = b.size || 48;
    if (k === 'castle') { b.x = D.MAP.cx; b.y = D.MAP.cy; }
    else if (b.ang !== undefined) {
      const a = (b.ang * Math.PI) / 180;
      b.x = Math.round(D.MAP.cx + D.MAP.rx * Math.cos(a));
      b.y = Math.round(D.MAP.cy + D.MAP.ry * Math.sin(a));
    }
  }
  D.ORDER = ['castle', 'lumber', 'quarry', 'mine', 'warehouse', 'market', 'forge', 'tavern', 'barracks', 'academy', 'gate', 'dungeon'];
  D.PROD = ['lumber', 'quarry', 'mine'];

  // ---------- авантюристы ----------
  D.CLS = {
    warrior: { hp: 60, atk: 6, def: 4, ghp: 12, gatk: 1.3, gdef: 1.0, weapon: 'sword' },
    archer: { hp: 40, atk: 8, def: 2, ghp: 7, gatk: 1.8, gdef: 0.5, weapon: 'bow' },
    mage: { hp: 32, atk: 10, def: 1, ghp: 5, gatk: 2.3, gdef: 0.4, weapon: 'staff' },
    priest: { hp: 45, atk: 5, def: 3, ghp: 8, gatk: 1.1, gdef: 0.8, weapon: 'mace' },
    // Разбойник: кинжалы, врождённые крит и уклонение
    rogue: { hp: 38, atk: 8, def: 2, ghp: 6.5, gatk: 1.9, gdef: 0.5, weapon: 'dagger', crit: 0.15, dodge: 0.1 },
    // Шаман: сковывает врагов — в подземелье враг пропускает ход, у ворот замирает
    shaman: { hp: 48, atk: 6, def: 3, ghp: 9, gatk: 1.3, gdef: 0.8, weapon: 'totem', stun: 0.15 },
  };
  // Редкость наёмников; tav — с какого уровня таверны появляется
  D.ARAR = [
    { mult: 1, cost: 40, color: '#d8d8d8', w: 70, tav: 1 },
    { mult: 1.35, cost: 160, color: '#5ec85e', w: 24, tav: 2 },
    { mult: 1.8, cost: 550, color: '#b45cff', w: 5, tav: 4 },
    { mult: 2.5, cost: 1800, color: '#ff9a3c', w: 1, tav: 6 },
  ];

  // Навыки по классам: у каждого класса атака, защита, лечение, добыча и особый навык; до 3 рангов
  D.SKILL_MAX = 3;
  D.SKILL_CATS = { atk: 'i_atk', def: 'i_def', heal: 'i_heal', loot: 'i_chest', spec: 'i_star' };
  D.SKILLS = {
    warrior: [
      { id: 'w1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.12 } },
      { id: 'w2', cat: 'def', icon: 'i_def', eff: { def: 0.15, hp: 0.05 } },
      { id: 'w3', cat: 'heal', icon: 'i_heal', eff: { regen: 0.03 } },
      { id: 'w4', cat: 'loot', icon: 'i_chest', eff: { loot: 0.06 } },
      { id: 'w5', cat: 'spec', icon: 'i_shield2', eff: { guard: 0.05 } },
    ],
    archer: [
      { id: 'a1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.1, crit: 0.05 } },
      { id: 'a2', cat: 'def', icon: 'i_boot', eff: { dodge: 0.06 } },
      { id: 'a3', cat: 'heal', icon: 'i_heal', eff: { regen: 0.02, hp: 0.05 } },
      { id: 'a4', cat: 'loot', icon: 'i_chest', eff: { drop: 0.15, flee: 0.05 } },
      { id: 'a5', cat: 'spec', icon: 'it_bow:0', eff: { volley: 0.12 } },
    ],
    mage: [
      { id: 'm1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.12 } },
      { id: 'm2', cat: 'def', icon: 'i_def', eff: { def: 0.15, hp: 0.08 } },
      { id: 'm3', cat: 'heal', icon: 'i_heal', eff: { aura: 0.015 } },
      { id: 'm4', cat: 'loot', icon: 'r_crystal', eff: { loot: 0.08 } },
      { id: 'm5', cat: 'spec', icon: 'i_fire', eff: { splash: 0.2 } },
    ],
    priest: [
      { id: 'p1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.12 } },
      { id: 'p2', cat: 'def', icon: 'i_shield2', eff: { partyDef: 0.08 } },
      { id: 'p3', cat: 'heal', icon: 'i_heal', eff: { heal: 0.2 } },
      { id: 'p4', cat: 'loot', icon: 'i_gem', eff: { drop: 0.15, loot: 0.04 } },
      { id: 'p5', cat: 'spec', icon: 'i_star', eff: { save: 0.1 } },
    ],
    rogue: [
      { id: 'r1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.1, crit: 0.05 } },
      { id: 'r2', cat: 'def', icon: 'i_boot', eff: { dodge: 0.07 } },
      { id: 'r3', cat: 'heal', icon: 'i_heal', eff: { regen: 0.025 } },
      { id: 'r4', cat: 'loot', icon: 'i_bag', eff: { loot: 0.08, drop: 0.1 } },
      { id: 'r5', cat: 'spec', icon: 'it_dagger:0', eff: { critDmg: 0.5 } },
    ],
    shaman: [
      { id: 's1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.12 } },
      { id: 's2', cat: 'def', icon: 'i_def', eff: { def: 0.15, hp: 0.06 } },
      { id: 's3', cat: 'heal', icon: 'i_heal', eff: { aura: 0.012 } },
      { id: 's4', cat: 'loot', icon: 'i_gem', eff: { drop: 0.1, loot: 0.05 } },
      { id: 's5', cat: 'spec', icon: 'it_totem:0', eff: { stun: 0.06 } },
    ],
  };

  // ---------- предметы ----------
  D.ITYPES = {
    sword: { g: 'm', slot: 'weapon', cls: 'warrior', mod: 1.0 },
    bow: { g: 'm', slot: 'weapon', cls: 'archer', mod: 1.05 },
    staff: { g: 'm', slot: 'weapon', cls: 'mage', mod: 1.15 },
    mace: { g: 'f', slot: 'weapon', cls: 'priest', mod: 0.85 },
    dagger: { g: 'm', slot: 'weapon', cls: 'rogue', mod: 0.9 },
    totem: { g: 'm', slot: 'weapon', cls: 'shaman', mod: 0.95 },
    armor: { g: 'f', slot: 'armor', cls: null, mod: 1 },
  };
  D.TIERS = [
    { adj: { m: 'железный', f: 'железная', en: 'Iron' }, req: 1, atk: 5, def: 3, hp: 15, time: 15, wcost: { iron: 12, wood: 8 }, acost: { iron: 16, wood: 6 } },
    { adj: { m: 'костяной', f: 'костяная', en: 'Bone' }, req: 3, atk: 12, def: 7, hp: 40, time: 40, wcost: { iron: 40, wood: 20, bone: 15 }, acost: { iron: 50, bone: 20 } },
    { adj: { m: 'мифриловый', f: 'мифриловая', en: 'Mithril' }, req: 5, atk: 28, def: 15, hp: 90, time: 90, wcost: { iron: 80, mithril: 10, crystal: 8 }, acost: { iron: 100, mithril: 12, crystal: 6 } },
    { adj: { m: 'драконий', f: 'драконья', en: 'Dragon' }, req: 7, atk: 55, def: 28, hp: 170, time: 180, wcost: { mithril: 30, crystal: 25, bone: 60 }, acost: { mithril: 35, crystal: 20, bone: 80 } },
  ];
  // Редкость предметов; forge — с какого уровня кузницы может выпасть
  D.IRAR = [
    { adj: { m: '', f: '', en: '' }, mult: 1, aff: 0, color: '#d8d8d8', w: 62, forge: 1 },
    { adj: { m: 'Добротный', f: 'Добротная', en: 'Fine' }, mult: 1.25, aff: 0, color: '#5ec85e', w: 25, forge: 2 },
    { adj: { m: 'Редкий', f: 'Редкая', en: 'Rare' }, mult: 1.6, aff: 1, color: '#4a9bff', w: 9, forge: 3 },
    { adj: { m: 'Эпический', f: 'Эпическая', en: 'Epic' }, mult: 2.1, aff: 2, color: '#b45cff', w: 3.3, forge: 5 },
    { adj: { m: 'Легендарный', f: 'Легендарная', en: 'Legendary' }, mult: 3, aff: 3, color: '#ff9a3c', w: 0.7, forge: 7 },
  ];
  D.ENCH_MAX = 5;
  D.EPITHETS = [
    ['«Гнев Севера»', '"Wrath of the North"'], ['«Последний рассвет»', '"Last Dawn"'], ['«Шёпот бури»', '"Stormwhisper"'],
    ['«Клятва короля»', '"King\'s Oath"'], ['«Пожиратель теней»', '"Shadoweater"'], ['«Сердце горы»', '"Heart of the Mountain"'],
    ['«Зубы дракона»', '"Dragon\'s Teeth"'], ['«Вечная стража»', '"Eternal Watch"'],
  ];

  // ---------- монстры ----------
  D.MON = {
    slime: { hp: 10, atk: 2, spd: 18, gold: 1 },
    goblin: { hp: 16, atk: 3, spd: 26, gold: 1.5 },
    wolf: { hp: 14, atk: 4, spd: 40, gold: 1.5 },
    skeleton: { hp: 32, atk: 5, spd: 16, gold: 2.5 },
    orc: { hp: 70, atk: 9, spd: 14, gold: 4 },
    spider: { hp: 20, atk: 4, spd: 30, gold: 2 },
    bat: { hp: 12, atk: 3, spd: 45, gold: 1.5 },
    drowned: { hp: 40, atk: 6, spd: 13, gold: 3 },
    troll: { hp: 300, atk: 18, spd: 10, gold: 25, boss: true },
    lich: { hp: 400, atk: 22, spd: 9, gold: 40, boss: true },
    golem: { hp: 500, atk: 20, spd: 8, gold: 50, boss: true },
    guardian: { hp: 700, atk: 28, spd: 8, gold: 80, boss: true, spr: 'm_golem:r' },
    dragon: { hp: 2500, atk: 45, spd: 9, gold: 1000, boss: true },
  };

  D.NAMES = [
    ['Бран', 'Bran'], ['Эйра', 'Eira'], ['Торвальд', 'Torvald'], ['Лиана', 'Liana'], ['Гаррик', 'Garrick'],
    ['Мира', 'Mira'], ['Освин', 'Oswin'], ['Ингрид', 'Ingrid'], ['Корвин', 'Corvin'], ['Селена', 'Selena'],
    ['Ульф', 'Ulf'], ['Ровена', 'Rowena'], ['Дарен', 'Daren'], ['Ивейн', 'Ivain'], ['Хельга', 'Helga'],
    ['Тиберий', 'Tiberius'], ['Астрид', 'Astrid'], ['Бьорн', 'Bjorn'], ['Элоди', 'Elodie'], ['Кай', 'Kai'],
    ['Ферин', 'Ferin'], ['Ярослава', 'Yaroslava'], ['Ратибор', 'Ratibor'], ['Велимир', 'Velimir'],
    ['Агата', 'Agatha'], ['Лоран', 'Loran'], ['Сигрун', 'Sigrun'], ['Эрих', 'Erich'], ['Нора', 'Nora'], ['Ведана', 'Vedana'],
  ];
  D.ADV_EPI = [
    ['Гроза орков', 'Orcbane'], ['из Северных гор', 'of the North Hills'], ['Драконоборец', 'Dragonslayer'],
    ['Неукротимое Пламя', 'the Untamed Flame'], ['Хранитель Рассвета', 'Dawnkeeper'], ['Тень Леса', 'Shadow of the Wood'],
  ];

  // ---------- король ----------
  D.KING_MAX = 30;
  D.kingXp = (L) => Math.round(60 * Math.pow(1.6, L - 1));
  // Таланты короля: упор на автоматизацию. max — предел рангов таланта.
  D.TAL_MAX = 5;
  D.TALENTS = [
    { id: 'pick', br: 'hand', icon: 'i_pick', eff: { gather: 0.2 } },
    { id: 'strike', br: 'hand', icon: 'i_atk', eff: { click: 0.2 } },
    { id: 'lucky', br: 'hand', icon: 'i_star', eff: { clickCrit: 0.04 } },
    { id: 'example', br: 'hand', icon: 'i_crown', eff: { clickProd: 1 } },
    { id: 'steward', br: 'eco', icon: 'i_pick', eff: { prod: 0.08 } },
    { id: 'crews', br: 'eco', icon: 'i_people', max: 3, eff: { crews: 1 } },
    { id: 'tax', br: 'eco', icon: 'r_gold', eff: { tax: 0.1 } },
    { id: 'agent', br: 'eco', icon: 'i_scale', max: 3, eff: { agent: 1, trade: 0.1 } },
    { id: 'arch', br: 'build', icon: 'i_clock', eff: { buildT: 0.08 } },
    { id: 'foreman', br: 'build', icon: 'i_hammer', eff: { boost: 1 } },
    { id: 'thrift', br: 'build', icon: 'r_stone', eff: { buildC: 0.04 } },
    { id: 'store', br: 'build', icon: 'i_bag', eff: { store: 0.1 } },
    { id: 'rally', br: 'war', icon: 'i_flag', eff: { defAtk: 0.05 } },
    { id: 'walls', br: 'war', icon: 'i_def', eff: { gateHp: 0.1 } },
    { id: 'captain', br: 'war', icon: 'i_map', eff: { captain: 0.06 } },
    { id: 'medic', br: 'war', icon: 'i_heal', eff: { medic: 0.2 } },
  ];
  D.SPELLS = [
    { id: 'rush', lvl: 2, cd: 300, dur: 60, icon: 'i_coin' },
    { id: 'meteor', lvl: 3, cd: 90, battle: true, icon: 'i_fire' },
    { id: 'heal', lvl: 5, cd: 120, battle: true, icon: 'i_heal' },
    { id: 'rallyS', lvl: 7, cd: 180, dur: 20, battle: true, icon: 'i_flag' },
  ];
  D.ADV_MAX = 5;
  D.ADVISORS = [
    { id: 'treasurer', castle: 2, icon: 'r_gold', eff: { tax: 0.1 } },
    { id: 'marshal', castle: 3, icon: 'i_helmet', eff: { defAtk: 0.06, gateHp: 0.06 } },
    { id: 'builder', castle: 3, icon: 'i_hammer', eff: { buildT: 0.06 } },
    { id: 'magister', castle: 4, icon: 'i_book', eff: { spellCd: 0.08, luck: 0.04 } },
  ];
  D.advisorCost = (lvl) => ({ gold: Math.round(250 * Math.pow(2.4, lvl)) });

  // ---------- исследования (академия) ----------
  D.RESEARCH = [
    { id: 'tools', acad: 1, icon: 'i_pick', cost: { gold: 120, wood: 80 }, t: 60, eff: { prod: 0.15 } },
    { id: 'logging', acad: 1, icon: 'r_wood', cost: { gold: 100, stone: 60 }, t: 60, eff: { prod_wood: 0.25 } },
    { id: 'masonry', acad: 1, icon: 'r_stone', cost: { gold: 100, wood: 60 }, t: 60, eff: { prod_stone: 0.25 } },
    { id: 'mining', acad: 2, req: 'tools', icon: 'r_iron', cost: { gold: 200, wood: 150, stone: 100 }, t: 150, eff: { prod_iron: 0.25 } },
    { id: 'builders', acad: 2, icon: 'i_hammer', cost: { gold: 300, wood: 250, stone: 250 }, t: 240, eff: { builders: 1 } },
    { id: 'bows', acad: 2, icon: 'it_bow:0', cost: { gold: 250, wood: 200, iron: 80 }, t: 200, eff: { guardAtk: 0.25 } },
    { id: 'gates', acad: 3, icon: 'i_def', cost: { gold: 400, stone: 500, iron: 150 }, t: 360, eff: { gateHp: 0.25 } },
    { id: 'workshop', acad: 3, req: 'mining', icon: 'i_anvil', cost: { gold: 500, iron: 300, wood: 200 }, t: 420, eff: { forgeQ: 1, craft: 0.2 } },
    { id: 'runes', acad: 3, icon: 'i_gem', cost: { gold: 600, crystal: 20, stone: 300 }, t: 480, eff: { enchant: 1 } },
    { id: 'maps', acad: 3, icon: 'i_map', cost: { gold: 500, wood: 300, bone: 20 }, t: 480, eff: { loc_mine: 1 } },
    { id: 'medicine', acad: 4, icon: 'i_heal', cost: { gold: 800, bone: 40, crystal: 15 }, t: 600, eff: { recover: 1, save: 0.1 } },
    { id: 'guild', acad: 4, icon: 'i_scale', cost: { gold: 1000, wood: 600, stone: 600 }, t: 600, eff: { trade: 0.15 } },
    { id: 'storage', acad: 5, icon: 'i_bag', cost: { gold: 1500, wood: 1200, stone: 1200 }, t: 900, eff: { store: 0.25 } },
    { id: 'guard', acad: 5, req: 'bows', icon: 'i_helmet', cost: { gold: 1500, iron: 800 }, t: 900, eff: { guards: 3 } },
    { id: 'builders2', acad: 6, req: 'builders', icon: 'i_hammer', cost: { gold: 3000, wood: 3000, stone: 3000 }, t: 1200, eff: { builders: 1 } },
    { id: 'dragon', acad: 6, req: 'maps', icon: 'i_dragon', cost: { gold: 4000, mithril: 40, crystal: 60 }, t: 1500, eff: { loc_lair: 1 } },
    // навыки зданий: по два на каждое здание, изучаются в Академии
    { id: 'mint', b: 'castle', acad: 2, icon: 'r_gold', cost: { gold: 300, stone: 200 }, t: 200, eff: { tax: 0.2 } },
    { id: 'treasury', b: 'castle', acad: 4, icon: 'i_chest', cost: { gold: 900, stone: 600, iron: 200 }, t: 600, eff: { goldCap: 0.3 } },
    { id: 'axes', b: 'lumber', acad: 1, icon: 'i_pick', cost: { gold: 80, wood: 60 }, t: 50, eff: { gather_wood: 0.5 } },
    { id: 'sawmill', b: 'lumber', acad: 3, req: 'logging', icon: 'i_people', cost: { gold: 500, wood: 400, iron: 100 }, t: 420, eff: { crews_lumber: 1 } },
    { id: 'chisels', b: 'quarry', acad: 1, icon: 'i_pick', cost: { gold: 80, stone: 60 }, t: 50, eff: { gather_stone: 0.5 } },
    { id: 'quarrycrew', b: 'quarry', acad: 3, req: 'masonry', icon: 'i_people', cost: { gold: 500, stone: 400, iron: 100 }, t: 420, eff: { crews_quarry: 1 } },
    { id: 'picks', b: 'mine', acad: 2, icon: 'i_pick', cost: { gold: 200, iron: 80 }, t: 150, eff: { gather_iron: 0.5 } },
    { id: 'shafts', b: 'mine', acad: 4, req: 'mining', icon: 'i_people', cost: { gold: 900, wood: 500, iron: 300 }, t: 600, eff: { crews_mine: 1 } },
    { id: 'shelves', b: 'warehouse', acad: 2, icon: 'i_bag', cost: { gold: 250, wood: 250 }, t: 200, eff: { store: 0.15 } },
    { id: 'vault', b: 'warehouse', acad: 4, icon: 'i_lock', cost: { gold: 800, stone: 600 }, t: 600, eff: { lootProtect: 0.5 } },
    { id: 'caravans', b: 'market', acad: 3, icon: 'i_scale', cost: { gold: 500, wood: 300 }, t: 420, eff: { trade: 0.1 } },
    { id: 'contracts', b: 'market', acad: 5, req: 'guild', icon: 'i_scroll', cost: { gold: 1500, wood: 800, stone: 800 }, t: 900, eff: { buyC: 0.25 } },
    { id: 'bellows', b: 'forge', acad: 2, icon: 'i_fire', cost: { gold: 250, wood: 200, iron: 100 }, t: 200, eff: { craft: 0.25 } },
    { id: 'smelting', b: 'forge', acad: 5, req: 'workshop', icon: 'i_anvil', cost: { gold: 1500, iron: 1000, stone: 500 }, t: 900, eff: { forgeC: 0.2 } },
    { id: 'recruiters', b: 'tavern', acad: 2, icon: 'i_coin', cost: { gold: 300, wood: 200 }, t: 200, eff: { hireC: 0.25 } },
    { id: 'training', b: 'tavern', acad: 4, icon: 'i_star', cost: { gold: 900, iron: 300, bone: 30 }, t: 600, eff: { advXp: 0.25 } },
    { id: 'drill', b: 'barracks', acad: 3, req: 'bows', icon: 'i_flag', cost: { gold: 600, iron: 300 }, t: 480, eff: { guardSpd: 0.25 } },
    { id: 'muster', b: 'barracks', acad: 4, icon: 'i_helmet', cost: { gold: 800, iron: 400 }, t: 600, eff: { guardC: 0.25 } },
    { id: 'library', b: 'academy', acad: 3, icon: 'i_book', cost: { gold: 600, wood: 400, stone: 300 }, t: 480, eff: { resSpeed: 0.25 } },
    { id: 'scholars', b: 'academy', acad: 5, icon: 'i_people', cost: { gold: 1500, crystal: 30 }, t: 900, eff: { resBoost: 1 } },
    { id: 'spikes', b: 'gate', acad: 3, icon: 'i_atk', cost: { gold: 500, wood: 400, iron: 150 }, t: 420, eff: { thorns: 0.5 } },
    { id: 'masons', b: 'gate', acad: 6, req: 'gates', icon: 'i_hammer', cost: { gold: 3000, stone: 3000, iron: 800 }, t: 1200, eff: { gateRegen: 0.008 } },
  ];
  // к какому зданию относятся прежние исследования (показываются в окне здания)
  const RES_B = { tools: 'academy', logging: 'lumber', masonry: 'quarry', mining: 'mine', builders: 'castle', bows: 'barracks', gates: 'gate', workshop: 'forge', runes: 'forge', maps: 'academy', medicine: 'tavern', guild: 'market', storage: 'warehouse', guard: 'barracks', builders2: 'castle', dragon: 'academy' };
  for (const r of D.RESEARCH) if (!r.b) r.b = RES_B[r.id];

  // ---------- подземелья (карта мира) ----------
  const L = (f, m) => ({ gold: Math.round(12 * Math.pow(1.2, f - 1) * m.g), bone: Math.round((1 + f * 0.6) * m.b) });
  D.LOCS = {
    catacombs: {
      icon: 'b_dungeon', pos: [30, 38], floors: 0, diff: 1,
      pool: (f) => (f <= 3 ? ['slime', 'goblin', 'spider'] : f <= 7 ? ['goblin', 'skeleton', 'wolf', 'spider'] : ['skeleton', 'orc', 'wolf', 'spider']),
      boss: (f) => (f % 10 === 5 ? 'troll' : 'lich'),
      loot(f, boss) {
        const m = boss ? 2.5 : 1;
        const o = L(f, { g: m, b: m });
        if (f >= 2) o.crystal = Math.max(1, Math.round(f * 0.5 * m));
        if (f >= 4) o.mithril = Math.round((Math.floor(f / 4) + (Math.random() < 0.5 ? 1 : 0)) * m);
        return o;
      },
    },
    mine: {
      icon: 'b_mine:2', pos: [62, 64], floors: 15, diff: 2.4, unlock: 'maps',
      pool: (f) => (f <= 5 ? ['bat', 'spider', 'drowned'] : ['drowned', 'skeleton', 'bat']),
      boss: () => 'golem',
      loot(f, boss) {
        const m = boss ? 2.5 : 1;
        const o = L(f, { g: m * 1.3, b: m * 0.5 });
        o.iron = Math.round((20 + f * 8) * m);
        o.mithril = Math.round((1 + f * 0.4) * m);
        if (f >= 3) o.crystal = Math.round(f * 0.4 * m);
        return o;
      },
    },
    lair: {
      icon: 'i_dragon', pos: [80, 24], floors: 8, diff: 6, unlock: 'dragon', final: true,
      pool: () => ['orc', 'wolf', 'drowned', 'bat'],
      boss: (f) => (f === 8 ? 'guardian' : 'troll'),
      loot(f, boss) {
        const m = boss ? 3 : 1;
        const o = L(f + 6, { g: m * 2, b: m });
        o.crystal = Math.round((4 + f * 1.5) * m);
        o.mithril = Math.round((2 + f) * m);
        return o;
      },
    },
  };
  D.LOC_ORDER = ['catacombs', 'mine', 'lair'];

  // ---------- династия ----------
  D.PERK_MAX = 10;
  D.PERKS = [
    { id: 'prod', icon: 'i_pick', eff: { prod: 0.1 } },
    { id: 'click', icon: 'i_atk', eff: { gather: 0.25, click: 0.25 } },
    { id: 'luck', icon: 'i_gem', eff: { luck: 0.03 } },
    { id: 'start', icon: 'i_chest', eff: { start: 1 } },
    { id: 'xp', icon: 'i_star', eff: { xp: 0.1 } },
    { id: 'cap', icon: 'i_bag', eff: { store: 0.1 } },
    { id: 'build', icon: 'i_clock', eff: { buildT: 0.05 } },
    { id: 'tax', icon: 'r_gold', eff: { tax: 0.1 } },
    { id: 'trade', icon: 'i_scale', eff: { trade: 0.05 } },
    { id: 'craft', icon: 'i_anvil', eff: { craft: 0.1 } },
    { id: 'hero', icon: 'i_people', eff: { advXp: 0.1 } },
    { id: 'hire', icon: 'i_coin', eff: { hireC: 0.05 } },
    { id: 'guards', icon: 'i_helmet', eff: { guardAtk: 0.1 } },
    { id: 'walls', icon: 'i_def', eff: { gateHp: 0.1 } },
    { id: 'captain', icon: 'i_map', eff: { captain: 0.04 } },
    { id: 'medic', icon: 'i_heal', eff: { medic: 0.1, save: 0.02 } },
    { id: 'research', icon: 'i_book', eff: { resSpeed: 0.1 } },
    { id: 'crit', icon: 'i_star', eff: { clickCrit: 0.01 } },
  ];

  // ---------- цели (обучение и кампания) ----------
  const R = (S, id) => !!S.research.done[id];
  // h — что подсвечивать для цели: здание на карте (b), вкладку (tab), кнопку действия (act, arg)
  D.GOALS = [
    { h: { b: 'castle', act: 'gather' }, test: (S) => S.stats.clicks >= 10, reward: { gold: 10 } },
    { h: { b: 'lumber', act: 'up' }, test: (S) => S.b.lumber.lvl >= 1, reward: { wood: 15 } },
    { h: { b: 'lumber', act: 'worker' }, test: (S) => S.b.lumber.w >= 1, reward: { gold: 15 } },
    { h: { b: 'quarry', act: 'up' }, test: (S) => S.b.quarry.lvl >= 1, reward: { stone: 20 } },
    { h: { b: 'warehouse', act: 'up' }, test: (S) => S.b.warehouse.lvl >= 1, reward: { gold: 30 } },
    { h: { b: 'mine', act: 'up' }, test: (S) => S.b.mine.lvl >= 1, reward: { iron: 15 } },
    { h: { b: 'forge', act: 'up' }, test: (S) => S.b.forge.lvl >= 1, reward: { iron: 20 } },
    { h: { b: 'forge', act: 'craft' }, test: (S) => S.stats.crafted >= 1, reward: { gold: 40 } },
    { h: { b: 'tavern', act: 'up' }, test: (S) => S.b.tavern.lvl >= 1, reward: { gold: 50 } },
    { h: { b: 'tavern', act: 'hire' }, test: (S) => S.advs.length >= 1, reward: { iron: 20 } },
    { h: { tab: 'guild', act: 'pick' }, test: (S) => S.items.some((i) => i.eq && i.eq !== 'king'), reward: { gold: 40 } },
    { h: { b: 'gate', act: 'up' }, test: (S) => S.b.gate.lvl >= 1, reward: { stone: 60 } },
    { h: { b: 'gate', act: ['gate', 'guard'] }, test: (S) => S.guards > 0 || S.advs.some((a) => a.st === 'gate'), reward: { gold: 50 } },
    { h: { b: 'gate', act: 'fight' }, test: (S) => S.gate.best >= 1, reward: { gold: 60 } },
    { h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, test: (S) => (S.dng.best.catacombs || 0) >= 1, reward: { gold: 80 } },
    { h: { b: 'castle', act: 'up' }, test: (S) => S.b.castle.lvl >= 2, reward: { gold: 100 } },
    { h: { b: 'academy', act: 'up' }, test: (S) => S.b.academy.lvl >= 1, reward: { gold: 100 } },
    { h: { b: 'academy', act: 'research' }, test: (S) => Object.keys(S.research.done).length >= 1, reward: { gold: 120 } },
    { h: { b: 'market', act: 'up' }, test: (S) => S.b.market.lvl >= 1, reward: { gold: 100 } },
    { h: { b: 'barracks', act: ['up', 'guard'] }, test: (S) => S.guards >= 1, reward: { iron: 60 } },
    { h: { b: 'gate', act: 'fight' }, test: (S) => S.gate.best >= 5, reward: { gold: 250, bone: 10 } },
    { h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, test: (S) => (S.dng.best.catacombs || 0) >= 5, reward: { crystal: 10 } },
    { h: { tab: 'king' }, test: (S) => S.king.lvl >= 3, reward: { gold: 200 } },
    { h: { b: 'castle', act: 'up' }, test: (S) => S.b.castle.lvl >= 4, reward: { gold: 500 } },
    { h: { b: 'academy', act: 'research', arg: 'maps' }, test: (S) => R(S, 'maps'), reward: { gold: 500 } },
    { h: { b: 'gate', act: 'fight' }, test: (S) => S.gate.best >= 10, reward: { gold: 800, bone: 30 } },
    { h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, test: (S) => (S.dng.best.catacombs || 0) >= 10, reward: { crystal: 30, mithril: 10 } },
    { h: { b: 'academy', act: 'research', arg: 'dragon' }, test: (S) => R(S, 'dragon'), reward: { gold: 2000 } },
    { h: { b: 'dungeon', tab: 'exp', act: ['loc', 'send'], arg: 'lair' }, test: (S) => S.camp.awake, reward: { gold: 3000 } },
    { h: { b: 'gate', act: 'fightFinal' }, test: (S) => S.camp.won, reward: { gold: 10000 } },
  ];

})();
