/* OduvanovSchool · payskin.js — «Продление и оплата в приложении» (макет 4в, P3–P8, утверждён 28.10.2026).
   Грузится из eco.js так же, как appskin.js: только в режиме Telegram (html.eco-tg) и только на ширине ≤767, файл gc/payskin-<PAYSKIN>.js.
   Где работает:
   · страницы-формы /prodlenie-2-0, /prodlenie-sprint, /prodlenie-praktikum, /povyshenie-premium-amazon:
       с ?ecoBuy=<оффер> (ученик уже нажал «Оплатить N ₽» в приложении) — экран P3 «Оформляем заказ…», выбираем radio .form-position-offer-<оффер> и нажимаем кнопку отправки формы;
       без ecoBuy — та же форма в коже приложения (как P1/P2): карточки сроков, «Оплатить N ₽».
   · страницы заказа и оплаты GetCourse (/sales/shop/…, /pl/sales/…, dealPay, payment): узнали — P3 (заказ) или P4 (способ оплаты) поверх страницы, кнопки нажимают кнопки GetCourse;
       не узнали — страницу не трогаем, только шапка приложения «Отменить · Оплата · защищённое соединение» (P5); итог по тексту страницы — P6/P6a, P7, P8.
   Формы GetCourse остаются формами GetCourse: почта и имя — их скрытые поля, мы ничего не вводим за ученика и не создаём заказ без его нажатия. */
