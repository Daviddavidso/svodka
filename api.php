<?php
/* ==========================================================================
   БЭКЕНД ПАНЕЛИ УПРАВЛЕНИЯ СВОДКА. Один файл, нужен только PHP.

   Что умеет (все запросы — POST с JSON {action: ...}):
     state     — жив ли бэкенд, есть ли сессия, когда публиковали
     login     — вход по паролю сайта (сессия живёт до закрытия браузера)
     logout    — выход
     publish   — принять собранный панелью data.js и положить на место;
                 прежняя версия прячется рядом, метка ?v= в html обновляется
     rollback  — вернуть прежнюю версию data.js
     zip       — скачать сайт целиком архивом
     password  — сменить пароль панели (нужен текущий)
     leads     — список заявок из leads.csv (только по сессии)
     notify    — телеграм-бот для заявок: токен, одноразовый код подключения,
                 список получателей, отзыв доступа (только по сессии)
     lead      — приём заявки с формы сайта (без пароля): в CSV и в Telegram

   Пароль хранится хэшем bcrypt. Ищется в файле .admin-pass: сначала в
   закрытой папке НАД корнем сайта, потом рядом с api.php; если файла нет —
   берётся хэш, вшитый ниже при сборке. Пароль меняется из самой панели.
   Достать пароль из хэша нельзя, даже если api.php прочитать целиком.

   Служебные файлы (заявки, файлы бота) лежат в папке .svodka-private НАД
   корнем сайта — оттуда их не скачать браузером. Если хостинг не даёт
   писать выше корня, они ложатся рядом с сайтом под защитой .htaccess.
   ========================================================================== */

declare(strict_types=1);

/* Любой warning, напечатанный до JSON, ломает ответ на стороне панели —
   в вывод ничего не пускаем, только в лог хостинга. */
ini_set('display_errors', '0');
ini_set('log_errors', '1');

const DATA_FILE   = 'data.js';       // какой файл переписываем
const MAX_BYTES   = 8388608;         // 8 МБ: картинки могут лежать в файле данных
const LIFETIME    = 0;               // сессия до закрытия браузера: пароль — при каждом входе
const TRY_LIMIT   = 10;              // попыток пароля
const TRY_WINDOW  = 600;             // за 10 минут
const MIN_PASSWORD = 8;

/* Куски, без которых присланный файл считается битым: защита от того,
   чтобы на сайт уехала пустышка или чужой текст. */
const NEEDLES = ['const OFFERS', 'const CATEGORIES'];

/* Хэш пароля, вшитый при сборке. Нужен для хостингов, где над корнем сайта
   по FTP не подняться. Файл .admin-pass, если он есть, главнее. */
const PASS_HASH = '$2y$12$2E4lOQsczwjJlKYRRa0FCOb983XoODKyT.dkU9Pwska4kYP11oB0O';

/* Бот: код подключения живёт полчаса, алфавит без I/O/0/1 — их путают при
   наборе; журнал чужих попыток не растёт бесконечно. */
const TG_CODE_TTL   = 1800;
const TG_ALPHABET   = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TG_DENIED_MAX = 40;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$dir = __DIR__;

/* $_SERVER['HTTPS'] бывает строкой 'off' — по !empty() она «истинна», и cookie
   уехала бы с флагом secure на http-сайт, то есть не сохранилась бы вовсе. */
