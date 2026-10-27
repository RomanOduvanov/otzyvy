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
    if (priv ? xu !== String(me) : x.h !== oldMe) delete o.acc;
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
    const wait = ((await env.DB.prepare('SELECT w.uid, w.since, s.name FROM cwait w LEFT JOIN student s ON s.uid=w.uid WHERE w.cid=? ORDER BY w.since').bind(c.id).all()).results || []).map(w => ({ uid: w.uid, name: w.name, since: w.since, wsec: workSec(w.since, now, h) }));
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
  if (await neuroTg(env, m, chat, text)) return;
  const st = text.match(/^\/start(?:\s+(\S+))?/);
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
    return tgSend(env, chat, '🎉 <b>Telegram подключён!</b>\n\nТеперь сюда будут приходить:\n• напоминания об эфирах и открытии модулей — чтобы не пропустить x2 к баллам;\n• ответы куратора и проверка домашек;\n• твои достижения и новые места в рейтинге.' + (c ? '\n\nТвой куратор — <b>' + th(c.full) + '</b>.' : '\n\nНе забудь выбрать куратора на странице курса — он будет вести тебя до результата.'), [[{ text: 'Открыть курс', url: SITE + '/teach/control/stream/view/id/935917158' }]]) }
  if (st && st[1] && st[1].startsWith('adm_')) {
    if (st[1].slice(4) !== await admKey(env)) return tgSend(env, chat, 'Ссылка недействительна.');
    await env.DB.prepare('INSERT OR REPLACE INTO tg_admin (chat, name, added) VALUES (?,?,?)').bind(chat, [m.from && m.from.first_name, m.from && m.from.last_name].filter(Boolean).join(' '), new Date().toISOString()).run();
    await logIt(env, 'tg-admin', 0, chat); return tgSend(env, chat, '✅ Готово! Сюда будут приходить уведомления об оплатах OduvanovSchool.') }
  if (/^\/curators/.test(text)) { const a = await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(chat).first(); if (a) return tgSend(env, chat, await curInvites(env)) }
  if (/^\/stop/.test(text)) { const r = await env.DB.prepare('UPDATE parent SET active=0 WHERE tg_chat=?').bind(chat).run(); await env.DB.prepare('DELETE FROM tg_admin WHERE chat=?').bind(chat).run();
    return tgSend(env, chat, 'Готово, уведомления отключены.') }
  if (/^\/report/.test(text)) { const p = await env.DB.prepare('SELECT * FROM parent WHERE tg_chat=? AND active=1').bind(chat).first(); if (p) return tgSendReport(env, p) }
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
      if (path === '/unsub') {
        const t = u.searchParams.get('t') || ''; const p = t && await env.DB.prepare('SELECT uid, student FROM parent WHERE token=?').bind(t).first();
        if (p) { await env.DB.prepare('UPDATE parent SET active=0, updated=? WHERE uid=?').bind(new Date().toISOString(), p.uid).run(); await logIt(env, 'unsub', p.uid, '') }
        return html(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f3f1f7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#141220;text-align:center;padding:24px"><div><div style="font-size:22px;font-weight:600">${p ? 'Вы отписались от отчётов' : 'Ссылка устарела'}</div><p style="color:#6b6780;max-width:380px;line-height:1.5">${p ? 'Отчёты больше не будут приходить. Если это ошибка — ' + esc(p.student || 'ученик') + ' может снова подключить их в своём профиле.' : 'Если нужна помощь — напишите в службу заботы.'}</p><a href="${CARE}" style="color:#8b45e6">Служба заботы</a></div></body>`);
      }
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
        const out = { ok: true, auth: !!w.uid, cur: Object.assign(curPub(c), { tg: await curTg(env, c.id), hours: h }), online: hr >= h[0] && hr < h[1], median: st.median == null ? null : st.median, in2h: st.in2h == null ? null : st.in2h, answered: st.answered || 0 };
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
const CRON_JOBS = { '5 * * * *': ['report', 'care'], '25 * * * *': ['pay'], '45 * * * *': ['cur', 'care', 'insights', 'pay', 'report'] };
async function cronRun(env, cron) {
  const B = budget(45), jobs = CRON_JOBS[cron] || ['report', 'cur', 'care', 'insights', 'pay'], out = {};
  try { await ensure(env) } catch (e) { try { await logIt(env, 'cron-err', 0, 'ensure ' + (e && e.message || e)) } catch (x) {} }
  for (const j of jobs) { try { out[j] = await (j === 'report' ? runHourly(env, false, B) : j === 'pay' ? syncPayAuto(env, B) : j === 'care' ? careTick(env, B) : j === 'insights' ? insightsJob(env, B) : curJob(env, B)) }
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
Е. Привет, спасибо, ок → одна короткая фраза; на привет — коротко, с чем помогаешь (уроки и домашка, расписание, баллы, нейросети и клиенты, разбор работ). Не по теме школы (погода, рефераты, политика) → одна фраза, что помогаешь только с учёбой в школе, без помощи по сторонней теме.
Быстрые ответы: если в ответе есть вопрос ученику, в самой последней строке дай 2–3 коротких варианта ответа (до 4 слов) в формате [[Вариант 1 | Вариант 2 | Вариант 3]]. Если вопросов нет — этой строки нет.
Когда ученик отвечает на твои вопросы — советуй под его ситуацию, не повторяй общий шаблон.

Данные и честность:
- Блок «Ученик сейчас» — справка для тебя, а не тема ответа. Место, баллы, звание, время учёбы, банк и заказы упоминай, только если вопрос про них или это прямо нужно для решения. my_bank вызывай, только когда спрашивают про свои деньги, доход, оплаты или заказы.
- Факты о модулях, датах, баллах, правилах и школе — только из этой инструкции, блока «Ученик сейчас» и инструментов. Не выдумывай функции, кнопки, цены и условия. Чего нет — скажи одной фразой и подскажи, где посмотреть или кому написать.
- Контакт куратора (Telegram, часы) бери из call_curator — это проверенные данные школы. Если ссылка на куратора уже была в диалоге из call_curator, она верная: не отказывайся от неё и не называй её выдуманной; при сомнении вызови call_curator ещё раз.
- Не обсуждай свои прошлые ответы и то, как получаешь данные (никаких «я проверил», «инструмент», «в моих данных нет»). Если раньше ошибся — просто дай верную цифру.
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
  { name: 'course_plan', description: 'Модули курса, даты открытия, ближайшие эфиры и открытия (расписание потока).', input_schema: { type: 'object', properties: {} } },
  { name: 'call_curator', description: 'Когда вопрос может решить только человек: возвращает куратора, его контакт и часы, а под ответом ученик увидит кнопку «Написать». Куратору ничего не отправляется.', input_schema: { type: 'object', properties: { summary: { type: 'string', description: 'Коротко суть вопроса для куратора' } }, required: ['summary'] } }
];
/* ---------- факты школы для Нейро (ночь 27.10) ----------
   Источник — опубликованный отчёт обратной связи (GitHub RomanOduvanov/otzyvy, main/index.html, блок <script id="data">), его обновляет движок отчёта ОС.
   Кэш: kv 'schoolfacts' 12 ч (+ память изолята 1 ч). Нет связи — последняя удачная копия, совсем нет — запасные цифры отчёта от 23.10.2026. */
const SCHOOL_SRC = 'https://raw.githubusercontent.com/RomanOduvanov/otzyvy/main/index.html', SCHOOL_PAGE = 'https://romanoduvanov.github.io/otzyvy/';
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
async function aiTurn(env, { uid, history, user, cf }) {
  if (!env.ANTHROPIC_API_KEY) return { err: 'no-key', text: '', usage: { in: 0, out: 0, cache: 0 } };
  const msgs = [...history, { role: 'user', content: user }], ctx = {}, use = { in: 0, out: 0, cache: 0 }, t0 = Date.now(); const facts = await aiFacts(env, uid, ctx);
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
  const SR = (rs.results || []).filter(s => !isStaffUid(env, s.uid)), have = {}; for (const s of SR) have[s.uid] = 1;
  /* админ «Все»: весь поток из рейтинга, даже без записи в базе и без куратора; без строк «id …» у тех, кого нет в рейтинге и кто не заходил */
  if (cid === 'all' && priv) for (const x of D.rows) if (x.uid != null && !have[+x.uid] && !isStaffUid(env, x.uid)) { have[+x.uid] = 1; SR.push({ uid: +x.uid, name: x.name, curator: null, tg_chat: null }) }
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
    await kvPut(env, 'hours:' + cc, [o.from | 0, o.to | 0]); return ajson({ ok: true }) }
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
  const TK = u.searchParams.get('t') || (req.headers.get('Authorization') || '').replace(/^Bearer\s+/, ''), VW = /\.w\./.test(TK) ? await viewTok(env, TK) : null;
  const uid = await authUid(env, TK, 'av'); if (!uid) return deny(req);
  if (path === '/ma/ev' && req.method === 'POST') { if (VW || isStaffUid(env, uid)) return json(req, { ok: true }); let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
    const ks = (Array.isArray(o.k) ? o.k : [o.k]).map(k => String(k || '').replace(/[^\wа-яё:. -]/gi, '').slice(0, 64)).filter(Boolean).slice(0, 10), d = dayStr();
    if (ks.length) { await ensure(env); await env.DB.batch(ks.map(k => env.DB.prepare('INSERT INTO ev (day, uid, k, n) VALUES (?,?,?,1) ON CONFLICT(day, uid, k) DO UPDATE SET n=n+1').bind(d, uid, k))) }
    return json(req, { ok: true }) }
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
    let cur = null; if (c) { const h = await curHours(env, c.id), hr = msk().getUTCHours(); cur = Object.assign(curPub(c), { tg: await curTg(env, c.id), hours: h, online: hr >= h[0] && hr < h[1] }) }
    const flags = (await kvGet(env, 'flags:' + uid)) || {}, mod = VW ? null : await modState(env, uid);
    return json(req, { ok: true, view: VW ? { staff: VW.staff } : null, flags, mod: mod && (mod.until > Date.now() || mod.banned) ? { until: mod.until, banned: !!mod.banned, left: Math.max(0, MOD_CFG(env).steps.length - mod.step) } : null, me: { uid, name: r.name || s.name || '', tar: r.tar || null, acc: r.acc || null, place: r.place || null, n: D.n, pts, week: r.week | 0, lessons: r.lessons | 0, total: D.total_lessons, hw: r.hw | 0, ontime: r.ontime == null ? null : r.ontime, rank: rk.rank, rankFrom: rk.from, next: rk.next, t7: t7.site + t7.video, tAll: tAll.site + tAll.video },
      x2: D.x2 || null, modules: mods, cur, updated: D.updated || null }, 200, { 'Cache-Control': 'no-store' }) }
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
  "ALTER TABLE bank_order ADD COLUMN cur TEXT", "ALTER TABLE bank_order ADD COLUMN dl_tz TEXT"];
