const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');

const W = 960;
const H = 540;

const PORTRAIT_SOURCES = [
  { match: /Вера/i, file: 'картинки/библиотекарша.jpg' },
  { match: /Клара/i, file: 'картинки/портрет-клара.jpg' },
  { match: /Миша/i, file: 'картинки/портрет-миша.jpg' },
  { match: /Егор/i, file: 'картинки/портрет-егор.jpg' },
  { match: /Гриша/i, file: 'картинки/портрет-гриша.jpg' }
];
const portraitCache = new Map();

function portraitFor(speaker) {
  if (!speaker) return null;
  const entry = PORTRAIT_SOURCES.find(p => p.match.test(speaker));
  if (!entry) return null;
  let img = portraitCache.get(entry.file);
  if (!img) {
    img = new Image();
    img.src = encodeURI(entry.file);
    portraitCache.set(entry.file, img);
  }
  return img;
}


function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const cw = Math.max(1, Math.round((rect.width || W) * dpr));
  const ch = Math.max(1, Math.round((rect.height || H) * dpr));
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
}
resizeCanvas();
addEventListener('resize', resizeCanvas);

const MARGIN = 40;
const PLAYER_R = 12;
const NPC_SCALE = 1.34;
const PLAYER_SPEED = 220;
const INTERACT_DIST = 55;
const DOOR_W = 70;
const DOOR_H = 22;

const layout = {
  hall: {
    name: 'Главный зал',
    sub: 'центральный холл: прямо — читательская зона, налево — администрация, направо — служебные помещения',
    children: ['zone_reading', 'zone_storage', 'vestibule', 'zone_staff']
  },

  zone_reading: {
    name: 'Читательская зона',
    short: 'Читательская зона',
    sub: 'всё для читателей: выдача книг, залы, занятия и встречи',
    parent: 'hall',
    children: ['abonement', 'hall_universal', 'hall_periodics', 'multifunc', 'computer_class']
  },
  zone_storage: {
    name: 'Служебные помещения',
    short: 'Служебные помещения',
    sub: 'склады, фонды, мастерские и инженерные службы',
    parent: 'hall',
    children: ['fund_main', 'archive', 'workshops', 'climate']
  },
  vestibule: {
    name: 'Вестибюль',
    sub: 'входная зона, гардероб и стойка секретаря — отсюда в буфет и санузлы',
    parent: 'hall',
    children: ['buffet', 'toilets']
  },
  zone_staff: {
    name: 'Администрация и охрана',
    short: 'Администрация',
    sub: 'кабинеты руководства, отдел кадров и пост охраны — нужен пропуск',
    parent: 'hall',
    children: ['admin', 'departments', 'security']
  },

  abonement: {
    name: 'Абонемент',
    sub: 'выдача книг на дом, открытый доступ к стеллажам',
    parent: 'zone_reading',
    children: []
  },
  hall_universal: {
    name: 'Универсальный зал',
    sub: 'книги по всем темам, тихая работа за столами',
    parent: 'zone_reading',
    children: []
  },
  hall_periodics: {
    name: 'Зал периодики',
    sub: 'газеты, журналы и подшивки за текущий год',
    parent: 'zone_reading',
    children: []
  },
  multifunc: {
    name: 'Конференц-зал',
    sub: 'лекции, выставки и встречи',
    parent: 'zone_reading',
    children: []
  },
  computer_class: {
    name: 'Компьютерный класс',
    sub: 'компьютеры, интернет, сканирование документов',
    parent: 'zone_reading',
    children: []
  },

  fund_main: {
    name: 'Основной фонд',
    sub: 'постоянное хранение книг и брошюр на стеллажах',
    parent: 'zone_storage',
    children: []
  },
  archive: {
    name: 'Архив',
    sub: 'редкие книги, рукописи и особые коллекции',
    parent: 'zone_storage',
    children: []
  },
  workshops: {
    name: 'Мастерские',
    sub: 'переплёт, реставрация и консервация документов',
    parent: 'zone_storage',
    children: []
  },
  climate: {
    name: 'Климат-контроль',
    sub: 'температура и влажность в книгохранилищах',
    parent: 'zone_storage',
    children: []
  },

  admin: {
    name: 'Администрация',
    sub: 'кабинеты руководства, бухгалтерия, отдел кадров',
    parent: 'zone_staff',
    children: []
  },
  departments: {
    name: 'Отделы обработки',
    sub: 'комплектование, каталогизация, ИТ-служба',
    parent: 'zone_staff',
    children: []
  },
  security: {
    name: 'Охрана',
    sub: 'пост охраны, журнал пропусков и камеры наблюдения',
    parent: 'zone_staff',
    children: []
  },

  buffet: {
    name: 'Буфет',
    sub: 'кофе, чай и перекусы для всех',
    parent: 'vestibule',
    children: []
  },
  toilets: {
    name: 'Санузлы',
    sub: 'туалеты для сотрудников и посетителей',
    parent: 'vestibule',
    children: []
  }
};

function childSlots(n) {
  const sides = ['top', 'right', 'bottom'];
  const base = Math.floor(n / 3);
  const rem = n % 3;
  const counts = sides.map((_, i) => base + (i < rem ? 1 : 0));
  const out = [];
  sides.forEach((side, i) => {
    for (let j = 0; j < counts[i]; j++) {
      out.push({ side, pos: (j + 1) / (counts[i] + 1) });
    }
  });
  return out;
}

function buildRooms() {
  const out = {};
  for (const id of Object.keys(layout)) {
    const def = layout[id];
    const doors = [];
    if (def.parent) {
      doors.push({ to: def.parent, side: 'left', pos: 0.5, back: true });
      const slots = childSlots(def.children.length);
      def.children.forEach((c, i) => doors.push({ to: c, ...slots[i] }));
    } else {
      const sides = ['top', 'right', 'bottom', 'left'];
      def.children.forEach((c, i) => doors.push({ to: c, side: sides[i], pos: 0.5 }));
    }
    out[id] = {
      name: def.name,
      short: def.short || def.name,
      sub: def.sub || '',
      parent: def.parent || null,
      doors
    };
  }
  return out;
}

const rooms = buildRooms();

function doorRect(door) {
  const iw = W - MARGIN * 2;
  const ih = H - MARGIN * 2;
  if (door.side === 'top') {
    return { x: MARGIN + iw * door.pos - DOOR_W / 2, y: MARGIN - DOOR_H / 2, w: DOOR_W, h: DOOR_H };
  }
  if (door.side === 'bottom') {
    return { x: MARGIN + iw * door.pos - DOOR_W / 2, y: MARGIN + ih - DOOR_H / 2, w: DOOR_W, h: DOOR_H };
  }
  const x = door.side === 'left' ? MARGIN - DOOR_H / 2 : MARGIN + iw - DOOR_H / 2;
  return { x, y: MARGIN + ih * door.pos - DOOR_W / 2, w: DOOR_H, h: DOOR_W };
}

function spawnAt(door) {
  if (!door) return { x: W / 2, y: H / 2 };
  const iw = W - MARGIN * 2;
  const ih = H - MARGIN * 2;
  const pad = 75;
  if (door.side === 'top') return { x: MARGIN + iw * door.pos, y: MARGIN + pad };
  if (door.side === 'bottom') return { x: MARGIN + iw * door.pos, y: MARGIN + ih - pad };
  if (door.side === 'left') return { x: MARGIN + pad, y: MARGIN + ih * door.pos };
  return { x: MARGIN + iw - pad, y: MARGIN + ih * door.pos };
}

let currentRoom = 'vestibule';
let player = { ...spawnAt(null), moving: false, face: 1, step: 0 };
let havePass = false;
let toast = '';

const hashRoom = (typeof location !== 'undefined' && location.hash || '').slice(1);
if (hashRoom && rooms[hashRoom]) {
  currentRoom = hashRoom;
  const bd = rooms[hashRoom].doors.find(d => d.back);
  const sp = bd ? spawnAt(bd) : { x: W / 2, y: H / 2 };
  player.x = sp.x;
  player.y = sp.y;
}

const items = [
  { id: 'pass', room: 'vestibule', x: 790, y: 92, label: 'Пропуск' }
];
const INITIAL_ITEMS = items.map(it => ({ ...it }));

const interactables = [
  { room: 'vestibule', x: 154, y: 184, icon: 'guestbook', title: 'Книга посетителей', text: '«Оставьте запись! Сегодня библиотеку посетили 247 человек»' },
  { room: 'vestibule', x: 512, y: 88, icon: 'sign', title: 'Инфо-стойка', text: 'Схема залов на стенде. Спросите библиотекаря — он всё расскажет' },
  { id: 'final_book', room: 'hall', x: 480, y: 270, icon: 'guestbook', title: 'Книга пяти страниц', text: 'Пять историй ещё не собраны. Поговори с людьми в библиотеке' },
  { room: 'zone_reading', x: 480, y: 270, icon: 'globe', title: 'Глобус', text: 'Старинный глобус 1958 года. Найди на нём Москву!' },
  { room: 'hall_universal', x: 165, y: 270, icon: 'clock', title: 'Настенные часы', text: 'Тик-так. Тихий час в зале — не мешай читающим!' },
  { room: 'hall_universal', x: 800, y: 440, icon: 'guestbook', title: 'Полка русской классики', text: 'Пушкин писал «Онегина» 7 лет, Гоголь сжёг второй том «Мёртвых душ», а Достоевский сочинял под срок. Жарко тут было!' },
  { room: 'abonement', x: 820, y: 265, icon: 'catalog', title: 'Каталожный ящик', text: 'Алфавитный каталог: 40 000 карточек. К.А. — К.Б. — К.В...' },
  { room: 'fund_main', x: 155, y: 265, icon: 'ladder', title: 'Передвижная лестница', text: 'Не забудь поднять её на место, иначе библиотекарь ругнётся' },
  { room: 'archive', x: 860, y: 270, icon: 'safe', title: 'Сейф особо ценных', text: 'Пергаменты XVIII века. Откроется только с библиотекарем' },
  { room: 'admin', x: 820, y: 265, icon: 'plant', title: 'Фикус директора', text: '«Фикус цветёт — значит, бюджет утвердили», — говорят в отделах' },
  { room: 'multifunc', x: 800, y: 440, icon: 'poster', title: 'Афиша событий', text: 'Сегодня: лекция «История книги» в 17:00. Вход свободный!' },
  { room: 'buffet', x: 200, y: 445, icon: 'menu', title: 'Меню буфета', text: 'Кофе с булочкой — 35₽. Печенье для читателей — бесплатно' },
  { room: 'computer_class', x: 855, y: 265, icon: 'screen', title: 'Электронный каталог', text: 'Поиск по всем фондам. Введи автора или название книги' },
  { room: 'computer_class', x: 150, y: 130, icon: 'poster', title: 'Плакат: Гарри Поттер', text: 'Джоан Роулинг придумала Гарри, опоздав в поезде на 1990 год. Книга отвергнута 12 издательствами — и стала мировым бестселлером' },
  { room: 'climate', x: 155, y: 265, icon: 'gauge', title: 'Гигрометр', text: 'Влажность 55%, температура 18°C — идеально для книг' },
  { room: 'security', x: 690, y: 270, icon: 'screen', title: 'Мониторы охраны', text: 'На экранах — коридоры и читальные залы. Пока всё спокойно' }
];

const npcs = [
  { room: 'vestibule', x: 225, y: 214, name: 'Библиотекарь Борис', skin: '#e8c3a0', hair: '#7a726a', outfit: '#6a4a5a', trim: '#4a3240', style: 1, glasses: true, prop: 'book', quote: 'Борис поправляет очки: «Читальный зал откроется в восемь. Пропуск — у секретаря за правой стойкой. А ещё... присмотрись к людям здесь. У каждого своя история»' },
  { room: 'computer_class', x: 760, y: 230, name: 'Егор', arc: 'egor', skin: '#e8bd98', hair: '#2f2a28', outfit: '#4f6d7a', trim: '#36505a', style: 0, glasses: true, prop: 'tablet', quote: 'Егор не отрывается от планшета: «Книги? Это медленный интерфейс. У меня каталог падает третий день»' },
  { room: 'buffet', x: 460, y: 230, name: 'Клара', arc: 'klara', skin: '#c98a5a', hair: '#3a2a22', outfit: '#a05a6a', trim: '#7a3e4c', style: 2, scarf: '#c9a23a', prop: 'tray', quote: 'Клара вытирает руки: «У меня потерялись страницы из книги рецептов. Внучка говорит, что я всё равно всё помню. А я уже не уверена»' },
  { room: 'abonement', x: 740, y: 250, name: 'Библиотекарша Вера', arc: 'vera', skin: '#f0c9a6', hair: '#a05a6a', outfit: '#c9a23a', trim: '#8a6a24', style: 3, scarf: '#8a3a4a', prop: 'books', quote: 'Вера перебирает формуляры: «Редкую книгу просит мальчик. А я не могу её отдать — это единственный экземпляр»' },
  { room: 'hall_universal', x: 760, y: 360, name: 'Миша', arc: 'misha', scale: 0.82, skin: '#f3d2b2', hair: '#6a4a2a', outfit: '#3f6fb5', trim: '#2f4f7a', style: 0, prop: 'book', quote: 'Миша сидит с телефоном: «Книги — это скучно. Там надо долго. А тут всё быстро»' },
  { room: 'archive', x: 690, y: 300, name: 'Гриша', arc: 'grisha', skin: '#d9a982', hair: '#8a8078', outfit: '#7a5a3a', trim: '#5a4028', style: 0, beard: true, prop: 'folder', quote: 'Гриша подметает у стеллажей: «Я тут просто убираю. Истории — не моё. Я и в школе-то не дочитал ни одной»' },
  { room: 'admin', x: 740, y: 280, name: 'Заведующая Ада', secret: true, skin: '#e6c2a2', hair: '#6a6a72', outfit: '#5a3a4a', trim: '#3e2632', style: 3, glasses: true, scarf: '#b08a52', prop: 'folder', quote: 'Ада смотрит поверх очков: «В каталоге пять историй. Но у библиотеки есть и восьмая полка. Она не для читателей»' }
];
for (const n of npcs) {
  n.chat = { room: n.room, x: n.x, y: n.y, icon: 'npc', title: n.name, text: n.quote, npc: n };
  interactables.push(n.chat);
}

const ARCS = {
  egor: {
    name: 'Егор', role: 'программист', page: 'Страница кода', color: '#7fc4e8',
    intro: 'Егор сидит среди мигающих мониторов и говорит быстро, будто защищается: «Книги — медленный интерфейс. У меня каталог падает третий день, а дети всё равно не читают».',
    goal: 'Цель: найти флешку с его старым черновиком и серверный лог — а потом решить, стоит ли ему возвращаться к брошенному проекту.',
    details: 'Егор пришёл в библиотеку чинить компьютеры, но остался. В детстве он придумал игру-книгу: читатель сам выбирает, куда идти и кого спасать. Ему сказали, что «это никому не нужно», и он забросил проект. Теперь он чинит чужие каталоги и делает вид, что книги его не касаются. Но флешку так и не выбросил.',
    activeText: 'Найди флешку с черновиком в компьютерном классе и старый серверный лог в конференц-зале. Потом вернись — решим, что с этим делать.',
    returnText: 'Егор вертит флешку в руках. «Я думал, это уже мусор. А ты... ты правда хочешь знать, чем всё должно было закончиться?»',
    doneText: 'Егор оставляет проект и обещает показать его детям. Иногда он закрывает планшет и читает — медленно, как будто заново учится.',
    refusedText: 'Егор кивает и снова уходит в код: «Понял. Без обид». Флешка остаётся лежать в ящике.',
    need: 2,
    choices: [
      { id: 'own', label: '«Не удаляй. Доделай сам — я только помогу»', trust: 1, growth: 2, flags: { authorship: 1, honesty: 1 }, result: 'Егор впервые за долгое время улыбается. Он оставляет проект и обещает показать его детям.' },
      { id: 'fix', label: '«Давай я сам всё исправлю»', trust: 1, growth: 0, flags: { control: 2 }, result: 'Каталог снова работает. Егор благодарен, но больше не спрашивает твоего мнения.' },
      { id: 'truth', label: '«Проект сырой. Но бросить его — не решение»', trust: 0, growth: 2, flags: { honesty: 1 }, result: 'Егор злится, потом кивает. «Жёстко. Но, наверное, честно».' }
    ]
  },
  klara: {
    name: 'Клара', role: 'повариха', page: 'Страница памяти', color: '#e0b25c',
    intro: 'Клара вытирает руки о фартук и кивает на пустую страницу: «Внучка говорит, что все рецепты есть в интернете. А я не уверена, что мои кому-то нужны. И ещё эти страницы...»',
    goal: 'Цель: найти две потерянные страницы её книги рецептов и помочь Кларе понять, имеет ли её память ценность, если всё можно «погуглить».',
    details: 'Клара работает в буфете двадцать лет. Её книга рецептов — не просто сборник: на полях она записывала, для кого пекла и что в тот день случилось. Внучка сказала, что всё это можно найти в интернете, и Клара перестала открывать книгу. Теперь часть страниц потерялась. Она боится, что вместе с ними исчезнет и память о людях, для которых она готовила.',
    activeText: 'Найди страницу рецепта в буфете и бабушкину запись в главном зале. Потом вернись ко мне — надо разложить их по местам.',
    returnText: 'Клара раскладывает страницы и вдруг замолкает. «Вот здесь я записала, что ты любишь с корицей. А здесь — что в тот день шёл дождь. Это же не рецепт. Это жизнь».',
    doneText: 'Клара снова печёт по книге. На полях появляются новые записи: для кого, зачем и что было в тот день. Интернет у неё всё ещё есть — просто теперь он не единственное место памяти.',
    refusedText: 'Клара улыбается, но убирает книгу в ящик: «Ничего. Рецепты подождут». На столе остаётся чашка с остывшим чаем.',
    need: 2,
    choices: [
      { id: 'truth', label: '«Скажи правду: рецепт подгорел, но память важнее»', trust: 0, growth: 2, flags: { honesty: 1 }, result: 'Клара смеётся сквозь слёзы. Она вписывает в книгу: «Первый блин — комом. Главное — позвать к столу».' },
      { id: 'comfort', label: '«Всё было вкусно. Не переживай»', trust: 1, growth: 0, flags: {}, result: 'Клара благодарно кивает. Страница остаётся пустой, но ей спокойнее.' },
      { id: 'rewrite', label: '«Я сам перепишу рецепт за тебя»', trust: 0, growth: 0, flags: { control: 2 }, result: 'Рецепт получается ровным и без ошибок. Клара смотрит на чужой почерк и молчит.' }
    ]
  },
  vera: {
    name: 'Библиотекарша Вера', role: 'библиотекарь', page: 'Страница выбора', color: '#d98a8a',
    intro: 'Вера перебирает формуляры и говорит тише обычного: «Мальчик просит книгу из сейфа. Единственный экземпляр. Я не сплю из-за этого». Она явно хочет объяснить больше, но не решается.',
    goal: 'Цель: найти формуляр Миши и его письмо, чтобы понять, почему эта книга важна именно ему — и решить, можно ли ею рискнуть.',
    details: 'Вера работает здесь дольше, чем помнит себя. Она знает каждую полку и боится, что библиотека умрёт вместе с ней. В сейфе лежит редкая книга, которую просит Миша. Вера не отдаёт её не из злости: она боится, что ребёнок потеряет или порвёт единственный экземпляр. Но за стеклом книга тоже молчит.',
    activeText: 'Найди формуляр Миши в абонементе и его письмо в архиве. Потом вернись — Вера должна это прочитать.',
    returnText: 'Вера читает письмо и долго не поднимает глаз. «Он не просил книгу для себя. Он хотел читать её маме вслух. А я думала, что он просто ребёнок, который потеряет экземпляр».',
    doneText: 'Вера выдаёт лучшие книги — и иногда читает вместе с детьми. Она больше не прячет их за стеклом. «Книга должна уставать от чтения, а не от тишины».',
    refusedText: 'Вера аккуратно убирает формуляр в сейф: «Я не в обиде. Просто жаль, что он не узнает». Ключ поворачивается тихо.',
    need: 2,
    choices: [
      { id: 'share', label: '«Отдай книгу Мише. Но читайте вместе»', trust: 1, growth: 2, flags: { authorship: 1 }, result: 'Вера кивает и достаёт книгу. В читальном зале впервые за месяц слышен детский смех над страницей.' },
      { id: 'keep', label: '«Оставь в сейфе. Так безопаснее»', trust: 1, growth: 0, flags: { control: 1 }, result: 'Книга остаётся целой. Вера благодарна, но формуляр Миши больше не появляется.' },
      { id: 'control', label: '«Я сам решу, кому её дать»', trust: 0, growth: 0, flags: { control: 2 }, result: 'Ты выдаёшь книгу сам. Вера молча подписывает формуляр. Между вами — стекло.' }
    ]
  },
  misha: {
    name: 'Миша', role: 'школьник', page: 'Страница выбора', color: '#7fc4e8',
    intro: 'Миша сидит с телефоном и не поднимает глаз: «Книги — это скучно. Там надо долго. А тут всё быстро». Но когда речь заходит о динозаврах, он на секунду отвлекается.',
    goal: 'Цель: найти забытую книгу с рисунками и комикс без конца — и показать Мише, что чтение не обязано быть скучным.',
    details: 'Миша приходит в библиотеку после школы и садится с телефоном. Дома часто спорят, и телефон — место, где можно не слышать. Книги он пробовал, но они показались «длинными». На самом деле он ищет историю про динозавров, похожую на его любимую игру. Просто не верит, что книга может быть такой же интересной.',
    activeText: 'Найди забытую книгу с рисунками в универсальном зале и комикс без конца в конференц-зале. Потом вернись к Мише.',
    returnText: 'Миша листает комикс и вдруг говорит: «Тут нет конца. Кто так делает?» Он впервые откладывает телефон в сторону.',
    doneText: 'Миша читает про динозавров. Медленно, с пальцем по строке. Иногда он всё равно берёт телефон — но книга остаётся рядом.',
    refusedText: 'Миша пожимает плечами: «Ладно. В телефоне тоже истории есть». Экран загорается снова.',
    need: 2,
    choices: [
      { id: 'own', label: '«Начни с комикса. Но выбери сам, что читать»', trust: 1, growth: 2, flags: { authorship: 1 }, result: 'Миша выбирает книгу про динозавров. Не потому, что надо. Потому, что интересно.' },
      { id: 'force', label: '«Вот список классики. Читай по порядку»', trust: 0, growth: 1, flags: { control: 1 }, result: 'Миша берёт список. На следующий день он не приходит.' },
      { id: 'control', label: '«Давай я прочитаю за тебя и перескажу»', trust: 0, growth: 0, flags: { control: 2 }, result: 'Ты пересказываешь. Миша кивает. Книга остаётся закрытой.' }
    ]
  },
  grisha: {
    name: 'Гриша', role: 'уборщик', page: 'Страница памяти', color: '#b08a52',
    intro: 'Гриша подметает у стеллажей и говорит, не поднимая головы: «Я тут просто убираю. Истории — не моё. Я и в школе-то не дочитал ни одной». Но когда ты спрашиваешь о тетради, метла замирает.',
    goal: 'Цель: найти вырванную страницу в мастерских и тетрадь в климат-контроле — и помочь Грише решиться назвать себя автором.',
    details: 'Гриша убирает библиотеку сорок лет. Он видел, как сюда приходили за книгами, как их возвращали, как читали детям. Он записывал эти истории в тетрадь, но никогда не подписывал её. «Кто я такой? Уборщик». Теперь тетрадь потерялась, и без неё пропадает память о людях, которых уже нет.',
    activeText: 'Найди вырванную страницу в мастерских и тетрадь в климат-контроле. Потом вернись — Гриша должен увидеть, что истории никуда не делись.',
    returnText: 'Гриша видит тетрадь и отводит глаза: «Это так... заметки. Я думал, их уже выбросили». На первой странице — «Истории, которые я услышал». Без имени.',
    doneText: 'Гриша подписывает тетрадь «Григорий». Теперь она стоит на полке рядом с книгами. Иногда дети просят её почитать.',
    refusedText: 'Гриша прячет тетрадь под фартук: «Понимаю. У тебя свои дела». Метла продолжает шуршать.',
    need: 2,
    choices: [
      { id: 'own', label: '«Это твои истории. Подпиши их своим именем»', trust: 1, growth: 2, flags: { authorship: 1 }, result: 'Гриша долго смотрит на пустую строку. Потом выводит: «Григорий». Впервые за много лет.' },
      { id: 'hide', label: '«Оставь тетрадь в архиве. Никто не узнает»', trust: 0, growth: 0, flags: {}, result: 'Тетрадь остаётся в ящике. Гриша благодарен, что никто не смеётся. Но страница пуста.' },
      { id: 'take', label: '«Я сам подпишу. Тебе не нужно»', trust: -1, growth: 0, flags: { control: 2 }, result: 'Ты ставишь своё имя. Гриша кивает и уходит. Тетрадь остаётся, но истории в ней больше не звучат.' }
    ]
  }
};

const storyItemDefs = [
  { arc: 'egor', room: 'computer_class', x: 300, y: 220, icon: 'screen', title: 'Флешка с черновиком', mode: 'click', text: 'На ней папка «Не трогать. Проект, который я бросил».',
    task: 'sequence', taskTitle: 'Починить каталог', taskHint: 'Кликни записи в порядке от старой к новой',
    taskCards: ['2021 — починил вручную', '2019 — каталог падал раз в день', '2026 — всё снова работает'], taskOrder: [1, 0, 2] },
  { arc: 'egor', room: 'multifunc', x: 700, y: 190, icon: 'screen', title: 'Старый серверный лог', mode: 'taps', text: 'В логе — сотни попыток починить каталог. И ни одной записи «сдался».' },
  { arc: 'klara', room: 'buffet', x: 220, y: 300, icon: 'menu', title: 'Страница рецепта', mode: 'steady', text: '«Пирог с яблоками. Печь 40 минут. Не отвлекаться на телефон».',
    task: 'pick3', taskTitle: 'Собрать рецепт', taskHint: 'Выбери три верных ингредиента',
    taskCards: ['Мука', 'Сахарная пудра', 'Яблоки', 'Гвоздика', 'Корица', 'Соль'], taskCorrect: [0, 2, 4] },
  { arc: 'klara', room: 'hall', x: 300, y: 300, icon: 'menu', title: 'Бабушкин рецепт', mode: 'choice', choicePrompt: 'На полях — пятна от теста и подпись «Маме. С любовью». Какой это почерк?', choices: ['Ровный, без единой помарки', 'С пятнами от теста и тёплой подписью', 'Напечатанный на принтере'], correct: 1, text: 'На полях — пятна от теста и чья-то подпись: «Маме. С любовью».' },
  { arc: 'vera', room: 'abonement', x: 600, y: 400, icon: 'guestbook', title: 'Читательский формуляр', mode: 'choice', text: 'Формуляр Миши. Книга числится «не выдана» уже три недели.',
    task: 'select', taskTitle: 'Сверить формуляры', taskHint: 'Выбери тот, что принадлежит Мише',
    taskCards: ['Мария Сергеева — книга возвращена', 'Миша Ковалёв — не выдана три недели', 'Формуляр без имени — пустой'], taskCorrect: 1 },
  { arc: 'vera', room: 'archive', x: 500, y: 390, icon: 'guestbook', title: 'Письмо читателя', mode: 'hold', text: '«Я хочу прочитать её с мамой. Она теперь редко бывает дома».' },
  { arc: 'misha', room: 'hall_universal', x: 700, y: 420, icon: 'book', title: 'Забытая книга', mode: 'steady', text: 'Обложка потрёпана. На полях — рисунки динозавров.',
    task: 'trace', taskTitle: 'Дорисовать комикс', taskHint: 'Зажми ЛКМ на полосе и веди слева направо' },
  { arc: 'misha', room: 'multifunc', x: 720, y: 430, icon: 'book', title: 'Комикс без конца', mode: 'taps', text: 'Последняя страница вырвана. Кто-то очень хотел узнать, что дальше.' },
  { arc: 'grisha', room: 'workshops', x: 760, y: 250, icon: 'guestbook', title: 'Вырванная страница', mode: 'hold', text: '«...и тогда она впервые засмеялась над книгой». Дальше — пусто.' },
  { arc: 'grisha', room: 'climate', x: 350, y: 430, icon: 'guestbook', title: 'Тетрадь с историями', mode: 'choice', text: 'Тонкая тетрадь. На первой странице: «Истории, которые я услышал». Без имени.',
    task: 'sign', taskTitle: 'Подписать тетрадь', taskHint: 'Зажми ЛКМ на строке и выведи подпись' }
];

const story = {};
for (const id in ARCS) story[id] = { id, status: 'available', found: 0, trust: 0, growth: 0, choice: null };
const storyItems = storyItemDefs.map(def => ({ ...def, found: false }));

const BOOK_QUOTES = [
  { text: 'Рукописи не горят', speaker: 'Воланд', book: 'Мастер и Маргарита', author: 'М. А. Булгаков' },
  { text: 'Красота спасёт мир', speaker: 'князь Мышкин', book: 'Идиот', author: 'Ф. М. Достоевский' },
  { text: 'Тварь ли я дрожащая или право имею?', speaker: 'Родион Раскольников', book: 'Преступление и наказание', author: 'Ф. М. Достоевский' },
  { text: 'Все счастливые семьи похожи друг на друга, каждая несчастливая семья несчастлива по-своему', speaker: 'рассказчик', book: 'Анна Каренина', author: 'Л. Н. Толстой' },
  { text: 'Быть или не быть — вот в чём вопрос', speaker: 'Гамлет', book: 'Гамлет', author: 'У. Шекспир' },
  { text: 'Главного глазами не увидишь', speaker: 'Лис', book: 'Маленький принц', author: 'А. де Сент-Экзюпери' },
  { text: 'Служить бы рад, прислуживаться тошно', speaker: 'Александр Чацкий', book: 'Горе от ума', author: 'А. С. Грибоедов' },
  { text: 'Человек — это звучит гордо', speaker: 'Сатин', book: 'На дне', author: 'М. Горький' },
  { text: 'В человеке должно быть всё прекрасно: и лицо, и одежда, и душа, и мысли', speaker: 'Михаил Астров', book: 'Дядя Ваня', author: 'А. П. Чехов' },
  { text: 'А счастье было так возможно, так близко!', speaker: 'Татьяна Ларина', book: 'Евгений Онегин', author: 'А. С. Пушкин' },
  { text: 'Нет величия там, где нет простоты, добра и правды', speaker: 'рассказчик', book: 'Война и мир', author: 'Л. Н. Толстой' },
  { text: 'Ад — это другие', speaker: 'Гарсен', book: 'За закрытыми дверями', author: 'Ж.-П. Сартр' },
  { text: 'Я подумаю об этом завтра', speaker: 'Скарлетт О’Хара', book: 'Унесённые ветром', author: 'М. Митчелл' },
  { text: 'Я могла бы легко простить его гордость, если бы она не задевала мою', speaker: 'Элизабет Беннет', book: 'Гордость и предубеждение', author: 'Дж. Остин' },
  { text: 'Я не птица, и меня не поймать сетью', speaker: 'Джейн Эйр', book: 'Джейн Эйр', author: 'Ш. Бронте' },
  { text: 'И какой же русский не любит быстрой езды?', speaker: 'рассказчик', book: 'Мёртвые души', author: 'Н. В. Гоголь' },
  { text: 'Природа не храм, а мастерская, и человек в ней работник', speaker: 'Евгений Базаров', book: 'Отцы и дети', author: 'И. С. Тургенев' },
  { text: 'Труд — образ, содержание, стихия и цель жизни', speaker: 'Андрей Штольц', book: 'Обломов', author: 'И. А. Гончаров' },
  { text: 'Я люблю сомневаться во всём: это расположение ума не мешает решительности характера', speaker: 'Григорий Печорин', book: 'Герой нашего времени', author: 'М. Ю. Лермонтов' },
  { text: 'Когда ты чего-нибудь хочешь, вся Вселенная будет способствовать тому, чтобы желание твоё сбылось', speaker: 'Мельхиседек', book: 'Алхимик', author: 'П. Коэльо' },
  { text: 'Свобода — это возможность сказать, что дважды два — четыре', speaker: 'Уинстон Смит', book: '1984', author: 'Дж. Оруэлл' },
  { text: 'Разруха не в клозетах, а в головах', speaker: 'профессор Преображенский', book: 'Собачье сердце', author: 'М. А. Булгаков' },
  { text: 'Любить — это не значит смотреть друг на друга, а смотреть в одном направлении', speaker: 'пилот', book: 'Земля людей', author: 'А. де Сент-Экзюпери' },
  { text: 'Человек — это тростник, но тростник мыслящий', speaker: 'Блез Паскаль', book: 'Мысли', author: 'Б. Паскаль' }
];

const SHELF_SPOTS = [
  { room: 'hall', x: 205, y: 61 }, { room: 'hall', x: 755, y: 61 },
  { room: 'hall', x: 205, y: 479 }, { room: 'hall', x: 755, y: 479 },
  { room: 'zone_storage', x: 260, y: 467 }, { room: 'zone_storage', x: 700, y: 467 },
  { room: 'abonement', x: 350, y: 137 }, { room: 'abonement', x: 610, y: 137 },
  { room: 'abonement', x: 350, y: 237 }, { room: 'abonement', x: 610, y: 237 },
  { room: 'abonement', x: 350, y: 337 }, { room: 'abonement', x: 610, y: 337 },
  { room: 'hall_universal', x: 350, y: 63 }, { room: 'hall_universal', x: 610, y: 63 },
  { room: 'hall_universal', x: 350, y: 477 }, { room: 'hall_universal', x: 610, y: 477 },
  { room: 'multifunc', x: 855, y: 148 },
  { room: 'fund_main', x: 257, y: 270 }, { room: 'fund_main', x: 437, y: 270 },
  { room: 'fund_main', x: 617, y: 270 }, { room: 'fund_main', x: 797, y: 270 },
  { room: 'archive', x: 420, y: 63 }, { room: 'archive', x: 720, y: 63 },
  { room: 'archive', x: 420, y: 477 }, { room: 'archive', x: 720, y: 477 },
  { room: 'admin', x: 390, y: 63 },
  { room: 'departments', x: 860, y: 153 },
  { room: 'workshops', x: 720, y: 477 }
];

