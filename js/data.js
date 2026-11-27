// Все числа и описания игрового мира. Тексты — в i18n.js по ключам.
(function () {
  const D = (G.D = {});

  D.RES = ['gold', 'wood', 'stone', 'iron', 'bone', 'crystal', 'mithril', 'adamant'];
  D.MAT = ['wood', 'stone', 'iron', 'bone', 'crystal', 'mithril', 'adamant'];
  // Где берутся редкие ресурсы: кости — ворота, Катакомбы, Арена; мана-кристаллы — Катакомбы с 25-го этажа;
  // мифрил — Катакомбы с 50-го; адамантий — только Путешествие (открывается на 75-м этаже)
  D.CRYSTAL_FLOOR = 25; D.MITHRIL_FLOOR = 50; D.JOURNEY_FLOOR = 75;

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
  // Рабочие (итерация 59): каждый 2–4-й житель — рабочий; на здание до 3 рабочих (места с 1, 4 и 7-го уровня).
  // Рабочий бьёт по зданию раз в hit секунд: на Замке и добыче — как клик Короля силы pow[уровень] (без кирки и талантов Короля),
  // на Академии, Кузнице, Арене, Гильдии и в Катакомбах — +boost к скорости их дела.
  // pow подобран так, что 2 рабочих 8-го уровня добывают как прежние 15, а 3 — больше прежнего предела (19)
  D.WORK = {
    hit: 1.5, pow: [0, 0.6, 0.9, 1.2, 1.5, 1.9, 2.2, 2.5, 2.85], boost: 0.5, every: [2, 4], slotLvl: [1, 4, 7],
    b: ['castle', 'lumber', 'quarry', 'mine', 'academy', 'forge', 'arena', 'tavern', 'dungeon'],
  };

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
  D.FOLK = { tax: 0.03, perCastle: 5, perLevels: 2, every: 15 }; // 5 домов за уровень Замка: к концу эпохи ~80 жителей, ~27 рабочих

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
      // новые навыки: боевой клич (атака всего отряда), шипы, охотник на боссов, вампиризм, опыт
      { id: 'w6', cat: 'spec', icon: 'i_flag', eff: { partyAtk: 0.04 } },
      { id: 'w7', cat: 'def', icon: 'i_helmet', eff: { thorns: 0.15 } },
      { id: 'w8', cat: 'atk', icon: 'i_dragon', eff: { bossAtk: 0.12 } },
    ],
    archer: [
      { id: 'a1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.1, crit: 0.05 } },
      { id: 'a2', cat: 'def', icon: 'i_boot', eff: { dodge: 0.06 } },
      { id: 'a3', cat: 'heal', icon: 'i_heal', eff: { regen: 0.02, hp: 0.05 } },
      { id: 'a4', cat: 'loot', icon: 'i_chest', eff: { drop: 0.15, flee: 0.05 } },
      { id: 'a5', cat: 'spec', icon: 'it_bow:0', eff: { volley: 0.12 } },
      // новые навыки: боевой клич (атака всего отряда), шипы, охотник на боссов, вампиризм, опыт
      { id: 'a6', cat: 'atk', icon: 'i_star', eff: { critDmg: 0.3 } },
      { id: 'a7', cat: 'atk', icon: 'i_dragon', eff: { bossAtk: 0.12 } },
      { id: 'a8', cat: 'loot', icon: 'i_map', eff: { flee: 0.05, xp: 0.1 } },
    ],
    mage: [
      { id: 'm1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.12 } },
      { id: 'm2', cat: 'def', icon: 'i_def', eff: { def: 0.15, hp: 0.08 } },
      { id: 'm3', cat: 'heal', icon: 'i_heal', eff: { aura: 0.015 } },
      { id: 'm4', cat: 'loot', icon: 'r_crystal', eff: { loot: 0.08 } },
      { id: 'm5', cat: 'spec', icon: 'i_fire', eff: { splash: 0.2 } },
      // новые навыки: боевой клич (атака всего отряда), шипы, охотник на боссов, вампиризм, опыт
      { id: 'm6', cat: 'atk', icon: 'i_gem', eff: { crit: 0.05, critDmg: 0.25 } },
      { id: 'm7', cat: 'def', icon: 'i_def', eff: { dodge: 0.05, def: 0.1 } },
      { id: 'm8', cat: 'loot', icon: 'i_book', eff: { xp: 0.15 } },
    ],
    priest: [
      { id: 'p1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.12 } },
      { id: 'p2', cat: 'def', icon: 'i_shield2', eff: { partyDef: 0.08 } },
      { id: 'p3', cat: 'heal', icon: 'i_heal', eff: { heal: 0.2 } },
      { id: 'p4', cat: 'loot', icon: 'i_gem', eff: { drop: 0.15, loot: 0.04 } },
      { id: 'p5', cat: 'spec', icon: 'i_star', eff: { save: 0.1 } },
      // новые навыки: боевой клич (атака всего отряда), шипы, охотник на боссов, вампиризм, опыт
      { id: 'p6', cat: 'spec', icon: 'i_crown', eff: { partyAtk: 0.04 } },
      { id: 'p7', cat: 'heal', icon: 'i_heal', eff: { aura: 0.01 } },
      { id: 'p8', cat: 'atk', icon: 'i_dragon', eff: { bossAtk: 0.15 } },
    ],
    rogue: [
      { id: 'r1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.1, crit: 0.05 } },
      { id: 'r2', cat: 'def', icon: 'i_boot', eff: { dodge: 0.07 } },
      { id: 'r3', cat: 'heal', icon: 'i_heal', eff: { regen: 0.025 } },
      { id: 'r4', cat: 'loot', icon: 'i_bag', eff: { loot: 0.08, drop: 0.1 } },
      { id: 'r5', cat: 'spec', icon: 'it_dagger:0', eff: { critDmg: 0.5 } },
      // новые навыки: боевой клич (атака всего отряда), шипы, охотник на боссов, вампиризм, опыт
      { id: 'r6', cat: 'heal', icon: 'i_hp', eff: { life: 0.06 } },
      { id: 'r7', cat: 'atk', icon: 'i_dragon', eff: { bossAtk: 0.15 } },
      { id: 'r8', cat: 'def', icon: 'i_boot', eff: { dodge: 0.05, flee: 0.06 } },
    ],
    shaman: [
      { id: 's1', cat: 'atk', icon: 'i_atk', eff: { atk: 0.12 } },
      { id: 's2', cat: 'def', icon: 'i_def', eff: { def: 0.15, hp: 0.06 } },
      { id: 's3', cat: 'heal', icon: 'i_heal', eff: { aura: 0.012 } },
      { id: 's4', cat: 'loot', icon: 'i_gem', eff: { drop: 0.1, loot: 0.05 } },
      { id: 's5', cat: 'spec', icon: 'it_totem:0', eff: { stun: 0.06 } },
      // новые навыки: боевой клич (атака всего отряда), шипы, охотник на боссов, вампиризм, опыт
      { id: 's6', cat: 'spec', icon: 'i_fire', eff: { partyAtk: 0.04 } },
      { id: 's7', cat: 'heal', icon: 'i_heal', eff: { regen: 0.02, aura: 0.008 } },
      { id: 's8', cat: 'def', icon: 'i_shield2', eff: { thorns: 0.12 } },
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
    { adj: { m: 'мифриловый', f: 'мифриловая', en: 'Mithril' }, req: 5, atk: 26, def: 14, hp: 85, time: 90, wcost: { iron: 80, mithril: 8 }, acost: { iron: 100, mithril: 10 } },
    { adj: { m: 'драконий', f: 'драконья', en: 'Dragon' }, req: 7, atk: 48, def: 25, hp: 155, time: 180, wcost: { mithril: 25, crystal: 20, bone: 60 }, acost: { mithril: 30, crystal: 15, bone: 80 } },
    // адамант — из адамантия Путешествия, сильнейшая ступень
    { adj: { m: 'адамантовый', f: 'адамантовая', en: 'Adamantine' }, req: 8, atk: 90, def: 46, hp: 290, time: 300, wcost: { adamant: 12, mithril: 20 }, acost: { adamant: 15, mithril: 20 } },
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
  D.LEG = { p: 0.01, kMax: 2.4 };
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
    // особые стражи Катакомб (25, 50, 75, 100-й этаж); сила в походе считается по этажу, эти числа — для ворот
    colossus: { hp: 900, atk: 30, spd: 7, gold: 150, boss: true },
    demon: { hp: 1200, atk: 38, spd: 9, gold: 250, boss: true },
    wraith: { hp: 1500, atk: 45, spd: 10, gold: 400, boss: true },
    warden: { hp: 2000, atk: 50, spd: 7, gold: 600, boss: true },
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
  D.KING_MAX = 50;
  // Опыт Короля дают только стройка, помощь зданиям, добыча и сражения
  // 45·L^1,6: полная первая эпоха (~220 тыс. опыта) — около 38-го уровня, с «Мудростью правителя» и «Мудростью рода» — до 50-го
  D.kingXp = (L) => Math.round(45 * Math.pow(L, 1.6));
  // click — клик-добыча, help — клик-помощь зданию (стройка, Кузница, Академия, Арена, Гильдия, «Поторопить»),
  // build — ×L² за постройку/улучшение до уровня L, wave — ×n² за волну n, final — за дракона, hit — удар по врагу,
  // floor — ×f² за этаж f Катакомб, arena — ×ранг за победу, journey — ×этап за первое прохождение
  // rep — доля опыта за повтор уже пройденной волны или этажа (полный опыт — только за новый рекорд)
  D.KXP = { click: 1.5, help: 1.5, build: 16, wave: 6, final: 30000, hit: 1, floor: 0.2, arena: 5, journey: 300, rep: 0.1 };
  // Таланты короля: упор на автоматизацию. max — предел рангов таланта.
  D.TAL_MAX = 5;
  D.TALENTS = [
    // Рука короля
    { id: 'wisdom', br: 'hand', icon: 'i_book', eff: { kingXp: 0.2 } },
    { id: 'autoclick', br: 'hand', icon: 'i_pick', max: 3, eff: { autoClick: 1 } },
    { id: 'lucky', br: 'hand', icon: 'i_star', eff: { clickCrit: 0.04 } },
    { id: 'strike', br: 'hand', icon: 'i_atk', eff: { click: 0.2 } },
    { id: 'pick', br: 'hand', icon: 'i_pick', eff: { gather: 0.2 } },
    // Хозяйство
    { id: 'steward', br: 'eco', icon: 'i_pick', eff: { prod: 0.1 } },
    { id: 'crews', br: 'eco', icon: 'i_people', max: 3, eff: { wSpeed: 0.1 } }, // «Бригадиры»: рабочие бьют быстрее
    { id: 'tax', br: 'eco', icon: 'r_gold', eff: { tax: 0.15 } },
    // Строительство: «Прораб» — все ускорения кликом (стройка, Кузница, Академия, Арена, Гильдия, Катакомбы)
    { id: 'arch', br: 'build', icon: 'i_clock', eff: { buildT: 0.1 } },
    { id: 'foreman', br: 'build', icon: 'i_hammer', eff: { boost: 1, boostAll: 0.5 } },
    { id: 'thrift', br: 'build', icon: 'r_stone', max: 3, eff: { buildC: 0.1 } },
    // Армия: «Лекари» включают восстановление здоровья героев
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
    { id: 'treasurer', castle: 2, icon: 'r_gold', eff: { tax: 0.15 } },
    { id: 'marshal', castle: 3, icon: 'i_helmet', eff: { defAtk: 0.1, defDef: 0.1, gateHp: 0.1 } },
    { id: 'builder', castle: 3, icon: 'i_hammer', eff: { buildT: 0.1 } },
    { id: 'magister', castle: 4, icon: 'i_book', eff: { spellCd: 0.15, forgeLuck: 0.1 } },
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
    { id: 'maps', b: 'academy', acad: 3, icon: 'i_map', cost: { gold: 500, wood: 300, bone: 20 }, t: 480, eff: { expTravel: 0.3 } },
    // 4
    { id: 'council', b: 'academy', acad: 4, icon: 'i_people', cost: { gold: 1000, wood: 600, stone: 600, bone: 25 }, t: 600, eff: { resSlots: 1 } },
    { id: 'storage', b: 'warehouse', acad: 4, icon: 'i_bag', cost: { gold: 1000, wood: 800, stone: 800 }, t: 600, eff: { store: 0.25 } },
    { id: 'training', b: 'tavern', acad: 4, icon: 'i_star', cost: { gold: 900, iron: 300, bone: 30 }, t: 600, eff: { hireC: 0.25, advXp: 0.25 } },
    { id: 'runes', b: 'forge', acad: 4, icon: 'i_gem', cost: { gold: 800, crystal: 20, stone: 400 }, t: 600, eff: { enchant: 1 } },
    // 5
    { id: 'medicine', b: 'tavern', acad: 5, icon: 'i_heal', cost: { gold: 1200, bone: 80 }, t: 800, eff: { recover: 1, save: 0.1 } },
    { id: 'gladiators', b: 'arena', acad: 5, icon: 'i_atk', cost: { gold: 1300, wood: 800, stone: 800 }, t: 800, eff: { arenaLoot: 0.25 } },
    { id: 'workcamps', b: ['lumber', 'quarry', 'mine'], acad: 5, icon: 'i_people', cost: { gold: 1500, wood: 1000, stone: 1000, iron: 300 }, t: 900, eff: { wSpeed: 0.2 } }, // «Рабочие посёлки»: рабочие на 20% быстрее
    { id: 'library', b: 'academy', acad: 5, icon: 'i_book', cost: { gold: 1400, wood: 800, stone: 600 }, t: 800, eff: { resSpeed: 0.25 } },
    // 6
    { id: 'guard', b: 'barracks', acad: 6, req: 'bows', icon: 'i_helmet', cost: { gold: 2500, iron: 1200 }, t: 1200, eff: { guards: 3, guardSpd: 0.25 } },
    { id: 'treasury', b: 'castle', acad: 6, icon: 'i_chest', cost: { gold: 2500, stone: 1500, iron: 500 }, t: 1200, eff: { goldCap: 0.3 } },
    { id: 'dragon', b: 'academy', acad: 6, req: 'maps', icon: 'i_dragon', cost: { gold: 4000, mithril: 40, crystal: 60 }, t: 1500, eff: { bossDmg: 0.25 } },
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
  // Золото этажа: до 15-го этажа растёт как раньше (×1,2), дальше — мягче (степенью), чтобы на глубине не было миллионов
  const goldF = (f) => (f <= 15 ? 12 * Math.pow(1.2, f - 1) : 12 * Math.pow(1.2, 14) * Math.pow(f / 15, 2.2));
  const L = (f, m) => ({ gold: Math.round(goldF(f) * m.g), bone: Math.round((1 + f * 0.6) * m.b) });
  // Катакомбы — одна бесконечная локация. Сила врагов: до f0 этажа прежний рост, дальше мягче (gh, ga за этаж).
  // Особые стражи на 25, 50, 75 и 100-м этаже сильнее обычных боссов (bigHp, bigAtk); 100-й будит дракона.
  D.CAT = { f0: 15, f1: 50, gh: 1.06, ga: 1.048, gh2: 1.036, ga2: 1.027, bigHp: 1.6, bigAtk: 1.3, wardHp: 1.25, wardAtk: 1.1, xpG: 1.12 };
  D.CAT_BOSS = { 25: 'colossus', 50: 'demon', 75: 'wraith', 100: 'warden' };
  D.LOCS = {
    catacombs: {
      icon: 'b_dungeon', pos: [30, 38], floors: 0, diff: 1,
      pool: (f) => (f <= 3 ? ['slime', 'goblin', 'spider'] : f <= 7 ? ['goblin', 'skeleton', 'wolf', 'spider'] : ['skeleton', 'orc', 'wolf', 'spider']),
      boss: (f) => D.CAT_BOSS[f] || (f % 10 === 5 ? (f > 50 ? 'golem' : 'troll') : f > 60 ? 'guardian' : 'lich'),
      loot(f, boss) {
        const m = boss ? 2.5 : 1;
        const o = L(f, { g: m, b: m });
        if (f >= D.CRYSTAL_FLOOR) o.crystal = Math.max(1, Math.round((f - D.CRYSTAL_FLOOR + 2) * 0.5 * m));
        if (f >= D.MITHRIL_FLOOR) o.mithril = Math.max(1, Math.round((Math.floor((f - D.MITHRIL_FLOOR) / 4) + 1 + (Math.random() < 0.5 ? 1 : 0)) * m));
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
  // Затопленная шахта и Логово больше не открываются: остались только для походов из старых сохранений
  D.LOC_ORDER = ['catacombs'];

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
  // Очки наследия: maxB — сразу за здание 8-го уровня (раз за правление на каждое); в формуле передачи трона
  // лучший ранг Арены ×arena и этапы Путешествия, пройденные в этом правлении, ×jr (вся сумма ÷5)
  D.LEGACY = { maxB: 1, arena: 1, jr: 5 }; // Арена ×1: рангов после смягчения (итерация 58) почти вдвое больше
  // Древо династии: ствол из трёх ступеней (открываются по вложенным рангам: 0 / 10 / 25), от каждой — ветки влево и вправо.
  // Ступень I — клик и пассивный рост, II — средние навыки, III — самые сильные.
  // c — колонка (0–6, ствол — 3), r — строка, t — ступень, p — навык-родитель (без него — сама ступень)
  D.DYN_COLS = 7;
  D.DYN_TIERS = [{ need: 0, r: 0 }, { need: 10, r: 4 }, { need: 25, r: 8 }];
  D.DYN_ROWS = 10;
  D.DYN_TREE = {
    // I — клик, пассивный рост и основа хозяйства
    prod: { t: 0, c: 2, r: 0 }, cap: { t: 0, c: 1, r: 0, p: 'prod' }, housing: { t: 0, c: 0, r: 0, p: 'cap' },
    tax: { t: 0, c: 2, r: 1 }, start: { t: 0, c: 1, r: 1, p: 'tax' }, build: { t: 0, c: 2, r: 2 },
    click: { t: 0, c: 4, r: 0 }, crit: { t: 0, c: 5, r: 0, p: 'click' }, hire: { t: 0, c: 4, r: 1 },
    // II — средние: скидки, герои, кузня, оборона
    found: { t: 1, c: 2, r: 4 }, thrift: { t: 1, c: 1, r: 4, p: 'found' },
    workers: { t: 1, c: 2, r: 5 }, example: { t: 1, c: 1, r: 5, p: 'workers' },
    craft: { t: 1, c: 2, r: 6 }, luck: { t: 1, c: 1, r: 6, p: 'craft' }, trade: { t: 1, c: 0, r: 6, p: 'luck' },
    hero: { t: 1, c: 4, r: 4 }, xp: { t: 1, c: 5, r: 4, p: 'hero' },
    captain: { t: 1, c: 4, r: 5 }, medic: { t: 1, c: 5, r: 5, p: 'captain' }, blood: { t: 1, c: 6, r: 5, p: 'medic' },
    walls: { t: 1, c: 4, r: 6 }, guards: { t: 1, c: 5, r: 6, p: 'walls' },
    // III — то, что все хотят: всё в королевстве идёт быстрее и богаче
    research: { t: 2, c: 2, r: 8 }, golden: { t: 2, c: 1, r: 8, p: 'research' }, legacy: { t: 2, c: 2, r: 9 },
    haste: { t: 2, c: 4, r: 8 }, prosper: { t: 2, c: 4, r: 9 },
  };
  D.PERKS = [
    { id: 'found', icon: 'i_hammer', eff: {} },
    // Навыки рода выровнены по силе: каждый ранг ощутим, ни один путь не «единственно верный»
    { id: 'prod', icon: 'i_pick', eff: { prod: 0.1 } },
    { id: 'click', icon: 'i_atk', eff: { gather: 0.25, click: 0.25 } },
    { id: 'luck', icon: 'i_gem', eff: { luck: 0.1 } },
    { id: 'start', icon: 'i_chest', eff: { start: 1 } },
    { id: 'xp', icon: 'i_star', eff: { xp: 0.15 } },
    { id: 'cap', icon: 'i_bag', eff: { passive: 0.08 } },
    { id: 'build', icon: 'i_clock', eff: { buildT: 0.1 } },
    { id: 'tax', icon: 'r_gold', eff: { tax: 0.15 } },
    { id: 'trade', icon: 'i_atk', eff: { arenaLoot: 0.15 } }, // «Слава арены» (бывший Торговый дом)
    { id: 'craft', icon: 'i_anvil', eff: { craft: 0.15 } },
    { id: 'hero', icon: 'i_people', eff: { advXp: 0.15 } },
    { id: 'hire', icon: 'i_coin', eff: { hireC: 0.06 } },
    { id: 'guards', icon: 'i_helmet', eff: { guardAtk: 0.15 } },
    { id: 'walls', icon: 'i_def', eff: { gateHp: 0.15 } },
    { id: 'captain', icon: 'i_map', eff: { captain: 0.1 } },
    { id: 'medic', icon: 'i_heal', eff: { medic: 0.15, save: 0.03 } },
    { id: 'research', icon: 'i_book', eff: { resSpeed: 0.2 } },
    { id: 'crit', icon: 'i_star', eff: { clickCrit: 0.03 } },
    // новые: пассивный рост, скидки и сила
    { id: 'housing', icon: 'c_folk', eff: { housing: 2 } },
    { id: 'example', icon: 'c_king', eff: { clickProd: 0.5 } },
    { id: 'thrift', icon: 'i_scale', eff: { buildC: 0.05 } },
    { id: 'workers', icon: 'r_wood', eff: { wSpeed: 0.05 } }, // «Рабочие руки»: +5% к скорости рабочих
    { id: 'golden', icon: 'r_crystal', eff: { rewardAll: 0.1 } },
    { id: 'blood', icon: 'i_shield2', eff: { heroPow: 0.05 } },
    // ступень III: ускоряют всё
    { id: 'haste', icon: 'i_boot', eff: { haste: 0.08 } }, // «Время королей»: стройка, исследования, ковка, походы, Арена, жители
    { id: 'prosper', icon: 'i_up', eff: { passive: 0.1 } }, // «Процветание»: вся пассивная добыча
    { id: 'legacy', icon: 'i_crown', eff: { legacy: 0.1 } }, // «Слава династии»: больше очков наследия
  ];

  // ---------- цели (обучение и кампания) ----------
  const R = (S, id) => !!S.research.done[id];
  // h — что подсвечивать для цели: здание на карте (b), вкладку (tab), кнопку действия (act, arg)
  // 90 целей: id — для переноса прогресса старых сохранений, t — ключ текста
  // Порядок прежнего списка из 90 целей: по нему переносится прогресс старых сохранений
  D.GOALS_V2 = ['g0', 'g1', 'g2', 'n1', 'g3', 'n2', 'g4', 'n3', 'g5', 'n4', 'n5', 'g6', 'g7', 'n6', 'n7', 'g8', 'g9', 'g10', 'n8', 'g11', 'g12', 'g13', 'n9', 'g14', 'n10', 'n11', 'g15', 'n12', 'n13', 'n14', 'n15', 'g16', 'g17', 'n16', 'n17', 'g18', 'n18', 'g19', 'n19', 'n20', 'n21', 'n22', 'g20', 'n23', 'g21', 'g22', 'n24', 'n25', 'n26', 'n27', 'n28', 'n29', 'n30', 'n31', 'n32', 'n33', 'n34', 'n35', 'n36', 'g23', 'n37', 'n38', 'n39', 'n40', 'n41', 'n42', 'n43', 'g24', 'n44', 'n45', 'n46', 'g25', 'n47', 'n48', 'n49', 'g26', 'n50', 'n51', 'n52', 'n53', 'n54', 'n55', 'n56', 'n57', 'g27', 'n58', 'n59', 'g28', 'n60', 'g29'];
  // Порядок списка версии 3 (119 целей): по нему переносится прогресс
  D.GOALS_V3 = ['g0', 'g1', 'g2', 'm1', 'n1', 'g3', 'n2', 'g4', 'm2', 'g5', 'n4', 'm3', 'n5', 'g6', 'g7', 'n6', 'n7', 'g8', 'g9', 'g10', 'm4', 'g11', 'g12', 'g13', 'g14', 'n10', 'm5', 'n11', 'g15', 'm6', 'm7', 'g16', 'g17', 'n16', 'n17', 'm8', 'g18', 'n18', 'g19', 'n20', 'n21', 'm9', 'g20', 'n23', 'm10', 'g21', 'g22', 'n24', 'n25', 'm11', 'n26', 'n27', 'n28', 'n29', 'm12', 'n30', 'n31', 'n32', 'n33', 'n34', 'n35', 'n36', 'm13', 'm14', 'g23', 'n37', 'n38', 'n39', 'n40', 'm15', 'n41', 'n42', 'm16', 'n43', 'g24', 'n44', 'n45', 'n46', 'm17', 'g25', 'n47', 'm18', 'n48', 'n49', 'g26', 'm19', 'n50', 'n51', 'n52', 'm20', 'n53', 'n54', 'n55', 'm21', 'n56', 'n57', 'm22', 'g27', 'm23', 'n58', 'm24', 'n59', 'm25', 'm26', 'g28', 'm27', 'n60', 'm28', 'm29', 'm30', 'g29', 'm31', 'm32', 'm33', 'm34', 'm35', 'm36', 'm37', 'm38'];
  // Порядок списка версии 4 (114 целей)
  D.GOALS_V4 = ['g0', 'g1', 'g2', 'm1', 'n1', 'g3', 'n2', 'g4', 'm2', 'g5', 'n4', 'm3', 'n5', 'g6', 'g7', 'n6', 'n7', 'g8', 'g9', 'g10', 'm4', 'g11', 'g12', 'g13', 'g14', 'n10', 'm5', 'n11', 'g15', 'm6', 'm7', 'g16', 'g17', 'n16', 'n17', 'm8', 'g18', 'n18', 'g19', 'n20', 'n21', 'm9', 'g20', 'n23', 'm10', 'g21', 'g22', 'n24', 'n25', 'm11', 'n26', 'n27', 'n28', 'n29', 'm12', 'n30', 'n31', 'n32', 'n33', 'n34', 'n35', 'n36', 'm13', 'm14', 'g23', 'n37', 'n38', 'n39', 'n40', 'm15', 'n41', 'n42', 'm16', 'n43', 'g24', 'n44', 'n45', 'n46', 'm17', 'g25', 'n47', 'm18', 'n48', 'n49', 'g26', 'm19', 'n50', 'n51', 'n52', 'm20', 'n53', 'n54', 'n55', 'm21', 'n56', 'n57', 'm22', 'g27', 'm23', 'n58', 'm24', 'm25', 'm26', 'm27', 'n60', 'm28', 'm29', 'm30', 'm32', 'm33', 'm35', 'm37', 'g28', 'g29'];
  // Порядок списка версии 6 (115 целей, итерация 57): по нему переносится прогресс в нынешний список
  D.GOALS_V6 = ['g0', 'g1', 'g2', 'm1', 'n1', 'g3', 'n2', 'g4', 'm2', 'g5', 'n4', 'm3', 'n5', 'g6', 'g7', 'n6', 'n7', 'g8', 'g9', 'g10', 'm4', 'g11', 'g12', 'g13', 'g14', 'n10', 'm5', 'n11', 'g15', 'm6', 'm7', 'g16', 'g17', 'n16', 'n17', 'm8', 'g18', 'n18', 'g19', 'n20', 'n21', 'm9', 'g20', 'n23', 'm10', 'g21', 'g22', 'n24', 'n25', 'm11', 'n26', 'n27', 'n28', 'n29', 'm12', 'n30', 'n31', 'n32', 'n33', 'n34', 'n35', 'n36', 'm13', 'm14', 'g23', 'n37', 'n38', 'n39', 'n40', 'm15', 'n41', 'n42', 'm16', 'n43', 'g24', 'c20', 'n45', 'n46', 'm17', 'g25', 'n47', 'm18', 'n48', 'n49', 'g26', 'm19', 'n50', 'n51', 'n52', 'm20', 'n53', 'n54', 'c25', 'n55', 'm21', 'n56', 'n57', 'm22', 'g27', 'm23', 'c50', 'm24', 'm25', 'm26', 'm27', 'n60', 'm28', 'm29', 'm30', 'm32', 'm33', 'c75', 'm37', 'g28', 'g29'];
  // 100 целей (итерация 58). id — для переноса прогресса, текст — по ключу q_<id>.
  // Награда — 25–50% вместимости склада на этом этапе: Склад 0 — 100 / 250 золота, 1 — 200 / 500, 2 — 400 / 1000 и т. д.
  // n + d — «сделай N с момента, когда цель принята»; n без d — достичь значения
  const ALL_B = () => D.ORDER.filter((k) => !D.B[k].noLevel);
  const DONE_R = (S) => D.RESEARCH.filter((r) => S.research.done[r.id]).length;
  const CAT = { b: 'dungeon', tab: 'exp', act: ['pickParty', 'send'] };
  const ARENA = { b: 'arena', act: ['arenaPick', 'arenaFight'] };
  const slot = (it) => D.ITYPES[it.type] && D.ITYPES[it.type].slot;
  D.GOALS = [
    // Склад 0: город с нуля
    { id: 'g0', h: { b: 'castle', act: 'gather' }, test: (S) => (S.stats.c_castle || 0) >= 10 || S.b.lumber.lvl >= 1, reward: { gold: 30 } },
    { id: 'g1', h: { b: 'lumber', act: 'up' }, test: (S) => S.b.lumber.lvl >= 1, reward: { wood: 30 } },
    { id: 'g2', h: { b: 'lumber', act: 'wkAdd' }, test: (S) => S.b.lumber.w >= 1, reward: { gold: 40 } },
    { id: 'q1', h: { b: 'lumber', act: 'gather' }, v: (S) => S.stats.c_lumber || 0, n: 30, d: true, reward: { gold: 50 } },
    { id: 'g3', h: { b: 'quarry', act: 'up' }, test: (S) => S.b.quarry.lvl >= 1, reward: { stone: 40 } },
    { id: 'n2', h: { b: 'quarry', act: 'wkAdd' }, test: (S) => S.b.quarry.w >= 1, reward: { wood: 40 } },
    { id: 'g4', h: { b: 'warehouse', act: 'up' }, test: (S) => S.b.warehouse.lvl >= 1, reward: { gold: 100 } },
    // Склад 1: 200 ресурсов, 500 золота
    { id: 'q2', h: { b: 'lumber', act: 'gather' }, test: (S) => S.res.wood >= 200, reward: { gold: 150 } },
    { id: 'm2', h: { b: 'castle', act: 'gather' }, v: (S) => S.stats.clicks, n: 200, d: true, reward: { stone: 100 } },
    { id: 'g5', h: { b: 'mine', act: 'up' }, test: (S) => S.b.mine.lvl >= 1, reward: { iron: 50 } },
    { id: 'n4', h: { b: 'mine', act: 'wkAdd' }, test: (S) => S.b.mine.w >= 1, reward: { gold: 100 } },
    { id: 'm3', h: { b: () => G.E.wkGoalB(), act: 'wkAdd' }, v: () => G.E.wkUsed(), n: 5, reward: { gold: 250 } },
    { id: 'n5', h: { b: 'castle', act: 'tools' }, test: (S) => S.king.tools >= 1, reward: { iron: 60 } },
    { id: 'g6', h: { b: 'forge', act: 'up' }, test: (S) => S.b.forge.lvl >= 1, reward: { iron: 80 } },
    { id: 'n7', h: { b: 'forge', act: 'wkAdd' }, test: (S) => S.b.forge.w >= 1, reward: { gold: 150 } },
    { id: 'g7', h: { b: 'forge', act: 'craft' }, test: (S) => S.stats.crafted >= 1, reward: { iron: 80 } },
    { id: 'n6', h: { b: 'castle', act: 'pick' }, test: (S) => S.items.some((i) => i.eq === 'king'), reward: { gold: 150 } },
    { id: 'g8', h: { b: 'tavern', act: 'up' }, test: (S) => S.b.tavern.lvl >= 1, reward: { gold: 200 } },
    { id: 'g9', h: { b: 'tavern', act: 'hire' }, test: (S) => S.advs.length >= 1, reward: { iron: 80 } },
    { id: 'g10', h: { tab: 'guild', act: 'pick' }, test: (S) => S.items.some((i) => i.eq && i.eq !== 'king'), reward: { gold: 200 } },
    { id: 'm4', h: { b: 'forge', act: 'craft' }, v: (S) => S.stats.crafted || 0, n: 5, d: true, reward: { iron: 120 } },
    { id: 'g11', h: { b: 'gate', act: 'up' }, test: (S) => S.b.gate.lvl >= 1, reward: { stone: 120 } },
    { id: 'g19', h: { b: 'barracks', act: ['up', 'guard'] }, test: (S) => S.guards >= 1, reward: { iron: 100 } },
    { id: 'g12', h: { b: 'gate', act: 'gate' }, test: (S) => S.advs.some((a) => a.st === 'gate'), reward: { gold: 200 } },
    { id: 'g13', h: { b: 'gate', act: 'fight' }, test: (S) => S.gate.best >= 1, reward: { gold: 200, bone: 10 } },
    { id: 'g14', h: CAT, test: (S) => (S.dng.best.catacombs || 0) >= 1, reward: { gold: 200, bone: 10 } },
    { id: 'n10', h: { tab: 'guild', act: 'learn' }, test: (S) => S.advs.some((a) => Object.values(a.sk || {}).some((v) => v > 0)), reward: { gold: 200 } },
    { id: 'm5', h: { b: 'gate', act: 'fight' }, v: (S) => S.stats.waves || 0, n: 10, d: true, reward: { gold: 300, bone: 40 } },
    { id: 'q3', h: { tab: 'decree', act: 'decreeAdd', arg: 'castle' }, test: (S) => (S.stats.d_castle || 0) >= 1 || S.b.castle.lvl >= 2, reward: { wood: 120, stone: 120 } },
    // Склад 2: 400 / 1000
    { id: 'm6', h: { b: 'lumber', act: 'up' }, v: (S) => ALL_B().filter((k) => k !== 'castle' && S.b[k].lvl >= 2).length, n: 5, reward: { gold: 500 } },
    { id: 'm7', h: CAT, v: (S) => S.stats.floors || 0, n: 10, d: true, reward: { bone: 60 } },
    { id: 'g16', h: { b: 'academy', act: 'up' }, test: (S) => S.b.academy.lvl >= 1, reward: { gold: 400 } },
    { id: 'g17', h: { b: 'academy', act: 'research' }, test: (S) => Object.keys(S.research.done).length >= 1, reward: { gold: 400 } },
    { id: 'n17', h: { b: 'academy', act: 'resQueue' }, test: (S) => (S.stats.resQueued || 0) >= 1, reward: { gold: 300 } },
    { id: 'm8', h: { b: 'castle', act: 'gather' }, v: (S) => S.stats.g_gold || 0, n: 500, d: true, reward: { wood: 200, stone: 200 } },
    { id: 'g18', h: { b: 'arena', act: 'up' }, test: (S) => S.b.arena.lvl >= 1, reward: { gold: 400 } },
    { id: 'n18', h: ARENA, test: (S) => (S.arena.wins || 0) >= 1, reward: { bone: 40 } },
    { id: 'n20', h: { tab: 'king', act: 'talent' }, test: (S) => Object.values(S.king.tal).some((v) => v > 0), reward: { gold: 400 } },
    { id: 'n21', h: { tab: 'king', act: 'cast' }, test: (S) => (S.stats.spells || 0) >= 1, reward: { gold: 400 } },
    // Склад 3: 800 / 2000
    { id: 'm9', h: { b: () => G.E.wkGoalB(), act: 'wkAdd' }, v: () => G.E.wkUsed(), n: 9, reward: { gold: 1000 } },
    { id: 'g25', h: { b: 'gate', act: 'fight' }, test: (S) => S.gate.best >= 10, reward: { gold: 800, bone: 60 } },
    { id: 'c20', h: CAT, v: (S) => S.dng.best.catacombs || 0, n: 20, reward: { bone: 150 } },
    { id: 'm10', h: { b: 'tavern', act: 'hire' }, v: (S) => S.stats.hires || 0, n: 2, d: true, reward: { gold: 800 } },
    { id: 'q4', h: { tab: 'king' }, v: (S) => S.king.lvl, n: 10, reward: { gold: 1000 } },
    { id: 'n24', h: { b: 'castle', act: 'up', el: '#folk' }, test: (S) => (S.folk || 0) >= 10, reward: { gold: 800 } },
    { id: 'q5', h: { b: 'castle', act: 'up' }, v: (S) => ALL_B().filter((k) => S.b[k].lvl >= 4).length, n: 11, reward: { gold: 2000 } },
    // Склад 4: 1600 / 4000
    { id: 'm11', h: ARENA, v: (S) => S.arena.wins || 0, n: 5, d: true, reward: { bone: 150 } },
    { id: 'n27', h: { b: 'forge', act: 'craft' }, test: (S) => S.items.some((i) => i.ti >= 1), reward: { iron: 400 } },
    { id: 'm12', h: { b: 'gate', act: 'fight' }, v: (S) => S.stats.kills || 0, n: 100, d: true, reward: { gold: 1500, bone: 80 } },
    { id: 'n30', h: { b: 'academy', act: 'research', arg: 'mining' }, test: (S) => R(S, 'mining'), reward: { iron: 400 } },
    { id: 'n31', h: { b: 'academy', act: 'research', arg: 'builders' }, test: (S) => R(S, 'builders'), reward: { stone: 500 } },
    { id: 'n33', h: { b: 'academy', act: 'research', arg: 'gates' }, test: (S) => R(S, 'gates'), reward: { stone: 500 } },
    { id: 'm13', h: { b: 'forge', act: 'craft' }, v: (S) => S.stats.crafted || 0, n: 20, d: true, reward: { iron: 600 } },
    { id: 'm14', h: { b: 'barracks', act: 'guard' }, v: (S) => S.guards, n: 5, reward: { iron: 500 } },
    { id: 'n39', h: { b: 'academy', act: 'research', arg: 'council' }, test: (S) => R(S, 'council'), reward: { gold: 2000 } },
    { id: 'm15', h: CAT, v: (S) => S.stats.floors || 0, n: 30, d: true, reward: { bone: 300 } },
    { id: 'n42', h: { b: 'tavern', act: 'hire' }, test: (S) => S.advs.some((a) => a.rar >= 1), reward: { gold: 1500 } },
    { id: 'm16', h: { b: 'gate', act: 'fight' }, v: (S) => S.stats.waves || 0, n: 20, d: true, reward: { gold: 2000, bone: 150 } },
    { id: 'n43', h: { tab: 'guild' }, v: (S) => S.advs.reduce((m, a) => Math.max(m, a.lvl), 0), n: 15, reward: { gold: 2000 } },
    { id: 'g24', h: { b: 'academy', act: 'research', arg: 'maps' }, test: (S) => R(S, 'maps'), reward: { gold: 2000 } },
    // Склад 5: 3200 / 8000
    { id: 'q6', h: CAT, v: (S) => S.stats.e_bone || 0, n: 500, d: true, reward: { gold: 3000 } },
    { id: 'n45', h: { b: 'academy', act: 'research', arg: 'runes' }, test: (S) => R(S, 'runes'), reward: { crystal: 60 } },
    { id: 'n46', h: { tab: 'armory', act: 'enchant' }, test: (S) => (S.stats.enchanted || 0) >= 1, reward: { crystal: 60 } },
    { id: 'm17', h: { b: 'academy', act: 'research' }, v: DONE_R, n: 5, d: true, reward: { gold: 4000 } },
    { id: 'q7', h: { b: 'gate', act: 'fight' }, v: (S) => S.gate.best, n: 30, reward: { gold: 4000, bone: 300 } },
    { id: 'q8', h: { tab: 'king' }, v: (S) => S.king.lvl, n: 20, reward: { gold: 4000 } },
    { id: 'n48', h: { b: 'castle', act: 'up', el: '#folk' }, v: (S) => S.folk || 0, n: 30, reward: { gold: 3000 } },
    { id: 'q9', h: { b: 'quarry', act: 'gather' }, v: (S) => S.stats.g_stone || 0, n: 10000, d: true, reward: { iron: 1000 } },
    { id: 'c50', h: CAT, v: (S) => S.dng.best.catacombs || 0, n: 50, reward: { crystal: 150, mithril: 50 } },
    { id: 'm19', h: { b: 'castle', act: 'gather' }, v: (S) => S.stats.g_gold || 0, n: 10000, d: true, reward: { wood: 1500, stone: 1500 } },
    { id: 'n50', h: { b: 'castle', act: 'up' }, test: (S) => S.b.castle.lvl >= 5, reward: { gold: 4000 } },
    { id: 'n51', h: { b: 'forge', act: 'up' }, test: (S) => S.b.forge.lvl >= 5, reward: { mithril: 60 } },
    { id: 'n52', h: { b: 'forge', act: 'craft' }, test: (S) => S.items.some((i) => i.ti >= 2), reward: { crystal: 150 } },
    { id: 'm20', h: { b: 'gate', act: 'fight' }, v: (S) => S.stats.kills || 0, n: 500, d: true, reward: { gold: 5000, bone: 400 } },
    { id: 'q10', h: { b: 'gate', act: 'fight' }, v: (S) => S.gate.best, n: 35, reward: { gold: 5000, bone: 400 } },
    // Склад 6: 6400 / 16 000
    { id: 'm18', h: ARENA, v: (S) => S.arena.best || 0, n: 20, reward: { crystal: 200, mithril: 60 } },
    { id: 'q11', h: { b: 'lumber', act: 'gather' }, v: (S) => S.stats.g_wood || 0, n: 10000, d: true, reward: { iron: 2000 } },
    { id: 'c75', h: CAT, v: (S) => S.dng.best.catacombs || 0, n: 75, reward: { mithril: 200, crystal: 200 } },
    { id: 'n55', h: { b: 'tavern', act: 'hire' }, test: (S) => S.advs.some((a) => a.rar >= 2), reward: { gold: 8000 } },
    { id: 'm21', h: { tab: 'armory', act: 'enchant' }, v: (S) => S.stats.enchanted || 0, n: 10, d: true, reward: { crystal: 300 } },
    { id: 'm25', h: { b: 'castle', act: 'up' }, v: (S) => S.b.castle.lvl, n: 7, reward: { gold: 10000 } },
    // Склад 7: 12 800 / 32 000
    { id: 'q12', h: { b: 'warehouse', act: 'up' }, v: (S) => S.b.warehouse.lvl, n: 7, reward: { wood: 5000, stone: 5000 } },
    { id: 'm22', h: { b: 'lumber', act: 'up' }, v: (S) => Math.min(S.b.lumber.lvl, S.b.quarry.lvl, S.b.mine.lvl), n: 7, reward: { gold: 15000 } },
    { id: 'm23', h: ARENA, v: (S) => S.arena.wins || 0, n: 20, d: true, reward: { crystal: 300, mithril: 100 } },
    { id: 'q13', h: { el: '#journey-btn' }, test: (S) => ((S.jr && S.jr.best) || 0) >= 1, reward: { adamant: 15 } },
    { id: 'q14', h: { tab: 'guild', act: 'pick' }, test: (S) => S.advs.length > 0 && S.advs.every((a) => ['weapon', 'armor'].every((sl) => S.items.some((i) => i.eq === a.id && slot(i) === sl))), reward: { mithril: 150 } },
    { id: 'q15', h: { b: 'mine', act: 'gather' }, v: (S) => S.stats.g_iron || 0, n: 10000, d: true, reward: { gold: 15000 } },
    { id: 'q16', h: CAT, v: (S) => S.dng.best.catacombs || 0, n: 85, reward: { mithril: 300, crystal: 300 } },
    { id: 'm27', h: { b: 'forge', act: 'craft' }, test: (S) => S.items.some((i) => i.rar >= 3), reward: { crystal: 400 } },
    { id: 'q17', h: { b: 'gate', act: 'fight' }, v: (S) => S.gate.best, n: 50, reward: { gold: 20000, bone: 1500 } },
    { id: 'm28', h: { b: 'castle', act: 'up' }, v: (S) => S.b.castle.lvl, n: 8, reward: { gold: 20000 } },
    { id: 'm29', h: { b: 'warehouse', act: 'up' }, v: (S) => S.b.warehouse.lvl, n: 8, reward: { gold: 25000 } },
    // Склад 8: без ограничений
    { id: 'm30', h: { b: 'academy', act: 'research' }, v: DONE_R, n: D.RESEARCH.length, reward: { crystal: 500, mithril: 200 } },
    { id: 'q18', h: { el: '#journey-btn' }, v: (S) => (S.jr && S.jr.best) || 0, n: 10, reward: { adamant: 50 } },
    { id: 'm33', h: ARENA, v: (S) => S.arena.best || 0, n: 30, reward: { mithril: 300, crystal: 500 } },
    { id: 'q19', h: CAT, v: (S) => S.stats.e_mithril || 0, n: 1000, d: true, reward: { adamant: 40 } },
    { id: 'q20', h: { el: '#journey-btn' }, v: (S) => S.stats.e_adamant || 0, n: 200, d: true, reward: { mithril: 500 } },
    { id: 'g28', h: CAT, test: (S) => S.camp.awake, reward: { gold: 50000, crystal: 500 } },
    { id: 'g27', h: { b: 'academy', act: 'research', arg: 'dragon' }, test: (S) => R(S, 'dragon'), reward: { gold: 20000, crystal: 300 } },
    { id: 'g29', h: { b: 'gate', act: 'fightFinal' }, test: (S) => S.camp.won, reward: { gold: 50000, mithril: 300 } },
  ];
  for (const g of D.GOALS) g.t = 'q_' + g.id;

})();
