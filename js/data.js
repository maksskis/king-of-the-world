(function () {
  const D = (G.D = {});

  D.RES = ['gold', 'wood', 'stone', 'iron', 'bone', 'crystal', 'mithril'];
  D.RES_NAME = {
    gold: { ru: 'Золото', en: 'Gold' },
    wood: { ru: 'Дерево', en: 'Wood' },
    stone: { ru: 'Камень', en: 'Stone' },
    iron: { ru: 'Железо', en: 'Iron' },
    bone: { ru: 'Кости монстров', en: 'Monster bones' },
    crystal: { ru: 'Мана-кристаллы', en: 'Mana crystals' },
    mithril: { ru: 'Мифрил', en: 'Mithril' },
  };

  D.MAXLVL = 12;

  // x, y — позиция слота на карте 320×200 (левый верхний угол спрайта 40×40).
  D.B = {
    castle: {
      name: { ru: 'Замок', en: 'Castle' },
      desc: { ru: 'Сердце королевства. Здесь собирают налоги, а уровень замка ограничивает уровень остальных построек.', en: 'The heart of the kingdom. Taxes are collected here, and its level caps every other building.' },
      x: 110, y: 4, base: { gold: 120, wood: 80, stone: 80 }, mult: 2.1, max: 10, click: 'gold',
    },
    lumber: {
      name: { ru: 'Лесопилка', en: 'Lumber camp' },
      desc: { ru: 'Дровосеки валят лес. Кликай, чтобы рубить самому.', en: 'Woodcutters fell trees. Click to chop yourself.' },
      x: 12, y: 8, base: { gold: 30, stone: 15 }, mult: 1.7, click: 'wood', prod: 'wood',
    },
    quarry: {
      name: { ru: 'Каменоломня', en: 'Quarry' },
      desc: { ru: 'Каменотёсы добывают камень для стен и построек.', en: 'Stonecutters quarry stone for walls and buildings.' },
      x: 16, y: 148, base: { gold: 30, wood: 15 }, mult: 1.7, click: 'stone', prod: 'stone',
    },
    mine: {
      name: { ru: 'Шахта', en: 'Mine' },
      desc: { ru: 'Шахтёры добывают железную руду — основу оружия и брони.', en: 'Miners dig iron ore — the basis of weapons and armor.' },
      x: 92, y: 148, base: { gold: 60, wood: 40, stone: 30 }, mult: 1.75, click: 'iron', prod: 'iron',
    },
    forge: {
      name: { ru: 'Кузница', en: 'Forge' },
      desc: { ru: 'Куёт оружие и броню. Кликай по кузнице, чтобы помочь молотом.', en: 'Forges weapons and armor. Click the forge to lend a hammer.' },
      x: 40, y: 66, base: { gold: 80, wood: 50, stone: 40, iron: 15 }, mult: 1.8,
    },
    tavern: {
      name: { ru: 'Таверна', en: 'Tavern' },
      desc: { ru: 'Сюда приходят авантюристы в поисках работы. Здесь же собирается гильдия.', en: 'Adventurers come here looking for work. The guild gathers here too.' },
      x: 150, y: 70, base: { gold: 120, wood: 70, stone: 40 }, mult: 1.85,
    },
    barracks: {
      name: { ru: 'Казармы', en: 'Barracks' },
      desc: { ru: 'Стража — лучники на стенах. Не ходят в подземелья, но защищают ворота.', en: 'Guards are archers on the walls. They never enter dungeons but defend the gate.' },
      x: 184, y: 14, base: { gold: 100, wood: 50, stone: 70, iron: 20 }, mult: 1.8,
    },
    gate: {
      name: { ru: 'Главные ворота', en: 'Main gate' },
      desc: { ru: 'Здесь королевство встречает волны чудовищ. Ты сам решаешь, когда принять бой.', en: 'Here the kingdom faces waves of monsters. You decide when to fight.' },
      x: 236, y: 92, base: { gold: 60, wood: 40, stone: 90 }, mult: 1.8,
    },
    dungeon: {
      name: { ru: 'Катакомбы', en: 'Catacombs' },
      desc: { ru: 'Древнее подземелье за стенами. Чем глубже этаж, тем богаче добыча и страшнее враги.', en: 'An ancient dungeon beyond the walls. The deeper the floor, the richer the loot and the deadlier the foes.' },
      x: 276, y: 24, noLevel: true,
    },
  };
  D.ORDER = ['castle', 'lumber', 'quarry', 'mine', 'forge', 'tavern', 'barracks', 'gate', 'dungeon'];

  D.CLS = {
    warrior: {
      name: { ru: 'Воин', en: 'Warrior' },
      desc: { ru: 'Держит удар и прикрывает остальных.', en: 'Takes hits and shields the others.' },
      hp: 60, atk: 6, def: 4, ghp: 12, gatk: 1.3, gdef: 1.0, weapon: 'sword',
    },
    archer: {
      name: { ru: 'Лучник', en: 'Archer' },
      desc: { ru: 'Стабильный урон издалека, помогает сбежать.', en: 'Steady ranged damage, helps the party escape.' },
      hp: 40, atk: 8, def: 2, ghp: 7, gatk: 1.8, gdef: 0.5, weapon: 'bow',
    },
    mage: {
      name: { ru: 'Маг', en: 'Mage' },
      desc: { ru: 'Огромный урон по площади, но хрупок.', en: 'Huge area damage, but fragile.' },
      hp: 32, atk: 10, def: 1, ghp: 5, gatk: 2.3, gdef: 0.4, weapon: 'staff',
    },
    priest: {
      name: { ru: 'Жрец', en: 'Priest' },
      desc: { ru: 'Лечит союзников в бою.', en: 'Heals allies in battle.' },
      hp: 45, atk: 5, def: 3, ghp: 8, gatk: 1.1, gdef: 0.8, weapon: 'mace',
    },
  };

  // Редкость авантюристов
  D.ARAR = [
    { name: { ru: 'Новичок', en: 'Novice' }, mult: 1, cost: 40, color: '#d8d8d8', w: 70 },
    { name: { ru: 'Ветеран', en: 'Veteran' }, mult: 1.35, cost: 150, color: '#5ec85e', w: 22 },
    { name: { ru: 'Герой', en: 'Hero' }, mult: 1.8, cost: 500, color: '#b45cff', w: 7 },
    { name: { ru: 'Легенда', en: 'Legend' }, mult: 2.5, cost: 1600, color: '#ff9a3c', w: 1 },
  ];

  // Предметы. g — грамматический род для русских прилагательных.
  D.ITYPES = {
    sword: { name: { ru: 'Меч', en: 'Sword' }, g: 'm', slot: 'weapon', cls: 'warrior', mod: 1.0 },
    bow: { name: { ru: 'Лук', en: 'Bow' }, g: 'm', slot: 'weapon', cls: 'archer', mod: 1.05 },
    staff: { name: { ru: 'Посох', en: 'Staff' }, g: 'm', slot: 'weapon', cls: 'mage', mod: 1.15 },
    mace: { name: { ru: 'Булава', en: 'Mace' }, g: 'f', slot: 'weapon', cls: 'priest', mod: 0.85 },
    armor: { name: { ru: 'Броня', en: 'Armor' }, g: 'f', slot: 'armor', cls: null, mod: 1 },
  };

  D.TIERS = [
    {
      name: { ru: 'Железо', en: 'Iron' }, adj: { m: 'железный', f: 'железная', en: 'Iron' },
      req: 1, atk: 5, def: 3, hp: 15, time: 10,
      wcost: { iron: 10, wood: 6 }, acost: { iron: 14, wood: 4 },
    },
    {
      name: { ru: 'Кость', en: 'Bone' }, adj: { m: 'костяной', f: 'костяная', en: 'Bone' },
      req: 3, atk: 12, def: 7, hp: 40, time: 20,
      wcost: { iron: 25, wood: 10, bone: 12 }, acost: { iron: 30, bone: 16 },
    },
    {
      name: { ru: 'Мифрил', en: 'Mithril' }, adj: { m: 'мифриловый', f: 'мифриловая', en: 'Mithril' },
      req: 5, atk: 28, def: 15, hp: 90, time: 35,
      wcost: { iron: 30, mithril: 8, crystal: 6 }, acost: { iron: 40, mithril: 10, crystal: 4 },
    },
  ];

  // Редкость предметов
  D.IRAR = [
    { name: { ru: 'Обычный', en: 'Common' }, adj: { m: '', f: '', en: '' }, mult: 1, aff: 0, color: '#d8d8d8', w: 62 },
    { name: { ru: 'Добротный', en: 'Uncommon' }, adj: { m: 'Добротный', f: 'Добротная', en: 'Fine' }, mult: 1.25, aff: 0, color: '#5ec85e', w: 25 },
    { name: { ru: 'Редкий', en: 'Rare' }, adj: { m: 'Редкий', f: 'Редкая', en: 'Rare' }, mult: 1.6, aff: 1, color: '#4a9bff', w: 9 },
    { name: { ru: 'Эпический', en: 'Epic' }, adj: { m: 'Эпический', f: 'Эпическая', en: 'Epic' }, mult: 2.1, aff: 2, color: '#b45cff', w: 3.3 },
    { name: { ru: 'Легендарный', en: 'Legendary' }, adj: { m: 'Легендарный', f: 'Легендарная', en: 'Legendary' }, mult: 3, aff: 3, color: '#ff9a3c', w: 0.7 },
  ];

  D.EPITHETS = [
    ['«Гнев Севера»', '"Wrath of the North"'],
    ['«Последний рассвет»', '"Last Dawn"'],
    ['«Шёпот бури»', '"Stormwhisper"'],
    ['«Клятва короля»', '"King\'s Oath"'],
    ['«Пожиратель теней»', '"Shadoweater"'],
    ['«Сердце горы»', '"Heart of the Mountain"'],
    ['«Зубы дракона»', '"Dragon\'s Teeth"'],
    ['«Вечная стража»', '"Eternal Watch"'],
  ];

  D.MON = {
    slime: { name: { ru: 'Слизень', en: 'Slime' }, pl: { ru: 'Слизни', en: 'Slimes' }, hp: 10, atk: 2, spd: 18, gold: 1 },
    goblin: { name: { ru: 'Гоблин', en: 'Goblin' }, pl: { ru: 'Гоблины', en: 'Goblins' }, hp: 16, atk: 3, spd: 26, gold: 1.5 },
    wolf: { name: { ru: 'Варг', en: 'Warg' }, pl: { ru: 'Варги', en: 'Wargs' }, hp: 14, atk: 4, spd: 40, gold: 1.5 },
    skeleton: { name: { ru: 'Скелет', en: 'Skeleton' }, pl: { ru: 'Скелеты', en: 'Skeletons' }, hp: 32, atk: 5, spd: 16, gold: 2.5 },
    orc: { name: { ru: 'Орк', en: 'Orc' }, pl: { ru: 'Орки', en: 'Orcs' }, hp: 70, atk: 9, spd: 14, gold: 4 },
    spider: { name: { ru: 'Паук', en: 'Spider' }, pl: { ru: 'Пауки', en: 'Spiders' }, hp: 20, atk: 4, spd: 30, gold: 2 },
    troll: { name: { ru: 'Пещерный тролль', en: 'Cave troll' }, pl: { ru: 'Пещерный тролль', en: 'Cave troll' }, hp: 300, atk: 18, spd: 10, gold: 25, boss: true },
    lich: { name: { ru: 'Лич', en: 'Lich' }, pl: { ru: 'Лич', en: 'Lich' }, hp: 400, atk: 22, spd: 9, gold: 40, boss: true },
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

  // Цели-подсказки: ведут игрока по первым шагам.
  D.GOALS = [
    { test: (S) => S.stats.clicks >= 10, reward: { gold: 10 } },
    { test: (S) => S.b.lumber.w + S.b.quarry.w >= 2, reward: { gold: 20 } },
    { test: (S) => S.b.mine.lvl >= 1, reward: { gold: 30 } },
    { test: (S) => S.b.forge.lvl >= 1, reward: { iron: 10 } },
    { test: (S) => S.stats.crafted >= 1, reward: { gold: 40 } },
    { test: (S) => S.b.tavern.lvl >= 1, reward: { gold: 40 } },
    { test: (S) => S.advs.length >= 1, reward: { iron: 20 } },
    { test: (S) => S.gate.best >= 1, reward: { gold: 60 } },
    { test: (S) => S.dng.best >= 1, reward: { gold: 80 } },
    { test: (S) => S.b.castle.lvl >= 2, reward: { gold: 100 } },
    { test: (S) => S.b.barracks.lvl >= 1, reward: { iron: 30 } },
    { test: (S) => S.gate.best >= 5, reward: { gold: 250, bone: 10 } },
    { test: (S) => S.dng.best >= 5, reward: { crystal: 10 } },
    { test: (S) => S.items.some((i) => i.rar >= 3), reward: { gold: 400 } },
  ];
})();
