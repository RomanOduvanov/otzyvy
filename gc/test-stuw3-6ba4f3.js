/* Фиолетовый стиль: «Актуальные события» — модули потока по дате открытия, уроки раскрываются.
   Работает только на /teach/control/schedule; уроки берутся из тренинга самого ученика, поэтому
   видны только доступные ему модули. */
(function () {
  try { sessionStorage.removeItem('fsNoticeOff') } catch (e) {}
  /* аудит 26.10: служебные (админские) страницы — класс fs-adm: без заставок, без подвала ученика */
  var FS_ADM = /^\/(?:pl\/)?(?:tasks|user\/(?:user|contact|group|settings|employers-stat|control)|sales\/(?:deal|product|offer|control\/(?:deal|participant|payment)|promo|stream|dealstat|tickets|default)|cms|lite\/widget|notifications\/control|teach\/(?:questionary|goal|training|control\/(?:diploma|answers|lesson\/update|stat)|control\/stream\/view\/id\/\d+\/editable)|fileindex|logic|metrika|webinar|showcase|(?:vk|whatsapp|telegram|max|viber|instagram)\/control|gcpay|help\/launcher|assistant|gluing|saas|chatium)/.test(location.pathname); window.FS_ADM = FS_ADM;
  if (FS_ADM) { document.documentElement.classList.add('fs-adm');
    document.addEventListener('DOMContentLoaded', function () { var t = document.querySelector('.resp-screen-title'); if (t && /todo/i.test(t.textContent)) t.textContent = 'Входящие' }) }
  /* короткая заставка (рисует тема с первого кадра): снимаем, когда страница загрузилась, но не раньше 0.6 с от начала загрузки и не позже 3 с */
  (function () { var R = document.documentElement, done = false, go = function () { if (done) return; done = true; R.classList.add('fs-ready'); setTimeout(function () { R.classList.add('fs-done') }, 560) };
    if (window.FS_ADM) go();
    if (document.readyState !== 'loading') setTimeout(go, 150); else document.addEventListener('DOMContentLoaded', function () { setTimeout(go, 150) });
    window.addEventListener('load', go); setTimeout(go, 2500); window.addEventListener('pageshow', function (e) { if (e.persisted) go() }); window.FS_READY = go;
    /* уход со страницы (переход, обновление): плавное затемнение с размытием; если переход не случился (скачивание файла и т.п.) — убираем через 4 с */
    if (window.top === window) { var lt = 0, leave = function () { R.classList.remove('fs-done'); R.classList.add('fs-leave'); clearTimeout(lt); lt = setTimeout(function () { R.classList.remove('fs-leave') }, 1500) };
      var back = function () { clearTimeout(lt); R.classList.remove('fs-leave') }; window.addEventListener('focus', back); document.addEventListener('visibilitychange', function () { if (!document.hidden) back() });
      if (!window.FS_ADM) window.addEventListener('beforeunload', leave);
      window.addEventListener('pageshow', function (e) { if (e.persisted) { clearTimeout(lt); R.classList.remove('fs-leave') } }) } })();
  /* заставка OduvanovSchool: один раз за сессию, кладка + надпись, ~2.7 c (макс. 4 c) */
  (function () {
    var seen = false; try { seen = sessionStorage.getItem('fsL') === '1'; sessionStorage.setItem('fsL', '1') } catch (e) { seen = true }
    if (seen || window.FS_ADM || window.top !== window || /\/pl\/cms\/|editMode=1|\/pl\/lite\/block/.test(location.href)) return;
    var css = '#fsL{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#000106;overflow:hidden;font-family:"Inter Tight",Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;transition:opacity .45s ease,filter .45s ease,transform .45s ease}'
      + '#fsL::before{content:"";position:absolute;left:50%;bottom:-38vh;width:120vw;height:70vh;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(139,69,230,.9),rgba(139,69,230,.25) 50%,transparent);filter:blur(10px);opacity:0;animation:fsLglow 1.6s .1s ease forwards}'
      + '#fsL.out{opacity:0;filter:blur(6px);transform:scale(1.03);pointer-events:none}'
      + '.fsL-row{position:relative;display:flex;align-items:center}.fsL-m{position:relative;width:64px;height:64px;flex:none}'
      + '.fsL-m i{position:absolute;width:20px;height:20px;border-radius:4px;background:#fff;opacity:0;transform:translateY(-16px) scale(.6);animation:fsLin .42s cubic-bezier(.34,1.56,.64,1) forwards}'
      + '.fsL-m i.a{background:#c9a2ff;transform:translateY(-70px) rotate(-18deg) scale(.9);animation:fsLdrop .62s cubic-bezier(.3,1.5,.55,1) forwards,fsLpulse 1.1s ease .95s both}'
      + '.fsL-t{overflow:hidden;max-width:0;white-space:nowrap;animation:fsLw .7s cubic-bezier(.65,0,.35,1) 1.25s forwards}'
      + '.fsL-t span{display:inline-block;padding-left:18px;font-size:34px;letter-spacing:-.03em;line-height:1;color:#fff;font-weight:500}.fsL-t span b{font-weight:500;color:#c9a2ff}'
      + '.fsL-t em{display:inline-block;font-style:normal;opacity:0;transform:translateY(60%);animation:fsLch .5s cubic-bezier(.2,.8,.2,1) forwards}'
      + '@keyframes fsLin{to{opacity:1;transform:none}}@keyframes fsLdrop{0%{opacity:0}25%{opacity:1}100%{opacity:1;transform:none}}'
      + '@keyframes fsLpulse{0%,100%{opacity:1}40%{opacity:.7}}'
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
    var ready = function () { setTimeout(out, Math.max(0, 1900 - (Date.now() - t0))) };
    if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready);
    setTimeout(out, 3000);
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
    var dayM = function (t) { return new Date((t || Date.now()) + 3 * 3600e3).toISOString().slice(0, 10) };
    /* общий для всех вкладок учёт: q — неотправленные секунды по дням МСК, ts/vts — когда последний раз засчитано время сайта/видео.
       Тик любой вкладки засчитывает только время с прошлого тика любой вкладки (не больше 5 с) — две открытые вкладки не дают двойной счёт */
    var K = 'fsT2', rd = function () { var o = null; try { o = JSON.parse(localStorage.getItem(K) || 'null') } catch (e) {} if (!o || typeof o !== 'object') o = {}; if (!o.q || typeof o.q !== 'object') o.q = {}; return o };
    var wr = function (o) { try { localStorage.setItem(K, JSON.stringify(o)) } catch (e) {} };
    var lastAct = Date.now(), vids = {}, lastVid = 0;
    ['mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'].forEach(function (ev) { addEventListener(ev, function () { lastAct = Date.now() }, { passive: true, capture: true }) });
    /* видеоплеер GetCourse шлёт странице события {action:'vh-video-event', detail:{eventType, gcFileId}} */
    addEventListener('message', function (e) { var d = e.data; if (!d || d.action !== 'vh-video-event' || !d.detail) return;
      var t = String(d.detail.eventType || ''), id = d.detail.gcFileId || 'x'; lastVid = Date.now(); lastAct = Date.now();
      if (/pause|stop|end|finish|seeking|error/i.test(t)) vids[id] = 0; else if (/play|resume|start|progress|time/i.test(t)) vids[id] = Date.now() });
    var playing = function () { var n = Date.now(); for (var k in vids) if (vids[k] && n - vids[k] < 6 * 3600e3) return true; return false };
    var tick = function () { var n = Date.now(), vp = playing() && n - lastVid < 15 * 60e3, act = (document.visibilityState === 'visible' && n - lastAct < 90e3) || vp; if (!act) return;
      var o = rd(), d = dayM(n), e = o.q[d] || [0, 0], cr = function (k) { var c = Math.max(0, Math.min(5, (n - (+o[k] || 0)) / 1000)); o[k] = n; return c };
      e[0] = Math.round(((+e[0] || 0) + cr('ts')) * 10) / 10; if (vp) e[1] = Math.round(((+e[1] || 0) + cr('vts')) * 10) / 10;
      o.q[d] = e; wr(o) };
    /* отправка: только непустые дни, кусками до 900 с (лимит сервера); счётчик дня уменьшается только после принятого beacon — хвост прошлых суток не теряется */
    var send = function (min) { if (!API || !navigator.sendBeacon) return; var o = rd(), days = Object.keys(o.q).sort(), tot = 0, ch = false, today = dayM(), old = dayM(Date.now() - 14 * 864e5);
      days.forEach(function (d) { var e = o.q[d] || []; tot += (+e[0] || 0) + (+e[1] || 0) }); if (tot < min) return;
      days.forEach(function (d) { var e = o.q[d] || [0, 0], s = Math.floor(+e[0] || 0), v = Math.floor(+e[1] || 0), k = 0, ok = true;
        if (d < old) { delete o.q[d]; ch = true; return }
        while (ok && (s > 0 || v > 0) && k++ < 4) { var ss = Math.min(s, 900), vv = Math.min(v, 900); ok = false;
          try { ok = navigator.sendBeacon(API + '/t', new Blob([JSON.stringify({ u: U, d: d, s: ss, v: vv })], { type: 'text/plain' })) } catch (x) {}
          if (ok) { s -= ss; v -= vv; e[0] = Math.round(((+e[0] || 0) - ss) * 10) / 10; e[1] = Math.round(((+e[1] || 0) - vv) * 10) / 10; ch = true } }
        if (d !== today && e[0] < 1 && e[1] < 1) { delete o.q[d]; ch = true } else o.q[d] = e });
      if (ch) wr(o) };
    setInterval(tick, 5000);
    setInterval(function () { send(60) }, 120e3);
    /* уход со страницы: одна отправка (после неё очередь пуста, повторный pagehide ничего не шлёт) */
    var bye = function () { tick(); send(5) };
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') bye() }); addEventListener('pagehide', bye);
  })();
  /* страница входа: бренд над карточкой, понятные подписи */
  (function () {
    /*t*/
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
    /*t*/
    var U = window.accountUserId, API = window.FS_API && window.FS_API.indexOf('http') === 0 ? window.FS_API : '';
    if (!U || !API) return;
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    var CARE = 'https://t.me/zabota_oduvanov';
    /* типограф: короткие слова и числа не висят в конце строки, тире не переносится */
    var NB = '\u00a0', typo = function (el) { if (!el) return; var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n, re = /(^|[\s\u00a0(«"])([а-яёА-ЯЁ]{1,3}|\d+)[ ](?=\S)/g, f = function (m, a, b) { return a + b + NB };
      while ((n = w.nextNode())) { var v = n.nodeValue, o = v; v = v.replace(re, f).replace(re, f).replace(/ (—|–)/g, NB + '$1'); if (v !== o) n.nodeValue = v } };
    var me = null, meP = null;
    /* формы имени куратора (CODE-28): с сервера (dat/acc или name_dat/name_acc), иначе по окончанию — Кирилл → Кириллу/Кирилла, Андрей → Андрею/Андрея, Анна → Анне/Анну, Мария → Марии/Марию */
    var nameF = function (c, k) { var s = String(c && c.name || '').trim(), v = c && (c[k] || c['name_' + k]); if (v) return String(v); if (!s) return '';
      var b = s.slice(0, -1), d = k === 'dat';
      if (/[йь]$/i.test(s)) return b + (d ? 'ю' : 'я'); if (/ия$/i.test(s)) return b + (d ? 'и' : 'ю'); if (/я$/i.test(s)) return b + (d ? 'е' : 'ю'); if (/а$/i.test(s)) return b + (d ? 'е' : 'у');
      return /[бвгджзклмнпрстфхцчшщ]$/i.test(s) ? s + (d ? 'у' : 'а') : s };
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
        + (me && !me.cur ? '<button type="button" class="fs-cur-go fs-vm-pick" data-c="' + c.id + '">Выбрать ' + esc(nameF(c, 'acc')) + '</button>' : '') + '</div></div>';
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
    /* курсы с оформлением 2.0 (куратор, «Истории учеников», заголовки): флагман и «AI-креатор + Amazon» (UCH-41) */
    var COURSES = ['935917158', '935869619'], isCourse = COURSES.indexOf((location.pathname.match(/^\/(?:pl\/)?teach\/control\/stream\/view\/id\/(\d+)\/?$/) || [])[1]) >= 0;
    var curBox = null;
    var renderCur = function () { renderCur0(); typo(curBox) };
    var renderCur0 = function () { if (!curBox || !me || !me.ok) return; var c = me.cur;
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
          + (c.tg ? '<a class="fs-cur-tg fs-cur-dm" href="https://t.me/' + encodeURIComponent(c.tg) + '" target="_blank" rel="noopener">' + TGI + '<span>Написать ' + esc(nameF(c, 'dat')) + ' в&nbsp;Telegram' + (c.hours ? '<small>На&nbsp;связи ' + c.hours[0] + ':00–' + c.hours[1] + ':00&nbsp;МСК</small>' : '') + '</span></a>' : '')
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
      var tl = left.querySelector('.xdget-trainingList'), tlH = null; if (tl) { tlH = h('Модули курса'); tl.parentNode.insertBefore(tlH, tl) }
      document.documentElement.classList.add('fs-course');
      var wrap = document.createElement('div'); wrap.className = 'fs-side';
      var curW = document.createElement('div'); curW.className = 'fs-side-cur'; curW.appendChild(h('Твой куратор')); wrap.appendChild(curW);
      curBox = document.createElement('div'); curBox.className = 'fs-cur fs-cur-load'; curBox.innerHTML = '<i class="fs-sk"></i><i class="fs-sk s"></i><i class="fs-sk b"></i>'; curW.appendChild(curBox);
      var st = document.createElement('div'); st.innerHTML = STORIES; wrap.appendChild(st.firstChild);
      right.appendChild(wrap); typo(wrap);
      /* на < 992 карточка куратора — сразу после «Твои баллы и статус», а не после всех модулей (UCH-06) */
      var mq = window.matchMedia ? matchMedia('(max-width:991px)') : null, place = function () { if (mq && mq.matches && tlH) { if (curW.parentNode !== left) left.insertBefore(curW, tlH) } else if (curW.parentNode !== wrap) wrap.insertBefore(curW, wrap.firstChild) };
      place(); if (mq) { if (mq.addEventListener) mq.addEventListener('change', place); else if (mq.addListener) mq.addListener(place) }
      getMe().then(function () { renderCur() }) };
    /* рекламный баннер GetCourse (видят только админы) — убираем */
    var killAd = function () { [].forEach.call(document.querySelectorAll('.banner-frame, iframe[src*="banner"]'), function (f) { var w = f.closest('[style*="position: fixed"], [style*="position:fixed"]') || f; w.remove() }) };
    try { var mo = new MutationObserver(killAd); mo.observe(document.documentElement, { childList: true, subtree: true }); setTimeout(function () { mo.disconnect() }, 20000) } catch (e) {}
    var go = function () { course(); notice(); killAd() };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();
  /* ===== «Мои покупки» (/sales/control/userProduct/my): кольца доступа, темп, бонусный счёт, повышение тарифа, незавершённые заказы ===== */
  (function () {
    /*t*/
    if (!/^\/sales\/control\/userProduct\/my\/?$/.test(location.pathname)) return;
    var U = window.accountUserId; if (!U) return;
    var RT = 'https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/', CARE = 'https://t.me/zabota_oduvanov', COURSE = '/teach/control/stream/view/id/935917158';
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    var NUM = function (n) { return Math.round(n || 0).toLocaleString('ru-RU').replace(/\s/g, ' ') };
    var pl = function (n, f) { n = Math.abs(Math.round(n)); var a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2] };
    var MON = { 'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4, 'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11 };
    var MONG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var pd = function (s) { var m = String(s || '').toLowerCase().match(/(\d{1,2})\s+([а-я]{3})[а-я]*\.?\s+(\d{4})/); return m && MON[m[2]] != null ? new Date(+m[3], MON[m[2]], +m[1]) : null };
    var day0 = function (d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d };
    var today = day0(new Date()), DAY = 864e5;
    var fmtD = function (d) { return d.getDate() + '&nbsp;' + MONG[d.getMonth()] + ' ' + d.getFullYear() };
    var sha = function (u) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode('gc2:' + u)).then(function (b) { return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2) }).join('').slice(0, 16) }) };
    var I = {
      bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', chev: '<path d="m9 6 6 6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
      star: '<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7L12 3Z"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
      gift: '<path d="M20 12v8H4v-8"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H8a2.5 2.5 0 1 1 0-5c3 0 4 5 4 5Z"/><path d="M12 7h4a2.5 2.5 0 1 0 0-5c-3 0-4 5-4 5Z"/>',
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', check: '<path d="m5 12 5 5 9-10"/>' };
    var ico = function (n, sz, cls) { return '<svg aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + ' width="' + (sz || 18) + '" height="' + (sz || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + I[n] + '</svg>' };

    /* тарифы: что даёт следующий (с сайта romanoduvanov.ru/ai, без цен). Первая строка «Премиума» (модуль Amazon) берётся из data.json */
    var TORD = ['База', 'Премиум', 'Премиум Амазон'], tmax = function (a, b) { return TORD.indexOf(a) >= TORD.indexOf(b) ? (a || b || '') : b };
    var UPG = {
      'Премиум': { to: 'Премиум Амазон', lead: 'Всё, что есть в&nbsp;твоём Премиуме, плюс заработок на&nbsp;зарубежном рынке и&nbsp;первые клиенты от&nbsp;школы.', pts: [
        ['Модуль «Amazon»', 'фриланс в&nbsp;США: контент, портфолио и&nbsp;клиенты'], ['Гарантированный клиент', 'первый заказ от&nbsp;10 000 ₽'], ['Карьерный центр', 'канал с&nbsp;клиентами и&nbsp;заказами'],
        ['Работа в&nbsp;моём агентстве', 'возможность получать заказы пассивно'], ['Старший куратор 24/7', 'поддержка в&nbsp;любое время'], ['Эфир о&nbsp;зарубежном дизайне', 'от&nbsp;топового спикера']] },
      'База': { to: 'Премиум', lead: 'Всё, что есть в&nbsp;Базе, плюс проверка домашек, личный куратор и&nbsp;модуль о&nbsp;продажах.', pts: [
        ['Модуль «Поток клиентов и&nbsp;продажи»', 'как находить заказчиков и&nbsp;продавать'], ['Домашние задания', 'с&nbsp;проверкой и&nbsp;обратной связью'], ['Личный куратор', 'индивидуальная поддержка'],
        ['Разборы и&nbsp;online-практика', 'групповые эфиры с&nbsp;ответами на&nbsp;вопросы'], ['Чаты потока и&nbsp;вакансий', 'общение и&nbsp;первые заказы'], ['Предобучение', 'мягкий старт до&nbsp;основного курса']] } };
    /* модуль Amazon из data.json: название и число уроков как в курсе */
    var amz = function (D) { var m = D && D.modules ? D.modules.filter(function (x) { return x.amazon })[0] : null; if (!m) return null;
      var n = (m.parts || []).reduce(function (k, p) { return k + (p.lessons || []).length }, 0);
      return { nm: String(m.name || 'Amazon').replace(/^Модуль\s+\S+\s+[—–-]\s+/, ''), n: n, desc: m.desc || '' } };
    /* флагманский курс: продукт «AI-дизайнер … 2.0» = тренинг «AI-креатор с 0 до PRO 2.0» */
    var FLAG = /AI-(дизайнер|креатор)/i;
    var clean = function (s) { return String(s || '').replace(/\s*\(в\s*рассрочку\)\s*/i, ' ').replace(/\s+-\s+/g, ' · ').replace(/\s+/g, ' ').trim() };
    var numF = function (s) { return String(s || '').replace(/^\s*(Заказ|Заявка)\s*[#№]\s*/i, 'Заказ №') };
    var costF = function (s) { return String(s || '').replace(/\s*руб\.?/i, ' ₽').replace(/\s+/g, ' ').trim() };
    var tarOf = function (name) { if (!FLAG.test(name)) return ''; var m = String(name).match(/\s[-–—·]\s*(Премиум\s+(?:Амазон|Amazon)|Премиум|База)/i);
      return m ? (/амазон|amazon/i.test(m[1]) ? 'Премиум Амазон' : /премиум/i.test(m[1]) ? 'Премиум' : 'База') : '' };

    /* ---------- разбор исходной страницы GetCourse ---------- */
    var parse = function (box) {
      var out = { prods: [], open: [], done: [], promo: null, bal: '' }, tables = box.querySelectorAll('table');
      var pr = box.querySelector('a[href*="promo-code/my-codes"]'); if (pr) out.promo = pr.getAttribute('href');
      var bi = box.querySelector('.gc-bonus-info'); if (bi) out.bal = bi.textContent.replace(/\s+/g, ' ').trim();
      [].forEach.call(tables, function (t) { var h = t.previousElementSibling; while (h && !/^H\d$/.test(h.tagName)) h = h.previousElementSibling; var ttl = h ? h.textContent.trim().toLowerCase() : '';
        [].forEach.call(t.querySelectorAll('tbody tr'), function (tr) { var td = tr.querySelectorAll('td'); if (td.length < 3) return; var a = td[0].querySelector('a') || td[1].querySelector('a'), tx = function (i) { return td[i] ? td[i].textContent.replace(/\s+/g, ' ').trim() : '' };
          if (/купленн/.test(ttl)) { var per = tx(1), m = per.split(/\s+до\s+/i); out.prods.push({ name: tx(0).replace(/^(Покупка\s*)?#\d+\.\s*/i, ''), href: a ? a.getAttribute('href') : '', a: pd(m[0]), b: m[1] ? pd(m[1]) : null, active: /активн/i.test(tx(2)), status: tx(2), ends: tx(3) }) }
          else if (/незаверш/.test(ttl)) { var pay = tr.querySelector('a[href*="/sales/shop/deal/"]'); out.open.push({ num: tx(0), name: (td[1].querySelector('a') || td[1]).textContent.replace(/\s+/g, ' ').trim(), href: pay ? pay.getAttribute('href') : '', status: tx(2), cost: tx(3), part: /частичн/i.test(tx(2)) }) }
          else if (/завершен/.test(ttl)) { out.done.push({ num: tx(0), name: (td[1].querySelector('a') || td[1]).textContent.replace(/\s+/g, ' ').trim(), href: a ? a.getAttribute('href') : '', status: tx(2), cost: tx(3) }) } }) });
      return out };
    /* одна строка на продукт: активная и с самой поздней датой окончания (STU-16) */
    var uniq = function (arr) { var by = {}, out = [];
      arr.forEach(function (p) { var k = p.name.toLowerCase().replace(/\s+/g, ' ').trim(), q = by[k];
        if (!q) { by[k] = p; out.push(p); return }
        if ((p.active && !q.active) || (p.active === q.active && q.b && (!p.b || p.b > q.b))) { out[out.indexOf(q)] = p; by[k] = p } });
      return out };
    /* тренинги ученика: ссылка «к урокам» ведёт в тренинг, а не в карточку покупки (PROF-23) */
    var TRP = null, trainings = function () { if (!TRP) TRP = fetch('/teach/control/stream', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : '' }).then(function (t) {
        var d = new DOMParser().parseFromString(t, 'text/html');
        return [].map.call(d.querySelectorAll('tr.training-row[data-training-id]'), function (r) { var a = r.querySelector('a[href]'), s = r.querySelector('.stream-title'); return { t: (s || a || r).textContent.replace(/\s+/g, ' ').trim(), href: a ? a.getAttribute('href') : '' } })
          .filter(function (x) { return x.href && !/архив|служебн/i.test(x.t) }) }).catch(function () { return [] }); return TRP };
    var toks = function (s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/креатор/g, 'дизайнер').split(/[^a-zа-я0-9]+/).filter(function (w) { return w.length >= 3 }) };
    var link = function (p, T) { if (FLAG.test(p.name) && /2\.0/.test(p.name)) return COURSE;
      var a = toks(p.name), best = null, bs = 0;
      (T || []).forEach(function (x) { var b = toks(x.t), sc = a.filter(function (w) { return b.indexOf(w) >= 0 }).length; if (sc > bs || (sc && sc === bs && x.t.length < best.t.length)) { bs = sc; best = x } });
      return best ? best.href : '/teach/control/stream' };

    /* ---------- кольцо ---------- */
    var ring = function (size, sw, frac, warn, gid, label) { var r = (size - sw) / 2, C = 2 * Math.PI * r, L = Math.max(0, Math.min(1, frac)) * C;
      var stroke = warn ? '#ff9f6b' : 'url(#' + gid + ')';
      return '<svg role="img" aria-label="' + esc(label) + '" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
        + (warn ? '' : '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fef8ff"/><stop offset=".5" stop-color="#d77fff"/><stop offset="1" stop-color="#9657e8"/></linearGradient></defs>')
        + '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="' + sw + '"' + (frac <= 0 ? ' stroke-dasharray="4 10"' : '') + '/>'
        + (frac > 0 ? '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + L.toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' : '') + '</svg>' };
    /* дни до даты окончания без +1 (как «через N дней» GetCourse и рейтинг, STU-05); в последний день доступ ещё открыт */
    var acc = function (p) { if (!p.b) return { left: null, frac: 1, warn: false, dead: !p.active }; var tot = Math.max(1, Math.round((p.b - (p.a || today)) / DAY)), left = Math.round((p.b - today) / DAY);
      var dead = !p.active || left < 0; if (dead) left = 0; return { left: left, frac: dead ? 0 : Math.max(left, .5) / tot, warn: !dead && left <= 30, soon: !dead && left < 7, dead: dead, tot: tot } };

    /* ---------- темп ---------- */
    var pace = function (lessLeft, daysLeft) { if (lessLeft <= 0) return '<b>Все уроки пройдены!</b> Пока открыт доступ, возвращайся к&nbsp;любимым темам и&nbsp;пересматривай разборы.';
      if (!daysLeft) return '<b>До конца курса ' + lessLeft + ' ' + pl(lessLeft, ['урок', 'урока', 'уроков']) + '.</b>';
      var d = daysLeft * 0.9 / lessLeft;
      var s = d >= 7 ? 'Хватит 1 урока в&nbsp;неделю' : d >= 2 ? 'Хватит 1 урока в&nbsp;' + Math.floor(d) + '&nbsp;' + pl(Math.floor(d), ['день', 'дня', 'дней']) : d >= 1 ? 'Хватит 1 урока в&nbsp;день' : 'Нужно ' + Math.ceil(1 / d) + '&nbsp;' + pl(Math.ceil(1 / d), ['урок', 'урока', 'уроков']) + ' в&nbsp;день';
      return '<b>' + s + '</b>, чтобы пройти ' + (lessLeft > 1 ? 'оставшиеся ' + lessLeft + '&nbsp;' + pl(lessLeft, ['урок', 'урока', 'уроков']) + ' курса' : 'последний урок курса') + ' и&nbsp;оставить время на&nbsp;повторение.' };

    var CSS = ':root.fmp-on .fmp-host>*:not(.fmp){display:none!important}'
      + ':root.fmp-on .fmp-host{width:auto!important;max-width:1240px!important;margin-left:auto!important;margin-right:auto!important;padding-left:24px!important;padding-right:24px!important;box-sizing:border-box!important;float:none!important}@media(max-width:767px){:root.fmp-on .fmp-host{padding-left:16px!important;padding-right:16px!important}}'
      + '.fmp{--s1:#161616;--s0:#0c0c0c;--hair:rgba(255,255,255,.07);--ink2:rgba(255,255,255,.58);--acc:#d77fff;--lil:#c38bff;color:#fff;font-family:"Inter Tight",Inter,system-ui,sans-serif;display:flex;flex-direction:column;gap:16px;padding:8px 0 64px}.fmp *{box-sizing:border-box}'
      + '.fmp-hd{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:40px 0 28px;margin-bottom:12px;border-bottom:1px solid var(--hair)}.fmp-hd h1{margin:0!important;font-size:56px!important;line-height:1.04!important;font-weight:500!important;letter-spacing:-.03em!important;color:#fff!important}.fmp-hd p{margin:10px 0 0;font-size:17px;color:var(--ink2)}'
      + '.fmp-btn2{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 16px;border-radius:14px;border:1px solid var(--hair);background:var(--s1);color:#fff!important;font-family:inherit;font-weight:500;font-size:14px;line-height:1;text-decoration:none!important;cursor:pointer;white-space:nowrap}.fmp-btn2:hover{background:#1f1f1f}'
      + '.fmp-card{background:var(--s1);border:1px solid var(--hair);border-radius:40px;padding:40px;min-width:0}@media(max-width:700px){.fmp-card{border-radius:28px;padding:24px}.fmp-hd h1{font-size:40px!important}.fmp-hd{padding-top:16px}}'
      /* телефон и планшет: шапка GetCourse fixed 60 px — заголовок не уходит под неё (STU-10) */
      + ':root.fmp-topfix .fmp-hd{padding-top:calc(var(--fmp-top,0px) + 16px)!important}'
      + '.fmp-main{display:flex;flex-wrap:wrap;gap:44px;align-items:center}.fmp-ring{position:relative;width:248px;height:248px;flex:none}@media(max-width:1023px){.fmp-ring{margin:0 auto}}@media(max-width:700px){.fmp-main{gap:22px}.fmp-ring{width:200px;height:200px}.fmp-ring svg{width:200px;height:200px}}'
      + '.fmp-rc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.fmp-rc i{font-style:normal;font-size:12px;letter-spacing:.12em;font-weight:700;color:var(--ink2)}.fmp-rc b{font-size:64px;font-weight:500;letter-spacing:-.04em;line-height:1.05}.fmp-rc b.w{color:#ffb48c}.fmp-rc span{font-size:15px;color:var(--ink2)}'
      + '.fmp-mb{flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:18px}.fmp-chips{display:flex;gap:8px;flex-wrap:wrap}.fmp-chip{font-size:12px;font-weight:700;letter-spacing:.1em;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.78);text-transform:uppercase}.fmp-chip.l{background:var(--lil);border-color:var(--lil);color:#1a0b2e}.fmp-chip.w{border-color:rgba(255,159,107,.5);color:#ffb48c}'
      + '.fmp h2{margin:0!important;font-size:38px!important;line-height:1.1!important;font-weight:500!important;letter-spacing:-.025em!important;color:#fff!important}@media(max-width:700px){.fmp h2{font-size:26px!important}}'
      + '.fmp-pr{display:flex;justify-content:space-between;font-size:15px;color:var(--ink2);margin-bottom:10px}.fmp-pr b{color:#fff;font-weight:600}.fmp-bar{height:10px;border-radius:6px;background:rgba(255,255,255,.06);overflow:hidden}.fmp-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#6724ad,#c38bff)}.fmp-prn{margin:8px 0 0;font-size:14px;color:var(--ink2)}'
      + '.fmp-tip{display:flex;gap:14px;align-items:flex-start;padding:18px 20px;border-radius:22px;background:rgba(195,139,255,.08);border:1px solid rgba(195,139,255,.2);font-size:16px;line-height:1.45;color:rgba(255,255,255,.78)}.fmp-tip svg{flex:none;color:var(--lil);margin-top:2px}.fmp-tip b{color:#fff;font-weight:600}.fmp-tip em{font-style:normal;color:var(--acc)}'
      + '.fmp-go{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.fmp-btn{letter-spacing:-.01em;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:10px;height:56px;padding:0 28px;border-radius:16px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font-family:inherit;font-weight:600;font-size:17px;line-height:1;text-decoration:none!important;border:0;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6)}.fmp-btn:hover{filter:brightness(1.03)}.fmp-btn.s{background:rgba(255,255,255,.11);color:#fff!important;box-shadow:none}.fmp-btn.s:hover{background:rgba(255,255,255,.16);filter:none}.fmp-go span{font-size:14px;color:var(--ink2)}@media(max-width:480px){.fmp-go .fmp-btn{width:100%}}'
      + '.fmp-row{display:flex;flex-wrap:wrap;gap:16px}.fmp-row>.fmp-card{flex:2 1 520px}.fmp-row>.fmp-bonus{flex:1 1 320px}'
      + '.fmp h3{margin:0!important;font-size:24px!important;font-weight:500!important;letter-spacing:-.02em!important;color:#fff!important;line-height:1.2!important}.fmp-sub{margin:4px 0 0;font-size:14px;color:var(--ink2)}'
      + '.fmp-li{display:flex;align-items:center;gap:20px;padding:16px 0;border-top:1px solid var(--hair);color:#fff!important;text-decoration:none!important}.fmp-li:first-of-type{border-top:0}.fmp-li .t{flex:1;min-width:0}.fmp-li .t b{display:block;font-size:17px;font-weight:500}.fmp-li .t span{display:block;font-size:14px;color:var(--ink2);margin-top:2px}.fmp-li .t span.w{color:#ffb48c}.fmp-li>svg:last-child{color:rgba(255,255,255,.4);flex:none}.fmp-li:hover .t b{color:var(--acc)}'
      + '.fmp-bonus{display:flex;flex-direction:column;gap:14px}.fmp-bh{display:flex;align-items:center;gap:12px}.fmp-tile{width:44px;height:44px;border-radius:14px;background:rgba(195,139,255,.12);display:grid;place-items:center;color:var(--lil);flex:none}.fmp-bv b{margin-right:8px;font-size:56px;font-weight:500;letter-spacing:-.04em;line-height:1}.fmp-bv span{font-size:20px;color:var(--ink2)}.fmp-bonus p{margin:0;font-size:15px;line-height:1.45;color:var(--ink2)}.fmp-bf{margin-top:auto;padding-top:14px;border-top:1px solid var(--hair);font-size:14px;color:var(--ink2)}'
      + '.fmp-up{border-radius:40px;padding:40px;background:linear-gradient(160deg,#6724ad 0%,#3a1470 45%,#1c0838 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);display:flex;flex-wrap:wrap;gap:40px}@media(max-width:700px){.fmp-up{border-radius:28px;padding:24px;gap:22px}}'
      + '.fmp-ul{flex:1 1 360px;min-width:0;display:flex;flex-direction:column;gap:16px}.fmp-ul .fmp-chip{align-self:flex-start;background:rgba(0,1,6,.35);border:0;color:#fccbff}.fmp-ul h3{font-size:44px!important;letter-spacing:-.03em!important;line-height:1.08!important}.fmp-ul p{margin:0;font-size:17px;line-height:1.45;color:rgba(255,255,255,.82)}.fmp-ul small{font-size:14px;color:rgba(255,255,255,.72);line-height:1.4}.fmp-ua{margin-top:auto;display:flex;flex-direction:column;gap:10px;align-items:flex-start}.fmp-up .fmp-btn.s{background:rgba(255,255,255,.14)}'
      + '.fmp-ug{flex:1.3 1 420px;min-width:0;margin:0!important;padding:0!important;list-style:none!important;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(max-width:700px){.fmp-ug{grid-template-columns:1fr}.fmp-ul h3{font-size:32px!important}}.fmp-ug li{background:rgba(0,1,6,.35);border-radius:22px;padding:20px;font-size:15px;line-height:1.4;color:rgba(255,255,255,.75);margin:0!important}.fmp-ug li b{display:block;color:#fff;font-weight:600;font-size:16px;margin-bottom:4px}'
      + '.fmp-oh{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:12px}.fmp-o{display:flex;align-items:center;gap:14px;padding:16px 0;border-top:1px solid var(--hair);flex-wrap:wrap}.fmp-o .t{flex:1 1 300px;min-width:0}.fmp-o .t b{display:block;font-size:16px;font-weight:500}.fmp-o .t span{display:block;font-size:14px;color:var(--ink2);margin-top:2px}.fmp-o.gone{opacity:.45}.fmp-o.gone .t b{text-decoration:line-through}'
      + '.fmp-o .fmp-chip{display:inline-block;margin:0 0 6px;padding:4px 10px;font-size:11px}.fmp-o .t span.fmp-chip{display:inline-block;color:#1a0b2e;margin-top:0}'
      + '.fmp-pay{height:44px;display:inline-flex;align-items:center;padding:0 16px;border-radius:12px;background:rgba(255,255,255,.11);color:#fff!important;font-size:14px;font-weight:500;text-decoration:none!important}.fmp-pay:hover{background:rgba(255,255,255,.16)}'
      + '.fmp-x{width:44px;height:44px;border-radius:12px;border:1px solid var(--hair);background:transparent;color:var(--ink2);display:inline-grid;place-items:center;cursor:pointer}.fmp-x:hover{color:#ff6b6b;border-color:rgba(255,107,107,.35)}.fmp-ln{min-height:44px;padding:0;border:0;background:transparent;color:var(--ink2);font-family:inherit;font-weight:500;font-size:14px;line-height:normal;cursor:pointer}.fmp-ln:hover{color:#fff}.fmp-ln.a{color:var(--acc)}'
      + '.fmp-fold{display:flex;align-items:center;justify-content:space-between;width:100%;padding:24px 40px;border-radius:28px;border:1px solid var(--hair);background:var(--s0);color:rgba(255,255,255,.78);font-family:inherit;font-weight:500;font-size:16px;line-height:normal;cursor:pointer}.fmp-fold svg{transition:transform .2s}.fmp-fold.open svg{transform:rotate(180deg)}@media(max-width:700px){.fmp-fold{padding:20px 24px}}'
      + '.fmp-dl{display:none;padding:8px 40px 16px}.fmp-dl.open{display:block}.fmp-dl a{color:#fff!important;text-decoration:none!important}.fmp-dl a:hover{color:var(--acc)!important}@media(max-width:700px){.fmp-dl{padding:8px 24px 16px}}.fmp-bal{font-size:14px;color:var(--ink2);padding:0 4px}'
      /* скелетон, пока грузятся рейтинг и тренинги (PROF-24: без «прыжка» урезанной версии) */
      + '.fmp-sk{display:block;border-radius:12px;background:linear-gradient(90deg,#1c1c1c 25%,#262626 50%,#1c1c1c 75%);background-size:300% 100%;animation:fmpSk 1.3s ease-in-out infinite}.fmp-sk.r{width:100%;height:100%;border-radius:50%}@keyframes fmpSk{0%{background-position:100% 0}100%{background-position:0 0}}@media(prefers-reduced-motion:reduce){.fmp-sk{animation:none}}';

    var HK = 'fmpHide:' + U, hidden = {}; try { hidden = JSON.parse(localStorage.getItem(HK) || '{}') || {} } catch (e) {}
    var saveH = function () { try { localStorage.setItem(HK, JSON.stringify(hidden)) } catch (e) {} };

    var NB = ' ', typo = function (el) { var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n;
      while ((n = w.nextNode())) { var v = n.nodeValue, o = v;
        v = v.replace(/(^|[\s («"])([а-яёА-ЯЁ]{1,3}|\d+)[ ](?=\S)/g, function (m, a, b) { return a + b + NB }).replace(/(^|[\s («"])([а-яёА-ЯЁ]{1,3}|\d+)[ ](?=\S)/g, function (m, a, b) { return a + b + NB }).replace(/ (—|–|=|·)/g, NB + '$1').replace(/ ₽/g, NB + '₽').replace(/([A-Za-zА-Яа-яЁё]) (\d+\.\d+)/g, '$1' + NB + '$2');
        if (v !== o) n.nodeValue = v } };
    var gcName = function () { var n = String(window.accountSafeUserName || '').trim().split(/\s+/)[0] || ''; return /@|^\d+$/.test(n) ? '' : n };
    var head = function (name, P) { return '<header class="fmp-hd"><div><h1>Мои покупки</h1><p>' + (name ? 'Привет, ' + esc(name) + '! ' : '') + 'Здесь всё, к&nbsp;чему у&nbsp;тебя есть доступ.</p></div>'
      + (P.promo ? '<a class="fmp-btn2" href="' + esc(P.promo) + '">' + ico('gift', 16) + 'Мои промокоды</a>' : '') + '</header>' };
    var skel = function (P) { return head(gcName(), P) + '<section class="fmp-card fmp-main" aria-busy="true" aria-label="Загружаем"><div class="fmp-ring"><i class="fmp-sk r"></i></div><div class="fmp-mb"><i class="fmp-sk" style="width:38%;height:28px"></i><i class="fmp-sk" style="width:72%;height:40px"></i><i class="fmp-sk" style="height:22px"></i><i class="fmp-sk" style="height:76px"></i><i class="fmp-sk" style="width:220px;height:56px;border-radius:16px"></i></div></section>'
      + '<div class="fmp-row"><section class="fmp-card"><i class="fmp-sk" style="width:46%;height:26px;margin-bottom:24px"></i><i class="fmp-sk" style="height:56px;margin-bottom:16px"></i><i class="fmp-sk" style="height:56px"></i></section><section class="fmp-card fmp-bonus"><i class="fmp-sk" style="height:44px;width:60%"></i><i class="fmp-sk" style="height:56px;width:40%"></i><i class="fmp-sk" style="height:60px"></i></section></div>' };

    var render = function (root, P, me, D, T) {
      var prods = uniq(P.prods);
      var main = prods.filter(function (p) { return FLAG.test(p.name) && p.active })[0] || prods.filter(function (p) { return FLAG.test(p.name) })[0] || prods.filter(function (p) { return p.active })[0] || prods[0];
      var flag = !!main && FLAG.test(main.name), rest = prods.filter(function (p) { return p !== main });
      /* имя — из GetCourse (STU-22), тариф — из оплаченных заказов на этой странице, data.json — запасной (PROF-24) */
      var name = gcName() || (me && me.name ? String(me.name).split(/\s+/)[0] : ''), h = '';
      var tar = P.done.concat(P.open.filter(function (o) { return o.part })).reduce(function (t, o) { return tmax(t, tarOf(o.name)) }, '');
      if (me && me.tar) tar = tmax(tar, /amazon|амазон/i.test(me.tar) ? 'Премиум Амазон' : me.tar);
      var hi = function (m) { return 'Здравствуйте!' + (name ? ' Меня зовут ' + name + '.' : '') + ' ' + m };
      var care = function (m) { return CARE + '?text=' + encodeURIComponent(hi(m)) };
      h += head(name, P);
      var offerMain = !flag; /* у ученика без флагмана главная кнопка — оффер курса */
      /* нет флагмана (AI-креатор/AI-дизайнер любой версии), но есть Спринт и/или Практикум — переход на флагман 3.0 с зачётом оплаченного (решение Романа 26.10) */
      var FL3 = 'https://oduvanovroman.getcourse.ru/ai3_prem', SPR = /спринт|практикум/i;
      var hasFlag = flag || P.prods.concat(P.done, P.open.filter(function (o) { return o.part })).some(function (o) { return FLAG.test(o.name) });
      var spDone = P.done.filter(function (o) { return SPR.test(o.name) && /заверш|оплач/i.test(o.status) });
      var spNm = ['Спринт', 'Практикум'].filter(function (w) { return P.prods.concat(spDone).some(function (o) { return new RegExp(w, 'i').test(o.name) }) });
      var fl3 = !hasFlag && spNm.length > 0, spSum = spDone.reduce(function (s, o) { var n = parseInt(String(o.cost || '').replace(/[^\d,.]/g, '').split(/[.,]/)[0], 10); return s + (n > 0 ? n : 0) }, 0);
      if (main) { var A = acc(main), isCourse = flag && /2\.0/.test(main.name), nowT = Date.now(), amzOK = tar === 'Премиум Амазон';
        /* уроки: «открытые» считаются как total_lessons в data.json (все уроки частей, открытых к этому моменту), «в курсе» — все модули тарифа (PROF-25, STU-20) */
        var cnt = function (open) { return D && D.modules ? D.modules.reduce(function (n, m) { if (m.amazon && !amzOK) return n; return n + (m.parts || []).reduce(function (k, p) { if (open && !(p.at && Date.parse(p.at) <= nowT)) return k; return k + (p.lessons || []).length }, 0) }, 0) : 0 };
        var tlOpen = cnt(true) || (D && D.total_lessons) || 0, tlAll = Math.max(cnt(false), tlOpen), ls = me ? Math.min(me.lessons || 0, tlOpen || 9999) : 0, pc = tlOpen ? Math.min(100, Math.round(ls / tlOpen * 100)) : 0;
        var goHref = isCourse ? COURSE : link(main, T), prolong = (window.FS_PROLONG && window.FS_PROLONG(main.name)) || care('Хочу продлить доступ к «' + clean(main.name) + '». Подскажите, как это сделать?');
        h += '<section class="fmp-card fmp-main" aria-label="' + esc(clean(main.name)) + '"><div class="fmp-ring">' + ring(248, 16, A.frac, A.warn, 'fmpG0', A.dead ? 'Доступ закончился' : A.left == null ? 'Бессрочный доступ' : A.left === 0 ? 'Сегодня последний день доступа' : 'Осталось ' + A.left + ' ' + pl(A.left, ['день', 'дня', 'дней']) + ' доступа')
          + '<div class="fmp-rc">' + (A.dead ? ico('lock', 34) + '<span style="margin-top:8px">доступ закончился</span>' : A.left == null ? '<b>∞</b><span>бессрочный доступ</span>' : A.left === 0 ? '<i>СЕГОДНЯ</i><b class="w">0</b><span>последний день</span>' : '<i>ОСТАЛОСЬ</i><b' + (A.warn ? ' class="w"' : '') + '>' + A.left + '</b><span>' + pl(A.left, ['день', 'дня', 'дней']) + ' доступа</span>') + '</div></div>'
          + '<div class="fmp-mb"><div class="fmp-chips">' + (flag && tar ? '<span class="fmp-chip l">Тариф ' + esc(tar) + '</span>' : '') + (main.b ? '<span class="fmp-chip' + (A.warn ? ' w' : '') + '">' + (A.dead ? 'Доступ был до ' : A.soon ? 'Доступ заканчивается ' : 'Доступ до ') + main.b.getDate() + ' ' + MONG[main.b.getMonth()] + ' ' + main.b.getFullYear() + '</span>' : '') + '</div>'
          + '<h2>' + esc(clean(main.name)) + '</h2>';
        if (isCourse && tlOpen && me) h += '<div><div class="fmp-pr"><span><b>' + ls + ' ' + pl(ls, ['урок', 'урока', 'уроков']) + '</b> из&nbsp;' + tlOpen + ' открытых пройдено</span><span>' + pc + '%</span></div><div class="fmp-bar"><i style="width:' + pc + '%"></i></div>'
          + (tlAll > tlOpen ? '<p class="fmp-prn">Всего в&nbsp;курсе на&nbsp;твоём тарифе ' + tlAll + ' ' + pl(tlAll, ['урок', 'урока', 'уроков']) + ', остальные откроются по&nbsp;расписанию.</p>' : '') + '</div>'
          + '<div class="fmp-tip">' + ico('bolt', 22) + '<div>' + (A.dead ? 'Доступ закончился. Напиши в&nbsp;службу заботы&nbsp;— поможем продлить и&nbsp;вернуться к&nbsp;урокам.' : pace(tlAll - ls, A.left) + (me.week > 0 ? ' За&nbsp;эту неделю у&nbsp;тебя <em>+' + NUM(me.week) + ' ' + pl(me.week, ['балл', 'балла', 'баллов']) + '</em>' + (me.place ? '&nbsp;— ты ' + me.place + '-й в&nbsp;рейтинге потока.' : '.') : ' На&nbsp;этой неделе уроков ещё не&nbsp;было&nbsp;— самое время продолжить.')) + '</div></div>';
        else if (A.dead) h += '<div class="fmp-tip">' + ico('bolt', 22) + '<div>Доступ закончился. Напиши в&nbsp;службу заботы&nbsp;— поможем продлить и&nbsp;вернуться к&nbsp;урокам.</div></div>';
        /* одна главная кнопка: «Продлить» (закончился или меньше 7 дней), иначе «к урокам»; у ученика без флагмана главная — в оффере курса */
        var urgent = A.dead || A.soon, goBtn = '<a class="fmp-btn' + (urgent || offerMain ? ' s' : '') + '" href="' + esc(goHref) + '">' + (isCourse && ls ? 'Продолжить обучение' : 'Перейти к&nbsp;урокам') + ico('arrow', 18) + '</a>';
        h += '<div class="fmp-go">' + (urgent ? '<a class="fmp-btn' + (fl3 ? ' s' : '') + '" href="' + prolong + '"' + (/^\//.test(prolong) ? '' : ' target="_blank" rel="noopener"') + '>Продлить доступ</a>' + (A.dead ? '' : goBtn) : goBtn) + '</div></div></section>' }

      if (fl3) { var spT = spNm.join(' и&nbsp;');
        h += '<section class="fmp-up fmp-f3" aria-label="Переход на флагман AI-дизайнер 3.0"><div class="fmp-ul"><span class="fmp-chip">Переход на флагман</span><h3>Перейди на&nbsp;флагман <span style="white-space:nowrap">AI-дизайнер&nbsp;3.0</span></h3>'
          + '<p>То, что ты&nbsp;уже заплатил за&nbsp;' + spT + ', засчитается' + (spSum ? ': скидка <b>' + NUM(spSum) + '&nbsp;₽</b> применится' : '. Скидка применится') + ' автоматически при оформлении&nbsp;— она привязана к&nbsp;твоей почте.</p>'
          + '<div class="fmp-ua"><a class="fmp-btn" href="' + FL3 + '">Выбрать тариф' + ico('arrow', 18) + '</a><a class="fmp-l3" href="' + FL3 + '">Сравнить тарифы</a></div></div>'
          + '<div class="fmp-f3d">' + (spSum ? '<span>Твоя скидка</span><b>' + NUM(spSum) + '&nbsp;₽</b><small>засчитаем при оформлении флагмана</small>' : '<span>Твоя скидка</span><b class="t">Засчитаем то, что ты&nbsp;уже заплатил</b><small>за&nbsp;' + spT + '</small>') + '</div></section>' }
      var R = rest.map(function (p, i) { var A = acc(p), href = A.dead ? care('Хочу продлить доступ к «' + clean(p.name) + '». Подскажите, как это сделать?') : link(p, T);
        return '<a class="fmp-li" href="' + esc(href) + '"' + (A.dead ? ' target="_blank" rel="noopener"' : '') + '>' + ring(56, 6, A.frac, A.warn, 'fmpG' + (i + 1), A.dead ? 'Доступ закончился' : 'Осталось ' + Math.round(A.frac * 100) + '% срока')
        + '<span class="t"><b>' + esc(clean(p.name)) + '</b><span' + (A.warn || A.dead ? ' class="w"' : '') + '>' + (A.dead ? 'доступ закончился · продлить в&nbsp;службе заботы' : p.b ? 'до&nbsp;' + fmtD(p.b) + ' · ' + (A.left === 0 ? 'последний день' : 'ещё ' + A.left + '&nbsp;' + pl(A.left, ['день', 'дня', 'дней'])) : 'бессрочно') + '</span></span>' + ico('chev', 20) + '</a>' }).join('');
      var B = me && me.pts != null ? '<section class="fmp-card fmp-bonus" aria-label="Бонусный счёт"><div class="fmp-bh"><span class="fmp-tile">' + ico('star', 22) + '</span><h3>Бонусный счёт</h3></div>'
        + '<div class="fmp-bv"><b>' + NUM(me.pts) + '</b> <span>' + pl(me.pts, ['балл', 'балла', 'баллов']) + '</span></div><p>Баллы из&nbsp;рейтинга потока: 1 балл&nbsp;= 1&nbsp;₽. Ими можно оплатить часть повышения тарифа или&nbsp;других продуктов школы. В&nbsp;рейтинге они не&nbsp;списываются.</p>'
        + '<div class="fmp-bf">' + (me.week > 0 ? '+' + NUM(me.week) + ' за&nbsp;эту неделю' : 'Баллы начисляются за&nbsp;уроки, домашки и&nbsp;эфиры') + '</div></section>' : '';
      if (R || B) h += '<div class="fmp-row">' + (R ? '<section class="fmp-card" aria-label="Другие доступы"><h3 style="margin-bottom:12px!important">' + (main ? 'Ещё в&nbsp;твоём доступе' : 'Мои доступы') + '</h3>' + R + '</section>' : '') + B + '</div>';

      var mainA = main ? acc(main) : null, urgentMain = !!(mainA && (mainA.dead || mainA.soon));
      var up = flag && tar && UPG[tar] && !mainA.dead ? UPG[tar] : null;
      if (up) { var pts = me && me.pts ? me.pts : 0, msg = care('Я учусь на потоке и хочу повысить тариф. Подскажите, как это сделать и как можно оплатить?' + (pts ? ' У меня на бонусном счёте ' + pts + ' ' + pl(pts, ['балл', 'балла', 'баллов']) + '.' : ''));
        var upts = up.pts.slice(); if (up.to === 'Премиум Амазон') { var am = amz(D); if (am) upts[0] = ['Модуль «' + esc(am.nm) + '»', (am.n ? am.n + '&nbsp;' + pl(am.n, ['урок', 'урока', 'уроков']) + (am.desc ? '&nbsp;— ' : '') : '') + esc(am.desc || '')] }
        h += '<section class="fmp-up" aria-label="Повышение тарифа"><div class="fmp-ul"><span class="fmp-chip">Следующий уровень</span><h3>' + esc(up.to) + '</h3><p>' + up.lead + '</p>'
          + '<div class="fmp-ua"><a class="fmp-btn s" href="' + msg + '" target="_blank" rel="noopener">' + ico('up', 18) + 'Повысить тариф</a><small>Откроется чат со&nbsp;службой заботы' + (pts ? '. Твои ' + NUM(pts) + ' ' + pl(pts, ['балл', 'балла', 'баллов']) + '&nbsp;— минус ' + NUM(pts) + '&nbsp;₽ к&nbsp;доплате.' : '.') + '</small></div></div>'
          + '<ul class="fmp-ug">' + upts.map(function (x) { return '<li><b>' + x[0] + '</b>' + x[1] + '</li>' }).join('') + '</ul></section>' }
      /* ученик без флагманского курса: оффер «AI-креатор с 0 до PRO 2.0» (STU-21) */
      if (!flag && !fl3) { var mods = D && D.modules ? D.modules.filter(function (m) { return !m.amazon && m.desc }).slice(1, 5).map(function (m) { return [esc(String(m.name).replace(/^Модуль\s+\S+\s+[—–-]\s+/, '')), esc(m.desc)] }) : [];
        if (mods.length < 4) mods = [['Архитектура визуала', 'композиция, типографика, цвет и&nbsp;идейность'], ['Инструментарий креатора', 'Figma и&nbsp;Photoshop с&nbsp;нуля до&nbsp;PRO'], ['Поток клиентов', 'где искать клиентов и&nbsp;как продавать свои услуги'], ['Инфографика с&nbsp;нейросетями', 'карточки для маркетплейсов от&nbsp;анализа до&nbsp;практики']];
        h += '<section class="fmp-up" aria-label="Курс AI-креатор с 0 до PRO 2.0"><div class="fmp-ul"><span class="fmp-chip">Флагманский курс школы</span><h3>AI-креатор с&nbsp;0 до&nbsp;PRO&nbsp;2.0</h3><p>От основ дизайна до&nbsp;первых клиентов: нейросети, карточки для маркетплейсов, сайты и&nbsp;AI-видео. С&nbsp;куратором, домашками и&nbsp;рейтингом потока.</p>'
          + '<div class="fmp-ua"><a class="fmp-btn' + (urgentMain ? ' s' : '') + '" href="' + care('Хочу узнать про курс «AI-креатор с 0 до PRO 2.0»: что в него входит, какие есть тарифы и когда старт.') + '" target="_blank" rel="noopener">Узнать о&nbsp;курсе' + ico('arrow', 18) + '</a><small>Откроется чат со&nbsp;службой заботы.</small></div></div>'
          + '<ul class="fmp-ug">' + mods.map(function (x) { return '<li><b>' + x[0] + '</b>' + x[1] + '</li>' }).join('') + '</ul></section>' }

      /* незавершённые заказы: частично оплаченный (рассрочка) — с чипом и без «Убрать» (STU-17) */
      var O = P.open, isHid = function (o) { return !o.part && hidden[o.num] }, vis = O.filter(function (o) { return !isHid(o) }), canX = vis.filter(function (o) { return !o.part });
      var list = O.filter(function (o) { return !isHid(o) || hidden[o.num] === 'u' }), showAll = root.__all, sh = showAll ? list : list.slice(0, 3);
      try { localStorage.setItem('fmpCnt:' + U, JSON.stringify({ n: O.length, v: vis.length, t: Date.now() })) } catch (e) {}
      if (list.length) {
        h += '<section class="fmp-card" aria-label="Незавершённые заказы"><div class="fmp-oh"><div><h3>Незавершённые заказы</h3>' + (canX.length ? '<p class="fmp-sub">Ненужные можно убрать&nbsp;— на&nbsp;доступы это не&nbsp;влияет</p>' : '') + '</div>'
          + (canX.length > 1 ? '<button type="button" class="fmp-btn2 fmp-xall">' + ico('trash', 16) + 'Убрать все</button>' : '') + '</div>'
          + sh.map(function (o) { var g = !o.part && hidden[o.num] === 'u', nm = clean(o.name), num = numF(o.num), cost = costF(o.cost), inst = /рассрочк/i.test(o.name);
            return '<div class="fmp-o' + (g ? ' gone' : '') + '"><span class="t">' + (o.part ? '<span class="fmp-chip l">Частично оплачен</span>' : '') + '<b>' + esc(nm) + '</b><span>' + (g ? esc(num) + ' убран' : esc(num) + (inst || o.part ? ' · рассрочка' : '') + (cost ? ' · ' + (o.part ? 'стоимость ' : '') + esc(cost) : '')) + '</span></span>'
              + (g ? '<button type="button" class="fmp-ln a" data-un="' + esc(o.num) + '">Вернуть</button>' : (o.href ? '<a class="fmp-pay" href="' + esc(o.href) + '">' + (o.part ? 'Доплатить' : 'Оплатить') + '</a>' : '') + (o.part ? '' : '<button type="button" class="fmp-x" data-x="' + esc(o.num) + '" aria-label="Убрать ' + esc(num) + '">' + ico('trash', 18) + '</button>')) + '</div>' }).join('')
          + (list.length > 3 ? '<button type="button" class="fmp-ln fmp-more">' + (showAll ? 'Свернуть' : 'Показать ещё ' + (list.length - 3)) + '</button>' : '') + '</section>' }
      var hidL = O.filter(function (o) { return !o.part && hidden[o.num] === 1 });
      /* завершённые заказы — в том же виде, что и незавершённые (PROF-26) */
      if (P.done.length || hidL.length) h += '<div><button type="button" class="fmp-fold" aria-expanded="false">' + '<span>Завершённые заказы · ' + P.done.length + (hidL.length ? ' &nbsp;·&nbsp; убранные · ' + hidL.length : '') + '</span>' + ico('down', 20) + '</button><div class="fmp-dl">'
        + P.done.map(function (o) { var nm = clean(o.name), cost = costF(o.cost), stt = /заверш|оплач/i.test(o.status) ? 'оплачен' : String(o.status || '').toLowerCase();
          return '<div class="fmp-o"><span class="t"><b>' + (o.href ? '<a href="' + esc(o.href) + '">' + esc(nm) + '</a>' : esc(nm)) + '</b><span>' + esc(numF(o.num)) + (stt ? ' · ' + esc(stt) : '') + (cost && !/^0\D/.test(cost) ? ' · ' + esc(cost) : '') + '</span></span></div>' }).join('')
        + hidL.map(function (o) { return '<div class="fmp-o"><span class="t"><b>' + esc(clean(o.name)) + '</b><span>' + esc(numF(o.num)) + ' · убран</span></span><button type="button" class="fmp-ln a" data-un="' + esc(o.num) + '">Вернуть</button></div>' }).join('') + '</div></div>';
      if (P.bal && /[1-9]/.test(P.bal.replace(/Всего.*$/, ''))) h += '<p class="fmp-bal">' + esc(P.bal.replace(/\s*руб\.?/g, ' ₽').replace(/\.\s*\./g, '.')) + '</p>';
      root.innerHTML = h; typo(root);
      var fold = root.querySelector('.fmp-fold'); if (fold) fold.onclick = function () { var on = fold.classList.toggle('open'); fold.setAttribute('aria-expanded', on); fold.nextElementSibling.classList.toggle('open') };
      var rr = function () { var op = root.querySelector('.fmp-fold.open'); render(root, P, me, D, T); if (op) { var f = root.querySelector('.fmp-fold'); if (f) { f.classList.add('open'); f.setAttribute('aria-expanded', true); f.nextElementSibling.classList.add('open') } } };
      [].forEach.call(root.querySelectorAll('[data-x]'), function (b) { b.onclick = function () { hidden[b.getAttribute('data-x')] = 'u'; saveH(); rr() } });
      [].forEach.call(root.querySelectorAll('[data-un]'), function (b) { b.onclick = function () { delete hidden[b.getAttribute('data-un')]; saveH(); rr() } });
      var xa = root.querySelector('.fmp-xall'); if (xa) xa.onclick = function () { canX.forEach(function (o) { hidden[o.num] = 'u' }); saveH(); rr() };
      var mo = root.querySelector('.fmp-more'); if (mo) mo.onclick = function () { root.__all = !root.__all; rr() };
      if (window.FS_BADGE) window.FS_BADGE();
      /* «убран» с кнопкой «Вернуть» живёт до перезагрузки, потом заказ уходит в свёрнутый список.
         TODO (серверный агент): хранить скрытые заказы на сервере, чтобы они не возвращались на другом устройстве:
         GET /fmp/hidden?u=<uid>&sig=<подпись> → {ok, hidden:["Заказ #2666", …]}; POST /fmp/hidden {u, sig, hide:[…], unhide:[…]} → {ok, hidden:[…]};
         таблица D1 fmp_hidden(uid, num, at), подпись — та же, что для /me после исправления CODE-03. Клиент: читать при старте, объединять с localStorage fmpHide:<uid>, писать при «Убрать»/«Вернуть». */
    };
    Object.keys(hidden).forEach(function (k) { if (hidden[k] === 'u') hidden[k] = 1 }); saveH();

    var start = function () { if (document.querySelector('.fmp')) return true; var h1 = [].filter.call(document.querySelectorAll('.page-header h1, h1'), function (x) { return /Мои покупки/.test(x.textContent) })[0]; if (!h1) return false;
      var box = h1.closest('.main-page-container') || h1.closest('.container') || h1.parentNode.parentNode; var P = parse(box);
      var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      var host = box; host.classList.add('fmp-host'); var root = document.createElement('div'); root.className = 'fmp'; host.appendChild(root); document.documentElement.classList.add('fmp-on');
      /* высота фиксированной шапки GetCourse на телефоне/планшете — отступ заголовка под неё (STU-10) */
      var topFix = function () { var tm = document.querySelector('.top-menu'), R = document.documentElement, v = 0;
        if (tm && tm.offsetHeight && /fixed|sticky/.test(getComputedStyle(tm).position)) v = Math.round(tm.getBoundingClientRect().bottom - (root.getBoundingClientRect().top + (window.scrollY || 0)));
        R.classList.toggle('fmp-topfix', v > 0); R.style.setProperty('--fmp-top', Math.max(0, v) + 'px') };
      topFix(); addEventListener('resize', topFix); addEventListener('load', topFix); setTimeout(topFix, 600); setTimeout(topFix, 1800);
      root.innerHTML = skel(P); typo(root);
      var T = window.__fmpTest, shown = false, show = function (me, D, Tr) { shown = true; render(root, P, me, D, Tr) };
      var to = setTimeout(function () { if (!shown) trainings().then(function (Tr) { if (!shown) show(null, null, Tr) }) }, 6000);
      Promise.all([T ? Promise.resolve(T.D) : fetch(RT + 'data.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json() }), T ? Promise.resolve(T.h) : sha(U), trainings()])
        .then(function (r) { clearTimeout(to); var D = r[0], me = (D.rows || []).filter(function (x) { return x.h === r[1] })[0] || null; show(me, D, r[2]) })
        .catch(function () { clearTimeout(to); trainings().then(function (Tr) { show(null, null, Tr) }) });
      return true };
    if (!start()) document.addEventListener('DOMContentLoaded', start) })();

  /* ===== страница урока: единый шаблон (шапка, уроки части, «В этом уроке» + тайм-коды, материалы, уровни ДЗ, сдача, переход дальше) ===== */
  (function () {
    /*t*/
    var path = location.pathname, qs = new URLSearchParams(location.search);
    var LID = (path.match(/\/teach\/control\/lesson\/view\/id\/(\d+)/) || [])[1] || (/\/teach\/control\/lesson\/view\/?$/.test(path) ? qs.get('id') : null);
    if (!LID || /^(1|true)$/.test(qs.get('editMode') || '')) return;
    var RT = 'https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/', CARE = 'https://t.me/zabota_oduvanov', NB = ' ';
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : '' };
    var pl = function (n, f) { n = Math.abs(Math.round(n)); var a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2] };
    var typo = function (el) { if (!el) return; var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n, re = /(^|[\s («"])([а-яёА-ЯЁ]{1,3}|\d+)[ ](?=\S)/g, f = function (m, a, b) { return a + b + NB };
      while ((n = w.nextNode())) { if (n.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName)) continue; var v = n.nodeValue, o = v; v = v.replace(re, f).replace(re, f).replace(/ (—|–)/g, NB + '$1'); if (v !== o) n.nodeValue = v } };
    var P = {
      check: '<path d="m5 12 5 5 9-10"/>', bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>', next: '<path d="M5 12h14M13 6l6 6-6 6"/>', prev: '<path d="M19 12H5M11 6l-6 6 6 6"/>', ext: '<path d="M7 17 17 7M9 7h8v8"/>', down: '<path d="m6 9 6 6 6-6"/>',
      slides: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>', doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>', folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
      chat: '<path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', warn: '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', up: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>' };
    var ico = function (n, s, sw) { return '<svg aria-hidden="true" width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.9) + '" stroke-linecap="round" stroke-linejoin="round">' + P[n] + '</svg>' };

    var CSS = ''
      + ':root.fl-on .lesson-header-block,:root.fl-on .standard-page-content>.container>.breadcrumb,:root.fl-on .breadcrumb,:root.fl-on .page-header>h1{display:none!important}'
      + ':root.fl-on .standard-page-content{max-width:none!important}:root.fl-on .center-block{max-width:none!important;width:auto!important}'
      + '.fl{--s0:#0c0c0c;--s1:#161616;--hair:rgba(255,255,255,.07);--ink2:rgba(255,255,255,.6);--acc:#d77fff;--lil:#c38bff;display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start;max-width:1320px;margin:0 auto;color:#fff;font-family:"Inter Tight",Inter,system-ui,sans-serif}.fl *{box-sizing:border-box}'
      + '.fl-main{flex:999 1 600px;min-width:0;display:flex;flex-direction:column;gap:16px}.fl-aside{flex:1 1 300px;max-width:370px;min-width:0;display:flex;flex-direction:column;gap:16px;position:sticky;top:24px;padding-top:40px}'
      + '@media(max-width:1000px){.fl-aside{display:none}.fl-main{flex-basis:100%}}'
      + '.fl-bc{display:flex;gap:8px;flex-wrap:wrap;font-size:14px;color:var(--ink2)}.fl .fl-bc a{color:var(--ink2)!important;text-decoration:none!important}.fl .fl-bc a:hover{color:#fff!important}.fl-bc b{font-weight:400;color:rgba(255,255,255,.85)}'
      + '.fl-hd{display:flex;flex-direction:column;gap:14px;padding:8px 0 12px}.fl-chips{display:flex;gap:8px;flex-wrap:wrap}.fl-chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;letter-spacing:.1em;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.82);text-transform:uppercase;line-height:1.2}.fl-chip.l{background:var(--lil);border-color:var(--lil);color:#1a0b2e}'
      + '.fl-chip.ok{background:rgba(74,222,128,.16);border-color:transparent;color:#86efac}.fl-chip.rv{background:rgba(195,139,255,.14);border-color:transparent;color:#d7b6ff}.fl-chip.wn{background:rgba(255,159,107,.16);border-color:transparent;color:#ffb48c}'
      + '.fl h1.fl-t{margin:0!important;font-size:60px!important;line-height:1.04!important;font-weight:500!important;letter-spacing:-.035em!important;color:#fff!important;text-wrap:balance}.fl h1.fl-t span{color:var(--ink2);text-transform:none!important}.fl-meta{margin:0;font-size:17px;color:var(--ink2)}.fl-meta em{font-style:normal;color:var(--acc)}'
      + '@media(max-width:700px){.fl h1.fl-t{font-size:40px!important}.fl{gap:12px}.fl-meta{font-size:15px}}'
      + '.fl-card{background:var(--s1);border:1px solid var(--hair);border-radius:40px;padding:40px;min-width:0}@media(max-width:700px){.fl-card{border-radius:28px;padding:22px}}'
      + '.fl h2.fl-h{margin:0 0 20px!important;font-size:28px!important;font-weight:500!important;letter-spacing:-.02em!important;color:#fff!important;line-height:1.2!important}@media(max-width:700px){.fl h2.fl-h{font-size:22px!important;margin-bottom:14px!important}}'
      + '.fl-lbl{align-self:flex-start;display:inline-block;font-size:12px;font-weight:700;letter-spacing:.1em;padding:6px 12px;border-radius:999px;background:rgba(195,139,255,.14);color:#d7b6ff;text-transform:uppercase;margin-bottom:16px}'
      + '.fl-about{display:flex;flex-wrap:wrap;gap:40px}.fl-about>div{flex:1 1 260px;min-width:0;display:flex;flex-direction:column}.fl-about>div.tc{flex:1.3 1 320px}@media(max-width:700px){.fl-about{gap:28px}}'
      + '.fl-pts{margin:0!important;padding:0!important;list-style:none!important;display:flex;flex-direction:column;gap:14px}.fl-pts li{display:flex;gap:12px;font-size:18px;line-height:1.4;margin:0!important;color:#fff}.fl-pts li svg{flex:none;color:var(--lil);margin-top:2px}@media(max-width:700px){.fl-pts li{font-size:16px}}'
      + '.fl-tc a{display:flex!important;gap:16px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--hair);color:#fff!important;text-decoration:none!important;font-size:16px;line-height:1.35}.fl-tc a:last-child{border-bottom:0}.fl-tc a b{flex:0 0 60px;font-variant-numeric:tabular-nums;color:var(--acc);font-weight:600}.fl-tc a:hover{color:var(--acc)!important}'
      + '.fl-mats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(max-width:800px){.fl-mats{grid-template-columns:1fr}}.fl-mat:only-child{grid-column:1/-1}.fl-mg{grid-column:1/-1;font-size:14px;color:var(--ink2);margin:8px 0 -2px}'
      + '.fl-mat{display:flex!important;align-items:center;gap:16px;padding:18px;border-radius:22px;background:var(--s0);border:1px solid var(--hair);color:#fff!important;text-decoration:none!important;min-width:0;transition:border-color .15s}.fl-mat:hover{border-color:rgba(195,139,255,.4)}'
      + '.fl-ic{flex:none;width:52px;height:52px;border-radius:16px;background:#3e3e3e;display:flex;align-items:center;justify-content:center;color:var(--lil)}.fl-mat .t{flex:1;min-width:0}.fl-mat .t b{display:block;font-size:17px;font-weight:500;line-height:1.3}.fl-mat .t span{display:block;font-size:14px;color:var(--ink2);margin-top:2px}'
      + '.fl-go{flex:none;display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 14px;border-radius:12px;background:rgba(255,255,255,.11);font-size:14px;font-weight:500;white-space:nowrap}@media(max-width:700px){.fl-mat{padding:14px}.fl-ic{width:44px;height:44px;border-radius:14px}.fl-go span{display:none}.fl-go{padding:0 10px}}'
      + '.fl-next{border-radius:40px;padding:40px;background:radial-gradient(120% 110% at 50% 135%,rgba(150,87,232,.5),rgba(96,0,255,.12) 55%,transparent 75%),#161616;border:1px solid rgba(255,255,255,.08);box-shadow:none;display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between}'
      + '.fl-next .t{flex:1 1 260px;min-width:0}.fl-next .t span{display:block;font-size:14px;color:rgba(255,255,255,.72)}.fl-next .t b{display:block;font-size:34px;font-weight:500;letter-spacing:-.03em;margin-top:4px;line-height:1.15}.fl-nb{display:flex;gap:12px;flex-wrap:wrap}'
      + '.fl-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:56px;padding:0 28px;border-radius:16px;border:0;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font-family:inherit;font-weight:600;font-size:17px;line-height:1;text-decoration:none!important;cursor:pointer;white-space:nowrap;box-shadow:none}'
      + '.fl-btn2{display:inline-flex;align-items:center;gap:8px;height:56px;padding:0 20px;border-radius:16px;background:rgba(0,1,6,.35);color:#fff!important;font-size:16px;font-weight:500;text-decoration:none!important;max-width:320px;overflow:hidden}.fl-btn2 span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '@media(max-width:700px){.fl-next{border-radius:28px;padding:24px}.fl-next .t b{font-size:26px}.fl-nb{width:100%}.fl-nb .fl-btn{flex:1}.fl-btn2{max-width:none}}'
      + '.lite-page>.fl-card,.lite-page>.fl-next,.lite-page>.fl-lvs{margin:8px 0!important}.fl a.fl-mat,.fl a.fl-btn2,.fl a.fl-care,.fl .fl-tc a,.fl .fl-ls a.cur{color:#fff!important}.fl a.fl-btn,.fl-bar a.n{color:#602364!important}.fl-bar{display:none}@media(max-width:700px){.fl-bar{display:flex;position:fixed;left:12px;right:12px;bottom:12px;z-index:60;gap:8px;padding:8px;border-radius:22px;background:rgba(12,12,12,.94);border:1px solid rgba(255,255,255,.1);box-shadow:0 -10px 40px rgba(0,0,0,.5)}.fl-bar a{height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none!important}'
      + '.fl-bar .p{flex:none;width:52px;background:#1f1f1f;color:#fff!important}.fl-bar .n{flex:1;min-width:0;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font-weight:600;font-size:16px;padding:0 12px}.fl-bar .n span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}:root.fl-on body{padding-bottom:84px}}'
      /* уроки части */
      + '.fl-part{background:var(--s1);border:1px solid var(--hair);border-radius:32px;padding:28px;display:flex;flex-direction:column;gap:16px}.fl-part .h span{display:block;font-size:13px;color:var(--ink2)}.fl-part .h b{display:block;font-size:24px;font-weight:500;letter-spacing:-.02em;margin-top:4px;line-height:1.2}'
      + '.fl-pr{display:flex;justify-content:space-between;font-size:13px;color:var(--ink2);margin-bottom:8px}.fl-pr b{color:#fff;font-weight:600}.fl-pb{height:6px;border-radius:6px;background:rgba(255,255,255,.06);overflow:hidden}.fl-pb i{display:block;height:100%;background:linear-gradient(90deg,#6724ad,#c38bff)}'
      + '.fl-ls{margin:0!important;padding:0!important;list-style:none!important;display:flex;flex-direction:column;max-height:60vh;overflow:auto}.fl-ls li{margin:0!important}.fl-ls a{display:flex!important;gap:12px;align-items:center;padding:10px 12px;border-radius:14px;color:rgba(255,255,255,.86)!important;text-decoration:none!important;font-size:15px;line-height:1.3}.fl-ls a:hover{background:rgba(255,255,255,.04)}'
      + '.fl-ls a.cur{background:rgba(195,139,255,.12);color:#fff!important;font-weight:500}.fl-ls a.done{color:rgba(255,255,255,.6)!important}.fl-ls a.lk{color:rgba(255,255,255,.4)!important}.fl-ls .d{flex:none;width:24px;height:24px;border-radius:999px;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center}'
      + '.fl-ls a.done .d{background:var(--lil);border-color:var(--lil);color:#1a0b2e}.fl-ls a.cur .d{border-color:var(--lil)}.fl-ls a.cur .d:after{content:"";width:8px;height:8px;border-radius:999px;background:var(--lil)}.fl-ls a.lk .d{border-style:dashed}.fl-ls .x{flex:1;min-width:0}.fl-ls .tg{flex:none;font-size:11px;font-weight:700;letter-spacing:.06em;padding:4px 8px;border-radius:999px;background:rgba(195,139,255,.14);color:#d7b6ff}'
      + '.fl-care{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 28px;border-radius:24px;border:1px solid var(--hair);background:var(--s0);color:#fff!important;text-decoration:none!important}.fl-care span{font-size:13px;color:var(--ink2);display:block}.fl-care b{display:block;color:var(--acc);font-weight:600;font-size:17px;white-space:nowrap}.fl-care svg{color:var(--ink2)}'
      + '.fl-mp{display:none}@media(max-width:1000px){.fl-mp{display:block}.fl-mp>button{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:var(--s1);color:#fff;font-family:inherit;font-size:15px;font-weight:500;text-align:left;cursor:pointer}.fl-mp>button .x{flex:1}.fl-mp>button .x small{display:block;font-size:12px;color:var(--ink2);font-weight:400}.fl-mp .fl-part{display:none;margin-top:8px}.fl-mp.open .fl-part{display:flex}.fl-mp.open>button svg{transform:rotate(180deg)}}'
      + '.fl-ring{flex:none;width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center}.fl-ring i{width:26px;height:26px;border-radius:999px;background:var(--s1)}'
      /* закрытый урок */
      + '.fl-lock{display:flex;gap:20px;align-items:center}.fl-lock .fl-ic{width:64px;height:64px;border-radius:20px}.fl-lock b{display:block;font-size:22px;font-weight:500;line-height:1.3}.fl-lock div>span{display:block;font-size:15px;color:var(--ink2);margin-top:4px}'
      /* блоки урока: общая карточка для того, что не распознано, и обнуление старых стилей */
      + ':root.fl-on .lite-page .lt-raw-html .bonus-block,:root.fl-on .lite-page .lt-raw-html .task-description-block{background:var(--s1)!important;border:1px solid var(--hair)!important;border-radius:40px!important;padding:40px!important;margin:0!important;box-shadow:none!important;font-family:inherit!important;color:rgba(255,255,255,.85)!important}'
      + '@media(max-width:700px){:root.fl-on .lite-page .lt-raw-html .bonus-block,:root.fl-on .lite-page .lt-raw-html .task-description-block{border-radius:28px!important;padding:22px!important}}'
      + ':root.fl-on .lite-page .lt-block-wrapper{padding-top:8px!important;padding-bottom:8px!important}:root.fl-on .lite-page .lt-block .container{width:auto!important;max-width:none!important;padding:0!important;margin:0!important}:root.fl-on .lite-page .lt-block .container>.row{margin:0!important}:root.fl-on .lite-page .lt-block .container>.row>.col-md-12{padding:0!important;float:none!important;width:auto!important}:root.fl-on body .container:has(.fl){width:auto!important;max-width:1400px!important;margin-left:auto!important;margin-right:auto!important;padding-left:40px!important;padding-right:40px!important;float:none!important}@media(max-width:700px){:root.fl-on body .container:has(.fl){padding-left:16px!important;padding-right:16px!important}}:root.fl-on .lite-page .lt-block .row{margin:0!important}:root.fl-on .lite-page .lt-block [class*="col-md-"]{padding:0!important;float:none!important;width:auto!important}'
      + '.fl-x .bonus-label,.fl-x .task-description-label{display:inline-block!important;font-size:12px!important;font-weight:700!important;letter-spacing:.1em!important;padding:6px 12px!important;border-radius:999px!important;background:rgba(195,139,255,.14)!important;color:#d7b6ff!important;text-transform:uppercase!important;margin:0 0 16px!important;border:0!important}'
      + '.fl-x .bonus-block{display:block!important}.fl-x .bonus-block>*{grid-column:auto!important}.fl-x .bonus-block .bonus-title.bonus-title,.fl-x .bonus-block h3.bonus-title{padding:0!important;border-top:0!important}.fl-x .bonus-button::after{content:none!important}.fl-x .bonus-block .bonus-button+.bonus-title:has(+.bonus-title){display:block!important}.fl-x .bonus-block .bonus-title:empty{display:none!important}'
      + '.fl-x .bonus-label:empty{display:none!important}.fl-x h3,.fl-x h4,.fl-x .bonus-title,.fl-x .info-title{font-size:18px!important;font-weight:600!important;color:#fff!important;margin:18px 0 8px!important;line-height:1.35!important;font-family:inherit!important}.fl-x h3:empty,.fl-x .bonus-title:empty{display:none!important}'
      + '.fl-x p,.fl-x li,.fl-x .bonus-description,.fl-x .task-description-text{font-size:16px!important;line-height:1.55!important;color:rgba(255,255,255,.82)!important;font-family:inherit!important}.fl-x ol,.fl-x ul{padding-left:22px!important;margin:6px 0!important}.fl-x li{margin:4px 0!important}'
      + '.fl-x a.bonus-button,.fl-x .task-links a{display:inline-flex!important;align-items:center;gap:6px;height:44px;padding:0 18px!important;border-radius:14px!important;background:rgba(255,255,255,.11)!important;color:#fff!important;font-size:15px!important;font-weight:500!important;text-decoration:none!important;margin:6px 8px 6px 0!important;box-shadow:none!important;border:0!important}.fl-x a.bonus-button:hover{background:rgba(255,255,255,.16)!important}'
      + ':root.fl-on body .fl-lvs .fl-x .bonus-block{display:flex!important;flex-direction:column;align-items:stretch!important;justify-content:flex-start!important}:root.fl-on body .fl-lvs .fl-x a.bonus-button{margin:auto 0 0!important;align-self:flex-start;height:38px;padding:0 14px!important;border-radius:12px!important;font-size:14px!important}:root.fl-on body .fl-lvs .fl-x a.bonus-button+a.bonus-button{margin-top:8px!important}'
      + ':root.fl-on body .fl-lvs .fl-x .bonus-block{padding:20px!important;gap:6px}:root.fl-on body .fl-lvs .fl-x .bonus-block :is(h1,h2,h3,h4,p,li,div,span):not(.fl-lvh):not(.fl-lvh *){font-size:14px!important;line-height:1.5!important;margin:0!important;padding:0!important;text-indent:0!important;text-align:left!important;font-weight:400!important;color:rgba(255,255,255,.82)!important;letter-spacing:0!important}:root.fl-on body .fl-lvs .fl-x .bonus-block :is(b,strong){font-weight:600!important;color:#fff!important}:root.fl-on body .fl-lvs .fl-x .bonus-block :is(h3,p):has(+:is(h3,p)){margin-bottom:6px!important}'
      + '.fl-wc{display:flex;gap:16px;padding:24px 28px;border-radius:28px;background:rgba(255,159,107,.07);border:1px solid rgba(255,159,107,.3);color:#fff}.fl-wc svg{flex:none;margin-top:2px}.fl-wc b{display:block;font-size:17px;font-weight:600;color:#ffd2b8;line-height:1.4}.fl-wc ul{margin:8px 0 0;padding:0 0 0 18px;font-size:15px;line-height:1.6;color:#ffd2b8}.fl-wc p{margin:8px 0 0;font-size:15px;line-height:1.5;color:rgba(255,255,255,.7)}:root.fl-on .lite-page .fl-wd{background:transparent!important;border:0!important;padding:0!important;margin:8px 0!important}'
      + ':root.fl-on body .fl-lvs .fl-lvh{gap:8px;margin-bottom:6px;flex-wrap:nowrap}:root.fl-on body .fl-lvs .fl-lvh b{font-size:11px;letter-spacing:.08em;white-space:nowrap}:root.fl-on body .fl-lvs .fl-lvh em{font-size:13px}:root.fl-on body .fl-lvs .fl-lvh .r{width:18px;height:18px}:root.fl-on body .fl-lvs .fl-lv.on .fl-lvh .r:after{width:8px;height:8px}'
      + '.fl-x .bonus-title:first-child,.fl-x .info-title:first-child{margin-top:0!important}.fl-x .task-note em{color:var(--ink2)}.fl-x .task-requirements{margin-top:10px;padding:16px 20px;border-radius:18px;background:var(--s0)}.fl-x .task-description-item{display:flex;gap:10px;margin:6px 0}.fl-x .task-description-number{color:var(--acc);font-weight:600}'
      + '.fl-warn .bonus-title,.fl-warn strong{color:#fff!important}:root.fl-on .lite-page .fl-info .bonus-block,:root.fl-on .lite-page .fl-warn .bonus-block{background:var(--s1)!important;border-color:var(--hair)!important}.fl-info .bonus-title:first-child{color:#d7b6ff!important}'
      + ':root.fl-on .lite-page .fl-hw .bonus-block{border-color:rgba(195,139,255,.3)!important}.fl-hw .bonus-block .bonus-title.bonus-title:first-child{display:inline-block!important;font-size:12px!important;letter-spacing:.1em!important;text-transform:uppercase;padding:6px 12px!important;border-radius:999px;background:rgba(195,139,255,.14);color:#d7b6ff!important;margin-bottom:12px!important}'
      /* уровни ДЗ */
      + '.fl-lvs{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;align-items:stretch}.fl-lvs>.lite-block-live-wrapper{margin:0!important;min-width:0}.fl-lvs .lt-block-wrapper{padding:0!important;height:100%}.fl-lvs .lt-block,.fl-lvs .lt-block>div,.fl-lvs [data-raw-editable]{height:100%}'
      + ':root.fl-on .fl-lvs .bonus-block{border-radius:28px!important;padding:22px!important;display:flex!important;flex-direction:column;gap:10px;height:100%;cursor:pointer;transition:border-color .15s,background .15s}:root.fl-on .fl-lvs .fl-lv.on .bonus-block{border-color:#c38bff!important;background:rgba(195,139,255,.08)!important}'
      + '.fl-lvh{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.fl-lvh .r{flex:none;width:22px;height:22px;border-radius:999px;border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center}.fl-lv.on .fl-lvh .r{border-color:#c38bff}.fl-lv.on .fl-lvh .r:after{content:"";width:10px;height:10px;border-radius:999px;background:#c38bff}'
      + '.fl-lvh{flex-wrap:wrap}.fl-lvh b{flex:1;font-size:12px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.7);text-transform:uppercase}.fl-lv.on .fl-lvh b{color:#d7b6ff}.fl-lvh em{font-style:normal;font-size:15px;font-weight:600;color:var(--acc);white-space:nowrap}.fl-lv .bonus-label{display:none!important}'
      + '.fl-steps{margin:0!important;padding:0!important;list-style:none!important;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.fl-steps li{margin:0!important;padding:18px 20px;border-radius:22px;background:var(--s1);border:1px solid var(--hair)}.fl-steps li span{display:block;font-size:13px;color:var(--ink2);font-weight:600}.fl-steps li b{display:block;font-size:16px;font-weight:400;margin-top:4px}.fl-steps li.on{background:rgba(195,139,255,.12);border-color:rgba(195,139,255,.35)}.fl-steps li.on span{color:#d7b6ff}'
      + '@media(max-width:700px){.fl-steps{grid-template-columns:1fr 1fr;gap:8px}.fl-steps li{padding:14px 16px;border-radius:18px}.fl-steps li b{font-size:15px}}'
      /* сдача ДЗ (форма GetCourse) */
      + ':root.fl-on body .fl-mis .lesson-mission-wrapper,:root.fl-on body .fl-mis .lesson-send-answer-block,:root.fl-on body .fl-mis .answer-form,:root.fl-on body .fl-mis form{background:transparent!important;border:0!important;padding:0!important;box-shadow:none!important;border-radius:0!important;margin:0!important}'
      + ':root.fl-on body .fl-mis .answer-textarea-container,:root.fl-on body .fl-mis .emoji-container,:root.fl-on body .fl-mis .form-group,:root.fl-on body .fl-mis textarea,:root.fl-on body .fl-mis .uploadifive-button{width:100%!important;max-width:none!important}:root.fl-on body .fl-mis .emoji-button{display:none!important}'
      + ':root.fl-on body .fl-mis .btn-send-answer,:root.fl-on body .fl-mis .btn-save-draft{display:inline-flex!important;align-items:center;vertical-align:middle}:root.fl-on body .fl-mis .btn-save-draft{height:56px!important;padding:0 20px!important;border-radius:16px!important;background:rgba(255,255,255,.08)!important;border:0!important;box-shadow:none!important}:root.fl-on body .fl-mis br{display:none}'
      + ':root.fl-on body .lesson-answers-title{display:flex;flex-wrap:wrap-reverse;justify-content:space-between;align-items:baseline;gap:8px 16px;margin:24px 0 12px}:root.fl-on body .lesson-answers-title h3{font:500 24px/1.2 "Inter Tight",sans-serif!important;color:#fff!important;margin:0!important}:root.fl-on body .lesson-answers-title h3 a,:root.fl-on body .lesson-answers-title #answers a{color:#d77fff!important;font-weight:500!important}:root.fl-on body .lesson-answers-title #answers{float:none!important;font:400 14px "Inter Tight",sans-serif!important;color:rgba(255,255,255,.6)!important}:root.fl-on body .lesson-answers-title #answers b{color:#fff!important;font-weight:600!important}'
      + '.fl-mis{background:var(--s1);border:1px solid var(--hair);border-radius:40px;padding:40px}@media(max-width:700px){.fl-mis{border-radius:28px;padding:22px}}'
      + ':root.fl-on .fl-mis h3{display:none!important}:root.fl-on .fl-mis .answer-form>div:first-child>img,:root.fl-on .fl-mis .user-profile-image{display:none!important}:root.fl-on .fl-mis .answer-form-inner{margin:0!important}'
      + ':root.fl-on .fl-mis.fl-lvd .lesson-mission-text{display:none!important}:root.fl-on .fl-mis .lesson-mission-text{padding:0 0 16px!important;font-size:16px!important;line-height:1.55!important;color:rgba(255,255,255,.8)!important}'
      + ':root.fl-on .fl-mis textarea{width:100%!important;min-height:110px;padding:16px!important;border-radius:18px!important;border:1px solid rgba(255,255,255,.12)!important;background:var(--s0)!important;color:#fff!important;font:400 16px/1.5 "Inter Tight",Inter,sans-serif!important;resize:vertical!important}'
      + ':root.fl-on .fl-mis .uploadifive-button{width:100%!important;height:auto!important;line-height:1.4!important;padding:28px 16px!important;border-radius:22px!important;border:1.5px dashed rgba(195,139,255,.45)!important;background:rgba(195,139,255,.05)!important;color:#fff!important;font:500 16px "Inter Tight",sans-serif!important;margin:12px 0 4px!important;text-align:center!important}'
      + ':root.fl-on .fl-mis .uploadifive-button:before{content:"";display:block;width:28px;height:28px;margin:0 auto 8px;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23c38bff%27 stroke-width=%271.8%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M12 16V4M7 9l5-5 5 5%27/%3E%3Cpath d=%27M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3%27/%3E%3C/svg%3E")}'
      + ':root.fl-on .fl-mis .text-muted.small{display:block;text-align:center;color:var(--ink2)!important;font-size:13px!important;margin-bottom:12px}:root.fl-on .fl-mis .addfield-type-checkbox{display:none!important}:root.fl-on .fl-mis:not(.fl-lvd) .addfield-type-checkbox{display:block!important}'
      + ':root.fl-on .fl-mis .btn-send-answer{height:56px!important;padding:0 28px!important;border-radius:16px!important;border:0!important;background:linear-gradient(180deg,#fef8ff,#fccbff)!important;color:#602364!important;font:600 17px "Inter Tight",sans-serif!important;box-shadow:none!important;margin:8px 12px 0 0!important}'
      + ':root.fl-on .fl-mis .btn-save-draft{color:var(--ink2)!important;font:500 15px "Inter Tight",sans-serif!important;text-decoration:none!important;margin-top:8px!important}'
      + '.fl-seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:4px;border-radius:18px;background:var(--s0);border:1px solid rgba(255,255,255,.08);margin-bottom:14px}.fl-seg button{height:52px;border-radius:14px;border:0;background:transparent;color:rgba(255,255,255,.72);font-family:inherit;font-size:15px;font-weight:500;cursor:pointer;padding:0 6px}.fl-seg button.on{background:var(--lil);color:#1a0b2e;font-weight:600}'
      + '@media(max-width:700px){.fl-seg{grid-template-columns:1fr}}.fl-mh{font-size:32px;font-weight:500;letter-spacing:-.03em;margin:0 0 18px;line-height:1.15}.fl-ml{font-size:14px;color:var(--ink2);margin:0 0 10px}.fl-pt{font-size:14px;color:var(--ink2);margin:10px 0 0}.fl-pt b{color:var(--acc);font-weight:600}'
      + ':root.fl-on .fl-mis .self-answers:not(:empty){margin-bottom:20px}:root.fl-on .fl-mis .self-answers .answer-item,:root.fl-on .fl-mis .self-answers>div{background:var(--s0)!important;border:1px solid var(--hair)!important;border-radius:22px!important;padding:20px!important;color:rgba(255,255,255,.85)!important}'
      /* оценка урока */
      + ':root.fl-on .training-feedback-widget{background:var(--s1)!important;border:1px solid var(--hair)!important;border-radius:40px!important;padding:32px 40px!important}:root.fl-on .training-feedback-widget h3{font-size:22px!important;font-weight:500!important;margin:0 0 4px!important;color:#fff!important}'
      + ':root.fl-on .training-feedback-widget label{font-size:14px!important;font-weight:400!important;color:var(--ink2)!important}:root.fl-on .training-feedback-widget textarea{width:100%!important;border-radius:18px!important;border:1px solid rgba(255,255,255,.12)!important;background:var(--s0)!important;color:#fff!important;padding:14px!important;font:400 15px "Inter Tight",sans-serif!important}'
      + ':root.fl-on .training-feedback-widget .btn{height:48px!important;padding:0 22px!important;border-radius:14px!important;border:0!important;background:rgba(255,255,255,.11)!important;color:#fff!important;font:500 15px "Inter Tight",sans-serif!important;box-shadow:none!important}@media(max-width:700px){:root.fl-on .training-feedback-widget{border-radius:28px!important;padding:22px!important}}'
      + ':root.fl-on .training-feedback-widget .star-rating-widget li{color:#c38bff}'
      + ':root.fl-on body .o-lt-lesson-comment-block::before{content:none!important;display:none!important}'
      /* ответы (свои и чужие) */
      + '.fl .answer_wrapper{background:var(--s0)!important;border:1px solid var(--hair)!important;border-radius:24px!important;padding:20px 22px!important;margin:0 0 12px!important;box-shadow:none!important;display:block!important;color:rgba(255,255,255,.85)!important}'
      + '.fl .answer_wrapper>.user-image,.fl .answer_wrapper .title .user-image,.fl .answer_wrapper .answer-status,.fl .answer_wrapper .addfield,.fl .answer_wrapper .answer-file-box p,.fl .answer_wrapper .edit-comment-active-element,.fl .gc-comment-form .user-image-wrapper,.fl .comment .user-image,.fl .answer_wrapper .comment-user-settings-json{display:none!important}'
      + '.fl .answer_wrapper .answer-content{margin:0!important;padding:0!important;border:0!important;background:transparent!important}.fl .fl-ast{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}'
      + '.fl .answer_wrapper .title{display:flex!important;gap:8px;align-items:baseline;flex-wrap:wrap;margin:0 0 10px!important;padding:0!important;border:0!important}.fl .answer_wrapper .title a.user-profile-link{color:#fff!important;font-weight:600!important;font-size:16px!important;text-decoration:none!important}.fl .answer_wrapper .user-payed-label{display:none!important}'
      + '.fl .answer_wrapper .answer-date,.fl .answer_wrapper .answer-date a{color:rgba(255,255,255,.55)!important;font-size:13px!important;text-decoration:none!important}'
      + '.fl .answer_wrapper .answer-main-content,.fl .answer_wrapper .main{font:400 15px/1.55 "Inter Tight",Inter,sans-serif!important;color:rgba(255,255,255,.85)!important;background:transparent!important;border:0!important;padding:0!important}'
      + '.fl .answer_wrapper .comment-files-widget{display:flex!important;flex-wrap:wrap;gap:8px;margin:10px 0!important}.fl .answer_wrapper .answer-file-box{width:104px!important;height:104px!important;border-radius:14px!important;overflow:hidden;margin:0!important;padding:0!important;border:0!important;float:none!important}.fl .answer_wrapper .answer-file-box img{width:104px!important;height:104px!important;object-fit:cover;display:block}'
      + '.fl .answer_wrapper .b-like-and-subscribe-notifications .button,.fl .answer_wrapper .b-like-and-subscribe-notifications a,.fl .answer_wrapper .b-like-and-subscribe-notifications .html{color:rgba(255,255,255,.6)!important;text-decoration:none!important;border:0!important}'
      + '.fl .answer_wrapper .b-like-and-subscribe-notifications{display:inline-flex;gap:8px;font-size:13px!important;color:rgba(255,255,255,.5)!important;margin-top:8px}.fl .answer_wrapper .b-like-and-subscribe-notifications .button{color:rgba(255,255,255,.6)!important;cursor:pointer}'
      + '.fl .answer_wrapper .comments{margin-top:14px!important;padding-top:14px!important;border-top:1px solid var(--hair)!important}.fl .comment{background:transparent!important;border:0!important;padding:8px 0!important;color:rgba(255,255,255,.85)!important;font-size:15px!important}.fl .comment a{color:#d77fff!important}'
      + '.fl .gc-comment-form textarea,.fl .new-comment textarea{width:100%!important;border-radius:14px!important;border:1px solid rgba(255,255,255,.12)!important;background:var(--s1)!important;color:#fff!important;padding:12px!important;font:400 15px "Inter Tight",sans-serif!important;min-height:48px}.fl .gc-comment-form .btn{border-radius:12px!important;background:rgba(255,255,255,.11)!important;color:#fff!important;border:0!important;box-shadow:none!important}'
      + '.fl .new-comment{margin:0!important;padding:0!important;background:transparent!important;border:0!important}.fl .new-comment .uploadifive-button{width:auto!important;padding:6px 12px!important;border-radius:10px!important;background:rgba(255,255,255,.08)!important;font-size:13px!important;height:auto!important;line-height:1.4!important}'
      + '.fl .lesson-answers-title{display:none!important}.fl-oth>button{display:flex;align-items:center;justify-content:space-between;width:100%;padding:0;border:0;background:transparent;color:#fff;font:500 22px/1.2 "Inter Tight",sans-serif;cursor:pointer;text-align:left}.fl-oth>button small{font-size:15px;color:var(--ink2);font-weight:400;margin-left:8px}.fl-oth>button svg{color:var(--ink2);transition:transform .2s}.fl-oth.open>button svg{transform:rotate(180deg)}.fl-oth .fl-ol{display:none;margin-top:20px}.fl-oth.open .fl-ol{display:block}'
      + '.fl .self-answers .answer_wrapper{border-color:rgba(195,139,255,.3)!important}.fl-mine{font-size:14px;color:var(--ink2);margin:0 0 10px}'
      /* оценка урока — своя */
      + '.fl-fb h2{margin:0;font-size:24px;font-weight:500;letter-spacing:-.02em;line-height:1.2}.fl-fb>p{margin:6px 0 18px;font-size:15px;color:var(--ink2)}.fl-st{display:flex;gap:8px}.fl-st button{width:52px;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:var(--s0);color:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:color .12s,border-color .12s}.fl-st button.on{color:#c38bff;border-color:rgba(195,139,255,.4)}'
      + '.fl-fb textarea{display:block;width:100%;margin-top:16px;min-height:96px;padding:14px 16px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:var(--s0);color:#fff;font:400 15px/1.5 "Inter Tight",sans-serif;resize:vertical}.fl-fb .fl-fr{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:14px}.fl-fb .fl-fr span{font-size:14px;color:var(--ink2)}'
      + '.fl-fb .fl-sb{height:48px;padding:0 22px;border-radius:14px;border:0;background:rgba(255,255,255,.11);color:#fff;font:500 15px "Inter Tight",sans-serif;cursor:pointer}.fl-fb .fl-sb:disabled{opacity:.4;cursor:default}.fl-fb.done textarea,.fl-fb.done .fl-fr button{display:none}'
      + '@media(max-width:700px){.fl-st{gap:6px}.fl-st button{flex:1;width:auto}}'
      + ':root.fl-on body .fl-fbx form,:root.fl-on body .fl-fbx h3,:root.fl-on body .fl-fbx .training-feedback-wrapper{display:none!important}:root.fl-on body .training-feedback-widget.fl-fbx{padding:0!important;border:0!important;background:transparent!important}'
      /* v42-FL: аудит 26.10 — палитра, без свечений, телефон, тач-зоны */
      + '.fl-wc{background:var(--s1);border-color:var(--hair)}.fl-wc b{color:#fff}.fl-wc ul{color:rgba(255,255,255,.82);list-style:disc}.fl-wc ul li{margin:4px 0}.fl-wc p{color:rgba(255,255,255,.7)}'
      + '.fl-next .t span{color:rgba(255,255,255,.6)}.fl a.fl-btn.fl-sec{background:rgba(255,255,255,.11);color:#fff!important}'
      + '.fl-fb textarea::placeholder{color:rgba(255,255,255,.55)!important;opacity:1}'
      + '.fl-steps.s2{grid-template-columns:repeat(2,minmax(0,1fr))}.fl-steps li.ok{border-color:rgba(74,222,128,.25)}.fl-steps li.ok span{color:#86efac}.fl-steps li.ok span:after{content:" · готово"}'
      + '.fl-pt.fl-got{margin:-8px 0 18px;font-size:16px}.fl-pt.fl-got b{color:#4ade80}'
      + ':root.fl-on .fl-mis{scroll-margin-top:88px}:root.fl-on .fl-mis.fl-wt .btn-send-answer{background:rgba(255,255,255,.11)!important;color:#fff!important}:root.fl-on .fl-mis.fl-wt .addfield-type-checkbox{opacity:.55}.fl-svn{font-size:15px!important;color:rgba(255,255,255,.72)!important;margin:0 0 14px!important}'
      + ':root.fl-on .fl-mis .addfield-type-checkbox label,:root.fl-on .lt-form-survey .global-confirm-checkbox-block label{display:flex!important;align-items:center;gap:12px;min-height:44px;cursor:pointer;font-weight:400!important;color:#fff!important;font-size:16px!important}:root.fl-on .fl-mis .addfield-type-checkbox,:root.fl-on .lt-form-survey .global-confirm-checkbox-block{display:flex;align-items:center;gap:12px}'
      + ':root.fl-on .fl-mis .addfield-type-checkbox input[type=checkbox],:root.fl-on .lt-form-survey input[type=checkbox]{width:24px!important;height:24px!important;margin:0!important;flex:none;accent-color:#c38bff}:root.fl-on .lt-form-survey .global-confirm-checkbox-block{font-size:14px!important;margin-top:16px}:root.fl-on .lt-form-survey .global-confirm-checkbox-block label{font-size:14px!important;color:rgba(255,255,255,.72)!important}'
      + ':root.fl-on .lite-page .lt-form-survey .block-box{padding:40px!important}@media(max-width:700px){:root.fl-on .lite-page .lt-form-survey .block-box{padding:22px!important}}:root.fl-on .fl-svd .global-confirm-checkbox-block{display:none!important}'
      + '.fl .answer_wrapper .b-like-and-subscribe-notifications,.fl .answer_wrapper .b-like-and-subscribe-notifications *{font-size:13px!important;line-height:1.4!important}.fl .answer_wrapper .comments-container:not(:has(.comment)){display:none!important}.fl .answer_wrapper .comments:not(:has(.comment)):not(:has(textarea)){display:none!important}'
      + '.fl .gc-comment-form .textarea-block{position:relative!important}.fl .gc-comment-form textarea,.fl .new-comment textarea{min-height:48px!important;padding:12px 92px 12px 14px!important;font-size:16px!important;line-height:1.45!important}'
      + '.fl .gc-comment-form .attach-file-button-container,.fl .gc-comment-form .audio-comment{position:absolute!important;top:6px!important;width:36px!important;height:36px!important;margin:0!important;display:flex!important;align-items:center;justify-content:center;z-index:2}.fl .gc-comment-form .attach-file-button-container{right:46px!important;left:auto!important}.fl .gc-comment-form .audio-comment{right:8px!important;left:auto!important}'
      + '.fl .gc-comment-form .emoji-button{display:none!important}.fl .gc-comment-form .attach-file-button-container .uploadifive-button{background:transparent!important;padding:0!important;width:36px!important;height:36px!important;display:flex!important;align-items:center;justify-content:center;color:rgba(255,255,255,.6)!important}.fl .gc-comment-form .audio-comment{color:rgba(255,255,255,.6)!important;cursor:pointer}'
      + ':root.fl-on .lt-form-survey .global-confirm-checkbox-block input[type=checkbox]{-webkit-appearance:none;appearance:none;border:2px solid rgba(255,255,255,.3)!important;border-radius:7px!important;background:transparent!important;cursor:pointer}:root.fl-on .lt-form-survey .global-confirm-checkbox-block input[type=checkbox]:checked{background:#c38bff url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%231a0b2e%27 stroke-width=%273%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m5 12 5 5 9-10%27/%3E%3C/svg%3E") center/16px no-repeat!important;border-color:#c38bff!important}:root.fl-on .lt-form-survey .f-btn{box-shadow:none!important}'
      + ':root.fl-on .fl-mis .addfield-type-checkbox label i{display:none}:root.fl-on .lt-form-survey .global-confirm-checkbox-block label{padding:0!important;margin:0!important}'
      + '.fl-bar{transition:opacity .2s,transform .2s}.fl-bar.off{opacity:0;transform:translateY(16px);pointer-events:none}'
      + '.fl-lock .fl-cd{display:block;font-size:15px;color:rgba(255,255,255,.72);margin-top:4px}'
      + '@media(max-width:700px){:root.fl-on body .fl-mis .btn-send-answer,:root.fl-on body .fl-mis .btn-save-draft{display:flex!important;width:100%!important;margin:8px 0 0!important;justify-content:center}.fl-bc{gap:0 8px;align-items:center}.fl .fl-bc a,.fl-bc b{display:inline-flex;align-items:center;min-height:44px}.fl .fl-tc a{min-height:44px;align-items:center!important}'
      + '.fl-oth>button{min-height:56px}:root.fl-on body .fl-lvs .fl-x a.bonus-button,.fl-x a.bonus-button,.fl-x .task-links a{height:44px!important;min-height:44px}.fl .answer_wrapper .b-like-and-subscribe-notifications .button{display:inline-flex;align-items:center;min-height:44px}.fl-care{min-height:64px}.fl-mp>button{min-height:56px}}';

    /* ---------- тип ссылки → иконка, подпись, глагол ---------- */
    var kindOf = function (title, href) { var t = String(title || '').toLowerCase(), h = String(href || '').toLowerCase(), src = /drive\.google|docs\.google/.test(h) ? (/folders/.test(h) ? 'Папка · Google Диск' : 'Google Диск') : /disk\.yandex|yadi\.sk/.test(h) ? 'Яндекс Диск' : /fileservice|\.pdf(\?|$)/.test(h) ? (/\.pdf(\?|$)/.test(h) ? 'PDF' : 'Файл') : /notion/.test(h) ? 'Notion' : /t\.me\//.test(h) ? 'Telegram' : /figma\.com/.test(h) ? 'Figma' : (h.match(/^https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || 'Ссылка';
      var ic = /презентац/.test(t) ? 'slides' : /промпт/.test(t) ? 'chat' : /конспект|гайд|pdf|договор/.test(t) ? 'doc' : /файл|элемент|результат|папк|материал/.test(t) || /folders|disk\.yandex/.test(h) ? 'folder' : /fileservice|\.pdf/.test(h) ? 'dl' : 'link';
      var verb = /fileservice/.test(h) ? 'Скачать' : /folders|disk\.yandex/.test(h) ? 'Открыть' : /t\.me|pinterest|behance|notion/.test(h) ? 'Перейти' : 'Открыть';
      return { src: src, ic: ic, verb: verb } };
    var tile = function (m) { var k = kindOf(m.title, m.href); return '<a class="fl-mat" href="' + esc(m.href) + '" target="_blank" rel="noopener"><span class="fl-ic">' + ico(k.ic, 24, 1.8) + '</span><span class="t"><b>' + esc(m.title) + '</b><span>' + esc(m.meta || k.src) + '</span></span><span class="fl-go"><span>' + k.verb + '</span>' + ico('ext', 14, 2) + '</span></a>' };

    /* ---------- разбор блоков урока ---------- */
    var classify = function (w) { var b = w.querySelector('.lt-block'); if (!b) return null;
      if (b.classList.contains('lt-lesson-files')) return 'files';
      if (!b.classList.contains('lt-raw-html')) return null;
      if (b.querySelector('.timecodes-block')) return 'tc';
      var t = txt(b);
      if (/^В этом уроке/i.test(t)) return 'about';
      if (/^(Л[её]гк|Средн|Максимальн)[а-яё]* уровень сложности/i.test(t)) return 'level';
      if (/^Внимание/i.test(t)) return 'warn';
      if (/^Система оценивания/i.test(t)) return 'info';
      if (b.querySelector('.task-description-block')) return 'task';
      if (/^Домашнее задание/i.test(t) && b.querySelector('ol,ul') && !b.querySelector('a')) return 'hw';
      if (b.querySelector('.bonus-block a, .bonus-block')) return b.querySelector('a[href]') ? 'mat' : 'other';
      return null };
    var matsOf = function (w) { var out = [], cur = '', bb = w.querySelector('.bonus-block') || w;
      [].forEach.call(bb.querySelectorAll('h3, h4, .bonus-title, .bonus-subtitle, a[href], .bonus-label'), function (e) {
        if (e.tagName === 'A') { var t = txt(e).replace(/^\d+\.\s*/, ''), generic = /^(Скачать|Смотреть|Открыть|Перейти|Скачать файлы|Открыть материалы)$/i.test(t);
          out.push({ title: generic ? (cur || t) : t, href: e.getAttribute('href'), group: generic ? '' : cur }); if (generic) cur = '' }
        else if (!e.closest('a') && !e.classList.contains('bonus-label')) { var s = txt(e).replace(/:$/, ''); if (s) cur = s } });
      return out };
    var filesOf = function (w) { return [].map.call(w.querySelectorAll('.files-table tr'), function (tr) { var a = tr.querySelector('a[href]'), td = tr.querySelectorAll('td'); return a ? { title: txt(a), href: a.getAttribute('href'), meta: 'PDF · ' + txt(td[1]) } : null }).filter(Boolean) };

    /* ---------- данные: шапка GetCourse, часть, ×2 ---------- */
    var head = function () { var hb = document.querySelector('.lesson-header-block'); if (!hb) return null; var nav = hb.querySelector('.lesson-navigation'), tds = nav ? nav.querySelectorAll('td') : [];
      var side = function (td) { if (!td) return null; var a = td.querySelector('a[href]'); if (!a) return null; var nm = td.querySelector('div'); return { href: a.getAttribute('href'), name: nm ? txt(nm) : '' } };
      var mid = tds[1] ? txt(tds[1].querySelector('span')) : '', st = tds[1] ? txt(tds[1].querySelector('.user-state-label')) : '', pos = mid.match(/(\d+)\s*из\s*(\d+)/);
      return { title: txt(hb.querySelector('.lesson-title-value')), desc: txt(hb.querySelector('.lesson-description-value')), prev: side(tds[0]), next: side(tds[2]), n: pos ? +pos[1] : 0, of: pos ? +pos[2] : 0, state: st, cls: (tds[1] && tds[1].querySelector('[class*="user-state-"]') || {}).className || '' } };
    var MON = { 'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4, 'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11 };
    var MONG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'], WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    /* даты GetCourse — всегда по Москве (+03:00): «сегодня/завтра/вчера 12:00», «25 октября в 10:00», «Пн 12 Окт 12:00», «2026-10-24 10:05» (UCH-35, CODE-13, CODE-14) */
    var MSK = 3 * 36e5, p2 = function (n) { return ('0' + n).slice(-2) };
    var mskD = function (y, mo, d, h, mi) { return new Date(Date.UTC(y, mo, d, h - 3, mi)) };
    var pdt = function (s) { s = String(s || '').toLowerCase().replace(/[ \s]+/g, ' '); var tm = s.match(/(\d{1,2}):(\d{2})/), h = tm ? +tm[1] : 0, mi = tm ? +tm[2] : 0, n = new Date(Date.now() + MSK), y = n.getUTCFullYear(), m;
      if ((m = s.match(/(послезавтра|позавчера|сегодня|завтра|вчера)/))) return mskD(y, n.getUTCMonth(), n.getUTCDate() + { 'сегодня': 0, 'завтра': 1, 'вчера': -1, 'послезавтра': 2, 'позавчера': -2 }[m[1]], h, mi);
      if ((m = s.match(/(\d{4})-(\d{2})-(\d{2})/))) return mskD(+m[1], +m[2] - 1, +m[3], h, mi);
      if ((m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/))) return mskD(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1], h, mi);
      m = s.match(/(\d{1,2}) ([а-я]{3})[а-я]*\.?(?:,? (\d{4}))?/); if (!m || MON[m[2]] == null) return null;
      var d = mskD(m[3] ? +m[3] : y, MON[m[2]], +m[1], h, mi); if (!m[3] && d < Date.now() - 200 * 864e5) d = mskD(y + 1, MON[m[2]], +m[1], h, mi); return d };
    /* «пн, 9 ноября, 12:00 МСК» / «сегодня, 12:00 МСК»; если у ученика другой пояс — ещё и его время */
    var when = function (d) { var x = new Date(d.getTime() + MSK), n = new Date(Date.now() + MSK), dd = Math.round((Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / 864e5);
      var day = dd === 0 ? 'сегодня' : dd === 1 ? 'завтра' : WD[x.getUTCDay()] + ', ' + x.getUTCDate() + NB + MONG[x.getUTCMonth()], hm = p2(x.getUTCHours()) + ':' + p2(x.getUTCMinutes());
      var off = -new Date(d.getTime()).getTimezoneOffset() * 6e4, loc = off !== MSK ? ' (у тебя ' + p2(new Date(d.getTime()).getHours()) + ':' + p2(new Date(d.getTime()).getMinutes()) + ')' : '';
      return day + ', ' + hm + NB + 'МСК' + loc };
    var left = function (ms) { var mn = Math.max(0, Math.round(ms / 6e4)), h = Math.floor(mn / 60), d = Math.floor(h / 24); if (d) return d + NB + pl(d, ['день', 'дня', 'дней']) + (h % 24 ? ' ' + h % 24 + NB + pl(h % 24, ['час', 'часа', 'часов']) : '');
      if (h) return h + NB + pl(h, ['час', 'часа', 'часов']) + (mn % 60 ? ' ' + mn % 60 + NB + pl(mn % 60, ['минута', 'минуты', 'минут']) : ''); return Math.max(1, mn) + NB + pl(Math.max(1, mn), ['минута', 'минуты', 'минут']) };
    var cn = function (t) { return String(t || '').replace(/AI-креатор с 0 до PRO 2\.0/, 'AI-креатор 2.0') };
    var partData = function (href) { var k = 'flPart2:' + href; try { var c = JSON.parse(sessionStorage.getItem(k) || 'null'); if (c && Date.now() - c.ts < 3e5) return Promise.resolve(c.v) } catch (e) {}
      return fetch(href, { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) { var d = new DOMParser().parseFromString(t, 'text/html');
        var v = [].map.call(d.querySelectorAll('ul.lesson-list > li'), function (li) { var a = li.querySelector('a[href]'), ti = li.querySelector('.title'), c = li.className;
          return { id: (c.match(/lesson-id-(\d+)/) || [])[1], href: a ? a.getAttribute('href') : '', t: ti ? (ti.childNodes[0] ? ti.childNodes[0].textContent : ti.textContent).replace(/\s+/g, ' ').trim() : '', done: /user-state-accomplished|lesson-list_watched/.test(c + ' ' + (a ? a.className : '')), lk: /not_reached|not-reached|has_no_access|is-locked|user-state-not/.test(c) } });
        try { sessionStorage.setItem(k, JSON.stringify({ ts: Date.now(), v: v })) } catch (e) {} return v }) };
    var x2P = null, x2Of = function () { return x2P || (x2P = fetch(RT + 'data.json', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (D) { var hit = null;
      (D.modules || []).forEach(function (m) { (m.parts || []).forEach(function (p) { (p.lessons || []).forEach(function (l) { if (String(l.id) === String(LID)) hit = { m: m, p: p, l: l } }) }) }); return hit }).catch(function () { return null })) };

    /* до сборки шаблона прячем стандартный урок: стиль подключаем сразу вместе с классом (UCH-25) */
    var WST = document.createElement('style'); WST.textContent = ':root.fl-wait .lite-page,:root.fl-wait .lesson-header-block{opacity:0!important}'; (document.head || document.documentElement).appendChild(WST);
    var unwait = function () { document.documentElement.classList.remove('fl-wait') };
    document.documentElement.classList.add('fl-wait'); setTimeout(unwait, 8000); window.addEventListener('load', function () { setTimeout(function () { if (!document.querySelector('.fl')) unwait() }, 2500) });
    var start = function () {
      if (document.querySelector('.fl')) return true; var hb = document.querySelector('.lesson-header-block'), lp = document.querySelector('.lite-page'); if (!hb || !lp) return false;
      var H = head(); if (!H) return false;
      document.documentElement.classList.remove('fl-wait'); var st = document.createElement('style'); st.textContent = CSS.replace(/(^|[{},])\.fl(?=[\w-]*[\s.:,>{\[])/g, '$1:root.fl-on body .fl'); document.head.appendChild(st); document.documentElement.classList.add('fl-on');
      var bc = [].map.call(document.querySelectorAll('.breadcrumb li a'), function (a) { return { href: a.getAttribute('href'), t: txt(a) } }).filter(function (x) { return !/Список тренингов/.test(x.t) });
      var pa = document.querySelector('.page-header h1 a'), part = pa ? { href: pa.getAttribute('href'), t: txt(pa) } : null;
      if (!part && bc.length > 1) { part = bc.pop() }
      var wraps = [].slice.call(lp.querySelectorAll(':scope > .lite-block-live-wrapper'));
      var isSurvey = !!lp.querySelector('.lt-form-survey') || /анкета/i.test(H.title), isHw = !isSurvey && (/домашн/i.test(H.title) || !!document.querySelector('.lt-lesson-mission-block .addfield-type-checkbox')), hwMax = 70;
      var locked = /недоступ/i.test(H.state), openAt = locked ? pdt(H.state) : null;

      /* каркас */
      var root = document.createElement('div'); root.className = 'fl';
      var main = document.createElement('div'); main.className = 'fl-main'; var aside = document.createElement('aside'); aside.className = 'fl-aside'; aside.setAttribute('aria-label', 'Уроки части');
      root.appendChild(main); root.appendChild(aside); hb.parentNode.insertBefore(root, hb);
      var mp = document.createElement('div'); mp.className = 'fl-mp'; main.appendChild(mp);
      var hd = document.createElement('header'); hd.className = 'fl-hd'; main.appendChild(hd);
      var meta = []; var vids = lp.querySelectorAll('.lt-video').length, tcs = lp.querySelectorAll('.timecode-item').length;
      if (isSurvey) meta.push('Анкета обратной связи'); else if (isHw) meta.push('Домашнее задание'); else if (vids) meta.push('Видеоурок');
      if (tcs) meta.push(tcs + NB + pl(tcs, ['тайм-код', 'тайм-кода', 'тайм-кодов']));
      var renderHead = function (x) { var now = Date.now(), chips = [];
        if (H.of) chips.push('<span class="fl-chip">Урок ' + H.n + ' из ' + H.of + '</span>');
        if (x && x.p && x.p.at) { var at = new Date(x.p.at).getTime(), until = at + (isHw ? 72 : 48) * 36e5; if (now >= at && now < until) chips.push('<span class="fl-chip l">' + ico('bolt', 13, 2.4) + '×2 баллы · ещё ' + left(until - now) + '</span>') }
        var pts = !x ? '' : isSurvey ? '<em>+15 баллов</em> за анкету' : isHw ? 'до <em>' + hwMax + ' баллов</em> за домашку' : '<em>+10 баллов</em> за урок';
        hd.innerHTML = (bc.length || part ? '<nav class="fl-bc" aria-label="Где я">' + bc.map(function (b) { return '<a class="fs-k" href="' + esc(b.href) + '">' + esc(cn(b.t)) + '</a>' }).join('<span aria-hidden="true">/</span>') + (part ? '<span aria-hidden="true">/</span><b>' + esc(part.t) + '</b>' : '') + '</nav>' : '')
          + (chips.length ? '<div class="fl-chips">' + chips.join('') + '</div>' : '')
          + '<h1 class="fl-t">' + (isHw && part && /^домашнее задание$/i.test(H.title) ? esc(part.t) + NB + '<span>— домашка</span>' : esc(H.title)) + '</h1>'
          + '<p class="fl-meta">' + meta.map(esc).join(' · ') + (meta.length && pts ? ' · ' : '') + pts + '</p>' + (H.desc ? '<p class="fl-meta">' + esc(H.desc) + '</p>' : '');
        typo(hd) };
      renderHead(null); x2Of().then(renderHead);

      if (locked) { var lk = document.createElement('section'); lk.className = 'fl-card fl-lock';
        lk.innerHTML = '<span class="fl-ic">' + ico('lock', 28, 1.8) + '</span><div><b>' + (openAt ? 'Откроется ' + when(openAt) : esc(H.state)) + '</b><span class="fl-cd"></span><span>Первые ' + (isHw ? 72 : 48) + NB + pl(isHw ? 72 : 48, ['час', 'часа', 'часов']) + ' после открытия&nbsp;— баллы ×2.</span></div>';
        main.appendChild(lk); typo(lk);
        var cdl = lk.querySelector('.fl-cd'), tick = function () { var ms = openAt ? openAt - Date.now() : 0; cdl.textContent = !openAt ? '' : ms > 0 ? 'Через ' + left(ms) : 'Урок уже открылся — обнови страницу'; if (openAt && ms > 0) setTimeout(tick, ms > 36e5 ? 6e4 : 1e4) }; tick() }

      /* блоки урока: переносим в колонку и приводим к шаблону */
      main.appendChild(lp);
      var about = null, mats = null, matsBox = null, lvGrid = null;
      wraps.forEach(function (w) { var k = classify(w); if (!k) return; var b = w.querySelector('.lt-block');
        if (k === 'about') { var items = [].map.call(b.querySelectorAll('.bonus-title, li'), function (e) { return txt(e).replace(/^[•·\-–—]\s*/, '') }).filter(Boolean);
          var sec = document.createElement('section'); sec.className = 'fl-card fl-about'; sec.setAttribute('aria-label', 'О чём урок');
          sec.innerHTML = '<div><span class="fl-lbl">В этом уроке</span><ul class="fl-pts">' + items.map(function (t) { return '<li>' + ico('check', 22, 2) + '<span>' + esc(t) + '</span></li>' }).join('') + '</ul></div>';
          w.style.display = 'none'; w.parentNode.insertBefore(sec, w); about = sec; typo(sec) }
        else if (k === 'tc') { var col = document.createElement('div'); col.className = 'tc'; col.innerHTML = '<span class="fl-lbl">Тайм-коды</span><nav class="fl-tc" aria-label="Тайм-коды"></nav>'; var navc = col.querySelector('nav');
          /* свои ссылки-копии: узлы GetCourse не трогаем (UCH-26), клик передаём оригиналу */
          [].forEach.call(b.querySelectorAll('.timecode-item'), function (it) { var a = it.querySelector('a'), time = a ? txt(a) : txt(it.querySelector('.timecode-time')), d = txt(it.querySelector('.timecode-description')), na = document.createElement('a'); na.className = 'fs-k';
            na.href = a && a.getAttribute('href') ? a.getAttribute('href') : '#'; na.onclick = function (e) { e.preventDefault(); (a || it).click() };
            na.innerHTML = '<b>' + esc(time.replace(/^00:/, '').replace(/^0(\d:)/, '$1')) + '</b><span>' + esc(d) + '</span>'; navc.appendChild(na) });
          if (about) { about.appendChild(col); w.style.display = 'none' } else { var s2 = document.createElement('section'); s2.className = 'fl-card fl-about'; s2.appendChild(col); w.style.display = 'none'; w.parentNode.insertBefore(s2, w); about = s2 } typo(col) }
        else if (k === 'mat' || k === 'files') { var list = k === 'files' ? filesOf(b) : matsOf(b); if (!list.length) return;
          if (!mats) { mats = document.createElement('section'); mats.className = 'fl-card'; mats.setAttribute('aria-label', 'Материалы урока'); mats.innerHTML = '<h2 class="fl-h">' + (isHw ? 'Материалы' : 'Материалы урока') + '</h2><div class="fl-mats"></div>'; matsBox = mats.querySelector('.fl-mats'); w.parentNode.insertBefore(mats, w) }
          var g = ''; list.forEach(function (m) { if (m.group && m.group !== g && list.length > 1 && m.title !== m.group) { matsBox.insertAdjacentHTML('beforeend', '<div class="fl-mg">' + esc(m.group) + '</div>'); g = m.group } matsBox.insertAdjacentHTML('beforeend', tile(m)) });
          w.style.display = 'none'; typo(mats) }
        else if (k === 'level') { var lab = txt(b.querySelector('.bonus-label')) || txt(b).split(/\s+/).slice(0, 3).join(' '), lv = /л[её]гк/i.test(lab) ? 0 : /средн/i.test(lab) ? 1 : 2, base = [20, 40, 70][lv];
          var pv = w.previousElementSibling; while (pv && pv !== lvGrid && (!pv.classList.contains('lite-block-live-wrapper') || pv.style.display === 'none')) pv = pv.previousElementSibling;
          if (!lvGrid || pv !== lvGrid) { lvGrid = document.createElement('div'); lvGrid.className = 'fl-lvs'; lvGrid.setAttribute('role', 'radiogroup'); lvGrid.setAttribute('aria-label', 'Уровни сложности'); w.parentNode.insertBefore(lvGrid, w) }
          lvGrid.appendChild(w); w.classList.add('fl-x', 'fl-lv'); w.setAttribute('data-lv', lv); w.setAttribute('role', 'radio'); w.setAttribute('tabindex', '0');
          var bb = b.querySelector('.bonus-block'); if (bb) bb.insertAdjacentHTML('afterbegin', '<div class="fl-lvh"><span class="r"></span><b>' + ['Лёгкий', 'Средний', 'Максимальный'][lv] + '</b><em data-base="' + base + '">' + base + ' баллов</em></div>');
          if (bb) [].forEach.call(bb.querySelectorAll('h1,h2,h3,h4,p,li,div:not(.fl-lvh)'), function (e) { if (e.querySelector('a.bonus-button') || e.classList.contains('bonus-label')) return; if (!txt(e) && !e.querySelector('img')) { e.style.display = 'none'; return } var t = e.firstChild; while (t && t.nodeType === 3 && !t.nodeValue.replace(/[\s\u00a0]+/g, '')) t = t.nextSibling; if (t && t.nodeType === 3) t.nodeValue = t.nodeValue.replace(/^[\s\u00a0]+/, '') });
          typo(w) }
        else if (k === 'warn') { var src = b.querySelector('.bonus-block') || b, ls = (src.innerText || '').split(/\n+/).map(function (x) { return x.replace(/\s+/g, ' ').trim() }).filter(Boolean);
          if (ls.length) { var t0 = ls.shift().replace(/^Внимание!?\s*/i, '').replace(/:$/, '') || 'Важно', li = [], rest = []; ls.forEach(function (x) { /^[-–—•]\s*/.test(x) && !rest.length ? li.push(x.replace(/^[-–—•]\s*/, '')) : rest.push(x) });
            var card = document.createElement('section'); card.className = 'fl-wc'; card.setAttribute('aria-label', 'Важно');
            card.innerHTML = '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d77fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/></svg><div><b>' + esc(t0) + (li.length ? ':' : '') + '</b>' + (li.length ? '<ul>' + li.map(function (x) { return '<li>' + esc(x) + '</li>' }).join('') + '</ul>' : '') + (function (rs) { var o = '', ul = ''; rs.forEach(function (x, i) { if (ul && /^[а-яё«(]/.test(x)) { ul += '<li>' + esc(x) + '</li>'; return } if (ul) { o += ul + '</ul>'; ul = '' } o += '<p>' + esc(x) + '</p>'; if (/:$/.test(x) && rs[i + 1] && /^[а-яё«(]/.test(rs[i + 1])) ul = '<ul>' }); return o + (ul ? ul + '</ul>' : '') })(rest) + '</div>';
            w.classList.add('fl-x', 'fl-warn', 'fl-wd'); [].forEach.call(w.children, function (c) { c.style.display = 'none' }); w.appendChild(card) } else w.classList.add('fl-x', 'fl-warn'); typo(w) }
        else { w.classList.add('fl-x', 'fl-' + k); typo(w) } });

      /* блоки GetCourse «задание / оценка / ответы» — всегда в конце урока, по порядку */
      ['.lt-lesson-mission-block', '.lt-lesson-feedback-block', '.lt-lesson-comment-block'].forEach(function (sel) { [].forEach.call(lp.querySelectorAll(sel), function (b) { var w = b.closest('.lite-block-live-wrapper'); if (w && w.parentNode === lp) lp.appendChild(w) }) });
      /* видео — сразу под шапкой, «В этом уроке» — под видео */
      var vw = lp.querySelector('.lt-video'); vw = vw ? vw.closest('.lite-block-live-wrapper') : null;
      if (about && vw && (about.compareDocumentPosition(vw) & Node.DOCUMENT_POSITION_FOLLOWING)) vw.insertAdjacentElement('afterend', about);
      /* шаги сдачи для домашки */
      /* сдача ДЗ / анкеты: состояние своего ответа, шаги, выбор уровня (UCH-19, UCH-20, UCH-23, STU-09, STU-18) */
      /* статусы ответов */ var STS = [[/status-accepted|status-approved/, 'ok', 'Принято'], [/status-not_accepted|status-declined|status-rejected|status-need/, 'wn', 'Нужно доработать'], [/status-draft/, '', 'Черновик'], [/status-new|status-in_work|status-review/, 'rv', 'На проверке']];
      var LVN = ['Лёгкий', 'Средний', 'Максимальный'], LVB = [20, 40, 70], lvOf = function (t) { return /л[её]гк/i.test(t) ? 0 : /средн/i.test(t) ? 1 : /максим/i.test(t) ? 2 : -1 };
      var mis = lp.querySelector('.lt-lesson-mission-block .lesson-mission-wrapper'), mw = null, own = null, ownSt = '', svb = lp.querySelector('.lt-form-survey');
      if (mis && (mis.querySelector('form') || mis.querySelector('.self-answers .answer_wrapper'))) { mw = mis.closest('.lt-lesson-mission-block'); mw.classList.add('fl-mis');
        own = mis.querySelector('.self-answers .answer_wrapper'); var os0 = own ? STS.filter(function (x) { return x[0].test(own.className) })[0] : null; ownSt = os0 ? os0[1] || 'dr' : own ? 'dr' : '' }
      var acc = ownSt === 'ok', rev = ownSt === 'rv', dec = ownSt === 'wn', sent = acc || rev;
      var svSaved = !!(svb && /уже сохран/i.test(txt(svb)));
      if (svb && (svSaved || sent)) { svb.classList.add('fl-svd'); var tw = document.createTreeWalker(svb, NodeFilter.SHOW_TEXT, null), tn; while ((tn = tw.nextNode())) if (/сохранен(?![а-яё])/.test(tn.nodeValue)) tn.nodeValue = tn.nodeValue.replace(/сохранен(?![а-яё])/g, 'сохранён') }
      /* шаги: домашка — 4, анкета — 2; пройденные отмечены */
      if (!locked && mw && (isHw || isSurvey)) { var ol = document.createElement('ol'); ol.className = 'fl-steps' + (isSurvey ? ' s2' : ''); ol.setAttribute('aria-label', isSurvey ? 'Как заполнить анкету' : 'Как сдать');
        var SS = isSurvey ? [['Шаг 1', 'Ответь на&nbsp;вопросы и&nbsp;нажми «Отправить»'], ['Шаг 2', 'Нажми «Засчитать анкету»']] : [['Шаг 1', 'Выбери уровень'], ['Шаг 2', 'Прикрепи работу'], ['Шаг 3', 'Куратор проверит'], ['Шаг 4', 'Баллы в&nbsp;рейтинг']];
        var dn = isSurvey ? (sent ? 2 : svSaved ? 1 : 0) : acc ? 4 : rev ? 3 : 0;
        ol.innerHTML = SS.map(function (s, i) { return '<li' + (i < dn ? ' class="ok"' : i === dn ? ' class="on"' : '') + '><span>' + s[0] + '</span><b>' + s[1] + '</b></li>' }).join('');
        main.insertBefore(ol, lp) }

      if (mw) { var mtx = mis.querySelector('.lesson-mission-text');
        if (mtx) { var tw2 = document.createTreeWalker(mtx, NodeFilter.SHOW_TEXT, null), t2; while ((t2 = tw2.nextNode())) if (/Отправить ответ/.test(t2.nodeValue)) t2.nodeValue = t2.nodeValue.replace(/Отправить ответ/g, 'Отправить на проверку') }
        mis.insertAdjacentHTML('afterbegin', '<h2 class="fl-mh">' + (sent ? (isSurvey ? 'Анкета заполнена' : 'Твоя работа') : dec ? 'Доработай работу' : isSurvey ? 'Засчитать анкету' : 'Сдать работу') + '</h2>');
        if (sent) { mw.classList.add('fl-own'); if (mtx) mtx.style.setProperty('display', 'none', 'important') }
        if (acc) { var sbk = mis.querySelector('.lesson-send-answer-block'); if (sbk) sbk.style.setProperty('display', 'none', 'important') }
        /* начисленные баллы за принятую домашку: уровень × база, ×2 — если сдана в первые 72 часа части (по data.json) */
        if (acc && !isSurvey) { var olv = -1; [].forEach.call(own.querySelectorAll('.addfield'), function (f) { if (/^да$/i.test(txt(f.querySelector('.value')))) olv = Math.max(olv, lvOf(txt(f.querySelector('label')))) });
          var oda = own.querySelector('.answer-date a[title]'), odt = oda ? pdt(oda.getAttribute('title')) : null;
          if (olv >= 0) { var got = document.createElement('p'); got.className = 'fl-pt fl-got'; mis.querySelector('.fl-mh').insertAdjacentElement('afterend', got);
            x2Of().then(function (x) { var at = x && x.p && x.p.at ? new Date(x.p.at).getTime() : 0; if (!x || (at && !odt)) { got.parentNode && got.parentNode.removeChild(got); return }
              var dbl = !!(at && odt >= at && odt < at + 72 * 36e5), v = LVB[olv] * (dbl ? 2 : 1); got.innerHTML = 'Принято · ' + LVN[olv] + ' уровень · начислено <b>+' + v + NB + pl(v, ['балл', 'балла', 'баллов']) + '</b>' + (dbl ? ' с&nbsp;бонусом ×2' : '') }) } }
        var boxes = [].slice.call(mis.querySelectorAll('.addfield-type-checkbox')).map(function (d) { var t = txt(d.querySelector('label')); return { el: d.querySelector('input[type=checkbox]'), t: t, lv: lvOf(t) } }).filter(function (x) { return x.el && /уровень/i.test(x.t) && x.lv >= 0 });
        if (boxes.length) hwMax = LVB[Math.max.apply(null, boxes.map(function (x) { return x.lv }))];
        var ta = mis.querySelector('.answer-textarea-container') || mis.querySelector('textarea');
        if (boxes.length && ta && !acc) { mw.classList.add('fl-lvd'); var seg = document.createElement('div'); seg.className = 'fl-seg'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'На каком уровне сделал(а)?');
          boxes.forEach(function (x, i) { seg.insertAdjacentHTML('beforeend', '<button type="button" data-i="' + i + '">' + LVN[x.lv] + ' · ' + LVB[x.lv] + '</button>') });
          var hint = document.createElement('p'); hint.className = 'fl-pt';
          var lbl = document.createElement('p'); lbl.className = 'fl-ml'; lbl.innerHTML = 'На каком уровне сделал(а)? Один ответ&nbsp;— один уровень';
          ta.parentNode.insertBefore(lbl, ta); ta.parentNode.insertBefore(seg, ta);
          var sendBtn = mis.querySelector('.btn-save-draft') || mis.querySelector('.btn-send-answer'); if (sendBtn) sendBtn.insertAdjacentElement('afterend', hint);
          var x2until = 0; x2Of().then(function (x) { if (x && x.p && x.p.at) x2until = new Date(x.p.at).getTime() + 72 * 36e5; pick(cur) });
          var cur = boxes.findIndex ? boxes.findIndex(function (x) { return x.el.checked }) : -1;
          var pick = function (i) { cur = i; var lv = i >= 0 ? boxes[i].lv : -1; boxes.forEach(function (x, j) { x.el.checked = j === i }); [].forEach.call(seg.children, function (b2, j) { b2.classList.toggle('on', j === i); b2.setAttribute('aria-checked', j === i ? 'true' : 'false') });
            [].forEach.call(lp.querySelectorAll('.fl-lv'), function (c) { var on = +c.getAttribute('data-lv') === lv; c.classList.toggle('on', on); c.setAttribute('aria-checked', on ? 'true' : 'false') });
            var dbl = Date.now() < x2until; [].forEach.call(lp.querySelectorAll('.fl-lvh em'), function (e) { var b0 = +e.getAttribute('data-base'); e.textContent = dbl ? b0 + ' · ×2 = ' + b0 * 2 : b0 + ' баллов' });
            var stp = document.querySelectorAll('.fl-steps li'); if (stp.length === 4 && !sent) { stp[0].className = i < 0 ? 'on' : 'ok'; stp[1].className = i >= 0 ? 'on' : '' }
            if (i >= 0) { var b1 = LVB[lv]; hint.innerHTML = LVN[lv] + ' уровень принесёт <b>' + (dbl ? b1 * 2 + ' баллов</b> с&nbsp;бонусом ×2' : b1 + ' баллов</b>') + ' после «Принято»' } else hint.textContent = 'Выбери уровень, на котором сделал(а) работу' };
          [].forEach.call(seg.children, function (b2) { b2.onclick = function () { pick(+b2.getAttribute('data-i')) } });
          [].forEach.call(lp.querySelectorAll('.fl-lv'), function (c) { var go = function (e) { if (e.target.closest('a')) return; var j = -1; boxes.forEach(function (x, k) { if (x.lv === +c.getAttribute('data-lv')) j = k }); if (j >= 0) pick(j) }; c.addEventListener('click', go); c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e) } }) });
          pick(cur) }
        var sbtn = mis.querySelector('.btn-send-answer'); if (sbtn && /Отправить ответ/.test(sbtn.textContent)) sbtn.textContent = isSurvey ? 'Засчитать анкету' : 'Отправить на проверку'; var ub = mis.querySelector('.uploadifive-button'); if (ub && ub.firstChild && ub.firstChild.nodeType === 3) ub.firstChild.nodeValue = 'Прикрепить файлы с работой'; if (ub) ub.style.setProperty('text-transform', 'none', 'important');
        /* анкета: один путь — «Отправить» в анкете, потом «Засчитать анкету»; галочка «Заполнил анкету» ставится сама после успешной отправки */
        if (isSurvey && !sent && mis.querySelector('form')) { var scb = mis.querySelector('.addfield-type-checkbox input[type=checkbox]'), sdr = mis.querySelector('.btn-save-draft'); if (sdr) sdr.style.setProperty('display', 'none', 'important');
          var sn = document.createElement('p'); sn.className = 'fl-ml fl-svn'; var sba = mis.querySelector('.lesson-send-answer-block'); if (sba) sba.parentNode.insertBefore(sn, sba); else mis.appendChild(sn);
          var svDone = function () { if (!svb) return true; var rb = svb.querySelector('.form-result-block'); return /уже сохран/i.test(txt(svb)) || !!(rb && /спасибо|сохран|отправлен|принят|получен/i.test(txt(rb))) };
          var svSet = function () { var ok = svDone(); mw.classList.toggle('fl-wt', !ok); if (ok && scb && !scb.checked) scb.checked = true;
            sn.innerHTML = ok ? 'Анкета отправлена. Остался один шаг: нажми «Засчитать анкету».' : 'Сначала ответь на&nbsp;вопросы анкеты выше и&nbsp;нажми «Отправить». Потом вернись сюда.';
            var st2 = document.querySelectorAll('.fl-steps.s2 li'); if (st2.length === 2) { st2[0].className = ok ? 'ok' : 'on'; st2[1].className = ok ? 'on' : '' } };
          svSet(); if (svb) try { new MutationObserver(function () { clearTimeout(svSet.t); svSet.t = setTimeout(svSet, 150) }).observe(svb, { childList: true, subtree: true, characterData: true }) } catch (e) {} }
        typo(mtx); typo(mis.querySelector('.fl-mh')) }

      /* оценка урока */
      var fbs = lp.querySelectorAll('.training-feedback-widget'), fb = fbs[fbs.length - 1]; if (fb) { var h3 = fb.querySelector('h3'); if (h3 && /Оцените курс/i.test(h3.textContent)) h3.textContent = 'Как тебе урок?'; var l1 = fb.querySelector('.form-group label'); if (l1 && /Оцените пройденный урок/.test(l1.textContent)) l1.textContent = 'Мы читаем каждый отзыв и по ним улучшаем курс'; typo(fb) }

      /* ответы: статус и уровень чипами; чужие работы — свёрнуты; пустой блок комментариев — убрать */
      /* статусы ответов — см. блок сдачи выше (STS) */
      var decorate = function () { [].forEach.call(lp.querySelectorAll('.fl-oth textarea, .answer_wrapper .new-comment textarea'), function (t) { if (/добавить комментарий/i.test(t.getAttribute('placeholder') || '')) t.setAttribute('placeholder', 'Комментарий к работе') }); [].forEach.call(lp.querySelectorAll('.answer_wrapper'), function (a) { if (a.querySelector('.fl-ast')) return; var c = a.querySelector('.answer-content'); if (!c) return;
        var s0 = STS.filter(function (x) { return x[0].test(a.className) })[0], lv = [].map.call(a.querySelectorAll('.addfield'), function (f) { return /да/i.test(txt(f.querySelector('.value'))) ? txt(f.querySelector('label')).replace(/\s*уровень/i, '') : '' }).filter(Boolean).slice(-1);
        c.insertAdjacentHTML('afterbegin', '<div class="fl-ast">' + (s0 ? '<span class="fl-chip ' + s0[1] + '">' + s0[2] + '</span>' : '') + lv.map(function (l) { return '<span class="fl-chip">' + esc(l) + '</span>' }).join('') + '</div>') }) };
      [].forEach.call(lp.querySelectorAll('.lt-lesson-comment-block'), function (b) { var w = b.closest('.lite-block-live-wrapper'), list = b.querySelector('.other-answers'), n = b.querySelectorAll('.answer_wrapper').length;
        if (!n) { if (w) w.style.display = 'none'; return }
        var sec = document.createElement('section'); sec.className = 'fl-card fl-oth'; sec.innerHTML = '<button type="button" aria-expanded="false"><span>Работы других учеников<small>' + n + '</small></span>' + ico('down', 20, 2) + '</button><div class="fl-ol"></div>';
        sec.querySelector('.fl-ol').appendChild(list); b.querySelector('.lt-block-wrapper') ? b.querySelector('.lt-block-wrapper').appendChild(sec) : b.appendChild(sec);
        var tb = sec.querySelector('button'); tb.onclick = function () { var o = sec.classList.toggle('open'); tb.setAttribute('aria-expanded', o ? 'true' : 'false') } });
      var sa = lp.querySelector('.fl-mis .self-answers'); if (sa && sa.querySelector('.answer_wrapper') && !lp.querySelector('.fl-mis.fl-own')) sa.insertAdjacentHTML('afterbegin', '<p class="fl-mine">Твоя работа</p>');
      decorate(); try { new MutationObserver(function () { clearTimeout(decorate.t); decorate.t = setTimeout(decorate, 200) }).observe(lp, { childList: true, subtree: true }) } catch (e) {}

      /* оценка урока: своя форма поверх формы GetCourse */
      if (fb && !fb.classList.contains('fl-fbx')) { var gf = fb.querySelector('form');
        if (gf) { fb.classList.add('fl-fbx'); var box = document.createElement('section'); box.className = 'fl-card fl-fb'; box.setAttribute('aria-label', 'Оценка урока');
          box.innerHTML = '<h2>Как тебе урок?</h2><p>Мы читаем каждый отзыв и&nbsp;по&nbsp;ним улучшаем курс</p><div class="fl-st" role="radiogroup" aria-label="Оценка от 1 до 5">' + [1, 2, 3, 4, 5].map(function (i) { return '<button type="button" data-v="' + i + '" aria-label="' + i + ' из 5"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7L12 3Z"/></svg></button>' }).join('') + '</div>'
            + '<textarea placeholder="Что понравилось, что было непонятно, чего не хватило?" aria-label="Отзыв"></textarea><div class="fl-fr"><button type="button" class="fl-sb" disabled>Отправить отзыв</button><span></span></div>';
          fb.appendChild(box); typo(box); var val = 0, sb = box.querySelector('.fl-sb'), note = box.querySelector('.fl-fr span');
          var paint = function (v) { [].forEach.call(box.querySelectorAll('.fl-st button'), function (b) { b.classList.toggle('on', +b.getAttribute('data-v') <= v) }) };
          [].forEach.call(box.querySelectorAll('.fl-st button'), function (b) { b.onmouseenter = function () { paint(+b.getAttribute('data-v')) }; b.onmouseleave = function () { paint(val) }; b.onclick = function () { val = +b.getAttribute('data-v'); paint(val); sb.disabled = false; [].forEach.call(box.querySelectorAll('.fl-st button'), function (x) { x.setAttribute('aria-checked', +x.getAttribute('data-v') === val ? 'true' : 'false') }) } });
          sb.onclick = function () { var r = gf.querySelector('input[name="rating"]'), t = gf.querySelector('textarea[name="comment"]'), w = gf.querySelector('.star-rating-widget'); if (r) r.value = val; if (w) w.setAttribute('data-rating', val); if (t) t.value = box.querySelector('textarea').value;
            sb.disabled = true; note.textContent = 'Отправляем…';
            /* «Спасибо!» — только если GetCourse принял отзыв: JSON без ошибки или страница без формы входа (CODE-30) */
            fetch(gf.getAttribute('action'), { method: 'POST', body: new FormData(gf), credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(function (x) { if (!x.ok || /\/login|cms\/system\/login|\/sign-?in/i.test(x.url || '')) throw 0; return x.text() }).then(function (t) { var j = null; try { j = JSON.parse(t) } catch (e) {}
              var bad = j && typeof j === 'object' ? (j.success === false || j.result === false || j.status === 'error' || !!j.error || !!j.errorMessage || !!(j.errors && (j.errors.length || Object.keys(j.errors).length))) : /name="(?:LoginForm|password)/i.test(t || '');
              if (bad) throw 0; box.classList.add('done'); note.textContent = 'Спасибо! Отзыв отправлен.' }).catch(function () { sb.disabled = false; note.textContent = 'Не получилось отправить. Попробуй ещё раз.' }) } } }
      /* переход дальше */
      /* переход дальше: следующий урок; на последнем — следующая часть или модуль (UCH-22); на телефоне одна главная «Далее» (UCH-27, UCH-28) */
      var isMod = bc.length < 2, up = bc.length ? bc[bc.length - 1] : null, upLbl = isMod ? 'К курсу' : 'К модулю', needMis = !!(mw && !acc && !(isSurvey && sent));
      if (H.next || H.prev || part) { var nx = document.createElement('section'); nx.className = 'fl-next'; nx.setAttribute('aria-label', 'Переход между уроками');
        nx.innerHTML = '<div class="t">' + (H.next ? '<span>Следующий урок' + (H.of ? ' · ' + (H.n + 1) + ' из ' + H.of : '') + '</span><b>' + esc(H.next.name || 'Следующий урок') + '</b>' : '<span>' + (isMod ? 'Это последний урок модуля' : 'Это последний урок части') + '</span><b>' + esc(part ? part.t : 'Часть пройдена') + '</b>') + '</div>'
          + '<div class="fl-nb">' + (H.prev ? '<a class="fl-btn2 fs-k" href="' + esc(H.prev.href) + '">' + ico('prev', 18, 2) + '<span>' + esc(H.prev.name || 'Предыдущий урок') + '</span></a>' : '') + (H.next ? '<a class="fl-btn" href="' + esc(H.next.href) + '">Следующий урок' + ico('next', 18, 2) + '</a>' : part ? '<a class="fl-btn" href="' + esc(up ? up.href : part.href) + '">' + upLbl + ico('next', 18, 2) + '</a>' : '') + '</div>';
        /* пока работа/анкета не сдана, главная кнопка экрана — сдача; «дальше» — вторичная */
        if (needMis) [].forEach.call(nx.querySelectorAll('.fl-btn'), function (b) { b.classList.add('fl-sec') });
        var fbw = lp.querySelector('.lt-lesson-feedback-block'); fbw = fbw ? fbw.closest('.lite-block-live-wrapper') : null; if (fbw) lp.insertBefore(nx, fbw); else lp.appendChild(nx); typo(nx);
        var bar = document.createElement('nav'); bar.className = 'fl-bar'; bar.setAttribute('aria-label', 'Переход между уроками');
        bar.innerHTML = (H.prev ? '<a class="p" href="' + esc(H.prev.href) + '" aria-label="Предыдущий урок: ' + esc(H.prev.name) + '">' + ico('prev', 20, 2) + '</a>' : '') + (needMis ? '<a class="n" href="#" data-hw="1"><span>' + (isSurvey ? 'Заполнить анкету' : dec ? 'Доработать работу' : rev ? 'Моя работа' : 'Сдать работу') + '</span>' + ico('up', 18, 2) + '</a>' : H.next ? '<a class="n" href="' + esc(H.next.href) + '"><span>Далее: ' + esc(H.next.name || 'следующий урок') + '</span>' + ico('next', 18, 2) + '</a>' : '');
        var hwb = bar.querySelector('[data-hw]'); if (hwb) hwb.onclick = function (e) { e.preventDefault(); var t = isSurvey && svb && !svb.classList.contains('fl-svd') ? svb : lp.querySelector('.fl-mis'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }) };
        if (bar.children.length) document.body.appendChild(bar);
        /* нижняя панель прячется, когда на экране карточка «Следующий урок» или форма сдачи */
        if (window.IntersectionObserver) { var seen = []; var io = new IntersectionObserver(function (es) { es.forEach(function (e) { var k = seen.indexOf(e.target); if (e.isIntersecting && k < 0) seen.push(e.target); if (!e.isIntersecting && k >= 0) seen.splice(k, 1) }); bar.classList.toggle('off', seen.length > 0) }, { rootMargin: '0px 0px -80px 0px' });
          io.observe(nx); if (mw && needMis) io.observe(mw); if (isSurvey && svb && needMis) io.observe(svb) }
        /* последний урок: ищем соседнюю часть в модуле, а после последней части — следующий модуль */
        if (!H.next && part && up) { var idOf = function (h) { return (String(h || '').match(/\/id\/(\d+)/) || [])[1] || '' };
          var sib = function (href, cid) { return fetch(href, { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) { var d = new DOMParser().parseFromString(t, 'text/html'), rows = [].slice.call(d.querySelectorAll('.stream-table tr.training-row')).filter(function (r) { return !/no-lessons/.test(r.className) }), i = -1;
            rows.forEach(function (r, k) { var a = r.querySelector('a[href]'); if (r.getAttribute('data-training-id') === cid || (a && idOf(a.getAttribute('href')) === cid)) i = k });
            var r = i >= 0 ? rows[i + 1] : null, a = r && r.querySelector('a[href]'), s = r && r.querySelector('.stream-title'); return a ? { href: a.getAttribute('href'), t: cn(txt(s || a)) } : null }) };
          var go = function (n, kind) { if (!n) return; var t = nx.querySelector('.t'); t.innerHTML = '<span>' + (kind === 'p' ? 'Дальше · следующая часть' : 'Дальше · следующий модуль') + '</span><b>' + esc(n.t) + '</b>';
            var nb = nx.querySelector('.fl-nb'), main2 = nb.querySelector('.fl-btn'); nb.innerHTML = '<a class="fl-btn2 fs-k" href="' + esc(kind === 'm' && bc.length >= 2 ? bc[bc.length - 2].href : up.href) + '">' + ico('prev', 18, 2) + '<span>' + (kind === 'm' ? 'К курсу' : 'К модулю') + '</span></a><a class="fl-btn' + (main2 && main2.classList.contains('fl-sec') ? ' fl-sec' : '') + '" href="' + esc(n.href) + '">' + (kind === 'p' ? 'Следующая часть' : 'Следующий модуль') + ico('next', 18, 2) + '</a>'; typo(nx);
            if (!bar.parentNode) document.body.appendChild(bar); if (!bar.querySelector('.n')) bar.insertAdjacentHTML('beforeend', '<a class="n" href="' + esc(n.href) + '"><span>Далее: ' + esc(n.t) + '</span>' + ico('next', 18, 2) + '</a>') };
          if (isMod) sib(up.href, idOf(part.href)).then(function (n) { go(n, 'm') }).catch(function () {});
          else sib(up.href, idOf(part.href)).then(function (n) { if (n) return go(n, 'p'); if (bc.length >= 2) return sib(bc[bc.length - 2].href, idOf(up.href)).then(function (m) { if (m) { nx.querySelector('.t span').textContent = 'Это последний урок модуля'; go(m, 'm') } }) }).catch(function () {}) } }

      /* уроки части: справа на компьютере, раскрывашкой сверху на телефоне */
      aside.insertAdjacentHTML('beforeend', '<a class="fl-care" href="' + CARE + '" target="_blank" rel="noopener"><span>Техническая проблема?<b>Служба заботы</b></span>' + ico('next', 18, 2) + '</a>');
      if (part) partData(part.href).then(function (L) { if (!L || !L.length) return; var done = L.filter(function (x) { return x.done }).length, pc = Math.round(done / L.length * 100), idx = L.findIndex ? L.findIndex(function (x) { return String(x.id) === String(LID) }) : -1;
        var box = function () { return '<section class="fl-part"><div class="h"><span>' + esc(bc.length ? cn(bc[bc.length - 1].t) : '') + '</span><b>' + esc(part.t) + '</b></div>'
          + '<div><div class="fl-pr"><span><b>' + done + '</b> из&nbsp;' + L.length + ' пройдено</span><span>' + pc + '%</span></div><div class="fl-pb"><i style="width:' + pc + '%"></i></div></div>'
          + '<ol class="fl-ls">' + L.map(function (x) { var c = String(x.id) === String(LID) ? 'cur' : x.done ? 'done' : x.lk ? 'lk' : ''; return '<li><a class="' + c + '" href="' + esc(x.href) + '"' + (c === 'cur' ? ' aria-current="page"' : '') + '><span class="d">' + (c === 'done' ? ico('check', 14, 3) : '') + '</span><span class="x">' + esc(x.t) + '</span>' + (/домашн/i.test(x.t) ? '<span class="tg">ДЗ</span>' : '') + '</a></li>' }).join('') + '</ol></section>' };
        aside.insertAdjacentHTML('afterbegin', box());
        mp.innerHTML = '<button type="button" aria-expanded="false"><span class="fl-ring" style="background:conic-gradient(#c38bff 0 ' + pc + '%,rgba(255,255,255,.08) ' + pc + '% 100%)"><i></i></span><span class="x"><small>' + esc(part.t) + (idx >= 0 ? ' · урок ' + (idx + 1) + ' из ' + L.length : '') + '</small>Все уроки части</span>' + ico('down', 18, 2) + '</button>' + box();
        var mb = mp.querySelector('button'); mb.onclick = function () { var o = mp.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false') };
        var cl = aside.querySelector('.fl-ls .cur'); if (cl) { var ls = cl.closest('.fl-ls'); ls.scrollTop = Math.max(0, cl.offsetTop - ls.clientHeight / 2) } typo(aside) }).catch(function () {});
      return true };
    var tries = 0, kick = function () { if (start()) return; if (++tries < 400) setTimeout(kick, tries < 80 ? 150 : 500) };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kick); else kick();
  })();

  /* ===== своя «Статистика»: /pl/sales/dealstat (?fs=sales|cumulative|clients|gc-table; ?fs=gc — классический вид GetCourse) ===== */
  (function () {
    /*t*/
    var path = location.pathname.replace(/\/+$/, ''), qs = new URLSearchParams(location.search), fsq = qs.get('fs');
    /* классический вид (?fs=gc): ссылки «Накопительная» / «Структура выручки» оставляем в классике, плюс кнопка назад */
    if (fsq === 'gc') { if (!/^\/pl\/(sales\/dealstat(\/index)?|sales\/stat\/cumulative|crm\/stat\/revenue-structure)$/.test(path)) return;
      var gcFix = function () { [].forEach.call(document.querySelectorAll('a[href*="stat/cumulative"],a[href*="revenue-structure"]'), function (a) { var h = a.getAttribute('href') || ''; if (!/[?&]fs=gc/.test(h)) a.setAttribute('href', h + (h.indexOf('?') < 0 ? '?' : '&') + 'fs=gc') });
        if (document.querySelector('.fss-back')) return; var host = document.querySelector('.standard-page-content') || document.querySelector('.gc-main-content'); if (!host) return;
        var b = document.createElement('a'); b.className = 'fss-back'; b.href = '/pl/sales/dealstat?fs=sales'; b.textContent = '← Новая статистика';
        b.setAttribute('style', 'display:inline-flex;align-items:center;height:40px;padding:0 16px;margin:0 0 16px;border-radius:12px;background:rgba(255,255,255,.11);color:#fff!important;text-decoration:none!important;font:500 14px/1 "Inter Tight",Inter,system-ui,sans-serif');
        host.insertBefore(b, host.firstChild) };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', gcFix); else gcFix(); setTimeout(gcFix, 1500); return }
    if (/^\/pl\/sales\/stat\/cumulative$/.test(path)) { location.replace('/pl/sales/dealstat?fs=cumulative'); return }
    if (/^\/pl\/crm\/stat\/revenue-structure$/.test(path)) { location.replace('/pl/sales/dealstat?fs=clients'); return }
    if (!/^\/pl\/sales\/dealstat(\/index)?$/.test(path)) return;
    var TABS = [['sales', 'Продажи'], ['cumulative', 'Накопительная'], ['clients', 'Клиенты и LTV'], ['table', 'Как в GetCourse']];
    var tab = { report: 'sales', overview: 'sales', dynamics: 'sales', structure: 'clients', 'gc-table': 'table' }[fsq] || (TABS.some(function (t) { return t[0] === fsq }) ? fsq : 'sales');
    document.documentElement.classList.add('fss-on');
    var hk = (location.hash.match(/fsk=([0-9a-f]{16,64})/) || [])[1]; if (hk) { try { localStorage.setItem('fsStatKey', hk) } catch (e) {} try { history.replaceState(null, '', location.pathname + location.search) } catch (e) {} }
    var statKey = function () { try { return localStorage.getItem('fsStatKey') || '' } catch (e) { return '' } };
    /* ключ хранится в служебной теме GetCourse (видна только админам): браузер берёт его сам, вводить не нужно */
    var KEYT = '/pl/cms/layout/update?id=101777';
    var keySync = function () { return fetch(KEYT, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : '' }).then(function (h) {
      var f = new DOMParser().parseFromString(h, 'text/html').querySelector('#form1'); if (!f) return; var m = h.match(/fsk:([0-9a-f]{16,64})/), k = statKey();
      if (!k && m) { try { localStorage.setItem('fsStatKey', m[1]) } catch (e) {} location.reload() }
      else if (k && (!m || m[1] !== k)) { var fd = new FormData(f); fd.set('Content[css]', '/* служебная тема: ключ для страницы «Статистика». Не подключать к страницам. fsk:' + k + ' */'); fetch(f.getAttribute('action') || KEYT, { method: 'POST', body: fd, credentials: 'same-origin' }) } }).catch(function () {}) };
    keySync();
    var API = window.FS_API && String(window.FS_API).indexOf('http') === 0 ? window.FS_API : 'https://oduvanov-api.romanoduvanov52.workers.dev';

    /* ---------- утилиты ---------- */
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    /* разделитель тысяч и пробел перед ₽ — неразрывные (U+00A0), чтобы суммы не рвались по строкам */
    var NUM = function (n) { return Math.round(n || 0).toLocaleString('ru-RU').replace(/\s/g, '\u00a0') };
    var RUB = function (n) { return NUM(n) + '\u00a0₽' };
    var SHORT = function (n) { n = n || 0; var a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '').replace('.', ',') + '\u00a0млн' : a >= 1e3 ? Math.round(n / 1e3) + '\u00a0тыс' : Math.round(n) + '' };
    var pl = function (n, f) { n = Math.abs(Math.round(n)); var a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2] };
    var money = function (s) { var m = String(s || '').replace(/[\s ]/g, '').match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : 0 };
    var dd = function (d) { return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear() };
    var day0 = function (d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d };
    var addD = function (d, n) { d = new Date(d); d.setDate(d.getDate() + n); return d };
    var key = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) };
    var ndays = function (a, b) { return Math.round((day0(b) - day0(a)) / 864e5) + 1 };
    /* время аккаунта GetCourse — Москва: «сейчас» и «сегодня» берём по МСК, даже если браузер в другом поясе.
       Даты дней (ключи YYYY-MM-DD, created из /fin) — московские «настенные» часы в локальных полях Date */
    var mskOf = function (d) { d = d ? new Date(d) : new Date(); return new Date(d.getTime() + (180 + d.getTimezoneOffset()) * 6e4) };
    var nowM = function () { return mskOf() };
    var today = day0(nowM());
    var MONS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var MONN = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    var MONS3 = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
    var MONA = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']; /* месяц без числа (подписи осей) */
    var WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    var MON3 = { 'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4, 'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11 };
    var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1) };
    var human = function (a, b, short) { var y = today.getFullYear(), Y = function (d) { return d.getFullYear() !== y ? ' ' + d.getFullYear() : '' }, M = short ? MONS3 : MONS;
      if (key(a) === key(b)) return a.getDate() + ' ' + M[a.getMonth()] + Y(a);
      if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return a.getDate() + '–' + b.getDate() + ' ' + M[b.getMonth()] + Y(b);
      var yy = a.getFullYear() !== b.getFullYear(); /* разные годы — год у обеих дат */
      return a.getDate() + ' ' + M[a.getMonth()] + (yy ? ' ' + a.getFullYear() : Y(a)) + ' — ' + b.getDate() + ' ' + M[b.getMonth()] + (yy ? ' ' + b.getFullYear() : Y(b)) };
    var wholeYear = function (a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === 0 && a.getDate() === 1 && b.getMonth() === 11 && b.getDate() === 31 };
    var wholeMonth = function (a, b) { return a && b && a.getDate() === 1 && addD(b, 1).getDate() === 1 && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() };
    var MONP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
    var leadP = function (p) { var y = today.getFullYear(), Y = function (d) { return d.getFullYear() !== y ? ' ' + d.getFullYear() : '' };
      if (S.k === 'all') return 'За всё время'; if (key(p.a) === key(p.b)) return cap(human(p.a, p.b));
      if (wholeYear(p.a, p.b)) return 'В\u00a0' + p.a.getFullYear() + ' году';
      if (wholeMonth(p.a, p.b)) return 'В\u00a0' + MONP[p.a.getMonth()] + Y(p.a);
      if (p.a.getMonth() === p.b.getMonth() && p.a.getFullYear() === p.b.getFullYear()) return 'С\u00a0' + p.a.getDate() + ' по\u00a0' + p.b.getDate() + ' ' + MONS[p.b.getMonth()] + Y(p.b);
      var yy = p.a.getFullYear() !== p.b.getFullYear();
      return 'С\u00a0' + p.a.getDate() + ' ' + MONS[p.a.getMonth()] + (yy ? ' ' + p.a.getFullYear() : Y(p.a)) + ' по\u00a0' + p.b.getDate() + ' ' + MONS[p.b.getMonth()] + (yy ? ' ' + p.b.getFullYear() : Y(p.b)) };
    var pct = function (cur, prev) { if (!prev) return null; return (cur - prev) / prev * 100 };
    /* одно округление для чипа, лида и картинки: < 10% — с десятой, рост больше 200% — «×N» / «в N раз» */
    var pctN = function (p) { var a = Math.abs(p); return a < 10 ? a.toFixed(1).replace('.', ',').replace(',0', '') : NUM(a) };
    var ratioN = function (p) { var r = 1 + p / 100; return r < 10 ? r.toFixed(1).replace('.', ',').replace(',0', '') : NUM(r) };
    var pctChip = function (p) { return p >= 200 ? '×' + ratioN(p) : pctN(p) + '%' };
    var pctLead = function (p) { if (p >= 200) { var r = ratioN(p); return 'в\u00a0' + r + '\u00a0' + (/,/.test(r) ? 'раза' : pl(+r.replace(/\D/g, ''), ['раз', 'раза', 'раз'])) + ' больше' } return 'на\u00a0' + pctN(p) + '% ' + (p >= 0 ? 'больше' : 'меньше') };
    var dchip = function (cur, prev, cmpLbl) { var p = pct(cur, prev); if (p == null) return '<span class="fss-dl">' + (prev === 0 && cur ? 'раньше было 0' : '&nbsp;') + '</span>';
      var c = p > 0.5 ? 'up' : p < -0.5 ? 'dn' : '', a = c === 'up' ? '↑' : c === 'dn' ? '↓' : '≈'; return '<span class="fss-dl ' + c + '"><b>' + a + '\u00a0' + pctChip(p) + '</b> ' + esc(cmpLbl || '') + '</span>' };

    /* ---------- данные GetCourse ---------- */
    var csrf = function (fd) { fd.append(window.csrfField || '_csrf', window.csrfToken || ''); return fd };
    var html = function (s) { return new DOMParser().parseFromString(s || '', 'text/html') };
    var payRule = function (a, b) { return JSON.stringify({ type: 'andrule', inverted: 0, params: { children: [{ type: 'deal_payed_at', inverted: 0, params: { value: { from: dd(a), to: dd(b), toNDays: '', fromNDays: '', dateType: '', withTime: false }, valueMode: null } }], mode: 'and' } }) };
    var C = {};
    /* кэш вкладки (sessionStorage): данные GetCourse переживают переход между страницами, но не закрытие вкладки */
    var ssGet = function (k, ttl) { try { var v = JSON.parse(sessionStorage.getItem(k) || 'null'); return v && Date.now() - v.at < ttl ? v.d : null } catch (e) { return null } };
    var ssSet = function (k, d) { try { sessionStorage.setItem(k, JSON.stringify({ at: Date.now(), d: d })) } catch (e) {} };
    /* поступления по дням за всё время (платежи со статусом «Получен») — одним запросом */
    var payments = function () { if (C.pay) return C.pay; var k = statKey();
      var gross = function () { return grossPayments().then(function (P) { P.gross = true; return P }) };
      if (!k) return C.pay = gross();
      /* пустой диапазон: нужны только итоги по дням, список последних оплат с именами не тянем */
      return C.pay = fetch(API + '/fin?k=' + encodeURIComponent(k) + '&from=2000-01-01&to=2000-01-01').then(function (r) { if (!r.ok) { C.finErr = r.status === 403 ? 'auth' : 'net'; throw new Error('fin') } return r.json() }).then(function (j) {
        if (!j || !j.ok || !j.days || !j.days.length) { C.finErr = C.finErr || 'net'; throw new Error('fin') } C.finErr = null;
        var m = {}, first = null; j.days.forEach(function (d) { var dt = new Date(d[0] + 'T00:00'); m[d[0]] = { n: d[1], gross: d[2], fee: d[3], sum: d[4], old: d[5] || 0 }; if (!first || dt < first) first = dt });
        var od = {}, oldTo = null; (j.odays || []).forEach(function (d) { od[d[0]] = { n: d[1], sum: d[2] }; var dt = new Date(d[0] + 'T00:00'); if (!oldTo || dt > oldTo) oldTo = dt; if (!first || dt < first) first = dt });
        return { m: m, first: first, synced: j.synced, od: od, oldTo: oldTo } }).catch(function () { C.finErr = C.finErr || 'net'; return gross() }) };
    var grossPayments = function () { var fd = csrf(new URLSearchParams({ rule: JSON.stringify({ type: 'andrule', inverted: 0, params: { children: [{ type: 'status', inverted: 0, params: { value: { selected_id: ['accepted'] }, valueMode: null } }], mode: 'and' } }), noLimit: 'true' }));
      return fetch('/pl/sales/control/payment/chart-data?PaymentStat%5BperiodType%5D=day', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(function (r) { return r.json() }).then(function (j) {
        var d = j.data, m = {}, first = null; (d.xAxis.categories || []).forEach(function (c, i) { var x = String(c).toLowerCase().match(/(\d{1,2})\s+([а-я]{3})[а-я]*\s+(\d{4})/); if (!x || MON3[x[2]] == null) return; var dt = new Date(+x[3], MON3[x[2]], +x[1]);
          m[key(dt)] = { sum: +(d.series[1].data[i] || 0), n: +(d.series[0].data[i] || 0) }; if (!first || dt < first) first = dt });
        Object.keys(m).forEach(function (kk) { m[kk].gross = m[kk].sum; m[kk].fee = 0 }); return { m: m, first: first || today } }) };
    var paySum = function (P, a, b) { var s = 0, n = 0, g = 0, f = 0; for (var d = day0(a); d <= b; d = addD(d, 1)) { var x = P.m[key(d)]; if (x) { s += x.sum; n += x.n; g += x.gross || 0; f += x.fee || 0 } } return { sum: s, n: n, gross: g, fee: f } };
    /* оплаченные заказы за период: официальные итоги GetCourse */
    /* старый аккаунт школы: оплаченные заказы по дням (из /fin) и покупатели за период (/fin/old) */
    var odSum = function (a, b) { var PV = C.payV, n = 0, s = 0; if (!PV || !PV.oldTo || a > PV.oldTo) return null; for (var d = day0(a), z = b < PV.oldTo ? b : PV.oldTo; d <= z; d = addD(d, 1)) { var x = PV.od[key(d)]; if (x) { n += x.n; s += x.sum } } return { n: n, sum: s } };
    var oldBuyers = function (a, b) { var k2 = 'ob' + key(a) + key(b), sk = statKey(); if (C[k2]) return C[k2]; if (!sk || !odSum(a, b) || !odSum(a, b).n) return Promise.resolve(0);
      return C[k2] = fetch(API + '/fin/old?k=' + encodeURIComponent(sk) + '&from=' + key(a) + '&to=' + key(b)).then(function (r) { return r.json() }).then(function (j) { return j && j.ok ? j.buyers : 0 }).catch(function () { return 0 }) };
    var dealTot = function (a, b, noBuyers) { var o = odSum(a, b); if (!o || !o.n) return dealTotGC(a, b);
      /* старый аккаунт добавляется к новому: в результате храним расшифровку (gc — новый, old — старый), покупатели — простая сумма, возможны повторы */
      return Promise.all([dealTotGC(a, b), noBuyers ? 0 : oldBuyers(a, b)]).then(function (r) { var t = r[0], n = t.n + o.n, sm = t.sum + o.sum; return { n: n, sum: sm, avg: n ? sm / n : 0, buyers: t.buyers + r[1], earned: t.earned, old: { n: o.n, sum: o.sum, buyers: r[1] }, gc: t } }) };
    var dealTotGC = function (a, b) { var k = 't' + key(a) + key(b); if (C[k]) return C[k]; var fd = csrf(new URLSearchParams({ rule_string: payRule(a, b), locationId: '0' }));
      /* прошлые периоды не меняются — кэш вкладки на 30 мин, с сегодняшним днём — на 3 мин */
      var hit = ssGet('fssT' + k, key(b) < key(today) ? 18e5 : 18e4); if (hit) return C[k] = Promise.resolve(hit);
      return C[k] = fetch('/pl/sales/dealstat/chartdata', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(function (r) { return r.json() }).then(function (j) { var t = {};
        [].forEach.call(html(j.tableHtml).querySelectorAll('tr'), function (tr) { var c = tr.querySelectorAll('td'); if (c.length < 4) return; var l = c[0].textContent.trim();
          var k2 = /оплачено/i.test(l) ? 'paid' : /Купило/i.test(l) ? 'buyers' : /предоплат/i.test(l) ? 'prepay' : /Заработано/i.test(l) ? 'earned' : null; if (k2) t[k2] = { n: money(c[1].textContent), sum: money(c[3].textContent) } });
        var n = (t.paid || {}).n || 0, s = (t.paid || {}).sum || 0, res = { n: n, sum: s, avg: n ? s / n : 0, buyers: (t.buyers || {}).n || 0, earned: (t.earned || {}).sum || 0 }; ssSet('fssT' + k, res); return res }).catch(function (e) { delete C[k]; throw e }) };
    /* список заказов по дате оплаты (для тарифов, продаж по дням, клиентов) */
    var parseWhen = function (s) { s = String(s || '').toLowerCase(); var now = nowM(), d = null, tm = s.match(/(\d{1,2}):(\d{2})/), m;
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
    /* заказы кэшируем по дням (sessionStorage): прошлые дни — 6 ч, последние 3 дня — 10 мин и до ближайшего автообновления.
       Запрашиваем у GetCourse только дни, которых нет в кэше (одним диапазоном) */
    var DCK = 'fssDeals1', DC = null;
    var dcLoad = function () { if (DC) return DC; try { DC = JSON.parse(sessionStorage.getItem(DCK) || 'null') } catch (e) {} if (!DC || DC.v !== 1) DC = { v: 1, d: {}, cov: [], stale: 0 }; return DC };
    var dcSave = function () { try { sessionStorage.setItem(DCK, JSON.stringify(DC)) } catch (e) { try { sessionStorage.removeItem(DCK) } catch (e2) {} } };
    var dcStale = function () { dcLoad().stale = Date.now(); dcSave() };
    var dcHas = function (dk) { var D = dcLoad(), recent = dk >= key(addD(today, -2)), now = Date.now();
      return D.cov.some(function (c) { return c[0] <= dk && dk <= c[1] && (recent ? now - c[2] < 6e5 && c[2] > D.stale : now - c[2] < 216e5) }) };
    var dcRow = function (x) { return [x.id, x.uid, x.client, x.title, x.cost, x.when ? x.when.getTime() : 0] };
    var dcObj = function (r) { return { id: r[0], uid: r[1], client: r[2], title: r[3], cost: r[4], when: r[5] ? new Date(r[5]) : null } };
    var fetchDeals = function (a, b, prog) { var r = payRule(a, b);
      return getPage(r, 1).then(function (doc) { var first = rowsOf(doc), sm = ((doc.querySelector('.summary') || {}).textContent || '').replace(/[\s\u00a0]/g, ''), mm = sm.match(/из(\d+)/);
        var need = Math.ceil((mm ? +mm[1] : first.length) / Math.max(first.length, 1)), pages = Math.min(400, need), out = first.slice(), next = 2, done = 1;
        var worker = function () { if (next > pages) return Promise.resolve(); var p = next++; return getPage(r, p).then(function (d) { out = out.concat(rowsOf(d)); done++; if (prog) prog(done, pages); return worker() }) };
        var ws = []; for (var i = 0; i < 6; i++) ws.push(worker());
        return Promise.all(ws).then(function () { var seen = {}, res = out.filter(function (x) { if (seen[x.id] || !(x.cost > 0)) return false; seen[x.id] = 1; return true }); res.trunc = need > 400; return res }) }) };
    var deals = function (a, b, prog) { var k = 'd' + key(a) + key(b); if (C[k]) return C[k]; var D = dcLoad(), miss = [];
      for (var d = day0(a); d <= b; d = addD(d, 1)) { var dk = key(d); if (!dcHas(dk)) miss.push(dk) }
      var pick = function () { var out = [], seen = {}; for (var d = day0(a); d <= b; d = addD(d, 1)) (D.d[key(d)] || []).forEach(function (r) { if (!seen[r[0]]) { seen[r[0]] = 1; out.push(dcObj(r)) } }); out.trunc = !!C.trunc; return out };
      if (!miss.length) return C[k] = Promise.resolve(pick());
      var m0 = new Date(miss[0] + 'T00:00'), m1 = new Date(miss[miss.length - 1] + 'T00:00');
      return C[k] = fetchDeals(m0, m1, prog).then(function (list) {
        if (list.trunc) { C.trunc = true; var o = list.filter(function (x) { return x.when && x.when >= day0(a) && x.when < addD(b, 1) }); o.trunc = true; return o }
        for (var d = new Date(m0); d <= m1; d = addD(d, 1)) delete D.d[key(d)];
        list.forEach(function (x) { var dk = x.when ? key(day0(x.when)) : miss[0]; (D.d[dk] = D.d[dk] || []).push(dcRow(x)) });
        var c = [miss[0], miss[miss.length - 1], Date.now()]; D.cov = D.cov.filter(function (z) { return !(z[0] >= c[0] && z[1] <= c[1]) }).concat([c]); dcSave(); return pick() }).catch(function (e) { delete C[k]; throw e }) };
    var indexTable = function () { if (C.idx) return C.idx; var fd = csrf(new URLSearchParams({ rule_string: '', locationId: '0' }));
      return C.idx = fetch('/pl/sales/dealstat/indexdata', { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(function (r) { return r.json() }).then(function (j) { var rows = [];
        [].forEach.call(html(j.tableHtml).querySelectorAll('tr[class*="field-"]'), function (tr) { var td = tr.querySelectorAll('td'); rows.push({ k: (tr.className.match(/field-(\w+)/) || [])[1], label: td[0].textContent.trim(), v: [].slice.call(td, 1).map(function (x) { return money(x.textContent) }) }) }); return rows }) };
    var structure = function () { if (C.st) return C.st; var hit = ssGet('fssSt', 36e5); if (hit) return C.st = Promise.resolve(hit);
      return C.st = fetch('/pl/crm/stat/revenue-structure', { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) { var d = html(t), g = [];
      var ch = d.querySelector('.gc-users-base-save-growth-dynamics--chart'); if (ch) { var nums = ch.querySelectorAll('p.number'), ms = ch.querySelectorAll('p.month'); for (var i = 0; i < nums.length; i++) g.push({ n: money(nums[i].textContent), m: (ms[i] ? ms[i].textContent : '').replace(/\s+/g, ' ').replace(/\s*'\d+/, '').trim() }) }
      var pc = d.querySelector('.gc-users-base-save-growth-dynamics--percent'), win = d.querySelector('.gc-users-base-save-proceeds-windows'), periods = [];
      if (win) [].forEach.call(win.children, function (w) { var it = [].map.call(w.querySelectorAll('h4'), function (h) { var box = h.parentElement; return { t: h.textContent.trim(), p: money((box.querySelector('.percent') || {}).textContent), s: ((box.querySelector('.sum') || {}).textContent || '').trim() } }); if (it.length) periods.push(it) });
      var res = { growth: g, pct: pc ? ((pc.querySelector('strong') || {}).textContent || '').trim() : '', add: pc ? ((pc.querySelector('p.number') || {}).textContent || '').trim() : '', periods: periods }; if (g.length || periods.length) ssSet('fssSt', res); return res }) };

    /* ---------- период и честное сравнение (как в банке) ---------- */
    var period = function (k) { var t = today, y = t.getFullYear(), mo = t.getMonth(), m;
      /* «Сегодня» сравниваем со вчера до того же часа (hour) — см. renderSales */
      if (k === 'today') return { a: t, b: t, pa: addD(t, -1), pb: addD(t, -1), name: 'Сегодня', hour: 1 };
      if (k === 'week') { var wa = addD(t, -((t.getDay() + 6) % 7)); return { a: wa, b: t, pa: addD(wa, -7), pb: addD(t, -7), name: 'Эта неделя' } }
      if (k === 'q' || k === 'pq') { var q0 = new Date(y, mo - mo % 3, 1); if (k === 'pq') { var pq0 = new Date(q0.getFullYear(), q0.getMonth() - 3, 1); return { a: pq0, b: addD(q0, -1), pa: new Date(pq0.getFullYear(), pq0.getMonth() - 3, 1), pb: addD(pq0, -1), name: 'Прошлый квартал' } }
        var pqa = new Date(y, q0.getMonth() - 3, 1), off = ndays(q0, t) - 1, pqb = addD(pqa, off); if (pqb >= q0) pqb = addD(q0, -1); return { a: q0, b: t, pa: pqa, pb: pqb, name: 'Этот квартал' } }
      if (k === 'yest') return { a: addD(t, -1), b: addD(t, -1), pa: addD(t, -2), pb: addD(t, -2), name: 'Вчера' };
      if ((m = k.match(/^d(\d+)$/))) { var n = +m[1], a = addD(t, -n + 1); return { a: a, b: t, pa: addD(a, -n), pb: addD(a, -1), name: 'Последние ' + n + ' ' + pl(n, ['день', 'дня', 'дней']) } }
      if (k === 'month') { var ms = new Date(y, mo, 1), pms = new Date(y, mo - 1, 1), pend = new Date(y, mo, 0); return { a: ms, b: t, pa: pms, pb: new Date(y, mo - 1, Math.min(t.getDate(), pend.getDate())), name: 'Этот месяц' } }
      if ((m = k.match(/^m(\d{4})-(\d{1,2})$/))) { var Y = +m[1], M = +m[2]; return { a: new Date(Y, M, 1), b: new Date(Y, M + 1, 0) > t ? t : new Date(Y, M + 1, 0), pa: new Date(Y, M - 1, 1), pb: new Date(Y, M, 0), name: cap(MONN[M]) + ' ' + Y } }
      if ((m = k.match(/^y(\d{4})$/))) { var YY = +m[1], ye = new Date(YY, 11, 31); return { a: new Date(YY, 0, 1), b: ye > t ? t : ye, pa: new Date(YY - 1, 0, 1), pb: ye > t ? new Date(YY - 1, mo, t.getDate()) : new Date(YY - 1, 11, 31), name: YY + ' год' } }
      if (k === 'year') return { a: new Date(y, 0, 1), b: t, pa: new Date(y - 1, 0, 1), pb: new Date(y - 1, mo, t.getDate()), name: 'Этот год' };
      if (k === 'all') return { a: null, b: t, pa: null, pb: null, name: 'Всё время' };
      /* свой период: конец не позже сегодня; целый месяц/год (в т.ч. текущий до сегодня) сравниваем как пункты меню */
      if ((m = k.match(/^c(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/))) { var A = new Date(m[1] + 'T00:00'), B = new Date(m[2] + 'T00:00'), B0 = B; if (B > t) B = t; if (A > B) A = B;
        var lastM = new Date(A.getFullYear(), A.getMonth() + 1, 0), lastY = new Date(A.getFullYear(), 11, 31), z;
        if (A.getDate() === 1 && A.getMonth() === B.getMonth() && A.getFullYear() === B.getFullYear() && (key(B) === key(lastM) || (key(B) === key(t) && B0 >= lastM))) { z = period(A.getFullYear() === y && A.getMonth() === mo ? 'month' : 'm' + A.getFullYear() + '-' + A.getMonth()); z.name = 'Свой период'; return z }
        if (A.getDate() === 1 && A.getMonth() === 0 && A.getFullYear() === B.getFullYear() && (key(B) === key(lastY) || (key(B) === key(t) && B0 >= lastY))) { z = period(A.getFullYear() === y ? 'year' : 'y' + A.getFullYear()); z.name = 'Свой период'; return z }
        var L = ndays(A, B); return { a: A, b: B, pa: addD(A, -L), pb: addD(A, -1), name: 'Свой период', cut: B0 > B } }
      return period('month') };
    var S = { k: 'month', gran: null, metric: 'rev', money: 'net' };
    try { var sk = sessionStorage.getItem('fssP'); if (sk) S.k = sk } catch (e) {}
    /* если прошлый период начинается раньше первых данных — сравнение не показываем (иначе рост завышен) */
    var P = function () { var p = period(S.k), f = C.payV && C.payV.first; if (!p.a) p.a = f || new Date(2020, 0, 1); if (p.pa && f && p.pa < day0(f)) { p.pa = p.pb = null; p.noCmp = 1 }
      /* один сегодняшний день («Эта неделя» в понедельник, «Этот месяц» 1-го) — тоже сравнение до того же часа */
      if (p.pa && key(p.a) === key(today) && key(p.b) === key(today) && key(p.pa) === key(p.pb)) p.hour = 1; return p };

    /* ---------- ряды для графика ---------- */
    var dayKeys = function (a, b) { var o = []; for (var d = day0(a); d <= b; d = addD(d, 1)) o.push(new Date(d)); return o };
    var bucket = function (days, gran) { if (gran === 'day') return days.map(function (d) { return [d] });
      var out = [], cur = null, kk = null; days.forEach(function (d, i) { var g = gran === 'week' ? Math.floor(i / 7) : d.getFullYear() * 12 + d.getMonth(); if (g !== kk) { cur = []; out.push(cur); kk = g } cur.push(d) }); return out };
    var lbl = function (b, gran, axis) { var a = b[0], z = b[b.length - 1];
      if (gran === 'day') return axis ? a.getDate() + (a.getDate() === 1 || b === null ? ' ' + MONS3[a.getMonth()] : '') : WD[a.getDay()] + ', ' + a.getDate() + ' ' + MONS[a.getMonth()];
      if (gran === 'week') return axis ? a.getDate() + ' ' + MONS3[a.getMonth()] : human(a, z, true);
      return axis ? MONA[a.getMonth()] + (a.getMonth() === 0 || axis === 2 ? ' ' + a.getFullYear() : '') : cap(MONN[a.getMonth()]) + ' ' + a.getFullYear() };
    var autoGran = function (n) { return n <= 45 ? 'day' : n <= 200 ? 'week' : 'month' };
    var grans = function (n) { return [['day', 'Дни', n <= 400], ['week', 'Недели', n >= 14], ['month', 'Месяцы', n >= 45]] };

    /* ---------- график: линия + пунктир прошлого периода, наведение ---------- */
    var line = function (el, cur, prev, o) { o = o || {}; var W = Math.max(320, el.clientWidth || 800), H = o.h || 280, L = 64, R = 12, B = 30, T = 14, n = cur.length;
      var mx = 0, mn = 0; cur.concat(prev || []).forEach(function (p) { if (p && p.v > mx) mx = p.v; if (p && p.v < mn) mn = p.v });
      var nice = function (v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p, st = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]; for (var i = 0; i < st.length; i++) if (f <= st[i]) return st[i] * p; return 10 * p };
      /* возвраты (минус) не уходят под ось: шкала от min до max */
      var nG = 4; if (mn < 0) { var u = nice((mx - mn) / 4); mn = -Math.ceil(-mn / u - 1e-9) * u; mx = Math.ceil(mx / u - 1e-9) * u; nG = Math.max(1, Math.round((mx - mn) / u)) } else { mx = nice(mx); if (o.int) mx = Math.max(4, Math.ceil(mx / 4) * 4) }
      var X = function (i) { return n <= 1 ? L + (W - L - R) / 2 : L + (W - L - R) * i / (n - 1) }, Y = function (v) { return T + (H - T - B) * (1 - ((v || 0) - mn) / ((mx - mn) || 1)) };
      var fmt = o.fmt || SHORT, g = '';
      for (var i = 0; i <= nG; i++) { var gv = mn + (mx - mn) * i / nG, y = Y(gv); g += '<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 10) + '" y="' + (y + 4) + '" text-anchor="end">' + fmt(gv) + '</text>' }
      /* подписи оси X: без наложения; o.sparse — подписываются только точки с ax (смена месяца/года) */
      var step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L) / 64)))), lx = -1e9;
      cur.forEach(function (p, i) { if (!p.ax || !(o.sparse || i % step === 0 || n < 14)) return; var xx = X(i); if (xx - lx < (o.sparse ? 56 : 30)) return; lx = xx; g += '<text x="' + xx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(p.ax) + '</text>' });
      var path = function (arr) { var d = ''; arr.forEach(function (p, i) { if (!p) return; d += (d ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.v).toFixed(1) }); return d };
      if (prev && prev.length) g += '<path class="pv" d="' + path(prev.slice(0, Math.max(n, 1))) + '"/>';
      var dc = path(cur), y0 = Y(Math.max(0, mn)); if (n > 1) g += '<path class="ar" d="' + dc + 'L' + X(n - 1) + ' ' + y0 + 'L' + X(0) + ' ' + y0 + 'Z"/>';
      g += '<path class="cu" d="' + dc + '"/>';
      if (n <= 40) cur.forEach(function (p, i) { g += '<circle class="dt" cx="' + X(i) + '" cy="' + Y(p.v) + '" r="3"/>' });
      g += '<line class="xh" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '"/><circle class="hp" r="5"/><circle class="hq" r="4"/>';
      el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '">' + g + '<rect class="ov" x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '" fill="transparent"/></svg><div class="fss-tip"></div>';
      var svg = el.querySelector('svg'), tip = el.querySelector('.fss-tip'), xh = svg.querySelector('.xh'), hp = svg.querySelector('.hp'), hq = svg.querySelector('.hq'), ov = svg.querySelector('.ov');
      var move = function (e) { var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, i = n <= 1 ? 0 : Math.round((x - L) / ((W - L - R) / (n - 1))); i = Math.max(0, Math.min(n - 1, i)); var p = cur[i], q = prev && prev[i];
        xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); hp.setAttribute('cx', X(i)); hp.setAttribute('cy', Y(p.v)); if (q) { hq.setAttribute('cx', X(i)); hq.setAttribute('cy', Y(q.v)) } svg.classList.add('on'); svg.classList.toggle('noq', !q);
        tip.innerHTML = '<div class="r"><i class="c"></i><span>' + esc(p.t) + '</span><b>' + (o.tf || RUB)(p.v) + '</b></div>' + (p.x ? '<div class="x">' + esc(p.x) + '</div>' : '') + (q ? '<div class="r"><i class="p"></i><span>' + esc(q.t) + '</span><b>' + (o.tf || RUB)(q.v) + '</b></div>' : '');
        var px = X(i) / W * r.width; tip.style.left = Math.min(Math.max(px, 120), r.width - 120) + 'px'; tip.style.opacity = 1 };
      /* мышь, палец и перо: pointer-события; на касании подсказка остаётся до следующего касания */
      var hide = function () { svg.classList.remove('on'); tip.style.opacity = 0 };
      ov.style.touchAction = 'pan-y'; ov.addEventListener('pointermove', move); ov.addEventListener('pointerdown', move); ov.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch') hide() });
      if (!window.PointerEvent) { ov.addEventListener('mousemove', move); ov.addEventListener('mouseleave', hide) } };

    /* ---------- стили (токены «фиолетового стиля» и кабинета) ---------- */
    var CSS = ':root.fss-on .fss-host>*:not(.fss){display:none!important}'
      + '.fss{--s0:#0c0c0c;--s1:#161616;--s2:#1f1f1f;--ink2:rgba(255,255,255,.55);--ink3:rgba(255,255,255,.55);--hair:rgba(255,255,255,.08);--acc:#d77fff;--lil:#c38bff;color:#fff;font-family:"Inter Tight",Inter,system-ui,sans-serif;font-feature-settings:"tnum";padding:0 0 64px}.fss *{box-sizing:border-box}'
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
      + '.fss-lead b.up{color:#4ade80;font-weight:500}.fss-lead b.dn{color:#ff6b6b;font-weight:500}.fss-dl.up b{color:#4ade80!important}.fss-dl.dn b{color:#ff6b6b!important}.fss-ln .dn{color:#ff6b6b}'
      + '.fss-note{display:flex!important;align-items:center;gap:14px;flex-wrap:wrap;margin:0 0 16px!important;padding:16px 20px!important;border-radius:18px!important}.fss-note>svg{width:28px;height:28px;color:#c38bff;flex:none}.fss-note>div{flex:1;min-width:240px}.fss-note b{display:block;color:#fff;font-size:15px;font-weight:600}.fss-note span{color:rgba(255,255,255,.6);font-size:13px}.fss-note input{width:260px;height:40px;background:#0c0c0c;border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:12px;padding:0 12px;font:inherit}'
      + '.fss-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px}@media(max-width:1000px){.fss-kpis{grid-template-columns:repeat(2,1fr)}}'
      + '.fss-k{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:0;text-align:left;background:var(--s1);border:1px solid var(--hair);border-radius:22px;padding:20px 22px 18px;color:#fff;font:inherit;min-width:0;transition:border-color .15s,background .15s}'
      + '.fss-k.can{cursor:pointer}.fss-k.can:hover{border-color:rgba(255,255,255,.16)}.fss-k.on{border-color:rgba(195,139,255,.6);background:linear-gradient(160deg,rgba(150,87,232,.16),rgba(22,22,22,0) 60%),var(--s1)}'
      + '.fss-kh{display:flex;align-items:center;gap:10px;width:100%}.fss-ic{width:36px;height:36px;border-radius:11px;background:#242424;display:grid;place-items:center;color:#c38bff;flex:none}.fss-ic svg{width:19px;height:19px}.fss-k.on .fss-ic{background:#c38bff;color:#1a0b2e}'
      + '.fss-kl{color:var(--ink2);font-size:14px;flex:1}.fss-kv2{display:block;font-size:34px;font-weight:500;letter-spacing:-.02em;margin:16px 0 6px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}'
      + '.fss-flow{background:var(--s1);border:1px solid var(--hair);border-radius:22px;padding:18px 22px;margin-bottom:16px}.fss-flowbar{display:flex;height:10px;border-radius:6px;overflow:hidden;gap:2px;background:rgba(255,255,255,.04)}.fss-flowbar i{background:linear-gradient(90deg,#6724ad,#c38bff)}.fss-flowbar s{background:#ff6b6b;opacity:.75}'
      + '.fss-flowt{display:flex;flex-wrap:wrap;gap:8px 28px;margin-top:12px;font-size:13px;color:var(--ink2)}.fss-flowt b{color:#fff;font-weight:600;margin-left:4px}.fss-flowt .f b{color:#ff6b6b}.fss-flowt .n b{color:#d7b6ff}.fss-flowt .g{margin-left:auto}.fss-q{display:inline-grid;place-items:center;width:16px;height:16px;border-radius:50%;border:1px solid rgba(255,255,255,.3);font-size:10px;font-style:normal;margin-left:6px;cursor:help;vertical-align:1px}'
      + '.fss-sec{display:flex;align-items:center;gap:10px}.fss-hi{width:20px;height:20px;color:#c38bff;flex:none}.fss-tag{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:3px 8px;margin-left:4px}'
      + '.fss-plan{margin:0 0 16px!important}.fss-planr{display:flex;align-items:center;gap:12px}.fss-planr b{font-size:40px;font-weight:500;letter-spacing:-.02em}.fss-planr span{color:var(--ink2);font-size:13px;max-width:90px;line-height:1.25}.fss-pe{width:40px;padding:0;justify-content:center}'
      + '.fss-pbar{position:relative;height:14px;border-radius:8px;background:rgba(255,255,255,.06);margin:22px 0 8px}.fss-pbar .got{position:absolute;left:0;top:0;bottom:0;border-radius:8px;background:linear-gradient(90deg,#6724ad,#9657e8 60%,#c38bff)}.fss-pbar .fc{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(135deg,rgba(195,139,255,.35) 0 6px,rgba(195,139,255,.12) 6px 12px);border-radius:0 8px 8px 0}'
      + '.fss-pbar s{position:absolute;top:-5px;bottom:-5px;width:2px;margin-left:-1px;background:rgba(255,255,255,.45);border-radius:2px}.fss-pbar s.ok{background:#4ade80}.fss-plabs{position:relative;height:20px;font-size:12px;color:var(--ink3)}.fss-plabs span{position:absolute;transform:translateX(-50%);white-space:nowrap}.fss-plabs span:last-child{transform:translateX(-100%)}.fss-plabs span.ok{color:#4ade80}'
      + '.fss-pnote{margin-top:14px;color:var(--ink2);font-size:14px;line-height:1.45}.fss-pnote b{color:#fff;font-weight:600}.fss-pform{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:16px;padding-top:16px;border-top:1px solid var(--hair)}.fss-pform label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--ink2)}.fss-pform input{width:150px;height:40px;background:#0c0c0c;border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:12px;padding:0 12px;font:inherit}'
      + '.fss-row2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0;align-items:stretch}.fss-row2>.fss-card{margin:0!important}.fss-row>.fss-card{margin-top:0!important}@media(max-width:1100px){.fss-row2{grid-template-columns:1fr}}'
      + '.fss-dwrap{display:flex;gap:24px;align-items:flex-start}@media(max-width:700px){.fss-dwrap{flex-direction:column}}.fss-dn{width:168px;height:168px;flex:none}.fss-dn circle[data-i]{transition:opacity .15s,stroke-width .15s}.hl .fss-dn circle[data-i]{opacity:.25}.hl .fss-dn circle.on{opacity:1;stroke-width:20}.fss-dn .c1{fill:#fff;font-size:20px;font-weight:600;font-family:inherit}.fss-dn .c2{fill:rgba(255,255,255,.5);font-size:11px;font-family:inherit}'
      + '.fss-lg2{flex:1;min-width:0;display:flex;flex-direction:column}.fss-lr{border-top:1px solid var(--hair);transition:opacity .15s}.hl .fss-lr[data-i]:not(.on){opacity:.45}.fss-lr:first-child{border-top:0}.fss-lh{display:grid;grid-template-columns:12px 1fr auto auto 40px 16px;align-items:center;gap:10px;width:100%;padding:11px 0;background:none;border:0;color:#fff;font:inherit;font-size:14px;text-align:left;cursor:pointer}.fss-lh.st{grid-template-columns:12px 1fr auto auto 40px;cursor:default;padding-bottom:2px}'
      + '.fss-lh.nx{cursor:default}.fss-lh.nx .ch{visibility:hidden}.fss-t th.l,.fss-t td.l{text-align:left}.fss-lh>i{width:12px;height:12px;border-radius:4px}.fss-lh .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fss-lh .ct{color:var(--ink3);font-size:13px}.fss-lh b{font-weight:600;white-space:nowrap}.fss-lh em{font-style:normal;color:var(--ink3);font-size:12px;text-align:right}.fss-lh .ch{width:16px;height:16px;color:var(--ink3);transition:transform .2s}.fss-lr.open .ch{transform:rotate(180deg)}'
      + '.fss-lt{display:none;padding:0 0 10px 22px}.fss-lr.open .fss-lt{display:block}.fss-lt>div{display:grid;grid-template-columns:1fr auto auto;gap:10px;padding:6px 0;font-size:13px;color:var(--ink2)}.fss-lt b{color:#fff;font-weight:500;min-width:90px;text-align:right}.fss-lt small{color:#ff9f6b;font-size:11px;margin-left:6px}.fss-ln{padding:0 0 11px 22px;font-size:12px;color:var(--ink3)}'
      + '.fss-upd.ld svg{animation:fssr .8s linear infinite}.fss-upd span{color:rgba(255,255,255,.8)}.fss-mt2{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;color:var(--ink2);font-size:13px}.fss-mt2 i{width:8px;height:8px;border-radius:3px}.fss-more{margin-top:14px}'
      /* ---- v42-STAT: адаптив, пустые состояния, контраст ---- */
      + ':root body .fss .fss-t a{color:#fff!important;text-decoration:none!important}:root body .fss .fss-t a:hover{color:var(--acc)!important}'
      + '.fss-dl2{display:block;font-size:12px;color:var(--ink2);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}.fss-flowt .g small{display:block;font-size:12px;color:var(--ink2);margin-top:2px;text-align:right}'
      + '.fss-err{flex-basis:100%;color:#ff6b6b;font-size:13px}.fss-warn{margin:0 0 16px;padding:12px 16px;border-radius:14px;background:rgba(255,107,107,.08);border:1px solid rgba(255,107,107,.25);color:#ffd0d0;font-size:13px}'
      + '.fss-mg{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;padding:0 2px 4px}.fss-menu .fss-mg button{justify-content:center;padding:9px 4px;font-size:13px}.fss-menu .yl{padding:6px 12px 2px;color:var(--ink2);font-size:12px}.fss-menu .fss-cus .fss-btn{background:rgba(255,255,255,.11);justify-content:center}.fss-menu .fss-cus .fss-btn:hover{background:rgba(255,255,255,.16)}'
      + '.fss-k .fss-dl{max-width:100%}.fss-k{container-type:inline-size}.fss-kv2{font-size:30px;font-size:clamp(22px,15cqi,34px);overflow:visible;text-overflow:clip}'
      + '@media(max-width:1100px){.fss-kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:479px){.fss-kpis{gap:10px}.fss-k:first-child,.fss-k:last-child{grid-column:1/-1}.fss-k{padding:16px}.fss-kv2{margin:10px 0 4px}.fss-k:first-child .fss-kv2{font-size:32px}.fss-kh{gap:8px}.fss-ic{width:32px;height:32px}}'
      + '@media(max-width:1399px){.fss-lh{grid-template-columns:12px auto 1fr 40px 16px;grid-template-areas:"d n n n h" ". c b e .";row-gap:4px;align-items:start}.fss-lh.st{grid-template-columns:12px auto 1fr 40px}.fss-lh.st{grid-template-areas:"d n n n" ". c b e"}'
      + '.fss-lh>i{grid-area:d;margin-top:3px}.fss-lh .nm{grid-area:n;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3}.fss-lh .ct{grid-area:c}.fss-lh b{grid-area:b;justify-self:end}.fss-lh em{grid-area:e}.fss-lh .ch{grid-area:h}}'
      + '.fss-plan{container-type:inline-size}.fss-plabs2{display:none;font-size:13px;color:var(--ink2);margin-top:4px}.fss-plabs2 .ok{color:#4ade80}@container (max-width:620px){.fss-plabs{display:none}.fss-plabs2{display:block}}'
      + '.fss-pform .fss-pmsg{flex-basis:100%;font-size:13px;color:var(--ink2)}.fss-pform .fss-pmsg.e{color:#ff6b6b}'
      + '.fss-tabs{scrollbar-width:none}.fss-tabs::-webkit-scrollbar{display:none}'
      + '@media(max-width:1023px){.fss-upd span,.fss-gcv span{display:none}:root body .fss .fss-hd .fss-upd,:root body .fss .fss-hd .fss-gcv{width:44px;padding:0;justify-content:center}}'
      + '@media(max-width:767px){:root body .fss .fss-hd{flex-direction:column;align-items:stretch!important;gap:14px;padding:20px 0 16px!important;margin:0 0 16px!important}:root body .fss .fss-hd h1{font-size:34px!important}'
      + ':root body .fss .fss-acts{gap:8px}.fss-per{flex:1 1 100%}.fss-per>.fss-btn{width:100%}.fss-per>.fss-btn .ch{margin-left:auto}.fss-img{flex:1}.fss-img .lg{display:none}'
      + '.fss-tabs{flex-wrap:nowrap;overflow-x:auto;margin:0 0 20px}.fss-tabs button{flex:none;height:44px}.fss-lead{font-size:21px;margin-bottom:18px}'
      + '.fss-menu{position:fixed;left:16px;right:16px;bottom:16px;top:auto;width:auto;max-height:75vh;z-index:100000}.fss-menu button{min-height:44px}.fss-seg button{height:36px}}'
      + '.fss-modal{position:fixed;inset:0;background:rgba(0,1,6,.86);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px}.fss-mw{display:flex;flex-direction:column;align-items:center;gap:16px;max-height:100%}.fss-mw img{max-height:calc(100vh - 120px);max-width:100%;border-radius:22px;border:1px solid rgba(255,255,255,.08)}.fss-mb{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}';

    var root, body;
    var loading = function (t) { body.innerHTML = '<div class="fss-load">' + (t || 'Загружаю данные GetCourse…') + '</div>' };
    var fail = function () { body.innerHTML = '<div class="fss-empty">GetCourse не отдал данные. Обнови страницу или открой <a href="/pl/sales/dealstat?fs=gc" style="color:#d77fff">классический вид</a>.</div>' };
    var cmpName = function (p) { return p.pa ? human(p.pa, p.pb) : '' };

    /* ---------- вкладка «Продажи» ---------- */
    var MODES = { net: { l: 'На вывод', s: 'после комиссий GetCourse и\u00a0банков', lead: ' на\u00a0вывод пришло ' }, gross: { l: 'Оплачено клиентами', s: 'до\u00a0комиссий', lead: ' клиенты заплатили ' }, gc: { l: 'Сумма оплат GetCourse', s: 'как в\u00a0стандартной статистике', lead: ' по\u00a0GetCourse оплачено на ' } };
    var shareP = function (v, tot) { if (!tot) return '—'; var q = v / tot * 100; return q > 0 && q < 1 ? '<1%' : Math.round(q) + '%' };
    /* ---------- продукты, тарифы, способы оплаты ---------- */
    var PAL = ['#8f6af0', '#d95926', '#199e70', '#c98500', '#d55181', '#3987e5'], OTHER = '#4a4a4a', UP = '#4ade80', DN = '#ff6b6b';
    /* «Продукт - Тариф» или «Продукт | Тариф»; прямые кавычки → «ёлочки» */
    var splitTitle = function (t) { t = String(t || '').trim().replace(/"([^"]*)"/g, '«$1»').replace(/"/g, ''); var inst = /\(в\s*рассрочку\)/i.test(t), c = t.replace(/\s*\(в\s*рассрочку\)\s*/ig, ' ').replace(/\s+/g, ' ').trim(), i = c.lastIndexOf(' - '), sl = 3;
      if (i <= 0) { i = c.indexOf(' | '); sl = 3 }
      return i > 0 ? { prod: c.slice(0, i).trim(), tar: c.slice(i + sl).trim(), inst: inst } : { prod: c || 'Без названия', tar: '', inst: inst } };
    var METHODS = [['card', 'Картой и СБП', '#8f6af0'], ['inst', 'Рассрочка и кредит', '#d95926'], ['direct', 'Другие сервисы (Appex, Продамус, РР)', '#199e70']];
    var methodOf = function (x) { if (!/геткурс|getcourse/i.test(x.type || 'Геткурс')) return 'direct'; return x.sum && x.fee / x.sum > .06 ? 'inst' : 'card' };
    var shortProd = function (t) { return String(t).replace(/\s+с\s+0\s+до\s+PRO\b\s*/i, ' ').replace(/\s+/g, ' ').trim() };
    var groupProducts = function (items, lim) { lim = lim || 6; var m = {}; items.forEach(function (x) { var s = splitTitle(x.title), nm = shortProd(s.prod) + (s.tar ? ' · ' + s.tar : ''), g = m[nm] = m[nm] || { name: nm, prod: s.prod, tar: s.tar, n: 0, v: 0, inst: 0, tars: [] }; g.n++; g.v += x.v; if (s.inst) g.inst++ });
      var arr = Object.keys(m).map(function (k) { return m[k] }).sort(function (a, b) { return b.v - a.v });
      if (arr.length > lim) { var rest = arr.slice(lim - 1), o = { name: 'Другое', n: 0, v: 0, inst: 0, tars: [], other: 1 }; rest.forEach(function (g) { o.n += g.n; o.v += g.v; o.tars.push({ name: g.name, n: g.n, v: g.v, inst: g.inst }) }); arr = arr.slice(0, lim - 1).concat([o]) }
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

    var hoverLinks = function (el) { var rows = el.querySelectorAll('.fss-lr[data-i]'), segs = el.querySelectorAll('.fss-dn circle[data-i]'), on = function (i) { el.classList.add('hl'); [].forEach.call(segs, function (s2) { s2.classList.toggle('on', s2.getAttribute('data-i') === i) }); [].forEach.call(rows, function (r) { r.classList.toggle('on', r.getAttribute('data-i') === i) }) }, off = function () { el.classList.remove('hl'); [].forEach.call(rows, function (r) { r.classList.remove('on') }) };
      [].forEach.call(rows, function (r) { r.onmouseenter = function () { on(r.getAttribute('data-i')) }; r.onmouseleave = off });
      [].forEach.call(segs, function (s2) { s2.style.cursor = 'pointer'; s2.onmouseenter = function () { on(s2.getAttribute('data-i')) }; s2.onmouseleave = off }) };
    var renderSales = function () { var tok = S.tok = Math.random(); loading();
      payments().then(function (PAY) { C.payV = PAY; updLabel(); if (tok !== S.tok) return; var p = P(), n = ndays(p.a, p.b);
        var g = S.gran && grans(n).some(function (x) { return x[0] === S.gran && x[2] }) ? S.gran : autoGran(n);
        var rc = paySum(PAY, p.a, p.b), rp = p.pa ? paySum(PAY, p.pa, p.pb) : null, cmp = cmpName(p);
        /* «Сегодня»: сравнение со вчера до того же часа по МСК. Деньги — по времени оплат из /fin; без ключа времени нет — честная подпись без красного */
        var hourMode = !!p.hour, nt = nowM(), hm = ('0' + nt.getHours()).slice(-2) + ':' + ('0' + nt.getMinutes()).slice(-2), hms = hm + ':' + ('0' + nt.getSeconds()).slice(-2), rpDay = rp;
        if (hourMode) rp = null;
        var dayW = !p.pa ? '' : key(p.pa) === key(addD(today, -1)) ? 'вчера' : p.pa.getDate() + ' ' + MONS[p.pa.getMonth()];
        var cmpChip = hourMode ? 'к тому же часу ' + (dayW === 'вчера' ? 'вчера' : p.pa.getDate() + ' ' + MONS3[p.pa.getMonth()]) : 'к ' + cmp, cmpLead = hourMode ? dayW + ' к\u00a0' + hm : 'за ' + cmp, cmpLeg = hourMode ? dayW + ' до ' + hm : cmp;
        var modes = PAY.gross ? ['gross', 'gc'] : ['net', 'gross', 'gc']; if (modes.indexOf(S.money) < 0) S.money = modes[0];
        var mk = p.a.getFullYear() + '-' + ('0' + (p.a.getMonth() + 1)).slice(-2), inMonth = !PAY.gross && mk >= '2026-04' && p.a.getMonth() === p.b.getMonth() && p.a.getFullYear() === p.b.getFullYear() && p.a.getDate() === 1 && n >= 1;
        var keyBad = PAY.gross && statKey() && C.finErr === 'auth';
        body.innerHTML = '<p class="fss-lead" id="fssLead"></p>'
          + (PAY.gross ? '<div class="fss-note">' + ico('wallet') + '<div><b>' + (keyBad ? 'Ключ доступа не подошёл' : 'Подключи чистые деньги «на вывод»') + '</b><span>Сейчас суммы до комиссий. Вставь ключ доступа один раз — браузер его запомнит.</span></div><input class="fss-key" type="password" autocomplete="off" spellcheck="false" placeholder="ключ доступа"><button type="button" class="fss-btn fss-keygo">Подключить</button><span class="fss-err" hidden></span></div>' : '')
          + '<div class="fss-warn" id="fssWarn" hidden>GetCourse отдал не все заказы (больше 400 страниц) — цифры по заказам за этот период неполные.</div>'
          + '<div class="fss-kpis" id="fssMT"></div>'
          + (PAY.gross ? '' : '<div class="fss-flow" id="fssFlow"></div>')
          + (inMonth ? '<div class="fss-card fss-plan" id="fssPlan"></div>' : '')
          + '<div class="fss-card"><div class="fss-ctl"><div><div class="fss-sec">' + ico('pie').replace('<svg', '<svg class="fss-hi"') + 'Динамика</div><div class="fss-leg"><span><i></i>' + esc(human(p.a, p.b)) + '</span>' + (p.pa ? '<span><i class="p"></i>' + esc(cmpLeg) + '</span>' : '') + '</div></div>'
          + '<div class="fss-seg" id="fssG">' + grans(n).map(function (x) { return '<button type="button" data-g="' + x[0] + '"' + (x[2] ? '' : ' disabled') + (x[0] === g ? ' class="on"' : '') + '>' + x[1] + '</button>' }).join('') + '</div></div><div class="fss-ch" id="fssC"></div></div>'
          + '<div class="fss-row2"><div class="fss-card"><div class="fss-sec">' + ico('bag').replace('<svg', '<svg class="fss-hi"') + 'Что продали</div><p class="fss-sub" id="fssProdSub">продукты и тарифы за период</p><div id="fssProd"><div class="fss-sk"></div><div class="fss-sk"></div><div class="fss-sk"></div></div></div>'
          + '<div class="fss-card"><div class="fss-sec">' + ico('card').replace('<svg', '<svg class="fss-hi"') + 'Как платили</div><p class="fss-sub">способы оплаты и сколько съела комиссия</p><div id="fssMeth"><div class="fss-sk"></div><div class="fss-sk"></div><div class="fss-sk"></div></div></div></div>'
          + '<div class="fss-card"><div class="fss-sec">' + ico('list').replace('<svg', '<svg class="fss-hi"') + 'Все оплаты за период</div><p class="fss-sub" id="fssAllSub">новые сверху</p><div id="fssAll"><div class="fss-sk"></div><div class="fss-sk"></div></div></div>';
        /* ключ: проверка формата, проверка на сервере до сохранения, понятная ошибка */
        var kg = body.querySelector('.fss-keygo'); if (kg) { var kin = body.querySelector('.fss-key'), ker = body.querySelector('.fss-err'), kerr = function (t) { ker.textContent = t; ker.hidden = !t; kg.disabled = false; kg.textContent = 'Подключить' };
          if (keyBad) kerr('Сервер не принял сохранённый ключ. Вставь ключ из ссылки доступа ещё раз.');
          kin.onkeydown = function (e) { if (e.key === 'Enter') kg.click() };
          kg.onclick = function () { var v = (kin.value || '').trim().toLowerCase(); if (!/^[0-9a-f]{16,64}$/.test(v)) { kerr('Ключ — это 16–64 символа: цифры и латинские буквы a–f.'); return } kerr(''); kg.disabled = true; kg.textContent = 'Проверяю…';
            fetch(API + '/fin?k=' + encodeURIComponent(v) + '&from=2000-01-01&to=2000-01-01').then(function (r) { if (r.status === 403) throw new Error('auth'); if (!r.ok) throw new Error('net'); return r.json() }).then(function (j) { if (!j || !j.ok) throw new Error('auth');
              try { localStorage.setItem('fsStatKey', v) } catch (e) {} keySync(); C = {}; S.money = 'net'; renderSales() }).catch(function (e) { kerr(e.message === 'auth' ? 'Ключ не подошёл — проверь, что он скопирован целиком.' : 'Сервер статистики не ответил. Попробуй ещё раз через минуту.') }) } }
        var st = { rc: rc, rp: rp, p: p, g: g, PAY: PAY, cur: null, prev: null, dl: null, dlp: null, fl: null, mk: mk, inMonth: inMonth, hour: hourMode, hm: hm, dayW: dayW, rpDay: rpDay, cmpChip: cmpChip, cmpLead: cmpLead, shown: 10 };
        S.view = st;
        var money = function (mode, which) { if (which === 'p') { if (mode === 'gc') return hourMode ? (st.prevH ? st.prevH.sum : null) : st.prev ? st.prev.sum : null; return rp ? (mode === 'net' ? rp.sum : rp.gross) : null }
          return mode === 'net' ? rc.sum : mode === 'gross' ? rc.gross : st.cur ? st.cur.sum : null };
        var lead = function () { var el = body.querySelector('#fssLead'); if (!el) return; var md = S.money, v = money(md), v0 = money(md, 'p'), t = st.cur, ol = t && t.old && md === 'gc';
          var tail = '';
          if (p.pa && v != null && v0 != null) tail = v0 ? 'Это ' + '<b class="' + (v >= v0 ? 'up' : 'dn') + '">' + pctLead(pct(v, v0)) + '</b>, чем ' + esc(cmpLead) + ' (' + RUB(v0) + ')' : (hourMode ? cap(dayW) + ' к\u00a0' + hm + ' оплат не было' : 'За ' + esc(cmp) + ' оплат не было');
          else if (hourMode && rpDay && md !== 'gc' && PAY.gross) tail = cap(dayW) + ' за весь день: ' + RUB(md === 'gross' ? rpDay.gross : rpDay.sum) + ' — время оплат видно после подключения ключа';
          else if (p.noCmp) tail = 'Сравнения нет: прошлый период начинается раньше первых данных';
          el.innerHTML = leadP(p) + (ol ? ' по GetCourse (оба аккаунта) оплачено на ' : MODES[md].lead) + '<em>' + (v == null ? '…' : RUB(v)) + '</em>' + (t ? ' и ' + (pl(t.n, [1, 2, 2]) === 1 ? 'закрыта' : 'закрыто') + ' <em>' + NUM(t.n) + '</em> ' + pl(t.n, ['продажа', 'продажи', 'продаж']) : '')
            + (tail ? '<br><span>' + tail + '</span>' : '') };
        var flow = function () { var el = body.querySelector('#fssFlow'); if (!el || !rc.gross) { if (el) el.style.display = 'none'; return } var fp = rc.fee / rc.gross * 100, t = st.cur, ol = t && t.old;
          el.innerHTML = '<div class="fss-flowbar"><i style="width:' + (100 - fp).toFixed(2) + '%"></i><s style="width:' + fp.toFixed(2) + '%"></s></div><div class="fss-flowt"><span>Клиенты заплатили <b>' + RUB(rc.gross) + '</b></span><span class="f">Комиссии GetCourse и банков <b>−' + RUB(rc.fee) + '</b> · ' + fp.toFixed(1).replace('.', ',') + '%</span><span class="n">На вывод <b>' + RUB(rc.sum) + '</b></span>'
            + '<span class="g">' + (ol ? 'В статистике GetCourse, оба аккаунта' : 'В статистике GetCourse') + ' <b>' + (t ? RUB(t.sum) : '…') + '</b><i class="fss-q" title="Оплачено клиентами — все принятые платежи, включая предоплаты и доплаты. На вывод — то же за вычетом комиссий GetCourse и банков. В статистике GetCourse — оплаты только по заказам, которые полностью оплачены в этом периоде.' + (ol ? ' За этот период сложены два аккаунта GetCourse: новый (с апреля 2026) ' + RUB(t.gc.sum) + ' и старый ' + RUB(t.old.sum) + '.' : '') + '">?</i>'
            + (ol ? '<small>новый ' + SHORT(t.gc.sum) + ' ₽ + старый ' + SHORT(t.old.sum) + ' ₽</small>' : '') + '</span></div>' };
        var metrics = function () { var t = st.cur, q = st.prev, md = S.money, v = money(md), v0 = money(md, 'p'), ol = t && t.old, tc = hourMode ? st.curH : t, qc = hourMode ? st.prevH : q;
          var dd2 = function (a, b) { return a != null && b != null && p.pa ? dchip(a, b, cmpChip) : '' };
          var vD = hourMode && !rp && rpDay && md !== 'gc' ? '<span class="fss-dl">' + dayW + ' за день: ' + RUB(md === 'gross' ? rpDay.gross : rpDay.sum) + '</span>' : '';
          var mm = [
            { k: 'rev', ic: 'wallet', l: MODES[md].l, v: v == null ? '…' : RUB(v), d: dd2(v, v0) || vD || '<span class="fss-dl">' + MODES[md].s + '</span>', d2: md === 'gc' && ol ? 'новый ' + SHORT(t.gc.sum) + ' ₽ + старый ' + SHORT(t.old.sum) + ' ₽' : '', can: 1 },
            { k: 'cnt', ic: 'bag', l: 'Продажи', v: t ? NUM(t.n) : '…', d: tc && qc ? dd2(tc.n, qc.n) : '<span class="fss-dl">оплаченных заказов</span>', d2: ol ? 'новый ' + NUM(t.gc.n) + ' + старый ' + NUM(t.old.n) : '', can: 1 },
            { k: 'avg', ic: 'receipt', l: 'Средний чек', v: t ? RUB(t.avg) : '…', d: tc && qc ? dd2(tc.avg, qc.avg) : '<span class="fss-dl">на один заказ</span>', d2: 'по заказам GetCourse' },
            { k: 'buy', ic: 'users', l: 'Покупатели', v: t ? NUM(t.buyers) : '…', d: tc && qc ? dd2(tc.buyers, qc.buyers) : '<span class="fss-dl">уникальных людей</span>', d2: ol ? 'сумма по двум аккаунтам, возможны повторы' : '' }];
          var mt = body.querySelector('#fssMT'); if (!mt) return;
          mt.innerHTML = mm.map(function (m) { var sw = m.k === 'rev' ? '<span class="fss-sw" title="Нажми ещё раз: на вывод → оплачено → GetCourse">' + modes.map(function (x) { return '<i' + (x === md ? ' class="on"' : '') + '></i>' }).join('') + '</span>' : '';
            return '<button type="button" class="fss-k' + (m.can ? ' can' : '') + (S.metric === m.k ? ' on' : '') + '" data-k="' + m.k + '"' + (m.can ? '' : ' tabindex="-1"') + '><span class="fss-kh"><span class="fss-ic">' + ico(m.ic) + '</span><span class="fss-kl">' + m.l + '</span>' + sw + '</span><b class="fss-kv2">' + m.v + '</b>' + m.d + (m.d2 ? '<span class="fss-dl2">' + m.d2 + '</span>' : '') + '</button>' }).join('');
          [].forEach.call(mt.querySelectorAll('.fss-k.can'), function (b) { b.onclick = function () { var k = b.getAttribute('data-k'); if (k === 'rev' && S.metric === 'rev') S.money = modes[(modes.indexOf(S.money) + 1) % modes.length]; S.metric = k; refresh() } }) };
        var plan = function () { var el = body.querySelector('#fssPlan'); if (!el) return; var pv = planOf(mk), got = rc.sum, last = new Date(p.a.getFullYear(), p.a.getMonth() + 1, 0), cur = key(p.b) === key(today) && p.b < last, days = last.getDate(), passed = p.b.getDate();
          var fc = cur ? got / passed * days : got, mx = Math.max(pv.ideal, fc, got) * 1.06, X = function (v) { return Math.min(100, v / mx * 100).toFixed(2) + '%' }, pc = pv.ideal ? got / pv.ideal * 100 : 0;
          var next = [['min', 'минимального', pv.min], ['opt', 'оптимального', pv.opt], ['ideal', 'идеального', pv.ideal]].filter(function (z) { return z[2] > got })[0], left = cur ? days - passed : 0, LB = [['мин', pv.min], ['опт', pv.opt], ['идеал', pv.ideal]];
          el.innerHTML = '<div class="fss-ctl"><div><div class="fss-sec">' + ico('target').replace('<svg', '<svg class="fss-hi"') + 'План на ' + MONN[p.a.getMonth()] + (pv.def ? ' <span class="fss-tag">по умолчанию</span>' : '') + '</div><p class="fss-sub" style="margin:0">чистыми, на вывод</p></div><div class="fss-planr"><b>' + Math.round(pc) + '%</b><span>от идеального плана</span><button type="button" class="fss-btn fss-pe" title="Изменить план" aria-label="Изменить план">' + ico('edit') + '</button></div></div>'
            + '<div class="fss-pbar"><i class="got" style="width:' + X(got) + '"></i>' + (cur && fc > got ? '<i class="fc" style="left:' + X(got) + ';width:calc(' + X(fc) + ' - ' + X(got) + ')"></i>' : '') + LB.map(function (z) { return '<s class="' + (got >= z[1] ? 'ok' : '') + '" style="left:' + X(z[1]) + '"></s>' }).join('') + '</div>'
            + '<div class="fss-plabs">' + LB.map(function (z) { return '<span style="left:' + X(z[1]) + '" class="' + (got >= z[1] ? 'ok' : '') + '">' + z[0] + ' ' + SHORT(z[1]) + '</span>' }).join('') + '</div>'
            + '<div class="fss-plabs2">' + LB.map(function (z) { return '<span class="' + (got >= z[1] ? 'ok' : '') + '">' + z[0] + ' ' + SHORT(z[1]) + '</span>' }).join(' · ') + '</div>'
            + '<div class="fss-pnote">' + (cur ? 'Прогноз на конец месяца при текущем темпе\u00a0— <b>' + RUB(fc) + '</b>. ' : '') + (next ? 'До ' + next[1] + ' плана\u00a0— <b>' + RUB(next[2] - got) + '</b>' + (left ? ', это <b>' + RUB((next[2] - got) / left) + '</b> в день до конца месяца.' : '.') : 'Идеальный план выполнен.') + '</div>';
          /* форма плана: числа с пробелами, проверка 0 < мин ≤ опт ≤ идеал, «Сохраняю…», ошибка, «Отмена» */
          var pe = el.querySelector('.fss-pe'); pe.onclick = function () { if (el.querySelector('.fss-pform')) return; var f = document.createElement('div'); f.className = 'fss-pform';
            f.innerHTML = [['min', 'Минимальный'], ['opt', 'Оптимальный'], ['ideal', 'Идеальный']].map(function (z) { return '<label>' + z[1] + '<input type="text" inputmode="numeric" autocomplete="off" data-k="' + z[0] + '" value="' + NUM(pv[z[0]]) + '"></label>' }).join('') + '<button type="button" class="fss-btn fss-psave">Сохранить</button><button type="button" class="fss-btn fss-pcancel">Отмена</button><span class="fss-pmsg" hidden></span>';
            el.appendChild(f); pe.style.display = 'none'; var msg = f.querySelector('.fss-pmsg'), sv = f.querySelector('.fss-psave'), say = function (t, e) { msg.textContent = t; msg.hidden = !t; msg.classList.toggle('e', !!e) };
            f.querySelector('.fss-pcancel').onclick = function () { f.remove(); pe.style.display = '' };
            sv.onclick = function () { var o = { month: mk }; [].forEach.call(f.querySelectorAll('input'), function (i) { o[i.getAttribute('data-k')] = Math.round(+String(i.value).replace(/[^\d]/g, '') || 0) });
              if (!(o.min > 0 && o.min <= o.opt && o.opt <= o.ideal)) { say('Нужно: минимальный больше нуля и минимальный ≤ оптимальный ≤ идеальный.', 1); return }
              if (!statKey()) { say('Сохранить можно после подключения ключа доступа.', 1); return }
              sv.disabled = true; sv.textContent = 'Сохраняю…'; say('');
              fetch(API + '/fin/plan?k=' + encodeURIComponent(statKey()), { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(o) }).then(function (r) { return r.json().catch(function () { return { ok: false, st: r.status } }) }).then(function (j) {
                if (j && j.ok && j.plan) { C.plans = C.plans || {}; C.plans[mk] = j.plan; plan(); return } throw new Error(j && j.st === 403 ? 'auth' : 'srv') })
                .catch(function (e) { sv.disabled = false; sv.textContent = 'Сохранить'; say(e && e.message === 'auth' ? 'Сервер не принял ключ доступа — план не сохранён.' : 'Не получилось сохранить: сервер не ответил. Попробуй ещё раз.', 1) }) } } };
        /* заказы GetCourse нужны не всегда: только без /fin, для графика «Продажи» и графика «Сумма оплат GetCourse» */
        var loadDl = function () { if (st.dlP) return st.dlP; var el = body.querySelector('#fssC'), prog = function (d, t) { var l = el && el.querySelector('.fss-load'); if (l) l.textContent = 'Загружаю заказы GetCourse: ' + d + ' из ' + t + ' страниц…' };
          return st.dlP = Promise.all([deals(p.a, p.b, prog), p.pa ? deals(p.pa, p.pb) : null]).then(function (r) { if (tok !== S.tok) return; st.dl = r[0]; st.dlp = r[1] && hourMode ? cutH(r[1]) : r[1];
            if (r[0].trunc || (r[1] && r[1].trunc)) { var w = body.querySelector('#fssWarn'); if (w) w.hidden = false }
            if (!st.fl) { prods(); allPays() } draw(); setImg() }).catch(function () { st.dlErr = 1; draw() }) };
        var cutH = function (list) { return list.filter(function (x) { return x.when && (('0' + x.when.getHours()).slice(-2) + ':' + ('0' + x.when.getMinutes()).slice(-2)) <= hm }) };
        var aggr = function (list) { var u = {}, sm = 0; list.forEach(function (x) { u[x.uid] = 1; sm += x.cost }); return { n: list.length, sum: sm, avg: list.length ? sm / list.length : 0, buyers: Object.keys(u).length } };
        var draw = function () { var el = body.querySelector('#fssC'); if (!el) return; var dk = dayKeys(p.a, p.b), bk = bucket(dk, st.g), pk = p.pa ? bucket(dayKeys(p.pa, p.pb), st.g) : null, md = S.money, dtok = st.dtok = Math.random();
          var fin = function (cur, prev) { if (dtok !== st.dtok) return; if (prev && prev.every(function (x) { return !x })) prev = null;
            line(el, cur, prev, S.metric === 'rev' ? { h: 300 } : { h: 300, int: 1, fmt: function (x) { return NUM(x) }, tf: function (x) { return NUM(x) + ' ' + pl(x, ['продажа', 'продажи', 'продаж']) } }) };
          var mkp = function (bks, vals, withAx) { return bks.map(function (b, i) { return vals[i] == null ? null : withAx ? { v: vals[i], ax: lbl(b, st.g, st.g === 'month' && i === 0 ? 2 : 1), t: lbl(b, st.g) } : { v: vals[i], t: lbl(b, st.g) } }) };
          var byList = function (list, gc) { return function (arr) { if (!list) return null; var a = day0(arr[0]), z = addD(day0(arr[arr.length - 1]), 1), o = odSum(a, addD(z, -1)), s2 = 0, c2 = 0; list.forEach(function (x) { if (x.when && x.when >= a && x.when < z) { c2++; s2 += x.cost } }); return gc ? s2 + (o ? o.sum : 0) : c2 + (o ? o.n : 0) } };
          if (S.metric === 'rev' && md !== 'gc') { var f = function (arr) { return arr.reduce(function (s, d) { var x = PAY.m[key(d)]; return s + (x ? (md === 'gross' ? x.gross : x.sum) : 0) }, 0) };
            var pv0 = pk ? pk.map(f) : null; if (hourMode && pv0) pv0 = rp ? [md === 'gross' ? rp.gross : rp.sum] : null;
            return fin(mkp(bk, bk.map(f), 1), pv0 ? mkp(pk, pv0) : null) }
          /* «Продажи» и «Сумма оплат GetCourse» по дням — одним проходом по уже загруженному списку заказов */
          if (!st.dl) { if (st.dlErr) { el.innerHTML = '<div class="fss-empty">GetCourse не отдал список заказов</div>'; return } el.innerHTML = '<div class="fss-load">Загружаю заказы GetCourse…</div>'; loadDl(); return }
          var gcm = S.metric === 'rev'; fin(mkp(bk, bk.map(byList(st.dl, gcm)), 1), pk ? mkp(pk, pk.map(byList(st.dlp, gcm))) : null) };
        var prods = function () { var el = body.querySelector('#fssProd'); if (!el) return; var useNet = !!st.fl, src = useNet ? st.fl.list.map(function (x) { return { title: x.title, v: x.net } }) : (st.dl || []).map(function (x) { return { title: x.title, v: x.cost } });
          if (!useNet && !st.dl) { loadDl(); return } var G = groupProducts(src), tot = G.reduce(function (s, g) { return s + g.v }, 0), cntAll = src.length;
          var sb = body.querySelector('#fssProdSub'); if (sb) sb.textContent = useNet ? 'по оплатам за период, суммы на вывод' : 'по оплаченным заказам, суммы — стоимость заказов';
          if (!G.length) { el.innerHTML = '<div class="fss-empty">' + (hourMode ? 'Сегодня продаж пока не было' : 'За период продаж не было') + '</div>'; return }
          el.innerHTML = '<div class="fss-dwrap">' + donut(G, SHORT(tot), NUM(cntAll) + ' ' + pl(cntAll, ['оплата', 'оплаты', 'оплат'])) + '<div class="fss-lg2">' + G.map(function (g, i) {
              return '<div class="fss-lr" data-i="' + i + '"><button type="button" class="fss-lh' + (g.tars.length ? '' : ' nx') + '"><i style="background:' + g.c + '"></i><span class="nm" title="' + esc(g.name) + '">' + esc(g.name) + '</span><span class="ct">×' + NUM(g.n) + '</span><b>' + RUB(g.v) + '</b><em>' + shareP(g.v, tot) + '</em><svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg></button>'
                + (g.inst ? '<div class="fss-ln">из них в рассрочку — ' + NUM(g.inst) + '</div>' : '') + (g.tars.length ? '<div class="fss-lt">' + g.tars.map(function (t) { return '<div><span>' + esc(t.name) + '</span><span class="ct">×' + NUM(t.n) + '</span><b>' + RUB(t.v) + '</b></div>' }).join('') + '</div>' : '') + '</div>' }).join('') + '</div></div>';
          [].forEach.call(el.querySelectorAll('.fss-lr'), function (r) { r.querySelector('.fss-lh').onclick = function () { r.classList.toggle('open') } }); hoverLinks(el) };
        var meths = function () { var el = body.querySelector('#fssMeth'); if (!el) return; if (!st.fl) { el.innerHTML = '<div class="fss-empty">' + (PAY.gross ? 'Видно после подключения ключа доступа' : st.flErr ? 'Сервер статистики не отдал оплаты' : '…') + '</div>'; return }
          var M2 = groupMethods(st.fl.list), tot = M2.reduce(function (s, g) { return s + g.net }, 0); if (!M2.length) { el.innerHTML = '<div class="fss-empty">' + (hourMode ? 'Сегодня оплат пока не было' : 'Оплат не было') + '</div>'; return }
          el.innerHTML = '<div class="fss-dwrap">' + donut(M2, SHORT(tot), 'на вывод') + '<div class="fss-lg2">' + M2.map(function (g, i) { return '<div class="fss-lr" data-i="' + i + '"><div class="fss-lh st"><i style="background:' + g.c + '"></i><span class="nm">' + g.name + '</span><span class="ct">×' + NUM(g.n) + '</span><b>' + RUB(g.net) + '</b><em>' + shareP(g.net, tot) + '</em></div>'
            + '<div class="fss-ln">оплачено ' + RUB(g.sum) + (g.fee ? ' · комиссия <span class="dn">−' + RUB(g.fee) + ' (' + (g.fee / g.sum * 100).toFixed(1).replace('.', ',') + '%)</span>' : ' · без комиссии') + '</div></div>' }).join('') + '</div></div>';
          hoverLinks(el) };
        /* «Показать ещё 100» вместо тысяч строк разом */
        var moreBtns = function (el, total, rerender) { var shown = Math.min(st.shown, total); if (total <= 10) return '';
          return '<div class="fss-mb" style="justify-content:flex-start;margin-top:14px">' + (shown < total ? '<button type="button" class="fss-btn fss-more">Показать ещё ' + NUM(Math.min(100, total - shown)) + '</button>' : '') + (shown > 10 ? '<button type="button" class="fss-btn fss-less">Свернуть</button>' : '') + '<span class="fss-n" style="align-self:center">показано ' + NUM(shown) + ' из ' + NUM(total) + '</span></div>' };
        var bindMore = function (el, rerender) { var mb = el.querySelector('.fss-more'), lb = el.querySelector('.fss-less'); if (mb) mb.onclick = function () { st.shown += 100; rerender() }; if (lb) lb.onclick = function () { st.shown = 10; rerender(); var c = el.closest('.fss-card'); if (c && c.getBoundingClientRect().top < 0) c.scrollIntoView() } };
        var allPays = function () { var el = body.querySelector('#fssAll'); if (!el) return; if (!st.fl) { if (st.dl) lastPays2(st.dl); else loadDl(); return }
          var L = st.fl.list, show = L.slice(0, st.shown), sb = body.querySelector('#fssAllSub'); if (sb) sb.textContent = NUM(L.length) + ' ' + pl(L.length, ['оплата', 'оплаты', 'оплат']) + ', новые сверху';
          el.innerHTML = L.length ? '<div class="fss-scroll"><table class="fss-t"><tr><th>Когда</th><th class="l">Клиент</th><th class="l">Продукт и тариф</th><th class="l">Способ</th><th>Оплачено</th><th>Комиссия</th><th>На вывод</th></tr>' + show.map(function (x) { var w = new Date(String(x.created).replace(' ', 'T')), s = splitTitle(x.title), m = METHODS.filter(function (d) { return d[0] === methodOf(x) })[0];
              return '<tr><td class="m">' + fmtW(w) + '</td><td class="l">' + (x.id < 0 ? '<span class="fss-n" style="margin:0">старый аккаунт</span>' : '<a href="/sales/control/payment/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.name || '—') + '</a>') + '</td><td class="l">' + esc(shortProd(s.prod)) + (s.tar || s.inst ? '<div class="fss-n">' + esc(s.tar) + (s.inst ? (s.tar ? ' · ' : '') + 'в рассрочку' : '') + '</div>' : '') + '</td><td class="l"><span class="fss-mt2"><i style="background:' + m[2] + '"></i>' + m[1].split(' (')[0] + '</span></td><td>' + RUB(x.sum) + '</td><td class="m">' + (x.fee ? '−' + RUB(x.fee) : '—') + '</td><td class="b">' + RUB(x.net) + '</td></tr>' }).join('') + '</table></div>'
            + moreBtns(el, L.length) : '<div class="fss-empty">' + (hourMode ? 'Сегодня оплат пока не было' : 'За период оплат не было') + '</div>';
          bindMore(el, allPays) };
        var lastPays2 = function (list) { var el = body.querySelector('#fssAll'); if (!el) return; var L = list.slice().sort(function (a, b) { return (b.when || 0) - (a.when || 0) }), sb = body.querySelector('#fssAllSub');
          if (sb) sb.textContent = NUM(L.length) + ' ' + pl(L.length, ['оплаченный заказ', 'оплаченных заказа', 'оплаченных заказов']) + ', новые сверху · стоимость заказов';
          el.innerHTML = L.length ? '<div class="fss-scroll"><table class="fss-t"><tr><th>Когда</th><th class="l">Клиент</th><th class="l">Продукт и тариф</th><th>Стоимость заказа</th></tr>' + L.slice(0, st.shown).map(function (x) { var s = splitTitle(x.title); return '<tr><td class="m">' + fmtW(x.when) + '</td><td class="l"><a href="/sales/control/deal/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.client || '—') + '</a></td><td class="l">' + esc(s.prod) + (s.tar ? '<div class="fss-n">' + esc(s.tar) + '</div>' : '') + '</td><td class="b">' + RUB(x.cost) + '</td></tr>' }).join('') + '</table></div>' + moreBtns(el, L.length) : '<div class="fss-empty">За период оплат не было</div>';
          bindMore(el, function () { lastPays2(list) }) };
        var refresh = function () { lead(); flow(); metrics(); plan(); draw() };
        st.refresh = refresh; refresh();
        [].forEach.call(body.querySelectorAll('#fssG button'), function (b) { b.onclick = function () { if (b.disabled) return; S.gran = st.g = b.getAttribute('data-g'); [].forEach.call(body.querySelectorAll('#fssG button'), function (x) { x.classList.toggle('on', x === b) }); draw() } });
        Promise.all([dealTot(p.a, p.b), p.pa && !hourMode ? dealTot(p.pa, p.pb) : null]).then(function (r) { if (tok !== S.tok) return; st.cur = r[0]; st.prev = r[1]; lead(); flow(); metrics(); setImg() }).catch(function () {});
        /* «Сегодня»: продажи/чек/покупатели сравниваем по спискам заказов за сегодня и за вчера до этого же часа */
        if (hourMode) Promise.all([deals(p.a, p.b), deals(p.pa, p.pb)]).then(function (r) { if (tok !== S.tok) return; st.curH = aggr(r[0]); st.prevH = aggr(cutH(r[1])); metrics(); setImg() }).catch(function () {});
        if (!PAY.gross) finList(p.a, p.b, p.pa, p.pb).then(function (F) { if (tok !== S.tok) return; st.fl = F;
            if (hourMode && F.plist) { var y = { sum: 0, gross: 0, fee: 0, n: 0 }; F.plist.forEach(function (x) { if (String(x.created).slice(11, 19) <= hms) { y.sum += +x.net || 0; y.gross += +x.sum || 0; y.fee += +x.fee || 0; y.n++ } }); rp = st.rp = y; lead(); metrics(); draw() }
            prods(); meths(); allPays(); plan(); setImg() }).catch(function () { st.flErr = 1; meths(); prods(); allPays() });
        else { meths(); prods(); allPays() }
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
        return '<tr><td>' + (x.id < 0 ? '<span>старый аккаунт</span>' : '<a href="/sales/control/payment/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.name || '—') + '</a>') + '<div class="fss-n">' + esc(x.title || '') + (x.fee ? ' · оплачено ' + RUB(x.sum) : '') + '</div></td><td class="m">' + fmtW(w) + '</td><td class="b">' + RUB(x.net) + '</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">За период поступлений нет</div>' };
    var lastPays = function (list) { var el = body.querySelector('#fssLast'); if (!el) return; var L = list.slice().sort(function (a, b) { return (b.when || 0) - (a.when || 0) }).slice(0, 8);
      el.innerHTML = L.length ? '<table class="fss-t"><tr><th>Клиент</th><th>Когда</th><th>Заказ</th></tr>' + L.map(function (x) {
        return '<tr><td><a href="/sales/control/deal/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.client || '—') + '</a><div class="fss-n">' + esc(x.title) + '</div></td><td class="m">' + fmtW(x.when) + '</td><td class="b">' + RUB(x.cost) + '</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">Пока пусто</div>' };

    /* ---------- вкладка «Накопительная» ---------- */
    var renderCumulative = function () { var tok = S.tok = Math.random(); loading();
      payments().then(function (PAY) { C.payV = PAY; updLabel(); if (tok !== S.tok) return; var p = P(), dk = dayKeys(p.a, p.b), pk = p.pa ? dayKeys(p.pa, p.pb) : null, run = 0, run2 = 0;
        /* подписи оси: до 45 дней — числа; длиннее — месяцы (при смене года и у первой точки — с годом); больше 2 лет — кварталы */
        var long = dk.length > 45, huge = dk.length > 730, yN = today.getFullYear(), dY = function (d) { return d.getFullYear() !== yN ? ' ' + d.getFullYear() : '' };
        var axOf = function (d, i) { if (!long) return d.getDate() + (d.getDate() === 1 || i === 0 ? ' ' + MONS3[d.getMonth()] : ''); var nm = i === 0 || d.getDate() === 1; if (!nm) return ''; if (huge && d.getMonth() % 3 && i) return '';
          return d.getMonth() === 0 || i === 0 ? MONA[d.getMonth()] + ' ' + d.getFullYear() : MONA[d.getMonth()] };
        var cur = dk.map(function (d, i) { var x = PAY.m[key(d)]; run += x ? x.sum : 0; return { v: run, ax: axOf(d, i), t: 'к ' + d.getDate() + ' ' + MONS[d.getMonth()] + dY(d), x: x && x.sum ? (x.sum > 0 ? '+' : '') + RUB(x.sum) + ' за день' : '' } });
        var prev = pk ? pk.map(function (d) { var x = PAY.m[key(d)]; run2 += x ? x.sum : 0; return { v: run2, t: 'к ' + d.getDate() + ' ' + MONS[d.getMonth()] + dY(d), d: d } }) : null;
        /* сравнение — с тем же днём прошлого периода (до прореживания), а не с точкой после прореживания */
        /* закончившийся период — с итогом прошлого целиком, идущий — с тем же днём прошлого */
        var pi = !prev ? -1 : key(p.b) < key(today) ? prev.length - 1 : Math.min(prev.length, cur.length) - 1, pAt = prev ? prev[pi] : null, diff = prev ? run - pAt.v : 0;
        if (dk.length > 120) { var step = Math.ceil(dk.length / 120), ix = []; cur.forEach(function (x, i) { if (i % step === 0 || i === cur.length - 1 || x.ax) ix.push(i) }); cur = ix.map(function (i) { return cur[i] }); if (prev) prev = ix.filter(function (i) { return i < prev.length }).map(function (i) { return prev[i] }) }
        var last = dk[dk.length - 1], cmp = cmpName(p), cmpL = !prev ? '' : pi === pk.length - 1 ? 'чем за ' + cmp : 'чем к ' + pAt.d.getDate() + ' ' + MONS[pAt.d.getMonth()] + dY(pAt.d), dp = prev && pAt.v ? pct(run, pAt.v) : null;
        var months = {}, order = []; Object.keys(PAY.m).sort().forEach(function (k) { var mk = k.slice(0, 7); if (!months[mk]) { months[mk] = 0; order.push(mk) } months[mk] += PAY.m[k].sum });
        var tot = 0, rows = order.map(function (mk) { tot += months[mk]; var y = +mk.slice(0, 4), m = +mk.slice(5, 7) - 1; return { l: cap(MONN[m]) + ' ' + y, m: months[mk], c: tot } });
        body.innerHTML = '<p class="fss-lead">К\u00a0' + last.getDate() + ' ' + MONS[last.getMonth()] + dY(last) + (C.payV && C.payV.gross ? ' клиенты заплатили <em>' : ' на\u00a0вывод пришло <em>') + RUB(run) + '</em>'
          + (prev ? '<br><span>Это <b class="' + (diff >= 0 ? 'up' : 'dn') + '">' + (dp != null && dp < 200 ? 'на\u00a0' + pctN(dp) + '% (' + (diff >= 0 ? '+' : '−') + RUB(Math.abs(diff)) + ') ' + (diff >= 0 ? 'больше' : 'меньше') : dp != null ? pctLead(dp) + ' (+' + RUB(diff) + ')' : 'на\u00a0' + RUB(Math.abs(diff)) + ' ' + (diff >= 0 ? 'больше' : 'меньше')) + '</b>, ' + esc(cmpL) + '</span>' : p.noCmp ? '<br><span>Сравнения нет: прошлый период начинается раньше первых данных</span>' : '') + '</p>'
          + '<div class="fss-card"><div class="fss-ctl"><div><div class="fss-sec">Выручка нарастающим итогом</div><p class="fss-sub" style="margin:0">каждая точка — сколько денег пришло с начала периода</p></div><div class="fss-leg"><span><i></i>' + esc(human(p.a, p.b)) + '</span>' + (prev ? '<span><i class="p"></i>' + esc(cmp) + '</span>' : '') + '</div></div><div class="fss-ch" id="fssC" style="margin-top:12px"></div></div>'
          + '<div class="fss-card"><div class="fss-sec">По месяцам за всё время</div><p class="fss-sub">поступления и накопленный итог</p><div class="fss-scroll"><table class="fss-t"><tr><th>Месяц</th><th>Пришло</th><th>Накоплено</th><th>Доля</th></tr>'
          + rows.slice().reverse().map(function (r) { return '<tr><td>' + r.l + '<span class="fss-bar"><i style="width:' + (tot > 0 ? Math.max(2, Math.min(100, r.c / tot * 100)) : 2).toFixed(1) + '%"></i></span></td><td>' + RUB(r.m) + '</td><td class="b">' + RUB(r.c) + '</td><td class="m">' + shareP(r.m, tot) + '</td></tr>' }).join('') + '</table></div></div>';
        line(body.querySelector('#fssC'), cur, prev, { h: 320, sparse: long }) }).catch(fail) };

    /* ---------- вкладка «Клиенты и LTV» ---------- */
    var renderClients = function () { var tok = S.tok = Math.random(); loading('Считаю клиентов и LTV по всем оплаченным заказам…');
      var prog = function (d, t) { if (tok !== S.tok) return; var l = body.querySelector('.fss-load'); if (l) l.firstChild.textContent = 'Загружаю заказы GetCourse: ' + d + ' из ' + t + ' страниц…' };
      /* заказы за всё время берутся из кэша вкладки по дням: при повторном заходе догружаются только последние дни */
      Promise.all([payments(), structure(), deals(new Date(2015, 0, 1), today, prog), dealTotGC(new Date(2015, 0, 1), today)]).then(function (r) { if (tok !== S.tok) return;
        var PAY = r[0], ST = r[1], D = r[2], TOT = r[3], cl = {}; D.forEach(function (x) { var c = cl[x.uid] = cl[x.uid] || { n: 0, sum: 0, first: null, dates: [] }; c.n++; c.sum += x.cost; if (x.when) { c.dates.push(x.when); if (!c.first || x.when < c.first) c.first = x.when } });
        var ids = Object.keys(cl), N = ids.length || 1, money2 = 0; Object.keys(PAY.m).forEach(function (k) { money2 += PAY.m[k].sum - (PAY.m[k].old || 0) });
        /* один знаменатель везде — покупатели по GetCourse (уникальные люди); если GetCourse не отдал — по списку заказов */
        var buyers = TOT.buyers || N; N = buyers; var ltv = money2 / buyers, rep = ids.filter(function (i) { return cl[i].n > 1 }), repS = rep.reduce(function (s, i) { return s + cl[i].sum }, 0), oneS = ids.filter(function (i) { return cl[i].n === 1 }).reduce(function (s, i) { return s + cl[i].sum }, 0);
        var gaps = []; rep.forEach(function (i) { var ds = cl[i].dates.sort(function (a, b) { return a - b }); if (ds.length > 1) gaps.push((ds[1] - ds[0]) / 864e5) }); gaps.sort(function (a, b) { return a - b }); var med = gaps.length ? Math.round(gaps[Math.floor(gaps.length / 2)]) : 0;
        var coh = {}, co = []; ids.forEach(function (i) { var c = cl[i]; if (!c.first) return; var mk = c.first.getFullYear() + '-' + ('0' + (c.first.getMonth() + 1)).slice(-2); if (!coh[mk]) { coh[mk] = { n: 0, sum: 0, rep: 0 }; co.push(mk) } coh[mk].n++; coh[mk].sum += c.sum; if (c.n > 1) coh[mk].rep++ }); co.sort();
        var COL = ['#6724ad', '#9657e8', '#d7b6ff'], it = ST.periods[S.stI || 0] || [], lg = ST.growth[ST.growth.length - 1] || {};
        body.innerHTML = '<p class="fss-lead">Один клиент в среднем приносит <em>' + RUB(ltv) + '</em><br><span>' + Math.round(rep.length / N * 100) + '% клиентов купили больше одного раза — они дали ' + Math.round(repS / Math.max(1, repS + oneS) * 100) + '% выручки</span></p>'
          + '<p class="fss-sub" style="margin:-10px 0 20px">Новый аккаунт GetCourse (с\u00a0апреля 2026), за всё время — период здесь не\u00a0учитывается</p>'
          + (D.trunc ? '<div class="fss-warn">GetCourse отдал не все заказы (больше 400 страниц) — LTV и\u00a0когорты неполные.</div>' : '')
          + '<div class="fss-kv"><div><i>LTV клиента</i><b>' + RUB(ltv) + '</b><small>' + (PAY.gross ? 'все оплаты ' : 'всё, что пришло на вывод, ') + SHORT(money2) + '\u00a0₽ ÷ ' + NUM(buyers) + ' ' + pl(buyers, ['покупатель', 'покупателя', 'покупателей']) + '</small></div>'
          + '<div><i>Повторные покупки</i><b>' + Math.round(rep.length / N * 100) + '%</b><small>' + NUM(rep.length) + ' из\u00a0' + NUM(N) + ' ' + pl(N, ['клиента', 'клиентов', 'клиентов']) + ' купили 2+\u00a0раза</small></div>'
          + '<div><i>Покупок на клиента</i><b>' + (D.length / N).toFixed(2).replace('.', ',') + '</b><small>' + NUM(D.length) + ' ' + pl(D.length, ['оплаченный заказ', 'оплаченных заказа', 'оплаченных заказов']) + '</small></div>'
          + '<div><i>До второй покупки</i><b>' + (gaps.length ? med + ' ' + pl(med, ['день', 'дня', 'дней']) : '—') + '</b><small>медиана у тех, кто вернулся</small></div></div>'
          + '<div class="fss-card" style="margin-top:16px"><div class="fss-sec">LTV по месяцу первой покупки</div><p class="fss-sub">сколько в среднем принёс клиент, пришедший в этом месяце (по сумме оплаченных заказов)</p><div class="fss-ch" id="fssC"></div></div>'
          + '<div class="fss-row"><div class="fss-card"><div class="fss-sec">Откуда выручка</div><p class="fss-sub">новые клиенты и клиенты из базы · данные GetCourse на конец прошлого дня</p>'
          + '<div class="fss-seg" id="fssSt" style="margin-bottom:18px">' + ['Текущий месяц', 'Прошлый месяц', 'Весь период'].map(function (t, j) { return ST.periods[j] ? '<button type="button" data-i="' + j + '"' + ((S.stI || 0) === j ? ' class="on"' : '') + '>' + t + '</button>' : '' }).join('') + '</div>'
          + (it.length ? '<div class="fss-stack">' + it.map(function (x, j) { return '<i style="width:' + Math.max(x.p, .6) + '%;background:' + COL[j] + '"></i>' }).join('') + '</div><table class="fss-t">' + it.map(function (x, j) {
            return '<tr><td><span class="fss-dot" style="background:' + COL[j] + '"></span>' + esc(x.t) + '<div class="fss-n" style="margin-left:18px">' + (j < 2 ? 'новые клиенты' : 'клиенты из базы') + '</div></td><td class="m">' + String(x.p).replace('.', ',') + '%</td><td class="b">' + esc(x.s.replace('.', ',').replace('M', ' млн').replace('K', ' тыс')) + ' ₽</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">Нет данных</div>')
          + '</div><div class="fss-card"><div class="fss-sec">Рост базы клиентов</div><p class="fss-sub">' + (ST.pct ? esc(ST.pct) + ' за полгода · ' + esc(ST.add) + ' ' + pl(money(ST.add), ['клиент', 'клиента', 'клиентов']) : '&nbsp;') + '</p><div class="fss-ch" id="fssB"></div></div></div>'
          + '<div class="fss-card"><div class="fss-sec">Клиенты по месяцу первой покупки</div><p class="fss-sub">когорты: сколько пришло, сколько вернулось за повторной покупкой</p><div class="fss-scroll"><table class="fss-t"><tr><th>Месяц</th><th>Новых клиентов</th><th>Купили повторно</th><th>LTV</th></tr>'
          + co.slice().reverse().map(function (mk) { var c = coh[mk], y = +mk.slice(0, 4), m = +mk.slice(5) - 1; return '<tr><td>' + cap(MONN[m]) + ' ' + y + '</td><td>' + NUM(c.n) + '</td><td class="m">' + NUM(c.rep) + ' · ' + Math.round(c.rep / c.n * 100) + '%</td><td class="b">' + RUB(c.sum / c.n) + '</td></tr>' }).join('') + '</table></div></div>';
        line(body.querySelector('#fssC'), co.map(function (mk) { var y = +mk.slice(0, 4), m = +mk.slice(5) - 1; return { v: coh[mk].sum / coh[mk].n, ax: MONA[m] + (m === 0 || mk === co[0] ? ' ' + y : ''), t: cap(MONN[m]) + ' ' + y, x: NUM(coh[mk].n) + ' ' + pl(coh[mk].n, ['новый клиент', 'новых клиента', 'новых клиентов']) } }), null, { h: 260 });
        line(body.querySelector('#fssB'), ST.growth.map(function (g) { return { v: g.n, ax: g.m.slice(0, 3).toLowerCase(), t: g.m } }), null, { h: 220, fmt: function (x) { return NUM(x) }, tf: function (x) { return NUM(x) + ' ' + pl(x, ['клиент', 'клиента', 'клиентов']) } });
        [].forEach.call(body.querySelectorAll('#fssSt button'), function (b) { b.onclick = function () { S.stI = +b.getAttribute('data-i'); renderClients() } }) }).catch(fail) };

    /* ---------- вкладка «Как в GetCourse» ---------- */
    var renderTable = function () { var tok = S.tok = Math.random(); loading();
      indexTable().then(function (R) { if (tok !== S.tok) return; var H = ['Сегодня', 'Вчера', 'Этот месяц', 'Прошлый месяц', 'Этот год', 'Всё время'];
        /* нулевую строку комиссий не показываем: GetCourse здесь их не считает (комиссии — на «Продажах») */
        var zf = R.filter(function (r) { return /комисси/i.test(r.label) && r.v.every(function (x) { return !x }) }).length; R = R.filter(function (r) { return !(/комисси/i.test(r.label) && r.v.every(function (x) { return !x })) });
        body.innerHTML = '<p class="fss-lead">Официальная сводка GetCourse<br><span>Здесь «сумма оплат» считается по\u00a0полностью оплаченным заказам, поэтому она меньше выручки: предоплаты и\u00a0рассрочки идут отдельной строкой</span></p>'
          + '<p class="fss-sub" style="margin:-10px 0 20px">Только новый аккаунт (с\u00a0апреля 2026). На\u00a0«Продажах» за\u00a0длинные периоды добавлен старый аккаунт, поэтому там суммы больше.' + (zf ? ' Комиссии платёжных систем GetCourse в\u00a0этой сводке не считает — они на\u00a0вкладке «Продажи».' : '') + '</p>'
          + '<div class="fss-card"><div class="fss-scroll"><table class="fss-t"><tr><th>Показатель</th>' + H.map(function (h, j) { return '<th' + (j === 2 ? ' style="color:#fff"' : '') + '>' + h + '</th>' }).join('') + '</tr>'
          + R.map(function (r) { var cnt = /Count$/.test(r.k || ''); return '<tr class="' + (r.k === 'earnedSum' ? 'sum hl' : '') + '"><td>' + esc(r.label) + '</td>' + r.v.map(function (x, j) { return '<td class="' + (j === 2 ? 'b' : '') + '">' + (cnt ? NUM(x) : RUB(x)) + '</td>' }).join('') + '</tr>' }).join('') + '</table></div></div>' }).catch(fail) };

    /* ---------- отчёт картинкой 1920×1080 в «фиолетовом стиле» ---------- */
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
      var dl = function (a, b) { var v = pct(a, b); if (v == null) return null; return { s: (v > .5 ? '↑ ' : v < -.5 ? '↓ ' : '≈ ') + pctChip(v), c: v > .5 ? '#4ade80' : v < -.5 ? '#ff6b6b' : 'rgba(255,255,255,.7)', b: v > .5 ? 'rgba(74,222,128,.14)' : v < -.5 ? 'rgba(255,107,107,.14)' : 'rgba(255,255,255,.08)' } };
      var pill = function (d, X, Y, sz) { font(600, sz); var w = tw(d.s) + sz * 1.1, h = sz * 1.75; rr(X, Y - h / 2, w, h, h / 2); x.fillStyle = d.b; x.fill(); T(d.s, X + sz * .55, Y + 1, d.c); return w };
      var mark = function (X, Y, s) { var u = s / 64;[[0, 0], [0, 1], [1, 0], [1, 2], [2, 0], [2, 1], [2, 2], [0, 2]].forEach(function (ab) { rr(X + ab[1] * 22 * u, Y + ab[0] * 22 * u, 20 * u, 20 * u, 4 * u); x.fillStyle = (ab[0] === 0 && ab[1] === 2) ? '#c9a2ff' : '#fff'; x.fill() }) };
      var chip = function (t, X, Y, kind, sz, h) { font(700, sz); try { x.letterSpacing = '2px' } catch (e) {} var w = tw(t) + h * .9; rr(X, Y, w, h, h / 2); if (kind === 'lilac') { x.fillStyle = '#c38bff'; x.fill() } else { x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 1.5; x.stroke() } T(t, X + h * .45, Y + h / 2 + 1, kind === 'lilac' ? '#000106' : '#fff'); try { x.letterSpacing = '0px' } catch (e) {} return w };
      /* «Сегодня» — со вчера до того же часа (st.rp / st.prevH), подписи сравнения те же, что на странице */
      var hq = st.hour, qc = hq ? st.prevH : q, cc = hq ? st.curH : c;
      var md = S.money || 'net', mv = md === 'net' ? rc.sum : md === 'gross' ? rc.gross : c.sum, mv0 = md === 'gc' ? (qc ? qc.sum : null) : !rp ? null : md === 'net' ? rp.sum : rp.gross;
      var items = st.fl ? st.fl.list.map(function (z) { return { title: z.title, v: md === 'gross' ? z.sum : z.net } }) : (st.dl || []).map(function (z) { return { title: z.title, v: z.cost } }), G = groupProducts(items, 5), gt = G.reduce(function (s2, g) { return s2 + g.v }, 0);
      var yC = today.getFullYear(), yS = function (d) { return d.getFullYear() !== yC ? ' ' + d.getFullYear() : '' };
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
        var ds = (n1 ? p.a.getDate() + ' ' + MONS[p.a.getMonth()] + ' ' + p.a.getFullYear() : S.k === 'all' ? 'с ' + p.a.getDate() + ' ' + MONS[p.a.getMonth()] + ' ' + p.a.getFullYear() : human(p.a, p.b) + (p.a.getFullYear() === p.b.getFullYear() && p.b.getFullYear() === yC ? ' ' + yC : '')).toUpperCase(); font(700, 20); try { x.letterSpacing = '2px' } catch (e) {} var w1 = tw(ds) + 48 * .9; try { x.letterSpacing = '0px' } catch (e) {}
        chip(ds, W - M - w1, 61, 'lilac', 20, 48); font(700, 20); try { x.letterSpacing = '2px' } catch (e) {} var w2 = tw('ОТЧЁТ ОТДЕЛА ПРОДАЖ') + 48 * .9; try { x.letterSpacing = '0px' } catch (e) {} chip('ОТЧЁТ ОТДЕЛА ПРОДАЖ', W - M - w1 - 12 - w2, 61, 'line', 20, 48);
        /* заголовок */
        var t1 = 'Продажи ', t2 = n1 ? 'за ' + p.a.getDate() + ' ' + MONS[p.a.getMonth()] + yS(p.a) : S.k === 'all' ? 'за всё время' : wholeYear(p.a, p.b) ? 'за ' + p.a.getFullYear() + ' год' : wholeMonth(p.a, p.b) ? 'за ' + MONN[p.a.getMonth()] + yS(p.a) : 'за ' + human(p.a, p.b), fs = 76; font(500, fs); while (fs > 48 && tw(t1 + t2) > W - 2 * M) { fs -= 2; font(500, fs) } x.textBaseline = 'alphabetic'; T(t1, M, 194, '#fff'); T(t2, M + tw(t1), 194, 'rgba(255,255,255,.55)'); x.textBaseline = 'middle';
        /* сетка: поля 80, внутренний отступ карточек P = 40 */
        var LW = 860, X1 = M + LW + 40, RW = W - M - X1, P = 40, Y = 240, YB = H - 84, BL = function (bot, sz) { return bot - P - sz * .35 };
        var cmpS = !p.pa ? '' : hq ? st.dayW + ' к ' + st.hm : n1 ? p.pa.getDate() + ' ' + MONS[p.pa.getMonth()] + yS(p.pa) : human(p.pa, p.pb), cmpSh = !p.pa ? '' : hq ? st.dayW + ' к ' + st.hm : n1 ? p.pa.getDate() + ' ' + MONS3[p.pa.getMonth()] : human(p.pa, p.pb, 1);
        /* главная карточка: сумма + три показателя */
        var hasFlow = !st.PAY.gross && rc.gross, D = hasFlow ? 0 : -70, hH = 484 + D; cardB(M, Y, LW, hH, 1);
        var olc = md === 'gc' && c.old && c.gc;
        IC('wallet', M + P, Y + P, 52, '#1a0b2e', '#c38bff'); font(500, 28); T({ net: 'На вывод', gross: 'Оплачено клиентами', gc: 'Сумма оплат GetCourse' }[md], M + P + 68, Y + P + 14, '#fff');
        font(400, 19); T(olc ? 'оба аккаунта: новый ' + SHORT(c.gc.sum) + ' ₽ + старый ' + SHORT(c.old.sum) + ' ₽' : { net: 'после комиссий GetCourse и банков', gross: 'все принятые платежи, до комиссий', gc: 'по полностью оплаченным заказам' }[md], M + P + 68, Y + P + 40, 'rgba(255,255,255,.55)');
        var vs = RUB(mv), vf = 100; font(500, vf); while (tw(vs) > LW - 2 * P && vf > 64) { vf -= 4; font(500, vf) } T(vs, M + P - 4, Y + 146, '#fff');
        var d0 = mv0 != null ? dl(mv, mv0) : null;
        if (d0) { var pw = pill(d0, M + P, Y + 218, 22); font(400, 20); T(fit((hq ? st.cmpChip : 'к ' + cmpS) + ' · было ' + RUB(mv0), LW - 2 * P - pw - 14), M + P + pw + 14, Y + 219, 'rgba(255,255,255,.55)') }
        else if (mv0 === 0 && p.pa) { font(400, 20); T(cap(cmpS) + ' оплат не было', M + P, Y + 219, 'rgba(255,255,255,.55)') }
        else { font(400, 20); var nt0 = hq && st.rpDay && md !== 'gc' ? st.dayW + ' за весь день ' + RUB(md === 'gross' ? st.rpDay.gross : st.rpDay.sum) : S.k === 'all' ? 'с ' + p.a.getDate() + ' ' + MONS[p.a.getMonth()] + ' ' + p.a.getFullYear() + ', когда начались оплаты' : p.noCmp ? 'сравнения нет: раньше данных нет' : ''; if (nt0) T(nt0, M + P, Y + 219, 'rgba(255,255,255,.55)') }
        if (hasFlow) { var bx = M + P, bw = LW - 2 * P, by = Y + 252, fp = rc.fee / rc.gross; rr(bx, by, Math.max(10, bw * (1 - fp) - 3), 10, 5); var bgd = x.createLinearGradient(bx, 0, bx + bw, 0); bgd.addColorStop(0, '#6724ad'); bgd.addColorStop(1, '#c38bff'); x.fillStyle = bgd; x.fill(); rr(bx + bw * (1 - fp), by, Math.max(6, bw * fp), 10, 5); x.fillStyle = 'rgba(255,107,107,.85)'; x.fill();
          font(400, 17); T('клиенты заплатили ' + RUB(rc.gross), bx, by + 28, 'rgba(255,255,255,.55)'); x.textAlign = 'right'; T('комиссии −' + RUB(rc.fee) + ' · ' + (fp * 100).toFixed(1).replace('.', ',') + '%', bx + bw, by + 28, '#ff6b6b'); x.textAlign = 'left' }
        x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(M + P, Y + 308 + D, LW - 2 * P, 1);
        var cw3 = (LW - 2 * P) / 3;[['bag', 'Продажи', NUM(c.n), cc && qc ? dl(cc.n, qc.n) : null], ['receipt', 'Средний чек', RUB(c.avg), cc && qc ? dl(cc.avg, qc.avg) : null], ['users', 'Покупатели', NUM(c.buyers), cc && qc ? dl(cc.buyers, qc.buyers) : null]].forEach(function (t, i) {
          var X = M + P + i * cw3, ix = X + (i ? 32 : 0), iw = cw3 - (i ? 32 : 0) - 16; if (i) { x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(X, Y + 326 + D, 1, 118) }
          IC(t[0], ix, Y + 326 + D, 32); font(500, 20); T(t[1], ix + 44, Y + 343 + D, 'rgba(255,255,255,.65)');
          var f2 = 46; font(500, f2); while (tw(t[2]) > iw && f2 > 30) { f2 -= 2; font(500, f2) } T(t[2], ix - 2, Y + 390 + D, '#fff');
          if (t[3]) { var pw3 = pill(t[3], ix, Y + 428 + D, 17); font(400, 16); var ct = hq ? st.dayW + ' к ' + st.hm : 'к ' + cmpSh; if (tw(ct) < iw - pw3 - 10) T(ct, ix + pw3 + 10, Y + 429 + D, 'rgba(255,255,255,.55)') } });
        /* нижняя левая карточка: план месяца или динамика */
        var Y3 = Y + hH + 20, h3 = YB - Y3;
        if (st.inMonth && !st.PAY.gross) { var pv = planOf(st.mk), got = rc.sum, last = new Date(p.a.getFullYear(), p.a.getMonth() + 1, 0), curM = key(p.b) === key(today) && p.b < last, fc = curM ? got / p.b.getDate() * last.getDate() : got, mx = Math.max(pv.ideal, fc, got) * 1.06, PX = function (v) { return Math.min(1, v / mx) };
          cardB(M, Y3, LW, h3); IC('target', M + P, Y3 + P, 44); font(500, 24); T('План на ' + MONN[p.a.getMonth()], M + P + 60, Y3 + P + 22, '#fff'); var plw = tw('План на ' + MONN[p.a.getMonth()]); font(400, 18); T('· чистыми' + (pv.def ? ' · план по умолчанию' : ''), M + P + 60 + plw + 10, Y3 + P + 23, 'rgba(255,255,255,.55)');
          x.textAlign = 'right'; font(500, 40); var ptx = Math.round(got / pv.ideal * 100) + '%'; T(ptx, M + LW - P, Y3 + P + 22, '#fff'); var ptw = tw(ptx); font(400, 18); T('от идеального плана', M + LW - P - ptw - 12, Y3 + P + 26, 'rgba(255,255,255,.5)'); x.textAlign = 'left';
          var px = M + P, pw2 = LW - 2 * P, py = Y3 + 100; rr(px, py, pw2, 14, 7); x.fillStyle = 'rgba(255,255,255,.07)'; x.fill(); var pg = x.createLinearGradient(px, 0, px + pw2, 0); pg.addColorStop(0, '#6724ad'); pg.addColorStop(1, '#c38bff'); rr(px, py, Math.max(14, pw2 * PX(got)), 14, 7); x.fillStyle = pg; x.fill();
          if (curM && fc > got) { x.save(); rr(px + pw2 * PX(got), py, pw2 * (PX(fc) - PX(got)), 14, 7); x.clip(); x.fillStyle = 'rgba(195,139,255,.22)'; x.fillRect(px, py, pw2, 14); x.restore() }
          [['мин', pv.min], ['опт', pv.opt], ['идеал', pv.ideal]].forEach(function (z, i) { var zx = px + pw2 * PX(z[1]), ok = got >= z[1]; x.fillStyle = ok ? '#4ade80' : 'rgba(255,255,255,.5)'; x.fillRect(zx - 1, py - 6, 2, 26); font(500, 16); x.textAlign = i === 2 ? 'right' : 'center'; T(z[0] + ' ' + SHORT(z[1]), i === 2 ? Math.min(zx + 1, px + pw2) : zx, py + 38, ok ? '#4ade80' : 'rgba(255,255,255,.5)'); x.textAlign = 'left' });
          var nx2 = [['минимального', pv.min], ['оптимального', pv.opt], ['идеального', pv.ideal]].filter(function (z) { return z[1] > got })[0];
          var pl1 = (curM ? 'Прогноз на месяц ' : 'Итог месяца ') + SHORT(curM ? fc : got) + ' ₽', pl2 = nx2 ? 'до ' + nx2[0] + ' плана ' + SHORT(nx2[1] - got) + ' ₽' + (curM && last.getDate() > p.b.getDate() ? ' · ' + SHORT((nx2[1] - got) / (last.getDate() - p.b.getDate())) + ' ₽ в день' : '') : 'идеальный план выполнен';
          font(500, 18); T(pl1, px, BL(Y3 + h3, 18), '#fff'); var p1w = tw(pl1); font(400, 18); T(fit('  ·  ' + pl2, pw2 - p1w), px + p1w, BL(Y3 + h3, 18), 'rgba(255,255,255,.6)') }
        else { cardB(M, Y3, LW, h3); font(500, 22); T(n1 ? 'Последние 7 дней' : 'По ' + ({ day: 'дням', week: 'неделям', month: 'месяцам' })[st.g], M + P, Y3 + P + 10, '#fff');
          var bars = n1 ? dayKeys(addD(p.a, -6), p.a).map(function (d) { return [d] }) : bucket(dayKeys(p.a, p.b), st.g), vals = bars.map(function (b) { return b.reduce(function (s2, d) { var z = st.PAY.m[key(d)]; return s2 + (z ? (md === 'gross' ? z.gross : z.sum) : 0) }, 0) }), bmx = Math.max.apply(null, vals.concat([1]));
          /* высота графика ≥ 100 px: заголовок и подписи компактнее, подпись справа — без повтора «по дням» */
          var cx0 = M + P, cw0 = LW - 2 * P, base = Y3 + h3 - P - 21, lab = n1 || (st.g === 'day' && vals.length <= 14), ch0 = base - (Y3 + P + 26 + (lab ? 22 : 0)), bwd = cw0 / vals.length;
          var part = function (b) { var a0 = b[0], z0 = b[b.length - 1]; if (st.g === 'month' && !n1) return a0.getDate() !== 1 || (addD(z0, 1).getDate() !== 1 && key(z0) !== key(today)); if (st.g === 'week' && !n1) return b.length < 7; return false };
          x.textAlign = 'right'; font(400, 17); T(md === 'gross' ? 'оплачено клиентами' : 'на вывод', M + LW - P, Y3 + P + 10, 'rgba(255,255,255,.55)'); x.textAlign = 'left';
          vals.forEach(function (v, i) { var hh = v ? Math.max(6, ch0 * v / bmx) : 4, ww = Math.max(4, Math.min(bwd - 10, 72)), isL = i === vals.length - 1 && n1, bx2 = cx0 + bwd * i + (bwd - ww) / 2; rr(bx2, base - hh, ww, hh, Math.min(8, ww / 2)); x.fillStyle = v ? ((isL || !n1) && !part(bars[i]) ? '#c38bff' : 'rgba(195,139,255,.38)') : 'rgba(255,255,255,.08)'; x.fill();
            if (lab && !n1 && v) { x.textAlign = 'center'; font(500, 15); T(SHORT(v), cx0 + bwd * i + bwd / 2, base - hh - 12, 'rgba(255,255,255,.7)'); x.textAlign = 'left' }
            if (n1) { x.textAlign = 'center'; font(500, 15); if (v) T(SHORT(v), cx0 + bwd * i + bwd / 2, base - hh - 12, isL ? '#fff' : 'rgba(255,255,255,.55)'); font(400, 15); T(WD[bars[i][0].getDay()] + ' ' + bars[i][0].getDate(), cx0 + bwd * i + bwd / 2, base + 16, isL ? '#fff' : 'rgba(255,255,255,.55)'); x.textAlign = 'left' } });
          if (!n1 && st.g === 'day' && bars.length <= 14) { x.textAlign = 'center'; font(400, 15); bars.forEach(function (b, i) { T(b[0].getDate() + ' ' + MONS3[b[0].getMonth()], cx0 + bwd * i + bwd / 2, base + 16, 'rgba(255,255,255,.55)') }); x.textAlign = 'left' }
          else if (!n1) { font(400, 16); var ax = function (b) { var d = b[0]; return st.g === 'month' ? MONA[d.getMonth()] + ' ' + d.getFullYear() : d.getDate() + ' ' + MONS3[d.getMonth()] + yS(d) }; T(ax(bars[0]), cx0, base + 16, 'rgba(255,255,255,.55)'); if (bars.length > 1) { x.textAlign = 'right'; T(ax(bars[bars.length - 1]), cx0 + cw0, base + 16, 'rgba(255,255,255,.55)'); x.textAlign = 'left' } } }
        /* что продали */
        var hP = st.fl ? 492 : YB - Y; cardB(X1, Y, RW, hP); IC('bag', X1 + P, Y + P, 44); font(500, 24); T('Что продали', X1 + P + 60, Y + P + 10, '#fff'); font(400, 17); T(st.fl ? 'продукты и тарифы · суммы ' + (md === 'gross' ? 'до комиссий' : 'на вывод') : 'продукты и тарифы · стоимость заказов', X1 + P + 60, Y + P + 36, 'rgba(255,255,255,.55)');
        if (!G.length) { font(400, 22); T(hq ? 'Сегодня продаж пока не было' : 'За период продаж не было', X1 + P, Y + P + 44 + 60, 'rgba(255,255,255,.55)') }
        else { var top0 = Y + P + 44 + 28, R = 100, dcx = X1 + P + R + 14, dcy = top0 + (Y + hP - P - top0) / 2, a0 = -Math.PI / 2, gap = G.length > 1 ? .025 : 0; x.lineWidth = 28; x.beginPath(); x.arc(dcx, dcy, R, 0, 7); x.strokeStyle = 'rgba(255,255,255,.06)'; x.stroke();
          G.forEach(function (g) { var ang = g.v / (gt || 1) * Math.PI * 2; x.beginPath(); x.arc(dcx, dcy, R, a0 + gap, a0 + Math.max(gap, ang - gap)); x.strokeStyle = g.c; x.stroke(); a0 += ang });
          x.textAlign = 'center'; font(600, 30); T(SHORT(gt), dcx, dcy - 10, '#fff'); font(400, 16); T(items.length + ' ' + pl(items.length, ['оплата', 'оплаты', 'оплат']), dcx, dcy + 22, 'rgba(255,255,255,.5)'); x.textAlign = 'left';
          var lx = X1 + P + 2 * R + 28 + 40, lw = X1 + RW - P - lx, rows = G, rh = Math.min(70, (Y + hP - P - top0) / rows.length), ly = top0 + Math.max(0, ((Y + hP - P - top0) - rh * rows.length) / 2) + 14;
          rows.forEach(function (g, i) { var yy = ly + i * rh; rr(lx, yy - 7, 14, 14, 4); x.fillStyle = g.c; x.fill(); font(600, 21); x.textAlign = 'right'; var sv = RUB(g.v); T(sv, lx + lw, yy, '#fff'); var svw = tw(sv); x.textAlign = 'left';
            font(500, 20); T(fit(g.name, lw - 26 - svw - 20), lx + 26, yy, '#fff'); var ts = g.other ? g.tars.map(function (t) { return t.name + ' ×' + t.n }).join(' · ') : g.n + ' ' + pl(g.n, ['оплата', 'оплаты', 'оплат']) + (g.inst ? ' · в рассрочку — ' + g.inst : '') + ' · ' + Math.round(g.v / (gt || 1) * 100) + '%'; font(400, 16); T(fit(ts, lw - 26), lx + 26, yy + 26, 'rgba(255,255,255,.55)') }) }
        /* как платили */
        if (st.fl) { var MM = groupMethods(st.fl.list), mt = MM.reduce(function (s2, g) { return s2 + g.net }, 0), Y4 = Y + hP + 20, h4 = YB - Y4; cardB(X1, Y4, RW, h4); IC('card', X1 + P, Y4 + P, 44); font(500, 24); T('Как платили', X1 + P + 60, Y4 + P + 22, '#fff');
          if (!MM.length) { font(400, 20); T(hq ? 'Оплат пока не было' : 'За период оплат не было', X1 + P, Y4 + P + 80, 'rgba(255,255,255,.55)') }
          var sx = X1 + P, sw = RW - 2 * P, sy = Y4 + P + 64, ax2 = sx; MM.forEach(function (g, i) { var ww = sw * g.net / (mt || 1); rr(ax2, sy, Math.max(4, ww - (i < MM.length - 1 ? 4 : 0)), 12, 6); x.fillStyle = g.c; x.fill(); ax2 += ww });
          var cwm = sw / Math.max(1, MM.length); MM.forEach(function (g, i) { var xx = sx + i * cwm, cw4 = cwm - 24; rr(xx, sy + 34, 12, 12, 3); x.fillStyle = g.c; x.fill(); font(500, 18); var mn = fit(g.name.split(' (')[0], cw4 - 60); T(mn, xx + 20, sy + 41, '#fff'); var mnw = tw(mn); font(400, 16); T('×' + g.n, xx + 28 + mnw, sy + 42, 'rgba(255,255,255,.45)');
            font(600, 24); var vv = SHORT(g.net) + ' ₽'; T(vv, xx, BL(Y4 + h4, 24), '#fff'); var vw = tw(vv); font(400, 15); T(g.fee ? '−' + (g.fee / g.sum * 100).toFixed(1).replace('.', ',') + '%' : 'без комиссии', xx + vw + 10, BL(Y4 + h4, 24) + 1, g.fee ? '#ff6b6b' : 'rgba(255,255,255,.55)') }) }
        /* подвал */
        var now = nowM(); font(400, 17); T('Данные GetCourse · сформировано ' + dd(now) + ', ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ' МСК', M, H - 38, 'rgba(255,255,255,.8)'); x.textAlign = 'right'; T('oduvanovroman.getcourse.ru', W - M, H - 38, 'rgba(255,255,255,.7)'); x.textAlign = 'left';
        return new Promise(function (res) { cv.toBlob(function (b) { res(URL.createObjectURL(b)) }, 'image/png') }) }) };
    var modal = function (url) { var p = S.view.p, m = document.createElement('div'); m.className = 'fss-modal fss';
      var name = 'Продажи ' + (key(p.a) === key(p.b) ? dd(p.a) : dd(p.a) + '–' + dd(p.b)) + '.png';
      m.innerHTML = '<div class="fss-mw"><img alt="Отчёт" src="' + url + '"><div class="fss-mb"><button type="button" class="fss-btn pri fss-sh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6"/></svg>Поделиться</button><button type="button" class="fss-btn fss-dl2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><span>Скачать PNG</span></button><button type="button" class="fss-btn fss-cp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/></svg><span>Копировать</span></button><button type="button" class="fss-btn fss-x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg><span>Закрыть</span></button></div></div>';
      document.body.appendChild(m);
      var close = function () { m.remove(); document.removeEventListener('keydown', kd) }, kd = function (e) { if (e.key === 'Escape') close() }; document.addEventListener('keydown', kd);
      m.addEventListener('click', function (e) { if (e.target === m) close() }); m.querySelector('.fss-x').onclick = close;
      m.querySelector('.fss-dl2').onclick = function () { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove() };
      /* как в «Поделиться» профиля: файл готовим заранее (share должен вызываться сразу по клику) и шлём ТОЛЬКО файл — с title/text Telegram отправляет один текст без картинки */
      var sh = m.querySelector('.fss-sh'), shF = null; fetch(url).then(function (r) { return r.blob() }).then(function (b) { shF = new File([b], name, { type: 'image/png' }) });
      sh.onclick = function () { if (!shF) return; if (navigator.canShare && navigator.canShare({ files: [shF] })) { navigator.share({ files: [shF] }).catch(function () {}); return }
        navigator.clipboard.write([new ClipboardItem({ 'image/png': shF })]).then(function () { sh.lastChild.textContent = 'Скопировано — вставь в чат' }).catch(function () { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); sh.lastChild.textContent = 'Сохранено — прикрепи в чат' }) };
      var cp = m.querySelector('.fss-cp'); cp.onclick = function () { fetch(url).then(function (r) { return r.blob() }).then(function (b) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]) }).then(function () { cp.lastChild.textContent = 'Скопировано' }).catch(function () { cp.lastChild.textContent = 'Не вышло — скачай' }) } };

    /* ---------- выбор периода ---------- */
    var perMenu = function () { var wrap = root.querySelector('.fss-per'), old = wrap.querySelector('.fss-menu'); if (old) { old.remove(); return }
      today = day0(nowM()); var t = today, items = [['today', 'Сегодня'], ['yest', 'Вчера'], ['d7', 'Последние 7 дней'], ['d28', 'Последние 28 дней'], ['d90', 'Последние 90 дней'], ['d365', 'Последние 365 дней'], ['week', 'Эта неделя'], ['month', 'Этот месяц'], ['q', 'Этот квартал'], ['pq', 'Прошлый квартал'], ['year', 'Этот год'], ['all', 'Всё время']];
      /* месяцы — сеткой по годам (а не 50 строк списком) */
      var fd = C.payV && C.payV.first, byY = {}, yl = []; for (var i = 1; i <= 60; i++) { var d = new Date(t.getFullYear(), t.getMonth() - i, 1); if (fd && new Date(d.getFullYear(), d.getMonth() + 1, 0) < fd) break; var Yk = d.getFullYear(); if (!byY[Yk]) { byY[Yk] = []; yl.push(Yk) } byY[Yk].unshift(['m' + Yk + '-' + d.getMonth(), MONA[d.getMonth()]]) }
      var bt = function (it) { var p = period(it[0]); return '<button type="button" data-k="' + it[0] + '"' + (S.k === it[0] ? ' class="on"' : '') + '>' + it[1] + '<span>' + (p.a ? human(p.a, p.b, 1) : '') + '</span></button>' };
      var bm = function (it) { return '<button type="button" data-k="' + it[0] + '"' + (S.k === it[0] ? ' class="on"' : '') + ' title="' + esc(cap(MONN[+it[0].split('-')[1]]) + ' ' + it[0].slice(1, 5)) + '">' + it[1] + '</button>' };
      var m = document.createElement('div'); m.className = 'fss-menu';
      m.innerHTML = items.slice(0, 6).map(bt).join('') + '<hr>' + items.slice(6).map(bt).join('') + (function () { var fy = fd ? fd.getFullYear() : t.getFullYear(), ys = []; for (var yy = t.getFullYear() - 1; yy >= fy; yy--) ys.push(['y' + yy, yy + ' год']); return ys.length ? '<hr><div class="lb">Год целиком</div>' + ys.map(bt).join('') : '' })()
        + (yl.length ? '<hr><div class="lb">Месяц целиком</div>' + yl.map(function (Yk) { return '<div class="yl">' + Yk + '</div><div class="fss-mg">' + byY[Yk].map(bm).join('') + '</div>' }).join('') : '')
        + '<hr><div class="lb">Свой период</div><div class="fss-cus"><input type="date" class="ca" max="' + key(t) + '"' + (fd ? ' min="' + key(fd) + '"' : '') + ' value="' + key(P().a) + '"><input type="date" class="cb" max="' + key(t) + '"' + (fd ? ' min="' + key(fd) + '"' : '') + ' value="' + key(P().b) + '"><button type="button" class="fss-btn cgo">Показать</button></div>';
      wrap.appendChild(m);
      /* меню не уезжает за край экрана (на телефоне — нижняя шторка через CSS) */
      if (window.innerWidth >= 768) { var r0 = m.getBoundingClientRect(); if (r0.left < 16) { m.style.right = 'auto'; m.style.left = (16 - wrap.getBoundingClientRect().left) + 'px' } }
      [].forEach.call(m.querySelectorAll('button[data-k]'), function (b) { b.onclick = function () { setPeriod(b.getAttribute('data-k')) } });
      m.querySelector('.cgo').onclick = function () { var a = m.querySelector('.ca').value, b = m.querySelector('.cb').value, tk = key(today); if (!a || !b) return; if (a > b) { var z = a; a = b; b = z } if (a > tk) a = tk; setPeriod('c' + a + '_' + b) /* конец обрезает period(): так «1–31 окт» узнаётся как месяц */ };
      setTimeout(function () { var off = function (e) { if (!wrap.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', off) } }; document.addEventListener('mousedown', off) }, 0) };
    var perBtn = function () { var p = P(), b = root.querySelector('.fss-per .fss-btn'); if (b) b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>' + esc(p.name) + ' <small>' + esc(p.a && S.k !== 'all' ? human(p.a, p.b, 1) : '') + '</small><svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
      root.querySelector('.fss-per').style.display = tab === 'sales' || tab === 'cumulative' ? '' : 'none'; root.querySelector('.fss-img').style.display = tab === 'sales' ? '' : 'none'; setImg() };
    var setPeriod = function (k) { S.k = k; try { sessionStorage.setItem('fssP', k) } catch (e) {} var m = root.querySelector('.fss-menu'); if (m) m.remove(); perBtn(); show() };

    /* ---------- каркас ---------- */
    /* автообновление: сбрасываем только память; заказы GetCourse в кэше вкладки остаются, догружаются лишь последние дни */
    var reload = function () { var y = window.scrollY, pl0 = C.plans; C = { plans: pl0 }; dcStale(); show(); setTimeout(function () { window.scrollTo(0, y) }, 1500) };
    var updLabel = function () { var b = root && root.querySelector('.fss-upd span'); if (!b) return; var sy = C.payV && C.payV.synced ? mskOf(C.payV.synced) : null;
      b.textContent = sy ? 'Обновлено в ' + ('0' + sy.getHours()).slice(-2) + ':' + ('0' + sy.getMinutes()).slice(-2) : 'Обновить' };
    var show = function () { today = day0(nowM()); [].forEach.call(root.querySelectorAll('.fss-tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === tab) });
      try { history.replaceState(null, '', '/pl/sales/dealstat?fs=' + tab) } catch (e) {} perBtn();
      ({ sales: renderSales, cumulative: renderCumulative, clients: renderClients, table: renderTable })[tab]() };
    var mount = function () { if (document.querySelector('.fss')) return true;
      var host = document.querySelector('.standard-page-content') || document.querySelector('.rd-page-content, .rd-page, [class*="page-content"]') || document.querySelector('.gc-main-content .container') || document.querySelector('.gc-main-content');
      if (!host) return false;
      var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); host.classList.add('fss-host');
      root = document.createElement('div'); root.className = 'fss';
      root.innerHTML = '<div class="fss-hd"><h1>Статистика</h1><div class="fss-acts"><div class="fss-per"><button type="button" class="fss-btn"></button></div>'
        + '<button type="button" class="fss-btn pri fss-img" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6"/></svg><span>Поделиться<span class="lg">&nbsp;отчётом</span></span></button>'
        + '<button type="button" class="fss-btn fss-upd" title="Подтянуть свежие оплаты"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg><span>Обновить</span></button>' + '<button type="button" class="fss-btn fss-gcv" title="Открыть стандартную страницу GetCourse" aria-label="Классическая статистика GetCourse"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M3.5 9.5h17M9.5 9.5v11"/></svg><span>GetCourse</span></button></div></div>'
        + '<div class="fss-tabs">' + TABS.map(function (t) { return '<button type="button" data-t="' + t[0] + '">' + t[1] + '</button>' }).join('') + '</div><div class="fss-body"></div>';
      host.insertBefore(root, host.firstChild); body = root.querySelector('.fss-body'); document.title = 'Статистика';
      [].forEach.call(root.querySelectorAll('.fss-tabs button'), function (b) { b.onclick = function () { tab = b.getAttribute('data-t'); show() } });
      root.querySelector('.fss-per .fss-btn').onclick = perMenu;
      root.querySelector('.fss-gcv').onclick = function () { location.href = '/pl/sales/dealstat?fs=gc' };
      var ub = root.querySelector('.fss-upd'); ub.onclick = function () { if (ub.classList.contains('ld')) return; ub.classList.add('ld'); var k = statKey();
        (k ? fetch(API + '/fin/refresh?k=' + encodeURIComponent(k)).then(function (r) { return r.json() }).catch(function () {}) : Promise.resolve()).then(function () { ub.classList.remove('ld'); reload() }) };
      setInterval(function () { if (document.hidden) return; if (key(day0(nowM())) !== key(today)) { reload(); return } /* полночь по МСК: «Сегодня», «Этот месяц» и план пересчитываются */
        var k = statKey(); if (!k || !C.payV || C.payV.gross || (tab !== 'sales' && tab !== 'cumulative')) return;
        fetch(API + '/fin?k=' + encodeURIComponent(k) + '&from=2000-01-01&to=2000-01-01').then(function (r) { return r.json() }).then(function (j) { if (j && j.ok && j.synced && j.synced !== C.payV.synced) reload() }).catch(function () {}) }, 90000);
      root.querySelector('.fss-img').onclick = function () { var b = this; b.disabled = true; card().then(function (u) { setImg(); modal(u) }).catch(function () { setImg() }) };
      show(); return true };
    var tries = 0, go = function () { if (!mount() && ++tries < 40) setTimeout(go, 150) };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();
  /* брендинг OduvanovSchool: знак «кладка» в сайдбаре + подвал на страницах кабинета */
  (function () {
    /*t*/
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
      if (mc && !window.FS_ADM && !document.querySelector('.fs-foot') && !/\/pl\/cms\/|editMode=1/.test(location.href)) { var f = document.createElement('div'); f.className = 'fs-foot';
        f.innerHTML = '<div class="fs-foot-g"><i class="fs-foot-o1"></i><i class="fs-foot-o2"></i><i class="fs-foot-o3"></i>'
          + '<a class="fs-foot-b" href="/teach/control/stream" aria-label="OduvanovSchool — на главную">' + MK('fs-mk') + '<span>Oduvanov<b>School</b></span></a>'
          + '<div class="fs-foot-c"><span>Онлайн-школа Романа Одуванова<sup>®</sup></span><small>© ' + new Date().getFullYear() + ' · Все права защищены</small></div>'
          + '<div class="fs-foot-r"><a class="fs-foot-s" href="https://www.youtube.com/@romanoduvanov" target="_blank" rel="noopener" aria-label="YouTube-канал Романа Одуванова" title="YouTube"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/></svg></a>'
          + '<a class="fs-foot-s" href="https://t.me/roduvanov" target="_blank" rel="noopener" aria-label="Telegram-канал Романа Одуванова" title="Telegram"><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="currentColor" d="M21.4 4.2 2.9 11.4c-1.3.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.8-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.8-1.3-1.5zM9.6 14.1l8.7-5.5c.4-.3.8-.1.5.2l-7.2 6.5-.3 3.1z"/></svg></a>'
          + '<a class="fs-foot-l" href="https://t.me/zabota_oduvanov" target="_blank" rel="noopener">Служба заботы <i>→</i></a></div></div>';
        if (!document.getElementById('fs-foot-s-css')) { var fst = document.createElement('style'); fst.id = 'fs-foot-s-css';
          fst.textContent = 'html body .fs-foot .fs-foot-r{display:flex;align-items:center;gap:10px;flex:none}'
            + 'html body .fs-foot .fs-foot-s{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#fff!important;background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);flex:none;transition:background .15s,transform .15s,color .15s}'
            + 'html body .fs-foot .fs-foot-s svg{display:block}'
            + 'html body .fs-foot .fs-foot-s:hover{background:rgba(255,255,255,.2);transform:translateY(-1px);color:#fccbff!important}'
            + '@media (max-width:720px){html body .fs-foot .fs-foot-r{width:100%}html body .fs-foot .fs-foot-r .fs-foot-l{flex:1;width:auto}}';
          document.head.appendChild(fst) }
        mc.appendChild(f) }
    };
    /* после 10 с опроса — только MutationObserver на меню и шапке (их перерисовывает GetCourse), без вечного setInterval (PROF-41) */
    var wt = 0, watch = function () { if (!window.MutationObserver) return; var ob = new MutationObserver(function () { if (!wt) wt = setTimeout(function () { wt = 0; put() }, 200) });
      var um = document.getElementById('gcAccountRedesignedUserMenu'), tg = um ? [um] : [].slice.call(document.querySelectorAll('.main-menu'));
      [].forEach.call(document.querySelectorAll('.top-menu'), function (x) { if (!um || !um.contains(x)) tg.push(x) }); if (!tg.length) tg = [document.body];
      tg.forEach(function (el) { ob.observe(el, { childList: true, subtree: true }) }) };
    var n = 0, iv = setInterval(function () { put(); if (++n > 40) { clearInterval(iv); watch() } }, 250);
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
        var acts = document.createElement('div'); acts.className = 'fs-acts'; var lk = c.querySelector('.xdget-profileLike'); if (lk) { if (uid && String(uid) === pm[1]) lk.remove(); else acts.appendChild(lk) } c.appendChild(acts);
        c.classList.add('fs-tidy'); return true };
      if (!tidy()) document.addEventListener('DOMContentLoaded', tidy) }
    /* ссылки GetCourse на белые страницы без темы → наши страницы (PROF-15, PROF-35): «Мой профиль» → /pl/<id>, «Профиль»/«Сменить пароль» → настройки,
       «Все уведомления» → настройки уведомлений, «Приложение» → бот школы в Telegram. Работает везде, где грузится layout.js (меню, выпадающие списки) */
    var BOT = 'https://t.me/oduvanov_school_bot';
    if (uid) document.addEventListener('click', function (e) { if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || !e.target.closest) return;
      var own = pm && String(uid) === pm[1] && window.fsOpenSettings, stop = function () { e.preventDefault(); e.stopPropagation() };
      var a = e.target.closest('a[href]'), hd = !a && e.target.closest('.main-menu-item__header');
      if (hd) { var it = hd.closest('.main-menu-item'), tx = it && it.querySelector('.main-menu-item__text');
        if (it && ((tx && tx.textContent.trim() === 'Приложение') || it.querySelector('svg[iconurl*="chatium"]'))) { stop(); window.open(BOT, '_blank', 'noopener') } return }
      if (!a) return; var hr = a.getAttribute('href') || '', inMenu = a.closest('.main-menu');
      if (/\/user\/my\/profile(?:[?#]|$)/.test(hr)) { stop(); if (own && !inMenu) { window.fsOpenSettings(); return } location.href = '/pl/' + uid + (inMenu ? '' : '#settings'); return }
      if (/\/user\/my\/changePassword/.test(hr)) { stop(); if (own) { window.fsOpenSettings('pw'); return } location.href = '/pl/' + uid + '#settings-pw'; return }
      if (/\/notifications\/notifications\/all/.test(hr)) { stop(); location.href = '/pl/notifications/settings/my'; return }
      if (/\/pl\/(?:chatium\/school\/enter|chtm\/app)/.test(hr)) { stop(); window.open(BOT, '_blank', 'noopener') } }, true);
    if (pm && (String(uid) === pm[1])) { var addBtn = function () { var c = document.querySelector('.xdget-userProfileSystemPage .col-md-3'); if (!c || c.querySelector('.fs-set')) return !!c;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'fs-set'; b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg><span>Настройки</span>'; b.onclick = function () { window.fsOpenSettings() }; (c.querySelector('.fs-acts') || c).appendChild(b); return true };
      if (!addBtn()) document.addEventListener('DOMContentLoaded', addBtn);

      /* ===== настройки профиля в нашем стиле (вместо стандартной страницы «Мой профиль») ===== */
      window.fsOpenSettings = function (sec) { var ov = document.getElementById('fsd');
        if (!ov) { ov = document.createElement('div'); ov.id = 'fsd'; ov.className = 'fsd'; ov.innerHTML = '<div class="fsd-p" role="dialog" aria-modal="true" aria-label="Настройки профиля"><div class="fsd-h"><b>Настройки профиля</b><button type="button" class="fsd-x" aria-label="Закрыть">×</button></div><div class="fsd-b"><div class="fsd-load"><i></i><i></i><i></i><i></i></div></div><div class="fsd-f"><span class="fsd-s"></span><button type="button" class="fsd-save" disabled>Сохранить</button></div></div>';
          document.body.appendChild(ov); ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.fsd-x')) close() });
          document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('on')) close() }) }
        function close() { ov.classList.remove('on'); document.documentElement.style.overflow = ''; document.documentElement.classList.remove('fs-fsd-open'); if (/^#settings/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search) }
        /* без requestAnimationFrame: в фоновой вкладке он откладывается и панель не появлялась (PROF-06) */
        void ov.offsetWidth; ov.classList.add('on'); document.documentElement.classList.add('fs-fsd-open'); document.documentElement.style.overflow = 'hidden'; load(ov, sec) };
      function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
      function getForm() { return fetch('/user/my/profile', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.text() }).then(function (t) {
        var d = new DOMParser().parseFromString(t, 'text/html'); var f = [].filter.call(d.forms, function (x) { return x.querySelector('[name="User[first_name]"]') })[0]; return { d: d, f: f, t: t } }) }
      function load(ov, sec) { var body = ov.querySelector('.fsd-b'), save = ov.querySelector('.fsd-save'), st = ov.querySelector('.fsd-s');
        getForm().then(function (g) { if (!g.f) throw 0; var f = g.f, v = function (n) { var e = f.querySelector('[name="' + n + '"]:not([type=hidden])') || f.querySelector('[name="' + n + '"]'); return e ? e.value : '' };
          var em = (g.t.match(/<strong>E-mail<\/strong>:\s*([^<\s]+)/) || [])[1] || '', ok = /title="Эл\. адрес подтвержден"/.test(g.t), hasPw = !!f.querySelector('[name="ChangePasswordForm[primaryPassword]"]');
          var cb = f.querySelector('input[type=checkbox][name^="mailingCategories"]'), sub = v('User[subscribe_status]'), tr = v('UserMessenger[main_transport_id]');
          var bd = v('User[birthday]'), bdIso = /^(\d{2})\.(\d{2})\.(\d{4})$/.test(bd) ? bd.replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, '$3-$2-$1') : '';
          var g2 = v('User[gender]'), lang = v('User[language]');
          var fld = function (k, label, val, type, ph) { return '<label class="fsd-fl"><span>' + label + '</span><input data-k="' + k + '" type="' + (type || 'text') + '" value="' + esc(val) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '></label>' };
          var seg = function (k, val, opts) { return '<div class="fsd-seg" data-k="' + k + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '"' + (o[0] === val ? ' class="on"' : '') + '>' + o[1] + '</button>' }).join('') + '</div>' };
          body.innerHTML =
            '<section><h4>Аватар</h4><div class="fsd-ava">' + (function () { var im = document.querySelector('.xdget-profileAvatar img'), s = im ? im.getAttribute('src') || '' : '';
              if (s && !/default_profile|user-default-profile|no-?avatar/i.test(s) && !(im.classList.contains('user-default-profile-image') && !/^data:/.test(s))) return '<div class="fsd-av" style="background-image:url(' + esc(im.src) + ')"></div>';
              var ii = (v('User[first_name]') + ' ' + v('User[last_name]')).trim().split(/\s+/).map(function (x) { return x.charAt(0) }).join('').slice(0, 2).toUpperCase();
              return '<div class="fsd-av fsd-av0" aria-hidden="true">' + (ii ? esc(ii) : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>') + '</div>' })() + '<div><b>Фото профиля</b><span>Его видят в сайдбаре, чатах и рейтинге потока</span><button type="button" class="fsd-btn2 fsd-avbtn">Загрузить новое фото</button></div></div></section>' +
            '<section><h4>Основное</h4><div class="fsd-g2">' + fld('User[first_name]', 'Имя', v('User[first_name]')) + fld('User[last_name]', 'Фамилия', v('User[last_name]')) +
              '<label class="fsd-fl"><span>День рождения</span><input data-k="bd" type="date" value="' + bdIso + '" max="' + new Date().toISOString().slice(0, 10) + '"></label>' + fld('User[phone]', 'Телефон', v('User[phone]'), 'tel', '+7 900 000-00-00') +
              fld('User[country]', 'Страна', v('User[country]')) + fld('User[city]', 'Город', v('User[city]')) + '</div>' +
              '<div class="fsd-fl"><span>Пол</span>' + seg('User[gender]', g2, [['', 'Не указан'], ['male', 'Мужской'], ['female', 'Женский']]) + '</div>' +
              '<label class="fsd-fl"><span>О себе</span><textarea data-k="user_content" rows="3" placeholder="Пара слов о тебе: чем занимаешься, к чему идёшь">' + esc(v('user_content')) + '</textarea></label></section>' +
            '<section><h4>Почта и вход</h4><div class="fsd-mail"><div><b>' + esc(em) + '</b><span class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ Почта подтверждена' : 'Почта не подтверждена — без этого можно пропустить важные письма') + '</span></div>' + (ok ? '' : '<button type="button" class="fsd-btn2 fsd-conf">Отправить письмо</button>') + '</div>' +
              '<details class="fsd-pw"><summary>' + (hasPw ? 'Сменить пароль' : 'Установить пароль') + '</summary><div class="fsd-g2">' + (hasPw ? '<label class="fsd-fl"><span>Текущий пароль</span><input data-k="ChangePasswordForm[primaryPassword]" type="password" autocomplete="current-password"></label>' : '') +
              '<label class="fsd-fl"><span>Новый пароль</span><input data-k="ChangePasswordForm[password]" type="password" autocomplete="new-password"></label><label class="fsd-fl"><span>Повтори пароль</span><input data-k="ChangePasswordForm[confirmPassword]" type="password" autocomplete="new-password"></label></div></details>' +
              (function () { var cd = g.d.querySelector('a[href*="historypaymentcard"]'), so = [].filter.call(g.d.querySelectorAll('a[href*="loginWith"]'), function (x) { return /vk|yandex/i.test(x.getAttribute('href')) });
                return (so.length ? '<div class="fsd-soc"><span>Вход через</span>' + so.map(function (x) { return '<a class="fsd-btn2" href="' + esc(x.getAttribute('href')) + '">' + (/yandex/i.test(x.getAttribute('href')) ? 'Яндекс ID' : 'ВКонтакте') + '</a>' }).join('') + '</div>' : '')
                  + (cd ? '<a class="fsd-lnk" href="' + esc(cd.getAttribute('href')) + '">Привязанные карты и&nbsp;телефоны <i>→</i></a>' : '') })() + '</section>' +
            '<section><h4>Уведомления</h4><div class="fsd-fl"><span>Какие письма получать</span>' + seg('User[subscribe_status]', sub, [['all', 'Все сообщения'], ['no_mailings', 'Только уведомления'], ['disabled', 'Ничего']]) + '</div>' +
              (cb ? '<label class="fsd-ck"><input type="checkbox" data-k="mc"' + (cb.checked ? ' checked' : '') + '><i></i><span>Общие рассылки школы — анонсы, эфиры, полезное</span></label>' : '') +
              '<div class="fsd-fl"><span>Куда присылать сообщения</span>' + seg('UserMessenger[main_transport_id]', tr || '0', [['0', 'Автоматически'], ['3', 'Telegram']]) + '</div>' +
              '<div class="fsd-fl"><span>Язык интерфейса</span>' + seg('User[language]', lang, (function () { var LN = { '': 'По умолчанию', ru: 'Русский', en: 'Английский', es: 'Испанский', de: 'Немецкий', fr: 'Французский', uk: 'Украинский', kk: 'Казахский' }, o = [].map.call(f.querySelectorAll('[name="User[language]"] option'), function (x) { return [x.value, LN[x.value] || x.textContent.trim()] });
                if (!o.length) o = [['', LN['']], ['ru', LN.ru], ['en', LN.en]]; return o.sort(function (a, b) { var r = function (k) { return k === '' ? 0 : k === 'ru' ? 1 : 2 }; return r(a[0]) - r(b[0]) }) })()) + '</div>' +
              '<div class="fsd-lnks"><a class="fsd-lnk" href="/pl/notifications/settings/my">Тонкая настройка уведомлений <i>→</i></a><a class="fsd-lnk" href="/pl/notifications/every-day-notification">Ежедневные уведомления <i>→</i></a></div></section>';
          body.querySelectorAll('.fsd-seg').forEach(function (s) { s.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; s.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b) }); dirty() }) });
          body.addEventListener('input', dirty); body.addEventListener('change', dirty);
          if (sec === 'pw') { var pwd = body.querySelector('.fsd-pw'); if (pwd) { pwd.open = true; setTimeout(function () { pwd.scrollIntoView({ block: 'center' }); var i0 = pwd.querySelector('input'); if (i0) i0.focus() }, 320) } }
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
            var op = body.querySelector('[data-k="ChangePasswordForm[primaryPassword]"]'); if (np && np.value && op && !op.value) { save.disabled = false; save.textContent = 'Сохранить'; say('Введи текущий пароль', 1); op.focus(); return }
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
      var hSec = function () { return location.hash === '#settings-pw' ? 'pw' : '' }, isSet = function () { return /^#settings(-pw)?$/.test(location.hash) };
      if (isSet()) { var tryOpen = function () { if (document.body) window.fsOpenSettings(hSec()); else setTimeout(tryOpen, 50) }; setTimeout(tryOpen, 400) }
      addEventListener('hashchange', function () { if (isSet()) window.fsOpenSettings(hSec()) });
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
      /* профиль без строки в рейтинге (админ, куратор, ученик другого продукта) — пустое состояние вместо пустой колонки (PROF-07) */
      var profEmpty = function (f) { var col = f.parentNode; if (!col || col.querySelector('.fs-prof-empty')) return; var own = String(uid) === pm[1], d = document.createElement('div'); d.className = 'fs-prof-empty';
        d.innerHTML = '<div class="fs-pe-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/></svg></div>'
          + '<div class="fs-pe-t">' + (own ? 'Ты пока не&nbsp;в&nbsp;рейтинге потока' : 'Ученика пока нет в&nbsp;рейтинге потока') + '</div>'
          + '<div class="fs-pe-d">' + (own ? 'Рейтинг ведётся на&nbsp;курсе «AI-креатор с&nbsp;0 до&nbsp;PRO&nbsp;2.0»: баллы за&nbsp;уроки, анкеты и&nbsp;домашки. Он&nbsp;пересчитывается утром и&nbsp;вечером&nbsp;— после первого урока ты&nbsp;появишься здесь.' : 'Рейтинг ведётся на&nbsp;курсе «AI-креатор с&nbsp;0 до&nbsp;PRO&nbsp;2.0» и&nbsp;пересчитывается утром и&nbsp;вечером.') + '</div>'
          + (own ? '<div class="fs-pe-a"><a class="fs-pe-b" href="/teach/control/stream">Перейти к&nbsp;обучению</a><a class="fs-pe-b2" href="/sales/control/userProduct/my">Мои покупки</a></div>' : '');
        col.appendChild(d); col.classList.add('fs-pe-on') };
      if (!ins()) document.addEventListener('DOMContentLoaded', ins);
      window.addEventListener('message', function (e) { if (e.origin !== 'https://romanoduvanov.github.io' || !e.data || e.data.fsProfH === undefined) return;
        [].forEach.call(document.querySelectorAll('iframe.fs-prof'), function (f) { f.style.setProperty('height', Math.ceil(e.data.fsProfH) + 'px', 'important');
          var sk = f.parentNode && f.parentNode.querySelector('.fs-prof-sk'); if (sk) sk.remove();
          if (e.data.fsProfH > 0) { f.classList.add('on'); var pe = f.parentNode && f.parentNode.querySelector('.fs-prof-empty'); if (pe) { pe.remove(); f.parentNode.classList.remove('fs-pe-on') } } else profEmpty(f) }) }) }
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
      /* подтверждение в стиле кабинета вместо системного confirm() (CODE-32) */
      var fsAsk = function (o) { return new Promise(function (res) { var m = document.createElement('div'), R = document.documentElement; m.className = 'fs-shm fs-cf';
        m.innerHTML = '<div class="fs-shm-b fs-cf-b" role="alertdialog" aria-modal="true" aria-labelledby="fsCfT"><div class="fs-shm-h" id="fsCfT">' + o.t + '</div>' + (o.d ? '<div class="fs-cf-d">' + o.d + '</div>' : '') + '<div class="fs-cf-a"><button type="button" class="fs-cf-no">' + o.no + '</button><button type="button" class="fs-cf-ok">' + o.ok + '</button></div></div>';
        document.body.appendChild(m);
        var kd = function (e) { if (e.key === 'Escape') { e.stopPropagation(); end(false) } }, end = function (v) { m.classList.remove('on'); R.classList.remove('fs-shm-open'); document.removeEventListener('keydown', kd, true); setTimeout(function () { m.remove() }, 250); res(v) };
        m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('.fs-cf-no')) end(false); else if (e.target.closest('.fs-cf-ok')) end(true) });
        document.addEventListener('keydown', kd, true); void m.offsetWidth; m.classList.add('on'); R.classList.add('fs-shm-open'); m.querySelector('.fs-cf-no').focus() }) };
      var pLoad = function () { fetch(API + '/parent?u=' + uid).then(function (r) { return r.json() }).then(function (j) { pState = j.p; pRender() }).catch(function () {}) };
      var pBlock = function () { if (pEl) return; var after = document.querySelector('.fs-share') || document.querySelector('.xdget-userProfileSystemPage .col-md-3'); if (!after) return;
        pEl = document.createElement('div'); pEl.className = 'fs-pr'; after.after(pEl); document.documentElement.classList.add('fs-has-pr'); pRender(); pLoad();
        pEl.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (!b) return; if (b.getAttribute('data-a') === 'edit') pOpen(); if (b.getAttribute('data-a') === 'link' && pState) pOpen(pState.tg_link); if (b.getAttribute('data-a') === 'off') fsAsk({ t: 'Отключить отчёт для&nbsp;родителей?', d: 'Родитель перестанет получать отчёты о&nbsp;твоей учёбе. Включить снова можно в&nbsp;любой момент.', no: 'Оставить', ok: 'Отключить' }).then(function (ok) { if (ok) fetch(API + '/parent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ u: uid, off: 1 }) }).then(pLoad) }) }) };
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
  /* высота виджета «Актуальные события + кейсы» в списке тренингов; до готовности — скелетон (UCH-03) */
  (function () { var GH = 'https://romanoduvanov.github.io', tm = {};
    var show = function (f) { if (!f || f.getAttribute('data-fs-w') !== '1') return; f.setAttribute('data-fs-w', '2'); f.style.removeProperty('opacity'); var sk = f.parentNode && f.parentNode.querySelector('.fs-sched-sk'); if (sk) { sk.classList.add('out'); setTimeout(function () { sk.remove() }, 260) } };
    var mark = function () { [].forEach.call(document.querySelectorAll('iframe.fs-sched:not([data-fs-w])'), function (f) { f.setAttribute('data-fs-w', '1'); f.style.setProperty('opacity', '0');
      var b = f.parentNode; b.classList.add('fs-sched-w'); var sk = document.createElement('div'); sk.className = 'fs-sched-sk'; sk.setAttribute('aria-hidden', 'true'); sk.innerHTML = '<div><i></i><i></i><i></i></div><div class="k"><i></i><i></i></div>'; b.insertBefore(sk, f); setTimeout(function () { show(f) }, 3000) }) };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark); else mark();
    window.addEventListener('message', function (e) { if (e.origin !== GH || !e.data) return;
      if (e.data.fsSchedH) [].forEach.call(document.querySelectorAll('iframe.fs-sched'), function (f) { f.style.setProperty('height', Math.ceil(e.data.fsSchedH) + 'px', 'important');
        if (e.data.fsSchedReady) show(f); else { clearTimeout(tm.s); tm.s = setTimeout(function () { show(f) }, 700) } });
      /* высота iframe рейтинга на странице курса — по содержимому (UCH-07, MOB-15); только от нового embed.html (fsEmbedV 2: высота body, а не scrollHeight, который не даёт iframe уменьшиться) */
      if (e.data.fsEmbedHeight > 0 && e.data.fsEmbedV >= 2) [].forEach.call(document.querySelectorAll('iframe.fs-embed'), function (f) { if (f.contentWindow === e.source) f.style.setProperty('height', Math.ceil(e.data.fsEmbedHeight) + 'px', 'important') }) }) })();
  /* нет доступа к потоку AI-креатор 2.0 — в виджете остаются только «Истории учеников» */
  (function () { var na = function () { if (document.querySelector('tr.training-row[data-training-id="935917158"]')) return;
      [].forEach.call(document.querySelectorAll('iframe.fs-sched'), function (f) { if (f.src.indexOf('#na=1') < 0) f.src = f.src.split('#')[0] + '#na=1' }) };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', na); else na() })();
  if (!/^\/(pl\/)?teach\/control\/schedule/.test(location.pathname)) return;
  /* расписание: модули, части и даты — из data.json рейтинга (1 запрос); из GetCourse — только какие модули доступны ученику (страница курса, кэш на сутки).
     Модули, которых нет в data.json, дочитываются обходом их страниц. Время везде по Москве: модули открываются в 12:00 МСК, ×2 — 48 ч (уроки и анкеты) и 72 ч (домашки) от открытия. */
  var ROOT = '935917158', SKIP = {'935952152': 1}, RT = 'https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/', MSK = 3 * 36e5, NB = ' ';
  var MON = {'янв':0,'фев':1,'мар':2,'апр':3,'мая':4,'май':4,'июн':5,'июл':6,'авг':7,'сен':8,'окт':9,'ноя':10,'дек':11};
  var MS = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'], WD = ['вс','пн','вт','ср','чт','пт','сб'];
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function mk(t){var d=new Date(+t+MSK);return {y:d.getUTCFullYear(),mo:d.getUTCMonth(),d:d.getUTCDate(),h:d.getUTCHours(),mi:d.getUTCMinutes(),wd:d.getUTCDay()}}
  /* даты GetCourse (время аккаунта — Москва): «Пн 12 Окт 12:00», «Недоступен до 02 Ноя 12:00», «сегодня/завтра/вчера 12:00», «25 октября в 10:00» */
  function pd(s){s=String(s||'').toLowerCase();var n=mk(Date.now()),m=/(сегодня|завтра|вчера)\D{0,8}(\d{1,2}):(\d{2})/.exec(s);
    if(m)return new Date(Date.UTC(n.y,n.mo,n.d+{'вчера':-1,'сегодня':0,'завтра':1}[m[1]],+m[2],+m[3])-MSK);
    m=/(\d{1,2})\s+([а-я]{3})[а-я]*\.?(?:\s+(\d{4}))?(?:\D{1,6}?(\d{1,2}):(\d{2}))?/.exec(s);if(!m||MON[m[2]]==null)return null;
    var y=m[3]?+m[3]:n.y,at=function(yy){return Date.UTC(yy,MON[m[2]],+m[1],m[4]?+m[4]:0,m[5]?+m[5]:0)-MSK},t=at(y);
    if(!m[3]){if(t-Date.now()>200*864e5)t=at(y-1);else if(Date.now()-t>200*864e5)t=at(y+1)}return new Date(t)}
  function get(u){return fetch(u,{credentials:'same-origin'}).then(function(r){return r.ok?r.text():''}).then(function(t){return new DOMParser().parseFromString(t,'text/html')})}
  function walk(id,name,parts){return get('/teach/control/stream/view/id/'+id).then(function(d){
    var ls=[].slice.call(d.querySelectorAll('ul.lesson-list>li[data-lesson-id]')).map(function(li){var t=li.querySelector('.title');
      return {id:li.getAttribute('data-lesson-id'),t:((t&&t.childNodes[0]&&t.childNodes[0].textContent)||'').replace(/\s+/g,' ').trim(),d:pd((li.querySelector('.lesson-date')||{}).textContent)}});
    if(ls.length)parts.push({name:name,at:ls.map(function(l){return l.d}).filter(Boolean).sort(function(a,b){return a-b})[0]||null,lessons:ls});
    var rows=[].slice.call(d.querySelectorAll('.stream-table tr.training-row'));
    return rows.reduce(function(p,tr){return p.then(function(){var st=tr.querySelector('.stream-title');return walk(tr.getAttribute('data-training-id'),(name?name+' / ':'')+(st?st.textContent.trim():''),parts)})},Promise.resolve())})}
  function when(d){var m=mk(d);return m.d+' '+MS[m.mo]}
  function hm(d){var m=mk(d);return ('0'+m.h).slice(-2)+':'+('0'+m.mi).slice(-2)}
  function pl(n,f){n=Math.abs(n)%100;var a=n%10;return n>10&&n<20?f[2]:a>1&&a<5?f[1]:a==1?f[0]:f[2]}
  function tag(at){if(!at)return '<span class="fs-sch-t soon">Скоро</span>';var now=Date.now(),h=(now-at)/36e5;
    if(h>=0&&h<48)return '<span class="fs-sch-t x2">×2 ещё '+Math.max(1,Math.ceil(48-h))+NB+'ч</span>';
    if(h>=48&&h<72)return '<span class="fs-sch-t x2">×2 за ДЗ ещё '+Math.max(1,Math.ceil(72-h))+NB+'ч</span>';
    if(h>=72)return '<span class="fs-sch-t open">Открыт</span>';
    var a=mk(at),b=mk(now),days=Math.round((Date.UTC(a.y,a.mo,a.d)-Date.UTC(b.y,b.mo,b.d))/864e5);
    return '<span class="fs-sch-t soon">'+(days<=0?'Сегодня':days===1?'Завтра':'Через '+days+NB+pl(days,['день','дня','дней']))+'</span>'}
  function render(box,mods){var now=Date.now();
    mods=mods.slice().sort(function(a,b){return (a.at?+a.at:9e15)-(b.at?+b.at:9e15)});
    var openIdx=mods.findIndex(function(m){return m.at&&(now-m.at)/36e5<48});
    box.innerHTML='<div class="fs-sch-note">Модули открываются в'+NB+'12:00 по'+NB+'Москве. Первые 48'+NB+'часов после открытия — ×2 к'+NB+'баллам за'+NB+'уроки и'+NB+'анкеты, 72'+NB+'часа — за'+NB+'домашки.</div>'+mods.map(function(m,i){var h=m.at?(now-m.at)/36e5:-1;
      var n=m.parts.reduce(function(s,p){return s+p.lessons.length},0);
      var cls='fs-sch-m'+(h>=0&&h<72?' now':h>=72?' past':'')+(i===openIdx||(openIdx<0&&i===mods.length-1)?' open':'');
      return '<div class="'+cls+'"><div class="fs-sch-h" role="button" tabindex="0" aria-expanded="'+(/ open/.test(cls)?'true':'false')+'"><div class="fs-sch-d">'+(m.at?'<b>'+when(m.at)+'</b><span>'+WD[mk(m.at).wd]+', '+hm(m.at)+NB+'МСК</span>':'<b>Скоро</b><span>дата уточняется</span>')+'</div>'+
        '<div class="fs-sch-n"><b>'+esc(m.name)+'</b><span>'+n+' '+pl(n,['урок','урока','уроков'])+'</span></div>'+tag(m.at)+
        '<div class="fs-sch-c"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></div></div>'+
        '<div class="fs-sch-b">'+m.parts.map(function(p){var pa=p.at;
          return '<div class="fs-sch-p">'+(p.name||pa?'<div><span>'+esc(p.name||'Уроки')+'</span>'+(pa?'<span>'+when(pa)+', '+hm(pa)+NB+'МСК</span>':'')+'</div>':'')+
            '<ol>'+p.lessons.map(function(l){return '<li><a href="/pl/teach/control/lesson/view?id='+l.id+'">'+esc(l.t)+'</a></li>'}).join('')+'</ol></div>'}).join('')+'</div></div>'}).join('');
    [].forEach.call(box.querySelectorAll('.fs-sch-h'),function(h){function t(){var o=h.parentNode.classList.toggle('open');h.setAttribute('aria-expanded',o?'true':'false')}h.addEventListener('click',t);h.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();t()}})})}
  function revive(m){return {id:String(m.id),name:m.name,at:m.at?new Date(m.at):null,parts:(m.parts||[]).map(function(p){return {name:String(p.name||'').replace(/ /g,' '),at:p.at?new Date(p.at):null,lessons:p.lessons||[]}})}}
  function start(){var c=document.querySelector('.standard-page-content');if(!c||c.querySelector('.fs-sch'))return;
    var tbl=c.querySelector('table'),adm=!!document.querySelector('.gc-user-admin'),LS={g:function(k){try{return localStorage.getItem(k)}catch(e){return null}},s:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
    var box=document.createElement('div');box.className='fs-sch';box.innerHTML='<div class="fs-sch-load"></div><div class="fs-sch-load"></div><div class="fs-sch-load"></div>';
    (tbl?tbl.parentNode.insertBefore(box,tbl):c.appendChild(box));
    /* админу: переключатель «Как у учеников / Все уроки» (таблица GetCourse по всем тренингам); ?fs=gc — сразу таблица */
    var view=function(gc){box.style.display=gc?'none':'';if(tbl){tbl.style.display=gc?'':'none';tbl.classList.toggle('fs-sch-gc',gc)}if(sw)[].forEach.call(sw.querySelectorAll('button'),function(b){var on=(b.getAttribute('data-v')==='gc')===gc;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')})};
    var sw=null;if(adm&&tbl){sw=document.createElement('div');sw.className='fs-sch-sw';sw.setAttribute('role','group');sw.setAttribute('aria-label','Вид расписания');
      sw.innerHTML='<button type="button" data-v="st">Как у учеников</button><button type="button" data-v="gc">Все уроки</button>';box.parentNode.insertBefore(sw,box);
      sw.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var gc=b.getAttribute('data-v')==='gc';LS.s('fsSchView',gc?'gc':'st');view(gc)})}
    view(!!tbl&&(/[?&]fs=gc/.test(location.search)||(adm&&LS.g('fsSchView')==='gc')));
    var U=window.accountUserId||0,AK='fsSch2:'+U,acc=null;try{var c0=JSON.parse(LS.g(AK)||'null');if(c0&&Date.now()-c0.ts<864e5)acc=c0}catch(e){}
    var accP=acc?Promise.resolve(acc):get('/teach/control/stream/view/id/'+ROOT).then(function(d){
      var rows=[].slice.call(d.querySelectorAll('.stream-table tr.training-row')).filter(function(tr){return !SKIP[tr.getAttribute('data-training-id')]});
      if(!rows.length)throw new Error('no rows');
      return {ts:Date.now(),ids:rows.map(function(tr){return tr.getAttribute('data-training-id')}),names:rows.map(function(tr){var st=tr.querySelector('.stream-title');return st?st.textContent.replace(/\s+/g,' ').trim():''}),extra:{}}});
    var API=window.FS_API&&String(window.FS_API).indexOf('http')===0?window.FS_API:'';var dP=fetch(RT+'data.json',{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).catch(function(){return API?fetch(API+'/sched').then(function(r){return r.json()}).then(function(j){return j&&j.modules?{modules:j.modules}:null}):null}).catch(function(){return null});
    Promise.all([accP,dP]).then(function(r){var A=r[0],D=r[1]||{},byId={};(D.modules||[]).forEach(function(m){byId[String(m.id)]=m});
      var miss=A.ids.filter(function(id){return !byId[id]&&!(A.extra&&A.extra[id])});
      return Promise.all(miss.map(function(id){var parts=[];return walk(id,'',parts).then(function(){var ds=parts.map(function(p){return p.at}).filter(Boolean);
        A.extra=A.extra||{};A.extra[id]={id:id,name:A.names[A.ids.indexOf(id)],at:ds.length?new Date(Math.min.apply(null,ds)):null,parts:parts.map(function(p){return {name:p.name,at:p.at,lessons:p.lessons.map(function(l){return {id:l.id,t:l.t}})}})}})})).then(function(){
        LS.s(AK,JSON.stringify(A));
        render(box,A.ids.map(function(id,k){var m=byId[id]?revive(byId[id]):A.extra[id]?revive(A.extra[id]):null;if(m&&A.names[k])m.name=A.names[k];return m}).filter(function(m){return m&&m.parts.length}))})})
      .catch(function(){box.remove();if(sw)sw.remove();if(tbl)tbl.style.display=''})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();

/* ===== v42-FMP: плашки GetCourse и «Подключи Telegram» — в потоке страницы над контентом (PROF-38, STU-11). Закрытие — только до перехода/обновления: плашки должны напоминать (решение Романа) ===== */
(function () {
  /*t*/
  var DAY = 864e5, off = {}; try { localStorage.removeItem('fsNtcOff') } catch (e) {}
  var key = function (p) { if (p.classList.contains('fs-tgn')) return 'tg'; if (p.getAttribute('data-fs-kind') === 'email' || /почт|e-?mail/i.test(p.textContent)) return 'email';
    return 'n:' + p.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) };
  var box = null, ensure = function () { if (box && box.isConnected) return box; var mc = document.querySelector('.gc-main-content'); if (!mc) return null;
    box = document.createElement('div'); box.className = 'fs-ntc'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Уведомления'); mc.insertBefore(box, mc.firstChild); return box };
  var fixText = function (p) { var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null), n; while ((n = w.nextNode())) { var v = n.nodeValue.replace(/подтвержден(?![а-яё])/g, 'подтверждён'); if (v !== n.nodeValue) n.nodeValue = v } };
  var run = function () { var ps = document.querySelectorAll('.notice-top-panel'); if (!ps.length) return;
    [].forEach.call(ps, function (p) { var k = key(p);
      if (off[k] && Date.now() - off[k] < DAY) { if (p.classList.contains('fs-tgn')) p.remove(); else p.style.setProperty('display', 'none', 'important'); return }
      if (!p.__fsTx) { p.__fsTx = 1; fixText(p) }
      if (p.closest('.fs-ntc')) return; var b = ensure(); if (!b) return; var host = p.closest('#redesignedNoticeTopPanel'); b.appendChild(host || p) });
    document.documentElement.classList.toggle('fs-ntc-on', !!(box && box.querySelector('.notice-top-panel:not([style*="none"])'))) };
  document.addEventListener('click', function (e) { var c = e.target.closest && e.target.closest('.notice-top-panel .close-link'); if (!c) return;
    off[key(c.closest('.notice-top-panel'))] = Date.now(); setTimeout(run, 60) }, true);
  var t = 0, deb = function () { if (!t) t = setTimeout(function () { t = 0; run() }, 120) };
  var go = function () { run(); try { var mo = new MutationObserver(deb); mo.observe(document.body, { childList: true, subtree: true }); setTimeout(function () { mo.disconnect() }, 30000) } catch (e) {} };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
/* ===== v42-FMP: меню — счётчик «Мои покупки» без убранных заказов (STU-12), «Все уведомления» → настройки уведомлений (PROF-35) ===== */
(function () {
  /*t*/ var U = window.accountUserId; if (!U) return;
  var fix = function () { var mm = document.querySelector('.main-menu');
    if (mm) [].forEach.call(mm.querySelectorAll('.main-menu-item'), function (it) { var tx = it.querySelector('.main-menu-item__text'); if (!tx || !/^Мои покупки$/.test(tx.textContent.trim())) return;
      /* текст бейджа не трогаем (его ведёт GetCourse) — подменяем число через ::after */
      [].forEach.call(it.querySelectorAll('.menu-badge'), function (bd) { var n = parseInt(bd.textContent.trim(), 10), c = null; try { c = JSON.parse(localStorage.getItem('fmpCnt:' + U) || 'null') } catch (e) {}
        var on = !!(c && n > 0 && n === c.n && c.v < n), v = on ? Math.max(0, c.v | 0) : 0;
        bd.classList.toggle('fs-bdg-off', on && v === 0); bd.classList.toggle('fs-bdg-alt', on && v > 0); if (on && v > 0) bd.setAttribute('data-fs-v', String(v)); else bd.removeAttribute('data-fs-v') }) });
    [].forEach.call(document.querySelectorAll('a[href*="/notifications/notifications/all"]'), function (a) { if (a.textContent.trim() !== 'Настройки уведомлений') a.textContent = 'Настройки уведомлений'; a.setAttribute('href', '/pl/notifications/settings/my') }) };
  window.FS_BADGE = fix;
  var t = 0, deb = function () { if (!t) t = setTimeout(function () { t = 0; fix() }, 150) };
  var go = function () { fix(); try { var mo = new MutationObserver(deb), tg = document.getElementById('gcAccountRedesignedUserMenu') || document.querySelector('.main-menu') || document.body; mo.observe(tg, { childList: true, subtree: true, characterData: true }) } catch (e) {} };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

  /* ===== закрытый урок: /pl/teach/control/lesson/not-reached?id=… — карточка «Урок ещё не открыт» вместо красной рамки «Нет доступа» (STU-07) ===== */
  (function () {
    /*t*/
    if (!/\/teach\/control\/lesson\/not-reached/.test(location.pathname)) return;
    var LID = new URLSearchParams(location.search).get('id') || (location.pathname.match(/\/id\/(\d+)/) || [])[1] || '';
    var RT = 'https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/', CARE = 'https://t.me/zabota_oduvanov', NB = ' ', MSK = 3 * 36e5, R = document.documentElement;
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : '' };
    var pl = function (n, f) { n = Math.abs(Math.round(n)); var a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2] };
    var p2 = function (n) { return ('0' + n).slice(-2) };
    var MON = { 'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4, 'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11 }, MONG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'], WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    var mskD = function (y, mo, d, h, mi) { return new Date(Date.UTC(y, mo, d, h - 3, mi)) };
    var pdt = function (s) { s = String(s || '').toLowerCase().replace(/[ \s]+/g, ' '); var tm = s.match(/(\d{1,2}):(\d{2})/), h = tm ? +tm[1] : 12, mi = tm ? +tm[2] : 0, n = new Date(Date.now() + MSK), y = n.getUTCFullYear(), m;
      if ((m = s.match(/(послезавтра|сегодня|завтра)/))) return mskD(y, n.getUTCMonth(), n.getUTCDate() + { 'сегодня': 0, 'завтра': 1, 'послезавтра': 2 }[m[1]], h, mi);
      if ((m = s.match(/(\d{4})-(\d{2})-(\d{2})/))) return mskD(+m[1], +m[2] - 1, +m[3], h, mi);
      if ((m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/))) return mskD(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1], h, mi);
      m = s.match(/(\d{1,2}) ([а-я]{3})[а-я]*\.?(?:,? (\d{4}))?/); if (!m || MON[m[2]] == null) return null;
      var d = mskD(m[3] ? +m[3] : y, MON[m[2]], +m[1], h, mi); if (!m[3] && d < Date.now() - 200 * 864e5) d = mskD(y + 1, MON[m[2]], +m[1], h, mi); return d };
    var when = function (d) { var x = new Date(d.getTime() + MSK), n = new Date(Date.now() + MSK), dd = Math.round((Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / 864e5);
      var day = dd === 0 ? 'сегодня' : dd === 1 ? 'завтра' : WD[x.getUTCDay()] + ', ' + x.getUTCDate() + NB + MONG[x.getUTCMonth()];
      var loc = -d.getTimezoneOffset() * 6e4 !== MSK ? '<small>у тебя ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + '</small>' : '';
      return day + ', ' + p2(x.getUTCHours()) + ':' + p2(x.getUTCMinutes()) + NB + 'МСК' + loc };
    var left = function (ms) { var mn = Math.max(0, Math.ceil(ms / 6e4)), h = Math.floor(mn / 60), d = Math.floor(h / 24);
      if (d) return d + NB + pl(d, ['день', 'дня', 'дней']) + (h % 24 ? ' ' + h % 24 + NB + pl(h % 24, ['час', 'часа', 'часов']) : '');
      if (h) return h + NB + pl(h, ['час', 'часа', 'часов']) + (mn % 60 ? ' ' + mn % 60 + NB + pl(mn % 60, ['минута', 'минуты', 'минут']) : ''); return Math.max(1, mn) + NB + pl(Math.max(1, mn), ['минута', 'минуты', 'минут']) };
    var cn = function (t) { return String(t || '').replace(/AI-креатор с 0 до PRO 2\.0/, 'AI-креатор 2.0').replace(/ (—|–)/g, NB + '$1') };
    var LOCK = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    var CSS = '.fnr{--s0:#0c0c0c;--s1:#161616;--hair:rgba(255,255,255,.06);font-family:"Inter Tight",Inter,system-ui,sans-serif;color:#fff;display:flex;flex-direction:column;gap:28px;padding:40px 0 64px;min-height:calc(100vh - 160px);box-sizing:border-box}.fnr *{box-sizing:border-box}'
      + '.fnr-bc{display:flex;flex-wrap:wrap;gap:0 8px;font-size:14px;font-weight:500;color:rgba(255,255,255,.55)}:root body .fnr .fnr-bc a{color:rgba(255,255,255,.55)!important;text-decoration:none!important;display:inline-flex;align-items:center}:root body .fnr .fnr-bc a:hover{color:#fff!important}.fnr-back{display:none}'
      + '.fnr-c{align-self:center;width:100%;max-width:760px;margin-top:24px;padding:40px;border-radius:40px;background:var(--s1);box-shadow:inset 0 0 0 1px var(--hair);display:flex;flex-direction:column;gap:22px}'
      + '.fnr-h{display:flex;align-items:center;gap:12px}.fnr-ic{width:48px;height:48px;border-radius:16px;background:#3e3e3e;display:grid;place-items:center;flex:none}.fnr-chip{font-size:13px;font-weight:700;letter-spacing:1.5px;color:rgba(255,255,255,.55);text-transform:uppercase}'
      + '.fnr h1.fnr-t{margin:0!important;font:500 44px/1.08 "Inter Tight",Inter,sans-serif!important;letter-spacing:-1.3px!important;color:#fff!important;text-wrap:balance}'
      + '.fnr-pl{display:flex;gap:16px}.fnr-pl>div{flex:1;min-width:0;padding:20px 24px;border-radius:24px;background:var(--s0);box-shadow:inset 0 0 0 1px var(--hair);display:flex;flex-direction:column;gap:6px}.fnr-pl span{font-size:13px;font-weight:600;color:rgba(255,255,255,.55);text-transform:uppercase}.fnr-pl b{font-size:24px;font-weight:500;line-height:1.25}.fnr-pl small{display:block;font-size:14px;font-weight:400;color:rgba(255,255,255,.55);margin-top:2px}.fnr-pl em{display:none;font-style:normal;font-size:14px;color:rgba(255,255,255,.55)}'
      + '.fnr-x{margin:0;font-size:17px;line-height:1.5;color:rgba(255,255,255,.55)}.fnr-x span{color:#d77fff}'
      + '.fnr-b{display:flex;gap:12px;flex-wrap:wrap}.fnr-b a{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:52px;padding:0 22px;border-radius:16px;font-size:16px;font-weight:600;text-decoration:none!important}:root body .fnr .fnr-b a.s{background:rgba(255,255,255,.11);color:#fff!important}:root body .fnr .fnr-b a.s:hover{background:rgba(255,255,255,.16)}:root body .fnr .fnr-b a.c{color:rgba(255,255,255,.75)!important}:root body .fnr .fnr-b a.c:hover{color:#fff!important}'
      + '@media(max-width:700px){.fnr{padding:24px 0 48px;gap:16px}.fnr-bc{display:none}:root body .fnr a.fnr-back{display:inline-flex;align-items:center;min-height:44px;align-self:flex-start;font-size:14px;font-weight:500;color:rgba(255,255,255,.55)!important;text-decoration:none!important}.fnr-c{margin-top:0;padding:24px;border-radius:28px;gap:16px}.fnr-ic{display:none}.fnr-chip{font-size:12px}.fnr h1.fnr-t{font-size:30px!important;line-height:1.1!important;letter-spacing:-.8px!important}'
      + '.fnr-pl{flex-direction:column}.fnr-pl>div{padding:16px 18px;border-radius:20px;gap:4px}.fnr-pl>div.in{display:none}.fnr-pl em{display:block}.fnr-pl b{font-size:20px}.fnr-x{font-size:15px}.fnr-b{flex-direction:column;gap:4px}.fnr-b a{width:100%}.fnr-b a.c{height:44px}}';

    /* стандартную страницу прячем до сборки карточки, но не дольше 4 с */
    var WST = document.createElement('style'); WST.textContent = ':root.fl-nr-wait .standard-page-content,:root.fl-nr-wait .page-content{opacity:0!important}'; (document.head || R).appendChild(WST);
    R.classList.add('fl-nr-wait'); setTimeout(function () { R.classList.remove('fl-nr-wait') }, 4000);

    var findBox = function () { var hs = [].slice.call(document.querySelectorAll('h1,h2,h3,h4,b,strong,div,p')).filter(function (e) { return /^Нет доступа$/i.test(txt(e)) }); if (!hs.length) return null;
      var el = hs[0]; while (el && el !== document.body) { var cs = getComputedStyle(el); if (cs.borderTopStyle === 'dashed' || /dashed/.test(el.getAttribute('style') || '')) return el; if (el.parentElement && /standard-page-content|page-content|container/.test(el.parentElement.className || '')) return el; el = el.parentElement } return hs[0] };
    /* откуда взять урок и дату: data.json (parts[].at по id урока) → страница, с которой пришли (список уроков части) */
    var fromData = function () { return fetch(RT + 'data.json', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (D) { var hit = null;
      (D.modules || []).forEach(function (m) { (m.parts || []).forEach(function (p) { (p.lessons || []).forEach(function (l) { if (String(l.id) === String(LID)) hit = { t: l.t, at: p.at ? new Date(p.at) : null, part: p.name, mod: m.name, up: '/teach/control/stream/view/id/' + m.id } }) }) }); return hit }).catch(function () { return null }) };
    /* пришли со страницы части/модуля — берём её; пришли с урока («Следующий урок») — берём часть этого урока */
    var refList = function () { var rf = document.referrer || ''; if (!rf || rf.indexOf(location.host) < 0) return Promise.resolve(null); if (/\/teach\/control\/stream\/view\/id\/\d+/.test(rf)) return Promise.resolve(rf);
      if (!/\/teach\/control\/lesson\/view/.test(rf)) return Promise.resolve(null);
      return fetch(rf, { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) { var a = new DOMParser().parseFromString(t, 'text/html').querySelector('.page-header h1 a[href*="/stream/view/id/"]'); return a ? new URL(a.getAttribute('href'), location.href).href : null }).catch(function () { return null }) };
    var fromRef = function () { return refList().then(function (rf) { if (!rf) return null;
      return fetch(rf, { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) { var d = new DOMParser().parseFromString(t, 'text/html'), li = d.querySelector('ul.lesson-list > li.lesson-id-' + LID); if (!li) return { up: rf, upT: txt(d.querySelector('.page-header h1')) };
        var ti = li.querySelector('.title'), st = txt(li.querySelector('.user-state-label')) || txt(li); return { t: ti ? (ti.childNodes[0] ? ti.childNodes[0].textContent : ti.textContent).replace(/\s+/g, ' ').trim() : '', at: /недоступ/i.test(st) ? pdt(st.replace(/^.*недоступ[а-я]*\s*(до)?/i, '')) : null, up: rf, upT: txt(d.querySelector('.page-header h1')) } }).catch(function () { return null }) }) };

    var start = function () { var box = findBox(); if (!box) return false; if (document.querySelector('.fnr')) return true;
      var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); R.classList.add('fl-nr-on');
      var wrap = document.createElement('div'); wrap.className = 'fnr'; box.parentNode.insertBefore(wrap, box); box.style.setProperty('display', 'none', 'important'); R.classList.remove('fl-nr-wait');
      var draw = function (a, b) { var x = a || {}, y = b || {}, t = x.t || y.t || '', at = x.at || y.at || null, up = (y.up && !x.up) ? y.up : x.up || y.up || '/teach/control/stream', isHw = /домашн/i.test(t);
        var upL = x.part ? 'К модулю' : x.mod ? 'К модулю' : y.up ? 'К модулю' : 'К тренингам';
        document.title = (t ? t + ' — ' : '') + 'урок ещё не открыт';
        wrap.innerHTML = (x.mod || y.upT ? '<nav class="fnr-bc" aria-label="Где я">' + (x.mod ? '<a class="fs-k" href="/teach/control/stream/view/id/935917158">AI-креатор 2.0</a>' : '<a class="fs-k" href="/teach/control/stream">Тренинги</a>') + '<span aria-hidden="true">/</span><a class="fs-k" href="' + esc(up) + '">' + esc(cn(x.mod || y.upT)) + '</a>' + (x.part ? '<span aria-hidden="true">/</span><span>' + esc(cn(x.part)) + '</span>' : '') + '</nav><a class="fnr-back fs-k" href="' + esc(up) + '">← ' + esc(cn(String(x.mod || y.upT).split(/ [—–-] /)[0])) + '</a>' : '')
          + '<section class="fnr-c" aria-label="Урок ещё не открыт"><div class="fnr-h"><span class="fnr-ic">' + LOCK + '</span><span class="fnr-chip">Урок ещё не' + NB + 'открыт</span></div>'
          + '<h1 class="fnr-t">' + esc(cn(t || 'Этот урок пока закрыт')) + '</h1>'
          + (at ? '<div class="fnr-pl"><div><span>Откроется</span><b>' + when(at) + '</b><em class="cd"></em></div><div class="in"><span>Через</span><b class="cd"></b></div></div>' : '<p class="fnr-x">Урок откроется по&nbsp;расписанию модуля, в&nbsp;12:00 по&nbsp;Москве.</p>')
          + '<p class="fnr-x">Первые 48' + NB + 'часов после открытия&nbsp;— <span>×2 к' + NB + 'баллам</span> за' + NB + 'уроки, 72' + NB + 'часа&nbsp;— за' + NB + 'домашку.</p>'
          + '<div class="fnr-b"><a class="s fs-k" href="' + esc(up) + '">← ' + upL + '</a><a class="c fs-k" href="' + CARE + '" target="_blank" rel="noopener">Служба заботы</a></div></section>';
        if (isHw) wrap.querySelector('.fnr-x:last-of-type').innerHTML = 'Первые 72' + NB + 'часа после открытия&nbsp;— <span>×2 к' + NB + 'баллам</span> за' + NB + 'домашку.';
        if (at) { var tick = function () { var ms = at - Date.now(), s = ms > 0 ? left(ms) : 'уже открылся'; [].forEach.call(wrap.querySelectorAll('.cd'), function (e) { e.textContent = e.tagName === 'EM' ? (ms > 0 ? 'через ' + s : 'Урок уже открылся — обнови страницу') : s }); if (ms > 0) setTimeout(tick, ms > 36e5 ? 3e4 : 1e3) }; tick() } };
      draw(null, null); Promise.all([fromData(), fromRef()]).then(function (r) { draw(r[0], r[1]) });
      return true };
    var tries = 0, kick = function () { if (start()) return; if (++tries < 60) setTimeout(kick, 150); else R.classList.remove('fl-nr-wait') };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kick); else kick();
  })();
/* ===== v42-course: курс AI-креатор 2.0 — подписи «5 уроков», чипы закрытых модулей, страницы модуля и части (шапка с прогрессом, части карточками, уроки с номером и статусом, стоп-урок), подпись анкеты ===== */
(function () {
  if (window.top !== window && !window.FS_TEST) return;
  var ROOT = '935917158', RT = 'https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/', CARE = 'https://t.me/zabota_oduvanov', NB = ' ', MSK = 3 * 36e5;
  var COV = { 935917159: 'm00', 935917160: 'm01', 935917165: 'm02', 935917169: 'm03', 935917170: 'm04', 935917173: 'm05', 935917189: 'amazon', 935917174: 'm06', 935917184: 'm07', 935917186: 'm08' };
  var MON = { 'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4, 'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11 };
  var MG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
  var pl = function (n, f) { n = Math.abs(n) % 100; var a = n % 10; return n > 10 && n < 20 ? f[2] : a > 1 && a < 5 ? f[1] : a === 1 ? f[0] : f[2] };
  var pad = function (n) { return ('0' + n).slice(-2) };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : '' };
  /* время GetCourse и data.json — московское: показываем всегда по Москве с пометкой МСК */
  var mk = function (t) { var d = new Date(+t + MSK); return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() } };
  var dm = function (t) { var m = mk(t); return m.d + NB + MG[m.mo] };
  var dmt = function (t) { var m = mk(t); return dm(t) + ', ' + pad(m.h) + ':' + pad(m.mi) + NB + 'МСК' };
  /* «Пн 12 Окт 12:00», «Недоступен до 02 Ноя 12:00», «сегодня 12:00», «завтра 12:00», «вчера 12:00», «25 октября в 10:00» */
  var pd = function (s) { s = String(s || '').toLowerCase(); var n = mk(Date.now()), m = /(сегодня|завтра|вчера)\D{0,8}(\d{1,2}):(\d{2})/.exec(s);
    if (m) return Date.UTC(n.y, n.mo, n.d + { 'вчера': -1, 'сегодня': 0, 'завтра': 1 }[m[1]], +m[2], +m[3]) - MSK;
    m = /(\d{1,2})\s+([а-я]{3})[а-я]*\.?(?:\s+(\d{4}))?(?:\D{1,6}?(\d{1,2}):(\d{2}))?/.exec(s); if (!m || MON[m[2]] == null) return null;
    var y = m[3] ? +m[3] : n.y, at = function (yy) { return Date.UTC(yy, MON[m[2]], +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0) - MSK }, t = at(y);
    if (!m[3]) { if (t - Date.now() > 200 * 864e5) t = at(y - 1); else if (Date.now() - t > 200 * 864e5) t = at(y + 1) } return t };
  var hrs = function (ms) { var h = Math.max(1, Math.ceil(ms / 36e5)); return h + NB + 'ч' };
  var D = null, dP = null;
  var getD = function () { if (dP) return dP; try { var c = JSON.parse(sessionStorage.getItem('fsD1') || 'null'); if (c && Date.now() - c.ts < 6e5) { D = c.d; return (dP = Promise.resolve(D)) } } catch (e) {}
    /* data.json рейтинга; если его убрали из публичного доступа — публичный /sched сервера (modules, если сервер их отдаёт, иначе только schedule) */
    var API = window.FS_API && String(window.FS_API).indexOf('http') === 0 ? window.FS_API : '';
    return (dP = fetch(RT + 'data.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json() }).catch(function () { if (!API) throw 0; return fetch(API + '/sched').then(function (r) { return r.json() }).then(function (j) { return { modules: j.modules || [], schedule: j.schedule || [], x2: j.x2 || null } }) }).then(function (j) { D = j; try { sessionStorage.setItem('fsD1', JSON.stringify({ ts: Date.now(), d: j })) } catch (e) {} return j }).catch(function () { return null })) };
  var lessonHit = function (ids) { var best = null; if (!D) return null; (D.modules || []).forEach(function (m) { (m.parts || []).forEach(function (p, i) { var k = (p.lessons || []).filter(function (l) { return ids[String(l.id)] }).length; if (k && (!best || k > best.k)) best = { k: k, m: m, p: p, i: i } }) }); return best };
  /* «за какую часть» анкета: первая в части — за предыдущую часть курса (без Amazon и бонусных), последняя — за свою */
  var flat = function () { var r = []; (D && D.modules || []).forEach(function (m) { (m.parts || []).forEach(function (p) { r.push({ m: m, p: p }) }) }); return r };
  var mShort = function (m) { return String(m.name || '').split(' — ')[0] };
  var pName = function (x) { return x.p.name ? String(x.p.name).split(' / ')[0] : '' };
  var surveyOf = function (lid) { var F = flat(), at = -1, idx = -1; F.forEach(function (x, k) { (x.p.lessons || []).forEach(function (l, j) { if (String(l.id) === String(lid)) { at = k; idx = j } }) }); if (at < 0) return null;
    var x = F[at]; if (idx === 0 && (x.p.lessons || []).length > 1) { for (var k = at - 1; k >= 0; k--) { if (F[k].m.amazon && !x.m.amazon) continue; if (/бонус/i.test(F[k].p.name || '')) continue; x = F[k]; break } if (x === F[at]) return null }
    return pName(x) ? { t: 'части «' + pName(x) + '»', m: mShort(x.m) } : { t: 'модулю «' + String(x.m.name || '').replace(/^Модуль \d+ — /, '') + '»', m: mShort(x.m) } };
  var I = { lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>', ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>', play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>' };

  /* ---------- подписи на карточках тренингов: «5 уроков» без точки, описание отдельной строкой ---------- */
  var counts = function () { [].forEach.call(document.querySelectorAll('.stream-table tr.training-row td>a>div>b:not([data-fs])'), function (b) { b.setAttribute('data-fs', '1'); var v = b.textContent.replace(/\s+/g, ' ').trim().replace(/\.$/, ''); b.textContent = v.replace(/^(\d+) /, '$1' + NB) }) };

  /* ---------- страница курса: чип «Откроется 9 ноября, 12:00 МСК» / «×2 ещё N ч» у модулей ---------- */
  var courseChips = function () { getD().then(function () { if (!D) return; var now = Date.now();
    var key = function (t) { return (String(t || '').match(/^(Модуль \d+|Amazon)/) || [])[1] || '' }, L0 = (D.modules && D.modules.length) ? D.modules : (D.schedule || []).map(function (x) { var k = key(x.name), tr = k && [].filter.call(document.querySelectorAll('.stream-table tr.training-row'), function (t) { return key(txt(t.querySelector('.stream-title'))) === k })[0]; return { id: tr ? tr.getAttribute('data-training-id') : 0, at: x.at } });
    L0.forEach(function (m) { var tr = m.id && document.querySelector('.stream-table tr.training-row[data-training-id="' + m.id + '"]'); if (!tr || tr.querySelector('.fs-tl-chip')) return; var a = tr.querySelector('td>a'), at = Date.parse(m.at); if (!a || !at) return;
      var c = null; if (at > now) { tr.classList.add('fs-tl-lk'); c = '<span class="fs-tl-chip lk">' + I.lock + 'Откроется ' + dmt(at) + '</span>' }
      else if (now < at + 72 * 36e5) c = '<span class="fs-tl-chip x2">×2 ' + (now < at + 48 * 36e5 ? 'ещё ' + hrs(at + 48 * 36e5 - now) : 'за домашки ещё ' + hrs(at + 72 * 36e5 - now)) + '</span>';
      if (c) a.insertAdjacentHTML('afterbegin', c) }) }) };

  /* ---------- разбор страницы тренинга GetCourse ---------- */
  var get = function (u) { return fetch(u, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : '' }).then(function (t) { return new DOMParser().parseFromString(t, 'text/html') }) };
  var lessonsOf = function (doc) { return [].map.call(doc.querySelectorAll('ul.lesson-list > li'), function (li) { var c = li.className, a = li.querySelector('a[href]'), ti = li.querySelector('.title'), dt = li.querySelector('.lesson-date'), dx = txt(dt), t = ti ? (ti.childNodes[0] ? ti.childNodes[0].textContent : ti.textContent).replace(/\s+/g, ' ').trim() : '';
    return { id: li.getAttribute('data-lesson-id') || (c.match(/lesson-id-(\d+)/) || [])[1], href: a ? a.getAttribute('href') : '', t: t, done: /user-state-accomplished|lesson-list_watched/.test(c), wait: /user-state-has_answer/.test(c), need: /user-state-need_accomplish/.test(c),
      lk: /user-state-not_reached|user-state-blocked|is-locked|has_no_access/.test(c) || /недоступ/i.test(dx), stop: !!li.querySelector('.is-stop-lesson'), at: pd(dx), hw: /домашн/i.test(t), sv: /анкет/i.test(t) } }) };
  var rowsOf = function (doc) { return [].map.call(doc.querySelectorAll('.stream-table tr.training-row'), function (tr) { var a = tr.querySelector('td>a'); return { id: tr.getAttribute('data-training-id'), href: a ? a.getAttribute('href') : '/teach/control/stream/view/id/' + tr.getAttribute('data-training-id'), t: txt(tr.querySelector('.stream-title')) } }) };
  var partInfo = function (r) { var k = 'fsPP:' + r.id; try { var c = JSON.parse(sessionStorage.getItem(k) || 'null'); if (c && Date.now() - c.ts < 3e5) return Promise.resolve(c.v) } catch (e) {}
    return get(r.href).then(function (d) { var v = { L: lessonsOf(d), sub: rowsOf(d).length }; try { sessionStorage.setItem(k, JSON.stringify({ ts: Date.now(), v: v })) } catch (e) {} return v }).catch(function () { return { L: [], sub: 0 } }) };
  var stat = function (L) { var n = L.length, done = L.filter(function (x) { return x.done }).length, hw = L.filter(function (x) { return x.hw }), lk = n && L.every(function (x) { return x.lk }), at = L.map(function (x) { return x.at }).filter(Boolean).sort()[0] || null;
    var h = hw.length ? (hw.every(function (x) { return x.done }) ? 'ДЗ принято' : hw.some(function (x) { return x.wait }) ? 'ДЗ на' + NB + 'проверке' : 'ДЗ не' + NB + 'сдано') : '';
    return { n: n, done: done, pc: n ? Math.round(done / n * 100) : 0, lk: lk, at: at, hw: h, next: L.filter(function (x) { return !x.done && !x.lk })[0] || null } };
  var bar = function (pc, ok) { return '<div class="fs-pb' + (ok ? ' ok' : '') + '"><i style="width:' + pc + '%"></i></div>' };
  var care = function () { return '<div class="fs-cc"><b>Что-то не' + NB + 'работает?</b><span>Не открывается урок или видео — напиши в' + NB + 'службу заботы, ответим в' + NB + 'течение дня.</span><a class="fs-btn2" href="' + CARE + '" target="_blank" rel="noopener">Служба заботы</a></div>' };
  var whenLine = function (at) { if (!at) return ''; return at > Date.now() ? 'откроется ' + dmt(at) : 'открыт с' + NB + dmt(at) };
  var x2chip = function (at) { var now = Date.now(); if (!at || now < at || now >= at + 72 * 36e5) return ''; return '<span class="fs-chip x2">×2 ' + (now < at + 48 * 36e5 ? 'ещё ' + hrs(at + 48 * 36e5 - now) : 'за домашки ещё ' + hrs(at + 72 * 36e5 - now)) + '</span>' };
  /* номер урока: анкеты без номера */
  var numbered = function (L) { var k = 0; return L.map(function (x) { return x.sv ? 0 : ++k }) };

  /* ---------- карточки частей ---------- */
  var partCard = function (r, i, v) { var s = stat(v.L), now = Date.now(), chip = '', meta = [], cls = 'fs-pc';
    if (s.n && s.done === s.n) { chip = '<span class="fs-chip ok">Пройдена</span>'; cls += ' ok' }
    else if (s.lk) { cls += ' lk'; chip = '<span class="fs-pc-lk">' + I.lock + (s.at && s.at > now ? 'Откроется ' + dm(s.at) : 'После анкеты') + '</span>' }
    else if (s.done || x2chip(s.at)) { chip = x2chip(s.at) || '<span class="fs-chip now">Сейчас</span>'; cls += ' now' }
    if (s.n) meta.push(s.lk ? s.n + NB + pl(s.n, ['урок', 'урока', 'уроков']) : s.done + ' из' + NB + s.n + ' ' + pl(s.n, ['урока', 'уроков', 'уроков']));
    if (s.lk) meta.push(s.at && s.at > now ? 'откроется ' + dmt(s.at) : 'откроется после анкеты'); else if (s.hw) meta.push(s.hw);
    if (v.sub) meta.push(v.sub + NB + pl(v.sub, ['раздел', 'раздела', 'разделов']));
    return '<a class="' + cls + '" href="' + esc(r.href) + '"><div class="fs-pc-h"><span class="fs-pc-n">' + (i != null ? 'Часть ' + (i + 1) : 'Раздел') + '</span>' + chip + '</div><b class="fs-pc-t">' + esc(r.t) + '</b><span class="fs-pc-m">' + meta.join(' · ') + '</span>' + (s.n ? bar(s.lk ? 0 : s.pc, s.done === s.n) : '') + '</a>' };

  /* ---------- список уроков ---------- */
  var lessonList = function (L, stopAt, at0) { var N = numbered(L), cur = -1;
    L.forEach(function (x, i) { if (cur < 0 && !x.done && !x.lk && (stopAt < 0 || i <= stopAt)) cur = i });
    return '<ol class="fs-ll">' + L.map(function (x, i) { var lk = x.lk || (stopAt >= 0 && i > stopAt), c = x.done ? 'done' : i === cur ? 'cur' : lk ? 'lk' : '', sv = x.sv ? surveyOf(x.id) : null, right = '';
      if (x.done) right = '<span class="fs-ll-r">' + (x.sv ? 'заполнена' : x.hw ? 'принято' : 'пройден') + '</span>';
      else if (x.wait) right = '<span class="fs-ll-r">на' + NB + 'проверке</span>';
      else if (x.lk && x.at && x.at > Date.now() && x.at !== at0) right = '<span class="fs-ll-r">откроется ' + dmt(x.at) + '</span>';
      else if (x.hw) right = '<span class="fs-chip hw">ДЗ · до' + NB + '70</span>';
      else if (i === cur) right = '<span class="fs-ll-r go">продолжить</span>';
      var ic = c === 'done' ? I.ok : c === 'cur' ? I.play : lk ? I.lock : '';
      var name = x.sv && sv ? 'Анкета по' + NB + esc(sv.t) : esc(x.t);
      return '<li><a class="' + c + '" href="' + esc(x.href) + '"' + (c === 'cur' ? ' aria-current="step"' : '') + '><span class="fs-ll-i">' + ic + '</span><span class="fs-ll-t">' + (N[i] ? '<em>' + N[i] + '</em>' : '') + name + '</span>' + right + '</a></li>' }).join('') + '</ol>' };

  /* ---------- стоп-урок: вместо красной надписи — плашка с анкетой ---------- */
  var stopMsg = function () { var w = document.createTreeWalker(document.querySelector('.xdget-training') || document.body, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) if (/получить доступ к\s+следующим урокам|выполнить задание в\s+предыдущем/i.test(n.nodeValue)) { var el = n.parentNode; return el.closest('.errorMessage, .error-message, .alert, li:not([data-lesson-id])') || el } return null };
  var stopPlate = function (L, ix) { var x = L[ix], k = 0; for (var j = ix + 1; j < L.length && !L[j].stop; j++) k++; if (!x) return '';
    var sv = x.sv ? surveyOf(x.id) : null, what = x.sv ? 'Заполни анкету' + (sv ? ' по' + NB + sv.t : '') : 'Выполни задание «' + esc(x.t) + '»';
    return '<section class="fs-stop"><span class="fs-stop-i">' + I.lock + '</span><div class="fs-stop-x"><b>' + what + ' — и' + NB + 'откроются ' + (k ? 'следующие ' + k + NB + pl(k, ['урок', 'урока', 'уроков']) : 'следующие уроки') + '</b><span>' + (x.sv ? '+15 баллов. Ответы помогают нам улучшать курс.' : 'После этого откроются следующие уроки части.') + '</span></div><a class="fs-btn1" href="' + esc(x.href) + '">' + (x.sv ? 'Заполнить анкету' : 'Перейти к' + NB + 'заданию') + '</a></section>' };

  /* ---------- страница модуля / части ---------- */
  var inner = function () {
    var m = location.pathname.match(/^\/(?:pl\/)?teach\/control\/stream\/view\/id\/(\d+)\/?$/); if (!m || m[1] === ROOT) return;
    var crumbs = [].slice.call(document.querySelectorAll('.breadcrumbs a')); if (!crumbs.some(function (a) { return /\/stream\/view\/id\/935917158\b/.test(a.getAttribute('href') || '') })) return;
    var row = document.querySelector('.xdget-training > .xdget-row'), left = row && row.querySelector(':scope > .col-md-8'), right = row && row.querySelector(':scope > .col-md-4'); if (!left || document.querySelector('.fs-mh, .fs-ph')) return;
    var id = m[1], h1 = document.querySelector('.page-header h1'), title = txt(h1), L = lessonsOf(document), R = rowsOf(document).filter(function (r) { return r.id !== '935952152' });
    var lastC = crumbs[crumbs.length - 1], isMod = /\/id\/935917158\b/.test(lastC.getAttribute('href') || '');
    var R0 = document.documentElement; R0.classList.add('fs-inner');
    getD().then(function () {
      var dm0 = D && (D.modules || []).filter(function (x) { return String(x.id) === id })[0], ids = {}; L.forEach(function (x) { ids[x.id] = 1 });
      var hit = L.length ? lessonHit(ids) : null, mod = dm0 || (hit && hit.m) || null;
      var side = document.createElement('aside'); side.className = 'fs-ms'; if (right) right.appendChild(side);
      if (isMod && R.length && !L.length) {
        /* модуль с частями: шапка-карточка + части 2×2 */
        var nm = title.split(' — '), chip = nm.length > 1 ? nm[0] : 'Модуль', h = nm.length > 1 ? nm.slice(1).join(' — ') : title, at = mod ? Date.parse(mod.at) : null, cov = COV[id];
        var hd = document.createElement('section'); hd.className = 'fs-mh' + (cov ? '' : ' nc');
        var desc = mod && mod.desc ? mod.desc.charAt(0).toUpperCase() + mod.desc.slice(1) + '. ' : '';
        hd.innerHTML = (cov ? '<img class="fs-mh-c" src="https://romanoduvanov.github.io/otzyvy/gc/covers32/' + cov + '.jpg" alt="" loading="lazy">' : '') + '<div class="fs-mh-b"><div class="fs-mh-ch"><span class="fs-chip o">' + esc(chip) + '</span>' + x2chip(at) + '</div><h1 class="fs-mh-t">' + esc(h) + '</h1>'
          + '<p class="fs-mh-d">' + esc(desc) + R.length + NB + pl(R.length, ['часть', 'части', 'частей']) + '<span class="fs-mh-n"></span>' + (at ? ' · ' + whenLine(at) : '') + '</p><div class="fs-mh-p" hidden></div><div class="fs-mh-go"></div></div>';
        R0.classList.add('fs-mod'); row.parentNode.insertBefore(hd, row);
        var grid = document.createElement('section'); grid.className = 'fs-pp'; grid.innerHTML = '<h2 class="fs-h2">Части модуля</h2><div class="fs-pp-g">' + R.map(function (r, i) { return '<div class="fs-pc sk"><div class="fs-pc-h"><span class="fs-pc-n">Часть ' + (i + 1) + '</span></div><b class="fs-pc-t">' + esc(r.t) + '</b><span class="fs-pc-m">&nbsp;</span>' + bar(0) + '</div>' }).join('') + '</div>';
        left.insertBefore(grid, left.firstChild); side.innerHTML = care();
        Promise.all(R.map(partInfo)).then(function (V) {
          grid.querySelector('.fs-pp-g').innerHTML = R.map(function (r, i) { return partCard(r, i, V[i]) }).join('');
          var all = [], nx = null; V.forEach(function (v, i) { v.L.forEach(function (x) { all.push(x) }); if (!nx) { var s = stat(v.L); if (s.next) nx = { r: R[i], x: s.next, k: numbered(v.L)[v.L.indexOf(s.next)], first: !s.done } } });
          var S = stat(all); hd.querySelector('.fs-mh-n').textContent = ' · ' + S.n + NB + pl(S.n, ['урок', 'урока', 'уроков']);
          var p = hd.querySelector('.fs-mh-p'); if (S.n) { p.hidden = false; p.innerHTML = '<div class="fs-mh-pr"><span>Пройдено ' + S.done + ' из' + NB + S.n + '</span><span>' + S.pc + '%</span></div>' + bar(S.pc, S.done === S.n) }
          var g = hd.querySelector('.fs-mh-go'); if (nx) g.innerHTML = '<a class="fs-btn1" href="' + esc(nx.x.href) + '">' + (S.done ? 'Продолжить' : 'Начать') + ': ' + esc(nx.r.t) + (nx.k ? ', урок ' + nx.k : '') + ' →</a>';
          else if (S.n && S.done === S.n) g.innerHTML = '<span class="fs-chip ok">Модуль пройден</span>';
          typo(hd) });
        return }
      /* часть (или модуль без частей): чип, заголовок, прогресс, список уроков */
      var pt = null, partsN = 0, pIdx = -1; if (hit && !dm0) { var top = (hit.m.parts || []).filter(function (p) { return p.name && p.name.indexOf(' / ') < 0 }); partsN = top.length; pIdx = top.indexOf(hit.p) }
      var at2 = hit ? Date.parse(hit.p.at) : null; if (!at2) at2 = L.map(function (x) { return x.at }).filter(Boolean).sort()[0] || null;
      var chip2 = dm0 || isMod ? (title.split(' — ')[0] || 'Модуль') : pIdx >= 0 ? 'Часть ' + (pIdx + 1) + ' из' + NB + partsN : txt(lastC).split(' — ')[0];
      var h2 = dm0 || isMod ? title.split(' — ').slice(1).join(' — ') || title : title, S2 = stat(L);
      var msg = stopMsg(), force = /[?&]fsStop=1/.test(location.search), stopAt = -1;
      if (msg || force) { for (var i = 0; i < L.length; i++) if (L[i].stop && !L[i].done) { stopAt = i; break } if (stopAt < 0 && msg) stopAt = L.filter(function (x) { return !x.lk }).length - 1 }
      if (msg) msg.classList.add('fs-hide');
      var ph = document.createElement('section'); ph.className = 'fs-ph';
      ph.innerHTML = '<div class="fs-mh-ch"><span class="fs-chip o">' + esc(chip2) + '</span>' + x2chip(at2) + '</div><h1 class="fs-ph-t">' + esc(h2) + '</h1>'
        + (at2 ? '<p class="fs-ph-d">' + (at2 > Date.now() ? 'Откроется ' + dmt(at2) : (isMod || dm0 ? 'Открыт' : 'Открыта') + ' с' + NB + dmt(at2)) + (Date.now() < at2 + 72 * 36e5 ? '. Первые 48' + NB + 'часов после открытия — ×2 за' + NB + 'уроки и' + NB + 'анкеты, 72' + NB + 'часа — за' + NB + 'домашки.' : '') + '</p>' : '')
        + (L.length ? '<div class="fs-ph-p">' + bar(S2.pc, S2.n && S2.done === S2.n) + '<span>' + S2.done + ' из' + NB + S2.n + ' пройдено</span></div>' : '')
        + (stopAt >= 0 ? stopPlate(L, stopAt) : '') + (L.length ? lessonList(L, stopAt, at2) : '');
      R0.classList.add('fs-pl'); left.insertBefore(ph, left.firstChild);
      if (R.length) { var g2 = document.createElement('section'); g2.className = 'fs-pp'; g2.innerHTML = '<h2 class="fs-h2">Дополнительно</h2><div class="fs-pp-g"></div>'; ph.parentNode.insertBefore(g2, ph.nextSibling); R0.classList.add('fs-mod');
        Promise.all(R.map(partInfo)).then(function (V) { g2.querySelector('.fs-pp-g').innerHTML = R.map(function (r, i) { return partCard(r, null, V[i]) }).join('') }) }
      /* справа: «Дальше» (следующая часть) + служба заботы */
      var nxtP = null; if (hit && !dm0 && pIdx >= 0) { var tops = (hit.m.parts || []).filter(function (p) { return p.name && p.name.indexOf(' / ') < 0 }); nxtP = tops[pIdx + 1] || null }
      side.innerHTML = (nxtP ? '<div class="fs-cc"><span class="fs-cc-e">Дальше</span><b>' + esc(String(nxtP.name).replace(/ /g, ' ')) + '</b><span>' + (Date.parse(nxtP.at) > Date.now() ? 'Откроется ' + dmt(Date.parse(nxtP.at)) + '. ' : 'Откроется после анкеты по' + NB + 'этой части. ') + (nxtP.lessons || []).length + NB + pl((nxtP.lessons || []).length, ['урок', 'урока', 'уроков']) + '.</span></div>' : '') + care();
      typo(ph); typo(side) }) };
  /* типограф: короткие слова не висят в конце строки */
  var typo = function (el) { if (!el) return; var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n, re = /(^|[\s («"])([а-яёА-ЯЁ]{1,3}|\d+)[ ](?=\S)/g, f = function (m, a, b) { return a + b + NB };
    while ((n = w.nextNode())) { var v = n.nodeValue, o = v; v = v.replace(re, f).replace(re, f).replace(/ (—|–)/g, NB + '$1'); if (v !== o) n.nodeValue = v } };

  /* ---------- урок-анкета: подпись, за какую часть она ---------- */
  var survey = function () { var lid = (location.search.match(/[?&]id=(\d+)/) || location.pathname.match(/\/lesson\/view\/id\/(\d+)/) || [])[1]; if (!lid) return;
    getD().then(function () { var hit = null; (D && D.modules || []).forEach(function (m) { (m.parts || []).forEach(function (p) { (p.lessons || []).forEach(function (l) { if (String(l.id) === lid && /анкет/i.test(l.t)) hit = 1 }) }) }); if (!hit) return;
      var s = surveyOf(lid); if (!s) return; var t = 0, put = function () { if (document.querySelector('.fs-svp')) return; var a = document.querySelector('.fl-hd'), b = a || document.querySelector('.lesson-header-block');
        if (!b) { if (++t < 40) setTimeout(put, 300); return } if (!a && t < 20 && document.documentElement.classList.contains('fl-wait')) { ++t; setTimeout(put, 300); return }
        var e = document.createElement('p'); e.className = 'fs-svp'; e.innerHTML = 'Анкета по' + NB + esc(s.t) + ' · ' + esc(s.m) + '. Ответы помогают нам улучшать курс.'; typo(e); if (a) a.parentNode.insertBefore(e, a.nextSibling); else b.parentNode.insertBefore(e, b) }; put() }) };

  var go = function () { counts(); if (/^\/(pl\/)?teach\/control\/stream\/view\/id\/935917158\/?$/.test(location.pathname)) courseChips(); inner(); if (/\/teach\/control\/lesson\/view/.test(location.pathname)) survey() };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();


/* ===== v42-screens: главная ученика (список тренингов), «нет доступа» (#403) и «страница не найдена» (#404) по макетам Home / NoAccess / NotFound ===== */
(function () {
  if (window.top !== window && !window.FS_TEST) return;
  var U = window.accountUserId, R0 = document.documentElement, NB = '\u00a0', CARE = 'https://t.me/zabota_oduvanov', HOME = '/teach/control/stream';
  /* кнопка «Повысить тариф»: пока своей страницы оплаты апгрейда нет — служба заботы; появится страница — поменять только эту константу */
  var UPGRADE_URL = '/povyshenie-premium-amazon';
  /* страница повышения есть только для «Премиум → Премиум Амазон»; остальное — служба заботы с готовым текстом */
  var upHref = function (nm, amz) { return amz ? UPGRADE_URL : CARE + '?text=' + encodeURIComponent('Здравствуйте! Хочу повысить тариф' + (nm ? ', чтобы получить доступ к «' + nm + '»' : '') + '.') };
  var RT = 'https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/', FLAG = '935917158', AMZ = '935917189', AMZTXT = 'Модуль про Amazon есть в тарифе Премиум Амазон — на него можно перейти с доплатой.', CV = 'https://romanoduvanov.github.io/otzyvy/gc/covers32/';
  var COV = { 935917159: 'm00', 935917160: 'm01', 935917165: 'm02', 935917169: 'm03', 935917170: 'm04', 935917173: 'm05', 935917189: 'amazon', 935917174: 'm06', 935917184: 'm07', 935917186: 'm08' };
  var MG = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'], MS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'], WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
  var txt = function (el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : '' };
  var pl = function (n, f) { n = Math.abs(n) % 100; var a = n % 10; return n > 10 && n < 20 ? f[2] : a > 1 && a < 5 ? f[1] : a === 1 ? f[0] : f[2] };
  var typo = function (el) { if (!el) return; var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), n, re = /(^|[\s\u00a0(«"])([а-яёА-ЯЁ]{1,3}|\d+)[ ](?=\S)/g, f = function (m, a, b) { return a + b + NB };
    while ((n = w.nextNode())) { var v = n.nodeValue, o = v; v = v.replace(re, f).replace(re, f).replace(/ (—|–|·)/g, NB + '$1'); if (v !== o) n.nodeValue = v } };
  var msk = function (t) { var d = new Date(+t + 3 * 36e5); return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), h: ('0' + d.getUTCHours()).slice(-2), mi: ('0' + d.getUTCMinutes()).slice(-2) } };
  var lsGet = function (k) { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch (e) { return null } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} };
  var sha = function (u) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode('gc2:' + u)).then(function (b) { return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2) }).join('').slice(0, 16) }) };
  /* данные рейтинга: modules/schedule — из data.json (если его закрыли — /sched сервера); своя строка (tar, lessons, acc) — по хешу id */
  var dP = null, data = function () { if (dP) return dP; var T = window.__fsxTest;
    if (T && T.D) return (dP = Promise.resolve({ D: T.D, me: T.me || null }));
    var API = String(window.FS_API || '').indexOf('http') === 0 ? window.FS_API : '';
    dP = fetch(RT + 'data.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json() })
      .catch(function () { return API ? fetch(API + '/sched').then(function (r) { return r.json() }).then(function (j) { return { modules: j.modules || [], schedule: j.schedule || [] } }).catch(function () { return null }) : null })
      .then(function (D) { if (T && T.me) return { D: D, me: T.me }; if (!U) return { D: D, me: null };
        var rows = D && D.rows && D.rows.length ? Promise.resolve(D.rows) : window.FS_RATING ? Promise.resolve(window.FS_RATING({})).then(function (r) { return r && r.rows || [] }).catch(function () { return [] }) : Promise.resolve([]);
        return Promise.all([rows, sha(U)]).then(function (x) { return { D: D, me: x[0].filter(function (r) { return r.h === x[1] })[0] || null } }) })
      .catch(function () { return { D: null, me: null } });
    return dP };
  var findLesson = function (D, id) { var hit = null; (D && D.modules || []).forEach(function (m) { (m.parts || []).forEach(function (p) { (p.lessons || []).forEach(function (l) { if (String(l.id) === String(id)) hit = { m: m, p: p, l: l } }) }) }); return hit };
  /* уроков открыто по тарифу (как в «Моих покупках»: части, открытые к этому моменту; Amazon — только у «Премиум Амазон») */
  var openLessons = function (D, tar) { var now = Date.now(); return D && D.modules ? D.modules.reduce(function (n, m) { if (m.amazon && tar !== 'Премиум Амазон') return n;
    return n + (m.parts || []).reduce(function (k, p) { return p.at && Date.parse(p.at) <= now ? k + (p.lessons || []).length : k }, 0) }, 0) || D.total_lessons || 0 : 0 };
  var isStaff = function () { var ui = window.userInfo || {}; return !!(ui.isAdmin || ui.isManager || ui.isTeacher) || !!document.querySelector('.gc-user-admin, .global-edit-btn') };
  var I = { arr: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' };

  /* названия тренингов, которые ученик уже видел (для «нет доступа»: GetCourse не пишет, к чему нет доступа) */
  var keepNames = function () { var rows = document.querySelectorAll('.stream-table tr.training-row[data-training-id]'); if (!rows.length) return; var N = lsGet('fsxTN') || {};
    [].forEach.call(rows, function (tr) { var t = txt(tr.querySelector('.stream-title')); if (t) N[tr.getAttribute('data-training-id')] = t }); lsSet('fsxTN', N) };

  /* ---------- последний открытый урок (для «Продолжить урок» на главной) ---------- */
  var track = function () { if (!U) return; var lid = (location.search.match(/[?&]id=(\d+)/) || location.pathname.match(/\/lesson\/view\/id\/(\d+)/) || [])[1]; if (!lid) return;
    var hb = document.querySelector('.lesson-header-block'); if (!hb) return;
    var t = txt(hb.querySelector('.lesson-title-value')); if (!t) return;
    var cr = document.querySelectorAll('.breadcrumbs a[href*="/stream/view/id/"], .breadcrumb a[href*="/stream/view/id/"]'), root = cr[0] ? ((cr[0].getAttribute('href') || '').match(/\/id\/(\d+)/) || [])[1] : '';
    lsSet('fsxLast:' + U, { id: lid, t: t, href: location.pathname + location.search, root: root || '', rootT: cr[0] ? txt(cr[0]) : '', ts: Date.now() }) };

  /* ---------- главная ученика без флагмана, но со Спринтом/Практикумом: «Перейди на флагман AI-дизайнер 3.0» (решение Романа 26.10) ----------
     Флагман любой версии ищем и в списке тренингов, и в «Моих покупках» (у кого доступ закончился, тренинга в списке нет). Сумма — оплаченные завершённые заказы Спринта/Практикума оттуда же; не удалось получить — без суммы. */
  var FL3 = 'https://oduvanovroman.getcourse.ru/ai3_prem', FLRE = /AI-(креатор|дизайнер)/i, SPRE = /спринт|практикум/i, FLID = { 935552573: 1, 935696410: 1, 935917158: 1, 935869619: 1 };
  var buys = function () { var T = window.__f3Test; if (T) return Promise.resolve(T); var k = 'fsxBuy:' + U, c = null; try { c = JSON.parse(sessionStorage.getItem(k) || 'null') } catch (e) {} if (c && Date.now() - c.t < 6e5) return Promise.resolve(c);
    return fetch('/sales/control/userProduct/my', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : '' }).then(function (t) { var d = new DOMParser().parseFromString(t, 'text/html'), o = { prods: [], done: [], part: [], t: Date.now(), ok: !!t };
      [].forEach.call(d.querySelectorAll('table'), function (tb) { var h = tb.previousElementSibling; while (h && !/^H\d$/.test(h.tagName)) h = h.previousElementSibling; var ttl = h ? h.textContent.trim().toLowerCase() : '';
        [].forEach.call(tb.querySelectorAll('tbody tr'), function (tr) { var td = tr.querySelectorAll('td'), tx = function (i) { return td[i] ? td[i].textContent.replace(/\s+/g, ' ').trim() : '' }; if (td.length < 3) return;
          if (/купленн/.test(ttl)) o.prods.push(tx(0)); else if (/незаверш/.test(ttl)) { if (/частичн/i.test(tx(2))) o.part.push(tx(1)) } else if (/завершен/.test(ttl)) o.done.push({ name: tx(1), status: tx(2), cost: tx(3) }) }) });
      try { sessionStorage.setItem(k, JSON.stringify(o)) } catch (e) {} return o }).catch(function () { return { prods: [], done: [], part: [], ok: false } }) };
  var offer3 = function (root, C) { if (C.some(function (c) { return FLID[c.id] || FLRE.test(c.t) })) return;
    buys().then(function (B) { var names = B.prods.concat(B.part, B.done.map(function (o) { return o.name }));
      if (names.some(function (n) { return FLRE.test(n) })) return;
      var spD = B.done.filter(function (o) { return SPRE.test(o.name) && /заверш|оплач/i.test(o.status) }), all = names.concat(C.map(function (c) { return c.t }));
      var nm = ['Спринт', 'Практикум'].filter(function (w) { return all.some(function (n) { return new RegExp(w, 'i').test(n) }) }); if (!nm.length) return;
      var sum = spD.reduce(function (s, o) { var n = parseInt(String(o.cost || '').replace(/[^\d,.]/g, '').split(/[.,]/)[0], 10); return s + (n > 0 ? n : 0) }, 0), sp = nm.join(' и' + NB), hero = root.querySelector('.fsx-hero'); if (!hero) return;
      hero.className = 'fsx-hero nc fsx-f3'; hero.setAttribute('aria-label', 'Переход на флагман AI-дизайнер 3.0');
      hero.innerHTML = '<div class="fsx-hb"><span class="fsx-eb">Переход на флагман</span><b class="fsx-ht">Перейди на флагман <span style="white-space:nowrap">AI-дизайнер 3.0</span></b><span class="fsx-hm">То, что ты уже заплатил за ' + sp + ', засчитается' + (sum ? ': скидка <b>' + String(sum).replace(/\B(?=(\d{3})+(?!\d))/g, NB) + NB + '₽</b> применится' : '. Скидка применится') + ' автоматически при оформлении — она привязана к твоей почте.</span></div>'
        + '<div class="fsx-f3a"><a class="fsx-btn1" href="' + FL3 + '">Выбрать тариф' + I.arr + '</a><a class="fsx-ln" href="' + FL3 + '">Сравнить тарифы</a></div>';
      hero.hidden = false; typo(hero) }) };
  /* ---------- главная ученика: список тренингов ---------- */
  var home = function () {
    if (!/^\/(?:pl\/)?teach\/control(?:\/stream)?\/?$/.test(location.pathname) || document.querySelector('.fsx-home')) return;
    if (isStaff() && !window.FS_TEST) return;
    var table = document.querySelector('.stream-table'); if (!table) return;
    var row = table.closest('.xdget-row') || table.closest('.xdget-trainingList') || table; if (!row.parentNode) return;
    /* карточки — только реальные данные GetCourse: название, ссылка, обложка (из GetCourse или из темы), подпись «N уроков» и описание */
    var C = [].map.call(table.querySelectorAll('tr.training-row[data-training-id]'), function (tr) { if (getComputedStyle(tr).display === 'none') return null;
      var a = tr.querySelector('td>a'), id = tr.getAttribute('data-training-id'), img = tr.getAttribute('data-training-image') || '', bg = '';
      if (img) bg = 'url("' + img.replace(/["\\]/g, '') + '")'; else if (a) { var b = getComputedStyle(a, '::before').backgroundImage; if (b && /^url\(/.test(b)) bg = b }
      var sub = a && a.querySelector('div'), b2 = sub && sub.querySelector('b'), cnt = txt(b2).replace(/\.$/, ''), desc = sub ? txt(sub).replace(txt(b2), '').replace(/^[\s.]+/, '') : '';
      if (!cnt && /^нет уроков$/i.test(desc)) { cnt = desc; desc = '' } if (/^нет уроков$/i.test(cnt)) cnt = 'Пока без уроков';
      return { id: id, t: txt(tr.querySelector('.stream-title')), href: a ? a.getAttribute('href') : '/teach/control/stream/view/id/' + id, bg: bg, cnt: cnt.replace(/^(\d+) /, '$1' + NB), desc: desc } }).filter(Boolean);
    if (!C.length) return;
    var flag = C.filter(function (c) { return c.id === FLAG })[0] || null;
    var sched = document.querySelector('iframe.fs-sched');
    var name = String(window.accountSafeUserName || '').trim().split(/\s+/)[0] || ''; if (/@|^\d+$/.test(name)) name = '';
    var root = document.createElement('div'); root.className = 'fsx fsx-home';
    var card = function (c) { return '<a class="fsx-c" href="' + esc(c.href) + '" data-id="' + esc(c.id) + '">' + (c.bg ? '<i class="fsx-cv"></i>' : '') + '<b class="fsx-ct">' + esc(c.t) + '</b>'
      + '<div class="fsx-bar" hidden><i></i></div><span class="fsx-cm">' + esc(c.cnt) + '</span>' + (c.desc ? '<span class="fsx-cd">' + esc(c.desc) + '</span>' : '') + '</a>' };
    root.innerHTML = '<h1 class="fsx-h1">' + (name ? 'Привет, ' + esc(name) + '!' : 'Мои курсы') + '<span class="fsx-h1s" hidden> Продолжим?</span></h1><section class="fsx-hero" hidden></section>'
      + '<div class="fsx-grid"><section class="fsx-list" aria-labelledby="fsx-ch"><h2 class="fsx-h2" id="fsx-ch">Мои курсы</h2><div class="fsx-cards">' + C.map(card).join('') + '</div></section><aside class="fsx-side"></aside></div>';
    if (!name) root.querySelector('.fsx-h2').hidden = true;
    [].forEach.call(root.querySelectorAll('.fsx-c'), function (a, i) { var cv = a.querySelector('.fsx-cv'); if (cv) cv.style.backgroundImage = C[i].bg });
    row.parentNode.insertBefore(root, row); row.classList.add('fsx-hide');
    var ph = document.querySelector('.page-header'); if (ph && !ph.querySelector('.btn, button')) ph.classList.add('fsx-hide');
    /* виджет «Актуальные события + истории учеников»: события уже есть в «Ближайшем», оставляем истории учеников */
    var side = root.querySelector('.fsx-side');
    if (sched) { var sw = document.createElement('div'); sw.className = 'fsx-stories'; sched.src = sched.src.split('#')[0] + '#na=1'; sw.appendChild(sched); side.appendChild(sw) }
    R0.classList.add('fsx-on'); typo(root);
    if (!flag) { offer3(root, C); return }
    data().then(function (X) { var D = X.D, me = X.me, now = Date.now(), tar = me && me.tar ? (/amazon/i.test(me.tar) ? 'Премиум Амазон' : me.tar) : '', tl = openLessons(D, tar), ls = me ? Math.min(me.lessons || 0, tl || 1e4) : null, pc = tl && ls != null ? Math.min(100, Math.round(ls / tl * 100)) : null;
      var acc = me && /^\d{4}-\d{2}-\d{2}$/.test(me.acc || '') ? Date.parse(me.acc + 'T23:59:59+03:00') : null, left = acc ? Math.ceil((acc - now) / 864e5) : null, warn = left != null && left <= 30;
      var accTxt = function () { if (!acc) return ''; var m = msk(acc); return left <= 0 ? '<b class="w">доступ закончился</b>' : warn ? 'доступ ещё <b class="w">' + left + NB + pl(left, ['день', 'дня', 'дней']) + '</b>' : 'доступ до ' + m.d + NB + MG[m.mo] + ' ' + m.y };
      /* карточка флагмана: прогресс, тариф, срок доступа */
      var fc = root.querySelector('.fsx-c[data-id="' + FLAG + '"]');
      if (fc && me) { if (pc != null) { var bar = fc.querySelector('.fsx-bar'); bar.hidden = false; bar.firstChild.style.width = pc + '%' }
        fc.querySelector('.fsx-cm').innerHTML = [pc != null ? pc + '%' : '', tar ? esc(tar) : '', accTxt()].filter(Boolean).join(' · ') || esc(flag.cnt) }
      /* «Продолжить»: последний открытый урок, если он из курса, который есть в списке; иначе — сам курс */
      var L = U ? lsGet('fsxLast:' + U) : null, hit = L && findLesson(D, L.id), ok = L && now - L.ts < 60 * 864e5 && (hit || C.some(function (c) { return c.id === L.root })), hero = root.querySelector('.fsx-hero'), hh = '';
      var prog = me && tl ? 'пройдено ' + ls + ' из' + NB + tl + ' ' + pl(tl, ['открытого урока', 'открытых уроков', 'открытых уроков']) : '';
      if (ok) { var cov = hit && COV[hit.m.id] ? CV + COV[hit.m.id] + '.jpg' : '', eb = hit ? ['AI-креатор 2.0', String(hit.m.name || '').split(' — ')[0], hit.p.name ? String(hit.p.name).split(' / ')[0] : ''].filter(Boolean).join(' · ') : L.rootT;
        hh = (cov ? '<img class="fsx-hc" src="' + cov + '" alt="" loading="lazy">' : '') + '<div class="fsx-hb"><span class="fsx-eb">' + esc(eb) + '</span><b class="fsx-ht">' + esc(hit ? hit.l.t : L.t) + '</b>' + (hit && prog ? '<span class="fsx-hm">' + prog + '</span>' : '') + '</div>'
          + '<a class="fsx-btn1" href="' + esc(L.href) + '">Продолжить урок' + I.arr + '</a>' }
      else { hh = (flag.bg ? '<i class="fsx-hc fsx-cv"></i>' : '') + '<div class="fsx-hb"><span class="fsx-eb">Курс' + (tar ? ' · тариф ' + esc(tar) : '') + '</span><b class="fsx-ht">' + esc(flag.t) + '</b>' + (prog ? '<span class="fsx-hm">' + prog + '</span>' : '') + '</div>'
          + '<a class="fsx-btn1" href="' + esc(flag.href) + '">' + (ls ? 'Продолжить обучение' : 'Перейти к курсу') + I.arr + '</a>' }
      hero.innerHTML = hh; hero.hidden = false; if (hero.className.indexOf('nc') < 0 && !hero.querySelector('.fsx-hc')) hero.classList.add('nc');
      var hcv = hero.querySelector('i.fsx-hc'); if (hcv) hcv.style.backgroundImage = flag.bg;
      if (ok && name) root.querySelector('.fsx-h1s').hidden = false;
      /* «Ближайшее»: следующий модуль по расписанию (Amazon — только в тарифе «Премиум Амазон»), ×2 первые 48 часов */
      var S = (D && D.modules && D.modules.length ? D.modules : D && D.schedule || []).filter(function (m) { var t = Date.parse(m.at); return t > now && (!(m.amazon || /amazon/i.test(m.name || '')) || tar === 'Премиум Амазон') }).sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at) })[0];
      var sh = '';
      if (S) { var m = msk(Date.parse(S.at)); sh += '<div class="fsx-card fsx-nx"><span class="fsx-eb">Ближайшее</span><div class="fsx-nr"><div class="fsx-dt"><b>' + m.d + '</b><span>' + MS[m.mo] + '</span></div><div class="fsx-nt"><b>' + esc(String(S.name || '').replace(/\u00a0/g, ' ')) + '</b><span>'
        + WD[m.wd] + ', ' + m.h + ':' + m.mi + NB + 'МСК · ×2 первые 48' + NB + 'ч</span></div></div><a class="fsx-ln" href="/teach/control/schedule">Всё расписание →</a></div>' }
      if (warn) { var ma = msk(acc); sh += '<div class="fsx-card fsx-ext"><span class="fsx-eb">' + (left > 0 ? 'Продлить доступ' : 'Доступ закончился') + '</span><span class="fsx-et">' + (left > 0 ? 'Доступ к «' + esc(flag.t) + '» закончится ' + ma.d + NB + MG[ma.mo] + '.' : 'Доступ к «' + esc(flag.t) + '» закончился — его можно продлить.') + '</span>'
        + '<a class="fsx-btn2" href="' + ((window.FS_PROLONG && window.FS_PROLONG(flag.t)) || CARE) + '">Продлить доступ</a></div>' }
      if (sh) side.insertAdjacentHTML('afterbegin', sh);
      typo(root) }) };

  /* ---------- ошибки GetCourse #403 / #404 (шаблон с h3 «Возникла ошибка #…») ---------- */
  var err = function () { if (document.querySelector('.fsx-err')) return;
    var h3 = [].filter.call(document.querySelectorAll('h3'), function (h) { return /Возникла ошибка\s*#\s*(403|404)/.test(h.textContent) })[0]; if (!h3) return;
    var code = h3.textContent.match(/#\s*(403|404)/)[1], box = h3.closest('.page-normal-padding') || h3.parentNode;
    var s = document.createElement('section'); s.className = 'fsx fsx-err fsx-e' + code; s.setAttribute('role', 'main');
    var care = '<a class="fsx-btn2" href="' + CARE + '" target="_blank" rel="noopener">Служба заботы</a>';
    if (code === '404') {
      s.innerHTML = '<span class="fsx-404" aria-hidden="true">404</span><h1 class="fsx-eh">Такой страницы нет</h1><p class="fsx-ep">Возможно, ссылка устарела или урок перенесли. Вернись к курсам — всё на месте.</p>'
        + '<div class="fsx-eg"><a class="fsx-btn1" href="' + HOME + '">К моим курсам</a>' + care + '</div>';
      document.title = 'Страница не найдена · OduvanovSchool' }
    else {
      s.innerHTML = '<div class="fsx-card fsx-na"><span class="fsx-chip">Нет доступа</span><h1 class="fsx-eh">Этот курс не входит в твой тариф</h1><p class="fsx-ep">Получить доступ можно с доплатой — напиши в службу заботы, подскажем, как повысить тариф.</p>'
        + '<div class="fsx-eg"><a class="fsx-btn1" href="' + upHref('') + '" target="_blank" rel="noopener">Повысить тариф</a><a class="fsx-btn2" href="' + HOME + '">К моим курсам</a><a class="fsx-btn3" href="' + CARE + '" target="_blank" rel="noopener">Служба заботы</a></div>'
        + '<span class="fsx-en">Если считаешь, что доступ должен быть, напиши в службу заботы, разберёмся.</span></div>';
      document.title = 'Нет доступа · OduvanovSchool';
      /* что закрыто: тренинг по id (название из data.json или из списка, который ученик видел) или урок (модуль из data.json) */
      var tid = (location.pathname.match(/\/stream\/view\/id\/(\d+)/) || [])[1], lid = /\/lesson\//.test(location.pathname) ? (location.search.match(/[?&]id=(\d+)/) || location.pathname.match(/\/id\/(\d+)/) || [])[1] : '';
      data().then(function (X) { var D = X.D, tar = X.me && X.me.tar || '', N = lsGet('fsxTN') || {}, nm = '', amz = false;
        if (tid) { var mm = (D && D.modules || []).filter(function (m) { return String(m.id) === tid })[0]; if (mm) { nm = mm.name; amz = !!mm.amazon } else nm = N[tid] || ''; if (/amazon/i.test(nm)) amz = true }
        else if (lid) { var h = findLesson(D, lid); if (h) { nm = h.m.name; amz = !!h.m.amazon } }
        nm = String(nm || '').replace(/\u00a0/g, ' ').trim();
        var top = tar === 'Премиум Амазон', what = nm ? '«' + nm + '»' : '', eh = s.querySelector('.fsx-eh'), ep = s.querySelector('.fsx-ep'), g = s.querySelector('.fsx-eg');
        if (top) { eh.textContent = what ? 'Доступ к ' + what + ' пока не открыт' : 'Доступ к этому курсу пока не открыт';
          ep.innerHTML = 'У тебя тариф <b>' + esc(tar) + '</b>. Напиши в службу заботы — разберёмся с доступом.';
          g.innerHTML = '<a class="fsx-btn1" href="' + CARE + '" target="_blank" rel="noopener">Служба заботы</a><a class="fsx-btn2" href="' + HOME + '">К моим курсам</a>'; s.querySelector('.fsx-en').hidden = true }
        else { if (what) eh.textContent = what + ' не входит в твой тариф';
          ep.innerHTML = (tar ? 'Сейчас у тебя тариф <b>' + esc(tar) + '</b>. ' : '') + (amz ? AMZTXT : 'Получить доступ можно с доплатой — напиши в службу заботы, подскажем, как повысить тариф.');
          g.querySelector('.fsx-btn1').href = upHref(nm, amz && tar === 'Премиум') }
        typo(s) }) }
    box.parentNode.insertBefore(s, box); box.classList.add('fsx-hide'); R0.classList.add('fsx-on', 'fsx-errp'); typo(s) };

  /* ---------- модуль Amazon для учеников без него в тарифе (решение Романа): закрытая карточка в списке модулей курса и в расписании, по клику — экран «не входит в тариф» поверх страницы ---------- */
  var amzTest = /[?&]fsTest=amazon\b/.test(location.search);
  var amzMod = function (D) { return (D && D.modules || []).filter(function (m) { return m.amazon || String(m.id) === AMZ })[0] || null };
  var amzN = function (m) { return (m.parts || []).reduce(function (k, p) { return k + (p.lessons || []).length }, 0) };
  var amzName = function (m) { var n = String(m.name || 'Amazon').replace(/ /g, ' ').trim(); return /модуль/i.test(n) ? n : 'Модуль «' + n + '»' };
  /* показывать: не сотрудник (или ?fsTest=amazon), тариф не «Премиум Амазон»; тариф неизвестен — решает признак «модуля нет среди доступных» (have=false) */
  var amzOK = function (have) { if (isStaff() && !amzTest) return Promise.resolve(null); if (have && !amzTest) return Promise.resolve(null);
    return data().then(function (X) { var tar = X.me && X.me.tar || ''; if (tar === 'Премиум Амазон' && !amzTest) return null; var m = amzMod(X.D); if (!m) return null; var M = X.D.modules, order = M.slice(0, M.indexOf(m)).map(function (x) { return String(x.id) });
      return { m: m, tar: tar, D: X.D, order: order } }) };
  var ov = null, lastF = null;
  var amzOpen = function (A) { if (!ov) { ov = document.createElement('div'); ov.className = 'fsx fsx-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'fsx-ovh'); document.body.appendChild(ov);
      ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.fsx-ovx')) amzClose() });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('on')) amzClose() }) }
    var nm = amzName(A.m), n = amzN(A.m);
    ov.innerHTML = '<div class="fsx-card fsx-na"><button type="button" class="fsx-ovx" aria-label="Закрыть">×</button><span class="fsx-chip">Не входит в тариф</span><h1 class="fsx-eh" id="fsx-ovh">' + esc(nm) + ' не входит в твой тариф</h1>'
      + '<p class="fsx-ep">' + (A.tar ? 'Сейчас у тебя тариф <b>' + esc(A.tar) + '</b>. ' : '') + AMZTXT + (n ? ' В модуле ' + n + NB + pl(n, ['урок', 'урока', 'уроков']) + (A.m.desc ? ': ' + esc(A.m.desc) : '') + '.' : '') + '</p>'
      + '<div class="fsx-eg"><a class="fsx-btn1" href="' + upHref(nm, true) + '">Повысить тариф</a><a class="fsx-btn2" href="' + HOME + '">К моим курсам</a><a class="fsx-btn3" href="' + CARE + '" target="_blank" rel="noopener">Служба заботы</a></div>'
      + '<span class="fsx-en">Если считаешь, что доступ должен быть, напиши в службу заботы, разберёмся.</span></div>';
    typo(ov); lastF = document.activeElement; R0.classList.add('fsx-ov-open'); requestAnimationFrame(function () { ov.classList.add('on'); var b = ov.querySelector('.fsx-btn1'); if (b) b.focus() }) };
  var amzClose = function () { if (!ov) return; ov.classList.remove('on'); R0.classList.remove('fsx-ov-open'); if (/[?&]fs=upgrade\b/.test(location.search)) try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])fs=upgrade\b&?/, '$1').replace(/[?&]$/, '')) } catch (e) {} if (lastF && lastF.focus) lastF.focus() };
  var amzHref = function () { return location.pathname.replace(/\/$/, '') === '/teach/control/stream/view/id/' + FLAG ? '?fs=upgrade' + (amzTest ? '&fsTest=amazon' : '') : '/teach/control/stream/view/id/' + FLAG + '?fs=upgrade' + (amzTest ? '&fsTest=amazon' : '') };
  var amzBind = function (el, A) { el.addEventListener('click', function (e) { e.preventDefault(); amzOpen(A) }) };
  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  /* страница курса: строка в «Доступных модулях» на месте модуля по порядку data.json */
  var amzCourse = function () { if (!new RegExp('^/(?:pl/)?teach/control/stream/view/id/' + FLAG + '/?$').test(location.pathname)) return;
    var tb = document.querySelector('.stream-table'); if (!tb || tb.querySelector('.fsx-amz')) return;
    amzOK(!!tb.querySelector('tr.training-row[data-training-id="' + AMZ + '"]')).then(function (A) { if (!A || tb.querySelector('.fsx-amz')) return;
      var n = amzN(A.m), tr = document.createElement('tr'); tr.className = 'training-row no-children fsx-amz'; tr.setAttribute('data-training-id', 'fsx-amz');
      tr.innerHTML = '<td><a href="' + amzHref() + '" aria-haspopup="dialog"><span class="fsx-amz-ch"><span class="fsx-amz-c">' + LOCK + 'Не входит в тариф</span><span class="fsx-amz-c o">Можно докупить</span></span><span class="stream-title">' + esc(String(A.m.name || 'Amazon').replace(/ /g, ' ')) + '</span>'
        + '<div><b data-fs="1">' + (n ? n + NB + pl(n, ['урок', 'урока', 'уроков']) : '') + '</b>' + (A.m.desc ? ' ' + esc(A.m.desc.charAt(0).toUpperCase() + A.m.desc.slice(1)) : '') + '</div></a></td>';
      var rows = [].slice.call(tb.querySelectorAll('tr.training-row')), at = null;
      (A.order || []).forEach(function (id) { var r = tb.querySelector('tr.training-row[data-training-id="' + id + '"]'); if (r) at = r });
      if (at && at.nextSibling) at.parentNode.insertBefore(tr, at.nextSibling); else (rows.length ? rows[rows.length - 1].parentNode : tb.tBodies[0] || tb).appendChild(tr);
      amzBind(tr.querySelector('a'), A); typo(tr) }) };
  /* расписание: закрытый пункт среди модулей по дате */
  var amzSched = function () { if (!/^\/(?:pl\/)?teach\/control\/schedule/.test(location.pathname)) return; var t = 0;
    var put = function () { var box = document.querySelector('.fs-sch'), its = box ? box.querySelectorAll('.fs-sch-m') : []; if (!its.length) { if (++t < 60) setTimeout(put, 500); return } if (box.querySelector('.fsx-amz-s')) return;
      var have = [].some.call(box.querySelectorAll('.fs-sch-n b'), function (b) { return /amazon/i.test(b.textContent) });
      amzOK(have).then(function (A) { if (!A || box.querySelector('.fsx-amz-s')) return; var at = Date.parse(A.m.at), n = amzN(A.m), m = at ? msk(at) : null;
        var el = document.createElement('a'); el.className = 'fs-sch-m fsx-amz-s'; el.href = amzHref(); el.setAttribute('aria-haspopup', 'dialog');
        el.innerHTML = '<div class="fs-sch-h"><div class="fs-sch-d">' + (m ? '<b>' + m.d + ' ' + MS[m.mo] + '</b><span>' + WD[m.wd] + ', ' + m.h + ':' + m.mi + NB + 'МСК</span>' : '<b>Скоро</b><span>дата уточняется</span>') + '</div><div class="fs-sch-n"><b>' + esc(String(A.m.name || 'Amazon').replace(/ /g, ' ')) + '</b><span>' + (n ? n + NB + pl(n, ['урок', 'урока', 'уроков']) + ' · ' : '') + 'можно докупить</span></div><span class="fsx-amz-c">' + LOCK + 'Не входит в тариф</span></div>';
        /* место: перед первым модулем, который открывается позже (даты пунктов — из data.json по названию) */
        var mods = (A.D && A.D.modules || []), when = function (it) { var nm = (it.querySelector('.fs-sch-n b') || {}).textContent || '', mm = mods.filter(function (x) { return String(x.name || '').replace(/ /g, ' ').trim() === nm.replace(/ /g, ' ').trim() })[0]; return mm ? Date.parse(mm.at) : null };
        var after = [].filter.call(its, function (it) { var w = when(it); return at && w && w > at })[0];
        if (after) after.parentNode.insertBefore(el, after); else its[its.length - 1].parentNode.appendChild(el);
        amzBind(el, A); typo(el) }) };
    put() };
  /* прямая ссылка ?fs=upgrade (в т. ч. если клик сработал без JS-обработчика) — сразу экран поверх курса */
  var amzDirect = function () { if (!/[?&]fs=upgrade\b/.test(location.search)) return; var have = !!document.querySelector('.stream-table tr.training-row[data-training-id="' + AMZ + '"]');
    amzOK(have).then(function (A) { if (A) amzOpen(A) }) };

  var go = function () { try { keepNames() } catch (e) {} try { err() } catch (e) {} try { home() } catch (e) {} if (/\/teach\/control\/lesson\/view/.test(location.pathname)) try { track() } catch (e) {} try { amzCourse(); amzSched(); amzDirect() } catch (e) {} };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();


  /* ===== страницы оплаты продления (26.10): название продукта/тренинга -> служебная страница; null — продления нет (тогда служба заботы) ===== */
  window.FS_PROLONG = function (name) { var s = String(name || '');
    if (/AI-(дизайнер|креатор)/i.test(s) && /2\.0/.test(s)) return '/prodlenie-2-0';
    if (/спринт/i.test(s)) return '/prodlenie-sprint';
    if (/практикум/i.test(s)) return '/prodlenie-praktikum';
    return null };


/* Кабинет внутри Telegram (мини-апп бота @oduvanov_school_bot).
   Включается меткой ?tg=1 в адресе мини-аппа или, если Telegram сам передал данные запуска, и запоминается на сессию.
   Делает: шапка и фон #000106, на весь экран, кнопка «Назад» Telegram, внешние ссылки и оплаты — в браузере,
   t.me — внутри Telegram, старт с нужной страницы по ссылке t.me/oduvanov_school_bot?startapp=<код>. */
(function () {
  var on = false; try { on = /[?&]tg=1\b/.test(location.search) || /tgWebApp/.test(location.hash) || sessionStorage.getItem('fsTg') === '1' } catch (e) {}
  if (!on || window.top !== window) return;
  try { sessionStorage.setItem('fsTg', '1') } catch (e) {}
  document.documentElement.classList.add('fs-tg');
  var HOST = location.host, START = { rating: '/teach/control/stream/view/id/935952152', buy: '/sales/control/userProduct/my', profile: '/user/my/profile', schedule: '/teach/control/schedule', course: '/teach/control/stream/view/id/935917158' };
  var PAY = /\/sales\/shop|\/pl\/sales\/shop|dealPay|\/payment\/|\/pay\b|\/cms\/system\/order/i;
  function go(W) {
    try { W.ready(); W.expand(); if (W.setHeaderColor) W.setHeaderColor('#000106'); if (W.setBackgroundColor) W.setBackgroundColor('#000106'); if (W.setBottomBarColor) W.setBottomBarColor('#000106'); if (W.disableVerticalSwipes) W.disableVerticalSwipes() } catch (e) {}
    /* старт с нужной страницы — один раз за сессию */
    try { var sp = W.initDataUnsafe && W.initDataUnsafe.start_param;
      if (sp && sessionStorage.getItem('fsTgStart') !== sp) { sessionStorage.setItem('fsTgStart', sp);
        var to = START[sp] || (/^l\d+$/.test(sp) ? '/pl/teach/control/lesson/view?id=' + sp.slice(1) : /^s\d+$/.test(sp) ? '/teach/control/stream/view/id/' + sp.slice(1) : null);
        if (to && location.pathname + location.search !== to) { location.replace(to); return } } } catch (e) {}
    /* кнопка «Назад»: везде, кроме стартовой страницы */
    try { var home = /^\/teach\/control\/stream\/?$/.test(location.pathname);
      if (W.BackButton) { if (!home && history.length > 1) { W.BackButton.show(); W.BackButton.onClick(function () { history.back() }) } else W.BackButton.hide() } } catch (e) {}
    /* ссылки: t.me — в Telegram, чужие сайты и оплаты — во внешнем браузере */
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest && ev.target.closest('a[href]'); if (!a) return;
      var u; try { u = new URL(a.getAttribute('href'), location.href) } catch (e) { return }
      if (!/^https?:$/.test(u.protocol)) return;
      if (/^(t\.me|telegram\.me)$/i.test(u.host)) { ev.preventDefault(); try { W.openTelegramLink(u.href) } catch (e) { location.href = u.href } return }
      if (u.host !== HOST || PAY.test(u.pathname)) { ev.preventDefault(); try { W.openLink(u.href) } catch (e) { window.open(u.href, '_blank') } return }
      if (a.target === '_blank') a.removeAttribute('target');
    }, true);
  }
  if (window.Telegram && window.Telegram.WebApp) return go(window.Telegram.WebApp);
  var s = document.createElement('script'); s.src = 'https://telegram.org/js/telegram-web-app.js?59'; s.async = true;
  s.onload = function () { if (window.Telegram && window.Telegram.WebApp) go(window.Telegram.WebApp) };
  (document.head || document.documentElement).appendChild(s);
})();
