/* OduvanovSchool API (Cloudflare Worker + D1)
   — учёт времени: активное время в кабинете и время просмотра видео уроков;
   — ежедневные снимки рейтинга (data.json с GitHub Pages) для сравнения периодов;
   — отчёты родителям: настройки, сборка письма, рассылка по расписанию, отписка.
   — Telegram-бот экосистемы (@oduvanov_school_bot): отчёты родителям, уведомления команде об оплатах.
   Переменные окружения: DB (D1), GC_KEY (секрет, ключ API GetCourse «только чтение» — для денег «на вывод»), STAT_KEY (опц.), RESEND_KEY (опц.), MAIL_FROM (опц.), ADMIN_KEY, BASE_URL, TG_TOKEN (секрет), TG_BOT (опц.), CF_ACCOUNT + CF_API_TOKEN (секрет) — картинка отчёта через Browser Rendering. GC_KEY_OLD (секрет) — ключ API старого аккаунта школы oduvanovschool: один раз забирает оттуда суммы оплат и оплаченных заказов в статистику.
   v42 (авторизация и рейтинг): AUTH_SECRET (секрет, рекомендуется; без него ключи выводятся из ADMIN_KEY) — подпись ключей и токенов учеников и соль h рейтинга;
   GC_HOOK_KEY (опц.) — ключ для процесса GetCourse «Вызвать URL» → /auth/gc; RATING_KEY (опц.) — ключ загрузки рейтинга gamify.py → /rating/put;
   ADMIN_UIDS (опц., через запятую, по умолчанию 499631257) — кто видит в рейтинге ссылки на профили; AUTH_STRICT=1 — после перехода: /t без токена не принимается;
   DATA_URL=off — не брать рейтинг с GitHub Pages, только загруженный на сервер. Ключи и пути: GET /auth/setup?k=ADMIN_KEY. */

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

function cors(req) { const o = req.headers.get('Origin'); return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Vary': 'Origin' } }
const json = (req, obj, st = 200, hd = {}) => new Response(JSON.stringify(obj), { status: st, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req), ...hd } });
const html = (body, st = 200) => new Response(body, { status: st, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS time (uid INTEGER NOT NULL, day TEXT NOT NULL, site INTEGER NOT NULL DEFAULT 0, video INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (uid, day))',
  'CREATE TABLE IF NOT EXISTS uidmap (uid INTEGER PRIMARY KEY, h TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS uidmap_h ON uidmap (h)',
  'CREATE TABLE IF NOT EXISTS snap (h TEXT NOT NULL, day TEXT NOT NULL, pts INTEGER, lessons INTEGER, hw INTEGER, place INTEGER, PRIMARY KEY (h, day))',
  'CREATE TABLE IF NOT EXISTS parent (uid INTEGER PRIMARY KEY, h TEXT, student TEXT, email TEXT, name TEXT, freq INTEGER, hour INTEGER, channel TEXT, active INTEGER DEFAULT 1, token TEXT, created TEXT, updated TEXT, last_sent TEXT, tg_chat TEXT)',
  'CREATE TABLE IF NOT EXISTS log (at TEXT, kind TEXT, uid INTEGER, info TEXT)',
  'CREATE TABLE IF NOT EXISTS tg_admin (chat TEXT PRIMARY KEY, name TEXT, added TEXT)',
  'CREATE TABLE IF NOT EXISTS student (uid INTEGER PRIMARY KEY, name TEXT, tg_chat TEXT, tg_token TEXT, tg_at TEXT, curator TEXT, cur_at TEXT)',
  'CREATE TABLE IF NOT EXISTS gc_name (uid INTEGER PRIMARY KEY, name TEXT, at TEXT)',
  'CREATE TABLE IF NOT EXISTS mail_off (uid INTEGER PRIMARY KEY, kind TEXT, at TEXT)',
  'CREATE TABLE IF NOT EXISTS stu_tg (uid INTEGER PRIMARY KEY, username TEXT, at TEXT)', /* 30.10: Telegram ученика из формы первого входа — видит куратор */ /* 30.10: отписка от писем о модулях */
  'CREATE TABLE IF NOT EXISTS pay (id INTEGER PRIMARY KEY, deal INTEGER, email TEXT, name TEXT, created TEXT, day TEXT, type TEXT, status TEXT, sum REAL, fee REAL, net REAL, title TEXT, synced TEXT)',
  'CREATE INDEX IF NOT EXISTS pay_day ON pay (day)',
  'CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)',
  'CREATE TABLE IF NOT EXISTS odeal (id INTEGER PRIMARY KEY, day TEXT, eh TEXT, cost REAL, title TEXT)',
  /* кураторы в личке Telegram (Telegram Business): только время сообщений, без текстов */
  'CREATE TABLE IF NOT EXISTS tg_user (chat TEXT PRIMARY KEY, username TEXT, name TEXT, at TEXT)',
  'CREATE TABLE IF NOT EXISTS cur_tg (cid TEXT PRIMARY KEY, tg_id TEXT, username TEXT, name TEXT, conn TEXT, enabled INTEGER DEFAULT 0, at TEXT)',
  'CREATE TABLE IF NOT EXISTS cwait (cid TEXT NOT NULL, chat TEXT NOT NULL, uid INTEGER, since INTEGER, reminded INTEGER DEFAULT 0, PRIMARY KEY (cid, chat))',
  'CREATE TABLE IF NOT EXISTS cresp (id INTEGER PRIMARY KEY AUTOINCREMENT, cid TEXT, chat TEXT, uid INTEGER, asked INTEGER, answered INTEGER, sec INTEGER, wsec INTEGER, day TEXT)',
  'CREATE TABLE IF NOT EXISTS cack (id INTEGER PRIMARY KEY AUTOINCREMENT, cid TEXT, chat TEXT, uid INTEGER, kind TEXT, since INTEGER, at INTEGER)',
  'CREATE INDEX IF NOT EXISTS cresp_cid ON cresp (cid, answered)',
  /* v42: кому GetCourse выдал ключ (issued) и кто уже вошёл с ним (seen) */
  'CREATE TABLE IF NOT EXISTS authuid (uid INTEGER PRIMARY KEY, issued TEXT, seen TEXT)',
  /* v42: скрытые незавершённые заказы «Мои покупки» (STU-12) — на сервере, а не в localStorage */
  'CREATE TABLE IF NOT EXISTS fmp_hidden (uid INTEGER NOT NULL, num TEXT NOT NULL, at TEXT, PRIMARY KEY (uid, num))',
  /* 27.10: использование мини-приложения учениками (счётчики, без содержимого): app, tab:<вкладка>, page:<страница>, gc, err:<ошибка> */
  /* /ma/learn: открытые учеником уроки (маяк со страницы урока GetCourse / приложения) — только для его «пройдено», наружу не отдаётся */
  'CREATE TABLE IF NOT EXISTS lv (uid INTEGER NOT NULL, lesson INTEGER NOT NULL, at TEXT, PRIMARY KEY (uid, lesson))',
  'CREATE TABLE IF NOT EXISTS ev (day TEXT NOT NULL, uid INTEGER NOT NULL, k TEXT NOT NULL, n INTEGER DEFAULT 1, PRIMARY KEY (day, uid, k))'
];
async function ensureAll(env) { await env.DB.batch(SCHEMA.map(s => env.DB.prepare(s))) }
/* CODE-11: DDL не на каждый запрос. Версия схемы считается из самого SCHEMA: добавили таблицу — на первом запросе после деплоя DDL выполнится сам.
   Дальше — флаг в памяти изолята; на холодном старте одно чтение kv. */
const SCHEMA_V = (() => { let h = 5381; const s = SCHEMA.join('|'); for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return SCHEMA.length + ':' + h.toString(36) })();
let SCHEMA_OK = false;
async function ensure(env) { if (SCHEMA_OK) return;
  try { const r = await env.DB.prepare("SELECT v FROM kv WHERE k='schema_v'").first(); if (r && r.v === SCHEMA_V) { SCHEMA_OK = true; return } } catch (e) {}
  await ensureAll(env); await env.DB.prepare("INSERT OR REPLACE INTO kv (k, v) VALUES ('schema_v', ?)").bind(SCHEMA_V).run(); SCHEMA_OK = true }
async function kvGet(env, k) { const r = await env.DB.prepare('SELECT v FROM kv WHERE k=?').bind(k).first(); if (!r) return null; try { return JSON.parse(r.v) } catch (e) { return r.v } }
const kvPut = (env, k, v) => env.DB.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)').bind(k, typeof v === 'string' ? v : JSON.stringify(v)).run();
const kvDel = (env, k) => env.DB.prepare('DELETE FROM kv WHERE k=?').bind(k).run();

/* ---------- авторизация учеников (v42: CODE-01/02/03/09, PROF-34) ----------
   Ключ ученика fs1.<32 hex> = HMAC(AUTH_SECRET, 'k1|' + uid). Сервер отдаёт его только GetCourse: процесс по пользователям,
   операция «Вызвать URL» → /auth/gc?k=<GC_HOOK_KEY>&uid={object.id}, ответ сохраняется в доп. поле пользователя fs_key.
   Значение поля видит только сам ученик (служебная страница /fs-key с HTML-блоком «Заменять переменные» или профиль) и команда школы.
   layout.js меняет ключ на токены: t — запись (/me, /cur, /parent, /t), 3 суток; v — только чтение (/rating, /preview, /hours), 24 часа.
   Токен есть, но неверный или просрочен → 401 {err:'auth'} (клиент берёт новый). Токена нет → только безопасные данные. */
const enc = s => new TextEncoder().encode(s);
const hexOf = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
let HK = null;
async function hmacHex(env, msg) { const sec = env.AUTH_SECRET || ('auth:' + env.ADMIN_KEY);
  if (!HK || HK.s !== sec) HK = { s: sec, k: await crypto.subtle.importKey('raw', enc(sec), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']) };
  return hexOf(await crypto.subtle.sign('HMAC', HK.k, enc(msg))) }
const same = (a, b) => { a = String(a == null ? '' : a); b = String(b == null ? '' : b); if (!a || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0 };
const okUid = v => /^\d{1,11}$/.test(String(v == null ? '' : v)) && +v > 0 && +v < 1e11;
const userKey = async (env, uid) => 'fs1.' + (await hmacHex(env, 'k1|' + uid)).slice(0, 32);
const pubH = async (env, uid) => (await hmacHex(env, 'rh|' + uid)).slice(0, 16); /* h ученика в рейтинге для клиента: соль — секрет сервера (CODE-04) */
const hookKey = async env => env.GC_HOOK_KEY || (await sha('gc-auth:' + env.ADMIN_KEY)).slice(0, 24);
const ratingKey = async env => env.RATING_KEY || (await sha('rating:' + env.ADMIN_KEY)).slice(0, 32);
const TTL = { a: 3 * 86400, v: 86400 };
async function mkToken(env, scope, uid) { const exp = (Math.floor(Date.now() / 1000) + TTL[scope]).toString(36); return uid + '.' + exp + '.' + scope + '.' + (await hmacHex(env, 't|' + scope + '|' + uid + '|' + exp)).slice(0, 32) }
/* uid из токена или 0; scopes — допустимые области: 'a' — запись, 'v' — чтение */
/* «Смотреть как ученик»: токен просмотра <uid>.<exp36>.w.<staffUid>.<hmac>, 1 час, только чтение (принимается там, где допустим токен чтения 'v') */
async function mkView(env, uid, staff) { const exp = (Math.floor(Date.now() / 1000) + 3600).toString(36); return uid + '.' + exp + '.w.' + staff + '.' + (await hmacHex(env, 't|w|' + uid + '|' + exp + '|' + staff)).slice(0, 32) }
async function viewTok(env, tok) { const m = String(tok || '').match(/^(\d{1,11})\.([0-9a-z]{1,8})\.w\.(\d{1,11})\.([0-9a-f]{32})$/); if (!m || parseInt(m[2], 36) * 1000 < Date.now()) return null;
  return same(m[4], (await hmacHex(env, 't|w|' + m[1] + '|' + m[2] + '|' + m[3])).slice(0, 32)) ? { uid: +m[1], staff: +m[3] } : null }
async function authUid(env, tok, scopes = 'a') { if (/\.w\./.test(String(tok || ''))) { if (!String(scopes).includes('v')) return 0; const w = await viewTok(env, tok); return w ? w.uid : 0 }
  const m = String(tok || '').match(/^(\d{1,11})\.([0-9a-z]{1,8})\.([av])\.([0-9a-f]{32})$/); if (!m || !scopes.includes(m[3])) return 0;
  if (parseInt(m[2], 36) * 1000 < Date.now()) return 0;
  return same(m[4], (await hmacHex(env, 't|' + m[3] + '|' + m[1] + '|' + m[2])).slice(0, 32)) ? +m[1] : 0 }
/* запрос ученика: {uid, tok}. tok=false — токена не было, tok=true — был и верный; токен был, но неверный → uid=0, bad=true */
/* переходный режим (пока не включён AUTH_STRICT=1): запрос без токена от ученика, который ещё ни разу не входил с ключом, работает как раньше — по u.
   Так сервер можно выкатить до того, как GetCourse раздаст ключи, и ничего у учеников не сломается */
/* загрузка рейтинга из gamify.py без отдельного ключа: тот же GitHub-токен, которым Роман публикует сайт (право push в RomanOduvanov/otzyvy) */
async function ghOk(env, req) { const t = String(req.headers.get('X-GH-Token') || '').trim(); if (!/^[A-Za-z0-9_]{20,255}$/.test(t)) return false;
  const hk = 'gh:' + (await sha(t)).slice(0, 24); if ((await kvGet(env, hk)) === dayStr()) return true;
  try { const r = await fetch('https://api.github.com/repos/RomanOduvanov/otzyvy', { headers: { Authorization: 'Bearer ' + t, 'User-Agent': 'oduvanov-api', Accept: 'application/vnd.github+json' } });
    if (!r.ok) return false; const j = await r.json(); const ok = !!(j && j.permissions && j.permissions.push); if (ok) await kvPut(env, hk, dayStr()); return ok } catch (e) { return false } }
async function softUid(env, w, uid) { if (w.tok || env.AUTH_STRICT === '1' || !okUid(uid)) return 0; try { const sn = await env.DB.prepare('SELECT seen FROM authuid WHERE uid=?').bind(uid).first(); if (sn && sn.seen) return 0 } catch (e) {} return +uid }
async function who(env, tok, scopes = 'a') { if (!tok) return { uid: 0, tok: false, bad: false }; const uid = await authUid(env, tok, scopes); return { uid, tok: true, bad: !uid } }
const deny = req => json(req, { ok: false, err: 'auth' }, 401);
/* пример отчёта без входа (CODE-02): обезличенные цифры вместо данных ученика */
function demoReport(freq) { const N = [1, 2, 3, 7].includes(freq) ? freq : 7, end = addDays(dayStr(), -1), start = addDays(end, -(N - 1)), days = [], byDay = {}, k = N / 7;
  for (let i = 6; i >= 0; i--) days.push(addDays(end, -i));
  days.forEach((d, i) => { byDay[d] = { site: [1800, 0, 2400, 3600, 1200, 0, 2700][i], video: [1500, 0, 2100, 3000, 900, 0, 2400][i] } });
  const D2 = { name: 'Анна (пример)', N, start, end, r: { pts: 640, lessons: 18, hw: 5, place: 12 }, cur: { lessons: Math.max(1, Math.round(9 * k)), hw: Math.round(3 * k), pts: Math.round(180 * k) }, prev: { lessons: Math.max(1, Math.round(6 * k)), hw: Math.round(2 * k), pts: Math.round(120 * k) },
    tCur: { site: Math.round(14400 * k), video: Math.round(11800 * k) }, tPrev: { site: Math.round(10800 * k), video: Math.round(8600 * k) }, place: 12, placePrev: 15, n: 99, total: 40, days, byDay, sched: [], parentName: '' };
  return { html: renderReport(D2, { preview: true }) } }

/* ---------- данные рейтинга и снимки ---------- */
let RC = null; /* кэш рейтинга в памяти изолята, 60 с */
async function loadData(env) { if (RC && Date.now() - RC.at < 60e3) return RC.D;
  let row = null; try { row = await env.DB.prepare("SELECT v FROM kv WHERE k='rating'").first() } catch (e) {}
  if (row && row.v) { const D = JSON.parse(row.v); RC = { at: Date.now(), D }; return D }
  if (env && env.DATA_URL === 'off') throw new Error('нет рейтинга: gamify.py ещё не загрузил его на сервер (/rating/put)');
  const r = await fetch(((env && env.DATA_URL) || DATA_URL) + '?t=' + Date.now()); if (!r.ok) throw new Error('data.json ' + r.status); const D = await r.json(); RC = { at: Date.now(), D }; return D }
/* рейтинг для вошедшего ученика (CODE-04): без uid, h с серверной солью, срок доступа (acc) — только в своей строке; часы на платформе — внутри */
async function ratingFor(env, me, forU) {
  const D = await loadData(env), priv = !!(D.rows.length && D.rows[0].uid != null), oldMe = priv ? null : await hashUid(me);
  const T = {}; if (priv) for (const r of ((await env.DB.prepare('SELECT uid, SUM(site) s, SUM(video) v FROM time GROUP BY uid').all()).results || [])) T[String(r.uid)] = [r.s | 0, r.v | 0];
  const adm = String(env.ADMIN_UIDS || '499631257').split(/[\s,]+/).includes(String(me)), rows = [], hours = {}, ids = {}, cc = !adm && CURATORS.find(c => c.uid === +me), mine = {};
  if (cc && priv) for (const s of ((await env.DB.prepare('SELECT uid FROM student WHERE curator=?').bind(cc.id).all()).results || [])) mine[String(s.uid)] = 1;
  for (const x of D.rows) { const o = Object.assign({}, x), xu = String(x.uid == null ? '' : x.uid); delete o.uid; delete o.k;
    if (priv) o.h = await pubH(env, xu);
    if (priv ? xu !== String(me) : x.h !== oldMe) delete o.acc; delete o.done; delete o.hwa; delete o.oth; /* учёба (/ma/learn) — только в своём ответе /ma/learn, в рейтинг не попадает даже своя */
    if (T[xu]) hours[o.h] = T[xu]; if ((adm || mine[xu]) && xu) ids[o.h] = +xu; rows.push(o) }
  const hOf = async v => priv ? pubH(env, String(v)) : hashUid(v);
  const out = Object.assign({}, D, { ok: true, rows, hours, me: await hOf(me), fh: okUid(forU) ? await hOf(forU) : null }); delete out.ah; delete out.hw_multi; if (adm || cc) { out.ids = ids; out.staff = adm ? 'admin' : 'curator' } return out }
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
  return { subject: subjectOf(D2), html: renderReport(D2, { token: p.token, preview: !!opts.preview }), D: D2, token: p.token };
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
    else if (D.placePrev && D.place && D.placePrev - D.place >= 3) why = nm + (fem(nm) ? ' поднялась' : ' поднялся') + ' в рейтинге на ' + (D.placePrev - D.place) + ' ' + pl(D.placePrev - D.place, ['место', 'места', 'мест']) + '. ' + why;
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
  /* 30.10: тёмный стиль школы (макет «Письма школы» v3) — таблицы и инлайн-стили, логика прежняя */
  const v = verdictOf(D), T = tipsOf(D, v), F = "'Inter Tight',Inter,Arial,Helvetica,sans-serif";
  const per = D.N === 1 ? human(D.end) + ' · день' : (D.start.slice(5, 7) === D.end.slice(5, 7) ? human(D.start).split(' ')[0] : human(D.start)) + '–' + human(D.end) + ' · ' + (D.N === 7 ? 'неделя' : D.N + ' ' + pl(D.N, ['день', 'дня', 'дней']));
  const prevLbl = 'было';
  const vc = { good: ['#12301f', '#22a861', '↑', '#c9f2d7'], ok: ['#1d2140', '#5b6cf0', '→', '#d3d8ff'], down: ['#3a2410', '#e8780c', '↓', '#ffd9b3'], none: ['#26262b', '#6b6b75', '·', '#bdbdc4'] }[v.k];
  const C = D.cur || { lessons: 0, hw: 0, pts: 0 }, P = D.prev;
  const UP = 'color:#4ade80;background-color:#12301f', DN = 'color:#ff6b6b;background-color:#3a1717', EQ = 'color:#bdbdc4;background-color:#26262b';
  const met = (title, val, d, sub, side, last) => { const pad = (side === 'l' ? 'padding:0 5px ' : 'padding:0 0 ') + (last ? '0' : '10px') + (side === 'l' ? ' 0' : ' 5px');
    const badge = d ? `<span style="display:inline-block;font-size:12px;line-height:16px;font-weight:700;padding:3px 8px;border-radius:99px;${d.t === 'up' ? UP : d.t === 'dn' ? DN : EQ}">${d.s}</span>` : '<span style="display:inline-block;font-size:12px;line-height:16px;padding:3px 0;color:#6b6b75">&nbsp;</span>';
    return `<td width="50%" valign="top" style="${pad}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#0b0b0d" style="background-color:#0b0b0d;border:1px solid #262626;border-radius:18px;padding:16px 16px 14px">`
      + `<div style="font-size:13px;line-height:18px;color:#8b8b95">${title}</div><div style="margin-top:6px;font-size:22px;line-height:28px;font-weight:600;color:#ffffff">${val}</div>`
      + `<div style="margin-top:6px">${badge}</div><div style="margin-top:6px;font-size:12px;line-height:16px;color:#6b6b75">${sub}</div></td></tr></table></td>` };
  const pd = D.placePrev && D.place ? (D.placePrev - D.place) : null;
  const placeD = pd == null ? null : pd === 0 ? { t: 'eq', s: '= 0' } : { t: pd > 0 ? 'up' : 'dn', s: (pd > 0 ? '▲ +' : '▼ −') + Math.abs(pd) };
  const hi = v.k === 'down' || v.k === 'none' ? '#e8780c' : '#a66bff';
  const mx = Math.max(1, ...D.days.map(d => ((D.byDay[d] || {}).video || 0) + ((D.byDay[d] || {}).site || 0) * .25));
  const bars = D.days.map((d, i) => { const x = D.byDay[d] || {}; const val = (x.video || 0) + (x.site || 0) * .25; const hgt = Math.round(70 * val / mx); const wd = WD[new Date(d + 'T00:00:00Z').getUTCDay()];
    return `<td align="center" valign="bottom" style="padding:0 4px"><div style="height:${Math.max(hgt, 4)}px;border-radius:7px;background-color:${val ? (i === 6 ? hi : '#3b2a55') : '#262626'}"></div><div style="margin-top:6px;font-size:11px;color:#8b8b95">${wd}</div></td>` }).join('');
  const prog = D.r && D.total ? Math.round(100 * D.r.lessons / D.total) : 0;
  const box = inner => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px"><tr><td bgcolor="#0b0b0d" style="background-color:#0b0b0d;border:1px solid #262626;border-radius:20px;padding:20px 22px;color:#ffffff">${inner}</td></tr></table>`;
  const tipsHtml = T.praise ? box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="46" valign="top"><div style="width:34px;height:34px;border-radius:11px;background-color:#a66bff;color:#fff;font-size:17px;line-height:34px;text-align:center">★</div></td><td style="font-size:14px;line-height:22px;color:#e6e6ea"><b style="color:#ffffff">Самое время похвалить.</b> ${nb(esc(T.praise))}</td></tr></table>`)
    : box('<div style="font-size:16px;line-height:22px;font-weight:600;color:#ffffff">Три идеи, как поддержать</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + T.tips.map((t, i) => `<tr><td width="38" valign="top" style="padding-top:12px"><div style="width:26px;height:26px;line-height:26px;border-radius:13px;background-color:#2a1d3d;color:#c38bff;font-size:13px;font-weight:700;text-align:center">${i + 1}</div></td><td style="padding-top:12px;font-size:14px;line-height:22px;color:#e6e6ea"><b style="color:#ffffff">${nb(esc(t[0]))}</b>${nb(esc(t[1]))}</td></tr>`).join('') + '</table>');
  const greet = D.parentName ? `<div style="font-size:14px;line-height:20px;color:#bdbdc4;margin:2px 0 6px">${esc(D.parentName)}, здравствуйте!</div>` : '';
  const A = 'color:#a78bfa;text-decoration:underline';
  const foot = (o.token ? `<a href="{{BASE}}/unsub?t=${o.token}" style="${A}">Отписаться</a> · ` : '') + `<a href="${CARE}" style="${A}">Служба заботы</a>`;
  const lessonsV = D.cur ? C.lessons : (D.r ? D.r.lessons : 0), hwV = D.cur ? C.hw : (D.r ? D.r.hw : 0);
  const grid = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;table-layout:fixed"><tr>'
    + met('Время за&nbsp;уроками', nb(hrs(D.tCur.video)), delta(D.tCur.video, D.tPrev.video ? D.tPrev.video : (D.tPrev.site ? 0 : null)), D.tPrev.video || D.tPrev.site ? prevLbl + ' ' + nb(hrs(D.tPrev.video)) : 'нет данных', 'l')
    + met('Уроков пройдено', lessonsV, P ? delta(C.lessons, P.lessons) : null, P ? prevLbl + ' ' + P.lessons : D.cur ? 'за период' : 'всего на курсе', 'r') + '</tr><tr>'
    + met('Домашек сдано', hwV, P ? (C.hw === P.hw ? { t: 'eq', s: '= 0' } : { t: C.hw > P.hw ? 'up' : 'dn', s: (C.hw > P.hw ? '▲ +' : '▼ −') + Math.abs(C.hw - P.hw) }) : null, P ? prevLbl + ' ' + P.hw : D.cur ? 'за период' : 'всего на курсе', 'l', 1)
    + met('Место в&nbsp;потоке', D.place || '—', placeD, 'из ' + D.n + ' учеников', 'r', 1) + '</tr></table>';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(subjectOf(D))}</title></head>
<body style="margin:0;padding:0;background-color:#000106;-webkit-font-smoothing:antialiased"><div style="margin:0;padding:0;background-color:#000106"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000106" style="background-color:#000106;width:100%"><tr><td align="center" style="padding:32px 12px 40px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">
<tr><td style="padding:0 8px 24px"><img src="https://romanoduvanov.github.io/otzyvy/gc/email-logo-white.png" width="240" height="33" alt="OduvanovSchool" style="display:block;border:0;width:240px;height:33px"></td></tr>
<tr><td bgcolor="#141414" style="background-color:#141414;border:1px solid #262626;border-radius:28px;padding:32px 28px 28px;font-family:${F};color:#ffffff">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td valign="top"><div style="font-size:15px;line-height:20px;font-weight:600;color:#c38bff;margin:0 0 10px">Отчёт об&nbsp;обучении</div></td><td align="right" valign="top"><span style="font-size:12.5px;color:#bdbdc4;background-color:#26262b;border-radius:99px;padding:6px 12px;white-space:nowrap">${per}</span></td></tr></table>
${greet}<div style="font-size:30px;line-height:36px;font-weight:600;color:#ffffff;margin:0 0 14px">${esc(D.name)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${vc[0]}" style="background-color:${vc[0]};border-radius:16px;padding:14px 16px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="42" valign="top"><div style="width:30px;height:30px;border-radius:10px;background-color:${vc[1]};color:#fff;font-weight:700;line-height:30px;text-align:center">${vc[2]}</div></td>
<td style="font-size:14px;line-height:21px;color:${vc[3]}"><b style="display:block;font-size:15px;color:#ffffff;margin-bottom:2px">${esc(v.t)}</b>${nb(esc(v.s))}</td></tr></table></td></tr></table>
${grid}
${box(`<div style="font-size:13px;line-height:18px;color:#8b8b95">Активность по&nbsp;дням · всего на&nbsp;платформе ${nb(hrs(D.tCur.site))}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;height:90px"><tr>${bars}</tr></table><div style="margin-top:16px;font-size:13px;line-height:18px;color:#8b8b95">Прогресс курса · ${D.r ? D.r.lessons : 0} из&nbsp;${D.total || '—'} открытых ${pl(D.total || 0, ['урока', 'уроков', 'уроков'])}</div><div style="margin-top:8px;height:10px;border-radius:5px;background-color:#262626"><div style="width:${prog}%;height:10px;border-radius:5px;background-color:#a66bff"></div></div>`)}
${tipsHtml}
</td></tr>
<tr><td style="padding:22px 8px 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b6b75">${nb('Отчёт ' + (fem(D.name) ? 'настроила ' : 'настроил ') + esc(D.name) + ' в личном кабинете OduvanovSchool.')} ${foot}</td></tr>
</table></td></tr></table></div></body></html>`;
}

/* ---------- письма ---------- */
async function sendMail(env, to, subject, body) {
  if (!env.RESEND_KEY) { await logIt(env, 'mail-skip', 0, to + ' · ' + subject); return { ok: false, reason: 'no-mail-provider' } }
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': 'Bearer ' + env.RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM || 'OduvanovSchool <onboarding@resend.dev>', to: [to], subject, html: body }) });
  const t = await r.text(); await logIt(env, r.ok ? 'mail-ok' : 'mail-err', 0, to + ' · ' + t.slice(0, 300)); return { ok: r.ok, reason: t.slice(0, 200) };
}
/* ---------- 30.10: письмо «Открыт новый модуль» (макет «Письма школы» v3) ----------
   Раз в час (крон «5 * * * *», задача modmail): модуль, который открылся за последние 12 часов и по которому ещё не всё отправлено,
   уходит письмом ученикам потока (строки рейтинга), кроме сотрудников и отписавшихся (mail_off). Почты — из ежедневной выгрузки GetCourse (gc_name.email).
   Отправка пачками по 100 через Resend /emails/batch; кому ушло — в kv 'modmail:<id модуля>', чтобы при обрыве не прислать дважды.
   Письмо GetCourse «Открыт новый урок» (тип 128) выключено — вместо писем на каждый урок одно письмо на модуль. */
const MM_F = "'Inter Tight',Inter,Arial,Helvetica,sans-serif";
function mskFmt(ts) { const d = msk(new Date(ts)); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ', ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' МСК' }
function modInfo(D, m, now) { let L = 0, H = 0; for (const p of m.parts || []) for (const l of p.lessons || []) { const k = l.kind || (/^Анкета/i.test(l.t) ? 'anketa' : 'lesson'); if (k === 'hw') H++; else if (k === 'lesson') L++ }
  const nm = String(m.name || '').match(/^Модуль (\d+)\s*—\s*(.+)$/), x = learnX2(D, m, now || Date.now());
  return { title: nm ? 'Модуль ' + nm[1] + ' · ' + nm[2] : (m.name || 'Новый модуль'), subj: nm ? 'Открыт Модуль ' + nm[1] + ' «' + nm[2] + '» — ×2 к баллам 48 часов' : 'Открыт новый модуль — ×2 к баллам 48 часов', lessons: L, hw: H, x2: x && x.lessons_until ? mskFmt(Date.parse(x.lessons_until)) : null } }
function modMailHtml(I, first, unsub) { const esc2 = esc, nb2 = t => nb(t);
  const row = (k, v) => `<tr><td style="padding:6px 12px 6px 0;font-size:15px;line-height:22px;color:#8b8b95;white-space:nowrap">${k}</td><td align="right" style="padding:6px 0;font-size:15px;line-height:22px;color:#ffffff;font-weight:600">${v}</td></tr>`;
  const lead = (first ? esc2(first) + ', м' : 'М') + 'одуль уже открыт: ' + I.lessons + ' ' + pl(I.lessons, ['урок', 'урока', 'уроков']) + (I.hw ? ' и домашнее задание.' : '.') + (I.x2 ? ' <b style="color:#ffffff">Первые 48 часов баллы за уроки удваиваются</b> — успей до ' + I.x2 + '.' : '');
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc2(I.subj)}</title></head><body style="margin:0;padding:0;background-color:#000106">`
    + `<div style="margin:0;padding:0;background-color:#000106"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000106" style="background-color:#000106;width:100%"><tr><td align="center" style="padding:32px 12px 40px"><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">`
    + `<tr><td style="padding:0 8px 24px"><img src="https://romanoduvanov.github.io/otzyvy/gc/email-logo-white.png" width="240" height="33" alt="OduvanovSchool" style="display:block;border:0;width:240px;height:33px"></td></tr>`
    + `<tr><td bgcolor="#141414" style="background-color:#141414;border:1px solid #262626;border-radius:28px;padding:36px 32px 32px;font-family:${MM_F};color:#ffffff">`
    + `<div style="font-size:15px;line-height:20px;font-weight:600;color:#c38bff;margin:0 0 10px">Открыт новый модуль</div>`
    + `<div style="font-size:30px;line-height:36px;font-weight:600;color:#ffffff;margin:0 0 14px">${nb2(esc2(I.title)).replace(/-/g, '\u2011')}</div>`
    + `<div style="font-size:16px;line-height:24px;color:#bdbdc4;margin:0 0 24px">${lead}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#fccbff" style="border-radius:16px;background-color:#fccbff;background-image:linear-gradient(180deg,#fef8ff,#fccbff)"><a href="https://t.me/oduvanov_school_bot?startapp=learn" style="display:block;padding:18px 24px;font-family:${MM_F};font-size:17px;line-height:22px;font-weight:600;color:#602364;text-decoration:none;border-radius:16px">Начать модуль</a></td></tr></table>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px"><tr><td bgcolor="#0b0b0d" style="background-color:#0b0b0d;border:1px solid #262626;border-radius:20px;padding:20px 22px;color:#ffffff"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">`
    + row('Уроков', I.lessons) + (I.hw ? row('Домашнее задание', I.hw + ', до ' + HW_MAX + ' баллов') : '') + (I.x2 ? row('×2 к баллам', 'до ' + I.x2) : '') + `</table></td></tr></table>`
    + `<div style="font-size:14px;line-height:21px;color:#8b8b95;margin-top:18px">Удобнее в Telegram: кнопка откроет приложение школы. С компьютера — <a href="${SITE}/teach/control/stream" style="color:#d77fff;text-decoration:none;font-weight:600">кабинет на сайте</a>.</div></td></tr>`
    + `<tr><td style="padding:22px 8px 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b6b75">Онлайн-школа Романа Одуванова. Вопросы — в <a href="${CARE}" style="color:#a78bfa;text-decoration:underline">Службу заботы</a> или куратору в приложении. <a href="${unsub}" style="color:#a78bfa;text-decoration:underline">Не присылать письма о модулях</a></td></tr>`
    + `</table></td></tr></table></div></body></html>` }
async function modUnsubLink(env, uid) { return (env.BASE_URL || 'https://oduvanov-api.romanoduvanov52.workers.dev') + '/modunsub?u=' + uid + '&s=' + (await hmacHex(env, 'mo|' + uid)).slice(0, 24) }
async function modMailJob(env, B) { if (!env.RESEND_KEY) return { skip: 'no-mail' }; const D = await loadData(env), now = Date.now();
  const open = (D.modules || []).filter(m => !m.amazon && +m.id !== AMAZON_MOD && m.at && Date.parse(m.at) <= now && now - Date.parse(m.at) < 12 * 36e5);
  if (!open.length) return { none: true }; const out = {};
  const staff = await gcStaffSet(env), off = new Set(((await env.DB.prepare("SELECT uid FROM mail_off WHERE kind='mod'").all()).results || []).map(r => +r.uid));
  const E = {}; for (const r of ((await env.DB.prepare('SELECT uid, name, email FROM gc_name WHERE email IS NOT NULL').all()).results || [])) E[+r.uid] = r;
  for (const m of open) { const key = 'modmail:' + m.id, st = (await kvGet(env, key)) || { sent: [] }, done = new Set(st.sent.map(Number)); if (st.fin) { out[m.id] = 'готово'; continue }
    const I = modInfo(D, m, now), to = [];
    for (const r of D.rows || []) { const uid = +r.uid; if (!uid || done.has(uid) || staff.has(uid) || off.has(uid) || !E[uid]) continue; to.push(uid) }
    let n = 0; for (let i = 0; i < to.length; i += 100) { if (!B.ok(1)) break; B.use(1); const part = to.slice(i, i + 100);
      const msgs = await Promise.all(part.map(async uid => ({ from: env.MAIL_FROM || 'OduvanovSchool <onboarding@resend.dev>', to: [E[uid].email], subject: I.subj, html: modMailHtml(I, String(E[uid].name || '').split(' ')[0], await modUnsubLink(env, uid)) })));
      const r = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(msgs) });
      const t = await r.text(); await logIt(env, r.ok ? 'modmail-ok' : 'modmail-err', 0, m.id + ' · ' + part.length + ' · ' + t.slice(0, 200)); if (!r.ok) break;
      part.forEach(u => st.sent.push(u)); n += part.length; await kvPut(env, key, st) }
    if (st.sent.length && to.length === n) { st.fin = new Date().toISOString(); await kvPut(env, key, st) } out[m.id] = n }
  return out }

/* ---------- Telegram ---------- */
const BOT = env => (env && env.TG_BOT) || 'oduvanov_school_bot';
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
const tgSecret = async env => (await sha('tg-hook:' + env.ADMIN_KEY)).slice(0, 40);
const admKey = async env => (await sha('tg-adm:' + env.ADMIN_KEY)).slice(0, 20);
const payKey = async env => (await sha('pay:' + env.ADMIN_KEY)).slice(0, 24);
async function tg(env, method, body) {
  if (!env.TG_TOKEN) return { ok: false, description: 'no TG_TOKEN' };
  const r = await fetch('https://api.telegram.org/bot' + env.TG_TOKEN + '/' + method, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ ok: false })); if (!j.ok) await logIt(env, 'tg-err', 0, method + ' ' + (j.description || r.status)); return j;
}
const tgSend = (env, chat, text, buttons) => tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}) });
const th = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function tgReport(D, base, token) {
  const v = verdictOf(D), T = tipsOf(D, v), C = D.cur || { lessons: 0, hw: 0 }, P = D.prev;
  const per = D.N === 1 ? human(D.end) : (D.start.slice(5, 7) === D.end.slice(5, 7) ? human(D.start).split(' ')[0] : human(D.start)) + '–' + human(D.end);
  const em = { good: '🟢', ok: '🔵', down: '🟠', none: '⚪️' }[v.k];
  const dd = d => d ? ' <i>(' + d.s.replace('▲ ', '↑').replace('▼ ', '↓') + ')</i>' : '';
  const prevLbl = D.N === 1 ? 'позавчера' : D.N === 7 ? 'прошлая неделя' : 'прошлый период';
  const pd = D.placePrev && D.place ? D.placePrev - D.place : null;
  let t = (D.parentName ? th(D.parentName) + ', здравствуйте!\n\n' : '') + '<b>Отчёт об обучении · ' + th(D.name) + '</b>\n' + per + (D.N === 7 ? ' · неделя' : D.N === 1 ? ' · день' : ' · ' + D.N + ' ' + pl(D.N, ['день', 'дня', 'дней'])) + '\n\n'
    + em + ' <b>' + th(v.t) + '</b>\n' + th(v.s) + '\n\n'
    + '⏱ Время за уроками: <b>' + hrs(D.tCur.video) + '</b>' + dd(delta(D.tCur.video, D.tPrev.video ? D.tPrev.video : (D.tPrev.site ? 0 : null))) + '\n'
    + '📚 Уроков пройдено: <b>' + (D.cur ? C.lessons : (D.r ? D.r.lessons : 0)) + '</b>' + (P ? dd(delta(C.lessons, P.lessons)) : '') + '\n'
    + '✍️ Домашек сдано: <b>' + (D.cur ? C.hw : (D.r ? D.r.hw : 0)) + '</b>' + (P ? ' <i>(' + prevLbl + ': ' + P.hw + ')</i>' : '') + '\n'
    + '🏆 Место в потоке: <b>' + (D.place || '—') + '</b> из ' + D.n + (pd ? ' <i>(' + (pd > 0 ? '↑' : '↓') + Math.abs(pd) + ')</i>' : '') + '\n'
    + '🖥 Всего на платформе: ' + hrs(D.tCur.site) + '\n\n';
  if (T.praise) t += '⭐️ <b>Самое время похвалить.</b> ' + th(T.praise);
  else t += '<b>Три идеи, как поддержать</b>\n' + T.tips.map((x, i) => (i + 1) + '. <b>' + th(x[0]) + '</b>' + th(x[1])).join('\n');
  const btn = token ? [[{ text: 'Полный отчёт', url: base + '/r?t=' + token }], [{ text: 'Служба заботы', url: CARE }, { text: 'Отписаться', callback_data: 'off' }]] : null;
  return { text: t, buttons: btn };
}
/* карточка отчёта для Telegram: 540×675 CSS px → PNG 1080×1350 (4:5 — целиком видна в ленте на телефоне и компьютере) */
function renderCard(D) {
  const v = verdictOf(D), C = D.cur || { lessons: 0, hw: 0, pts: 0 }, P = D.prev;
  const per = D.N === 1 ? human(D.end) : (D.start.slice(5, 7) === D.end.slice(5, 7) ? human(D.start).split(' ')[0] : human(D.start)) + '–' + human(D.end);
  const vc = { good: ['#e9f8ef', '#145c36', '#1a9f5c', '↑'], ok: ['#eef0ff', '#2b3576', '#4b5bd6', '→'], down: ['#fff3e6', '#7a3d00', '#e8780c', '↓'], none: ['#f1eef7', '#3d3552', '#8a7fa8', '·'] }[v.k];
  const chip = d => d ? `<span class="d ${d.t}">${d.s.replace('▲ ', '↑ ').replace('▼ ', '↓ ')}</span>` : '';
  const prevLbl = D.N === 1 ? 'позавчера' : D.N === 7 ? 'прошлая неделя' : 'прошлый период';
  const pd = D.placePrev && D.place ? (D.placePrev - D.place) : null;
  const tile = (t, val, d, sub) => `<div class="t"><div class="tl">${t}</div><div class="tv"><b>${val}</b>${chip(d)}</div><div class="ts">${sub}</div></div>`;
  const mx = Math.max(1, ...D.days.map(d => ((D.byDay[d] || {}).video || 0) + ((D.byDay[d] || {}).site || 0) * .25));
  const bars = D.days.map((d, i) => { const x = D.byDay[d] || {}, val = (x.video || 0) + (x.site || 0) * .25; return `<div class="bc"><div class="b${i === 6 ? ' now' : val ? ' on' : ''}" style="height:${Math.max(4, Math.round(64 * val / mx))}px"></div><span>${WD[new Date(d + 'T00:00:00Z').getUTCDay()]}</span></div>` }).join('');
  const prog = D.r && D.total ? Math.round(100 * D.r.lessons / D.total) : 0;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0}html,body{width:540px;height:675px;overflow:hidden}
body{font-family:'Inter Tight',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;background:#f3f1f7;color:#141220;padding:22px}
.hd{display:flex;align-items:center;justify-content:space-between}.hd img{height:20px;display:block}
.pill{font-size:12.5px;color:#6b6780;background:#fff;border-radius:99px;padding:6px 12px}
.card{margin-top:14px;background:#fff;border-radius:22px;padding:18px 20px}
.k{font-size:12.5px;color:#6b6780}.nm{margin-top:3px;font-size:28px;font-weight:600;letter-spacing:-.03em;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vd{margin-top:12px;display:flex;gap:10px;align-items:flex-start;background:${vc[0]};border-radius:16px;padding:12px 14px;color:${vc[1]}}
.vi{flex:none;width:28px;height:28px;border-radius:9px;background:${vc[2]};color:#fff;font-weight:700;display:grid;place-items:center;font-size:15px}
.vt{font-size:15px;font-weight:600;line-height:1.25}.vs{margin-top:2px;font-size:12.5px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.g{margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.t{background:#fff;border-radius:18px;padding:13px 16px}.tl{font-size:12.5px;color:#6b6780}
.tv{margin-top:3px;display:flex;align-items:center;gap:8px}.tv b{font-size:26px;font-weight:600;letter-spacing:-.02em}
.d{font-size:11.5px;font-weight:700;padding:3px 8px;border-radius:99px;color:#6b6780;background:#efeef3}.d.up{color:#137a45;background:#e3f6ea}.d.dn{color:#c5302f;background:#fde9e8}
.ts{margin-top:2px;font-size:11.5px;color:#8a86a0}
.ac{margin-top:8px;background:#fff;border-radius:22px;padding:16px 20px}
.bars{margin-top:10px;height:84px;display:flex;align-items:flex-end;gap:8px}.bc{flex:1;display:flex;flex-direction:column;align-items:stretch;gap:5px}
.b{border-radius:7px;background:#ece8f4}.b.on{background:#d9c6f7}.b.now{background:#8b45e6}.bc span{font-size:11px;color:#8a86a0;text-align:center}
.pr{margin-top:12px;height:8px;border-radius:4px;background:#ece8f4}.pr i{display:block;height:8px;border-radius:4px;background:#8b45e6;width:${prog}%}
</style></head><body>
<div class="hd"><img src="https://romanoduvanov.github.io/otzyvy/gc/brand/email-logo.png" alt=""><span class="pill">${per} · ${D.N === 7 ? 'неделя' : D.N === 1 ? 'день' : D.N + ' ' + pl(D.N, ['день', 'дня', 'дней'])}</span></div>
<div class="card"><div class="k">Отчёт об обучении · курс «AI-креатор»</div><div class="nm">${esc(D.name)}</div>
<div class="vd"><div class="vi">${vc[3]}</div><div><div class="vt">${esc(v.t)}</div><div class="vs">${nb(esc(v.s))}</div></div></div></div>
<div class="g">${tile('Время за уроками', hrs(D.tCur.video), delta(D.tCur.video, D.tPrev.video ? D.tPrev.video : (D.tPrev.site ? 0 : null)), prevLbl + ': ' + (D.tPrev.video || D.tPrev.site ? hrs(D.tPrev.video) : 'нет данных'))}
${tile('Уроков пройдено', D.cur ? C.lessons : (D.r ? D.r.lessons : 0), P ? delta(C.lessons, P.lessons) : null, P ? prevLbl + ': ' + P.lessons : D.cur ? 'за период' : 'всего на курсе')}
${tile('Домашек сдано', D.cur ? C.hw : (D.r ? D.r.hw : 0), P ? (C.hw === P.hw ? { t: 'eq', s: '= 0' } : { t: C.hw > P.hw ? 'up' : 'dn', s: (C.hw > P.hw ? '▲ +' : '▼ −') + Math.abs(C.hw - P.hw) }) : null, P ? prevLbl + ': ' + P.hw : D.cur ? 'за период' : 'всего на курсе')}
${tile('Место в потоке', D.place || '—', pd == null ? null : pd === 0 ? { t: 'eq', s: '= 0' } : { t: pd > 0 ? 'up' : 'dn', s: (pd > 0 ? '▲ +' : '▼ −') + Math.abs(pd) }, 'из ' + D.n + ' учеников')}</div>
<div class="ac"><div class="k">Активность по дням · всего на платформе ${hrs(D.tCur.site)}</div><div class="bars">${bars}</div>
<div class="k" style="margin-top:12px">Прогресс курса · ${D.r ? D.r.lessons : 0} из ${D.total || '—'} открытых ${pl(D.total || 0, ['урока', 'уроков', 'уроков'])}</div><div class="pr"><i></i></div></div>
</body></html>`;
}
function tgCaption(D) {
  const v = verdictOf(D), T = tipsOf(D, v), per = D.N === 1 ? human(D.end) : (D.start.slice(5, 7) === D.end.slice(5, 7) ? human(D.start).split(' ')[0] : human(D.start)) + '–' + human(D.end);
  const em = { good: '🟢', ok: '🔵', down: '🟠', none: '⚪️' }[v.k];
  const head = (D.parentName ? th(D.parentName) + ', здравствуйте!\n\n' : '') + '<b>Отчёт об обучении · ' + th(D.name) + '</b>\n' + per + '\n\n' + em + ' <b>' + th(v.t) + '</b>\n';
  const tail = T.praise ? '⭐️ <b>Самое время похвалить.</b> ' + th(T.praise) : '<b>Три идеи, как поддержать</b>\n' + T.tips.map((x, i) => (i + 1) + '. <b>' + th(x[0]) + '</b>' + th(x[1])).join('\n');
  let c = head + th(v.s) + '\n\n' + tail; if (c.replace(/<[^>]+>/g, '').length > 1000) c = head + '\n' + tail; if (c.replace(/<[^>]+>/g, '').length > 1000) c = head + th(v.s); return c;
}
async function shot(env, url) {
  const acc = env.CF_ACCOUNT || '3544f71e7e7fd1a3544f2f335165a199'; if (!env.CF_API_TOKEN) return null;
  const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + acc + '/browser-rendering/screenshot', { method: 'POST', headers: { 'Authorization': 'Bearer ' + env.CF_API_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, viewport: { width: 540, height: 675, deviceScaleFactor: 2 }, gotoOptions: { waitUntil: 'networkidle0', timeout: 20000 }, screenshotOptions: { type: 'png' } }) });
  if (!r.ok || !(r.headers.get('Content-Type') || '').includes('image')) { await logIt(env, 'shot-err', 0, r.status + ' ' + (await r.text()).slice(0, 200)); return null }
  return await r.arrayBuffer();
}
async function tgSendReport(env, p, D0) {
  const R = await buildReport(env, p.uid, { D: D0, p }); const base = env.BASE_URL || '';
  const btn = [[{ text: 'Служба заботы', url: CARE }, { text: 'Отписаться', callback_data: 'off' }]];
  const png = await shot(env, base + '/card?t=' + p.token + '&v=' + Date.now());
  if (png && env.TG_TOKEN) {
    const fd = new FormData(); fd.append('chat_id', String(p.tg_chat)); fd.append('caption', tgCaption(R.D)); fd.append('parse_mode', 'HTML'); fd.append('reply_markup', JSON.stringify({ inline_keyboard: btn }));
    fd.append('photo', new Blob([png], { type: 'image/png' }), 'report.png');
    const r = await fetch('https://api.telegram.org/bot' + env.TG_TOKEN + '/sendPhoto', { method: 'POST', body: fd }); const j = await r.json().catch(() => ({ ok: false }));
    if (j.ok) return j; await logIt(env, 'tg-err', p.uid, 'sendPhoto ' + (j.description || r.status));
  }
  const m = tgReport(R.D, base, p.token); return tgSend(env, p.tg_chat, m.text, m.buttons);
}
/* кураторы потока AI-креатор 2.0 */
const CURATORS = [
  { id: 'anton', name: 'Антон', full: 'Антон Фрейм', uid: 504950432, about: 'Куратор потока AI-креатор 2.0' },
  { id: 'kirill', name: 'Кирилл', full: 'Кирилл Кошкин', uid: 510261529, about: 'Куратор потока AI-креатор 2.0' }
];
const curPub = c => c && { id: c.id, name: c.name, full: c.full, about: c.about, uid: c.uid };
/* ---------- кураторы в своей личке Telegram: бот школы подключён к их аккаунту через Telegram Business ---------- */
const CUR_HOURS_DEF = [10, 20]; /* рабочие часы по МСК, пока куратор не выставит свои в пульте */
const curHours = async (env, cid) => { const r = await env.DB.prepare('SELECT v FROM kv WHERE k=?').bind('hours:' + cid).first(); try { const h = r && JSON.parse(r.v); if (h && h.length === 2) return h } catch (e) {} return CUR_HOURS_DEF };
const curKey = async (env, cid) => (await sha('cur:' + cid + ':' + env.ADMIN_KEY)).slice(0, 16);
/* секунды между a и b (unix), попавшие в рабочие часы [h1, h2) по МСК */
function workSec(a, b, h) { if (!(b > a)) return 0; let s = 0, t = a; const end = Math.min(b, a + 14 * 86400);
  while (t < end) { const d = msk(new Date(t * 1000)), hr = d.getUTCHours(), next = Math.min(end, t - (d.getUTCMinutes() * 60 + d.getUTCSeconds()) + 3600); if (hr >= h[0] && hr < h[1]) s += next - t; t = next } return s }
async function saveTgUser(env, u) { if (!u || !u.id) return; await env.DB.prepare('INSERT OR REPLACE INTO tg_user (chat, username, name, at) VALUES (?,?,?,?)').bind(String(u.id), u.username || null, [u.first_name, u.last_name].filter(Boolean).join(' ') || null, new Date().toISOString()).run() }
const admins = async env => ((await env.DB.prepare('SELECT chat FROM tg_admin').all()).results || []).map(a => a.chat);
async function bizConnection(env, bc) {
  if (isCareConn(bc, env)) return careConnection(env, bc);
  const owner = String(bc.user.id), uname = bc.user.username || null, nm = [bc.user.first_name, bc.user.last_name].filter(Boolean).join(' ');
  let row = await env.DB.prepare('SELECT * FROM cur_tg WHERE tg_id=?').bind(owner).first();
  if (!row) { const s = await env.DB.prepare('SELECT uid FROM student WHERE tg_chat=?').bind(owner).first(); const c = s && CURATORS.find(x => x.uid === s.uid);
    if (c) { await env.DB.prepare('INSERT OR REPLACE INTO cur_tg (cid, tg_id, at) VALUES (?,?,?)').bind(c.id, owner, new Date().toISOString()).run(); row = { cid: c.id } } }
  if (!row) { await env.DB.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)').bind('bc:' + owner, bc.id).run(); await logIt(env, 'biz-unknown', 0, owner + ' @' + uname);
    for (const a of await admins(env)) await tgSend(env, a, '⚠️ Бота подключил к Telegram Business аккаунт, который не привязан к куратору: ' + th(nm) + (uname ? ' @' + th(uname) : '') + '. Если это куратор — отправь ему его ссылку-приглашение.');
    return tgSend(env, owner, 'Бот подключён, но я пока не знаю, какой ты куратор. Открой ссылку-приглашение, которую прислал Роман, — и всё заработает.') }
  const on = bc.is_enabled !== false; const c = CURATORS.find(x => x.id === row.cid);
  await env.DB.prepare('UPDATE cur_tg SET conn=?, enabled=?, username=?, name=?, at=? WHERE cid=?').bind(bc.id, on ? 1 : 0, uname, nm, new Date().toISOString(), row.cid).run();
  await logIt(env, on ? 'biz-on' : 'biz-off', 0, row.cid + ' @' + uname);
  for (const a of await admins(env)) await tgSend(env, a, (on ? '✅ ' : '⛔️ ') + th(c ? c.full : row.cid) + (on ? ' подключил бота к своему Telegram — время ответов теперь считается.' : ' отключил бота от своего Telegram.'));
  return tgSend(env, owner, on ? '✅ <b>Готово!</b> Ученики пишут тебе в личку, а я только отмечаю время: когда пришёл вопрос и когда ты ответил. Тексты переписки не сохраняются.\n\nЕсли ученик ждёт ответа 2 часа в твоё рабочее время — напомню.' : 'Бот отключён от твоего Telegram — время ответов больше не считается.') }
/* «спасибо», «ок», эмодзи, стикер, «+» — ответа не требует (текст не храним, решаем на лету) */
function isAck(m) { if (m.sticker) return true; if (m.photo || m.document || m.voice || m.video || m.video_note || m.audio) return false;
  const t = String(m.text || m.caption || '').trim(); if (!t) return false; if (/\?/.test(t)) return false;
  if (/(^|\s)(как|когда|почему|зачем|можно|помоги|подскаж|где|сколько|что|какой|какая|какие|нужно|надо)(\s|$)/i.test(t)) return false;
  const w = t.split(/\s+/).filter(Boolean); if (w.length > 3) return false;
  const x = t.toLowerCase().replace(/[!.,)(]+/g, ' ').trim();
  return /^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s+👍🙏❤️🔥]+$/u.test(t) || /^(спасибо|спс|благодарю|пасиб[оа]?|ок|окей|ok|окей|понял|поняла|понятно|ясно|хорошо|хор|отлично|супер|класс|круто|принял|приняла|ага|угу|да|ладно|договорились|\+|\+\+)( (большое|огромное|вам|тебе|понял|поняла|ок|понятно|спасибо))*$/.test(x) }
async function bizMessage(env, m, edited) {
  { const cc = await kvGet(env, 'care:conf'); if (cc && cc.conn && m.business_connection_id === cc.conn) return careMessage(env, m, edited) }
  const row = await env.DB.prepare('SELECT * FROM cur_tg WHERE conn=? AND enabled=1').bind(m.business_connection_id).first(); if (!row || !m.chat || m.chat.type !== 'private') return;
  const chat = String(m.chat.id); if (chat === row.tg_id || m.sender_business_bot) return;
  const out = m.from && String(m.from.id) === row.tg_id, t = edited ? (m.edit_date || m.date) | 0 : m.date | 0;
  if (edited && !out) return; /* правка сообщения ученика — не новый вопрос */
  const st = await env.DB.prepare('SELECT uid FROM student WHERE tg_chat=?').bind(chat).first(); if (!st) return; /* не ученик — ничего не храним */
  if (!out && (await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(chat).first() || await env.DB.prepare('SELECT tg_id FROM cur_tg WHERE tg_id=?').bind(chat).first())) return; /* админ или куратор пишет как ученик — не ждём */
  if (m.chat.username) await env.DB.prepare('INSERT OR REPLACE INTO tg_user (chat, username, name, at) VALUES (?,?,?,?)').bind(chat, m.chat.username, [m.chat.first_name, m.chat.last_name].filter(Boolean).join(' ') || null, new Date().toISOString()).run();
  if (!out) { const w0 = await env.DB.prepare('SELECT since FROM cwait WHERE cid=? AND chat=?').bind(row.cid, chat).first();
    if (!w0 && isAck(m)) { await logIt(env, 'cw-ack', st.uid, row.cid); return }
    if (!w0) { await env.DB.prepare('INSERT OR IGNORE INTO cwait (cid, chat, uid, since) VALUES (?,?,?,?)').bind(row.cid, chat, st.uid, t).run(); await logIt(env, 'cw-new', st.uid, row.cid + ' ' + t) } return }
  const w = await env.DB.prepare('SELECT * FROM cwait WHERE cid=? AND chat=?').bind(row.cid, chat).first(); if (!w) return;
  const ws = workSec(w.since, t, await curHours(env, row.cid));
  await env.DB.batch([env.DB.prepare('INSERT INTO cresp (cid, chat, uid, asked, answered, sec, wsec, day) VALUES (?,?,?,?,?,?,?,?)').bind(row.cid, chat, st.uid, w.since, t, t - w.since, ws, dayStr(new Date(t * 1000))),
    env.DB.prepare('DELETE FROM cwait WHERE cid=? AND chat=?').bind(row.cid, chat)]); await logIt(env, 'cw-ans', st.uid, row.cid + ' ' + (t - w.since) + 's' + (edited ? ' edit' : '') + (m.voice ? ' voice' : m.sticker ? ' sticker' : m.photo ? ' photo' : m.video_note ? ' circle' : '')) }
/* раз в час: ученик ждёт 2 рабочих часа — напомнить куратору, 4 — сигнал Роману */
async function curRemind(env, B) { const now = Date.now() / 1000 | 0, out = [];
  await env.DB.batch([env.DB.prepare('DELETE FROM cwait WHERE since < ?').bind(now - 3 * 86400), env.DB.prepare('DELETE FROM cwait WHERE chat IN (SELECT chat FROM tg_admin) OR chat IN (SELECT tg_id FROM cur_tg)')]);
  const ws = (await env.DB.prepare('SELECT w.*, c.tg_id, s.name sname, u.username FROM cwait w JOIN cur_tg c ON c.cid=w.cid LEFT JOIN student s ON s.uid=w.uid LEFT JOIN tg_user u ON u.chat=w.chat WHERE w.reminded < 2').all()).results || [];
  for (const w of ws) { if (B && !B.ok(3)) { out.push('budget'); break } const h = await curHours(env, w.cid), hr = msk().getUTCHours(); if (hr < h[0] || hr >= h[1]) continue;
    const ans = await env.DB.prepare('SELECT id FROM cresp WHERE cid=? AND chat=? AND answered >= ?').bind(w.cid, w.chat, w.since).first(); if (ans) { await env.DB.prepare('DELETE FROM cwait WHERE cid=? AND chat=?').bind(w.cid, w.chat).run(); continue }
    const sec = workSec(w.since, now, h), who = th(w.sname || 'Ученик'), c = CURATORS.find(x => x.id === w.cid), since = msk(new Date(w.since * 1000)), sinceT = ('0' + since.getUTCHours()).slice(-2) + ':' + ('0' + since.getUTCMinutes()).slice(-2) + (dayStr(new Date(w.since * 1000)) !== dayStr() ? ' (' + since.getUTCDate() + '.' + ('0' + (since.getUTCMonth() + 1)).slice(-2) + ')' : '');
    const btn = (w.username ? [[{ text: 'Открыть чат', url: 'https://t.me/' + w.username }]] : []).concat([[{ text: '✅ Уже ответил', callback_data: 'cwd:' + w.cid + ':' + w.chat }, { text: 'Ответ не нужен', callback_data: 'cwn:' + w.cid + ':' + w.chat }]]);
    if (sec >= 14400 && w.reminded < 2) { for (const a of await admins(env)) await tgSend(env, a, '🔴 ' + who + ' ждёт ответа куратора ' + th(c ? c.full : w.cid) + ' с ' + sinceT + ' МСК — уже ' + hrs(sec) + ' рабочего времени.', w.username ? [[{ text: 'Открыть чат', url: 'https://t.me/' + w.username }]] : null);
      await env.DB.prepare('UPDATE cwait SET reminded=2 WHERE cid=? AND chat=?').bind(w.cid, w.chat).run(); out.push([w.cid, 2]); if (B) B.use(2); continue }
    if (sec >= 7200 && w.reminded < 1) { await tgSend(env, w.tg_id, '⏰ ' + who + ' ждёт твоего ответа с ' + sinceT + ' МСК (' + hrs(sec) + ' рабочего времени). Цель — ответить за 1–2 часа.\nЕсли уже ответил или ответ не нужен — нажми кнопку ниже.', btn);
      await env.DB.prepare('UPDATE cwait SET reminded=1 WHERE cid=? AND chat=?').bind(w.cid, w.chat).run(); out.push([w.cid, 1]); if (B) B.use(1) } }
  return out }
async function curStats(env, days) { const from = (Date.now() / 1000 | 0) - days * 86400, now = Date.now() / 1000 | 0, res = [];
  for (const c of CURATORS) { const ct = await env.DB.prepare('SELECT username, enabled FROM cur_tg WHERE cid=?').bind(c.id).first();
    const rs = ((await env.DB.prepare('SELECT wsec, sec, day FROM cresp WHERE cid=? AND answered>=? ORDER BY wsec').bind(c.id, from).all()).results || []);
    const med = a => a.length ? a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)] : null, h = await curHours(env, c.id);
    const byDay = {}; for (const r of rs) (byDay[r.day] = byDay[r.day] || []).push(r.wsec);
    const wait = ((await env.DB.prepare('SELECT w.uid, w.since, w.chat, s.name FROM cwait w LEFT JOIN student s ON s.uid=w.uid WHERE w.cid=? ORDER BY w.since').bind(c.id).all()).results || []).filter(w => !(w.uid && isStaffUid(env, w.uid))).map(w => ({ uid: w.uid, name: w.name, since: w.since, wsec: workSec(w.since, now, h), src: /^app/.test(String(w.chat)) ? 'app' : 'tg' })); /* 30.10 QA №7: свои тесты команды не считаем — как в списке учеников. Раунд 3 (Н5): src — откуда ждут: tg (личка куратора в Telegram) или app (чат платформы) */
    res.push({ id: c.id, full: c.full, tg: ct && ct.username, connected: !!(ct && ct.enabled), hours: h, answered: rs.length, median: med(rs.map(r => r.wsec).filter(x => x > 0)), offHours: rs.filter(r => !(r.wsec > 0)).length, in2h: rs.length ? Math.round(rs.filter(r => r.wsec <= 7200).length / rs.length * 100) : null, over4h: rs.filter(r => r.wsec > 14400).length,
      days: Object.keys(byDay).sort().map(d => ({ day: d, median: med(byDay[d].filter(x => x > 0)), n: byDay[d].length })), waiting: wait }) }
  return { ok: true, days, curators: res } }
/* вебхук сам добавляет бизнес-события (без ручной ссылки /tg/setup) */
async function ensureBizHook(env) { const i = await tg(env, 'getWebhookInfo', {}); const w = i && i.result; if (!w || !w.url) return false;
  if ((w.allowed_updates || []).includes('deleted_business_messages')) return true;
  const r = await tg(env, 'setWebhook', { url: w.url, secret_token: await tgSecret(env), allowed_updates: ['message', 'callback_query', 'business_connection', 'business_message', 'edited_business_message', 'deleted_business_messages'] });
  await logIt(env, 'biz-hook', 0, String(!!(r && r.ok))); return !!(r && r.ok) }
async function curInvites(env) { const ok = await ensureBizHook(env); let t = '<b>Кураторы · подключение к личке</b>\n' + (ok ? '✅ Бот готов принимать сообщения из личек кураторов.' : '⚠️ Не получилось обновить вебхук — напиши в чат с Claude.') + '\n\nПерешли каждому куратору его ссылку. Он жмёт «Старт», бот пришлёт инструкцию.\n';
  for (const c of CURATORS) { const ct = await env.DB.prepare('SELECT username, enabled FROM cur_tg WHERE cid=?').bind(c.id).first();
    t += '\n<b>' + th(c.full) + '</b> — ' + (ct && ct.enabled ? '✅ подключён' + (ct.username ? ' (@' + th(ct.username) + ')' : '') : 'ещё не подключён') + '\nhttps://t.me/' + BOT(env) + '?start=cur_' + await curKey(env, c.id) + '\n' }
  return t }
async function curTg(env, cid) { const r = cid && await env.DB.prepare('SELECT username FROM cur_tg WHERE cid=? AND enabled=1').bind(cid).first(); return r && r.username || null }
async function studentRow(env, uid) { let r = await env.DB.prepare('SELECT * FROM student WHERE uid=?').bind(uid).first();
  if (!r) { await env.DB.prepare('INSERT OR IGNORE INTO student (uid, tg_token) VALUES (?,?)').bind(uid, rnd()).run(); r = await env.DB.prepare('SELECT * FROM student WHERE uid=?').bind(uid).first() }
  if (!r.tg_token) { const t = rnd(); await env.DB.prepare('UPDATE student SET tg_token=? WHERE uid=?').bind(t, uid).run(); r.tg_token = t } return r }
const FQT = { 1: 'каждый день', 2: 'раз в 2 дня', 3: 'раз в 3 дня', 7: 'раз в неделю' };
async function tgUpdate(env, up) {
  if (up.business_connection) return bizConnection(env, up.business_connection);
  if (up.business_message) return bizMessage(env, up.business_message);
  if (up.edited_business_message) return bizMessage(env, up.edited_business_message, true);
  if (up.deleted_business_messages) return careDeleted(env, up.deleted_business_messages);
  if (up.callback_query && /^(bp|ch[rs]|cr[tfw]):/.test(up.callback_query.data || '')) return bksCallback(env, up.callback_query);
  if (up.callback_query && /^cw[dn]:/.test(up.callback_query.data || '')) { const q = up.callback_query, [k, cid, wchat] = q.data.split(':');
    const ct = await env.DB.prepare('SELECT tg_id FROM cur_tg WHERE cid=?').bind(cid).first(); if (!ct || String(q.from.id) !== String(ct.tg_id)) return tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: 'Это напоминание другого куратора' });
    const w = await env.DB.prepare('SELECT * FROM cwait WHERE cid=? AND chat=?').bind(cid, wchat).first();
    if (w) await env.DB.batch([env.DB.prepare('DELETE FROM cwait WHERE cid=? AND chat=?').bind(cid, wchat), env.DB.prepare('INSERT INTO cack (cid, chat, uid, kind, since, at) VALUES (?,?,?,?,?,?)').bind(cid, wchat, w.uid, k === 'cwd' ? 'answered' : 'noneed', w.since, Date.now() / 1000 | 0)]);
    await logIt(env, 'cw-' + (k === 'cwd' ? 'manual' : 'noneed'), w ? w.uid : 0, cid);
    try { await tg(env, 'editMessageReplyMarkup', { chat_id: q.message.chat.id, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }) } catch (e) {}
    return tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: k === 'cwd' ? 'Отметил: ответ дан. Спасибо!' : 'Отметил: ответ не нужен' }) }
  if (up.callback_query) { const q = up.callback_query, chat = String(q.message && q.message.chat.id);
    if (q.data === 'off') { const p = await env.DB.prepare('SELECT uid, student FROM parent WHERE tg_chat=? AND active=1').bind(chat).first();
      if (p) { await env.DB.prepare('UPDATE parent SET active=0, updated=? WHERE uid=?').bind(new Date().toISOString(), p.uid).run(); await logIt(env, 'tg-off', p.uid, '') }
      await tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: p ? 'Вы отписались от отчётов' : 'Подписка уже отключена' });
      if (p) await tgSend(env, chat, 'Готово, отчёты больше не будут приходить. Если это ошибка — ' + th(p.student || 'ученик') + ' может снова подключить их в своём профиле.') }
    return }
  const m = up.message; if (!m || !m.chat || m.chat.type !== 'private') return; const chat = String(m.chat.id), text = String(m.text || '').trim();
  if (await bksReply(env, m, chat)) return; /* ответ на «Ответить здесь» / уведомление чата → в чат на платформе */
  if (await neuroTg(env, m, chat, text)) return;
  const st = text.match(/^\/start(?:\s+(\S+))?/);
  if (st && st[1] && /^c[0-9a-f]{10}$/.test(st[1])) return refStart(env, chat, st[1].slice(1), m.from);
  if (st && st[1] && /^e\d{1,9}$/.test(st[1])) return efStart(env, chat, +st[1].slice(1), m.from); /* 30.10: запись на эфир из бота (в т.ч. не-ученики) */
  if (st && st[1] && st[1].startsWith('login_')) return appLoginTg(env, chat, st[1].slice(6), m.from);
  if (/^\/panel/.test(text)) { const ok = (await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(chat).first()) || (await env.DB.prepare('SELECT cid FROM cur_tg WHERE tg_id=?').bind(chat).first());
    if (ok) return tgSend(env, chat, '<b>Пульт куратора</b>: ученики, ожидание ответа, рассылки и часы работы.', [[{ text: 'Открыть пульт', url: (env.BASE_URL || 'https://oduvanov-api.romanoduvanov52.workers.dev') + '/app' }]]) }
  if (st && st[1] && st[1].startsWith('p_')) {
    const p = await env.DB.prepare('SELECT * FROM parent WHERE token=?').bind(st[1].slice(2)).first();
    if (!p) return tgSend(env, chat, 'Ссылка устарела. Попросите ученика заново подключить отчёт в профиле OduvanovSchool.');
    if (!p.active) return tgSend(env, chat, 'Отчёт отключён. Попросите ученика подключить его заново в профиле OduvanovSchool.');
    /* CODE-01: подписку, уже привязанную к другому Telegram, по старой ссылке не перехватить. Новый родитель — ученик отключает отчёт и подключает заново (новая ссылка) */
    if (p.tg_chat && String(p.tg_chat) !== chat) { await logIt(env, 'tg-parent-busy', p.uid, chat); return tgSend(env, chat, 'Эти отчёты уже приходят в другой Telegram. Если их нужно получать вам, попросите ученика отключить отчёт в профиле и подключить заново: придёт новая ссылка.') }
    await env.DB.prepare("UPDATE parent SET tg_chat=?, channel='tg', active=1, updated=? WHERE uid=?").bind(chat, new Date().toISOString(), p.uid).run(); p.tg_chat = chat; p.active = 1;
    await logIt(env, 'tg-parent', p.uid, chat);
    await tgSend(env, chat, '👋 <b>Здравствуйте!</b>\n\nВы подписаны на отчёты об обучении <b>' + th(p.student || 'ученика') + '</b> в OduvanovSchool. Они будут приходить ' + (FQT[p.freq] || 'раз в неделю') + ' в ' + String(p.hour).padStart(2, '0') + ':00 по Москве.\n\nА вот первый отчёт 👇');
    if (dayStr() <= until(env)) await tgSendReport(env, p);
    return }
  if (st && st[1] && st[1].startsWith('cur_')) { let c = null; for (const x of CURATORS) if (st[1].slice(4) === await curKey(env, x.id)) c = x;
    if (!c) return tgSend(env, chat, 'Ссылка недействительна. Попроси у Романа новую.');
    await saveTgUser(env, m.from); const bc = await env.DB.prepare('SELECT v FROM kv WHERE k=?').bind('bc:' + chat).first();
    await env.DB.prepare('INSERT OR REPLACE INTO cur_tg (cid, tg_id, username, name, conn, enabled, at) VALUES (?,?,?,?,?,?,?)').bind(c.id, chat, (m.from && m.from.username) || null, [m.from && m.from.first_name, m.from && m.from.last_name].filter(Boolean).join(' ') || null, bc ? bc.v : null, bc ? 1 : 0, new Date().toISOString()).run();
    await logIt(env, 'cur-bind', c.uid, chat);
    if (bc) return tgSend(env, chat, '✅ <b>' + th(c.full) + ', всё подключено!</b> Ученики пишут тебе в личку, я отмечаю только время вопроса и ответа.');
    return tgSend(env, chat, '👋 <b>' + th(c.full) + ', привет!</b> Я запомнил, что ты куратор.\n\nОсталось подключить меня к твоему Telegram:\n1. Настройки → <b>Автоматизация чатов</b> (в старых версиях: Telegram для бизнеса → Чат-боты).\n2. Впиши <b>@' + BOT(env) + '</b> и нажми «Добавить».\n3. Доступ — ко всем личным чатам, права бота не включай.\n\nЯ вижу только время сообщений учеников школы. Тексты не сохраняю.') }
  if (st && st[1] && st[1].startsWith('s_')) {
    const r = await env.DB.prepare('SELECT * FROM student WHERE tg_token=?').bind(st[1].slice(2)).first();
    if (!r) return tgSend(env, chat, 'Ссылка устарела. Открой личный кабинет OduvanovSchool и нажми «Подключить Telegram» ещё раз.');
    /* CODE-03: ссылка привязки одноразовая — после входа выдаём новый tg_token */
    await env.DB.prepare('UPDATE student SET tg_chat=?, tg_at=?, tg_token=?, name=COALESCE(name, ?) WHERE uid=?').bind(chat, new Date().toISOString(), rnd(), [m.from && m.from.first_name].filter(Boolean).join(' ') || null, r.uid).run();
    await logIt(env, 'tg-student', r.uid, chat); await saveTgUser(env, m.from);
    const c = CURATORS.find(x => x.id === r.curator);
    return tgSend(env, chat, '🎉 <b>Telegram подключён!</b>\n\nТеперь сюда будут приходить:\n• напоминания об эфирах и открытии модулей — чтобы не пропустить x2 к баллам;\n• ответы куратора и проверка домашек;\n• твои достижения и новые места в рейтинге.' + (c ? '\n\nТвой куратор — <b>' + th(c.full) + '</b>.' : '\n\n' + nbt('Куратора назначит школа в ближайшие дни — он появится в приложении, в разделе «Мой куратор».')), [[{ text: 'Открыть курс', url: maLink(env, 'learn') }]]) } /* 30.10: кнопка — мини-приложение, вкладка «Учёба» (раньше — сайт); куратора назначает школа, а не ученик */
  if (st && st[1] && st[1].startsWith('adm_')) {
    if (st[1].slice(4) !== await admKey(env)) return tgSend(env, chat, 'Ссылка недействительна.');
    await env.DB.prepare('INSERT OR REPLACE INTO tg_admin (chat, name, added) VALUES (?,?,?)').bind(chat, [m.from && m.from.first_name, m.from && m.from.last_name].filter(Boolean).join(' '), new Date().toISOString()).run();
    await logIt(env, 'tg-admin', 0, chat); return tgSend(env, chat, '✅ Готово! Сюда будут приходить уведомления об оплатах OduvanovSchool.') }
  if (/^\/curators/.test(text)) { const a = await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(chat).first(); if (a) return tgSend(env, chat, await curInvites(env)) }
  if (/^\/stop/.test(text)) { const r = await env.DB.prepare('UPDATE parent SET active=0 WHERE tg_chat=?').bind(chat).run(); await env.DB.prepare('DELETE FROM tg_admin WHERE chat=?').bind(chat).run();
    return tgSend(env, chat, 'Готово, уведомления отключены.') }
  if (/^\/report/.test(text)) { const p = await env.DB.prepare('SELECT * FROM parent WHERE tg_chat=? AND active=1').bind(chat).first(); if (p) return tgSendReport(env, p) }
  if (await bksStudentMsg(env, m, chat, text)) return; /* ученик с куратором пишет боту → в чат с куратором */
  return tgSend(env, chat, '<b>OduvanovSchool</b> — бот онлайн-школы Романа Одуванова.\n\nЕсли вы родитель ученика, попросите его открыть профиль в личном кабинете, нажать «Отчёт для родителей» → Telegram и отправить вам ссылку.\n\nВопросы по обучению — в службу заботы.', [[{ text: 'Служба заботы', url: CARE }]]);
}
/* оплата из GetCourse: процесс «Вызвать URL» → /pay?k=…&… (GET или POST, любые поля) */
async function payNotify(env, f) {
  const g = k => { for (const x of k) if (f[x] != null && String(f[x]).trim() !== '' && !/^\{.*\}$/.test(String(f[x]))) return String(f[x]).trim(); return '' };
  const sum = g(['sum', 'cost', 'amount', 'payed', 'money']), offer = g(['offer', 'product', 'title', 'positions']), name = g(['name', 'user', 'full_name']) || [g(['fn']), g(['ln'])].filter(Boolean).join(' '), email = g(['email']), phone = g(['phone']), num = g(['number', 'order', 'deal']), link = g(['link', 'url']) || (g(['id']) ? SITE + '/sales/control/deal/update/id/' + g(['id']) : '');
  const t = '💸 <b>Новая оплата' + (sum ? ' · ' + th(sum) : '') + '</b>\n' + (offer ? '\n📦 ' + th(offer) : '') + (name ? '\n👤 ' + th(name) : '') + (email ? '\n✉️ ' + th(email) : '') + (phone ? '\n📞 ' + th(phone) : '') + (num ? '\n🧾 Заказ ' + th(num) : '');
  const admins = (await env.DB.prepare('SELECT chat FROM tg_admin').all()).results || [];
  for (const a of admins) await tgSend(env, a.chat, t, link ? [[{ text: 'Открыть заказ', url: link }]] : null);
  await logIt(env, 'pay', 0, (sum || '') + ' ' + (email || '') + ' → ' + admins.length); return admins.length;
}
const logIt = (env, kind, uid, info) => env.DB.prepare('INSERT INTO log (at, kind, uid, info) VALUES (?,?,?,?)').bind(new Date().toISOString(), kind, uid | 0, String(info).slice(0, 500)).run();

/* ---------- HTTP ---------- */

/* ---------- деньги «на вывод»: официальный экспорт платежей GetCourse (Сумма, Комиссии, Получено) ---------- */
const GC_HOST = 'https://oduvanovroman.getcourse.ru';
const statKey = async env => env.STAT_KEY || (await sha('stat:' + env.ADMIN_KEY)).slice(0, 32);
const rub = s => { const m = String(s || '').split('руб')[0].replace(/[\s ]/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? +m[0] : 0 };
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* бюджет внешних запросов одного запуска: у Cloudflare Free ~50 подзапросов на запуск, оставляем запас */
const budget = (max = 45) => ({ n: 0, max, ok(k = 1) { return this.n + k <= this.max }, use(k = 1) { this.n += k } });
/* Export API GetCourse: 100 запросов за 2 часа на аккаунт (вместе с проверками статуса), один экспорт за раз, ошибка 903 — «слишком много запросов» */
const GC_CAP = 80, GC_WIN = 2 * 3600e3;
async function gcCall(env, host, url, B) {
  const now = Date.now(), pk = 'gcpause:' + host, qk = 'gcq:' + host;
  const pause = await kvGet(env, pk); if (pause && +pause > now) throw new Error('GetCourse: пауза после ошибки лимита ещё ' + Math.ceil((+pause - now) / 60e3) + ' мин');
  let q = await kvGet(env, qk); q = Array.isArray(q) ? q.filter(t => now - t < GC_WIN) : [];
  if (q.length >= GC_CAP) throw new Error('GetCourse: ' + q.length + ' запросов к Export API за 2 часа — жду, чтобы не упереться в лимит 100');
  if (B && !B.ok(1)) return null; if (B) B.use(1);
  q.push(now); await kvPut(env, qk, JSON.stringify(q));
  const r = await fetch(url), ct = r.headers.get('Content-Type') || '', t = await r.text(); let j = null; try { j = JSON.parse(t) } catch (e) {}
  if (!j) throw new Error('GetCourse: ответ не JSON (HTTP ' + r.status + (ct ? ', ' + ct.split(';')[0] : '') + ')');
  const code = +(j.error_code || (j.info && j.info.error_code) || 0), msg = String(j.error_message || (j.info && j.info.error_message) || '');
  if (code === 903 || r.status === 429 || /слишком много|too many/i.test(msg)) { await kvPut(env, pk, String(now + 30 * 60e3)); throw new Error('GetCourse: слишком много запросов (' + (code || r.status) + '), пауза 30 мин') }
  if (!r.ok) throw new Error('GetCourse: HTTP ' + r.status + (msg ? ' · ' + msg.slice(0, 120) : ''));
  return j }
function needCols(what, F, names) { const miss = names.filter(n => F.indexOf(n) < 0); if (miss.length) throw new Error('GetCourse ' + what + ': нет колонок ' + miss.join(', ') + ' — данные не записаны') }
/* экспорт по шагам: запуск → export_id в kv → несколько проверок; не готов — доберёт следующий запуск (без sleep-цикла на минуты) */
async function gcExportStep(env, name, kind, from, to, host, key, B, polls = 3) {
  if (!key) throw new Error('нет ключа GetCourse');
  const sk = 'exp:' + name; let st = await kvGet(env, sk), fresh = false;
  if (st && Date.now() - st.at > 40 * 60e3) { await kvDel(env, sk); await logIt(env, 'gc-export-drop', 0, name + ' ' + st.id); st = null }
  if (!st) { const j = await gcCall(env, host, host + '/pl/api/account/' + kind + '?' + new URLSearchParams({ key, 'created_at[from]': from, 'created_at[to]': to }), B); if (!j) return null;
    if (!j.success || !j.info || !j.info.export_id) throw new Error('GetCourse: ' + (j.error_message || 'не удалось запустить экспорт'));
    st = { id: j.info.export_id, from, to, at: Date.now() }; fresh = true; await kvPut(env, sk, JSON.stringify(st)) }
  for (let i = 0; i < polls; i++) { if (fresh || i) await sleep(i ? 5000 : 3000);
    const x = await gcCall(env, host, host + '/pl/api/account/exports/' + st.id + '?key=' + encodeURIComponent(key), B); if (!x) return null;
    if (x.success && x.info && Array.isArray(x.info.items)) { await kvDel(env, sk);
      if (!Array.isArray(x.info.fields)) throw new Error('GetCourse: в экспорте нет списка колонок');
      x.info._from = st.from; x.info._to = st.to; return x.info } }
  return null }
/* разовый экспорт целиком (только для /fin/old/sync): не больше 20 проверок, чтобы уложиться в ~50 запросов */
async function gcExport(env, kind, from, to, host = GC_HOST, key = env.GC_KEY, tries = 20) {
  if (!key) throw new Error('нет ключа GetCourse'); const B = budget(45);
  const r = await gcCall(env, host, host + '/pl/api/account/' + kind + '?' + new URLSearchParams({ key, 'created_at[from]': from, 'created_at[to]': to }), B);
  if (!r || !r.success || !r.info || !r.info.export_id) throw new Error('GetCourse: ' + ((r && r.error_message) || 'ошибка экспорта'));
  for (let i = 0; i < Math.min(tries, 20); i++) { await sleep(4000);
    const x = await gcCall(env, host, host + '/pl/api/account/exports/' + r.info.export_id + '?key=' + encodeURIComponent(key), B); if (!x) break;
    if (x.success && x.info && Array.isArray(x.info.items)) { if (!Array.isArray(x.info.fields)) throw new Error('GetCourse: в экспорте нет списка колонок'); return x.info } }
  throw new Error('GetCourse: экспорт не успел');
}
async function syncPay(env, from, to, B, polls = 3) {
  const info = await gcExportStep(env, 'pay', 'payments', from, to, GC_HOST, env.GC_KEY, B, polls); if (!info) return { pending: true, from, to };
  const F = info.fields, ix = n => F.indexOf(n), now = new Date().toISOString();
  needCols('платежи', F, ['Номер', 'Дата создания', 'Статус', 'Сумма', 'Комиссии', 'Получено']);
  const I = { id: ix('Номер'), user: ix('Пользователь'), email: ix('Эл. почта'), deal: ix('Заказ'), at: ix('Дата создания'), type: ix('Тип'), st: ix('Статус'), sum: ix('Сумма'), fee: ix('Комиссии'), net: ix('Получено'), title: ix('Название') };
  const miss = ['Пользователь', 'Эл. почта', 'Заказ', 'Тип', 'Название'].filter(n => ix(n) < 0); if (miss.length) await logIt(env, 'pay-sync-warn', 0, 'нет колонок ' + miss.join(', '));
  const stm = env.DB.prepare('INSERT OR REPLACE INTO pay (id, deal, email, name, created, day, type, status, sum, fee, net, title, synced) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const rows = info.items.filter(r => +r[I.id]).map(r => stm.bind(+r[I.id], +r[I.deal] || null, r[I.email] || '', r[I.user] || '', r[I.at] || '', String(r[I.at] || '').slice(0, 10), r[I.type] || '', r[I.st] || '', rub(r[I.sum]), Math.abs(rub(r[I.fee])), rub(r[I.net]), r[I.title] || '', now));
  for (let i = 0; i < rows.length; i += 80) await env.DB.batch(rows.slice(i, i + 80));
  await kvPut(env, 'pay_synced', now); await finDays(env, true);
  return { n: rows.length, from: info._from, to: info._to };
}
/* быстрая досинхронизация последних 3 дней — после оплаты (процесс GetCourse зовёт /pay) и по кнопке «Обновить»; не чаще раза в minGap секунд */
/* 29.10 (бэклог №3): имена учеников из GetCourse — раз в сутки экспорт пользователей (GC_KEY), берём только тех, кто есть у нас (ученики, банк, рейтинг).
   Пустые имена в student заполняются; банк и «Смотреть как» показывают имя из GetCourse, если нет своего. */
async function syncNames(env, B, force) { if (!env.GC_KEY) return null; const today = dayStr();
  if (!force && !(await kvGet(env, 'exp:users')) && ((await kvGet(env, 'names_day')) === today || msk().getUTCHours() < 4)) return { skip: 'fresh' };
  const info = await gcExportStep(env, 'users', 'users', '2020-01-01', today, GC_HOST, env.GC_KEY, B, 3); if (!info) return { pending: true };
  const F = info.fields.map(f => String(f).trim()), fx = re => F.findIndex(f => re.test(f));
  const I = { id: fx(/^(id|ID|Id|Номер)$/), fn: fx(/^Имя$/i), ln: fx(/^Фамилия$/i), full: fx(/^(ФИО|Пользователь|Имя Фамилия)$/i), em: fx(/^(email|e-mail|эл\.? ?почта|почта)$/i) };
  try { await env.DB.prepare('ALTER TABLE gc_name ADD COLUMN email TEXT').run() } catch (e) {} /* 30.10: почта — для писем об открытии модуля */
  if (I.id < 0 || (I.fn < 0 && I.full < 0)) { await logIt(env, 'names-err', 0, 'колонки: ' + F.slice(0, 30).join(', ')); await kvPut(env, 'names_day', today); return { err: 'cols' } }
  const D = await loadData(env), want = {};
  const [a, b] = await env.DB.batch([env.DB.prepare('SELECT uid FROM student'), env.DB.prepare('SELECT DISTINCT uid FROM bank_tx')]);
  for (const r of [...(a.results || []), ...(b.results || [])]) want[r.uid] = 1; for (const r of (D.rows || [])) if (r.uid != null) want[+r.uid] = 1;
  const now = new Date().toISOString(), stm = env.DB.prepare('INSERT OR REPLACE INTO gc_name (uid, name, at, email) VALUES (?,?,?,?)'), rows = [];
  for (const r of info.items) { const uid = +r[I.id]; if (!want[uid]) continue;
    const nm = (I.fn >= 0 ? [r[I.fn], I.ln >= 0 ? r[I.ln] : ''].join(' ') : String(r[I.full] || '')).replace(/\s+/g, ' ').trim(); const em = I.em >= 0 ? String(r[I.em] || '').trim().toLowerCase() : ''; if (nm) rows.push(stm.bind(uid, nm.slice(0, 80), now, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) ? em : null)) }
  for (let i = 0; i < rows.length; i += 90) await env.DB.batch(rows.slice(i, i + 90));
  await env.DB.prepare("UPDATE student SET name=(SELECT g.name FROM gc_name g WHERE g.uid=student.uid) WHERE (name IS NULL OR name='') AND uid IN (SELECT uid FROM gc_name)").run();
  await kvPut(env, 'names_day', today); for (const k in APPC) delete APPC[k]; await logIt(env, 'names', 0, rows.length + ' имён из ' + info.items.length); return { n: rows.length, all: info.items.length } }
async function syncSoon(env, minGap = 30) { if (!env.GC_KEY) return null;
  const last = await kvGet(env, 'pay_try'); if (last && Date.now() - +last < minGap * 1000) return null;
  await kvPut(env, 'pay_try', String(Date.now()));
  try { const t = dayStr(); return await syncPay(env, addDays(t, -3), t, budget(30), 5) } catch (e) { await logIt(env, 'pay-sync-err', 0, e.message); return null } }
/* по часам — последние 45 дней (не чаще раза в 50 мин); раз в сутки после 05:00 МСК — всё с PAY_FROM (по умолчанию 20.04.2026). Незаконченный экспорт добирается следующим запуском */
async function syncPayAuto(env, B) { if (!env.GC_KEY) return null; const h = msk().getUTCHours(), today = dayStr();
  const pend = await kvGet(env, 'exp:pay');
  if (!pend) { const last = await kvGet(env, 'pay_auto'); if (last && Date.now() - +last < 50 * 60e3) return { skip: 'fresh' }; await kvPut(env, 'pay_auto', String(Date.now())) }
  const full = h >= 5 && (await kvGet(env, 'pay_full')) !== today;
  try { const r = await syncPay(env, full ? (env.PAY_FROM || '2026-04-20') : addDays(today, -45), today, B, 3);
    if (r && r.n != null && r.from === (env.PAY_FROM || '2026-04-20')) await kvPut(env, 'pay_full', today); return r }
  catch (e) { await logIt(env, 'pay-sync-err', 0, e.message); return { err: e.message } } }
/* старый аккаунт школы (oduvanovschool, до 20.04.2026): только цифры.
   Оплаты кладём в pay с отрицательным id (имя пустое, вместо почты — хеш), оплаченные заказы — в odeal.
   В новом GetCourse ничего не создаётся. Запускается сам по расписанию один раз, пока в kv нет old_import. */
const GC_OLD = 'https://oduvanovschool.getcourse.ru';
async function syncOld(env) {
  if (!env.GC_KEY_OLD) return { err: 'нет GC_KEY_OLD' };
  await ensure(env); const to = dayStr(), now = new Date().toISOString();
  const eh = async e => { e = String(e || '').trim().toLowerCase(); return e ? (await sha('old:' + e)).slice(0, 16) : '' };
  const P = await gcExport(env, 'payments', '2020-01-01', to, GC_OLD, env.GC_KEY_OLD, 75), F = P.fields, ix = n => F.indexOf(n);
  needCols('платежи старого аккаунта', F, ['Номер', 'Дата создания', 'Статус', 'Сумма', 'Комиссии', 'Получено']);
  const I = { id: ix('Номер'), email: ix('Эл. почта'), at: ix('Дата создания'), type: ix('Тип'), st: ix('Статус'), sum: ix('Сумма'), fee: ix('Комиссии'), net: ix('Получено'), title: ix('Название') };
  const sp = env.DB.prepare('INSERT OR REPLACE INTO pay (id, deal, email, name, created, day, type, status, sum, fee, net, title, synced) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'), pr = [];
  for (const r of P.items) { if (!(+r[I.id])) continue; pr.push(sp.bind(-(+r[I.id]), null, await eh(r[I.email]), '', r[I.at] || '', String(r[I.at] || '').slice(0, 10), r[I.type] || '', r[I.st] || '', rub(r[I.sum]), Math.abs(rub(r[I.fee])), rub(r[I.net]), r[I.title] || '', 'old')) }
  const D = await gcExport(env, 'deals', '2020-01-01', to, GC_OLD, env.GC_KEY_OLD, 75), G = D.fields, jx = n => G.indexOf(n);
  needCols('заказы старого аккаунта', G, ['ID заказа', 'Оплачен', 'Дата оплаты', 'Стоимость, RUB']);
  const J = { id: jx('ID заказа'), uid: jx('ID пользователя'), email: jx('Email'), paid: jx('Оплачен'), at: jx('Дата оплаты'), cost: jx('Стоимость, RUB'), title: jx('Состав заказа') };
  const sd = env.DB.prepare('INSERT OR REPLACE INTO odeal (id, day, eh, cost, title) VALUES (?,?,?,?,?)'), dr = [];
  for (const r of D.items) { if (r[J.paid] !== 'Да' || !r[J.at] || !(+r[J.id])) continue; dr.push(sd.bind(-(+r[J.id]), String(r[J.at]).slice(0, 10), (await eh(r[J.uid] || r[J.email])) || 'd' + r[J.id], parseFloat(String(r[J.cost]).replace(/[\s ]/g, '').replace(',', '.')) || 0, r[J.title] || '')) }
  for (let i = 0; i < pr.length; i += 80) await env.DB.batch(pr.slice(i, i + 80));
  for (let i = 0; i < dr.length; i += 80) await env.DB.batch(dr.slice(i, i + 80));
  const res = { pay: pr.length, deals: dr.length, at: now }; await kvDel(env, 'fin_days');
  await env.DB.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)').bind('old_import', JSON.stringify(res)).run();
  await logIt(env, 'old-import', 0, JSON.stringify(res)); return res;
}
async function syncOldAuto(env) { if (!env.GC_KEY_OLD) return null; await ensure(env);
  if (await env.DB.prepare("SELECT v FROM kv WHERE k='old_import'").first()) return null;
  const t = await env.DB.prepare("SELECT v FROM kv WHERE k='old_try'").first(); if (t && Date.now() - +t.v < 50 * 60e3) return null;
  await env.DB.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)').bind('old_try', String(Date.now())).run();
  try { return await syncOld(env) } catch (e) { await logIt(env, 'old-import-err', 0, e.message); return { err: e.message } } }
/* агрегат по дням: пересчёт только после синхронизации (pay_synced сменился), иначе — из kv */
async function finDays(env, force) { const syn = await kvGet(env, 'pay_synced'), c = !force && await kvGet(env, 'fin_days');
  if (c && c.v === 1 && c.synced === syn) return c;
  const d = await env.DB.prepare("SELECT day, COUNT(*) n, SUM(sum) g, SUM(fee) f, SUM(net) net, SUM(CASE WHEN id<0 THEN net ELSE 0 END) o FROM pay WHERE status='Получен' GROUP BY day ORDER BY day").all();
  const od = await env.DB.prepare('SELECT day, COUNT(*) n, SUM(cost) s FROM odeal GROUP BY day ORDER BY day').all();
  const o = { v: 1, synced: syn, days: (d.results || []).map(r => [r.day, r.n, Math.round(r.g * 100) / 100, Math.round(r.f * 100) / 100, Math.round(r.net * 100) / 100, Math.round((r.o || 0) * 100) / 100]), odays: (od.results || []).map(r => [r.day, r.n, Math.round(r.s * 100) / 100]) };
  await kvPut(env, 'fin_days', JSON.stringify(o)); return o }
async function finData(env, from, to, pfrom, pto) {
  const c = await finDays(env);
  const q = "SELECT id, deal, name, email, created, type, sum, fee, net, title FROM pay WHERE status='Получен' AND day>=? AND day<=? ORDER BY created DESC LIMIT 25000";
  const list = from && to ? (await env.DB.prepare(q).bind(from, to).all()).results || [] : [];
  const plist = pfrom && pto ? (await env.DB.prepare(q).bind(pfrom, pto).all()).results || [] : null;
  const pl = (await env.DB.prepare("SELECT k, v FROM kv WHERE k LIKE 'plan:%'").all()).results || [];
  const plans = {}; pl.forEach(r => { try { plans[r.k.slice(5)] = JSON.parse(r.v) } catch (e) {} });
  return { ok: true, synced: c.synced, days: c.days, odays: c.odays, list, plist, plans };
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url), path = u.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    try {
      if (path === '/app') return new Response(APP_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
      /* пульт живёт и на GitHub Pages (gc/pult.html) — ответы API с CORS для своих доменов */
      if (path.startsWith('/ma/')) return maApi(env, req, path);
      if (path.startsWith('/bank/')) return bankApi(env, req, path);
      if (path.startsWith('/chat/')) return chatApi(env, req, path);
      if (path.startsWith('/srch/')) return srchApi(env, req, path);
      if (CUR_API.includes(path)) return curApi(env, req, path);
      if (EFIR_SCEN_API.includes(path)) return efirScenApi(env, req, path); /* 30.10 эфиры: сценарии, модерация, заявки */
      if (path.startsWith('/efir/')) return efirApi(env, req, path);
      if (path.startsWith('/app/api/')) { const r0 = await appApi(env, req, path), h0 = new Headers(r0.headers); for (const [k, v] of Object.entries(cors(req))) h0.set(k, v); return new Response(r0.body, { status: r0.status, headers: h0 }) }
      if (path !== '/') await ensure(env);
      if (path === '/setup' && u.searchParams.get('k') === env.ADMIN_KEY) { await ensureAll(env); await kvPut(env, 'schema_v', SCHEMA_V); return json(req, { ok: true, schema: SCHEMA_V }) }

      /* ---------- вход ученика (v42) ---------- */
      /* процесс GetCourse «Вызвать URL»: ответ (fs1.<32 hex>) GetCourse сохраняет в доп. поле пользователя fs_key */
      if (path === '/auth/gc') { if (!same(u.searchParams.get('k'), await hookKey(env))) return new Response('forbidden', { status: 403 });
        const uid = String(u.searchParams.get('uid') || '').trim(); if (!okUid(uid)) return new Response('bad uid', { status: 400 });
        await env.DB.prepare('INSERT INTO authuid (uid, issued) VALUES (?,?) ON CONFLICT(uid) DO UPDATE SET issued=excluded.issued').bind(+uid, new Date().toISOString()).run();
        const key = await userKey(env, uid);
        return u.searchParams.get('fmt') === 'json' ? new Response(JSON.stringify({ key }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }) : new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } }) }
      /* ключ из доп. поля → токены t (запись) и v (чтение) */
      if (path === '/auth' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {} const uid = String(o.u || '');
        if (!okUid(uid) || !same(o.k, await userKey(env, uid))) return deny(req);
        await env.DB.prepare('INSERT INTO authuid (uid, seen) VALUES (?,?) ON CONFLICT(uid) DO UPDATE SET seen=excluded.seen').bind(+uid, new Date().toISOString()).run();
        return json(req, { ok: true, u: +uid, t: await mkToken(env, 'a', uid), v: await mkToken(env, 'v', uid), ttl: TTL.v }, 200, { 'Cache-Control': 'no-store' }) }
      if (path === '/auth/setup' && u.searchParams.get('k') === env.ADMIN_KEY) { const base = env.BASE_URL || u.origin;
        return json(req, { field: 'fs_key', process_url: base + '/auth/gc?k=' + await hookKey(env) + '&uid={object.id}', rating_put: base + '/rating/put?k=' + await ratingKey(env), auth_secret: env.AUTH_SECRET ? 'AUTH_SECRET задан' : 'AUTH_SECRET не задан: ключи выводятся из ADMIN_KEY', strict: env.AUTH_STRICT === '1' }) }
      if (path === '/auth/stats' && u.searchParams.get('k') === env.ADMIN_KEY) { const a = await env.DB.prepare('SELECT COUNT(issued) i, COUNT(seen) s FROM authuid').first(); let rt = null;
        try { const D = await loadData(env); if (D.rows.length && D.rows[0].uid != null) { const has = new Set(((await env.DB.prepare('SELECT uid FROM authuid WHERE issued IS NOT NULL').all()).results || []).map(x => String(x.uid)));
          const miss = D.rows.filter(x => !has.has(String(x.uid))); rt = { rows: D.rows.length, with_key: D.rows.length - miss.length, without_key: miss.slice(0, 60).map(x => x.name) } } } catch (e) { rt = { err: e.message } }
        return json(req, { ok: true, issued: a.i, seen: a.s, rating: rt, rating_at: await kvGet(env, 'rating_at'), strict: env.AUTH_STRICT === '1' }) }

      /* ---------- рейтинг: закрытая копия на сервере (CODE-04) ---------- */
      if (path === '/rating/put' && req.method === 'POST') { if (!same(u.searchParams.get('k'), await ratingKey(env)) && !(await ghOk(env, req))) return json(req, { ok: false }, 403);
        const t = await req.text(); if (t.length > 1.5e6) return json(req, { ok: false, err: 'big' }, 413); let D; try { D = JSON.parse(t) } catch (e) { return json(req, { ok: false, err: 'json' }, 400) }
        if (!D || !Array.isArray(D.rows) || !D.rows.length || D.rows.some(r => !okUid(r.uid) || !r.h)) return json(req, { ok: false, err: 'rows: нужны uid и h в каждой строке' }, 400);
        await kvPut(env, 'rating', t); await kvPut(env, 'rating_at', new Date().toISOString()); RC = null; await logIt(env, 'rating-put', 0, D.rows.length + ' rows'); return json(req, { ok: true, rows: D.rows.length }) }
      /* баллы за заработок для gamify.py: только подтверждённые куратором оплаты, floor(₽/10000)*100 */
      /* 1.11 (Роман: «после эфира не начислились баллы»): баллы за эфиры (efir_pts: 30 мин в эфире, запись, вопросы, сцена) → рейтинг, как bankpts. {uid: баллы} */
      if (path === '/rating/efirpts') { if (!same(u.searchParams.get('k'), await ratingKey(env)) && !(await ghOk(env, req))) return json(req, { ok: false }, 403);
        let rs = []; try { rs = await qAll(env.DB.prepare('SELECT uid, SUM(pts) p FROM efir_pts WHERE uid IS NOT NULL GROUP BY uid')) } catch (e) { rs = [] }
        const out = {}; for (const r of rs) if (+r.uid > 0 && +r.p > 0) out[String(r.uid)] = +r.p; return json(req, out) }
      if (path === '/rating/bankpts') { if (!same(u.searchParams.get('k'), await ratingKey(env)) && !(await ghOk(env, req))) return json(req, { ok: false }, 403); await bankEnsure(env);
        const out = {}; for (const r of ((await env.DB.prepare('SELECT uid, SUM(COALESCE(rub, amount)) c FROM bank_tx WHERE conf=1 AND del_at IS NULL GROUP BY uid').all()).results || [])) { const p = bPts(r.c); if (p > 0 && !isStaffUid(env, r.uid)) out[r.uid] = p }
        return json(req, out, 200, { 'Cache-Control': 'no-store' }) }
      if (path === '/rating') { const w = await who(env, u.searchParams.get('v') || u.searchParams.get('t'), 'av'); if (!w.uid) return deny(req);
        return json(req, await ratingFor(env, w.uid, u.searchParams.get('for')), 200, { 'Cache-Control': 'private, max-age=60' }) }
      /* расписание для виджета «Ближайшие открытия»: без личных данных */
      /* расписание и структура курса (модули → части → уроки) для виджетов и страниц курса: без личных данных */
      if (path === '/sched') { const D = await loadData(env);
        const modules = (D.modules || []).map(m => ({ id: m.id, name: m.name, desc: m.desc || '', at: m.at || null, amazon: !!m.amazon, parts: (m.parts || []).map(p => ({ name: p.name, at: p.at || null, lessons: (p.lessons || []).map(l => ({ id: l.id, t: l.t })) })) }));
        return json(req, { ok: true, schedule: D.schedule || [], x2: D.x2 || null, modules, total_lessons: D.total_lessons || 0, updated: D.updated || '' }, 200, { 'Cache-Control': 'public, max-age=300' }) }
      /* «Мои покупки»: скрытые незавершённые заказы (STU-12). GET ?u&t → {ok, hidden:[номер]}; POST {u, t, hide:[], unhide:[]} → {ok, hidden}. Токен t — как у /me (sig — синоним) */
      if (path === '/fmp/hidden') { let o = {}; if (req.method === 'POST') { try { o = JSON.parse(await req.text() || '{}') } catch (e) {} }
        const tk = req.method === 'POST' ? (o.t || o.sig) : (u.searchParams.get('t') || u.searchParams.get('sig')), q = +(req.method === 'POST' ? o.u : u.searchParams.get('u'));
        const w = await who(env, tk, 'a'); if (!w.uid || (q && q !== w.uid)) return deny(req); const uid = w.uid;
        if (req.method === 'POST') { const clean = a => (Array.isArray(a) ? a : []).map(x => String(x == null ? '' : x).trim()).filter(x => /^[0-9A-Za-zА-Яа-я_\-]{1,40}$/.test(x)).slice(0, 200);
          const hide = clean(o.hide), unhide = clean(o.unhide), now = new Date().toISOString(), st = [];
          for (const n of unhide) st.push(env.DB.prepare('DELETE FROM fmp_hidden WHERE uid=? AND num=?').bind(uid, n));
          const cnt = (await env.DB.prepare('SELECT COUNT(*) n FROM fmp_hidden WHERE uid=?').bind(uid).first()).n | 0;
          for (const n of hide.slice(0, Math.max(0, 500 - cnt))) st.push(env.DB.prepare('INSERT OR IGNORE INTO fmp_hidden (uid, num, at) VALUES (?,?,?)').bind(uid, n, now));
          if (st.length) await env.DB.batch(st) }
        const rs = ((await env.DB.prepare('SELECT num FROM fmp_hidden WHERE uid=? ORDER BY at').bind(uid).all()).results || []).map(r => r.num);
        return json(req, { ok: true, hidden: rs }, 200, { 'Cache-Control': 'no-store' }) }

      /* учёт времени: navigator.sendBeacon(text/plain) → {u, d, s, v} */
      if (path === '/t' && req.method === 'POST') {
        const o = JSON.parse(await req.text() || '{}'); const uid = +o.u; if (!okUid(uid)) return json(req, { ok: false }, 400);
        /* CODE-09: время пишет только сам ученик. Без токена — переходный режим: пока ученик ни разу не входил с ключом (и пока не включён AUTH_STRICT=1) */
        const w = await who(env, o.t, 'a'); if (w.bad || (w.uid && w.uid !== uid)) return deny(req);
        if (!w.tok) { if (env.AUTH_STRICT === '1') return deny(req); const sn = await env.DB.prepare('SELECT seen FROM authuid WHERE uid=?').bind(uid).first(); if (sn && sn.seen) return deny(req) }
        const day = /^\d{4}-\d{2}-\d{2}$/.test(o.d) && Math.abs(new Date(o.d) - new Date(dayStr())) <= 2 * 864e5 ? o.d : dayStr();
        const s = Math.max(0, Math.min(900, o.s | 0)), v = Math.max(0, Math.min(900, o.v | 0)); if (!s && !v) return json(req, { ok: true });
        await env.DB.prepare('INSERT INTO time (uid, day, site, video) VALUES (?,?,?,?) ON CONFLICT(uid, day) DO UPDATE SET site=MIN(site+excluded.site, 72000), video=MIN(video+excluded.video, 72000)').bind(uid, day, s, v).run();
        ctx.waitUntil((async () => { const ex = await env.DB.prepare('SELECT 1 FROM uidmap WHERE uid=?').bind(uid).first(); if (!ex) await env.DB.prepare('INSERT OR IGNORE INTO uidmap (uid, h) VALUES (?,?)').bind(uid, await hashUid(uid)).run() })());
        return json(req, { ok: true });
      }

      /* часы для рейтинга и профиля: {h: [сайт, видео]} в секундах */
      /* часы теперь приходят внутри /rating; отдельный запрос — тоже только вошедшему ученику (ключи — h с серверной солью) */
      if (path === '/hours') { const w = await who(env, u.searchParams.get('v') || u.searchParams.get('t'), 'av'); if (!w.uid) return deny(req);
        const R = await ratingFor(env, w.uid, null); return json(req, R.hours, 200, { 'Cache-Control': 'private, max-age=120' }) }

      /* настройки отчёта родителю */
      if (path === '/parent' && req.method === 'GET') {
        /* CODE-01: настройки и ссылку для родителя видит только сам ученик */
        const w = await who(env, u.searchParams.get('t'), 'a'); if (w.bad) return deny(req); const q = +u.searchParams.get('u');
        if (!w.uid) w.uid = await softUid(env, w, q);
        if (!w.uid || (q && q !== w.uid)) return json(req, { ok: true, auth: false, p: null, until: until(env), live: dayStr() <= until(env) });
        const uid = w.uid; const p = await env.DB.prepare('SELECT email, name, freq, hour, channel, active, last_sent, tg_chat, token FROM parent WHERE uid=?').bind(uid).first();
        if (p) { p.tg_ok = !!p.tg_chat; p.tg_link = 'https://t.me/' + BOT(env) + '?start=p_' + p.token; delete p.tg_chat; delete p.token }
        return json(req, { ok: true, p: p || null, until: until(env), live: dayStr() <= until(env) });
      }
      if (path === '/parent' && req.method === 'POST') {
        let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
        const w = await who(env, o.t, 'a'); if (!w.uid && !w.bad) w.uid = await softUid(env, w, +o.u); if (!w.uid || (o.u && +o.u !== w.uid)) return deny(req); const uid = w.uid;
        if (o.off) { await env.DB.prepare('UPDATE parent SET active=0, updated=? WHERE uid=?').bind(new Date().toISOString(), uid).run(); await logIt(env, 'parent-off', uid, ''); return json(req, { ok: true }) }
        const email = String(o.email || '').trim().toLowerCase(); if (o.channel !== 'tg' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json(req, { ok: false, err: 'email' }, 400);
        const freq = [1, 2, 3, 7].includes(+o.freq) ? +o.freq : 7, hour = Math.max(6, Math.min(23, o.hour | 0 || 19)), now = new Date().toISOString();
        /* отчёт включают заново (или впервые) → новая ссылка для родителя, старая привязка Telegram сбрасывается */
        const old = await env.DB.prepare('SELECT token, active FROM parent WHERE uid=?').bind(uid).first(); const token = old && old.active && old.token || rnd();
        await env.DB.prepare('INSERT INTO parent (uid, h, student, email, name, freq, hour, channel, active, token, created, updated) VALUES (?,?,?,?,?,?,?,?,1,?,?,?) ON CONFLICT(uid) DO UPDATE SET student=excluded.student, email=CASE WHEN length(excluded.email)=0 THEN parent.email ELSE excluded.email END, name=excluded.name, freq=excluded.freq, hour=excluded.hour, channel=excluded.channel, tg_chat=CASE WHEN parent.active=1 THEN parent.tg_chat ELSE NULL END, token=excluded.token, active=1, updated=excluded.updated')
          .bind(uid, await hashUid(uid), String(o.student || '').slice(0, 80), email, String(o.name || '').slice(0, 40), freq, hour, o.channel === 'tg' ? 'tg' : 'email', token, now, now).run();
        await logIt(env, 'parent-on', uid, email + ' f' + freq + ' h' + hour);
        /* CODE-01: пример на почту — не чаще раза в сутки на ученика */
        let sent = null; if (o.sendNow && dayStr() <= until(env) && o.channel !== 'tg') { if ((await kvGet(env, 'sn:' + uid)) === dayStr()) sent = { ok: false, reason: 'limit' }; else { await kvPut(env, 'sn:' + uid, dayStr());
          const R = await buildReport(env, uid); sent = await sendMail(env, email, R.subject, R.html.replace(/\{\{BASE\}\}/g, u.origin)); if (sent.ok) await env.DB.prepare('UPDATE parent SET last_sent=? WHERE uid=?').bind(dayStr(), uid).run() } }
        const tgl = 'https://t.me/' + BOT(env) + '?start=p_' + token; const tgc = o.channel === 'tg' ? await env.DB.prepare('SELECT tg_chat FROM parent WHERE uid=?').bind(uid).first() : null;
        return json(req, { ok: true, sent, tg_link: tgl, tg_ok: !!(tgc && tgc.tg_chat) });
      }
      /* превью письма: /preview?u=<id>&f=1|2|3|7 */
      /* CODE-02: свой отчёт — по токену чтения v; без токена — пример на обезличенных данных */
      if (path === '/preview') { const w = await who(env, u.searchParams.get('v') || u.searchParams.get('t'), 'av'); const f = +u.searchParams.get('f') || 0;
        const R = w.uid ? await buildReport(env, w.uid, { freq: f, preview: true }) : demoReport(f); return html(R.html.replace(/\{\{BASE\}\}/g, u.origin)) }
      if (path === '/modunsub') { const uid = +u.searchParams.get('u'), sg = String(u.searchParams.get('s') || ''); let ok = false;
        if (okUid(uid) && sg.length === 24 && same(sg, (await hmacHex(env, 'mo|' + uid)).slice(0, 24))) { await env.DB.prepare("INSERT OR REPLACE INTO mail_off (uid, kind, at) VALUES (?, 'mod', ?)").bind(uid, new Date().toISOString()).run(); await logIt(env, 'modunsub', uid, ''); ok = true }
        return html(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OduvanovSchool</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#000106;font-family:'Inter Tight',Inter,-apple-system,Arial,sans-serif;color:#fff;text-align:center;padding:24px;box-sizing:border-box"><div style="max-width:420px;background:#141414;border:1px solid #262626;border-radius:28px;padding:32px 28px"><div style="font-size:24px;font-weight:600;line-height:1.25">${ok ? 'Готово, письма о модулях больше не придут' : 'Ссылка устарела'}</div><p style="color:#bdbdc4;font-size:15px;line-height:1.5;margin:12px 0 0">${ok ? 'Об открытии модулей по-прежнему напомнит бот и приложение школы.' : 'Напиши в <a href="' + CARE + '" style="color:#d77fff">Службу заботы</a> — отпишем вручную.'}</p></div></body>`) }
      /* предпросмотр письма о модуле: ?m=<id модуля> (без личных данных, имя — пример) */
      if (path === '/modmail/preview') { const D = await loadData(env), id = +u.searchParams.get('m'); const m = (D.modules || []).find(x => +x.id === id) || (D.modules || []).filter(x => !x.amazon && x.at).slice(-1)[0];
        if (!m) return html('нет модулей', 404); return html(modMailHtml(modInfo(D, m, Date.parse(m.at) + 3600e3), 'Анастасия', '#')) }
      if (path === '/unsub') {
        const t = u.searchParams.get('t') || ''; const p = t && await env.DB.prepare('SELECT uid, student FROM parent WHERE token=?').bind(t).first();
        if (p) { await env.DB.prepare('UPDATE parent SET active=0, updated=? WHERE uid=?').bind(new Date().toISOString(), p.uid).run(); await logIt(env, 'unsub', p.uid, '') }
        return html(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f1f7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#141220;text-align:center;padding:24px"><div><div style="font-size:22px;font-weight:600">${p ? 'Вы отписались от отчётов' : 'Ссылка устарела'}</div><p style="color:#6b6780;max-width:380px;line-height:1.5">${p ? 'Отчёты больше не будут приходить. Если это ошибка — ' + esc(p.student || 'ученик') + ' может снова подключить их в своём профиле.' : 'Если нужна помощь — напишите в службу заботы.'}</p><a href="${CARE}" style="color:#8b45e6">Служба заботы</a></div></body>`);
      }
      /* 29.10: ключ «Статистики» без ввода — тем, у кого в GetCourse есть право «Может видеть статистику» и нет запрета на список заказов (список statUids присылает сборщик рейтинга) */
      if (path === '/fin/staff' && req.method === 'POST') { if (!same(u.searchParams.get('k'), await ratingKey(env)) && !(await ghOk(env, req))) return json(req, { ok: false }, 403); await ensure(env);
        let o; try { o = JSON.parse(await req.text() || '{}') } catch (e) { return json(req, { ok: false, err: 'json' }, 400) } const ids = (Array.isArray(o.uids) ? o.uids : []).map(Number).filter(okUid);
        await kvPut(env, 'statUids', ids); const sx = (Array.isArray(o.staff) ? o.staff : []).map(Number).filter(okUid); if (sx.length) { await kvPut(env, 'gcStaff', sx); GC_STAFF = null } await logIt(env, 'stat-staff', 0, ids.join(',') + (sx.length ? ' | staff ' + sx.length : '')); return json(req, { ok: true, n: ids.length }) }
      if (path === '/fin/names' && req.method === 'POST') { if (!(await ghOk(env, req))) return json(req, { ok: false }, 403); await ensure(env); return json(req, await syncNames(env, budget(40), true)) }
      if (path === '/fin/k') { await ensure(env); const uid = await authUid(env, u.searchParams.get('t'), 'a'); if (!uid) { const cu = +u.searchParams.get('u') || 0; await logIt(env, 'fin-k-noauth', okUid(cu) ? cu : 0, (u.searchParams.get('t') ? 'bad-token' : 'no-token') + ' ' + bStr(u.searchParams.get('d'), 120)); return deny(req) }
        /* 29.10: кураторам статистика школы и продажи закрыты на сервере, даже если в GetCourse у них есть право «статистика» */
        const cur = CURATORS.some(c => c.uid === uid) || !!(await env.DB.prepare('SELECT s.uid FROM student s JOIN cur_tg c ON c.tg_id=s.tg_chat WHERE s.uid=?').bind(uid).first());
        const STAT_ALLOW = [499762163, 507696386]; /* 30.10 (Роман): Сергей Тертерян, Вика Копцева — статистика всегда, не дожидаясь выгрузки прав */
        const ok = String(env.ADMIN_UIDS || '499631257').split(/[\s,]+/).includes(String(uid)) || (!cur && (STAT_ALLOW.includes(uid) || ((await kvGet(env, 'statUids')) || []).map(Number).includes(uid)));
        if (!ok) await logIt(env, 'fin-k-deny', uid, cur ? 'curator' : 'no-right');
        return ok ? json(req, { ok: true, k: await statKey(env) }) : json(req, { ok: false }, 403) }
      if (path === '/fin') { if (u.searchParams.get('k') !== await statKey(env)) return json(req, { ok: false }, 403); await ensure(env); const g = n => (u.searchParams.get(n) || '').match(/^\d{4}-\d{2}-\d{2}$/) ? u.searchParams.get(n) : null; return json(req, await finData(env, g('from'), g('to'), g('pfrom'), g('pto'))) }
      if (path === '/fin/plan' && req.method === 'POST') { if (u.searchParams.get('k') !== await statKey(env)) return json(req, { ok: false }, 403); await ensure(env); const o = JSON.parse(await req.text() || '{}');
        if (!/^\d{4}-\d{2}$/.test(o.month || '')) return json(req, { ok: false }, 400); const v = { min: +o.min || 0, opt: +o.opt || 0, ideal: +o.ideal || 0 };
        await env.DB.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)').bind('plan:' + o.month, JSON.stringify(v)).run(); return json(req, { ok: true, plan: v }) }
      if (path === '/fin/sync' && u.searchParams.get('k') === env.ADMIN_KEY) { const t = dayStr(); return json(req, await syncPay(env, u.searchParams.get('from') || addDays(t, -45), u.searchParams.get('to') || t)) }
      /* CODE-20: синк идёт в фоне; ответ — максимум через 20 с (не держим запрос на всё время экспорта) */
      if (path === '/fin/refresh') { if (u.searchParams.get('k') !== await statKey(env)) return json(req, { ok: false }, 403);
        const p = syncSoon(env, 60); ctx.waitUntil(p); const r = await Promise.race([p, sleep(20000).then(() => 'wait')]);
        return json(req, { ok: true, ran: !!(r && r !== 'wait' && r.n != null), pending: !!(await kvGet(env, 'exp:pay')), synced: await kvGet(env, 'pay_synced') }) }
      if (path === '/fin/old') { if (u.searchParams.get('k') !== await statKey(env)) return json(req, { ok: false }, 403); await ensure(env); const g = n => (u.searchParams.get(n) || '').match(/^\d{4}-\d{2}-\d{2}$/) ? u.searchParams.get(n) : null, a = g('from'), b = g('to'); if (!a || !b) return json(req, { ok: false }, 400);
        const r = await env.DB.prepare("SELECT COUNT(*) n, SUM(cost) s, COUNT(DISTINCT CASE WHEN eh<>'' THEN eh END) b FROM odeal WHERE day>=? AND day<=?").bind(a, b).first(); const st = await env.DB.prepare("SELECT v FROM kv WHERE k='old_import'").first();
        return json(req, { ok: true, n: r.n || 0, sum: r.s || 0, buyers: r.b || 0, import: st ? JSON.parse(st.v) : null }) }
      if (path === '/fin/old/sync' && u.searchParams.get('k') === env.ADMIN_KEY) return json(req, await syncOld(env));
      if (path === '/fin/key' && u.searchParams.get('k') === env.ADMIN_KEY) return json(req, { link: SITE + '/pl/sales/dealstat#fsk=' + await statKey(env) });
      if (path === '/admin/log' && u.searchParams.get('k') === env.ADMIN_KEY) { const r = await env.DB.prepare('SELECT * FROM log ORDER BY at DESC LIMIT 200').all(); return json(req, r.results) }
      if (path === '/admin/run' && u.searchParams.get('k') === env.ADMIN_KEY) { const res = await runHourly(env, true); return json(req, res) }
      /* Telegram: вебхук и настройка */
      if (path === '/tg/hook' && req.method === 'POST') { if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== await tgSecret(env)) return new Response('no', { status: 403 });
        const up = await req.json(); ctx.waitUntil(tgUpdate(env, up).catch(e => logIt(env, 'tg-ex', 0, String(e && e.message || e)))); return new Response('ok') }
      if (path === '/tg/setup' && u.searchParams.get('k') === env.ADMIN_KEY) { await ensure(env); const base = env.BASE_URL || u.origin;
        const a = await tg(env, 'setWebhook', { url: base + '/tg/hook', secret_token: await tgSecret(env), allowed_updates: ['message', 'callback_query', 'business_connection', 'business_message', 'edited_business_message', 'deleted_business_messages'], drop_pending_updates: true });
        const b = await tg(env, 'setMyCommands', { commands: [{ command: 'report', description: 'Прислать отчёт сейчас' }, { command: 'stop', description: 'Отключить уведомления' }] });
        const c = await tg(env, 'setMyDescription', { description: 'OduvanovSchool — вся учёба в одном боте 💜\n\n🔔 Напомню об эфирах и открытии модулей, чтобы ты не пропустил ×2 баллы\n✅ Сообщу, когда куратор ответил или проверил домашку\n🧠 AI-помощник ответит по курсу 24/7: что смотреть, когда дедлайн, как сдать работу\n📱 Кабинет, расписание и рейтинг потока — прямо в Telegram\n🏆 Новые места в рейтинге и достижения — сразу, как получишь\n👨‍👩‍👦 Отчёты об учёбе для тебя или родителей\n\nЖми «Старт» — и ни один балл не пройдёт мимо.' });
        const d = await tg(env, 'setMyShortDescription', { short_description: 'Эфиры, ×2 баллы, AI-помощник 24/7 и кабинет школы — всё в Telegram. Ни один балл мимо.' });
        return json(req, { webhook: a.ok, commands: b.ok, descr: c.ok && d.ok, err: a.description, admin_link: 'https://t.me/' + BOT(env) + '?start=adm_' + await admKey(env), pay_url: base + '/pay?k=' + await payKey(env) }) }
      /* ученик: Telegram и куратор */
      /* страница ученика «Мой куратор» (eco.js): куратор, когда на связи, как быстро отвечает, его сообщения всем ученикам. Авторизация как у /me */
      if (path === '/cur/page' && req.method === 'GET') { const uid = +u.searchParams.get('u'); if (!okUid(uid)) return json(req, { ok: false }, 400);
        const w = await who(env, u.searchParams.get('t'), 'av'); if (w.bad || (w.uid && w.uid !== uid)) return deny(req);
        if (!w.uid) w.uid = await softUid(env, w, uid);
        const s = await env.DB.prepare('SELECT curator, tg_chat, tg_token FROM student WHERE uid=?').bind(uid).first();
        const c = s && s.curator && CURATORS.find(x => x.id === s.curator);
        if (!c) return json(req, { ok: true, auth: !!w.uid, cur: null, curators: CURATORS.map(curPub) });
        const h = await curHours(env, c.id), hr = msk().getUTCHours(), st = (await curStats(env, 14)).curators.find(x => x.id === c.id) || {};
        const log = (await kvGet(env, 'bclog:' + c.id)) || [];
        const out = { ok: true, auth: !!w.uid, cur: Object.assign(curPub(c), { tg: await curTg(env, c.id), hours: h }), online: curOn(h, await curDays(env, c.id)), median: st.median == null ? null : st.median, in2h: st.in2h == null ? null : st.in2h, answered: st.answered || 0 };
        if (w.uid) { out.feed = log.filter(x => x.all !== false).slice(0, 10).map(x => ({ at: x.at, who: x.who, text: x.text, btn: x.btn || null, link: x.link || null })); out.tg_ok = !!(s && s.tg_chat) }
        return json(req, out) }
      if (path === '/me' && req.method === 'GET') { const uid = +u.searchParams.get('u'); if (!okUid(uid)) return json(req, { ok: false }, 400);
        /* CODE-03, PROF-34: ссылка привязки Telegram и запись в базу — только по токену. Без токена: кураторы и уже выбранный куратор, tg_ok:true — старые клиенты не показывают плашку */
        const w = await who(env, u.searchParams.get('t'), 'a'); if (w.bad || (w.uid && w.uid !== uid)) return deny(req);
        if (!w.uid) w.uid = await softUid(env, w, uid);
        if (!w.uid) { const s = await env.DB.prepare('SELECT curator FROM student WHERE uid=?').bind(uid).first(); const c0 = s && s.curator && CURATORS.find(x => x.id === s.curator);
          return json(req, { ok: true, auth: false, tg_ok: true, cur: c0 ? curPub(c0) : null, curators: CURATORS.map(curPub) }) }
        const r = await studentRow(env, uid); return json(req, { ok: true, auth: true, tg_ok: !!r.tg_chat, tg_link: 'https://t.me/' + BOT(env) + '?start=s_' + r.tg_token, cur: r.curator ? Object.assign(curPub(CURATORS.find(c => c.id === r.curator)) || {}, { tg: await curTg(env, r.curator), hours: await curHours(env, r.curator) }) : null, curators: CURATORS.map(curPub) }) }
      if (path === '/cur' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
        const w = await who(env, o.t, 'a'); if (!w.uid && !w.bad) w.uid = await softUid(env, w, +o.u); if (!w.uid || (o.u && +o.u !== w.uid)) return deny(req);
        const uid = w.uid, c = CURATORS.find(x => x.id === o.c); if (!c) return json(req, { ok: false }, 400);
        const r = await studentRow(env, uid); if (r.curator) return json(req, { ok: false, err: 'already', cur: curPub(CURATORS.find(x => x.id === r.curator)) });
        await env.DB.prepare('UPDATE student SET curator=?, cur_at=?, name=COALESCE(?, name) WHERE uid=?').bind(c.id, new Date().toISOString(), String(o.name || '').slice(0, 80) || null, uid).run();
        await logIt(env, 'curator', uid, c.id); return json(req, { ok: true, cur: curPub(c) }) }
      /* кураторы в Telegram: ссылки-приглашения, статистика ответов */
      if (path === '/cur/links' && u.searchParams.get('k') === env.ADMIN_KEY) { await ensure(env); const out = [];
        for (const c of CURATORS) { const ct = await env.DB.prepare('SELECT username, enabled FROM cur_tg WHERE cid=?').bind(c.id).first(); out.push({ id: c.id, full: c.full, link: 'https://t.me/' + BOT(env) + '?start=cur_' + await curKey(env, c.id), tg: ct && ct.username, connected: !!(ct && ct.enabled) }) }
        return json(req, out) }
      if (path === '/cur/stats') { if (u.searchParams.get('k') !== await statKey(env)) return json(req, { ok: false }, 403); await ensure(env); return json(req, await curStats(env, Math.min(90, Math.max(1, +u.searchParams.get('days') || 14)))) }
      if (path === '/cur/hours' && req.method === 'POST') { if (u.searchParams.get('k') !== await statKey(env)) return json(req, { ok: false }, 403); const o = JSON.parse(await req.text() || '{}');
        if (!CURATORS.find(c => c.id === o.c) || !(o.from >= 0 && o.to <= 24 && o.from < o.to)) return json(req, { ok: false }, 400);
        await env.DB.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)').bind('hours:' + o.c, JSON.stringify([o.from | 0, o.to | 0])).run(); return json(req, { ok: true }) }
      /* оплаты из GetCourse */
      if (path === '/pay' && u.searchParams.get('k') === await payKey(env)) { const f = Object.fromEntries(u.searchParams);
        if (req.method === 'POST') { const ct = req.headers.get('Content-Type') || ''; try { Object.assign(f, ct.includes('json') ? await req.json() : Object.fromEntries(await req.formData())) } catch (e) {} }
        const n = await payNotify(env, f); ctx.waitUntil(syncSoon(env)); return json(req, { ok: true, sent: n }) }
      if (path === '/card') { const t = u.searchParams.get('t') || ''; const p = t && await env.DB.prepare('SELECT * FROM parent WHERE token=?').bind(t).first(); if (!p) return html('', 404);
        const R = await buildReport(env, p.uid, { p }); return html(renderCard(R.D)) }
      /* полный отчёт по ссылке из Telegram */
      if (path === '/r') { const t = u.searchParams.get('t') || ''; const p = t && await env.DB.prepare('SELECT * FROM parent WHERE token=?').bind(t).first(); if (!p) return html('<!doctype html><meta charset="utf-8">Ссылка устарела', 404);
        const R = await buildReport(env, p.uid, { p }); return html(R.html.replace(/\{\{BASE\}\}/g, u.origin)) }
      if (path === '/') return json(req, { ok: true, service: 'oduvanovschool-api', day: dayStr() });
      return json(req, { ok: false, err: 'not found' }, 404);
    } catch (e) { return json(req, { ok: false, err: String(e && e.message || e) }, 500) }
  },
  async scheduled(ev, env, ctx) { ctx.waitUntil(cronRun(env, ev && ev.cron)) }
};

/* ---------- cron (CODE-05): у каждого запуска свой лимит ~50 внешних запросов ----------
   В Cloudflare → oduvanov-api → Settings → Triggers → Cron: «5 * * * *» — снимок рейтинга и отчёты родителям, «25 * * * *» — платежи GetCourse,
   «45 * * * *» — кураторы, досылка экспорта платежей и отчётов. Если оставить одно расписание — все задачи по очереди с общим бюджетом.
   Задачи идут последовательно, ошибка одной пишется в лог (cron-<задача>-err) и не мешает остальным.
   Старый аккаунт школы из cron убран: данные уже загружены, повторная загрузка — вручную /fin/old/sync?k=ADMIN_KEY. */
const CRON_JOBS = { '5 * * * *': ['efir', 'report', 'care', 'names', 'modmail', 'rev', 'efkin'], '25 * * * *': ['efir', 'pay', 'names'], '45 * * * *': ['efir', 'cur', 'bank', 'care', 'insights', 'pay', 'report'] }; /* 30.10: efir — напоминания об эфирах в каждом запуске (за сутки, за час, при старте) */
async function cronRun(env, cron) {
  const B = budget(45), jobs = CRON_JOBS[cron] || ['efir', 'report', 'cur', 'bank', 'care', 'insights', 'pay'], out = {};
  try { await ensure(env) } catch (e) { try { await logIt(env, 'cron-err', 0, 'ensure ' + (e && e.message || e)) } catch (x) {} }
  for (const j of jobs) { try { out[j] = await (j === 'report' ? runHourly(env, false, B) : j === 'pay' ? syncPayAuto(env, B) : j === 'names' ? syncNames(env, B) : j === 'modmail' ? modMailJob(env, B) : j === 'rev' ? revJob(env, B) : j === 'care' ? careTick(env, B) : j === 'insights' ? insightsJob(env, B) : j === 'bank' ? bankJob(env, B) : j === 'efir' ? efirJob(env, B) : j === 'efkin' ? kinRecJob(env, B) : curJob(env, B)) }
    catch (e) { out[j] = { err: String(e && e.message || e) }; try { await logIt(env, 'cron-' + j + '-err', 0, out[j].err) } catch (x) {} } }
  if (B.n >= B.max - 3) try { await logIt(env, 'cron-budget', 0, (cron || '?') + ' · ' + B.n + ' запросов') } catch (x) {}
  return out }
async function curJob(env, B) { if (!B.ok(2)) return { skip: 'budget' }; B.use(2); await ensureBizHook(env); return curRemind(env, B) }

/* каждый час: снимок рейтинга (раз в сутки — сохраняется последний за день) и рассылка отчётов, у которых подошёл срок */
/* отчёты родителям (CODE-05): не только в точный час — «пришло время» = час настал (или отправку пропустили — тогда с 8:00);
   сначала те, кто ждёт дольше; пачка ограничена бюджетом запуска, остальные уйдут в следующий запуск; не больше 3 попыток в сутки на родителя */
async function runHourly(env, force, B = budget(45)) {
  const D = await loadData(env); await snapshot(env, D);
  const hour = msk().getUTCHours(), today = dayStr(); const out = { hour, sent: [], skipped: 0, left: 0, until: until(env) };
  if (today > until(env)) { out.ended = true; return out }
  const ps = (await env.DB.prepare("SELECT * FROM parent WHERE active=1 AND (channel='email' OR (channel='tg' AND tg_chat IS NOT NULL)) ORDER BY COALESCE(last_sent, '') ASC").all()).results || [];
  for (const p of ps) {
    const age = p.last_sent ? Math.round((new Date(today) - new Date(p.last_sent)) / 864e5) : 99, due = age >= p.freq, late = age > p.freq;
    if (!due || (!force && !(hour >= p.hour || (late && hour >= 8)))) { out.skipped++; continue }
    const tk = 'ptry:' + p.uid, tr = await kvGet(env, tk); if (!force && tr && tr.d === today && tr.n >= 3) { out.skipped++; continue }
    const need = p.channel === 'tg' ? 3 : 1; if (!B.ok(need)) { out.left++; continue } B.use(need);
    let res = { ok: false };
    try { if (p.channel === 'tg') { const j = await tgSendReport(env, p, D); res = { ok: !!(j && j.ok) } } else {
      const R = await buildReport(env, p.uid, { D, p }); res = await sendMail(env, p.email, R.subject, R.html.replace(/\{\{BASE\}\}/g, env.BASE_URL || '')) } }
    catch (e) { await logIt(env, 'report-err', p.uid, String(e && e.message || e)) }
    if (res.ok) await env.DB.prepare('UPDATE parent SET last_sent=? WHERE uid=?').bind(today, p.uid).run();
    else await kvPut(env, tk, JSON.stringify({ d: today, n: (tr && tr.d === today ? tr.n : 0) + 1 }));
    out.sent.push([p.uid, res.ok]);
  }
  if (out.left) await logIt(env, 'report-left', 0, out.left + ' отчётов уйдут в следующий запуск');
  return out;
}

/* ---------- Нейро-Одуванов: ИИ-помощник (Claude Haiku 5.5) ----------
   Тест в боте: только для чатов из tg_admin.
   /neuro — включить/выключить, /neuro <id ученика> — отвечать как этому ученику, /neuro new — новый диалог.
   Секрет: ANTHROPIC_API_KEY. Модель: AI_MODEL (по умолчанию claude-haiku-5-5). */
const AI_MODEL = env => (env && env.AI_MODEL) || 'claude-haiku-5-5';
const AI_PRICE = { in: 0.10, out: 0.50, rub: 85 }; /* $ за 1 млн токенов, курс для подсказки */
const RANKS = [[0, 'Новичок'], [150, 'Джуниор'], [500, 'Фрилансер'], [1000, 'Арт-директор'], [1700, 'Владелец студии'], [2500, 'Дизайнер-миллионер']];
const AI_PAGES = [
  ['Мои покупки — доступы, сроки, тариф, бонусный счёт', SITE + '/sales/control/userProduct/my'],
  ['Все тренинги', SITE + '/teach/control/stream'],
  ['Курс «AI-креатор 2.0» — модули и уроки, своё место в рейтинге', SITE + '/teach/control/stream/view/id/935917158'],
  ['Рейтинг потока — места, баллы, звания', SITE + '/teach/control/stream/view/id/935952152'],
  ['Расписание — когда открываются модули', SITE + '/teach/control/schedule'],
  ['Настройки уведомлений', SITE + '/pl/notifications/settings/my'],
  ['Забота о студентах (оплата, доступы, технические проблемы)', CARE]
];
/* как исправить уровень/ответ ДЗ — уточняется по разбору GetCourse (агент «Домашки», ночь 27.10) */
const AI_HW_FIX = `пока работа «На проверке», ученик правит её сам:
  1) открыть урок с домашкой (на сайте или в мини-приложении) и пролистать вниз до блока «Твоя работа»;
  2) нажать «Изменить работу или уровень» (под пометками «На проверке» и уровня) — откроется страница редактирования ответа;
  3) снять лишние галочки и оставить ОДНУ — нужный уровень (баллы считаются по самому высокому отмеченному: 20 / 40 / 70);
  4) при необходимости заменить текст или добавить файлы кнопкой «Добавить файлы»; удалить уже прикреплённый файл ученик сам не может (ограничение GetCourse) — тогда написать куратору, какой файл не учитывать;
  5) нажать «Отправить ответ», затем «Вернуться к просмотру».
  Отправить второй ответ поверх первого нельзя — только редактировать. Если работа уже «Принято», уровень меняет только куратор (или Забота). Правка позже 72 ч от открытия модуля может снять x2: рейтинг берёт время последнего изменения ответа — предупреди об этом. В приложении GetCourse (не наше мини-приложение) ссылка называется «Редактировать ответ».`;
/* Системная инструкция Нейро. Ночь 27.10: типы вопросов (платформа → шаги, факт → цифра, учёба → 3 части, сомнения → факты школы),
   знание платформы, контекст ученика только по делу. Факты школы — инструмент school_facts (данные отчёта обратной связи, обновляются сами). */
function aiSystem() {
  return `Ты — Нейро-Одуванов, ИИ-помощник внутри платформы онлайн-школы OduvanovSchool Романа Одуванова (AI-дизайн карточек для маркетплейсов, курс «AI-креатор 2.0»). Ты встроен в кабинет и мини-приложение школы и знаешь, как они устроены. Цель — решить вопрос ученика за 5 секунд самому. К куратору или в Заботу отправляй, только когда без человека не решить.

Тон: по-русски, на «ты», как опытный куратор школы: коротко, тепло, уверенно, по делу. Без канцелярита, без «к сожалению, я не могу», без восклицательных знаков подряд. Максимум одно эмодзи. Жирный — через **текст**, без заголовков и таблиц. Шаги — нумерованным списком.

Сначала определи тип вопроса и отвечай по его правилу:
А. «Как сделать» на платформе (урок, домашка, уровень, файлы, доступ, расписание, рейтинг, банк, куратор, Telegram) → готовое решение: 2–5 шагов, куда нажать, по разделу «Как устроена платформа». Потом одна строка: когда и зачем писать куратору или в Заботу и что именно написать (только если шаги могут не сработать). Без советов по учёбе и без встречных вопросов. 40–120 слов.
Б. Простой факт или «где найти» (когда модуль, где расписание, сколько баллов, моё место, сколько в банке, когда кончится доступ) → 1–3 предложения с точной цифрой, датой или ссылкой. Без лишнего.
В. Учёба и работа (клиенты, цены, портфолио, нейросети, дизайн, промпты) → три части: 1) чёткий ответ и где это в курсе (модуль и когда откроется — из course_plan); 2) 2–4 практических совета, которые можно применить сейчас (для закрытого модуля — общие советы, не пересказ материалов); 3) 1–2 вопроса, чтобы помочь точнее, и одна человеческая фраза поддержки. 80–180 слов.
Г. Доверие и качество («это скам?», «стоит ли школа денег», «есть отзывы?», «а вам можно верить») → вызови school_facts. Ты часть школы: говори уверенно и честно, опираясь на цифры (государственная лицензия на образовательную деятельность со ссылкой на реестр Рособрнадзора, средняя оценка уроков, сколько оценок и анкет, сколько учеников ставят 9–10, страница отзывов, знак качества GetCourse со ссылкой). Никогда не советуй «проверять признаки мошенничества» и не говори, что не можешь проверить школу. Одна фраза, что понимаешь сомнение, потом факты, потом следующий шаг.
Д. Трудности и деньги («верните деньги», «не успеваю», «ничего не понимаю», «хочу бросить») → без цифр школы и без уговоров: одна фраза сочувствия, затем реальный путь. Возврат, рассрочка, продление — в Заботу о студентах (что написать: почта покупки и что случилось); условия и сроки не придумывай. «Не успеваю» — открытые уроки доступны до конца доступа, x2 — бонус за скорость, а не дедлайн; предложи маленький план (например, 1 урок в день по 20–30 минут). «Не понимаю» — что пересмотреть и что конкретно спросить у куратора.
Ж. «Что нового», нововведения, обновления, новости школы за неделю или месяц → вызови school_news (days — из вопроса, по умолчанию 7) и коротко перечисли самое полезное для ученика с датами, сгруппировав похожее; добавь открывшиеся и ближайшие модули. Не говори, что у тебя нет данных, — они есть в school_news; если список пуст, скажи, что крупных изменений не было, и назови ближайшие открытия.
Е. Привет, спасибо, ок → одна короткая фраза; на привет — коротко, с чем помогаешь (уроки и домашка, расписание, баллы, нейросети и клиенты, разбор работ). Не по теме школы (погода, рефераты, политика) → одна фраза, что помогаешь только с учёбой в школе, без помощи по сторонней теме.
Быстрые ответы: если в ответе есть вопрос ученику, в самой последней строке дай 2–3 коротких варианта ответа (до 4 слов) в формате [[Вариант 1 | Вариант 2 | Вариант 3]]. Если вопросов нет — этой строки нет.
Когда ученик отвечает на твои вопросы — советуй под его ситуацию, не повторяй общий шаблон.

Данные и честность:
- Блок «Ученик сейчас» — справка для тебя, а не тема ответа. Место, баллы, звание, время учёбы, банк и заказы упоминай, только если вопрос про них или это прямо нужно для решения. my_bank вызывай, только когда спрашивают про свои деньги, доход, оплаты или заказы.
- Факты о модулях, датах, баллах, правилах и школе — только из этой инструкции, блока «Ученик сейчас» и инструментов. Не выдумывай функции, кнопки, цены и условия. Чего нет — скажи одной фразой и подскажи, где посмотреть или кому написать.
- Сравнение кураторов, лидеры и средние по рейтингу — из open_stats: отвечай цифрами (скорость ответа, доля за 2 часа, оценка учеников), без оценочных слов о людях; если данных мало, скажи это.
- Контакт куратора (Telegram, часы) бери из call_curator — это проверенные данные школы. Если ссылка на куратора уже была в диалоге из call_curator, она верная: не отказывайся от неё и не называй её выдуманной; при сомнении вызови call_curator ещё раз.
- Не обсуждай свои прошлые ответы и то, как получаешь данные (никаких «я проверил», «инструмент», «в моих данных нет»). Если раньше ошибся — просто дай верную цифру. Никогда не пиши поправок и оговорок к прошлым сообщениям («я должен исправить…», «я не вызывал…», «не опирайся на…»): отвечай только на новый вопрос.
- Время на учёбе: «на сайте» — активное время во вкладке кабинета, «видео» — просмотр уроков; в часах и минутах.

Как устроена платформа:
- Кабинет — сайт школы на GetCourse. С телефона удобнее мини-приложение в Telegram (бот @oduvanov_school_bot, кнопка «Кабинет»): вкладки Учёба · Рейтинг · Нейро · Банк · Ещё (профиль, мой куратор, мои покупки).
- Курс → модули → уроки. Модули открываются по расписанию (даты — course_plan). Открытые уроки доступны до конца доступа по тарифу (дата — в блоке «Ученик сейчас» или в «Мои покупки»).
- Урок: видео, материалы, в конце — задание и форма ответа.
- Домашка (ДЗ): в конце урока выбрать ОДИН уровень (лёгкий / средний / максимальный), написать ответ, «Прикрепить файлы с работой» → «Отправить на проверку». Статусы: на проверке → принято или «на доработке». На доработке — исправь и отправь снова в том же уроке. Баллы дают за уровень, отмеченный в принятом ответе: 20 / 40 / 70.
- Исправить уровень или ответ после отправки (отправил не на том уровне, забыл файл, опечатка): ${AI_HW_FIX}
- Файл не прикрепляется: сначала обнови страницу урока и нажми «Прикрепить файлы с работой» ещё раз (кнопку ночью 27.10 починили); проверь интернет и размер файла, сожми картинку или отправь ссылку на Google Диск / Яндекс Диск / Figma в тексте ответа; попробуй с компьютера через сайт. Не помогло — в Заботу со скриншотом ошибки.
- Урок не открывается или «нет доступа»: модуль ещё не открылся по расписанию (проверь дату), или закончился доступ по тарифу. Если по датам всё должно быть открыто — в Заботу: название урока и скриншот.
- Баллы рейтинга: урок 10, анкета после модуля 15, ДЗ 20 / 40 / 70. x2: уроки и анкеты — 48 ч от открытия модуля, ДЗ — 72 ч. Звания: Новичок 0 · Джуниор 150 · Фрилансер 500 · Арт-директор 1000 · Владелец студии 1700 · Дизайнер-миллионер 2500 и 80% заданий в срок. 1 балл = 1 ₽ бонусного счёта (виден в «Мои покупки»). В топ рейтинга: проходить уроки и сдавать ДЗ в окно x2, ДЗ — на максимальном уровне, заполнять анкеты после модулей.
- Куратор — личный, выбирается в профиле (если ещё не выбран). Сменить уже выбранного куратора — через Заботу о студентах. Проверяет ДЗ, отвечает на вопросы по работам, решает спорные баллы и уровни. Пишет в Telegram в свои рабочие часы (в блоке «Ученик сейчас»), обычно отвечает за 1–2 часа. Написать: вкладка «Ещё» → «Мой куратор». Когда нужен человек — вызови call_curator, и под ответом появится кнопка «Написать». Сам ты куратору ничего не отправляешь: не пиши «я передал куратору» — пиши, что и как ему написать.
- Забота о студентах ${CARE}: оплата, рассрочка, возврат, продление и повышение тарифа, доступы, вход в кабинет, технические сбои платформы.
- Банк (вкладка «Банк») — личный учёт дохода и заказов: «Новая оплата», «+ Новый заказ», статусы и дедлайны. Клиентов и ТЗ видит только сам ученик.
- Telegram к кабинету: профиль в кабинете → «Подключить Telegram»; уведомления — страница настроек уведомлений.
- Нейро: до 40 вопросов и 5 разборов картинок в день; картинку на разбор — через скрепку.

Страницы (ссылку давай полным адресом отдельной строкой, она откроется внутри приложения):
${AI_PAGES.map(p => '- ' + p[0] + ': ' + p[1]).join('\n')}
- Банк, заказы, профиль, мой куратор, мои покупки — вкладки «Банк» и «Ещё» в приложении (ссылку не давай).

Разбор работы (когда прислали картинку):
1. Если непонятно, что это и для чего (маркетплейс, товар, главный слайд или инфографика), сначала задай 1–2 коротких уточняющих вопроса с вариантами ответа и не разбирай.
2. Иначе: оценка X/10 одной строкой; «Сильное» — 2–3 пункта; «Что улучшить» — 3–4 пункта, каждый: что не так → как сделать. Смотри на: читаемость заголовка с телефона (миниатюра), иерархию, один главный посыл, контраст, качество и единый стиль ИИ-генерации, свет и тени товара, выравнивание и поля, количество текста, требования площадки.
3. На позитиве, без воды. В конце одна фраза: что сделать первым.`;
}
const AI_TOOLS = [
  { name: 'my_bank', description: 'Банк ученика: доход по валютам и ≈ в рублях, оплаты за месяц, заказы по статусам, ближайшие дедлайны. Вызывай ТОЛЬКО когда ученик спрашивает про свои деньги, доход, оплаты или заказы.', input_schema: { type: 'object', properties: {} } },
  { name: 'school_facts', description: 'Факты о школе: государственная лицензия на образовательную деятельность (номер, ссылка на реестр Рособрнадзора), а также из анкет и оценок учеников: средняя оценка уроков, число оценок, анкет и отзывов, доля 9–10, потоки, свежие отзывы, страница отзывов, знак качества GetCourse, учеников в потоке. Для вопросов о доверии, качестве, отзывах, «это скам?», «стоит ли», возврате и сомнениях.', input_schema: { type: 'object', properties: {} } },
  { name: 'school_news', description: 'Что нового в школе за последние N дней: нововведения платформы и мини-приложения, новые функции, открывшиеся и ближайшие модули. Для вопросов «что нового», «нововведения», «обновления», «новости школы», «что изменилось».', input_schema: { type: 'object', properties: { days: { type: 'integer', description: 'за сколько дней, по умолчанию 7' } } } },
  { name: 'course_plan', description: 'Модули курса, даты открытия, ближайшие эфиры и открытия (расписание потока).', input_schema: { type: 'object', properties: {} } },
  { name: 'open_stats', description: 'Открытая ученикам статистика школы (то же, что ученик видит на сайте и в приложении): по каждому куратору — скорость ответа (медиана за 30 дней), доля ответов за 2 часа, сколько ответил, оценка учеников и число оценок, часы и дни работы, на связи ли сейчас; рейтинг потока — топ-10, всего учеников, средние баллы, уроки и домашки. Для вопросов «кто из кураторов лучше/быстрее», «сравни кураторов», «кто лидер рейтинга», «сколько в среднем баллов».', input_schema: { type: 'object', properties: { about: { type: 'string', enum: ['curators', 'rating', 'all'] } } } },
  { name: 'call_curator', description: 'Когда вопрос может решить только человек: возвращает куратора, его контакт и часы, а под ответом ученик увидит кнопку «Написать». Куратору ничего не отправляется.', input_schema: { type: 'object', properties: { summary: { type: 'string', description: 'Коротко суть вопроса для куратора' } }, required: ['summary'] } }
];
/* ---------- факты школы для Нейро (ночь 27.10) ----------
   Источник — опубликованный отчёт обратной связи (GitHub RomanOduvanov/otzyvy, main/index.html, блок <script id="data">), его обновляет движок отчёта ОС.
   Кэш: kv 'schoolfacts' 12 ч (+ память изолята 1 ч). Нет связи — последняя удачная копия, совсем нет — запасные цифры отчёта от 23.10.2026. */
const SCHOOL_SRC = 'https://raw.githubusercontent.com/RomanOduvanov/otzyvy/main/index.html', SCHOOL_PAGE = 'https://romanoduvanov.github.io/otzyvy/';
/* 27.10: новости школы для Нейро («что нового за неделю»). Базовый список ниже + записи Романа (kv 'news', команда боту /news) + открытия модулей из расписания. */
const SCHOOL_NEWS0 = [
  { d: '2026-10-27', t: 'Под каждым ответом Нейро-Одуванова можно поставить 👍 или 👎 — так мы улучшаем подсказки.' },
  { d: '2026-10-27', t: 'В уроке с домашкой появилась кнопка «Изменить работу или уровень»: пока работа на проверке, можно заменить файлы, текст или уровень.' },
  { d: '2026-10-27', t: 'Починили кнопку «Прикрепить файлы с работой» — теперь срабатывает при нажатии в любом месте плашки.' },
  { d: '2026-10-27', t: 'В карточках частей модуля правильно показывается «ДЗ на проверке» и число пройденных уроков.' },
  { d: '2026-10-27', t: 'Анкеты по модулям удобнее заполнять с телефона: шкала 1–10 больше не разваливается.' },
  { d: '2026-10-26', t: 'Мини-приложение школы в Telegram: учёба, полный рейтинг потока, Нейро-Одуванов, банк и всё о курсе — в одном месте, на весь экран.' },
  { d: '2026-10-26', t: '«Мой банк» и «Учёт заказов»: записывай оплаты от клиентов (₽, $ или €, пересчёт в рубли по курсу ЦБ) и веди заказы с дедлайном и временем. Данные клиентов видишь только ты.' },
  { d: '2026-10-26', t: 'Рейтинг потока на телефоне: таблица листается вбок, видно все показатели — звание, уроки, домашки, «в срок ×2».' },
  { d: '2026-10-26', t: 'Иконку школы можно добавить на экран телефона — кнопка в «Ещё».' },
  { d: '2026-10-26', t: 'Появились продление доступа и повышение тарифа (в том числе до «Премиум Амазон») с зачётом уже оплаченного — раздел «Мои покупки».' }
];
async function schoolNews(env, days) { days = Math.max(1, Math.min(60, +days || 7)); const today = dayStr(), from = addDays(today, -(days - 1)), list = [];
  for (const n of SCHOOL_NEWS0.concat(((await kvGet(env, 'news')) || []))) if (n && n.d >= from && n.d <= today && !n.off) list.push({ дата: n.d, что: n.t });
  let opened = [], soon = []; try { const D = await loadData(env), now = Date.now();
    for (const m of (D.modules || [])) { if (!m.at) continue; const d = String(m.at).slice(0, 10); if (d >= from && d <= today) opened.push({ дата: d, модуль: m.name }); else if (Date.parse(m.at) > now && Date.parse(m.at) - now < 14 * 864e5) soon.push({ дата: d, модуль: m.name }) } } catch (e) {}
  list.sort((a, b) => a.дата < b.дата ? 1 : -1);
  return { период: from + ' — ' + today, новое: list, открылись_модули: opened, скоро_откроются: soon };
}
const SCHOOL_LICENSE = { есть: 'лицензия на образовательную деятельность государственного образца', номер: 'Л035-01281-52/02584121', выдана: '03.07.2025, Министерство образования и науки Нижегородской области', срок: 'бессрочная', статус: 'действующая', проверить_в_реестре_Рособрнадзора: 'https://islod.obrnadzor.gov.ru/rlic/details/5421faf0-bf22-fb97-d3bb-32b9df3ad5c2/' };
const SCHOOL_FB0 = { на_дату: '2026-10-23', оценка_уроков: '4,96 из 5', оценок_уроков: 845, на_5_звёзд: '97%', анкет_по_модулям: 727, интерес_к_урокам: '9,35 из 10', польза: '9,29 из 10', применимость: '9,12 из 10', ставят_9_или_10: '83% учеников в анкетах', отзывов_учеников: 833, потоки: ['Закрытый поток (май–сен 2026)', 'Поток 1.0 (июл–сен 2026)', 'Поток 2.0 (с окт 2026)'], знак_качества_GetCourse: 'https://getcourse.ru/qualityreestr~231141b34c82aa95e48810a9d1b33a79', страница_отзывов: SCHOOL_PAGE, запасные_данные: true };
let SF_MEM = null;
const ruNum = (x, d = 2) => x == null ? null : String(Math.round(x * 10 ** d) / 10 ** d).replace('.', ',');
function schoolPack(D, html) { const A = D.all || {}, W = D.week || {}, T = D.tot || {}, M = {}; for (const m of D.mods || []) M[m.id] = m.name;
  const q = (D.comments || []).filter(c => c.score != null && c.scale && c.score >= c.scale && c.t && c.t.length >= 40 && c.t.length <= 240 && !/\?$/.test(c.t)).slice(0, 5).map(c => ({ модуль: M[c.m] || c.m, поток: c.s, дата: c.d, отзыв: c.t }));
  const qr = (String(html).match(/https:\/\/getcourse\.ru\/qualityreestr~[0-9a-f]{16,64}/) || [])[0] || null;
  return { на_дату: D.updated || null, оценка_уроков: ruNum(A.stars) + ' из 5', оценок_уроков: A.n_r, на_5_звёзд: A.five != null ? A.five + '%' : null, анкет_по_модулям: A.n_s, интерес_к_урокам: ruNum(A.interest) + ' из 10', польза: ruNum(A.useful) + ' из 10', применимость: ruNum(A.apply) + ' из 10', ставят_9_или_10: A.nps10 != null ? A.nps10 + '% учеников в анкетах' : null, отзывов_учеников: A.comments,
    за_последнюю_неделю: W.ratings != null ? { оценок: W.ratings, анкет: W.surveys, оценка: ruNum(W.stars), отзывов: W.comments } : null,
    потоки: (D.streams || []).map(s => s.name + ' (' + s.period + ')' + (T[s.id] && T[s.id].stars ? ': оценка уроков ' + ruNum(T[s.id].stars) + ', анкет ' + T[s.id].n_s : '')),
    свежие_отзывы: q, знак_качества_GetCourse: qr, страница_отзывов: SCHOOL_PAGE } }
async function schoolFacts(env) { const now = Date.now(); if (SF_MEM && now - SF_MEM.t < 3600e3) return SF_MEM.v;
  let c = await kvGet(env, 'schoolfacts');
  if (!c || !c.v || now - (c.t || 0) > 12 * 3600e3) { let v = null;
    try { const r = await fetch(env.SCHOOL_SRC || SCHOOL_SRC); if (r.ok) { const h = await r.text(), m = h.match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/); if (m) { const D = JSON.parse(m[1]); if (D && D.all && D.all.n_r) v = schoolPack(D, h) } } } catch (e) {}
    c = v ? { t: now, v } : { t: now - 11 * 3600e3, v: (c && c.v) || SCHOOL_FB0 }; /* не вышло — следующая попытка через час */
    await kvPut(env, 'schoolfacts', c) }
  SF_MEM = { t: now, v: c.v }; return c.v }
const schoolLine = f => 'Школа в цифрах (отчёт обратной связи на ' + f.на_дату + '): средняя оценка уроков ' + f.оценка_уроков + ' по ' + f.оценок_уроков + ' оценкам, ' + f.анкет_по_модулям + ' анкет по модулям, на 9–10 оценивают ' + f.ставят_9_или_10 + ', отзывов учеников — ' + f.отзывов_учеников + '. Страница отзывов: ' + f.страница_отзывов + '. У школы бессрочная лицензия на образовательную деятельность государственного образца № ' + SCHOOL_LICENSE.номер + ' (реестр Рособрнадзора: ' + SCHOOL_LICENSE.проверить_в_реестре_Рособрнадзора + '). Подробнее — school_facts.';
/* строка ученика в рейтинге: с сервера (rows с uid) или по старому h с GitHub */
async function rowFor(D, uid) { if (D.rows.length && D.rows[0].uid != null) return D.rows.find(x => String(x.uid) === String(uid)) || null; const h = await hashUid(uid); return D.rows.find(x => x.h === h) || null }
async function aiFacts(env, uid, ctx) {
  let sl = ''; try { sl = '\n\n' + schoolLine(await schoolFacts(env)) } catch (e) {}
  if (!uid) return 'Ученик не определён (тест без id): личных данных нет.' + sl;
  const D = ctx.D || (ctx.D = await loadData(env)); const r = await rowFor(D, uid);
  const s = await env.DB.prepare('SELECT * FROM student WHERE uid=?').bind(uid).first(); const c = s && CURATORS.find(x => x.id === s.curator);
  const today = dayStr(), all = await timeSum(env, uid, '2000-01-01', today), wk = await timeSum(env, uid, addDays(today, -6), today), td = await timeSum(env, uid, today, today);
  const f0 = await env.DB.prepare('SELECT MIN(day) d FROM time WHERE uid=? AND (site>0 OR video>0)').bind(uid).first();
  const t = o => 'на сайте ' + hrs(o.site) + ', видео ' + hrs(o.video);
  const o = { today, name: (r && r.name) || (s && s.name) || null };
  if (r) { const pts = r.pts | 0; let rank = RANKS[0][1], next = null; for (const [p, n] of RANKS) { if (pts >= p) rank = n; else { next = n + ' — ещё ' + (p - pts) + ' баллов'; break } }
    Object.assign(o, { место: r.place + ' из ' + D.n, баллы: pts, звание: rank, следующее_звание: next, уроков_пройдено: r.lessons + ' из ' + D.total_lessons, дз_сдано: r.hw }) } else o.рейтинг = 'нет в рейтинге потока 2.0';
  o.время_на_учёбе = { всего: t(all), за_7_дней: t(wk), сегодня: t(td), учёт_с: f0 && f0.d || 'нет данных' };
  if (r && r.tar) o.тариф = r.tar; if (r && r.acc) { const ad = new Date(r.acc); if (!isNaN(ad)) o.доступ_до = ad.toISOString().slice(0, 10) }
  if (c) { const h = await curHours(env, c.id), hr = msk().getUTCHours(); o.куратор = c.full + (await curTg(env, c.id) ? ' (на связи в Telegram)' : '') + ', часы работы ' + h[0] + ':00–' + h[1] + ':00 МСК, сейчас ' + (hr >= h[0] && hr < h[1] ? 'рабочее время' : 'нерабочее время — ответит в рабочие часы') }
  else o.куратор = 'не выбран — выбрать в профиле';
  o.сейчас_мск = msk().toISOString().slice(0, 16).replace('T', ' ');
  return 'Ученик сейчас:\n' + JSON.stringify(o, null, 1) + sl;
}
async function aiTool(env, name, input, uid, ctx) {
  if (name === 'student_info') {
    if (!uid) return { error: 'ученик не определён (тест без id) — данных нет' };
    const D = ctx.D || (ctx.D = await loadData(env)); const r = await rowFor(D, uid);
    const s = await env.DB.prepare('SELECT * FROM student WHERE uid=?').bind(uid).first(); const c = s && CURATORS.find(x => x.id === s.curator);
    if (!r) return { error: 'ученика нет в рейтинге потока 2.0', curator: c ? c.full : null };
    const pts = r.pts | 0; let rank = RANKS[0][1], next = null; for (const [p, t] of RANKS) { if (pts >= p) rank = t; else { next = { title: t, need: p - pts }; break } }
    return { name: r.name, place: r.place, of: D.n, points: pts, rank, next_rank: next, lessons_done: r.lessons, lessons_total: D.total_lessons, homework_done: r.hw, curator: c ? { name: c.full, telegram: await curTg(env, c.id) } : 'не выбран (выбрать в профиле)' };
  }
  if (name === 'my_bank') { if (!uid) return { error: 'ученик не определён' }; await bankEnsure(env);
    const [t, o] = await env.DB.batch([env.DB.prepare('SELECT amount, cur, rub, day FROM bank_tx WHERE uid=?').bind(uid), env.DB.prepare('SELECT product, price, cur, deadline, status FROM bank_order WHERE uid=?').bind(uid)]);
    const T = t.results || [], O = o.results || [], by = {}, mk = dayStr().slice(0, 7); let rub = 0, mrub = 0;
    for (const x of T) { const c = x.cur || 'RUB'; by[c] = (by[c] || 0) + x.amount; const rr = x.rub != null ? x.rub : x.amount; rub += rr; if (x.day.slice(0, 7) === mk) mrub += rr }
    const st = { new: 0, work: 0, review: 0, done: 0, cancel: 0 }; for (const x of O) st[x.status || 'new'] = (st[x.status || 'new'] || 0) + 1;
    const dl = O.filter(x => x.deadline && x.status !== 'done' && x.status !== 'cancel').sort((a, b) => a.deadline < b.deadline ? -1 : 1).slice(0, 3).map(x => ({ что: x.product || 'заказ', дедлайн: x.deadline.replace('T', ' '), цена: x.price + ' ' + (x.cur || 'RUB') }));
    return { доход_всего_в_рублях: rub, доход_по_валютам: by, доход_в_этом_месяце_руб: mrub, оплат: T.length, заказов_всего: O.length, заказы: { новые: st.new, в_работе: st.work, на_проверке: st.review, готово: st.done, отменены: st.cancel }, ближайшие_дедлайны: dl, где_смотреть: 'вкладка «Банк» в приложении' } }
  if (name === 'school_news') return await schoolNews(env, input && input.days);
  /* 1.11 (Роман: «дай Нейро доступ ко всей открытой ученикам статистике»): только то, что ученик и так видит — карточки кураторов и рейтинг потока; без очередей, имён ожидающих и денег */
  if (name === 'open_stats') { const ab = (input && input.about) || 'all', out = {};
    if (ab !== 'rating') { const st = (await curStats(env, 30)).curators, mm = x => x == null ? null : Math.max(1, Math.round(x / 60));
      out.кураторы = []; for (const c of CURATORS) { const k = await curCard(env, c.id), x = st.find(y => y.id === c.id) || {};
        out.кураторы.push({ имя: c.full, ответ_медиана_мин: k && k.avg_reply_min, ответов_за_30_дней: x.answered || 0, ответили_в_течение_2ч_проц: x.in2h, оценка_учеников: k && k.stars, оценок: k ? k.stars_n : 0, часы: k ? 'с ' + k.hours.from + ' до ' + k.hours.to + ' МСК, ' + k.hours.txt : null, на_связи_сейчас: k ? k.online : null }) }
      out.как_читать_кураторов = 'Медиана — половина ответов быстрее этого времени, считается только рабочее время. Мало ответов или оценок — сравнение неточное, так и скажи. Не называй «плохим» никого: опиши цифры.' }
    if (ab !== 'curators') { const D = ctx.D || (ctx.D = await loadData(env)), R = (D.rows || []).filter(r => r && r.name).slice().sort((a, b) => (a.place || 1e9) - (b.place || 1e9)), n = R.length || 1, avg = k => Math.round(R.reduce((a, r) => a + (+r[k] || 0), 0) / n);
      out.рейтинг_потока = { учеников: D.n || R.length, топ10: R.slice(0, 10).map(r => ({ место: r.place, имя: r.name, баллы: r.pts | 0, уроков: r.lessons | 0, домашек: r.hw | 0 })), средние: { баллы: avg('pts'), уроков: avg('lessons'), домашек: avg('hw') }, уроков_в_курсе: D.total_lessons || null } }
    return out }
  if (name === 'course_plan') { const D = ctx.D || (ctx.D = await loadData(env)); const now = Date.now(); return JSON.stringify({ today: dayStr(), x2: D.x2 || null, modules: (D.modules || []).map(m => ({ name: m.name, about: m.desc, opens: m.at, open: m.at ? Date.parse(m.at) <= now : false, link: SITE + '/teach/control/stream/view/id/' + m.id, lessons: (m.parts || []).reduce((a, p) => a + (p.lessons || []).length, 0) })) }).slice(0, 7000) }
  if (name === 'school_facts') { const f = Object.assign({}, await schoolFacts(env)); f.лицензия = SCHOOL_LICENSE; try { const D = ctx.D || (ctx.D = await loadData(env)); if (D.n) f.учеников_в_рейтинге_потока_сейчас = D.n } catch (e) {} return f }
  if (name === 'call_curator') {
    const s = uid && await env.DB.prepare('SELECT * FROM student WHERE uid=?').bind(uid).first(); const c = s && CURATORS.find(x => x.id === s.curator);
    const u = c && await curTg(env, c.id); ctx.curator = c ? { name: c.name, tg: u } : null;
    return c ? { curator: c.full, contact: u ? 'https://t.me/' + u : 'через профиль на платформе', hours: await curHours(env, c.id), answer_time: '1–2 часа в рабочее время', note: 'куратору ничего не отправлено — ученик пишет сам по кнопке под ответом' } : { curator: null, hint: 'куратор не выбран — выбрать в профиле ' + SITE + '/user/my/profile' };
  }
  return { error: 'нет такого инструмента' };
}
/* запрос к Anthropic с повтором: 429/5xx/529 и обрыв связи — ещё 2 попытки с паузой; при 403 (регион) — один повтор через AI_PROXY_URL, если задан */
async function aiFetch(env, body, url) { let r = null, j = null, net = '';
  for (let i = 0; i < 3; i++) { try { r = await fetch(url || env.AI_URL || 'https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body }); j = await r.json().catch(() => ({})) }
    catch (e) { r = null; net = String(e && e.message || e).slice(0, 80) }
    if (r && r.ok) return { r, j };
    if (r && r.status === 403 && env.AI_PROXY_URL && !url) return aiFetch(env, body, env.AI_PROXY_URL);
    if (r && ![429, 500, 502, 503, 504, 529].includes(r.status)) break;
    if (i < 2) await new Promise(z => setTimeout(z, 1200 + i * 1300)) }
  return { r, j, net } }
/* ошибка нейросети: в лог с дата-центром и страной; больше 3 за 10 минут — одно сообщение Роману (не чаще раза в 30 минут) */
async function aiErr(env, uid, code, cf) { const where = cf ? (cf.colo || '?') + '/' + (cf.country || '?') : '?';
  await logIt(env, 'ai-err', uid, code.slice(0, 260) + ' · ' + where);
  const k = 'aierr', st = (await kvGet(env, k)) || { ts: [], alert: 0 }, now = Date.now(); st.ts = st.ts.filter(t => now - t < 600e3).concat([now]).slice(-20);
  if (st.ts.length > 3 && now - (st.alert || 0) > 1800e3) { st.alert = now; for (const a of await admins(env)) await tgSend(env, a, '🔴 <b>Нейро не отвечает:</b> ' + st.ts.length + ' ошибок за 10 мин.\nПричина: ' + th(code.slice(0, 160)) + '\nДата-центр: ' + th(where)) }
  await kvPut(env, k, st) }
/* быстрые ответы: последняя строка [[a | b | c]] → кнопки */
function aiQuick(t) { const m = String(t || '').match(/\n?\s*\[\[([^\]]{2,200})\]\]\s*$/); if (!m) return { text: t, quick: [] };
  return { text: t.slice(0, m.index).trim(), quick: m[1].split('|').map(x => x.trim()).filter(Boolean).slice(0, 3) } }
const isStaffUid = (env, uid) => String(env.ADMIN_UIDS || '499631257').split(/[\s,]+/).includes(String(uid)) || CURATORS.some(c => c.uid === +uid);
/* 30.10: сотрудники GetCourse (все «ответственные» из сборщика рейтинга → /fin/staff {staff:[…]}) — не ученики: не показываем в банке учеников и списках */
let GC_STAFF = null, GC_STAFF_AT = 0;
async function gcStaffSet(env) { if (GC_STAFF && Date.now() - GC_STAFF_AT < 300000) return GC_STAFF; let a = []; try { a = (await kvGet(env, 'gcStaff')) || [] } catch (e) {} GC_STAFF = new Set(a.map(Number)); GC_STAFF_AT = Date.now(); return GC_STAFF }
/* ---------- Нейро: защита от спама и сообщений не по делу (сервер) ----------
   Правила без нейросети: бессмыслица, мат/оскорбления, повтор, флуд (> MOD_FLOOD за минуту). Неясно — дешёвая проверка моделью «да/нет».
   Лестница: каждые MOD_WARN нарушений — ограничение MOD_STEPS (мин): 30 → 60 → 180 → 720 → 1440; после последнего ещё MOD_WARN — полная блокировка.
   7 дней (MOD_RESET_DAYS) только по делу — ступень вниз. Команда школы не ограничивается. Ошибки нейросети нарушением не считаются. */
const MOD_CFG = env => ({ warn: +(env.MOD_WARN || 3), steps: String(env.MOD_STEPS || '30,60,180,720,1440').split(',').map(Number), reset: +(env.MOD_RESET_DAYS || 7), flood: +(env.MOD_FLOOD || 5) });
const MOD_BAD = /(^|[^а-яё])(ху[йеёияю]|на ?ху[йяе]|на ?хер|по ?ху[йяе]|пох[уе]р|пизд|п[ие]зд|[её]б[аеиоу]|[её]бл|еба[тн]|бля|сук[аи]|муда[кч]|долбо[её]б|пид[оа]р|залуп|гандон|шлюх|дебил|идиот|урод|чмо|fuck|shit|bitch|dick)/i;
const MOD_OK = /^(привет|здравствуй|здрасте|добр(ый|ое|ого)|хай|hi|hello|спасибо|спс|благодарю|пасиб|ок|окей|ok|понял|поняла|ясно|хорошо|супер|класс|отлично|ага|да|нет|угу|понятно|круто|ладно|давай|подробнее|а ещё|а еще|ещё|еще|продолжи)[\s!.,)?]*$/i;
const MOD_TOPIC = /(курс|урок|модул|балл|рейтинг|звани|дз|домашк|задани|анкет|эфир|расписан|доступ|тариф|оплат|куратор|школ|одуванов|рома|роман|нейро|нейросет|ии|ai|midjourney|миджорн|промпт|генерац|картин|фото|карточ|слайд|инфограф|дизайн|макет|шрифт|цвет|фон|figma|фигм|фотошоп|wb|вб|wildberries|озон|ozon|маркетплейс|селлер|клиент|заказ|портфолио|цен[аыу]|прайс|деньг|доход|заработ|банк|оплат|фриланс|kwork|авито|резюме|работ|как|что|где|когда|почему|зачем|можно|помоги|подскаж|сколько|\?)/i;
async function modState(env, uid) { return Object.assign({ n: 0, step: 0, until: 0, banned: false, hist: [], lastV: 0, lastOk: 0, q: [], last: '' }, (await kvGet(env, 'mod:' + uid)) || {}) }
function modGib(t) { const x = t.toLowerCase().replace(/[^a-zа-яё]/g, ''); if (x.length < 5) return false; if (!/[аеёиоуыэюяaeiouy]/.test(x)) return true; if (/(.)\1{4,}/.test(x)) return true;
  const v = (x.match(/[аеёиоуыэюяaeiouy]/g) || []).length / x.length; return v < 0.12 || /^(йцукен|фыва|ячсм|qwert|asdf|zxcv)/.test(x) }
async function modAsk(env, t) { if (!env.ANTHROPIC_API_KEY) return true;
  const { r, j } = await aiFetch(env, JSON.stringify({ model: env.MOD_MODEL || AI_MODEL(env), max_tokens: 400, output_config: { effort: 'low' }, system: 'Ты фильтр чата учеников онлайн-школы AI-дизайна карточек для маркетплейсов. По делу: учёба, курс, нейросети, дизайн, клиенты, заказы, деньги и банк ученика, баллы, задания, школа, а также приветствия, благодарности и уточнения. Не по делу: посторонние темы, бессмыслица, оскорбления, провокации. Ответь одним словом: да — если по делу, нет — если не по делу.', messages: [{ role: 'user', content: t.slice(0, 500) }] }));
  if (!r || !r.ok) return true; const a = ((j.content || []).find(b => b.type === 'text') || {}).text || ''; return !/^\s*нет/i.test(a) }
/* правила без состояния (мат, бессмыслица, не по теме) — общие для modCheck и тестов в пульте */
async function modWhy(env, norm, img) { if (img || !norm) return null;
  if (MOD_BAD.test(norm)) return 'мат или оскорбление';
  if (modGib(norm)) return 'бессмыслица';
  if (!MOD_OK.test(norm) && !MOD_TOPIC.test(norm) && norm.length < 400) { const ok = await modAsk(env, norm); if (!ok) return 'не по теме учёбы' }
  return null }
async function modCheck(env, uid, text, img) { const C = MOD_CFG(env), now = Date.now(), S = await modState(env, uid), k = 'mod:' + uid;
  if (S.banned) return { block: { err: 'banned', text: 'Доступ к Нейро закрыт. Если это ошибка — напиши в Заботу о студентах.' } };
  if (S.until > now) return { block: { err: 'pause', until: S.until, left: Math.max(0, C.steps.length - S.step), text: 'Нейро на паузе — слишком много сообщений не по делу.' } };
  if (S.step > 0 && S.lastV && now - S.lastV > C.reset * 864e5 && S.lastOk > S.lastV) { S.step--; S.n = S.step * C.warn; S.lastV = now }
  S.q = (S.q || []).filter(t => now - t < 60e3).concat([now]);
  const norm = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim(); let why = null;
  if (S.q.length > C.flood) why = 'флуд: больше ' + C.flood + ' сообщений в минуту';
  else if (!img && norm && norm === S.last && now - (S.lastAt || 0) < 600e3) why = 'повтор того же сообщения';
  else why = await modWhy(env, norm, img);
  S.last = norm; S.lastAt = now;
  if (!why) { await kvPut(env, k, S); return { ok: true } }
  S.n++; S.lastV = now; S.hist = [{ at: now, text: String(text || '').slice(0, 200), why }].concat(S.hist || []).slice(0, 15);
  const idx = (await kvGet(env, 'modidx')) || []; if (!idx.includes(uid)) { idx.push(uid); await kvPut(env, 'modidx', idx.slice(-2000)) }
  const day = 'modstat:' + dayStr(), ms = (await kvGet(env, day)) || { n: 0 }; ms.n++; await kvPut(env, day, ms);
  let reply, mod;
  if (S.step >= C.steps.length) { if (S.n >= (C.steps.length + 1) * C.warn) { S.banned = true; await kvPut(env, k, S); return { block: { err: 'banned', text: 'Доступ к Нейро закрыт. Если это ошибка — напиши в Заботу о студентах.' } } }
    const rest = (C.steps.length + 1) * C.warn - S.n; reply = 'Нейро помогает только с учёбой. Ещё ' + rest + ' ' + (rest === 1 ? 'сообщение' : 'сообщения') + ' не по делу — и доступ к Нейро закроется совсем.'; mod = { warn: true, rest, left: 0 } }
  else if (S.n % C.warn === 0) { S.step++; S.until = now + C.steps[S.step - 1] * 60e3; await kvPut(env, k, S);
    return { block: { err: 'pause', until: S.until, left: Math.max(0, C.steps.length - S.step), text: 'Нейро на паузе — слишком много сообщений не по делу.' } } }
  else { const rest = C.warn - S.n % C.warn, mins = C.steps[S.step]; reply = 'Нейро помогает только с учёбой: курс, нейросети, дизайн, клиенты, баллы. Ещё ' + rest + ' ' + (rest === 1 ? 'сообщение' : 'сообщения') + ' не по делу — и чат закроется на ' + (mins >= 60 ? (mins / 60) + ' ч' : mins + ' минут') + '.'; mod = { warn: true, rest, left: C.steps.length - S.step } }
  await kvPut(env, k, S); return { reply, mod } }
async function modOk(env, uid) { const S = await kvGet(env, 'mod:' + uid); if (S) { S.lastOk = Date.now(); await kvPut(env, 'mod:' + uid, S) } }
/* один ход диалога: history — [{role, content}], user — content текущего сообщения (строка или блоки) */
/* 31.10 (Роман): Нейро в каждом ответе дописывал поправки к старым ответам («Я должен исправить свои прошлые ответы…») — абзацы о самом себе убираем из ответа и из истории диалога (иначе модель повторяет их по образцу) */
const AI_META = /(^|\n)\s*(я\s+должен\s+(исправить|поправить|уточнить)|поправка\b|уточнение к (прошл|предыдущ)|в (прошл|предыдущ)\S* (ответ|сообщени)|ранее я (назвал|написал|ошиб|говорил)|я (не вызывал|не сверял|не проверял|ошибся|назвал .{0,40}без проверки))/i;
function aiClean(t) { if (!t || typeof t !== 'string') return t;
  const bad = x => AI_META.test('\n' + x.trim()) || /не\s+опирайся\s+на\s+(них|это|мои)|(прошл|предыдущ)\S*\s+(ответ|сообщени)|инструмент\S*\s+(новостей|не вызывал)|назвал\S*\s.{0,60}без\s+проверки|хотя\s+писал\s+обратное/i.test(x);
  const P = t.split(/\n{2,}/).map(p => { if (/^\s*([-•*]|\d+[.)])\s/m.test(p) || /\[\[/.test(p)) return bad(p.split('\n')[0]) && p.split('\n').length === 1 ? '' : p; const S = p.match(/[^.!?…]+[.!?…]+[»")]?\s*|[^.!?…]+$/g) || [p]; return S.filter(x => !bad(x)).join('').trim() }).filter(Boolean);
  return (P.length ? P.join('\n\n').trim() : t).replace(/\s*,?\s*по моим данным,?/gi, '') }
async function aiTurn(env, { uid, history, user, cf }) {
  if (!env.ANTHROPIC_API_KEY) return { err: 'no-key', text: '', usage: { in: 0, out: 0, cache: 0 } };
  const msgs = [...history.map(m => m && m.role === 'assistant' && typeof m.content === 'string' ? Object.assign({}, m, { content: aiClean(m.content) }) : m), { role: 'user', content: user }], ctx = {}, use = { in: 0, out: 0, cache: 0 }, t0 = Date.now(); const facts = await aiFacts(env, uid, ctx);
  for (let i = 0; i < 5; i++) {
    /* Haiku 5.5 думает по умолчанию, и мысли входят в max_tokens: при 1200 часть ответов обрывалась на полуслове (ночь 27.10).
       Поэтому запас 4000 и effort (AI_EFFORT, по умолчанию low — рекомендовано для чата). Если API не примет effort — повтор без него. */
    const B = { model: AI_MODEL(env), max_tokens: +(env.AI_MAX_TOKENS || 4000), system: [{ type: 'text', text: aiSystem(), cache_control: { type: 'ephemeral' } }, { type: 'text', text: facts }], tools: AI_TOOLS, messages: msgs };
    if (env.AI_EFFORT !== 'off' && !ctx.noEffort) B.output_config = { effort: env.AI_EFFORT || 'low' };
    let { r, j, net } = await aiFetch(env, JSON.stringify(B));
    if (r && r.status === 400 && B.output_config && /effort|output_config/i.test(JSON.stringify(j || {}))) { ctx.noEffort = true; delete B.output_config; ({ r, j, net } = await aiFetch(env, JSON.stringify(B))) }
    if (!r || !r.ok) { const code = r ? r.status + ' ' + ((j && j.error && (j.error.type + ': ' + j.error.message)) || '') : 'net ' + net;
      await aiErr(env, uid, code, cf); return { err: code.slice(0, 120), text: '', usage: use } }
    const u = j.usage || {}; use.in += (u.input_tokens | 0) + (u.cache_creation_input_tokens | 0); use.cache += u.cache_read_input_tokens | 0; use.out += u.output_tokens | 0;
    const calls = (j.content || []).filter(b => b.type === 'tool_use');
    if (j.stop_reason !== 'tool_use' || !calls.length) {
      let text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      if (j.stop_reason === 'max_tokens') { await logIt(env, 'ai-cut', uid, String(use.out)); if (text) text = text.replace(/[^.!?…\n]*$/, '').trim() || text }
      { const tc = aiClean(text); if (tc !== text) await logIt(env, 'ai-meta-cut', uid, String(text.length - tc.length)); text = tc }
      return { text: text || 'Не получилось ответить, попробуй спросить короче.', usage: use, ms: Date.now() - t0, tools: ctx.used || [], curator: ctx.curator };
    }
    msgs.push({ role: 'assistant', content: j.content }); const res = [];
    for (const c of calls) { (ctx.used = ctx.used || []).push(c.name); let out; try { out = await aiTool(env, c.name, c.input || {}, uid, ctx) } catch (e) { out = { error: String(e && e.message || e) } }
      res.push({ type: 'tool_result', tool_use_id: c.id, content: typeof out === 'string' ? out : JSON.stringify(out) }) }
    msgs.push({ role: 'user', content: res });
  }
  return { text: 'Не получилось ответить, попробуй переформулировать.', usage: use };
}
const aiCost = u => ((u.in * AI_PRICE.in + u.cache * AI_PRICE.in * 0.1 + u.out * AI_PRICE.out) / 1e6);
const tgFmt = s => th(s).replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/^#{1,6}\s*/gm, '');
function b64(buf) { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s) }
async function tgImage(env, fileId) {
  const f = await tg(env, 'getFile', { file_id: fileId }); if (!f.ok) return null;
  const r = await fetch('https://api.telegram.org/file/bot' + env.TG_TOKEN + '/' + f.result.file_path); if (!r.ok) return null;
  const p = f.result.file_path.toLowerCase(); const mt = p.endsWith('.png') ? 'image/png' : p.endsWith('.webp') ? 'image/webp' : p.endsWith('.gif') ? 'image/gif' : 'image/jpeg';
  return { type: 'image', source: { type: 'base64', media_type: mt, data: b64(await r.arrayBuffer()) } };
}
/* ---------- оценка ответов Нейро учеником 👍/👎 (ночь 27.10) ----------
   /ma/ai отдаёт mid ответа; последние 20 ответов (вопрос + ответ) лежат в kv 'aimid:<ключ диалога>'.
   /ma/aifb {mid, v: 1 | -1, why} — одна оценка на ответ (повторная заменяет). Статистика — /app/api/neuro/fb (пульт → «Нейро»). */
const AIFB_SCHEMA = ['CREATE TABLE IF NOT EXISTS ai_fb (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER NOT NULL, mid TEXT NOT NULL, vote INTEGER NOT NULL, why TEXT, q TEXT, a TEXT, tools TEXT, view INTEGER DEFAULT 0, at INTEGER)',
  'CREATE UNIQUE INDEX IF NOT EXISTS ai_fb_um ON ai_fb (uid, mid)'];
let AIFB_OK = false;
async function aiFbEnsure(env) { if (AIFB_OK) return; await env.DB.batch(AIFB_SCHEMA.map(s => env.DB.prepare(s))); AIFB_OK = true }
async function aiMidSave(env, key, rec) { const k = 'aimid:' + key, L = (await kvGet(env, k)) || []; L.unshift(rec); await kvPut(env, k, L.slice(0, 20)) }
/* обработка сообщения в боте; вернуть true, если сообщение забрал Нейро-Одуванов */
async function neuroTg(env, m, chat, text) {
  const adm = await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(chat).first(); if (!adm) return false;
  const kv = async k => { const r = await env.DB.prepare('SELECT v FROM kv WHERE k=?').bind(k).first(); return r ? JSON.parse(r.v) : null };
  const put = (k, v) => env.DB.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)').bind(k, JSON.stringify(v)).run();
  const st = (await kv('neuro:' + chat)) || { on: false, uid: 0 };
  const nw = text.match(/^\/news(?:@\w+)?(?:\s+([\s\S]+))?/);
  if (nw) { const L = (await kv('news')) || [], arg = (nw[1] || '').trim(), dm = arg.match(/^del\s+(\d+)$/i);
    if (dm) { const i = L.length - +dm[1]; if (L[i]) { L.splice(i, 1); await put('news', L); await tgSend(env, chat, '🗑 Удалено.') } else await tgSend(env, chat, 'Нет записи с таким номером.'); return true }
    if (arg) { L.push({ d: dayStr(), t: arg.slice(0, 600) }); await put('news', L.slice(-200)); await tgSend(env, chat, '✅ Добавлено в новости школы — Нейро расскажет ученикам на вопрос «что нового».'); return true }
    const last = L.slice(-10).reverse(); await tgSend(env, chat, '📰 <b>Новости школы для Нейро</b>\n' + (last.length ? last.map((n, i) => (i + 1) + '. ' + n.d + ' — ' + th(n.t)).join('\n') : 'Пока только встроенный список.') + '\n\n<code>/news текст</code> — добавить, <code>/news del 1</code> — удалить первую в этом списке.'); return true }
  const cmd = text.match(/^\/neuro(?:@\w+)?(?:\s+(\S+))?/);
  if (cmd) {
    if (cmd[1] === 'new') { await put('nh:' + chat, []); await tgSend(env, chat, '🧹 Новый диалог.'); return true }
    if (cmd[1] && /^\d{5,12}$/.test(cmd[1])) { st.on = true; st.uid = +cmd[1] } else if (cmd[1] === 'off') st.on = false; else st.on = !st.on;
    await put('neuro:' + chat, st); await put('nh:' + chat, []);
    await tgSend(env, chat, st.on ? '🌼 <b>Нейро-Одуванов включён</b> · модель ' + th(AI_MODEL(env)) + '\n' + (st.uid ? 'Отвечаю как ученику с id ' + st.uid + '.' : 'Без ученика — личные данные недоступны. Чтобы проверить на ученике: <code>/neuro &lt;id&gt;</code>') + '\n\nПиши вопросы или кидай картинку на разбор. <code>/neuro new</code> — новый диалог, <code>/neuro</code> — выключить.' : 'Нейро-Одуванов выключен.');
    return true;
  }
  if (!st.on || text.startsWith('/')) return false;
  const ph = m.photo && m.photo.length ? m.photo[m.photo.length - 1].file_id : (m.document && /^image\//.test(m.document.mime_type || '') ? m.document.file_id : null);
  const cap = String(m.caption || text || '').trim(); if (!ph && !cap) return true;
  tg(env, 'sendChatAction', { chat_id: chat, action: 'typing' });
  let content = cap;
  if (ph) { const img = await tgImage(env, ph); if (!img) { await tgSend(env, chat, 'Не смог скачать картинку.'); return true } content = [img, { type: 'text', text: cap || 'Разбери мою работу.' }] }
  const hist = (await kv('nh:' + chat)) || [];
  const R = await aiTurn(env, { uid: st.uid, history: hist, user: content, cf: m.__cf });
  if (R.err) { await tgSend(env, chat, 'Сейчас технические неполадки у нейросети — попробуй через пару минут.\n<i>' + th(R.err) + '</i>'); return true }
  { const Q = aiQuick(R.text); R.text = Q.text + (Q.quick.length ? '\n\nВарианты ответа: ' + Q.quick.join(' · ') : '') }
  hist.push({ role: 'user', content: (ph ? '[прислал картинку] ' : '') + cap }, { role: 'assistant', content: R.text }); await put('nh:' + chat, hist.slice(-12));
  const u = R.usage, rub = aiCost(u) * AI_PRICE.rub;
  const foot = '\n\n<i>' + th(AI_MODEL(env)) + ' · ' + (u.in + u.cache + u.out).toLocaleString('ru-RU') + ' ток.' + (u.cache ? ' (кэш ' + u.cache + ')' : '') + ' · ≈' + rub.toFixed(rub < 1 ? 3 : 2).replace('.', ',') + ' ₽' + (R.ms ? ' · ' + (R.ms / 1000).toFixed(1).replace('.', ',') + ' с' : '') + (R.tools && R.tools.length ? ' · ' + R.tools.join(', ') : '') + '</i>';
  const btn = R.curator && R.curator.tg ? [[{ text: 'Написать ' + R.curator.name + 'у', url: 'https://t.me/' + R.curator.tg }]] : undefined;
  const j = await tgSend(env, chat, tgFmt(R.text) + foot, btn);
  if (!j.ok) await tg(env, 'sendMessage', { chat_id: chat, text: R.text + '\n\n' + foot.replace(/<\/?i>/g, '') });
  await logIt(env, 'ai', st.uid, JSON.stringify({ in: u.in, cache: u.cache, out: u.out, usd: +aiCost(u).toFixed(5), img: !!ph }));
  return true;
}

/* ---------- Пульт куратора и Романа: /app (вход через Telegram) ----------
   Вход: страница даёт ссылку t.me/<бот>?start=login_<nonce>; бот узнаёт куратора (cur_tg.tg_id) или админа (tg_admin) и подтверждает.
   Сессия: kv 'sess:<токен>' на 30 дней. Данные: ученики куратора (student.curator) + рейтинг (data.json) + время учёбы + Telegram + ожидание ответа. */
const APP_SESS_DAYS = 30;
const ajson = (obj, st = 200) => new Response(JSON.stringify(obj), { status: st, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
async function appLoginTg(env, chat, nonce, from) {
  const L = await kvGet(env, 'login:' + nonce); if (!L || L.done) return tgSend(env, chat, 'Ссылка для входа устарела. Обнови страницу пульта и нажми «Войти» ещё раз.');
  if (Date.now() - L.at > 10 * 60e3) return tgSend(env, chat, 'Ссылка для входа устарела (10 минут). Нажми «Войти» ещё раз.');
  if (L.kind === 'student') { const s = await env.DB.prepare('SELECT uid, name FROM student WHERE tg_chat=?').bind(String(chat)).first();
    if (!s) return tgSend(env, chat, 'Этот Telegram ещё не привязан к кабинету. Открой профиль в кабинете OduvanovSchool → «Подключить Telegram», потом войди ещё раз.');
    await kvPut(env, 'login:' + nonce, Object.assign(L, { done: true, chat, role: 'student', uid: s.uid, cid: null, name: s.name || (from && from.first_name) || '' }));
    await logIt(env, 'app-login', s.uid, 'student ' + chat); return tgSend(env, chat, '✅ <b>Вход выполнен.</b> Вернись в браузер — страница откроется сама.') }
  const adm = await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(chat).first();
  const cur = await env.DB.prepare('SELECT cid FROM cur_tg WHERE tg_id=?').bind(chat).first();
  if (!adm && !cur) return tgSend(env, chat, 'Пульт доступен только кураторам и команде школы. Если ты куратор — сначала подключись по ссылке от Романа.');
  const name = [from && from.first_name, from && from.last_name].filter(Boolean).join(' ') || 'Без имени';
  await kvPut(env, 'login:' + nonce, Object.assign(L, { done: true, chat, role: adm ? 'admin' : 'curator', cid: cur ? cur.cid : null, name }));
  await logIt(env, 'app-login', 0, (adm ? 'admin ' : 'cur ') + chat);
  return tgSend(env, chat, '✅ <b>Вход в пульт выполнен.</b> Вернись в браузер — страница откроется сама.');
}
async function appSession(env, req) { const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/, ''); if (!/^[0-9a-f]{32}$/.test(t)) return null;
  const s = await kvGet(env, 'sess:' + t); if (!s || s.exp < Date.now()) return null; s.tok = t; return s }
function appScope(s, c) { if (s.role === 'admin') return CURATORS.find(x => x.id === c) ? c : (c === 'all' ? 'all' : CURATORS[0].id); return s.cid }
const APPC = {}; /* кэш списка в памяти изолята на 30 с: переключение и повторные запросы мгновенные */
async function appStudents(env, cid) { const ck = APPC[cid]; if (ck && Date.now() - ck.at < 30e3) return ck.v; const v = await appStudents0(env, cid); APPC[cid] = { at: Date.now(), v }; return v }
async function appStudents0(env, cid) { /* D1 на бесплатном тарифе — до 50 запросов за вызов, поэтому всё одним набором запросов */
  const D = await loadData(env); const byH = {}; for (const r of D.rows) byH[r.h] = r;
  const q = cid === 'all' ? env.DB.prepare('SELECT * FROM student') : env.DB.prepare('SELECT * FROM student WHERE curator=?').bind(cid);
  const today = dayStr(), wk = addDays(today, -6);
  const [rs, ts, ls, us, ws] = await env.DB.batch([q,
    env.DB.prepare('SELECT uid, SUM(site)+SUM(video) t FROM time WHERE day>=? GROUP BY uid').bind(wk),
    env.DB.prepare('SELECT uid, MAX(day) d FROM time WHERE site>0 OR video>0 GROUP BY uid'),
    env.DB.prepare('SELECT chat, username FROM tg_user'),
    env.DB.prepare('SELECT uid, MIN(since) since FROM cwait GROUP BY uid')]);
  const T = {}, L = {}, U = {}, W = {}; for (const x of ts.results || []) T[x.uid] = x.t | 0; for (const x of ls.results || []) L[x.uid] = x.d;
  for (const x of us.results || []) U[x.chat] = x.username; for (const x of ws.results || []) if (x.uid) W[x.uid] = x.since;
  const out = [];
  const priv = !!(D.rows.length && D.rows[0].uid != null), byU = {}; if (priv) for (const r of D.rows) byU[String(r.uid)] = r;
  const MU = {}; for (const m of (D.hw_multi || [])) if (m.status !== 'accepted') MU[+m.uid] = (MU[+m.uid] || 0) + 1;
  const GS = await gcStaffSet(env), SR = (rs.results || []).filter(s => !isStaffUid(env, s.uid) && !GS.has(+s.uid)), have = {}; for (const s of SR) have[s.uid] = 1;
  /* админ «Все»: весь поток из рейтинга, даже без записи в базе и без куратора; без строк «id …» у тех, кого нет в рейтинге и кто не заходил */
  if (cid === 'all' && priv) for (const x of D.rows) if (x.uid != null && !have[+x.uid] && !isStaffUid(env, x.uid) && !GS.has(+x.uid)) { have[+x.uid] = 1; SR.push({ uid: +x.uid, name: x.name, curator: null, tg_chat: null }) }
  for (const s of SR) { const r = (priv ? byU[String(s.uid)] : byH[await hashUid(s.uid)]) || null; if (cid === 'all' && !r && !s.curator) continue; /* «Все» у админа = текущий поток (рейтинг) + все, у кого есть куратор; старые потоки из базы не показываем */
    out.push({ uid: s.uid, name: (r && r.name) || s.name || ('id ' + s.uid), cur: s.curator, tar: r && r.tar || null, acc: r && r.acc || null,
      place: r && r.place || null, pts: r ? r.pts | 0 : null, week: r ? r.week | 0 : null, lessons: r ? r.lessons | 0 : null, hw: r ? r.hw | 0 : null, ontime: r && r.ontime != null ? r.ontime : null,
      t7: T[s.uid] || 0, last: L[s.uid] || null, tg: !!s.tg_chat, tgu: s.tg_chat && U[s.tg_chat] || null, tgid: s.tg_chat || null, wait: W[s.uid] || null, multi: MU[s.uid] || 0 }) }
  return { n: D.n, total: D.total_lessons, students: out };
}
async function appApi(env, req, path) {
  const u = new URL(req.url);
  if (path === '/app/api/login/start' && req.method === 'POST') { await ensure(env); const n = rnd(); await kvPut(env, 'login:' + n, { at: Date.now(), kind: u.searchParams.get('kind') === 'student' ? 'student' : 'staff' }); return ajson({ ok: true, nonce: n, link: 'https://t.me/' + BOT(env) + '?start=login_' + n }) }
  /* вход в пульт и банк без Telegram: токен кабинета (FS_AUTH на сайте, проверен сервером) или initData мини-аппа → сессия с ролью по данным сервера */
  if ((path === '/app/api/login/fs' || path === '/app/api/login/tg') && req.method === 'POST') { await ensure(env); let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
    let uid = 0, chat = null, nm = '';
    if (path === '/app/api/login/fs') { uid = await authUid(env, String(o.t || ''), 'a'); if (!uid) return ajson({ ok: false, err: 'token' }, 401);
      const st = await env.DB.prepare('SELECT tg_chat, name FROM student WHERE uid=?').bind(uid).first(); chat = st && st.tg_chat || null; nm = st && st.name || '' }
    else { const tu = await tgInitCheck(env, String(o.init || '')); if (!tu || !tu.id) return ajson({ ok: false, err: 'init' }, 401); chat = String(tu.id); nm = [tu.first_name, tu.last_name].filter(Boolean).join(' ');
      const st = await env.DB.prepare('SELECT uid FROM student WHERE tg_chat=?').bind(chat).first(); uid = st ? st.uid : 0 }
    const adm = String(env.ADMIN_UIDS || '499631257').split(/[\s,]+/).includes(String(uid)) || (chat && await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(chat).first());
    const cc = CURATORS.find(c => c.uid === uid) || (chat && await (async () => { const r = await env.DB.prepare('SELECT cid FROM cur_tg WHERE tg_id=?').bind(chat).first(); return r && CURATORS.find(c => c.id === r.cid) })());
    const role = adm ? 'admin' : cc ? 'curator' : uid ? 'student' : null; if (!role) return ajson({ ok: false, err: 'nolink' }, 403);
    const tok = rnd(); await kvPut(env, 'sess:' + tok, { role, cid: cc ? cc.id : null, uid: role === 'student' ? uid : null, chat, name: nm || (cc && cc.full) || '', exp: Date.now() + APP_SESS_DAYS * 864e5 });
    await logIt(env, 'app-login-' + (path.endsWith('fs') ? 'fs' : 'tg'), uid, role); return ajson({ ok: true, token: tok, role }) }
  if (path === '/app/api/login/check') { const n = u.searchParams.get('n') || ''; if (!/^[0-9a-f]{32}$/.test(n)) return ajson({ ok: false }, 400);
    const L = await kvGet(env, 'login:' + n); if (!L) return ajson({ ok: false, err: 'expired' }); if (!L.done) return ajson({ ok: true, wait: true });
    const tok = rnd(); await kvPut(env, 'sess:' + tok, { role: L.role, cid: L.cid, uid: L.uid || null, chat: L.chat, name: L.name, exp: Date.now() + APP_SESS_DAYS * 864e5 }); await kvDel(env, 'login:' + n);
    return ajson({ ok: true, token: tok }) }
  const s = await appSession(env, req); if (!s) return ajson({ ok: false, err: 'auth' }, 401);
  if (path === '/app/api/logout' && req.method === 'POST') { await kvDel(env, 'sess:' + s.tok); return ajson({ ok: true }) }
  if (s.role === 'student') return path === '/app/api/me' ? ajson({ ok: true, role: 'student', uid: s.uid, name: s.name }) : ajson({ ok: false, err: 'forbidden' }, 403);
  if (path.startsWith('/app/api/care/')) return careApi(env, s, path, req, u, ajson);
  if (path.startsWith('/app/api/neuro/')) return neuroAdmin(env, s, path, req, u, ajson);
  if (path === '/app/api/me') return ajson({ ok: true, role: s.role, cid: s.cid, name: s.name, curators: CURATORS.map(c => ({ id: c.id, full: c.full })), bot: BOT(env) });
  const c = appScope(s, u.searchParams.get('c') || '');
  if (path === '/app/api/students') return ajson(Object.assign({ ok: true, c }, await appStudents(env, c)));
  if (path === '/app/api/stats') { const st = await curStats(env, Math.min(90, Math.max(1, +u.searchParams.get('days') || 14))); return ajson({ ok: true, c, curators: c === 'all' ? st.curators : st.curators.filter(x => x.id === c) }) }
  if (path === '/app/api/hours' && req.method === 'POST') { const o = await req.json().catch(() => ({})); const cc = appScope(s, o.c);
    if (cc === 'all' || !(o.from >= 0 && o.to <= 24 && o.from < o.to)) return ajson({ ok: false }, 400);
    await kvPut(env, 'hours:' + cc, [o.from | 0, o.to | 0]);
    if (Array.isArray(o.days)) { const d = [...new Set(o.days.map(Number).map(x => x === 7 ? 0 : x).filter(x => x >= 0 && x <= 6))]; /* пульт шлёт Вс=7 */ if (d.length) await kvPut(env, 'hdays:' + cc, d) } return ajson({ ok: true }) }
  if (path === '/app/api/bclog') return ajson({ ok: true, log: (await kvGet(env, 'bclog:' + c)) || [] });
  if (path === '/app/api/broadcast' && req.method === 'POST') { const o = await req.json().catch(() => ({})); const cc = appScope(s, o.c);
    const text = String(o.text || '').trim().slice(0, 3000); if (!text) return ajson({ ok: false, err: 'empty' }, 400);
    const all = (await appStudents(env, cc)).students; const want = Array.isArray(o.uids) && o.uids.length ? new Set(o.uids.map(Number)) : null;
    const to = all.filter(x => x.tgid && (!want || want.has(x.uid))); if (to.length > 40) return ajson({ ok: false, err: 'batch' }, 400); /* бесплатный Cloudflare: ~50 запросов за вызов — страница шлёт пачками по 35 */
    const who = s.role === 'admin' ? 'Роман' : ((CURATORS.find(x => x.id === s.cid) || {}).name || 'Куратор');
    const btn = o.link && /^https:\/\//.test(o.link) ? [[{ text: String(o.btn || 'Открыть').slice(0, 40), url: o.link }]] : undefined;
    let sent = 0, fail = 0;
    for (const x of to) { const j = await tgSend(env, x.tgid, '<b>' + th(who) + '</b>\n' + th(text), btn); if (j && j.ok) sent++; else fail++ }
    const log = (await kvGet(env, 'bclog:' + cc)) || []; const bid = String(o.bid || '').slice(0, 40);
    if (bid && log[0] && log[0].bid === bid) { log[0].sent += sent; log[0].fail += fail } else log.unshift({ bid, at: new Date().toISOString(), who, text: text.slice(0, 1500), btn: btn ? btn[0][0].text : null, link: btn ? btn[0][0].url : null, all: !want, sent, fail, noTg: o.noTg | 0 });
    await kvPut(env, 'bclog:' + cc, log.slice(0, 30));
    await logIt(env, 'broadcast', 0, cc + ' ' + sent + '/' + to.length); return ajson({ ok: true, sent, fail }) }
  return ajson({ ok: false, err: 'not found' }, 404);
}

const APP_HTML = "<!doctype html>\n<html lang=\"ru\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<title>Пульт куратора · OduvanovSchool</title>\n<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\"><link href=\"https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap\" rel=\"stylesheet\">\n<style>\n:root{--bg:#000106;--s0:#0c0c0c;--s1:#161616;--s2:#1f1f1f;--tile:#242424;--ink2:rgba(255,255,255,.58);--ink3:rgba(255,255,255,.44);--hair:rgba(255,255,255,.08);--lil:#c38bff;--acc:#d77fff;--plum:#602364;--up:#4ade80;--dn:#ff8f8f;--warn:#ffb48c}\n*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:#fff;font:400 15px/1.45 \"Inter Tight\",Inter,system-ui,sans-serif;font-feature-settings:\"tnum\"}\nbody{min-height:100vh;background:radial-gradient(70% 40% at 55% 100%,rgba(150,87,232,.35),transparent 70%) fixed,var(--bg)}\na{color:var(--acc);text-decoration:none}button{font:inherit;color:inherit;cursor:pointer}\n.wrap{max-width:1280px;margin:0 auto;padding:28px 32px 120px;display:flex;flex-direction:column;gap:16px}\n.hd{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:20px 0 22px;border-bottom:1px solid var(--hair)}\n.hd h1{margin:0;font-size:44px;line-height:1.05;font-weight:500;letter-spacing:-.03em}.hd p{margin:8px 0 0;color:var(--ink2)}\n.mk{display:inline-flex;align-items:center;gap:10px;font-weight:700;font-size:15px;color:#fff}.mk b{font-weight:500;color:#e2c9ff}\n.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;padding:0 22px;border-radius:14px;border:0;background:linear-gradient(180deg,#fef8ff,#fccbff);color:var(--plum);font-weight:600;font-size:15px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),0 16px 48px -12px rgba(252,203,255,.35)}\n.btn:disabled{opacity:.5;cursor:default}\n.sb{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:12px;border:1px solid var(--hair);background:var(--s1);font-size:14px;font-weight:500;white-space:nowrap}\n.sb.pri{background:linear-gradient(180deg,#fef8ff,#fccbff);color:var(--plum);border:0}\n.tabs{display:flex;gap:4px;flex-wrap:wrap}.tabs button{height:38px;padding:0 16px;border-radius:12px;border:1px solid var(--hair);background:var(--s1);font-size:14px;font-weight:500;color:rgba(255,255,255,.75)}\n.tabs button.on{background:#fff;color:#000106;border-color:#fff}\n.seg{display:inline-flex;padding:3px;border-radius:10px;background:var(--s0);border:1px solid var(--hair)}.seg button{border:0;background:transparent;height:30px;padding:0 12px;border-radius:8px;color:var(--ink2);font-size:13px;font-weight:500}.seg button.on{background:var(--s2);color:#fff}\n.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}\n.k{background:var(--s1);border:1px solid var(--hair);border-radius:20px;padding:16px 18px}.k .l{display:flex;align-items:center;gap:10px;color:var(--ink2);font-size:13.5px}\n.k .ic{width:32px;height:32px;border-radius:10px;background:var(--tile);display:grid;place-items:center;color:var(--lil);flex:none}\n.k .v{display:block;font-size:30px;font-weight:500;letter-spacing:-.02em;margin:12px 0 2px}.k .d{font-size:12.5px;color:var(--ink3)}\n.k.on{border-color:rgba(195,139,255,.6);background:linear-gradient(160deg,rgba(150,87,232,.16),rgba(22,22,22,0) 60%),var(--s1)}.k.on .ic{background:var(--lil);color:#1a0b2e}\n.k.bad{border-color:rgba(255,59,92,.5)}\n.card{background:var(--s1);border:1px solid var(--hair);border-radius:22px;padding:20px}\n.ctl{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}\n.inp{height:40px;border-radius:12px;border:1px solid var(--hair);background:var(--s0);color:#fff;font:inherit;padding:0 12px;outline:none;color-scheme:dark}\n.inp:focus{border-color:rgba(195,139,255,.6)}textarea.inp{height:auto;padding:12px;resize:vertical;min-height:120px;line-height:1.5}\n.tw{overflow:auto;border-radius:22px;border:1px solid var(--hair);background:var(--s1)}\ntable{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;font-weight:400;font-size:12px;color:var(--ink3);padding:12px 12px;white-space:nowrap;border-bottom:1px solid var(--hair);cursor:pointer;user-select:none}\ntd{padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap;vertical-align:middle}tr:last-child td{border-bottom:0}\ntbody tr:hover{background:rgba(255,255,255,.025)}\n.nm b{font-weight:500}.nm small{display:block;color:var(--ink3);font-size:12px}\n.chip{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:7px;font-size:11.5px;font-weight:600;white-space:nowrap;background:rgba(255,255,255,.06);color:var(--ink2)}\n.chip.l{background:rgba(195,139,255,.16);color:#e2c9ff}.chip.bad{background:rgba(255,59,92,.16);color:var(--dn)}.chip.ok{background:rgba(74,222,128,.12);color:var(--up)}.chip.w{background:rgba(255,180,140,.14);color:var(--warn)}\n.bar{height:6px;border-radius:5px;background:rgba(255,255,255,.07);overflow:hidden;width:70px;display:inline-block;vertical-align:middle;margin-right:8px}.bar i{display:block;height:100%;background:linear-gradient(90deg,#6724ad,#c38bff)}\n.chk{width:18px;height:18px;accent-color:#c38bff}\n.muted{color:var(--ink3)}.ink2{color:var(--ink2)}.dn{color:var(--dn)}.up{color:var(--up)}\n.login{min-height:100vh;display:grid;place-items:center;padding:24px}.lg{width:min(440px,100%);display:flex;flex-direction:column;gap:18px;align-items:center;text-align:center;padding:40px 32px;border-radius:32px;background:var(--s1);border:1px solid var(--hair)}\n.lg h1{margin:0;font-size:32px;font-weight:500;letter-spacing:-.02em}\n.bub{background:#182533;border-radius:16px 16px 16px 4px;padding:10px 13px;font-size:14px;max-width:420px;white-space:pre-wrap}\n.bub b{display:block;margin-bottom:2px}.tgb{display:block;text-align:center;margin-top:8px;padding:8px;border-radius:10px;background:rgba(94,168,255,.16);color:#8cc4ff;font-weight:600;font-size:13px}\n.log{display:flex;flex-direction:column;gap:8px}.log div{display:flex;gap:12px;padding:10px 12px;border-radius:14px;background:var(--s0);border:1px solid var(--hair);font-size:13.5px}\n.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);padding:12px 18px;border-radius:14px;background:#0f1f15;border:1px solid rgba(74,222,128,.4);color:#c9f7d8;font-size:14px;z-index:9;display:none}\n.hid{display:none!important}\nhtml.emb body{background:transparent;min-height:0}html.emb .wrap{padding:8px 40px 40px;max-width:none}html.emb .login{min-height:0;padding:40px 0}html.emb #bOut{display:none}\n@media (max-width:760px){.wrap{padding:18px 14px 100px}html.emb .wrap{padding:8px 16px 40px}.hd h1{font-size:32px}.kpis{grid-template-columns:1fr 1fr}.k .v{font-size:24px}}\n</style></head><body>\n<div id=\"login\" class=\"login hid\"><div class=\"lg\">\n<span class=\"mk\"><svg width=\"26\" height=\"26\" viewBox=\"0 0 64 64\"><rect width=\"20\" height=\"20\" rx=\"3\" fill=\"#fff\"/><rect x=\"22\" width=\"20\" height=\"20\" rx=\"3\" fill=\"#fff\"/><rect x=\"44\" width=\"20\" height=\"20\" rx=\"3\" fill=\"#c38bff\"/><rect y=\"22\" width=\"20\" height=\"20\" rx=\"3\" fill=\"#fff\"/><rect x=\"44\" y=\"22\" width=\"20\" height=\"20\" rx=\"3\" fill=\"#fff\"/><rect y=\"44\" width=\"20\" height=\"20\" rx=\"3\" fill=\"#fff\"/><rect x=\"22\" y=\"44\" width=\"20\" height=\"20\" rx=\"3\" fill=\"#fff\"/><rect x=\"44\" y=\"44\" width=\"20\" height=\"20\" rx=\"3\" fill=\"#fff\"/></svg>Oduvanov<b>School</b></span>\n<h1>Пульт куратора</h1><p class=\"ink2\" style=\"margin:0\">Вход через Telegram: нажми кнопку, в&nbsp;боте нажми «Старт»&nbsp;— и&nbsp;вернись сюда.</p>\n<button class=\"btn\" id=\"bLogin\" style=\"width:100%\">Войти через Telegram</button><span class=\"muted\" id=\"lgSt\" style=\"font-size:13px\"></span></div></div>\n\n<div id=\"app\" class=\"wrap hid\">\n<header class=\"hd\"><div><h1 id=\"hTitle\">Пульт куратора</h1><p id=\"hSub\">Ученики, ответы и&nbsp;рассылки</p></div>\n<div class=\"row\"><div class=\"seg hid\" id=\"curSeg\"></div><button class=\"sb\" id=\"bOut\">Выйти</button></div></header>\n<div class=\"kpis\" id=\"kpis\"></div>\n<div class=\"ctl\"><div class=\"tabs\" id=\"tabs\"><button data-t=\"st\" class=\"on\">Ученики</button><button data-t=\"bc\">Рассылка</button><button data-t=\"hr\">Время работы</button></div><span class=\"muted\" id=\"upd\" style=\"font-size:13px\"></span></div>\n\n<section id=\"t-st\" class=\"tab\">\n<div class=\"ctl\" style=\"margin-bottom:12px\"><div class=\"seg\" id=\"flt\"><button data-f=\"all\" class=\"on\">Все</button><button data-f=\"wait\">Ждут ответа</button><button data-f=\"idle\">Не заходили 5+ дн</button><button data-f=\"notg\">Без Telegram</button></div>\n<div class=\"row\"><input class=\"inp\" id=\"q\" placeholder=\"Поиск по имени\" style=\"width:220px\"><span class=\"muted\" id=\"selN\" style=\"font-size:13px\"></span><button class=\"sb hid\" id=\"bSelMsg\">Написать выбранным</button></div></div>\n<div class=\"tw\"><table><thead><tr><th style=\"width:34px\"><input type=\"checkbox\" class=\"chk\" id=\"chkAll\"></th><th data-s=\"name\">Ученик</th><th data-s=\"place\">Место</th><th data-s=\"pts\">Баллы</th><th data-s=\"week\">За неделю</th><th data-s=\"lessons\">Уроки</th><th data-s=\"hw\">ДЗ</th><th data-s=\"t7\">Время, 7 дн</th><th data-s=\"last\">Был</th><th data-s=\"wait\">Ответ</th><th>Telegram</th></tr></thead><tbody id=\"tb\"><tr><td colspan=\"11\" class=\"muted\" style=\"text-align:center;padding:30px\">Загружаю учеников…</td></tr></tbody></table></div>\n</section>\n\n<section id=\"t-bc\" class=\"tab hid\"><div style=\"display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:16px;align-items:start\" id=\"bcGrid\">\n<div class=\"card\" style=\"display:flex;flex-direction:column;gap:14px\">\n<div class=\"ctl\"><b style=\"font-weight:500;font-size:18px\">Сообщение ученикам в&nbsp;Telegram</b><div class=\"seg\" id=\"bcTo\"><button data-r=\"all\" class=\"on\">Все</button><button data-r=\"idle\">Не заходили 5+ дн</button><button data-r=\"sel\">Выбранные</button></div></div>\n<textarea class=\"inp\" id=\"bcText\" maxlength=\"3000\" placeholder=\"Например: «Завтра в 19:00 эфир по колористике — присылайте работы на разбор до 23:59»\"></textarea>\n<div class=\"row\"><span class=\"muted\" style=\"font-size:13px\">Кнопка под сообщением:</span><span id=\"bcLinks\" class=\"row\"></span></div>\n<div class=\"row\"><input class=\"inp\" id=\"bcBtn\" placeholder=\"Текст кнопки\" style=\"width:180px\"><input class=\"inp\" id=\"bcLink\" placeholder=\"https://… (необязательно)\" style=\"flex:1;min-width:200px\"></div>\n<div class=\"row\"><button class=\"btn\" id=\"bSend\">Отправить</button><span class=\"muted\" id=\"bcInfo\" style=\"font-size:13px\"></span></div></div>\n<div style=\"display:flex;flex-direction:column;gap:12px\"><div class=\"card\"><span class=\"muted\" style=\"font-size:12px\">Так увидит ученик</span><div style=\"background:#0e1621;border-radius:16px;padding:12px;margin-top:8px\"><div class=\"bub\" id=\"bcPrev\"><b id=\"bcWho\">Куратор</b><span id=\"bcPT\" class=\"muted\">Текст сообщения</span><span class=\"tgb hid\" id=\"bcPB\"></span></div></div></div>\n<div class=\"card\"><b style=\"font-weight:500\">Последние рассылки</b><div class=\"log\" id=\"bcLog\" style=\"margin-top:10px\"></div></div></div></div></section>\n\n<section id=\"t-hr\" class=\"tab hid\"><div class=\"card\" style=\"max-width:560px;display:flex;flex-direction:column;gap:14px\">\n<b style=\"font-weight:500;font-size:18px\">Когда ты&nbsp;на&nbsp;связи</b><p class=\"ink2\" style=\"margin:0\">Время ответа ученикам считается только в&nbsp;эти часы (по&nbsp;Москве). Ученики видят их&nbsp;на&nbsp;кнопке «Написать в&nbsp;Telegram».</p>\n<div class=\"row\" style=\"font-size:17px\">с <select class=\"inp\" id=\"hFrom\"></select> до <select class=\"inp\" id=\"hTo\"></select> <button class=\"btn\" id=\"bHours\">Сохранить</button></div><span class=\"muted\" id=\"hInfo\"></span></div></section>\n</div>\n<div class=\"toast\" id=\"toast\"></div>\n<script>\n(function(){\nvar EMB=/[?&]embed=1/.test(location.search);if(EMB){document.documentElement.classList.add('emb');var ph=0,post=function(){var hh=document.documentElement.scrollHeight;if(hh!==ph){ph=hh;try{parent.postMessage({ecoH:hh},'*')}catch(e){}}};setInterval(post,400);window.addEventListener('load',post)}\nvar API=location.origin+'/app/api/', T=null, ME=null, CUR='', DATA=null, STATS=null, F='all', SORT={k:'wait',d:-1}, SEL={}, RCPT='all';\ntry{T=localStorage.getItem('oaTok')}catch(e){}\nfunction $(id){return document.getElementById(id)}\nfunction esc(s){return String(s==null?'':s).replace(/[&<>\"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]})}\nfunction toast(t){var e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(function(){e.style.display='none'},3500)}\nfunction api(p,o){o=o||{};o.headers=Object.assign({'Content-Type':'application/json'},o.headers||{});if(T)o.headers.Authorization='Bearer '+T;\n  return fetch(API+p,o).then(function(r){if(r.status===401){logout(true);throw new Error('auth')}return r.json()})}\nfunction logout(silent){if(!silent&&T)fetch(API+'logout',{method:'POST',headers:{Authorization:'Bearer '+T}});T=null;try{localStorage.removeItem('oaTok')}catch(e){}$('app').classList.add('hid');$('login').classList.remove('hid')}\n$('bOut').onclick=function(){logout()};\n$('bLogin').onclick=function(){var b=this;b.disabled=true;$('lgSt').textContent='Открываю Telegram…';\n  fetch(API+'login/start',{method:'POST'}).then(function(r){return r.json()}).then(function(j){\n    var w=window.open(j.link,'_blank');if(!w)location.href=j.link;$('lgSt').innerHTML='Нажми «Старт» в&nbsp;боте. Жду подтверждения…';var n=0;\n    var iv=setInterval(function(){if(++n>150){clearInterval(iv);b.disabled=false;$('lgSt').textContent='Время вышло, попробуй ещё раз';return}\n      fetch(API+'login/check?n='+j.nonce).then(function(r){return r.json()}).then(function(c){if(c.token){clearInterval(iv);T=c.token;try{localStorage.setItem('oaTok',T)}catch(e){}b.disabled=false;$('lgSt').textContent='';start()}else if(c.err){clearInterval(iv);b.disabled=false;$('lgSt').textContent='Ссылка устарела, нажми ещё раз'}})},2000)})};\nfunction ago(d){if(!d)return '<span class=\"muted\">—</span>';var n=Math.round((Date.parse(new Date().toISOString().slice(0,10))-Date.parse(d))/864e5);return n<=0?'сегодня':n===1?'вчера':(n>=5?'<span class=\"dn\">'+n+' дн назад</span>':n+' дн назад')}\nfunction idle(s){if(!s.last)return true;return (Date.now()-Date.parse(s.last))/864e5>=5}\nfunction hm(sec){var m=Math.round(sec/60);if(m<60)return m+' мин';var h=Math.floor(m/60);return h+' ч'+(m%60?' '+(m%60)+' мин':'')}\nfunction wtxt(since){var m=Math.round((Date.now()/1000-since)/60);return m<60?m+' мин':Math.floor(m/60)+' ч '+(m%60)+' мин'}\nvar IC={u:'<svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><circle cx=\"9\" cy=\"8\" r=\"4\"/><path d=\"M2 21c1-4 4-6 7-6s6 2 7 6\"/></svg>',t:'<svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><path d=\"M21 4 3 11l6 2 2 6 3-4 5 4z\"/></svg>',c:'<svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></svg>',w:'<svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><path d=\"M21 12a8 8 0 0 1-12 7l-5 1 1.5-4A8 8 0 1 1 21 12z\"/></svg>',z:'<svg width=\"17\" height=\"17\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\"><path d=\"M13 2 4 14h7l-1 8 9-12h-7z\"/></svg>'};\nfunction kp(ic,l,v,d,cls){return '<div class=\"k '+(cls||'')+'\"><span class=\"l\"><span class=\"ic\">'+IC[ic]+'</span>'+l+'</span><span class=\"v\"'+(String(v).indexOf(' / ')>0?' style=\"font-size:21px\"':'')+'>'+v+'</span><span class=\"d\">'+d+'</span></div>'}\nfunction renderK(){var S=DATA.students,tg=S.filter(function(s){return s.tg}).length,wt=S.filter(function(s){return s.wait}),id=S.filter(idle).length;\n  var st=(STATS&&STATS.curators)||[],ans=0,med=[],in2=[];st.forEach(function(c){ans+=c.answered;if(c.median!=null)med.push(c.median);if(c.in2h!=null)in2.push(c.in2h)});\n  var old=wt.length?Math.min.apply(null,wt.map(function(s){return s.wait})):null;\n  $('kpis').innerHTML=kp('u','Ученики',S.length,'из '+DATA.n+' в потоке','on')+kp('t','В Telegram',tg,S.length?Math.round(tg/S.length*100)+'% подключили':'—')\n   +kp('w','Ждут ответа',wt.length,old?'дольше всех '+wtxt(old):'никто не ждёт',wt.length?'bad':'')+kp('c','Медиана ответа',med.length?(st.length>1?st.map(function(c){return c.median!=null?hm(c.median):'—'}).join(' / '):hm(med[0])):'—',(st.length>1?st.map(function(c){return c.full.split(' ')[0]}).join(' / ')+' · ':'')+ans+' ответов за 14 дн')\n   +kp('z','Ответ за 2 часа',in2.length?(st.length>1?st.map(function(c){return c.in2h!=null?c.in2h+'%':'—'}).join(' / '):in2[0]+'%'):'—','цель — 100%')+kp('u','Не заходили 5+ дн',id,'стоит написать им')}\nfunction rowsF(){var q=($('q').value||'').toLowerCase();return DATA.students.filter(function(s){if(q&&s.name.toLowerCase().indexOf(q)<0)return false;\n  if(F==='wait')return !!s.wait;if(F==='idle')return idle(s);if(F==='notg')return !s.tg;return true}).sort(function(a,b){var k=SORT.k,x=a[k],y=b[k];\n  if(k==='place'){x=x||1e9;y=y||1e9;return (x-y)*-SORT.d}if(x==null)x=k==='name'?'':-1e12;if(y==null)y=k==='name'?'':-1e12;return (x>y?1:x<y?-1:0)*SORT.d})}\nfunction renderT(){var R=rowsF(),h='';R.forEach(function(s){var tg=s.tg?'<a class=\"sb\" style=\"height:30px\" target=\"_blank\" href=\"'+(s.tgu?'https://t.me/'+esc(s.tgu):'tg://user?id='+esc(s.tgid))+'\">Написать</a>':'<span class=\"chip\">не подключён</span>';\n  h+='<tr><td><input type=\"checkbox\" class=\"chk\" data-u=\"'+s.uid+'\"'+(SEL[s.uid]?' checked':'')+'></td><td class=\"nm\"><b>'+esc(s.name)+'</b><small>'+(s.tar?esc(s.tar):'тариф —')+(CUR==='all'&&s.cur?' · '+esc(s.cur):'')+'</small></td>'\n  +'<td>'+(s.place?s.place:'—')+'</td><td>'+(s.pts!=null?s.pts:'—')+'</td><td>'+(s.week?'<span class=\"up\">+'+s.week+'</span>':'<span class=\"muted\">0</span>')+'</td>'\n  +'<td>'+(s.lessons!=null?'<span class=\"bar\"><i style=\"width:'+Math.min(100,Math.round(s.lessons/(DATA.total||1)*100))+'%\"></i></span>'+s.lessons+'/'+DATA.total:'—')+'</td><td>'+(s.hw!=null?s.hw:'—')+'</td>'\n  +'<td>'+(s.t7?hm(s.t7):'<span class=\"muted\">0</span>')+'</td><td>'+ago(s.last)+'</td><td>'+(s.wait?'<span class=\"chip bad\">ждёт '+wtxt(s.wait)+'</span>':'<span class=\"chip ok\">ок</span>')+'</td><td>'+tg+'</td></tr>'});\n  $('tb').innerHTML=h||'<tr><td colspan=\"11\" class=\"muted\" style=\"text-align:center;padding:30px\">Никого</td></tr>';var n=Object.keys(SEL).length;$('selN').textContent=n?('Выбрано: '+n):'';$('bSelMsg').classList.toggle('hid',!n)}\n$('tb').onchange=function(e){var u=e.target.getAttribute('data-u');if(!u)return;if(e.target.checked)SEL[u]=1;else delete SEL[u];renderT()};\n$('chkAll').onchange=function(){var on=this.checked;rowsF().forEach(function(s){if(on)SEL[s.uid]=1;else delete SEL[s.uid]});renderT()};\n$('q').oninput=renderT;\ndocument.querySelectorAll('#flt button').forEach(function(b){b.onclick=function(){document.querySelectorAll('#flt button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');F=b.getAttribute('data-f');renderT()}});\ndocument.querySelectorAll('th[data-s]').forEach(function(th){th.onclick=function(){var k=th.getAttribute('data-s');SORT={k:k,d:SORT.k===k?-SORT.d:(k==='name'?1:-1)};renderT()}});\ndocument.querySelectorAll('#tabs button').forEach(function(b){b.onclick=function(){document.querySelectorAll('#tabs button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');\n  document.querySelectorAll('.tab').forEach(function(x){x.classList.add('hid')});$('t-'+b.getAttribute('data-t')).classList.remove('hid');if(b.getAttribute('data-t')==='bc'){upPrev();loadLog()}}});\n$('bSelMsg').onclick=function(){setR('sel');document.querySelector('#tabs [data-t=bc]').click()};\nfunction setR(r){RCPT=r;document.querySelectorAll('#bcTo button').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-r')===r)});upPrev()}\ndocument.querySelectorAll('#bcTo button').forEach(function(b){b.onclick=function(){setR(b.getAttribute('data-r'))}});\nvar SITE='https://oduvanovroman.getcourse.ru',LK=[['Рейтинг',SITE+'/teach/control/stream/view/id/935952152'],['Расписание',SITE+'/teach/control/schedule'],['Курс 2.0',SITE+'/teach/control/stream/view/id/935917158'],['Мои покупки',SITE+'/sales/control/userProduct/my']];\n$('bcLinks').innerHTML=LK.map(function(l,i){return '<button class=\"sb\" style=\"height:30px\" data-i=\"'+i+'\">'+l[0]+'</button>'}).join('');\n$('bcLinks').onclick=function(e){var i=e.target.getAttribute('data-i');if(i==null)return;$('bcBtn').value='Открыть: '+LK[i][0];$('bcLink').value=LK[i][1];upPrev()};\nfunction rcpt(){var S=DATA.students;if(RCPT==='idle')return S.filter(idle);if(RCPT==='sel')return S.filter(function(s){return SEL[s.uid]});return S}\nfunction upPrev(){if(!DATA)return;var R=rcpt(),tg=R.filter(function(s){return s.tg});$('bcWho').textContent=ME.role==='admin'?'Роман':(ME.name||'Куратор');var t=$('bcText').value.trim();$('bcPT').textContent=t||'Текст сообщения';$('bcPT').className=t?'':'muted';\n  var bt=$('bcBtn').value.trim(),bl=$('bcLink').value.trim();$('bcPB').textContent=bt||'Открыть';$('bcPB').classList.toggle('hid',!/^https:\\/\\//.test(bl));\n  $('bcInfo').textContent='Получат: '+tg.length+(R.length-tg.length?' · без Telegram: '+(R.length-tg.length):'');$('bSend').disabled=!t||!tg.length}\n['bcText','bcBtn','bcLink'].forEach(function(id){$(id).oninput=upPrev});\n$('bSend').onclick=function(){var R=rcpt(),tg=R.filter(function(s){return s.tg}),b=this;if(!confirmBox(tg.length))return;b.disabled=true;\n  var uids=tg.map(function(s){return s.uid}),bid=Math.random().toString(36).slice(2),sent=0,fail=0,i=0;\n  (function next(){if(i>=uids.length){toast('Отправлено: '+sent+(fail?' · не дошло: '+fail:''));$('bcText').value='';upPrev();loadLog();return}\n    var part=uids.slice(i,i+35);i+=35;$('bcInfo').textContent='Отправляю… '+Math.min(i,uids.length)+'/'+uids.length;\n    api('broadcast',{method:'POST',body:JSON.stringify({c:CUR,uids:part,text:$('bcText').value,btn:$('bcBtn').value,link:$('bcLink').value,bid:bid,noTg:R.length-tg.length})}).then(function(j){sent+=j.sent||0;fail+=j.fail||0;next()}).catch(function(){toast('Ошибка отправки');upPrev()})})()};\nfunction confirmBox(n){var b=$('bSend');if(b._arm){b._arm=0;b.textContent='Отправить';return true}b._arm=1;b.textContent='Точно отправить '+n+'?';setTimeout(function(){b._arm=0;b.textContent='Отправить'},4000);return false}\nfunction loadLog(){api('bclog?c='+CUR).then(function(j){$('bcLog').innerHTML=(j.log||[]).slice(0,8).map(function(l){return '<div><span class=\"muted\" style=\"width:86px;flex:none\">'+new Date(l.at).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+'</span><span style=\"flex:1\">'+esc(l.text)+'</span><span class=\"up\" style=\"flex:none\">'+l.sent+' ✓</span></div>'}).join('')||'<span class=\"muted\">Пока не было</span>'})}\nfor(var h=0;h<=24;h++){$('hFrom').insertAdjacentHTML('beforeend','<option value=\"'+h+'\">'+h+':00</option>');$('hTo').insertAdjacentHTML('beforeend','<option value=\"'+h+'\">'+h+':00</option>')}\n$('bHours').onclick=function(){var f=+$('hFrom').value,t=+$('hTo').value;if(f>=t){$('hInfo').textContent='Начало должно быть раньше конца';return}\n  api('hours',{method:'POST',body:JSON.stringify({c:CUR,from:f,to:t})}).then(function(j){$('hInfo').textContent=j.ok?'Сохранено: с '+f+':00 до '+t+':00 МСК':'Не сохранилось';load()})};\nvar ALL=null,STALL=null;\nfunction view(){if(ME.role!=='admin'||!ALL){return}var v=CUR;DATA={n:ALL.n,total:ALL.total,students:v==='all'?ALL.students:ALL.students.filter(function(s){return s.cur===v})};\n  STATS={curators:v==='all'?STALL.curators:STALL.curators.filter(function(c){return c.id===v})};renderAll()}\nfunction renderAll(){renderK();renderT();upPrev();var c=(STATS.curators||[])[0];if(c&&c.hours&&CUR!=='all'){$('hFrom').value=c.hours[0];$('hTo').value=c.hours[1]}\n  $('t-hr').querySelector('.card').style.opacity=CUR==='all'?.4:1;if($('t-bc').classList.contains('hid')===false)loadLog()}\nfunction load(){$('upd').textContent='Обновляю…';var c=ME.role==='admin'?'all':CUR;\n  Promise.all([api('students?c='+c),api('stats?c='+c)]).then(function(a){if(ME.role==='admin'){ALL=a[0];STALL=a[1];view()}else{DATA=a[0];STATS=a[1];renderAll()}\n  $('upd').textContent='Обновлено '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}).catch(function(e){$('upd').textContent='Не загрузилось: '+e.message})}\nfunction start(){api('me').then(function(m){ME=m;$('login').classList.add('hid');$('app').classList.remove('hid');\n  if(m.role==='admin'){CUR=CUR||'all';$('hTitle').textContent='Кураторы';$('hSub').textContent='Все ученики, ответы кураторов и рассылки';var sg=$('curSeg');sg.classList.remove('hid');\n    sg.innerHTML='<button data-c=\"all\">Все</button>'+m.curators.map(function(c){return '<button data-c=\"'+c.id+'\">'+esc(c.full.split(' ')[0])+'</button>'}).join('');\n    sg.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-c')===CUR);b.onclick=function(){CUR=b.getAttribute('data-c');SEL={};sg.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)});view()}})}\n  else{CUR=m.cid;$('hTitle').textContent='Пульт куратора';$('hSub').textContent=(m.name||'')+' · твои ученики, ответы и рассылки'}\n  load();setInterval(load,120000)}).catch(function(){})}\nif(T)start();else $('login').classList.remove('hid');\n})();\n</script></body></html>\n";

/* ---------- Мини-апп Telegram (gc/app.html на GitHub Pages) ----------
   Вход: initData от Telegram (подпись бота) → ученик по student.tg_chat → токены v42 (t — запись, v — чтение).
   /ma/home — всё для вкладок «Учёба», «Ещё»; /ma/top — рейтинг; /ma/ai — Нейро-Одуванов для ученика (лимит в день). */
const MA_AI_DAY = 40, MA_IMG_DAY = 5;
async function tgInitCheck(env, init) { /* https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app */
  if (!env.TG_TOKEN || !init) return null; const p = new URLSearchParams(init), hash = p.get('hash'); if (!hash) return null; p.delete('hash');
  const dcs = [...p.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v]) => k + '=' + v).join('\n');
  const k1 = await crypto.subtle.importKey('raw', enc('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sec = await crypto.subtle.sign('HMAC', k1, enc(env.TG_TOKEN));
  const k2 = await crypto.subtle.importKey('raw', sec, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  if (!same(hexOf(await crypto.subtle.sign('HMAC', k2, enc(dcs))), hash)) return null;
  if (Date.now() / 1000 - (+p.get('auth_date') || 0) > 7 * 86400) return null;
  try { return JSON.parse(p.get('user') || 'null') } catch (e) { return null } }
const RANKS_MA = [[0, 'Новичок'], [150, 'Джуниор'], [500, 'Фрилансер'], [1000, 'Арт-директор'], [1700, 'Владелец студии'], [2500, 'Дизайнер-миллионер']];
function rankOf(pts) { let rank = RANKS_MA[0][1], next = null, from = 0; for (const [p, t] of RANKS_MA) { if (pts >= p) { rank = t; from = p } else { next = { title: t, at: p, need: p - pts }; break } } return { rank, from, next } }
/* /ma/learn: ответ по CONTRACT.md из данных сборщика (D.modules — общее; r.done/hwa/oth/tar/acc — строка самого ученика) */
const isoZ = v => { const t = typeof v === 'number' ? v : v ? Date.parse(v) : NaN; return isNaN(t) ? null : new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z') };
const updAt = D => D.at || (String(D.updated || '').match(/^(\d\d)\.(\d\d)\.(\d{4}) (\d\d:\d\d)/) ? isoZ(D.updated.replace(/^(\d\d)\.(\d\d)\.(\d{4}) (\d\d:\d\d).*/, '$3-$2-$1T$4:00+03:00')) : null);
const accOf = (a, now) => !a || a === 'inf' ? null : /^\d{4}-\d\d-\d\d$/.test(a) ? (a < new Date(now + 3 * 36e5).toISOString().slice(0, 10) ? 'dead' : a) : null;
const LEARN_COURSE = { id: 935917158, name: 'AI-креатор с 0 до PRO', stream: '2.0' }, AMAZON_MOD = 935917189, HW_MAX = 70;
function learnMods(D) { const L = (D.modules || []).slice(), ai = L.findIndex(m => m.amazon || +m.id === AMAZON_MOD); if (ai < 0) return L; /* Amazon — сразу после Модуля 06 */
  const [a] = L.splice(ai, 1), i6 = L.findIndex(m => /^Модуль 06\b/.test(m.name || '')); L.splice(i6 < 0 ? L.length : i6 + 1, 0, a); return L }
function learnX2(D, m, now) { const x = D.x2; if (x && x.module && x.module === m.name) return { lessons_until: isoZ(x.lessons_until), hw_until: isoZ(x.hw_until) };
  const at = m.at ? Date.parse(m.at) : NaN; return !isNaN(at) && at <= now && now < at + 72 * 36e5 ? { lessons_until: isoZ(at + 48 * 36e5), hw_until: isoZ(at + 72 * 36e5) } : null }
const LIDS = new WeakMap(); /* id уроков курса и других тренингов (для проверки маяка), на объект D */
function lessonIds(D) { let S = LIDS.get(D); if (!S) { S = new Set(); for (const m of D.modules || []) for (const p of m.parts || []) for (const l of p.lessons || []) S.add(+l.id); for (const o of D.other || []) for (const i of o.items || []) S.add(+i.id); LIDS.set(D, S) } return S }
function learnOf(D, r, now, lv) { const done = new Set((r.done || []).map(Number)), LV = new Set(lv || []), hwa = r.hwa || {}, tar = r.tar || null, amazon = tar === 'Премиум Амазон';
  const modules = learnMods(D).map(m => { const am = !!m.amazon || +m.id === AMAZON_MOD, nm = String(m.name || '').match(/^Модуль (\d+)\s*—\s*(.+)$/);
    return { id: m.id, n: am ? null : nm ? nm[1] : null, key: am ? 'amazon' : nm ? 'm' + nm[1] : null, title: am ? 'Amazon' : nm ? nm[2] : (m.name || ''), desc: m.desc || '', at: isoZ(m.at), premium: am, access: !am || amazon, x2: learnX2(D, m, now),
      parts: (m.parts || []).filter(p => (p.lessons || []).length).map((p, i) => ({ id: p.id || null, n: p.n || i + 1, title: p.title || String(p.name || '').split(' / ').pop() || (nm ? nm[2] : m.name), lessons: (p.lessons || []).map(l => { const k = l.kind || (/^Анкета/i.test(l.t) ? 'anketa' : 'lesson'), h = k === 'hw' ? hwa[String(l.id)] || null : null;
        const o = { id: l.id, t: l.t, kind: k, stop: !!l.stop, at: isoZ(l.at || p.at), done: done.has(+l.id) || (k === 'lesson' && LV.has(+l.id)) || !!(h && h.st !== 'dr') }; if (k === 'anketa' && l.about) o.about = l.about; if (k === 'hw') { o.hwMax = HW_MAX; o.hw = h ? { st: h.st, lv: h.lv || null, pts: h.pts | 0 } : null } return o }) })) } });
  /* cur — граница прогресса: последний пройденный урок по порядку курса (Amazon — только в тарифе), дальше первый открытый непройденный; ничего не пройдено — первый открытый.
     Закрытые по дате пропускаются; если перед ним в той же части есть непройденный стоп-урок — cur он. Впереди нечего — первый открытый непройденный с начала, иначе null */
  const seq = [], opn = l => !l.at || Date.parse(l.at) <= now; for (const m of modules) if (m.access) for (const p of m.parts) p.lessons.forEach((l, i) => seq.push({ m, p, l, i }));
  let last = -1; seq.forEach((x, i) => { if (x.l.done) last = i }); const pick = x => { if (!x) return null; const s0 = x.p.lessons.slice(0, x.i).find(l => l.stop && !l.done && opn(l)); return { module: x.m.id, part: x.p.id, lesson: (s0 || x.l).id } };
  const cur = pick(last >= 0 ? seq.slice(last + 1).find(x => opn(x.l) && !x.l.done) : seq.find(x => opn(x.l) && !x.l.done)); /* 28.10: впереди всё пройдено — не отправляем назад к пропущенным урокам Модуля 00, «Дальше по курсу» не показываем */
  const oth = r.oth || {}, other = (D.other || []).filter(o => oth[String(o.id)] != null).map(o => { const it = (o.items || []).map(i => ({ id: i.id, t: i.t, done: done.has(+i.id) || LV.has(+i.id) })); /* цен нет — не отдаём */
    return { id: o.id, title: o.title, key: o.key || null, kind: o.kind || 'bonus', rec: o.kind === 'rec', lessons: o.lessons | 0 || it.length, done: it.length ? it.filter(i => i.done).length : Math.min(oth[String(o.id)] | 0, o.lessons | 0 || 1e9), acc: null, items: it } });
  return { ok: true, now: isoZ(now), tar, amazon, acc: accOf(r.acc, now), course: Object.assign({}, LEARN_COURSE, D.course || {}, { modules }), other, cur, updated: updAt(D) } }
async function maApi(env, req, path) {
  const u = new URL(req.url);
  if (path === '/ma/auth' && req.method === 'POST') { await ensure(env); const o = JSON.parse(await req.text() || '{}'); const tu = await tgInitCheck(env, String(o.init || ''));
    if (!tu || !tu.id) return json(req, { ok: false, err: 'init' }, 401);
    await saveTgUser(env, tu);
    /* команда школы (админ из tg_admin, куратор из cur_tg) — тот же интерфейс + режим команды: сессия как в пульте (роль проверяет сервер) */
    const [adm, cur] = await env.DB.batch([env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(String(tu.id)), env.DB.prepare('SELECT cid FROM cur_tg WHERE tg_id=?').bind(String(tu.id))]).then(r => r.map(x => (x.results || [])[0]));
    if (adm || cur) { const role = adm ? 'admin' : 'curator', cid = cur ? cur.cid : null, cc = cid && CURATORS.find(x => x.id === cid);
      const suid = adm ? +String(env.ADMIN_UIDS || '499631257').split(/[\s,]+/)[0] : (cc ? cc.uid : 0); const nm = [tu.first_name, tu.last_name].filter(Boolean).join(' ');
      const tok = rnd(); await kvPut(env, 'sess:' + tok, { role, cid, uid: null, chat: String(tu.id), name: nm, exp: Date.now() + APP_SESS_DAYS * 864e5 });
      await logIt(env, 'ma-staff', suid, role + ' ' + tu.id);
      return json(req, { ok: true, u: suid, t: await mkToken(env, 'a', String(suid)), v: await mkToken(env, 'v', String(suid)), name: tu.first_name || nm, staff: { role, cid, s: tok } }, 200, { 'Cache-Control': 'no-store' }) }
    const s = await env.DB.prepare('SELECT uid, name FROM student WHERE tg_chat=?').bind(String(tu.id)).first();
    if (!s) return json(req, { ok: false, err: 'nolink', name: tu.first_name || '' });
    return json(req, { ok: true, u: s.uid, t: await mkToken(env, 'a', String(s.uid)), v: await mkToken(env, 'v', String(s.uid)), name: s.name || tu.first_name || '' }, 200, { 'Cache-Control': 'no-store' }) }
  /* диагностика «случайного выхода»: страница кабинета в мини-аппе показала вход (без личных данных, ключи в адресе вырезаны) */
  if (path === '/ma/diag' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
    await logIt(env, 'tg-diag', +o.u || 0, JSON.stringify({ k: String(o.kind || '').slice(0, 20), eu: +o.eu || undefined, sub: o.sub ? 1 : undefined, p: String(o.page || '').slice(0, 200), r: String(o.ref || '').slice(0, 200), hl: +o.hl || 0, ua: String(o.ua || '').slice(0, 160) }));
    return json(req, { ok: true }) }
  /* «Смотреть как ученик» — выдаёт токен просмотра. Сессия команды (мини-апп/пульт): админ — любого, куратор — своих. Журнал входов. */
  if (path === '/ma/viewas' && req.method === 'POST') { const st = await appSession(env, req); if (!st || (st.role !== 'admin' && st.role !== 'curator')) return deny(req);
    let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {} const target = +o.u || 0;
    if (o.end) { const L = (await kvGet(env, 'valog')) || []; const x = L.find(y => y.id === o.end); if (x && !x.until) { x.until = new Date().toISOString(); await kvPut(env, 'valog', L) } return json(req, { ok: true }) }
    if (!target) return json(req, { ok: false, err: 'Укажи ученика' }, 400);
    const sr = await env.DB.prepare('SELECT uid, name, curator FROM student WHERE uid=?').bind(target).first(), D = await loadData(env), r = (D.rows || []).find(x => +x.uid === target);
    if (st.role === 'curator' && (!sr || sr.curator !== st.cid)) return json(req, { ok: false, err: 'Это не твой ученик' }, 403);
    if (!sr && !r) return json(req, { ok: false, err: 'Ученик не найден' }, 404);
    const staffUid = st.role === 'admin' ? +String(env.ADMIN_UIDS || '499631257').split(/[\s,]+/)[0] : ((CURATORS.find(c => c.id === st.cid) || {}).uid || 0);
    const id = rnd().slice(0, 12), c = sr && sr.curator && CURATORS.find(x => x.id === sr.curator), L = (await kvGet(env, 'valog')) || [];
    L.unshift({ id, who: st.name || st.role, role: st.role, chat: st.chat || null, target, name: (r && r.name) || (sr && sr.name) || null, at: new Date().toISOString() }); await kvPut(env, 'valog', L.slice(0, 300));
    await logIt(env, 'viewas', target, st.role + ' ' + (st.name || ''));
    return json(req, { ok: true, id, w: await mkView(env, target, staffUid), who: { uid: target, name: (r && r.name) || (sr && sr.name) || null, tar: (r && r.tar) || null, curName: c ? c.full : null } }, 200, { 'Cache-Control': 'no-store' }) }
  /* маяк «урок открыт»: POST /ma/lv {l, t} (t — токен записи ученика: FS_CALL/sendBeacon кладут его в тело) или ?t= / Bearer; команда и «смотреть как» не пишутся.
     Пишутся только уроки курса и других тренингов из данных сборщика */
  if (path === '/ma/lv' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
    const tk = u.searchParams.get('t') || (req.headers.get('Authorization') || '').replace(/^Bearer\s+/, '') || String(o.t || ''); if (/\.w\./.test(tk)) return json(req, { ok: true });
    const lu = await authUid(env, tk, 'a'); if (!lu) return deny(req); if (isStaffUid(env, lu)) return json(req, { ok: true });
    const l = +o.l; if (!okUid(l)) return json(req, { ok: false, err: 'l' }, 400); let D = null; try { D = await loadData(env) } catch (e) {}
    if (!D || !lessonIds(D).has(l)) return json(req, { ok: true, skip: 1 });
    await ensure(env); await env.DB.prepare('INSERT OR IGNORE INTO lv (uid, lesson, at) VALUES (?,?,?)').bind(lu, l, new Date().toISOString()).run(); return json(req, { ok: true }) }
  const TK = u.searchParams.get('t') || (req.headers.get('Authorization') || '').replace(/^Bearer\s+/, ''), VW = /\.w\./.test(TK) ? await viewTok(env, TK) : null;
  const uid = await authUid(env, TK, 'av'); if (!uid) return deny(req);
  if (path === '/ma/ev' && req.method === 'POST') { if (VW || isStaffUid(env, uid)) return json(req, { ok: true }); let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
    const ks = (Array.isArray(o.k) ? o.k : [o.k]).map(k => String(k || '').replace(/[^\wа-яё:. -]/gi, '').slice(0, 64)).filter(Boolean).slice(0, 10), d = dayStr();
    if (ks.length) { await ensure(env); await env.DB.batch(ks.map(k => env.DB.prepare('INSERT INTO ev (day, uid, k, n) VALUES (?,?,?,1) ON CONFLICT(day, uid, k) DO UPDATE SET n=n+1').bind(d, uid, k))) }
    return json(req, { ok: true }) }
  /* что бот присылает ученику: {cur, hw, efir, lessons, rating, bank} 1|0 (+ quiet [с, до] часов МСК); ответ куратора (cur) выключить нельзя */
  if (path === '/ma/notif') { if (req.method === 'POST') { if (VW) return json(req, { ok: false, err: 'Режим просмотра — только чтение' }, 403); let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
      const N = await notifGet(env, uid); for (const k of Object.keys(NOTIF_DEF)) if (o[k] != null) N[k] = o[k] && o[k] !== '0' ? 1 : 0; N.cur = 1;
      if (o.quiet !== undefined) N.quiet = Array.isArray(o.quiet) && o.quiet.length === 2 && o.quiet.every(h => h >= 0 && h <= 24) ? o.quiet.map(h => h | 0) : null;
      await kvPut(env, 'notif:' + uid, N) }
    return json(req, Object.assign({ ok: true }, await notifGet(env, uid)), 200, { 'Cache-Control': 'no-store' }) }
  /* флаги интерфейса (баннер «иконка на экране» и подсказки): сервер — запасная копия CloudStorage Telegram */
  if (path === '/ma/flag') { const k = 'flags:' + uid, F = (await kvGet(env, k)) || {};
    if (req.method === 'POST' && !VW) { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {} const key = String(o.k || '').replace(/[^a-z0-9_]/gi, '').slice(0, 30); if (key) { F[key] = { v: String(o.v || '').slice(0, 30), at: Date.now(), n: ((F[key] && F[key].n) || 0) + 1 }; await kvPut(env, k, F) } }
    return json(req, { ok: true, flags: F }) }
  if (path === '/ma/home') { const D = await loadData(env), r = await rowFor(D, uid) || {}, now = Date.now();
    const s = await env.DB.prepare('SELECT * FROM student WHERE uid=?').bind(uid).first() || {}; const c = s.curator && CURATORS.find(x => x.id === s.curator);
    const today = dayStr(), t7 = await timeSum(env, uid, addDays(today, -6), today), tAll = await timeSum(env, uid, '2000-01-01', today);
    const pts = r.pts | 0, rk = rankOf(pts);
    const mods = (D.modules || []).map(m => ({ id: m.id, name: m.name, desc: m.desc, at: m.at, open: m.at ? Date.parse(m.at) <= now : false, amazon: !!m.amazon,
      lessons: (m.parts || []).reduce((a, p) => a + (p.lessons || []).length, 0), first: ((m.parts || []).find(p => (p.lessons || []).length) || { lessons: [{}] }).lessons[0].id || null }));
    let cur = null; if (c) { const h = await curHours(env, c.id), dd = await curDays(env, c.id); cur = Object.assign(curPub(c), { tg: await curTg(env, c.id), hours: h, days: dd, online: curOn(h, dd), next: curNext(h, dd) }) }
    const flags = (await kvGet(env, 'flags:' + uid)) || {}, mod = VW ? null : await modState(env, uid);
    return json(req, { ok: true, view: VW ? { staff: VW.staff } : null, flags, mod: mod && (mod.until > Date.now() || mod.banned) ? { until: mod.until, banned: !!mod.banned, left: Math.max(0, MOD_CFG(env).steps.length - mod.step) } : null, me: { uid, name: r.name || s.name || '', tar: r.tar || null, acc: r.acc || null, place: r.place || null, n: D.n, pts, week: r.week | 0, lessons: r.lessons | 0, total: D.total_lessons, hw: r.hw | 0, ontime: r.ontime == null ? null : r.ontime, rank: rk.rank, rankFrom: rk.from, next: rk.next, t7: t7.site + t7.video, tAll: tAll.site + tAll.video },
      x2: D.x2 || null, modules: mods, cur, updated: D.updated || null }, 200, { 'Cache-Control': 'no-store' }) }
  /* «Учёба в приложении» (CONTRACT.md, этап 1): курс → модули → части → уроки со статусом ученика; только его данные (VW — просматриваемого) */
  if (path === '/ma/learn') { let D = null; try { D = await loadData(env) } catch (e) {}
    const r = D && Array.isArray(D.modules) && D.modules.length ? await rowFor(D, uid) : null; let lv = [];
    try { lv = ((await env.DB.prepare('SELECT lesson FROM lv WHERE uid=?').bind(uid).all()).results || []).map(x => +x.lesson) } catch (e) {} /* таблицы ещё нет — до первого маяка */
    return json(req, D && D.modules && D.modules.length ? learnOf(D, r || {}, Date.now(), lv) : { ok: true, course: null, reason: 'nodata' }, 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/ma/top') { const D = await loadData(env), rows = (D.rows || []).slice().sort((a, b) => (a.place || 1e9) - (b.place || 1e9)); const me = await rowFor(D, uid); const mp = me && me.place || null;
    const pick = (x, i) => ({ place: x.place, name: x.name, pts: x.pts | 0, week: x.week | 0, rank: rankOf(x.pts | 0).rank, me: me ? x === me : false });
    const top = rows.slice(0, 10).map(pick), near = mp && mp > 10 ? rows.filter(x => x.place >= mp - 2 && x.place <= mp + 2).map(pick) : [];
    return json(req, { ok: true, n: D.n, top, near, me: me ? pick(me) : null, ranks: RANKS_MA.map(([p, t]) => ({ t, p })) }, 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/ma/ai' && req.method === 'POST') { const o = JSON.parse(await req.text() || '{}'); const text = String(o.text || '').trim().slice(0, 2000), img = typeof o.img === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(o.img) ? o.img : null;
    const HK = VW ? 'mahva:' + VW.staff + ':' + uid : 'mah:' + uid; /* в режиме просмотра — отдельный тестовый диалог команды */
    if (o.reset) { await kvDel(env, VW ? HK : 'mah:' + uid); return json(req, { ok: true }) }
    if (!text && !img) return json(req, { ok: false, err: 'empty' }, 400);
    const staff = !!VW || isStaffUid(env, uid);
    /* защита от спама и сообщений не по делу — до нейросети и до дневного лимита */
    let M = null; if (!staff) { M = await modCheck(env, uid, text, !!img); if (M.block) return json(req, Object.assign({ ok: false }, M.block)); if (M.reply) return json(req, { ok: true, text: M.reply, mod: M.mod, quick: [] }) }
    const dk = 'mal:' + uid + ':' + dayStr(), cnt = VW ? { m: 0, i: 0 } : ((await kvGet(env, dk)) || { m: 0, i: 0 });
    if (cnt.m >= MA_AI_DAY) return json(req, { ok: false, err: 'limit', text: 'На сегодня вопросы закончились (' + MA_AI_DAY + ' в день). Завтра продолжим, а срочное — напиши куратору.' });
    if (img && cnt.i >= MA_IMG_DAY) return json(req, { ok: false, err: 'limit', text: 'Разборы картинок на сегодня закончились (' + MA_IMG_DAY + ' в день). Завтра — с радостью.' });
    let content = text; if (img) { const m = img.match(/^data:(image\/\w+);base64,(.*)$/); if (m[2].length > 2.8e6) return json(req, { ok: false, err: 'big', text: 'Картинка слишком большая.' });
      content = [{ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } }, { type: 'text', text: text || 'Разбери мою работу.' }] }
    const hist = (await kvGet(env, HK)) || (VW ? ((await kvGet(env, 'mah:' + uid)) || []).slice(-6) : []);
    const R = await aiTurn(env, { uid, history: hist, user: content, cf: req.cf });
    if (R.err) { const adm = isStaffUid(env, uid) || (VW && isStaffUid(env, VW.staff)); /* ошибка нейросети — не нарушение и не расход лимита */
      return json(req, { ok: false, err: 'ai', code: adm ? R.err : null, text: 'Сейчас технические неполадки — возможно, мы как раз что-то улучшаем. Попробуй через несколько минут. Если не заработает долго — напиши в Заботу о студентах.' }) }
    const QR = aiQuick(R.text);
    hist.push({ role: 'user', content: (img ? '[прислал картинку] ' : '') + text }, { role: 'assistant', content: QR.text }); await kvPut(env, HK, hist.slice(-12));
    if (!VW) { cnt.m++; if (img) cnt.i++; await kvPut(env, dk, cnt); if (M && M.ok) await modOk(env, uid) }
    await logIt(env, VW ? 'ai-ma-view' : 'ai-ma', uid, JSON.stringify({ in: R.usage.in, cache: R.usage.cache, out: R.usage.out, img: !!img }));
    const mid = rnd().slice(0, 12); await aiMidSave(env, HK, { mid, q: ((img ? '[картинка] ' : '') + text).slice(0, 800), a: QR.text.slice(0, 3000), tools: (R.tools || []).join(','), at: Date.now() });
    return json(req, { ok: true, mid, text: QR.text, quick: QR.quick, curator: R.curator || null, left: VW ? null : MA_AI_DAY - cnt.m }) }
  /* оценка ответа 👍/👎 (по желанию с причиной) */
  if (path === '/ma/aifb' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
    const HK = VW ? 'mahva:' + VW.staff + ':' + uid : 'mah:' + uid, L = (await kvGet(env, 'aimid:' + HK)) || [], m = L.find(x => x.mid === String(o.mid || ''));
    if (!m) return json(req, { ok: false, err: 'old' }, 404); const v = +o.v > 0 ? 1 : -1, why = String(o.why || '').trim().slice(0, 500) || null;
    await aiFbEnsure(env);
    await env.DB.prepare('INSERT INTO ai_fb (uid, mid, vote, why, q, a, tools, view, at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(uid, mid) DO UPDATE SET why=CASE WHEN excluded.why IS NOT NULL THEN excluded.why WHEN excluded.vote<>ai_fb.vote THEN NULL ELSE ai_fb.why END, vote=excluded.vote, at=excluded.at')
      .bind(uid, m.mid, v, why, m.q, m.a, m.tools || '', VW ? 1 : 0, Date.now()).run();
    return json(req, { ok: true }) }
  if (path === '/ma/hist') { const M1 = (await kvGet(env, 'aimid:mah:' + uid)) || [], M2 = VW ? (await kvGet(env, 'aimid:mahva:' + VW.staff + ':' + uid)) || [] : [];
    const mf = (L, s) => { const x = typeof s === 'string' && L.find(y => y.a === s.slice(0, 3000)); return x ? x.mid : null };
    return json(req, { ok: true, view: !!VW, hist: ((await kvGet(env, 'mah:' + uid)) || []).map(x => Object.assign({}, x, { _m: x.role === 'assistant' && !VW ? mf(M1, x.content) : null })).concat(VW ? ((await kvGet(env, 'mahva:' + VW.staff + ':' + uid)) || []).map(x => Object.assign({}, x, { test: 1, _m: x.role === 'assistant' ? mf(M2, x.content) : null })) : []).map(x => ({ role: x.role, text: typeof x.content === 'string' ? x.content : '', test: !!x.test, mid: x._m || undefined })) }) }
  return json(req, { ok: false, err: 'not found' }, 404);
}


/* ---------- Мой банк и Мои заказы (gc/bank.html, вкладка «Банк» мини-аппа, пульт) ----------
   Кто: ученик по токену мини-аппа (v42, 'a') или по сессии сайта (role 'student') — свой банк, запись и чтение.
        Команда (сессия пульта или мини-аппа: admin / curator) — банк ученика ?u=<uid> только для чтения; куратор — только своих.
   Приватность: клиент, Telegram клиента, ТЗ/заметки и файлы видит только сам ученик. Команде сервер отдаёт «скрыто».
   Валюта: RUB / USD / EUR. Сумма хранится в своей валюте + rub — пересчёт по курсу ЦБ РФ на дату оплаты (кеш курса в kv на день).
   Дедлайн: 'YYYY-MM-DD' или 'YYYY-MM-DDTHH:MM' (местное время ученика) + dl_tz (IANA-пояс ученика). */
const BANK_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS bank_tx (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER NOT NULL, amount INTEGER NOT NULL, day TEXT NOT NULL, what TEXT, src TEXT, client TEXT, order_id INTEGER, file_id INTEGER, at TEXT)',
  'CREATE INDEX IF NOT EXISTS bank_tx_uid ON bank_tx (uid, day)',
  'CREATE TABLE IF NOT EXISTS bank_order (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER NOT NULL, client TEXT, tg TEXT, product TEXT, price INTEGER, deadline TEXT, status TEXT, brief TEXT, src TEXT, at TEXT, upd TEXT)',
  'CREATE INDEX IF NOT EXISTS bank_order_uid ON bank_order (uid, status)',
  'CREATE TABLE IF NOT EXISTS bank_file (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER NOT NULL, kind TEXT, ref INTEGER, name TEXT, mime TEXT, size INTEGER, data TEXT, at TEXT)',
  'CREATE INDEX IF NOT EXISTS bank_file_ref ON bank_file (uid, kind, ref)'];
const BANK_ALTER = ["ALTER TABLE bank_tx ADD COLUMN cur TEXT", "ALTER TABLE bank_tx ADD COLUMN rub INTEGER", "ALTER TABLE bank_tx ADD COLUMN rate REAL",
  "ALTER TABLE bank_order ADD COLUMN cur TEXT", "ALTER TABLE bank_order ADD COLUMN dl_tz TEXT",
  /* 29.10: подтверждение куратором (баллы только за conf=1), мягкое удаление (del_at, мс), ожидаемая оплата заказа и напоминание */
  "ALTER TABLE bank_tx ADD COLUMN conf INTEGER DEFAULT 0", "ALTER TABLE bank_tx ADD COLUMN conf_by TEXT", "ALTER TABLE bank_tx ADD COLUMN conf_at TEXT", "ALTER TABLE bank_tx ADD COLUMN del_at INTEGER",
  "ALTER TABLE bank_order ADD COLUMN pay_at TEXT", "ALTER TABLE bank_order ADD COLUMN remind_at TEXT", "ALTER TABLE bank_order ADD COLUMN reminded TEXT",
  /* 30.10 QA №34: чек-лист заказа (JSON [{t,ok}], ≤ 20 пунктов; колонка chk — слово CHECK в SQLite зарезервировано, в API поле называется check) и «ждёт предоплату» */
  "ALTER TABLE bank_order ADD COLUMN chk TEXT", "ALTER TABLE bank_order ADD COLUMN prepay INTEGER DEFAULT 0"];
let BANK_OK = false;
async function bankEnsure(env) { if (BANK_OK) return; await env.DB.batch(BANK_SCHEMA.concat(BKS_SCHEMA).map(s => env.DB.prepare(s)));
  const [c1, c2] = await env.DB.batch([env.DB.prepare("SELECT name FROM pragma_table_info('bank_tx')"), env.DB.prepare("SELECT name FROM pragma_table_info('bank_order')")]);
  const has = { bank_tx: (c1.results || []).map(r => r.name), bank_order: (c2.results || []).map(r => r.name) };
  for (const a of BANK_ALTER) { const t = a.split(' ')[2], c = a.split(' ADD COLUMN ')[1].split(' ')[0]; if (!has[t].includes(c)) { try { await env.DB.prepare(a).run() } catch (e) {} } }
  BANK_OK = true }
const B_ST = ['new', 'work', 'review', 'done', 'cancel'], B_CUR = ['RUB', 'USD', 'EUR'], B_HIDDEN = 'скрыто';
const bInt = v => Math.max(0, Math.min(1e9, Math.round(+String(v == null ? '' : v).replace(/[^\d.,]/g, '').replace(',', '.') || 0)));
const bStr = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const bDay = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : dayStr();
const bCur = v => B_CUR.includes(String(v || '').toUpperCase()) ? String(v).toUpperCase() : 'RUB';
const bDl = v => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(String(v || '')) ? String(v) : null;
/* чек-лист заказа: [{t: ≤ 80 символов, ok: 0|1}], не больше 20 пунктов, пустые пункты отбрасываются; хранится JSON-строкой */
function bChk(v) { if (typeof v === 'string') { try { v = JSON.parse(v) } catch (e) { v = [] } } if (!Array.isArray(v)) v = [];
  return JSON.stringify(v.map(x => x && typeof x === 'object' ? { t: bStr(x.t, 80), ok: x.ok && x.ok !== '0' ? 1 : 0 } : { t: bStr(x, 80), ok: 0 }).filter(x => x.t).slice(0, 20)) }
const bChkA = s => { try { const a = JSON.parse(s || '[]'); return Array.isArray(a) ? a : [] } catch (e) { return [] } };
const bPre = v => v && v !== '0' && v !== 'false' ? 1 : 0;
const bTz = v => /^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+){0,2}$/.test(String(v || '')) ? String(v).slice(0, 40) : null;
/* курс ЦБ РФ на дату: cbr-xml-daily (зеркало ЦБ); на выходные и праздники — ближайший предыдущий рабочий день. Кеш в kv на день. */
async function cbrRate(env, day, cur) { if (cur === 'RUB') return 1; const k = 'cbr:' + day; let r = await kvGet(env, k);
  if (!r) { r = null; let d = day;
    for (let i = 0; i < 6 && !r; i++) { const [y, m, dd] = d.split('-'); const url = d >= dayStr() ? 'https://www.cbr-xml-daily.ru/daily_json.js' : 'https://www.cbr-xml-daily.ru/archive/' + y + '/' + m + '/' + dd + '/daily_json.js';
      try { const res = await fetch(url, { cf: { cacheTtl: 3600 } }); if (res.ok) { const j = await res.json(); r = { USD: j.Valute.USD.Value / j.Valute.USD.Nominal, EUR: j.Valute.EUR.Value / j.Valute.EUR.Nominal, day: d } } } catch (e) {}
      d = addDays(d, -1) }
    if (r) await kvPut(env, k, r) }
  return r ? r[cur] : null }
/* Кто смотрит банк. Ученик — свой; админ — любой (?u=), куратор — только свои (?u=); команда — только чтение. Проверка на сервере. */
async function bankWho(env, req, u) { const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/, '') || u.searchParams.get('t') || '';
  if (/^\d+\.[0-9a-z]+\.[av]\.[0-9a-f]{32}$/.test(t)) return { uid: await authUid(env, t, 'a') };
  if (/\.w\./.test(t)) { const w = await viewTok(env, t); return w ? { uid: w.uid, ro: true, view: true } : { uid: 0 } }
  if (!/^[0-9a-f]{32}$/.test(t)) return { uid: 0 };
  const s = await kvGet(env, 'sess:' + t); if (!s || !(s.exp > Date.now())) return { uid: 0 };
  if (s.role === 'student') return { uid: s.uid ? +s.uid : 0 };
  if (s.role !== 'admin' && s.role !== 'curator') return { uid: 0 };
  const target = +u.searchParams.get('u') || 0; if (!target) return { uid: 0, staff: s };
  if (s.role === 'curator') { const st = await env.DB.prepare('SELECT curator FROM student WHERE uid=?').bind(target).first(); if (!st || !s.cid || st.curator !== s.cid) return { uid: 0, staff: s, forbidden: true } }
  return { uid: target, ro: true, staff: s } }
async function bankUid(env, req, u) { return (await bankWho(env, req, u)).uid }
async function bankFile(env, uid, kind, ref, f, maxB64) { if (!f || typeof f.data !== 'string') return null;
  const m = f.data.match(/^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/); if (!m) return null;
  if (!/^(image\/(jpeg|png|webp|heic|heif|gif)|application\/pdf)$/.test(m[1])) throw new Error('Можно картинку или PDF');
  if (m[2].length > (maxB64 || 900000)) throw new Error(maxB64 ? 'Файл больше 1,3 МБ — отправь его ведущему в Telegram' : 'Файл больше 650 КБ — сожми или сделай скрин');
  const r = await env.DB.prepare('INSERT INTO bank_file (uid, kind, ref, name, mime, size, data, at) VALUES (?,?,?,?,?,?,?,?) RETURNING id').bind(uid, kind, ref, bStr(f.name, 120) || 'файл', m[1], Math.round(m[2].length * 0.75), m[2], new Date().toISOString()).first();
  return r && r.id }
/* Список учеников для команды: имя, тариф, куратор, поток — из данных рейтинга и таблицы student; доход в рублях. Куратор — только свои. */
async function bankStaffList(env, st) {
  const D = await loadData(env), studs = ((await env.DB.prepare('SELECT s.uid, s.name, s.curator, t.name tgname FROM student s LEFT JOIN tg_user t ON t.chat=s.tg_chat').all()).results || []), byU = {}, GN = {};
  try { for (const r of ((await env.DB.prepare('SELECT uid, name FROM gc_name').all()).results || [])) GN[r.uid] = r.name } catch (e) {}
  for (const s of studs) byU[s.uid] = s;
  const sums = {}; for (const r of ((await env.DB.prepare('SELECT uid, COALESCE(SUM(COALESCE(rub, amount)),0) total, COALESCE(SUM(CASE WHEN conf=1 THEN COALESCE(rub, amount) ELSE 0 END),0) conf, SUM(CASE WHEN COALESCE(conf,0)=0 THEN 1 ELSE 0 END) pend, COUNT(id) n, MAX(day) last FROM bank_tx WHERE del_at IS NULL GROUP BY uid').all()).results || [])) sums[r.uid] = r;
  const goals = {}; for (const r of ((await env.DB.prepare('SELECT uid, sum, until FROM bank_goal WHERE show=1').all()).results || [])) goals[r.uid] = { sum: r.sum, until: r.until };
  const ords = {}; for (const r of ((await env.DB.prepare("SELECT uid, COUNT(id) n, SUM(CASE WHEN status NOT IN ('done','cancel') THEN 1 ELSE 0 END) act FROM bank_order GROUP BY uid").all()).results || [])) ords[r.uid] = r;
  /* 30.10 QA №6: m6 — ₽ за 6 месяцев (старые → новые, последний — текущий месяц по МСК), c6 — число оплат; один запрос на всех */
  const M6 = [], mk0 = dayStr().slice(0, 7); for (let i = 5; i >= 0; i--) { let [y, m] = mk0.split('-').map(Number); m -= i; while (m < 1) { m += 12; y-- } M6.push(y + '-' + String(m).padStart(2, '0')) }
  const mon = {}; for (const r of ((await env.DB.prepare('SELECT uid, substr(day,1,7) m, COALESCE(SUM(COALESCE(rub, amount)),0) s, COUNT(id) n FROM bank_tx WHERE del_at IS NULL AND day>=? GROUP BY uid, substr(day,1,7)').bind(M6[0] + '-01').all()).results || [])) (mon[r.uid] = mon[r.uid] || {})[r.m] = r;
  const seen = {}, out = [], CN = {}, GS = await gcStaffSet(env); for (const c of CURATORS) CN[c.id] = c.full;
  const add = (uid, name, tar, place, strm) => { if (!uid || seen[uid] || isStaffUid(env, uid) || GS.has(+uid)) return; const s = byU[uid] || {}, cid = s.curator || null; if (st.role === 'curator' && cid !== st.cid) return; seen[uid] = 1;
    const m = sums[uid] || {}, o = ords[uid] || {}, tot = Math.round(m.total || 0), cf = Math.round(m.conf || 0), bs = bStatus(tot);
    out.push({ uid, name: name || s.name || GN[uid] || s.tgname || null, tar: tar || null, cur: cid, curName: cid ? (CN[cid] || cid) : null, stream: strm || D.stream || 'AI-креатор 2.0', place: place || null, outside: strm ? 1 : 0, total: tot, n: m.n || 0, last: m.last || null, orders: o.n || 0, active: o.act || 0,
      conf: cf, pending: m.pend || 0, pending_rub: tot - cf, pts: bPts(cf), status: bs.key, status_name: bs.name, goal: goals[uid] || null,
      m6: M6.map(k => Math.round(((mon[uid] || {})[k] || {}).s || 0)), c6: M6.map(k => ((mon[uid] || {})[k] || {}).n || 0) }) };
  for (const r of (D.rows || [])) if (r.uid != null) add(+r.uid, r.name, r.tar, r.place);
  /* 30.10: в списке только ученики потока (состав — из рейтинга, т.е. из групп потока в GetCourse). Раньше сюда попадали все, кто хоть раз открыл бота, — в т.ч. сотрудники */
  if (!(D.rows || []).length) { for (const s of studs) add(+s.uid, s.name, null, null); for (const uid in sums) add(+uid, null, null, null) }
  /* 31.10 (Роман): ученики с оплатами в банке, которых нет в рейтинге потока (другой курс или прошлый поток), тоже в списке и в сумме — иначе подтверждённые оплаты «пропадали» из итогов */
  else for (const uid in sums) add(+uid, null, null, null, 'Вне потока')
  out.sort((a, b) => (!a.name - !b.name) || b.total - a.total || String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
  return { ok: true, role: st.role, cid: st.cid || null, curators: st.role === 'admin' ? CURATORS.map(c => ({ id: c.id, full: c.full })) : CURATORS.filter(c => c.id === st.cid).map(c => ({ id: c.id, full: c.full })), students: out } }
/* 30.10 QA №11: все заказы учеников для «Заказов учеников» — без клиента, Telegram, ТЗ и файлов; куратор — только свои, админ — все. Без loadData: имена страница берёт из /bank/staff/list. */
async function bankStaffOrders(env, st) {
  if (st.role === 'curator' && !st.cid) return { ok: true, role: st.role, orders: [] };
  const own = st.role === 'curator', W0 = own ? ' WHERE s.curator=?' : '';
  const [od, pd] = await env.DB.batch([
    (q => own ? q.bind(st.cid) : q)(env.DB.prepare('SELECT o.uid, o.id, o.product, o.status, o.deadline, o.dl_tz, o.pay_at, o.price, o.cur, o.upd, o.at, o.prepay, o.chk, s.curator FROM bank_order o LEFT JOIN student s ON s.uid=o.uid' + W0 + ' ORDER BY o.id DESC LIMIT 5000')),
    (q => own ? q.bind(st.cid) : q)(env.DB.prepare('SELECT t.order_id oid, t.uid, COALESCE(t.cur,\'RUB\') cur, SUM(t.amount) a, SUM(COALESCE(t.rub, t.amount)) r FROM bank_tx t LEFT JOIN student s ON s.uid=t.uid WHERE t.order_id IS NOT NULL AND t.del_at IS NULL' + (own ? ' AND s.curator=?' : '') + ' GROUP BY t.order_id, t.uid, COALESCE(t.cur,\'RUB\')'))]);
  const paid = {}; for (const x of pd.results || []) { const k = x.uid + ':' + x.oid, p = paid[k] = paid[k] || { rub: 0 }; p[x.cur] = (p[x.cur] || 0) + (x.a || 0); p.rub += x.r || 0 }
  const rows = (od.results || []).filter(o => !isStaffUid(env, o.uid)), rates = { RUB: 1 };
  for (const c of new Set(rows.map(o => o.cur || 'RUB'))) if (!rates[c]) rates[c] = await cbrRate(env, dayStr(), c);
  return { ok: true, role: st.role, orders: rows.map(o => { const c = o.cur || 'RUB', p = paid[o.uid + ':' + o.id] || {}, ck = bChkA(o.chk);
    return { uid: o.uid, cid: o.curator || null, id: o.id, product: o.product || '', status: o.status || 'new', deadline: o.deadline || null, dl_tz: o.dl_tz || null, pay_at: o.pay_at || null, price: o.price || 0, cur: c,
      price_rub: rates[c] ? Math.round((o.price || 0) * rates[c]) : null, paid: p[c] || 0, paid_rub: Math.round(p.rub || 0), upd: o.upd || null, at: o.at || null, prepay: o.prepay ? 1 : 0, check_n: ck.length, check_ok: ck.filter(z => z.ok).length } }) } }
async function bankApi(env, req, path) {
  const u = new URL(req.url); await bankEnsure(env);
  const body = async () => { try { return JSON.parse(await req.text() || '{}') } catch (e) { return {} } };
  const W = await bankWho(env, req, u);
  if (path === '/bank/staff/list') { if (!W.staff) return deny(req); return json(req, await bankStaffList(env, W.staff), 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/bank/staff/orders') { if (!W.staff) return deny(req); return json(req, await bankStaffOrders(env, W.staff), 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/bank/tx/conf' || path === '/bank/staff/pending' || path === '/bank/staff/file' || path === '/bank/staff/export') { await ensure(env); return bankStaffApi(env, req, path, u) }
  /* приглашение по карте из мини-аппа (startapp=c<h>): карточка пригласившего; с initData — учёт перехода */
  if (path === '/bank/ref' && req.method === 'POST') { const o = await body(), h = String(o.h || '').replace(/^c/, ''); if (!/^[0-9a-f]{10}$/.test(h)) return json(req, { ok: false, err: 'Ссылка неверная' }, 400);
    await ensure(env); const c = await refCard(env, h); if (!c) return json(req, { ok: false, err: 'Ссылка устарела' }, 404); const tu = o.init ? await tgInitCheck(env, String(o.init)) : null;
    if (tu && tu.id) await refSave(env, h, String(tu.id), c); return json(req, { ok: true, card: { name: c.name, sum: c.sum, status: c.status }, links: c.links, text: refText(c) }) }
  if (W.forbidden) return json(req, { ok: false, err: 'Это не твой ученик' }, 403);
  const uid = W.uid; if (!uid) return deny(req);
  if (W.ro && path !== '/bank/summary') return json(req, { ok: false, err: 'Команда школы видит банк ученика только для чтения, без контактов клиентов и файлов' }, 403);
  if (path === '/bank/summary') {
    const [tx, od, fl, gl] = await env.DB.batch([env.DB.prepare('SELECT id, amount, cur, rub, rate, day, what, src, client, order_id, file_id, conf, conf_by, conf_at FROM bank_tx WHERE uid=? AND del_at IS NULL ORDER BY day DESC, id DESC LIMIT 1000').bind(uid),
      env.DB.prepare('SELECT id, client, tg, product, price, cur, deadline, dl_tz, status, brief, src, at, upd, pay_at, chk, prepay FROM bank_order WHERE uid=? ORDER BY CASE status WHEN \'done\' THEN 2 WHEN \'cancel\' THEN 3 ELSE 1 END, COALESCE(deadline, \'9999\'), id DESC LIMIT 500').bind(uid),
      env.DB.prepare('SELECT id, kind, ref, name, mime, size FROM bank_file WHERE uid=? AND kind=\'order\'').bind(uid), env.DB.prepare('SELECT sum, until, show FROM bank_goal WHERE uid=?').bind(uid)]);
    const T = (tx.results || []).map(x => Object.assign(x, { cur: x.cur || 'RUB', rub: x.rub != null ? x.rub : x.amount, conf: x.conf ? 1 : 0, conf_by: x.conf ? (x.conf_by || null) : null, conf_by_name: x.conf ? byName(x.conf_by) : null, conf_at: x.conf ? (x.conf_at || null) : null })), months = {}; let total = 0, confRub = 0;
    for (const x of T) { total += x.rub; if (x.conf) confRub += x.rub; const m = x.day.slice(0, 7); months[m] = (months[m] || 0) + x.rub }
    const files = {}; for (const f of fl.results || []) (files[f.ref] = files[f.ref] || []).push({ id: f.id, name: f.name, mime: f.mime, size: f.size });
    const paid = {}, paidRub = {}; for (const x of T) if (x.order_id) { paidRub[x.order_id] = (paidRub[x.order_id] || 0) + x.rub; (paid[x.order_id] = paid[x.order_id] || {})[x.cur] = (paid[x.order_id][x.cur] || 0) + x.amount }
    let orders = (od.results || []).map(o => { const c = o.cur || 'RUB', ck = bChkA(o.chk); delete o.chk; return Object.assign(o, { cur: c, files: files[o.id] || [], paid: (paid[o.id] || {})[c] || 0, paid_rub: paidRub[o.id] || 0, check: ck, prepay: o.prepay ? 1 : 0 }) });
    /* для «ждёт оплаты» в рублях: цена заказа в валюте → по курсу сегодня */
    const need = {}; for (const o of orders) if (o.cur !== 'RUB' && o.status !== 'done' && o.status !== 'cancel') need[o.cur] = 1;
    const rates = { RUB: 1 }; for (const c of Object.keys(need)) rates[c] = await cbrRate(env, dayStr(), c);
    for (const o of orders) o.price_rub = rates[o.cur] ? Math.round((o.price || 0) * rates[o.cur]) : null;
    /* «Скоро»: сдал работу (review) и знает дату оплаты — остаток к оплате в валюте заказа */
    const soon = orders.filter(o => o.status === 'review' && o.pay_at).map(o => ({ order_id: o.id, product: o.product || '', client: o.client || '', sum: Math.max(0, (o.price || 0) - (o.paid || 0)), cur: o.cur, sum_rub: o.cur === 'RUB' ? Math.max(0, (o.price || 0) - (o.paid || 0)) : o.price_rub != null && o.price ? Math.round(Math.max(0, o.price - (o.paid || 0)) * o.price_rub / o.price) : null, pay_at: o.pay_at }))
      .filter(x => x.sum > 0).sort((a, b) => a.pay_at < b.pay_at ? -1 : a.pay_at > b.pay_at ? 1 : 0);
    const g0 = (gl.results || [])[0], goal = g0 && g0.sum ? { sum: g0.sum, until: g0.until, show: g0.show ? 1 : 0 } : null;
    let tx2 = T, soon2 = soon;
    if (W.ro) { /* команде — без контактов клиента, ТЗ и файлов */
      tx2 = T.map(x => Object.assign({}, x, { client: x.client ? B_HIDDEN : null, file_id: null, file: x.file_id ? 1 : 0, hidden: true }));
      soon2 = soon.map(x => Object.assign({}, x, { client: x.client ? B_HIDDEN : '' }));
      orders = orders.map(o => { const x = Object.assign({}, o, { client: o.client ? B_HIDDEN : null, tg: null, brief: o.brief ? B_HIDDEN : null, files: [], files_n: o.files.length, hidden: true, check_n: o.check.length, check_ok: o.check.filter(z => z.ok).length }); delete x.check; return x }) }
    const who = W.ro ? await (async () => { const D = await loadData(env), r = (D.rows || []).find(x => +x.uid === uid) || {}, s = await env.DB.prepare('SELECT name, curator FROM student WHERE uid=?').bind(uid).first() || {}, c = s.curator && CURATORS.find(x => x.id === s.curator);
      return { uid, name: r.name || s.name || null, tar: r.tar || null, curName: c ? c.full : null } })() : null;
    const sh = W.ro ? null : await shareH(env, uid), refs = sh ? ((await env.DB.prepare('SELECT COUNT(*) n FROM bank_ref WHERE h=?').bind(sh).first()) || {}).n || 0 : null;
    return json(req, { ok: true, total, months, tx: tx2, orders, today: dayStr(), ro: !!W.ro, who, goal: W.ro && goal && !goal.show ? null : goal,
      status: bStatus(total), points: bPoints(confRub, total), conf_rub: confRub, soon: soon2, share: sh ? { h: sh, code: 'c' + sh, link: maLink(env, 'c' + sh), start: 'https://t.me/' + BOT(env) + '?start=c' + sh } : null, refs }, 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/bank/goal' && req.method === 'POST') { const o = await body(), sum = bInt(o.sum);
    if (!sum) { await env.DB.prepare('DELETE FROM bank_goal WHERE uid=?').bind(uid).run(); return json(req, { ok: true, goal: null }) }
    const until = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(o.until || '')) ? String(o.until) : null; if (!until) return json(req, { ok: false, err: 'Выбери срок цели' }, 400);
    const show = o.show === 0 || o.show === '0' || o.show === false ? 0 : 1;
    await env.DB.prepare('INSERT INTO bank_goal (uid, sum, until, show, at) VALUES (?,?,?,?,?) ON CONFLICT(uid) DO UPDATE SET sum=excluded.sum, until=excluded.until, show=excluded.show, at=excluded.at').bind(uid, sum, until, show, new Date().toISOString()).run();
    await logIt(env, 'bank-goal', uid, sum + ' ' + until); return json(req, { ok: true, goal: { sum, until, show } }) }
  /* новая оплата или изменение (id): поменялись сумма или валюта — подтверждение куратора сбрасывается */
  if (path === '/bank/tx' && req.method === 'POST') { const o = await body(); const amount = bInt(o.amount); if (!amount) return json(req, { ok: false, err: 'Укажи сумму' }, 400);
    const cur = bCur(o.cur), day = bDay(o.day), id = +o.id || 0;
    const ex = id ? await env.DB.prepare('SELECT * FROM bank_tx WHERE id=? AND uid=? AND del_at IS NULL').bind(id, uid).first() : null; if (id && !ex) return json(req, { ok: false, err: 'Запись не найдена' }, 404);
    let rate = 1; if (cur !== 'RUB') { rate = await cbrRate(env, day, cur); if (!rate) return json(req, { ok: false, err: 'Не получилось взять курс ЦБ. Попробуй через минуту' }, 503) }
    const oid = o.order_id !== undefined ? (o.order_id ? +o.order_id : null) : (ex ? ex.order_id : null); if (oid && !(await env.DB.prepare('SELECT id FROM bank_order WHERE id=? AND uid=?').bind(oid, uid).first())) return json(req, { ok: false, err: 'нет заказа' }, 400);
    let fid = null; try { fid = await bankFile(env, uid, 'tx', id || 0, o.file) } catch (e) { return json(req, { ok: false, err: e.message }, 400) }
    const rubV = Math.round(amount * rate), rateV = cur === 'RUB' ? null : Math.round(rate * 10000) / 10000, f = k => o[k] !== undefined ? o[k] : (ex ? ex[k] : null);
    if (ex) { const conf = ex.amount === amount && (ex.cur || 'RUB') === cur ? (ex.conf ? 1 : 0) : 0, dropF = (fid || o.file_del) && ex.file_id;
      const q = [env.DB.prepare('UPDATE bank_tx SET amount=?, cur=?, rub=?, rate=?, day=?, what=?, src=?, client=?, order_id=?, file_id=?, conf=?, conf_by=?, conf_at=? WHERE id=? AND uid=?').bind(amount, cur, rubV, rateV, day, bStr(f('what'), 200), bStr(f('src'), 60), bStr(f('client'), 120), oid, fid || (o.file_del ? null : ex.file_id), conf, conf ? ex.conf_by : null, conf ? ex.conf_at : null, id, uid)];
      if (dropF) q.push(env.DB.prepare("DELETE FROM bank_file WHERE id=? AND uid=? AND kind='tx'").bind(ex.file_id, uid));
      await env.DB.batch(q); await logIt(env, 'bank-tx-edit', uid, id + ' ' + amount + ' ' + cur + (ex.conf && !conf ? ' unconf' : ''));
      return json(req, { ok: true, id, rub: rubV, conf, unconf: !!(ex.conf && !conf) }) }
    const r = await env.DB.prepare('INSERT INTO bank_tx (uid, amount, cur, rub, rate, day, what, src, client, order_id, file_id, at, conf) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0) RETURNING id').bind(uid, amount, cur, rubV, rateV, day, bStr(o.what, 200), bStr(o.src, 60), bStr(o.client, 120), oid, fid, new Date().toISOString()).first();
    if (fid) await env.DB.prepare('UPDATE bank_file SET ref=? WHERE id=?').bind(r.id, fid).run();
    await logIt(env, 'bank-tx', uid, amount + ' ' + cur); return json(req, { ok: true, id: r.id, rub: rubV, conf: 0 }) }
  /* удаление мягкое: 60 с можно вернуть (/bank/tx/restore), потом запись и скрин удаляются насовсем */
  if (path === '/bank/tx/del' && req.method === 'POST') { const o = await body(); const x = await env.DB.prepare('SELECT id FROM bank_tx WHERE id=? AND uid=? AND del_at IS NULL').bind(+o.id, uid).first(); if (!x) return json(req, { ok: false }, 404);
    await bankPurge(env); await env.DB.prepare('UPDATE bank_tx SET del_at=? WHERE id=? AND uid=?').bind(Date.now(), +o.id, uid).run(); await logIt(env, 'bank-tx-del', uid, String(o.id)); return json(req, { ok: true, undo: 60 }) }
  if (path === '/bank/tx/restore' && req.method === 'POST') { const o = await body();
    const r = await env.DB.prepare('UPDATE bank_tx SET del_at=NULL WHERE id=? AND uid=? AND del_at IS NOT NULL AND del_at>=?').bind(+o.id, uid, Date.now() - 62e3).run();
    return (r.meta && r.meta.changes) ? json(req, { ok: true, id: +o.id }) : json(req, { ok: false, err: 'Вернуть уже нельзя — прошло больше минуты' }, 410) }
  if (path === '/bank/order' && req.method === 'POST') { const o = await body(), now = new Date().toISOString();
    const f = { client: bStr(o.client, 120), tg: bStr(o.tg, 64).replace(/^https?:\/\/t\.me\//, '').replace(/^@/, ''), product: bStr(o.product, 200), price: bInt(o.price), cur: bCur(o.cur), deadline: bDl(o.deadline), dl_tz: bTz(o.dl_tz), status: B_ST.includes(o.status) ? o.status : 'new', brief: bStr(o.brief, 4000), src: bStr(o.src, 60) };
    if (!f.client && !f.product) return json(req, { ok: false, err: 'Укажи клиента или что за заказ' }, 400);
    const payAt = o.pay_at === undefined ? undefined : /^\d{4}-\d{2}-\d{2}$/.test(String(o.pay_at || '')) ? String(o.pay_at) : null; /* ожидаемая дата оплаты (напоминание бота в этот день) */
    let id = +o.id || 0;
    const hasChk = o.check !== undefined, chk = hasChk ? bChk(o.check) : null, hasPre = o.prepay !== undefined, pre = hasPre ? bPre(o.prepay) : 0; /* нет поля в теле — не меняем */
    if (id) { const ex = await env.DB.prepare('SELECT id, pay_at FROM bank_order WHERE id=? AND uid=?').bind(id, uid).first(); if (!ex) return json(req, { ok: false }, 404);
      const pa = payAt === undefined ? ex.pay_at : payAt, rs = pa !== ex.pay_at; /* дату поменяли — напоминание заново */
      await env.DB.prepare('UPDATE bank_order SET client=?, tg=?, product=?, price=?, cur=?, deadline=?, dl_tz=?, status=?, brief=?, src=?, upd=?, pay_at=?, remind_at=CASE WHEN ? THEN NULL ELSE remind_at END, reminded=CASE WHEN ? THEN NULL ELSE reminded END, chk=CASE WHEN ? THEN ? ELSE chk END, prepay=CASE WHEN ? THEN ? ELSE prepay END WHERE id=? AND uid=?').bind(f.client, f.tg, f.product, f.price, f.cur, f.deadline, f.dl_tz, f.status, f.brief, f.src, now, pa, rs ? 1 : 0, rs ? 1 : 0, hasChk ? 1 : 0, chk, hasPre ? 1 : 0, pre, id, uid).run() }
    else { const r = await env.DB.prepare('INSERT INTO bank_order (uid, client, tg, product, price, cur, deadline, dl_tz, status, brief, src, at, upd, pay_at, chk, prepay) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(uid, f.client, f.tg, f.product, f.price, f.cur, f.deadline, f.dl_tz, f.status, f.brief, f.src, now, now, payAt || null, hasChk ? chk : null, pre).first(); id = r.id }
    if (o.tx_id) await env.DB.prepare('UPDATE bank_tx SET order_id=? WHERE id=? AND uid=?').bind(id, +o.tx_id, uid).run();
    const fs = Array.isArray(o.files) ? o.files.slice(0, 5) : [];
    const cnt = (await env.DB.prepare('SELECT COUNT(*) n FROM bank_file WHERE uid=? AND kind=\'order\' AND ref=?').bind(uid, id).first()).n;
    for (const x of fs.slice(0, Math.max(0, 10 - cnt))) { try { await bankFile(env, uid, 'order', id, x) } catch (e) { return json(req, { ok: false, id, err: e.message }, 400) } }
    return json(req, { ok: true, id }) }
  if (path === '/bank/order/check' && req.method === 'POST') { const o = await body(); if (o.check === undefined) return json(req, { ok: false, err: 'нет чек-листа' }, 400);
    const r = await env.DB.prepare('UPDATE bank_order SET chk=? WHERE id=? AND uid=?').bind(bChk(o.check), +o.id || 0, uid).run();
    return (r.meta && r.meta.changes) ? json(req, { ok: true }) : json(req, { ok: false, err: 'Заказ не найден' }, 404) }
  if (path === '/bank/order/status' && req.method === 'POST') { const o = await body(); if (!B_ST.includes(o.status)) return json(req, { ok: false }, 400);
    await env.DB.prepare('UPDATE bank_order SET status=?, upd=? WHERE id=? AND uid=?').bind(o.status, new Date().toISOString(), +o.id, uid).run();
    if (o.pay_at !== undefined) { const pa = /^\d{4}-\d{2}-\d{2}$/.test(String(o.pay_at || '')) ? String(o.pay_at) : null; await env.DB.prepare('UPDATE bank_order SET pay_at=?, remind_at=NULL, reminded=NULL WHERE id=? AND uid=?').bind(pa, +o.id, uid).run() }
    return json(req, { ok: true }) }
  if (path === '/bank/order/del' && req.method === 'POST') { const o = await body();
    await env.DB.batch([env.DB.prepare('DELETE FROM bank_order WHERE id=? AND uid=?').bind(+o.id, uid), env.DB.prepare('DELETE FROM bank_file WHERE uid=? AND kind=\'order\' AND ref=?').bind(uid, +o.id), env.DB.prepare('UPDATE bank_tx SET order_id=NULL WHERE uid=? AND order_id=?').bind(uid, +o.id)]); return json(req, { ok: true }) }
  if (path === '/bank/file/del' && req.method === 'POST') { const o = await body(); await env.DB.prepare('DELETE FROM bank_file WHERE id=? AND uid=?').bind(+o.id, uid).run(); return json(req, { ok: true }) }
  if (path === '/bank/file') { const f = await env.DB.prepare('SELECT name, mime, data FROM bank_file WHERE id=? AND uid=?').bind(+u.searchParams.get('id'), uid).first(); if (!f) return new Response('нет файла', { status: 404 });
    const bin = Uint8Array.from(atob(f.data), c => c.charCodeAt(0));
    return new Response(bin, { headers: Object.assign({ 'Content-Type': f.mime, 'Content-Disposition': 'inline; filename*=UTF-8\'\'' + encodeURIComponent(f.name), 'Cache-Control': 'private, max-age=3600' }, cors(req)) }) }
  return json(req, { ok: false, err: 'not found' }, 404);
}

/* ---------- 29.10 «Банк, кураторы и связь» (docs/plan/bks-impl.md, контракт сервера) ----------
   Банк: цель, статус карты (по всей сумме), баллы за заработок (только подтверждённые куратором: floor(rub/10000)*100), «Скоро» (заказы review + pay_at),
   мягкое удаление оплаты (60 с на «Вернуть»), напоминание об ожидаемой оплате (cron 45), приглашение по карте (/start c<h>).
   Чат на платформе: chat_msg/chat_rate, файлы — bank_file kind 'chat'. Ожидание ответа — те же cwait/cresp, что у лички Telegram (chat = 'app<uid>').
   Кабинет куратора: /cur/me, /cur/hwlog, /cur/hwstat, /cur/assign, /cur/mass, /cur/admin. Уведомления ученика: /ma/notif (kv notif:<uid>).
   Кнопки бота открывают мини-апп: startapp=bank | chat (ученик) | chat_<uid> (команда: диалог) | chats (команда: список) | l<id урока>. */
const BKS_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS bank_goal (uid INTEGER PRIMARY KEY, sum INTEGER, until TEXT, show INTEGER DEFAULT 1, at TEXT)',
  'CREATE TABLE IF NOT EXISTS bank_share (h TEXT PRIMARY KEY, uid INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS bank_ref (h TEXT NOT NULL, chat TEXT NOT NULL, at TEXT, PRIMARY KEY (h, chat))',
  'CREATE TABLE IF NOT EXISTS chat_msg (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER NOT NULL, cid TEXT, dir TEXT NOT NULL, text TEXT, file_id INTEGER, reply_to INTEGER, via TEXT, who TEXT, at INTEGER NOT NULL, read_at INTEGER, del INTEGER DEFAULT 0)',
  'CREATE INDEX IF NOT EXISTS chat_msg_uid ON chat_msg (uid, id)',
  'CREATE INDEX IF NOT EXISTS chat_msg_cid ON chat_msg (cid, at)',
  'CREATE TABLE IF NOT EXISTS chat_rate (mid INTEGER PRIMARY KEY, uid INTEGER, cid TEXT, stars INTEGER, at INTEGER)',
  /* 30.10 (макет «Оценка и реакции в чате»): реакции как в Telegram и обратная связь при низкой оценке */
  'CREATE TABLE IF NOT EXISTS chat_react (mid INTEGER NOT NULL, who TEXT NOT NULL, e TEXT NOT NULL, at INTEGER, PRIMARY KEY (mid, who, e))',
  'CREATE TABLE IF NOT EXISTS chat_fb (mid INTEGER PRIMARY KEY, uid INTEGER, cid TEXT, stars INTEGER, reasons TEXT, text TEXT, at INTEGER)',
  'CREATE TABLE IF NOT EXISTS cur_hw (id INTEGER PRIMARY KEY AUTOINCREMENT, cid TEXT, uid INTEGER, answer_id INTEGER, lesson_id INTEGER, lesson TEXT, status TEXT, pts INTEGER, comment TEXT, sent_at INTEGER, at INTEGER)',
  'CREATE INDEX IF NOT EXISTS cur_hw_cid ON cur_hw (cid, at)'];
const B_STATUS = [['plastic', 0, 'Пластиковая'], ['violet', 1e4, 'Фиолетовая'], ['copper', 5e4, 'Медная'], ['silver', 1e5, 'Серебряная'], ['gold', 3e5, 'Золотая'], ['black', 5e5, 'Чёрная'], ['plat', 1e6, 'Платиновая']];
function bStatus(total) { let i = 0; B_STATUS.forEach((s, k) => { if (total >= s[1]) i = k }); const s = B_STATUS[i], n = B_STATUS[i + 1];
  return { key: s[0], name: s[2], from: s[1], next: n ? { key: n[0], name: n[2], from: n[1] } : null, left: n ? n[1] - total : 0 } }
const bPts = rub => Math.floor(Math.max(0, +rub || 0) / 1e4) * 100;
/* conf — баллы за подтверждённые оплаты; pending — сколько добавится, когда куратор подтвердит остальные; nextIn — сколько ₽ (по всей сумме) до следующих +100 */
const bPoints = (conf, total) => ({ conf: bPts(conf), pending: Math.max(0, bPts(total) - bPts(conf)), nextIn: 1e4 - (Math.max(0, Math.round(total)) % 1e4) });
const NB = ' ', nbt = s => nb(s).replace(/ —/g, NB + '—');
const num3 = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
const money = (n, cur) => num3(n) + NB + ({ USD: '$', EUR: '€' }[cur] || '₽');
const maLink = (env, code) => 'https://t.me/' + BOT(env) + '?startapp=' + code;
const datv = n => /[ая]$/.test(n) ? n.slice(0, -1) + 'е' : /[йь]$/.test(n) ? n.slice(0, -1) + 'ю' : n + 'у';
const qAll = async st => ((await st.all()).results || []);
const msNow = () => Date.now();
async function bksSt(env) { await ensure(env); await bankEnsure(env) }
async function bankTotals(env, uid) { const r = await env.DB.prepare('SELECT COALESCE(SUM(COALESCE(rub, amount)),0) total, COALESCE(SUM(CASE WHEN conf=1 THEN COALESCE(rub, amount) ELSE 0 END),0) conf FROM bank_tx WHERE uid=? AND del_at IS NULL').bind(uid).first();
  return { total: Math.round(r.total || 0), conf: Math.round(r.conf || 0) } }
/* мягко удалённые оплаты старше 65 с — удаляются насовсем вместе со скринами */
async function bankPurge(env) { const lim = msNow() - 65e3;
  await env.DB.batch([env.DB.prepare("DELETE FROM bank_file WHERE kind='tx' AND ref IN (SELECT id FROM bank_tx WHERE del_at IS NOT NULL AND del_at<?)").bind(lim), env.DB.prepare('DELETE FROM bank_tx WHERE del_at IS NOT NULL AND del_at<?').bind(lim)]) }
async function stuName(env, uid) { try { const D = await loadData(env), r = (D.rows || []).find(x => +x.uid === +uid); if (r && r.name) return r.name } catch (e) {}
  const g = await env.DB.prepare('SELECT name FROM gc_name WHERE uid=?').bind(uid).first().catch(() => null); if (g && g.name) return g.name;
  const s = await env.DB.prepare('SELECT name FROM student WHERE uid=?').bind(uid).first(); return (s && s.name) || 'Ученик' }
async function nameMap(env) { const M = {}; try { for (const r of await qAll(env.DB.prepare('SELECT uid, name FROM student WHERE name IS NOT NULL'))) M[r.uid] = r.name } catch (e) {}
  try { for (const r of await qAll(env.DB.prepare('SELECT uid, name FROM gc_name'))) if (r.name) M[r.uid] = r.name } catch (e) {}
  try { const D = await loadData(env); for (const r of D.rows || []) if (r.uid != null && r.name) M[+r.uid] = r.name } catch (e) {} return M }
/* сессия команды (пульт / мини-апп: admin | curator) и проверка «это мой ученик» */
async function staffSess(env, req, u) { const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/, '') || (u && u.searchParams.get('t')) || ''; if (!/^[0-9a-f]{32}$/.test(t)) return null;
  const s = await kvGet(env, 'sess:' + t); return s && s.exp > msNow() && (s.role === 'admin' || s.role === 'curator') ? s : null }
async function staffCan(env, s, uid) { if (!s || !okUid(uid) || isStaffUid(env, uid)) return null; const st = await env.DB.prepare('SELECT uid, curator, tg_chat, name FROM student WHERE uid=?').bind(+uid).first();
  if (s.role === 'admin') return st || { uid: +uid, curator: null, tg_chat: null }; return st && s.cid && st.curator === s.cid ? st : null }
const staffWho = s => s.role === 'admin' ? (String(s.name || '').split(' ')[0] || 'Роман') : ((CURATORS.find(c => c.id === s.cid) || {}).name || 'Куратор');
/* QA раунд 3 (Н2): название ДЗ без своего «ДЗ · …», «ДЗ:», «Домашнее задание …» и внешних кавычек — бот сам пишет «ДЗ «…»» (иначе «ДЗ «ДЗ · Композиция»») */
const hwName = v => { let t = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 4; i++) { const p = t; t = t.replace(/^(?:ДЗ|Д\/З|Домашн(?:ее|яя)\s+(?:задание|работа)|Домашка)(?:\s*№\s*\d+)?(?=$|[\s·:.,\-—–|«"“„(])\s*[·:.,\-—–|]*\s*/i, '').trim();
    const m = t.match(/^[«"“„]([^«»"“”„]*)[»"”“]$/); if (m) t = m[1].trim(); if (t === p) break } return t };
const staffBy = s => s.role === 'admin' ? 'admin' : s.cid;
const byName = (by, s0) => by === 'admin' ? 'Роман' : ((CURATORS.find(c => c.id === by) || {}).name || s0 || null);
/* уведомления ученику: что присылает бот (ответ куратора выключить нельзя) */
const NOTIF_DEF = { cur: 1, hw: 1, efir: 1, lessons: 1, rating: 0, bank: 1 };
async function notifGet(env, uid) { const n = Object.assign({}, NOTIF_DEF, { quiet: null }, (await kvGet(env, 'notif:' + uid)) || {}); n.cur = 1; return n }
async function notifOn(env, uid, k) { return k === 'cur' || !!(await notifGet(env, uid))[k] }
/* рабочие дни куратора (0 — вс … 6 — сб), по умолчанию будни; часы — curHours */
async function curDays(env, cid) { const d = await kvGet(env, 'hdays:' + cid); return Array.isArray(d) && d.length ? d.map(Number).filter(x => x >= 0 && x <= 6) : [0, 1, 2, 3, 4, 5, 6] }
const daysTxt = d => d.length === 7 ? 'каждый день' : d.join() === '1,2,3,4,5' ? 'по будням' : d.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => WD[x]).join(', ');
const medOf = a => a.length ? a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)] : null;
/* 1.11 (Роман: «некорректно в сети куратор или нет»): «в сети» учитывает и дни, и часы; когда не в сети — пишем, когда ответит */
const WDF = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
function curOn(h, days, now = msk()) { return days.includes(now.getUTCDay()) && now.getUTCHours() >= h[0] && now.getUTCHours() < h[1] }
function curNext(h, days, now = msk()) { if (curOn(h, days, now)) return null; const d0 = now.getUTCDay(), hr = now.getUTCHours();
  for (let i = 0; i < 8; i++) { const d = (d0 + i) % 7; if (!days.includes(d)) continue; if (i === 0 && hr >= h[0]) continue; return 'ответит ' + (i === 0 ? 'сегодня' : i === 1 ? 'завтра' : WDF[d]) + ' с ' + h[0] + ':00 МСК' } return null }
async function curCard(env, cid) { const c = CURATORS.find(x => x.id === cid); if (!c) return null; const now = msk(), from = (msNow() / 1000 | 0) - 30 * 86400;
  const [h, days, photo, tgu] = [await curHours(env, cid), await curDays(env, cid), await kvGet(env, 'curphoto:' + cid), await curTg(env, cid)];
  const [rs, st] = await env.DB.batch([env.DB.prepare('SELECT wsec FROM cresp WHERE cid=? AND answered>=?').bind(cid, from), env.DB.prepare('SELECT AVG(stars) a, COUNT(*) n FROM chat_rate WHERE cid=?').bind(cid)]);
  const med = medOf((rs.results || []).map(r => r.wsec).filter(x => x > 0)), sr = (st.results || [])[0] || {};
  return { cid, name: c.full, short: c.name, about: c.about, photo: photo || 'https://romanoduvanov.github.io/otzyvy/gc/curators/' + cid + '.jpg', tg: tgu, hours: { from: h[0], to: h[1], days, txt: daysTxt(days), next: curNext(h, days, now) },
    online: curOn(h, days, now), avg_reply_min: med == null ? null : Math.max(1, Math.round(med / 60)), stars: sr.n ? Math.round(sr.a * 10) / 10 : null, stars_n: sr.n | 0 } }
/* «Ответить здесь»: бот помнит, на какие свои сообщения ответ уходит в чат (последние 20 на чат Telegram) */
async function frAdd(env, chat, j, rec) { const mid = j && j.ok && j.result && j.result.message_id; if (!mid) return; const k = 'fr:' + chat, L = (await kvGet(env, k)) || [];
  L.unshift(Object.assign({ m: mid }, rec)); await kvPut(env, k, L.slice(0, 20)) }
/* фото/файл из Telegram → bank_file kind 'chat' (картинка или PDF до 650 КБ) */
async function tgFileToBank(env, uid, m) { let fid = null, name = 'фото.jpg', mime = 'image/jpeg';
  if (m.photo && m.photo.length) { const p = m.photo.filter(x => !x.file_size || x.file_size <= 650000).pop(); if (p) fid = p.file_id }
  else if (m.document && /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(m.document.mime_type || '') && (m.document.file_size || 0) <= 650000) { fid = m.document.file_id; name = m.document.file_name || 'файл'; mime = m.document.mime_type }
  if (!fid) return null; const f = await tg(env, 'getFile', { file_id: fid }); if (!f.ok) return null;
  const r = await fetch('https://api.telegram.org/file/bot' + env.TG_TOKEN + '/' + f.result.file_path); if (!r.ok) return null;
  return bankFile(env, uid, 'chat', 0, { name, data: 'data:' + mime + ';base64,' + b64(await r.arrayBuffer()) }) }

/* ---------- чат ученик ↔ куратор ---------- */
const CW = uid => 'app' + uid; /* ключ ожидания в cwait/cresp для чата на платформе */
const REACT_OK = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🙏', '👎', '👏', '🎉', '🤔', '💯', '👀', '😍', '🤝'];
const reactKey = W => W.me === 'student' ? 's' : W.s && W.s.role === 'admin' ? 'a' : 'c:' + ((W.s && W.s.cid) || '');
async function reactsFor(env, ids, mine) { const R = {}; if (!ids.length) return R;
  for (let i = 0; i < ids.length; i += 90) { const part = ids.slice(i, i + 90); const rs = await qAll(env.DB.prepare('SELECT mid, who, e, at FROM chat_react WHERE mid IN (' + part.map(() => '?').join(',') + ') ORDER BY at').bind(...part));
    for (const r of rs) { const L = R[r.mid] || (R[r.mid] = []); let g = L.find(x => x.e === r.e); if (!g) L.push(g = { e: r.e, n: 0, me: false, by: [] }); g.n++; g.by.push(r.who); if (r.who === mine) g.me = true } } return R }
const chatPub = x => ({ id: x.id, dir: x.dir, text: x.text || '', file: x.file_id ? { id: x.file_id, name: x.fname || 'файл', mime: x.fmime || null } : null, reply_to: x.reply_to || null, via: x.via || 'app', who: x.who || null, at: x.at, read: x.read_at ? 1 : 0, stars: x.stars || null, fb: x.fb_at ? 1 : 0, re: x.re || [] });
/* новое сообщение: запись, ожидание ответа (cwait → cresp), уведомление второй стороне в бот */
async function chatSend(env, o) { const at = msNow(), sec = at / 1000 | 0;
  const r = await env.DB.prepare('INSERT INTO chat_msg (uid, cid, dir, text, file_id, reply_to, via, who, at) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id').bind(o.uid, o.cid || null, o.dir, o.text || '', o.file || null, o.reply_to || null, o.via || 'app', o.who || null, at).first();
  if (o.file) await env.DB.prepare('UPDATE bank_file SET ref=? WHERE id=?').bind(r.id, o.file).run();
  const w = o.cid && o.dir !== 'sys' && !o.noWait ? await env.DB.prepare('SELECT since FROM cwait WHERE cid=? AND chat=?').bind(o.cid, CW(o.uid)).first() : null;
  if (o.dir === 'in' && o.cid && !w && !isAck({ text: o.text, photo: o.file ? [1] : null })) await env.DB.prepare('INSERT OR IGNORE INTO cwait (cid, chat, uid, since) VALUES (?,?,?,?)').bind(o.cid, CW(o.uid), o.uid, sec).run();
  if (o.dir === 'out' && w) { const q = [env.DB.prepare('DELETE FROM cwait WHERE cid=? AND chat=?').bind(o.cid, CW(o.uid))];
    if (o.byCur) q.push(env.DB.prepare('INSERT INTO cresp (cid, chat, uid, asked, answered, sec, wsec, day) VALUES (?,?,?,?,?,?,?,?)').bind(o.cid, CW(o.uid), o.uid, w.since, sec, sec - w.since, workSec(w.since, sec, await curHours(env, o.cid)), dayStr()));
    else q.push(env.DB.prepare('INSERT INTO cack (cid, chat, uid, kind, since, at) VALUES (?,?,?,?,?,?)').bind(o.cid, CW(o.uid), o.uid, 'admin', w.since, sec));
    await env.DB.batch(q) }
  const msg = { id: r.id, dir: o.dir, text: o.text || '', file: o.file ? { id: o.file, name: o.fname || 'файл', mime: o.fmime || null } : null, reply_to: o.reply_to || null, via: o.via || 'app', who: o.who || null, at, read: 0, stars: null };
  if (o.notify !== false) { try { await chatNotify(env, o, msg) } catch (e) { await logIt(env, 'chat-tg-err', o.uid, String(e && e.message || e)) } }
  await logIt(env, 'chat-' + o.dir, o.uid, (o.cid || '-') + ' ' + (o.via || 'app') + (o.file ? ' file' : ''));
  return msg }
/* оценка ответа куратора: из приложения/сайта (/chat/rate) и из бота (кнопки ☆ под ответом, 1.11) */
async function chatRateDo(env, uid, mid, stars) {
    const m = await env.DB.prepare("SELECT id, cid FROM chat_msg WHERE id=? AND uid=? AND dir='out' AND del=0").bind(mid, uid).first(); if (!m || !m.cid) return { ok: false, err: 'Оценить можно только ответ куратора' };
    await env.DB.prepare('INSERT INTO chat_rate (mid, uid, cid, stars, at) VALUES (?,?,?,?,?) ON CONFLICT(mid) DO UPDATE SET stars=excluded.stars, at=excluded.at').bind(m.id, uid, m.cid, stars, msNow()).run();
    if (stars <= 2) { try { const c = CURATORS.find(x => x.id === m.cid), t0 = await env.DB.prepare('SELECT text FROM chat_msg WHERE id=?').bind(m.id).first();
      const txt = '⭐ ' + stars + ' из 5 — ' + esc(await stuName(env, uid)) + ' оценил' + ' ответ куратора ' + esc(c ? c.name : m.cid) + (t0 && t0.text ? ':\n«' + esc(String(t0.text).slice(0, 200)) + '»' : '') + '\n\nЕсли ученик напишет, что не так, — пришлю следом.';
      for (const a of await admins(env)) await tgSend(env, a, txt) } catch (e) { await logIt(env, 'rate-notify-err', uid, String(e && e.message || e)) } }
    await logIt(env, 'chat-rate', uid, m.cid + ' ' + stars); return { ok: true, mid: m.id, cid: m.cid } }
const CHAT_FB_RS = ['Долго отвечал', 'Не помог', 'Отписка, без разбора', 'Непонятно объяснил', 'Грубо', 'Можно подробнее', 'Хочу пример', 'Другое'];
async function chatFbDo(env, uid, r, reasons0, text0) { const reasons = (reasons0 || []).map(String).filter(x => CHAT_FB_RS.includes(x)).slice(0, 8), text = String(text0 || '').trim().slice(0, 1500);
  await env.DB.prepare('INSERT INTO chat_fb (mid, uid, cid, stars, reasons, text, at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(mid) DO UPDATE SET stars=excluded.stars, reasons=excluded.reasons, text=excluded.text, at=excluded.at').bind(r.mid, uid, r.cid, r.stars, JSON.stringify(reasons), text, msNow()).run();
  try { const c = CURATORS.find(x => x.id === r.cid); const txt = '💬 Отзыв к оценке ⭐ ' + r.stars + ' — ' + esc(await stuName(env, uid)) + ' про ' + esc(c ? c.name : r.cid) + (reasons.length ? '\nПричины: ' + esc(reasons.join(', ')) : '') + (text ? '\n«' + esc(text) + '»' : '');
    for (const a of await admins(env)) await tgSend(env, a, txt) } catch (e) {} }
/* кнопки оценки под ответом куратора в боте */
const crStars = (mid, n) => [1, 2, 3, 4, 5].map(i => ({ text: (i <= n ? '⭐ ' : '☆ ') + i, callback_data: 'crt:' + mid + ':' + i }));
const CR_LOW = ['Долго отвечал', 'Не помог', 'Отписка, без разбора', 'Непонятно объяснил', 'Грубо'];
async function chatNotify(env, o, msg) { const body = msg.text ? th(msg.text.slice(0, 1500)) : '📎 ' + (msg.file && /pdf/.test(msg.file.mime || '') ? 'файл' : 'фото');
  if (o.dir === 'in') { if (!o.cid) return; const ct = await env.DB.prepare('SELECT tg_id FROM cur_tg WHERE cid=?').bind(o.cid).first(); if (!ct || !ct.tg_id) return;
    const nm = await stuName(env, o.uid), via = o.via === 'bot' ? ' в боте' : '';
    const j = await tgSend(env, ct.tg_id, '💬 <b>' + th(nm) + ' написал' + fem(nm) + via + '</b>\n' + body, [[{ text: 'Открыть чат', url: maLink(env, 'chat_' + o.uid) }], [{ text: 'Ответить здесь', callback_data: 'chr:' + o.uid }]]);
    return frAdd(env, ct.tg_id, j, { uid: o.uid, as: 'out' }) }
  if (o.dir === 'out') { const st = await env.DB.prepare('SELECT tg_chat FROM student WHERE uid=?').bind(o.uid).first(); if (!st || !st.tg_chat) return;
    let quote = ''; if (!o.mass) { const qm = o.reply_to ? await env.DB.prepare("SELECT text FROM chat_msg WHERE id=? AND uid=?").bind(o.reply_to, o.uid).first() : await env.DB.prepare("SELECT text FROM chat_msg WHERE uid=? AND dir='in' AND id<? AND del=0 ORDER BY id DESC LIMIT 1").bind(o.uid, msg.id).first(); if (qm && qm.text) quote = '<blockquote>' + th(qm.text.slice(0, 200)) + '</blockquote>\n' }
    const who = o.who || 'Куратор', j = await tgSend(env, st.tg_chat, '💬 <b>' + th(who) + (o.mass ? ' написал' : ' ответил') + fem(who) + '</b>\n' + quote + body, [[{ text: 'Открыть чат', url: maLink(env, 'chat') }], [{ text: 'Ответить здесь', callback_data: 'chs:' + o.uid }]].concat(o.mass || !o.cid ? [] : [crStars(msg.id, 0)]));
    return frAdd(env, st.tg_chat, j, { uid: o.uid, as: 'in' }) } }
/* кто открыл чат: ученик (свой), куратор (свой ученик ?u=), админ (любой ?u=); токен просмотра «смотреть как» — только чтение */
/* ---------- умный поиск по курсу (1.11, макет «Умный поиск») ----------
   Корпус: уроки из расписания (loadData: модуль, часть, урок) + содержимое уроков из kv 'srchidx' {id: {a: «В этом уроке»[], tc: [[сек, подпись]], m: материалы[]}}
   (собирает админ скриптом в браузере → POST /srch/index) + записи эфиров с главами. Вопрос своими словами → ИИ: короткий ответ + 3–5 мест (урок/эфир + секунда).
   Ответы кэшируются по нормализованному вопросу на 7 дней; лимит 40 вопросов в сутки на ученика. */
const SRCH_DAY = 40;
async function srchCorpus(env) { const D = await loadData(env), X = (await kvGet(env, 'srchidx')) || {}, L = [], ref = {};
  for (const m of D.modules || []) for (const p of m.parts || []) for (const l of p.lessons || []) { const x = X[l.id] || {}, k = 'L' + l.id;
    ref[k] = { kind: 'lesson', id: l.id, module: m.name, part: p.name, title: l.t, tc: x.tc || [] };
    L.push(k + ' | ' + m.name + ' / ' + p.name + ' | ' + l.t + (x.a && x.a.length ? ' | о чём: ' + x.a.join('; ') : '') + (x.tc && x.tc.length ? ' | тайм-коды: ' + x.tc.map(t => hms0(t[0]) + ' ' + t[1]).join('; ') : '') + (x.m && x.m.length ? ' | материалы: ' + x.m.join(', ') : '')) }
  try { const E = await qAll(env.DB.prepare("SELECT id, title, about, chapters, start FROM efir WHERE del=0 AND status IN ('done','rec') AND kind!='auto' ORDER BY start DESC LIMIT 40"));
    for (const e of E) { const ch = efJ(e.chapters, []), k = 'E' + e.id; ref[k] = { kind: 'efir', id: e.id, module: 'Эфир · ' + dayStr(new Date(e.start || Date.now())), title: e.title, tc: ch.map(c => [c.t | 0, c.title]) };
      L.push(k + ' | Эфир | ' + e.title + (e.about ? ' | ' + String(e.about).slice(0, 200) : '') + (ch.length ? ' | главы: ' + ch.map(c => hms0(c.t) + ' ' + c.title).join('; ') : '')) } } catch (x) {}
  return { text: L.join('\n'), ref } }
const hms0 = s => { s = s | 0; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0') };
async function srchApi(env, req, path) { const u = new URL(req.url); let o = {}; if (req.method === 'POST') { try { o = JSON.parse(await req.text() || '{}') } catch (e) { o = {} } }
  const W = await chatWho(env, req, u, o); if (!W) return json(req, { ok: false, err: 'Нужно войти', st: 401 }, 401);
  if (path === '/srch/index' && req.method === 'POST') { if (W.me !== 'admin') return json(req, { ok: false, err: 'Только админ' }, 403);
    const X = (await kvGet(env, 'srchidx')) || {}, it = o.items || {}; let n = 0;
    for (const id of Object.keys(it).slice(0, 400)) { if (!/^\d{5,12}$/.test(id)) continue; const v = it[id] || {};
      X[id] = { a: (Array.isArray(v.a) ? v.a : []).map(x => bStr(x, 160)).filter(Boolean).slice(0, 12), tc: (Array.isArray(v.tc) ? v.tc : []).map(t => [Math.max(0, +t[0] | 0), bStr(t[1], 120)]).filter(t => t[1]).slice(0, 30), m: (Array.isArray(v.m) ? v.m : []).map(x => bStr(x, 80)).filter(Boolean).slice(0, 10) }; n++ }
    await kvPut(env, 'srchidx', X); await kvPut(env, 'srchcache', {}); return json(req, { ok: true, n, total: Object.keys(X).length }) }
  if (path === '/srch/ask' && req.method === 'POST') { const q = String(o.q || '').replace(/\s+/g, ' ').trim().slice(0, 200); if (q.length < 3) return json(req, { ok: false, err: 'Напиши вопрос подлиннее' }, 400);
    const key = q.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim(), C = (await kvGet(env, 'srchcache')) || {};
    if (C[key] && msNow() - C[key].at < 7 * 864e5) return json(req, Object.assign({ ok: true, cached: 1 }, C[key].r));
    const dk = 'srchn:' + (W.uid || W.me) + ':' + dayStr(), dn = +((await kvGet(env, dk)) || 0); if (W.me === 'student' && dn >= SRCH_DAY) return json(req, { ok: false, err: 'На сегодня вопросов хватит — спроси Нейро в чате' }, 429);
    const { text, ref } = await srchCorpus(env);
    const sys = 'Ты поиск по курсу онлайн-школы дизайна OduvanovSchool (дизайн карточек маркетплейсов с ИИ). Тебе дают список мест курса: строки «КОД | модуль | урок | о чём | тайм-коды | материалы». Ученик пишет вопрос своими словами. Найди 1–5 самых подходящих мест (уроки или эфиры) и, если по тайм-кодам видно нужный момент, — секунду начала. Ответь ТОЛЬКО JSON без пояснений: {"answer":"2–3 коротких предложения по-русски, на «ты», без воды: прямой ответ на вопрос по смыслу курса и где смотреть","hits":[{"ref":"КОД","sec":число или null,"why":"до 60 символов: что именно там, без повтора названия урока"}]}. Не выдумывай уроки, коды бери только из списка. Если в курсе этого нет — hits пустой, а в answer честно скажи, что в курсе такого урока нет, и предложи спросить Нейро или куратора.';
    const { r, j } = await aiFetch(env, JSON.stringify({ model: AI_MODEL(env), max_tokens: 700, system: [{ type: 'text', text: sys }, { type: 'text', text: text, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: q }] }));
    if (!r || !r.ok) return json(req, { ok: false, err: 'Поиск сейчас недоступен — попробуй через минуту' }, 502);
    let out = null; try { const t = ((j.content || []).find(c => c.type === 'text') || {}).text || ''; out = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)) } catch (e) { out = null }
    if (!out) return json(req, { ok: false, err: 'Не получилось разобрать ответ — попробуй переформулировать' }, 502);
    const hits = (Array.isArray(out.hits) ? out.hits : []).map(h => { const R = ref[h && h.ref]; if (!R) return null; let sec = h.sec != null && isFinite(+h.sec) ? Math.max(0, +h.sec | 0) : null;
      return { kind: R.kind, id: R.id, module: R.kind === 'lesson' ? R.module + (R.part && R.part !== R.module ? ' · ' + R.part : '') : R.module, title: R.title, sec, why: bStr(h.why, 90) } }).filter(Boolean).slice(0, 5);
    const res = { answer: bStr(out.answer, 600), hits }; C[key] = { at: msNow(), r: res }; const ks = Object.keys(C); if (ks.length > 300) for (const k of ks.sort((a, b) => C[a].at - C[b].at).slice(0, ks.length - 300)) delete C[k];
    await kvPut(env, 'srchcache', C); await kvPut(env, dk, dn + 1); await logIt(env, 'srch', W.uid || 0, q.slice(0, 120));
    return json(req, Object.assign({ ok: true }, res)) }
  return json(req, { ok: false, err: 'not found' }, 404) }
async function chatWho(env, req, u, o) { const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/, '') || u.searchParams.get('t') || (o && o.t) || '';
  if (/^\d+\.[0-9a-z]+\.[av]\.[0-9a-f]{32}$/.test(t)) { const uid = await authUid(env, t, 'a'); return uid ? { me: 'student', uid } : null }
  if (/\.w\./.test(t)) { const w = await viewTok(env, t); return w ? { me: 'student', uid: w.uid, ro: true } : null }
  if (!/^[0-9a-f]{32}$/.test(t)) return null; const s = await kvGet(env, 'sess:' + t); if (!s || !(s.exp > msNow())) return null;
  if (s.role === 'student') return s.uid ? { me: 'student', uid: +s.uid } : null; if (s.role !== 'admin' && s.role !== 'curator') return null;
  const target = +((o && o.u) || u.searchParams.get('u') || 0); if (!target) return { me: s.role, s, uid: 0 };
  const st = await staffCan(env, s, target); return st ? { me: s.role, s, uid: target, st } : { me: s.role, s, uid: 0, forbidden: true } }
async function stuTg(env, uid) { const a = await env.DB.prepare('SELECT username FROM stu_tg WHERE uid=?').bind(uid).first().catch(() => null); if (a && a.username) return a.username;
  const b = await env.DB.prepare('SELECT u.username FROM student s JOIN tg_user u ON u.chat=s.tg_chat WHERE s.uid=?').bind(uid).first().catch(() => null); return b && b.username || null }
async function chatApi(env, req, path) { const u = new URL(req.url); await bksSt(env);
  const o = req.method === 'POST' ? await req.json().catch(() => ({})) : {}, W = await chatWho(env, req, u, o); if (!W) return deny(req);
  if (W.forbidden) return json(req, { ok: false, err: 'Это не твой ученик' }, 403);
  if (path === '/chat/dialogs') { if (!W.s) return json(req, { ok: false, err: 'Только для кураторов' }, 403); const s = W.s, adm = s.role === 'admin', f = u.searchParams.get('f') === 'wait' ? 'wait' : 'all';
    const [sr, lr, ur, wr, tr] = await env.DB.batch([adm ? env.DB.prepare('SELECT uid, curator, name FROM student WHERE uid IN (SELECT DISTINCT uid FROM chat_msg) OR curator IS NOT NULL') : env.DB.prepare('SELECT uid, curator, name FROM student WHERE curator=?').bind(s.cid),
      env.DB.prepare('SELECT m.uid, m.text, m.at, m.dir, m.file_id FROM chat_msg m JOIN (SELECT uid, MAX(id) mid FROM chat_msg WHERE del=0 GROUP BY uid) x ON x.mid=m.id'),
      env.DB.prepare("SELECT uid, COUNT(*) n FROM chat_msg WHERE dir='in' AND read_at IS NULL AND del=0 GROUP BY uid"),
      env.DB.prepare("SELECT uid, cid, since FROM cwait WHERE chat LIKE 'app%'"),
      /* QA раунд 3 (Н5): ожидания из Telegram-лички куратора (те же cwait, что считает пульт) — строкой «ждёт ответа в Telegram» */
      adm ? env.DB.prepare("SELECT w.cid, w.chat, w.uid, w.since, s.name sname, u.username, u.name uname FROM cwait w LEFT JOIN student s ON s.uid=w.uid LEFT JOIN tg_user u ON u.chat=w.chat WHERE w.chat NOT LIKE 'app%'")
        : env.DB.prepare("SELECT w.cid, w.chat, w.uid, w.since, s.name sname, u.username, u.name uname FROM cwait w LEFT JOIN student s ON s.uid=w.uid LEFT JOIN tg_user u ON u.chat=w.chat WHERE w.chat NOT LIKE 'app%' AND w.cid=?").bind(s.cid)]);
    const L = {}, U = {}, Wt = {}; for (const x of lr.results || []) L[x.uid] = x; for (const x of ur.results || []) U[x.uid] = x.n; for (const x of wr.results || []) Wt[x.uid] = x.since * 1000;
    const N = await nameMap(env), out = [];
    for (const x of sr.results || []) { if (isStaffUid(env, x.uid)) continue; if (adm && !L[x.uid] && f === 'all' && !Wt[x.uid]) continue; if (f === 'wait' && !Wt[x.uid]) continue; const l = L[x.uid];
      out.push({ uid: x.uid, name: N[x.uid] || x.name || null, cid: x.curator || null, last: l ? { text: l.text || (l.file_id ? '📎 файл' : ''), at: l.at, dir: l.dir } : null, unread: U[x.uid] || 0, wait_since: Wt[x.uid] || null }) }
    let wtg = 0; for (const w of tr.results || []) { if (w.uid && isStaffUid(env, w.uid)) continue; if (!CURATORS.some(c => c.id === w.cid)) continue; wtg++;
      out.push({ uid: w.uid || null, name: (w.uid && N[w.uid]) || w.sname || w.uname || (w.username ? '@' + w.username : null), cid: w.cid, cname: (CURATORS.find(c => c.id === w.cid) || {}).name || null, src: 'tg', tg: w.username || null, chat: String(w.chat), last: null, unread: 0, wait_since: w.since * 1000 }) }
    out.sort((a, b) => (!!b.wait_since - !!a.wait_since) || (a.wait_since && b.wait_since ? a.wait_since - b.wait_since : 0) || ((b.last ? b.last.at : 0) - (a.last ? a.last.at : 0)) || String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
    return json(req, { ok: true, me: s.role, f, dialogs: out, wait: out.filter(x => x.wait_since).length, wait_tg: wtg }, 200, { 'Cache-Control': 'no-store' }) }
  const uid = W.uid; if (!uid) return json(req, { ok: false, err: 'Укажи ученика' }, 400);
  if (path === '/chat/list') { const before = +u.searchParams.get('before') || 0, st = await env.DB.prepare('SELECT curator, name FROM student WHERE uid=?').bind(uid).first() || {};
    const ms = await qAll(env.DB.prepare('SELECT m.*, r.stars, fb.at fb_at, f.name fname, f.mime fmime FROM chat_msg m LEFT JOIN chat_rate r ON r.mid=m.id LEFT JOIN chat_fb fb ON fb.mid=m.id LEFT JOIN bank_file f ON f.id=m.file_id WHERE m.uid=? AND m.del=0 AND (?=0 OR m.id<?) ORDER BY m.id DESC LIMIT 60').bind(uid, before, before));
    { const RE = await reactsFor(env, ms.map(m => m.id), reactKey(W)); for (const m of ms) m.re = RE[m.id] || []; if (W.me !== 'student') for (const m of ms) m.fb_at = null }
    const un = await env.DB.prepare('SELECT COUNT(*) n FROM chat_msg WHERE uid=? AND dir=? AND read_at IS NULL AND del=0').bind(uid, W.me === 'student' ? 'out' : 'in').first();
    return json(req, { ok: true, me: W.me, ro: !!W.ro, student: { uid, name: await stuName(env, uid), tg: W.me === 'student' ? undefined : await stuTg(env, uid) }, curator: st.curator ? await curCard(env, st.curator) : null, msgs: ms.reverse().map(chatPub), unread: un ? un.n : 0, more: ms.length === 60 }, 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/chat/file') { const f = await env.DB.prepare("SELECT name, mime, data FROM bank_file WHERE id=? AND uid=? AND kind='chat'").bind(+u.searchParams.get('id'), uid).first(); if (!f) return new Response('нет файла', { status: 404, headers: cors(req) });
    return new Response(Uint8Array.from(atob(f.data), c => c.charCodeAt(0)), { headers: Object.assign({ 'Content-Type': f.mime, 'Content-Disposition': 'inline; filename*=UTF-8\'\'' + encodeURIComponent(f.name), 'Cache-Control': 'private, max-age=3600' }, cors(req)) }) }
  if (req.method !== 'POST') return json(req, { ok: false, err: 'not found' }, 404);
  if (W.ro) return json(req, { ok: false, err: 'Режим просмотра — только чтение' }, 403);
  if (path === '/chat/read') { const dir = W.me === 'student' ? 'out' : W.me === 'curator' ? 'in' : null; if (!dir) return json(req, { ok: true, marked: 0 });
    const r = await env.DB.prepare('UPDATE chat_msg SET read_at=? WHERE uid=? AND dir=? AND read_at IS NULL').bind(msNow(), uid, dir).run(); return json(req, { ok: true, marked: (r.meta && r.meta.changes) || 0 }) }
  /* 30.10: первый вход — ученик пишет свой @username (GET — прочитать). Куратор видит его в шапке чата (/chat/list → student.tg) */
  if (path === '/chat/tgname') { if (W.me !== 'student' || W.ro) return json(req, { ok: false, err: 'Только ученик' }, 403);
    if (req.method !== 'POST') { const r = await env.DB.prepare('SELECT username FROM stu_tg WHERE uid=?').bind(uid).first(); return json(req, { ok: true, tg: r ? r.username : null }) }
    const t = String(o.tg || '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '');
    if (!t) { await env.DB.prepare('DELETE FROM stu_tg WHERE uid=?').bind(uid).run(); return json(req, { ok: true, tg: null }) }
    if (!/^[A-Za-z0-9_]{5,32}$/.test(t)) return json(req, { ok: false, err: 'Проверь ник: латиница, цифры и _, от 5 символов' }, 400);
    await env.DB.prepare('INSERT OR REPLACE INTO stu_tg (uid, username, at) VALUES (?,?,?)').bind(uid, t, new Date().toISOString()).run(); return json(req, { ok: true, tg: t }) }
  if (path === '/chat/rate') { if (W.me !== 'student') return json(req, { ok: false, err: 'Оценку ставит ученик' }, 403); const stars = Math.round(+o.stars);
    if (!(stars >= 1 && stars <= 5)) return json(req, { ok: false, err: 'Оценка — от 1 до 5' }, 400);
    const rr = await chatRateDo(env, uid, +o.mid, stars); if (!rr.ok) return json(req, rr, 400); return json(req, { ok: true, mid: rr.mid, stars }) }
  if (path === '/chat/react') { const e = String(o.e || ''); if (!REACT_OK.includes(e)) return json(req, { ok: false, err: 'Такой реакции нет' }, 400);
    const m = await env.DB.prepare('SELECT id FROM chat_msg WHERE id=? AND uid=? AND del=0').bind(+o.mid, uid).first(); if (!m) return json(req, { ok: false, err: 'Сообщение не найдено' }, 404);
    const k = reactKey(W), had = await env.DB.prepare('SELECT 1 x FROM chat_react WHERE mid=? AND who=? AND e=?').bind(m.id, k, e).first();
    if (had) await env.DB.prepare('DELETE FROM chat_react WHERE mid=? AND who=? AND e=?').bind(m.id, k, e).run();
    else { const n = await env.DB.prepare('SELECT COUNT(*) n FROM chat_react WHERE mid=? AND who=?').bind(m.id, k).first(); if (n && n.n >= 3) return json(req, { ok: false, err: 'Не больше трёх реакций на сообщение' }, 400);
      await env.DB.prepare('INSERT INTO chat_react (mid, who, e, at) VALUES (?,?,?,?)').bind(m.id, k, e, msNow()).run() }
    const RE = await reactsFor(env, [m.id], k); return json(req, { ok: true, mid: m.id, re: RE[m.id] || [] }) }
  if (path === '/chat/feedback') { if (W.me !== 'student') return json(req, { ok: false, err: 'Отзыв оставляет ученик' }, 403);
    const r = await env.DB.prepare('SELECT mid, cid, stars FROM chat_rate WHERE mid=? AND uid=?').bind(+o.mid, uid).first(); if (!r) return json(req, { ok: false, err: 'Сначала поставь оценку' }, 400);
    const reasons = (Array.isArray(o.reasons) ? o.reasons : []).map(String), text = String(o.text || '').trim();
    if (!reasons.filter(x => CHAT_FB_RS.includes(x)).length && !text) return json(req, { ok: false, err: 'Выбери причину или напиши пару слов' }, 400);
    await chatFbDo(env, uid, r, reasons, text); return json(req, { ok: true }) }
  if (path === '/chat/send') { const text = String(o.text || '').trim().slice(0, 4000); if (!text && !o.file) return json(req, { ok: false, err: 'Пустое сообщение' }, 400);
    const st = await env.DB.prepare('SELECT curator FROM student WHERE uid=?').bind(uid).first() || {}, rt = +o.reply_to || 0;
    if (rt && !(await env.DB.prepare('SELECT id FROM chat_msg WHERE id=? AND uid=?').bind(rt, uid).first())) return json(req, { ok: false, err: 'Нет такого сообщения' }, 400);
    if (W.me === 'student') { if (!st.curator) return json(req, { ok: false, err: 'Куратора назначат в ближайшие дни — пока спроси Нейро-Одуванова или напиши в Службу заботы' }, 400);
      const fl = await env.DB.prepare("SELECT COUNT(*) n FROM chat_msg WHERE uid=? AND dir='in' AND at>?").bind(uid, msNow() - 60e3).first(); if (fl && fl.n >= 10) return json(req, { ok: false, err: 'Слишком быстро — подожди минуту' }, 429) }
    let file = null; try { file = await bankFile(env, uid, 'chat', 0, o.file) } catch (e) { return json(req, { ok: false, err: e.message }, 400) }
    const cid = W.me === 'student' ? st.curator : (st.curator || W.s.cid || null);
    const msg = await chatSend(env, { uid, cid, dir: W.me === 'student' ? 'in' : 'out', text, file, fname: o.file && bStr(o.file.name, 120), fmime: o.file && (String(o.file.data || '').match(/^data:([^;]+)/) || [])[1], reply_to: rt || null, via: ['app', 'site', 'bot'].includes(o.via) ? o.via : 'app',
      who: W.me === 'student' ? null : staffWho(W.s), byCur: W.me === 'curator' });
    return json(req, { ok: true, msg }) }
  return json(req, { ok: false, err: 'not found' }, 404) }

/* ---------- бот: «Ответить здесь», ученик пишет боту, напоминания об оплате, приглашение по карте ---------- */
async function bksCallback(env, q) { await bankEnsure(env); const d = String(q.data || ''), from = String(q.from && q.from.id), ans = t => tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: t || undefined });
  const msg = q.message || {}, edit = (text, kb) => tg(env, 'editMessageText', { chat_id: msg.chat && msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: kb || [] } });
  /* 1.11 (Роман: «оценка ответа куратора, когда он приходит в бота»): ☆ под ответом → chat_rate; 1–2 — «Что пошло не так?» с причинами */
  const cr = d.match(/^cr([tfw]):(\d+)(?::(\d+))?$/); if (cr) { const mid = +cr[2], m = await env.DB.prepare("SELECT c.id, c.uid, c.cid, s.tg_chat FROM chat_msg c JOIN student s ON s.uid=c.uid WHERE c.id=? AND c.dir='out'").bind(mid).first();
    if (!m || String(m.tg_chat) !== from) return ans('Это не твой чат');
    if (cr[1] === 't') { const n = Math.max(1, Math.min(5, +cr[3] || 0)), r = await chatRateDo(env, m.uid, mid, n); if (!r.ok) return ans(r.err);
      const kb = ((msg.reply_markup && msg.reply_markup.inline_keyboard) || []).filter(row => !(row[0] && /^crt:/.test(row[0].callback_data || ''))).concat([crStars(mid, n)]);
      await tg(env, 'editMessageReplyMarkup', { chat_id: msg.chat && msg.chat.id, message_id: msg.message_id, reply_markup: { inline_keyboard: kb } });
      if (n <= 2) { const had = await env.DB.prepare('SELECT 1 x FROM chat_fb WHERE mid=?').bind(mid).first(); if (!had) await tgSend(env, from, '<b>' + nbt('Что пошло не так?') + '</b>\n' + nbt('Роман прочитает лично. Куратор не увидит, кто написал.'), [[CR_LOW[0], CR_LOW[1]], [CR_LOW[2]], [CR_LOW[3], CR_LOW[4]]].map(row => row.map(t => ({ text: t, callback_data: 'crf:' + mid + ':' + CR_LOW.indexOf(t) }))).concat([[{ text: 'Написать своими словами', callback_data: 'crw:' + mid }]])) }
      return ans(n <= 2 ? 'Спасибо, что честно' : 'Спасибо за оценку!') }
    const r = await env.DB.prepare('SELECT mid, cid, stars FROM chat_rate WHERE mid=? AND uid=?').bind(mid, m.uid).first(); if (!r) return ans('Сначала поставь оценку');
    if (cr[1] === 'f') { const why = CR_LOW[+cr[3]]; if (!why) return ans(); await chatFbDo(env, m.uid, r, [why], ''); await edit('🙏 ' + nbt('Спасибо, передали Роману: «' + why + '». Разберёмся и вернёмся к тебе.')); return ans('Передали') }
    const j = await tg(env, 'sendMessage', { chat_id: from, text: nbt('✍️ Напиши, что было не так, ответом на это сообщение. Куратор не увидит, кто написал.'), reply_markup: { force_reply: true, input_field_placeholder: 'Что было не так' } });
    await frAdd(env, from, j, { uid: m.uid, as: 'fb', mid }); return ans() }
  if (/^ch[rs]:\d+$/.test(d)) { const uid = +d.slice(4), st = await env.DB.prepare('SELECT uid, curator, tg_chat FROM student WHERE uid=?').bind(uid).first(); if (!st) return ans('Ученик не найден');
    if (d[2] === 'r') { const ct = st.curator && await env.DB.prepare('SELECT tg_id FROM cur_tg WHERE cid=?').bind(st.curator).first(), adm = await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(from).first();
      if (!adm && !(ct && String(ct.tg_id) === from)) return ans('Это ученик другого куратора');
      const nm = await stuName(env, uid), j = await tg(env, 'sendMessage', { chat_id: from, text: '✍️ Ответ для ' + nm + ' — напиши его ответом на это сообщение, он уйдёт в чат на платформе.', reply_markup: { force_reply: true, input_field_placeholder: 'Ответ ученику' } });
      await frAdd(env, from, j, { uid, as: 'out' }); return ans() }
    if (String(st.tg_chat) !== from) return ans('Это не твой чат');
    const c = CURATORS.find(x => x.id === st.curator), j = await tg(env, 'sendMessage', { chat_id: from, text: nbt('✍️ Напиши сообщение ' + (c ? datv(c.name) : 'куратору') + ' ответом на это — оно уйдёт в чат с куратором.'), reply_markup: { force_reply: true, input_field_placeholder: 'Сообщение куратору' } });
    await frAdd(env, from, j, { uid, as: 'in' }); return ans() }
  const m = d.match(/^bp:(y|n|d\d{1,2}):(\d+)$/); if (!m) return ans();
  const o = await env.DB.prepare('SELECT o.*, s.tg_chat FROM bank_order o JOIN student s ON s.uid=o.uid WHERE o.id=?').bind(+m[2]).first(); if (!o || String(o.tg_chat) !== from) return ans('Заказ не найден');
  const cur = o.cur || 'RUB', pd = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) s FROM bank_tx WHERE order_id=? AND uid=? AND del_at IS NULL AND COALESCE(cur,'RUB')=?").bind(o.id, o.uid, cur).first(), left = Math.max(0, (o.price || 0) - (pd ? pd.s : 0));
  const what = th(String(o.product || o.client || 'заказ'));
  if (m[1] === 'y') { if (o.status === 'done') { await edit('✅ Уже записано: заказ «' + what + '» в «Готово».'); return ans() }
    if (left > 0) { const day = dayStr(), rate = cur === 'RUB' ? 1 : await cbrRate(env, day, cur); if (!rate) return ans('Не получилось взять курс ЦБ — попробуй через минуту');
      await env.DB.prepare('INSERT INTO bank_tx (uid, amount, cur, rub, rate, day, what, src, client, order_id, file_id, at, conf) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)').bind(o.uid, left, cur, Math.round(left * rate), cur === 'RUB' ? null : Math.round(rate * 10000) / 10000, day, bStr(o.product, 200), bStr(o.src, 60), bStr(o.client, 120), o.id, null, new Date().toISOString()).run() }
    await env.DB.prepare("UPDATE bank_order SET status='done', upd=? WHERE id=?").bind(new Date().toISOString(), o.id).run(); await logIt(env, 'bank-remind-yes', o.uid, left + ' ' + cur);
    await edit('✅ <b>' + (left > 0 ? 'Записал ' + money(left, cur) + ' в банк' : 'Заказ закрыт') + '</b>\n' + nbt('Заказ «' + what + '» — в «Готово». Баллы за заработок начислятся, когда куратор подтвердит оплату. Скрин оплаты можно добавить в банке — так подтвердят быстрее.'), [[{ text: 'Открыть банк', url: maLink(env, 'bank') }]]); return ans('Записано') }
  if (m[1] === 'n') { await env.DB.prepare('UPDATE bank_order SET remind_at=?, reminded=? WHERE id=?').bind(addDays(dayStr(), 3), dayStr(), o.id).run();
    await edit(nbt('Когда напомнить про ' + money(left || o.price || 0, cur) + ' за «' + what + '»?'), [[{ text: 'Завтра', callback_data: 'bp:d1:' + o.id }, { text: 'Через 3 дня', callback_data: 'bp:d3:' + o.id }], [{ text: 'Через неделю', callback_data: 'bp:d7:' + o.id }], [{ text: 'Выбрать дату', url: maLink(env, 'bank') }]]); return ans() }
  const n = Math.min(30, +m[1].slice(1) || 1), day = addDays(dayStr(), n); await env.DB.prepare('UPDATE bank_order SET remind_at=?, reminded=NULL WHERE id=?').bind(day, o.id).run();
  await edit(nbt('⏰ Хорошо, напомню ' + human(day) + ' про «' + what + '».')); return ans('Напомню ' + human(day)) }
/* ответ на сообщение бота «Ответить здесь» (force_reply) или на само уведомление → в чат на платформе */
async function bksReply(env, m, chat) { if (!m.reply_to_message) return false; await bankEnsure(env); const L = (await kvGet(env, 'fr:' + chat)) || [], x = L.find(y => y.m === m.reply_to_message.message_id); if (!x) return false;
  const st = await env.DB.prepare('SELECT uid, curator, tg_chat FROM student WHERE uid=?').bind(x.uid).first(); if (!st) return false;
  if (x.as === 'fb') { const t = String(m.text || m.caption || '').trim(); if (!t || String(st.tg_chat) !== chat) return true; const r = await env.DB.prepare('SELECT mid, cid, stars FROM chat_rate WHERE mid=? AND uid=?').bind(x.mid, st.uid).first();
    if (r) { const old = await env.DB.prepare('SELECT reasons FROM chat_fb WHERE mid=?').bind(x.mid).first(); await chatFbDo(env, st.uid, r, old ? efJ(old.reasons, []) : [], t) } await tgSend(env, chat, '🙏 ' + nbt('Спасибо, передали Роману. Разберёмся и вернёмся к тебе.')); return true }
  const text = String(m.text || m.caption || '').trim().slice(0, 4000), file = await tgFileToBank(env, st.uid, m).catch(() => null);
  if (!text && !file) { await tgSend(env, chat, 'Пока доходят только текст, фото и PDF до 650 КБ. Голосовое лучше отправить в чате приложения.'); return true }
  if (x.as === 'out') { const ct = st.curator && await env.DB.prepare('SELECT tg_id FROM cur_tg WHERE cid=?').bind(st.curator).first(), adm = await env.DB.prepare('SELECT name FROM tg_admin WHERE chat=?').bind(chat).first(), isCur = !!(ct && String(ct.tg_id) === chat);
    if (!isCur && !adm) return false; const c = CURATORS.find(y => y.id === st.curator);
    await chatSend(env, { uid: st.uid, cid: st.curator || null, dir: 'out', text, file, via: 'bot', who: isCur ? (c ? c.name : 'Куратор') : (String(adm.name || '').split(' ')[0] || 'Роман'), byCur: isCur });
    await tgSend(env, chat, '✅ Отправлено ' + th(await stuName(env, st.uid)) + ' — в чат и в бот.'); return true }
  if (String(st.tg_chat) !== chat) return false; if (!st.curator) { await tgSend(env, chat, nbt('Куратора назначат в ближайшие дни. Пока спроси Нейро-Одуванова или напиши в Службу заботы.'), [[{ text: 'Служба заботы', url: CARE }]]); return true }
  await chatSend(env, { uid: st.uid, cid: st.curator, dir: 'in', text, file, via: 'bot' }); const c = CURATORS.find(y => y.id === st.curator);
  await tgSend(env, chat, nbt('✅ Передал ' + (c ? datv(c.name) : 'куратору') + '. Ответ придёт сюда и в чат в приложении.')); return true }
/* ученик пишет боту обычным сообщением → в чат с куратором (у куратора это тот же диалог, значок Telegram) */
async function bksStudentMsg(env, m, chat, text) { if (text.startsWith('/') || !(text || (m.photo && m.photo.length) || m.document)) return false; await bankEnsure(env);
  const st = await env.DB.prepare('SELECT uid, curator FROM student WHERE tg_chat=?').bind(chat).first(); if (!st || !st.curator || isStaffUid(env, st.uid)) return false;
  if (await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(chat).first() || await env.DB.prepare('SELECT cid FROM cur_tg WHERE tg_id=?').bind(chat).first()) return false;
  const file = await tgFileToBank(env, st.uid, m).catch(() => null); if (!text && !file) return false;
  const last = await env.DB.prepare("SELECT at FROM chat_msg WHERE uid=? AND dir='in' AND via='bot' ORDER BY id DESC LIMIT 1").bind(st.uid).first();
  await chatSend(env, { uid: st.uid, cid: st.curator, dir: 'in', text: String(text || m.caption || '').slice(0, 4000), file, via: 'bot' });
  if (!last || msNow() - last.at > 30 * 60e3) { const c = CURATORS.find(y => y.id === st.curator); await tgSend(env, chat, nbt('✅ Передал ' + (c ? datv(c.name) : 'куратору') + ' в чат. Ответ придёт сюда и в приложение.'), [[{ text: 'Открыть чат', url: maLink(env, 'chat') }]]) }
  return true }
/* приглашение по карте: /start c<h> или startapp c<h> → приветствие с картой пригласившего, учёт bank_ref */
async function shareH(env, uid) { const h = (await hmacHex(env, 'share|' + uid)).slice(0, 10); await env.DB.prepare('INSERT OR IGNORE INTO bank_share (h, uid) VALUES (?,?)').bind(h, uid).run(); return h }
async function refCard(env, h) { const sh = await env.DB.prepare('SELECT uid FROM bank_share WHERE h=?').bind(h).first(); if (!sh) return null; const T = await bankTotals(env, sh.uid), st = bStatus(T.total);
  const L = Object.assign({ free: 'https://romanoduvanov.ru/ai', about: 'https://romanoduvanov.ru/ai' }, (await kvGet(env, 'share_links')) || {});
  return { uid: sh.uid, name: await stuName(env, sh.uid), sum: T.total >= 1000 ? Math.round(T.total / 1000) * 1000 : 0, status: { key: st.key, name: st.name }, links: { free: L.free, about: L.about } } }
async function refSave(env, h, chat, card) { const st = await env.DB.prepare('SELECT tg_chat FROM student WHERE uid=?').bind(card.uid).first(); if (st && String(st.tg_chat) === String(chat)) return false;
  const r = await env.DB.prepare('INSERT OR IGNORE INTO bank_ref (h, chat, at) VALUES (?,?,?)').bind(h, String(chat), new Date().toISOString()).run(); if (r.meta && r.meta.changes) await logIt(env, 'bank-ref', card.uid, h); return true }
const refText = c => { const f = fem(c.name); return '👋 <b>Привет!</b>\n\n' + nbt('Тебя пригласил' + f + ' ' + th(c.name) + ' — ' + (f ? 'она' : 'он') + ' учится в OduvanovSchool на курсе «AI-креатор»' + (c.sum ? ' и уже заработал' + f + ' на дизайне около ' + money(c.sum, 'RUB') : '') + '. Карта дизайнера — <b>' + c.status.name + '</b>.') + '\n\n' + nbt('Хочешь так же? Начни с бесплатного урока или посмотри, что за школа.') };
async function refStart(env, chat, h, from) { await bankEnsure(env); const c = await refCard(env, h); if (from) await saveTgUser(env, from);
  if (!c) return tgSend(env, chat, '<b>OduvanovSchool</b> — онлайн-школа дизайна Романа Одуванова.', [[{ text: 'Что за школа', url: 'https://romanoduvanov.ru/ai' }]]);
  if (!(await refSave(env, h, chat, c))) return tgSend(env, chat, nbt('Это твоя ссылка-приглашение. Отправь картинку с картой друзьям — по QR они попадут сюда и увидят твою карту.'));
  return tgSend(env, chat, refText(c), [[{ text: 'Бесплатный урок', url: c.links.free }], [{ text: 'Что за школа', url: c.links.about }]]) }
/* cron 45: напоминания об ожидаемой оплате (с 10 до 21 МСК), «ждут больше 24 ч» кураторам (в 10 часов по их рабочим дням), чистка удалённых оплат */
async function bankJob(env, B) { await bankEnsure(env); await bankPurge(env); const out = { remind: 0, wait24: 0 }, now = msk(), hr = now.getUTCHours(), today = dayStr();
  /* D1 на бесплатном тарифе — ~50 запросов за вызов: остаток к оплате и настройки уведомлений берём тем же запросом, отметки — одной пачкой, не больше 8 напоминаний за запуск */
  if (hr >= 10 && hr < 21) { const rs = await qAll(env.DB.prepare("SELECT o.id, o.uid, o.product, o.client, o.price, o.cur, o.pay_at, o.remind_at, s.tg_chat, (SELECT COALESCE(SUM(t.amount),0) FROM bank_tx t WHERE t.order_id=o.id AND t.uid=o.uid AND t.del_at IS NULL AND COALESCE(t.cur,'RUB')=COALESCE(o.cur,'RUB')) paid, (SELECT v FROM kv WHERE k='notif:'||o.uid) nf FROM bank_order o JOIN student s ON s.uid=o.uid WHERE o.status NOT IN ('done','cancel') AND o.pay_at IS NOT NULL AND s.tg_chat IS NOT NULL AND COALESCE(o.remind_at, o.pay_at)<=? AND COALESCE(o.remind_at, o.pay_at)>=? AND (o.reminded IS NULL OR o.reminded<COALESCE(o.remind_at, o.pay_at)) ORDER BY o.pay_at LIMIT 8").bind(today, addDays(today, -7)));
    const marks = [];
    for (const o of rs) { if (!B.ok(1)) break; marks.push(env.DB.prepare('UPDATE bank_order SET reminded=? WHERE id=?').bind(today, o.id));
      const cur = o.cur || 'RUB', left = Math.max(0, (o.price || 0) - (o.paid || 0)); let nf = NOTIF_DEF; try { nf = Object.assign({}, NOTIF_DEF, JSON.parse(o.nf || '{}')) } catch (e) {}
      if (!left || !nf.bank) continue;
      const p = String(o.product || o.client || 'заказ'), pr = /^[А-ЯЁA-Z][а-яёa-z]/.test(p) ? p[0].toLowerCase() + p.slice(1) : p, eff = o.remind_at || o.pay_at;
      B.use(1); await tgSend(env, o.tg_chat, '💸 <b>' + nbt('Ты ждёшь ' + money(left, cur) + ' за ' + th(pr)) + '</b>\n' + nbt(eff === o.pay_at ? (o.pay_at === today ? 'Клиент обещал оплатить сегодня.' : 'Клиент обещал оплатить ' + human(o.pay_at) + '.') : 'Напоминаю, как договорились.') + ' Пришли деньги?',
        [[{ text: 'Да, записать', callback_data: 'bp:y:' + o.id }, { text: 'Ещё нет', callback_data: 'bp:n:' + o.id }]]); out.remind++ }
    if (marks.length) await env.DB.batch(marks) }
  if (hr === 10) for (const c of CURATORS) { if (!B.ok(1)) break; if (!(await curDays(env, c.id)).includes(now.getUTCDay()) || (await kvGet(env, 'c24:' + c.id)) === today) continue; await kvPut(env, 'c24:' + c.id, today);
    const n = await env.DB.prepare('SELECT COUNT(DISTINCT uid) n FROM cwait WHERE cid=? AND since<?').bind(c.id, (msNow() / 1000 | 0) - 86400).first(), ct = await env.DB.prepare('SELECT tg_id FROM cur_tg WHERE cid=?').bind(c.id).first();
    if (n && n.n && ct && ct.tg_id) { B.use(1); await tgSend(env, ct.tg_id, '⏳ <b>Ждут больше 24' + NB + 'ч: ' + n.n + ' ' + pl(n.n, ['ученик', 'ученика', 'учеников']) + '</b>\n' + nbt('Начни с тех, кто ждёт дольше всех.'), [[{ text: 'Открыть чаты', url: maLink(env, 'chats') }]]); out.wait24 += n.n } }
  return out }

/* ---------- банк: команда (подтверждение оплат, ожидают подтверждения, скрин, выгрузка) ---------- */
async function bankStaffApi(env, req, path, u) { const s = await staffSess(env, req, u); if (!s) return deny(req);
  if (path === '/bank/tx/conf' && req.method === 'POST') { const o = await req.json().catch(() => ({})), st = await staffCan(env, s, +o.u); if (!st) return json(req, { ok: false, err: 'Это не твой ученик' }, 403);
    const x = await env.DB.prepare('SELECT id, amount, cur, conf FROM bank_tx WHERE id=? AND uid=? AND del_at IS NULL').bind(+o.id, st.uid).first(); if (!x) return json(req, { ok: false, err: 'Оплата не найдена — возможно, ученик её удалил' }, 404);
    const ok = o.ok === 0 || o.ok === '0' || o.ok === false ? 0 : 1, before = await bankTotals(env, st.uid);
    await env.DB.prepare('UPDATE bank_tx SET conf=?, conf_by=?, conf_at=? WHERE id=? AND uid=?').bind(ok, staffBy(s), new Date().toISOString(), x.id, st.uid).run();
    const after = await bankTotals(env, st.uid), add = bPts(after.conf) - bPts(before.conf); await logIt(env, ok ? 'bank-conf' : 'bank-unconf', st.uid, x.id + ' ' + staffBy(s));
    if (ok && !x.conf && st.tg_chat && await notifOn(env, st.uid, 'bank')) { const w = staffWho(s), P = bPoints(after.conf, after.total);
      await tgSend(env, st.tg_chat, '✅ ' + nbt(th(w) + ' подтвердил' + fem(w) + ' оплату ' + money(x.amount, x.cur || 'RUB') + (add > 0 ? ' — +' + add + ' ' + pl(add, ['балл', 'балла', 'баллов']) + ' за заработок. В рейтинге они появятся после ближайшего обновления.' : '. До следующих +100 баллов — ' + money(1e4 - (after.conf % 1e4), 'RUB') + ' подтверждённых оплат.')) + (P.conf ? '\nВсего за заработок: ' + num3(P.conf) + ' баллов.' : ''), [[{ text: 'Открыть банк', url: maLink(env, 'bank') }]]) }
    return json(req, { ok: true, id: x.id, conf: ok, points: bPoints(after.conf, after.total), status: bStatus(after.total) }) }
  if (path === '/bank/staff/pending') { const q = 'SELECT t.uid, t.id, t.amount, t.cur, t.rub, t.day, t.what, t.src, t.file_id, s.curator FROM bank_tx t LEFT JOIN student s ON s.uid=t.uid WHERE COALESCE(t.conf,0)=0 AND t.del_at IS NULL';
    const rs = await qAll(s.role === 'admin' ? env.DB.prepare(q + ' ORDER BY t.day DESC, t.id DESC LIMIT 500') : env.DB.prepare(q + ' AND s.curator=? ORDER BY t.day DESC, t.id DESC LIMIT 500').bind(s.cid)), N = await nameMap(env);
    return json(req, { ok: true, role: s.role, pending: rs.filter(x => !isStaffUid(env, x.uid)).map(x => ({ uid: x.uid, name: N[x.uid] || null, cid: x.curator || null, id: x.id, amount: x.amount, cur: x.cur || 'RUB', rub: x.rub != null ? x.rub : x.amount, day: x.day, what: x.what || '', src: x.src || '', file: x.file_id ? 1 : 0 })) }, 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/bank/staff/file') { const st = await staffCan(env, s, +u.searchParams.get('u')); if (!st) return json(req, { ok: false, err: 'Это не твой ученик' }, 403);
    const x = await env.DB.prepare('SELECT file_id FROM bank_tx WHERE id=? AND uid=? AND del_at IS NULL').bind(+u.searchParams.get('id'), st.uid).first(); /* только скрин оплаты — не файлы заказа (ТЗ) */
    const f = x && x.file_id && await env.DB.prepare("SELECT name, mime, data FROM bank_file WHERE id=? AND uid=? AND kind='tx'").bind(x.file_id, st.uid).first(); if (!f) return new Response('нет файла', { status: 404, headers: cors(req) });
    await logIt(env, 'bank-file-staff', st.uid, staffBy(s));
    return new Response(Uint8Array.from(atob(f.data), c => c.charCodeAt(0)), { headers: Object.assign({ 'Content-Type': f.mime, 'Content-Disposition': 'inline', 'Cache-Control': 'private, max-age=600' }, cors(req)) }) }
  if (path === '/bank/staff/export') { if (s.role !== 'admin') return json(req, { ok: false, err: 'Выгрузка — только для Романа' }, 403);
    const what = u.searchParams.get('what') === 'students' ? 'students' : 'tx', cf = u.searchParams.get('cid') || '', okC = x => !cf || cf === 'all' || (cf === 'none' ? !x : x === cf), CN = {}; for (const c of CURATORS) CN[c.id] = c.full;
    const cell = v => { let t = v == null ? '' : String(v); if (/^[=+\-@]/.test(t)) t = "'" + t; return /[;"\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t }, line = a => a.map(cell).join(';');
    let L = [];
    if (what === 'tx') { const N = await nameMap(env); L.push(line(['id ученика', 'Ученик', 'Куратор', 'Дата', 'Сумма', 'Валюта', 'В рублях', 'Откуда', 'Подтверждено', 'Кто подтвердил', 'Когда']));
      for (const x of await qAll(env.DB.prepare('SELECT t.uid, t.day, t.amount, t.cur, t.rub, t.src, t.conf, t.conf_by, t.conf_at, s.curator FROM bank_tx t LEFT JOIN student s ON s.uid=t.uid WHERE t.del_at IS NULL ORDER BY t.day DESC, t.id DESC LIMIT 20000')))
        if (!isStaffUid(env, x.uid) && okC(x.curator)) L.push(line([x.uid, N[x.uid] || '', CN[x.curator] || '', x.day, x.amount, x.cur || 'RUB', x.rub != null ? x.rub : x.amount, x.src || '', x.conf ? 'да' : 'нет', x.conf ? byName(x.conf_by) : '', x.conf ? String(x.conf_at || '').slice(0, 10) : ''])) }
    else { const R = await bankStaffList(env, s); L.push(line(['id ученика', 'Ученик', 'Тариф', 'Куратор', 'Заработал, ₽', 'Подтверждено, ₽', 'Ждут подтверждения', 'Баллы за заработок', 'Статус карты', 'Оплат', 'Последняя', 'Заказов', 'В работе', 'Цель, ₽', 'Срок цели']));
      for (const x of R.students) if (okC(x.cur)) L.push(line([x.uid, x.name || '', x.tar || '', x.curName || '', x.total, x.conf, x.pending, x.pts, x.status_name, x.n, x.last || '', x.orders, x.active, x.goal ? x.goal.sum : '', x.goal ? x.goal.until : ''])) }
    await logIt(env, 'bank-export', 0, what + ' ' + (cf || 'all') + ' ' + (L.length - 1));
    return new Response('﻿' + L.join('\r\n') + '\r\n', { headers: Object.assign({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="bank-' + what + '-' + dayStr() + '.csv"', 'Cache-Control': 'no-store' }, cors(req)) }) }
  return json(req, { ok: false, err: 'not found' }, 404) }

/* ---------- кабинет куратора: /cur/* (сессия команды; куратор — только свои ученики, админ — все) ---------- */
const CUR_API = ['/cur/me', '/cur/hwlog', '/cur/hwstat', '/cur/assign', '/cur/mass', '/cur/admin', '/cur/queue', '/rev/data'];
/* 30.10 (QA №7, №13): очередь ДЗ. Её знает только GetCourse (лента ответов входа куратора), поэтому кабинет «Проверка ДЗ» на сайте (?fs=cur)
   после загрузки ленты и после каждого «Принять / Вернуть» присылает POST /cur/queue {n, old48, oldest, by?:{<cid>|none:{n, old48, oldest}}} (by — только у Романа:
   его вход видит всю очередь, разбивку по кураторам делает страница по /bank/staff/list). Храним последнее число на вход (kv hwq:<cid> | hwq:admin) с временем подсчёта;
   /cur/me и /cur/admin отдают hw_q (ждут проверки), hw_old (дольше 48 ч), hw_oldest, hw_q_at. Число старше 7 дней не показываем. */
const hwqClean = x => { if (!x || typeof x !== 'object') return null; const n = Math.round(+x.n); if (!(n >= 0 && n <= 1e4)) return null;
  const o = Math.round(+x.old48 || 0), od = Math.round(+x.oldest || 0); return { n, old48: o >= 0 && o <= n ? o : 0, oldest: od > 1e12 && od < msNow() + 864e5 ? od : null } };
async function hwQueues(env) { const fresh = x => x && x.at > msNow() - 7 * 864e5 ? x : null, adm = fresh(await kvGet(env, 'hwq:admin')), Q = {};
  for (const c of CURATORS) { const mine = fresh(await kvGet(env, 'hwq:' + c.id)), a = adm && adm.by && adm.by[c.id] ? Object.assign({ at: adm.at }, adm.by[c.id]) : null;
    Q[c.id] = [mine, a].filter(Boolean).sort((x, y) => y.at - x.at)[0] || null }
  const cs = CURATORS.map(c => Q[c.id]).filter(Boolean), olds = cs.map(x => x.oldest).filter(Boolean);
  Q.all = adm ? adm : cs.length ? { n: cs.reduce((t, x) => t + x.n, 0), old48: cs.reduce((t, x) => t + (x.old48 || 0), 0), oldest: olds.length ? Math.min(...olds) : null, at: Math.min(...cs.map(x => x.at)), part: cs.length < CURATORS.length } : null;
  return Q }
const hwqOut = q => q ? { hw_q: q.n, hw_old: q.old48 || 0, hw_oldest: q.oldest || null, hw_q_at: q.at } : { hw_q: null, hw_old: null, hw_oldest: null, hw_q_at: null };
async function curApi(env, req, path) { const u = new URL(req.url); await bksSt(env); const s = await staffSess(env, req, u); if (!s) return deny(req);
  const adm = s.role === 'admin', o = req.method === 'POST' ? await req.json().catch(() => ({})) : {}, okCid = v => CURATORS.some(c => c.id === v), now = msNow();
  if (path === '/cur/queue') { if (req.method === 'POST') { const q = hwqClean(o); if (!q) return json(req, { ok: false, err: 'n — число работ в очереди' }, 400); if (!adm && !s.cid) return json(req, { ok: false, err: 'Нет куратора в сессии' }, 400);
      const rec = Object.assign(q, { at: now }); if (adm && o.by && typeof o.by === 'object') { rec.by = {}; for (const k of Object.keys(o.by).slice(0, 20)) if (okCid(k) || k === 'none') { const x = hwqClean(o.by[k]); if (x) rec.by[k] = x } }
      await kvPut(env, 'hwq:' + (adm ? 'admin' : s.cid), rec); return json(req, { ok: true, at: now }) }
    const Q = await hwQueues(env), cq = u.searchParams.get('cid'); return json(req, Object.assign({ ok: true }, hwqOut(Q[adm ? (okCid(cq) ? cq : 'all') : s.cid])), 200, { 'Cache-Control': 'no-store' }) }
  /* /cur/me: куратор — свои цифры; Роман — выбранного куратора (?cid=) или всей школы (без cid; раньше был отказ «Выбери куратора», QA №7) */
  if (path === '/cur/me') { const cq = u.searchParams.get('cid'), cid = adm ? (okCid(cq) ? cq : 'all') : s.cid; if (!cid) return json(req, { ok: false, err: 'Нет куратора в сессии' }, 400);
    const all = cid === 'all', from = now - 30 * 864e5;
    const [nw, nh, ne] = await env.DB.batch([all ? env.DB.prepare('SELECT cid, uid FROM cwait') : env.DB.prepare('SELECT cid, uid FROM cwait WHERE cid=?').bind(cid), all ? env.DB.prepare('SELECT COUNT(*) n FROM cur_hw WHERE at>=?').bind(from) : env.DB.prepare('SELECT COUNT(*) n FROM cur_hw WHERE cid=? AND at>=?').bind(cid, from),
      env.DB.prepare('SELECT t.uid, COALESCE(SUM(COALESCE(t.rub, t.amount)),0) total, COALESCE(SUM(CASE WHEN t.conf=1 THEN COALESCE(t.rub, t.amount) ELSE 0 END),0) conf FROM bank_tx t JOIN student s ON s.uid=t.uid WHERE t.del_at IS NULL' + (all ? '' : ' AND s.curator=?') + ' GROUP BY t.uid').bind(...(all ? [] : [cid]))]);
    const er = (ne.results || []).filter(x => !isStaffUid(env, x.uid)), earned = Math.round(er.reduce((t, x) => t + (x.total || 0), 0)), earned_conf = Math.round(er.reduce((t, x) => t + (x.conf || 0), 0));
    let card, students;
    if (all) { const [rs, rt] = await env.DB.batch([env.DB.prepare('SELECT wsec FROM cresp WHERE answered>=?').bind(from / 1000 | 0), env.DB.prepare('SELECT AVG(stars) a, COUNT(*) n FROM chat_rate')]), med = medOf((rs.results || []).map(r => r.wsec).filter(x => x > 0)), sr = (rt.results || [])[0] || {};
      card = { name: 'Все кураторы', avg_reply_min: med == null ? null : Math.max(1, Math.round(med / 60)), stars: sr.n ? Math.round(sr.a * 10) / 10 : null, stars_n: sr.n | 0, hours: null, online: null };
      students = ((await appStudents(env, 'all')).students || []).length }
    else { card = await curCard(env, cid); students = ((await qAll(env.DB.prepare('SELECT uid FROM student WHERE curator=?').bind(cid))).filter(x => !isStaffUid(env, x.uid))).length }
    const hwc = ((nh.results || [])[0] || {}).n || 0, Q = await hwQueues(env);
    return json(req, Object.assign({ ok: true, cid, name: card.name, who: staffWho(s), role: s.role, students, wait: (nw.results || []).filter(w => !(w.uid && isStaffUid(env, w.uid))).length, hw: hwc, hw_checked: hwc, hw_days: 30, earned, earned_conf,
      avg_reply_min: card.avg_reply_min, stars: card.stars, stars_n: card.stars_n, hours: card.hours, online: card.online }, hwqOut(Q[cid])), 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/cur/hwlog' && req.method === 'POST') { const st = await staffCan(env, s, +o.uid); if (!st) return json(req, { ok: false, err: 'Это не твой ученик' }, 403);
    const status = o.status === 'rework' ? 'rework' : o.status === 'accept' ? 'accept' : null; if (!status) return json(req, { ok: false, err: 'status: accept или rework' }, 400);
    const cid = adm ? (st.curator || null) : s.cid, pts = Math.max(0, Math.min(1000, Math.round(+o.pts || 0))), lesson = bStr(hwName(o.lesson), 200), comment = bStr(o.comment, 2000), lid = okUid(o.lesson_id) ? +o.lesson_id : null, aid = okUid(o.answer_id) ? +o.answer_id : null;
    const sent = typeof o.sent_at === 'number' ? o.sent_at : o.sent_at ? Date.parse(o.sent_at) : NaN;
    const dup = aid && await env.DB.prepare('SELECT id FROM cur_hw WHERE answer_id=? AND status=? AND at>?').bind(aid, status, now - 10 * 60e3).first();
    const r = await env.DB.prepare('INSERT INTO cur_hw (cid, uid, answer_id, lesson_id, lesson, status, pts, comment, sent_at, at) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(cid, st.uid, aid, lid, lesson, status, pts, comment, isNaN(sent) ? null : sent, now).first();
    await logIt(env, 'cur-hw', st.uid, (cid || 'admin') + ' ' + status + ' ' + pts);
    let notified = false; if (!dup && st.tg_chat && await notifOn(env, st.uid, 'hw')) { const who = staffWho(s), L = lesson ? ' «' + th(lesson) + '»' : '', btn = lid ? [[{ text: status === 'accept' ? 'Посмотреть работу' : 'Открыть замечания', url: maLink(env, 'l' + lid) }]] : null;
      if (status === 'accept') { let place = null; try { const D = await loadData(env), rr = await rowFor(D, st.uid); place = rr && rr.place || null } catch (e) {}
        await tgSend(env, st.tg_chat, '✅ <b>ДЗ' + L + ' принято</b>\n' + nbt((pts ? '+' + pts + ' ' + pl(pts, ['балл', 'балла', 'баллов']) : 'Проверил' + fem(who) + ' ' + th(who)) + (place ? ' · ты на ' + place + ' месте' : '')) + (comment ? '\n\n«' + th(comment) + '» — ' + th(who) : ''), btn) }
      else { const notes = (Array.isArray(o.notes) && o.notes.length ? o.notes : comment.split(/\n+/)).map(x => bStr(x, 300)).filter(Boolean).slice(0, 10), due = /^\d{4}-\d{2}-\d{2}$/.test(o.due || '') ? o.due : null;
        await tgSend(env, st.tg_chat, '✏️ <b>ДЗ' + L + NB + '— нужно доработать</b>\n' + (notes.length ? notes.map((x, i) => (i + 1) + '. ' + th(x)).join('\n') : nbt('Посмотри замечания ' + th(who) + ' на странице урока.')) + (due ? '\n\n' + nbt('Пересдай до ' + human(due) + ', чтобы не потерять ×2') : ''), btn) }
      notified = true }
    return json(req, { ok: true, id: r.id, notified, dup: !!dup }) }
  if (path === '/cur/hwstat') { const days = Math.max(1, Math.min(90, +u.searchParams.get('days') || 30)), cq = adm ? (okCid(u.searchParams.get('cid')) ? u.searchParams.get('cid') : 'all') : s.cid;
    const rs = await qAll(cq === 'all' ? env.DB.prepare('SELECT cid, status, sent_at, at FROM cur_hw WHERE at>=?').bind(now - days * 864e5) : env.DB.prepare('SELECT cid, status, sent_at, at FROM cur_hw WHERE cid=? AND at>=?').bind(cq, now - days * 864e5));
    const agg = L => { const t = L.filter(x => x.sent_at && x.at > x.sent_at).map(x => (x.at - x.sent_at) / 60e3), m = medOf(t); return { checked: L.length, accept: L.filter(x => x.status === 'accept').length, rework: L.filter(x => x.status === 'rework').length, median_min: m == null ? null : Math.round(m), timed: t.length } };
    const by = {}; for (const x of rs) (by[x.cid || 'admin'] = by[x.cid || 'admin'] || []).push(x);
    return json(req, Object.assign({ ok: true, cid: cq, days }, agg(rs), { by_cid: cq === 'all' ? Object.keys(by).map(k => Object.assign({ cid: k }, agg(by[k]))) : undefined }), 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/cur/assign' && req.method === 'POST') { if (!adm) return json(req, { ok: false, err: 'Назначает куратора только Роман' }, 403);
    const cid = o.cid ? String(o.cid) : null; if (cid && !okCid(cid)) return json(req, { ok: false, err: 'Нет такого куратора' }, 400);
    const uids = [...new Set((Array.isArray(o.uids) ? o.uids : []).map(Number).filter(x => okUid(x) && !isStaffUid(env, x)))].slice(0, 200); if (!uids.length) return json(req, { ok: false, err: 'Выбери учеников' }, 400);
    const prev = {}; for (let i = 0; i < uids.length; i += 90) for (const x of await qAll(env.DB.prepare('SELECT uid, curator, tg_chat FROM student WHERE uid IN (' + uids.slice(i, i + 90).map(() => '?').join() + ')').bind(...uids.slice(i, i + 90)))) prev[x.uid] = x;
    const iso = new Date().toISOString(), c = cid && CURATORS.find(x => x.id === cid), q = [];
    for (const id of uids) { q.push(env.DB.prepare('INSERT INTO student (uid, tg_token, curator, cur_at) VALUES (?,?,?,?) ON CONFLICT(uid) DO UPDATE SET curator=excluded.curator, cur_at=excluded.cur_at').bind(id, rnd(), cid, iso));
      if (c && (prev[id] || {}).curator !== cid) q.push(env.DB.prepare("INSERT INTO chat_msg (uid, cid, dir, text, via, at) VALUES (?,?,'sys',?,'app',?)").bind(id, cid, 'Твой куратор — ' + c.full, now)) }
    for (let i = 0; i < q.length; i += 80) await env.DB.batch(q.slice(i, i + 80)); for (const k in APPC) delete APPC[k];
    let sent = 0, left = 0; if (c) { const card = await curCard(env, cid), cap = '👋 ' + nbt('<b>Твой куратор — ' + th(c.full) + '</b>\n' + th(c.about || '') + '\nНа связи ' + daysTxt(card.hours.days) + ' с ' + card.hours.from + ':00 до ' + card.hours.to + ':00 МСК. Пиши в чат на платформе — ответ придёт сюда же.'), kb = [[{ text: 'Написать ' + datv(c.name), url: maLink(env, 'chat') }]], ph = await kvGet(env, 'curphoto:' + cid);
      for (const id of uids) { const p = prev[id]; if (!p || !p.tg_chat || p.curator === cid) continue; if (sent >= 30) { left++; continue }
        const j = ph ? await tg(env, 'sendPhoto', { chat_id: p.tg_chat, photo: ph, caption: cap, parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } }) : await tgSend(env, p.tg_chat, cap, kb); if (j && j.ok) sent++ } }
    await logIt(env, 'cur-assign', 0, (cid || 'none') + ' ' + uids.length + ' tg ' + sent); return json(req, { ok: true, cid, assigned: uids.length, sent, left }) }
  if (path === '/cur/mass' && req.method === 'POST') { const text0 = String(o.text || '').trim().slice(0, 3000); if (!text0) return json(req, { ok: false, err: 'Пустое сообщение' }, 400);
    const uids = [...new Set((Array.isArray(o.uids) ? o.uids : []).map(Number).filter(okUid))]; if (!uids.length) return json(req, { ok: false, err: 'Выбери учеников' }, 400); if (uids.length > 35) return json(req, { ok: false, err: 'batch' }, 400); /* ~50 запросов за вызов: страница шлёт пачками по 35 */
    const sts = await qAll(env.DB.prepare('SELECT uid, curator, tg_chat, name FROM student WHERE uid IN (' + uids.map(() => '?').join() + ')').bind(...uids)), via = o.via === 'tg' ? 'tg' : 'chat', who = staffWho(s);
    let D = null, N = null; if (/\{(имя|урок)\}/.test(text0)) { try { D = await loadData(env) } catch (e) {} N = await nameMap(env) }
    const res = { ok: true, chat: 0, tg: 0, fail: 0, skip: 0 }, ins = [], tgq = [], now2 = msNow();
    for (const st of sts) { if (isStaffUid(env, st.uid) || (!adm && st.curator !== s.cid)) { res.skip++; continue }
      let text = text0; if (N) { const r = D && (D.rows || []).find(x => +x.uid === st.uid); text = text.replace(/\{имя\}/g, String(N[st.uid] || st.name || '').split(' ')[0] || 'привет');
        if (/\{урок\}/.test(text)) { let t = 'следующий урок'; try { const L = learnOf(D, r || {}, now, []); if (L.cur) for (const m of L.course.modules) for (const p of m.parts) for (const l of p.lessons) if (l.id === L.cur.lesson) t = '«' + l.t + '»' } catch (e) {} text = text.replace(/\{урок\}/g, t) } }
      /* chat — в чат на платформе + уведомление в бот; tg — только бот (у кого нет Telegram — в чат) */
      if (via === 'chat' || !st.tg_chat) { ins.push(env.DB.prepare("INSERT INTO chat_msg (uid, cid, dir, text, via, who, at) VALUES (?,?,'out',?,'app',?,?)").bind(st.uid, st.curator || s.cid || null, text, who, now2)); res.chat++ }
      if (st.tg_chat) tgq.push([st.tg_chat, st.uid, via === 'chat' ? '💬 <b>' + th(who) + ' написал' + fem(who) + '</b>\n' + th(text) : '<b>' + th(who) + '</b>\n' + th(text), via === 'chat'])
    }
    for (let i = 0; i < ins.length; i += 50) await env.DB.batch(ins.slice(i, i + 50));
    for (const [chat, id, t, ch] of tgq) { const j = await tgSend(env, chat, t, ch ? [[{ text: 'Открыть чат', url: maLink(env, 'chat') }], [{ text: 'Ответить здесь', callback_data: 'chs:' + id }]] : null); if (j && j.ok) res.tg++; else res.fail++ }
    res.skip += uids.length - sts.length; await logIt(env, 'cur-mass', 0, staffBy(s) + ' ' + via + ' chat ' + res.chat + ' tg ' + res.tg); return json(req, res) }
  if (path === '/cur/admin') { if (!adm) return json(req, { ok: false, err: 'Раздел только для Романа' }, 403);
    const st = await curStats(env, 30), from = now - 30 * 864e5;
    const [sc, hw, rt, er] = await env.DB.batch([env.DB.prepare('SELECT uid, curator FROM student'), env.DB.prepare('SELECT cid, COUNT(*) n FROM cur_hw WHERE at>=? GROUP BY cid').bind(from), env.DB.prepare('SELECT cid, AVG(stars) a, COUNT(*) n FROM chat_rate GROUP BY cid'),
      env.DB.prepare('SELECT t.uid, s.curator cid, COALESCE(SUM(COALESCE(t.rub, t.amount)),0) total, COALESCE(SUM(CASE WHEN t.conf=1 THEN COALESCE(t.rub, t.amount) ELSE 0 END),0) conf FROM bank_tx t JOIN student s ON s.uid=t.uid WHERE t.del_at IS NULL GROUP BY t.uid')]);
    const n = {}, cur = {}; for (const x of sc.results || []) { cur[x.uid] = x.curator; if (x.curator && !isStaffUid(env, x.uid)) n[x.curator] = (n[x.curator] || 0) + 1 }
    const H = {}, R = {}, E = {}; for (const x of hw.results || []) H[x.cid] = x.n; for (const x of rt.results || []) R[x.cid] = x; for (const x of er.results || []) { if (isStaffUid(env, x.uid)) continue; /* QA №7: банк команды (тесты Романа) — не заработок учеников, как в «Банке учеников» */ const e = E[x.cid || ''] = E[x.cid || ''] || { total: 0, conf: 0 }; e.total += x.total || 0; e.conf += x.conf || 0 }
    const Q = await hwQueues(env);
    const curators = CURATORS.map(c => { const k = st.curators.find(x => x.id === c.id) || {}; return { cid: c.id, name: c.full, students: n[c.id] || 0, wait: (k.waiting || []).length, median_min: k.median == null ? null : Math.max(1, Math.round(k.median / 60)), in2h: k.in2h == null ? null : k.in2h, answered: k.answered || 0, tg: k.tg || null, connected: !!k.connected, hours: k.hours || null,
      stars: R[c.id] ? Math.round(R[c.id].a * 10) / 10 : null, stars_n: R[c.id] ? R[c.id].n : 0, hw_checked: H[c.id] || 0, earned: Math.round((E[c.id] || {}).total || 0), earned_conf: Math.round((E[c.id] || {}).conf || 0), hw_wait: Q[c.id] ? Q[c.id].n : null, hw_old: Q[c.id] ? Q[c.id].old48 || 0 : null, hw_q_at: Q[c.id] ? Q[c.id].at : null } });
    let none = []; try { const D = await loadData(env); const GS = await gcStaffSet(env); none = (D.rows || []).filter(r => r.uid != null && !cur[+r.uid] && !isStaffUid(env, r.uid) && !GS.has(+r.uid)).map(r => ({ uid: +r.uid, name: r.name, tar: r.tar || null, place: r.place || null })) } catch (e) {}
    const qa = Q.all; return json(req, { ok: true, days: 30, curators, no_curator: none, no_curator_n: none.length, hw_wait: qa ? qa.n : null, hw_old: qa ? qa.old48 || 0 : null, hw_oldest: qa ? qa.oldest || null : null, hw_q_at: qa ? qa.at : null, hw_part: !!(qa && qa.part) }, 200, { 'Cache-Control': 'no-store' }) }
  /* 31.10 (Роман, задача 106): вкладка «Отзывы» пульта. Админ — всё: звёзды уроков и анкеты модулей (отчёт «Голос учеников»), Нейро 👍/👎, кураторы, лента.
     Куратор — только соревнование кураторов: звёзды ответам, время ответа (своё и других). Оценок уроков и анкет куратор не получает (сервер их не отдаёт). */
  if (path === '/rev/data') { const days = [7, 30].includes(+u.searchParams.get('days')) ? +u.searchParams.get('days') : 0, from = days ? now - days * 864e5 : 0;
    const cs = await curStats(env, days || 3650), [rt, rd] = await env.DB.batch([env.DB.prepare('SELECT cid, stars, COUNT(*) n FROM chat_rate WHERE at>=? GROUP BY cid, stars').bind(from),
      env.DB.prepare('SELECT cid, COUNT(DISTINCT uid) n FROM chat_rate WHERE at>=? GROUP BY cid').bind(from)]), dist = {}, who = {};
    for (const x of rt.results || []) { const d = dist[x.cid] = dist[x.cid] || [0, 0, 0, 0, 0]; if (x.stars >= 1 && x.stars <= 5) d[x.stars - 1] += x.n } for (const x of rd.results || []) who[x.cid] = x.n;
    const curators = CURATORS.map(c => { const k = cs.curators.find(x => x.id === c.id) || {}, d = dist[c.id] || [0, 0, 0, 0, 0], n = d.reduce((a, b) => a + b, 0);
      return { cid: c.id, name: c.full, short: c.name, photo: 'https://romanoduvanov.github.io/otzyvy/gc/curators/' + c.id + '.jpg', me: !adm && s.cid === c.id, stars: n ? Math.round(d.reduce((a, b, i) => a + b * (i + 1), 0) / n * 100) / 100 : null, stars_n: n, students_n: who[c.id] || 0, dist: d,
        median_min: k.median == null ? null : Math.max(1, Math.round(k.median / 60)), in2h: k.in2h == null ? null : k.in2h, answered: k.answered || 0, efir: null } });
    const out = { ok: true, role: adm ? 'admin' : 'curator', days, curators }; if (!adm) return json(req, out, 200, { 'Cache-Control': 'no-store' });
    const D = await revSchool(env); if (D) { const W = D.week || {}, A = D.all || {}, M = {}; for (const m of D.mods || []) M[m.id] = m;
      const mods = (D.mods || []).map(m => { const g = (D.agg || {})[m.id] || {}, sum = (f, w) => Object.values(g).reduce((t, x) => t + (x[f] != null ? x[f] * x[w] : 0), 0), cnt = w => Object.values(g).reduce((t, x) => t + (x[w] || 0), 0), nr = cnt('n_r'), ns = cnt('n_s');
        const ws = w => Object.values(g).reduce((t, x) => t + (x.stars != null && w === 'n_r' ? x.n_r : 0), 0), wi = Object.values(g).reduce((t, x) => t + (x.interest != null ? x.n_s : 0), 0);
        return { id: m.id, name: m.name, group: m.group, stars: ws('n_r') ? Math.round(sum('stars', 'n_r') / ws('n_r') * 100) / 100 : null, n_r: nr, interest: wi ? Math.round(sum('interest', 'n_s') / wi * 100) / 100 : null, n_s: ns } }).filter(m => m.n_r || m.n_s);
      const dfrom = days ? new Date(from + 3 * 3600e3).toISOString().slice(0, 10) : '';
      const feed = [], FK = {}; for (const c of (D.comments || []).filter(c => !dfrom || c.d >= dfrom).slice(0, 800)) { const src = c.src === 'Оценка урока' ? 'lesson' : 'anketa', k = src === 'anketa' ? [c.who, c.d, c.m, c.s].join('|') : null; /* анкета: ответы на «почему» и «вопросы» — одна запись */
        if (k && FK[k]) { if (c.t && FK[k].t.indexOf(c.t) < 0) FK[k].t = (FK[k].t ? FK[k].t + ' · ' : '') + c.t; continue }
        const x = { d: c.d, who: c.who, src, q: c.q, mod: (M[c.m] || {}).name || c.m, score: c.score, scale: c.scale, t: c.t || '', low: revLow(c) }; if (k) FK[k] = x; feed.push(x) }
      const seen = new Set(), low = feed.filter(c => c.low && !seen.has(c.who + c.d + c.src + c.mod) && seen.add(c.who + c.d + c.src + c.mod));
      out.school = { updated: D.updated, week: W.ratings != null ? { stars: W.stars, n_r: W.ratings, n_s: W.surveys, interest: W.interest } : null, all: { stars: A.stars, n_r: A.n_r, n_s: A.n_s, interest: A.interest, useful: A.useful, apply: A.apply, dist: A.dist || null }, mods, feed: feed.slice(0, 300), low: low.slice(0, 100), low_n: low.length } }
    try { const f = await env.DB.prepare('SELECT SUM(CASE WHEN vote>0 THEN 1 ELSE 0 END) up, SUM(CASE WHEN vote<0 THEN 1 ELSE 0 END) down FROM ai_fb WHERE at>=?').bind(from).first(); const up = (f && f.up) || 0, dn = (f && f.down) || 0; out.neuro = { up, down: dn, share: up + dn ? Math.round(up / (up + dn) * 100) : null } } catch (e) { out.neuro = null }
    const fl = await qAll(env.DB.prepare('SELECT r.mid, r.uid, r.cid, r.stars, r.at, f.reasons, f.text, s.name FROM chat_rate r LEFT JOIN chat_fb f ON f.mid=r.mid LEFT JOIN student s ON s.uid=r.uid WHERE r.at>=? AND r.stars<=3 ORDER BY r.at DESC LIMIT 40').bind(from));
    out.chat_low = fl.filter(x => !isStaffUid(env, x.uid)).map(x => ({ mid: x.mid, uid: x.uid, name: x.name, cid: x.cid, stars: x.stars, at: x.at, reasons: x.reasons, text: x.text }));
    return json(req, out, 200, { 'Cache-Control': 'no-store' }) }
  return json(req, { ok: false, err: 'not found' }, 404) }

/* ---------- Отзывы (31.10, задача 106): данные отчёта «Голос учеников» (otzyvy/index.html, сборщик) — кэш 6 ч в kv revsrc; бот админам ----------
   Сразу: анкета модуля ниже 5 из 10 или оценка урока ★1–2 (как только сборщик их принёс; уже отправленные — kv revsent).
   Понедельник 10:00 МСК: сводка за неделю (kv revweek — день последней отправки, revprev — прошлые цифры для «было»). */
const revLow = c => c.score != null && (c.scale === 10 ? c.score < 5 : c.score <= 2);
let REV_MEM = null;
async function revSchool(env) { const now = Date.now(); if (REV_MEM && now - REV_MEM.t < 1800e3) return REV_MEM.v; let c = await kvGet(env, 'revsrc');
  if (!c || !c.v || now - (c.t || 0) > 6 * 3600e3) { let v = null;
    try { const r = await fetch(env.SCHOOL_SRC || SCHOOL_SRC); if (r.ok) { const m = (await r.text()).match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/); if (m) { const D = JSON.parse(m[1]); if (D && D.all) { delete D.img; delete D.trend; D.comments = (D.comments || []).slice(0, 1500); v = D } } } } catch (e) {}
    c = v ? { t: now, v } : { t: now - 5 * 3600e3, v: (c && c.v) || null }; if (v || c.v) await kvPut(env, 'revsrc', c) }
  REV_MEM = { t: now, v: c.v }; return c.v }
const PULT_URL = 'https://oduvanovroman.getcourse.ru/teach/control/stream?fs=pult';
async function revJob(env, B) { const D = await revSchool(env); if (!D) return { skip: 'nodata' }; const out = { sent: 0 }, M = {}; for (const m of D.mods || []) M[m.id] = m.name;
  const key = c => [c.who, c.d, c.src, c.m].join('|'), lowNow = [], seen = new Set(); for (const c of D.comments || []) { if (!revLow(c)) continue; const k = key(c); if (seen.has(k)) continue; seen.add(k); lowNow.push([k, c]) }
  let sent = await kvGet(env, 'revsent'); const A = await admins(env);
  if (!Array.isArray(sent)) { await kvPut(env, 'revsent', lowNow.map(x => x[0])); out.seeded = lowNow.length } /* первый запуск: старые низкие оценки не шлём */
  else { const S = new Set(sent), fresh = lowNow.filter(x => !S.has(x[0])).slice(0, 8);
    for (const [k, c] of fresh) { const t = (c.src === 'Анкета' ? '📝 <b>Анкета модуля ' + c.score + ' из 10</b>' : '⭐ <b>Низкая оценка ★' + c.score + '</b>') + '\n' + th(c.who) + ' — ' + (c.src === 'Анкета' ? 'модуль «' + th(M[c.m] || c.m) + '»' : 'урок «' + th(c.q) + '»') + (c.t ? '\n«' + th(String(c.t).slice(0, 300)) + '»' : '');
      for (const a of A) { if (!B.ok(1)) break; B.use(1); await tgSend(env, a, t, [[{ text: 'Все отзывы', url: PULT_URL }]]) } sent.push(k); out.sent++ }
    if (fresh.length) await kvPut(env, 'revsent', sent.slice(-3000)) }
  const m = msk(), day = m.toISOString().slice(0, 10); /* понедельник, с 10:00 МСК — один раз */
  if (m.getUTCDay() === 1 && m.getUTCHours() >= 10 && (await kvGet(env, 'revweek')) !== day) { const W = D.week || {}, P = await kvGet(env, 'revprev') || {}, from = Date.now() - 7 * 864e5, dfrom = new Date(from + 3 * 3600e3).toISOString().slice(0, 10);
    const r = await env.DB.prepare('SELECT AVG(stars) a, COUNT(*) n FROM chat_rate WHERE at>=?').bind(from).first(), wk = lowNow.filter(x => x[1].d >= dfrom).length;
    const lr = (D.comments || []).filter(c => c.src === 'Оценка урока' && c.d >= dfrom && c.score != null), by = {}; for (const c of lr) (by[c.q] = by[c.q] || []).push(c.score);
    const L = Object.entries(by).map(([q, a]) => [q, a.reduce((t, x) => t + x, 0) / a.length]).sort((x, y) => x[1] - y[1]), f1 = x => String(Math.round(x * 10) / 10).replace('.', ',');
    const t = '<b>Отзывы за неделю</b>\n★ уроков ' + (W.stars != null ? f1(W.stars) + (P.stars != null ? ' (было ' + f1(P.stars) + ')' : '') + ' · ' + (W.ratings || 0) + ' оценок' : '—')
      + '\nАнкеты ' + (W.interest != null ? f1(W.interest) + ' · ' + (W.surveys || 0) + ' анкет' : '—') + '\nКураторы ' + (r && r.n ? f1(r.a) + '★ · ' + r.n + ' оценок ответов' : '— оценок нет')
      + (L.length ? '\nХуже всего: «' + th(L[0][0]) + '» ' + f1(L[0][1]) + (L.length > 1 ? '\nЛучше всего: «' + th(L[L.length - 1][0]) + '» ' + f1(L[L.length - 1][1]) : '') : '')
      + '\nНизких оценок: ' + wk + (P.low != null ? ' (' + (wk - P.low >= 0 ? '+' : '') + (wk - P.low) + ')' : '') + '\n<i>Данные отчёта на ' + th(D.updated || '—') + '</i>';
    for (const a of A) { if (!B.ok(1)) break; B.use(1); await tgSend(env, a, t, [[{ text: 'Открыть «Отзывы»', url: PULT_URL }]]) }
    await kvPut(env, 'revweek', day); await kvPut(env, 'revprev', { stars: W.stars, low: wk }); out.week = true }
  return out }

/* ---------- Служба заботы: контроль качества ответов (Telegram Business) ----------
   Аккаунт службы заботы (CARE_USERNAME, по умолчанию zabota_oduvanov) подключает бота школы: Настройки → Telegram для бизнеса → Чат-боты.
   Бот только читает (права на ответ снять). Видит только новые сообщения.
   Храним тексты диалогов 90 дней. Раздел в пульте — только админу (tg_admin). Раз в полчаса: долгое молчание → Роману в Telegram,
   оценка ответов ИИ (вежливость, решён ли вопрос, ошибки и лишние обещания) — плохой ответ → Роману. */
const CARE_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS care_msg (id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT NOT NULL, mid INTEGER, dir TEXT, text TEXT, at INTEGER, del INTEGER DEFAULT 0)',
  'CREATE INDEX IF NOT EXISTS care_msg_chat ON care_msg (chat, at)',
  'CREATE UNIQUE INDEX IF NOT EXISTS care_msg_mid ON care_msg (chat, mid)',
  'CREATE TABLE IF NOT EXISTS care_dlg (chat TEXT PRIMARY KEY, name TEXT, username TEXT, uid INTEGER, first_at INTEGER, last_in INTEGER, last_out INTEGER, wait_since INTEGER, n_in INTEGER DEFAULT 0, n_out INTEGER DEFAULT 0, resp_sec INTEGER, resp_n INTEGER DEFAULT 0, grade TEXT, graded_at INTEGER, notified INTEGER DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS care_resp (id INTEGER PRIMARY KEY AUTOINCREMENT, chat TEXT, asked INTEGER, answered INTEGER, sec INTEGER, wsec INTEGER, day TEXT)'];
let CARE_OK = false;
async function careEnsure(env) { if (CARE_OK) return; await env.DB.batch(CARE_SCHEMA.map(s => env.DB.prepare(s))); CARE_OK = true }
const CARE_USER = env => String(env.CARE_USERNAME || 'zabota_oduvanov').replace(/^@/, '').toLowerCase();
async function careConf(env) { return Object.assign({ wait: 30, hours: [10, 20], conn: null, enabled: false }, (await kvGet(env, 'care:conf')) || {}) }
function isCareConn(bc, env) { return bc && bc.user && String(bc.user.username || '').toLowerCase() === CARE_USER(env) }
async function careConnection(env, bc) { await careEnsure(env); const c = await careConf(env), on = bc.is_enabled !== false;
  Object.assign(c, { conn: bc.id, enabled: on, owner: String(bc.user.id), username: bc.user.username || null, name: [bc.user.first_name, bc.user.last_name].filter(Boolean).join(' '), at: new Date().toISOString(), canReply: !!(bc.rights ? bc.rights.can_reply : bc.can_reply) });
  await kvPut(env, 'care:conf', c); await logIt(env, on ? 'care-on' : 'care-off', 0, '@' + c.username);
  for (const a of await admins(env)) await tgSend(env, a, on ? '✅ <b>Служба заботы подключена.</b> Бот читает новые диалоги @' + th(c.username) + ' и проверяет ответы. Раздел — в пульте, вкладка «Служба заботы».' + (c.canReply ? '\n⚠️ У бота есть право отвечать — сними его в настройках «Чат-боты», боту нужно только читать.' : '') : '⛔️ Служба заботы отключила бота — проверка ответов остановлена.') }
async function careMessage(env, m, edited) { await careEnsure(env); const c = await careConf(env); if (!c.enabled || m.business_connection_id !== c.conn || !m.chat || m.chat.type !== 'private') return;
  const chat = String(m.chat.id); if (chat === c.owner) return;
  const out = m.from && String(m.from.id) === c.owner, t = m.date | 0, text = String(m.text || m.caption || (m.photo ? '[фото]' : m.document ? '[файл ' + (m.document.file_name || '') + ']' : m.voice ? '[голосовое]' : m.video ? '[видео]' : m.sticker ? '[стикер]' : '[сообщение]')).slice(0, 4000);
  if (edited) { await env.DB.prepare('UPDATE care_msg SET text=? WHERE chat=? AND mid=?').bind(text + ' (изм.)', chat, m.message_id).run(); return }
  const nm = [m.chat.first_name, m.chat.last_name].filter(Boolean).join(' ') || null, st = await env.DB.prepare('SELECT uid FROM student WHERE tg_chat=?').bind(chat).first();
  const d = await env.DB.prepare('SELECT * FROM care_dlg WHERE chat=?').bind(chat).first();
  const q = [env.DB.prepare('INSERT OR IGNORE INTO care_msg (chat, mid, dir, text, at) VALUES (?,?,?,?,?)').bind(chat, m.message_id, out ? 'out' : 'in', text, t)];
  if (!d) q.push(env.DB.prepare('INSERT INTO care_dlg (chat, name, username, uid, first_at, last_in, last_out, wait_since, n_in, n_out) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(chat, nm, m.chat.username || null, st ? st.uid : null, t, out ? null : t, out ? t : null, out ? null : t, out ? 0 : 1, out ? 1 : 0));
  else if (!out) { const ack = !d.wait_since && isAck(m); q.push(env.DB.prepare('UPDATE care_dlg SET name=COALESCE(?,name), username=COALESCE(?,username), last_in=?, wait_since=COALESCE(wait_since, ?), n_in=n_in+1, notified=CASE WHEN wait_since IS NULL THEN 0 ELSE notified END WHERE chat=?').bind(nm, m.chat.username || null, t, ack ? null : t, chat)) }
  else { q.push(env.DB.prepare('UPDATE care_dlg SET last_out=?, wait_since=NULL, n_out=n_out+1 WHERE chat=?').bind(t, chat));
    if (d.wait_since) { const ws = workSec(d.wait_since, t, c.hours); q.push(env.DB.prepare('INSERT INTO care_resp (chat, asked, answered, sec, wsec, day) VALUES (?,?,?,?,?,?)').bind(chat, d.wait_since, t, t - d.wait_since, ws, dayStr(new Date(t * 1000))));
      q.push(env.DB.prepare('UPDATE care_dlg SET resp_sec=COALESCE(resp_sec,0)+?, resp_n=resp_n+1 WHERE chat=?').bind(ws, chat)) } }
  await env.DB.batch(q) }
async function careDeleted(env, dm) { await careEnsure(env); const c = await careConf(env); if (dm.business_connection_id !== c.conn || !dm.chat) return;
  const st = env.DB.prepare('UPDATE care_msg SET del=1 WHERE chat=? AND mid=?'); await env.DB.batch((dm.message_ids || []).slice(0, 50).map(id => st.bind(String(dm.chat.id), id))) }
/* 27.10 (правка чата «Редизайн», восстановлена): оцениваем только законченный диалог — клиент закрыл («спасибо», «ок», эмодзи, стикер) или тишина ≥ 24 ч.
   Пока клиент ждёт ответа — не оцениваем. Рабочие часы и молчание клиента — в правилах для оценщика (CARE_RULES). */
const CARE_IDLE = 24 * 3600;
const careDone = t => { t = String(t || '').trim().toLowerCase(); return !t || t === '[стикер]' || /^(спасибо|спасибки|спс|благодарю|большое спасибо|спасибо большое|ок|окей|ok|okay|понял|поняла|понятно|ясно|хорошо|отлично|супер|класс|договорились|принято|good|thanks|thank you)[\s!.,)👍🙏❤️🔥😊]*$/i.test(t) || /^[\p{Extended_Pictographic}\s\u200d\ufe0f]+$/u.test(t) };
const CARE_RULES = 'Правила школы: служба заботы работает с 10:00 до 20:00 МСК — сообщения, пришедшие ночью или вне этих часов, отвечаются утром, это не нарушение и не медленный ответ. Если клиент замолчал после ответа — это не вина сотрудника, вопрос считается закрытым, если клиент не возразил. Оценивай только то, что зависит от сотрудника.';
/* оценка ответа службы заботы ИИ: JSON со шкалами и пометкой «проверить» */
async function careGrade(env, chat) { const ms = ((await env.DB.prepare('SELECT dir, text, at FROM care_msg WHERE chat=? AND del=0 ORDER BY at DESC, id DESC LIMIT 40').bind(chat).all()).results || []).reverse();
  if (!ms.some(x => x.dir === 'out') || !env.ANTHROPIC_API_KEY) return null;
  const tr = ms.map(x => (x.dir === 'in' ? 'Клиент: ' : 'Служба заботы: ') + x.text).join('\n').slice(-9000);
  const sys = CARE_RULES + '\n' + 'Ты проверяешь ответы службы заботы онлайн-школы OduvanovSchool (курс по дизайну карточек маркетплейсов и ИИ). Оцени ответы сотрудника в диалоге. Верни ТОЛЬКО JSON без пояснений: {"polite":1-5,"solved":"yes"|"partly"|"no","errors":"кратко, ошибки или неверные факты, иначе пусто","promises":"кратко, лишние или опасные обещания (возвраты, сроки, скидки без оснований), иначе пусто","tone":"кратко о тоне","score":1-10,"check":true|false,"summary":"суть вопроса и ответа одной фразой"}. check=true, если есть ошибки, грубость, лишние обещания, вопрос не решён или ответ не по делу.';
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: AI_MODEL(env), max_tokens: 400, system: sys, messages: [{ role: 'user', content: tr }] }) });
  const j = await r.json(); const t = ((j.content || []).find(x => x.type === 'text') || {}).text || ''; const m = t.match(/\{[\s\S]*\}/); if (!m) return null;
  try { const g = JSON.parse(m[0]); g.at = Date.now(); return g } catch (e) { return null } }
async function careTick(env, B) { await careEnsure(env); const c = await careConf(env), out = { notified: 0, graded: 0 }; if (!c.enabled) return { skip: 'off' };
  const now = Date.now() / 1000 | 0, hr = msk().getUTCHours(), work = hr >= c.hours[0] && hr < c.hours[1];
  /* долгое молчание в рабочее время */
  if (work) { const ws = (await env.DB.prepare('SELECT * FROM care_dlg WHERE wait_since IS NOT NULL AND notified=0').all()).results || [];
    for (const d of ws) { if (B && !B.ok(2)) break; const sec = workSec(d.wait_since, now, c.hours); if (sec < c.wait * 60) continue;
      for (const a of await admins(env)) await tgSend(env, a, '🟠 <b>Служба заботы молчит ' + hrs(sec) + '</b>\n' + th(d.name || 'Клиент') + (d.username ? ' (@' + th(d.username) + ')' : '') + ' ждёт ответа. Порог — ' + c.wait + ' мин в рабочее время.');
      await env.DB.prepare('UPDATE care_dlg SET notified=1 WHERE chat=?').bind(d.chat).run(); out.notified++; if (B) B.use(2) } }
  /* оценка: только законченные диалоги — клиент закрыл разговор (careDone) или тишина ≥ CARE_IDLE; пока клиент ждёт (wait_since) — не оцениваем */
  const tg = (await env.DB.prepare('SELECT * FROM care_dlg WHERE last_out IS NOT NULL AND wait_since IS NULL AND (graded_at IS NULL OR graded_at < last_out OR graded_at < COALESCE(last_in,0)) AND MAX(COALESCE(last_in,0), last_out) < ? ORDER BY last_out DESC LIMIT 12').bind(now - 600).all()).results || [];
  let gn = 0;
  for (const d of tg) { if (gn >= 4 || (B && !B.ok(3))) break; const lastAt = Math.max(d.last_in || 0, d.last_out || 0);
    if (now - lastAt < CARE_IDLE) { const lm = await env.DB.prepare('SELECT dir, text FROM care_msg WHERE chat=? AND del=0 ORDER BY at DESC, id DESC LIMIT 1').bind(d.chat).first(); if (!lm || lm.dir !== 'in' || !careDone(lm.text)) continue }
    gn++; const g = await careGrade(env, d.chat); if (B) B.use(1); if (!g) continue;
    await env.DB.prepare('UPDATE care_dlg SET grade=?, graded_at=? WHERE chat=?').bind(JSON.stringify(g), now, d.chat).run(); out.graded++;
    if (g.check) { for (const a of await admins(env)) await tgSend(env, a, '🔎 <b>Проверь ответ службы заботы</b> · оценка ' + (g.score || '?') + '/10\n' + th(d.name || 'Клиент') + ': ' + th(g.summary || '') + (g.errors ? '\nОшибки: ' + th(g.errors) : '') + (g.promises ? '\nОбещания: ' + th(g.promises) : '') + (g.solved && g.solved !== 'yes' ? '\nВопрос ' + (g.solved === 'no' ? 'не решён' : 'решён частично') : '')); if (B) B.use(1) } }
  /* хранение 90 дней */
  if (Math.random() < 0.1) { const lim = now - 90 * 86400; await env.DB.batch([env.DB.prepare('DELETE FROM care_msg WHERE at < ?').bind(lim), env.DB.prepare('DELETE FROM care_resp WHERE answered < ?').bind(lim), env.DB.prepare('DELETE FROM care_dlg WHERE COALESCE(last_in,0) < ? AND COALESCE(last_out,0) < ?').bind(lim, lim)]) }
  return out }
/* API пульта (только админ): /app/api/care/* */
async function careApi(env, s, path, req, u, ajson) { if (s.role !== 'admin') return ajson({ ok: false, err: 'Раздел только для Романа' }, 403); await careEnsure(env);
  const c = await careConf(env);
  if (path === '/app/api/care/status') { const now = Date.now() / 1000 | 0, d7 = dayStr(new Date(Date.now() - 6 * 864e5)), d1 = dayStr();
    const [rs, dl, wt] = await env.DB.batch([env.DB.prepare('SELECT day, wsec FROM care_resp WHERE day >= ?').bind(d7), env.DB.prepare('SELECT grade FROM care_dlg WHERE graded_at > ?').bind(now - 7 * 86400), env.DB.prepare('SELECT COUNT(*) n FROM care_dlg WHERE wait_since IS NOT NULL')]);
    const R = rs.results || [], G = (dl.results || []).map(x => { try { return JSON.parse(x.grade) } catch (e) { return null } }).filter(Boolean);
    const med = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1] }, avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
    const day = R.filter(x => x.day === d1).map(x => x.wsec), week = R.map(x => x.wsec);
    return ajson({ ok: true, conf: { enabled: !!c.enabled, username: c.username || null, at: c.at || null, wait: c.wait, hours: c.hours, canReply: !!c.canReply, care: CARE_USER(env), bot: BOT(env) },
      day: { n: day.length, avg: avg(day), med: med(day) }, week: { n: week.length, avg: avg(week), med: med(week), graded: G.length, solved: G.length ? Math.round(G.filter(g => g.solved === 'yes').length / G.length * 100) : null, score: G.length ? Math.round(G.reduce((a, g) => a + (+g.score || 0), 0) / G.length * 10) / 10 : null, check: G.filter(g => g.check).length }, waiting: (wt.results || [{}])[0].n || 0 }) }
  if (path === '/app/api/care/dialogs') { const r = ((await env.DB.prepare('SELECT chat, name, username, uid, first_at, last_in, last_out, wait_since, n_in, n_out, resp_sec, resp_n, grade FROM care_dlg ORDER BY MAX(COALESCE(last_in,0), COALESCE(last_out,0)) DESC LIMIT 300').all()).results || [])
      .map(d => Object.assign(d, { grade: d.grade ? (() => { try { return JSON.parse(d.grade) } catch (e) { return null } })() : null, avg: d.resp_n ? Math.round(d.resp_sec / d.resp_n) : null }));
    return ajson({ ok: true, dialogs: r }) }
  if (path === '/app/api/care/dialog') { const chat = String(u.searchParams.get('chat') || ''); const d = await env.DB.prepare('SELECT * FROM care_dlg WHERE chat=?').bind(chat).first(); if (!d) return ajson({ ok: false }, 404);
    const ms = (await env.DB.prepare('SELECT dir, text, at, del FROM care_msg WHERE chat=? ORDER BY at, id LIMIT 500').bind(chat).all()).results || [];
    try { d.grade = d.grade ? JSON.parse(d.grade) : null } catch (e) { d.grade = null } return ajson({ ok: true, dialog: d, messages: ms }) }
  if (path === '/app/api/care/settings' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
    const w = Math.max(5, Math.min(480, +o.wait || c.wait)), h0 = Math.max(0, Math.min(23, +o.from)), h1 = Math.max(1, Math.min(24, +o.to));
    c.wait = w; if (h1 > h0) c.hours = [h0, h1]; await kvPut(env, 'care:conf', c); return ajson({ ok: true, wait: c.wait, hours: c.hours }) }
  if (path === '/app/api/care/grade' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
    const g = await careGrade(env, String(o.chat || '')); if (!g) return ajson({ ok: false, err: 'Нечего оценивать' });
    await env.DB.prepare('UPDATE care_dlg SET grade=?, graded_at=? WHERE chat=?').bind(JSON.stringify(g), Date.now() / 1000 | 0, String(o.chat)).run(); return ajson({ ok: true, grade: g }) }
  return ajson({ ok: false, err: 'not found' }, 404) }

/* ---------- пульт → «Нейро» (только админ): нарушения, ограничения, ошибки нейросети, журнал «Смотреть как ученик», разбор напоминаний кураторам ---------- */
/* ---------- 27.10: аналитик поведения ----------
   Каждый день в 9:00 МСК (cron «45 * * * *», задача insights): сводка за вчера и 7 дней по реальным данным —
   активность на сайте (time) и в мини-приложении (ev), прогресс уроков и ДЗ (snap), Нейро (log ai/ai-err, ai_fb), кураторы (cresp/cwait), Забота, банк, технические сбои.
   3–5 находок пишет нейросеть строго по цифрам; сводка уходит админам в Telegram и хранится (kv ins:<день>), подробно — пульт → «Аналитика». */
const STAFF_IDS = env => String(env.ADMIN_UIDS || '499631257').split(/[\s,]+/).map(Number).filter(Boolean).concat(CURATORS.map(c => c.uid)).join(',') || '0';
const INS_FROM = d => new Date(d + 'T00:00:00+03:00').toISOString();
async function insightsData(env, day) {
  day = day || addDays(dayStr(), -1); const d1 = addDays(day, -1), d7 = addDays(day, -6), d14 = addDays(day, -13), from = INS_FROM(day), to = INS_FROM(addDays(day, 1)), from7 = INS_FROM(d7);
  const D = await loadData(env), rows = (D.rows || []).filter(r => r.uid != null && !isStaffUid(env, r.uid)), byU = {}, byH = {}; rows.forEach(r => { byU[+r.uid] = r; byH[r.h] = r });
  const q = (s, ...b) => env.DB.prepare(s).bind(...b);
  const [tDay, t7, tLast, evDay, logK, logAi, cr, cw, care, careW, btx, bord, sn, tgN] = await env.DB.batch([
    q('SELECT day, COUNT(*) u, SUM(site) site, SUM(video) video FROM time WHERE day>=? AND day<=? AND (site>0 OR video>0) GROUP BY day', d14, day),
    q('SELECT COUNT(DISTINCT uid) u FROM time WHERE day>=? AND day<=? AND (site>0 OR video>0)', d7, day),
    q('SELECT uid, MAX(day) d FROM time WHERE site>0 OR video>0 GROUP BY uid'),
    q('SELECT day, k, COUNT(DISTINCT uid) u, SUM(n) n FROM ev WHERE day>=? AND day<=? GROUP BY day, k', d14, day),
    q('SELECT kind, COUNT(*) n FROM log WHERE at>=? AND at<? GROUP BY kind', from, to),
    q("SELECT COUNT(*) n, COUNT(DISTINCT uid) u, SUM(CASE WHEN at>=? THEN 1 ELSE 0 END) nd FROM log WHERE kind='ai' AND at>=? AND at<? AND uid NOT IN (" + STAFF_IDS(env) + ")", from, from7, to),
    q('SELECT cid, wsec, day FROM cresp WHERE day>=? AND day<=?', d7, day),
    q('SELECT cid, COUNT(*) n, MIN(since) s FROM cwait GROUP BY cid'),
    q('SELECT day, COUNT(*) n, AVG(wsec) w FROM care_resp WHERE day>=? AND day<=? GROUP BY day', d7, day),
    q('SELECT COUNT(*) n, MIN(wait_since) s FROM care_dlg WHERE wait_since IS NOT NULL'),
    q('SELECT COUNT(DISTINCT uid) users, SUM(CASE WHEN day=? THEN 1 ELSE 0 END) yday, COUNT(*) n FROM bank_tx', day),
    q("SELECT COUNT(DISTINCT uid) users, SUM(CASE WHEN status NOT IN ('done','cancel') THEN 1 ELSE 0 END) act FROM bank_order"),
    q('SELECT h, day, pts, lessons, hw FROM snap WHERE day>=? AND day<=?', addDays(day, -7), day),
    q('SELECT COUNT(*) n FROM student WHERE tg_chat IS NOT NULL')]).then(r => r.map(x => x.results || []));
  let fb = { up: 0, down: 0 }; try { const f = await q('SELECT SUM(CASE WHEN vote>0 THEN 1 ELSE 0 END) up, SUM(CASE WHEN vote<0 THEN 1 ELSE 0 END) down FROM ai_fb WHERE at>=?', Date.parse(from7)).first(); fb = { up: f.up | 0, down: f.down | 0 } } catch (e) {}
  const med = a => { a = a.filter(x => x > 0).sort((x, y) => x - y); return a.length ? a[Math.floor((a.length - 1) / 2)] : null };
  const S = {}; for (const r of sn) (S[r.day] = S[r.day] || {})[r.h] = r;
  const delta = (a, b) => { let L = 0, H = 0, P = 0, who = 0; for (const h in (S[a] || {})) { if (!byH[h]) continue; const x = S[a][h], y = (S[b] || {})[h]; if (!y) continue; const dl = Math.max(0, x.lessons - y.lessons), dh = Math.max(0, x.hw - y.hw); L += dl; H += dh; P += Math.max(0, x.pts - y.pts); if (dl || dh) who++ } return { lessons: L, hw: H, pts: P, students: who } };
  const last = {}; tLast.forEach(r => last[r.uid] = r.d);
  const idle = rows.map(r => ({ uid: +r.uid, name: r.name, place: r.place, last: last[+r.uid] || null, days: last[+r.uid] ? Math.round((Date.parse(day) - Date.parse(last[+r.uid])) / 864e5) : null }))
    .filter(x => x.days == null || x.days >= 5).sort((a, b) => (b.days == null ? 999 : b.days) - (a.days == null ? 999 : a.days));
  const trend = []; for (let i = 13; i >= 0; i--) { const d = addDays(day, -i), t = tDay.find(x => x.day === d) || {}, a = evDay.find(x => x.day === d && x.k === 'app') || {}; trend.push({ day: d, site: t.u | 0, app: a.u | 0, min: Math.round(((t.site | 0) + (t.video | 0)) / 60) }) }
  const tabs = {}, errs = {}; evDay.filter(x => x.day >= d7).forEach(x => { if (/^tab:|^page:/.test(x.k)) tabs[x.k] = (tabs[x.k] || 0) + (x.u | 0); if (/^err:/.test(x.k)) errs[x.k.slice(4)] = (errs[x.k.slice(4)] || 0) + (x.n | 0) });
  const appU7 = new Set(); try { ((await q("SELECT DISTINCT uid FROM ev WHERE day>=? AND day<=? AND k='app'", d7, day).all()).results || []).forEach(r => appU7.add(r.uid)) } catch (e) {}
  const curs = CURATORS.map(c => { const R = cr.filter(x => x.cid === c.id), Y = R.filter(x => x.day === day), w = cw.find(x => x.cid === c.id);
    return { id: c.id, name: c.full, answered: Y.length, answered7: R.length, median: med(Y.map(x => x.wsec)), median7: med(R.map(x => x.wsec)), waiting: w ? w.n : 0, oldestH: w && w.s ? Math.round((Date.now() / 1000 - w.s) / 3600) : null } });
  const tech = {}; logK.forEach(x => { if (/err|diag|fail|budget|cut|acc-|mod/.test(x.kind)) tech[x.kind] = x.n });
  return { ok: true, day, n: rows.length, tgLinked: (tgN[0] || {}).n | 0,
    active: { site: (tDay.find(x => x.day === day) || {}).u | 0, site7: (t7[0] || {}).u | 0, app: (evDay.find(x => x.day === day && x.k === 'app') || {}).u | 0, app7: appU7.size, minutes: trend[13].min },
    progress: { day: delta(day, d1), week: delta(day, Object.keys(S).sort()[0] || d1), weekFrom: Object.keys(S).sort()[0] || null, trackingFrom: (tDay[0] || {}).day || null, ontime: rows.length ? Math.round(rows.reduce((a, r) => a + (r.ontime | 0), 0) / rows.length) : null },
    neuro: { q: (logAi[0] || {}).nd | 0, q7: (logAi[0] || {}).n | 0, users7: (logAi[0] || {}).u | 0, errors: (logK.find(x => x.kind === 'ai-err') || {}).n | 0, fbUp7: fb.up, fbDown7: fb.down },
    curators: curs, care: { answered7: care.reduce((a, x) => a + (x.n | 0), 0), avgMin7: care.length ? Math.round(care.reduce((a, x) => a + (x.w || 0) * x.n, 0) / Math.max(1, care.reduce((a, x) => a + x.n, 0)) / 60) : null, waiting: (careW[0] || {}).n | 0 },
    bank: { users: (btx[0] || {}).users | 0, txYday: (btx[0] || {}).yday | 0, orderUsers: (bord[0] || {}).users | 0, ordersActive: (bord[0] || {}).act | 0 },
    idle: { count: idle.length, never: idle.filter(x => x.days == null).length, list: idle.slice(0, 25) }, usage7: tabs, clientErrors7: errs, tech, trend, x2: D.x2 || null, updated: D.updated || null } }
async function insightsText(env, I) {
  const brief = Object.assign({}, I, { idle: { count: I.idle.count, never: I.idle.never, top: I.idle.list.slice(0, 8).map(x => x.name + (x.days == null ? ' (не заходил)' : ' (' + x.days + ' дн)')) }, trend: I.trend.map(t => t.day.slice(5) + ':' + t.site + '/' + t.app) });
  const sys = 'Ты продуктовый аналитик онлайн-школы OduvanovSchool (курс AI-дизайна, кабинет на GetCourse + мини-приложение в Telegram, кураторы, Нейро — ИИ-помощник). Тебе дают сводку за вчера и 7 дней. Напиши 3–5 находок. Читатель — сам Роман, владелец школы: обращайся к нему на «ты», не пиши «сообщи Роману».\n'
    + 'Каждая находка — одна строка: «• что видно по цифрам — почему это важно — что сделать сегодня (конкретно: кому написать, что проверить, что поправить)». Только факты из данных, никаких выдумок и общих советов; если данных мало — так и скажи. Сначала самое срочное (сбои, ученики без ответа, провал активности). '
    + 'Пиши на «ты», по-русски, без вступления и заголовков, без markdown кроме «•». До 900 знаков. Поля: active.site — заходили на сайт, active.app — открывали мини-приложение, progress.day — уроки/ДЗ за день, idle — без активности 5+ дней, curators.median — медиана ответа в рабочих секундах, care — Служба заботы (care.waiting — ждут ответа Заботы, это не кураторы), curators[].waiting — ждут ответа куратора, tech — сбои (ai-err — ошибки Нейро, tg-diag — проблемы входа на сайт из Telegram). Учёт времени на сайте идёт с progress.trackingFrom, мини-приложения — с 27.10: «не заходили» до этих дат — не факт, а отсутствие данных.';
  const { r, j } = await aiFetch(env, JSON.stringify({ model: AI_MODEL(env), max_tokens: 3000, output_config: { effort: 'low' }, system: sys, messages: [{ role: 'user', content: JSON.stringify(brief) }] }));
  if (r && r.ok && !((j.content || []).find(b => b.type === 'text') || {}).text) await logIt(env, 'insights-ai-err', 0, 'нет текста: ' + (j.stop_reason || '') + ' ' + (j.content || []).map(b => b.type).join(','));
  if (!r || !r.ok) { await logIt(env, 'insights-ai-err', 0, (r ? r.status : 'net') + ' ' + JSON.stringify((j && j.error) || {}).slice(0, 200)); return null } return ((j.content || []).find(b => b.type === 'text') || {}).text || null }
function insightsMsg(I, text) { const p = I.progress.day, m = s => s == null ? '—' : s < 3600 ? Math.round(s / 60) + ' мин' : (s / 3600).toFixed(1).replace('.', ',') + ' ч';
  const d = new Date(I.day + 'T12:00:00Z'), MN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return '📊 <b>Аналитика за ' + d.getUTCDate() + ' ' + MN[d.getUTCMonth()] + '</b>\n'
    + 'Заходили: сайт ' + I.active.site + ' · приложение ' + I.active.app + ' из ' + I.n + ' (за 7 дней ' + I.active.site7 + ' / ' + I.active.app7 + ')\n'
    + 'Уроков ' + p.lessons + ' · ДЗ ' + p.hw + ' · двигались ' + p.students + ' учеников\n'
    + 'Нейро: ' + I.neuro.q + ' вопросов' + (I.neuro.errors ? ' · ⚠️ ошибок ' + I.neuro.errors : '') + '\n'
    + 'Кураторы: ' + I.curators.map(c => th(c.name.split(' ')[0]) + ' ' + c.answered + ' отв., медиана ' + m(c.median) + (c.waiting ? ', ждут ' + c.waiting : '')).join(' · ') + '\n'
    + 'Без активности 5+ дней: ' + I.idle.count + '\n\n' + (text ? th(text) : '<i>Находки не сформировались — нейросеть недоступна, цифры выше.</i>') + '\n\nПодробно: пульт → «Аналитика»' }
async function insightsJob(env, B, force) { const day = addDays(dayStr(), -1); if (!force && msk().getUTCHours() < 9) return { skip: 'early' };
  const k = 'ins:' + day; if (!force && await kvGet(env, k)) return { skip: 'done' }; if (B && !B.ok(4)) return { skip: 'budget' }; if (B) B.use(4);
  const I = await insightsData(env, day); let text = null; try { text = await insightsText(env, I) } catch (e) { await logIt(env, 'insights-ai-err', 0, 'исключение: ' + String(e && e.message || e).slice(0, 200)) }
  await kvPut(env, k, { I, text, at: new Date().toISOString() }); const idx = (await kvGet(env, 'ins:idx')) || []; if (!idx.includes(day)) { idx.unshift(day); await kvPut(env, 'ins:idx', idx.slice(0, 60)) }
  if (!force || force === 'send') for (const a of await admins(env)) await tgSend(env, a, insightsMsg(I, text));
  await logIt(env, 'insights', 0, day + (text ? '' : ' без находок')); return { ok: true, day } }
async function neuroAdmin(env, s, path, req, u, ajson) { if (s.role !== 'admin') return ajson({ ok: false, err: 'Раздел только для Романа' }, 403);
  const C = MOD_CFG(env), now = Date.now();
  /* 27.10: аналитика поведения — ?day=ГГГГ-ММ-ДД (по умолчанию вчера); fresh=1 пересчитать; send=1 разослать админам */
  if (path === '/app/api/neuro/insights') { const day = /^\d{4}-\d{2}-\d{2}$/.test(u.searchParams.get('day') || '') ? u.searchParams.get('day') : addDays(dayStr(), -1);
    if (u.searchParams.get('fresh') || u.searchParams.get('send')) { if (day === addDays(dayStr(), -1)) await insightsJob(env, null, u.searchParams.get('send') ? 'send' : 'quiet'); else { const I = await insightsData(env, day); await kvPut(env, 'ins:' + day, { I, text: await insightsText(env, I).catch(() => null), at: new Date().toISOString() }) } }
    let R = await kvGet(env, 'ins:' + day); if (!R) R = { I: await insightsData(env, day), text: null, at: null, live: true };
    const today = await insightsData(env, dayStr()); return ajson(Object.assign({ ok: true, days: (await kvGet(env, 'ins:idx')) || [], today: { active: today.active, progress: today.progress.day, neuro: today.neuro } }, R)) }
  /* 27.10: журнал сервера для разборов (только админ): ?k=tg-diag,ma-staff&from=ISO&to=ISO&q=текст — плюс журнал «Смотреть как» */
  if (path === '/app/api/neuro/log') { const ks = String(u.searchParams.get('k') || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 12), from = u.searchParams.get('from') || '2000', to = u.searchParams.get('to') || '2999', q = u.searchParams.get('q') || '';
    const w = ['at >= ?', 'at <= ?'], b = [from, to]; if (ks.length) { w.push('kind IN (' + ks.map(() => '?').join(',') + ')'); b.push(...ks) } if (q) { w.push('(info LIKE ? OR CAST(uid AS TEXT) = ?)'); b.push('%' + q + '%', q) }
    const r = await env.DB.prepare('SELECT at, kind, uid, info FROM log WHERE ' + w.join(' AND ') + ' ORDER BY at DESC LIMIT 400').bind(...b).all();
    return ajson({ ok: true, log: r.results || [], valog: ((await kvGet(env, 'valog')) || []).filter(x => (x.at || '') >= from.slice(0, 10) || (x.until || '') >= from.slice(0, 10)).slice(-100) }) }
  if (path === '/app/api/neuro/status') { const idx = (await kvGet(env, 'modidx')) || [], D = await loadData(env), list = [];
    const st = idx.length ? ((await env.DB.prepare('SELECT k, v FROM kv WHERE k IN (' + idx.slice(-300).map(() => '?').join(',') + ')').bind(...idx.slice(-300).map(x => 'mod:' + x)).all()).results || []) : [];
    const studs = {}; for (const r of ((await env.DB.prepare('SELECT uid, name, curator FROM student').all()).results || [])) studs[r.uid] = r;
    for (const r of st) { const uid = +r.k.slice(4), M = JSON.parse(r.v), row = (D.rows || []).find(x => +x.uid === uid) || {}, sd = studs[uid] || {}, c = sd.curator && CURATORS.find(x => x.id === sd.curator);
      list.push({ uid, name: row.name || sd.name || null, tar: row.tar || null, curName: c ? c.full : null, n: M.n, step: M.step, until: M.until > now ? M.until : 0, banned: !!M.banned, hist: (M.hist || []).slice(0, 8), lastV: M.lastV }) }
    list.sort((a, b) => (b.banned - a.banned) || (b.until - a.until) || (b.n - a.n));
    let fil = 0, fil7 = 0; for (let i = 0; i < 7; i++) { const x = await kvGet(env, 'modstat:' + addDays(dayStr(), -i)); if (x) { fil7 += x.n; if (!i) fil = x.n } }
    const errs = ((await env.DB.prepare("SELECT at, uid, info FROM log WHERE kind='ai-err' AND at >= ? ORDER BY at DESC LIMIT 30").bind(new Date(now - 7 * 864e5).toISOString()).all()).results || []);
    const today = new Date(dayStr() + 'T00:00:00+03:00').toISOString(), errToday = errs.filter(e => e.at >= today).length;
    const cost = (await env.DB.prepare("SELECT COUNT(*) n FROM log WHERE kind='ai-ma' AND at >= ?").bind(new Date(now - 7 * 864e5).toISOString()).first()).n | 0;
    return ajson({ ok: true, cfg: C, filtered: { today: fil, week: fil7, saved_rub: Math.round(fil7 * 0.35) }, asked7: cost, errors: { today: errToday, last: errs.slice(0, 12) }, students: list, valog: ((await kvGet(env, 'valog')) || []).slice(0, 40) }) }
  if (path === '/app/api/neuro/cwclear' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
    const w = await env.DB.prepare('SELECT * FROM cwait WHERE cid=? AND chat=?').bind(String(o.cid || ''), String(o.chat || '')).first(); if (!w) return ajson({ ok: false }, 404);
    await env.DB.batch([env.DB.prepare('DELETE FROM cwait WHERE cid=? AND chat=?').bind(w.cid, w.chat), env.DB.prepare('INSERT INTO cack (cid, chat, uid, kind, since, at) VALUES (?,?,?,?,?,?)').bind(w.cid, w.chat, w.uid, 'admin-clear', w.since, Date.now() / 1000 | 0)]); await logIt(env, 'cw-clear', w.uid, w.cid); return ajson({ ok: true }) }
  if (path === '/app/api/neuro/act' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {} const uid = +o.uid, k = 'mod:' + uid, M = await modState(env, uid);
    if (o.act === 'lift') { M.until = 0; M.banned = false } else if (o.act === 'reset') { M.n = 0; M.step = 0; M.until = 0; M.banned = false; M.hist = [] } else if (o.act === 'ban') { M.banned = true } else return ajson({ ok: false }, 400);
    await kvPut(env, k, M); const idx = (await kvGet(env, 'modidx')) || []; if (!idx.includes(uid)) { idx.push(uid); await kvPut(env, 'modidx', idx) }
    await logIt(env, 'mod-' + o.act, uid, s.name || ''); return ajson({ ok: true }) }
  /* оценки ответов Нейро: доля 👍, последние 👎 с вопросом и ответом (ночь 27.10) */
  if (path === '/app/api/neuro/fb') { await aiFbEnsure(env); const lim = Math.min(200, +u.searchParams.get('n') || 50), only = u.searchParams.get('v'), d7 = now - 7 * 864e5;
    const [a, w, l] = await env.DB.batch([env.DB.prepare('SELECT SUM(vote>0) up, SUM(vote<0) down FROM ai_fb WHERE view=0'), env.DB.prepare('SELECT SUM(vote>0) up, SUM(vote<0) down FROM ai_fb WHERE view=0 AND at>=?').bind(d7),
      env.DB.prepare('SELECT f.*, s.name sname FROM ai_fb f LEFT JOIN student s ON s.uid=f.uid' + (only === 'down' ? ' WHERE f.vote<0' : only === 'up' ? ' WHERE f.vote>0' : '') + ' ORDER BY f.at DESC LIMIT ?').bind(lim)]);
    const sh = x => { const up = x.up | 0, dn = x.down | 0; return { up, down: dn, n: up + dn, share: up + dn ? Math.round(up / (up + dn) * 100) : null } };
    return ajson({ ok: true, all: sh((a.results || [])[0] || {}), week: sh((w.results || [])[0] || {}), last: (l.results || []).map(x => ({ at: x.at, uid: x.uid, name: x.sname || null, vote: x.vote, why: x.why, q: x.q, a: x.a, tools: x.tools, view: !!x.view })) }) }
  /* тест Нейро из пульта (только админ): без ученика или как ученик uid, ничего не отправляет, в лимиты и антиспам ученика не пишет. mod: 1 — сначала правила антиспама (без записи нарушений) */
  if (path === '/app/api/neuro/test' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
    const text = String(o.text || '').trim().slice(0, 2000); if (!text) return ajson({ ok: false, err: 'empty' }, 400);
    if (o.mod) { const why = await modWhy(env, text.toLowerCase().replace(/\s+/g, ' ').trim(), false); if (why) return ajson({ ok: true, mod: why, text: null }) }
    const hist = (Array.isArray(o.hist) ? o.hist : []).filter(x => x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string').slice(-10);
    const R = await aiTurn(env, { uid: +o.uid || 0, history: hist, user: text, cf: req.cf }); if (R.err) return ajson({ ok: false, err: R.err });
    const QR = aiQuick(R.text); await logIt(env, 'ai-test', +o.uid || 0, JSON.stringify({ in: R.usage.in, cache: R.usage.cache, out: R.usage.out }));
    return ajson({ ok: true, text: QR.text, quick: QR.quick, tools: R.tools || [], usage: R.usage, rub: +(aiCost(R.usage) * AI_PRICE.rub).toFixed(3), ms: R.ms }) }
  /* разбор напоминаний кураторам: ожидания, ответы, ручные отметки и что прислал бот */
  if (path === '/app/api/neuro/curdiag') { const cid = u.searchParams.get('c') || 'anton', day = u.searchParams.get('d') || dayStr(), from = Math.floor(Date.parse(day + 'T00:00:00+03:00') / 1000) - 86400;
    const [w, r, a, l] = await env.DB.batch([env.DB.prepare('SELECT w.*, s.name sname FROM cwait w LEFT JOIN student s ON s.uid=w.uid WHERE w.cid=?').bind(cid),
      env.DB.prepare('SELECT r.*, s.name sname FROM cresp r LEFT JOIN student s ON s.uid=r.uid WHERE r.cid=? AND r.answered >= ? ORDER BY r.answered').bind(cid, from),
      env.DB.prepare("SELECT * FROM cack WHERE cid=? AND at >= ? ORDER BY at").bind(cid, from),
      env.DB.prepare("SELECT at, kind, uid, info FROM log WHERE (kind LIKE 'cw-%' OR kind LIKE 'biz-%' OR kind LIKE 'cron-cur%') AND at >= ? ORDER BY at").bind(new Date(from * 1000).toISOString())]);
    return ajson({ ok: true, cid, wait: w.results || [], resp: r.results || [], acks: a.results || [], log: l.results || [] }) }
  return ajson({ ok: false, err: 'not found' }, 404) }

/* ---------- 30.10 Эфиры и автовебинары (макет «Банк, кураторы и связь», раздел 9; описание — docs/plan/bks-impl.md, «Эфиры: сделано») ----------
   Эфир efir: kind live (эфир для учеников) | open (открытый, с регистрацией через бота) | auto (автовебинар по сценарию, показывается как LIVE — решение Романа №9).
   Доступ tariff: all — все ученики, amz — только «Премиум Амазон», cur — ученики куратора-ведущего, open — все, включая не-учеников (вход по ссылке из бота).
   Создают и ведут: админ — любые, куратор — только свои (решение №4), без продаж: кнопки заявки и автовебинаров у кураторов нет.
   Зритель: ученик (токен ученика / сессия student), команда (сессия пульта), гость открытого эфира (?r=<метка из бота>). Ключ зрителя k: 'u<uid>' | 't<chat>'.
   Всё в эфире пишется с секундой от начала: чат efir_msg.sec, события efir_ev.sec (кнопка заявки, баннер, опрос) — из этого «Собрать из эфира» делает сценарий efir_scen.
   Баллы — в отдельной таблице efir_pts (в рейтинг — /rating/efirpts): с 1.11 — 5 за каждые 15 мин в эфире, 10 за открытие записи без эфира; раньше 10 за 30 мин в эфире, 5 за досмотренную запись (90%), 2 за вопрос (до 3 в эфир), 15 за выход на сцену. */
const EFIR_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS efir_cover (id INTEGER PRIMARY KEY AUTOINCREMENT, mime TEXT, data TEXT, by_uid INTEGER, at INTEGER)',
  'CREATE TABLE IF NOT EXISTS efir (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, about TEXT, host_cid TEXT, host_uid INTEGER, host_name TEXT, start INTEGER, dur INTEGER, kind TEXT, tariff TEXT, status TEXT, video TEXT, rec TEXT, cover TEXT, chapters TEXT, cfg TEXT, at_live INTEGER, at_end INTEGER, created INTEGER, upd INTEGER, del INTEGER DEFAULT 0)',
  'CREATE INDEX IF NOT EXISTS efir_start ON efir (start)',
  "CREATE TABLE IF NOT EXISTS efir_reg (efir_id INTEGER NOT NULL, k TEXT NOT NULL, uid INTEGER, chat TEXT, name TEXT, sess INTEGER DEFAULT 0, src TEXT, at INTEGER, rem TEXT DEFAULT '', PRIMARY KEY (efir_id, k))",
  'CREATE INDEX IF NOT EXISTS efir_reg_k ON efir_reg (k)',
  'CREATE TABLE IF NOT EXISTS efir_seen (efir_id INTEGER NOT NULL, k TEXT NOT NULL, sess INTEGER NOT NULL DEFAULT 0, t0 INTEGER, scen INTEGER, min INTEGER DEFAULT 0, first INTEGER, last INTEGER, maxsec INTEGER DEFAULT 0, rec_pos INTEGER DEFAULT 0, rec_max INTEGER DEFAULT 0, rec_done INTEGER DEFAULT 0, PRIMARY KEY (efir_id, k, sess))',
  "CREATE TABLE IF NOT EXISTS efir_msg (id INTEGER PRIMARY KEY AUTOINCREMENT, efir_id INTEGER NOT NULL, sess INTEGER DEFAULT 0, k TEXT, uid INTEGER, name TEXT, role TEXT, kind TEXT, text TEXT, file_id INTEGER, sec INTEGER, at INTEGER, vis TEXT DEFAULT 'all', to_k TEXT, reply_to INTEGER, votes INTEGER DEFAULT 0, ans INTEGER DEFAULT 0, del INTEGER DEFAULT 0)",
  'CREATE INDEX IF NOT EXISTS efir_msg_e ON efir_msg (efir_id, sess, id)',
  'CREATE TABLE IF NOT EXISTS efir_vote (mid INTEGER NOT NULL, k TEXT NOT NULL, PRIMARY KEY (mid, k))',
  'CREATE TABLE IF NOT EXISTS efir_hand (efir_id INTEGER NOT NULL, k TEXT NOT NULL, uid INTEGER, name TEXT, st TEXT, at INTEGER, PRIMARY KEY (efir_id, k))',
  'CREATE TABLE IF NOT EXISTS efir_ev (id INTEGER PRIMARY KEY AUTOINCREMENT, efir_id INTEGER NOT NULL, sess INTEGER DEFAULT 0, sec INTEGER, kind TEXT, data TEXT, at INTEGER)',
  'CREATE INDEX IF NOT EXISTS efir_ev_e ON efir_ev (efir_id, sess, sec)',
  'CREATE TABLE IF NOT EXISTS efir_scen (id INTEGER PRIMARY KEY AUTOINCREMENT, src_id INTEGER, ver INTEGER, title TEXT, items TEXT, vc TEXT, note TEXT, by TEXT, at INTEGER)',
  "CREATE TABLE IF NOT EXISTS efir_lead (id INTEGER PRIMARY KEY AUTOINCREMENT, efir_id INTEGER, sess INTEGER, k TEXT, uid INTEGER, chat TEXT, name TEXT, contact TEXT, text TEXT, sec INTEGER, at INTEGER, st TEXT DEFAULT 'new')",
  'CREATE TABLE IF NOT EXISTS efir_pts (k TEXT NOT NULL, uid INTEGER, efir_id INTEGER NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, pts INTEGER, at INTEGER, PRIMARY KEY (k, efir_id, kind, n))',
  'CREATE TABLE IF NOT EXISTS efir_pollv (ev TEXT NOT NULL, k TEXT NOT NULL, sess INTEGER NOT NULL DEFAULT 0, opt INTEGER, PRIMARY KEY (ev, k, sess))'];
let EFIR_OK = false;
async function efirEnsure(env) { await ensure(env); await bankEnsure(env); if (EFIR_OK) return; await env.DB.batch(EFIR_SCHEMA.map(s => env.DB.prepare(s))); EFIR_OK = true }
const EF_PTS = { live30: 10, live15: 5, rec: 10, q: 2, stage: 15 } /* 1.11 (Роман): 5 баллов за каждые 15 мин в эфире; 10 — за открытие записи, если на эфире не был. live30 — старые начисления */, EF_QMAX = 3, EF_KINDS = ['live', 'open', 'auto'], EF_ACC = ['all', 'amz', 'cur', 'open'];
const efJ = (v, d) => { try { return v ? JSON.parse(v) : d } catch (e) { return d } };
const efShort = n => { const p = String(n || '').trim().split(/\s+/); return p.length > 1 && p[1] ? p[0] + ' ' + p[1][0].toUpperCase() + '.' : (p[0] || 'Зритель') };
const efAdminUid = env => +String(env.ADMIN_UIDS || '499631257').split(/[\s,]+/)[0];
/* время МСК: «4 ноября, 19:00 МСК», «чт, 19:00 МСК» */
const efHM = ms => { const d = msk(new Date(ms)); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') };
const efWhen = ms => { const d = msk(new Date(ms)); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ', ' + efHM(ms) + NB + 'МСК' };
/* видео: Kinescope (ID или ссылка) или прямая ссылка https; для плеера — embed */
function efVideo(v) { if (!v) return null; if (typeof v === 'string') v = { url: v }; let id = bStr(v.id, 80), url = bStr(v.url, 500);
  const km = (url || id).match(/kinescope\.io\/(?:embed\/)?([A-Za-z0-9_-]{4,40})/); if (km) id = km[1];
  if (id && /^[A-Za-z0-9_-]{4,40}$/.test(id) && (v.provider === 'kinescope' || km || !url)) return { provider: 'kinescope', id, embed: 'https://kinescope.io/embed/' + id };
  if (/^https:\/\/[^\s"'<>]+$/.test(url)) return { provider: 'url', url, file: /\.(mp4|webm|m3u8)(\?|$)/i.test(url) ? 1 : 0 };
  return null }
/* автовебинар: сеансы по расписанию {days:[0..6 МСК], times:['19:00'], every:N мин, after:N мин после регистрации} в окне [from, to) */
function efSessions(e, from, to) { const S = (efJ(e.cfg, {}).sched) || {}, out = [], times = (S.times || []).filter(t => /^\d{1,2}:\d{2}$/.test(t)), days = Array.isArray(S.days) && S.days.length ? S.days.map(Number) : [0, 1, 2, 3, 4, 5, 6], every = Math.max(0, +S.every | 0);
  const d0 = Date.parse(dayStr(new Date(from)) + 'T00:00:00+03:00');
  for (let d = d0; d < to && out.length < 400; d += 864e5) { const wd = new Date(d + 3 * 36e5).getUTCDay(); if (!days.includes(wd)) continue;
    for (const t of times) { const [h, m] = t.split(':').map(Number), s = d + (h * 60 + m) * 6e4; if (s >= from && s < to) out.push(s) }
    if (every >= 15) for (let s = d; s < d + 864e5; s += every * 6e4) if (s >= from && s < to) out.push(s) }
  return [...new Set(out)].sort((a, b) => a - b) }
const efDurMs = e => Math.max(5, +e.dur || 60) * 6e4;
/* состояние эфира сейчас: live — идёт; soon — впереди; done — закончился. Для автовебинара — ближайший/идущий сеанс */
function efState(e, now, reg) { if (e.kind === 'auto') { const D = efDurMs(e);
    if (reg && reg.sess && now < reg.sess + D) return { st: now >= reg.sess ? 'live' : 'soon', sess: reg.sess };
    const L = efSessions(e, now - D, now + 14 * 864e5), run = L.filter(s => s <= now && now < s + D).pop(), nx = L.find(s => s > now);
    if (run) return { st: 'live', sess: run, next: nx || null }; return nx ? { st: 'soon', sess: nx } : { st: 'none', sess: 0 } }
  if (e.status === 'live') return { st: 'live', sess: 0 }; if (e.status === 'done' || e.status === 'rec') return { st: 'done', sess: 0 };
  if (e.status === 'cancel') return { st: 'cancel', sess: 0 }; return { st: 'soon', sess: 0 } }
/* кто спрашивает. Ученик — токен ученика или сессия student; команда — сессия пульта (admin/curator); гость открытого эфира — метка ?r= из бота */
async function efGuestTok(env, chat) { return 'g' + chat + '.' + (await hmacHex(env, 'efr|' + chat)).slice(0, 20) }
async function efirWho(env, req, u, o) { const t = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/, '') || u.searchParams.get('t') || (o && o.t) || '', r = u.searchParams.get('r') || (o && o.r) || '';
  const stu = async (uid, ro) => uid ? { me: 'student', uid, k: 'u' + uid, ro: !!ro, staff: isStaffUid(env, uid) } : null;
  if (/^\d+\.[0-9a-z]+\.[av]\.[0-9a-f]{32}$/.test(t)) { const w = await stu(await authUid(env, t, 'a')); if (w) return w }
  else if (/\.w\./.test(t)) { const v = await viewTok(env, t); if (v) return stu(v.uid, true) }
  else if (/^[0-9a-f]{32}$/.test(t)) { const s = await kvGet(env, 'sess:' + t); if (s && s.exp > msNow()) { if (s.role === 'student' && s.uid) return stu(+s.uid);
      if (s.role === 'admin' || s.role === 'curator') { const uid = s.role === 'admin' ? efAdminUid(env) : ((CURATORS.find(c => c.id === s.cid) || {}).uid || 0); return { me: s.role, s, cid: s.cid || null, adm: s.role === 'admin', uid, k: 'u' + uid, staff: true } } } }
  const m = String(r).match(/^g(-?\d{3,20})\.([0-9a-f]{20})$/); if (m && same(m[2], (await hmacHex(env, 'efr|' + m[1])).slice(0, 20))) return { me: 'guest', chat: m[1], k: 't' + m[1], uid: 0 };
  return null }
const EFN = new Map(); /* имена зрителей (кеш изолята) */
async function efName(env, W) { if (W.nm) return W.nm; if (W.me === 'admin') return (W.nm = 'Роман'); if (W.me === 'curator') return (W.nm = ((CURATORS.find(c => c.id === W.cid) || {}).name || 'Куратор'));
  if (EFN.has(W.k)) return (W.nm = EFN.get(W.k)); let n = '';
  if (W.uid) { const c = CURATORS.find(x => x.uid === W.uid); n = c ? c.name : W.uid === efAdminUid(env) ? 'Роман' : efShort(await stuName(env, W.uid)) }
  else if (W.chat) { const g = await env.DB.prepare('SELECT name, username FROM tg_user WHERE chat=?').bind(W.chat).first().catch(() => null); n = efShort((g && (g.name || g.username)) || 'Гость') }
  EFN.set(W.k, n); return (W.nm = n) }
/* может ли смотреть: команда — всё; ученик — по доступу эфира; гость — только открытые */
async function efCan(env, e, W) { if (!e || e.del) return false; if (W.staff) return true; const acc = e.tariff || 'all'; if (acc === 'open') return true; if (W.me === 'guest') return false;
  /* 1.11 (Роман): ученик видит эфиры своего куратора + общие эфиры Романа. Эфир куратора — только его ученикам, даже если отмечен «всем» */
  if (CURATORS.some(c => c.id === e.host_cid) && acc !== 'amz') { const st = await env.DB.prepare('SELECT curator FROM student WHERE uid=?').bind(W.uid).first(); return !!(st && st.curator && st.curator === e.host_cid) }
  if (acc === 'all') return true;
  if (acc === 'cur') { const st = await env.DB.prepare('SELECT curator FROM student WHERE uid=?').bind(W.uid).first(); return !!(st && st.curator && st.curator === e.host_cid) }
  if (acc === 'amz') { try { const r = await rowFor(await loadData(env), W.uid); return !!(r && r.tar === 'Премиум Амазон') } catch (e2) { return false } } return false }
/* может ли вести/менять: админ — любой, куратор — только свой */
/* Telegram ведущего: куратор — cur_tg; Роман — админ с юзернеймом */
async function efHostTg(env, e) { const c = CURATORS.find(x => x.id === e.host_cid);
  if (c) { const r = await env.DB.prepare('SELECT username, tg_id FROM cur_tg WHERE cid=? AND enabled=1').bind(c.id).first(); return { user: r && r.username || null, chats: r && r.tg_id ? [r.tg_id] : [] } }
  const a = await env.DB.prepare("SELECT a.chat, u.username FROM tg_admin a LEFT JOIN tg_user u ON u.chat=a.chat WHERE a.name LIKE 'Роман%' AND u.username IS NOT NULL LIMIT 1").first(); return { user: a && a.username || null, chats: a ? [a.chat] : [] } }
const efOwn = (W, e) => !!(W && W.s && (W.adm || (e && e.host_cid && e.host_cid === W.cid)));
function efHost(e) { const c = CURATORS.find(x => x.id === e.host_cid); return c ? { cid: c.id, name: c.full, short: c.name, photo: 'https://romanoduvanov.github.io/otzyvy/gc/curators/' + c.id + '.jpg' } : { cid: 'admin', name: e.host_name || 'Роман Одуванов', short: (e.host_name || 'Роман').split(' ')[0], photo: null } }
/* публичная карточка эфира (без чужих данных) */
function efPub(e, now, x) { x = x || {}; const cfg = efJ(e.cfg, {}), S = efState(e, now, x.reg), v = efVideo(efJ(e.video, null) || e.video), rv = efVideo(efJ(e.rec, null) || e.rec) || (S.st === 'done' ? v : null);
  const st = S.sess || e.start || 0, lead = cfg.lead && cfg.lead.on !== 0 && cfg.lead.title ? { title: cfg.lead.title, sub: cfg.lead.sub || '', btn: cfg.lead.btn || 'Оставить заявку', timer: +cfg.lead.timer || 0, url: cfg.lead.url || null, min: cfg.lead.min != null ? +cfg.lead.min : null } : null;
  return { id: e.id, title: e.title, about: e.about || '', kind: e.kind, access: e.tariff || 'all', status: e.status, state: S.st, start: st, next: S.next || null, dur: e.dur || 60, host: efHost(e), cover: e.cover || null,
    video: x.full ? v : (v ? { provider: v.provider } : null), rec: x.full ? rv : (rv ? { provider: rv.provider } : null), chapters: efJ(e.chapters, []), at_live: e.at_live || null, at_end: e.at_end || null,
    stage: !!cfg.stage, label: e.kind === 'auto' && cfg.label ? 'Запись эфира от ' + human(dayStr(new Date(cfg.orig_at || e.created || now))) : null, lead: x.full ? lead : !!lead, work: cfg.work !== 0, room_open: S.st === 'live' || (S.st === 'soon' && st - now < 15 * 6e4) } }
async function efGet(env, id) { return id ? env.DB.prepare('SELECT * FROM efir WHERE id=? AND del=0').bind(+id).first() : null }
async function efPts(env, W, eid, kind, n) { if (!W || !W.uid || W.staff || W.ro) return 0; const r = await env.DB.prepare('INSERT OR IGNORE INTO efir_pts (k, uid, efir_id, kind, n, pts, at) VALUES (?,?,?,?,?,?,?)').bind(W.k, W.uid, eid, kind, n | 0, EF_PTS[kind] || 0, msNow()).run(); return r.meta && r.meta.changes ? EF_PTS[kind] : 0 }
/* сценарий автовебинара: кеш разобранного JSON на изолят */
const EFSC = new Map();
async function efScen(env, id) { if (!id) return null; const c = EFSC.get(id); if (c && msNow() - c.t < 60e3) return c.s;
  const r = await env.DB.prepare('SELECT id, src_id, ver, title, items, vc, at FROM efir_scen WHERE id=?').bind(+id).first(); const s = r ? { id: r.id, src: r.src_id, ver: r.ver, title: r.title, at: r.at, items: efJ(r.items, []).sort((a, b) => a.sec - b.sec), vc: efJ(r.vc, []) } : null;
  EFSC.set(id, { t: msNow(), s }); return s }
/* активные события на секунде: последнее из «показать/убрать» для кнопки заявки, баннера, опроса */
function efActive(evs) { const A = {}; for (const x of evs) { const base = String(x.t || x.kind).replace(/_off$/, ''); if (!['lead', 'banner', 'poll', 'end'].includes(base)) continue; A[base] = /_off$/.test(x.t || x.kind) ? null : x } return A }
const efMsgPub = (m, W) => ({ id: m.id, name: m.name || 'Зритель', role: m.role, kind: m.kind, text: m.text || '', file: m.file_id ? 1 : 0, sec: m.sec, at: m.at, mine: W && m.k === W.k ? 1 : 0, votes: m.votes || 0, ans: m.ans || 0, vis: m.vis, to_me: W && m.to_k === W.k ? 1 : 0, reply_to: m.reply_to || null });
/* мусор в чате: ссылки, «+», техвопросы про звук, стоп-слова (kv efir_stop) */
async function efStop(env) { return ((await kvGet(env, 'efir_stop')) || []).map(s => String(s).toLowerCase()).filter(Boolean) }
const efSpam = (t, stop) => { t = String(t || '').trim().toLowerCase(); return !t || t.length < 2 || /https?:\/\/|t\.me\/|www\./.test(t) || /^[+\s!.]+$/.test(t) || /(звук|не\s*слыш|не\s*вид(но|ать)|тормоз|лага|завис|перезагру)/.test(t) || (stop || []).some(s => t.includes(s)) };

async function efirApi(env, req, path) { const u = new URL(req.url); await efirEnsure(env);
  const o = req.method === 'POST' ? await req.json().catch(() => ({})) : {}, now = msNow();
  /* лендинг открытого эфира — без входа */
  if (path === '/efir/open') { const e = await efGet(env, u.searchParams.get('id')); if (!e || e.tariff !== 'open' || e.status === 'draft') return json(req, { ok: false, err: 'Эфир не найден' }, 404);
    const n = await env.DB.prepare('SELECT COUNT(*) n FROM efir_reg WHERE efir_id=?').bind(e.id).first(), p = efPub(e, now); delete p.chapters;
    return json(req, { ok: true, efir: p, regs: n ? n.n : 0, bot: 'https://t.me/' + BOT(env) + '?start=e' + e.id }) }
  /* 31.10: обложки эфиров, загруженные в пульте (JPEG 1280×720) — открыто, как картинки на сайте */
  if (path === '/efir/cover') { const r = await env.DB.prepare('SELECT mime, data FROM efir_cover WHERE id=?').bind(+u.searchParams.get('id') || 0).first().catch(() => null); if (!r) return new Response('not found', { status: 404 });
    const bin = Uint8Array.from(atob(r.data), c => c.charCodeAt(0)); return new Response(bin, { headers: { 'Content-Type': r.mime || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*' } }) }
  const W = await efirWho(env, req, u, o); if (!W) return deny(req);
  if (env.KINESCOPE_KEY) try { await kinAutoLive(env, now) } catch (x) {}
  if (path.startsWith('/efir/host/') || path.startsWith('/efir/kin/')) return efirHostApi(env, req, path, u, o, W, now);
  const id = +(o.id || u.searchParams.get('id') || 0);
  /* 9.1 список: идёт сейчас, ближайшие (с «Напомнить»), записи с досмотром */
  if (path === '/efir/list') { const [er, rr, sr] = await env.DB.batch([env.DB.prepare("SELECT * FROM efir WHERE del=0 AND status NOT IN ('draft','cancel') AND (start>? OR status IN ('live','done','rec') OR kind='auto') ORDER BY start DESC LIMIT 120").bind(now - 120 * 864e5),
      env.DB.prepare('SELECT efir_id, sess FROM efir_reg WHERE k=?').bind(W.k), env.DB.prepare('SELECT efir_id, MAX(rec_pos) pos, MAX(rec_max) mx, MAX(rec_done) done FROM efir_seen WHERE k=? GROUP BY efir_id').bind(W.k)]);
    const R = {}, P = {}; for (const x of rr.results || []) R[x.efir_id] = x; for (const x of sr.results || []) P[x.efir_id] = x;
    const live = [], soon = [], rec = [];
    for (const e of er.results || []) { if (!(await efCan(env, e, W))) { if (W.me === 'student' && e.tariff === 'amz') { const p = efPub(e, now); if (p.state === 'soon') soon.push(Object.assign(p, { locked: 1 })) } continue }
      const p = efPub(e, now, { reg: R[e.id] }); p.reg = R[e.id] ? 1 : 0; if (R[e.id] && R[e.id].sess) p.my_sess = R[e.id].sess;
      if (p.state === 'live') live.push(p); else if (p.state === 'soon') soon.push(p);
      if (e.kind !== 'auto' && p.state === 'done' && p.rec) { const pr = P[e.id] || {}; p.seen = { pos: pr.pos || 0, max: pr.mx || 0, done: pr.done || 0 }; rec.push(p) } }
    if (live.length) { const ids = live.filter(x => x.kind !== 'auto').map(x => x.id); if (ids.length) { const vr = await qAll(env.DB.prepare('SELECT efir_id, COUNT(*) n FROM efir_seen WHERE last>? AND sess=0 AND efir_id IN (' + ids.map(() => '?').join(',') + ') GROUP BY efir_id').bind(now - 9e4, ...ids)); for (const v of vr) { const x = live.find(y => y.id === v.efir_id); if (x) x.viewers = v.n } } }
    soon.sort((a, b) => a.start - b.start); rec.sort((a, b) => (b.at_end || b.start) - (a.at_end || a.start));
    return json(req, { ok: true, now, me: { role: W.me, can_host: !!W.s, ro: !!W.ro }, live, soon: soon.slice(0, 30), rec: rec.slice(0, 40), regs: Object.keys(R).length }) }
  const e = await efGet(env, id); if (!e) return json(req, { ok: false, err: 'Эфир не найден' }, 404);
  if (!(await efCan(env, e, W))) return json(req, { ok: false, err: e.tariff === 'amz' ? 'Этот эфир — для тарифа «Премиум Амазон»' : 'Этот эфир не для твоего потока' }, 403);
  const reg = await env.DB.prepare('SELECT * FROM efir_reg WHERE efir_id=? AND k=?').bind(e.id, W.k).first();
  if (path === '/efir/one') { const p = efPub(e, now, { reg, full: true }), [sn, hd, pt, wk] = await env.DB.batch([env.DB.prepare('SELECT * FROM efir_seen WHERE efir_id=? AND k=? ORDER BY last DESC LIMIT 1').bind(e.id, W.k), env.DB.prepare('SELECT st FROM efir_hand WHERE efir_id=? AND k=?').bind(e.id, W.k), env.DB.prepare('SELECT COALESCE(SUM(pts),0) p FROM efir_pts WHERE efir_id=? AND k=?').bind(e.id, W.k), env.DB.prepare("SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND k=? AND kind='work' AND del=0").bind(e.id, W.k)]);
    const s0 = (sn.results || [])[0] || null, wq = (wk.results || [])[0];
    if (e.kind === 'auto') { const L = efSessions(e, now, now + 8 * 864e5).slice(0, 6), cfg = efJ(e.cfg, {}); p.sessions = L; p.after = cfg.sched && +cfg.sched.after || 0 }
    return json(req, { ok: true, now, efir: p, me: { role: W.me, ro: !!W.ro, reg: reg ? 1 : 0, sess: reg ? reg.sess : 0, hand: (hd.results || [])[0] ? hd.results[0].st : null, pts: ((pt.results || [])[0] || {}).p || 0, works: wq ? wq.n : 0, host_tg: e.kind !== 'auto' && efJ(e.cfg, {}).work !== 0 ? (await efHostTg(env, e)).user : null, seen: s0 ? { pos: s0.rec_pos, max: s0.rec_max, done: s0.rec_done, min: s0.min } : null, can_host: efOwn(W, e) } }) }
  /* «Напомнить» / отписаться. Автовебинар — запись на сеанс (sess) или «сразу после регистрации» */
  if (path === '/efir/reg' && req.method === 'POST') { if (W.ro) return json(req, { ok: false, err: 'Режим просмотра — только чтение' }, 403);
    if (o.on === 0 || o.on === '0') { await env.DB.prepare('DELETE FROM efir_reg WHERE efir_id=? AND k=?').bind(e.id, W.k).run(); return json(req, { ok: true, reg: 0 }) }
    let sess = 0; if (e.kind === 'auto') { const cfg = efJ(e.cfg, {}), after = cfg.sched && +cfg.sched.after || 0, L = efSessions(e, now - efDurMs(e) + 6e4, now + 14 * 864e5);
      sess = +o.sess && (L.includes(+o.sess) || (after && Math.abs(+o.sess - (now + after * 6e4)) < 3e5)) ? +o.sess : after ? Math.ceil((now + after * 6e4) / 6e4) * 6e4 : (L.find(x => x > now) || 0); if (!sess) return json(req, { ok: false, err: 'Ближайших сеансов нет' }, 400) }
    else if (efState(e, now).st === 'done') return json(req, { ok: false, err: 'Эфир уже прошёл — смотри запись' }, 400);
    const st = W.uid ? await env.DB.prepare('SELECT tg_chat FROM student WHERE uid=?').bind(W.uid).first() : null;
    await env.DB.prepare("INSERT INTO efir_reg (efir_id, k, uid, chat, name, sess, src, at, rem) VALUES (?,?,?,?,?,?,?,?,'') ON CONFLICT(efir_id, k) DO UPDATE SET sess=excluded.sess, rem=CASE WHEN efir_reg.sess=excluded.sess THEN efir_reg.rem ELSE '' END").bind(e.id, W.k, W.uid || null, W.chat || (st && st.tg_chat) || null, await efName(env, W), sess, bStr(o.src, 30) || 'app', now).run();
    await logIt(env, 'efir-reg', W.uid, e.id + (sess ? ' ' + sess : ''));
    return json(req, { ok: true, reg: 1, sess, start: sess || e.start, tg: !!(W.chat || (st && st.tg_chat)) }) }
  /* комната: опрос раз в 4–5 с. Присутствие (минуты → баллы), чат с секундой, вопросы, руки, события. Автовебинар — чат оригинала по секундам + свои сообщения */
  if (path === '/efir/room') { const S = efState(e, now, reg), cfg = efJ(e.cfg, {}), after = +u.searchParams.get('after') || 0, sess = e.kind === 'auto' ? S.sess : 0;
    if (S.st !== 'live') return json(req, { ok: true, now, state: S.st, start: S.sess || e.start, next: S.next || null });
    let seen = null; if (!W.ro) seen = await env.DB.prepare('INSERT INTO efir_seen (efir_id, k, sess, t0, scen, min, first, last, maxsec) VALUES (?,?,?,?,?,0,?,?,0) ON CONFLICT(efir_id, k, sess) DO UPDATE SET min=efir_seen.min+(CASE WHEN efir_seen.last<?-50000 AND efir_seen.last>?-180000 THEN 1 ELSE 0 END), last=CASE WHEN efir_seen.last<?-50000 THEN ? ELSE efir_seen.last END RETURNING t0, min, last, first')
      .bind(e.id, W.k, sess, e.kind === 'auto' ? (now - sess < 10 * 6e4 ? now : sess) : (e.at_live || e.start || now), cfg.scen || null, now, now, now, now, now, now).first();
    const t0 = seen && seen.t0 || (sess || e.at_live || e.start || now), sec = Math.max(0, Math.floor((now - t0) / 1000));
    let pts = 0; if (seen && seen.min >= 15 && seen.last === now) pts = await efPts(env, W, e.id, 'live15', Math.floor(seen.min / 15));
    if (seen) await env.DB.prepare('UPDATE efir_seen SET maxsec=MAX(maxsec, ?) WHERE efir_id=? AND k=? AND sess=?').bind(sec, e.id, W.k, sess).run();
    const out = { ok: true, now, state: 'live', sess, t0, sec, kind: e.kind, pts_new: pts };
    if (e.kind === 'auto') { /* «как в настоящем эфире»: свой отсчёт t0 (опоздал меньше 10 мин — с начала), конец — t0 + длительность */
      if (now > t0 + efDurMs(e)) return json(req, { ok: true, now, state: 'done', sess, rec_until: t0 + efDurMs(e) + 864e5 });
      const sc = await efScen(env, cfg.scen), from = +u.searchParams.get('asec') || -1, items = sc ? sc.items : [];
      out.msgs = items.filter(x => x.t === 'msg' && x.sec > from && x.sec <= sec).slice(-120).map((x, i) => ({ id: 's' + x.sec + '_' + i, name: x.name || 'Зритель', role: x.role || 'stu', kind: 'msg', text: x.text || '', sec: x.sec }));
      out.asec = sec; const A = efActive(items.filter(x => x.sec <= sec).map(x => Object.assign({}, x, { t: x.t })));
      out.lead = A.lead ? { title: A.lead.title || (cfg.lead && cfg.lead.title) || 'Оставить заявку', sub: A.lead.sub || '', btn: A.lead.btn || 'Оставить заявку', timer: +A.lead.timer || 0, since: A.lead.sec, url: (cfg.lead && cfg.lead.url) || null } : null;
      out.banner = A.banner ? { title: A.banner.title || '', sub: A.banner.sub || '', url: A.banner.url || null, btn: A.banner.btn || null } : null;
      if (A.poll) { const pid = 's' + sc.id + ':' + A.poll.sec, mv = await env.DB.prepare('SELECT opt FROM efir_pollv WHERE ev=? AND k=? AND sess=?').bind(pid, W.k, sess).first(); out.poll = { id: pid, q: A.poll.q || A.poll.text || '', opts: A.poll.opts || [], my: mv ? mv.opt : null } }
      const vcs = sc && sc.vc || [], vo = vcs.length ? (vcs[Math.min(vcs.length - 1, Math.floor(sec / 60))] || 0) : 0;
      const [mine, vr] = await env.DB.batch([env.DB.prepare("SELECT * FROM efir_msg WHERE efir_id=? AND sess=? AND del=0 AND id>? AND (k=? OR to_k=? OR (role IN ('host','mod') AND vis='all')) ORDER BY id LIMIT 100").bind(e.id, sess, after, W.k, W.k), env.DB.prepare('SELECT COUNT(*) n FROM efir_seen WHERE efir_id=? AND sess=? AND last>?').bind(e.id, sess, now - 9e4)]);
      out.live_msgs = (mine.results || []).map(m => efMsgPub(m, W)); out.viewers = ((vr.results || [])[0] || {}).n + vo; out.label = efPub(e, now).label; return json(req, out) }
    const [ms, qs, ev, hd, vr, vt] = await env.DB.batch([env.DB.prepare("SELECT * FROM efir_msg WHERE efir_id=? AND sess=0 AND del=0 AND id>? AND kind='msg' AND (vis='all' OR k=? OR to_k=?) ORDER BY id DESC LIMIT 80").bind(e.id, after, W.k, W.k),
      env.DB.prepare("SELECT * FROM efir_msg WHERE efir_id=? AND sess=0 AND del=0 AND kind='q' ORDER BY ans, votes DESC, id LIMIT 40").bind(e.id),
      env.DB.prepare("SELECT * FROM efir_ev WHERE id IN (SELECT MAX(id) FROM efir_ev WHERE efir_id=? AND sess=0 AND kind IN ('lead','lead_off','banner','banner_off','poll','poll_off','screen','screen_off') GROUP BY REPLACE(kind,'_off',''))").bind(e.id),
      env.DB.prepare("SELECT k, name, st, at FROM efir_hand WHERE efir_id=? AND st IN ('wait','stage') ORDER BY at").bind(e.id),
      env.DB.prepare('SELECT COUNT(*) n FROM efir_seen WHERE efir_id=? AND sess=0 AND last>?').bind(e.id, now - 9e4),
      env.DB.prepare('SELECT v.mid FROM efir_vote v JOIN efir_msg m ON m.id=v.mid WHERE m.efir_id=? AND v.k=?').bind(e.id, W.k)]);
    const V = new Set((vt.results || []).map(x => x.mid)), A = {}; for (const x of ev.results || []) A[x.kind] = Object.assign({ sec: x.sec, id: x.id }, efJ(x.data, {}));
    out.msgs = (ms.results || []).reverse().map(m => efMsgPub(m, W)); out.qs = (qs.results || []).map(m => Object.assign(efMsgPub(m, W), { voted: V.has(m.id) ? 1 : 0 }));
    out.lead = A.lead && cfg.lead && cfg.lead.title && !efNoSales(e) ? { title: A.lead.title || cfg.lead.title, sub: A.lead.sub || cfg.lead.sub || '', btn: A.lead.btn || cfg.lead.btn || 'Оставить заявку', timer: +(A.lead.timer || cfg.lead.timer) || 0, since: A.lead.sec, url: cfg.lead.url || null } : null;
    out.banner = A.banner ? { title: A.banner.title || '', sub: A.banner.sub || '', url: A.banner.url || null, btn: A.banner.btn || null } : null;
    out.screen = A.screen ? { mid: A.screen.mid, text: A.screen.text || '', name: A.screen.name || '' } : null;
    if (A.poll) { const pid = 'e' + A.poll.id, [mv, res] = await env.DB.batch([env.DB.prepare('SELECT opt FROM efir_pollv WHERE ev=? AND k=?').bind(pid, W.k), env.DB.prepare('SELECT opt, COUNT(*) n FROM efir_pollv WHERE ev=? GROUP BY opt').bind(pid)]);
      out.poll = { id: pid, q: A.poll.q || '', opts: A.poll.opts || [], my: (mv.results || [])[0] ? mv.results[0].opt : null, res: (mv.results || [])[0] ? (res.results || []) : null } }
    const H = hd.results || [], mine = H.findIndex(h => h.k === W.k && h.st === 'wait');
    out.hand = H.find(h => h.k === W.k) ? { st: H.find(h => h.k === W.k).st, pos: mine >= 0 ? H.filter(h => h.st === 'wait').findIndex(h => h.k === W.k) + 1 : 0 } : null;
    if (out.hand && out.hand.st === 'stage') out.hand.url = await efStageUrl(env, e, cfg);
    out.stage = H.filter(h => h.st === 'stage').map(h => h.name); out.hands = H.filter(h => h.st === 'wait').length; out.stage_on = !!cfg.stage;
    out.viewers = ((vr.results || [])[0] || {}).n || 0; return json(req, out) }
  if (W.ro) return json(req, { ok: false, err: 'Режим просмотра — только чтение' }, 403);
  const S = efState(e, now, reg), sessOf = () => e.kind === 'auto' ? S.sess : 0, secOf = async () => { const sn = await env.DB.prepare('SELECT t0 FROM efir_seen WHERE efir_id=? AND k=? AND sess=?').bind(e.id, W.k, sessOf()).first(); return Math.max(0, Math.floor((now - ((sn && sn.t0) || S.sess || e.at_live || e.start || now)) / 1000)) };
  /* сообщение в чат или вопрос ведущему. В автовебинаре сообщение видят только зритель и модераторы */
  if (path === '/efir/msg' && req.method === 'POST') { const text = bStr(o.text, 1000), kind = o.kind === 'q' ? 'q' : 'msg'; if (!text) return json(req, { ok: false, err: 'Пустое сообщение' }, 400);
    if (S.st !== 'live' && kind === 'msg') return json(req, { ok: false, err: 'Чат откроется, когда начнётся эфир' }, 400);
    const fl = await env.DB.prepare('SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND k=? AND at>?').bind(e.id, W.k, now - 6e4).first(); if (fl && fl.n >= 8) return json(req, { ok: false, err: 'Слишком часто — подожди минуту' }, 429);
    const stop = await efStop(env), vis = e.kind === 'auto' ? 'mod' : (!W.staff && /https?:\/\/|t\.me\//i.test(text)) || (stop.length && efSpam(text, stop) && !W.staff) ? 'mod' : 'all';
    const r = await env.DB.prepare('INSERT INTO efir_msg (efir_id, sess, k, uid, name, role, kind, text, sec, at, vis) VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING *').bind(e.id, sessOf(), W.k, W.uid || null, await efName(env, W), W.staff && efOwn(W, e) ? (W.adm || e.host_cid === W.cid ? 'host' : 'mod') : 'stu', kind, text, S.st === 'live' ? await secOf() : null, now, vis).first();
    let pts = 0; if (kind === 'q') { const nq = await env.DB.prepare("SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND k=? AND kind='q'").bind(e.id, W.k).first(); if (nq && nq.n <= EF_QMAX) pts = await efPts(env, W, e.id, 'q', nq.n) }
    return json(req, { ok: true, msg: efMsgPub(r, W), pts }) }
  if (path === '/efir/vote' && req.method === 'POST') { const m = await env.DB.prepare("SELECT id, k FROM efir_msg WHERE id=? AND efir_id=? AND kind='q' AND del=0").bind(+o.mid, e.id).first(); if (!m) return json(req, { ok: false, err: 'Вопрос не найден' }, 404);
    if (m.k === W.k) return json(req, { ok: false, err: 'За свой вопрос голосовать нельзя' }, 400);
    const on = o.on === 0 || o.on === '0' ? 0 : 1, r = on ? await env.DB.prepare('INSERT OR IGNORE INTO efir_vote (mid, k) VALUES (?,?)').bind(m.id, W.k).run() : await env.DB.prepare('DELETE FROM efir_vote WHERE mid=? AND k=?').bind(m.id, W.k).run();
    if (r.meta && r.meta.changes) await env.DB.prepare('UPDATE efir_msg SET votes=MAX(0, votes+?) WHERE id=?').bind(on ? 1 : -1, m.id).run(); return json(req, { ok: true, voted: on }) }
  /* «Поднять руку» — попроситься на сцену */
  if (path === '/efir/hand' && req.method === 'POST') { if (!efJ(e.cfg, {}).stage) return json(req, { ok: false, err: 'В этом эфире выход на сцену выключен' }, 400);
    if (o.on === 0 || o.on === '0') await env.DB.prepare("UPDATE efir_hand SET st='off', at=? WHERE efir_id=? AND k=? AND st='wait'").bind(now, e.id, W.k).run();
    else await env.DB.prepare("INSERT INTO efir_hand (efir_id, k, uid, name, st, at) VALUES (?,?,?,?, 'wait', ?) ON CONFLICT(efir_id, k) DO UPDATE SET st=CASE WHEN efir_hand.st='stage' THEN 'stage' ELSE 'wait' END, at=excluded.at").bind(e.id, W.k, W.uid || null, await efName(env, W), now).run();
    return json(req, { ok: true }) }
  /* «Прислать работу» на разбор: картинка/PDF (как в чате, до 650 КБ) + подпись; видит ведущий */
  /* 1.11 (Роман: «большие файлы — кнопкой в личку ведущему»): ученик жмёт «Отправить в Telegram» → работа в очереди с пометкой «в Telegram», ведущему — сообщение в бот */
  if (path === '/efir/work/tg' && req.method === 'POST') { if (W.me === 'guest' || !W.uid) return json(req, { ok: false, err: 'Работы на разбор присылают ученики' }, 403); if (efJ(e.cfg, {}).work === 0) return json(req, { ok: false, err: 'В этом эфире работы не разбирают' }, 400);
    const ht = await efHostTg(env, e); if (!ht.user) return json(req, { ok: false, err: 'У ведущего не подключён Telegram — загрузи работу сюда' }, 400);
    const had = await env.DB.prepare("SELECT id FROM efir_msg WHERE efir_id=? AND k=? AND kind='work' AND file_id IS NULL AND del=0 AND at>?").bind(e.id, W.k, now - 6 * 36e5).first();
    if (!had) { const n = await env.DB.prepare("SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND k=? AND kind='work' AND del=0").bind(e.id, W.k).first(); if (n && n.n >= 3) return json(req, { ok: false, err: 'На один эфир — до 3 работ' }, 400);
      const st = await env.DB.prepare('SELECT s.tg_chat, u.username FROM student s LEFT JOIN tg_user u ON u.chat=s.tg_chat WHERE s.uid=?').bind(W.uid).first() || {}, nm = await efName(env, W);
      await env.DB.prepare("INSERT INTO efir_msg (efir_id, sess, k, uid, name, role, kind, text, file_id, sec, at, vis) VALUES (?,0,?,?,?,'stu','work',?,NULL,NULL,?,'mod')").bind(e.id, W.k, W.uid, nm, 'tg:' + (st.username || ''), now).run();
      for (const c of ht.chats) await tgSend(env, c, '📨 <b>' + th(nm) + '</b> ' + nbt('пришлёт работу тебе в личку на разбор') + '\n' + nbt('Эфир «' + th(e.title) + '». Она уже в очереди «Работы на разбор» в пульте.'), st.username ? [[{ text: 'Открыть чат с учеником', url: 'https://t.me/' + st.username }]] : null);
      await logIt(env, 'efir-work-tg', W.uid, String(e.id)) }
    return json(req, { ok: true, url: 'https://t.me/' + ht.user }) }
  if (path === '/efir/work' && req.method === 'POST') { if (W.me === 'guest') return json(req, { ok: false, err: 'Работы на разбор присылают ученики' }, 403); if (efJ(e.cfg, {}).work === 0) return json(req, { ok: false, err: 'В этом эфире работы не разбирают' }, 400);
    if (S.st === 'done') return json(req, { ok: false, err: 'Эфир уже прошёл' }, 400);
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND k=? AND kind='work' AND del=0").bind(e.id, W.k).first(); if (n && n.n >= 3) return json(req, { ok: false, err: 'На один эфир — до 3 работ' }, 400);
    let fid = null; try { fid = await bankFile(env, W.uid, 'efir', e.id, o.file, 1800000) } catch (x) { return json(req, { ok: false, err: x.message }, 400) } if (!fid) return json(req, { ok: false, err: 'Прикрепи картинку или PDF' }, 400);
    const r = await env.DB.prepare("INSERT INTO efir_msg (efir_id, sess, k, uid, name, role, kind, text, file_id, sec, at, vis) VALUES (?,?,?,?,?,'stu','work',?,?,?,?,'mod') RETURNING id").bind(e.id, sessOf(), W.k, W.uid, await efName(env, W), bStr(o.text, 500), fid, S.st === 'live' ? await secOf() : null, now).first();
    const q = await env.DB.prepare("SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND kind='work' AND del=0 AND ans=0 AND id<=?").bind(e.id, r.id).first(); await logIt(env, 'efir-work', W.uid, e.id + ' ' + fid);
    return json(req, { ok: true, id: r.id, place: q ? q.n : 1 }) }
  if (path === '/efir/poll' && req.method === 'POST') { const pid = String(o.poll || ''), opt = +o.opt | 0; if (!/^(e\d+|s\d+:\d+)$/.test(pid)) return json(req, { ok: false, err: 'Опрос не найден' }, 404);
    await env.DB.prepare('INSERT OR REPLACE INTO efir_pollv (ev, k, sess, opt) VALUES (?,?,?,?)').bind(pid, W.k, sessOf(), opt).run(); return json(req, { ok: true, my: opt }) }
  /* заявка на обучение: в efir_lead и сообщением в бот (kv efir_leads {chats:[…]}; по умолчанию — всем админам из бота) */
  if (path === '/efir/lead' && req.method === 'POST') { if (efNoSales(e)) return json(req, { ok: false, err: 'В этом эфире заявок нет' }, 400);
    const dup = await env.DB.prepare('SELECT id FROM efir_lead WHERE efir_id=? AND k=? AND at>?').bind(e.id, W.k, now - 6 * 36e5).first(); if (dup) return json(req, { ok: true, id: dup.id, dup: 1 });
    const st = W.uid ? await env.DB.prepare('SELECT tg_chat FROM student WHERE uid=?').bind(W.uid).first() : null, chat = W.chat || (st && st.tg_chat) || null, tu = chat ? await env.DB.prepare('SELECT username, name FROM tg_user WHERE chat=?').bind(chat).first().catch(() => null) : null;
    const contact = bStr(o.contact, 120) || (tu && tu.username ? '@' + tu.username : ''), sec = S.st === 'live' ? await secOf() : null, nm = W.uid && !W.staff ? await stuName(env, W.uid) : await efName(env, W);
    const r = await env.DB.prepare('INSERT INTO efir_lead (efir_id, sess, k, uid, chat, name, contact, text, sec, at) VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(e.id, sessOf(), W.k, W.uid || null, chat, nm, contact, bStr(o.text, 500), sec, now).first();
    try { await efLeadNotify(env, e, { id: r.id, k: W.k, uid: W.uid, name: nm, contact, chat, text: bStr(o.text, 500), sec, sess: sessOf() }) } catch (x) { await logIt(env, 'efir-lead-tg-err', W.uid, String(x && x.message || x)) }
    return json(req, { ok: true, id: r.id }) }
  /* прогресс записи: {id, pos, dur} секунды; открыл запись и не был на эфире — +10 баллов (rec_done = баллы за запись получены) */
  if (path === '/efir/ping' && req.method === 'POST') { const pos = Math.max(0, +o.pos | 0), dur = Math.max(0, +o.dur | 0) || (e.dur || 60) * 60;
    const r = await env.DB.prepare('INSERT INTO efir_seen (efir_id, k, sess, first, last, rec_pos, rec_max) VALUES (?,?,-1,?,?,?,?) ON CONFLICT(efir_id, k, sess) DO UPDATE SET last=excluded.last, rec_pos=excluded.rec_pos, rec_max=MAX(efir_seen.rec_max, excluded.rec_max) RETURNING rec_max, rec_done').bind(e.id, W.k, now, now, pos, pos).first();
    let pts = 0; if (r && !r.rec_done) { const was = await env.DB.prepare('SELECT 1 x FROM efir_seen WHERE efir_id=? AND k=? AND sess>=0 AND min>=1').bind(e.id, W.k).first();
      if (!was) { await env.DB.prepare('UPDATE efir_seen SET rec_done=1 WHERE efir_id=? AND k=? AND sess=-1').bind(e.id, W.k).run(); pts = await efPts(env, W, e.id, 'rec', 0) } }
    return json(req, { ok: true, pts, done: r && (r.rec_done || pts) ? 1 : 0 }) }
  return json(req, { ok: false, err: 'not found' }, 404) }
/* куратор не продаёт: у эфиров кураторов кнопки заявки нет (решение №4) */
const efNoSales = e => !!(e.host_cid && e.host_cid !== 'admin');
async function efLeadNotify(env, e, L) { const cfg = (await kvGet(env, 'efir_leads')) || {}, chats = Array.isArray(cfg.chats) && cfg.chats.length ? cfg.chats : (await qAll(env.DB.prepare('SELECT chat FROM tg_admin'))).map(x => x.chat);
  const q = await qAll(env.DB.prepare("SELECT text FROM efir_msg WHERE efir_id=? AND k=? AND kind IN ('msg','q') AND del=0 ORDER BY id DESC LIMIT 2").bind(e.id, L.k)), sn = await env.DB.prepare('SELECT MAX(min) m FROM efir_seen WHERE efir_id=? AND k=?').bind(e.id, L.k).first();
  const t = '🔥 <b>Заявка с эфира</b>\n«' + th(e.title) + '»' + (e.kind === 'auto' && L.sess ? ' · сеанс ' + efWhen(L.sess) : '') + '\n\n<b>' + th(L.name) + '</b>' + (L.contact ? ' · ' + th(L.contact) : '') + (L.uid ? ' · ученик ' + L.uid : ' · не ученик') + (L.chat && !L.contact ? ' · <a href="tg://user?id=' + th(L.chat) + '">написать</a>' : '')
    + '\n' + nbt('Смотрел ' + ((sn && sn.m) || 0) + ' мин' + (L.sec != null ? ', заявка на ' + Math.floor(L.sec / 60) + '-й минуте' : '')) + (q.length ? '\nСпрашивал: ' + q.map(x => '«' + th(String(x.text).slice(0, 120)) + '»').join(', ') : '') + (L.text ? '\nКомментарий: ' + th(L.text) : '');
  for (const c of chats.slice(0, 5)) await tgSend(env, c, t, L.uid ? [[{ text: 'Профиль в GetCourse', url: SITE + '/user/control/user/update/id/' + L.uid }]] : null) }

/* ---------- эфиры: команда (админ — все, куратор — свои) ---------- */
/* 30.10 (Роман: «эфир одной кнопкой»; у кураторов свои компьютеры): у каждого ведущего своя повторяющаяся трансляция в Kinescope (Live API v2, docs.kinescope.com/api/live/events).
   Сервер и ключ потока ведущего не меняются: OBS настраивается один раз на его компьютере. Эфир берёт плеер и время из трансляции своего ведущего,
   эфир сам становится «в эфире», когда пошёл поток этого ведущего; «Завершить» закрывает поток, запись подтягивает крон (:05, efkin). Ошибки Kinescope эфиру не мешают.
   kv efir_kin:<ведущий> = {id, rtmp, key, play, at, warn}; ведущий — cid куратора или 'admin' (Роман). Ключ потока видят только владелец и админ. Без KINESCOPE_KEY — всё по-старому. */
const KIN_API = 'https://api.kinescope.io';
const kinErrTxt = s => s === 401 || s === 403 ? 'Kinescope не принял ключ — проверь секрет KINESCOPE_KEY в Cloudflare' : s === 404 ? 'Трансляция не найдена в Kinescope — нажми «Сменить ключ»' : s === 429 ? 'Kinescope просит подождать минуту — попробуй ещё раз' : !s ? 'Нет связи с Kinescope — попробуй ещё раз' : 'Kinescope ответил ошибкой ' + s + ' — попробуй ещё раз';
async function kinCall(env, method, path, body) { let r = null, j = null;
  try { r = await fetch(KIN_API + path, { method, headers: { Authorization: 'Bearer ' + env.KINESCOPE_KEY, 'Content-Type': 'application/json', Accept: 'application/json' }, body: body ? JSON.stringify(body) : undefined }) } catch (x) { r = null }
  try { j = r ? await r.json() : null } catch (x) { j = null }
  if (!r || !r.ok) { const st = r ? r.status : 0, m = j && (j.error && (j.error.message || j.error.detail || (typeof j.error === 'string' ? j.error : '')) || j.message) || '';
    await logIt(env, 'kin-err', 0, method + ' ' + path.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ':id') + ' ' + st + (m ? ' ' + String(m).slice(0, 160) : '')); return { ok: false, st, err: kinErrTxt(st) } }
  return { ok: true, data: j && j.data !== undefined ? j.data : j } }
const kinHost = cid => CURATORS.some(c => c.id === cid) ? cid : 'admin';
const kinHostName = h => h === 'admin' ? 'Роман Одуванов' : ((CURATORS.find(c => c.id === h) || {}).full || h);
const kinPub = (K, withKey) => K ? Object.assign({ id: K.id, play: K.play || null, rtmp: K.rtmp || null, at: K.at || null, warn: K.warn || null }, withKey ? { key: K.key || null } : {}) : null;
async function kinGet(env, host) { if (!env.KINESCOPE_KEY) return null; const h = kinHost(host); const K = await kvGet(env, 'efir_kin:' + h); return K || (h === 'admin' ? await kvGet(env, 'efir_kin') : null) }
const kinPut = (env, host, K) => kvPut(env, 'efir_kin:' + kinHost(host), K);
/* создать трансляцию ведущего (один раз; force — заново, новый ключ). Поля сверх name/type Kinescope может не знать — тогда повтор с минимальным телом */
async function kinSetup(env, host, force) { const h = kinHost(host), old = await kinGet(env, h); if (old && old.id && !force) return { ok: true, K: old, created: false };
  const base = { name: 'OduvanovSchool · эфиры · ' + kinHostName(h), type: 'recurring' }, folder = await kvGet(env, 'efir_kin_folder');
  const full = Object.assign({}, base, { auto_start: true, chat_active: false }, folder ? { record: { parent_id: String(folder) } } : {});
  let r = await kinCall(env, 'POST', '/v2/live/events', full); if (!r.ok && (r.st === 400 || r.st === 422)) r = await kinCall(env, 'POST', '/v2/live/events', base);
  if (!r.ok) return r; const d = r.data || {};
  if (!d.id || !d.streamkey) { await logIt(env, 'kin-err', 0, 'setup ' + h + ': нет id/streamkey в ответе'); return { ok: false, err: 'Kinescope не вернул ключ трансляции — напиши разработчику' } }
  const K = { id: String(d.id), key: String(d.streamkey), rtmp: String(d.rtmp_link || 'rtmp://rtmp.kinescope.io/live'), play: d.play_link ? String(d.play_link) : 'https://kinescope.io/' + d.id, at: msNow(), warn: null };
  await kinPut(env, h, K); await kinCall(env, 'PUT', '/v2/live/events/' + K.id + '/enable'); await logIt(env, 'kin-setup', 0, h + ' ' + K.id); return { ok: true, K, created: true } }
/* время ближайшего эфира ведущего в Kinescope: новый поток события, если не вышло — перенос существующего */
async function kinSchedule(env, K, start) { if (!K || !start) return null; const at = new Date(start).toISOString();
  let r = await kinCall(env, 'POST', '/v2/live/events/' + K.id + '/stream', { started_at: at }); if (!r.ok && r.st && r.st !== 401 && r.st !== 403) r = await kinCall(env, 'PUT', '/v2/live/events/' + K.id + '/stream', { started_at: at });
  return r.ok ? null : 'Время в Kinescope не обновилось (' + r.err + '). Эфир от этого не зависит — запусти трансляцию в OBS как обычно.' }
const kinIsMine = (K, e) => { const v = efVideo(efJ(e.video, null) || e.video), kv = K && efVideo({ url: K.play }); return !!(v && kv && v.id === kv.id) };
/* идёт ли поток трансляции прямо сейчас (кэш 20 с на трансляцию в памяти воркера) */
let KIN_LIVE = {};
async function kinLiveNow(env, K) { if (!K || !K.id) return null; const c = KIN_LIVE[K.id]; if (c && msNow() - c.t < 2e4) return c.v; const z = KIN_LIVE[K.id] = { t: msNow(), v: null };
  const r = await kinCall(env, 'GET', '/v2/live/events/' + K.id); if (!r.ok) return null;
  const d = r.data || {}, st = String((d.stream && d.stream.status) || d.status || '').toLowerCase(); return (z.v = /^(live|active|online|streaming|started|running|on_air)$/.test(st) ? true : st ? false : null) }
/* поток ведущего пошёл — его запланированный эфир с этим плеером (поток за 30 мин до начала … час после) сам становится «в эфире». Ведущие не мешают друг другу */
async function kinAutoLive(env, now) { const L = await qAll(env.DB.prepare("SELECT * FROM efir WHERE del=0 AND kind!='auto' AND status='plan' AND start BETWEEN ? AND ? ORDER BY start").bind(now - 36e5, now + 18e5)); if (!L.length) return 0;
  let n = 0; const done = {}; for (const e of L) { const h = kinHost(e.host_cid); if (done[h]) continue; const K = await kinGet(env, h); if (!K || !K.id || !kinIsMine(K, e)) continue;
    if ((await kinLiveNow(env, K)) !== true) continue; done[h] = 1;
    await env.DB.prepare("UPDATE efir SET status='live', at_live=COALESCE(at_live, ?), upd=? WHERE id=? AND status='plan'").bind(now, now, e.id).run(); await logIt(env, 'efir-start-kin', 0, e.id + ' ' + h); n++ }
  return n }
/* крон: запись эфира из трансляции его ведущего в «Записи» (закончились за 7 дней, записи ещё нет) */
async function kinRecJob(env, B) { if (!env.KINESCOPE_KEY) return { skip: 'nokey' }; const now = msNow();
  const L = await qAll(env.DB.prepare("SELECT * FROM efir WHERE del=0 AND kind!='auto' AND status IN ('done','rec') AND (rec IS NULL OR rec='' OR rec='null') AND at_end>? ORDER BY at_end DESC LIMIT 8").bind(now - 7 * 864e5)); if (!L.length) return { n: 0 };
  let n = 0; const VV = {}; for (const e of L) { const h = kinHost(e.host_cid), K = await kinGet(env, h); if (!K || !K.id || !kinIsMine(K, e)) continue;
    if (!VV[K.id]) { const r = await kinCall(env, 'GET', '/v2/live/events/' + K.id + '/videos'); VV[K.id] = r.ok ? (Array.isArray(r.data) ? r.data : (r.data && (r.data.items || r.data.videos)) || []).map(v => ({ id: v.id, at: Date.parse(v.created_at || v.started_at || '') || 0, st: String(v.status || '').toLowerCase(), dur: +v.duration || 0 })).filter(v => v.id) : [] }
    const t0 = (e.at_live || e.start || 0) - 15 * 6e4, t1 = (e.at_end || now) + 30 * 6e4;
    const v = VV[K.id].filter(x => x.at >= t0 && x.at <= t1 && (!x.st || /done|ready|processed|uploaded/.test(x.st))).sort((a, b) => b.dur - a.dur)[0]; if (!v) continue;
    const rv = efVideo({ id: String(v.id), provider: 'kinescope' }); if (!rv) continue;
    await env.DB.prepare('UPDATE efir SET rec=?, upd=? WHERE id=?').bind(JSON.stringify(rv), now, e.id).run(); await logIt(env, 'efir-rec-kin', 0, e.id + ' ' + v.id); n++ }
  return { n } }
async function efirHostApi(env, req, path, u, o, W, now) { if (!W.s) return json(req, { ok: false, err: 'Только для команды школы' }, 403);
  if (path === '/efir/host/cover' && req.method === 'POST') { const m = String(o.data || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/); if (!m) return json(req, { ok: false, err: 'Нужна картинка JPG, PNG или WebP' }, 400);
    if (m[2].length > 1400000) return json(req, { ok: false, err: 'Картинка слишком большая — до 1 МБ' }, 400);
    const r = await env.DB.prepare('INSERT INTO efir_cover (mime, data, by_uid, at) VALUES (?,?,?,?) RETURNING id').bind(m[1], m[2], W.uid || 0, now).first();
    return json(req, { ok: true, id: r.id, url: new URL(req.url).origin + '/efir/cover?id=' + r.id }) }
  /* Kinescope: без ключа работает по ID/ссылке плеера; с секретом KINESCOPE_KEY — список видео (GET https://api.kinescope.io/v1/videos, документация docs.kinescope.com/api) */
  /* 1.11: разбор, почему запись не подтянулась (только админ; ключей не отдаём) */
  if (path === '/efir/kin/recdbg') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); const e = await env.DB.prepare('SELECT * FROM efir WHERE id=?').bind(+u.searchParams.get('id')).first(); if (!e) return json(req, { ok: false, err: 'нет эфира' });
    const K = await kinGet(env, kinHost(e.host_cid)), r = K && K.id ? await kinCall(env, 'GET', '/v2/live/events/' + K.id + '/videos') : null;
    const raw = r && r.ok ? (Array.isArray(r.data) ? r.data : (r.data && (r.data.items || r.data.videos)) || []) : null;
    return json(req, { ok: true, has_k: !!(K && K.id), mine: kinIsMine(K, e), rec_db: e.rec || null, at_live: e.at_live, at_end: e.at_end, api: r ? (r.ok ? 'ok' : r.st + ' ' + r.err) : null, raw_keys: r && r.data && !Array.isArray(r.data) ? Object.keys(r.data).slice(0, 12) : null,
      videos: raw ? raw.slice(0, 10).map(v => ({ id: v.id, created_at: v.created_at, started_at: v.started_at, status: v.status, duration: v.duration, keys: Object.keys(v).slice(0, 20) })) : null,
      event: await (async () => { if (!K || !K.id) return null; const x = await kinCall(env, 'GET', '/v2/live/events/' + K.id); if (!x.ok) return x.st; const d = x.data || {}, o = {}; for (const k of Object.keys(d)) { if (/key|token|secret|rtmp|url/i.test(k)) continue; const v = d[k]; o[k] = v && typeof v === 'object' ? JSON.stringify(v).replace(/"(stream_?key|key|token)":"[^"]*"/gi, '"$1":"…"').slice(0, 300) : v } return o })(),
      recent: await (async () => { const x = await kinCall(env, 'GET', '/v1/videos?per_page=8&order=created_at.desc'); if (!x.ok) return x.st; return (Array.isArray(x.data) ? x.data : []).map(v => ({ id: v.id, title: v.title, created_at: v.created_at, status: v.status, duration: v.duration, parent: v.parent_id || v.folder_id || null, live: v.live_event_id || v.event_id || null })) })() }) }
  if (path === '/efir/kin/videos') { if (!env.KINESCOPE_KEY) return json(req, { ok: false, nokey: 1, err: 'Ключ Kinescope не подключён — вставь ID или ссылку видео из Kinescope' });
    const q = bStr(u.searchParams.get('q'), 60).toLowerCase(), r = await fetch('https://api.kinescope.io/v1/videos?per_page=100&page=' + Math.max(1, +u.searchParams.get('page') || 1), { headers: { Authorization: 'Bearer ' + env.KINESCOPE_KEY } });
    if (!r.ok) { await logIt(env, 'kin-err', 0, 'videos ' + r.status); return json(req, { ok: false, err: 'Kinescope ответил ' + r.status + (r.status === 401 ? ' — проверь ключ' : '') }) }
    const j = await r.json().catch(() => ({})), L = (j.data || j.items || []).map(v => ({ id: v.id, title: v.title || '', dur: Math.round(+v.duration || 0), poster: v.poster && (v.poster.md || v.poster.original || v.poster.sm || (typeof v.poster === 'string' ? v.poster : null)) || null, link: v.play_link || null, at: v.created_at || null, status: v.status || null }));
    return json(req, { ok: true, videos: q ? L.filter(v => v.title.toLowerCase().includes(q)) : L, meta: j.meta || null }) }
  /* TODO: создание трансляции через API Kinescope — эндпоинт live-событий в открытой документации не найден (30.10); пока трансляция создаётся в кабинете Kinescope, в эфир вставляется её ID/ссылка */
  /* трансляция ведущего: GET — своя (админ: ?host=… любая, ?all=1 — список ведущих без ключей), POST {host?, force} — создать свою (админ — любую); force — заново, новый ключ */
  /* 31.10: проверка, доступен ли Kinescope Speak по ключу (только админ; ключ и ссылки не отдаём) */
  if (path === '/efir/speak/probe') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); if (!env.KINESCOPE_KEY) return json(req, { ok: false, nokey: 1 });
    let r = null, j = null; try { r = await fetch(KIN_API + (/^\/v[12]\/speak[\/a-z_-]*$/.test(u.searchParams.get('p') || '') ? u.searchParams.get('p') : '/v1/speak/rooms') + '?per_page=5', { headers: { Authorization: 'Bearer ' + env.KINESCOPE_KEY, Accept: 'application/json' } }); j = await r.json() } catch (x) {}
    return json(req, { ok: !!(r && r.ok), st: r ? r.status : 0, n: j && Array.isArray(j.data) ? j.data.length : null, types: j && Array.isArray(j.data) ? j.data.map(x => [x.type, x.status, !!x.owner_id]) : null, err: j && !(r && r.ok) ? String((j.error && (j.error.message || j.error.detail)) || j.message || '').slice(0, 200) : null, keys: j && j.data && !Array.isArray(j.data) ? Object.keys(j.data).slice(0, 20) : null }) }
  if (path === '/efir/kin/setup' || path === '/efir/kin/live') { if (!env.KINESCOPE_KEY) return json(req, { ok: false, nokey: 1, err: 'Kinescope не подключён: нужен секрет KINESCOPE_KEY в Cloudflare' });
    const mine = W.adm ? 'admin' : W.cid, want = bStr(o.host || u.searchParams.get('host') || '', 40) || mine; if (!mine) return json(req, { ok: false, err: 'Только для ведущих эфиров' }, 403);
    const h = kinHost(want); if (!W.adm && h !== kinHost(mine)) return json(req, { ok: false, err: 'Это трансляция другого ведущего' }, 403);
    if (req.method !== 'POST') { if (W.adm && u.searchParams.get('all')) { const out = []; for (const x of ['admin'].concat(CURATORS.map(c => c.id))) { const K = await kinGet(env, x); out.push({ host: x, name: kinHostName(x), ready: !!(K && K.id), live: K && K.id ? await kinLiveNow(env, K) : null, warn: K && K.warn || null, kin: kinPub(K, false) }) }
        return json(req, { ok: true, hosts: out }, 200, { 'Cache-Control': 'no-store' }) }
      const K = await kinGet(env, h); return json(req, { ok: true, host: h, name: kinHostName(h), ready: !!(K && K.id), kin: kinPub(K, true), live: K && K.id ? await kinLiveNow(env, K) : null }, 200, { 'Cache-Control': 'no-store' }) }
    const r = await kinSetup(env, h, !!o.force); if (!r.ok) return json(req, { ok: false, err: r.err }, 502);
    return json(req, { ok: true, host: h, ready: true, created: r.created, kin: kinPub(r.K, true) }, 200, { 'Cache-Control': 'no-store' }) }
  const id = +(o.id || u.searchParams.get('id') || 0);
  if (path === '/efir/host/list') { const L = await qAll(W.adm ? env.DB.prepare('SELECT * FROM efir WHERE del=0 ORDER BY start DESC LIMIT 200') : env.DB.prepare('SELECT * FROM efir WHERE del=0 AND host_cid=? ORDER BY start DESC LIMIT 200').bind(W.cid));
    const ids = L.map(e => e.id), C = {}; if (ids.length) { const ph = ids.map(() => '?').join(','), [rg, sn, ld] = await env.DB.batch([env.DB.prepare('SELECT efir_id, COUNT(*) n FROM efir_reg WHERE efir_id IN (' + ph + ') GROUP BY efir_id').bind(...ids), env.DB.prepare('SELECT efir_id, COUNT(DISTINCT k) n, SUM(CASE WHEN last>? AND sess>=0 THEN 1 ELSE 0 END) live FROM efir_seen WHERE efir_id IN (' + ph + ') GROUP BY efir_id').bind(now - 9e4, ...ids), env.DB.prepare('SELECT efir_id, COUNT(*) n FROM efir_lead WHERE efir_id IN (' + ph + ') GROUP BY efir_id').bind(...ids)]);
      for (const x of rg.results || []) (C[x.efir_id] = C[x.efir_id] || {}).reg = x.n; for (const x of sn.results || []) Object.assign(C[x.efir_id] = C[x.efir_id] || {}, { came: x.n, now: x.live }); for (const x of ld.results || []) (C[x.efir_id] = C[x.efir_id] || {}).leads = x.n }
    const sc = W.adm ? await qAll(env.DB.prepare('SELECT id, src_id, ver, title, at, note FROM efir_scen ORDER BY id DESC LIMIT 60')) : [];
    const KL = await kinGet(env, W.adm ? 'admin' : W.cid);
    return json(req, { ok: true, now, role: W.me, cid: W.cid, kin: !!env.KINESCOPE_KEY, kin_ready: !!(KL && KL.id), kin_warn: KL && KL.warn || null, kin_live: KL && KL.id ? await kinLiveNow(env, KL) : null, efirs: L.map(e => Object.assign(efPub(e, now, { full: true }), { cfg: efEditCfg(e), counts: C[e.id] || {} })), scen: sc, leads_cfg: W.adm ? ((await kvGet(env, 'efir_leads')) || {}) : null, curators: CURATORS.map(c => ({ cid: c.id, name: c.full })) }) }
  if (path === '/efir/host/save' && req.method === 'POST') { const old = id ? await efGet(env, id) : null; if (id && !old) return json(req, { ok: false, err: 'Эфир не найден' }, 404); if (old && !efOwn(W, old)) return json(req, { ok: false, err: 'Это эфир другого ведущего' }, 403);
    const title = bStr(o.title, 140); if (!title) return json(req, { ok: false, err: 'Напиши тему эфира' }, 400);
    let kind = EF_KINDS.includes(o.kind) ? o.kind : 'live', acc = EF_ACC.includes(o.access) ? o.access : 'all';
    if (!W.adm) { if (kind !== 'live') return json(req, { ok: false, err: 'Открытые эфиры и автовебинары создаёт Роман' }, 403); acc = 'cur' }
    if (kind === 'open') acc = 'open';
    let start = +o.start || 0; if (!start && /^\d{4}-\d{2}-\d{2}$/.test(o.day || '') && /^\d{1,2}:\d{2}$/.test(o.time || '')) start = Date.parse(o.day + 'T' + o.time.padStart(5, '0') + ':00+03:00');
    if (kind !== 'auto' && !(start > 0)) return json(req, { ok: false, err: 'Укажи дату и время (МСК)' }, 400);
    const c0 = old ? efJ(old.cfg, {}) : {}, ci = o.cfg || {}, cfg = Object.assign({}, c0, { stage: ci.stage ? 1 : 0, stage_url: /^https:\/\//.test(ci.stage_url || '') ? bStr(ci.stage_url, 300) : null, work: ci.work === 0 ? 0 : 1, label: ci.label ? 1 : 0 });
    cfg.lead = W.adm && ci.lead && bStr(ci.lead.title, 100) ? { on: 1, title: bStr(ci.lead.title, 100), sub: bStr(ci.lead.sub, 160), btn: bStr(ci.lead.btn, 40) || 'Оставить заявку', timer: Math.min(180, Math.max(0, +ci.lead.timer | 0)), url: /^https:\/\//.test(ci.lead.url || '') ? bStr(ci.lead.url, 400) : null, min: ci.lead.min != null && ci.lead.min !== '' ? Math.max(0, +ci.lead.min | 0) : null } : null;
    if (kind === 'auto') { const sd = ci.sched || {}; cfg.sched = { days: (Array.isArray(sd.days) ? sd.days : []).map(Number).filter(x => x >= 0 && x <= 6), times: (Array.isArray(sd.times) ? sd.times : String(sd.times || '').split(/[\s,;]+/)).filter(t => /^\d{1,2}:\d{2}$/.test(t)).slice(0, 6), every: Math.max(0, +sd.every | 0), after: Math.max(0, +sd.after | 0) };
      if (ci.scen != null) { const sc = +ci.scen ? await env.DB.prepare('SELECT id, src_id FROM efir_scen WHERE id=?').bind(+ci.scen).first() : null; cfg.scen = sc ? sc.id : null; if (sc && sc.src_id) { const src = await efGet(env, sc.src_id); if (src) cfg.orig_at = src.at_live || src.start } } }
    const hostK = W.adm ? (CURATORS.find(c => c.id === o.host) ? o.host : 'admin') : W.cid;
    const K0 = kind !== 'auto' ? await kinGet(env, hostK) : null, vIn = efVideo(o.video), oldV = old ? efVideo(efJ(old.video, null) || old.video) : null, Kold = old && oldV ? await kinGet(env, old.host_cid) : null;
    /* Kinescope подключён и ссылку не вписали (или стоял плеер трансляции прежнего ведущего) — ставится плеер трансляции ведущего этого эфира; сменили ведущего — плеер переезжает */
    const oldIsKin = !!(old && Kold && kinIsMine(Kold, old)), sameAsOld = vIn && oldV && vIn.id && vIn.id === oldV.id;
    const v = (vIn && !(oldIsKin && sameAsOld)) ? vIn : (K0 && K0.play && (!oldV || oldIsKin) ? efVideo({ url: K0.play }) : (oldIsKin ? null : vIn)), rv = efVideo(o.rec), ch = (Array.isArray(o.chapters) ? o.chapters : []).map(x => ({ t: Math.max(0, +x.t | 0), title: bStr(x.title, 120) })).filter(x => x.title).sort((a, b) => a.t - b.t).slice(0, 60);
    const host = W.adm ? (CURATORS.find(c => c.id === o.host) ? o.host : 'admin') : W.cid, hc = CURATORS.find(c => c.id === host), cover = /^https:\/\/[^\s"'<>]+$/.test(o.cover || '') ? bStr(o.cover, 400) : null;
    const status = ['draft', 'plan'].includes(o.status) ? o.status : (old ? old.status : 'plan'), dur = Math.min(600, Math.max(10, +o.dur | 0 || 60));
    const vals = [title, bStr(o.about, 1000), host, hc ? hc.uid : efAdminUid(env), hc ? hc.full : 'Роман Одуванов', start || null, dur, kind, acc, old && ['live', 'done', 'rec'].includes(old.status) && ['draft', 'plan'].includes(status) && !o.reopen ? old.status : status, v ? JSON.stringify(v) : null, rv ? JSON.stringify(rv) : null, cover, JSON.stringify(ch), JSON.stringify(cfg), now];
    let nid = id; if (old) await env.DB.prepare('UPDATE efir SET title=?, about=?, host_cid=?, host_uid=?, host_name=?, start=?, dur=?, kind=?, tariff=?, status=?, video=?, rec=?, cover=?, chapters=?, cfg=?, upd=? WHERE id=?').bind(...vals, id).run();
    else nid = (await env.DB.prepare('INSERT INTO efir (title, about, host_cid, host_uid, host_name, start, dur, kind, tariff, status, video, rec, cover, chapters, cfg, upd, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(...vals, now).first()).id;
    if (old && old.start !== start) await env.DB.prepare("UPDATE efir_reg SET rem='' WHERE efir_id=? AND sess=0").bind(id).run();
    let kin_warn = null; if (K0 && K0.id && v && kind !== 'auto' && start > now && (!old || old.start !== start || !old.video || kinHost(old.host_cid) !== kinHost(hostK))) { const nx = await env.DB.prepare("SELECT id FROM efir WHERE del=0 AND kind!='auto' AND status IN ('plan','draft') AND start>? AND host_cid=? ORDER BY start LIMIT 1").bind(now, host).first();
      if (nx && nx.id === nid && efVideo({ url: K0.play }).id === v.id) kin_warn = await kinSchedule(env, K0, start) }
    await logIt(env, 'efir-save', W.uid, nid + ' ' + kind + ' ' + (W.cid || 'admin')); return json(req, Object.assign({ ok: true, id: nid }, kin_warn ? { kin_warn } : {})) }
  const e = await efGet(env, id); if (!e) return json(req, { ok: false, err: 'Эфир не найден' }, 404); if (!efOwn(W, e)) return json(req, { ok: false, err: 'Это эфир другого ведущего' }, 403);
  const cfg = efJ(e.cfg, {}), S = efState(e, now), sess = e.kind === 'auto' ? +(o.sess || u.searchParams.get('sess') || S.sess || 0) : 0, sec = Math.max(0, Math.floor((now - (e.kind === 'auto' ? sess : (e.at_live || e.start || now))) / 1000));
  if (path === '/efir/host/del' && req.method === 'POST') { await env.DB.prepare('UPDATE efir SET del=1, upd=? WHERE id=?').bind(now, e.id).run(); await logIt(env, 'efir-del', W.uid, e.id); return json(req, { ok: true }) }
  /* пульт ведущего: старт/конец, кнопка заявки, баннер, опрос, «на экран». Каждое событие — с секундой (для сценария) */
  if (path === '/efir/host/state' && req.method === 'POST') { const act = String(o.act || ''), d = o.data || {}, q = [];
    if (act === 'start') { if (e.kind === 'auto') return json(req, { ok: false, err: 'Автовебинар идёт по расписанию' }, 400); q.push(env.DB.prepare("UPDATE efir SET status='live', at_live=COALESCE(at_live, ?), upd=? WHERE id=?").bind(now, now, e.id)) }
    else if (act === 'end') q.push(env.DB.prepare("UPDATE efir SET status='done', at_end=?, upd=? WHERE id=?").bind(now, now, e.id), env.DB.prepare("UPDATE efir_hand SET st='done' WHERE efir_id=? AND st IN ('wait','stage')").bind(e.id));
    else if (/^(lead|banner|poll|screen)(_off)?$/.test(act)) { if (/^lead/.test(act) && efNoSales(e)) return json(req, { ok: false, err: 'В эфирах кураторов заявок нет' }, 400);
      const data = act === 'lead' ? { title: bStr(d.title || (cfg.lead || {}).title, 100), sub: bStr(d.sub || (cfg.lead || {}).sub, 160), btn: bStr(d.btn || (cfg.lead || {}).btn, 40), timer: Math.min(180, +(d.timer != null ? d.timer : (cfg.lead || {}).timer) | 0) }
        : act === 'banner' ? { title: bStr(d.title, 100), sub: bStr(d.sub, 160), url: /^https:\/\//.test(d.url || '') ? bStr(d.url, 400) : null, btn: bStr(d.btn, 40) || null }
        : act === 'poll' ? { q: bStr(d.q, 200), opts: (Array.isArray(d.opts) ? d.opts : String(d.opts || '').split('/')).map(x => bStr(x, 60)).filter(Boolean).slice(0, 6) }
        : act === 'screen' ? { mid: +d.mid || null, text: bStr(d.text, 400), name: bStr(d.name, 60) } : {};
      if (act === 'lead' && !data.title) return json(req, { ok: false, err: 'Заполни заявку в настройках эфира' }, 400); if (act === 'poll' && (!data.q || data.opts.length < 2)) return json(req, { ok: false, err: 'Вопрос и хотя бы 2 варианта через /' }, 400);
      q.push(env.DB.prepare('INSERT INTO efir_ev (efir_id, sess, sec, kind, data, at) VALUES (?,?,?,?,?,?)').bind(e.id, sess, sec, act, JSON.stringify(data), now)) }
    else return json(req, { ok: false, err: 'Неизвестное действие' }, 400);
    await env.DB.batch(q); await logIt(env, 'efir-' + act, W.uid, e.id + ' ' + sec);
    /* трансляция школы: «Начать» — включить приём потока; «Завершить» — закрыть поток (запись подтянет крон) и снова включить событие для следующего эфира */
    let kin_warn = null; if ((act === 'start' || act === 'end') && env.KINESCOPE_KEY) { const K = await kinGet(env, e.host_cid); if (K && K.id && kinIsMine(K, e)) {
      if (act === 'start') { const r = await kinCall(env, 'PUT', '/v2/live/events/' + K.id + '/enable'); if (!r.ok && r.st !== 400 && r.st !== 409 && r.st !== 422) kin_warn = r.err }
      else { const r = await kinCall(env, 'PUT', '/v2/live/events/' + K.id + '/complete'), r2 = await kinCall(env, 'PUT', '/v2/live/events/' + K.id + '/enable');
        if (!r2.ok && r2.st !== 400 && r2.st !== 409 && r2.st !== 422) { K.warn = 'После эфира трансляция не включилась обратно — проверь её в Kinescope перед следующим эфиром'; await kinPut(env, e.host_cid, K); kin_warn = K.warn } else if (K.warn) { K.warn = null; await kinPut(env, e.host_cid, K) }
        if (!r.ok && r.st && r.st !== 400 && r.st !== 409 && r.st !== 422) kin_warn = kin_warn || 'Kinescope: ' + r.err; delete KIN_LIVE[K.id] } } }
    return json(req, Object.assign({ ok: true, sec }, kin_warn ? { kin_warn } : {})) }
  /* пульт: всё, что видит ведущий (включая сообщения «видят модераторы», работы, руки, заявки) */
  if (path === '/efir/host/room') { const after = +u.searchParams.get('after') || 0, [ms, qs, hd, wk, ld, vr, rg, ev] = await env.DB.batch([
      env.DB.prepare("SELECT * FROM efir_msg WHERE efir_id=? AND (sess=? OR ?=-1) AND del=0 AND id>? AND kind='msg' ORDER BY id DESC LIMIT 120").bind(e.id, sess, e.kind === 'auto' && !sess ? -1 : 0, after),
      env.DB.prepare("SELECT * FROM efir_msg WHERE efir_id=? AND del=0 AND kind='q' ORDER BY ans, votes DESC, id LIMIT 60").bind(e.id),
      env.DB.prepare("SELECT k, uid, name, st, at FROM efir_hand WHERE efir_id=? AND st IN ('wait','stage') ORDER BY at").bind(e.id),
      env.DB.prepare("SELECT m.id, m.k, m.name, m.text, m.file_id, m.at, m.ans, f.mime FROM efir_msg m LEFT JOIN bank_file f ON f.id=m.file_id WHERE m.efir_id=? AND m.kind='work' AND m.del=0 ORDER BY m.ans, m.id LIMIT 60").bind(e.id),
      env.DB.prepare('SELECT id, name, contact, sec, at, st FROM efir_lead WHERE efir_id=? ORDER BY id DESC LIMIT 50').bind(e.id),
      env.DB.prepare('SELECT COUNT(*) n FROM efir_seen WHERE efir_id=? AND last>? AND sess>=0').bind(e.id, now - 9e4),
      env.DB.prepare('SELECT COUNT(*) n FROM efir_reg WHERE efir_id=?').bind(e.id),
      env.DB.prepare("SELECT * FROM efir_ev WHERE id IN (SELECT MAX(id) FROM efir_ev WHERE efir_id=? AND sess=? AND kind IN ('lead','lead_off','banner','banner_off','poll','poll_off','screen','screen_off') GROUP BY REPLACE(kind,'_off',''))").bind(e.id, sess)]);
    const A = {}; for (const x of ev.results || []) A[x.kind] = Object.assign({ sec: x.sec, at: x.at, id: x.id }, efJ(x.data, {}));
    const n = ((vr.results || [])[0] || {}).n || 0; if (S.st === 'live' && e.kind !== 'auto') { const lv = await env.DB.prepare("SELECT MAX(sec) s FROM efir_ev WHERE efir_id=? AND kind='vc'").bind(e.id).first(); if (!lv || lv.s == null || sec - lv.s >= 60) await env.DB.prepare("INSERT INTO efir_ev (efir_id, sess, sec, kind, data, at) VALUES (?,0,?,'vc',?,?)").bind(e.id, sec, JSON.stringify({ n }), now).run() }
    let poll = null; if (A.poll) { const r = await qAll(env.DB.prepare('SELECT opt, COUNT(*) n FROM efir_pollv WHERE ev=? GROUP BY opt').bind('e' + A.poll.id)); poll = Object.assign({}, A.poll, { res: r }) }
    return json(req, { ok: true, now, sec, state: S.st, status: e.status, sess, efir: efPub(e, now, { full: true }), msgs: (ms.results || []).reverse().map(m => Object.assign(efMsgPub(m), { k: m.k })), qs: (qs.results || []).map(m => Object.assign(efMsgPub(m), { k: m.k })),
      hands: (hd.results || []).map(h => ({ k: h.k, name: h.name, st: h.st, at: h.at })), works: (wk.results || []).map(w => ({ id: w.id, name: w.name, text: w.text || '', file: w.file_id, mime: w.mime || null, at: w.at, ans: w.ans })), leads: ld.results || [], viewers: n, regs: ((rg.results || [])[0] || {}).n || 0,
      lead: A.lead || null, banner: A.banner || null, poll, screen: A.screen || null, no_sales: efNoSales(e), stage_url: cfg.stage ? await efStageUrl(env, e, cfg) : null }) }
  /* сообщение ведущего/модератора: всем (в автовебинаре — всем зрителям сеанса) или лично (to — id сообщения зрителя) */
  if (path === '/efir/host/msg' && req.method === 'POST') { const text = bStr(o.text, 1000); if (!text) return json(req, { ok: false, err: 'Пустое сообщение' }, 400);
    const to = +o.to ? await env.DB.prepare('SELECT id, k, sess, sec FROM efir_msg WHERE id=? AND efir_id=?').bind(+o.to, e.id).first() : null, ss = to ? to.sess : sess, personal = !!(to && !o.all);
    const r = await env.DB.prepare('INSERT INTO efir_msg (efir_id, sess, k, uid, name, role, kind, text, sec, at, vis, to_k, reply_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *').bind(e.id, ss, W.k, W.uid, e.kind === 'auto' ? 'Модератор' : await efName(env, W), W.adm || e.host_cid === W.cid ? 'host' : 'mod', 'msg', text, to && to.sec != null ? to.sec + 1 : sec, now, personal ? 'mod' : 'all', personal ? to.k : null, to ? to.id : null).first();
    if (to) await env.DB.prepare('UPDATE efir_msg SET ans=1 WHERE id=?').bind(to.id).run();
    let added = 0; if (o.scen && W.adm && cfg.scen && to) { added = await efScenAdd(env, cfg.scen, { sec: (to.sec || 0) + 20, t: 'msg', role: 'mod', name: 'Модератор', text }) }
    return json(req, { ok: true, msg: efMsgPub(r), scen: added }) }
  if (path === '/efir/host/q' && req.method === 'POST') { const m = await env.DB.prepare('SELECT * FROM efir_msg WHERE id=? AND efir_id=?').bind(+o.mid, e.id).first(); if (!m) return json(req, { ok: false, err: 'Сообщение не найдено' }, 404);
    /* 31.10 (Роман: «вопрос на экране не уходит после Ответил/Удалить»): снимаем с экрана, если там этот вопрос */
    if (o.act === 'del' || o.act === 'unscreen' || (o.act === 'ans' && o.on !== 0)) { const sc = await env.DB.prepare("SELECT kind, data FROM efir_ev WHERE efir_id=? AND sess=? AND kind IN ('screen','screen_off') ORDER BY id DESC LIMIT 1").bind(e.id, m.sess || 0).first();
      if (sc && sc.kind === 'screen' && +(efJ(sc.data, {}).mid) === m.id) await env.DB.prepare("INSERT INTO efir_ev (efir_id, sess, sec, kind, data, at) VALUES (?,?,?,'screen_off','{}',?)").bind(e.id, m.sess || 0, sec, now).run() }
    if (o.act === 'unscreen') {}
    else if (o.act === 'del') await env.DB.prepare('UPDATE efir_msg SET del=1 WHERE id=?').bind(m.id).run();
    else if (o.act === 'ans') await env.DB.prepare('UPDATE efir_msg SET ans=? WHERE id=?').bind(o.on === 0 ? 0 : 1, m.id).run();
    else if (o.act === 'show') await env.DB.prepare("UPDATE efir_msg SET vis='all' WHERE id=?").bind(m.id).run();
    else if (o.act === 'screen') await env.DB.batch([env.DB.prepare('INSERT INTO efir_ev (efir_id, sess, sec, kind, data, at) VALUES (?,?,?,?,?,?)').bind(e.id, m.sess || 0, sec, 'screen', JSON.stringify({ mid: m.id, text: m.text, name: m.name }), now), env.DB.prepare('UPDATE efir_msg SET ans=1 WHERE id=?').bind(m.id)]);
    else return json(req, { ok: false, err: 'Неизвестное действие' }, 400); return json(req, { ok: true }) }
  /* сцена: пригласить (+15 баллов, ученику — ссылка на сцену в бот, если задана), отклонить, убрать со сцены */
  if (path === '/efir/host/hand' && req.method === 'POST') { const h = await env.DB.prepare('SELECT * FROM efir_hand WHERE efir_id=? AND k=?').bind(e.id, String(o.k || '')).first(); if (!h) return json(req, { ok: false, err: 'Ученик не поднимал руку' }, 404);
    const st = { invite: 'stage', decline: 'no', done: 'done' }[o.act]; if (!st) return json(req, { ok: false, err: 'Неизвестное действие' }, 400);
    await env.DB.prepare('UPDATE efir_hand SET st=?, at=? WHERE efir_id=? AND k=?').bind(st, now, e.id, h.k).run(); let sent = 0;
    if (st === 'stage') { if (h.uid) await efPts(env, { uid: h.uid, k: h.k }, e.id, 'stage', 0); const chat = h.k[0] === 't' ? h.k.slice(1) : h.uid ? ((await env.DB.prepare('SELECT tg_chat FROM student WHERE uid=?').bind(h.uid).first()) || {}).tg_chat : null;
      if (chat) { await tgSend(env, chat, '🎤 <b>' + nbt('Тебя зовут на сцену!') + '</b>\n' + nbt('Эфир «' + th(e.title) + '». ' + 'Подключайся по кнопке — включи микрофон, камеру или покажи экран. Эфир держи на паузе, чтобы не было эха.'), [[{ text: 'Выйти на сцену', url: await efStageUrl(env, e, cfg) }]]); sent = 1 } }
    return json(req, { ok: true, st, sent }) }
  if (path === '/efir/host/work' && req.method === 'POST') { await env.DB.prepare("UPDATE efir_msg SET ans=? WHERE id=? AND efir_id=? AND kind='work'").bind(o.ans === 0 ? 0 : 1, +o.mid, e.id).run(); return json(req, { ok: true }) }
  if (path === '/efir/host/file') { const m = await env.DB.prepare("SELECT file_id FROM efir_msg WHERE id=? AND efir_id=? AND kind='work'").bind(+u.searchParams.get('mid'), e.id).first(); const f = m && await env.DB.prepare('SELECT mime, name, data FROM bank_file WHERE id=?').bind(m.file_id).first();
    if (!f) return json(req, { ok: false, err: 'Файл не найден' }, 404); const bin = Uint8Array.from(atob(f.data), c => c.charCodeAt(0));
    return new Response(bin, { headers: Object.assign({ 'Content-Type': f.mime, 'Content-Disposition': (u.searchParams.get('dl') ? 'attachment' : 'inline') + '; filename="' + (f.name || 'file').replace(/[^\w.\-]+/g, '_') + '"; filename*=UTF-8\'\'' + encodeURIComponent(f.name || 'file'), 'Cache-Control': 'private, max-age=600' }, cors(req)) }) }
  if (path === '/efir/host/lead' && req.method === 'POST') { const st = ['new', 'mgr', 'done', 'no'].includes(o.st) ? o.st : 'mgr'; await env.DB.prepare('UPDATE efir_lead SET st=? WHERE id=? AND efir_id=?').bind(st, +o.lid, e.id).run(); return json(req, { ok: true, st }) }
  /* статистика: регистрации, пришли, досмотрели, заявки, удержание (по 5 мин из интервалов присутствия), вопросы; у автовебинара — по сеансам и версиям сценария */
  if (path === '/efir/host/stats') { const [rg, sn, ld, qn, pt] = await env.DB.batch([env.DB.prepare('SELECT COUNT(*) n, SUM(CASE WHEN sess>0 THEN 1 ELSE 0 END) a FROM efir_reg WHERE efir_id=?').bind(e.id),
      env.DB.prepare('SELECT k, sess, t0, scen, min, first, last, maxsec, rec_max, rec_done FROM efir_seen WHERE efir_id=?').bind(e.id), env.DB.prepare('SELECT sess, COUNT(*) n FROM efir_lead WHERE efir_id=? GROUP BY sess').bind(e.id),
      env.DB.prepare("SELECT kind, COUNT(*) n FROM efir_msg WHERE efir_id=? AND role='stu' GROUP BY kind").bind(e.id), env.DB.prepare('SELECT kind, COUNT(*) n, SUM(pts) p FROM efir_pts WHERE efir_id=? GROUP BY kind').bind(e.id)]);
    const SN = (sn.results || []).filter(x => x.sess >= 0), RC = (sn.results || []).filter(x => x.sess === -1), D = (e.dur || 60) * 60, B = Math.ceil(D / 300), ret = new Array(B).fill(0);
    for (const x of SN) { const a = Math.max(0, Math.floor(((x.first || 0) - (x.t0 || x.first || 0)) / 1000)), b = Math.max(a, x.maxsec || Math.floor(((x.last || 0) - (x.t0 || x.first || 0)) / 1000)); for (let i = Math.floor(a / 300); i <= Math.min(B - 1, Math.floor(b / 300)); i++) ret[i]++ }
    const came = new Set(SN.map(x => x.k)).size, done = SN.filter(x => (x.maxsec || 0) >= D * 0.8).length, leads = (ld.results || []).reduce((s, x) => s + x.n, 0), Q = {}; for (const x of qn.results || []) Q[x.kind] = x.n;
    let lsec = null; if (e.kind === 'auto') { const sc = await efScen(env, cfg.scen); const l = sc && sc.items.find(x => x.t === 'lead'); lsec = l ? l.sec : null } else { const l = await env.DB.prepare("SELECT MIN(sec) s FROM efir_ev WHERE efir_id=? AND kind='lead'").bind(e.id).first(); lsec = l && l.s }
    const out = { ok: true, efir: efPub(e, now), regs: ((rg.results || [])[0] || {}).n || 0, came, avg_min: SN.length ? Math.round(SN.reduce((s, x) => s + (x.min || 0), 0) / SN.length) : 0, done, to_lead: lsec != null ? SN.filter(x => (x.maxsec || 0) >= lsec).length : null, lead_sec: lsec, leads,
      msgs: Q.msg || 0, qs: Q.q || 0, works: Q.work || 0, rec_views: RC.length, rec_done: RC.filter(x => x.rec_done).length, retention: ret.map((n, i) => ({ min: i * 5, n })), pts: pt.results || [] };
    if (e.kind === 'auto') { const by = {}, bv = {}; for (const x of SN) { const s = by[x.sess] = by[x.sess] || { sess: x.sess, came: 0, leads: 0 }; s.came++; const v = bv[x.scen || 0] = bv[x.scen || 0] || { scen: x.scen || 0, came: 0, to_lead: 0, leads: 0 }; v.came++; if (lsec != null && x.maxsec >= lsec) v.to_lead++ }
      for (const x of ld.results || []) (by[x.sess] = by[x.sess] || { sess: x.sess, came: 0, leads: 0 }).leads = x.n;
      const rgs = await qAll(env.DB.prepare('SELECT sess, COUNT(*) n FROM efir_reg WHERE efir_id=? GROUP BY sess').bind(e.id)); for (const x of rgs) (by[x.sess] = by[x.sess] || { sess: x.sess, came: 0, leads: 0 }).regs = x.n;
      out.sessions = Object.values(by).sort((a, b) => b.sess - a.sess).slice(0, 30); out.versions = Object.values(bv) }
    return json(req, out) }
  /* «Собрать из эфира»: чат и события живого эфира по секундам → новая версия сценария (старые не затираются) */
  if (path === '/efir/host/build' && req.method === 'POST') { if (!W.adm) return json(req, { ok: false, err: 'Автовебинары собирает Роман' }, 403); if (e.kind === 'auto') return json(req, { ok: false, err: 'Собирают из живого эфира' }, 400);
    const cut = Math.max(0, +o.cut | 0), stop = await efStop(env), [ms, ev, sn] = await env.DB.batch([env.DB.prepare("SELECT name, role, kind, text, sec FROM efir_msg WHERE efir_id=? AND sess=0 AND del=0 AND vis='all' AND kind IN ('msg','q') AND sec IS NOT NULL ORDER BY sec, id").bind(e.id),
      env.DB.prepare("SELECT kind, sec, data FROM efir_ev WHERE efir_id=? AND sess=0 AND kind IN ('lead','lead_off','banner','banner_off','poll','poll_off') ORDER BY sec, id").bind(e.id), env.DB.prepare("SELECT data, sec FROM efir_ev WHERE efir_id=? AND kind='vc' ORDER BY sec").bind(e.id)]);
    let junk = 0; const items = [];
    for (const m of ms.results || []) { if (m.sec < cut) continue; if (o.clean !== 0 && m.role === 'stu' && efSpam(m.text, stop)) { junk++; continue } items.push({ sec: m.sec - cut, t: 'msg', role: m.role === 'stu' ? 'stu' : m.role === 'host' ? 'host' : 'mod', name: o.names === 0 ? m.name : efShort(m.name), text: m.text }) }
    for (const x of ev.results || []) items.push(Object.assign({ sec: Math.max(0, x.sec - cut), t: x.kind }, efJ(x.data, {})));
    items.push({ sec: Math.max(1, (e.dur || 60) * 60 - cut), t: 'end' }); items.sort((a, b) => a.sec - b.sec);
    const vc = []; for (const x of sn.results || []) { const i = Math.floor(Math.max(0, x.sec - cut) / 60); vc[i] = Math.max(vc[i] || 0, efJ(x.data, {}).n || 0) } for (let i = 1; i < vc.length; i++) if (vc[i] == null) vc[i] = vc[i - 1];
    const ver = ((await env.DB.prepare('SELECT MAX(ver) v FROM efir_scen WHERE src_id=?').bind(e.id).first()) || {}).v || 0;
    const r = await env.DB.prepare('INSERT INTO efir_scen (src_id, ver, title, items, vc, note, by, at) VALUES (?,?,?,?,?,?,?,?) RETURNING id').bind(e.id, ver + 1, e.title, JSON.stringify(items), JSON.stringify(vc.map(x => x || 0)), JSON.stringify({ junk, cut, msgs: items.filter(x => x.t === 'msg').length }), W.me, now).first();
    return json(req, { ok: true, scen: { id: r.id, ver: ver + 1, items: items.length, junk, msgs: items.filter(x => x.t === 'msg').length, events: items.filter(x => x.t !== 'msg').length } }) }
  return json(req, { ok: false, err: 'not found' }, 404) }
/* 31.10 (Роман: «на эфире невозможно подключиться, говорить, включить камеру/демку»): Kinescope — трансляция в одну сторону, поэтому сцена — отдельная комната. Если ссылку не вставили, сервер сам даёт комнату Jitsi на эфир (имя с подписью, чтобы не угадали). */
const efStageUrl = async (env, e, cfg) => cfg.stage_url || ('https://meet.jit.si/OduvanovSchool-efir' + e.id + '-' + (await hmacHex(env, 'stage|' + e.id)).slice(0, 10));
const efEditCfg = e => { const c = efJ(e.cfg, {}); return { stage: c.stage || 0, stage_url: c.stage_url || '', work: c.work === 0 ? 0 : 1, label: c.label || 0, lead: c.lead || null, sched: c.sched || null, scen: c.scen || null } };
async function efScenAdd(env, sid, item) { const r = await env.DB.prepare('SELECT items FROM efir_scen WHERE id=?').bind(sid).first(); if (!r) return 0; const L = efJ(r.items, []); L.push(item); L.sort((a, b) => a.sec - b.sec);
  await env.DB.prepare('UPDATE efir_scen SET items=? WHERE id=?').bind(JSON.stringify(L), sid).run(); EFSC.delete(sid); return 1 }
/* сценарии (админ): GET /efir/scen?id= — события; POST /efir/scen {id, items, as_new} — правка (as_new — новая версия); центр модерации GET /efir/mod */
async function efirScenApi(env, req, path) { const u = new URL(req.url); await efirEnsure(env); const o = req.method === 'POST' ? await req.json().catch(() => ({})) : {}, W = await efirWho(env, req, u, o), now = msNow();
  if (!W || !W.s) return deny(req);
  if (path === '/efir/mod') { /* все идущие эфиры и автовебинары, вопросы зрителей «ждут ответа», заявки сейчас (куратор — только свои эфиры, без заявок) */
    const L = (await qAll(W.adm ? env.DB.prepare("SELECT * FROM efir WHERE del=0 AND (status='live' OR kind='auto')") : env.DB.prepare("SELECT * FROM efir WHERE del=0 AND status='live' AND host_cid=?").bind(W.cid))).map(e => ({ e, S: efState(e, now) })).filter(x => x.S.st === 'live');
    const ids = L.map(x => x.e.id), live = []; let wait = [], leads = [];
    if (ids.length) { const ph = ids.map(() => '?').join(','), [vr, mr, lr] = await env.DB.batch([env.DB.prepare('SELECT efir_id, sess, COUNT(*) n FROM efir_seen WHERE last>? AND efir_id IN (' + ph + ') GROUP BY efir_id, sess').bind(now - 9e4, ...ids),
        env.DB.prepare("SELECT * FROM efir_msg WHERE efir_id IN (" + ph + ") AND role='stu' AND kind IN ('msg','q') AND ans=0 AND del=0 AND at>? AND (vis='mod' OR kind='q') ORDER BY id LIMIT 80").bind(...ids, now - 3 * 36e5),
        env.DB.prepare('SELECT * FROM efir_lead WHERE efir_id IN (' + ph + ') AND at>? ORDER BY id DESC LIMIT 30').bind(...ids, now - 6 * 36e5)]);
      for (const x of L) { const v = (vr.results || []).filter(y => y.efir_id === x.e.id); live.push({ id: x.e.id, title: x.e.title, kind: x.e.kind, sess: x.S.sess, viewers: v.reduce((s, y) => s + y.n, 0), sessions: v.length }) }
      wait = (mr.results || []).map(m => Object.assign(efMsgPub(m), { efir_id: m.efir_id, sess: m.sess, title: (L.find(x => x.e.id === m.efir_id) || {}).e.title, wait: now - m.at }));
      if (W.adm) leads = lr.results || [] }
    return json(req, { ok: true, now, live, wait, leads }) }
  if (!W.adm) return json(req, { ok: false, err: 'Сценарии правит Роман' }, 403);
  if (path === '/efir/scen' && req.method === 'GET') { const s = await efScen(env, +u.searchParams.get('id')); if (!s) return json(req, { ok: false, err: 'Сценарий не найден' }, 404); return json(req, { ok: true, scen: s }) }
  if (path === '/efir/scen' && req.method === 'POST') { const old = await env.DB.prepare('SELECT * FROM efir_scen WHERE id=?').bind(+o.id).first(); if (!old) return json(req, { ok: false, err: 'Сценарий не найден' }, 404);
    const T = ['msg', 'lead', 'lead_off', 'banner', 'banner_off', 'poll', 'poll_off', 'end'], items = (Array.isArray(o.items) ? o.items : []).slice(0, 5000).filter(x => x && T.includes(x.t)).map(x => { const y = { sec: Math.max(0, +x.sec | 0), t: x.t };
      for (const k of ['name', 'role', 'text', 'title', 'sub', 'btn', 'url', 'q']) if (x[k] != null) y[k] = bStr(x[k], k === 'text' ? 1000 : 200); if (x.timer != null) y.timer = Math.min(180, +x.timer | 0); if (Array.isArray(x.opts)) y.opts = x.opts.map(z => bStr(z, 60)).slice(0, 6); return y }).sort((a, b) => a.sec - b.sec);
    if (o.as_new) { const ver = ((await env.DB.prepare('SELECT MAX(ver) v FROM efir_scen WHERE src_id IS ?').bind(old.src_id).first()) || {}).v || 0; const r = await env.DB.prepare('INSERT INTO efir_scen (src_id, ver, title, items, vc, note, by, at) VALUES (?,?,?,?,?,?,?,?) RETURNING id').bind(old.src_id, ver + 1, old.title, JSON.stringify(items), old.vc, old.note, 'admin', now).first(); return json(req, { ok: true, id: r.id, ver: ver + 1 }) }
    await env.DB.prepare('UPDATE efir_scen SET items=?, at=? WHERE id=?').bind(JSON.stringify(items), now, old.id).run(); EFSC.delete(old.id); return json(req, { ok: true, id: old.id, ver: old.ver }) }
  if (path === '/efir/leads') { if (req.method === 'POST') { const c = { chats: (Array.isArray(o.chats) ? o.chats : String(o.chats || '').split(/[\s,;]+/)).map(x => String(x).trim()).filter(x => /^-?\d{3,20}$/.test(x)).slice(0, 5) }; await kvPut(env, 'efir_leads', c); return json(req, { ok: true, cfg: c }) }
    return json(req, { ok: true, cfg: (await kvGet(env, 'efir_leads')) || {}, leads: await qAll(env.DB.prepare('SELECT l.*, e.title FROM efir_lead l LEFT JOIN efir e ON e.id=l.efir_id ORDER BY l.id DESC LIMIT 200')) }) }
  return json(req, { ok: false, err: 'not found' }, 404) }
const EFIR_SCEN_API = ['/efir/scen', '/efir/mod', '/efir/leads'];

/* ---------- эфиры в боте: /start e<id> (запись, в т.ч. не-учеников), напоминания за сутки / за час / при старте (cron, учитывает «Уведомления» → Эфиры) ---------- */
async function efLink(env, e, k) { return k[0] === 't' ? 'https://romanoduvanov.github.io/otzyvy/gc/efir.html?id=' + e.id + '&r=' + await efGuestTok(env, k.slice(1)) : maLink(env, 'e' + e.id) }
async function efStart(env, chat, id, from) { await efirEnsure(env); if (from) await saveTgUser(env, from); const e = await efGet(env, id), now = msNow();
  if (!e || e.status === 'draft' || e.status === 'cancel') return tgSend(env, chat, 'Этот эфир не найден или уже убран из расписания.');
  const st = await env.DB.prepare('SELECT uid FROM student WHERE tg_chat=?').bind(chat).first(), W = st ? { me: 'student', uid: st.uid, k: 'u' + st.uid } : { me: 'guest', chat, k: 't' + chat };
  if (!(await efCan(env, e, W))) return tgSend(env, chat, nbt('Эфир «' + th(e.title) + '» — только для учеников потока. Если ты учишься, подключи Telegram в личном кабинете школы.'));
  const S = efState(e, now); let sess = 0;
  if (e.kind === 'auto') { const cfg = efJ(e.cfg, {}), after = cfg.sched && +cfg.sched.after || 0, L = efSessions(e, now, now + 14 * 864e5); sess = after ? Math.ceil((now + after * 6e4) / 6e4) * 6e4 : (L[0] || 0); if (!sess) return tgSend(env, chat, 'Ближайших сеансов пока нет — я напишу, когда появятся.') }
  else if (S.st === 'done') return tgSend(env, chat, nbt('Эфир «' + th(e.title) + '» уже прошёл.'), [[{ text: 'Смотреть запись', url: await efLink(env, e, W.k) }]]);
  await env.DB.prepare("INSERT INTO efir_reg (efir_id, k, uid, chat, name, sess, src, at, rem) VALUES (?,?,?,?,?,?,?,?,'') ON CONFLICT(efir_id, k) DO UPDATE SET sess=excluded.sess, chat=excluded.chat").bind(e.id, W.k, W.uid || null, chat, efShort([from && from.first_name, from && from.last_name].filter(Boolean).join(' ')), sess, 'bot', now).run();
  await logIt(env, 'efir-reg-bot', W.uid || 0, e.id + ' ' + chat); const at = sess || e.start, live = e.kind === 'auto' ? now >= sess : S.st === 'live';
  return tgSend(env, chat, '✅ <b>' + nbt(live ? 'Эфир уже идёт!' : 'Ты записан на эфир') + '</b>\n«' + th(e.title) + '»' + (live ? '' : '\n' + efWhen(at)) + '\n\n' + nbt(live ? 'Подключайся по кнопке.' : 'Напомню за сутки, за час и в момент начала.'), [[{ text: live ? '▶ Открыть эфир' : 'Открыть страницу эфира', url: await efLink(env, e, W.k) }]]) }
/* cron: напоминания. d — за сутки (за 23–25 ч), h — за час (≤ 70 мин), s — старт (≤ 5 мин до начала и до 30 мин после). Пометки в efir_reg.rem, ≤ бюджета запуска */
async function efirJob(env, B) { await efirEnsure(env); const now = msNow(), out = { sent: 0 };
  const E = await qAll(env.DB.prepare("SELECT * FROM efir WHERE del=0 AND status IN ('plan','live') AND (kind='auto' OR (start>? AND start<?))").bind(now - 30 * 6e4, now + 25 * 36e5)); if (!E.length) return out;
  const ids = E.map(e => e.id), regs = await qAll(env.DB.prepare("SELECT r.*, s.tg_chat, (SELECT v FROM kv WHERE k='notif:'||r.uid) nf FROM efir_reg r LEFT JOIN student s ON s.uid=r.uid WHERE r.efir_id IN (" + ids.map(() => '?').join(',') + ") AND LENGTH(COALESCE(r.rem,''))<3 AND (r.sess=0 OR r.sess>?)").bind(...ids, now - 30 * 6e4)), marks = [];
  for (const r of regs) { if (!B.ok(1) || out.sent >= 25) break; const e = E.find(x => x.id === r.efir_id), at = e.kind === 'auto' ? r.sess : e.start; if (!at) continue; const left = at - now, rem = r.rem || '';
    const ph = left <= 5 * 6e4 && left > -30 * 6e4 ? 's' : left > 0 && left <= 70 * 6e4 ? 'h' : left >= 23 * 36e5 && left <= 25 * 36e5 ? 'd' : ''; if (!ph || rem.includes(ph)) continue;
    const nrem = rem + (ph === 's' ? 'dhs' : ph === 'h' ? 'dh' : 'd'); marks.push(env.DB.prepare('UPDATE efir_reg SET rem=? WHERE efir_id=? AND k=?').bind([...new Set(nrem)].join(''), r.efir_id, r.k));
    let nf = NOTIF_DEF; try { nf = Object.assign({}, NOTIF_DEF, JSON.parse(r.nf || '{}')) } catch (x) {} if (r.uid && !nf.efir) continue;
    const chat = r.k[0] === 't' ? r.k.slice(1) : (r.tg_chat || r.chat); if (!chat) continue; const h = efHost(e);
    const t = ph === 's' ? '🔴 <b>' + nbt('Эфир начинается') + '</b>\n«' + th(e.title) + '» · ' + th(h.name) + '\n' + nbt('Заходи — ' + (e.kind === 'auto' ? 'смотри с самого начала.' : 'чат и вопросы уже открыты.'))
      : ph === 'h' ? '⏰ <b>' + nbt('Через час эфир') + '</b>\n«' + th(e.title) + '» · ' + efHM(at) + NB + 'МСК' + (e.kind !== 'auto' && efJ(e.cfg, {}).work !== 0 && r.uid ? '\n' + nbt('Можно прислать работу на разбор прямо на странице эфира.') : '')
      : '📅 <b>' + nbt('Завтра эфир') + '</b>\n«' + th(e.title) + '» · ' + efWhen(at) + '\n' + th(h.name);
    B.use(1); const j = await tgSend(env, chat, t, [[{ text: ph === 's' ? '▶ Открыть эфир' : 'Страница эфира', url: await efLink(env, e, r.k) }]]); if (j && j.ok) out.sent++ }
  if (marks.length) await env.DB.batch(marks); return out }
