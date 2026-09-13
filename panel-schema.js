/* ══════════════════════════════════════════════════════════════════════════
   СХЕМА ПРОЕКТА «СВОДКА» ДЛЯ ЯДРА ПАНЕЛИ (panel-core.js).

   Ядро одинаковое во всех витринах и про формат data.js ничего не знает.
   Здесь сказано только: какие у карточки поля и как разложить общий вид
   обратно в файл, который читает сайт: SITE / CATEGORIES / OFFERS.
   ══════════════════════════════════════════════════════════════════════════ */

window.ADMIN = {
  brand: 'СВОДКА',
  dataFile: 'data.js',
  draftKey: 'svodka_admin_draft',
  preview: 'index.html?draft=1',

  /* Ссылки партнёрок приходят без erid — маркировку сайт печатает только
     если она реально есть в ссылке. Выдумывать её нельзя. */
  requireErid: false,

  /* Включает блок «Логотип»: либо файл банка, либо цветная плашка. */
  logo: true,

  /* Фон карточки на сайте — почти белый. К нему ядро считает контраст
     плашки. Без этой строки ядро возьмёт свой тёмный фон и забракует
     нормальные цвета. */
  surface: '#FBFAF7',

  /* Цвета новой плашки по умолчанию — синий акцент сайта. */
  defaultTone: { bg: '#16456B', ink: '#FFFFFF' },

  /* Готовые логотипы: файлы лежат в img/logos/. Список шире каталога —
     логотип нового оффера не нужно искать по интернету. Своя картинка
     грузится кнопкой «Выбрать файл…» в карточке. */
  presets: [
    { label: 'Банки', items: [
      { name: 'АК Барс Банк', value: 'img/logos/akbars.png' },
      { name: 'Альфа-Банк', value: 'img/logos/alfabank.png' },
      { name: 'Банк Санкт-Петербург', value: 'img/logos/bspb.png' },
      { name: 'ВТБ', value: 'img/logos/vtb.png' },
      { name: 'Газпромбанк', value: 'img/logos/gazprombank.png' },
      { name: 'Зенит Банк', value: 'img/logos/zenit.png' },
      { name: 'Кредит Европа Банк', value: 'img/logos/crediteurope.svg' },
      { name: 'МТС Банк', value: 'img/logos/mtsbank.png' },
      { name: 'ОТП Банк', value: 'img/logos/otp.png' },
      { name: 'Почта Банк', value: 'img/logos/pochtabank.png' },
      { name: 'ПСБ', value: 'img/logos/psb.png' },
      { name: 'Райффайзен Банк', value: 'img/logos/raiffeisen.png' },
      { name: 'Ренессанс Банк', value: 'img/logos/rencredit.png' },
      { name: 'Россельхозбанк', value: 'img/logos/rshb.png' },
      { name: 'Русский Стандарт', value: 'img/logos/rsb.png' },
      { name: 'Сбербанк', value: 'img/logos/sberbank.png' },
      { name: 'Совкомбанк', value: 'img/logos/sovcombank.png' },
      { name: 'Совкомбанк Халва', value: 'img/logos/halva.png' },
      { name: 'Т-Банк', value: 'img/logos/tbank.png' },
      { name: 'Фора-Банк', value: 'img/logos/forabank.svg' },
      { name: 'УБРиР', value: 'img/logos/ubrir.png' },
      { name: 'Уралсиб', value: 'img/logos/uralsib.png' },
      { name: 'Хоум Банк', value: 'img/logos/homecredit.png' },
      { name: 'Модульбанк', value: 'img/logos/modulbank.png' },
      { name: 'Ozon Банк', value: 'img/logos/ozon.png' }
    ] },
    { label: 'МФО и займы', items: [
      { name: 'Аденьги', value: 'img/logos/adengi.png' },
      { name: 'Быстроденьги', value: 'img/logos/bistrodengi.png' },
      { name: 'Деньга', value: 'img/logos/denga.png' },
      { name: 'Деньги на дом', value: 'img/logos/denginadom.png' },
      { name: 'Деньги сразу', value: 'img/logos/dengisrazu.png' },
      { name: 'До зарплаты', value: 'img/logos/dozarplati.png' },
      { name: 'ЕКапуста', value: 'img/logos/ekapusta.png' },
      { name: 'Займер', value: 'img/logos/zaymer.png' },
      { name: 'Лайм-Займ', value: 'img/logos/limezaim.png' },
      { name: 'МигКредит', value: 'img/logos/migcredit.png' },
      { name: 'Свои люди', value: 'img/logos/svoiludi.png' },
      { name: 'СМС Финанс', value: 'img/logos/smsfinance.png' },
      { name: 'Срочно деньги', value: 'img/logos/srochnodengi.png' },
      { name: 'Турбозайм', value: 'img/logos/turbozaim.svg' },
      { name: 'Умные наличные', value: 'img/logos/smartcash.svg' },
      { name: 'Центрофинанс', value: 'img/logos/centrofinans.png' },
      { name: 'CarMoney', value: 'img/logos/carmoney.png' },
      { name: 'CreditPlus', value: 'img/logos/creditplus.png' },
      { name: 'Joymoney', value: 'img/logos/joymoney.png' },
      { name: 'Kviku', value: 'img/logos/kviku.png' },
      { name: 'Max.Credit', value: 'img/logos/maxcredit.png' },
      { name: 'MoneyMan', value: 'img/logos/moneyman.png' },
      { name: 'OneClickMoney', value: 'img/logos/oneclickmoney.png' },
      { name: 'Platiza', value: 'img/logos/platiza.png' },
      { name: 'Rocketman', value: 'img/logos/rocketman.png' },
      { name: 'Webbankir', value: 'img/logos/webbankir.png' },
      { name: 'Zaymigo', value: 'img/logos/zaymigo.png' }
    ] }
  ],

  /* Только то, что сайт действительно показывает. */
  site: [
    { key: 'brand', label: 'Название сайта', required: true,
      hint: 'Стоит в шапке, в подвале и в заголовке вкладки браузера.' },
    { key: 'tagline', label: 'Строка над главным заголовком',
      hint: 'Мелкая строка с точкой на первом экране, например «Финансовые предложения банков и МФО — одним списком».' },
    { key: 'telegram', label: 'Телеграм для заявок', type: 'url', required: true,
      hint: 'Форма собирает готовое сообщение и открывает этот чат. Например https://t.me/ваш_ник' }
  ],

  groups: [
    { key: 'title', label: 'Название раздела', required: true,
      hint: 'Видно на кнопке-фильтре над каталогом и в сводке на первом экране.' },
    { key: 'cta', label: 'Надпись на кнопках', required: true,
      hint: 'Одна на все карточки раздела: «Получить деньги», «Оформить карту».' }
  ],

  card: [
    { key: 'partner', label: 'Банк или МФО', required: true, hint: 'Видно рядом с логотипом.' },
    { key: 'tag', label: 'Тип продукта',
      hint: 'Мелкая подпись под названием банка: «займ», «дебетовая карта». По ней же форма заявки сама подставляет раздел.' },
    { key: 'title', label: 'Название продукта', required: true, hint: 'Заголовок карточки, например «Альфа-Карта».' },
    { key: 'headline', label: 'Крупная строка выгоды', required: true,
      hint: 'Главное преимущество: «Деньги на карту», «120 дней без процентов». Цифры ставьте только те, что подтверждены партнёркой.' },
    { key: 'note', label: 'Подпись под крупной строкой',
      hint: 'Например «ставка и ПСК — на сайте кредитора».' },
    { key: 'specs', label: 'Условия', type: 'pairs',
      hint: 'По строке на условие, через двоеточие: «Оформление: онлайн». Пишите только подтверждённые партнёркой цифры.' },
    { key: 'url', label: 'Партнёрская ссылка', type: 'url',
      hint: 'Вставьте ссылку из партнёрки целиком, вместе с erid и метками. Пока пусто — кнопка карточки ведёт на форму заявки.' }
  ],

  /* ───────────────────────────── чтение ──────────────────────────────── */

  load: function () {
    var groups = CATEGORIES.map(function (c) {
      return { key: c.id, title: c.label, cta: c.cta };
    });

    var seen = {};
    var cards = OFFERS.map(function (o, i) {
      /* Устойчивый ключ: в файле его нет, а ядру он нужен, чтобы не путать
         карточки при перестановке. Считаем от банка и названия продукта. */
      var base = ((o.partner || '') + '-' + (o.title || '')).toLowerCase()
        .replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || ('c' + i);
      var uid = base, n = 2;
      while (seen[uid]) uid = base + '-' + (n++);
      seen[uid] = true;

      return {
        uid: uid,
        group: o.cat,
        hidden: !!o.hidden,
        partner: o.partner || '',
        tag: o.tag || '',
        title: o.title || '',
        headline: o.headline || '',
        note: o.note || '',
        specs: (o.specs || []).map(function (p) { return [p[0], p[1]]; }),
        url: o.url || '',
        logo: o.logo || '',
        /* Цвета плашки читаем всегда, даже когда логотип есть: от них
           рисуется цветная полоска карточки. Не прочитать — значит затереть
           выбор клиента дефолтом при следующем сохранении. */
        tone: {
          bg: (o.tone && o.tone.bg) || '#16456B',
          ink: (o.tone && o.tone.ink) || '#FFFFFF'
        }
      };
    });

    return {
      SITE: JSON.parse(JSON.stringify(SITE)),
      GROUPS: groups,
      CARDS: cards
    };
  },

  /* ──────────────────────── сборка файла ─────────────────────────────── */

  build: function (m) {
    function js(v) { return JSON.stringify(v, null, 2); }
    function t(v) { return String(v == null ? '' : v).trim(); }

    var categories = m.GROUPS.map(function (g) {
      return { id: g.key, label: t(g.title), cta: t(g.cta) || 'Оформить' };
    });

    var offers = m.CARDS.map(function (c) {
      var o = {
        cat: c.group,
        partner: t(c.partner),
        tag: t(c.tag),
        title: t(c.title),
        headline: t(c.headline),
        note: t(c.note),
        specs: (c.specs || [])
          .map(function (p) { return [t(p[0]), t(p[1])]; })
          .filter(function (p) { return p[0] || p[1]; }),
        url: t(c.url),
        logo: t(c.logo),
        tone: {
          bg: t(c.tone && c.tone.bg) || '#16456B',
          ink: t(c.tone && c.tone.ink) || '#FFFFFF'
        }
      };
      if (c.hidden) o.hidden = true;
      return o;
    });

    return [
      '/* ═════════════════════════════════════════════════════════════════════════',
      '   КАТАЛОГ «СВОДКА» — единственный файл с содержимым сайта.',
      '   Собран панелью ' + new Date().toLocaleString('ru-RU') + '.',
      '',
      '   Правится через panel.html. Руками тоже можно, но при следующем',
      '   сохранении из панели правки будут перезаписаны.',
      '',
      '   url   — партнёрская ссылка. Пусто — кнопка ведёт на форму заявки.',
      '   logo  — файл логотипа или встроенная картинка. Пусто — плашка',
      '           с инициалами банка в цветах tone.',
      '   tone  — цвет плашки и цветной полоски сверху карточки.',
      '',
      '   ВАЖНО ПРО ЦИФРЫ: ставки, лимиты, кэшбэк и сроки ставьте только те,',
      '   что подтверждены партнёркой. Цифра «на глаз» — недостоверная реклама.',
      '   ═════════════════════════════════════════════════════════════════════════ */',
      '',
      'const SITE = ' + js(m.SITE) + ';',
      '',
      '/* cta — надпись на кнопках карточек этого раздела. */',
      'const CATEGORIES = ' + js(categories) + ';',
      '',
      'const OFFERS = ' + js(offers) + ';',
      ''
    ].join('\n');
  }
};