function shuffleCopy(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

const BOOK_COUNT = 18;
const bookSpots = shuffleCopy(SHELF_SPOTS).slice(0, Math.min(BOOK_COUNT, BOOK_QUOTES.length));
const bookQuotes = shuffleCopy(BOOK_QUOTES);
bookSpots.forEach((spot, i) => {
  const q = bookQuotes[i];
  interactables.push({
    room: spot.room,
    x: spot.x,
    y: spot.y,
    icon: 'book',
    title: `«${q.book}»`,
    text: `«${q.text}» — ${q.speaker}`,
    quoteData: q
  });
});

let visited = { vestibule: true };
let mapOpen = false;
let taskOpen = false;
let quoteCard = null;
let dialog = null;
let ending = null;
let storyLocked = false;
let lockedEndingKey = null;
let searchProgress = 0;
let searchTarget = null;
let mouseDown = false;
let mouseX = null, mouseY = null;

const UI = {
  tasks: { x: 4, y: 3, w: 34, h: 34 },
  map: { x: W - 38, y: 3, w: 34, h: 34 },
  exit: { x: W - 38, y: H - 37, w: 34, h: 34 },
  restart: { x: 4, y: 42, w: 118, h: 24 }
};

const TOAST_MS = 2600;
let toastUntil = 0;
let fade = 0;

const mini = {
  active: false,
  progress: 0,
  light: 'green',
  timer: 1.6,
  greenDur: 1.6,
  redDur: 1.05,
  grace: 0,
  status: '',
  statusUntil: 0
};

function openMini() {
  mini.active = true;
  mini.progress = 0;
  mini.light = 'green';
  mini.timer = mini.greenDur;
  mini.grace = 0;
  mini.status = '';
  mini.statusUntil = 0;
}

function updateMini(dt) {
  const now = performance.now();
  if (mini.status === 'caught') {
    if (now >= mini.statusUntil) mini.status = '';
    return;
  }
  if (mini.grace > 0) mini.grace = Math.max(0, mini.grace - dt);
  mini.timer -= dt;
  if (mini.timer <= 0) {
    mini.light = mini.light === 'green' ? 'red' : 'green';
    mini.timer = mini.light === 'green' ? mini.greenDur : mini.redDur;
    if (mini.light === 'red') mini.grace = 0.22;
  }
  const moving = keys['KeyW'] || keys['ArrowUp'] || keys['Space'];
  if (moving) {
    if (mini.light === 'red' && mini.grace <= 0) {
      mini.status = 'caught';
      mini.statusUntil = now + 900;
      mini.progress = 0;
      mini.light = 'green';
      mini.timer = mini.greenDur;
      mini.grace = 0;
      return;
    }
    mini.progress = Math.min(100, mini.progress + dt * 32);
  }
  if (mini.progress >= 100) {
    havePass = true;
    const idx = items.findIndex(i => i.id === 'pass');
    if (idx >= 0) items.splice(idx, 1);
    mini.active = false;
    showToast('Пропуск получен! Теперь доступен служебный блок');
  }
}

let obstacles = [];
function addObs(x, y, w, h) {
  obstacles.push({ x, y, w, h });
}

function resolveCollisions(px, py) {
  const R = PLAYER_R;
  for (let pass = 0; pass < 2; pass++) {
    for (const o of obstacles) {
      const nx = Math.max(o.x, Math.min(px, o.x + o.w));
      const ny = Math.max(o.y, Math.min(py, o.y + o.h));
      const dx = px - nx, dy = py - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 > R * R) continue;
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        px = nx + dx / d * R;
        py = ny + dy / d * R;
      } else {
        const left = px - o.x, right = o.x + o.w - px;
        const top = py - o.y, bot = o.y + o.h - py;
        const m = Math.min(left, right, top, bot);
        if (m === left) px = o.x - R;
        else if (m === right) px = o.x + o.w + R;
        else if (m === top) py = o.y - R;
        else py = o.y + o.h + R;
      }
    }
  }
  return { x: px, y: py };
}

function showToast(text, ms) {
  toast = text;
  toastUntil = performance.now() + (ms || TOAST_MS);
}

function nearItem() {
  for (const it of items) {
    if (it.room !== currentRoom) continue;
    if (Math.hypot(player.x - it.x, player.y - it.y) < 45) return it;
  }
  return null;
}

function nearInteract() {
  for (const it of interactables) {
    if (it.room !== currentRoom) continue;
    if (Math.hypot(player.x - it.x, player.y - it.y) < 45) return it;
  }
  return null;
}

function nearStoryItem() {
  if (storyLocked) return null;
  for (const it of storyItems) {
    if (it.room !== currentRoom || it.found) continue;
    const a = story[it.arc];
    if (!a || a.status !== 'active') continue;
    if (Math.hypot(player.x - it.x, player.y - it.y) < 45) return it;
  }
  return null;
}

function storySearchHint(it) {
  if (!it) return '';
  if (it.mode === 'hold') return `Зажми ЛКМ на предмете — ${it.title}`;
  if (it.mode === 'steady') return `Постой рядом и прислушайся — ${it.title}`;
  if (it.mode === 'taps') return `Кликни 3 раза подряд — ${it.title}`;
  if (it.mode === 'choice') return `Клик — осмотреть и выбрать: ${it.title}`;
  return `Клик — найти: ${it.title}`;
}

function storyDoneCount() {
  return Object.values(story).filter(a => a.status === 'done').length;
}

function storyResolvedCount() {
  return Object.values(story).filter(a => a.status === 'done' || a.status === 'refused').length;
}

function arcStatusLine(a) {
  if (a.status === 'available') return 'история не начата';
  if (a.status === 'active') return `поиск: ${a.found} / ${ARCS[a.id].need}`;
  if (a.status === 'return') return 'готова к разговору';
  if (a.status === 'refused') return 'история пропущена';
  return 'страница собрана';
}

function openDialog(speaker, text, options) {
  dialog = {
    speaker,
    text,
    portrait: portraitFor(speaker),
    options: options && options.length ? options : [{ label: 'Понятно', action: closeDialog }]
  };
}

function closeDialog() {
  dialog = null;
}

function chooseDialogOption(i) {
  if (!dialog || !dialog.options[i]) return;
  const action = dialog.options[i].action;
  dialog = null;
  if (action) action();
}

function acceptArc(a, n) {
  if (a.status !== 'available') return;
  a.status = 'active';
  a.found = 0;
  const def = ARCS[a.id];
  openDialog(n.name, `${def.activeText}\n\nНайдено: 0 / ${def.need}.`, [
    { label: 'Я поищу', action: closeDialog }
  ]);
  showToast('Новая история: ' + def.name);
}

function refuseArc(a) {
  const def = ARCS[a.id];
  a.status = 'refused';
  a.found = 0;
  openDialog(def.name, def.refusedText, [
    { label: 'Понятно', action: closeDialog }
  ]);
  showToast('История пропущена: ' + def.name);
}

function postponeArc(a, n) {
  const def = ARCS[a.id];
  a.status = 'available';
  a.found = 0;
  openDialog(n ? n.name : def.name, '«Хорошо. Я никуда не спешу», — говорит ' + (n ? n.name.split(' ').pop() : def.name) + '. История остаётся открытой: можно вернуться в любой момент.', [
    { label: 'Вернусь позже', action: closeDialog }
  ]);
  showToast('История отложена: ' + def.name);
}

function openArcDetails(a, n) {
  const def = ARCS[a.id];
  openDialog(n.name, `${def.details}\n\n${def.goal}`, [
    { label: 'Хорошо, помогу', action: () => acceptArc(a, n) },
    { label: 'Не сейчас', action: () => postponeArc(a, n) },
    { label: 'Отказаться навсегда', action: () => refuseArc(a) }
  ]);
}

function openArcChoice(a, n) {
  const def = ARCS[a.id];
  openDialog(n.name, def.returnText, [
    { label: 'Закрыть страницу', action: () => completeArc(a) }
  ]);
}

function completeArc(a) {
  const def = ARCS[a.id];
  a.status = 'done';
  a.found = def.need;
  openDialog(def.name, def.doneText, [
    { label: 'Готово', action: closeDialog }
  ]);
  showToast(def.page + ' собрана');
}

function openSecretDialog(n) {
  if (storyLocked) {
    const data = ENDINGS[lockedEndingKey];
    openDialog(n.name, `Восьмая полка уже закрыта. Твоя история закончилась концовкой «${data ? data.title : 'неизвестно'}». Вернуться назад нельзя — только жить дальше.`, [
      { label: 'Вернуться в библиотеку', action: closeDialog }
    ]);
    return;
  }
  const done = storyDoneCount();
  if (done < 5) {
    openDialog(n.name, `Ада смотрит поверх очков: «Восьмая полка? В каталоге её нет. Сначала закрой пять историй — тогда, может быть, стена тебя услышит. Сейчас готово ${done} из 5».`, [
      { label: 'Понятно', action: closeDialog }
    ]);
    return;
  }
  openDialog(n.name, '«Пять страниц собраны. Но у библиотеки есть ещё одна — та, которую не заносят в каталог. Она для тех, кто остаётся после закрытия». Ада достаёт ключ без бирки.', [
    { label: 'Открыть восьмую полку', action: () => showEnding('secret') },
    { label: 'Ещё не время', action: closeDialog }
  ]);
}

function talkToNpc(n) {
  if (!n) return;
  if (n.secret) {
    openSecretDialog(n);
    return;
  }
  if (!n.arc) {
    showToast(n.quote || n.name);
    return;
  }
  const a = story[n.arc];
  const def = ARCS[n.arc];
  if (!a || !def) return;
  if (storyLocked) {
    const line = a.status === 'done' ? def.doneText : (a.status === 'refused' ? def.refusedText : `${def.intro}\n\nТы уже дошёл до конца книги. Этот разговор останется только разговором.`);
    openDialog(n.name, line, [
      { label: 'Вернуться в библиотеку', action: closeDialog }
    ]);
    return;
  }
  if (a.status === 'available') {
    openDialog(n.name, `${def.intro}\n\n${def.goal}`, [
      { label: 'Помочь', action: () => acceptArc(a, n) },
      { label: 'Расскажи подробнее', action: () => openArcDetails(a, n) },
      { label: 'Не сейчас', action: () => postponeArc(a, n) }
    ]);
    return;
  }
  if (a.status === 'active' && a.found >= def.need) a.status = 'return';
  if (a.status === 'return') {
    openArcChoice(a, n);
  } else if (a.status === 'active') {
    openDialog(n.name, `${def.activeText}\n\nНайдено: ${a.found} / ${def.need}.`, [
      { label: 'Продолжаю искать', action: closeDialog }
    ]);
  } else if (a.status === 'done') {
    openDialog(n.name, def.doneText, [
      { label: 'Пока', action: closeDialog }
    ]);
  } else {
    openDialog(n.name, def.refusedText, [
      { label: 'Понятно', action: closeDialog }
    ]);
  }
}

function openSearchChoice(it) {
  const options = it.choices.map((label, idx) => ({
    label,
    action: () => {
      if (idx === it.correct) collectStoryItem(it);
      else showToast('Не то. Присмотрись ещё раз.', 1800);
    }
  }));
  openDialog('Поиск', it.choicePrompt, options);
}

function startStorySearch(it) {
  if (!it || it.found || storyLocked) return;
  if (it.task) {
    openStoryTask(it);
    return;
  }
  if (it.mode === 'hold') {
    showToast('Зажми ЛКМ на находке и не отпускай', 1800);
    return;
  }
  if (it.mode === 'steady') {
    showToast('Постой рядом и прислушайся', 1800);
    return;
  }
  if (it.mode === 'taps') {
    const now = performance.now();
    if (!it.tapAt || now - it.tapAt > 1800) it.taps = 0;
    it.taps = (it.taps || 0) + 1;
    it.tapAt = now;
    if (it.taps >= 3) collectStoryItem(it);
    else showToast(`${it.title}: ${it.taps} / 3`, 1200);
    return;
  }
  if (it.mode === 'choice') {
    openSearchChoice(it);
    return;
  }
  collectStoryItem(it);
}

function updateStorySearch(dt) {
  if (storyLocked) {
    searchTarget = null;
    searchProgress = 0;
    return;
  }
  const it = nearStoryItem();
  if (it && it.mode === 'steady' && !player.moving) {
    if (searchTarget !== it) {
      searchTarget = it;
      searchProgress = 0;
    }
    searchProgress += dt;
    if (searchProgress >= 1.5) collectStoryItem(it);
    return;
  }
  if (it && it.mode === 'hold' && mouseDown && searchTarget === it && mouseX != null && mouseY != null && Math.hypot(mouseX - it.x, mouseY - it.y) < 34) {
    searchProgress += dt;
    if (searchProgress >= 1.1) collectStoryItem(it);
    return;
  }
  searchTarget = null;
  searchProgress = 0;
}

function collectStoryItem(it) {
  if (!it || it.found || storyLocked) return;
  const a = story[it.arc];
  const def = ARCS[it.arc];
  if (!a || a.status !== 'active') return;
  it.found = true;
  it.taps = 0;
  searchTarget = null;
  searchProgress = 0;
  a.found++;
  if (a.found >= def.need) {
    a.status = 'return';
    showToast(`${it.title}: ${it.text} Все находки собраны — вернись к ${def.name}.`, 4600);
  } else {
    showToast(`${it.title}: ${it.text}`, 4200);
  }
}

let storyTask = null;
let taskMouseDown = false;

const STORY_TASK_BOX = { x: 150, y: 96, w: 660, h: 348 };

function openStoryTask(it) {
  if (!it || it.found || !it.task) return;
  storyTask = { type: it.task, it, picked: [], order: [], progress: 0 };
  taskMouseDown = false;
}

function closeStoryTask() {
  storyTask = null;
  taskMouseDown = false;
}

function finishStoryTask() {
  const it = storyTask && storyTask.it;
  closeStoryTask();
  if (it) collectStoryItem(it);
}

function storyTaskRects() {
  const b = STORY_TASK_BOX;
  const out = [];
  if (!storyTask) return out;
  if (storyTask.type === 'pick3') {
    const cols = 3, gap = 12;
    const w = (b.w - 80 - gap * (cols - 1)) / cols;
    const h = 52;
    for (let i = 0; i < 6; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      out.push({ x: b.x + 40 + c * (w + gap), y: b.y + 168 + r * (h + 16), w, h });
    }
    return out;
  }
  if (storyTask.type === 'trace') {
    out.push({ x: b.x + 40, y: b.y + 150, w: b.w - 80, h: 130 });
    return out;
  }
  if (storyTask.type === 'sign') {
    out.push({ x: b.x + 60, y: b.y + 186, w: b.w - 120, h: 92 });
    return out;
  }
  const n = (storyTask.it.taskCards || []).length;
  const h = 54, gap = 14;
  for (let i = 0; i < n; i++) out.push({ x: b.x + 40, y: b.y + 140 + i * (h + gap), w: b.w - 80, h });
  return out;
}

function handleStoryTaskClick(mx, my) {
  if (!storyTask) return;
  const t = storyTask;
  const rects = storyTaskRects();
  const idx = rects.findIndex(r => inRect(r, mx, my));
  if (idx < 0) return;

  if (t.type === 'sequence') {
    const want = t.it.taskOrder[t.order.length];
    if (idx === want) {
      t.order.push(idx);
      if (t.order.length >= t.it.taskOrder.length) finishStoryTask();
    } else {
      t.order = [];
      showToast('Порядок сбился. Начни с самой старой записи', 1700);
    }
    return;
  }

  if (t.type === 'select') {
    if (idx === t.it.taskCorrect) finishStoryTask();
    else showToast('Это не его формуляр', 1500);
    return;
  }

  if (t.type === 'pick3') {
    const at = t.picked.indexOf(idx);
    if (at >= 0) t.picked.splice(at, 1);
    else if (t.picked.length < 3) t.picked.push(idx);
    if (t.picked.length === 3) {
      const ok = t.picked.every(i => t.it.taskCorrect.indexOf(i) >= 0);
      if (ok) finishStoryTask();
      else {
        t.picked = [];
        showToast('Не тот набор. Вспомни, что идёт в яблочный пирог', 1900);
      }
    }
  }
}

function updateStoryTask(dt) {
  if (!storyTask) return;
  const rect = storyTaskRects()[0];
  if (!rect) return;
  const inside = mouseX != null && mouseY != null && inRect(rect, mouseX, mouseY);
  if (storyTask.type === 'trace') {
    if (taskMouseDown && inside) {
      const local = (mouseX - rect.x) / rect.w;
      storyTask.progress = Math.max(storyTask.progress, Math.max(0, Math.min(1, local)));
      if (storyTask.progress >= 0.97) finishStoryTask();
    }
    return;
  }
  if (storyTask.type === 'sign') {
    if (taskMouseDown && inside) {
      storyTask.progress = Math.min(1, storyTask.progress + dt * 0.6);
      if (storyTask.progress >= 1) finishStoryTask();
    }
  }
}

function drawTaskTrace(r, t) {
  ctx.fillStyle = 'rgba(240,226,200,.05)';
  roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,178,92,.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const n = 6, pad = 8;
  const pw = (r.w - pad * (n + 1)) / n;
  for (let i = 0; i < n; i++) {
    const x = r.x + pad + i * (pw + pad);
    const filled = t.progress * n > i + 0.05;
    ctx.fillStyle = filled ? 'rgba(224,178,92,.2)' : 'rgba(0,0,0,.24)';
    roundRect(x, r.y + pad, pw, r.h - pad * 2, 5);
    ctx.fill();
    ctx.strokeStyle = filled ? 'rgba(224,178,92,.75)' : 'rgba(224,178,92,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (filled) {
      const cx = x + pw / 2, cy = r.y + r.h / 2;
      ctx.fillStyle = 'rgba(240,226,200,.8)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 8, pw * 0.26, r.h * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + pw * 0.1, cy - 2, pw * 0.2, r.h * 0.1, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + pw * 0.24, cy - 12, pw * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const cx = r.x + 6 + t.progress * (r.w - 12);
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.moveTo(cx, r.y + r.h - 8);
  ctx.lineTo(cx + 5, r.y + r.h - 22);
  ctx.lineTo(cx + 10, r.y + r.h - 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 12px ' + SERIF;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(Math.round(t.progress * 100) + '%', r.x + r.w - 10, r.y - 12);
}

function drawTaskSign(r, t) {
  ctx.fillStyle = 'rgba(240,226,200,.05)';
  roundRect(r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,178,92,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(240,226,200,.32)';
  ctx.beginPath();
  ctx.moveTo(r.x + 24, r.y + r.h - 22);
  ctx.lineTo(r.x + r.w - 24, r.y + r.h - 22);
  ctx.stroke();

  const w0 = r.w - 48;
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const steps = 46;
  const upto = Math.floor(steps * t.progress);
  for (let i = 0; i <= upto; i++) {
    const u = i / steps;
    const x = r.x + 24 + u * w0;
    const y = r.y + r.h - 30 - Math.sin(u * 15) * 10 - u * 8;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.fillStyle = 'rgba(240,226,200,.5)';
  ctx.font = '12px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Григорий', r.x + r.w / 2, r.y + r.h + 16);

  ctx.fillStyle = PALETTE.gold;
  ctx.textAlign = 'right';
  ctx.fillText(Math.round(t.progress * 100) + '%', r.x + r.w - 10, r.y - 12);
}

function drawStoryTask() {
  if (!storyTask) return;
  const b = STORY_TASK_BOX;
  const t = storyTask;

  ctx.fillStyle = 'rgba(7,4,3,.8)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0,0,0,.35)';
  roundRect(b.x + 6, b.y + 8, b.w, b.h, 14);
  ctx.fill();
  ctx.fillStyle = '#241812';
  roundRect(b.x, b.y, b.w, b.h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(224,178,92,.22)';
  ctx.lineWidth = 1;
  roundRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20, 10);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 21px ' + SERIF;
  ctx.fillText(t.it.taskTitle, W / 2, b.y + 36);
  ctx.fillStyle = 'rgba(240,226,200,.72)';
  ctx.font = '13px ' + SERIF;
  ctx.fillText(t.it.taskHint, W / 2, b.y + 62);

  ctx.strokeStyle = 'rgba(224,178,92,.24)';
  ctx.beginPath();
  ctx.moveTo(b.x + 30, b.y + 80);
  ctx.lineTo(b.x + b.w - 30, b.y + 80);
  ctx.stroke();

  const rects = storyTaskRects();
  if (t.type === 'trace') {
    drawTaskTrace(rects[0], t);
  } else if (t.type === 'sign') {
    drawTaskSign(rects[0], t);
  } else {
    rects.forEach((r, i) => {
      const hot = inRect(r, mouseX, mouseY);
      const chosen = (t.type === 'pick3' && t.picked.indexOf(i) >= 0) ||
        (t.type === 'sequence' && t.order.indexOf(i) >= 0);
      ctx.fillStyle = chosen ? 'rgba(224,178,92,.2)' : (hot ? 'rgba(224,178,92,.12)' : 'rgba(0,0,0,.28)');
      roundRect(r.x, r.y, r.w, r.h, 8);
      ctx.fill();
      ctx.strokeStyle = chosen ? PALETTE.gold : (hot ? 'rgba(224,178,92,.7)' : 'rgba(224,178,92,.28)');
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = chosen ? '#fff0cf' : PALETTE.parchment;
      ctx.font = '14px ' + SERIF;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.it.taskCards[i], r.x + 18, r.y + r.h / 2);

      if (chosen) {
        ctx.strokeStyle = PALETTE.gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(r.x + r.w - 30, r.y + r.h / 2);
        ctx.lineTo(r.x + r.w - 24, r.y + r.h / 2 + 6);
        ctx.lineTo(r.x + r.w - 14, r.y + r.h / 2 - 8);
        ctx.stroke();
      }
    });
  }

  ctx.fillStyle = 'rgba(168,144,120,.7)';
  ctx.font = '12px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Esc — отойти и попробовать позже', W / 2, b.y + b.h - 18);
}

function openFinalBook() {
  if (storyLocked) {
    const data = ENDINGS[lockedEndingKey];
    openDialog('Книга пяти страниц', `История уже завершена. Концовка: «${data ? data.title : 'неизвестно'}». Решения больше не изменятся. Ты можешь перечитать финал или вернуться в библиотеку.`, [
      { label: 'Перечитать концовку', action: () => showEnding(lockedEndingKey) },
      { label: 'Закрыть книгу', action: closeDialog }
    ]);
    return;
  }
  const unresolved = Object.values(story).filter(a => a.status === 'available' || a.status === 'active' || a.status === 'return');
  if (unresolved.length) {
    const names = unresolved.map(a => ARCS[a.id].name).join(', ');
    openDialog('Книга пяти страниц', `Пять страниц ещё не готовы. Осталось поговорить или вернуться к: ${names}.`, [
      { label: 'Закрыть книгу', action: closeDialog }
    ]);
    return;
  }
  const done = storyDoneCount();
  if (done === 0) {
    openDialog('Книга пяти страниц', 'Пять страниц пусты. Ты никого не впустил в свою историю — и никто не впустил тебя. Но библиотека всё ещё здесь.', [
      { label: 'Остаться и прочитать тишину', action: () => showEnding('quiet') },
      { label: 'Закрыть книгу и уйти', action: () => showEnding('empty') }
    ]);
  } else if (done === 1) {
    openDialog('Книга пяти страниц', 'Только одна страница заполнена. Одна история, один человек. Этого достаточно, чтобы книга не была пустой.', [
      { label: 'Прочитать одну страницу', action: () => showEnding('one') },
      { label: 'Закрыть книгу', action: closeDialog }
    ]);
  } else if (done < 5) {
    openDialog('Книга пяти страниц', `Собрано ${done} из 5 страниц. Книга получилась неровной: где-то есть голоса, где-то — пустые места. Это тоже история.`, [
      { label: 'Прочитать то, что есть', action: () => showEnding('crossroads') },
      { label: 'Закрыть книгу', action: closeDialog }
    ]);
  } else {
    openDialog('Книга пяти страниц', 'Все пять страниц на месте. Последняя — пустая. Кто её подпишет?', [
      { label: 'Дать дописать им', action: () => showEnding('together') },
      { label: 'Вписать финал самому', action: () => showEnding('write') }
    ]);
  }
}

const ENDINGS = {
  open: {
    title: 'Открытая книга',
    text: 'Ты не стал писать финал за них. Пять человек сидят за одним столом: Егор, Клара, Вера, Миша и Гриша. Каждый читает свою страницу вслух. Последняя страница пуста — и это не потеря, а приглашение. Библиотека больше не место, где хранят книги. Она место, где люди продолжают свои истории.'
  },
  other: {
    title: 'Чужой почерк',
    text: 'Ты написал финал сам. Книга вышла стройной, красивой и правильной. Только герои не узнают себя на страницах. Тебя хвалят. Ты уходишь один, с книгой под мышкой. Она пахнет типографской краской, а не людьми, которые её рассказывали.'
  },
  crossroads: {
    title: 'Библиотека на перекрёстке',
    text: 'Книга собрана наполовину. Кто-то остался, кто-то ушёл, кого-то ты так и не решился впустить. В зале горят не все лампы. Дверь открыта. На столе лежит книга с пустыми местами — и это честнее, чем красивый финал, в который никто не верит.'
  },
  one: {
    title: 'Книга одного',
    text: 'Одна история. Один человек. Вы читаете вдвоём до утра, и в этой комнате мир становится меньше, но глубже. Остальные страницы пусты. Ты не спас библиотеку. Ты спас одного человека — и, может быть, этого достаточно.'
  },
  quiet: {
    title: 'Тихий читатель',
    text: 'Ты вежливо отказался от всех историй. Библиотека тиха. Ты читаешь один, и никто не стоит у тебя над плечом. В этом есть покой и немного грусти. На последней странице кто-то оставил карандашную пометку: «Я тоже иногда прихожу сюда».'
  },
  empty: {
    title: 'Пустая обложка',
    text: 'Ты закрыл книгу, не дав никому шанса. Зал пуст, лампы гаснут одна за другой. На столе остаётся записка: «Приходи, когда захочешь». Библиотека не закрылась навсегда. Но сегодня она никого не ждёт.'
  },
  secret: {
    title: 'Восьмая полка',
    text: 'Ада проводит тебя в комнату, которой нет на карте. За стеной — узкий проход и полка, где стоят книги без названий. Ты берёшь одну. На ней только одна строка: «Тот, кто дочитал до конца, может начать заново». Свет гаснет. Когда он возвращается, перед тобой снова вестибюль — и библиотека, в которую можно войти впервые.'
  }
};

const ENDING_ORDER = ['open', 'other', 'crossroads', 'one', 'quiet', 'empty', 'secret'];

function endingNumber(key) {
  const idx = ENDING_ORDER.indexOf(key);
  return idx >= 0 ? idx + 1 : 1;
}

function showEnding(kind) {
  let key = kind;
  if (!storyLocked) {
    if (kind === 'blank' || kind === 'together' || kind === 'write') {
      const done = storyDoneCount();
      if (done === 0) key = kind === 'write' ? 'empty' : 'quiet';
      else if (done === 1) key = 'one';
      else if (done < 5) key = 'crossroads';
      else key = kind === 'write' ? 'other' : 'open';
    }
    storyLocked = true;
    lockedEndingKey = key;
  } else {
    key = lockedEndingKey;
  }
  const data = ENDINGS[key] || ENDINGS.crossroads;
  ending = { key, title: data.title, text: data.text };
  dialog = null;
  searchTarget = null;
  searchProgress = 0;
  mouseDown = false;
}

function restartGame() {
  for (const id in story) {
    story[id].status = 'available';
    story[id].found = 0;
    story[id].choice = null;
  }
  storyItems.forEach(it => {
    it.found = false;
    it.taps = 0;
    it.tapAt = 0;
  });

  storyLocked = false;
  lockedEndingKey = null;
  ending = null;
  dialog = null;
  taskOpen = false;
  mapOpen = false;
  quoteCard = null;
  mini.active = false;
  searchTarget = null;
  searchProgress = 0;
  mouseDown = false;
  havePass = false;
  toast = '';
  toastUntil = 0;

  items.length = 0;
  INITIAL_ITEMS.forEach(it => items.push({ ...it }));
  currentRoom = 'vestibule';
  visited = { vestibule: true };
  player = { ...spawnAt(null), moving: false, face: 1, step: 0 };
  obstacles = [];
  if (decor.vestibule) decor.vestibule();
  fade = 1;
  showToast('Новая игра. Библиотека снова ждёт.');
}

function isLocked(door) {
  return door.to === 'zone_staff' && !door.back && !havePass;
}

const keys = {};
addEventListener('keydown', e => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (storyTask) {
    if (e.code === 'Escape') closeStoryTask();
    return;
  }
  if (ending) {
    if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') ending = null;
    return;
  }
  if (dialog) {
    if (e.code === 'Escape') closeDialog();
    else if (/^Digit[1-9]$/.test(e.code)) chooseDialogOption(Number(e.code.slice(5)) - 1);
    return;
  }
  if (mini.active) {
    if (e.code === 'Escape') mini.active = false;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    return;
  }
  if (quoteCard) {
    if (e.code === 'Escape') quoteCard = null;
    return;
  }
  if (e.code === 'KeyM') { mapOpen = !mapOpen; taskOpen = false; }
  if (e.code === 'Escape') { mapOpen = false; taskOpen = false; }
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) * W / r.width;
  mouseY = (e.clientY - r.top) * H / r.height;
});
canvas.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) * W / r.width;
  mouseY = (e.clientY - r.top) * H / r.height;
  mouseDown = true;
  if (storyTask) { taskMouseDown = true; return; }
  const it = nearStoryItem();
  if (it && it.mode === 'hold' && Math.hypot(mouseX - it.x, mouseY - it.y) < 34) {
    searchTarget = it;
    searchProgress = 0;
  }
});
canvas.addEventListener('mouseup', () => {
  mouseDown = false;
  taskMouseDown = false;
  if (searchTarget && !searchTarget.found) {
    searchTarget = null;
    searchProgress = 0;
  }
});
canvas.addEventListener('mouseleave', () => {
  mouseDown = false;
  taskMouseDown = false;
  if (searchTarget && !searchTarget.found) {
    searchTarget = null;
    searchProgress = 0;
  }
});

function nearDoor() {
  const room = rooms[currentRoom];
  for (const door of room.doors) {
    const d = doorRect(door);
    const cx = d.x + d.w / 2;
    const cy = d.y + d.h / 2;
    if (Math.hypot(player.x - cx, player.y - cy) < INTERACT_DIST) {
      return door;
    }
  }
  return null;
}

function travelToRoom(id) {
  if (id === currentRoom) { mapOpen = false; return; }
  if (!visited[id]) {
    showToast('Сначала посетите эту комнату');
    return;
  }
  const from = currentRoom;
  currentRoom = id;
  visited[id] = true;
  const entry = rooms[id].doors.find(d => d.to === from) || rooms[id].doors[0];
  player = { ...spawnAt(entry), moving: false, face: player.face, step: 0 };
  if (decor[id]) {
    obstacles = [];
    decor[id]();
  }
  mapOpen = false;
  fade = 1;
  showToast('Быстрый переход: ' + rooms[id].name);
}

canvas.addEventListener('click', e => {
  e = e || {};
  if (mini.active) { mini.active = false; return; }
  if (quoteCard) { quoteCard = null; return; }

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX != null ? (e.clientX - rect.left) * W / rect.width : -1;
  const my = e.clientY != null ? (e.clientY - rect.top) * H / rect.height : -1;

  if (storyTask) { handleStoryTaskClick(mx, my); return; }

  if (ending) {
    const buttons = endingButtons();
    if (inRect(buttons.restart, mx, my)) restartGame();
    else if (inRect(buttons.back, mx, my)) ending = null;
    else ending = null;
    return;
  }
  if (dialog) {
    const rects = dialogOptionRects();
    for (let i = 0; i < rects.length; i++) {
      if (inRect(rects[i], mx, my)) { chooseDialogOption(i); return; }
    }
    return;
  }

  if (mapOpen) {
    const node = mapNodeAt(mx, my);
    if (node) {
      if (node.id === currentRoom) mapOpen = false;
      else if (visited[node.id]) travelToRoom(node.id);
      else showToast('Сначала посетите эту комнату');
      return;
    }
    mapOpen = false;
    return;
  }
  if (taskOpen) { taskOpen = false; return; }

  if (e.clientX != null) {
    if (inRect(UI.tasks, mx, my)) { taskOpen = true; return; }
    if (inRect(UI.map, mx, my)) { mapOpen = true; return; }
    if (inRect(UI.exit, mx, my)) { showToast('Главное меню пока в разработке'); return; }
    if (storyLocked && inRect(UI.restart, mx, my)) { restartGame(); return; }
  }

  const item = nearItem();
  if (item) {
    if (item.id === 'pass' && !havePass) openMini();
    return;
  }

  const storyItem = nearStoryItem();
  if (storyItem) {
    startStorySearch(storyItem);
    return;
  }

  const obj = nearInteract();
  if (obj) {
    if (obj.id === 'final_book') { openFinalBook(); return; }
    if (obj.npc) { talkToNpc(obj.npc); return; }
    if (obj.quoteData) { quoteCard = obj.quoteData; return; }
    showToast(obj.text);
    return;
  }
  const door = nearDoor();
  if (!door) return;
  if (isLocked(door)) {
    showToast('Нужен пропуск сотрудника — получи его у секретаря в вестибюле');
    return;
  }
  const from = currentRoom;
  currentRoom = door.to;
  visited[currentRoom] = true;
  const entry = rooms[currentRoom].doors.find(d => d.to === from);
  player = { ...spawnAt(entry), moving: false, face: player.face, step: 0 };
  if (decor[currentRoom]) {
    obstacles = [];
    decor[currentRoom]();
  }
  fade = 1;
});

function doorLabel(door) {
  const target = rooms[door.to];
  return (door.back ? '← ' : '') + target.short;
}

function update(dt) {
  if (fade > 0) fade = Math.max(0, fade - dt * 1.55);
  if (storyTask) { updateStoryTask(dt); return; }
  if (mini.active) { updateMini(dt); return; }
  if (mapOpen || taskOpen || quoteCard || dialog || ending) return;
  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  if (dx && dy) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }
  player.x += dx * PLAYER_SPEED * dt;
  player.y += dy * PLAYER_SPEED * dt;
  player.moving = !!(dx || dy);
  if (dx) player.face = dx > 0 ? 1 : -1;
  if (player.moving) player.step += dt * 10;

  const minX = MARGIN + PLAYER_R;
  const maxX = W - MARGIN - PLAYER_R;
  const minY = MARGIN + PLAYER_R;
  const maxY = H - MARGIN - PLAYER_R;
  const res = resolveCollisions(player.x, player.y);
  player.x = Math.max(minX, Math.min(maxX, res.x));
  player.y = Math.max(minY, Math.min(maxY, res.y));
  updateStorySearch(dt);
}

function fitText(text, x, y, maxW, size) {
  let s = size;
  ctx.font = `bold ${s}px ${SERIF}`;
  while (ctx.measureText(text).width > maxW && s > 10) {
    s--;
    ctx.font = `bold ${s}px ${SERIF}`;
  }
  ctx.fillText(text, x, y);
}

function wrapText(text, x, y, maxW, lineH, maxLines) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, maxLines || lines.length);
  if (lines.length > shown.length) {
    let last = shown[shown.length - 1];
    while (ctx.measureText(last + '…').width > maxW && last.length > 3) last = last.slice(0, -1);
    shown[shown.length - 1] = last + '…';
  }
  const startY = y - (shown.length - 1) * lineH / 2;
  shown.forEach((l, i) => ctx.fillText(l, x, startY + i * lineH));
}

