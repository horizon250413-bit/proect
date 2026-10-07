const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

const MARGIN = 40;
const PLAYER_R = 12;
const PLAYER_SPEED = 220;
const INTERACT_DIST = 55;
const DOOR_W = 70;
const DOOR_H = 22;

const layout = {
  hall: {
    name: 'Главный зал',
    children: ['zone_service', 'zone_storage', 'zone_staff', 'zone_util']
  },

  zone_service: {
    name: 'Зона обслуживания читателей',
    short: 'Обслуживание читателей',
    sub: 'общественные пространства, открытые для посетителей',
    parent: 'hall',
    children: ['vestibule', 'abonement', 'zone_reading', 'computer_class', 'multifunc']
  },
  zone_storage: {
    name: 'Книгохранилище',
    sub: 'закрытая для посетителей зона хранения фондов',
    parent: 'hall',
    children: ['fund_main', 'archive']
  },
  zone_staff: {
    name: 'Служебно-административные помещения',
    short: 'Служебный блок',
    sub: 'доступ только для сотрудников — нужен пропуск',
    parent: 'hall',
    children: ['admin', 'departments', 'workshops']
  },
  zone_util: {
    name: 'Хозяйственные и инженерно-технические помещения',
    short: 'Хозяйственный блок',
    sub: 'инфраструктура жизнедеятельности здания',
    parent: 'hall',
    children: ['toilets', 'buffet', 'climate']
  },

  vestibule: {
    name: 'Вестибюль',
    sub: 'входная зона, гардероб, бюро записи, камеры хранения, инфо-стойка',
    parent: 'zone_service',
    children: []
  },
  abonement: {
    name: 'Абонемент',
    sub: 'выдача книг на дом, открытый доступ к стеллажам',
    parent: 'zone_service',
    children: []
  },
  zone_reading: {
    name: 'Читальные залы',
    sub: 'тихая работа с книгами и периодикой',
    parent: 'zone_service',
    children: ['hall_universal', 'hall_periodics']
  },
  multifunc: {
    name: 'Конференц-зал',
    sub: 'лекции, выставки и встречи',
    parent: 'zone_service',
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
  computer_class: {
    name: 'Компьютерный класс',
    sub: 'компьютеры, интернет, сканирование документов',
    parent: 'zone_service',
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
  workshops: {
    name: 'Мастерские',
    sub: 'переплёт, реставрация и консервация документов',
    parent: 'zone_staff',
    children: []
  },

  toilets: {
    name: 'Санузлы',
    sub: 'туалеты для сотрудников и посетителей',
    parent: 'zone_util',
    children: []
  },
  buffet: {
    name: 'Буфет',
    sub: 'кофе, чай и перекусы для всех',
    parent: 'zone_util',
    children: []
  },
  climate: {
    name: 'Климат-контроль',
    sub: 'температура и влажность в книгохранилищах',
    parent: 'zone_util',
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

const items = [
  { id: 'pass', room: 'vestibule', x: 730, y: 150, label: 'Пропуск' }
];

const interactables = [
  { room: 'vestibule', x: 230, y: 95, icon: 'guestbook', title: 'Книга посетителей', text: '«Оставьте запись! Сегодня библиотеку посетили 247 человек»' },
  { room: 'vestibule', x: 512, y: 88, icon: 'sign', title: 'Инфо-стойка', text: 'Схема залов на стенде. Спросите библиотекаря — он всё расскажет' },
  { room: 'vestibule', x: 420, y: 440, icon: 'librarian', title: 'Библиотекарь Барс', text: '' },
  { room: 'hall', x: 480, y: 270, icon: 'monument', title: 'Памятник книги', text: '«Книга — источник знаний» — надпись на постаменте. Ей 120 лет' },
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
  { room: 'climate', x: 155, y: 265, icon: 'gauge', title: 'Гигрометр', text: 'Влажность 55%, температура 18°C — идеально для книг' }
];

const storyBooks = [
  {
    id: 'onegin', room: 'hall_periodics', x: 200, y: 430,
    title: 'Евгений Онегин', author: 'Пушкин, 1833', color: '#8b2f24',
    fact: 'Онегин зевает: «Мой дядя самых честных правил, когда не в шутку занемог...» — и ёрзает на полке периодики. Роман в стихах писался 7 лет!'
  },
  {
    id: 'chichikov', room: 'archive', x: 700, y: 350,
    title: 'Чичиков', author: 'Гоголь, «Мёртвые души»', color: '#3f6fb5',
    fact: 'Чичиков шепчет: «Какая неприятность!» — его мёртвые души разлетелись по архиву. Гоголь однажды сжёг второй том — и вот вам результат'
  },
  {
    id: 'harry', room: 'multifunc', x: 400, y: 450,
    title: 'Гарри Поттер', author: 'Роулинг, 1997', color: '#5a7a3a',
    fact: 'Гарри бросает: «Expecto patronum!» — но заклинание работает только в книге. Первый тираж 1997 года — всего 500 экземпляров'
  }
];

let quest = { stage: 0, found: 0 }; // 0 — не начат, 1 — ищем, 2 — вернуть библиотекарю, 3 — конец
let taken = {};
let ending = false;
let visited = { vestibule: true };
let mapOpen = false;
let mouseX = null, mouseY = null;
let endingAt = 0;

const TOAST_MS = 2600;
let toastUntil = 0;

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

function nearBook() {
  for (const b of storyBooks) {
    if (taken[b.id] || b.room !== currentRoom) continue;
    if (Math.hypot(player.x - b.x, player.y - b.y) < 45) return b;
  }
  return null;
}

function isLocked(door) {
  return door.to === 'zone_staff' && !door.back && !havePass;
}

const keys = {};
addEventListener('keydown', e => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'KeyM') mapOpen = !mapOpen;
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) * W / r.width;
  mouseY = (e.clientY - r.top) * H / r.height;
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

canvas.addEventListener('click', e => {
  e = e || {};
  if (mapOpen) { mapOpen = false; return; }

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX != null ? (e.clientX - rect.left) * W / rect.width : -1;
  const my = e.clientY != null ? (e.clientY - rect.top) * H / rect.height : -1;
  if (e.clientX != null && mx >= W - 66 && mx <= W - 8 && my >= 8 && my <= 56) {
    mapOpen = true;
    return;
  }
  if (e.clientX != null && inMiniMap(mx, my)) {
    mapOpen = true;
    return;
  }

  if (ending) { ending = false; return; }

  const item = nearItem();
  if (item) {
    if (item.id === 'pass' && !havePass) {
      havePass = true;
      items.splice(items.indexOf(item), 1);
      showToast('Пропуск получен! Теперь доступен служебный блок');
    }
    return;
  }

  const book = nearBook();
  if (book) {
    if (quest.stage === 0) {
      showToast('Книга дышит и ёрзает в руках! Но сначала спроси Барса в вестибюле — он объяснит, что творится', 4200);
      return;
    }
    if (quest.stage >= 2) return;
    taken[book.id] = true;
    quest.found++;
    if (quest.found >= storyBooks.length) {
      quest.stage = 2;
      showToast(book.fact + ' Все беглецы пойманы! Возвращайся к Барсу в вестибюль', 6000);
    } else {
      showToast(book.fact, 4800);
    }
    return;
  }

  const obj = nearInteract();
  if (obj) {
    if (obj.icon === 'librarian') {
      if (quest.stage === 0) {
        quest.stage = 1;
        showToast('Барс: «Кот! Беда — книги ожили и сбежали со страниц! Онегин устроился в зале периодики, Чичиков — в архиве, Гарри — в конференц-зале. Поймай их!»', 5400);
      } else if (quest.stage === 1) {
        showToast(`Барс: «Поймано ${quest.found} из ${storyBooks.length}. Они не злые — просто любопытные. Ищи: зал периодики, архив, конференц-зал»`, 4800);
      } else if (quest.stage === 2) {
        quest.stage = 3;
        showToast('Барс: «Все трое на местах! Видно, их утомила автономия. Спасибо, кот-хранитель!»', 5200);
        endingAt = performance.now() + 5300;
      } else {
        showToast('Барс: «Сегодня все книги спят. Отдыхай в читальном зале»');
      }
      return;
    }
    showToast(obj.text);
    return;
  }
  const door = nearDoor();
  if (!door) return;
  if (isLocked(door)) {
    showToast('Нужен пропуск сотрудника — возьми его на инфо-стойке');
    return;
  }
  const from = currentRoom;
  currentRoom = door.to;
  visited[currentRoom] = true;
  const entry = rooms[currentRoom].doors.find(d => d.to === from);
  player = { ...spawnAt(entry), moving: false, face: player.face, step: 0 };
});

function doorLabel(door) {
  const target = rooms[door.to];
  return (door.back ? '← ' : '') + target.short;
}

function update(dt) {
  if (endingAt && performance.now() >= endingAt) {
    endingAt = 0;
    ending = true;
  }
  if (ending || mapOpen) return;
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
  player.x = Math.max(minX, Math.min(maxX, player.x));
  player.y = Math.max(minY, Math.min(maxY, player.y));
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

function pathOf(id) {
  const path = [];
  while (id) {
    path.unshift(id);
    id = rooms[id].parent;
  }
  return path;
}

function drawCat(p) {
  const bounce = p.moving ? Math.abs(Math.sin(p.step)) * 3 : 0;
  const x = p.x;
  const y = p.y - bounce;
  const r = PLAYER_R;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p.face, 1);

  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(0, r + bounce + 2, r * 0.9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const tail = Math.sin(p.step * 1.2) * 6;
  ctx.strokeStyle = '#e8944a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, r * 0.4);
  ctx.quadraticCurveTo(-r * 1.9, r * 0.3 + tail, -r * 1.7, -r * 0.6 + tail);
  ctx.stroke();

  ctx.fillStyle = '#f5a556';
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, -r * 0.65, r * 0.42, r * 0.5, -0.3, 0, Math.PI * 2);
  ctx.ellipse(r * 0.55, -r * 0.65, r * 0.42, r * 0.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffc9d6';
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, -r * 0.6, r * 0.2, r * 0.26, -0.3, 0, Math.PI * 2);
  ctx.ellipse(r * 0.55, -r * 0.6, r * 0.2, r * 0.26, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f5a556';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffd9a8';
  ctx.beginPath();
  ctx.ellipse(r * 0.25, r * 0.35, r * 0.55, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  const blink = Math.sin(p.step * 0.35) > 0.97;
  if (blink) {
    ctx.strokeStyle = '#3a2b20';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.1); ctx.lineTo(-r * 0.15, -r * 0.1);
    ctx.moveTo(r * 0.15, -r * 0.1); ctx.lineTo(r * 0.45, -r * 0.1);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#3a2b20';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.1, r * 0.14, r * 0.18, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.3, -r * 0.1, r * 0.14, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.16, r * 0.05, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.16, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255,130,150,.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.6, r * 0.22, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.6, r * 0.22, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e8737f';
  ctx.beginPath();
  ctx.moveTo(-r * 0.09, r * 0.08);
  ctx.lineTo(r * 0.09, r * 0.08);
  ctx.lineTo(0, r * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#3a2b20';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, r * 0.05); ctx.lineTo(-r * 0.45, r * 0.12);
  ctx.moveTo(-r * 0.9, r * 0.25); ctx.lineTo(-r * 0.45, r * 0.22);
  ctx.moveTo(r * 0.45, r * 0.12); ctx.lineTo(r * 0.9, r * 0.05);
  ctx.moveTo(r * 0.45, r * 0.22); ctx.lineTo(r * 0.9, r * 0.25);
  ctx.stroke();

  const leg = p.moving ? Math.sin(p.step) * 3 : 0;
  ctx.fillStyle = '#f5a556';
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, r * 0.85 + leg, r * 0.22, r * 0.18, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 0.4, r * 0.85 - leg, r * 0.22, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
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

function drawStoryBook(b) {
  const glow = 0.5 + Math.sin(performance.now() / 350 + b.x) * 0.5;
  const bob = Math.sin(performance.now() / 260 + b.x) * 2;
  ctx.save();
  ctx.translate(b.x, b.y + bob);

  ctx.fillStyle = `rgba(224,178,92,${0.10 + glow * 0.16})`;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(0, 14 - bob, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(-0.1 + Math.sin(performance.now() / 400 + b.x) * 0.06);
  ctx.fillStyle = b.color;
  ctx.fillRect(-14, -12, 28, 24);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(-14, -12, 5, 24);
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 1;
  ctx.strokeRect(-14, -12, 28, 24);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-5, -5, 3.5, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(5, -5, 3.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1410';
  const look = Math.sin(performance.now() / 500 + b.x) * 1.2;
  ctx.beginPath();
  ctx.arc(-5 + look, -5, 1.8, 0, Math.PI * 2);
  ctx.arc(5 + look, -5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1c1410';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 2, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.strokeStyle = b.color;
  ctx.lineWidth = 2;
  const wig = Math.sin(performance.now() / 180 + b.x) * 3;
  ctx.beginPath();
  ctx.moveTo(-14, 0); ctx.lineTo(-20, 4 + wig);
  ctx.moveTo(14, 0); ctx.lineTo(20, 4 - wig);
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 12px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(b.author, b.x, b.y + bob + 16);
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
  hall: '#6b4633',
  zone_service: '#714a35',
  vestibule: '#7a5138',
  abonement: '#6e4833',
  zone_reading: '#734c37',
  hall_universal: '#76503a',
  hall_periodics: '#76503a',
  multifunc: '#68443a',
  computer_class: '#63443a',
  zone_storage: '#563a2e',
  fund_main: '#4f352a',
  archive: '#4c3329',
  zone_staff: '#5f4234',
  admin: '#654636',
  departments: '#634434',
  workshops: '#614230',
  zone_util: '#594036',
  toilets: '#5d443a',
  buffet: '#6a4936',
  climate: '#554036'
};

const PALETTE = {
  bg: '#170f0c',
  wall: '#3b2018',
  wallLine: '#2a1610',
  wallLight: 'rgba(255,215,170,.05)',
  base: '#2e150d',
  door: '#5e2d1d',
  doorHot: '#7f4224',
  doorLocked: '#3f1412',
  frame: '#38180f',
  brass: '#d4a94e',
  parchment: '#e8d5ae',
  parchmentDark: '#3b2018',
  gold: '#e0b25c',
  wine: '#8b2f24',
  cream: '#f0e2c8',
  dim: '#a89078'
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
      ctx.fillStyle = '#3a3a44';
      ctx.beginPath();
      ctx.ellipse(0, 4, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -8, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-9, -13); ctx.lineTo(-7, -22); ctx.lineTo(-2, -15);
      ctx.moveTo(9, -13); ctx.lineTo(7, -22); ctx.lineTo(2, -15);
      ctx.fill();
      ctx.fillStyle = '#e0b25c';
      ctx.beginPath(); ctx.arc(-4, -9, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -9, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c1410';
      ctx.beginPath(); ctx.arc(-4, -9, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -9, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9c9d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(-4, -9, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(4, -9, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-1, -9); ctx.lineTo(1, -9); ctx.stroke();
      ctx.fillStyle = '#8b2f24';
      ctx.fillRect(-7, 2, 14, 5);
      ctx.fillStyle = '#e8d5ae';
      ctx.beginPath(); ctx.ellipse(10, 6, 7, 5, 0.5, 0, Math.PI * 2); ctx.fill();
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

const dust = Array.from({ length: 40 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: 0.6 + Math.random() * 1.6,
  s: 0.15 + Math.random() * 0.4,
  ph: Math.random() * Math.PI * 2
}));

function drawAtmosphere() {
  ctx.save();
  ctx.beginPath();
  ctx.rect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);
  ctx.clip();

  const t = performance.now() / 1000;

  const grad = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.62);
  grad.addColorStop(0, 'rgba(255,225,170,.10)');
  grad.addColorStop(1, 'rgba(20,8,4,.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);

  for (const p of dust) {
    const dx = p.x + Math.sin(t * p.s + p.ph) * 26;
    const dy = p.y + Math.cos(t * p.s * 0.8 + p.ph) * 18;
    const a = 0.18 + Math.sin(t * 1.4 + p.ph) * 0.12;
    ctx.fillStyle = `rgba(255,236,190,${Math.max(0.03, a)})`;
    ctx.beginPath();
    ctx.arc(dx, dy, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

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
    const flick = 0.85 + Math.sin(t * 2 + i * 1.7) * 0.08 + Math.sin(t * 7.3 + i) * 0.03;
    const g = ctx.createRadialGradient(l.x, l.y, 5, l.x, l.y, 130);
    g.addColorStop(0, `rgba(255,214,150,${0.20 * flick})`);
    g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 130, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2e150d';
    ctx.fillRect(l.x - 14, l.y - 8, 28, 9);
    ctx.fillStyle = PALETTE.brass;
    ctx.fillRect(l.x - 14, l.y - 8, 28, 2);
    ctx.fillStyle = `rgba(255,224,170,${0.75 * flick})`;
    ctx.beginPath();
    ctx.ellipse(l.x, l.y + 2, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function seeded(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const BOOK_COLORS = ['#b5493a', '#3f6fb5', '#5a7a3a', '#c98a3a', '#7a3a5a', '#a85030', '#3f8f8f', '#a3572f'];

function drawShelf(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = '#4a2618';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5e3020';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#33190f';
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
      bx += bw + 1;
      i++;
    }
    ctx.fillStyle = '#7a4526';
    ctx.fillRect(x + 4, ry + rowH - 4, w - 8, 4);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawTable(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 4, y + 5, w, h);
  ctx.fillStyle = '#5a2f1e';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#7a4228';
  ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = '#8f5030';
  ctx.fillRect(x, y, w, 3);
}

function drawChair(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(x - 6, y - 5, 15, 15);
  ctx.fillStyle = '#4e1f1a';
  ctx.fillRect(x - 7, y - 7, 14, 14);
  ctx.fillStyle = '#6e2b22';
  ctx.fillRect(x - 7, y - 7, 14, 5);
}

function drawPlant(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a3d22';
  ctx.fillRect(x - 8, y, 16, 15);
  ctx.fillStyle = '#a85030';
  ctx.fillRect(x - 8, y, 16, 4);
  ctx.fillStyle = '#4a6b34';
  ctx.beginPath();
  ctx.arc(x, y - 6, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5f8440';
  ctx.beginPath();
  ctx.arc(x - 6, y - 13, 8, 0, Math.PI * 2);
  ctx.arc(x + 6, y - 11, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawRug(x, y, w, h, c) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 5, y + 6, w, h);
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.strokeStyle = PALETTE.gold;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 9, y + 9, w - 18, h - 18);
  ctx.globalAlpha = 1;
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
}

function drawBox(x, y, w, h) {
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = '#7a5530';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#8f6638';
  ctx.fillRect(x, y, w, 7);
  ctx.fillStyle = '#5e4020';
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
}

function drawPoster(x, y, w, h, c) {
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = '#1c1410';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(240,226,200,.8)';
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 6, y + 8 + i * 9, w - 12 - i * 12, 3);
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

const decor = {
  hall() {
    drawRug(320, 175, 320, 190, '#7e3a28');
    drawShelf(110, 48, 190, 26);
    drawShelf(660, 48, 190, 26);
    drawShelf(110, 466, 190, 26);
    drawShelf(660, 466, 190, 26);
    drawPlant(95, 130);
    drawPlant(865, 130);
    drawPlant(95, 410);
    drawPlant(865, 410);
  },
  zone_service() {
    drawRug(250, 215, 460, 110, '#75402c');
    drawPlant(105, 115);
    drawPlant(855, 425);
    drawPoster(700, 430, 110, 56, '#7a3a2a');
    drawPoster(150, 430, 110, 56, '#7a3a2a');
  },
  zone_storage() {
    drawShelf(150, 452, 220, 30);
    drawShelf(590, 452, 220, 30);
    drawBox(120, 395, 54, 40);
    drawBox(185, 405, 44, 32);
    drawBox(770, 395, 54, 40);
    drawPoster(640, 60, 96, 56, '#8b2f24');
  },
  zone_staff() {
    drawRug(300, 215, 360, 110, '#6e2f26');
    drawPlant(105, 425);
    drawPlant(855, 115);
    drawPoster(700, 60, 120, 60, '#8b2f24');
  },
  zone_util() {
    drawTiles(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2, 40);
    drawBox(130, 420, 56, 42);
    drawBox(775, 420, 56, 42);
    drawPoster(640, 60, 96, 52, '#c98a3a');
  },
  vestibule() {
    drawRug(120, 230, 340, 180, '#84442c');
    drawCounter(655, 168, 160, 44);
    drawLockers(430, 62, 5);
    drawCounter(140, 70, 170, 44);
    drawPlant(870, 430);
    drawPoster(660, 70, 120, 64, '#7a3a2a');
  },
  abonement() {
    drawShelf(260, 120, 180, 34);
    drawShelf(520, 120, 180, 34);
    drawShelf(260, 320, 180, 34);
    drawShelf(520, 320, 180, 34);
    drawShelf(260, 220, 180, 34);
    drawShelf(520, 220, 180, 34);
    drawPlant(110, 120);
    drawPlant(855, 425);
  },
  zone_reading() {
    drawTable(400, 170, 170, 55);
    drawChair(430, 245);
    drawChair(500, 245);
    drawChair(430, 145);
    drawChair(500, 145);
    drawPlant(855, 430);
    drawPoster(150, 430, 110, 56, '#5a7a3a');
  },
  hall_universal() {
    drawShelf(250, 48, 200, 30);
    drawShelf(510, 48, 200, 30);
    drawShelf(250, 462, 200, 30);
    drawShelf(510, 462, 200, 30);
    drawTable(340, 200, 280, 60);
    drawChair(380, 285);
    drawChair(480, 285);
    drawChair(580, 285);
    drawChair(380, 175);
    drawChair(480, 175);
    drawChair(580, 175);
    drawPlant(110, 270);
    drawPlant(855, 270);
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
  },
  multifunc() {
    drawCounter(680, 75, 180, 46);
    drawPoster(700, 140, 140, 70, '#7a3a5a');
    const xs = [260, 350, 440, 530];
    for (const y of [230, 300, 370]) for (const x of xs) drawChair(x, y);
    drawPlant(110, 130);
    drawPlant(110, 420);
  },
  computer_class() {
    drawTable(350, 130, 190, 55);
    drawTable(350, 280, 190, 55);
    drawTable(610, 130, 190, 55);
    drawTable(610, 280, 190, 55);
    for (const [x, y] of [[400, 145], [480, 145], [400, 295], [480, 295], [660, 145], [740, 145], [660, 295], [740, 295]]) drawPC(x, y);
    drawPoster(660, 60, 120, 56, '#7a3a2a');
    drawPlant(110, 430);
  },
  fund_main() {
    drawShelf(240, 110, 34, 320);
    drawShelf(420, 110, 34, 320);
    drawShelf(600, 110, 34, 320);
    drawShelf(780, 110, 34, 320);
    drawBox(110, 440, 50, 38);
    drawPoster(660, 60, 110, 46, '#c98a3a');
  },
  archive() {
    drawShelf(300, 48, 240, 30);
    drawShelf(600, 48, 240, 30);
    drawShelf(300, 462, 240, 30);
    drawShelf(600, 462, 240, 30);
    drawBox(350, 200, 60, 46);
    drawBox(430, 212, 48, 34);
    drawBox(560, 200, 60, 46);
    drawPlant(860, 270);
    drawPoster(140, 60, 100, 56, '#8b2f24');
  },
  admin() {
    drawCounter(620, 130, 170, 60);
    drawChair(700, 215);
    drawCounter(620, 330, 170, 60);
    drawChair(700, 415);
    drawShelf(300, 48, 180, 30);
    drawPlant(110, 430);
    drawPoster(150, 60, 110, 56, '#5a7a3a');
    drawTable(330, 220, 140, 55);
    drawChair(400, 300);
  },
  departments() {
    drawTable(340, 140, 180, 55);
    drawTable(340, 320, 180, 55);
    drawTable(600, 140, 180, 55);
    drawTable(600, 320, 180, 55);
    for (const [x, y] of [[400, 155], [660, 155], [400, 335], [660, 335]]) drawPC(x, y);
    drawShelf(830, 48, 60, 210);
    drawPlant(110, 130);
  },
  workshops() {
    drawCounter(350, 200, 300, 62);
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
  },
  toilets() {
    drawCounter(300, 60, 300, 40);
    ctx.fillStyle = '#b8d8e0';
    ctx.fillRect(320, 44, 70, 12);
    ctx.fillRect(410, 44, 70, 12);
    ctx.fillRect(500, 44, 70, 12);
    ctx.fillStyle = '#4a2618';
    ctx.fillRect(650, 300, 130, 140);
    ctx.fillRect(800, 300, 100, 140);
    ctx.fillStyle = '#5e3020';
    ctx.fillRect(660, 310, 110, 120);
    ctx.fillRect(810, 310, 80, 120);
    drawPlant(110, 130);
    drawTiles(MARGIN, 380, W - MARGIN * 2, 120, 40);
  },
  buffet() {
    drawCounter(600, 90, 260, 50);
    drawTable(300, 240, 150, 55);
    drawTable(520, 350, 150, 55);
    drawChair(340, 320);
    drawChair(560, 425);
    ctx.fillStyle = '#e8d5ae';
    ctx.fillRect(640, 70, 60, 16);
    ctx.fillStyle = '#6f5136';
    ctx.fillRect(740, 60, 40, 30);
    drawPoster(340, 60, 120, 60, '#a85030');
    drawPlant(110, 430);
  },
  climate() {
    drawTiles(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2, 40);
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
    drawPoster(340, 60, 130, 60, '#c98a3a');
    drawBox(350, 380, 60, 46);
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
  if (d.side === 'top') ly = cy - 30;
  else if (d.side === 'bottom') ly = cy + 30;
  else if (d.side === 'left') lx = cx + 62;
  else lx = cx - 62;

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
    drawLock(lx + px + 12, ly);
    ctx.fillStyle = PALETTE.wine;
    ctx.font = '11px ' + SERIF;
    const note = 'нужен пропуск';
    const nw = ctx.measureText(note).width / 2 + 8;
    const ny = d.side === 'top' ? ly + 26 : (d.side === 'bottom' ? ly - 26 : ly + 22);
    const nx = (d.side === 'left' || d.side === 'right') ? lx : lx;
    ctx.fillStyle = PALETTE.wine;
    roundRect(nx - nw, ny - 9, nw * 2, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#f0e2c8';
    ctx.fillText(note, nx, ny + 1);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  drawWall();
  drawWallFrames(currentRoom);

  ctx.save();
  ctx.beginPath();
  ctx.rect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);
  ctx.clip();

  ctx.fillStyle = floors[currentRoom] || '#6b4633';
  ctx.fillRect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);
  drawParquet();

  if (decor[currentRoom]) decor[currentRoom]();

  const hotObj = nearInteract();
  for (const it of interactables) {
    if (it.room === currentRoom) drawInteractIcon(it, it === hotObj);
  }

  drawLamps();

  ctx.restore();

  drawAtmosphere();

  const room = rooms[currentRoom];
  const door = nearDoor();

  for (const d of room.doors) {
    const r = doorRect(d);
    drawDoor(d, r, d === door, isLocked(d));
  }

  for (const it of items) {
    if (it.room === currentRoom) drawPass(it.x, it.y);
  }

  for (const b of storyBooks) {
    if (b.room === currentRoom && !taken[b.id]) drawStoryBook(b);
  }

  drawCat(player);

  for (const d of room.doors) {
    const r = doorRect(d);
    drawDoorLabel(d, r, d === door, isLocked(d));
  }

  ctx.fillStyle = 'rgba(23,15,12,.85)';
  ctx.fillRect(0, 0, W, MARGIN - 6);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(0, MARGIN - 8, W, 2);

  const path = pathOf(currentRoom);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  if (path.length > 1) {
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '12px ' + SERIF;
    ctx.fillText(path.map(id => rooms[id].name).join('  ›  '), MARGIN + 14, 5);
  }

  ctx.fillStyle = PALETTE.gold;
  fitText(room.name, MARGIN + 14, path.length > 1 ? 19 : 11, W - MARGIN * 2 - 220, 20);

  if (room.sub) {
    ctx.fillStyle = 'rgba(23,15,12,.72)';
    ctx.fillRect(MARGIN, MARGIN, W - MARGIN * 2, 26);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = 'italic 13px ' + SERIF;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(room.sub, MARGIN + 14, MARGIN + 13);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = '15px ' + SERIF;

  const item = nearItem();
  const book = nearBook();
  const hintW = 700;
  ctx.fillStyle = 'rgba(23,15,12,.85)';
  ctx.fillRect(W / 2 - hintW / 2, H - MARGIN - 4, hintW, MARGIN + 4);
  ctx.fillStyle = PALETTE.brass;
  ctx.fillRect(W / 2 - hintW / 2, H - MARGIN - 4, hintW, 1);

  if (toast && performance.now() < toastUntil) {
    ctx.fillStyle = PALETTE.gold;
    wrapText(toast, W / 2, H - MARGIN + 2, hintW - 30, 17, 2);
  } else if (item) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText('Клик — взять пропуск на инфо-стойке', W / 2, H - 10);
  } else if (book) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`Клик — поймать: ${book.title} (${book.author})`, W / 2, H - 10);
  } else if (hotObj) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`Клик — осмотреть: ${hotObj.title}`, W / 2, H - 10);
  } else if (door) {
    ctx.fillStyle = isLocked(door) ? '#e08080' : PALETTE.gold;
    ctx.fillText(isLocked(door) ? 'Закрыто — нужен пропуск сотрудника' : `Клик — войти: ${rooms[door.to].name}`, W / 2, H - 10);
  } else {
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText('WASD — движение, подойди к двери и кликни', W / 2, H - 10);
  }

  if (havePass) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(23,15,12,.85)';
    ctx.fillRect(W - MARGIN - 130, 8, 122, 24);
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 1;
    ctx.strokeRect(W - MARGIN - 130.5, 7.5, 122, 24);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '13px ' + SERIF;
    ctx.fillText('Пропуск: есть', W - MARGIN - 18, 20);
  }

  if (quest.stage >= 1 && quest.stage <= 2) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '13px ' + SERIF;
    const label = quest.stage === 2
      ? 'Задание: вернуться к Барсу'
      : `Задание: поймать беглецов ${quest.found}/${storyBooks.length}`;
    const tw = ctx.measureText(label).width + 24;
    ctx.fillStyle = 'rgba(23,15,12,.85)';
    ctx.fillRect(MARGIN + 8, 36, tw, 22);
    ctx.strokeStyle = PALETTE.brass;
    ctx.strokeRect(MARGIN + 8.5, 35.5, tw, 22);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(label, MARGIN + 20, 47);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px ' + SERIF;
  const mapHover = mouseX >= W - 66 && mouseX <= W - 8 && mouseY >= 8 && mouseY <= 56;
  ctx.fillStyle = mapHover ? 'rgba(60,35,20,.95)' : 'rgba(23,15,12,.85)';
  roundRect(W - 66, 8, 58, 48, 6);
  ctx.fill();
  ctx.strokeStyle = PALETTE.brass;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  drawMapGlyph(W - 37, 26);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '10px ' + SERIF;
  ctx.fillText('M', W - 37, 47);

  drawMiniMap();

  if (mapOpen) drawMap();
  if (ending) drawEnding();
}

const MINIMAP = { x: 6, y: H - 198, w: 156, h: 150 };

function inMiniMap(mx, my) {
  return mx >= MINIMAP.x && mx <= MINIMAP.x + MINIMAP.w &&
         my >= MINIMAP.y && my <= MINIMAP.y + MINIMAP.h;
}

function drawMiniMap() {
  const L = mapLayout();
  const hover = mouseX >= MINIMAP.x && mouseX <= MINIMAP.x + MINIMAP.w &&
                mouseY >= MINIMAP.y && mouseY <= MINIMAP.y + MINIMAP.h;

  ctx.fillStyle = hover ? 'rgba(36,24,18,.95)' : 'rgba(23,15,12,.85)';
  roundRect(MINIMAP.x, MINIMAP.y, MINIMAP.w, MINIMAP.h, 6);
  ctx.fill();
  ctx.strokeStyle = hover ? PALETTE.gold : PALETTE.brass;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px ' + SERIF;
  ctx.fillStyle = PALETTE.gold;
  const seen = Object.keys(visited).length;
  ctx.fillText('Карта', MINIMAP.x + 10, MINIMAP.y + 14);
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '10px ' + SERIF;
  ctx.fillText(seen + '/' + Object.keys(rooms).length, MINIMAP.x + MINIMAP.w - 10, MINIMAP.y + 14);

  const pad = 10, top = 26, bottom = 20;
  const availW = MINIMAP.w - pad * 2;
  const availH = MINIMAP.h - top - bottom;
  const s = Math.min(availW / L.w, availH / L.h);
  const ox = MINIMAP.x + pad + (availW - L.w * s) / 2;
  const oy = MINIMAP.y + top + (availH - L.h * s) / 2;
  const cx = p => ox + p.x * s + L.NODE_W * s / 2;
  const cy = p => oy + p.y * s + L.NODE_H * s / 2;

  ctx.strokeStyle = 'rgba(224,178,92,.3)';
  ctx.lineWidth = 1;
  for (const id in L.pos) {
    if (!visited[id]) continue;
    for (const k of mapChildren(id)) {
      if (!visited[k]) continue;
      ctx.beginPath();
      ctx.moveTo(cx(L.pos[id]), cy(L.pos[id]));
      ctx.lineTo(cx(L.pos[k]), cy(L.pos[k]));
      ctx.stroke();
    }
  }

  for (const id in L.pos) {
    if (!visited[id]) continue;
    const p = L.pos[id];
    ctx.fillStyle = id === currentRoom ? PALETTE.gold : 'rgba(224,178,92,.55)';
    ctx.beginPath();
    ctx.arc(cx(p), cy(p), id === currentRoom ? 3.5 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const here = L.pos[currentRoom];
  if (here) {
    const pulse = 0.6 + Math.sin(performance.now() / 220) * 0.4;
    ctx.fillStyle = `rgba(255,106,77,${pulse})`;
    ctx.beginPath();
    ctx.arc(cx(here), cy(here), 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd9cf';
    ctx.beginPath();
    ctx.arc(cx(here), cy(here), 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.font = 'bold 10px ' + SERIF;
  ctx.fillStyle = PALETTE.parchment;
  const hereName = L.pos[currentRoom] ? (rooms[currentRoom].short || rooms[currentRoom].name) : '';
  ctx.fillText(hereName, MINIMAP.x + MINIMAP.w / 2, MINIMAP.y + MINIMAP.h - 11);
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

function drawEnding() {
  ctx.fillStyle = 'rgba(10,6,4,.88)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#241812';
  roundRect(W / 2 - 320, H / 2 - 150, 640, 300, 10);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 30px ' + SERIF;
  ctx.fillText('Конец', W / 2, H / 2 - 100);

  ctx.fillStyle = PALETTE.parchment;
  ctx.font = '16px ' + SERIF;
  const lines = [
    'Онегин, Чичиков и Гарри снова лежат на полках,',
    'поспокойнее читают свои страницы и больше не ёрзают.',
    'Пыль садится на переплёты, лампы гудят,',
    'а кот-хранитель мурлычет в стопке журналов.'
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 - 45 + i * 28));

  ctx.fillStyle = PALETTE.dim;
  ctx.font = 'italic 14px ' + SERIF;
  ctx.fillText('Клик — вернуться в библиотеку', W / 2, H / 2 + 110);
}

function mapChildren(id) {
  const r = rooms[id];
  return r.doors.filter(d => d.to !== r.parent).map(d => d.to);
}

let mapLayoutCache = null;
function mapLayout() {
  if (mapLayoutCache) return mapLayoutCache;
  const NODE_W = 74, NODE_H = 32, GAP = 8, LEVEL_H = 64;
  const pos = {};
  const width = id => {
    const kids = mapChildren(id);
    if (!kids.length) return NODE_W + GAP;
    return Math.max(NODE_W + GAP, kids.reduce((s, k) => s + width(k), 0));
  };
  const place = (id, left, depth) => {
    const kids = mapChildren(id);
    const w = width(id);
    if (!kids.length) {
      pos[id] = { x: left + (w - NODE_W) / 2, y: depth * LEVEL_H };
      return;
    }
    let c = left;
    for (const k of kids) { place(k, c, depth + 1); c += width(k); }
    const f = pos[kids[0]], l = pos[kids[kids.length - 1]];
    pos[id] = { x: (f.x + l.x + NODE_W) / 2 - NODE_W / 2, y: depth * LEVEL_H };
  };
  place('hall', 0, 0);
  mapLayoutCache = { pos, w: width('hall'), h: 4 * LEVEL_H, NODE_W, NODE_H };
  return mapLayoutCache;
}

function drawMap() {
  ctx.fillStyle = 'rgba(10,6,4,.9)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 24px ' + SERIF;
  ctx.fillText('Карта библиотеки', W / 2, 42);

  const total = Object.keys(rooms).length;
  const seen = Object.keys(visited).length;
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px ' + SERIF;
  ctx.fillText(`Исследовано ${seen} из ${total} помещений · M или клик — закрыть`, W / 2, 68);

  const L = mapLayout();
  const PAD = 30, TOP = 92;
  const panelW = W - PAD * 2, panelH = H - TOP - 54;
  const s = Math.min(panelW / L.w, panelH / L.h);
  const ox = PAD + (panelW - L.w * s) / 2;
  const oy = TOP + (panelH - L.h * s) / 2;

  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);

  ctx.strokeStyle = 'rgba(224,178,92,.35)';
  ctx.lineWidth = 1.5;
  for (const id in L.pos) {
    const p = L.pos[id];
    for (const k of mapChildren(id)) {
      const c = L.pos[k];
      if (!c) continue;
      const y1 = p.y + L.NODE_H, y2 = c.y, mid = (y1 + y2) / 2;
      ctx.beginPath();
      ctx.moveTo(p.x + L.NODE_W / 2, y1);
      ctx.lineTo(p.x + L.NODE_W / 2, mid);
      ctx.lineTo(c.x + L.NODE_W / 2, mid);
      ctx.lineTo(c.x + L.NODE_W / 2, y2);
      ctx.stroke();
    }
  }

  for (const id in L.pos) {
    const p = L.pos[id];
    const seenRoom = !!visited[id];
    const isHere = id === currentRoom;

    ctx.fillStyle = seenRoom ? '#2e1d15' : 'rgba(46,29,21,.35)';
    roundRect(p.x, p.y, L.NODE_W, L.NODE_H, 5);
    ctx.fill();
    ctx.strokeStyle = isHere ? PALETTE.gold : (seenRoom ? PALETTE.brass : 'rgba(224,178,92,.15)');
    ctx.lineWidth = isHere ? 2.5 : 1;
    ctx.stroke();

    const label = seenRoom ? (rooms[id].short || rooms[id].name) : '· · ·';
    ctx.fillStyle = seenRoom ? (isHere ? PALETTE.gold : PALETTE.parchment) : 'rgba(232,213,174,.25)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = (isHere ? 'bold ' : '') + '9px ' + SERIF;
    fitText(label, p.x + L.NODE_W / 2, p.y + L.NODE_H / 2, L.NODE_W - 8, 9);

    if (isHere) {
      const pulse = 0.75 + Math.sin(performance.now() / 220) * 0.25;
      ctx.fillStyle = '#ff6a4d';
      ctx.beginPath();
      ctx.arc(p.x + L.NODE_W - 7, p.y + 7, 4 * pulse + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd9cf';
      ctx.beginPath();
      ctx.arc(p.x + L.NODE_W - 7, p.y + 7, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.fillStyle = PALETTE.dim;
  ctx.font = '12px ' + SERIF;
  ctx.textAlign = 'center';
  ctx.fillText('Пунктир — ещё не посещённые помещения · красная точка — вы', W / 2, H - 30);
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
