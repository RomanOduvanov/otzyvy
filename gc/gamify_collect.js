// Сборщик данных для рейтинга потока 2.0. Запускать во встроенном браузере на любой странице
// https://oduvanovroman.getcourse.ru (вход админом). Старт: вставить весь файл; потом опрашивать
// window.__gm.done. Результат: window.__gm.url — ссылка на JSON в файловом хранилище GetCourse.
window.__gm = {done: false, step: 'start', err: []};
(async () => {
  const G = window.__gm, ROOT = 935917158;
  const MODS = [935917159,935917160,935917165,935917169,935917170,935917173,935917189,935917174,935917184,935917186];
  const HW = [350329259,350329282,350329290,350329324,350329369,350329396,350515071,350515134,350515156]; // 3 последних — новые копии ДЗ после пересоздания уроков 24.10.2026, старые id оставлены ради уже сданных ответов
  const dp = t => new DOMParser().parseFromString(t, 'text/html');
  const get = async u => (await fetch(u)).text();
  // тип урока и стоп-урок (для /ma/learn): анкета / ДЗ / урок; стоп-урок GetCourse помечает .is-stop-lesson (так же читает layout.js) или текстом «стоп-урок»
  const kindOf = (id, t) => /^Анкета/i.test(t) ? 'anketa' : (HW.includes(id) || /^(Домашнее задание|Задание по итогу)/i.test(t)) ? 'hw' : 'lesson';
  const isStop = el => !!el.querySelector('.is-stop-lesson, .stop-lesson, [class*="is-stop"]') || /is-stop-lesson|stop-lesson/.test(el.className || '') || /стоп-урок/i.test(el.textContent || '');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // 1) дерево: подтренинги и уроки с датами открытия
  G.step = 'tree';
  const subs = [];
  async function walk(id, path) {
    const d = dp(await get('/teach/control/stream/view/id/' + id));
    const lessons = [...d.querySelectorAll('ul.lesson-list>li[data-lesson-id]')].map(li => { const t = (li.querySelector('.title')?.childNodes[0]?.textContent || '').trim(), o = {
      id: +li.dataset.lessonId, t,
      date: (li.querySelector('.lesson-date')?.textContent || '').replace(/\s+/g, ' ').replace('Дата и время начала', '').trim(), kind: kindOf(+li.dataset.lessonId, t)};
      if (isStop(li)) o.stop = 1; return o });
    if (lessons.length) subs.push({id, path, lessons});
    for (const tr of d.querySelectorAll('.stream-table tr.training-row'))
      await walk(+tr.dataset.trainingId, path + ' / ' + tr.querySelector('.stream-title').textContent.trim());
  }
  for (const m of MODS) await walk(m, String(m));
  // 2) ученики потока + посещённые уроки по каждому подтренингу
  G.step = 'students';
  async function statTable(id) {
    const res = {};
    for (let p = 1; p < 40; p++) {
      const d = dp(await get(`/teach/control/stat/stream/id/${id}?page=${p}`));
      let added = 0;
      for (const tr of d.querySelectorAll('tr')) {
        const cb = tr.querySelector('input.user-checkbox'); if (!cb) continue;
        if (res[cb.value]) continue;
        const td = [...tr.querySelectorAll('td')].map(x => x.textContent.replace(/\s+/g, ' ').trim());
        res[cb.value] = {name: td[1], visited: +td[2] || 0, answers: +td[3] || 0}; added++;
      }
      if (!added) break;
    }
    return res;
  }
  const students = await statTable(ROOT);
  const q = [...subs];
  async function w() { while (q.length) { const s = q.shift(); try { s.users = await statTable(s.id); } catch (e) { G.err.push('sub ' + s.id); } } }
  await Promise.all([1,2,3,4].map(w));
  // 2б) пройденные уроки каждого ученика (для /ma/learn): /teach/control/stat/userTraining/id/<uid>/trainingId/<sub>
  // только пары, где у ученика «посетил уроков» в подтренинге > 0. Строка: td.item-main-td с div.link.title[href*="/lesson/view/id/<id>"];
  // пройдено — span.lesson-list__video-watched («просмотрено») или .user-state-label/.user-state-* с accomplished/answered/viewed (как в layout.js).
  G.step = 'passed';
  const passed = {}, stops = new Set(); G.seen = {};
  const pq = []; for (const s of subs) for (const [uid, r] of Object.entries(s.users || {})) if (students[uid] && r.visited > 0) pq.push([uid, s.id]);
  G.pairs = pq.length; G.pdone = 0; const t0 = Date.now(); console.log('passed: пар ученик×подтренинг', pq.length);
  const LID = /lesson\/view(?:\/id\/|\?id=)(\d+)/, DONE_CLS = /accomplished|answered|has_answer|viewed|watched|passed|complete/i, DONE_TASK = /accomplished|answered|has_answer|passed|complete/i, DONE_TXT = /просмотрено|пройден|выполнен|ответ отправлен|принят|засчитан/i;
  const TASK = new Set(subs.flatMap(s => s.lessons.filter(l => l.kind !== 'lesson').map(l => l.id)));
  function parsePassed(d) {
    const rows = [...d.querySelectorAll('td.item-main-td')]; if (!rows.length) throw 'empty';
    const ids = [];
    for (const td of rows) {
      const tr = td.closest('tr') || td, a = td.querySelector('.link.title, [href*="/lesson/view"], [data-href*="/lesson/view"], [onclick*="/lesson/view"]');
      const m = String(a && (a.getAttribute('href') || a.getAttribute('data-href') || a.getAttribute('onclick')) || td.innerHTML).match(LID); if (!m) continue;
      const lab = tr.querySelector('.user-state-label'), sc = [...tr.querySelectorAll('[class*="user-state-"]')].map(x => x.className).join(' ');
      for (const k of (sc.match(/user-state-[\w-]+/g) || []).concat(lab ? ['label:' + lab.textContent.replace(/\s+/g, ' ').trim()] : [])) G.seen[k] = (G.seen[k] || 0) + 1;
      if (isStop(tr)) stops.add(+m[1]);
      // ДЗ и анкета пройдены только с ответом (accomplished/answered), «просмотрено» для них не считается — как в layout.js
      const cls = (sc + ' ' + (lab ? lab.className : '')).split(/\s+/).filter(c => /^user-state-/.test(c) && !/not|need|blocked/.test(c)), task = TASK.has(+m[1]);
      const ok = task ? cls.some(c => DONE_TASK.test(c)) || (lab && /ответ отправлен|принят|выполнен|засчитан/i.test(lab.textContent))
        : !!tr.querySelector('span.lesson-list__video-watched') || cls.some(c => DONE_CLS.test(c)) || (lab && DONE_TXT.test(lab.textContent));
      if (ok) ids.push(+m[1]);
    }
    return ids;
  }
  async function pw() { while (pq.length) { const [uid, sid] = pq.shift();
    for (let a = 0; a <= 2; a++) { try {
      const ids = parsePassed(dp(await get(`/teach/control/stat/userTraining/id/${uid}/trainingId/${sid}`)));
      if (ids.length) (passed[uid] = passed[uid] || []).push(...ids); break;
    } catch (e) { if (a === 2) G.err.push('passed ' + uid + '/' + sid); else await sleep(1000 * (a + 1)); } }
    G.pdone++; if (G.pdone % 50 === 0) { const el = (Date.now() - t0) / 1000; G.eta = Math.round(el / G.pdone * (G.pairs - G.pdone)) + ' с'; console.log('passed', G.pdone + '/' + G.pairs, 'осталось ~' + G.eta); } } }
  await Promise.all([1,2,3,4].map(pw));
  for (const u in passed) passed[u] = [...new Set(passed[u])].sort((a, b) => a - b);
  console.log('passed: готово за', Math.round((Date.now() - t0) / 1000), 'с; учеников с пройденными', Object.keys(passed).length, '; стоп-уроков на страницах учеников', stops.size, '; состояния', G.seen);
  // 2в) другие тренинги учеников (бонусы, записи эфиров): корневой список /teach/control/stream; уроки — обход подтренингов; у кого есть — stat/stream
  G.step = 'other';
  const OKEY = [[/спринт/i, 'p-sprint'], [/практикум/i, 'p-practicum'], [/camp|кэмп|лагер/i, 'p-camp'], [/флагман/i, 'p-flagman']];
  const other = [];
  try {
    const rd = dp(await get('/teach/control/stream'));
    const rows = [...rd.querySelectorAll('.stream-table tr.training-row[data-training-id]')].map(tr => ({id: +tr.dataset.trainingId, title: (tr.querySelector('.stream-title')?.textContent || '').replace(/\s+/g, ' ').trim()}))
      .filter(r => r.id !== ROOT && /спринт|практикум|camp|кэмп|записи эфир|флагман/i.test(r.title));
    // уроки тренинга (обход подтренингов): items [{id, t}] и id подтренингов с уроками — для страниц пройденного
    async function walkO(id, depth, acc) { const d = dp(await get('/teach/control/stream/view/id/' + id));
      const ls = [...d.querySelectorAll('ul.lesson-list>li[data-lesson-id]')].map(li => ({id: +li.dataset.lessonId, t: (li.querySelector('.title')?.childNodes[0]?.textContent || '').replace(/\s+/g, ' ').trim()}));
      if (ls.length) { acc.items.push(...ls); acc.subs.push(id) }
      if (depth < 3) for (const tr of d.querySelectorAll('.stream-table tr.training-row[data-training-id]')) await walkO(+tr.dataset.trainingId, depth + 1, acc); return acc }
    for (const r of rows) { try {
      const st = await statTable(r.id), users = {}; for (const [uid, x] of Object.entries(st)) if (students[uid]) users[uid] = x.visited;
      const w = await walkO(r.id, 0, {items: [], subs: []});
      other.push({id: r.id, title: r.title, key: (OKEY.find(k => k[0].test(r.title)) || [])[1] || null, rec: /записи эфир/i.test(r.title) ? 1 : 0, lessons: w.items.length, items: w.items, subs: w.subs, users});
    } catch (e) { G.err.push('other ' + r.id); } }
  } catch (e) { G.err.push('other list'); }
  // пройденные уроки в других тренингах: тот же разбор userTraining, пары «ученик с посещениями в тренинге» × его подтренинги с уроками
  G.step = 'other-passed';
  for (const o of other) for (const [uid, v] of Object.entries(o.users)) if (v > 0) for (const sid of o.subs) pq.push([uid, sid]);
  G.pairs += pq.length; console.log('other-passed: пар', pq.length);
  await Promise.all([1,2,3,4].map(pw));
  for (const u in passed) passed[u] = [...new Set(passed[u])].sort((a, b) => a - b);
  for (const o of other) delete o.subs;
  console.log('other:', other.map(o => o.title + ' — ' + o.lessons + ' ур., учеников ' + Object.keys(o.users).length));
  // 3) домашки: все ответы с уровнем и статусом
  G.step = 'access';
  const access = {}; const aq = Object.keys(students);
  async function aw() { while (aq.length) { const id = aq.shift(); try {
    const t = dp(await get('/pl/user/user/get-user-product-data?id=' + id)).body.innerText.replace(/\s+/g, ' ');
    const m = t.match(/#\d+\. AI-дизайнер с 0 до PRO 2\.0 (\S+)(.{0,80}?)Открывает/);
    access[id] = m ? (m[1] + ' ' + m[2].trim()) : '';
  } catch (e) { access[id] = ''; } } }
  await Promise.all([1,2,3,4,5].map(aw));
  // тариф: лучший оплаченный (Завершен / Частично оплачен) заказ «AI-дизайнер с 0 до PRO 2.0 - <тариф>»
  G.step = 'tariff';
  const RANK = ['Самостоятельный', 'С куратором', 'Премиум', 'Премиум Амазон'];
  const tariff = {}; const tq = Object.keys(students);
  async function tw() { while (tq.length) { const id = tq.shift(); try {
    const t = dp(await get('/pl/user/user/get-user-deal-data?id=' + id)).body.innerText.replace(/\s+/g, ' ');
    const all = [...t.matchAll(/(Завершен|Частично оплачен|Новый|Отменен|Ложный|В работе|Ожидаем оплаты|Оплачен)\s+(?:Заказ|Заявка) #\d+ [^—]*— [\d\s]+ руб\. AI-дизайнер с 0 до PRO 2\.0 - (.+?) (?=СПРИНТ|AI-|Практикум)/g)]
      .filter(m => /Завершен|Частично/.test(m[1])).map(m => m[2].replace(/\s*\(в рассрочку\)/, '').trim());
    tariff[id] = all.sort((a, b) => RANK.indexOf(b) - RANK.indexOf(a))[0] || '';
  } catch (e) { tariff[id] = ''; } } }
  await Promise.all([1,2,3].map(tw));
  // Amazon: источник правды — группа 5014334 «Amazon — доступ к модулю (2.0)»; остальные ученики 2.0 — Премиум
  G.step = 'amz';
  const amz = []; const zq = Object.keys(students);
  async function zw() { while (zq.length) { const id = zq.shift(); for (let a = 0; a < 4; a++) { try {
    const d = dp(await get('/user/control/user/update/id/' + id + '/part/groups'));
    if (!d.querySelector('input[name="User[groupIds][]"]')) throw 'empty';
    if ([...d.querySelectorAll('input[name="User[groupIds][]"]:checked')].some(i => i.value === '5014334')) amz.push(id);
    break; } catch (e) { await new Promise(r => setTimeout(r, 1500)); } } } }
  await Promise.all([1,2].map(zw));
  G.step = 'homework';
  const hw = [];
  for (const lid of HW) {
    const seen = new Set();
    for (let p = 1; p < 30; p++) {
      const d = dp(await get(`/teach/control/answers/unanswered?lesson_id=${lid}&filter%5Bstatus%5D=&page=${p}`));
      let added = 0;
      for (const a of d.querySelectorAll('.answer_wrapper[data-id]')) {
        if (seen.has(a.dataset.id)) continue; seen.add(a.dataset.id); added++;
        const txt = a.querySelector('.answer-main-content, .answer-content')?.textContent.replace(/\s+/g, ' ') || '';
        const levels = [];
        a.querySelectorAll('.addfield, .user-answer-addfield, [class*="addfield"]').forEach(f => {
          const t = f.textContent.replace(/\s+/g, ' ').trim();
          if (/Лёгкий|Легкий/.test(t) && /да|✓|1/i.test(t)) levels.push('easy');
          if (/Средний/.test(t) && /да|✓|1/i.test(t)) levels.push('mid');
          if (/Максимальный/.test(t) && /да|✓|1/i.test(t)) levels.push('max');
        });
        hw.push({lesson: lid, id: +a.dataset.id, uid: a.dataset.userId,
          status: (a.className.match(/status-(\w+)/) || [])[1] || '',
          date: (a.querySelector('.answer-date')?.textContent || '').replace(/[•\s]+/g, ' ').trim(),
          levels: [...new Set(levels)], raw: txt.slice(0, 300)});
      }
      if (!added) break;
    }
  }
  // 4) анкеты ОС: кто и когда заполнил
  G.step = 'surveys';
  const idx = await get('/user/control/survey/index');
  const S = {};
  for (const a of dp(idx).querySelectorAll('a[href*="survey-answer/list"]')) { const id = a.href.match(/surveyId=(\d+)/)?.[1]; if (id) S[id] = a.closest('tr')?.innerText.replace(/\s+/g, ' ').trim() || id; }
  for (const m of idx.matchAll(/(\d{6})\s*<\/td>\s*<td[^>]*>\s*(?:<a[^>]*>)?\s*([^<]*Анкет[^<]*)/g)) S[m[1]] = m[2].trim();
  const surveys = [];
  for (const sid of Object.keys(S)) {
    for (let p = 1; p < 30; p++) {
      const d = dp(await get(`/pl/user/survey-answer/list?surveyId=${sid}&page=${p}&per-page=100`));
      let added = 0;
      for (const tr of d.querySelectorAll('tr')) {
        const ul = tr.querySelector('a[href*="/user/control/user/update/id/"]'); const ua = tr.querySelector('a[href*="survey-answer/update?id="]');
        if (!ul || !ua) continue;
        const id = ua.getAttribute('href').match(/id=(\d+)/)[1]; if (surveys.find(x => x.id === id)) continue;
        const tds = [...tr.querySelectorAll('td')].map(t => t.innerText.trim().replace(/\s+/g, ' '));
        surveys.push({id, sid, uid: ul.getAttribute('href').match(/id\/(\d+)/)[1], created: tds[2]}); added++;
      }
      if (!added) break;
    }
  }
  G.step = 'ship';
  const out = JSON.stringify({at: new Date().toISOString(), students, subs, hw, surveys, surveyTitles: S, access, tariff, amz, passed, stops: [...stops], other});
  const s = {uploadScript: 'x'}; getUploadifySecretLink([], s);
  const fd = new FormData(); fd.append('fullAnswer', 'true'); fd.append('Filedata', new File([out], 'gm.txt', {type: 'text/plain'}));
  G.url = await new Promise(res => { const x = new XMLHttpRequest(); x.open('POST', s.uploadScript); x.onload = () => { try { res(JSON.parse(x.responseText).download_url); } catch (e) { res('ERR'); } }; x.onerror = () => res('xhrerr'); x.send(fd); });
  G.size = out.length; G.step = 'done'; G.done = true;
})().catch(e => { window.__gm.err.push(String(e)); window.__gm.done = true; });
'started';
