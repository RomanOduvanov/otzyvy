/* test build STAT */
  /* ===== своя «Статистика»: /pl/sales/dealstat (?fs=sales|cumulative|clients|gc-table; ?fs=gc — классический вид GetCourse) ===== */
  (function () {
    
    var path = location.pathname.replace(/\/+$/, ''), qs = new URLSearchParams(location.search), fsq = window.FSS_T || qs.get('fs');
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
    var keySync = function () { return;  return fetch(KEYT, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : '' }).then(function (h) {
      var f = new DOMParser().parseFromString(h, 'text/html').querySelector('#form1'); if (!f) return; var m = h.match(/fsk:([0-9a-f]{16,64})/), k = statKey();
      if (!k && m) { try { localStorage.setItem('fsStatKey', m[1]) } catch (e) {} location.reload() }
      else if (k && (!m || m[1] !== k)) { var fd = new FormData(f); fd.set('Content[css]', '/* служебная тема: ключ для страницы «Статистика». Не подключать к страницам. fsk:' + k + ' */'); fetch(f.getAttribute('action') || KEYT, { method: 'POST', body: fd, credentials: 'same-origin' }) } }).catch(function () {}) };
    /* test: keySync off */
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
      + '.fss-lead b.up{color:#4ade80;font-weight:500}.fss-lead b.dn{color:#ff6b6b;font-weight:500}.fss-dl.up b{color:#4ade80!important}.fss-dl.dn b{color:#ff6b6b!important}.fss .dn{color:#ff6b6b}'
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
      + '.fss-mg{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;padding:0 2px 4px}.fss-menu .fss-mg button{justify-content:center;padding:9px 4px;font-size:13px}.fss-menu .yl{padding:6px 12px 2px;color:var(--ink2);font-size:12px}'
      + '.fss-k{container-type:inline-size}.fss-kv2{font-size:30px;font-size:clamp(22px,15cqi,34px);overflow:visible;text-overflow:clip}'
      + '@media(max-width:1100px){.fss-kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:479px){.fss-kpis{grid-template-columns:1fr;gap:10px}.fss-k{padding:16px 18px}.fss-kv2{margin:10px 0 4px;font-size:30px}}'
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
            + '<div class="fss-pnote">' + (cur ? 'Прогноз на конец месяца при текущем темпе — <b>' + RUB(fc) + '</b>. ' : '') + (next ? 'До ' + next[1] + ' плана — <b>' + RUB(next[2] - got) + '</b>' + (left ? ', это <b>' + RUB((next[2] - got) / left) + '</b> в день до конца месяца.' : '.') : 'Идеальный план выполнен.') + '</div>';
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
        + '<button type="button" class="fss-btn pri fss-img" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6"/></svg>Поделиться<span class="lg">&nbsp;отчётом</span></button>'
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