$https = (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off')
      || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

session_set_cookie_params([
    'lifetime' => LIFETIME,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => $https,
]);
session_name('svodka_admin');
session_start();

/* ---------------------------------------------------------- закрытая папка */

$PRIV = dirname($dir) . '/.svodka-private';
if (!is_dir($PRIV)) @mkdir($PRIV, 0700);
if (!is_dir($PRIV) || !is_writable($PRIV)) $PRIV = $dir;

$LEADS_FILE = $PRIV . '/leads.csv';
$TG_TOKEN_FILE = $PRIV . '/.tg-token';
$TG = [
    'chats'  => $PRIV . '/.tg-chats.json',   // кому слать заявки
    'offset' => $PRIV . '/.tg-offset',       // на чём остановился опрос бота
    'code'   => $PRIV . '/.tg-code',         // одноразовый код подключения
    'denied' => $PRIV . '/.tg-denied.json',  // чужие попытки подключиться
];

/* Переезд со старого места: заявки могли копиться рядом с сайтом. */
if ($PRIV !== $dir && is_file($dir . '/leads.csv') && !is_file($LEADS_FILE)) {
    @rename($dir . '/leads.csv', $LEADS_FILE);
}

/* ---------------------------------------------------------- помощники ---- */

function out(array $data, int $code = 200): never
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function needAuth(): void
{
    if (!isAuthed()) out(['ok' => false, 'error' => 'Нужно войти заново.', 'auth' => false], 401);
}

/* Где может лежать файл с хэшем пароля, по старшинству. */
function passFiles(): array
{
    global $PRIV, $dir;
    $list = [];
    if ($PRIV !== $dir) $list[] = $PRIV . '/.admin-pass';
    $list[] = dirname($dir) . '/.admin-pass';
    $list[] = $dir . '/.admin-pass';
    return $list;
}

function passHash(): string
{
    foreach (passFiles() as $f) {
        if (is_file($f)) {
            $hash = trim((string) file_get_contents($f));
            if ($hash !== '') return $hash;
        }
    }
    return PASS_HASH;
}

function passOk(string $pass): bool
{
    $hash = passHash();
    return $pass !== '' && $hash !== '' && password_verify($pass, $hash);
}

/* Новый хэш пишем туда, где пароль лежит сейчас; файла нет — в закрытую
   папку. После записи проверяем, что именно этот файл теперь и читается:
   иначе пароль «сменился» бы только на словах. */
function passWrite(string $hash): bool
{
    $target = null;
    foreach (passFiles() as $f) if (is_file($f)) { $target = $f; break; }
    /* Файла ещё нет — берём первое место, куда вообще можно писать. */
    if ($target === null) {
        foreach (passFiles() as $f) if (is_writable(dirname($f))) { $target = $f; break; }
    }
    if ($target === null) return false;

    $tmp = $target . '.tmp';
    if (@file_put_contents($tmp, $hash . "\n", LOCK_EX) === false) return false;
    if (!@rename($tmp, $target)) { @unlink($tmp); return false; }
    @chmod($target, 0600);
    return hash_equals($hash, passHash());
}

function isAuthed(): bool
{
    $hash = passHash();
    return $hash !== '' && !empty($_SESSION['ok']) && hash_equals($hash, (string) $_SESSION['ok']);
}

function published(string $dir): array
{
    $f = $dir . '/published.json';
    if (!is_file($f)) return ['at' => null, 'hash' => null];
    $d = json_decode((string) file_get_contents($f), true);
    return is_array($d) ? $d + ['at' => null, 'hash' => null] : ['at' => null, 'hash' => null];
}

function tries(string $dir): array
{
    $f = $dir . '/.login-tries';
    if (!is_file($f)) return ['n' => 0, 'first' => 0];
    $d = json_decode((string) file_get_contents($f), true);
    if (!is_array($d) || time() - (int) ($d['first'] ?? 0) > TRY_WINDOW) return ['n' => 0, 'first' => 0];
    return ['n' => (int) ($d['n'] ?? 0), 'first' => (int) ($d['first'] ?? 0)];
}

function bumpTries(string $dir, array $t): void
{
    $t = ['n' => $t['n'] + 1, 'first' => $t['first'] ?: time()];
    @file_put_contents($dir . '/.login-tries', json_encode($t));
}

/* Все html рядом со скриптом: у метки версии нет смысла знать их имена заранее. */
function htmlPages(string $dir): array
{
    $list = glob($dir . '/*.html') ?: [];
    return array_map('basename', $list);
}

function clean(string $v, int $max): string
{
    $v = (string) preg_replace('/[\x00-\x1F\x7F]/u', ' ', $v);
    return mb_substr(trim($v), 0, $max);
}

/* Как сайт называет себя в сообщениях бота. Домен не хардкодим: до переезда
   на боевой адрес подписывались бы чужим или старым доменом. */
function siteLabel(): string
{
    $h = (string) ($_SERVER['HTTP_HOST'] ?? '');
    $h = (string) preg_replace('/[^a-zA-Z0-9.:\-]/', '', $h);
    return $h !== '' ? $h : 'СВОДКА';
}

/* ---------------------------------------------------------- телеграм ----- */

function tgToken(): string
{
    global $TG_TOKEN_FILE;
    return is_file($TG_TOKEN_FILE) ? trim((string) file_get_contents($TG_TOKEN_FILE)) : '';
}

function tgTokenWrite(string $token): bool
{
    global $TG_TOKEN_FILE;
    if ($token === '') { @unlink($TG_TOKEN_FILE); return !is_file($TG_TOKEN_FILE); }
    $tmp = $TG_TOKEN_FILE . '.tmp';
    if (@file_put_contents($tmp, $token . "\n", LOCK_EX) === false) return false;
    if (!@rename($tmp, $TG_TOKEN_FILE)) { @unlink($tmp); return false; }
    @chmod($TG_TOKEN_FILE, 0600);
    return true;
}

function tg_api(string $token, string $method, array $payload): array
{
    if ($token === '' || !function_exists('curl_init')) return ['code' => 0, 'body' => ''];
    $ch = curl_init('https://api.telegram.org/bot' . $token . '/' . $method);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
    ]);
    $body = (string) curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['code' => $code, 'body' => $body];
}

