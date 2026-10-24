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
  // 1) дерево: подтренинги и уроки с датами открытия
  G.step = 'tree';
  const subs = [];
  async function walk(id, path) {
    const d = dp(await get('/teach/control/stream/view/id/' + id));
    const lessons = [...d.querySelectorAll('ul.lesson-list>li[data-lesson-id]')].map(li => ({
      id: +li.dataset.lessonId,
      t: (li.querySelector('.title')?.childNodes[0]?.textContent || '').trim(),
      date: (li.querySelector('.lesson-date')?.textContent || '').replace(/\s+/g, ' ').replace('Дата и время начала', '').trim()}));
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
  const out = JSON.stringify({at: new Date().toISOString(), students, subs, hw, surveys, surveyTitles: S, access, tariff, amz});
  const s = {uploadScript: 'x'}; getUploadifySecretLink([], s);
  const fd = new FormData(); fd.append('fullAnswer', 'true'); fd.append('Filedata', new File([out], 'gm.txt', {type: 'text/plain'}));
  G.url = await new Promise(res => { const x = new XMLHttpRequest(); x.open('POST', s.uploadScript); x.onload = () => { try { res(JSON.parse(x.responseText).download_url); } catch (e) { res('ERR'); } }; x.onerror = () => res('xhrerr'); x.send(fd); });
  G.size = out.length; G.step = 'done'; G.done = true;
})().catch(e => { window.__gm.err.push(String(e)); window.__gm.done = true; });
'started';
