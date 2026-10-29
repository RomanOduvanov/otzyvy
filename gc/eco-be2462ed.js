/* OduvanovSchool · eco.js — новые страницы экосистемы внутри кабинета GetCourse (отдельно от layout.js, чтобы чаты не перетирали друг друга).
   Подключается в шаблоне 101699 отдельной строкой после layout-*.js.
   Сейчас: «Пульт куратора» — /teach/control/stream?fs=pult (для кураторов и Романа это стартовая страница кабинета).
   Пульт — страница gc/pult.html на GitHub Pages (правится без деплоя сервера), данные — API сервера oduvanov-api /app/api/* во фрейме: вход подтверждается через Telegram-бота, данные учеников наружу не отдаются. */
/* 28.10 (этап 2): кожа приложения для уроков, ДЗ, анкет и входа — отдельный файл gc/appskin-<APPSKIN>.js, грузится только в режиме Telegram (html.eco-tg) на ширине ≤767.
   Пустая строка — не грузить. Имя файла подставляется при публикации. */
var APPSKIN = 'd3fa5e5f';
/* 28.10 (макет 4в): кожа продления и оплаты — отдельный файл gc/payskin-<PAYSKIN>.js, грузится так же, как appskin: только в режиме Telegram, ширина ≤767,
   только на страницах-формах продления/повышения и на страницах заказа и оплаты GetCourse. Пустая строка — не грузить. Имя файла подставляется при публикации. */
var PAYSKIN = '3be371a0';
/* 28.10: вход с адресом возврата (/cms/system/login?returnUrl=…) — так приложение открывает уроки в Telegram на компьютере.
   Если вход уже есть, GetCourse показывает «Здравствуйте, … Перейти в аккаунт» — сразу идём на нужную страницу */
(function () { try { if (window.top !== window || !/^\/(pl\/)?cms\/system\/login/.test(location.pathname) || !(+window.accountUserId)) return;
  var r = new URLSearchParams(location.search).get('returnUrl') || ''; if (/^\/[^\/\\]/.test(r)) location.replace(r + location.hash) } catch (e) {} })();
