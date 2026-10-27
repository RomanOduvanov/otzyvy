/* OduvanovSchool · appskin.js — «Уроки внутри приложения», этап 2 (макет L4–L7, утверждён 28.10.2026).
   Подключает eco.js только в режиме Telegram (html.eco-tg) и только на ширине ≤767.
   Ничего не рисует заново: одевает то, что уже собрал layout.js (шаблон урока .fl-*), в кожу мини-приложения:
   шапка приложения вместо сайтовой, панель «Назад / Дальше» над вкладками, клавиатура (L5b), анкета (L3c), вход (L6), «под учеником» (L7b).
   Формы GetCourse остаются формами GetCourse: поля и кнопки те же, мы их только стилизуем и нажимаем по просьбе ученика. */
(function () {
  if (window.top !== window || window.__appskin) return;
  var R = document.documentElement;
  if (!R.classList.contains('eco-tg') || innerWidth > 767) return;
  window.__appskin = 1;
  var APP = 'https://romanoduvanov.github.io/otzyvy/gc/app.html', GH = 'https://romanoduvanov.github.io/otzyvy/gc/';
  var P = location.pathname, isLes = /\/teach\/control\/lesson\/view/.test(P), isLog = /^\/(pl\/)?cms\/system\/login/.test(P), isEd = /\/teach\/control\/answers\/edit/.test(P);
  var LID = ((location.pathname + location.search).match(/lesson\/view(?:\/id\/|\?id=)(\d+)/) || [])[1] || '';
  var SUB = !!window.isSublogined, NB = '\u00a0';
  var TG = function () { return window.Telegram && window.Telegram.WebApp || null };
  var $ = function (s, r) { return (r || document).querySelector(s) }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)) };
  var txt = function (e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : '' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
  var pl = function (n, f) { n = Math.abs(n); var a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2] };
  var ss = function (k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v) } catch (e) {} return null };
  var svg = function (d, s, w) { return '<svg aria-hidden="true" width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2.2) + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>' };
  var I = { back: '<path d="m15 6-6 6 6 6"/>', l: '<path d="M15 5l-7 7 7 7"/>', r: '<path d="M9 5l7 7-7 7"/>', home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>', ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', al: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>', tg: '<path d="M21 4L3 11l6 2.5L11 20l3-4.5 5 3.5z" fill="currentColor" stroke="none"/>', up: '<path d="M12 16V4M7 9l5-5 5 5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7.5l8 6 8-6"/>', file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', send: '<path d="M5 12h13M12 6l6 6-6 6"/>', al2: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.5"/>', ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>' };
  var cl = function (c, on) { R.classList.toggle(c, !!on) };
  cl('as-on', isLes || isLog || isEd); cl('as-ls', isLes); cl('as-lg', isLog); cl('as-ed', isEd); cl('as-sub', SUB);

  /* ---------- стили (токены макета: #000106, карточки #161616, Inter Tight) ---------- */
  var SB = 'max(env(safe-area-inset-bottom), calc(var(--tg-safe-area-inset-bottom,0px) + var(--tg-content-safe-area-inset-bottom,0px)))';
  /* 28.10 (слияние): высота нижней панели #ecoTabs — как в приложении, max(84px, 50px + полоса «домой») (eco.js даёт --eco-tb); раньше считали 84px + полоса */
  var TB = 'var(--eco-tb, max(84px, calc(50px + ' + SB + ')))';
  var TOP = 'var(--tg-top,0px)', BH = 46, NAVB = 'calc(' + TB + ' + 36px)';
  var L = ':root.as-ls.fl-on body ';
  var css = ''
    + ':root.as-on{--as-s0:#0c0c0c;--as-s1:#161616;--as-s2:#1f1f1f;--as-ink2:rgba(255,255,255,.58);--as-ink3:rgba(255,255,255,.44);--as-hair:rgba(255,255,255,.07);--as-lil:#c38bff;--as-acc:#d77fff;--as-F:"Inter Tight",Inter,system-ui,sans-serif;--as-top:calc(' + TOP + ' + ' + BH + 'px)}'
    + ':root.as-on.as-sub{--as-top:calc(' + TOP + ' + ' + BH + 'px + 54px)}'
    /* сайтовое — прячем: шапка GetCourse, свои ←/⌂ сайта, админские кнопки, виджеты, крошки, раскрывашка уроков части, нижняя панель layout.js */
    + ':root.as-on body .top-menu,:root.as-on body .main-menu,:root.as-on .eco-tgw,:root.as-on .eco-tgf,:root.as-on body>.global-controls,:root.as-on body .global-controls.eco-gc,:root.as-on .eco-chip,:root.as-on .talks-widget-button,:root.as-on .help-widget-button,:root.as-on #gc-left-menu-mobile-badge-host,:root.as-on .gc-account-leftbar,:root.as-on body .page-header .page-actions,:root.as-ls body .page-header,:root.as-on body .fs-foot,:root.as-sv body .fl-oth{display:none!important}'
    + ':root.as-on body .gc-main-content{padding-top:var(--as-top)!important;padding-bottom:0!important;margin:0!important}:root.as-ls body .standard-page-content,:root.as-ls body .container:has(.fl),:root.as-ls body .center-block{padding-bottom:0!important;margin-bottom:0!important}'
    + ':root.as-on body{background:#000106!important}'
    + L + '.fl-bar,' + L + '.fl-mp,' + L + '.fl-bc,' + L + '.fl-aside,' + L + '.fl-hd p.fl-meta:first-of-type,' + L + '.fl-chips .fl-chip:not(.l){display:none!important}'
    + L + '.fl-chips:not(:has(.fl-chip.l)){display:none!important}'
    /* шапка приложения */
    + '#asBar{position:fixed;left:0;right:0;top:0;z-index:99985;height:calc(' + TOP + ' + ' + BH + 'px);padding:' + TOP + ' 4px 0;box-sizing:border-box;display:flex;align-items:center;background:#000106;border-bottom:1px solid rgba(255,255,255,.05);font-family:var(--as-F);color:#fff}'
    + '#asBar button{all:unset;box-sizing:border-box;cursor:pointer;height:44px;display:flex;align-items:center;-webkit-tap-highlight-color:transparent}'
    + '#asBar .l{width:96px;gap:2px;padding-left:6px;color:var(--as-lil);font-size:15px}#asBar .r{width:96px;justify-content:flex-end;padding-right:10px;color:rgba(255,255,255,.7)}#asBar .r[hidden]{visibility:hidden}'
    + '#asBar .t{flex:1;min-width:0;text-align:center;display:flex;flex-direction:column;line-height:1.15}#asBar .t b{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#asBar .t small{font-size:11px;color:var(--as-ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    /* «под учеником» (L7b): плашка под шапкой и сплошная рамка по контуру экрана */
    + '#asSub{position:fixed;left:0;right:0;top:calc(' + TOP + ' + ' + BH + 'px);z-index:99984;height:54px;box-sizing:border-box;display:flex;align-items:center;gap:10px;padding:8px 10px 8px 14px;background:linear-gradient(90deg,#4a2410,#22110a);border-bottom:1px solid rgba(255,180,140,.35);font:400 13px/1.25 var(--as-F);color:#fff}'
    + '#asSub>svg{flex:none;color:#ffb48c}#asSub span{flex:1;min-width:0}#asSub span b{display:block;font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#asSub span small{color:rgba(255,215,191,.75);font-size:11.5px}'
    + '#asSub a:not([hidden]){display:grid!important}#asSub a{height:36px;padding:0 14px;border-radius:11px;background:#fff;color:#000106!important;font:600 13.5px var(--as-F);flex:none;display:grid;place-items:center;text-decoration:none!important}#asSub a[hidden]{display:none}'
    + ':root:not(.as-on) #asSub{top:' + TOP + '}:root.as-sub:not(.as-on) body .gc-main-content{padding-top:calc(60px + ' + TOP + ' + 54px)!important}:root.as-sub:not(.as-on) #asSub{top:calc(60px + ' + TOP + ')}'
    + '#asFr{position:fixed;inset:0;z-index:2147483000;pointer-events:none;box-shadow:inset 0 0 0 2px rgba(255,180,140,.8),inset 0 0 26px rgba(255,180,140,.14)}'
    + '.as-off,.as-off:hover,:root body .as-off:not(#_):not(#__){background:rgba(255,255,255,.06)!important;color:rgba(255,255,255,.35)!important;box-shadow:none!important;border:1px dashed rgba(255,255,255,.18)!important;pointer-events:none!important;cursor:default!important}'
    + '.as-state{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:14px;background:rgba(255,180,140,.1);color:#ffd7bf;font:400 13px/1.4 var(--as-F);margin:10px 0 0}.as-state svg{flex:none;margin-top:1px;color:#ffb48c}'
    /* каркас урока (L4): поля 16, промежутки 12 */
    + L + '.container:has(.fl){padding-left:16px!important;padding-right:16px!important}'
    + L + '.fl{gap:12px!important;padding:14px 0 0!important;margin-bottom:0!important}' + L + '.fl-main{gap:12px!important}'
    + L + '.fl-hd{gap:10px!important;padding:0!important}'
    + L + '.fl h1.fl-t{font-size:28px!important;font-weight:500!important;letter-spacing:-.025em!important;line-height:1.1!important;margin:2px 0 0!important}'
    + L + '.fl h1.fl-t span{color:inherit!important}'
    + L + '.fl-hd p.fl-meta,' + L + '.fs-svp{font-size:14px!important;color:var(--as-ink2)!important;margin:0!important;line-height:1.4!important}'
    + '#asHr{display:flex;align-items:center;gap:8px;flex-wrap:wrap}#asHr .och,.as-och{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:99px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4);font:700 10.5px/1 var(--as-F);letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;color:#fff}#asHr .m{color:var(--as-ink3);font-size:12px}'
    + L + '.lite-page{display:flex!important;flex-direction:column;gap:12px!important;row-gap:12px!important}' + L + '.lite-page>*{margin:0!important}' + L + '.lite-page>.fl-next{order:3}' + L + '.lite-page>.o-lt-lesson-comment-block{order:2}'
    + L + '.lite-page .lt-block-wrapper,' + L + '.lite-page .lt-block>.lt-block-wrapper>.container{padding:0!important;margin:0!important;max-width:none!important;width:auto!important}'
    + L + '.lite-page .row{margin:0!important}' + L + '.lite-page .lt-block,' + L + '.lite-page .lt-block .container,' + L + '.lite-page .modal-block-content,' + L + '.lt-form-survey .lt-form-inner,' + L + '.lt-form-survey .builder,' + L + '.lt-form-survey .form-content{padding:0!important;margin:0!important}' + L + '.lite-page [class*="col-md"]{padding:0!important;width:100%!important;margin-left:0!important}'
    /* видео — скругление 20 */
    + L + '.lt-video .container,' + L + '.lt-video .lt-block-wrapper{padding:0!important}' + L + '.lt-video iframe,' + L + '.lt-video video,' + L + '.lt-video .vhi-root,' + L + '.lt-video [class*="player"]{border-radius:20px!important;overflow:hidden}'
    + L + '.lt-video .lt-block-wrapper>.container>*{border-radius:20px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}'
    /* карточки */
    + L + '.fl-card{border-radius:24px!important;padding:16px!important;background:var(--as-s1)!important;border:1px solid var(--as-hair)!important}'
    + L + '.fl-about{gap:16px!important}' + L + '.fl-lbl{background:none!important;padding:0!important;margin:0 0 10px!important;font:700 10.5px/1 var(--as-F)!important;letter-spacing:.12em!important;color:var(--as-lil)!important}'
    + L + '.fl-pts{gap:8px!important}' + L + '.fl-pts li{font-size:13.5px!important;line-height:1.35!important;gap:10px!important;color:rgba(255,255,255,.88)!important}' + L + '.fl-pts li svg{width:18px;height:18px;margin-top:0!important}'
    + L + '.fl-tc a b{color:#e2c9ff!important}'
    /* материалы (L4 — плитки по две; L4b — список с «Скачать / Открыть») */
    + L + 'section.as-mats{background:none!important;border:0!important;padding:0!important;border-radius:0!important}'
    + L + 'section.as-mats h2.fl-h{font-size:16px!important;font-weight:500!important;margin:0 2px 10px!important;letter-spacing:0!important}'
    + L + '.as-mats .fl-mats{gap:8px!important;grid-template-columns:1fr 1fr!important}' + L + '.as-mats .fl-mat{padding:10px!important;gap:10px!important;border-radius:16px!important;background:var(--as-s1)!important;min-height:60px}'
    + L + '.as-mats .fl-ic{width:40px!important;height:40px!important;border-radius:12px!important;background:rgba(195,139,255,.16)!important;color:#e2c9ff!important}' + L + '.as-mats .fl-ic svg{width:20px;height:20px}'
    + L + '.as-mats .fl-mat .t b{font-size:13px!important;line-height:1.25!important;color:#fff!important;font-weight:500!important}' + L + '.as-mats .fl-mat .t span{font-size:11.5px!important;color:var(--as-ink3)!important;margin:0!important}'
    + L + '.as-mats .fl-go{display:none!important}' + L + '.as-mats .fl-mg{grid-column:1/-1;font-size:12px;color:var(--as-ink3);margin:4px 2px 0}'
    + L + '.as-mats.as-list .fl-mats{display:flex!important;flex-direction:column;gap:0!important;padding:4px 16px;border-radius:24px;background:var(--as-s1);border:1px solid var(--as-hair)}'
    + L + '.as-mats.as-list .fl-mat{background:none!important;border:0!important;border-top:1px solid rgba(255,255,255,.06)!important;border-radius:0!important;padding:10px 0!important;gap:12px!important}' + L + '.as-mats.as-list .fl-mat:first-child{border-top:0!important}'
    + L + '.as-mats.as-list .fl-mat .t b{font-size:14px!important}' + L + '.as-mats.as-list .fl-mat .t span{font-size:12px!important}'
    + L + '.as-mats.as-list .fl-go{display:flex!important;background:none!important;padding:0!important;height:44px!important;color:#e2c9ff!important;font-size:13px!important;font-weight:600!important;gap:4px!important}' + L + '.as-mats.as-list .fl-go span{display:inline!important}' + L + '.as-mats.as-list .fl-go svg{display:none}' + L + '.as-mats.as-list .fl-mat.as-ext .fl-go svg{display:block}'
    /* «Как тебе урок?» (L4a): звёзды 52 */
    + L + '.fl-fb{display:flex!important;flex-direction:column;gap:12px}' + L + '.fl-fb h2{font-size:20px!important;font-weight:500!important;letter-spacing:-.02em!important;margin:0!important}' + L + '.fl-fb>p{color:var(--as-ink2)!important;font-size:13px!important;margin:-6px 0 0!important}'
    + L + '.fl-fb .fl-st{display:flex!important;gap:8px!important;margin:0!important}' + L + '.fl-fb textarea{margin:0!important}' + L + '.fl-fb .fl-st button{width:52px!important;height:52px!important;border-radius:14px!important;border:1px solid rgba(255,255,255,.08)!important;background:var(--as-s0)!important;color:rgba(255,255,255,.25)!important;display:grid!important;place-items:center;padding:0!important}'
    + L + '.fl-fb .fl-st button.on{color:#c38bff!important;border-color:rgba(195,139,255,.4)!important}' + L + '.fl-fb .fl-st svg{width:24px;height:24px}'
    + L + '.fl-fb textarea{height:72px!important;min-height:72px!important}' + L + '.training-feedback-widget{margin:0!important}' + L + '.lite-page>.o-lt-lesson-mission-block:not(:has(.fl-mis)){display:none!important}' + L + '.fl-fb .fl-fr{margin:0!important;display:flex;flex-direction:column;gap:6px}'
    + L + '.fl-fb .fl-sb{width:100%!important;height:46px!important;border-radius:14px!important;background:var(--as-s2)!important;border:1px solid rgba(255,255,255,.09)!important;color:#fff!important;font:500 14px var(--as-F)!important;box-shadow:none!important}' + L + '.fl-fb .fl-sb:disabled{opacity:.55}'
    /* поля ввода: не меньше 16px (иначе iPhone увеличивает экран), растут до половины экрана */
    + ':root.as-on body textarea,:root.as-on body input[type=text],:root.as-on body input[type=email],:root.as-on body input[type=password],:root.as-on body input[type=search],:root.as-on body input:not([type]){font-size:16px!important}'
    + ':root.as-on body .fl textarea:not(.settings-value),:root.as-on body .lt-form-survey input.form-control{border-radius:16px!important;background:#0a0a0a!important;border:1px solid rgba(255,255,255,.1)!important;padding:12px 14px!important;color:rgba(255,255,255,.92)!important;line-height:1.4!important;box-shadow:none!important;width:100%!important;box-sizing:border-box!important;font-family:var(--as-F)!important;max-height:50vh;overflow-y:auto}'
    + ':root.as-on body .fl textarea:focus,:root.as-on body .lt-form-survey input.form-control:focus{border-color:#c38bff!important;box-shadow:0 0 0 4px rgba(195,139,255,.16)!important;outline:0!important}'
    + ':root.as-on body .lt-form-survey input.form-control{height:48px!important}'
    /* «Следующий урок» (L4a): одна строка с превью, вся карточка — ссылка */
    + L + '.fl-next{border-radius:24px!important;padding:12px 16px!important;background:var(--as-s1)!important;flex-wrap:nowrap!important;gap:12px!important;cursor:pointer}' + L + '.fl-next .fl-nb{display:none!important}'
    + L + '.fl-next .as-cv{width:48px;height:48px;border-radius:12px;object-fit:cover;flex:none;background:#1f1f1f}' + L + '.fl-next .t{flex:1 1 auto!important}'
    + L + '.fl-next .t span{font-size:12px!important;color:var(--as-ink3)!important}' + L + '.fl-next .t b{font-size:15px!important;font-weight:500!important;letter-spacing:0!important;margin:2px 0 0!important;line-height:1.3!important}' + L + '.fl-next>svg{flex:none;color:var(--as-ink3)}'
    /* панель «Назад / Дальше» над вкладками — выше кнопки Нейро */
    + '#asNav{position:fixed;left:12px;right:12px;bottom:' + NAVB + ';z-index:99979;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px;border-radius:22px;background:rgba(22,22,22,.9);-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 20px 40px -10px rgba(0,0,0,.8);font-family:var(--as-F);transition:opacity .2s,transform .2s}'
    + '#asNav.one{grid-template-columns:1fr}#asNav a,#asNav button{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;gap:8px;height:46px;border-radius:14px;font-size:13.5px;min-width:0;white-space:nowrap;-webkit-tap-highlight-color:transparent}'
    + '#asNav .s{background:#1f1f1f;box-shadow:inset 0 0 0 1px rgba(255,255,255,.09);color:#fff!important;font-weight:500;padding:0 12px}#asNav .p{justify-content:center;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font-weight:600;padding:0 12px;box-shadow:0 0 0 1px rgba(255,255,255,.6) inset,0 14px 36px -14px rgba(252,203,255,.45)}'
    + '#asNav span{overflow:hidden;text-overflow:ellipsis}#asNav svg{flex:none}#asNav .as-off{border:0!important}'
    + ':root.as-ls.as-nav body{padding-bottom:calc(' + TB + ' + 36px + 62px + 20px)!important}:root.as-ls:not(.as-nav) body{padding-bottom:calc(' + TB + ' + 24px)!important}'
    /* клавиатура (L5b): вкладки и «Дальше» прячем, над клавиатурой — «Готово» */
    + ':root.as-kb #ecoTabs,:root.as-kb #asNav,:root.as-fs #ecoTabs,:root.as-fs #asNav,:root.as-fs #asBar,:root.as-fs #asSub{display:none!important}'
    + '#asKb{position:fixed;left:0;right:0;bottom:max(var(--as-kbh,0px), ' + SB + ');height:52px;z-index:99991;display:none;align-items:center;justify-content:space-between;padding:0 10px 0 16px;background:rgba(22,22,24,.97);border-top:1px solid rgba(255,255,255,.08);font:400 12.5px var(--as-F);color:var(--as-ink2);box-sizing:border-box}'
    + ':root.as-kb #asKb{display:flex}#asKb .d{display:flex;align-items:center;gap:6px}#asKb .d svg{color:#4ade80}#asKb button{all:unset;cursor:pointer;height:40px;padding:0 18px;border-radius:12px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;font:600 14px var(--as-F);display:grid;place-items:center}'
    /* домашка (L5): карточки уровней «Лёгкий · 20» */
    + L + '.fl-lvs{grid-template-columns:1fr!important;gap:8px!important}'
    + L + '.fl-lvs .fl-x .bonus-block{border-radius:24px!important;padding:12px 16px 14px!important;gap:6px!important;background:var(--as-s1)!important;border:1px solid var(--as-hair)!important}'
    + L + '.fl-lvs .fl-lv.on .bonus-block{border-color:rgba(195,139,255,.55)!important;background:linear-gradient(160deg,rgba(103,36,173,.28),var(--as-s1) 65%)!important}'
    + L + '.fl-lvs .fl-lvh{margin:0!important}' + L + '.fl-lvs .fl-lvh .r{display:none!important}' + L + '.fl-lvs .fl-lvh b{font:500 17px var(--as-F)!important;letter-spacing:0!important;text-transform:none!important;color:#fff!important}'
    + L + '.fl-lvs .fl-lvh b:after{content:" · " attr(data-as-b)}' + L + '.fl-lvs .fl-lvh em{display:none}' + L + '.fl-lvs .fl-lvh em.as-x2{display:inline-flex;height:22px;padding:0 8px;border-radius:8px;background:#c38bff;color:#1a0b2e!important;font:700 11px var(--as-F)!important;align-items:center}'
    + L + '.fl-lvs .fl-x .bonus-block :is(h1,h2,h3,h4,p,li,div,span):not(.fl-lvh):not(.fl-lvh *){font-size:13px!important;color:var(--as-ink2)!important;line-height:1.4!important}'
    + L + '.fl-lvs .fl-x .fl-lvb:not(#_){display:flex!important;padding:0!important;flex-direction:row!important;flex-wrap:wrap!important;gap:0 16px!important;margin:2px 0 0!important}' + L + '.fl-lvs .fl-x a.bonus-button+a.bonus-button{margin:0!important}' + L + '.lite-page>.lite-block-live-wrapper:has(.fl-own){order:-1}' + L + '.fl-lvs .fl-x a.bonus-button{all:unset;cursor:pointer;color:#e2c9ff!important;font:500 13px/32px var(--as-F)!important;height:32px!important;min-height:0!important;padding:0!important;margin:0!important;background:none!important;border:0!important;box-shadow:none!important;width:auto!important}' + L + '.fl-lvs .fl-x .bonus-block>.as-pick:not(#_){margin:4px 0 0!important}'
    + '.as-pick{all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:center;height:44px;margin-top:4px;border-radius:14px;width:100%;font:500 14px var(--as-F);background:#1f1f1f;border:1px solid rgba(255,255,255,.09);color:#fff}'
    + '.fl-lv.on .as-pick{background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;font-weight:600;border:0;box-shadow:0 0 0 1px rgba(255,255,255,.6) inset}'
    + L + '.fl-x.fl-info .bonus-block,' + L + '.fl-x .info-notice{border-radius:16px!important;background:rgba(255,255,255,.04)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)!important;border:0!important;padding:12px!important}'
    + L + '.fl-x.fl-info *{font-size:13px!important;line-height:1.45!important}'
    + L + '.fl-wc{border-radius:20px!important;padding:14px 16px!important;gap:12px!important}' + L + '.fl-wc b{font-size:14px!important}' + L + '.fl-wc :is(p,ul){font-size:13px!important}'
    /* шаги сдачи (L5c): четыре полоски */
    + L + 'ol.fl-steps{grid-template-columns:repeat(4,1fr)!important;gap:4px!important}' + L + 'ol.fl-steps li{all:unset;display:flex!important;flex-direction:column;gap:5px;font-size:10.5px;color:var(--as-ink3);line-height:1.2}'
    + L + 'ol.fl-steps li:before{content:"";height:4px;border-radius:9px;background:rgba(255,255,255,.12)}' + L + 'ol.fl-steps li span{display:none!important}' + L + 'ol.fl-steps li b{font:inherit!important;margin:0!important;color:inherit!important}'
    + L + 'ol.fl-steps li.ok{color:rgba(255,255,255,.7)}' + L + 'ol.fl-steps li.ok:before{background:#4ade80}' + L + 'ol.fl-steps li.on{color:#fff;font-weight:600}' + L + 'ol.fl-steps li.on:before{background:var(--as-acc)}'
    + ':root.as-ls.as-wn ol.fl-steps li.on{color:#ffb48c!important}:root.as-ls.as-hw:not(.as-sent):not(.as-wn) ol.fl-steps,:root.as-ls.as-sv ol.fl-steps,:root.as-ls.as-l1 ol.fl-steps{display:none!important}'
    /* форма «Сдать работу» (L5a) */
    + L + '.lite-page .lt-block.fl-mis:not(#_){border-radius:24px!important;padding:16px!important;background:var(--as-s1)!important;border:1px solid var(--as-hair)!important}'
    + L + '.fl-mis h2.fl-mh{font-size:20px!important;font-weight:500!important;letter-spacing:-.02em!important;margin:0 0 10px!important;display:flex;align-items:center;justify-content:space-between;gap:8px}'
    + '.as-pts{height:24px;padding:0 9px;border-radius:8px;background:rgba(195,139,255,.16);color:#e2c9ff;font:700 12px var(--as-F);display:inline-flex;align-items:center;white-space:nowrap;flex:none;letter-spacing:0}.as-pts.ok{background:rgba(74,222,128,.14);color:#4ade80}.as-pts.wn{background:rgba(255,180,140,.16);color:#ffb48c}'
    + L + '.fl-mis .fl-ml,' + L + '.fl-mis .as-lbl{font:500 12.5px var(--as-F)!important;color:var(--as-ink2)!important;margin:2px 0 8px!important;display:block}'
    + ':root.as-kb.as-ls.fl-on body .fl-mis .fl-seg{display:none!important}:root.as-kb.as-ls.fl-on body .fl-mis .fl-ml[data-as-lv]:after{content:": " attr(data-as-lv)}'
    + L + '.fl-mis .fl-seg{display:flex!important;flex-direction:column;gap:6px!important;background:none!important;padding:0!important;border:0!important;margin:0 0 12px!important}'
    + L + '.fl-mis .fl-seg button{all:unset;box-sizing:border-box;cursor:pointer;height:44px;border-radius:13px!important;background:#0a0a0a;border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px;padding:0 12px;font:400 14px var(--as-F);color:rgba(255,255,255,.8)}'
    + L + '.fl-mis .fl-seg button:before{content:"";width:18px;height:18px;border-radius:99px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35);flex:none}'
    + L + '.fl-mis .fl-seg button.on{border-color:rgba(195,139,255,.6);background:rgba(195,139,255,.1);color:#fff;font-weight:600}' + L + '.fl-mis .fl-seg button.on:before{box-shadow:inset 0 0 0 5px #c38bff}'
    + L + '.fl-mis .uploadifive-button{all:unset;box-sizing:border-box!important;position:relative!important;display:flex!important;align-items:center;gap:12px;min-height:64px;width:100%!important;height:auto!important;margin:12px 0 4px!important;padding:12px 14px 12px 66px!important;border-radius:16px!important;border:1.5px dashed rgba(195,139,255,.45)!important;background:rgba(195,139,255,.05)!important;font:500 14px var(--as-F)!important;color:#fff!important;text-transform:none!important;line-height:1.3!important;overflow:hidden}'
    + L + '.fl-mis .uploadifive-button:before{content:"";position:absolute;left:14px;top:50%;margin-top:-20px;width:40px;height:40px;border-radius:12px;background:rgba(195,139,255,.16) url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2720%27 height=%2720%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23e2c9ff%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M12 16V4M7 9l5-5 5 5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4%27/%3E%3C/svg%3E") center no-repeat}'
    + L + '.fl-mis .text-muted.small{font-size:12px!important;color:var(--as-ink3)!important;text-align:left!important;display:block;margin:0 0 4px!important}'
    + L + '.fl-mis .uploadifive-queue-item{border-radius:14px!important;background:rgba(255,255,255,.05)!important;padding:8px 10px!important;margin:6px 0 0!important;border:0!important;font-size:13px}'
    + L + '.fl-mis .btn-send-answer{width:100%!important;height:50px!important;border-radius:15px!important;margin:12px 0 0!important;background:linear-gradient(180deg,#fef8ff,#fccbff)!important;color:#602364!important;border:0!important;font:600 15px var(--as-F)!important;box-shadow:0 0 0 1px rgba(255,255,255,.6) inset,0 14px 36px -14px rgba(252,203,255,.45)!important;text-transform:none!important}'
    + L + '.fl-mis .btn-save-draft{width:100%!important;height:46px!important;border-radius:14px!important;margin:8px 0 0!important;background:#1f1f1f!important;border:1px solid rgba(255,255,255,.09)!important;color:#fff!important;font:500 14px var(--as-F)!important;text-decoration:none!important;padding:0!important}'
    + L + '.fl-mis .fl-pt{font-size:12px!important;color:var(--as-ink3)!important;margin:8px 0 0!important}'
    /* своя работа (L5c/L5d/L5e) */
    + L + '.fl-own .answer_wrapper{padding:0!important;margin:0!important;border:0!important;background:none!important}' + L + '.fl-own .answer_wrapper>.user-image,' + L + '.fl-own .answer-content>.title,' + L + '.fl-own .fl-ast .fl-chip,' + L + '.fl-own .b-like-and-subscribe-notifications,' + L + '.fl-own .gc-comment-form{display:none!important}'
    + L + '.fl-own .answer-content{margin:0!important;padding:0!important;display:flex!important;flex-direction:column;gap:10px}' + L + '.fl-own .fl-ast,' + L + '.fl-own .comments.as-nocm{display:none!important}' + L + '.fl-own .as-meta{order:1}' + L + '.fl-own .answer-main-content{order:2}' + L + '.fl-own .fl-edt{order:3}' + L + '.fl-own .fl-edn{order:4}' + L + '.fl-own .comments{order:5;margin:0!important}' + L + '.fl-mis .self-answers,' + L + '.fl-mis .row-section,' + L + '.fl-mis .row-section>*{margin:0!important;padding:0!important}' + L + '.fl-own .answer-text{font-size:14px!important;line-height:1.4!important;color:#fff!important}'
    + '.as-meta{color:var(--as-ink2);font-size:13px}'
    + L + '.fl-own a.fl-edt{display:flex!important;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:14px!important;background:#1f1f1f!important;border:1px solid rgba(255,255,255,.09)!important;color:#fff!important;font:500 14px var(--as-F)!important;padding:0!important;margin:0!important}'
    + L + '.fl-own .fl-edn{font-size:12px!important;color:var(--as-ink3)!important;margin:0!important}'
    + ':root.as-ok.as-ls.fl-on body .fl-own .fl-edt,:root.as-ok.as-ls.fl-on body .fl-own .fl-edn{display:none!important}:root.as-wn.fl-on body .fl-own a.fl-edt{background:linear-gradient(180deg,#fef8ff,#fccbff)!important;color:#602364!important;border:0!important;font-weight:600!important;height:50px}'
    + ':root.as-ok.fl-on body .lite-page .lt-block.fl-mis.fl-own:not(#_){background:linear-gradient(160deg,rgba(74,222,128,.12),var(--as-s1) 55%)!important;border-color:rgba(74,222,128,.3)!important}'
    + ':root.as-wn.fl-on body .lite-page .lt-block.fl-mis.fl-own:not(#_){background:linear-gradient(160deg,rgba(255,180,140,.12),var(--as-s1) 55%)!important;border-color:rgba(255,180,140,.3)!important}'
    + L + '.fl-got{font-size:13px!important;color:var(--as-ink2)!important}' + L + '.fl-got b{display:block;font:500 40px/1 var(--as-F)!important;letter-spacing:-.03em;color:#4ade80!important;margin:0 0 6px}'
    + L + '.fl-own .comments-container .comment{display:flex;gap:10px;padding:12px!important;border-radius:16px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);font-size:13.5px}'
    /* «Работы других учеников» */
    + L + '.fl-oth{padding:0!important;border-radius:20px!important}' + L + '.fl-oth>button{min-height:56px!important;padding:0 16px!important;font:500 16px var(--as-F)!important}' + L + '.fl-oth>button small{color:var(--as-ink2)!important;font-weight:400!important;font-size:13px!important;margin-left:6px!important;background:none!important;padding:0!important}'
    + L + '.fl-oth .fl-ol{padding:0 12px 12px!important}'
    /* анкета (L3c) */
    + ':root.as-sv .lt-form-survey .part-header,:root.as-sv .lt-form-survey .part-button,:root.as-sv .lt-form-survey .showAllCustomFields{display:none!important}'
    + ':root.as-sv .lt-form-survey .form-content,:root.as-sv .lt-form-survey .fields{display:flex!important;flex-direction:column;gap:12px}:root.as-sv .lt-form-survey .lt-form-inner{padding:0!important;background:none!important;border:0!important;box-shadow:none!important}'
    + ':root.as-sv .lt-form-survey .field-wrapper{border-radius:24px;background:var(--as-s1);border:1px solid var(--as-hair);padding:16px;margin:0!important}'
    + ':root.as-sv .lt-form-survey .field{margin:0!important;padding:0!important;display:flex;flex-direction:column;gap:10px}:root.as-sv .lt-form-survey .field-label{font:500 15px/1.35 var(--as-F)!important;color:#fff!important;margin:0!important;text-align:left!important}'
    + ':root.as-sv .lt-form-survey .required-sign{color:var(--as-acc)!important}'
    + ':root.as-sv .lt-form-survey .as-scale{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important}:root.as-sv .lt-form-survey .as-scale label{grid-column:auto!important}:root.as-sv .lt-form-survey .as-scale label{all:unset;box-sizing:border-box!important;cursor:pointer;height:44px!important;width:auto!important;margin:0!important;padding:0!important;border-radius:12px!important;background:#0a0a0a!important;border:1px solid rgba(255,255,255,.1)!important;display:grid!important;place-items:center;font:600 14px var(--as-F)!important;color:rgba(255,255,255,.75)!important}'
    + ':root.as-sv .lt-form-survey .as-scale label.as-on{background:linear-gradient(180deg,#fef8ff,#fccbff)!important;border-color:transparent!important;color:#602364!important}:root.as-sv .lt-form-survey .field:not(.required) .field-label:after{content:" необязательно";font-size:12px;font-weight:400;color:var(--as-ink3)}:root.as-sv .lt-form-survey .as-scale input,:root.as-sv .lt-form-survey .as-rows input{position:absolute;opacity:0;pointer-events:none}'
    + ':root.as-sv .lt-form-survey .as-cap{display:flex;justify-content:space-between;gap:12px;font:400 12px/1.3 var(--as-F);color:var(--as-ink3);margin-top:-2px}:root.as-sv .lt-form-survey .as-cap span:last-child{text-align:right}'
    + ':root.as-sv .lt-form-survey .as-rows{display:flex!important;flex-direction:column;gap:6px}:root.as-sv .lt-form-survey .as-rows label{all:unset;box-sizing:border-box!important;cursor:pointer;min-height:44px!important;width:auto!important;margin:0!important;border-radius:13px!important;background:#0a0a0a!important;border:1px solid rgba(255,255,255,.08)!important;display:flex!important;align-items:center;gap:10px;padding:10px 12px!important;font:400 14px/1.3 var(--as-F)!important;color:rgba(255,255,255,.85)!important}'
    + ':root.as-sv .lt-form-survey .as-rows label:before{content:"";width:18px;height:18px;border-radius:6px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35);flex:none}:root.as-sv .lt-form-survey .as-rows label.as-on{border-color:rgba(195,139,255,.6)!important;background:rgba(195,139,255,.1)!important;color:#fff!important}:root.as-sv .lt-form-survey .as-rows label.as-on:before{box-shadow:inset 0 0 0 9px #c38bff}'
    + ':root.as-sv .lt-form-survey .field-description-block{font-size:11.5px!important;color:var(--as-ink3)!important}'
    + ':root.as-sv .lt-form-survey .as-err{border-color:rgba(255,143,143,.7)!important;box-shadow:0 0 0 4px rgba(255,143,143,.12)}:root.as-sv .lt-form-survey .as-err input.form-control{border-color:rgba(255,143,143,.7)!important}.as-erm{font:400 12px/1.35 var(--as-F);color:#ff9f9f;margin:0}'
    + ':root.as-sv .lt-form-survey .global-confirm-checkbox-block{font-size:12px;color:var(--as-ink3);padding:0 4px}'
    + ':root.as-sv.fl-on body .fl-mis{display:none!important}:root.as-sv.fl-on body .lt-lesson-text :is(p,div,span,li){font-size:14px!important;line-height:1.45!important;color:var(--as-ink2)!important}'
    + '#asTo{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:rgba(74,222,128,.12);box-shadow:inset 0 0 0 1px rgba(74,222,128,.4);font:400 13.5px/1.35 var(--as-F);color:#d7ffe5}#asTo i{width:28px;height:28px;border-radius:99px;background:#4ade80;color:#04210f;display:grid;place-items:center;flex:none}'
    /* вход один раз (L6) */
    + ':root.as-lg body .gc-account-logo,:root.as-lg body .empty-breadcrumbs,:root.as-lg body .btn-register,:root.as-lg body .xdget-socialUserFormField,:root.as-lg body .login-form>h2,:root.as-lg body .fs-lg-brand,:root.as-lg body .fs-lg-sub,:root.as-lg body .xdget-loginSystemPage .text-center .html-content{display:none!important}'
    + ':root.as-lg body .main-page-block:not(#_){padding-top:calc(var(--as-top) + 4px)!important}:root.as-lg body .gc-main-content{padding-top:0!important}:root.as-lg #ecoTabs{display:none!important}:root.as-lg body{padding-bottom:calc(24px + ' + SB + ')!important}'
    + ':root.as-lg body .main-page-container,:root.as-lg body .xdget-loginSystemPage{max-width:440px!important;margin:0 auto!important;padding:0 16px!important;background:none!important;box-shadow:none!important;border:0!important}'
    + ':root.as-lg body form.xdget-loginUserForm{background:none!important;box-shadow:none!important;border:0!important;padding:0!important;margin:0!important;width:auto!important;max-width:none!important}'
    + '#asLg{display:flex;flex-direction:column;gap:14px;padding:24px 12px 4px;font-family:var(--as-F);color:#fff;text-align:center}#asLg .k{width:64px;height:64px;border-radius:20px;background:rgba(195,139,255,.16);color:#e2c9ff;display:grid;place-items:center;align-self:center}'
    + '#asLg h1{margin:0;font:500 26px/1.15 var(--as-F);letter-spacing:-.02em}#asLg p{margin:0;color:var(--as-ink2);font-size:14px;line-height:1.45}#asLg .tgs{display:flex;justify-content:center}#asLg .tgs:empty,#asLg .tgs:empty+.or{display:none}'
    + '#asLg .or{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--as-ink3)}#asLg .or:before,#asLg .or:after{content:"";flex:1;height:1px;background:rgba(255,255,255,.1)}'
    + ':root.as-lg body .xdget-loginUserForm input.form-control,:root.as-lg body .xdget-loginUserForm input[type=text],:root.as-lg body .xdget-loginUserForm input[type=email],:root.as-lg body .xdget-loginUserForm input[type=password]{height:48px!important;border-radius:14px!important;background:#0a0a0a!important;border:1px solid rgba(255,255,255,.12)!important;color:#fff!important;padding:0 14px!important;box-shadow:none!important;width:100%!important;box-sizing:border-box!important;font-family:var(--as-F)!important}'
    + ':root.as-lg body .xdget-loginUserForm .form-group,:root.as-lg body .xdget-loginUserForm .xdget-formField{margin:0 0 10px!important}'
    + ':root.as-lg body .xdget-loginUserForm .form-buttons{display:flex!important;flex-direction:column;gap:8px;margin:4px 0 0!important}'
    + ':root.as-lg body .xdget-loginUserForm .btn-success,:root.as-lg body .xdget-loginUserForm .btn-enter{width:100%!important;height:50px!important;border-radius:15px!important;background:linear-gradient(180deg,#fef8ff,#fccbff)!important;color:#602364!important;border:0!important;font:600 15px var(--as-F)!important;box-shadow:0 0 0 1px rgba(255,255,255,.6) inset!important;float:none!important;margin:0!important}'
    + ':root.as-lg body .xdget-loginUserForm .btn-link{float:none!important;color:var(--as-lil)!important;font:500 13px var(--as-F)!important;text-decoration:none!important;width:100%;margin:0!important}'
    + ':root.as-lg body .xdget-loginUserForm .state-form>h2{font:500 20px var(--as-F)!important;color:#fff!important;text-align:center}';
  /* ---------- раздел 4б (макет L10–L12, утверждён 28.10.2026) ---------- */
  var B1 = 'all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;height:50px;border-radius:15px;width:100%;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font:600 15px var(--as-F);box-shadow:0 0 0 1px rgba(255,255,255,.6) inset,0 14px 36px -14px rgba(252,203,255,.45);white-space:nowrap;text-decoration:none!important;-webkit-tap-highlight-color:transparent';
  var B2 = 'all:unset;box-sizing:border-box;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:14px;width:100%;background:#1f1f1f;border:1px solid rgba(255,255,255,.09);color:#fff!important;font:500 14px var(--as-F);white-space:nowrap;text-decoration:none!important;-webkit-tap-highlight-color:transparent';
  var CARD = 'border-radius:24px;background:var(--as-s1);border:1px solid var(--as-hair);padding:16px;display:flex;flex-direction:column;gap:10px;box-sizing:border-box';
  css += ':root.as-on body .as-b1:not(#_){' + B1 + '}:root.as-on body .as-b2:not(#_){' + B2 + '}.as-b1.as-off,.as-b2.as-off{height:50px}'
    + '.as-card{' + CARD + ';font:400 14px/1.4 var(--as-F);color:#fff;position:relative}'
    + '.as-lb{font:500 12.5px/1.4 var(--as-F);color:var(--as-ink2);margin-top:2px}.as-m3{font:400 12px/1.4 var(--as-F);color:var(--as-ink3)}.as-mut{font:400 13px/1.4 var(--as-F);color:var(--as-ink2)}'
    + '.as-big{font:500 40px/1 var(--as-F);letter-spacing:-.03em;color:#4ade80}.as-big small:not(#_){font-size:16px;font-weight:500;color:inherit!important}'
    + '.as-okc{width:84px;height:84px;border-radius:99px;display:grid;place-items:center;background:rgba(74,222,128,.14);color:#4ade80;box-shadow:inset 0 0 0 1px rgba(74,222,128,.35);flex:none}'
    + '.as-dc{align-items:center;text-align:center;padding:24px 20px;gap:14px}.as-dc .h{font:500 22px/1.2 var(--as-F);letter-spacing:-.02em}.as-dc .s{color:var(--as-ink2);font-size:14px;line-height:1.45}.as-dc.ok{background:linear-gradient(160deg,rgba(74,222,128,.12),var(--as-s1) 55%);border-color:rgba(74,222,128,.3)}'
    + '.as-ctr{display:flex;flex-direction:column;justify-content:center;gap:12px;min-height:calc(100vh - var(--as-top) - 14px - ' + TB + ' - 24px);box-sizing:border-box;font-family:var(--as-F)}'
    /* L10: анкета — почта, прогресс, ошибки, затемнение над кнопкой, «осталось N» */
    + ':root.as-sv.fl-on body .fl h1.fl-t{font-size:26px!important}'
    + ':root.as-sv .lt-form-survey .builder{display:flex!important;flex-direction:column;gap:12px}:root.as-sv .lt-form-survey .builder-item{margin:0!important;padding:0!important}:root.as-sv .lt-form-survey .part-userField.as-hid{display:none!important}'
    + ':root.as-sv .lt-form-survey .part-userField.as-ufc{' + CARD + '}:root.as-sv .lt-form-survey .part-userField.as-ufc:not(#_){padding:16px!important}:root.as-sv .lt-form-survey .part-userField .field-label{font:500 15px/1.35 var(--as-F)!important;color:#fff!important;margin:0!important;text-align:left!important;padding:0!important}:root.as-sv .lt-form-survey .part-userField .field-label b{color:var(--as-acc);font-weight:500}'
    + ':root.as-sv .lt-form-survey .part-userField input{height:48px!important;border-radius:14px!important;background:#0a0a0a!important;border:1px solid rgba(255,255,255,.12)!important;padding:0 14px!important;color:rgba(255,255,255,.88)!important;width:100%!important;max-width:none!important;box-sizing:border-box!important;box-shadow:none!important;font:400 16px var(--as-F)!important;margin:0!important}'
    + ':root.as-sv .lt-form-survey .part-userField input:focus{border-color:#c38bff!important;box-shadow:0 0 0 4px rgba(195,139,255,.16)!important;outline:0}:root.as-sv .lt-form-survey .part-userField.as-err{border-color:rgba(255,143,143,.7)!important;box-shadow:0 0 0 4px rgba(255,143,143,.12)}'
    + ':root.as-sv .lt-form-survey :is(.block-box,.modal-block-content){background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:0!important}'
    + ':root.as-sv .lt-form-survey .field-label :is(.label-value,.required-sign){font:inherit!important;letter-spacing:inherit!important}:root.as-sv .lt-form-survey .required-sign{color:var(--as-acc)!important;margin-left:4px}:root.as-sv .lt-form-survey .field-input-block{margin:0!important;padding:0!important}'
    + ':root.as-sv.fl-on body .fl-hd{gap:12px!important}:root.as-sv.fl-on body .fl-hd p.fl-meta{line-height:1.45!important}'
    + ':root.as-sv.fl-on body .lt-form-survey .field-input-block.as-scale{gap:6px!important;row-gap:6px!important;column-gap:6px!important}:root.as-sv.fl-on body .lt-form-survey .field-input-block.as-rows{gap:6px!important}'
    + ':root.as-sv .lt-form-survey input.as-hid{display:none!important}:root.as-on body .lt-form-survey textarea.as-ta{display:block;width:100%!important;box-sizing:border-box!important;min-height:64px;height:64px;max-height:50vh;border-radius:16px!important;background:#0a0a0a!important;border:1px solid rgba(255,255,255,.1)!important;padding:12px 14px!important;color:rgba(255,255,255,.88)!important;font:400 16px/1.4 var(--as-F)!important;box-shadow:none!important;resize:none;margin:0!important;outline:0;overflow-y:auto}:root.as-on body .lt-form-survey textarea.as-ta::placeholder{color:var(--as-ink3)}:root.as-on body .lt-form-survey textarea.as-ta:focus{border-color:#c38bff!important;box-shadow:0 0 0 4px rgba(195,139,255,.16)!important}:root.as-sv .lt-form-survey .as-err textarea.as-ta{border-color:rgba(255,143,143,.7)!important}'
    + '#asSvTop{display:flex;flex-direction:column;gap:12px}#asSvTop .as-state{margin:0}'
    + '.as-mail{display:flex;align-items:center;gap:10px;min-height:44px;padding:8px 12px;border-radius:16px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);font:400 13px/1.4 var(--as-F);color:var(--as-ink2);box-sizing:border-box}.as-mail svg{flex:none;color:var(--as-lil)}.as-mail span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.as-mail b{color:#fff;font-weight:500}'
    + '.as-prg{display:flex;align-items:center;gap:10px}.as-prg i{flex:1;display:block;height:6px;border-radius:9px;background:rgba(255,255,255,.1);overflow:hidden}.as-prg i b{display:block;height:100%;width:0;border-radius:9px;background:linear-gradient(90deg,#8f6af0,#d77fff);transition:width .25s}.as-prg span{font:400 12.5px var(--as-F);color:var(--as-ink2);white-space:nowrap}'
    + ':root.as-sv .lt-form-survey .field-wrapper,:root.as-sv .lt-form-survey .part-userField.as-ufc{scroll-margin-top:calc(var(--as-top) + 16px)}'
    + '#asNav.sv:before{content:"";position:absolute;left:-12px;right:-12px;bottom:100%;height:40px;pointer-events:none;background:linear-gradient(180deg,rgba(0,1,6,0),#000106)}'
    + '#asNav .nerr{display:flex;align-items:center;gap:8px;padding:2px 6px 0;font:400 12.5px/1.3 var(--as-F);color:#ffb3b3;white-space:nowrap;overflow:hidden}#asNav .nerr svg{flex:none}#asNav .nerr span{overflow:hidden;text-overflow:ellipsis}'
    + ':root.as-ls.as-nav.as-nerr body{padding-bottom:calc(' + TB + ' + 36px + 62px + 20px + 32px)!important}'
    /* L10c: анкета засчитана — вместо формы итог */
    + ':root.as-svok.fl-on body .fl-main>:not(#asSvDone){display:none!important}#asSvDone{margin:0}'
    + ':root.as-on body .as-nx:not(#_){' + CARD + ';flex-direction:row;align-items:center;gap:12px;text-decoration:none!important;color:#fff!important;cursor:pointer;font:400 14px/1.4 var(--as-F)}.as-nx img{width:48px;height:48px;border-radius:12px;object-fit:cover;flex:none;background:#1f1f1f}.as-nx span{flex:1;min-width:0}.as-nx small{display:block;font-size:12px;color:var(--as-ink3)}.as-nx b:not(#_){font-weight:500;color:#fff!important}.as-nx small:not(#_){color:var(--as-ink3)!important}'
    /* L11: «Изменить работу» */
    + ':root.as-ed body .page-header,:root.as-ed body .breadcrumb,:root.as-ed body .standard-logo,:root.as-ed body .edit-answer>form>.answer-form,:root.as-ed body form#lessonAnswerForm:has(#asEd)>.answer-form{display:none!important}:root.as-ed body .edit-answer:not(.as-r){visibility:hidden}:root.as-ed body .as-gone{display:none!important}'
    + ':root.as-ed body .gc-main-content>.container{padding-left:16px!important;padding-right:16px!important;max-width:none!important;width:auto!important}:root.as-ed body .standard-page-content{padding:0!important;margin:0!important}'
    + ':root.as-ed body{padding-bottom:calc(' + TB + ' + 24px)!important}:root.as-ed body .edit-answer{margin:0!important;padding:0!important;border:0!important;background:none!important}'
    + '#asEd{display:flex;flex-direction:column;gap:12px;padding:14px 0 0;font-family:var(--as-F);color:#fff}#asEd .as-er{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:24px}'
    + '.as-rad{display:flex;flex-direction:column;gap:6px}.as-rad button{all:unset;box-sizing:border-box;cursor:pointer;height:44px;border-radius:13px;background:#0a0a0a;border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px;padding:0 12px;font:400 14px var(--as-F);color:rgba(255,255,255,.8)}'
    + '.as-rad button:before{content:"";width:18px;height:18px;border-radius:99px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35);flex:none}.as-rad button.on{border-color:rgba(195,139,255,.6);background:rgba(195,139,255,.1);color:#fff;font-weight:600}.as-rad button.on:before{box-shadow:inset 0 0 0 5px #c38bff}'
    + '#asEd textarea{display:block;width:100%!important;box-sizing:border-box!important;min-height:76px;height:auto;max-height:50vh;border-radius:16px!important;background:#0a0a0a!important;border:1px solid rgba(255,255,255,.1)!important;padding:12px 14px!important;color:rgba(255,255,255,.88)!important;font:400 16px/1.4 var(--as-F)!important;box-shadow:none!important;resize:none;margin:0!important;outline:0}#asEd textarea:focus{border-color:#c38bff!important;box-shadow:0 0 0 4px rgba(195,139,255,.16)!important}'
    + '#asEd .emoji-container{position:static!important;margin:0!important;padding:0!important;border:0!important;background:none!important}#asEd .emoji-button,#asEd .uploadifive-queue-item .close{display:none!important}'
    + '.as-fg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.as-fg #queue{display:contents}'
    + '.as-ft,.as-fg .uploadifive-queue-item{position:relative;display:flex!important;flex-direction:column;min-width:0;margin:0!important;padding:0!important;background:none!important;border:0!important;font:400 12px/1.3 var(--as-F)}'
    + '.as-ft .fi{position:relative;aspect-ratio:1;border-radius:14px;overflow:hidden;background:linear-gradient(135deg,#3a2a52,#120b22);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;margin-bottom:6px;color:#e2c9ff;font:700 11px/1 var(--as-F);letter-spacing:.1em;text-decoration:none!important}'
    + '.as-ft .fi img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}.as-ft small:not(#_){font-size:12px;color:rgba(255,255,255,.85)!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}.as-ft em:not(#_){font-style:normal;font-size:11px;color:var(--as-ink3)!important;line-height:1.3}'
    + '.as-ft .fx{all:unset;cursor:pointer;position:absolute;top:-2px;right:-2px;width:44px;height:44px;display:grid;place-items:center;z-index:2;-webkit-tap-highlight-color:transparent}.as-ft .fx i{width:28px;height:28px;border-radius:99px;background:rgba(0,1,6,.75);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2);display:grid;place-items:center;color:#fff}'
    + '.as-ft:has(.fq) .fx{display:none}.as-ft .fq{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;justify-content:center;gap:6px;padding:8px;background:rgba(10,10,12,.86);box-shadow:inset 0 0 0 1.5px rgba(255,143,143,.75);border-radius:14px}'
    + '.as-ft .fq button{all:unset;box-sizing:border-box;cursor:pointer;height:40px;border-radius:11px;display:grid;place-items:center;font:600 13px var(--as-F);letter-spacing:0}.as-ft .fq .d{background:rgba(255,143,143,.2);color:#ffc9c9;box-shadow:inset 0 0 0 1px rgba(255,143,143,.5)}.as-ft .fq .k2{background:#1f1f1f;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}'
    + '.as-ft .fpb,.as-fg .uploadifive-queue-item .progress{position:absolute!important;left:8px;right:8px;bottom:8px;height:4px!important;border-radius:9px;background:rgba(255,255,255,.2)!important;z-index:1;margin:0!important;overflow:hidden;box-shadow:none!important}.as-fg .uploadifive-queue-item .progress-bar{display:block;height:100%;border-radius:9px;background:var(--as-acc)!important;float:none!important}'
    + '.as-fg .uploadifive-queue-item>div:not(.fi):not(.progress){display:flex;flex-direction:column;min-width:0}.as-fg .uploadifive-queue-item .filename{font-size:12px;color:rgba(255,255,255,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}.as-fg .uploadifive-queue-item .fileinfo{display:none}.as-fg .uploadifive-queue-item.complete .fi .progress{display:none}'
    + '#asEd .uploadifive-button,#asEd .as-upz{all:unset;box-sizing:border-box!important;position:relative!important;display:flex!important;align-items:center;gap:12px;min-height:64px;width:100%!important;height:auto!important;padding:12px 14px!important;border-radius:16px!important;border:1.5px dashed rgba(195,139,255,.45)!important;background:rgba(195,139,255,.05)!important;color:#fff!important;overflow:hidden;cursor:pointer;text-transform:none!important;line-height:1.3!important;font:400 14px var(--as-F)!important}'
    + '#asEd .uploadifive-button>i.as-ui{width:40px;height:40px;border-radius:12px;background:rgba(195,139,255,.16);display:grid;place-items:center;color:#e2c9ff;flex:none}#asEd .uploadifive-button>span{display:flex;flex-direction:column;min-width:0}#asEd .uploadifive-button>span b{font-size:14px;font-weight:500}#asEd .uploadifive-button>span small{font-size:12px;color:var(--as-ink3)}#asEd .uploadifive-button input[type=file]{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;opacity:0!important;cursor:pointer;font-size:30px!important}'
    + '#asEd .text-muted.small,#asEd .answer-file-box{display:none!important}#asEd .as-upw{display:flex;flex-direction:column;gap:6px;overflow:visible!important}'
    + '#asEd button.btn-send-answer{' + B1 + ';margin-top:2px}#asEd button.btn-send-answer.as-off{height:50px;margin-top:2px}#asEd .as-state{margin:0}'
    /* шторка «Выйти без сохранения?» и тост «Файл удалён · Вернуть» */
    + '#asSh{position:fixed;inset:0;z-index:99996;background:rgba(0,1,6,.62);display:flex;align-items:flex-end;font-family:var(--as-F);-webkit-tap-highlight-color:transparent}#asSh>div{width:100%;box-sizing:border-box;border-radius:28px 28px 0 0;background:#161616;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);padding:20px 16px calc(16px + ' + SB + ');display:flex;flex-direction:column;gap:8px;color:#fff}'
    + '#asSh b{font:500 20px/1.2 var(--as-F);letter-spacing:-.02em}#asSh p{margin:0 0 8px;color:var(--as-ink2);font:400 14px/1.45 var(--as-F)}'
    + '#asDt{position:fixed;left:12px;right:12px;bottom:calc(' + TB + ' + 36px);z-index:99983;display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:52px;padding:4px 6px 4px 16px;box-sizing:border-box;border-radius:16px;background:rgba(30,30,32,.97);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 20px 40px -10px rgba(0,0,0,.8);font:400 13.5px var(--as-F);color:#fff}'
    + '#asDt button{all:unset;cursor:pointer;height:44px;padding:0 12px;border-radius:12px;color:var(--as-lil);font:600 14px var(--as-F);display:grid;place-items:center}'
    /* L12: «Моя работа» — режим страницы урока по ссылке на ответ */
    + ':root.as-l12.fl-on body .fl-main>:not(.lite-page),:root.as-l12.fl-on body .lite-page>:not(.lite-block-live-wrapper),:root.as-l12.fl-on body .lite-page>.lite-block-live-wrapper:not(:has(.as-l12w)){display:none!important}'
    + ':root.as-l12.fl-on body .lite-page .lt-block.fl-mis.as-l12w:not(#_):not(#__){background:none!important;border:0!important;padding:0!important;border-radius:0!important}'
    + ':root.as-l12.fl-on body .fl-mis :is(.fl-mh,.fl-got,.lesson-mission-text,.lesson-send-answer-block,.fl-mine,.fl-pt,h3,.fl-ml){display:none!important}'
    + ':root.as-l12.fl-on body .fl-mis .lesson-mission-wrapper,:root.as-l12.fl-on body .fl-mis .self-answers{display:flex!important;flex-direction:column;gap:12px;margin:0!important;padding:0!important}'
    + ':root.as-l12.fl-on body .as-l12w .answer_wrapper{padding:0!important;margin:0!important;border:0!important;background:none!important;box-shadow:none!important}:root.as-l12.fl-on body .as-l12w .answer_wrapper>.user-image{display:none!important}'
    + ':root.as-l12.fl-on body .as-l12w .answer-content{display:flex!important;flex-direction:column;gap:12px;margin:0!important;padding:0!important}:root.as-l12.fl-on body .as-l12w .answer-content>:not(#asWk):not(.comments){display:none!important}'
    + ':root.as-l12.fl-on body .as-l12w .comments:not(#_){display:block!important;margin:0!important;padding:0!important;border:0!important}:root.as-l12.fl-on body .as-l12w :is(.comment-list,.comments-tree-wrapper,.comments-tree){display:flex!important;flex-direction:column;gap:12px;margin:0!important;padding:0!important;border:0!important;background:none!important}'
    + ':root.as-l12.fl-on body .as-l12w .comments-container.as-hid{display:none!important}:root:not(.as-l12) #asWk,:root:not(.as-l12) #asCm,:root:not(.as-l12) #asL12x{display:none!important}'
    + '#asWk.wn{background:linear-gradient(160deg,rgba(255,180,140,.12),var(--as-s1) 55%);border-color:rgba(255,180,140,.3)}#asWk.ok{background:linear-gradient(160deg,rgba(74,222,128,.12),var(--as-s1) 55%);border-color:rgba(74,222,128,.3)}'
    + '#asWk .as-wh{display:flex;align-items:center;justify-content:space-between;gap:10px}#asWk h4{margin:0;font:500 20px/1.25 var(--as-F);letter-spacing:-.02em;color:#fff}#asWk .as-wt{font-size:14px;line-height:1.4;white-space:pre-line}#asWk .as-ft .fi{cursor:pointer}'
    + '#asCm{display:flex;flex-direction:column;gap:12px}.as-cmt{display:flex;gap:10px;padding:12px;border-radius:16px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);font-family:var(--as-F);color:#fff}'
    + '.as-cmt .av{width:36px;height:36px;border-radius:99px;background:linear-gradient(160deg,#5ea8ff,#2a1546);display:grid;place-items:center;font:600 14px var(--as-F);flex:none}.as-cmt.me .av{background:linear-gradient(160deg,#8f6af0,#2a1546)}.as-cmt>span{min-width:0;flex:1}'
    + '.as-cmt b{display:block;font-size:13px;font-weight:600;line-height:1.4}.as-cmt b small{color:var(--as-ink3);font-weight:400;font-size:12px}.as-cmt p{margin:2px 0 0;font-size:13.5px;line-height:1.4;color:rgba(255,255,255,.88);white-space:pre-line;overflow-wrap:anywhere}'
    + ':root.as-l12.fl-on body .as-l12w .gc-comment-form:not(#_){display:block!important;margin:0!important;padding:0!important}:root.as-l12.fl-on body .as-l12w .new-comment{margin:0!important;padding:0!important;border:0!important;background:none!important}'
    + ':root.as-l12.fl-on body .as-l12w .new-comment :is(.user-image-wrapper,.emoji-button,.attach-file-button-container,.comment-attach-file-link,.audio-comment,.file-uploader,.settings-value,.btn-send .fa,.btn-send .text){display:none!important}'
    + ':root.as-l12.fl-on body .as-l12w .new-comment .textarea-block{display:flex!important;align-items:flex-end;gap:8px;min-height:52px;padding:6px 6px 6px 14px!important;border-radius:16px;background:#0a0a0a;border:1px solid rgba(255,255,255,.1);box-sizing:border-box}'
    + ':root.as-l12.fl-on body .as-l12w .new-comment .textarea-block:focus-within{border-color:#c38bff;box-shadow:0 0 0 4px rgba(195,139,255,.16)}:root.as-l12.fl-on body .as-l12w .new-comment .textarea-block>div:empty{display:none}'
    + ':root.as-l12.fl-on body .as-l12w .new-comment .emoji-container{flex:1;min-width:0;position:static!important;margin:0!important;padding:0!important;align-self:center}'
    + ':root.as-l12.fl-on body .as-l12w .new-comment textarea.new-comment-textarea{display:block;width:100%!important;min-height:40px!important;height:40px;max-height:40vh!important;padding:9px 0!important;margin:0!important;border:0!important;border-radius:0!important;background:none!important;box-shadow:none!important;outline:0;resize:none!important;color:rgba(255,255,255,.88)!important;font:400 16px/1.4 var(--as-F)!important;overflow-y:auto!important}'
    + ':root.as-l12.fl-on body .as-l12w .new-comment textarea.new-comment-textarea::placeholder{color:var(--as-ink3)}'
    + ':root.as-l12.fl-on body .as-l12w .new-comment .btn-send{all:unset;box-sizing:border-box;cursor:pointer;width:40px;height:40px;border-radius:12px;display:grid!important;place-items:center;flex:none;background:rgba(255,255,255,.06)!important;color:rgba(255,255,255,.35)!important}'
    + ':root.as-l12.fl-on body .as-l12w .gc-comment-form.as-has .btn-send{background:linear-gradient(180deg,#fef8ff,#fccbff)!important;color:#602364!important}'
    + '#asTo.as-fade{transition:opacity .4s;opacity:0}'
    + L + '.fl-mis .self-answers :is(.answer-edit-link,.comment-files-widget.as-hid,.comments-container.as-hid){display:none!important}' + L + '.fl-own .answer-content>.as-cm5{order:5}.as-cm5{display:flex;flex-direction:column;gap:10px}'
    + '.as-fls{display:flex;flex-direction:column;gap:8px;margin:10px 0 0}:root.as-on body a.as-flr:not(#_){display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;background:rgba(255,255,255,.05);font:400 13px/1.35 var(--as-F);color:#fff!important;text-decoration:none!important}'
    + 'a.as-flr .th{width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#3a2a52,#120b22);flex:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);overflow:hidden;display:grid;place-items:center;color:#e2c9ff}a.as-flr .th img{width:100%;height:100%;object-fit:cover;display:block}a.as-flr>span:last-child{min-width:0}a.as-flr b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}a.as-flr small:not(#_){color:var(--as-ink3)!important;font-size:11.5px}';
  var st = document.createElement('style'); st.id = 'asCss'; st.textContent = css; (document.head || R).appendChild(st);

  /* ---------- общие действия ---------- */
  var load = function () { var l = document.getElementById('ecoLd'); if (l) l.classList.add('on') };
  var home = function () { load(); location.href = APP + '#learn' };
  var hb = history.back; var lastBlur = 0;
  var isField = function (a) { return !!a && (a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable || (a.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|file|hidden|range|color|image)$/i.test(a.type))) };
  var softBlur = function () { var a = document.activeElement; if (isField(a)) { a.blur(); lastBlur = Date.now(); return true } return false };
  /* «Назад» Telegram (её ведёт layout.js: history.back) при открытой клавиатуре сначала закрывает клавиатуру */
  /* L11: правка с изменениями — сначала шторка «Выйти без сохранения?»; L12: открыт по ссылке из уведомления (истории нет) — «Назад» ведёт к уроку */
  var guard = function () { if (isEd && edDirty && edDirty() && !guard.ok) { edSheet(); return true } if (R.classList.contains('as-l12') && history.length <= 1) { l12Exit(); return true } return false };
  try { history.back = function () { if (softBlur() || Date.now() - lastBlur < 450) return; if (guard()) return; return hb.apply(history, arguments) } } catch (e) {}
  var back = function () { if (softBlur()) return; if (guard()) return; if (ss('asEdB') === LID && LID) { ss('asEdB', null); home(); return } if (history.length > 1) { load(); hb.call(history) } else home() };
  var edDirty = null, edSheet = function () {}, l12Exit = function () {};

  /* ---------- шапка приложения ---------- */
  var bar = null, setBar = function (t, s) { if (!bar) { bar = document.createElement('div'); bar.id = 'asBar';
      bar.innerHTML = '<button type="button" class="l" aria-label="Назад">' + svg(I.back, 22, 2.2) + '<span>Назад</span></button><span class="t"><b></b><small></small></span><button type="button" class="r" aria-label="В приложение">' + svg(I.home, 20, 2) + '</button>';
      bar.querySelector('.l').onclick = back; bar.querySelector('.r').onclick = home; document.body.appendChild(bar) }
    var b = bar.querySelector('.t b'), m = bar.querySelector('.t small'); if (b.textContent !== t) b.textContent = t; if (m.textContent !== (s || '')) m.textContent = s || '' };

  /* ---------- «под учеником» (L7b) ---------- */
  var subUI = function () { if (!SUB || document.getElementById('asSub') || !document.body) return;
    var fr = document.createElement('div'); fr.id = 'asFr'; document.body.appendChild(fr);
    var nm = '', gn = function (v) { return typeof v === 'string' && v.trim() ? v.trim() : '' }; nm = gn(window.accountUserName) || gn(window.userName) || gn(window.gcUserName);
    var d = document.createElement('div'); d.id = 'asSub'; d.innerHTML = svg(I.eye, 20, 2) + '<span><b>Ты' + NB + 'в' + NB + 'кабинете ' + (nm ? esc(nm) : 'ученика') + '</b><small>вход под' + NB + 'учеником · только просмотр</small></span><a href="#" hidden>Выйти</a>'; document.body.appendChild(d);
    /* «Выйти» — тот же пункт меню GetCourse, что ищет eco.js (accCheck): сами не нажимаем */
    fetch('/pl/user/profile/menu', { credentials: 'same-origin' }).then(function (r) { return r.json() }).then(function (j) { var Lm = [], walk = function (a) { (a || []).forEach(function (x) { Lm.push(x); walk(x.subitems) }) }; walk(j && j.data && j.data.menu && j.data.menu.items);
      var it = Lm.filter(function (x) { if (!x.url || x.id === 'logout' || /^gus-/.test(String(x.id))) return false; return /sub|return|back|parent/i.test(String(x.id) + ' ' + String(x.url).split('?')[0]) || /вернуть|свой (аккаунт|профиль)|выйти из режима/i.test(String(x.label)) })[0];
      if (it) { var a = d.querySelector('a'); a.href = it.url; a.hidden = false; a.onclick = function () { load() } } }).catch(function () {}) };
  var OFF = '.btn-send-answer,.btn-save-draft,.fl-fb .fl-sb,.fl-edt,.lt-form-survey button,.gc-comment-form .btn-send,#asNav [data-sv],.fl-oth .btn-send,.answer_wrapper .btn-send,#asWk .as-ed,#asCm .as-ed,#asEd .fx,#asEd .uploadifive-button';
  var subOff = function () { if (!SUB) return; $$(OFF).forEach(function (b) { if (b.classList.contains('as-off')) return; b.classList.add('as-off'); b.setAttribute('aria-disabled', 'true'); if ('disabled' in b && b.tagName === 'BUTTON') b.disabled = true;
      var host = b.closest('#asNav') ? null : b.closest('.lt-form-survey') ? $('#asSvTop') : b.closest('#asWk, #asEd .as-card, .lesson-send-answer-block, .fl-fr, .fl-own .answer-content, .as-l12w .answer-content'); if (host && !host.querySelector('.as-state')) host.insertAdjacentHTML('beforeend', '<div class="as-state">' + svg(I.al, 16, 2) + 'В' + NB + 'режиме просмотра отправка выключена</div>') }) };
  if (SUB) document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest(OFF); if (b) { e.preventDefault(); e.stopImmediatePropagation() } }, true);
  if (SUB) document.addEventListener('submit', function (e) { e.preventDefault(); e.stopImmediatePropagation() }, true);

  /* ---------- клавиатура (L5b) ---------- */
  var kb = null, kbUI = function () { if (kb || !document.body) return; kb = document.createElement('div'); kb.id = 'asKb'; kb.innerHTML = '<span class="d"></span><button type="button">Готово</button>';
    kb.querySelector('button').addEventListener('pointerdown', function (e) { e.preventDefault() }); kb.querySelector('button').onclick = function () { softBlur(); kbOff() }; document.body.appendChild(kb) };
  var vv = window.visualViewport, kbT = 0;
  var kbH = function () { return vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0 };
  var keep = function (el) { if (!el || !el.getBoundingClientRect) return; var r = el.getBoundingClientRect(), vt = (vv ? vv.offsetTop : 0), top = vt + (bar ? bar.getBoundingClientRect().bottom - (vv ? 0 : 0) : 0) + 8, bot = vt + (vv ? vv.height : innerHeight) - 52 - 12;
    var dy = 0; if (r.bottom > bot) dy = Math.min(r.bottom - bot, r.top - top); else if (r.top < top) dy = r.top - top; if (Math.abs(dy) > 2) window.scrollBy(0, dy) };
  var kbOn = function (el) { kbUI(); cl('as-kb', 1); R.style.setProperty('--as-kbh', kbH() + 'px'); clearTimeout(kbT); kbT = setTimeout(function () { R.style.setProperty('--as-kbh', kbH() + 'px'); keep(el) }, 320);
    var w = TG(); try { if (w && w.BackButton && history.length <= 1) { w.BackButton.show(); kbOn.bb = 1 } } catch (e) {} };
  var kbOff = function () { cl('as-kb', 0); var w = TG(); try { if (kbOn.bb && w && w.BackButton) { w.BackButton.hide(); kbOn.bb = 0 } } catch (e) {} };
  document.addEventListener('focusin', function (e) { if (isField(e.target) && !e.target.closest('#asLg')) kbOn(e.target) });
  document.addEventListener('focusout', function () { setTimeout(function () { if (!isField(document.activeElement)) kbOff() }, 60) });
  if (vv) { var vr = function () { if (!R.classList.contains('as-kb')) return; R.style.setProperty('--as-kbh', kbH() + 'px'); var a = document.activeElement; if (isField(a)) keep(a) }; vv.addEventListener('resize', vr); vv.addEventListener('scroll', function () { if (R.classList.contains('as-kb')) R.style.setProperty('--as-kbh', kbH() + 'px') }) }
  /* тап мимо поля — закрыть клавиатуру */
  document.addEventListener('pointerdown', function (e) { if (!R.classList.contains('as-kb')) return; var t = e.target; if (isField(t) || (t.closest && t.closest('label, #asKb, .fl-seg, .uploadifive-button, button, a, select'))) return; softBlur() }, true);
  try { var w0 = TG(); if (w0 && w0.BackButton && w0.BackButton.onClick) w0.BackButton.onClick(function () { softBlur() }) } catch (e) {}
  /* поле растёт до половины экрана, дальше прокрутка внутри */
  document.addEventListener('input', function (e) { var t = e.target; if (t.tagName === 'TEXTAREA' && t.closest('.fl, #asEd') && !t.classList.contains('settings-value')) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight + 2, Math.round(innerHeight * .5)) + 'px'; keep(t) } });

  /* ---------- черновик (L5b п.5): сам каждые несколько секунд, при сворачивании; ключ — id урока ---------- */
  var DK = 'asD:' + LID, dT = 0;
  var dFields = function () { return $$('.fl-mis form textarea:not(.settings-value):not(.new-comment-textarea), .fl-fb textarea, .lt-form-survey .part-surveyFields input.form-control, .lt-form-survey .part-surveyFields textarea:not(.as-ta)') };
  var dPicks = function () { return $$('.lt-form-survey .part-surveyFields .field-input-block input[type=radio], .lt-form-survey .part-surveyFields .field-input-block input[type=checkbox]') };
  var dKey = function (f, i) { return (f.closest('.fl-fb') ? 'fb' : f.closest('.lt-form-survey') ? 'sv' : 'hw') + ':' + (f.name || f.id || i) };
  var hhmm = function (d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) };
  var dNote = function (ts) { kbUI(); var s = kb.querySelector('.d'); if (R.classList.contains('as-sv')) { var c = svCount(); s.innerHTML = c.all ? (ts || SUB ? svg(I.ok, 14, 2.6) : '') + 'Отвечено ' + c.n + NB + 'из' + NB + c.all + (ts && !SUB ? ' · сохранено' : '') : ''; return }
    s.innerHTML = ts ? svg(I.ok, 14, 2.6) + 'Черновик сохранён · ' + hhmm(new Date(ts)) : '' };
  /* «под учеником» черновик не пишем и не читаем: это черновик ученика (L10d п.3) */
  var dSave = function () { if (!LID || SUB || R.classList.contains('as-sent')) return; var o = { f: {}, t: Date.now() }, any = 0; dFields().forEach(function (f, i) { if (f.value && f.value.trim()) { o.f[dKey(f, i)] = f.value; any = 1 } });
    var pk = dPicks().filter(function (x) { return x.checked }).map(function (x) { return x.name + '=' + x.value }); if (pk.length) { o.r = pk; any = 1 }
    var on = $('.fl-mis .fl-seg button.on'); if (on) o.lv = on.getAttribute('data-i');
    if (!any && o.lv == null) { ss(DK, null); try { localStorage.removeItem(DK) } catch (e) {} closing(); return }
    var j = JSON.stringify(o); ss(DK, j); try { localStorage.setItem(DK, j) } catch (e) {} dSave.t = o.t; dNote(o.t); closing() };
  var dLoad = function () { if (!LID || SUB || dLoad.done || !(dFields().length || dPicks().length)) return; dLoad.done = 1; var j = ss(DK); if (!j) try { j = localStorage.getItem(DK) } catch (e) {}
    var o = null; try { o = JSON.parse(j || 'null') } catch (e) {} if (!o || Date.now() - (o.t || 0) > 14 * 864e5) return;
    dFields().forEach(function (f, i) { var v = o.f && o.f[dKey(f, i)]; if (v && !f.value) { f.value = v; try { f.dispatchEvent(new Event('input', { bubbles: true })) } catch (e) {} } });
    if (o.r && o.r.length && !dPicks().some(function (x) { return x.checked })) dPicks().forEach(function (x) { if (o.r.indexOf(x.name + '=' + x.value) >= 0 && !x.checked) { x.checked = true; try { x.dispatchEvent(new Event('change', { bubbles: true })) } catch (e) {} } });
    if (o.lv != null && !$('.fl-mis .fl-seg button.on')) { var b = $('.fl-mis .fl-seg button[data-i="' + o.lv + '"]'); if (b) b.click() } dNote(o.t) };
  var closing = function () { var w = TG(); if (!w || !w.isVersionAtLeast || !w.isVersionAtLeast('6.2')) return; var dirty = !R.classList.contains('as-sent') && $$('.fl-mis form textarea:not(.settings-value):not(.new-comment-textarea)').some(function (f) { return f.value.trim() }); try { dirty ? w.enableClosingConfirmation() : w.disableClosingConfirmation() } catch (e) {} };
  document.addEventListener('input', function (e) { if (!e.target.closest || !e.target.closest('.fl-mis form, .fl-fb, .lt-form-survey')) return; clearTimeout(dT); dT = setTimeout(dSave, 1500) });
  document.addEventListener('visibilitychange', function () { if (document.hidden) dSave() }); addEventListener('pagehide', dSave);
  setInterval(function () { if (R.classList.contains('as-kb')) dSave() }, 5000);
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.fl-seg, .fl-lv')) { clearTimeout(dT); dT = setTimeout(dSave, 400) } });
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.btn-send-answer')) setTimeout(function () { ss(DK, null); try { localStorage.removeItem(DK) } catch (x) {} }, 4000) }, true);

  /* ---------- материалы (L4b): файл — системным окном Telegram «Скачать файл?» ---------- */
  var FILE = /fileservice|\.(pdf|psd|zip|rar|7z|jpe?g|png|webp|docx?|xlsx?|pptx?|ai|fig|mp4|mov)(\?|#|$)/i;
  var fname = function (a, h) { var t = txt(a.querySelector('.t b')) || 'file', ext = (h.split(/[?#]/)[0].match(/\.([a-z0-9]{2,4})$/i) || [])[1] || (/pdf/i.test(txt(a)) ? 'pdf' : ''); return t.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) + (ext ? '.' + ext.toLowerCase() : '') };
  addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a.fl-mat[href]'); if (!a) return; var h = a.href; if (!FILE.test(h) || !/^https:/.test(h)) return;
    var w = TG(); if (!w || !w.downloadFile || !w.isVersionAtLeast || !w.isVersionAtLeast('8.0')) return; /* старый Telegram — как раньше (layout.js) */
    e.preventDefault(); e.stopImmediatePropagation(); try { w.downloadFile({ url: h, file_name: fname(a, h) }) } catch (x) {} }, true);

  /* ---------- урок: разметка под макет ---------- */
  var kind = function () { return $('.lt-form-survey') ? 'sv' : ($('.fl-lvs') || /домашн|задание по итогу/i.test(txt($('h1.fl-t')) + ' ' + document.title)) ? 'hw' : 'ls' };
  var modN = function () { var a = $$('.fl-bc a').map(txt).filter(function (t) { return /Модуль\s*\d+/i.test(t) })[0] || ''; return (a.match(/Модуль\s*(\d+)/i) || [])[1] || '' };
  var partT = function () { return txt($('.fl-bc b')) };
  var pos = function () { var m = $$('.fl-chip').map(txt).join(' ').match(/Урок\s*(\d+)\s*из\s*(\d+)/i); return m ? [+m[1], +m[2]] : null };
  var hr = function (k) { var hd = $('.fl-hd'), h1 = $('h1.fl-t', hd); if (!hd || !h1) return; var p = pos(), mn = modN(), pt = partT(), html;
    if (k === 'sv') { var n = $$('.lt-form-survey .part-surveyFields .field-wrapper').length || $$('.lt-form-survey .field-wrapper').length, mi = Math.max(1, Math.round(n / 3)); html = '<span class="och">+' + svPts() + NB + 'баллов</span><span class="m">' + (n ? n + NB + pl(n, ['вопрос', 'вопроса', 'вопросов']) + ' · ' + mi + NB + pl(mi, ['минута', 'минуты', 'минут']) : '') + '</span>' }
    else if (k === 'hw') html = (p ? '<span class="och">Урок ' + p[0] + NB + 'из' + NB + p[1] + '</span>' : '') + '<span class="m">' + esc([mn ? 'Модуль ' + mn : '', pt].filter(Boolean).join(' · ')) + '</span>';
    else html = (mn ? '<span class="och">Модуль ' + mn + '</span>' : '') + '<span class="m">' + esc(pt) + '</span>';
    var r = document.getElementById('asHr'); if (!r || r.parentNode !== hd) { r = document.createElement('div'); r.id = 'asHr'; hd.insertBefore(r, h1) } if (r.getAttribute('data-h') !== html) { r.setAttribute('data-h', html); r.innerHTML = html }
    if (k === 'hw' && $('span', h1)) h1.textContent = 'Домашнее задание' };
  var mats = function () { $$('.fl-mats').forEach(function (m) { var sec = m.closest('section'); if (!sec) return; var n = $$('.fl-mat', m).length; var ex = $$('.fl-mat', m).some(function (a) { var h = a.getAttribute('href') || ''; return !/getcourse|fileservice/i.test(h) && !FILE.test(h) }); sec.classList.add('as-mats'); sec.classList.toggle('as-list', n > 2 || ex);
      $$('.fl-mat', m).forEach(function (a) { if (a.getAttribute('data-as')) return; a.setAttribute('data-as', 1); var h = a.getAttribute('href') || '', s = $('.t span', a), v = $('.fl-go span', a);
        var ext = !/getcourse|fileservice/i.test(h) && !FILE.test(h); if (ext) { a.classList.add('as-ext'); if (s && /Яндекс|Google|Notion|Figma|Telegram|Pinterest|Behance/i.test(s.textContent)) s.textContent += ' · откроется в' + NB + 'нём' } else { if (v) v.textContent = 'Скачать'; if (s && n <= 2) s.textContent = 'Скачать · ' + s.textContent } }) }) };
  var about = function () { $$('.fl-about .fl-lbl').forEach(function (l) { if (/^В этом уроке$/i.test(txt(l))) l.textContent = 'О чём урок' }) };
  var nextCard = function () { var nx = $('.fl-next'); if (!nx || nx.getAttribute('data-as')) return; var a = $('.fl-nb a.fl-btn', nx) || $('.fl-nb a:last-child', nx); if (!a) return; nx.setAttribute('data-as', 1);
    var mn = (txt($('.t b', nx)).match(/Модуль\s*(\d+)/i) || [])[1] || modN(); if (mn) { var im = document.createElement('img'); im.className = 'as-cv'; im.alt = ''; im.src = GH + 'sq/m' + ('0' + mn).slice(-2) + '.jpg?v=29'; im.onerror = function () { im.remove() }; nx.insertBefore(im, nx.firstChild) }
    nx.insertAdjacentHTML('beforeend', svg(I.r, 20, 2)); nx.addEventListener('click', function (e) { if (e.target.closest('a')) return; load(); location.href = a.href }) };
  var navBar = function (k) { var on = k === 'ls' || k === 'sv'; var nv = document.getElementById('asNav'), sv2 = false, nerr = '';
    if (k === 'sv') { if (svIsDone()) on = false; else { sv2 = svSaved(); var ne = $$('.lt-form-survey .as-err').length; if (ne && R.classList.contains('as-svt')) nerr = '<span class="nerr">' + svg(I.al2, 16, 2) + '<span>' + (ne === 1 ? 'Остался 1' + NB + 'вопрос, он' + NB + 'отмечен красным' : 'Осталось ' + ne + NB + pl(ne, ['вопрос', 'вопроса', 'вопросов']) + ', они отмечены красным') + '</span></span>' } }
    if (!on) { if (nv) nv.remove(); cl('as-nav', 0); cl('as-nerr', 0); return }
    var html = '';
    if (k === 'sv') html = nerr + '<button type="button" class="p" data-sv="' + (sv2 ? 2 : 1) + '"><span>' + (sv2 ? 'Засчитать анкету' : 'Отправить анкету') + ' · +' + svPts() + '</span></button>';
    else { var pa = $('.fl-bar a.p'), nx = $('.fl-next'), na = nx && ($('.fl-nb a.fl-btn', nx)), pn = pa ? (pa.getAttribute('aria-label') || '').replace(/^Предыдущий урок:\s*/, '') : '', nn = nx ? txt($('.t b', nx)) : '';
      if (pa) html += '<a class="s" href="' + esc(pa.getAttribute('href')) + '">' + svg(I.l, 18) + '<span>' + esc(pn || 'Предыдущий') + '</span></a>';
      if (na) html += '<a class="p" href="' + esc(na.getAttribute('href')) + '"><span>' + esc(nn || 'Дальше') + '</span>' + svg(I.r, 18) + '</a>' }
    if (!html) { if (nv) nv.remove(); cl('as-nav', 0); return }
    if (!nv) { nv = document.createElement('nav'); nv.id = 'asNav'; nv.setAttribute('aria-label', 'Переход между уроками'); document.body.appendChild(nv);
      nv.addEventListener('click', function (e) { var b = e.target.closest('[data-sv]'); if (b) { e.preventDefault(); if (b.getAttribute('data-sv') === '2') svCount2(); else svSend() } else if (e.target.closest('a')) load() }) }
    if (nv.getAttribute('data-h') !== html) { nv.setAttribute('data-h', html); nv.innerHTML = html; nv.classList.toggle('one', k === 'sv' || nv.children.length === 1); nv.classList.toggle('sv', k === 'sv'); subOff() } cl('as-nav', 1); cl('as-nerr', !!nerr) };
  /* уровни: «Лёгкий · 20» и кнопка «Выбрать / Выбран» (выбор делает layout.js по клику на карточку) */
  var levels = function () { var can = !!$('.fl-mis .fl-seg'); $$('.fl-lv').forEach(function (c) { var lv = +c.getAttribute('data-lv'), b = $('.fl-lvh b', c), em = $('.fl-lvh em', c); if (b) b.setAttribute('data-as-b', [20, 40, 70][lv]);
      if (em) em.classList.toggle('as-x2', /×2/.test(em.textContent)); var bb = $('.bonus-block', c), pk = $('.as-pick', c);
      if (can && bb && !pk) { pk = document.createElement('button'); pk.type = 'button'; pk.className = 'as-pick'; bb.appendChild(pk) } if (!can && pk) pk.remove();
      if (pk) { var t = c.classList.contains('on') ? 'Выбран' : 'Выбрать'; if (pk.textContent !== t) pk.textContent = t } }) };
  /* своя работа: статус чипом в заголовке, строка «уровень · отправлено …» */
  /* дата ответа «27 окт, 14:35» — из подсказки GetCourse «Время обновления ответа 2026-10-27 14:35:20», иначе как написано */
  var MONS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  var fdt = function (s) { var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/); return m ? +m[3] + NB + MONS[+m[2] - 1] + ', ' + ('0' + m[4]).slice(-2) + ':' + m[5] : '' };
  var aDate = function (w) { var a = $('.answer-date a', w); return a ? fdt(a.getAttribute('title')) || txt(a) : '' };
  var aId = function (w) { return w ? (w.getAttribute('data-id') || ((w.id || '').match(/\d+/) || [])[0] || '') : '' };
  var aSt = function (c) { c = String(c || ''); return /status-accepted|status-approved/.test(c) ? 'ok' : /status-not_accepted|status-declined|status-rejected|status-need/.test(c) ? 'wn' : /status-new|status-in_work|status-review/.test(c) ? 'rv' : '' };
  var aLv = function (w) { var lv = -1; $$('.addfield', w).forEach(function (f) { if (/^да$/i.test(txt($('.value', f)))) { var t = txt($('label', f)); lv = Math.max(lv, /л[её]гк/i.test(t) ? 0 : /средн/i.test(t) ? 1 : /максим/i.test(t) ? 2 : -1) } }); return lv };
  var LVN = ['Лёгкий', 'Средний', 'Максимальный'], LVB = [20, 40, 70];
  var edSaved = function (w) { var o = null; try { o = JSON.parse(ss('asEdS') || 'null') } catch (e) {} return !!(o && o.a && o.a === aId(w) && Date.now() - o.t < 30 * 6e4) };
  var lesUrl = function () { return location.pathname + location.search.replace(/([?&])showAnswer=[^&]*&?/g, '$1').replace(/[?&]$/, '') };
  var own = function () { var mw = $('.fl-mis'); if (!mw) return; var w = $('.self-answers .answer_wrapper', mw), c = w ? w.className : '';
    var stt = /status-accepted|status-approved/.test(c) ? 'ok' : /status-not_accepted|status-declined|status-rejected|status-need/.test(c) ? 'wn' : /status-new|status-in_work|status-review/.test(c) ? 'rv' : '';
    cl('as-ok', stt === 'ok'); cl('as-wn', stt === 'wn'); cl('as-rv', stt === 'rv'); cl('as-sent', stt === 'ok' || stt === 'rv');
    var mh = $('h2.fl-mh', mw); if (mh && stt) { var p = $('.as-pts', mh), lab = { ok: 'Принято', wn: 'Нужно доработать', rv: 'На' + NB + 'проверке' }[stt]; if (!p) { p = document.createElement('span'); mh.appendChild(p) } p.className = 'as-pts ' + (stt === 'rv' ? '' : stt); if (p.textContent !== lab) p.textContent = lab }
    if (w && kind() === 'hw') { var ac = $('.answer-content', w); if (ac && !$('.as-meta', ac)) { var lvl = $$('.fl-ast .fl-chip', ac).map(txt).filter(function (t) { return /л[её]гк|средн|максим/i.test(t) })[0] || '', base = /л[её]гк/i.test(lvl) ? 20 : /средн/i.test(lvl) ? 40 : /максим/i.test(lvl) ? 70 : 0, dt = aDate(w);
        var m = document.createElement('span'); m.className = 'as-meta'; m.textContent = [lvl ? lvl.charAt(0).toUpperCase() + lvl.slice(1).toLowerCase() + (base ? ' · ' + base : '') : '', dt ? (edSaved(w) ? 'изменено ' : stt === 'wn' ? 'проверено ' : 'отправлено ') + dt + NB + 'МСК' : ''].filter(Boolean).join(' · '); var fa = $('.fl-ast', ac); if (fa) fa.insertAdjacentElement('afterend', m); else ac.insertBefore(m, ac.firstChild) } }
    /* шаги как в макете: на проверке — текущий шаг «Куратор проверит», доработка — «Доработай» */
    var cm = w && $('.comments', w); if (cm && !cm.classList.contains('as-nocm')) { var cc = $('.comments-container', cm); if (!cc || !cc.offsetHeight) cm.classList.add('as-nocm') }
  var li = $$('ol.fl-steps:not(.s2) li'); if (li.length === 4 && stt) { var on = stt === 'ok' ? 4 : 2; li.forEach(function (x, i) { var cn = i < on ? 'ok' : i === on ? 'on' : ''; if (x.className !== cn) x.className = cn }); var b2 = $('b', li[2]); if (b2) { var t2 = stt === 'wn' ? 'Доработай' : 'Куратор проверит'; if (b2.textContent !== t2) b2.textContent = t2 } } };
  var hwForm = function () { var mw = $('.fl-mis:not(.fl-own)'); if (!mw || kind() !== 'hw') return; var ml = $('.fl-ml:not(.fl-svn)', mw); if (ml && ml.textContent !== 'Уровень') ml.textContent = 'Уровень'; var so = $('.fl-seg button.on', mw); if (ml) { var lvt = so ? txt(so) : ''; if (lvt && ml.getAttribute('data-as-lv') !== lvt) ml.setAttribute('data-as-lv', lvt); else if (!lvt) ml.removeAttribute('data-as-lv') }
    var ta = $('.lesson-send-answer-block form textarea:not(.settings-value)', mw) || $('#lessonAnswerForm textarea:not(.settings-value)', mw), tc = ta && (ta.closest('.answer-textarea-container') || ta); /* не поле комментария к своей работе */ if (tc && !(tc.previousElementSibling && tc.previousElementSibling.classList.contains('as-lbl'))) tc.insertAdjacentHTML('beforebegin', '<span class="as-lbl">Твой ответ</span>');
    var ub = $('.uploadifive-button', mw); if (ub && ub.firstChild && ub.firstChild.nodeType === 3 && ub.firstChild.nodeValue !== 'Выбери файлы') ub.firstChild.nodeValue = 'Выбери файлы';
    var sm = $('.text-muted.small', mw); if (sm && /100/.test(sm.textContent) && !/JPG/.test(sm.textContent)) sm.textContent = 'JPG, PNG, PSD, ZIP · файлы до' + NB + '100' + NB + 'МБ' };

  /* ---------- своя работа: запоминаем модуль/урок/дату для страницы «Изменить работу» (там их нет); L11b — тост после сохранения ---------- */
  /* L5c–L5e, L11b: файлы своей работы строками, комментарии куратора карточками */
  var ownView = function () { if (kind() !== 'hw' || R.classList.contains('as-l12')) return; var mw = $('.fl-mis'), w = mw && $('.self-answers .answer_wrapper', mw), ac = w && $('.answer-content', w); if (!ac) return;
    var wg = $('.comment-files-widget', w), fl = $('.as-fls', w); if (wg && !fl) { var rows = $$('.answer-file-box', wg).map(function (b, i) { var a = $('a[href]', b), im = $('img', b), h = a ? a.getAttribute('href') : '', nm = ''; try { nm = decodeURIComponent((h.split(/[?#]/)[0].split('/').pop() || '')) } catch (e) {} if (!/\.[a-z0-9]{2,5}$/i.test(nm)) nm = txt($('p', b)) || 'Файл ' + (i + 1);
        return '<a class="as-flr" href="' + esc(h) + '"><span class="th">' + (im ? '<img src="' + esc(im.getAttribute('src')) + '" alt="">' : svg(I.file, 18, 1.8)) + '</span><span><b>' + esc(nm) + '</b><small>' + esc(((nm.match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toUpperCase()) + '</small></span></a>' }).join('');
      if (rows) { fl = document.createElement('div'); fl.className = 'as-fls'; fl.innerHTML = rows; wg.parentNode.insertBefore(fl, wg.nextSibling); wg.classList.add('as-hid') } }
    var ed = $('a.fl-edt', ac); if (ed && !ed.getAttribute('data-as')) { ed.setAttribute('data-as', 1); var sv0 = $('svg', ed); if (sv0) sv0.outerHTML = svg(I.edit, 18, 1.9) }
    var C = cmHtml(w), c5 = $('.as-cm5', ac); if (C.cc) C.cc.classList.toggle('as-hid', C.ok && C.items.length > 0);
    if (C.html) { if (!c5) { c5 = document.createElement('div'); c5.className = 'as-cm5'; ac.appendChild(c5) } if (c5.getAttribute('data-h') !== C.html) { c5.setAttribute('data-h', C.html); c5.innerHTML = C.html } } else if (c5) c5.remove() };
  var ownStore = function () { if (kind() !== 'hw') return; var mw = $('.fl-mis'), w = mw && $('.self-answers .answer_wrapper', mw); if (!w) return; var aid = aId(w); if (!aid) return;
    var mn = modN(), o = { s: (mn ? 'Модуль ' + mn + ' · ' : '') + partT(), u: lesUrl(), d: aDate(w), lv: aLv(w), st: aSt(w.className) }, j = JSON.stringify(o); if (ss('asA:' + aid) !== j) ss('asA:' + aid, j);
    var e = null; try { e = JSON.parse(ss('asEdS') || 'null') } catch (x) {} if (e && e.a === aid && !e.shown && Date.now() - e.t < 30 * 6e4) { e.shown = 1; ss('asEdS', JSON.stringify(e)); ss('asEdB', LID);
      var t = toast('<b>Изменения сохранены</b><br>Куратор увидит новую версию', $('ol.fl-steps') || null, 4000); if (t) setTimeout(function () { var r = t.getBoundingClientRect(); window.scrollBy(0, r.top - (bar ? bar.getBoundingClientRect().bottom : 0) - 14) }, 60) } };

  /* ---------- плитки файлов (L11, L12): картинка — превью, остальное — значок и тип ---------- */
  var fTiles = function (root, del) { return $$('.answer-file-box', root).map(function (b, i) { var a = $('a[href]', b), im = $('img', b), cb = $('input[type=checkbox]', b), h = a ? a.getAttribute('href') : '';
      var nm = ''; try { nm = decodeURIComponent((h.split(/[?#]/)[0].split('/').pop() || '')) } catch (e) {} if (!/\.[a-z0-9]{2,5}$/i.test(nm)) nm = txt($('p', b)) || txt(a) || (im && im.getAttribute('alt')) || 'Файл ' + (i + 1);
      var ext = ((nm.match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toUpperCase();
      return '<div class="as-ft" data-i="' + i + '"><' + (del ? 'span' : 'a href="' + esc(h) + '"') + ' class="fi">' + (im ? '<img src="' + esc(im.getAttribute('src')) + '" alt="">' : svg(I.file, 26, 1.8) + esc(ext || 'ФАЙЛ')) + '</' + (del ? 'span' : 'a') + '>'
        + (del && cb && !SUB ? '<button type="button" class="fx" aria-label="Удалить файл ' + esc(nm) + '"><i>' + svg(I.x, 14, 2) + '</i></button>' : '') + '<small>' + esc(nm) + '</small><em>' + esc(ext) + '</em></div>' }) };
  addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('#asWk a.fi[href], a.as-flr[href]'); if (!a) return; var h = a.href, w = TG(); e.preventDefault(); if (w && w.downloadFile && w.isVersionAtLeast && w.isVersionAtLeast('8.0') && /^https:/.test(h)) { try { w.downloadFile({ url: h, file_name: txt(a.parentNode.querySelector('small')) && !a.classList.contains('as-flr') ? txt(a.parentNode.querySelector('small')) : txt($('b', a)) || 'file' }) } catch (x) {} return } load(); location.href = h }, true);

  /* лента комментариев к своей работе: куратор — «куратор», свои — «Ты» (L5d, L12) */
  var cmHtml = function (w) {
    var cc = $('.comments-container', w), me = w.getAttribute('data-user-id') || String(window.accountUserId || ''), items = cc ? $$('.comment', cc).filter(function (c) { return !c.closest('.settings') && !c.parentNode.closest('.comment') }) : [], ok = true;
    var ch = items.map(function (c) { var uid = c.getAttribute('data-user-id') || (($('[data-user-id]', c) || { getAttribute: function () { return '' } }).getAttribute('data-user-id')), nm = txt($('.user-profile-link .text, .user-name, .comment-user-name, .author-name, .user-profile-link', c)),
        t = $('.comment-text, .comment-body, .text-block, .comment-main-text, .comment-content .text, .comment-main > .text', c), d = cmDay(txt($('.comment-date, .date, .created-at, time', c)) || ($('[title]', c) || { getAttribute: function () { return '' } }).getAttribute('title')), mine = !!uid && uid === me;
      if (!t) { ok = false; return '' } var tt = (t.innerText || t.textContent).trim(), n1 = (nm.split(/\s+/)[0] || '').trim();
      return '<div class="as-cmt' + (mine ? ' me' : '') + '"><span class="av">' + esc((n1 || '?').charAt(0).toUpperCase()) + '</span><span><b>' + (mine ? 'Ты' : esc(n1 || 'Куратор')) + ' <small>' + (mine ? '' : '· куратор ') + (d ? '· ' + esc(d) : '') + '</small></b><p>' + esc(tt) + '</p></span></div>' }).join('');
    return { cc: cc, ok: ok, html: ok ? ch : '', items: items } };
  /* ---------- L12: «Моя работа» — урок, открытый по ссылке на ответ (уведомление GetCourse: ?showAnswer=…#answer…) ---------- */
  var L12 = { off: false };
  var l12On = function () { if (L12.off || !isLes || kind() !== 'hw') return false; if (!/[?&]showAnswer=\d+/.test(location.search) && !/^#answer\d+/.test(location.hash)) return false; return !!$('.fl-mis .self-answers .answer_wrapper') };
  l12Exit = function () { L12.off = true; try { history.replaceState(history.state, '', lesUrl()) } catch (e) {} cl('as-l12', 0); try { sync() } catch (e) {} window.scrollTo(0, 0) };
  var cmDay = function (s) { s = String(s || '').replace(/\s+/g, ' ').trim(); var m = s.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return +m[3] + NB + MONS[+m[2] - 1]; m = s.match(/(\d{1,2})\s+([а-яё]{3})/i); if (m) return m[1] + NB + m[2].toLowerCase(); m = s.match(/сегодня|вчера/i); return m ? m[0].toLowerCase() : s };
  var l12 = function () { var on = l12On(); cl('as-l12', on); if (!on) return; if (!L12.top) { L12.top = 1; /* браузер прыгнул к якорю #answer… — экран начинается с карточки работы */ window.scrollTo(0, 0); addEventListener('load', function () { setTimeout(function () { if (R.classList.contains('as-l12')) window.scrollTo(0, 0) }, 50) }) }
    var mw = $('.fl-mis'), w = $('.self-answers .answer_wrapper', mw), ac = w && $('.answer-content', w); if (!ac) return; mw.classList.add('as-l12w');
    var st = aSt(w.className) || 'rv', lv = aLv(w), base = lv >= 0 ? LVB[lv] : 0, ed = $('.answer-edit-link a[href]', w) || $('a.fl-edt', w), eh = ed ? ed.getAttribute('href').replace(/^\/pl\/\.\.\/\.\.\//, '/') : '';
    var gv = +((txt($('.fl-got b', mw)).match(/\d+/) || [])[0] || 0), pts = gv || base, dt = aDate(w);
    var tx = (function () { var t = $('.answer-text', w); if (t) return (t.innerText || t.textContent).trim(); var m = $('.answer-main-content .main', w); if (!m) return ''; var c = m.cloneNode(true); $$('.addfield, .answer-files, .comment-files-widget, .fl-ast, script, style', c).forEach(function (x) { x.remove() }); return c.textContent.replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim() })();
    var meta = [lv >= 0 ? LVN[lv] + ' · ' + base : '', dt ? (edSaved(w) ? 'изменено ' : st === 'ok' ? 'принято ' : st === 'wn' ? 'проверено ' : 'отправлено ') + dt + NB + 'МСК' : ''].filter(Boolean).join(' · ');
    var ft = fTiles(w, false), lab = { ok: 'Принято', wn: 'Нужно доработать', rv: 'На' + NB + 'проверке' }[st];
    var html = '<div class="as-wh"><h4>Твоя работа</h4><span class="as-pts ' + (st === 'rv' ? '' : st) + '">' + lab + '</span></div>' + (st === 'ok' && pts ? '<b class="as-big">+' + pts + ' <small>' + pl(pts, ['балл', 'балла', 'баллов']) + '</small></b>' : '')
      + (meta ? '<span class="as-mut">' + esc(meta) + '</span>' : '') + (tx ? '<span class="as-wt">' + esc(tx) + '</span>' : '') + (ft.length ? '<div class="as-fg">' + ft.join('') + '</div>' : '')
      + (st === 'rv' && eh ? '<a class="as-b2 as-ed" href="' + esc(eh) + '">' + svg(I.edit, 18, 1.9) + 'Изменить работу</a>' : '') + (st === 'ok' ? '<span class="as-m3">Принятую работу изменить нельзя</span>' : '');
    var wk = document.getElementById('asWk'); if (!wk) { wk = document.createElement('div'); wk.id = 'asWk'; ac.insertBefore(wk, ac.firstChild) } wk.className = 'as-card ' + st; if (wk.getAttribute('data-h') !== html) { wk.setAttribute('data-h', html); wk.innerHTML = html }
    /* лента: куратор — слева с подписью «куратор», свои — «Ты»; новые снизу */
    var C = cmHtml(w), cc = C.cc, ok = C.ok, ch = C.html, items = C.items;
    if (cc) cc.classList.toggle('as-hid', ok && items.length > 0);
    var cm = document.getElementById('asCm'), gf = $('.gc-comment-form', w), host = gf ? gf.parentNode : cc ? cc.parentNode : $('.comments', w) || ac;
    var html2 = (ok ? ch : '') + (st === 'wn' && eh ? '<a class="as-b1 as-ed" href="' + esc(eh) + '">' + svg(I.edit, 18, 1.9) + 'Изменить работу</a>' : '');
    if (!cm) { cm = document.createElement('div'); cm.id = 'asCm' } if (cm.parentNode !== host) host.insertBefore(cm, gf || null); if (cm.getAttribute('data-h') !== html2) { cm.setAttribute('data-h', html2); cm.innerHTML = html2 } cm.style.display = html2 ? '' : 'none';
    if (gf) { var ta = $('textarea.new-comment-textarea, textarea:not(.settings-value)', gf), sb = $('.btn-send', gf); if (ta && ta.getAttribute('placeholder') !== 'Ответить куратору') ta.setAttribute('placeholder', 'Ответить куратору'); if (ta) ta.setAttribute('aria-label', 'Ответить куратору');
      if (sb && !$('.as-si', sb)) { sb.insertAdjacentHTML('beforeend', '<span class="as-si" style="display:grid">' + svg(I.send, 18, 2.2) + '</span>'); sb.setAttribute('aria-label', 'Отправить куратору') } gf.classList.toggle('as-has', !!(ta && ta.value.trim())) }
    var x = document.getElementById('asL12x'), mwr = $('.lesson-mission-wrapper', mw) || mw; if (!x) { x = document.createElement('button'); x.type = 'button'; x.id = 'asL12x'; x.className = 'as-b2'; x.textContent = 'К' + NB + 'уроку'; x.onclick = function () { l12Exit() } } if (x.parentNode !== mwr || x.nextElementSibling) mwr.appendChild(x) };
  document.addEventListener('input', function (e) { var t = e.target; if (t.matches && t.matches('.as-l12w .gc-comment-form textarea')) t.closest('.gc-comment-form').classList.toggle('as-has', !!t.value.trim()) });
  /* «Ответить куратору»: пусто — кнопка серая и ничего не отправляет */
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.as-l12w .gc-comment-form .btn-send'); if (!b) return; var t = $('textarea.new-comment-textarea, textarea:not(.settings-value)', b.closest('.gc-comment-form')); if (!t || !t.value.trim()) { e.preventDefault(); e.stopImmediatePropagation() } }, true);

  /* ---------- L11: «Изменить работу» (/teach/control/answers/edit?id=…) — форма GetCourse в коже L5a ---------- */
  var ED = { built: false, boot: isEd ? ss('asEdS') : null }; /* флаг «сохранил» — только тот, что был до загрузки этой страницы */
  var edInfo = function () { var aid = (location.search.match(/[?&]id=(\d+)/) || [])[1] || '', o = null; try { o = JSON.parse(ss('asA:' + aid) || 'null') } catch (e) {} return { aid: aid, o: o || {} } };
  var edLeave = function () { guard.ok = 1; load(); var i = edInfo(); if (history.length > 1) hb.call(history); else if (i.o.u) location.href = i.o.u; else home() };
  var edLvs = function (fm) { return $$('.addfield-type-checkbox', fm).map(function (d) { var t = txt($('label', d)), c = $('input[type=checkbox]', d); return { el: c, lv: /л[её]гк/i.test(t) ? 0 : /средн/i.test(t) ? 1 : /максим/i.test(t) ? 2 : -1 } }).filter(function (x) { return x.el && x.lv >= 0 }) };
  var edSnap = function (fm) { return $$('textarea[name], input[type=checkbox]', fm).map(function (x) { return x.type === 'checkbox' ? (x.checked ? 1 : 0) : x.value }).join('|') };
  edDirty = function () { var fm = $('#asEd') && $('#asEd').closest('form'); return !!(ED.built && fm && !guard.ok && (edSnap(fm) !== ED.init || $$('#asEd .uploadifive-queue-item').length)) };
  edSheet = function () { if (document.getElementById('asSh')) return; var d = document.createElement('div'); d.id = 'asSh'; d.innerHTML = '<div role="dialog" aria-modal="true" aria-label="Выйти без сохранения?"><b>Выйти без' + NB + 'сохранения?</b><p>Изменения в' + NB + 'работе пропадут. Сохрани их, чтобы куратор увидел новую версию.</p><button type="button" class="as-b1" data-k="s">Сохранить</button><button type="button" class="as-b2" data-k="x">Выйти</button></div>';
    d.addEventListener('click', function (e) { var k = e.target.closest('[data-k]'); if (!k && e.target.closest('[role=dialog]')) return; d.remove(); if (!k) return; if (k.getAttribute('data-k') === 'x') edLeave(); else { var sb = $('#asEd .btn-send-answer, #asEd button[name=send-answer]'); if (sb) sb.click() } }); document.body.appendChild(d) };
  var edStatus = function (fm) { var tw = document.createTreeWalker(fm, NodeFilter.SHOW_TEXT, null), n; while ((n = tw.nextNode())) if (/Статус\s*:/.test(n.nodeValue)) { var el = n.parentNode; return { el: el, t: txt(el).replace(/^.*?Статус\s*:\s*/, '') } } return { el: null, t: '' } };
  var edClosed = function (kd, fm, info) { var host = $('.standard-page-content') || $('.gc-main-content .container'); if (!host || document.getElementById('asEdX')) return; [].forEach.call(host.children, function (c) { c.classList.add('as-gone') });
    var lv = fm ? edLvs(fm).filter(function (x) { return x.el.checked }).map(function (x) { return x.lv })[0] : null; if (lv == null && info.o.lv >= 0) lv = info.o.lv; var pts = lv != null && lv >= 0 ? LVB[lv] : 0;
    var d = document.createElement('section'); d.id = 'asEdX'; d.className = 'as-ctr'; d.style.paddingTop = '14px';
    d.innerHTML = kd === 'ok' ? '<div class="as-card as-dc"><span class="as-okc">' + svg(I.ok, 34, 2.6) + '</span><span class="as-pts ok">Принято' + (pts ? ' · +' + pts + NB + 'баллов' : '') + '</span><span class="h">Работа уже принята</span><span class="s">Куратор ' + (info.o.st === 'ok' && info.o.d ? 'проверил её ' + esc(info.o.d.split(',')[0]) : 'уже проверил её') + '. Принятую работу изменить нельзя, чтобы баллы в' + NB + 'рейтинге оставались честными.</span><button type="button" class="as-b1" data-go="les">К' + NB + 'уроку</button>' + (info.o.u ? '<button type="button" class="as-b2" data-go="work">Посмотреть работу</button>' : '') + '<span class="as-m3">Хочешь показать новую версию' + NB + '— напиши куратору в' + NB + 'комментариях к' + NB + 'работе.</span></div>'
      : '<div class="as-card as-dc"><span class="as-okc" style="background:rgba(255,180,140,.12);color:#ffb48c;box-shadow:inset 0 0 0 1px rgba(255,180,140,.35)">' + svg(I.al2, 34, 2) + '</span><span class="h">Эту работу открыть нельзя</span><span class="s">Похоже, это чужая работа или у' + NB + 'тебя нет доступа к' + NB + 'курсу.</span><button type="button" class="as-b1" data-go="home">На' + NB + 'Учёбу</button></div>';
    d.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (!b) return; var g = b.getAttribute('data-go'); guard.ok = 1;
      if (g === 'home') home(); else if (g === 'work') { load(); location.href = info.o.u + (info.o.u.indexOf('?') < 0 ? '?' : '&') + 'showAnswer=' + info.aid + '#answer' + info.aid } else if (info.o.u) { load(); location.href = info.o.u } else back() });
    host.appendChild(d) };
  if (isEd) setTimeout(function () { var b = $('.edit-answer'); if (b && !b.classList.contains('as-r')) b.classList.add('as-r') }, 2500); /* страховка: форма GetCourse не остаётся скрытой, если кожа не собралась */
  var edUI = function () { var info = edInfo(), fm = $('.answers-list.edit-answer form') || $('form#lessonAnswerForm'), box = fm && (fm.closest('.answers-list') || fm.parentNode), ht = txt($('.page-header h1')), lt = (ht.match(/на урок\s*["«](.+?)["»]\s*$/) || [])[1] || 'Домашнее задание';
    setBar('Изменить работу', info.o.s || lt);
    if (!fm) { if (document.readyState !== 'loading') edClosed('no', null, info); return }
    var stt = edStatus(fm), st = /не\s*принят|отклон|доработ|не\s*зачт|отказ/i.test(stt.t) ? 'wn' : /принят|зачт|выполнен/i.test(stt.t) ? 'ok' : 'rv';
    if (st === 'ok') { edClosed('ok', fm, info); return }
    /* GetCourse оставил на этой же странице после «Сохранить» — сразу к уроку с тостом (L11b) */
    var es = null; try { es = JSON.parse(ED.boot || 'null') } catch (e) {} ED.boot = null; if (es && es.a === info.aid && !es.r && Date.now() - es.t < 60e3 && info.o.u) { es.r = 1; ss('asEdS', JSON.stringify(es)); guard.ok = 1; load(); location.replace(info.o.u); return }
    if (ED.built) { edSync(fm); return } ED.built = true;
    var ta = $('textarea[name="LessonAnswer[answer_text]"]', fm) || $('textarea:not(.settings-value)', fm), taW = ta && ta.parentNode.classList.contains('emoji-container') ? ta.parentNode : ta;
    var up = $('.uploadifive-button', fm), fi = $('input[type=file]', fm), q = $('#queue', fm), sb = $('button[name=send-answer]', fm) || $('.btn-send-answer', fm) || $('[type=submit]', fm), lvs = edLvs(fm);
    if (!up && fi) { up = document.createElement('label'); up.className = 'uploadifive-button as-upz'; fi.parentNode.insertBefore(up, fi); up.appendChild(fi) }
    var lab = { wn: 'Нужно доработать', rv: 'На' + NB + 'проверке' }[st];
    var ed = document.createElement('div'); ed.id = 'asEd'; ed.innerHTML = '<div class="as-er"><span class="as-mut">' + (info.o.d ? 'Отправлено ' + esc(info.o.d) + NB + 'МСК' : '') + '</span><span class="as-pts ' + (st === 'wn' ? 'wn' : '') + '">' + lab + '</span></div><div class="as-card"></div>';
    fm.insertBefore(ed, fm.firstChild); var cd = $('.as-card', ed);
    if (lvs.length) { cd.insertAdjacentHTML('beforeend', '<span class="as-lb">Уровень</span><div class="as-rad" role="radiogroup" aria-label="Уровень">' + lvs.map(function (x, i) { return '<button type="button" role="radio" data-i="' + i + '">' + LVN[x.lv] + ' · ' + LVB[x.lv] + '</button>' }).join('') + '</div>') }
    if (taW) { cd.insertAdjacentHTML('beforeend', '<span class="as-lb">Твой ответ</span>'); cd.appendChild(taW); ta.setAttribute('placeholder', 'Твой ответ'); ta.setAttribute('aria-label', 'Твой ответ') }
    cd.insertAdjacentHTML('beforeend', '<span class="as-lb" id="asFn"></span><div class="as-fg">' + fTiles(fm, true).join('') + '</div>'); if (q) $('.as-fg', cd).appendChild(q);
    if (up) { var uw = document.createElement('div'); uw.className = 'as-upw'; cd.appendChild(uw); uw.appendChild(up); [].slice.call(up.childNodes).forEach(function (n) { if (n.nodeType === 3) n.remove() });
      up.insertAdjacentHTML('afterbegin', '<i class="as-ui">' + svg(I.up, 20, 2) + '</i><span><b>Прикрепить файлы</b><small>JPG, PNG, PSD, ZIP · файлы до' + NB + '100' + NB + 'МБ</small></span>') }
    if (sb) { cd.appendChild(sb); sb.textContent = 'Сохранить изменения' }
    cd.insertAdjacentHTML('beforeend', '<button type="button" class="as-b2" data-k="cancel">Отмена</button>' + (SUB ? '<div class="as-state">' + svg(I.al, 16, 2) + 'В' + NB + 'режиме просмотра отправка выключена</div>' : ''));
    ED.init = edSnap(fm); box.classList.add('as-r');
    ed.addEventListener('click', function (e) { var t = e.target, ft = t.closest('.as-ft'), b;
      if ((b = t.closest('.as-rad button'))) { var i = +b.getAttribute('data-i'); lvs.forEach(function (x, j) { x.el.checked = j === i }); var er = $('.as-rad + .as-erm', ed); if (er) er.remove(); edSync(fm); return }
      if (t.closest('[data-k=cancel]')) { edLeave(); return }
      if (ft && t.closest('.fx')) { $$('.fq', ed).forEach(function (x) { x.remove() }); $('.fi', ft).insertAdjacentHTML('beforeend', '<span class="fq" role="group" aria-label="Удалить файл?"><button type="button" class="d">Удалить</button><button type="button" class="k2">Оставить</button></span>'); return }
      if (ft && t.closest('.fq .k2')) { $('.fq', ft).remove(); return }
      if (ft && t.closest('.fq .d')) { var bx = $$('.answer-file-box', fm)[+ft.getAttribute('data-i')], cb = bx && $('input[type=checkbox]', bx); if (!cb) return; cb.checked = true; ft.classList.add('as-gone'); $('.fq', ft).remove(); edSync(fm);
        var dt = document.getElementById('asDt'); if (dt) dt.remove(); dt = document.createElement('div'); dt.id = 'asDt'; dt.setAttribute('role', 'status'); dt.innerHTML = '<span>Файл удалён</span><button type="button">Вернуть</button>'; document.body.appendChild(dt);
        dt.querySelector('button').onclick = function () { cb.checked = false; ft.classList.remove('as-gone'); dt.remove(); edSync(fm) }; clearTimeout(ED.dt); ED.dt = setTimeout(function () { dt.remove() }, 5000) } });
    edSync(fm) };
  var edSync = function (fm) { var ed = $('#asEd'); if (!ed) return; var lvs = edLvs(fm);
    $$('.as-rad button', ed).forEach(function (b, i) { var on = !!(lvs[i] && lvs[i].el.checked); b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false') });
    $$('.uploadifive-queue-item', ed).forEach(function (it) { it.classList.add('as-ft'); if (!it.getAttribute('data-as')) { it.setAttribute('data-as', 1); var nm = txt($('.filename', it)), ext = ((nm.match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toUpperCase(), pr = $('.progress', it);
        var pv = ED.pv && ED.pv[nm]; it.insertAdjacentHTML('afterbegin', '<span class="fi">' + (pv ? '<img src="' + esc(pv) + '" alt="">' : svg(I.file, 26, 1.8) + esc(ext || 'ФАЙЛ')) + '</span>'); if (pr) $('.fi', it).appendChild(pr); it.insertAdjacentHTML('beforeend', '<em></em>') }
      var inf = txt($('.fileinfo', it)), pc = (inf.match(/(\d+)\s*%/) || [])[1], em = $('em', it), et = it.classList.contains('error') ? 'ошибка загрузки' : it.classList.contains('complete') || /complet|заверш|100\s*%/i.test(inf) ? 'загружен' : pc ? 'загрузка ' + pc + '%' : 'загрузка…'; if (em && em.textContent !== et) em.textContent = et });
    var n = $$('.as-fg > .as-ft:not(.as-gone)', ed).length + $$('.as-fg .uploadifive-queue-item:not(.error)', ed).length, fn = $('#asFn', ed), ft = n ? 'Файлы · ' + n : 'Файлы'; if (fn && fn.textContent !== ft) fn.textContent = ft };
  var edBusy = function () { return $$('#asEd .uploadifive-queue-item').some(function (it) { return !it.classList.contains('complete') && !it.classList.contains('error') && !/complet|заверш|100\s*%/i.test(txt($('.fileinfo', it))) }) };
  /* «Сохранить изменения»: уровень обязателен; идёт загрузка — ждём её и сохраняем сразу после (L11a п.4) */
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('#asEd button[name=send-answer], #asEd .btn-send-answer'); if (!b || SUB) return; var fm = b.closest('form'), ed = $('#asEd'), lvs = edLvs(fm);
    if (lvs.length && !lvs.some(function (x) { return x.el.checked })) { e.preventDefault(); e.stopImmediatePropagation(); var rd = $('.as-rad', ed); if (rd && !$('.as-rad + .as-erm', ed)) rd.insertAdjacentHTML('afterend', '<span class="as-erm">Выбери уровень, на' + NB + 'котором сделал(а) работу</span>'); if (rd) rd.scrollIntoView({ block: 'center', behavior: 'smooth' }); return }
    if (edBusy()) { e.preventDefault(); e.stopImmediatePropagation(); if (ED.wait) return; ED.wait = 1; b.textContent = 'Загружаем файл…'; var iv = setInterval(function () { if (edBusy()) return; clearInterval(iv); ED.wait = 0; b.textContent = 'Сохранить изменения'; b.click() }, 300); return }
    var i = edInfo(); ss('asEdS', JSON.stringify({ a: i.aid, t: Date.now() })); guard.ok = 1 }, true);
  /* файл больше 100 МБ — ошибка под зоной «Прикрепить файлы», файл не добавляется */
  document.addEventListener('change', function (e) { var i = e.target; if (!i || i.type !== 'file' || !i.closest('#asEd')) return; var big = [].filter.call(i.files || [], function (f) { return f.size > 100 * 1048576 }), uw = i.closest('.as-upw'), er = uw && $('.as-erm', uw);
    if (er) er.remove(); if (!big.length) { ED.pv = ED.pv || {}; [].forEach.call(i.files || [], function (f) { if (/^image\//.test(f.type) && window.URL && URL.createObjectURL) try { ED.pv[f.name] = URL.createObjectURL(f) } catch (x) {} }); return } e.stopImmediatePropagation(); e.stopPropagation(); try { i.value = '' } catch (x) {}
    if (uw) uw.insertAdjacentHTML('beforeend', '<span class="as-erm">«' + esc(big[0].name) + '» больше 100' + NB + 'МБ' + NB + '— такой файл не' + NB + 'добавить</span>') }, true);
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest || e.target.closest('.as-ft')) return; $$('#asEd .fq').forEach(function (x) { x.remove() }) }, true);

  /* ---------- анкета (L3c, L10–L10e): шкала 1–10 сеткой, почта строкой, счётчик, одна кнопка, ошибки под вопросом, итог ---------- */
  var svPts = function () { return $('.fl-chips .fl-chip.l') ? 30 : 15 };
  var svFields = function () { var a = $$('.lt-form-survey .part-surveyFields .field'); return a.length ? a : $$('.lt-form-survey .field.custom-field') };
  var svAns = function (f) { return $$('input, textarea:not(.as-ta)', f).some(function (i) { return (i.type === 'radio' || i.type === 'checkbox') ? i.checked : i.type !== 'hidden' && !!i.value.trim() }) };
  var svCount = function () { var F = svFields(); return { all: F.length, n: F.filter(svAns).length } };
  var svSaved = function () { return !!$('.fl-svd') || /спасибо|сохран|отправлен|принят|получен/i.test(txt($('.lt-form-survey .form-result-block'))) };
  var svIsDone = function () { return !!$('.fl-mis.fl-own') };
  var svMail = function () { return $('.lt-form-survey input[name="formParams[email]"]') };
  var svErm = function (f) { var ib = $('.field-input-block', f); return ib && ib.classList.contains('as-scale') ? 'Выбери оценку' + NB + '— без' + NB + 'неё анкету не' + NB + 'засчитать' : ib && ib.classList.contains('as-rows') ? 'Выбери ответ' + NB + '— без' + NB + 'него анкету не' + NB + 'засчитать' : 'Напиши ответ' + NB + '— без' + NB + 'него анкету не' + NB + 'засчитать' };
  /* почта (L10e, вариант А): заполнена — поле GetCourse скрыто, вместо него строка «Отправишь как…»; пусто — поле первой карточкой */
  var svTop = function () { var sf = $('.lt-form-survey .part-surveyFields') || $('.lt-form-survey .fields'); if (!sf) return; var top = document.getElementById('asSvTop');
    if (!top) { top = document.createElement('div'); top.id = 'asSvTop'; sf.parentNode.insertBefore(top, sf) }
    var m = svMail(), uf = m && m.closest('.part-userField'), em = m ? m.value.trim() : '', has = /\S+@\S+/.test(em) && !(uf && uf.classList.contains('as-ufc'));
    if (uf) { uf.classList.toggle('as-hid', has); if (!has && !uf.classList.contains('as-ufc')) { uf.classList.add('as-ufc'); var lb = $('.field-label', uf); if (lb) lb.innerHTML = 'Твоя почта <b>*</b>'; m.setAttribute('type', 'email'); m.setAttribute('inputmode', 'email'); m.setAttribute('autocomplete', 'email'); m.setAttribute('placeholder', 'name@mail.ru');
        m.addEventListener('input', function () { if (/\S+@\S+\.\S+/.test(m.value)) { uf.classList.remove('as-err'); var e = $('.as-erm', uf); if (e) e.remove(); navBar('sv') } }) } }
    var c = svCount(), pc = c.all ? Math.round(c.n / c.all * 100) : 0;
    var html = (has ? '<div class="as-mail">' + svg(I.mail, 18, 1.9) + '<span>Отправишь как' + NB + '<b>' + esc(em) + '</b></span></div>' : '') + (SUB ? '<div class="as-state">' + svg(I.al, 16, 2) + 'В' + NB + 'режиме просмотра отправка выключена</div>' : '')
      + (!SUB && c.all ? '<div class="as-prg"><i><b style="width:' + pc + '%"></b></i><span>' + c.n + NB + 'из' + NB + c.all + '</span></div>' : '');
    if (top.getAttribute('data-h') !== html) { top.setAttribute('data-h', html); top.innerHTML = html } };
  var svSyncTa = function () { $$('.lt-form-survey textarea.as-ta').forEach(function (t) { var i = t.parentNode.querySelector('input.as-hid'); if (i && document.activeElement !== t && t.value !== i.value) t.value = i.value }) };
  var svUpd = function () { svTop(); navBar('sv'); if (R.classList.contains('as-kb')) dNote(dSave.t) };
  var svForm = function () { $$('.lt-form-survey .field').forEach(function (f) { var ib = $('.field-input-block', f); if (!ib || ib.getAttribute('data-as')) return; ib.setAttribute('data-as', 1); var ls = $$(':scope > label', ib);
      var clr = function () { var w = f.closest('.field-wrapper'); if (w) w.classList.remove('as-err'); var e = $('.as-erm', f); if (e) e.remove(); svUpd() };
      var fl = $('.field-label', f); if (fl && fl.hasAttribute('for')) fl.removeAttribute('for'); /* подпись вопроса — не кнопка: нажатие по ней ничего не делает (а зона 20 px) */
      if (!ls.length) { /* текстовый вопрос GetCourse — однострочное поле; показываем многострочное (макет L10a), значение пишем в поле GetCourse */
        var inp = $('input[type=text], input:not([type])', ib); if (inp && !$('textarea', ib)) { var tx = document.createElement('textarea'); tx.className = 'as-ta'; tx.rows = 2; tx.value = inp.value; tx.setAttribute('placeholder', 'Твой ответ'); tx.setAttribute('aria-label', txt($('.label-value', f)) || 'Ответ'); inp.classList.add('as-hid'); inp.setAttribute('tabindex', '-1'); inp.setAttribute('aria-hidden', 'true'); inp.parentNode.insertBefore(tx, inp.nextSibling);
          tx.addEventListener('input', function () { inp.value = tx.value; try { inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })) } catch (e) {} }) }
        ib.addEventListener('input', function () { if (svAns(f)) clr(); else svUpd() }); return }
      var radio = ls.every(function (l) { var i = $('input', l); return i && i.type === 'radio' }), nums = radio && ls.every(function (l) { return /^\s*\d{1,2}\b/.test(l.textContent) });
      if (nums) { var cap = []; ib.classList.add('as-scale'); ls.forEach(function (l) { var tn = [].filter.call(l.childNodes, function (n) { return n.nodeType === 3 && n.nodeValue.trim() })[0]; if (!tn) return; var m = tn.nodeValue.match(/^\s*(\d{1,2})\s*[-–—]?\s*(.*)$/); if (!m) return; if (m[2]) cap.push(m[1] + NB + '— ' + m[2].trim()); tn.nodeValue = m[1] });
        var d = $('.field-description-block', f); if (cap.length && !(d && txt(d))) ib.insertAdjacentHTML('afterend', '<div class="as-cap"><span>' + esc(cap[0]) + '</span>' + (cap[1] ? '<span>' + esc(cap[cap.length - 1]) + '</span>' : '') + '</div>') }
      else ib.classList.add('as-rows');
      var paint = function () { ls.forEach(function (l) { var i = $('input', l); l.classList.toggle('as-on', !!(i && i.checked)) }); if (svAns(f)) clr(); else svUpd() };
      ib.addEventListener('change', paint); ls.forEach(function (l) { var i = $('input', l); l.classList.toggle('as-on', !!(i && i.checked)) }) }) };
  /* L10b: пустой обязательный вопрос — красная рамка и причина в карточке, экран к нему, над кнопкой «Остался N вопрос»; ответы не стираются */
  var svCheck = function () { var bad = []; cl('as-svt', 1);
    var m = svMail(), uf = m && m.closest('.part-userField.as-ufc'); if (uf) { var okm = /\S+@\S+\.\S+/.test(m.value); uf.classList.toggle('as-err', !okm); var em = $('.as-erm', uf); if (!okm && !em) uf.insertAdjacentHTML('beforeend', '<span class="as-erm">Напиши почту' + NB + '— без' + NB + 'неё анкету не' + NB + 'отправить</span>'); if (okm && em) em.remove(); if (!okm) bad.push(uf) }
    svFields().filter(function (f) { return f.classList.contains('required') }).forEach(function (f) { var ok = svAns(f), w = f.closest('.field-wrapper') || f;
      w.classList.toggle('as-err', !ok); var e = $('.as-erm', f); if (!ok && !e) f.insertAdjacentHTML('beforeend', '<span class="as-erm">' + svErm(f) + '</span>'); if (ok && e) e.remove(); if (!ok) bad.push(w) });
    var g = $('.lt-form-survey .global-confirm-checkbox'); if (g && !g.checked) bad.push(g.closest('.global-confirm-checkbox-block'));
    navBar('sv'); if (bad.length) { /* карточка целиком между шапкой и кнопкой; не влезает (узкий экран) — так, чтобы видна была причина внизу карточки */
      var r = bad[0].getBoundingClientRect(), tb = (bar ? bar.getBoundingClientRect().bottom : 0) + 16, nv = document.getElementById('asNav'), nb = nv ? nv.getBoundingClientRect().top - 8 : innerHeight, dy = r.top - tb; if (r.height > nb - tb) dy = r.bottom - nb; window.scrollBy({ top: dy, behavior: 'smooth' }) } return !bad.length };
  /* «Отправить анкету» — та же кнопка формы GetCourse; второй шаг «Засчитать анкету» нажимаем сами, только после этой отправки */
  var svSend = function () { if (SUB || !svCheck()) return; var b = $('.lt-form-survey .part-button button, .lt-form-survey button.btn'); if (!b) return; ss('asSv', LID + ':1'); b.click() };
  /* второй шаг вручную: GetCourse сохранил ответы, но «Засчитать анкету» не прошёл (L10c п.1) */
  var svCount2 = function () { if (SUB) return; var mw = $('.fl-mis'), sb = mw && $('.btn-send-answer', mw), cb = mw && $('.addfield-type-checkbox input[type=checkbox]', mw); if (!sb) return; if (cb && !cb.checked) cb.checked = true; ss('asSv', LID + ':2'); sb.click() };
  var svStep = function () { var f = ss('asSv'); if (!f || f.indexOf(LID + ':') !== 0) return; var mw = $('.fl-mis'); if (!mw) return;
    if (mw.classList.contains('fl-own')) { ss('asSv', null); return }
    if (f === LID + ':1' && !mw.classList.contains('fl-wt')) { var sb = $('.btn-send-answer', mw), cb = $('.addfield-type-checkbox input[type=checkbox]', mw); if (!sb || SUB) return; if (cb && !cb.checked) cb.checked = true; ss('asSv', LID + ':2'); sb.click();
      /* если GetCourse не засчитал — на месте кнопки остаётся «Засчитать анкету» (L10c п.1) */ setTimeout(function () { if (!$('.fl-mis.fl-own')) { ss('asSv', null); navBar('sv') } }, 8000) } };
  /* L10c: итог вместо формы — и сразу после отправки, и при повторном открытии заполненной анкеты */
  var svDone = function () { var on = svIsDone(), d = document.getElementById('asSvDone'), fm = $('.fl-main'); cl('as-svok', on && !!fm); if (!on || !fm) { if (d) d.remove(); return }
    var nx = $('.fl-next'), a = nx && ($('.fl-nb a.fl-btn', nx) || $('.fl-nb a:last-child', nx)), lab = nx ? txt($('.t span', nx)) : '', nm = nx ? txt($('.t b', nx)) : '', isL = /^Следующий урок/i.test(lab);
    var mn = (nm.match(/Модуль\s*(\d+)/i) || [])[1] || modN(), pts = svPts();
    var b1 = !a ? '' : isL ? 'К' + NB + 'следующему уроку' : /модул/i.test(lab) ? 'К' + NB + 'следующему модулю' : /част/i.test(lab) ? 'К' + NB + 'следующей части' : '';
    var html = '<div class="as-card as-dc ok"><span class="as-okc">' + svg(I.ok, 34, 2.6) + '</span><span class="h">Анкета засчитана</span><b class="as-big">+' + pts + ' <small>баллов' + (pts > 15 ? ' · ×2' : '') + '</small></b><span class="s">Спасибо! Ответы читает команда курса. Баллы уже в' + NB + 'рейтинге.</span></div>'
      + (b1 ? '<a class="as-nx" href="' + esc(a.getAttribute('href')) + '">' + (mn ? '<img src="' + GH + 'sq/m' + ('0' + mn).slice(-2) + '.jpg?v=29" alt="">' : '') + '<span><small>' + (isL ? 'Следующий урок' : esc(lab.replace(/^Дальше\s*·\s*/, '').replace(/^./, function (c) { return c.toUpperCase() }))) + '</small><b>' + esc(nm) + '</b></span></a>'
        + '<a class="as-b1" href="' + esc(a.getAttribute('href')) + '">' + b1 + svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 18, 2.2) + '</a>' : '')
      + '<button type="button" class="' + (b1 ? 'as-b2' : 'as-b1') + '" data-go="mod">К' + NB + 'модулю</button>';
    if (!d) { d = document.createElement('section'); d.id = 'asSvDone'; d.className = 'as-ctr'; d.setAttribute('aria-label', 'Анкета засчитана'); fm.insertBefore(d, fm.firstChild);
      d.addEventListener('click', function (e) { if (e.target.closest('[data-go=mod]')) { e.preventDefault(); back() } else if (e.target.closest('a')) load() }) }
    if (d.getAttribute('data-h') !== html) { d.setAttribute('data-h', html); d.innerHTML = html; $$('img', d).forEach(function (im) { im.onerror = function () { im.remove() } }) } };
  var toast = function (h, before, ms) { var t = document.getElementById('asTo'); if (!t) { t = document.createElement('div'); t.id = 'asTo'; var hd = before || $('.fl-hd'); if (!hd) return; if (before) hd.parentNode.insertBefore(t, hd); else hd.insertAdjacentElement('afterend', t) } t.innerHTML = '<i>' + svg(I.ok, 16, 2.6) + '</i><span>' + h + '</span>';
    if (ms) setTimeout(function () { t.classList.add('as-fade'); setTimeout(function () { t.remove() }, 450) }, ms); return t };

  /* ---------- вход один раз (L6) ---------- */
  var login = function () { var fm = $('form.xdget-loginUserForm'); if (!fm || document.getElementById('asLg')) return !!fm; var ru = new URLSearchParams(location.search).get('returnUrl') || '';
    var toL = /lesson\/view/.test(ru), d = document.createElement('div'); d.id = 'asLg';
    d.innerHTML = '<span class="k">' + svg(I.key, 28, 1.9) + '</span><h1>Войди в' + NB + 'кабинет один' + NB + 'раз</h1><p>Это окно Telegram ещё не' + NB + 'знает твой вход. Войди той' + NB + 'же почтой, что и' + NB + 'при покупке курса,' + NB + '— и' + NB + 'сразу откроется ' + (toL ? 'урок' : 'кабинет') + '. Дальше Telegram запомнит вход.</p><div class="tgs"></div><span class="or">или' + NB + 'по' + NB + 'почте</span>';
    fm.parentNode.insertBefore(d, fm); return true };
  var tgLogin = function () { var s = $('#asLg .tgs'); if (!s || s.children.length) return; var w = $('.xdget-telegramLogin, [class*="telegram-login"], [class*="telegramLogin"], [id^="telegram-login"], iframe[src*="oauth.telegram.org"], script[src*="telegram-widget"]');
    if (!w || $('#asLg').contains(w)) return; var box = w.tagName === 'IFRAME' || w.tagName === 'SCRIPT' ? w.parentNode : w; if (box && box !== document.body && !box.contains($('#asLg'))) s.appendChild(box) };

  /* ---------- сборка ---------- */
  var sync = function () { if (!document.body) return; subUI(); subOff();
    if (isLog) { setBar('Вход', 'OduvanovSchool'); var b = bar.querySelector('.l'); if (history.length <= 1) b.style.visibility = 'hidden'; if (login()) tgLogin(); return }
    if (isEd) { edUI(); kbUI(); return }
    if (!isLes || !$('.fl')) return; var k = kind(); cl('as-sv', k === 'sv'); cl('as-hw', k === 'hw'); cl('as-l1', k === 'ls');
    var p = pos(), mn = modN(); if (l12On()) setBar('Моя работа', 'Домашнее задание' + (mn ? ' · Модуль ' + mn : '')); else setBar(k === 'sv' ? 'Анкета' : k === 'hw' ? 'Домашнее задание' : p ? 'Урок ' + p[0] + NB + 'из' + NB + p[1] : 'Урок', k === 'sv' && mn ? 'Модуль ' + mn + ' · ' + partT() : partT());
    hr(k); about(); mats(); nextCard(); levels(); own(); hwForm(); ownStore(); l12(); ownView(); navBar(k); if (k === 'sv') { svForm(); svSyncTa(); svTop(); svStep(); svDone() } dLoad(); kbUI() };
  var t0 = 0, later = function () { if (t0) return; t0 = setTimeout(function () { t0 = 0; try { sync() } catch (e) {} }, 150) };
  var go = function () { try { sync() } catch (e) {} new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); var n = 0, iv = setInterval(function () { later(); if (++n > 40) clearInterval(iv) }, 400) };
  if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  var fs = function () { cl('as-fs', !!(document.fullscreenElement || document.webkitFullscreenElement)) }; document.addEventListener('fullscreenchange', fs); document.addEventListener('webkitfullscreenchange', fs);
})();
