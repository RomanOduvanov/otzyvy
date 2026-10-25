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
  /* ===== своя «Статистика»: /pl/sales/dealstat (?fs=sales|cumulative|clients|gc-table; ?fs=gc — классический вид GetCourse) ===== */
  (function () {
    if (window.top !== window) return;
    var path = location.pathname.replace(/\/+$/, ''), qs = new URLSearchParams(location.search), fsq = qs.get('fs');
    if (fsq === 'gc') return;
    if (/^\/pl\/sales\/stat\/cumulative$/.test(path)) { location.replace('/pl/sales/dealstat?fs=cumulative'); return }
    if (/^\/pl\/crm\/stat\/revenue-structure$/.test(path)) { location.replace('/pl/sales/dealstat?fs=clients'); return }
    if (!/^\/pl\/sales\/dealstat(\/index)?$/.test(path)) return;
    var TABS = [['sales', 'Продажи'], ['cumulative', 'Накопительная'], ['clients', 'Клиенты и LTV'], ['table', 'Как в GetCourse']];
    var tab = { report: 'sales', overview: 'sales', dynamics: 'sales', structure: 'clients' }[fsq] || (TABS.some(function (t) { return t[0] === fsq }) ? fsq : 'sales');
    document.documentElement.classList.add('fss-on');
    var hk = (location.hash.match(/fsk=([0-9a-f]{16,64})/) || [])[1]; if (hk) { try { localStorage.setItem('fsStatKey', hk) } catch (e) {} try { history.replaceState(null, '', location.pathname + location.search) } catch (e) {} }
    var statKey = function () { try { return localStorage.getItem('fsStatKey') || '' } catch (e) { return '' } };
    var API = window.FS_API && String(window.FS_API).indexOf('http') === 0 ? window.FS_API : 'https://oduvanov-api.romanoduvanov52.workers.dev';

    /* ---------- утилиты ---------- */
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    var NUM = function (n) { return Math.round(n || 0).toLocaleString('ru-RU').replace(/ /g, ' ') };
    var RUB = function (n) { return NUM(n) + ' ₽' };
    var SHORT = function (n) { n = n || 0; var a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '').replace('.', ',') + ' млн' : a >= 1e3 ? Math.round(n / 1e3) + ' тыс' : Math.round(n) + '' };
    var pl = function (n, f) { n = Math.abs(Math.round(n)); var a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2] };
    var money = function (s) { var m = String(s || '').replace(/[\s ]/g, '').match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : 0 };
    var dd = function (d) { return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear() };
    var day0 = function (d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d };
    var addD = function (d, n) { d = new Date(d); d.setDate(d.getDate() + n); return d };
    var key = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) };
    var ndays = function (a, b) { return Math.round((day0(b) - day0(a)) / 864e5) + 1 };
    var MONS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var MONN = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    var MONS3 = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    var WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    var MON3 = { 'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4, 'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11 };
    var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1) };
    var human = function (a, b, short) { var y = new Date().getFullYear(), Y = function (d) { return d.getFullYear() !== y ? ' ' + d.getFullYear() : '' }, M = short ? MONS3 : MONS;
      if (key(a) === key(b)) return a.getDate() + ' ' + M[a.getMonth()] + Y(a);
      if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return a.getDate() + '–' + b.getDate() + ' ' + M[b.getMonth()] + Y(b);
      return a.getDate() + ' ' + M[a.getMonth()] + (a.getFullYear() !== b.getFullYear() ? ' ' + a.getFullYear() : '') + ' — ' + b.getDate() + ' ' + M[b.getMonth()] + Y(b) };
    var MONP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
    var leadP = function (p) { var y = new Date().getFullYear(), Y = function (d) { return d.getFullYear() !== y ? ' ' + d.getFullYear() : '' };
      if (S.k === 'all') return 'За всё время'; if (key(p.a) === key(p.b)) return cap(human(p.a, p.b));
      if (p.a.getDate() === 1 && addD(p.b, 1).getDate() === 1 && p.a.getMonth() === p.b.getMonth()) return 'В ' + MONP[p.a.getMonth()] + Y(p.a);
      if (p.a.getMonth() === p.b.getMonth() && p.a.getFullYear() === p.b.getFullYear()) return 'С ' + p.a.getDate() + ' по ' + p.b.getDate() + ' ' + MONS[p.b.getMonth()] + Y(p.b);
      return 'С ' + p.a.getDate() + ' ' + MONS[p.a.getMonth()] + Y(p.a) + ' по ' + p.b.getDate() + ' ' + MONS[p.b.getMonth()] + Y(p.b) };
    var pct = function (cur, prev) { if (!prev) return null; return (cur - prev) / prev * 100 };
    var dchip = function (cur, prev, cmpLbl) { var p = pct(cur, prev); if (p == null) return '<span class="fss-dl">' + (prev === 0 && cur ? 'раньше было 0' : '&nbsp;') + '</span>';
      var c = p > 0.5 ? 'up' : p < -0.5 ? 'dn' : '', a = c === 'up' ? '↑' : c === 'dn' ? '↓' : '≈'; return '<span class="fss-dl ' + c + '"><b>' + a + ' ' + (Math.abs(p) < 10 ? Math.abs(p).toFixed(1).replace('.', ',') : Math.round(Math.abs(p))) + '%</b> ' + esc(cmpLbl || '') + '</span>' };

    /* ---------- данные GetCourse ---------- */
    var csrf = function (fd) { fd.append(window.csrfField || '_csrf', window.csrfToken || ''); return fd };
    var html = function (s) { return new DOMParser().parseFromString(s || '', 'text/html') };
    var payRule = function (a, b) { return JSON.stringify({ type: 'andrule', inverted: 0, params: { children: [{ type: 'deal_payed_at', inverted: 0, params: { value: { from: dd(a), to: dd(b), toNDays: '', fromNDays: '', dateType: '', withTime: false }, valueMode: null } }], mode: 'and' } }) };
    var C = {};
    /* поступления по дням за всё время (платежи со статусом «Получен») — одним запросом */
    var payments = function () { if (C.pay) return C.pay; var k = statKey();
      var gross = function () { return grossPayments().then(function (P) { P.gross = true; return P }) };
      if (!k) return C.pay = gross();
      return C.pay = fetch(API + '/fin?k=' + encodeURIComponent(k)).then(function (r) { if (!r.ok) throw new Error('fin'); return r.json() }).then(function (j) {
        if (!j || !j.ok || !j.days || !j.days.length) throw new Error('fin');
        var m = {}, first = null; j.days.forEach(function (d) { var dt = new Date(d[0] + 'T00:00'); m[d[0]] = { n: d[1], gross: d[2], fee: d[3], sum: d[4] }; if (!first || dt < first) first = dt });
        return { m: m, first: first, last: j.last || [], synced: j.synced } }).catch(gross) };
    var grossPayments = function () { var fd = csrf(new URLSearchParams({ rule: JSON.stringify({ type: 'andrule', inverted: 0, params: { children: [{ type: 'status', inverted: 0, params: { value: { selected_id: ['accepted'] }, valueMode: null } }], mode: 'and' } }), noLimit: 'true' }));
      return fetch('/pl/sales/control/payment/chart-data?PaymentStat%5BperiodType%5D=day', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(function (r) { return r.json() }).then(function (j) {
        var d = j.data, m = {}, first = null; (d.xAxis.categories || []).forEach(function (c, i) { var x = String(c).toLowerCase().match(/(\d{1,2})\s+([а-я]{3})[а-я]*\s+(\d{4})/); if (!x || MON3[x[2]] == null) return; var dt = new Date(+x[3], MON3[x[2]], +x[1]);
          m[key(dt)] = { sum: +(d.series[1].data[i] || 0), n: +(d.series[0].data[i] || 0) }; if (!first || dt < first) first = dt });
        Object.keys(m).forEach(function (kk) { m[kk].gross = m[kk].sum; m[kk].fee = 0 }); return { m: m, first: first || day0(new Date()) } }) };
    var paySum = function (P, a, b) { var s = 0, n = 0, g = 0, f = 0; for (var d = day0(a); d <= b; d = addD(d, 1)) { var x = P.m[key(d)]; if (x) { s += x.sum; n += x.n; g += x.gross || 0; f += x.fee || 0 } } return { sum: s, n: n, gross: g, fee: f } };
    /* оплаченные заказы за период: официальные итоги GetCourse */
    var dealTot = function (a, b) { var k = 't' + key(a) + key(b); if (C[k]) return C[k]; var fd = csrf(new URLSearchParams({ rule_string: payRule(a, b), locationId: '0' }));
      return C[k] = fetch('/pl/sales/dealstat/chartdata', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(function (r) { return r.json() }).then(function (j) { var t = {};
        [].forEach.call(html(j.tableHtml).querySelectorAll('tr'), function (tr) { var c = tr.querySelectorAll('td'); if (c.length < 4) return; var l = c[0].textContent.trim();
          var k2 = /оплачено/i.test(l) ? 'paid' : /Купило/i.test(l) ? 'buyers' : /предоплат/i.test(l) ? 'prepay' : /Заработано/i.test(l) ? 'earned' : null; if (k2) t[k2] = { n: money(c[1].textContent), sum: money(c[3].textContent) } });
        var n = (t.paid || {}).n || 0, s = (t.paid || {}).sum || 0; return { n: n, sum: s, avg: n ? s / n : 0, buyers: (t.buyers || {}).n || 0, earned: (t.earned || {}).sum || 0 } }) };
    /* список заказов по дате оплаты (для тарифов, продаж по дням, клиентов) */
    var parseWhen = function (s) { s = String(s || '').toLowerCase(); var now = new Date(), d = null, tm = s.match(/(\d{1,2}):(\d{2})/), m;
      if (/сегодня/.test(s)) d = day0(now); else if (/позавчера/.test(s)) d = addD(day0(now), -2); else if (/вчера/.test(s)) d = addD(day0(now), -1);
      else if ((m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/))) d = new Date(+m[3], +m[2] - 1, +m[1]);
      else if ((m = s.match(/(\d{1,2})\s+([а-я]{3})[а-я]*\.?(?:\s+(\d{4}))?/)) && MON3[m[2]] != null) { var y = m[3] ? +m[3] : now.getFullYear(); d = new Date(y, MON3[m[2]], +m[1]); if (!m[3] && d > now) d.setFullYear(y - 1) }
      if (d && tm) d.setHours(+tm[1], +tm[2], 0, 0); return d };
    var getPage = function (r, p) { return fetch('/pl/sales/deal/index?' + new URLSearchParams({ 'DealContext[segment_id]': '0', 'DealContext[rule_string]': r, page: p }), { credentials: 'same-origin' }).then(function (x) { return x.text() }).then(html) };
    var rowsOf = function (doc) { var th = [].map.call(doc.querySelectorAll('table thead tr:first-child th'), function (x) { return x.textContent.trim().toLowerCase() });
      var ix = function (re) { for (var i = 0; i < th.length; i++) if (re.test(th[i])) return i; return -1 };
      var I = { client: ix(/клиент/), items: ix(/состав/), status: ix(/статус/), cost: ix(/стоимость/) };
      return [].map.call(doc.querySelectorAll('table tbody tr[data-key]'), function (tr) { var c = tr.children, t = function (i) { return i >= 0 && c[i] ? c[i].textContent.trim().replace(/\s+/g, ' ') : '' };
        var a = I.client >= 0 && c[I.client] ? c[I.client].querySelector('a[data-user-id],a[href*="/user/update/id/"]') : null, uid = a ? (a.getAttribute('data-user-id') || ((a.getAttribute('href') || '').match(/\/id\/(\d+)/) || [])[1]) : null;
        return { id: tr.getAttribute('data-key'), uid: uid || 'deal' + tr.getAttribute('data-key'), client: t(I.client), title: t(I.items) || '—', cost: money(t(I.cost)), when: parseWhen(t(I.status).split(/Оплачено:\s*/i)[1] || '') } }) };
    var deals = function (a, b) { var k = 'd' + key(a) + key(b); if (C[k]) return C[k]; var r = payRule(a, b);
      return C[k] = getPage(r, 1).then(function (doc) { var first = rowsOf(doc), sm = ((doc.querySelector('.summary') || {}).textContent || '').replace(/[\s ]/g, ''), mm = sm.match(/из(\d+)/);
        var pages = Math.min(400, Math.ceil((mm ? +mm[1] : first.length) / Math.max(first.length, 1))), out = first.slice(), next = 2;
        var worker = function () { if (next > pages) return Promise.resolve(); var p = next++; return getPage(r, p).then(function (d) { out = out.concat(rowsOf(d)); return worker() }) };
        var ws = []; for (var i = 0; i < 6; i++) ws.push(worker());
        return Promise.all(ws).then(function () { var seen = {}; return out.filter(function (x) { if (seen[x.id] || !(x.cost > 0)) return false; seen[x.id] = 1; return true }) }) }) };
    var indexTable = function () { if (C.idx) return C.idx; var fd = csrf(new URLSearchParams({ rule_string: '', locationId: '0' }));
      return C.idx = fetch('/pl/sales/dealstat/indexdata', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(function (r) { return r.json() }).then(function (j) { var rows = [];
        [].forEach.call(html(j.tableHtml).querySelectorAll('tr[class*="field-"]'), function (tr) { var td = tr.querySelectorAll('td'); rows.push({ k: (tr.className.match(/field-(\w+)/) || [])[1], label: td[0].textContent.trim(), v: [].slice.call(td, 1).map(function (x) { return money(x.textContent) }) }) }); return rows }) };
    var structure = function () { if (C.st) return C.st; return C.st = fetch('/pl/crm/stat/revenue-structure', { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) { var d = html(t), g = [];
      var ch = d.querySelector('.gc-users-base-save-growth-dynamics--chart'); if (ch) { var nums = ch.querySelectorAll('p.number'), ms = ch.querySelectorAll('p.month'); for (var i = 0; i < nums.length; i++) g.push({ n: money(nums[i].textContent), m: (ms[i] ? ms[i].textContent : '').replace(/\s+/g, ' ').replace(/\s*'\d+/, '').trim() }) }
      var pc = d.querySelector('.gc-users-base-save-growth-dynamics--percent'), win = d.querySelector('.gc-users-base-save-proceeds-windows'), periods = [];
      if (win) [].forEach.call(win.children, function (w) { var it = [].map.call(w.querySelectorAll('h4'), function (h) { var box = h.parentElement; return { t: h.textContent.trim(), p: money((box.querySelector('.percent') || {}).textContent), s: ((box.querySelector('.sum') || {}).textContent || '').trim() } }); if (it.length) periods.push(it) });
      return { growth: g, pct: pc ? ((pc.querySelector('strong') || {}).textContent || '').trim() : '', add: pc ? ((pc.querySelector('p.number') || {}).textContent || '').trim() : '', periods: periods } }) };

    /* ---------- период и честное сравнение (как в банке) ---------- */
    var today = day0(new Date());
    var period = function (k) { var t = today, y = t.getFullYear(), mo = t.getMonth(), m;
      if (k === 'today') return { a: t, b: t, pa: addD(t, -1), pb: addD(t, -1), name: 'Сегодня' };
      if (k === 'yest') return { a: addD(t, -1), b: addD(t, -1), pa: addD(t, -2), pb: addD(t, -2), name: 'Вчера' };
      if ((m = k.match(/^d(\d+)$/))) { var n = +m[1], a = addD(t, -n + 1); return { a: a, b: t, pa: addD(a, -n), pb: addD(a, -1), name: 'Последние ' + n + ' ' + pl(n, ['день', 'дня', 'дней']) } }
      if (k === 'month') { var ms = new Date(y, mo, 1), pms = new Date(y, mo - 1, 1), pend = new Date(y, mo, 0); return { a: ms, b: t, pa: pms, pb: new Date(y, mo - 1, Math.min(t.getDate(), pend.getDate())), name: 'Этот месяц' } }
      if ((m = k.match(/^m(\d{4})-(\d{1,2})$/))) { var Y = +m[1], M = +m[2]; return { a: new Date(Y, M, 1), b: new Date(Y, M + 1, 0) > t ? t : new Date(Y, M + 1, 0), pa: new Date(Y, M - 1, 1), pb: new Date(Y, M, 0), name: cap(MONN[M]) + ' ' + Y } }
      if (k === 'year') return { a: new Date(y, 0, 1), b: t, pa: new Date(y - 1, 0, 1), pb: new Date(y - 1, mo, t.getDate()), name: 'Этот год' };
      if (k === 'all') return { a: null, b: t, pa: null, pb: null, name: 'Всё время' };
      if ((m = k.match(/^c(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/))) { var A = new Date(m[1] + 'T00:00'), B = new Date(m[2] + 'T00:00'), L = ndays(A, B); return { a: A, b: B, pa: addD(A, -L), pb: addD(A, -1), name: 'Свой период' } }
      return period('month') };
    var S = { k: 'month', gran: null, metric: 'rev', money: 'net' };
    try { var sk = sessionStorage.getItem('fssP'); if (sk) S.k = sk } catch (e) {}
    var P = function () { var p = period(S.k); if (!p.a) p.a = (C.payV && C.payV.first) || new Date(2020, 0, 1); return p };

    /* ---------- ряды для графика ---------- */
    var dayKeys = function (a, b) { var o = []; for (var d = day0(a); d <= b; d = addD(d, 1)) o.push(new Date(d)); return o };
    var bucket = function (days, gran) { if (gran === 'day') return days.map(function (d) { return [d] });
      var out = [], cur = null, kk = null; days.forEach(function (d, i) { var g = gran === 'week' ? Math.floor(i / 7) : d.getFullYear() * 12 + d.getMonth(); if (g !== kk) { cur = []; out.push(cur); kk = g } cur.push(d) }); return out };
    var lbl = function (b, gran, axis) { var a = b[0], z = b[b.length - 1];
      if (gran === 'day') return axis ? a.getDate() + (a.getDate() === 1 || b === null ? ' ' + MONS3[a.getMonth()] : '') : WD[a.getDay()] + ', ' + a.getDate() + ' ' + MONS[a.getMonth()];
      if (gran === 'week') return axis ? a.getDate() + ' ' + MONS3[a.getMonth()] : human(a, z, true);
      return axis ? MONS3[a.getMonth()] : cap(MONN[a.getMonth()]) + ' ' + a.getFullYear() };
    var autoGran = function (n) { return n <= 45 ? 'day' : n <= 200 ? 'week' : 'month' };
    var grans = function (n) { return [['day', 'Дни', n <= 400], ['week', 'Недели', n >= 14], ['month', 'Месяцы', n >= 45]] };

    /* ---------- график: линия + пунктир прошлого периода, наведение ---------- */
    var line = function (el, cur, prev, o) { o = o || {}; var W = Math.max(320, el.clientWidth || 800), H = o.h || 280, L = 64, R = 12, B = 30, T = 14, n = cur.length;
      var mx = 0; cur.concat(prev || []).forEach(function (p) { if (p && p.v > mx) mx = p.v });
      var nice = function (v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p, st = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]; for (var i = 0; i < st.length; i++) if (f <= st[i]) return st[i] * p; return 10 * p }; mx = nice(mx); if (o.int) mx = Math.max(4, Math.ceil(mx / 4) * 4);
      var X = function (i) { return n <= 1 ? L + (W - L - R) / 2 : L + (W - L - R) * i / (n - 1) }, Y = function (v) { return T + (H - T - B) * (1 - (v || 0) / mx) };
      var fmt = o.fmt || SHORT, g = '';
      for (var i = 0; i <= 4; i++) { var y = Y(mx * i / 4); g += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 10) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(mx * i / 4) + '</text>' }
      var step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L) / 64))));
      cur.forEach(function (p, i) { if (i % step === 0 || (n < 14)) g += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(p.ax) + '</text>' });
      var path = function (arr) { var d = ''; arr.forEach(function (p, i) { if (!p) return; d += (d ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1) }); return d };
      if (prev && prev.length) g += '<path class="pv" d="' + path(prev.slice(0, Math.max(n, 1))) + '"/>';
      var dc = path(cur); if (n > 1) g += '<path class="ar" d="' + dc + 'L' + X(n - 1) + ' ' + (H - B) + 'L' + X(0) + ' ' + (H - B) + 'Z"/>';
      g += '<path class="cu" d="' + dc + '"/>';
      if (n <= 40) cur.forEach(function (p, i) { g += '<circle class="dt" cx="' + X(i) + '" cy="' + Y(p.v) + '" r="3"/>' });
      g += '<line class="xh" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '"/><circle class="hp" r="5"/><circle class="hq" r="4"/>';
      el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '">' + g + '<rect class="ov" x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '" fill="transparent"/></svg><div class="fss-tip"></div>';
      var svg = el.querySelector('svg'), tip = el.querySelector('.fss-tip'), xh = svg.querySelector('.xh'), hp = svg.querySelector('.hp'), hq = svg.querySelector('.hq'), ov = svg.querySelector('.ov');
      var move = function (e) { var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, i = n <= 1 ? 0 : Math.round((x - L) / ((W - L - R) / (n - 1))); i = Math.max(0, Math.min(n - 1, i)); var p = cur[i], q = prev && prev[i];
        xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); hp.setAttribute('cx', X(i)); hp.setAttribute('cy', Y(p.v)); if (q) { hq.setAttribute('cx', X(i)); hq.setAttribute('cy', Y(q.v)) } svg.classList.add('on'); svg.classList.toggle('noq', !q);
        tip.innerHTML = '<div class="r"><i class="c"></i><span>' + esc(p.t) + '</span><b>' + (o.tf || RUB)(p.v) + '</b></div>' + (p.x ? '<div class="x">' + esc(p.x) + '</div>' : '') + (q ? '<div class="r"><i class="p"></i><span>' + esc(q.t) + '</span><b>' + (o.tf || RUB)(q.v) + '</b></div>' : '');
        var px = X(i) / W * r.width; tip.style.left = Math.min(Math.max(px, 120), r.width - 120) + 'px'; tip.style.opacity = 1 };
      ov.addEventListener('mousemove', move); ov.addEventListener('mouseleave', function () { svg.classList.remove('on'); tip.style.opacity = 0 }) };

    /* ---------- стили (токены «фиолетового стиля» и кабинета) ---------- */
    var CSS = ':root.fss-on .fss-host>*:not(.fss){display:none!important}'
      + '.fss{--s0:#0c0c0c;--s1:#161616;--s2:#1f1f1f;--ink2:rgba(255,255,255,.55);--ink3:rgba(255,255,255,.44);--hair:rgba(255,255,255,.08);--acc:#d77fff;--lil:#c38bff;color:#fff;font-family:"Inter Tight",Inter,system-ui,sans-serif;font-feature-settings:"tnum";padding:0 0 64px}.fss *{box-sizing:border-box}'
      + '.fss-hd{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:8px 0 24px;border-bottom:1px solid var(--hair);margin-bottom:24px}'
      + '.fss-hd h1{margin:0!important;font-size:48px!important;font-weight:500!important;letter-spacing:-.03em!important;line-height:1.06!important;color:#fff!important}.fss-acts{display:flex;gap:10px;align-items:center;flex-wrap:wrap}'
      + '.fss-btn{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px;border-radius:12px;border:1px solid var(--hair);background:var(--s1);color:#fff;font:500 14px/1 inherit;cursor:pointer;white-space:nowrap;transition:background .15s,border-color .15s}.fss-btn:hover{background:var(--s2);border-color:rgba(255,255,255,.14)}.fss-btn svg{width:16px;height:16px;flex:none}'
      + '.fss-btn.pri{background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;border:0;font-weight:600;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),0 16px 48px -12px rgba(252,203,255,.35)}.fss-btn.pri:hover{filter:brightness(1.03)}.fss-btn:disabled{opacity:.45;cursor:default}'
      + '.fss-per{position:relative}.fss-per .fss-btn small{color:var(--ink2);font-size:12px;font-weight:500}.fss-per .fss-btn .ch{opacity:.6}'
      + '.fss-menu{position:absolute;right:0;top:46px;z-index:50;width:300px;max-height:min(70vh,560px);overflow:auto;background:#121212;border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:6px;box-shadow:0 24px 60px -20px rgba(0,0,0,.8)}'
      + '.fss-menu button{display:flex;justify-content:space-between;width:100%;border:0;background:transparent;color:#fff;text-align:left;padding:10px 12px;border-radius:10px;font:500 14px/1.2 inherit;cursor:pointer}.fss-menu button span{color:var(--ink3);font-weight:400;font-size:12px}.fss-menu button:hover{background:rgba(255,255,255,.06)}.fss-menu button.on{background:rgba(195,139,255,.14)}'
      + '.fss-menu hr{border:0;border-top:1px solid var(--hair);margin:6px 4px}.fss-menu .lb{padding:8px 12px 4px;color:var(--ink3);font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:600}'
      + '.fss-cus{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px 6px 6px}.fss-cus input{width:100%;background:var(--s1);border:1px solid var(--hair);color:#fff;border-radius:10px;padding:8px;font:inherit;font-size:13px;color-scheme:dark}.fss-cus .fss-btn{grid-column:1/3;justify-content:center;height:36px}'
      + '.fss-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:28px}.fss-tabs button{border:1px solid var(--hair);background:var(--s1);color:rgba(255,255,255,.75);height:40px;padding:0 18px;border-radius:12px;font:500 14px/1 inherit;cursor:pointer;transition:.15s}.fss-tabs button:hover{color:#fff;background:var(--s2)}.fss-tabs button.on{background:#fff;color:#000106;border-color:#fff}'
      + '.fss-lead{text-wrap:balance;margin:0 0 24px;font-size:28px;line-height:1.25;font-weight:500;letter-spacing:-.02em;max-width:980px}.fss-lead em{font-style:normal;color:var(--acc)}.fss-lead span{color:var(--ink2)}'
      + '.fss-card{background:var(--s1);border:1px solid var(--hair);border-radius:22px;padding:24px;min-width:0}.fss-card+.fss-card,.fss-row+.fss-card,.fss-card+.fss-row{margin-top:16px}'
      + '.fss-sec{font-size:22px;font-weight:500;letter-spacing:-.02em;margin:0 0 4px}.fss-sub{color:var(--ink2);font-size:13px;margin:0 0 18px}'
      + '.fss-row{display:grid;grid-template-columns:1.35fr 1fr;gap:16px}.fss-row3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}@media(max-width:1000px){.fss-row,.fss-row3{grid-template-columns:1fr}}'
      + '.fss-mt{display:grid;grid-template-columns:repeat(4,1fr);margin:-24px -24px 20px;border-bottom:1px solid var(--hair)}@media(max-width:900px){.fss-mt{grid-template-columns:repeat(2,1fr)}}'
      + '.fss-m{position:relative;padding:20px 24px 18px;border:0;background:transparent;color:#fff;text-align:left;font:inherit;min-width:0}.fss-m+.fss-m{box-shadow:inset 1px 0 0 var(--hair)}.fss-m.can{cursor:pointer}.fss-m.can:hover{background:rgba(255,255,255,.025)}'
      + '.fss-m:first-child{border-top-left-radius:22px}.fss-m.on{background:rgba(195,139,255,.07)}.fss-m.on:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--lil)}'
      + '.fss-m>i{display:block;font-style:normal;color:var(--ink2);font-size:14px}.fss-m>b{display:block;font-size:32px;font-weight:500;letter-spacing:-.02em;margin:6px 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.fss-dl{display:block;font-size:13px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fss-dl b{font-weight:600;color:var(--ink2)}.fss-dl.up b{color:var(--acc)}.fss-dl.dn b{color:#ff8f8f}'
      + '.fss-ctl{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px}.fss-leg{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:var(--ink2)}.fss-leg i{display:inline-block;width:18px;height:0;border-top:2px solid var(--lil);margin-right:8px;vertical-align:middle}.fss-leg i.p{border-top:2px dashed rgba(255,255,255,.35)}'
      + '.fss-seg{display:inline-flex;padding:3px;border-radius:10px;background:var(--s0);border:1px solid var(--hair)}.fss-seg button{border:0;background:transparent;color:var(--ink2);height:30px;padding:0 12px;border-radius:8px;font:500 13px/1 inherit;cursor:pointer}.fss-seg button.on{background:var(--s2);color:#fff}.fss-seg button:disabled{opacity:.3;cursor:default}'
      + '.fss-ch{position:relative}.fss-ch svg{display:block;overflow:visible}.fss-ch .gl{stroke:rgba(255,255,255,.06)}.fss-ch text{fill:var(--ink3);font-size:11px;font-family:inherit}'
      + '.fss-ch .cu{fill:none;stroke:var(--lil);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}.fss-ch .ar{fill:rgba(150,87,232,.12)}.fss-ch .pv{fill:none;stroke:rgba(255,255,255,.32);stroke-width:1.5;stroke-dasharray:4 4}.fss-ch .dt{fill:var(--s1);stroke:var(--lil);stroke-width:1.5}'
      + '.fss-ch .xh{stroke:rgba(255,255,255,.18);opacity:0}.fss-ch .hp{fill:var(--lil);stroke:var(--s1);stroke-width:2;opacity:0}.fss-ch .hq{fill:#8a8a8a;stroke:var(--s1);stroke-width:2;opacity:0}.fss-ch svg.on .xh,.fss-ch svg.on .hp,.fss-ch svg.on .hq{opacity:1}.fss-ch svg.noq .hq{opacity:0!important}'
      + '.fss-tip{position:absolute;top:-6px;transform:translate(-50%,-100%);pointer-events:none;background:#0c0c0c;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 12px;font-size:13px;min-width:220px;opacity:0;transition:opacity .12s;z-index:5}'
      + '.fss-tip .r{display:flex;align-items:center;gap:8px;white-space:nowrap}.fss-tip .r+.r{margin-top:6px}.fss-tip .r span{color:var(--ink2);flex:1}.fss-tip .r b{font-weight:600}.fss-tip i{width:10px;height:2px;flex:none}.fss-tip i.c{background:var(--lil)}.fss-tip i.p{border-top:2px dashed rgba(255,255,255,.5)}.fss-tip .x{color:var(--ink3);font-size:12px;margin:2px 0 0 18px}'
      + '.fss-t{width:100%;border-collapse:collapse;font-size:14px}.fss-t th{color:var(--ink3);font-weight:500;font-size:12px;text-align:right;padding:0 10px 10px;white-space:nowrap}.fss-t th:first-child,.fss-t td:first-child{text-align:left;padding-left:0}.fss-t th:last-child,.fss-t td:last-child{padding-right:0}'
      + '.fss-t td{padding:12px 10px;border-top:1px solid var(--hair);text-align:right;white-space:nowrap}.fss-t td:first-child{white-space:normal}.fss-t td.b{font-weight:600}.fss-t td.m{color:var(--ink2)}.fss-t tr.sum td{font-weight:600}.fss-t tr.hl td{background:rgba(195,139,255,.06)}.fss-t a{color:#fff!important;text-decoration:none!important}.fss-t a:hover{color:var(--acc)!important}'
      + '.fss-bar{display:block;height:4px;border-radius:4px;background:rgba(255,255,255,.06);margin-top:8px;overflow:hidden}.fss-bar i{display:block;height:100%;border-radius:4px;background:var(--lil)}.fss-n{color:var(--ink3);font-size:12px;margin-top:3px}.fss-scroll{overflow-x:auto}'
      + '.fss-kv{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}@media(max-width:1000px){.fss-kv{grid-template-columns:repeat(2,1fr)}}.fss-kv>div{background:var(--s1);border:1px solid var(--hair);border-radius:22px;padding:20px 24px}.fss-kv>div>i{display:block;font-style:normal;color:var(--ink2);font-size:14px}.fss-kv>div>b{display:block;font-size:32px;font-weight:500;letter-spacing:-.02em;margin:6px 0}.fss-kv small{display:block;color:var(--ink3);font-size:13px;line-height:1.35}'
      + '.fss-strip{display:flex;flex-wrap:wrap;gap:6px 28px;margin:-6px 0 18px;padding:0 0 16px;border-bottom:1px solid var(--hair);font-size:13px;color:var(--ink2)}.fss-strip b{color:#fff;font-weight:600}.fss-note{margin:-8px 0 16px;padding:12px 16px;border-radius:14px;background:rgba(195,139,255,.08);border:1px solid rgba(195,139,255,.2);color:#e6d4ff;font-size:13px}.fss-sw{display:inline-flex;align-items:center;gap:4px;margin-left:8px;vertical-align:1px;color:var(--ink3)}.fss-sw i{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.22)}.fss-sw i.on{background:var(--lil)}.fss-sw svg{width:13px;height:13px;margin-left:3px}.fss-m.on .fss-sw{color:#fff}.fss-strip .sw{cursor:pointer;border-bottom:1px dashed transparent}.fss-strip .sw:hover{color:#fff}.fss-strip .sw.on{color:#fff;border-bottom-color:var(--lil)}.fss-hint{margin-left:auto;color:var(--ink3);border-bottom:1px dashed rgba(255,255,255,.25);cursor:help}.fss-load{padding:80px 0;text-align:center;color:var(--ink2)}.fss-load:after{content:"";display:block;width:26px;height:26px;margin:16px auto 0;border-radius:50%;border:2px solid rgba(195,139,255,.18);border-top-color:var(--lil);animation:fssr .8s linear infinite}@keyframes fssr{to{transform:rotate(360deg)}}.fss-empty{padding:32px 0;text-align:center;color:var(--ink2)}'
      + '.fss-sk{height:16px;border-radius:8px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.08),rgba(255,255,255,.04));background-size:200% 100%;animation:fsss 1.2s ease infinite;margin:10px 0}@keyframes fsss{to{background-position:-200% 0}}'
      + '.fss-stack{display:flex;height:12px;border-radius:6px;overflow:hidden;gap:2px;margin:4px 0 20px}.fss-stack i{display:block;height:100%}.fss-dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px;vertical-align:0}'
            + ':root body .fss .fss-hd{display:flex;align-items:center!important;justify-content:space-between;padding:56px 0 32px!important;margin:0 0 28px!important;border-bottom:1px solid var(--hair)}:root body .fss .fss-hd h1{margin:0!important;padding:0!important;font-size:52px!important;line-height:1!important;letter-spacing:-.03em!important}'
      + ':root body .fss .fss-acts{align-items:center}:root body .fss .fss-hd .fss-btn{height:44px;border-radius:14px}:root body .fss a.fss-btn,:root body .fss a.fss-btn:hover{color:#fff!important;text-decoration:none!important}'
      + '.fss-lead b.up{color:#4ade80;font-weight:500}.fss-lead b.dn{color:#ff6b6b;font-weight:500}.fss-dl.up b{color:#4ade80!important}.fss-dl.dn b{color:#ff6b6b!important}.dn{color:#ff8a8a}'
      + '.fss-note{display:flex!important;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 16px!important;padding:16px 20px!important;border-radius:18px!important}.fss-note>svg{width:28px;height:28px;color:#c38bff;flex:none}.fss-note>div{flex:1;min-width:240px}.fss-note b{display:block;color:#fff;font-size:15px;font-weight:600}.fss-note span{color:rgba(255,255,255,.6);font-size:13px}.fss-note input{width:260px;height:40px;background:#0c0c0c;border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:12px;padding:0 12px;font:inherit}'
      + '.fss-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px}@media(max-width:1000px){.fss-kpis{grid-template-columns:repeat(2,1fr)}}'
      + '.fss-k{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:0;text-align:left;background:var(--s1);border:1px solid var(--hair);border-radius:22px;padding:20px 22px 18px;color:#fff;font:inherit;min-width:0;transition:border-color .15s,background .15s}'
      + '.fss-k.can{cursor:pointer}.fss-k.can:hover{border-color:rgba(255,255,255,.16)}.fss-k.on{border-color:rgba(195,139,255,.6);background:linear-gradient(160deg,rgba(150,87,232,.16),rgba(22,22,22,0) 60%),var(--s1)}'
      + '.fss-kh{display:flex;align-items:center;gap:10px;width:100%}.fss-ic{width:36px;height:36px;border-radius:11px;background:#242424;display:grid;place-items:center;color:#c38bff;flex:none}.fss-ic svg{width:19px;height:19px}.fss-k.on .fss-ic{background:#c38bff;color:#1a0b2e}'
      + '.fss-kl{color:var(--ink2);font-size:14px;flex:1}.fss-kv2{display:block;font-size:34px;font-weight:500;letter-spacing:-.02em;margin:16px 0 6px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}'
      + '.fss-flow{background:var(--s1);border:1px solid var(--hair);border-radius:22px;padding:18px 22px;margin-bottom:16px}.fss-flowbar{display:flex;height:10px;border-radius:6px;overflow:hidden;gap:2px;background:rgba(255,255,255,.04)}.fss-flowbar i{background:linear-gradient(90deg,#6724ad,#c38bff)}.fss-flowbar s{background:#ff6b6b;opacity:.75}'
      + '.fss-flowt{display:flex;flex-wrap:wrap;gap:8px 28px;margin-top:12px;font-size:13px;color:var(--ink2)}.fss-flowt b{color:#fff;font-weight:600;margin-left:4px}.fss-flowt .f b{color:#ff8a8a}.fss-flowt .n b{color:#d7b6ff}.fss-flowt .g{margin-left:auto}.fss-q{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;border:1px solid rgba(255,255,255,.3);font-size:10px;font-style:normal;margin-left:6px;cursor:help;vertical-align:1px}'
      + '.fss-sec{display:flex;align-items:center;gap:10px}.fss-hi{width:20px;height:20px;color:#c38bff;flex:none}.fss-tag{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:3px 8px;margin-left:4px}'
      + '.fss-plan{margin:0 0 16px!important}.fss-planr{display:flex;align-items:center;gap:12px}.fss-planr b{font-size:40px;font-weight:500;letter-spacing:-.02em}.fss-planr span{color:var(--ink2);font-size:13px;max-width:90px;line-height:1.25}.fss-pe{width:40px;padding:0;justify-content:center}'
      + '.fss-pbar{position:relative;height:14px;border-radius:8px;background:rgba(255,255,255,.06);margin:22px 0 8px}.fss-pbar .got{position:absolute;left:0;top:0;bottom:0;border-radius:8px;background:linear-gradient(90deg,#6724ad,#9657e8 60%,#c38bff)}.fss-pbar .fc{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(135deg,rgba(195,139,255,.35) 0 6px,rgba(195,139,255,.12) 6px 12px);border-radius:0 8px 8px 0}'
      + '.fss-pbar s{position:absolute;top:-5px;bottom:-5px;width:2px;margin-left:-1px;background:rgba(255,255,255,.45);border-radius:2px}.fss-pbar s.ok{background:#4ade80}.fss-plabs{position:relative;height:20px;font-size:12px;color:var(--ink3)}.fss-plabs span{position:absolute;transform:translateX(-50%);white-space:nowrap}.fss-plabs span:last-child{transform:translateX(-100%)}.fss-plabs span.ok{color:#4ade80}'
      + '.fss-pnote{margin-top:14px;color:var(--ink2);font-size:14px;line-height:1.45}.fss-pnote b{color:#fff;font-weight:600}.fss-pform{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:16px;padding-top:16px;border-top:1px solid var(--hair)}.fss-pform label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--ink2)}.fss-pform input{width:150px;height:40px;background:#0c0c0c;border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:12px;padding:0 12px;font:inherit}'
      + '.fss-row2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0;align-items:stretch}.fss-row2>.fss-card{margin:0!important}.fss-row>.fss-card{margin-top:0!important}@media(max-width:1100px){.fss-row2{grid-template-columns:1fr}}'
      + '.fss-dwrap{display:flex;gap:24px;align-items:flex-start}@media(max-width:700px){.fss-dwrap{flex-direction:column}}.fss-dn{width:168px;height:168px;flex:none}.fss-dn circle[data-i]{transition:opacity .15s,stroke-width .15s}.hl .fss-dn circle[data-i]{opacity:.25}.hl .fss-dn circle.on{opacity:1;stroke-width:20}.fss-dn .c1{fill:#fff;font-size:20px;font-weight:600;font-family:inherit}.fss-dn .c2{fill:rgba(255,255,255,.5);font-size:11px;font-family:inherit}'
      + '.fss-lg2{flex:1;min-width:0;display:flex;flex-direction:column}.fss-lr{border-top:1px solid var(--hair)}.fss-lr:first-child{border-top:0}.fss-lh{display:grid;grid-template-columns:12px 1fr auto auto 40px 16px;align-items:center;gap:10px;width:100%;padding:11px 0;background:none;border:0;color:#fff;font:inherit;font-size:14px;text-align:left;cursor:pointer}.fss-lh.st{grid-template-columns:12px 1fr auto auto 40px;cursor:default;padding-bottom:2px}'
      + '.fss-lh.nx{cursor:default}.fss-lh.nx .ch{visibility:hidden}.fss-t th.l,.fss-t td.l{text-align:left}.fss-lh>i{width:12px;height:12px;border-radius:4px}.fss-lh .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fss-lh .ct{color:var(--ink3);font-size:13px}.fss-lh b{font-weight:600;white-space:nowrap}.fss-lh em{font-style:normal;color:var(--ink3);font-size:12px;text-align:right}.fss-lh .ch{width:16px;height:16px;color:var(--ink3);transition:transform .2s}.fss-lr.open .ch{transform:rotate(180deg)}'
      + '.fss-lt{display:none;padding:0 0 10px 22px}.fss-lr.open .fss-lt{display:block}.fss-lt>div{display:grid;grid-template-columns:1fr auto auto;gap:10px;padding:6px 0;font-size:13px;color:var(--ink2)}.fss-lt b{color:#fff;font-weight:500;min-width:90px;text-align:right}.fss-lt small{color:#ff9f6b;font-size:11px;margin-left:6px}.fss-ln{padding:0 0 11px 22px;font-size:12px;color:var(--ink3)}'
      + '.fss-mt2{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;color:var(--ink2);font-size:13px}.fss-mt2 i{width:8px;height:8px;border-radius:3px}.fss-more{margin-top:14px}'
      + '.fss-modal{position:fixed;inset:0;background:rgba(0,1,6,.86);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px}.fss-mw{display:flex;flex-direction:column;align-items:center;gap:16px;max-height:100%}.fss-mw img{max-height:calc(100vh - 120px);max-width:100%;border-radius:22px;border:1px solid rgba(255,255,255,.08)}.fss-mb{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}';

    var root, body;
    var loading = function (t) { body.innerHTML = '<div class="fss-load">' + (t || 'Загружаю данные GetCourse…') + '</div>' };
    var fail = function () { body.innerHTML = '<div class="fss-empty">GetCourse не отдал данные. Обнови страницу или открой <a href="/pl/sales/dealstat?fs=gc" style="color:#d77fff">классический вид</a>.</div>' };
    var cmpName = function (p) { return p.pa ? human(p.pa, p.pb) : '' };

    /* ---------- вкладка «Продажи» ---------- */
    var MODES = { net: { l: 'На вывод', s: 'после комиссий GetCourse и банков', lead: ' на вывод пришло ' }, gross: { l: 'Оплачено клиентами', s: 'до комиссий', lead: ' клиенты заплатили ' }, gc: { l: 'Сумма оплат GetCourse', s: 'как в стандартной статистике', lead: ' по GetCourse оплачено на ' } };
    var gcBucket = function (b) { return dealTot(day0(b[0]), day0(b[b.length - 1])).then(function (t) { return t.sum }) };
    var pool = function (arr, fn) { var out = new Array(arr.length), i = 0; var w = function () { if (i >= arr.length) return Promise.resolve(); var j = i++; return fn(arr[j]).then(function (v) { out[j] = v; return w() }) }; var ws = []; for (var k = 0; k < 6; k++) ws.push(w()); return Promise.all(ws).then(function () { return out }) };
    /* ---------- продукты, тарифы, способы оплаты ---------- */
    var PAL = ['#8f6af0', '#d95926', '#199e70', '#c98500', '#d55181', '#3987e5'], OTHER = '#4a4a4a', UP = '#4ade80', DN = '#ff6b6b';
    var splitTitle = function (t) { t = String(t || '').trim(); var inst = /\(в\s*рассрочку\)/i.test(t), c = t.replace(/\s*\(в\s*рассрочку\)\s*/ig, ' ').replace(/\s+/g, ' ').trim(), i = c.lastIndexOf(' - ');
      return i > 0 ? { prod: c.slice(0, i).trim(), tar: c.slice(i + 3).trim(), inst: inst } : { prod: c || 'Без названия', tar: '', inst: inst } };
    var METHODS = [['card', 'Картой и СБП', '#8f6af0'], ['inst', 'Рассрочка и кредит', '#d95926'], ['direct', 'Другие сервисы (Appex, Продамус, РР)', '#199e70']];
    var methodOf = function (x) { if (!/геткурс|getcourse/i.test(x.type || 'Геткурс')) return 'direct'; return x.sum && x.fee / x.sum > .06 ? 'inst' : 'card' };
    var shortProd = function (t) { return String(t).replace(/\s+с\s+0\s+до\s+PRO\s+/i, ' ').replace(/\s+/g, ' ').trim() };
    var groupProducts = function (items) { var m = {}; items.forEach(function (x) { var s = splitTitle(x.title), nm = shortProd(s.prod) + (s.tar ? ' · ' + s.tar : ''), g = m[nm] = m[nm] || { name: nm, prod: s.prod, tar: s.tar, n: 0, v: 0, inst: 0, tars: [] }; g.n++; g.v += x.v; if (s.inst) g.inst++ });
      var arr = Object.keys(m).map(function (k) { return m[k] }).sort(function (a, b) { return b.v - a.v });
      if (arr.length > 6) { var rest = arr.slice(5), o = { name: 'Другое', n: 0, v: 0, inst: 0, tars: [], other: 1 }; rest.forEach(function (g) { o.n += g.n; o.v += g.v; o.tars.push({ name: g.name, n: g.n, v: g.v, inst: g.inst }) }); arr = arr.slice(0, 5).concat([o]) }
      arr.forEach(function (g, i) { g.c = g.other ? OTHER : PAL[i % PAL.length] }); return arr };
    var groupMethods = function (list) { var m = {}; list.forEach(function (x) { var k = methodOf(x), g = m[k] = m[k] || { n: 0, sum: 0, fee: 0, net: 0 }; g.n++; g.sum += x.sum; g.fee += x.fee; g.net += x.net });
      return METHODS.filter(function (d) { return m[d[0]] }).map(function (d) { var g = m[d[0]]; return { k: d[0], name: d[1], c: d[2], n: g.n, sum: g.sum, fee: g.fee, net: g.net, v: g.net } }) };
    var finList = function (a, b, pa, pb) { var k = statKey(), ck = 'fl' + key(a) + key(b) + (pa ? key(pa) + key(pb) : ''); if (!k) return Promise.reject(new Error('nokey')); if (C[ck]) return C[ck];
      return C[ck] = fetch(API + '/fin?k=' + encodeURIComponent(k) + '&from=' + key(a) + '&to=' + key(b) + (pa ? '&pfrom=' + key(pa) + '&pto=' + key(pb) : '')).then(function (r) { return r.json() })
        .then(function (j) { if (!j || !j.ok) throw new Error('fin'); if (!j.list || (j.list.length && !('email' in j.list[0]))) throw new Error('old'); C.plans = j.plans || {}; return { list: j.list || [], plist: j.plist, plans: j.plans || {} } }) };
    var ICON = {
      wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5Z"/><circle cx="16" cy="13.5" r="1.2"/>',
      bag: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
      receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
      users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 19a5 5 0 0 0-2.4-4.3"/>',
      target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/>',
      pie: '<path d="M12 3v9h9"/><path d="M20.5 15A9 9 0 1 1 9 3.5"/>',
      card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
      list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
      edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>' };
    var ico = function (n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + '</svg>' };
    var donut = function (items, center, sub) { var R = 64, C2 = 2 * Math.PI * R, tot = items.reduce(function (s, x) { return s + Math.max(0, x.v) }, 0) || 1, off = 0, gap = items.length > 1 ? 3 : 0;
      return '<svg class="fss-dn" viewBox="0 0 160 160"><circle cx="80" cy="80" r="' + R + '" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="16"/>' + items.map(function (x, i) { var len = Math.max(0, x.v) / tot * C2, seg = Math.max(0, len - gap);
          var s = '<circle data-i="' + i + '" cx="80" cy="80" r="' + R + '" fill="none" stroke="' + x.c + '" stroke-width="16" stroke-dasharray="' + seg.toFixed(2) + ' ' + (C2 - seg).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 80 80)"/>'; off += len; return s }).join('')
        + '<text x="80" y="76" text-anchor="middle" class="c1">' + esc(center) + '</text><text x="80" y="98" text-anchor="middle" class="c2">' + esc(sub) + '</text></svg>' };
    var planOf = function (mk) { var p = (C.plans || {})[mk]; return p && p.ideal ? p : { min: 3e6, opt: 4e6, ideal: 5e6, def: 1 } };

    var renderSales = function () { var tok = S.tok = Math.random(); loading();
      payments().then(function (PAY) { C.payV = PAY; if (tok !== S.tok) return; var p = P(), n = ndays(p.a, p.b);
        var g = S.gran && grans(n).some(function (x) { return x[0] === S.gran && x[2] }) ? S.gran : autoGran(n);
        var rc = paySum(PAY, p.a, p.b), rp = p.pa ? paySum(PAY, p.pa, p.pb) : null, cmp = cmpName(p);
        var modes = PAY.gross ? ['gross', 'gc'] : ['net', 'gross', 'gc']; if (modes.indexOf(S.money) < 0) S.money = modes[0];
        var mk = p.a.getFullYear() + '-' + ('0' + (p.a.getMonth() + 1)).slice(-2), inMonth = !PAY.gross && p.a.getMonth() === p.b.getMonth() && p.a.getFullYear() === p.b.getFullYear() && p.a.getDate() === 1 && n >= 1;
        body.innerHTML = '<p class="fss-lead" id="fssLead"></p>'
          + (PAY.gross ? '<div class="fss-note">' + ico('wallet') + '<div><b>Подключи чистые деньги «на вывод»</b><span>Сейчас суммы до комиссий. Вставь ключ доступа один раз — браузер его запомнит.</span></div><input class="fss-key" placeholder="ключ доступа"><button type="button" class="fss-btn pri fss-keygo">Подключить</button></div>' : '')
          + '<div class="fss-kpis" id="fssMT"></div>'
          + (PAY.gross ? '' : '<div class="fss-flow" id="fssFlow"></div>')
          + (inMonth ? '<div class="fss-card fss-plan" id="fssPlan"></div>' : '')
          + '<div class="fss-card"><div class="fss-ctl"><div><div class="fss-sec">' + ico('pie').replace('<svg', '<svg class="fss-hi"') + 'Динамика</div><div class="fss-leg"><span><i></i>' + esc(human(p.a, p.b)) + '</span>' + (rp ? '<span><i class="p"></i>' + esc(cmp) + '</span>' : '') + '</div></div>'
          + '<div class="fss-seg" id="fssG">' + grans(n).map(function (x) { return '<button type="button" data-g="' + x[0] + '"' + (x[2] ? '' : ' disabled') + (x[0] === g ? ' class="on"' : '') + '>' + x[1] + '</button>' }).join('') + '</div></div><div class="fss-ch" id="fssC"></div></div>'
          + '<div class="fss-row2"><div class="fss-card"><div class="fss-sec">' + ico('bag').replace('<svg', '<svg class="fss-hi"') + 'Что продали</div><p class="fss-sub" id="fssProdSub">продукты и тарифы за период</p><div id="fssProd"><div class="fss-sk"></div><div class="fss-sk"></div><div class="fss-sk"></div></div></div>'
          + '<div class="fss-card"><div class="fss-sec">' + ico('card').replace('<svg', '<svg class="fss-hi"') + 'Как платили</div><p class="fss-sub">способы оплаты и сколько съела комиссия</p><div id="fssMeth"><div class="fss-sk"></div><div class="fss-sk"></div><div class="fss-sk"></div></div></div></div>'
          + '<div class="fss-card"><div class="fss-sec">' + ico('list').replace('<svg', '<svg class="fss-hi"') + 'Все оплаты за период</div><p class="fss-sub" id="fssAllSub">новые сверху</p><div id="fssAll"><div class="fss-sk"></div><div class="fss-sk"></div></div></div>';
        var kg = body.querySelector('.fss-keygo'); if (kg) kg.onclick = function () { var v = (body.querySelector('.fss-key').value || '').trim(); if (!/^[0-9a-f]{16,64}$/.test(v)) return; try { localStorage.setItem('fsStatKey', v) } catch (e) {} C = {}; S.money = 'net'; renderSales() };
        var st = { rc: rc, rp: rp, p: p, g: g, PAY: PAY, cur: null, prev: null, dl: null, dlp: null, fl: null, mk: mk, inMonth: inMonth };
        S.view = st;
        var money = function (mode, which) { var r = which === 'p' ? rp : rc, t = which === 'p' ? st.prev : st.cur; if (!r) return null; return mode === 'net' ? r.sum : mode === 'gross' ? r.gross : t ? t.sum : null };
        var lead = function () { var el = body.querySelector('#fssLead'); if (!el) return; var md = S.money, v = money(md), v0 = money(md, 'p'), t = st.cur;
          el.innerHTML = leadP(p) + MODES[md].lead + '<em>' + (v == null ? '…' : RUB(v)) + '</em>' + (t ? ' и&nbsp;' + (pl(t.n, [1, 2, 2]) === 1 ? 'закрыта' : 'закрыто') + ' <em>' + NUM(t.n) + '</em>&nbsp;' + pl(t.n, ['продажа', 'продажи', 'продаж']) : '')
            + (rp && v != null && v0 != null ? '<br><span>' + (v0 ? 'Это ' + (v >= v0 ? '<b class="up">на ' + Math.round(pct(v, v0)) + '% больше</b>' : '<b class="dn">на ' + Math.round(-pct(v, v0)) + '% меньше</b>') + ', чем за ' + esc(cmp) + ' (' + RUB(v0) + ')' : 'За ' + esc(cmp) + ' оплат не было') + '</span>' : '') };
        var flow = function () { var el = body.querySelector('#fssFlow'); if (!el || !rc.gross) { if (el) el.style.display = 'none'; return } var fp = rc.fee / rc.gross * 100;
          el.innerHTML = '<div class="fss-flowbar"><i style="width:' + (100 - fp).toFixed(2) + '%"></i><s style="width:' + fp.toFixed(2) + '%"></s></div><div class="fss-flowt"><span>Клиенты заплатили <b>' + RUB(rc.gross) + '</b></span><span class="f">Комиссии GetCourse и банков <b>−' + RUB(rc.fee) + '</b> · ' + fp.toFixed(1).replace('.', ',') + '%</span><span class="n">На вывод <b>' + RUB(rc.sum) + '</b></span>'
            + '<span class="g">В статистике GetCourse <b>' + (st.cur ? RUB(st.cur.sum) : '…') + '</b><i class="fss-q" title="Оплачено клиентами — все принятые платежи, включая предоплаты и доплаты. На вывод — то же за вычетом комиссий GetCourse и банков. В статистике GetCourse — оплаты только по заказам, которые полностью оплачены в этом периоде.">?</i></span></div>' };
        var metrics = function () { var t = st.cur, q = st.prev, md = S.money, v = money(md), v0 = money(md, 'p'), dd2 = function (a, b) { return a != null && b != null && rp ? dchip(a, b, 'к ' + cmp) : '' }, mm = [
            { k: 'rev', ic: 'wallet', l: MODES[md].l, v: v == null ? '…' : RUB(v), d: dd2(v, v0) || '<span class="fss-dl">' + MODES[md].s + '</span>', can: 1 },
            { k: 'cnt', ic: 'bag', l: 'Продажи', v: t ? NUM(t.n) : '…', d: t && q ? dd2(t.n, q.n) : '<span class="fss-dl">оплаченных заказов</span>', can: 1 },
            { k: 'avg', ic: 'receipt', l: 'Средний чек', v: t ? RUB(t.avg) : '…', d: t && q ? dd2(t.avg, q.avg) : '<span class="fss-dl">на один заказ</span>' },
            { k: 'buy', ic: 'users', l: 'Покупатели', v: t ? NUM(t.buyers) : '…', d: t && q ? dd2(t.buyers, q.buyers) : '<span class="fss-dl">уникальных людей</span>' }];
          var mt = body.querySelector('#fssMT'); if (!mt) return;
          mt.innerHTML = mm.map(function (m) { var sw = m.k === 'rev' ? '<span class="fss-sw" title="Нажми ещё раз: на вывод → оплачено → GetCourse">' + modes.map(function (x) { return '<i' + (x === md ? ' class="on"' : '') + '></i>' }).join('') + '</span>' : '';
            return '<button type="button" class="fss-k' + (m.can ? ' can' : '') + (S.metric === m.k ? ' on' : '') + '" data-k="' + m.k + '"' + (m.can ? '' : ' tabindex="-1"') + '><span class="fss-kh"><span class="fss-ic">' + ico(m.ic) + '</span><span class="fss-kl">' + m.l + '</span>' + sw + '</span><b class="fss-kv2">' + m.v + '</b>' + m.d + '</button>' }).join('');
          [].forEach.call(mt.querySelectorAll('.fss-k.can'), function (b) { b.onclick = function () { var k = b.getAttribute('data-k'); if (k === 'rev' && S.metric === 'rev') S.money = modes[(modes.indexOf(S.money) + 1) % modes.length]; S.metric = k; refresh() } }) };
        var plan = function () { var el = body.querySelector('#fssPlan'); if (!el) return; var pv = planOf(mk), got = rc.sum, last = new Date(p.a.getFullYear(), p.a.getMonth() + 1, 0), cur = key(p.b) === key(today) && p.b < last, days = last.getDate(), passed = p.b.getDate();
          var fc = cur ? got / passed * days : got, mx = Math.max(pv.ideal, fc, got) * 1.06, X = function (v) { return Math.min(100, v / mx * 100).toFixed(2) + '%' }, pc = pv.ideal ? got / pv.ideal * 100 : 0;
          var next = [['min', 'минимальный', pv.min], ['opt', 'оптимальный', pv.opt], ['ideal', 'идеальный', pv.ideal]].filter(function (z) { return z[2] > got })[0], left = cur ? days - passed : 0;
          el.innerHTML = '<div class="fss-ctl"><div><div class="fss-sec">' + ico('target').replace('<svg', '<svg class="fss-hi"') + 'План на ' + MONN[p.a.getMonth()] + (pv.def ? ' <span class="fss-tag">по умолчанию</span>' : '') + '</div><p class="fss-sub" style="margin:0">чистыми, на вывод</p></div><div class="fss-planr"><b>' + Math.round(pc) + '%</b><span>от идеального плана</span><button type="button" class="fss-btn fss-pe" title="Изменить план">' + ico('edit') + '</button></div></div>'
            + '<div class="fss-pbar"><i class="got" style="width:' + X(got) + '"></i>' + (cur && fc > got ? '<i class="fc" style="left:' + X(got) + ';width:calc(' + X(fc) + ' - ' + X(got) + ')"></i>' : '') + [['min', pv.min], ['opt', pv.opt], ['ideal', pv.ideal]].map(function (z) { return '<s class="' + (got >= z[1] ? 'ok' : '') + '" style="left:' + X(z[1]) + '"></s>' }).join('') + '</div>'
            + '<div class="fss-plabs">' + [['мин', pv.min], ['опт', pv.opt], ['идеал', pv.ideal]].map(function (z) { return '<span style="left:' + X(z[1]) + '" class="' + (got >= z[1] ? 'ok' : '') + '">' + z[0] + ' ' + SHORT(z[1]) + '</span>' }).join('') + '</div>'
            + '<div class="fss-pnote">' + (cur ? 'Прогноз на конец месяца при текущем темпе — <b>' + RUB(fc) + '</b>. ' : '') + (next ? 'До ' + next[1] + 'о плана — <b>' + RUB(next[2] - got) + '</b>' + (left ? ', это <b>' + RUB((next[2] - got) / left) + '</b> в день до конца месяца.' : '.') : 'Идеальный план выполнен.') + '</div>';
          el.querySelector('.fss-pe').onclick = function () { var f = document.createElement('div'); f.className = 'fss-pform'; f.innerHTML = [['min', 'Минимальный'], ['opt', 'Оптимальный'], ['ideal', 'Идеальный']].map(function (z) { return '<label>' + z[1] + '<input type="number" step="100000" data-k="' + z[0] + '" value="' + Math.round(pv[z[0]]) + '"></label>' }).join('') + '<button type="button" class="fss-btn pri">Сохранить</button>';
            el.appendChild(f); this.style.display = 'none'; f.querySelector('button').onclick = function () { var o = { month: mk }; [].forEach.call(f.querySelectorAll('input'), function (i) { o[i.getAttribute('data-k')] = +i.value || 0 });
              fetch(API + '/fin/plan?k=' + encodeURIComponent(statKey()), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(o) }).then(function (r) { return r.json() }).then(function (j) { if (j.ok) { C.plans = C.plans || {}; C.plans[mk] = j.plan; plan() } }) } } };
        var draw = function () { var el = body.querySelector('#fssC'); if (!el) return; var dk = dayKeys(p.a, p.b), bk = bucket(dk, st.g), pk = p.pa ? bucket(dayKeys(p.pa, p.pb), st.g) : null, md = S.money, dtok = st.dtok = Math.random();
          var fin = function (cur, prev) { if (dtok !== st.dtok) return; if (prev && prev.every(function (x) { return !x })) prev = null;
            line(el, cur, prev, S.metric === 'rev' ? { h: 300 } : { h: 300, int: 1, fmt: function (x) { return NUM(x) }, tf: function (x) { return NUM(x) + ' ' + pl(x, ['продажа', 'продажи', 'продаж']) } }) };
          var mkp = function (bks, vals, withAx) { return bks.map(function (b, i) { return vals[i] == null ? null : withAx ? { v: vals[i], ax: lbl(b, st.g, 1), t: lbl(b, st.g) } : { v: vals[i], t: lbl(b, st.g) } }) };
          if (S.metric === 'rev' && md === 'gc') { el.innerHTML = '<div class="fss-load">Беру оплаты из статистики GetCourse…</div>';
            Promise.all([pool(bk, gcBucket), pk ? pool(pk, gcBucket) : null]).then(function (r) { fin(mkp(bk, r[0], 1), pk ? mkp(pk, r[1]) : null) }).catch(function () { el.innerHTML = '<div class="fss-empty">GetCourse не отдал данные</div>' }); return }
          if (S.metric === 'rev') { var f = function (arr) { return arr.reduce(function (s, d) { var x = PAY.m[key(d)]; return s + (x ? (md === 'gross' ? x.gross : x.sum) : 0) }, 0) };
            return fin(mkp(bk, bk.map(f), 1), pk ? mkp(pk, pk.map(f)) : null) }
          if (!st.dl) { el.innerHTML = '<div class="fss-load">Считаю продажи по дням…</div>'; return }
          var cnt = function (list) { return function (arr) { if (!list) return null; var a = day0(arr[0]), z = addD(day0(arr[arr.length - 1]), 1); return list.filter(function (x) { return x.when && x.when >= a && x.when < z }).length } };
          fin(mkp(bk, bk.map(cnt(st.dl)), 1), pk ? mkp(pk, pk.map(cnt(st.dlp))) : null) };
        var prods = function () { var el = body.querySelector('#fssProd'); if (!el) return; var useNet = !!st.fl, src = useNet ? st.fl.list.map(function (x) { return { title: x.title, v: x.net } }) : (st.dl || []).map(function (x) { return { title: x.title, v: x.cost } });
          if (!useNet && !st.dl) return; var G = groupProducts(src), tot = G.reduce(function (s, g) { return s + g.v }, 0), cntAll = src.length;
          var sb = body.querySelector('#fssProdSub'); if (sb) sb.textContent = useNet ? 'по оплатам за период, суммы на вывод' : 'по оплаченным заказам, суммы — стоимость заказов';
          if (!G.length) { el.innerHTML = '<div class="fss-empty">За период продаж не было</div>'; return }
          el.innerHTML = '<div class="fss-dwrap">' + donut(G, SHORT(tot), cntAll + ' ' + pl(cntAll, ['оплата', 'оплаты', 'оплат'])) + '<div class="fss-lg2">' + G.map(function (g, i) {
              return '<div class="fss-lr" data-i="' + i + '"><button type="button" class="fss-lh' + (g.tars.length ? '' : ' nx') + '"><i style="background:' + g.c + '"></i><span class="nm">' + esc(g.name) + '</span><span class="ct">×' + g.n + '</span><b>' + RUB(g.v) + '</b><em>' + Math.round(g.v / (tot || 1) * 100) + '%</em><svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></button>'
                + (g.inst ? '<div class="fss-ln">из них в рассрочку — ' + g.inst + '</div>' : '') + (g.tars.length ? '<div class="fss-lt">' + g.tars.map(function (t) { return '<div><span>' + esc(t.name) + '</span><span class="ct">×' + t.n + '</span><b>' + RUB(t.v) + '</b></div>' }).join('') + '</div>' : '') + '</div>' }).join('') + '</div></div>';
          var rows = el.querySelectorAll('.fss-lr'), segs = el.querySelectorAll('.fss-dn circle[data-i]');
          [].forEach.call(rows, function (r) { var i = r.getAttribute('data-i'); r.querySelector('.fss-lh').onclick = function () { r.classList.toggle('open') };
            r.onmouseenter = function () { el.classList.add('hl'); [].forEach.call(segs, function (s) { s.classList.toggle('on', s.getAttribute('data-i') === i) }) }; r.onmouseleave = function () { el.classList.remove('hl') } }) };
        var meths = function () { var el = body.querySelector('#fssMeth'); if (!el) return; if (!st.fl) { el.innerHTML = '<div class="fss-empty">' + (PAY.gross ? 'Видно после подключения ключа доступа' : '…') + '</div>'; return }
          var M2 = groupMethods(st.fl.list), tot = M2.reduce(function (s, g) { return s + g.net }, 0); if (!M2.length) { el.innerHTML = '<div class="fss-empty">Оплат не было</div>'; return }
          el.innerHTML = '<div class="fss-dwrap">' + donut(M2, SHORT(tot), 'на вывод') + '<div class="fss-lg2">' + M2.map(function (g) { return '<div class="fss-lr"><div class="fss-lh st"><i style="background:' + g.c + '"></i><span class="nm">' + g.name + '</span><span class="ct">×' + g.n + '</span><b>' + RUB(g.net) + '</b><em>' + Math.round(g.net / (tot || 1) * 100) + '%</em></div>'
            + '<div class="fss-ln">оплачено ' + RUB(g.sum) + (g.fee ? ' · комиссия <span class="dn">−' + RUB(g.fee) + ' (' + (g.fee / g.sum * 100).toFixed(1).replace('.', ',') + '%)</span>' : ' · без комиссии') + '</div></div>' }).join('') + '</div></div>' };
        var allPays = function () { var el = body.querySelector('#fssAll'); if (!el) return; if (!st.fl) { if (st.dl) lastPays2(st.dl); return }
          var L = st.fl.list, show = st.showAll ? L : L.slice(0, 10), sb = body.querySelector('#fssAllSub'); if (sb) sb.textContent = L.length + ' ' + pl(L.length, ['оплата', 'оплаты', 'оплат']) + ', новые сверху';
          el.innerHTML = L.length ? '<div class="fss-scroll"><table class="fss-t"><tr><th>Когда</th><th class="l">Клиент</th><th class="l">Продукт и тариф</th><th class="l">Способ</th><th>Оплачено</th><th>Комиссия</th><th>На вывод</th></tr>' + show.map(function (x) { var w = new Date(String(x.created).replace(' ', 'T')), s = splitTitle(x.title), m = METHODS.filter(function (d) { return d[0] === methodOf(x) })[0];
              return '<tr><td class="m">' + fmtW(w) + '</td><td class="l"><a href="/sales/control/payment/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.name || '—') + '</a></td><td class="l">' + esc(shortProd(s.prod)) + (s.tar || s.inst ? '<div class="fss-n">' + esc(s.tar) + (s.inst ? (s.tar ? ' · ' : '') + 'в рассрочку' : '') + '</div>' : '') + '</td><td class="l"><span class="fss-mt2"><i style="background:' + m[2] + '"></i>' + m[1].split(' (')[0] + '</span></td><td>' + RUB(x.sum) + '</td><td class="m">' + (x.fee ? '−' + RUB(x.fee) : '—') + '</td><td class="b">' + RUB(x.net) + '</td></tr>' }).join('') + '</table></div>'
            + (L.length > 10 ? '<button type="button" class="fss-btn fss-more">' + (st.showAll ? 'Свернуть' : 'Показать все ' + L.length) + '</button>' : '') : '<div class="fss-empty">За период оплат не было</div>';
          var mb = el.querySelector('.fss-more'); if (mb) mb.onclick = function () { st.showAll = !st.showAll; allPays() } };
        var lastPays2 = function (list) { var el = body.querySelector('#fssAll'); var L = list.slice().sort(function (a, b) { return (b.when || 0) - (a.when || 0) });
          el.innerHTML = L.length ? '<div class="fss-scroll"><table class="fss-t"><tr><th>Когда</th><th>Клиент</th><th>Продукт и тариф</th><th>Стоимость заказа</th></tr>' + L.slice(0, 30).map(function (x) { var s = splitTitle(x.title); return '<tr><td class="m">' + fmtW(x.when) + '</td><td><a href="/sales/control/deal/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.client || '—') + '</a></td><td>' + esc(s.prod) + (s.tar ? '<div class="fss-n">' + esc(s.tar) + '</div>' : '') + '</td><td class="b">' + RUB(x.cost) + '</td></tr>' }).join('') + '</table></div>' : '<div class="fss-empty">За период оплат не было</div>' };
        var refresh = function () { lead(); flow(); metrics(); plan(); draw() };
        st.refresh = refresh; refresh();
        [].forEach.call(body.querySelectorAll('#fssG button'), function (b) { b.onclick = function () { if (b.disabled) return; S.gran = st.g = b.getAttribute('data-g'); [].forEach.call(body.querySelectorAll('#fssG button'), function (x) { x.classList.toggle('on', x === b) }); draw() } });
        Promise.all([dealTot(p.a, p.b), p.pa ? dealTot(p.pa, p.pb) : null]).then(function (r) { if (tok !== S.tok) return; st.cur = r[0]; st.prev = r[1]; lead(); flow(); metrics(); if (S.money === 'gc' && S.metric === 'rev') draw(); setImg() }).catch(function () {});
        if (!PAY.gross) finList(p.a, p.b, p.pa, p.pb).then(function (F) { if (tok !== S.tok) return; st.fl = F; prods(); meths(); allPays(); plan(); setImg() }).catch(function () { meths(); if (st.dl) { prods(); allPays() } });
        else meths();
        deals(p.a, p.b).then(function (list) { if (tok !== S.tok) return; st.dl = list; if (!st.fl) { prods(); allPays() } if (S.metric === 'cnt') draw(); setImg() }).catch(function () {});
        if (p.pa) deals(p.pa, p.pb).then(function (list) { if (tok !== S.tok) return; st.dlp = list; if (S.metric === 'cnt') draw() }).catch(function () {});
      }).catch(fail) };
    var tariffList = function (list) { var m = {}; list.forEach(function (x) { (m[x.title] = m[x.title] || { name: x.title, n: 0, sum: 0 }), m[x.title].n++, m[x.title].sum += x.cost });
      return Object.keys(m).map(function (k) { return m[k] }).sort(function (a, b) { return b.n - a.n || b.sum - a.sum }) };
    var tariffs = function (list) { var el = body.querySelector('#fssTar'); if (!el) return; var T = tariffList(list), tn = list.length, mx = T.length ? T[0].n : 1;
      el.innerHTML = T.length ? '<table class="fss-t"><tr><th>Продукт</th><th>Продаж</th><th>Доля</th><th>Сумма заказов</th></tr>' + T.map(function (t) {
        return '<tr><td>' + esc(t.name) + '<span class="fss-bar"><i style="width:' + Math.max(3, t.n / mx * 100).toFixed(1) + '%"></i></span></td><td class="b">' + NUM(t.n) + '</td><td class="m">' + Math.round(t.n / tn * 100) + '%</td><td>' + RUB(t.sum) + '</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">За период оплат не было</div>' };
    var fmtW = function (w) { if (!w) return ''; var t = today, d = day0(w), s = key(d) === key(t) ? 'сегодня' : key(d) === key(addD(t, -1)) ? 'вчера' : d.getDate() + ' ' + MONS3[d.getMonth()]; return s + ', ' + ('0' + w.getHours()).slice(-2) + ':' + ('0' + w.getMinutes()).slice(-2) };
    var lastNet = function (PAY, p) { var el = body.querySelector('#fssLast'); if (!el) return; var a = key(p.a), b = key(p.b);
      var L = PAY.last.filter(function (x) { var d = String(x.created).slice(0, 10); return d >= a && d <= b }).slice(0, 8);
      var sb = el.parentNode.querySelector('.fss-sub'); if (sb) sb.textContent = 'поступления за период, новые сверху';
      el.innerHTML = L.length ? '<table class="fss-t"><tr><th>Клиент</th><th>Когда</th><th>На вывод</th></tr>' + L.map(function (x) { var w = new Date(String(x.created).replace(' ', 'T'));
        return '<tr><td><a href="/sales/control/payment/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.name || '—') + '</a><div class="fss-n">' + esc(x.title || '') + (x.fee ? ' · оплачено ' + RUB(x.sum) : '') + '</div></td><td class="m">' + fmtW(w) + '</td><td class="b">' + RUB(x.net) + '</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">За период поступлений нет</div>' };
    var lastPays = function (list) { var el = body.querySelector('#fssLast'); if (!el) return; var L = list.slice().sort(function (a, b) { return (b.when || 0) - (a.when || 0) }).slice(0, 8);
      el.innerHTML = L.length ? '<table class="fss-t"><tr><th>Клиент</th><th>Когда</th><th>Заказ</th></tr>' + L.map(function (x) {
        return '<tr><td><a href="/sales/control/deal/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.client || '—') + '</a><div class="fss-n">' + esc(x.title) + '</div></td><td class="m">' + fmtW(x.when) + '</td><td class="b">' + RUB(x.cost) + '</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">Пока пусто</div>' };

    /* ---------- вкладка «Накопительная» ---------- */
    var renderCumulative = function () { var tok = S.tok = Math.random(); loading();
      payments().then(function (PAY) { C.payV = PAY; if (tok !== S.tok) return; var p = P(), dk = dayKeys(p.a, p.b), pk = p.pa ? dayKeys(p.pa, p.pb) : null, run = 0, run2 = 0;
        var cur = dk.map(function (d) { var x = PAY.m[key(d)]; run += x ? x.sum : 0; return { v: run, ax: d.getDate() + (d.getDate() === 1 ? ' ' + MONS3[d.getMonth()] : ''), t: 'к ' + d.getDate() + ' ' + MONS[d.getMonth()], x: x && x.sum ? '+' + RUB(x.sum) + ' за день' : '' } });
        var prev = pk ? pk.map(function (d) { var x = PAY.m[key(d)]; run2 += x ? x.sum : 0; return { v: run2, t: 'к ' + d.getDate() + ' ' + MONS[d.getMonth()] } }) : null;
        if (dk.length > 120) { var step = Math.ceil(dk.length / 120); cur = cur.filter(function (x, i) { return i % step === 0 || i === cur.length - 1 }); if (prev) prev = prev.filter(function (x, i) { return i % step === 0 || i === prev.length - 1 }) }
        var last = dk[dk.length - 1], diff = prev ? run - prev[Math.min(prev.length, cur.length) - 1].v : 0, cmp = cmpName(p);
        var months = {}, order = []; Object.keys(PAY.m).sort().forEach(function (k) { var mk = k.slice(0, 7); if (!months[mk]) { months[mk] = 0; order.push(mk) } months[mk] += PAY.m[k].sum });
        var tot = 0, rows = order.map(function (mk) { tot += months[mk]; var y = +mk.slice(0, 4), m = +mk.slice(5, 7) - 1; return { l: cap(MONN[m]) + ' ' + y, m: months[mk], c: tot } });
        body.innerHTML = '<p class="fss-lead">К ' + last.getDate() + ' ' + MONS[last.getMonth()] + (C.payV && C.payV.gross ? ' клиенты заплатили <em>' : ' на вывод пришло <em>') + RUB(run) + '</em>' + (prev ? '<br><span>' + (diff >= 0 ? 'Это на ' + RUB(diff) + ' больше' : 'Это на ' + RUB(-diff) + ' меньше') + ', чем за ' + esc(cmp) + '</span>' : '') + '</p>'
          + '<div class="fss-card"><div class="fss-ctl"><div><div class="fss-sec">Выручка нарастающим итогом</div><p class="fss-sub" style="margin:0">каждая точка — сколько денег пришло с начала периода</p></div><div class="fss-leg"><span><i></i>' + esc(human(p.a, p.b)) + '</span>' + (prev ? '<span><i class="p"></i>' + esc(cmp) + '</span>' : '') + '</div></div><div class="fss-ch" id="fssC" style="margin-top:12px"></div></div>'
          + '<div class="fss-card"><div class="fss-sec">По месяцам за всё время</div><p class="fss-sub">поступления и накопленный итог</p><div class="fss-scroll"><table class="fss-t"><tr><th>Месяц</th><th>Пришло</th><th>Накоплено</th><th>Доля</th></tr>'
          + rows.slice().reverse().map(function (r) { return '<tr><td>' + r.l + '<span class="fss-bar"><i style="width:' + Math.max(2, r.c / tot * 100).toFixed(1) + '%"></i></span></td><td>' + RUB(r.m) + '</td><td class="b">' + RUB(r.c) + '</td><td class="m">' + Math.round(r.m / tot * 100) + '%</td></tr>' }).join('') + '</table></div></div>';
        line(body.querySelector('#fssC'), cur, prev, { h: 320 }) }).catch(fail) };

    /* ---------- вкладка «Клиенты и LTV» ---------- */
    var renderClients = function () { var tok = S.tok = Math.random(); loading('Считаю клиентов и LTV по всем оплаченным заказам…');
      Promise.all([payments(), structure(), deals(new Date(2015, 0, 1), today), dealTot(new Date(2015, 0, 1), today)]).then(function (r) { if (tok !== S.tok) return;
        var PAY = r[0], ST = r[1], D = r[2], TOT = r[3], cl = {}; D.forEach(function (x) { var c = cl[x.uid] = cl[x.uid] || { n: 0, sum: 0, first: null, dates: [] }; c.n++; c.sum += x.cost; if (x.when) { c.dates.push(x.when); if (!c.first || x.when < c.first) c.first = x.when } });
        var ids = Object.keys(cl), N = ids.length || 1, money2 = 0; Object.keys(PAY.m).forEach(function (k) { money2 += PAY.m[k].sum });
        var buyers = TOT.buyers || N, ltv = money2 / buyers, rep = ids.filter(function (i) { return cl[i].n > 1 }), repS = rep.reduce(function (s, i) { return s + cl[i].sum }, 0), oneS = ids.filter(function (i) { return cl[i].n === 1 }).reduce(function (s, i) { return s + cl[i].sum }, 0);
        var gaps = []; rep.forEach(function (i) { var ds = cl[i].dates.sort(function (a, b) { return a - b }); if (ds.length > 1) gaps.push((ds[1] - ds[0]) / 864e5) }); gaps.sort(function (a, b) { return a - b }); var med = gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : 0;
        var coh = {}, co = []; ids.forEach(function (i) { var c = cl[i]; if (!c.first) return; var mk = c.first.getFullYear() + '-' + ('0' + (c.first.getMonth() + 1)).slice(-2); if (!coh[mk]) { coh[mk] = { n: 0, sum: 0, rep: 0 }; co.push(mk) } coh[mk].n++; coh[mk].sum += c.sum; if (c.n > 1) coh[mk].rep++ }); co.sort();
        var COL = ['#6724ad', '#9657e8', '#d7b6ff'], it = ST.periods[S.stI || 0] || [], lg = ST.growth[ST.growth.length - 1] || {};
        body.innerHTML = '<p class="fss-lead">Один клиент в среднем приносит <em>' + RUB(ltv) + '</em><br><span>' + Math.round(rep.length / N * 100) + '% клиентов купили больше одного раза — они дали ' + Math.round(repS / Math.max(1, repS + oneS) * 100) + '% выручки</span></p>'
          + '<div class="fss-kv"><div><i>LTV клиента</i><b>' + RUB(ltv) + '</b><small>' + (PAY.gross ? 'все оплаты ' : 'всё, что пришло на вывод, ') + SHORT(money2) + ' ₽ ÷ ' + NUM(buyers) + ' ' + pl(buyers, ['покупатель', 'покупателя', 'покупателей']) + '</small></div>'
          + '<div><i>Повторные покупки</i><b>' + Math.round(rep.length / N * 100) + '%</b><small>' + NUM(rep.length) + ' из ' + NUM(N) + ' клиентов купили 2+ раз</small></div>'
          + '<div><i>Покупок на клиента</i><b>' + (D.length / N).toFixed(2).replace('.', ',') + '</b><small>' + NUM(D.length) + ' оплаченных ' + pl(D.length, ['заказ', 'заказа', 'заказов']) + '</small></div>'
          + '<div><i>До второй покупки</i><b>' + (gaps.length ? med + ' ' + pl(med, ['день', 'дня', 'дней']) : '—') + '</b><small>медиана у тех, кто вернулся</small></div></div>'
          + '<div class="fss-card" style="margin-top:16px"><div class="fss-sec">LTV по месяцу первой покупки</div><p class="fss-sub">сколько в среднем принёс клиент, пришедший в этом месяце (по сумме оплаченных заказов)</p><div class="fss-ch" id="fssC"></div></div>'
          + '<div class="fss-row"><div class="fss-card"><div class="fss-sec">Откуда выручка</div><p class="fss-sub">новые клиенты и клиенты из базы · данные GetCourse на конец прошлого дня</p>'
          + '<div class="fss-seg" id="fssSt" style="margin-bottom:18px">' + ['Текущий месяц', 'Прошлый месяц', 'Весь период'].map(function (t, j) { return ST.periods[j] ? '<button type="button" data-i="' + j + '"' + ((S.stI || 0) === j ? ' class="on"' : '') + '>' + t + '</button>' : '' }).join('') + '</div>'
          + (it.length ? '<div class="fss-stack">' + it.map(function (x, j) { return '<i style="width:' + Math.max(x.p, .6) + '%;background:' + COL[j] + '"></i>' }).join('') + '</div><table class="fss-t">' + it.map(function (x, j) {
            return '<tr><td><span class="fss-dot" style="background:' + COL[j] + '"></span>' + esc(x.t) + '<div class="fss-n" style="margin-left:18px">' + (j < 2 ? 'новые клиенты' : 'клиенты из базы') + '</div></td><td class="m">' + String(x.p).replace('.', ',') + '%</td><td class="b">' + esc(x.s.replace('.', ',').replace('M', ' млн').replace('K', ' тыс')) + ' ₽</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">Нет данных</div>')
          + '</div><div class="fss-card"><div class="fss-sec">Рост базы клиентов</div><p class="fss-sub">' + (ST.pct ? esc(ST.pct) + ' за полгода · ' + esc(ST.add) + ' ' + pl(money(ST.add), ['клиент', 'клиента', 'клиентов']) : '&nbsp;') + '</p><div class="fss-ch" id="fssB"></div></div></div>'
          + '<div class="fss-card"><div class="fss-sec">Клиенты по месяцу первой покупки</div><p class="fss-sub">когорты: сколько пришло, сколько вернулось за повторной покупкой</p><div class="fss-scroll"><table class="fss-t"><tr><th>Месяц</th><th>Новых клиентов</th><th>Купили повторно</th><th>LTV</th></tr>'
          + co.slice().reverse().map(function (mk) { var c = coh[mk], y = +mk.slice(0, 4), m = +mk.slice(5) - 1; return '<tr><td>' + cap(MONN[m]) + ' ' + y + '</td><td>' + NUM(c.n) + '</td><td class="m">' + NUM(c.rep) + ' · ' + Math.round(c.rep / c.n * 100) + '%</td><td class="b">' + RUB(c.sum / c.n) + '</td></tr>' }).join('') + '</table></div></div>';
        line(body.querySelector('#fssC'), co.map(function (mk) { var y = +mk.slice(0, 4), m = +mk.slice(5) - 1; return { v: coh[mk].sum / coh[mk].n, ax: MONS3[m], t: cap(MONN[m]) + ' ' + y, x: NUM(coh[mk].n) + ' новых клиентов' } }), null, { h: 260 });
        line(body.querySelector('#fssB'), ST.growth.map(function (g) { return { v: g.n, ax: g.m.slice(0, 3).toLowerCase(), t: g.m } }), null, { h: 220, fmt: function (x) { return NUM(x) }, tf: function (x) { return NUM(x) + ' клиентов' } });
        [].forEach.call(body.querySelectorAll('#fssSt button'), function (b) { b.onclick = function () { S.stI = +b.getAttribute('data-i'); renderClients() } }) }).catch(fail) };

    /* ---------- вкладка «Как в GetCourse» ---------- */
    var renderTable = function () { var tok = S.tok = Math.random(); loading();
      indexTable().then(function (R) { if (tok !== S.tok) return; var H = ['Сегодня', 'Вчера', 'Этот месяц', 'Прошлый месяц', 'Этот год', 'Всё время'];
        body.innerHTML = '<p class="fss-lead">Официальная сводка GetCourse<br><span>Здесь «сумма оплат» считается по полностью оплаченным заказам, поэтому она меньше выручки: предоплаты и рассрочки идут отдельной строкой</span></p>'
          + '<div class="fss-card"><div class="fss-scroll"><table class="fss-t"><tr><th>Показатель</th>' + H.map(function (h, j) { return '<th' + (j === 2 ? ' style="color:#fff"' : '') + '>' + h + '</th>' }).join('') + '</tr>'
          + R.map(function (r) { var cnt = /Count$/.test(r.k || ''); return '<tr class="' + (r.k === 'earnedSum' ? 'sum hl' : '') + '"><td>' + esc(r.label) + '</td>' + r.v.map(function (x, j) { return '<td class="' + (j === 2 ? 'b' : '') + '">' + (cnt ? NUM(x) : RUB(x)) + '</td>' }).join('') + '</tr>' }).join('') + '</table></div></div>' }).catch(fail) };

    /* ---------- отчёт картинкой 1080×1350 в «фиолетовом стиле» ---------- */
    var setImg = function () { var b = root && root.querySelector('.fss-img'); if (b) b.disabled = !(tab === 'sales' && S.view && S.view.cur && (S.view.fl || S.view.dl)) };
    var card = function () { var st = S.view, p = st.p, c = st.cur, q = st.prev, rc = st.rc, rp = st.rp, n1 = ndays(p.a, p.b) === 1;
      var cv = document.createElement('canvas'), W = 1920, H = 1080, M = 80; cv.width = W; cv.height = H; var x = cv.getContext('2d'), F = '"Inter Tight", Inter, system-ui, sans-serif';
      var font = function (w, sz) { x.font = w + ' ' + sz + 'px ' + F; try { x.letterSpacing = (sz >= 48 ? -.02 * sz : sz <= 24 ? 0 : -.01 * sz) + 'px' } catch (e) {} };
      var rr = function (X, Y, w, h, r) { x.beginPath(); if (x.roundRect) x.roundRect(X, Y, w, h, r); else { x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath() } };
      var T = function (t, X, Y, col) { x.fillStyle = col; x.fillText(t, X, Y) }, tw = function (t) { return x.measureText(t).width };
      var fit = function (t, w) { if (tw(t) <= w) return t; while (t.length > 1 && tw(t + '…') > w) t = t.slice(0, -1); return t.replace(/\s+$/, '') + '…' };
      var cardB = function (X, Y, w, h, hl) { rr(X, Y, w, h, 36); x.fillStyle = '#161616'; x.fill(); if (hl) { var gg = x.createLinearGradient(X, Y, X + w * .6, Y + h); gg.addColorStop(0, 'rgba(150,87,232,.24)'); gg.addColorStop(1, 'rgba(150,87,232,0)'); rr(X, Y, w, h, 36); x.fillStyle = gg; x.fill() }
        rr(X + 1, Y + 1, w - 2, h - 2, 35); x.strokeStyle = hl ? 'rgba(195,139,255,.55)' : 'rgba(255,255,255,.07)'; x.lineWidth = hl ? 2 : 1.5; x.stroke() };
      var IC = function (name, X, Y, s, col, bg) { rr(X, Y, s, s, s * .3); x.fillStyle = bg || '#262626'; x.fill(); var pth = (ICON[name] || '').match(/d="[^"]+"|<circle[^>]+>|<rect[^>]+>/g) || [];
        x.save(); x.translate(X + s * .2, Y + s * .2); x.scale(s * .6 / 24, s * .6 / 24); x.strokeStyle = col || '#c38bff'; x.lineWidth = 1.9; x.lineCap = 'round'; x.lineJoin = 'round';
        pth.forEach(function (d) { var m; if ((m = d.match(/^d="(.+)"$/))) x.stroke(new Path2D(m[1])); else if ((m = d.match(/cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/))) { x.beginPath(); x.arc(+m[1], +m[2], +m[3], 0, 7); x.stroke() } else if ((m = d.match(/x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" rx="([\d.]+)"/))) { x.beginPath(); x.roundRect ? x.roundRect(+m[1], +m[2], +m[3], +m[4], +m[5]) : x.rect(+m[1], +m[2], +m[3], +m[4]); x.stroke() } }); x.restore() };
      var dl = function (a, b) { var v = pct(a, b); if (v == null) return null; return { s: (v > .5 ? '↑ ' : v < -.5 ? '↓ ' : '≈ ') + (Math.abs(v) < 10 ? Math.abs(v).toFixed(1).replace('.', ',') : Math.round(Math.abs(v))) + '%', c: v > .5 ? '#4ade80' : v < -.5 ? '#ff6b6b' : 'rgba(255,255,255,.7)', b: v > .5 ? 'rgba(74,222,128,.14)' : v < -.5 ? 'rgba(255,107,107,.14)' : 'rgba(255,255,255,.08)' } };
      var pill = function (d, X, Y, sz) { font(600, sz); var w = tw(d.s) + sz * 1.1, h = sz * 1.75; rr(X, Y - h / 2, w, h, h / 2); x.fillStyle = d.b; x.fill(); T(d.s, X + sz * .55, Y + 1, d.c); return w };
      var mark = function (X, Y, s) { var u = s / 64;[[0, 0], [0, 1], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2], [0, 2]].forEach(function (ab) { rr(X + ab[1] * 22 * u, Y + ab[0] * 22 * u, 20 * u, 20 * u, 4 * u); x.fillStyle = (ab[0] === 0 && ab[1] === 2) ? '#c9a2ff' : '#fff'; x.fill() }) };
      var chip = function (t, X, Y, kind, sz, h) { font(700, sz); try { x.letterSpacing = '2px' } catch (e) {} var w = tw(t) + h * .9; rr(X, Y, w, h, h / 2); if (kind === 'lilac') { x.fillStyle = '#c38bff'; x.fill() } else { x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 1.5; x.stroke() } T(t, X + h * .45, Y + h / 2 + 1, kind === 'lilac' ? '#000106' : '#fff'); try { x.letterSpacing = '0px' } catch (e) {} return w };
      var md = S.money || 'net', mv = md === 'net' ? rc.sum : md === 'gross' ? rc.gross : c.sum, mv0 = !rp ? null : md === 'net' ? rp.sum : md === 'gross' ? rp.gross : q ? q.sum : null;
      var items = st.fl ? st.fl.list.map(function (z) { return { title: z.title, v: md === 'gross' ? z.sum : z.net } }) : (st.dl || []).map(function (z) { return { title: z.title, v: z.cost } }), G = groupProducts(items), gt = G.reduce(function (s2, g) { return s2 + g.v }, 0);
      return (document.fonts && document.fonts.load ? Promise.all(['400', '500', '600', '700'].map(function (w) { return document.fonts.load(w + ' 40px "Inter Tight"') })).catch(function () {}) : Promise.resolve()).then(function () {
        x.textBaseline = 'middle';
        /* фон: чёрный, световые линии сверху, свет снизу, зерно */
        x.fillStyle = '#000106'; x.fillRect(0, 0, W, H);
        for (var k = 1; k < 11; k++) { var lg = x.createLinearGradient(0, 0, 0, H * .5); lg.addColorStop(0, 'rgba(255,255,255,.06)'); lg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = lg; x.fillRect(k * W / 11, 0, 1, H * .5) }
        x.save(); x.translate(W / 2, H + 300); x.scale(1500 / 560, 520 / 560); var L = x.createRadialGradient(0, 0, 0, 0, 0, 560);
        L.addColorStop(0, '#6000ff'); L.addColorStop(.55, '#7440f0'); L.addColorStop(.74, '#9657e8'); L.addColorStop(.8, '#dcaefc'); L.addColorStop(.85, '#9a5be8'); L.addColorStop(.91, '#3a1270'); L.addColorStop(.97, '#1c0838'); L.addColorStop(1, 'rgba(0,1,6,0)'); x.fillStyle = L; x.fillRect(-700, -700, 1400, 1400); x.restore();
        var gd = x.getImageData(0, 0, W, H), dt = gd.data; for (var j = 0; j < dt.length; j += 4) { var nz = (Math.random() - .5) * 14; dt[j] += nz; dt[j + 1] += nz; dt[j + 2] += nz } x.putImageData(gd, 0, 0);
        /* шапка */
        mark(M, 62, 44); font(500, 34); T('Oduvanov', M + 60, 85, '#fff'); var ow = tw('Oduvanov'); T('School', M + 60 + ow, 85, '#c9a2ff');
        var ds = (n1 ? p.a.getDate() + ' ' + MONS[p.a.getMonth()] + ' ' + p.a.getFullYear() : human(p.a, p.b)).toUpperCase(); font(700, 20); try { x.letterSpacing = '2px' } catch (e) {} var w1 = tw(ds) + 48 * .9; try { x.letterSpacing = '0px' } catch (e) {}
        chip(ds, W - M - w1, 61, 'lilac', 20, 48); font(700, 20); try { x.letterSpacing = '2px' } catch (e) {} var w2 = tw('ОТЧЁТ ОТДЕЛА ПРОДАЖ') + 48 * .9; try { x.letterSpacing = '0px' } catch (e) {} chip('ОТЧЁТ ОТДЕЛА ПРОДАЖ', W - M - w1 - 12 - w2, 61, 'line', 20, 48);
        /* заголовок */
        var t1 = 'Продажи ', t2 = n1 ? 'за ' + p.a.getDate() + ' ' + MONS[p.a.getMonth()] : 'за ' + human(p.a, p.b), fs = 76; font(500, fs); while (fs > 48 && tw(t1 + t2) > W - 2 * M) { fs -= 2; font(500, fs) } x.textBaseline = 'alphabetic'; T(t1, M, 200, '#fff'); T(t2, M + tw(t1), 200, 'rgba(255,255,255,.55)'); x.textBaseline = 'middle';
        var LW = 860, X1 = M + LW + 40, RW = W - M - X1;
        /* главная карточка */
        var Y = 248; cardB(M, Y, LW, 330, 1); IC('wallet', M + 36, Y + 34, 52, '#1a0b2e', '#c38bff'); font(500, 28); T({ net: 'На вывод', gross: 'Оплачено клиентами', gc: 'Сумма оплат по GetCourse' }[md], M + 104, Y + 52, '#fff');
        font(400, 20); T({ net: 'после комиссий GetCourse и банков', gross: 'до комиссий', gc: 'по полностью оплаченным заказам' }[md], M + 104, Y + 80, 'rgba(255,255,255,.5)');
        var vs = RUB(mv), vf = 124; font(500, vf); while (tw(vs) > LW - 72 && vf > 80) { vf -= 4; font(500, vf) } T(vs, M + 32, Y + 168, '#fff');
        var d0 = mv0 != null ? dl(mv, mv0) : null; if (mv0 === 0 && p.pa) { font(400, 22); T((n1 ? p.pa.getDate() + ' ' + MONS[p.pa.getMonth()] : 'За ' + human(p.pa, p.pb)) + ' оплат не было', M + 36, Y + 239, 'rgba(255,255,255,.55)') } if (d0) { var pw = pill(d0, M + 36, Y + 238, 24); font(400, 22); T('к ' + (n1 ? p.pa.getDate() + ' ' + MONS[p.pa.getMonth()] : human(p.pa, p.pb)) + ' · было ' + RUB(mv0), M + 52 + pw, Y + 239, 'rgba(255,255,255,.55)') }
        if (md !== 'gc' && !st.PAY.gross && rc.gross) { var bx = M + 36, bw = LW - 72, by = Y + 284, fp = rc.fee / rc.gross; rr(bx, by, bw * (1 - fp) - 2, 10, 5); var bgd = x.createLinearGradient(bx, 0, bx + bw, 0); bgd.addColorStop(0, '#6724ad'); bgd.addColorStop(1, '#c38bff'); x.fillStyle = bgd; x.fill(); rr(bx + bw * (1 - fp), by, Math.max(4, bw * fp), 10, 5); x.fillStyle = 'rgba(255,107,107,.8)'; x.fill();
          font(400, 18); T('клиенты заплатили ' + RUB(rc.gross), bx, by + 30, 'rgba(255,255,255,.55)'); x.textAlign = 'right'; T('комиссии −' + RUB(rc.fee) + ' · ' + (fp * 100).toFixed(1).replace('.', ',') + '%', bx + bw, by + 30, '#ff8a8a'); x.textAlign = 'left' }
        /* три показателя */
        var Y2 = Y + 350, cw3 = (LW - 32) / 3;[['bag', 'Продажи', NUM(c.n), q ? dl(c.n, q.n) : null], ['receipt', 'Средний чек', RUB(c.avg), q ? dl(c.avg, q.avg) : null], ['users', 'Покупатели', NUM(c.buyers), q ? dl(c.buyers, q.buyers) : null]].forEach(function (t, i) {
          var X = M + i * (cw3 + 16); cardB(X, Y2, cw3, 196); IC(t[0], X + 26, Y2 + 26, 44); font(500, 22); T(t[1], X + 82, Y2 + 48, 'rgba(255,255,255,.6)');
          var f2 = 56; font(500, f2); while (tw(t[2]) > cw3 - 52 && f2 > 34) { f2 -= 2; font(500, f2) } T(t[2], X + 26, Y2 + 118, '#fff'); if (t[3]) { var pw3 = pill(t[3], X + 28, Y2 + 162, 19); font(400, 17); var ct = 'к ' + (n1 ? p.pa.getDate() + ' ' + MONS3[p.pa.getMonth()] : human(p.pa, p.pb, 1)); if (tw(ct) < cw3 - 56 - pw3) T(ct, X + 38 + pw3, Y2 + 163, 'rgba(255,255,255,.45)') } });
        /* план месяца или «по дням» */
        var Y3 = Y2 + 216, h3 = H - 80 - Y3;
        if (st.inMonth && !st.PAY.gross) { var pv = planOf(st.mk), got = rc.sum, last = new Date(p.a.getFullYear(), p.a.getMonth() + 1, 0), curM = key(p.b) === key(today) && p.b < last, fc = curM ? got / p.b.getDate() * last.getDate() : got, mx = Math.max(pv.ideal, fc, got) * 1.06, PX = function (v) { return Math.min(1, v / mx) };
          cardB(M, Y3, LW, h3); IC('target', M + 26, Y3 + 24, 44); font(500, 24); T('План на ' + MONN[p.a.getMonth()], M + 84, Y3 + 46, '#fff'); x.textAlign = 'right'; font(500, 40); var ptx = Math.round(got / pv.ideal * 100) + '%'; T(ptx, M + LW - 30, Y3 + 48, '#fff'); var ptw = tw(ptx); font(400, 18); T('от идеального плана', M + LW - 30 - ptw - 12, Y3 + 52, 'rgba(255,255,255,.5)'); x.textAlign = 'left';
          var px = M + 30, pw2 = LW - 60, py = Y3 + 96; rr(px, py, pw2, 14, 7); x.fillStyle = 'rgba(255,255,255,.07)'; x.fill(); var pg = x.createLinearGradient(px, 0, px + pw2, 0); pg.addColorStop(0, '#6724ad'); pg.addColorStop(1, '#c38bff'); rr(px, py, Math.max(14, pw2 * PX(got)), 14, 7); x.fillStyle = pg; x.fill();
          if (curM && fc > got) { x.save(); rr(px + pw2 * PX(got), py, pw2 * (PX(fc) - PX(got)), 14, 7); x.clip(); x.fillStyle = 'rgba(195,139,255,.22)'; x.fillRect(px, py, pw2, 14); x.restore() }
          [['мин', pv.min], ['опт', pv.opt], ['идеал', pv.ideal]].forEach(function (z, i) { var zx = px + pw2 * PX(z[1]), ok = got >= z[1]; x.fillStyle = ok ? '#4ade80' : 'rgba(255,255,255,.5)'; x.fillRect(zx - 1, py - 6, 2, 26); font(500, 17); x.textAlign = i === 2 ? 'right' : 'center'; T(z[0] + ' ' + SHORT(z[1]), i === 2 ? Math.min(zx + 1, px + pw2) : zx, py + 36, ok ? '#4ade80' : 'rgba(255,255,255,.5)'); x.textAlign = 'left' });
          font(400, 19); var nx2 = [['минимального', pv.min], ['оптимального', pv.opt], ['идеального', pv.ideal]].filter(function (z) { return z[1] > got })[0]; var pl1 = (curM ? 'Прогноз на месяц ' : 'Итог месяца ') + SHORT(curM ? fc : got) + ' ₽', pl2 = nx2 ? 'до ' + nx2[0] + ' плана ' + SHORT(nx2[1] - got) + ' ₽' + (curM && last.getDate() > p.b.getDate() ? ' · ' + SHORT((nx2[1] - got) / (last.getDate() - p.b.getDate())) + ' ₽ в день' : '') : 'идеальный план выполнен';
          T(pl1, px, Y3 + h3 - 28, '#fff'); var p1w = tw(pl1); T(fit('  ·  ' + pl2, LW - 60 - p1w), px + p1w, Y3 + h3 - 28, 'rgba(255,255,255,.6)') }
        else { cardB(M, Y3, LW, h3); IC('pie', M + 26, Y3 + 24, 44); font(500, 24); T(n1 ? 'Последние 7 дней' : 'По ' + ({ day: 'дням', week: 'неделям', month: 'месяцам' })[st.g], M + 84, Y3 + 46, '#fff');
          var bars = n1 ? dayKeys(addD(p.a, -6), p.a).map(function (d) { return [d] }) : bucket(dayKeys(p.a, p.b), st.g), vals = bars.map(function (b) { return b.reduce(function (s2, d) { var z = st.PAY.m[key(d)]; return s2 + (z ? (md === 'gross' ? z.gross : z.sum) : 0) }, 0) }), bmx = Math.max.apply(null, vals.concat([1]));
          var cx0 = M + 30, cw0 = LW - 60, ch0 = h3 - 120, cy0 = Y3 + 80, bwd = cw0 / vals.length;
          vals.forEach(function (v, i) { var hh = v ? Math.max(6, ch0 * v / bmx) : 4, ww = Math.max(4, Math.min(bwd - 8, 64)), isL = i === vals.length - 1 && n1; rr(cx0 + bwd * i + (bwd - ww) / 2, cy0 + ch0 - hh, ww, hh, Math.min(8, ww / 2)); x.fillStyle = v ? (isL || !n1 ? '#c38bff' : 'rgba(195,139,255,.35)') : 'rgba(255,255,255,.08)'; x.fill();
            if (n1) { font(500, 16); x.textAlign = 'center'; if (v) T(SHORT(v), cx0 + bwd * i + bwd / 2, cy0 + ch0 - hh - 14, isL ? '#fff' : 'rgba(255,255,255,.55)'); T(WD[bars[i][0].getDay()] + ' ' + bars[i][0].getDate(), cx0 + bwd * i + bwd / 2, cy0 + ch0 + 22, isL ? '#fff' : 'rgba(255,255,255,.45)'); x.textAlign = 'left' } });
          if (!n1) { font(400, 16); var ax = function (b) { var d = b[0]; return st.g === 'month' ? MONN[d.getMonth()] : d.getDate() + ' ' + MONS3[d.getMonth()] }; T(ax(bars[0]), cx0, cy0 + ch0 + 22, 'rgba(255,255,255,.45)'); if (bars.length > 1) { x.textAlign = 'right'; T(ax(bars[bars.length - 1]), cx0 + cw0, cy0 + ch0 + 22, 'rgba(255,255,255,.45)'); x.textAlign = 'left' } } }
        /* что продали */
        var hP = st.fl ? 520 : H - 80 - Y; cardB(X1, Y, RW, hP); IC('bag', X1 + 30, Y + 30, 44); font(500, 26); T('Что продали', X1 + 88, Y + 46, '#fff'); font(400, 18); T(st.fl ? 'продукты и тарифы · суммы ' + (md === 'gross' ? 'до комиссий' : 'на вывод') : 'продукты и тарифы · стоимость заказов', X1 + 88, Y + 74, 'rgba(255,255,255,.5)');
        if (!G.length) { font(400, 22); T('За период продаж не было', X1 + 36, Y + 150, 'rgba(255,255,255,.5)') }
        else { var dcx = X1 + 40 + 104, dcy = Y + 110 + 148, R = 104, a0 = -Math.PI / 2, gap = G.length > 1 ? .025 : 0; x.lineWidth = 28; x.beginPath(); x.arc(dcx, dcy, R, 0, 7); x.strokeStyle = 'rgba(255,255,255,.06)'; x.stroke();
          G.forEach(function (g) { var ang = g.v / (gt || 1) * Math.PI * 2; x.beginPath(); x.arc(dcx, dcy, R, a0 + gap, a0 + Math.max(gap, ang - gap)); x.strokeStyle = g.c; x.stroke(); a0 += ang });
          x.textAlign = 'center'; font(600, 30); T(SHORT(gt), dcx, dcy - 8, '#fff'); font(400, 17); T(items.length + ' ' + pl(items.length, ['оплата', 'оплаты', 'оплат']), dcx, dcy + 24, 'rgba(255,255,255,.5)'); x.textAlign = 'left';
          var lx = X1 + 300, lw = RW - 300 - 36, ly = Y + 128, rows = G.slice(0, 5), rh = Math.min(76, (hP - 150) / rows.length);
          rows.forEach(function (g, i) { var yy = ly + i * rh; rr(lx, yy - 8, 14, 14, 4); x.fillStyle = g.c; x.fill(); font(600, 22); x.textAlign = 'right'; var sv = RUB(g.v); T(sv, lx + lw, yy, '#fff'); var svw = tw(sv); x.textAlign = 'left';
            font(500, 20); T(fit(g.name, lw - 26 - svw - 18), lx + 26, yy, '#fff'); var ts = g.other ? g.tars.map(function (t) { return t.name + ' ×' + t.n }).join(' · ') : g.n + ' ' + pl(g.n, ['оплата', 'оплаты', 'оплат']) + (g.inst ? ' · в рассрочку — ' + g.inst : '') + ' · ' + Math.round(g.v / (gt || 1) * 100) + '%'; if (ts) { font(400, 17); T(fit(ts, lw - 26), lx + 26, yy + 27, 'rgba(255,255,255,.5)') } }) }
        if (st.fl) { var MM = groupMethods(st.fl.list), mt = MM.reduce(function (s2, g) { return s2 + g.net }, 0), Y4 = Y + hP + 20, h4 = H - 80 - Y4; cardB(X1, Y4, RW, h4); IC('card', X1 + 30, Y4 + 26, 44); font(500, 24); T('Как платили', X1 + 88, Y4 + 48, '#fff');
          var sx = X1 + 30, sw = RW - 60, sy = Y4 + 86, ax2 = sx; MM.forEach(function (g) { var ww = sw * g.net / (mt || 1); rr(ax2, sy, Math.max(4, ww - 3), 12, 6); x.fillStyle = g.c; x.fill(); ax2 += ww });
          var cwm = sw / Math.max(1, MM.length); MM.forEach(function (g, i) { var xx = sx + i * cwm; rr(xx, sy + 36, 12, 12, 3); x.fillStyle = g.c; x.fill(); font(500, 19); var mn = g.name.split(' (')[0]; T(fit(mn, cwm - 70), xx + 20, sy + 43, '#fff'); var mnw = tw(fit(mn, cwm - 70)); font(400, 17); T('×' + g.n, xx + 28 + mnw, sy + 44, 'rgba(255,255,255,.45)'); font(600, 26); T(SHORT(g.net) + ' ₽', xx, sy + 80, '#fff'); font(400, 16); T(g.fee ? 'комиссия ' + (g.fee / g.sum * 100).toFixed(1).replace('.', ',') + '%' : 'без комиссии', xx, sy + 108, g.fee ? '#ff8a8a' : 'rgba(255,255,255,.45)') }) }
        /* подвал */
        var now = new Date(); font(400, 17); T('Данные GetCourse · сформировано ' + dd(now) + ', ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2), M, H - 38, 'rgba(255,255,255,.8)'); x.textAlign = 'right'; T('oduvanovroman.getcourse.ru', W - M, H - 38, 'rgba(255,255,255,.7)'); x.textAlign = 'left';
        return new Promise(function (res) { cv.toBlob(function (b) { res(URL.createObjectURL(b)) }, 'image/png') }) }) };
    var modal = function (url) { var p = S.view.p, m = document.createElement('div'); m.className = 'fss-modal fss';
      var name = 'Продажи ' + (key(p.a) === key(p.b) ? dd(p.a) : dd(p.a) + '–' + dd(p.b)) + '.png';
      m.innerHTML = '<div class="fss-mw"><img alt="Отчёт" src="' + url + '"><div class="fss-mb"><button type="button" class="fss-btn pri fss-sh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6"/></svg>Поделиться</button><button type="button" class="fss-btn fss-dl2">Скачать PNG</button><button type="button" class="fss-btn fss-cp">Копировать</button><button type="button" class="fss-btn fss-x">Закрыть</button></div></div>';
      document.body.appendChild(m);
      var close = function () { m.remove(); document.removeEventListener('keydown', kd) }, kd = function (e) { if (e.key === 'Escape') close() }; document.addEventListener('keydown', kd);
      m.addEventListener('click', function (e) { if (e.target === m) close() }); m.querySelector('.fss-x').onclick = close;
      m.querySelector('.fss-dl2').onclick = function () { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove() };
      var sh = m.querySelector('.fss-sh'); sh.onclick = function () { fetch(url).then(function (r) { return r.blob() }).then(function (b) { var f = new File([b], name, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: 'Отчёт отдела продаж', text: 'Продажи ' + human(p.a, p.b) }).then(function () { return 'ok' });
          return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () { return 'copied' }) }).then(function (r) { if (r === 'copied') sh.lastChild.textContent = 'Скопировано — вставь в чат' }).catch(function (e) { if (e && e.name === 'AbortError') return; sh.lastChild.textContent = 'Не вышло — скачай PNG' }) };
      var cp = m.querySelector('.fss-cp'); cp.onclick = function () { fetch(url).then(function (r) { return r.blob() }).then(function (b) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]) }).then(function () { cp.textContent = 'Скопировано' }).catch(function () { cp.textContent = 'Не вышло — скачай' }) } };

    /* ---------- выбор периода ---------- */
    var perMenu = function () { var wrap = root.querySelector('.fss-per'), old = wrap.querySelector('.fss-menu'); if (old) { old.remove(); return }
      var t = today, items = [['today', 'Сегодня'], ['yest', 'Вчера'], ['d7', 'Последние 7 дней'], ['d28', 'Последние 28 дней'], ['d90', 'Последние 90 дней'], ['d365', 'Последние 365 дней'], ['month', 'Этот месяц'], ['year', 'Этот год'], ['all', 'Всё время']];
      var mons = []; for (var i = 1; i <= 12; i++) { var d = new Date(t.getFullYear(), t.getMonth() - i, 1); if (C.payV && C.payV.first && new Date(d.getFullYear(), d.getMonth() + 1, 0) < C.payV.first) break; mons.push(['m' + d.getFullYear() + '-' + d.getMonth(), cap(MONN[d.getMonth()]) + (d.getFullYear() !== t.getFullYear() ? ' ' + d.getFullYear() : '')]) }
      var bt = function (it) { var p = period(it[0]); return '<button type="button" data-k="' + it[0] + '"' + (S.k === it[0] ? ' class="on"' : '') + '>' + it[1] + '<span>' + (p.a ? human(p.a, p.b, 1) : '') + '</span></button>' };
      var m = document.createElement('div'); m.className = 'fss-menu';
      m.innerHTML = items.slice(0, 6).map(bt).join('') + '<hr>' + items.slice(6).map(bt).join('') + (mons.length ? '<hr><div class="lb">Месяц целиком</div>' + mons.map(bt).join('') : '')
        + '<hr><div class="lb">Свой период</div><div class="fss-cus"><input type="date" class="ca" value="' + key(P().a) + '"><input type="date" class="cb" value="' + key(P().b) + '"><button type="button" class="fss-btn pri cgo">Показать</button></div>';
      wrap.appendChild(m);
      [].forEach.call(m.querySelectorAll('button[data-k]'), function (b) { b.onclick = function () { setPeriod(b.getAttribute('data-k')) } });
      m.querySelector('.cgo').onclick = function () { var a = m.querySelector('.ca').value, b = m.querySelector('.cb').value; if (!a || !b) return; if (a > b) { var z = a; a = b; b = z } setPeriod('c' + a + '_' + b) };
      setTimeout(function () { var off = function (e) { if (!wrap.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', off) } }; document.addEventListener('mousedown', off) }, 0) };
    var perBtn = function () { var p = P(), b = root.querySelector('.fss-per .fss-btn'); if (b) b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>' + esc(p.name) + ' <small>' + esc(p.a && S.k !== 'all' ? human(p.a, p.b, 1) : '') + '</small><svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
      root.querySelector('.fss-per').style.display = tab === 'sales' || tab === 'cumulative' ? '' : 'none'; root.querySelector('.fss-img').style.display = tab === 'sales' ? '' : 'none'; setImg() };
    var setPeriod = function (k) { S.k = k; try { sessionStorage.setItem('fssP', k) } catch (e) {} var m = root.querySelector('.fss-menu'); if (m) m.remove(); perBtn(); show() };

    /* ---------- каркас ---------- */
    var show = function () { [].forEach.call(root.querySelectorAll('.fss-tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === tab) });
      try { history.replaceState(null, '', '/pl/sales/dealstat?fs=' + tab) } catch (e) {} perBtn();
      ({ sales: renderSales, cumulative: renderCumulative, clients: renderClients, table: renderTable })[tab]() };
    var mount = function () { if (document.querySelector('.fss')) return true;
      var host = document.querySelector('.standard-page-content') || document.querySelector('.rd-page-content, .rd-page, [class*="page-content"]') || document.querySelector('.gc-main-content .container') || document.querySelector('.gc-main-content');
      if (!host) return false;
      var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); host.classList.add('fss-host');
      root = document.createElement('div'); root.className = 'fss';
      root.innerHTML = '<div class="fss-hd"><h1>Статистика</h1><div class="fss-acts"><div class="fss-per"><button type="button" class="fss-btn"></button></div>'
        + '<button type="button" class="fss-btn pri fss-img" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6"/></svg>Поделиться отчётом</button>'
        + '<button type="button" class="fss-btn fss-gcv" title="Открыть стандартную страницу GetCourse">GetCourse</button></div></div>'
        + '<div class="fss-tabs">' + TABS.map(function (t) { return '<button type="button" data-t="' + t[0] + '">' + t[1] + '</button>' }).join('') + '</div><div class="fss-body"></div>';
      host.insertBefore(root, host.firstChild); body = root.querySelector('.fss-body'); document.title = 'Статистика';
      [].forEach.call(root.querySelectorAll('.fss-tabs button'), function (b) { b.onclick = function () { tab = b.getAttribute('data-t'); show() } });
      root.querySelector('.fss-per .fss-btn').onclick = perMenu;
      root.querySelector('.fss-gcv').onclick = function () { location.href = '/pl/sales/dealstat?fs=gc' };
      root.querySelector('.fss-img').onclick = function () { var b = this; b.disabled = true; card().then(function (u) { setImg(); modal(u) }).catch(function () { setImg() }) };
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
