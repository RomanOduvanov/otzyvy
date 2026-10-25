(function(){
  /* ===== «Мои покупки» (/sales/control/userProduct/my): кольца доступа, темп, бонусный счёт, повышение тарифа, незавершённые заказы ===== */
  (function () {
    if (window.top !== window) return;
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

    /* тарифы: что даёт следующий (с сайта romanoduvanov.ru/ai, без цен) */
    var UPG = {
      'Премиум': { to: 'Премиум Амазон', lead: 'Всё, что есть в&nbsp;твоём Премиуме, плюс заработок на&nbsp;зарубежном рынке и&nbsp;первые клиенты от&nbsp;школы.', pts: [
        ['Модуль «Заработок на&nbsp;Amazon»', '10 уроков о&nbsp;работе с&nbsp;зарубежными клиентами'], ['Гарантированный клиент', 'первый заказ от&nbsp;10 000 ₽'], ['Карьерный центр', 'канал с&nbsp;клиентами и&nbsp;заказами'],
        ['Работа в&nbsp;моём агентстве', 'возможность получать заказы пассивно'], ['Старший куратор 24/7', 'поддержка в&nbsp;любое время'], ['Эфир о&nbsp;зарубежном дизайне', 'от&nbsp;топового спикера']] },
      'База': { to: 'Премиум', lead: 'Всё, что есть в&nbsp;Базе, плюс проверка домашек, личный куратор и&nbsp;модуль о&nbsp;продажах.', pts: [
        ['Модуль «Поток клиентов и&nbsp;продажи»', 'как находить заказчиков и&nbsp;продавать'], ['Домашние задания', 'с&nbsp;проверкой и&nbsp;обратной связью'], ['Личный куратор', 'индивидуальная поддержка'],
        ['Разборы и&nbsp;online-практика', 'групповые эфиры с&nbsp;ответами на&nbsp;вопросы'], ['Чаты потока и&nbsp;вакансий', 'общение и&nbsp;первые заказы'], ['Предобучение', 'мягкий старт до&nbsp;основного курса']] } };

    /* ---------- разбор исходной страницы GetCourse ---------- */
    var parse = function (box) {
      var out = { prods: [], open: [], done: [], promo: null, bal: '' }, tables = box.querySelectorAll('table');
      var pr = box.querySelector('a[href*="promo-code/my-codes"]'); if (pr) out.promo = pr.getAttribute('href');
      var bi = box.querySelector('.gc-bonus-info'); if (bi) out.bal = bi.textContent.replace(/\s+/g, ' ').trim();
      [].forEach.call(tables, function (t) { var h = t.previousElementSibling; while (h && !/^H\d$/.test(h.tagName)) h = h.previousElementSibling; var ttl = h ? h.textContent.trim().toLowerCase() : '';
        [].forEach.call(t.querySelectorAll('tbody tr'), function (tr) { var td = tr.querySelectorAll('td'); if (td.length < 3) return; var a = td[0].querySelector('a') || td[1].querySelector('a'), tx = function (i) { return td[i] ? td[i].textContent.replace(/\s+/g, ' ').trim() : '' };
          if (/купленн/.test(ttl)) { var per = tx(1), m = per.split(/\s+до\s+/i); out.prods.push({ name: tx(0).replace(/^#\d+\.\s*/, ''), href: a ? a.getAttribute('href') : '', a: pd(m[0]), b: m[1] ? pd(m[1]) : null, active: /активн/i.test(tx(2)), status: tx(2), ends: tx(3) }) }
          else if (/незаверш/.test(ttl)) { var pay = tr.querySelector('a[href*="/sales/shop/deal/"]'); out.open.push({ num: tx(0), name: (td[1].querySelector('a') || td[1]).textContent.replace(/\s+/g, ' ').trim(), href: pay ? pay.getAttribute('href') : '', status: tx(2), cost: tx(3) }) }
          else if (/завершен/.test(ttl)) { out.done.push({ num: tx(0), name: (td[1].querySelector('a') || td[1]).textContent.replace(/\s+/g, ' ').trim(), href: a ? a.getAttribute('href') : '', status: tx(2), cost: tx(3) }) } }) });
      return out };

    /* ---------- кольцо ---------- */
    var ring = function (size, sw, frac, warn, gid, label) { var r = (size - sw) / 2, C = 2 * Math.PI * r, L = Math.max(0, Math.min(1, frac)) * C;
      var stroke = warn ? '#ff9f6b' : 'url(#' + gid + ')';
      return '<svg role="img" aria-label="' + esc(label) + '" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">'
        + (warn ? '' : '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fef8ff"/><stop offset=".5" stop-color="#d77fff"/><stop offset="1" stop-color="#9657e8"/></linearGradient></defs>')
        + '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="' + sw + '"' + (frac <= 0 ? ' stroke-dasharray="4 10"' : '') + '/>'
        + (frac > 0 ? '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + L.toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' : '') + '</svg>' };
    var acc = function (p) { if (!p.b) return { left: null, frac: 1, warn: false, dead: !p.active }; var tot = Math.max(1, Math.round((p.b - (p.a || today)) / DAY)), left = Math.round((p.b - today) / DAY);
      if (!p.active) left = Math.min(left, 0); return { left: Math.max(0, left), frac: Math.max(0, left) / tot, warn: left > 0 && left <= 30, dead: left <= 0 || !p.active, tot: tot } };

    /* ---------- темп ---------- */
    var pace = function (lessLeft, daysLeft) { if (lessLeft <= 0) return '<b>Все уроки пройдены!</b> Пока открыт доступ, возвращайся к&nbsp;любимым темам и&nbsp;пересматривай разборы.';
      if (!daysLeft) return '<b>Осталось ' + lessLeft + ' ' + pl(lessLeft, ['урок', 'урока', 'уроков']) + '.</b>';
      var d = daysLeft * 0.9 / lessLeft;
      var s = d >= 7 ? 'Хватит 1 урока в&nbsp;неделю' : d >= 2 ? 'Хватит 1 урока в&nbsp;' + Math.floor(d) + '&nbsp;' + pl(Math.floor(d), ['день', 'дня', 'дней']) : d >= 1 ? 'Хватит 1 урока в&nbsp;день' : 'Нужно ' + Math.ceil(1 / d) + '&nbsp;' + pl(Math.ceil(1 / d), ['урок', 'урока', 'уроков']) + ' в&nbsp;день';
      return '<b>' + s + '</b>, чтобы пройти ' + (lessLeft > 1 ? 'оставшиеся ' + lessLeft + '&nbsp;' + pl(lessLeft, ['урок', 'урока', 'уроков']) : 'последний урок') + ' и&nbsp;оставить время на&nbsp;повторение.' };

    var CSS = ':root.fmp-on .fmp-host>*:not(.fmp){display:none!important}'
      + '.fmp{--s1:#161616;--s0:#0c0c0c;--hair:rgba(255,255,255,.07);--ink2:rgba(255,255,255,.58);--acc:#d77fff;--lil:#c38bff;color:#fff;font-family:"Inter Tight",Inter,system-ui,sans-serif;display:flex;flex-direction:column;gap:16px;padding:8px 0 64px}.fmp *{box-sizing:border-box}'
      + '.fmp-hd{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:40px 0 28px;margin-bottom:12px;border-bottom:1px solid var(--hair)}.fmp-hd h1{margin:0!important;font-size:56px!important;line-height:1.04!important;font-weight:500!important;letter-spacing:-.03em!important;color:#fff!important}.fmp-hd p{margin:10px 0 0;font-size:17px;color:var(--ink2)}'
      + '.fmp-btn2{display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 16px;border-radius:14px;border:1px solid var(--hair);background:var(--s1);color:#fff!important;font:500 14px/1 inherit;text-decoration:none!important;cursor:pointer;white-space:nowrap}.fmp-btn2:hover{background:#1f1f1f}'
      + '.fmp-card{background:var(--s1);border:1px solid var(--hair);border-radius:40px;padding:40px;min-width:0}@media(max-width:700px){.fmp-card{border-radius:28px;padding:24px}.fmp-hd h1{font-size:40px!important}.fmp-hd{padding-top:16px}}'
      + '.fmp-main{display:flex;flex-wrap:wrap;gap:44px;align-items:center}.fmp-ring{position:relative;width:248px;height:248px;flex:none}@media(max-width:700px){.fmp-main{gap:22px}.fmp-ring{width:200px;height:200px;margin:0 auto}.fmp-ring svg{width:200px;height:200px}}'
      + '.fmp-rc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.fmp-rc i{font-style:normal;font-size:12px;letter-spacing:.12em;font-weight:700;color:var(--ink2)}.fmp-rc b{font-size:64px;font-weight:500;letter-spacing:-.04em;line-height:1.05}.fmp-rc b.w{color:#ffb48c}.fmp-rc span{font-size:15px;color:var(--ink2)}'
      + '.fmp-mb{flex:1 1 440px;min-width:0;display:flex;flex-direction:column;gap:18px}.fmp-chips{display:flex;gap:8px;flex-wrap:wrap}.fmp-chip{font-size:12px;font-weight:700;letter-spacing:.1em;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.3);color:rgba(255,255,255,.78);text-transform:uppercase}.fmp-chip.l{background:var(--lil);border-color:var(--lil);color:#1a0b2e}.fmp-chip.w{border-color:rgba(255,159,107,.5);color:#ffb48c}'
      + '.fmp h2{margin:0!important;font-size:38px!important;line-height:1.1!important;font-weight:500!important;letter-spacing:-.025em!important;color:#fff!important}@media(max-width:700px){.fmp h2{font-size:26px!important}}'
      + '.fmp-pr{display:flex;justify-content:space-between;font-size:15px;color:var(--ink2);margin-bottom:10px}.fmp-pr b{color:#fff;font-weight:600}.fmp-bar{height:10px;border-radius:6px;background:rgba(255,255,255,.06);overflow:hidden}.fmp-bar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#6724ad,#c38bff)}'
      + '.fmp-tip{display:flex;gap:14px;align-items:flex-start;padding:18px 20px;border-radius:22px;background:rgba(195,139,255,.08);border:1px solid rgba(195,139,255,.2);font-size:16px;line-height:1.45;color:rgba(255,255,255,.78)}.fmp-tip svg{flex:none;color:var(--lil);margin-top:2px}.fmp-tip b{color:#fff;font-weight:600}.fmp-tip em{font-style:normal;color:var(--acc)}'
      + '.fmp-go{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.fmp-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:56px;padding:0 28px;border-radius:16px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font:600 17px/1 inherit;text-decoration:none!important;border:0;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),0 16px 48px -12px rgba(252,203,255,.35)}.fmp-btn:hover{filter:brightness(1.03)}.fmp-go span{font-size:14px;color:var(--ink2)}'
      + '.fmp-row{display:flex;flex-wrap:wrap;gap:16px}.fmp-row>.fmp-card{flex:2 1 520px}.fmp-row>.fmp-bonus{flex:1 1 320px}'
      + '.fmp h3{margin:0!important;font-size:24px!important;font-weight:500!important;letter-spacing:-.02em!important;color:#fff!important;line-height:1.2!important}.fmp-sub{margin:4px 0 0;font-size:14px;color:var(--ink2)}'
      + '.fmp-li{display:flex;align-items:center;gap:20px;padding:16px 0;border-top:1px solid var(--hair);color:#fff!important;text-decoration:none!important}.fmp-li:first-of-type{border-top:0}.fmp-li .t{flex:1;min-width:0}.fmp-li .t b{display:block;font-size:17px;font-weight:500}.fmp-li .t span{display:block;font-size:14px;color:var(--ink2);margin-top:2px}.fmp-li .t span.w{color:#ffb48c}.fmp-li>svg:last-child{color:rgba(255,255,255,.4);flex:none}.fmp-li:hover .t b{color:var(--acc)}'
      + '.fmp-bonus{display:flex;flex-direction:column;gap:14px}.fmp-bh{display:flex;align-items:center;gap:12px}.fmp-tile{width:44px;height:44px;border-radius:14px;background:#3e3e3e;display:grid;place-items:center;color:var(--lil);flex:none}.fmp-bv b{font-size:56px;font-weight:500;letter-spacing:-.04em;line-height:1}.fmp-bv span{font-size:20px;color:var(--ink2)}.fmp-bonus p{margin:0;font-size:15px;line-height:1.45;color:var(--ink2)}.fmp-bf{margin-top:auto;padding-top:14px;border-top:1px solid var(--hair);font-size:14px;color:var(--ink2)}'
      + '.fmp-up{border-radius:40px;padding:40px;background:linear-gradient(160deg,#6724ad 0%,#3a1470 45%,#1c0838 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12),0 24px 60px -24px rgba(96,0,255,.6);display:flex;flex-wrap:wrap;gap:40px}@media(max-width:700px){.fmp-up{border-radius:28px;padding:24px;gap:22px}}'
      + '.fmp-ul{flex:1 1 360px;min-width:0;display:flex;flex-direction:column;gap:16px}.fmp-ul .fmp-chip{align-self:flex-start;background:rgba(0,1,6,.35);border:0;color:#fccbff}.fmp-ul h3{font-size:44px!important;letter-spacing:-.03em!important;line-height:1.08!important}.fmp-ul p{margin:0;font-size:17px;line-height:1.45;color:rgba(255,255,255,.82)}.fmp-ul small{font-size:14px;color:rgba(255,255,255,.72);line-height:1.4}.fmp-ua{margin-top:auto;display:flex;flex-direction:column;gap:10px;align-items:flex-start}'
      + '.fmp-ug{flex:1.3 1 420px;min-width:0;margin:0!important;padding:0!important;list-style:none!important;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}@media(max-width:700px){.fmp-ug{grid-template-columns:1fr}.fmp-ul h3{font-size:32px!important}}.fmp-ug li{background:rgba(0,1,6,.35);border-radius:22px;padding:20px;font-size:15px;line-height:1.4;color:rgba(255,255,255,.75);margin:0!important}.fmp-ug li b{display:block;color:#fff;font-weight:600;font-size:16px;margin-bottom:4px}'
      + '.fmp-oh{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:12px}.fmp-o{display:flex;align-items:center;gap:14px;padding:16px 0;border-top:1px solid var(--hair);flex-wrap:wrap}.fmp-o .t{flex:1 1 300px;min-width:0}.fmp-o .t b{display:block;font-size:16px;font-weight:500}.fmp-o .t span{display:block;font-size:14px;color:var(--ink2);margin-top:2px}.fmp-o.gone{opacity:.45}.fmp-o.gone .t b{text-decoration:line-through}'
      + '.fmp-pay{height:40px;display:inline-flex;align-items:center;padding:0 16px;border-radius:12px;background:rgba(255,255,255,.11);color:#fff!important;font-size:14px;font-weight:500;text-decoration:none!important}.fmp-pay:hover{background:rgba(255,255,255,.16)}'
      + '.fmp-x{width:44px;height:44px;border-radius:12px;border:1px solid var(--hair);background:transparent;color:var(--ink2);display:inline-grid;place-items:center;cursor:pointer}.fmp-x:hover{color:#ff8a8a;border-color:rgba(255,138,138,.35)}.fmp-ln{height:40px;padding:0;border:0;background:transparent;color:var(--ink2);font:500 14px inherit;cursor:pointer}.fmp-ln:hover{color:#fff}.fmp-ln.a{color:var(--acc)}'
      + '.fmp-fold{display:flex;align-items:center;justify-content:space-between;width:100%;padding:24px 40px;border-radius:28px;border:1px solid var(--hair);background:var(--s0);color:rgba(255,255,255,.78);font:500 16px inherit;cursor:pointer}.fmp-fold svg{transition:transform .2s}.fmp-fold.open svg{transform:rotate(180deg)}@media(max-width:700px){.fmp-fold{padding:20px 24px}}'
      + '.fmp-dl{display:none;padding:8px 40px 16px}.fmp-dl.open{display:block}.fmp-dl a{color:#fff!important;text-decoration:none!important}.fmp-dl a:hover{color:var(--acc)!important}.fmp-bal{font-size:14px;color:var(--ink2);padding:0 4px}';

    var HK = 'fmpHide:' + U, hidden = {}; try { hidden = JSON.parse(localStorage.getItem(HK) || '{}') } catch (e) {}
    var saveH = function () { try { localStorage.setItem(HK, JSON.stringify(hidden)) } catch (e) {} };

    var render = function (root, P, me, D) {
      var main = P.prods.filter(function (p) { return /AI-дизайнер/i.test(p.name) && p.active })[0] || P.prods.filter(function (p) { return p.active })[0] || P.prods[0];
      var rest = P.prods.filter(function (p) { return p !== main });
      var name = me && me.name ? me.name : '', tar = me && me.tar ? me.tar : '', h = '';
      h += '<header class="fmp-hd"><div><h1>Мои покупки</h1><p>' + (name ? 'Привет, ' + esc(name) + '! ' : '') + 'Здесь всё, к&nbsp;чему у&nbsp;тебя есть доступ.</p></div>'
        + (P.promo ? '<a class="fmp-btn2" href="' + esc(P.promo) + '">' + ico('gift', 16) + 'Мои промокоды</a>' : '') + '</header>';
      if (main) { var A = acc(main), isCourse = /AI-дизайнер/i.test(main.name) && me, tl = D && D.total_lessons || 0, ls = me ? me.lessons || 0 : 0, pc = tl ? Math.min(100, Math.round(ls / tl * 100)) : 0;
        h += '<section class="fmp-card fmp-main" aria-label="' + esc(main.name) + '"><div class="fmp-ring">' + ring(248, 16, A.dead ? 0 : A.frac, A.warn, 'fmpG0', A.dead ? 'Доступ закончился' : A.left == null ? 'Бессрочный доступ' : 'Осталось ' + A.left + ' ' + pl(A.left, ['день', 'дня', 'дней']) + ' доступа')
          + '<div class="fmp-rc">' + (A.dead ? ico('lock', 34) + '<span style="margin-top:8px">доступ закончился</span>' : A.left == null ? '<b>∞</b><span>бессрочный доступ</span>' : '<i>ОСТАЛОСЬ</i><b' + (A.warn ? ' class="w"' : '') + '>' + A.left + '</b><span>' + pl(A.left, ['день', 'дня', 'дней']) + ' доступа</span>') + '</div></div>'
          + '<div class="fmp-mb"><div class="fmp-chips">' + (tar ? '<span class="fmp-chip l">Тариф ' + esc(tar) + '</span>' : '') + (main.b ? '<span class="fmp-chip' + (A.warn ? ' w' : '') + '">' + (A.dead ? 'Доступ был до ' : 'Доступ до ') + main.b.getDate() + ' ' + MONG[main.b.getMonth()] + ' ' + main.b.getFullYear() + '</span>' : '') + '</div>'
          + '<h2>' + esc(main.name) + '</h2>';
        if (isCourse && tl) h += '<div><div class="fmp-pr"><span><b>' + ls + ' ' + pl(ls, ['урок', 'урока', 'уроков']) + '</b> из&nbsp;' + tl + ' пройдено</span><span>' + pc + '%</span></div><div class="fmp-bar"><i style="width:' + pc + '%"></i></div></div>'
          + '<div class="fmp-tip">' + ico('bolt', 22) + '<div>' + (A.dead ? 'Доступ закончился. Напиши в&nbsp;службу заботы&nbsp;— поможем продлить и&nbsp;вернуться к&nbsp;урокам.' : pace(tl - ls, A.left) + (me.week > 0 ? ' За&nbsp;эту неделю у&nbsp;тебя <em>+' + NUM(me.week) + ' ' + pl(me.week, ['балл', 'балла', 'баллов']) + '</em>' + (me.place ? '&nbsp;— ты ' + me.place + '-й в&nbsp;рейтинге потока.' : '.') : ' На&nbsp;этой неделе уроков ещё не&nbsp;было&nbsp;— самое время продолжить.')) + '</div></div>';
        h += '<div class="fmp-go">' + (A.dead ? '<a class="fmp-btn" href="' + CARE + '?text=' + encodeURIComponent('Здравствуйте!' + (name ? ' Меня зовут ' + name + '.' : '') + ' У меня закончился доступ к курсу, хочу продлить. Подскажите, как это сделать?') + '" target="_blank" rel="noopener">Продлить доступ</a>'
          : '<a class="fmp-btn" href="' + (isCourse ? COURSE : esc(main.href)) + '">' + (isCourse && ls ? 'Продолжить обучение' : 'Перейти к&nbsp;урокам') + ico('arrow', 18) + '</a>' + (isCourse && tl ? '<span>Следующий&nbsp;— урок ' + Math.min(tl, ls + 1) + '</span>' : '')) + '</div></div></section>' }

      var R = rest.map(function (p, i) { var A = acc(p); return '<a class="fmp-li" href="' + esc(p.href) + '">' + ring(56, 6, A.dead ? 0 : A.frac, A.warn, 'fmpG' + (i + 1), A.dead ? 'Доступ закончился' : 'Осталось ' + Math.round(A.frac * 100) + '% срока')
        + '<span class="t"><b>' + esc(p.name) + '</b><span' + (A.warn ? ' class="w"' : '') + '>' + (A.dead ? 'доступ закончился' : p.b ? 'до&nbsp;' + fmtD(p.b) + ' · ещё ' + A.left + '&nbsp;' + pl(A.left, ['день', 'дня', 'дней']) : 'бессрочно') + '</span></span>' + ico('chev', 20) + '</a>' }).join('');
      var B = me && me.pts != null ? '<section class="fmp-card fmp-bonus" aria-label="Бонусный счёт"><div class="fmp-bh"><span class="fmp-tile">' + ico('star', 22) + '</span><h3>Бонусный счёт</h3></div>'
        + '<div class="fmp-bv"><b>' + NUM(me.pts) + '</b> <span>' + pl(me.pts, ['балл', 'балла', 'баллов']) + '</span></div><p>Баллы из&nbsp;рейтинга потока: 1 балл&nbsp;= 1&nbsp;₽. Ими можно оплатить часть повышения тарифа или&nbsp;других продуктов школы. В&nbsp;рейтинге они не&nbsp;списываются.</p>'
        + '<div class="fmp-bf">' + (me.week > 0 ? '+' + NUM(me.week) + ' за&nbsp;эту неделю' : 'Баллы начисляются за&nbsp;уроки, домашки и&nbsp;эфиры') + '</div></section>' : '';
      if (R || B) h += '<div class="fmp-row">' + (R ? '<section class="fmp-card" aria-label="Другие доступы"><h3 style="margin-bottom:12px!important">' + (main ? 'Ещё в&nbsp;твоём доступе' : 'Мои доступы') + '</h3>' + R + '</section>' : '') + B + '</div>';

      var up = tar && UPG[tar] && main && !acc(main).dead ? UPG[tar] : null;
      if (up) { var pts = me && me.pts ? me.pts : 0, msg = 'Здравствуйте!' + (name ? ' Меня зовут ' + name + '.' : '') + ' Я учусь на потоке и хочу повысить тариф до «' + up.to + '». Подскажите, как это сделать и как можно оплатить?' + (pts ? ' У меня на бонусном счёте ' + pts + ' ' + pl(pts, ['балл', 'балла', 'баллов']) + '.' : '');
        h += '<section class="fmp-up" aria-label="Повышение тарифа"><div class="fmp-ul"><span class="fmp-chip">Следующий уровень</span><h3>' + esc(up.to) + '</h3><p>' + up.lead + '</p>'
          + '<div class="fmp-ua"><a class="fmp-btn" href="' + CARE + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">' + ico('up', 18) + 'Повысить тариф</a><small>Откроется чат со&nbsp;службой заботы' + (pts ? '. Твои ' + NUM(pts) + ' ' + pl(pts, ['балл', 'балла', 'баллов']) + '&nbsp;— минус ' + NUM(pts) + '&nbsp;₽ к&nbsp;доплате.' : '.') + '</small></div></div>'
          + '<ul class="fmp-ug">' + up.pts.map(function (x) { return '<li><b>' + x[0] + '</b>' + x[1] + '</li>' }).join('') + '</ul></section>' }

      var O = P.open, vis = O.filter(function (o) { return !hidden[o.num] }), gone = O.filter(function (o) { return hidden[o.num] && hidden[o.num] === 'u' });
      if (O.length && (vis.length || gone.length)) { var showAll = root.__all, list = O.filter(function (o) { return !hidden[o.num] || hidden[o.num] === 'u' }), sh = showAll ? list : list.slice(0, 3);
        h += '<section class="fmp-card" aria-label="Незавершённые заказы"><div class="fmp-oh"><div><h3>Незавершённые заказы</h3><p class="fmp-sub">Ненужные можно убрать&nbsp;— на&nbsp;доступы это не&nbsp;влияет</p></div>'
          + (vis.length > 1 ? '<button type="button" class="fmp-btn2 fmp-xall">' + ico('trash', 16) + 'Убрать все</button>' : '') + '</div>'
          + sh.map(function (o) { var g = hidden[o.num] === 'u', nm = o.name.replace(/\s*\(в\s*рассрочку\)\s*/i, ''), inst = /рассрочк/i.test(o.name);
            return '<div class="fmp-o' + (g ? ' gone' : '') + '"><span class="t"><b>' + esc(nm) + '</b><span>' + (g ? esc(o.num) + ' убран' : esc(o.num.replace(/^Заказ\s*#/i, 'Заказ №')) + (inst ? ' · в&nbsp;рассрочку' : '') + ' · ' + esc(o.cost)) + '</span></span>'
              + (g ? '<button type="button" class="fmp-ln a" data-un="' + esc(o.num) + '">Вернуть</button>' : (o.href ? '<a class="fmp-pay" href="' + esc(o.href) + '">Оплатить</a>' : '') + '<button type="button" class="fmp-x" data-x="' + esc(o.num) + '" aria-label="Убрать ' + esc(o.num) + '">' + ico('trash', 18) + '</button>') + '</div>' }).join('')
          + (list.length > 3 ? '<button type="button" class="fmp-ln fmp-more">' + (showAll ? 'Свернуть' : 'Показать ещё ' + (list.length - 3)) + '</button>' : '') + '</section>' }
      var hid = O.filter(function (o) { return hidden[o.num] === 1 }).length;
      if (P.done.length || hid) h += '<div><button type="button" class="fmp-fold">' + '<span>Завершённые заказы · ' + P.done.length + (hid ? ' &nbsp;·&nbsp; убранные · ' + hid : '') + '</span>' + ico('down', 20) + '</button><div class="fmp-dl">'
        + P.done.map(function (o) { return '<div class="fmp-o"><span class="t"><b>' + (o.href ? '<a href="' + esc(o.href) + '">' + esc(o.name) + '</a>' : esc(o.name)) + '</b><span>' + esc(o.num) + ' · ' + esc(o.status) + ' · ' + esc(o.cost) + '</span></span></div>' }).join('')
        + O.filter(function (o) { return hidden[o.num] === 1 }).map(function (o) { return '<div class="fmp-o"><span class="t"><b>' + esc(o.name) + '</b><span>' + esc(o.num) + ' · убран</span></span><button type="button" class="fmp-ln a" data-un="' + esc(o.num) + '">Вернуть</button></div>' }).join('') + '</div></div>';
      if (P.bal && /[1-9]/.test(P.bal.replace(/Всего.*$/, ''))) h += '<p class="fmp-bal">' + esc(P.bal) + '</p>';
      root.innerHTML = h;
      var fold = root.querySelector('.fmp-fold'); if (fold) fold.onclick = function () { fold.classList.toggle('open'); fold.nextElementSibling.classList.toggle('open') };
      var rr = function () { var op = root.querySelector('.fmp-fold.open'); render(root, P, me, D); if (op) { var f = root.querySelector('.fmp-fold'); if (f) { f.classList.add('open'); f.nextElementSibling.classList.add('open') } } };
      [].forEach.call(root.querySelectorAll('[data-x]'), function (b) { b.onclick = function () { hidden[b.getAttribute('data-x')] = 'u'; saveH(); rr() } });
      [].forEach.call(root.querySelectorAll('[data-un]'), function (b) { b.onclick = function () { delete hidden[b.getAttribute('data-un')]; saveH(); rr() } });
      var xa = root.querySelector('.fmp-xall'); if (xa) xa.onclick = function () { O.forEach(function (o) { if (!hidden[o.num]) hidden[o.num] = 'u' }); saveH(); rr() };
      var mo = root.querySelector('.fmp-more'); if (mo) mo.onclick = function () { root.__all = !root.__all; rr() };
      /* «убран» с кнопкой «Вернуть» живёт до перезагрузки, потом заказ уходит в свёрнутый список */
    };
    Object.keys(hidden).forEach(function (k) { if (hidden[k] === 'u') hidden[k] = 1 }); saveH();

    var start = function () { if (document.querySelector('.fmp')) return true; var h1 = [].filter.call(document.querySelectorAll('.page-header h1, h1'), function (x) { return /Мои покупки/.test(x.textContent) })[0]; if (!h1) return false;
      var box = h1.closest('.main-page-container') || h1.closest('.container') || h1.parentNode.parentNode; var P = parse(box);
      var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      var host = box; host.classList.add('fmp-host'); var root = document.createElement('div'); root.className = 'fmp'; host.appendChild(root); document.documentElement.classList.add('fmp-on');
      render(root, P, null, null);
      var T = window.__fmpTest;
      Promise.all([T ? Promise.resolve(T.D) : fetch(RT + 'data.json', { cache: 'no-store' }).then(function (r) { return r.json() }), T ? Promise.resolve(T.h) : sha(U)]).then(function (r) { var D = r[0], me = (D.rows || []).filter(function (x) { return x.h === r[1] })[0] || null; render(root, P, me, D) }).catch(function () {});
      return true };
    if (!start()) document.addEventListener('DOMContentLoaded', start) })();
})();
