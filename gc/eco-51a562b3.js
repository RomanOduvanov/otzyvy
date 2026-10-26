/* OduvanovSchool · eco.js — новые страницы экосистемы внутри кабинета GetCourse (отдельно от layout.js, чтобы чаты не перетирали друг друга).
   Подключается в шаблоне 101699 отдельной строкой после layout-*.js.
   Сейчас: «Пульт куратора» — /teach/control/stream?fs=pult (для кураторов и Романа это стартовая страница кабинета).
   Пульт — страница gc/pult.html на GitHub Pages (правится без деплоя сервера), данные — API сервера oduvanov-api /app/api/* во фрейме: вход подтверждается через Telegram-бота, данные учеников наружу не отдаются. */
(function () {
  if (window.top !== window || window.__eco) return; window.__eco = 1;
  var API = 'https://oduvanov-api.romanoduvanov52.workers.dev';
  var STAFF = { 504950432: 'Антон', 510261529: 'Кирилл', 499631257: 'Роман' }; /* кураторы и Роман (uid GetCourse) */
  var U = +window.accountUserId || 0, path = location.pathname.replace(/\/+$/, '');
  var isPult = path === '/teach/control/stream' && /[?&]fs=pult\b/.test(location.search);
  if (!STAFF[U]) return;
  var R = document.documentElement;
  /* стартовая страница: первый заход в «Мои тренинги» за сессию → пульт */
  if (path === '/teach/control/stream' && !isPult && !/[?&]fs=/.test(location.search)) {
    var seen = ''; try { seen = sessionStorage.getItem('ecoPultSeen') || '' } catch (e) {}
    if (!seen) { try { sessionStorage.setItem('ecoPultSeen', '1') } catch (e) {} location.replace('/teach/control/stream?fs=pult'); return }
  }
  var css = document.createElement('style');
  css.textContent = '.eco-chip{position:fixed;right:18px;bottom:18px;z-index:9990;display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 18px;border-radius:14px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font:600 14px "Inter Tight",Inter,sans-serif;text-decoration:none!important;box-shadow:0 16px 40px -12px rgba(215,127,255,.6),inset 0 0 0 1px rgba(255,255,255,.6)}'
    + 'html.eco-pult .gc-main-content>*:not(#ecoPult):not(.fs-foot){display:none!important}'
    + '#ecoPult{max-width:1280px;margin:0 auto;padding:8px 24px 0}#ecoPult iframe{display:block;width:100%;border:0;min-height:900px;background:transparent;color-scheme:dark}'
    + '#ecoPult .eco-back{display:inline-flex;margin:8px 0 0;color:#d77fff;font:500 14px "Inter Tight",Inter,sans-serif;text-decoration:none}'
    + '@media (max-width:760px){#ecoPult{padding:4px 12px 0}.eco-chip{right:12px;bottom:12px}}';
  (document.head || R).appendChild(css);
  function chip() { if (R.classList.contains('fs-adm') || isPult || document.querySelector('.eco-chip')) return; var a = document.createElement('a'); a.className = 'eco-chip'; a.href = '/teach/control/stream?fs=pult';
    a.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>' + (U === 499631257 ? 'Кураторы' : 'Пульт куратора'); document.body.appendChild(a) }
  function mount() {
    var mc = document.querySelector('.gc-main-content'); if (!mc) return false; if (document.getElementById('ecoPult')) return true;
    R.classList.add('eco-pult'); document.title = (U === 499631257 ? 'Кураторы' : 'Пульт куратора') + ' · OduvanovSchool';
    var box = document.createElement('div'); box.id = 'ecoPult';
    box.innerHTML = '<a class="eco-back" href="/teach/control/stream">← Мои тренинги</a><iframe title="Пульт куратора" src="https://romanoduvanov.github.io/otzyvy/gc/pult.html?embed=1&v=1&gc=' + U + '" allow="clipboard-write"></iframe>';
    mc.insertBefore(box, mc.firstChild);
    window.addEventListener('message', function (e) { if ((e.origin !== API && e.origin !== 'https://romanoduvanov.github.io') || !e.data || !e.data.ecoH) return; box.querySelector('iframe').style.height = Math.max(600, +e.data.ecoH) + 'px' });
    return true }
  function go() { if (isPult) { if (!mount()) { var n = 0, iv = setInterval(function () { if (mount() || ++n > 40) clearInterval(iv) }, 150) } } else chip() }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

/* «Мой куратор» для учеников: /teach/control/stream?fs=curator + карточка-вход вверху «Моих тренингов» */
(function () {
  if (window.top !== window || window.__ecoCur) return; window.__ecoCur = 1;
  var API = 'https://oduvanov-api.romanoduvanov52.workers.dev', MB = 'https://romanoduvanov.github.io/otzyvy/gc/curators/';
  var U = +window.accountUserId || 0; if (!U) return;
  var path = location.pathname.replace(/\/+$/, ''), isPage = path === '/teach/control/stream' && /[?&]fs=curator\b/.test(location.search), isList = path === '/teach/control/stream' && !/[?&]fs=/.test(location.search);
  if (!isPage && !isList) return;
  var R = document.documentElement;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function hm(sec) { var m = Math.round(sec / 60); if (m < 60) return m + ' мин'; var h = Math.floor(m / 60); return h + ' ч' + (m % 60 ? ' ' + (m % 60) + ' мин' : '') }
  function when(iso) { var d = new Date(iso), n = Math.round((Date.now() - d) / 864e5); var t = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); return n <= 0 ? 'сегодня, ' + t : n === 1 ? 'вчера, ' + t : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) }
  var TG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/></svg>';
  var css = document.createElement('style');
  css.textContent = 'html.eco-cur .gc-main-content>*:not(#ecoCur):not(.fs-foot){display:none!important}'
  + '#ecoCur,.eco-cb{font-family:"Inter Tight",Inter,sans-serif;color:#fff}#ecoCur{max-width:1180px;margin:0 auto;padding:32px 48px 40px;display:flex;flex-direction:column;gap:16px}#ecoCur *{box-sizing:border-box}'
  + '#ecoCur .hd{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:24px 0 28px;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,.08)}#ecoCur h1{margin:0;font-size:56px;line-height:1.04;font-weight:500;letter-spacing:-.03em}#ecoCur .hd p{margin:10px 0 0;font-size:17px;color:rgba(255,255,255,.58)}'
  + '#ecoCur .card{background:#161616;border:1px solid rgba(255,255,255,.07);border-radius:40px;padding:40px;min-width:0}'
  + '#ecoCur .hero{display:flex;flex-wrap:wrap;gap:44px;align-items:center}#ecoCur .ph{position:relative;width:248px;height:248px;flex:none}#ecoCur .ph img{width:248px;height:248px;border-radius:999px;object-fit:cover;display:block}'
  + '#ecoCur .chip{display:inline-flex;align-items:center;gap:6px;font:700 12px/1 "Inter Tight",sans-serif;letter-spacing:.1em;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.78);text-transform:uppercase;white-space:nowrap}#ecoCur .chip.l{background:#c38bff;border-color:#c38bff;color:#1a0b2e}'
  + '#ecoCur .ph .chip{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:rgba(0,1,6,.72);border-color:rgba(255,255,255,.18);color:#fff}#ecoCur .dot{width:8px;height:8px;border-radius:99px;display:inline-block}'
  + '#ecoCur h2{margin:0;font-size:38px;line-height:1.1;font-weight:500;letter-spacing:-.025em}#ecoCur .p{margin:0;font-size:17px;line-height:1.45;color:rgba(255,255,255,.58)}'
  + '#ecoCur .tip{display:flex;gap:14px;align-items:flex-start;padding:18px 20px;border-radius:22px;background:rgba(195,139,255,.08);border:1px solid rgba(195,139,255,.2);font-size:16px;line-height:1.45;color:rgba(255,255,255,.78)}#ecoCur .tip b{color:#fff;font-weight:600}'
  + '#ecoCur .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:56px;padding:0 28px;border-radius:16px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font:600 17px/1 "Inter Tight",sans-serif;text-decoration:none!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),0 16px 48px -12px rgba(252,203,255,.35)}'
  + '#ecoCur .btn2{display:inline-flex;align-items:center;gap:8px;height:56px;padding:0 24px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:#161616;color:#fff!important;font:500 16px/1 "Inter Tight",sans-serif;text-decoration:none!important}'
  + '#ecoCur .kp{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}#ecoCur .k{background:#161616;border:1px solid rgba(255,255,255,.08);border-radius:28px;padding:24px 26px}#ecoCur .k span{display:block;color:rgba(255,255,255,.58);font-size:14px}#ecoCur .k b{display:block;font-size:34px;font-weight:500;letter-spacing:-.02em;margin-top:12px}#ecoCur .k small{color:rgba(255,255,255,.44);font-size:13px}'
  + '#ecoCur .msg{display:flex;gap:16px;padding:20px 0;border-top:1px solid rgba(255,255,255,.07)}#ecoCur .msg:first-of-type{border-top:0}#ecoCur .msg img{width:44px;height:44px;border-radius:99px;object-fit:cover;flex:none}#ecoCur .msg .t{flex:1;min-width:0}#ecoCur .msg .w{font-size:13px;color:rgba(255,255,255,.44)}#ecoCur .msg .w b{color:#fff;font-weight:500;font-size:15px;margin-right:8px}#ecoCur .msg .x{font-size:16px;line-height:1.5;color:rgba(255,255,255,.88);white-space:pre-wrap;margin-top:4px}'
  + '#ecoCur .msg a.l{display:inline-flex;margin-top:10px;height:36px;align-items:center;padding:0 14px;border-radius:12px;background:rgba(195,139,255,.14);color:#e2c9ff!important;font-size:14px;font-weight:500;text-decoration:none!important}'
  + '#ecoCur .warn{display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:20px 24px;border-radius:24px;background:linear-gradient(120deg,#6724ad,#3a1470 60%,#1c0838);box-shadow:inset 0 0 0 1px rgba(252,203,255,.3)}'
  + '.eco-cb{display:flex;align-items:center;gap:16px;margin:0 0 20px;padding:16px 20px;border-radius:24px;background:#161616;border:1px solid rgba(195,139,255,.3);text-decoration:none!important}.eco-cb img{width:52px;height:52px;border-radius:99px;object-fit:cover}.eco-cb b{display:block;font-size:17px;font-weight:500;color:#fff}.eco-cb span{font-size:14px;color:rgba(255,255,255,.58)}.eco-cb i{margin-left:auto;font-style:normal;color:#d77fff;font-weight:600;font-size:15px;white-space:nowrap}.eco-cb.in{margin:24px 0 8px;box-sizing:border-box}'
  + '@media (max-width:760px){#ecoCur{padding:16px 14px 24px}#ecoCur h1{font-size:38px}#ecoCur .card{padding:24px;border-radius:28px}#ecoCur .hero{gap:24px}#ecoCur .ph,#ecoCur .ph img{width:180px;height:180px}#ecoCur h2{font-size:30px}#ecoCur .kp{grid-template-columns:1fr}#ecoCur .btn,#ecoCur .btn2{width:100%}.eco-cb i{display:none}.eco-cb.in{margin:16px 0 8px}}';
  (document.head || R).appendChild(css);
  function data(cb) { var x = new XMLHttpRequest(); x.open('GET', API + '/cur/page?u=' + U); x.onload = function () { try { cb(JSON.parse(x.responseText)) } catch (e) {} }; x.send() }
  function dm(c) { return c.tg ? 'https://t.me/' + encodeURIComponent(c.tg) : '/user/my/profile' }
  function page(d) {
    var mc = document.querySelector('.gc-main-content'); if (!mc || document.getElementById('ecoCur')) return;
    R.classList.add('eco-cur'); document.title = 'Мой куратор · OduvanovSchool';
    var b = document.createElement('div'); b.id = 'ecoCur'; var c = d.cur, h = '';
    h += '<header class="hd"><div><h1>Мой куратор</h1><p>Твой куратор, вопросы и&nbsp;новости от&nbsp;него&nbsp;— в&nbsp;одном месте.</p></div><a class="btn2" href="/teach/control/stream" style="height:44px;font-size:14px">← Мои тренинги</a></header>';
    if (!c) { h += '<section class="card"><h2>Куратор ещё не выбран</h2><p class="p" style="margin:12px 0 24px">Выбери куратора в&nbsp;профиле&nbsp;— он будет проверять домашки, отвечать на&nbsp;вопросы и&nbsp;вести тебя до&nbsp;результата.</p><a class="btn" href="/user/my/profile">Выбрать куратора</a></section>' }
    else {
      var hrs = c.hours ? 'С ' + c.hours[0] + ':00 до ' + c.hours[1] + ':00 МСК' : '';
      h += '<section class="card hero"><div class="ph"><img src="' + MB + esc(c.id) + '.jpg" alt="' + esc(c.full) + '"><span class="chip"><span class="dot" style="background:' + (d.online ? '#4ade80' : '#6b6b6b') + '"></span>' + (d.online ? 'На связи' : 'Сейчас не на связи') + '</span></div>'
        + '<div style="flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:18px"><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip">Твой куратор</span>' + (hrs ? '<span class="chip l">' + hrs + '</span>' : '') + '</div>'
        + '<h2>' + esc(c.full) + '</h2><p class="p">' + esc(c.about || 'Проверяет домашки, отвечает на вопросы и ведёт тебя до результата.') + '</p>'
        + '<div class="tip"><span>Отвечает <b>в&nbsp;течение 1–2 часов</b> в&nbsp;рабочее время. Пиши сразу по&nbsp;делу: урок, что не&nbsp;получается, скрин&nbsp;— так ответ придёт быстрее.</span></div>'
        + '<div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn" target="_blank" rel="noopener" href="' + dm(c) + '">' + TG + 'Написать ' + esc(c.name) + 'у в Telegram</a></div></div></section>';
      if (d.auth && d.tg_ok === false) h += '<div class="warn"><span style="flex:1"><b style="display:block;font-size:19px;font-weight:500">Подключи Telegram</b><span style="color:rgba(255,255,255,.78)">Сюда будут приходить ответы куратора, напоминания об эфирах и x2.</span></span><a class="btn" href="/user/my/profile">Подключить</a></div>';
      h += '<div class="kp"><div class="k"><span>Обычно отвечает за</span><b>' + (d.median != null ? hm(d.median) : '1–2 ч') + '</b><small>медиана за&nbsp;2 недели</small></div><div class="k"><span>Ответов за&nbsp;2 часа</span><b>' + (d.in2h != null ? d.in2h + '%' : '—') + '</b><small>в&nbsp;рабочее время</small></div><div class="k"><span>Ответил ученикам</span><b>' + (d.answered || 0) + '</b><small>за&nbsp;2 недели</small></div></div>';
      var f = d.feed || [];
      h += '<section class="card"><h2 style="font-size:30px;margin-bottom:8px">Сообщения от&nbsp;куратора</h2>' + (f.length ? f.map(function (m) { return '<div class="msg"><img src="' + MB + esc(c.id) + '.jpg" alt=""><div class="t"><div class="w"><b>' + esc(m.who || c.name) + '</b>' + when(m.at) + '</div><div class="x">' + esc(m.text) + '</div>' + (m.link ? '<a class="l" target="_blank" rel="noopener" href="' + esc(m.link) + '">' + esc(m.btn || 'Открыть') + '</a>' : '') + '</div></div>' }).join('') : '<p class="p" style="margin-top:8px">Пока тихо. Когда ' + esc(c.name) + ' напишет всем своим ученикам, сообщение появится здесь и&nbsp;придёт в&nbsp;Telegram.</p>') + '</section>';
    }
    b.innerHTML = h; mc.insertBefore(b, mc.firstChild);
  }
  function banner(d) { var c = d.cur; if (!c || document.querySelector('.eco-cb')) return; var mc = document.querySelector('.gc-main-content'); if (!mc) return;
    var a = document.createElement('a'); a.className = 'eco-cb'; a.href = '/teach/control/stream?fs=curator';
    a.innerHTML = '<img src="' + MB + esc(c.id) + '.jpg" alt=""><span style="flex:1;min-width:0"><b>Мой куратор · ' + esc(c.full) + '</b><span>' + (d.online ? '● На связи' : 'Сейчас не на связи') + (c.hours ? ' · с ' + c.hours[0] + ':00 до ' + c.hours[1] + ':00' : '') + '</span></span><i>Открыть →</i>';
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
  var R = document.documentElement, V = 3;
  var css = document.createElement('style');
  css.textContent = 'html.eco-bank .gc-main-content>*:not(#ecoBank):not(.fs-foot){display:none!important}'
    + '#ecoBank{max-width:820px;margin:0 auto;padding:8px 24px 0}#ecoBank iframe{display:block;width:100%;border:0;min-height:800px;background:transparent;color-scheme:dark}'
    + '#ecoBank h1{margin:16px 16px 0;font:500 48px/1.05 "Inter Tight",Inter,sans-serif;letter-spacing:-.03em;color:#fff}#ecoBank .eco-back{display:inline-flex;margin:8px 16px 0;color:#d77fff;font:500 14px "Inter Tight",Inter,sans-serif;text-decoration:none}'
    + '.eco-bk{display:flex;align-items:center;gap:16px;margin:0 0 20px;padding:16px 20px;border-radius:24px;background:linear-gradient(160deg,rgba(103,36,173,.55),rgba(22,22,22,.9) 70%);border:1px solid rgba(195,139,255,.3);text-decoration:none!important;font-family:"Inter Tight",Inter,sans-serif}'
    + '.eco-bk .ic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;font-size:24px;font-weight:600;flex:none}.eco-bk b{display:block;font-size:17px;font-weight:500;color:#fff}.eco-bk span span{color:rgba(255,255,255,.6);font-size:14px}.eco-bk i{font-style:normal;color:#d77fff;font-weight:500;font-size:14px;white-space:nowrap}'
    + '@media (max-width:760px){#ecoBank{padding:4px 4px 0}#ecoBank h1{font-size:36px}.eco-bk{padding:14px 16px}.eco-bk i{display:none}}';
  (document.head || R).appendChild(css);
  function page() { var mc = document.querySelector('.gc-main-content'); if (!mc) return false; if (document.getElementById('ecoBank')) return true;
    var T = kind === 'orders' ? 'Учёт заказов' : 'Мой банк';
    R.classList.add('eco-bank'); document.title = T + ' · OduvanovSchool';
    var box = document.createElement('div'); box.id = 'ecoBank';
    box.innerHTML = '<a class="eco-back" href="/teach/control/stream">← Мои тренинги</a><h1>' + T + '</h1><iframe title="' + T + '" src="https://romanoduvanov.github.io/otzyvy/gc/bank.html?embed=1&view=' + kind + '&v=' + V + '" allow="clipboard-write"></iframe>';
    mc.insertBefore(box, mc.firstChild);
    window.addEventListener('message', function (e) { if (e.origin !== 'https://romanoduvanov.github.io' || !e.data || !e.data.ecoH) return; box.querySelector('iframe').style.height = Math.max(600, +e.data.ecoH) + 'px' });
    return true }
  function card() { var mc = document.querySelector('.gc-main-content'); if (!mc) return false; if (document.querySelector('.eco-bk')) return true;
    var a = document.createElement('a'); a.className = 'eco-bk'; a.href = '/teach/control/stream?fs=bank';
    a.innerHTML = '<span class="ic">₽</span><span style="flex:1;min-width:0"><b>Мой банк и заказы</b><span>Записывай оплаты от клиентов, веди заказы и получай награды за рубежи</span></span><i>Открыть →</i>';
    var cb = mc.querySelector('.eco-cb'); if (cb) { cb.parentNode.insertBefore(a, cb.nextSibling); return true }
    var xr = mc.querySelector('.page-full-block .container > .xdget-root'); if (xr) { xr.parentNode.insertBefore(a, xr); return true }
    mc.insertBefore(a, mc.firstChild); return true }
  function go() { var n = 0, iv = setInterval(function () { var ok = kind ? page() : (document.querySelector('.eco-cb') || n > 12) && card(); if (ok || ++n > 40) clearInterval(iv) }, 150) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
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
  css.textContent = ':root body .top-menu .burger-icon-wrapper{min-width:44px!important;min-height:44px!important;width:44px;height:44px;border-radius:14px;background:#161616 url("' + BUR + '") center/22px 22px no-repeat!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);cursor:pointer}'
    + ':root body .top-menu .burger-icon-wrapper>svg{display:none!important}'
    + 'html body .fs-ntc .notice-top-panel::before{order:0}html body .fs-ntc .notice-top-panel .redesigned-notice-content{order:1}html body .fs-ntc .notice-top-panel .close-link{order:9;align-self:flex-start}'
    + '@media(max-width:767px){html body .fs-ntc .notice-top-panel .redesigned-notice-content{flex-direction:column!important;align-items:flex-start!important;gap:10px!important}html body .fs-ntc .notice-top-panel .redesigned-notice-text{width:100%}html body .fs-ntc .notice-top-panel .close-link{width:40px!important;height:40px!important}}'
    + '.main-menu .eco-mi .tooltip__dropdown{display:none}.main-menu:not(.main-menu--is-expanded) .eco-mi:hover .tooltip__dropdown{display:block!important}';
  (document.head || R).appendChild(css);
  if (!U) return;
  var cur = location.pathname.replace(/\/+$/, '') === '/teach/control/stream' && (location.search.match(/[?&]fs=(bank|orders)\b/) || [])[1];
  var IT = [['bank', 'Мой банк', '<rect x="10" y="13" width="20" height="15" rx="3.5" stroke="var(--primary-black, #000000)" stroke-width="1.6"/><path d="M10 18h20" stroke="var(--primary-black, #000000)" stroke-width="1.6"/><path d="M23.5 23.5h2.5" stroke="var(--primary-black, #000000)" stroke-width="1.6" stroke-linecap="round"/><path d="M13.5 13 25 9.8c1-.3 1.9.4 1.9 1.4V13" stroke="var(--primary-black, #000000)" stroke-width="1.6"/>'],
    ['orders', 'Учёт заказов', '<rect x="12" y="11" width="16" height="19" rx="3.5" stroke="var(--primary-black, #000000)" stroke-width="1.6"/><path d="M16 9.5h8v3h-8z" stroke="var(--primary-black, #000000)" stroke-width="1.6" stroke-linejoin="round"/><path d="M16 18h8M16 22h8M16 26h5" stroke="var(--primary-black, #000000)" stroke-width="1.6" stroke-linecap="round"/>']];
  function sync() {
    var body = document.querySelector('.main-menu .main-menu__body'); if (!body) return;
    var tpl = body.querySelector('a.main-menu-item:not(.eco-mi)'); if (!tpl) return;
    var base = tpl.className.replace(/\s*\b(eco-mi|active|selected)\b/g, '');
    var have = body.querySelectorAll('.eco-mi');
    if (have.length !== IT.length) {
      have.forEach(function (x) { x.remove() });
      var all = [].slice.call(body.children), anchor = all.filter(function (x) { return /Обучение/.test(x.textContent) })[0] || all.filter(function (x) { return /Мои покупки|Покупки/.test(x.textContent) })[0] || null;
      var after = anchor ? anchor.nextSibling : null;
      IT.forEach(function (it) { var a = tpl.cloneNode(true); a.href = '/teach/control/stream?fs=' + it[0]; a.setAttribute('data-eco', it[0]);
        var ic = a.querySelector('.main-menu-item__icon'); if (ic) ic.innerHTML = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">' + it[2] + '</svg>';
        var tx = a.querySelector('.main-menu-item__text'); if (tx) tx.textContent = it[1];
        var tt = a.querySelector('.tooltip__dropdown'); if (tt) tt.textContent = it[1];
        a.querySelectorAll('.menu-badge,.main-menu-item__badge').forEach(function (b) { b.remove() });
        body.insertBefore(a, after) })
      have = body.querySelectorAll('.eco-mi') }
    have.forEach(function (a) { var on = cur === a.getAttribute('data-eco'), want = base + ' eco-mi' + (on ? ' active' : ''); if (a.className !== want) a.className = want; a.setAttribute('data-active', on ? 'true' : 'false') });
  }
  var t = 0; function later() { if (t) return; t = setTimeout(function () { t = 0; try { sync() } catch (e) {} }, 120) }
  function start() { sync(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
