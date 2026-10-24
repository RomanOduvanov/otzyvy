/* OduvanovSchool API (Cloudflare Worker + D1)
   — учёт времени: активное время в кабинете и время просмотра видео уроков;
   — ежедневные снимки рейтинга (data.json с GitHub Pages) для сравнения периодов;
   — отчёты родителям: настройки, сборка письма, рассылка по расписанию, отписка.
   Переменные окружения: DB (D1), RESEND_KEY (опц.), MAIL_FROM (опц.), ADMIN_KEY. */

const DATA_URL = 'https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/data.json';
/* отчёты родителям идут 4 месяца на текущей версии продукта (старт потока 12.10.2026); срок меняется через env.REPORT_UNTIL */
const REPORT_UNTIL = '2027-02-12';
const until = env => (env && env.REPORT_UNTIL) || REPORT_UNTIL;
const ORIGINS = ['https://oduvanovroman.getcourse.ru', 'https://romanoduvanov.github.io'];
const SITE = 'https://oduvanovroman.getcourse.ru';
const CARE = 'https://t.me/zabota_oduvanov';
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

/* ---------- утилиты ---------- */
const msk = (d = new Date()) => new Date(d.getTime() + 3 * 3600e3); // «московские» часы в UTC-полях
const dayStr = d => msk(d).toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) };
const human = s => { const d = new Date(s + 'T00:00:00Z'); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] };
const pl = (n, f) => { n = Math.abs(n) % 100; const a = n % 10; return n > 10 && n < 20 ? f[2] : a > 1 && a < 5 ? f[1] : a === 1 ? f[0] : f[2] };
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nb = s => String(s).replace(/(^|[\s(«—])(в|во|и|к|ко|с|со|о|об|у|а|но|по|на|до|от|за|из|не|ни|для|без|при|про)\s+/gi, (m, a, b) => a + b + ' ');
async function hashUid(uid) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gc2:' + uid)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 16) }
const rnd = () => [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
const hrs = sec => { const m = Math.round(sec / 60); if (m < 60) return m + ' мин'; const h = Math.floor(m / 60), r = m % 60; return h + ' ч' + (r ? ' ' + r + ' мин' : '') };
const hrsShort = sec => { const h = sec / 3600; return h >= 10 ? Math.round(h) + ' ч' : (Math.round(h * 10) / 10).toString().replace('.', ',') + ' ч' };

function cors(req) { const o = req.headers.get('Origin'); return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' } }
const json = (req, obj, st = 200) => new Response(JSON.stringify(obj), { status: st, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) } });
const html = (body, st = 200) => new Response(body, { status: st, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS time (uid INTEGER NOT NULL, day TEXT NOT NULL, site INTEGER NOT NULL DEFAULT 0, video INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (uid, day))',
  'CREATE TABLE IF NOT EXISTS uidmap (uid INTEGER PRIMARY KEY, h TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS uidmap_h ON uidmap (h)',
  'CREATE TABLE IF NOT EXISTS snap (h TEXT NOT NULL, day TEXT NOT NULL, pts INTEGER, lessons INTEGER, hw INTEGER, place INTEGER, PRIMARY KEY (h, day))',
  'CREATE TABLE IF NOT EXISTS parent (uid INTEGER PRIMARY KEY, h TEXT, student TEXT, email TEXT, name TEXT, freq INTEGER, hour INTEGER, channel TEXT, active INTEGER DEFAULT 1, token TEXT, created TEXT, updated TEXT, last_sent TEXT, tg_chat TEXT)',
  'CREATE TABLE IF NOT EXISTS log (at TEXT, kind TEXT, uid INTEGER, info TEXT)'
];
async function ensure(env) { await env.DB.batch(SCHEMA.map(s => env.DB.prepare(s))) }

/* ---------- данные рейтинга и снимки ---------- */
async function loadData(env) { const r = await fetch(((env && env.DATA_URL) || DATA_URL) + '?t=' + Date.now()); if (!r.ok) throw new Error('data.json ' + r.status); return r.json() }
async function snapshot(env, D) {
  const day = dayStr(); const st = env.DB.prepare('INSERT OR REPLACE INTO snap (h, day, pts, lessons, hw, place) VALUES (?,?,?,?,?,?)');
  await env.DB.batch(D.rows.map(r => st.bind(r.h, day, r.pts | 0, r.lessons | 0, r.hw | 0, r.place | 0)));
}
async function snapAt(env, h, day) { return env.DB.prepare('SELECT * FROM snap WHERE h=? AND day<=? AND day>=? ORDER BY day DESC LIMIT 1').bind(h, day, addDays(day, -1)).first() } // снимок не старше суток до границы, иначе сравнение было бы неверным
async function timeSum(env, uid, from, to) { const r = await env.DB.prepare('SELECT COALESCE(SUM(site),0) s, COALESCE(SUM(video),0) v FROM time WHERE uid=? AND day>=? AND day<=?').bind(uid, from, to).first(); return { site: r.s | 0, video: r.v | 0 } }

/* ---------- отчёт ---------- */
async function buildReport(env, uid, opts = {}) {
  const D = opts.D || await loadData(env);
  const h = await hashUid(uid); const r = D.rows.find(x => x.h === h);
  const p = opts.p || await env.DB.prepare('SELECT * FROM parent WHERE uid=?').bind(uid).first() || {};
  const N = Math.max(1, Math.min(7, opts.freq || p.freq || 7));
  const today = dayStr(), end = addDays(today, -1), start = addDays(end, -(N - 1)), pEnd = addDays(start, -1), pStart = addDays(pEnd, -(N - 1));
  const name = (r && r.name) || p.student || 'Ученик';
  // показатели периода: разница снимков на конец периода и на его начало
  const sNow = r ? { pts: r.pts, lessons: r.lessons, hw: r.hw, place: r.place } : null;
  const sEnd = r && await snapAt(env, h, today) || sNow;
  const sStart = r && await snapAt(env, h, pEnd);
  const sPrev = r && await snapAt(env, h, addDays(pStart, -1));
  const cur = sEnd && sStart ? { lessons: sEnd.lessons - sStart.lessons, hw: sEnd.hw - sStart.hw, pts: sEnd.pts - sStart.pts } : null;
  const prev = sStart && sPrev ? { lessons: sStart.lessons - sPrev.lessons, hw: sStart.hw - sPrev.hw, pts: sStart.pts - sPrev.pts } : null;
  const tCur = await timeSum(env, uid, start, end), tPrev = await timeSum(env, uid, pStart, pEnd);
  // активность по дням (последние 7 дней): видео + сайт
  const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(end, -i));
  const tr = await env.DB.prepare('SELECT day, site, video FROM time WHERE uid=? AND day>=? AND day<=?').bind(uid, days[0], end).all();
  const byDay = Object.fromEntries((tr.results || []).map(x => [x.day, x]));
  const D2 = { name, N, start, end, r, cur, prev, tCur, tPrev, place: sEnd && sEnd.place, placePrev: sStart && sStart.place, n: D.n, total: D.total_lessons, days, byDay, sched: D.schedule || [], parentName: p.name || '' };
  return { subject: subjectOf(D2), html: renderReport(D2, { token: p.token, preview: !!opts.preview }) };
}
function delta(a, b) { if (b == null || a == null) return null; if (b === 0) return a === 0 ? { t: 'eq', s: '= 0' } : { t: 'up', s: '▲ +' + a }; const d = Math.round((a - b) / b * 100); return d === 0 ? { t: 'eq', s: '= 0%' } : { t: d > 0 ? 'up' : 'dn', s: (d > 0 ? '▲ +' : '▼ −') + Math.abs(d) + '%' } }
function verdictOf(D) {
  if (!D.cur) return { k: 'ok', t: 'Первый отчёт', s: 'Со следующего отчёта будем сравнивать, как меняется темп. Сейчас у ' + D.name + ' ' + (D.r ? D.r.pts + ' ' + pl(D.r.pts, ['балл', 'балла', 'баллов']) + ' и ' + D.r.lessons + ' ' + pl(D.r.lessons, ['пройденный урок', 'пройденных урока', 'пройденных уроков']) : 'пока нет баллов') + '.' };
  const L = D.cur ? D.cur.lessons : 0, Lp = D.prev ? D.prev.lessons : null, V = D.tCur.video;
  const per = D.N === 1 ? 'день' : D.N === 7 ? 'неделя' : 'период';
  if (L <= 0 && (!D.cur || D.cur.hw <= 0) && V < 300) return { k: 'none', t: D.N === 1 ? 'Вчера занятий не было' : 'Пока не было занятий', s: D.name + ' ещё не возвращался к урокам в этом периоде. Небольшое напоминание обычно помогает вернуться в ритм.' };
  if (Lp != null && Lp > 0 && L < Lp * 0.7) return { k: 'down', t: 'Темп немного снизился', s: (D.N === 1 ? 'Вчера ' : 'За этот период ') + D.name + ' ' + pass(D.name) + ' ' + L + ' ' + pl(L, ['урок', 'урока', 'уроков']) + ' — до этого было ' + Lp + '. Такое бывает, главное — не выпасть из ритма.' };
  if (Lp == null || L >= Lp * 1.15 || L >= 3 * D.N) return { k: 'good', t: per === 'неделя' ? 'Отличная неделя' : per === 'день' ? 'Отличный день' : 'Отличный период', s: D.name + ' ' + pass(D.name) + ' ' + L + ' ' + pl(L, ['урок', 'урока', 'уроков']) + (V >= 600 ? ' и ' + hrs(V) + ' смотрел' + fem(D.name) + ' видео' : '') + (Lp ? ' — это ' + (L >= Lp * 2 ? 'вдвое больше' : 'больше') + ', чем в прошлый раз.' : '.') };
  return { k: 'ok', t: 'Стабильный темп', s: D.name + ' занимается в ровном темпе: ' + L + ' ' + pl(L, ['урок', 'урока', 'уроков']) + ' за ' + (D.N === 1 ? 'день' : D.N + ' ' + pl(D.N, ['день', 'дня', 'дней'])) + '.' };
}
const fem = n => /[аяь]$/i.test(n.trim().split(' ')[0]) && !/^(никита|илья|кузьма|фома|лёва|саша|женя|валера)$/i.test(n.trim().split(' ')[0]) ? 'а' : '';
const pass = n => 'прош' + (fem(n) ? 'ла' : 'ёл');
function tipsOf(D, v) {
  const nm = D.name, he = fem(nm) ? 'она' : 'он', him = fem(nm) ? 'её' : 'его';
  const next = D.sched.map(s => ({ t: new Date(s.at), n: s.name })).filter(s => s.t > new Date()).sort((a, b) => a.t - b.t)[0];
  if (v.k === 'good') {
    let why = 'Скажите, что заметили ' + him + ' старания: признание близких мотивирует сильнее любых баллов.';
    if (D.place && D.place <= 3) why = nm + ' на ' + D.place + '-м месте в потоке из ' + D.n + ' учеников. ' + why;
    else if (D.placePrev && D.place && D.placePrev - D.place >= 3) why = nm + ' поднял' + fem(nm) + 'ся в рейтинге на ' + (D.placePrev - D.place) + ' ' + pl(D.placePrev - D.place, ['место', 'места', 'мест']) + '. ' + why;
    return { praise: why };
  }
  const t = [];
  t.push(['Спросите, что ' + he + ' сейчас изучает', ' — а не «почему мало занимаешься». Интерес к делу поддерживает лучше контроля.']);
  t.push(['Помогите выделить время:', ' 30–40 минут в одно и то же время каждый день дают больше, чем марафон раз в неделю.']);
  if (next) t.push(['Напомните про бонус:', ' ' + next.t.getUTCDate() + ' ' + MONTHS[next.t.getUTCMonth()] + ' открывается «' + next.n.replace(/^Модуль\s*\d+\s*[—-]\s*/, '') + '» — в первые 48 часов баллы за уроки удваиваются.']);
  else t.push(['Отметьте маленькую победу:', ' даже один пройденный урок — шаг вперёд. Похвала за процесс работает лучше упрёков за паузу.']);
  if (v.k === 'none') t[0] = ['Мягко напомните об обучении', ' — например, спросите, какой урок следующий. Без давления: цель — вернуть интерес, а не отчитать.'];
  return { tips: t.slice(0, 3) };
}
function subjectOf(D) { return 'Отчёт об обучении · ' + D.name + ' · ' + (D.N === 1 ? human(D.end) : human(D.start).replace(/ .*/, '') + '–' + human(D.end)) }

function renderReport(D, o) {
  const v = verdictOf(D), T = tipsOf(D, v);
  const per = D.N === 1 ? human(D.end) + ' · день' : (D.start.slice(5, 7) === D.end.slice(5, 7) ? human(D.start).split(' ')[0] : human(D.start)) + '–' + human(D.end) + ' · ' + (D.N === 7 ? 'неделя' : D.N + ' ' + pl(D.N, ['день', 'дня', 'дней']));
  const prevLbl = D.N === 1 ? 'позавчера' : D.N === 7 ? 'прошлая неделя' : 'прошлый период';
  const vc = { good: ['#e9f8ef', '#145c36', '#1a9f5c', '↑'], ok: ['#eef0ff', '#2b3576', '#4b5bd6', '→'], down: ['#fff3e6', '#7a3d00', '#e8780c', '↓'], none: ['#f1eef7', '#3d3552', '#8a7fa8', '·'] }[v.k];
  const C = D.cur || { lessons: 0, hw: 0, pts: 0 }, P = D.prev;
  const met = (title, val, d, sub) => `<td width="50%" style="padding:6px"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:18px"><tr><td style="padding:16px 18px">
    <div style="font-size:13px;color:#6b6780">${title}</div>
    <div style="margin-top:6px"><span style="font-size:30px;font-weight:600;letter-spacing:-.5px;color:#141220">${val}</span>${d ? ` <span style="display:inline-block;vertical-align:6px;margin-left:6px;font-size:12px;font-weight:700;padding:3px 8px;border-radius:99px;${d.t === 'up' ? 'color:#137a45;background:#e3f6ea' : d.t === 'dn' ? 'color:#c5302f;background:#fde9e8' : 'color:#6b6780;background:#efeef3'}">${d.s}</span>` : ''}</div>
    <div style="margin-top:4px;font-size:12px;color:#8a86a0">${sub}</div></td></tr></table></td>`;
  const pd = D.placePrev && D.place ? (D.placePrev - D.place) : null;
  const placeD = pd == null ? null : pd === 0 ? { t: 'eq', s: '= 0' } : { t: pd > 0 ? 'up' : 'dn', s: (pd > 0 ? '▲ +' : '▼ −') + Math.abs(pd) };
  const mx = Math.max(1, ...D.days.map(d => ((D.byDay[d] || {}).video || 0) + ((D.byDay[d] || {}).site || 0) * .25));
  const bars = D.days.map((d, i) => { const x = D.byDay[d] || {}; const val = (x.video || 0) + (x.site || 0) * .25; const hgt = Math.round(70 * val / mx); const wd = WD[new Date(d + 'T00:00:00Z').getUTCDay()];
    return `<td align="center" valign="bottom" style="padding:0 4px"><div style="height:${Math.max(hgt, 3)}px;border-radius:7px;background:${i === 6 ? '#8b45e6' : val ? '#d9c6f7' : '#ece8f4'}"></div><div style="margin-top:6px;font-size:11px;color:#8a86a0">${wd}</div></td>` }).join('');
  const prog = D.r && D.total ? Math.round(100 * D.r.lessons / D.total) : 0;
  const tipsHtml = T.praise ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f1e8fd,#fde9f7);background-color:#f4ebfd;border-radius:18px"><tr><td width="50" valign="top" style="padding:16px 0 16px 16px"><div style="width:34px;height:34px;border-radius:11px;background:#8b45e6;color:#fff;font-size:17px;line-height:34px;text-align:center">★</div></td><td style="padding:16px 16px 16px 12px;font-size:14px;line-height:1.55;color:#35314a"><b style="color:#141220">Самое время похвалить.</b> ${nb(esc(T.praise))}</td></tr></table>`
    : `<div style="font-size:16px;font-weight:600;color:#141220;margin-bottom:4px">Три идеи, как поддержать</div>` + T.tips.map((t, i) => `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px"><tr><td width="38" valign="top"><div style="width:26px;height:26px;border-radius:13px;background:#f1e8fd;color:#8b45e6;font-size:13px;font-weight:700;line-height:26px;text-align:center">${i + 1}</div></td><td style="font-size:14px;line-height:1.55;color:#35314a"><b style="color:#141220">${nb(esc(t[0]))}</b>${nb(esc(t[1]))}</td></tr></table>`).join('');
  const greet = D.parentName ? `<div style="font-size:14px;color:#35314a;margin-bottom:10px">${esc(D.parentName)}, здравствуйте!</div>` : '';
  const foot = o.token ? `<a href="{{BASE}}/unsub?t=${o.token}" style="color:#8b45e6;text-decoration:none">Отписаться</a> · <a href="${CARE}" style="color:#8b45e6;text-decoration:none">Служба заботы</a>` : `<a href="${CARE}" style="color:#8b45e6;text-decoration:none">Служба заботы</a>`;
  const mark = `<img src="https://romanoduvanov.github.io/otzyvy/gc/brand/email-logo.png" width="164" height="23" alt="OduvanovSchool" style="display:block;border:0">`;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subjectOf(D))}</title></head>