/* Кому слать. Список ведёт сам бот: человек прошёл по ссылке с кодом — попал
   сюда, отправил «стоп» — вышел. Никаких chat_id руками. */
function tg_chats(string $file): array
{
    if (!is_file($file)) return [];
    $j = json_decode((string) file_get_contents($file), true);
    return is_array($j) ? $j : [];
}

function tg_chats_save(string $file, array $list): void
{
    @file_put_contents($file, json_encode($list, JSON_UNESCAPED_UNICODE), LOCK_EX);
    @chmod($file, 0600);
}

function tg_esc(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/* Кто имеет право получать заявки. Ник бота виден в поиске телеграма, и без
   этой проверки заявки получал бы любой, кто нашёл бота и нажал «Старт»:
   чужие имена и телефоны утекали бы первому встречному. Поэтому подключение
   только по одноразовому коду, который выдаёт панель — то есть тот, у кого
   есть пароль от сайта. */
function tg_code_new(string $file): array
{
    $code = '';
    $n = strlen(TG_ALPHABET);
    for ($i = 0; $i < 8; $i++) $code .= TG_ALPHABET[random_int(0, $n - 1)];
    $rec = ['code' => $code, 'exp' => time() + TG_CODE_TTL];
    @file_put_contents($file, json_encode($rec), LOCK_EX);
    @chmod($file, 0600);
    return $rec;
}

function tg_code_norm(string $s): string
{
    return strtoupper((string) preg_replace('~[^A-Za-z0-9]~', '', $s));
}

/* Код одноразовый: сверили — сразу стёрли. Иначе ссылка, один раз попавшая
   в переписку или в историю браузера, работала бы вечно. */
function tg_code_take(string $file, string $given): bool
{
    if (!is_file($file)) return false;
    $j = json_decode((string) file_get_contents($file), true);
    if (!is_array($j) || empty($j['code'])) return false;
    if ((int) ($j['exp'] ?? 0) < time()) { @unlink($file); return false; }
    if (!hash_equals((string) $j['code'], tg_code_norm($given))) return false;
    @unlink($file);
    return true;
}

function tg_denied(string $file): array
{
    if (!is_file($file)) return [];
    $j = json_decode((string) file_get_contents($file), true);
    return is_array($j) ? $j : [];
}

function tg_denied_save(string $file, array $list): void
{
    if (count($list) > TG_DENIED_MAX) $list = array_slice($list, -TG_DENIED_MAX, null, true);
    @file_put_contents($file, json_encode($list, JSON_UNESCAPED_UNICODE), LOCK_EX);
    @chmod($file, 0600);
}

/* Разослать всем получателям, кроме одного (например, кроме того, о ком речь). */
function tg_broadcast(string $token, array $chats, string $text, string $except = ''): void
{
    foreach (array_keys($chats) as $cid) {
        if ((string) $cid === $except) continue;
        tg_api($token, 'sendMessage', [
            'chat_id'    => $cid,
            'parse_mode' => 'HTML',
            'text'       => $text,
            'disable_web_page_preview' => true,
        ]);
    }
}

/* Один разбор входящего сообщения на все пути. Раздваивать эту логику
   нельзя: вторая копия была бы дырой в обход проверки кода. */
function tg_handle(string $token, array $msg, array $p): void
{
    $chat = $msg['chat'] ?? null;
    if (!is_array($chat) || ($chat['type'] ?? '') !== 'private') return;
    $id = (string) ($chat['id'] ?? '');
    if ($id === '') return;

    $text  = trim((string) ($msg['text'] ?? ''));
    $low   = mb_strtolower($text);
    $title = trim(((string) ($chat['first_name'] ?? '')) . ' ' . ((string) ($chat['last_name'] ?? '')));
    if (($chat['username'] ?? '') !== '') $title .= ' (@' . $chat['username'] . ')';
    $title = $title !== '' ? $title : 'без имени';

    $list  = tg_chats($p['chats']);
    $known = isset($list[$id]);

    if ($low === '/stop' || $low === 'стоп') {
        if ($known) { unset($list[$id]); tg_chats_save($p['chats'], $list); }
        tg_api($token, 'sendMessage', [
            'chat_id' => $id,
            'text'    => "Отключил. Заявки сюда больше не приходят.\n\nЧтобы вернуть доступ, возьмите новую ссылку в панели управления сайтом, раздел «Заявки».",
        ]);
        return;
    }

    if ($known) {
        tg_api($token, 'sendMessage', [
            'chat_id' => $id,
            'text'    => "Всё на месте — заявки приходят сюда.\nОтключить уведомления: /stop.",
        ]);
        return;
    }

    /* Новый человек. Пускаем только с кодом из панели. Код приезжает
       в «/start КОД» — телеграм подставляет его сам из ссылки-приглашения. */
    $payload = '';
    if (preg_match('~^/start\s+(\S+)~iu', $text, $m)) $payload = $m[1];

    if ($payload !== '' && tg_code_take($p['code'], $payload)) {
        $list[$id] = ['title' => $title, 'since' => date('c')];
        tg_chats_save($p['chats'], $list);

        /* Остальных предупреждаем: новый получатель — событие, которое
           владелец обязан заметить, даже если подключил не он. */
        tg_broadcast($token, $list,
            "➕ <b>Подключён новый получатель</b>\n" . tg_esc($title) .
            "\n\nЕсли это не вы — уберите его в панели управления, раздел «Заявки».", $id);

        tg_api($token, 'sendMessage', [
            'chat_id'    => $id,
            'parse_mode' => 'HTML',
            'text'       => "✅ <b>Готово, всё подключено.</b>\n\nТеперь каждая заявка с сайта приходит сюда: имя, телефон, какой продукт нужен и когда её оставили.\n\nСайт: " . tg_esc(siteLabel()) . "\nОтключить уведомления — команда /stop.",
            'disable_web_page_preview' => true,
        ]);
        return;
    }

    /* Отказ. В список не добавляем, но попытку записываем: владелец должен
       видеть, что боту кто-то стучится. */
    $den   = tg_denied($p['denied']);
    $first = !isset($den[$id]);
    $den[$id] = [
        'title' => $title,
        'at'    => date('c'),
        'n'     => (int) ($den[$id]['n'] ?? 0) + 1,
    ];
    tg_denied_save($p['denied'], $den);

    tg_api($token, 'sendMessage', [
        'chat_id' => $id,
        'text'    => "Это закрытый бот — сюда приходят заявки владельца сайта, и посторонним они не выдаются.\n\nЕсли сайт ваш, откройте панель управления, раздел «Заявки», и возьмите там ссылку для подключения.",
    ]);

    if ($first) {
        tg_broadcast($token, $list,
            "⚠️ <b>Кто-то посторонний пытался подключиться к боту</b>\n" . tg_esc($title) .
            "\n\nДоступ не выдан — заявки он не увидит. Ничего делать не нужно.");
    }
}

/* Опрос бота вместо вебхука: на шаред-хостингах телеграм часто не может
   достучаться до сервера, а наружу сервер ходит нормально. Опрос дёргается
   в моменты, когда мы и так что-то делаем: открылся раздел «Заявки», нажали
   «Проверить», пришла заявка. Этого достаточно, чтобы заметить «Старт». */
function tg_poll(string $token, array $p): int
{
    if ($token === '' || !function_exists('curl_init')) return 0;

    $offsetFile = $p['offset'];
    $offset = is_file($offsetFile) ? (int) file_get_contents($offsetFile) : 0;
    $url = 'https://api.telegram.org/bot' . $token . '/getUpdates?timeout=0&allowed_updates=%5B%22message%22%5D'
         . ($offset ? '&offset=' . $offset : '');

    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
    $body = (string) curl_exec($ch);
    curl_close($ch);

    $j = json_decode($body, true);
    if (!is_array($j) || empty($j['ok']) || empty($j['result'])) return 0;

    $seen = 0;
    $last = $offset;
    foreach ($j['result'] as $u) {
        $last = max($last, (int) ($u['update_id'] ?? 0) + 1);
        $msg  = $u['message'] ?? null;
        if (!is_array($msg)) continue;
        tg_handle($token, $msg, $p);
        $seen++;
    }
    /* Смещение двигаем в любом случае: иначе те же сообщения разберутся
       ещё раз на следующем опросе, и бот ответит на них повторно. */
    if ($last > $offset) { @file_put_contents($offsetFile, (string) $last, LOCK_EX); @chmod($offsetFile, 0600); }
    return $seen;
}

function tg_state(string $token, array $p): array
{
    $bot = null;
    if ($token !== '') {
        $r = tg_api($token, 'getMe', []);
        $j = json_decode($r['body'], true);
        if ($r['code'] === 200 && is_array($j) && !empty($j['ok'])) {
            $bot = (string) ($j['result']['username'] ?? '');
        }
    }
    $chats = [];
    foreach (tg_chats($p['chats']) as $cid => $c) {
        $chats[] = ['id' => (string) $cid, 'title' => (string) ($c['title'] ?? ''), 'since' => (string) ($c['since'] ?? '')];
    }
    $denied = [];
    foreach (tg_denied($p['denied']) as $c) {
        $denied[] = ['title' => (string) ($c['title'] ?? ''), 'at' => (string) ($c['at'] ?? ''), 'n' => (int) ($c['n'] ?? 1)];
    }
    return ['bot' => $bot, 'chats' => $chats, 'denied' => $denied];
}

/* ---------------------------------------------------------- запрос ------- */

$raw    = file_get_contents('php://input') ?: '';
$in     = json_decode($raw, true);
$action = is_array($in) ? (string) ($in['action'] ?? '') : (string) ($_GET['action'] ?? '');

if ($action === 'state') {
    out([
        'ok'        => true,
        'auth'      => isAuthed(),
        'published' => published($dir),
        'curl'      => function_exists('curl_init'),
    ]);
}

if ($action === 'login') {
    $t = tries($PRIV);
    if ($t['n'] >= TRY_LIMIT) {
        $wait = TRY_WINDOW - (time() - $t['first']);
        out(['ok' => false, 'error' => 'Слишком много попыток. Подождите '
            . max(1, (int) ceil($wait / 60)) . ' мин. и попробуйте снова.'], 429);
    }
    if (passHash() === '') {
        out(['ok' => false, 'error' => 'Вход не настроен: на сайте нет файла с паролем. Напишите разработчику.'], 500);
    }
    $pass = trim((string) ($in['password'] ?? ''));
    usleep(250000);   // перебор становится невыгодным
    if (!passOk($pass)) {
        bumpTries($PRIV, $t);
        out(['ok' => false, 'error' => 'Пароль не подошёл. Проверьте раскладку и заглавные буквы.'], 401);
    }
    @unlink($PRIV . '/.login-tries');
    session_regenerate_id(true);
    $_SESSION['ok'] = passHash();
    out(['ok' => true, 'auth' => true, 'published' => published($dir)]);
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    out(['ok' => true, 'auth' => false]);
}

if ($action === 'publish' || $action === 'rollback') {
    needAuth();

    $target = $dir . '/' . DATA_FILE;
    $prev   = $target . '.prev';

    if ($action === 'rollback') {
        if (!is_file($prev)) out(['ok' => false, 'error' => 'Предыдущей версии нет — откатывать не к чему.'], 409);
        $data = (string) file_get_contents($prev);
    } else {
        $data = (string) ($in['data'] ?? '');
        if ($data === '') out(['ok' => false, 'error' => 'Пустые данные — публиковать нечего.'], 400);
        if (strlen($data) > MAX_BYTES) {
            out(['ok' => false, 'error' => 'Слишком много данных: скорее всего, дело в тяжёлой картинке. Уменьшите её и попробуйте снова.'], 413);
        }
        foreach (NEEDLES as $needle) {
            if (!str_contains($data, $needle)) {
                out(['ok' => false, 'error' => 'Файл собран неправильно: не хватает блока «' . $needle . '».'], 400);
            }
        }
        if (str_contains($data, '<?')) {
            out(['ok' => false, 'error' => 'В данных недопустимый фрагмент кода.'], 400);
        }
    }

    if ($action === 'publish' && is_file($target)) @copy($target, $prev);

    $tmp = $target . '.tmp';
    if (file_put_contents($tmp, $data) === false || !@rename($tmp, $target)) {
        @unlink($tmp);
        out(['ok' => false, 'error' => 'Сайт не смог сохранить файл. Напишите разработчику: нет прав на запись ' . DATA_FILE . '.'], 500);
    }

    $stamp   = date('YmdHis');
    $touched = 0;
    foreach (htmlPages($dir) as $page) {
        $f = $dir . '/' . $page;
        $html = (string) file_get_contents($f);
        $new  = preg_replace('/\?v=\d+/', '?v=' . $stamp, $html);
        if ($new !== null && $new !== $html && file_put_contents($f, $new) !== false) $touched++;
    }

    $info = ['at' => date('c'), 'hash' => hash('sha256', $data), 'stamp' => $stamp];
    @file_put_contents($dir . '/published.json', json_encode($info, JSON_UNESCAPED_UNICODE));

    out(['ok' => true, 'published' => $info, 'pages' => $touched]);
}

if ($action === 'zip') {
    needAuth();
    if (!class_exists('ZipArchive')) {
        out(['ok' => false, 'error' => 'Хостинг не умеет собирать ZIP. Скачайте резервную копию каталога — кнопка рядом.'], 501);
    }
    $zipPath = tempnam(sys_get_temp_dir(), 'site') ?: '';
    $zip = new ZipArchive();
    if ($zipPath === '' || $zip->open($zipPath, ZipArchive::OVERWRITE) !== true) {
        out(['ok' => false, 'error' => 'Не получилось собрать архив. Попробуйте ещё раз.'], 500);
    }
    $skip = ['.admin-pass', '.login-tries', 'published.json', 'leads.csv', 'config.php'];
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($it as $file) {
        $rel = substr($file->getPathname(), strlen($dir) + 1);
        if ($rel === '' || str_starts_with($rel, '.') || in_array(basename($rel), $skip, true)) continue;
        if (str_ends_with($rel, '.tmp') || str_ends_with($rel, '.prev')) continue;
        if ($file->isDir()) { $zip->addEmptyDir($rel); continue; }
        $zip->addFile($file->getPathname(), $rel);
    }
    $zip->close();
    $name = 'сайт-' . date('Y-m-d') . '.zip';
    header_remove('Content-Type');
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="site-' . date('Y-m-d') . '.zip"; '
         . "filename*=UTF-8''" . rawurlencode($name));
    header('Content-Length: ' . (string) filesize($zipPath));
    readfile($zipPath);
    @unlink($zipPath);
    exit;
}