let BANK_OK = false;
async function bankEnsure(env) { if (BANK_OK) return; await env.DB.batch(BANK_SCHEMA.map(s => env.DB.prepare(s)));
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
async function bankFile(env, uid, kind, ref, f) { if (!f || typeof f.data !== 'string') return null;
  const m = f.data.match(/^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/); if (!m) return null;
  if (!/^(image\/(jpeg|png|webp|heic|heif|gif)|application\/pdf)$/.test(m[1])) throw new Error('Можно картинку или PDF');
  if (m[2].length > 900000) throw new Error('Файл больше 650 КБ — сожми или сделай скрин');
  const r = await env.DB.prepare('INSERT INTO bank_file (uid, kind, ref, name, mime, size, data, at) VALUES (?,?,?,?,?,?,?,?) RETURNING id').bind(uid, kind, ref, bStr(f.name, 120) || 'файл', m[1], Math.round(m[2].length * 0.75), m[2], new Date().toISOString()).first();
  return r && r.id }
/* Список учеников для команды: имя, тариф, куратор, поток — из данных рейтинга и таблицы student; доход в рублях. Куратор — только свои. */
async function bankStaffList(env, st) {
  const D = await loadData(env), studs = ((await env.DB.prepare('SELECT s.uid, s.name, s.curator, t.name tgname FROM student s LEFT JOIN tg_user t ON t.chat=s.tg_chat').all()).results || []), byU = {};
  for (const s of studs) byU[s.uid] = s;
  const sums = {}; for (const r of ((await env.DB.prepare('SELECT uid, COALESCE(SUM(COALESCE(rub, amount)),0) total, COUNT(id) n, MAX(day) last FROM bank_tx GROUP BY uid').all()).results || [])) sums[r.uid] = r;
  const ords = {}; for (const r of ((await env.DB.prepare("SELECT uid, COUNT(id) n, SUM(CASE WHEN status NOT IN ('done','cancel') THEN 1 ELSE 0 END) act FROM bank_order GROUP BY uid").all()).results || [])) ords[r.uid] = r;
  const seen = {}, out = [], CN = {}; for (const c of CURATORS) CN[c.id] = c.full;
  const add = (uid, name, tar, place) => { if (!uid || seen[uid] || isStaffUid(env, uid)) return; const s = byU[uid] || {}, cid = s.curator || null; if (st.role === 'curator' && cid !== st.cid) return; seen[uid] = 1;
    const m = sums[uid] || {}, o = ords[uid] || {};
    out.push({ uid, name: name || s.name || s.tgname || null, tar: tar || null, cur: cid, curName: cid ? (CN[cid] || cid) : null, stream: D.stream || 'AI-креатор 2.0', place: place || null, total: m.total || 0, n: m.n || 0, last: m.last || null, orders: o.n || 0, active: o.act || 0 }) };
  for (const r of (D.rows || [])) if (r.uid != null) add(+r.uid, r.name, r.tar, r.place);
  for (const s of studs) add(+s.uid, s.name, null, null);
  for (const uid in sums) add(+uid, null, null, null);
  out.sort((a, b) => (!a.name - !b.name) || b.total - a.total || String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
  return { ok: true, role: st.role, cid: st.cid || null, curators: st.role === 'admin' ? CURATORS.map(c => ({ id: c.id, full: c.full })) : CURATORS.filter(c => c.id === st.cid).map(c => ({ id: c.id, full: c.full })), students: out } }
async function bankApi(env, req, path) {
  const u = new URL(req.url); await bankEnsure(env);
  const body = async () => { try { return JSON.parse(await req.text() || '{}') } catch (e) { return {} } };
  const W = await bankWho(env, req, u);
  if (path === '/bank/staff/list') { if (!W.staff) return deny(req); return json(req, await bankStaffList(env, W.staff), 200, { 'Cache-Control': 'no-store' }) }
  if (W.forbidden) return json(req, { ok: false, err: 'Это не твой ученик' }, 403);
  const uid = W.uid; if (!uid) return deny(req);
  if (W.ro && path !== '/bank/summary') return json(req, { ok: false, err: 'Команда школы видит банк ученика только для чтения, без контактов клиентов и файлов' }, 403);
  if (path === '/bank/summary') {
    const [tx, od, fl] = await env.DB.batch([env.DB.prepare('SELECT id, amount, cur, rub, rate, day, what, src, client, order_id, file_id FROM bank_tx WHERE uid=? ORDER BY day DESC, id DESC LIMIT 1000').bind(uid),
      env.DB.prepare('SELECT id, client, tg, product, price, cur, deadline, dl_tz, status, brief, src, at, upd FROM bank_order WHERE uid=? ORDER BY CASE status WHEN \'done\' THEN 2 WHEN \'cancel\' THEN 3 ELSE 1 END, COALESCE(deadline, \'9999\'), id DESC LIMIT 500').bind(uid),
      env.DB.prepare('SELECT id, kind, ref, name, mime, size FROM bank_file WHERE uid=? AND kind=\'order\'').bind(uid)]);
    const T = (tx.results || []).map(x => Object.assign(x, { cur: x.cur || 'RUB', rub: x.rub != null ? x.rub : x.amount })), months = {}; let total = 0;
    for (const x of T) { total += x.rub; const m = x.day.slice(0, 7); months[m] = (months[m] || 0) + x.rub }
    const files = {}; for (const f of fl.results || []) (files[f.ref] = files[f.ref] || []).push({ id: f.id, name: f.name, mime: f.mime, size: f.size });
    const paid = {}, paidRub = {}; for (const x of T) if (x.order_id) { paidRub[x.order_id] = (paidRub[x.order_id] || 0) + x.rub; (paid[x.order_id] = paid[x.order_id] || {})[x.cur] = (paid[x.order_id][x.cur] || 0) + x.amount }
    let orders = (od.results || []).map(o => { const c = o.cur || 'RUB'; return Object.assign(o, { cur: c, files: files[o.id] || [], paid: (paid[o.id] || {})[c] || 0, paid_rub: paidRub[o.id] || 0 }) });
    /* для «ждёт оплаты» в рублях: цена заказа в валюте → по курсу сегодня */
    const need = {}; for (const o of orders) if (o.cur !== 'RUB' && o.status !== 'done' && o.status !== 'cancel') need[o.cur] = 1;
    const rates = { RUB: 1 }; for (const c of Object.keys(need)) rates[c] = await cbrRate(env, dayStr(), c);
    for (const o of orders) o.price_rub = rates[o.cur] ? Math.round((o.price || 0) * rates[o.cur]) : null;
    let tx2 = T;
    if (W.ro) { /* команде — без контактов клиента, ТЗ и файлов */
      tx2 = T.map(x => Object.assign({}, x, { client: x.client ? B_HIDDEN : null, file_id: null, hidden: true }));
      orders = orders.map(o => Object.assign({}, o, { client: o.client ? B_HIDDEN : null, tg: null, brief: o.brief ? B_HIDDEN : null, files: [], files_n: o.files.length, hidden: true })) }
    const who = W.ro ? await (async () => { const D = await loadData(env), r = (D.rows || []).find(x => +x.uid === uid) || {}, s = await env.DB.prepare('SELECT name, curator FROM student WHERE uid=?').bind(uid).first() || {}, c = s.curator && CURATORS.find(x => x.id === s.curator);
      return { uid, name: r.name || s.name || null, tar: r.tar || null, curName: c ? c.full : null } })() : null;
    return json(req, { ok: true, total, months, tx: tx2, orders, today: dayStr(), ro: !!W.ro, who }, 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/bank/tx' && req.method === 'POST') { const o = await body(); const amount = bInt(o.amount); if (!amount) return json(req, { ok: false, err: 'Укажи сумму' }, 400);
    const cur = bCur(o.cur), day = bDay(o.day);
    let rate = 1; if (cur !== 'RUB') { rate = await cbrRate(env, day, cur); if (!rate) return json(req, { ok: false, err: 'Не получилось взять курс ЦБ. Попробуй через минуту' }, 503) }
    const oid = o.order_id ? +o.order_id : null; if (oid && !(await env.DB.prepare('SELECT id FROM bank_order WHERE id=? AND uid=?').bind(oid, uid).first())) return json(req, { ok: false, err: 'нет заказа' }, 400);
    let fid = null; try { fid = await bankFile(env, uid, 'tx', 0, o.file) } catch (e) { return json(req, { ok: false, err: e.message }, 400) }
    const r = await env.DB.prepare('INSERT INTO bank_tx (uid, amount, cur, rub, rate, day, what, src, client, order_id, file_id, at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(uid, amount, cur, Math.round(amount * rate), cur === 'RUB' ? null : Math.round(rate * 10000) / 10000, day, bStr(o.what, 200), bStr(o.src, 60), bStr(o.client, 120), oid, fid, new Date().toISOString()).first();
    if (fid) await env.DB.prepare('UPDATE bank_file SET ref=? WHERE id=?').bind(r.id, fid).run();
    await logIt(env, 'bank-tx', uid, amount + ' ' + cur); return json(req, { ok: true, id: r.id, rub: Math.round(amount * rate) }) }
  if (path === '/bank/tx/del' && req.method === 'POST') { const o = await body(); const x = await env.DB.prepare('SELECT file_id FROM bank_tx WHERE id=? AND uid=?').bind(+o.id, uid).first(); if (!x) return json(req, { ok: false }, 404);
    await env.DB.batch([env.DB.prepare('DELETE FROM bank_tx WHERE id=? AND uid=?').bind(+o.id, uid), env.DB.prepare('DELETE FROM bank_file WHERE uid=? AND kind=\'tx\' AND ref=?').bind(uid, +o.id)]); return json(req, { ok: true }) }
  if (path === '/bank/order' && req.method === 'POST') { const o = await body(), now = new Date().toISOString();
    const f = { client: bStr(o.client, 120), tg: bStr(o.tg, 64).replace(/^https?:\/\/t\.me\//, '').replace(/^@/, ''), product: bStr(o.product, 200), price: bInt(o.price), cur: bCur(o.cur), deadline: bDl(o.deadline), dl_tz: bTz(o.dl_tz), status: B_ST.includes(o.status) ? o.status : 'new', brief: bStr(o.brief, 4000), src: bStr(o.src, 60) };
    if (!f.client && !f.product) return json(req, { ok: false, err: 'Укажи клиента или что за заказ' }, 400);
    let id = +o.id || 0;
    if (id) { const ex = await env.DB.prepare('SELECT id FROM bank_order WHERE id=? AND uid=?').bind(id, uid).first(); if (!ex) return json(req, { ok: false }, 404);
      await env.DB.prepare('UPDATE bank_order SET client=?, tg=?, product=?, price=?, cur=?, deadline=?, dl_tz=?, status=?, brief=?, src=?, upd=? WHERE id=? AND uid=?').bind(f.client, f.tg, f.product, f.price, f.cur, f.deadline, f.dl_tz, f.status, f.brief, f.src, now, id, uid).run() }
    else { const r = await env.DB.prepare('INSERT INTO bank_order (uid, client, tg, product, price, cur, deadline, dl_tz, status, brief, src, at, upd) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(uid, f.client, f.tg, f.product, f.price, f.cur, f.deadline, f.dl_tz, f.status, f.brief, f.src, now, now).first(); id = r.id }
    if (o.tx_id) await env.DB.prepare('UPDATE bank_tx SET order_id=? WHERE id=? AND uid=?').bind(id, +o.tx_id, uid).run();
    const fs = Array.isArray(o.files) ? o.files.slice(0, 5) : [];
    const cnt = (await env.DB.prepare('SELECT COUNT(*) n FROM bank_file WHERE uid=? AND kind=\'order\' AND ref=?').bind(uid, id).first()).n;
    for (const x of fs.slice(0, Math.max(0, 10 - cnt))) { try { await bankFile(env, uid, 'order', id, x) } catch (e) { return json(req, { ok: false, id, err: e.message }, 400) } }
    return json(req, { ok: true, id }) }
  if (path === '/bank/order/status' && req.method === 'POST') { const o = await body(); if (!B_ST.includes(o.status)) return json(req, { ok: false }, 400);
    await env.DB.prepare('UPDATE bank_order SET status=?, upd=? WHERE id=? AND uid=?').bind(o.status, new Date().toISOString(), +o.id, uid).run(); return json(req, { ok: true }) }
  if (path === '/bank/order/del' && req.method === 'POST') { const o = await body();
    await env.DB.batch([env.DB.prepare('DELETE FROM bank_order WHERE id=? AND uid=?').bind(+o.id, uid), env.DB.prepare('DELETE FROM bank_file WHERE uid=? AND kind=\'order\' AND ref=?').bind(uid, +o.id), env.DB.prepare('UPDATE bank_tx SET order_id=NULL WHERE uid=? AND order_id=?').bind(uid, +o.id)]); return json(req, { ok: true }) }
  if (path === '/bank/file/del' && req.method === 'POST') { const o = await body(); await env.DB.prepare('DELETE FROM bank_file WHERE id=? AND uid=?').bind(+o.id, uid).run(); return json(req, { ok: true }) }
  if (path === '/bank/file') { const f = await env.DB.prepare('SELECT name, mime, data FROM bank_file WHERE id=? AND uid=?').bind(+u.searchParams.get('id'), uid).first(); if (!f) return new Response('нет файла', { status: 404 });
    const bin = Uint8Array.from(atob(f.data), c => c.charCodeAt(0));
    return new Response(bin, { headers: Object.assign({ 'Content-Type': f.mime, 'Content-Disposition': 'inline; filename*=UTF-8\'\'' + encodeURIComponent(f.name), 'Cache-Control': 'private, max-age=3600' }, cors(req)) }) }
  return json(req, { ok: false, err: 'not found' }, 404);
}

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
/* оценка ответа службы заботы ИИ: JSON со шкалами и пометкой «проверить» */
async function careGrade(env, chat) { const ms = ((await env.DB.prepare('SELECT dir, text, at FROM care_msg WHERE chat=? AND del=0 ORDER BY at DESC, id DESC LIMIT 40').bind(chat).all()).results || []).reverse();
  if (!ms.some(x => x.dir === 'out') || !env.ANTHROPIC_API_KEY) return null;
  const tr = ms.map(x => (x.dir === 'in' ? 'Клиент: ' : 'Служба заботы: ') + x.text).join('\n').slice(-9000);
  const sys = 'Ты проверяешь ответы службы заботы онлайн-школы OduvanovSchool (курс по дизайну карточек маркетплейсов и ИИ). Оцени ответы сотрудника в диалоге. Верни ТОЛЬКО JSON без пояснений: {"polite":1-5,"solved":"yes"|"partly"|"no","errors":"кратко, ошибки или неверные факты, иначе пусто","promises":"кратко, лишние или опасные обещания (возвраты, сроки, скидки без оснований), иначе пусто","tone":"кратко о тоне","score":1-10,"check":true|false,"summary":"суть вопроса и ответа одной фразой"}. check=true, если есть ошибки, грубость, лишние обещания, вопрос не решён или ответ не по делу.';
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
  /* оценка: диалоги с новым ответом, где последнее сообщение старше 10 минут */
  const tg = (await env.DB.prepare('SELECT * FROM care_dlg WHERE last_out IS NOT NULL AND (graded_at IS NULL OR graded_at < last_out OR graded_at < COALESCE(last_in,0)) AND MAX(COALESCE(last_in,0), last_out) < ? ORDER BY last_out DESC LIMIT 4').bind(now - 600).all()).results || [];
  for (const d of tg) { if (B && !B.ok(3)) break; const g = await careGrade(env, d.chat); if (B) B.use(1); if (!g) continue;
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
  const sys = 'Ты продуктовый аналитик онлайн-школы OduvanovSchool (курс AI-дизайна, кабинет на GetCourse + мини-приложение в Telegram, кураторы, Нейро — ИИ-помощник). Тебе дают сводку за вчера и 7 дней. Напиши 3–5 находок для руководителя Романа.\n'
    + 'Каждая находка — одна строка: «• что видно по цифрам — почему это важно — что сделать сегодня (конкретно: кому написать, что проверить, что поправить)». Только факты из данных, никаких выдумок и общих советов; если данных мало — так и скажи. Сначала самое срочное (сбои, ученики без ответа, провал активности). '
    + 'Пиши на «ты», по-русски, без вступления и заголовков, без markdown кроме «•». До 900 знаков. Поля: active.site — заходили на сайт, active.app — открывали мини-приложение, progress.day — уроки/ДЗ за день, idle — без активности 5+ дней, curators.median — медиана ответа в рабочих секундах, tech — сбои (ai-err — ошибки Нейро, tg-diag — проблемы входа на сайт из Telegram). Учёт времени на сайте идёт с progress.trackingFrom, мини-приложения — с 27.10: «не заходили» до этих дат — не факт, а отсутствие данных.';
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