<body style="margin:0;padding:0;background:#e9e6f0;font-family:'Inter Tight',Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e9e6f0"><tr><td align="center" style="padding:24px 12px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#f3f1f7;border-radius:28px"><tr><td style="padding:26px 24px 22px">
 <table width="100%" cellpadding="0" cellspacing="0"><tr><td>${mark}</td><td align="right"><span style="font-size:12.5px;color:#6b6780;background:#fff;border-radius:99px;padding:6px 12px;white-space:nowrap">${per}</span></td></tr></table>
 <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#fff;border-radius:22px"><tr><td style="padding:22px">
  ${greet}<div style="font-size:13px;color:#6b6780">Отчёт об обучении · курс «AI-креатор»</div>
  <div style="margin-top:4px;font-size:30px;font-weight:600;letter-spacing:-.8px;color:#141220">${esc(D.name)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:${vc[0]};border-radius:16px"><tr><td width="44" valign="top" style="padding:14px 0 14px 16px"><div style="width:30px;height:30px;border-radius:10px;background:${vc[2]};color:#fff;font-weight:700;line-height:30px;text-align:center">${vc[3]}</div></td>
  <td style="padding:14px 16px 14px 10px;font-size:14px;line-height:1.5;color:${vc[1]}"><b style="display:block;font-size:15px;margin-bottom:2px">${esc(v.t)}</b>${nb(esc(v.s))}</td></tr></table>
 </td></tr></table>
 <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px"><tr>
  ${met('Время за уроками', hrs(D.tCur.video), delta(D.tCur.video, D.tPrev.video ? D.tPrev.video : (D.tPrev.site ? 0 : null)), prevLbl + ': ' + (D.tPrev.video || D.tPrev.site ? hrs(D.tPrev.video) : 'нет данных'))}
  ${met('Уроков пройдено', D.cur ? C.lessons : (D.r ? D.r.lessons : 0), P ? delta(C.lessons, P.lessons) : null, P ? prevLbl + ': ' + P.lessons : D.cur ? 'за период' : 'всего на курсе')}
 </tr><tr>
  ${met('Домашек сдано', D.cur ? C.hw : (D.r ? D.r.hw : 0), P ? (C.hw === P.hw ? { t: 'eq', s: '= 0' } : { t: C.hw > P.hw ? 'up' : 'dn', s: (C.hw > P.hw ? '▲ +' : '▼ −') + Math.abs(C.hw - P.hw) }) : null, P ? prevLbl + ': ' + P.hw : D.cur ? 'за период' : 'всего на курсе')}
  ${met('Место в потоке', D.place || '—', placeD, 'из ' + D.n + ' учеников')}
 </tr></table>
 <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background:#fff;border-radius:22px"><tr><td style="padding:22px">
  <div style="font-size:13px;color:#6b6780">Активность по дням · всего на платформе ${hrs(D.tCur.site)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;height:96px"><tr>${bars}</tr></table>
  <div style="margin-top:16px;font-size:13px;color:#6b6780">Прогресс курса · ${D.r ? D.r.lessons : 0} из ${D.total || '—'} открытых ${pl(D.total || 0, ['урока', 'уроков', 'уроков'])}</div>
  <div style="margin-top:8px;height:10px;border-radius:5px;background:#ece8f4"><div style="width:${prog}%;height:10px;border-radius:5px;background:#8b45e6"></div></div>
 </td></tr></table>
 <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background:#fff;border-radius:22px"><tr><td style="padding:22px">${tipsHtml}</td></tr></table>
 <div style="margin-top:16px;font-size:12px;line-height:1.6;color:#8a86a0;text-align:center">${nb('Отчёт ' + (fem(D.name) ? 'настроила ' : 'настроил ') + esc(D.name) + ' в личном кабинете OduvanovSchool.')}<br>${foot}</div>
</td></tr></table></td></tr></table></body></html>`;
}

/* ---------- письма ---------- */
async function sendMail(env, to, subject, body) {
  if (!env.RESEND_KEY) { await logIt(env, 'mail-skip', 0, to + ' · ' + subject); return { ok: false, reason: 'no-mail-provider' } }
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + env.RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM || 'OduvanovSchool <onboarding@resend.dev>', to: [to], subject, html: body }) });
  const t = await r.text(); await logIt(env, r.ok ? 'mail-ok' : 'mail-err', 0, to + ' · ' + t.slice(0, 300)); return { ok: r.ok, reason: t.slice(0, 200) };
}
const logIt = (env, kind, uid, info) => env.DB.prepare('INSERT INTO log (at, kind, uid, info) VALUES (?,?,?,?)').bind(new Date().toISOString(), kind, uid | 0, String(info).slice(0, 500)).run();

/* ---------- HTTP ---------- */
export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url), path = u.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    try {
      if (path === '/setup' && u.searchParams.get('k') === env.ADMIN_KEY) { await ensure(env); return json(req, { ok: true }) }

      /* учёт времени: navigator.sendBeacon(text/plain) → {u, d, s, v} */
      if (path === '/t' && req.method === 'POST') {
        const o = JSON.parse(await req.text() || '{}'); const uid = +o.u; if (!uid || uid > 1e10) return json(req, { ok: false }, 400);
        const day = /^\d{4}-\d{2}-\d{2}$/.test(o.d) && Math.abs(new Date(o.d) - new Date(dayStr())) <= 2 * 864e5 ? o.d : dayStr();
        const s = Math.max(0, Math.min(900, o.s | 0)), v = Math.max(0, Math.min(900, o.v | 0)); if (!s && !v) return json(req, { ok: true });
        await env.DB.prepare('INSERT INTO time (uid, day, site, video) VALUES (?,?,?,?) ON CONFLICT(uid, day) DO UPDATE SET site=MIN(site+excluded.site, 72000), video=MIN(video+excluded.video, 72000)').bind(uid, day, s, v).run();
        ctx.waitUntil((async () => { const ex = await env.DB.prepare('SELECT 1 FROM uidmap WHERE uid=?').bind(uid).first(); if (!ex) await env.DB.prepare('INSERT OR IGNORE INTO uidmap (uid, h) VALUES (?,?)').bind(uid, await hashUid(uid)).run() })());
        return json(req, { ok: true });
      }

      /* часы для рейтинга и профиля: {h: [сайт, видео]} в секундах */
      if (path === '/hours') {
        const rows = await env.DB.prepare('SELECT m.h h, SUM(t.site) s, SUM(t.video) v FROM time t JOIN uidmap m ON m.uid=t.uid GROUP BY m.h').all();
        const out = {}; for (const r of rows.results || []) out[r.h] = [r.s | 0, r.v | 0];
        return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'Access-Control-Allow-Origin': '*' } });
      }

      /* настройки отчёта родителю */
      if (path === '/parent' && req.method === 'GET') {
        const uid = +u.searchParams.get('u'); const p = await env.DB.prepare('SELECT email, name, freq, hour, channel, active, last_sent, tg_chat FROM parent WHERE uid=?').bind(uid).first();
        return json(req, { ok: true, p: p || null, until: until(env), live: dayStr() <= until(env) });
      }
      if (path === '/parent' && req.method === 'POST') {
        if (!ORIGINS.includes(req.headers.get('Origin'))) return json(req, { ok: false }, 403);
        const o = await req.json(); const uid = +o.u; if (!uid) return json(req, { ok: false, err: 'uid' }, 400);
        if (o.off) { await env.DB.prepare('UPDATE parent SET active=0, updated=? WHERE uid=?').bind(new Date().toISOString(), uid).run(); await logIt(env, 'parent-off', uid, ''); return json(req, { ok: true }) }
        const email = String(o.email || '').trim().toLowerCase(); if (o.channel !== 'tg' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(req, { ok: false, err: 'email' }, 400);
        const freq = [1, 2, 3, 7].includes(+o.freq) ? +o.freq : 7, hour = Math.max(6, Math.min(23, o.hour | 0 || 19)), now = new Date().toISOString();
        const old = await env.DB.prepare('SELECT token FROM parent WHERE uid=?').bind(uid).first(); const token = old && old.token || rnd();
        await env.DB.prepare('INSERT INTO parent (uid, h, student, email, name, freq, hour, channel, active, token, created, updated) VALUES (?,?,?,?,?,?,?,?,1,?,?,?) ON CONFLICT(uid) DO UPDATE SET student=excluded.student, email=excluded.email, name=excluded.name, freq=excluded.freq, hour=excluded.hour, channel=excluded.channel, active=1, updated=excluded.updated')
          .bind(uid, await hashUid(uid), String(o.student || '').slice(0, 80), email, String(o.name || '').slice(0, 40), freq, hour, o.channel === 'tg' ? 'tg' : 'email', token, now, now).run();
        await logIt(env, 'parent-on', uid, email + ' f' + freq + ' h' + hour);
        let sent = null; if (o.sendNow && dayStr() <= until(env) && o.channel !== 'tg') { const R = await buildReport(env, uid); sent = await sendMail(env, email, R.subject, R.html.replace(/\{\{BASE\}\}/g, u.origin)); if (sent.ok) await env.DB.prepare('UPDATE parent SET last_sent=? WHERE uid=?').bind(dayStr(), uid).run() }
        return json(req, { ok: true, sent });
      }
      /* превью письма: /preview?u=<id>&f=1|2|3|7 */
      if (path === '/preview') { const uid = +u.searchParams.get('u'); const R = await buildReport(env, uid, { freq: +u.searchParams.get('f') || 0, preview: true }); return html(R.html.replace(/\{\{BASE\}\}/g, u.origin)) }
      if (path === '/unsub') {
        const t = u.searchParams.get('t') || ''; const p = t && await env.DB.prepare('SELECT uid, student FROM parent WHERE token=?').bind(t).first();
        if (p) { await env.DB.prepare('UPDATE parent SET active=0, updated=? WHERE uid=?').bind(new Date().toISOString(), p.uid).run(); await logIt(env, 'unsub', p.uid, '') }
        return html(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f1f7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#141220;text-align:center;padding:24px"><div><div style="font-size:22px;font-weight:600">${p ? 'Вы отписались от отчётов' : 'Ссылка устарела'}</div><p style="color:#6b6780;max-width:380px;line-height:1.5">${p ? 'Отчёты больше не будут приходить. Если это ошибка — ' + esc(p.student || 'ученик') + ' может снова подключить их в своём профиле.' : 'Если нужна помощь — напишите в службу заботы.'}</p><a href="${CARE}" style="color:#8b45e6">Служба заботы</a></div></body>`);
      }
      if (path === '/admin/log' && u.searchParams.get('k') === env.ADMIN_KEY) { const r = await env.DB.prepare('SELECT * FROM log ORDER BY at DESC LIMIT 200').all(); return json(req, r.results) }
      if (path === '/admin/run' && u.searchParams.get('k') === env.ADMIN_KEY) { const res = await runHourly(env, true); return json(req, res) }
      if (path === '/') return json(req, { ok: true, service: 'oduvanovschool-api', day: dayStr() });
      return json(req, { ok: false, err: 'not found' }, 404);
    } catch (e) { return json(req, { ok: false, err: String(e && e.message || e) }, 500) }
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(runHourly(env, false)) }
};

/* каждый час: снимок рейтинга (раз в сутки — сохраняется последний за день) и рассылка отчётов, у которых подошёл срок */
async function runHourly(env, force) {
  await ensure(env); const D = await loadData(env); await snapshot(env, D);
  const hour = msk().getUTCHours(), today = dayStr(); const out = { hour, sent: [], skipped: 0, until: until(env) };
  if (today > until(env)) { out.ended = true; return out }
  const ps = await env.DB.prepare('SELECT * FROM parent WHERE active=1 AND channel=?').bind('email').all();
  for (const p of ps.results || []) {
    const due = !p.last_sent || (new Date(today) - new Date(p.last_sent)) / 864e5 >= p.freq;
    if (!due || (!force && p.hour !== hour)) { out.skipped++; continue }
    const R = await buildReport(env, p.uid, { D, p }); const base = env.BASE_URL || '';
    const res = await sendMail(env, p.email, R.subject, R.html.replace(/\{\{BASE\}\}/g, base));
    if (res.ok) await env.DB.prepare('UPDATE parent SET last_sent=? WHERE uid=?').bind(today, p.uid).run();
    out.sent.push([p.uid, res.ok]);
  }
  return out;
}