/* Смена пароля из панели. Прежние сессии гаснут сами: в сессии лежит старый
   хэш, а isAuthed сверяет его с текущим. Тому, кто менял, обновляем сессию —
   чтобы не выкидывать его на экран входа. */
if ($action === 'password') {
    needAuth();
    $old = (string) ($in['old'] ?? '');
    $new = (string) ($in['new'] ?? '');
    usleep(250000);

    if (!passOk($old)) {
        out(['ok' => false, 'field' => 'old', 'error' => 'Текущий пароль не подошёл.'], 403);
    }
    if (mb_strlen($new) < MIN_PASSWORD) {
        out(['ok' => false, 'field' => 'new', 'error' => 'Новый пароль короче ' . MIN_PASSWORD . ' символов.'], 400);
    }
    if ($new === $old) {
        out(['ok' => false, 'field' => 'new', 'error' => 'Новый пароль совпадает с текущим.'], 400);
    }
    if (preg_match('/\s/u', $new)) {
        out(['ok' => false, 'field' => 'new', 'error' => 'В пароле не должно быть пробелов.'], 400);
    }
    $hash = password_hash($new, PASSWORD_DEFAULT);
    if (!passWrite($hash)) {
        out(['ok' => false, 'error' => 'Сайт не смог записать новый пароль: нет прав на запись. Пароль не изменён, напишите разработчику.'], 500);
    }
    $_SESSION['ok'] = $hash;
    out(['ok' => true]);
}

