/* Фиолетовый стиль: «Актуальные события» — модули потока по дате открытия, уроки раскрываются.
   Работает только на /teach/control/schedule; уроки берутся из тренинга самого ученика, поэтому
   видны только доступные ему модули. */
(function () {
  try { sessionStorage.removeItem('fsNoticeOff') } catch (e) {}
  /* короткая заставка (рисует тема с первого кадра): снимаем, когда страница загрузилась, но не раньше 0.6 с от начала загрузки и не позже 3 с */
  (function () { var R = document.documentElement, done = false, go = function () { if (done) return; done = true; R.classList.add('fs-ready'); setTimeout(function () { R.classList.add('fs-done') }, 560) };
    var at = function () { setTimeout(go, Math.max(0, 600 - (window.performance && performance.now ? performance.now() : 600))) };
    if (document.readyState === 'complete') at(); else { window.addEventListener('load', at); document.addEventListener('DOMContentLoaded', function () { setTimeout(go, 2200) }) }
    setTimeout(go, 3000); window.addEventListener('pageshow', function (e) { if (e.persisted) go() }); window.FS_READY = go;
    /* уход со страницы (переход, обновление): плавное затемнение с размытием; если переход не случился (скачивание файла и т.п.) — убираем через 4 с */
    if (window.top === window) { var lt = 0, leave = function () { R.classList.remove('fs-done'); R.classList.add('fs-leave'); clearTimeout(lt); lt = setTimeout(function () { R.classList.remove('fs-leave') }, 4000) };
      window.addEventListener('beforeunload', leave);
      window.addEventListener('pageshow', function (e) { if (e.persisted) { clearTimeout(lt); R.classList.remove('fs-leave') } }) } })();
  /* заставка OduvanovSchool: один раз за сессию, кладка + надпись, ~2.7 c (макс. 4 c) */
  (function () {
    var seen = false; try { seen = sessionStorage.getItem('fsL') === '1'; sessionStorage.setItem('fsL', '1') } catch (e) { seen = true }
    if (seen || window.top !== window || /\/pl\/cms\/|editMode|\/pl\/lite\/block/.test(location.href)) return;
    var css = '#fsL{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#0b0b0d;overflow:hidden;font-family:"Inter Tight",Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;transition:opacity .45s ease,filter .45s ease,transform .45s ease}'
      + '#fsL::before{content:"";position:absolute;left:50%;bottom:-38vh;width:120vw;height:70vh;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(139,69,230,.9),rgba(139,69,230,.25) 50%,transparent);filter:blur(10px);opacity:0;animation:fsLglow 1.6s .1s ease forwards}'
      + '#fsL.out{opacity:0;filter:blur(6px);transform:scale(1.03);pointer-events:none}'
      + '.fsL-row{position:relative;display:flex;align-items:center}.fsL-m{position:relative;width:64px;height:64px;flex:none}'
      + '.fsL-m i{position:absolute;width:20px;height:20px;border-radius:4px;background:#fff;opacity:0;transform:translateY(-16px) scale(.6);animation:fsLin .42s cubic-bezier(.34,1.56,.64,1) forwards}'
      + '.fsL-m i.a{background:#c9a2ff;transform:translateY(-70px) rotate(-18deg) scale(.9);animation:fsLdrop .62s cubic-bezier(.3,1.5,.55,1) forwards,fsLpulse 1.1s ease .95s both}'
      + '.fsL-t{overflow:hidden;max-width:0;white-space:nowrap;animation:fsLw .7s cubic-bezier(.65,0,.35,1) 1.25s forwards}'
      + '.fsL-t span{display:inline-block;padding-left:18px;font-size:34px;letter-spacing:-.03em;line-height:1;color:#fff;font-weight:700}.fsL-t span b{font-weight:500;color:#c9a2ff}'
      + '.fsL-t em{display:inline-block;font-style:normal;opacity:0;transform:translateY(60%);animation:fsLch .5s cubic-bezier(.2,.8,.2,1) forwards}'
      + '@keyframes fsLin{to{opacity:1;transform:none}}@keyframes fsLdrop{0%{opacity:0}25%{opacity:1}100%{opacity:1;transform:none}}'
      + '@keyframes fsLpulse{0%{box-shadow:0 0 0 0 rgba(201,162,255,0)}30%{box-shadow:0 0 26px 6px rgba(201,162,255,.7)}100%{box-shadow:0 0 0 0 rgba(201,162,255,0)}}'
      + '@keyframes fsLw{to{max-width:360px}}@keyframes fsLch{to{opacity:1;transform:none}}@keyframes fsLglow{to{opacity:1}}'
      + '@media (max-width:520px){.fsL-m{transform:scale(.8)}.fsL-t span{font-size:27px;padding-left:12px}}'
      + '@media (prefers-reduced-motion:reduce){#fsL *{animation-duration:.01s!important;animation-delay:0s!important}}';
    var st = document.createElement('style'); st.id = 'fsLcss'; st.textContent = css;
    var L = document.createElement('div'); L.id = 'fsL'; L.setAttribute('aria-hidden', 'true');
    var m = '', S = 20, G = 2, pos = [[2,0],[2,1],[2,2],[1,0],[1,2],[0,0],[0,1]];
    pos.forEach(function (p, i) { m += '<i style="left:' + p[1]*(S+G) + 'px;top:' + p[0]*(S+G) + 'px;animation-delay:' + (.15 + i*.075).toFixed(3) + 's"></i>' });
    m += '<i class="a" style="left:' + 2*(S+G) + 'px;top:0;animation-delay:.78s"></i>';
    var t = '', k = 0, w = function (s) { for (var i = 0; i < s.length; i++) t += '<em style="animation-delay:' + (1.38 + k++*.028).toFixed(3) + 's">' + s[i] + '</em>' };
    w('Oduvanov'); t += '<b>'; w('School'); t += '</b>';
    L.innerHTML = '<div class="fsL-row"><div class="fsL-m">' + m + '</div><div class="fsL-t"><span>' + t + '</span></div></div>';
    var H = document.documentElement; (document.head || H).appendChild(st); H.appendChild(L); if (window.FS_READY) window.FS_READY();
    var t0 = Date.now(), gone = false, out = function () { if (gone) return; gone = true; L.classList.add('out'); setTimeout(function () { L.remove(); st.remove() }, 520) };
    var ready = function () { setTimeout(out, Math.max(0, 2650 - (Date.now() - t0))) };
    if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready);
    setTimeout(out, 4000);
  })();
  /* уведомления GetCourse: помечаем тип (письмо / остальное) для иконки — на всех страницах */
  var nt = 0, ni = setInterval(function () { [].forEach.call(document.querySelectorAll('.notice-top-panel:not([data-fs-kind])'), function (el) {
    el.setAttribute('data-fs-kind', /почт|e-?mail/i.test(el.textContent) ? 'email' : 'info'); }); if (++nt > 40) clearInterval(ni) }, 500);
  document.addEventListener('click', function (e) { var c = e.target.closest && e.target.closest('.notice-top-panel .close-link'); if (!c) return;
    var p = c.closest('.notice-top-panel'), t = p.textContent.replace(/\s+/g, ' ').trim();
    [].forEach.call(document.querySelectorAll('.notice-top-panel'), function (el) { if (el.textContent.replace(/\s+/g, ' ').trim() === t) el.style.setProperty('display', 'none', 'important') }) }, true);
  /* ===== учёт времени: активное время в кабинете и время просмотра видео уроков → сервер OduvanovSchool ===== */
  window.FS_API = window.FS_API || 'https://oduvanov-api.romanoduvanov52.workers.dev';
  (function () {
    var U = window.accountUserId; if (!U || window.top !== window) return;
    var API = window.FS_API && window.FS_API.indexOf('http') === 0 ? window.FS_API : '';
    var dayM = function () { return new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10) };
    var K = 'fsT', st; try { st = JSON.parse(localStorage.getItem(K) || '{}') } catch (e) { st = {} }
    var save = function () { try { localStorage.setItem(K, JSON.stringify(st)) } catch (e) {} };
    var lastAct = Date.now(), vids = {}, lastVid = 0;
    ['mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'].forEach(function (ev) { addEventListener(ev, function () { lastAct = Date.now() }, { passive: true, capture: true }) });
    /* видеоплеер GetCourse шлёт странице события {action:'vh-video-event', detail:{eventType, gcFileId}} */
    addEventListener('message', function (e) { var d = e.data; if (!d || d.action !== 'vh-video-event' || !d.detail) return;
      var t = String(d.detail.eventType || ''), id = d.detail.gcFileId || 'x'; lastVid = Date.now(); lastAct = Date.now();
      try { var lg = JSON.parse(localStorage.getItem('fsVhLog') || '[]'); if (lg.indexOf(t) < 0) { lg.push(t); localStorage.setItem('fsVhLog', JSON.stringify(lg.slice(-40))) } } catch (x) {}
      if (/pause|stop|end|finish|seeking|error/i.test(t)) vids[id] = 0; else if (/play|resume|start|progress|time/i.test(t)) vids[id] = Date.now() });
    var playing = function () { var n = Date.now(); for (var k in vids) if (vids[k] && n - vids[k] < 6 * 3600e3) return true; return false };
    var send = function (force) { var d = dayM(); if (!st.d) st.d = d;
      if (!API || (!force && (st.s || 0) + (st.v || 0) < 60)) return;
      var body = JSON.stringify({ u: U, d: st.d, s: Math.round(st.s || 0), v: Math.round(st.v || 0) }), ok = false;
      try { ok = navigator.sendBeacon(API + '/t', new Blob([body], { type: 'text/plain' })) } catch (e) {}
      if (ok) { st = { d: d, s: 0, v: 0 }; save() } };
    setInterval(function () { var d = dayM(); if (st.d && st.d !== d) { send(true); st = { d: d, s: 0, v: 0 } } if (!st.d) st.d = d;
      var vis = document.visibilityState === 'visible', vp = playing() && Date.now() - lastVid < 15 * 60e3;
      if (vp) st.v = (st.v || 0) + 5;
      if ((vis && Date.now() - lastAct < 90e3) || vp) st.s = (st.s || 0) + 5;
      save() }, 5000);
    setInterval(function () { send(false) }, 120e3);
    addEventListener('pagehide', function () { send(true) }); document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') send(true) });
  })();
  /* страница входа: бренд над карточкой, понятные подписи */
  (function () {
    if (window.top !== window) return;
    var go = function () { var pg = document.querySelector('.xdget-loginSystemPage'); if (!pg || pg.querySelector('.fs-lg-brand')) return;
      var S = 20, G = 2, m = '<svg viewBox="0 0 64 64" aria-hidden="true">';
      [[0,0],[0,1],[1,0],[1,2],[2,0],[2,1],[2,2]].forEach(function (p) { m += '<rect x="' + p[1]*(S+G) + '" y="' + p[0]*(S+G) + '" width="20" height="20" rx="4"/>' });
      m += '<rect class="a" x="44" y="0" width="20" height="20" rx="4"/></svg>';
      var f = pg.querySelector('form.xdget-loginUserForm'); if (!f) return;
      var b = document.createElement('a'); b.className = 'fs-lg-brand'; b.href = '/'; b.setAttribute('aria-label', 'OduvanovSchool'); b.innerHTML = m + '<span>Oduvanov<b>School</b></span>'; f.parentNode.insertBefore(b, f);
      var sub = function (box, h, t) { if (!box) return; var hh = box.querySelector('h2'); if (hh && h) hh.textContent = h; if (hh && !box.querySelector('.fs-lg-sub')) { var p = document.createElement('div'); p.className = 'fs-lg-sub'; p.textContent = t; hh.after(p) } };
      sub(f.querySelector('.login-form'), 'Вход в кабинет', 'Войди по почте, которую указывал при покупке курса');
      sub(f.querySelector('.register-form'), 'Регистрация', 'Создай аккаунт, чтобы получить доступ к урокам');
      var rm = f.querySelector('.btn-remind'); if (rm) rm.textContent = 'Забыли пароль?';
      var rg = f.querySelector('.login-form .btn-register'); if (rg) rg.innerHTML = '<span class="fs-lg-q">Нет аккаунта?</span><b>Регистрация</b>';
      var lg = f.querySelector('.register-form .btn-login'); if (lg) lg.innerHTML = '<span class="fs-lg-q">Уже есть аккаунт?</span><b>Войти</b>';
      [['.btn-chatium', 'Войти через приложение'], ['.btn-vk', 'Войти через ВКонтакте'], ['.btn-yandex_id', 'Войти через Яндекс ID']].forEach(function (x) { [].forEach.call(f.querySelectorAll(x[0]), function (el) { el.title = x[1]; el.setAttribute('aria-label', x[1]) }) });
      document.title = 'Вход · OduvanovSchool' };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go() })();
  /* ===== страница курса AI-креатор 2.0: заголовки, куратор, истории учеников + плашка «Подключи Telegram» ===== */
  (function () {
    if (window.top !== window) return;
    var U = window.accountUserId, API = window.FS_API && window.FS_API.indexOf('http') === 0 ? window.FS_API : '';
    if (!U || !API) return;
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    var CARE = 'https://t.me/zabota_oduvanov';
    var me = null, meP = null;
    var getMe = function (force) { if (!meP || force) meP = fetch(API + '/me?u=' + U).then(function (r) { return r.json() }).then(function (j) { me = j; return j }).catch(function () { return null }); return meP };
    var ini = function (n) { return String(n || '?').trim().split(/\s+/).map(function (x) { return x[0] }).join('').slice(0, 2).toUpperCase() };
    /* аватар куратора: берём фото из его профиля GetCourse, иначе инициалы */
    var MB = 'https://romanoduvanov.github.io/otzyvy/gc/curators/';
    var MEDIA = { anton: { img: MB + 'anton.jpg', video: MB + 'anton.mp4', poster: MB + 'anton-poster.jpg', dur: '2:15' }, kirill: { img: MB + 'kirill.jpg', video: MB + 'kirill.mp4', poster: MB + 'kirill-poster.jpg', dur: '3:31' } };
    var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
    var vModal = null;
    var playVideo = function (c) { var m = MEDIA[c.id]; if (!m) return;
      if (!vModal) { vModal = document.createElement('div'); vModal.className = 'fs-shm fs-vm'; document.body.appendChild(vModal);
        vModal.addEventListener('click', function (e) { if (e.target === vModal || e.target.closest('.fs-shm-x')) vClose() });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && vModal.classList.contains('on')) vClose() }) }
      vModal.innerHTML = '<div class="fs-vm-b" role="dialog" aria-modal="true" aria-label="Знакомство с куратором"><button type="button" class="fs-shm-x" aria-label="Закрыть">×</button>'
        + '<video src="' + m.video + '" poster="' + m.poster + '" controls playsinline autoplay preload="metadata"></video>'
        + '<div class="fs-vm-c"><i class="fs-cur-a" style="background-image:url(' + m.img + ')"></i><div><b>' + esc(c.full) + '</b><span>Знакомство с куратором</span></div>'
        + (me && !me.cur ? '<button type="button" class="fs-cur-go fs-vm-pick" data-c="' + c.id + '">Выбрать ' + esc(c.name) + 'а</button>' : '') + '</div></div>';
      var pk = vModal.querySelector('.fs-vm-pick'); if (pk) pk.addEventListener('click', function () { vClose(); var row = curBox && curBox.querySelector('.fs-cur-i[data-c="' + c.id + '"]'); if (row) { row.classList.remove('ask'); row.querySelector('.fs-cur-go').click() } });
      requestAnimationFrame(function () { vModal.classList.add('on'); document.documentElement.classList.add('fs-shm-open') }) };
    var vClose = function () { var v = vModal.querySelector('video'); if (v) v.pause(); vModal.classList.remove('on'); document.documentElement.classList.remove('fs-shm-open') };
    var avaCache = {};
    var ava = function (c, el) { var mm = c.id && MEDIA[c.id]; if (mm) { el.style.backgroundImage = 'url(' + mm.img + ')'; return }
      if (avaCache[c.uid] !== undefined) { if (avaCache[c.uid]) el.style.backgroundImage = 'url(' + avaCache[c.uid] + ')'; return }
      fetch('/pl/' + c.uid, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : '' }).then(function (t) {
        var m = t && t.match(/xdget-profileAvatar[\s\S]{0,600}?<img[^>]+src="([^"]+)"/); var src = m ? m[1] : '';
        if (src && /no-?avatar|default/i.test(src)) src = ''; avaCache[c.uid] = src; if (src) el.style.backgroundImage = 'url(' + src + ')' }).catch(function () { avaCache[c.uid] = '' }) };

    /* ---------- плашка «Подключи Telegram» — как «подтвердите почту», до подключения бота ---------- */
    var noticeOff = false; try { sessionStorage.removeItem('fsTgOff') } catch (e) {} /* как у плашки почты: крестик прячет до перехода/обновления страницы */
    var TGI = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.4 4.6 2.9 11.8c-1.3.5-1.3 1.2-.2 1.6l4.7 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.9-1.5-1.5zM9.3 14.4l9.3-5.9c.4-.3.9-.1.5.3l-7.9 7.2-.3 3.3-1.6-4.9z"/></svg>';
    var notice = function () { if (noticeOff || document.querySelector('.fs-tgn')) return;
      getMe().then(function (j) { if (!j || !j.ok || j.tg_ok || document.querySelector('.fs-tgn')) return;
        var n = document.createElement('div'); n.className = 'notice-top-panel fs-tgn'; n.setAttribute('data-fs-kind', 'tg'); n.setAttribute('role', 'status');
        n.innerHTML = '<div class="redesigned-notice-content"><div class="redesigned-notice-text"><b>Подключи Telegram-бот школы</b> —&nbsp;пришлём напоминание об&nbsp;эфире, старте двойных баллов и&nbsp;ответе куратора</div>'
          + '<a class="btn rd-btn-notice" href="' + esc(j.tg_link) + '" target="_blank" rel="noopener">' + TGI + 'Подключить</a></div>'
          + '<a class="close-link" href="javascript:void(0)" aria-label="Скрыть"><svg viewBox="0 0 24 24"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"/></svg></a>';
        var host = document.querySelector('#redesignedNoticeTopPanel'); var first = document.querySelector('.notice-top-panel:not(.fs-tgn)');
        if (first && first.parentNode) first.parentNode.insertBefore(n, first.nextSibling); else (host || document.body).appendChild(n);
        /* если уже висит плашка GetCourse (например, «подтвердите почту») — ставим нашу сразу под ней */
        var place = function () { if (!n.isConnected) return; var o = [].filter.call(document.querySelectorAll('.notice-top-panel:not(.fs-tgn)'), function (x) { var r = x.getBoundingClientRect(); return r.height > 0 && getComputedStyle(x).display !== 'none' })[0];
          if (o) n.style.setProperty('top', Math.round(o.getBoundingClientRect().bottom + 10) + 'px', 'important'); else n.style.removeProperty('top') };
        place(); setTimeout(place, 400); setTimeout(place, 1500); addEventListener('resize', place); document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.notice-top-panel:not(.fs-tgn) .close-link')) setTimeout(place, 60) }, true);
        n.querySelector('.close-link').addEventListener('click', function () { n.remove(); noticeOff = true });
        n.querySelector('.rd-btn-notice').addEventListener('click', function () { var t = 0, iv = setInterval(function () { getMe(true).then(function (k) { if (k && k.tg_ok) { clearInterval(iv); n.remove(); renderCur() } }); if (++t > 30) clearInterval(iv) }, 5000) }) }) };

    /* ---------- страница курса ---------- */
    var isCourse = /^\/(pl\/)?teach\/control\/stream\/view\/id\/935917158\/?$/.test(location.pathname);
    var curBox = null;
    var renderCur = function () { if (!curBox || !me || !me.ok) return; var c = me.cur;
      if (!c) {
        curBox.className = 'fs-cur fs-cur-pick';
        curBox.innerHTML = '<div class="fs-cur-t">Выбери своего куратора</div><div class="fs-cur-d">Куратор ведёт тебя до результата: проверяет домашки, отвечает на вопросы и проводит эфиры. Выбрать можно один раз.</div>'
          + '<div class="fs-cur-l">' + me.curators.map(function (x) { return '<div class="fs-cur-i" data-c="' + x.id + '"><button type="button" class="fs-cur-a fs-cur-v" data-id="' + x.id + '" data-uid="' + x.uid + '" aria-label="Видео-знакомство: ' + esc(x.full) + '">' + esc(ini(x.full)) + '<span>' + PLAY + '</span></button><div class="fs-cur-n"><b>' + esc(x.full) + '</b>' + (MEDIA[x.id] ? '<button type="button" class="fs-cur-vl" data-id="' + x.id + '">' + PLAY + 'Знакомство · ' + MEDIA[x.id].dur + '</button>' : '<span>' + esc(x.about) + '</span>') + '</div><button type="button" class="fs-cur-go">Выбрать</button></div>' }).join('') + '</div>'
          + '<a class="fs-cur-care" href="' + CARE + '" target="_blank" rel="noopener">Не знаешь, кого выбрать? <b>Служба заботы</b><i>→</i></a>';
        [].forEach.call(curBox.querySelectorAll('.fs-cur-a'), function (el) { ava({ id: el.getAttribute('data-id'), uid: +el.getAttribute('data-uid') }, el) });
        [].forEach.call(curBox.querySelectorAll('.fs-cur-v, .fs-cur-vl'), function (el) { el.addEventListener('click', function () { var id = el.getAttribute('data-id'); playVideo(me.curators.filter(function (x) { return x.id === id })[0]) }) });
        [].forEach.call(curBox.querySelectorAll('.fs-cur-i'), function (row) { var b = row.querySelector('.fs-cur-go'); b.addEventListener('click', function () {
          if (!row.classList.contains('ask')) { [].forEach.call(curBox.querySelectorAll('.fs-cur-i.ask'), function (x) { x.classList.remove('ask'); x.querySelector('.fs-cur-go').textContent = 'Выбрать' }); row.classList.add('ask'); b.textContent = 'Точно? Да'; return }
          b.disabled = true; b.textContent = '…';
          fetch(API + '/cur', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u: U, c: row.getAttribute('data-c'), name: (document.querySelector('.gc-account-user-name, .user-name') || {}).textContent || '' }) })
            .then(function (r) { return r.json() }).then(function (j) { if (j.cur) { me.cur = j.cur; curBox.classList.add('fs-cur-swap'); setTimeout(renderCur, 180) } else { b.disabled = false; b.textContent = 'Выбрать' } })
            .catch(function () { b.disabled = false; b.textContent = 'Выбрать' }) }) });
      } else {
        curBox.className = 'fs-cur fs-cur-on';
        curBox.innerHTML = '<div class="fs-cur-me"><i class="fs-cur-a big">' + esc(ini(c.full)) + '</i><div class="fs-cur-n"><span class="fs-cur-chip">Твой куратор</span><b>' + esc(c.full) + '</b>' + (MEDIA[c.id] ? '<button type="button" class="fs-cur-vl" data-id="' + c.id + '">' + PLAY + 'Видео-знакомство · ' + MEDIA[c.id].dur + '</button>' : '<span>' + esc(c.about) + '</span>') + '</div></div>'
          + '<button type="button" class="fs-cur-main">Кабинет куратора<i>→</i></button>'
          + '<div class="fs-cur-soon" hidden>Кабинет куратора откроется совсем скоро: эфиры с записями, вопросы куратору и твоя статистика — в одном месте.</div>'
          + (me.tg_ok ? '' : '<a class="fs-cur-tg" href="' + esc(me.tg_link) + '" target="_blank" rel="noopener">' + TGI + '<span>Подключи Telegram, чтобы получать ответы куратора</span></a>')
          + '<a class="fs-cur-care" href="' + CARE + '" target="_blank" rel="noopener">Техническая проблема? <b>Служба заботы</b><i>→</i></a>';
        ava(c, curBox.querySelector('.fs-cur-a')); var vl = curBox.querySelector('.fs-cur-vl'); if (vl) vl.addEventListener('click', function () { playVideo(c) });
        curBox.querySelector('.fs-cur-main').addEventListener('click', function () { var s = curBox.querySelector('.fs-cur-soon'); s.hidden = !s.hidden });
      } };
    var STORIES = '<div class="fs-st"><div class="fs-st-e">Истории учеников</div><div class="fs-st-t">Получил результат? Расскажи&nbsp;— и&nbsp;попади в&nbsp;канал Романа</div>'
      + '<div class="fs-st-p">Первый заказ, рост чека, сильная карточка или отзыв клиента&nbsp;— подходит любой результат, даже&nbsp;небольшой.</div><ul class="fs-st-l">'
      + '<li><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h3l6 4V6L7 10z"/><path d="M17 9a4 4 0 0 1 0 6"/></svg><span><b>Пост о&nbsp;тебе</b> в&nbsp;Telegram-канале Романа&nbsp;— бесплатная реклама тебя как&nbsp;дизайнера</span></li>'
      + '<li><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg><span><b>Видеоинтервью</b> с&nbsp;Романом о&nbsp;твоём&nbsp;пути</span></li>'
      + '<li><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/></svg><span><b>Место в&nbsp;чате кейсов</b>&nbsp;— туда смотрят будущие ученики и&nbsp;клиенты</span></li></ul>'
      + '<a class="fs-st-b" href="' + CARE + '" target="_blank" rel="noopener">Рассказать о&nbsp;результате <i>→</i></a><div class="fs-st-n">Пришли в&nbsp;службу заботы 2–3&nbsp;скриншота и&nbsp;пару предложений: что сделал и&nbsp;что это тебе дало. Остальное мы&nbsp;оформим сами.</div></div>';
    var course = function () { if (!isCourse || document.querySelector('.fs-sec')) return;
      var row = document.querySelector('.xdget-training > .xdget-row'); if (!row) return;
      var left = row.querySelector(':scope > .col-md-8'), right = row.querySelector(':scope > .col-md-4'); if (!left || !right) return;
      var h = function (t) { var e = document.createElement('div'); e.className = 'fs-sec'; e.textContent = t; return e };
      var emb = left.querySelector('iframe.fs-embed'); var embBlock = emb && emb.closest('.xdget-block');
      if (embBlock) embBlock.parentNode.insertBefore(h('Твои баллы и статус'), embBlock);
      var tl = left.querySelector('.xdget-trainingList'); if (tl) tl.parentNode.insertBefore(h('Доступные модули'), tl);
      document.documentElement.classList.add('fs-course');
      var wrap = document.createElement('div'); wrap.className = 'fs-side';
      wrap.appendChild(h('Твой куратор'));
      curBox = document.createElement('div'); curBox.className = 'fs-cur fs-cur-load'; curBox.innerHTML = '<i class="fs-sk"></i><i class="fs-sk s"></i><i class="fs-sk b"></i>'; wrap.appendChild(curBox);
      var st = document.createElement('div'); st.innerHTML = STORIES; wrap.appendChild(st.firstChild);
      right.appendChild(wrap);
      getMe().then(function () { renderCur() }) };
    /* рекламный баннер GetCourse (видят только админы) — убираем */
    var killAd = function () { [].forEach.call(document.querySelectorAll('.banner-frame, iframe[src*="banner"]'), function (f) { var w = f.closest('[style*="position: fixed"], [style*="position:fixed"]') || f; w.remove() }) };
    try { var mo = new MutationObserver(killAd); mo.observe(document.documentElement, { childList: true, subtree: true }); setTimeout(function () { mo.disconnect() }, 20000) } catch (e) {}
    var go = function () { course(); notice(); killAd() };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();
  /* ===== своя «Статистика продаж»: /pl/sales/dealstat (вкладки ?fs=overview|dynamics|cumulative|structure|report; ?fs=gc — классический вид GetCourse) ===== */
  (function () {
    if (window.top !== window) return;
    var path = location.pathname.replace(/\/+$/, ''), qs = new URLSearchParams(location.search), fsq = qs.get('fs');
    if (fsq === 'gc') return;
    /* старые вкладки GetCourse → наши */
    if (/^\/pl\/sales\/stat\/cumulative$/.test(path)) { location.replace('/pl/sales/dealstat?fs=cumulative'); return }
    if (/^\/pl\/crm\/stat\/revenue-structure$/.test(path)) { location.replace('/pl/sales/dealstat?fs=structure'); return }
    if (!/^\/pl\/sales\/dealstat(\/index)?$/.test(path)) return;
    var TABS = [['overview', 'Обзор'], ['dynamics', 'Динамика'], ['cumulative', 'Накопительная'], ['structure', 'Структура выручки'], ['report', 'Отчёт для продаж']];
    var tab = TABS.some(function (t) { return t[0] === fsq }) ? fsq : 'overview';
    document.documentElement.classList.add('fss-on');

    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    var NUM = function (n) { return Math.round(n || 0).toLocaleString('ru-RU').replace(/ /g, ' ') };
    var RUB = function (n) { return NUM(n) + ' ₽' };
    var SHORT = function (n) { n = n || 0; var a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '').replace('.', ',') + ' млн' : a >= 1e3 ? Math.round(n / 1e3) + ' тыс' : Math.round(n) + '' };
    var money = function (s) { var m = String(s || '').replace(/[\s ]/g, '').match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : 0 };
    var dd = function (d) { return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear() };
    var day0 = function (d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d };
    var addD = function (d, n) { d = new Date(d); d.setDate(d.getDate() + n); return d };
    var key = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) };
    var MONS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var MONN = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    var MON3 = { 'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4, 'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11 };
    var human = function (a, b) { var s = a.getDate(), e = b.getDate();
      if (key(a) === key(b)) return s + ' ' + MONS[a.getMonth()] + ' ' + a.getFullYear();
      if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return s + '–' + e + ' ' + MONS[b.getMonth()] + ' ' + b.getFullYear();
      return s + ' ' + MONS[a.getMonth()] + (a.getFullYear() !== b.getFullYear() ? ' ' + a.getFullYear() : '') + ' — ' + e + ' ' + MONS[b.getMonth()] + ' ' + b.getFullYear() };
    var delta = function (cur, prev) { if (!prev) return cur ? { t: 'новое', c: 'up' } : { t: '—', c: '' }; var p = (cur - prev) / prev * 100; return { t: (p > 0 ? '+' : '') + (Math.abs(p) < 10 ? p.toFixed(1) : Math.round(p)).toString().replace('.', ',') + '%', c: p > 0.05 ? 'up' : p < -0.05 ? 'down' : '' } };
    var catLabel = function (c) { var m;
      if ((m = String(c).match(/^(\d{4})\.(\d{2}) (\d{2})$/))) return { s: +m[3] + '', l: +m[3] + ' ' + MONS[+m[2] - 1], d: new Date(+m[1], +m[2] - 1, +m[3]) };
      if ((m = String(c).match(/^(\d{4})-w(\d+)$/))) { var j4 = new Date(+m[1], 0, 4), mon = addD(j4, -((j4.getDay() + 6) % 7) + (+m[2] - 1) * 7), sun = addD(mon, 6), f2 = function (d) { return d.getDate() + '.' + ('0' + (d.getMonth() + 1)).slice(-2) };
        return { s: f2(mon) + '–' + f2(sun), l: 'неделя ' + mon.getDate() + ' ' + MONS[mon.getMonth()] + ' — ' + sun.getDate() + ' ' + MONS[sun.getMonth()] } }
      if ((m = String(c).match(/^(\d{4})\.(\d{2})$/))) return { s: MONN[+m[2] - 1].slice(0, 3) + (m[2] === '01' ? ' ' + m[1].slice(2) : ''), l: MONN[+m[2] - 1] + ' ' + m[1], m: +m[2] - 1, y: +m[1] };
      return { s: c, l: c } };

    /* ---------- официальные данные GetCourse ---------- */
    var payRule = function (a, b) { return JSON.stringify({ type: 'andrule', inverted: 0, params: { children: [{ type: 'deal_payed_at', inverted: 0, params: { value: { from: dd(a), to: dd(b), toNDays: '', fromNDays: '', dateType: '', withTime: false }, valueMode: null } }], mode: 'and' } }) };
    var post = function (route, rule) { var fd = new URLSearchParams({ rule_string: rule || '', locationId: '0' }); fd.append(window.csrfField || '_csrf', window.csrfToken || '');
      return fetch('/pl/sales/dealstat/' + route, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(function (r) { return r.json() }).then(function (j) { if (!j || !j.success) throw new Error('gc'); return j }) };
    var html = function (s) { return new DOMParser().parseFromString(s || '', 'text/html') };
    var overview = function () { return post('indexdata', '').then(function (j) { var d = html(j.tableHtml), rows = {};
      [].forEach.call(d.querySelectorAll('tr[class*="field-"]'), function (tr) { var k = (tr.className.match(/field-(\w+)/) || [])[1]; var td = tr.querySelectorAll('td'); rows[k] = { label: td[0].textContent.trim(), v: [].slice.call(td, 1).map(function (x) { return money(x.textContent) }) } });
      return rows }) };
    var chart = function (rule) { return post('chartdata', rule).then(function (j) { var cd = j.chartData || { series: [], xAxis: { categories: [] } }, s = {};
      cd.series.forEach(function (x) { s[/Создано/.test(x.name) ? 'created' : /Оплачено/.test(x.name) ? 'paid' : /Сумма/.test(x.name) ? 'sum' : 'avg'] = x.data.map(function (v) { return v || 0 }) });
      var tot = {}; [].forEach.call(html(j.tableHtml).querySelectorAll('tr'), function (tr) { var c = tr.querySelectorAll('td'); if (c.length < 4) return; var l = c[0].textContent.trim();
        var k = /создано/i.test(l) ? 'created' : /оплачено/i.test(l) ? 'paid' : /Купило/i.test(l) ? 'buyers' : /предоплат/i.test(l) ? 'prepay' : /налог/i.test(l) ? 'tax' : /комисс/i.test(l) ? 'comm' : /Заработано/i.test(l) ? 'earned' : null;
        if (k) tot[k] = { n: money(c[1].textContent), sum: money(c[3].textContent) } });
      return { cats: (cd.xAxis && cd.xAxis.categories) || [], s: s, tot: tot } }) };
    var structure = function () { return fetch('/pl/crm/stat/revenue-structure', { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) { var d = html(t), g = [];
      var ch = d.querySelector('.gc-users-base-save-growth-dynamics--chart'); if (ch) { var nums = ch.querySelectorAll('p.number'), ms = ch.querySelectorAll('p.month'); for (var i = 0; i < nums.length; i++) g.push({ n: money(nums[i].textContent), m: (ms[i] ? ms[i].textContent : '').replace(/\s+/g, ' ').trim() }) }
      var pc = d.querySelector('.gc-users-base-save-growth-dynamics--percent');
      var win = d.querySelector('.gc-users-base-save-proceeds-windows'), periods = [];
      if (win) [].forEach.call(win.children, function (w) { var items = [].map.call(w.querySelectorAll('h4'), function (h) { var box = h.parentElement; return { t: h.textContent.trim(), p: money((box.querySelector('.percent') || {}).textContent), s: ((box.querySelector('.sum') || {}).textContent || '').trim() } }); if (items.length) periods.push(items) });
      return { growth: g, pct: pc ? (pc.querySelector('strong') || {}).textContent : '', add: pc ? (pc.querySelector('p.number') || {}).textContent : '', periods: periods } }) };

    /* ---------- заказы по дате оплаты (для тарифов и последних оплат) ---------- */
    var parseWhen = function (s) { s = String(s || '').toLowerCase(); var now = new Date(), d = null, tm = s.match(/(\d{1,2}):(\d{2})/), m;
      if (/сегодня/.test(s)) d = day0(now); else if (/позавчера/.test(s)) d = addD(day0(now), -2); else if (/вчера/.test(s)) d = addD(day0(now), -1);
      else if ((m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/))) d = new Date(+m[3], +m[2] - 1, +m[1]);
      else if ((m = s.match(/(\d{1,2})\s+([а-я]{3})[а-я]*\.?(?:\s+(\d{4}))?/)) && MON3[m[2]] != null) { var y = m[3] ? +m[3] : now.getFullYear(); d = new Date(y, MON3[m[2]], +m[1]); if (!m[3] && d > now) d.setFullYear(y - 1) }
      if (d && tm) d.setHours(+tm[1], +tm[2], 0, 0); return d };
    var getPage = function (r, p) { return fetch('/pl/sales/deal/index?' + new URLSearchParams({ 'DealContext[segment_id]': '0', 'DealContext[rule_string]': r, page: p }), { credentials: 'same-origin' }).then(function (x) { return x.text() }).then(html) };
    var rowsOf = function (doc) { var th = [].map.call(doc.querySelectorAll('table thead tr:first-child th'), function (x) { return x.textContent.trim().toLowerCase() });
      var ix = function (re) { for (var i = 0; i < th.length; i++) if (re.test(th[i])) return i; return -1 };
      var I = { client: ix(/клиент/), items: ix(/состав/), status: ix(/статус/), cost: ix(/стоимость/), mgr: ix(/менеджер/) };
      return [].map.call(doc.querySelectorAll('table tbody tr[data-key]'), function (tr) { var c = tr.children, t = function (i) { return i >= 0 && c[i] ? c[i].textContent.trim().replace(/\s+/g, ' ') : '' };
        return { id: tr.getAttribute('data-key'), client: t(I.client), title: t(I.items) || '—', cost: money(t(I.cost)), mgr: t(I.mgr), when: parseWhen(t(I.status).split(/Оплачено:\s*/i)[1] || '') } }) };
    var deals = function (a, b) { var r = payRule(a, b);
      return getPage(r, 1).then(function (doc) { var first = rowsOf(doc), sm = ((doc.querySelector('.summary') || {}).textContent || '').replace(/[\s ]/g, ''), mm = sm.match(/из(\d+)/);
        var pages = Math.min(400, Math.ceil((mm ? +mm[1] : first.length) / Math.max(first.length, 1))), out = first.slice(), next = 2;
        var worker = function () { if (next > pages) return Promise.resolve(); var p = next++; return getPage(r, p).then(function (d) { out = out.concat(rowsOf(d)); return worker() }) };
        var ws = []; for (var k = 0; k < 6; k++) ws.push(worker());
        return Promise.all(ws).then(function () { var seen = {}; return out.filter(function (x) { if (seen[x.id]) return false; seen[x.id] = 1; return true }) }) }) };

    /* ---------- графики (SVG) ---------- */
    var uid = 0;
    var bars = function (el, pts, o) { o = o || {}; var W = el.clientWidth || 800, H = o.h || 240, L = 58, B = 26, T = 10, ser = o.series || [{ k: 'v', c: 'g' }];
      var mx = 1; pts.forEach(function (p) { ser.forEach(function (s) { mx = Math.max(mx, p[s.k] || 0) }) });
      var nice = function (v) { var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; var st = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]; for (var i = 0; i < st.length; i++) if (f <= st[i]) return st[i] * p; return 10 * p }; mx = nice(mx);
      var id = 'fssG' + (++uid), g = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7b6ff"/><stop offset="1" stop-color="#8f4ff0"/></linearGradient></defs>';
      for (var i = 0; i <= 4; i++) { var y = T + (H - T - B) * (1 - i / 4); g += '<line class="gl" x1="' + L + '" x2="' + W + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + (o.fmt ? o.fmt(mx * i / 4) : SHORT(mx * i / 4)) + '</text>' }
      var bw = (W - L) / Math.max(1, pts.length), step = Math.ceil(pts.length / Math.max(1, Math.floor((W - L) / 40)));
      if (o.line) { var d = ''; pts.forEach(function (p, i) { var x = L + bw * i + bw / 2, y = H - B - (H - T - B) * (p[ser[0].k] || 0) / mx; d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) });
        g += '<path d="' + d + 'L' + (L + bw * (pts.length - 1) + bw / 2) + ' ' + (H - B) + 'L' + (L + bw / 2) + ' ' + (H - B) + 'Z" fill="rgba(163,92,240,.14)"/><path d="' + d + '" fill="none" stroke="#c38bff" stroke-width="2" stroke-linejoin="round"/>' }
      pts.forEach(function (p, i) { var n = ser.length, gw = Math.max(2, Math.min(bw - 6, 26 * n + 8)), w = (gw - (n - 1) * 2) / n, x0 = L + bw * i + (bw - gw) / 2;
        g += '<g class="c" data-i="' + i + '">';
        if (o.line) { var yy = H - B - (H - T - B) * (p[ser[0].k] || 0) / mx; g += '<circle cx="' + (L + bw * i + bw / 2) + '" cy="' + yy + '" r="4" fill="#0b0a10" stroke="#e2c9ff" stroke-width="2"/>' }
        else ser.forEach(function (s, j) { var v = p[s.k] || 0, h = (H - T - B) * v / mx; if (v > 0) g += '<rect class="b" x="' + (x0 + j * (w + 2)) + '" y="' + (H - B - Math.max(h, 2)) + '" width="' + w + '" height="' + Math.max(h, 2) + '" rx="' + Math.min(4, w / 2) + '" fill="' + (s.c === 'g' ? 'url(#' + id + ')' : s.c) + '"/>' });
        g += '<rect class="h" x="' + (L + bw * i) + '" y="' + T + '" width="' + bw + '" height="' + (H - T) + '" fill="transparent"/>' + (i % step === 0 ? '<text x="' + (L + bw * i + bw / 2) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(p.s) + '</text>' : '') + '</g>' });
      el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '">' + g + '</svg><div class="fss-tip"></div>';
      var tip = el.querySelector('.fss-tip');
      [].forEach.call(el.querySelectorAll('g.c'), function (c) { var i = +c.getAttribute('data-i'), p = pts[i];
        c.addEventListener('mouseenter', function () { tip.innerHTML = '<span>' + esc(p.l) + '</span>' + ser.map(function (s) { return '<div><i style="background:' + (s.c === 'g' ? '#c38bff' : s.c) + '"></i>' + (s.n ? esc(s.n) + ': ' : '') + '<b>' + (s.f || o.tf || RUB)(p[s.k] || 0) + '</b></div>' }).join('') + (o.extra ? o.extra(p) : '');
          tip.style.left = Math.min(Math.max((L + bw * i + bw / 2) / W * 100, 8), 92) + '%'; tip.style.opacity = 1 });
        c.addEventListener('mouseleave', function () { tip.style.opacity = 0 }) }) };

    /* ---------- стили ---------- */
    var CSS = ':root.fss-on .fss-host>*:not(.fss){display:none!important}'
      + '.fss{--mut:rgba(255,255,255,.55);--line:rgba(255,255,255,.08);--card:rgba(255,255,255,.035);color:#fff;font-feature-settings:"tnum";padding-bottom:40px}.fss *{box-sizing:border-box}'
      + '.fss-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:6px 0 18px}.fss-top h1{margin:0!important;font-size:34px!important;font-weight:600!important;letter-spacing:-.02em;color:#fff!important}.fss-top p{margin:6px 0 0;color:var(--mut);font-size:13px}'
      + '.fss-gc{color:var(--mut)!important;font-size:12px;text-decoration:none!important;border-bottom:1px dashed rgba(255,255,255,.25)}.fss-gc:hover{color:#fff!important}'
      + '.fss-tabs{display:inline-flex;flex-wrap:wrap;gap:4px;padding:5px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid var(--line);margin-bottom:20px}.fss-tabs button{border:0;background:transparent;color:rgba(255,255,255,.7);font:500 14px/1 inherit;padding:10px 16px;border-radius:12px;cursor:pointer;transition:.15s}.fss-tabs button:hover{color:#fff;background:rgba(255,255,255,.05)}.fss-tabs button.on{background:rgba(195,139,255,.18);color:#fff;box-shadow:inset 0 0 0 1px rgba(195,139,255,.45)}'
      + '.fss-seg{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px}.fss-chip{border:1px solid var(--line);background:var(--card);color:#fff;border-radius:999px;padding:8px 14px;font:500 13px/1 inherit;cursor:pointer;transition:.15s}.fss-chip:hover{border-color:rgba(195,139,255,.4)}.fss-chip.on{background:rgba(195,139,255,.18);border-color:rgba(195,139,255,.55)}'
      + '.fss-dates{display:flex;gap:6px;align-items:center;color:var(--mut);font-size:13px}.fss-dates input{background:rgba(255,255,255,.05);border:1px solid var(--line);color:#fff;border-radius:10px;padding:6px 10px;font:inherit;color-scheme:dark}.fss-sp{flex:1}'
      + '.fss-img{background:linear-gradient(180deg,#d7b6ff,#a35cf0);color:#16072b;border:0;border-radius:999px;padding:10px 18px;font:600 14px/1 inherit;cursor:pointer;display:inline-flex;gap:8px;align-items:center;box-shadow:0 8px 30px -8px rgba(163,92,240,.7)}.fss-img:disabled{opacity:.5;cursor:default}.fss-img svg{width:16px;height:16px}'
      + '.fss-k4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}.fss-k3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}@media(max-width:1000px){.fss-k4,.fss-k3{grid-template-columns:repeat(2,1fr)}}'
      + '.fss-k{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px;min-width:0}.fss-k.hero{background:radial-gradient(120% 140% at 0% 100%,rgba(163,92,240,.28),rgba(255,255,255,.03) 60%);border-color:rgba(195,139,255,.28)}.fss-k i{font-style:normal;color:var(--mut);font-size:12px;letter-spacing:.04em;text-transform:uppercase}.fss-k b{display:block;font-size:30px;font-weight:600;letter-spacing:-.02em;margin:8px 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.fss-d{font-size:12px;color:var(--mut)}.fss-d em{font-style:normal;font-weight:600;border-radius:999px;padding:2px 7px;margin-right:6px;background:rgba(255,255,255,.08);color:#fff}.fss-d em.up{background:rgba(70,200,120,.16);color:#7be3a5}.fss-d em.down{background:rgba(255,90,90,.15);color:#ff9a9a}'
      + '.fss-box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px;margin-bottom:12px;min-width:0}.fss-h{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px}.fss-h b{font-size:16px;font-weight:600}.fss-h span{color:var(--mut);font-size:12px}'
      + '.fss-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fss-g21{display:grid;grid-template-columns:1.5fr 1fr;gap:12px}@media(max-width:1000px){.fss-g2,.fss-g21{grid-template-columns:1fr}}'
      + '.fss-ch{position:relative}.fss-ch svg{display:block;overflow:visible}.fss-ch .gl{stroke:rgba(255,255,255,.07)}.fss-ch text{fill:rgba(255,255,255,.45);font-size:11px;font-family:inherit}.fss-ch g.c:hover rect.b{filter:brightness(1.25)}'
      + '.fss-tip{position:absolute;top:0;pointer-events:none;background:#1d1828;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 10px;font-size:12px;white-space:nowrap;transform:translate(-50%,-6px);opacity:0;transition:opacity .1s;z-index:3}.fss-tip span{color:var(--mut);display:block;margin-bottom:3px}.fss-tip i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}'
      + '.fss-lg{display:flex;gap:14px;font-size:12px;color:var(--mut)}.fss-lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}'
      + '.fss-t{width:100%;border-collapse:collapse;font-size:13px}.fss-t th{color:var(--mut);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em;text-align:right;padding:0 8px 8px;white-space:nowrap}.fss-t th:first-child,.fss-t td:first-child{text-align:left;padding-left:0}.fss-t td{padding:9px 8px;border-top:1px solid var(--line);text-align:right;white-space:nowrap}.fss-t td:first-child{white-space:normal}.fss-t tr.sum td{color:#fff;font-weight:600;background:rgba(195,139,255,.08)}.fss-t td.hl{color:#fff;font-weight:600}.fss-t td.mu{color:var(--mut)}.fss-scroll{overflow-x:auto}'
      + '.fss-sh{display:block;height:4px;border-radius:4px;background:rgba(255,255,255,.06);margin-top:6px;overflow:hidden}.fss-sh i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#8f4ff0,#d7b6ff)}.fss-t a{color:#e6d4ff!important}.fss-note{color:var(--mut);font-size:12px;margin-top:4px}'
      + '.fss-load{padding:70px 0;text-align:center;color:var(--mut)}.fss-load:after{content:"";display:block;width:28px;height:28px;margin:14px auto 0;border-radius:50%;border:3px solid rgba(195,139,255,.2);border-top-color:#c38bff;animation:fssr 0.8s linear infinite}@keyframes fssr{to{transform:rotate(360deg)}}.fss-empty{padding:40px 0;text-align:center;color:var(--mut)}'
      + '.fss-stack{display:flex;height:14px;border-radius:8px;overflow:hidden;gap:2px;margin:6px 0 14px}.fss-stack i{display:block;height:100%}'
      + '.fss-big{font-size:44px;font-weight:600;letter-spacing:-.03em;line-height:1}.fss-big small{font-size:16px;color:var(--mut);font-weight:500;margin-left:8px;letter-spacing:0}'
      + '.fss-modal{position:fixed;inset:0;background:rgba(4,3,8,.82);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px}.fss-mw{display:flex;flex-direction:column;align-items:center;gap:14px;max-height:100%}.fss-mw img{max-height:calc(100vh - 120px);max-width:100%;border-radius:18px;box-shadow:0 30px 80px -20px rgba(143,79,240,.5)}'
      + '.fss-mb{display:flex;gap:10px}.fss-mb button{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:10px 18px;font:500 14px/1 inherit;cursor:pointer}.fss-mb button.p{background:linear-gradient(180deg,#d7b6ff,#a35cf0);color:#16072b;border:0;font-weight:600}';

    var root, body, cache = {};
    var kcard = function (lab, val, d, sub, hero) { return '<div class="fss-k' + (hero ? ' hero' : '') + '"><i>' + lab + '</i><b title="' + esc(val) + '">' + val + '</b><div class="fss-d">' + (d ? '<em class="' + d.c + '">' + d.t + '</em>' : '') + (sub || '') + '</div></div>' };
    var loading = function (t) { body.innerHTML = '<div class="fss-load">' + (t || 'Загружаю данные GetCourse…') + '</div>' };
    var fail = function () { body.innerHTML = '<div class="fss-empty">GetCourse не отдал данные. Обнови страницу — или открой <a href="?fs=gc" style="color:#d7b6ff">классический вид</a>.</div>' };

    /* ---------- Обзор ---------- */
    var OVP = ['Сегодня', 'Вчера', 'Этот месяц', 'Прошлый месяц', 'Этот год', 'Всё время'], ovI = 2;
    var renderOverview = function () { var R = cache.ov; if (!R) { loading(); overview().then(function (r) { cache.ov = r; if (tab === 'overview') renderOverview() }).catch(fail); return }
      var v = function (k, i) { return R[k] ? R[k].v[i] || 0 : 0 }, i = ovI, pi = i === 0 ? 1 : i === 2 ? 3 : -1, dl = function (k) { return pi < 0 ? null : delta(v(k, i), v(k, pi)) }, was = function (k, f) { return pi < 0 ? '' : (pi === 1 ? 'вчера ' : 'в прошлом месяце ') + (f || RUB)(v(k, pi)) };
      var conv = v('dealsCount', i) ? Math.round(v('payedDealsCount', i) / v('dealsCount', i) * 100) : 0;
      var h = '<div class="fss-seg">' + OVP.map(function (p, j) { return '<button type="button" class="fss-chip' + (j === i ? ' on' : '') + '" data-i="' + j + '">' + p + '</button>' }).join('') + '</div>'
        + '<div class="fss-k4">' + kcard('Сумма оплат', RUB(v('payedSum', i)), dl('payedSum'), was('payedSum'), 1) + kcard('Заработано', RUB(v('earnedSum', i)), dl('earnedSum'), was('earnedSum') || 'после налогов и комиссий')
        + kcard('Оплачено заказов', NUM(v('payedDealsCount', i)), dl('payedDealsCount'), was('payedDealsCount', NUM) || 'из ' + NUM(v('dealsCount', i)) + ' созданных') + kcard('Средний чек', RUB(v('averageCheque', i)), dl('averageCheque'), was('averageCheque')) + '</div>'
        + '<div class="fss-k4">' + kcard('Создано заказов', NUM(v('dealsCount', i)), null, 'конверсия в оплату ' + conv + '%') + kcard('Оплативших', NUM(v('payedUsersCount', i)), dl('payedUsersCount'), 'уникальных покупателей')
        + kcard('Предоплаты', RUB(v('partialPayedSum', i)), null, NUM(v('partialPayedCount', i)) + ' частично оплаченных') + kcard('Налоги и комиссии', RUB(v('taxesSum', i) + v('commissionSum', i)), null, 'налоги ' + RUB(v('taxesSum', i))) + '</div>'
        + '<div class="fss-box"><div class="fss-h"><b>Все показатели</b><span>официальные данные GetCourse</span></div><div class="fss-scroll"><table class="fss-t"><tr><th>Показатель</th>' + OVP.map(function (p) { return '<th>' + p + '</th>' }).join('') + '</tr>'
        + Object.keys(R).map(function (k) { var cnt = /Count$/.test(k); return '<tr class="' + (k === 'earnedSum' ? 'sum' : '') + '"><td>' + esc(R[k].label) + '</td>' + R[k].v.map(function (x, j) { return '<td class="' + (j === i ? 'hl' : '') + '">' + (cnt ? NUM(x) : RUB(x)) + '</td>' }).join('') + '</tr>' }).join('') + '</table></div></div>';
      body.innerHTML = h;
      [].forEach.call(body.querySelectorAll('.fss-chip'), function (b) { b.onclick = function () { ovI = +b.getAttribute('data-i'); renderOverview() } }) };

    /* ---------- Динамика и Накопительная (по месяцам) ---------- */
    var monthly = function (cb) { if (cache.all) return cb(cache.all); loading(); chart('').then(function (c) { cache.all = c.cats.map(function (x, i) { var L = catLabel(x); return { s: L.s, l: L.l, created: c.s.created[i] || 0, paid: c.s.paid[i] || 0, sum: c.s.sum[i] || 0, avg: c.s.avg[i] || 0 } }); cb(cache.all) }).catch(fail) };
    var renderDynamics = function () { monthly(function (P) { if (tab !== 'dynamics') return;
      var last = P[P.length - 1] || {}, prev = P[P.length - 2] || {}, tot = P.reduce(function (a, p) { return a + p.sum }, 0), best = P.slice().sort(function (a, b) { return b.sum - a.sum })[0] || {};
      body.innerHTML = '<div class="fss-k4">' + kcard('Оплаты в этом месяце', RUB(last.sum), delta(last.sum, prev.sum), 'было ' + RUB(prev.sum), 1) + kcard('Оплачено заказов', NUM(last.paid), delta(last.paid, prev.paid), 'было ' + NUM(prev.paid))
        + kcard('Средний чек', RUB(last.avg), delta(last.avg, prev.avg), 'было ' + RUB(prev.avg)) + kcard('Лучший месяц', RUB(best.sum), null, esc(best.l || '')) + '</div>'
        + '<div class="fss-box"><div class="fss-h"><b>Сумма оплат по месяцам</b><span>всего ' + RUB(tot) + '</span></div><div class="fss-ch" id="fssA"></div></div>'
        + '<div class="fss-g2"><div class="fss-box"><div class="fss-h"><b>Заказы</b><span class="fss-lg"><span><i style="background:rgba(255,255,255,.28)"></i>создано</span><span><i style="background:#c38bff"></i>оплачено</span></span></div><div class="fss-ch" id="fssB"></div></div>'
        + '<div class="fss-box"><div class="fss-h"><b>Средний чек</b></div><div class="fss-ch" id="fssC"></div></div></div>'
        + '<div class="fss-box"><div class="fss-h"><b>По месяцам</b></div><div class="fss-scroll"><table class="fss-t"><tr><th>Месяц</th><th>Создано</th><th>Оплачено</th><th>Конверсия</th><th>Сумма оплат</th><th>Средний чек</th></tr>'
        + P.slice().reverse().map(function (p) { return '<tr><td>' + esc(p.l) + '</td><td>' + NUM(p.created) + '</td><td>' + NUM(p.paid) + '</td><td class="mu">' + (p.created ? Math.round(p.paid / p.created * 100) : 0) + '%</td><td class="hl">' + RUB(p.sum) + '</td><td>' + RUB(p.avg) + '</td></tr>' }).join('') + '</table></div></div>';
      bars(body.querySelector('#fssA'), P.map(function (p) { return { s: p.s, l: p.l, v: p.sum, n: p.paid } }), { h: 260, extra: function (p) { return '<div style="color:rgba(255,255,255,.55);margin-top:2px">' + NUM(p.n) + ' оплат</div>' } });
      bars(body.querySelector('#fssB'), P, { h: 200, series: [{ k: 'created', c: 'rgba(255,255,255,.28)', n: 'Создано', f: NUM }, { k: 'paid', c: '#c38bff', n: 'Оплачено', f: NUM }], fmt: function (x) { return NUM(x) } });
      bars(body.querySelector('#fssC'), P.map(function (p) { return { s: p.s, l: p.l, v: p.avg } }), { h: 200, line: true }) }) };
    var renderCumulative = function () { monthly(function (P) { if (tab !== 'cumulative') return; var run = 0, C = P.map(function (p) { run += p.sum; return { s: p.s, l: p.l, v: run, m: p.sum } });
      var total = run, last = C[C.length - 1] || {}, before = C[C.length - 2] || {};
      body.innerHTML = '<div class="fss-k3">' + kcard('Накоплено за всё время', RUB(total), null, 'первый месяц — ' + esc((C[0] || {}).l || ''), 1) + kcard('Прирост в этом месяце', RUB(last.m), delta(last.v, before.v), 'к накопленному на конец прошлого') + kcard('В среднем за месяц', RUB(C.length ? total / C.length : 0), null, C.length + ' мес.') + '</div>'
        + '<div class="fss-box"><div class="fss-h"><b>Накопительная выручка</b><span>сумма оплат нарастающим итогом</span></div><div class="fss-ch" id="fssA"></div></div>'
        + '<div class="fss-box"><div class="fss-scroll"><table class="fss-t"><tr><th>Месяц</th><th>За месяц</th><th>Накоплено</th><th>Доля в итоге</th></tr>' + C.slice().reverse().map(function (p) { return '<tr><td>' + esc(p.l) + '</td><td>' + RUB(p.m) + '</td><td class="hl">' + RUB(p.v) + '</td><td class="mu">' + (total ? Math.round(p.m / total * 100) : 0) + '%</td></tr>' }).join('') + '</table></div></div>';
      bars(body.querySelector('#fssA'), C, { h: 280, line: true, extra: function (p) { return '<div style="color:rgba(255,255,255,.55);margin-top:2px">за месяц ' + RUB(p.m) + '</div>' } }) }) };

    /* ---------- Структура выручки ---------- */
    var stI = 0;
    var renderStructure = function () { var S = cache.st; if (!S) { loading(); structure().then(function (r) { cache.st = r; if (tab === 'structure') renderStructure() }).catch(fail); return }
      var COL = ['#8f4ff0', '#c38bff', '#ead9ff'], PN = ['Текущий месяц', 'Прошлый месяц', 'За весь период'], it = S.periods[stI] || [];
      var lastG = S.growth[S.growth.length - 1] || {};
      body.innerHTML = '<div class="fss-g21"><div class="fss-box"><div class="fss-h"><b>Рост базы клиентов</b><span>за полгода</span></div><div class="fss-ch" id="fssA"></div></div>'
        + '<div class="fss-box" style="display:flex;flex-direction:column;justify-content:center;gap:18px"><div><div class="fss-note">Клиентов в базе сейчас</div><div class="fss-big">' + NUM(lastG.n) + '</div></div><div><div class="fss-note">Рост базы за полгода</div><div class="fss-big" style="color:#7be3a5">' + esc(S.pct || '—') + '<small>' + esc(S.add || '') + ' клиентов</small></div></div></div></div>'
        + '<div class="fss-box"><div class="fss-h"><b>Выручка от новых клиентов и клиентов из базы</b><span>данные GetCourse на конец прошлого дня</span></div>'
        + '<div class="fss-seg">' + PN.map(function (p, j) { return S.periods[j] ? '<button type="button" class="fss-chip' + (j === stI ? ' on' : '') + '" data-i="' + j + '">' + p + '</button>' : '' }).join('') + '</div>'
        + (it.length ? '<div class="fss-stack">' + it.map(function (x, j) { return '<i style="width:' + Math.max(x.p, .5) + '%;background:' + COL[j] + '" title="' + esc(x.t) + ' — ' + x.p + '%"></i>' }).join('') + '</div>'
          + '<div class="fss-k3">' + it.map(function (x, j) { return '<div class="fss-k"><i><span style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px;background:' + COL[j] + '"></i>' + (j < 2 ? 'Новые клиенты' : 'Клиенты из базы') + '</i><b>' + esc(x.s.replace('.', ',').replace('M', ' млн').replace('K', ' тыс')) + ' ₽</b><div class="fss-d"><em>' + String(x.p).replace('.', ',') + '%</em>' + esc(x.t.toLowerCase()) + '</div></div>' }).join('') + '</div>' : '<div class="fss-empty">Нет данных</div>')
        + '<div class="fss-note">«Клиент из базы» — тот, кто заплатил на третий месяц или позже после попадания в базу. Чем больше эта доля, тем лучше школа работает с базой.</div></div>';
      bars(body.querySelector('#fssA'), S.growth.map(function (g) { return { s: g.m.replace(/\s*'\d+/, '').slice(0, 3).toLowerCase(), l: g.m, v: g.n } }), { h: 220, tf: function (x) { return NUM(x) + ' клиентов' }, fmt: function (x) { return NUM(x) } });
      [].forEach.call(body.querySelectorAll('.fss-chip'), function (b) { b.onclick = function () { stI = +b.getAttribute('data-i'); renderStructure() } }) };

    /* ---------- Отчёт для продаж (период) ---------- */
    var presets = function () { var t = day0(new Date()), y = addD(t, -1), ms = new Date(t.getFullYear(), t.getMonth(), 1), pms = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      return [{ k: 'today', l: 'Сегодня', a: t, b: t }, { k: 'yest', l: 'Вчера', a: y, b: y }, { k: 'w', l: '7 дней', a: addD(t, -6), b: t }, { k: 'm30', l: '30 дней', a: addD(t, -29), b: t },
        { k: 'month', l: 'Этот месяц', a: ms, b: t }, { k: 'pmonth', l: 'Прошлый месяц', a: pms, b: addD(ms, -1) }] };
    var rep = { k: null };
    var repLoad = function () { var a = rep.a, b = rep.b, len = Math.round((b - a) / 864e5) + 1, pa = addD(a, -len), pb = addD(a, -1), tok = rep.tok = Math.random(); rep.data = null; renderReport();
      Promise.all([chart(payRule(a, b)), chart(payRule(pa, pb)), deals(a, b).catch(function () { return [] })]).then(function (r) { if (tok !== rep.tok) return; rep.data = { cur: r[0], prev: r[1], deals: r[2] }; if (tab === 'report') renderReport() }).catch(function () { if (tok === rep.tok) fail() }) };
    var setP = function (k) { var p = presets().filter(function (x) { return x.k === k })[0]; if (!p) return; rep.k = k; rep.a = p.a; rep.b = p.b; try { sessionStorage.setItem('fssK', k) } catch (e) {} repLoad() };
    var kpis = function (D) { var t = D.tot, n = (t.paid || {}).n || 0, s = (t.paid || {}).sum || 0; return { n: n, sum: s, avg: n ? s / n : 0, buyers: (t.buyers || {}).n || 0, earned: (t.earned || {}).sum || 0 } };
    var repSeries = function (D) { var C = D.cats.map(function (c, i) { var L = catLabel(c); return { L: L, v: (D.s.sum || [])[i] || 0, n: (D.s.paid || [])[i] || 0 } });
      if (C.length && C.every(function (x) { return x.L.d })) { var m = {}; C.forEach(function (x) { m[key(x.L.d)] = x }); var out = [], days = Math.round((rep.b - rep.a) / 864e5) + 1;
        for (var i = 0; i < days; i++) { var d = addD(rep.a, i), x = m[key(d)]; out.push({ s: d.getDate() + '', l: d.getDate() + ' ' + MONS[d.getMonth()], v: x ? x.v : 0, n: x ? x.n : 0 }) } return out }
      while (C.length && !C[0].n) C.shift(); return C.map(function (x) { return { s: x.L.s, l: x.L.l, v: x.v, n: x.n } }) };
    var tariffs = function (list) { var m = {}; list.filter(function (x) { return x.cost > 0 }).forEach(function (x) { (m[x.title] = m[x.title] || { name: x.title, n: 0, sum: 0 }), m[x.title].n++, m[x.title].sum += x.cost });
      return Object.keys(m).map(function (k) { return m[k] }).sort(function (a, b) { return b.n - a.n || b.sum - a.sum }) };
    var renderReport = function () { if (!rep.k) { var k = 'month'; try { k = sessionStorage.getItem('fssK') || 'month' } catch (e) {} if (k === 'custom') k = 'month'; setP(k); return }
      var chips = presets().map(function (p) { return '<button type="button" class="fss-chip' + (rep.k === p.k ? ' on' : '') + '" data-k="' + p.k + '">' + p.l + '</button>' }).join('');
      var bar = '<div class="fss-seg">' + chips + '<span class="fss-dates"><input type="date" class="fss-a" value="' + key(rep.a) + '"> — <input type="date" class="fss-b" value="' + key(rep.b) + '"></span><span class="fss-sp"></span>'
        + '<button type="button" class="fss-img"' + (rep.data ? '' : ' disabled') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>Отчёт картинкой</button></div>';
      if (!rep.data) { body.innerHTML = bar + '<div class="fss-load">Собираю продажи за ' + esc(human(rep.a, rep.b)) + '…</div>'; bindRep(); return }
      var c = kpis(rep.data.cur), p = kpis(rep.data.prev), T = tariffs(rep.data.deals), tn = T.reduce(function (a, t) { return a + t.n }, 0), maxN = T.length ? T[0].n : 1;
      var last = rep.data.deals.filter(function (x) { return x.cost > 0 }).sort(function (a, b) { return (b.when || 0) - (a.when || 0) }).slice(0, 10);
      var fmtW = function (w) { return w ? ('0' + w.getDate()).slice(-2) + '.' + ('0' + (w.getMonth() + 1)).slice(-2) + ' ' + ('0' + w.getHours()).slice(-2) + ':' + ('0' + w.getMinutes()).slice(-2) : '' };
      body.innerHTML = bar + '<div class="fss-k4">' + kcard('Сумма оплат', RUB(c.sum), delta(c.sum, p.sum), 'было ' + RUB(p.sum), 1) + kcard('Продаж', NUM(c.n), delta(c.n, p.n), 'было ' + NUM(p.n))
        + kcard('Средний чек', RUB(c.avg), delta(c.avg, p.avg), 'было ' + RUB(p.avg)) + kcard('Покупателей', NUM(c.buyers), delta(c.buyers, p.buyers), 'было ' + NUM(p.buyers)) + '</div>'
        + '<div class="fss-box"><div class="fss-h"><b>Оплаты</b><span>' + esc(human(rep.a, rep.b)) + ' · сравнение с ' + esc(human(addD(rep.a, -(Math.round((rep.b - rep.a) / 864e5) + 1)), addD(rep.a, -1))) + '</span></div><div class="fss-ch" id="fssA"></div></div>'
        + '<div class="fss-g21"><div class="fss-box"><div class="fss-h"><b>Тарифы</b><span>по количеству продаж</span></div>' + (T.length ? '<table class="fss-t"><tr><th>Тариф / продукт</th><th>Продаж</th><th>Доля</th><th>Сумма заказов</th></tr>' + T.map(function (t) {
          return '<tr><td>' + esc(t.name) + '<span class="fss-sh"><i style="width:' + Math.max(3, t.n / maxN * 100).toFixed(1) + '%"></i></span></td><td class="hl">' + NUM(t.n) + '</td><td class="mu">' + (tn ? Math.round(t.n / tn * 100) : 0) + '%</td><td>' + RUB(t.sum) + '</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">Оплат за период нет</div>') + '</div>'
        + '<div class="fss-box"><div class="fss-h"><b>Последние оплаты</b></div>' + (last.length ? '<table class="fss-t"><tr><th>Клиент</th><th>Когда</th><th>Заказ</th></tr>' + last.map(function (x) {
          return '<tr><td><a href="/sales/control/deal/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.client || '—') + '</a><div class="fss-note">' + esc(x.title) + '</div></td><td class="mu">' + fmtW(x.when) + '</td><td>' + RUB(x.cost) + '</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">Пока пусто</div>') + '</div></div>';
      bars(body.querySelector('#fssA'), repSeries(rep.data.cur), { h: 240, extra: function (q) { return '<div style="color:rgba(255,255,255,.55);margin-top:2px">' + NUM(q.n) + ' оплат</div>' } });
      bindRep() };
    var bindRep = function () { [].forEach.call(body.querySelectorAll('.fss-chip'), function (b) { b.onclick = function () { setP(b.getAttribute('data-k')) } });
      var ia = body.querySelector('.fss-a'), ib = body.querySelector('.fss-b'), ch = function () { if (!ia.value || !ib.value) return; var a = new Date(ia.value + 'T00:00'), b = new Date(ib.value + 'T00:00'); if (a > b) { var t = a; a = b; b = t } rep.k = 'custom'; rep.a = a; rep.b = b; repLoad() };
      ia.onchange = ch; ib.onchange = ch;
      var im = body.querySelector('.fss-img'); if (im) im.onclick = function () { im.disabled = true; card().then(function (u) { im.disabled = false; modal(u) }).catch(function () { im.disabled = false }) } };

    /* ---------- отчёт картинкой 1080×1350 ---------- */
    var card = function () {
      var cv = document.createElement('canvas'), W = 1080, H = 1350; cv.width = W; cv.height = H; var x = cv.getContext('2d'), F = '"Inter Tight", Inter, system-ui, sans-serif';
      var c = kpis(rep.data.cur), p = kpis(rep.data.prev), T = tariffs(rep.data.deals), tn = T.reduce(function (a, t) { return a + t.n }, 0);
      var rr = function (X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath() };
      var fit = function (s, w) { if (x.measureText(s).width <= w) return s; while (s.length > 1 && x.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…' };
      return (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 40px "Inter Tight"'), document.fonts.load('500 20px "Inter Tight"')]).catch(function () {}) : Promise.resolve()).then(function () {
        x.fillStyle = '#060509'; x.fillRect(0, 0, W, H);
        var gr = x.createRadialGradient(W / 2, H + 120, 40, W / 2, H + 120, 900); gr.addColorStop(0, 'rgba(163,92,240,.55)'); gr.addColorStop(.5, 'rgba(110,50,200,.18)'); gr.addColorStop(1, 'rgba(6,5,9,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        var g2 = x.createRadialGradient(W - 120, -60, 10, W - 120, -60, 520); g2.addColorStop(0, 'rgba(195,139,255,.22)'); g2.addColorStop(1, 'rgba(6,5,9,0)'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
        x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '500 24px ' + F; x.fillText('OduvanovSchool · отдел продаж', 72, 104);
        x.fillStyle = '#fff'; x.font = '600 64px ' + F; x.fillText('Отчёт по продажам', 72, 184);
        x.fillStyle = '#d7b6ff'; x.font = '500 32px ' + F; x.fillText(human(rep.a, rep.b), 72, 234);
        [['Сумма оплат', RUB(c.sum), delta(c.sum, p.sum)], ['Продаж', NUM(c.n), delta(c.n, p.n)], ['Средний чек', RUB(c.avg), delta(c.avg, p.avg)], ['Покупателей', NUM(c.buyers), delta(c.buyers, p.buyers)]].forEach(function (t, i) {
          var X = 72 + (i % 2) * 476, Y = 284 + Math.floor(i / 2) * 186, w = 460, h = 170;
          rr(X, Y, w, h, 28); x.fillStyle = i ? 'rgba(255,255,255,.045)' : 'rgba(163,92,240,.16)'; x.fill(); x.strokeStyle = i ? 'rgba(255,255,255,.09)' : 'rgba(195,139,255,.35)'; x.lineWidth = 2; x.stroke();
          x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '500 22px ' + F; x.fillText(t[0].toUpperCase(), X + 32, Y + 52);
          x.fillStyle = '#fff'; x.font = '600 ' + (t[1].length > 11 ? 50 : 60) + 'px ' + F; x.fillText(t[1], X + 32, Y + 116);
          var d = t[2]; x.font = '600 22px ' + F; var dw = x.measureText(d.t).width + 24; rr(X + 32, Y + 130, dw, 30, 15); x.fillStyle = d.c === 'up' ? 'rgba(70,200,120,.18)' : d.c === 'down' ? 'rgba(255,90,90,.18)' : 'rgba(255,255,255,.1)'; x.fill();
          x.fillStyle = d.c === 'up' ? '#7be3a5' : d.c === 'down' ? '#ff9a9a' : '#fff'; x.fillText(d.t, X + 44, Y + 153);
          x.fillStyle = 'rgba(255,255,255,.4)'; x.font = '500 20px ' + F; x.fillText('к прошлому периоду', X + 32 + dw + 12, Y + 153) });
        var S = repSeries(rep.data.cur), cy = 690, chh = 140, cw = W - 144, mx = Math.max.apply(null, S.map(function (s) { return s.v }).concat([1])), bw = cw / Math.max(1, S.length);
        x.fillStyle = '#fff'; x.font = '600 28px ' + F; x.fillText('Оплаты', 72, cy);
        var bg = x.createLinearGradient(0, cy + 24, 0, cy + 24 + chh); bg.addColorStop(0, '#e2c9ff'); bg.addColorStop(1, '#8f4ff0');
        S.forEach(function (s, i) { var h = chh * s.v / mx, w = Math.max(3, Math.min(bw - 6, 48)); x.fillStyle = s.v ? bg : 'rgba(255,255,255,.08)'; rr(72 + bw * i + (bw - w) / 2, cy + 24 + chh - Math.max(h, 4), w, Math.max(h, 4), Math.min(6, w / 2)); x.fill() });
        var ty = 900; x.fillStyle = '#fff'; x.font = '600 28px ' + F; x.fillText('Тарифы', 72, ty);
        var top = T.slice(0, 5), mT = top.length ? top[0].n : 1;
        if (!top.length) { x.fillStyle = 'rgba(255,255,255,.5)'; x.font = '500 24px ' + F; x.fillText('Оплат за период нет', 72, ty + 56) }
        top.forEach(function (t, i) { var Y = ty + 28 + i * 56; x.font = '500 23px ' + F; x.fillStyle = '#fff'; x.fillText(fit(t.name, 700), 72, Y + 26);
          x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText((tn ? Math.round(t.n / tn * 100) : 0) + '%', 900, Y + 26); x.fillStyle = '#fff'; x.font = '600 23px ' + F; x.fillText(t.n + ' шт', W - 72, Y + 26); x.textAlign = 'left';
          rr(72, Y + 38, W - 144, 6, 3); x.fillStyle = 'rgba(255,255,255,.07)'; x.fill(); var lg = x.createLinearGradient(72, 0, W - 72, 0); lg.addColorStop(0, '#8f4ff0'); lg.addColorStop(1, '#d7b6ff'); rr(72, Y + 38, Math.max(8, (W - 144) * t.n / mT), 6, 3); x.fillStyle = lg; x.fill() });
        if (T.length > 5) { x.fillStyle = 'rgba(255,255,255,.45)'; x.font = '500 20px ' + F; x.fillText('и ещё ' + (T.length - 5) + ' — в кабинете', 72, ty + 28 + 5 * 56 + 22) }
        var now = new Date(); x.fillStyle = 'rgba(255,255,255,.35)'; x.font = '500 20px ' + F; x.fillText('Данные GetCourse · сформировано ' + dd(now) + ' в ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2), 72, H - 48);
        return new Promise(function (res) { cv.toBlob(function (b) { res(URL.createObjectURL(b)) }, 'image/png') }) }) };
    var modal = function (url) { var m = document.createElement('div'); m.className = 'fss-modal';
      var name = 'Продажи ' + (key(rep.a) === key(rep.b) ? dd(rep.a) : dd(rep.a) + '–' + dd(rep.b)) + '.png';
      m.innerHTML = '<div class="fss-mw"><img alt="Отчёт" src="' + url + '"><div class="fss-mb"><button type="button" class="p fss-dl">Скачать PNG</button><button type="button" class="fss-cp">Копировать</button><button type="button" class="fss-x">Закрыть</button></div></div>';
      document.body.appendChild(m);
      var close = function () { m.remove(); document.removeEventListener('keydown', kd) }, kd = function (e) { if (e.key === 'Escape') close() }; document.addEventListener('keydown', kd);
      m.addEventListener('click', function (e) { if (e.target === m) close() }); m.querySelector('.fss-x').onclick = close;
      m.querySelector('.fss-dl').onclick = function () { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove() };
      var cp = m.querySelector('.fss-cp'); cp.onclick = function () { fetch(url).then(function (r) { return r.blob() }).then(function (b) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]) }).then(function () { cp.textContent = 'Скопировано' }).catch(function () { cp.textContent = 'Не вышло — скачай' }) } };

    /* ---------- каркас страницы ---------- */
    var show = function () { [].forEach.call(root.querySelectorAll('.fss-tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === tab) });
      try { history.replaceState(null, '', '/pl/sales/dealstat?fs=' + tab) } catch (e) {}
      ({ overview: renderOverview, dynamics: renderDynamics, cumulative: renderCumulative, structure: renderStructure, report: renderReport })[tab]() };
    var mount = function () { if (document.querySelector('.fss')) return true;
      var host = document.querySelector('.standard-page-content') || document.querySelector('.rd-page-content, .rd-page, [class*="page-content"]') || document.querySelector('.gc-main-content .container') || document.querySelector('.gc-main-content');
      if (!host) return false;
      var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      host.classList.add('fss-host');
      root = document.createElement('div'); root.className = 'fss';
      root.innerHTML = '<div class="fss-top"><div><h1>Статистика продаж</h1><p>Данные GetCourse в реальном времени</p></div><a class="fss-gc" href="/pl/sales/dealstat?fs=gc">Классический вид GetCourse</a></div>'
        + '<div class="fss-tabs">' + TABS.map(function (t) { return '<button type="button" data-t="' + t[0] + '">' + t[1] + '</button>' }).join('') + '</div><div class="fss-body"></div>';
      host.insertBefore(root, host.firstChild); body = root.querySelector('.fss-body'); document.title = 'Статистика продаж';
      [].forEach.call(root.querySelectorAll('.fss-tabs button'), function (b) { b.onclick = function () { tab = b.getAttribute('data-t'); show() } });
      show(); return true };
    var tries = 0, go = function () { if (!mount() && ++tries < 40) setTimeout(go, 150) };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();
  /* брендинг OduvanovSchool: знак «кладка» в сайдбаре + подвал на страницах кабинета */
  (function () {
    if (window.top !== window) return;
    var MK = function (cls) { var s = '<svg class="' + cls + '" viewBox="0 0 64 64" aria-hidden="true">', S = 20, G = 2;
      [[0,0],[0,1],[1,0],[1,2],[2,0],[2,1],[2,2]].forEach(function (p) { s += '<rect x="' + p[1]*(S+G) + '" y="' + p[0]*(S+G) + '" width="20" height="20" rx="4"/>' });
      return s + '<rect class="a" x="44" y="0" width="20" height="20" rx="4"/></svg>' };
    var put = function () {
      var mi = document.querySelector('.main-menu__inner');
      if (mi && !mi.querySelector('.fs-brand')) { var b = document.createElement('a'); b.className = 'fs-brand'; b.href = '/teach/control/stream';
        b.title = 'OduvanovSchool'; b.setAttribute('aria-label', 'OduvanovSchool — на главную'); b.innerHTML = MK('fs-mk') + '<span class="fs-bw">Oduvanov<b>School</b></span>'; mi.insertBefore(b, mi.firstChild); var sp = document.createElement('i'); sp.className = 'fs-brand-sep'; sp.setAttribute('aria-hidden', 'true'); b.after(sp) }
      var pt = document.body && document.body.classList.contains('page-profile-index') && document.querySelector('.xdget-profileTitle');
      if (pt && !pt.querySelector('.fs-tmk')) { pt.classList.add('fs-ttl'); pt.insertAdjacentHTML('beforeend', '<i class="fs-tsep" aria-hidden="true"></i><span class="fs-tmk">' + MK('fs-mk') + '<span class="fs-tw">Oduvanov<b>School</b></span></span>');
        /* оптика: пустое поле справа от последней буквы имени вычитаем из отступа до точки */
        var rsb = function () { try { var cs = getComputedStyle(pt), cx = document.createElement('canvas').getContext('2d'), nm = (pt.firstChild && pt.firstChild.nodeType === 3 ? pt.firstChild.textContent : pt.textContent).trim(); cx.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; var m = cx.measureText(nm); pt.style.setProperty('--fs-rsb', Math.max(0, Math.min(8, m.width - m.actualBoundingBoxRight)).toFixed(1) + 'px') } catch (e) {} };
        rsb(); if (document.fonts) document.fonts.ready.then(rsb) }
      var al = document.querySelector('.top-menu .account-logo__link');
      if (al && !al.querySelector('.fs-mk')) { al.classList.add('fs-alogo'); al.innerHTML = MK('fs-mk') + '<span>Oduvanov<b>School</b></span>' }
      var mc = document.querySelector('.gc-main-content');
      if (mc && !document.querySelector('.fs-foot') && !/\/pl\/cms\/|editMode/.test(location.href)) { var f = document.createElement('div'); f.className = 'fs-foot';
        f.innerHTML = '<div class="fs-foot-g"><i class="fs-foot-o1"></i><i class="fs-foot-o2"></i><i class="fs-foot-o3"></i>'
          + '<a class="fs-foot-b" href="/teach/control/stream" aria-label="OduvanovSchool — на главную">' + MK('fs-mk') + '<span>Oduvanov<b>School</b></span></a>'
          + '<div class="fs-foot-c"><span>Онлайн-школа Романа Одуванова<sup>®</sup></span><small>© ' + new Date().getFullYear() + ' · Все права защищены</small></div>'
          + '<a class="fs-foot-l" href="https://t.me/zabota_oduvanov" target="_blank" rel="noopener">Служба заботы <i>→</i></a></div>';
        mc.appendChild(f) }
    };
    var n = 0, iv = setInterval(function () { put(); if (++n > 40) { clearInterval(iv); setInterval(put, 1500) } }, 250);
    document.addEventListener('DOMContentLoaded', put);
  })();
  /* иконка вкладки OduvanovSchool */
  (function () { var B = 'https://romanoduvanov.github.io/otzyvy/gc/brand/'; var put = function () { var h = document.head; if (!h) return;
    [].forEach.call(h.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]'), function (l) { l.remove() });
    [['icon', 'image/svg+xml', 'favicon.svg', ''], ['icon', 'image/png', 'favicon-32.png', '32x32'], ['apple-touch-icon', 'image/png', 'apple-touch-icon.png', '180x180']].forEach(function (a) {
      var l = document.createElement('link'); l.rel = a[0]; l.type = a[1]; l.href = B + a[2] + '?v=3'; if (a[3]) l.sizes = a[3]; h.appendChild(l) }) };
    put(); document.addEventListener('DOMContentLoaded', put) })();
  /* статус ученика в рейтинге: подсветка аватарки в сайдбаре и профиль на странице /pl/<id> */
  (function () {
    var RT = 'https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/';
    function sha(u) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode('gc2:' + u)).then(function (b) { return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2) }).join('').slice(0, 16) }) }
    function rows() { try { var c = JSON.parse(sessionStorage.getItem('fsRt') || 'null'); if (c && Date.now() - c.ts < 9e5) return Promise.resolve(c.r) } catch (e) {}
      return fetch(RT + 'data.json', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (D) { var r = D.rows.map(function (x) { return [x.h, x.place, x.pts, x.week] });
        try { sessionStorage.setItem('fsRt', JSON.stringify({ ts: Date.now(), r: r })) } catch (e) {} return r }) }
    function status(R, h) { var me = R.filter(function (x) { return x[0] === h })[0]; if (!me) return '';
      if (me[1] <= 3 && me[2] > 0) return 't' + me[1];
      var hot = R.filter(function (x) { return !(x[1] <= 3 && x[2] > 0) && x[3] >= 200 }).sort(function (a, b) { return b[3] - a[3] }).slice(0, 7);
      return hot.some(function (x) { return x[0] === h }) ? 'hot' : '' }
    var uid = window.accountUserId, pm = location.pathname.match(/^\/pl\/(\d+)\/?$/);
    if (!uid && !pm) return;
    var SC = {}; try { SC = JSON.parse(localStorage.getItem('fsSt') || '{}') } catch (e) {}
    var setC = function (pre, s) { var H = document.documentElement; ['t1', 't2', 't3', 'hot'].forEach(function (x) { H.classList.toggle(pre + x, x === s) }) };
    if (uid && SC[uid]) setC('fs-st-', SC[uid]); if (pm && SC[pm[1]]) setC('fs-pst-', SC[pm[1]]);
    rows().then(function (R) {
      if (uid) sha(uid).then(function (h) { var s = status(R, h); setC('fs-st-', s); SC[uid] = s; try { localStorage.setItem('fsSt', JSON.stringify(SC)) } catch (e) {} });
      if (pm) sha(pm[1]).then(function (h) { var s = status(R, h); setC('fs-pst-', s); SC[pm[1]] = s; try { localStorage.setItem('fsSt', JSON.stringify(SC)) } catch (e) {} });
    }).catch(function () {});
    /* левая карточка профиля: строки «Откуда / Регистрация» и единый блок кнопок */
    if (pm) { var tidy = function () { var c = document.querySelector('.xdget-userProfileSystemPage .col-md-3'); if (!c) return false; if (c.classList.contains('fs-tidy')) return true;
        var inf = c.querySelector('.xdget-profileInfo'); if (inf) { var rowsH = inf.innerHTML.split(/<br\s*\/?>/i).map(function (x) { var t = x.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); if (!t) return ''; var m = t.match(/^([^:]{1,30}):\s*(.+)$/);
          return m ? '<div class="fs-ir"><span>' + m[1] + '</span><b>' + m[2] + '</b></div>' : '<div class="fs-ir"><b>' + t + '</b></div>' }).join(''); inf.innerHTML = rowsH }
        var acts = document.createElement('div'); acts.className = 'fs-acts'; var lk = c.querySelector('.xdget-profileLike'); if (lk) acts.appendChild(lk); c.appendChild(acts);
        c.classList.add('fs-tidy'); return true };
      if (!tidy()) document.addEventListener('DOMContentLoaded', tidy) }
    /* «Мой профиль» в меню ведёт на оформленный профиль /pl/<id>; настройки — кнопкой оттуда */
    if (uid) document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href*="/user/my/profile"]'); if (!a || e.metaKey || e.ctrlKey) return;
      e.preventDefault(); e.stopPropagation(); var inMenu = a.closest('.main-menu');
      if (pm && String(uid) === pm[1] && !inMenu && window.fsOpenSettings) { window.fsOpenSettings(); return }
      location.href = '/pl/' + uid + (inMenu ? '' : '#settings') }, true);
    if (pm && (String(uid) === pm[1])) { var addBtn = function () { var c = document.querySelector('.xdget-userProfileSystemPage .col-md-3'); if (!c || c.querySelector('.fs-set')) return !!c;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'fs-set'; b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg><span>Настройки</span>'; b.onclick = function () { window.fsOpenSettings() }; (c.querySelector('.fs-acts') || c).appendChild(b); return true };
      if (!addBtn()) document.addEventListener('DOMContentLoaded', addBtn);

      /* ===== настройки профиля в нашем стиле (вместо стандартной страницы «Мой профиль») ===== */
      window.fsOpenSettings = function () { var ov = document.getElementById('fsd');
        if (!ov) { ov = document.createElement('div'); ov.id = 'fsd'; ov.className = 'fsd'; ov.innerHTML = '<div class="fsd-p" role="dialog" aria-modal="true" aria-label="Настройки профиля"><div class="fsd-h"><b>Настройки профиля</b><button type="button" class="fsd-x" aria-label="Закрыть">×</button></div><div class="fsd-b"><div class="fsd-load"><i></i><i></i><i></i><i></i></div></div><div class="fsd-f"><span class="fsd-s"></span><button type="button" class="fsd-save" disabled>Сохранить</button></div></div>';
          document.body.appendChild(ov); ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.fsd-x')) close() });
          document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('on')) close() }) }
        function close() { ov.classList.remove('on'); document.documentElement.style.overflow = ''; if (location.hash === '#settings') history.replaceState(null, '', location.pathname) }
        requestAnimationFrame(function () { ov.classList.add('on') }); document.documentElement.style.overflow = 'hidden'; load(ov) };
      function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
      function getForm() { return fetch('/user/my/profile', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.text() }).then(function (t) {
        var d = new DOMParser().parseFromString(t, 'text/html'); var f = [].filter.call(d.forms, function (x) { return x.querySelector('[name="User[first_name]"]') })[0]; return { d: d, f: f, t: t } }) }
      function load(ov) { var body = ov.querySelector('.fsd-b'), save = ov.querySelector('.fsd-save'), st = ov.querySelector('.fsd-s');
        getForm().then(function (g) { if (!g.f) throw 0; var f = g.f, v = function (n) { var e = f.querySelector('[name="' + n + '"]:not([type=hidden])') || f.querySelector('[name="' + n + '"]'); return e ? e.value : '' };
          var em = (g.t.match(/<strong>E-mail<\/strong>:\s*([^<\s]+)/) || [])[1] || '', ok = /title="Эл\. адрес подтвержден"/.test(g.t), hasPw = /Сменить пароль/.test(g.t);
          var cb = f.querySelector('input[type=checkbox][name^="mailingCategories"]'), sub = v('User[subscribe_status]'), tr = v('UserMessenger[main_transport_id]');
          var bd = v('User[birthday]'), bdIso = /^(\d{2})\.(\d{2})\.(\d{4})$/.test(bd) ? bd.replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, '$3-$2-$1') : '';
          var g2 = v('User[gender]'), lang = v('User[language]');
          var fld = function (k, label, val, type, ph) { return '<label class="fsd-fl"><span>' + label + '</span><input data-k="' + k + '" type="' + (type || 'text') + '" value="' + esc(val) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '></label>' };
          var seg = function (k, val, opts) { return '<div class="fsd-seg" data-k="' + k + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '"' + (o[0] === val ? ' class="on"' : '') + '>' + o[1] + '</button>' }).join('') + '</div>' };
          body.innerHTML =
            '<section><h4>Аватар</h4><div class="fsd-ava"><div class="fsd-av" style="background-image:url(' + esc((document.querySelector('.xdget-profileAvatar img') || {}).src || '') + ')"></div><div><b>Фото профиля</b><span>Его видят в сайдбаре, чатах и рейтинге потока</span><button type="button" class="fsd-btn2 fsd-avbtn">Загрузить новое фото</button></div></div></section>' +
            '<section><h4>Основное</h4><div class="fsd-g2">' + fld('User[first_name]', 'Имя', v('User[first_name]')) + fld('User[last_name]', 'Фамилия', v('User[last_name]')) +
              '<label class="fsd-fl"><span>День рождения</span><input data-k="bd" type="date" value="' + bdIso + '" max="' + new Date().toISOString().slice(0, 10) + '"></label>' + fld('User[phone]', 'Телефон', v('User[phone]'), 'tel', '+7 900 000-00-00') +
              fld('User[country]', 'Страна', v('User[country]')) + fld('User[city]', 'Город', v('User[city]')) + '</div>' +
              '<div class="fsd-fl"><span>Пол</span>' + seg('User[gender]', g2, [['', 'Не указан'], ['male', 'Мужской'], ['female', 'Женский']]) + '</div>' +
              '<label class="fsd-fl"><span>О себе</span><textarea data-k="user_content" rows="3" placeholder="Пара слов о тебе: чем занимаешься, к чему идёшь">' + esc(v('user_content')) + '</textarea></label></section>' +
            '<section><h4>Почта и вход</h4><div class="fsd-mail"><div><b>' + esc(em) + '</b><span class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ Почта подтверждена' : 'Почта не подтверждена — без этого можно пропустить важные письма') + '</span></div>' + (ok ? '' : '<button type="button" class="fsd-btn2 fsd-conf">Отправить письмо</button>') + '</div>' +
              '<details class="fsd-pw"><summary>' + (hasPw ? 'Сменить пароль' : 'Установить пароль') + '</summary><div class="fsd-g2">' + (hasPw ? '<label class="fsd-fl"><span>Текущий пароль</span><input data-k="ChangePasswordForm[primaryPassword]" type="password" autocomplete="current-password"></label>' : '') +
              '<label class="fsd-fl"><span>Новый пароль</span><input data-k="ChangePasswordForm[password]" type="password" autocomplete="new-password"></label><label class="fsd-fl"><span>Повтори пароль</span><input data-k="ChangePasswordForm[confirmPassword]" type="password" autocomplete="new-password"></label></div></details></section>' +
            '<section><h4>Уведомления</h4><div class="fsd-fl"><span>Какие письма получать</span>' + seg('User[subscribe_status]', sub, [['all', 'Все сообщения'], ['no_mailings', 'Только уведомления'], ['disabled', 'Ничего']]) + '</div>' +
              (cb ? '<label class="fsd-ck"><input type="checkbox" data-k="mc"' + (cb.checked ? ' checked' : '') + '><i></i><span>Общие рассылки школы — анонсы, эфиры, полезное</span></label>' : '') +
              '<div class="fsd-fl"><span>Куда присылать сообщения</span>' + seg('UserMessenger[main_transport_id]', tr || '0', [['0', 'Автоматически'], ['3', 'Telegram']]) + '</div>' +
              '<div class="fsd-fl"><span>Язык интерфейса</span>' + seg('User[language]', lang, [['', 'По умолчанию'], ['ru', 'Русский'], ['en', 'English']]) + '</div>' +
              '<a class="fsd-lnk" href="/pl/notifications/settings/my">Тонкая настройка уведомлений <i>→</i></a></section>';
          body.querySelectorAll('.fsd-seg').forEach(function (s) { s.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; s.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b) }); dirty() }) });
          body.addEventListener('input', dirty); body.addEventListener('change', dirty);
          var av = body.querySelector('.fsd-avbtn'); if (av) av.onclick = function () { var i = document.querySelector('.fs-ava-in'); if (i) i.click() };
          var cf = body.querySelector('.fsd-conf'); if (cf) cf.onclick = function () { cf.disabled = true; cf.textContent = 'Отправляем…';
            fetch('/user/my/sendConfirmEmail', { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'user_id=' + uid })
              .then(function (r) { return r.json().catch(function () { return {} }) }).then(function (r) { cf.textContent = 'Письмо отправлено ✓'; say((r && r.text) || 'Письмо отправлено — проверь почту и папку «Спам»') })
              .catch(function () { cf.disabled = false; cf.textContent = 'Отправить письмо'; say('Не получилось отправить письмо, попробуй ещё раз', 1) }) };
          function dirty() { save.disabled = false; st.textContent = ''; st.className = 'fsd-s' }
          function say(t, bad) { st.textContent = t; st.className = 'fsd-s on' + (bad ? ' bad' : '') }
          save.onclick = function () { save.disabled = true; save.textContent = 'Сохраняем…';
            var np = body.querySelector('[data-k="ChangePasswordForm[password]"]'), np2 = body.querySelector('[data-k="ChangePasswordForm[confirmPassword]"]');
            if (np && np.value && np.value !== np2.value) { save.disabled = false; save.textContent = 'Сохранить'; say('Пароли не совпадают', 1); return }
            getForm().then(function (g) { var fd = new FormData(g.f);
              ['ChangePasswordForm[primaryPassword]', 'ChangePasswordForm[password]', 'ChangePasswordForm[confirmPassword]'].forEach(function (k) { fd.delete(k) });
              body.querySelectorAll('input[data-k^="User"],input[data-k^="Change"],textarea[data-k]').forEach(function (e) { if (/^ChangePassword/.test(e.dataset.k) && !(np && np.value)) return; fd.set(e.dataset.k, e.value) });
              var bdv = body.querySelector('[data-k="bd"]').value; fd.set('User[birthday]', bdv ? bdv.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1') : '');
              body.querySelectorAll('.fsd-seg').forEach(function (s) { var b = s.querySelector('button.on'); if (b) fd.set(s.dataset.k, b.dataset.v) });
              var mc = body.querySelector('[data-k="mc"]'); if (mc) { fd.delete('mailingCategories[0]'); fd.append('mailingCategories[0]', '0'); if (mc.checked) fd.append('mailingCategories[0]', '1') }
              fd.delete('User[profile_image]'); fd.append('User[profile_image]', ''); fd.append('save', 'Сохранить');
              return fetch('/user/my/profile', { method: 'POST', body: fd, credentials: 'same-origin' }) }).then(function (r) { return r.text() }).then(function (t) {
                var d = new DOMParser().parseFromString(t, 'text/html'), errs = [].map.call(d.querySelectorAll('.errorSummary li,.errorMessage,.help-block-error,.alert-danger'), function (e) { return e.textContent.trim() }).filter(Boolean);
                save.textContent = 'Сохранить';
                if (errs.length) { save.disabled = false; say(errs.filter(function (x, i, a) { return a.indexOf(x) === i }).slice(0, 2).join(' · '), 1); return }
                say('Сохранено ✓'); body.querySelectorAll('input[type=password]').forEach(function (e) { e.value = '' });
                var nm = (body.querySelector('[data-k="User[first_name]"]').value + ' ' + body.querySelector('[data-k="User[last_name]"]').value).trim(), h = document.querySelector('.xdget-profileTitle'); if (nm && h) h.textContent = nm;
                try { sessionStorage.removeItem('fsRt') } catch (e) {} }).catch(function () { save.disabled = false; save.textContent = 'Сохранить'; say('Не получилось сохранить, попробуй ещё раз', 1) }) };
        }).catch(function () { body.innerHTML = '<p class="fsd-err">Не удалось загрузить настройки. Обнови страницу и попробуй ещё раз.</p>' }) }
      if (location.hash === '#settings') { var tryOpen = function () { if (document.body) window.fsOpenSettings(); else setTimeout(tryOpen, 50) }; setTimeout(tryOpen, 400) }
      /* смена аватарки прямо на странице: квадратная обрезка 600×600 и отправка формы «Мой профиль» */
      var addAva = function () { var box = document.querySelector('.xdget-profileAvatar'); if (!box || box.querySelector('.fs-ava-up')) return !!box;
        var lab = document.createElement('label'); lab.className = 'fs-ava-up'; lab.title = 'Загрузить фото';
        lab.innerHTML = '<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" class="fs-ava-in"><span class="fs-ava-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span><span class="fs-ava-t">Загрузить фото</span><span class="fs-ava-h">или перетащи сюда · JPG, PNG до 15 МБ</span>';
        box.appendChild(lab);
        box.classList.add('fs-ava-box'); if (box.querySelector('img.user-default-profile-image')) box.classList.add('fs-ava-empty');
        var msg = document.createElement('div'); msg.className = 'fs-ava-msg'; box.parentNode.insertBefore(msg, box.nextSibling);
        var say = function (t, bad) { msg.textContent = t; msg.className = 'fs-ava-msg on' + (bad ? ' bad' : ''); clearTimeout(say.t); say.t = setTimeout(function () { msg.className = 'fs-ava-msg' }, 4000) };
        ['dragenter', 'dragover'].forEach(function (ev) { box.addEventListener(ev, function (e) { e.preventDefault(); box.classList.add('drag') }) });
        ['dragleave', 'drop'].forEach(function (ev) { box.addEventListener(ev, function (e) { e.preventDefault(); box.classList.remove('drag') }) });
        box.addEventListener('drop', function (e) { var fl = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (fl) go(fl) });
        lab.querySelector('input').addEventListener('change', function () { var fl = this.files && this.files[0]; this.value = ''; if (fl) go(fl) });
        function go(file) {
          if (!/^image\//.test(file.type)) { say('Это не картинка — выбери JPG, PNG или WEBP', 1); return }
          if (file.size > 15 * 1024 * 1024) { say('Файл больше 15 МБ — выбери фото поменьше', 1); return }
          var o0 = box.querySelector('img'), prev = o0 && o0.getAttribute('src'), wasEmpty = box.classList.contains('fs-ava-empty');
          box.classList.add('busy'); lab.querySelector('.fs-ava-t').textContent = 'Загружаем…';
          var fail = function (m) { box.classList.remove('busy'); if (o0 && prev) o0.src = prev; if (wasEmpty) box.classList.add('fs-ava-empty'); lab.querySelector('.fs-ava-t').textContent = 'Загрузить фото';
            say(m || 'Не получилось загрузить фото. Попробуй ещё раз или загрузи в «Настройках профиля»', 1) };
          var img = new Image(), url = URL.createObjectURL(file);
          img.onload = function () { var s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 600;
            c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 600, 600); URL.revokeObjectURL(url);
            if (o0) { o0.src = c.toDataURL('image/jpeg', .85); box.classList.remove('fs-ava-empty') }
            c.toBlob(function (blob) { if (!blob) return fail();
              fetch('/user/my/profile', { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) {
                var f = [].filter.call(new DOMParser().parseFromString(t, 'text/html').forms, function (x) { return x.querySelector('[name="User[first_name]"]') })[0]; if (!f) throw 0;
                var fd = new FormData(f); fd.delete('User[profile_image]'); fd.append('User[profile_image]', ''); fd.append('User[profile_image]', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
                ['ChangePasswordForm[primaryPassword]', 'ChangePasswordForm[password]', 'ChangePasswordForm[confirmPassword]'].forEach(function (k) { fd.delete(k) });
                var sb = f.querySelector('[type=submit][name]'); if (sb && !fd.has(sb.name)) fd.append(sb.name, sb.value || '1');
                return fetch(f.getAttribute('action') || '/user/my/profile', { method: 'POST', body: fd, credentials: 'same-origin' }) })
              .then(function (r) { if (!r.ok) throw 0; return fetch(location.pathname, { credentials: 'same-origin', cache: 'no-store' }) }).then(function (r) { return r.text() })
              .then(function (t) { var n = new DOMParser().parseFromString(t, 'text/html').querySelector('.xdget-profileAvatar img'), o = box.querySelector('img');
                if (!n || /default_profile/.test(n.getAttribute('src'))) return fail();
                if (o) { o.src = n.getAttribute('src') + (n.getAttribute('src').indexOf('?') < 0 ? '?' : '&') + 'v=' + Date.now(); o.classList.remove('user-default-profile-image') }
                box.classList.remove('busy'); box.classList.add('done'); setTimeout(function () { box.classList.remove('done') }, 1600); lab.querySelector('.fs-ava-t').textContent = 'Сменить фото'; say('Фото обновлено — его увидят в сайдбаре, чатах и рейтинге');
                try { sessionStorage.removeItem('fsRt') } catch (e) {} })
              .catch(function () { fail() }) }, 'image/jpeg', .9) };
          img.onerror = function () { fail('Не удалось открыть картинку — попробуй JPG или PNG') }; img.src = url }
        if (!box.classList.contains('fs-ava-empty')) lab.querySelector('.fs-ava-t').textContent = 'Сменить фото'; return true };
      if (!addAva()) document.addEventListener('DOMContentLoaded', addAva) }
    if (pm) { var ins = function () { if (document.querySelector('iframe.fs-prof')) return true; var col = document.querySelector('.xdget-userProfileSystemPage .col-md-9') || document.querySelector('.xdget-userProfileSystemPage .xdget-row'); if (!col) return false;
        var f = document.createElement('iframe'); f.className = 'fs-prof'; f.title = 'Профиль на курсе'; f.src = RT + 'profile.html?v=25#u=' + pm[1] + (String(uid) === pm[1] ? '&me=1' : '');
        f.style.cssText = 'width:100%;height:0;border:0;display:block;background:transparent'; col.classList.remove('empty');
        var sk = document.createElement('div'); sk.className = 'fs-prof-sk'; sk.innerHTML = '<div class="sk-hd"><i class="sk-av"></i><div><i class="sk-l w40"></i><i class="sk-l w60 big"></i><i class="sk-l w50"></i></div></div><div class="sk-st"><i></i><i></i><i></i><i></i><i></i></div><i class="sk-l w100 bar"></i><div class="sk-gr"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="sk-gr three"><i></i><i></i><i></i></div>';
        col.appendChild(sk); col.appendChild(f); setTimeout(function () { if (sk.parentNode && !f.classList.contains('on')) sk.remove() }, 12000); return true };
      if (!ins()) document.addEventListener('DOMContentLoaded', ins);
      window.addEventListener('message', function (e) { if (e.origin !== 'https://romanoduvanov.github.io' || !e.data || e.data.fsProfH === undefined) return;
        [].forEach.call(document.querySelectorAll('iframe.fs-prof'), function (f) { f.style.setProperty('height', Math.ceil(e.data.fsProfH) + 'px', 'important');
          var sk = f.parentNode && f.parentNode.querySelector('.fs-prof-sk'); if (sk) sk.remove(); if (e.data.fsProfH > 0) f.classList.add('on') }) }) }
    /* «Поделиться результатом» — только в своём профиле, если ученик есть в рейтинге */
    if (pm && (String(uid) === pm[1])) {
      var shImgs = {}, shFmt = 'story', shWait = false, SHI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7.5 7.5L12 3l4.5 4.5M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"/></svg>';
      var SHF = [['story', 'Сторис', '9:16', '9/16'], ['post', 'Пост', '1:1', '1/1'], ['wide', 'Широкий', '16:9', '16/9']];
      var shBlock = function () { if (document.querySelector('.fs-share')) return; var lc = document.querySelector('.xdget-userProfileSystemPage .col-md-3'); if (!lc) return;
        var s = document.createElement('div'); s.className = 'fs-share';
        s.innerHTML = '<div class="fs-share-in"><div class="fs-share-ic">' + SHI + '</div><div class="fs-share-t">Поделись результатом</div>'
          + '<div class="fs-share-d">Карточка с твоим званием, баллами и достижениями — для сторис, поста в Telegram или чата</div>'
          + '<button type="button" class="fs-share-b">Поделиться <i>→</i></button></div>';
        lc.after(s); document.documentElement.classList.add('fs-has-share'); s.querySelector('.fs-share-b').addEventListener('click', shOpen) };
      /* фото ученика: GetCourse отдаёт его тем же доменом через /pl/fileservice — так картинку можно нарисовать на canvas */
      var shAva = function () { var im = document.querySelector('.xdget-profileAvatar img'); if (!im || im.classList.contains('user-default-profile-image') || /default/i.test(im.src)) return Promise.resolve(null);
        var m = im.src.match(/\/fileservice\/.+$/); if (!m) return Promise.resolve(null); var p = '/pl' + m[0], big = p.replace(/\/s\/\d+x\d+\//, '/s/600x600/');
        var get = function (u) { return fetch(u, { credentials: 'same-origin' }).then(function (r) { if (!r.ok || !/^image\//.test(r.headers.get('content-type') || '')) throw 0; return r.blob() }) };
        return get(big).catch(function () { return get(p) }).catch(function () { return null }) };
      var shM = null, shOpen = function () {
        if (!shM) { shM = document.createElement('div'); shM.className = 'fs-shm'; shM.innerHTML = '<div class="fs-shm-b" role="dialog" aria-modal="true" aria-label="Поделиться результатом"><button type="button" class="fs-shm-x" aria-label="Закрыть">×</button>'
            + '<div class="fs-shm-h">Твоя карточка</div><div class="fs-shm-f" role="tablist">' + SHF.map(function (f) { return '<button type="button" role="tab" data-f="' + f[0] + '"><b>' + f[1] + '</b><span>' + f[2] + '</span></button>' }).join('') + '</div>'
            + '<div class="fs-shm-p"><div class="fs-shm-ld"><i></i><i></i><i></i></div><img alt="Карточка с результатом"></div>'
            + '<div class="fs-shm-a"><button type="button" class="fs-shm-go">' + SHI + '<span>Поделиться</span></button><button type="button" class="fs-shm-dl">Сохранить картинку</button><button type="button" class="fs-shm-cp">Скопировать</button></div>'
            + '<div class="fs-shm-n"></div></div>';
          document.body.appendChild(shM);
          shM.addEventListener('click', function (e) { if (e.target === shM || e.target.closest('.fs-shm-x')) shClose(); var t = e.target.closest('.fs-shm-f button'); if (t) shSel(t.getAttribute('data-f')) });
          document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && shM.classList.contains('on')) shClose() });
          shM.querySelector('.fs-shm-go').addEventListener('click', shGo); shM.querySelector('.fs-shm-dl').addEventListener('click', shDl); shM.querySelector('.fs-shm-cp').addEventListener('click', shCp);
          if (!navigator.clipboard || !window.ClipboardItem) shM.querySelector('.fs-shm-cp').style.display = 'none'; shSel(shFmt) }
        shM.classList.add('on'); document.documentElement.classList.add('fs-shm-open');
        if (!shImgs.story && !shWait) { shWait = true; shM.classList.add('ld'); shAva().then(function (ava) { var f = document.querySelector('iframe.fs-prof'); if (f) f.contentWindow.postMessage({ fsShare: 1, ava: ava }, 'https://romanoduvanov.github.io') }) } };
      var shSel = function (f) { shFmt = f; var d = SHF.filter(function (z) { return z[0] === f })[0];
        [].forEach.call(shM.querySelectorAll('.fs-shm-f button'), function (b) { var on = b.getAttribute('data-f') === f; b.classList.toggle('on', on); b.setAttribute('aria-selected', on) });
        var p = shM.querySelector('.fs-shm-p'); p.style.aspectRatio = d[3]; p.setAttribute('data-f', f); shShow() };
      var shShow = function () { var b = shImgs[shFmt]; if (!b) return; var im = shM.querySelector('.fs-shm-p img'); im.onload = function () { shM.classList.remove('ld'); shM.classList.add('ok') }; if (im._u) URL.revokeObjectURL(im._u); im._u = URL.createObjectURL(b); im.src = im._u;
        var can = navigator.canShare && navigator.canShare({ files: [shFile()] }); shM.classList.toggle('can', !!can) };
      var shClose = function () { shM.classList.remove('on'); document.documentElement.classList.remove('fs-shm-open') };
      var shNote = function (t) { var n = shM.querySelector('.fs-shm-n'); n.textContent = t; n.classList.add('on'); clearTimeout(n._t); n._t = setTimeout(function () { n.classList.remove('on') }, 3500) };
      var shName = function () { return 'oduvanovschool-' + { story: 'stories', post: 'post', wide: 'wide' }[shFmt] + '.jpg' };
      var shFile = function () { return new File([shImgs[shFmt]], shName(), { type: 'image/jpeg' }) };
      var SHT = 'Мой прогресс на курсе «AI-креатор» в OduvanovSchool';
      var shGo = function () { if (!shImgs[shFmt]) return; var fl = shFile();
        if (navigator.canShare && navigator.canShare({ files: [fl] })) navigator.share({ files: [fl] }).catch(function () {});
        else { shDl(); shNote('Картинка сохранена — прикрепи её в Telegram, WhatsApp или в сторис') } };
      var shDl = function () { var b = shImgs[shFmt]; if (!b) return; var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = shName(); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove() }, 1500) };
      var shCp = function () { var b0 = shImgs[shFmt]; if (!b0) return; try { navigator.clipboard.write([new ClipboardItem({ 'image/png': createImageBitmap(b0).then(function (b) { var cv = document.createElement('canvas'); cv.width = b.width; cv.height = b.height; cv.getContext('2d').drawImage(b, 0, 0); return new Promise(function (ok) { cv.toBlob(ok, 'image/png') }) }) })]).then(function () { shNote('Скопировано — вставь картинку в чат (Ctrl/⌘ + V)') }, function () { shDl() }) } catch (e) { shDl() } };
      window.addEventListener('message', function (e) { if (e.origin !== 'https://romanoduvanov.github.io' || !e.data) return;
        if (e.data.fsProfH > 0) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', shBlock); else shBlock() }
        if (e.data.fsShareImgs && shM) { shImgs = e.data.fsShareImgs; shWait = false; shShow() }
        if (e.data.fsShareErr && shM) { shWait = false; shM.classList.remove('ld'); shNote('Не получилось собрать картинку, попробуй ещё раз') } }) }

    /* «Отчёт для родителей» — свой профиль; настройки хранятся на сервере OduvanovSchool */
    if (pm && String(uid) === pm[1] && window.FS_API && window.FS_API.indexOf('http') === 0) {
      var API = window.FS_API, PI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16.5 4.5a3 3 0 0 1 0 6M18 14c2 .6 3 2.5 3 5"/></svg>';
      var FQ = [[1, 'Каждый день'], [2, 'Раз в 2 дня'], [3, 'Раз в 3 дня'], [7, 'Раз в неделю']];
      var FQT = { 1: 'каждый день', 2: 'раз в 2 дня', 3: 'раз в 3 дня', 7: 'раз в неделю' };
      var pState = null, pEl = null, pM = null, pStudent = function () { var t = document.querySelector('.xdget-profileTitle'); var n = t && [].filter.call(t.childNodes, function (x) { return x.nodeType === 3 && x.textContent.trim() })[0]; return n ? n.textContent.trim() : '' };
      var pRender = function () { if (!pEl) return; var p = pState && pState.active ? pState : null;
        pEl.innerHTML = '<div class="fs-pr-hd"><div class="fs-pr-ic">' + PI + '</div><div class="fs-pr-t">Отчёт для родителей</div></div>'
          + (p ? '<div class="fs-pr-on' + (p.channel === 'tg' && !p.tg_ok ? ' wait' : '') + '"><div class="fs-pr-st"><i></i>' + (p.channel === 'tg' && !p.tg_ok ? 'Ждём родителя' : 'Подключён') + '</div><div class="fs-pr-to">' + (p.channel === 'tg' ? 'Telegram' + (p.tg_ok ? '' : ' · ссылка ещё не открыта') : p.email.replace(/[<>&"]/g, '')) + '</div><div class="fs-pr-fq">' + (FQT[p.freq] || '') + ', в ' + String(p.hour).padStart(2, '0') + ':00 по Москве</div></div>'
              + '<div class="fs-pr-acts"><button type="button" class="fs-pr-b2" data-a="edit">Изменить</button><a class="fs-pr-b2" href="' + API + '/preview?u=' + uid + '&f=' + p.freq + '" target="_blank" rel="noopener">Пример</a></div>' + (p.channel === 'tg' && !p.tg_ok ? '<button type="button" class="fs-pr-b fs-pr-link" data-a="link">Отправить ссылку родителю</button>' : '') + '<button type="button" class="fs-pr-off" data-a="off">Отключить отчёт</button>'
            : '<div class="fs-pr-d">Родители будут видеть твой прогресс: уроки, домашки, время за уроками и место в потоке — и смогут вовремя поддержать. Ты сам решаешь, кому и как часто отправлять.</div><button type="button" class="fs-pr-b" data-a="edit">Подключить отчёт</button>') };
      var pLoad = function () { fetch(API + '/parent?u=' + uid).then(function (r) { return r.json() }).then(function (j) { pState = j.p; pRender() }).catch(function () {}) };
      var pBlock = function () { if (pEl) return; var after = document.querySelector('.fs-share') || document.querySelector('.xdget-userProfileSystemPage .col-md-3'); if (!after) return;
        pEl = document.createElement('div'); pEl.className = 'fs-pr'; after.after(pEl); document.documentElement.classList.add('fs-has-pr'); pRender(); pLoad();
        pEl.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (!b) return; if (b.getAttribute('data-a') === 'edit') pOpen(); if (b.getAttribute('data-a') === 'link' && pState) pOpen(pState.tg_link); if (b.getAttribute('data-a') === 'off' && confirm('Отключить отчёты для родителей?')) { fetch(API + '/parent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u: uid, off: 1 }) }).then(pLoad) } }) };
      var pOpen = function (showLink) { var p = pState || {}, fq = p.freq || 7, ch = p.channel === 'tg' ? 'tg' : 'email';
        if (!pM) { pM = document.createElement('div'); pM.className = 'fs-shm fs-pm'; document.body.appendChild(pM);
          pM.addEventListener('click', function (e) { if (e.target === pM || e.target.closest('.fs-shm-x')) pClose() });
          document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pM.classList.contains('on')) pClose() }) }
        var hrs = ''; for (var h = 7; h <= 22; h++) hrs += '<option value="' + h + '"' + ((p.hour || 19) === h ? ' selected' : '') + '>' + String(h).padStart(2, '0') + ':00</option>';
        pM.innerHTML = '<div class="fs-shm-b fs-pm-b" role="dialog" aria-modal="true" aria-label="Отчёт для родителей"><button type="button" class="fs-shm-x" aria-label="Закрыть">×</button>'
          + '<div class="fs-shm-h">Отчёт для родителей</div>'
          + '<label class="fs-pm-l">Куда отправлять</label><div class="fs-shm-f fs-pm-ch"><button type="button"' + (ch === 'email' ? ' class="on"' : '') + ' data-c="email"><b>Почта</b></button><button type="button"' + (ch === 'tg' ? ' class="on"' : '') + ' data-c="tg"><b>Telegram</b></button></div>'
          + '<div class="fs-pm-em"' + (ch === 'tg' ? ' hidden' : '') + '><label class="fs-pm-l" for="fsPmE">Почта родителя</label><input class="fs-pm-i" id="fsPmE" type="email" inputmode="email" autocomplete="off" placeholder="mama@mail.ru" value="' + (p.email || '').replace(/"/g, '') + '"></div>'
          + '<div class="fs-pm-tgh"' + (ch === 'tg' ? '' : ' hidden') + '>После подключения появится ссылка — отправь её родителю. Он откроет бота @oduvanov_school_bot, нажмёт «Старт», и отчёты начнут приходить в Telegram.</div>'
          + '<div class="fs-pm-2"><div><label class="fs-pm-l" for="fsPmN">Как обращаться</label><input class="fs-pm-i" id="fsPmN" maxlength="40" placeholder="Мама" value="' + (p.name || '').replace(/"/g, '') + '"></div>'
          + '<div><label class="fs-pm-l" for="fsPmH">Во сколько (МСК)</label><select class="fs-pm-i" id="fsPmH">' + hrs + '</select></div></div>'
          + '<label class="fs-pm-l">Как часто</label><div class="fs-shm-f fs-pm-fq">' + FQ.map(function (f) { return '<button type="button" data-f="' + f[0] + '"' + (f[0] === fq ? ' class="on"' : '') + '><b>' + f[1] + '</b></button>' }).join('') + '</div>'
          + '<label class="fs-pm-c"><input type="checkbox" id="fsPmOk"' + (p.active ? ' checked' : '') + '><i></i><span>Разрешаю отправлять родителю мои учебные показатели. Отключить можно в любой момент.</span></label>'
          + '<button type="button" class="fs-pm-go">' + (p.active ? 'Сохранить' : 'Подключить и отправить пример') + '</button>'
          + '<a class="fs-pm-pv" href="' + API + '/preview?u=' + uid + '&f=' + fq + '" target="_blank" rel="noopener">Посмотреть пример отчёта</a><div class="fs-shm-n"></div></div>';
        pM.querySelectorAll('.fs-pm-fq button').forEach(function (b) { b.addEventListener('click', function () { fq = +b.getAttribute('data-f'); pM.querySelectorAll('.fs-pm-fq button').forEach(function (x) { x.classList.toggle('on', x === b) }); pM.querySelector('.fs-pm-pv').href = API + '/preview?u=' + uid + '&f=' + fq }) });
        var goLbl = function () { pM.querySelector('.fs-pm-go').textContent = p.active ? 'Сохранить' : ch === 'tg' ? 'Подключить Telegram' : 'Подключить и отправить пример' };
        pM.querySelectorAll('.fs-pm-ch button').forEach(function (b) { b.addEventListener('click', function () { ch = b.getAttribute('data-c'); pM.querySelectorAll('.fs-pm-ch button').forEach(function (x) { x.classList.toggle('on', x === b) });
          pM.querySelector('.fs-pm-em').hidden = ch === 'tg'; pM.querySelector('.fs-pm-tgh').hidden = ch !== 'tg'; goLbl() }) }); goLbl();
        var linkView = function (link, ok) { var share = 'https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent('Подключи, пожалуйста, отчёты о моей учёбе в OduvanovSchool — открой ссылку и нажми «Старт»');
          pM.querySelector('.fs-pm-b').innerHTML = '<button type="button" class="fs-shm-x" aria-label="Закрыть">×</button><div class="fs-shm-h">' + (ok ? 'Telegram подключён' : 'Отправь ссылку родителю') + '</div>'
            + '<div class="fs-pm-tgd">' + (ok ? 'Родитель уже подключился. Если нужно подключить ещё раз, отправь ту же ссылку.' : 'Родителю нужно открыть ссылку и нажать «Старт» — сразу придёт первый отчёт, а дальше по расписанию.') + '</div>'
            + '<div class="fs-pm-lnk"><span>' + link.replace('https://', '') + '</span><button type="button" class="fs-pm-cp">Копировать</button></div>'
            + '<a class="fs-pm-go" href="' + share + '" target="_blank" rel="noopener">Отправить в Telegram</a><div class="fs-shm-n"></div>';
          pM.querySelector('.fs-pm-cp').addEventListener('click', function () { var b = this; try { navigator.clipboard.writeText(link).then(function () { b.textContent = 'Скопировано'; setTimeout(function () { b.textContent = 'Копировать' }, 1600) }) } catch (e) {} }) };
        if (showLink) linkView(showLink, false);
        else pM.querySelector('.fs-pm-go').addEventListener('click', function () { var em = (pM.querySelector('#fsPmE') || {}).value || '', n = pM.querySelector('.fs-shm-n'), go = this; em = em.trim();
          var note = function (t, bad) { n.textContent = t; n.classList.toggle('bad', !!bad); n.classList.add('on') };
          if (ch === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return note('Проверь почту родителя', 1);
          if (!pM.querySelector('#fsPmOk').checked) return note('Нужно согласие на отправку показателей', 1);
          go.disabled = true; go.textContent = 'Сохраняю…';
          fetch(API + '/parent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u: uid, student: pStudent(), email: em, name: pM.querySelector('#fsPmN').value.trim(), hour: +pM.querySelector('#fsPmH').value, freq: fq, channel: ch, sendNow: !(pState && pState.active) }) })
            .then(function (r) { return r.json() }).then(function (j) { go.disabled = false; go.textContent = 'Сохранить';
              if (!j.ok) return note(j.err === 'email' ? 'Проверь почту родителя' : 'Не получилось сохранить, попробуй ещё раз', 1);
              if (ch === 'tg') { pLoad(); return linkView(j.tg_link, j.tg_ok) }
              note(j.sent && j.sent.ok ? 'Готово! Пример отчёта уже на почте' : 'Готово! Первый отчёт придёт по расписанию'); pLoad(); setTimeout(pClose, 1800) })
            .catch(function () { go.disabled = false; go.textContent = 'Подключить'; note('Нет связи с сервером, попробуй позже', 1) }) });
        requestAnimationFrame(function () { pM.classList.add('on'); document.documentElement.classList.add('fs-shm-open') }) };
      var pClose = function () { pM.classList.remove('on'); document.documentElement.classList.remove('fs-shm-open') };
      window.addEventListener('message', function (e) { if (e.origin === 'https://romanoduvanov.github.io' && e.data && e.data.fsProfH > 0) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pBlock); else pBlock() } }) }
  })();
  /* высота виджета «Актуальные события + кейсы» в списке тренингов */
  window.addEventListener('message', function (e) { if (e.origin !== 'https://romanoduvanov.github.io' || !e.data || !e.data.fsSchedH) return;
    [].forEach.call(document.querySelectorAll('iframe.fs-sched'), function (f) { f.style.setProperty('height', Math.ceil(e.data.fsSchedH) + 'px', 'important') }) });
  /* нет доступа к потоку AI-креатор 2.0 — в виджете остаются только «Истории учеников» */
  (function () { var na = function () { if (document.querySelector('tr.training-row[data-training-id="935917158"]')) return;
      [].forEach.call(document.querySelectorAll('iframe.fs-sched'), function (f) { if (f.src.indexOf('#na=1') < 0) f.src = f.src.split('#')[0] + '#na=1' }) };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', na); else na() })();
  if (!/^\/(pl\/)?teach\/control\/schedule/.test(location.pathname)) return;
  var ROOT = 935917158, SKIP = {935952152: 1};
  var MON = {'янв':0,'фев':1,'мар':2,'апр':3,'мая':4,'май':4,'июн':5,'июл':6,'авг':7,'сен':8,'окт':9,'ноя':10,'дек':11};
  var MS = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'], WD = ['вс','пн','вт','ср','чт','пт','сб'];
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function pd(s){var m=/(\d{1,2})\s+([А-Яа-я]{3})\S*\s+(\d{1,2}):(\d{2})/.exec(s||'');if(!m)return null;var now=new Date();
    var d=new Date(now.getFullYear(),MON[m[2].toLowerCase()],+m[1],+m[3],+m[4]);if(d-now>200*864e5)d.setFullYear(d.getFullYear()-1);if(now-d>200*864e5)d.setFullYear(d.getFullYear()+1);return d}
  function get(u){return fetch(u,{credentials:'same-origin'}).then(function(r){return r.ok?r.text():''}).then(function(t){return new DOMParser().parseFromString(t,'text/html')})}
  function walk(id,name,parts){return get('/teach/control/stream/view/id/'+id).then(function(d){
    var ls=[].slice.call(d.querySelectorAll('ul.lesson-list>li[data-lesson-id]')).map(function(li){var t=li.querySelector('.title');
      return {id:li.getAttribute('data-lesson-id'),t:((t&&t.childNodes[0]&&t.childNodes[0].textContent)||'').replace(/\s+/g,' ').trim(),d:pd((li.querySelector('.lesson-date')||{}).textContent)}});
    if(ls.length)parts.push({name:name,lessons:ls});
    var rows=[].slice.call(d.querySelectorAll('.stream-table tr.training-row'));
    return rows.reduce(function(p,tr){return p.then(function(){var st=tr.querySelector('.stream-title');return walk(tr.getAttribute('data-training-id'),(name?name+' · ':'')+(st?st.textContent.trim():''),parts)})},Promise.resolve())})}
  function when(d){return d.getDate()+' '+MS[d.getMonth()]}
  function hm(d){return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
  function tag(at){var now=new Date(),h=(now-at)/36e5;
    if(h>=0&&h<48)return '<span class="fs-sch-t x2">x2 ещё '+Math.max(1,Math.ceil(48-h))+' ч</span>';
    if(h>=48)return '<span class="fs-sch-t open">Открыт</span>';
    var days=Math.ceil(-h/24);return '<span class="fs-sch-t soon">'+(days<=1?'Завтра':'Через '+days+' '+(days%10==1&&days%100!=11?'день':days%10>=2&&days%10<=4&&(days%100<10||days%100>=20)?'дня':'дней'))+'</span>'}
  function render(box,mods){var now=new Date();
    mods=mods.filter(function(m){return m.at}).sort(function(a,b){return a.at-b.at});
    var openIdx=mods.findIndex(function(m){var h=(now-m.at)/36e5;return h<48});
    box.innerHTML='<div class="fs-sch-note">Уроки модуля открываются в указанное время. В первые 48 часов после открытия — x2 к баллам в рейтинге.</div>'+mods.map(function(m,i){var h=(now-m.at)/36e5;
      var n=m.parts.reduce(function(s,p){return s+p.lessons.length},0);
      var cls='fs-sch-m'+(h>=0&&h<48?' now':h>=48?' past':'')+(i===openIdx||(openIdx<0&&i===mods.length-1)?' open':'');
      return '<div class="'+cls+'"><div class="fs-sch-h" role="button" tabindex="0"><div class="fs-sch-d"><b>'+when(m.at)+'</b><span>'+WD[m.at.getDay()]+', '+hm(m.at)+'</span></div>'+
        '<div class="fs-sch-n"><b>'+esc(m.name)+'</b><span>'+n+' '+(n%10==1&&n%100!=11?'урок':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'урока':'уроков')+'</span></div>'+tag(m.at)+
        '<div class="fs-sch-c"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></div></div>'+
        '<div class="fs-sch-b">'+m.parts.map(function(p){var pa=p.lessons.map(function(l){return l.d}).filter(Boolean).sort(function(a,b){return a-b})[0];
          return '<div class="fs-sch-p">'+(p.name||pa?'<div><span>'+esc(p.name||'Уроки')+'</span>'+(pa?'<span>'+when(pa)+', '+hm(pa)+'</span>':'')+'</div>':'')+
            '<ol>'+p.lessons.map(function(l){return '<li><a href="/pl/teach/control/lesson/view?id='+l.id+'">'+esc(l.t)+'</a></li>'}).join('')+'</ol></div>'}).join('')+'</div></div>'}).join('');
    [].forEach.call(box.querySelectorAll('.fs-sch-h'),function(h){function t(){h.parentNode.classList.toggle('open')}h.addEventListener('click',t);h.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();t()}})})}
  function start(){var c=document.querySelector('.standard-page-content');if(!c||c.querySelector('.fs-sch'))return;
    var tbl=c.querySelector('table');if(tbl)tbl.style.display='none';
    var box=document.createElement('div');box.className='fs-sch';box.innerHTML='<div class="fs-sch-load"></div><div class="fs-sch-load"></div><div class="fs-sch-load"></div>';
    (tbl?tbl.parentNode.insertBefore(box,tbl):c.appendChild(box));
    var KEY='fsSch1';try{var c0=JSON.parse(sessionStorage.getItem(KEY)||'null');if(c0&&Date.now()-c0.ts<6e5){render(box,c0.m.map(function(m){m.at=new Date(m.at);m.parts.forEach(function(p){p.lessons.forEach(function(l){l.d=l.d?new Date(l.d):null})});return m}));return}}catch(e){}
    get('/teach/control/stream/view/id/'+ROOT).then(function(d){
      var mods=[].slice.call(d.querySelectorAll('.stream-table tr.training-row')).filter(function(tr){return !SKIP[tr.getAttribute('data-training-id')]}).map(function(tr){var st=tr.querySelector('.stream-title');return {id:tr.getAttribute('data-training-id'),name:st?st.textContent.replace(/\s+/g,' ').trim():'',parts:[]}});
      return Promise.all(mods.map(function(m){return walk(m.id,'',m.parts)})).then(function(){
        mods.forEach(function(m){var ds=[];m.parts.forEach(function(p){p.lessons.forEach(function(l){if(l.d)ds.push(l.d)})});m.at=ds.length?new Date(Math.min.apply(null,ds)):null});
        try{sessionStorage.setItem(KEY,JSON.stringify({ts:Date.now(),m:mods}))}catch(e){}
        render(box,mods)})}).catch(function(){box.remove();if(tbl)tbl.style.display=''})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
