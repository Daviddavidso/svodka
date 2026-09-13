/* ═════════════════════════════════════════════════════════════════════════
   КАТАЛОГ «СВОДКА» — единственный файл с содержимым сайта.

   Правится через panel.html (панель управления). Руками тоже можно, но при
   следующем сохранении из панели правки будут перезаписаны.

   cat       — раздел: loans | debit | credit | cash
   partner   — банк или МФО, стоит рядом с логотипом
   tag       — мелкая плашка под названием банка: «займ», «кредитная карта»
   title     — название продукта, это заголовок карточки
   headline  — крупная строка выгоды
   note      — подпись под ней
   specs     — условия парами «название: значение»
   url       — партнёрская ссылка. ПУСТО — кнопка ведёт на форму заявки,
               а не в никуда. Вставили ссылку — карточка сама начинает
               открывать сайт партнёра в новой вкладке.
   logo      — файл логотипа из img/logos/. Пусто — плашка с инициалами.
   tone      — цвет плашки с инициалами и цветной полоски карточки.

   ВАЖНО ПРО ЦИФРЫ. Ставок, лимитов, сроков и процентов здесь намеренно нет:
   их даёт партнёрка по каждому офферу отдельно. Пока цифры не подтверждены,
   писать их нельзя — это недостоверная реклама, и отвечает за неё
   распространитель, то есть владелец сайта. Пришли условия от партнёрки —
   впишите их в headline и specs через панель.
   ═════════════════════════════════════════════════════════════════════════ */

const SITE = {
  "brand": "СВОДКА",
  "tagline": "Финансовые предложения банков и МФО — одним списком",
  /* Телеграм для заявок: форма собирает готовое сообщение и открывает этот
     чат, поэтому сервер ей не нужен. ЗАМЕНИТЕ НА СВОЙ НИК. */
  "telegram": "https://t.me/svodka_offers"
};

/* cta — надпись на кнопках карточек этого раздела. Разная по разделам
   намеренно: одинаковое «Перейти» на сорока карточках делает список ссылок
   в скринридере нечитаемым. */
const CATEGORIES = [
  { "id": "loans",  "label": "Займы",             "cta": "Получить деньги" },
  { "id": "debit",  "label": "Дебетовые карты",   "cta": "Оформить карту" },
  { "id": "credit", "label": "Кредитные карты",   "cta": "Оформить карту" },
  { "id": "cash",   "label": "Кредиты наличными", "cta": "Отправить заявку" }
];