/* Заявки для панели. Файл с ними лежит выше корня сайта — по ссылке его не
   открыть, только отсюда и только по сессии. Свежие сверху. IP наружу не
   отдаём: владельцу он ни к чему. */
if ($action === 'leads') {
    needAuth();
    $rows = [];
    if (is_file($LEADS_FILE) && ($fh = @fopen($LEADS_FILE, 'r'))) {
        while (($r = fgetcsv($fh, 0, ';', '"', '\\')) !== false) {
            if (!is_array($r) || $r === [null]) continue;
            $date = (string) preg_replace('~^\xEF\xBB\xBF~', '', (string) ($r[0] ?? ''));
            if ($date === '' && count($r) < 2) continue;
            if ($date === 'Дата') continue;   // шапка файла
            $rows[] = [
                'date'    => $date,
                'name'    => (string) ($r[1] ?? ''),
                'phone'   => (string) ($r[2] ?? ''),
                'product' => (string) ($r[3] ?? ''),
            ];
        }
        fclose($fh);
    }
    $total = count($rows);
    $rows  = array_reverse($rows);
    /* Потолок — чтобы страница не легла на тысячной заявке. Сколько всего,
       панель всё равно знает: считает по total. */
    if (count($rows) > 500) $rows = array_slice($rows, 0, 500);
    out(['ok' => true, 'total' => $total, 'leads' => $rows]);
}

