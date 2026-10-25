  /* ===== отчёт отдела продаж: /pl/sales/dealstat?fs=report (данные — список заказов GetCourse с фильтром по дате оплаты) ===== */
  (function () {
    if (window.top !== window) return;
    if (!/^\/pl\/sales\/dealstat\/?$/.test(location.pathname)) return;
    var isRep = /(^|[?&])fs=report(&|$)/.test(location.search);
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    var addTab = function () {
      var menu = document.querySelector('ul.standard-page-menu'); if (!menu || menu.querySelector('.fsr-tab')) return !!menu;
      var li = document.createElement('li'); li.className = 'fsr-tab' + (isRep ? ' active' : '');
      li.innerHTML = '<a href="/pl/sales/dealstat?fs=report">Отчёт для продаж</a>';
      menu.insertBefore(li, menu.firstChild);
      if (isRep) [].forEach.call(menu.querySelectorAll('li.active:not(.fsr-tab)'), function (x) { x.classList.remove('active') });
      return true };

    var RUB = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽' };
    var NUM = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') };
    var dd = function (d) { return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear() };
    var day0 = function (d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d };
    var addD = function (d, n) { d = new Date(d); d.setDate(d.getDate() + n); return d };
    var key = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) };
    var MONS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var MON3 = { 'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4, 'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11 };
    var human = function (a, b) { var s = a.getDate(), e = b.getDate();
      if (key(a) === key(b)) return s + ' ' + MONS[a.getMonth()] + ' ' + a.getFullYear();
      if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return s + '–' + e + ' ' + MONS[b.getMonth()] + ' ' + b.getFullYear();
      return s + ' ' + MONS[a.getMonth()] + (a.getFullYear() !== b.getFullYear() ? ' ' + a.getFullYear() : '') + ' — ' + e + ' ' + MONS[b.getMonth()] + ' ' + b.getFullYear() };
    var parseWhen = function (s) { s = String(s || '').toLowerCase(); var now = new Date(), d = null, tm = s.match(/(\d{1,2}):(\d{2})/), m;
      if (/сегодня/.test(s)) d = day0(now); else if (/позавчера/.test(s)) d = addD(day0(now), -2); else if (/вчера/.test(s)) d = addD(day0(now), -1);
      else if ((m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/))) d = new Date(+m[3], +m[2] - 1, +m[1]);
      else if ((m = s.match(/(\d{1,2})\s+([а-я]{3})[а-я]*\.?(?:\s+(\d{4}))?/)) && MON3[m[2]] != null) { var y = m[3] ? +m[3] : now.getFullYear(); d = new Date(y, MON3[m[2]], +m[1]); if (!m[3] && d > now) d.setFullYear(y - 1) }
      if (d && tm) d.setHours(+tm[1], +tm[2], 0, 0); return d };
    var money = function (s) { var m = String(s || '').replace(/[\s ]/g, '').match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : 0 };

    /* ---------- загрузка заказов, оплаченных в период ---------- */
    var rule = function (a, b) { return JSON.stringify({ type: 'andrule', inverted: 0, params: { children: [{ type: 'deal_payed_at', inverted: 0, params: { value: { from: dd(a), to: dd(b), toNDays: '', fromNDays: '', dateType: '', withTime: false }, valueMode: null } }], mode: 'and' } }) };
    var getPage = function (r, p) { return fetch('/pl/sales/deal/index?' + new URLSearchParams({ 'DealContext[segment_id]': '0', 'DealContext[rule_string]': r, page: p }), { credentials: 'same-origin' })
      .then(function (x) { return x.text() }).then(function (t) { return new DOMParser().parseFromString(t, 'text/html') }) };
    var rowsOf = function (doc) { var th = [].map.call(doc.querySelectorAll('table thead tr:first-child th'), function (x) { return x.textContent.trim().toLowerCase() });
      var ix = function (re) { for (var i = 0; i < th.length; i++) if (re.test(th[i])) return i; return -1 };
      var I = { client: ix(/клиент/), items: ix(/состав/), status: ix(/статус/), cost: ix(/стоимость/), mgr: ix(/менеджер/), num: ix(/^№/) };
      return [].map.call(doc.querySelectorAll('table tbody tr[data-key]'), function (tr) { var c = tr.children, t = function (i) { return i >= 0 && c[i] ? c[i].textContent.trim().replace(/\s+/g, ' ') : '' };
        var st = t(I.status), pm = st.split(/Оплачено:\s*/i)[1] || '';
        return { id: tr.getAttribute('data-key'), num: t(I.num), client: t(I.client), title: t(I.items) || '—', cost: money(t(I.cost)), mgr: t(I.mgr), when: parseWhen(pm) } }) };
    var load = function (a, b, onProg) { var r = rule(a, b);
      return getPage(r, 1).then(function (doc) { var first = rowsOf(doc), sm = (doc.querySelector('.summary') || {}).textContent || '';
        var mm = sm.replace(/[\s ]/g, '').match(/из(\d+)/), total = mm ? +mm[1] : first.length, per = Math.max(first.length, 1), pages = Math.ceil(total / per), out = first.slice(), next = 2, done = 1;
        if (pages > 400) pages = 400;
        var worker = function () { if (next > pages) return Promise.resolve(); var p = next++; return getPage(r, p).then(function (d) { out = out.concat(rowsOf(d)); done++; onProg && onProg(done, pages); return worker() }) };
        var ws = []; for (var k = 0; k < 6; k++) ws.push(worker());
        return Promise.all(ws).then(function () { var seen = {}; return out.filter(function (x) { if (seen[x.id]) return false; seen[x.id] = 1; return true }) }) }) };

    var agg = function (list) { var paid = list.filter(function (x) { return x.cost > 0 }), rev = 0, cl = {}, tar = {}, mg = {};
      paid.forEach(function (x) { rev += x.cost; cl[x.client] = 1;
        (tar[x.title] = tar[x.title] || { name: x.title, n: 0, sum: 0 }), tar[x.title].n++, tar[x.title].sum += x.cost;
        var m = x.mgr || 'Без менеджера'; (mg[m] = mg[m] || { name: m, n: 0, sum: 0 }), mg[m].n++, mg[m].sum += x.cost });
      var srt = function (o) { return Object.keys(o).map(function (k) { return o[k] }).sort(function (a, b) { return b.sum - a.sum || b.n - a.n }) };
      return { n: paid.length, rev: rev, avg: paid.length ? rev / paid.length : 0, clients: Object.keys(cl).length, free: list.length - paid.length, tariffs: srt(tar), managers: srt(mg), paid: paid } };
    var delta = function (cur, prev) { if (!prev) return cur ? { t: 'новое', c: 'up' } : { t: '—', c: '' }; var p = (cur - prev) / prev * 100; return { t: (p > 0 ? '+' : '') + (Math.abs(p) < 10 ? p.toFixed(1) : Math.round(p)).toString().replace('.', ',') + '%', c: p > 0.05 ? 'up' : p < -0.05 ? 'down' : '' } };

    /* ---------- периоды ---------- */
    var presets = function () { var t = day0(new Date()), y = addD(t, -1), ms = new Date(t.getFullYear(), t.getMonth(), 1), pms = new Date(t.getFullYear(), t.getMonth() - 1, 1), pme = addD(ms, -1);
      return [{ k: 'today', l: 'Сегодня', a: t, b: t }, { k: 'yest', l: 'Вчера', a: y, b: y }, { k: 'w', l: '7 дней', a: addD(t, -6), b: t }, { k: 'm30', l: '30 дней', a: addD(t, -29), b: t },
        { k: 'month', l: 'Этот месяц', a: ms, b: t }, { k: 'pmonth', l: 'Прошлый месяц', a: pms, b: pme }] };

    /* ---------- разметка ---------- */
    var CSS = '.fsr{--a:#c38bff;--a2:#8f4ff0;--ink:#fff;--mut:rgba(255,255,255,.55);--line:rgba(255,255,255,.08);--card:rgba(255,255,255,.035);color:var(--ink);margin-top:18px;font-feature-settings:"tnum"}'
      + '.fsr *{box-sizing:border-box}.fsr-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:18px}'
      + '.fsr-chip{border:1px solid var(--line);background:var(--card);color:#fff;border-radius:999px;padding:8px 14px;font:500 13px/1 inherit;cursor:pointer;transition:.15s}.fsr-chip:hover{border-color:rgba(195,139,255,.4)}.fsr-chip.on{background:rgba(195,139,255,.18);border-color:rgba(195,139,255,.55)}'
      + '.fsr-dates{display:flex;gap:6px;align-items:center;color:var(--mut);font-size:13px}.fsr-dates input{background:rgba(255,255,255,.05);border:1px solid var(--line);color:#fff;border-radius:10px;padding:6px 10px;font:inherit;color-scheme:dark}'
      + '.fsr-sp{flex:1}.fsr-img{background:linear-gradient(180deg,#d7b6ff,#a35cf0);color:#16072b;border:0;border-radius:999px;padding:10px 18px;font:600 14px/1 inherit;cursor:pointer;display:inline-flex;gap:8px;align-items:center;box-shadow:0 8px 30px -8px rgba(163,92,240,.7)}.fsr-img:disabled{opacity:.5;cursor:default}.fsr-img svg{width:16px;height:16px}'
      + '.fsr-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}@media(max-width:900px){.fsr-kpis{grid-template-columns:repeat(2,1fr)}}'
      + '.fsr-k{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px}.fsr-k i{font-style:normal;color:var(--mut);font-size:12px;letter-spacing:.04em;text-transform:uppercase}.fsr-k b{display:block;font-size:30px;font-weight:600;letter-spacing:-.02em;margin:8px 0 6px;white-space:nowrap}'
      + '.fsr-d{font-size:12px;color:var(--mut)}.fsr-d em{font-style:normal;font-weight:600;border-radius:999px;padding:2px 7px;margin-right:6px;background:rgba(255,255,255,.08);color:#fff}.fsr-d em.up{background:rgba(70,200,120,.16);color:#7be3a5}.fsr-d em.down{background:rgba(255,90,90,.15);color:#ff9a9a}'
      + '.fsr-box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px;margin-bottom:12px}.fsr-h{display:flex;align-items:baseline;gap:10px;margin-bottom:12px}.fsr-h b{font-size:16px;font-weight:600}.fsr-h span{color:var(--mut);font-size:12px}'
      + '.fsr-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:12px}@media(max-width:1000px){.fsr-grid{grid-template-columns:1fr}}'
      + '.fsr-chart{position:relative;height:220px}.fsr-chart svg{width:100%;height:100%;display:block;overflow:visible}.fsr-chart .gl{stroke:rgba(255,255,255,.07)}.fsr-chart text{fill:rgba(255,255,255,.45);font-size:11px}.fsr-chart rect.b{fill:url(#fsrG)}.fsr-chart g.c:hover rect.b{fill:#e2c9ff}.fsr-chart rect.h{fill:transparent;cursor:default}'
      + '.fsr-tip{position:absolute;pointer-events:none;background:#1d1828;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 10px;font-size:12px;white-space:nowrap;transform:translate(-50%,-110%);opacity:0;transition:opacity .1s;z-index:3}.fsr-tip b{display:block;font-size:14px}'
      + '.fsr-t{width:100%;border-collapse:collapse;font-size:13px}.fsr-t th{color:var(--mut);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em;text-align:right;padding:0 8px 8px}.fsr-t th:first-child,.fsr-t td:first-child{text-align:left;padding-left:0}.fsr-t td{padding:9px 8px;border-top:1px solid var(--line);text-align:right;white-space:nowrap}.fsr-t td:first-child{white-space:normal}'
      + '.fsr-sh{display:block;height:4px;border-radius:4px;background:rgba(255,255,255,.06);margin-top:6px;overflow:hidden}.fsr-sh i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#8f4ff0,#d7b6ff)}'
      + '.fsr-t a{color:#e6d4ff!important}.fsr-load{padding:60px 0;text-align:center;color:var(--mut)}.fsr-load i{display:block;width:180px;height:4px;margin:14px auto 0;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}.fsr-load i s{display:block;height:100%;width:0;background:var(--a);transition:width .2s}'
      + '.fsr-empty{padding:40px 0;text-align:center;color:var(--mut)}.fsr-note{color:var(--mut);font-size:12px;margin-top:4px}'
      + '.fsr-modal{position:fixed;inset:0;background:rgba(4,3,8,.82);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px}.fsr-mw{display:flex;flex-direction:column;align-items:center;gap:14px;max-height:100%}.fsr-mw img{max-height:calc(100vh - 120px);max-width:100%;border-radius:18px;box-shadow:0 30px 80px -20px rgba(143,79,240,.5)}'
      + '.fsr-mb{display:flex;gap:10px}.fsr-mb button{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:10px 18px;font:500 14px/1 inherit;cursor:pointer}.fsr-mb button.p{background:linear-gradient(180deg,#d7b6ff,#a35cf0);color:#16072b;border:0;font-weight:600}';

    var state = { k: 'month', a: null, b: null, cur: null, prev: null };
    var root;
    var render = function () {
      var P = presets(), cur = state.cur, prev = state.prev;
      var chips = P.map(function (p) { return '<button type="button" class="fsr-chip' + (state.k === p.k ? ' on' : '') + '" data-k="' + p.k + '">' + p.l + '</button>' }).join('');
      var bar = '<div class="fsr-bar">' + chips + '<span class="fsr-dates"><input type="date" class="fsr-a" value="' + key(state.a) + '"> — <input type="date" class="fsr-b" value="' + key(state.b) + '"></span><span class="fsr-sp"></span>'
        + '<button type="button" class="fsr-img"' + (cur ? '' : ' disabled') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>Отчёт картинкой</button></div>';
      if (!cur) { root.innerHTML = bar + '<div class="fsr-load">Собираю заказы за ' + esc(human(state.a, state.b)) + '…<i><s></s></i></div>'; bind(); return }
      var k = function (lab, val, d, sub) { return '<div class="fsr-k"><i>' + lab + '</i><b>' + val + '</b><div class="fsr-d"><em class="' + d.c + '">' + d.t + '</em>' + sub + '</div></div>' };
      var kp = '<div class="fsr-kpis">' + k('Продаж', NUM(cur.n), delta(cur.n, prev.n), 'было ' + NUM(prev.n)) + k('Выручка', RUB(cur.rev), delta(cur.rev, prev.rev), 'было ' + RUB(prev.rev))
        + k('Средний чек', RUB(cur.avg), delta(cur.avg, prev.avg), 'было ' + RUB(prev.avg)) + k('Покупателей', NUM(cur.clients), delta(cur.clients, prev.clients), 'было ' + NUM(prev.clients)) + '</div>';
      var maxT = cur.tariffs.length ? cur.tariffs[0].sum : 1;
      var tt = cur.tariffs.length ? '<table class="fsr-t"><tr><th>Тариф / продукт</th><th>Продаж</th><th>Выручка</th><th>Доля</th></tr>' + cur.tariffs.map(function (t) {
        return '<tr><td>' + esc(t.name) + '<span class="fsr-sh"><i style="width:' + Math.max(2, t.sum / maxT * 100).toFixed(1) + '%"></i></span></td><td>' + NUM(t.n) + '</td><td>' + RUB(t.sum) + '</td><td>' + (cur.rev ? Math.round(t.sum / cur.rev * 100) : 0) + '%</td></tr>' }).join('') + '</table>' : '<div class="fsr-empty">Оплат за период нет</div>';
      var mgr = cur.managers.length > 1 || (cur.managers[0] && cur.managers[0].name !== 'Без менеджера') ? '<div class="fsr-box"><div class="fsr-h"><b>Менеджеры</b></div><table class="fsr-t"><tr><th>Менеджер</th><th>Продаж</th><th>Выручка</th><th>Ср. чек</th></tr>'
        + cur.managers.map(function (m) { return '<tr><td>' + esc(m.name) + '</td><td>' + NUM(m.n) + '</td><td>' + RUB(m.sum) + '</td><td>' + RUB(m.sum / m.n) + '</td></tr>' }).join('') + '</table></div>' : '';
      var last = cur.paid.slice().sort(function (a, b) { return (b.when || 0) - (a.when || 0) }).slice(0, 12);
      var lt = last.length ? '<table class="fsr-t"><tr><th>Клиент</th><th>Когда</th><th>Сумма</th></tr>' + last.map(function (x) {
        return '<tr><td><a href="/sales/control/deal/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.client || '—') + '</a><div class="fsr-note">' + esc(x.title) + '</div></td><td>' + (x.when ? ('0' + x.when.getDate()).slice(-2) + '.' + ('0' + (x.when.getMonth() + 1)).slice(-2) + ' ' + ('0' + x.when.getHours()).slice(-2) + ':' + ('0' + x.when.getMinutes()).slice(-2) : '') + '</td><td>' + RUB(x.cost) + '</td></tr>' }).join('') + '</table>' : '<div class="fsr-empty">Пока пусто</div>';
      root.innerHTML = bar + kp
        + '<div class="fsr-box"><div class="fsr-h"><b>Выручка по дням</b><span>' + esc(human(state.a, state.b)) + (cur.free ? ' · ещё ' + cur.free + ' бесплатн. заказ(ов) не учтено' : '') + '</span></div><div class="fsr-chart"></div></div>'
        + '<div class="fsr-grid"><div class="fsr-box"><div class="fsr-h"><b>Тарифы</b><span>по выручке</span></div>' + tt + '</div><div><div class="fsr-box"><div class="fsr-h"><b>Последние оплаты</b></div>' + lt + '</div>' + mgr + '</div></div>';
      chart(root.querySelector('.fsr-chart'), series(cur.paid, state.a, state.b)); bind() };

    var series = function (paid, a, b) { var days = Math.round((day0(b) - day0(a)) / 864e5) + 1, byM = days > 62, m = {}, out = [];
      paid.forEach(function (x) { if (!x.when) return; var kk = byM ? x.when.getFullYear() + '-' + x.when.getMonth() : key(x.when); (m[kk] = m[kk] || { s: 0, n: 0 }), m[kk].s += x.cost, m[kk].n++ });
      if (byM) { var d = new Date(a.getFullYear(), a.getMonth(), 1); while (d <= b) { var kk = d.getFullYear() + '-' + d.getMonth(); out.push({ l: MONS[d.getMonth()].slice(0, 3) + ' ' + String(d.getFullYear()).slice(2), t: MONS[d.getMonth()] + ' ' + d.getFullYear(), s: (m[kk] || {}).s || 0, n: (m[kk] || {}).n || 0 }); d = new Date(d.getFullYear(), d.getMonth() + 1, 1) } }
      else for (var i = 0; i < days; i++) { var dd2 = addD(day0(a), i), k2 = key(dd2); out.push({ l: dd2.getDate() + '', t: dd2.getDate() + ' ' + MONS[dd2.getMonth()], s: (m[k2] || {}).s || 0, n: (m[k2] || {}).n || 0 }) }
      return out };
    var nice = function (v) { if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p };
    var chart = function (el, S) { var W = el.clientWidth || 800, H = 220, L = 64, B = 24, T = 8, max = nice(Math.max.apply(null, S.map(function (x) { return x.s }).concat([1])));
      var bw = (W - L) / S.length, g = '<defs><linearGradient id="fsrG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7b6ff"/><stop offset="1" stop-color="#8f4ff0"/></linearGradient></defs>';
      for (var i = 0; i <= 4; i++) { var y = T + (H - T - B) * (1 - i / 4); g += '<line class="gl" x1="' + L + '" x2="' + W + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + (max * i / 4 >= 1e6 ? (max * i / 4 / 1e6).toFixed(1).replace('.0', '') + ' млн' : max * i / 4 >= 1e3 ? Math.round(max * i / 4 / 1e3) + ' тыс' : Math.round(max * i / 4)) + '</text>' }
      var step = Math.ceil(S.length / Math.max(1, Math.floor((W - L) / 34)));
      S.forEach(function (x, i) { var h = (H - T - B) * x.s / max, w = Math.max(2, Math.min(bw - 4, 40)), xx = L + bw * i + (bw - w) / 2, y = H - B - h;
        g += '<g class="c" data-i="' + i + '">' + (x.s > 0 ? '<rect class="b" x="' + xx + '" y="' + y + '" width="' + w + '" height="' + Math.max(h, 2) + '" rx="' + Math.min(4, w / 2) + '"/>' : '') + '<rect class="h" x="' + (L + bw * i) + '" y="' + T + '" width="' + bw + '" height="' + (H - T) + '"/>'
          + (i % step === 0 ? '<text x="' + (L + bw * i + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + x.l + '</text>' : '') + '</g>' });
      el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' + g + '</svg><div class="fsr-tip"></div>';
      var tip = el.querySelector('.fsr-tip');
      [].forEach.call(el.querySelectorAll('g.c'), function (c) { c.addEventListener('mouseenter', function () { var x = S[+c.getAttribute('data-i')], i = +c.getAttribute('data-i');
        tip.innerHTML = '<b>' + RUB(x.s) + '</b>' + x.t + ' · ' + x.n + ' прод.'; tip.style.left = (L + bw * i + bw / 2) / W * 100 + '%'; tip.style.top = Math.max(30, (H - B - (H - T - B) * x.s / max)) + 'px'; tip.style.opacity = 1 });
        c.addEventListener('mouseleave', function () { tip.style.opacity = 0 }) }) };

    var run = function () { var a = state.a, b = state.b, len = Math.round((b - a) / 864e5) + 1, pa = addD(a, -len), pb = addD(a, -1), token = state.token = Math.random();
      state.cur = null; render();
      var prog = function (d, n) { var s = root.querySelector('.fsr-load s'); if (s) s.style.width = Math.round(d / n * 100) + '%' };
      Promise.all([load(a, b, prog), load(pa, pb)]).then(function (r) { if (token !== state.token) return; state.cur = agg(r[0]); state.prev = agg(r[1]); state.pa = pa; state.pb = pb; render() })
        .catch(function () { if (token !== state.token) return; root.innerHTML = '<div class="fsr-empty">Не получилось загрузить заказы. Обнови страницу.</div>' }) };
    var setP = function (k) { var p = presets().filter(function (x) { return x.k === k })[0]; if (!p) return; state.k = k; state.a = p.a; state.b = p.b; try { sessionStorage.setItem('fsrK', k) } catch (e) {} run() };
    var bind = function () {
      [].forEach.call(root.querySelectorAll('.fsr-chip'), function (b) { b.onclick = function () { setP(b.getAttribute('data-k')) } });
      var ia = root.querySelector('.fsr-a'), ib = root.querySelector('.fsr-b');
      var ch = function () { if (!ia.value || !ib.value) return; var a = new Date(ia.value + 'T00:00'), b = new Date(ib.value + 'T00:00'); if (a > b) { var t = a; a = b; b = t } state.k = 'custom'; state.a = a; state.b = b; run() };
      ia.onchange = ch; ib.onchange = ch;
      var im = root.querySelector('.fsr-img'); if (im) im.onclick = function () { im.disabled = true; card().then(function (url) { im.disabled = false; modal(url) }).catch(function () { im.disabled = false }) } };

    /* ---------- отчёт картинкой: canvas 1080×1350 ---------- */
    var card = function () {
      var c = document.createElement('canvas'), W = 1080, H = 1350; c.width = W; c.height = H; var x = c.getContext('2d'), F = '"Inter Tight", Inter, system-ui, sans-serif', cur = state.cur, prev = state.prev;
      var rr = function (X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath() };
      var fit = function (s, w) { if (x.measureText(s).width <= w) return s; while (s.length > 1 && x.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…' };
      return (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 40px "Inter Tight"'), document.fonts.load('500 20px "Inter Tight"')]).catch(function () {}) : Promise.resolve()).then(function () {
        x.fillStyle = '#060509'; x.fillRect(0, 0, W, H);
        var gr = x.createRadialGradient(W / 2, H + 120, 40, W / 2, H + 120, 900); gr.addColorStop(0, 'rgba(163,92,240,.55)'); gr.addColorStop(.5, 'rgba(110,50,200,.18)'); gr.addColorStop(1, 'rgba(6,5,9,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        var g2 = x.createRadialGradient(W - 120, -60, 10, W - 120, -60, 520); g2.addColorStop(0, 'rgba(195,139,255,.22)'); g2.addColorStop(1, 'rgba(6,5,9,0)'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
        x.textBaseline = 'alphabetic';
        x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '500 24px ' + F; x.fillText('OduvanovSchool · отдел продаж', 72, 104);
        x.fillStyle = '#fff'; x.font = '600 64px ' + F; x.fillText('Отчёт по продажам', 72, 184);
        x.fillStyle = '#d7b6ff'; x.font = '500 32px ' + F; x.fillText(human(state.a, state.b), 72, 234);
        var tiles = [['Продаж', NUM(cur.n), delta(cur.n, prev.n)], ['Выручка', RUB(cur.rev), delta(cur.rev, prev.rev)], ['Средний чек', RUB(cur.avg), delta(cur.avg, prev.avg)], ['Покупателей', NUM(cur.clients), delta(cur.clients, prev.clients)]];
        tiles.forEach(function (t, i) { var X = 72 + (i % 2) * 476, Y = 284 + Math.floor(i / 2) * 186, w = 460, h = 170;
          rr(X, Y, w, h, 28); x.fillStyle = 'rgba(255,255,255,.045)'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.09)'; x.lineWidth = 2; x.stroke();
          x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '500 22px ' + F; x.fillText(t[0].toUpperCase(), X + 32, Y + 52);
          x.fillStyle = '#fff'; x.font = '600 ' + (t[1].length > 11 ? 50 : 60) + 'px ' + F; x.fillText(t[1], X + 32, Y + 116);
          var d = t[2]; x.font = '600 22px ' + F; var dw = x.measureText(d.t).width + 24; rr(X + 32, Y + 130, dw, 30, 15); x.fillStyle = d.c === 'up' ? 'rgba(70,200,120,.18)' : d.c === 'down' ? 'rgba(255,90,90,.18)' : 'rgba(255,255,255,.1)'; x.fill();
          x.fillStyle = d.c === 'up' ? '#7be3a5' : d.c === 'down' ? '#ff9a9a' : '#fff'; x.fillText(d.t, X + 44, Y + 153);
          x.fillStyle = 'rgba(255,255,255,.4)'; x.font = '500 20px ' + F; x.fillText('к прошлому периоду', X + 32 + dw + 12, Y + 153) });
        /* мини-график */
        var S = series(cur.paid, state.a, state.b), cy = 690, ch = 140, cw = W - 144, mx = Math.max.apply(null, S.map(function (s) { return s.s }).concat([1])), bw = cw / S.length;
        x.fillStyle = '#fff'; x.font = '600 28px ' + F; x.fillText('Выручка по дням', 72, cy);
        var bg = x.createLinearGradient(0, cy + 24, 0, cy + 24 + ch); bg.addColorStop(0, '#e2c9ff'); bg.addColorStop(1, '#8f4ff0');
        S.forEach(function (s, i) { var h = ch * s.s / mx, w = Math.max(3, Math.min(bw - 6, 48)); x.fillStyle = s.s ? bg : 'rgba(255,255,255,.08)'; rr(72 + bw * i + (bw - w) / 2, cy + 24 + ch - Math.max(h, 4), w, Math.max(h, 4), Math.min(6, w / 2)); x.fill() });
        /* тарифы */
        var ty = 900; x.fillStyle = '#fff'; x.font = '600 28px ' + F; x.fillText('Тарифы', 72, ty);
        var top = cur.tariffs.slice(0, 5), mT = top.length ? top[0].sum : 1;
        if (!top.length) { x.fillStyle = 'rgba(255,255,255,.5)'; x.font = '500 24px ' + F; x.fillText('Оплат за период нет', 72, ty + 56) }
        top.forEach(function (t, i) { var Y = ty + 28 + i * 56; x.font = '500 23px ' + F; x.fillStyle = '#fff'; x.fillText(fit(t.name, 600), 72, Y + 26);
          x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,.6)'; x.fillText(t.n + ' шт', 812, Y + 26); x.fillStyle = '#fff'; x.font = '600 23px ' + F; x.fillText(RUB(t.sum), W - 72, Y + 26); x.textAlign = 'left';
          rr(72, Y + 38, W - 144, 6, 3); x.fillStyle = 'rgba(255,255,255,.07)'; x.fill(); var lg = x.createLinearGradient(72, 0, W - 72, 0); lg.addColorStop(0, '#8f4ff0'); lg.addColorStop(1, '#d7b6ff'); rr(72, Y + 38, Math.max(8, (W - 144) * t.sum / mT), 6, 3); x.fillStyle = lg; x.fill() });
        if (cur.tariffs.length > 5) { x.fillStyle = 'rgba(255,255,255,.45)'; x.font = '500 20px ' + F; x.fillText('и ещё ' + (cur.tariffs.length - 5) + ' — в кабинете', 72, ty + 28 + 5 * 56 + 22) }
        var now = new Date(); x.fillStyle = 'rgba(255,255,255,.35)'; x.font = '500 20px ' + F; x.fillText('Сформировано ' + dd(now) + ' в ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2), 72, H - 48);
        return new Promise(function (res) { c.toBlob(function (b) { res(URL.createObjectURL(b)) }, 'image/png') }) }) };
    var modal = function (url) { var m = document.createElement('div'); m.className = 'fsr-modal';
      var name = 'Продажи ' + (key(state.a) === key(state.b) ? dd(state.a) : dd(state.a) + '–' + dd(state.b)) + '.png';
      m.innerHTML = '<div class="fsr-mw"><img alt="Отчёт" src="' + url + '"><div class="fsr-mb"><button type="button" class="p fsr-dl">Скачать PNG</button><button type="button" class="fsr-cp">Копировать</button><button type="button" class="fsr-x">Закрыть</button></div></div>';
      document.body.appendChild(m);
      var close = function () { m.remove(); document.removeEventListener('keydown', kd) }, kd = function (e) { if (e.key === 'Escape') close() }; document.addEventListener('keydown', kd);
      m.addEventListener('click', function (e) { if (e.target === m) close() }); m.querySelector('.fsr-x').onclick = close;
      m.querySelector('.fsr-dl').onclick = function () { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove() };
      var cp = m.querySelector('.fsr-cp'); cp.onclick = function () { fetch(url).then(function (r) { return r.blob() }).then(function (b) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]) })
        .then(function () { cp.textContent = 'Скопировано' }).catch(function () { cp.textContent = 'Не вышло — скачай' }) } };

    var start = function () { if (!addTab() || !isRep || document.querySelector('.fsr')) return;
      var content = document.querySelector('.standard-page-content'); if (!content) return;
      var h1 = content.querySelector('h1'); if (h1) h1.textContent = 'Отчёт отдела продаж';
      document.title = 'Отчёт отдела продаж';
      var menu = content.querySelector('ul.standard-page-menu');
      [].forEach.call(content.children, function (ch) { if (ch !== h1 && ch !== menu && ch.tagName !== 'SCRIPT' && ch.tagName !== 'STYLE') ch.style.display = 'none' });
      var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      root = document.createElement('div'); root.className = 'fsr'; (menu || h1).insertAdjacentElement('afterend', root);
      var k = 'month'; try { k = sessionStorage.getItem('fsrK') || 'month' } catch (e) {}
      setP(k) };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  })();