function drawCatLegacy(p) {
  const t = performance.now();
  const moving = p.moving;
  const bounce = moving ? Math.abs(Math.sin(p.step)) * 3 : 0;
  const breathe = moving ? 0 : Math.sin(t / 520) * 0.35;
  const x = p.x;
  const y = p.y - bounce;
  const r = PLAYER_R;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p.face, 1);

  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath();
  ctx.ellipse(0, r + bounce + 3, r, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (moving) {
    const dust = 0.5 + Math.sin(p.step * 2) * 0.5;
    ctx.fillStyle = `rgba(218,194,158,${(0.05 + dust * 0.035).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(-r * 0.5 - dust * 4, r + bounce + 2, 4 + dust * 3, 1.6, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.5 + dust * 3, r + bounce + 3, 3 + dust * 2, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const stepSwing = moving ? Math.sin(p.step) : 0;
  const armSwing = moving ? stepSwing * r * 0.3 : breathe * 0.6;
  const legSwing = moving ? -stepSwing * r * 0.28 : 0;

  ctx.strokeStyle = '#3f3028';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, r * 0.5);
  ctx.lineTo(-r * 0.3 + legSwing, r * 0.9);
  ctx.moveTo(r * 0.28, r * 0.5);
  ctx.lineTo(r * 0.3 - legSwing, r * 0.9);
  ctx.stroke();

  ctx.fillStyle = '#3a2418';
  ctx.beginPath();
  ctx.ellipse(-r * 0.31 + legSwing, r * 0.94, r * 0.24, r * 0.13, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.31 - legSwing, r * 0.94, r * 0.24, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35 + legSwing, r * 0.9, r * 0.08, r * 0.04, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.35 - legSwing, r * 0.9, r * 0.08, r * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGrad = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.75);
  bodyGrad.addColorStop(0, '#a8823e');
  bodyGrad.addColorStop(0.7, '#8a682e');
  bodyGrad.addColorStop(1, '#6e5224');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, r * 0.55);
  ctx.quadraticCurveTo(-r * 0.58, -r * 0.15, -r * 0.5, -r * 0.62);
  ctx.lineTo(r * 0.5, -r * 0.62);
  ctx.quadraticCurveTo(r * 0.58, -r * 0.15, r * 0.6, r * 0.55);
  ctx.quadraticCurveTo(0, r * 0.68, -r * 0.6, r * 0.55);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#e3d6bd';
  ctx.beginPath();
  ctx.moveTo(-r * 0.24, -r * 0.5 + breathe * 0.2);
  ctx.lineTo(r * 0.24, -r * 0.5 + breathe * 0.2);
  ctx.lineTo(r * 0.32, r * 0.52);
  ctx.quadraticCurveTo(0, r * 0.63, -r * 0.32, r * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,130,90,.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = PALETTE.brass;
  ctx.beginPath(); ctx.arc(0, r * 0.06, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, r * 0.24, 1.3, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#563424';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.42, -r * 0.52);
  ctx.quadraticCurveTo(-r * 0.12, -r * 0.1, r * 0.39, r * 0.2);
  ctx.stroke();

  ctx.fillStyle = '#6b3a22';
  roundRect(r * 0.1, r * 0.08, r * 0.5, r * 0.42, r * 0.09);
  ctx.fill();
  ctx.fillStyle = '#8a4c2c';
  roundRect(r * 0.1, r * 0.08, r * 0.5, r * 0.13, r * 0.07);
  ctx.fill();
  ctx.fillStyle = '#e8d5ae';
  ctx.fillRect(r * 0.16, r * 0.03, r * 0.34, r * 0.09);
  ctx.strokeStyle = 'rgba(90,60,40,.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(r * 0.2, r * 0.06); ctx.lineTo(r * 0.45, r * 0.06);
  ctx.stroke();
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(r * 0.33, r * 0.19, r * 0.06, r * 0.05);

  ctx.strokeStyle = '#d9c8a8';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.26, -r * 0.5); ctx.lineTo(-r * 0.36, -r * 0.72);
  ctx.moveTo(r * 0.26, -r * 0.5); ctx.lineTo(r * 0.36, -r * 0.72);
  ctx.stroke();

  ctx.fillStyle = '#ece4d2';
  ctx.beginPath();
  ctx.moveTo(-r * 0.22, -r * 0.6);
  ctx.lineTo(0, -r * 0.4);
  ctx.lineTo(r * 0.22, -r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a3636';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.52);
  ctx.lineTo(r * 0.04, -r * 0.48);
  ctx.lineTo(0, -r * 0.3);
  ctx.lineTo(-r * 0.04, -r * 0.48);
  ctx.closePath();
  ctx.fill();

  for (const s of [-1, 1]) {
    const swing = s === 1 ? armSwing : -armSwing;
    ctx.strokeStyle = s === 1 ? '#8a682e' : '#a8823e';
    ctx.lineWidth = 4.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * r * 0.5, -r * 0.34);
    ctx.quadraticCurveTo(s * r * 0.7, -r * 0.12, s * r * 0.72 + swing * 0.2, r * 0.36 + swing);
    ctx.stroke();
    ctx.fillStyle = '#e8c3a0';
    ctx.beginPath();
    ctx.arc(s * r * 0.72 + swing * 0.2, r * 0.36 + swing, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  const hy = -r * 1.02;
  const hr = r * 0.6;

  ctx.fillStyle = '#4a2b1c';
  ctx.beginPath();
  ctx.ellipse(0, hy + hr * 0.18, hr * 1.06, hr * 1.02, 0, 0, Math.PI * 2);
  ctx.fill();

  const headGrad = ctx.createRadialGradient(-hr * 0.3, hy - hr * 0.3, hr * 0.15, 0, hy, hr * 1.1);
  headGrad.addColorStop(0, '#e9cdb0');
  headGrad.addColorStop(0.7, '#dcb28e');
  headGrad.addColorStop(1, '#c99b76');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, hy, hr, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a2b1c';
  ctx.beginPath();
  ctx.ellipse(0, hy - hr * 0.42, hr * 1.02, hr * 0.64, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-hr * 0.98, hy - hr * 0.18);
  ctx.quadraticCurveTo(-hr * 0.6, hy - hr * 0.66, -hr * 0.12, hy - hr * 0.3);
  ctx.quadraticCurveTo(hr * 0.24, hy - hr * 0.68, hr * 0.92, hy - hr * 0.16);
  ctx.lineTo(hr * 0.82, hy - hr * 0.86);
  ctx.lineTo(-hr * 0.84, hy - hr * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-hr * 0.92, hy + hr * 0.14, hr * 0.22, hr * 0.56, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hr * 0.92, hy + hr * 0.14, hr * 0.22, hr * 0.56, -0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8b2f24';
  ctx.beginPath();
  ctx.moveTo(-hr * 0.76, hy - hr * 0.64);
  ctx.lineTo(-hr * 1.08, hy - hr * 0.78);
  ctx.lineTo(-hr * 1.02, hy - hr * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-hr * 0.72, hy - hr * 0.58);
  ctx.lineTo(-hr * 1.12, hy - hr * 0.46);
  ctx.lineTo(-hr * 0.98, hy - hr * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.brass;
  ctx.beginPath();
  ctx.arc(-hr * 0.82, hy - hr * 0.53, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,.13)';
  ctx.beginPath();
  ctx.ellipse(-hr * 0.2, hy - hr * 0.56, hr * 0.44, hr * 0.13, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,244,220,.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hr * 0.14, hy - hr * 0.78);
  ctx.quadraticCurveTo(hr * 0.52, hy - hr * 0.56, hr * 0.48, hy - hr * 0.16);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,220,160,.2)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, hy, hr - 0.6, -0.62 * Math.PI, 0.18 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = PALETTE.brass;
  ctx.beginPath();
  ctx.arc(hr * 0.7, hy - hr * 0.36, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(70,40,28,.75)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-hr * 0.56, hy - hr * 0.28); ctx.lineTo(-hr * 0.24, hy - hr * 0.33);
  ctx.moveTo(hr * 0.24, hy - hr * 0.33); ctx.lineTo(hr * 0.56, hy - hr * 0.28);
  ctx.stroke();

  const blink = Math.sin(t / 900) > 0.99;
  const ex = hr * 0.34, ey = hy + hr * 0.1;
  if (blink) {
    ctx.strokeStyle = '#3a2b20';
    ctx.lineWidth = 1.3;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * ex - hr * 0.13, ey);
      ctx.quadraticCurveTo(s * ex, ey + hr * 0.08, s * ex + hr * 0.13, ey);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#3a2b22';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * ex, ey, hr * 0.14, hr * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * ex - hr * 0.04, ey - hr * 0.06, hr * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.strokeStyle = 'rgba(150,90,60,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, hy + hr * 0.3);
  ctx.lineTo(-hr * 0.02, hy + hr * 0.4);
  ctx.stroke();

  ctx.strokeStyle = '#7a4238';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, hy + hr * 0.48, hr * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawCat(p) {
  const t = performance.now();
  const moving = p.moving;
  const bounce = moving ? Math.abs(Math.sin(p.step)) * 3 : 0;
  const breathe = moving ? 0 : Math.sin(t / 520) * 0.35;
  const r = PLAYER_R;

  ctx.save();
  ctx.translate(p.x, p.y - bounce);
  ctx.scale(p.face, 1);

  ctx.fillStyle = 'rgba(0,0,0,.34)';
  ctx.beginPath();
  ctx.ellipse(0, r + bounce + 3, r * 0.92, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (moving) {
    const dust = 0.5 + Math.sin(p.step * 2) * 0.5;
    ctx.fillStyle = `rgba(218,194,158,${(0.05 + dust * 0.035).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(-r * 0.5 - dust * 4, r + bounce + 2, 4 + dust * 3, 1.6, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.5 + dust * 3, r + bounce + 3, 3 + dust * 2, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const stepSwing = moving ? Math.sin(p.step) : 0;
  const armSwing = moving ? stepSwing * r * 0.3 : breathe * 0.6;
  const legSwing = moving ? -stepSwing * r * 0.26 : 0;

  // ноги: тёмные колготки и туфельки
  ctx.strokeStyle = '#4a3038';
  ctx.lineWidth = 4.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.26, r * 0.5);
  ctx.lineTo(-r * 0.28 + legSwing, r * 0.92);
  ctx.moveTo(r * 0.26, r * 0.5);
  ctx.lineTo(r * 0.28 - legSwing, r * 0.92);
  ctx.stroke();

  ctx.fillStyle = '#3a2418';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3 + legSwing, r * 0.97, r * 0.23, r * 0.12, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.3 - legSwing, r * 0.97, r * 0.23, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,235,210,.22)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34 + legSwing, r * 0.93, r * 0.07, r * 0.035, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.34 - legSwing, r * 0.93, r * 0.07, r * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();

  // длинное пальто цвета бутылочного стекла
  const coat = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.7);
  coat.addColorStop(0, '#3b6b56');
  coat.addColorStop(0.65, '#2c5243');
  coat.addColorStop(1, '#1e3d31');
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-r * 0.52, r * 0.6);
  ctx.quadraticCurveTo(-r * 0.62, r * 0.02, -r * 0.44, -r * 0.58);
  ctx.lineTo(r * 0.44, -r * 0.58);
  ctx.quadraticCurveTo(r * 0.62, r * 0.02, r * 0.52, r * 0.6);
  ctx.quadraticCurveTo(0, r * 0.72, -r * 0.52, r * 0.6);
  ctx.closePath();
  ctx.fill();

  // запах пальто и пуговицы
  ctx.strokeStyle = 'rgba(20,40,32,.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.5);
  ctx.lineTo(0, r * 0.58);
  ctx.stroke();
  ctx.fillStyle = PALETTE.brass;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-r * 0.1, -r * 0.2 + i * r * 0.26, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // шарф
  ctx.fillStyle = '#d9a45c';
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.58);
  ctx.quadraticCurveTo(0, -r * 0.44 + breathe * 0.2, r * 0.3, -r * 0.58);
  ctx.quadraticCurveTo(r * 0.26, -r * 0.4, 0, -r * 0.36 + breathe * 0.2);
  ctx.quadraticCurveTo(-r * 0.26, -r * 0.4, -r * 0.3, -r * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(120,70,30,.35)';
  ctx.fillRect(-r * 0.06, -r * 0.44, r * 0.12, r * 0.1);

  // руки
  for (const s of [-1, 1]) {
    const swing = s === 1 ? armSwing : -armSwing;
    ctx.strokeStyle = s === 1 ? '#2c5243' : '#3b6b56';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * r * 0.46, -r * 0.36);
    ctx.quadraticCurveTo(s * r * 0.64, -r * 0.1, s * r * 0.66 + swing * 0.2, r * 0.34 + swing);
    ctx.stroke();
    ctx.fillStyle = '#ecc8a8';
    ctx.beginPath();
    ctx.arc(s * r * 0.66 + swing * 0.2, r * 0.34 + swing, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }

  // сумка с книгой через плечо
  ctx.strokeStyle = '#5a3422';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.5);
  ctx.quadraticCurveTo(-r * 0.1, -r * 0.05, r * 0.36, r * 0.18);
  ctx.stroke();
  ctx.fillStyle = '#6b3a22';
  roundRect(r * 0.12, r * 0.06, r * 0.46, r * 0.4, r * 0.09);
  ctx.fill();
  ctx.fillStyle = '#8a4c2c';
  roundRect(r * 0.12, r * 0.06, r * 0.46, r * 0.12, r * 0.07);
  ctx.fill();
  ctx.fillStyle = '#f2e4c6';
  ctx.fillRect(r * 0.15, r * 0.02, r * 0.16, r * 0.11);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(r * 0.33, r * 0.17, r * 0.05, r * 0.05);

  // голова и волосы
  const hy = -r * 1.02;
  const hr = r * 0.6;

  ctx.fillStyle = '#8a4a2a';
  ctx.beginPath();
  ctx.ellipse(0, hy + hr * 0.16, hr * 1.06, hr * 1.02, 0, 0, Math.PI * 2);
  ctx.fill();

  const headGrad = ctx.createRadialGradient(-hr * 0.3, hy - hr * 0.3, hr * 0.15, 0, hy, hr * 1.1);
  headGrad.addColorStop(0, '#f4d6b8');
  headGrad.addColorStop(0.7, '#e8c3a0');
  headGrad.addColorStop(1, '#d2a880');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, hy, hr, 0, Math.PI * 2);
  ctx.fill();

  // причёска: объём сверху и длинные пряди по бокам
  ctx.fillStyle = '#8a4a2a';
  ctx.beginPath();
  ctx.ellipse(0, hy - hr * 0.36, hr * 1.02, hr * 0.7, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-hr * 0.98, hy - hr * 0.2);
  ctx.quadraticCurveTo(-hr * 0.72, hy - hr * 0.78, -hr * 0.2, hy - hr * 0.62);
  ctx.quadraticCurveTo(-hr * 0.62, hy - hr * 0.32, -hr * 0.86, hy + hr * 0.36);
  ctx.quadraticCurveTo(-hr * 1.14, hy + hr * 0.5, -hr * 0.92, hy + hr * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hr * 0.98, hy - hr * 0.2);
  ctx.quadraticCurveTo(hr * 0.72, hy - hr * 0.78, hr * 0.2, hy - hr * 0.62);
  ctx.quadraticCurveTo(hr * 0.62, hy - hr * 0.32, hr * 0.86, hy + hr * 0.36);
  ctx.quadraticCurveTo(hr * 1.14, hy + hr * 0.5, hr * 0.92, hy + hr * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,180,.2)';
  ctx.beginPath();
  ctx.ellipse(-hr * 0.2, hy - hr * 0.56, hr * 0.44, hr * 0.12, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // брови, глаза с ресницами, нос, улыбка, румянец
  ctx.strokeStyle = 'rgba(90,52,34,.8)';
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-hr * 0.56, hy - hr * 0.26);
  ctx.quadraticCurveTo(-hr * 0.38, hy - hr * 0.34, -hr * 0.2, hy - hr * 0.28);
  ctx.moveTo(hr * 0.2, hy - hr * 0.28);
  ctx.quadraticCurveTo(hr * 0.38, hy - hr * 0.34, hr * 0.56, hy - hr * 0.26);
  ctx.stroke();

  const blink = Math.sin(t / 900) > 0.985;
  const ex = hr * 0.34, ey = hy + hr * 0.1;
  if (blink) {
    ctx.strokeStyle = '#3a2b20';
    ctx.lineWidth = 1.3;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * ex - hr * 0.13, ey);
      ctx.quadraticCurveTo(s * ex, ey + hr * 0.08, s * ex + hr * 0.13, ey);
      ctx.stroke();
    }
  } else {
    for (const s of [-1, 1]) {
      ctx.fillStyle = 'rgba(255,250,240,.8)';
      ctx.beginPath();
      ctx.ellipse(s * ex, ey, hr * 0.15, hr * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a3428';
      ctx.beginPath();
      ctx.ellipse(s * ex, ey, hr * 0.1, hr * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath();
      ctx.arc(s * ex - hr * 0.035, ey - hr * 0.05, hr * 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,40,28,.75)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(s * ex + s * hr * 0.12, ey - hr * 0.11);
      ctx.lineTo(s * ex + s * hr * 0.22, ey - hr * 0.2);
      ctx.moveTo(s * ex + s * hr * 0.03, ey - hr * 0.15);
      ctx.lineTo(s * ex + s * hr * 0.08, ey - hr * 0.27);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(150,90,60,.45)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, hy + hr * 0.3);
  ctx.lineTo(-hr * 0.03, hy + hr * 0.4);
  ctx.stroke();

  ctx.strokeStyle = '#a0453f';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, hy + hr * 0.47, hr * 0.17, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = 'rgba(220,120,110,.18)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * hr * 0.6, hy + hr * 0.36, hr * 0.18, hr * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawLambGuard(cx, cy, s, opts) {
  const t = performance.now();
  const sec = !!(opts && opts.secretary);
  const coat = sec ? '#7a5a44' : '#2e5288';
  const coatDark = sec ? '#5e4432' : '#1e3a63';
  const shirt = sec ? '#f0e6d2' : '#eef2f7';
  const tieCol = sec ? '#7a4a30' : '#c9a23a';
  const hairCol = sec ? '#6a4a2e' : '#3a2a22';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(0, 31, 18, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#232c3c';
  roundRect(-8, 16, 6.5, 12, 2); ctx.fill();
  roundRect(1.5, 16, 6.5, 12, 2); ctx.fill();
  ctx.fillStyle = '#241a14';
  ctx.beginPath();
  ctx.ellipse(-4.5, 29, 5, 2.4, 0, 0, Math.PI * 2);
  ctx.ellipse(4.5, 29, 5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = coatDark;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.lineTo(-16, 20);
  ctx.stroke();
  ctx.fillStyle = '#f0c9a6';
  ctx.beginPath(); ctx.arc(-16, 21, 3.2, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-14, -8);
  ctx.quadraticCurveTo(-16, 10, -12, 20);
  ctx.quadraticCurveTo(0, 24, 12, 20);
  ctx.quadraticCurveTo(16, 10, 14, -8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(-6, -7);
  ctx.lineTo(0, 8);
  ctx.lineTo(6, -7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = coatDark;
  ctx.beginPath();
  ctx.moveTo(-6, -7); ctx.lineTo(0, 8); ctx.lineTo(-2.2, 8); ctx.lineTo(-8, -5);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -7); ctx.lineTo(0, 8); ctx.lineTo(2.2, 8); ctx.lineTo(8, -5);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = tieCol;
  ctx.beginPath();
  ctx.moveTo(0, -5); ctx.lineTo(2, -2); ctx.lineTo(0, 9); ctx.lineTo(-2, -2);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = PALETTE.brass;
  ctx.beginPath(); ctx.arc(3.5, 11, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3.5, 15.5, 1.2, 0, Math.PI * 2); ctx.fill();
  if (!sec) {
    ctx.fillStyle = '#e0b25c';
    roundRect(-11, -2, 4, 5, 1); ctx.fill();
    ctx.fillStyle = '#1e3a63';
    ctx.fillRect(-10.2, -1.2, 2.4, 1);
    ctx.fillRect(-10.2, 0.4, 2.4, 1);
    ctx.fillStyle = '#e0b25c';
    roundRect(-15, -9, 6, 2.4, 1); ctx.fill();
    roundRect(9, -9, 6, 2.4, 1); ctx.fill();
  } else {
    ctx.fillStyle = '#e0b25c';
    roundRect(-11, -2, 5, 6, 1.2); ctx.fill();
    ctx.fillStyle = coatDark;
    ctx.fillRect(-10.2, -0.8, 3.4, 1);
    ctx.fillRect(-10.2, 1, 3.4, 1);
  }

  let hy = -19;
  ctx.fillStyle = '#eec3a0';
  ctx.fillRect(-3, -11, 6, 5);
  ctx.save();
  ctx.translate(0, hy);
  ctx.scale(0.8, 0.8);
  hy = 0;
  ctx.beginPath();
  ctx.arc(-9.2, hy + 1, 2, 0, Math.PI * 2);
  ctx.arc(9.2, hy + 1, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0c9a6';
  ctx.beginPath(); ctx.arc(0, hy, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hairCol;
  ctx.beginPath(); ctx.ellipse(0, hy - 4.5, 10.3, 6.2, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-9.2, hy + (sec ? 1.6 : 0.5), 2, sec ? 4.4 : 3.4, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9.2, hy + (sec ? 1.6 : 0.5), 2, sec ? 4.4 : 3.4, 0.15, 0, Math.PI * 2); ctx.fill();
  if (sec) {
    ctx.strokeStyle = 'rgba(242,226,200,.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-4, hy - 6.2);
    ctx.quadraticCurveTo(-1.5, hy - 7.4, 2.5, hy - 6.4);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(60,40,30,.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-5.4, hy - 3.4); ctx.lineTo(-2.4, hy - 3.6);
  ctx.moveTo(2.4, hy - 3.6); ctx.lineTo(5.4, hy - 3.4);
  ctx.stroke();

  ctx.fillStyle = '#2a1c14';
  ctx.beginPath();
  ctx.arc(-3.6, hy + 0.4, 1.6, 0, Math.PI * 2);
  ctx.arc(3.6, hy + 0.4, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.beginPath();
  ctx.arc(-4.1, hy - 0.1, 0.6, 0, Math.PI * 2);
  ctx.arc(3.1, hy - 0.1, 0.6, 0, Math.PI * 2);
  ctx.fill();

  if (sec) {
    ctx.fillStyle = 'rgba(150,100,60,.12)';
    ctx.beginPath(); ctx.arc(-3.6, hy + 0.4, 4.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3.6, hy + 0.4, 4.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a3820';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-3.6, hy + 0.4, 4.4, 0, Math.PI * 2);
    ctx.moveTo(3.6 + 4.4, hy + 0.4);
    ctx.arc(3.6, hy + 0.4, 4.4, 0, Math.PI * 2);
    ctx.moveTo(-0.9, hy + 0.4); ctx.lineTo(0.9, hy + 0.4);
    ctx.moveTo(-8, hy + 0.4); ctx.lineTo(-9.9, hy - 0.4);
    ctx.moveTo(8, hy + 0.4); ctx.lineTo(9.9, hy - 0.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,215,.5)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(-4.8, hy - 0.6, 2.5, Math.PI * 1.15, Math.PI * 1.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(2.4, hy - 0.6, 2.5, Math.PI * 1.15, Math.PI * 1.55);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(150,90,60,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, hy + 1.6); ctx.lineTo(-0.5, hy + 3.2);
  ctx.stroke();
  ctx.strokeStyle = '#8a4a3a';
  ctx.beginPath();
  ctx.arc(0, hy + 4.2, 2.2, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = 'rgba(220,120,110,.1)';
  ctx.beginPath();
  ctx.ellipse(-6.4, hy + 3.4, 2, 1.2, 0, 0, Math.PI * 2);
  ctx.ellipse(6.4, hy + 3.4, 2, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!sec) {
    ctx.fillStyle = '#1e3a63';
    ctx.beginPath();
    ctx.ellipse(0, hy - 8.6, 13.4, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16294a';
    roundRect(-12, hy - 12, 24, 5.6, 2.4); ctx.fill();
    ctx.fillStyle = '#101d38';
    ctx.beginPath();
    ctx.ellipse(0, hy - 6.4, 11.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e0b25c';
    ctx.beginPath(); ctx.arc(0, hy - 9, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2e5288';
    ctx.beginPath(); ctx.arc(0, hy - 9, 0.9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  const wt = Math.sin(t / 170) * 2.4;
  ctx.strokeStyle = coatDark;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(11, 2);
  ctx.quadraticCurveTo(18, 10, 21, 19 + wt);
  ctx.stroke();
  ctx.fillStyle = '#f0c9a6';
  ctx.beginPath(); ctx.arc(21.5, 20 + wt, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a1610';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(22.5, 18 + wt);
  ctx.lineTo(30, 28 + wt);
  ctx.stroke();
  ctx.fillStyle = PALETTE.brass;
  ctx.beginPath(); ctx.arc(30.5, 28.5 + wt, 1.4, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

function drawSecretary(cx, cy, s) {
  drawLambGuard(cx, cy, s, { secretary: true });
}

function drawTrafficLamp(cx, cy, r, color, on) {
  if (on) {
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 2.2);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = on ? color : 'rgba(58,40,30,.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (on) {
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
}

const MINI_PANEL = { x: 210, y: 92, w: 540, h: 356 };

function drawMiniGame() {
  const t = performance.now();
  const redOn = mini.light === 'red';

  ctx.fillStyle = 'rgba(10,6,4,.82)';
  ctx.fillRect(0, 0, W, H);

  const p = MINI_PANEL;
  ctx.fillStyle = 'rgba(38,24,16,.98)';
  roundRect(p.x, p.y, p.w, p.h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 22px ' + SERIF;
  ctx.fillText('Стол секретаря', W / 2, p.y + 30);
  ctx.font = '13px ' + SERIF;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('«Тише едешь — дальше будешь»', W / 2, p.y + 52);

  drawSecretary(p.x + 120, p.y + 100, 1);

  const deskX = p.x + 60, deskY = p.y + 138, deskW = 180, deskH = 50;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(deskX + 4, deskY + 5, deskW, deskH);
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(deskX, deskY, deskW, deskH);
  ctx.fillStyle = '#6e3a22';
  ctx.fillRect(deskX, deskY, deskW, 10);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  for (let i = 1; i < 4; i++) ctx.fillRect(deskX + (deskW / 4) * i - 1, deskY + 10, 2, deskH - 10);

  ctx.fillStyle = '#f3e3c2';
  ctx.fillRect(p.x + 135, deskY + 12, 46, 26);
  ctx.strokeStyle = 'rgba(90,60,40,.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(p.x + 140, deskY + 19 + i * 6);
    ctx.lineTo(p.x + 174 - i * 6, deskY + 19 + i * 6);
    ctx.stroke();
  }
  drawPass(p.x + 200, deskY + 25);

  const lx = p.x + 388, ly = p.y + 88, lw = 86, lh = 132;
  ctx.fillStyle = '#221712';
  roundRect(lx, ly, lw, lh, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const lampX = lx + lw / 2;
  drawTrafficLamp(lampX, ly + 34, 13, '#e0523f', redOn);
  drawTrafficLamp(lampX, ly + 88, 13, '#7fc05a', !redOn);

  ctx.textAlign = 'center';
  ctx.font = 'bold 12px ' + SERIF;
  ctx.fillStyle = redOn ? '#e08080' : '#9fd07a';
  ctx.fillText(redOn ? 'СТОЙ' : 'ИДИ', lampX, ly + 118);

  const activeY = redOn ? ly + 34 : ly + 88;
  const frac = Math.max(0, Math.min(1, mini.timer / (redOn ? mini.redDur : mini.greenDur)));
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(lampX, activeY, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();

  const tx = p.x + 55, ty = p.y + 244, tw = p.w - 110;
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  roundRect(tx, ty, tw, 14, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,178,92,.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const prog = Math.max(0, Math.min(1, mini.progress / 100));
  if (prog > 0) {
    ctx.fillStyle = redOn ? '#8b2f24' : '#6f9553';
    roundRect(tx, ty, Math.max(10, tw * prog), 14, 7);
    ctx.fill();
  }

  ctx.fillStyle = '#4a2618';
  ctx.fillRect(tx + tw + 10, ty - 18, 28, 30);
  ctx.fillStyle = '#6e3a22';
  ctx.fillRect(tx + tw + 10, ty - 18, 28, 6);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(tx + tw + 18, ty - 26, 11, 8);

  const held = !!(keys['KeyW'] || keys['ArrowUp'] || keys['Space']);
  drawCat({ x: tx + tw * prog, y: ty - 8, moving: held && !redOn && !mini.status, face: 1, step: t / 120 });

  ctx.textAlign = 'right';
  ctx.font = '11px ' + SERIF;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(Math.round(mini.progress) + '%', tx + tw + 4, ty - 12);

  ctx.textAlign = 'center';
  if (mini.status === 'caught') {
    ctx.fillStyle = '#e08080';
    ctx.font = 'bold 14px ' + SERIF;
    ctx.fillText('Поймали! Начни заново', W / 2, p.y + 286);
  } else {
    ctx.fillStyle = redOn ? '#e0a08a' : PALETTE.gold;
    ctx.font = 'bold 14px ' + SERIF;
    ctx.fillText(redOn ? 'Красный — замри!' : 'Зелёный — иди!', W / 2, p.y + 286);
  }

  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '13px ' + SERIF;
  ctx.fillText('Удерживай W или ↑, пока горит зелёный. На красный отпусти.', W / 2, p.y + 312);

  ctx.fillStyle = PALETTE.dim;
  ctx.font = '11px ' + SERIF;
  ctx.fillText('Дойди до стойки и забери пропуск.  Esc — выйти', W / 2, p.y + 334);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(232,213,174,.55)';
  ctx.font = '13px ' + SERIF;
  ctx.fillText('✕', p.x + p.w - 18, p.y + 18);
  ctx.textAlign = 'left';
}

function drawPass(x, y) {
  const glow = 0.5 + Math.sin(performance.now() / 300) * 0.5;
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = `rgba(224,178,92,${0.12 + glow * 0.14})`;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(-0.15);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(-12, -8, 27, 19);
  ctx.fillStyle = PALETTE.parchment;
  ctx.fillRect(-13, -9, 26, 18);
  ctx.fillStyle = PALETTE.wine;
  ctx.fillRect(-13, -9, 26, 5);
  ctx.fillStyle = '#3b2018';
  ctx.fillRect(-9, -1, 8, 6);
  ctx.fillStyle = '#9a8468';
  ctx.fillRect(2, -1, 9, 2);
  ctx.fillRect(2, 3, 9, 2);
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 1;
  ctx.strokeRect(-13, -9, 26, 18);
  ctx.restore();

  ctx.fillStyle = PALETTE.gold;
  ctx.font = '12px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Пропуск', x, y + 14);
}

function drawLock(cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(-7, -2, 14, 11);
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -2, 5, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#3b2018';
  ctx.beginPath();
  ctx.arc(0, 3, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-1, 3, 2, 4);
  ctx.restore();
}

const floors = {
  hall: '#5e3423',
  vestibule: '#63412f',
  abonement: '#5f3826',
  zone_reading: '#633b26',
  hall_universal: '#603a26',
  hall_periodics: '#5c3826',
  multifunc: '#4d2f2b',
  computer_class: '#413a34',
  zone_storage: '#44322a',
  fund_main: '#3f2d24',
  archive: '#3d2a21',
  workshops: '#483429',
  climate: '#443a34',
  zone_staff: '#4f3329',
  admin: '#53352a',
  departments: '#503429',
  security: '#403b36',
  toilets: '#453b36',
  buffet: '#5c3826'
};

const PALETTE = {
  bg: '#140b09',
  wall: '#3d1a20',
  wallLine: '#2a1014',
  wallLight: 'rgba(255,215,170,.07)',
  base: '#2a120e',
  door: '#5e2d1d',
  doorHot: '#7f4224',
  doorLocked: '#3f1412',
  frame: '#3a1a14',
  brass: '#e0b45c',
  parchment: '#f0dfba',
  parchmentDark: '#3b2018',
  gold: '#ecc174',
  wine: '#7e2233',
  emerald: '#1f4a3a',
  cream: '#f6ecd8',
  dim: '#b39a80'
};

const SERIF = 'Georgia, "Times New Roman", serif';

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function softShadow(x, y, rx, ry, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(0.55, `rgba(0,0,0,${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function contactShadow(x, y, w, h, strength) {
  const k = strength == null ? 1 : strength;
  const rx = Math.max(w, 26) * 0.62;
  const ry = Math.max(6, Math.min(22, h * 0.26));
  softShadow(x + w / 2 + 3, y + h * 0.86, rx, ry, 0.30 * k);
}

function woodGradient(x, y, w, h, top, bottom) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

function drawFloorTiles(x, y, w, h, step, c1, c2, grout) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const rows = Math.ceil(h / step);
  const cols = Math.ceil(w / step);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = (r + c) % 2 ? c1 : c2;
      ctx.fillRect(x + c * step, y + r * step, step + 0.5, step + 0.5);
      ctx.fillStyle = 'rgba(255,235,205,.025)';
      ctx.fillRect(x + c * step + 1, y + r * step + 1, step - 2, 1);
    }
  }
  ctx.strokeStyle = grout;
  ctx.lineWidth = 1;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath(); ctx.moveTo(x + c * step, y); ctx.lineTo(x + c * step, y + h); ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath(); ctx.moveTo(x, y + r * step); ctx.lineTo(x + w, y + r * step); ctx.stroke();
  }
  const sheen = ctx.createLinearGradient(x, y, x, y + h);
  sheen.addColorStop(0, 'rgba(255,236,200,.055)');
  sheen.addColorStop(0.55, 'rgba(255,236,200,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,.08)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function drawRoomDepth() {
  const x = MARGIN, y = MARGIN, w = W - MARGIN * 2, h = H - MARGIN * 2;
  const top = ctx.createLinearGradient(0, y, 0, y + 38);
  top.addColorStop(0, 'rgba(8,4,3,.34)');
  top.addColorStop(1, 'rgba(8,4,3,0)');
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, 38);

  const bottom = ctx.createLinearGradient(0, y + h - 26, 0, y + h);
  bottom.addColorStop(0, 'rgba(8,4,3,0)');
  bottom.addColorStop(1, 'rgba(8,4,3,.24)');
  ctx.fillStyle = bottom;
  ctx.fillRect(x, y + h - 26, w, 26);

  const left = ctx.createLinearGradient(x, 0, x + 28, 0);
  left.addColorStop(0, 'rgba(8,4,3,.26)');
  left.addColorStop(1, 'rgba(8,4,3,0)');
  ctx.fillStyle = left;
  ctx.fillRect(x, y, 28, h);

  const right = ctx.createLinearGradient(x + w - 28, 0, x + w, 0);
  right.addColorStop(0, 'rgba(8,4,3,0)');
  right.addColorStop(1, 'rgba(8,4,3,.26)');
  ctx.fillStyle = right;
  ctx.fillRect(x + w - 28, y, 28, h);
}

function drawLampPools() {
  const t = performance.now() / 1000;
  for (let i = 0; i < lamps.length; i++) {
    const l = lamps[i];
    const pulse = 0.82 + Math.sin(t * 1.6 + i * 1.9) * 0.08;
    drawGlow('pool', 124, [
      [0, 'rgba(255,214,150,.13)'],
      [0.55, 'rgba(255,198,120,.045)'],
      [1, 'rgba(255,190,110,0)']
    ], l.x, l.y + 24, 124, 124 * 0.44, pulse);
  }
}

function drawParquet() {
  const x = MARGIN, y = MARGIN;
  const w = W - MARGIN * 2, h = H - MARGIN * 2;
  const ph = 26;
  let row = 0;
  for (let py = y; py < y + h; py += ph, row++) {
    const hh = Math.min(ph, y + h - py);
    ctx.fillStyle = row % 2 ? 'rgba(255,220,180,.035)' : 'rgba(0,0,0,.055)';
    ctx.fillRect(x, py, w, hh);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(x, py, w, 1);
    const off = (row % 2) * 55;
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    for (let sx = x + off + 85; sx < x + w; sx += 115) {
      ctx.fillRect(sx, py, 1, hh);
    }
  }
}

function drawWall() {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0,0,0,.18)';
  for (let x = 0; x < W; x += 72) ctx.fillRect(x, 0, 2, H);
  for (let y = 0; y < H; y += 72) ctx.fillRect(0, y, W, 2);

  const iw = W - MARGIN * 2, ih = H - MARGIN * 2;
  ctx.fillStyle = PALETTE.wallLight;
  ctx.fillRect(0, 0, W, MARGIN - 6);

  ctx.fillStyle = PALETTE.base;
  ctx.fillRect(MARGIN - 7, MARGIN - 7, iw + 14, 7);
  ctx.fillRect(MARGIN - 7, MARGIN + ih, iw + 14, 7);
  ctx.fillRect(MARGIN - 7, MARGIN - 7, 7, ih + 14);
  ctx.fillRect(MARGIN + iw, MARGIN - 7, 7, ih + 14);

  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(MARGIN - 1, MARGIN - 1, iw + 2, ih + 2);
}

function drawWallFrames(roomId) {
  const seedN = [...roomId].reduce((a, c) => a + c.charCodeAt(0), 0);
  const arts = [
    { x: 10, y: 90 },
    { x: W - 42, y: 380 },
    { x: 10, y: 400 },
    { x: W - 42, y: 100 }
  ];
  const picks = [arts[seedN % 4], arts[(seedN + 2) % 4]];
  const tones = ['#7a3a2a', '#4a5a4a', '#6a4a2a', '#5a3a4a'];
  for (let i = 0; i < picks.length; i++) {
    const a = picks[i];
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(a.x, a.y, 32, 44);
    ctx.fillStyle = '#1c1410';
    ctx.fillRect(a.x + 3, a.y + 3, 26, 38);
    ctx.fillStyle = tones[(seedN + i) % tones.length];
    ctx.fillRect(a.x + 5, a.y + 5, 22, 34);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.arc(a.x + 16, a.y + 20, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawInteractIcon(it, hot) {
  const x = it.x, y = it.y;
  const glow = hot ? 0.35 : 0.15 + Math.sin(performance.now() / 400 + x) * 0.06;

  ctx.fillStyle = `rgba(224,178,92,${glow})`;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);

  switch (it.icon) {
    case 'librarian': {
      ctx.fillStyle = '#2e5288';
      ctx.beginPath();
      ctx.ellipse(0, 6, 13, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eef2f7';
      ctx.beginPath();
      ctx.moveTo(-5, -2); ctx.lineTo(0, 6); ctx.lineTo(5, -2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c9a23a';
      ctx.beginPath();
      ctx.moveTo(0, -1); ctx.lineTo(1.6, 1.5); ctx.lineTo(0, 7); ctx.lineTo(-1.6, 1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8c3a0';
      ctx.fillRect(-2.4, -9, 4.8, 6);
      ctx.beginPath();
      ctx.arc(0, -12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a2b1c';
      ctx.beginPath();
      ctx.ellipse(0, -15.8, 8.3, 5.2, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-7.2, -11.5, 1.7, 3, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(7.2, -11.5, 1.7, 3, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1c14';
      ctx.beginPath(); ctx.arc(-3, -12, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -12, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath(); ctx.arc(-3.4, -12.5, 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(2.6, -12.5, 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a2b20';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(-3, -12, 3.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(3, -12, 3.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-0.3, -12); ctx.lineTo(0.3, -12); ctx.stroke();
      ctx.strokeStyle = '#7a4238';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -7.6, 1.8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#8b2f24';
      ctx.fillRect(9, 1, 9, 12);
      ctx.fillStyle = '#e8d5ae';
      ctx.fillRect(10.2, 2.2, 6.6, 9.6);
      break;
    }
    case 'book': {
      ctx.fillStyle = '#4a1f1a';
      ctx.beginPath();
      ctx.moveTo(-13, -7);
      ctx.quadraticCurveTo(-7, -10, 0, -6);
      ctx.quadraticCurveTo(7, -10, 13, -7);
      ctx.lineTo(13, 8);
      ctx.quadraticCurveTo(7, 5, 0, 9);
      ctx.quadraticCurveTo(-7, 5, -13, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f1e2c4';
      ctx.beginPath();
      ctx.moveTo(-11, -5.2);
      ctx.quadraticCurveTo(-6, -7.8, 0, -4.4);
      ctx.quadraticCurveTo(6, -7.8, 11, -5.2);
      ctx.lineTo(11, 6.4);
      ctx.quadraticCurveTo(6, 3.8, 0, 7);
      ctx.quadraticCurveTo(-6, 3.8, -11, 6.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,90,60,.5)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -4.4);
      ctx.lineTo(0, 7);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,90,60,.3)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (const yy of [-1.5, 1.4, 4.1]) {
        ctx.moveTo(-8.2, yy); ctx.lineTo(-1.8, yy);
        ctx.moveTo(1.8, yy); ctx.lineTo(8.2, yy);
      }
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(4.6, -8, 2.4, 11);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(5.1, -7.4, 0.7, 9.8);
      ctx.fillStyle = 'rgba(224,178,92,.75)';
      ctx.beginPath();
      ctx.arc(-9.5, -9.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'guestbook': {
      ctx.fillStyle = '#5e1f1a';
      ctx.fillRect(-13, -8, 26, 17);
      ctx.fillStyle = '#8b2f24';
      ctx.fillRect(-13, -8, 26, 5);
      ctx.fillStyle = '#e8d5ae';
      ctx.fillRect(-10, -2, 20, 9);
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 1;
      ctx.strokeRect(-13, -8, 26, 17);
      ctx.fillStyle = '#3b2018';
      ctx.fillRect(4, 1, 7, 1.5);
      ctx.fillRect(4, 4, 5, 1.5);
      break;
    }
    case 'sign': {
      ctx.fillStyle = '#4a2618';
      ctx.fillRect(-2, -2, 4, 16);
      ctx.fillRect(-12, 12, 24, 4);
      ctx.fillStyle = PALETTE.parchment;
      ctx.fillRect(-14, -16, 28, 16);
      ctx.strokeStyle = PALETTE.brass;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-14, -16, 28, 16);
      ctx.fillStyle = '#7a3a2a';
      ctx.fillRect(-10, -12, 20, 2);
      ctx.fillRect(-10, -8, 14, 2);
      break;
    }
    case 'monument': {
      ctx.fillStyle = '#55555f';
      ctx.fillRect(-14, 4, 28, 10);
      ctx.fillStyle = '#6b6b75';
      ctx.fillRect(-11, 1, 22, 5);
      ctx.fillStyle = '#7a5230';
      ctx.fillRect(-7, -12, 14, 14);
      ctx.fillStyle = '#8f6638';
      ctx.fillRect(-7, -12, 14, 4);
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 1;
      ctx.strokeRect(-7, -12, 14, 14);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = '8px ' + SERIF;
      ctx.textAlign = 'center';
      ctx.fillText('1905', 0, 11);
      break;
    }
    case 'globe': {
      ctx.fillStyle = '#4a2618';
      ctx.fillRect(-2, 4, 4, 10);
      ctx.fillRect(-8, 12, 16, 4);
      ctx.fillStyle = '#3f6f8f';
      ctx.beginPath();
      ctx.arc(0, -4, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a8f5a';
      ctx.beginPath();
      ctx.ellipse(-4, -7, 5, 4, 0.4, 0, Math.PI * 2);
      ctx.ellipse(5, -1, 4, 5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.brass;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -4, 13.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -4, 5, 13.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'clock': {
      ctx.fillStyle = '#4a2618';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.parchment;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3b2018';
      ctx.lineWidth = 2;
      const ang = performance.now() / 1000 * Math.PI / 30;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(ang) * 7, -Math.cos(ang) * 7);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.sin(ang * 12) * 5, -Math.cos(ang * 12) * 5);
      ctx.stroke();
      break;
    }
    case 'catalog': {
      ctx.fillStyle = '#4a2618';
      ctx.fillRect(-15, -12, 30, 25);
      ctx.fillStyle = '#5e3020';
      for (let r = 0; r < 3; r++) {
        ctx.fillRect(-12, -9 + r * 8, 24, 6);
        ctx.fillStyle = PALETTE.brass;
        ctx.fillRect(-3, -7 + r * 8, 6, 2);
        ctx.fillStyle = '#5e3020';
      }
      break;
    }
    case 'ladder': {
      ctx.strokeStyle = '#7a4526';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-9, -16);
      ctx.lineTo(-4, 15);
      ctx.moveTo(9, -16);
      ctx.lineTo(4, 15);
      ctx.stroke();
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const t = -10 + i * 8;
        ctx.beginPath();
        ctx.moveTo(-8 + i * 0.7, t);
        ctx.lineTo(8 - i * 0.7, t);
        ctx.stroke();
      }
      break;
    }
    case 'safe': {
      ctx.fillStyle = '#3f454c';
      ctx.fillRect(-14, -13, 28, 26);
      ctx.fillStyle = '#4e565e';
      ctx.fillRect(-11, -10, 22, 20);
      ctx.strokeStyle = PALETTE.brass;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
      ctx.moveTo(0, -6); ctx.lineTo(0, 6);
      ctx.stroke();
      break;
    }
    case 'plant': {
      ctx.fillStyle = '#8a3d22';
      ctx.fillRect(-9, 2, 18, 12);
      ctx.fillStyle = '#a85030';
      ctx.fillRect(-9, 2, 18, 4);
      ctx.fillStyle = '#4a6b34';
      ctx.beginPath();
      ctx.arc(0, -6, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5f8440';
      ctx.beginPath();
      ctx.arc(-6, -14, 8, 0, Math.PI * 2);
      ctx.arc(7, -11, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'poster': {
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(-14, -16, 28, 32);
      ctx.fillStyle = '#1c1410';
      ctx.fillRect(-12, -14, 24, 28);
      ctx.fillStyle = '#8b2f24';
      ctx.fillRect(-10, -12, 20, 9);
      ctx.fillStyle = '#e8d5ae';
      ctx.fillRect(-10, 0, 20, 2);
      ctx.fillRect(-10, 4, 16, 2);
      ctx.fillRect(-10, 8, 18, 2);
      break;
    }
    case 'menu': {
      ctx.fillStyle = PALETTE.parchment;
      ctx.fillRect(-12, -14, 24, 28);
      ctx.strokeStyle = PALETTE.brass;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-12, -14, 24, 28);
      ctx.fillStyle = '#7a3a2a';
      ctx.fillRect(-8, -10, 16, 3);
      ctx.fillStyle = '#9a8468';
      for (let i = 0; i < 4; i++) ctx.fillRect(-8, -4 + i * 5, 14 - i * 2, 2);
      break;
    }
    case 'screen': {
      ctx.fillStyle = '#1c1410';
      ctx.fillRect(-15, -12, 30, 20);
      ctx.fillStyle = '#7fc4e8';
      ctx.fillRect(-12, -9, 24, 14);
      ctx.fillStyle = '#3b2018';
      ctx.fillRect(-4, 8, 8, 4);
      ctx.fillRect(-9, 12, 18, 3);
      ctx.fillStyle = '#1c1410';
      ctx.fillRect(-9, -7, 12, 2);
      ctx.fillRect(-9, -3, 17, 2);
      ctx.fillRect(-9, 1, 9, 2);
      break;
    }
    case 'gauge': {
      ctx.fillStyle = '#4a5560';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8d5ae';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8b2f24';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(5, -7);
      ctx.stroke();
      ctx.fillStyle = '#3b2018';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();

  if (hot) {
    ctx.font = '13px ' + SERIF;
    const tw = ctx.measureText(it.title).width / 2 + 10;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    roundRect(x - tw + 2, y - 41, tw * 2, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#f2dfb0';
    roundRect(x - tw, y - 44, tw * 2, 22, 4);
    ctx.fill();
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = PALETTE.parchmentDark;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.title, x, y - 32);
  }
}

let grainPattern = null;

const dust = Array.from({ length: 40 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: 0.6 + Math.random() * 1.6,
  s: 0.15 + Math.random() * 0.4,
  ph: Math.random() * Math.PI * 2
}));

const ROOM_LIGHT = {
  hall: 'rgba(255,176,96,.055)',
  vestibule: 'rgba(255,186,110,.06)',
  zone_reading: 'rgba(255,200,130,.045)',
  zone_storage: 'rgba(150,180,220,.06)',
  zone_staff: 'rgba(255,180,110,.05)',
  security: 'rgba(120,170,220,.085)',
  abonement: 'rgba(255,190,120,.05)',
  hall_universal: 'rgba(255,200,140,.05)',
  hall_periodics: 'rgba(255,196,130,.05)',
  multifunc: 'rgba(150,190,230,.065)',
  computer_class: 'rgba(120,180,220,.08)',
  fund_main: 'rgba(214,194,152,.045)',
  archive: 'rgba(196,156,104,.07)',
  admin: 'rgba(255,190,120,.05)',
  departments: 'rgba(220,200,170,.04)',
  workshops: 'rgba(204,174,132,.055)',
  toilets: 'rgba(140,190,210,.08)',
  buffet: 'rgba(255,170,90,.075)',
  climate: 'rgba(120,180,200,.08)'
};

const ROOM_VIGNETTE = {
  archive: 0.5, climate: 0.48, security: 0.48, toilets: 0.44,
  fund_main: 0.46, zone_storage: 0.44, workshops: 0.44, computer_class: 0.42,
  hall: 0.34
};

const ROOM_TINT = {
  hall: { c: '#ffb45c', a: 0.42 },
  vestibule: { c: '#ffc07a', a: 0.36 },
  zone_reading: { c: '#ffc87e', a: 0.44 },
  abonement: { c: '#ffbb6e', a: 0.40 },
  hall_universal: { c: '#ffcf8a', a: 0.40 },
  hall_periodics: { c: '#ffc67e', a: 0.38 },
  multifunc: { c: '#68b59a', a: 0.44 },
  computer_class: { c: '#6f9fd4', a: 0.52 },
  zone_storage: { c: '#7f9bbd', a: 0.44 },
  fund_main: { c: '#87a2c2', a: 0.40 },
  archive: { c: '#d9a45c', a: 0.46 },
  workshops: { c: '#c99a6a', a: 0.40 },
  climate: { c: '#6fadc0', a: 0.50 },
  zone_staff: { c: '#dd9c66', a: 0.36 },
  admin: { c: '#e8a878', a: 0.36 },
  departments: { c: '#b4c0cc', a: 0.34 },
  security: { c: '#6d90b4', a: 0.50 },
  toilets: { c: '#7cb8c8', a: 0.48 },
  buffet: { c: '#ffa85a', a: 0.50 }
};

function drawAtmosphere() {
  const rx = MARGIN, ry = MARGIN, rw = W - MARGIN * 2, rh = H - MARGIN * 2;
  const t = performance.now() / 1000;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();

  const tint = ROOM_TINT[currentRoom];
  if (tint) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = tint.a;
    ctx.fillStyle = tint.c;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();
  }


  for (const p of dust) {
    const dx = p.x + Math.sin(t * p.s + p.ph) * 26;
    const dy = p.y + Math.cos(t * p.s * 0.8 + p.ph) * 18;
    const a = 0.18 + Math.sin(t * 1.4 + p.ph) * 0.12;
    ctx.fillStyle = `rgba(255,236,190,${Math.max(0.03, a)})`;
    ctx.beginPath();
    ctx.arc(dx, dy, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = ROOM_LIGHT[currentRoom] || 'rgba(255,190,120,.05)';
  ctx.fillRect(rx, ry, rw, rh);

  if (!grainPattern) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 96;
    const tg2 = tile.getContext('2d');
    const imgData = tg2.createImageData(96, 96);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = 110 + Math.random() * 145;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 16;
    }
    tg2.putImageData(imgData, 0, 0);
    grainPattern = ctx.createPattern(tile, 'repeat');
  }
  if (grainPattern) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = grainPattern;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();
  }


  const tg = ctx.createLinearGradient(0, ry, 0, ry + rh);
  tg.addColorStop(0, 'rgba(255,214,150,.05)');
  tg.addColorStop(0.45, 'rgba(255,200,130,0)');
  tg.addColorStop(1, 'rgba(10,6,4,.12)');
  ctx.fillStyle = tg;
  ctx.fillRect(rx, ry, rw, rh);

  const vig = ROOM_VIGNETTE[currentRoom] || 0.30;
  const vg = ctx.createRadialGradient(W / 2, H / 2 - 24, 110, W / 2, H / 2, 560);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.58, 'rgba(10,6,4,.05)');
  vg.addColorStop(1, `rgba(10,6,4,${vig})`);
  ctx.fillStyle = vg;
  ctx.fillRect(rx, ry, rw, rh);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pg = ctx.createRadialGradient(player.x, player.y - 4, 6, player.x, player.y - 4, 96);
  pg.addColorStop(0, 'rgba(255,222,168,.05)');
  pg.addColorStop(1, 'rgba(255,222,168,0)');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(player.x, player.y - 4, 96, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

const lamps = [
  { x: 240, y: 150 }, { x: 720, y: 150 },
  { x: 240, y: 390 }, { x: 720, y: 390 }
];

function drawLamps() {
  const t = performance.now() / 1000;
  for (let i = 0; i < lamps.length; i++) {
    const l = lamps[i];
    const flick = 0.9 + Math.sin(t * 2 + i * 1.7) * 0.06 + Math.sin(t * 7.3 + i) * 0.02;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow('bloom', 112, [
      [0, 'rgba(255,206,136,.09)'],
      [0.55, 'rgba(255,190,110,.035)'],
      [1, 'rgba(255,190,110,0)']
    ], l.x, l.y, 112, 112, flick);
    ctx.restore();

    drawGlow('halo', 145, [
      [0, 'rgba(255,214,150,.16)'],
      [0.45, 'rgba(255,200,130,.07)'],
      [1, 'rgba(255,200,130,0)']
    ], l.x, l.y, 145, 145, flick);

    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(l.x + 2, l.y + 7, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2a170f';
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, 13, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    const gl = ctx.createRadialGradient(l.x - 2, l.y - 2, 0, l.x, l.y, 11);
    gl.addColorStop(0, `rgba(255,248,220,${0.95 * flick})`);
    gl.addColorStop(0.55, `rgba(255,220,160,${0.85 * flick})`);
    gl.addColorStop(1, 'rgba(230,170,90,.25)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, 9.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(l.x - 3.5, l.y - 2.5, 2.6, 1.6, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function seeded(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const BOOK_COLORS = ['#b5493a', '#2f5f9e', '#3f6b3a', '#c98a3a', '#6a2f52', '#a85030', '#2f7f7f', '#8a4a2a', '#7e2233', '#1f4a3a'];

function drawShelf(x, y, w, h) {
  contactShadow(x, y, w, h, 0.85);
  ctx.fillStyle = '#43200f';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5a2a15';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#2c120a';
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  const rows = Math.max(1, Math.floor((h - 8) / 20));
  const rowH = (h - 8) / rows;
  for (let r = 0; r < rows; r++) {
    const ry = y + 4 + r * rowH;
    let bx = x + 6;
    let i = 0;
    while (bx < x + w - 9) {
      const bw = 4 + Math.floor(seeded(r * 71 + i * 13 + x) * 4);
      if (bx + bw > x + w - 6) break;
      const bh = Math.max(5, rowH - 7 - seeded(r * 37 + i * 7 + y) * 3);
      ctx.fillStyle = BOOK_COLORS[Math.floor(seeded(r * 17 + i * 29 + x + y) * BOOK_COLORS.length)];
      ctx.fillRect(bx, ry + 2, bw, bh);
      ctx.fillStyle = 'rgba(255,214,140,.55)';
      ctx.fillRect(bx + 0.5, ry + 3.5, bw - 1, 0.8);
      ctx.fillRect(bx + 0.5, ry + bh, bw - 1, 0.8);
      bx += bw + 1;
      i++;
    }
    ctx.fillStyle = '#7a4526';
    ctx.fillRect(x + 4, ry + rowH - 4, w - 8, 4);
    ctx.fillStyle = 'rgba(255,214,140,.22)';
    ctx.fillRect(x + 4, ry + rowH - 4, w - 8, 1);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  addObs(x, y, w, h);
}

function drawTable(x, y, w, h) {
  contactShadow(x, y, w, h, 1);
  ctx.fillStyle = '#5a2f1e';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#7a4228';
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = '#8f5030';
  ctx.fillRect(x, y, w, 3);
  addObs(x, y, w, h);
}

function drawChair(x, y) {
  softShadow(x, y + 8, 11, 4.5, 0.30);
  ctx.fillStyle = '#4e1f1a';
  ctx.fillRect(x - 7, y - 7, 14, 14);
  ctx.fillStyle = '#6e2b22';
  ctx.fillRect(x - 7, y - 7, 14, 5);
}

function drawPlant(x, y) {
  const sway = Math.sin(performance.now() / 1200 + x * 0.04) * 0.7;
  softShadow(x, y + 16, 15, 5.5, 0.32);
  ctx.fillStyle = '#8a3d22';
  ctx.fillRect(x - 8, y, 16, 15);
  ctx.fillStyle = '#a85030';
  ctx.fillRect(x - 8, y, 16, 4);
  ctx.fillStyle = '#4a6b34';
  ctx.beginPath();
  ctx.arc(x + sway, y - 6, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5f8440';
  ctx.beginPath();
  ctx.arc(x - 6 + sway, y - 13, 8, 0, Math.PI * 2);
  ctx.arc(x + 6 + sway, y - 11, 8, 0, Math.PI * 2);
  ctx.fill();
  addObs(x - 9, y - 2, 18, 18);
}

function drawFloorLamp(x, y) {
  const t = performance.now() / 1000;
  const pulse = 0.5 + Math.sin(t * 1.7 + x * 0.05) * 0.5;
  ctx.fillStyle = `rgba(255,205,130,${(0.05 + pulse * 0.045).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x, y - 58, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 7, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a1c12';
  ctx.fillRect(x - 9, y + 2, 18, 6);
  ctx.fillStyle = '#6b3a22';
  ctx.fillRect(x - 2, y - 58, 4, 62);
  ctx.fillStyle = '#8a4c2c';
  ctx.beginPath();
  ctx.moveTo(x - 17, y - 54);
  ctx.lineTo(x + 17, y - 54);
  ctx.lineTo(x + 10, y - 76);
  ctx.lineTo(x - 10, y - 76);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f0d79a';
  ctx.beginPath();
  ctx.moveTo(x - 13, y - 55);
  ctx.lineTo(x + 13, y - 55);
  ctx.lineTo(x + 8, y - 64);
  ctx.lineTo(x - 8, y - 64);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(255,238,190,${(0.55 + pulse * 0.35).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x, y - 52, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawWallClock(x, y) {
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.arc(x + 2, y + 3, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.brass;
  ctx.beginPath();
  ctx.arc(x, y, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0e2c8';
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a4028';
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    const s = i % 3 ? 1.4 : 2.2;
    ctx.fillRect(x + Math.cos(a) * 11.5 - s / 2, y + Math.sin(a) * 11.5 - s / 2, s, s);
  }
  const second = (t * 0.9 % 60) / 60 * Math.PI * 2 - Math.PI / 2;
  const minute = (t / 45 % 60) / 60 * Math.PI * 2 - Math.PI / 2;
  const hour = (t / 540 % 12) / 12 * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = '#3b2018';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(hour) * 7, y + Math.sin(hour) * 7);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(minute) * 10, y + Math.sin(minute) * 10);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.wine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(second) * 11, y + Math.sin(second) * 11);
  ctx.stroke();
  ctx.fillStyle = PALETTE.brass;
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoatRack(x, y) {
  const t = performance.now() / 1000;
  const sway = Math.sin(t * 0.85) * 0.035;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x - 3, y - 78, 6, 82);
  ctx.fillStyle = '#6b3a22';
  ctx.fillRect(x - 1, y - 78, 2, 82);
  ctx.fillStyle = '#3a1c12';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a4c2c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 66);
  ctx.lineTo(x - 16, y - 75);
  ctx.moveTo(x, y - 66);
  ctx.lineTo(x + 16, y - 74);
  ctx.moveTo(x, y - 54);
  ctx.lineTo(x - 11, y - 62);
  ctx.stroke();
  ctx.save();
  ctx.translate(x - 12, y - 73);
  ctx.rotate(sway);
  ctx.fillStyle = '#5e2a1d';
  roundRect(-10, 0, 19, 44, 5);
  ctx.fill();
  ctx.fillStyle = '#713522';
  roundRect(-7, 3, 13, 34, 4);
  ctx.fill();
  ctx.fillStyle = '#3c180f';
  ctx.fillRect(-8, 39, 4, 7);
  ctx.fillRect(2, 39, 4, 7);
  ctx.restore();
  ctx.save();
  ctx.translate(x + 12, y - 71);
  ctx.rotate(-sway * 0.8);
  ctx.fillStyle = '#3f4a5a';
  roundRect(-8, 0, 17, 38, 5);
  ctx.fill();
  ctx.fillStyle = '#516078';
  roundRect(-5, 3, 11, 28, 4);
  ctx.fill();
  ctx.fillStyle = '#2a3040';
  ctx.fillRect(-6, 33, 4, 7);
  ctx.fillRect(2, 33, 4, 7);
  ctx.restore();
  ctx.strokeStyle = '#a85030';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 15, y - 64);
  ctx.quadraticCurveTo(x - 20, y - 46, x - 13, y - 39);
  ctx.stroke();
}

function drawSideTable(x, y) {
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 15, 24, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a1c12';
  ctx.fillRect(x - 16, y - 2, 4, 17);
  ctx.fillRect(x + 12, y - 2, 4, 17);
  ctx.fillStyle = '#4a2618';
  roundRect(x - 21, y - 6, 42, 9, 3);
  ctx.fill();
  ctx.fillStyle = '#6b3a22';
  roundRect(x - 21, y - 6, 42, 4, 2);
  ctx.fill();
  ctx.fillStyle = '#9a6a3a';
  ctx.fillRect(x - 13, y - 15, 15, 9);
  ctx.fillStyle = '#c98a3a';
  ctx.fillRect(x - 13, y - 15, 15, 2);
  ctx.fillStyle = '#e8d5ae';
  ctx.fillRect(x + 5, y - 13, 10, 7);
  ctx.fillStyle = '#6b3a22';
  ctx.fillRect(x + 8, y - 10, 4, 4);
  for (let i = 0; i < 2; i++) {
    const p = (t * 0.22 + i * 0.5) % 1;
    ctx.fillStyle = `rgba(240,226,200,${((1 - p) * 0.22).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x + 11 + Math.sin(t * 2 + i) * 2, y - 18 - p * 13, 1.6 + p * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBookStack(x, y) {
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const cols = ['#8b2f24', '#3f6fb5', '#5a7a3a', '#c98a3a'];
  let by = y;
  for (let i = 0; i < 4; i++) {
    const w = 34 - i * 3;
    const h = 6 - (i % 2);
    by -= h;
    ctx.fillStyle = cols[i];
    ctx.fillRect(x - w / 2, by, w, h);
    ctx.fillStyle = 'rgba(240,226,200,.55)';
    ctx.fillRect(x - w / 2 + 3, by + 2, w - 8, 1);
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(x - w / 2, by + h - 1, w, 1);
  }
  const a = 0.18 + 0.12 * Math.sin(t * 2 + x);
  ctx.fillStyle = `rgba(240,226,200,${a.toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(x + 13 + Math.sin(t * 0.7) * 3, y - 34 - Math.cos(t * 1.1) * 3, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawUmbrellaStand(x, y) {
  const t = performance.now() / 1000;
  const ripple = (t * 0.7) % 1;
  ctx.fillStyle = `rgba(180,210,225,${(0.16 * (1 - ripple)).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 11 + ripple * 9, 3 + ripple * 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8b2f24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 2);
  ctx.lineTo(x - 8, y - 45);
  ctx.stroke();
  ctx.strokeStyle = '#3f4a5a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 1, y - 2);
  ctx.lineTo(x + 2, y - 51);
  ctx.stroke();
  ctx.strokeStyle = '#5a7a3a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x + 6, y - 2);
  ctx.lineTo(x + 10, y - 42);
  ctx.stroke();
  ctx.strokeStyle = '#4a2618';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x - 9, y - 47, 3, Math.PI, Math.PI * 2);
  ctx.moveTo(x + 3, y - 53);
  ctx.arc(x + 4, y - 53, 3, Math.PI, Math.PI * 2);
  ctx.arc(x + 11, y - 44, 3, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#3a3f46';
  roundRect(x - 11, y - 34, 22, 34, 3);
  ctx.fill();
  ctx.fillStyle = '#4b515a';
  roundRect(x - 9, y - 32, 18, 6, 2);
  ctx.fill();
  ctx.fillStyle = '#2f3841';
  ctx.fillRect(x - 9, y - 4, 18, 4);
}

function drawNoticeBoard(x, y, w, h) {
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 4, y + 8 + i * (h - 12) / 5, w - 8, 1);
  const notes = [
    { nx: x + 7, ny: y + 7, nw: w * 0.42, nh: h * 0.38, c: '#e8d5ae' },
    { nx: x + w * 0.56, ny: y + h * 0.12, nw: w * 0.34, nh: h * 0.34, c: '#d9e2d2' },
    { nx: x + w * 0.16, ny: y + h * 0.58, nw: w * 0.37, nh: h * 0.3, c: '#f0dfb8' }
  ];
  for (const n of notes) {
    ctx.fillStyle = n.c;
    ctx.fillRect(n.nx, n.ny, n.nw, n.nh);
    ctx.fillStyle = 'rgba(80,55,40,.45)';
    for (let i = 0; i < 3; i++) ctx.fillRect(n.nx + 3, n.ny + 5 + i * 5, n.nw - 6 - i * 3, 1);
  }
  const sway = Math.sin(t * 1.6 + x) * 0.045;
  ctx.save();
  ctx.translate(x + w * 0.72, y + h * 0.56);
  ctx.rotate(sway);
  ctx.fillStyle = '#e8d5ae';
  ctx.fillRect(-w * 0.18, 0, w * 0.36, h * 0.33);
  ctx.fillStyle = 'rgba(80,55,40,.45)';
  for (let i = 0; i < 3; i++) ctx.fillRect(-w * 0.15, 5 + i * 5, w * 0.28 - i * 4, 1);
  ctx.fillStyle = PALETTE.wine;
  ctx.beginPath();
  ctx.arc(0, 3, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = PALETTE.brass;
  for (const n of notes) {
    ctx.beginPath();
    ctx.arc(n.nx + n.nw - 4, n.ny + 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWindow(x, y, w, h) {
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = '#6b3a22';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#1e2f3e';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#2b4356';
  ctx.fillRect(x + 3, y + 3, w - 6, h * 0.62);
  ctx.fillStyle = 'rgba(150,190,210,.12)';
  ctx.fillRect(x + 3, y + h * 0.62, w - 6, 2);
  for (let i = 0; i < 5; i++) {
    const sx = x + 8 + seeded(i * 11 + x) * (w - 16);
    const sy = y + 8 + seeded(i * 17 + y) * (h * 0.45);
    const tw = 0.35 + 0.3 * Math.sin(t * 2.2 + i * 1.7);
    ctx.fillStyle = `rgba(240,236,210,${tw.toFixed(3)})`;
    ctx.fillRect(sx, sy, 1.4, 1.4);
  }
  ctx.fillStyle = 'rgba(240,226,180,.8)';
  ctx.beginPath();
  ctx.arc(x + w * 0.73, y + h * 0.25, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a2834';
  ctx.beginPath();
  ctx.moveTo(x + 3, y + h * 0.7);
  for (let i = 0; i < 5; i++) {
    const bx = x + 3 + i * (w - 6) / 4;
    ctx.lineTo(bx, y + h * 0.7 - (i % 2 ? 12 : 20));
    ctx.lineTo(bx + (w - 6) / 4, y + h * 0.7 - (i % 2 ? 8 : 14));
  }
  ctx.lineTo(x + w - 3, y + h - 3);
  ctx.lineTo(x + 3, y + h - 3);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const px = x + 6 + seeded(i * 23 + x) * (w - 14);
    const py = y + 5 + (t * 26 + i * 17) % (h - 12);
    ctx.strokeStyle = `rgba(180,215,230,${(0.14 + seeded(i + y) * 0.12).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 1.5, py + 4);
    ctx.stroke();
  }
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
  ctx.fillRect(x, y + h * 0.52 - 2, w, 4);
  ctx.fillStyle = '#8a4c2c';
  ctx.fillRect(x - 6, y + h + 2, w + 12, 5);
}

function drawMirror(x, y, w, h) {
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = PALETTE.gold;
  roundRect(x - 3, y - 3, w + 6, h + 6, 9);
  ctx.fill();
  ctx.fillStyle = '#3a3f46';
  roundRect(x, y, w, h, 7);
  ctx.fill();
  ctx.fillStyle = '#58707a';
  roundRect(x + 3, y + 3, w - 6, h - 6, 5);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 3, y + 3, w - 6, h - 6);
  ctx.clip();
  const shine = x + ((t * 24 + x) % (w + 46)) - 23;
  ctx.fillStyle = 'rgba(235,248,248,.13)';
  ctx.beginPath();
  ctx.moveTo(shine, y);
  ctx.lineTo(shine + 11, y);
  ctx.lineTo(shine - 9, y + h);
  ctx.lineTo(shine - 21, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(235,248,248,.07)';
  ctx.beginPath();
  ctx.moveTo(shine - 17, y);
  ctx.lineTo(shine - 11, y);
  ctx.lineTo(shine - 29, y + h);
  ctx.lineTo(shine - 35, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(224,178,92,.5)';
  ctx.lineWidth = 2;
  roundRect(x + 3, y + 3, w - 6, h - 6, 5);
  ctx.stroke();
}

function drawServerRack(x, y) {
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 3, y + 4, 44, 96);
  ctx.fillStyle = '#2f3841';
  ctx.fillRect(x - 2, y - 2, 48, 100);
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(x, y, 44, 96);
  ctx.fillStyle = '#252c33';
  ctx.fillRect(x + 3, y + 4, 38, 88);
  for (let r = 0; r < 6; r++) {
    const ry = y + 8 + r * 13;
    ctx.fillStyle = '#4b515a';
    ctx.fillRect(x + 5, ry, 34, 9);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 7, ry + 3, 4, 1);
    for (let c = 0; c < 2; c++) {
      const on = Math.sin(t * 3.2 + r * 1.7 + c * 0.9) > -0.15;
      ctx.fillStyle = on ? (c ? '#8fd18f' : '#d4a94e') : '#334238';
      ctx.beginPath();
      ctx.arc(x + 32 + c * 6, ry + 4.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#1c2228';
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 6, y + 86, 30 - i * 3, 1);
  ctx.fillStyle = 'rgba(160,205,225,.12)';
  ctx.fillRect(x + 4, y + 4, 3, 86);
}

function drawBin(x, y) {
  const t = performance.now() / 1000;
  const wobble = Math.sin(t * 1.8 + x) * 0.025;
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a3f46';
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 2);
  ctx.lineTo(x + 10, y - 2);
  ctx.lineTo(x + 8, y - 28);
  ctx.lineTo(x - 8, y - 28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4b515a';
  ctx.fillRect(x - 8, y - 28, 16, 4);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  for (let i = 0; i < 5; i++) ctx.fillRect(x - 7 + i * 3, y - 23, 1, 17);
  ctx.save();
  ctx.translate(x, y - 29);
  ctx.rotate(wobble);
  ctx.fillStyle = '#5a6673';
  roundRect(-11, -4, 22, 5, 2);
  ctx.fill();
  ctx.fillStyle = '#7d8a92';
  ctx.fillRect(-4, -6, 8, 3);
  ctx.restore();
}

function drawDryingRack(x, y) {
  const t = performance.now() / 1000;
  ctx.fillStyle = 'rgba(0,0,0,.26)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 34, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6b3a22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 30, y);
  ctx.lineTo(x - 19, y - 56);
  ctx.moveTo(x + 30, y);
  ctx.lineTo(x + 19, y - 56);
  ctx.moveTo(x - 19, y - 56);
  ctx.lineTo(x + 19, y - 56);
  ctx.stroke();
  ctx.strokeStyle = '#8a4c2c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 30);
  ctx.lineTo(x + 16, y - 30);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const sway = Math.sin(t * 1.2 + i * 1.9) * 0.06;
    ctx.save();
    ctx.translate(x - 20 + i * 20, y - 55);
    ctx.rotate(sway);
    ctx.fillStyle = i === 1 ? '#d9e2d2' : '#e8d5ae';
    roundRect(-7, 0, 14, 27, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(80,55,40,.35)';
    for (let l = 0; l < 3; l++) ctx.fillRect(-4, 6 + l * 6, 8 - l * 2, 1);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(-2, -1, 4, 2);
    ctx.restore();
  }
}

function drawPipes(x, y, h) {
  const t = performance.now() / 1000;
  const px = x + 7;
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(px - 5, y, 10, h);
  ctx.fillStyle = '#5a6673';
  ctx.fillRect(px - 3, y, 4, h);
  ctx.fillStyle = 'rgba(255,255,255,.1)';
  ctx.fillRect(px + 2, y, 2, h);
  for (let i = 0; i <= 3; i++) {
    const cy = y + i * h / 3;
    ctx.fillStyle = '#2f3841';
    ctx.fillRect(px - 7, cy - 4, 14, 8);
    ctx.fillStyle = '#6e7d8a';
    ctx.fillRect(px - 6, cy - 3, 12, 3);
  }
  const vy = y + h * 0.58;
  ctx.fillStyle = '#8b2f24';
  ctx.fillRect(px - 8, vy - 2, 16, 4);
  ctx.strokeStyle = '#b03028';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px + 13, vy, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px + 13, vy - 8);
  ctx.lineTo(px + 13, vy + 8);
  ctx.moveTo(px + 5, vy);
  ctx.lineTo(px + 21, vy);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.35 + i / 3) % 1;
    const sx = px + 13 + p * 17 + Math.sin(t * 2 + i) * 2;
    const sy = vy - 8 - p * 27;
    ctx.fillStyle = `rgba(220,228,228,${((1 - p) * 0.18).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2 + p * 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRug(x, y, w, h, c) {
  ctx.fillStyle = 'rgba(0,0,0,.34)';
  ctx.fillRect(x + 5, y + 6, w, h);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, c);
  g.addColorStop(0.55, c);
  g.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.strokeStyle = PALETTE.gold;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 9, y + 9, w - 18, h - 18);
  ctx.globalAlpha = 0.28;
  ctx.strokeRect(x + 15, y + 15, w - 30, h - 30);
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = PALETTE.parchment;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.28, y + h * 0.5);
  ctx.lineTo(x + w * 0.5, y + h * 0.22);
  ctx.lineTo(x + w * 0.72, y + h * 0.5);
  ctx.lineTo(x + w * 0.5, y + h * 0.78);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(240,226,200,.35)';
  for (let i = 0; i < Math.floor(w / 14); i++) {
    ctx.fillRect(x + 8 + i * 14, y - 2, 6, 2);
    ctx.fillRect(x + 8 + i * 14, y + h, 6, 2);
  }
}

function drawPC(x, y) {
  ctx.fillStyle = '#1c1410';
  ctx.fillRect(x - 10, y - 14, 20, 13);
  ctx.fillStyle = '#7fc4e8';
  ctx.fillRect(x - 8, y - 12, 16, 9);
  ctx.fillStyle = '#33231a';
  ctx.fillRect(x - 4, y - 1, 8, 3);
  ctx.fillRect(x - 7, y + 2, 14, 2);
}

function drawCounter(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 4, y + 5, w, h);
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#6e3a22';
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = '#8a4c2c';
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  for (let i = 1; i < 4; i++) ctx.fillRect(x + (w / 4) * i - 1, y + 10, 2, h - 10);
  addObs(x, y, w, h);
}

function drawLockers(x, y, n) {
  const w = 30, h = 54;
  for (let i = 0; i < n; i++) {
    const lx = x + i * (w + 4);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(lx + 2, y + 3, w, h);
    ctx.fillStyle = '#4a2618';
    ctx.fillRect(lx, y, w, h);
    ctx.fillStyle = '#5e3020';
    ctx.fillRect(lx + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(lx + w / 2 - 6, y + 8, 12, 2);
    ctx.fillRect(lx + w / 2 - 4, y + 24, 8, 3);
  }
  addObs(x, y, n * (w + 4) - 4, h);
}

function drawBox(x, y, w, h) {
  contactShadow(x, y, w, h, 0.8);
  ctx.fillStyle = '#7a5530';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#8f6638';
  ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = '#5e4020';
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
  addObs(x, y, w, h);
}

function drawPoster(x, y, w, h, c) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 3, y + 4, w + 4, h + 4);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = '#1c1410';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(x, y, w, h * 0.26);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(x + 5, y + 5, w - 10, 1.5);

  ctx.fillStyle = 'rgba(240,226,200,.85)';
  ctx.fillRect(x + 7, y + h * 0.34, w * 0.55, 3);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = `rgba(240,226,200,${0.62 - i * 0.12})`;
    ctx.fillRect(x + 7, y + h * 0.48 + i * 8, w - 14 - i * 10, 2.5);
  }

  ctx.fillStyle = 'rgba(224,178,92,.75)';
  ctx.beginPath();
  ctx.arc(x + w - 13, y + 13, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(28,20,16,.5)';
  ctx.beginPath();
  ctx.arc(x + w - 13, y + 13, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawTiles(x, y, w, h, step) {
  ctx.strokeStyle = 'rgba(255,235,210,.06)';
  ctx.lineWidth = 1;
  for (let tx = x; tx <= x + w; tx += step) {
    ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + h); ctx.stroke();
  }
  for (let ty = y; ty <= y + h; ty += step) {
    ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke();
  }
}

function drawSofa(x, y, w, h) {
  softShadow(x + w / 2 + 3, y + h * 0.9, w * 0.56, h * 0.46, 0.34);
  ctx.fillStyle = '#3c180f';
  roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.fillStyle = '#5e2a1d';
  roundRect(x + 2, y + 2, w - 4, h - 4, 5);
  ctx.fill();

  ctx.fillStyle = '#713522';
  roundRect(x + 4, y + 3, w - 8, h * 0.36, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(224,178,92,.28)';
  for (let bx = x + 20; bx < x + w - 14; bx += 26) {
    ctx.beginPath();
    ctx.arc(bx, y + 6 + h * 0.14, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const n = Math.max(2, Math.round((w - 16) / 48));
  const cw = (w - 16) / n;
  for (let i = 0; i < n; i++) {
    const cx0 = x + 8 + i * cw;
    ctx.fillStyle = i % 2 ? '#8d4a30' : '#95503a';
    roundRect(cx0, y + h * 0.42, cw - 4, h * 0.46, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.fillStyle = '#4a1f16';
  roundRect(x + 1, y + 5, 9, h - 10, 4);
  ctx.fill();
  roundRect(x + w - 10, y + 5, 9, h - 10, 4);
  ctx.fill();

  ctx.fillStyle = '#2a1610';
  ctx.fillRect(x + 6, y + h - 3, 5, 5);
  ctx.fillRect(x + w - 11, y + h - 3, 5, 5);
  addObs(x, y, w, h);
}

function drawArmchair(x, y) {
  softShadow(x + 2, y + 12, 24, 12, 0.34);
  ctx.fillStyle = '#3c180f';
  roundRect(x - 16, y - 15, 32, 32, 7);
  ctx.fill();
  ctx.fillStyle = '#5e2a1d';
  roundRect(x - 14, y - 13, 28, 28, 6);
  ctx.fill();

  ctx.fillStyle = '#713522';
  roundRect(x - 13, y - 12, 26, 10, 4);
  ctx.fill();
  ctx.fillStyle = '#95503a';
  roundRect(x - 10, y - 3, 20, 13, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(224,178,92,.3)';
  ctx.beginPath();
  ctx.arc(x, y - 7, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a1f16';
  roundRect(x - 15, y - 10, 6, 21, 3);
  ctx.fill();
  roundRect(x + 9, y - 10, 6, 21, 3);
  ctx.fill();

  ctx.fillStyle = '#2a1610';
  ctx.fillRect(x - 12, y + 14, 4, 4);
  ctx.fillRect(x + 8, y + 14, 4, 4);
  addObs(x - 16, y - 15, 32, 32);
}

function drawCart(x, y) {
  contactShadow(x - 18, y - 12, 36, 24, 0.9);
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x - 18, y - 12, 36, 24);
  ctx.fillStyle = '#6b3a22';
  ctx.fillRect(x - 16, y - 10, 32, 20);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = BOOK_COLORS[i];
    ctx.fillRect(x - 14 + i * 8, y - 8, 6, 12);
  }
  ctx.fillStyle = '#2a1610';
  ctx.beginPath();
  ctx.arc(x - 12, y + 14, 3, 0, Math.PI * 2);
  ctx.arc(x + 12, y + 14, 3, 0, Math.PI * 2);
  ctx.fill();
  addObs(x - 18, y - 12, 36, 26);
}

function drawLadder(x, y) {
  ctx.strokeStyle = '#6b3a22';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 16); ctx.lineTo(x - 3, y - 18);
  ctx.moveTo(x + 12, y + 16); ctx.lineTo(x + 3, y - 18);
  ctx.stroke();
  ctx.strokeStyle = '#8a4c2c';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const yy = y + 10 - i * 8;
    ctx.beginPath();
    ctx.moveTo(x - 10 + i * 1.7, yy);
    ctx.lineTo(x + 10 - i * 1.7, yy);
    ctx.stroke();
  }
  addObs(x - 12, y - 6, 24, 22);
}

function drawSafe(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x - 20, y - 18, 44, 44);
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(x - 22, y - 22, 44, 44);
  ctx.fillStyle = '#4b515a';
  ctx.fillRect(x - 18, y - 18, 36, 36);
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + 6, y - 6);
  ctx.stroke();
  addObs(x - 22, y - 22, 44, 44);
}

function drawCooler(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x - 10, y - 20, 22, 46);
  ctx.fillStyle = '#dfe8ee';
  ctx.fillRect(x - 12, y - 24, 24, 26);
  ctx.fillStyle = '#b8d8e0';
  ctx.fillRect(x - 12, y - 24, 24, 10);
  ctx.fillStyle = '#4a5560';
  ctx.fillRect(x - 14, y + 2, 28, 22);
  ctx.fillStyle = '#5a6673';
  ctx.fillRect(x - 10, y + 6, 20, 6);
  addObs(x - 14, y - 24, 28, 48);
}

function drawSignpost(x, y) {
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x - 2, y - 6, 4, 34);
  ctx.fillStyle = '#3a1c12';
  roundRect(x - 34, y - 24, 60, 12, 3); ctx.fill();
  roundRect(x + 6, y - 8, 44, 12, 3); ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '9px ' + SERIF;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Читальня', x - 31, y - 18);
  ctx.fillText('Склады', x + 12, y - 2);
  addObs(x - 6, y - 6, 12, 30);
}

function drawDisplay(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(160,205,225,.35)';
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = '#e8d5ae';
  ctx.fillRect(x + 8, y + h / 2 - 8, w - 16, 14);
  ctx.strokeStyle = '#8fb8cc';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
  addObs(x, y, w, h);
}

function drawFridge(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = '#c9d2d8';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#aab6bd';
  ctx.fillRect(x, y, w, 10);
  ctx.fillStyle = '#7d8a92';
  ctx.fillRect(x + w - 8, y + 14, 3, h * 0.3);
  addObs(x, y, w, h);
}

function drawSink(x, y) {
  ctx.fillStyle = '#dfe8ee';
  roundRect(x - 16, y - 10, 32, 20, 5); ctx.fill();
  ctx.fillStyle = '#b8d8e0';
  roundRect(x - 12, y - 6, 24, 12, 4); ctx.fill();
  ctx.fillStyle = '#9aa6ad';
  ctx.fillRect(x - 2, y - 14, 4, 6);
  addObs(x - 16, y - 12, 32, 24);
}

function drawCubicle(x, y, w, h) {
  ctx.fillStyle = '#5e3020';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#6e3a26';
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x + w * 0.6, y + 4, w * 0.4 - 4, h - 8);
  addObs(x, y, w, h);
}

function drawPress(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x - 22, y - 14, 48, 34);
  ctx.fillStyle = '#5a6673';
  ctx.fillRect(x - 24, y - 18, 48, 36);
  ctx.fillStyle = '#6e7d8a';
  ctx.fillRect(x - 20, y - 14, 40, 12);
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(x - 5, y - 8, 10, 10);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(x + 14, y - 6, 12, 4);
  ctx.fillRect(x + 20, y - 10, 4, 16);
  addObs(x - 24, y - 18, 48, 36);
}

function drawRolls(x, y) {
  const cols = ['#e8d5ae', '#c98a3a', '#a85030'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = cols[i];
    ctx.beginPath();
    ctx.arc(x, y + 8 - i * 14, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.arc(x, y + 8 - i * 14, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  addObs(x - 10, y - 20, 20, 34);
}

function drawLectern(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x - 16, y - 12, 34, 30);
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x - 18, y - 14, 36, 30);
  ctx.fillStyle = '#6b3a22';
  ctx.fillRect(x - 14, y - 22, 28, 12);
  ctx.fillStyle = '#e8d5ae';
  ctx.fillRect(x - 12, y - 20, 24, 8);
  addObs(x - 18, y - 14, 36, 30);
}

function drawScreen(x, y, w, h) {
  ctx.fillStyle = '#2a1610';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#e6eef2';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#9aa6ad';
  ctx.fillRect(x, y + h - 4, w, 4);
}

function drawWhiteboard(x, y, w, h) {
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#eef3f0';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#7d8a92';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 12); ctx.lineTo(x + w - 20, y + 12);
  ctx.moveTo(x + 8, y + 26); ctx.lineTo(x + w - 40, y + 26);
  ctx.stroke();
}

function drawNewspaperHolder(x, y) {
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x - 14, y - 2, 28, 4);
  ctx.fillStyle = '#6b3a22';
  ctx.fillRect(x - 12, y - 12, 24, 12);
  ctx.fillStyle = '#e8d5ae';
  ctx.fillRect(x - 8, y - 10, 16, 8);
  ctx.strokeStyle = '#3a1c12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 2); ctx.lineTo(x - 16, y + 14);
  ctx.moveTo(x + 12, y + 2); ctx.lineTo(x + 16, y + 14);
  ctx.stroke();
  addObs(x - 16, y - 12, 32, 26);
}

function drawCardCatalog(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5e3020';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  const cols = Math.max(2, Math.floor(w / 26));
  ctx.fillStyle = '#7a4526';
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillRect(x + 4 + c * (w - 8) / cols, y + 4 + r * (h - 8) / 3, (w - 10) / cols, (h - 12) / 3);
    }
  }
  ctx.fillStyle = PALETTE.brass;
  for (let c = 0; c < cols; c++) ctx.fillRect(x + 6 + c * (w - 8) / cols, y + 8, (w - 14) / cols, 2);
  addObs(x, y, w, h);
}

function drawKeyBoard(x, y) {
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x - 24, y - 18, 48, 34);
  ctx.fillStyle = '#5e3020';
  ctx.fillRect(x - 22, y - 16, 44, 30);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      ctx.fillStyle = '#c9c2b0';
      ctx.fillRect(x - 18 + c * 8, y - 13 + r * 9, 2, 6);
      ctx.fillStyle = PALETTE.brass;
      ctx.fillRect(x - 18 + c * 8, y - 7 + r * 9, 3, 3);
    }
  }
}

function drawExtinguisher(x, y) {
  ctx.fillStyle = '#b03028';
  ctx.fillRect(x - 5, y - 12, 10, 22);
  ctx.fillStyle = '#7d1f1a';
  ctx.fillRect(x - 5, y + 6, 10, 4);
  ctx.fillStyle = '#2a1610';
  ctx.fillRect(x - 3, y - 16, 6, 5);
  addObs(x - 6, y - 16, 12, 28);
}

function drawMeterPanel(x, y, w, h) {
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#4b515a';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2a1610';
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#7fc4e8';
    ctx.beginPath();
    ctx.arc(x + 14 + i * 18, y + 16, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 14 + i * 18, y + 16);
    ctx.lineTo(x + 17 + i * 18, y + 11);
    ctx.stroke();
  }
  ctx.fillStyle = '#c98a3a';
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 20, y + h - 14, 14, 6);
}

function drawCylinders(x, y) {
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#5a6673';
    ctx.fillRect(x - 16, y - 14 + i * 14, 12, 30);
    ctx.fillStyle = '#6e7d8a';
    ctx.fillRect(x - 16, y - 14 + i * 14, 12, 6);
  }
  ctx.fillStyle = '#8a3d22';
  ctx.fillRect(x - 16, y + 26, 12, 4);
  addObs(x - 16, y - 14, 12, 44);
}

function drawTurnstile(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 17, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8f9aa4';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 3);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
    ctx.lineTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  ctx.fillStyle = '#2f3841';
  roundRect(x - 8, y - 4, 16, 28, 4);
  ctx.fill();
  ctx.fillStyle = '#4b515a';
  roundRect(x - 6, y - 2, 12, 22, 3);
  ctx.fill();
  ctx.fillStyle = PALETTE.brass;
  ctx.beginPath();
  ctx.arc(x, y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f3841';
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5fbf6a';
  ctx.beginPath();
  ctx.arc(x, y + 17, 2.2, 0, Math.PI * 2);
  ctx.fill();
  addObs(x - 8, y - 4, 16, 28);
}

function drawBench(x, y, w, h) {
  contactShadow(x, y, w, h, 0.9);
  ctx.fillStyle = '#3c1b11';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#6b3a22';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#8a4c2c';
  const n = Math.max(2, Math.round(w / 34));
  for (let i = 0; i < n; i++) {
    ctx.fillRect(x + 3 + i * (w - 6) / n, y + 4, (w - 6) / n - 3, h - 8);
  }
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  for (let i = 1; i < n; i++) ctx.fillRect(x + i * (w - 6) / n, y + 3, 1.5, h - 6);
  ctx.fillStyle = '#2a1610';
  ctx.fillRect(x + 4, y + h - 2, 4, 4);
  ctx.fillRect(x + w - 8, y + h - 2, 4, 4);
  addObs(x, y, w, h);
}

function drawChandelier(cx, cy) {
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 92);
  g.addColorStop(0, 'rgba(255,220,150,.16)');
  g.addColorStop(1, 'rgba(255,220,150,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawIndexPlate(x, y, text) {
  ctx.fillStyle = '#2a1610';
  ctx.fillRect(x - 18, y - 8, 36, 16);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '9.5px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
}

function drawNpcProp(n, x, y) {
  const t = performance.now() / 1000;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.18);
  if (n.prop === 'notebook') {
    ctx.fillStyle = '#3f5f45';
    roundRect(-7, -5, 14, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#f0e6d2';
    ctx.fillRect(-5.8, -3.8, 11.6, 9.4);
    ctx.strokeStyle = 'rgba(90,60,40,.35)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -3.8); ctx.lineTo(0, 5.6);
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(-4.4, -1.3 + i * 2); ctx.lineTo(-1, -1.3 + i * 2);
      ctx.moveTo(1, -1.3 + i * 2); ctx.lineTo(4.4, -1.3 + i * 2);
    }
    ctx.stroke();
  } else if (n.prop === 'clipboard') {
    ctx.fillStyle = '#5e4028';
    roundRect(-5.5, -7, 11, 14, 1.5);
    ctx.fill();
    ctx.fillStyle = '#f0e2c8';
    ctx.fillRect(-4.2, -5, 8.4, 11);
    ctx.fillStyle = PALETTE.brass;
    roundRect(-2, -8, 4, 3, 1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,40,.4)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(-3.2, -3 + i * 2); ctx.lineTo(3.2, -3 + i * 2);
    }
    ctx.stroke();
  } else if (n.prop === 'tablet') {
    const glow = 0.4 + Math.sin(t * 2.5 + n.x) * 0.1;
    ctx.fillStyle = '#1c2228';
    roundRect(-5.5, -7, 11, 14, 2);
    ctx.fill();
    ctx.fillStyle = '#25424c';
    ctx.fillRect(-4.2, -5.4, 8.4, 10.4);
    ctx.fillStyle = `rgba(127,196,232,${glow.toFixed(3)})`;
    ctx.fillRect(-3, -4, 6, 1);
    ctx.fillRect(-3, -2, 4.5, 1);
    ctx.fillRect(-3, 0, 5.4, 1);
    ctx.fillStyle = 'rgba(180,220,235,.6)';
    ctx.beginPath(); ctx.arc(0, 6, 0.8, 0, Math.PI * 2); ctx.fill();
  } else if (n.prop === 'books') {
    ctx.fillStyle = '#8b2f24'; ctx.fillRect(-6, -2, 12, 3);
    ctx.fillStyle = '#3f6fb5'; ctx.fillRect(-5, -5.5, 10, 3);
    ctx.fillStyle = '#c98a3a'; ctx.fillRect(-4.5, -9, 9, 3);
    ctx.fillStyle = 'rgba(240,226,200,.7)';
    ctx.fillRect(-5.5, -1.5, 8, 0.7);
    ctx.fillRect(-4.5, -5, 6.5, 0.7);
  } else if (n.prop === 'folder') {
    ctx.fillStyle = '#b08a52';
    ctx.beginPath();
    ctx.moveTo(-6, -5); ctx.lineTo(-2, -5); ctx.lineTo(-0.5, -3.5);
    ctx.lineTo(6, -3.5); ctx.lineTo(6, 6); ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f0e2c8';
    ctx.fillRect(-5, -2, 9, 8);
    ctx.fillStyle = 'rgba(90,60,40,.35)';
    ctx.fillRect(-3.5, 0, 7, 1);
    ctx.fillRect(-3.5, 3, 5, 1);
  } else if (n.prop === 'tray') {
    ctx.fillStyle = '#8a4c2c';
    ctx.beginPath(); ctx.ellipse(0, 2, 7.5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b98556';
    ctx.beginPath(); ctx.ellipse(0, 1.5, 6.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0e6d2';
    ctx.beginPath(); ctx.ellipse(2, -2, 2.8, 1.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b3a22';
    ctx.fillRect(2, -4.2, 0.9, 2.2);
    for (let i = 0; i < 2; i++) {
      const p = (t * 0.35 + i * 0.5) % 1;
      ctx.fillStyle = `rgba(240,226,200,${((1 - p) * 0.28).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(2.5 + Math.sin(t * 2 + i) * 1.6, -5 - p * 8, 1.2 + p * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (n.prop === 'wrench') {
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 5); ctx.lineTo(3, -5);
    ctx.stroke();
    ctx.strokeStyle = '#c9d2d8';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(-4.8, 5.8, 2.5, 0.35, Math.PI * 1.75); ctx.stroke();
    ctx.beginPath(); ctx.arc(3.8, -5.8, 2.2, Math.PI * 1.2, Math.PI * 2.05); ctx.stroke();
  } else {
    ctx.fillStyle = '#8b2f24';
    roundRect(0, 0, 7, 10, 1);
    ctx.fill();
    ctx.fillStyle = '#e8d5ae';
    ctx.fillRect(1.2, 1.2, 4.6, 7.6);
    ctx.fillStyle = 'rgba(90,60,40,.4)';
    for (let i = 0; i < 3; i++) ctx.fillRect(2, 2.6 + i * 1.7, 3, 0.6);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(0.2, 8.8, 6.6, 0.8);
  }
  ctx.restore();
}

function drawNpcHead(n, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.78, 0.78);
  x = 0;
  y = 0;
  const skin = n.skin || '#efc6a0';
  const hair = n.hair || '#4a3020';
  const style = n.style || 0;
  const dot = (dx, dy, rr, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, rr, 0, Math.PI * 2);
    ctx.fill();
  };
  const ell = (dx, dy, rx, ry, col, rot) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x + dx, y + dy, rx, ry, rot || 0, 0, Math.PI * 2);
    ctx.fill();
  };

  dot(-9.4, 1, 2.1, skin);
  dot(9.4, 1, 2.1, skin);

  if (style === 1) {
    ctx.fillStyle = hair;
    roundRect(x - 11, y - 11, 22, 20, 9);
    ctx.fill();
  } else if (style === 2) {
    dot(11.6, 0, 4.8, hair);
    dot(11.6, 0, 2.6, 'rgba(255,255,255,.14)');
  }

  dot(0, 0, 10, skin);

  if (style === 4) {
    ell(-9.2, -2, 2.4, 4.2, hair, -0.2);
    ell(9.2, -2, 2.4, 4.2, hair, 0.2);
  } else {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(x, y - 5.2, 10.5, 6.6, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    if (style === 3) {
      for (const [dx, dy, rr] of [[-7.5, -7, 3.6], [-2.5, -9.4, 4.1], [3.2, -9, 3.8], [7.8, -5.6, 3.3]]) dot(dx, dy, rr, hair);
    }
    if (style === 0) {
      ell(-9.2, -2.5, 2.1, 3.6, hair, -0.15);
      ell(9.2, -2.5, 2.1, 3.6, hair, 0.15);
    }
    if (style === 2) {
      ell(-8.6, -2, 2.2, 4, hair, -0.12);
      ell(8.6, -2, 2.2, 4, hair, 0.12);
    }
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    ctx.beginPath();
    ctx.ellipse(x - 3.5, y - 8, 4.5, 1.6, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (n.beard) {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(x, y + 6.5, 7.2, 5.2, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = hair;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x - 2.6, y + 3.4, 2.4, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 2.6, y + 3.4, 2.4, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  if (n.glasses) {
    ctx.strokeStyle = 'rgba(58,43,32,.9)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(x - 3.7, y - 1.5, 3.5, 0, Math.PI * 2);
    ctx.moveTo(x + 3.7 + 3.5, y - 1.5);
    ctx.arc(x + 3.7, y - 1.5, 3.5, 0, Math.PI * 2);
    ctx.moveTo(x - 0.2, y - 1.5); ctx.lineTo(x + 0.2, y - 1.5);
    ctx.moveTo(x - 7.2, y - 1.5); ctx.lineTo(x - 9.8, y - 2);
    ctx.moveTo(x + 7.2, y - 1.5); ctx.lineTo(x + 9.8, y - 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,225,235,.16)';
    ctx.beginPath();
    ctx.arc(x - 3.7, y - 1.5, 3.2, 0, Math.PI * 2);
    ctx.arc(x + 3.7, y - 1.5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x - 5.2, y - 3.1); ctx.lineTo(x - 3.5, y - 1.8);
    ctx.moveTo(x + 2.2, y - 3.1); ctx.lineTo(x + 3.9, y - 1.8);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(58,43,32,.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 5.6, y - 5.2); ctx.lineTo(x - 2.4, y - 5.6);
  ctx.moveTo(x + 2.4, y - 5.6); ctx.lineTo(x + 5.6, y - 5.2);
  ctx.stroke();

  const blink = Math.sin(performance.now() / 880 + (n.x + n.y) * 0.013) > 0.985;
  if (blink) {
    ctx.strokeStyle = '#2a1c14';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 4.6, y - 1.4);
    ctx.quadraticCurveTo(x - 3.7, y - 0.7, x - 2.8, y - 1.4);
    ctx.moveTo(x + 2.8, y - 1.4);
    ctx.quadraticCurveTo(x + 3.7, y - 0.7, x + 4.6, y - 1.4);
    ctx.stroke();
  } else {
    const gx = Math.max(-0.5, Math.min(0.5, (player.x - n.x) / 180));
    const gy = Math.max(-0.35, Math.min(0.35, (player.y - n.y) / 220));
    ctx.fillStyle = '#2a1c14';
    ctx.beginPath();
    ctx.arc(x - 3.7 + gx, y - 1.6 + gy, 1.45, 0, Math.PI * 2);
    ctx.arc(x + 3.7 + gx, y - 1.6 + gy, 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.arc(x - 4.1 + gx, y - 2.1 + gy, 0.5, 0, Math.PI * 2);
    ctx.arc(x + 3.3 + gx, y - 2.1 + gy, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!n.beard) {
    ctx.strokeStyle = 'rgba(120,70,50,.65)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(x, y + 3.4, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(150,90,60,.55)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x, y - 0.4); ctx.lineTo(x - 0.6, y + 1.6);
  ctx.stroke();

  ctx.fillStyle = 'rgba(220,120,110,.1)';
  ctx.beginPath();
  ctx.ellipse(x - 6.6, y + 2.8, 2.1, 1.4, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 6.6, y + 2.8, 2.1, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (style === 2) {
    ctx.fillStyle = PALETTE.brass;
    ctx.beginPath();
    ctx.arc(x - 9.6, y + 2.2, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function npcLimb(x1, y1, cx, cy, x2, y2, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();
}

function npcHand(x, y, r, skin) {
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,245,225,.22)';
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
}

function npcShoe(x, y, dir, color, sole) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.fillStyle = sole || '#2a1a14';
  ctx.beginPath();
  ctx.ellipse(0, 0.6, 6.2, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(-0.5, -1.1, 5.4, 3.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.ellipse(-1.6, -2.1, 2.4, 0.9, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function npcFace(skin, hx, hy, hr, opt) {
  const o = opt || {};
  const t = performance.now() / 1000;
  const seed = o.seed || 0;

  for (const s of [-1, 1]) {
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(hx + s * hr * 0.92, hy + hr * 0.08, hr * 0.22, hr * 0.3, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(110,60,40,.12)';
    ctx.beginPath();
    ctx.ellipse(hx + s * hr * 0.94, hy + hr * 0.1, hr * 0.1, hr * 0.17, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();

  const shade = ctx.createRadialGradient(hx - hr * 0.36, hy - hr * 0.4, hr * 0.1, hx, hy, hr * 1.14);
  shade.addColorStop(0, 'rgba(255,248,235,.46)');
  shade.addColorStop(0.56, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(80,42,26,.17)');
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(hx, hy, hr * 1.01, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = o.browColor || 'rgba(78,48,34,.78)';
  ctx.lineWidth = Math.max(1, hr * 0.11);
  ctx.lineCap = 'round';
  const browY = hy - hr * 0.24;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + s * hr * 0.58, browY + (o.brow === 'worry' ? hr * 0.05 : 0));
    ctx.quadraticCurveTo(hx + s * hr * 0.36, browY - hr * 0.13, hx + s * hr * 0.15, browY - hr * 0.02);
    ctx.stroke();
  }

  const eyeY = hy + hr * 0.04 + (o.gazeDown ? hr * 0.04 : 0);
  const eyeX = hr * 0.35;
  const blink = Math.sin(t * 1.25 + seed) > 0.975;
  if (blink) {
    ctx.strokeStyle = '#2a1c14';
    ctx.lineWidth = Math.max(1, hr * 0.1);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + s * eyeX - hr * 0.14, eyeY);
      ctx.quadraticCurveTo(hx + s * eyeX, eyeY + hr * 0.08, hx + s * eyeX + hr * 0.14, eyeY);
      ctx.stroke();
    }
  } else {
    for (const s of [-1, 1]) {
      ctx.fillStyle = 'rgba(255,252,244,.72)';
      ctx.beginPath();
      ctx.ellipse(hx + s * eyeX, eyeY, hr * 0.17, hr * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = o.eyeColor || '#3a2b20';
      ctx.beginPath();
      ctx.arc(hx + s * eyeX, eyeY + (o.gazeDown ? hr * 0.035 : 0), hr * 0.105, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath();
      ctx.arc(hx + s * eyeX - hr * 0.035, eyeY - hr * 0.045, hr * 0.033, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(50,32,22,.4)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hx + s * eyeX - hr * 0.16, eyeY - hr * 0.16);
      ctx.lineTo(hx + s * eyeX + hr * 0.13, eyeY - hr * 0.18);
      ctx.stroke();
      if (o.female) {
        ctx.strokeStyle = 'rgba(58,36,26,.6)';
        ctx.lineWidth = Math.max(0.8, hr * 0.05);
        ctx.beginPath();
        ctx.moveTo(hx + s * eyeX + s * hr * 0.13, eyeY - hr * 0.14);
        ctx.lineTo(hx + s * eyeX + s * hr * 0.27, eyeY - hr * 0.24);
        ctx.moveTo(hx + s * eyeX + s * hr * 0.02, eyeY - hr * 0.16);
        ctx.lineTo(hx + s * eyeX + s * hr * 0.08, eyeY - hr * 0.3);
        ctx.stroke();
      }
    }
  }

  ctx.strokeStyle = 'rgba(150,90,60,.45)';
  ctx.lineWidth = Math.max(0.9, hr * 0.08);
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.02, hy + hr * 0.17);
  ctx.lineTo(hx - hr * 0.06, hy + hr * 0.36);
  ctx.stroke();

  ctx.strokeStyle = o.mouthColor || '#8a4a3a';
  ctx.lineWidth = Math.max(1, hr * 0.1);
  ctx.beginPath();
  if (o.mouth === 'straight') {
    ctx.moveTo(hx - hr * 0.15, hy + hr * 0.55);
    ctx.lineTo(hx + hr * 0.15, hy + hr * 0.55);
  } else if (o.mouth === 'small') {
    ctx.arc(hx, hy + hr * 0.45, hr * 0.15, 0.15 * Math.PI, 0.85 * Math.PI);
  } else {
    ctx.arc(hx, hy + hr * 0.42, hr * 0.22, 0.12 * Math.PI, 0.88 * Math.PI);
  }
  ctx.stroke();

  if (o.female) {
    ctx.fillStyle = o.lipColor || 'rgba(190,92,82,.45)';
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.17, hy + hr * 0.5);
    ctx.quadraticCurveTo(hx, hy + hr * 0.6, hx + hr * 0.17, hy + hr * 0.5);
    ctx.quadraticCurveTo(hx, hy + hr * 0.66, hx - hr * 0.17, hy + hr * 0.5);
    ctx.fill();
  }

  if (o.jaw) {
    ctx.fillStyle = 'rgba(112,66,44,.12)';
    ctx.beginPath();
    ctx.ellipse(hx, hy + hr * 0.7, hr * 0.4, hr * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (o.blush) {
    ctx.fillStyle = 'rgba(220,120,110,.13)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(hx + s * hr * 0.6, hy + hr * 0.3, hr * 0.22, hr * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (o.age) {
    ctx.strokeStyle = 'rgba(120,70,50,.28)';
    ctx.lineWidth = 0.8;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + s * hr * 0.63, hy + hr * 0.02);
      ctx.lineTo(hx + s * hr * 0.78, hy + hr * 0.06);
      ctx.moveTo(hx + s * hr * 0.62, hy + hr * 0.12);
      ctx.lineTo(hx + s * hr * 0.76, hy + hr * 0.15);
      ctx.stroke();
    }
  }
}

function npcGlasses(hx, hy, hr, shape) {
  ctx.strokeStyle = 'rgba(58,43,32,.9)';
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  const r = hr * 0.35;
  if (shape === 'sharp') {
    roundRect(hx - hr * 0.35 - r, hy - r * 0.9, r * 2, r * 1.8, 1.4);
    roundRect(hx + hr * 0.35 - r, hy - r * 0.9, r * 2, r * 1.8, 1.4);
  } else {
    ctx.arc(hx - hr * 0.35, hy, r, 0, Math.PI * 2);
    ctx.moveTo(hx + hr * 0.35 + r, hy);
    ctx.arc(hx + hr * 0.35, hy, r, 0, Math.PI * 2);
  }
  ctx.moveTo(hx - hr * 0.02, hy);
  ctx.lineTo(hx + hr * 0.02, hy);
  ctx.moveTo(hx - hr * 0.7, hy);
  ctx.lineTo(hx - hr * 0.95, hy - 0.8);
  ctx.moveTo(hx + hr * 0.7, hy);
  ctx.lineTo(hx + hr * 0.95, hy - 0.8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(210,232,240,.14)';
  ctx.beginPath();
  ctx.arc(hx - hr * 0.35, hy, r * 0.9, 0, Math.PI * 2);
  ctx.arc(hx + hr * 0.35, hy, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.5, hy - hr * 0.12);
  ctx.lineTo(hx - hr * 0.38, hy - hr * 0.02);
  ctx.moveTo(hx + hr * 0.2, hy - hr * 0.12);
  ctx.lineTo(hx + hr * 0.32, hy - hr * 0.02);
  ctx.stroke();
}

function drawVeraNpc(n, t) {
  const skin = '#f0c9a6';
  const hair = '#c85a24';
  const hairLight = '#f0995e';
  const sway = Math.sin(t * 1.35) * 0.4;

  ctx.save();
  ctx.rotate(Math.sin(t * 1.1) * 0.004);

  // backpack behind
  ctx.fillStyle = '#39465e';
  roundRect(-12, -43, 24, 26, 6);
  ctx.fill();
  ctx.fillStyle = '#4c5d7a';
  roundRect(-10, -41, 20, 10, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, -29); ctx.lineTo(10, -29);
  ctx.stroke();

  // legs
  npcLimb(-4.6, -17, -4.4, -9, -4.9, -2.4, 5.4, '#c7a178');
  npcLimb(4.6, -17, 4.4, -9, 4.9, -2.4, 5.4, '#c7a178');
  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.fillRect(-7.2, -9, 5, 1.2);
  ctx.fillRect(2.2, -9, 5, 1.2);
  npcShoe(-5.2, -1.6, 1, '#6b4a36');
  npcShoe(5.2, -1.6, -1, '#6b4a36');

  // shirt
  const shirt = ctx.createLinearGradient(0, -45, 0, -15);
  shirt.addColorStop(0, '#c2dcf0');
  shirt.addColorStop(0.55, '#a8c8e8');
  shirt.addColorStop(1, '#8fb2d6');
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(-9.6, -43);
  ctx.quadraticCurveTo(-12.2, -32, -10.2, -26);
  ctx.quadraticCurveTo(-12.4, -21, -11.4, -15);
  ctx.quadraticCurveTo(0, -12, 11.4, -15);
  ctx.quadraticCurveTo(12.4, -21, 10.2, -26);
  ctx.quadraticCurveTo(12.2, -32, 9.6, -43);
  ctx.closePath();
  ctx.fill();

  // collar and tie
  ctx.fillStyle = '#eef4f8';
  ctx.beginPath();
  ctx.moveTo(-5, -44); ctx.lineTo(0, -37); ctx.lineTo(5, -44); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#cf5a22';
  ctx.beginPath();
  ctx.moveTo(0, -39); ctx.lineTo(2.4, -36.5); ctx.lineTo(0, -26); ctx.lineTo(-2.4, -36.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,150,.22)';
  ctx.beginPath();
  ctx.moveTo(-0.8, -36); ctx.lineTo(0, -36); ctx.lineTo(-0.2, -27);
  ctx.closePath();
  ctx.fill();

  // backpack straps
  ctx.strokeStyle = '#39465e';
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -43); ctx.quadraticCurveTo(-10, -32, -8.5, -19);
  ctx.moveTo(8, -43); ctx.quadraticCurveTo(10, -32, 8.5, -19);
  ctx.stroke();
  ctx.fillStyle = '#c9a23a';
  ctx.fillRect(-10, -31, 3, 2);
  ctx.fillRect(7, -31, 3, 2);

  // sleeves
  ctx.strokeStyle = '#98bada';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, -40); ctx.quadraticCurveTo(-15, -35, -14, -30);
  ctx.moveTo(10, -40); ctx.quadraticCurveTo(15, -35, 14, -30);
  ctx.stroke();
  ctx.fillStyle = '#a8c8e8';
  ctx.beginPath();
  ctx.ellipse(-14, -29.5, 3.4, 2.2, 0.2, 0, Math.PI * 2);
  ctx.ellipse(14, -29.5, 3.4, 2.2, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // arms to hips
  ctx.strokeStyle = skin;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-13, -29); ctx.quadraticCurveTo(-16, -23, -11.5, -19.5);
  ctx.moveTo(13, -29); ctx.quadraticCurveTo(16, -23, 11.5, -19.5);
  ctx.stroke();
  npcHand(-11, -18.6, 3, skin);
  npcHand(11, -18.6, 3, skin);

  // neck
  ctx.fillStyle = skin;
  ctx.fillRect(-3, -47, 6, 5);

  // wavy hair behind
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(-8.5, -57);
  ctx.bezierCurveTo(-17, -54, -17, -44, -13, -38);
  ctx.bezierCurveTo(-15, -34, -11, -31, -7.5, -34);
  ctx.bezierCurveTo(-8.5, -41, -7, -48, -6, -55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(8.5, -57);
  ctx.bezierCurveTo(17, -54, 18, -43, 14, -37);
  ctx.bezierCurveTo(17, -33, 12, -30, 8, -34);
  ctx.bezierCurveTo(9, -41, 7.5, -48, 6, -55);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-12.5, -36, 4.2, 6.2, 0.5, 0, Math.PI * 2);
  ctx.ellipse(12.5, -35, 4.2, 6.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,190,120,.22)';
  ctx.beginPath();
  ctx.ellipse(-12, -48, 3, 5, 0.3, 0, Math.PI * 2);
  ctx.ellipse(11, -50, 2.4, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();

  const hx = 0, hy = -55.5, hr = 9.4;
  npcFace(skin, hx, hy, hr, { seed: 1.2, eyeColor: '#4d6b3a', blush: true, mouthColor: '#a04e3e', female: true });

  // fringe
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(-hr * 1.06, hy - hr * 0.1);
  ctx.bezierCurveTo(-hr * 1.04, hy - hr * 0.9, -hr * 0.36, hy - hr * 1.24, hr * 0.2, hy - hr * 0.95);
  ctx.bezierCurveTo(hr * 0.72, hy - hr * 0.92, hr * 1.04, hy - hr * 0.48, hr * 1.02, hy - hr * 0.02);
  ctx.bezierCurveTo(hr * 0.8, hy - hr * 0.38, hr * 0.62, hy - hr * 0.46, hr * 0.4, hy - hr * 0.3);
  ctx.bezierCurveTo(hr * 0.1, hy - hr * 0.66, -hr * 0.34, hy - hr * 0.5, -hr * 0.52, hy - hr * 0.22);
  ctx.bezierCurveTo(-hr * 0.7, hy - hr * 0.58, -hr * 0.92, hy - hr * 0.42, -hr * 1.06, hy - hr * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = hairLight;
  ctx.beginPath();
  ctx.ellipse(-hr * 0.42, hy - hr * 0.66, hr * 0.35, hr * 0.12, -0.45, 0, Math.PI * 2);
  ctx.ellipse(hr * 0.38, hy - hr * 0.62, hr * 0.3, hr * 0.1, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,225,190,.2)';
  ctx.beginPath();
  ctx.ellipse(-hr * 0.1, hy - hr * 0.92, hr * 0.4, hr * 0.08, -0.2, 0, Math.PI * 2);
  ctx.fill();

  npcGlasses(hx, hy + 0.5, hr, 'round');
  ctx.restore();
}

function drawKlaraNpc(n, t) {
  const skin = '#eac3a1';
  const bounce = Math.abs(Math.sin(t * 2.2)) * 1.1;
  const fist = Math.sin(t * 3.1) * 1.2;

  ctx.save();
  ctx.translate(0, -bounce);

  // ankles and shoes
  npcLimb(-3.5, -10, -3.5, -6.5, -3.8, -3.2, 3.6, skin);
  npcLimb(3.5, -10, 3.5, -6.5, 3.8, -3.2, 3.6, skin);
  npcShoe(-4.6, -2.6, 1, '#f0ede4', '#b8b4a8');
  npcShoe(4.6, -2.6, -1, '#f0ede4', '#b8b4a8');

  // long skirt — женский силуэт
  ctx.fillStyle = '#4a3f52';
  ctx.beginPath();
  ctx.moveTo(-8.8, -19);
  ctx.lineTo(8.8, -19);
  ctx.quadraticCurveTo(11.6, -10, 12.4, -4.4);
  ctx.quadraticCurveTo(0, -1.6, -12.4, -4.4);
  ctx.quadraticCurveTo(-11.6, -10, -8.8, -19);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,14,20,.45)';
  ctx.lineWidth = 0.8;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4, -17);
    ctx.quadraticCurveTo(i * 5.4, -10, i * 6, -4.2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.beginPath();
  ctx.moveTo(-8, -18);
  ctx.quadraticCurveTo(-10.4, -10, -10.2, -5);
  ctx.lineTo(-12, -4.6);
  ctx.quadraticCurveTo(-11.4, -10, -9.4, -18);
  ctx.closePath();
  ctx.fill();

  // orange tee (как на портрете)
  const jacket = ctx.createLinearGradient(0, -43, 0, -16);
  jacket.addColorStop(0, '#f4894a');
  jacket.addColorStop(1, '#cf5f27');
  ctx.fillStyle = jacket;
  ctx.beginPath();
  ctx.moveTo(-7.6, -43);
  ctx.quadraticCurveTo(-9.4, -33, -7.6, -27);
  ctx.quadraticCurveTo(-11.4, -22, -10.4, -17);
  ctx.quadraticCurveTo(0, -14, 10.4, -17);
  ctx.quadraticCurveTo(11.4, -22, 7.6, -27);
  ctx.quadraticCurveTo(9.4, -33, 7.6, -43);
  ctx.closePath();
  ctx.fill();

  // collar and double-breasted buttons
  ctx.fillStyle = '#f7f3e9';
  ctx.beginPath();
  ctx.moveTo(-6, -43); ctx.lineTo(0, -36); ctx.lineTo(6, -43); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,100,80,.3)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#8a7a64';
    ctx.beginPath();
    ctx.arc(-4, -33 + i * 5.5, 0.85, 0, Math.PI * 2);
    ctx.arc(4, -33 + i * 5.5, 0.85, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120,100,80,.25)';
  ctx.beginPath();
  ctx.moveTo(0, -36); ctx.lineTo(0, -18);
  ctx.stroke();

  // light apron over the tee
  ctx.fillStyle = '#f5efe0';
  ctx.beginPath();
  ctx.moveTo(-9, -27);
  ctx.lineTo(9, -27);
  ctx.lineTo(10.5, -5);
  ctx.quadraticCurveTo(0, -2.5, -10.5, -5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath();
  ctx.moveTo(-7.5, -25); ctx.lineTo(-1, -25); ctx.lineTo(-2, -6); ctx.lineTo(-9, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,135,110,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-9, -27); ctx.lineTo(9, -27);
  ctx.stroke();

  // цветастый платок на плечах (как на портрете)
  ctx.fillStyle = '#b5493a';
  ctx.beginPath();
  ctx.moveTo(-11, -43);
  ctx.quadraticCurveTo(-15.5, -33, -10, -27);
  ctx.quadraticCurveTo(-4, -33, 0, -34);
  ctx.quadraticCurveTo(4, -33, 10, -27);
  ctx.quadraticCurveTo(15.5, -33, 11, -43);
  ctx.quadraticCurveTo(0, -48, -11, -43);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(232,196,92,.8)';
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    ctx.beginPath();
    ctx.arc(Math.sin(a) * 9, -36 + Math.cos(a) * 3, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  ctx.beginPath();
  ctx.moveTo(-10, -42);
  ctx.quadraticCurveTo(-13.5, -35, -10, -30);
  ctx.lineTo(-8, -31);
  ctx.quadraticCurveTo(-11, -36, -8.5, -41);
  ctx.closePath();
  ctx.fill();

  // sleeves
  ctx.strokeStyle = '#e8793c';
  ctx.lineWidth = 5.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -39); ctx.quadraticCurveTo(-11, -36, -10.2, -31);
  ctx.moveTo(8, -39); ctx.quadraticCurveTo(11, -36, 10.2, -31);
  ctx.stroke();

  // left hand on hip
  ctx.strokeStyle = skin;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-12, -30); ctx.quadraticCurveTo(-15, -24, -10.5, -20);
  ctx.stroke();
  npcHand(-10.5, -19, 2.9, skin);

  // right arm raised in a cheerful fist
  ctx.strokeStyle = skin;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(12, -30); ctx.quadraticCurveTo(19, -34, 17, -41 + fist);
  ctx.stroke();
  npcHand(17, -42 + fist, 3.3, skin);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(17.4, -44.5 + fist, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,150,.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(17, -42 + fist, 6.5, -0.6, 0.5);
  ctx.moveTo(20, -35 + fist);
  ctx.lineTo(22, -34 + fist);
  ctx.stroke();

  // neck
  ctx.fillStyle = skin;
  ctx.fillRect(-2.8, -46, 5.6, 5);

  // седые волосы и пучок
  const hx = 0, hy = -54.5, hr = 9;
  ctx.fillStyle = '#cfc7b8';
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 1.06, hr * 0.5, hr * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,108,92,.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 1.06, hr * 0.5, hr * 0.44, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.14, hy - hr * 1.2, hr * 0.2, hr * 0.1, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 0.3, hr * 1.05, hr * 0.78, 0, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.94, hy + hr * 0.05, hr * 0.22, hr * 0.4, -0.12, 0, Math.PI * 2);
  ctx.ellipse(hx + hr * 0.94, hy + hr * 0.05, hr * 0.22, hr * 0.4, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.3, hy - hr * 0.74, hr * 0.4, hr * 0.1, -0.25, 0, Math.PI * 2);
  ctx.fill();

  npcFace(skin, hx, hy + 0.4, hr, { seed: 2.1, eyeColor: '#3a2b20', blush: true, mouth: 'smile', mouthColor: '#a04e3e', age: true, female: true, lipColor: 'rgba(186,88,78,.5)' });

  // warm smile lines
  ctx.strokeStyle = 'rgba(150,90,60,.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(hx - hr * 0.52, hy + hr * 0.38, hr * 0.18, 0.15 * Math.PI, 0.7 * Math.PI);
  ctx.arc(hx + hr * 0.52, hy + hr * 0.38, hr * 0.18, 0.3 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.restore();
}

function drawMishaNpc(n, t) {
  const skin = '#f3d2b2';
  const hair = '#2b211d';
  const pocketGlow = 0.28 + Math.sin(t * 2.4) * 0.12;
  const shift = Math.sin(t * 1.5) * 0.35;
  const look = Math.sin(t * 0.8);
  const gazeDown = look < 0.2;

  ctx.save();
  ctx.translate(shift, 0);

  // legs
  npcLimb(-3.6, -18, -3.5, -11, -4, -4, 4.3, skin);
  npcLimb(3.6, -18, 3.5, -11, 4, -4, 4.3, skin);
  npcShoe(-4.3, -3.4, 1, '#b07a42', '#8a5a32');
  npcShoe(4.3, -3.4, -1, '#b07a42', '#8a5a32');

  // beige shorts
  ctx.fillStyle = '#3d4a5c';
  roundRect(-6.8, -22, 13.6, 9, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,80,48,.35)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-2.4, -20); ctx.lineTo(-2.4, -13.5);
  ctx.moveTo(2.4, -20); ctx.lineTo(2.4, -13.5);
  ctx.stroke();

  // orange tee (как на портрете)
  const sweat = ctx.createLinearGradient(0, -40, 0, -19);
  sweat.addColorStop(0, '#f4904a');
  sweat.addColorStop(1, '#d9692a');
  ctx.fillStyle = sweat;
  ctx.beginPath();
  ctx.moveTo(-8.6, -38);
  ctx.quadraticCurveTo(-11, -30, -8.6, -20);
  ctx.quadraticCurveTo(0, -17.5, 8.6, -20);
  ctx.quadraticCurveTo(11, -30, 8.6, -38);
  ctx.closePath();
  ctx.fill();

  // collar
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(-5, -40); ctx.lineTo(0, -34.6); ctx.lineTo(5, -40); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(180,160,130,.35)';
  ctx.beginPath();
  ctx.moveTo(-4, -39.4); ctx.lineTo(0, -35.4); ctx.lineTo(4, -39.4); ctx.closePath();
  ctx.fill();

  // sleeves + hands in pockets
  ctx.strokeStyle = '#e87a38';
  ctx.lineWidth = 5.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8.5, -36); ctx.quadraticCurveTo(-11, -29, -7.8, -23);
  ctx.moveTo(8.5, -36); ctx.quadraticCurveTo(11, -29, 7.8, -23);
  ctx.stroke();
  ctx.fillStyle = '#d9692a';
  ctx.beginPath();
  ctx.ellipse(-7.8, -22.5, 2.6, 1.7, 0.1, 0, Math.PI * 2);
  ctx.ellipse(7.8, -22.5, 2.6, 1.7, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // phone peeking from pocket
  ctx.fillStyle = '#2f3841';
  roundRect(-2.3, -25, 4.6, 6.8, 1.4);
  ctx.fill();
  ctx.fillStyle = `rgba(127,196,232,${pocketGlow.toFixed(3)})`;
  ctx.fillRect(-1.5, -24, 3, 4.2);
  ctx.fillStyle = `rgba(127,196,232,${(pocketGlow * 0.25).toFixed(3)})`;
  ctx.beginPath();
  ctx.arc(0, -21, 7, 0, Math.PI * 2);
  ctx.fill();

  // neck
  ctx.fillStyle = skin;
  ctx.fillRect(-2.6, -43, 5.2, 4.5);

  // hair + head
  const hx = 0, hy = -50, hr = 8.4;
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 0.55, hr * 1.02, hr * 0.72, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1f1916';
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.9, hy - hr * 0.15, hr * 0.16, hr * 0.28, 0.1, 0, Math.PI * 2);
  ctx.ellipse(hx + hr * 0.9, hy - hr * 0.15, hr * 0.16, hr * 0.28, -0.1, 0, Math.PI * 2);
  ctx.fill();

  npcFace(skin, hx, hy + 0.5, hr, { seed: 3.4, eyeColor: '#5a7a9a', blush: true, mouth: 'small', gazeDown, mouthColor: '#a05a4a' });

  // side-swept fringe
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(-hr * 1.04, hy - hr * 0.18);
  ctx.bezierCurveTo(-hr * 0.95, hy - hr * 0.98, -hr * 0.2, hy - hr * 1.18, hr * 0.3, hy - hr * 0.82);
  ctx.bezierCurveTo(hr * 0.8, hy - hr * 0.78, hr * 0.98, hy - hr * 0.35, hr * 0.82, hy - hr * 0.08);
  ctx.bezierCurveTo(hr * 0.56, hy - hr * 0.5, hr * 0.2, hy - hr * 0.55, -hr * 0.12, hy - hr * 0.32);
  ctx.bezierCurveTo(-hr * 0.4, hy - hr * 0.58, -hr * 0.78, hy - hr * 0.44, -hr * 1.04, hy - hr * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,238,200,.2)';
  ctx.beginPath();
  ctx.ellipse(hr * 0.2, hy - hr * 0.78, hr * 0.34, hr * 0.08, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // phone light on chin
  ctx.fillStyle = `rgba(127,196,232,${(pocketGlow * 0.12).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(hx, hy + hr * 0.75, hr * 0.7, hr * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawEgorNpc(n, t) {
  const skin = '#e8bd98';
  const hair = '#4a3020';
  const tap = Math.sin(t * 5.2) * 0.8;
  const glow = 0.42 + Math.sin(t * 2.1) * 0.12;

  ctx.save();
  ctx.translate(0, 0.5);

  // legs (purple plaid trousers)
  npcLimb(-4.4, -17, -4.2, -9, -4.8, -2, 5.6, '#6a4f85');
  npcLimb(4.4, -17, 4.2, -9, 4.8, -2 + tap, 5.6, '#6a4f85');
  ctx.strokeStyle = 'rgba(48,34,68,.45)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-7, -14 + i * 3.4); ctx.lineTo(-2, -14 + i * 3.4);
    ctx.moveTo(2, -14 + i * 3.4); ctx.lineTo(7, -14 + i * 3.4);
    ctx.stroke();
  }
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-4.8 + i * 1.2, -16); ctx.lineTo(-4.5 + i * 1.2, -3);
    ctx.moveTo(4.8 - i * 1.2, -16); ctx.lineTo(4.5 - i * 1.2, -3);
    ctx.stroke();
  }
  // slippers
  ctx.fillStyle = '#7d6a5a';
  ctx.beginPath();
  ctx.ellipse(-5.2, -1.4, 6, 2.7, 0, 0, Math.PI * 2);
  ctx.ellipse(5.2, -1.4 + tap, 6, 2.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5e4f42';
  ctx.beginPath();
  ctx.ellipse(-5.2, -0.5, 6.2, 1.3, 0, 0, Math.PI * 2);
  ctx.ellipse(5.2, 0.5 + tap, 6.2, 1.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // white tee
  const tee = ctx.createLinearGradient(0, -45, 0, -20);
  tee.addColorStop(0, '#f2f0e9');
  tee.addColorStop(1, '#d9d6cd');
  ctx.fillStyle = tee;
  ctx.beginPath();
  ctx.moveTo(-8.5, -43);
  ctx.quadraticCurveTo(-11, -33, -8.5, -20);
  ctx.quadraticCurveTo(0, -17.5, 8.5, -20);
  ctx.quadraticCurveTo(11, -33, 8.5, -43);
  ctx.closePath();
  ctx.fill();

  // open blue plaid overshirt
  const plaid = ctx.createLinearGradient(0, -45, 0, -22);
  plaid.addColorStop(0, '#527aa8');
  plaid.addColorStop(1, '#3c5f88');
  ctx.fillStyle = plaid;
  ctx.beginPath();
  ctx.moveTo(-9, -44); ctx.quadraticCurveTo(-13, -33, -10, -21);
  ctx.lineTo(-5, -20); ctx.lineTo(-3.5, -41); ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9, -44); ctx.quadraticCurveTo(13, -33, 10, -21);
  ctx.lineTo(5, -20); ctx.lineTo(3.5, -41); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,50,80,.55)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-12.5 + i * 0.5, -39 + i * 4.4); ctx.lineTo(-5 + i * 0.3, -39 + i * 4.4);
    ctx.moveTo(5 - i * 0.3, -39 + i * 4.4); ctx.lineTo(12.5 - i * 0.5, -39 + i * 4.4);
    ctx.stroke();
  }
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-8 + i * 2.2, -42); ctx.lineTo(-7 + i * 2.2, -22);
    ctx.moveTo(8 - i * 2.2, -42); ctx.lineTo(7 - i * 2.2, -22);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.beginPath();
  ctx.moveTo(-8.5, -42); ctx.lineTo(-6.5, -41); ctx.lineTo(-5.4, -24); ctx.lineTo(-8, -26);
  ctx.closePath();
  ctx.fill();

  // rolled sleeves
  ctx.strokeStyle = '#527aa8';
  ctx.lineWidth = 5.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, -41); ctx.quadraticCurveTo(-14, -35, -12, -30);
  ctx.moveTo(10, -41); ctx.quadraticCurveTo(14, -35, 12, -30);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(30,50,80,.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-14, -30.5); ctx.lineTo(-10, -31);
  ctx.moveTo(10, -31); ctx.lineTo(14, -30.5);
  ctx.stroke();

  // arms holding tablet
  ctx.strokeStyle = skin;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-12, -30); ctx.quadraticCurveTo(-12, -26, -7, -25.5);
  ctx.moveTo(12, -30); ctx.quadraticCurveTo(12, -26, 7, -25.5);
  ctx.stroke();
  npcHand(-7, -25, 2.6, skin);
  npcHand(7, -25, 2.6, skin);

  // tablet
  ctx.fillStyle = '#1c2228';
  roundRect(-8.5, -33.5, 17, 12.5, 2.4);
  ctx.fill();
  ctx.fillStyle = '#0f2a32';
  roundRect(-7.3, -32.5, 14.6, 10.5, 1.8);
  ctx.fill();
  const scr = ctx.createLinearGradient(-7, -32, 7, -22);
  scr.addColorStop(0, '#52c6e8');
  scr.addColorStop(0.55, '#256f9a');
  scr.addColorStop(1, '#c05a7a');
  ctx.fillStyle = scr;
  roundRect(-6.4, -31.6, 12.8, 8.7, 1.2);
  ctx.fill();
  ctx.fillStyle = `rgba(220,250,255,${(0.55 + glow * 0.4).toFixed(3)})`;
  ctx.fillRect(-5, -29.8, 6, 0.9);
  ctx.fillRect(-5, -27.7, 8.5, 0.9);
  ctx.fillRect(-5, -25.6, 4.5, 0.9);
  ctx.fillStyle = `rgba(120,220,255,${(glow * 0.28).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(0, -27, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // neck
  ctx.fillStyle = skin;
  ctx.fillRect(-2.8, -46.5, 5.6, 5);

  // messy hair + head
  const hx = 0, hy = -53.5, hr = 9.3;
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(-hr * 1.02, hy - hr * 0.12);
  ctx.bezierCurveTo(-hr * 1.05, hy - hr * 0.72, -hr * 0.72, hy - hr * 1.18, -hr * 0.26, hy - hr * 1.04);
  ctx.lineTo(-hr * 0.36, hy - hr * 1.28);
  ctx.lineTo(hr * 0.02, hy - hr * 1.05);
  ctx.lineTo(hr * 0.18, hy - hr * 1.3);
  ctx.lineTo(hr * 0.46, hy - hr * 1.0);
  ctx.lineTo(hr * 0.78, hy - hr * 1.14);
  ctx.lineTo(hr * 0.72, hy - hr * 0.82);
  ctx.bezierCurveTo(hr * 1.08, hy - hr * 0.6, hr * 1.02, hy - hr * 0.1, hr * 0.9, hy + hr * 0.05);
  ctx.bezierCurveTo(hr * 0.86, hy - hr * 0.38, hr * 0.55, hy - hr * 0.5, hr * 0.28, hy - hr * 0.42);
  ctx.bezierCurveTo(0, hy - hr * 0.7, -hr * 0.55, hy - hr * 0.6, -hr * 0.72, hy - hr * 0.25);
  ctx.bezierCurveTo(-hr * 0.86, hy - hr * 0.44, -hr * 0.98, hy - hr * 0.22, -hr * 1.02, hy - hr * 0.12);
  ctx.closePath();
  ctx.fill();

  npcFace(skin, hx, hy + 1.5, hr, { seed: 4.1, eyeColor: '#5a4632', mouth: 'small', gazeDown: true, mouthColor: '#8a4a3a', brow: 'worry', jaw: true });

  // шапка волос поверх головы (чтобы не читался лысым)
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(hx, hy + hr * 0.06, hr * 1.04, hr * 1.0, 0, Math.PI * 1.02, Math.PI * 2.02);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.98, hy - hr * 0.12);
  ctx.quadraticCurveTo(hx - hr * 0.7, hy - hr * 0.02, hx - hr * 0.42, hy - hr * 0.16);
  ctx.quadraticCurveTo(hx - hr * 0.16, hy - hr * 0.02, hx + hr * 0.08, hy - hr * 0.18);
  ctx.quadraticCurveTo(hx + hr * 0.4, hy - hr * 0.02, hx + hr * 0.62, hy - hr * 0.2);
  ctx.quadraticCurveTo(hx + hr * 0.84, hy - hr * 0.06, hx + hr * 1.0, hy - hr * 0.16);
  ctx.lineTo(hx + hr * 1.0, hy - hr * 0.6);
  ctx.quadraticCurveTo(hx, hy - hr * 1.24, hx - hr * 1.0, hy - hr * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,226,190,.18)';
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.28, hy - hr * 0.82, hr * 0.46, hr * 0.16, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // tired shadows under eyes
  ctx.strokeStyle = 'rgba(100,70,55,.28)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.5, hy + hr * 0.22);
  ctx.lineTo(hx - hr * 0.2, hy + hr * 0.23);
  ctx.moveTo(hx + hr * 0.2, hy + hr * 0.23);
  ctx.lineTo(hx + hr * 0.5, hy + hr * 0.22);
  ctx.stroke();

  // earbud + wire
  ctx.strokeStyle = '#2a2f36';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.86, hy + hr * 0.15);
  ctx.quadraticCurveTo(hx + hr * 1.5, hy + hr * 0.9, hx + hr * 1.15, hy + hr * 2.4);
  ctx.stroke();
  ctx.fillStyle = '#f0f0ea';
  ctx.beginPath();
  ctx.arc(hx + hr * 0.92, hy + hr * 0.15, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGrishaNpc(n, t) {
  const skin = '#d9a982';
  const hair = '#bdb6a8';
  const breathe = Math.sin(t * 1.7) * 0.5;
  const mopSway = Math.sin(t * 1.1) * 0.05;
  const salute = Math.sin(t * 1.4) * 0.8;

  ctx.save();

  // mop behind
  ctx.save();
  ctx.translate(12, -24);
  ctx.rotate(0.22 + mopSway);
  ctx.strokeStyle = '#b08a52';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 45);
  ctx.stroke();
  ctx.fillStyle = '#8fa3ad';
  ctx.beginPath();
  ctx.moveTo(-4, 44); ctx.lineTo(4, 44); ctx.lineTo(7, 52); ctx.quadraticCurveTo(0, 55, -7, 52);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,240,245,.35)';
  ctx.lineWidth = 0.7;
  for (let i = -3; i <= 3; i += 2) {
    ctx.beginPath();
    ctx.moveTo(i, 47); ctx.lineTo(i * 1.5, 53);
    ctx.stroke();
  }
  ctx.restore();

  // legs
  npcLimb(-4.8, -17, -4.6, -9, -5.1, -2, 6, '#4a3a2e');
  npcLimb(4.8, -17, 4.6, -9, 5.1, -2, 6, '#4a3a2e');
  ctx.fillStyle = '#3a2a20';
  ctx.beginPath();
  ctx.ellipse(-5.6, -1.2, 6.4, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(5.6, -1.2, 6.4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a4030';
  ctx.beginPath();
  ctx.ellipse(-5.6, -2, 5.8, 2.2, 0, 0, Math.PI * 2);
  ctx.ellipse(5.6, -2, 5.8, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // brown work shirt
  const suit = ctx.createLinearGradient(0, -47, 0, -15);
  suit.addColorStop(0, '#8a5f3e');
  suit.addColorStop(0.6, '#734a2f');
  suit.addColorStop(1, '#5c3a23');
  ctx.fillStyle = suit;
  ctx.beginPath();
  ctx.moveTo(-9.8, -45);
  ctx.quadraticCurveTo(-13, -33, -11, -15);
  ctx.quadraticCurveTo(0, -12, 11, -15);
  ctx.quadraticCurveTo(13, -33, 9.8, -45);
  ctx.closePath();
  ctx.fill();

  // shirt collar
  ctx.fillStyle = '#e8ddc8';
  ctx.beginPath();
  ctx.moveTo(-6, -46); ctx.lineTo(0, -38); ctx.lineTo(6, -46); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(90,70,50,.35)';
  ctx.beginPath();
  ctx.moveTo(-4, -44.6); ctx.lineTo(0, -39.6); ctx.lineTo(4, -44.6); ctx.closePath();
  ctx.fill();

  // zipper and pockets
  ctx.strokeStyle = '#7a6244';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -38); ctx.lineTo(0, -13);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(90,70,50,.55)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-8, -34); ctx.lineTo(-2.5, -34); ctx.lineTo(-2.5, -29); ctx.lineTo(-8, -29);
  ctx.moveTo(8, -34); ctx.lineTo(2.5, -34); ctx.lineTo(2.5, -29); ctx.lineTo(8, -29);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,210,.13)';
  ctx.fillRect(-9, -44, 3, 25);

  // notebook in pocket
  ctx.fillStyle = '#3f5f45';
  roundRect(-8.2, -36, 4.8, 6.4, 1);
  ctx.fill();
  ctx.fillStyle = '#e8ddc8';
  ctx.fillRect(-7.4, -35.2, 3.2, 4.2);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(-6.6, -36.2, 1.3, 1.2);

  // sleeves
  ctx.strokeStyle = '#7a5136';
  ctx.lineWidth = 6.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9.8, -43); ctx.quadraticCurveTo(-14, -37, -13, -30);
  ctx.moveTo(9.8, -43); ctx.quadraticCurveTo(14, -37, 13, -29);
  ctx.stroke();

  // left hand on mop
  ctx.strokeStyle = skin;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-13, -29); ctx.quadraticCurveTo(-10, -25, -6, -24);
  ctx.stroke();
  npcHand(-5.5, -24, 2.9, skin);

  // right hand saluting the cap
  ctx.strokeStyle = skin;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(13, -29); ctx.quadraticCurveTo(17, -35, 10.5, -44 + salute);
  ctx.stroke();
  npcHand(10, -45 + salute, 2.8, skin);

  // neck
  ctx.fillStyle = skin;
  ctx.fillRect(-3, -49, 6, 5);

  // short hair + head
  const hx = 0, hy = -56, hr = 9.4;
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.9, hy, hr * 0.2, hr * 0.36, -0.1, 0, Math.PI * 2);
  ctx.ellipse(hx + hr * 0.9, hy, hr * 0.2, hr * 0.36, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 0.45, hr * 1.0, hr * 0.58, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  npcFace(skin, hx, hy + 0.8, hr, { seed: 5.2, eyeColor: '#4a3a2a', mouthColor: '#8a4a3a', age: true, mouth: 'smile' });

  // short grey beard
  ctx.fillStyle = 'rgba(196,190,178,.92)';
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.72, hy + hr * 0.34);
  ctx.quadraticCurveTo(hx, hy + hr * 1.32, hx + hr * 0.72, hy + hr * 0.34);
  ctx.quadraticCurveTo(hx + hr * 0.4, hy + hr * 0.62, hx, hy + hr * 0.66);
  ctx.quadraticCurveTo(hx - hr * 0.4, hy + hr * 0.62, hx - hr * 0.72, hy + hr * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(120,112,102,.5)';
  ctx.beginPath();
  ctx.ellipse(hx, hy + hr * 0.6, hr * 0.22, hr * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // cap removed: седые волосы на макушке
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 0.5, hr * 1.02, hr * 0.62, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.ellipse(hx - hr * 0.25, hy - hr * 0.86, hr * 0.42, hr * 0.1, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // dust puffs near mop
  ctx.fillStyle = 'rgba(220,205,180,.1)';
  ctx.beginPath();
  ctx.arc(-8 + Math.sin(t * 2) * 2, -2, 3.2, 0, Math.PI * 2);
  ctx.arc(7 + Math.cos(t * 1.5) * 2, -1.5, 2.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

const NPC_CUSTOM_ART = {
  egor: drawEgorNpc,
  klara: drawKlaraNpc,
  vera: drawVeraNpc,
  misha: drawMishaNpc,
  grisha: drawGrishaNpc
};

function drawNpcBubble(n, scale) {
  const bx = n.x + 10 * scale, by = n.y - 68 * scale;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  roundRect(bx + 2, by + 2, 21, 15, 5);
  ctx.fill();
  ctx.fillStyle = PALETTE.parchment;
  roundRect(bx, by, 21, 15, 5);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + 5, by + 14);
  ctx.lineTo(bx + 3, by + 20);
  ctx.lineTo(bx + 11, by + 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.parchmentDark;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(bx + 6 + i * 4.5, by + 7.5, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNpc(n, hot) {
  const customArt = NPC_CUSTOM_ART[n.arc];
  if (customArt) {
    const t = performance.now() / 1000;
    const scale = (n.scale || 1) * NPC_SCALE;
    const bob = Math.sin(t * 2.1 + n.x * 0.05) * 0.8;
    const x = n.x, y = n.y + bob;
    softShadow(n.x + 1, n.y + 3, 16 * scale, 5.4 * scale, 0.34);
    drawGlow('npcglow', 44, [
      [0, 'rgba(255,216,164,.12)'],
      [0.6, 'rgba(255,200,140,.05)'],
      [1, 'rgba(255,200,140,0)']
    ], x, y - 26 * scale, 44 * scale, 40 * scale, 1);
    if (hot) {
      const g = ctx.createRadialGradient(x, y - 28 * scale, 4, x, y - 28 * scale, 44 * scale);
      g.addColorStop(0, 'rgba(224,178,92,.2)');
      g.addColorStop(1, 'rgba(224,178,92,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y - 28 * scale, 44 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    customArt(n, t);
    ctx.restore();
    if (hot) drawNpcBubble(n, scale);
    return;
  }

  const t = performance.now() / 1000;
  const bob = Math.sin(t * 2.1 + n.x * 0.05) * 1.2;
  const scale = (n.scale || 1) * NPC_SCALE;
  const x = n.x, y = n.y + bob;
  const skin = n.skin || '#efc6a0';
  const outfit = n.outfit || '#5a5f6a';
  const trim = n.trim || '#3e434c';

  softShadow(n.x + 1, n.y + 3, 15 * scale, 5 * scale, 0.34);
  drawGlow('npcglow', 44, [
    [0, 'rgba(255,216,164,.12)'],
    [0.6, 'rgba(255,200,140,.05)'],
    [1, 'rgba(255,200,140,0)']
  ], x, y - 24 * scale, 44 * scale, 40 * scale, 1);

  if (hot) {
    const g = ctx.createRadialGradient(x, y - 26 * scale, 4, x, y - 26 * scale, 42 * scale);
    g.addColorStop(0, 'rgba(224,178,92,.20)');
    g.addColorStop(1, 'rgba(224,178,92,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y - 26 * scale, 42 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);


  ctx.fillStyle = '#1b2433';
  roundRect(-7, -10, 5.5, 12, 2); ctx.fill();
  roundRect(1.5, -10, 5.5, 12, 2); ctx.fill();
  ctx.fillStyle = '#241a14';
  ctx.beginPath(); ctx.ellipse(-4, 2.4, 4.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4, 2.4, 4.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = trim;
  roundRect(-15.5, -31, 5.5, 19, 2.5); ctx.fill();
  roundRect(10, -31, 5.5, 19, 2.5); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(-12.8, -12.5, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12.8, -12.5, 3, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = outfit;
  roundRect(-11, -33, 22, 27, 6); ctx.fill();

  ctx.fillStyle = '#f0ead8';
  roundRect(-4.5, -31, 9, 18, 3); ctx.fill();
  ctx.fillStyle = trim;
  roundRect(-6, -33.8, 12, 3.6, 1.6); ctx.fill();
  if (n.scarf) {
    ctx.fillStyle = n.scarf;
    roundRect(-6.8, -34.2, 13.6, 4.2, 2); ctx.fill();
    ctx.save();
    ctx.translate(2.6, -31.5);
    ctx.rotate(-0.04 + Math.sin(t * 1.8 + n.x) * 0.07);
    roundRect(0, 0, 3.8, 11, 1.9); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.fillRect(0.8, 3.5, 1.1, 5.5);
    ctx.restore();
  } else {
    ctx.fillStyle = trim;
    ctx.beginPath(); ctx.arc(0, -24, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -19, 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6.5, -28); ctx.lineTo(-7.6, -8);
  ctx.moveTo(6.5, -28); ctx.lineTo(7.6, -8);
  ctx.stroke();

  if (n.room === 'buffet') {
    ctx.fillStyle = '#f0e2c8';
    ctx.beginPath();
    ctx.moveTo(-7.5, -27);
    ctx.lineTo(7.5, -27);
    ctx.lineTo(8.5, -9);
    ctx.quadraticCurveTo(0, -6, -8.5, -9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,50,.35)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-6.5, -23); ctx.lineTo(6.5, -23);
    ctx.stroke();
  }
  if (n.room === 'zone_staff' || n.room === 'security') {
    ctx.strokeStyle = '#2e5288';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4.4, -33); ctx.lineTo(0, -25); ctx.lineTo(4.4, -33);
    ctx.stroke();
    ctx.fillStyle = '#f0e2c8';
    ctx.fillRect(-1.7, -24, 3.4, 4.6);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(-1.2, -23.5, 2.4, 0.8);
  }
  ctx.strokeStyle = 'rgba(255,220,160,.13)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10, -31);
  ctx.quadraticCurveTo(-13, -20, -10, -8);
  ctx.stroke();

  drawNpcProp(n, -16, -24);

  drawNpcHead(n, 0, -39.5);
  ctx.restore();

  if (hot) {
    const bx = n.x + 10 * scale, by = n.y - 68 * scale;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    roundRect(bx + 2, by + 2, 21, 15, 5);
    ctx.fill();
    ctx.fillStyle = PALETTE.parchment;
    roundRect(bx, by, 21, 15, 5);
    ctx.fill();
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + 5, by + 14);
    ctx.lineTo(bx + 3, by + 20);
    ctx.lineTo(bx + 11, by + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.parchmentDark;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(bx + 6 + i * 4.5, by + 7.5, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawNpcMarker(n) {
  if (storyLocked || !n.arc) return;
  const a = story[n.arc];
  if (!a) return;
  let mark = '';
  if (a.status === 'available') mark = '!';
  else if (a.status === 'return' || (a.status === 'active' && a.found >= ARCS[n.arc].need)) mark = '?';
  else if (a.status === 'active') mark = '…';
  if (!mark) return;
  const scale = (n.scale || 1) * NPC_SCALE;
  const x = n.x + 19 * scale;
  const y = n.y - 58 * scale;
  const pulse = 0.5 + Math.sin(performance.now() / 220 + n.x) * 0.5;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 2, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = a.status === 'return' ? '#8b2f24' : PALETTE.gold;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,236,190,${0.35 + pulse * 0.45})`;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(x, y, 10 + pulse * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = a.status === 'return' ? '#f6e7cc' : '#2a1a10';
  ctx.font = 'bold 12px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mark, x, y + 0.5);
}

function drawStoryItem(it, hot) {
  const pulse = 0.5 + Math.sin(performance.now() / 260 + it.x) * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.8 + pulse * 0.2;
  drawInteractIcon(it, hot);
  ctx.restore();
  ctx.strokeStyle = `rgba(255,224,160,${0.18 + pulse * 0.25})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(it.x, it.y, 27 + pulse * 5, 0, Math.PI * 2);
  ctx.stroke();

  if (searchTarget === it && searchProgress > 0) {
    const need = it.mode === 'hold' ? 1.1 : 1.5;
    const p = Math.min(1, searchProgress / need);
    ctx.strokeStyle = 'rgba(255,215,140,.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(it.x, it.y, 31, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.stroke();
  }
}

function drawStoryBookBadge(it) {
  const done = storyDoneCount();
  const resolved = storyResolvedCount();
  const ready = storyLocked || resolved === 5;
  const pulse = 0.5 + Math.sin(performance.now() / 260) * 0.5;
  const x = it.x, y = it.y + 30;
  ctx.fillStyle = ready ? 'rgba(139,47,36,.92)' : 'rgba(20,13,10,.9)';
  roundRect(x - 24, y - 10, 48, 20, 6);
  ctx.fill();
  ctx.strokeStyle = ready ? `rgba(255,214,140,${0.45 + pulse * 0.45})` : 'rgba(224,178,92,.38)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = ready ? '#f6e7cc' : PALETTE.gold;
  ctx.font = 'bold 10px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(storyLocked ? 'ФИНАЛ' : (ready ? 'ОТКРЫТЬ' : `${done} / 5`), x, y + 0.5);
}

const decor = {
  hall() {
    drawRug(320, 175, 320, 190, '#7e3a28');
    drawChandelier(W / 2, H / 2);
    drawShelf(110, 48, 190, 26);
    drawShelf(660, 48, 190, 26);
    drawShelf(110, 466, 190, 26);
    drawShelf(660, 466, 190, 26);
    drawSignpost(205, 322);
    drawSofa(150, 386, 190, 40);
    drawSofa(600, 386, 190, 40);
    drawArmchair(392, 402);
    drawArmchair(548, 402);
    drawBench(300, 86, 120, 26);
    drawBench(540, 86, 120, 26);
    drawPlant(95, 130);
    drawPlant(865, 130);
    drawPlant(95, 300);
    drawPlant(865, 300);
    drawWallClock(365, 58);
    drawFloorLamp(78, 420);
    drawBookStack(835, 345);
  },
  zone_storage() {
    drawShelf(150, 452, 220, 30);
    drawShelf(590, 452, 220, 30);
    drawBox(120, 395, 54, 40);
    drawBox(185, 405, 44, 32);
    drawBox(770, 395, 54, 40);
    drawCart(320, 250);
    drawCart(650, 250);
    drawSignpost(480, 210);
    drawPoster(640, 60, 96, 56, '#8b2f24');
    drawPipes(884, 105, 190);
    drawDryingRack(480, 120);
    drawBookStack(100, 360);
    drawBin(885, 455);
  },
  zone_staff() {
    drawRug(300, 215, 360, 110, '#6e2f26');
    drawBench(300, 350, 180, 30);
    drawArmchair(660, 300);
    drawSignpost(300, 150);
    drawPlant(105, 425);
    drawPlant(855, 115);
    drawPoster(700, 60, 120, 60, '#8b2f24');
    drawCoatRack(112, 120);
    drawNoticeBoard(815, 140, 84, 62);
    drawUmbrellaStand(875, 350);
  },
  security() {
    drawCounter(560, 140, 260, 54);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#2f3841';
      ctx.fillRect(590 + i * 78, 106, 58, 40);
      ctx.fillStyle = '#4a7a8f';
      ctx.fillRect(594 + i * 78, 110, 50, 32);
      ctx.fillStyle = 'rgba(120,190,210,.35)';
      for (let j = 0; j < 3; j++) ctx.fillRect(598 + i * 78, 116 + j * 8, 42 - j * 6, 2);
    }
    drawLockers(140, 120, 3);
    drawKeyBoard(320, 110);
    drawExtinguisher(770, 120);
    drawTable(120, 340, 150, 50);
    drawPoster(140, 430, 110, 56, '#5a6a7a');
    drawPlant(860, 430);
    drawWallClock(490, 58);
    drawNoticeBoard(62, 68, 64, 54);
    drawSideTable(320, 445);
    drawBin(500, 455);
  },
  vestibule() {
    drawRug(170, 265, 250, 140, '#84442c');
    drawLockers(180, 64, 5);
    drawSecretary(742, 54, 0.72);
    drawCounter(640, 70, 160, 44);
    ctx.fillStyle = '#3a2a20';
    roundRect(652, 86, 66, 15, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(224,178,92,.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '9px ' + SERIF;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('СЕКРЕТАРЬ', 685, 93.5);
    ctx.fillStyle = '#e8d5ae';
    ctx.beginPath();
    ctx.ellipse(727, 107, 7, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3e3c2';
    roundRect(722, 99, 10, 7, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(243,227,194,.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(725, 97);
    ctx.quadraticCurveTo(723, 93, 726, 90);
    ctx.moveTo(729, 97);
    ctx.quadraticCurveTo(727, 93, 730, 90);
    ctx.stroke();
    ctx.fillStyle = '#f3e3c2';
    ctx.fillRect(744, 78, 38, 24);
    ctx.strokeStyle = 'rgba(90,60,40,.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(748, 84 + i * 5);
      ctx.lineTo(777 - i * 5, 84 + i * 5);
      ctx.stroke();
    }
    drawCounter(140, 160, 150, 44);
    ctx.fillStyle = '#f3e3c2';
    ctx.fillRect(170, 150, 30, 13);
    ctx.fillStyle = 'rgba(90,60,40,.4)';
    for (let i = 0; i < 3; i++) ctx.fillRect(174, 153 + i * 3, 22 - i * 4, 1);
    ctx.fillStyle = PALETTE.brass;
    ctx.beginPath();
    ctx.arc(252, 154, 6, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b3a22';
    ctx.fillRect(249, 154, 6, 3);
    drawLectern(512, 112);
    drawTurnstile(770, 300);
    drawBench(300, 430, 180, 34);
    drawPlant(400, 120);
    drawPlant(870, 430);
    drawPoster(540, 70, 90, 60, '#7a3a2a');
    drawMirror(70, 60, 74, 100);
    drawCoatRack(110, 400);
    drawUmbrellaStand(888, 190);
  },
  abonement() {
    drawShelf(260, 120, 180, 34);
    drawShelf(520, 120, 180, 34);
    drawShelf(260, 220, 180, 34);
    drawShelf(520, 220, 180, 34);
    drawShelf(260, 320, 180, 34);
    drawShelf(520, 320, 180, 34);
    drawCounter(340, 400, 220, 46);
    drawCart(280, 360);
    drawBox(760, 390, 56, 42);
    drawArmchair(640, 445);
    drawPlant(110, 120);
    drawPlant(855, 425);
    drawWallClock(480, 58);
    drawSideTable(120, 250);
    drawBookStack(780, 180);
    drawBin(870, 330);
  },
  zone_reading() {
    drawCardCatalog(150, 60, 120, 70);
    drawCardCatalog(690, 60, 120, 70);
    drawTable(420, 150, 120, 50);
    drawChair(450, 205);
    drawChair(510, 205);
    drawArmchair(200, 390);
    drawArmchair(720, 390);
    drawCooler(160, 330);
    drawPoster(560, 450, 110, 50, '#5a7a3a');
    drawPlant(855, 430);
    drawWindow(430, 50, 110, 66);
    drawFloorLamp(82, 220);
    drawBookStack(830, 220);
  },
  hall_universal() {
    drawShelf(250, 48, 200, 30);
    drawShelf(510, 48, 200, 30);
    drawShelf(250, 462, 200, 30);
    drawShelf(510, 462, 200, 30);
    drawCardCatalog(120, 330, 90, 110);
    drawTable(340, 200, 280, 60);
    drawChair(380, 285);
    drawChair(480, 285);
    drawChair(580, 285);
    drawChair(380, 175);
    drawChair(480, 175);
    drawChair(580, 175);
    drawIndexPlate(350, 70, 'А–К');
    drawIndexPlate(610, 70, 'Л–Я');
    drawPlant(850, 270);
    drawWallClock(480, 58);
    drawFloorLamp(82, 220);
    drawBin(870, 440);
  },
  hall_periodics() {
    drawTable(330, 130, 140, 50);
    drawTable(540, 130, 140, 50);
    drawTable(330, 330, 140, 50);
    drawTable(540, 330, 140, 50);
    ctx.fillStyle = '#e8d5ae';
    ctx.fillRect(345, 140, 55, 32);
    ctx.fillRect(555, 140, 55, 32);
    ctx.fillRect(345, 340, 55, 32);
    ctx.fillRect(555, 340, 55, 32);
    ctx.fillStyle = '#9a9aa6';
    for (const [px, py] of [[345, 140], [555, 140], [345, 340], [555, 340]]) {
      for (let i = 0; i < 3; i++) ctx.fillRect(px + 5, py + 6 + i * 8, 45 - i * 8, 3);
    }
    drawShelf(820, 48, 70, 200);
    drawPlant(110, 270);
    drawNoticeBoard(112, 60, 108, 66);
    drawFloorLamp(876, 350);
    drawBookStack(130, 430);
  },
  multifunc() {
    drawScreen(560, 48, 260, 120);
    drawWhiteboard(150, 60, 200, 90);
    drawLectern(430, 200);
    const xs = [230, 320, 410, 500, 590];
    for (const y of [300, 350, 400]) for (const x of xs) drawChair(x, y);
    drawPlant(110, 430);
    drawPlant(855, 430);
    drawWallClock(480, 58);
    drawFloorLamp(82, 200);
    drawBookStack(850, 205);
  },
  computer_class() {
    drawTable(350, 130, 190, 55);
    drawTable(350, 280, 190, 55);
    drawTable(610, 130, 190, 55);
    drawTable(610, 280, 190, 55);
    for (const [x, y] of [[400, 145], [480, 145], [400, 295], [480, 295], [660, 145], [740, 145], [660, 295], [740, 295]]) drawPC(x, y);
    drawBox(760, 400, 60, 46);
    drawPoster(660, 60, 120, 56, '#7a3a2a');
    drawPlant(110, 430);
    drawServerRack(850, 80);
    drawWallClock(200, 58);
    drawCoatRack(112, 180);
    drawBin(860, 450);
  },
  fund_main() {
    drawShelf(240, 110, 34, 320);
    drawShelf(420, 110, 34, 320);
    drawShelf(600, 110, 34, 320);
    drawShelf(780, 110, 34, 320);
    drawLadder(340, 300);
    drawCart(680, 250);
    drawBox(110, 440, 50, 38);
    drawIndexPlate(257, 92, 'А–Д');
    drawIndexPlate(437, 92, 'Е–Л');
    drawIndexPlate(617, 92, 'М–Р');
    drawIndexPlate(797, 92, 'С–Я');
    drawPoster(660, 60, 110, 46, '#c98a3a');
    drawPipes(884, 155, 185);
    drawWallClock(120, 58);
    drawBin(870, 460);
  },
  archive() {
    drawShelf(300, 48, 240, 30);
    drawShelf(600, 48, 240, 30);
    drawShelf(300, 462, 240, 30);
    drawShelf(600, 462, 240, 30);
    drawBox(350, 200, 60, 46);
    drawBox(430, 212, 48, 34);
    drawBox(560, 200, 60, 46);
    drawSafe(760, 380);
    drawTable(180, 330, 140, 50);
    drawPlant(860, 130);
    drawPoster(140, 60, 100, 56, '#8b2f24');
    drawFloorLamp(876, 300);
    drawBookStack(460, 350);
    drawWallClock(268, 58);
  },
  admin() {
    drawCounter(620, 130, 170, 60);
    drawChair(700, 215);
    drawCounter(620, 330, 170, 60);
    drawChair(700, 415);
    drawShelf(300, 48, 180, 30);
    drawCardCatalog(450, 80, 120, 70);
    drawSafe(250, 300);
    drawCooler(160, 150);
    drawPlant(110, 430);
    drawPoster(150, 60, 110, 56, '#5a7a3a');
    drawTable(330, 220, 140, 55);
    drawChair(400, 300);
    drawWallClock(540, 58);
    drawCoatRack(870, 180);
    drawUmbrellaStand(870, 430);
  },
  departments() {
    drawTable(340, 140, 180, 55);
    drawTable(340, 320, 180, 55);
    drawTable(600, 140, 180, 55);
    drawTable(600, 320, 180, 55);
    for (const [x, y] of [[400, 155], [660, 155], [400, 335], [660, 335]]) drawPC(x, y);
    drawCart(500, 245);
    drawCardCatalog(120, 330, 100, 110);
    drawShelf(830, 48, 60, 210);
    drawPlant(110, 430);
    drawPipes(880, 275, 150);
    drawNoticeBoard(270, 60, 104, 62);
    drawBin(280, 450);
  },
  workshops() {
    drawCounter(350, 200, 300, 62);
    drawPress(250, 140);
    drawRolls(700, 300);
    drawBox(400, 330, 55, 42);
    drawBox(470, 340, 44, 32);
    drawShelf(600, 462, 240, 30);
    ctx.fillStyle = '#c98a3a';
    ctx.fillRect(380, 215, 40, 6);
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(440, 212, 7, 30);
    ctx.fillRect(460, 212, 7, 30);
    drawPlant(110, 430);
    drawPoster(660, 60, 110, 56, '#a85030');
    drawDryingRack(862, 180);
    drawPipes(118, 70, 180);
    drawBin(280, 430);
  },
  toilets() {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#8fb8cc';
      ctx.fillRect(300 + i * 90, 50, 64, 14);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(304 + i * 90, 53, 22, 8);
    }
    drawSink(320, 90);
    drawSink(410, 90);
    drawSink(500, 90);
    drawCubicle(650, 300, 120, 150);
    drawCubicle(790, 300, 110, 150);
    drawPlant(110, 130);
    drawMirror(82, 195, 72, 100);
    drawNoticeBoard(180, 60, 94, 56);
    drawBin(600, 200);
  },
  buffet() {
    drawCounter(600, 90, 260, 50);
    drawDisplay(600, 150, 260, 54);
    drawFridge(140, 90, 70, 90);
    drawTable(300, 320, 150, 55);
    drawTable(520, 390, 150, 55);
    drawChair(340, 395);
    drawChair(560, 465);
    ctx.fillStyle = '#4b515a';
    ctx.fillRect(760, 68, 34, 22);
    ctx.fillStyle = '#7fc4e8';
    ctx.fillRect(764, 72, 26, 8);
    ctx.fillStyle = '#e8d5ae';
    ctx.fillRect(640, 70, 60, 16);
    ctx.fillStyle = '#6f5136';
    ctx.fillRect(740, 60, 40, 30);
    drawPoster(340, 60, 120, 60, '#a85030');
    drawPlant(110, 430);
    drawWallClock(520, 58);
    drawFloorLamp(880, 330);
    drawBin(870, 470);
  },
  climate() {
    drawMeterPanel(180, 80, 150, 70);
    drawCylinders(430, 300);
    ctx.fillStyle = '#4a5560';
    ctx.fillRect(600, 180, 220, 150);
    ctx.fillStyle = '#5a6673';
    ctx.fillRect(612, 192, 196, 126);
    ctx.strokeStyle = '#2f3841';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(710, 255, 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(710, 215); ctx.lineTo(745, 275);
    ctx.moveTo(710, 295); ctx.lineTo(675, 235);
    ctx.stroke();
    ctx.fillStyle = '#c98a3a';
    for (let i = 0; i < 6; i++) ctx.fillRect(600 + i * 38, 340, 20, 10);
    addObs(600, 180, 220, 150);
    drawPoster(340, 60, 130, 60, '#c98a3a');
    drawBox(350, 380, 60, 46);
    drawPipes(116, 170, 240);
    drawWallClock(520, 58);
    drawBin(870, 440);
  }
};

function drawDoor(d, r, hot, locked) {
  ctx.fillStyle = PALETTE.frame;
  ctx.fillRect(r.x - 3, r.y - 3, r.w + 6, r.h + 6);

  ctx.fillStyle = locked ? PALETTE.doorLocked : (hot ? PALETTE.doorHot : PALETTE.door);
  ctx.fillRect(r.x, r.y, r.w, r.h);

  const vert = r.h > r.w;
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.lineWidth = 1;
  if (vert) {
    ctx.strokeRect(r.x + 3.5, r.y + 6.5, r.w - 7, r.h - 13);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(r.x + r.w - 6, r.y + r.h / 2 - 3, 3, 6);
  } else {
    ctx.strokeRect(r.x + 6.5, r.y + 3.5, r.w - 13, r.h - 7);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(r.x + r.w / 2 - 3, r.y + r.h - 6, 6, 3);
  }

  if (locked) drawLock(r.x + r.w / 2, r.y + r.h / 2);
}

function drawDoorLabel(d, r, hot, locked) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const label = doorLabel(d);
  ctx.font = '13px ' + SERIF;
  const tw = ctx.measureText(label).width;
  const px = tw / 2 + 10;
  const py = 11;

  let lx = cx, ly = cy;
  if (d.side === 'top' || d.side === 'bottom') ly = cy - 34;
  else if (d.side === 'left') { lx = cx + 66; ly = cy - 30; }
  else { lx = cx - 66; ly = cy - 30; }

  ctx.fillStyle = 'rgba(0,0,0,.35)';
  roundRect(lx - px + 2, ly - py + 3, px * 2, py * 2, 4);
  ctx.fill();
  ctx.fillStyle = hot ? '#f2dfb0' : PALETTE.parchment;
  roundRect(lx - px, ly - py, px * 2, py * 2, 4);
  ctx.fill();
  ctx.strokeStyle = locked ? PALETTE.wine : PALETTE.brass;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = locked ? PALETTE.wine : PALETTE.parchmentDark;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, lx, ly + 1);

  if (locked) {
    drawLock(d.side === 'right' ? lx - px - 12 : lx + px + 12, ly);
    ctx.fillStyle = PALETTE.wine;
    ctx.font = '11px ' + SERIF;
    const note = 'нужен пропуск';
    const nw = ctx.measureText(note).width / 2 + 8;
    const ny = d.side === 'bottom' ? ly - 24 : ly + 22;
    const nx = lx;
    ctx.fillStyle = PALETTE.wine;
    roundRect(nx - nw, ny - 9, nw * 2, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#f0e2c8';
    ctx.fillText(note, nx, ny + 1);
  }
}

const FLOOR_STYLE = {
  hall: 'parquet', vestibule: 'stone', zone_reading: 'parquet',
  abonement: 'parquet', hall_universal: 'parquet', hall_periodics: 'parquet',
  multifunc: 'carpet', computer_class: 'tiles', zone_storage: 'tiles',
  fund_main: 'tiles', archive: 'stone', workshops: 'tiles', climate: 'tiles',
  zone_staff: 'parquet', admin: 'parquet', departments: 'parquet',
  security: 'tiles', toilets: 'tiles', buffet: 'tiles'
};

const FLOOR_TONES = {
  tiles: {
    computer_class: ['#4b4a44', '#45443e'],
    zone_storage: ['#4a4038', '#443a33'],
    fund_main: ['#474036', '#413a31'],
    workshops: ['#4e4438', '#483e33'],
    climate: ['#465153', '#404a4c'],
    security: ['#454b4e', '#3f4548'],
    toilets: ['#465255', '#404c4f'],
    buffet: ['#5b493b', '#554336']
  },
  stone: {
    vestibule: ['#6b5343', '#644d3e'],
    archive: ['#4c3b30', '#46352a']
  }
};

const ROOM_BG_CACHE = new Map();
const ROOM_BG_MAX = 4;
const BG_SS = 2;

function buildRoomBackground(id) {
  const c = document.createElement('canvas');
  c.width = W * BG_SS;
  c.height = H * BG_SS;
  const g = c.getContext('2d');
  g.setTransform(BG_SS, 0, 0, BG_SS, 0, 0);
  const real = ctx;
  ctx = g;
  try {
    const rx = MARGIN, ry = MARGIN, rw = W - MARGIN * 2, rh = H - MARGIN * 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();
    ctx.fillStyle = floors[id] || '#6b4633';
    ctx.fillRect(rx, ry, rw, rh);

    const style = FLOOR_STYLE[id] || 'parquet';
    if (style === 'parquet') {
      drawParquet();
    } else if (style === 'tiles') {
      const tone = (FLOOR_TONES.tiles[id] || ['#4a4038', '#443a33']);
      drawFloorTiles(rx, ry, rw, rh, 48, tone[0], tone[1], 'rgba(20,14,10,.35)');
    } else if (style === 'stone') {
      const tone = (FLOOR_TONES.stone[id] || ['#544334', '#4e3d2f']);
      drawFloorTiles(rx, ry, rw, rh, 92, tone[0], tone[1], 'rgba(18,12,9,.45)');
      ctx.fillStyle = 'rgba(255,236,200,.03)';
      for (let i = 0; i < 3; i++) ctx.fillRect(rx, ry + rh / 3 * (i + 1) - 1, rw, 1);
    } else {
      const base = floors[id] || '#6b4633';
      const weave = ctx.createLinearGradient(0, ry, 0, ry + rh);
      weave.addColorStop(0, 'rgba(255,224,182,.06)');
      weave.addColorStop(0.5, 'rgba(0,0,0,.02)');
      weave.addColorStop(1, 'rgba(0,0,0,.14)');
      ctx.fillStyle = weave;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.fillStyle = 'rgba(0,0,0,.10)';
      for (let y = ry + 6; y < ry + rh; y += 9) ctx.fillRect(rx, y, rw, 1);
      ctx.fillStyle = 'rgba(255,232,196,.035)';
      for (let x = rx + 6; x < rx + rw; x += 12) ctx.fillRect(x, ry, 1, rh);
      ctx.fillStyle = base;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(rx, ry, rw, rh);
      ctx.globalAlpha = 1;
    }

    drawRoomDepth();
    ctx.restore();
  } finally {
    ctx = real;
  }
  return c;
}

function roomBackground(id) {
  const hit = ROOM_BG_CACHE.get(id);
  if (hit) {
    ROOM_BG_CACHE.delete(id);
    ROOM_BG_CACHE.set(id, hit);
    return hit;
  }
  const built = buildRoomBackground(id);
  ROOM_BG_CACHE.set(id, built);
  if (ROOM_BG_CACHE.size > ROOM_BG_MAX) {
    const oldest = ROOM_BG_CACHE.keys().next().value;
    ROOM_BG_CACHE.delete(oldest);
  }
  return built;
}

const GLOW_SPRITES = {};

function glowSprite(key, radius, stops) {
  if (GLOW_SPRITES[key]) return GLOW_SPRITES[key];
  const ss = 2;
  const c = document.createElement('canvas');
  c.width = Math.ceil(radius * 2 * ss);
  c.height = Math.ceil(radius * 2 * ss);
  const g = c.getContext('2d');
  g.setTransform(ss, 0, 0, ss, 0, 0);
  const rg = g.createRadialGradient(radius, radius, radius * 0.05, radius, radius, radius);
  for (const [pos, color] of stops) rg.addColorStop(pos, color);
  g.fillStyle = rg;
  g.beginPath();
  g.arc(radius, radius, radius, 0, Math.PI * 2);
  g.fill();
  GLOW_SPRITES[key] = c;
  return c;
}

function drawGlow(key, radius, stops, cx, cy, rx, ry, alpha) {
  const sp = glowSprite(key, radius, stops);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(sp, cx - rx, cy - ry, rx * 2, ry * 2);
  ctx.restore();
}

function draw() {
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  ctx.clearRect(0, 0, W, H);

  drawWall();
  drawWallFrames(currentRoom);

  ctx.save();
  ctx.beginPath();
  ctx.rect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);
  ctx.clip();

  ctx.fillStyle = floors[currentRoom] || '#6b4633';
  ctx.fillRect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);
  ctx.drawImage(roomBackground(currentRoom), 0, 0, W, H);

  if (decor[currentRoom]) {
    obstacles = [];
    decor[currentRoom]();
  }

  const hotObj = nearInteract();
  const hotStory = nearStoryItem();
  for (const n of npcs) {
    if (n.room === currentRoom) {
      drawNpc(n, n.chat === hotObj);
      if (!storyLocked) drawNpcMarker(n);
    }
  }
  for (const it of interactables) {
    if (it.room === currentRoom && it.icon !== 'npc') {
      drawInteractIcon(it, it === hotObj);
      if (it.id === 'final_book') drawStoryBookBadge(it);
    }
  }
  for (const it of storyItems) {
    const a = story[it.arc];
    if (!storyLocked && !it.found && a && a.status === 'active' && it.room === currentRoom) {
      drawStoryItem(it, it === hotStory);
    }
  }

  drawLampPools();
  drawLamps();

  ctx.restore();

  drawAtmosphere();

  const room = rooms[currentRoom];
  const door = nearDoor();

  ctx.fillStyle = 'rgba(23,15,12,.85)';
  ctx.fillRect(0, 0, W, MARGIN - 6);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(0, MARGIN - 8, W, 2);

  for (const d of room.doors) {
    const r = doorRect(d);
    drawDoor(d, r, d === door, isLocked(d));
  }

  for (const it of items) {
    if (it.room === currentRoom) drawPass(it.x, it.y);
  }

  drawCat(player);

  if (door) drawDoorLabel(door, doorRect(door), true, isLocked(door));

  ctx.font = 'bold 13px ' + SERIF;
  const nameW = Math.min(250, ctx.measureText(room.name).width + 24);
  const nameX = UI.tasks.x + UI.tasks.w + 8;
  ctx.fillStyle = 'rgba(23,15,12,.9)';
  roundRect(nameX, 4, nameW, 22, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,178,92,.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  fitText(room.name, nameX + 11, 15, nameW - 22, 13);

  const item = nearItem();
  const storyItem = nearStoryItem();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '15px ' + SERIF;

  if (toast && performance.now() < toastUntil) {
    ctx.fillStyle = PALETTE.gold;
    wrapText(toast, W / 2, H - 22, 640, 16, 2);
  } else if (item) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText('Клик — забрать пропуск у секретаря (мини-игра)', W / 2, H - 20);
  } else if (storyItem) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(storySearchHint(storyItem), W / 2, H - 20);
  } else if (hotObj) {
    ctx.fillStyle = PALETTE.gold;
    const hintVerb = hotObj.icon === 'npc' ? 'поговорить' : (hotObj.icon === 'book' ? 'прочитать' : 'осмотреть');
    ctx.fillText(`Клик — ${hintVerb}: ${hotObj.title}`, W / 2, H - 20);
  } else if (door) {
    ctx.fillStyle = isLocked(door) ? '#e08080' : PALETTE.gold;
    ctx.fillText(isLocked(door) ? 'Закрыто — нужен пропуск сотрудника' : `Клик — войти: ${rooms[door.to].name}`, W / 2, H - 20);
  } else if (storyLocked) {
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('История завершена. Можно исследовать библиотеку или начать заново.', W / 2, H - 20);
  } else {
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('WASD — движение, подойди к двери и кликни', W / 2, H - 20);
  }

  drawCornerButton(UI.tasks, inRect(UI.tasks, mouseX, mouseY), iconTasks);
  drawCornerButton(UI.map, inRect(UI.map, mouseX, mouseY), drawMapGlyph);
  drawCornerButton(UI.exit, inRect(UI.exit, mouseX, mouseY), iconExit);
  if (storyLocked) drawRestartButton();

  if (havePass) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(23,15,12,.9)';
    roundRect(UI.map.x - 104, 6, 96, 22, 6);
    ctx.fill();
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '12px ' + SERIF;
    ctx.fillText('Пропуск есть', UI.map.x - 56, 18);
  }

  drawMiniMap();

  if (typeof canvas !== 'undefined' && canvas.style) {
    const mapHot = mapOpen && mapNodeAt(mouseX, mouseY);
    const clickable = ending ? true : (dialog ? true : (mapOpen ? !!mapHot : (taskOpen || quoteCard || door || item || storyItem || hotObj ||
      inRect(UI.tasks, mouseX, mouseY) || inRect(UI.map, mouseX, mouseY) || inRect(UI.exit, mouseX, mouseY) ||
      (storyLocked && inRect(UI.restart, mouseX, mouseY)))));
    canvas.style.cursor = clickable ? 'pointer' : 'default';
  }

  if (mapOpen) drawMap();
  if (taskOpen) drawTaskPanel();
  if (mini.active) drawMiniGame();
  if (quoteCard) drawQuoteCard();
  if (dialog) drawDialog();
  if (ending) drawEnding();
  if (storyTask) drawStoryTask();

  if (fade > 0) {
    const a = Math.min(1, fade * 1.6);
    ctx.fillStyle = `rgba(10,6,4,${(a * 0.94).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    const labelA = Math.max(0, Math.min(1, (a - 0.3) / 0.5));
    if (labelA > 0) {
      ctx.save();
      ctx.globalAlpha = labelA;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 27px ' + SERIF;
      ctx.fillText(rooms[currentRoom].name, W / 2, H / 2 - 14);
      ctx.fillStyle = 'rgba(224,178,92,.5)';
      ctx.fillRect(W / 2 - 44, H / 2 + 10, 88, 1);
      ctx.fillStyle = 'rgba(240,226,200,.82)';
      ctx.font = '13px ' + SERIF;
      if (rooms[currentRoom].sub) wrapText(rooms[currentRoom].sub, W / 2, H / 2 + 38, 520, 15, 2);
      ctx.restore();
    }
  }
}

const MINIMAP = { x: 6, y: H - 132, w: 138, h: 127 };

function inRect(r, mx, my) {
  return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
}

function drawRestartButton() {
  const r = UI.restart;
  const hot = inRect(r, mouseX, mouseY);
  ctx.fillStyle = hot ? 'rgba(70,42,24,.96)' : 'rgba(23,15,12,.9)';
  roundRect(r.x, r.y, r.w, r.h, 6);
  ctx.fill();
  ctx.strokeStyle = hot ? PALETTE.gold : PALETTE.brass;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = hot ? '#fff0cf' : PALETTE.gold;
  ctx.font = 'bold 11px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Начать заново', r.x + r.w / 2, r.y + r.h / 2);
}

function drawCornerButton(r, hot, icon) {
  ctx.fillStyle = hot ? 'rgba(70,42,24,.96)' : 'rgba(23,15,12,.9)';
  roundRect(r.x, r.y, r.w, r.h, 7);
  ctx.fill();
  ctx.strokeStyle = hot ? PALETTE.gold : PALETTE.brass;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  icon(r.x + r.w / 2, r.y + r.h / 2);
}

function iconTasks(cx, cy) {
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(cx - 7.5, cy - 8, 15, 17);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(cx - 4, cy - 10, 8, 3.5);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 3 + i * 5);
    ctx.lineTo(cx + 4, cy - 3 + i * 5);
    ctx.stroke();
  }
}

function iconExit(cx, cy) {
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.strokeRect(cx - 10, cy - 9, 10, 18);
  ctx.beginPath();
  ctx.moveTo(cx + 1, cy);
  ctx.lineTo(cx + 11, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 7, cy - 4);
  ctx.lineTo(cx + 11, cy);
  ctx.lineTo(cx + 7, cy + 4);
  ctx.stroke();
}

function drawLockedPanel() {
  const data = ENDINGS[lockedEndingKey] || ENDINGS.crossroads;
  const w = 620, h = 430;
  const x = W / 2 - w / 2, y = 55;
  ctx.fillStyle = 'rgba(10,6,4,.84)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#241812';
  roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 23px ' + SERIF;
  ctx.fillText('История завершена', W / 2, y + 34);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px ' + SERIF;
  ctx.fillText(`Концовка ${endingNumber(lockedEndingKey)} из ${ENDING_ORDER.length}: «${data.title}»`, W / 2, y + 60);

  ctx.strokeStyle = 'rgba(224,178,92,.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 26, y + 78);
  ctx.lineTo(x + w - 26, y + 78);
  ctx.stroke();

  Object.keys(ARCS).forEach((id, i) => {
    const a = story[id];
    const def = ARCS[id];
    const ry = y + 92 + i * 58;
    ctx.fillStyle = i % 2 ? 'rgba(255,222,175,.035)' : 'rgba(0,0,0,.12)';
    roundRect(x + 22, ry, w - 44, 50, 7);
    ctx.fill();
    ctx.fillStyle = a.status === 'done' ? PALETTE.gold : 'rgba(168,144,120,.4)';
    ctx.fillRect(x + 23, ry + 8, 3, 34);

    ctx.textAlign = 'left';
    ctx.fillStyle = a.status === 'done' ? PALETTE.parchment : 'rgba(232,213,174,.55)';
    ctx.font = 'bold 15px ' + SERIF;
    ctx.fillText(def.name, x + 60, ry + 17);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '11.5px ' + SERIF;
    ctx.fillText(`${def.role} · ${a.status === 'done' ? 'страница собрана' : (a.status === 'refused' ? 'история пропущена' : 'история осталась нерассказанной')}`, x + 60, ry + 36);

    ctx.textAlign = 'right';
    ctx.fillStyle = a.status === 'done' ? PALETTE.gold : 'rgba(168,144,120,.65)';
    ctx.font = 'bold 12px ' + SERIF;
    ctx.fillText(a.status === 'done' ? def.page : (a.status === 'refused' ? 'пропущено' : ''), x + w - 38, ry + 26);
    ctx.textAlign = 'center';
  });

  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 12px ' + SERIF;
  ctx.fillText('Решения зафиксированы. Сюжет больше не изменится.', W / 2, y + h - 42);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '12px ' + SERIF;
  ctx.fillText('Можно исследовать библиотеку. «Начать заново» — слева вверху.', W / 2, y + h - 20);
}

function drawTaskPanel() {
  if (storyLocked) {
    drawLockedPanel();
    return;
  }
  ctx.fillStyle = 'rgba(10,6,4,.84)';
  ctx.fillRect(0, 0, W, H);

  const w = 620, h = 430;
  const x = W / 2 - w / 2, y = 55;
  ctx.fillStyle = '#241812';
  roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 23px ' + SERIF;
  ctx.fillText('Истории библиотеки', W / 2, y + 34);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px ' + SERIF;
  ctx.fillText(`Собрано страниц: ${storyDoneCount()} / 5`, W / 2, y + 60);

  ctx.strokeStyle = 'rgba(224,178,92,.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 26, y + 78);
  ctx.lineTo(x + w - 26, y + 78);
  ctx.stroke();

  const ids = Object.keys(ARCS);
  ids.forEach((id, i) => {
    const a = story[id];
    const def = ARCS[id];
    const ry = y + 92 + i * 58;
    const done = a.status === 'done';
    const refused = a.status === 'refused';
    ctx.fillStyle = i % 2 ? 'rgba(255,222,175,.035)' : 'rgba(0,0,0,.12)';
    roundRect(x + 22, ry, w - 44, 50, 7);
    ctx.fill();

    ctx.fillStyle = done ? PALETTE.gold : (refused ? 'rgba(168,144,120,.28)' : 'rgba(224,178,92,.18)');
    ctx.fillRect(x + 23, ry + 8, 3, 34);

    ctx.fillStyle = done ? PALETTE.gold : (refused ? 'rgba(168,144,120,.55)' : PALETTE.gold);
    ctx.beginPath();
    ctx.arc(x + 45, ry + 25, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#241812';
    ctx.font = 'bold 10px ' + SERIF;
    ctx.fillText(done ? '✓' : (refused ? '—' : '!'), x + 45, ry + 25.5);

    ctx.textAlign = 'left';
    ctx.fillStyle = done ? PALETTE.parchment : (refused ? 'rgba(232,213,174,.55)' : PALETTE.parchment);
    ctx.font = 'bold 15px ' + SERIF;
    ctx.fillText(def.name, x + 60, ry + 17);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '11.5px ' + SERIF;
    ctx.fillText(`${def.role} · ${arcStatusLine(a)}`, x + 60, ry + 36);

    ctx.textAlign = 'right';
    ctx.fillStyle = done ? PALETTE.gold : (refused ? 'rgba(168,144,120,.6)' : PALETTE.gold);
    ctx.font = '11px ' + SERIF;
    const right = done ? def.page : (a.status === 'return' ? 'вернуться' : (a.status === 'active' ? `${a.found}/${def.need}` : ''));
    ctx.fillText(right, x + w - 38, ry + 25);
    ctx.textAlign = 'center';
  });

  ctx.textAlign = 'center';
  const resolved = storyResolvedCount();
  ctx.fillStyle = resolved === 5 ? PALETTE.gold : PALETTE.dim;
  ctx.font = resolved === 5 ? 'bold 13px ' + SERIF : '12px ' + SERIF;
  ctx.fillText(resolved === 5 ? 'Все истории решены. Книга ждёт в главном зале.' : '! — новая история · ? — вернуться · … — идёт поиск', W / 2, y + h - 56);

  ctx.fillStyle = PALETTE.brass;
  ctx.font = '12px ' + SERIF;
  ctx.fillText(`Помог: ${storyDoneCount()} из 5 · осталось: ${5 - storyDoneCount()}`, W / 2, y + h - 36);

  ctx.fillStyle = PALETTE.dim;
  ctx.font = '11.5px ' + SERIF;
  ctx.fillText('Финал зависит от того, кому ты помог и кто подпишет книгу', W / 2, y + h - 18);
}

function dialogOptionRects() {
  if (!dialog) return [];
  const x = 120, y = 412, w = 720, h = 26, gap = 5;
  return dialog.options.map((_, i) => ({ x, y: y + i * (h + gap), w, h }));
}

function drawDialogPortrait(p, bx, by, bs, br) {
  if (!p || !p.complete || !p.naturalWidth) return false;
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,4,.55)';
  roundRect(bx, by, bs, bs, br);
  ctx.fill();
  roundRect(bx, by, bs, bs, br);
  ctx.clip();
  const ar = p.naturalWidth / p.naturalHeight;
  let sx = 0, sy = 0, sw = p.naturalWidth, sh = p.naturalHeight;
  if (ar > 1) {
    sw = p.naturalHeight;
    sx = (p.naturalWidth - sw) / 2;
  } else {
    sh = p.naturalWidth;
    sy = (p.naturalHeight - sh) * 0.16;
  }
  ctx.drawImage(p, sx, sy, sw, sh, bx, by, bs, bs);
  const warm = ctx.createRadialGradient(bx + bs * 0.5, by + bs * 0.36, bs * 0.12, bx + bs * 0.5, by + bs * 0.55, bs * 0.78);
  warm.addColorStop(0, 'rgba(255,196,128,0)');
  warm.addColorStop(0.62, 'rgba(40,24,16,.18)');
  warm.addColorStop(1, 'rgba(26,16,11,.72)');
  ctx.fillStyle = warm;
  ctx.fillRect(bx, by, bs, bs);
  ctx.restore();

  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  roundRect(bx, by, bs, bs, br);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,226,170,.22)';
  ctx.lineWidth = 1;
  roundRect(bx + 3, by + 3, bs - 6, bs - 6, br - 2);
  ctx.stroke();
  return true;
}

function drawDialog() {
  if (!dialog) return;
  ctx.fillStyle = 'rgba(10,6,4,.72)';
  ctx.fillRect(0, 0, W, H);

  const x = 90, y = 250, w = 780, h = 260;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  roundRect(x + 7, y + 9, w, h, 14);
  ctx.fill();
  ctx.fillStyle = '#241812';
  roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(224,178,92,.28)';
  ctx.lineWidth = 1;
  roundRect(x + 10, y + 10, w - 20, h - 20, 9);
  ctx.stroke();

  const hasPortrait = drawDialogPortrait(dialog.portrait, x + 22, y + 50, 108, 10);
  const textX = hasPortrait ? x + 152 : x + 30;
  const textW = hasPortrait ? w - 200 : w - 60;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 19px ' + SERIF;
  ctx.fillText(dialog.speaker || '', x + 30, y + 26);

  ctx.strokeStyle = 'rgba(224,178,92,.28)';
  ctx.beginPath();
  ctx.moveTo(x + 30, y + 44);
  ctx.lineTo(x + w - 30, y + 44);
  ctx.stroke();

  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '14px ' + SERIF;
  wrapText(dialog.text, textX, y + 106, textW, 15, 6);

  const rects = dialogOptionRects();
  rects.forEach((r, i) => {
    const hot = inRect(r, mouseX, mouseY);
    ctx.fillStyle = hot ? 'rgba(224,178,92,.16)' : 'rgba(0,0,0,.24)';
    roundRect(r.x, r.y, r.w, r.h, 6);
    ctx.fill();
    ctx.strokeStyle = hot ? PALETTE.gold : 'rgba(224,178,92,.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = hot ? PALETTE.gold : PALETTE.brass;
    ctx.font = 'bold 11px ' + SERIF;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), r.x + 18, r.y + r.h / 2);
    ctx.textAlign = 'left';
    ctx.fillStyle = hot ? '#fff0cf' : PALETTE.parchment;
    fitText(dialog.options[i].label, r.x + 38, r.y + r.h / 2, r.w - 52, 13);
  });
}

function endingButtons() {
  return {
    restart: { x: W / 2 - 190, y: 414, w: 180, h: 36 },
    back: { x: W / 2 + 10, y: 414, w: 180, h: 36 }
  };
}

function drawEndingButton(r, hot, label, gold) {
  ctx.fillStyle = hot ? 'rgba(224,178,92,.2)' : 'rgba(0,0,0,.28)';
  roundRect(r.x, r.y, r.w, r.h, 8);
  ctx.fill();
  ctx.strokeStyle = hot ? PALETTE.gold : (gold ? PALETTE.brass : 'rgba(224,178,92,.35)');
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = hot ? '#fff0cf' : (gold ? PALETTE.gold : PALETTE.parchment);
  ctx.font = 'bold 12px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
}

const ENDING_ART = {
  open: 'картинки/концовка-открытая.jpg',
  other: 'картинки/концовка-чужой-почерк.jpg',
  crossroads: 'картинки/концовка-перекрёсток.jpg',
  one: 'картинки/концовка-одна-страница.jpg',
  quiet: 'картинки/концовка-тихий-читатель.jpg',
  empty: 'картинки/концовка-пустая-обложка.jpg',
  secret: 'картинки/концовка-восьмая-полка.jpg'
};
const endingArtCache = new Map();

function endingArt(key) {
  const file = ENDING_ART[key];
  if (!file) return null;
  let img = endingArtCache.get(file);
  if (!img) {
    img = new Image();
    img.src = encodeURI(file);
    endingArtCache.set(file, img);
  }
  return img;
}

function drawEndingArt(img, bx, by, bw, bh) {
  if (!img || !img.complete || !img.naturalWidth) return false;
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,4,.5)';
  roundRect(bx, by, bw, bh, 10);
  ctx.fill();
  roundRect(bx, by, bw, bh, 10);
  ctx.clip();
  const ar = img.naturalWidth / img.naturalHeight;
  const tar = bw / bh;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ar > tar) {
    sw = img.naturalHeight * tar;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / tar;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, bx, by, bw, bh);
  const shade = ctx.createLinearGradient(bx, by + bh * 0.5, bx, by + bh);
  shade.addColorStop(0, 'rgba(31,20,16,0)');
  shade.addColorStop(1, 'rgba(31,20,16,.8)');
  ctx.fillStyle = shade;
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();

  ctx.strokeStyle = 'rgba(224,178,92,.45)';
  ctx.lineWidth = 1.5;
  roundRect(bx, by, bw, bh, 10);
  ctx.stroke();
  return true;
}

function drawEnding() {
  if (!ending) return;
  ctx.save();
  ctx.fillStyle = 'rgba(7,4,3,.94)';
  ctx.fillRect(0, 0, W, H);

  const x = 80, y = 38, w = 800, h = 464;
  ctx.fillStyle = '#1f1410';
  roundRect(x, y, w, h, 16);
  ctx.fill();
  const accent = ending.key === 'empty' ? PALETTE.wine : (ending.key === 'open' || ending.key === 'secret' ? PALETTE.gold : PALETTE.brass);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(224,178,92,.18)';
  ctx.lineWidth = 1;
  roundRect(x + 12, y + 12, w - 24, h - 24, 11);
  ctx.stroke();

  const art = endingArt(ending.key);
  const hasArt = drawEndingArt(art, x + 438, y + 84, 328, 252);
  const cx = hasArt ? x + 218 : W / 2;
  const textW = hasArt ? 372 : 650;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = 'bold 11px ' + SERIF;
  const kindLabel = ending.key === 'secret' ? 'СЕКРЕТНАЯ КОНЦОВКА' : 'КОНЦОВКА';
  ctx.fillText(`${kindLabel} ${endingNumber(ending.key)} ИЗ ${ENDING_ORDER.length}`, cx, y + 42);

  ctx.fillStyle = PALETTE.parchment;
  ctx.font = 'bold 28px ' + SERIF;
  fitText(ending.title, cx, y + 84, textW, 28);

  ctx.fillStyle = 'rgba(224,178,92,.35)';
  ctx.fillRect(cx - (hasArt ? 110 : 90), y + 108, hasArt ? 220 : 180, 1);

  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '15px ' + SERIF;
  wrapText(ending.text, cx, hasArt ? y + 226 : y + 236, textW, hasArt ? 19 : 22, hasArt ? 8 : 8);

  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 12px ' + SERIF;
  ctx.fillText('История завершена. Решения зафиксированы.', cx, y + 344);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '11.5px ' + SERIF;
  ctx.fillText('Дальше можно только исследовать библиотеку.', cx, y + 364);

  const buttons = endingButtons();
  drawEndingButton(buttons.restart, inRect(buttons.restart, mouseX, mouseY), 'Начать заново', true);
  drawEndingButton(buttons.back, inRect(buttons.back, mouseX, mouseY), 'Вернуться в библиотеку', false);

  ctx.fillStyle = 'rgba(168,144,120,.6)';
  ctx.font = '11px ' + SERIF;
  ctx.fillText('Клик по кнопке · Esc или пробел — в библиотеку', W / 2, y + h - 20);
  ctx.restore();
}

const MAP_LABELS = {
  abonement: 'Абонемент',
  hall_universal: 'Универсальный',
  hall_periodics: 'Периодика',
  multifunc: 'Конференц-зал',
  computer_class: 'Компьютеры',
  fund_main: 'Основной фонд',
  archive: 'Архив',
  workshops: 'Мастерские',
  climate: 'Климат',
  admin: 'Администрация',
  departments: 'Отделы',
  security: 'Охрана',
  buffet: 'Буфет',
  toilets: 'Санузлы'
};

function mapLayout() {
  const nodes = [];
  const add = (id, x, y, w, h, size, label) => nodes.push({
    id, x, y, w, h, size,
    label: label || MAP_LABELS[id] || rooms[id].short,
    accent: ZONE_COLORS[id] || (rooms[id].parent && ZONE_COLORS[rooms[id].parent]) || PALETTE.gold
  });

  add('zone_reading', 262, 88, 184, 38, 13, 'Читательская зона');
  const rkids = mapChildren('zone_reading');
  const rw = 108, rg = 7;
  rkids.forEach((id, i) => add(id, 66 + i * (rw + rg), 134, rw, 32, 10.5));

  add('hall', 270, 214, 180, 52, 15, 'Главный зал');

  add('zone_staff', 50, 196, 178, 38, 13, 'Администрация');
  mapChildren('zone_staff').forEach((id, i) => add(id, 50, 244 + i * 40, 178, 32, 11));

  add('zone_storage', 460, 196, 164, 38, 13, 'Служебный блок');
  mapChildren('zone_storage').forEach((id, i) => add(id, 460, 244 + i * 36, 164, 30, 10.5));

  add('vestibule', 270, 334, 180, 38, 13, 'Вестибюль');
  add('buffet', 206, 384, 118, 28, 10.5);
  add('toilets', 338, 384, 118, 28, 10.5);
  return nodes;
}

function mapNodeAt(mx, my) {
  for (const n of mapLayout()) {
    if (mx >= n.x && mx <= n.x + n.w && my >= n.y && my <= n.y + n.h) return n;
  }
  return null;
}

function mapRoomStats(id) {
  return {
    npcCount: npcs.filter(n => n.room === id).length,
    books: interactables.filter(i => i.room === id && i.icon === 'book').length,
    objects: interactables.filter(i => i.room === id && i.icon !== 'book' && i.icon !== 'npc').length,
    doors: rooms[id].doors.length
  };
}

function mapZoneRoot(id) {
  let c = id;
  while (rooms[c].parent) c = rooms[c].parent;
  return rooms[c].name;
}

function drawMapConnections(nodes, alpha, width) {
  const byId = {};
  for (const n of nodes) byId[n.id] = n;
  for (const n of nodes) {
    const p = byId[rooms[n.id].parent];
    if (!p) continue;
    const pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
    const ncx = n.x + n.w / 2, ncy = n.y + n.h / 2;
    let sx, sy, ex, ey;
    if (n.y >= p.y + p.h) {
      sx = pcx; sy = p.y + p.h; ex = ncx; ey = n.y;
    } else if (n.y + n.h <= p.y) {
      sx = pcx; sy = p.y; ex = ncx; ey = n.y + n.h;
    } else if (p.x > n.x + n.w) {
      sx = p.x; sy = pcy; ex = n.x + n.w; ey = ncy;
    } else {
      sx = p.x + p.w; sy = pcy; ex = n.x; ey = ncy;
    }
    ctx.strokeStyle = `rgba(224,178,92,${alpha})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    if (Math.abs(sx - ex) < 2 || Math.abs(sy - ey) < 2) {
      ctx.lineTo(ex, ey);
    } else {
      const mx = (sx + ex) / 2;
      ctx.lineTo(mx, sy);
      ctx.lineTo(mx, ey);
      ctx.lineTo(ex, ey);
    }
    ctx.stroke();
  }
}

function drawMapIcon(id, x, y, c) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  if (id === 'zone_reading' || id === 'abonement') {
    ctx.beginPath();
    ctx.moveTo(-5, -4); ctx.lineTo(-5, 4); ctx.lineTo(0, 2.5);
    ctx.lineTo(5, 4); ctx.lineTo(5, -4); ctx.lineTo(0, -2.5);
    ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(0, 2.5); ctx.stroke();
  } else if (id === 'hall') {
    ctx.strokeRect(-5.5, -5, 11, 10);
    ctx.beginPath();
    for (let i = -3; i <= 3; i += 3) { ctx.moveTo(i, -5); ctx.lineTo(i, 5); }
    ctx.stroke();
  } else if (id === 'zone_staff' || id === 'security') {
    ctx.beginPath(); ctx.arc(-2, -1, 2.4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0.5); ctx.lineTo(5, 5); ctx.lineTo(5, 2.5); ctx.stroke();
  } else if (id === 'vestibule') {
    ctx.strokeRect(-4, -5, 8, 10);
    ctx.beginPath(); ctx.arc(2, 0, 1, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'zone_storage' || id === 'fund_main') {
    ctx.strokeRect(-5, -5, 10, 10);
    ctx.beginPath();
    ctx.moveTo(-5, -1); ctx.lineTo(5, -1);
    ctx.moveTo(-5, 2); ctx.lineTo(5, 2);
    ctx.stroke();
  } else if (id === 'hall_universal') {
    ctx.beginPath(); ctx.arc(0, 0, 4.8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 2, 4.8, 0, 0, Math.PI * 2);
    ctx.moveTo(-4.8, 0); ctx.lineTo(4.8, 0);
    ctx.stroke();
  } else if (id === 'hall_periodics') {
    ctx.strokeRect(-5, -4, 10, 8);
    ctx.beginPath();
    for (let i = -2; i <= 2; i += 2) { ctx.moveTo(-3, i); ctx.lineTo(3, i); }
    ctx.stroke();
  } else if (id === 'multifunc') {
    ctx.strokeRect(-5.5, -4, 11, 7);
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, 5); ctx.moveTo(-3, 5); ctx.lineTo(3, 5); ctx.stroke();
  } else if (id === 'computer_class' || id === 'departments') {
    ctx.strokeRect(-5, -4, 10, 7);
    ctx.beginPath(); ctx.moveTo(-2, 5); ctx.lineTo(2, 5); ctx.stroke();
  } else if (id === 'archive') {
    ctx.beginPath(); ctx.arc(0, -3, 2.5, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(-2.5, -3, 5, 8);
  } else if (id === 'workshops') {
    ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.moveTo(Math.cos(a) * 3.2, Math.sin(a) * 3.2);
      ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
    }
    ctx.stroke();
  } else if (id === 'climate') {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI / 3;
      ctx.moveTo(-Math.cos(a) * 5, -Math.sin(a) * 5);
      ctx.lineTo(Math.cos(a) * 5, Math.sin(a) * 5);
    }
    ctx.stroke();
  } else if (id === 'admin') {
    ctx.strokeRect(-5, -2, 10, 7);
    ctx.beginPath(); ctx.arc(0, -2, 2, Math.PI, Math.PI * 2); ctx.stroke();
  } else if (id === 'buffet') {
    ctx.strokeRect(-4, -2, 7, 5);
    ctx.beginPath(); ctx.arc(3.5, 0.5, 2, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(3, 4); ctx.stroke();
  } else if (id === 'toilets') {
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.quadraticCurveTo(5, 1, 0, 5);
    ctx.quadraticCurveTo(-5, 1, 0, -5);
    ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawCompassRose(cx, cy, r) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(224,178,92,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2;
    const len = i % 2 ? r * 0.48 : r * 0.82;
    ctx.fillStyle = i % 2 ? 'rgba(224,178,92,.25)' : 'rgba(224,178,92,.55)';
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.lineTo(Math.cos(a + 0.35) * 4, Math.sin(a + 0.35) * 4);
    ctx.lineTo(Math.cos(a - 0.35) * 4, Math.sin(a - 0.35) * 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 8px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('С', 0, -r - 7);
  ctx.restore();
}

function drawMiniMap() {
  const k = MINIMAP.w / 176;
  ctx.save();
  ctx.translate(MINIMAP.x, MINIMAP.y);
  ctx.scale(k, k);

  ctx.fillStyle = 'rgba(23,15,12,.92)';
  roundRect(0, 0, 176, 162, 7);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px ' + SERIF;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('Карта', 8, 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '12px ' + SERIF;
  ctx.fillText(Object.keys(visited).length + '/' + Object.keys(rooms).length, 168, 12);

  const nodes = mapLayout();
  const minX = Math.min(...nodes.map(n => n.x));
  const maxX = Math.max(...nodes.map(n => n.x + n.w));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxY = Math.max(...nodes.map(n => n.y + n.h));
  const s = Math.min(148 / (maxX - minX), 80 / (maxY - minY));
  const ox = (176 - (maxX - minX) * s) / 2 - minX * s;
  const oy = 33 + (80 - (maxY - minY) * s) / 2 - minY * s;
  const scaled = nodes.map(n => ({
    ...n,
    x: ox + n.x * s,
    y: oy + n.y * s,
    w: n.w * s,
    h: n.h * s
  }));

  drawMapConnections(scaled, 0.14, 0.7);
  for (const n of scaled) {
    const here = n.id === currentRoom;
    const seen = !!visited[n.id];
    ctx.fillStyle = here ? 'rgba(132,84,38,.98)' : (seen ? 'rgba(74,50,34,.94)' : 'rgba(48,33,24,.55)');
    ctx.fillRect(n.x, n.y, Math.max(2, n.w), Math.max(2, n.h));
    ctx.strokeStyle = here ? PALETTE.gold : (seen ? n.accent : 'rgba(224,178,92,.16)');
    ctx.lineWidth = here ? 1.2 : 0.6;
    ctx.strokeRect(n.x + 0.5, n.y + 0.5, Math.max(1, n.w - 1), Math.max(1, n.h - 1));
    if (here) {
      const pulse = 0.55 + Math.sin(performance.now() / 230) * 0.35;
      ctx.fillStyle = `rgba(255,106,77,${pulse.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(n.x + n.w - 2.5, n.y + 2.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '10px ' + SERIF;
  fitText('Сейчас: ' + rooms[currentRoom].short, 88, 149, 158, 10);

  ctx.restore();
}

function drawMapGlyph(cx, cy) {
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 16, cy - 8); ctx.lineTo(cx, cy - 14); ctx.lineTo(cx + 16, cy - 8);
  ctx.lineTo(cx, cy - 2); ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 5); ctx.lineTo(cx - 10, cy + 4); ctx.lineTo(cx, cy + 9);
  ctx.lineTo(cx, cy - 2);
  ctx.moveTo(cx + 10, cy - 5); ctx.lineTo(cx + 10, cy + 4); ctx.lineTo(cx, cy + 9);
  ctx.stroke();
}

function mapChildren(id) {
  const r = rooms[id];
  return r.doors.filter(d => d.to !== r.parent).map(d => d.to);
}

const ZONE_COLORS = {
  zone_reading: '#e0b25c',
  zone_storage: '#7fa8c9',
  zone_staff: '#c96a5a',
  vestibule: '#8fae72'
};

function drawMapNode(n, hot) {
  const here = n.id === currentRoom;
  const seen = !!visited[n.id];
  const { x, y, w, h } = n;
  if (hot) {
    ctx.fillStyle = 'rgba(224,178,92,.12)';
    roundRect(x - 4, y - 4, w + 8, h + 8, 8);
    ctx.fill();
  }
  ctx.fillStyle = here ? 'rgba(82,53,29,.99)' : (hot ? 'rgba(63,41,27,.99)' : (seen ? 'rgba(42,28,21,.98)' : 'rgba(34,24,19,.64)'));
  roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = here ? PALETTE.gold : (hot ? '#f2d699' : (seen ? n.accent : 'rgba(224,178,92,.26)'));
  ctx.lineWidth = here ? 2.4 : (hot ? 2 : 1);
  ctx.stroke();

  ctx.fillStyle = here ? PALETTE.gold : (seen ? n.accent : 'rgba(224,178,92,.2)');
  ctx.fillRect(x + 1, y + 6, 3, h - 12);

  drawMapIcon(n.id, x + 15, y + h / 2, here ? PALETTE.gold : (seen ? n.accent : 'rgba(232,213,174,.42)'));

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = here ? PALETTE.gold : (hot ? '#f4e5c4' : (seen ? PALETTE.parchment : 'rgba(232,213,174,.5)'));
  fitText(n.label, x + 24 + (w - 30) / 2, y + h / 2, w - 38, n.size);

  if (here) {
    const pulse = 0.75 + Math.sin(performance.now() / 220) * 0.25;
    ctx.fillStyle = '#ff6a4d';
    ctx.beginPath();
    ctx.arc(x + w - 8, y + 8, 3 * pulse + 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd9cf';
    ctx.beginPath();
    ctx.arc(x + w - 8, y + 8, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (!havePass && n.id === 'zone_staff') {
    ctx.strokeStyle = PALETTE.wine;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x + w - 9, y + 7.5, 3, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.wine;
    roundRect(x + w - 13, y + 7.5, 8, 6, 1.5);
    ctx.fill();
  }
}

function drawMapInfo(node) {
  const x = 660, y = 72, w = 280, h = 400;
  const here = node.id === currentRoom;
  const seen = !!visited[node.id];
  const stats = mapRoomStats(node.id);
  const inStaff = node.id === 'zone_staff' || rooms[node.id].parent === 'zone_staff';
  const locked = inStaff && !havePass;

  ctx.fillStyle = 'rgba(28,19,15,.9)';
  roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,178,92,.42)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '10px ' + SERIF;
  ctx.fillText('О КОМНАТЕ', x + 16, y + 20);

  ctx.fillStyle = here ? PALETTE.gold : PALETTE.parchment;
  fitText(node.label, x + 16, y + 44, w - 32, 18);

  ctx.fillStyle = PALETTE.dim;
  ctx.font = '10.5px ' + SERIF;
  fitText(mapZoneRoot(node.id), x + 16, y + 64, w - 32, 10);

  const badgeText = here ? 'ВЫ ЗДЕСЬ' : (seen ? 'ПОСЕЩЕНА' : 'НЕ ИССЛЕДОВАНА');
  const badgeCol = here ? PALETTE.gold : (seen ? '#a9bd85' : PALETTE.dim);
  ctx.fillStyle = here ? 'rgba(224,178,92,.16)' : (seen ? 'rgba(125,158,98,.14)' : 'rgba(168,144,120,.1)');
  roundRect(x + 16, y + 79, 118, 20, 5);
  ctx.fill();
  ctx.strokeStyle = badgeCol;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.fillStyle = badgeCol;
  ctx.font = 'bold 9px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, x + 75, y + 89.5);

  ctx.strokeStyle = 'rgba(224,178,92,.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 16, y + 110);
  ctx.lineTo(x + w - 16, y + 110);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(240,226,200,.82)';
  ctx.font = '12px ' + SERIF;
  wrapText(rooms[node.id].sub, x + 16, y + 131, w - 34, 15, 4);

  const rows = [
    ['Персонажи', stats.npcCount],
    ['Книги', stats.books],
    ['Объекты', stats.objects],
    ['Двери', stats.doors]
  ];
  rows.forEach(([label, value], i) => {
    const ry = y + 214 + i * 21;
    ctx.fillStyle = 'rgba(224,178,92,.65)';
    ctx.beginPath();
    ctx.arc(x + 20, ry, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '11.5px ' + SERIF;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 29, ry);
    ctx.fillStyle = PALETTE.parchment;
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px ' + SERIF;
    ctx.fillText(String(value), x + w - 18, ry);
  });

  if (locked) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e08080';
    ctx.font = '11px ' + SERIF;
    ctx.fillText('Доступ: нужен пропуск', x + 16, y + 310);
    ctx.fillStyle = 'rgba(224,128,128,.72)';
    ctx.font = '10px ' + SERIF;
    ctx.fillText('Пропуск выдаёт секретарь', x + 16, y + 326);
  }

  const action = here ? 'Это ваша текущая комната' : (seen ? 'Клик — быстрый переход' : 'Сначала посетите комнату');
  ctx.textAlign = 'left';
  ctx.fillStyle = here ? PALETTE.dim : (seen ? PALETTE.gold : PALETTE.dim);
  ctx.font = seen && !here ? 'bold 11px ' + SERIF : '11px ' + SERIF;
  ctx.fillText(action, x + 16, y + 350);

  const seenCount = Object.keys(visited).length;
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '10px ' + SERIF;
  ctx.fillText(`Исследовано ${seenCount} из ${Object.keys(rooms).length}`, x + 16, y + 376);
  ctx.fillStyle = 'rgba(0,0,0,.38)';
  roundRect(x + 16, y + 385, w - 32, 6, 3);
  ctx.fill();
  const prog = seenCount / Object.keys(rooms).length;
  if (prog > 0) {
    ctx.fillStyle = PALETTE.gold;
    roundRect(x + 16, y + 385, (w - 32) * prog, 6, 3);
    ctx.fill();
  }

}

function drawMap() {
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,4,.94)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#1a110d';
  roundRect(18, 12, W - 36, H - 24, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,178,92,.62)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(224,178,92,.16)';
  ctx.lineWidth = 1;
  roundRect(26, 20, W - 52, H - 40, 12);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 25px ' + SERIF;
  ctx.fillText('Карта библиотеки', 42, 32);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '11.5px ' + SERIF;
  ctx.fillText('19 комнат · схема этажей · наведи на комнату для подробностей', 42, 52);

  const total = Object.keys(rooms).length;
  const seenCount = Object.keys(visited).length;
  ctx.fillStyle = 'rgba(224,178,92,.1)';
  roundRect(724, 18, 196, 32, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,178,92,.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 11px ' + SERIF;
  ctx.textAlign = 'left';
  ctx.fillText(`Исследовано ${seenCount} / ${total}`, 736, 29);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  roundRect(736, 38, 172, 4, 2);
  ctx.fill();
  if (seenCount > 0) {
    ctx.fillStyle = PALETTE.gold;
    roundRect(736, 38, 172 * seenCount / total, 4, 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(28,19,14,.82)';
  roundRect(30, 72, 614, 400, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,178,92,.26)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.rect(32, 74, 610, 396);
  ctx.clip();
  ctx.strokeStyle = 'rgba(224,178,92,.045)';
  ctx.lineWidth = 1;
  for (let gx = 40; gx < 644; gx += 73) {
    ctx.beginPath(); ctx.moveTo(gx, 74); ctx.lineTo(gx, 470); ctx.stroke();
  }
  for (let gy = 78; gy < 470; gy += 61) {
    ctx.beginPath(); ctx.moveTo(32, gy); ctx.lineTo(642, gy); ctx.stroke();
  }
  ctx.restore();

  const nodes = mapLayout();
  const hovered = mapNodeAt(mouseX, mouseY);
  drawMapConnections(nodes, 0.28, 1.4);
  for (const n of nodes) drawMapNode(n, hovered && hovered.id === n.id);

  drawCompassRose(602, 447, 17);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,106,77,.9)';
  ctx.beginPath();
  ctx.arc(46, 446, 3.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '10.5px ' + SERIF;
  ctx.fillText('вы здесь', 55, 446);
  ctx.fillStyle = 'rgba(224,178,92,.75)';
  ctx.fillRect(117, 442, 8, 8);
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('посещено', 132, 446);
  ctx.fillStyle = 'rgba(224,178,92,.22)';
  ctx.fillRect(203, 442, 8, 8);
  ctx.strokeStyle = 'rgba(224,178,92,.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(203.5, 442.5, 7, 7);
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText('не исследовано', 218, 446);

  const focus = hovered || nodes.find(n => n.id === currentRoom);
  drawMapInfo(focus);

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(168,144,120,.8)';
  ctx.font = '11px ' + SERIF;
  ctx.fillText('Клик по посещённой комнате — быстрый переход · M или Esc — закрыть', W / 2, 512);
  ctx.restore();
}

function drawQuoteCard() {
  const q = quoteCard;
  const w = 580, h = 300;
  const x = (W - w) / 2, y = (H - h) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(10,6,4,.72)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(0,0,0,.45)';
  roundRect(x + 7, y + 9, w, h, 14);
  ctx.fill();

  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#f4e7cb');
  g.addColorStop(1, '#dfcba6');
  ctx.fillStyle = g;
  roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(139,47,36,.35)';
  ctx.lineWidth = 1;
  roundRect(x + 10, y + 10, w - 20, h - 20, 10);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#8b2f24';
  roundRect(W / 2 - 12, y + 18, 24, 18, 3);
  ctx.fill();
  ctx.fillStyle = '#e8d5ae';
  ctx.fillRect(W / 2 - 8, y + 22, 16, 10);
  ctx.strokeStyle = '#8b2f24';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2, y + 22);
  ctx.lineTo(W / 2, y + 32);
  ctx.stroke();

  ctx.fillStyle = '#7a5138';
  ctx.font = '10px ' + SERIF;
  ctx.fillText('ЦИТАТА ИЗ КНИГИ', W / 2, y + 45);

  ctx.fillStyle = '#4a2b1c';
  fitText(`«${q.book}»`, W / 2, y + 72, w - 90, 18);

  ctx.strokeStyle = 'rgba(139,47,36,.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 70, y + 90);
  ctx.lineTo(W / 2 + 70, y + 90);
  ctx.stroke();

  ctx.fillStyle = '#3a2418';
  ctx.font = 'italic 20px ' + SERIF;
  wrapText(`«${q.text}»`, W / 2, y + 152, w - 100, 28, 4);

  ctx.fillStyle = '#6b3a22';
  ctx.font = 'bold 15px ' + SERIF;
  ctx.fillText(`— ${q.speaker}`, W / 2, y + 238);

  ctx.fillStyle = '#8a6a48';
  ctx.font = '12px ' + SERIF;
  fitText(`${q.book} · ${q.author}`, W / 2, y + 262, w - 100, 12);

  ctx.fillStyle = 'rgba(90,60,40,.65)';
  ctx.font = '10px ' + SERIF;
  ctx.fillText('Клик или Esc — закрыть', W / 2, y + 284);

  ctx.restore();
}


let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