/* Телеграм-бот из панели: токен, ссылка-приглашение, получатели. */
if ($action === 'notify') {
    needAuth();
    if (!function_exists('curl_init')) {
        out(['ok' => false, 'error' => 'На этом хостинге отключён cURL — Telegram подключить нельзя. Заявки всё равно сохраняются в списке.'], 500);
    }

    if (is_array($in) && array_key_exists('token', $in)) {
        $new = trim((string) $in['token']);

        if ($new === '') {   // отключение
            if (!tgTokenWrite('')) out(['ok' => false, 'error' => 'Не удалось убрать токен: нет прав на запись.'], 500);
            foreach (['chats', 'offset', 'code', 'denied'] as $k) @unlink($TG[$k]);
            out(['ok' => true, 'bot' => null, 'chats' => [], 'denied' => [], 'code' => null]);
        }

        if (!preg_match('~^\d{6,}:[A-Za-z0-9_-]{30,}$~', $new)) {
            out(['ok' => false, 'field' => 'token', 'error' => 'Это не похоже на токен бота. BotFather присылает строку вида 1234567890:AAH… — скопируйте её целиком.'], 400);
        }
        $r = tg_api($new, 'getMe', []);
        $j = json_decode($r['body'], true);
        if ($r['code'] !== 200 || !is_array($j) || empty($j['ok'])) {
            out(['ok' => false, 'field' => 'token', 'error' => 'Telegram не признал этот токен. Проверьте, что скопировали последний: после /revoke старый перестаёт работать.'], 400);
        }
        if (!tgTokenWrite($new)) {
            out(['ok' => false, 'error' => 'Не удалось сохранить токен: нет прав на запись. Напишите разработчику.'], 500);
        }
        /* Прежние получатели, код и журнал — от прежнего бота. Чистим разом. */
        foreach (['chats', 'offset', 'code', 'denied'] as $k) @unlink($TG[$k]);
    }

    $token = tgToken();

    /* Отзыв доступа у конкретного получателя — одной кнопкой, не трогая
       остальных и не переподключая бота. */
    if ($token !== '' && !empty($in['drop'])) {
        $drop = (string) $in['drop'];
        $list = tg_chats($TG['chats']);
        if (isset($list[$drop])) {
            $gone = $list[$drop];
            unset($list[$drop]);
            tg_chats_save($TG['chats'], $list);
            tg_api($token, 'sendMessage', [
                'chat_id' => $drop,
                'text'    => 'Доступ к заявкам отозван владельцем сайта. Сюда они больше не приходят.',
            ]);
            tg_broadcast($token, $list, "🚫 <b>Получатель убран</b>\n" . tg_esc((string) ($gone['title'] ?? 'без имени')));
        }
    }

    /* Забыть чужие попытки: владелец их посмотрел и закрыл. */
    if (!empty($in['forget'])) @unlink($TG['denied']);

    /* Одноразовый код и ссылка-приглашение. */
    $code = null;
    if ($token !== '' && !empty($in['code'])) {
        $rec  = tg_code_new($TG['code']);
        $code = ['code' => $rec['code'], 'exp' => $rec['exp'], 'ttl' => TG_CODE_TTL];
    }

    if ($token !== '') tg_poll($token, $TG);
    $st = tg_state($token, $TG);
    out(['ok' => true, 'bot' => $st['bot'], 'chats' => $st['chats'], 'denied' => $st['denied'], 'code' => $code]);
}

