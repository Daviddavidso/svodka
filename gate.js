/* ==========================================================================
   ВХОД В АДМИНКУ.

   Пароль спрашивается при КАЖДОМ открытии страницы: на старте модуль гасит
   старую сессию (logout) и держит редактор скрытым, пока api.php не примет
   пароль. Черновики это не трогает — они живут в localStorage и переживают
   и перезагрузку, и выход.

   Если страницу открыли не с сайта (нет api.php — локальный файл, хостинг
   без PHP), проверять пароль не у кого, а публикация всё равно не работает:
   гейт честно говорит об этом и выпускает в редактор без пароля.
   ========================================================================== */

(function () {
  'use strict';

  var gate = document.getElementById('gate');
  if (!gate) return;
  /* Другие модули по этому флагу понимают, что вход идёт через гейт:
     например, «Выйти» после выхода возвращает на экран входа. */
  window.PANEL_GATE = true;

  var API = 'api.php';
  var form = document.getElementById('gate-form');
  var pass = document.getElementById('gate-pass');
  var err = document.getElementById('gate-pass-err');
  var eye = document.getElementById('gate-eye');
  var ok = document.getElementById('gate-ok');
  var busy = false;
  var slowTimer = 0;

  /* Живые области оболочки существуют с загрузки — пишем в них, свои не плодим. */
  function say(text, assertive) {
    var node = document.getElementById(assertive ? 'a-alert' : 'a-status');
    if (!node) return;
    node.textContent = '';
    /* Пустой такт: одинаковый текст подряд иначе не объявляется. */
    setTimeout(function () { node.textContent = text; }, 80);
  }

  function api(action, payload, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms || 20000);
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ action: action }, payload || {})),
      credentials: 'same-origin',
      signal: ctrl.signal
    }).then(function (res) {
      var isJson = (res.headers.get('content-type') || '').indexOf('application/json') !== -1;
      if (!isJson) return { status: res.status, ok: false, data: {}, notApi: true };
      return res.json().catch(function () { return {}; }).then(function (d) {
        return { status: res.status, ok: res.ok, data: d };
      });
    }).finally(function () { clearTimeout(timer); });
  }

  function fail(msg) {
    pass.setAttribute('aria-invalid', 'true');
    err.textContent = 'Ошибка: ' + msg;
    pass.focus();
    pass.select();
  }

  function setBusy(on) {
    busy = on;
    ok.setAttribute('aria-disabled', on ? 'true' : 'false');
    clearTimeout(slowTimer);
    if (on) slowTimer = setTimeout(function () { say('Проверяю пароль…'); }, 800);
  }

  function unlock(note) {
    document.title = 'Панель управления — СВОДКА';
    /* Прячем, а не удаляем: когда сессия истечёт, экран входа понадобится
       снова — без перезагрузки и без потери того, что открыто в редакторе. */
    gate.hidden = true;
    document.querySelectorAll('.skip-link, .admin-header, #main').forEach(function (n) {
      n.hidden = false;
    });
    say(note || 'Вход выполнен.');
    var main = document.getElementById('main');
    if (main) main.focus();
    /* Панель ждёт этого события, чтобы досказать своё: сообщение, объявленное
       при загрузке, человек за экраном входа всё равно не услышал бы. */
    document.dispatchEvent(new CustomEvent('panel:unlocked'));
  }

  /* Обратный путь: сессия истекла посреди работы. Редактор прячем, экран
     входа возвращаем, причину пишем в ошибку поля — она в его описании,
     и фокус в поле прочитает её сам. */
  function lock(reason) {
    document.title = 'Вход — Панель управления — СВОДКА';
    document.querySelectorAll('.skip-link, .admin-header, #main').forEach(function (n) {
      n.hidden = true;
    });
    gate.hidden = false;
    pass.value = '';
    if (reason) fail(reason); else pass.focus();
  }
  window.PANEL = window.PANEL || {};
  window.PANEL.lock = lock;

  /* Старую сессию гасим сразу — пароль нужен при каждом входе. Заодно это
     проверка, что api.php вообще есть: без него пароль спрашивать не у кого. */
  api('logout', null, 15000).then(function (res) {
    if (res.notApi) {
      unlock('Страница открыта не с сайта: вход не нужен, но и сохранение на сайт работать не будет.');
    }
  }).catch(function () { /* сети нет — гейт остаётся, ошибку покажет отправка */ });

  pass.focus();

  /* Имя кнопки постоянное, состояние — в aria-pressed: пара «меняющееся имя
     + aria-pressed» читалась бы наоборот. */
  eye.addEventListener('click', function () {
    var shown = pass.type === 'text';
    var a = pass.selectionStart, b = pass.selectionEnd;
    pass.type = shown ? 'password' : 'text';
    eye.setAttribute('aria-pressed', shown ? 'false' : 'true');
    try { pass.setSelectionRange(a, b); } catch (e) { /* не все типы дают */ }
    pass.focus();
  });

  pass.addEventListener('input', function () {
    pass.removeAttribute('aria-invalid');
    err.textContent = '';
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var value = pass.value.trim();
    if (!value) { fail('введите пароль.'); return; }

    setBusy(true);
    api('login', { password: value }, 20000).then(function (res) {
      setBusy(false);
      if (res.ok && res.data.ok) { unlock(); return; }
      if (res.notApi) {
        unlock('Страница открыта не с сайта: вход не нужен, но и сохранение на сайт работать не будет.');
        return;
      }
      /* Ошибка одного поля: текст рядом с полем и фокус туда же. В живую
         область не дублируем — прозвучало бы дважды. */
      fail((res.data && res.data.error) || 'пароль не подошёл. Проверьте раскладку и заглавные буквы.');
    }).catch(function () {
      setBusy(false);
      fail('нет связи с сайтом. Проверьте интернет и попробуйте ещё раз.');
    });
  });
})();
