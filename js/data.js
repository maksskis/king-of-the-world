// Все числа и описания игрового мира. Тексты — в i18n.js по ключам.
(function () {
  const D = (G.D = {});

  D.RES = ['gold', 'wood', 'stone', 'iron', 'bone', 'crystal', 'mithril'];
  D.MAT = ['wood', 'stone', 'iron', 'bone', 'crystal', 'mithril'];

  // ---------- уровни и стройка ----------
  D.MAXLVL = 8;
  // Лимит склада по уровню склада (0 — склада ещё нет)
  D.CAPS = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];
  // Склад 8-го уровня снимает ограничения со всех ресурсов и золота, а вместо вместимости даёт +30% к пассивной добыче
  D.STORE_PROD = 0.3;
  // Со Складом 8-го уровня бонусы вместимости не пропадают, а превращаются в добычу:
  // +1% вместимости склада → +0,4% пассивной добычи, +1% лимита золота → +0,5% налогов
  D.CONV = { store: 0.4, goldCap: 0.5 };
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
    // Арена заменила Рынок: бои за кости, кристаллы и мифрил
    arena: { base: { gold: 120, wood: 90, stone: 90 }, ang: -10 },
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
  D.ORDER = ['castle', 'lumber', 'quarry', 'mine', 'warehouse', 'arena', 'forge', 'tavern', 'barracks', 'academy', 'gate', 'dungeon'];
  D.PROD = ['lumber', 'quarry', 'mine'];
  // Жители: платят налог; приходят, пока есть свободное жильё
  D.FOLK = { tax: 0.03, perCastle: 3, perLevels: 2, every: 15 };

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
  // До 10 рангов: первые 3 дают полную силу, следующие — по 40%, чтобы героям было куда расти и после престижа
  D.SKILL_MAX = 10;
  D.SKILL_FULL = 3;
  D.rankEff = (r) => (r <= D.SKILL_FULL ? r : D.SKILL_FULL + (r - D.SKILL_FULL) * 0.4);
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
  // Легендарная вещь — ровно 1% везде, где она может выпасть (кузница с 7-го уровня, подземелья, Путешествие).
  // Удача сдвигает остальные редкости мягко: множитель (1 + удача/2) на ступень, удача не выше 1,6.
  D.LEG = { p: 0.01, kMax: 1.6 };
  // Боссы: подземелья (каждый 5-й этаж и последний) — здоровье ×5 и урон ×2,1 к обычному этажу (было ×3,5 и ×1,6);
  // у ворот тролль, лич, страж и дракон — здоровье ×1,5 и урон ×1,4 к своим базовым
  D.BOSS = { hp: 5, atk: 2.1, gateHp: 1.5, gateAtk: 1.4 };
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
  D.kingXp = (L) => Math.round(50 * Math.pow(1.35, L - 1));
  // Таланты короля: упор на автоматизацию. max — предел рангов таланта.
  D.TAL_MAX = 5;
  D.TALENTS = [
    { id: 'pick', br: 'hand', icon: 'i_pick', eff: { gather: 0.2 } },
    { id: 'strike', br: 'hand', icon: 'i_atk', eff: { click: 0.2 } },
    { id: 'lucky', br: 'hand', icon: 'i_star', eff: { clickCrit: 0.04 } },
    { id: 'example', br: 'hand', icon: 'i_crown', eff: { clickProd: 1 } },
    { id: 'mentor', br: 'hand', icon: 'i_book', eff: { resBoost: 0.5 } },
    { id: 'hammer', br: 'hand', icon: 'i_anvil', eff: { forgeBoost: 0.5 } },
    { id: 'autoclick', br: 'hand', icon: 'i_pick', max: 3, eff: { autoClick: 1 } },
    { id: 'wisdom', br: 'hand', icon: 'i_book', eff: { kingXp: 0.2 } },
    { id: 'steward', br: 'eco', icon: 'i_pick', eff: { prod: 0.08 } },
    { id: 'crews', br: 'eco', icon: 'i_people', max: 3, eff: { crews: 1 } },
    { id: 'settlers', br: 'eco', icon: 'i_people', max: 3, eff: { crews: 1, smiths: 1 } },
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
  // b — здание, в окне которого виден навык (может быть список)
  D.RESEARCH = [
    // 1 уровень Академии
    { id: 'tools', b: 'academy', acad: 1, icon: 'i_pick', cost: { gold: 120, wood: 80 }, t: 60, eff: { prod: 0.15 } },
    { id: 'logging', b: 'lumber', acad: 1, icon: 'r_wood', cost: { gold: 100, stone: 60 }, t: 60, eff: { prod_wood: 0.25, gather_wood: 0.5 } },
    { id: 'scholars', b: 'academy', acad: 1, icon: 'i_people', cost: { gold: 150, wood: 100 }, t: 90, eff: { resBoost: 1 } },
    { id: 'masonry', b: 'quarry', acad: 1, icon: 'r_stone', cost: { gold: 100, wood: 60 }, t: 60, eff: { prod_stone: 0.25, gather_stone: 0.5 } },
    // 2
    { id: 'mining', b: 'mine', acad: 2, req: 'tools', icon: 'r_iron', cost: { gold: 200, wood: 150, stone: 100 }, t: 150, eff: { prod_iron: 0.25, gather_iron: 0.5 } },
    { id: 'builders', b: 'castle', acad: 2, icon: 'i_hammer', cost: { gold: 300, wood: 250, stone: 250 }, t: 240, eff: { builders: 1 } },
    { id: 'mint', b: 'castle', acad: 2, icon: 'r_gold', cost: { gold: 300, stone: 200 }, t: 200, eff: { tax: 0.2 } },
    { id: 'apprentices', b: 'forge', acad: 2, icon: 'i_anvil', cost: { gold: 250, wood: 150, iron: 80 }, t: 180, eff: { forgeBoost: 1 } },
    // 3
    { id: 'bows', b: 'barracks', acad: 3, icon: 'it_bow:0', cost: { gold: 400, wood: 300, iron: 120 }, t: 300, eff: { guardAtk: 0.25 } },
    { id: 'gates', b: 'gate', acad: 3, icon: 'i_def', cost: { gold: 400, stone: 500, iron: 150 }, t: 360, eff: { gateHp: 0.25 } },
    { id: 'workshop', b: 'forge', acad: 3, req: 'mining', icon: 'i_anvil', cost: { gold: 500, iron: 300, wood: 200 }, t: 420, eff: { forgeQ: 1, craft: 0.2 } },
    { id: 'maps', b: 'academy', acad: 3, icon: 'i_map', cost: { gold: 500, wood: 300, bone: 20 }, t: 480, eff: { loc_mine: 1 } },
    // 4
    { id: 'council', b: 'academy', acad: 4, icon: 'i_people', cost: { gold: 1000, wood: 600, stone: 600, crystal: 10 }, t: 600, eff: { resSlots: 1 } },
    { id: 'storage', b: 'warehouse', acad: 4, icon: 'i_bag', cost: { gold: 1000, wood: 800, stone: 800 }, t: 600, eff: { store: 0.25 } },
    { id: 'training', b: 'tavern', acad: 4, icon: 'i_star', cost: { gold: 900, iron: 300, bone: 30 }, t: 600, eff: { hireC: 0.25, advXp: 0.25 } },
    { id: 'runes', b: 'forge', acad: 4, icon: 'i_gem', cost: { gold: 800, crystal: 20, stone: 400 }, t: 600, eff: { enchant: 1 } },
    // 5
    { id: 'medicine', b: 'tavern', acad: 5, icon: 'i_heal', cost: { gold: 1200, bone: 50, crystal: 20 }, t: 800, eff: { recover: 1, save: 0.1 } },
    { id: 'gladiators', b: 'arena', acad: 5, icon: 'i_atk', cost: { gold: 1300, wood: 800, stone: 800 }, t: 800, eff: { arenaLoot: 0.25 } },
    { id: 'workcamps', b: ['lumber', 'quarry', 'mine'], acad: 5, icon: 'i_people', cost: { gold: 1500, wood: 1000, stone: 1000, iron: 300 }, t: 900, eff: { crews: 1 } },
    { id: 'library', b: 'academy', acad: 5, icon: 'i_book', cost: { gold: 1400, wood: 800, stone: 600 }, t: 800, eff: { resSpeed: 0.25 } },
    // 6
    { id: 'guard', b: 'barracks', acad: 6, req: 'bows', icon: 'i_helmet', cost: { gold: 2500, iron: 1200 }, t: 1200, eff: { guards: 3, guardSpd: 0.25 } },
    { id: 'treasury', b: 'castle', acad: 6, icon: 'i_chest', cost: { gold: 2500, stone: 1500, iron: 500 }, t: 1200, eff: { goldCap: 0.3 } },
    { id: 'dragon', b: 'academy', acad: 6, req: 'maps', icon: 'i_dragon', cost: { gold: 4000, mithril: 40, crystal: 60 }, t: 1500, eff: { loc_lair: 1 } },
    { id: 'spikes', b: 'gate', acad: 6, icon: 'i_atk', cost: { gold: 2200, wood: 1500, iron: 600 }, t: 1100, eff: { thorns: 0.5 } },
    // 7
    { id: 'guildhall', b: 'tavern', acad: 7, icon: 'i_people', cost: { gold: 5000, wood: 5000, stone: 5000 }, t: 1800, eff: { advCap: 2 } },
    { id: 'fame', b: 'arena', acad: 7, req: 'gladiators', icon: 'i_star', cost: { gold: 5000, wood: 3000, stone: 3000 }, t: 1600, eff: { arenaCd: 0.3 } },
    { id: 'smelting', b: 'forge', acad: 7, req: 'workshop', icon: 'i_anvil', cost: { gold: 5000, iron: 3000, stone: 1500 }, t: 1600, eff: { forgeC: 0.2 } },
    { id: 'bellows', b: 'forge', acad: 7, icon: 'i_fire', cost: { gold: 5000, wood: 3000, iron: 2000 }, t: 1600, eff: { craft: 0.4 } },
    // 8
    { id: 'vault', b: 'warehouse', acad: 8, req: 'storage', icon: 'i_lock', cost: { gold: 9000, stone: 8000 }, t: 2400, eff: { passive: 0.1, lootProtect: 0.5 } },
    { id: 'masons', b: 'gate', acad: 8, req: 'gates', icon: 'i_hammer', cost: { gold: 9000, stone: 9000, iron: 2500 }, t: 2400, eff: { gateRegen: 0.008 } },
  ];
  D.resIn = (r, k) => [].concat(r.b).includes(k);

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
  // Земли, которые осваивает каждый следующий наследник; карта подкрашивается под край
  D.LANDS = [
    { ru: 'Королевство', en: 'The Kingdom' },
    { ru: 'Северные земли', en: 'The Northern lands' },
    { ru: 'Восточные степи', en: 'The Eastern steppes' },
    { ru: 'Южные топи', en: 'The Southern marshes' },
    { ru: 'Западные горы', en: 'The Western mountains' },
    { ru: 'Заморские острова', en: 'The Overseas isles' },
  ];
  // Престиж героя: уровень сбрасывается, навыки остаются, каждая звезда даёт +15% к здоровью, атаке и защите
  D.PREST_BONUS = 0.15;
  D.PERK_MAX = 10;
  // «Основатели»: каждый ранг — ещё одно здание уже построено в начале эпохи, по порядку важности
  D.FOUND_ORDER = ['lumber', 'quarry', 'warehouse', 'mine', 'forge', 'tavern', 'gate', 'academy', 'arena', 'barracks'];
  D.PERKS = [
    { id: 'found', icon: 'i_hammer', eff: {} },
    { id: 'prod', icon: 'i_pick', eff: { prod: 0.1 } },
    { id: 'click', icon: 'i_atk', eff: { gather: 0.25, click: 0.25 } },
    { id: 'luck', icon: 'i_gem', eff: { luck: 0.03 } },
    { id: 'start', icon: 'i_chest', eff: { start: 1 } },
    { id: 'xp', icon: 'i_star', eff: { xp: 0.1 } },
    { id: 'cap', icon: 'i_bag', eff: { store: 0.1 } },
    { id: 'build', icon: 'i_clock', eff: { buildT: 0.05 } },
    { id: 'tax', icon: 'r_gold', eff: { tax: 0.1 } },
    { id: 'trade', icon: 'i_atk', eff: { arenaLoot: 0.1 } }, // «Слава арены» (бывший Торговый дом)
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
  // 90 целей: id — для переноса прогресса старых сохранений, t — ключ текста
  // Порядок прежнего списка из 90 целей: по нему переносится прогресс старых сохранений
  D.GOALS_V2 = ['g0', 'g1', 'g2', 'n1', 'g3', 'n2', 'g4', 'n3', 'g5', 'n4', 'n5', 'g6', 'g7', 'n6', 'n7', 'g8', 'g9', 'g10', 'n8', 'g11', 'g12', 'g13', 'n9', 'g14', 'n10', 'n11', 'g15', 'n12', 'n13', 'n14', 'n15', 'g16', 'g17', 'n16', 'n17', 'g18', 'n18', 'g19', 'n19', 'n20', 'n21', 'n22', 'g20', 'n23', 'g21', 'g22', 'n24', 'n25', 'n26', 'n27', 'n28', 'n29', 'n30', 'n31', 'n32', 'n33', 'n34', 'n35', 'n36', 'g23', 'n37', 'n38', 'n39', 'n40', 'n41', 'n42', 'n43', 'g24', 'n44', 'n45', 'n46', 'g25', 'n47', 'n48', 'n49', 'g26', 'n50', 'n51', 'n52', 'n53', 'n54', 'n55', 'n56', 'n57', 'g27', 'n58', 'n59', 'g28', 'n60', 'g29'];
  D.GOALS = [
    { id: 'g0', t: 'goal0', h: { b: 'castle', act: 'gather' }, test: (S) => S.stats.clicks >= 10, reward: { gold: 10 } },
    { id: 'g1', t: 'goal1', h: { b: 'lumber', act: 'up' }, test: (S) => S.b.lumber.lvl >= 1, reward: { wood: 15 } },
    { id: 'g2', t: 'goal2', h: { b: 'lumber', act: 'worker' }, test: (S) => S.b.lumber.w >= 1, reward: { gold: 15 } },
    { id: 'm1', t: 'gm_m1', h: { b: 'lumber', act: 'gather' }, v: (S) => S.stats.g_wood || 0, n: 30, d: true, reward: { gold: 20 } },
    { id: 'n1', t: 'gn1', h: { b: 'lumber', act: 'gather' }, test: (S) => S.res.wood >= 40, reward: { gold: 15 } },
    { id: 'g3', t: 'goal3', h: { b: 'quarry', act: 'up' }, test: (S) => S.b.quarry.lvl >= 1, reward: { stone: 20 } },
    { id: 'n2', t: 'gn2', h: { b: 'quarry', act: 'worker' }, test: (S) => S.b.quarry.w >= 1, reward: { wood: 20 } },
    { id: 'g4', t: 'goal4', h: { b: 'warehouse', act: 'up' }, test: (S) => S.b.warehouse.lvl >= 1, reward: { gold: 30 } },
    { id: 'm2', t: 'gm_m2', h: { b: 'castle', act: 'gather' }, v: (S) => S.stats.clicks, n: 100, d: true, reward: { gold: 40 } },
    { id: 'g5', t: 'goal5', h: { b: 'mine', act: 'up' }, test: (S) => S.b.mine.lvl >= 1, reward: { iron: 15 } },
    { id: 'n4', t: 'gn4', h: { b: 'mine', act: 'worker' }, test: (S) => S.b.mine.w >= 1, reward: { gold: 25 } },
    { id: 'm3', t: 'gm_m3', h: { b: 'quarry', act: 'worker' }, v: (S) => S.b.lumber.w + S.b.quarry.w + S.b.mine.w, n: 5, reward: { gold: 40 } },
    { id: 'n5', t: 'gn5', h: { b: 'castle', act: 'tools' }, test: (S) => S.king.tools >= 1, reward: { stone: 25 } },
    { id: 'g6', t: 'goal6', h: { b: 'forge', act: 'up' }, test: (S) => S.b.forge.lvl >= 1, reward: { iron: 20 } },
    { id: 'g7', t: 'goal7', h: { b: 'forge', act: 'craft' }, test: (S) => S.stats.crafted >= 1, reward: { gold: 40 } },
    { id: 'n6', t: 'gn6', h: { b: 'castle', act: 'pick' }, test: (S) => S.items.some((i) => i.eq === 'king'), reward: { iron: 20 } },
    { id: 'n7', t: 'gn7', h: { b: 'forge', act: 'smith' }, test: (S) => S.b.forge.w >= 1, reward: { gold: 40 } },
    { id: 'g8', t: 'goal8', h: { b: 'tavern', act: 'up' }, test: (S) => S.b.tavern.lvl >= 1, reward: { gold: 50 } },
    { id: 'g9', t: 'goal9', h: { b: 'tavern', act: 'hire' }, test: (S) => S.advs.length >= 1, reward: { iron: 20 } },
    { id: 'g10', t: 'goal10', h: { tab: 'guild', act: 'pick' }, test: (S) => S.items.some((i) => i.eq && i.eq !== 'king'), reward: { gold: 40 } },
    { id: 'm4', t: 'gm_m4', h: { b: 'forge', act: 'craft' }, v: (S) => S.stats.crafted || 0, n: 3, d: true, reward: { iron: 40 } },
    { id: 'g11', t: 'goal11', h: { b: 'gate', act: 'up' }, test: (S) => S.b.gate.lvl >= 1, reward: { stone: 60 } },
    { id: 'g12', t: 'goal12', h: { b: 'gate', act: ['gate', 'guard'] }, test: (S) => S.guards > 0 || S.advs.some((a) => a.st === 'gate'), reward: { gold: 50 } },
    { id: 'g13', t: 'goal13', h: { b: 'gate', act: 'fight' }, test: (S) => S.gate.best >= 1, reward: { gold: 60 } },
    { id: 'g14', t: 'goal14', h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, test: (S) => (S.dng.best.catacombs || 0) >= 1, reward: { gold: 80 } },
    { id: 'n10', t: 'gn10', h: { tab: 'guild', act: 'learn' }, test: (S) => S.advs.some((a) => Object.values(a.sk || {}).some((v) => v > 0)), reward: { gold: 50 } },
    { id: 'm5', t: 'gm_m5', h: { b: 'gate', act: 'fight' }, v: (S) => S.stats.waves || 0, n: 3, d: true, reward: { gold: 100, bone: 5 } },
    { id: 'n11', t: 'gn11', h: { tab: 'decree', act: 'decreeAdd' }, test: (S) => (S.stats.decreed || 0) >= 1, reward: { gold: 50 } },
    { id: 'g15', t: 'goal15', h: { b: 'castle', act: 'up' }, test: (S) => S.b.castle.lvl >= 2, reward: { gold: 100 } },
    { id: 'm6', t: 'gm_m6', h: { b: 'lumber', act: 'up' }, v: (S) => ['lumber', 'quarry', 'mine', 'warehouse', 'forge', 'tavern', 'gate'].filter((k) => S.b[k].lvl >= 2).length, n: 4, reward: { gold: 120 } },
    { id: 'm7', t: 'gm_m7', h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, v: (S) => S.stats.floors || 0, n: 5, d: true, reward: { bone: 10 } },
    { id: 'g16', t: 'goal16', h: { b: 'academy', act: 'up' }, test: (S) => S.b.academy.lvl >= 1, reward: { gold: 100 } },
    { id: 'g17', t: 'goal17', h: { b: 'academy', act: 'research' }, test: (S) => Object.keys(S.research.done).length >= 1, reward: { gold: 120 } },
    { id: 'n16', t: 'gn16', h: { b: 'academy', act: 'research', arg: 'logging' }, test: (S) => R(S, 'logging'), reward: { wood: 80 } },
    { id: 'n17', t: 'gn17', h: { b: 'academy', act: 'resQueue' }, test: (S) => (S.stats.resQueued || 0) >= 1, reward: { gold: 80 } },
    { id: 'm8', t: 'gm_m8', h: { b: 'castle', act: 'gather' }, v: (S) => S.stats.g_gold || 0, n: 300, d: true, reward: { wood: 100, stone: 100 } },
    { id: 'g18', t: 'goal18', h: { b: 'arena', act: 'up' }, test: (S) => S.b.arena.lvl >= 1, reward: { gold: 100 } },
    { id: 'n18', t: 'gn18', h: { b: 'arena', act: ['arenaPick', 'arenaFight'] }, test: (S) => (S.arena.wins || 0) >= 1, reward: { bone: 10 } },
    { id: 'g19', t: 'goal19', h: { b: 'barracks', act: ['up', 'guard'] }, test: (S) => S.guards >= 1, reward: { iron: 60 } },
    { id: 'n20', t: 'gn20', h: { tab: 'king', act: 'talent' }, test: (S) => Object.values(S.king.tal).some((v) => v > 0), reward: { gold: 80 } },
    { id: 'n21', t: 'gn21', h: { tab: 'king', act: 'cast' }, test: (S) => (S.stats.spells || 0) >= 1, reward: { gold: 80 } },
    { id: 'm9', t: 'gm_m9', h: { b: 'mine', act: 'worker' }, v: (S) => S.b.lumber.w + S.b.quarry.w + S.b.mine.w, n: 9, reward: { gold: 150 } },
    { id: 'g20', t: 'goal20', h: { b: 'gate', act: 'fight' }, test: (S) => S.gate.best >= 5, reward: { gold: 250, bone: 10 } },
    { id: 'n23', t: 'gn23', h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, test: (S) => (S.dng.best.catacombs || 0) >= 3, reward: { bone: 10 } },
    { id: 'm10', t: 'gm_m10', h: { b: 'tavern', act: 'hire' }, v: (S) => S.stats.hires || 0, n: 2, d: true, reward: { gold: 150 } },
    { id: 'g21', t: 'goal21', h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, test: (S) => (S.dng.best.catacombs || 0) >= 5, reward: { crystal: 10 } },
    { id: 'g22', t: 'goal22', h: { tab: 'king' }, test: (S) => S.king.lvl >= 3, reward: { gold: 200 } },
    { id: 'n24', t: 'gn24', h: { b: 'castle', act: 'up', el: '#folk' }, test: (S) => (S.folk || 0) >= 10, reward: { gold: 100 } },
    { id: 'n25', t: 'gn25', h: { b: 'castle', act: 'up' }, test: (S) => S.b.castle.lvl >= 3, reward: { gold: 200 } },
    { id: 'm11', t: 'gm_m11', h: { b: 'arena', act: ['arenaPick', 'arenaFight'] }, v: (S) => S.arena.wins || 0, n: 3, d: true, reward: { bone: 20, crystal: 5 } },
    { id: 'n26', t: 'gn26', h: { b: 'forge', act: 'up' }, test: (S) => S.b.forge.lvl >= 3, reward: { iron: 80 } },
    { id: 'n27', t: 'gn27', h: { b: 'forge', act: 'craft' }, test: (S) => S.items.some((i) => i.ti >= 1), reward: { bone: 15 } },
    { id: 'n28', t: 'gn28', h: { b: 'tavern', act: 'up' }, test: (S) => S.b.tavern.lvl >= 3, reward: { gold: 150 } },
    { id: 'n29', t: 'gn29', h: { b: 'tavern', act: 'hire' }, test: (S) => S.advs.length >= 3, reward: { gold: 150 } },
    { id: 'm12', t: 'gm_m12', h: { b: 'gate', act: 'fight' }, v: (S) => S.stats.kills || 0, n: 50, d: true, reward: { gold: 300, bone: 15 } },
    { id: 'n30', t: 'gn30', h: { b: 'academy', act: 'research', arg: 'mining' }, test: (S) => R(S, 'mining'), reward: { iron: 100 } },
    { id: 'n31', t: 'gn31', h: { b: 'academy', act: 'research', arg: 'builders' }, test: (S) => R(S, 'builders'), reward: { stone: 150 } },
    { id: 'n32', t: 'gn32', h: { b: 'gate', act: 'up' }, test: (S) => S.b.gate.lvl >= 3, reward: { stone: 150 } },
    { id: 'n33', t: 'gn33', h: { b: 'academy', act: 'research', arg: 'gates' }, test: (S) => R(S, 'gates'), reward: { gold: 200 } },
    { id: 'n34', t: 'gn34', h: { b: 'arena', act: 'up' }, test: (S) => S.b.arena.lvl >= 3, reward: { gold: 200 } },
    { id: 'n35', t: 'gn35', h: { b: 'barracks', act: 'up' }, test: (S) => S.b.barracks.lvl >= 3, reward: { iron: 120 } },
    { id: 'n36', t: 'gn36', h: { b: 'academy', act: 'up' }, test: (S) => S.b.academy.lvl >= 3, reward: { gold: 200 } },
    { id: 'm13', t: 'gm_m13', h: { b: 'forge', act: 'craft' }, v: (S) => S.stats.crafted || 0, n: 10, d: true, reward: { iron: 200 } },
    { id: 'm14', t: 'gm_m14', h: { b: 'barracks', act: 'guard' }, v: (S) => S.guards, n: 5, reward: { iron: 150 } },
    { id: 'g23', t: 'goal23', h: { b: 'castle', act: 'up' }, test: (S) => S.b.castle.lvl >= 4, reward: { gold: 500 } },
    { id: 'n37', t: 'gn37', h: { b: 'warehouse', act: 'up' }, test: (S) => S.b.warehouse.lvl >= 4, reward: { gold: 300 } },
    { id: 'n38', t: 'gn38', h: { b: 'academy', act: 'up' }, test: (S) => S.b.academy.lvl >= 4, reward: { gold: 300 } },
    { id: 'n39', t: 'gn39', h: { b: 'academy', act: 'research', arg: 'council' }, test: (S) => R(S, 'council'), reward: { crystal: 15 } },
    { id: 'n40', t: 'gn40', h: { b: 'tavern', act: 'up' }, test: (S) => S.b.tavern.lvl >= 4, reward: { gold: 300 } },
    { id: 'm15', t: 'gm_m15', h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, v: (S) => S.stats.floors || 0, n: 15, d: true, reward: { bone: 40, crystal: 10 } },
    { id: 'n41', t: 'gn41', h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, test: (S) => (S.exps || []).length >= 2, reward: { bone: 30 } },
    { id: 'n42', t: 'gn42', h: { b: 'tavern', act: 'hire' }, test: (S) => S.advs.some((a) => a.rar >= 1), reward: { gold: 300 } },
    { id: 'm16', t: 'gm_m16', h: { b: 'gate', act: 'fight' }, v: (S) => S.stats.waves || 0, n: 5, d: true, reward: { gold: 600, bone: 20 } },
    { id: 'n43', t: 'gn43', h: { tab: 'guild' }, test: (S) => S.advs.some((a) => a.lvl >= 10), reward: { crystal: 15 } },
    { id: 'g24', t: 'goal24', h: { b: 'academy', act: 'research', arg: 'maps' }, test: (S) => R(S, 'maps'), reward: { gold: 500 } },
    { id: 'n44', t: 'gn44', h: { b: 'dungeon', tab: 'exp', act: ['loc', 'send'], arg: 'mine' }, test: (S) => (S.dng.best.mine || 0) >= 5, reward: { mithril: 10 } },
    { id: 'n45', t: 'gn45', h: { b: 'academy', act: 'research', arg: 'runes' }, test: (S) => R(S, 'runes'), reward: { crystal: 20 } },
    { id: 'n46', t: 'gn46', h: { tab: 'armory', act: 'enchant' }, test: (S) => (S.stats.enchanted || 0) >= 1, reward: { crystal: 20 } },
    { id: 'm17', t: 'gm_m17', h: { b: 'academy', act: 'research' }, v: (S) => D.RESEARCH.filter((r) => S.research.done[r.id]).length, n: 3, d: true, reward: { gold: 800 } },
    { id: 'g25', t: 'goal25', h: { b: 'gate', act: 'fight' }, test: (S) => S.gate.best >= 10, reward: { gold: 800, bone: 30 } },
    { id: 'n47', t: 'gn47', h: { tab: 'king' }, test: (S) => S.king.lvl >= 8, reward: { gold: 600 } },
    { id: 'm18', t: 'gm_m18', h: { b: 'arena', act: ['arenaPick', 'arenaFight'] }, v: (S) => S.arena.best || 0, n: 5, reward: { crystal: 20 } },
    { id: 'n48', t: 'gn48', h: { b: 'castle', act: 'up', el: '#folk' }, test: (S) => (S.folk || 0) >= 30, reward: { gold: 500 } },
    { id: 'n49', t: 'gn49', h: { b: 'academy', act: 'research' }, test: (S) => D.RESEARCH.filter((r) => S.research.done[r.id]).length >= 10, reward: { gold: 800 } },
    { id: 'g26', t: 'goal26', h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, test: (S) => (S.dng.best.catacombs || 0) >= 10, reward: { crystal: 30, mithril: 10 } },
    { id: 'm19', t: 'gm_m19', h: { b: 'castle', act: 'gather' }, v: (S) => S.stats.g_gold || 0, n: 3000, d: true, reward: { stone: 500, iron: 500 } },
    { id: 'n50', t: 'gn50', h: { b: 'castle', act: 'up' }, test: (S) => S.b.castle.lvl >= 5, reward: { gold: 1000 } },
    { id: 'n51', t: 'gn51', h: { b: 'forge', act: 'up' }, test: (S) => S.b.forge.lvl >= 5, reward: { mithril: 15 } },
    { id: 'n52', t: 'gn52', h: { b: 'forge', act: 'craft' }, test: (S) => S.items.some((i) => i.ti >= 2), reward: { crystal: 30 } },
    { id: 'm20', t: 'gm_m20', h: { b: 'gate', act: 'fight' }, v: (S) => S.stats.kills || 0, n: 200, d: true, reward: { gold: 1500, bone: 40 } },
    { id: 'n53', t: 'gn53', h: { b: 'gate', act: 'fight' }, test: (S) => S.gate.best >= 15, reward: { gold: 1500, bone: 40 } },
    { id: 'n54', t: 'gn54', h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, test: (S) => (S.dng.best.catacombs || 0) >= 15, reward: { mithril: 20 } },
    { id: 'n55', t: 'gn55', h: { b: 'tavern', act: 'hire' }, test: (S) => S.advs.some((a) => a.rar >= 2), reward: { gold: 1200 } },
    { id: 'm21', t: 'gm_m21', h: { tab: 'armory', act: 'enchant' }, v: (S) => S.stats.enchanted || 0, n: 3, d: true, reward: { crystal: 40 } },
    { id: 'n56', t: 'gn56', h: { b: 'castle', act: 'up' }, test: (S) => S.b.castle.lvl >= 6, reward: { gold: 2000 } },
    { id: 'n57', t: 'gn57', h: { b: 'academy', act: 'up' }, test: (S) => S.b.academy.lvl >= 6, reward: { crystal: 40 } },
    { id: 'm22', t: 'gm_m22', h: { b: 'lumber', act: 'up' }, v: (S) => Math.min(S.b.lumber.lvl, S.b.quarry.lvl, S.b.mine.lvl), n: 6, reward: { gold: 2000 } },
    { id: 'g27', t: 'goal27', h: { b: 'academy', act: 'research', arg: 'dragon' }, test: (S) => R(S, 'dragon'), reward: { gold: 2000 } },
    { id: 'm23', t: 'gm_m23', h: { b: 'arena', act: ['arenaPick', 'arenaFight'] }, v: (S) => S.arena.wins || 0, n: 10, d: true, reward: { crystal: 30, mithril: 10 } },
    { id: 'n58', t: 'gn58', h: { b: 'dungeon', tab: 'exp', act: ['loc', 'send'], arg: 'mine' }, test: (S) => (S.dng.best.mine || 0) >= 15, reward: { mithril: 40 } },
    { id: 'm24', t: 'gm_m24', h: { b: 'tavern', act: 'hire' }, v: (S) => S.advs.length, n: 6, reward: { gold: 2500 } },
    { id: 'n59', t: 'gn59', h: { b: 'dungeon', tab: 'exp', act: ['loc', 'send'], arg: 'lair' }, test: (S) => (S.dng.best.lair || 0) >= 4, reward: { gold: 3000 } },
    { id: 'm25', t: 'gm_m25', h: { b: 'castle', act: 'up' }, v: (S) => S.b.castle.lvl, n: 7, reward: { gold: 4000 } },
    { id: 'm26', t: 'gm_m26', h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, v: (S) => S.stats.floors || 0, n: 30, d: true, reward: { mithril: 30, crystal: 30 } },
    { id: 'g28', t: 'goal28', h: { b: 'dungeon', tab: 'exp', act: ['loc', 'send'], arg: 'lair' }, test: (S) => S.camp.awake, reward: { gold: 3000 } },
    { id: 'm27', t: 'gm_m27', h: { b: 'forge', act: 'craft' }, test: (S) => S.items.some((i) => i.rar >= 3), reward: { crystal: 50 } },
    { id: 'n60', t: 'gn60', h: { b: 'gate', act: 'fight' }, test: (S) => S.gate.best >= 20, reward: { gold: 5000, bone: 100 } },
    { id: 'm28', t: 'gm_m28', h: { b: 'castle', act: 'up' }, v: (S) => S.b.castle.lvl, n: 8, reward: { gold: 8000 } },
    { id: 'm29', t: 'gm_m29', h: { b: 'warehouse', act: 'up' }, v: (S) => S.b.warehouse.lvl, n: 8, reward: { gold: 5000 } },
    { id: 'm30', t: 'gm_m30', h: { b: 'academy', act: 'research' }, v: (S) => D.RESEARCH.filter((r) => S.research.done[r.id]).length, n: 20, reward: { crystal: 60 } },
    { id: 'g29', t: 'goal29', h: { b: 'gate', act: 'fightFinal' }, test: (S) => S.camp.won, reward: { gold: 10000 } },
    { id: 'm31', t: 'gm_m31', h: { el: '#journey-btn' }, v: (S) => (S.dyn.jr && S.dyn.jr.best) || 0, n: 1, reward: { mithril: 30 } },
    { id: 'm32', t: 'gm_m32', h: { b: 'gate', act: 'fight' }, v: (S) => S.gate.best, n: 25, reward: { gold: 8000, bone: 150 } },
    { id: 'm33', t: 'gm_m33', h: { b: 'arena', act: ['arenaPick', 'arenaFight'] }, v: (S) => S.arena.best || 0, n: 10, reward: { crystal: 80 } },
    { id: 'm34', t: 'gm_m34', h: { el: '#journey-btn' }, v: (S) => (S.dyn.jr && S.dyn.jr.best) || 0, n: 3, reward: { mithril: 50, crystal: 50 } },
    { id: 'm35', t: 'gm_m35', h: { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] }, v: (S) => S.dng.best.catacombs || 0, n: 30, reward: { mithril: 60 } },
    { id: 'm36', t: 'gm_m36', h: { el: '#journey-btn' }, v: (S) => (S.dyn.jr && S.dyn.jr.best) || 0, n: 5, reward: { gold: 15000 } },
    { id: 'm37', t: 'gm_m37', h: { tab: 'king' }, v: () => G.K.legacyGain(), n: 30, reward: { crystal: 100 } },
    { id: 'm38', t: 'gm_m38', h: { el: '#journey-btn' }, v: (S) => (S.dyn.jr && S.dyn.jr.best) || 0, n: 10, reward: { mithril: 100, crystal: 100 } },
  ];

})();
