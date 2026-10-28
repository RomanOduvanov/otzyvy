// Снимки страниц кабинета для QA (бэклог №7). Запускать во встроенном браузере на любой странице
// https://oduvanovroman.getcourse.ru под админом: вставить файл целиком, ждать window.__qs.done, взять window.__qs.url.
// Потом на Маке: node qa/snap_save.js "<url>" — страницы лягут в qa/fixtures/gc/live-*.html (в git не хранятся: там живые данные).
// Личное вычищается: почты, телефоны, csrf, ключи и hash в ссылках; id админа заменяется на ученика 500001.
window.__qs = {done: false, err: []};
(async () => {
  const Q = window.__qs, P = {
    'live-trainings': '/teach/control/stream',
    'live-stream': '/teach/control/stream/view/id/935917159',
    'live-lesson': '/pl/teach/control/lesson/view?id=350513299',
    'live-anketa': '/pl/teach/control/lesson/view?id=350513305',
    'live-hw': '/pl/teach/control/lesson/view?id=350329259',
    'live-dealstat': '/pl/sales/dealstat'};
  const clean = h => h
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, 'user@example.com')
    .replace(/\+?[78][\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g, '+7 000 000-00-00')
    .replace(/(name="(?:_csrf|csrf-token)"[^>]*(?:value|content)=")[^"]*/g, '$1qa')
    .replace(/(csrf[\w-]*["']?\s*[:=]\s*["'])[^"']+/gi, '$1qa')
    .replace(/fs1\.[0-9a-f]{32}/g, 'fs1.' + '0'.repeat(32))
    .replace(/([?&](?:hash|key|token|t)=)[^&"'\s<]+/g, '$1qa')
    .replace(/\b499631257\b/g, '500001');
  const out = {};
  for (const [k, u] of Object.entries(P)) { try { const r = await fetch(u); out[k] = clean(await r.text()) } catch (e) { Q.err.push(k + ' ' + e) } }
  const body = JSON.stringify({at: new Date().toISOString(), pages: out});
  const s = {uploadScript: 'x'}; getUploadifySecretLink([], s);
  const fd = new FormData(); fd.append('fullAnswer', 'true'); fd.append('Filedata', new File([body], 'qs.txt', {type: 'text/plain'}));
  Q.url = await new Promise(res => { const x = new XMLHttpRequest(); x.open('POST', s.uploadScript); x.onload = () => { try { res(JSON.parse(x.responseText).download_url) } catch (e) { res('ERR') } }; x.onerror = () => res('xhrerr'); x.send(fd) });
  Q.n = Object.keys(out).length; Q.size = body.length; Q.done = true;
})().catch(e => { window.__qs.err.push(String(e)); window.__qs.done = true });
'started';