/* Приём заявки с формы сайта. Форма шлёт обычный POST (FormData), поэтому
   поля берём из $_POST; JSON тоже принимаем. */
if ($action === 'lead') {
    $src = is_array($in) ? $in : $_POST;
    $get = function (string $k, int $max) use ($src): string {
        return clean(isset($src[$k]) ? (string) $src[$k] : '', $max);
    };

    /* Ловушка для ботов: людям поле не видно. */
    if ($get('site', 200) !== '') out(['ok' => true]);

    $name    = $get('name', 80);
    $phone   = $get('phone', 24);
    $product = $get('product', 60);
    $consent = !empty($src['consent']);

    $titles = [
        'debit'   => 'Дебетовая карта',
        'credit'  => 'Кредитная карта',
        'loan'    => 'Кредит наличными',
        'deposit' => 'Вклад или накопительный счёт',
    ];
    $productName = $titles[$product] ?? $product;

    if (mb_strlen($name) < 2 || !preg_match('/^\+7\d{10}$/', $phone) || $productName === '' || !$consent) {
        out(['ok' => false, 'error' => 'Заполните имя, телефон и продукт и отметьте согласие.'], 422);
    }

    $when = date('Y-m-d H:i:s');
    $ip   = (string) ($_SERVER['REMOTE_ADDR'] ?? '');

    /* 1. В файл. Пятый аргумент fputcsv задан явно: с PHP 8.4 без него
       сыпется Deprecated прямо в ответ. */
    $new = !is_file($LEADS_FILE) || filesize($LEADS_FILE) === 0;
    $saved = false;
    if ($fh = @fopen($LEADS_FILE, 'a')) {
        if (flock($fh, LOCK_EX)) {
            if ($new) { fwrite($fh, "\xEF\xBB\xBF"); fputcsv($fh, ['Дата', 'Имя', 'Телефон', 'Продукт', 'IP'], ';', '"', '\\'); }
            $saved = fputcsv($fh, [$when, $name, $phone, $productName, $ip], ';', '"', '\\') !== false;
            flock($fh, LOCK_UN);
        }
        fclose($fh);
        @chmod($LEADS_FILE, 0600);
    }

    /* 2. В Telegram — всем подключённым получателям. Телефон телеграм
       подсвечивает ссылкой сам, кнопка не нужна. Время московское: клиент
       и его люди в России, а сервер живёт по своему поясу. */
    $tgOk  = null;
    $token = tgToken();
    if ($token !== '') tg_poll($token, $TG);
    $chats = $token !== '' ? tg_chats($TG['chats']) : [];
    if ($chats) {
        try { $msk = (new DateTime('now', new DateTimeZone('Europe/Moscow')))->format('d.m.Y, H:i'); }
        catch (Exception $e) { $msk = date('d.m.Y, H:i'); }
        $text = "🟢 <b>Новая заявка с сайта</b>\n\n"
              . '<b>Имя:</b> ' . tg_esc($name) . "\n"
              . '<b>Телефон:</b> ' . tg_esc($phone) . "\n"
              . '<b>Продукт:</b> ' . tg_esc($productName) . "\n\n"
              . '<i>' . $msk . ' МСК · ' . tg_esc(siteLabel()) . '</i>';
        $sent = 0;
        foreach (array_keys($chats) as $cid) {
            $r = tg_api($token, 'sendMessage', [
                'chat_id' => $cid, 'parse_mode' => 'HTML', 'text' => $text, 'disable_web_page_preview' => true,
            ]);
            if ($r['code'] === 200) $sent++;
        }
        $tgOk = $sent > 0;
    }

    if (!$saved && $tgOk !== true) {
        out(['ok' => false, 'error' => 'Сайт не смог сохранить заявку. Позвоните или напишите нам напрямую.'], 500);
    }
    out(['ok' => true, 'tg' => $tgOk]);
}

out(['ok' => false, 'error' => 'Неизвестная команда.'], 400);
