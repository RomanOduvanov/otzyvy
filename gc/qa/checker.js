/* OduvanovSchool · QA верстки — проверяльщик страницы.
   Запускается внутри страницы (Playwright или консоль браузера): window.__qa.check(opts) → { issues: [...] }.
   Ищет то, что Роман находил руками: вылезание за экран, перекрытия кнопок (в т.ч. плавающими элементами),
   мелкие зоны нажатия, контент под часами/полосой Telegram, обрезанный текст, поля с зумом на iPhone,
   битые картинки, мусор в тексте (undefined/NaN), висячие предлоги и неверные склонения.
   opts: { top: px сверху, занятые Telegram; bottom: px снизу; ignore: 'css-селектор'; mobile: bool } */
(function () {
  if (window.__qa) return;
  var PREP = /(^|[\s(«"„])(в|во|на|и|а|с|со|к|ко|о|об|обо|у|от|до|по|за|из|не|ни|для|без|но|же|при|над|под|про|что|как|или|то|это)\s(?=[^\s ])/i;
  var DASH = /[^\s ]\s[—–]\s/;
  var UNIT = /\d\s(₽|%|\$|ч\b|мин\b|дн|руб|сек\b|МСК|урок|балл|домаш|оплат|заказ|учени|ответ)/;
  var NOUNS = [ /* [основа, ед., 2–4, 5+] */
    ['урок', 'урок', 'урока', 'уроков'], ['балл', 'балл', 'балла', 'баллов'], ['д', 'день', 'дня', 'дней'], ['ученик', 'ученик', 'ученика', 'учеников'],
    ['ответ', 'ответ', 'ответа', 'ответов'], ['оплат', 'оплата', 'оплаты', 'оплат'], ['заказ', 'заказ', 'заказа', 'заказов'], ['домаш', 'домашка', 'домашки', 'домашек'],
    ['анкет', 'анкета', 'анкеты', 'анкет'], ['час', 'час', 'часа', 'часов'], ['минут', 'минута', 'минуты', 'минут'], ['медал', 'медаль', 'медали', 'медалей']];
  function plForm(n) { n = Math.abs(n) % 100; var k = n % 10; return n > 10 && n < 20 ? 3 : k > 1 && k < 5 ? 2 : k === 1 ? 1 : 3 }
  function plural(t) { var out = [], re = /(^|[^\d.,:])(\d{1,6})\s([а-яё]+)/gi, m;
    while ((m = re.exec(t))) { var n = +m[2], w = m[3].toLowerCase();
      NOUNS.forEach(function (f) { var idx = [f[1], f[2], f[3]].indexOf(w); if (idx < 0) return; var want = f[plForm(n)]; if (w !== want) out.push(n + ' ' + w + ' → ' + n + ' ' + want) }) }
    return out }
  function vis(e) { if (!e || !e.getBoundingClientRect) return false; var r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false;
    var cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity <= 0.05 || cs.display === 'none') return false;
    for (var q = e.parentElement, i = 0; q && i < 8; q = q.parentElement, i++) if (+getComputedStyle(q).opacity <= 0.05) return false; return true } /* 29.10: спрятанная плашка (прозрачный предок) — не видна */
  function sel(e) { if (!e || e.nodeType !== 1) return String(e); var s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id;
    var c = (typeof e.className === 'string' ? e.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2); if (c.length) s += '.' + c.join('.');
    var t = (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30); return t ? s + ' «' + t + '»' : s }
  function box(e) { var r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)] }
  function clipped(e) { /* элемент внутри контейнера с прокруткой/обрезкой по X — его вылезание не считаем */
    for (var p = e.parentElement; p && p !== document.body; p = p.parentElement) { var o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return p } return null }
  function fixedAnc(e) { for (var p = e; p && p !== document.body; p = p.parentElement) { var ps = getComputedStyle(p).position; if (ps === 'fixed' || ps === 'sticky') return p } return null }
  /* элемент действительно виден в своей точке (не обрезан прокручиваемым контейнером и не под другим слоем) */
  function seenAt(e) { var r = e.getBoundingClientRect(), x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + Math.min(r.height / 2, 10)));
    if (r.bottom < 0 || r.top > innerHeight) return false; var h = document.elementFromPoint(x, y); return !!h && (h === e || e.contains(h)) }
  var INTER = 'a[href],button,input:not([type=hidden]),select,textarea,[role=button],label[for],summary';
  function check(o) {
    o = o || {}; var W = document.documentElement.clientWidth, H = innerHeight, I = [], ign = o.ignore ? [].slice.call(document.querySelectorAll(o.ignore)) : [];
    var skip = function (e) { return ign.some(function (x) { return x === e || x.contains(e) }) };
    var add = function (type, sev, e, msg) { if (e && skip(e)) return; I.push({ type: type, sev: sev, el: e ? sel(e) : '', box: e ? box(e) : null, msg: msg || '' }) };
    /* 1. горизонтальная прокрутка страницы */
    var sw = document.documentElement.scrollWidth; if (sw > W + 1) add('overflow-x', 'error', null, 'страница шире экрана: ' + sw + ' > ' + W);
    var all = [].slice.call(document.body.querySelectorAll('*')).filter(function (e) { return !/^(SCRIPT|STYLE|LINK|META|BR|svg|path|NOSCRIPT)$/i.test(e.tagName) && vis(e) });
    var seen = new Set();
    all.forEach(function (e) { var r = e.getBoundingClientRect();
      if ((r.right > W + 1 || r.left < -1) && !clipped(e)) { var p = e.parentElement; if (p && seen.has(p)) { seen.add(e); return } seen.add(e);
        add('outside', 'error', e, 'выходит за экран: ' + Math.round(r.left) + '…' + Math.round(r.right) + ' при ширине ' + W) } });
    /* 2. текст вылезает из своего блока / обрезан без многоточия */
    all.forEach(function (e) { if (!e.firstChild || ![].some.call(e.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim() })) return;
      var cs = getComputedStyle(e); if (cs.display === 'inline') return;
      if (e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0) { if (cs.overflowX === 'visible') add('text-spill', 'warn', e, 'текст шире блока на ' + (e.scrollWidth - e.clientWidth) + ' px');
        else if (cs.textOverflow !== 'ellipsis' && !/auto|scroll/.test(cs.overflowX)) add('text-cut', 'warn', e, 'текст обрезан без «…»') } });
    /* 3. кнопки: перекрыты другим элементом, слишком мелкие, под полосами Telegram */
    var inter = [].slice.call(document.querySelectorAll(INTER)).filter(function (e) { return vis(e) && !e.closest('[aria-hidden=true]') && getComputedStyle(e).pointerEvents !== 'none' });
    function visRect(e) { var r = e.getBoundingClientRect(), L = r.left, T = r.top, R2 = r.right, B = r.bottom;
      for (var q = e.parentElement; q && q !== document.body && q !== document.documentElement; q = q.parentElement) { var cs = getComputedStyle(q); if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
        var c = q.getBoundingClientRect(); L = Math.max(L, c.left); T = Math.max(T, c.top); R2 = Math.min(R2, c.right); B = Math.min(B, c.bottom) }
      return R2 - L < 2 || B - T < 2 ? null : { left: L, top: T, width: R2 - L, height: B - T } }
    function coverOf(e) { var r = visRect(e), cover = null, hits = 0, n = 0; if (!r) return null;
      [[.5, .5], [.2, .5], [.8, .5]].forEach(function (p) { var x = r.left + r.width * p[0], y = r.top + r.height * p[1]; if (x < 0 || x >= W || y < 0 || y >= H) return; n++; var h = document.elementFromPoint(x, y);
        if (h && h !== e && !e.contains(h) && !h.contains(e) && !(e.tagName === 'LABEL' && h === e.control)) { hits++; cover = h } });
      return n && hits >= Math.min(2, n) ? cover : null }
    inter.forEach(function (e) { var r = e.getBoundingClientRect();
      if (r.bottom > 0 && r.top < H && r.right > 0 && r.left < W) {
        var cover = coverOf(e);
        /* под плавающей панелью — ошибка, только если элемент нельзя вывести из-под неё прокруткой */
        if (cover && fixedAnc(cover) && !fixedAnc(e)) { var sx = scrollX, sy = scrollY, sc = [], q; for (q = e.parentElement; q; q = q.parentElement) if (q.scrollHeight > q.clientHeight || q.scrollWidth > q.clientWidth) sc.push([q, q.scrollTop, q.scrollLeft]);
          try { e.scrollIntoView({ block: 'center', inline: 'nearest' }) } catch (x) {} cover = coverOf(e); scrollTo(sx, sy); sc.forEach(function (a) { a[0].scrollTop = a[1]; a[0].scrollLeft = a[2] }); r = e.getBoundingClientRect() }
        if (cover) { var fx = fixedAnc(cover); add('covered', 'error', e, 'перекрыто: ' + sel(fx || cover)) }
        var inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.parentElement && e.parentElement.innerText.trim().length > e.innerText.trim().length + 10;
        var lim = o.mobile ? 32 : 24; if (!inline && (r.width < lim || r.height < lim) && r.width > 0 && !/^(INPUT)$/.test(e.tagName) || (e.tagName === 'INPUT' && /checkbox|radio/.test(e.type) && 0))
          add('tap-small', r.width < 24 || r.height < 24 ? 'error' : 'warn', e, 'зона нажатия ' + Math.round(r.width) + '×' + Math.round(r.height) + ' (нужно от 44×44, минимум 32)');
        if (o.top && r.top < o.top - 1 && r.bottom > 0 && scrollY < 2 && seenAt(e)) add('under-top', 'error', e, 'под часами/кнопками Telegram: верх ' + Math.round(r.top) + ' < ' + o.top);
        if (o.bottom && r.bottom > H - o.bottom + 1 && r.top < H && fixedAnc(e)) add('under-bottom', 'error', e, 'под нижней полосой телефона: низ ' + Math.round(r.bottom) + ' > ' + (H - o.bottom)) }
      if (o.mobile && /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && !/^(checkbox|radio|range|file|button|submit|color)$/.test(e.type) && parseFloat(getComputedStyle(e).fontSize) < 16) add('input-zoom', 'warn', e, 'шрифт поля ' + getComputedStyle(e).fontSize + ' — iPhone увеличит страницу при вводе (нужно 16px)') });
    /* 4. текст под часами (только верх страницы) */
    if (o.top && scrollY < 2) all.forEach(function (e) { if (!e.firstChild || ![].some.call(e.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim() })) return; var r = e.getBoundingClientRect();
      if (r.top < o.top - 1 && r.bottom > 0 && !e.closest(INTER) && seenAt(e)) add('under-top', 'error', e, 'текст под часами/кнопками Telegram: верх ' + Math.round(r.top)) });
    /* 5. картинки, мелкий шрифт, мусор */
    [].forEach.call(document.images, function (im) { if (vis(im) && im.complete && !im.naturalWidth && im.getAttribute('src')) add('img-broken', 'error', im, 'картинка не загрузилась: ' + im.getAttribute('src').slice(0, 80)) });
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n, typo = {}, plu = {};
    while ((n = walker.nextNode())) { var t = n.textContent; if (!t.trim() || !n.parentElement || !vis(n.parentElement) || /^(SCRIPT|STYLE|TEXTAREA|CODE)$/.test(n.parentElement.tagName)) continue;
      var pe = n.parentElement, fs = parseFloat(getComputedStyle(pe).fontSize);
      if (fs > 0 && fs < 10) add('font-tiny', 'warn', pe, 'шрифт ' + fs + 'px');
      if (/\b(undefined|NaN|null|\[object Object\])\b/.test(t) && !pe.closest('[data-qa-raw]')) add('garbage', 'error', pe, 'в тексте: ' + t.trim().slice(0, 60));
      var m = t.match(PREP); if (m && t.trim().length > 12) { var k = 'предлог «' + m[2] + '»: ' + t.trim().slice(0, 50); if (!typo[k]) { typo[k] = 1; add('nbsp', 'info', pe, k) } }
      if (DASH.test(t)) { var k2 = 'тире: ' + t.trim().slice(0, 50); if (!typo[k2]) { typo[k2] = 1; add('nbsp', 'info', pe, k2) } }
      if (UNIT.test(t)) { var k3 = 'число и единица: ' + t.trim().slice(0, 50); if (!typo[k3]) { typo[k3] = 1; add('nbsp', 'info', pe, k3) } }
      plural(t).forEach(function (p) { if (!plu[p]) { plu[p] = 1; add('plural', 'error', pe, p) } }) }
    return { W: W, H: H, scrollY: scrollY, issues: I } }
  /* обвести найденное на странице (для скриншота с пометками) */
  function mark(issues) { unmark(); var L = document.createElement('div'); L.id = '__qaMarks'; L.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none';
    var col = { error: '#ff2d55', warn: '#ffb020', info: '#5ea8ff' };
    issues.forEach(function (x, i) { if (!x.box || x.sev === 'info') return; var d = document.createElement('div'), b = x.box;
      d.style.cssText = 'position:absolute;left:' + b[0] + 'px;top:' + b[1] + 'px;width:' + Math.max(4, b[2]) + 'px;height:' + Math.max(4, b[3]) + 'px;outline:2px solid ' + col[x.sev] + ';outline-offset:1px;background:' + col[x.sev] + '22';
      var t = document.createElement('span'); t.textContent = i + 1; t.style.cssText = 'position:absolute;left:-2px;top:-16px;font:700 11px/14px system-ui;color:#fff;background:' + col[x.sev] + ';padding:0 4px;border-radius:4px';
      d.appendChild(t); L.appendChild(d) }); document.body.appendChild(L) }
  function unmark() { var L = document.getElementById('__qaMarks'); if (L) L.remove() }
  window.__qa = { check: check, mark: mark, unmark: unmark, plural: plural };
})();
