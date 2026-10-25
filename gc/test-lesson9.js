(function(){
  /* ===== страница урока: единый шаблон (шапка, уроки части, «В этом уроке» + тайм-коды, материалы, уровни ДЗ, сдача, переход дальше) ===== */
  (function () {
    if (window.top !== window) return;
    var path = location.pathname, qs = new URLSearchParams(location.search);
    var LID = (path.match(/\/teach\/control\/lesson\/view\/id\/(\d+)/) || [])[1] || (/\/teach\/control\/lesson\/view\/?$/.test(path) ? qs.get('id') : null);
    if (!LID || qs.get('editMode')) return;
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
      + '.fl-chip.ok{background:rgba(74,222,128,.16);border-color:transparent;color:#86efac}.fl-chip.rv{background:rgba(57,135,229,.18);border-color:transparent;color:#9cc6ff}.fl-chip.wn{background:rgba(255,159,107,.16);border-color:transparent;color:#ffb48c}'
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
      + '.fl-next{border-radius:40px;padding:40px;background:linear-gradient(160deg,#6724ad 0%,#3a1470 50%,#1c0838 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 24px 60px -24px rgba(96,0,255,.6);display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between}'
      + '.fl-next .t{flex:1 1 260px;min-width:0}.fl-next .t span{display:block;font-size:14px;color:rgba(255,255,255,.72)}.fl-next .t b{display:block;font-size:34px;font-weight:500;letter-spacing:-.03em;margin-top:4px;line-height:1.15}.fl-nb{display:flex;gap:12px;flex-wrap:wrap}'
      + '.fl-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:56px;padding:0 28px;border-radius:16px;border:0;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font-family:inherit;font-weight:600;font-size:17px;line-height:1;text-decoration:none!important;cursor:pointer;white-space:nowrap;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),0 16px 48px -12px rgba(252,203,255,.35)}'
      + '.fl-btn2{display:inline-flex;align-items:center;gap:8px;height:56px;padding:0 20px;border-radius:16px;background:rgba(0,1,6,.35);color:#fff!important;font-size:16px;font-weight:500;text-decoration:none!important;max-width:320px;overflow:hidden}.fl-btn2 span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '@media(max-width:700px){.fl-next{border-radius:28px;padding:24px}.fl-next .t b{font-size:26px}.fl-nb{width:100%}.fl-nb .fl-btn{flex:1}.fl-btn2{max-width:none}}'
      + '.fl a.fl-btn,.fl-bar a.n{color:#602364!important}.fl-bar{display:none}@media(max-width:700px){.fl-bar{display:flex;position:fixed;left:12px;right:12px;bottom:12px;z-index:60;gap:8px;padding:8px;border-radius:22px;background:rgba(12,12,12,.94);border:1px solid rgba(255,255,255,.1);box-shadow:0 -10px 40px rgba(0,0,0,.5)}.fl-bar a{height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none!important}'
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
      + ':root.fl-on .lite-page .lt-block-wrapper{padding-top:8px!important;padding-bottom:8px!important}:root.fl-on .lite-page .lt-block .container{width:auto!important;max-width:none!important;padding:0!important}:root.fl-on .lite-page .lt-block .row{margin:0!important}:root.fl-on .lite-page .lt-block [class*="col-md-"]{padding:0!important;float:none!important;width:auto!important}'
      + '.fl-x .bonus-label,.fl-x .task-description-label{display:inline-block!important;font-size:12px!important;font-weight:700!important;letter-spacing:.1em!important;padding:6px 12px!important;border-radius:999px!important;background:rgba(195,139,255,.14)!important;color:#d7b6ff!important;text-transform:uppercase!important;margin:0 0 16px!important;border:0!important}'
      + '.fl-x .bonus-block{display:block!important}.fl-x .bonus-block>*{grid-column:auto!important}.fl-x .bonus-block .bonus-title.bonus-title,.fl-x .bonus-block h3.bonus-title{padding:0!important;border-top:0!important}.fl-x .bonus-button::after{content:none!important}.fl-x .bonus-block .bonus-button+.bonus-title:has(+.bonus-title){display:block!important}.fl-x .bonus-block .bonus-title:empty{display:none!important}'
      + '.fl-x .bonus-label:empty{display:none!important}.fl-x h3,.fl-x h4,.fl-x .bonus-title,.fl-x .info-title{font-size:18px!important;font-weight:600!important;color:#fff!important;margin:18px 0 8px!important;line-height:1.35!important;font-family:inherit!important}.fl-x h3:empty,.fl-x .bonus-title:empty{display:none!important}'
      + '.fl-x p,.fl-x li,.fl-x .bonus-description,.fl-x .task-description-text{font-size:16px!important;line-height:1.55!important;color:rgba(255,255,255,.82)!important;font-family:inherit!important}.fl-x ol,.fl-x ul{padding-left:22px!important;margin:6px 0!important}.fl-x li{margin:4px 0!important}'
      + '.fl-x a.bonus-button,.fl-x .task-links a{display:inline-flex!important;align-items:center;gap:6px;height:44px;padding:0 18px!important;border-radius:14px!important;background:rgba(255,255,255,.11)!important;color:#fff!important;font-size:15px!important;font-weight:500!important;text-decoration:none!important;margin:6px 8px 6px 0!important;box-shadow:none!important;border:0!important}.fl-x a.bonus-button:hover{background:rgba(255,255,255,.16)!important}'
      + '.fl-x .bonus-title:first-child,.fl-x .info-title:first-child{margin-top:0!important}.fl-x .task-note em{color:var(--ink2)}.fl-x .task-requirements{margin-top:10px;padding:16px 20px;border-radius:18px;background:var(--s0)}.fl-x .task-description-item{display:flex;gap:10px;margin:6px 0}.fl-x .task-description-number{color:var(--acc);font-weight:600}'
      + ':root.fl-on .lite-page .fl-warn .bonus-block{background:rgba(255,159,107,.07)!important;border-color:rgba(255,159,107,.3)!important}.fl-warn .bonus-title,.fl-warn strong{color:#ffd2b8!important}:root.fl-on .lite-page .fl-info .bonus-block{background:rgba(57,135,229,.08)!important;border-color:rgba(57,135,229,.3)!important}'
      + ':root.fl-on .lite-page .fl-hw .bonus-block{border-color:rgba(195,139,255,.3)!important}.fl-hw .bonus-block .bonus-title.bonus-title:first-child{display:inline-block!important;font-size:12px!important;letter-spacing:.1em!important;text-transform:uppercase;padding:6px 12px!important;border-radius:999px;background:rgba(195,139,255,.14);color:#d7b6ff!important;margin-bottom:12px!important}'
      /* уровни ДЗ */
      + '.fl-lvs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}@media(max-width:1100px){.fl-lvs{grid-template-columns:1fr}}.fl-lvs>.lite-block-live-wrapper{margin:0!important;min-width:0}.fl-lvs .lt-block-wrapper{padding:0!important;height:100%}.fl-lvs .lt-block,.fl-lvs .lt-block>div,.fl-lvs [data-raw-editable]{height:100%}'
      + ':root.fl-on .fl-lvs .bonus-block{border-radius:32px!important;padding:28px!important;height:100%;cursor:pointer;transition:border-color .15s,background .15s}:root.fl-on .fl-lvs .fl-lv.on .bonus-block{border-color:#c38bff!important;background:rgba(195,139,255,.08)!important}'
      + '.fl-lvh{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.fl-lvh .r{flex:none;width:22px;height:22px;border-radius:999px;border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center}.fl-lv.on .fl-lvh .r{border-color:#c38bff}.fl-lv.on .fl-lvh .r:after{content:"";width:10px;height:10px;border-radius:999px;background:#c38bff}'
      + '.fl-lv .bonus-title,.fl-lv h3{font-size:16px!important}.fl-lv p,.fl-lv li,.fl-lv .bonus-description{font-size:15px!important}.fl-lvh{flex-wrap:wrap}.fl-lvh b{flex:1;font-size:12px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.7);text-transform:uppercase}.fl-lv.on .fl-lvh b{color:#d7b6ff}.fl-lvh em{font-style:normal;font-size:15px;font-weight:600;color:var(--acc);white-space:nowrap}.fl-lv .bonus-label{display:none!important}'
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
      + ':root.fl-on .fl-mis .btn-send-answer{height:56px!important;padding:0 28px!important;border-radius:16px!important;border:0!important;background:linear-gradient(180deg,#fef8ff,#fccbff)!important;color:#602364!important;font:600 17px "Inter Tight",sans-serif!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),0 16px 48px -12px rgba(252,203,255,.35)!important;margin:8px 12px 0 0!important}'
      + ':root.fl-on .fl-mis .btn-save-draft{color:var(--ink2)!important;font:500 15px "Inter Tight",sans-serif!important;text-decoration:none!important;margin-top:8px!important}'
      + '.fl-seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:4px;border-radius:18px;background:var(--s0);border:1px solid rgba(255,255,255,.08);margin-bottom:14px}.fl-seg button{height:52px;border-radius:14px;border:0;background:transparent;color:rgba(255,255,255,.72);font-family:inherit;font-size:15px;font-weight:500;cursor:pointer;padding:0 6px}.fl-seg button.on{background:var(--lil);color:#1a0b2e;font-weight:600}'
      + '@media(max-width:700px){.fl-seg{grid-template-columns:1fr}}.fl-mh{font-size:32px;font-weight:500;letter-spacing:-.03em;margin:0 0 18px;line-height:1.15}.fl-ml{font-size:14px;color:var(--ink2);margin:0 0 10px}.fl-pt{font-size:14px;color:var(--ink2);margin:10px 0 0}.fl-pt b{color:var(--acc);font-weight:600}'
      + ':root.fl-on .fl-mis .self-answers:not(:empty){margin-bottom:20px}:root.fl-on .fl-mis .self-answers .answer-item,:root.fl-on .fl-mis .self-answers>div{background:var(--s0)!important;border:1px solid var(--hair)!important;border-radius:22px!important;padding:20px!important;color:rgba(255,255,255,.85)!important}'
      /* оценка урока */
      + ':root.fl-on .training-feedback-widget{background:var(--s1)!important;border:1px solid var(--hair)!important;border-radius:40px!important;padding:32px 40px!important}:root.fl-on .training-feedback-widget h3{font-size:22px!important;font-weight:500!important;margin:0 0 4px!important;color:#fff!important}'
      + ':root.fl-on .training-feedback-widget label{font-size:14px!important;font-weight:400!important;color:var(--ink2)!important}:root.fl-on .training-feedback-widget textarea{width:100%!important;border-radius:18px!important;border:1px solid rgba(255,255,255,.12)!important;background:var(--s0)!important;color:#fff!important;padding:14px!important;font:400 15px "Inter Tight",sans-serif!important}'
      + ':root.fl-on .training-feedback-widget .btn{height:48px!important;padding:0 22px!important;border-radius:14px!important;border:0!important;background:rgba(255,255,255,.11)!important;color:#fff!important;font:500 15px "Inter Tight",sans-serif!important;box-shadow:none!important}@media(max-width:700px){:root.fl-on .training-feedback-widget{border-radius:28px!important;padding:22px!important}}'
      + ':root.fl-on .training-feedback-widget .star-rating-widget li{color:#c38bff}';

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
    var pdt = function (s) { var m = String(s || '').toLowerCase().match(/(\d{1,2})\s+([а-я]{3})[а-я]*\.?(?:\s+(\d{4}))?(?:\s+(\d{1,2}):(\d{2}))?/); if (!m || MON[m[2]] == null) return null; var n = new Date(), d = new Date(m[3] ? +m[3] : n.getFullYear(), MON[m[2]], +m[1], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0); if (!m[3] && d < n - 200 * 864e5) d.setFullYear(d.getFullYear() + 1); return d };
    var left = function (ms) { var h = Math.max(0, Math.round(ms / 36e5)), d = Math.floor(h / 24); return d ? d + NB + pl(d, ['день', 'дня', 'дней']) + (h % 24 ? ' ' + h % 24 + NB + pl(h % 24, ['час', 'часа', 'часов']) : '') : h + NB + pl(h, ['час', 'часа', 'часов']) };
    var partData = function (href) { var k = 'flPart:' + href; try { var c = JSON.parse(sessionStorage.getItem(k) || 'null'); if (c && Date.now() - c.ts < 3e5) return Promise.resolve(c.v) } catch (e) {}
      return fetch(href, { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) { var d = new DOMParser().parseFromString(t, 'text/html');
        var v = [].map.call(d.querySelectorAll('ul.lesson-list > li'), function (li) { var a = li.querySelector('a[href]'), ti = li.querySelector('.title'), c = li.className;
          return { id: (c.match(/lesson-id-(\d+)/) || [])[1], href: a ? a.getAttribute('href') : '', t: ti ? (ti.childNodes[0] ? ti.childNodes[0].textContent : ti.textContent).replace(/\s+/g, ' ').trim() : '', done: /accomplished|answered|passed/.test(c) || /просмотрено/i.test(txt(li)), lk: /not_reached|not-reached|has_no_access|is-locked|user-state-not/.test(c) } });
        try { sessionStorage.setItem(k, JSON.stringify({ ts: Date.now(), v: v })) } catch (e) {} return v }) };
    var x2P = null, x2Of = function () { return x2P || (x2P = fetch(RT + 'data.json', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (D) { var hit = null;
      (D.modules || []).forEach(function (m) { (m.parts || []).forEach(function (p) { (p.lessons || []).forEach(function (l) { if (String(l.id) === String(LID)) hit = { m: m, p: p, l: l } }) }) }); return hit }).catch(function () { return null })) };

    var start = function () {
      if (document.querySelector('.fl')) return true; var hb = document.querySelector('.lesson-header-block'), lp = document.querySelector('.lite-page'); if (!hb || !lp) return false;
      var H = head(); if (!H) return false;
      var st = document.createElement('style'); st.textContent = CSS.replace(/(^|[{},])\.fl(?=[\w-]*[\s.:,>{\[])/g, '$1:root.fl-on body .fl'); document.head.appendChild(st); document.documentElement.classList.add('fl-on');
      var bc = [].map.call(document.querySelectorAll('.breadcrumb li a'), function (a) { return { href: a.getAttribute('href'), t: txt(a) } }).filter(function (x) { return !/Список тренингов/.test(x.t) });
      var pa = document.querySelector('.page-header h1 a'), part = pa ? { href: pa.getAttribute('href'), t: txt(pa) } : null;
      var wraps = [].slice.call(lp.querySelectorAll(':scope > .lite-block-live-wrapper'));
      var isHw = /домашн/i.test(H.title) || !!document.querySelector('.lt-lesson-mission-block .addfield-type-checkbox'), isSurvey = !!lp.querySelector('.lt-form-survey') || /анкета/i.test(H.title);
      var locked = /недоступ/i.test(H.state), openAt = locked ? pdt(H.state) : null;

      /* каркас */
      var root = document.createElement('div'); root.className = 'fl';
      var main = document.createElement('div'); main.className = 'fl-main'; var aside = document.createElement('aside'); aside.className = 'fl-aside'; aside.setAttribute('aria-label', 'Уроки части');
      root.appendChild(main); root.appendChild(aside); hb.parentNode.insertBefore(root, hb);
      var mp = document.createElement('div'); mp.className = 'fl-mp'; main.appendChild(mp);
      var hd = document.createElement('header'); hd.className = 'fl-hd'; main.appendChild(hd);
      var meta = []; var vids = lp.querySelectorAll('.lt-video').length, tcs = lp.querySelectorAll('.timecode-item').length;
      if (isHw) meta.push('Домашнее задание'); else if (isSurvey) meta.push('Анкета обратной связи'); else if (vids) meta.push('Видеоурок');
      if (tcs) meta.push(tcs + NB + pl(tcs, ['тайм-код', 'тайм-кода', 'тайм-кодов']));
      var renderHead = function (x) { var now = Date.now(), chips = [];
        if (H.of) chips.push('<span class="fl-chip">Урок ' + H.n + ' из ' + H.of + '</span>');
        if (x && x.p && x.p.at) { var at = new Date(x.p.at).getTime(), until = at + (isHw ? 72 : 48) * 36e5; if (now >= at && now < until) chips.push('<span class="fl-chip l">' + ico('bolt', 13, 2.4) + '×2 баллы · ещё ' + left(until - now) + '</span>') }
        var pts = isHw ? 'до <em>70 баллов</em> за домашку' : isSurvey ? '<em>+15 баллов</em> за анкету' : '<em>+10 баллов</em> за урок';
        hd.innerHTML = (bc.length || part ? '<nav class="fl-bc" aria-label="Где я">' + bc.map(function (b) { return '<a href="' + esc(b.href) + '">' + esc(b.t.replace(/AI-креатор с 0 до PRO 2\.0/, 'AI-креатор 2.0')) + '</a>' }).join('<span aria-hidden="true">/</span>') + (part ? '<span aria-hidden="true">/</span><b>' + esc(part.t) + '</b>' : '') + '</nav>' : '')
          + (chips.length ? '<div class="fl-chips">' + chips.join('') + '</div>' : '')
          + '<h1 class="fl-t">' + (isHw && part && /^домашнее задание$/i.test(H.title) ? esc(part.t) + ' <span>— домашка</span>' : esc(H.title)) + '</h1>'
          + '<p class="fl-meta">' + meta.map(esc).join(' · ') + (meta.length ? ' · ' : '') + pts + '</p>' + (H.desc ? '<p class="fl-meta">' + esc(H.desc) + '</p>' : '');
        typo(hd) };
      renderHead(null); x2Of().then(renderHead);

      if (locked) { var lk = document.createElement('section'); lk.className = 'fl-card fl-lock'; var ms = openAt ? openAt - Date.now() : 0;
        lk.innerHTML = '<span class="fl-ic">' + ico('lock', 28, 1.8) + '</span><div><b>' + (openAt ? 'Откроется ' + WD[openAt.getDay()] + ', ' + openAt.getDate() + NB + MONG[openAt.getMonth()] + ' в ' + ('0' + openAt.getHours()).slice(-2) + ':' + ('0' + openAt.getMinutes()).slice(-2) : esc(H.state)) + '</b><span>' + (ms > 0 ? 'Через ' + left(ms) + '. ' : '') + 'Первые 48 часов после открытия&nbsp;— баллы ×2.</span></div>';
        main.appendChild(lk); typo(lk) }

      /* блоки урока: переносим в колонку и приводим к шаблону */
      main.appendChild(lp);
      var about = null, mats = null, matsBox = null, lvGrid = null;
      wraps.forEach(function (w) { var k = classify(w); if (!k) return; var b = w.querySelector('.lt-block');
        if (k === 'about') { var items = [].map.call(b.querySelectorAll('.bonus-title, li'), function (e) { return txt(e).replace(/^[•·\-–—]\s*/, '') }).filter(Boolean);
          var sec = document.createElement('section'); sec.className = 'fl-card fl-about'; sec.setAttribute('aria-label', 'О чём урок');
          sec.innerHTML = '<div><span class="fl-lbl">В этом уроке</span><ul class="fl-pts">' + items.map(function (t) { return '<li>' + ico('check', 22, 2) + '<span>' + esc(t) + '</span></li>' }).join('') + '</ul></div>';
          w.style.display = 'none'; w.parentNode.insertBefore(sec, w); about = sec; typo(sec) }
        else if (k === 'tc') { var col = document.createElement('div'); col.className = 'tc'; col.innerHTML = '<span class="fl-lbl">Тайм-коды</span><nav class="fl-tc" aria-label="Тайм-коды"></nav>'; var navc = col.querySelector('nav');
          [].forEach.call(b.querySelectorAll('.timecode-item'), function (it) { var a = it.querySelector('a'), time = a ? txt(a) : txt(it.querySelector('.timecode-time')), d = txt(it.querySelector('.timecode-description')); if (!a) { a = document.createElement('a'); a.href = '#' }
            a.innerHTML = '<b>' + esc(time.replace(/^00:/, '').replace(/^0(\d:)/, '$1')) + '</b><span>' + esc(d) + '</span>'; navc.appendChild(a) });
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
          typo(w) }
        else { w.classList.add('fl-x', 'fl-' + k); typo(w) } });

      /* видео — сразу под шапкой, «В этом уроке» — под видео */
      var vw = lp.querySelector('.lt-video'); vw = vw ? vw.closest('.lite-block-live-wrapper') : null;
      if (about && vw && (about.compareDocumentPosition(vw) & Node.DOCUMENT_POSITION_FOLLOWING)) vw.insertAdjacentElement('afterend', about);
      /* шаги сдачи для домашки */
      if (isHw && !locked) { var ol = document.createElement('ol'); ol.className = 'fl-steps'; ol.setAttribute('aria-label', 'Как сдать');
        ol.innerHTML = [['Шаг 1', 'Выбери уровень'], ['Шаг 2', 'Прикрепи работу'], ['Шаг 3', 'Куратор проверит'], ['Шаг 4', 'Баллы в&nbsp;рейтинг']].map(function (s, i) { return '<li' + (i ? '' : ' class="on"') + '><span>' + s[0] + '</span><b>' + s[1] + '</b></li>' }).join('');
        main.insertBefore(ol, lp) }

      /* сдача ДЗ: выбор уровня вместо галочек */
      var mis = lp.querySelector('.lt-lesson-mission-block .lesson-mission-wrapper');
      if (mis && mis.querySelector('form')) { var mw = mis.closest('.lt-lesson-mission-block'); mw.classList.add('fl-mis');
        mis.insertAdjacentHTML('afterbegin', '<h2 class="fl-mh">Сдать работу</h2>');
        var boxes = [].slice.call(mis.querySelectorAll('.addfield-type-checkbox')).map(function (d) { return { el: d.querySelector('input[type=checkbox]'), t: txt(d.querySelector('label')) } }).filter(function (x) { return x.el && /уровень/i.test(x.t) });
        if (boxes.length) { mw.classList.add('fl-lvd'); var seg = document.createElement('div'); seg.className = 'fl-seg'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'На каком уровне сделал(а)?');
          boxes.forEach(function (x, i) { var base = [20, 40, 70][i] || 0; seg.insertAdjacentHTML('beforeend', '<button type="button" data-i="' + i + '">' + esc(x.t.replace(/\s*уровень/i, '')) + (base ? ' · ' + base : '') + '</button>') });
          var hint = document.createElement('p'); hint.className = 'fl-pt';
          var ta = mis.querySelector('.answer-textarea-container') || mis.querySelector('textarea'); var lbl = document.createElement('p'); lbl.className = 'fl-ml'; lbl.textContent = 'На каком уровне сделал(а)?';
          ta.parentNode.insertBefore(lbl, ta); ta.parentNode.insertBefore(seg, ta);
          var sendBtn = mis.querySelector('.btn-save-draft') || mis.querySelector('.btn-send-answer'); if (sendBtn) sendBtn.insertAdjacentElement('afterend', hint);
          var x2until = 0; x2Of().then(function (x) { if (x && x.p && x.p.at) x2until = new Date(x.p.at).getTime() + 72 * 36e5; pick(cur) });
          var cur = boxes.findIndex ? boxes.findIndex(function (x) { return x.el.checked }) : -1;
          var pick = function (i) { cur = i; boxes.forEach(function (x, j) { x.el.checked = j === i }); [].forEach.call(seg.children, function (b2, j) { b2.classList.toggle('on', j === i); b2.setAttribute('aria-checked', j === i ? 'true' : 'false') });
            [].forEach.call(lp.querySelectorAll('.fl-lv'), function (c) { var on = +c.getAttribute('data-lv') === i; c.classList.toggle('on', on); c.setAttribute('aria-checked', on ? 'true' : 'false') });
            var dbl = Date.now() < x2until; [].forEach.call(lp.querySelectorAll('.fl-lvh em'), function (e) { var b0 = +e.getAttribute('data-base'); e.textContent = dbl ? b0 + ' · ×2 = ' + b0 * 2 : b0 + ' баллов' });
            var stp = document.querySelectorAll('.fl-steps li'); if (stp.length) { stp[0].classList.toggle('on', i < 0); stp[1].classList.toggle('on', i >= 0) }
            if (i >= 0) { var b1 = [20, 40, 70][i]; hint.innerHTML = ['Лёгкий', 'Средний', 'Максимальный'][i] + ' уровень принесёт <b>' + (dbl ? b1 * 2 + ' баллов</b> с&nbsp;бонусом ×2' : b1 + ' баллов</b>') + ' после «Принято»' } else hint.textContent = 'Выбери уровень, на котором сделал(а) работу' };
          [].forEach.call(seg.children, function (b2) { b2.onclick = function () { pick(+b2.getAttribute('data-i')) } });
          [].forEach.call(lp.querySelectorAll('.fl-lv'), function (c) { var go = function (e) { if (e.target.closest('a')) return; pick(+c.getAttribute('data-lv')) }; c.addEventListener('click', go); c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(e) } }) });
          pick(cur) }
        typo(mis.querySelector('.lesson-mission-text')) }

      /* оценка урока */
      var fbs = lp.querySelectorAll('.training-feedback-widget'), fb = fbs[fbs.length - 1]; if (fb) { var h3 = fb.querySelector('h3'); if (h3 && /Оцените курс/i.test(h3.textContent)) h3.textContent = 'Как тебе урок?'; var l1 = fb.querySelector('.form-group label'); if (l1 && /Оцените пройденный урок/.test(l1.textContent)) l1.textContent = 'Мы читаем каждый отзыв и по ним улучшаем курс'; typo(fb) }

      /* переход дальше */
      if (H.next || H.prev) { var nx = document.createElement('section'); nx.className = 'fl-next'; nx.setAttribute('aria-label', 'Переход между уроками');
        nx.innerHTML = '<div class="t">' + (H.next ? '<span>Следующий урок' + (H.of ? ' · ' + (H.n + 1) + ' из ' + H.of : '') + '</span><b>' + esc(H.next.name || 'Следующий урок') + '</b>' : '<span>Это последний урок части</span><b>' + esc(part ? part.t : 'Часть пройдена') + '</b>') + '</div>'
          + '<div class="fl-nb">' + (H.prev ? '<a class="fl-btn2" href="' + esc(H.prev.href) + '">' + ico('prev', 18, 2) + '<span>' + esc(H.prev.name || 'Предыдущий урок') + '</span></a>' : '') + (H.next ? '<a class="fl-btn" href="' + esc(H.next.href) + '">Следующий урок' + ico('next', 18, 2) + '</a>' : part ? '<a class="fl-btn" href="' + esc(bc.length ? bc[bc.length - 1].href : part.href) + '">К модулю' + ico('next', 18, 2) + '</a>' : '') + '</div>';
        var fbw = fb ? fb.closest('.lite-block-live-wrapper') : null; if (fbw) fbw.parentNode.insertBefore(nx, fbw); else lp.appendChild(nx); typo(nx);
        var bar = document.createElement('nav'); bar.className = 'fl-bar'; bar.setAttribute('aria-label', 'Переход между уроками');
        bar.innerHTML = (H.prev ? '<a class="p" href="' + esc(H.prev.href) + '" aria-label="Предыдущий урок: ' + esc(H.prev.name) + '">' + ico('prev', 20, 2) + '</a>' : '') + (lp.querySelector('.fl-mis') ? '<a class="n" href="#" data-hw="1"><span>Сдать работу</span>' + ico('up', 18, 2) + '</a>' : H.next ? '<a class="n" href="' + esc(H.next.href) + '"><span>Далее: ' + esc(H.next.name || 'следующий урок') + '</span>' + ico('next', 18, 2) + '</a>' : '');
        var hwb = bar.querySelector('[data-hw]'); if (hwb) hwb.onclick = function (e) { e.preventDefault(); var t = lp.querySelector('.fl-mis'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }) };
        if (H.next || H.prev) document.body.appendChild(bar) }

      /* уроки части: справа на компьютере, раскрывашкой сверху на телефоне */
      aside.insertAdjacentHTML('beforeend', '<a class="fl-care" href="' + CARE + '" target="_blank" rel="noopener"><span>Техническая проблема?<b>Служба заботы</b></span>' + ico('next', 18, 2) + '</a>');
      if (part) partData(part.href).then(function (L) { if (!L || !L.length) return; var done = L.filter(function (x) { return x.done }).length, pc = Math.round(done / L.length * 100), idx = L.findIndex ? L.findIndex(function (x) { return String(x.id) === String(LID) }) : -1;
        var box = function () { return '<section class="fl-part"><div class="h"><span>' + esc(bc.length ? bc[bc.length - 1].t : '') + '</span><b>' + esc(part.t) + '</b></div>'
          + '<div><div class="fl-pr"><span><b>' + done + '</b> из&nbsp;' + L.length + ' пройдено</span><span>' + pc + '%</span></div><div class="fl-pb"><i style="width:' + pc + '%"></i></div></div>'
          + '<ol class="fl-ls">' + L.map(function (x) { var c = String(x.id) === String(LID) ? 'cur' : x.done ? 'done' : x.lk ? 'lk' : ''; return '<li><a class="' + c + '" href="' + esc(x.href) + '"' + (c === 'cur' ? ' aria-current="page"' : '') + '><span class="d">' + (c === 'done' ? ico('check', 14, 3) : '') + '</span><span class="x">' + esc(x.t) + '</span>' + (/домашн/i.test(x.t) ? '<span class="tg">ДЗ</span>' : '') + '</a></li>' }).join('') + '</ol></section>' };
        aside.insertAdjacentHTML('afterbegin', box());
        mp.innerHTML = '<button type="button" aria-expanded="false"><span class="fl-ring" style="background:conic-gradient(#c38bff 0 ' + pc + '%,rgba(255,255,255,.08) ' + pc + '% 100%)"><i></i></span><span class="x"><small>' + esc(part.t) + (idx >= 0 ? ' · урок ' + (idx + 1) + ' из ' + L.length : '') + '</small>Все уроки части</span>' + ico('down', 18, 2) + '</button>' + box();
        var mb = mp.querySelector('button'); mb.onclick = function () { var o = mp.classList.toggle('open'); mb.setAttribute('aria-expanded', o ? 'true' : 'false') };
        var cl = aside.querySelector('.fl-ls .cur'); if (cl) { var ls = cl.closest('.fl-ls'); ls.scrollTop = Math.max(0, cl.offsetTop - ls.clientHeight / 2) } typo(aside) }).catch(function () {});
      return true };
    if (!start()) document.addEventListener('DOMContentLoaded', function () { start() });
  })();
})();