const OFFERS = [
  /* ─────────────────────────── ЗАЙМЫ / МФО ─────────────────────────── */
  { "cat": "loans", "partner": "Займер", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/zaymer.png", "tone": { "bg": "#FF6B00", "ink": "#14171A" } },

  { "cat": "loans", "partner": "MoneyMan", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/moneyman.png", "tone": { "bg": "#12A0E8", "ink": "#14171A" } },

  { "cat": "loans", "partner": "Webbankir", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/webbankir.png", "tone": { "bg": "#1B7A3E", "ink": "#FFFFFF" } },

  { "cat": "loans", "partner": "ЕКапуста", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/ekapusta.png", "tone": { "bg": "#3AAA35", "ink": "#14171A" } },

  { "cat": "loans", "partner": "Турбозайм", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/turbozaim.svg", "tone": { "bg": "#FF6A13", "ink": "#14171A" } },

  { "cat": "loans", "partner": "Лайм-Займ", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/limezaim.png", "tone": { "bg": "#8DC63F", "ink": "#14171A" } },

  { "cat": "loans", "partner": "До зарплаты", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/dozarplati.png", "tone": { "bg": "#E4002B", "ink": "#FFFFFF" } },

  { "cat": "loans", "partner": "Быстроденьги", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/bistrodengi.png", "tone": { "bg": "#F58220", "ink": "#14171A" } },

  { "cat": "loans", "partner": "Деньги сразу", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/dengisrazu.png", "tone": { "bg": "#E31E24", "ink": "#FFFFFF" } },

  { "cat": "loans", "partner": "МигКредит", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/migcredit.png", "tone": { "bg": "#E30613", "ink": "#FFFFFF" } },

  { "cat": "loans", "partner": "Kviku", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/kviku.png", "tone": { "bg": "#6C3CE1", "ink": "#FFFFFF" } },

  { "cat": "loans", "partner": "Свои люди", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/svoiludi.png", "tone": { "bg": "#2E7D32", "ink": "#FFFFFF" } },

  { "cat": "loans", "partner": "Умные наличные", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/smartcash.svg", "tone": { "bg": "#0F9D58", "ink": "#14171A" } },

  { "cat": "loans", "partner": "Max.Credit", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/maxcredit.png", "tone": { "bg": "#7B1FA2", "ink": "#FFFFFF" } },

  { "cat": "loans", "partner": "CreditPlus", "tag": "займ", "title": "Займ на карту",
    "headline": "Деньги на карту", "note": "",
    "url": "", "logo": "img/logos/creditplus.png", "tone": { "bg": "#0E4C92", "ink": "#FFFFFF" } },

  /* ───────────────────────── ДЕБЕТОВЫЕ КАРТЫ ───────────────────────── */
  { "cat": "debit", "partner": "Т-Банк", "tag": "дебетовая карта", "title": "Карта Black",
    "headline": "Карта с кэшбэком", "note": "",
    "url": "", "logo": "img/logos/tbank.png", "tone": { "bg": "#FFDD2D", "ink": "#14171A" } },

  { "cat": "debit", "partner": "Альфа-Банк", "tag": "дебетовая карта", "title": "Альфа-Карта",
    "headline": "Карта с кэшбэком", "note": "",
    "url": "", "logo": "img/logos/alfabank.png", "tone": { "bg": "#EF3124", "ink": "#FFFFFF" } },

  { "cat": "debit", "partner": "Ozon Банк", "tag": "дебетовая карта", "title": "Карта Ozon",
    "headline": "Карта с кэшбэком", "note": "",
    "url": "", "logo": "img/logos/ozon.png", "tone": { "bg": "#005BFF", "ink": "#FFFFFF" } },

  { "cat": "debit", "partner": "ВТБ", "tag": "дебетовая карта", "title": "Дебетовая карта",
    "headline": "Карта с кэшбэком", "note": "",
    "url": "", "logo": "img/logos/vtb.png", "tone": { "bg": "#0A2973", "ink": "#FFFFFF" } },

  { "cat": "debit", "partner": "Газпромбанк", "tag": "дебетовая карта", "title": "Дебетовая карта",
    "headline": "Карта с кэшбэком", "note": "",
    "url": "", "logo": "img/logos/gazprombank.png", "tone": { "bg": "#0A5296", "ink": "#FFFFFF" } },

  { "cat": "debit", "partner": "Почта Банк", "tag": "дебетовая карта", "title": "Дебетовая карта",
    "headline": "Карта с кэшбэком", "note": "",
    "url": "", "logo": "img/logos/pochtabank.png", "tone": { "bg": "#002D72", "ink": "#FFFFFF" } },

  { "cat": "debit", "partner": "МТС Банк", "tag": "дебетовая карта", "title": "Дебетовая карта",
    "headline": "Карта с кэшбэком", "note": "",
    "url": "", "logo": "img/logos/mtsbank.png", "tone": { "bg": "#E30611", "ink": "#FFFFFF" } },

  { "cat": "debit", "partner": "ОТП Банк", "tag": "дебетовая карта", "title": "Дебетовая карта",
    "headline": "Карта с кэшбэком", "note": "",
    "url": "", "logo": "img/logos/otp.png", "tone": { "bg": "#52AE30", "ink": "#14171A" } },

  { "cat": "debit", "partner": "ПСБ", "tag": "дебетовая карта", "title": "Дебетовая карта",
    "headline": "Карта с кэшбэком", "note": "",
    "url": "", "logo": "img/logos/psb.png", "tone": { "bg": "#EE7203", "ink": "#14171A" } },

  /* ───────────────────────── КРЕДИТНЫЕ КАРТЫ ───────────────────────── */
  { "cat": "credit", "partner": "Т-Банк", "tag": "кредитная карта", "title": "Карта Платинум",
    "headline": "Карта с льготным периодом", "note": "",
    "url": "", "logo": "img/logos/tbank.png", "tone": { "bg": "#FFDD2D", "ink": "#14171A" } },

  { "cat": "credit", "partner": "Альфа-Банк", "tag": "кредитная карта", "title": "Кредитная карта",
    "headline": "Карта с льготным периодом", "note": "",
    "url": "", "logo": "img/logos/alfabank.png", "tone": { "bg": "#EF3124", "ink": "#FFFFFF" } },

  { "cat": "credit", "partner": "Сбербанк", "tag": "кредитная карта", "title": "Кредитная СберКарта",
    "headline": "Карта с льготным периодом", "note": "",
    "url": "", "logo": "img/logos/sberbank.png", "tone": { "bg": "#21A038", "ink": "#14171A" } },

  { "cat": "credit", "partner": "Совкомбанк", "tag": "карта рассрочки", "title": "Халва",
    "headline": "Покупки в рассрочку", "note": "срок рассрочки — по условиям магазина-партнёра",
    "url": "", "logo": "img/logos/halva.png", "tone": { "bg": "#6E2B8B", "ink": "#FFFFFF" } },

  { "cat": "credit", "partner": "Газпромбанк", "tag": "кредитная карта", "title": "Кредитная карта",
    "headline": "Карта с льготным периодом", "note": "",
    "url": "", "logo": "img/logos/gazprombank.png", "tone": { "bg": "#0A5296", "ink": "#FFFFFF" } },

  { "cat": "credit", "partner": "УБРиР", "tag": "кредитная карта", "title": "Кредитная карта",
    "headline": "Карта с льготным периодом", "note": "",
    "url": "", "logo": "img/logos/ubrir.png", "tone": { "bg": "#005BAA", "ink": "#FFFFFF" } },

  { "cat": "credit", "partner": "Ренессанс Банк", "tag": "кредитная карта", "title": "Кредитная карта",
    "headline": "Карта с льготным периодом", "note": "",
    "url": "", "logo": "img/logos/rencredit.png", "tone": { "bg": "#E4002B", "ink": "#FFFFFF" } },

  { "cat": "credit", "partner": "Русский Стандарт", "tag": "кредитная карта", "title": "Кредитная карта",
    "headline": "Карта с льготным периодом", "note": "",
    "url": "", "logo": "img/logos/rsb.png", "tone": { "bg": "#C8102E", "ink": "#FFFFFF" } },

  { "cat": "credit", "partner": "Райффайзен Банк", "tag": "кредитная карта", "title": "Кредитная карта",
    "headline": "Карта с льготным периодом", "note": "",
    "url": "", "logo": "img/logos/raiffeisen.png", "tone": { "bg": "#FEE600", "ink": "#14171A" } },

  /* ──────────────────────── КРЕДИТЫ НАЛИЧНЫМИ ──────────────────────── */
  { "cat": "cash", "partner": "Сбербанк", "tag": "кредит наличными", "title": "Кредит наличными",
    "headline": "Заявка онлайн", "note": "",
    "url": "", "logo": "img/logos/sberbank.png", "tone": { "bg": "#21A038", "ink": "#14171A" } },

  { "cat": "cash", "partner": "ВТБ", "tag": "кредит наличными", "title": "Кредит наличными",
    "headline": "Заявка онлайн", "note": "",
    "url": "", "logo": "img/logos/vtb.png", "tone": { "bg": "#0A2973", "ink": "#FFFFFF" } },

  { "cat": "cash", "partner": "Альфа-Банк", "tag": "кредит наличными", "title": "Кредит наличными",
    "headline": "Заявка онлайн", "note": "",
    "url": "", "logo": "img/logos/alfabank.png", "tone": { "bg": "#EF3124", "ink": "#FFFFFF" } },

  { "cat": "cash", "partner": "Почта Банк", "tag": "кредит наличными", "title": "Кредит наличными",
    "headline": "Заявка онлайн", "note": "",
    "url": "", "logo": "img/logos/pochtabank.png", "tone": { "bg": "#002D72", "ink": "#FFFFFF" } },

  { "cat": "cash", "partner": "Совкомбанк", "tag": "кредит наличными", "title": "Кредит наличными",
    "headline": "Заявка онлайн", "note": "",
    "url": "", "logo": "img/logos/sovcombank.png", "tone": { "bg": "#D0021B", "ink": "#FFFFFF" } },

  { "cat": "cash", "partner": "Хоум Банк", "tag": "кредит наличными", "title": "Кредит наличными",
    "headline": "Заявка онлайн", "note": "",
    "url": "", "logo": "img/logos/homecredit.png", "tone": { "bg": "#E4002B", "ink": "#FFFFFF" } }
];

/* Нейтральные условия по разделам. Они проставляются карточкам, у которых
   своих условий ещё нет, — чтобы в карточке не было пустоты, пока партнёрка
   не прислала настоящие цифры. После первого сохранения из панели условия
   встанут в каждую карточку отдельной строкой, и их можно будет править
   поштучно. */
const SPECS_BY_CAT = {
  loans:  [['Оформление', 'онлайн'], ['Решение', 'по анкете кредитора'], ['Ставка и ПСК', 'на сайте кредитора']],
  debit:  [['Оформление', 'онлайн'], ['Доставка', 'курьером или в офисе'], ['Тарифы', 'на сайте банка']],
  credit: [['Оформление', 'онлайн'], ['Решение', 'по анкете банка'], ['Ставка и лимит', 'на сайте банка']],
  cash:   [['Оформление', 'онлайн'], ['Решение', 'по анкете банка'], ['Сумма и срок', 'на сайте банка']]
};

OFFERS.forEach(function (o) {
  if (!o.specs || !o.specs.length) {
    o.specs = (SPECS_BY_CAT[o.cat] || []).map(function (p) { return [p[0], p[1]]; });
  }
});
