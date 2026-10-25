  /* ===== своя «Статистика продаж»: /pl/sales/dealstat (вкладки ?fs=overview|dynamics|cumulative|structure|report; ?fs=gc — классический вид GetCourse) ===== */
  (function () {
    if (window.top !== window) return;
    var path = location.pathname.replace(/\/+$/, ''), qs = new URLSearchParams(location.search), fsq = qs.get('fs');
    if (fsq === 'gc') return;
    /* старые вкладки GetCourse → наши */
    if (/^\/pl\/sales\/stat\/cumulative$/.test(path)) { location.replace('/pl/sales/dealstat?fs=cumulative'); return }
    if (/^\/pl\/crm\/stat\/revenue-structure$/.test(path)) { location.replace('/pl/sales/dealstat?fs=structure'); return }
    if (!/^\/pl\/sales\/dealstat(\/index)?$/.test(path)) return;
    var TABS = [['overview', 'Обзор'], ['dynamics', 'Динамика'], ['cumulative', 'Накопительная'], ['structure', 'Структура выручки'], ['report', 'Отчёт для продаж']];
    var tab = TABS.some(function (t) { return t[0] === fsq }) ? fsq : 'overview';
    document.documentElement.classList.add('fss-on');

    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
    var NUM = function (n) { return Math.round(n || 0).toLocaleString('ru-RU').replace(/ /g, ' ') };
    var RUB = function (n) { return NUM(n) + ' ₽' };
    var SHORT = function (n) { n = n || 0; var a = Math.abs(n); return a >= 1e6 ? (n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.?0+$/, '').replace('.', ',') + ' млн' : a >= 1e3 ? Math.round(n / 1e3) + ' тыс' : Math.round(n) + '' };
    var money = function (s) { var m = String(s || '').replace(/[\s ]/g, '').match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : 0 };
    var dd = function (d) { return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear() };
    var day0 = function (d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d };
    var addD = function (d, n) { d = new Date(d); d.setDate(d.getDate() + n); return d };
    var key = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) };
    var MONS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var MONN = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    var MON3 = { 'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'май': 4, 'мая': 4, 'июн': 5, 'июл': 6, 'авг': 7, 'сен': 8, 'окт': 9, 'ноя': 10, 'дек': 11 };
    var human = function (a, b) { var s = a.getDate(), e = b.getDate();
      if (key(a) === key(b)) return s + ' ' + MONS[a.getMonth()] + ' ' + a.getFullYear();
      if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return s + '–' + e + ' ' + MONS[b.getMonth()] + ' ' + b.getFullYear();
      return s + ' ' + MONS[a.getMonth()] + (a.getFullYear() !== b.getFullYear() ? ' ' + a.getFullYear() : '') + ' — ' + e + ' ' + MONS[b.getMonth()] + ' ' + b.getFullYear() };
    var delta = function (cur, prev) { if (!prev) return cur ? { t: 'новое', c: 'up' } : { t: '—', c: '' }; var p = (cur - prev) / prev * 100; return { t: (p > 0 ? '+' : '') + (Math.abs(p) < 10 ? p.toFixed(1) : Math.round(p)).toString().replace('.', ',') + '%', c: p > 0.05 ? 'up' : p < -0.05 ? 'down' : '' } };
    var catLabel = function (c) { var m;
      if ((m = String(c).match(/^(\d{4})\.(\d{2}) (\d{2})$/))) return { s: +m[3] + '', l: +m[3] + ' ' + MONS[+m[2] - 1], d: new Date(+m[1], +m[2] - 1, +m[3]) };
      if ((m = String(c).match(/^(\d{4})-w(\d+)$/))) return { s: 'н' + m[2], l: m[2] + '-я неделя ' + m[1] };
      if ((m = String(c).match(/^(\d{4})\.(\d{2})$/))) return { s: MONN[+m[2] - 1].slice(0, 3) + (m[2] === '01' ? ' ' + m[1].slice(2) : ''), l: MONN[+m[2] - 1] + ' ' + m[1], m: +m[2] - 1, y: +m[1] };
      return { s: c, l: c } };

    /* ---------- официальные данные GetCourse ---------- */
    var payRule = function (a, b) { return JSON.stringify({ type: 'andrule', inverted: 0, params: { children: [{ type: 'deal_payed_at', inverted: 0, params: { value: { from: dd(a), to: dd(b), toNDays: '', fromNDays: '', dateType: '', withTime: false }, valueMode: null } }], mode: 'and' } }) };
    var post = function (route, rule) { var fd = new URLSearchParams({ rule_string: rule || '', locationId: '0' }); fd.append(window.csrfField || '_csrf', window.csrfToken || '');
      return fetch('/pl/sales/dealstat/' + route, { method: 'POST', body: fd, credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then(function (r) { return r.json() }).then(function (j) { if (!j || !j.success) throw new Error('gc'); return j }) };
    var html = function (s) { return new DOMParser().parseFromString(s || '', 'text/html') };
    var overview = function () { return post('indexdata', '').then(function (j) { var d = html(j.tableHtml), rows = {};
      [].forEach.call(d.querySelectorAll('tr[class*="field-"]'), function (tr) { var k = (tr.className.match(/field-(\w+)/) || [])[1]; var td = tr.querySelectorAll('td'); rows[k] = { label: td[0].textContent.trim(), v: [].slice.call(td, 1).map(function (x) { return money(x.textContent) }) } });
      return rows }) };
    var chart = function (rule) { return post('chartdata', rule).then(function (j) { var cd = j.chartData || { series: [], xAxis: { categories: [] } }, s = {};
      cd.series.forEach(function (x) { s[/Создано/.test(x.name) ? 'created' : /Оплачено/.test(x.name) ? 'paid' : /Сумма/.test(x.name) ? 'sum' : 'avg'] = x.data.map(function (v) { return v || 0 }) });
      var tot = {}; [].forEach.call(html(j.tableHtml).querySelectorAll('tr'), function (tr) { var c = tr.querySelectorAll('td'); if (c.length < 4) return; var l = c[0].textContent.trim();
        var k = /создано/i.test(l) ? 'created' : /оплачено/i.test(l) ? 'paid' : /Купило/i.test(l) ? 'buyers' : /предоплат/i.test(l) ? 'prepay' : /налог/i.test(l) ? 'tax' : /комисс/i.test(l) ? 'comm' : /Заработано/i.test(l) ? 'earned' : null;
        if (k) tot[k] = { n: money(c[1].textContent), sum: money(c[3].textContent) } });
      return { cats: (cd.xAxis && cd.xAxis.categories) || [], s: s, tot: tot } }) };
    var structure = function () { return fetch('/pl/crm/stat/revenue-structure', { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) { var d = html(t), g = [];
      var ch = d.querySelector('.gc-users-base-save-growth-dynamics--chart'); if (ch) { var nums = ch.querySelectorAll('p.number'), ms = ch.querySelectorAll('p.month'); for (var i = 0; i < nums.length; i++) g.push({ n: money(nums[i].textContent), m: (ms[i] ? ms[i].textContent : '').replace(/\s+/g, ' ').trim() }) }
      var pc = d.querySelector('.gc-users-base-save-growth-dynamics--percent');
      var win = d.querySelector('.gc-users-base-save-proceeds-windows'), periods = [];
      if (win) [].forEach.call(win.children, function (w) { var items = [].map.call(w.querySelectorAll('h4'), function (h) { var box = h.parentElement; return { t: h.textContent.trim(), p: money((box.querySelector('.percent') || {}).textContent), s: ((box.querySelector('.sum') || {}).textContent || '').trim() } }); if (items.length) periods.push(items) });
      return { growth: g, pct: pc ? (pc.querySelector('strong') || {}).textContent : '', add: pc ? (pc.querySelector('p.number') || {}).textContent : '', periods: periods } }) };

    /* ---------- заказы по дате оплаты (для тарифов и последних оплат) ---------- */
    var parseWhen = function (s) { s = String(s || '').toLowerCase(); var now = new Date(), d = null, tm = s.match(/(\d{1,2}):(\d{2})/), m;
      if (/сегодня/.test(s)) d = day0(now); else if (/позавчера/.test(s)) d = addD(day0(now), -2); else if (/вчера/.test(s)) d = addD(day0(now), -1);
      else if ((m = s.match(/(\d{2})\.(\d{2})\.(\d{4})/))) d = new Date(+m[3], +m[2] - 1, +m[1]);
      else if ((m = s.match(/(\d{1,2})\s+([а-я]{3})[а-я]*\.?(?:\s+(\d{4}))?/)) && MON3[m[2]] != null) { var y = m[3] ? +m[3] : now.getFullYear(); d = new Date(y, MON3[m[2]], +m[1]); if (!m[3] && d > now) d.setFullYear(y - 1) }
      if (d && tm) d.setHours(+tm[1], +tm[2], 0, 0); return d };
    var getPage = function (r, p) { return fetch('/pl/sales/deal/index?' + new URLSearchParams({ 'DealContext[segment_id]': '0', 'DealContext[rule_string]': r, page: p }), { credentials: 'same-origin' }).then(function (x) { return x.text() }).then(html) };
    var rowsOf = function (doc) { var th = [].map.call(doc.querySelectorAll('table thead tr:first-child th'), function (x) { return x.textContent.trim().toLowerCase() });
      var ix = function (re) { for (var i = 0; i < th.length; i++) if (re.test(th[i])) return i; return -1 };
      var I = { client: ix(/клиент/), items: ix(/состав/), status: ix(/статус/), cost: ix(/стоимость/), mgr: ix(/менеджер/) };
      return [].map.call(doc.querySelectorAll('table tbody tr[data-key]'), function (tr) { var c = tr.children, t = function (i) { return i >= 0 && c[i] ? c[i].textContent.trim().replace(/\s+/g, ' ') : '' };
        return { id: tr.getAttribute('data-key'), client: t(I.client), title: t(I.items) || '—', cost: money(t(I.cost)), mgr: t(I.mgr), when: parseWhen(t(I.status).split(/Оплачено:\s*/i)[1] || '') } }) };
    var deals = function (a, b) { var r = payRule(a, b);
      return getPage(r, 1).then(function (doc) { var first = rowsOf(doc), sm = ((doc.querySelector('.summary') || {}).textContent || '').replace(/[\s ]/g, ''), mm = sm.match(/из(\d+)/);
        var pages = Math.min(400, Math.ceil((mm ? +mm[1] : first.length) / Math.max(first.length, 1))), out = first.slice(), next = 2;
        var worker = function () { if (next > pages) return Promise.resolve(); var p = next++; return getPage(r, p).then(function (d) { out = out.concat(rowsOf(d)); return worker() }) };
        var ws = []; for (var k = 0; k < 6; k++) ws.push(worker());
        return Promise.all(ws).then(function () { var seen = {}; return out.filter(function (x) { if (seen[x.id]) return false; seen[x.id] = 1; return true }) }) }) };

    /* ---------- графики (SVG) ---------- */
    var uid = 0;
    var bars = function (el, pts, o) { o = o || {}; var W = el.clientWidth || 800, H = o.h || 240, L = 58, B = 26, T = 10, ser = o.series || [{ k: 'v', c: 'g' }];
      var mx = 1; pts.forEach(function (p) { ser.forEach(function (s) { mx = Math.max(mx, p[s.k] || 0) }) });
      var nice = function (v) { var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p }; mx = nice(mx);
      var id = 'fssG' + (++uid), g = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7b6ff"/><stop offset="1" stop-color="#8f4ff0"/></linearGradient></defs>';
      for (var i = 0; i <= 4; i++) { var y = T + (H - T - B) * (1 - i / 4); g += '<line class="gl" x1="' + L + '" x2="' + W + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + (o.fmt ? o.fmt(mx * i / 4) : SHORT(mx * i / 4)) + '</text>' }
      var bw = (W - L) / Math.max(1, pts.length), step = Math.ceil(pts.length / Math.max(1, Math.floor((W - L) / 40)));
      if (o.line) { var d = ''; pts.forEach(function (p, i) { var x = L + bw * i + bw / 2, y = H - B - (H - T - B) * (p[ser[0].k] || 0) / mx; d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1) });
        g += '<path d="' + d + 'L' + (L + bw * (pts.length - 1) + bw / 2) + ' ' + (H - B) + 'L' + (L + bw / 2) + ' ' + (H - B) + 'Z" fill="rgba(163,92,240,.14)"/><path d="' + d + '" fill="none" stroke="#c38bff" stroke-width="2" stroke-linejoin="round"/>' }
      pts.forEach(function (p, i) { var n = ser.length, gw = Math.max(2, Math.min(bw - 6, 26 * n + 8)), w = (gw - (n - 1) * 2) / n, x0 = L + bw * i + (bw - gw) / 2;
        g += '<g class="c" data-i="' + i + '">';
        if (o.line) { var yy = H - B - (H - T - B) * (p[ser[0].k] || 0) / mx; g += '<circle cx="' + (L + bw * i + bw / 2) + '" cy="' + yy + '" r="4" fill="#0b0a10" stroke="#e2c9ff" stroke-width="2"/>' }
        else ser.forEach(function (s, j) { var v = p[s.k] || 0, h = (H - T - B) * v / mx; if (v > 0) g += '<rect class="b" x="' + (x0 + j * (w + 2)) + '" y="' + (H - B - Math.max(h, 2)) + '" width="' + w + '" height="' + Math.max(h, 2) + '" rx="' + Math.min(4, w / 2) + '" fill="' + (s.c === 'g' ? 'url(#' + id + ')' : s.c) + '"/>' });
        g += '<rect class="h" x="' + (L + bw * i) + '" y="' + T + '" width="' + bw + '" height="' + (H - T) + '" fill="transparent"/>' + (i % step === 0 ? '<text x="' + (L + bw * i + bw / 2) + '" y="' + (H - 7) + '" text-anchor="middle">' + esc(p.s) + '</text>' : '') + '</g>' });
      el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '">' + g + '</svg><div class="fss-tip"></div>';
      var tip = el.querySelector('.fss-tip');
      [].forEach.call(el.querySelectorAll('g.c'), function (c) { var i = +c.getAttribute('data-i'), p = pts[i];
        c.addEventListener('mouseenter', function () { tip.innerHTML = '<span>' + esc(p.l) + '</span>' + ser.map(function (s) { return '<div><i style="background:' + (s.c === 'g' ? '#c38bff' : s.c) + '"></i>' + (s.n ? esc(s.n) + ': ' : '') + '<b>' + (s.f || o.tf || RUB)(p[s.k] || 0) + '</b></div>' }).join('') + (o.extra ? o.extra(p) : '');
          tip.style.left = Math.min(Math.max((L + bw * i + bw / 2) / W * 100, 8), 92) + '%'; tip.style.opacity = 1 });
        c.addEventListener('mouseleave', function () { tip.style.opacity = 0 }) }) };

    /* ---------- стили ---------- */
    var CSS = ':root.fss-on .fss-host>*:not(.fss){display:none!important}'
      + '.fss{--mut:rgba(255,255,255,.55);--line:rgba(255,255,255,.08);--card:rgba(255,255,255,.035);color:#fff;font-feature-settings:"tnum";padding-bottom:40px}.fss *{box-sizing:border-box}'
      + '.fss-top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:6px 0 18px}.fss-top h1{margin:0!important;font-size:34px!important;font-weight:600!important;letter-spacing:-.02em;color:#fff!important}.fss-top p{margin:6px 0 0;color:var(--mut);font-size:13px}'
      + '.fss-gc{color:var(--mut)!important;font-size:12px;text-decoration:none!important;border-bottom:1px dashed rgba(255,255,255,.25)}.fss-gc:hover{color:#fff!important}'
      + '.fss-tabs{display:inline-flex;flex-wrap:wrap;gap:4px;padding:5px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid var(--line);margin-bottom:20px}.fss-tabs button{border:0;background:transparent;color:rgba(255,255,255,.7);font:500 14px/1 inherit;padding:10px 16px;border-radius:12px;cursor:pointer;transition:.15s}.fss-tabs button:hover{color:#fff;background:rgba(255,255,255,.05)}.fss-tabs button.on{background:rgba(195,139,255,.18);color:#fff;box-shadow:inset 0 0 0 1px rgba(195,139,255,.45)}'
      + '.fss-seg{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:16px}.fss-chip{border:1px solid var(--line);background:var(--card);color:#fff;border-radius:999px;padding:8px 14px;font:500 13px/1 inherit;cursor:pointer;transition:.15s}.fss-chip:hover{border-color:rgba(195,139,255,.4)}.fss-chip.on{background:rgba(195,139,255,.18);border-color:rgba(195,139,255,.55)}'
      + '.fss-dates{display:flex;gap:6px;align-items:center;color:var(--mut);font-size:13px}.fss-dates input{background:rgba(255,255,255,.05);border:1px solid var(--line);color:#fff;border-radius:10px;padding:6px 10px;font:inherit;color-scheme:dark}.fss-sp{flex:1}'
      + '.fss-img{background:linear-gradient(180deg,#d7b6ff,#a35cf0);color:#16072b;border:0;border-radius:999px;padding:10px 18px;font:600 14px/1 inherit;cursor:pointer;display:inline-flex;gap:8px;align-items:center;box-shadow:0 8px 30px -8px rgba(163,92,240,.7)}.fss-img:disabled{opacity:.5;cursor:default}.fss-img svg{width:16px;height:16px}'
      + '.fss-k4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}.fss-k3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}@media(max-width:1000px){.fss-k4,.fss-k3{grid-template-columns:repeat(2,1fr)}}'
      + '.fss-k{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px;min-width:0}.fss-k.hero{background:radial-gradient(120% 140% at 0% 100%,rgba(163,92,240,.28),rgba(255,255,255,.03) 60%);border-color:rgba(195,139,255,.28)}.fss-k i{font-style:normal;color:var(--mut);font-size:12px;letter-spacing:.04em;text-transform:uppercase}.fss-k b{display:block;font-size:30px;font-weight:600;letter-spacing:-.02em;margin:8px 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      + '.fss-d{font-size:12px;color:var(--mut)}.fss-d em{font-style:normal;font-weight:600;border-radius:999px;padding:2px 7px;margin-right:6px;background:rgba(255,255,255,.08);color:#fff}.fss-d em.up{background:rgba(70,200,120,.16);color:#7be3a5}.fss-d em.down{background:rgba(255,90,90,.15);color:#ff9a9a}'
      + '.fss-box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px;margin-bottom:12px;min-width:0}.fss-h{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px}.fss-h b{font-size:16px;font-weight:600}.fss-h span{color:var(--mut);font-size:12px}'
      + '.fss-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.fss-g21{display:grid;grid-template-columns:1.5fr 1fr;gap:12px}@media(max-width:1000px){.fss-g2,.fss-g21{grid-template-columns:1fr}}'
      + '.fss-ch{position:relative}.fss-ch svg{display:block;overflow:visible}.fss-ch .gl{stroke:rgba(255,255,255,.07)}.fss-ch text{fill:rgba(255,255,255,.45);font-size:11px;font-family:inherit}.fss-ch g.c:hover rect.b{filter:brightness(1.25)}'
      + '.fss-tip{position:absolute;top:0;pointer-events:none;background:#1d1828;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 10px;font-size:12px;white-space:nowrap;transform:translate(-50%,-6px);opacity:0;transition:opacity .1s;z-index:3}.fss-tip span{color:var(--mut);display:block;margin-bottom:3px}.fss-tip i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}'
      + '.fss-lg{display:flex;gap:14px;font-size:12px;color:var(--mut)}.fss-lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}'
      + '.fss-t{width:100%;border-collapse:collapse;font-size:13px}.fss-t th{color:var(--mut);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em;text-align:right;padding:0 8px 8px;white-space:nowrap}.fss-t th:first-child,.fss-t td:first-child{text-align:left;padding-left:0}.fss-t td{padding:9px 8px;border-top:1px solid var(--line);text-align:right;white-space:nowrap}.fss-t td:first-child{white-space:normal}.fss-t tr.sum td{color:#fff;font-weight:600;background:rgba(195,139,255,.08)}.fss-t td.hl{color:#fff;font-weight:600}.fss-t td.mu{color:var(--mut)}.fss-scroll{overflow-x:auto}'
      + '.fss-sh{display:block;height:4px;border-radius:4px;background:rgba(255,255,255,.06);margin-top:6px;overflow:hidden}.fss-sh i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#8f4ff0,#d7b6ff)}.fss-t a{color:#e6d4ff!important}.fss-note{color:var(--mut);font-size:12px;margin-top:4px}'
      + '.fss-load{padding:70px 0;text-align:center;color:var(--mut)}.fss-load:after{content:"";display:block;width:28px;height:28px;margin:14px auto 0;border-radius:50%;border:3px solid rgba(195,139,255,.2);border-top-color:#c38bff;animation:fssr 0.8s linear infinite}@keyframes fssr{to{transform:rotate(360deg)}}.fss-empty{padding:40px 0;text-align:center;color:var(--mut)}'
      + '.fss-stack{display:flex;height:14px;border-radius:8px;overflow:hidden;gap:2px;margin:6px 0 14px}.fss-stack i{display:block;height:100%}'
      + '.fss-big{font-size:44px;font-weight:600;letter-spacing:-.03em;line-height:1}.fss-big small{font-size:16px;color:var(--mut);font-weight:500;margin-left:8px;letter-spacing:0}'
      + '.fss-modal{position:fixed;inset:0;background:rgba(4,3,8,.82);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px}.fss-mw{display:flex;flex-direction:column;align-items:center;gap:14px;max-height:100%}.fss-mw img{max-height:calc(100vh - 120px);max-width:100%;border-radius:18px;box-shadow:0 30px 80px -20px rgba(143,79,240,.5)}'
      + '.fss-mb{display:flex;gap:10px}.fss-mb button{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:10px 18px;font:500 14px/1 inherit;cursor:pointer}.fss-mb button.p{background:linear-gradient(180deg,#d7b6ff,#a35cf0);color:#16072b;border:0;font-weight:600}';

    var root, body, cache = {};
    var kcard = function (lab, val, d, sub, hero) { return '<div class="fss-k' + (hero ? ' hero' : '') + '"><i>' + lab + '</i><b title="' + esc(val) + '">' + val + '</b><div class="fss-d">' + (d ? '<em class="' + d.c + '">' + d.t + '</em>' : '') + (sub || '') + '</div></div>' };
    var loading = function (t) { body.innerHTML = '<div class="fss-load">' + (t || 'Загружаю данные GetCourse…') + '</div>' };
    var fail = function () { body.innerHTML = '<div class="fss-empty">GetCourse не отдал данные. Обнови страницу — или открой <a href="?fs=gc" style="color:#d7b6ff">классический вид</a>.</div>' };

    /* ---------- Обзор ---------- */
    var OVP = ['Сегодня', 'Вчера', 'Этот месяц', 'Прошлый месяц', 'Этот год', 'Всё время'], ovI = 2;
    var renderOverview = function () { var R = cache.ov; if (!R) { loading(); overview().then(function (r) { cache.ov = r; if (tab === 'overview') renderOverview() }).catch(fail); return }
      var v = function (k, i) { return R[k] ? R[k].v[i] || 0 : 0 }, i = ovI, pi = i === 0 ? 1 : i === 2 ? 3 : -1, dl = function (k) { return pi < 0 ? null : delta(v(k, i), v(k, pi)) }, was = function (k, f) { return pi < 0 ? '' : (pi === 1 ? 'вчера ' : 'в прошлом месяце ') + (f || RUB)(v(k, pi)) };
      var conv = v('dealsCount', i) ? Math.round(v('payedDealsCount', i) / v('dealsCount', i) * 100) : 0;
      var h = '<div class="fss-seg">' + OVP.map(function (p, j) { return '<button type="button" class="fss-chip' + (j === i ? ' on' : '') + '" data-i="' + j + '">' + p + '</button>' }).join('') + '</div>'
        + '<div class="fss-k4">' + kcard('Сумма оплат', RUB(v('payedSum', i)), dl('payedSum'), was('payedSum'), 1) + kcard('Заработано', RUB(v('earnedSum', i)), dl('earnedSum'), was('earnedSum') || 'после налогов и комиссий')
        + kcard('Оплачено заказов', NUM(v('payedDealsCount', i)), dl('payedDealsCount'), was('payedDealsCount', NUM) || 'из ' + NUM(v('dealsCount', i)) + ' созданных') + kcard('Средний чек', RUB(v('averageCheque', i)), dl('averageCheque'), was('averageCheque')) + '</div>'
        + '<div class="fss-k4">' + kcard('Создано заказов', NUM(v('dealsCount', i)), null, 'конверсия в оплату ' + conv + '%') + kcard('Оплативших', NUM(v('payedUsersCount', i)), dl('payedUsersCount'), 'уникальных покупателей')
        + kcard('Предоплаты', RUB(v('partialPayedSum', i)), null, NUM(v('partialPayedCount', i)) + ' частично оплаченных') + kcard('Налоги и комиссии', RUB(v('taxesSum', i) + v('commissionSum', i)), null, 'налоги ' + RUB(v('taxesSum', i))) + '</div>'
        + '<div class="fss-box"><div class="fss-h"><b>Все показатели</b><span>официальные данные GetCourse</span></div><div class="fss-scroll"><table class="fss-t"><tr><th>Показатель</th>' + OVP.map(function (p) { return '<th>' + p + '</th>' }).join('') + '</tr>'
        + Object.keys(R).map(function (k) { var cnt = /Count$/.test(k); return '<tr class="' + (k === 'earnedSum' ? 'sum' : '') + '"><td>' + esc(R[k].label) + '</td>' + R[k].v.map(function (x, j) { return '<td class="' + (j === i ? 'hl' : '') + '">' + (cnt ? NUM(x) : RUB(x)) + '</td>' }).join('') + '</tr>' }).join('') + '</table></div></div>';
      body.innerHTML = h;
      [].forEach.call(body.querySelectorAll('.fss-chip'), function (b) { b.onclick = function () { ovI = +b.getAttribute('data-i'); renderOverview() } }) };

    /* ---------- Динамика и Накопительная (по месяцам) ---------- */
    var monthly = function (cb) { if (cache.all) return cb(cache.all); loading(); chart('').then(function (c) { cache.all = c.cats.map(function (x, i) { var L = catLabel(x); return { s: L.s, l: L.l, created: c.s.created[i] || 0, paid: c.s.paid[i] || 0, sum: c.s.sum[i] || 0, avg: c.s.avg[i] || 0 } }); cb(cache.all) }).catch(fail) };
    var renderDynamics = function () { monthly(function (P) { if (tab !== 'dynamics') return;
      var last = P[P.length - 1] || {}, prev = P[P.length - 2] || {}, tot = P.reduce(function (a, p) { return a + p.sum }, 0), best = P.slice().sort(function (a, b) { return b.sum - a.sum })[0] || {};
      body.innerHTML = '<div class="fss-k4">' + kcard('Оплаты в этом месяце', RUB(last.sum), delta(last.sum, prev.sum), 'было ' + RUB(prev.sum), 1) + kcard('Оплачено заказов', NUM(last.paid), delta(last.paid, prev.paid), 'было ' + NUM(prev.paid))
        + kcard('Средний чек', RUB(last.avg), delta(last.avg, prev.avg), 'было ' + RUB(prev.avg)) + kcard('Лучший месяц', RUB(best.sum), null, esc(best.l || '')) + '</div>'
        + '<div class="fss-box"><div class="fss-h"><b>Сумма оплат по месяцам</b><span>всего ' + RUB(tot) + '</span></div><div class="fss-ch" id="fssA"></div></div>'
        + '<div class="fss-g2"><div class="fss-box"><div class="fss-h"><b>Заказы</b><span class="fss-lg"><span><i style="background:rgba(255,255,255,.28)"></i>создано</span><span><i style="background:#c38bff"></i>оплачено</span></span></div><div class="fss-ch" id="fssB"></div></div>'
        + '<div class="fss-box"><div class="fss-h"><b>Средний чек</b></div><div class="fss-ch" id="fssC"></div></div></div>'
        + '<div class="fss-box"><div class="fss-h"><b>По месяцам</b></div><div class="fss-scroll"><table class="fss-t"><tr><th>Месяц</th><th>Создано</th><th>Оплачено</th><th>Конверсия</th><th>Сумма оплат</th><th>Средний чек</th></tr>'
        + P.slice().reverse().map(function (p) { return '<tr><td>' + esc(p.l) + '</td><td>' + NUM(p.created) + '</td><td>' + NUM(p.paid) + '</td><td class="mu">' + (p.created ? Math.round(p.paid / p.created * 100) : 0) + '%</td><td class="hl">' + RUB(p.sum) + '</td><td>' + RUB(p.avg) + '</td></tr>' }).join('') + '</table></div></div>';
      bars(body.querySelector('#fssA'), P.map(function (p) { return { s: p.s, l: p.l, v: p.sum, n: p.paid } }), { h: 260, extra: function (p) { return '<div style="color:rgba(255,255,255,.55);margin-top:2px">' + NUM(p.n) + ' оплат</div>' } });
      bars(body.querySelector('#fssB'), P, { h: 200, series: [{ k: 'created', c: 'rgba(255,255,255,.28)', n: 'Создано', f: NUM }, { k: 'paid', c: '#c38bff', n: 'Оплачено', f: NUM }], fmt: function (x) { return NUM(x) } });
      bars(body.querySelector('#fssC'), P.map(function (p) { return { s: p.s, l: p.l, v: p.avg } }), { h: 200, line: true }) }) };
    var renderCumulative = function () { monthly(function (P) { if (tab !== 'cumulative') return; var run = 0, C = P.map(function (p) { run += p.sum; return { s: p.s, l: p.l, v: run, m: p.sum } });
      var total = run, last = C[C.length - 1] || {}, before = C[C.length - 2] || {};
      body.innerHTML = '<div class="fss-k3">' + kcard('Накоплено за всё время', RUB(total), null, 'с ' + esc((C[0] || {}).l || ''), 1) + kcard('Прирост в этом месяце', RUB(last.m), delta(last.v, before.v), 'к накопленному на конец прошлого') + kcard('В среднем за месяц', RUB(C.length ? total / C.length : 0), null, C.length + ' мес.') + '</div>'
        + '<div class="fss-box"><div class="fss-h"><b>Накопительная выручка</b><span>сумма оплат нарастающим итогом</span></div><div class="fss-ch" id="fssA"></div></div>'
        + '<div class="fss-box"><div class="fss-scroll"><table class="fss-t"><tr><th>Месяц</th><th>За месяц</th><th>Накоплено</th><th>Доля в итоге</th></tr>' + C.slice().reverse().map(function (p) { return '<tr><td>' + esc(p.l) + '</td><td>' + RUB(p.m) + '</td><td class="hl">' + RUB(p.v) + '</td><td class="mu">' + (total ? Math.round(p.m / total * 100) : 0) + '%</td></tr>' }).join('') + '</table></div></div>';
      bars(body.querySelector('#fssA'), C, { h: 280, line: true, extra: function (p) { return '<div style="color:rgba(255,255,255,.55);margin-top:2px">за месяц ' + RUB(p.m) + '</div>' } }) }) };

    /* ---------- Структура выручки ---------- */
    var stI = 0;
    var renderStructure = function () { var S = cache.st; if (!S) { loading(); structure().then(function (r) { cache.st = r; if (tab === 'structure') renderStructure() }).catch(fail); return }
      var COL = ['#8f4ff0', '#c38bff', '#ead9ff'], PN = ['Текущий месяц', 'Прошлый месяц', 'За весь период'], it = S.periods[stI] || [];
      var lastG = S.growth[S.growth.length - 1] || {};
      body.innerHTML = '<div class="fss-g21"><div class="fss-box"><div class="fss-h"><b>Рост базы клиентов</b><span>за полгода</span></div><div class="fss-ch" id="fssA"></div></div>'
        + '<div class="fss-box" style="display:flex;flex-direction:column;justify-content:center;gap:18px"><div><div class="fss-note">Клиентов в базе сейчас</div><div class="fss-big">' + NUM(lastG.n) + '</div></div><div><div class="fss-note">Рост базы за полгода</div><div class="fss-big" style="color:#7be3a5">' + esc(S.pct || '—') + '<small>' + esc(S.add || '') + ' клиентов</small></div></div></div></div>'
        + '<div class="fss-box"><div class="fss-h"><b>Выручка от новых клиентов и клиентов из базы</b><span>данные GetCourse на конец прошлого дня</span></div>'
        + '<div class="fss-seg">' + PN.map(function (p, j) { return S.periods[j] ? '<button type="button" class="fss-chip' + (j === stI ? ' on' : '') + '" data-i="' + j + '">' + p + '</button>' : '' }).join('') + '</div>'
        + (it.length ? '<div class="fss-stack">' + it.map(function (x, j) { return '<i style="width:' + Math.max(x.p, .5) + '%;background:' + COL[j] + '" title="' + esc(x.t) + ' — ' + x.p + '%"></i>' }).join('') + '</div>'
          + '<div class="fss-k3">' + it.map(function (x, j) { return '<div class="fss-k"><i><span style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px;background:' + COL[j] + '"></i>' + (j < 2 ? 'Новые клиенты' : 'Клиенты из базы') + '</i><b>' + esc(x.s.replace('M', ' млн').replace('K', ' тыс')) + ' ₽</b><div class="fss-d"><em>' + String(x.p).replace('.', ',') + '%</em>' + esc(x.t.toLowerCase()) + '</div></div>' }).join('') + '</div>' : '<div class="fss-empty">Нет данных</div>')
        + '<div class="fss-note">«Клиент из базы» — тот, кто заплатил на третий месяц или позже после попадания в базу. Чем больше эта доля, тем лучше школа работает с базой.</div></div>';
      bars(body.querySelector('#fssA'), S.growth.map(function (g) { return { s: g.m.replace(/\s*'\d+/, '').slice(0, 3).toLowerCase(), l: g.m, v: g.n } }), { h: 220, tf: function (x) { return NUM(x) + ' клиентов' }, fmt: function (x) { return NUM(x) } });
      [].forEach.call(body.querySelectorAll('.fss-chip'), function (b) { b.onclick = function () { stI = +b.getAttribute('data-i'); renderStructure() } }) };

    /* ---------- Отчёт для продаж (период) ---------- */
    var presets = function () { var t = day0(new Date()), y = addD(t, -1), ms = new Date(t.getFullYear(), t.getMonth(), 1), pms = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      return [{ k: 'today', l: 'Сегодня', a: t, b: t }, { k: 'yest', l: 'Вчера', a: y, b: y }, { k: 'w', l: '7 дней', a: addD(t, -6), b: t }, { k: 'm30', l: '30 дней', a: addD(t, -29), b: t },
        { k: 'month', l: 'Этот месяц', a: ms, b: t }, { k: 'pmonth', l: 'Прошлый месяц', a: pms, b: addD(ms, -1) }] };
    var rep = { k: null };
    var repLoad = function () { var a = rep.a, b = rep.b, len = Math.round((b - a) / 864e5) + 1, pa = addD(a, -len), pb = addD(a, -1), tok = rep.tok = Math.random(); rep.data = null; renderReport();
      Promise.all([chart(payRule(a, b)), chart(payRule(pa, pb)), deals(a, b).catch(function () { return [] })]).then(function (r) { if (tok !== rep.tok) return; rep.data = { cur: r[0], prev: r[1], deals: r[2] }; if (tab === 'report') renderReport() }).catch(function () { if (tok === rep.tok) fail() }) };
    var setP = function (k) { var p = presets().filter(function (x) { return x.k === k })[0]; if (!p) return; rep.k = k; rep.a = p.a; rep.b = p.b; try { sessionStorage.setItem('fssK', k) } catch (e) {} repLoad() };
    var kpis = function (D) { var t = D.tot, n = (t.paid || {}).n || 0, s = (t.paid || {}).sum || 0; return { n: n, sum: s, avg: n ? s / n : 0, buyers: (t.buyers || {}).n || 0, earned: (t.earned || {}).sum || 0 } };
    var repSeries = function (D) { var C = D.cats.map(function (c, i) { var L = catLabel(c); return { L: L, v: (D.s.sum || [])[i] || 0, n: (D.s.paid || [])[i] || 0 } });
      if (C.length && C.every(function (x) { return x.L.d })) { var m = {}; C.forEach(function (x) { m[key(x.L.d)] = x }); var out = [], days = Math.round((rep.b - rep.a) / 864e5) + 1;
        for (var i = 0; i < days; i++) { var d = addD(rep.a, i), x = m[key(d)]; out.push({ s: d.getDate() + '', l: d.getDate() + ' ' + MONS[d.getMonth()], v: x ? x.v : 0, n: x ? x.n : 0 }) } return out }
      while (C.length && !C[0].n) C.shift(); return C.map(function (x) { return { s: x.L.s, l: x.L.l, v: x.v, n: x.n } }) };
    var tariffs = function (list) { var m = {}; list.filter(function (x) { return x.cost > 0 }).forEach(function (x) { (m[x.title] = m[x.title] || { name: x.title, n: 0, sum: 0 }), m[x.title].n++, m[x.title].sum += x.cost });
      return Object.keys(m).map(function (k) { return m[k] }).sort(function (a, b) { return b.n - a.n || b.sum - a.sum }) };
    var renderReport = function () { if (!rep.k) { var k = 'month'; try { k = sessionStorage.getItem('fssK') || 'month' } catch (e) {} if (k === 'custom') k = 'month'; setP(k); return }
      var chips = presets().map(function (p) { return '<button type="button" class="fss-chip' + (rep.k === p.k ? ' on' : '') + '" data-k="' + p.k + '">' + p.l + '</button>' }).join('');
      var bar = '<div class="fss-seg">' + chips + '<span class="fss-dates"><input type="date" class="fss-a" value="' + key(rep.a) + '"> — <input type="date" class="fss-b" value="' + key(rep.b) + '"></span><span class="fss-sp"></span>'
        + '<button type="button" class="fss-img"' + (rep.data ? '' : ' disabled') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>Отчёт картинкой</button></div>';
      if (!rep.data) { body.innerHTML = bar + '<div class="fss-load">Собираю продажи за ' + esc(human(rep.a, rep.b)) + '…</div>'; bindRep(); return }
      var c = kpis(rep.data.cur), p = kpis(rep.data.prev), T = tariffs(rep.data.deals), tn = T.reduce(function (a, t) { return a + t.n }, 0), maxN = T.length ? T[0].n : 1;
      var last = rep.data.deals.filter(function (x) { return x.cost > 0 }).sort(function (a, b) { return (b.when || 0) - (a.when || 0) }).slice(0, 10);
      var fmtW = function (w) { return w ? ('0' + w.getDate()).slice(-2) + '.' + ('0' + (w.getMonth() + 1)).slice(-2) + ' ' + ('0' + w.getHours()).slice(-2) + ':' + ('0' + w.getMinutes()).slice(-2) : '' };
      body.innerHTML = bar + '<div class="fss-k4">' + kcard('Сумма оплат', RUB(c.sum), delta(c.sum, p.sum), 'было ' + RUB(p.sum), 1) + kcard('Продаж', NUM(c.n), delta(c.n, p.n), 'было ' + NUM(p.n))
        + kcard('Средний чек', RUB(c.avg), delta(c.avg, p.avg), 'было ' + RUB(p.avg)) + kcard('Покупателей', NUM(c.buyers), delta(c.buyers, p.buyers), 'было ' + NUM(p.buyers)) + '</div>'
        + '<div class="fss-box"><div class="fss-h"><b>Оплаты</b><span>' + esc(human(rep.a, rep.b)) + ' · сравнение с ' + esc(human(addD(rep.a, -(Math.round((rep.b - rep.a) / 864e5) + 1)), addD(rep.a, -1))) + '</span></div><div class="fss-ch" id="fssA"></div></div>'
        + '<div class="fss-g21"><div class="fss-box"><div class="fss-h"><b>Тарифы</b><span>по количеству продаж</span></div>' + (T.length ? '<table class="fss-t"><tr><th>Тариф / продукт</th><th>Продаж</th><th>Доля</th><th>Сумма заказов</th></tr>' + T.map(function (t) {
          return '<tr><td>' + esc(t.name) + '<span class="fss-sh"><i style="width:' + Math.max(3, t.n / maxN * 100).toFixed(1) + '%"></i></span></td><td class="hl">' + NUM(t.n) + '</td><td class="mu">' + (tn ? Math.round(t.n / tn * 100) : 0) + '%</td><td>' + RUB(t.sum) + '</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">Оплат за период нет</div>') + '</div>'
        + '<div class="fss-box"><div class="fss-h"><b>Последние оплаты</b></div>' + (last.length ? '<table class="fss-t"><tr><th>Клиент</th><th>Когда</th><th>Заказ</th></tr>' + last.map(function (x) {
          return '<tr><td><a href="/sales/control/deal/update/id/' + esc(x.id) + '" target="_blank">' + esc(x.client || '—') + '</a><div class="fss-note">' + esc(x.title) + '</div></td><td class="mu">' + fmtW(x.when) + '</td><td>' + RUB(x.cost) + '</td></tr>' }).join('') + '</table>' : '<div class="fss-empty">Пока пусто</div>') + '</div></div>';
      bars(body.querySelector('#fssA'), repSeries(rep.data.cur), { h: 240, extra: function (q) { return '<div style="color:rgba(255,255,255,.55);margin-top:2px">' + NUM(q.n) + ' оплат</div>' } });
      bindRep() };
    var bindRep = function () { [].forEach.call(body.querySelectorAll('.fss-chip'), function (b) { b.onclick = function () { setP(b.getAttribute('data-k')) } });
      var ia = body.querySelector('.fss-a'), ib = body.querySelector('.fss-b'), ch = function () { if (!ia.value || !ib.value) return; var a = new Date(ia.value + 'T00:00'), b = new Date(ib.value + 'T00:00'); if (a > b) { var t = a; a = b; b = t } rep.k = 'custom'; rep.a = a; rep.b = b; repLoad() };
      ia.onchange = ch; ib.onchange = ch;
      var im = body.querySelector('.fss-img'); if (im) im.onclick = function () { im.disabled = true; card().then(function (u) { im.disabled = false; modal(u) }).catch(function () { im.disabled = false }) } };

    /* ---------- отчёт картинкой 1080×1350 ---------- */
    var card = function () {
      var cv = document.createElement('canvas'), W = 1080, H = 1350; cv.width = W; cv.height = H; var x = cv.getContext('2d'), F = '"Inter Tight", Inter, system-ui, sans-serif';
      var c = kpis(rep.data.cur), p = kpis(rep.data.prev), T = tariffs(rep.data.deals), tn = T.reduce(function (a, t) { return a + t.n }, 0);
      var rr = function (X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath() };
      var fit = function (s, w) { if (x.measureText(s).width <= w) return s; while (s.length > 1 && x.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…' };
      return (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('600 40px "Inter Tight"'), document.fonts.load('500 20px "Inter Tight"')]).catch(function () {}) : Promise.resolve()).then(function () {
        x.fillStyle = '#060509'; x.fillRect(0, 0, W, H);
        var gr = x.createRadialGradient(W / 2, H + 120, 40, W / 2, H + 120, 900); gr.addColorStop(0, 'rgba(163,92,240,.55)'); gr.addColorStop(.5, 'rgba(110,50,200,.18)'); gr.addColorStop(1, 'rgba(6,5,9,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        var g2 = x.createRadialGradient(W - 120, -60, 10, W - 120, -60, 520); g2.addColorStop(0, 'rgba(195,139,255,.22)'); g2.addColorStop(1, 'rgba(6,5,9,0)'); x.fillStyle = g2; x.fillRect(0, 0, W, H);
        x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '500 24px ' + F; x.fillText('OduvanovSchool · отдел продаж', 72, 104);
        x.fillStyle = '#fff'; x.font = '600 64px ' + F; x.fillText('Отчёт по продажам', 72, 184);
        x.fillStyle = '#d7b6ff'; x.font = '500 32px ' + F; x.fillText(human(rep.a, rep.b), 72, 234);
        [['Сумма оплат', RUB(c.sum), delta(c.sum, p.sum)], ['Продаж', NUM(c.n), delta(c.n, p.n)], ['Средний чек', RUB(c.avg), delta(c.avg, p.avg)], ['Покупателей', NUM(c.buyers), delta(c.buyers, p.buyers)]].forEach(function (t, i) {
          var X = 72 + (i % 2) * 476, Y = 284 + Math.floor(i / 2) * 186, w = 460, h = 170;
          rr(X, Y, w, h, 28); x.fillStyle = i ? 'rgba(255,255,255,.045)' : 'rgba(163,92,240,.16)'; x.fill(); x.strokeStyle = i ? 'rgba(255,255,255,.09)' : 'rgba(195,139,255,.35)'; x.lineWidth = 2; x.stroke();
          x.fillStyle = 'rgba(255,255,255,.55)'; x.font = '500 22px ' + F; x.fillText(t[0].toUpperCase(), X + 32, Y + 52);
          x.fillStyle = '#fff'; x.font = '600 ' + (t[1].length > 11 ? 50 : 60) + 'px ' + F; x.fillText(t[1], X + 32, Y + 116);
          var d = t[2]; x.font = '600 22px ' + F; var dw = x.measureText(d.t).width + 24; rr(X + 32, Y + 130, dw, 30, 15); x.fillStyle = d.c === 'up' ? 'rgba(70,200,120,.18)' : d.c === 'down' ? 'rgba(255,90,90,.18)' : 'rgba(255,255,255,.1)'; x.fill();
          x.fillStyle = d.c === 'up' ? '#7be3a5' : d.c === 'down' ? '#ff9a9a' : '#fff'; x.fillText(d.t, X + 44, Y + 153);
          x.fillStyle = 'rgba(255,255,255,.4)'; x.font = '500 20px ' + F; x.fillText('к прошлому периоду', X + 32 + dw + 12, Y + 153) });
        var S = repSeries(rep.data.cur), cy = 690, chh = 140, cw = W - 144, mx = Math.max.apply(null, S.map(function (s) { return s.v }).concat([1])), bw = cw / Math.max(1, S.length);
        x.fillStyle = '#fff'; x.font = '600 28px ' + F; x.fillText('Оплаты', 72, cy);
        var bg = x.createLinearGradient(0, cy + 24, 0, cy + 24 + chh); bg.addColorStop(0, '#e2c9ff'); bg.addColorStop(1, '#8f4ff0');
        S.forEach(function (s, i) { var h = chh * s.v / mx, w = Math.max(3, Math.min(bw - 6, 48)); x.fillStyle = s.v ? bg : 'rgba(255,255,255,.08)'; rr(72 + bw * i + (bw - w) / 2, cy + 24 + chh - Math.max(h, 4), w, Math.max(h, 4), Math.min(6, w / 2)); x.fill() });
        var ty = 900; x.fillStyle = '#fff'; x.font = '600 28px ' + F; x.fillText('Тарифы', 72, ty);
        var top = T.slice(0, 5), mT = top.length ? top[0].n : 1;
        if (!top.length) { x.fillStyle = 'rgba(255,255,255,.5)'; x.font = '500 24px ' + F; x.fillText('Оплат за период нет', 72, ty + 56) }
        top.forEach(function (t, i) { var Y = ty + 28 + i * 56; x.font = '500 23px ' + F; x.fillStyle = '#fff'; x.fillText(fit(t.name, 700), 72, Y + 26);
          x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText((tn ? Math.round(t.n / tn * 100) : 0) + '%', 900, Y + 26); x.fillStyle = '#fff'; x.font = '600 23px ' + F; x.fillText(t.n + ' шт', W - 72, Y + 26); x.textAlign = 'left';
          rr(72, Y + 38, W - 144, 6, 3); x.fillStyle = 'rgba(255,255,255,.07)'; x.fill(); var lg = x.createLinearGradient(72, 0, W - 72, 0); lg.addColorStop(0, '#8f4ff0'); lg.addColorStop(1, '#d7b6ff'); rr(72, Y + 38, Math.max(8, (W - 144) * t.n / mT), 6, 3); x.fillStyle = lg; x.fill() });
        if (T.length > 5) { x.fillStyle = 'rgba(255,255,255,.45)'; x.font = '500 20px ' + F; x.fillText('и ещё ' + (T.length - 5) + ' — в кабинете', 72, ty + 28 + 5 * 56 + 22) }
        var now = new Date(); x.fillStyle = 'rgba(255,255,255,.35)'; x.font = '500 20px ' + F; x.fillText('Данные GetCourse · сформировано ' + dd(now) + ' в ' + ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2), 72, H - 48);
        return new Promise(function (res) { cv.toBlob(function (b) { res(URL.createObjectURL(b)) }, 'image/png') }) }) };
    var modal = function (url) { var m = document.createElement('div'); m.className = 'fss-modal';
      var name = 'Продажи ' + (key(rep.a) === key(rep.b) ? dd(rep.a) : dd(rep.a) + '–' + dd(rep.b)) + '.png';
      m.innerHTML = '<div class="fss-mw"><img alt="Отчёт" src="' + url + '"><div class="fss-mb"><button type="button" class="p fss-dl">Скачать PNG</button><button type="button" class="fss-cp">Копировать</button><button type="button" class="fss-x">Закрыть</button></div></div>';
      document.body.appendChild(m);
      var close = function () { m.remove(); document.removeEventListener('keydown', kd) }, kd = function (e) { if (e.key === 'Escape') close() }; document.addEventListener('keydown', kd);
      m.addEventListener('click', function (e) { if (e.target === m) close() }); m.querySelector('.fss-x').onclick = close;
      m.querySelector('.fss-dl').onclick = function () { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove() };
      var cp = m.querySelector('.fss-cp'); cp.onclick = function () { fetch(url).then(function (r) { return r.blob() }).then(function (b) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]) }).then(function () { cp.textContent = 'Скопировано' }).catch(function () { cp.textContent = 'Не вышло — скачай' }) } };

    /* ---------- каркас страницы ---------- */
    var show = function () { [].forEach.call(root.querySelectorAll('.fss-tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === tab) });
      try { history.replaceState(null, '', '/pl/sales/dealstat?fs=' + tab) } catch (e) {}
      ({ overview: renderOverview, dynamics: renderDynamics, cumulative: renderCumulative, structure: renderStructure, report: renderReport })[tab]() };
    var mount = function () { if (document.querySelector('.fss')) return true;
      var host = document.querySelector('.standard-page-content') || document.querySelector('.rd-page-content, .rd-page, [class*="page-content"]') || document.querySelector('.gc-main-content .container') || document.querySelector('.gc-main-content');
      if (!host) return false;
      var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
      host.classList.add('fss-host');
      root = document.createElement('div'); root.className = 'fss';
      root.innerHTML = '<div class="fss-top"><div><h1>Статистика продаж</h1><p>Данные GetCourse в реальном времени</p></div><a class="fss-gc" href="/pl/sales/dealstat?fs=gc">Классический вид GetCourse</a></div>'
        + '<div class="fss-tabs">' + TABS.map(function (t) { return '<button type="button" data-t="' + t[0] + '">' + t[1] + '</button>' }).join('') + '</div><div class="fss-body"></div>';
      host.insertBefore(root, host.firstChild); body = root.querySelector('.fss-body'); document.title = 'Статистика продаж';
      [].forEach.call(root.querySelectorAll('.fss-tabs button'), function (b) { b.onclick = function () { tab = b.getAttribute('data-t'); show() } });
      show(); return true };
    var tries = 0, go = function () { if (!mount() && ++tries < 40) setTimeout(go, 150) };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();