(function () {
  if (window.top !== window || window.__payskin) return;
  var R = document.documentElement;
  if (!R.classList.contains('eco-tg') || innerWidth > 767) return;
  var P = location.pathname, Q = location.search;
  var FORMP = { '/prodlenie-2-0': 'c', '/prodlenie-sprint': 'sprint', '/prodlenie-praktikum': 'prak', '/povyshenie-premium-amazon': 'amz' };
  var isForm = !!FORMP[P.replace(/\/+$/, '')], isPay = !isForm && /\/sales\/shop\/|\/pl\/sales\/|dealpay|\/payment|\/cms\/system\/order/i.test(P);
  if (!isForm && !isPay) return;
  window.__payskin = 1;
  var APP = 'https://romanoduvanov.github.io/otzyvy/gc/app.html', GH = 'https://romanoduvanov.github.io/otzyvy/gc/', CARE = 'https://t.me/zabota_oduvanov', NB = ' ';
  /* офферы — как на страницах сайта (бриф 28.10): оффер → [страница, мес (0 — сразу), цена] */
  var OFF = { 8846950: ['c', 1, 4990], 8846951: ['c', 3, 12990], 8846952: ['c', 6, 19990], 8846954: ['sprint', 1, 1490], 8846956: ['sprint', 3, 2990], 8846958: ['sprint', 6, 4990],
    8846961: ['prak', 1, 990], 8846963: ['prak', 3, 1990], 8846965: ['amz', 0, 39900], 8846966: ['amz', 24, 47900] };
  var NM = { c: 'AI-креатор 2.0', sprint: 'Спринт', prak: 'Практикум', amz: 'Премиум Амазон' }, PATH = { c: '/prodlenie-2-0', sprint: '/prodlenie-sprint', prak: '/prodlenie-praktikum', amz: '/povyshenie-premium-amazon' };
  var $ = function (s, r) { return (r || document).querySelector(s) }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)) };
  var txt = function (e) { return e ? e.textContent.replace(/\s+/g, ' ').trim() : '' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
  var pl = function (n, a, b, c) { n = Math.abs(n | 0) % 100; var k = n % 10; return n > 10 && n < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c };
  var ss = function (k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v) } catch (e) {} return null };
  var n0 = function (n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, NB) };
  var rub = function (n) { return n0(n) + '&nbsp;₽' }, monL = function (m) { return m + '&nbsp;' + pl(m, 'месяц', 'месяца', 'месяцев') };
  var svg = function (d, s, w) { return '<svg aria-hidden="true" width="' + (s || 18) + '" height="' + (s || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>' };
  var I = { back: '<path d="m15 6-6 6 6 6"/>', home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>', arr: '<path d="M5 12h14M13 6l6 6-6 6"/>', ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7.5l8 6 8-6"/>', cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.5"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    card: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h4"/>', sbp: '<path d="M13 3L5 13.5h6L10 21l9-11h-6z"/>', parts: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 6.4"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18"/>' };
  var TG = function () { return window.Telegram && window.Telegram.WebApp || null };
  var hap = function () { try { TG().HapticFeedback.selectionChanged() } catch (e) {} };
  /* контекст покупки (что выбрано в приложении): нужен на страницах заказа и итога, где GetCourse не пишет срок и курс */
  var CTX = null; try { CTX = JSON.parse(ss('psCtx') || 'null') } catch (e) {} if (CTX && Date.now() - (CTX.at || 0) > 6 * 3600e3) CTX = null;
  var saveCtx = function (o) { CTX = o; o.at = Date.now(); ss('psCtx', JSON.stringify(o)) };

  /* ---------- стили: токены макета (#000106, карточки #161616, Inter Tight) ---------- */
  var SB = 'max(env(safe-area-inset-bottom), calc(var(--tg-safe-area-inset-bottom,0px) + var(--tg-content-safe-area-inset-bottom,0px)))';
  var TOP = 'var(--tg-top, max(calc(var(--tg-safe-area-inset-top,0px) + var(--tg-content-safe-area-inset-top,0px)), var(--eco-sat,0px)))';
  var css = ''
    + ':root.ps-on{--ps-top:' + TOP + ';--ps-sb:' + SB + ';--ps-tb:var(--eco-tb, max(84px, calc(50px + var(--ps-sb))));--ps-s1:#161616;--ps-s2:#1f1f1f;--ps-ink2:rgba(255,255,255,.58);--ps-ink3:rgba(255,255,255,.44);--ps-hair:rgba(255,255,255,.08);--ps-lil:#c38bff;--ps-F:"Inter Tight",Inter,system-ui,sans-serif}'
    + ':root.ps-on body .top-menu,:root.ps-on body .main-menu,:root.ps-on .eco-tgw,:root.ps-on .eco-tgf,:root.ps-on .talks-widget-button,:root.ps-on .help-widget-button,:root.ps-on #gc-left-menu-mobile-badge-host,:root.ps-on .gc-account-leftbar{display:none!important}'
    /* экран кожи вместо страницы: страница GetCourse остаётся в документе (формы и кнопки работают), но не видна и не занимает места; прокручивается сам документ */
    + ':root.ps-ov body{margin:0!important;padding:0!important;background:#000106!important;min-height:100vh}:root.ps-ov body>*:not(#psRoot):not(#psBar):not(#psNav):not(#psSh):not(#ecoTabs):not(#ecoLd):not(#ecoLc){visibility:hidden!important;height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;border:0!important}'
    + ':root.ps-notabs #ecoTabs{display:none!important}'
    + ':root.ps-on #psNav:has(.psok){display:flex!important;flex-direction:column;align-items:stretch;gap:8px}:root.ps-on .psok{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 6px;font-size:13px;line-height:1.35;color:rgba(255,255,255,.72);cursor:pointer}:root.ps-on .psok input{flex:none;width:22px;height:22px;margin:0;-webkit-appearance:none;appearance:none;border-radius:7px;background:#1f1f1f;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.28);display:grid;place-items:center;cursor:pointer}:root.ps-on .psok input:checked{background:#c38bff;box-shadow:none}:root.ps-on .psok input:checked::after{content:"";width:6px;height:11px;margin-top:-2px;border:solid #1a0730;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}:root.ps-on .psok input:focus-visible{outline:2px solid #e2c9ff;outline-offset:2px}:root.ps-on .psok a{color:#e2c9ff;text-decoration:underline}:root.ps-on .psok.err{color:#ff9b9b}:root.ps-on .psok.err input{outline:2px solid #ff6b6b;outline-offset:2px}'
    + ':root.ps-sec body .gc-main-content{padding-top:calc(var(--ps-top) + 46px)!important}:root.ps-sec.ps-pad body{padding-top:calc(var(--ps-top) + 46px)!important}:root.ps-sec body{background:#000106!important}'
    + '#psBar{position:fixed;left:0;right:0;top:0;z-index:99985;height:calc(var(--ps-top) + 46px);padding:var(--ps-top) 4px 0;box-sizing:border-box;display:flex;align-items:center;background:#000106;border-bottom:1px solid rgba(255,255,255,.05);font-family:var(--ps-F);color:#fff}'
    + '#psBar button{all:unset;box-sizing:border-box;cursor:pointer;height:44px;display:flex;align-items:center;-webkit-tap-highlight-color:transparent}'
    + '#psBar .l{width:96px;gap:2px;padding-left:6px;color:var(--ps-lil);font-size:15px}#psBar .r{width:96px;justify-content:flex-end;padding-right:10px;color:var(--ps-lil)}#psBar .r[hidden],#psBar .l[hidden]{visibility:hidden}'
    + '#psBar .t{flex:1;min-width:0;text-align:center;display:flex;flex-direction:column;line-height:1.15}#psBar .t b{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#psBar .t small{font-size:11px;color:var(--ps-ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '#psBar .t small svg{display:inline-block;vertical-align:-1px;color:#4ade80;margin-right:3px}'
    + '#psRoot{position:relative;z-index:99970;min-height:100vh;background:radial-gradient(90% 26% at 50% 0%,rgba(96,0,255,.16),transparent 70%),#000106;color:#fff;font:400 14px/1.4 var(--ps-F);font-feature-settings:"tnum";text-align:left;letter-spacing:0}'
    + '#psRoot *{box-sizing:border-box}#psRoot button{font:inherit;color:inherit;border:0;background:none;cursor:pointer;margin:0;-webkit-tap-highlight-color:transparent}'
    + '#psRoot .pw{max-width:560px;margin:0 auto;min-height:100vh;padding:calc(var(--ps-top) + 46px + 14px) 16px calc(var(--ps-tb) + 24px);display:flex;flex-direction:column;gap:12px}'
    + '#psRoot .pw.nav{padding-bottom:calc(var(--ps-tb) + 36px + var(--ps-navh, 62px) + 24px)}#psRoot .pw.mid{justify-content:center}#psRoot .pw.g14{gap:14px}'
    + '#psRoot b{font-weight:600}#psRoot .mut{color:var(--ps-ink2);font-size:13px}#psRoot .mut3{color:var(--ps-ink3);font-size:12px}'
    + '#psRoot .card{border-radius:24px;background:var(--ps-s1);border:1px solid rgba(255,255,255,.07);padding:16px;display:flex;flex-direction:column;gap:10px}'
    + '#psRoot .cap2{font:700 10.5px/1 var(--ps-F);letter-spacing:.12em;text-transform:uppercase;color:var(--ps-lil)}'
    + '#psRoot .row{display:flex;align-items:center;gap:10px}'
    + '#psRoot .btn{display:flex;align-items:center;justify-content:center;gap:8px;height:50px;border-radius:15px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;font-weight:600;font-size:15px;width:100%;box-shadow:0 0 0 1px rgba(255,255,255,.6) inset,0 14px 36px -14px rgba(252,203,255,.45);white-space:nowrap;text-decoration:none}'
    + '#psRoot .btn2{display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:14px;background:var(--ps-s2);border:1px solid rgba(255,255,255,.09);color:#fff;font-weight:500;font-size:14px;width:100%;white-space:nowrap;text-decoration:none}'
    + '#psRoot .busy{position:relative;pointer-events:none;opacity:.85}#psRoot .busy::after{content:"";position:absolute;right:14px;top:50%;width:16px;height:16px;margin-top:-8px;border-radius:99px;border:2px solid rgba(96,35,100,.25);border-top-color:#602364;animation:psSp .8s linear infinite}'
    + '@keyframes psSp{to{transform:rotate(360deg)}}#psRoot .spn{width:20px;height:20px;border-radius:99px;border:2.5px solid rgba(195,139,255,.25);border-top-color:#c38bff;animation:psSp .8s linear infinite;flex:none}'
    + '#psRoot .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}#psRoot .steps span{display:flex;flex-direction:column;gap:5px;font-size:10.5px;color:var(--ps-ink3);line-height:1.2}#psRoot .steps span::before{content:"";height:4px;border-radius:9px;background:rgba(255,255,255,.12)}'
    + '#psRoot .steps span.ok{color:rgba(255,255,255,.7)}#psRoot .steps span.ok::before{background:#4ade80}#psRoot .steps span.on{color:#fff;font-weight:600}#psRoot .steps span.on::before{background:#d77fff}'
    + '#psRoot .cvs{width:48px;height:48px;border-radius:12px;object-fit:cover;flex:none;display:block;box-shadow:0 0 0 1px rgba(255,255,255,.08)}'
    + '#psRoot .bill{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:14px;color:rgba(255,255,255,.85);min-height:24px}#psRoot .bill span:last-child{white-space:nowrap}'
    + '#psRoot .bill.tot{border-top:1px solid rgba(255,255,255,.08);padding-top:10px;margin-top:2px;font-size:16px;color:#fff;font-weight:600}'
    + '#psRoot .mailr{display:flex;align-items:center;gap:10px;min-height:44px;padding:8px 12px;border-radius:16px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);font-size:13px;color:var(--ps-ink2)}'
    + '#psRoot .mailr svg{flex:none;color:var(--ps-lil)}#psRoot .mailr span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#psRoot .mailr b{color:#fff;font-weight:500}'
    + '#psRoot .po{display:flex;align-items:center;gap:12px;min-height:64px;padding:10px 14px;border-radius:20px;background:var(--ps-s1);border:1px solid var(--ps-hair);position:relative;width:100%;text-align:left;color:#fff}'
    + '#psRoot .po::before{content:"";width:22px;height:22px;border-radius:99px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35);flex:none}#psRoot .po.on{border-color:rgba(195,139,255,.6);background:linear-gradient(160deg,rgba(103,36,173,.3),var(--ps-s1) 65%)}#psRoot .po.on::before{box-shadow:inset 0 0 0 6px #c38bff}'
    + '#psRoot .po+.po{margin-top:-4px}#psRoot .po .pt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}#psRoot .po .pt b{font-size:15px;font-weight:500;line-height:1.25}#psRoot .po .pt small{font-size:12px;color:var(--ps-ink3);line-height:1.3}'
    + '#psRoot .po .pr{font-size:17px;font-weight:600;white-space:nowrap;flex:none;text-align:right}#psRoot .po .pr .prt{display:block;margin-top:2px;font-size:12px;font-weight:400;opacity:.45}'
    + '#psRoot .po.mth::before{display:none}#psRoot .po.mth.on{box-shadow:inset 0 0 0 1px rgba(195,139,255,.6)}#psRoot .po .pi{width:40px;height:40px;border-radius:12px;background:rgba(195,139,255,.16);display:grid;place-items:center;color:#e2c9ff;flex:none}'
    + '#psRoot .po .rd{width:22px;height:22px;border-radius:99px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35);flex:none}#psRoot .po.on .rd{box-shadow:inset 0 0 0 6px #c38bff}'
    + '#psRoot .crs{display:flex;align-items:center;gap:12px}#psRoot .crs .cvs{width:64px;height:64px;border-radius:16px}#psRoot .crs>span:last-child{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}#psRoot .crs b.nm{font-size:20px;font-weight:500;letter-spacing:-.02em;line-height:1.15}'
    + '#psRoot .prem{display:inline-flex;align-items:center;height:20px;padding:1px 9px 0;border-radius:99px;background:linear-gradient(180deg,#fff7ec,#f8c88f);color:#5a2a12;font:700 10px/1 var(--ps-F);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;align-self:center}#psRoot .prem.lg{height:28px;padding:1px 14px 0;font-size:11.5px}'
    + '#psRoot .okc{width:84px;height:84px;border-radius:99px;display:grid;place-items:center;background:rgba(74,222,128,.14);color:#4ade80;box-shadow:inset 0 0 0 1px rgba(74,222,128,.35);align-self:center}'
    + '#psRoot .lsi{width:72px;height:72px;border-radius:22px;background:rgba(255,143,143,.12);color:#ff9f9f;display:grid;place-items:center;align-self:center}'
    + '#psRoot .info{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);font-size:13px;color:rgba(255,255,255,.8)}#psRoot .info svg{flex:none;color:var(--ps-lil)}'
    + '#psRoot .sec{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:var(--ps-ink3);text-align:center}#psRoot .sec svg{color:#4ade80;flex:none}'
    + '#psRoot .flowv{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}#psRoot .flowv li{display:flex;gap:12px;position:relative;padding-bottom:14px;font-size:13.5px;line-height:1.35;color:rgba(255,255,255,.85)}#psRoot .flowv li:last-child{padding-bottom:0}'
    + '#psRoot .flowv li::after{content:"";position:absolute;left:13px;top:30px;bottom:2px;width:2px;border-radius:2px;background:rgba(255,255,255,.1)}#psRoot .flowv li:last-child::after{display:none}'
    + '#psRoot .flowv .ic{width:28px;height:28px;border-radius:99px;display:grid;place-items:center;flex:none;background:rgba(255,255,255,.06);color:rgba(255,255,255,.5);font-size:12px;font-weight:600}#psRoot .flowv .ok .ic{background:rgba(74,222,128,.14);color:#4ade80}#psRoot .flowv .on .ic{background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364}'
    + '#psRoot .flowv b{display:block;font-weight:600;color:#fff;font-size:14px}#psRoot .flowv small{font-size:12px;color:var(--ps-ink3)}'
    + '#psNav{position:fixed;left:12px;right:12px;bottom:calc(var(--ps-tb) + 36px);z-index:99975;max-width:536px;margin:0 auto;display:flex;flex-direction:column;gap:8px;padding:8px;border-radius:22px;background:rgba(22,22,22,.9);-webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 20px 40px -10px rgba(0,0,0,.8);font-family:var(--ps-F)}'
    + '#psNav::before{display:none}#psNav:not(#_){box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 -12px 40px 20px rgba(0,1,6,.9),0 20px 40px -10px rgba(0,0,0,.8)!important}'
    + '#psNav .btn{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:center;height:46px;border-radius:14px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;font:600 13.5px var(--ps-F);width:100%;cursor:pointer;white-space:nowrap;box-shadow:0 0 0 1px rgba(255,255,255,.6) inset;position:relative}'
    + '#psNav .btn.busy{pointer-events:none;opacity:.85}#psNav .sec{display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:rgba(255,255,255,.44);padding:4px 0 2px}#psNav .sec svg{color:#4ade80;flex:none}'
    + '#psSum{display:flex;align-items:center;gap:12px;margin:10px 16px;padding:12px 16px;border-radius:24px;background:#161616;border:1px solid rgba(255,255,255,.07);color:#fff;font:400 14px/1.4 "Inter Tight",Inter,system-ui,sans-serif}#psSum span{flex:1;min-width:0}#psSum b{font-weight:500;display:block}#psSum small{font-size:12px;color:rgba(255,255,255,.44)}#psSum strong{font-size:18px;font-weight:600;white-space:nowrap}'
    + '#psSh{position:fixed;inset:0;z-index:99995;background:rgba(0,1,6,.66);display:flex;align-items:flex-end;justify-content:center;font:400 14px/1.4 "Inter Tight",Inter,system-ui,sans-serif;color:#fff}'
    + '#psSh .sheet{position:relative;width:100%;max-width:560px;border-radius:28px 28px 0 0;background:#111;padding:22px 16px calc(12px + var(--ps-sb,0px));display:flex;flex-direction:column;gap:12px;box-shadow:0 -30px 80px -20px rgba(96,0,255,.6)}'
    + '#psSh h3{margin:0;font-size:22px;font-weight:500;letter-spacing:-.02em;padding-right:48px;line-height:1.2}#psSh p{margin:0;font-size:14px;line-height:1.45;color:rgba(255,255,255,.58)}'
    + '#psSh button{font:inherit;border:0;cursor:pointer;-webkit-tap-highlight-color:transparent}#psSh .x{position:absolute;top:14px;right:14px;width:44px;height:44px;border-radius:13px;background:rgba(255,255,255,.07);color:rgba(255,255,255,.75);display:grid;place-items:center}'
    + '#psSh .btn{display:flex;align-items:center;justify-content:center;height:50px;border-radius:15px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;font-weight:600;font-size:15px;width:100%}'
    + '#psSh .btn2{display:flex;align-items:center;justify-content:center;gap:8px;height:46px;border-radius:14px;background:#1f1f1f;border:1px solid rgba(255,255,255,.09);color:#fff;font-weight:500;font-size:14px;width:100%}';
  function addCss() { if ($('#psCss')) return; var st = document.createElement('style'); st.id = 'psCss'; st.textContent = css; (document.head || R).appendChild(st) }

  /* ---------- общие части ---------- */
  /* «Изменить срок» / «Назад» из заказа — обратно на выбор срока в приложении */
  function backTo(k) { return k === 'amz' ? 'learn/buy/amz' : k === 'c' ? 'learn/renew/c' : k ? 'learn/all/bonus' : 'learn' }
  function goApp(h) { hap(); try { var l = $('#ecoLd'); if (l) l.style.display = 'block' } catch (e) {} location.href = APP + '#' + (h || 'learn') }
  /* Telegram-ссылки (служба заботы): напрямую командой Telegram, как layout.js; не вышло — этим же окном */
  function tgLink(u) { hap(); var data = { path_full: u.replace(/^https?:\/\/(t|telegram)\.me/i, '') };
    try { if (window.TelegramWebviewProxy && window.TelegramWebviewProxy.postEvent) { window.TelegramWebviewProxy.postEvent('web_app_open_tg_link', JSON.stringify(data)); return } } catch (e) {}
    try { if (window.external && 'notify' in window.external) { window.external.notify(JSON.stringify({ eventType: 'web_app_open_tg_link', eventData: data })); return } } catch (e) {}
    try { if (TG() && TG().openTelegramLink) { TG().openTelegramLink(u); return } } catch (e) {}
    location.href = u }
  function care(t) { tgLink(CARE + '?text=' + encodeURIComponent(t)) }
  function bar(o) { var b = $('#psBar'); if (!b) { b = document.createElement('div'); b.id = 'psBar'; document.body.appendChild(b) }
    b.innerHTML = '<button class="l"' + (o.l ? '' : ' hidden') + ' data-ps="bl">' + (o.l === 'Отменить' ? '' : svg(I.back, 20, 2.2)) + esc(o.l || '') + '</button><span class="t"><b>' + o.t + '</b>' + (o.s ? '<small>' + o.s + '</small>' : '') + '</span><button class="r" aria-label="К учёбе"' + (o.home ? '' : ' hidden') + ' data-ps="home">' + svg(I.home, 20, 2) + '</button>';
    b.querySelector('[data-ps=bl]').onclick = function () { hap(); o.back && o.back() }; b.querySelector('[data-ps=home]').onclick = function () { goApp('learn') } }
  function root(h, cls, nav) { var r = $('#psRoot'); if (!r) { r = document.createElement('div'); r.id = 'psRoot'; document.body.appendChild(r) }
    r.innerHTML = '<div class="pw' + (cls ? ' ' + cls : '') + (nav ? ' nav' : '') + '">' + h + '</div>'; R.classList.add('ps-on', 'ps-ov'); try { scrollTo(0, 0) } catch (e) {}
    var n = $('#psNav'); if (n) n.remove(); if (nav) { n = document.createElement('div'); n.id = 'psNav'; n.innerHTML = nav; document.body.appendChild(n);
      /* 28.10 (слияние): запас снизу = настоящая высота плашки с кнопкой (на P4 она выше из-за строки «Платёж принимает банк…» — на 320 последний способ оплаты уходил под неё) */
      var nh = function () { if (n.isConnected) R.style.setProperty('--ps-navh', Math.ceil(n.getBoundingClientRect().height) + 'px') }; nh(); try { new ResizeObserver(nh).observe(n) } catch (e) {} } return r }
  function sheet(o) { var m = document.createElement('div'); m.id = 'psSh'; m.innerHTML = '<div class="sheet" role="dialog"><button class="x" aria-label="Закрыть" data-x="1">' + svg(I.x, 18) + '</button><h3>' + o.t + '</h3><p>' + o.p + '</p>' + (o.b ? '<button class="btn" data-g="1">' + o.b + '</button>' : '') + '<button class="btn2" data-x="1">' + (o.b2 || 'Понятно') + '</button>' + (o.c ? '<button class="btn2" data-c="1">' + svg(I.chat, 18) + 'Служба заботы</button>' : '') + '</div>';
    document.body.appendChild(m); hap(); m.onclick = function (e) { var t = e.target; if (t === m || t.closest('[data-x]')) { m.remove(); return } if (t.closest('[data-g]')) { m.remove(); o.go && o.go() } if (t.closest('[data-c]')) { m.remove(); o.c() } } }
  function mailRow(e) { return '<div class="mailr">' + svg(I.mail, 18, 1.9) + '<span>Чек придёт на&nbsp;<b>' + (e ? esc(e) : 'почту из&nbsp;профиля') + '</b></span></div>' }
  function cover(k, s) { return k === 'amz' ? GH + 'sq/amazon.jpg?v=29' : k === 'c' ? GH + 'sq/m00.jpg?v=29' : GH + 'covers32/p-sprint.jpg' }
  function what(c) { if (!c) return ''; return c.k === 'amz' ? (c.m ? 'Премиум Амазон · рассрочка' : 'Премиум Амазон') : NM[c.k] + (c.m ? ' · ' + monL(c.m) : '') }
  var MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function dFull(s) { var a = String(s || '').split('-'); return a.length === 3 ? +a[2] + '&nbsp;' + MON[+a[1] - 1] + ' ' + a[0] : '' }
  /* сводка заказа (P3): что покупается, новая дата доступа (из приложения — ecoTo), итог */
  function sumCard(c, no, sum) { var k = c.k, amz = k === 'amz';
    return '<div class="card" style="gap:10px"><div class="row" style="justify-content:space-between"><span class="cap2">' + (no ? 'Заказ №' + esc(no) : 'Новый заказ') + '</span></div>'
      + '<div class="row" style="gap:12px"><img class="cvs" src="' + cover(k) + '" alt=""' + (k === 'c' || amz ? '' : ' style="width:90px"') + '><span style="flex:1;min-width:0"><b style="font-weight:500;display:block;font-size:15px">' + (amz ? 'Премиум → Премиум Амазон' : 'Продление доступа · ' + monL(c.m)) + '</b><span class="mut3">' + (amz ? 'повышение тарифа' : NM[k]) + '</span></span></div>'
      + '<div class="bill"><span>' + (amz ? (c.m ? 'В&nbsp;рассрочку, до&nbsp;24&nbsp;месяцев' : 'Одним платежом') : 'Продление на&nbsp;' + monL(c.m)) + '</span><span>' + rub(c.p || sum) + '</span></div>'
      + (c.to && !amz ? '<div class="bill"><span>Новая дата доступа</span><span>' + dFull(c.to) + '</span></div>' : '')
      + '<div class="bill tot"><span>Итого</span><span>' + rub(sum || c.p) + '</span></div></div>' }
  function vis(e) { if (!e) return false; var r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && !e.closest('#psRoot,#psBar,#psNav,#psSh,#ecoTabs') }
  function bodyText() { var t = ''; try { t = (document.body.innerText || document.body.textContent || '') } catch (e) {} return t.replace(/\s+/g, ' ') }
  function num(s) { var m = String(s || '').replace(/ /g, ' ').match(/(\d[\d ]*(?:[.,]\d{1,2})?)\s*(?:₽|руб|р\.|RUB)/i); return m ? Math.round(parseFloat(m[1].replace(/ /g, '').replace(',', '.'))) : 0 }

  /* ---------- P3 «Оформляем заказ…»: ученик нажал «Оплатить» в приложении — выбираем его оффер и отправляем лайт-форму ---------- */
  function readForm() { var f = $('form.lt-form') || $('form.lt-normal-form'); if (!f) { var i = $('input.form-position-input'); f = i && i.form } if (!f) return null;
    var O = $$('input.form-position-input', f).map(function (inp) { var id = +((inp.className.match(/form-position-offer-(\d+)/) || [])[1] || inp.value || 0), lb = inp.closest('label, .form-position') || inp.parentNode;
      return { inp: inp, id: id, title: txt($('.offer-title', lb)), price: num(txt($('.final-price', lb))) || (OFF[id] ? OFF[id][2] : 0), off: OFF[id] || null } });
    var em = $('[name="formParams[email]"]', f), btn = $('.part-button button[type=submit], button[type=submit], input[type=submit]', f);
    return { f: f, O: O, email: em && em.value || '', btn: btn, h1: txt($('.fspay-h1')), sub: txt($('.fspay-sub')), chip: txt($('.fspay-chip')) } }
  function pickOffer(o) { if (!o.inp.checked) o.inp.click(); if (!o.inp.checked) { o.inp.checked = true; try { o.inp.dispatchEvent(new Event('change', { bubbles: true })) } catch (e) {} } }
  /* 28.10: согласие с офертой. GetCourse не примет заказ без галочки «Я согласен с условиями Оферты» (.global-confirm-checkbox). Ставим её только за ученика, который сам согласился: в приложении (&ecoOk=1) или здесь, в строке под сроками */
  var OKC = /[?&]ecoOk=1\b/.test(Q);
  function consent() { var c = document.querySelector('input.global-confirm-checkbox, input[name=globalConfirmCheckbox]'); if (c && !c.checked) { c.click(); if (!c.checked) { c.checked = true; try { c.dispatchEvent(new Event('change', { bubbles: true })) } catch (e) {} } } }
  function submit(F) { consent(); var b = F.btn; if (b) b.click(); else if (F.f.requestSubmit) F.f.requestSubmit(); else F.f.submit() }
  function p3(c, F, err) { var k = c.k, ttl = k === 'amz' ? 'Повышение тарифа' : 'Продление доступа';
    bar({ l: 'Назад', t: 'Заказ', s: (k === 'amz' ? 'Повышение' : 'Продление') + ' · ' + NM[k], home: 1, back: function () { goApp(backTo(k)) } });
    var h = '<div class="steps"><span class="ok">Срок</span><span class="on">Заказ</span><span>Оплата</span></div>';
    if (err) { h += '<span style="flex:1"></span><span class="lsi">' + svg(I.alert, 32) + '</span><b style="font-size:22px;font-weight:500;text-align:center">Не&nbsp;получилось оформить заказ</b><span class="mut" style="font-size:14px;text-align:center;line-height:1.45">' + err + ' Деньги не&nbsp;списаны&nbsp;— попробуй ещё раз.</span>'
        + '<div class="po on" style="pointer-events:none"><span class="pt"><b>' + (k === 'amz' ? (c.m ? 'В&nbsp;рассрочку' : 'Сразу') : monL(c.m)) + '</b><small>выбор сохранён</small></span><span class="pr">' + rub(c.p) + '</span></div>'
        + '<button class="btn" data-ps="re">Повторить</button><button class="btn2" data-ps="care">Служба заботы</button><span style="flex:1"></span>';
      var r = root(h, 'g14'); r.querySelector('[data-ps=re]').onclick = function () { hap(); ss('psSent', null); location.href = PATH[k] + '?ecoBuy=' + c.offer + '&ecoOk=1&tg=1' };
      r.querySelector('[data-ps=care]').onclick = function () { care('Здравствуйте! Не получается оформить заказ: ' + ttl.toLowerCase() + ', ' + what(c).replace(/&nbsp;/g, ' ') + ', ' + n0(c.p) + ' ₽.') }; return }
    h += sumCard(c, '', c.p)
      + mailRow(c.email) + '<div class="btn busy" role="status" aria-live="polite">Оформляем заказ…</div><span class="mut3" style="text-align:center">Создаём заказ в&nbsp;GetCourse. Деньги спишутся только после оплаты на&nbsp;следующем шаге.</span>';
    root(h) }
  function buyFlow(buy) { var n = 0, c0 = OFF[buy], ctx0 = { k: FORMP[P.replace(/\/+$/, '')], offer: buy, m: c0 ? c0[1] : 0, p: c0 ? c0[2] : 0, to: (Q.match(/[?&]ecoTo=(\d{4}-\d\d-\d\d)/) || [])[1] || '' };
    /* адрес без ecoBuy: «Назад» в браузере и обновление страницы не создадут второй заказ */
    try { history.replaceState(history.state, '', location.pathname + location.search.replace(/([?&])ecoBuy=\d+&?/, '$1').replace(/([?&])ecoTo=[\d-]+&?/, '$1').replace(/([?&])ecoOk=1&?/, '$1').replace(/[?&]$/, '') + location.hash) } catch (e) {}
    var nav = null; try { nav = performance.getEntriesByType('navigation')[0] } catch (e) {}
    var sent = String(ss('psSent') || '').split('|'), dup = (nav && nav.type === 'back_forward') || (sent[0] === String(buy) && Date.now() - (+sent[1] || 0) < 30000);
    p3(ctx0);
    (function wait() { var F = readForm(), o = F && F.O.filter(function (x) { return x.id === +buy })[0];
      n++; if (!F || (!o && n < 27)) { if (n < 54) return setTimeout(wait, 150); return p3(ctx0, null, 'Страница оплаты не&nbsp;загрузилась.') }
      if (!o) return p3(ctx0, null, 'Этот вариант оплаты сейчас недоступен.');
      var c = { k: ctx0.k, offer: buy, m: o.off ? o.off[1] : ctx0.m, p: o.price || ctx0.p, title: o.title, email: F.email, to: ctx0.to }; saveCtx(c);
      if (dup) { choose(F, buy); return }
      p3(c); ss('psSent', buy + '|' + Date.now()); pickOffer(o);
      setTimeout(function () { submit(F) }, 150);
      /* заказ не создался за 15 секунд (сеть, ошибка GetCourse) — P9a в коже: выбор сохранён, «Повторить» */
      setTimeout(function () { if (document.visibilityState !== 'hidden' && $('#psRoot .btn.busy')) p3(c, null, navigator.onLine === false ? 'Пропал интернет.' : 'GetCourse не&nbsp;ответил.') }, 15000) })() }
  /* та же форма без ecoBuy (пришли по ссылке с сайта или из бота) — в коже P1/P2 */
  function choose(F, pre) { var k = FORMP[P.replace(/\/+$/, '')], O = F.O.filter(function (o) { return o.id }); if (!O.length) return;
    var sel = 0; O.forEach(function (o, i) { if (pre ? o.id === +pre : (o.off && o.off[1] === 3)) sel = i });
    var lab = function (o) { return k === 'amz' ? (o.off ? (o.off[1] ? 'В&nbsp;рассрочку' : 'Сразу') : esc(o.title)) : o.off ? monL(o.off[1]) : esc(o.title) };
    var sub = function (o) { return k === 'amz' ? (o.off && o.off[1] ? 'до&nbsp;24&nbsp;месяцев, банк на&nbsp;выбор' : 'одним платежом') : o.off && o.off[1] > 1 ? '≈&nbsp;' + rub(Math.round(o.price / o.off[1])) + ' в&nbsp;месяц' : o.off ? rub(o.price) + ' в&nbsp;месяц' : '' };
    var pr = function (o) { return k === 'amz' && o.off && o.off[1] ? 'от&nbsp;2&nbsp;000&nbsp;₽/мес<small class="prt">всего ' + rub(o.price) + '</small>' : rub(o.price) };
    var bl = function () { var o = O[sel]; return k === 'amz' && o.off && o.off[1] ? 'Оформить рассрочку' : 'Оплатить ' + rub(o.price) };
    bar({ l: 'Назад', t: k === 'amz' ? 'Повышение тарифа' : 'Продление доступа', s: k === 'amz' ? 'Премиум → Премиум Амазон' : NM[k], home: 0, back: function () { if (history.length > 1 && /romanoduvanov\.github\.io/.test(document.referrer)) history.back(); else goApp(backTo(k)) } });
    var h = '<div class="crs"><img class="cvs" src="' + cover(k) + '" alt=""><span>' + (k === 'amz' ? '<span class="prem" style="align-self:flex-start">Премиум → Премиум Амазон</span>' : '') + '<b class="nm">' + esc(k === 'amz' ? 'Премиум Амазон' : F.h1 || NM[k]) + '</b>' + (F.sub && k !== 'amz' ? '<span class="mut3">' + esc(F.sub) + '</span>' : '') + '</span></div>'
      + '<span class="cap2" style="margin-top:4px">' + (k === 'amz' ? 'Как&nbsp;удобнее оплатить' : 'На&nbsp;сколько продлить') + '</span>'
      + O.map(function (o, i) { return '<button class="po' + (i === sel ? ' on' : '') + '" data-i="' + i + '" role="radio" aria-checked="' + (i === sel) + '"><span class="pt"><b>' + lab(o) + '</b><small>' + sub(o) + '</small></span><span class="pr">' + pr(o) + '</span></button>' }).join('') + mailRow(F.email);
    var r = root(h, '', '<label class="psok" id="psOkL"><input type="checkbox" id="psOk"><span>Согласен(на) с&nbsp;условиями <a href="/legal">оферты</a></span></label><button class="btn" data-ps="pay">' + bl() + '</button>');
    r.querySelectorAll('.po').forEach(function (b) { b.onclick = function () { hap(); sel = +b.getAttribute('data-i'); r.querySelectorAll('.po').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on) }); $('#psNav .btn').innerHTML = bl() } });
    $('#psNav .btn').onclick = function () { var ok = $('#psOk'); if (ok && !ok.checked) { var L = $('#psOkL'); L.classList.add('err'); setTimeout(function () { L.classList.remove('err') }, 2500); return } var o = O[sel]; this.classList.add('busy'); var c = { k: k, offer: o.id, m: o.off ? o.off[1] : 0, p: o.price, title: o.title, email: F.email }; saveCtx(c); ss('psSent', o.id + '|' + Date.now()); p3(c); pickOffer(o); setTimeout(function () { submit(F) }, 150) } }

  /* ---------- страницы заказа и оплаты GetCourse ---------- */
  var RX = { ok: /(заказ|сч[её]т)\s+(успешно\s+)?оплачен|спасибо за оплату|оплата (успешно )?(прошла|получена|принята|выполнена)|плат[её]ж (успешно )?(прош[её]л|выполнен|принят|получен)/i,
    fail: /оплата не прошла|не удалось (провести |выполнить )?(оплат|плат[её]ж)|ошибка (при )?оплат|ошибка плат[её]жа|плат[её]ж (был )?отклон|отклон[её]н|оплата отклонена|транзакция отклонена/i,
    wait: /заявк[а-яё]* (на )?(рассрочк|кредит)[а-яё]*|рассматрива[а-яё]* заявк|ожида[а-яё]* (подтверждения|ответа|решения) (от )?банка|плат[её]ж (обрабатывается|в обработке)|проверяем оплату/i };
  function payKind(t) { return RX.ok.test(t) ? 'ok' : RX.fail.test(t) ? 'fail' : RX.wait.test(t) ? 'wait' : '' }
  function orderNo(t) { return ((t.match(/заказ[а-яё]*\s*(?:№|#|N)\s*(\d{3,})/i) || [])[1]) || ((location.search.match(/[?&](?:id|deal_id|dealId)=(\d+)/) || [])[1]) || ((P.match(/\/id\/(\d+)/) || [])[1]) || '' }
  function actionEl() { var L = $$('button, a[href], input[type=submit], input[type=button]').filter(vis); var f = function (re) { return L.filter(function (e) { return re.test((e.value || txt(e)).trim()) })[0] };
    return f(/^оплатить(\s|$)/i) || f(/перейти к оплате/i) || f(/^(оплатить|продолжить оплату|к оплате)/i) || null }
  function methods(act) { var rs = $$('input[type=radio]').filter(function (i) { var l = i.closest('label') || (i.id && $('label[for="' + i.id + '"]')); return (vis(i) || vis(l)) && !(act && act.form && i.form && i.form !== act.form) });
    return rs.map(function (i) { var l = i.closest('label') || (i.id && $('label[for="' + i.id + '"]')) || i.parentNode, t = txt(l); return { inp: i, t: t, ic: /сбп|быстрых плат/i.test(t) ? 'sbp' : /рассроч|долями|кредит|частями|сплит/i.test(t) ? 'parts' : 'card' } }).filter(function (m) { return m.t }) }
  function sumOf(t) { var m = t.match(/(итого|к оплате|сумма( к оплате)?|стоимость)[^0-9]{0,24}(\d[\d  ]*(?:[.,]\d{1,2})?)\s*(₽|руб|р\.)/i); return m ? num(m[3] + ' ₽') : (CTX && CTX.p) || num(t) }
  function secBar(no) { R.classList.add('ps-on', 'ps-sec', 'ps-notabs'); if (!$('.gc-main-content')) R.classList.add('ps-pad');
    bar({ l: 'Отменить', t: 'Оплата', s: svg(I.lock, 11, 2) + 'защищённое соединение', back: function () {
      sheet({ t: 'Отменить оплату?', p: 'Деньги не&nbsp;спишутся, заказ останется в&nbsp;«Мои покупки»&nbsp;— можно оплатить позже.', b: 'Да, отменить', b2: 'Продолжить оплату', go: function () { R.classList.remove('ps-sec', 'ps-pad'); res('cancel', no) } }) } });
    /* наши — только шапка и строка с суммой; форма банка как есть */
    if (CTX && !$('#psSum')) { var s = document.createElement('div'); s.id = 'psSum'; s.innerHTML = '<span><b>' + what(CTX) + '</b><small>' + (no ? 'Заказ №' + esc(no) : 'Оплата заказа') + '</small></span><strong>' + rub(CTX.p) + '</strong>'; var m = $('.gc-main-content') || document.body; m.insertBefore(s, m.firstChild) } }
  function p4(no, sum, M, act) { var sel = Math.max(0, M.map(function (m) { return m.inp.checked }).indexOf(true));
    bar({ l: 'Назад', t: 'Оплата', s: no ? 'Заказ №' + esc(no) : 'Способ оплаты', home: 1, back: function () { hap(); history.length > 1 ? history.back() : goApp('learn') } });
    var h = '<div class="steps"><span class="ok">Срок</span><span class="ok">Заказ</span><span class="on">Оплата</span></div>'
      + '<div class="card" style="gap:4px;align-items:center;text-align:center;padding:18px 16px"><span class="mut">К&nbsp;оплате</span><b style="font-size:38px;font-weight:500;letter-spacing:-.03em;line-height:1.1">' + rub(sum) + '</b>' + (CTX ? '<span class="mut3">' + (CTX.k === 'amz' ? 'Премиум Амазон' + (CTX.m ? ' · рассрочка' : '') : NM[CTX.k] + ' · продление на&nbsp;' + monL(CTX.m)) + '</span>' : '') + '</div>'
      + '<span class="cap2" style="margin-top:4px">Способ оплаты</span>' + M.map(function (m, i) { return '<button class="po mth' + (i === sel ? ' on' : '') + '" data-i="' + i + '" role="radio" aria-checked="' + (i === sel) + '"><span class="pi">' + svg(I[m.ic], 20, 1.9) + '</span><span class="pt"><b>' + (m.ic === 'sbp' && /^сбп/i.test(m.t) ? 'СБП' : esc(m.t)) + '</b><small>' + (m.ic === 'sbp' ? 'через приложение твоего банка' : m.ic === 'parts' ? 'частями, оформляет банк' : 'Мир, Visa, Mastercard') + '</small></span><span class="rd"></span></button>' }).join('');
    var r = root(h, '', '<span class="sec">' + svg(I.shield, 15, 1.9) + 'Платёж принимает банк, данные карты мы не&nbsp;видим</span><button class="btn">Оплатить ' + rub(sum) + '</button>');
    if (M[sel] && !M[sel].inp.checked) M[sel].inp.click();
    r.querySelectorAll('.po').forEach(function (b) { b.onclick = function () { hap(); sel = +b.getAttribute('data-i'); M[sel].inp.click(); r.querySelectorAll('.po').forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b) }) } });
    $('#psNav .btn').onclick = function () { this.classList.add('busy'); if (CTX) { CTX.deal = location.href; saveCtx(CTX) } act.click() } }
  function p3deal(no, sum, act) { var t = bodyText();
    bar({ l: 'Назад', t: 'Заказ', s: CTX ? (CTX.k === 'amz' ? 'Повышение' : 'Продление') + ' · ' + NM[CTX.k] : (no ? 'Заказ №' + esc(no) : ''), home: 1, back: function () { goApp(backTo(CTX && CTX.k)) } });
    var h = '<div class="steps"><span class="ok">Срок</span><span class="on">Заказ</span><span>Оплата</span></div>' + (CTX ? sumCard(CTX, no, sum) : '<div class="card" style="gap:10px"><span class="cap2">' + (no ? 'Заказ №' + esc(no) : 'Заказ') + '</span><div class="bill tot"><span>Итого</span><span>' + rub(sum) + '</span></div></div>') + mailRow(CTX && CTX.email)
      + '<button class="btn" data-ps="go">Перейти к&nbsp;оплате ' + svg(I.arr, 18, 2.2) + '</button>' + (CTX ? '<button class="btn2" data-ps="ch">Изменить срок</button>' : '') + '<span class="mut3" style="text-align:center">Заказ сохранится в&nbsp;«Мои покупки»&nbsp;— можно оплатить позже.</span>';
    var r = root(h); r.querySelector('[data-ps=go]').onclick = function () { this.classList.add('busy'); if (CTX) { CTX.deal = location.href; saveCtx(CTX) } act.click() };
    var ch = r.querySelector('[data-ps=ch]'); if (ch) ch.onclick = function () { goApp(backTo(CTX.k)) } }
  /* итог: P6 / P6a (успех), P7 (не прошла или отменена), P8 (ждём банк) */
  function res(kind, no, a0) { R.classList.remove('ps-notabs'); if (a0 === undefined) a0 = actionEl(); var c = CTX || {}, amz = c.k === 'amz' || /премиум\s*амазон/i.test(bodyText()), sub = no ? 'Заказ №' + esc(no) : '', h, r;
    var mail = function () { sheet({ t: 'Чек на&nbsp;почте', p: 'Чек отправлен на&nbsp;' + (c.email ? '<b style="color:#fff">' + esc(c.email) + '</b>' : 'почту из&nbsp;профиля') + '. Не&nbsp;пришёл? Проверь «Спам» или&nbsp;напиши в&nbsp;службу заботы.', b2: 'Понятно', c: function () { care('Здравствуйте! Не пришёл чек за оплату' + (no ? ', заказ №' + no : '') + '.') } }) };
    if (kind === 'ok') { ss('psSent', null);
      bar({ l: 'Назад', t: 'Оплата', s: sub, home: 1, back: function () { goApp('learn') } });
      if (amz) h = '<div class="card" style="padding:24px 20px;gap:14px;align-items:center;text-align:center;background:linear-gradient(160deg,rgba(255,155,74,.14),#161616 55%);border-color:rgba(255,155,74,.35)"><img src="' + GH + 'sq/amazon.jpg?v=29" alt="" style="width:104px;height:104px;border-radius:22px;object-fit:cover;box-shadow:0 0 0 1px rgba(248,200,143,.35),0 18px 40px -16px rgba(248,160,90,.6)"><span class="prem lg">Премиум Амазон</span>'
        + '<b style="font-size:24px;font-weight:500;letter-spacing:-.02em;line-height:1.2">Теперь у&nbsp;тебя Премиум Амазон</b><span class="mut" style="font-size:14px;line-height:1.45">Модуль Amazon открыт, доступ к&nbsp;курсу&nbsp;— 365&nbsp;дней. Про&nbsp;карьерный центр и&nbsp;гарантированного клиента напишем в&nbsp;боте.</span></div>'
        + '<button class="btn" data-ps="amz">Открыть модуль Amazon ' + svg(I.arr, 18, 2.2) + '</button><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn2" data-ps="learn">К&nbsp;учёбе</button><button class="btn2" data-ps="mail">' + svg(I.receipt, 18, 1.9) + 'Чек на&nbsp;почте</button></div>';
      else h = '<div class="card" style="padding:24px 20px;gap:14px;align-items:center;text-align:center;background:linear-gradient(160deg,rgba(74,222,128,.12),#161616 55%);border-color:rgba(74,222,128,.3)"><span class="okc">' + svg(I.ok, 34, 2.6) + '</span><span class="mut">Оплата прошла</span>'
        + '<b style="font-size:24px;font-weight:500;letter-spacing:-.02em;line-height:1.2">Доступ продлён' + (c.m ? ' на&nbsp;' + monL(c.m) : '') + '</b><span class="mut" style="font-size:14px;line-height:1.45">' + (c.k ? NM[c.k] + (c.m ? ' · ' + monL(c.m) : '') + (c.p ? ' · ' + rub(c.p) : '') + '. ' : '') + 'Уроки, прогресс и&nbsp;баллы на&nbsp;месте, новая дата доступа&nbsp;— на&nbsp;«Учёбе».</span></div>'
        + '<button class="btn" data-ps="learn">К&nbsp;учёбе ' + svg(I.arr, 18, 2.2) + '</button><button class="btn2" data-ps="mail">' + svg(I.receipt, 18, 1.9) + 'Чек на&nbsp;почте</button>';
      r = root(h, 'mid') }
    else if (kind === 'fail' || kind === 'cancel') { var t = bodyText(), why = /не хватает|недостаточно (средств|денег)/i.test(t) ? 'Банк отклонил платёж: на&nbsp;карте не&nbsp;хватает денег.' : /интернет|онлайн|запрещ/i.test(t) ? 'Банк отклонил платёж: карта закрыта для&nbsp;покупок в&nbsp;интернете.' : /код|3-?d|3ds|смс|sms/i.test(t) ? 'Банк отклонил платёж: неверный код подтверждения из&nbsp;СМС.' : /не ответил|таймаут|timeout|время/i.test(t) ? 'Банк не&nbsp;ответил вовремя.' : 'Банк не&nbsp;принял платёж, попробуй ещё раз или&nbsp;другую карту.';
      bar({ l: 'Назад', t: 'Оплата', s: sub, home: 0, back: function () { if (c.deal) location.href = c.deal; else if (history.length > 1) history.back(); else goApp('learn') } });
      h = '<span class="lsi">' + svg(I.alert, 32) + '</span><b style="font-size:24px;font-weight:500;letter-spacing:-.02em;text-align:center">' + (kind === 'cancel' ? 'Оплата отменена' : 'Оплата не&nbsp;прошла') + '</b><span class="mut" style="font-size:14px;text-align:center;line-height:1.45">Деньги не&nbsp;списаны, заказ сохранён&nbsp;— можно попробовать ещё раз.</span>'
        + (kind === 'fail' ? '<div class="card" style="gap:6px;padding:14px 16px"><span class="cap2">Что&nbsp;случилось</span><span style="font-size:14px;line-height:1.45;color:rgba(255,255,255,.88)">' + why + '</span></div>' : '')
        + '<button class="btn" data-ps="again" style="margin-top:4px">Попробовать снова</button><button class="btn2" data-ps="other">Другой способ оплаты</button><button class="btn2" data-ps="care">' + svg(I.chat, 18, 1.9) + 'Написать в&nbsp;службу заботы</button>';
      r = root(h, 'mid');
      r.querySelector('[data-ps=again]').onclick = function () { hap(); this.classList.add('busy'); if (kind === 'cancel') { R.classList.remove('ps-ov'); $('#psRoot').remove(); var n = $('#psNav'); if (n) n.remove(); this.classList.remove('busy'); secBar(no); return } if (c.pay) location.href = c.pay; else if (a0) a0.click(); else if (c.deal) location.href = c.deal; else history.back() };
      r.querySelector('[data-ps=other]').onclick = function () { hap(); if (c.deal) location.href = c.deal; else if (a0) a0.click(); else if (history.length > 1) history.back(); else goApp('learn') };
      r.querySelector('[data-ps=care]').onclick = function () { care('Здравствуйте! ' + (kind === 'cancel' ? 'Отменил оплату' : 'Не прошла оплата') + (no ? ', заказ №' + no : '') + (c.p ? ', ' + n0(c.p) + ' ₽' : '') + (what(c) ? ' (' + what(c).replace(/&nbsp;/g, ' ') + ')' : '') + (kind === 'fail' ? '. Причина: ' + why.replace(/&nbsp;/g, ' ') : '.')) } }
    else { var inst = (c.k === 'amz' && c.m) || /рассроч|кредит|долями/i.test(bodyText()), d = new Date(Date.now() + 3 * 3600e3), tm = ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2) + '&nbsp;МСК';
      bar({ l: 'Назад', t: inst ? 'Рассрочка' : 'Оплата', s: (c.k ? NM[c.k] + (no ? ' · №' + esc(no) : '') : sub), home: 1, back: function () { goApp('learn') } });
      h = '<div class="card" style="gap:14px"><div class="row" style="gap:12px"><span style="width:48px;height:48px;border-radius:15px;background:rgba(195,139,255,.16);color:#e2c9ff;display:grid;place-items:center;flex:none">' + svg(I.clock, 24) + '</span><span style="flex:1;min-width:0"><b style="font-size:20px;font-weight:500;letter-spacing:-.02em;display:block;line-height:1.2">' + (inst ? 'Заявка у&nbsp;банка' : 'Проверяем оплату') + '</b><span class="mut3">' + (inst ? 'рассрочка от&nbsp;2&nbsp;000&nbsp;₽/мес' : 'банк ещё не&nbsp;подтвердил платёж') + '</span></span></div>'
        + (inst ? '<ol class="flowv"><li class="ok"><span class="ic">' + svg(I.ok, 16, 2.6) + '</span><span><b>Заявка отправлена</b><small>сегодня, ' + tm + '</small></span></li><li class="on"><span class="ic">2</span><span><b>Банк рассматривает заявку</b><small>ответ придёт в&nbsp;СМС от&nbsp;банка</small></span></li><li><span class="ic">3</span><span><b>Подпишешь договор</b><small>по&nbsp;ссылке из&nbsp;СМС</small></span></li><li><span class="ic">4</span><span><b>' + (c.k === 'amz' || amz ? 'Премиум Амазон откроется сам' : 'Доступ откроется сам') + '</b><small>напишем в&nbsp;боте</small></span></li></ol>' : '') + '</div>'
        + '<div class="info">' + svg(I.bell, 18, 1.9) + '<span>Приложение можно закрыть&nbsp;— о&nbsp;решении банка напишем в&nbsp;боте</span></div><button class="btn" data-ps="upd">' + svg(I.refresh, 18) + 'Обновить статус</button><button class="btn2" data-ps="learn">К&nbsp;учёбе</button><span class="mut3" id="psUpd" style="text-align:center">Проверяем сами каждые 10&nbsp;секунд</span>';
      r = root(h);
      r.querySelector('[data-ps=upd]').onclick = function () { hap(); this.classList.add('busy'); location.replace(location.href) };
      /* статус сам каждые 10 секунд, пока экран открыт (GET — без повторной отправки формы) */
      setTimeout(function tick() { if (document.visibilityState === 'hidden') return setTimeout(tick, 10000); location.replace(location.href) }, 10000) }
    $$('[data-ps=learn]', r).forEach(function (b) { b.onclick = function () { goApp('learn') } }); var a = r.querySelector('[data-ps=amz]'); if (a) a.onclick = function () { goApp('learn/amz') }; var ml = r.querySelector('[data-ps=mail]'); if (ml) ml.onclick = mail }
  function payPage() { var t = bodyText(), k = payKind(t), no = orderNo(t);
    if (k) return res(k, no);
    var act = actionEl(), M = methods(act), sum = sumOf(t);
    if (act && M.length >= 2) return p4(no, sum, M, act);
    if (act && /\/sales\/shop\/deal(\/|\?|$)/i.test(P)) return p3deal(no, sum, act);
    if (CTX) { CTX.pay = location.href; saveCtx(CTX) }
    secBar(no) }
  /* на страницах оплаты ссылки на оплату и форму банка — в этом же окне (P5): layout.js отправляет их во внешний браузер.
     Исключения: Telegram (t.me) и СБП (qr.nspk.ru, схемы банков) — их открывает Telegram/приложение банка */
  window.addEventListener('click', function (ev) { var a = ev.target && ev.target.closest && ev.target.closest('a[href]'); if (!a || a.closest('#ecoTabs')) return; var u; try { u = new URL(a.getAttribute('href'), location.href) } catch (e) { return }
    if (!/^https?:$/.test(u.protocol) || /^(t|telegram)\.me$/i.test(u.host) || /(^|\.)nspk\.ru$/i.test(u.host)) return;
    if (u.host === location.host && !/\/sales\/|dealpay|\/payment|\/pl\/sales\//i.test(u.pathname)) return;
    ev.preventDefault(); ev.stopImmediatePropagation(); location.href = u.href }, true);

  function run() { addCss();
    if (isForm) { var buy = (Q.match(/[?&]ecoBuy=(\d+)/) || [])[1]; if (buy && OKC) return buyFlow(buy); var n = 0;
      (function wait() { var F = readForm(); if (F && F.O.length) return choose(F); if (++n < 30) setTimeout(wait, 200) })(); return }
    payPage() }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