(function () {
  if (window.top !== window || window.__eco) return; window.__eco = 1;
  var API = 'https://oduvanov-api.romanoduvanov52.workers.dev';
  var STAFF = { 504950432: 'Антон', 510261529: 'Кирилл', 499631257: 'Роман' }; /* кураторы и Роман (uid GetCourse) */
  var U = +window.accountUserId || 0, path = location.pathname.replace(/\/+$/, '');
  var isPult = path === '/teach/control/stream' && /[?&]fs=pult\b/.test(location.search);
  if (!STAFF[U]) return;
  var R = document.documentElement;
  /* 28.10: убран автопереход «Мои тренинги» → пульт (Роман: «Тренинги» кидало на «Кураторов»); пульт — отдельный пункт меню «Кураторы» */
  var css = document.createElement('style');
  css.textContent = '.eco-chip{position:fixed;right:16px;bottom:calc(16px + max(env(safe-area-inset-bottom), calc(var(--tg-safe-area-inset-bottom,0px) + var(--tg-content-safe-area-inset-bottom,0px))));z-index:9990;display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 18px;border-radius:14px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font:600 14px "Inter Tight",Inter,sans-serif;text-decoration:none!important;box-shadow:0 16px 40px -12px rgba(215,127,255,.6),inset 0 0 0 1px rgba(255,255,255,.6)}'
    + 'html.eco-pult .gc-main-content>*:not(#ecoPult):not(.fs-foot){display:none!important}'
    + '#ecoPult{max-width:1280px;margin:0 auto;padding:8px 24px 0}#ecoPult iframe{display:block;width:100%;border:0;min-height:900px;background:transparent;color-scheme:dark}'
    + '#ecoPult .eco-back{display:inline-flex;margin:8px 0 0;color:#d77fff;font:500 14px "Inter Tight",Inter,sans-serif;text-decoration:none}'
    + '@media (max-width:767px){html:has(.fl-bar) .eco-chip{bottom:calc(94px + max(env(safe-area-inset-bottom), calc(var(--tg-safe-area-inset-bottom,0px) + var(--tg-content-safe-area-inset-bottom,0px))))}html.eco-tg:has(.fl-bar) .eco-chip{bottom:calc(var(--eco-tb) + 118px)}}'
    + '@media (max-width:420px){.eco-chip{width:48px;height:48px;padding:0;border-radius:99px;justify-content:center;font-size:0;gap:0}.eco-chip svg{width:20px;height:20px}}'
    + '@media (max-width:760px){#ecoPult{padding:4px 12px 0}.eco-chip{right:16px}html.eco-tg .eco-chip{bottom:calc(var(--eco-tb) + 16px)}}';
  (document.head || R).appendChild(css);
  /* 30.10 (после QA №21): кнопка «Пульт» на телефоне перекрывала кнопки новых страниц и висела поверх открытого меню-бургера.
     Теперь её нет на наших полноэкранных страницах (у них своя навигация и пункт меню), она прячется при открытом меню и при прокрутке вниз (возвращается при прокрутке вверх). */
  css.textContent += 'html:has(.main-menu__overrided--is-open) .eco-chip,html:has(.main-menu--is-expanded) .eco-chip,html:has(.eco-np.on) .eco-chip,html:has(.eco-nr.open) .eco-chip{opacity:0!important;pointer-events:none!important}'
    + '.eco-chip{transition:opacity .2s,transform .25s}.eco-chip.dn{opacity:0;pointer-events:none;transform:translateY(16px)}';
  function chip() { if (innerWidth >= 768 || R.classList.contains('fs-adm') || isPult || /[?&]fs=(chat|cur|curator|bank|orders|efir|search)\b/.test(location.search) || document.querySelector('.eco-chip')) return; var a = document.createElement('a'); a.className = 'eco-chip'; a.href = '/teach/control/stream?fs=pult';
    a.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>' + (U === 499631257 ? 'Кураторы' : 'Пульт куратора'); a.setAttribute('aria-label', U === 499631257 ? 'Кураторы' : 'Пульт куратора'); document.body.appendChild(a);
    var ly = scrollY; addEventListener('scroll', function () { var y = scrollY; if (Math.abs(y - ly) < 8) return; a.classList.toggle('dn', y > ly && y > 120); ly = y }, { passive: true }) }
  function mount() {
    var mc = document.querySelector('.gc-main-content'); if (!mc) return false; if (document.getElementById('ecoPult')) return true;
    R.classList.add('eco-pult'); document.title = (U === 499631257 ? 'Кураторы' : 'Пульт куратора') + ' · OduvanovSchool';
    var box = document.createElement('div'); box.id = 'ecoPult';
    box.innerHTML = '<a class="eco-back" href="/teach/control/stream">← Мои тренинги</a><iframe title="Пульт куратора" src="https://romanoduvanov.github.io/otzyvy/gc/pult.html?embed=1&v=4&gc=' + U + '" allow="clipboard-write"></iframe>';
    mc.insertBefore(box, mc.firstChild);
    window.addEventListener('message', function (e) { if ((e.origin !== API && e.origin !== 'https://romanoduvanov.github.io') || !e.data || !e.data.ecoH) return; box.querySelector('iframe').style.height = Math.max(600, +e.data.ecoH) + 'px' });
    return true }
  function go() { if (isPult) { if (!mount()) { var n = 0, iv = setInterval(function () { if (mount() || ++n > 40) clearInterval(iv) }, 150) } } else chip() }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

/* 30.10 (макет 5–7): общие детали для «Мой куратор», чата и кабинета куратора на сайте — window.ecoK.
   Токены: ученик — токен кабинета (FS_AUTH → t, сервер узнаёт по нему uid); куратор и Роман — сессия команды (/app/api/login/fs по тому же токену, роль решает сервер).
   Стили — по макету (тёмные поверхности --s1…--s4, пузыри чата, плашки .ec-pill), классы с приставкой ec-, чтобы не задеть GetCourse. */
(function () {
  if (window.top !== window || window.ecoK) return;
  var API = 'https://oduvanov-api.romanoduvanov52.workers.dev', U = +window.accountUserId || 0, R = document.documentElement;
  var K = window.ecoK = { API: API, U: U, MB: 'https://romanoduvanov.github.io/otzyvy/gc/curators/', STAFF: { 504950432: 'curator', 510261529: 'curator', 499631257: 'admin' } };
  K.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
  /* 30.10 (после QA №10): имя в дательном падеже по первому слову — «Напиши Кириллу…», а не «Кирилл Кошкину» (как nameF в layout.js) */
  K.dat = function (n) { var s = String(n || '').trim().split(/\s+/)[0] || ''; if (!s) return ''; var b = s.slice(0, -1);
    if (/[йь]$/i.test(s)) return b + 'ю'; if (/ия$/i.test(s)) return b + 'и'; if (/[ая]$/i.test(s)) return b + 'е'; return /[бвгджзклмнпрстфхцчшщ]$/i.test(s) ? s + 'у' : s };
  K.plr = function (n, a, b, c) { n = Math.abs(n) % 100; var m = n % 10; return n > 10 && n < 20 ? c : m > 1 && m < 5 ? b : m === 1 ? a : c };
  K.nb = function (s) { return String(s).replace(/(^|[\s(«])(в|во|и|а|к|ко|с|со|у|о|об|от|до|по|на|за|из|не|ни|но|для|без|под|над|что|как)\s/gi, '$1$2 ') };
  var TZ = { timeZone: 'Europe/Moscow' };
  K.hm = function (t) { return new Date(t).toLocaleTimeString('ru-RU', Object.assign({ hour: '2-digit', minute: '2-digit' }, TZ)) };
  K.day = function (t) { var f = function (x) { return new Date(x).toLocaleDateString('ru-RU', Object.assign({ year: 'numeric', month: '2-digit', day: '2-digit' }, TZ)) }, d = f(t);
    return d === f(Date.now()) ? 'Сегодня' : d === f(Date.now() - 864e5) ? 'Вчера' : new Date(t).toLocaleDateString('ru-RU', Object.assign({ day: 'numeric', month: 'long' }, TZ)) };
  K.ago = function (t) { var m = Math.max(1, Math.round((Date.now() - t) / 6e4)); if (m < 60) return m + ' мин'; var h = Math.floor(m / 60); if (h < 24) return h + ' ч' + (m % 60 && h < 10 ? ' ' + (m % 60) + ' мин' : ''); var d = Math.floor(h / 24); return d + ' д' + (h % 24 ? ' ' + (h % 24) + ' ч' : '') };
  K.ini = function (n) { return String(n || '?').split(/\s+/).slice(0, 2).map(function (x) { return x.charAt(0) }).join('').toUpperCase() };
  K.ss = function (k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v) } catch (e) { return null } };
  /* токен ученика (свой кабинет) */
  K.tok = function (force) { return (window.FS_AUTH ? window.FS_AUTH(!!force) : Promise.resolve(null)).then(function (a) { return a && a.t ? a.t : null }) };
  /* сессия команды: роль (curator/admin) проверяет сервер по токену кабинета; держим в вкладке до 6 часов */
  K.staff = function (force) { var key = 'ecoSS:' + U, c = null; try { c = JSON.parse(K.ss(key) || 'null') } catch (e) {}
    if (!force && c && c.exp > Date.now()) return Promise.resolve(c);
    return K.tok().then(function (t) { if (!t) return null; return fetch(API + '/app/api/login/fs', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ t: t }) }).then(function (r) { return r.json() }) })
      .then(function (j) { if (!j || !j.ok || !j.token) return null; var s = { token: j.token, role: j.role, exp: Date.now() + 6 * 36e5 }; K.ss(key, JSON.stringify(s)); return s }).catch(function () { return null }) };
  /* запрос к серверу: who = 'student' | 'staff'; ответ — JSON или {ok:false, err, st} */
  K.api = function (who, p, body) { var get = who === 'staff' ? function (f) { return K.staff(f).then(function (s) { return s && s.token }) } : K.tok;
    var go = function (t) { if (!t) return Promise.resolve({ status: 401 }); var o = { headers: { Authorization: 'Bearer ' + t } }; if (body) { o.method = 'POST'; o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body) } return fetch(API + p, o) };
    return get().then(go).then(function (r) { return r.status === 401 ? get(true).then(go) : r })
      .then(function (r) { if (!r.json) return { ok: false, err: 'Нужно войти заново', st: 401 }; return r.json().catch(function () { return { ok: false, st: r.status } }).then(function (j) { if (j && typeof j === 'object' && r.status >= 400 && j.st == null) j.st = r.status; return j }) })
      .catch(function () { return { ok: false, err: 'Нет связи с сервером', st: 0 } }) };
  /* картинка с авторизацией (файл чата) → blob: адрес */
  K.blob = function (who, p) { var get = who === 'staff' ? function () { return K.staff().then(function (s) { return s && s.token }) } : K.tok;
    return get().then(function (t) { return fetch(API + p, { headers: { Authorization: 'Bearer ' + t } }) }).then(function (r) { if (!r.ok) throw 0; return r.blob() }).then(function (b) { return URL.createObjectURL(b) }) };
  K.mount = function (id, cls, title) { var mc = document.querySelector('.gc-main-content'); if (!mc) return null; var b = document.getElementById(id); if (b) return b;
    R.classList.add(cls); if (title) document.title = title + ' · OduvanovSchool'; b = document.createElement('div'); b.id = id; b.className = 'ec'; mc.insertBefore(b, mc.firstChild); return b };
  K.when = function (fn) { var n = 0, iv = setInterval(function () { if (document.querySelector('.gc-main-content') || ++n > 60) { clearInterval(iv); fn() } }, 150) };
  var css = document.createElement('style');
  css.textContent = '.ec{--s1:#0f0f13;--s2:#16161b;--s3:#1f1f26;--s4:#2a2a33;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);--mut:rgba(255,255,255,.64);--dim:rgba(255,255,255,.44);--green:#4ade80;--amber:#fbbf24;--red:#f87171;--vio:#a66bff;font:400 15px/1.45 "Inter Tight",Inter,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;max-width:1240px;margin:0 auto;padding:40px 48px 64px;box-sizing:border-box}.ec *{box-sizing:border-box}'
    + '.ec .ec-hd{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}.ec h1{margin:0;font-size:52px;line-height:1.05;font-weight:600;letter-spacing:-.035em}.ec .ec-sub{color:var(--mut);margin-top:6px}'
    + '.ec .ec-c{background:var(--s2);border:1px solid var(--line);border-radius:28px;padding:24px;min-width:0}.ec h3{margin:0;font-size:20px;font-weight:600;letter-spacing:-.02em}'
    + '.ec .ec-k2{font:500 11px "JetBrains Mono",ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--dim)}.ec .mut{color:var(--mut)}.ec .dim{color:var(--dim)}.ec .g{color:var(--green)}.ec .a{color:var(--amber)}.ec .r{color:var(--red)}'
    + '.ec .ec-seg{display:inline-flex;background:var(--s1);border:1px solid var(--line);border-radius:14px;padding:4px;gap:2px;flex-wrap:wrap}.ec .ec-seg a,.ec .ec-seg button{height:36px;display:flex;align-items:center;padding:0 14px;border-radius:10px;font:500 14px "Inter Tight",sans-serif;color:var(--mut)!important;cursor:pointer;white-space:nowrap;border:0;background:none;text-decoration:none!important}.ec .ec-seg .on{background:var(--s4);color:#fff!important}'
    + '.ec .ec-btn{height:56px;border-radius:16px;border:0;display:inline-flex;align-items:center;justify-content:center;gap:10px;font:600 16px "Inter Tight",sans-serif;padding:0 22px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;cursor:pointer;text-decoration:none!important}'
    + '.ec .ec-btn2{height:56px;border-radius:16px;border:1px solid var(--line2);display:inline-flex;align-items:center;justify-content:center;gap:10px;font:600 16px "Inter Tight",sans-serif;padding:0 20px;background:var(--s3);color:#fff!important;cursor:pointer;text-decoration:none!important}'
    + '.ec .sm{height:44px;font-size:14px;border-radius:12px;padding:0 16px}.ec .ec-btn[disabled],.ec .ec-btn2[disabled]{opacity:.5;cursor:default}'
    + '.ec .ec-chip{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:999px;background:var(--s3);border:1px solid var(--line);font:500 13px "Inter Tight",sans-serif;color:var(--mut);white-space:nowrap;cursor:pointer}.ec .ec-chip.on{background:#fff;color:#111;border-color:#fff}'
    + '.ec .ec-pill{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:99px;font-size:12px;font-weight:500;white-space:nowrap}.ec .ec-pill i{width:6px;height:6px;border-radius:50%;background:currentColor}.ec .ec-pill.g{background:rgba(74,222,128,.13);color:var(--green)}.ec .ec-pill.a{background:rgba(251,191,36,.13);color:var(--amber)}.ec .ec-pill.r{background:rgba(248,113,113,.13);color:var(--red)}.ec .ec-pill.n{background:var(--s3);color:var(--mut)}.ec .ec-pill.v{background:rgba(166,107,255,.16);color:#d6c2ff}'
    + '.ec .ec-av{width:40px;height:40px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:600;font-size:14px;color:#fff;background:linear-gradient(160deg,#8b5cf6,#2a1546);object-fit:cover}'
    + '.ec .ec-li{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);color:#fff!important;text-decoration:none!important}.ec .ec-li:last-child{border-bottom:0}.ec .ec-li .t{flex:1;min-width:0}.ec .ec-li .t b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ec .ec-li .t small{display:block;color:var(--dim);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.ec .ec-bar{height:8px;border-radius:9px;background:var(--s4);overflow:hidden}.ec .ec-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#7c3aed,#c084fc)}'
    + '.ec .ec-empty{padding:28px 8px;text-align:center;color:var(--mut)}.ec .ec-note{font-size:12px;color:var(--dim)}'
    /* чат (5.1, 6.1) */
    + '.ec-chat{display:flex;flex-direction:column;min-height:0;height:100%;background:var(--s2);border:1px solid var(--line);border-radius:28px;overflow:hidden}'
    + '.ec-chat .ch{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--line)}.ec-chat .ch .ph{position:relative;flex:none}.ec-chat .ch .ph img,.ec-chat .ch .ph .ec-av{width:44px;height:44px}.ec-chat .ch .ph i{position:absolute;right:0;bottom:0;width:12px;height:12px;border-radius:50%;background:#6b6b6b;border:2px solid var(--s2)}.ec-chat .ch .ph i.on{background:var(--green)}'
    + '.ec-chat .ch b{font-size:16px;font-weight:600}.ec-chat .ch .st{font-size:12.5px;color:var(--mut)}.ec-chat .ch .st.on{color:var(--green)}'
    + '.ec-chat .cb{flex:1;min-height:0;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}'
    + '.ec-chat .dsep{align-self:center;font-size:11.5px;color:var(--mut);background:var(--s3);border-radius:99px;padding:3px 10px;margin:4px 0}.ec-chat .sys{align-self:center;font-size:12.5px;color:var(--dim);text-align:center;max-width:80%}'
    + '.ec-chat .row{display:flex;gap:8px;align-items:flex-end}.ec-chat .row>.ec-av,.ec-chat .row>img{width:30px;height:30px;font-size:11px;border-radius:50%;object-fit:cover;flex:none}'
    + '.ec-chat .bub{max-width:78%;padding:10px 14px;border-radius:18px;font-size:14.5px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere}.ec-chat .bub.in{background:var(--s3);border-bottom-left-radius:6px}.ec-chat .bub.out{background:linear-gradient(180deg,#7c3aed,#6d28d9);margin-left:auto;border-bottom-right-radius:6px}'
    + '.ec-chat .bub small{display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:11px;line-height:13px;color:rgba(255,255,255,.55);margin-top:4px;font-variant-numeric:tabular-nums}.ec-chat .bub small .tk{flex:none;display:block}.ec-chat .bub small .tk.rd{color:#fff}.ec-chat .bub img{display:block;max-width:240px;max-height:300px;border-radius:12px;margin:-4px -8px 6px;cursor:zoom-in}.ec-chat .bub a{color:inherit;text-decoration:underline}'
    + '.ec-chat .stars{display:flex;gap:2px;align-items:center;margin:4px 0 0 38px;font-size:12px;color:var(--dim)}.ec-chat .stars button{border:0;background:none;padding:0 1px;font-size:17px;line-height:1;color:rgba(255,255,255,.25);cursor:pointer}.ec-chat .stars button.on{color:#fbbf24}.ec-chat .stars button[disabled]{cursor:default}'
    + '.ec-chat .cf{padding:12px 20px 16px;border-top:1px solid var(--line);display:grid;gap:10px}.ec-chat .cf .chips{display:flex;gap:6px;flex-wrap:wrap}.ec-chat .cf .in{display:flex;gap:8px;align-items:flex-end}'
    + '.ec-chat .ib{width:48px;height:48px;border-radius:14px;border:0;background:var(--s3);color:#fff;display:grid;place-items:center;cursor:pointer;flex:none;padding:0}.ec-chat .ib.go{background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364}'
    + '.ec-chat textarea{flex:1;min-width:0;min-height:48px!important;height:48px;max-height:160px;border-radius:14px!important;background:var(--s1)!important;border:1px solid var(--line2)!important;box-shadow:none!important;color:#fff!important;font:400 16px/1.4 "Inter Tight",sans-serif!important;padding:12px 14px!important;margin:0!important;resize:none;outline:none}.ec-chat textarea:focus{border-color:rgba(166,107,255,.6)}'
    + '.ec-chat .att{display:none;align-items:center;gap:10px;font-size:13px;color:var(--mut)}.ec-chat .att.on{display:flex}.ec-chat .att img{width:56px;height:40px;border-radius:8px;object-fit:cover}.ec-chat .att button{border:0;background:none;color:#d6c2ff;cursor:pointer;font:500 13px "Inter Tight",sans-serif}'
    + '.ec-chat input[type=file],.eco-np input[type=file]{display:none!important}.ec-chat .more{align-self:center;border:0;background:var(--s3);color:var(--mut);border-radius:99px;height:30px;padding:0 14px;font:500 12.5px "Inter Tight",sans-serif;cursor:pointer}'
    + '@media(max-width:767px){.ec-chat .ch .ec-pill{display:none}.ec{padding:16px 16px 40px}.ec h1{font-size:36px}.ec .ec-c{padding:18px;border-radius:24px}.ec-chat{border-radius:24px}.ec-chat .cb{padding:14px}.ec-chat .cf{padding:10px 12px 12px}.ec-chat .ch{padding:12px 14px}.ec-chat .bub{max-width:86%}.ec .ec-btn,.ec .ec-btn2{width:100%}}';
  (document.head || R).appendChild(css);

  var I = { clip: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 7"/></svg>',
    send: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    tg: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/></svg>' };
  K.I = I;
  /* картинка → JPEG до 650 КБ (лимит файлов чата); PDF — как есть, если влезает */
  K.file = function (f) { return new Promise(function (ok, no) { var r = new FileReader();
    if (/pdf$/i.test(f.type)) { if (f.size > 650e3) return no('Файл больше 650 КБ'); r.onload = function () { ok({ name: f.name, mime: f.type, data: r.result }) }; r.onerror = no; return r.readAsDataURL(f) }
    if (!/^image\//.test(f.type)) return no('Можно картинку или PDF');
    r.onload = function () { var im = new Image(); im.onload = function () { var side = 1600, q = .85, out = '';
      for (var i = 0; i < 6; i++) { var k = Math.min(1, side / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); out = c.toDataURL('image/jpeg', q); if (out.length * .75 < 640e3) break; side = Math.round(side * .8); q = Math.max(.6, q - .07) }
      ok({ name: (f.name || 'image').replace(/\.\w+$/, '') + '.jpg', mime: 'image/jpeg', data: out }) }; im.onerror = function () { no('Не получилось открыть картинку') }; im.src = r.result }; r.onerror = no; r.readAsDataURL(f) }) };

  /* Чат на платформе по контракту /chat/*: el — контейнер; o = {who:'student'|'staff', u: uid ученика (для команды), chips:[…], onFail(j), onMeta(j)} */
  K.chat = function (el, o) { o = o || {}; var who = o.who || 'student', q = o.u ? 'u=' + (+o.u) : '', MORE = false, MSG = [], first = 0, busy = false, FILE = null, me = '', timer = 0, alive = true;
    el.className = 'ec-chat'; el.innerHTML = '<div class="ch"></div><div class="cb" aria-live="polite"><div class="ec-empty">Загружаем переписку…</div></div><div class="cf"><div class="chips"></div><div class="att"><img alt=""><span style="flex:1">Файл прикреплён</span><button type="button" data-a="un">Убрать</button></div><div class="in"><button type="button" class="ib" data-a="pic" aria-label="Прикрепить картинку или PDF">' + I.clip + '</button><textarea rows="1" placeholder="Сообщение…" enterkeyhint="send" aria-label="Сообщение"></textarea><button type="button" class="ib go" data-a="send" aria-label="Отправить">' + I.send + '</button></div><input type="file" accept="image/*,application/pdf" hidden></div>';
    var ch = el.querySelector('.ch'), cb = el.querySelector('.cb'), ta = el.querySelector('textarea'), fi = el.querySelector('input[type=file]'), at = el.querySelector('.att');
    var chips = o.chips || (who === 'staff' ? ['Супер, принято!', 'Посмотрю сегодня', 'Пришли, пожалуйста, скрин'] : ['Показать работу', 'Вопрос по ДЗ', 'Не открывается урок']);
    el.querySelector('.chips').innerHTML = chips.map(function (c) { return '<button type="button" class="ec-chip">' + K.esc(c) + '</button>' }).join('');
    function mine(m) { return me === 'student' ? m.dir === 'in' : m.dir === 'out' }
    function head(j) { var c = j.curator || {}, s = j.student || {};
      if (j.me === 'student') { var on = !!c.online, hrs = c.hours ? 'с ' + c.hours.from + ' до ' + c.hours.to + ' МСК' : '';
        ta.placeholder = 'Напиши ' + (c.name ? K.dat(c.short || c.name) : 'куратору') + '…';
        ch.innerHTML = '<span class="ph">' + (c.photo || c.cid ? '<img class="ec-av" src="' + K.esc(c.photo || K.MB + c.cid + '.jpg') + '" alt="">' : '<span class="ec-av">' + K.ini(c.name) + '</span>') + '<i class="' + (on ? 'on' : '') + '"></i></span><div style="flex:1;min-width:0"><b>' + K.esc(c.name || 'Куратор') + '</b><div class="st' + (on ? ' on' : '') + '">' + (on ? 'в сети' + (c.avg_reply_min ? ' · ответит примерно за ' + c.avg_reply_min + ' ' + K.plr(c.avg_reply_min, 'минуту', 'минуты', 'минут') : '') : 'сейчас не в сети' + (hrs ? ' · отвечает ' + hrs : '')) + '</div></div><span class="ec-pill n">' + I.tg + 'Ответы приходят и в бот</span>' }
      else { ta.placeholder = 'Ответить ' + K.esc(String(s.name || 'ученику').split(' ')[0]) + '…';
        ch.innerHTML = '<span class="ph"><span class="ec-av">' + K.ini(s.name) + '</span></span><div style="flex:1;min-width:0"><b>' + K.esc(s.name || 'Ученик') + '</b><div class="st">' + (j.me === 'admin' && c.name ? 'куратор ' + K.esc(c.name) : 'твой ученик') + '</div></div>' + (s.uid ? '<a class="ec-pill n" href="/pl/' + (+s.uid) + '" target="_blank" rel="noopener">Профиль</a>' : '') } }
    function bubble(m) { var mn = mine(m), t = '<small>' + K.hm(m.at) + (mn ? (m.read ? '<svg class="tk rd" width="17" height="11" viewBox="0 0 17 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 6 4.5 9 10.5 1.8M8 8.2 8.8 9 14.8 1.8"/></svg>' : '<svg class="tk" width="12" height="11" viewBox="0 0 12 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 6 4.5 9 10.5 1.8"/></svg>') : '') + '</small>', f = '';
      if (m.file) f = /^image\//.test(m.file.mime || '') ? '<img data-f="' + K.esc(m.file.id) + '" alt="' + K.esc(m.file.name || 'картинка') + '">' : '<a href="#" data-pdf="' + K.esc(m.file.id) + '">📎 ' + K.esc(m.file.name || 'файл') + '</a><br>';
      if (m.dir === 'sys') return '<div class="sys">' + K.esc(m.text) + '</div>';
      var b = '<div class="bub ' + (mn ? 'out' : 'in') + '">' + f + K.esc(m.text || '') + t + '</div>';
      if (mn) return b;
      var av = me === 'student' ? (MSG.cur && MSG.cur.cid ? '<img src="' + K.MB + K.esc(MSG.cur.cid) + '.jpg" alt="">' : '<span class="ec-av">' + K.ini(MSG.cur && MSG.cur.name) + '</span>') : '<span class="ec-av">' + K.ini(MSG.stu && MSG.stu.name) + '</span>';
      var st = me === 'student' && m.dir === 'out' ? '<div class="stars" data-m="' + K.esc(m.id) + '">' + (m.stars ? '' : '<span style="margin-right:4px">Оцени ответ</span>') + [1, 2, 3, 4, 5].map(function (k) { return '<button type="button" data-s="' + k + '" class="' + (m.stars >= k ? 'on' : '') + '"' + (m.stars ? ' disabled' : '') + ' aria-label="' + k + ' из 5">★</button>' }).join('') + '</div>' : '';
      return '<div class="row">' + av + b + '</div>' + st }
    function draw(keep) { var top = cb.scrollTop, h0 = cb.scrollHeight, atEnd = cb.scrollHeight - cb.scrollTop - cb.clientHeight < 80, h = '', d0 = '';
      if (MORE && first) h += '<button type="button" class="more" data-a="more">Показать раньше</button>';
      MSG.forEach(function (m) { var d = K.day(m.at); if (d !== d0) { h += '<span class="dsep">' + d + '</span>'; d0 = d } h += bubble(m) });
      cb.innerHTML = h || '<div class="ec-empty">' + (me === 'student' ? 'Здесь будет переписка с куратором. Спроси про урок, покажи работу или напиши, что не получается.' : 'Сообщений пока нет.') + '</div>';
      cb.querySelectorAll('img[data-f]').forEach(function (im) { K.blob(who, '/chat/file?id=' + encodeURIComponent(im.getAttribute('data-f')) + (q ? '&' + q : '')).then(function (u) { im.src = u; im.onclick = function () { window.open(u, '_blank') } }).catch(function () { im.alt = 'Картинка недоступна' }) });
      if (keep === 'top') cb.scrollTop = cb.scrollHeight - h0 + top; else if (keep !== 'stay' || atEnd) cb.scrollTop = 1e9 }
    function load(before) { return K.api(who, '/chat/list?' + [q, before ? 'before=' + encodeURIComponent(before) : ''].filter(Boolean).join('&')).then(function (j) {
      if (!j || !j.ok) { if (!before && !MSG.length && o.onFail) o.onFail(j || {}); return }
      me = j.me || who; if (before || !MSG.length || MORE === false) MORE = !!j.more; MSG.cur = j.curator; MSG.stu = j.student; if (o.onMeta) o.onMeta(j); if (!before) head(j);
      var L = (j.msgs || []).slice().sort(function (a, b) { return a.at - b.at });
      if (before) { MSG = L.concat(MSG.filter(function (m) { return !L.some(function (x) { return x.id === m.id }) })); MSG.cur = j.curator; MSG.stu = j.student; first = L.length ? L[0].id : 0; draw('top') }
      else { var old = MSG.length ? MSG[MSG.length - 1].id + ':' + MSG.length : '', nu = L.length ? L[L.length - 1].id + ':' + L.length : ''; var keepOld = MSG.filter(function (m) { return L.length && m.at < L[0].at });
        MSG = keepOld.concat(L); MSG.cur = j.curator; MSG.stu = j.student; if (!first) first = MSG.length ? MSG[0].id : 0; if (old !== nu || !old) draw('stay') }
      if (j.unread) K.api(who, '/chat/read', o.u ? { u: +o.u } : {}) }) }
    function send(text) { if (busy) return; var t = (text != null ? text : ta.value).trim(); if (!t && !FILE) return; busy = true; var b = el.querySelector('[data-a=send]'); b.disabled = true;
      var body = { text: t }; if (o.u) body.u = +o.u; if (FILE) body.file = FILE;
      K.api(who, '/chat/send', body).then(function (j) { if (!j || !j.ok) { alertMsg(j && j.err || 'Не получилось отправить. Попробуй ещё раз.'); return }
        if (text == null) ta.value = ''; ta.style.height = ''; FILE = null; at.classList.remove('on'); if (j.msg) { MSG.push(j.msg); draw() } else load() })
        .then(function () { busy = false; b.disabled = false }) }
    function alertMsg(t) { var d = document.createElement('div'); d.className = 'sys r'; d.textContent = t; cb.appendChild(d); cb.scrollTop = 1e9 }
    el.addEventListener('click', function (e) { var a = e.target.closest('[data-a]'), k = a && a.getAttribute('data-a');
      if (k === 'send') send(); else if (k === 'pic') fi.click(); else if (k === 'un') { FILE = null; at.classList.remove('on') } else if (k === 'more') load(first);
      var c = e.target.closest('.chips .ec-chip'); if (c) { if (/Показать работу/.test(c.textContent)) fi.click(); else { /* QA №9: быстрая фраза только вставляет текст (и у команды, и у ученика), отправка — кнопкой */ ta.value = (ta.value && !/\s$/.test(ta.value) ? ta.value + ' ' : ta.value) + c.textContent + (who === 'student' ? ': ' : ''); ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length) } catch (er) {} ta.dispatchEvent(new Event('input')) } }
      var s = e.target.closest('.stars button[data-s]'); if (s && !s.disabled) { var w = s.parentNode, mid = w.getAttribute('data-m'), n = +s.getAttribute('data-s');
        K.api('student', '/chat/rate', { mid: mid, stars: n }).then(function (j) { if (j && j.ok) { MSG.forEach(function (m) { if (String(m.id) === mid) m.stars = n }); draw('stay') } }) }
      var p = e.target.closest('a[data-pdf]'); if (p) { e.preventDefault(); K.blob(who, '/chat/file?id=' + encodeURIComponent(p.getAttribute('data-pdf')) + (q ? '&' + q : '')).then(function (u) { window.open(u, '_blank') }).catch(function () {}) } });
    ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px' });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && innerWidth > 767) { e.preventDefault(); send() } });
    fi.onchange = function () { var f = fi.files[0]; fi.value = ''; if (!f) return; K.file(f).then(function (x) { FILE = x; at.querySelector('img').src = /^image/.test(x.mime) ? x.data : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 40"><rect width="56" height="40" rx="8" fill="#2a2a33"/><text x="28" y="25" font-size="11" fill="#fff" text-anchor="middle" font-family="sans-serif">PDF</text></svg>'); at.querySelector('span').textContent = x.name; at.classList.add('on'); ta.focus() }, function (er) { alertMsg(typeof er === 'string' ? er : 'Не получилось прикрепить файл') }) };
    load(); timer = setInterval(function () { if (alive && document.visibilityState === 'visible') load() }, 15000);
    return { reload: load, stop: function () { alive = false; clearInterval(timer) }, focus: function () { ta.focus() } } };
})();

/* 30.10 (макет 6, решение Романа №1): чат на платформе — /teach/control/stream?fs=chat.
   Ученик: переписка со своим куратором + «Написать в Telegram» (Telegram куратора не убираем). Куратор и Роман: слева диалоги (/chat/dialogs), справа переписка; ?fs=chat&u=<uid> — сразу этот ученик.
   Пока сервер не отвечает на /chat/* — понятная заглушка с кнопкой Telegram, страница не ломается. */
(function () {
  if (window.top !== window || window.__ecoChatPg) return; window.__ecoChatPg = 1;
  var K = window.ecoK, U = K && K.U; if (!K || !U) return;
  var path = location.pathname.replace(/\/+$/, ''); if (path !== '/teach/control/stream' || !/[?&]fs=chat\b/.test(location.search)) return;
  var R = document.documentElement, tu = +((location.search.match(/[?&]u=(\d+)/) || [])[1] || 0), STF = !!K.STAFF[U];
  R.classList.add('eco-chp');
  var css = document.createElement('style');
  css.textContent = 'html.eco-chp .gc-main-content>*:not(#ecoChatPg):not(.fs-foot){display:none!important}#ecoChatPg .ec-wrap{display:grid;grid-template-columns:1fr;gap:20px;margin-top:24px;height:calc(100vh - 190px);min-height:520px}#ecoChatPg.st .ec-wrap{grid-template-columns:330px 1fr}'
    + '#ecoChatPg .dl{display:flex;flex-direction:column;min-height:0;padding:10px}#ecoChatPg .dl .ls{flex:1;overflow-y:auto}#ecoChatPg .dl a{display:block;padding:12px 14px;border-radius:16px;color:#fff!important;text-decoration:none!important}#ecoChatPg .dl a.on{background:var(--s3)}#ecoChatPg .dl a b{font-weight:600}#ecoChatPg .dl .tp{display:flex;justify-content:space-between;gap:8px}#ecoChatPg .dl small{display:block;font-size:13px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ecoChatPg .dl .tw{padding:12px 14px;border-radius:16px;box-shadow:inset 0 0 0 1px rgba(42,171,238,.22);margin:2px 0 6px}#ecoChatPg .dl .tw small{display:block;margin-top:2px;font-size:13px;color:#8fd3ff}#ecoChatPg .dl .tw .ta{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}#ecoChatPg .dl .tw .ta a{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border-radius:12px;font-size:13.5px;color:#fff!important}#ecoChatPg .dl .tw .ta a svg{width:16px;height:16px;flex:none}#ecoChatPg .dl .n{min-width:20px;height:20px;border-radius:99px;background:#8f6af0;font-size:11px;font-weight:600;display:inline-grid;place-items:center;padding:0 5px}'
    /* QA раунд 3 (№25, макет 6.1): вкладка «ДЗ» в списке и карточка ученика справа */
    + '#ecoChatPg .dl .tw.hw{box-shadow:inset 0 0 0 1px rgba(195,139,255,.25)}#ecoChatPg .dl .tw.hw small{color:var(--mut)}#ecoChatPg .sp{display:none;align-self:start;padding:18px;overflow-y:auto;max-height:100%}#ecoChatPg.st.has-u .sp{display:block}#ecoChatPg .sp h3{margin:0;font-size:18px;font-weight:600;overflow-wrap:anywhere}#ecoChatPg .sp .sm2{font-size:13px;color:var(--mut);margin-top:2px}'
    + '#ecoChatPg .sp .kv{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}#ecoChatPg .sp .kv div{padding:10px 12px;border-radius:14px;background:var(--s1);border:1px solid var(--line);min-width:0}#ecoChatPg .sp .kv b{display:block;font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ecoChatPg .sp .kv span{display:block;font-size:12px;color:var(--mut)}'
    + '#ecoChatPg .sp .hl{display:grid;gap:6px;margin-top:8px}#ecoChatPg .sp .hl a{display:flex;justify-content:space-between;gap:8px;padding:10px 12px;border-radius:12px;background:var(--s1);color:#fff!important;text-decoration:none!important;font-size:13.5px}#ecoChatPg .sp .hl a span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#ecoChatPg .sp .bt{display:grid;gap:8px;margin-top:16px}#ecoChatPg .sp .bt a{justify-content:center}'
    + '@media(min-width:1280px){#ecoChatPg.st.has-u .ec-wrap{grid-template-columns:300px minmax(0,1fr) 280px}}@media(min-width:768px) and (max-width:1279px){#ecoChatPg.st .sp{grid-column:2}#ecoChatPg.st.has-u .ec-wrap{height:auto}#ecoChatPg.st.has-u .ec-chat{height:calc(100vh - 190px);min-height:520px}}'
    + '#ecoChatPg .tg{display:flex;gap:10px;flex-wrap:wrap}#ecoChatPg .dq,:root body #ecoChatPg input.dq{width:100%;height:44px;margin:0 0 8px!important;padding:0 14px!important;border-radius:14px!important;border:1px solid var(--line2)!important;background:var(--s1)!important;color:#fff!important;font:400 16px "Inter Tight",sans-serif!important;box-shadow:none!important;outline:0}'
    + '@media(max-width:767px){#ecoChatPg .ec-wrap,#ecoChatPg.st .ec-wrap{grid-template-columns:1fr;height:auto;min-height:0}#ecoChatPg .ec-chat{height:calc(100vh - 230px);height:calc(100dvh - 230px);min-height:420px}html.eco-tg #ecoChatPg .ec-chat{height:calc(100dvh - 230px - var(--eco-tb,84px) - var(--tg-top,0px))}#ecoChatPg.st.has-u .dl{display:none}#ecoChatPg.st:not(.has-u) .ec-chat{display:none}}';
  (document.head || R).appendChild(css);
  setTimeout(function () { if (!document.getElementById('ecoChatPg')) R.classList.remove('eco-chp') }, 9000);
  function tgBtn(c) { return c && c.tg ? '<a class="ec-btn2 sm" target="_blank" rel="noopener" href="https://t.me/' + encodeURIComponent(c.tg) + '">' + K.I.tg + 'Написать в Telegram</a>' : '' }
  K.when(function () { var b = K.mount('ecoChatPg', 'eco-chp', STF ? 'Сообщения учеников' : 'Чат с куратором'); if (!b) { R.classList.remove('eco-chp'); return }
    if (STF) { b.classList.add('st'); if (tu) b.classList.add('has-u');
      b.innerHTML = '<div class="ec-hd"><div><h1>Сообщения</h1><div class="ec-sub" id="ecCs">Чаты с учениками</div></div><div class="ec-seg"><a href="/teach/control/stream?fs=cur">Проверка ДЗ</a><a class="on" href="/teach/control/stream?fs=chat">Сообщения</a><a href="/teach/control/stream?fs=pult">Пульт</a></div></div>'
        + '<div class="ec-wrap"><div class="ec-c dl"><div class="ec-seg" style="margin-bottom:8px"><button type="button" class="on" data-f="wait">Ждут ответа</button><button type="button" data-f="hw">ДЗ</button><button type="button" data-f="all">Все</button></div><input type="search" class="dq" placeholder="Поиск ученика" aria-label="Поиск ученика"><div class="ls"><div class="ec-empty">Загружаем…</div></div></div><div id="ecChatBox"></div>' + (tu ? '<aside class="ec-c sp" id="ecStu" aria-label="Об ученике"><div class="ec-empty">Загружаем…</div></aside>' : '') + '</div>';
      /* 30.10 (макет 6.1, QA №25): поиск по ученикам в списке диалогов (по имени, без запроса к серверу) */
      var F = 'wait', box = b.querySelector('#ecChatBox'), ls = b.querySelector('.ls'), chat = null, DQ = '', LAST = null, dq = b.querySelector('.dq');
      dq.addEventListener('input', function () { DQ = dq.value.trim().toLowerCase(); if (LAST) LAST() });
      var MYP = null, MYL = function () { return MYP || (MYP = K.api('staff', '/bank/staff/list').then(function (j) { var M = {}; ((j && j.students) || []).forEach(function (x) { M[x.uid] = x }); return j && j.students ? M : null }, function () { return null })) };
      var ADM = function () { return K.STAFF[U] === 'admin' || +U === 499631257 };
      var HWP = null, HWQ = function () { if (HWP) return HWP; var c = null; try { c = JSON.parse(K.ss('ecoHWQ:' + U) || 'null') } catch (e) {}
        HWP = MYL().then(function (M) { var mine = function (L) { L = L.filter(function (x) { return !M || M[x.uid] }); L.forEach(function (x) { var m = M && M[x.uid]; if (m && m.curName) x.cur = String(m.curName).split(' ')[0]; if (m && m.name && !x.name) x.name = m.name }); return L.sort(function (a, b) { return (a.at || 0) - (b.at || 0) }) };
          if (c && c.L && Date.now() - c.at < 15 * 6e4) return mine(c.L);
          var SVC = /служебн|ученики не видят|не для учеников|архив уроков/i, out = [], seen = {}, url = '/teach/control/answers/unanswered?filter%5Bstatus%5D=unanswered&filter%5Banswer_type%5D=mission_answer&filter%5Blearner_type%5D=all&filter%5Bsorting%5D=need_teacher_reaction_at%20DESC';
          var t = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : '' };
          var page = function (p) { return fetch(url + '&page=' + p, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { if (!r.ok) throw r.status; return r.text() }).then(function (h) { var d = new DOMParser().parseFromString(h, 'text/html'), n = 0, old = false;
            if (!d.querySelector('.answers-list, .answers-page-filter')) throw 'noaccess';
            [].forEach.call(d.querySelectorAll('.user-answer[data-id]'), function (a) { var id = +a.getAttribute('data-id'); if (seen[id]) return; seen[id] = 1; n++;
              var ts = ((a.querySelector('.answer-date a') || {}).title || '').match(/(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/), at = ts ? Date.UTC(+ts[1], ts[2] - 1, +ts[3], ts[4] - 3, +ts[5]) : 0;
              var lk = a.querySelector('.show-lesson-link'), tr = t(lk && lk.querySelector('.text-muted')).replace(/\.\s*$/, ''), ls0 = (lk ? t(lk).replace(t(lk.querySelector('.text-muted')), '').trim() : '') || a.getAttribute('data-lesson-name') || '';
              if (at && Date.now() - at > 14 * 864e5) { old = true; return }
              if (!/\bstatus-new\b/.test(a.className) || SVC.test(tr + ' ' + ls0) || /анкет|вводн|ознаком/i.test(ls0)) return;
              var nm = ls0.replace(/^(?:ДЗ|Д\/З|Домашн(?:ее|яя)\s+(?:задание|работа)|Домашка)(?:\s*№\s*\d+)?\s*[·:.,\-—–|]*\s*/i, '').replace(/^[«"“„](.*)[»"”“]$/, '$1').trim(); if (!nm && tr) nm = tr.split('. ').pop();
              out.push({ id: id, uid: +a.getAttribute('data-user-id'), name: t(a.querySelector('.user-profile-link .text')), lesson: nm, lid: +a.getAttribute('data-lesson-id'), at: at }) });
            return n && !old && p < 4 ? page(p + 1) : out }) };
          return page(1).then(mine, function () { var e = []; e.ok = false; return e }) }); return HWP };
      /* QA раунд 3 (№25, макет 6.1): справа карточка ученика — куратор, место, банк, ДЗ на проверке; «Как ученик» (мини-приложение глазами ученика, только просмотр), банк, профиль GetCourse */
      var stu = function () { var sp = b.querySelector('#ecStu'); if (!sp) return; Promise.all([MYL(), HWQ()]).then(function (r) { var M = r[0], s = M && M[tu], H = (r[1] || []).filter(function (x) { return x.uid === tu });
        var rub = function (v) { return Math.round(+v || 0).toLocaleString('ru-RU') + ' ₽' };
        var nm = s && s.name || (H[0] && H[0].name) || 'Ученик ' + tu;
        sp.innerHTML = '<h3>' + K.esc(nm) + '</h3><div class="sm2">' + K.esc([s && s.stream, s && s.tar].filter(Boolean).join(' · ') || 'Ученик') + '</div>'
          + (ADM() || (s && s.curName) ? '<div class="sm2">' + (s && s.curName ? 'Куратор: ' + K.esc(s.curName) : 'Без куратора') + '</div>' : '')
          + (s ? '<div class="kv"><div><b>' + (s.place ? s.place + ' место' : '—') + '</b><span>в рейтинге</span></div><div><b>' + rub(s.total) + '</b><span>заработал' + (s.pending ? ' · ждут ' + s.pending : '') + '</span></div><div><b>' + (s.active || 0) + '</b><span>' + K.plr(+s.active || 0, 'заказ', 'заказа', 'заказов') + ' в работе</span></div><div><b>' + (s.goal && s.goal.sum ? rub(s.goal.sum) : '—') + '</b><span>цель</span></div></div>' : '<p class="ec-note" style="margin-top:12px">Банк и рейтинг этого ученика тебе не видны.</p>')
          + '<div class="ec-k2" style="margin-top:16px">ДЗ на проверке' + (H.length ? ' · ' + H.length : '') + '</div>' + (H.length ? '<div class="hl">' + H.map(function (x) { return '<a href="/teach/control/stream?fs=cur&a=' + (+x.id) + '"><span>' + K.esc(x.lesson || 'Домашнее задание') + '</span><b class="' + (Date.now() - x.at > 1728e5 ? 'r' : 'dim') + '" style="font-weight:500;white-space:nowrap">' + (x.at ? K.ago(x.at) : '') + ' →</b></a>' }).join('') + '</div>' : '<p class="ec-note" style="margin-top:6px">' + (r[1] && r[1].ok === false ? 'Лента ответов GetCourse недоступна этому входу.' : 'Свежих работ на проверке нет.') + '</p>')
          + '<div class="bt"><a class="ec-btn2 sm" target="_blank" rel="noopener" href="https://t.me/oduvanov_school_bot?startapp=va_' + tu + '" title="Мини-приложение глазами ученика, только просмотр">👁 Как ученик</a><a class="ec-btn2 sm" href="/teach/control/stream?fs=bank&u=' + tu + '">Банк ученика</a><a class="ec-btn2 sm" target="_blank" rel="noopener" href="/user/control/user/update/id/' + tu + '">Профиль в GetCourse</a></div>' }) };
      var DADM = false, tgRow = function (d) { var h = d.tg ? 'https://t.me/' + encodeURIComponent(d.tg) : d.chat ? 'tg://user?id=' + encodeURIComponent(d.chat) : '', ag = Date.now() - d.wait_since;
        return '<div class="tw"><div class="tp"><b>' + K.esc(d.name || 'Ученик') + '</b><span class="' + (ag > 72e5 ? 'r' : ag > 18e5 ? 'a' : 'dim') + '" style="font-size:12px;white-space:nowrap">' + K.ago(d.wait_since) + '</span></div>'
          + '<small>ждёт ответа в Telegram' + (d.cname && DADM ? ' · ' + K.esc(d.cname) : '') + '</small>'
          + '<div class="ta">' + (h ? '<a class="ec-btn2 sm" target="_blank" rel="noopener" href="' + K.esc(h) + '">' + K.I.tg + 'Открыть в Telegram</a>' : '') + (d.uid ? '<a class="ec-btn2 sm" href="/teach/control/stream?fs=chat&u=' + (+d.uid) + '">Чат на платформе</a>' : '') + '</div></div>' };
      /* QA раунд 3 (№25): «ДЗ» — кто ждёт проверки ДЗ (очередь из «Проверки ДЗ» этой вкладки браузера или первые страницы ленты GetCourse), кнопки «Проверить» и «Чат» */
      var hwRow = function (x) { return '<div class="tw hw"><div class="tp"><b>' + K.esc(x.name || 'Ученик') + '</b>' + (x.at ? '<span class="' + (Date.now() - x.at > 1728e5 ? 'r' : Date.now() - x.at > 864e5 ? 'a' : 'dim') + '" style="font-size:12px;white-space:nowrap">' + K.ago(x.at) + '</span>' : '') + '</div>'
          + '<small>ДЗ «' + K.esc(x.lesson || 'Домашнее задание') + '» ждёт проверки' + (DADM && x.cur ? ' · ' + K.esc(x.cur) : '') + '</small>'
          + '<div class="ta"><a class="ec-btn2 sm" href="/teach/control/stream?fs=cur&a=' + (+x.id) + '">Проверить</a><a class="ec-btn2 sm" href="/teach/control/stream?fs=chat&u=' + (+x.uid) + '">Чат</a></div></div>' };
      var hwList = function () { HWQ().then(function (H) { if (F !== 'hw') return; var L = DQ ? H.filter(function (x) { return String(x.name || '').toLowerCase().indexOf(DQ) >= 0 }) : H;
        LAST = hwList; ls.innerHTML = L.length ? L.map(hwRow).join('') + '<div class="ec-note" style="padding:8px 14px">Сначала самые старые. Ответ — в «Проверке ДЗ»</div>' : '<div class="ec-empty">' + (H.ok === false ? 'GetCourse не показал ленту ответов этому входу.' : DQ ? 'Никого не нашли.' : 'Свежих ДЗ на проверке нет.') + '</div>' }) };
      var dlg = function () { if (F === 'hw') { DADM = DADM || ADM(); hwList(); return } K.api('staff', '/chat/dialogs?f=' + F).then(function (j) { var L = j && (j.dialogs || j.list || (Array.isArray(j) ? j : null));
        if (!L) { ls.innerHTML = '<div class="ec-empty">' + (j && j.st === 403 ? 'Сообщения доступны кураторам.' : 'Чат на платформе скоро заработает.') + '</div>'; return }
        /* QA раунд 3 (Н5): ожидания из Telegram-лички куратора (src:'tg', тот же cwait, что «Ждут ответа» в пульте) — отдельной строкой со ссылкой в Telegram */
        DADM = j.me === 'admin'; var nW = L.filter(function (d) { return d.wait_since }).length, nT = L.filter(function (d) { return d.src === 'tg' && d.wait_since }).length;
        b.querySelector('#ecCs').textContent = nW ? 'Ждут ответа: ' + nW + (nT ? ' · в Telegram: ' + nT : '') : 'Все ответили';
        var A = L; LAST = function () { var L = DQ ? A.filter(function (d) { return String(d.name || '').toLowerCase().indexOf(DQ) >= 0 }) : A;
        ls.innerHTML = L.length ? L.map(function (d) { if (d.src === 'tg') return tgRow(d); return '<a href="/teach/control/stream?fs=chat&u=' + (+d.uid) + '" class="' + (+d.uid === tu ? 'on' : '') + '"><div class="tp"><b>' + K.esc(d.name || 'Ученик ' + d.uid) + '</b>' + (d.wait_since ? '<span class="' + (Date.now() - d.wait_since > 72e5 ? 'r' : Date.now() - d.wait_since > 18e5 ? 'a' : 'dim') + '" style="font-size:12px;white-space:nowrap">' + K.ago(d.wait_since) + '</span>' : d.last ? '<span class="dim" style="font-size:12px">' + K.day(d.last.at) + '</span>' : '') + '</div><div class="tp"><small>' + (d.last ? (d.last.dir === 'out' ? 'Вы: ' : '') + K.esc(d.last.text || 'файл') : '') + '</small>' + (d.unread ? '<span class="n">' + d.unread + '</span>' : '') + '</div></a>' }).join('') : '<div class="ec-empty">' + (F === 'wait' ? 'Все ответили. Отлично!' : (DQ ? 'Никого не нашли.' : 'Диалогов пока нет.')) + '</div>' }; LAST() }) };
      b.querySelector('.dl .ec-seg').onclick = function (e) { var x = e.target.closest('[data-f]'); if (!x) return; F = x.getAttribute('data-f'); [].forEach.call(this.children, function (y) { y.classList.toggle('on', y === x) }); dlg() };
      dlg(); setInterval(function () { if (document.visibilityState === 'visible') dlg() }, 30000);
      if (tu) stu();
      if (tu) chat = K.chat(box, { who: 'staff', u: tu, onFail: function (j) { box.className = 'ec-c'; box.innerHTML = '<div class="ec-empty">' + K.esc(j.err || (j.st === 403 ? 'Это не твой ученик.' : 'Чат на платформе скоро заработает.')) + '</div>' } });
      else { box.className = 'ec-c'; box.innerHTML = '<div class="ec-empty">Выбери ученика слева</div>' }
      return }
    b.innerHTML = '<div class="ec-hd"><div><h1>Чат с куратором</h1><div class="ec-sub">Спроси, покажи работу или разбери, что не получается</div></div><div class="tg" id="ecTg"><a class="ec-btn2 sm" href="/teach/control/stream?fs=curator">← Мой куратор</a></div></div><div class="ec-wrap"><div id="ecChatBox"></div></div>';
    var bx = b.querySelector('#ecChatBox');
    K.chat(bx, { who: 'student', onMeta: function (j) { var t = b.querySelector('#ecTg'); if (!t.querySelector('[href*="t.me"]') && j.curator) t.insertAdjacentHTML('beforeend', tgBtn(j.curator)) },
      onFail: function () { var x = new XMLHttpRequest(); x.open('GET', K.API + '/cur/page?u=' + U); x.onload = function () { var d = null; try { d = JSON.parse(x.responseText) } catch (e) {} var c = d && d.cur;
        bx.className = 'ec-c'; bx.innerHTML = '<div class="ec-empty" style="display:grid;gap:16px;justify-items:center"><b style="font-size:20px;color:#fff">Чат на платформе скоро заработает</b><span>' + (c ? 'Пока пиши ' + K.esc(K.dat(c.name)) + ' в Telegram — он ответит там.' : 'Сначала выбери куратора в профиле.') + '</span>' + (c ? (c.tg ? '<a class="ec-btn" target="_blank" rel="noopener" href="https://t.me/' + encodeURIComponent(c.tg) + '">' + K.I.tg + 'Написать в Telegram</a>' : '') : '<a class="ec-btn" href="/pl/' + U + '">Выбрать куратора</a>') + '</div>' }; x.send() } }) });
})();

/* «Мой куратор» для учеников: /teach/control/stream?fs=curator + карточка-вход вверху «Моих тренингов» */
(function () {
  if (window.top !== window || window.__ecoCur) return; window.__ecoCur = 1;
  var API = 'https://oduvanov-api.romanoduvanov52.workers.dev', MB = 'https://romanoduvanov.github.io/otzyvy/gc/curators/';
  var U = +window.accountUserId || 0; if (!U) return;
  var path = location.pathname.replace(/\/+$/, ''), isPage = path === '/teach/control/stream' && /[?&]fs=curator\b/.test(location.search), isList = path === '/teach/control/stream' && !/[?&]fs=/.test(location.search);
  if (!isPage && !isList) return;
  var R = document.documentElement;
  /* страница куратора: сразу прячем список тренингов, чтобы он не мелькал до загрузки (если сервер не ответил за 8 с — показываем как было) */
  if (isPage) { R.classList.add('eco-cur'); setTimeout(function () { if (!document.getElementById('ecoCur')) R.classList.remove('eco-cur') }, 8000) }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function hm(sec) { var m = Math.round(sec / 60); if (m < 60) return m + ' мин'; var h = Math.floor(m / 60); return h + ' ч' + (m % 60 ? ' ' + (m % 60) + ' мин' : '') }
  function when(iso) { var d = new Date(iso), n = Math.round((Date.now() - d) / 864e5); var t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); return n <= 0 ? 'сегодня, ' + t : n === 1 ? 'вчера, ' + t : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) }
  var TG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/></svg>';
  var css = document.createElement('style');
  css.textContent = 'html.eco-cur .gc-main-content>*:not(#ecoCur):not(.fs-foot){display:none!important}'
  /* 30.10 (5.1): раскладка новой страницы «Мой куратор»; общие детали (.ec-*) — в ecoK */
  + '.eco-cb{font-family:"Inter Tight",Inter,sans-serif;color:#fff}#ecoCur .cu-grid{display:grid;grid-template-columns:380px minmax(0,1fr);gap:20px;margin-top:28px;align-items:start}#ecoCur .cu-l{display:flex;flex-direction:column;gap:20px;min-width:0}'
  + '#ecoCur .cu-card{border-radius:28px;overflow:hidden;border:1px solid var(--line);background:var(--s2)}#ecoCur .cu-ph{height:250px;position:relative}#ecoCur .cu-ph img{width:100%;height:100%;object-fit:cover;object-position:50% 25%;display:block}#ecoCur .cu-ph:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,#16161b)}#ecoCur .cu-ph .ec-pill{position:absolute;left:16px;top:16px;z-index:1;background:rgba(0,0,0,.55)}'
  + '#ecoCur .cu-in{padding:0 22px 22px;margin-top:-36px;position:relative}#ecoCur .cu-nm{font-size:28px;font-weight:600;letter-spacing:-.02em;line-height:1.15}#ecoCur .cu-k{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:16px}#ecoCur .cu-k>div{padding:12px;background:var(--s1);border:1px solid var(--line);border-radius:16px;min-width:0}#ecoCur .cu-k b{display:block;font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}#ecoCur .cu-k span{display:block;font-size:12px;color:var(--dim)}'
  + '#ecoCur .cu-bt{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}#ecoCur .cu-bt a{flex:1 1 100%}#ecoCur .cu-warn{background:linear-gradient(120deg,#6724ad,#3a1470 60%,#1c0838);border-color:rgba(252,203,255,.3)}'
  + '#ecoCur .cu-r{position:sticky;top:20px;height:calc(100vh - 180px);min-height:560px;max-height:1010px}#ecoCur .cu-r>div{height:100%}'
  /* 30.10 (5.1, QA №33): карточка эфира с отсчётом и «Напомнить» (вкладка «Эфиры» вверху прокручивает к ней) */
  + '#ecoCur .cu-ef.has{padding:0;overflow:hidden}#ecoCur .cu-efp{position:relative;height:150px;background:linear-gradient(135deg,#3a1470,#16161b)}#ecoCur .cu-efp img{width:100%;height:100%;object-fit:cover;display:block}#ecoCur .cu-efp:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(10,10,14,.92))}#ecoCur .cu-efp .ec-pill{position:absolute;left:14px;top:14px;z-index:1}'
  + '#ecoCur .cu-eft{position:absolute;left:16px;right:16px;bottom:14px;z-index:1}#ecoCur .cu-eft b{display:block;font-size:19px;font-weight:600;line-height:1.2}#ecoCur .cu-eft span{display:block;font-size:13px;color:rgba(255,255,255,.7);margin-top:4px}'
  + '#ecoCur .cu-efb{display:flex;gap:10px;align-items:center;padding:14px 16px}#ecoCur .cu-efb .ec-btn2,#ecoCur .cu-efb .ec-btn{flex:1;height:48px;font-size:15px}#ecoCur .cu-cd{display:flex;gap:6px}#ecoCur .cu-cd span{display:grid;place-items:center;align-content:center;min-width:52px;height:48px;border-radius:12px;background:var(--s1);border:1px solid var(--line)}#ecoCur .cu-cd b{font-size:17px;font-weight:600;line-height:1}#ecoCur .cu-cd small{font-size:11px;color:var(--dim)}'
  + '@media(max-width:1023px){#ecoCur .cu-grid{grid-template-columns:1fr}#ecoCur .cu-r{position:static;height:70vh;min-height:480px}}@media(max-width:767px){#ecoCur .cu-seg{display:none}#ecoCur .cu-ph{height:220px}#ecoCur .cu-k b{font-size:17px}#ecoCur .cu-r{height:72vh;height:72dvh}}'
  + '.eco-cb{display:flex;align-items:center;gap:16px;margin:0 0 20px;padding:16px 20px;border-radius:24px;background:#161616;border:1px solid rgba(195,139,255,.3);text-decoration:none!important}.eco-cb img{width:52px;height:52px;border-radius:99px;object-fit:cover}.eco-cb b{display:block;font-size:17px;font-weight:500;color:#fff}.eco-cb span{font-size:14px;color:rgba(255,255,255,.58)}.eco-cb i{margin-left:auto;font-style:normal;color:#d77fff;font-weight:600;font-size:15px;white-space:nowrap}.eco-cb.in{margin:24px 0 8px;box-sizing:border-box}.eco-cb .ecd{display:inline-block;width:8px;height:8px;border-radius:50%;background:#6b6b6b;margin-right:7px;vertical-align:1px}.eco-cb .ecd.on{background:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.18)}'
  + '@media (max-width:760px){.eco-cb i{display:none}.eco-cb.in{margin:16px 0 8px}}';
  (document.head || R).appendChild(css);
  function data(cb) { var x = new XMLHttpRequest(); x.open('GET', API + '/cur/page?u=' + U); x.onload = function () { try { cb(JSON.parse(x.responseText)) } catch (e) {} }; x.send() }
  function dm(c) { return c.tg ? 'https://t.me/' + encodeURIComponent(c.tg) : '/pl/' + U }
  /* 30.10 (макет 5.1): «Мой куратор» — слева фото, кто он и три цифры (как быстро отвечает, часы МСК, оценка учеников), мои работы; справа чат на платформе.
     Две кнопки по решению Романа: «Чат на платформе» и «Написать в Telegram». Чат — общий модуль ecoK.chat (/chat/*); если сервер чата ещё не готов — сообщения от куратора и Telegram, как было. */
  function page(d) {
    var K = window.ecoK, mc = document.querySelector('.gc-main-content'); if (!K || !mc || document.getElementById('ecoCur')) return;
    R.classList.add('eco-cur'); document.title = 'Мой куратор · OduvanovSchool';
    var b = document.createElement('div'); b.id = 'ecoCur'; b.className = 'ec'; var c = d.cur, h = '';
    h += '<div class="ec-hd"><div><h1>Мой куратор</h1><div class="ec-sub">Спроси, покажи работу или разбери, что не получается</div></div><div class="ec-seg cu-seg"><a class="on" href="#ecCuChat" data-t="chat">Чат</a><a href="#ecCuWorks" data-t="works">Мои работы</a><a href="#ecCuEf" data-t="ef">Эфиры</a></div></div>';
    if (!c) { h += '<section class="ec-c" style="margin-top:28px;max-width:720px"><h3 style="font-size:28px">Куратор ещё не выбран</h3><p class="mut" style="margin:12px 0 24px">Выбери куратора в профиле — он будет проверять домашки, отвечать на вопросы и вести тебя до результата.</p><a class="ec-btn" href="/pl/' + U + '">Выбрать куратора</a></section>' }
    else {
      var hrs = c.hours ? c.hours[0] + '–' + c.hours[1] : '—';
      h += '<div class="cu-grid"><div class="cu-l"><div class="cu-card"><div class="cu-ph"><img src="' + MB + esc(c.id) + '.jpg" alt="' + esc(c.full) + '"><span class="ec-pill ' + (d.online ? 'g' : 'n') + '"><i></i>' + (d.online ? 'На связи' : 'Сейчас не на связи') + '</span></div>'
        + '<div class="cu-in"><div class="cu-nm">' + esc(c.full) + '</div><div class="mut" style="font-size:14px;margin-top:2px">' + esc(c.about || 'Проверяет домашки, отвечает на вопросы и ведёт тебя до результата.') + '</div>'
        + '<div class="cu-k"><div><b id="ecCuA">' + (d.median != null ? hm(d.median).replace(' ', ' ') : '—') + '</b><span>обычно отвечает</span></div><div><b>' + hrs + '</b><span>часы, МСК</span></div><div><b id="ecCuS">—</b><span>оценка учеников</span></div></div>'
        + '<div class="cu-bt"><a class="ec-btn sm" data-a="tochat" href="/teach/control/stream?fs=chat">Чат на платформе</a><a class="ec-btn2 sm" target="_blank" rel="noopener" href="' + dm(c) + '">' + TG + 'Написать в Telegram</a></div></div></div>';
      if (d.auth && d.tg_ok === false) h += '<div class="ec-c cu-warn"><b style="display:block;font-size:17px;font-weight:600">Подключи Telegram</b><span class="mut" style="font-size:14px">Сюда будут приходить ответы куратора, напоминания об эфирах и x2.</span><a class="ec-btn sm" style="margin-top:12px" href="/pl/' + U + '">Подключить</a></div>';
      h += '<div class="ec-c" id="ecCuWorks"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3>Мои работы</h3><span class="mut" style="font-size:13px" id="ecCuWn"></span></div><div class="ec-bar" style="margin:12px 0 6px"><i style="width:0"></i></div><div id="ecCuWl"><div class="ec-empty" style="padding:12px 0">Загружаем…</div></div></div>';
      h += '<div class="ec-c cu-ef" id="ecCuEf"><div class="ec-empty" style="padding:8px 0">Загружаем эфиры…</div></div>';
      var f = d.feed || [];
      if (f.length) h += '<div class="ec-c"><h3>Сообщения всем ученикам</h3>' + f.slice(0, 5).map(function (m) { return '<div class="ec-li" style="align-items:flex-start"><div class="t"><small>' + esc(m.who || c.name) + ' · ' + when(m.at) + '</small><div style="white-space:pre-wrap;margin-top:4px;font-size:14.5px">' + esc(m.text) + '</div>' + (m.link ? '<a class="ec-pill v" style="margin-top:8px;text-decoration:none" target="_blank" rel="noopener" href="' + esc(m.link) + '">' + esc(m.btn || 'Открыть') + '</a>' : '') + '</div></div>' }).join('') + '</div>';
      h += '</div><div class="cu-r" id="ecCuChat"></div></div>';
    }
    b.innerHTML = h; mc.insertBefore(b, mc.firstChild);
    if (!c) return;
    var box = b.querySelector('#ecCuChat'), k = document.createElement('div'); box.appendChild(k);
    K.chat(k, { who: 'student', onMeta: function (j) { var cc = j.curator || {}; if (cc.avg_reply_min) b.querySelector('#ecCuA').textContent = cc.avg_reply_min + ' мин'; if (cc.stars) b.querySelector('#ecCuS').textContent = String((+cc.stars).toFixed(1)).replace('.', ',') },
      onFail: function () { k.className = 'ec-c'; k.innerHTML = '<div class="ec-empty" style="display:grid;gap:14px;justify-items:center"><b style="font-size:20px;color:#fff">Чат на платформе скоро заработает</b><span>Пока пиши ' + esc(window.ecoK.dat(c.name)) + ' в Telegram — ответы придут туда же.</span><a class="ec-btn" target="_blank" rel="noopener" href="' + dm(c) + '">' + TG + 'Написать в Telegram</a></div>' } });
    /* телефон: «Чат / Мои работы» — вкладки */
    /* 30.10 (после QA №10): «Чат на платформе» на этой странице — к чату справа (на телефоне — ниже) и курсор в поле, а не перезагрузка в ?fs=chat */
    b.querySelector('[data-a=tochat]').onclick = function (e) { var t = b.querySelector('#ecCuChat textarea'); if (!t) return; e.preventDefault(); if (innerWidth <= 767) { b.classList.remove('cu-w', 'cu-e'); [].forEach.call(b.querySelectorAll('.cu-seg a'), function (x) { x.classList.toggle('on', x.getAttribute('data-t') === 'chat') }) } b.querySelector('#ecCuChat').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(function () { try { t.focus({ preventScroll: true }) } catch (er) {} }, 350) };
    /* телефон: «Чат / Мои работы / Эфиры» — вкладки; компьютер — прокрутка к блоку */
    b.querySelector('.cu-seg').onclick = function (e) { var a = e.target.closest('[data-t]'); if (!a) return; e.preventDefault(); [].forEach.call(this.children, function (x) { x.classList.toggle('on', x === a) }); var k = a.getAttribute('data-t');
      if (innerWidth > 767) { var tg = b.querySelector(k === 'works' ? '#ecCuWorks' : k === 'ef' ? '#ecCuEf' : '#ecCuChat'); if (tg) tg.scrollIntoView({ behavior: 'smooth', block: 'start' }); return }
      b.classList.toggle('cu-w', k === 'works'); b.classList.toggle('cu-e', k === 'ef') };
    works(b); efir(b, c) }
  /* «Мои работы» из /ma/learn (тот же ответ, что у «Учёбы» в приложении): сданные ДЗ со статусом проверки */
  function works(b) { var K = window.ecoK; K.tok().then(function (t) { if (!t) throw 0; return fetch(API + '/ma/learn?t=' + encodeURIComponent(t)).then(function (r) { return r.json() }) }).then(function (j) {
    var L = [], all = 0, now = Date.now(); ((j && j.course && j.course.modules) || []).forEach(function (m) { if (!m.access) return; (m.parts || []).forEach(function (p) { (p.lessons || []).forEach(function (l) { if (l.kind !== 'hw') return; if (!l.at || Date.parse(l.at) <= now) all++; if (l.hw) L.push({ l: l, m: m }) }) }) });
    var ok = L.filter(function (x) { return x.l.hw.st === 'ok' }).length, ST = { ok: ['g', 'Принято'], wn: ['r', 'Доработать'], rv: ['a', 'Проверяет'], dr: ['n', 'Черновик'] };
    /* 30.10 (после QA №10): пока ничего не сдано — «открыто N ДЗ» без полосы, а не «0 из 4 приняты» рядом с «Сданных работ пока нет» */
    if (!L.length) { b.querySelector('#ecCuWn').textContent = all ? 'открыто ' + all + '\u00a0ДЗ' : ''; b.querySelector('#ecCuWorks .ec-bar').style.display = 'none' }
    else b.querySelector('#ecCuWn').textContent = ok + ' из ' + Math.max(all, L.length) + ' ' + K.plr(ok, 'принята', 'приняты', 'приняты');
    b.querySelector('#ecCuWorks .ec-bar i').style.width = (all ? Math.round(ok / Math.max(all, L.length) * 100) : 0) + '%';
    var w = L.slice().sort(function (a, c) { var o = { wn: 0, rv: 1, dr: 2, ok: 3 }; return (o[a.l.hw.st] || 0) - (o[c.l.hw.st] || 0) }).slice(0, 6);
    b.querySelector('#ecCuWl').innerHTML = w.length ? w.map(function (x) { var s = ST[x.l.hw.st] || ST.rv, n = x.m.n ? 'Модуль ' + x.m.n : x.m.title;
      return '<a class="ec-li" href="/pl/teach/control/lesson/view?id=' + (+x.l.id) + '"><div class="t"><b>' + esc(K.nb(x.l.t)) + '</b><small>' + esc(n) + (x.l.hw.st === 'ok' && x.l.hw.pts ? ' · +' + x.l.hw.pts + ' ' + K.plr(x.l.hw.pts, 'балл', 'балла', 'баллов') : x.l.hw.st === 'wn' ? ' · есть замечания' : '') + '</small></div><span class="ec-pill ' + s[0] + '"><i></i>' + s[1] + '</span></a>' }).join('')
      : '<div class="ec-empty" style="padding:12px 0">Сданных работ пока нет. Когда сдашь ДЗ, здесь будет видно, что с ним.</div>' })
    .catch(function () { var e = b.querySelector('#ecCuWorks'); if (e) e.style.display = 'none' }) }
  /* 30.10 (макет 5.1, QA №33): карточка эфира в «Мой куратор» — ближайший эфир (сначала идущий, потом эфир этого куратора, потом любой) из /efir/list:
     обложка, «Эфир · завтра 19:00 МСК», кто ведёт, отсчёт и «Напомнить» (POST /efir/reg — бот напомнит за сутки, за час и при старте); идёт — «Войти в эфир».
     Эфиров нет или сервер эфиров ещё не выложен — короткая заглушка и ссылка на «Эфиры». */
  function efir(b, c) { var K = window.ecoK, box = b.querySelector('#ecCuEf'); if (!box) return;
    var D = function (t) { return new Date(t).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' }) };
    var whenS = function (t) { var d = D(t), hm = new Date(t).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
      return (d === D(Date.now()) ? 'сегодня' : d === D(Date.now() + 864e5) ? 'завтра' : new Date(t).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long' })) + ' ' + hm + ' МСК' };
    var empty = function () { box.classList.remove('has'); box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3>Эфиры</h3><a class="ec-pill v" style="text-decoration:none" href="/teach/control/stream?fs=efir">Все эфиры →</a></div><p class="mut" style="font-size:14px;margin:8px 0 0">' + K.esc(K.nb('Ближайших эфиров пока нет. Когда ' + (c.name || 'куратор') + ' назначит разбор работ или вопрос-ответ, он появится здесь, а бот напомнит заранее.')) + '</p>' };
    K.api('student', '/efir/list').then(function (j) { if (!j || !j.ok) return empty();
      var mine = function (x) { var h = x.host || {}; return h.cid === c.id || !!(h.name && c.full && h.name === c.full) }, L = j.live || [], S = (j.soon || []).filter(function (x) { return !x.locked });
      var e = L.filter(mine)[0] || L[0] || S.filter(mine)[0] || S[0]; if (!e) return empty(); var live = e.state === 'live', h = e.host || {};
      box.classList.add('has');
      box.innerHTML = '<div class="cu-efp">' + (e.cover ? '<img src="' + K.esc(e.cover) + '" alt="" loading="lazy">' : '') + '<span class="ec-pill" style="background:rgba(0,0,0,.6);color:#fff">' + (live ? '<i style="background:#f87171"></i>LIVE · идёт сейчас' : 'Эфир · ' + whenS(e.start)) + '</span>'
        + '<div class="cu-eft"><b>' + K.esc(K.nb(e.title || 'Эфир')) + '</b><span>' + K.esc((h.short || h.name) ? 'Ведёт ' + (h.short || h.name) : 'Эфир потока') + (e.work !== false && !live ? ' · пришли работу на разбор' : '') + '</span></div></div>'
        + '<div class="cu-efb">' + (live ? '<a class="ec-btn sm" href="/teach/control/stream?fs=efir&e=' + (+e.id) + '">Войти в эфир</a>' : '<span class="cu-cd" data-t="' + (+e.start) + '"></span><button type="button" class="ec-btn2 sm" data-reg="' + (+e.id) + '" aria-pressed="' + (e.reg ? 'true' : 'false') + '">' + (e.reg ? '✓ Напомню' : 'Напомнить') + '</button>') + '</div>';
      var cd = box.querySelector('.cu-cd'), tick = function () { if (!cd || !cd.isConnected) return; var m = Math.max(0, Math.round((+cd.getAttribute('data-t') - Date.now()) / 6e4)), dd = Math.floor(m / 1440), hh = Math.floor(m % 1440 / 60), mm = m % 60;
        cd.innerHTML = (dd ? '<span><b>' + dd + '</b><small>' + K.plr(dd, 'день', 'дня', 'дней') + '</small></span>' : '') + '<span><b>' + hh + '</b><small>' + K.plr(hh, 'час', 'часа', 'часов') + '</small></span>' + (dd ? '' : '<span><b>' + mm + '</b><small>мин</small></span>') };
      tick(); setInterval(tick, 30000);
      var rb = box.querySelector('[data-reg]'); if (rb) rb.onclick = function () { rb.disabled = true; K.api('student', '/efir/reg', { id: +e.id, on: e.reg ? 0 : 1 }).then(function (r) { rb.disabled = false;
        if (!r || !r.ok) { rb.textContent = (r && r.err) || 'Не получилось — попробуй ещё раз'; return } e.reg = r.reg ? 1 : 0; rb.setAttribute('aria-pressed', e.reg ? 'true' : 'false'); rb.textContent = e.reg ? '✓ Напомню' : 'Напомнить' }) } }) }
  function banner(d) { var c = d.cur; if (!c || document.querySelector('.eco-cb')) return; var mc = document.querySelector('.gc-main-content'); if (!mc) return;
    var a = document.createElement('a'); a.className = 'eco-cb'; a.href = '/teach/control/stream?fs=curator';
    a.innerHTML = '<img src="' + MB + esc(c.id) + '.jpg" alt=""><span style="flex:1;min-width:0"><b>Мой куратор · ' + esc(c.full) + '</b><span>' + (d.online ? '<span class="ecd on"></span>На связи' : '<span class="ecd"></span>Сейчас не на связи') + (c.hours ? ' · с\u00a0' + c.hours[0] + ':00 до\u00a0' + c.hours[1] + ':00\u00a0МСК' : '') + '</span></span><i>Открыть →</i>';
    var xr = mc.querySelector('.page-full-block .container > .xdget-root'); if (xr) { a.classList.add('in'); xr.parentNode.insertBefore(a, xr); return }
    var t = mc.querySelector('.fs-hero, h1, .page-header'); if (t && t.parentElement === mc && t.nextSibling) mc.insertBefore(a, t.nextSibling); else mc.insertBefore(a, mc.firstChild) }
  function go() { data(function (d) { if (!d || !d.ok) return; var n = 0, iv = setInterval(function () { if (document.querySelector('.gc-main-content') || ++n > 40) { clearInterval(iv); if (isPage) page(d); else banner(d) } }, 150) }) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

/* «Мой банк» и «Учёт заказов» для учеников: /teach/control/stream?fs=bank и ?fs=orders (фрейм gc/bank.html, вход через бота) + карточка-вход в «Моих тренингах» */
(function () {
  if (window.top !== window || window.__ecoBank) return; window.__ecoBank = 1;
  var U = +window.accountUserId || 0; if (!U) return;
  var path = location.pathname.replace(/\/+$/, ''), onStream = path === '/teach/control/stream', m = onStream && location.search.match(/[?&]fs=(bank|orders)\b/), kind = m ? m[1] : '', isList = onStream && !/[?&]fs=/.test(location.search);
  if (!kind && !isList) return;
  var R = document.documentElement, V = 8;
  var css = document.createElement('style');
  css.textContent = 'html.eco-bank .gc-main-content>*:not(#ecoBank):not(.fs-foot){display:none!important}'
    + '#ecoBank{max-width:820px;margin:0 auto;padding:8px 24px 0}#ecoBank iframe{display:block;width:100%;border:0;min-height:800px;background:transparent;color-scheme:dark}'
    + '#ecoBank h1{margin:16px 16px 0;font:500 48px/1.05 "Inter Tight",Inter,sans-serif;letter-spacing:-.03em;color:#fff}#ecoBank .eco-back{display:inline-flex;margin:8px 16px 0;color:#d77fff;font:500 14px "Inter Tight",Inter,sans-serif;text-decoration:none}'
    + '.eco-bk{display:flex;align-items:center;gap:16px;margin:0 0 20px;padding:16px 20px;border-radius:24px;background:linear-gradient(160deg,rgba(103,36,173,.55),rgba(22,22,22,.9) 70%);border:1px solid rgba(195,139,255,.3);text-decoration:none!important;font-family:"Inter Tight",Inter,sans-serif}'
    + '.eco-bk .ic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;font-size:24px;font-weight:600;flex:none}.eco-bk b{display:block;font-size:17px;font-weight:500;color:#fff}.eco-bk span span{color:rgba(255,255,255,.6);font-size:14px}.eco-bk i{font-style:normal;color:#d77fff;font-weight:500;font-size:14px;white-space:nowrap}'
    + '@media (max-width:760px){#ecoBank{padding:4px 4px 0}#ecoBank h1{font-size:36px}.eco-bk{padding:14px 16px}.eco-bk i{display:none}}';
  (document.head || R).appendChild(css);
  function page() { var mc = document.querySelector('.gc-main-content'); if (!mc) return false; if (document.getElementById('ecoBank')) return true;
    var tu = +((location.search.match(/[?&]u=(\d+)/) || [])[1] || 0), st = { 504950432: 1, 510261529: 1, 499631257: 1 }[U],
      T = tu && tu !== U ? 'Банк ученика' : kind === 'orders' ? (st ? 'Заказы учеников' : 'Мои заказы') : (st ? 'Банк учеников' : 'Мой банк');
    R.classList.add('eco-bank'); document.title = T + ' · OduvanovSchool';
    /* 27.10: на весь экран (класс fs-full растягивает тема), прокрутка внутри фрейма — одна полоса; заголовок рисует сама страница банка */
    var box = document.createElement('div'); box.id = 'ecoBank';
    box.innerHTML = '<iframe class="fs-full" title="' + T + '" src="https://romanoduvanov.github.io/otzyvy/gc/bank.html?embed=1&view=' + kind + '&gc=' + U + (tu && tu !== U ? '&u=' + tu : '') + '&v=' + V + '" allow="clipboard-write"></iframe>';
    mc.insertBefore(box, mc.firstChild);
    return true }
  function card() { var mc = document.querySelector('.gc-main-content'); if (!mc) return false; if (document.querySelector('.eco-bk')) return true;
    var a = document.createElement('a'); a.className = 'eco-bk'; a.href = '/teach/control/stream?fs=bank';
    a.innerHTML = '<span class="ic">₽</span><span style="flex:1;min-width:0"><b>Мой банк и&nbsp;заказы</b><span>Записывай оплаты от&nbsp;клиентов, веди заказы и&nbsp;получай награды за&nbsp;рубежи</span></span><i>Открыть →</i>';
    var cb = mc.querySelector('.eco-cb'); if (cb) { cb.parentNode.insertBefore(a, cb.nextSibling); return true }
    var xr = mc.querySelector('.page-full-block .container > .xdget-root'); if (xr) { xr.parentNode.insertBefore(a, xr); return true }
    mc.insertBefore(a, mc.firstChild); return true }
  function go() { var n = 0, iv = setInterval(function () { var ok = kind ? page() : (document.querySelector('.eco-cb') || n > 12) && card(); if (ok || ++n > 40) clearInterval(iv) }, 150) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

/* 30.10 «Эфиры» (макет «Банк, кураторы и связь», раздел 9.1): /teach/control/stream?fs=efir — фрейм gc/efir.html на весь экран справа от меню (fs-full),
   вход через кабинет (ecoNeedAuth → FS_AUTH), &e=<id> — сразу комната эфира. Команде там же «Пульт эфиров». */
(function () {
  if (window.top !== window || window.__ecoEfir) return; window.__ecoEfir = 1;
  var U = +window.accountUserId || 0; if (!U) return;
  var path = location.pathname.replace(/\/+$/, ''); if (path !== '/teach/control/stream' || !/[?&]fs=efir\b/.test(location.search)) return;
  var R = document.documentElement, V = 1, e = +((location.search.match(/[?&]e=(\d+)/) || [])[1] || 0);
  var css = document.createElement('style');
  css.textContent = 'html.eco-efir .gc-main-content>*:not(#ecoEfir):not(.fs-foot){display:none!important}#ecoEfir iframe{display:block;width:100%;border:0;min-height:800px;background:#000106;color-scheme:dark}';
  (document.head || R).appendChild(css);
  function page() { var mc = document.querySelector('.gc-main-content'); if (!mc) return false; if (document.getElementById('ecoEfir')) return true;
    R.classList.add('eco-efir'); document.title = 'Эфиры · OduvanovSchool';
    var box = document.createElement('div'); box.id = 'ecoEfir';
    box.innerHTML = '<iframe class="fs-full" title="Эфиры" src="https://romanoduvanov.github.io/otzyvy/gc/efir.html?embed=1&gc=' + U + '&v=' + V + (e ? '#e' + e : '') + '" allow="autoplay; fullscreen; picture-in-picture; clipboard-write" allowfullscreen></iframe>';
    mc.insertBefore(box, mc.firstChild); return true }
  var n = 0, iv = setInterval(function () { if (page() || ++n > 40) clearInterval(iv) }, 150);
})();

/* Общие правки интерфейса кабинета (зона eco.js):
   1) пункты «Мой банк» и «Учёт заказов» в главном меню GetCourse (сайдбар на ПК и меню-бургер на телефоне);
   2) иконка бургера в шапке телефона — в стиле школы;
   3) плашки «Почта не подтверждена» / «Подключи Telegram» в потоке страницы: крестик справа, кнопка под текстом на телефоне.
   Если перенесёте 2–3 в theme.css — удалите отсюда. */
(function () {
  if (window.top !== window || window.__ecoUi) return; window.__ecoUi = 1;
  var U = +window.accountUserId || 0, R = document.documentElement;
  var BUR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M5 7h14M5 17h14' stroke='%23fff'/%3E%3Cpath d='M5 12h9' stroke='%23c38bff'/%3E%3C/svg%3E";
  var css = document.createElement('style');
  var MI = { bank: '<rect x="3.5" y="7" width="17" height="12.5" rx="3"/><path d="M3.5 11h17M15.5 15.5h2"/><path d="M6.5 7l9-3c.9-.3 1.6.3 1.6 1.2V7"/>', orders: '<rect x="5" y="4.5" width="14" height="16" rx="3"/><path d="M9 3.5h6v2.5H9z"/><path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4"/>', efir: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13"/>', pult: '<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3.5" y="13" width="4" height="6" rx="1.5"/><rect x="16.5" y="13" width="4" height="6" rx="1.5"/><path d="M18.5 19c0 1.3-1.5 2-3.5 2h-2"/>', curator: '<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2"/><rect x="3.5" y="13" width="4" height="6" rx="1.5"/><rect x="16.5" y="13" width="4" height="6" rx="1.5"/><path d="M18.5 19c0 1.3-1.5 2-3.5 2h-2"/>', cur: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12.5 2.5 2.5 5-6"/>' };
  css.textContent = ':root body .top-menu .burger-icon-wrapper{min-width:44px!important;min-height:44px!important;width:44px;height:44px;border-radius:14px;background:#161616 url("' + BUR + '") center/22px 22px no-repeat!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);cursor:pointer}'
    + ':root body .top-menu .burger-icon-wrapper>svg{display:none!important}'
    + 'html body .fs-ntc .notice-top-panel::before{order:0}html body .fs-ntc .notice-top-panel .redesigned-notice-content{order:1}html body .fs-ntc .notice-top-panel .close-link{order:9;align-self:flex-start}'
    + '@media(max-width:767px){html body .fs-ntc .notice-top-panel .redesigned-notice-content{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}html body .fs-ntc .notice-top-panel .redesigned-notice-text{width:100%}html body .fs-ntc .notice-top-panel .close-link{width:40px!important;height:40px!important}}'
    + ':root body .top-menu .top-menu__logo{margin-left:16px!important;white-space:nowrap;flex:none}'
    + '.main-menu .balances-info__item .Caption{color:rgba(255,255,255,.88)!important}.main-menu .balances-info__item .Caption+.Caption,.main-menu .balances-info__item>:last-child{color:#e2c9ff!important;font-weight:600}'
    + '@media(max-width:767px){html body .global-controls.eco-gc{position:static!important;inset:auto!important;transform:none!important;display:flex!important;flex-wrap:wrap;gap:8px;width:auto!important;margin:12px 16px 4px!important;padding:0!important;z-index:auto!important;background:none!important;box-shadow:none!important}html body .global-controls.eco-gc .btn{flex:1 1 100%;margin:0!important;min-height:44px;border-radius:12px!important}}'
    + 'html.eco-has-fab .gc-main-content{padding-bottom:calc(80px + max(env(safe-area-inset-bottom), calc(var(--tg-safe-area-inset-bottom,0px) + var(--tg-content-safe-area-inset-bottom,0px))))!important}'
    /* 28.10: свои пункты меню — иконки тем же способом, что тема рисует пункты GetCourse (маска 24×24, линия 1.6), и подпись в раскрытом меню */
    + 'html body .main-menu .eco-mi .main-menu-item__icon svg{opacity:0!important}'
    + 'html body .main-menu .eco-mi .main-menu-item__icon::before{content:"";position:absolute;left:50%;top:50%;width:26px;height:26px;margin:-13px 0 0 -13px;background:currentColor;-webkit-mask:var(--fsi) center/26px 26px no-repeat;mask:var(--fsi) center/26px 26px no-repeat;pointer-events:none}'
    + ['bank', 'orders', 'pult', 'curator', 'cur', 'efir'].map(function (k) { return 'html body .main-menu .eco-mi[data-eco="' + k + '"] .main-menu-item__icon{--fsi:url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none">' + MI[k] + '</svg>') + '")}' }).join('')
    + '.main-menu:not(.main-menu--is-expanded) .eco-mi .main-menu-item__header-body{display:none!important}'
    + '.main-menu .eco-mi .tooltip__dropdown{display:none}'
    /* 28.10: редактор анкет в админке (/user/control/survey/update) — был белый фон под белым текстом */
    + 'html body .custom-form-editor .fields{background:#161616!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:16px!important;color:#fff!important}html body .custom-form-editor .fields .help-block,html body .custom-form-editor .fields .hint{color:rgba(255,255,255,.55)!important}'
    + 'html body .custom-form-editor .field-wrapper.selected{background:rgba(195,139,255,.1)!important;box-shadow:inset 0 0 0 1px rgba(195,139,255,.35)!important;border-radius:12px!important}html body .custom-form-editor .field-wrapper:hover{background:rgba(255,255,255,.03)}'
    + 'html body .custom-form-editor .field-settings-editor{background:#161616!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:16px!important;color:#fff!important;padding:16px!important}'
    /* 28.10: строка без номера в списке уроков (анкета) — текст в две строки уезжал под отступ; flex держит отступ у всех строк */
    + ':root body .fs-ll-t{display:flex;align-items:baseline;min-width:0}:root body .fs-ll-t>em,:root body .fs-ll-t::before{flex:none}'
    + '@media(max-width:767px){:root body .fs-ll a>.fs-ll-r,:root body .fs-ll a>.fs-chip{margin-left:calc(16px * 1.3 + 10px)}}';
  (document.head || R).appendChild(css);
  if (!U) return;
  var cur = location.pathname.replace(/\/+$/, '') === '/teach/control/stream' && (location.search.match(/[?&]fs=(bank|orders|pult|curator|cur|chat|efir)\b/) || [])[1]; if (cur === 'chat') cur = ({ 504950432: 1, 510261529: 1 })[U] ? 'cur' : 'curator';
  var IT = [['bank', 'Мой банк', '<rect x="10" y="13" width="20" height="15" rx="3.5" stroke="var(--primary-black, #000000)" stroke-width="1.6"/><path d="M10 18h20" stroke="var(--primary-black, #000000)" stroke-width="1.6"/><path d="M23.5 23.5h2.5" stroke="var(--primary-black, #000000)" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 13 25 9.8c1-.3 1.9.4 1.9 1.4V13" stroke="var(--primary-black, #000000)" stroke-width="1.6"/>'],
    ['orders', 'Мои заказы', '<rect x="12" y="11" width="16" height="19" rx="3.5" stroke="var(--primary-black, #000000)" stroke-width="1.6"/><path d="M16 9.5h8v3h-8z" stroke="var(--primary-black, #000000)" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 18h8M16 22h8M16 26h5" stroke="var(--primary-black, #000000)" stroke-width="1.6" stroke-linecap="round"/>'],
    /* 28.10: «Кураторы» (пульт) — Роману и кураторам; ученикам — «Мой куратор» */
    ({ 504950432: 1, 510261529: 1, 499631257: 1 })[U] ? ['pult', 'Кураторы', ''] : ['curator', 'Мой куратор', '']];
  /* 30.10 (решение Романа №4): куратор видит сайт как ученик + «Кабинет куратора» (?fs=cur: проверка ДЗ, сообщения, пульт); Роману — «Проверка ДЗ» рядом с «Кураторами» */
  if (U === 504950432 || U === 510261529) IT[2] = ['cur', 'Кабинет куратора', '']; else if (U === 499631257) IT.push(['cur', 'Проверка ДЗ', '']);
  /* 30.10 (макет 9): «Эфиры» — всем (ученикам: список и комната; команде: ещё и пульт эфиров внутри страницы) */
  IT.push(['efir', 'Эфиры', '']);
  function sync() {
    var body = document.querySelector('.main-menu .main-menu__body'); if (!body) return;
    var tpl = body.querySelector('a.main-menu-item:not(.eco-mi):not(.eco-mn)'); if (!tpl) return;
    var base = tpl.className.replace(/\s*\b(eco-mi|eco-mn|active|selected)\b/g, '');
    var have = body.querySelectorAll('.eco-mi');
    /* 27.10: меню GetCourse — приложение Vue. Свои пункты добавляем только недостающие и не пересоздаём (раньше при каждом изменении меню удаляли и вставляли заново) */
    if (have.length !== IT.length) {
      var all = [].slice.call(body.children).filter(function (x) { return !x.classList.contains('eco-mi') }), anchor = all.filter(function (x) { return /Обучение/.test(x.textContent) })[0] || all.filter(function (x) { return /Мои покупки|Покупки/.test(x.textContent) })[0] || null;
      var after = anchor ? anchor.nextSibling : null; while (after && after.classList && after.classList.contains('eco-mi')) after = after.nextSibling;
      IT.forEach(function (it) { if (body.querySelector('.eco-mi[data-eco="' + it[0] + '"]')) return; var a = tpl.cloneNode(true); a.classList.add('eco-mi'); var tgm = /[?&]tg=1\b/.test(location.search); try { tgm = tgm || sessionStorage.getItem('ecoTg') === '1' } catch (e) {} a.href = '/teach/control/stream?fs=' + it[0]; a.setAttribute('data-eco', it[0]);
        var ic = a.querySelector('.main-menu-item__icon'); if (ic) ic.innerHTML = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">' + it[2] + '</svg>';
        var tx = a.querySelector('.main-menu-item__text'); if (tx) tx.textContent = it[1];
        /* 28.10: шаблон взят из свёрнутого меню — подписи для раскрытого меню нет, добавляем свою (видна только в раскрытом) */
        else { var hd = a.querySelector('.main-menu-item__header'); if (hd) { var hb = document.createElement('div'); hb.className = 'main-menu-item__header-body'; hb.innerHTML = '<span class="text-body main-menu-item__text"></span>'; hb.firstChild.textContent = it[1]; hd.appendChild(hb) } }
        var tt = a.querySelector('.tooltip__dropdown'); if (tt) tt.textContent = it[1];
        /* подсказку у пунктов GetCourse показывает Vue; у наших копий — сами */
        a.addEventListener('mouseenter', function () { var t = a.querySelector('.tooltip__dropdown'); if (t && !document.querySelector('.main-menu--is-expanded')) t.style.display = 'flex' });
        a.addEventListener('mouseleave', function () { var t = a.querySelector('.tooltip__dropdown'); if (t) t.style.display = 'none' });
        a.querySelectorAll('.menu-badge,.main-menu-item__badge').forEach(function (b) { b.remove() });
        body.insertBefore(a, after) })
      have = body.querySelectorAll('.eco-mi') }
    have.forEach(function (a) { var on = cur === a.getAttribute('data-eco'), want = base + ' eco-mi' + (on ? ' active' : ''); if (a.className !== want) a.className = want; a.setAttribute('data-active', on ? 'true' : 'false') });
  }
  var t = 0; function later() { if (t) return; t = setTimeout(function () { t = 0; try { sync() } catch (e) {} }, 120) }
  /* админские кнопки GetCourse («Настроить вид», «Карточка пользователя»): на телефоне — строкой под шапкой, а не поверх неё */
  function gcCtl() { var g = document.querySelector('body > .global-controls'), mc = document.querySelector('.gc-main-content'); if (document.querySelector('.eco-chip')) R.classList.add('eco-has-fab');
    if (!g || !mc || innerWidth > 767 || g.classList.contains('eco-gc')) return; g.classList.add('eco-gc'); mc.insertBefore(g, mc.firstChild) }
  setInterval(gcCtl, 700);
  function start() { setTimeout(function () { try { sync() } catch (e) {} new MutationObserver(later).observe(document.body, { childList: true, subtree: true }) }, 600) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* Банк ученика в его профиле (/pl/<id>) — только для команды; доступ всё равно проверяет сервер (админ — все, куратор — свои) */
(function () {
  if (window.top !== window || window.__ecoPB) return; window.__ecoPB = 1;
  var STAFF = { 504950432: 1, 510261529: 1, 499631257: 1 }, U = +window.accountUserId || 0, m = location.pathname.match(/^\/pl\/(\d+)\/?$/);
  if (!m || !STAFF[U] || +m[1] === U) return; var id = +m[1];
  function put() { var mc = document.querySelector('.gc-main-content'); if (!mc) return false; if (document.querySelector('.eco-pb')) return true;
    var a = document.createElement('a'); a.className = 'eco-bk eco-pb'; a.href = '/teach/control/stream?fs=bank&u=' + id; a.style.margin = '16px auto';
    a.style.maxWidth = '1240px'; a.innerHTML = '<span class="ic">₽</span><span style="flex:1;min-width:0"><b>Банк ученика</b><span>Доход, оплаты и&nbsp;заказы ученика&nbsp;— только просмотр</span></span><i>Открыть →</i>';
    var v = document.createElement('a'); v.className = 'eco-bk eco-pb2'; v.href = 'https://t.me/oduvanov_school_bot?startapp=va_' + id; v.style.margin = '0 auto 16px'; v.style.maxWidth = '1240px';
    v.innerHTML = '<span class="ic">👁</span><span style="flex:1;min-width:0"><b>Открыть как ученик в&nbsp;приложении</b><span>Все вкладки мини-приложения глазами ученика&nbsp;— только просмотр</span></span><i>Открыть →</i>';
    setTimeout(function () { if (a.parentNode && !document.querySelector('.eco-pb2')) a.parentNode.insertBefore(v, a.nextSibling) }, 0);
    if (!document.getElementById('ecoBkCss')) { var c = document.createElement('style'); c.id = 'ecoBkCss'; c.textContent = '.eco-bk{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:24px;background:linear-gradient(160deg,rgba(103,36,173,.55),rgba(22,22,22,.9) 70%);border:1px solid rgba(195,139,255,.3);text-decoration:none!important;font-family:"Inter Tight",Inter,sans-serif}.eco-bk .ic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;font-size:24px;font-weight:600;flex:none}.eco-bk b{display:block;font-size:17px;font-weight:500;color:#fff}.eco-bk span span{color:rgba(255,255,255,.6);font-size:14px}.eco-bk i{font-style:normal;color:#d77fff;font-weight:500;font-size:14px;white-space:nowrap}@media (max-width:760px){.eco-pb{margin:12px 16px!important}.eco-bk i{display:none}}'; document.head.appendChild(c) }
    mc.insertBefore(a, mc.firstChild); return true }
  var n = 0, iv = setInterval(function () { if (put() || ++n > 40) clearInterval(iv) }, 200);
})();

/* Режим мини-приложения Telegram (страницы кабинета открыты из gc/app.html с ?tg=1):
   нижняя панель приложения на каждой странице, системная «Назад» Telegram + свои «←» и «Домой» в шапке, полоса загрузки при переходах;
   ссылки «в новом окне» открываются здесь же (иначе iPhone открывает их в отдельном браузере без входа — «случайный выход из аккаунта»);
   /user/my/profile не использует наш шаблон (там нет наших скриптов) — ссылки на него ведём в наш профиль /pl/<id>;
   если кабинет вдруг показал вход — пишем случай на сервер (/ma/diag) и предлагаем вернуться: в основном окне вход сохранён. */
(function () {
  if (window.top !== window || window.__ecoTg) return; window.__ecoTg = 1;
  var on = /[?&]tg=1\b/.test(location.search) || /[#&]tgWebAppVersion=/.test(location.hash) || /tg%3D1/.test(location.search); try { if (on) sessionStorage.setItem('ecoTg', '1'); else on = sessionStorage.getItem('ecoTg') === '1' } catch (e) {}
  if (!on) return;
  var R = document.documentElement, U = +window.accountUserId || 0, APP = 'https://romanoduvanov.github.io/otzyvy/gc/app.html', API = 'https://oduvanov-api.romanoduvanov52.workers.dev', HOST = location.host;
  R.classList.add('eco-tg');
  /* этап 2: кожа приложения (appskin.js) — только телефон / окно Telegram ≤767; сайт на компьютере не трогаем */
  var T0 = Date.now(), ASK = typeof APPSKIN === 'string' && /^[0-9a-f]{6,40}$/.test(APPSKIN) && innerWidth <= 767;
  if (ASK && !document.getElementById('ecoAppskin')) { var ask = document.createElement('script'); ask.id = 'ecoAppskin'; ask.src = 'https://romanoduvanov.github.io/otzyvy/gc/appskin-' + APPSKIN + '.js'; ask.async = true; ask.onerror = function () { ASK = false }; (document.head || R).appendChild(ask) }
  /* 28.10 (4в): кожа оплаты (payskin.js) — те же условия + только страницы продления/повышения, заказа и оплаты; один раз */
  if (typeof PAYSKIN === 'string' && /^[0-9a-f]{6,40}$/.test(PAYSKIN) && innerWidth <= 767 && /^\/(prodlenie-|povyshenie-premium-amazon)|\/sales\/shop\/|\/pl\/sales\/|dealpay|\/payment|\/cms\/system\/order/i.test(location.pathname) && !document.getElementById('ecoPayskin')) {
    var psk = document.createElement('script'); psk.id = 'ecoPayskin'; psk.src = 'https://romanoduvanov.github.io/otzyvy/gc/payskin-' + PAYSKIN + '.js'; psk.async = true; (document.head || R).appendChild(psk) }
  function back() { if (history.length > 1) history.back(); else location.href = APP }
  /* в приложение — через Telegram (startapp), а не переходом на другой домен: иначе iPhone спрашивает «Открыть ссылку?» и уводит в Safari */
  /* 27.10: в приложение — этим же окном, как делает layout.js (один переход, без «Открыть ссылку?»).
     telegram-web-app.js, системную «Назад» и цвета шапки ведёт layout.js — здесь второй раз не подключаем (раньше «Назад» срабатывала дважды) */
  function go(h) { load(); location.href = APP + '#' + h }
  /* 28.10: полноэкранный режим Telegram на iPhone — страницы сайта не получают отступ под вырез/часы (переменные Telegram пустые), шапка уезжала под статус-бар.
     Приложение передаёт отступ сверху в адресе (tgsa=<px>); держим его на всю вкладку и берём больший из двух */
  var SA = (location.search.match(/[?&]tgsa=(\d+)/) || [])[1]; try { if (SA != null) sessionStorage.setItem('ecoSA', SA); else SA = sessionStorage.getItem('ecoSA') } catch (e) {} if (SA != null) R.style.setProperty('--eco-sat', Math.min(+SA || 0, 160) + 'px');
  var EU = +((location.search.match(/[?&]eu=(\d+)/) || [])[1] || 0); try { if (EU) sessionStorage.setItem('ecoEU', String(EU)); else EU = +(sessionStorage.getItem('ecoEU') || 0) } catch (e) {}
  var IC = { b: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>', h: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" stroke="#c38bff"/></svg>' };
  var TB = [['learn', 'Учёба', '<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M7 9.5V15c0 1.5 2.5 3 5 3s5-1.5 5-3V9.5"/>'], ['rate', 'Рейтинг', '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'], ['ai', 'Нейро', ''], ['bank', 'Банк', '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 15h2"/>'], ['more', 'Ещё', '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>']];
  var css = document.createElement('style');
  /* 28.10 (слияние): нижняя панель — как в приложении (app.html --tb): max(84px, 50px + полоса «домой»). Раньше было 84px + полоса — на iPhone с вырезом панель и всё над ней
     стояли на 34px выше, чем в приложении и в макете. Без выреза (iPhone SE, Android) полоса 0 — те же 84px. --eco-tb берут и кожи (appskin.js, payskin.js) */
  css.textContent = 'html.eco-tg{--tg-top:max(calc(var(--tg-safe-area-inset-top,0px) + var(--tg-content-safe-area-inset-top,0px)), var(--eco-sat,0px));--eco-sb:max(env(safe-area-inset-bottom), calc(var(--tg-safe-area-inset-bottom,0px) + var(--tg-content-safe-area-inset-bottom,0px)));--eco-tb:max(84px, calc(50px + var(--eco-sb)))}'
    + '@media(max-width:767px){html.eco-tg body .top-menu{padding-top:var(--tg-top)!important;height:calc(60px + var(--tg-top))!important;box-sizing:border-box!important}html.eco-tg body .gc-main-content{padding-top:calc(60px + var(--tg-top))!important}html.eco-tg #ecoLd{top:var(--tg-top)}}'
    + '.top-menu .eco-tgw{display:flex;gap:8px;align-items:center;margin-left:8px;flex:none}.top-menu .top-menu__logo{min-width:0;flex:0 1 auto!important;overflow:hidden}.top-menu .top-menu__logo img{max-width:100%;height:auto;object-fit:contain}'
    + '@media(max-width:360px){.top-menu .eco-tgw .eco-home{display:none}}'
    /* на компьютере (≥768) слева есть меню GetCourse — свои «←/⌂» и нижняя панель приложения не нужны */
    + '@media(min-width:768px){html.eco-tg .eco-tgw,html.eco-tg .eco-tgf,html.eco-tg #ecoTabs{display:none!important}}'
    /* 27.10 QA: панель урока «Предыдущий / Сдать работу» (.fl-bar из layout.js) уходила под нашу нижнюю панель — поднимаем над ней; 28.10: выше круглой кнопки «Нейро» (она выступает на 22px над панелью) */
    + '@media(max-width:767px){html.eco-tg body .fl-bar{bottom:calc(var(--eco-tb) + 32px)!important}html.eco-tg body:has(.fl-bar){padding-bottom:calc(var(--eco-tb) + 122px)!important}}'
    /* 28.10: раскрытое меню (бургер) в полноэкранном режиме — логотип уезжал под часы, нижние пункты под нашу панель */
    + '@media(max-width:767px){html.eco-tg body .main-menu .main-menu__inner{padding-top:var(--tg-top)!important;padding-bottom:calc(var(--eco-tb) + 12px)!important;box-sizing:border-box!important}}'
    + '@media(max-width:767px){html.eco-tg body iframe.fs-full,html.eco-tg body iframe[src*="/gc/pult"]{top:calc(60px + var(--tg-top))!important;height:calc(100vh - 60px - var(--tg-top) - var(--eco-tb))!important}}'
    + '#ecoAcc{position:fixed;inset:0;z-index:99996;background:#000106;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;color:#fff;font-family:"Inter Tight",Inter,sans-serif}#ecoAcc b{font-size:22px;font-weight:500;line-height:1.2}#ecoAcc p{margin:0;color:rgba(255,255,255,.62);max-width:330px;line-height:1.45}#ecoAcc button{height:50px;width:min(330px,100%);border-radius:15px;border:0;font:600 15px "Inter Tight",sans-serif;cursor:pointer}#ecoAcc .p{background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364}#ecoAcc .s{background:#1f1f1f;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}#ecoAcc .spn{width:26px;height:26px;border-radius:99px;border:3px solid rgba(195,139,255,.25);border-top-color:#c38bff;animation:ecoSp .8s linear infinite;box-sizing:border-box}'
    + '.eco-tgb{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:14px;background:#161616;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);border:0;cursor:pointer;flex:none;padding:0}'
    + '.eco-tgf{position:fixed;left:16px;top:calc(12px + max(env(safe-area-inset-top), calc(var(--tg-safe-area-inset-top,0px) + var(--tg-content-safe-area-inset-top,0px)), var(--eco-sat,0px)));z-index:99990;display:flex;gap:8px}.eco-tgf .eco-tgb{box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 10px 30px rgba(0,0,0,.5)}'
    + '@media(max-width:767px){html.eco-tg body{padding-bottom:calc(var(--eco-tb) + 16px)!important}}'
    + '#ecoTabs{--sb:var(--eco-sb);position:fixed;left:0;right:0;bottom:0;height:var(--eco-tb);padding:8px 6px var(--sb);display:flex;justify-content:space-around;align-items:flex-start;background:rgba(12,12,14,.96);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.07);z-index:99980;font-family:"Inter Tight",Inter,system-ui,sans-serif;box-sizing:border-box}'
    + '#ecoTabs a{width:64px;min-height:44px;margin-top:-4px;padding-top:4px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:3px;color:rgba(255,255,255,.5)!important;text-decoration:none!important;font-size:10.5px;font-weight:500}#ecoTabs svg{width:24px;height:24px}'
    + '#ecoTabs .tn{margin-top:-4px}#ecoTabs .tnf{margin-top:-35px;margin-bottom:5px}#ecoTabs .tnf{width:54px;height:54px;border-radius:99px;display:grid;place-items:center;background:#000106;box-shadow:0 0 0 2px rgba(195,139,255,.5),0 10px 26px -6px rgba(96,0,255,.8)}#ecoTabs .tnf img{width:46px;height:46px;border-radius:99px;object-fit:cover;object-position:50% 40%}'
    + '#ecoLd{position:fixed;left:0;right:0;top:0;height:3px;z-index:99999;overflow:hidden;pointer-events:none;display:none}#ecoLd.on{display:block}#ecoLd i{position:absolute;top:0;bottom:0;left:-45%;width:45%;border-radius:3px;background:linear-gradient(90deg,#c38bff,#fccbff);box-shadow:0 0 14px 3px rgba(215,127,255,.75);animation:ecoLd 1.1s ease-in-out infinite}@keyframes ecoLd{to{left:100%}}'
    + '#ecoLc{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;display:none;align-items:center;gap:12px;padding:14px 20px;border-radius:18px;background:rgba(22,22,22,.97);box-shadow:inset 0 0 0 1px rgba(195,139,255,.3),0 20px 60px rgba(0,0,0,.6);color:#fff;font:500 15px "Inter Tight",Inter,sans-serif}#ecoLc.on{display:flex}#ecoLc span{width:20px;height:20px;border-radius:99px;border:2.5px solid rgba(195,139,255,.25);border-top-color:#c38bff;animation:ecoSp .8s linear infinite;box-sizing:border-box}@keyframes ecoSp{to{transform:rotate(360deg)}}'
    + '#ecoRe{position:fixed;inset:0;z-index:99995;background:#000106;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center;color:#fff;font-family:"Inter Tight",Inter,sans-serif}#ecoRe b{font-size:22px;font-weight:500}#ecoRe p{margin:0;color:rgba(255,255,255,.6);max-width:320px;line-height:1.45}#ecoRe button{height:50px;width:min(320px,100%);border-radius:15px;border:0;font:600 15px "Inter Tight",sans-serif;cursor:pointer}#ecoRe .p{background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364}#ecoRe .s{background:#1f1f1f;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}';
  (document.head || R).appendChild(css);
  var T1 = 0; function load() { var l = document.getElementById('ecoLd'), c = document.getElementById('ecoLc'); if (l) l.classList.add('on'); clearTimeout(T1); T1 = setTimeout(function () { if (c) c.classList.add('on'); T1 = setTimeout(unload, 15000) }, 1500) }
  function unload() { var l = document.getElementById('ecoLd'), c = document.getElementById('ecoLc'); if (l) l.classList.remove('on'); if (c) c.classList.remove('on'); clearTimeout(T1) }
  window.addEventListener('pageshow', function (e) { if (e.persisted) unload() });
  window.addEventListener('beforeunload', load);
  function btns(cls) { var w = document.createElement('div'); w.className = cls; w.innerHTML = '<button type="button" class="eco-tgb" aria-label="Назад">' + IC.b + '</button><button type="button" class="eco-tgb eco-home" aria-label="На главную">' + IC.h + '</button>';
    w.children[0].onclick = back; w.children[1].onclick = function () { go('learn') }; return w }
  function tabs() { if (document.getElementById('ecoTabs') || !document.body) return; var n = document.createElement('nav'); n.id = 'ecoTabs';
    n.innerHTML = TB.map(function (t) { return t[0] === 'ai' ? '<a href="' + APP + '#ai" class="tn" data-t="ai"><span class="tnf"><img src="https://romanoduvanov.github.io/otzyvy/gc/ma/neuro.jpg" alt=""></span>Нейро</a>' : '<a href="' + APP + '#' + t[0] + '" data-t="' + t[0] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + t[2] + '</svg>' + t[1] + '</a>' }).join('');
    n.addEventListener('click', function (e) { var a = e.target.closest('a[data-t]'); if (a && !e.defaultPrevented) { e.preventDefault(); go(a.getAttribute('data-t')) } }); /* запасной путь, если layout.js не перехватил */
    document.body.appendChild(n); var ld = document.createElement('div'); ld.id = 'ecoLd'; ld.innerHTML = '<i></i>'; document.body.appendChild(ld); var lc = document.createElement('div'); lc.id = 'ecoLc'; lc.innerHTML = '<span></span>Загружаем…'; document.body.appendChild(lc) }
  function isLogin() { return /^\/(pl\/)?cms\/system\/login/.test(location.pathname) || (!U && !!document.querySelector('.xdget-loginUserForm, form[action*="login"] input[type=password], #loginform')) }
  function diag(kind) { try { navigator.sendBeacon(API + '/ma/diag', JSON.stringify({ kind: kind, eu: EU || undefined, sub: window.isSublogined ? 1 : undefined, page: location.pathname + location.search.replace(/([?&](key|hash|token|t)=)[^&]*/g, '$1…'), ref: (document.referrer || '').slice(0, 200), u: U, hl: history.length, ua: navigator.userAgent.slice(0, 160), at: new Date().toISOString() })) } catch (e) {} }
  function relog() { if (document.getElementById('ecoRe')) return;
    var toL = /[?&]returnUrl=%2F/i.test(location.search);
    /* этап 2: вход «один раз» рисует appskin.js (карточка в стиле приложения вокруг формы GetCourse); если он не загрузился за 4 с — прежний экран */
    if (toL && (window.__appskin || (ASK && Date.now() - T0 < 4000))) { if (!relog.d) { relog.d = 1; diag('gc-login') } return }
    if (!relog.d) diag('gc-login'); relog.d = 1; var d = document.createElement('div'); d.id = 'ecoRe';
    d.innerHTML = toL ? '<b>Войди в&nbsp;кабинет один раз</b><p>Это окно Telegram ещё не&nbsp;знает твой вход на&nbsp;сайте. Войди той же почтой, что и&nbsp;при покупке курса,&nbsp;— и&nbsp;сразу откроется урок. Дальше Telegram запомнит вход.</p><button class="p" id="ecoReL">Войти</button><button class="s" id="ecoReH">Вернуться в&nbsp;приложение</button>'
      : '<b>Кабинет попросил войти</b><p>Обычно это сбой перехода, вход у&nbsp;тебя сохранён. Вернись назад или&nbsp;открой приложение заново.</p><button class="p" id="ecoReB">Вернуться назад</button><button class="s" id="ecoReH">На главную приложения</button><button class="s" id="ecoReL">Всё-таки войти</button>';
    document.body.appendChild(d); var rb = document.getElementById('ecoReB'); if (rb) rb.onclick = back; document.getElementById('ecoReH').onclick = function () { go('learn') }; document.getElementById('ecoReL').onclick = function () { d.remove() } }
  /* ссылки на этот же кабинет — в этом же окне; профиль GetCourse без нашего шаблона — на наш профиль */
  function fixLinks() { document.querySelectorAll('a[href]').forEach(function (a) { var h = a.getAttribute('href') || '';
    if (/\/user\/my\/profile/.test(h) && U) a.setAttribute('href', '/pl/' + U);
    if (a.target && a.target !== '_self' && (h.charAt(0) === '/' || h.indexOf(location.origin) === 0)) a.removeAttribute('target') }) }
  var wo = window.open; window.open = function (u, t, f) { try { var x = new URL(u, location.href); if (x.host === HOST) { load(); location.href = x.href; return window } } catch (e) {} return wo.apply(window, arguments) };
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href]'); if (!a) return; var h = a.getAttribute('href') || '';
    if (/\/user\/my\/profile/.test(h) && U) { e.preventDefault(); load(); location.href = '/pl/' + U; return }
    var am = h.match(/romanoduvanov\.github\.io\/otzyvy\/gc\/app\.html(?:#([a-z]+))?/) || h.match(/t\.me\/oduvanov_school_bot(?:\/app)?\?startapp=?([a-z0-9_]*)/i); if (am) { e.preventDefault(); go(am[1] || 'learn'); return }
    var bm = h.match(/romanoduvanov\.github\.io\/otzyvy\/gc\/bank\.html/); if (bm) { e.preventDefault(); load(); location.href = '/teach/control/stream?fs=' + (/view=orders/.test(h) ? 'orders' : 'bank'); return }
    if (a.target && a.target !== '_self') { try { var x = new URL(h, location.href); if (x.host === HOST) { e.preventDefault(); load(); location.href = x.href; return } } catch (er) {} }
    /* 29.10: внешние ссылки (Яндекс Диск, Pinterest, Behance, оплата) layout.js открывает через Telegram, страница не уходит — «Загружаем…» не показываем (раньше висело бесконечно) */
    var ext = false; try { var xu = new URL(h, location.href); ext = xu.host !== HOST || /^(mailto|tel):/i.test(xu.protocol) || /\/(pl\/)?sales\/(shop|order|pay)|\/payment/i.test(xu.pathname) } catch (er) {}
    if (h && !ext && h.charAt(0) !== '#' && !/^javascript:/i.test(h) && !a.hasAttribute('download') && !e.defaultPrevented) load() }, true);
  /* страховка: вернулись в окно, а страница так и не ушла — убираем «Загружаем…» */
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') setTimeout(unload, 600) });
  function fix() {
    var tm = document.querySelector('.top-menu'), tmOn = tm && tm.getBoundingClientRect().height > 0, f0 = document.querySelector('.eco-tgf');
    if (tmOn && !tm.querySelector('.eco-tgw')) { if (f0) f0.remove(); var bw = tm.querySelector('.burger-icon-wrapper'); /* порядок: ☰ · ← · ⌂ · логотип */ tm.insertBefore(btns('eco-tgw'), bw && bw.parentNode === tm ? bw.nextSibling : tm.firstChild) }
    else if (!tmOn && !f0 && !document.querySelector('.eco-tgw') && document.body && fix.n > 8) document.body.appendChild(btns('eco-tgf'))
    /* 28.10: бургер GetCourse часто появляется позже наших кнопок — тогда переставляем свои кнопки за него (☰ · ← · ⌂) */
    if (tmOn) { var tw = tm.querySelector(':scope>.eco-tgw'), bb = tm.querySelector(':scope>.burger-icon-wrapper'); if (tw && bb && tw.previousElementSibling !== bb) tm.insertBefore(tw, bb.nextSibling) }
    tabs(); fixLinks();
    var out = ''; try { out = sessionStorage.getItem('ecoOut') || ''; if (out && U) sessionStorage.removeItem('ecoOut') } catch (e) {}
    if (isLogin() && !out) relog() }
  /* 27.10: сайт в окне Telegram должен быть под тем же человеком, что и приложение (eu=<uid> из app.html).
     Если GetCourse остался «под учеником» (Войти под пользователем) — возвращаем свой вход и идём на нужную страницу; иначе — понятный экран, а не чужой кабинет. */
  /* этап 2 (L7b): «уроки под учеником» — админ сам вошёл под учеником из приложения (&sub=1): не возвращаем свой вход, appskin.js рисует рамку, плашку и «Выйти».
     Метка живёт до закрытия окна (sessionStorage): закрыл приложение — при следующем открытии accCheck вернёт свой вход как раньше. */
  var SUBOK = /[?&]sub=1\b/.test(location.search); try { if (SUBOK) sessionStorage.setItem('ecoSub', '1'); else SUBOK = sessionStorage.getItem('ecoSub') === '1' } catch (e) {}
  /* 28.10 (L7a): вход «под учеником» из приложения. Приложение открывает /teach/control/stream?ecoSub=<uid> (страница с нашим шаблоном; карточка пользователя
     в админке шаблон не грузит). Берём форму карточки /user/control/user/update/id/<uid> и отправляем её с action=sublogin — ровно то, что делает кнопка
     GetCourse «Войти под этим пользователем»; затем открываем тренинги ученика с &sub=1 (кожа приложения, отправка выключена). */
  (function () { try { var q = new URLSearchParams(location.search), su = q.get('ecoSub') || '';
    if (!/^\d{3,12}$/.test(su) || window.isSublogined) return;
    var st = document.createElement('style'); st.textContent = 'html.eco-subgo body>*{visibility:hidden}html.eco-subgo body:after{content:"Входим под учеником…";position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;background:#05050a;font:500 16px/1.4 Inter,system-ui,sans-serif;visibility:visible;white-space:pre-line;text-align:center;padding:24px}html.eco-subgo.eco-subno body:after{content:"Не получилось войти под учеником.\AОткрой карточку ученика в GetCourse."}'; (document.head || R).appendChild(st);
    R.classList.add('eco-subgo'); diag('sub-go');
    var fail = function () { R.classList.add('eco-subno'); diag('sub-fail'); setTimeout(function () { R.classList.remove('eco-subgo', 'eco-subno'); history.replaceState(null, '', location.pathname) }, 3500) };
    var url = '/user/control/user/update/id/' + su;
    fetch(url, { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (h) {
      var d = new DOMParser().parseFromString(h, 'text/html'), f = d.querySelector('form.page-main-form'), a = f && f.querySelector('input[name=action]');
      if (!f || !a || !d.querySelector('[data-action=sublogin]')) throw 0;
      a.value = 'sublogin'; var fd = new FormData(f);
      return fetch(f.getAttribute('action') || url, { method: 'POST', body: fd, credentials: 'same-origin' }) }).then(function (r) { if (!r.ok) throw 0;
      location.replace('/teach/control/stream?sub=1') }).catch(fail)
  } catch (e) {} })();
  function accCheck() { if (!EU || !U || document.getElementById('ecoAcc')) return; var sub = !!window.isSublogined, ret = '', n = 0; if (sub && SUBOK) return;
    try { ret = sessionStorage.getItem('ecoRet') || ''; n = +(sessionStorage.getItem('ecoRetN') || 0) } catch (e) {}
    if (U === EU && !sub) { try { sessionStorage.removeItem('ecoRetN'); if (ret) { sessionStorage.removeItem('ecoRet'); if (ret !== location.href) { load(); location.replace(ret) } } } catch (e) {} return }
    diag(sub ? 'acc-sub' : 'acc-other');
    var d = document.createElement('div'); d.id = 'ecoAcc'; d.innerHTML = '<span class="spn"></span><b>Возвращаем твой вход на&nbsp;сайте…</b>'; (document.body || R).appendChild(d);
    var fail = function () { d.innerHTML = '<b>Сайт открыт под&nbsp;другим аккаунтом</b><p>' + (sub ? 'В&nbsp;этом окне включён вход «под учеником». Нажми на&nbsp;фото профиля вверху → «Вернуться в&nbsp;свой аккаунт» или выйди и&nbsp;войди заново.' : 'В&nbsp;окне Telegram сайт помнит другой вход. Выйди и&nbsp;войди своим аккаунтом&nbsp;— приложение и&nbsp;сайт снова совпадут.') + '</p><button class="p" id="ecoAccL">Выйти и&nbsp;войти заново</button><button class="s" id="ecoAccH">Вернуться в&nbsp;приложение</button>' + (sub ? '<button class="s" id="ecoAccX">Остаться на&nbsp;странице</button>' : '');
      document.getElementById('ecoAccL').onclick = function () { try { sessionStorage.setItem('ecoRet', location.href) } catch (e) {} load(); sessionStorage.setItem('ecoOut', '1'); location.href = '/user/my/logout' }; document.getElementById('ecoAccH').onclick = function () { go('learn') }; var x = document.getElementById('ecoAccX'); if (x) x.onclick = function () { d.remove() } };
    if (!sub || n >= 2) return fail();
    fetch('/pl/user/profile/menu', { credentials: 'same-origin' }).then(function (r) { return r.json() }).then(function (j) { var L = [], walk = function (a) { (a || []).forEach(function (x) { L.push(x); walk(x.subitems) }) }; walk(j && j.data && j.data.menu && j.data.menu.items);
      /* 28.10 (этап 2): раньше под фильтр попадал пункт «Оцените удобство интерфейса» (gus-*: в адресе есть returnUrl) — смотрим id и путь без параметров */
      var it = L.filter(function (x) { if (!x.url || x.id === 'logout' || /^gus-/.test(String(x.id))) return false; return /sub|return|back|parent/i.test(String(x.id) + ' ' + String(x.url).split('?')[0]) || /вернуть|свой (аккаунт|профиль)|выйти из режима/i.test(String(x.label)) })[0];
      if (!it) return fail(); try { sessionStorage.setItem('ecoRetN', String(n + 1)); if (!ret) sessionStorage.setItem('ecoRet', location.href) } catch (e) {} location.href = it.url }).catch(fail) }
  fix.n = 0; setTimeout(accCheck, 0); var iv = setInterval(function () { fix.n++; fix(); if (fix.n > 80) clearInterval(iv) }, 250);
  new MutationObserver(function () { if (fix.t) return; fix.t = setTimeout(function () { fix.t = 0; fixLinks() }, 300) }).observe(R, { childList: true, subtree: true });
})();

/* 30.10 (после QA №20): рейтинг потока во встройке (iframe.fs-rating на странице тренинга) 5–10 с показывал пустой чёрный экран —
   страница рейтинга ждёт вход кабинета и данные /rating и ничего не рисует. Поверх рамки — заставка со скелетом, пока кабинет не получил те же данные
   (FS_RATING из layout.js, общий кэш) и ещё 0,9 с на отрисовку; не дольше 12 с. Клики проходят сквозь заставку. */
(function () {
  if (window.top !== window || window.__ecoRtLd) return; window.__ecoRtLd = 1;
  function go() { var f = document.querySelector('iframe.fs-rating'); if (!f || document.querySelector('.eco-rtl')) return !!f;
    var css = document.createElement('style');
    css.textContent = '@keyframes ecoRtl{0%{background-position:100% 0}100%{background-position:-100% 0}}.eco-rtl{position:fixed;z-index:52;background:#000106;pointer-events:none;padding:48px max(24px,calc((100% - 1100px)/2));box-sizing:border-box;display:flex;flex-direction:column;gap:14px;transition:opacity .35s;font-family:"Inter Tight",Inter,sans-serif;overflow:hidden}'
      + '.eco-rtl b{font:500 15px "Inter Tight",sans-serif;color:rgba(255,255,255,.55);margin-bottom:10px}.eco-rtl i{display:block;border-radius:20px;background:linear-gradient(90deg,#101014 0%,#1b1b22 50%,#101014 100%);background-size:200% 100%;animation:ecoRtl 1.4s linear infinite}'
      + '.eco-rtl i.h{height:56px;width:min(420px,70%);border-radius:14px}.eco-rtl i.c{height:150px}.eco-rtl i.r{height:64px;border-radius:16px}.eco-rtl.off{opacity:0}';
    (document.head || document.documentElement).appendChild(css);
    var o = document.createElement('div'); o.className = 'eco-rtl'; o.setAttribute('aria-hidden', 'true');
    o.innerHTML = '<b>Загружаем рейтинг потока…</b><i class="h"></i><i class="c"></i><i class="r"></i><i class="r"></i><i class="r"></i><i class="r"></i>';
    document.body.appendChild(o);
    var fit = function () { var r = f.getBoundingClientRect(); o.style.left = r.left + 'px'; o.style.top = r.top + 'px'; o.style.width = r.width + 'px'; o.style.height = r.height + 'px' };
    fit(); addEventListener('resize', fit); var iv = setInterval(fit, 500), done = false;
    var off = function (ms) { if (done) return; done = true; setTimeout(function () { o.classList.add('off'); setTimeout(function () { o.remove(); clearInterval(iv); removeEventListener('resize', fit) }, 400) }, ms) };
    setTimeout(function () { off(0) }, 12000);
    if (window.FS_RATING) window.FS_RATING().then(function (D) { off(D ? 900 : 0) }, function () { off(0) }); else off(2500);
    return true }
  function start() { var n = 0, t = setInterval(function () { if (go() || ++n > 20) clearInterval(t) }, 150) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* Вход в наши встроенные страницы (пульт, банк) без Telegram: кабинет уже знает пользователя (FS_AUTH → токен сервера t).
   Страница во фрейме (github.io) просит {ecoNeedAuth:1} → получает {ecoAuth:{u,t}} — только свой фрейм на этой странице. Сервер сам проверяет токен и роль. */
(function () {
  if (window.top !== window || window.__ecoAuthBr) return; window.__ecoAuthBr = 1;
  addEventListener('message', function (e) { if (e.origin !== 'https://romanoduvanov.github.io' || !e.data || !e.data.ecoNeedAuth || !e.source) return;
    if (![].some.call(document.querySelectorAll('iframe'), function (f) { return f.contentWindow === e.source })) return;
    var send = function (a) { try { e.source.postMessage({ ecoAuth: a && a.t ? { u: a.u, t: a.t } : null }, 'https://romanoduvanov.github.io') } catch (x) {} };
    if (window.FS_AUTH) window.FS_AUTH(!!e.data.force).then(send, function () { send(null) }); else send(null) });
})();

/* 27.10: «Поиск» из меню вёл на белую страницу GetCourse без нашего шаблона (на телефоне — горизонтальная прокрутка и обрезанная «Найти»).
   Теперь — своя страница /teach/control/stream?fs=search: поиск по урокам курса (названия из расписания сервера /sched), результат открывает урок. */
(function () {
  if (window.top !== window || window.__ecoSr) return; window.__ecoSr = 1;
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href*="/pl/search/search-lesson"]'); if (!a || e.ctrlKey || e.metaKey) return; e.preventDefault(); e.stopPropagation(); location.href = '/teach/control/stream?fs=search' }, true);
  var path = location.pathname.replace(/\/+$/, ''); if (path !== '/teach/control/stream' || !/[?&]fs=search\b/.test(location.search)) return;
  var API = 'https://oduvanov-api.romanoduvanov52.workers.dev', R = document.documentElement;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  var css = document.createElement('style');
  css.textContent = 'html.eco-sr .gc-main-content>*:not(#ecoSr):not(.fs-foot){display:none!important}'
    + '#ecoSr{max-width:860px;margin:0 auto;padding:32px 24px 60px;font-family:"Inter Tight",Inter,sans-serif;color:#fff;box-sizing:border-box;display:flex;flex-direction:column;gap:16px}#ecoSr *{box-sizing:border-box}'
    + '#ecoSr h1{margin:0;font-size:48px;font-weight:500;letter-spacing:-.03em;line-height:1.05}#ecoSr input{width:100%;height:52px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:#0c0c0c;color:#fff;font:400 17px "Inter Tight",sans-serif;padding:0 18px;outline:none}#ecoSr input:focus{border-color:rgba(195,139,255,.6)}'
    + '#ecoSr .r{display:flex;flex-direction:column;border-radius:22px;background:#161616;border:1px solid rgba(255,255,255,.07);overflow:hidden}#ecoSr .r a{display:flex;flex-direction:column;gap:3px;padding:14px 18px;border-top:1px solid rgba(255,255,255,.06);color:#fff!important;text-decoration:none!important}#ecoSr .r a:first-child{border-top:0}#ecoSr .r b{font-weight:500;font-size:16px}#ecoSr .r span{font-size:13px;color:rgba(255,255,255,.5)}#ecoSr mark{background:rgba(195,139,255,.3);color:#fff;border-radius:4px;padding:0 2px}#ecoSr .m{color:rgba(255,255,255,.55);font-size:14px;padding:6px 2px}'
    + '@media(max-width:760px){#ecoSr{padding:16px 16px 40px}#ecoSr h1{font-size:36px}}';
  (document.head || R).appendChild(css);
  function mount(L) { var mc = document.querySelector('.gc-main-content'); if (!mc) return false; if (document.getElementById('ecoSr')) return true;
    R.classList.add('eco-sr'); document.title = 'Поиск по урокам · OduvanovSchool';
    var b = document.createElement('div'); b.id = 'ecoSr'; b.innerHTML = '<h1>Поиск по&nbsp;урокам</h1><input id="ecoSrQ" type="search" enterkeyhint="search" placeholder="Например: типографика, Midjourney, клиенты" autocomplete="off"><div id="ecoSrR"></div>'; mc.insertBefore(b, mc.firstChild);
    var q = b.querySelector('#ecoSrQ'), out = b.querySelector('#ecoSrR'), now = Date.now();
    var draw = function () { var v = q.value.trim().toLowerCase(); if (v.length < 2) { out.innerHTML = '<div class="m">Набери хотя бы две буквы&nbsp;— найдём урок по&nbsp;названию. Всего уроков: ' + L.length + '.</div>'; return }
      var W = v.split(/\s+/), F = L.filter(function (x) { var t = x.t.toLowerCase() + ' ' + x.m.toLowerCase(); return W.every(function (w) { return t.indexOf(w) >= 0 }) });
      var inT = function (x) { var t = x.t.toLowerCase(); return W.every(function (w) { return t.indexOf(w) >= 0 }) }; F = F.filter(inT).concat(F.filter(function (x) { return !inT(x) })).slice(0, 60); /* сначала совпадения в названии урока */
      var hl = function (s) { var h = esc(s); W.forEach(function (w) { if (w.length > 1) h = h.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>') }); return h };
      out.innerHTML = F.length ? '<div class="r">' + F.map(function (x) { var lock = x.at && Date.parse(x.at) > now; return '<a href="/pl/teach/control/lesson/view?id=' + x.id + '"><b>' + hl(x.t) + '</b><span>' + esc(x.m) + (lock ? ' · откроется ' + new Date(x.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' }) : '') + '</span></a>' }).join('') + '</div>' : '<div class="m">Ничего не&nbsp;нашли. Попробуй другое слово.</div>' };
    q.oninput = draw; q.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); q.blur() } }; draw(); setTimeout(function () { try { q.focus() } catch (e) {} }, 50); return true }
  var x = new XMLHttpRequest(); x.open('GET', API + '/sched'); x.onload = function () { var L = []; try { (JSON.parse(x.responseText).modules || []).forEach(function (m) { (m.parts || []).forEach(function (p) { (p.lessons || []).forEach(function (l) { L.push({ id: l.id, t: l.t, m: m.name + (p.name ? ' · ' + p.name : ''), at: p.at || m.at }) }) }) }) } catch (e) {}
    var n = 0, iv = setInterval(function () { if (mount(L) || ++n > 40) clearInterval(iv) }, 150) }; x.send();
})();

/* 30.10 (макет «Банк, кураторы и связь», раздел 11): Нейро-Одуванов на сайте.
   Кругляш 68 px справа внизу на страницах кабинета → по клику строка ввода (11.3, «A → D») → после вопроса панель чата справа ~400×600 (11.2), ⤢ — на весь экран.
   Пункт «Нейро-Одуванов» первым в меню GetCourse (свой элемент рядом с пунктами Vue, их не трогаем) открывает ту же панель; клавиша «/» — тоже.
   Диалог общий с вкладкой «Нейро» приложения: /ma/hist и /ma/ai с токеном кабинета (FS_AUTH → t; ?t= в адресе — простой запрос без предварительного OPTIONS).
   На уроке с ДЗ у формы сдачи — кнопка «Проверить с Нейро» (11.5): открывает панель с вопросом про этот урок и сразу просит прикрепить картинку.
   Телефон (≤767, сайт в браузере, 11.6): кругляш 56 px над панелью урока «Сдать работу» (.fl-bar), чат — шторкой на 92% экрана.
   Режим Telegram (html.eco-tg, ≤767) — кругляша нет: там своя вкладка «Нейро». На служебных страницах (fs-adm), полноэкранных встройках и страницах с чатом куратора (?fs=pult|bank|orders|chat|cur|curator|efir; 30.10 после QA №12 — и эфиры: в комнате кругляш закрывал поле чата) — тоже нет: там кругляш закрывал бы поле ввода; пункт меню и «/» работают. */
(function () {
  if (window.top !== window || window.__ecoNr) return; window.__ecoNr = 1;
  var U = +window.accountUserId || 0; if (!U) return;
  var API = 'https://oduvanov-api.romanoduvanov52.workers.dev', FACE = 'https://romanoduvanov.github.io/otzyvy/gc/ma/neuro.jpg', R = document.documentElement, GC = location.origin;
  var path = location.pathname.replace(/\/+$/, ''), fsm = (location.search.match(/[?&]fs=([a-z]+)/) || [])[1] || '';
  var NOFAB = /^(pult|bank|orders|chat|cur|curator|efir)$/.test(fsm) || /^\/(pl\/)?cms\/system\/login/.test(path);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch (e) { return null } }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v) } catch (e) { return null } }
  var IC = { send: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    full: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    clip: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 7"/></svg>',
    go: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' };
  var FC = 'object-fit:cover;object-position:49% 39%';
  var css = document.createElement('style');
  css.textContent = '@keyframes ecoNrBr{0%,100%{box-shadow:0 0 0 0 rgba(195,139,255,.5),0 16px 40px -10px rgba(96,0,255,.7)}50%{box-shadow:0 0 0 10px rgba(195,139,255,0),0 16px 40px -10px rgba(96,0,255,.7)}}@keyframes ecoNrBl{0%,100%{opacity:.35}50%{opacity:1}}'
    + '.eco-nr,.eco-nr *,.eco-np,.eco-np *{box-sizing:border-box}.eco-nr,.eco-np{font-family:"Inter Tight",Inter,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}'
    /* кругляш (11.1) и строка (11.3) — один элемент, ширина меняется плавно */
    + '.eco-nr{position:fixed;right:28px;bottom:28px;z-index:9985;width:68px;height:68px;border-radius:99px;display:flex;align-items:center;gap:12px;padding:0;overflow:visible;background:rgba(22,22,22,.92);-webkit-backdrop-filter:blur(20px);backdrop-filter:blur(20px);box-shadow:inset 0 0 0 2px #c38bff;cursor:pointer;transition:width .45s cubic-bezier(.2,.9,.25,1),height .3s,border-radius .45s,padding .45s,bottom .25s,right .25s,opacity .2s,transform .25s;animation:ecoNrBr 2.6s ease-in-out infinite}'
    + '.eco-nr .f{position:relative;flex:none;width:68px;height:68px;transition:width .45s,height .45s}.eco-nr .f img{width:100%;height:100%;border-radius:99px;display:block;' + FC + '}.eco-nr .f i{position:absolute;right:2px;bottom:2px;width:14px;height:14px;border-radius:99px;background:#4ade80;box-shadow:0 0 0 3px #000106}'
    + '.eco-nr .q,:root body .eco-nr input.q,:root body .eco-nr input.q:focus{flex:1;min-width:0;height:44px!important;border:0!important;outline:0;background:transparent!important;box-shadow:none!important;color:#fff!important;font:400 16px "Inter Tight",Inter,sans-serif!important;padding:0!important;margin:0!important}.eco-nr:not(.open) .q{display:none!important}.eco-nr .q::placeholder{color:rgba(255,255,255,.5)}'
    + '.eco-nr .sb,.eco-np .sb{width:42px;height:42px;border-radius:12px;border:0;cursor:pointer;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;display:none;place-items:center;flex:none;padding:0}'
    + '.eco-nr .bdg{position:absolute;top:-2px;left:-2px;min-width:20px;height:20px;border-radius:99px;background:#8f6af0;font:600 11px/20px "Inter Tight",sans-serif;text-align:center;padding:0 5px;display:none}.eco-nr.unr .bdg{display:block}'
    + '.eco-nr.sm{width:48px;height:48px}.eco-nr.sm .f{width:48px;height:48px}'
    + '.eco-nr.open{width:min(560px,calc(100vw - 120px));height:64px;border-radius:20px;padding:0 10px;animation:none;cursor:default;box-shadow:inset 0 0 0 1px rgba(195,139,255,.5),0 20px 50px -16px rgba(96,0,255,.8)}.eco-nr.open .f{width:44px;height:44px}.eco-nr.open .f i{display:none}.eco-nr.open .q{display:block}.eco-nr.open .sb{display:grid}.eco-nr.open .bdg{display:none}'
    + '.eco-nr .hi{position:absolute;right:0;bottom:86px;width:270px;background:#161616;border:1px solid rgba(255,255,255,.1);border-radius:20px 20px 6px 20px;padding:14px 16px;font-size:14px;line-height:1.45;box-shadow:0 20px 50px -20px rgba(0,0,0,.9);cursor:default;padding-right:36px}.eco-nr .hi .x{position:absolute;right:2px;top:2px;width:36px;height:36px;border:0;background:none;color:rgba(255,255,255,.5);cursor:pointer;padding:0;display:grid;place-items:center}.eco-nr.open .hi{display:none}'
    + '.eco-nr .chips,.eco-np .chips{display:flex;gap:6px;flex-wrap:wrap}.eco-nr .chips{position:absolute;right:0;bottom:76px;justify-content:flex-end;width:100%;display:none}.eco-nr.open .chips{display:flex}'
    + '.eco-nr .chips button,.eco-np .chips button,.eco-nr .hi button{display:inline-flex;align-items:center;height:32px;padding:0 12px;border-radius:99px;background:rgba(22,22,22,.94);border:1px solid rgba(255,255,255,.12);font:500 13px "Inter Tight",sans-serif;color:rgba(255,255,255,.88);white-space:nowrap;cursor:pointer}'
    + '.eco-nr .esc{position:absolute;right:8px;bottom:-21px;font-size:11.5px;color:rgba(255,255,255,.45);display:none;pointer-events:none}@media(min-width:768px){.eco-nr.open .esc{display:block}}'
    /* панель чата (11.2) */
    + '.eco-np{position:fixed;right:28px;bottom:28px;z-index:9986;width:400px;height:min(600px,calc(100vh - 56px));border-radius:28px;overflow:hidden;background:#0f0f0f;box-shadow:0 40px 100px -30px rgba(96,0,255,.6),inset 0 0 0 1px rgba(255,255,255,.1);display:none;flex-direction:column}.eco-np.on{display:flex}'
    + '.eco-np{flex-direction:row}.eco-np .mn{display:flex;flex-direction:column;flex:1;min-width:0;min-height:0}.eco-np .sd{display:none}'
    + '.eco-np.full .sd{display:flex;flex-direction:column;gap:4px;width:280px;flex:none;border-right:1px solid rgba(255,255,255,.07);padding:18px 12px 14px;overflow-y:auto;background:#0b0b0b}.eco-np .sh{display:flex;align-items:center;gap:10px;padding:0 6px 14px}.eco-np .sh img{width:36px;height:36px;border-radius:99px;' + FC + '}.eco-np .sh b{display:block;font-size:14.5px;font-weight:600}.eco-np .sh small{display:block;font-size:12px;color:rgba(255,255,255,.45)}'
    + '.eco-np .sd button.nw{display:flex;align-items:center;gap:8px;margin:12px 0 2px;padding:0 12px;height:40px;border-radius:12px;box-shadow:inset 0 0 0 1px rgba(195,139,255,.4);color:#fff;font-weight:500}.eco-np .sd button.nw.cf{background:rgba(255,107,107,.1);box-shadow:inset 0 0 0 1px rgba(255,107,107,.45);white-space:normal;height:auto;min-height:40px;padding:8px 12px}'
    + '.eco-np .sk{font-size:11.5px;letter-spacing:.04em;color:rgba(255,255,255,.4);padding:12px 8px 4px}.eco-np .sq,.eco-np .sl{display:flex;flex-direction:column;gap:2px}.eco-np .sl{flex:1;min-height:60px}.eco-np .sd button{display:block;width:100%;text-align:left;border:0;background:none;color:rgba(255,255,255,.82);font:400 14px/1.35 "Inter Tight",sans-serif;padding:9px 10px;border-radius:12px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.eco-np .sd button:hover{background:rgba(255,255,255,.05);color:#fff}.eco-np .se{font-size:13px;color:rgba(255,255,255,.4);padding:6px 10px}.eco-np .sn{font-size:11px;color:rgba(255,255,255,.4);padding:10px 8px 0;line-height:1.4}.eco-np.full .mn .nt{display:none}'
    + '.eco-np.full{left:84px;right:24px;top:24px;bottom:24px;width:auto;height:auto}.eco-np.full .bd{padding:24px max(24px,calc((100% - 760px)/2))}'
    + '.eco-np .hd{display:flex;align-items:center;gap:12px;padding:14px 14px 14px 16px;border-bottom:1px solid rgba(255,255,255,.07)}.eco-np .hd img{width:40px;height:40px;border-radius:99px;' + FC + ';flex:none}.eco-np .hd b{display:block;font-size:15px;font-weight:600}.eco-np .hd small{display:flex;align-items:center;gap:6px;font-size:12px;color:#4ade80}'
    + '.eco-np .ib{width:34px;height:34px;border-radius:10px;border:0;background:#1f1f1f;color:rgba(255,255,255,.75);display:grid;place-items:center;cursor:pointer;flex:none;padding:0}.eco-np .ib:hover{color:#fff}'
    + '.eco-np .bd{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;font-size:14.5px;line-height:1.5;overscroll-behavior:contain}'
    + '.eco-np .me{align-self:flex-end;max-width:82%;background:#242424;border-radius:20px 20px 6px 20px;padding:10px 14px;white-space:pre-wrap;overflow-wrap:anywhere}.eco-np .me img{display:block;max-width:180px;border-radius:10px;margin-bottom:6px}'
    + '.eco-np .ai{display:flex;gap:10px;align-items:flex-start}.eco-np .ai>img{width:28px;height:28px;border-radius:99px;' + FC + ';flex:none;margin-top:2px}.eco-np .ai .tx{flex:0 1 auto;min-width:0;max-width:calc(100% - 38px);background:#161616;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);border-radius:20px 20px 20px 6px;padding:10px 14px;white-space:pre-wrap;overflow-wrap:anywhere}.eco-np .ai .tx a{color:#e2c9ff;text-decoration:underline;text-underline-offset:2px}'
    /* 30.10 (Роман): ответ Нейро — в плашке, как в чате приложения; «печатает…» и ошибка — без второй рамки */
    + '.eco-np .ai .tx:has(>.ty:only-child){padding:6px 14px}.eco-np .ai .tx:has(>.err:only-child){background:none;box-shadow:none;padding:0}.eco-np.full .ai .tx{max-width:min(calc(100% - 38px),640px)}'
    + '.eco-np .ai .tx a.lk{display:flex;align-items:center;gap:10px;margin:10px 0;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#fff;text-decoration:none;white-space:normal;font-weight:500;line-height:1.3}.eco-np .ai .tx a.lk:first-child{margin-top:2px}.eco-np .ai .tx a.lk:last-child{margin-bottom:2px}.eco-np .ai .tx a.lk:hover{background:rgba(195,139,255,.12);border-color:rgba(195,139,255,.35)}.eco-np .ai .tx a.lk span{flex:1}.eco-np .ai .tx a.lk i{font-style:normal;color:rgba(255,255,255,.4)}'
    + '.eco-np .ty{display:inline-flex;gap:4px;padding:8px 0}.eco-np .ty i{width:7px;height:7px;border-radius:99px;background:#c38bff;animation:ecoNrBl 1s infinite}.eco-np .ty i:nth-child(2){animation-delay:.2s}.eco-np .ty i:nth-child(3){animation-delay:.4s}'
    + '.eco-np .ft{padding:0 12px 10px}.eco-np .chips{padding:0 0 10px}.eco-np .in{border-radius:20px;background:#161616;box-shadow:inset 0 0 0 1px rgba(195,139,255,.4);padding:8px 8px 8px 8px;display:flex;align-items:flex-end;gap:8px}'
    + ':root body .eco-np .in textarea,:root body .eco-np .in textarea:focus,:root body .eco-np .in textarea:hover{background:transparent!important;border:0!important;box-shadow:none!important;padding:10px 10px!important;border-radius:0!important;min-height:0!important;height:40px}'
    + '.eco-np textarea,:root body .eco-np textarea:focus{flex:1;min-width:0;border:0!important;outline:0;resize:none;background:transparent!important;box-shadow:none!important;color:#fff!important;font:400 16px/1.4 "Inter Tight",Inter,sans-serif!important;height:40px;min-height:0!important;max-height:140px;padding:9px 4px!important;margin:0!important;border-radius:0!important}.eco-np textarea::placeholder{color:rgba(255,255,255,.4)}.eco-np .in .sb{display:grid;width:38px;height:38px;border-radius:11px}.eco-np .in .ib{background:transparent;width:38px;height:38px}'
    + '.eco-np .att{display:none;align-items:center;gap:8px;margin:0 0 8px;font-size:13px;color:rgba(255,255,255,.7)}.eco-np .att.on{display:flex}.eco-np .att img{width:56px;height:40px;border-radius:8px;object-fit:cover}.eco-np .att button{border:0;background:none;color:#d77fff;cursor:pointer;font:500 13px "Inter Tight",sans-serif}'
    + '.eco-np .nt{font-size:11px;text-align:center;color:rgba(255,255,255,.44);margin:8px 0 0}.eco-np .cur{display:flex;width:fit-content;margin-top:10px;height:34px;align-items:center;padding:0 14px;border-radius:12px;background:rgba(195,139,255,.14);color:#e2c9ff!important;text-decoration:none!important;font-weight:500}'
    + '.eco-np .err{padding:12px 14px;border-radius:16px;background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.25);color:rgba(255,255,255,.85)}'
    /* кнопка на уроке с ДЗ (11.5) */
    + '.eco-nchk{display:inline-flex;align-items:center;gap:10px;height:56px;padding:0 20px 0 12px;margin:0 12px 0 0;border-radius:16px;border:1px solid rgba(195,139,255,.45);background:rgba(195,139,255,.12);color:#fff!important;font:600 15px "Inter Tight",Inter,sans-serif;cursor:pointer;vertical-align:middle}@media(max-width:700px){.eco-nchk{display:flex;width:100%;justify-content:center;margin:8px 0 0}}.eco-nchk img{width:26px;height:26px;border-radius:99px;' + FC + '}'
    /* телефон (11.6): кругляш 56 px, над панелью урока; чат — шторкой */
    + '@media(max-width:767px){.eco-nr{right:16px;bottom:calc(16px + env(safe-area-inset-bottom));width:56px;height:56px}.eco-nr .f{width:56px;height:56px}.eco-nr.sm{opacity:0;pointer-events:none;transform:translateY(16px)}.eco-nr.sm .f{width:56px;height:56px}html.eco-nr-on:not(.eco-tg) body{padding-bottom:calc(88px + env(safe-area-inset-bottom))!important}html.eco-nr-on:not(.eco-tg) body:has(.fl-bar){padding-bottom:calc(172px + env(safe-area-inset-bottom))!important}.eco-nr.open{width:calc(100vw - 32px);transform:none;z-index:99991}.eco-nr .hi{bottom:72px;width:250px}'
    + '.eco-np .sd,.eco-np.full .sd{display:none}'
    + '.eco-np,.eco-np.full{z-index:99990;left:0;right:0;bottom:0;top:auto;width:100%;height:92vh;height:92dvh;border-radius:28px 28px 0 0}.eco-np .bd{padding:14px}.eco-np [data-a=full]{display:none}.eco-np .ft{padding-bottom:calc(10px + env(safe-area-inset-bottom))}'
    + '.eco-nbk{position:fixed;inset:0;z-index:99989;background:rgba(0,0,0,.55);display:none}.eco-nbk.on{display:block}}'
    + '@media(max-width:700px){html:has(.fl-bar:not(.off)) .eco-nr:not(.open){bottom:calc(96px + env(safe-area-inset-bottom))}}'
    + '@media(max-width:767px){html.eco-tg .eco-nr,html.eco-tg .eco-nbk{display:none!important}}'
    + 'html.fs-adm .eco-nr{display:none!important}@media print{.eco-nr,.eco-np{display:none!important}}';
  (document.head || R).appendChild(css);

  var fab, pan, bk, bd, ta, IMG = null, BUSY = false, HIST = false, UNR = 0;
  function auth(force) { return window.FS_AUTH ? window.FS_AUTH(!!force) : Promise.resolve(null) }
  /* запрос к Нейро с токеном кабинета; при 401 — один повтор с новым токеном */
  function call(p, body) { var go = function (a) { if (!a || !a.t) return Promise.reject(new Error('auth')); var url = API + p + (p.indexOf('?') < 0 ? '?' : '&') + 't=' + encodeURIComponent(a.t);
      return fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) } : {}) };
    return auth().then(function (a) { return go(a).then(function (r) { if (r.status !== 401) return r; return auth(true).then(go) }) }).then(function (r) { return r.json() }) }
  /* как в приложении (fmt): **жирный**, ссылки на кабинет — карточкой «открою здесь же», остальные — новой вкладкой */
  function fmt(t) { var s = esc(String(t == null ? '' : t).trim()).replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/^#{1,6}\s*/gm, '');
    return s.replace(/(https?:\/\/[^\s<)]+[^\s<).,;:!?»])/g, function (u) { var r = u.replace(/&amp;/g, '&');
      if (r.indexOf(GC) === 0) return '<a class="lk" href="' + esc(r.slice(GC.length) || '/') + '"><span>Открыть в кабинете</span><i>›</i></a>';
      return '<a href="' + esc(r) + '" target="_blank" rel="noopener">' + esc(r.replace(/^https?:\/\//, '').slice(0, 40)) + '</a>' })
      /* 30.10 (Роман): карточка «Открыть в кабинете» — блок; переносы строк вокруг неё при pre-wrap давали пустоту — убираем, отступы даёт сама карточка */
      .replace(/\s*(<a class="lk"[^>]*>[\s\S]*?<\/a>)\s*/g, '$1') }
  function add(role, text, img) { var d = document.createElement('div');
    if (role === 'user') { d.className = 'me'; d.innerHTML = (img ? '<img src="' + img + '" alt="">' : '') + esc(text) }
    else { d.className = 'ai'; d.innerHTML = '<img src="' + FACE + '" alt=""><div class="tx">' + (text == null ? '<span class="ty"><i></i><i></i><i></i></span>' : fmt(text)) + '</div>' }
    bd.appendChild(d); bd.scrollTop = 1e9; if (role === 'user' && pan && bd.isConnected) side(); return d }
  /* 30.10 (после QA №2, №5): история приходит позже, чем первый вопрос или подсказка, — раньше она стирала ленту (bd.innerHTML = '') вместе с вопросом и «печатает…».
     Теперь история вставляется ПЕРЕД тем, что уже добавлено в ленту за время загрузки; вопросы, которые сервер уже успел записать в историю, не дублируются. */
  var SENT = [];
  function hist() { if (HIST) return; HIST = true;
    var put = function (H, hello) { var live = bd.children.length, f = document.createDocumentFragment(), tmp = bd;
        /* хвост истории с только что отправленными вопросами (и ответами на них) — уже в ленте */
        if (SENT.length) { for (var i = H.length - 1; i >= 0; i--) if (H[i].role === 'user' && SENT.indexOf(String(H[i].text || '').trim()) >= 0) { H = H.slice(0, i); break } }
        bd = document.createElement('div');
        if (!H.length && !live) add('ai', hello);
        H.slice(-30).forEach(function (x) { if (!x.test) add(x.role === 'user' ? 'user' : 'ai', x.role === 'user' ? x.text : String(x.text || '').replace(/\n?\s*\[\[[^\]]*\]\]\s*$/, '')) });
        while (bd.firstChild) f.appendChild(bd.firstChild); bd = tmp; bd.insertBefore(f, bd.firstChild);
        if (!SENT.length) pan.querySelector('.chips').style.display = H.length > 2 ? 'none' : ''; side();
        bd.scrollTop = 1e9 };
    call('/ma/hist').then(function (j) { put((j && j.hist) || [], 'Привет! Я Нейро-Одуванов, ИИ-версия Романа. Знаю твой прогресс, расписание и баллы, разбираю работы — прикрепи картинку скрепкой.') })
      .catch(function () { HIST = false; put([], 'Привет! Я Нейро-Одуванов. Спроси про уроки, баллы или пришли работу на разбор.') }) }
  function send(t0) { if (BUSY) return; var t = (t0 != null ? t0 : ta.value).trim(), img = IMG; if (!t && !img) return;
    openPanel(); SENT.push(t); add('user', t, img); ta.value = ''; ta.style.height = ''; IMG = null; pan.querySelector('.att').classList.remove('on'); pan.querySelector('.chips').style.display = 'none';
    BUSY = true; var w = add('ai', null), to = setTimeout(function () { BUSY = false }, 35000);
    call('/ma/ai', { text: t, img: img }).then(function (j) { var tx = w.querySelector('.tx');
      if (!j || (!j.ok && j.err === 'ai')) { tx.innerHTML = '<div class="err">Сейчас технические неполадки. Попробуй через несколько минут. Если не заработает долго — напиши в <a href="https://t.me/zabota_oduvanov" target="_blank" rel="noopener">Заботу о студентах</a>.</div>'; return }
      tx.innerHTML = fmt(j.text || 'Не получилось ответить, попробуй ещё раз.');
      if (j.curator && j.curator.tg) tx.insertAdjacentHTML('beforeend', '<a class="cur" target="_blank" rel="noopener" href="https://t.me/' + encodeURIComponent(j.curator.tg) + '">Написать куратору</a>');
      if (j.quick && j.quick.length) { var q = document.createElement('div'); q.className = 'chips'; q.style.padding = '0 0 0 38px'; q.innerHTML = j.quick.map(function (x) { return '<button type="button">' + esc(x) + '</button>' }).join(''); w.after(q);
        q.onclick = function (e) { var b = e.target.closest('button'); if (b) { q.remove(); send(b.textContent) } } }
      if (!pan.classList.contains('on')) { UNR++; badge() } })
      .catch(function () { w.querySelector('.tx').innerHTML = '<div class="err">Нет связи с Нейро. Проверь интернет и попробуй ещё раз.</div>' })
      .then(function () { clearTimeout(to); BUSY = false; bd.scrollTop = 1e9 }) }
  function badge() { if (fab) { fab.classList.toggle('unr', UNR > 0); fab.querySelector('.bdg').textContent = UNR } var m = document.querySelector('.eco-mn .eco-mnb'); if (m) { m.textContent = UNR; m.style.display = UNR ? '' : 'none' } }
  /* 30.10 (макет 11.5, QA №27/№30): на весь экран (⤢) — слева колонка: «Твои вопросы» из этой переписки (нажми — лента прокрутится к вопросу) и частые вопросы.
     У сервера один диалог на ученика, поэтому отдельных «чатов» нет — список строится по вопросам текущего диалога; «Новый чат» очищает диалог (раунд 3). На телефоне колонки нет. */
  var SIDE = '<aside class="sd" aria-label="Вопросы"><div class="sh"><img src="' + FACE + '" alt=""><span><b>Нейро-Одуванов</b><small>полный экран</small></span></div>'
    + '<button type="button" class="nw" data-a="new">+ Новый чат</button>'
    + '<div class="sk">Частые вопросы</div><div class="sq"><button type="button" data-a="ask">Что дальше?</button><button type="button" data-a="ask">Где мой доступ?</button><button type="button" data-a="ask">Как получить x2 за ДЗ?</button><button type="button" data-a="ask">Моё место в рейтинге</button><button type="button" data-a="pic">Разобрать работу</button></div>'
    + '<div class="sk">Твои вопросы</div><div class="sl"></div><div class="sn">ИИ может ошибаться. Сложный вопрос — позову куратора</div></aside>';
  function side() { if (!pan) return; var l = pan.querySelector('.sd .sl'); if (!l) return; var M = [].slice.call(bd.querySelectorAll('.me')).filter(function (x) { return x.textContent.trim() });
    l.innerHTML = M.length ? M.slice(-40).reverse().map(function (x) { var k = M.indexOf(x); return '<button type="button" data-a="go" data-i="' + k + '">' + esc(x.textContent.replace(/\s+/g, ' ').trim().slice(0, 70)) + '</button>' }).join('') : '<span class="se">Здесь появятся твои вопросы</span>' }
  /* QA раунд 3 (№27, макет 11.5): «Новый чат» на весь экран. У сервера один диалог на ученика (общий с вкладкой «Нейро» приложения),
     поэтому новый чат = очистить этот диалог (POST /ma/ai {reset:1}, сервер это уже умеет). Второе нажатие подтверждает: переписка пропадёт и в приложении. */
  var NWT = 0;
  function fresh(b) { if (BUSY) return;
    if (!b.classList.contains('cf')) { b.classList.add('cf'); b.textContent = 'Начать заново? Прошлая переписка удалится и в приложении — нажми ещё раз'; clearTimeout(NWT); NWT = setTimeout(function () { b.classList.remove('cf'); b.textContent = '+ Новый чат' }, 5000); return }
    clearTimeout(NWT); b.classList.remove('cf'); b.textContent = '+ Новый чат'; BUSY = true;
    call('/ma/ai', { reset: 1 }).then(function (j) { if (!j || j.ok === false) throw 0; SENT = []; bd.innerHTML = ''; add('ai', 'Новый чат. Спроси про уроки, баллы или пришли работу на разбор — прикрепи картинку скрепкой.'); pan.querySelector('.chips').style.display = ''; side(); try { ta.focus() } catch (e) {} })
      .catch(function () { var e = add('ai', ''); e.querySelector('.tx').innerHTML = '<div class="err">Не получилось начать новый чат. Попробуй ещё раз.</div>' })
      .then(function () { BUSY = false }) }
  function build() { if (pan) return;
    bk = document.createElement('div'); bk.className = 'eco-nbk'; bk.onclick = closeAll; document.body.appendChild(bk);
    pan = document.createElement('section'); pan.className = 'eco-np'; pan.setAttribute('aria-label', 'Нейро-Одуванов');
    pan.innerHTML = SIDE + '<div class="mn"><div class="hd"><img src="' + FACE + '" alt=""><span style="flex:1;min-width:0"><b>Нейро-Одуванов</b><small>отвечает за секунды</small></span><button type="button" class="ib" data-a="full" aria-label="На весь экран" title="На весь экран">' + IC.full + '</button><button type="button" class="ib" data-a="x" aria-label="Свернуть">' + IC.x + '</button></div>'
      + '<div class="bd"></div><div class="ft"><div class="chips"><button type="button">Что дальше?</button><button type="button">Где мой доступ?</button><button type="button" data-a="pic">Разобрать работу</button><button type="button">Моё место в рейтинге</button></div>'
      + '<div class="att"><img alt=""><span style="flex:1">Картинка прикреплена</span><button type="button" data-a="unatt">Убрать</button></div>'
      + '<div class="in"><button type="button" class="ib" data-a="pic" aria-label="Прикрепить картинку">' + IC.clip + '</button><textarea rows="1" placeholder="Спроси или прикрепи картинку…" enterkeyhint="send"></textarea><button type="button" class="sb" data-a="send" aria-label="Отправить">' + IC.send + '</button></div>'
      + '<div class="nt">ИИ может ошибаться. Сложный вопрос — позову куратора</div><input type="file" accept="image/*" hidden></div></div>';
    document.body.appendChild(pan); bd = pan.querySelector('.bd'); ta = pan.querySelector('textarea');
    var fi = pan.querySelector('input[type=file]');
    pan.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'), a = b && b.getAttribute('data-a');
      if (a === 'x') closeAll(); else if (a === 'full') { pan.classList.toggle('full'); try { ss('ecoNrFull', pan.classList.contains('full') ? '1' : null) } catch (er) {} }
      else if (a === 'send') send(); else if (a === 'new') fresh(b); else if (a === 'ask') send(b.textContent); else if (a === 'go') { var mm = bd.querySelectorAll('.me')[+b.getAttribute('data-i')]; if (mm) mm.scrollIntoView({ behavior: 'smooth', block: 'center' }) } else if (a === 'pic') fi.click(); else if (a === 'unatt') { IMG = null; pan.querySelector('.att').classList.remove('on') }
      else if (!a && e.target.closest('.ft .chips button')) send(e.target.closest('button').textContent);
      /* ссылка на кабинет — этой же вкладкой, панель откроется снова на новой странице */
      var lk = e.target.closest('a.lk'); if (lk) ss('ecoNrOpen', '1') });
    ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px' });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && innerWidth > 767) { e.preventDefault(); send() } if (e.key === 'Escape') closeAll() });
    fi.onchange = function () { var f = fi.files[0]; fi.value = ''; if (!f) return; var r = new FileReader(); r.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); IMG = c.toDataURL('image/jpeg', .82); var at = pan.querySelector('.att'); at.querySelector('img').src = IMG; at.classList.add('on'); ta.focus() }; im.src = r.result }; r.readAsDataURL(f) };
    if (ss('ecoNrFull') === '1' && innerWidth > 767) pan.classList.add('full') }
  function openPanel() { build(); if (pan.classList.contains('on')) return; pan.classList.add('on'); if (innerWidth <= 767) bk.classList.add('on'); if (fab) { fab.classList.remove('open'); fab.style.display = 'none' } UNR = 0; badge(); hist(); ss('ecoNrOpen', '1'); setTimeout(function () { try { if (innerWidth > 767) ta.focus() } catch (e) {} bd.scrollTop = 1e9 }, 30) }
  function closeAll() { if (pan) pan.classList.remove('on'); if (bk) bk.classList.remove('on'); if (fab) { fab.classList.remove('open'); fab.style.display = '' } ss('ecoNrOpen', null) }
  function openLine() { if (!fab) return openPanel(); if (innerWidth <= 767 && R.classList.contains('eco-tg')) { location.href = 'https://romanoduvanov.github.io/otzyvy/gc/app.html#ai'; return } fab.classList.add('open'); if (innerWidth <= 767) { build(); bk.classList.add('on') } var h = fab.querySelector('.hi'); if (h) h.remove(); ls('ecoNrHi', '1'); setTimeout(function () { try { fab.querySelector('.q').focus() } catch (e) {} }, 60) }
  window.ecoNeuro = { open: openPanel, line: openLine, ask: function (t) { openPanel(); if (t) { ta.value = t; ta.dispatchEvent(new Event('input')) } } };
  function mkFab() { if (fab || NOFAB || !document.body) return; fab = document.createElement('div'); fab.className = 'eco-nr'; fab.setAttribute('role', 'button'); fab.setAttribute('aria-label', 'Нейро-Одуванов: спроси что угодно'); fab.tabIndex = 0;
    fab.innerHTML = '<span class="f"><img src="' + FACE + '" alt=""><i></i></span><span class="bdg"></span><input class="q" type="text" enterkeyhint="send" placeholder="Спроси что угодно или найди страницу…" aria-label="Вопрос Нейро-Одуванову"><button type="button" class="sb" aria-label="Спросить">' + IC.go + '</button>'
      + '<div class="chips"><button type="button">Где мой доступ?</button><button type="button">Что дальше?</button><button type="button" data-a="pic">Разобрать работу</button><button type="button">Открой рейтинг</button></div><span class="esc">Esc · свернуть</span>';
    /* приветствие — один раз: закрыл пузырь или открыл строку — больше не показываем; само гаснет через 6 с */
    if (!ls('ecoNrHi')) { var hi = document.createElement('div'); hi.className = 'hi'; hi.innerHTML = '<button type="button" class="x" aria-label="Закрыть">' + IC.x + '</button>Привет! Я Нейро-Одуванов. Найду урок, подскажу по баллам или разберу работу :)<div class="chips" style="display:flex;margin-top:10px;position:static"><button type="button">Разобрать работу</button><button type="button">Что дальше?</button></div>'; fab.appendChild(hi);
      setTimeout(function () { if (hi.parentNode) { hi.remove(); ls('ecoNrHi', '1') } }, 6000) }
    var q = fab.querySelector('.q');
    fab.addEventListener('click', function (e) { var hb = e.target.closest('.hi'); if (hb) { e.stopPropagation(); var b0 = e.target.closest('button'); hb.remove(); ls('ecoNrHi', '1'); if (b0 && !b0.classList.contains('x')) { if (/Разобрать/.test(b0.textContent)) { openPanel(); pan.querySelector('input[type=file]').click() } else send(b0.textContent) } return }
      var b = e.target.closest('.chips button'); if (b) { if (b.getAttribute('data-a') === 'pic') { openPanel(); pan.querySelector('input[type=file]').click() } else send(b.textContent); return }
      if (e.target.closest('.sb')) { var v = q.value; q.value = ''; if (v.trim()) send(v); else openPanel(); return }
      if (!fab.classList.contains('open')) openLine() });
    fab.addEventListener('keydown', function (e) { if (e.target === fab && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openLine() } });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var v = q.value; q.value = ''; if (v.trim()) send(v) } if (e.key === 'Escape') { q.blur(); fab.classList.remove('open'); if (bk) bk.classList.remove('on') } });
    document.addEventListener('mousedown', function (e) { if (fab.classList.contains('open') && !fab.contains(e.target) && !q.value) { fab.classList.remove('open'); if (bk && !(pan && pan.classList.contains('on'))) bk.classList.remove('on') } });
    /* прокрутка вниз — кругляш уменьшается (на телефоне уезжает), вверх — возвращается */
    var ly = scrollY; addEventListener('scroll', function () { var y = scrollY; if (Math.abs(y - ly) < 8) return; if (!fab.classList.contains('open')) fab.classList.toggle('sm', y > ly && y > 200); ly = y }, { passive: true });
    document.body.appendChild(fab); R.classList.add('eco-nr-on') }
  /* «/» — открыть с любой страницы (кроме полей ввода); Esc — свернуть */
  document.addEventListener('keydown', function (e) { var t = e.target, ed = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (e.key === '/' && !ed && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); if (fab && !(pan && pan.classList.contains('on'))) openLine(); else openPanel() }
    else if (e.key === 'Escape' && pan && pan.classList.contains('on') && !ed) closeAll() });
  /* 11.5: «Проверить с Нейро» у формы сдачи ДЗ (layout.js помечает блок задания классом fl-mis) */
  /* 30.10 (после QA №4, №5): только у настоящих ДЗ с работой — есть загрузка файлов или выбор уровня, и это не анкета («Засчитать анкету») и не «Я ознакомлен(а)»;
     название — текущего урока (h1.fl-t, без «— домашка»), а не первый h1 страницы (там тренинг/модуль); кнопка — после «Отправить на проверку», той же высоты 56 px. */
  function hwBtn() { if (innerWidth <= 767 && R.classList.contains('eco-tg')) return true; var mw = document.querySelector('.fl-mis'); if (!mw || mw.querySelector('.eco-nchk')) return !!mw; var sb = mw.querySelector('.btn-send-answer'); if (!sb) return false;
    if (document.querySelector('.lt-form-survey, .fl-steps.s2') || /засчитать|анкет/i.test(sb.textContent) || /анкет/i.test((document.querySelector('h1.fl-t') || {}).textContent || '')) return true;
    if (!mw.querySelector('.uploadifive-button, input[type=file], .fl-seg')) return false;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'eco-nchk'; b.innerHTML = '<img src="' + FACE + '" alt="">Проверить с Нейро';
    b.onclick = function () { var h = document.querySelector('h1.fl-t') || document.querySelector('.lesson-title-value') || document.querySelector('.lite-page h1'), nm = '';
      if (h) { var hc = h.cloneNode(true); [].forEach.call(hc.querySelectorAll('span'), function (x) { x.remove() }); nm = hc.textContent.replace(/\s+/g, ' ').trim() }
      openPanel(); var t = 'Проверь мою работу перед сдачей' + (nm ? ': урок «' + nm.slice(0, 120) + '»' : '') + '. Что поправить, чтобы приняли?'; ta.value = t; ta.dispatchEvent(new Event('input'));
      add('ai', 'Прикрепи картинку работы скрепкой внизу и нажми «Отправить» — разберу и подскажу, что поправить до сдачи куратору.') };
    var last = mw.querySelector('.btn-save-draft:not([style*="none"])') || sb; last.parentNode.insertBefore(b, last.nextSibling); return true }
  function start() { mkFab(); if (ss('ecoNrOpen') === '1' && !NOFAB && !(innerWidth <= 767 && R.classList.contains('eco-tg'))) openPanel();
    var n = 0, iv = setInterval(function () { if (hwBtn() || ++n > 40) clearInterval(iv) }, 400) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* 30.10 (макет 11.1–11.2): пункт «Нейро-Одуванов» первым в меню GetCourse — фото с зелёной точкой «в сети», подсказка «клавиша /»,
   в раскрытом меню «Нейро-Одуванов · спроси что угодно · /», счётчик ответа, пришедшего при закрытой панели. Открывает ту же панель, что и кругляш.
   Меню — приложение Vue: свой пункт — копия шаблона пункта с классом eco-mn, вставляется один раз перед первым пунктом; пункты GetCourse не трогаем.
   В режиме Telegram на телефоне пункт ведёт во вкладку «Нейро» приложения. */
(function () {
  if (window.top !== window || window.__ecoMn) return; window.__ecoMn = 1;
  var U = +window.accountUserId || 0; if (!U) return;
  var FACE = 'https://romanoduvanov.github.io/otzyvy/gc/ma/neuro.jpg', R = document.documentElement;
  var css = document.createElement('style');
  css.textContent = 'html body .main-menu .eco-mn .main-menu-item__icon svg{display:none!important}html body .main-menu .eco-mn .main-menu-item__icon::before,html body .main-menu .eco-mn .main-menu-item__icon::after{display:none!important}'
    + '.main-menu .eco-mn .main-menu-item__icon{width:40px!important;height:40px!important;display:grid!important;place-items:center!important;background:none!important}'
    + '.main-menu .eco-mn .eco-mnf{position:relative;display:block;width:32px;height:32px;margin:0}.main-menu .eco-mn .eco-mnf img{width:32px;height:32px;border-radius:50%;object-fit:cover;object-position:49% 39%;display:block;box-shadow:0 0 0 1.5px rgba(195,139,255,.85)}'
    + '.main-menu .eco-mn .eco-mnf i{position:absolute;right:-2px;bottom:-2px;width:9px;height:9px;border-radius:50%;background:#4ade80;border:2px solid #0b0b0b}.main-menu .eco-mn .eco-mnb{position:absolute;top:-5px;right:-7px;min-width:18px;height:16px;border-radius:99px;background:#8f6af0;color:#fff;font:600 10px/16px "Inter Tight",sans-serif;text-align:center;padding:0 4px}'
    + 'html body .main-menu .eco-mn,html body .main-menu .eco-mn:hover{background:transparent!important;box-shadow:none!important;border:0!important}html body .main-menu .eco-mn:hover .main-menu-item__header{background:rgba(255,255,255,.06)}'
    + '.main-menu .eco-mn .main-menu-item__text b{font:inherit;color:inherit}.main-menu .eco-mn .main-menu-item__text small{display:none}'
    + '.main-menu:not(.main-menu--is-expanded) .eco-mn .main-menu-item__header-body{display:none!important}.main-menu .eco-mn .tooltip__dropdown{display:none}.main-menu .eco-mnsep{display:none!important}';
  (document.head || R).appendChild(css);
  function tg() { return innerWidth <= 767 && R.classList.contains('eco-tg') }
  function put() { var body = document.querySelector('.main-menu .main-menu__body'); if (!body || body.querySelector('.eco-mn')) return;
    var tpl = body.querySelector('a.main-menu-item:not(.eco-mi):not(.eco-mn)'); if (!tpl) return;
    var a = tpl.cloneNode(true); a.className = tpl.className.replace(/\s*\b(eco-mi|active|selected)\b/g, '') + ' eco-mn'; a.removeAttribute('data-eco'); a.setAttribute('data-active', 'false'); a.href = '#neuro'; a.setAttribute('aria-label', 'Нейро-Одуванов');
    var ic = a.querySelector('.main-menu-item__icon'); if (ic) ic.innerHTML = '<span class="eco-mnf"><img src="' + FACE + '" alt=""><i></i><b class="eco-mnb" style="display:none"></b></span>';
    var lbl = '<b>Нейро-Одуванов</b><small>спроси что угодно · /</small>', tx = a.querySelector('.main-menu-item__text');
    if (tx) tx.innerHTML = lbl; else { var hd = a.querySelector('.main-menu-item__header'); if (hd) { var hb = document.createElement('div'); hb.className = 'main-menu-item__header-body'; hb.innerHTML = '<span class="text-body main-menu-item__text">' + lbl + '</span>'; hd.appendChild(hb) } }
    var tt = a.querySelector('.tooltip__dropdown'); if (tt) tt.textContent = 'Нейро-Одуванов · клавиша /';
    a.querySelectorAll('.menu-badge,.main-menu-item__badge').forEach(function (b) { b.remove() });
    a.addEventListener('mouseenter', function () { var t = a.querySelector('.tooltip__dropdown'); if (t && !document.querySelector('.main-menu--is-expanded')) t.style.display = 'flex' });
    a.addEventListener('mouseleave', function () { var t = a.querySelector('.tooltip__dropdown'); if (t) t.style.display = 'none' });
    a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); if (tg()) { location.href = 'https://romanoduvanov.github.io/otzyvy/gc/app.html#ai'; return } if (window.ecoNeuro) window.ecoNeuro.open() }, true);
    var sep = document.createElement('div'); sep.className = 'eco-mnsep';
    body.insertBefore(sep, body.firstChild); body.insertBefore(a, sep) }
  var t = 0; function later() { if (t) return; t = setTimeout(function () { t = 0; try { put() } catch (e) {} }, 150) }
  function start() { setTimeout(function () { try { put() } catch (e) {} new MutationObserver(later).observe(document.body, { childList: true, subtree: true }) }, 650) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* 30.10 (макет 7.1–7.3, решение Романа №4): кабинет куратора на сайте — /teach/control/stream?fs=cur.
   Куратор входит своим аккаунтом GetCourse. Очередь — лента ответов GetCourse (/teach/control/answers/unanswered) того же входа: fetch страницы, разбор HTML.
   Свои ученики — по серверу (/bank/staff/list: куратору только его, Роману все с именем куратора); если сервер не ответил — всё, что GetCourse показал этому входу.
   Ответ сохраняется в GetCourse тем же запросом, что делает сама лента (answers.js GetCourse, изучено 30.10, только чтение):
     1) комментарий — POST /cms/comment/add: поля формы комментария этого ответа (GetCourseComment[settings] — подписанные настройки из страницы) + GetCourseComment[comment_text];
     2) статус — POST на адрес ленты: answer_id + action=accept | decline (так кнопки «Принять»/«Отклонить» отправляют форму .lesson-answer-form через ajaxForm), ответ — JSON.
   После успеха — POST /cur/hwlog на наш сервер (журнал, сообщение ученику в бот). Баллы: в GetCourse поля баллов у ответа нет — уходят только в /cur/hwlog.
   Если формы у ответа нет (нет прав) или GetCourse ответил не JSON — кнопка «Открыть в GetCourse» (родная страница ответа в нашей теме). */
(function () {
  if (window.top !== window || window.__ecoCab) return; window.__ecoCab = 1;
  var K = window.ecoK, U = K && K.U; if (!K || !U) return;
  var path = location.pathname.replace(/\/+$/, ''); if (path !== '/teach/control/stream' || !/[?&]fs=cur\b/.test(location.search)) return;
  var R = document.documentElement, esc = K.esc, FEED = '/teach/control/answers/unanswered';
  var LV = [['easy', 'Лёгкий', 20], ['mid', 'Средний', 40], ['max', 'Максимальный', 70]], HW_MAX = 70;
  R.classList.add('eco-cab'); setTimeout(function () { if (!document.getElementById('ecoCab')) R.classList.remove('eco-cab') }, 9000);
  var css = document.createElement('style');
  css.textContent = 'html.eco-cab .gc-main-content>*:not(#ecoCab):not(.fs-foot){display:none!important}'
    + '#ecoCab .cb-grid{display:grid;grid-template-columns:330px minmax(0,1fr);gap:20px;margin-top:24px;align-items:start}#ecoCab .cb-q{padding:10px;position:sticky;top:20px;max-height:calc(100vh - 40px);overflow-y:auto}'
    + '#ecoCab .cb-q button{display:block;width:100%;text-align:left;border:0;background:none;color:#fff;padding:14px;border-radius:16px;cursor:pointer;font:inherit}#ecoCab .cb-q button.on{background:var(--s3)}#ecoCab .cb-q button:hover{background:rgba(255,255,255,.04)}#ecoCab .cb-q button.on:hover{background:var(--s3)}'
    + '#ecoCab .cb-q .tp{display:flex;justify-content:space-between;gap:8px;align-items:baseline}#ecoCab .cb-q b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ecoCab .cb-q .w{font-size:12px;white-space:nowrap}#ecoCab .cb-q small{display:block;font-size:13px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}'
    + '#ecoCab .cb-d{padding:24px}#ecoCab .cb-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}#ecoCab .cb-nm{font-size:24px;font-weight:600;margin-top:4px;letter-spacing:-.01em}#ecoCab .cb-acts{display:flex;gap:8px;flex-wrap:wrap}'
    + '#ecoCab .cb-files{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:16px}#ecoCab .cb-files a{display:block;aspect-ratio:4/5;border-radius:14px;overflow:hidden;background:var(--s3);border:1px solid var(--line)}#ecoCab .cb-files img{width:100%;height:100%;object-fit:cover;display:block}#ecoCab .cb-files a.doc{display:grid;place-items:center;padding:10px;text-align:center;font-size:13px;color:var(--mut)!important;text-decoration:none!important;aspect-ratio:auto;min-height:64px}'
    + '#ecoCab .cb-ans{background:var(--s1);border:1px solid var(--line);border-radius:20px;padding:16px 18px;margin-top:14px}#ecoCab .cb-ans .tx{font-size:14.5px;margin-top:6px;white-space:pre-wrap;overflow-wrap:anywhere}#ecoCab .cb-ans .af{display:flex;gap:8px;font-size:13.5px;margin-top:6px;color:var(--mut)}#ecoCab .cb-ans .af b{color:#fff;font-weight:500}'
    + '#ecoCab .cb-two{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}#ecoCab .cb-row{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center}#ecoCab .cb-pts{font-size:28px;font-weight:600;font-variant-numeric:tabular-nums;min-width:48px;text-align:center}'
    + '#ecoCab textarea,#ecoCab input[type=text],#ecoCab input[type=date]{width:100%;border-radius:14px!important;background:var(--s1)!important;border:1px solid var(--line2)!important;box-shadow:none!important;color:#fff!important;font:400 16px/1.4 "Inter Tight",sans-serif!important;padding:12px!important;margin:0!important;outline:none;color-scheme:dark}#ecoCab textarea{min-height:118px;resize:vertical}#ecoCab textarea:focus,#ecoCab input:focus{border-color:rgba(166,107,255,.6)}'
    + '#ecoCab .cb-rw{display:none;margin-top:14px;padding:16px;border-radius:20px;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.25)}#ecoCab .cb-rw.on{display:block}#ecoCab .cb-rw ol{margin:8px 0 0;padding:0 0 0 20px;display:grid;gap:8px}#ecoCab .cb-rw li input{height:44px}#ecoCab .cb-rw .due{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}#ecoCab .cb-rw .due input{width:180px;height:44px}'
    + '#ecoCab .cb-go{display:flex;gap:10px;margin-top:18px}#ecoCab .cb-go .ec-btn{flex:2}#ecoCab .cb-go .ec-btn2{flex:1}#ecoCab .cb-msg{margin-top:10px;font-size:13.5px}#ecoCab .cb-msg.r{color:var(--red)}#ecoCab .cb-bot{margin-top:14px;padding:12px 14px;border-radius:14px;background:var(--s1,rgba(255,255,255,.04));box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}#ecoCab .cb-bt{margin-top:6px;white-space:pre-line;font-size:14px;line-height:1.45;color:#fff;overflow-wrap:anywhere}#ecoCab .cb-bn{margin-top:6px;font-size:12.5px}#ecoCab .cb-msg:empty{display:none}#ecoCab .cb-msg.g{color:var(--green)}'
    + '#ecoCab .cb-cm{margin-top:14px;display:grid;gap:8px}#ecoCab .cb-cm div{background:var(--s3);border-radius:14px;padding:10px 12px;font-size:13.5px;white-space:pre-wrap}#ecoCab .cb-cm small{display:block;color:var(--dim);font-size:12px;margin-bottom:2px}'
    /* 30.10 (после QA №8, №19, №24): группы «Давно ждут» и «Анкеты…», пустое состояние «Все ДЗ проверены», кнопки «Открыть в GetCourse» и «Чат» — справа от имени */
    + '#ecoCab .cb-g{border-top:1px solid var(--line);margin-top:6px;padding-top:6px}#ecoCab .cb-g summary{display:flex;justify-content:space-between;align-items:center;gap:8px;list-style:none;cursor:pointer;padding:12px 14px;border-radius:14px;font-weight:600;font-size:14px;color:rgba(255,255,255,.8)}#ecoCab .cb-g summary::-webkit-details-marker{display:none}#ecoCab .cb-g summary:hover{background:rgba(255,255,255,.04)}#ecoCab .cb-g summary span:first-child:before{content:"›";display:inline-block;width:14px;transition:transform .2s;color:var(--mut)}#ecoCab .cb-g[open] summary span:first-child:before{transform:rotate(90deg)}'
    + '#ecoCab .cb-hr{margin-top:22px}#ecoCab .cb-hr .bars{display:grid;grid-template-columns:repeat(24,minmax(0,1fr));gap:3px;align-items:end;height:96px;margin-top:12px}#ecoCab .cb-hr .bars i{display:block;border-radius:4px 4px 2px 2px;background:rgba(195,139,255,.35);min-height:2px}#ecoCab .cb-hr .bars i.pk{background:#c38bff}#ecoCab .cb-hr .ax{display:grid;grid-template-columns:repeat(4,1fr);font-size:11.5px;color:var(--dim);margin-top:6px}#ecoCab .cb-hr .wd{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:14px}#ecoCab .cb-hr .wd div{border-radius:10px;padding:8px 4px;text-align:center;font-size:12px;color:var(--mut);background:rgba(195,139,255,var(--a,.06))}#ecoCab .cb-hr .wd b{display:block;font-size:15px;color:#fff;font-variant-numeric:tabular-nums}'
    + '#ecoCab .cb-st{display:none;margin-top:24px}#ecoCab.cb-stm .cb-st{display:block}#ecoCab.cb-stm .cb-grid{display:none}#ecoCab .cb-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px}#ecoCab .cb-tiles>div{padding:16px;border-radius:18px;background:var(--s1);border:1px solid var(--line);min-width:0}#ecoCab .cb-tiles b{display:block;font-size:26px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ecoCab .cb-tiles span{display:block;font-size:13px;color:var(--mut);margin-top:2px}@media(max-width:900px){#ecoCab .cb-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}#ecoCab .cb-tiles b{font-size:21px;white-space:normal}}'
    + '#ecoCab .cb-two.one{grid-template-columns:1fr}#ecoCab .cb-top>div:first-child{flex:1 1 260px}#ecoCab .cb-acts{flex:none}#ecoCab .cb-done{display:grid;gap:10px;justify-items:center;text-align:center;padding:56px 24px}#ecoCab .cb-done b{font-size:24px;font-weight:600;color:#fff}#ecoCab .cb-done span{max-width:460px}'
    + '@media(max-width:900px){#ecoCab .cb-grid{grid-template-columns:1fr}#ecoCab .cb-q{position:static;max-height:none}#ecoCab .cb-two{grid-template-columns:1fr}}'
    + '@media(max-width:767px){#ecoCab .cb-d{padding:18px}#ecoCab .cb-go{flex-direction:column-reverse}#ecoCab .cb-files{grid-template-columns:repeat(2,1fr)}#ecoCab .ec-seg{width:100%}}';
  (document.head || R).appendChild(css);
  var TAB = 'q', Q = [], CUR = null, MY = null, ROLE = '', ME = null, box;
  var FILT = { q: 'unanswered', rw: 'declined', ok: 'accepted' };
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : '' }
  /* QA раунд 3 (Н2): то же правило, что hwName в server/worker.js (/cur/hwlog) */
  function hwName(v) { var t = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    for (var i = 0; i < 4; i++) { var p = t; t = t.replace(/^(?:ДЗ|Д\/З|Домашн(?:ее|яя)\s+(?:задание|работа)|Домашка)(?:\s*№\s*\d+)?(?=$|[\s·:.,\-—–|«"“„(])\s*[·:.,\-—–|]*\s*/i, '').trim();
      var m = t.match(/^[«"“„]([^«»"“”„]*)[»"”“]$/); if (m) t = m[1].trim(); if (t === p) break } return t }
  /* QA раунд 3 (Н3): служебные тренинги («Архив уроков (служебное, ученики не видят)» и т.п.) — не в очереди и не в счётчике */
  var SVC = /служебн|ученики не видят|не для учеников|архив уроков/i;
  function lname(it) { return it.lesson || 'Домашнее задание' }
  /* разбор одной карточки ответа ленты GetCourse */
  function parse(a) { var m = a.querySelector('.answer-main-content .main') || a, st = (a.className.match(/\bstatus-(\w+)/) || [])[1] || '', dt = a.querySelector('.answer-date a'), ts = dt && (dt.getAttribute('title') || '').match(/(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/);
    var link = a.querySelector('.show-lesson-link'), tr = link && link.querySelector('.text-muted'), lessonT = link ? txt(link).replace(txt(tr), '').trim() : '';
    var add = [].map.call(m.querySelectorAll('.addfield'), function (f) { return { l: txt(f.querySelector('label')), v: txt(f.querySelector('.value')) } });
    var lv = []; add.forEach(function (f) { var t = f.l + ' ' + f.v; if (!/(^|\s)(да|1|✓)(\s|$)/i.test(f.v)) return; if (/МАКСИМАЛЬН/i.test(t)) lv.push('max'); else if (/СРЕДН/i.test(t)) lv.push('mid'); else if (/Л[её]гк|сохранил/i.test(t)) lv.push('easy') });
    var files = [].map.call(m.querySelectorAll('.answer-files a[href]'), function (x) { var im = x.querySelector('img'); return im ? { img: im.getAttribute('data-editor-link') || im.getAttribute('src'), big: x.getAttribute('href'), dl: im.getAttribute('data-download-link') } : { name: txt(x) || 'файл', big: x.getAttribute('href') } });
    var cf = a.querySelector('[id^="commentReplyForm-"] form'), fields = [];
    if (cf) [].forEach.call(cf.querySelectorAll('input[name],textarea[name],select[name]'), function (i) { if (i.name && !/comment_text/.test(i.name) && !(i.type === 'checkbox' && !i.checked) && i.type !== 'file') fields.push([i.name, i.value]) });
    var cms = [].map.call(a.querySelectorAll('.comment'), function (c) { return { who: txt(c.querySelector('.user-name, .comment-user-name, .author-name, a.user-profile-link')), t: txt(c.querySelector('.comment-text, .text, .emoji-text')) } }).filter(function (c) { return c.t }).slice(-4);
    var at = ts ? Date.UTC(+ts[1], ts[2] - 1, +ts[3], ts[4] - 3, +ts[5]) : 0; /* время GetCourse — МСК */
    /* у многих ДЗ урок называется просто «Домашнее задание» — тогда название берём из части/модуля («Композиция»).
       QA раунд 3 (Н2): в lesson — чистое название без «ДЗ · », «ДЗ:», «Домашнее задание», кавычек: бот сам пишет «ДЗ «…»» */
    var trn = txt(tr).replace(/\.\s*$/, ''), ttl = lessonT || a.getAttribute('data-lesson-name') || '', nm = hwName(ttl), mod = false;
    if ((!nm || /^\d{1,2}$/.test(nm)) && trn) { nm = hwName(trn.split('. ').pop()); mod = true }
    return { id: +a.getAttribute('data-id'), uid: +a.getAttribute('data-user-id'), lid: +a.getAttribute('data-lesson-id'), lname: a.getAttribute('data-lesson-name') || '', lesson: nm, mod: mod, training: trn, svc: SVC.test(trn + ' ' + ttl),
      name: txt(a.querySelector('.user-profile-link .text')) || 'Ученик', st: st, at: at, text: txt(m.querySelector('.answer-text')) ? (m.querySelector('.answer-text').innerText || m.querySelector('.answer-text').textContent).trim() : '', add: add, lv: lv, files: files, cf: cf ? fields : null, canReview: !!a.querySelector('form.lesson-answer-form [name=answer_id]'), cms: cms, again: /повтор|again/i.test(txt(a.querySelector('.answer-status'))) } }
  /* 30.10 (после QA №8): очередь — сначала свежие ДЗ (сданы за последние 14 дней), старые сверху (красное — больше 48 ч); счётчик «Очередь N» — только они.
     Работы старше 14 дней — свёрнутой группой «Давно ждут»; анкеты, «Вводный урок», «ознакомлен(а)», новые комментарии к уже принятым ответам и ответы без уровня и файлов —
     свёрнутой группой «Анкеты и ответы без уровня» (у них нет уровней и баллов). Лента грузится от новых к старым и показывается сразу после первой страницы, остальное догружается. */
  var OLD = 14 * 864e5, QN = null, GOPEN = {}, LID = 0, LOADING = false;
  function kindOf(x) { var t = x.lesson + ' ' + x.lname + ' ' + x.add.map(function (f) { return f.l }).join(' ');
    if (/анкет|вводн|ознаком/i.test(t) || x.st === 'accepted') return 'oth';
    if (x.lv.length || x.files.length || x.add.some(function (f) { return /уров|л[её]гк|средн|максим/i.test(f.l) })) return x.at && Date.now() - x.at > OLD ? 'old' : 'hw';
    return 'oth' }
  function feed(st, cb) { var out = [], seen = {}, url = FEED + '?filter%5Bstatus%5D=' + st + '&filter%5Banswer_type%5D=mission_answer&filter%5Blearner_type%5D=all&filter%5Bsorting%5D=need_teacher_reaction_at%20DESC';
    var page = function (p) { return fetch(url + '&page=' + p, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { if (!r.ok) throw r.status; return r.text() }).then(function (h) { var d = new DOMParser().parseFromString(h, 'text/html'), n = 0;
      if (!d.querySelector('.answers-list, .answers-page-filter')) throw 'noaccess';
      [].forEach.call(d.querySelectorAll('.user-answer[data-id]'), function (a) { var id = a.getAttribute('data-id'); if (seen[id]) return; seen[id] = 1; n++; try { out.push(parse(a)) } catch (e) {} });
      var more = n && p < (st === 'unanswered' ? 12 : 2); if (n && !more) out.capped = true; if (cb) cb(out, !more); return more ? page(p + 1) : out }) };
    return page(1) }
  function mine(L) { L = L.filter(function (x) { return !x.svc }); return MY && ROLE !== 'admin' ? L.filter(function (x) { return MY[x.uid] }) : L }
  function pts(lv) { var k = lv.indexOf('max') >= 0 ? 2 : lv.indexOf('mid') >= 0 ? 1 : 0; return LV[k][2] }
  function wait(it) { if (!it.at) return ''; var h = (Date.now() - it.at) / 36e5; return '<span class="w ' + (h > 48 ? 'r' : h > 24 ? 'a' : 'dim') + '">ждёт ' + K.ago(it.at) + '</span>' }
  function row(x) { return '<button type="button" data-id="' + x.id + '" class="' + (CUR && CUR.id === x.id ? 'on' : '') + '"><div class="tp"><b>' + esc(x.name) + '</b>' + (TAB === 'q' ? wait(x) : '') + '</div><small>' + esc(lname(x)) + (x.files.length ? ' · ' + x.files.length + ' ' + K.plr(x.files.length, 'файл', 'файла', 'файлов') : '') + (x.st === 'accepted' && TAB === 'q' ? ' · новый комментарий' : '') + (ROLE === 'admin' && MY && MY[x.uid] && MY[x.uid].cur ? ' · ' + esc(MY[x.uid].cur.split(' ')[0]) : '') + '</small></button>' }
  function list() { var q = box.querySelector('.cb-q');
    if (TAB !== 'q') { q.innerHTML = Q.length ? Q.map(row).join('') : '<div class="ec-empty">' + (LOADING ? 'Загружаем…' : TAB === 'rw' ? 'Здесь будут работы, которые ты вернул на доработку, пока ученик не пришлёт новую версию.' : 'Здесь будут работы, которые ты принял.') + '</div>'; return }
    var G = { hw: [], old: [], oth: [] }; Q.forEach(function (x) { G[x.k].push(x) });
    var grp = function (k, t, note) { return G[k].length ? '<details class="cb-g" data-g="' + k + '"' + (GOPEN[k] ? ' open' : '') + '><summary><span>' + t + '</span><span class="dim">' + G[k].length + '</span></summary><div class="ec-note" style="padding:0 14px 8px">' + note + '</div>' + G[k].map(row).join('') + '</details>' : '' };
    q.innerHTML = (G.hw.length ? G.hw.map(row).join('') + '<div class="ec-note" style="padding:6px 14px 10px">Сначала самые старые. Красное — больше 48 часов</div>' : '<div class="ec-empty">' + (LOADING ? 'Загружаем работы из GetCourse…' : 'Свежих работ нет. Все ДЗ проверены!') + '</div>')
      + grp('old', 'Давно ждут', 'Сданы больше 14 дней назад — чаще всего прошлые потоки') + grp('oth', 'Анкеты и ответы без уровня', 'Без уровней и баллов: анкеты, «Вводный урок», новые комментарии к принятым');
    [].forEach.call(q.querySelectorAll('details.cb-g'), function (g) { g.addEventListener('toggle', function () { GOPEN[g.getAttribute('data-g')] = g.open }) }) }
  function first() { return TAB === 'q' ? Q.filter(function (x) { return x.k === 'hw' })[0] || null : Q[0] || null }
  function detail(it) { CUR = it; var d = box.querySelector('.cb-d'); [].forEach.call(box.querySelectorAll('.cb-q button'), function (b) { b.classList.toggle('on', +b.getAttribute('data-id') === (it && it.id)) });
    if (!it) { var hasHw = TAB !== 'q' ? Q.length : Q.some(function (x) { return x.k === 'hw' });
      d.innerHTML = hasHw ? '<div class="ec-empty">' + (innerWidth <= 900 ? 'Выбери работу выше' : 'Выбери работу слева') + '</div>' : LOADING ? '<div class="ec-empty">Загружаем…</div>'
        : TAB === 'q' ? '<div class="ec-empty cb-done"><b>Все ДЗ проверены</b><span>Новые работы появятся здесь сразу после сдачи.' + (Q.length ? ' Слева — давно ждущие работы и анкеты, если хочешь разобрать и их.' : '') + ' А пока можно ответить ученикам в <a href="/teach/control/stream?fs=chat" style="color:#d6c2ff">сообщениях</a>.</span></div>'
        : '<div class="ec-empty">' + (TAB === 'rw' ? 'На доработке сейчас никого нет.' : 'Принятых работ пока нет.') + '</div>'; return }
    var nl = it.k === 'oth'; /* анкета, вводный урок, комментарий — без уровня и баллов */
    var p0 = pts(it.lv), gc = '/teach/control/lesson/view/id/' + it.lid + '?showAnswer=' + it.id + '#answer' + it.id, ro = TAB !== 'q';
    var h = '<div class="cb-top"><div style="min-width:0"><div class="ec-k2">' + esc(lname(it)) + (it.training && !it.mod ? ' · ' + esc(it.training) : '') + '</div><div class="cb-nm">' + esc(it.name) + '</div></div><div class="cb-acts"><a class="ec-btn2 sm" target="_blank" rel="noopener" href="' + esc(gc) + '">Открыть в GetCourse</a><a class="ec-btn2 sm" href="/teach/control/stream?fs=chat&u=' + it.uid + '">Чат</a></div></div>';
    var im = it.files.filter(function (f) { return f.img }), dc = it.files.filter(function (f) { return !f.img });
    if (it.files.length) h += '<div class="cb-files">' + im.map(function (f) { return '<a href="' + esc(f.big) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(f.img) + '" alt="Файл работы"></a>' }).join('') + dc.map(function (f) { return '<a class="doc" href="' + esc(f.big) + '" target="_blank" rel="noopener">📎 ' + esc(f.name) + '</a>' }).join('') + '</div>';
    h += '<div class="cb-ans"><div class="ec-k2">Ответ ученика</div>' + (it.text ? '<div class="tx">' + esc(it.text) + '</div>' : '') + it.add.map(function (f) { return '<div class="af"><span style="flex:1">' + esc(f.l) + '</span><b>' + esc(f.v || '—') + '</b></div>' }).join('') + (!it.text && !it.add.length ? '<div class="tx dim">Только файлы</div>' : '') + '</div>';
    if (it.cms.length) h += '<div class="cb-cm">' + it.cms.map(function (c) { return '<div><small>' + esc(c.who || 'Комментарий') + '</small>' + esc(c.t) + '</div>' }).join('') + '</div>';
    if (ro) { h += '<div class="cb-msg dim">' + (TAB === 'rw' ? 'Вернул на доработку. Когда ученик пришлёт новую версию, работа снова появится в очереди.' : 'Работа принята.') + '</div>'; d.innerHTML = h; return }
    h += '<div class="cb-two' + (nl ? ' one' : '') + '">' + (nl ? '' : '<div><div class="ec-k2">Уровень, который выбрал ученик</div><div class="cb-row" data-k="lv">' + LV.map(function (l) { return '<button type="button" class="ec-chip' + (l[2] === p0 && it.lv.length ? ' on' : '') + '" data-p="' + l[2] + '">' + l[1] + ' ' + l[2] + '</button>' }).join('') + '</div>'
      + '<div class="ec-k2" style="margin-top:14px">Баллы</div><div class="cb-row"><button type="button" class="ec-chip" data-d="-5" aria-label="Меньше баллов">−</button><b class="cb-pts">' + p0 + '</b><button type="button" class="ec-chip" data-d="5" aria-label="Больше баллов">+</button><span class="dim" style="font-size:13px">из ' + HW_MAX + '</span></div></div>')
      + '<div><div class="ec-k2">Комментарий</div><textarea class="cb-t" style="margin-top:8px" placeholder="Что получилось и что можно сделать лучше"></textarea><div class="cb-row"><button type="button" class="ec-chip" data-q="Отлично получилось! ">Отлично получилось</button><button type="button" class="ec-chip" data-q="Хорошая работа. Чтобы было ещё лучше: ">Можно лучше</button></div></div></div>'
      + '<div class="cb-rw"><div class="ec-k2">Что доработать</div><ol><li><input type="text" placeholder="Замечание 1"></li><li><input type="text" placeholder="Замечание 2"></li></ol><button type="button" class="ec-chip" data-a="addrw" style="margin-top:8px">+ ещё замечание</button><div class="due"><span class="mut" style="font-size:14px">Срок доработки</span><input type="date" class="cb-due"></div></div>'
      + '<div class="cb-go"><button type="button" class="ec-btn" data-a="ok"' + (it.canReview ? '' : ' disabled') + '>' + (nl ? '✓ Принять' : '<span>✓ Принять · <span class="cb-p2">' + p0 + '</span> ' + K.plr(p0, 'балл', 'балла', 'баллов') + '</span>') + '</button><button type="button" class="ec-btn2" data-a="rw"' + (it.canReview ? '' : ' disabled') + '>Вернуть на доработку</button></div>'
      + (it.canReview ? '<div class="cb-bot"><div class="ec-k2">Ученик получит в Telegram-боте</div><div class="cb-bt"></div><div class="cb-bn dim">Если ученик подключил бот. К баллам бот добавит место в рейтинге.</div></div><div class="cb-msg dim"></div>'
        : '<div class="cb-msg r">У твоего входа нет прав принимать ответы в GetCourse. Открой работу в GetCourse или попроси Романа дать права (инструкция у него).</div>');
    d.innerHTML = h; botPrev(); var due = d.querySelector('.cb-due'), dd = new Date(Date.now() + 3 * 864e5 + 3 * 36e5); due.value = dd.toISOString().slice(0, 10); due.min = new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
    if (innerWidth <= 900) d.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  /* QA раунд 3 (Н2): «что получит ученик» — тот же текст, что соберёт сервер в /cur/hwlog (без места в рейтинге: его знает только сервер) */
  function who() { return ME && ME.who || (ROLE === 'admin' ? 'Роман' : ME && ME.name && ME.name !== 'Все кураторы' ? ME.name.split(' ')[0] : 'Куратор') }
  function fem(n) { var f = String(n).trim().split(' ')[0]; return /[аяь]$/i.test(f) && !/^(никита|илья|кузьма|фома|лёва|саша|женя|валера)$/i.test(f) ? 'а' : '' }
  function form(d) { var rw = d.querySelector('.cb-rw'), on = !!(rw && rw.classList.contains('on')), cm = (d.querySelector('.cb-t') || {}).value || '', pe = d.querySelector('.cb-pts');
    var items = on ? [].map.call(rw.querySelectorAll('li input'), function (i) { return i.value.trim() }).filter(Boolean) : [], due = on ? rw.querySelector('.cb-due').value : '';
    var dueT = due ? new Date(due + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : '';
    cm = cm.trim(); var text = on ? [cm, items.length ? 'Что доработать:\n' + items.map(function (x, i) { return (i + 1) + '. ' + x }).join('\n') : '', dueT ? 'Срок: до ' + dueT : ''].filter(Boolean).join('\n\n') : cm;
    return { kind: on ? 'rw' : 'ok', p: pe ? +pe.textContent : 0, cm: cm, items: items, due: due, dueT: dueT, text: text } }
  function botText(it, f) { var w = who(), L = it.lesson ? ' «' + it.lesson + '»' : '';
    if (f.kind === 'ok') return '✅ ДЗ' + L + ' принято\n' + (f.p ? '+' + f.p + ' ' + K.plr(f.p, 'балл', 'балла', 'баллов') : 'Проверил' + fem(w) + ' ' + w) + (f.text ? '\n\n«' + f.text + '» — ' + w : '');
    var notes = (f.items.length ? f.items : f.text.split(/\n+/)).map(function (x) { return x.trim().slice(0, 300) }).filter(Boolean).slice(0, 10);
    return '✏️ ДЗ' + L + ' — нужно доработать\n' + (notes.length ? notes.map(function (x, i) { return (i + 1) + '. ' + x }).join('\n') : 'Посмотри замечания ' + w + ' на странице урока.') + (f.dueT ? '\n\nПересдай до ' + f.dueT + ', чтобы не потерять ×2' : '') }
  function botPrev() { var d = box && box.querySelector('.cb-d'), t = d && d.querySelector('.cb-bt'); if (!t || !CUR) return; t.textContent = botText(CUR, form(d)) }
  function setPts(d, v) { setTimeout(botPrev); v = Math.max(0, Math.min(HW_MAX, v)); d.querySelector('.cb-pts').textContent = v; d.querySelector('.cb-p2').textContent = v; d.querySelector('.cb-p2').nextSibling.textContent = ' ' + K.plr(v, 'балл', 'балла', 'баллов') }
  function post(url, body) { return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' }, body: body.toString() })
    .then(function (r) { return r.text().then(function (t) { var j = null; try { j = JSON.parse(t) } catch (e) {} return { ok: r.ok, j: j } }) }) }
  /* ответ в GetCourse: комментарий (если есть) → статус. Порядок как у кнопок GetCourse */
  function gcSave(it, action, text) { var step1 = Promise.resolve();
    if (text) { if (!it.cf) return Promise.reject('Нет формы комментария у этого ответа'); var b = new URLSearchParams(); it.cf.forEach(function (f) { b.append(f[0], f[1]) }); b.set('GetCourseComment[comment_text]', text);
      step1 = post('/cms/comment/add', b).then(function (x) { if (!x.j || !x.j.success) throw (x.j && x.j.message) || 'GetCourse не сохранил комментарий' }) }
    return step1.then(function () { var b = new URLSearchParams(); b.append('answer_id', it.id); b.append('action', action); b.append('action', action);
      return post(FEED, b) }).then(function (x) { if (!x.ok || !x.j) throw 'GetCourse не принял статус ответа';
      if (x.j.showAnswer && x.j.answerHtml) { var s = (String(x.j.answerHtml).match(/\bstatus-(\w+)/) || [])[1]; if (s && s !== (action === 'accept' ? 'accepted' : 'declined')) throw 'GetCourse оставил статус «' + s + '»' } return x.j }) }
  function act(kind) { var it = CUR, d = box.querySelector('.cb-d'); if (!it) return; var rw = d.querySelector('.cb-rw'), msg = d.querySelector('.cb-msg');
    if (kind === 'rw' && !rw.classList.contains('on')) { rw.classList.add('on'); rw.querySelector('input').focus(); d.querySelector('[data-a=rw]').textContent = 'Отправить на доработку'; botPrev(); return }
    var cm = d.querySelector('.cb-t').value.trim(), pe = d.querySelector('.cb-pts'), p = pe ? +pe.textContent : 0, items = [], due = '';
    if (kind === 'rw') { items = [].map.call(rw.querySelectorAll('li input'), function (i) { return i.value.trim() }).filter(Boolean); due = rw.querySelector('.cb-due').value;
      if (!items.length && !cm) { msg.className = 'cb-msg r'; msg.textContent = 'Напиши хотя бы одно замечание — ученику нужно понять, что исправить.'; return } }
    var dueT = due ? new Date(due + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : '';
    var text = kind === 'rw' ? [cm, items.length ? 'Что доработать:\n' + items.map(function (x, i) { return (i + 1) + '. ' + x }).join('\n') : '', dueT ? 'Срок: до ' + dueT : ''].filter(Boolean).join('\n\n') : cm;
    [].forEach.call(d.querySelectorAll('.cb-go button'), function (b) { b.disabled = true }); msg.className = 'cb-msg dim'; msg.textContent = 'Сохраняем в GetCourse…';
    gcSave(it, kind === 'ok' ? 'accept' : 'decline', text).then(function () {
      K.api('staff', '/cur/hwlog', { answer_id: it.id, uid: it.uid, lesson_id: it.lid, lesson: it.lesson, status: kind === 'ok' ? 'accept' : 'rework', pts: kind === 'ok' ? p : 0, comment: text, notes: items, due: due || null, sent_at: it.at || null }).catch(function () {});
      Q = Q.filter(function (x) { return x.id !== it.id }); counts(); list(); detail(first()); qPush();
      var ok = document.createElement('div'); ok.className = 'cb-msg g'; ok.textContent = (kind === 'ok' ? 'Принято: ' : 'Вернул на доработку: ') + it.name + ', «' + lname(it) + '».'; box.querySelector('.cb-d').insertBefore(ok, box.querySelector('.cb-d').firstChild); setTimeout(function () { ok.remove() }, 6000) })
      .catch(function (e) { [].forEach.call(d.querySelectorAll('.cb-go button'), function (b) { b.disabled = false }); msg.className = 'cb-msg r';
        msg.innerHTML = esc(typeof e === 'string' ? e : 'Не получилось сохранить') + '. Ответ не потерян: <a href="/teach/control/lesson/view/id/' + it.lid + '?showAnswer=' + it.id + '#answer' + it.id + '" target="_blank" rel="noopener" style="color:#fff">открой работу в GetCourse</a> и ответь там.' }) }
  /* 30.10 (QA №13, раунд 2): очередь ДЗ — на сервер (POST /cur/queue {n, old48, oldest}; у Романа ещё by:{<cid>|none:{…}} — куратор ученика из /bank/staff/list),
     чтобы пульт, кабинет и приложение показывали «ДЗ на проверке». Считаем только свежие (правило 14 дней, как «Очередь N»). Шлём после полной загрузки ленты
     и после «Принять/Вернуть», не чаще раза в минуту (вкладка помнит время в sessionStorage): если рано — одна отложенная отправка с последним числом. */
  var QSENT = 0, QTM = 0;
  function qStat(L) { var now = Date.now(), o = { n: L.length, old48: 0, oldest: null }; L.forEach(function (x) { if (!x.at) return; if (now - x.at > 48 * 36e5) o.old48++; if (o.oldest == null || x.at < o.oldest) o.oldest = x.at }); return o }
  function qPush() { if (TAB !== 'q' || LOADING || (ROLE !== 'curator' && ROLE !== 'admin')) return;
    var last = Math.max(QSENT, +K.ss('ecoQS:' + U) || 0), wait = last + 60e3 - Date.now(); clearTimeout(QTM);
    if (wait > 0) { QTM = setTimeout(qPush, wait + 50); return }
    var H = Q.filter(function (x) { return x.k === 'hw' }), body = qStat(H);
    if (ROLE === 'admin') { var G = {}; H.forEach(function (x) { var c = MY && MY[x.uid] && MY[x.uid].cid || 'none'; (G[c] = G[c] || []).push(x) }); body.by = {}; Object.keys(G).forEach(function (c) { body.by[c] = qStat(G[c]) }) }
    QSENT = Date.now(); K.ss('ecoQS:' + U, String(QSENT)); K.api('staff', '/cur/queue', body).catch(function () {}) }
  /* 30.10 (после QA №19): счётчик очереди не пропадает при переключении вкладок; «Проверено» — сколько проверено за 30 дней (/cur/me) */
  function counts() { if (TAB === 'q') QN = Q.filter(function (x) { return x.k === 'hw' }).length; var s = box.querySelector('.ec-seg [data-t=q]'); if (s) s.textContent = 'Очередь' + (QN != null ? ' ' + QN : '');
    /* QA раунд 3 (№24): у Романа /cur/me считает только проверки через кабинет (пока 0) — тогда число принятых работ из ленты GetCourse (то же, что на вкладке) */
    var o = box.querySelector('.ec-seg [data-t=ok]'), nk = ME && ME.hw ? ME.hw : OKN; if (o) { o.textContent = 'Проверено' + (nk != null ? ' ' + nk + (!(ME && ME.hw) && OKM ? '+' : '') : ''); o.title = ME && ME.hw ? 'За 30 дней в кабинете' : 'Принятые работы в GetCourse' } }
  /* QA раунд 3: очередь ДЗ для «Сообщений» (вкладка «ДЗ» и карточка ученика) и все сданные работы для графика «Когда сдают ДЗ» */
  var OKN = null, OKM = false, ALLQ = [], OKL = [], AID = +((location.search.match(/[?&]a=(\d+)/) || [])[1] || 0);
  function hwCache() { try { K.ss('ecoHWQ:' + U, JSON.stringify({ at: Date.now(), L: Q.filter(function (x) { return x.k === 'hw' }).map(function (x) { return { id: x.id, uid: x.uid, name: x.name, lesson: lname(x), lid: x.lid, at: x.at } }) })) } catch (e) {} }
  function okPrefetch() { if (OKN != null || (ME && ME.hw)) return; feed('accepted').then(function (L0) { var L = mine(L0); L.capped = L0.capped; OKL = L; OKN = L.length; OKM = !!L.capped; counts() }).catch(function () {}) }
  function load() { var id = ++LID, q = box.querySelector('.cb-q'); LOADING = true; Q = []; CUR = null; q.innerHTML = '<div class="ec-empty">Загружаем работы из GetCourse…</div>'; box.querySelector('.cb-d').innerHTML = '<div class="ec-empty">Загружаем…</div>';
    feed(FILT[TAB], function (L, done) { if (id !== LID) return; LOADING = !done; Q = mine(L).map(function (x) { x.k = TAB === 'q' ? kindOf(x) : 'hw'; return x });
      if (TAB === 'q') { Q.sort(function (a, b) { return (a.at || 0) - (b.at || 0) }); ALLQ = Q.slice() } else if (TAB === 'ok') { OKL = Q.slice(); if (done && !(ME && ME.hw)) { OKN = Q.length; OKM = !!L.capped } }
      counts(); list(); if (done) { qPush(); if (TAB === 'q') { hwCache(); setTimeout(okPrefetch, 400) } }
      /* ?fs=cur&a=<id> — из «Сообщений»: сразу эта работа (группа раскрывается) */
      if (AID && TAB === 'q') { var ai = Q.filter(function (x) { return x.id === AID })[0]; if (ai) { AID = 0; if (ai.k !== 'hw') { GOPEN[ai.k] = 1; list() } detail(ai); var bb = box.querySelector('.cb-q button[data-id="' + ai.id + '"]'); if (bb && innerWidth > 900) bb.scrollIntoView({ block: 'nearest' }); return } else if (done) AID = 0 }
      if (!CUR) { var f = first(); if (f || done) detail(innerWidth > 900 ? f : null) } })
      .catch(function (e) { if (id !== LID) return; LOADING = false; q.innerHTML = '<div class="ec-empty">' + (e === 'noaccess' || e === 403 ? 'GetCourse не показывает этому входу ленту ответов. Нужны права куратора — Роман знает, где их включить.' : 'Не получилось загрузить работы. Обнови страницу.') + '</div>' }) }
  /* 30.10 (макет 7.2, QA №31 — частично): вкладка «Статистика» — проверено ДЗ за 7/30 дней, принято/на доработку, медиана проверки (/cur/hwstat),
     ответ в чате, оценка учеников и число учеников (/cur/me). Графиков «по дням» и «когда пишут» нет: сервер пока не отдаёт данные по дням. */
  var SD = 30;
  /* QA раунд 3 (№31, макет 7.2 «Когда пишут»): когда ученики сдают ДЗ — по времени сдачи в ленте GetCourse (ждут проверки + принятые), МСК, по часам и дням недели.
     «Время ответа по дням» — нет: сервер отдаёт только итог за период (/cur/hwstat). */
  function hours() { var seen = {}, A = ALLQ.concat(OKL).filter(function (x) { if (!x.at || seen[x.id]) return false; seen[x.id] = 1; return true });
    if (A.length < 5) return '<div class="cb-hr"><div class="ec-k2">Когда сдают ДЗ</div><p class="ec-note" style="margin-top:6px">' + (LOADING ? 'Собираем работы из ленты GetCourse…' : 'Мало работ в ленте, чтобы показать, когда сдают.') + '</p></div>';
    var H = [], W = [0, 0, 0, 0, 0, 0, 0]; for (var i = 0; i < 24; i++) H.push(0);
    A.forEach(function (x) { var d = new Date(x.at + 3 * 36e5); H[d.getUTCHours()]++; W[(d.getUTCDay() + 6) % 7]++ });
    var mx = Math.max.apply(null, H), mw = Math.max.apply(null, W), best = 0, bi = 0; for (i = 0; i < 24; i++) { var t = H[i] + H[(i + 1) % 24]; if (t > best) { best = t; bi = i } }
    return '<div class="cb-hr"><div class="ec-k2">Когда сдают ДЗ · ' + A.length + ' ' + K.plr(A.length, 'работа', 'работы', 'работ') + '</div><div class="ec-note" style="margin-top:4px">Чаще всего с ' + bi + ':00 до ' + ((bi + 2) % 24) + ':00 МСК — в это время полезно быть на связи</div>'
      + '<div class="bars" role="img" aria-label="Сданные работы по часам, МСК">' + H.map(function (v, h) { return '<i class="' + (h === bi || h === (bi + 1) % 24 ? 'pk' : '') + '" style="height:' + Math.max(2, Math.round(v / (mx || 1) * 96)) + 'px" title="' + h + ':00–' + (h + 1) + ':00 МСК · ' + v + '"></i>' }).join('') + '</div>'
      + '<div class="ax"><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span></div>'
      + '<div class="wd">' + ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map(function (n, k) { return '<div style="--a:' + (0.06 + 0.34 * W[k] / (mw || 1)).toFixed(2) + '"><b>' + W[k] + '</b>' + n + '</div>' }).join('') + '</div>'
      + '<p class="ec-note" style="margin-top:10px">По времени сдачи в ленте GetCourse: работы на проверке и последние принятые.</p></div>' }
  function stats() { var st = box.querySelector('.cb-st'); if (!st) { st = document.createElement('div'); st.className = 'cb-st'; box.appendChild(st) } st.innerHTML = '<div class="ec-c"><div class="ec-empty">Загружаем…</div></div>';
    K.api('staff', '/cur/hwstat?days=' + SD).then(function (h) { if (TAB !== 'st') return; h = h && h.ok !== false ? h : {}; var m = ME || {}, num = function (v) { return v == null || v === '' ? '—' : v };
      var mins = function (v) { if (v == null) return '—'; v = Math.round(v); return v < 60 ? v + ' мин' : Math.floor(v / 60) + ' ч' + (v % 60 ? ' ' + v % 60 + ' мин' : '') };
      var T = [[num(h.checked), 'проверено ДЗ'], [num(h.accept), 'принято'], [num(h.rework), 'вернул на доработку'], [mins(h.median_min), 'медиана проверки'], [mins(m.avg_reply_min), 'ответ в чате (медиана)'], [m.stars ? String((+m.stars).toFixed(1)).replace('.', ',') + (m.stars_n ? ' · ' + m.stars_n : '') : '—', 'оценка учеников' + (m.stars_n ? ' · отзывов' : '')], [num(m.students), K.plr(+m.students || 0, 'ученик', 'ученика', 'учеников')], [QN != null ? QN : '—', 'в очереди сейчас']];
      st.innerHTML = '<div class="ec-c"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><h3>Моя статистика</h3><div class="ec-seg cb-sd"><button type="button" data-sd="7" class="' + (SD === 7 ? 'on' : '') + '">7 дней</button><button type="button" data-sd="30" class="' + (SD === 30 ? 'on' : '') + '">30 дней</button></div></div>'
        + '<div class="cb-tiles">' + T.map(function (x) { return '<div><b>' + K.esc(String(x[0])) + '</b><span>' + K.esc(x[1]) + '</span></div>' }).join('') + '</div>' + hours()
        + '<p class="ec-note" style="margin-top:14px">' + (h.checked == null ? 'Сервер статистики проверок ещё не ответил — цифры появятся после выкладки. ' : '') + 'Статистика школы и продажи здесь не показываются.</p></div>';
      st.querySelector('.cb-sd').onclick = function (e) { var x = e.target.closest('[data-sd]'); if (!x) return; e.stopPropagation(); SD = +x.getAttribute('data-sd'); stats() } }) }
  K.when(function () { box = K.mount('ecoCab', 'eco-cab', 'Проверка ДЗ'); if (!box) { R.classList.remove('eco-cab'); return }
    box.innerHTML = '<div class="ec-hd"><div><h1>Проверка ДЗ</h1><div class="ec-sub" id="ecCbS">Кабинет куратора</div></div><div class="ec-seg"><button type="button" class="on" data-t="q">Очередь</button><button type="button" data-t="rw">Вернул на доработку</button><button type="button" data-t="ok">Проверено</button><button type="button" data-t="st">Статистика</button><a href="/teach/control/stream?fs=chat">Сообщения</a></div></div><div class="cb-grid"><div class="ec-c cb-q"></div><div class="ec-c cb-d"></div></div>';
    box.addEventListener('click', function (e) { var t = e.target.closest('.ec-seg [data-t]'); if (t) { TAB = t.getAttribute('data-t'); [].forEach.call(t.parentNode.children, function (x) { x.classList.toggle('on', x === t) }); box.classList.toggle('cb-stm', TAB === 'st'); if (TAB === 'st') stats(); else load(); return }
      var qb = e.target.closest('.cb-q button[data-id]'); if (qb) { detail(Q.filter(function (x) { return x.id === +qb.getAttribute('data-id') })[0]); return }
      var d = box.querySelector('.cb-d'), a = e.target.closest('[data-a]'), lv = e.target.closest('[data-k=lv] [data-p]'), dl = e.target.closest('[data-d]'), qq = e.target.closest('[data-q]');
      if (lv && d.querySelector('.cb-pts')) { [].forEach.call(lv.parentNode.children, function (x) { x.classList.toggle('on', x === lv) }); setPts(d, +lv.getAttribute('data-p')) }
      if (dl) setPts(d, +d.querySelector('.cb-pts').textContent + +dl.getAttribute('data-d'));
      if (qq) { var ta = d.querySelector('.cb-t'); ta.value = qq.getAttribute('data-q') + ta.value; ta.focus() }
      if (qq) botPrev();
      if (a) { var k = a.getAttribute('data-a'); if (k === 'ok' || k === 'rw') act(k); if (k === 'addrw') { var li = document.createElement('li'); li.innerHTML = '<input type="text" placeholder="Замечание">'; d.querySelector('.cb-rw ol').appendChild(li); li.firstChild.focus() } } });
    box.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('.cb-d') && e.target.matches('.cb-t, .cb-rw input')) botPrev() });
    /* роль и свои ученики — с сервера; ученику страница не нужна */
    K.staff().then(function (s) { ROLE = s && s.role || ''; if (ROLE !== 'curator' && ROLE !== 'admin') {
        if (!K.STAFF[U]) { box.querySelector('.cb-grid').innerHTML = '<div class="ec-c" style="grid-column:1/-1"><div class="ec-empty">Это кабинет куратора. <a href="/teach/control/stream?fs=curator" style="color:#d6c2ff">Мой куратор →</a></div></div>'; return } ROLE = K.STAFF[U] }
      return Promise.all([K.api('staff', '/bank/staff/list'), K.api('staff', '/cur/me')]).then(function (r) { var L = r[0] && r[0].students; ME = r[1] && r[1].ok !== false ? r[1] : null;
        if (L && L.length) { MY = {}; L.forEach(function (x) { MY[x.uid] = { name: x.name, cur: x.curName, cid: x.cur || null } }) }
        var n = MY ? Object.keys(MY).length : ME && ME.students; /* QA раунд 3 (Н2): у Романа «Все кураторы · N учеников», у куратора «Куратор Кирилл · N учеников» (было «Все · 164 ученика») */
        box.querySelector('#ecCbS').textContent = (ROLE === 'admin' ? 'Все кураторы' : ME && ME.name ? 'Куратор ' + ME.name.split(' ')[0] : 'Кабинет куратора') + (n ? ' · ' + n + ' ' + K.plr(n, 'ученик', 'ученика', 'учеников') : '');
        load() }) }) });
})();
