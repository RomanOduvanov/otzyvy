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
          font(400, 19); var nx2 = [['минимального', pv.min], ['оптимального', pv.opt], ['идеального', pv.ideal]].filter(function (z) { return z[1] > got })[0]; var pl1 = (curM ? 'Прогноз на месяц ' : 'Итог месяца ') + SHORT(curM ? fc : got) + ' ₽', pl2 = nx2 ? 'до ' + nx2[0].replace('ого', 'ого') + ' ' + SHORT(nx2[1] - got) + ' ₽' + (curM && last.getDate() > p.b.getDate() ? ' · ' + SHORT((nx2[1] - got) / (last.getDate() - p.b.getDate())) + ' ₽ в день' : '') : 'идеальный план выполнен';
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
