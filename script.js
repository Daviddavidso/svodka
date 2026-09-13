/* ═════════════════════════════════════════════════════════════════════════
   СВОДКА — логика страницы.
   Содержимое берётся из data.js (или data.php на боевом сервере):
   SITE, CATEGORIES, OFFERS.
   ═════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Настройку «меньше движения» держим живой, а не читаем один раз: человек
     может выключить её при открытой странице, и тогда CSS-анимация поедет,
     а кнопка паузы осталась бы скрытой навсегда. */
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── данные ───────────────────────────────────────────────────────── */
  /* Каталог объявлен глобальными const, а const мимо window не переприсвоить —
     работаем с локальными копиями. На адресе index.html?draft=1 подставляется
     черновик из панели (его кладёт в localStorage кнопка «Предпросмотр»).
     Боевой адрес это не затрагивает. */
  var site   = typeof SITE       !== 'undefined' ? SITE       : {};
  var cats   = typeof CATEGORIES !== 'undefined' ? CATEGORIES : [];
  var offers = typeof OFFERS     !== 'undefined' ? OFFERS     : [];

  if (/[?&]draft/.test(location.search)) {
    try {
      var draftFile = localStorage.getItem('svodka_admin_draft:file');
      if (draftFile) {
        var d = new Function(draftFile +
          '\n;return { SITE: SITE, CATEGORIES: CATEGORIES, OFFERS: OFFERS };')();
        site = d.SITE || site; cats = d.CATEGORIES || cats; offers = d.OFFERS || offers;
      }
    } catch (e) { /* битый черновик — показываем боевой каталог */ }
  }

  offers = offers.filter(function (o) { return !o.hidden; });

  /* ── мелкие помощники ─────────────────────────────────────────────── */
  function plural(n, one, few, many) {
    var n10 = n % 10, n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  }

  function catById(id) {
    for (var i = 0; i < cats.length; i++) if (cats[i].id === id) return cats[i];
    return null;
  }

  function countIn(id) {
    return offers.filter(function (o) { return o.cat === id; }).length;
  }

  function initials(name) {
    return String(name || '?').trim().split(/[\s.-]+/).slice(0, 2)
      .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
  }

  // Ссылка считается настоящей, только если это внешний адрес. Пустая строка,
  // «#» и подсказка вроде «вставьте ссылку» таковой не являются: карточка с
  // такой ссылкой ведёт на форму заявки, а не в никуда.
  function realLink(url) {
    return /^https?:\/\/\S+$/i.test(String(url || '').trim());
  }

  /* Пастельная подложка под логотип: фирменный цвет банка, разбавленный
     белым. Считаем сами, а не через color-mix, чтобы цвет из панели работал
     в любом браузере и не зависел от поддержки функции. */
  function tint(hex, amount) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return '';
    var k = amount == null ? 0.12 : amount;
    var out = [0, 2, 4].map(function (i) {
      var c = parseInt(h.slice(i, i + 2), 16);
      return Math.round(c * k + 255 * (1 - k));
    });
    return 'rgb(' + out.join(',') + ')';
  }

  // Дев-страховка: одинаковые пары «банк + продукт» дают одинаковые заголовки
  // карточек, и список заголовков перестаёт быть навигацией
  (function warnDuplicates() {
    var seen = {};
    offers.forEach(function (o) {
      var key = (o.partner || '') + '|' + (o.title || '');
      if (seen[key]) console.error('Две карточки с одинаковым названием:', key);
      seen[key] = true;
    });
  })();

  /* ── тексты сайта из панели ───────────────────────────────────────── */
  if (site.brand) {
    Array.prototype.forEach.call(document.querySelectorAll('.brand__word'), function (n) {
      n.textContent = site.brand;
    });
    document.title = 'Займы, дебетовые и кредитные карты, кредиты наличными — ' + site.brand;
  }
  var taglineEl = document.getElementById('tagline');
  if (taglineEl && site.tagline) taglineEl.textContent = site.tagline;

  /* ── цифры на первом экране ───────────────────────────────────────── */
  (function renderHeroStats() {
    var box = document.getElementById('hero-stats');
    if (!box) return;

    var partners = offers.map(function (o) { return o.partner; })
      .filter(function (v, i, a) { return a.indexOf(v) === i; }).length;

    [
      { value: offers.length,
        label: plural(offers.length, 'предложение в каталоге', 'предложения в каталоге', 'предложений в каталоге') },
      { value: partners,
        label: plural(partners, 'банк и МФО', 'банка и МФО', 'банков и МФО') },
      { value: '0 ₽', label: 'стоимость для вас' }
    ].forEach(function (s) {
      var li = document.createElement('li');
      var v = document.createElement('span');
      v.className = 'hero__stat-value';
      v.textContent = s.value;
      var l = document.createElement('span');
      l.className = 'hero__stat-label';
      l.textContent = s.label;
      li.appendChild(v);
      li.appendChild(l);
      box.appendChild(li);
    });
  })();

  /* ── лента логотипов ──────────────────────────────────────────────── */
  (function renderMarquee() {
    var track = document.getElementById('ticker');
    if (!track) return;

    // По одному логотипу на банк. Берём первый оффер банка, У КОТОРОГО ЕСТЬ
    // логотип: иначе банк уехал бы в текстовый запасной вариант только из-за
    // порядка карточек в каталоге.
    var byName = {}, brands = [];
    offers.forEach(function (o) {
      if (!byName[o.partner]) {
        byName[o.partner] = { name: o.partner, logo: o.logo || '' };
        brands.push(byName[o.partner]);
      } else if (!byName[o.partner].logo && o.logo) {
        byName[o.partner].logo = o.logo;
      }
    });

    function item(b, copy) {
      var li = document.createElement('li');
      li.className = 'marquee__item' + (copy ? ' marquee__item--copy' : '');
      // Копию помечаем поэлементно, а не обёрткой: обёртка с display:contents
      // может выпасть из дерева доступности вместе со своим aria-hidden
      if (copy) li.setAttribute('aria-hidden', 'true');

      if (b.logo) {
        var plate = document.createElement('span');
        plate.className = 'marquee__plate';
        var img = document.createElement('img');
        img.src = b.logo;
        // Здесь имя банка живёт в alt, а не скрытой строкой рядом: при
        // отключённых картинках браузер нарисует alt текстом, и лента
        // останется осмысленной. В карточках наоборот — там имя уже стоит
        // текстом рядом, и alt его дублировал бы.
        img.alt = copy ? '' : b.name;
        // loading="lazy" здесь запрещён: лента лежит в overflow:hidden и
        // выезжает трансформом, ленивую загрузку это не переоценивает —
        // вторая половина может не загрузиться никогда, и в петле будут дыры
        img.decoding = 'async';
        if (copy) img.setAttribute('fetchpriority', 'low');
        plate.appendChild(img);
        li.appendChild(plate);
      } else {
        // Плашку с инициалами не ставим: рядом нет текста, и «СБ» зрячему
        // ничего не скажет — пишем название целиком
        li.appendChild(document.createTextNode(b.name));
      }

      return li;
    }

    brands.forEach(function (b) { track.appendChild(item(b, false)); });
    brands.forEach(function (b) { track.appendChild(item(b, true)); });

    // SC 2.2.2: у бесконечной анимации обязан быть видимый выключатель.
    // Наведение мышью не считается — оно недоступно с клавиатуры и с тача.
    var box = document.getElementById('ticker-box');
    var toggle = document.getElementById('ticker-toggle');
    if (!box || !toggle) return;

    // Модель одна: меняется надпись, состояния aria-pressed нет. Имя кнопки
    // всегда говорит, что произойдёт по нажатию. Две модели сразу дают
    // «Включить движение, нажата» — имя и состояние противоречат друг другу.
    toggle.addEventListener('click', function () {
      var paused = box.classList.toggle('is-paused');
      toggle.textContent = paused ? 'Включить движение' : 'Остановить движение';
    });

    function syncToggle() {
      // Под «меньше движения» лента не едет и не превращается в скроллер:
      // логотипы просто переносятся. Кнопке тогда нечего выключать.
      toggle.hidden = motionQuery.matches;
    }
    syncToggle();
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', syncToggle);
    else if (motionQuery.addListener) motionQuery.addListener(syncToggle);
  })();

  /* ── карточка ─────────────────────────────────────────────────────── */
  function buildOffer(offer, opts) {
    opts = opts || {};
    var li = document.createElement('li');
    li.className = 'offer' + (opts.decorative ? '' : ' reveal') +
      (opts.instant ? ' is-visible' : '');

    var tone = offer.tone || {};

    /* --- шапка карточки --- */
    var top = document.createElement('div');
    top.className = 'offer__top';

    // Логотип — опознавательный знак для глаза. Название банка стоит текстом
    // рядом, поэтому alt пустой: иначе на сорока карточках скринридер прочитал
    // бы «Сбербанк Сбербанк».
    var logoBox = document.createElement('span');
    logoBox.className = 'offer__logo';
    if (tone.bg) logoBox.style.background = tint(tone.bg, 0.12);

    if (offer.logo) {
      var img = document.createElement('img');
      img.src = offer.logo;
      img.alt = '';
      img.width = 44;
      img.height = 32;
      if (!opts.decorative) img.loading = 'lazy';
      logoBox.appendChild(img);
    } else {
      logoBox.className += ' offer__logo--text';
      logoBox.setAttribute('aria-hidden', 'true');
      logoBox.textContent = initials(offer.partner);
      if (tone.bg) logoBox.style.color = tone.bg;
    }
    top.appendChild(logoBox);

    var names = document.createElement('span');
    names.className = 'offer__names';

    var partner = document.createElement('span');
    partner.className = 'offer__partner';
    partner.textContent = offer.partner;
    names.appendChild(partner);

    if (offer.tag) {
      var tag = document.createElement('span');
      tag.className = 'offer__tag';
      tag.textContent = offer.tag;
      names.appendChild(tag);
    }
    top.appendChild(names);
    li.appendChild(top);

    /* --- название --- */
    // В витрине первого экрана это не заголовок, а картинка заголовка:
    // настоящий h3 создал бы три лишних пункта в оглавлении страницы между
    // h1 и h2, и полагаться на один aria-hidden тут нельзя
    var title = document.createElement(opts.decorative ? 'p' : 'h3');
    title.className = 'offer__title';
    title.appendChild(document.createTextNode(offer.title));
    // Банк добавлен в сам заголовок скрытой частью: «Займ на карту»
    // повторяется у полутора десятков МФО, и список заголовков без банка
    // бесполезен
    var titleTail = document.createElement('span');
    titleTail.className = 'visually-hidden';
    titleTail.textContent = ', ' + offer.partner;
    title.appendChild(titleTail);
    li.appendChild(title);

    if (offer.headline) {
      var headline = document.createElement('p');
      headline.className = 'offer__headline';
      headline.textContent = offer.headline;
      li.appendChild(headline);
    }

    if (offer.note) {
      var note = document.createElement('p');
      note.className = 'offer__note';
      note.textContent = offer.note;
      li.appendChild(note);
    }

    /* --- условия --- */
    // Список определений, а не строки: «онлайн» без метки «Оформление»
    // звучит как обрывок. dt/dd дают «Оформление — онлайн».
    var specs = (offer.specs || []).filter(function (p) { return p && (p[0] || p[1]); });
    if (specs.length) {
      var dl = document.createElement('dl');
      dl.className = 'offer__specs';
      specs.forEach(function (p) {
        var row = document.createElement('div');
        row.className = 'offer__spec';
        var dt = document.createElement('dt');
        dt.textContent = p[0];
        var dd = document.createElement('dd');
        dd.textContent = p[1] || '—';   // пустое значение молчит, прочерк — нет
        row.appendChild(dt);
        row.appendChild(dd);
        dl.appendChild(row);
      });
      li.appendChild(dl);
    }

    /* --- маркировка рекламы --- */
    // Токен берём прямо из партнёрской ссылки, чтобы он не разъезжался с ней.
    // Не раскодируем: erid — всегда буквы и цифры, а decodeURIComponent на
    // битой строке бросает исключение и обрушил бы отрисовку всей сетки.
    // В витрине маркировку не печатаем: она уже стоит в настоящей карточке
    // ниже, а тут её могло бы визуально срезать соседней карточкой стопки —
    // обрезанная обязательная строка хуже её отсутствия
    var erid = opts.decorative
      ? null
      : ((offer.url || '').match(/[?&]erid=([^&#]+)/) || [])[1];
    if (erid && !/^[A-Za-z0-9]+$/.test(erid)) {
      console.warn('Пропущен erid неожиданного вида у оффера:', offer.partner, erid);
      erid = null;
    }
    if (erid) {
      var ad = document.createElement('p');
      ad.className = 'offer__ad';
      ad.textContent = 'Реклама. erid: ' + erid;
      li.appendChild(ad);
    }

    /* --- кнопка --- */
    var cta = document.createElement('p');
    cta.className = 'offer__cta';

    var cat = catById(offer.cat);
    var hasLink = realLink(offer.url);
    var label = hasLink ? ((cat && cat.cta) || 'Оформить') : 'Оставить заявку';

    if (opts.decorative) {
      // Витрина в герое целиком скрыта от скринридера и не должна ловить
      // ни фокус, ни клик: кнопка здесь — нарисованная, а не ссылка
      var fake = document.createElement('span');
      fake.className = 'offer__link' + (hasLink ? '' : ' offer__link--soft');
      fake.textContent = label;
      cta.appendChild(fake);
      li.appendChild(cta);
      return li;
    }

    var link = document.createElement('a');
    var sr = document.createElement('span');
    sr.className = 'visually-hidden';

    if (hasLink) {
      link.className = 'offer__link';
      link.href = offer.url;
      link.target = '_blank';
      // noreferrer намеренно нет: партнёрки часто считают переход по Referer,
      // и он молча обнулил бы комиссию
      link.rel = 'noopener nofollow sponsored';
      link.appendChild(document.createTextNode(label));
      // Видимый текст называет действие, скрытый хвост — продукт, банк и
      // предупреждение о новой вкладке: иначе на странице сорок ссылок с
      // одинаковым именем «Оформить карту». Хвост начинается с запятой:
      // при подробной пунктуации тире зачитывается словом «тире».
      sr.textContent = ', ' + offer.title + ', ' + offer.partner +
        '. Откроется в новой вкладке';
    } else {
      // Ссылка партнёра ещё не вставлена. Ведём на форму заявки, а не на «#»:
      // мёртвая кнопка, которая обещает переход к банку, хуже честной.
      link.className = 'offer__link offer__link--soft';
      link.href = '#lead';
      link.appendChild(document.createTextNode(label));
      sr.textContent = ', ' + offer.title + ', ' + offer.partner +
        '. Форма ниже на странице';
    }

    link.appendChild(sr);
    link.insertAdjacentHTML('beforeend',
      '<svg class="btn__arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
      '<path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>');

    cta.appendChild(link);
    li.appendChild(cta);

    return li;
  }

  /* ── витрина в герое ──────────────────────────────────────────────── */
  (function renderStack() {
    var stack = document.getElementById('hero-stack');
    if (!stack) return;

    // по одной карточке из разных разделов — чтобы витрина показывала,
    // что каталог не про один продукт
    var picked = [];
    cats.forEach(function (c) {
      if (picked.length >= 3) return;
      var first = offers.filter(function (o) { return o.cat === c.id; })[0];
      if (first) picked.push(first);
    });
    while (picked.length < 3 && offers[picked.length]) picked.push(offers[picked.length]);

    picked.forEach(function (o) {
      stack.appendChild(buildOffer(o, { decorative: true, instant: true }));
    });
  })();

  /* ── каталог ──────────────────────────────────────────────────────── */
  var grid = document.getElementById('offers-grid');
  var countEl = document.getElementById('offers-count');
  var statusEl = document.getElementById('offers-status');
  var emptyEl = document.getElementById('offers-empty');
  var filtersRow = document.getElementById('filters');
  var pendingNote = document.getElementById('offers-pending');
  var searchEl = document.getElementById('offers-search');
  var clearEl = document.getElementById('search-clear');

  var currentCat = 'all';
  var query = '';
  var lastSpoken = '';
  var MIN_QUERY = 2;   // по одной букве объявлять счёт бессмысленно

  // «ё» приводим к «е» с обеих сторон: иначе «Заём» не находится по «заем»
  function norm(s) {
    return String(s || '').toLowerCase().replace(/ё/g, 'е');
  }

  function matches(offer) {
    if (!query) return true;
    var hay = norm(offer.partner + ' ' + offer.title + ' ' + (offer.tag || ''));
    // каждое слово запроса должно найтись: «альфа карта» находит «Альфа-Карта»
    return query.split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  function visible() {
    return offers.filter(function (o) {
      return (currentCat === 'all' || o.cat === currentCat) && matches(o);
    });
  }

  function countText(list) {
    var label = catById(currentCat);
    var where = currentCat === 'all' ? '' : ' в разделе «' + (label ? label.label : currentCat) + '»';
    var forQuery = query ? ' по запросу «' + query + '»' : '';

    if (!list.length) {
      return 'Ничего не нашлось' + forQuery + where;
    }
    return list.length + ' ' +
      plural(list.length, 'предложение', 'предложения', 'предложений') +
      forQuery + (where || (query ? '' : ' во всех разделах'));
  }

  /* opts: instant — показать карточки без анимации появления,
            announce — записать итог в живой регион,
            source — кто позвал: 'filter' | 'search' | 'init'.
     Это три разных решения, и склеивать их в один флаг нельзя: поиску нужна
     мгновенная отрисовка на каждую букву, но объявление — только раз в конце. */
  function render(opts) {
    if (!grid) return;
    opts = opts || {};
    var list = visible();

    // Если фокус стоял внутри перерисовываемой сетки, его надо вернуть руками:
    // иначе он уедет на <body> и следующий Tab начнётся с начала документа
    var hadFocus = grid.contains(document.activeElement);

    var frag = document.createDocumentFragment();
    list.forEach(function (offer) {
      frag.appendChild(buildOffer(offer, { instant: !!opts.instant }));
    });
    grid.replaceChildren(frag);

    if (emptyEl) {
      emptyEl.textContent = query
        ? 'По запросу ничего не нашлось. Проверьте написание или очистите поиск — в каталоге есть и другие разделы.'
        : 'В этом разделе пока нет предложений. Загляните в другие или оставьте заявку на подбор.';
      emptyEl.hidden = list.length > 0;
    }

    var text = countText(list);
    if (countEl) countEl.textContent = text;

    // Озвучиваем только по действию человека и только если строка изменилась:
    // иначе повторное нажатие активного фильтра объявит счётчик заново.
    // Название раздела и запрос в строке обязательны — без них два разных
    // отбора с одинаковым числом дали бы одинаковый текст, и регион промолчал.
    if (statusEl) {
      if (opts.announce) {
        if (text !== lastSpoken) {
          lastSpoken = text;
          statusEl.textContent = text;
        }
      } else if (opts.source === 'init') {
        // Первую, немую отрисовку запоминаем: иначе нажатие на уже выбранный
        // фильтр объявило бы ровно то, что и так на экране. Промежуточные
        // немые отрисовки поиска строку НЕ запоминают — иначе отложенное
        // объявление потом решило бы, что говорить нечего.
        lastSpoken = text;
      }
    }

    if (!opts.instant) observeReveals(grid);

    // Фокус возвращаем только после кнопки фильтра. После поиска этого делать
    // нельзя: отложенный таймер мог бы выдернуть фокус из карточки, куда
    // человек уже ушёл табуляцией. preventScroll — иначе страница прыгает
    // на высоту липкой панели при каждом нажатии.
    if (hadFocus && opts.source === 'filter') {
      var back = document.querySelector('.filter[aria-pressed="true"]') ||
                 document.getElementById('offers');
      if (back && back.focus) back.focus({ preventScroll: true });
    }
  }

  function syncFilters() {
    if (!filtersRow) return;
    filtersRow.querySelectorAll('.filter').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.cat === currentCat));
    });
  }

  (function renderFilters() {
    if (!filtersRow) return;

    var all = [{ id: 'all', label: 'Всё сразу' }].concat(cats);

    all.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter';
      btn.dataset.cat = cat.id;

      // Пробел текстовым узлом, а не отступом в CSS: иначе имя кнопки
      // склеивается в «Займы15»
      btn.appendChild(document.createTextNode(cat.label + ' '));

      // Число — часть имени кнопки, скрывать его нельзя: «Займы, 15»
      var n = document.createElement('span');
      n.className = 'filter__num';
      n.textContent = cat.id === 'all' ? offers.length : countIn(cat.id);
      btn.appendChild(n);

      btn.addEventListener('click', function () {
        currentCat = cat.id;
        syncFilters();
        render({ instant: true, announce: true, source: 'filter' });
      });

      filtersRow.appendChild(btn);
    });

    syncFilters();
  })();

  /* ── поиск ────────────────────────────────────────────────────────── */
  (function initSearch() {
    if (!searchEl) return;

    var timer = null;

    /* Два решения с разными сроками. Сетку перерисовываем на каждую букву —
       глазам нужен мгновенный отклик. Живой регион трогаем только через 800 мс
       тишины: NVDA и JAWS копят очередь polite, и шесть букв дали бы шесть
       фраз подряд с отставанием речи на секунды. 800 мс — верхняя граница
       обычной паузы внутри слова при небыстром наборе. */
    function paint() {
      query = norm(searchEl.value).trim();
      if (clearEl) clearEl.hidden = !searchEl.value;
      render({ instant: true, source: 'search' });
    }

    function speak() {
      // Одну букву не объявляем: счёт по ней всё равно ничего не значит
      if (query && query.length < MIN_QUERY) return;
      render({ instant: true, announce: true, source: 'search' });
    }

    searchEl.addEventListener('input', function (e) {
      // Предиктивный ввод: пока слово ещё набирается системой, промежуточные
      // события игнорируем, итог придёт в compositionend
      if (e.isComposing) return;
      paint();
      clearTimeout(timer);
      timer = setTimeout(speak, 800);
    });

    searchEl.addEventListener('compositionend', function () {
      paint();
      clearTimeout(timer);
      timer = setTimeout(speak, 800);
    });

    // В WebKit Escape и родной крестик чистят поле мимо события input:
    // без этого поле выглядело бы пустым при отфильтрованном старым
    // запросом списке
    searchEl.addEventListener('search', function () {
      clearTimeout(timer);
      paint();
      speak();
    });

    searchEl.addEventListener('keydown', function (e) {
      // Формы вокруг поля нет, отправлять некуда — Enter просто досрочно
      // объявляет результат
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(timer);
        paint();
        render({ instant: true, announce: true, source: 'search' });
      }
      if (e.key === 'Escape' && searchEl.value) {
        e.preventDefault();
        searchEl.value = '';
        clearTimeout(timer);
        paint();
        render({ instant: true, announce: true, source: 'search' });
      }
    });

    if (clearEl) {
      clearEl.addEventListener('click', function () {
        searchEl.value = '';
        clearTimeout(timer);
        // Фокус переводим в поле ДО того, как кнопка спрячется: иначе фокус
        // останется на исчезнувшем элементе и уедет на <body>
        searchEl.focus();
        paint();
        render({ instant: true, announce: true, source: 'search' });
      });
    }
  })();

  if (grid) render({ source: 'init' });

  // Пока партнёрские ссылки не вставлены, честно говорим об этом один раз над
  // каталогом, а не сорока подписями в карточках
  if (pendingNote) {
    var pending = offers.filter(function (o) { return !realLink(o.url); }).length;
    if (pending) {
      pendingNote.textContent = pending === offers.length
        ? 'Партнёрские ссылки ещё не подключены — пока кнопки карточек ведут на форму заявки.'
        : 'У ' + pending + ' ' + plural(pending, 'предложения', 'предложений', 'предложений') +
          ' ссылка партнёра ещё не подключена — их кнопки ведут на форму заявки.';
      pendingNote.hidden = false;
    }
  }

  /* ── аккордеон вопросов ───────────────────────────────────────────── */
  document.querySelectorAll('.faq__q').forEach(function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;

    // Свой обработчик Enter/Space настоящей кнопке не нужен: он сдвоился бы
    // с синтетическим click, и панель открывалась бы и тут же закрывалась
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
  });

  // Escape — на контейнере: панель не фокусируется, нажатие приходит на
  // кнопку, которая панели соседка, а не родитель
  var faqList = document.getElementById('faq-list');
  if (faqList) {
    faqList.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var item = e.target.closest ? e.target.closest('.faq__item') : null;
      if (!item) return;
      var btn = item.querySelector('.faq__q');
      if (!btn || btn.getAttribute('aria-expanded') !== 'true') return;
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
      btn.focus();
    });
  }

  /* ── форма заявки ─────────────────────────────────────────────────── */
  (function initForm() {
    var form = document.getElementById('lead-form');
    if (!form) return;

    var summary = document.getElementById('form-summary');
    var summaryTitle = document.getElementById('form-summary-title');
    var summaryList = document.getElementById('form-summary-list');
    var success = document.getElementById('form-success');

    var rules = [
      {
        id: 'lead-name',
        label: 'Как к вам обращаться',
        test: function (v) { return v.trim().length >= 2; },
        message: 'введите имя, минимум две буквы'
      },
      {
        id: 'lead-contact',
        label: 'Телеграм или телефон',
        test: function (v) { return /^@?[\w.+\-() ]{4,}$/.test(v.trim()); },
        message: 'укажите телеграм (@name) или номер телефона'
      },
      {
        id: 'lead-topic',
        label: 'Что интересует',
        test: function (v) { return v !== ''; },
        message: 'выберите раздел из списка'
      },
      {
        id: 'lead-consent',
        label: 'Я даю согласие на обработку имени и контакта',
        test: function (v, el) { return el.checked; },
        message: 'без согласия мы не сможем ответить на заявку'
      }
    ];

    function setError(rule, show) {
      var field = document.getElementById(rule.id);
      var errorBox = document.getElementById(rule.id + '-error');

      if (show) {
        field.setAttribute('aria-invalid', 'true');
        errorBox.textContent = rule.message.charAt(0).toUpperCase() + rule.message.slice(1);
        errorBox.hidden = false;
      } else {
        field.removeAttribute('aria-invalid');
        // Текст стираем, а не только прячем: описание из aria-describedby
        // иначе протекало бы в поле и после исправления
        errorBox.textContent = '';
        errorBox.hidden = true;
      }
    }

    function dropFromSummary(rule) {
      if (!summaryList) return;
      var li = summaryList.querySelector('[data-rule="' + rule.id + '"]');
      if (li && li.parentNode) li.parentNode.removeChild(li);
      // Опустевшую сводку прячем, но фокус не двигаем: человек в этот момент
      // печатает в поле
      if (summary && !summaryList.children.length) summary.hidden = true;
    }

    // Ошибку убираем сразу, как только поле исправили
    rules.forEach(function (rule) {
      var field = document.getElementById(rule.id);
      function recheck() {
        if (field.getAttribute('aria-invalid') === 'true' && rule.test(field.value, field)) {
          setError(rule, false);
          dropFromSummary(rule);
        }
      }
      field.addEventListener('input', recheck);
      field.addEventListener('change', recheck);
    });

    // Человек пришёл сюда кнопкой карточки — подставим раздел заранее
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('.offer__link--soft') : null;
      if (!link || link.tagName !== 'A') return;
      var card = link.closest('.offer');
      var tag = card && card.querySelector('.offer__tag');
      if (!tag) return;
      var map = { 'займ': 'loans', 'дебетовая карта': 'debit',
                  'кредитная карта': 'credit', 'карта рассрочки': 'credit',
                  'кредит наличными': 'cash' };
      var topic = document.getElementById('lead-topic');
      var want = map[tag.textContent.trim().toLowerCase()];
      if (topic && want && !topic.value) topic.value = want;
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var failed = rules.filter(function (rule) {
        var field = document.getElementById(rule.id);
        var ok = rule.test(field.value, field);
        setError(rule, !ok);
        return !ok;
      });

      if (failed.length) {
        summaryTitle.textContent = 'Форма не отправлена: ' + failed.length + ' ' +
          plural(failed.length, 'ошибка', 'ошибки', 'ошибок') + ' в полях';

        summaryList.textContent = '';
        failed.forEach(function (rule) {
          var li = document.createElement('li');
          li.dataset.rule = rule.id;
          var a = document.createElement('a');
          a.href = '#' + rule.id;
          // Подпись в ссылке совпадает с видимой подписью поля — иначе человек
          // ищет глазами не ту строку
          a.textContent = rule.label + ' — ' + rule.message;
          a.addEventListener('click', function (e) {
            // Глушим только обычный клик: Cmd/Ctrl-клик и средняя кнопка
            // должны работать как обычно
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            var field = document.getElementById(rule.id);
            if (!field) return;
            e.preventDefault();
            field.focus();
          });
          li.appendChild(a);
          summaryList.appendChild(li);
        });

        summary.hidden = false;   // снимать hidden нужно ДО focus()
        success.hidden = true;
        summary.focus();
        return;
      }

      summary.hidden = true;

      // Никакого «заявка отправлена» без отправки: собираем готовое сообщение
      // и открываем телеграм. Человек видит ровно то, что произошло.
      var topicSelect = document.getElementById('lead-topic');
      var comment = document.getElementById('lead-comment').value.trim();
      var text =
        'Заявка с сайта ' + (site.brand || 'СВОДКА') + '\n' +
        'Имя: ' + document.getElementById('lead-name').value.trim() + '\n' +
        'Контакт: ' + document.getElementById('lead-contact').value.trim() + '\n' +
        'Интересует: ' + topicSelect.options[topicSelect.selectedIndex].text +
        (comment ? '\nКомментарий: ' + comment : '');

      var chat = String(site.telegram || '').trim();
      if (!/^https?:\/\//i.test(chat)) {
        // Телеграм в панели ещё не заполнен — честно говорим об этом вместо
        // того, чтобы открывать пустую вкладку
        success.textContent = 'Контакт для заявок пока не указан. Форма заработает, ' +
          'как только владелец сайта впишет свой телеграм в панели управления.';
        success.hidden = false;
        success.focus();
        return;
      }

      chat += '?text=' + encodeURIComponent(text);

      // Без строки features: window.open(url, '_blank', 'noopener') по
      // спецификации всегда возвращает null, и проверить, не заблокировал ли
      // браузер вкладку, стало бы невозможно
      var win = window.open(chat, '_blank');
      if (win) { try { win.opener = null; } catch (e) { /* кросс-origin */ } }

      success.textContent = '';
      success.appendChild(document.createTextNode(win
        ? 'Открыли телеграм с готовым сообщением — осталось нажать «Отправить». Если вкладка не открылась, '
        : 'Браузер заблокировал новую вкладку. '));

      var manual = document.createElement('a');
      manual.href = chat;
      manual.target = '_blank';
      manual.rel = 'noopener';
      manual.textContent = win ? 'откройте чат вручную' : 'Откройте чат в телеграме';
      success.appendChild(manual);
      success.appendChild(document.createTextNode('.'));

      // Данные не стираем: сообщение ещё не отправлено, они могут понадобиться
      success.hidden = false;
      success.focus();
    });
  })();

  /* ── появление при прокрутке ──────────────────────────────────────── */
  var revealObserver = null;

  function observeReveals(scope) {
    var nodes = (scope || document).querySelectorAll('.reveal:not(.is-visible)');

    if (motionQuery.matches || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) { n.classList.add('is-visible'); });
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry, i) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.style.transitionDelay = Math.min(i * 55, 220) + 'ms';
          el.classList.add('is-visible');
          revealObserver.unobserve(el);
        });
      }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    }

    nodes.forEach(function (n) { revealObserver.observe(n); });
  }

  observeReveals(document);

  // Страховка от «фокус внутри невидимого блока». Идём по всей цепочке
  // предков и обнуляем задержку: иначе вложенные блоки перемножают
  // прозрачности, а спасённый элемент остаётся невидимым почти секунду
  document.addEventListener('focusin', function (e) {
    if (!e.target.closest) return;
    var el = e.target.closest('.reveal:not(.is-visible)');
    while (el) {
      el.style.transitionDelay = '0ms';
      el.classList.add('is-visible');
      el = el.parentElement && el.parentElement.closest('.reveal:not(.is-visible)');
    }
  });

  /* ── высота липкого хрома ─────────────────────────────────────────── */
  /* Шапка и панель фильтров рисуются поверх страницы, но её видимую высоту
     не уменьшают: браузер при табуляции об этом не знает и подводит элемент
     ровно под них (2.4.11). Резерв задаётся только через scroll-padding-top,
     а высоту надо мерить — кнопки фильтров приходят из data.js, и строка
     переносится по-разному. */
  (function stickyChrome() {
    var header = document.querySelector('.site-header');
    var toolbar = document.getElementById('toolbar');
    if (!header) return;

    var stick = header.offsetHeight;

    function measure() {
      var h = header.offsetHeight;
      // Панель липнет не всегда: на низком экране медиазапрос её отпускает
      if (toolbar && getComputedStyle(toolbar).position === 'sticky') {
        h += toolbar.offsetHeight + 8;
      }
      stick = h;
      document.documentElement.style.setProperty('--stick-h', h + 'px');
    }
    measure();

    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(measure);
      ro.observe(header);
      if (toolbar) ro.observe(toolbar);
    }
    // resize ловит зум и поворот экрана, которых ResizeObserver может не дать
    window.addEventListener('resize', measure);

    // scroll-padding работает, только когда браузер сам прокручивает. При
    // программном focus() и при схлопывании списка прокрутки нет — элемент
    // остаётся под панелью. Этот обработчик стоит ПОСЛЕ того, что снимает
    // .reveal: до него getBoundingClientRect врёт на высоту сдвига.
    document.addEventListener('focusin', function (e) {
      var el = e.target;
      if (!el || !el.getBoundingClientRect || !el.closest) return;
      // Сам липкий хром догонять не надо — он и так всегда наверху
      if (el.closest('.site-header, .toolbar, .skip-link')) return;

      var top = el.getBoundingClientRect().top;
      var limit = stick + 12;
      if (top >= limit) return;
      // behavior:'auto' намеренно: плавная прокрутка html дерётся с этой
      // и оставляет элемент на полпути
      window.scrollBy({ top: top - limit, left: 0, behavior: 'auto' });
    });
  })();

})();
