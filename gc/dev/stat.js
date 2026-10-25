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
      + '.fss-modal{position:fixed;inset:0;background:rgba(0,1,6,.86);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px}.fss-mw{display:flex;flex-direction:column;align-items:center;gap:16px;max-height:100%}.fss-mw img{max-height:calc(100vh - 120px);max-width:100%;border-radius:22px;border:1px solid rgba(255,255,255,.08)}.fss-mb{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}';

    var root, body;
    var loading = function (t) { body.innerHTML = '<div class="fss-load">' + (t || 'Загружаю данные GetCourse…') + '</div>' };
    var fail = function () { body.innerHTML = '<div class="fss-empty">GetCourse не отдал данные. Обнови страницу или открой <a href="/pl/sales/dealstat?fs=gc" style="color:#d77fff">классический вид</a>.</div>' };
    var cmpName = function (p) { return p.pa ? human(p.pa, p.pb) : '' };

    /* ---------- вкладка «Продажи» ---------- */
    var MODES = { net: { l: 'На вывод', s: 'после комиссий GetCourse и банков', lead: ' на вывод пришло ' }, gross: { l: 'Оплачено клиентами', s: 'до комиссий', lead: ' клиенты заплатили ' }, gc: { l: 'Сумма оплат GetCourse', s: 'как в стандартной статистике', lead: ' по GetCourse оплачено на ' } };
    var gcBucket = function (b) { return dealTot(day0(b[0]), day0(b[b.length - 1])).then(function (t) { return t.sum }) };
    var pool = function (arr, fn) { var out = new Array(arr.length), i = 0; var w = function () { if (i >= arr.length) return Promise.resolve(); var j = i++; return fn(arr[j]).then(function (v) { out[j] = v; return w() }) }; var ws = []; for (var k = 0; k < 6; k++) ws.push(w()); return Promise.all(ws).then(function () { return out }) };
    var renderSales = function () { var tok = S.tok = Math.random(); loading();
      payments().then(function (PAY) { C.payV = PAY; if (tok !== S.tok) return; var p = P(), n = ndays(p.a, p.b);
        var g = S.gran && grans(n).some(function (x) { return x[0] === S.gran && x[2] }) ? S.gran : autoGran(n);
        var rc = paySum(PAY, p.a, p.b), rp = p.pa ? paySum(PAY, p.pa, p.pb) : null, cmp = cmpName(p);
        var modes = PAY.gross ? ['gross', 'gc'] : ['net', 'gross', 'gc']; if (modes.indexOf(S.money) < 0) S.money = modes[0];
        body.innerHTML = '<p class="fss-lead" id="fssLead"></p>'
          + (PAY.gross ? '<div class="fss-note">Чистые деньги «на вывод» не подключены в этом браузере. Открой страницу по ссылке доступа — или вставь ключ: <input class="fss-key" placeholder="ключ доступа" style="margin-left:8px;width:220px;background:#0c0c0c;border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:8px;padding:5px 8px;font:inherit"> <button type="button" class="fss-btn pri fss-keygo" style="height:30px;padding:0 12px;display:inline-flex">Подключить</button></div>' : '')
          + '<div class="fss-card"><div class="fss-mt" id="fssMT"></div>'
          + '<div class="fss-strip" id="fssStrip"></div><div class="fss-ctl"><div class="fss-leg"><span><i></i>' + esc(human(p.a, p.b)) + '</span>' + (rp ? '<span><i class="p"></i>' + esc(cmp) + '</span>' : '') + '</div>'
          + '<div class="fss-seg" id="fssG">' + grans(n).map(function (x) { return '<button type="button" data-g="' + x[0] + '"' + (x[2] ? '' : ' disabled') + (x[0] === g ? ' class="on"' : '') + '>' + x[1] + '</button>' }).join('') + '</div></div><div class="fss-ch" id="fssC"></div></div>'
          + '<div class="fss-row"><div class="fss-card"><div class="fss-sec">Тарифы</div><p class="fss-sub">какие продукты покупали за период</p><div id="fssTar"><div class="fss-sk"></div><div class="fss-sk"></div><div class="fss-sk"></div></div></div>'
          + '<div class="fss-card"><div class="fss-sec">Последние оплаты</div><p class="fss-sub">оплаченные заказы, новые сверху</p><div id="fssLast"><div class="fss-sk"></div><div class="fss-sk"></div><div class="fss-sk"></div></div></div></div>';
        var kg = body.querySelector('.fss-keygo'); if (kg) kg.onclick = function () { var v = (body.querySelector('.fss-key').value || '').trim(); if (!/^[0-9a-f]{16,64}$/.test(v)) return; try { localStorage.setItem('fsStatKey', v) } catch (e) {} C.pay = null; S.money = 'net'; renderSales() };
        if (PAY.last) setTimeout(function () { lastNet(PAY, p) }, 0);
        var st = { rc: rc, rp: rp, p: p, g: g, PAY: PAY, cur: null, prev: null, dl: null, dlp: null };
        S.view = st;
        var money = function (mode, which) { var r = which === 'p' ? rp : rc, t = which === 'p' ? st.prev : st.cur; if (!r) return null; return mode === 'net' ? r.sum : mode === 'gross' ? r.gross : t ? t.sum : null };
        var lead = function () { var el = body.querySelector('#fssLead'); if (!el) return; var md = S.money, v = money(md), v0 = money(md, 'p'), t = st.cur;
          el.innerHTML = leadP(p) + MODES[md].lead + '<em>' + (v == null ? '…' : RUB(v)) + '</em>' + (t ? ' и&nbsp;' + (pl(t.n, [1, 2, 2]) === 1 ? 'закрыта' : 'закрыто') + ' <em>' + NUM(t.n) + '</em>&nbsp;' + pl(t.n, ['продажа', 'продажи', 'продаж']) : '')
            + (rp && v != null && v0 != null ? '<br><span>' + (v0 ? (v >= v0 ? 'Это на ' + Math.round(pct(v, v0)) + '% больше' : 'Это на ' + Math.round(-pct(v, v0)) + '% меньше') + ', чем за ' + esc(cmp) + ' (' + RUB(v0) + ')' : 'За ' + esc(cmp) + ' оплат не было') + '</span>' : '') };
        var strip = function () { var el = body.querySelector('#fssStrip'); if (!el) return; var it = [];
          it.push(['gross', 'Клиенты заплатили', RUB(rc.gross)]); if (!PAY.gross) { it.push(['', 'Комиссии GetCourse и банков', '−' + RUB(rc.fee) + (rc.gross ? ' · ' + (rc.fee / rc.gross * 100).toFixed(1).replace('.', ',') + '%' : '')]); it.push(['net', 'На вывод', RUB(rc.sum)]) }
          it.push(['gc', 'В статистике GetCourse', st.cur ? RUB(st.cur.sum) : '…']);
          el.innerHTML = it.map(function (x) { return '<span' + (x[0] ? ' data-m="' + x[0] + '" class="sw' + (S.money === x[0] ? ' on' : '') + '"' : '') + '>' + x[1] + ' <b>' + x[2] + '</b></span>' }).join('')
            + '<span class="fss-hint" title="Оплачено клиентами — все принятые платежи, включая предоплаты и доплаты. На вывод — то же за вычетом комиссий GetCourse и банков (рассрочки 18–30%, карты 3,5%). В статистике GetCourse — оплаты только по заказам, полностью оплаченным в этот период.">что есть что?</span>';
          [].forEach.call(el.querySelectorAll('.sw'), function (s) { s.onclick = function () { S.money = s.getAttribute('data-m'); S.metric = 'rev'; refresh() } }) };
        var metrics = function () { var t = st.cur, q = st.prev, md = S.money, v = money(md), v0 = money(md, 'p'), mm = [
            { k: 'rev', l: MODES[md].l, v: v == null ? '…' : RUB(v), d: rp && v != null && v0 != null ? dchip(v, v0, 'к ' + cmp) : '<span class="fss-dl">' + MODES[md].s + '</span>', can: 1 },
            { k: 'cnt', l: 'Продажи', v: t ? NUM(t.n) : '…', d: t && q ? dchip(t.n, q.n, 'к ' + cmp) : '<span class="fss-dl">оплаченных заказов</span>', can: 1 },
            { k: 'avg', l: 'Средний чек', v: t ? RUB(t.avg) : '…', d: t && q ? dchip(t.avg, q.avg, 'к ' + cmp) : '<span class="fss-dl">&nbsp;</span>' },
            { k: 'buy', l: 'Покупатели', v: t ? NUM(t.buyers) : '…', d: t && q ? dchip(t.buyers, q.buyers, 'к ' + cmp) : '<span class="fss-dl">&nbsp;</span>' }];
          var mt = body.querySelector('#fssMT'); if (!mt) return;
          mt.innerHTML = mm.map(function (m) { var sw = m.k === 'rev' ? '<span class="fss-sw" title="Нажми ещё раз, чтобы переключить: на вывод → оплачено → GetCourse">' + modes.map(function (x) { return '<i' + (x === md ? ' class="on"' : '') + '></i>' }).join('') + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/></svg></span>' : '';
            return '<button type="button" class="fss-m' + (m.can ? ' can' : '') + (S.metric === m.k ? ' on' : '') + '" data-k="' + m.k + '"' + (m.can ? '' : ' tabindex="-1" title="Итог за период"') + '><i>' + m.l + sw + '</i><b>' + m.v + '</b>' + m.d + '</button>' }).join('');
          [].forEach.call(mt.querySelectorAll('.fss-m.can'), function (b) { b.onclick = function () { var k = b.getAttribute('data-k');
            if (k === 'rev' && S.metric === 'rev') S.money = modes[(modes.indexOf(S.money) + 1) % modes.length]; S.metric = k; refresh() } }) };
        var draw = function () { var el = body.querySelector('#fssC'); if (!el) return; var dk = dayKeys(p.a, p.b), bk = bucket(dk, st.g), pk = p.pa ? bucket(dayKeys(p.pa, p.pb), st.g) : null, md = S.money, dtok = st.dtok = Math.random();
          var fin = function (cur, prev) { if (dtok !== st.dtok) return; if (prev && prev.every(function (x) { return !x })) prev = null;
            line(el, cur, prev, S.metric === 'rev' ? { h: 300 } : { h: 300, int: 1, fmt: function (x) { return NUM(x) }, tf: function (x) { return NUM(x) + ' ' + pl(x, ['продажа', 'продажи', 'продаж']) } }) };
          var mk = function (bks, vals, withAx) { return bks.map(function (b, i) { return vals[i] == null ? null : withAx ? { v: vals[i], ax: lbl(b, st.g, 1), t: lbl(b, st.g) } : { v: vals[i], t: lbl(b, st.g) } }) };
          if (S.metric === 'rev' && md === 'gc') { el.innerHTML = '<div class="fss-load">Беру оплаты из статистики GetCourse…</div>';
            Promise.all([pool(bk, gcBucket), pk ? pool(pk, gcBucket) : null]).then(function (r) { fin(mk(bk, r[0], 1), pk ? mk(pk, r[1]) : null) }).catch(function () { el.innerHTML = '<div class="fss-empty">GetCourse не отдал данные</div>' }); return }
          if (S.metric === 'rev') { var f = function (arr) { return arr.reduce(function (s, d) { var x = PAY.m[key(d)]; return s + (x ? (md === 'gross' ? x.gross : x.sum) : 0) }, 0) };
            return fin(mk(bk, bk.map(f), 1), pk ? mk(pk, pk.map(f)) : null) }
          if (!st.dl) { el.innerHTML = '<div class="fss-load">Считаю продажи по дням…</div>'; return }
          var cnt = function (list) { return function (arr) { if (!list) return null; var a = day0(arr[0]), z = addD(day0(arr[arr.length - 1]), 1); return list.filter(function (x) { return x.when && x.when >= a && x.when < z }).length } };
          fin(mk(bk, bk.map(cnt(st.dl)), 1), pk ? mk(pk, pk.map(cnt(st.dlp))) : null) };
        var refresh = function () { lead(); strip(); metrics(); draw() };
        st.refresh = refresh; refresh();
        [].forEach.call(body.querySelectorAll('#fssG button'), function (b) { b.onclick = function () { if (b.disabled) return; S.gran = st.g = b.getAttribute('data-g'); [].forEach.call(body.querySelectorAll('#fssG button'), function (x) { x.classList.toggle('on', x === b) }); draw() } });
        Promise.all([dealTot(p.a, p.b), p.pa ? dealTot(p.pa, p.pb) : null]).then(function (r) { if (tok !== S.tok) return; st.cur = r[0]; st.prev = r[1]; lead(); strip(); metrics(); if (S.money === 'gc' && S.metric === 'rev') draw(); setImg() }).catch(function () {});
        deals(p.a, p.b).then(function (list) { if (tok !== S.tok) return; st.dl = list; tariffs(list); if (!PAY.last) lastPays(list); if (S.metric === 'cnt') draw(); setImg() }).catch(function () { var t = body.querySelector('#fssTar'); if (t) t.innerHTML = '<div class="fss-empty">Не удалось загрузить заказы</div>' });
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
    var setImg = function () { var b = root && root.querySelector('.fss-img'); if (b) b.disabled = !(tab === 'sales' && S.view && S.view.cur && S.view.dl) };
    var card = function () { var st = S.view, p = st.p, c = st.cur, q = st.prev, rc = st.rc, rp = st.rp, T = tariffList(st.dl);
      var cv = document.createElement('canvas'), W = 1080, H = 1350; cv.width = W; cv.height = H; var x = cv.getContext('2d'), F = '"Inter Tight", Inter, system-ui, sans-serif';
      var rr = function (X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath() };
      var fit = function (s, w) { if (x.measureText(s).width <= w) return s; while (s.length > 1 && x.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…' };
      var trk = function (t, X, Y, sp) { for (var i = 0; i < t.length; i++) { x.fillText(t[i], X, Y); X += x.measureText(t[i]).width + sp } return X };
      var dtxt = function (a, b) { var v = pct(a, b); if (v == null) return null; return { s: (v > 0.5 ? '↑ ' : v < -0.5 ? '↓ ' : '≈ ') + (Math.abs(v) < 10 ? Math.abs(v).toFixed(1).replace('.', ',') : Math.round(Math.abs(v))) + '%', c: v > 0.5 ? '#d77fff' : v < -0.5 ? '#ff8f8f' : 'rgba(255,255,255,.55)' } };
      var cardBox = function (X, Y, w, h) { rr(X, Y, w, h, 36); x.fillStyle = '#161616'; x.fill(); x.strokeStyle = 'rgba(255,255,255,.06)'; x.lineWidth = 2; x.stroke() };
      return (document.fonts && document.fonts.load ? Promise.all(['500 40px "Inter Tight"', '600 40px "Inter Tight"', '700 20px "Inter Tight"', '400 20px "Inter Tight"'].map(function (f) { return document.fonts.load(f) })).catch(function () {}) : Promise.resolve()).then(function () {
        x.fillStyle = '#000106'; x.fillRect(0, 0, W, H);
        /* свет снизу: электрический фиолетовый → сирень у кромки */
        var g1 = x.createRadialGradient(W / 2, (H + 140) / .55, 0, W / 2, (H + 140) / .55, 820); g1.addColorStop(0, 'rgba(150,87,232,.95)'); g1.addColorStop(.35, 'rgba(96,0,255,.55)'); g1.addColorStop(.7, 'rgba(28,8,56,.5)'); g1.addColorStop(1, 'rgba(0,1,6,0)');
        x.save(); x.scale(1, .55); x.fillStyle = g1; x.fillRect(0, 0, W, H / .55); x.restore();
        var g2 = x.createRadialGradient(W / 2, H + 40, 0, W / 2, H + 40, 420); g2.addColorStop(0, 'rgba(252,203,255,.75)'); g2.addColorStop(1, 'rgba(252,203,255,0)'); x.save(); x.translate(0, H * .78); x.scale(1, .22); x.fillStyle = g2; x.fillRect(0, (H * .22 - H * .78) / .22, W, H / .22); x.restore();
        /* световые колонны сверху */
        for (var i = 0; i < 6; i++) { var cx = W / 12 + i * W / 6, lg0 = x.createLinearGradient(0, 0, 0, H * .75); lg0.addColorStop(0, 'rgba(255,255,255,.06)'); lg0.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = lg0; x.fillRect(cx, 0, 1, H * .75) }
        /* зерно */
        var gd = x.getImageData(0, 0, W, H), dt = gd.data; for (var j = 0; j < dt.length; j += 4) { var nz = (Math.random() - .5) * 16; dt[j] += nz; dt[j + 1] += nz; dt[j + 2] += nz } x.putImageData(gd, 0, 0);
        var M = 72;
        /* шапка: чип + бренд */
        x.font = '700 18px ' + F; var chipT = 'ОТЧЁТ ОТДЕЛА ПРОДАЖ', cw = 0; for (var k = 0; k < chipT.length; k++) cw += x.measureText(chipT[k]).width + 2;
        rr(M, 64, cw + 36, 40, 20); x.fillStyle = '#c38bff'; x.fill(); x.fillStyle = '#000106'; trk(chipT, M + 18, 91, 2);
        x.font = '500 24px ' + F; x.fillStyle = 'rgba(255,255,255,.55)'; x.textAlign = 'right'; x.fillText('OduvanovSchool', W - M, 92); x.textAlign = 'left';
        /* двухтоновый заголовок */
        var hp = human(p.a, p.b), fs = 84; x.font = '500 ' + fs + 'px ' + F; while (fs > 44 && x.measureText(hp).width > W - 2 * M) { fs -= 2; x.font = '500 ' + fs + 'px ' + F }
        x.fillStyle = '#fff'; x.fillText('Продажи', M, 214); x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText(hp, M, 304);
        /* главная карточка: выручка */
        cardBox(M, 340, W - 2 * M, 220);
        x.font = '400 26px ' + F; x.fillStyle = 'rgba(255,255,255,.55)'; var md = S.money || 'net', mv = md === 'net' ? rc.sum : md === 'gross' ? rc.gross : c.sum, mv0 = !rp ? null : md === 'net' ? rp.sum : md === 'gross' ? rp.gross : q ? q.sum : null; x.fillText({ net: 'На вывод — после комиссий GetCourse и банков', gross: 'Оплачено клиентами — до комиссий', gc: 'Сумма оплат по статистике GetCourse' }[md], M + 40, 392);
        x.font = '500 104px ' + F; x.fillStyle = '#fff'; x.fillText(RUB(mv), M + 36, 496);
        var d0 = mv0 != null ? dtxt(mv, mv0) : null; if (d0) { x.font = '600 26px ' + F; x.fillStyle = d0.c; x.fillText(d0.s, M + 40, 538); var dw = x.measureText(d0.s).width; x.font = '400 26px ' + F; x.fillStyle = 'rgba(255,255,255,.44)'; x.fillText('к ' + human(p.pa, p.pb) + ' · было ' + RUB(mv0), M + 52 + dw, 538) }
        /* три карточки */
        var cw3 = (W - 2 * M - 32) / 3; [['Продажи', NUM(c.n), q ? dtxt(c.n, q.n) : null], ['Средний чек', RUB(c.avg), q ? dtxt(c.avg, q.avg) : null], ['Покупатели', NUM(c.buyers), q ? dtxt(c.buyers, q.buyers) : null]].forEach(function (t, i2) {
          var X = M + i2 * (cw3 + 16), Y = 576; cardBox(X, Y, cw3, 160); x.font = '400 24px ' + F; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText(t[0], X + 32, Y + 48);
          x.font = '500 ' + (t[1].length > 9 ? 44 : 56) + 'px ' + F; x.fillStyle = '#fff'; x.fillText(t[1], X + 30, Y + 108);
          if (t[2]) { x.font = '600 22px ' + F; x.fillStyle = t[2].c; x.fillText(t[2].s, X + 32, Y + 140) } });
        /* график по дням */
        var Y2 = 752, h2 = 200; cardBox(M, Y2, W - 2 * M, h2); x.font = '400 24px ' + F; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText('Поступления ' + ({ day: 'по дням', week: 'по неделям', month: 'по месяцам' })[st.g], M + 40, Y2 + 46);
        var bk = bucket(dayKeys(p.a, p.b), st.g), vals = bk.map(function (b) { return b.reduce(function (s, d) { var z = st.PAY.m[key(d)]; return s + (z ? z.sum : 0) }, 0) }), mx = Math.max.apply(null, vals.concat([1]));
        var cx0 = M + 40, cw0 = W - 2 * M - 80, ch0 = 90, cy0 = Y2 + 72, bw = cw0 / vals.length;
        vals.forEach(function (v, i3) { var h = v ? Math.max(6, ch0 * v / mx) : 4, w = Math.max(4, Math.min(bw - 6, 44)); rr(cx0 + bw * i3 + (bw - w) / 2, cy0 + ch0 - h, w, h, Math.min(5, w / 2)); x.fillStyle = v ? '#c38bff' : 'rgba(255,255,255,.08)'; x.fill() });
        x.font = '400 18px ' + F; x.fillStyle = 'rgba(255,255,255,.44)'; var axd = function (b, end) { var d = end ? b[b.length - 1] : b[0]; return st.g === 'month' ? MONN[d.getMonth()] : d.getDate() + ' ' + MONS3[d.getMonth()] }; x.fillText(axd(bk[0]), cx0, cy0 + ch0 + 30); x.textAlign = 'right'; if (bk.length > 1) x.fillText(axd(bk[bk.length - 1], 1), cx0 + cw0, cy0 + ch0 + 30); x.textAlign = 'left';
        /* тарифы */
        var Y3 = 968, top = T.slice(0, 4), tn = st.dl.length, h3 = 84 + Math.max(1, top.length) * 44; cardBox(M, Y3, W - 2 * M, h3);
        x.font = '400 24px ' + F; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText('Что покупали', M + 40, Y3 + 46);
        if (!top.length) { x.font = '400 24px ' + F; x.fillStyle = 'rgba(255,255,255,.44)'; x.fillText('Оплат за период не было', M + 40, Y3 + 96) }
        top.forEach(function (t, i4) { var Y = Y3 + 90 + i4 * 44; x.font = '500 24px ' + F; x.fillStyle = '#fff'; x.fillText(fit(t.name, 640), M + 40, Y);
          x.textAlign = 'right'; x.font = '600 24px ' + F; x.fillStyle = '#fff'; var cs = NUM(t.n) + ' шт', cwid = x.measureText(cs).width; x.fillText(cs, W - M - 40, Y); x.font = '400 24px ' + F; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText(Math.round(t.n / tn * 100) + '%', W - M - 64 - Math.max(cwid, 60), Y); x.textAlign = 'left' });
        var now = new Date(); x.font = '400 20px ' + F; x.fillStyle = 'rgba(255,255,255,.6)'; x.textAlign = 'center'; x.fillText('Данные GetCourse · ' + dd(now) + ', ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2), W / 2, H - 40); x.textAlign = 'left';
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
        + '<a class="fss-btn" href="/pl/sales/dealstat?fs=gc" title="Открыть стандартную страницу GetCourse">GetCourse</a></div></div>'
        + '<div class="fss-tabs">' + TABS.map(function (t) { return '<button type="button" data-t="' + t[0] + '">' + t[1] + '</button>' }).join('') + '</div><div class="fss-body"></div>';
      host.insertBefore(root, host.firstChild); body = root.querySelector('.fss-body'); document.title = 'Статистика';
      [].forEach.call(root.querySelectorAll('.fss-tabs button'), function (b) { b.onclick = function () { tab = b.getAttribute('data-t'); show() } });
      root.querySelector('.fss-per .fss-btn').onclick = perMenu;
      root.querySelector('.fss-img').onclick = function () { var b = this; b.disabled = true; card().then(function (u) { setImg(); modal(u) }).catch(function () { setImg() }) };
      show(); return true };
    var tries = 0, go = function () { if (!mount() && ++tries < 40) setTimeout(go, 150) };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();
