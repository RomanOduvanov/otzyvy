window.FS_TEST=1;
  (function () {
    
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
      + '.fl .answer_wrapper>.user-image,.fl .answer_wrapper .title .user-image,.fl .answer_wrapper .answer-status,.fl .answer_wrapper .addfield,.fl .answer_wrapper .answer-file-box p,.fl .answer_wrapper .edit-comment-active-element.hide,.fl .gc-comment-form .user-image-wrapper,.fl .comment .user-image,.fl .answer_wrapper .comment-user-settings-json{display:none!important}'
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
      /* 27.10: кнопка загрузки — невидимый input[type=file] GetCourse растянут на всю плашку (раньше нажималась только полоска справа сверху), «Изменить работу» у своего ответа */
      + '.fl .uploadifive-button{position:relative!important;overflow:hidden!important;cursor:pointer}.fl .uploadifive-button input[type=file]:not([id]){position:absolute!important;top:0!important;left:0!important;right:auto!important;bottom:auto!important;width:100%!important;height:100%!important;min-height:36px;margin:0!important;padding:0!important;opacity:0!important;font-size:16px!important;cursor:pointer!important;z-index:5!important;display:block!important}'
      + '.fl a.fl-edt{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:12px;background:rgba(255,255,255,.11);color:#fff!important;font-size:15px;font-weight:500;text-decoration:none!important;margin:4px 0 12px}.fl a.fl-edt:hover{background:rgba(255,255,255,.16)}.fl-edn{font-size:13px;color:var(--ink2);margin:0 0 12px}'
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
    var fsVW = function (doc, L) { /* «просмотрено» как в GetCourse: тот же запрос статуса видео, что делает сам GetCourse на странице части (27.10) */ try { var m = [].map.call(doc.querySelectorAll('script:not([src])'), function (x) { return x.textContent }).join('\n').match(/new VideoWatched\('([^']+)',\s*'[^']*',\s*'([^']+)'\)/); if (!m) return Promise.resolve(L);
      var F = {}, k = 0; [].forEach.call(doc.querySelectorAll('ul.lesson-list > li[data-vh-files]'), function (li) { var f = (li.getAttribute('data-vh-files') || '').split(',').filter(Boolean).map(Number); if (f.length) { F[li.getAttribute('data-lesson-id') || (li.className.match(/lesson-id-(\d+)/) || [])[1]] = f; k++ } }); if (!k) return Promise.resolve(L);
      return fetch(m[1], { method: 'POST', body: new URLSearchParams({ json: m[2] }) }).then(function (r) { return r.ok ? r.json() : [] }).then(function (w) { var h = (w || []).map(function (x) { return +x.gc_file_id }); if (h.length) L.forEach(function (x) { var f = F[x.id]; if (f && !x.hw && f.every(function (n) { return h.indexOf(n) >= 0 })) x.done = true }); return L }).catch(function () { return L }) } catch (e) { return Promise.resolve(L) } };
    var partData = function (href) { var k = 'flPart2:' + href; try { var c = JSON.parse(sessionStorage.getItem(k) || 'null'); if (c && Date.now() - c.ts < 3e5) return Promise.resolve(c.v) } catch (e) {}
      return fetch(href, { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) { var d = new DOMParser().parseFromString(t, 'text/html');
        var v = [].map.call(d.querySelectorAll('ul.lesson-list > li'), function (li) { var a = li.querySelector('a[href]'), ti = li.querySelector('.title'), c = li.className;
          return { id: (c.match(/lesson-id-(\d+)/) || [])[1], href: a ? a.getAttribute('href') : '', t: ti ? (ti.childNodes[0] ? ti.childNodes[0].textContent : ti.textContent).replace(/\s+/g, ' ').trim() : '', hw: /домашн/i.test(ti ? ti.textContent : ''), done: /user-state-accomplished/.test(c) || (!/домашн/i.test(ti ? ti.textContent : '') && /user-state-viewed|lesson-list_watched/.test(c + ' ' + (a ? a.className : ''))), lk: /not_reached|not-reached|has_no_access|is-locked|user-state-not/.test(c) } });
        return fsVW(d, v) }).then(function (v) { try { sessionStorage.setItem(k, JSON.stringify({ ts: Date.now(), v: v })) } catch (e) {} return v }) };
    var x2P = null, x2Of = function () { return x2P || (x2P = window.FS_RATING().then(function (D) { D = D || {}; var hit = null;
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
        c.insertAdjacentHTML('afterbegin', '<div class="fl-ast">' + (s0 ? '<span class="fl-chip ' + s0[1] + '">' + s0[2] + '</span>' : '') + lv.map(function (l) { return '<span class="fl-chip">' + esc(l) + '</span>' }).join('') + '</div>');
        var ed = a.closest('.self-answers') && a.querySelector('.answer-edit-link a[href]'); if (ed) { var fa = c.querySelector('.fl-ast'); fa.insertAdjacentHTML('afterend', '<a class="fl-edt fs-k" href="' + esc(ed.getAttribute('href').replace(/^\/pl\/\.\.\/\.\.\//, '/')) + '">' + ico('doc', 18, 2) + 'Изменить работу или уровень</a><p class="fl-edn">Пока куратор не\u00a0проверил работу, можно заменить файлы, текст или\u00a0уровень. Оставь одну галочку\u00a0— нужный уровень.</p>') } }) };
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
(function () {
  if (window.top !== window && !window.FS_TEST) return;
  var ROOT = '935917158', RT = 'https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/', CARE = 'https://t.me/zabota_oduvanov', NB = ' ', MSK = 3 * 36e5;
  var COV = { 935917159: 'm00', 935917160: 'm01', 935917165: 'm02', 935917169: 'm03', 935917170: 'm04', 935917173: 'm05', 935917189: '../amazon-orange2', 935917174: 'm06', 935917184: 'm07', 935917186: 'm08' };
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
    return { id: li.getAttribute('data-lesson-id') || (c.match(/lesson-id-(\d+)/) || [])[1], href: a ? a.getAttribute('href') : '', t: t, done: /user-state-accomplished/.test(c) || (!/домашн/i.test(t) && /user-state-viewed|lesson-list_watched/.test(c)), wait: /user-state-answered|user-state-has_answer/.test(c), need: /user-state-need_accomplish/.test(c),
      lk: /user-state-not_reached|user-state-blocked|is-locked|has_no_access/.test(c) || /недоступ/i.test(dx), stop: !!li.querySelector('.is-stop-lesson'), at: pd(dx), hw: /домашн/i.test(t), sv: /анкет/i.test(t) } }) };
  var rowsOf = function (doc) { return [].map.call(doc.querySelectorAll('.stream-table tr.training-row'), function (tr) { var a = tr.querySelector('td>a'); return { id: tr.getAttribute('data-training-id'), href: a ? a.getAttribute('href') : '/teach/control/stream/view/id/' + tr.getAttribute('data-training-id'), t: txt(tr.querySelector('.stream-title')) } }) };
  var fsVW = function (doc, L) { /* «просмотрено» как в GetCourse: тот же запрос статуса видео, что делает сам GetCourse на странице части (27.10) */ try { var m = [].map.call(doc.querySelectorAll('script:not([src])'), function (x) { return x.textContent }).join('\n').match(/new VideoWatched\('([^']+)',\s*'[^']*',\s*'([^']+)'\)/); if (!m) return Promise.resolve(L);
      var F = {}, k = 0; [].forEach.call(doc.querySelectorAll('ul.lesson-list > li[data-vh-files]'), function (li) { var f = (li.getAttribute('data-vh-files') || '').split(',').filter(Boolean).map(Number); if (f.length) { F[li.getAttribute('data-lesson-id') || (li.className.match(/lesson-id-(\d+)/) || [])[1]] = f; k++ } }); if (!k) return Promise.resolve(L);
      return fetch(m[1], { method: 'POST', body: new URLSearchParams({ json: m[2] }) }).then(function (r) { return r.ok ? r.json() : [] }).then(function (w) { var h = (w || []).map(function (x) { return +x.gc_file_id }); if (h.length) L.forEach(function (x) { var f = F[x.id]; if (f && !x.hw && f.every(function (n) { return h.indexOf(n) >= 0 })) x.done = true }); return L }).catch(function () { return L }) } catch (e) { return Promise.resolve(L) } };
  var partInfo = function (r) { var k = 'fsPP:' + r.id; try { var c = JSON.parse(sessionStorage.getItem(k) || 'null'); if (c && Date.now() - c.ts < 3e5) return Promise.resolve(c.v) } catch (e) {}
    return get(r.href).then(function (d) { var v = { L: lessonsOf(d), sub: rowsOf(d).length }; return fsVW(d, v.L).then(function () { return v }) }).then(function (v) { try { sessionStorage.setItem(k, JSON.stringify({ ts: Date.now(), v: v })) } catch (e) {} return v }).catch(function () { return { L: [], sub: 0 } }) };
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
    Promise.all([getD(), fsVW(document, L)]).then(function () {
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
