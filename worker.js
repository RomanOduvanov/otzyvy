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
const ORIGINS = ['https://oduvanovroman.getcourse.ru', 'https://oduvanovschool.pro', 'https://www.oduvanovschool.pro', 'https://romanoduvanov.github.io', 'https://pay.oduvanovschool.pro']; /* 03.11: свой домен кабинета oduvanovschool.pro и страницы оплат pay.oduvanovschool.pro */
const SITE = 'https://oduvanovroman.getcourse.ru';
const CARE = 'https://t.me/zabota_oduvanov';
const TECH_TG = 'https://t.me/Yark0s';
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

async function gcDl(req, u) {
  let x; try { x = new URL(u.searchParams.get('u') || '', 'https://fs01.getcourse.ru') } catch (e) { return new Response('bad url', { status: 400 }) }
  if (x.protocol !== 'https:' || !/^fs[-a-z]*\d*\.getcourse\.ru$/.test(x.hostname)) return new Response('bad host', { status: 400 });
  let m = x.pathname.match(/^\/fileservice\/file\/thumbnail\/h\/([0-9a-f]{32}\.[a-z0-9]{2,6})\/s\/[^/]+\/a\/(\d+)\/sc\/(\d+)$/i), h, a, sc;
  if (m) { h = m[1]; a = m[2]; sc = m[3] } else { m = x.pathname.match(/^\/fileservice\/file\/download\/a\/(\d+)\/sc\/(\d+)\/h\/([0-9a-f]{32}\.[a-z0-9]{2,6})$/i); if (!m) return new Response('bad path', { status: 400 }); a = m[1]; sc = m[2]; h = m[3] }
  if (a !== '942553') return new Response('forbidden', { status: 403 });
  const r = await fetch('https://fs01.getcourse.ru/fileservice/file/download/a/' + a + '/sc/' + sc + '/h/' + h, { redirect: 'follow' });
  if (!r.ok || /getcourse\.ru\/pl\//.test(r.url) || /text\/html/.test(r.headers.get('Content-Type') || '')) return new Response('not found', { status: 404 });
  let nm = String(u.searchParams.get('n') || '').trim();
  if (!nm) { const cd = r.headers.get('Content-Disposition') || '', q = cd.match(/filename="([^"]+)"/); if (q) { try { nm = new TextDecoder().decode(Uint8Array.from(q[1], c => c.charCodeAt(0) & 255)) } catch (e) { nm = q[1] } } }
  const ext = h.split('.').pop(); if (!nm) nm = 'file.' + ext; else if (!/\.[a-z0-9]{2,6}$/i.test(nm)) nm += '.' + ext;
  nm = nm.replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 150);
  const H = new Headers({ 'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream', 'Content-Disposition': "attachment; filename=\"" + nm.replace(/[^\x20-\x7e]/g, '_') + "\"; filename*=UTF-8''" + encodeURIComponent(nm), 'Cache-Control': 'private, max-age=600', 'Access-Control-Allow-Origin': '*' });
  const cl = r.headers.get('Content-Length'); if (cl) H.set('Content-Length', cl);
  return new Response(r.body, { status: 200, headers: H }) }
function cors(req) { const o = req.headers.get('Origin'); return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0], 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Vary': 'Origin' } }
const json = (req, obj, st = 200, hd = {}) => new Response(JSON.stringify(obj), { status: st, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req), ...hd } });
const html = (body, st = 200) => new Response(body, { status: st, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

export const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS cpay (id INTEGER PRIMARY KEY AUTOINCREMENT, num INTEGER, did INTEGER, email TEXT, name TEXT, phone TEXT, items TEXT, days INTEGER, sum REAL, note TEXT, link TEXT, st TEXT, at TEXT, paid REAL, paid_at TEXT, until TEXT, rem INTEGER DEFAULT 0, mgr TEXT)',
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
  'CREATE TABLE IF NOT EXISTS bc_plan (id INTEGER PRIMARY KEY AUTOINCREMENT, cc TEXT, role TEXT, cid TEXT, at INTEGER, data TEXT, st TEXT, done INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, fail INTEGER DEFAULT 0, msent INTEGER DEFAULT 0, created INTEGER)',
  'CREATE TABLE IF NOT EXISTS stu_tg (uid INTEGER PRIMARY KEY, username TEXT, at TEXT)', /* 30.10: Telegram ученика из формы первого входа — видит куратор */ /* 30.10: отписка от писем о модулях */
  'CREATE TABLE IF NOT EXISTS pay (id INTEGER PRIMARY KEY, deal INTEGER, email TEXT, name TEXT, created TEXT, day TEXT, type TEXT, status TEXT, sum REAL, fee REAL, net REAL, title TEXT, synced TEXT)',
  'CREATE INDEX IF NOT EXISTS pay_day ON pay (day)',
  'CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)',
  /* 05.11 демо-доступ для лидов: ссылка менеджера (что открыть и на сколько) и заявки по ней */
  'CREATE TABLE IF NOT EXISTS demo_link (code TEXT PRIMARY KEY, cfg TEXT, mgr TEXT, at TEXT, n INTEGER DEFAULT 0, off INTEGER DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS demo_claim (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, email TEXT, name TEXT, phone TEXT, uid INTEGER, days INTEGER, items TEXT, until TEXT, at TEXT, ip TEXT, cpay_id INTEGER, pay_link TEXT, st TEXT)',
  'CREATE INDEX IF NOT EXISTS demo_claim_email ON demo_claim (email)',
  /* 05.11 баллы рейтинга → бонусные рубли GetCourse (рейтинг не меняется, бонусный счёт школы = баллы − переведённое) */
  'CREATE TABLE IF NOT EXISTS bonus_conv (id INTEGER PRIMARY KEY AUTOINCREMENT, uid INTEGER, email TEXT, amount INTEGER, pts INTEGER, at TEXT, st TEXT, info TEXT)',
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
    if (priv ? xu !== String(me) : x.h !== oldMe) delete o.acc; delete o.done; delete o.hwa; delete o.oth; delete o.otha; /* учёба (/ma/learn) — только в своём ответе /ma/learn, в рейтинг не попадает даже своя */
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
/* 04.11: письмо рассылки из пульта. На компьютере — тёмное, как письма о модулях (Роман: «на ПК менять не надо»).
   На телефоне (ширина до 620px) — светлое через @media: почтовые приложения перекрашивали тёмное письмо — белый логотип пропадал, розовая кнопка была нечитаемой.
   Логотипа два (белый для тёмного, тёмный для светлого), показывается нужный. Отправителя в тексте не пишем */
function bcMailHtml(who, subj, text, btn, unsub) { const body = esc(text).split(/\n{2,}/).map(p => '<p style="margin:0 0 14px">' + nb(p).replace(/\n/g, '<br>') + '</p>').join('');
  const B = (btn || []).map((b, i) => `<tr><td style="padding:${i ? 10 : 6}px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" class="${i ? 'b2' : 'b1'}" bgcolor="${i ? '#262626' : '#fccbff'}" style="border-radius:16px;background-color:${i ? '#262626' : '#fccbff'};${i ? '' : 'background-image:linear-gradient(180deg,#fef8ff,#fccbff)'}"><a href="${esc(b.url)}" target="_blank" rel="noopener" class="${i ? 'b2a' : 'b1a'}" style="display:block;padding:18px 24px;font-family:${MM_F};font-size:17px;line-height:22px;font-weight:600;color:${i ? '#ffffff' : '#602364'};background-color:${i ? '#262626' : '#fccbff'};text-decoration:none;border-radius:16px;mso-padding-alt:0">${esc(b.text)}</a></td></tr></table></td></tr>`).join('');
  const css = '@media only screen and (max-width:620px){body,.bg{background-color:#f3f1f7!important}.card{background-color:#ffffff!important;border-color:#e6e1ef!important;padding:26px 22px 24px!important}.txt,.txt p{color:#1d1d22!important}.note{color:#6b6b75!important}.note a,.foot a{color:#6c33d6!important}.foot{color:#8b8b95!important}'
    + ''
    + '.b1,.b1a{background-color:#7b3fe4!important;background-image:none!important}.b1a{color:#ffffff!important}.b2,.b2a{background-color:#ffffff!important}.b2{border:1.5px solid #d9ccf5!important}.b2a{color:#5b2bb5!important}}';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(subj)}</title><style>${css}</style></head><body class="bg" style="margin:0;padding:0;background-color:#000106">`
    + `<div class="bg" style="margin:0;padding:0;background-color:#000106"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000106" class="bg" style="background-color:#000106;width:100%"><tr><td align="center" style="padding:32px 12px 40px"><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px">`
    /* 04.11 (Роман: на телефоне в тёмной почте логотип чёрным по тёмному): белый логотип на своей тёмной плашке — читается в светлой и тёмной теме, на ПК и телефоне */
    + `<tr><td style="padding:0 0 22px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#000106" style="background-color:#000106;border-radius:14px;padding:12px 16px"><img src="https://romanoduvanov.github.io/otzyvy/gc/email-logo-white.png" width="200" height="28" alt="OduvanovSchool" style="display:block;border:0;width:200px;height:28px"></td></tr></table></td></tr>`
    + `<tr><td class="card" bgcolor="#141414" style="background-color:#141414;border:1px solid #262626;border-radius:28px;padding:36px 32px 32px;font-family:${MM_F};color:#ffffff">`
    + `<div class="txt" style="font-size:16px;line-height:24px;color:#e6e6ea">${body}</div>`
    + (B ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px">${B}</table>` : '')
    + ((btn || [])[0] ? `<div class="note" style="font-size:13px;line-height:19px;color:#8b8b95;margin-top:12px">Если кнопка не открывается: <a href="${esc(btn[0].url)}" target="_blank" rel="noopener" style="color:#d77fff;text-decoration:underline;word-break:break-all">${esc(String(btn[0].url).replace(/^https:\/\//, ''))}</a></div>` : '')
    + `<div class="note" style="font-size:14px;line-height:21px;color:#8b8b95;margin-top:18px">Ответить можно в&nbsp;<a href="https://t.me/oduvanov_school_bot?startapp=chat" style="color:#d77fff;text-decoration:none;font-weight:600">чате школы</a> или в&nbsp;<a href="${SITE}/teach/control/stream" style="color:#d77fff;text-decoration:none;font-weight:600">кабинете на&nbsp;сайте</a>.</div></td></tr>`
    + `<tr><td class="foot" style="padding:22px 8px 0;font-family:Inter,Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b6b75">Онлайн-школа Романа Одуванова. Вопросы — в <a href="${CARE}" style="color:#a78bfa;text-decoration:underline">Службу заботы</a>. <a href="${unsub}" style="color:#a78bfa;text-decoration:underline">Не присылать письма школы</a></td></tr>`
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
/* 04.11 (Роман: «каждый день настраивать отдельно»): у куратора может быть расписание по дням — kv 'hsched:<cid>' = 7 элементов (0 — Вс), [с, до] или null (выходной).
   curHours отдаёт [с, до] как раньше (часы первого рабочего дня), а расписание кладёт в h.sched — его учитывают curOn, curNext, workSec */
const CHC = {}; const curHours = async (env, cid) => { const c = CHC[cid]; if (c && Date.now() - c.at < 30e3) return c.v;
  let h = null; try { const r = await env.DB.prepare('SELECT v FROM kv WHERE k=?').bind('hours:' + cid).first(); const x = r && JSON.parse(r.v); if (x && x.length === 2) h = [x[0], x[1]] } catch (e) {} if (!h) h = CUR_HOURS_DEF.slice();
  try { const sc = await kvGet(env, 'hsched:' + cid); if (Array.isArray(sc) && sc.length === 7) h.sched = sc.map(d => Array.isArray(d) && d.length === 2 && d[0] < d[1] ? [d[0] | 0, d[1] | 0] : null) } catch (e) {}
  CHC[cid] = { at: Date.now(), v: h }; return h };
const hOfDay = (h, days, wd) => h && h.sched ? h.sched[wd] : (!days || days.includes(wd)) ? h : null;
const curKey = async (env, cid) => (await sha('cur:' + cid + ':' + env.ADMIN_KEY)).slice(0, 16);
/* секунды между a и b (unix), попавшие в рабочие часы [h1, h2) по МСК */
function workSec(a, b, h) { if (!(b > a)) return 0; let s = 0, t = a; const end = Math.min(b, a + 14 * 86400);
  while (t < end) { const d = msk(new Date(t * 1000)), hr = d.getUTCHours(), next = Math.min(end, t - (d.getUTCMinutes() * 60 + d.getUTCSeconds()) + 3600), r = hOfDay(h, null, d.getUTCDay()); if (r && hr >= r[0] && hr < r[1]) s += next - t; t = next } return s }
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
  for (const w of ws) { if (B && !B.ok(3)) { out.push('budget'); break } const h = await curHours(env, w.cid); if (!curOn(h, await curDays(env, w.cid))) continue;
    const ans = await env.DB.prepare('SELECT id FROM cresp WHERE cid=? AND chat=? AND answered >= ?').bind(w.cid, w.chat, w.since).first(); if (ans) { await env.DB.prepare('DELETE FROM cwait WHERE cid=? AND chat=?').bind(w.cid, w.chat).run(); continue }
    const sec = workSec(w.since, now, h), who = th(w.sname || 'Ученик'), c = CURATORS.find(x => x.id === w.cid), since = msk(new Date(w.since * 1000)), sinceT = ('0' + since.getUTCHours()).slice(-2) + ':' + ('0' + since.getUTCMinutes()).slice(-2) + (dayStr(new Date(w.since * 1000)) !== dayStr() ? ' (' + since.getUTCDate() + '.' + ('0' + (since.getUTCMonth() + 1)).slice(-2) + ')' : '');
    const btn = (w.username ? [[{ text: 'Открыть чат', url: 'https://t.me/' + w.username }]] : []).concat([[{ text: '✅ Уже ответил', callback_data: 'cwd:' + w.cid + ':' + w.chat }, { text: 'Ответ не нужен', callback_data: 'cwn:' + w.cid + ':' + w.chat }]]);
    if (sec >= 14400 && w.reminded < 2) { for (const a of await admins(env)) await tgSend(env, a, '🔴 ' + who + ' ждёт ответа куратора ' + th(c ? c.full : w.cid) + ' с ' + sinceT + ' МСК — уже ' + hrs(sec) + ' рабочего времени.', w.username ? [[{ text: 'Открыть чат', url: 'https://t.me/' + w.username }]] : null);
      await env.DB.prepare('UPDATE cwait SET reminded=2 WHERE cid=? AND chat=?').bind(w.cid, w.chat).run(); out.push([w.cid, 2]); if (B) B.use(2); continue }
    if (sec >= 7200 && w.reminded < 1) { await tgSend(env, w.tg_id, '⏰ ' + who + ' ждёт твоего ответа с ' + sinceT + ' МСК (' + hrs(sec) + ' рабочего времени). Цель — ответить за 1–2 часа.\nЕсли уже ответил или ответ не нужен — нажми кнопку ниже.', btn);
      await env.DB.prepare('UPDATE cwait SET reminded=1 WHERE cid=? AND chat=?').bind(w.cid, w.chat).run(); out.push([w.cid, 1]); if (B) B.use(1) } }
  return out }
async function curStats(env, days) { return memo(env, 'cst:' + days, 120, () => curStats0(env, days)) }
async function curStats0(env, days) { const from = (Date.now() / 1000 | 0) - days * 86400, now = Date.now() / 1000 | 0, res = [];
  for (const c of CURATORS) { const ct = await env.DB.prepare('SELECT username, enabled FROM cur_tg WHERE cid=?').bind(c.id).first();
    const rs = ((await env.DB.prepare('SELECT wsec, sec, day FROM cresp WHERE cid=? AND answered>=? ORDER BY wsec').bind(c.id, from).all()).results || []);
    const med = a => a.length ? a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)] : null, h = await curHours(env, c.id);
    const byDay = {}; for (const r of rs) (byDay[r.day] = byDay[r.day] || []).push(r.wsec);
    const wait = ((await env.DB.prepare('SELECT w.uid, w.since, w.chat, s.name FROM cwait w LEFT JOIN student s ON s.uid=w.uid WHERE w.cid=? ORDER BY w.since').bind(c.id).all()).results || []).filter(w => !(w.uid && isStaffUid(env, w.uid))).map(w => ({ uid: w.uid, name: w.name, since: w.since, wsec: workSec(w.since, now, h), src: /^app/.test(String(w.chat)) ? 'app' : 'tg' })); /* 30.10 QA №7: свои тесты команды не считаем — как в списке учеников. Раунд 3 (Н5): src — откуда ждут: tg (личка куратора в Telegram) или app (чат платформы) */
    res.push({ id: c.id, full: c.full, tg: ct && ct.username, connected: !!(ct && ct.enabled), hours: h, sched: h.sched || null, days: await curDays(env, c.id), answered: rs.length, median: med(rs.map(r => r.wsec).filter(x => x > 0)), offHours: rs.filter(r => !(r.wsec > 0)).length, in2h: rs.length ? Math.round(rs.filter(r => r.wsec <= 7200).length / rs.length * 100) : null, over4h: rs.filter(r => r.wsec > 14400).length,
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
  if (up.callback_query && /^evskip:\d{1,9}$/.test(up.callback_query.data || '')) return evSkip(env, up.callback_query); /* 07.11 Э1: «Пропустить» почту */
  if (up.callback_query) { const q = up.callback_query, chat = String(q.message && q.message.chat.id);
    if (q.data === 'off') { const p = await env.DB.prepare('SELECT uid, student FROM parent WHERE tg_chat=? AND active=1').bind(chat).first();
      if (p) { await env.DB.prepare('UPDATE parent SET active=0, updated=? WHERE uid=?').bind(new Date().toISOString(), p.uid).run(); await logIt(env, 'tg-off', p.uid, '') }
      await tg(env, 'answerCallbackQuery', { callback_query_id: q.id, text: p ? 'Вы отписались от отчётов' : 'Подписка уже отключена' });
      if (p) await tgSend(env, chat, 'Готово, отчёты больше не будут приходить. Если это ошибка — ' + th(p.student || 'ученик') + ' может снова подключить их в своём профиле.') }
    return }
  const m = up.message; if (!m || !m.chat || m.chat.type !== 'private') return; const chat = String(m.chat.id), text = String(m.text || '').trim();
  if (await evRegMsg(env, m, chat, text)) return; /* 07.11 Э1 (ТЗ §4.5–4.6): идёт регистрация на мероприятие — контакт или почта (bot_state) */
  if (await bksReply(env, m, chat)) return; /* ответ на «Ответить здесь» / уведомление чата → в чат на платформе */
  if (await neuroTg(env, m, chat, text)) return;
  const st = text.match(/^\/start(?:\s+(\S+))?/);
  if (st && st[1] && /^c[0-9a-f]{10}$/.test(st[1])) return refStart(env, chat, st[1].slice(1), m.from);
  if (st && st[1] && /^e\d{1,9}$/.test(st[1])) return efStart(env, chat, +st[1].slice(1), m.from);
  if (st && st[1] && /^v\d{1,9}(_[a-z0-9]{1,24})?$/.test(st[1])) { const vm = st[1].match(EV_START_RE); return evStart(env, chat, +vm[1], m.from, vm[2] || '') } /* 07.11 Э1 (ТЗ §4.1): v<id>[_<код>] — метка ev_src */ /* 06.11: запись на мероприятие (марафон / открытый эфир) */ /* 30.10: запись на эфир из бота (в т.ч. не-ученики) */
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
  /* 04.11: менеджер открывает приглашение от Романа (/manager → ссылка t.me/…?start=mgr_…) — его чат запоминается, дальше /manager работает и у него */
  if (st && st[1] && st[1].startsWith('mgr_')) { if (!same(st[1].slice(4), (await cpayKey(env)).slice(0, 12))) return tgSend(env, chat, 'Ссылка недействительна. Попроси у Романа новую.');
    const M = (await kvGet(env, 'cpaymgr')) || []; if (!M.includes(String(chat))) { M.push(String(chat)); await kvPut(env, 'cpaymgr', M.slice(-50)) } await logIt(env, 'cpay-mgr', 0, chat);
    return tgSend(env, chat, '🔗 Кабинет менеджера: ссылки на оплату и своя ссылка для брони/предоплаты. Не пересылай её в общие чаты:\nhttps://pay.oduvanovschool.pro/manager/?k=' + (await cpayKey(env)) + '\n\nПотерял ссылку — напиши боту /manager.') }
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
  if (/^\/manager/.test(text)) { const a = await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(chat).first(), M = (await kvGet(env, 'cpaymgr')) || [];
    if (a) return tgSend(env, chat, '🔗 Кабинет менеджера (кастомные ссылки на оплату). Ссылку не пересылай в общие чаты — по ней создаются заказы:\nhttps://pay.oduvanovschool.pro/manager/?k=' + (await cpayKey(env)) + '\n\n👤 Дать доступ менеджеру: перешли ему эту ссылку, он откроет её в Telegram — и бот будет выдавать ему кабинет по /manager:\nhttps://t.me/' + BOT(env) + '?start=mgr_' + (await cpayKey(env)).slice(0, 12));
    if (M.includes(String(chat))) return tgSend(env, chat, '🔗 Кабинет менеджера:\nhttps://pay.oduvanovschool.pro/manager/?k=' + (await cpayKey(env)));
    return tgSend(env, chat, 'Кабинет менеджера — по приглашению Романа. Попроси у него ссылку-приглашение.') }
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
  /* 07.11 Эфиры Э6: заявки эфиров ↔ оплаты (по номеру заказа и почте) — сразу после каждой синхронизации (только D1) */
  try { await ef6PayMatch(env) } catch (e) { await logIt(env, 'efir-paym-err', 0, String(e && e.message || e).slice(0, 200)) }
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
  await kvPut(env, 'names_day', today); await memoClear(env, 'stu:'); await logIt(env, 'names', 0, rows.length + ' имён из ' + info.items.length); return { n: rows.length, all: info.items.length } }
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

/* 04.11 (письмо Cloudflare «D1 daily limit 93%»): учёт строк D1 по запросам — какие запросы съедают лимит. Счётчики в памяти изолята,
   раз в 5 минут одной строкой в таблицу d1s; смотреть /app/api/dbg/d1?h=24 (админ). */
const DBS = {}; let DBT = Date.now(), DBK = false;
function dbTrack(sql, m) { if (!m) return; const k = String(sql).replace(/\s+/g, ' ').slice(0, 150); const o = DBS[k] || (DBS[k] = [0, 0, 0]); o[0] += m.rows_read || 0; o[1] += m.rows_written || 0; o[2]++ }
function dbStmt(st, sql) { return { _st: st, _sql: sql, bind: (...a) => dbStmt(st.bind(...a), sql), raw: (...a) => st.raw(...a),
  all: async () => { const r = await st.all(); dbTrack(sql, r.meta); return r }, run: async () => { const r = await st.run(); dbTrack(sql, r.meta); return r },
  first: async (c) => { const r = await st.all(); dbTrack(sql, r.meta); const row = (r.results || [])[0]; if (row === undefined) return null; return c ? (row[c] ?? null) : row } } }
function dbWrap(env, ctx) { const db = env.DB; if (!db || db._w) return env;
  const W = { _w: 1, prepare: (sql) => dbStmt(db.prepare(sql), sql), exec: (q) => db.exec(q),
    batch: async (a) => { const r = await db.batch(a.map(x => x._st || x)); r.forEach((x, i) => dbTrack((a[i] && a[i]._sql) || '?', x && x.meta)); return r } };
  if (ctx && Date.now() - DBT > 300e3 && Object.keys(DBS).length) { DBT = Date.now(); const j = JSON.stringify(DBS); for (const k in DBS) delete DBS[k];
    ctx.waitUntil((async () => { try { if (!DBK) { await db.prepare('CREATE TABLE IF NOT EXISTS d1s (at INTEGER, j TEXT)').run(); DBK = true } await db.prepare('INSERT INTO d1s (at, j) VALUES (?, ?)').bind(Date.now(), j).run() } catch (e) {} })()) }
  return new Proxy(env, { get: (t, k) => k === 'DB' ? W : t[k] }) }
export default {
  async fetch(req, env, ctx) {
    env = dbWrap(env, ctx);
    /* 06.11: запланированные рассылки (в т. ч. напоминания об эфирах) — не ждать крона: любой запрос к серверу раз в минуту проверяет очередь */
    if (Date.now() - BCT > 60e3 && req.method !== 'OPTIONS') { BCT = Date.now(); ctx.waitUntil(bcPlanTick(env).catch(() => null)); ctx.waitUntil(evTick(env).catch(x => logIt(env, 'ev-tick-err', 0, String(x && x.message || x).slice(0, 200)))); ctx.waitUntil(evGcTick(env, budget(2)).catch(() => null)); ctx.waitUntil(evFormTick(env, budget(3)).catch(() => null)) }
    /* 07.11 Эфиры Э5 (§3.1, §3.4): сигнал OBS и «Ты в эфире?» — раз в 20 с по запросам к /efir/* в фоне (раньше kinAutoLive делал запрос к D1 в каждом запросе); повтор заказов GetCourse — раз в минуту, до 5 */
    if (req.method !== 'OPTIONS' && /^\/efir\//.test(new URL(req.url).pathname)) { if (Date.now() - EF5T.sig > 2e4) { EF5T.sig = Date.now(); ctx.waitUntil(kinAutoLive(env, Date.now()).catch(x => logIt(env, 'efir-sig-err', 0, String(x && x.message || x).slice(0, 200)))) } if (Date.now() - EF5T.retry > 6e4) { EF5T.retry = Date.now(); ctx.waitUntil(efLeadRetryTick(env, budget(5), 5).catch(() => null)) } }
    const u = new URL(req.url), path = u.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
    try {
      if (path === '/app') return new Response(APP_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
      /* пульт живёт и на GitHub Pages (gc/pult.html) — ответы API с CORS для своих доменов */
      if (path.startsWith('/ma/')) return maApi(env, req, path);
      if (path.startsWith('/bank/')) return bankApi(env, req, path);
      /* 04.11 (Роман: «кнопка Скачать у файлов ученика — сразу на компьютер в хорошем качестве»): файлы работ GetCourse отдаёт только inline и без CORS.
         Публичные файлы аккаунта (картинки, psd, zip: /fileservice/file/download|thumbnail/…/a/942553/sc/…) сервер скачивает оригиналом и отдаёт с attachment.
         Защищённые (/pl/fileservice/user/…) требуют вход в GetCourse — их здесь нет. */
      if (path === '/dl') return gcDl(req, u);
      if (path.startsWith('/chat/')) return chatApi(env, req, path);
      if (path.startsWith('/srch/')) return srchApi(env, req, path);
      if (path.startsWith('/pay/')) return cpayApi(env, req, path);
      if (path.startsWith('/demo/')) return demoApi(env, req, path);
      /* 01.11: запасная раздача файлов сайта (eco/layout/theme), пока GitHub Pages не принимает выкладки. Залить: POST /gc/put?name=… с X-GH-Token (право push в репозиторий) */
      if (path === '/gc/put' && req.method === 'POST') { if (!(await ghOk(env, req))) return deny(req); const nm = u.searchParams.get('name') || ''; if (!/^(eco|layout|theme|appskin)-[0-9a-f]{8}\.(js|css)$/.test(nm)) return json(req, { ok: false, err: 'name' }, 400);
        const body = await req.text(); if (!body || body.length > 1800000) return json(req, { ok: false, err: 'size' }, 400); await env.DB.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)').bind('gcf:' + nm, body).run(); return json(req, { ok: true, name: nm, bytes: body.length }) }
      if (path.startsWith('/gc/') && req.method === 'GET') { const nm = path.slice(4); if (!/^(eco|layout|theme|appskin)-[0-9a-f]{8}\.(js|css)$/.test(nm)) return new Response('not found', { status: 404 });
        const r = await env.DB.prepare('SELECT v FROM kv WHERE k=?').bind('gcf:' + nm).first(); if (!r) return new Response('not found', { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
        return new Response(r.v, { headers: { 'Content-Type': nm.endsWith('.css') ? 'text/css; charset=utf-8' : 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*' } }) }
  if (path === '/admin/ptest') return ptestApi(env, req);
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
      /* 02.11: баллы за ДЗ, поставленные куратором (лента ответов / кабинет) — для рейтинга вместо расчёта по уровню: [{aid, uid, lid, pts, x2}] */
      if (path === '/rating/hwpts') { if (!same(u.searchParams.get('k'), await ratingKey(env)) && !(await ghOk(env, req))) return json(req, { ok: false }, 403); await bankEnsure(env); await curHwEnsure(env);
        const last = {}; for (const x of ((await env.DB.prepare('SELECT answer_id, uid, lesson_id, status, pts, x2 FROM cur_hw WHERE answer_id IS NOT NULL AND (base IS NOT NULL OR status <> \'accept\') ORDER BY id').all()).results || [])) last[x.answer_id] = x;
        return json(req, { ok: true, list: Object.values(last).filter(x => x.status === 'accept' && !isStaffUid(env, x.uid)).map(x => ({ aid: x.answer_id, uid: x.uid, lid: x.lesson_id, pts: x.pts | 0, x2: x.x2 ? 1 : 0 })) }, 200, { 'Cache-Control': 'no-store' }) }
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
      /* 05.11: демо-ученики не попадают в рейтинг — сборщик (gamify.py) берёт список отсюда */
      if (path === '/fin/demo') { if (!same(u.searchParams.get('k'), await ratingKey(env)) && !(await ghOk(env, req))) return json(req, { ok: false }, 403); await ensure(env); return json(req, { ok: true, uids: (await qAll(env.DB.prepare('SELECT DISTINCT uid FROM demo_claim WHERE uid IS NOT NULL'))).map(x => String(x.uid)) }) }
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
      /* 03.11 этап 3: предпросмотр утренней сводки (ничего не отправляет): ?cid=anton|kirill|admin */
      if (path === '/admin/digest' && u.searchParams.get('k') === env.ADMIN_KEY) { await ensure(env); const cq = u.searchParams.get('cid') || 'anton';
        if (cq === 'admin') { const R = {}; for (const c of CURATORS) R[c.id] = await digestFor(env, c.id); return json(req, Object.assign({ ok: true, dry: true }, await digestAdmin(env, R))) }
        if (!CURATORS.some(c => c.id === cq)) return json(req, { ok: false, err: 'cid' }, 400); return json(req, Object.assign({ ok: true, dry: true }, await digestFor(env, cq))) }
      if (path === '/admin/run' && u.searchParams.get('k') === env.ADMIN_KEY) { const res = await runHourly(env, true); return json(req, res) }
      /* Telegram: вебхук и настройка */
      if (path === '/tg/hook' && req.method === 'POST') { if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== await tgSecret(env)) return new Response('no', { status: 403 }); if (Date.now() - BCT > 60e3) { BCT = Date.now(); ctx.waitUntil(bcPlanTick(env, budget(40)).catch(() => {})); ctx.waitUntil(evTick(env).catch(() => {})); ctx.waitUntil(evGcTick(env, budget(2)).catch(() => {})) } /* 04.11: запланированные рассылки — точнее крона (бот получает обновления постоянно) */
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
        const r = await studentRow(env, uid);
        /* 04.11 (Роман): need_cur — ученик текущего потока (строка рейтинга) без куратора: на сайте висит плашка «Выбери куратора» */
        let need_cur = false; if (!r.curator && !isStaffUid(env, uid)) { try { const D = await loadData(env); need_cur = (D.rows || []).some(x => x.uid != null && +x.uid === +uid) } catch (e) {} }
        /* 04.11 (Роман: «индивидуальный доступ показывается бессрочным»): срок доступа по своим ссылкам — из cpay (GetCourse видит только заказ без срока) */
        let cpay = []; try { const em = await env.DB.prepare('SELECT email FROM gc_name WHERE uid=?').bind(uid).first(); if (em && em.email) cpay = (await qAll(env.DB.prepare("SELECT items, until, st FROM cpay WHERE email=? AND st IN ('granted','expired') ORDER BY id DESC LIMIT 10").bind(em.email))).map(c => ({ title: 'Индивидуальный доступ: ' + JSON.parse(c.items || '[]').map(id => (CPAY_ITEMS.find(x => x.id === id) || {}).t || '').filter(Boolean).map(t => t.replace(/^Бонус: /, '')).join(', '), until: c.until, st: c.st })) } catch (e) {}
        const dm = await demoOf(env, uid); if (dm) need_cur = false;
        return json(req, { ok: true, auth: true, need_cur, cpay, demo: dm ? { until: dm.until, on: Date.parse(dm.until) > Date.now() ? 1 : 0 } : null, tg_ok: !!r.tg_chat, tg_link: 'https://t.me/' + BOT(env) + '?start=s_' + r.tg_token, cur: r.curator ? Object.assign(curPub(CURATORS.find(c => c.id === r.curator)) || {}, { tg: await curTg(env, r.curator), hours: await curHours(env, r.curator) }) : null, curators: CURATORS.map(curPub) }) }
      /* 05.11 (Роман): «Мои покупки» → «Перевести в бонусные рубли». Бонусный счёт школы = баллы рейтинга − уже переведённое (рейтинг не трогаем).
         Сумма раскладывается на группы «Бонусы из рейтинга +1/+2/…/+8192» и группу «…: к зачислению»; процесс GetCourse 2635486 начисляет бонусные рубли и снимает группы. */
      if (path === '/bonus') { let o = {}; if (req.method === 'POST') { try { o = JSON.parse(await req.text() || '{}') } catch (e) {} } await ensure(env);
        const w = await who(env, o.t || u.searchParams.get('t'), 'a'); if (!w.uid) return json(req, { ok: false, err: 'Войди на платформу заново', st: 401 }, 401); const uid = w.uid;
        let pts = 0; try { const D = await loadData(env); const r = (D.rows || []).find(x => x.uid != null && +x.uid === +uid); pts = r ? r.pts | 0 : 0 } catch (e) {}
        const used = ((await env.DB.prepare("SELECT COALESCE(SUM(amount),0) s FROM bonus_conv WHERE uid=? AND st!='fail'").bind(uid).first()) || {}).s | 0;
        const last = await env.DB.prepare("SELECT amount, at FROM bonus_conv WHERE uid=? AND st!='fail' ORDER BY id DESC LIMIT 1").bind(uid).first(), bal = Math.max(0, pts - used);
        if (req.method !== 'POST') return json(req, { ok: true, pts, used, bal, last: last || null });
        if (await demoOf(env, uid)) return json(req, { ok: false, err: 'В демо-доступе баллы не переводятся' }, 403);
        if (last && Date.now() - Date.parse(last.at) < 20 * 6e4) return json(req, { ok: false, err: 'Предыдущий перевод ещё зачисляется — подожди несколько минут' }, 429);
        const amt = Math.min(bal, 16383); if (amt < 1) return json(req, { ok: false, err: 'На бонусном счёте пока нет баллов' }, 400);
        const em = await env.DB.prepare('SELECT email FROM gc_name WHERE uid=?').bind(uid).first(); if (!em || !em.email) return json(req, { ok: false, err: 'Не нашли твою почту — напиши в службу заботы, переведём вручную' }, 400);
        const G = ['Бонусы из рейтинга: к зачислению']; for (let b = 1; b <= 8192; b *= 2) if (amt & b) G.push('Бонусы из рейтинга +' + b);
        const ins = await env.DB.prepare("INSERT INTO bonus_conv (uid, email, amount, pts, at, st) VALUES (?,?,?,?,?,'new') RETURNING id").bind(uid, em.email, amt, pts, new Date().toISOString()).first();
        const j = await gcImport(env, 'users', { user: { email: em.email, group_name: G }, system: { refresh_if_exists: 1 } }).catch(e => ({ error_message: e.message })); const R = (j && j.result) || {};
        if (!(j && (j.success === true || j.success === 'true')) || R.error) { await env.DB.prepare("UPDATE bonus_conv SET st='fail', info=? WHERE id=?").bind(JSON.stringify(j).slice(0, 300), ins.id).run(); return json(req, { ok: false, err: 'GetCourse не ответил — попробуй ещё раз через минуту' }, 502) }
        await env.DB.prepare("UPDATE bonus_conv SET st='sent' WHERE id=?").bind(ins.id).run(); await logIt(env, 'bonus-conv', uid, amt + ' ' + G.length);
        await tgAdmins(env, '💎 Баллы → бонусные рубли: ' + th(em.email) + ' — ' + amt.toLocaleString('ru-RU') + ' ₽ (баллов в рейтинге ' + pts + ')');
        return json(req, { ok: true, amount: amt, bal: Math.max(0, pts - used - amt), pts }) }
      if (path === '/cur' && req.method === 'POST') { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
        const w = await who(env, o.t, 'a'); if (!w.uid && !w.bad) w.uid = await softUid(env, w, +o.u); if (!w.uid || (o.u && +o.u !== w.uid)) return deny(req);
        const uid = w.uid, c = CURATORS.find(x => x.id === o.c); if (!c) return json(req, { ok: false }, 400);
        const r = await studentRow(env, uid); if (r.curator) return json(req, { ok: false, err: 'already', cur: curPub(CURATORS.find(x => x.id === r.curator)) });
        if (await demoOf(env, uid)) return json(req, { ok: false, err: 'demo', msg: 'Куратора выбирают после покупки обучения — в демо можно посмотреть, кто ведёт поток' });
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
  async scheduled(ev, env, ctx) { env = dbWrap(env, ctx); ctx.waitUntil(cronRun(env, ev && ev.cron)) }
};

/* ---------- cron (CODE-05): у каждого запуска свой лимит ~50 внешних запросов ----------
   В Cloudflare → oduvanov-api → Settings → Triggers → Cron: «5 * * * *» — снимок рейтинга и отчёты родителям, «25 * * * *» — платежи GetCourse,
   «45 * * * *» — кураторы, досылка экспорта платежей и отчётов. 03.11 (этап 3): «20 6 * * *» — черновики ИИ на утро (9:20 МСК), «30 6 * * *» — утренняя сводка кураторам (9:30 МСК). Если оставить одно расписание — все задачи по очереди с общим бюджетом.
   Задачи идут последовательно, ошибка одной пишется в лог (cron-<задача>-err) и не мешает остальным.
   Старый аккаунт школы из cron убран: данные уже загружены, повторная загрузка — вручную /fin/old/sync?k=ADMIN_KEY. */
const CRON_JOBS = { '5 * * * *': ['bcplan', 'efir', 'report', 'care', 'names', 'modmail', 'rev', 'efkin', 'cpay', 'evgc', 'evform', 'evfst'], '25 * * * *': ['bcplan', 'prep', 'efir', 'pay', 'names', 'cpay', 'crask', 'efkin', 'evgc', 'evform', 'evfst'], '45 * * * *': ['bcplan', 'efir', 'cur', 'digest', 'urgent', 'bank', 'care', 'insights', 'pay', 'report', 'cpay', 'efkin', 'evgc', 'evform', 'evfst'],
  '20 6 * * *': ['prep'], '30 6 * * *': ['digest', 'prep'] }; /* 03.11 этап 3: 9:20 МСК — черновики ИИ (prep, доделывает в 9:25 и 9:30), 9:30 — утренняя сводка (digest; если отдельного расписания нет — в 9:45), срочные — раз в час (urgent) */ /* 30.10: efir — напоминания об эфирах в каждом запуске (за сутки, за час, при старте) */
async function cronRun(env, cron) {
  const B = budget(45), jobs = CRON_JOBS[cron] || ['efir', 'report', 'cur', 'prep', 'digest', 'urgent', 'bank', 'care', 'insights', 'pay'], out = {};
  try { await ensure(env) } catch (e) { try { await logIt(env, 'cron-err', 0, 'ensure ' + (e && e.message || e)) } catch (x) {} }
  for (const j of jobs) { try { out[j] = await (j === 'report' ? runHourly(env, false, B) : j === 'pay' ? syncPayAuto(env, B) : j === 'cpay' ? cpayJob(env, B) : j === 'crask' ? crAskJob(env, B) : j === 'bcplan' ? bcPlanTick(env, B) : j === 'names' ? syncNames(env, B) : j === 'modmail' ? modMailJob(env, B) : j === 'rev' ? revJob(env, B) : j === 'care' ? careTick(env, B) : j === 'insights' ? insightsJob(env, B) : j === 'bank' ? bankJob(env, B) : j === 'efir' ? efirJob(env, B) : j === 'efkin' ? kinRecJob(env, B) : j === 'evgc' ? evGcTick(env, B) : j === 'evform' ? evFormTick(env, B) : j === 'evfst' ? evFormStatus(env, B) : j === 'prep' ? prepJob(env, B) : j === 'digest' ? digestJob(env, B) : j === 'urgent' ? urgentJob(env, B) : curJob(env, B)) }
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
/* 01.11 (Роман: «Нейро и поиск должны шарить за все отчёты, которые ученик может настроить») — одна справка для Нейро и умного поиска */
const REPORTS_KB = `Отчёты, которые ученик настраивает сам:
1) Отчёт для родителей — Профиль (${SITE}/user/my/profile) → блок «Отчёт для родителей» → «Подключить отчёт». Куда: на почту или в Telegram. Для Telegram появится ссылка: её нужно отправить родителю (есть «Копировать» и «Поделиться»), родитель открывает бота @oduvanov_school_bot, жмёт «Старт» — сразу приходит первый отчёт, дальше по расписанию; пока ссылку не открыли, статус «Ждём родителя». Настройки: как обращаться (например «Мама»), во сколько по Москве, как часто — каждый день, раз в 2 дня, раз в 3 дня или раз в неделю; галочка «Разрешаю отправлять родителю мои учебные показатели». В отчёте: пройденные уроки, домашки, время за уроками и место в потоке, картинкой-карточкой. Кнопки: «Пример» (посмотреть пример), «Изменить», «Отключить отчёт». Telegram родителя можно подключить только один: чтобы сменить — отключи отчёт и подключи заново, появится новая ссылка. Родитель сам может отписаться кнопкой «Отписаться» под отчётом или командой /stop в боте.
2) Отчёт по месяцам в банке — «Мой банк» (${SITE}/teach/control/stream?fs=bank) → «Отчёт»: по каждому месяцу число оплат, средний чек и сумма; там же «Выгрузить в таблицу (CSV)» — свои оплаты.
3) «Поделиться картой» в банке — картинка с итогами для сторис (1080×1920) или поста (1080×1080), без имён клиентов.
4) «Поделись результатом» в профиле — карточка со званием, баллами и достижениями для сторис, поста в Telegram или чата.`;
const AI_PAGES = [
  ['Мои покупки — доступы, сроки, тариф, бонусный счёт', SITE + '/sales/control/userProduct/my'],
  ['Все тренинги', SITE + '/teach/control/stream'],
  ['Курс «AI-креатор 2.0» — модули и уроки, своё место в рейтинге', SITE + '/teach/control/stream/view/id/935917158'],
  ['Рейтинг потока — места, баллы, звания', SITE + '/teach/control/stream/view/id/935952152'],
  ['Расписание — когда открываются модули', SITE + '/teach/control/schedule'],
  ['Настройки уведомлений', SITE + '/pl/notifications/settings/my'],
  ['Забота о студентах (оплата, доступы, технические проблемы)', CARE],
  ['Технический специалист @Yark0s — поможет установить приложения и программы, разобраться с компьютером и телефоном', TECH_TG],
  ['Отчёт для родителей — подключить в профиле', SITE + '/user/my/profile']
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
- Технический специалист ${TECH_TG} (@Yark0s) — как куратор, только по технике: установить программы и приложения (Photoshop, Figma, нейросети, VPN, Telegram, мини-приложение), настроить компьютер или телефон, разобраться, куда нажимать, если с компьютером сложно. Предлагай его, когда ученик не может что-то установить или запутался в технике.
${REPORTS_KB}
На вопрос «как подключить/настроить отчёт» — дай шаги по пунктам из этой справки и ссылку на страницу.
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
const MOD_OK = /^(привет|здравствуй|здрасте|добр(ый|ое|ого)|хай|hi|hello|спасибо|спс|благодарю|пасиб|ок|окей|ok|понял|поняла|ясно|хорошо|супер|класс|отлично|ага|да|нет|угу|понятно|круто|ладно|давай|подробнее|а ещё|а еще|ещё|еще|продолжи|другое|другой вариант|не знаю)[\s!.,)?]*$/i;
/* 03.11 (Роман: «вопросы по платформе помечались как не по теме»): + платформа, приложение, родители, вход, видео-редакторы, тексты для карточек, любой язык */
const MOD_TOPIC = /(родител|отч[её]т|контрол|платформ|приложени|апк|сайт|геткурс|getcourse|get ?kurs|кабинет|профил|парол|войти|вход|логин|телеграм|telegram|бот|уведомлен|capcut|капкут|видео|монтаж|reels|рилс|текст|товар|продукт|описани|курс|урок|модул|балл|рейтинг|звани|дз|домашк|задани|анкет|эфир|расписан|доступ|тариф|оплат|куратор|школ|одуванов|рома|роман|нейро|нейросет|ии|ai|midjourney|миджорн|промпт|генерац|картин|фото|карточ|слайд|инфограф|дизайн|макет|шрифт|цвет|фон|figma|фигм|фотошоп|wb|вб|wildberries|озон|ozon|маркетплейс|селлер|клиент|заказ|портфолио|цен[аыу]|прайс|деньг|доход|заработ|банк|оплат|фриланс|kwork|авито|резюме|работ|как|что|где|когда|почему|зачем|можно|помоги|подскаж|сколько|\?)/i;
async function modState(env, uid) { return Object.assign({ n: 0, step: 0, until: 0, banned: false, hist: [], lastV: 0, lastOk: 0, q: [], last: '' }, (await kvGet(env, 'mod:' + uid)) || {}) }
function modGib(t) { const x = t.toLowerCase().replace(/[^a-zа-яё]/g, ''); if (x.length < 5) return false; if (!/[аеёиоуыэюяaeiouy]/.test(x)) return true; if (/(.)\1{4,}/.test(x)) return true;
  const v = (x.match(/[аеёиоуыэюяaeiouy]/g) || []).length / x.length; return v < 0.12 || /^(йцукен|фыва|ячсм|qwert|asdf|zxcv)/.test(x) }
async function modAsk(env, t) { if (!env.ANTHROPIC_API_KEY) return true;
  const { r, j } = await aiFetch(env, JSON.stringify({ model: env.MOD_MODEL || AI_MODEL(env), max_tokens: 400, output_config: { effort: 'low' }, system: 'Ты фильтр чата учеников онлайн-школы AI-дизайна карточек для маркетплейсов. По делу: учёба, курс, нейросети, дизайн, клиенты, заказы, деньги и банк ученика, баллы, задания, школа; платформа и приложение школы (GetCourse, сайт, вход, пароль, Telegram-бот, уведомления, родительский контроль и отчёты родителям); программы для работы (Figma, Photoshop, CapCut, видео и монтаж); тексты и товары для карточек (любой товар — это материал для дизайна); короткие ответы на кнопки и уточнения; приветствия и благодарности; сообщения на любом языке. Не по делу: явно посторонние темы (аниме, игры, политика, личная болтовня), бессмыслица, оскорбления, провокации. Если сомневаешься — да. Ответь одним словом: да — если по делу, нет — если не по делу.', messages: [{ role: 'user', content: t.slice(0, 500) }] }));
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
/* 04.11: отправка пачки рассылки (до 35 человек) — из пульта сразу и из запланированных (bcPlanTick) */
async function bcSend(env, s, o) { const cc = appScope(s, o.c), ch = ['tg', 'mail', 'both'].includes(o.ch) ? o.ch : 'tg';
    const text = String(o.text || '').trim().slice(0, 3000); if (!text) return { ok: false, err: 'empty' };
    const all = (await appStudents(env, cc)).students; const want = Array.isArray(o.uids) && o.uids.length ? new Set(o.uids.map(Number)) : null;
    const inW = x => !want || want.has(x.uid), toT = ch === 'mail' ? [] : all.filter(x => x.tgid && inW(x));
    let toM = ch === 'tg' ? [] : all.filter(x => x.em && inW(x));
    if (toM.length) { const off = new Set((await qAll(env.DB.prepare('SELECT uid FROM mail_off'))).map(r => +r.uid)); toM = toM.filter(x => !off.has(+x.uid)) }
    if (toT.length > 40 || toM.length > 100) return { ok: false, err: 'batch' }; /* бесплатный Cloudflare: ~50 запросов за вызов — страница шлёт пачками по 35 */
    const who = s.role === 'admin' ? 'Роман' : ((CURATORS.find(x => x.id === s.cid) || {}).name || 'Куратор');
    /* 04.11: несколько кнопок (btns: [{t,u}], до 5) — каждая отдельной строкой; старый формат btn/link тоже принимаем */
    const BL = (Array.isArray(o.btns) ? o.btns : o.link ? [{ t: o.btn, u: o.link }] : []).filter(b => b && /^https:\/\//.test(String(b.u || ''))).slice(0, 5).map(b => ({ text: String(b.t || 'Открыть').slice(0, 40), url: String(b.u).slice(0, 500) }));
    const btn = BL.length ? BL.map(b => [b]) : undefined;
    let sent = 0, fail = 0, msent = 0, mfail = 0;
    for (const x of toT) { const j = await tgSend(env, x.tgid, th(text.replace(/\{имя\}/g, firstName(x.name) || 'привет')), btn); /* 04.11 (Роман): без «Роман» первой строкой — человек должен сразу видеть суть, сообщение и так от бота */ if (j && j.ok) sent++; else fail++ }
    if (toM.length) { if (!env.RESEND_KEY) mfail = toM.length; else {
      const subj = String(o.subj || '').trim().slice(0, 120) || (who === 'Роман' ? 'Сообщение от Романа Одуванова' : 'Сообщение от куратора ' + who);
      const msgs = await Promise.all(toM.map(async x => ({ from: env.MAIL_FROM || 'OduvanovSchool <onboarding@resend.dev>', to: [x.em], subject: subj.replace(/\{имя\}/g, firstName(x.name) || ''), html: bcMailHtml(who, subj, text.replace(/\{имя\}/g, firstName(x.name) || 'привет'), BL, await modUnsubLink(env, x.uid)) })));
      const r = await fetch('https://api.resend.com/emails/batch', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(msgs) });
      const t = await r.text(); await logIt(env, r.ok ? 'bcmail-ok' : 'bcmail-err', 0, cc + ' · ' + toM.length + ' · ' + t.slice(0, 200)); if (r.ok) msent = toM.length; else mfail = toM.length } }
    const log = (await kvGet(env, 'bclog:' + cc)) || []; const bid = String(o.bid || '').slice(0, 40);
    if (bid && log[0] && log[0].bid === bid) { log[0].sent += sent; log[0].fail += fail; log[0].msent = (log[0].msent || 0) + msent } else log.unshift({ bid, at: new Date().toISOString(), who, ch, text: text.slice(0, 1500), btn: BL.length ? BL.map(b => b.text).join(' · ') : null, link: BL.length ? BL[0].url : null, all: !want, sent, fail, msent, noTg: o.noTg | 0 });
    await kvPut(env, 'bclog:' + cc, log.slice(0, 30));
    await logIt(env, 'broadcast', 0, cc + ' ' + ch + ' tg ' + sent + '/' + toT.length + ' mail ' + msent + '/' + toM.length); return { ok: true, sent, fail, msent, mfail } }
let BCT = 0;
async function bcPlanTick(env, B) { let P = null; try { P = await env.DB.prepare("SELECT * FROM bc_plan WHERE st IN ('plan','run') AND at <= ? ORDER BY at LIMIT 1").bind(Date.now()).first() } catch (e) { return { skip: 'no table' } } if (!P) return { none: 1 };
  const d = JSON.parse(P.data || '{}');
  if (d.efir && !Array.isArray(d.uids)) { const e = await efGet(env, d.efir); if (!e || e.del || ['done', 'rec'].includes(e.status) || (d.kind !== 'efir-s' && e.status === 'live')) { await env.DB.prepare("UPDATE bc_plan SET st='cancel' WHERE id=?").bind(P.id).run(); return { cancel: P.id } }
    d.uids = await efAudUids(env, e); await env.DB.prepare('UPDATE bc_plan SET data=? WHERE id=?').bind(JSON.stringify(d), P.id).run() }
  const U = d.uids || [], part = U.slice(P.done, P.done + 30), s = { role: P.role, cid: P.cid };
  if (!part.length) { await env.DB.prepare("UPDATE bc_plan SET st='done' WHERE id=?").bind(P.id).run(); return { done: P.id } }
  await env.DB.prepare("UPDATE bc_plan SET st='run', done=? WHERE id=? AND done=?").bind(P.done + part.length, P.id, P.done).run(); /* сначала сдвигаем — повторный тик не отправит ту же пачку */
  const r = await bcSend(env, s, { c: P.cc, uids: part, ch: d.ch, subj: d.subj, text: d.text, btns: d.btns, bid: 'plan' + P.id, noTg: d.noTg });
  await env.DB.prepare("UPDATE bc_plan SET sent=sent+?, fail=fail+?, msent=msent+?, st=CASE WHEN done>=? THEN 'done' ELSE st END WHERE id=?").bind(r.sent | 0, (r.fail | 0) + (r.mfail | 0), r.msent | 0, U.length, P.id).run();
  if (P.done + part.length >= U.length) await logIt(env, 'bcplan-done', 0, P.cc + ' ' + P.id);
  return { id: P.id, part: part.length, r } }
function appScope(s, c) { if (s.role === 'admin') return CURATORS.find(x => x.id === c) ? c : (c === 'all' ? 'all' : CURATORS[0].id); return s.cid }
const APPC = {}; /* кэш списка в памяти изолята на 30 с: переключение и повторные запросы мгновенные */
/* 04.11 (D1 на 93% дневного лимита чтения): тяжёлые сводки (ученики куратора, «Сегодня», скорость ответов) считаются раз в ~90 с на всю школу,
   а не в каждом изоляте: готовый результат лежит одной строкой в kv (чтение = 1 строка вместо тысяч). */
const MEMO = {};
async function memo(env, key, ttl, fn) { const now = Date.now(), m = MEMO[key]; if (m && now - m.at < ttl * 1e3) return m.v;
  try { const r = await env.DB.prepare('SELECT v FROM kv WHERE k=?').bind('memo:' + key).first(); if (r) { const o = JSON.parse(r.v); if (now - o.at < ttl * 1e3) { MEMO[key] = o; return o.v } } } catch (e) {}
  const v = await fn(); const o = { at: now, v }; MEMO[key] = o;
  try { await env.DB.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)').bind('memo:' + key, JSON.stringify(o)).run() } catch (e) {} return v }
async function memoClear(env, pre) { for (const k in MEMO) if (k.startsWith(pre)) delete MEMO[k]; try { await env.DB.prepare('DELETE FROM kv WHERE k LIKE ?').bind('memo:' + pre + '%').run() } catch (e) {} }
async function appStudents(env, cid) { return memo(env, 'stu:' + cid, 90, () => appStudents0(env, cid)) }
async function appStudents0(env, cid) { /* D1 на бесплатном тарифе — до 50 запросов за вызов, поэтому всё одним набором запросов */
  const D = await loadData(env); const byH = {}; for (const r of D.rows) byH[r.h] = r;
  const q = cid === 'all' ? env.DB.prepare('SELECT * FROM student') : env.DB.prepare('SELECT * FROM student WHERE curator=?').bind(cid);
  const today = dayStr(), wk = addDays(today, -6);
  const [rs, ts, ls, us, ws, as] = await env.DB.batch([q,
    env.DB.prepare('SELECT uid, SUM(site)+SUM(video) t FROM time WHERE day>=? GROUP BY uid').bind(wk),
    env.DB.prepare('SELECT uid, MAX(day) d FROM time WHERE site>0 OR video>0 GROUP BY uid'),
    env.DB.prepare('SELECT chat, username FROM tg_user'),
    env.DB.prepare('SELECT uid, MIN(since) since FROM cwait GROUP BY uid'),
    /* 04.11 (Роман: «баллы за неделю есть, а "был" пусто»): у части учеников учёт времени до сервера не доходит (блокировщики sendBeacon, кабинет внутри приложения) — «был» = позднее из учёта времени и последнего входа с ключом (authuid.seen) */
    env.DB.prepare('SELECT uid, seen FROM authuid WHERE seen IS NOT NULL')]);
  const T = {}, L = {}, U = {}, W = {}; for (const x of ts.results || []) T[x.uid] = x.t | 0; for (const x of ls.results || []) L[x.uid] = x.d; for (const x of (as && as.results) || []) { const t = Date.parse(x.seen); if (!t) continue; const d = dayStr(new Date(t)); if (!L[x.uid] || d > L[x.uid]) L[x.uid] = d }
  for (const x of us.results || []) U[x.chat] = x.username; for (const x of ws.results || []) if (x.uid) W[x.uid] = x.since;
  /* 04.11 (Роман): поиск по e-mail во вкладке «Ученики» — почта из выгрузки пользователей GetCourse (gc_name.email, обновляется раз в день) */
  const EM = {}; try { for (const x of await qAll(env.DB.prepare('SELECT uid, email FROM gc_name WHERE email IS NOT NULL'))) EM[x.uid] = x.email } catch (e) {}
  const out = [];
  const priv = !!(D.rows.length && D.rows[0].uid != null), byU = {}; if (priv) for (const r of D.rows) byU[String(r.uid)] = r;
  const MU = {}; for (const m of (D.hw_multi || [])) if (m.status !== 'accepted') MU[+m.uid] = (MU[+m.uid] || 0) + 1;
  const GS = await gcStaffSet(env), SR = (rs.results || []).filter(s => !isStaffUid(env, s.uid) && !GS.has(+s.uid)), have = {}; for (const s of SR) have[s.uid] = 1;
  /* админ «Все»: весь поток из рейтинга, даже без записи в базе и без куратора; без строк «id …» у тех, кого нет в рейтинге и кто не заходил */
  if (cid === 'all' && priv) for (const x of D.rows) if (x.uid != null && !have[+x.uid] && !isStaffUid(env, x.uid) && !GS.has(+x.uid)) { have[+x.uid] = 1; SR.push({ uid: +x.uid, name: x.name, curator: null, tg_chat: null }) }
  for (const s of SR) { const r = (priv ? byU[String(s.uid)] : byH[await hashUid(s.uid)]) || null; if (cid === 'all' && !r && !s.curator) continue; /* «Все» у админа = текущий поток (рейтинг) + все, у кого есть куратор; старые потоки из базы не показываем */
    out.push({ uid: s.uid, name: (r && r.name) || s.name || ('id ' + s.uid), cur: s.curator, tar: r && r.tar || null, acc: r && r.acc || null,
      place: r && r.place || null, pts: r ? r.pts | 0 : null, week: r ? r.week | 0 : null, lessons: r ? r.lessons | 0 : null, hw: r ? r.hw | 0 : null, ontime: r && r.ontime != null ? r.ontime : null,
      t7: T[s.uid] || 0, last: L[s.uid] || null, tg: !!s.tg_chat, tgu: s.tg_chat && U[s.tg_chat] || null, tgid: s.tg_chat || null, wait: W[s.uid] || null, multi: MU[s.uid] || 0, em: EM[s.uid] || null }) }
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
    await logIt(env, 'app-login-' + (path.endsWith('fs') ? 'fs' : 'tg'), uid, role);
    /* 07.11 Эфиры Э5 (§0.3): модератор (uid в kv efir_mods, не админ и не куратор) — сессия ученика, страница эфиров получает mod:1 и открывает пульт модератора (права проверяет сервер) */
    const mod = role === 'student' && path.endsWith('fs') ? await (async () => { const L = await kvGet(env, 'efir_mods').catch(() => null); return Array.isArray(L) && L.map(String).includes(String(uid)) })() : false;
    return ajson(Object.assign({ ok: true, token: tok, role }, mod ? { mod: 1 } : {})) }
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
  /* 04.11: диагностика «был на сайте» (админ) */
  if (path === '/app/api/dbg/d1') { if (s.role !== 'admin') return ajson({ ok: false }, 403); const h = +(u.searchParams.get('h') || 24);
    const rs = (await env.DB.prepare('SELECT at, j FROM d1s WHERE at > ?').bind(Date.now() - h * 3600e3).all()).results || []; const T = {}; let from = 0;
    for (const x of rs) { if (!from || x.at < from) from = x.at; const o = JSON.parse(x.j); for (const q in o) { const t = T[q] || (T[q] = [0, 0, 0]); for (let i = 0; i < 3; i++) t[i] += o[q][i] } }
    for (const q in DBS) { const t = T[q] || (T[q] = [0, 0, 0]); for (let i = 0; i < 3; i++) t[i] += DBS[q][i] }
    const L = Object.entries(T).map(([q, v]) => ({ q, r: v[0], w: v[1], n: v[2] })); const by = u.searchParams.get('by') === 'w' ? 'w' : 'r'; L.sort((a, b) => b[by] - a[by]);
    return ajson({ ok: true, from: from ? new Date(from).toISOString() : null, rows: rs.length, read: L.reduce((t, x) => t + x.r, 0), written: L.reduce((t, x) => t + x.w, 0), top: L.slice(0, 40) }) }
  if (path === '/app/api/dbg/seen') { if (s.role !== 'admin') return ajson({ ok: false }, 403); const id = +u.searchParams.get('u'); const [a1, t1, s1] = await env.DB.batch([env.DB.prepare('SELECT * FROM authuid WHERE uid=?').bind(id), env.DB.prepare('SELECT COUNT(*) n, MAX(day) d, SUM(site) s FROM time WHERE uid=?').bind(id), env.DB.prepare('SELECT uid, curator, tg_chat IS NOT NULL tg FROM student WHERE uid=?').bind(id)]);
    return ajson({ ok: true, auth: (a1.results || [])[0] || null, time: (t1.results || [])[0] || null, st: (s1.results || [])[0] || null }) }
  if (path === '/app/api/students') return ajson(Object.assign({ ok: true, c }, await appStudents(env, c)));
  if (path === '/app/api/stats') { const st = await curStats(env, Math.min(90, Math.max(1, +u.searchParams.get('days') || 14))); return ajson({ ok: true, c, curators: c === 'all' ? st.curators : st.curators.filter(x => x.id === c) }) }
  if (path === '/app/api/hours' && req.method === 'POST') { const o = await req.json().catch(() => ({})); const cc = appScope(s, o.c);
    /* 04.11: расписание по дням (sched: 7 × [с, до] | null, 0 — Вс) */
    if (Array.isArray(o.sched) && o.sched.length === 7 && cc !== 'all') { const sc = o.sched.map(d => Array.isArray(d) && d[0] >= 0 && d[1] <= 24 && d[0] < d[1] ? [d[0] | 0, d[1] | 0] : null); const on = sc.map((x, i) => x ? i : -1).filter(i => i >= 0);
      if (!on.length) return ajson({ ok: false, err: 'Отметь хотя бы один рабочий день' }, 400); const first = sc[[1, 2, 3, 4, 5, 6, 0].find(i => sc[i])];
      await kvPut(env, 'hsched:' + cc, sc); await kvPut(env, 'hours:' + cc, first); await kvPut(env, 'hdays:' + cc, on); delete CHC[cc]; for (const k in CCC) delete CCC[k]; return ajson({ ok: true }) }
    if (cc === 'all' || !(o.from >= 0 && o.to <= 24 && o.from < o.to)) return ajson({ ok: false }, 400);
    await kvPut(env, 'hours:' + cc, [o.from | 0, o.to | 0]);
    if (Array.isArray(o.days)) { const d = [...new Set(o.days.map(Number).map(x => x === 7 ? 0 : x).filter(x => x >= 0 && x <= 6))]; /* пульт шлёт Вс=7 */ if (d.length) await kvPut(env, 'hdays:' + cc, d) } return ajson({ ok: true }) }
  if (path === '/app/api/bclog') return ajson({ ok: true, log: (await kvGet(env, 'bclog:' + c)) || [] });
  /* 04.11 (Роман): рассылка в Telegram, на почту или туда и туда (ch: tg | mail | both). Почта — из выгрузки GetCourse (gc_name.email), письмо в стиле писем школы, отписка — mail_off */
  if (path === '/app/api/broadcast' && req.method === 'POST') { const o = await req.json().catch(() => ({})); const r = await bcSend(env, s, o); return ajson(r, r.ok === false ? 400 : 200) }
  /* 04.11 (Роман): запланированные рассылки — на день и время (МСК). Хранятся в bc_plan, отправляет bcPlanTick пачками по 35 (крон + любые запросы к серверу, не чаще раза в минуту) */
  if (path === '/app/api/bcplan' && req.method === 'POST') { const o = await req.json().catch(() => ({})); await ensure(env); const cc = appScope(s, o.c), at = +o.at || 0, text = String(o.text || '').trim().slice(0, 3000);
    if (!text) return ajson({ ok: false, err: 'Пустое сообщение' }, 400); if (!(at > Date.now() + 60e3) || at > Date.now() + 90 * 864e5) return ajson({ ok: false, err: 'Время — в будущем, не дальше 90 дней' }, 400);
    const uids = (Array.isArray(o.uids) ? o.uids : []).map(Number).filter(okUid).slice(0, 2000); if (!uids.length) return ajson({ ok: false, err: 'Отметь получателей' }, 400);
    const d = { uids, ch: ['tg', 'mail', 'both'].includes(o.ch) ? o.ch : 'tg', subj: String(o.subj || '').slice(0, 120), text, btns: Array.isArray(o.btns) ? o.btns.slice(0, 5) : [], noTg: o.noTg | 0 };
    const r = await env.DB.prepare("INSERT INTO bc_plan (cc, role, cid, at, data, st, done, sent, fail, msent, created) VALUES (?,?,?,?,?,'plan',0,0,0,0,?) RETURNING id").bind(cc, s.role, s.cid || null, at, JSON.stringify(d), Date.now()).first();
    await logIt(env, 'bcplan-new', 0, cc + ' ' + new Date(at).toISOString() + ' ' + uids.length); return ajson({ ok: true, id: r && r.id }) }
  if (path === '/app/api/bcplan') { const cc = appScope(s, u.searchParams.get('c'));
    const L = await qAll(env.DB.prepare("SELECT id, at, data, st, done, sent, fail, msent FROM bc_plan WHERE cc=? AND st != 'cancel' AND (st IN ('plan','run') OR at > ?) ORDER BY at LIMIT 30").bind(cc, Date.now() - 3 * 864e5));
    return ajson({ ok: true, plans: L.map(x => { const d = JSON.parse(x.data || '{}'); return { id: x.id, at: x.at, st: x.st, n: (d.uids || []).length, efir: d.efir && !Array.isArray(d.uids) ? d.efir : null, ch: d.ch, text: String(d.text || '').slice(0, 300), subj: d.subj || '', done: x.done, sent: x.sent, fail: x.fail, msent: x.msent } }) }) }
  if (path === '/app/api/bcplan/cancel' && req.method === 'POST') { const o = await req.json().catch(() => ({})); const cc = appScope(s, o.c);
    const r = await env.DB.prepare("UPDATE bc_plan SET st='cancel' WHERE id=? AND cc=? AND st='plan'").bind(+o.id || 0, cc).run(); return ajson({ ok: !!(r.meta && r.meta.changes) }) }
  /* 03.11 (кабинет куратора, этап 2): панель ученика в пульте — всё по одному ученику одним D1-batch: место по дням (snap, 15 дн), последний открытый урок (lv) и сколько уроков открыто,
     время за 7 дней (time: сайт / видео), последний заход на сайт и в приложение (ev), оценки куратору (chat_rate + chat_fb), проверенные ДЗ (cur_hw), ожидание ответа (cwait). Куратор — только свой ученик */
  if (path === '/app/api/student') { const uid = +u.searchParams.get('u'); if (!okUid(uid)) return ajson({ ok: false, err: 'u' }, 400);
    const st = await env.DB.prepare('SELECT s.uid, s.name, s.curator, s.tg_chat, t.username tgu FROM student s LEFT JOIN tg_user t ON t.chat=s.tg_chat WHERE s.uid=?').bind(uid).first();
    if (s.role !== 'admin' && (!st || st.curator !== s.cid)) return ajson({ ok: false, err: 'Это не твой ученик' }, 403);
    const D = await loadData(env), priv = !!(D.rows.length && D.rows[0].uid != null), h0 = await hashUid(uid), r = (priv ? D.rows.find(x => String(x.uid) === String(uid)) : D.rows.find(x => x.h === h0)) || null;
    const today = dayStr(), wk = addDays(today, -6), hh = (r && r.h) || h0;
    const Q = [env.DB.prepare('SELECT day, place, pts FROM snap WHERE h=? AND day>=? ORDER BY day').bind(hh, addDays(today, -14)),
      env.DB.prepare('SELECT lesson, at FROM lv WHERE uid=? ORDER BY at DESC LIMIT 1').bind(uid),
      env.DB.prepare('SELECT COUNT(*) n FROM lv WHERE uid=?').bind(uid),
      env.DB.prepare('SELECT COALESCE(SUM(site),0) site, COALESCE(SUM(video),0) video FROM time WHERE uid=? AND day>=?').bind(uid, wk),
      env.DB.prepare('SELECT MAX(day) d FROM time WHERE uid=? AND (site>0 OR video>0)').bind(uid),
      env.DB.prepare('SELECT MAX(day) d, COALESCE(SUM(CASE WHEN day>=? THEN n ELSE 0 END),0) n7 FROM ev WHERE uid=?').bind(wk, uid),
      env.DB.prepare('SELECT r.mid, r.cid, r.stars, r.at, f.reasons, f.text FROM chat_rate r LEFT JOIN chat_fb f ON f.mid=r.mid WHERE r.uid=? ORDER BY r.at DESC LIMIT 40').bind(uid),
      env.DB.prepare('SELECT status, COUNT(*) n, COALESCE(SUM(pts),0) p FROM cur_hw WHERE uid=? AND COALESCE(fix,0)=0 GROUP BY status').bind(uid),
      env.DB.prepare('SELECT lesson, status, pts, at FROM cur_hw WHERE uid=? AND COALESCE(fix,0)=0 ORDER BY at DESC LIMIT 8').bind(uid),
      env.DB.prepare('SELECT MIN(since) since FROM cwait WHERE uid=?').bind(uid)];
    let R; try { R = await env.DB.batch(Q) } catch (e) { R = []; for (const q of Q) { try { R.push(await q.all()) } catch (x) { R.push({ results: [] }) } } } /* ev / lv / cur_hw.fix могут ещё не существовать */
    const A = i => (R[i] && R[i].results) || [], F = i => A(i)[0] || {}, L = F(1), lm = L.lesson ? lessonMap(D)[+L.lesson] : null, cn = c => c ? ((CURATORS.find(x => x.id === c) || {}).name || c) : null;
    const hs = {}; for (const x of A(7)) hs[x.status] = { n: x.n | 0, p: x.p | 0 };
    return ajson({ ok: true, uid, name: (r && r.name) || (st && st.name) || ('id ' + uid), cur: (st && st.curator) || null, curName: cn(st && st.curator), tar: (r && r.tar) || null, acc: (r && r.acc) || null,
      place: (r && r.place) || null, pts: r ? r.pts | 0 : null, week: r ? r.week | 0 : null, lessons: r ? r.lessons | 0 : null, hw: r ? r.hw | 0 : null, total: D.total_lessons || null, n: D.n || null,
      tg: !!(st && st.tg_chat), tgu: (st && st.tgu) || null, snap: A(0).map(x => ({ d: x.day, p: x.place | 0, s: x.pts | 0 })),
      lv: L.lesson ? { id: +L.lesson, at: L.at || null, t: lm ? lm.t : null, mod: lm ? lm.mod : null } : null, lvn: F(2).n | 0,
      t7: { site: F(3).site | 0, video: F(3).video | 0 }, site_last: F(4).d || null, app_last: F(5).d || null, app7: F(5).n7 | 0,
      rate: A(6).map(x => ({ mid: x.mid, cur: cn(x.cid), stars: x.stars | 0, at: x.at, reasons: x.reasons || null, text: x.text || null })),
      hwst: hs, hwl: A(8).map(x => ({ lesson: x.lesson || '', st: x.status, pts: x.pts | 0, at: x.at })), wait: F(9).since || null }) }
  /* 03.11: «Сегодня» — сигналы и риск (todayOut); отметки «Обработано / Отложить» и «Вернуть» — только по своим ученикам из сигналов */
  if (path === '/app/api/today') return ajson(Object.assign({ ok: true, c }, await todayOut(env, c)));
  if ((path === '/app/api/today/ack' || path === '/app/api/today/unack') && req.method === 'POST') { const o = await req.json().catch(() => ({})), cc = appScope(s, o.c), uid = +o.uid;
    const ks = [...new Set((Array.isArray(o.k) ? o.k : [o.k]).map(String))].filter(k => k in SIG_ORD); if (!okUid(uid) || !ks.length) return ajson({ ok: false, err: 'uid, k' }, 400);
    await sigAckEnsure(env); const ph = ks.map(() => '?').join(',');
    if (path.endsWith('unack')) { await env.DB.prepare('DELETE FROM sig_ack WHERE cid=? AND uid=? AND k IN (' + ph + ')').bind(cc, uid, ...ks).run(); return ajson({ ok: true }) }
    const it = ((await todayBase(env, cc)).items || []).find(x => +x.uid === uid); if (!it) return ajson({ ok: false, err: 'Сигнала по этому ученику уже нет' }, 404);
    const until = Math.max(0, Math.min(Math.round(+o.until || 0), msNow() + 60 * 864e5)), at = msNow(), sv = k => { const g = it.sig.find(y => y.k === k); return g ? g.sv : '' };
    await env.DB.batch(ks.map(k => env.DB.prepare('INSERT INTO sig_ack (cid, uid, k, until, at, sv) VALUES (?,?,?,?,?,?) ON CONFLICT(cid, uid, k) DO UPDATE SET until=excluded.until, at=excluded.at, sv=excluded.sv').bind(cc, uid, k, until, at, sv(k))));
    await logIt(env, 'sig-ack', uid, cc + ' ' + ks.join(',') + (until ? ' до ' + new Date(until).toISOString().slice(0, 16) : '')); return ajson({ ok: true, at }) }
  /* 03.11 этап 3: ИИ «Что происходит» в панели ученика — только по открытию закладки «Сводка»; куратор — только свой ученик */
  if (path === '/app/api/ai/student' && req.method === 'POST') { const o = await req.json().catch(() => ({})), uid = +o.u; if (!okUid(uid)) return ajson({ ok: false, err: 'u' }, 400);
    const st = await env.DB.prepare('SELECT curator FROM student WHERE uid=?').bind(uid).first(); if (s.role !== 'admin' && (!st || st.curator !== s.cid)) return ajson({ ok: false, err: 'Это не твой ученик' }, 403);
    const cc = s.role === 'admin' ? (st && CURATORS.some(x => x.id === st.curator) ? st.curator : 'all') : s.cid;
    const r = await stuAi(env, cc, uid, { fresh: !!o.fresh }); if (r.err) { await logIt(env, 'ai-stu-err', uid, r.err + (r.raw ? ' · ' + r.raw.slice(0, 200) : '')); return ajson(Object.assign({ ok: false, err: r.err }, s.role === 'admin' && r.raw ? { raw: r.raw } : {})) } if (!r.cached) await logIt(env, 'ai-stu', uid, cc);
    return ajson({ ok: true, what: r.what, step: r.step, draft: r.draft, k: r.k, at: r.at, cached: !!r.cached }) }
  if (path === '/app/api/ai/recs') { const r = await aiRecs(env, c, u.searchParams.get('fresh') === '1'); return ajson(Object.assign({ ok: true }, r)) }
  if (path === '/app/api/ai/bc' && req.method === 'POST') { const o = await req.json().catch(() => ({})); const cc = appScope(s, o.c), A = await curAlerts(env, cc), D = await loadData(env);
    const goal = String(o.goal || '').trim().slice(0, 600), draft = String(o.draft || '').trim().slice(0, 3000);
    const user = (draft ? 'Улучши черновик куратора: сделай живее, короче и понятнее, сохрани смысл и все факты. Черновик:\n' + draft : 'Напиши сообщение-рассылку.') + (goal ? '\nЗадача куратора: ' + goal : draft ? '' : '\nЗадачи нет — напиши мягкое сообщение, чтобы вернуть учеников к урокам и ДЗ.')
      + '\n\n' + audInfo(A, o.aud, o.uids, D.total_lessons) + (o.mail ? '\n\nСообщение уйдёт и письмом. Первой строкой напиши тему письма в формате «Тема: …» (до 60 символов, без кавычек и эмодзи, цепляет и понятна без письма), затем пустая строка и текст сообщения.' : '\n\nВерни только текст сообщения.');
    /* 04.11 (Роман): одно задание для ИИ — и тема письма, и текст. Пустой ответ (бывает в режиме «с темой») — до 2 повторов */
    let txt = '', subj = null, raw = '';
    for (let i = 0; i < 3 && !txt; i++) { const r = await aiText(env, AI_BC_SYS, user, 900); if (r.err) { if (i === 2) return ajson({ ok: false, err: r.err }); continue }
      raw = String(r.text || ''); let t = String(r.text || '').replace(/^\s+/, ''); subj = null; const sm = t.match(/^\**\s*Тема(?: письма)?\s*:\s*\**\s*([^\n]+)\n*/i); if (sm) { subj = sm[1].replace(/[«»"*]/g, '').trim().slice(0, 120); t = t.slice(sm[0].length) }
      txt = cleanAi(t); if (txt.length < 20) { await logIt(env, 'ai-bc-empty', 0, String(r.text || '').slice(0, 200)); if (i < 2) txt = '' } }
    await logIt(env, 'ai-bc', 0, cc + ' ' + (o.aud || 'all') + (o.mail ? ' mail' : ''));
    if (!txt) return ajson({ ok: false, err: 'Нейросеть ответила пустым текстом — нажми ещё раз' });
    return ajson(Object.assign({ ok: true, text: txt, subj }, o.dbg ? { raw: raw.slice(0, 600) } : {})) }
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
  /* 03.11 (Кирилл П.): GetCourse пропустил ученика дальше стоп-анкеты (засчитал ответ на задание анкеты), а опроса нет — анкета пройдена, если после неё пройдено ≥2 урока части */
  for (const m of modules) for (const p of m.parts) p.lessons.forEach((l, i) => { if (l.kind === 'anketa' && !l.done && p.lessons.slice(i + 1).filter(x => x.kind === 'lesson' && x.done).length >= 2) l.done = true });
  const seq = [], opn = l => !l.at || Date.parse(l.at) <= now; for (const m of modules) if (m.access) for (const p of m.parts) p.lessons.forEach((l, i) => seq.push({ m, p, l, i }));
  let last = -1; seq.forEach((x, i) => { if (x.l.done) last = i }); const pick = x => { if (!x) return null; const s0 = x.p.lessons.slice(0, x.i).find(l => l.stop && !l.done && opn(l)); return { module: x.m.id, part: x.p.id, lesson: (s0 || x.l).id } };
  const cur = pick(last >= 0 ? seq.slice(last + 1).find(x => opn(x.l) && !x.l.done) : seq.find(x => opn(x.l) && !x.l.done)); /* 28.10: впереди всё пройдено — не отправляем назад к пропущенным урокам Модуля 00, «Дальше по курсу» не показываем */
  const oth = r.oth || {}, otha = r.otha || {}, other = (D.other || []).filter(o => oth[String(o.id)] != null || otha[String(o.id)] != null).map(o => { /* 01.11: otha — срок доступа к тренингу (сборщик): дата | 'inf' | 'dead' */ const it = (o.items || []).map(i => ({ id: i.id, t: i.t, done: done.has(+i.id) || LV.has(+i.id) })); /* цен нет — не отдаём */
    return { id: o.id, title: o.title, key: o.key || null, kind: o.kind || 'bonus', rec: o.kind === 'rec', lessons: o.lessons | 0 || it.length, done: it.length ? it.filter(i => i.done).length : Math.min(oth[String(o.id)] | 0, o.lessons | 0 || 1e9), acc: (v => v === 'inf' ? 'inf' : v === 'dead' ? 'dead' : v ? accOf(v, now) : null)(otha[String(o.id)]), items: it } });
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
  const D = await loadData(env), studs = ((await env.DB.prepare('SELECT s.uid, s.name, s.curator, t.name tgname, t.username tgu, (SELECT username FROM stu_tg WHERE uid=s.uid) stu, s.tg_chat tgc FROM student s LEFT JOIN tg_user t ON t.chat=s.tg_chat').all()).results || []), byU = {}, GN = {};
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
    const tgn = String(s.tgu || s.stu || '').replace(/^@+/, '').replace(/[^\w]/g, '').slice(0, 40); /* 02.11: Telegram ученика для ленты ответов — куратор пишет ему напрямую */
    out.push({ uid, name: name || s.name || GN[uid] || s.tgname || null, tg: tgn || null, tg_bot: s.tgc ? 1 : 0, tar: tar || null, cur: cid, curName: cid ? (CN[cid] || cid) : null, stream: strm || D.stream || 'AI-креатор 2.0', place: place || null, outside: strm ? 1 : 0, total: tot, n: m.n || 0, last: m.last || null, orders: o.n || 0, active: o.act || 0,
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
  /* 01.11: картинка «Поделиться картой» по ссылке — для сторис и сообщения с фото в чат (Telegram забирает её сам). Хранится 3 дня */
  const shm = path.match(/^\/bank\/share\/f\/([0-9a-f]{20})\.jpg$/);
  if (shm) { const r = await env.DB.prepare('SELECT data FROM share_img WHERE id=?').bind(shm[1]).first(); if (!r) return new Response('not found', { status: 404 });
    const b = Uint8Array.from(atob(r.data), c => c.charCodeAt(0)); return new Response(b, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=259200' } }) }
  if (W.forbidden) return json(req, { ok: false, err: 'Это не твой ученик' }, 403);
  const uid = W.uid; if (!uid) return deny(req);
  if (W.ro && path !== '/bank/summary') return json(req, { ok: false, err: 'Команда школы видит банк ученика только для чтения, без контактов клиентов и файлов' }, 403);
  /* 01.11: «В чат» — только картинка: сообщение-фото (подпись и кнопка «Хочу так же» внутри него) через savePreparedInlineMessage, в приложении tg.shareMessage(id) */
  if ((path === '/bank/share/img' || path === '/bank/share/msg' || path === '/bank/share/tg') && req.method === 'POST') { const o = await body(), m = String(o.data || '').match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (!m || m[1].length > 1.8e6) return json(req, { ok: false, err: 'Картинка не подошла' }, 400);
    const id = rnd().replace(/[^0-9a-f]/g, '').padEnd(20, '0').slice(0, 20), now = Date.now();
    await env.DB.batch([env.DB.prepare('DELETE FROM share_img WHERE at < ?').bind(now - 3 * 864e5), env.DB.prepare('INSERT OR REPLACE INTO share_img (id, uid, data, at) VALUES (?,?,?,?)').bind(id, uid, m[1], now)]);
    const img = u.origin + '/bank/share/f/' + id + '.jpg'; if (path === '/bank/share/img') return json(req, { ok: true, url: img });
    /* 01.11: сайт (нет Telegram WebApp) — бот присылает картинку ученику в личку, оттуда он пересылает её в любой чат */
    if (path === '/bank/share/tg') { const st = await env.DB.prepare('SELECT tg_chat FROM student WHERE uid=?').bind(uid).first();
      if (!st || !st.tg_chat) return json(req, { ok: false, err: 'nolink', url: img });
      const lk = /^https:\/\/t\.me\/oduvanov_school_bot(\?start=c[0-9a-f]{10})?$/.test(String(o.link || '')) ? String(o.link) : 'https://t.me/oduvanov_school_bot';
      const fd = new FormData(); fd.append('chat_id', String(st.tg_chat)); fd.append('caption', String(o.caption || '').slice(0, 900)); fd.append('reply_markup', JSON.stringify({ inline_keyboard: [[{ text: 'Хочу так же', url: lk }]] }));
      fd.append('photo', new Blob([Uint8Array.from(atob(m[1]), c => c.charCodeAt(0))], { type: 'image/jpeg' }), 'card.jpg'); /* файлом, а не ссылкой — Telegram получает картинку целиком */
      const r1 = await fetch('https://api.telegram.org/bot' + env.TG_TOKEN + '/sendPhoto', { method: 'POST', body: fd }), j = await r1.json().catch(() => ({ ok: false }));
      if (!j.ok) await logIt(env, 'tg-err', uid, 'share/tg ' + (j.description || r1.status));
      return json(req, j && j.ok ? { ok: true } : { ok: false, err: (j && j.description) || 'tg', url: img }) }
    const tu = await tgInitCheck(env, String(o.init || '')); if (!tu || !tu.id) return json(req, { ok: false, err: 'init', url: img }, 401);
    const link = /^https:\/\/t\.me\/oduvanov_school_bot(\?start=c[0-9a-f]{10})?$/.test(String(o.link || '')) ? String(o.link) : 'https://t.me/oduvanov_school_bot';
    /* 02.11: по ссылке (photo_url) Telegram сохранял картинку не целиком — в чате половина серая. Теперь сначала загружаем файл в Telegram сами
       (тихо в личку ученику с ботом, сообщение сразу удаляем) и отдаём готовый file_id; не вышло — как раньше, по ссылке */
    let fid = null; try { const bytes = Uint8Array.from(atob(m[1]), c => c.charCodeAt(0)), fd = new FormData(); fd.append('chat_id', String(tu.id)); fd.append('disable_notification', 'true'); fd.append('photo', new Blob([bytes], { type: 'image/jpeg' }), 'card.jpg');
      const r0 = await fetch('https://api.telegram.org/bot' + env.TG_TOKEN + '/sendPhoto', { method: 'POST', body: fd }), j0 = await r0.json().catch(() => ({ ok: false }));
      if (j0.ok && j0.result) { const ph = j0.result.photo || []; fid = ph.length ? ph[ph.length - 1].file_id : null; await tg(env, 'deleteMessage', { chat_id: tu.id, message_id: j0.result.message_id }) } else await logIt(env, 'tg-err', uid, 'share sendPhoto ' + (j0.description || r0.status)) } catch (e) {}
    const kb = { inline_keyboard: [[{ text: 'Хочу так же', url: link }]] }, cap = String(o.caption || '').slice(0, 900);
    const j = await tg(env, 'savePreparedInlineMessage', { user_id: tu.id, allow_user_chats: true, allow_bot_chats: true, allow_group_chats: true, allow_channel_chats: true,
      result: fid ? { type: 'photo', id: id, photo_file_id: fid, caption: cap, reply_markup: kb } : { type: 'photo', id: id, photo_url: img, thumbnail_url: img, caption: cap, reply_markup: kb } });
    return json(req, j && j.ok && j.result ? { ok: true, id: j.result.id, url: img } : { ok: false, err: (j && j.description) || 'tg', url: img }) }
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
  'CREATE TABLE IF NOT EXISTS share_img (id TEXT PRIMARY KEY, uid INTEGER, data TEXT, at INTEGER)',
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
async function curDays(env, cid) { const h = await curHours(env, cid); if (h.sched) return h.sched.map((x, i) => x ? i : -1).filter(i => i >= 0); const d = await kvGet(env, 'hdays:' + cid); return Array.isArray(d) && d.length ? d.map(Number).filter(x => x >= 0 && x <= 6) : [0, 1, 2, 3, 4, 5, 6] }
const daysTxt = d => d.length === 7 ? 'каждый день' : d.join() === '1,2,3,4,5' ? 'по будням' : d.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(x => WD[x]).join(', ');
const medOf = a => a.length ? a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)] : null;
/* 1.11 (Роман: «некорректно в сети куратор или нет»): «в сети» учитывает и дни, и часы; когда не в сети — пишем, когда ответит */
const WDF = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
function curOn(h, days, now = msk()) { const r = hOfDay(h, days, now.getUTCDay()); return !!r && now.getUTCHours() >= r[0] && now.getUTCHours() < r[1] }
function curNext(h, days, now = msk()) { if (curOn(h, days, now)) return null; const d0 = now.getUTCDay(), hr = now.getUTCHours();
  for (let i = 0; i < 8; i++) { const d = (d0 + i) % 7, r = hOfDay(h, days, d); if (!r) continue; if (i === 0 && hr >= r[0]) continue; return 'ответит ' + (i === 0 ? 'сегодня' : i === 1 ? 'завтра' : WDF[d]) + ' с ' + r[0] + ':00 МСК' } return null }
const CCC = {}; async function curCardC(env, cid) { const c = CCC[cid]; if (c && Date.now() - c.at < 60e3) return c.v; const v = await curCard(env, cid); CCC[cid] = { at: Date.now(), v }; return v }
async function curCard(env, cid) { const c = CURATORS.find(x => x.id === cid); if (!c) return null; const now = msk(), from = (msNow() / 1000 | 0) - 30 * 86400;
  const [h, days, photo, tgu] = await Promise.all([curHours(env, cid), curDays(env, cid), kvGet(env, 'curphoto:' + cid), curTg(env, cid)]);
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
/* 04.11 (Роман: «почти никто не ставит оценку»): через час после ответа куратора в чате, если ученик не оценил и куратор больше не писал, бот один раз просит оценить ответ (не чаще раза в 3 дня одному ученику, только 10–22 МСК) */
async function crAskJob(env, B) { const now = msNow(), hr = msk().getUTCHours(); if (hr < 10 || hr >= 22) return { skip: 'night' };
  const R = await qAll(env.DB.prepare("SELECT m.id, m.uid, m.cid, m.text, m.who, s.tg_chat FROM chat_msg m JOIN student s ON s.uid=m.uid WHERE m.dir='out' AND m.cid IS NOT NULL AND m.del=0 AND m.at BETWEEN ? AND ? AND s.tg_chat IS NOT NULL"
    + " AND NOT EXISTS (SELECT 1 FROM chat_rate r WHERE r.mid=m.id) AND NOT EXISTS (SELECT 1 FROM chat_msg n WHERE n.uid=m.uid AND n.id>m.id AND n.dir='out' AND n.del=0)"
    + " AND EXISTS (SELECT 1 FROM chat_msg q WHERE q.uid=m.uid AND q.dir='in' AND q.del=0 AND q.id<m.id AND q.at>m.at-259200000) ORDER BY m.id LIMIT 40").bind(now - 20 * 36e5, now - 36e5));
  let sent = 0; for (const m of R) { if (isStaffUid(env, m.uid)) continue; if (B && !B.ok(2)) break; const k = 'crask:' + m.uid, last = await kvGet(env, k); if (last && (last.mid === m.id || now - (last.at || 0) < 3 * 864e5)) continue;
    const c = CURATORS.find(x => x.id === m.cid), who = m.who || (c ? c.name : 'Куратор'), q = m.text ? '<blockquote>' + th(String(m.text).slice(0, 160)) + '</blockquote>\n' : '';
    try { await tgSend(env, m.tg_chat, '⭐ <b>' + nbt('Оцени ответ куратора') + '</b>\n' + q + th(who) + ' ответил' + fem(who) + ' тебе в' + NB + 'чате. Поставь оценку — это одна секунда, а' + NB + 'нам помогает делать поддержку лучше.', [crStars(m.id, 0)]); sent++; if (B) B.use(1) } catch (e) {}
    await kvPut(env, k, { mid: m.id, at: now }); await logIt(env, 'chat-rask', m.uid, m.cid + ' ' + m.id) }
  return { sent } }
const CR_LOW = ['Долго отвечал', 'Не помог', 'Отписка, без разбора', 'Непонятно объяснил', 'Грубо'];
async function chatNotify(env, o, msg) { const body = msg.text ? th(msg.text.slice(0, 1500)) : '📎 ' + (msg.file && /pdf/.test(msg.file.mime || '') ? 'файл' : 'фото');
  if (o.dir === 'in') { if (!o.cid) return; const ct = await env.DB.prepare('SELECT tg_id FROM cur_tg WHERE cid=?').bind(o.cid).first(); if (!ct || !ct.tg_id) return;
    const nm = await stuName(env, o.uid), via = o.via === 'bot' ? ' в боте' : '';
    const j = await tgSend(env, ct.tg_id, '💬 <b>' + th(nm) + ' написал' + fem(nm) + via + '</b>\n' + body, [[{ text: 'Ответить в чате', callback_data: 'chr:' + o.uid }], [{ text: 'Ответить в приложении', url: maLink(env, 'chat_' + o.uid) }], [{ text: 'Ответить на сайте', url: SITE + '/teach/control/stream?fs=chat&u=' + o.uid }]] /* 03.11 (Роман): куратор выбирает, где отвечать */);
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
/* 01.11 (макет «Поиск по платформе», одобрен): страницы кабинета в умном поиске — блок «Платформа». ic — иконка, act — подпись действия */
const SRCH_PAGES = {
  P_cur: { t: 'Мой куратор', d: 'кто твой куратор, его часы и статус, написать ему', href: '/teach/control/stream?fs=curator', act: 'Открыть', ic: 'user', k: 'куратор наставник проверяющий кто проверяет кто мой куратор поменять куратора' },
  P_chat: { t: 'Чат с куратором', d: 'вопросы по урокам и домашкам, ответ приходит и в Telegram', href: '/teach/control/stream?fs=curator', act: 'Написать', ic: 'chat', k: 'написать куратору чат сообщения вопрос по уроку вопрос по дз' },
  P_tech: { t: 'Технический специалист', d: 'установка программ и приложений, помощь с компьютером и телефоном · @Yark0s', href: TECH_TG, act: 'Написать', ic: 'tool', k: 'техподдержка техспец технический специалист установить программу фотошоп figma vpn не устанавливается компьютер телефон приложение не работает как установить' },
  P_care: { t: 'Служба заботы', d: 'оплата, рассрочка, возврат, доступы, вход в кабинет · @zabota_oduvanov', href: CARE, act: 'Написать', ic: 'heart', k: 'поддержка забота оплата возврат рассрочка доступ пропал не могу войти поддержка школы' },
  P_buy: { t: 'Мои покупки', d: 'доступы, сроки, тариф и бонусный счёт', href: '/sales/control/userProduct/my', act: 'Открыть', ic: 'key', k: 'доступ срок доступа до какого числа тариф покупки бонусы' },
  P_up: { t: 'Продлить доступ или повысить тариф', d: 'с зачётом уже оплаченного', href: '/teach/control/stream?fs=upgrade', act: 'Открыть', ic: 'up', k: 'продлить доступ повысить тариф премиум амазон апгрейд' },
  P_bank: { t: 'Мой банк и заказы', d: 'оплаты от клиентов, заказы и награды за рубежи', href: '/teach/control/stream?fs=bank', act: 'Открыть', ic: 'bank', k: 'банк заработок заказы клиенты оплаты деньги доход' },
  P_efir: { t: 'Эфиры', d: 'ближайшие эфиры и записи прошедших', href: '/teach/control/stream?fs=efir', act: 'Открыть', ic: 'live', k: 'эфир трансляция созвон запись эфира прямой эфир' },
  P_rate: { t: 'Рейтинг потока', d: 'места, баллы и звания', href: '/teach/control/stream/view/id/935952152', act: 'Открыть', ic: 'cup', k: 'рейтинг баллы место звание очки' },
  P_sched: { t: 'Расписание', d: 'когда открываются модули', href: '/teach/control/schedule', act: 'Открыть', ic: 'cal', k: 'расписание когда откроется модуль даты открытия' },
  P_notif: { t: 'Настройки уведомлений', d: 'какие письма и сообщения приходят', href: '/pl/notifications/settings/my', act: 'Открыть', ic: 'bell', k: 'уведомления письма рассылки отключить уведомления' },
  P_parent: { t: 'Отчёт для родителей', d: 'на почту или в Telegram, как часто и во сколько — настраивается в профиле', href: '/user/my/profile', act: 'Настроить', ic: 'user', k: 'отчёт родителям отчет для родителей мама папа прогресс родителям отправлять отчёт телеграм почта отписаться' },
  P_brep: { t: 'Отчёт по месяцам и выгрузка', d: 'оплаты, средний чек и сумма по месяцам; таблица CSV — в «Моём банке»', href: '/teach/control/stream?fs=bank', act: 'Открыть', ic: 'bank', k: 'отчёт по месяцам выгрузка csv таблица оплаты статистика заработка' },
  P_share: { t: 'Поделиться результатом', d: 'карточка со званием, баллами и достижениями для сторис и Telegram', href: '/user/my/profile', act: 'Открыть', ic: 'up', k: 'поделиться результатом сторис карточка достижения похвастаться поделиться картой банка' },
  P_home: { t: 'Мои курсы', d: 'все курсы и бонусы, к которым есть доступ', href: '/teach/control/stream', act: 'Открыть', ic: 'key', k: 'мои курсы тренинги главная список курсов обучение' },
  P_chats: { t: 'Чат на платформе', d: 'переписка с куратором на сайте', href: '/teach/control/stream?fs=chat', act: 'Открыть', ic: 'chat', k: 'чат на сайте сообщения переписка' },
  P_amz: { t: 'Повышение до Премиум Амазон', d: 'модуль про Amazon и первые клиенты от школы', href: '/povyshenie-premium-amazon', act: 'Открыть', ic: 'up', k: 'амазон amazon повысить премиум амазон доплата' },
  P_app: { t: 'Приложение школы в Telegram', d: 'уроки, чат с куратором и уведомления в телефоне', href: 'https://t.me/oduvanov_school_bot?startapp=learn', act: 'Открыть', ic: 'up', k: 'приложение телеграм бот мини-приложение телефон' },
  P_prof: { t: 'Профиль', d: 'имя, фото, телефон и пароль', href: '/user/my/profile', act: 'Открыть', ic: 'user', k: 'профиль имя фото аватар пароль сменить почту телефон' }
};
const SRCH_PTXT = 'Страницы платформы (кабинет школы):\n' + Object.keys(SRCH_PAGES).map(k => k + ' | ' + SRCH_PAGES[k].t + ' | ' + SRCH_PAGES[k].d + ' | ' + SRCH_PAGES[k].k).join('\n') + '\n\nСправка по отчётам (если спрашивают, как настроить — дай в answer короткие шаги):\n' + REPORTS_KB;
async function srchMe(env, uid) { if (!uid) return null; const o = {}; try { const D = await loadData(env), r = await rowFor(D, uid);
    if (r) { o.баллы = r.pts | 0; o.место = r.place + ' из ' + D.n; if (r.tar) o.тариф = r.tar; if (r.acc) { const ad = new Date(r.acc); if (!isNaN(ad)) { o.доступ_до = ad.toISOString().slice(0, 10); o.дней_доступа_осталось = Math.max(0, Math.ceil((ad - Date.now()) / 864e5)) } } } } catch (e) {}
  let cc = null; try { const s = await env.DB.prepare('SELECT curator FROM student WHERE uid=?').bind(uid).first(); if (s && s.curator) cc = await curCard(env, s.curator) } catch (e) {}
  o.куратор = cc ? cc.name + ', часы ' + cc.hours.from + ':00–' + cc.hours.to + ':00 МСК (' + cc.hours.txt + '), сейчас ' + (cc.online ? 'на связи' : 'не на связи' + (cc.hours.next ? ', ' + cc.hours.next : '')) : 'ещё не назначен';
  o.сегодня_мск = msk().toISOString().slice(0, 10); return { o, cc } }
/* 04.11 (Роман: «нужна ссылка на модуль или страницу, а не только урок; показывает 5 уроков из 20»): в корпусе ещё курсы (S…), модули (M…) и части (T…) — у каждого места свой адрес href */
const SRCH_STREAMS = [{ id: '935917158', t: 'AI-креатор 2.0 — весь курс', k: 'курс поток 2.0 программа все модули' }, { id: '935980906', t: 'AI-креатор 3.0 — Закрытая группа 25.11', k: 'закрытая группа 3.0 новый поток' }, { id: '935503317', t: 'Спринт', k: 'спринт бонус' }, { id: '935491414', t: 'Практикум по дизайну карточек', k: 'практикум бонус фотошоп' }, { id: '935490625', t: 'Design Camp', k: 'дизайн кэмп camp бонус' }];
function srchHit(R, sec, why) { const href = R.kind === 'module' || R.kind === 'part' ? '/teach/control/stream/view/id/' + R.id : R.kind === 'efir' ? '/teach/control/stream?fs=efir&e=' + R.id : '/pl/teach/control/lesson/view?id=' + R.id + (sec != null ? '#ecoSec=' + sec : '');
  return { kind: R.kind, id: R.id, module: R.kind === 'lesson' ? R.module + (R.part && R.part !== R.module ? ' · ' + R.part : '') : R.module, title: R.title, sec, why, href } }
/* точное совпадение по названиям (без ИИ) — модуль/часть/урок, где встречаются слова запроса */
function srchLocal(q, ref, max) { const st = w => w.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]/gu, '').slice(0, Math.max(3, Math.min(6, w.length - 1)));
  const W = String(q).split(/\s+/).map(st).filter(w => w.length >= 3 && !/^(моду|урок|част|ссыл|стра|курс|откр)/.test(w)); if (!W.length) return [];
  const out = []; for (const k in ref) { const R = ref[k], t = (R.title + ' ' + (R.kind === 'module' ? '' : R.module)).toLowerCase().replace(/ё/g, 'е'), n = W.filter(w => t.indexOf(w) >= 0).length; if (!n) continue;
    out.push({ k, i: out.length, sc: n / W.length * 10 + (R.kind === 'module' ? 3 : R.kind === 'part' ? 2 : 0) }) }
  return out.sort((a, b) => b.sc - a.sc || a.i - b.i).filter(x => x.sc >= 10).slice(0, max || 20).map(x => x.k) }
async function srchCorpus(env) { const D = await loadData(env), X = (await kvGet(env, 'srchidx')) || {}, L = [], ref = {};
  for (const c of SRCH_STREAMS) { const k = 'S' + c.id; ref[k] = { kind: 'module', id: c.id, module: 'Курс целиком', title: c.t }; L.push(k + ' | Курс целиком | ' + c.t + ' | ' + c.k) }
  for (const m of D.modules || []) { const mk = 'M' + m.id, n = (m.parts || []).reduce((s, p) => s + (p.lessons || []).length, 0); ref[mk] = { kind: 'module', id: String(m.id), module: 'Модуль целиком · ' + n + ' ' + pl(n, ['урок', 'урока', 'уроков']), title: m.name };
    L.push(mk + ' | Модуль целиком | ' + m.name + ' | части: ' + (m.parts || []).map(p => p.name).join('; '));
    for (const p of m.parts || []) if (p.id && String(p.id) !== String(m.id) && (m.parts || []).length > 1) { const tk = 'T' + p.id; ref[tk] = { kind: 'part', id: String(p.id), module: m.name + ' · часть целиком', title: p.name }; L.push(tk + ' | Часть модуля ' + m.name + ' | ' + p.name) } }
  for (const m of D.modules || []) for (const p of m.parts || []) for (const l of p.lessons || []) { const x = X[l.id] || {}, k = 'L' + l.id;
    ref[k] = { kind: 'lesson', id: l.id, module: m.name, part: p.name, title: l.t, tc: x.tc || [] };
    L.push(k + ' | ' + m.name + ' / ' + p.name + ' | ' + l.t + (x.a && x.a.length ? ' | о чём: ' + x.a.join('; ') : '') + (x.tc && x.tc.length ? ' | тайм-коды: ' + x.tc.map(t => hms0(t[0]) + ' ' + t[1]).join('; ') : '') + (x.m && x.m.length ? ' | материалы: ' + x.m.join(', ') : '')) }
  try { const E = await qAll(env.DB.prepare("SELECT id, title, about, chapters, start FROM efir WHERE del=0 AND status IN ('done','rec') AND kind NOT IN ('auto','open') ORDER BY start DESC LIMIT 40"));
    for (const e of E) { const ch = efJ(e.chapters, []), k = 'E' + e.id; ref[k] = { kind: 'efir', id: e.id, module: 'Эфир · ' + dayStr(new Date(e.start || Date.now())), title: e.title, tc: ch.map(c => [c.t | 0, c.title]) };
      L.push(k + ' | Эфир | ' + e.title + (e.about ? ' | ' + String(e.about).slice(0, 200) : '') + (ch.length ? ' | главы: ' + ch.map(c => hms0(c.t) + ' ' + c.title).join('; ') : '')) } } catch (x) {}
  return { text: L.join('\n'), ref } }
const hms0 = s => { s = s | 0; const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0') };
function srchParse(t) { t = String(t || '').replace(/```(?:json)?/g, ''); const i = t.indexOf('{'), k = t.lastIndexOf('}'); if (i < 0) return null;
  try { return JSON.parse(t.slice(i, k + 1)) } catch (e) { }
  const S = '"((?:[^"\\\\]|\\\\.)*)"', uq = x => { try { return JSON.parse('"' + x + '"') } catch (e) { return x } };
  const am = t.match(new RegExp('"answer"\\s*:\\s*' + S)), hits = [], hp = t.indexOf('"hits"');
  if (hp >= 0) for (const seg of t.slice(hp).split('{').slice(1)) { const r = seg.match(/"ref"\s*:\s*"?([\w-]+)/); if (!r) continue; const sc = seg.match(/"sec"\s*:\s*(\d+)/), w = seg.match(new RegExp('"why"\\s*:\\s*' + S));
    hits.push({ ref: r[1], sec: sc ? +sc[1] : null, why: w ? uq(w[1]) : '' }) }
  if (!am && !hits.length) return null; const ans = am ? uq(am[1]) : ''; return { answer: ans, hits } }
/* 01.11 (Роман: «тестовый отчёт как родителю в телегу»): только админ. Шлёт отчёт родителя по ученику uid в Telegram-чат по @username (чат должен был писать боту).
   Настройки настоящих родителей не меняет: если строки parent нет — создаётся выключенная (active=0, только ради токена для картинки /card). */
async function ptestApi(env, req) { let o = {}; try { o = JSON.parse(await req.text() || '{}') } catch (e) {}
  const u = new URL(req.url), W = await chatWho(env, req, u, o); if (!W || W.me !== 'admin') return json(req, { ok: false, err: 'Только админ' }, 403);
  const uid = +o.uid || 522348613, un = String(o.username || 'romanoduvanov').replace(/^@/, '').toLowerCase();
  const tu = await env.DB.prepare('SELECT chat, name FROM tg_user WHERE lower(username)=?').bind(un).first();
  if (!tu) return json(req, { ok: false, err: 'Бот не знает @' + un + ' — напиши боту /start и повтори' }, 404);
  let p = await env.DB.prepare('SELECT * FROM parent WHERE uid=?').bind(uid).first();
  if (!p) { const tk = rnd(), now = new Date().toISOString();
    await env.DB.prepare("INSERT INTO parent (uid, student, name, freq, hour, channel, active, token, created, updated) VALUES (?,?,?,?,?,?,0,?,?,?)").bind(uid, 'Тестовый ученик', 'Роман', 7, 19, 'tg', tk, now, now).run();
    p = await env.DB.prepare('SELECT * FROM parent WHERE uid=?').bind(uid).first() }
  const q = Object.assign({}, p, { tg_chat: tu.chat, name: o.name || p.name || 'Роман' }), j = await tgSendReport(env, q);
  await logIt(env, 'ptest', uid, un); return json(req, { ok: !!(j && j.ok), err: j && !j.ok ? (j.description || 'не отправилось') : null }) }
/* ---------- 03.11 (Роман): кастомные ссылки на оплату для менеджеров (брони/предоплаты — суммы разные).
   Менеджер (pay.oduvanovschool.pro/manager/?k=…; ссылку даёт бот по /manager админу) выбирает, к чему открыть доступ (модули закрытой группы 3.0, весь курс, бонусы), срок и сумму →
   заказ в GetCourse через API (ключ GC_KEY_W «Чтение и запись», секрет Cloudflare) с deal_cost = сумма и ссылкой на оплату.
   Оплата (в т. ч. частичная) видна в выгрузке платежей (pay, статус «Получен», колонка «Заказ») → cron cpay добавляет в группы (users import, refresh_if_exists) и ставит срок.
   Срок вышел → бот пишет админам, из каких групп убрать (снятие групп через API заменяет весь список групп ученика — делаем вручную, чтобы не задеть чужие). ---------- */
const CPAY_ITEMS = [
  { id: 'all', t: 'Весь курс AI-креатор 3.0 (закрытая группа 25.11)', g: '3.0 — Закрытая группа 25.11', k: 'course' },
  { id: 't_base', t: 'Тариф: Базовый', g: '3.0 — Базовый', k: 'tariff' },
  { id: 't_prem', t: 'Тариф: Премиум', g: '3.0 — Премиум', k: 'tariff' },
  { id: 't_amz', t: 'Тариф: Премиум Амазон', g: '3.0 — Премиум Амазон', k: 'tariff' },
  { id: 'm00', t: 'Модуль 00 — Точка входа', g: '3.0 доступ — Модуль 00 Точка входа', k: 'mod' },
  { id: 'm01', t: 'Модуль 01 — Инструментарий креатора', g: '3.0 доступ — Модуль 01 Инструментарий креатора', k: 'mod' },
  { id: 'm02', t: 'Модуль 02 — Архитектура визуала', g: '3.0 доступ — Модуль 02 Архитектура визуала', k: 'mod' },
  { id: 'm03', t: 'Модуль 03 — Генеративные системы', g: '3.0 доступ — Модуль 03 Генеративные системы', k: 'mod' },
  { id: 'm04', t: 'Модуль 04 — Поток клиентов', g: '3.0 доступ — Модуль 04 Поток клиентов', k: 'mod' },
  { id: 'm05', t: 'Модуль 05 — Генеративная фотолаборатория', g: '3.0 доступ — Модуль 05 Фотолаборатория', k: 'mod' },
  { id: 'm06', t: 'Модуль 06 — Инфографика с нейросетями', g: '3.0 доступ — Модуль 06 Инфографика', k: 'mod' },
  { id: 'amz', t: 'Amazon — выход на Amazon', g: '3.0 доступ — Amazon', k: 'mod' },
  { id: 'm07', t: 'Модуль 07 — Сайты будущего', g: '3.0 доступ — Модуль 07 Сайты будущего', k: 'mod' },
  { id: 'm08', t: 'Модуль 08 — Генерация AI-видео', g: '3.0 доступ — Модуль 08 AI-видео', k: 'mod' },
  { id: 'sprint', t: 'Бонус: Спринт', g: 'Спринт', k: 'bonus' },
  { id: 'practicum', t: 'Бонус: Практикум по дизайну карточек', g: 'Практикум — доступ', k: 'bonus' },
  { id: 'camp', t: 'Бонус: Design Camp', g: 'Дизайн кэмп — доступ', k: 'bonus' }];
const CPAY_TERMS = { '1w': [7, '1 неделя'], '2w': [14, '2 недели'], '1m': [30, '1 месяц'], '2m': [61, '2 месяца'], '6m': [183, '6 месяцев'], '9m': [274, '9 месяцев'], '12m': [365, '12 месяцев'] };
const cpayKey = async env => (await sha('cpay-manager:' + env.ADMIN_KEY)).slice(0, 24);
const b64u = s => { const b = new TextEncoder().encode(s); let x = ''; for (let i = 0; i < b.length; i++) x += String.fromCharCode(b[i]); return btoa(x) };
async function gcImport(env, kind, params) { if (!env.GC_KEY_W) throw new Error('На сервере нет ключа GetCourse «Чтение и запись» (GC_KEY_W)');
  const body = new URLSearchParams({ key: env.GC_KEY_W, action: 'add', params: b64u(JSON.stringify(params)) });
  const r = await fetch(GC_HOST + '/pl/api/' + kind, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }), t = await r.text(); let j = null; try { j = JSON.parse(t) } catch (e) {}
  if (!j) throw new Error('GetCourse: ответ не JSON (HTTP ' + r.status + ')'); return j }
async function cpayNew(env, { email, name, phone, items, term, sum, note, mgr, days, tt }) { const TD = days || CPAY_TERMS[term][0], TT = tt || CPAY_TERMS[term][1];
    const title = 'Индивидуальный доступ: ' + items.map(x => x.t.replace(/^Бонус: /, '')).join(', ');
    const comm = 'Создано менеджером через pay.oduvanovschool.pro · срок ' + TT + (note ? ' · ' + note : '');
    const j = await gcImport(env, 'deals', { user: { email, first_name: name || undefined, phone: phone || undefined }, system: { refresh_if_exists: 0, return_payment_link: 1, return_deal_number: 1 },
      deal: { product_title: title.slice(0, 250), product_description: comm.slice(0, 500), deal_cost: sum, deal_status: 'new', quantity: 1, deal_comment: comm.slice(0, 500) } });
    const R = j.result || {}; if (!(j.success === true || j.success === 'true') || !(R.success === true || R.success === 'true') || !R.deal_id) { await logIt(env, 'cpay-err', 0, JSON.stringify(j).slice(0, 400)); return { ok: false, err: 'GetCourse не создал заказ: ' + (R.error_message || j.error_message || 'неизвестная ошибка') } }
    const link = R.payment_link || null;
    const ins = await env.DB.prepare('INSERT INTO cpay (num, did, email, name, phone, items, days, sum, note, link, st, at, mgr) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(+R.deal_number || null, +R.deal_id, email, name || null, phone || null, JSON.stringify(items.map(x => x.id)), TD, sum, note || null, link, 'new', new Date().toISOString(), mgr || null).first();
    await logIt(env, 'cpay-new', 0, email + ' ' + sum + ' ' + items.map(x => x.id).join(','));
    return { ok: true, id: ins && ins.id, link, num: +R.deal_number || null, deal_id: +R.deal_id } }
async function cpayApi(env, req, path) { const u = new URL(req.url); let o = {}; if (req.method === 'POST') { try { o = JSON.parse(await req.text() || '{}') } catch (e) { o = {} } }
  await ensure(env);
  /* 04.11 (Роман: «доступ должен выдаваться сразу»): страница «Оплата прошла» сообщает номер заказа (layout.js) → сразу тянем платежи за сутки и выдаём доступ; без ключа менеджера, повтор — не чаще раза в минуту на заказ */
  if (path === '/pay/paid' && req.method === 'POST') { const id = +o.id || 0; if (!(id > 0)) return json(req, { ok: false }, 400);
    const c = await env.DB.prepare("SELECT id FROM cpay WHERE did=? AND st='new'").bind(id).first(); if (!c) return json(req, { ok: true, skip: 1 });
    const lk = 'cpaypaid:' + id, last = await kvGet(env, lk); if (last && Date.now() - +last < 60e3) return json(req, { ok: true, wait: 1 }); await kvPut(env, lk, String(Date.now()));
    return json(req, { ok: true, r: await cpayJob(env, budget(30)) }) }
  const k = String(o.k || u.searchParams.get('k') || ''), ss = k ? null : await staffSess(env, req, u); /* 03.11: и Роман из пульта (сессия admin) */
  if (!(k && same(k, await cpayKey(env))) && !(ss && ss.role === 'admin')) return json(req, { ok: false, err: 'Нет доступа: открой кабинет менеджера по ссылке от бота' }, 403);
  /* проверка ключа записи без создания объектов: импорт заказа без почты → GetCourse отвечает ошибкой проверки (ключ верный) или «ключ неверный» */
  if (path === '/pay/run') { if (!(ss && ss.role === 'admin')) return json(req, { ok: false, err: 'Только Роман' }, 403); return json(req, { ok: true, r: await cpayJob(env, budget(30)) }) }
  if (path === '/pay/ping') { if (!env.GC_KEY_W) return json(req, { ok: false, key: false }); const j = await gcImport(env, 'deals', { user: {}, system: {}, deal: {} }); return json(req, { ok: true, key: true, gc: { success: j.success, err: String(j.error_message || (j.result && j.result.error_message) || '').slice(0, 200) } }) }
  if (path === '/pay/catalog') return json(req, { ok: true, items: CPAY_ITEMS.map(x => ({ id: x.id, t: x.t, k: x.k })), terms: Object.entries(CPAY_TERMS).map(([id, v]) => ({ id, t: v[1], days: v[0] })), key: !!env.GC_KEY_W });
  if (path === '/pay/list') { const L = await qAll(env.DB.prepare('SELECT id, num, email, name, items, days, sum, note, link, st, at, paid, paid_at, until FROM cpay ORDER BY id DESC LIMIT 50')); return json(req, { ok: true, list: L.map(x => Object.assign(x, { items: JSON.parse(x.items || '[]') })) }) }
  if (path === '/pay/create' && req.method === 'POST') {
    const email = String(o.email || '').trim().toLowerCase(), name = bStr(o.name, 80), phone = bStr(o.phone, 30), note = bStr(o.note, 300), sum = Math.round(+o.sum * 100) / 100, term = CPAY_TERMS[o.term] ? o.term : '';
    const items = (Array.isArray(o.items) ? o.items : []).filter((x, i, a) => a.indexOf(x) === i).map(id => CPAY_ITEMS.find(x => x.id === id)).filter(Boolean);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(req, { ok: false, err: 'Проверь почту ученика' }, 400);
    if (!items.length) return json(req, { ok: false, err: 'Выбери, к чему открыть доступ' }, 400);
    if (items.filter(x => x.k === 'tariff').length > 1) return json(req, { ok: false, err: 'Тариф — только один' }, 400);
    if (!(sum >= 1 && sum <= 1e6)) return json(req, { ok: false, err: 'Сумма — от 1 до 1 000 000 ₽' }, 400);
    if (!term) return json(req, { ok: false, err: 'Выбери срок доступа' }, 400);
    const r = await cpayNew(env, { email, name, phone, items, term, sum, note, mgr: bStr(o.mgr, 40) || null }); if (!r.ok) return json(req, { ok: false, err: r.err }, 502);
    return json(req, { ok: true, link: r.link, num: r.num, deal_id: r.deal_id }) }
  return json(req, { ok: false, err: 'not found' }, 404) }
/* ---------- 05.11 (Роман): демо-доступ для лидов ----------
   Менеджер в кабинете (pay.oduvanovschool.pro/manager/) собирает ссылку: закрытая группа 3.0 на 1–3 дня + по желанию Спринт / Практикум / Design Camp
   (демо на тот же срок или полный доступ — бесплатно или за сумму). Лид по ссылке (pay.oduvanovschool.pro/demo/?c=…) вводит имя, почту, телефон →
   сервер создаёт бесплатные заказы в GetCourse на предложения «Демо · … · N дн.» (доступ закрывается сам через N дней — так настроено в предложении).
   Полный доступ — как своя ссылка на оплату (cpay): с суммой — ссылка на оплату, без суммы — группы сразу. Демо-ученик всё видит, но не попадает
   в рейтинг и не выбирает куратора (/cur, /fin/demo для сборщика рейтинга). */
const DEMO_ITEMS = { zg: 'Закрытая группа 3.0 (старт 25 ноября)', sprint: 'Спринт', practicum: 'Практикум по дизайну карточек', camp: 'Design Camp' };
const DEMO_FULL = { sprint: 'sprint', practicum: 'practicum', camp: 'camp' }; /* → CPAY_ITEMS */
/* 05.11 (Роман): срок «по умолчанию» — как в обычной покупке: Спринт 183 дня, Практикум 31 день, Design Camp 60 дней (Роман 05.11) */
const DEMO_DEF = { sprint: 183, practicum: 31, camp: 60 };
const demoOffer = (k, d) => 'demo_' + k + '_' + d;
async function demoOf(env, uid) { if (!uid) return null; try { const r = await env.DB.prepare("SELECT until, items FROM demo_claim WHERE uid=? AND st='ok' ORDER BY id DESC LIMIT 1").bind(+uid).first(); return r || null } catch (e) { return null } }
async function demoApi(env, req, path) { const u = new URL(req.url); let o = {}; if (req.method === 'POST') { try { o = JSON.parse(await req.text() || '{}') } catch (e) { o = {} } }
  await ensure(env);
  /* публично: что откроет ссылка (для страницы формы) */
  if (path === '/demo/info') { const L = await env.DB.prepare('SELECT cfg, off FROM demo_link WHERE code=?').bind(String(u.searchParams.get('c') || '').slice(0, 40)).first(); if (!L || L.off) return json(req, { ok: false, err: 'Ссылка недействительна — попроси менеджера прислать новую' }, 404);
    const c = JSON.parse(L.cfg || '{}'); return json(req, { ok: true, days: c.days, items: ['zg'].concat(Object.keys(c.add || {}).filter(k => c.add[k] === 'demo')).map(k => DEMO_ITEMS[k]), full: Object.keys(c.add || {}).filter(k => c.add[k] === 'full').map(k => DEMO_ITEMS[k]), sum: c.sum || 0 }) }
  /* публично: лид оформляет демо */
  if (path === '/demo/claim' && req.method === 'POST') { const code = String(o.c || '').slice(0, 40), L = await env.DB.prepare('SELECT * FROM demo_link WHERE code=?').bind(code).first(); if (!L || L.off) return json(req, { ok: false, err: 'Ссылка недействительна — попроси менеджера прислать новую' }, 404);
    const c = JSON.parse(L.cfg || '{}'), email = String(o.email || '').trim().toLowerCase(), name = bStr(o.name, 80), phone = bStr(o.phone, 30), ip = req.headers.get('CF-Connecting-IP') || '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return json(req, { ok: false, err: 'Проверь почту' }, 400); if (name.length < 2) return json(req, { ok: false, err: 'Напиши имя' }, 400); if (phone.replace(/\D/g, '').length < 10) return json(req, { ok: false, err: 'Проверь телефон' }, 400);
    { const k = 'demoip:' + ip, n = (await kvGet(env, k)) || { n: 0, at: Date.now() }; if (Date.now() - n.at > 36e5) { n.n = 0; n.at = Date.now() } if (++n.n > 8) return json(req, { ok: false, err: 'Слишком много попыток — попробуй через час' }, 429); await kvPut(env, k, n) }
    const was = await env.DB.prepare("SELECT until FROM demo_claim WHERE email=? AND st='ok' ORDER BY id DESC LIMIT 1").bind(email).first();
    if (was && Date.parse(was.until) > Date.now()) return json(req, { ok: true, again: 1, until: was.until, login: GC_HOST + '/cms/system/login?required=true' });
    if (was && Date.now() - Date.parse(was.until) < 30 * 864e5) return json(req, { ok: false, err: 'Демо-доступ на эту почту уже был. Напиши менеджеру — он подскажет, как продолжить' }, 409);
    /* уже покупал — демо не нужен (и чтобы окончание демо не задело оплаченный доступ) */
    const paid = await env.DB.prepare("SELECT 1 x FROM pay WHERE lower(email)=? AND status='Получен' AND sum>0 LIMIT 1").bind(email).first();
    if (paid) return json(req, { ok: false, have: 1, err: 'На эту почту уже есть оплаченное обучение — просто войди на платформу', login: GC_HOST + '/cms/system/login?required=true' }, 409);
    const days = [1, 2, 3].includes(+c.days) ? +c.days : 1, keys = ['zg'].concat(Object.keys(c.add || {}).filter(k => c.add[k] === 'demo' && DEMO_ITEMS[k])), errs = []; let uid = null;
    for (const k of keys) { const j = await gcImport(env, 'deals', { user: { email, first_name: name, phone }, system: { refresh_if_exists: 0, return_deal_number: 1 },
        deal: { offer_code: demoOffer(k, days), deal_cost: 0, deal_status: 'payed', deal_is_paid: 1, deal_comment: ('Демо-доступ по ссылке менеджера ' + (L.mgr || '') + ' (' + code + ')').slice(0, 300) } }).catch(e => ({ error_message: e.message }));
      const R = (j && j.result) || {}; if ((j.success === true || j.success === 'true') && (R.success === true || R.success === 'true')) { if (R.user_id) uid = +R.user_id } else errs.push(k + ': ' + String(R.error_message || j.error_message || 'ошибка').slice(0, 120)) }
    if (errs.length === keys.length) { await logIt(env, 'demo-err', 0, email + ' ' + errs.join(' | ')); return json(req, { ok: false, err: 'Не получилось открыть доступ — напиши менеджеру, он откроет вручную' }, 502) }
    const until = new Date(Date.now() + days * 864e5).toISOString();
    /* полный доступ к Спринту / Практикуму / Кэмпу */
    const full = Object.keys(c.add || {}).filter(k => c.add[k] === 'full' && DEMO_FULL[k]).map(k => DEMO_FULL[k]); let pay_link = null, cid = null;
    if (full.length) { const def = !CPAY_TERMS[c.term], term = def ? '6m' : c.term, items = full.map(id => CPAY_ITEMS.find(x => x.id === id)).filter(Boolean), sum = Math.max(0, Math.round(+c.sum || 0));
      const dOf = x => def ? (DEMO_DEF[x.id] || 183) : CPAY_TERMS[term][0], dMax = Math.max(...items.map(dOf));
      if (sum >= 1) { const r = await cpayNew(env, { email, name, phone, items, term, sum, note: 'вместе с демо-доступом', mgr: L.mgr, days: dMax, tt: def ? 'по умолчанию (' + items.map(x => x.t.replace(/^Бонус: /, '') + ' — ' + (dOf(x) >= 3650 ? 'бессрочно' : dOf(x) + ' дн.')).join(', ') + ')' : null }); if (r.ok) { pay_link = r.link; cid = r.id } else errs.push('full: ' + r.err) }
      else { const G = items.map(x => x.g); const j = await gcImport(env, 'users', { user: { email, first_name: name, phone, group_name: G }, system: { refresh_if_exists: 1 } }).catch(e => ({ error_message: e.message }));
        if (j && (j.success === true || j.success === 'true')) { for (const x of def ? items.map(i => [i]) : [items]) { const dd = Math.max(...x.map(dOf)), un = new Date(Date.now() + dd * 864e5).toISOString(); const ins = await env.DB.prepare("INSERT INTO cpay (num, did, email, name, phone, items, days, sum, note, link, st, at, paid, paid_at, until, mgr) VALUES (NULL,NULL,?,?,?,?,?,0,?,NULL,'granted',?,0,?,?,?) RETURNING id").bind(email, name, phone, JSON.stringify(x.map(i => i.id)), dd, 'бесплатно вместе с демо-доступом', new Date().toISOString(), new Date().toISOString(), un, L.mgr || null).first(); cid = cid || (ins && ins.id) } }
        else errs.push('full: ' + String((j && j.error_message) || 'ошибка').slice(0, 120)) } }
    const ins = await env.DB.prepare("INSERT INTO demo_claim (code, email, name, phone, uid, days, items, until, at, ip, cpay_id, pay_link, st) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'ok') RETURNING id").bind(code, email, name, phone, uid, days, JSON.stringify(keys.concat(full.map(x => 'full:' + x))), until, new Date().toISOString(), ip, cid, pay_link).first();
    await env.DB.prepare('UPDATE demo_link SET n=n+1 WHERE code=?').bind(code).run(); await logIt(env, 'demo', uid || 0, email + ' ' + keys.join(',') + ' ' + days + 'd' + (errs.length ? ' ERR ' + errs.join(' | ') : ''));
    await tgAdmins(env, '🎁 <b>Демо-доступ</b>: ' + th(name) + ' · ' + th(email) + ' · ' + th(phone) + '\n' + keys.map(k => DEMO_ITEMS[k]).join(', ') + ' — на ' + days + ' ' + (days === 1 ? 'день' : 'дня') + (full.length ? '\nПолный доступ: ' + full.map(x => DEMO_ITEMS[x]).join(', ') + (pay_link ? ' (ссылка на оплату ' + Math.round(+c.sum) + ' ₽)' : ' (бесплатно)') : '') + (L.mgr ? '\nМенеджер: ' + th(L.mgr) : '') + (errs.length ? '\n⚠️ ' + th(errs.join('; ')) : ''));
    return json(req, { ok: true, id: ins && ins.id, until, days, login: GC_HOST + '/cms/system/login?required=true', pay: pay_link, part: errs.length ? 1 : 0 }) }
  /* дальше — кабинет менеджера (ключ из бота) или Роман */
  const k = String(o.k || u.searchParams.get('k') || ''), ss = k ? null : await staffSess(env, req, u);
  if (!(k && same(k, await cpayKey(env))) && !(ss && ss.role === 'admin')) return json(req, { ok: false, err: 'Нет доступа: открой кабинет менеджера по ссылке от бота' }, 403);
  if (path === '/demo/link' && req.method === 'POST') { const days = [1, 2, 3].includes(+o.days) ? +o.days : 1, add = {};
    for (const x of ['sprint', 'practicum', 'camp']) { const v = o.add && o.add[x]; if (v === 'demo' || v === 'full') add[x] = v }
    const sum = Math.max(0, Math.round(+o.sum || 0)), term = o.term === 'def' || !o.term ? 'def' : CPAY_TERMS[o.term] ? o.term : 'def'; if (sum > 1e6) return json(req, { ok: false, err: 'Сумма — до 1 000 000 ₽' }, 400);
    const cfg = { days, add, sum: Object.values(add).includes('full') ? sum : 0, term }, key = JSON.stringify(cfg), mgr = bStr(o.mgr, 40) || null;
    let ex = await env.DB.prepare('SELECT code FROM demo_link WHERE cfg=? AND COALESCE(mgr,\'\')=? AND off=0').bind(key, mgr || '').first();
    if (!ex) { const code = [...crypto.getRandomValues(new Uint8Array(6))].map(b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join(''); await env.DB.prepare('INSERT INTO demo_link (code, cfg, mgr, at) VALUES (?,?,?,?)').bind(code, key, mgr, new Date().toISOString()).run(); ex = { code } }
    return json(req, { ok: true, code: ex.code, link: 'https://pay.oduvanovschool.pro/demo/?c=' + ex.code }) }
  if (path === '/demo/list') { const C = await qAll(env.DB.prepare('SELECT id, code, email, name, phone, days, items, until, at, pay_link FROM demo_claim ORDER BY id DESC LIMIT 60')); const Ls = await qAll(env.DB.prepare('SELECT code, cfg, mgr, n, at FROM demo_link WHERE off=0 ORDER BY at DESC LIMIT 30'));
    return json(req, { ok: true, claims: C.map(x => Object.assign(x, { items: JSON.parse(x.items || '[]') })), links: Ls.map(x => Object.assign(x, { cfg: JSON.parse(x.cfg || '{}'), link: 'https://pay.oduvanovschool.pro/demo/?c=' + x.code })) }) }
  return json(req, { ok: false, err: 'not found' }, 404) }
/* cron: оплата (в т. ч. частичная) по заказу → группы и срок; срок вышел → админам, что снять */
async function cpayJob(env, B) { const out = { granted: 0, expired: 0 }; let L = []; try { L = await qAll(env.DB.prepare("SELECT * FROM cpay WHERE st IN ('new','granted') ORDER BY id DESC LIMIT 200")) } catch (e) { return { skip: 'no table' } }
  /* 04.11: есть неоплаченные свежие ссылки — сами подтягиваем платежи за 2 дня (не ждём часовую выгрузку) */
  if (L.some(x => x.st === 'new' && Date.now() - Date.parse(x.at || 0) < 30 * 864e5)) { try { const r = await syncPay(env, addDays(dayStr(), -2), dayStr(), B, 3); out.pay = r && (r.n != null ? r.n : r.pending ? 'pending' : null) } catch (e) { out.payErr = e.message } }
  for (const c of L.filter(x => x.st === 'new')) { const p = await env.DB.prepare("SELECT SUM(sum) s, MIN(created) at FROM pay WHERE status='Получен' AND (deal=? OR deal=?)").bind(c.num || -1, c.did || -1).first();
    if (!p || !(p.s > 0)) continue; if (!env.GC_KEY_W) { out.nokey = 1; break }
    const G = JSON.parse(c.items || '[]').map(id => (CPAY_ITEMS.find(x => x.id === id) || {}).g).filter(Boolean);
    const j = await gcImport(env, 'users', { user: { email: c.email, group_name: G }, system: { refresh_if_exists: 1 } }); const R = j.result || {};
    if (!(j.success === true || j.success === 'true') || R.error) { await logIt(env, 'cpay-grant-err', 0, c.id + ' ' + JSON.stringify(j).slice(0, 300)); continue }
    const until = new Date(Date.now() + c.days * 864e5).toISOString();
    await env.DB.prepare("UPDATE cpay SET st='granted', paid=?, paid_at=?, until=? WHERE id=?").bind(p.s, p.at || new Date().toISOString(), until, c.id).run(); out.granted++;
    await tgAdmins(env, '✅ Оплата по кастомной ссылке: ' + th(c.email) + ' — ' + Math.round(p.s).toLocaleString('ru-RU') + ' ₽ из ' + Math.round(c.sum).toLocaleString('ru-RU') + ' ₽' + (p.s < c.sum ? ' (частично)' : '') + '. Открыт доступ до ' + until.slice(0, 10) + ': ' + th(G.join(', '))) }
  const now = new Date().toISOString();
  for (const c of L.filter(x => x.st === 'granted' && x.until && x.until < now && !x.rem)) { const G = JSON.parse(c.items || '[]').map(id => (CPAY_ITEMS.find(x => x.id === id) || {}).g).filter(Boolean);
    await tgAdmins(env, '⏰ Закончился срок доступа по кастомной ссылке: ' + th(c.email) + '. Убери его из групп в GetCourse: ' + th(G.join(', ')));
    await env.DB.prepare("UPDATE cpay SET rem=1, st='expired' WHERE id=?").bind(c.id).run(); out.expired++ }
  return out }
async function tgAdmins(env, text) { const A = await qAll(env.DB.prepare('SELECT chat FROM tg_admin')); for (const a of A) { try { await tgSend(env, a.chat, text) } catch (e) {} } }
async function srchApi(env, req, path) { const u = new URL(req.url); let o = {}; if (req.method === 'POST') { try { o = JSON.parse(await req.text() || '{}') } catch (e) { o = {} } }
  const W = await chatWho(env, req, u, o); if (!W) return json(req, { ok: false, err: 'Нужно войти', st: 401 }, 401);
  if (path === '/srch/index' && req.method === 'POST') { if (W.me !== 'admin') return json(req, { ok: false, err: 'Только админ' }, 403);
    const X = (await kvGet(env, 'srchidx')) || {}, it = o.items || {}; let n = 0;
    for (const id of Object.keys(it).slice(0, 400)) { if (!/^\d{5,12}$/.test(id)) continue; const v = it[id] || {};
      X[id] = { a: (Array.isArray(v.a) ? v.a : []).map(x => bStr(x, 160)).filter(Boolean).slice(0, 12), tc: (Array.isArray(v.tc) ? v.tc : []).map(t => [Math.max(0, +t[0] | 0), bStr(t[1], 120)]).filter(t => t[1]).slice(0, 30), m: (Array.isArray(v.m) ? v.m : []).map(x => bStr(x, 80)).filter(Boolean).slice(0, 10) }; n++ }
    await kvPut(env, 'srchidx', X); await kvPut(env, 'srchcache4', {}); return json(req, { ok: true, n, total: Object.keys(X).length }) }
  if (path === '/srch/ask' && req.method === 'POST') { const q = String(o.q || '').replace(/\s+/g, ' ').trim().slice(0, 200); if (q.length < 3) return json(req, { ok: false, err: 'Напиши вопрос подлиннее' }, 400);
    const LINK = o.mode === 'link' && !!W.s, key = (LINK ? 'L:' : '') + q.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim(), C = (await kvGet(env, 'srchcache4')) || {};
    if (C[key] && msNow() - C[key].at < 7 * 864e5) return json(req, Object.assign({ ok: true, cached: 1 }, C[key].r));
    const dk = 'srchn:' + (W.uid || W.me) + ':' + dayStr(), dn = +((await kvGet(env, dk)) || 0); if (W.me === 'student' && dn >= SRCH_DAY) return json(req, { ok: false, err: 'На сегодня вопросов хватит — спроси Нейро в чате' }, 429);
    const { text, ref } = await srchCorpus(env), ME = await srchMe(env, W.uid);
    const sys = 'Ты умный поиск онлайн-школы дизайна OduvanovSchool (дизайн карточек маркетплейсов с ИИ): ищешь и по курсу, и по платформе. Тебе дают страницы платформы (коды P_…) и места курса (строки «КОД | модуль | урок | о чём | тайм-коды | материалы»), а в сообщении — данные ученика и его вопрос своими словами. Найди ' + (LINK ? 'до 12' : '1–6') + ' самых подходящих мест: модуль целиком (M…), часть целиком (T…) или курс (S…), если спрашивают про модуль, часть или курс в целом; страницы платформы (если вопрос про куратора, техпомощь, оплату, доступ, банк, эфиры, рейтинг, настройки) и/или уроки и эфиры курса (если вопрос про учёбу); для урока, если по тайм-кодам видно нужный момент, — секунду начала. Ответь ТОЛЬКО JSON без пояснений: {"answer":"2–3 коротких предложения по-русски, на «ты», без воды: прямой ответ; если вопрос личный (куратор, доступ, тариф, баллы, место) — отвечай по данным ученика конкретно (имя куратора, статус, дата доступа)","fact":null или {"big":"до 20 символов — главная цифра или дата, например «до 15 марта»","small":"до 70 символов пояснение, не повторяй то, что уже сказано в answer"} (только для вопросов про срок доступа, тариф, баллы или место в рейтинге; для куратора и страниц — null),"personal":true если в ответе использованы данные ученика,"hits":[{"ref":"КОД","sec":число или null,"why":"до 60 символов: что именно там, без повтора названия"}]}. Не выдумывай: коды и данные бери только из того, что дали. Если в курсе урока по теме нет — так и скажи и предложи Нейро или куратора; с программами и техникой предлагай технического специалиста (P_tech).';
    /* 01.11: бывало «Не получилось разобрать ответ» — ответ модели обрезался/ломал JSON. Теперь лимит больше, 2 попытки и мягкий разбор */
    let out = null, okAny = false;
    for (let at = 0; at < 2 && !out; at++) { const { r, j } = await aiFetch(env, JSON.stringify({ model: AI_MODEL(env), max_tokens: 1600, system: [{ type: 'text', text: sys + ' Кавычки внутри текста — только «ёлочки», никогда не прямые.' + (at ? ' ВАЖНО: ответь ТОЛЬКО валидным JSON, без текста вокруг, кавычки внутри строк экранируй.' : '') }, { type: 'text', text: SRCH_PTXT + '\n\nМеста курса:\n' + text, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: (ME ? 'Данные ученика: ' + JSON.stringify(ME.o) + '\n\n' : 'Данные ученика: нет (вошёл сотрудник без ученика)\n\n') + 'Вопрос: ' + q }] }));
      if (!r || !r.ok) continue; okAny = true; out = srchParse(((j.content || []).find(c => c.type === 'text') || {}).text || '') }
    if (!okAny) return json(req, { ok: false, err: 'Поиск сейчас недоступен — попробуй через минуту' }, 502);
    if (!out) return json(req, { ok: false, err: 'Не получилось разобрать ответ — попробуй переформулировать' }, 502);
    const hits = (Array.isArray(out.hits) ? out.hits : []).map(h => { const code = h && String(h.ref || '');
      if (SRCH_PAGES[code]) { const P = SRCH_PAGES[code], x = { kind: 'page', code, title: P.t, why: P.d, href: P.href, act: P.act, ic: P.ic };
        if ((code === 'P_cur') && ME && ME.cc) Object.assign(x, { meta: 'Мой куратор', title: ME.cc.name, why: null, status: ME.cc.online ? 'На связи · до ' + ME.cc.hours.to + ':00 МСК' : 'Не на связи' + (ME.cc.hours.next ? ' · ' + ME.cc.hours.next : ''), on: !!ME.cc.online });
        return x }
      const R = ref[code]; if (!R) return null; let sec = h.sec != null && isFinite(+h.sec) ? Math.max(0, +h.sec | 0) : null;
      return srchHit(R, sec, bStr(h.why, 90)) }).filter(Boolean);
    /* точные совпадения по названию — для ссылки в рассылке первыми (модуль, его части и все уроки), в обычном поиске — модуль/часть в дополнение */
    const loc = srchLocal(q, ref, LINK ? 30 : 4).map(k => srchHit(ref[k], null, ''));
    const all = (LINK ? loc.concat(hits) : hits.concat(loc.filter(x => x.kind !== 'lesson'))).filter((x, i, A) => A.findIndex(y => (y.code || y.kind + y.id) === (x.code || x.kind + x.id)) === i);
    hits.length = 0; all.slice(0, LINK ? 30 : 8).forEach(x => hits.push(x));
    const fact = out.fact && out.fact.big ? { big: bStr(out.fact.big, 30), small: bStr(out.fact.small || '', 90) } : null;
    const res = { answer: bStr(out.answer, 600), fact, hits }, priv = !!out.personal || !!fact || hits.some(x => x.kind === 'page');
    if (!priv) { C[key] = { at: msNow(), r: res }; const ks = Object.keys(C); if (ks.length > 300) for (const k of ks.sort((a, b) => C[a].at - C[b].at).slice(0, ks.length - 300)) delete C[k]; await kvPut(env, 'srchcache4', C) }
    await kvPut(env, dk, dn + 1); await logIt(env, 'srch', W.uid || 0, q.slice(0, 120));
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
  /* 04.11 (Роман: галочка «вопрос решён» в чатах пульта): куратор снимает ожидание сам — диалог уходит из «Ждут» (сайт/приложение: chat=app<uid>, личка Telegram: chat=<id чата>) */
  if (path === '/chat/done' && req.method === 'POST') { if (!W.s || W.ro) return json(req, { ok: false, err: 'Только для кураторов' }, 403); const adm = W.s.role === 'admin', chat = o.chat ? String(o.chat) : o.u ? CW(+o.u) : '';
    if (!chat) return json(req, { ok: false, err: 'Нет диалога' }, 400);
    const w = adm ? await env.DB.prepare('SELECT * FROM cwait WHERE chat=?').bind(chat).first() : await env.DB.prepare('SELECT * FROM cwait WHERE cid=? AND chat=?').bind(W.s.cid, chat).first();
    if (!w) return json(req, { ok: true, gone: 1 });
    await env.DB.batch([env.DB.prepare('DELETE FROM cwait WHERE cid=? AND chat=?').bind(w.cid, w.chat), env.DB.prepare('INSERT INTO cack (cid, chat, uid, kind, since, at) VALUES (?,?,?,?,?,?)').bind(w.cid, w.chat, w.uid, 'done', w.since, Date.now() / 1000 | 0)]);
    await logIt(env, 'cw-done', w.uid || 0, w.cid + ' ' + w.chat); return json(req, { ok: true }) }
  if (path === '/chat/dialogs') { if (!W.s) return json(req, { ok: false, err: 'Только для кураторов' }, 403); const s = W.s, adm = s.role === 'admin', f = u.searchParams.get('f') === 'wait' ? 'wait' : 'all';
    const [sr, lr, ur, wr, tr] = await env.DB.batch([adm ? env.DB.prepare('SELECT uid, curator, name FROM student WHERE uid IN (SELECT DISTINCT uid FROM chat_msg) OR curator IS NOT NULL') : env.DB.prepare('SELECT uid, curator, name FROM student WHERE curator=?').bind(s.cid),
      env.DB.prepare('SELECT m.uid, m.text, m.at, m.dir, m.file_id FROM chat_msg m JOIN (SELECT uid, MAX(id) mid FROM chat_msg WHERE del=0 GROUP BY uid) x ON x.mid=m.id'),
      env.DB.prepare("SELECT uid, COUNT(*) n FROM chat_msg WHERE dir='in' AND read_at IS NULL AND del=0 GROUP BY uid"),
      env.DB.prepare("SELECT uid, cid, since FROM cwait WHERE chat LIKE 'app%'"),
      /* QA раунд 3 (Н5): ожидания из Telegram-лички куратора (те же cwait, что считает пульт) — строкой «ждёт ответа в Telegram» */
      adm ? env.DB.prepare("SELECT w.cid, w.chat, w.uid, w.since, s.name sname, u.username, u.name uname FROM cwait w LEFT JOIN student s ON s.uid=w.uid LEFT JOIN tg_user u ON u.chat=w.chat WHERE w.chat NOT LIKE 'app%'")
        : env.DB.prepare("SELECT w.cid, w.chat, w.uid, w.since, s.name sname, s.curator scur, u.username, u.name uname FROM cwait w LEFT JOIN student s ON s.uid=w.uid LEFT JOIN tg_user u ON u.chat=w.chat WHERE w.chat NOT LIKE 'app%' AND w.cid=?").bind(s.cid)]);
    const L = {}, U = {}, Wt = {}; for (const x of lr.results || []) L[x.uid] = x; for (const x of ur.results || []) U[x.uid] = x.n; for (const x of wr.results || []) Wt[x.uid] = x.since * 1000;
    const N = await nameMap(env), out = [];
    for (const x of sr.results || []) { if (isStaffUid(env, x.uid)) continue; if (adm && !L[x.uid] && f === 'all' && !Wt[x.uid]) continue; if (f === 'wait' && !Wt[x.uid]) continue; const l = L[x.uid];
      out.push({ uid: x.uid, name: N[x.uid] || x.name || null, cid: x.curator || null, last: l ? { text: l.text || (l.file_id ? '📎 файл' : ''), at: l.at, dir: l.dir } : null, unread: U[x.uid] || 0, wait_since: Wt[x.uid] || null }) }
    let wtg = 0; for (const w of tr.results || []) { if (w.uid && isStaffUid(env, w.uid)) continue; if (!CURATORS.some(c => c.id === w.cid)) continue; if (!adm && w.uid && w.scur && w.scur !== s.cid) continue; /* 03.11 (Роман): ученик другого куратора написал в личку — в «Сообщениях» не показываем */ wtg++;
      out.push({ uid: w.uid || null, name: (w.uid && N[w.uid]) || w.sname || w.uname || (w.username ? '@' + w.username : null), cid: w.cid, cname: (CURATORS.find(c => c.id === w.cid) || {}).name || null, src: 'tg', mine: adm || (!!w.uid && w.scur === s.cid), tg: w.username || null, chat: String(w.chat), last: null, unread: 0, wait_since: w.since * 1000 }) }
    out.sort((a, b) => (!!b.wait_since - !!a.wait_since) || (a.wait_since && b.wait_since ? a.wait_since - b.wait_since : 0) || ((b.last ? b.last.at : 0) - (a.last ? a.last.at : 0)) || String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
    return json(req, { ok: true, me: s.role, f, dialogs: out, wait: out.filter(x => x.wait_since).length, wait_tg: wtg }, 200, { 'Cache-Control': 'no-store' }) }
  const uid = W.uid; if (!uid) return json(req, { ok: false, err: 'Укажи ученика' }, 400);
  if (path === '/chat/list') { const before = +u.searchParams.get('before') || 0; /* 03.11 (Роман: «переписки грузятся очень долго»): запросы параллельно, карточка куратора — из памяти на 60 с */
    const [st0, ms, un] = await Promise.all([env.DB.prepare('SELECT curator, name FROM student WHERE uid=?').bind(uid).first(),
      qAll(env.DB.prepare('SELECT m.*, r.stars, fb.at fb_at, f.name fname, f.mime fmime FROM chat_msg m LEFT JOIN chat_rate r ON r.mid=m.id LEFT JOIN chat_fb fb ON fb.mid=m.id LEFT JOIN bank_file f ON f.id=m.file_id WHERE m.uid=? AND m.del=0 AND (?=0 OR m.id<?) ORDER BY m.id DESC LIMIT 60').bind(uid, before, before)),
      env.DB.prepare('SELECT COUNT(*) n FROM chat_msg WHERE uid=? AND dir=? AND read_at IS NULL AND del=0').bind(uid, W.me === 'student' ? 'out' : 'in').first()]);
    const st = st0 || {};
    const [RE, nm, tgn, cc] = await Promise.all([reactsFor(env, ms.map(m => m.id), reactKey(W)), stuName(env, uid), W.me === 'student' ? undefined : stuTg(env, uid), st.curator ? curCardC(env, st.curator) : null]);
    for (const m of ms) m.re = RE[m.id] || []; if (W.me !== 'student') for (const m of ms) m.fb_at = null;
    return json(req, { ok: true, me: W.me, ro: !!W.ro, student: { uid, name: nm, tg: tgn }, curator: cc, msgs: ms.reverse().map(chatPub), unread: un ? un.n : 0, more: ms.length === 60 }, 200, { 'Cache-Control': 'no-store' }) }
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
const CUR_API = ['/cur/alerts', '/cur/me', '/cur/hwlog', '/cur/hwstat', '/cur/hwpts', '/cur/assign', '/cur/mass', '/cur/admin', '/cur/queue', '/rev/data', '/rev/hide'];
/* 30.10 (QA №7, №13): очередь ДЗ. Её знает только GetCourse (лента ответов входа куратора), поэтому кабинет «Проверка ДЗ» на сайте (?fs=cur)
   после загрузки ленты и после каждого «Принять / Вернуть» присылает POST /cur/queue {n, old48, oldest, by?:{<cid>|none:{n, old48, oldest}}} (by — только у Романа:
   его вход видит всю очередь, разбивку по кураторам делает страница по /bank/staff/list). Храним последнее число на вход (kv hwq:<cid> | hwq:admin) с временем подсчёта;
   /cur/me и /cur/admin отдают hw_q (ждут проверки), hw_old (дольше 48 ч), hw_oldest, hw_q_at. Число старше 7 дней не показываем. */
const hwqClean = x => { if (!x || typeof x !== 'object') return null; const n = Math.round(+x.n); if (!(n >= 0 && n <= 1e4)) return null;
  const o = Math.round(+x.old48 || 0), o7 = x.old72 == null ? null : Math.round(+x.old72 || 0), od = Math.round(+x.oldest || 0);
  return Object.assign({ n, old48: o >= 0 && o <= n ? o : 0, oldest: od > 1e12 && od < msNow() + 864e5 ? od : null }, o7 != null && o7 >= 0 && o7 <= n ? { old72: o7 } : {}) }; /* этап 3: old72 — для срочного «N работ ждут больше 3 дней» */
async function hwQueues(env) { const fresh = x => x && x.at > msNow() - 7 * 864e5 ? x : null, adm = fresh(await kvGet(env, 'hwq:admin')), Q = {};
  for (const c of CURATORS) { const mine = fresh(await kvGet(env, 'hwq:' + c.id)), a = adm && adm.by && adm.by[c.id] ? Object.assign({ at: adm.at }, adm.by[c.id]) : null;
    Q[c.id] = [mine, a].filter(Boolean).sort((x, y) => y.at - x.at)[0] || null }
  const cs = CURATORS.map(c => Q[c.id]).filter(Boolean), olds = cs.map(x => x.oldest).filter(Boolean);
  Q.all = adm ? adm : cs.length ? { n: cs.reduce((t, x) => t + x.n, 0), old48: cs.reduce((t, x) => t + (x.old48 || 0), 0), oldest: olds.length ? Math.min(...olds) : null, at: Math.min(...cs.map(x => x.at)), part: cs.length < CURATORS.length } : null;
  return Q }
/* 02.11 (Роман): тревоги куратора — плашка вверху всех страниц сайта (/cur/alerts) и ИИ в «Рассылках» пульта (/app/api/ai/bc, /app/api/ai/recs).
   Пропали — не заходили 5+ дней (как в пульте); не продвигаются — заходят, но за 7 дней ноль баллов рейтинга; ждут ответа — cwait; ДЗ — очередь /cur/queue. */
const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
async function curAlerts(env, cid) { const st = (await appStudents(env, cid)).students || [], today = Date.parse(dayStr() + 'T00:00:00Z');
  const idle = [], stall = [], wait = [];
  for (const x of st) { const d = x.last ? Math.round((today - Date.parse(x.last + 'T00:00:00Z')) / 864e5) : null, it = { uid: x.uid, name: x.name, days: d, tg: !!x.tgid, place: x.place, pts: x.pts, week: x.week, lessons: x.lessons, hw: x.hw };
    if (d == null || d >= 5) idle.push(it); else if (x.week === 0) stall.push(it);
    if (x.wait) wait.push({ uid: x.uid, name: x.name, since: x.wait }) }
  idle.sort((a, b) => (b.days == null ? 1e4 : b.days) - (a.days == null ? 1e4 : a.days)); wait.sort((a, b) => a.since - b.since);
  const q = (await hwQueues(env))[cid] || null;
  return { n: st.length, idle, stall, wait, hw: q ? { n: q.n, old: q.old48 || 0, at: q.at } : null } }
/* 03.11 (Роман, макет docs/mockups/kabinet-kuratora, этап 1): экран «Сегодня» в пульте — сигналы по ученикам куратора и риск 0–100 (/app/api/today).
   Сигналы: wait — ждёт ответа (cwait.since, сек); rate — ★1–2 куратору за 14 дней (chat_rate); stuck — последний открытый урок (lv) не менялся 4+ дня, хотя ученик заходит;
   stall — заходит, но 0 баллов за 7 дней (week рейтинга); gone — нет заходов 5+ дней (сайт и видео — time, приложение — ev), cool — 3–4 дня; drop — минус 8+ мест за 7 дней (snap по h).
   Риск: пропал 30 (остывает 15), застрял / не продвигается 20, падение места 10, низкая оценка 25; ожидание ответа — не риск, а срочность (первым в списке).
   Отметки — sig_ack: until=0 — «обработано», пока значение сигнала (sv) то же; until>0 — отложено до (мс). ДЗ по ученикам сервер не знает — только очередь (hw). */
const SIG_ORD = { wait: 0, rate: 1, stuck: 2, stall: 2, gone: 3, cool: 3, drop: 4 };
let SIGACK_OK = false; const TODC = {};
async function sigAckEnsure(env) { if (SIGACK_OK) return; await env.DB.prepare('CREATE TABLE IF NOT EXISTS sig_ack (cid TEXT NOT NULL, uid INTEGER NOT NULL, k TEXT NOT NULL, until INTEGER DEFAULT 0, at INTEGER, sv TEXT, PRIMARY KEY (cid, uid, k))').run(); SIGACK_OK = true }
const lessonMap = D => { const M = {}; for (const m of D.modules || []) { const nm = String(m.name || '').match(/^Модуль (\d+)\s*—\s*(.+)$/), mod = nm ? 'М' + nm[1] + ' · ' + nm[2] : String(m.name || '');
    for (const p of m.parts || []) for (const l of p.lessons || []) M[+l.id] = { t: String(l.t || ''), mod } }
  for (const o of D.other || []) for (const i of o.items || []) if (!M[+i.id]) M[+i.id] = { t: String(i.t || i.name || ''), mod: String(o.name || o.t || '') }; return M };
function sigWhy(it, k) { const g = it.sig.find(x => x.k === k) || {}, P = (n, a, b, c) => n + ' ' + pl(n, [a, b, c]);
  if (k === 'wait') { const m = Math.max(1, Math.round((msNow() / 1000 - g.since) / 60)); return nb('Ждёт ответа ' + (m < 60 ? m + ' мин' : P(Math.floor(m / 60), 'час', 'часа', 'часов')) + '. Ответь первым, пока вопрос не остыл.') }
  if (k === 'rate') return nb('Оценка твоему ответу в чате — ★' + g.stars + '. Спроси, что было не так: лучше сразу разобраться, чем молча потерять ученика.');
  if (k === 'stuck') return nb(P(g.days, 'день', 'дня', 'дней') + ' на уроке' + (g.lt ? ' «' + g.lt + '»' : ' №' + g.lesson) + ', хотя заходит. Предложи помочь с этим уроком или глянуть черновик ДЗ, даже неготовый.');
  if (k === 'stall') return nb('Заходит, но за неделю ни одного балла в рейтинге. Напомни про ближайшее ДЗ: даже лёгкий уровень идёт в рейтинг.');
  if (k === 'gone') return g.days == null ? nb('Ни одного захода на сайт и в приложение. Напиши лично: всё ли получилось с доступом.') : nb(P(g.days, 'день', 'дня', 'дней') + ' нет ни на сайте, ни в приложении. Не дави: предложи лёгкий уровень, он тоже идёт в рейтинг.');
  if (k === 'cool') return nb(P(g.days, 'день', 'дня', 'дней') + ' без заходов. Напиши пару тёплых слов, пока ученик не выпал из ритма.');
  if (k === 'drop') return nb('За неделю место в рейтинге — с ' + g.from + '-го на ' + g.to + '-е. Подскажи, где быстро добрать баллы: ДЗ в окне ×2.');
  return '' }
async function todayBase(env, cid) { return memo(env, 'tod:' + cid, 90, () => todayBase0(env, cid)) }
async function todayBase0(env, cid) {
  const st = (await appStudents(env, cid)).students || [], D = await loadData(env), today = dayStr(), now = msNow(), d0 = Date.parse(today + 'T00:00:00Z');
  const dd = s => s ? Math.round((d0 - Date.parse(String(s).slice(0, 10) + 'T00:00:00Z')) / 864e5) : null;
  const Q = [env.DB.prepare('SELECT uid, MAX(day) d FROM ev WHERE day>=? GROUP BY uid').bind(addDays(today, -60)),
    env.DB.prepare('SELECT uid, lesson, MAX(at) at FROM lv GROUP BY uid'),
    env.DB.prepare('SELECT h, day, place, pts FROM snap WHERE day>=? AND day<=?').bind(addDays(today, -8), addDays(today, -7)),
    env.DB.prepare('SELECT mid, uid, cid, stars, at FROM chat_rate WHERE at>=? AND stars<=2 ORDER BY at DESC').bind(now - 14 * 864e5),
    env.DB.prepare('SELECT w.uid, w.chat, w.since, u.username FROM cwait w LEFT JOIN tg_user u ON u.chat=w.chat ORDER BY w.since')]; /* этап 3: откуда ждут — чат платформы (app<uid>) или личка куратора в Telegram */
  let R; try { R = await env.DB.batch(Q) } catch (e) { R = []; for (const q of Q) { try { R.push(await q.all()) } catch (x) { R.push({ results: [] }) } } } /* ev / lv появляются с первым маяком */
  const EV = {}, LV = {}, P7 = {}, RT = {}; for (const x of R[0].results || []) EV[x.uid] = x.d; for (const x of R[1].results || []) LV[x.uid] = x;
  const CWT = {}; for (const x of (R[4] && R[4].results) || []) if (x.uid && !CWT[x.uid]) CWT[x.uid] = x;
  const d7 = addDays(today, -7); for (const x of R[2].results || []) if (!P7[x.h] || x.day === d7) P7[x.h] = { place: x.place | 0, pts: x.pts | 0 };
  for (const x of R[3].results || []) if (!RT[x.uid] && (cid === 'all' || x.cid === cid)) RT[x.uid] = x;
  const priv = !!(D.rows.length && D.rows[0].uid != null), byU = {}, byH = {}; for (const r of D.rows) { if (priv) byU[String(r.uid)] = r; byH[r.h] = r }
  const LM = lessonMap(D), items = [], DROPN = Math.max(8, Math.ceil(0.12 * (D.n || D.rows.length || 0)));
  for (const x of st) { const r = priv ? byU[String(x.uid)] : byH[await hashUid(x.uid)], h = r && r.h, S = [], K = [];
    const last = [x.last, EV[x.uid]].filter(Boolean).sort().pop() || null, d = dd(last), L = LV[x.uid], lm = L ? LM[+L.lesson] : null;
    if (x.wait) { const cw = CWT[x.uid], tg = !!(cw && !/^app/.test(String(cw.chat))); S.push(Object.assign({ k: 'wait', sv: String(x.wait), since: x.wait, src: tg ? 'tg' : 'app' }, tg ? { tchat: String(cw.chat), tun: cw.username || null } : {})) }
    const rt = RT[x.uid]; if (rt) { S.push({ k: 'rate', sv: String(rt.mid), stars: rt.stars | 0, at: rt.at }); K.push({ k: 'rate', label: 'низкая оценка', pts: 25 }) }
    const ld = L && L.at ? dd(dayStr(new Date(L.at))) : null, active = d != null && d <= 2;
    if (L && active && ld >= 4) S.push({ k: 'stuck', sv: L.lesson + '@' + String(L.at).slice(0, 10), days: ld, lesson: +L.lesson, lt: lm ? lm.t : null });
    if (d != null && d < 5 && x.week === 0) S.push({ k: 'stall', sv: String(x.pts | 0) });
    if (S.some(y => y.k === 'stuck' || y.k === 'stall')) K.push({ k: 'stuck', label: S.some(y => y.k === 'stuck') ? 'застрял на уроке' : 'не продвигается', pts: 20 });
    if ((d == null && !(x.week > 0)) || d >= 5) { S.push({ k: 'gone', sv: last || 'never', days: d }); /* нет данных о заходах, но за неделю есть баллы — значит, учится (например, из приложения GetCourse) */ K.push({ k: 'gone', label: 'пропал', pts: 30 }) }
    else if (d >= 3) { S.push({ k: 'cool', sv: last, days: d }); K.push({ k: 'cool', label: 'остывает', pts: 15 }) }
    /* 03.11 (после проверки: 45 из 70 «упали»): только у кого есть баллы; падение ≥8 мест, если за 7 дней баллы не выросли, иначе — ≥ max(8, 12% потока) */
    const s7 = h ? P7[h] : null, p0 = s7 ? s7.place : 0, dp = p0 && x.place ? x.place - p0 : 0, grew = s7 ? (x.pts | 0) > s7.pts : true;
    if (p0 && (x.pts | 0) > 0 && dp >= 8 && (!grew || dp >= DROPN)) { S.push({ k: 'drop', sv: String(x.place), from: p0, to: x.place }); K.push({ k: 'drop', label: 'падение места', pts: 10 }) }
    if (!S.length) continue; const risk = Math.min(100, K.reduce((t, y) => t + y.pts, 0));
    items.push({ uid: x.uid, name: x.name, cur: x.cur, tar: x.tar, tg: !!x.tgid, tgu: x.tgu, place: x.place, lessons: x.lessons, last, days: d, risk, lvl: risk >= 60 ? 'r' : risk >= 35 ? 'w' : '', rk: K, sig: S,
      ctx: lm ? [lm.mod, lm.t ? '«' + lm.t + '»' : '', L && L.at ? (dt => +dt.slice(8) + '\u00a0' + ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'нояб', 'дек'][+dt.slice(5, 7) - 1])(dayStr(new Date(L.at))) : ''].filter(Boolean).join(' · ') : null }) }
  const q = (await hwQueues(env))[cid] || null, v = { at: now, n: st.length, total: D.total_lessons || null, items, hw: q ? { n: q.n, old48: q.old48 || 0, at: q.at } : null };
  return v }
async function todayOut(env, cid) { const B = await todayBase(env, cid); await sigAckEnsure(env);
  const A = {}; for (const a of ((await env.DB.prepare('SELECT uid, k, until, at, sv FROM sig_ack WHERE cid=?').bind(cid).all()).results || [])) A[a.uid + ':' + a.k] = a;
  const now = msNow(), items = [], done = [], prim = L => L.slice().sort((a, b) => SIG_ORD[a.k] - SIG_ORD[b.k])[0].k;
  for (const it of B.items) { let ack = null; const sig = it.sig.map(s => { const a = A[it.uid + ':' + s.k], off = !!a && (a.until > 0 ? a.until > now : a.sv === s.sv); if (off && (!ack || a.at > ack.at)) ack = { at: a.at, until: a.until }; return off ? Object.assign({ off: 1 }, s) : s });
    const on = sig.filter(s => !s.off), k = prim(on.length ? on : sig), o = Object.assign({}, it, { sig, k, why: sigWhy(it, k) }); if (on.length) items.push(o); else done.push(Object.assign(o, { ack })) }
  const ord = (a, b) => SIG_ORD[a.k] - SIG_ORD[b.k] || (a.k === 'wait' ? (a.sig[0].since || 0) - (b.sig[0].since || 0) : 0) || b.risk - a.risk;
  items.sort(ord); done.sort((a, b) => ((b.ack || {}).at || 0) - ((a.ack || {}).at || 0));
  let drafts = []; try { drafts = await aiDrafts(env, cid, items) } catch (e) {}
  return { at: B.at, n: B.n, total: B.total, items, done, hw: B.hw, drafts } }
const AI_BC_SYS = 'Ты помогаешь куратору онлайн-школы OduvanovSchool (поток «AI-креатор 2.0»: дизайн карточек для маркетплейсов с помощью нейросетей) писать сообщения ученикам в Telegram от имени куратора. '
  + 'Пиши по-русски, на «ты», тепло и по делу, как живой человек: без канцелярита, без давления и чувства вины, без воды. 2–6 коротких предложений, можно 1–2 уместных эмодзи. Без markdown, хэштегов и кавычек вокруг текста. '
  + 'Можно обратиться по имени через {имя} — при отправке туда подставится имя каждого ученика. Не выдумывай факты: даты, эфиры, скидки, ссылки, призы — только если они есть в задаче куратора. В конце — один простой шаг, который можно сделать прямо сейчас.';
async function aiText(env, sys, user, max) { if (!env.ANTHROPIC_API_KEY) return { err: 'ИИ не подключён' };
  const { r, j } = await aiFetch(env, JSON.stringify({ model: AI_MODEL(env), max_tokens: max || 600, system: sys, messages: [{ role: 'user', content: user }] }));
  if (!r || !r.ok) return { err: 'Нейросеть не ответила — попробуй ещё раз' }; return { text: (((j && j.content) || []).find(x => x.type === 'text') || {}).text || '' } }
const audInfo = (A, aud, uids, total) => { const L = x => x.slice(0, 12).map(s => '— ' + firstName(s.name) + (s.days != null ? ', не заходил ' + s.days + ' дн.' : ', ни разу не заходил') + (s.lessons != null ? ', уроков ' + s.lessons + (total ? ' из ' + total : '') : '') + (s.hw != null ? ', ДЗ ' + s.hw : '')).join('\n');
  if (aud === 'idle') return 'Кому: ученики, которые не заходили в кабинет 5+ дней (' + A.idle.length + ' чел.):\n' + L(A.idle);
  if (aud === 'stall') return 'Кому: ученики, которые заходят, но за неделю не сдали ни одного ДЗ и не набрали баллов в рейтинге (' + A.stall.length + ' чел.):\n' + L(A.stall);
  if (aud === 'sel') { const S = new Set((uids || []).map(Number)), X = A.idle.concat(A.stall).filter(s => S.has(+s.uid)); return 'Кому: выбранные куратором ученики (' + S.size + ' чел.)' + (X.length ? ':\n' + L(X) : '') }
  return 'Кому: все ученики потока (' + A.n + ' чел.). Сейчас ' + A.idle.length + ' не заходили 5+ дней, ' + A.stall.length + ' не продвигаются неделю.' };
const cleanAi = t => String(t || '').trim().replace(/^["«“]([\s\S]*)["»”]$/, '$1').replace(/\*\*/g, '').trim().slice(0, 3000);
async function aiRecs(env, cid, fresh) { const k = 'airecs:' + cid, c = await kvGet(env, k); if (c && !fresh && msNow() - c.at < 3 * 36e5) return c;
  const A = await curAlerts(env, cid), D = await loadData(env), tot = D.total_lessons || null, R = [];
  /* основа — правила (работают и без ИИ); ИИ пишет текст рекомендации и черновик */
  if (A.hw && A.hw.n) R.push({ kind: 'hw', aud: null, n: A.hw.n, title: 'Проверь ДЗ: ' + A.hw.n + (A.hw.old ? ', из них ' + A.hw.old + ' ждут дольше 48 ч' : ''), why: 'Пока работа не проверена, ученик не получает баллы и теряет темп.' });
  if (A.wait.length) R.push({ kind: 'dm', aud: 'wait', n: A.wait.length, title: 'Ответь ' + A.wait.length + ' ' + (A.wait.length === 1 ? 'ученику' : 'ученикам'), why: 'Ждут ответа: ' + A.wait.slice(0, 4).map(x => firstName(x.name)).join(', ') + '.' });
  if (A.idle.length) R.push({ kind: A.idle.length > 2 ? 'bc' : 'dm', aud: 'idle', n: A.idle.length, title: (A.idle.length > 2 ? 'Рассылка тем, кто пропал: ' : 'Напиши лично: ') + A.idle.length + ' не заходили 5+ дней', why: A.idle.slice(0, 5).map(x => firstName(x.name) + (x.days != null ? ' — ' + x.days + ' дн.' : ' — не заходил')).join(', ') + '.' });
  if (A.stall.length) R.push({ kind: 'bc', aud: 'stall', n: A.stall.length, title: 'Подтолкни ' + A.stall.length + ': заходят, но неделю без ДЗ', why: A.stall.slice(0, 5).map(x => firstName(x.name)).join(', ') + '.' });
  const need = R.filter(x => x.kind === 'bc' || x.kind === 'dm' && x.aud === 'idle');
  if (need.length && env.ANTHROPIC_API_KEY) { const user = 'Для каждой группы напиши черновик сообщения. Верни ТОЛЬКО JSON: {"g":[{"aud":"idle|stall","tip":"одна фраза совета куратору, зачем и как написать этой группе","text":"черновик сообщения"}]}\n\n'
      + need.map(x => audInfo(A, x.aud, null, tot)).join('\n\n');
    const o = await aiText(env, AI_BC_SYS, user, 1200); const m = String(o.text || '').match(/\{[\s\S]*\}/);
    if (m) try { (JSON.parse(m[0]).g || []).forEach(g => { const x = R.find(y => y.aud === g.aud); if (x) { if (g.tip) x.tip = String(g.tip).slice(0, 300); if (g.text) x.draft = cleanAi(g.text) } }) } catch (e) {} }
  const out = { at: msNow(), recs: R }; await kvPut(env, k, out); return out }
/* 03.11 (кабинет куратора, этап 3; макет docs/mockups/kabinet-kuratora: «Уведомления», панель ученика «Что происходит», «ИИ подготовил черновики»).
   ИИ «Что происходит» (POST /app/api/ai/student {c, u, fresh}): сигналы ученика (todayBase), последние 10 сообщений чата платформы (chat_msg), 3 последних замечания к ДЗ (cur_hw.comment) → {what, step, draft}.
   Кэш kv aistu:<uid> на 12 ч; если подпись сигналов (k:sv) другая — считаем заново. «Обновить» (fresh) — не чаще раза в 5 минут.
   Утром (prep, с 9:15 МСК, дедлайн — 13:00): aiRecs(fresh) и «что происходит» для 5 учеников куратора с наибольшим риском → kv aidr:<cid> {day, at, L:[{uid, name, k, draft, what, at}]};
   прогресс — kv aiprep:<день> {done:[…], fin}, бюджет запуска делится: что не влезло — в следующий запуск (9:20 → 9:25 → 9:30).
   Сводка (digest, с 9:30 МСК, один раз в день: kv digest:<cid>:<день>) — куратору в его рабочие дни (hdays), Роману — по школе (digest:admin:<день>).
   Срочные (urgent, раз в час в запуске :45): ★1–2 куратору (новые после kv urg:<cid>.rt) и работы на проверке дольше 72 ч (раз в день) — только в рабочие часы и дни куратора, не чаще раза в час;
   вне часов копится: утренняя сводка сдвигает urg.rt и urg.at. Ожидание ответа не дублируем — его напоминает curRemind. */
const STU_AI_SYS = 'Ты помогаешь куратору онлайн-школы OduvanovSchool (поток «AI-креатор 2.0»: дизайн карточек для маркетплейсов с помощью нейросетей) понять, что происходит с одним учеником, и написать ему личное сообщение. '
  + 'Опирайся только на факты из данных: сигналы, переписку и замечания к ДЗ. Не выдумывай даты, эфиры, скидки, ссылки, причины и события, которых нет в данных; если причина неясна — так и скажи и предложи мягко спросить. '
  + 'Черновик — от имени куратора, по-русски, на «ты», тепло и по делу, как живой человек: без давления, упрёков и чувства вины, без канцелярита; 2–4 коротких предложения, можно одно уместное эмодзи, в конце — один простой шаг. '
  + 'В черновике не упоминай риск, рейтинговые места и то, что за учеником следят («вижу, ты 6 дней не заходил» — нельзя). Без markdown. '
  + 'Куратор и так видит место, число уроков и даты в карточке — не пересказывай цифры, а дай вывод: что, похоже, происходит и почему это важно; не делай выводов, которых нет в данных. '
  + 'Верни ТОЛЬКО JSON: {"what":"диагноз для куратора: 1–2 коротких предложения, до 220 знаков","step":"один конкретный шаг куратору: одно короткое предложение, до 120 знаков","draft":"черновик сообщения ученику с обращением по имени"}';
function sigFact(g) { const P = (n, a, b, c) => n + ' ' + pl(n, [a, b, c]);
  switch (g.k) { case 'wait': { const h = Math.round((msNow() / 1000 - g.since) / 3600); return 'ждёт ответа куратора ' + (h < 1 ? 'меньше часа' : P(h, 'час', 'часа', 'часов')) + (g.src === 'tg' ? ' (написал в Telegram, текста переписки нет)' : '') }
    case 'rate': return 'поставил(а) ★' + g.stars + ' из 5 ответу куратора в чате';
    case 'stuck': return P(g.days, 'день', 'дня', 'дней') + ' на одном уроке' + (g.lt ? ' «' + g.lt + '»' : '') + ', хотя заходит';
    case 'stall': return 'заходит, но за неделю ни одного балла в рейтинге (не сдаёт ДЗ)';
    case 'gone': return g.days == null ? 'ни разу не заходил(а) на сайт и в приложение' : P(g.days, 'день', 'дня', 'дней') + ' не заходит ни на сайт, ни в приложение';
    case 'cool': return P(g.days, 'день', 'дня', 'дней') + ' без заходов';
    case 'drop': return 'за неделю опустился(ась) в рейтинге потока с ' + g.from + '-го на ' + g.to + '-е место' }
  return '' }
/* JSON из ответа модели: без ```-обёртки, с переводами строк внутри строк; в крайнем случае — поля по одному */
function aiJson(t) { t = String(t || '').replace(/```(?:json)?/gi, ''); const m = t.match(/\{[\s\S]*\}/); if (!m) return null; const s = m[0];
  try { return JSON.parse(s) } catch (e) {} try { return JSON.parse(s.replace(/\r?\n/g, ' ')) } catch (e) {}
  const o = {}; for (const k of ['what', 'step', 'draft']) { const x = s.match(new RegExp('"' + k + '"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,\\s*"|\\}\\s*$)')); if (x) o[k] = x[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') } return o.what ? o : null }
const sigSign = it => it ? it.sig.map(g => g.k + ':' + g.sv).sort().join('|') : 'none';
const sigPrim = it => it && it.sig.length ? it.sig.slice().sort((a, b) => SIG_ORD[a.k] - SIG_ORD[b.k])[0].k : null;
async function stuAi(env, cid, uid, o = {}) { uid = +uid; const k = 'aistu:' + uid, c = await kvGet(env, k), base = o.base || await todayBase(env, cid), it = base.items.find(x => +x.uid === uid) || null, sg = sigSign(it), now = msNow();
  if (c && c.what && c.sig === sg && now - c.at < 12 * 36e5 && !(o.fresh && now - c.at > 5 * 60e3)) return Object.assign({ cached: true }, c);
  if (!env.ANTHROPIC_API_KEY) return { err: 'ИИ не подключён' };
  const Q = [env.DB.prepare('SELECT name, curator FROM student WHERE uid=?').bind(uid),
    env.DB.prepare("SELECT dir, text, at FROM chat_msg WHERE uid=? AND del=0 AND dir IN ('in','out') AND text IS NOT NULL AND text<>'' ORDER BY id DESC LIMIT 10").bind(uid),
    env.DB.prepare("SELECT lesson, status, comment, at FROM cur_hw WHERE uid=? AND comment IS NOT NULL AND comment<>'' ORDER BY at DESC LIMIT 3").bind(uid)];
  let R; try { R = await env.DB.batch(Q) } catch (e) { R = []; for (const q of Q) { try { R.push(await q.all()) } catch (x) { R.push({ results: [] }) } } }
  const S = (R[0].results || [])[0] || {}, name = (it && it.name) || S.name || 'Ученик', fn = firstName(name), D = [];
  D.push('Ученик: ' + fn + (it && it.place ? ', ' + it.place + '-е место в рейтинге потока' : '') + (it && it.lessons != null && base.total ? ', уроков пройдено ' + it.lessons + ' из ' + base.total : '') + '.');
  if (it && it.ctx) D.push('Последний открытый урок: ' + it.ctx + '.');
  D.push(it ? 'Сигналы пульта: ' + it.sig.map(sigFact).filter(Boolean).join('; ') + '.' : 'Тревожных сигналов нет: заходит и продвигается.');
  const M = (R[1].results || []).reverse();
  D.push(M.length ? 'Последние сообщения в чате платформы (старые сверху):\n' + M.map(m => (m.dir === 'in' ? 'Ученик' : 'Куратор') + ' (' + dayStr(new Date(m.at)) + '): ' + String(m.text).replace(/\s+/g, ' ').slice(0, 300)).join('\n') : 'Переписки в чате платформы нет.');
  const H = R[2].results || []; if (H.length) D.push('Последние замечания куратора к ДЗ:\n' + H.map(h => '«' + String(h.lesson || 'ДЗ').slice(0, 80) + '» — ' + (h.status === 'rework' ? 'на доработку' : 'принято') + ': ' + String(h.comment).replace(/\s+/g, ' ').slice(0, 400)).join('\n'));
  const r = await aiText(env, STU_AI_SYS, D.join('\n\n') + '\n\nИмя для обращения: ' + fn + '. Сегодня ' + dayStr() + '.', 1000); if (r.err) return { err: r.err };
  const j = aiJson(r.text); if (!j || !j.what) return { err: 'ИИ ответил не по формату — попробуй ещё раз', raw: String(r.text || '').slice(0, 400) };
  const out = { at: now, sig: sg, uid, cid: S.curator || null, name, k: sigPrim(it), what: cleanAi(j.what).slice(0, 400), step: cleanAi(j.step || '').replace(/^Шаг:\s*/i, '').slice(0, 240), draft: cleanAi(j.draft || '').slice(0, 1500) };
  await kvPut(env, k, out); return out }
/* черновики дня для «Сегодня»: только по ученикам, у которых сигнал ещё активен */
async function aiDrafts(env, cid, items) { const day = dayStr(), on = {}; for (const x of items) on[x.uid] = x; const out = [];
  for (const c of cid === 'all' ? CURATORS : CURATORS.filter(x => x.id === cid)) { const d = await kvGet(env, 'aidr:' + c.id); if (!d || d.day !== day) continue;
    for (const x of d.L || []) if (on[x.uid] && x.draft) out.push({ uid: x.uid, name: on[x.uid].name || x.name, cid: c.id, k: on[x.uid].k || x.k, draft: x.draft, what: x.what || '', at: x.at }) }
  return out }
async function prepJob(env, B, force) { const t = msk(), mn = t.getUTCHours() * 60 + t.getUTCMinutes(), day = dayStr();
  if (!force && (mn < 9 * 60 + 15 || mn >= 13 * 60)) return { skip: 'time' };
  if (!env.ANTHROPIC_API_KEY) return { skip: 'noai' };
  const pk = 'aiprep:' + day, P = (await kvGet(env, pk)) || { done: [] }; if (P.fin && !force) return { skip: 'done' };
  const out = { recs: 0, stu: 0 }; let stop = false; B.use(1);
  for (const c of CURATORS) { if (P.done.includes('s:' + c.id)) continue;
    if (!(await curDays(env, c.id)).includes(t.getUTCDay())) { P.done.push('s:' + c.id); continue }
    if (!P.done.includes('r:' + c.id)) { if (!B.ok(10)) { stop = true; break } B.use(10); try { await aiRecs(env, c.id, true); out.recs++ } catch (e) {} P.done.push('r:' + c.id) }
    if (!B.ok(14)) { stop = true; break } B.use(8);
    const T = await todayOut(env, c.id), top = T.items.filter(x => x.risk > 0).sort((a, b) => b.risk - a.risk).slice(0, 5), old = await kvGet(env, 'aidr:' + c.id);
    let L = old && old.day === day ? old.L : [];
    for (const x of top) { const key = 'u:' + x.uid; if (P.done.includes(key)) continue; if (!B.ok(5)) { stop = true; break } B.use(5);
      let r = null; try { r = await stuAi(env, c.id, x.uid, { base: T }) } catch (e) { r = null } P.done.push(key);
      if (r && r.draft) { L = L.filter(y => y.uid !== x.uid); L.push({ uid: x.uid, name: x.name, k: x.k, draft: r.draft, what: r.what, at: r.at }); out.stu++ } }
    await kvPut(env, 'aidr:' + c.id, { day, at: msNow(), L }); if (stop) break; P.done.push('s:' + c.id) }
  if (!stop) P.fin = 1; await kvPut(env, pk, P); out.fin = !!P.fin; return out }
const dgDur = s => { const m = Math.max(1, Math.round((msNow() / 1000 - s) / 60)); return m < 60 ? m + NB + 'мин' : m < 1440 ? Math.floor(m / 60) + NB + 'ч' : Math.floor(m / 1440) + NB + 'д ' + Math.floor(m % 1440 / 60) + NB + 'ч' };
const dgFn = n => th(firstName(n) || 'Ученик');
async function digestFor(env, cid) { const c = CURATORS.find(x => x.id === cid), T = await todayOut(env, cid), I = T.items, g = (x, k) => x.sig.find(y => y.k === k && !y.off);
  const has = k => I.filter(x => g(x, k)), W = has('wait').sort((a, b) => g(a, 'wait').since - g(b, 'wait').since), ST = has('stuck'), GO = has('gone'), DP = has('drop'), RT = has('rate'), q = T.hw, L = [];
  const more = (A, n) => A.length > n ? ' и' + NB + 'ещё ' + (A.length - n) : '';
  if (W.length) L.push('💬 ' + W.length + NB + pl(W.length, ['ждёт', 'ждут', 'ждут']) + ' ответа' + NB + '— ' + (W.length > 1 ? 'дольше всех ' : '') + dgFn(W[0].name) + ', ' + dgDur(g(W[0], 'wait').since));
  if (q && q.n) L.push('📝 ' + q.n + NB + 'ДЗ на' + NB + 'проверке' + (q.old48 ? ', ' + q.old48 + NB + 'дольше 48' + NB + 'ч' : ''));
  if (ST.length) { const ls = [...new Set(ST.map(x => g(x, 'stuck').lt).filter(Boolean))];
    L.push('🧱 ' + (ST.length === 1 ? dgFn(ST[0].name) + ' застрял' + fem(ST[0].name || '') + (ls[0] ? ' на' + NB + '«' + th(ls[0]) + '»' : '') + NB + '— ' + g(ST[0], 'stuck').days + NB + 'дн'
      : ST.length + NB + 'застряли' + (ls.length === 1 && ST.every(x => g(x, 'stuck').lt === ls[0]) ? ' на' + NB + '«' + th(ls[0]) + '»' : ': ' + ST.slice(0, 3).map(x => dgFn(x.name) + (g(x, 'stuck').lt ? NB + '— «' + th(g(x, 'stuck').lt) + '»' : '')).join(', ') + more(ST, 3)))) }
  if (GO.length) L.push('🌙 ' + (GO.length === 1 ? dgFn(GO[0].name) + (g(GO[0], 'gone').days == null ? ' ни разу не' + NB + 'заходил' + fem(GO[0].name || '') : ' не' + NB + 'заходит ' + g(GO[0], 'gone').days + NB + 'дн')
    : GO.length + NB + 'пропали: ' + GO.slice(0, 3).map(x => dgFn(x.name) + ' (' + (g(x, 'gone').days == null ? 'ни разу' : g(x, 'gone').days + NB + 'дн') + ')').join(', ') + more(GO, 3)));
  if (DP.length) L.push('📉 ' + (DP.length === 1 ? dgFn(DP[0].name) + ' опустил' + (fem(DP[0].name || '') ? 'ась' : 'ся') + ' с' + NB + g(DP[0], 'drop').from + '-го на' + NB + g(DP[0], 'drop').to + '-е место'
    : DP.length + NB + 'упали в' + NB + 'рейтинге: ' + DP.slice(0, 3).map(x => dgFn(x.name) + ' (' + g(x, 'drop').from + '→' + g(x, 'drop').to + ')').join(', ') + more(DP, 3)));
  if (RT.length) L.push('⭐ ' + (RT.length === 1 ? dgFn(RT[0].name) + ' поставил' + fem(RT[0].name || '') + ' ★' + g(RT[0], 'rate').stars + ' твоему ответу в' + NB + 'чате'
    : RT.length + NB + pl(RT.length, ['низкая оценка', 'низкие оценки', 'низких оценок']) + ' в' + NB + 'чате: ' + RT.slice(0, 3).map(x => dgFn(x.name) + ' ★' + g(x, 'rate').stars).join(', ') + more(RT, 3)));
  const dr = (await aiDrafts(env, cid, I)).length;
  const text = '☀️ <b>Доброе утро, ' + th(c ? c.name : cid) + '!</b> ' + (L.length ? 'Что сегодня:\n\n' + L.join('\n') + (dr ? '\n\n✨ ИИ подготовил ' + dr + NB + pl(dr, ['черновик', 'черновика', 'черновиков']) + NB + '— проверь в' + NB + '«Сегодня».' : '') : '\nВсё спокойно 👌 Никто не' + NB + 'ждёт ответа, ДЗ на' + NB + 'проверке нет, ученики в' + NB + 'ритме.');
  const buttons = [[{ text: 'Открыть «Сегодня»', url: PULT_URL + '#today' }].concat(q && q.n ? [{ text: 'Проверить ДЗ', url: PULT_URL + '#hw' }] : [])];
  return { text, buttons, st: { wait: W.length, waitSince: W[0] ? g(W[0], 'wait').since : null, hw: q ? q.n : null, hw48: q ? q.old48 || 0 : null, stuck: ST.length, gone: GO.length, drop: DP.length, rate: RT.length, drafts: dr } } }
async function digestAdmin(env, R) { const L = [], P = (n, a, b, c) => n + NB + pl(n, [a, b, c]), dr = [];
  for (const c of CURATORS) { const d = R[c.id]; if (!d) continue; const s = d.st, X = [];
    if (s.wait) X.push('💬 ' + P(s.wait, 'ждёт', 'ждут', 'ждут') + ' (дольше всех ' + dgDur(s.waitSince) + ')');
    if (s.hw) X.push('📝 ' + s.hw + NB + 'ДЗ' + (s.hw48 ? ', ' + s.hw48 + ' >' + NB + '48' + NB + 'ч' : ''));
    if (s.stuck) X.push('🧱 ' + P(s.stuck, 'застрял', 'застряли', 'застряли')); if (s.gone) X.push('🌙 ' + P(s.gone, 'пропал', 'пропали', 'пропали'));
    if (s.drop) X.push('📉 ' + P(s.drop, 'упал', 'упали', 'упали')); if (s.rate) X.push('⭐ ' + P(s.rate, 'низкая оценка', 'низкие оценки', 'низких оценок'));
    if (s.drafts) dr.push(th(c.name) + NB + s.drafts);
    L.push('<b>' + th(c.name) + '</b>' + (d.off ? ' (сегодня не' + NB + 'рабочий день)' : '') + ': ' + (X.length ? X.join(' · ') : 'всё спокойно 👌')) }
  return { text: '☀️ <b>Доброе утро!</b> Кураторы сегодня:\n\n' + L.join('\n') + (dr.length ? '\n\n✨ ИИ подготовил черновики: ' + dr.join(', ') + '.' : ''), buttons: [[{ text: 'Открыть «Сегодня»', url: PULT_URL + '#today' }]] } }
async function digestJob(env, B, force) { const t = msk(), mn = t.getUTCHours() * 60 + t.getUTCMinutes(), day = dayStr(), now = msNow();
  if (!force && (mn < 9 * 60 + 29 || mn >= 14 * 60)) return { skip: 'time' };
  const out = { sent: [] }, R = {}; B.use(1);
  for (const c of CURATORS) { const fk = 'digest:' + c.id + ':' + day; if (await kvGet(env, fk)) continue;
    const on = (await curDays(env, c.id)).includes(t.getUTCDay()); if (!B.ok(14)) { out.left = 1; break } B.use(12);
    const d = await digestFor(env, c.id); R[c.id] = d; if (!on) { d.off = 1; await kvPut(env, fk, { at: now, off: 1 }); continue }
    const ct = await env.DB.prepare('SELECT tg_id FROM cur_tg WHERE cid=?').bind(c.id).first(); let ok = false;
    if (ct && ct.tg_id) { B.use(1); const j = await tgSend(env, ct.tg_id, d.text, d.buttons); ok = !!(j && j.ok) }
    await kvPut(env, fk, { at: now, ok }); const U = (await kvGet(env, 'urg:' + c.id)) || {}; U.at = now; U.rt = now; await kvPut(env, 'urg:' + c.id, U); out.sent.push(c.id + (ok ? '' : ':fail')) }
  const ak = 'digest:admin:' + day; if (!out.left && !(await kvGet(env, ak))) { for (const c of CURATORS) if (!R[c.id]) { if (!B.ok(13)) { out.left = 1; break } B.use(12); R[c.id] = await digestFor(env, c.id); R[c.id].off = (await curDays(env, c.id)).includes(t.getUTCDay()) ? 0 : 1 }
    if (!out.left) { const a = await digestAdmin(env, R); for (const x of await admins(env)) { if (!B.ok(1)) break; B.use(1); await tgSend(env, x, a.text, a.buttons) } await kvPut(env, ak, { at: now }); out.sent.push('admin') } }
  if (out.sent.length) try { await logIt(env, 'digest', 0, out.sent.join(',')) } catch (e) {}
  return out }
async function urgentJob(env, B) { const now = msNow(), t = msk(), day = dayStr(), out = { sent: [] }; if (!B.ok(6)) return { skip: 'budget' }; B.use(3); const Q = await hwQueues(env);
  for (const c of CURATORS) { if (!B.ok(6)) break; B.use(3); const h = await curHours(env, c.id), dd = await curDays(env, c.id); if (!curOn(h, dd, t)) continue;
    const U = (await kvGet(env, 'urg:' + c.id)) || {}; if (!U.rt) { U.rt = now; await kvPut(env, 'urg:' + c.id, U); continue } if (U.at && now - U.at < 3600e3 - 180e3) continue;
    let rs = []; try { rs = (await env.DB.prepare('SELECT r.mid, r.uid, r.stars, r.at, s.name, f.reasons, f.text FROM chat_rate r LEFT JOIN student s ON s.uid=r.uid LEFT JOIN chat_fb f ON f.mid=r.mid WHERE r.cid=? AND r.stars<=2 AND r.at>? ORDER BY r.at').bind(c.id, U.rt).all()).results || [] } catch (e) { rs = [] }
    rs = rs.filter(r => !isStaffUid(env, r.uid));
    const q = Q[c.id], fresh = q && q.at > now - 864e5, n72 = fresh ? (q.old72 != null ? q.old72 : q.oldest && now - q.oldest > 72 * 36e5 ? -1 : 0) : 0, hw = !!n72 && U.hwd !== day, L = [], btn = [];
    for (const r of rs.slice(0, 3)) { let rsn = []; try { rsn = JSON.parse(r.reasons || '[]') } catch (e) {}
      L.push('⭐ ' + th(r.name || 'Ученик') + ' поставил' + fem(r.name || '') + ' ★' + r.stars + ' твоему ответу в' + NB + 'чате' + (rsn.length ? '. Причины: ' + th(rsn.join(', ')) : '') + (r.text ? '\n«' + th(String(r.text).slice(0, 200)) + '»' : '')) }
    if (rs.length > 3) L.push('…и' + NB + 'ещё ' + (rs.length - 3));
    if (rs.length === 1) btn.push({ text: 'Открыть ученика', url: PULT_URL + '#today/u=' + rs[0].uid + '/chat' });
    if (hw) { L.push('📝 ' + (n72 > 0 ? n72 + NB + pl(n72, ['работа ждёт', 'работы ждут', 'работ ждут']) : 'Есть работы, которые ждут') + ' проверки больше 3' + NB + 'дней' + (q.oldest ? ' (самая старая — ' + Math.floor((now - q.oldest) / 864e5) + NB + 'дн)' : '')); btn.push({ text: 'Проверить ДЗ', url: PULT_URL + '#hw' }) }
    if (!L.length) continue;
    const ct = await env.DB.prepare('SELECT tg_id FROM cur_tg WHERE cid=?').bind(c.id).first(); if (!ct || !ct.tg_id) continue;
    B.use(1); await tgSend(env, ct.tg_id, '🔴 <b>Срочно</b>\n' + L.join('\n'), btn.length ? [btn] : null);
    U.at = now; if (rs.length) U.rt = Math.max(...rs.map(r => r.at)); if (hw) U.hwd = day; await kvPut(env, 'urg:' + c.id, U); out.sent.push(c.id + ':' + rs.length + (hw ? '+hw' : '')) }
  return out }
const hwqOut = q => q ? { hw_q: q.n, hw_old: q.old48 || 0, hw_oldest: q.oldest || null, hw_q_at: q.at } : { hw_q: null, hw_old: null, hw_oldest: null, hw_q_at: null };
/* 02.11: баллы за ДЗ из ленты ответов — base (до ×2), x2 (1 — двойные), fix (1 — только правка баллов у уже принятой работы, без «Проверено») */
let CURHW_OK = false;
async function curHwEnsure(env) { if (CURHW_OK) return; const has = ((await env.DB.prepare("SELECT name FROM pragma_table_info('cur_hw')").all()).results || []).map(r => r.name);
  for (const c of ['x2 INTEGER DEFAULT 0', 'base INTEGER', 'fix INTEGER DEFAULT 0', 'who TEXT']) if (!has.includes(c.split(' ')[0])) { try { await env.DB.prepare('ALTER TABLE cur_hw ADD COLUMN ' + c).run() } catch (e) {} } CURHW_OK = true }
async function curApi(env, req, path) { const u = new URL(req.url); await bksSt(env); await curHwEnsure(env); const s = await staffSess(env, req, u); if (!s) return deny(req);
  const adm = s.role === 'admin', o = req.method === 'POST' ? await req.json().catch(() => ({})) : {}, okCid = v => CURATORS.some(c => c.id === v), now = msNow();
  if (path === '/cur/queue') { if (req.method === 'POST') { const q = hwqClean(o); if (!q) return json(req, { ok: false, err: 'n — число работ в очереди' }, 400); if (!adm && !s.cid) return json(req, { ok: false, err: 'Нет куратора в сессии' }, 400);
      const rec = Object.assign(q, { at: now }); if (adm && o.by && typeof o.by === 'object') { rec.by = {}; for (const k of Object.keys(o.by).slice(0, 20)) if (okCid(k) || k === 'none') { const x = hwqClean(o.by[k]); if (x) rec.by[k] = x } }
      await kvPut(env, 'hwq:' + (adm ? 'admin' : s.cid), rec); return json(req, { ok: true, at: now }) }
    const Q = await hwQueues(env), cq = u.searchParams.get('cid'); return json(req, Object.assign({ ok: true }, hwqOut(Q[adm ? (okCid(cq) ? cq : 'all') : s.cid])), 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/cur/alerts') { const cid = adm ? 'all' : s.cid; if (!cid) return json(req, { ok: false, err: 'Нет куратора в сессии' }, 400); const A = await curAlerts(env, cid), cut = x => x.slice(0, 6).map(y => ({ uid: y.uid, name: firstName(y.name), days: y.days }));
    return json(req, { ok: true, cid, n: A.n, idle: A.idle.length, stall: A.stall.length, wait: A.wait.length, wait_old: A.wait.length ? A.wait[0].since : null, hw: A.hw, idleL: cut(A.idle), stallL: cut(A.stall) }, 200, { 'Cache-Control': 'no-store' }) }
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
    const x2 = o.x2 ? 1 : 0, base = o.base != null ? Math.max(0, Math.min(1000, Math.round(+o.base || 0))) : null, /* 02.11: base есть только у ленты ответов — по нему рейтинг берёт баллы куратора; «Проверка ДЗ» без ×2 — рейтинг считает сам */ fix = o.fix && status === 'accept' ? 1 : 0;
    const r = await env.DB.prepare('INSERT INTO cur_hw (cid, uid, answer_id, lesson_id, lesson, status, pts, comment, sent_at, at, x2, base, fix, who) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(cid, st.uid, aid, lid, lesson, status, pts, comment, isNaN(sent) ? null : sent, now, x2, base, fix, bStr(staffWho(s), 60) || null).first();
    if (fix) { let notified = false; if (st.tg_chat && pts && await notifOn(env, st.uid, 'hw')) { await tgSend(env, st.tg_chat, '🎯 <b>Баллы за ДЗ' + (lesson ? ' «' + th(lesson) + '»' : '') + ' обновлены</b>\n' + nbt('+' + pts + ' ' + pl(pts, ['балл', 'балла', 'баллов']) + (x2 ? ' · ×2 за сдачу вовремя' : '')) + '\nВ рейтинге — после ближайшего обновления', null); notified = true }
      await logIt(env, 'cur-hw-fix', st.uid, (cid || 'admin') + ' ' + pts + (x2 ? ' x2' : '')); return json(req, { ok: true, id: r.id, notified, fix: 1 }) }
    await logIt(env, 'cur-hw', st.uid, (cid || 'admin') + ' ' + status + ' ' + pts);
    let notified = false; if (!dup && st.tg_chat && await notifOn(env, st.uid, 'hw')) { const who = staffWho(s), L = lesson ? ' «' + th(lesson) + '»' : '', btn = lid ? [[{ text: status === 'accept' ? 'Посмотреть работу' : 'Открыть замечания', url: maLink(env, 'l' + lid) }]] : null;
      if (status === 'accept') { let place = null; try { const D = await loadData(env), rr = await rowFor(D, st.uid); place = rr && rr.place || null } catch (e) {}
        await tgSend(env, st.tg_chat, '✅ <b>ДЗ' + L + ' принято</b>\n' + nbt((pts ? '+' + pts + ' ' + pl(pts, ['балл', 'балла', 'баллов']) + (x2 ? ' · ×2 за сдачу вовремя' : '') : 'Проверил' + fem(who) + ' ' + th(who)) + (place ? ' · ты на ' + place + ' месте' : '')) + (comment ? '\n\n«' + th(comment) + '» — ' + th(who) : ''), btn) }
      else { const notes = (Array.isArray(o.notes) && o.notes.length ? o.notes : comment.split(/\n+/)).map(x => bStr(x, 300)).filter(Boolean).slice(0, 10), due = /^\d{4}-\d{2}-\d{2}$/.test(o.due || '') ? o.due : null;
        await tgSend(env, st.tg_chat, '✏️ <b>ДЗ' + L + NB + '— нужно доработать</b>\n' + (notes.length ? notes.map((x, i) => (i + 1) + '. ' + th(x)).join('\n') : nbt('Посмотри замечания ' + th(who) + ' на странице урока.')) + (due ? '\n\n' + nbt('Пересдай до ' + human(due) + ', чтобы не потерять ×2') : ''), btn) }
      notified = true }
    return json(req, { ok: true, id: r.id, notified, dup: !!dup }) }
  /* 02.11: баллы, поставленные в ленте/кабинете, по id ответов (последняя запись «принято» на ответ) */
  if (path === '/cur/hwpts') { const ids = String(u.searchParams.get('ids') || '').split(',').map(Number).filter(okUid).slice(0, 300); if (!ids.length) return json(req, { ok: true, pts: {} });
    const rs = await qAll(env.DB.prepare('SELECT answer_id, status, pts, x2, base, at, cid, who FROM cur_hw WHERE answer_id IN (' + ids.map(() => '?').join(',') + ') ORDER BY id').bind(...ids)), out = {};
    const fst = {}; for (const x of rs) if (x.status === 'accept' && fst[x.answer_id] == null) fst[x.answer_id] = x; /* кто принял — первая запись «принято»; баллы — последняя */
    for (const x of rs) out[x.answer_id] = x.status === 'accept' ? { pts: x.pts | 0, x2: x.x2 ? 1 : 0, base: x.base == null ? x.pts | 0 : x.base | 0, at: x.at, by: (fst[x.answer_id] || x).who || (c => c ? (CURATORS.find(k => k.id === c) || {}).full || c : 'Роман')((fst[x.answer_id] || x).cid), acc_at: (fst[x.answer_id] || x).at } : null;
    for (const k of Object.keys(out)) if (!out[k]) delete out[k]; return json(req, { ok: true, pts: out }, 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/cur/hwstat') { const days = Math.max(1, Math.min(90, +u.searchParams.get('days') || 30)), cq = adm ? (okCid(u.searchParams.get('cid')) ? u.searchParams.get('cid') : 'all') : s.cid;
    const rs = await qAll(cq === 'all' ? env.DB.prepare('SELECT cid, status, sent_at, at FROM cur_hw WHERE at>=? AND COALESCE(fix,0)=0').bind(now - days * 864e5) : env.DB.prepare('SELECT cid, status, sent_at, at FROM cur_hw WHERE cid=? AND at>=? AND COALESCE(fix,0)=0').bind(cq, now - days * 864e5));
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
    for (let i = 0; i < q.length; i += 80) await env.DB.batch(q.slice(i, i + 80)); await memoClear(env, 'stu:');
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
    const qa = Q.all, earned_all = Math.round(Object.values(E).reduce((t, e) => t + (e.total || 0), 0)); /* 04.11: «Все» в статистике — общий заработок всех учеников */ return json(req, { ok: true, days: 30, curators, earned_all, no_curator: none, no_curator_n: none.length, hw_wait: qa ? qa.n : null, hw_old: qa ? qa.old48 || 0 : null, hw_oldest: qa ? qa.oldest || null : null, hw_q_at: qa ? qa.at : null, hw_part: !!(qa && qa.part) }, 200, { 'Cache-Control': 'no-store' }) }
  /* 31.10 (Роман, задача 106): вкладка «Отзывы» пульта. Админ — всё: звёзды уроков и анкеты модулей (отчёт «Голос учеников»), Нейро 👍/👎, кураторы, лента.
     Куратор — только соревнование кураторов: звёзды ответам, время ответа (своё и других). Оценок уроков и анкет куратор не получает (сервер их не отдаёт). */
  if (path === '/rev/hide' && req.method === 'POST') { if (!adm) return json(req, { ok: false, err: 'Только Роман' }, 403); const k = String(o.k || '').slice(0, 400); if (!k) return json(req, { ok: false, err: 'нет отзыва' }, 400);
    const H = (await kvGet(env, 'revhide')) || {}; if (o.hide) H[k] = { why: String(o.why || 'Убрал Роман').slice(0, 200), by: 'Роман', at: now }; else { delete H[k]; const C = (await kvGet(env, 'revai')) || {}; C[k] = { v: 'ok', why: 'Вернул Роман', at: now }; await kvPut(env, 'revai', C) }
    await kvPut(env, 'revhide', H); return json(req, { ok: true }) }
  if (path === '/rev/data') { const days = [7, 30].includes(+u.searchParams.get('days')) ? +u.searchParams.get('days') : 0, from = days ? now - days * 864e5 : 0;
    const cs = await curStats(env, days || 3650), [rt, rd] = await env.DB.batch([env.DB.prepare('SELECT cid, stars, COUNT(*) n FROM chat_rate WHERE at>=? GROUP BY cid, stars').bind(from),
      env.DB.prepare('SELECT cid, COUNT(DISTINCT uid) n FROM chat_rate WHERE at>=? GROUP BY cid').bind(from)]), dist = {}, who = {};
    for (const x of rt.results || []) { const d = dist[x.cid] = dist[x.cid] || [0, 0, 0, 0, 0]; if (x.stars >= 1 && x.stars <= 5) d[x.stars - 1] += x.n } for (const x of rd.results || []) who[x.cid] = x.n;
    const curators = CURATORS.map(c => { const k = cs.curators.find(x => x.id === c.id) || {}, d = dist[c.id] || [0, 0, 0, 0, 0], n = d.reduce((a, b) => a + b, 0);
      return { cid: c.id, name: c.full, short: c.name, photo: 'https://romanoduvanov.github.io/otzyvy/gc/curators/' + c.id + '.jpg', me: !adm && s.cid === c.id, stars: n ? Math.round(d.reduce((a, b, i) => a + b * (i + 1), 0) / n * 100) / 100 : null, stars_n: n, students_n: who[c.id] || 0, dist: d,
        median_min: k.median == null ? null : Math.max(1, Math.round(k.median / 60)), in2h: k.in2h == null ? null : k.in2h, answered: k.answered || 0, efir: null } });
    const out = { ok: true, role: adm ? 'admin' : 'curator', days, curators }; if (!adm) return json(req, out, 200, { 'Cache-Control': 'no-store' });
    const D0 = await revSchool(env); if (D0 && u.searchParams.get('ai') !== '0') await revAiCheck(env, D0, 15).catch(() => []); const H = (await kvGet(env, 'revhide')) || {}, D = revAdj(D0, H); if (D) { const W = D.week || {}, A = D.all || {}, M = {}; for (const m of D.mods || []) M[m.id] = m;
      const mods = (D.mods || []).map(m => { const g = (D.agg || {})[m.id] || {}, sum = (f, w) => Object.values(g).reduce((t, x) => t + (x[f] != null ? x[f] * x[w] : 0), 0), cnt = w => Object.values(g).reduce((t, x) => t + (x[w] || 0), 0), nr = cnt('n_r'), ns = cnt('n_s');
        const ws = w => Object.values(g).reduce((t, x) => t + (x.stars != null && w === 'n_r' ? x.n_r : 0), 0), wi = Object.values(g).reduce((t, x) => t + (x.interest != null ? x.n_s : 0), 0);
        return { id: m.id, name: m.name, group: m.group, stars: ws('n_r') ? Math.round(sum('stars', 'n_r') / ws('n_r') * 100) / 100 : null, n_r: nr, interest: wi ? Math.round(sum('interest', 'n_s') / wi * 100) / 100 : null, n_s: ns } }).filter(m => m.n_r || m.n_s);
      const dfrom = days ? new Date(from + 3 * 3600e3).toISOString().slice(0, 10) : '';
      const feed = [], FK = {}; for (const c of (D.comments || []).filter(c => !dfrom || c.d >= dfrom).slice(0, 800)) { const src = c.src === 'Оценка урока' ? 'lesson' : 'anketa', k = src === 'anketa' ? [c.who, c.d, c.m, c.s].join('|') : null; /* анкета: ответы на «почему» и «вопросы» — одна запись */
        if (k && FK[k]) { if (c.t && FK[k].t.indexOf(c.t) < 0) FK[k].t = (FK[k].t ? FK[k].t + ' · ' : '') + c.t; continue }
        const x = { k: revKey(c), d: c.d, who: c.who, src, q: c.q, mod: (M[c.m] || {}).name || c.m, score: c.score, scale: c.scale, t: c.t || '', low: revLow(c) }; if (k) FK[k] = x; feed.push(x) }
      const hid = [], HK = {}; for (const c of D0.comments || []) { const hk = revKey(c), h = H[hk]; if (!h) continue; if (HK[hk]) { if (c.t && HK[hk].t.indexOf(c.t) < 0) HK[hk].t += ' · ' + c.t; continue } HK[hk] = { k: hk, d: c.d, who: c.who, src: c.src === 'Оценка урока' ? 'lesson' : 'anketa', q: c.q, mod: (M[c.m] || {}).name || c.m, score: c.score, scale: c.scale, t: c.t || '', why: h.why, by: h.by, hat: h.at }; hid.push(HK[hk]) }
      const seen = new Set(), low = feed.filter(c => c.low && !seen.has(c.who + c.d + c.src + c.mod) && seen.add(c.who + c.d + c.src + c.mod));
      out.school = { updated: D.updated, week: W.ratings != null ? { stars: W.stars, n_r: W.ratings, n_s: W.surveys, interest: W.interest } : null, all: { stars: A.stars, n_r: A.n_r, n_s: A.n_s, interest: A.interest, useful: A.useful, apply: A.apply, dist: A.dist || null }, mods, feed: feed.slice(0, 300), low: low.slice(0, 100), low_n: low.length, hidden: hid.sort((a, b) => a.d < b.d ? 1 : -1).slice(0, 200), ai_err: REVAI_ERR || null } }
    try { const f = await env.DB.prepare('SELECT SUM(CASE WHEN vote>0 THEN 1 ELSE 0 END) up, SUM(CASE WHEN vote<0 THEN 1 ELSE 0 END) down FROM ai_fb WHERE at>=?').bind(from).first(); const up = (f && f.up) || 0, dn = (f && f.down) || 0; out.neuro = { up, down: dn, share: up + dn ? Math.round(up / (up + dn) * 100) : null } } catch (e) { out.neuro = null }
    const fl = await qAll(env.DB.prepare('SELECT r.mid, r.uid, r.cid, r.stars, r.at, f.reasons, f.text, s.name FROM chat_rate r LEFT JOIN chat_fb f ON f.mid=r.mid LEFT JOIN student s ON s.uid=r.uid WHERE r.at>=? AND r.stars<=3 ORDER BY r.at DESC LIMIT 40').bind(from));
    out.chat_low = fl.filter(x => !isStaffUid(env, x.uid)).map(x => ({ mid: x.mid, uid: x.uid, name: x.name, cid: x.cid, stars: x.stars, at: x.at, reasons: x.reasons, text: x.text }));
    return json(req, out, 200, { 'Cache-Control': 'no-store' }) }
  return json(req, { ok: false, err: 'not found' }, 404) }

/* ---------- Отзывы (31.10, задача 106): данные отчёта «Голос учеников» (otzyvy/index.html, сборщик) — кэш 6 ч в kv revsrc; бот админам ----------
   Сразу: анкета модуля ниже 5 из 10 или оценка урока ★1–2 (как только сборщик их принёс; уже отправленные — kv revsent).
   Понедельник 10:00 МСК: сводка за неделю (kv revweek — день последней отправки, revprev — прошлые цифры для «было»). */
/* 02.11 (Роман): «мусорные» отзывы не портят статистику. revhide — убранные (Роман вручную или ИИ), revai — вердикты ИИ по низким оценкам.
   Убранный отзыв не попадает в ленту, «Низкие», уведомления, а его оценка вычитается из средних (модуль, поток, неделя). Ничего не удаляется: «Вернуть» в «Убранных». */
const revKey = c => [c.src === 'Оценка урока' || c.src === 'lesson' ? 'L' : 'A', c.who, c.d, c.m, c.s, c.src === 'Оценка урока' || c.src === 'lesson' ? c.q : ''].join('|');
function revAdj(D, H) { if (!D || !H || !Object.keys(H).length) return D; const X = JSON.parse(JSON.stringify(D)), wfrom = addDays(X.updated || dayStr(), -6), done = new Set();
  const sub = (o, f, nf, sc) => { if (!o || o[f] == null || !(o[nf] > 0)) return; const n = o[nf]; o[f] = n > 1 ? Math.round((o[f] * n - sc) / (n - 1) * 100) / 100 : null; o[nf] = n - 1 };
  X.comments = (X.comments || []).filter(c => { const k = revKey(c); if (!H[k]) return true; if (done.has(k) || c.score == null) return false; done.add(k);
    const g = X.agg && X.agg[c.m] && X.agg[c.m][c.s], wk = c.d >= wfrom && X.week;
    if (c.src === 'Оценка урока') { sub(g, 'stars', 'n_r', c.score); sub(X.all, 'stars', 'n_r', c.score); if (X.all && X.all.dist && X.all.dist[c.score] > 0) { X.all.dist[c.score]--; if (X.all.n_r) X.all.five = Math.round((X.all.dist[5] || 0) / X.all.n_r * 100) } if (wk) sub(X.week, 'stars', 'ratings', c.score) }
    else { sub(g, 'interest', 'n_s', c.score); sub(X.all, 'interest', 'n_s', c.score); if (wk) sub(X.week, 'interest', 'surveys', c.score) }
    return false });
  X.hidden_n = done.size; return X }
/* ИИ: честная ли низкая оценка. ok — критика качества (остаётся); tech — накладка с материалом (не тот ролик, нет видео) — убираем из статистики, но Роману сообщаем; skip — к качеству не относится */
let REVAI_ERR = '';
async function revAiCheck(env, D, lim) { if (!env.ANTHROPIC_API_KEY || !D) return []; const H = (await kvGet(env, 'revhide')) || {}, C = (await kvGet(env, 'revai')) || {}, T = {}, ord = [];
  for (const c of D.comments || []) { if (!revLow(c)) continue; const k = revKey(c); if (C[k] || H[k]) continue; if (!T[k]) { T[k] = { c, t: [] }; ord.push(k) } if (c.t && T[k].t.indexOf(c.t) < 0) T[k].t.push(c.t) }
  const todo = ord.slice(0, lim || 15); if (!todo.length) return []; const M = {}; for (const m of D.mods || []) M[m.id] = m.name;
  const L = todo.map((k, i) => { const c = T[k].c; return i + '. ' + (c.src === 'Оценка урока' ? 'Урок «' + c.q + '» (модуль «' + (M[c.m] || c.m) + '»), оценка ' + c.score + ' из 5' : 'Анкета модуля «' + (M[c.m] || c.m) + '», интерес ' + c.score + ' из 10') + '. Текст: ' + (T[k].t.join(' / ') || '(без текста)') }).join('\n');
  const sys = 'Ты проверяешь низкие оценки уроков и анкет онлайн-школы дизайна карточек для маркетплейсов. Для каждой реши, отражает ли она качество урока или модуля. '
    + 'ok — честная критика: содержание, подача, сложность, темп, нехватка практики или примеров, непонятно объяснено — даже резко. Без текста — тоже ok. '
    + 'tech — техническая накладка с материалом: не тот ролик, нет видео, урок дублирует другой, битая ссылка, не открывается файл. Это чинят, а не учитывают в оценке. '
    + 'skip — оценка не про качество: ученик не смотрел урок, уже знает тему и поэтому поставил низко, тема ему не нужна, перепутал шкалу (текст хвалит, а балл низкий), бессмыслица. '
    + 'Если сомневаешься — ok. В why не используй кавычки. Верни ТОЛЬКО JSON: {"r":[{"i":0,"v":"ok|tech|skip","why":"коротко, до 12 слов"}]}';
  const o = await aiText(env, sys, L, 900), m = String(o.text || '').match(/\{[\s\S]*\}/); REVAI_ERR = o.err || (m ? '' : 'no-json: ' + String(o.text || '').slice(0, 200)); if (!m) return []; let R = []; try { R = JSON.parse(m[0]).r || [] } catch (e) { const re = /"i"\s*:\s*(\d+)\s*,\s*"v"\s*:\s*"(ok|tech|skip)"(?:\s*,\s*"why"\s*:\s*"([^"]*))?/g; let x; while ((x = re.exec(m[0]))) R.push({ i: +x[1], v: x[2], why: x[3] || '' }); REVAI_ERR = R.length ? '' : 'parse: ' + String(e.message).slice(0, 80); if (!R.length) return [] }
  const now = msNow(), out = []; for (const x of R) { const k = todo[+x.i]; if (!k || !/^(ok|tech|skip)$/.test(x.v)) continue; C[k] = { v: x.v, why: String(x.why || '').slice(0, 160), at: now };
    if (x.v !== 'ok') { H[k] = { why: (x.v === 'tech' ? 'Тех. накладка: ' : 'Не про качество: ') + C[k].why, by: 'ИИ', at: now, v: x.v }; out.push([k, x.v, C[k].why]) } }
  await kvPut(env, 'revai', C); await kvPut(env, 'revhide', H); return out }
const revLow = c => c.score != null && (c.scale === 10 ? c.score < 5 : c.score <= 2);
let REV_MEM = null;
async function revSchool(env) { const now = Date.now(); if (REV_MEM && now - REV_MEM.t < 1800e3) return REV_MEM.v; let c = await kvGet(env, 'revsrc');
  if (!c || !c.v || now - (c.t || 0) > 6 * 3600e3) { let v = null;
    try { const r = await fetch(env.SCHOOL_SRC || SCHOOL_SRC); if (r.ok) { const m = (await r.text()).match(/<script type="application\/json" id="data">([\s\S]*?)<\/script>/); if (m) { const D = JSON.parse(m[1]); if (D && D.all) { delete D.img; delete D.trend; D.comments = (D.comments || []).slice(0, 1500); v = D } } } } catch (e) {}
    c = v ? { t: now, v } : { t: now - 5 * 3600e3, v: (c && c.v) || null }; if (v || c.v) await kvPut(env, 'revsrc', c) }
  REV_MEM = { t: now, v: c.v }; return c.v }
const PULT_URL = 'https://oduvanovroman.getcourse.ru/teach/control/stream?fs=pult';
async function revJob(env, B) { const D0 = await revSchool(env); if (!D0) return { skip: 'nodata' }; const out = { sent: 0 }, M = {}; for (const m of D0.mods || []) M[m.id] = m.name;
  out.ai = (await revAiCheck(env, D0, 15).catch(() => [])).length; const H = (await kvGet(env, 'revhide')) || {}, D = revAdj(D0, H), TECH = {}; for (const c of D0.comments || []) { const h = H[revKey(c)]; if (h && h.v === 'tech' && revLow(c)) TECH[[c.who, c.d, c.src, c.m].join('|')] = [c, h] }
  const key = c => [c.who, c.d, c.src, c.m].join('|'), lowNow = [], seen = new Set(); for (const c of D.comments || []) { if (!revLow(c)) continue; const k = key(c); if (seen.has(k)) continue; seen.add(k); lowNow.push([k, c]) }
  let sent = await kvGet(env, 'revsent'); const A = await admins(env);
  if (!Array.isArray(sent)) { await kvPut(env, 'revsent', lowNow.map(x => x[0])); out.seeded = lowNow.length } /* первый запуск: старые низкие оценки не шлём */
  else { const S = new Set(sent), fresh = lowNow.filter(x => !S.has(x[0])).slice(0, 8);
    for (const [k, c0] of Object.entries(TECH)) { if (S.has(k)) continue; const [c, h] = c0, t = '🛠 <b>Тех. накладка в уроке</b> (в статистику не идёт)\n' + th(c.who) + ' — урок «' + th(c.q) + '», ★' + c.score + (c.t ? '\n«' + th(String(c.t).slice(0, 300)) + '»' : '') + '\n<i>ИИ: ' + th(h.why.replace(/^Тех\. накладка: /, '')) + '</i>';
      for (const a of A) { if (!B.ok(1)) break; B.use(1); await tgSend(env, a, t, [[{ text: 'Все отзывы', url: PULT_URL }]]) } sent.push(k); S.add(k); out.sent++ }
    for (const [k, c] of fresh) { const t = (c.src === 'Анкета' ? '📝 <b>Анкета модуля ' + c.score + ' из 10</b>' : '⭐ <b>Низкая оценка ★' + c.score + '</b>') + '\n' + th(c.who) + ' — ' + (c.src === 'Анкета' ? 'модуль «' + th(M[c.m] || c.m) + '»' : 'урок «' + th(c.q) + '»') + (c.t ? '\n«' + th(String(c.t).slice(0, 300)) + '»' : '');
      for (const a of A) { if (!B.ok(1)) break; B.use(1); await tgSend(env, a, t, [[{ text: 'Все отзывы', url: PULT_URL }]]) } sent.push(k); out.sent++ }
    if (fresh.length || out.sent) await kvPut(env, 'revsent', sent.slice(-3000)) }
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
const EF_PTS = { live30: 10, live15: 5, rec: 10, q: 2, stage: 15 } /* 1.11 (Роман): 5 баллов за каждые 15 мин в эфире; 10 — за открытие записи, если на эфире не был. live30 — старые начисления */, EF_QMAX = 3, EF_KINDS = ['live', 'open', 'auto'], EF_ACC = ['all', 'amz', 'cur', 'open', 'sel'];
const efJ = (v, d) => { try { return v ? JSON.parse(v) : d } catch (e) { return d } };
const efShort = n => { const p = String(n || '').trim().split(/\s+/); return p.length > 1 && p[1] ? p[0] + ' ' + p[1][0].toUpperCase() + '.' : (p[0] || 'Зритель') };
const efAdminUid = env => +String(env.ADMIN_UIDS || '499631257').split(/[\s,]+/)[0];
/* время МСК: «4 ноября, 19:00 МСК», «чт, 19:00 МСК» */
const efHM = ms => { const d = msk(new Date(ms)); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') };
const efWhen = ms => { const d = msk(new Date(ms)); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ', ' + efHM(ms) + NB + 'МСК' };
/* видео: Kinescope (ID или ссылка) или прямая ссылка https; для плеера — embed */
function efVideo(v) { if (!v) return null; if (typeof v === 'string') v = { url: v }; let id = bStr(v.id, 80), url = bStr(v.url, 500);
  const km = (url || id).match(/kinescope\.io\/(?:embed\/)?([A-Za-z0-9_-]{4,40})/); if (km) id = km[1];
  if (id && /^[A-Za-z0-9_-]{4,40}$/.test(id) && (v.provider === 'kinescope' || km || !url)) return Object.assign({ provider: 'kinescope', id, embed: 'https://kinescope.io/embed/' + id }, +v.dur > 0 ? { dur: Math.round(+v.dur) } : {});
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
  /* 06.11 (Роман): гость открытого эфира из браузера — без бота, по имени (метка w<16hex>.<подпись>, выдаёт /efir/open/join) */
  const mw = String(r).match(/^w([0-9a-f]{16})\.([0-9a-f]{20})$/); if (mw && same(mw[2], (await hmacHex(env, 'efw|' + mw[1])).slice(0, 20))) return { me: 'guest', web: 1, k: 'w' + mw[1], uid: 0 };
  return null }
const EFN = new Map(); /* имена зрителей (кеш изолята) */
async function efName(env, W) { if (W.nm) return W.nm; if (W.me === 'admin') return (W.nm = 'Роман'); if (W.me === 'curator') return (W.nm = ((CURATORS.find(c => c.id === W.cid) || {}).name || 'Куратор'));
  if (EFN.has(W.k)) return (W.nm = EFN.get(W.k)); let n = '';
  if (W.uid) { const c = CURATORS.find(x => x.uid === W.uid); n = c ? c.name : W.uid === efAdminUid(env) ? 'Роман' : efShort(await stuName(env, W.uid)) }
  else if (W.chat) { const g = await env.DB.prepare('SELECT name, username FROM tg_user WHERE chat=?').bind(W.chat).first().catch(() => null); n = efShort((g && (g.name || g.username)) || 'Гость') }
  else if (W.web) { const g = await env.DB.prepare('SELECT name FROM efir_reg WHERE k=? ORDER BY at DESC LIMIT 1').bind(W.k).first().catch(() => null); n = efShort((g && g.name) || 'Гость') }
  EFN.set(W.k, n); return (W.nm = n) }
/* может ли смотреть: команда — всё; ученик — по доступу эфира; гость — только открытые */
async function efCan(env, e, W) { if (!e || e.del) return false; if (W.staff) return true; const acc = e.tariff || 'all'; if (acc === 'open') return true; if (W.me === 'guest') return false;
  /* 04.11 (Роман): «Выбранные ученики» — список uid в cfg.uids (индивидуальный тариф, отдельные ученики) */
  if (acc === 'sel') { const c = efJ(e.cfg, {}); if (c.access && Array.isArray(c.access.streams)) return ev2CanAcc(env, c.access, W); const L = c.uids || []; return L.indexOf(+W.uid) >= 0 }
  /* 1.11 (Роман): ученик видит эфиры своего куратора + общие эфиры Романа. Эфир куратора — только его ученикам, кроме явно выбранного «Весь поток» (04.11) */
  if (CURATORS.some(c => c.id === e.host_cid) && acc === 'cur') { const st = await env.DB.prepare('SELECT curator FROM student WHERE uid=?').bind(W.uid).first(); return !!(st && st.curator && st.curator === e.host_cid) }
  if (acc === 'all') return true;
  if (acc === 'cur') { const st = await env.DB.prepare('SELECT curator FROM student WHERE uid=?').bind(W.uid).first(); return !!(st && st.curator && st.curator === e.host_cid) }
  if (acc === 'amz') { try { const r = await rowFor(await loadData(env), W.uid); return !!(r && r.tar === 'Премиум Амазон') } catch (e2) { return false } } return false }
/* может ли вести/менять: админ — любой, куратор — только свой */
/* Telegram ведущего: куратор — cur_tg; Роман — админ с юзернеймом */
async function efHostTg(env, e) { const c = CURATORS.find(x => x.id === e.host_cid);
  if (c) { const r = await env.DB.prepare('SELECT username, tg_id FROM cur_tg WHERE cid=? AND enabled=1').bind(c.id).first(); return { user: r && r.username || null, chats: r && r.tg_id ? [r.tg_id] : [] } }
  const a = await env.DB.prepare("SELECT a.chat, u.username FROM tg_admin a LEFT JOIN tg_user u ON u.chat=a.chat WHERE a.name LIKE 'Роман%' AND u.username IS NOT NULL LIMIT 1").first(); return { user: a && a.username || null, chats: a ? [a.chat] : [] } }
const efOwn = (W, e) => !!(W && W.s && (W.adm || (e && e.host_cid && e.host_cid === W.cid) || (W.modr && e && +e.id === +W.modId))); /* 07.11 Э5: модератор — только своего (идущего) эфира и только маршруты §0.3 */
function efHost(e) { const c = CURATORS.find(x => x.id === e.host_cid); return c ? { cid: c.id, name: c.full, short: c.name, photo: 'https://romanoduvanov.github.io/otzyvy/gc/curators/' + c.id + '.jpg' } : { cid: 'admin', name: e.host_name || 'Роман Одуванов', short: (e.host_name || 'Роман').split(' ')[0], photo: null } }
/* публичная карточка эфира (без чужих данных) */
function efPub(e, now, x) { x = x || {}; const cfg = efJ(e.cfg, {}), S = efState(e, now, x.reg), v = efVideo(efJ(e.video, null) || e.video), rv = efVideo(efJ(e.rec, null) || e.rec) || (S.st === 'done' && !cfg.kin && !cfg.room ? v : null); /* 04.11: плеер трансляции Kinescope (cfg.kin) — не запись: пока запись не подтянулась, «Запись скоро появится» */
  const st = S.sess || e.start || 0, lead = cfg.lead && cfg.lead.on !== 0 && cfg.lead.title ? { title: cfg.lead.title, sub: cfg.lead.sub || '', btn: cfg.lead.btn || 'Оставить заявку', timer: +cfg.lead.timer || 0, url: cfg.lead.url || null, min: cfg.lead.min != null ? +cfg.lead.min : null } : null;
  return { id: e.id, title: e.title, about: e.about || '', kind: e.kind, access: e.tariff || 'all', status: e.status, state: S.st, start: st, next: S.next || null, dur: e.dur || 60, host: efHost(e), cover: e.cover || null,
    video: x.full ? v : (v ? { provider: v.provider } : null), rec: x.full ? rv : (rv ? { provider: rv.provider } : null), chapters: efJ(e.chapters, []), at_live: e.at_live || null, at_end: e.at_end || null, kin: cfg.kin ? 1 : 0, room: cfg.room ? 1 : 0, rec_dur: rv && rv.dur ? rv.dur : null, rec_days: cfg.rec_days || 0, rec_until: cfg.rec_days && e.kind !== 'auto' && (e.at_end || e.start) ? (e.at_end || (e.start + (e.dur || 60) * 6e4)) + cfg.rec_days * 864e5 : null, rec_lost: !rv && (cfg.kin || cfg.room) && (cfg.norec || (e.at_end && now - e.at_end > 12 * 36e5)) ? 1 : 0,
    stage: !!cfg.stage, label: e.kind === 'auto' && cfg.label ? 'Запись эфира от ' + human(dayStr(new Date(cfg.orig_at || e.created || now))) : null, lead: x.full ? lead : !!lead, work: cfg.work !== 0, qs: cfg.qs !== 0, ev: cfg.ev || null, room_open: S.st === 'live' || (S.st === 'soon' && st - now < 15 * 6e4) } }
/* ---------- 06.11 (Роман: «напоминания об эфире не приходят»): раньше бот напоминал только тем, кто нажал «Напомнить».
   Теперь при планировании эфира создаются 3 рассылки в пульте (bc_plan, видно во «Рассылках»): за сутки, за час и на старте — всем, кому эфир доступен
   (ученики куратора / весь поток / Amazon / выбранные). Получатели считаются в момент отправки. Ведущий нажал «Начать» раньше — стартовая уходит сразу. ---------- */
async function efAudUids(env, e) { const cf = efJ(e.cfg, {}), acc = e.tariff || 'all';
  if (acc === 'sel') return (cf.uids || []).map(Number);
  if (acc === 'open') return [];
  const host = e.host_cid && e.host_cid !== 'admin' ? e.host_cid : null, L = ((await appStudents(env, acc === 'cur' && host ? host : 'all')).students || []);
  return L.filter(x => acc !== 'amz' || /амазон|amazon/i.test(String(x.tar || ''))).map(x => +x.uid) }
async function efPlanSync(env, e) { if (!e || e.kind === 'auto' || e.kind === 'open') return null; const cf = efJ(e.cfg, {}), old = cf.bcp || {}, now = Date.now();
  const ids = Object.values(old).filter(Boolean); if (ids.length) await env.DB.prepare("UPDATE bc_plan SET st='cancel' WHERE st='plan' AND id IN (" + ids.map(() => '?').join(',') + ')').bind(...ids).run();
  const bcp = {}; if (e.del || e.status !== 'plan' || !(e.start > now)) { cf.bcp = bcp; await env.DB.prepare('UPDATE efir SET cfg=? WHERE id=?').bind(JSON.stringify(cf), e.id).run(); return bcp }
  const hc = CURATORS.find(c => c.id === e.host_cid), wh = hc ? 'с куратором ' + hc.name + 'ом' : 'с Романом', cc = (e.tariff === 'cur' || e.tariff === 'sel') && hc ? hc.id : 'all', role = cc === 'all' ? 'admin' : 'curator';
  const link = SITE + '/teach/control/stream?fs=efir&e=' + e.id, T = String(e.title || 'Эфир'), hm = efHM(e.start) + NB + 'МСК';
  const P = [['d', e.start - 864e5, '📅 Привет, {имя}! Завтра в ' + hm + ' — эфир ' + wh + ' «' + T + '». Поставь напоминание, чтобы не пропустить.', 'Страница эфира'],
    ['h', e.start - 36e5, '⏰ Через час, в ' + hm + ', — эфир ' + wh + ' «' + T + '». Поставь будильник и обязательно приходи — мы тебя ждём!' + (cf.work !== 0 ? ' Можно заранее прислать работу на разбор на странице эфира.' : ''), 'Страница эфира'],
    ['s', e.start, '🔴 Начался эфир ' + wh + ' «' + T + '»! Заходи: задавай вопросы' + (cf.work !== 0 ? ' и присылай домашку на разбор' : '') + '.', '▶ Открыть эфир']];
  for (const [k, at, text, bt] of P) { if (at < now + 60e3 && k !== 's') continue;
    const d = { efir: e.id, uids: null, ch: 'tg', subj: '', text, btns: [{ t: bt, u: link }], noTg: 0, kind: 'efir-' + k };
    const r = await env.DB.prepare("INSERT INTO bc_plan (cc, role, cid, at, data, st, done, sent, fail, msent, created) VALUES (?,?,?,?,?,'plan',0,0,0,0,?) RETURNING id").bind(cc, role, role === 'curator' ? cc : null, Math.max(at, now + 60e3), JSON.stringify(d), now).first(); bcp[k] = r && r.id }
  cf.bcp = bcp; await env.DB.prepare('UPDATE efir SET cfg=? WHERE id=?').bind(JSON.stringify(cf), e.id).run(); return bcp }
async function efPlanStartNow(env, id) { try { const e = await efGet(env, id); const sid = e && (efJ(e.cfg, {}).bcp || {}).s; if (sid) await env.DB.prepare("UPDATE bc_plan SET at=? WHERE id=? AND st='plan'").bind(Date.now(), sid).run() } catch (x) {} }
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
  /* 06.11 (Роман): прямая ссылка на открытый эфир — смотреть в браузере без Telegram, только имя. Запись в efir_reg (src web), напоминаний нет (нет чата) */
  if (path === '/efir/open/join' && req.method === 'POST') { let ev = null, e = null; if (o.ev) { await evEnsure(env); ev = await evGet(env, o.ev); if (!ev) return json(req, { ok: false, err: 'Мероприятие не найдено' }, 404); e = evNext(await evEfirs(env, ev.id), now) }
    else { e = await efGet(env, o.id); if (e && efJ(e.cfg, {}).ev) { await evEnsure(env); ev = await evGet(env, efJ(e.cfg, {}).ev) } }
    if (!ev && (!e || e.tariff !== 'open' || e.status === 'draft' || e.status === 'cancel')) return json(req, { ok: false, err: 'Эфир не найден' }, 404);
    const name = bStr(String(o.name || '').replace(/\s+/g, ' ').trim(), 40); if (name.length < 2) return json(req, { ok: false, err: 'Напиши имя' }, 400);
    const gid = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join(''), r = 'w' + gid + '.' + (await hmacHex(env, 'efw|' + gid)).slice(0, 20);
    if (ev) await evRegister(env, ev, { k: 'w' + gid, uid: 0 }, { name, src: 'web' }); else await env.DB.prepare("INSERT INTO efir_reg (efir_id, k, uid, chat, name, sess, src, at, rem) VALUES (?,?,NULL,NULL,?,0,'web',?,'') ON CONFLICT(efir_id, k) DO NOTHING").bind(e.id, 'w' + gid, name, now).run();
    await logIt(env, 'efir-web', 0, (ev ? 'ev' + ev.id : e.id) + ' ' + name); return json(req, { ok: true, r, efir: e ? e.id : null }) }
  /* 06.11: страница мероприятия без входа — oduvanovschool.pro/efir?ev=<id> */
  if (path === '/efir/ev') { await ef2Ensure(env); const ev = await evGet(env, u.searchParams.get('ev')); if (!ev) return json(req, { ok: false, err: 'Мероприятие не найдено' }, 404);
    const E = await evEfirs(env, ev.id), n = await env.DB.prepare('SELECT COUNT(*) n FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0').bind(ev.id).first(); /* 07.11 Э1: тестовые регистрации не в счётчиках; кнопка бота — с меткой «Сайт» (§4.12) */
    return json(req, { ok: true, ev: { id: ev.id, title: ev.title, about: ev.about || '', cover: ev.cover || null }, efirs: E.map(e => { const p = efPub(e, now); delete p.chapters; return p }), next: (evNext(E, now) || {}).id || null, regs: (n && n.n) || 0, bot: 'https://t.me/' + BOT(env) + '?start=v' + ev.id + '_site' }) }
  /* 31.10: обложки эфиров, загруженные в пульте (JPEG 1280×720) — открыто, как картинки на сайте */
  if (path === '/efir/cover') { const r = await env.DB.prepare('SELECT mime, data FROM efir_cover WHERE id=?').bind(+u.searchParams.get('id') || 0).first().catch(() => null); if (!r) return new Response('not found', { status: 404 });
    const bin = Uint8Array.from(atob(r.data), c => c.charCodeAt(0)); return new Response(bin, { headers: { 'Content-Type': r.mime || 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'Access-Control-Allow-Origin': '*' } }) }
  if (path === '/efir/form/hook' && req.method === 'POST') return efFormHook(env, req, o); /* 07.11 Э3: ответ Google Формы от скрипта таблицы — по токену мероприятия, без входа */
  const W = await efirWho(env, req, u, o); if (!W) return deny(req);
  /* 07.11 Э5: сигнал OBS проверяет фоновая задача раз в 20 с (fetch → kinAutoLive), не каждый запрос. Модератор (kv efir_mods, §0.3) — для /efir/host/* */
  if (path.startsWith('/efir/host/') && W.uid && !W.adm && !W.ro && (W.me === 'student' || W.me === 'curator')) W.mod = await efIsMod(env, W.uid);
  if (path.startsWith('/efir/host/') || path.startsWith('/efir/kin/')) return efirHostApi(env, req, path, u, o, W, now);
  const id = +(o.id || u.searchParams.get('id') || 0);
  /* 9.1 список: идёт сейчас, ближайшие (с «Напомнить»), записи с досмотром */
  if (path === '/efir/list') { const [er, rr, sr] = await env.DB.batch([env.DB.prepare("SELECT * FROM efir WHERE del=0 AND status NOT IN ('draft','cancel') AND (start>? OR status IN ('live','done','rec') OR kind='auto') ORDER BY start DESC LIMIT 120").bind(now - 120 * 864e5),
      env.DB.prepare('SELECT efir_id, sess FROM efir_reg WHERE k=?').bind(W.k), env.DB.prepare('SELECT efir_id, MAX(rec_pos) pos, MAX(rec_max) mx, MAX(rec_done) done FROM efir_seen WHERE k=? GROUP BY efir_id').bind(W.k)]);
    const R = {}, P = {}; for (const x of rr.results || []) R[x.efir_id] = x; for (const x of sr.results || []) P[x.efir_id] = x;
    const live = [], soon = [], rec = [];
    for (const e of er.results || []) { if ((e.tariff === 'open' || e.kind === 'open') && !W.staff && !R[e.id]) continue; /* 06.11 (Роман): открытый эфир — только по ссылке: в списке ученика его нет, пока он сам не записался */ if (!(await efCan(env, e, W))) { if (W.me === 'student' && e.tariff === 'amz') { const p = efPub(e, now); if (p.state === 'soon') soon.push(Object.assign(p, { locked: 1 })) } continue }
      const p = efPub(e, now, { reg: R[e.id] }); p.reg = R[e.id] ? 1 : 0; if (R[e.id] && R[e.id].sess) p.my_sess = R[e.id].sess;
      if (p.state === 'live') live.push(p); else if (p.state === 'soon') soon.push(p);
      /* 04.11: эфир прошёл, запись Kinescope ещё обрабатывается — карточка в «Записях» с «Запись скоро появится» (неделю) */ if (e.kind !== 'auto' && p.state === 'done' && !p.rec && (p.kin || p.room) && !p.rec_lost && (e.at_end || e.start || 0) > now - 7 * 864e5) p.rec_wait = 1;
      /* 04.11 (Роман): ограниченный доступ к записи — после срока ученик её не видит (команда видит) */ if (p.rec_until && now > p.rec_until && !W.s) continue;
      if (e.kind !== 'auto' && p.state === 'done' && (p.rec || p.rec_wait || (p.rec_lost && W.s))) { const pr = P[e.id] || {}; p.seen = { pos: pr.pos || 0, max: pr.mx || 0, done: pr.done || 0 }; rec.push(p) } }
    if (live.length) { const ids = live.filter(x => x.kind !== 'auto').map(x => x.id); if (ids.length) { const vr = await qAll(env.DB.prepare('SELECT efir_id, COUNT(*) n FROM efir_seen WHERE last>? AND sess=0 AND efir_id IN (' + ids.map(() => '?').join(',') + ') GROUP BY efir_id').bind(now - 9e4, ...ids)); for (const v of vr) { const x = live.find(y => y.id === v.efir_id); if (x) x.viewers = v.n } } }
    soon.sort((a, b) => a.start - b.start); rec.sort((a, b) => (b.at_end || b.start) - (a.at_end || a.start));
    return json(req, { ok: true, now, me: { role: W.me, can_host: !!W.s, ro: !!W.ro }, live, soon: soon.slice(0, 30), rec: rec.slice(0, 40), regs: Object.keys(R).length }) }
  const e = path === '/efir/room' ? await efGetC(env, id) : await efGet(env, id); if (!e) return json(req, { ok: false, err: 'Эфир не найден' }, 404);
  { const cR = efJ(e.cfg, {}); if (cR.rec_days && e.kind !== 'auto' && !W.staff && e.status !== 'live' && (e.at_end || 0) && now > e.at_end + cR.rec_days * 864e5) return json(req, { ok: false, err: 'Запись была доступна ' + cR.rec_days + NB + (cR.rec_days % 10 === 1 && cR.rec_days % 100 !== 11 ? 'день' : [2, 3, 4].includes(cR.rec_days % 10) && ![12, 13, 14].includes(cR.rec_days % 100) ? 'дня' : 'дней') + ' после эфира — срок закончился', ...(path === '/efir/one' ? await efDeny5(env, e, W, 'rec', now) : {}) }, 403) }
  if (!(await efCan(env, e, W))) return json(req, Object.assign({ ok: false, err: e.tariff === 'amz' ? 'Этот эфир — для тарифа «Премиум Амазон»' : 'Этот эфир не для твоего потока' }, path === '/efir/one' ? await efDeny5(env, e, W, null, now) : {}), 403);
  const reg = path === '/efir/room' && e.kind !== 'auto' ? null : await env.DB.prepare('SELECT * FROM efir_reg WHERE efir_id=? AND k=?').bind(e.id, W.k).first(); /* 07.11 Э5: опрос комнаты не читает регистрацию (нужна только автовебинару) */
  if (path === '/efir/form' || path === '/efir/form/open') return efFormApi(env, req, path, u, o, W, e, now); /* 07.11 Э3: анкета зрителя (экран — Э5) */
  if (path === '/efir/one') { const ui2 = await efUi2C(env, W.uid), p = efPub(e, now, { reg, full: true }), [sn, hd, pt, wk] = await env.DB.batch([env.DB.prepare('SELECT * FROM efir_seen WHERE efir_id=? AND k=? ORDER BY last DESC LIMIT 1').bind(e.id, W.k), env.DB.prepare('SELECT st FROM efir_hand WHERE efir_id=? AND k=?').bind(e.id, W.k), env.DB.prepare('SELECT COALESCE(SUM(pts),0) p FROM efir_pts WHERE efir_id=? AND k=?').bind(e.id, W.k), env.DB.prepare("SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND k=? AND kind='work' AND del=0").bind(e.id, W.k)]);
    const s0 = (sn.results || [])[0] || null, wq = (wk.results || [])[0];
    if (e.kind === 'auto') { const L = efSessions(e, now, now + 8 * 864e5).slice(0, 6), cfg = efJ(e.cfg, {}); p.sessions = L; p.after = cfg.sched && +cfg.sched.after || 0 }
    return json(req, { ok: true, now, efir: p, me: { role: W.me, ro: !!W.ro, reg: reg ? 1 : 0, sess: reg ? reg.sess : 0, hand: (hd.results || [])[0] ? hd.results[0].st : null, pts: ((pt.results || [])[0] || {}).p || 0, works: wq ? wq.n : 0, host_tg: e.kind !== 'auto' && efJ(e.cfg, {}).work !== 0 ? (await efHostTg(env, e)).user : null, seen: s0 ? { pos: s0.rec_pos, max: s0.rec_max, done: s0.rec_done, min: s0.min } : null, can_host: efOwn(W, e), ui2: ui2 ? 1 : 0 }, room: await efRoomLinks(env, e, W), x5: ui2 ? await (async () => { await ef2Ensure(env); return efRoomX(env, e, W, now) })() : undefined }) }
  /* «Напомнить» / отписаться. Автовебинар — запись на сеанс (sess) или «сразу после регистрации» */
  if (path === '/efir/reg' && req.method === 'POST') { if (W.ro) return json(req, { ok: false, err: 'Режим просмотра — только чтение' }, 403);
    if (o.on === 0 || o.on === '0') { await env.DB.prepare('DELETE FROM efir_reg WHERE efir_id=? AND k=?').bind(e.id, W.k).run(); return json(req, { ok: true, reg: 0 }) }
    let sess = 0; if (e.kind === 'auto') { const cfg = efJ(e.cfg, {}), after = cfg.sched && +cfg.sched.after || 0, L = efSessions(e, now - efDurMs(e) + 6e4, now + 14 * 864e5);
      sess = +o.sess && (L.includes(+o.sess) || (after && Math.abs(+o.sess - (now + after * 6e4)) < 3e5)) ? +o.sess : after ? Math.ceil((now + after * 6e4) / 6e4) * 6e4 : (L.find(x => x > now) || 0); if (!sess) return json(req, { ok: false, err: 'Ближайших сеансов нет' }, 400) }
    else if (efState(e, now).st === 'done') return json(req, { ok: false, err: 'Эфир уже прошёл — смотри запись' }, 400);
    const st = W.uid ? await env.DB.prepare('SELECT tg_chat FROM student WHERE uid=?').bind(W.uid).first() : null;
    await env.DB.prepare("INSERT INTO efir_reg (efir_id, k, uid, chat, name, sess, src, at, rem) VALUES (?,?,?,?,?,?,?,?,'') ON CONFLICT(efir_id, k) DO UPDATE SET sess=excluded.sess, rem=CASE WHEN efir_reg.sess=excluded.sess THEN efir_reg.rem ELSE '' END").bind(e.id, W.k, W.uid || null, W.chat || (st && st.tg_chat) || null, await efName(env, W), sess, bStr(o.src, 30) || 'app', now).run();
    await logIt(env, 'efir-reg', W.uid, e.id + (sess ? ' ' + sess : '')); if (efJ(e.cfg, {}).ev) { try { await evEnsure(env); const ev = await evGet(env, efJ(e.cfg, {}).ev); if (ev) await evRegister(env, ev, W, { chat: W.chat || (st && st.tg_chat) || null, name: await efName(env, W), src: 'app' }) } catch (x) {} }
    return json(req, { ok: true, reg: 1, sess, start: sess || e.start, tg: !!(W.chat || (st && st.tg_chat)) }) }
  /* комната: опрос раз в 4–5 с. Присутствие (минуты → баллы), чат с секундой, вопросы, руки, события. Автовебинар — чат оригинала по секундам + свои сообщения */
  if (path === '/efir/room') { const S = efState(e, now, reg), cfg = efJ(e.cfg, {}), after = +u.searchParams.get('after') || 0, sess = e.kind === 'auto' ? S.sess : 0;
    if (S.st === 'done' && u.searchParams.get('rec') === '1' && e.kind !== 'auto') { const L = await qAll(env.DB.prepare("SELECT * FROM efir_msg WHERE efir_id=? AND sess=0 AND del=0 AND kind='msg' AND vis='all' AND sec IS NOT NULL ORDER BY sec, id LIMIT 600").bind(e.id)), off = +cfg.rec_offset || 0;
      return json(req, { ok: true, now, state: 'done', start: e.start, rmsgs: L.map(m => Object.assign(efMsgPub(m, W), { sec: m.sec + off })) }) } /* 07.11 Э5: чат записи по минутам (+ сдвиг записи) */
    if (S.st !== 'live') { if (e.kind === 'auto' || S.st !== 'soon' || !cfg.ev || !e.start || now < e.start - 36e5) return json(req, { ok: true, now, state: S.st, start: S.sess || e.start, next: S.next || null });
      await ef2Ensure(env); return json(req, await efWaitRoom(env, e, W, cfg, after, now)) } /* 07.11 Э5: ожидание у мероприятий — чат и «Уже ждут» (§3.4) */
    if (e.kind !== 'auto') { await ef2Ensure(env); const R5 = await efLiveRoom(env, e, W, cfg, after, now); return json(req, R5, R5.st || 200) }
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
      out.live_msgs = (mine.results || []).map(m => efMsgPub(m, W)); out.viewers = ((vr.results || [])[0] || {}).n + vo; out.label = efPub(e, now).label; return json(req, out) } }
  if (W.ro) return json(req, { ok: false, err: 'Режим просмотра — только чтение' }, 403);
  const S = efState(e, now, reg), sessOf = () => e.kind === 'auto' ? S.sess : 0, secOf = async () => { const sn = await env.DB.prepare('SELECT t0 FROM efir_seen WHERE efir_id=? AND k=? AND sess=?').bind(e.id, W.k, sessOf()).first(); return Math.max(0, Math.floor((now - ((sn && sn.t0) || S.sess || e.at_live || e.start || now)) / 1000)) };
  /* сообщение в чат или вопрос ведущему. В автовебинаре сообщение видят только зритель и модераторы */
  if (path === '/efir/msg' && req.method === 'POST') { const text = bStr(o.text, 1000), kind = o.kind === 'q' ? 'q' : 'msg'; if (!text) return json(req, { ok: false, err: 'Пустое сообщение' }, 400); if (kind === 'q' && efJ(e.cfg, {}).qs === 0 && !W.staff) return json(req, { ok: false, err: 'Ведущий сейчас не принимает вопросы — напиши в чат' }, 400);
    const cfM = efJ(e.cfg, {}), pre = S.st === 'soon' && !!cfM.ev && e.kind !== 'auto' && e.start && now >= e.start - 36e5; /* 07.11 Э5: у эфиров мероприятий чат открыт за 60 мин до начала */
    if (S.st !== 'live' && kind === 'msg' && !pre) return json(req, { ok: false, err: 'Чат откроется, когда начнётся эфир' }, 400);
    if (!W.staff) { if (kind === 'msg' && cfM.chat === 0) return json(req, { ok: false, err: 'Ведущий выключил чат — вопросы можно задать во вкладке «Вопросы»' }, 400);
      const bn = await efBanOf(env, e.id, W); if (bn.kick) return json(req, { ok: false, err: 'Ведущий убрал тебя из эфира', kick: 1 }, 403); if (bn.mute) return json(req, { ok: false, err: 'Модератор ограничил сообщения в этом эфире. Смотреть можно.', muted: 1 }, 403) }
    const fl = await env.DB.prepare('SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND k=? AND at>?').bind(e.id, W.k, now - 6e4).first(); if (fl && fl.n >= 8) return json(req, { ok: false, err: 'Слишком часто — подожди минуту' }, 429);
    const stop = await efStop(env), plus = await efKvC(env, 'efir_plus', 3e4), vis = e.kind === 'auto' ? 'mod' : (!W.staff && /https?:\/\/|t\.me\//i.test(text)) || (!W.staff && ((plus === 1 && efSpamPlus(text)) || (stop.length && (plus === 0 ? efStopHit(text, stop) : efSpam(text, stop))))) ? 'mod' : 'all'; /* 07.11 Э5: «Скрывать „+“ и „звук не слышно“» (5.5, kv efir_plus) */
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
    if (Array.isArray(o.opts)) { await ef2Ensure(env); const L = [...new Set(o.opts.map(x => +x | 0).filter(x => x >= 0 && x < 10))].slice(0, 6); if (!L.length) return json(req, { ok: false, err: 'Выбери вариант' }, 400); /* 07.11 Э5: опрос «несколько вариантов» — efir_pollv.opts */
      await env.DB.prepare('INSERT OR REPLACE INTO efir_pollv (ev, k, sess, opt, opts) VALUES (?,?,?,?,?)').bind(pid, W.k, sessOf(), L[0], JSON.stringify(L)).run(); return json(req, { ok: true, my: L[0], mine: L }) }
    await env.DB.prepare('INSERT OR REPLACE INTO efir_pollv (ev, k, sess, opt) VALUES (?,?,?,?)').bind(pid, W.k, sessOf(), opt).run(); return json(req, { ok: true, my: opt }) }
  /* 07.11 Э5 (§3.4): клик по баннеру (переход) и по кнопке заявки (открыл форму) — один раз на человека за показ (ev_mat_click) */
  if (path === '/efir/click' && req.method === 'POST') { await ef2Ensure(env); const g = await env.DB.prepare('SELECT id FROM ev_mat_log WHERE efir_id=? AND mat_id=? AND at_off IS NULL ORDER BY id DESC LIMIT 1').bind(e.id, +o.mat || 0).first(); if (!g) return json(req, { ok: true, n: 0 });
    const r = await env.DB.prepare('INSERT OR IGNORE INTO ev_mat_click (log_id, k) VALUES (?,?)').bind(g.id, W.k).run(); if (r.meta && r.meta.changes) await env.DB.prepare('UPDATE ev_mat_log SET clicks=clicks+1 WHERE id=?').bind(g.id).run(); return json(req, { ok: true }) }
  /* заявка на обучение: в efir_lead и сообщением в бот (kv efir_leads {chats:[…]}; по умолчанию — всем админам из бота) */
  if (path === '/efir/lead' && req.method === 'POST') { if (efNoSales(e)) return json(req, { ok: false, err: 'В этом эфире заявок нет' }, 400); await ef2Ensure(env);
    const st = W.uid ? await env.DB.prepare('SELECT tg_chat FROM student WHERE uid=?').bind(W.uid).first() : null, chat = W.chat || (st && st.tg_chat) || null, tu = chat ? await env.DB.prepare('SELECT username, name FROM tg_user WHERE chat=?').bind(chat).first().catch(() => null) : null;
    const em = String(o.email || '').trim().toLowerCase(), ph = String(o.phone || '').replace(/[^\d+]/g, '').slice(0, 20), tgn = bStr(String(o.tg || '').trim().replace(/^https?:\/\/t\.me\//, '@'), 40) || (tu && tu.username ? '@' + tu.username : '');
    if (o.form) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return json(req, { ok: false, err: 'Проверь почту: после «@» нужен домен, например mail.ru' }, 400); if (ph.replace(/\D/g, '').length < 10) return json(req, { ok: false, err: 'Проверь телефон' }, 400) }
    /* 07.11 Э5 (4.5): «Исправить данные» правит ту же заявку; заказ ещё не создан — создаётся с исправленной почтой */
    if (o.fix) { const L = await env.DB.prepare('SELECT * FROM efir_lead WHERE efir_id=? AND k=? ORDER BY id DESC LIMIT 1').bind(e.id, W.k).first(); if (!L) return json(req, { ok: false, err: 'Заявка не найдена — отправь её ещё раз' }, 404);
      const nm = bStr(o.name, 60) || L.name, contact = [ph, em, tgn].filter(Boolean).join(' · ').slice(0, 160) || L.contact;
      await env.DB.prepare('UPDATE efir_lead SET name=?, phone=?, email=?, tg=?, contact=? WHERE id=?').bind(nm, ph || null, em || null, tgn || null, contact, L.id).run(); await logIt(env, 'efir-lead-fix', W.uid, e.id + ' ' + L.id);
      if (!L.order_num && em && o.form) await efLeadOrder(env, e, Object.assign({}, L, { name: nm, phone: ph, email: em, tg: tgn, tries: 0, text0: '' })).catch(() => null);
      return json(req, { ok: true, id: L.id, fixed: 1 }) }
    const dup = await env.DB.prepare('SELECT id FROM efir_lead WHERE efir_id=? AND k=? AND at>?').bind(e.id, W.k, now - 6 * 36e5).first(); if (dup) return json(req, { ok: true, id: dup.id, dup: 1 });
    /* §3.4 защита от накрутки: заявка — во время эфира или сутки после; гость без Telegram — не больше 3 с одного IP за 10 мин и 30 за эфир (хеш IP) */
    if (e.kind !== 'auto' && S.st !== 'live' && !(e.at_end && now - e.at_end < 864e5)) return json(req, { ok: false, err: 'Заявки принимаются во время эфира и сутки после' }, 400);
    let iph = null; if (!W.uid && !chat) { const ip = req.headers.get('CF-Connecting-IP') || ''; iph = ip ? (await hmacHex(env, 'efip|' + ip)).slice(0, 20) : null;
      if (iph) { const [a, b] = await env.DB.batch([env.DB.prepare('SELECT COUNT(*) n FROM efir_lead WHERE efir_id=? AND ip=? AND at>?').bind(e.id, iph, now - 6e5), env.DB.prepare('SELECT COUNT(*) n FROM efir_lead WHERE efir_id=? AND ip=?').bind(e.id, iph)]);
        if ((((a.results || [])[0] || {}).n | 0) >= 3 || (((b.results || [])[0] || {}).n | 0) >= 30) { await logIt(env, 'efir-flood', 0, e.id + ' lead'); return json(req, { ok: false, err: 'Слишком много заявок — попробуй позже' }, 429) } } }
    const contact = [ph, em, tgn].filter(Boolean).join(' · ').slice(0, 160) || bStr(o.contact, 120), sec = S.st === 'live' ? await secOf() : null, nm = bStr(o.name, 60) || (W.uid && !W.staff ? await stuName(env, W.uid) : await efName(env, W));
    const cfL = efJ(e.cfg, {}), lv = await env.DB.prepare("SELECT kind, data FROM efir_ev WHERE efir_id=? AND kind IN ('lead','lead_off') ORDER BY id DESC LIMIT 1").bind(e.id).first(), mat = lv && lv.kind === 'lead' ? +(efJ(lv.data, {}).mat_id || 0) || null : null;
    const src = cfL.ev && W.k ? ((await env.DB.prepare('SELECT src_code FROM ev_reg WHERE ev_id=? AND k=?').bind(+cfL.ev, W.k).first().catch(() => null)) || {}).src_code || '' : null;
    const r = await env.DB.prepare("INSERT INTO efir_lead (efir_id, sess, k, uid, chat, name, contact, text, sec, at, phone, email, tg, src, mat_id, mgr_st, ip) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'new',?) RETURNING id").bind(e.id, sessOf(), W.k, W.uid || null, chat, nm, contact, bStr(o.text, 500), sec, now, ph || null, em || null, tgn || null, src, mat, iph).first();
    if (mat) await env.DB.prepare('UPDATE ev_mat_log SET leads=leads+1 WHERE efir_id=? AND mat_id=? AND at_off IS NULL').bind(e.id, mat).run().catch(() => null);
    /* 06.11 (Роман): без уведомлений менеджерам (заявок по 100). Заказ в GetCourse на продукт мероприятия — менеджеры работают с ним там */
    /* 07.11 Э3: продукт — из справочника (sale.offer_id), статус и комментарий заказа — с шага 6; «Анкеты» и «Без продаж» заказ не создают */
    const evid0 = cfL.ev, ev0 = evid0 ? await evGet(env, evid0) : null, S0 = ev0 ? ev3Sale(ev0) : null;
    if (ev0 && S0 && S0.mode === 'sell' && S0.copy_sheet && S0.sheet && S0.sheet.ok_at) try { const D0 = await ev2Days(env, ev0.id); await ev3Queue(env, ev0.id, -r.id, 'Заявки', { k: 'l' + r.id, at: ev3At(now), day: ev3Mark(ev0, D0, e), min: sec != null ? Math.floor(sec / 60) : null, name: nm, phone: ph, email: em, tg: tgn, src: '', watched: '', a: {} }) } catch (x) {}
    /* 07.11 Э5 (§3.4): ошибка GetCourse — повтор через 5 мин, до 6 раз (efLeadRetryTick); номер заказа — order_num, ссылка — order_id */
    if (o.form && em) await efLeadOrder(env, e, { id: r.id, name: nm, phone: ph, email: em, tg: tgn, sec, uid: W.uid, tries: 0, text0: o.text || '' }).catch(x => logIt(env, 'efir-lead-gc-err', W.uid, String(x && x.message || x).slice(0, 200)));
    return json(req, { ok: true, id: r.id }) }
  /* прогресс записи: {id, pos, dur} секунды; открыл запись и не был на эфире — +10 баллов (rec_done = баллы за запись получены) */
  if (path === '/efir/ping' && req.method === 'POST') { const pos = Math.max(0, +o.pos | 0), dur = Math.max(0, +o.dur | 0) || (e.dur || 60) * 60;
    const r = await env.DB.prepare('INSERT INTO efir_seen (efir_id, k, sess, first, last, rec_pos, rec_max) VALUES (?,?,-1,?,?,?,?) ON CONFLICT(efir_id, k, sess) DO UPDATE SET last=excluded.last, rec_pos=excluded.rec_pos, rec_max=MAX(efir_seen.rec_max, excluded.rec_max) RETURNING rec_max, rec_done').bind(e.id, W.k, now, now, pos, pos).first();
    let pts = 0; if (r && !r.rec_done) { const was = await env.DB.prepare('SELECT 1 x FROM efir_seen WHERE efir_id=? AND k=? AND sess>=0 AND min>=1').bind(e.id, W.k).first();
      if (!was) { await env.DB.prepare('UPDATE efir_seen SET rec_done=1 WHERE efir_id=? AND k=? AND sess=-1').bind(e.id, W.k).run(); pts = await efPts(env, W, e.id, 'rec', 0) } }
    return json(req, { ok: true, pts, done: r && (r.rec_done || pts) ? 1 : 0 }) }
  return json(req, { ok: false, err: 'not found' }, 404) }
/* ===== 07.11 «Эфиры 2.0», этап Э5 (docs/plan/efiry-tz.md §0.3, §3.1, §3.4, §6.4 3.1–3.7, 4.2–4.9, 5.5): пульт, комната зрителя, настройки эфиров.
   Старт — только по кнопке «Начать эфир» (kinAutoLive пишет сигнал OBS в cfg.signal, только смену on/off; через 5 мин после start при сигнале — одно сообщение ведущему, cfg.nudge).
   Модератор (kv efir_mods) — только чат, вопросы, руки, «Онлайн» без контактов, бан; каждое действие — лог efir-mod. Ожидающие — efir_wait (не в статистику).
   Кеши изолята: эфир (1,5 с, сбрасывается своими записями), список модераторов и флаг efir_ui2 (30 с), «ждут в комнате» (15 с) — чтобы опрос /efir/room укладывался в 1–2 запроса D1. ===== */
const EF5T = { sig: 0, retry: 0 }, EFG = new Map(), EF5C = {}, EFVC = new Map(), EFPU = new Map(), EFWN = new Map();
const efDrop = id => EFG.delete(+id);
async function efGetC(env, id) { id = +id || 0; if (!id) return null; const c = EFG.get(id), t = msNow(); if (c && t - c.t < 1500 && t >= c.t) return c.e ? Object.assign({}, c.e) : null;
  const e = await efGet(env, id); if (EFG.size > 300) EFG.clear(); EFG.set(id, { t, e }); return e ? Object.assign({}, e) : null }
async function efKvC(env, k, ttl) { const c = EF5C[k], t = msNow(); if (c && t - c.t < ttl && t >= c.t) return c.v; const v = await kvGet(env, k).catch(() => null); EF5C[k] = { t, v }; return v }
const efKvDrop = k => { delete EF5C[k] };
async function efIsMod(env, uid) { if (!uid) return false; const L = await efKvC(env, 'efir_mods', 3e4); return Array.isArray(L) && L.map(String).includes(String(uid)) }
async function efUi2C(env, uid) { if (!uid) return false; const L = await efKvC(env, 'efir_ui2', 3e4); return Array.isArray(L) && L.map(String).includes(String(uid)) }
const efSigOn = s => !!(s && s.at_on && (!s.at_off || s.at_off < s.at_on));
const efFmt = (e, ev) => efJ(e.cfg, {}).room || (ev && ev.fmt === 'room') ? 'room' : 'obs';
/* модератор: только идущий эфир и 60 мин до старта у эфиров мероприятий (§0.3) */
const efModCan = (e, now) => !!e && !e.del && e.kind !== 'auto' && (e.status === 'live' || (e.status === 'plan' && !!efJ(e.cfg, {}).ev && e.start && now >= e.start - 36e5 && now < e.start + 6 * 36e5));
/* сигнал OBS: пишем только смену; первый сигнал — first_on (от него сдвиг записи rec_offset) */
async function efSigSet(env, e, on, now) { const cf = efJ(e.cfg, {}), s = cf.signal || {}; if (efSigOn(s) === !!on) return false;
  const ns = Object.assign({}, s, on ? { at_on: now, first_on: s.first_on || now } : { at_off: now });
  await env.DB.prepare("UPDATE efir SET cfg=json_set(COALESCE(cfg,'{}'), '$.signal', json(?)) WHERE id=?").bind(JSON.stringify(ns), e.id).run(); efDrop(e.id);
  cf.signal = ns; e.cfg = JSON.stringify(cf); await logIt(env, 'efir-sig', 0, e.id + ' ' + (on ? 'on' : 'off')); return true }
/* «Ты в эфире?» — одно сообщение ведущему: UPDATE с условием nudge IS NULL — второй раз не отправится, даже из двух изолятов */
async function efNudge(env, e, now) { const r = await env.DB.prepare("UPDATE efir SET cfg=json_set(COALESCE(cfg,'{}'), '$.nudge', ?) WHERE id=? AND status='plan' AND json_extract(COALESCE(cfg,'{}'), '$.nudge') IS NULL").bind(now, e.id).run();
  if (!(r && r.meta && r.meta.changes)) return 0; efDrop(e.id); const ht = await efHostTg(env, e).catch(() => ({ chats: [] })), url = SITE + '/teach/control/stream?fs=efir&h=' + encodeURIComponent('#host/live/' + e.id); let n = 0;
  for (const c of (ht.chats || []).slice(0, 2)) { try { await tgSend(env, c, '🔴 <b>' + nbt('Ты в эфире? Нажми «Начать эфир»') + '</b>\n' + nbt('Сигнал из OBS идёт, а эфир «' + th(e.title) + '» ещё не начат — зрители видят заставку.'), [[{ text: 'Открыть пульт', url }]]); n++ } catch (x) {} }
  await logIt(env, 'efir-nudge', 0, e.id + ' ' + n); return n }
/* сигнал одного эфира — для пульта (кеш kinLiveNow 20 с) */
async function efSigCheck(env, e, now) { if (!env.KINESCOPE_KEY || e.kind === 'auto' || efJ(e.cfg, {}).room || !['plan', 'live', 'draft'].includes(e.status)) return; const K = await kinGet(env, kinHost(e.host_cid)).catch(() => null);
  if (!K || !K.id || !kinIsMine(K, e)) return; const v = await kinLiveNow(env, K).catch(() => null); if (v == null) return; await efSigSet(env, e, v, now);
  if (v === true && e.status === 'plan' && e.start && now >= e.start + 5 * 6e4) await efNudge(env, e, now) }
const EF5_MODP = /^\/efir\/host\/(room|msg|q|ban|online|hand)$/;
async function efLiveList(env, now) { const L = await qAll(env.DB.prepare("SELECT * FROM efir WHERE del=0 AND kind!='auto' AND (status='live' OR (status='plan' AND start BETWEEN ? AND ?)) ORDER BY start LIMIT 30").bind(now - 6 * 36e5, now + 36e5));
  return { ok: true, efirs: L.filter(e => efModCan(e, now)).map(e => ({ id: e.id, title: e.title, start: e.start, status: e.status, host: efHost(e).name })) } }
async function efModApi(env, req, path, u, o, W, now) { await ef2Ensure(env);
  if (path === '/efir/host/me') return json(req, { ok: true, role: 'mod', cid: null, uid: W.uid || 0, ui2: (await efUi2(env, W.uid)) ? 1 : 0 });
  if (path === '/efir/host/live') return json(req, await efLiveList(env, now));
  if (!EF5_MODP.test(path)) return json(req, { ok: false, err: 'Модератору это недоступно' }, 403);
  const e = await efGet(env, +(o.id || u.searchParams.get('id') || 0)); if (!e) return json(req, { ok: false, err: 'Эфир не найден' }, 404);
  if (!efModCan(e, now)) return json(req, { ok: false, err: 'Модерировать можно только идущий эфир' }, 403);
  return efirHostApi(env, req, path, u, o, Object.assign({}, W, { s: { role: 'mod' }, adm: false, cid: null, modr: 1, modId: e.id }), now) }
const efModLog = (env, W, e, path, o) => logIt(env, 'efir-mod', W.uid, e.id + ' ' + path.replace('/efir/host/', '') + ' ' + String(o.act || o.kind || (o.text ? 'msg' : '') || '') + ' ' + String(o.k || o.mid || o.to || '').slice(0, 40));
/* ключ человека → chat / uid (для бана и лички бота) */
async function efKeyChat(env, k) { if (k[0] === 't') return k.slice(1); if (k[0] === 'u') { const s = await env.DB.prepare('SELECT tg_chat FROM student WHERE uid=?').bind(+k.slice(1)).first().catch(() => null); return s && s.tg_chat ? String(s.tg_chat) : null } return null }
/* мероприятие эфира: день N из M, короткое название дня, режим продаж */
async function efEvInfo(env, e) { const cf = efJ(e.cfg, {}), evId = +cf.ev || 0; if (!evId) return null; await ef2Ensure(env); const ev = await evGet(env, evId); if (!ev) return null;
  const D = (await ev2Days(env, ev.id)).filter(x => !efJ(x.cfg, {}).hide || x.id === e.id), i = D.findIndex(x => x.id === e.id), type = ev2Type(ev, D), S = ev2Sale(ev) || {};
  return { ev, D, i, type, n: i + 1, of: D.length, mode: S.legacy ? 'sell' : (S.mode || 'none'), S } }
const efDayTitle = (e, I, full) => { const c = efJ(e.cfg, {}), t = full ? e.title : (c.short || e.title); return I && I.type === 'mar' && I.of > 1 ? 'День ' + I.n + '. ' + t : t };
const efAfterIn = ms => { const m = Math.max(1, Math.round(ms / 6e4)); return m < 60 ? m + NB + 'мин' : (m % 60 ? Math.floor(m / 60) + NB + 'ч ' + (m % 60) + NB + 'мин' : (m / 60) + NB + plrS(m / 60, 'час', 'часа', 'часов')) };
const plrS = (n, a, b, c) => { n = Math.abs(n) % 100; const k = n % 10; return n > 10 && n < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c };
const efBefore = m => m % 60 === 0 ? 'за ' + (m / 60) + NB + plrS(m / 60, 'час', 'часа', 'часов') : 'за ' + m + NB + 'мин';
/* материалы дня для пульта: состояние показа из ev_mat_log */
async function efMats(env, e, I, now) { if (!I) return []; const L = await qAll(env.DB.prepare('SELECT id, kind, data, days, ord FROM ev_mat WHERE ev_id=? AND del=0 ORDER BY ord, id').bind(I.ev.id));
  const M = L.filter(m => { const d = efJ(m.days, []) || []; return !d.length || d.map(Number).includes(+e.id) }); if (!M.length) return [];
  const G = await qAll(env.DB.prepare('SELECT id, mat_id, kind, sec_on, sec_off, at_on, at_off, clicks, leads FROM ev_mat_log WHERE efir_id=? ORDER BY id').bind(e.id)), last = {};
  for (const g of G) last[g.mat_id] = g;
  return M.map(m => { const d = efJ(m.data, {}), g = last[m.id] || null; return { id: m.id, kind: m.kind, title: d.short || d.title || d.q || '', full: d.title || d.q || '', sub: d.sub || '', btn: d.btn || '', hide: +d.hide || 0, url: d.url || '', img: d.img || '', opts: d.opts || null, show_res: d.show_res === 0 ? 0 : 1, multi: d.multi ? 1 : 0, tg: d.tg === 0 ? 0 : 1,
    log: g ? { id: g.id, on: g.at_off ? 0 : 1, at_on: g.at_on, at_off: g.at_off, sec_on: g.sec_on, clicks: g.clicks | 0, leads: g.leads | 0 } : null } }) }
/* показ материала: данные из ev_mat (или быстрый материал), ev_mat_log; одновременно одна заявка, один баннер, один опрос */
async function ef5Show(env, e, W, act, o, sec, sess, now) { const cfg = efJ(e.cfg, {}), evId = +cfg.ev || 0; if (act === 'lead' && efNoSales(e)) return { ok: false, err: 'В эфирах кураторов заявок нет' };
  let mat = null;
  if (o.quick) { if (act === 'lead') return { ok: false, err: 'Быстро можно создать баннер или опрос' }; const dd = ev4MatData(act, o.data || {}), er = ev4MatErr(act, dd); if (er) return { ok: false, err: er };
    if (evId) { await ef2Ensure(env); const r = await env.DB.prepare('INSERT INTO ev_mat (ev_id, kind, data, days, ord, del, at) VALUES (?,?,?,?,999,0,?) RETURNING id').bind(evId, act, JSON.stringify(dd), '[]', now).first(); mat = { id: r.id, data: dd } } else mat = { id: 0, data: dd } }
  else { const m = await env.DB.prepare('SELECT id, kind, data FROM ev_mat WHERE id=? AND ev_id=? AND del=0').bind(+o.mat_id || 0, evId).first(); if (!m || m.kind !== act) return { ok: false, err: 'Материал не найден' }; mat = { id: m.id, data: efJ(m.data, {}) } }
  const D = mat.data, data = act === 'lead' ? { title: D.title || 'Хочешь на обучение?', sub: D.sub || '', btn: D.btn || 'Оставить заявку', hide: +D.hide || 0, tg: D.tg === 0 ? 0 : 1, mat_id: mat.id, t0: sec, until: +D.hide ? sec + D.hide * 60 : 0, timer: 0 }
    : act === 'banner' ? { title: D.title || '', sub: D.sub || '', url: D.url || null, btn: D.btn || 'Открыть', img: D.img || null, hide: +D.hide || 0, mat_id: mat.id, t0: sec, until: +D.hide ? sec + D.hide * 60 : 0 }
    : { q: D.q || '', opts: D.opts || [], show_res: D.show_res === 0 ? 0 : 1, multi: D.multi ? 1 : 0, mat_id: mat.id, t0: sec };
  await env.DB.batch([env.DB.prepare('UPDATE ev_mat_log SET at_off=?, sec_off=? WHERE efir_id=? AND kind=? AND at_off IS NULL').bind(now, sec, e.id, act),
    env.DB.prepare('INSERT INTO efir_ev (efir_id, sess, sec, kind, data, at) VALUES (?,?,?,?,?,?)').bind(e.id, sess, sec, act, JSON.stringify(data), now),
    env.DB.prepare('INSERT INTO ev_mat_log (efir_id, mat_id, kind, sec_on, at_on) VALUES (?,?,?,?,?)').bind(e.id, mat.id, act, sec, now)]);
  await logIt(env, 'efir-' + act, W.uid, e.id + ' mat' + mat.id + ' ' + sec); return { ok: true, sec, mat_id: mat.id } }
/* «+10 мин» у заявки, «Показать итог зрителям» у опроса — правка данных текущего показа (id опроса не меняется — голоса сохраняются) */
async function ef5Tweak(env, e, W, act, sec, now) { const kind = act === 'lead_more' ? 'lead' : 'poll', x = await env.DB.prepare("SELECT id, kind, data FROM efir_ev WHERE efir_id=? AND kind IN (?, ?) ORDER BY id DESC LIMIT 1").bind(e.id, kind, kind + '_off').first();
  if (!x || x.kind !== kind) return { ok: false, err: kind === 'lead' ? 'Заявка сейчас не показана' : 'Опрос сейчас не идёт' }; const d = efJ(x.data, {});
  if (act === 'lead_more') { d.until = Math.max(+d.until || 0, sec) + 600; d.hide = Math.ceil((d.until - (d.t0 != null ? d.t0 : sec)) / 60) } else d.show = 1;
  await env.DB.prepare('UPDATE efir_ev SET data=? WHERE id=?').bind(JSON.stringify(d), x.id).run(); await logIt(env, 'efir-' + act, W.uid, e.id + ' ' + sec); return { ok: true, until: d.until || null } }
/* заказ GetCourse по заявке (продукт мероприятия; шаг 6 Э3). Ошибка — tries++, next_at + 5 мин, до 6 раз (повтор — efLeadRetryTick) */
async function efLeadOrder(env, e, L) { await ef2Ensure(env); const cf = efJ(e.cfg, {}), ev = cf.ev ? await evGet(env, cf.ev) : null, S0 = ev ? ev3Sale(ev) : null;
  if (!L.email || !ev || (S0 && !S0.legacy && S0.mode !== 'sell')) return { skip: 1 }; const of = await ev3Prod(env, S0, ev).catch(() => null); if (!of || !of.title) return { skip: 1 };
  const sec = L.sec, tgn = L.tg || '', D1 = S0 && !S0.legacy ? await ev2Days(env, ev.id) : [], now = msNow();
  const cm = (S0 && !S0.legacy ? String(S0.comment || '').replace(/\{марафон\}/g, ev.title || '').replace(/\{день\}/g, String(Math.max(0, D1.findIndex(x => x.id === e.id)) + 1)).replace(/\{минута\}/g, sec != null ? String(Math.floor(sec / 60)) : '—') + (tgn ? ' · Telegram ' + tgn : '')
    : 'Заявка с эфира «' + e.title + '»' + (sec != null ? ' на ' + Math.floor(sec / 60) + '-й минуте' : '') + (tgn ? ' · Telegram ' + tgn : '')).slice(0, 500), dst = S0 && S0.order_st === 'work' ? 'in_work' : 'new';
  let j = null, err = ''; try { j = await gcImport(env, 'deals', { user: { email: L.email, first_name: L.name || undefined, phone: L.phone || undefined }, system: { refresh_if_exists: 0, return_deal_number: 1 }, deal: of.code ? { offer_code: of.code, deal_status: dst, deal_comment: cm } : { product_title: of.title.slice(0, 250), deal_cost: of.price || 0, deal_status: dst, quantity: 1, deal_comment: cm } }) } catch (x) { err = String(x && x.message || x).slice(0, 200) }
  const RR = (j && j.result) || {}; if (j && (j.success === true || j.success === 'true') && (RR.success === true || RR.success === 'true')) { const num = String(RR.deal_number || RR.deal_id || ''), did = RR.deal_id ? String(RR.deal_id) : null;
    await env.DB.prepare('UPDATE efir_lead SET order_id=?, order_num=?, order_err=NULL, next_at=NULL, text=? WHERE id=?').bind(did, num || null, ('Заказ GetCourse №' + (num || '?') + (L.text0 ? ' · ' + bStr(L.text0, 400) : '')).slice(0, 500), L.id).run(); return { ok: 1, num } }
  err = err || String((RR && RR.error_message) || (j && j.error_message) || 'GetCourse не ответил').slice(0, 200); const tries = (+L.tries || 0) + 1;
  await env.DB.prepare('UPDATE efir_lead SET order_err=?, tries=?, next_at=? WHERE id=?').bind(err, tries, tries >= 6 ? null : now + 5 * 6e4, L.id).run(); await logIt(env, 'efir-lead-gc-err', L.uid || 0, L.id + ' ' + err); return { ok: 0, err } }
async function efLeadRetryTick(env, B, lim) { if (!env.GC_KEY_W) return { skip: 'nokey' }; await ef2Ensure(env); const now = msNow(), out = { ok: 0, fail: 0 };
  const L = await qAll(env.DB.prepare('SELECT * FROM efir_lead WHERE next_at IS NOT NULL AND next_at<=? AND order_num IS NULL AND COALESCE(tries,0)<6 ORDER BY next_at LIMIT ?').bind(now, lim || 5));
  for (const l of L) { if (B && !B.ok()) break; if (B) B.use(); const e = await efGet(env, l.efir_id); if (!e) { await env.DB.prepare('UPDATE efir_lead SET next_at=NULL WHERE id=?').bind(l.id).run(); continue } const r = await efLeadOrder(env, e, l); if (r.ok) out.ok++; else out.fail++ }
  return out }
/* ленивая миграция старых заявок (§2.2, §10): contact «тел · почта · @tg» → колонки, «Заказ GetCourse №N» из text → order_num, st → mgr_st (new→new, mgr→call, done→buy, no→no). Старые колонки не трогаем */
const EF5_ST = { new: 'new', mgr: 'call', done: 'buy', no: 'no' };
function efLeadParse(l) { const P = String(l.contact || '').split(' · ').map(x => x.trim()).filter(Boolean), o = { phone: null, email: null, tg: null };
  for (const p of P) { if (!o.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p)) o.email = p.toLowerCase(); else if (!o.tg && /^@[\w]{3,40}$/.test(p)) o.tg = p; else if (!o.phone && /^\+?[\d\s()-]{7,20}$/.test(p) && p.replace(/\D/g, '').length >= 7) o.phone = p }
  const m = String(l.text || '').match(/Заказ GetCourse №\s*(\d+)/); o.order_num = m ? m[1] : null; o.mgr_st = EF5_ST[l.st] || 'new'; return o }
async function efLeadMigrate(env) { for (let k = 0; k < 6; k++) { const L = await qAll(env.DB.prepare('SELECT id, contact, text, st FROM efir_lead WHERE mgr_st IS NULL LIMIT 400')); if (!L.length) return;
  await env.DB.batch(L.map(l => { const o = efLeadParse(l); return env.DB.prepare('UPDATE efir_lead SET phone=COALESCE(phone, ?), email=COALESCE(email, ?), tg=COALESCE(tg, ?), order_num=COALESCE(order_num, ?), mgr_st=? WHERE id=?').bind(o.phone, o.email, o.tg, o.order_num, o.mgr_st, l.id) })) } }
/* получатели сводки: kv efir_report_to (chat), по умолчанию — все админы бота */
async function efRepTo(env) { const A = await qAll(env.DB.prepare('SELECT chat, name FROM tg_admin')), L = await kvGet(env, 'efir_report_to').catch(() => null), C = Array.isArray(L) && L.length ? L.map(String) : A.map(x => String(x.chat));
  return C.map(c => ({ chat: c, name: bStr(((A.find(a => String(a.chat) === c) || {}).name) || '', 60) || ('Telegram ' + c) })) }
/* итог дня для пульта 3.5б */
async function efFin(env, e, I, W, now) { const id = e.id, [sn, ld, fm, ms, qs, vc] = await env.DB.batch([env.DB.prepare('SELECT COUNT(DISTINCT k) n, AVG(min) a FROM efir_seen WHERE efir_id=? AND sess=0').bind(id), env.DB.prepare('SELECT COUNT(*) n FROM efir_lead WHERE efir_id=?').bind(id),
    env.DB.prepare('SELECT COUNT(*) n FROM ev_form WHERE efir_id=? AND COALESCE(test,0)=0').bind(id), env.DB.prepare("SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND kind='msg' AND del=0").bind(id), env.DB.prepare("SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND kind='q' AND del=0").bind(id), env.DB.prepare("SELECT data FROM efir_ev WHERE efir_id=? AND kind='vc'").bind(id)]);
  const f = r => ((r.results || [])[0] || {}); let peak = 0; for (const x of vc.results || []) peak = Math.max(peak, +(efJ(x.data, {}).n || 0));
  const out = { dur: Math.max(0, Math.round(((e.at_end || now) - (e.at_live || e.start || now)) / 1000)), came: f(sn).n | 0, avg: Math.round(f(sn).a || 0), peak, leads: f(ld).n | 0, forms: f(fm).n | 0, msgs: f(ms).n | 0, qs: f(qs).n | 0, mode: I ? I.mode : (efNoSales(e) ? 'none' : 'sell'), rec: efVideo(efJ(e.rec, null) || e.rec) ? 'ready' : 'wait', bot: null, report: 'off', report_to: [], next: null };
  if (I) { const st = evOn(I.ev).filter(s => s.on === 'after').sort((a, b) => (a.min | 0) - (b.min | 0)).find(s => (e.at_end || now) + (s.min | 0) * 6e4 > now); if (st) out.bot = { title: st.title || 'Сообщение бота', in: (e.at_end || now) + (st.min | 0) * 6e4 - now };
    const nx = I.D.slice(I.i + 1).find(x => x.start && x.start > now && !efJ(x.cfg, {}).hide); if (nx) out.next = { id: nx.id, title: efDayTitle(nx, Object.assign({}, I, { n: I.D.indexOf(nx) + 1 })), start: nx.start } }
  const on = (await kvGet(env, 'efir_report').catch(() => null)) !== 0 && !(I && efJ(I.ev.sale, {}).report === 0); if (on) { const to = await efRepTo(env); out.report = 'on';
    const me = W && W.uid ? await efKeyChat(env, 'u' + W.uid) : null; out.report_me = me && to.some(x => x.chat === String(me)) ? 1 : 0; out.report_to = to.map(x => x.name) }
  return out }
/* 5.5 Настройки эфиров: OBS (сервер, ключ — свой; админ видит ключи всех ведущих), сводка, модераторы, стоп-слова, «+» и «звук не слышно» */
async function efSetGet(env, W, now) { const mine = W.adm ? 'admin' : W.cid, K = env.KINESCOPE_KEY ? await kinGet(env, mine).catch(() => null) : null, A = await qAll(env.DB.prepare('SELECT chat, name FROM tg_admin'));
  if (!W.adm) { const K2 = K; return { ok: true, kin: !!env.KINESCOPE_KEY, obs: { host: mine, ready: !!(K2 && K2.id), server: (K2 && K2.rtmp) || 'rtmp://rtmp.kinescope.io/live', at: K2 && K2.at || null, live: !!(await env.DB.prepare("SELECT id FROM efir WHERE del=0 AND status='live' AND host_cid=? LIMIT 1").bind(mine).first()) }, keys: [], report: null, mods: [], team: [], stop: [], plus: 1, own: 1 } } /* куратору — только свой ключ OBS */
  const keys = []; if (W.adm) for (const c of CURATORS) { const k = env.KINESCOPE_KEY ? await kinGet(env, c.id).catch(() => null) : null; if (k && k.id) keys.push({ host: c.id, name: c.full, at: k.at || null, ready: 1, live: !!(await env.DB.prepare("SELECT id FROM efir WHERE del=0 AND status='live' AND host_cid=? LIMIT 1").bind(c.id).first()) }) }
  const mods = (await kvGet(env, 'efir_mods').catch(() => null)) || [], stop = (await kvGet(env, 'efir_stop').catch(() => null)) || [], plus = await kvGet(env, 'efir_plus').catch(() => null);
  const team = CURATORS.map(c => ({ uid: c.uid, name: c.full, kind: 'cur' })); for (const a of A) team.push({ chat: String(a.chat), name: a.name || ('Telegram ' + a.chat), kind: 'adm' });
  const nm = {}; for (const c of CURATORS) nm[c.uid] = c.full; const mu = (Array.isArray(mods) ? mods : []).map(Number).filter(Boolean), unk = mu.filter(x => !nm[x]);
  if (unk.length) for (const r of await qAll(env.DB.prepare('SELECT uid, name FROM student WHERE uid IN (' + unk.slice(0, 50).map(() => '?').join(',') + ')').bind(...unk.slice(0, 50)))) nm[r.uid] = r.name;
  const liveMine = !!(await env.DB.prepare("SELECT id FROM efir WHERE del=0 AND status='live' AND COALESCE(host_cid,'admin')=? LIMIT 1").bind(mine === 'admin' ? 'admin' : mine).first());
  return { ok: true, kin: !!env.KINESCOPE_KEY, obs: { host: mine, ready: !!(K && K.id), server: (K && K.rtmp) || 'rtmp://rtmp.kinescope.io/live', at: K && K.at || null, live: liveMine }, keys,
    report: { on: (await kvGet(env, 'efir_report').catch(() => null)) === 0 ? 0 : 1, to: await efRepTo(env) },
    mods: mu.map(x => ({ uid: x, name: nm[x] || ('id ' + x) })), team, stop: Array.isArray(stop) ? stop : [], plus: plus === 0 ? 0 : 1 } }
async function efSetPost(env, W, o, now) { const act = String(o.act || ''), mine = W.adm ? 'admin' : W.cid;
  if (act === 'key' || act === 'rekey') { if (!env.KINESCOPE_KEY) return { ok: false, err: 'Kinescope не подключён' }; const h = kinHost(o.host || mine); if (!W.adm && h !== kinHost(mine)) return { ok: false, err: 'Это ключ другого ведущего', st: 403 };
    if (act === 'key') { const K = await kinGet(env, h); if (!K || !K.id) return { ok: false, err: 'Ключ трансляции ещё не создан' }; await logIt(env, 'efir-key-show', W.uid, h); return { ok: true, key: K.key || '', server: K.rtmp || 'rtmp://rtmp.kinescope.io/live' } }
    if (await env.DB.prepare("SELECT id FROM efir WHERE del=0 AND status='live' AND COALESCE(host_cid,'admin')=? LIMIT 1").bind(h === 'admin' ? 'admin' : h).first()) return { ok: false, err: 'Идёт эфир этого ведущего — ключ можно сменить после него' };
    const old = await kinGet(env, h), r = await kinSetup(env, h, !!(old && old.id)); if (!r.ok) return { ok: false, err: r.err || 'Kinescope не ответил' };
    let moved = 0; if (old && old.play && r.K.play && old.play !== r.K.play) { const L = await qAll(env.DB.prepare("SELECT id, video FROM efir WHERE del=0 AND kind!='auto' AND status IN ('plan','draft') AND COALESCE(host_cid,'admin')=?").bind(h === 'admin' ? 'admin' : h));
      for (const e of L) if (kinIsMine(old, e)) { await env.DB.prepare('UPDATE efir SET video=?, upd=? WHERE id=?').bind(JSON.stringify(efVideo({ url: r.K.play })), now, e.id).run(); efDrop(e.id); moved++ } }
    await logIt(env, 'efir-rekey', W.uid, h + ' ' + moved); return { ok: true, moved, at: r.K.at } }
  if (!W.adm) return { ok: false, err: 'Настройки эфиров меняет Роман', st: 403 };
  if (act === 'report') { await kvPut(env, 'efir_report', o.on ? 1 : 0); return { ok: true } }
  if (act === 'report_to') { const L = [...new Set((Array.isArray(o.to) ? o.to : []).map(String).filter(x => /^-?\d{3,20}$/.test(x)))].slice(0, 20); await kvPut(env, 'efir_report_to', L); return { ok: true } }
  if (act === 'mods') { const L = [...new Set((Array.isArray(o.uids) ? o.uids : []).map(Number).filter(x => x > 0))].slice(0, 30); await kvPut(env, 'efir_mods', L); efKvDrop('efir_mods'); await logIt(env, 'efir-mods', W.uid, L.join(',')); return { ok: true } }
  if (act === 'stop') { const L = String(o.text || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean).slice(0, 100).map(x => x.slice(0, 60)); await kvPut(env, 'efir_stop', L); return { ok: true, stop: L } }
  if (act === 'plus') { await kvPut(env, 'efir_plus', o.on ? 1 : 0); return { ok: true } }
  return { ok: false, err: 'Неизвестное действие' } }
/* 4.9 «Нет доступа» / «Запись закрыта» в новой комнате (только при флаге): тариф, поток, гость, куратор для «Написать куратору» */
async function efDeny5(env, e, W, kind, now) { if (!W || !(await efUi2C(env, W.uid))) return {}; await ef2Ensure(env); const cf = efJ(e.cfg, {}), A = cf.access || {};
  const k = kind || (W.me === 'guest' ? 'guest' : e.tariff === 'amz' ? 'tariff' : 'stream'); let cur = null;
  if (W.uid && k !== 'guest') { const r = await env.DB.prepare('SELECT c.username FROM student s JOIN cur_tg c ON c.cid=s.curator AND c.enabled=1 WHERE s.uid=?').bind(W.uid).first().catch(() => null); if (r && r.username) cur = 'https://t.me/' + r.username }
  const out = { ui2: 1, deny: { kind: k, tariff: e.tariff === 'amz' ? 'Премиум Амазон' : null, stream: (A.streams || []).join(' · ') || null, cur, text: k === 'rec' ? (cf.rec_days === 1 ? '24 часа' : cf.rec_days + ' ' + plrS(cf.rec_days, 'день', 'дня', 'дней')) : null }, efir: { id: e.id, title: e.title, start: e.start, state: 'done' } };
  if (k === 'rec' && cf.ev) { const nx = await env.DB.prepare("SELECT start FROM efir WHERE del=0 AND kind='open' AND status='plan' AND CAST(json_extract(cfg, '$.ev') AS INTEGER)=? AND start>? ORDER BY start LIMIT 1").bind(+cf.ev, now).first().catch(() => null); if (nx) out.deny.next = efHM(nx.start) }
  return out }
/* бан в эфире: «Запретить писать» (mute), «Убрать из эфира» (kick) — по k, chat и uid */
async function efBanOf(env, eid, W) { const L = await qAll(env.DB.prepare('SELECT kind FROM efir_ban WHERE efir_id=? AND (k=? OR (uid IS NOT NULL AND uid=?) OR (chat IS NOT NULL AND chat=?))').bind(eid, W.k || '', W.uid || -1, W.chat || '-')).catch(() => []);
  return { mute: L.some(x => x.kind === 'mute'), kick: L.some(x => x.kind === 'kick') } }
const efSpamPlus = t => { t = String(t || '').trim().toLowerCase(); return !t || t.length < 2 || /^[+\s!.]+$/.test(t) || /(звук|не\s*слыш|не\s*вид(но|ать)|тормоз|лага|завис|перезагру)/.test(t) };
const efStopHit = (t, stop) => { t = String(t || '').toLowerCase(); return /https?:\/\/|t\.me\/|www\./.test(t) || (stop || []).some(s => t.includes(s)) };
/* ожидание (4.2): у эфиров мероприятий за 60 мин до старта — чат и «Уже ждут в комнате» (efir_wait, UPSERT не чаще раза в минуту; в статистику не идёт) */
async function efWaitRoom(env, e, W, cfg, after, now) { const Q = [];
  if (!W.ro && W.k && !W.staff) Q.push(env.DB.prepare('INSERT INTO efir_wait (efir_id, k, first, last) VALUES (?,?,?,?) ON CONFLICT(efir_id, k) DO UPDATE SET last=excluded.last WHERE efir_wait.last<?').bind(e.id, W.k, now, now, now - 5e4));
  Q.push(env.DB.prepare("SELECT * FROM efir_msg WHERE efir_id=? AND sess=0 AND del=0 AND id>? AND kind='msg' AND (vis='all' OR k=? OR to_k=?) ORDER BY id DESC LIMIT 80").bind(e.id, after, W.k || '', W.k || ''));
  const R = await env.DB.batch(Q), ms = R[R.length - 1], wk = 'w' + e.id; let wn = EFWN.get(wk);
  if (!wn || now - wn.t > 15e3 || now < wn.t) { const c = await env.DB.prepare('SELECT COUNT(*) n FROM efir_wait WHERE efir_id=? AND last>?').bind(e.id, now - 9e4).first(); wn = { t: now, n: (c && c.n) | 0 }; EFWN.set(wk, wn) }
  return { ok: true, now, state: 'soon', start: e.start, pre: 1, wait_n: wn.n, chat: cfg.chat === 0 ? 0 : 1, pin: cfg.pin || null, msgs: (ms.results || []).reverse().map(m => efMsgPub(m, W)) } }
/* эфир идёт (не автовебинар): один пакет запросов D1 на опрос — присутствие (запись не чаще раза в минуту), чат, вопросы, события, руки, свои голоса, бан, свой голос в опросе.
   Онлайн и итоги опроса — кеш изолята 10 с / 5 с; снимок онлайна (vc) — раз в минуту на эфир */
async function efLiveRoom(env, e, W, cfg, after, now) { const t0 = e.at_live || e.start || now, sec = Math.max(0, Math.floor((now - t0) / 1000)), Q = [], wr = !W.ro && !!W.k;
  if (wr) Q.push(env.DB.prepare('INSERT INTO efir_seen (efir_id, k, sess, t0, scen, min, first, last, maxsec) VALUES (?,?,0,?,?,0,?,?,?) ON CONFLICT(efir_id, k, sess) DO UPDATE SET min=efir_seen.min+(CASE WHEN efir_seen.last>?-180000 THEN 1 ELSE 0 END), last=excluded.last, maxsec=MAX(efir_seen.maxsec, excluded.maxsec) WHERE efir_seen.last<?-50000 RETURNING min, last').bind(e.id, W.k, t0, cfg.scen || null, now, now, sec, now, now));
  const pq = "('e'||(SELECT MAX(id) FROM efir_ev WHERE efir_id=? AND sess=0 AND kind='poll'))";
  Q.push(env.DB.prepare("SELECT * FROM efir_msg WHERE efir_id=? AND sess=0 AND del=0 AND id>? AND kind='msg' AND (vis='all' OR k=? OR to_k=?) ORDER BY id DESC LIMIT 80").bind(e.id, after, W.k, W.k),
    env.DB.prepare("SELECT * FROM efir_msg WHERE efir_id=? AND sess=0 AND del=0 AND kind='q' ORDER BY ans, votes DESC, id LIMIT 40").bind(e.id),
    env.DB.prepare("SELECT * FROM efir_ev WHERE id IN (SELECT MAX(id) FROM efir_ev WHERE efir_id=? AND sess=0 AND kind IN ('lead','lead_off','banner','banner_off','poll','poll_off','screen','screen_off') GROUP BY REPLACE(kind,'_off',''))").bind(e.id),
    env.DB.prepare("SELECT k, name, st, at FROM efir_hand WHERE efir_id=? AND st IN ('wait','stage') ORDER BY at").bind(e.id),
    env.DB.prepare('SELECT v.mid FROM efir_vote v JOIN efir_msg m ON m.id=v.mid WHERE m.efir_id=? AND v.k=?').bind(e.id, W.k),
    env.DB.prepare('SELECT kind FROM efir_ban WHERE efir_id=? AND (k=? OR (uid IS NOT NULL AND uid=?) OR (chat IS NOT NULL AND chat=?))').bind(e.id, W.k, W.uid || -1, W.chat || '-'),
    env.DB.prepare('SELECT opt, opts FROM efir_pollv WHERE ev=' + pq + ' AND k=?').bind(e.id, W.k));
  const R = await env.DB.batch(Q), sh = wr ? 1 : 0, [ms, qs, ev, hd, vt, bn, pm] = R.slice(sh), seen = wr ? ((R[0].results || [])[0] || null) : null;
  const B = (bn.results || []).map(x => x.kind); if (B.includes('kick')) return { ok: false, kick: 1, err: 'Ведущий убрал тебя из эфира', st: 403 };
  let pts = 0; if (seen && seen.min >= 15 && seen.last === now) pts = await efPts(env, W, e.id, 'live15', Math.floor(seen.min / 15));
  /* снимок онлайна для удержания и графика 5.1 — раз в минуту на эфир (§3.5), не только при открытом пульте */
  const vk = 'v' + e.id; let vn = EFVC.get(vk); if (!vn || now - vn.t > 1e4 || now < vn.t) { const c = await env.DB.prepare('SELECT COUNT(*) n FROM efir_seen WHERE efir_id=? AND sess=0 AND last>?').bind(e.id, now - 9e4).first(); vn = { t: now, n: (c && c.n) | 0, w: vn ? vn.w : 0 }; EFVC.set(vk, vn) }
  if (!vn.w || now - vn.w > 6e4) { vn.w = now; await env.DB.prepare("INSERT INTO efir_ev (efir_id, sess, sec, kind, data, at) SELECT ?,0,?,'vc',?,? WHERE NOT EXISTS (SELECT 1 FROM efir_ev WHERE efir_id=? AND kind='vc' AND sec>?)").bind(e.id, sec, JSON.stringify({ n: vn.n }), now, e.id, sec - 55).run().catch(() => null) }
  const V = new Set((vt.results || []).map(x => x.mid)), A = {}; for (const x of ev.results || []) A[x.kind] = Object.assign({ sec: x.sec, id: x.id }, efJ(x.data, {}));
  const out = { ok: true, now, state: 'live', sess: 0, t0, sec, kind: e.kind, pts_new: pts, msgs: (ms.results || []).reverse().map(m => efMsgPub(m, W)), qs: (qs.results || []).map(m => Object.assign(efMsgPub(m, W), { voted: V.has(m.id) ? 1 : 0 })) };
  { const cl = cfg.lead || {}, L = A.lead, gone = L && (L.until ? sec >= L.until : (L.hide && sec - (L.sec || 0) >= L.hide * 60));
    out.lead = L && !efNoSales(e) && !gone ? { title: L.title || cl.title || 'Хочешь на обучение?', sub: L.sub != null ? L.sub : (cl.sub || ''), btn: L.btn || cl.btn || 'Оставить заявку', timer: 0, hide: L.hide || 0, since: L.sec, form: 1, mat_id: L.mat_id || null, remain: L.until ? L.until - sec : null, tg: L.tg === 0 ? 0 : 1 } : null }
  { const Bn = A.banner, gone = Bn && Bn.until && sec >= Bn.until; out.banner = Bn && !gone ? { title: Bn.title || '', sub: Bn.sub || '', url: Bn.url || null, btn: Bn.btn || null, img: Bn.img || null, mat_id: Bn.mat_id || null } : null }
  out.screen = A.screen ? { mid: A.screen.mid, text: A.screen.text || '', name: A.screen.name || '' } : null;
  if (A.poll) { const pid = 'e' + A.poll.id, my = (pm.results || [])[0] || null, myo = my ? (efJ(my.opts, null) || [my.opt]) : null, P = A.poll, newer = P.mat_id != null;
    const see = my ? (newer ? (P.show_res !== 0 || P.show) : true) : !!P.show; let res = null;
    if (see) { const rk = 'p' + pid; let rr = EFVC.get(rk); if (!rr || now - rr.t > 5e3 || now < rr.t) { const L = await qAll(env.DB.prepare('SELECT opt, opts FROM efir_pollv WHERE ev=?').bind(pid)), C = {}; let n = 0;
        for (const x of L) { n++; for (const i of (efJ(x.opts, null) || [x.opt])) C[i] = (C[i] || 0) + 1 } rr = { t: now, v: Object.keys(C).map(i => ({ opt: +i, n: C[i] })), n }; EFVC.set(rk, rr) } res = rr.v; out.poll_n = rr.n }
    out.poll = { id: pid, q: P.q || '', opts: P.opts || [], my: myo ? myo[0] : null, mine: myo, res, multi: P.multi ? 1 : 0, show_res: P.show_res === 0 ? 0 : 1, show: P.show ? 1 : 0, mat_id: P.mat_id || null } }
  const H = hd.results || [], mine = H.findIndex(h => h.k === W.k && h.st === 'wait');
  out.hand = H.find(h => h.k === W.k) ? { st: H.find(h => h.k === W.k).st, pos: mine >= 0 ? H.filter(h => h.st === 'wait').findIndex(h => h.k === W.k) + 1 : 0 } : null;
  if (out.hand && out.hand.st === 'stage') out.hand.url = await efStageUrl(env, e, cfg);
  out.stage = H.filter(h => h.st === 'stage').map(h => h.name); out.hands = H.filter(h => h.st === 'wait').length; out.stage_on = !!cfg.stage; out.opt = { qs: cfg.qs === 0 ? 0 : 1, work: cfg.work === 0 ? 0 : 1 };
  out.viewers = vn.n; out.muted = B.includes('mute') ? 1 : 0; out.chat = cfg.chat === 0 ? 0 : 1; out.pin = cfg.pin || null;
  out.sig = cfg.room || !cfg.signal || efSigOn(cfg.signal) ? 'on' : 'off'; return out }
/* комната 4.2–4.9 (новая, за флагом): дни мероприятия, режим продаж, следующий день, своя заявка/анкета, подстановка контактов */
async function efRoomX(env, e, W, now) { const cf = efJ(e.cfg, {}), I = await efEvInfo(env, e).catch(() => null), out = { mode: I ? I.mode : (efNoSales(e) ? 'none' : 'sell'), pin: cf.pin || null, chat: cf.chat === 0 ? 0 : 1, sig: cf.room || !cf.signal || efSigOn(cf.signal) ? 'on' : 'off' };
  out.title = efDayTitle(e, I, true); out.short = cf.short || ''; out.host = efHost(e).name; out.pre_chat = !!(cf.ev && e.kind !== 'auto');
  if (I) { out.day = { n: I.n, of: I.of, type: I.type }; out.ev = { id: I.ev.id, title: I.ev.title, short: I.ev.short || '' };
    out.days = I.D.filter(x => !efJ(x.cfg, {}).hide).map((x, i) => ({ id: x.id, n: i + 1, title: x.title, start: x.start, st: x.status === 'live' ? 'live' : ['done', 'rec'].includes(x.status) ? 'past' : 'soon' }));
    const nx = I.D.slice(I.i + 1).find(x => x.start && !efJ(x.cfg, {}).hide && x.status !== 'done'); if (nx) out.next = { id: nx.id, n: I.D.indexOf(nx) + 1, title: nx.title, title2: efDayTitle(nx, Object.assign({}, I, { n: I.D.indexOf(nx) + 1 }), true), start: nx.start };
    const lm = await env.DB.prepare("SELECT l.mat_id, m.data FROM ev_mat_log l LEFT JOIN ev_mat m ON m.id=l.mat_id WHERE l.efir_id=? AND l.kind='lead' ORDER BY l.id DESC LIMIT 1").bind(e.id).first().catch(() => null);
    if (lm) { const d = efJ(lm.data, {}); out.lead_mat = { id: lm.mat_id, title: d.title || '', sub: d.sub || '', btn: d.btn || '', tg: d.tg === 0 ? 0 : 1 } }
    const rg = W.k ? await env.DB.prepare('SELECT chat, src FROM ev_reg WHERE ev_id=? AND k=?').bind(I.ev.id, W.k).first().catch(() => null) : null; out.reg_bot = rg && rg.chat ? 1 : 0;
    if (I.mode === 'form' && W.k) { const f = await env.DB.prepare('SELECT id, name FROM ev_form WHERE efir_id=? AND k=? ORDER BY id DESC LIMIT 1').bind(e.id, W.k).first().catch(() => null); out.form_ok = f ? { id: f.id, name: f.name || '' } : null;
      const F = (I.S && I.S.form) || {}; out.form = { src: F.src || 'own', fields: F.fields || {}, questions: (F.questions || []).map(q => ({ id: q.id, t: q.t, kind: q.kind, opts: q.opts || [], req: q.req ? 1 : 0 })), gform: F.src === 'gform' && F.gform ? { url: F.gform.url || '', open: F.gform.open || 'inside' } : null } } }
  if (W.k) { const L = await env.DB.prepare('SELECT id, name, phone, email, tg FROM efir_lead WHERE efir_id=? AND k=? ORDER BY id DESC LIMIT 1').bind(e.id, W.k).first().catch(() => null); out.lead_sent = L || null;
    if (!L && I) try { out.prefill = await ev3Prefill(env, I.ev, W) } catch (x) {} }
  if (e.at_end) { const rd = I ? ev2Rec(I.ev).days : (cf.rec_days || 0); if (rd > 0) out.rec_until = Math.ceil((e.at_end + rd * 864e5) / 36e5) * 36e5 }
  const bn = W.k ? await efBanOf(env, e.id, W) : {}; if (bn.kick) out.kick = 1; if (bn.mute) out.muted = 1;
  out.rec_offset = cf.rec_offset || 0; return out }
/* пульт v2 (3.1–3.7): сигнал, кто в пульте, счётчики, материалы дня, заявки/анкеты, «Готово к эфиру», итог дня. Модератору — без контактов и без материалов (§0.3) */
async function efPultX(env, e0, W, S, now) { await ef2Ensure(env); await efSigCheck(env, e0, now).catch(() => null); const e = (await efGet(env, e0.id)) || e0, cf = efJ(e.cfg, {}), I = await efEvInfo(env, e).catch(() => null), mod = !!W.modr;
  const pk = e.id + ':' + (W.uid || 0); if (W.uid && (!EFPU.get(pk) || now - EFPU.get(pk) > 6e4 || now < EFPU.get(pk))) { EFPU.set(pk, now); await env.DB.prepare('INSERT INTO efir_pult (efir_id, uid, name, role, last) VALUES (?,?,?,?,?) ON CONFLICT(efir_id, uid) DO UPDATE SET last=excluded.last, name=excluded.name, role=excluded.role').bind(e.id, W.uid, await efName(env, W), mod ? 'mod' : W.adm ? 'admin' : 'host', now).run() }
  const [cn, mp, ld, fm] = await env.DB.batch([
    env.DB.prepare("SELECT (SELECT COUNT(*) FROM efir_msg WHERE efir_id=?1 AND kind='msg' AND del=0) msgs, (SELECT COUNT(DISTINCT k) FROM efir_seen WHERE efir_id=?1 AND sess=0) seen, (SELECT COUNT(*) FROM efir_lead WHERE efir_id=?1) leads, (SELECT COUNT(*) FROM efir_lead WHERE efir_id=?1 AND at>?2) leads60, (SELECT COUNT(*) FROM efir_wait WHERE efir_id=?1 AND last>?3) wait, (SELECT COUNT(*) FROM ev_form WHERE efir_id=?1 AND COALESCE(test,0)=0) forms, (SELECT COUNT(*) FROM ev_form WHERE efir_id=?1 AND COALESCE(test,0)=0 AND at>?2) forms60, (SELECT COUNT(*) FROM efir_msg WHERE efir_id=?1 AND kind='q' AND del=0 AND ans=0) qn, (SELECT COUNT(*) FROM efir_msg WHERE efir_id=?1 AND kind='q' AND del=0 AND ans=1) qa").bind(e.id, now - 6e4, now - 9e4),
    env.DB.prepare("SELECT name FROM efir_pult WHERE efir_id=? AND last>? AND role='mod' ORDER BY last DESC").bind(e.id, now - 9e4),
    env.DB.prepare('SELECT id, name, sec, at, phone, email, tg, contact, order_num, order_id, order_err, pay_st, mgr_st, next_at, tries FROM efir_lead WHERE efir_id=? ORDER BY id DESC LIMIT 50').bind(e.id),
    env.DB.prepare('SELECT id, name, phone, answers, sec, at, row_ok FROM ev_form WHERE efir_id=? AND COALESCE(test,0)=0 ORDER BY id DESC LIMIT 50').bind(e.id)]);
  const C = (cn.results || [])[0] || {}, mods = await efKvC(env, 'efir_mods', 3e4);
  const out = { v2: 1, role: mod ? 'mod' : 'host', fmt: efFmt(e, I && I.ev), sig: cf.signal || null, room_in: cf.room_in || null, title2: efDayTitle(e, I), title_full: efDayTitle(e, I, true), status: e.status, at_live: e.at_live || null, at_end: e.at_end || null,
    opt: { chat: cf.chat === 0 ? 0 : 1, hand: cf.stage ? 1 : 0, qs: cf.qs === 0 ? 0 : 1, work: cf.work === 0 ? 0 : 1 }, pin: cf.pin || null, rec_offset: cf.rec_offset || 0,
    n: { msgs: C.msgs | 0, seen: C.seen | 0, wait: C.wait | 0, qs_new: C.qn | 0, qs_ans: C.qa | 0, leads: mod ? 0 : C.leads | 0, leads60: mod ? 0 : C.leads60 | 0, forms: mod ? 0 : C.forms | 0, forms60: mod ? 0 : C.forms60 | 0 },
    ev: I ? { id: I.ev.id, type: I.type, title: I.ev.title, short: I.ev.short || '', n: I.n, of: I.of } : null, mode: I ? I.mode : (efNoSales(e) ? 'none' : 'sell'), mods_on: Array.isArray(mods) && mods.length ? 1 : 0, mods_in: [...new Set((mp.results || []).map(x => x.name))] };
  if (mod) return out;
  out.link = I ? 'https://t.me/' + BOT(env) + '?start=v' + I.ev.id : SITE + '/teach/control/stream?fs=efir&e=' + e.id;
  if (out.fmt === 'obs' && env.KINESCOPE_KEY) { const K = await kinGet(env, kinHost(e.host_cid)).catch(() => null), z = K && K.id && KIN_LIVE[K.id]; if (z && z.res) out.sig_res = z.res.replace('x', '×') }
  out.play = (v0 => v0 ? (v0.embed || v0.url) : null)(efVideo(efJ(e.video, null) || e.video));
  out.leads2 = (ld.results || []).map(l => ({ id: l.id, name: l.name || 'Зритель', sec: l.sec, at: l.at, phone: l.phone || '', email: l.email || '', tg: l.tg || '', contact: l.contact || '', order_num: l.order_num || null, order_id: l.order_id || null, err: !l.order_num && l.order_err ? 1 : 0, retry: l.next_at ? 1 : 0, pay: l.pay_st || null, st: l.mgr_st || 'new' }));
  out.forms2 = (fm.results || []).map(f => { const a = efJ(f.answers, {}) || {}; return { id: f.id, name: f.name || 'Зритель', phone: f.phone || '', sec: f.sec, at: f.at, row_ok: f.row_ok ? 1 : 0, ans: Object.values(a).map(v => Array.isArray(v) ? v.join(', ') : String(v)).filter(Boolean).slice(0, 2) } });
  out.mats = await efMats(env, e, I, now);
  if (I) { const st = evOn(I.ev).filter(s => s.on === 'before' && e.start && e.start - (s.min | 0) * 6e4 <= now).sort((a, b) => (a.min | 0) - (b.min | 0))[0];
    if (st) { const c = await env.DB.prepare('SELECT COUNT(*) n FROM ev_sent WHERE ev_id=? AND step=? AND efir_id=? AND ok=1').bind(I.ev.id, st.id, e.id).first(); out.bot = { title: efBefore(st.min | 0), n: (c && c.n) | 0 } }
    const r = await env.DB.prepare('SELECT COUNT(*) n FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0').bind(I.ev.id).first(); out.regs_n = (r && r.n) | 0 }
  if (S.st === 'done') out.fin = await efFin(env, e, I, W, now);
  return out }
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
/* 04.11 (Роман: «эфир закончился, записи нет»): без record.parent_id Kinescope не сохраняет запись трансляции. Папка для записей — kv efir_kin_folder, иначе первый проект аккаунта (запоминаем) */
async function kinFolder(env) { const f = await kvGet(env, 'efir_kin_folder'); if (f) return String(f);
  const r = await kinCall(env, 'GET', '/v1/projects?per_page=20'); const L = r.ok ? (Array.isArray(r.data) ? r.data : (r.data && r.data.items) || []) : []; const p = L.find(x => x && x.id); if (!p) return null; await kvPut(env, 'efir_kin_folder', p.id); return p.id }
/* 04.11 (Роман: «мы не можем терять записи»): перед каждым эфиром и раз в 6 часов проверяем, что у трансляции ведущего включено сохранение записи (record.parent_id); нет — включаем */
async function kinRecEnsure(env, K) { const g = await kinCall(env, 'GET', '/v2/live/events/' + K.id); let rec = g.ok && g.data ? g.data.record : null; if (typeof rec === 'string') { try { rec = JSON.parse(rec) } catch (x) { rec = null } }
  if (rec && rec.parent_id) return true; const folder = await kinFolder(env); if (!folder) return false; const r = await kinCall(env, 'PUT', '/v2/live/events/' + K.id, { record: { parent_id: folder } }); await logIt(env, 'kin-rec-on', 0, K.id + ' ' + (r.ok ? 'ok' : r.st)); return r.ok }
/* включить сохранение записи у уже созданных трансляций ведущих (PUT меняет только переданные поля; Kinescope разрешает правку, пока поток в статусе pending) */
async function kinRecFix(env) { const folder = await kinFolder(env); if (!folder) return { ok: false, err: 'нет проекта в Kinescope' }; const out = {};
  for (const h of ['admin'].concat(CURATORS.map(c => c.id))) { const K = await kinGet(env, h); if (!K || !K.id) continue; const r = await kinCall(env, 'PUT', '/v2/live/events/' + K.id, { record: { parent_id: folder } }); out[h] = r.ok ? 'ok' : (r.st || 0) + ' ' + String(r.err || '').slice(0, 120) }
  return { ok: true, folder, out } }
/* создать трансляцию ведущего (один раз; force — заново, новый ключ). Поля сверх name/type Kinescope может не знать — тогда повтор с минимальным телом */
async function kinSetup(env, host, force) { const h = kinHost(host), old = await kinGet(env, h); if (old && old.id && !force) return { ok: true, K: old, created: false };
  const base = { name: 'OduvanovSchool · эфиры · ' + kinHostName(h), type: 'recurring' }, folder = await kinFolder(env);
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
  const d = r.data || {}, st = String((d.stream && d.stream.status) || d.status || '').toLowerCase();
  /* 06.11: Kinescope пишет «on-air», как только трансляция включена (и после «Завершить эфир» — тоже), даже без сигнала из OBS. Поток реально идёт, только если в плейлисте есть качества */
  if (/^(on-air|on_air)$/.test(st) && d.stream && d.stream.id && d.workspace_id) { const m = await fetch('https://live.kinescopecdn.net/on-air/' + d.workspace_id + '/' + d.stream.id + '/master.m3u8').then(x => x.ok ? x.text() : '').catch(() => ''); z.res = (m.match(/RESOLUTION=(\d{3,4}x\d{3,4})/) || [])[1] || null; return (z.v = /#EXT-X-STREAM-INF/.test(m)) }
  return (z.v = /^(live|active|online|streaming|started|running)$/.test(st) ? true : st ? false : null) }
/* 07.11 Эфиры Э5 (решение Романа №3, §3.4): старт — только кнопкой «Начать эфир». Раньше поток ведущего сам переводил эфир в live (автостарт выключен; у автовебинаров его и не было).
   Теперь: сигнал OBS (поток за 30 мин до начала … час после, и идущие эфиры) пишется в cfg.signal — только смена on/off; через 5 мин после начала при сигнале и ненажатой кнопке — одно сообщение ведущему (cfg.nudge) */
async function kinAutoLive(env, now) { if (!env.KINESCOPE_KEY) return 0; const L = await qAll(env.DB.prepare("SELECT * FROM efir WHERE del=0 AND kind!='auto' AND ((status='plan' AND start BETWEEN ? AND ?) OR (status='live' AND COALESCE(at_live, start)>?)) ORDER BY (status='live') DESC, start").bind(now - 36e5, now + 18e5, now - 12 * 36e5)); if (!L.length) return 0;
  let n = 0; const done = {}; for (const e of L) { if (efJ(e.cfg, {}).room) continue; const h = kinHost(e.host_cid); if (done[h]) continue; const K = await kinGet(env, h); if (!K || !K.id || !kinIsMine(K, e)) continue; done[h] = 1;
    const v = await kinLiveNow(env, K); if (v == null) continue; if (await efSigSet(env, e, v, now)) n++;
    if (v === true && e.status === 'plan' && e.start && now >= e.start + 5 * 6e4) await efNudge(env, e, now) }
  return n }
/* крон: запись эфира из трансляции его ведущего в «Записи» (закончились за 7 дней, записи ещё нет) */
async function kinRecJob(env, B) { if (!env.KINESCOPE_KEY) return { skip: 'nokey' }; const now = msNow();
  { const lc = (await kvGet(env, 'kin_rec_chk')) || 0; if (now - lc > 6 * 36e5) { await kvPut(env, 'kin_rec_chk', now); for (const h of ['admin'].concat(CURATORS.map(c => c.id))) { const K = await kinGet(env, h); if (K && K.id) await kinRecEnsure(env, K).catch(() => null) } } }
  /* запись не появилась за 2 часа после эфира — Роману в бот (один раз на эфир) */
  { const W2 = (await qAll(env.DB.prepare("SELECT * FROM efir WHERE del=0 AND kind!='auto' AND status IN ('done','rec') AND (rec IS NULL OR rec='' OR rec='null') AND at_end BETWEEN ? AND ?").bind(now - 3 * 864e5, now - 40 * 6e4))).filter(e => efJ(e.cfg, {}).room || e.at_end < now - 2 * 36e5); /* 06.11: у комнаты запись готова через минуты — сигнал через 40 минут, у трансляции — через 2 часа */
    for (const e of W2) { const c0 = efJ(e.cfg, {}); if (!(c0.kin || c0.room) || c0.rec_alert || c0.norec) continue; c0.rec_alert = now; await env.DB.prepare('UPDATE efir SET cfg=? WHERE id=?').bind(JSON.stringify(c0), e.id).run();
      for (const ch of await admins(env)) await tgSend(env, ch, '⚠️ <b>' + nbt('Запись эфира не появилась') + '</b>\n«' + th(e.title) + '» · ' + th(efHost(e).name) + '\n' + nbt(c0.room ? 'Прошло 40 минут после «Завершить», а записи комнаты в Kinescope нет. Скорее всего, ведущий зашёл в комнату не под своим аккаунтом Kinescope (или со страницы эфира) — тогда Kinescope встречу не пишет.' : 'Прошло 2 часа после «Завершить», а в Kinescope записи нет. Проверь трансляцию в кабинете Kinescope.')) } }
  const L = await qAll(env.DB.prepare("SELECT * FROM efir WHERE del=0 AND kind!='auto' AND status IN ('done','rec') AND (rec IS NULL OR rec='' OR rec='null' OR (rec LIKE '%kinescope%' AND rec NOT LIKE '%dur%')) AND at_end>? ORDER BY at_end DESC LIMIT 8").bind(now - 7 * 864e5)); if (!L.length) return { n: 0 };
  let n = 0; const VV = {}; for (const e of L) { if (efJ(e.cfg, {}).room) { n += await roomRecFind(env, e, now); continue } const h = kinHost(e.host_cid), K = await kinGet(env, h); if (!K || !K.id || !kinIsMine(K, e)) continue;
    { const c0 = efJ(e.cfg, {}); if (!c0.kin) { c0.kin = 1; await env.DB.prepare('UPDATE efir SET cfg=? WHERE id=?').bind(JSON.stringify(c0), e.id).run() } }
    if (!VV[K.id]) { const r = await kinCall(env, 'GET', '/v2/live/events/' + K.id + '/videos'); VV[K.id] = r.ok ? (Array.isArray(r.data) ? r.data : (r.data && (r.data.items || r.data.videos)) || []).map(v => ({ id: v.id, at: Date.parse(v.created_at || v.started_at || '') || 0, st: String(v.status || '').toLowerCase(), dur: +v.duration || 0 })).filter(v => v.id) : [] }
    const t0 = (e.at_live || e.start || 0) - 15 * 6e4, t1 = (e.at_end || now) + 30 * 6e4;
    const v = VV[K.id].filter(x => x.at >= t0 && x.at <= t1 && (!x.st || /done|ready|processed|uploaded/.test(x.st))).sort((a, b) => b.dur - a.dur)[0]; if (!v) continue;
    const rv = efVideo({ id: String(v.id), provider: 'kinescope', dur: v.dur }); if (!rv) continue; /* 04.11: длительность записи — из Kinescope (dur, секунды) */
    await env.DB.prepare('UPDATE efir SET rec=?, upd=? WHERE id=?').bind(JSON.stringify(rv), now, e.id).run(); await logIt(env, 'efir-rec-kin', 0, e.id + ' ' + v.id); n++ }
  return { n } }
/* ---------- 05.11 «Комната»: эфир куратора как видеовстреча Kinescope Speak (до 100 человек, у учеников камера/микрофон/экран) ----------
   Комната своя на каждый эфир (kv room:<id>), запись включена (autorecording). Ведущий входит по ссылке с правами администратора (JWT RS256,
   ключ — kv speak_key, публичная часть загружена в Kinescope POST /v1/jwk). Ученики — во фрейме на платформе: учёт времени и баллы — как в эфире. */
const jwB = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), jwS = s => jwB(new TextEncoder().encode(s));
async function spkKey(env) { let k = await kvGet(env, 'speak_key'); if (k && k.priv) return k;
  const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const priv = await crypto.subtle.exportKey('jwk', kp.privateKey), pub = await crypto.subtle.exportKey('jwk', kp.publicKey);
  k = { kid: 'oduvanov-' + Date.now().toString(36), priv, n: pub.n, e: pub.e, up: 0 }; await kvPut(env, 'speak_key', k); return k }
async function spkUpload(env) { const k = await spkKey(env); if (k.up) return { ok: true, already: 1, kid: k.kid };
  const r = await fetch(KIN_API + '/v1/jwk', { method: 'POST', headers: { Authorization: 'Bearer ' + env.KINESCOPE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ kty: 'RSA', e: k.e, n: k.n, use: 'sig', kid: k.kid, alg: 'RS256', expires_at: '2031-12-31T23:59:59Z' }) });
  const t = await r.text(); if (r.ok) { k.up = 1; await kvPut(env, 'speak_key', k) } return { ok: r.ok, st: r.status, kid: k.kid, res: t.slice(0, 300) } }
async function spkAdmin(env, code) { const k = await kvGet(env, 'speak_key'); if (!k || !k.up || !code) return null;
  const key = await crypto.subtle.importKey('jwk', k.priv, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']), t = Math.floor(Date.now() / 1000);
  const h = jwS(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: k.kid })), p = jwS(JSON.stringify({ aud: 'speak', room_id: code, role: 'admin', iat: t, nbf: t - 60, exp: t + 12 * 3600 }));
  const sg = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(h + '.' + p)); return 'https://speak.kinescope.io/' + code + '?token=' + h + '.' + p + '.' + jwB(sg) }
async function roomFolder(env) { const f = await kvGet(env, 'room_folder'); if (f) return String(f); const pj = await kinFolder(env); if (!pj) return null;
  const r = await kinCall(env, 'POST', '/v1/projects/' + pj + '/folders', { name: 'Комнаты кураторов (записи)' }); const id = r.ok && r.data && r.data.id; if (id) { await kvPut(env, 'room_folder', id); return id } return pj }
/* 05.11 (тест Романа): Kinescope пишет встречу, только пока в комнате владелец. Владелец комнаты куратора — его аккаунт в команде Kinescope
   (ищем в GET /v1/users по фамилии/почте или kv kin_owner:<cid>); пока куратора в команде нет — владелец Роман */
async function curKinUser(env, cid) { const c = CURATORS.find(x => x.id === cid); if (!c) return null; const k = await kvGet(env, 'kin_owner:' + cid); if (k) return String(k);
  const ck = 'kin_owner_chk:' + cid, t = await kvGet(env, ck); if (t && msNow() - t < 10 * 6e4) return null; await kvPut(env, ck, msNow());
  const r = await kinCall(env, 'GET', '/v1/users?per_page=50'); const L = r.ok && Array.isArray(r.data) ? r.data : [], sur = c.full.split(' ').pop().toLowerCase(), tr = { 'фрейм': ['freim', 'frejm', 'freym', 'frame'], 'кошкин': ['koshkin', 'koshkn'] }[sur] || [];
  const u = L.find(x => { const s = (String(x.full_name || '') + ' ' + String(x.email || '')).toLowerCase(); return s.includes(sur) || tr.some(q => s.includes(q)) }); if (u && u.id) { await kvPut(env, 'kin_owner:' + cid, u.id); await logIt(env, 'kin-owner', 0, cid + ' ' + u.id); return String(u.id) } return null }
async function efRoom(env, e, force) { if (!env.KINESCOPE_KEY) return null; const kk = 'room:' + e.id, kv = await kvGet(env, kk); const cu = e.host_cid && e.host_cid !== 'admin' ? await curKinUser(env, e.host_cid).catch(() => null) : null;
  /* куратор появился в команде Kinescope — комнату ещё не начавшегося эфира пересоздаём с ним владельцем (owner_id у комнаты не меняется) */
  if (!force && kv && kv.code && cu && kv.owner !== cu && !['live', 'done', 'rec'].includes(e.status)) force = true;
  if (!force && kv && kv.code) return kv;
  const name = ('OduvanovSchool · ' + ((CURATORS.find(c => c.id === e.host_cid) || {}).name || 'Роман') + ' · ' + String(e.title || '')).slice(0, 95);
  const r = await fetch(KIN_API + '/v1/speak/rooms', { method: 'POST', headers: { Authorization: 'Bearer ' + env.KINESCOPE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type: 'permanent_meeting', owner_id: cu || await spkOwner(env), autorecording: true, waiting_room: false, wait_for_host: false, record_folder_id: await roomFolder(env).catch(() => null) || undefined }) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch (x) {} const d = j && (j.data || j);
  if (!r.ok || !d || !d.code) { await logIt(env, 'room-err', 0, e.id + ' ' + r.status + ' ' + t.slice(0, 200)); return { err: 'Kinescope ' + r.status } }
  const o = { id: d.id, code: d.code, link: d.link || 'https://speak.kinescope.io/' + d.code, name, at: msNow(), rec: d.autorecording !== false, owner: d.owner_id || cu || null, own_cur: cu ? 1 : 0 }; await kvPut(env, kk, o); return o }
async function efRoomLinks(env, e, W) { const cfg = efJ(e.cfg, {}); if (!cfg.room || e.kind === 'auto') return null; const R = await efRoom(env, e).catch(() => null); if (!R || !R.code) return { err: 1 };
  const own = efOwn(W, e); /* владелец-куратор входит обычной ссылкой под своим аккаунтом Kinescope — тогда он владелец и запись идёт; по ссылке с ключом он был бы только организатором (так не записалось на тесте Романа). Роман в своих комнатах — тоже обычной ссылкой */
  return { link: R.link, code: R.code, host: own ? ((R.own_cur ? !W.adm : W.adm) ? R.link : (await spkAdmin(env, R.code).catch(() => null)) || R.link) : null, admin: own ? !!(await kvGet(env, 'speak_key') || {}).up : null, owner_cur: R.own_cur ? 1 : 0 } }
/* запись комнаты: Speak кладёт видео встречи в каталог Kinescope; ищем новое видео за время эфира с именем комнаты (или единственное новое не из трансляций) */
async function roomRecFind(env, e, now) { const R = await kvGet(env, 'room:' + e.id); if (!R || !R.code) return 0;
  const r = await kinCall(env, 'GET', '/v1/videos?order=created_at.desc&per_page=50'); if (!r.ok) return 0; const L = Array.isArray(r.data) ? r.data : [];
  const t0 = (e.at_live || e.start || 0) - 20 * 6e4, t1 = (e.at_end || now) + 6 * 36e5, used = (await kvGet(env, 'room_rec_used')) || {};
  const RF = await kvGet(env, 'room_folder'), C = L.map(v => ({ id: v.id, t: String(v.title || ''), at: Date.parse(v.created_at || '') || 0, st: String(v.status || ''), dur: +v.duration || 0, f: v.folder_id || v.parent_id || null })).filter(v => v.at >= t0 && v.at <= t1 && !used[v.id] && !/^OduvanovSchool · эфиры/.test(v.t));
  const nm = String(R.name || ''), byName = C.filter(v => v.t && (v.t.includes(R.code) || (nm && (v.t.includes(nm) || nm.includes(v.t))))), inF = RF ? C.filter(v => v.f === RF) : [];
  const v = (byName.length ? byName : inF.length === 1 ? inF : (C.length === 1 ? C : [])).sort((a, b) => b.dur - a.dur)[0];
  if (!v) { if (C.length > 1) await logIt(env, 'room-rec-many', 0, e.id + ' ' + C.map(x => x.id + ':' + x.t.slice(0, 40)).join(' | ').slice(0, 400)); return 0 }
  if (!/done|ready|processed/.test(v.st)) return 0; const rv = efVideo({ id: String(v.id), provider: 'kinescope', dur: v.dur }); if (!rv) return 0;
  used[v.id] = e.id; await kvPut(env, 'room_rec_used', used); /* 05.11: в плеере поверх видео Kinescope показывает название — «Record OduvanovSchool · …» меняем на тему эфира */ await kinCall(env, 'PATCH', '/v1/videos/' + v.id, { title: String(e.title || '').slice(0, 200) }).catch(() => null); await env.DB.prepare('UPDATE efir SET rec=?, upd=? WHERE id=?').bind(JSON.stringify(rv), now, e.id).run(); await logIt(env, 'efir-rec-room', 0, e.id + ' ' + v.id + ' ' + v.t.slice(0, 60)); return 1 }
async function efirHostApi(env, req, path, u, o, W, now) { if (!W.s) return W.mod ? efModApi(env, req, path, u, o, W, now) : json(req, { ok: false, err: 'Только для команды школы' }, 403);
  if (W.modr && !EF5_MODP.test(path)) return json(req, { ok: false, err: 'Модератору это недоступно' }, 403);
  /* 07.11 Эфиры Э0: кто я в разделе «Эфиры» и включён ли новый раздел (флаг efir_ui2); включить/выключить флаг — только админ */
  if (path === '/efir/host/me') { await ef2Ensure(env); return json(req, { ok: true, role: W.me, cid: W.cid || null, uid: W.uid || 0, ui2: (await efUi2(env, W.uid)) ? 1 : 0 }) }
  if (path === '/efir/host/ui2') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); await ef2Ensure(env);
    /* 07.11 Э3: «Новый раздел эфиров (бета)» — админ включает и выключает флаг только себе; список других uid не трогаем */
    if (req.method === 'POST' && (o.self || o.uid != null)) { const me = +W.uid || 0; if (!me || (o.uid != null && +o.uid !== me)) return json(req, { ok: false, err: 'Можно включить только себе' }, 403);
      const L0 = (await kvGet(env, 'efir_ui2')) || [], L = (Array.isArray(L0) ? L0 : []).map(Number).filter(x => x && x !== me); if (o.on) L.push(me); await kvPut(env, 'efir_ui2', L); await logIt(env, 'efir-ui2-self', me, o.on ? 'on' : 'off'); return json(req, { ok: true, ui2: o.on ? 1 : 0 }) }
    if (req.method === 'POST') { const L = [...new Set((Array.isArray(o.uids) ? o.uids : String(o.uids || '').split(/[\s,;]+/)).map(x => String(x).trim()).filter(x => /^\d{3,12}$/.test(x)))].slice(0, 50).map(Number);
      await kvPut(env, 'efir_ui2', L); await logIt(env, 'efir-ui2', W.uid, L.join(',')); return json(req, { ok: true, uids: L }) }
    return json(req, { ok: true, uids: (await kvGet(env, 'efir_ui2')) || [] }) }
  /* 07.11 Э5: идущие эфиры (экран модератора #host/mod), настройки эфиров 5.5 */
  if (path === '/efir/host/live') return json(req, await efLiveList(env, now));
  if (path === '/efir/host/settings') { await ef2Ensure(env); if (req.method === 'POST') { const r = await efSetPost(env, W, o, now); return json(req, r, r.st || (r.ok ? 200 : 400), { 'Cache-Control': 'no-store' }) } return json(req, await efSetGet(env, W, now), 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/efir/host/cover' && req.method === 'POST') { const m = String(o.data || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/); if (!m) return json(req, { ok: false, err: 'Нужна картинка JPG, PNG или WebP' }, 400);
    if (m[2].length > 1400000) return json(req, { ok: false, err: 'Картинка слишком большая — до 1 МБ' }, 400);
    const r = await env.DB.prepare('INSERT INTO efir_cover (mime, data, by_uid, at) VALUES (?,?,?,?) RETURNING id').bind(m[1], m[2], W.uid || 0, now).first();
    return json(req, { ok: true, id: r.id, url: new URL(req.url).origin + '/efir/cover?id=' + r.id }) }
  /* 07.11 Э2 (§3.2): картинка → efir_cover, ответ {url:"/efir/cover?id="}; справочник продуктов; потоки и тарифы для доступа 2.7 */
  if (path === '/efir/host/img' && req.method === 'POST') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); const m = String(o.data || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/); if (!m) return json(req, { ok: false, err: 'Нужна картинка JPG, PNG или WebP' }, 400);
    if (m[2].length > 1400000) return json(req, { ok: false, err: 'Картинка слишком большая — до 1 МБ' }, 400);
    const r = await env.DB.prepare('INSERT INTO efir_cover (mime, data, by_uid, at) VALUES (?,?,?,?) RETURNING id').bind(m[1], m[2], W.uid || 0, now).first(); return json(req, { ok: true, id: r.id, url: '/efir/cover?id=' + r.id }) }
  if (path === '/efir/host/prod') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); await ef2Ensure(env); return json(req, await ev2Prod(env, req, o, W)) }
  if (path === '/efir/host/streams') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); return json(req, await ev2Streams(env)) }
  /* Kinescope: без ключа работает по ID/ссылке плеера; с секретом KINESCOPE_KEY — список видео (GET https://api.kinescope.io/v1/videos, документация docs.kinescope.com/api) */
  /* 1.11: разбор, почему запись не подтянулась (только админ; ключей не отдаём) */
  if (path === '/efir/kin/norec') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); const e = await efGet(env, u.searchParams.get('id')); if (!e) return json(req, { ok: false }); const c0 = efJ(e.cfg, {}); c0.norec = 1; await env.DB.prepare('UPDATE efir SET cfg=? WHERE id=?').bind(JSON.stringify(c0), e.id).run(); return json(req, { ok: true }) }
  if (path === '/efir/kin/roomkey') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); return json(req, await spkUpload(env)) }
  if (path === '/efir/kin/roompatch' && req.method === 'POST') { if (!W.adm) return json(req, { ok: false }, 403); const e = await efGet(env, o.id); const R = e && await kvGet(env, 'room:' + e.id); if (!R) return json(req, { ok: false, err: 'нет комнаты' });
    const b = {}; for (const k of ['record_folder_id', 'autorecording', 'wait_for_host', 'waiting_room', 'name', 'transcription_autostart']) if (o.b && o.b[k] !== undefined) b[k] = o.b[k]; if (o.folder) b.record_folder_id = await kinFolder(env);
    const r = await fetch(KIN_API + '/v1/speak/rooms/' + R.id, { method: 'PATCH', headers: { Authorization: 'Bearer ' + env.KINESCOPE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return json(req, { st: r.status, sent: b, res: (await r.text()).slice(0, 700) }) }
  if (path === '/efir/kin/owners') { if (!W.adm) return json(req, { ok: false }, 403); if (u.searchParams.get('cid') && u.searchParams.get('uid')) await kvPut(env, 'kin_owner:' + u.searchParams.get('cid'), u.searchParams.get('uid'));
    const r = await kinCall(env, 'GET', '/v1/users?per_page=50'); const o = {}; for (const c of CURATORS) { await kvPut(env, 'kin_owner_chk:' + c.id, 0); o[c.id] = await curKinUser(env, c.id) } return json(req, { ok: true, users: (r.ok && Array.isArray(r.data) ? r.data : []).map(x => ({ id: x.id, name: x.full_name, email: x.email })), owners: o }) }
  if (path === '/efir/kin/rectitle') { if (!W.adm) return json(req, { ok: false }, 403); const e = await efGet(env, u.searchParams.get('id')); const rv = e && efVideo(efJ(e.rec, null) || e.rec); if (!rv || !rv.id) return json(req, { ok: false, err: 'нет записи' }); return json(req, await kinCall(env, 'PATCH', '/v1/videos/' + rv.id, { title: String(e.title || '').slice(0, 200) })) }
  if (path === '/efir/kin/roomdbg') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); const e = await efGet(env, u.searchParams.get('id')); if (!e) return json(req, { ok: false }); const R = await kvGet(env, 'room:' + e.id); return json(req, { ok: true, room: R, cfg: efJ(e.cfg, {}) }) }
  if (path === '/efir/kin/recfix') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); return json(req, await kinRecFix(env)) }
  if (path === '/efir/kin/run') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); return json(req, { ok: true, r: await kinRecJob(env, budget(30)) }) }
  if (path === '/efir/kin/recdbg') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); const e = await env.DB.prepare('SELECT * FROM efir WHERE id=?').bind(+u.searchParams.get('id')).first(); if (!e) return json(req, { ok: false, err: 'нет эфира' });
    const K = await kinGet(env, kinHost(e.host_cid)), r = K && K.id ? await kinCall(env, 'GET', '/v2/live/events/' + K.id + '/videos') : null;
    const raw = r && r.ok ? (Array.isArray(r.data) ? r.data : (r.data && (r.data.items || r.data.videos)) || []) : null;
    const ev0 = K && K.id ? await kinCall(env, 'GET', '/v2/live/events/' + K.id) : null, sk = ev0 && ev0.ok && ev0.data ? String(ev0.data.streamkey || ev0.data.stream_key || (ev0.data.stream && ev0.data.stream.streamkey) || '') : '';
    return json(req, { ok: true, key_same: sk ? sk === String(K.key || '') : null, key_fields: ev0 && ev0.data ? Object.keys(ev0.data).filter(k => /key|rtmp|ingest|url/i.test(k)) : null, has_k: !!(K && K.id), mine: kinIsMine(K, e), rec_db: e.rec || null, at_live: e.at_live, at_end: e.at_end, api: r ? (r.ok ? 'ok' : r.st + ' ' + r.err) : null, raw_keys: r && r.data && !Array.isArray(r.data) ? Object.keys(r.data).slice(0, 12) : null,
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
  /* 05.11: чтение Kinescope для отладки комнат (только админ, только GET, секретные поля вырезаются) */
  if (path === '/efir/kin/get') { if (!W.adm) return json(req, { ok: false }, 403); const pp = u.searchParams.get('p') || ''; if (!/^\/v[12]\/(videos|users|speak|webhooks|jwk|live|projects|folders)[\/a-zA-Z0-9_\-]*$/.test(pp)) return json(req, { ok: false, err: 'path' }, 400);
    const qs = new URLSearchParams(u.searchParams); qs.delete('p'); const r = await fetch(KIN_API + pp + (qs.toString() ? '?' + qs : ''), { headers: { Authorization: 'Bearer ' + env.KINESCOPE_KEY, Accept: 'application/json' } }); const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch (x) { j = t.slice(0, 500) }
    const cut = v => Array.isArray(v) ? v.map(cut) : (v && typeof v === 'object') ? Object.fromEntries(Object.entries(v).filter(([kk]) => !/pass|token|secret|streamkey|stream_key|play_link_key|^key$/i.test(kk)).map(([kk, x]) => [kk, cut(x)])) : v;
    return json(req, { st: r.status, j: cut(j) }) }
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
  /* 04.11: список учеников для «Кто видит → Выбрать учеников»: куратору — его, админу — весь поток */
  if (path === '/efir/host/students') { const A = await appStudents(env, W.adm ? 'all' : W.cid); return json(req, { ok: true, students: (A.students || []).map(x => ({ uid: +x.uid, name: x.name, cur: x.cur || null, tar: x.tar || null, last: x.last || null, week: x.week, place: x.place || null })), curators: CURATORS.map(c => ({ cid: c.id, name: c.full })) }) }
  /* 04.11: проверка Kinescope Speak (админ): ?id=<эфир> — создать/показать комнату сцены */
  if (path === '/efir/host/speak') { if (!W.adm) return json(req, { ok: false, err: 'Только Роман' }, 403); const ee = u.searchParams.get('id') === 'test' ? { id: 'test', title: 'Проверка сцены' } : await efGet(env, u.searchParams.get('id')); if (!ee) return json(req, { ok: false, err: 'Эфир не найден' }, 404);
    const x = await efSpeak(env, ee, u.searchParams.get('force') === '1'); return json(req, typeof x === 'string' ? { ok: true, link: x } : { ok: false, res: x }) }
  if (path === '/efir/host/list') { const L = await qAll(W.adm ? env.DB.prepare("SELECT * FROM efir WHERE del=0 AND NOT (status='draft' AND start IS NULL) ORDER BY start DESC LIMIT 200") : env.DB.prepare('SELECT * FROM efir WHERE del=0 AND host_cid=? ORDER BY start DESC LIMIT 200').bind(W.cid));
    const ids = L.map(e => e.id), C = {}; if (ids.length) { const ph = ids.map(() => '?').join(','), [rg, sn, ld] = await env.DB.batch([env.DB.prepare('SELECT efir_id, COUNT(*) n FROM efir_reg WHERE efir_id IN (' + ph + ') GROUP BY efir_id').bind(...ids), env.DB.prepare('SELECT efir_id, COUNT(DISTINCT k) n, SUM(CASE WHEN last>? AND sess>=0 THEN 1 ELSE 0 END) live FROM efir_seen WHERE efir_id IN (' + ph + ') GROUP BY efir_id').bind(now - 9e4, ...ids), env.DB.prepare('SELECT efir_id, COUNT(*) n FROM efir_lead WHERE efir_id IN (' + ph + ') GROUP BY efir_id').bind(...ids)]);
      for (const x of rg.results || []) (C[x.efir_id] = C[x.efir_id] || {}).reg = x.n; for (const x of sn.results || []) Object.assign(C[x.efir_id] = C[x.efir_id] || {}, { came: x.n, now: x.live }); for (const x of ld.results || []) (C[x.efir_id] = C[x.efir_id] || {}).leads = x.n }
    const sc = W.adm ? await qAll(env.DB.prepare('SELECT id, src_id, ver, title, at, note FROM efir_scen ORDER BY id DESC LIMIT 60')) : [];
    const KL = await kinGet(env, W.adm ? 'admin' : W.cid);
    return json(req, { ok: true, now, role: W.me, cid: W.cid, kin: !!env.KINESCOPE_KEY, kin_ready: !!(KL && KL.id), kin_warn: KL && KL.warn || null, kin_live: KL && KL.id ? await kinLiveNow(env, KL) : null, efirs: L.map(e => Object.assign(efPub(e, now, { full: true }), { cfg: efEditCfg(e), counts: C[e.id] || {} })), scen: sc, leads_cfg: W.adm ? ((await kvGet(env, 'efir_leads')) || {}) : null, curators: CURATORS.map(c => ({ cid: c.id, name: c.full })) }) }
  if (path === '/efir/host/save' && req.method === 'POST') { const old = id ? await efGet(env, id) : null; if (id && !old) return json(req, { ok: false, err: 'Эфир не найден' }, 404); if (old && !efOwn(W, old)) return json(req, { ok: false, err: 'Это эфир другого ведущего' }, 403);
    const title = bStr(o.title, 140); if (!title) return json(req, { ok: false, err: 'Напиши тему эфира' }, 400);
    let kind = EF_KINDS.includes(o.kind) ? o.kind : 'live', acc = EF_ACC.includes(o.access) ? o.access : 'all';
    if (!W.adm) { if (kind !== 'live') return json(req, { ok: false, err: 'Открытые эфиры и автовебинары создаёт Роман' }, 403); if (!['all', 'cur', 'sel'].includes(acc)) acc = 'cur' }
    if (kind === 'open') acc = 'open';
    /* 06.11: открытый эфир — всегда день мероприятия (марафон или один эфир). Не выбрали — создаём мероприятие с темой эфира и стандартной воронкой */
    if (kind === 'open' && W.adm) { await evEnsure(env); let evId = +o.ev || 0; if (evId && !(await evGet(env, evId))) evId = 0; if (!evId && old) evId = +efJ(old.cfg, {}).ev || 0;
      if (!evId) { const r = await env.DB.prepare('INSERT INTO efir_event (title, about, cover, offer, funnel, created, upd) VALUES (?,?,?,?,?,?,?) RETURNING id').bind(bStr(o.title, 140), bStr(o.about, 1500), null, null, JSON.stringify(evFunnelDef()), now, now).first(); evId = r.id }
      o.cfg = Object.assign({}, o.cfg || {}, { ev: evId }) }
    let start = +o.start || 0; if (!start && /^\d{4}-\d{2}-\d{2}$/.test(o.day || '') && /^\d{1,2}:\d{2}$/.test(o.time || '')) start = Date.parse(o.day + 'T' + o.time.padStart(5, '0') + ':00+03:00');
    if (kind !== 'auto' && !(start > 0)) return json(req, { ok: false, err: 'Укажи дату и время (МСК)' }, 400);
    const c0 = old ? efJ(old.cfg, {}) : {}, ci = o.cfg || {}, cfg = Object.assign({}, c0, { rec_days: [0, 1, 3, 7, 14, 30].includes(+ci.rec_days) ? +ci.rec_days : (c0.rec_days || 0), stage: ci.stage ? 1 : 0, stage_url: /^https:\/\//.test(ci.stage_url || '') ? bStr(ci.stage_url, 300) : null, work: ci.work === 0 ? 0 : 1, label: ci.label ? 1 : 0, room: ci.room && (o.kind || 'live') === 'live' ? 1 : 0 }); if (ci.ev && kind === 'open') cfg.ev = +ci.ev; else if (kind !== 'open') delete cfg.ev;
    /* 04.11: выбранные ученики — куратор может отметить только своих */
    if (acc === 'sel') { let ids = [...new Set((Array.isArray(ci.uids) ? ci.uids : []).map(x => +x).filter(x => x > 0))].slice(0, 1000);
      if (!W.adm && ids.length) { const mine = new Set(((await appStudents(env, W.cid)).students || []).map(x => +x.uid)); ids = ids.filter(x => mine.has(x)) }
      if (!ids.length) return json(req, { ok: false, err: 'Отметь хотя бы одного ученика' }, 400); cfg.uids = ids } else delete cfg.uids;
    cfg.lead = W.adm && ci.lead && bStr(ci.lead.title, 100) ? { on: 1, title: bStr(ci.lead.title, 100), sub: bStr(ci.lead.sub, 160), btn: bStr(ci.lead.btn, 40) || 'Оставить заявку', timer: Math.min(180, Math.max(0, +ci.lead.timer | 0)), url: /^https:\/\//.test(ci.lead.url || '') ? bStr(ci.lead.url, 400) : null, min: ci.lead.min != null && ci.lead.min !== '' ? Math.max(0, +ci.lead.min | 0) : null } : null;
    if (kind === 'auto') { const sd = ci.sched || {}; cfg.sched = { days: (Array.isArray(sd.days) ? sd.days : []).map(Number).filter(x => x >= 0 && x <= 6), times: (Array.isArray(sd.times) ? sd.times : String(sd.times || '').split(/[\s,;]+/)).filter(t => /^\d{1,2}:\d{2}$/.test(t)).slice(0, 6), every: Math.max(0, +sd.every | 0), after: Math.max(0, +sd.after | 0) };
      if (ci.scen != null) { const sc = +ci.scen ? await env.DB.prepare('SELECT id, src_id FROM efir_scen WHERE id=?').bind(+ci.scen).first() : null; cfg.scen = sc ? sc.id : null; if (sc && sc.src_id) { const src = await efGet(env, sc.src_id); if (src) cfg.orig_at = src.at_live || src.start } } }
    const hostK = W.adm ? (CURATORS.find(c => c.id === o.host) ? o.host : 'admin') : W.cid;
    const K0 = kind !== 'auto' ? await kinGet(env, hostK) : null, vIn = efVideo(o.video), oldV = old ? efVideo(efJ(old.video, null) || old.video) : null, Kold = old && oldV ? await kinGet(env, old.host_cid) : null;
    /* Kinescope подключён и ссылку не вписали (или стоял плеер трансляции прежнего ведущего) — ставится плеер трансляции ведущего этого эфира; сменили ведущего — плеер переезжает */
    const oldIsKin = !!(old && Kold && kinIsMine(Kold, old)), sameAsOld = vIn && oldV && vIn.id && vIn.id === oldV.id;
    const v = (vIn && !(oldIsKin && sameAsOld)) ? vIn : (K0 && K0.play && (!oldV || oldIsKin) ? efVideo({ url: K0.play }) : (oldIsKin ? null : vIn)), rv = efVideo(o.rec), ch = (Array.isArray(o.chapters) ? o.chapters : []).map(x => ({ t: Math.max(0, +x.t | 0), title: bStr(x.title, 120) })).filter(x => x.title).sort((a, b) => a.t - b.t).slice(0, 60);
    cfg.kin = !cfg.room && v && K0 && K0.play && (efVideo({ url: K0.play }) || {}).id === v.id ? 1 : 0;
    /* 05.11 (Роман): «Комната» — видеовстреча Kinescope Speak вместо трансляции из OBS (эфиры кураторов). Плеера трансляции нет — только комната */
    const host = W.adm ? (CURATORS.find(c => c.id === o.host) ? o.host : 'admin') : W.cid, hc = CURATORS.find(c => c.id === host), cover = /^https:\/\/[^\s"'<>]+$/.test(o.cover || '') ? bStr(o.cover, 400) : null;
    const status = ['draft', 'plan'].includes(o.status) ? o.status : (old ? old.status : 'plan'), dur = Math.min(600, Math.max(10, +o.dur | 0 || 60));
    const vOut = cfg.room ? (vIn || null) : v;
    const vals = [title, bStr(o.about, 1000), host, hc ? hc.uid : efAdminUid(env), hc ? hc.full : 'Роман Одуванов', start || null, dur, kind, acc, old && ['live', 'done', 'rec'].includes(old.status) && ['draft', 'plan'].includes(status) && !o.reopen ? old.status : status, vOut ? JSON.stringify(vOut) : null, rv ? JSON.stringify(rv) : null, cover, JSON.stringify(ch), JSON.stringify(cfg), now];
    let nid = id; if (old) await env.DB.prepare('UPDATE efir SET title=?, about=?, host_cid=?, host_uid=?, host_name=?, start=?, dur=?, kind=?, tariff=?, status=?, video=?, rec=?, cover=?, chapters=?, cfg=?, upd=? WHERE id=?').bind(...vals, id).run();
    else nid = (await env.DB.prepare('INSERT INTO efir (title, about, host_cid, host_uid, host_name, start, dur, kind, tariff, status, video, rec, cover, chapters, cfg, upd, created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id').bind(...vals, now).first()).id;
    if (old && old.start !== start) await env.DB.prepare("UPDATE efir_reg SET rem='' WHERE efir_id=? AND sess=0").bind(id).run();
    let kin_warn = null; if (cfg.room) { const rr = await efRoom(env, Object.assign({}, old || {}, { id: nid, title, host_cid: host, host_name: hc ? hc.full : 'Роман Одуванов' })).catch(x => ({ err: String(x && x.message || x) })); if (!rr || rr.err) kin_warn = 'Комната Kinescope не создалась: ' + ((rr && rr.err) || 'нет ключа') + '. Попробуй сохранить ещё раз.' }
    else if (K0 && K0.id && v && kind !== 'auto' && start > now && (!old || old.start !== start || !old.video || kinHost(old.host_cid) !== kinHost(hostK))) { const nx = await env.DB.prepare("SELECT id FROM efir WHERE del=0 AND kind!='auto' AND status IN ('plan','draft') AND start>? AND host_cid=? ORDER BY start LIMIT 1").bind(now, host).first();
      if (nx && nx.id === nid && efVideo({ url: K0.play }).id === v.id) kin_warn = await kinSchedule(env, K0, start) }
    try { await efPlanSync(env, await efGet(env, nid)) } catch (x) { await logIt(env, 'efir-plan-err', 0, nid + ' ' + String(x && x.message || x).slice(0, 200)) }
    await logIt(env, 'efir-save', W.uid, nid + ' ' + kind + ' ' + (W.cid || 'admin')); return json(req, Object.assign({ ok: true, id: nid, ev: cfg.ev || null }, kin_warn ? { kin_warn } : {})) }
  if (path === '/efir/host/events' || path.startsWith('/efir/host/event/')) return evHostApi(env, req, path, u, o, W);
  /* 07.11 Э6 (5.2б): карточка человека — только админ (модератору и куратору закрыто, §0.3) */
  if (path === '/efir/host/person') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); await ef2Ensure(env);
    if (req.method === 'POST') { const r = await ef6PersonSave(env, o, W); return json(req, r, r.st || 200) } const r = await ef6Person(env, String(u.searchParams.get('k') || ''), String(u.searchParams.get('id') || ''), now); return json(req, r, r.ok ? 200 : 404, { 'Cache-Control': 'no-store' }) }
  const e = await efGet(env, id); if (!e) return json(req, { ok: false, err: 'Эфир не найден' }, 404);
  if (!efOwn(W, e)) { if (W.mod && !W.modr && EF5_MODP.test(path) && efModCan(e, now)) W = Object.assign({}, W, { modr: 1, modId: e.id, adm: false, cid: null }); else return json(req, { ok: false, err: 'Это эфир другого ведущего' }, 403) } /* 07.11 Э5: куратор-модератор в чужом эфире */
  if (W.modr && req.method === 'POST') await efModLog(env, W, e, path, o);
  /* 06.11 (Роман): во время эфира ведущий включает/выключает у зрителей вкладки «Вопросы» и «Моя работа» */
  if (path === '/efir/host/opt' && req.method === 'POST') { const k = o.k === 'qs' ? 'qs' : o.k === 'work' ? 'work' : o.k === 'chat' ? 'chat' : o.k === 'hand' ? 'stage' : null; efDrop(e.id); /* 07.11 Э5: + «Чат» и «Рука» (рука = cfg.stage) */ if (!k) return json(req, { ok: false, err: 'Неизвестная настройка' }, 400);
    const cf = efJ(e.cfg, {}); cf[k] = o.v ? 1 : 0; await env.DB.prepare('UPDATE efir SET cfg=?, upd=? WHERE id=?').bind(JSON.stringify(cf), now, e.id).run(); await logIt(env, 'efir-opt', W.uid, e.id + ' ' + k + '=' + cf[k]); return json(req, { ok: true, k, v: cf[k] }) }
  /* 04.11 (Роман): «Рассылка участникам» — кому доступен эфир (пульт → Рассылки, «Выбранные»), ссылка на эфир подставляется в кнопку */
  if (path === '/efir/host/roomlink') { const L = await efRoomLinks(env, e, W), cfR = efJ(e.cfg, {}), curRoom = !!(e.host_cid && e.host_cid !== 'admin' && !cfR.ev), want = u.searchParams.get('start') === '1';
    /* 07.11 Э5 (§3.4): вход ведущего в комнату запускает эфир только у эфиров кураторов (как раньше: 6.2 «Войти в комнату» = старт). У мероприятий, вебинаров fmt=room и эфиров Романа — только отметка «ведущий в комнате»
       (cfg.room_in, первый вход = signal.first_on — от него сдвиг записи), старт — «Начать эфир» в пульте. Старый пульт: «Начать эфир» у комнаты шлёт start=1 — запускает, как раньше */
    if (L && !L.err && u.searchParams.get('peek') !== '1' && !W.modr && e.kind !== 'auto' && ['plan', 'draft'].includes(e.status)) {
      if (!cfR.room_in) { await env.DB.prepare("UPDATE efir SET cfg=json_set(json_set(COALESCE(cfg,'{}'), '$.room_in', ?), '$.signal', json(?)) WHERE id=?").bind(now, JSON.stringify(Object.assign({}, cfR.signal || {}, { at_on: now, first_on: (cfR.signal || {}).first_on || now })), e.id).run(); efDrop(e.id); await logIt(env, 'efir-room-in', W.uid, e.id) }
      if ((curRoom || want) && now >= (e.start || 0) - 30 * 6e4) { await env.DB.prepare("UPDATE efir SET status='live', at_live=COALESCE(at_live, ?), upd=?, cfg=CASE WHEN at_live IS NULL THEN json_set(COALESCE(cfg,'{}'), '$.rec_offset', 0) ELSE cfg END WHERE id=?").bind(now, now, e.id).run(); efDrop(e.id); await logIt(env, 'efir-room-live', W.uid, e.id + (want ? ' start' : '')); await efPlanStartNow(env, e.id) } }
    if (!L || L.err) return json(req, { ok: false, err: L ? 'Комната Kinescope не создалась — сохрани эфир ещё раз или напиши Роману' : 'Это эфир-трансляция, не комната' }); return json(req, { ok: true, link: L.host || L.link, admin: L.admin }) }
  if (path === '/efir/host/aud') { const cf = efJ(e.cfg, {}), acc = e.tariff || 'all'; let uids = null;
    if (acc === 'sel') uids = cf.uids || []; else if (acc === 'open') uids = (await qAll(env.DB.prepare('SELECT DISTINCT uid FROM efir_reg WHERE efir_id=? AND uid>0').bind(e.id))).map(x => +x.uid);
    const link = acc === 'open' || e.kind === 'open' ? 'https://t.me/' + BOT(env) + '?start=e' + e.id : SITE + '/teach/control/stream?fs=efir&e=' + e.id;
    return json(req, { ok: true, id: e.id, title: e.title, start: e.start || null, kind: e.kind, acc, host: e.host_cid || 'admin', uids, link }) }
  const cfg = efJ(e.cfg, {}), S = efState(e, now), sess = e.kind === 'auto' ? +(o.sess || u.searchParams.get('sess') || S.sess || 0) : 0, sec = Math.max(0, Math.floor((now - (e.kind === 'auto' ? sess : (e.at_live || e.start || now))) / 1000));
  if (path === '/efir/host/del' && req.method === 'POST' && o.v2 && e.status !== 'draft') { const n = await env.DB.prepare('SELECT COUNT(*) n FROM efir_reg WHERE efir_id=?').bind(e.id).first(); if ((n && n.n) | 0) return json(req, { ok: false, err: 'Есть записавшиеся — удалить нельзя' }, 400) } /* 07.11 Э2: удаление из 1.1 */
  if (path === '/efir/host/del' && req.method === 'POST') { await env.DB.prepare('UPDATE efir SET del=1, upd=? WHERE id=?').bind(now, e.id).run(); try { await efPlanSync(env, Object.assign({}, e, { del: 1 })) } catch (x) {} await logIt(env, 'efir-del', W.uid, e.id); return json(req, { ok: true }) }
  /* пульт ведущего: старт/конец, кнопка заявки, баннер, опрос, «на экран». Каждое событие — с секундой (для сценария) */
  if (path === '/efir/host/state' && req.method === 'POST') { const act = String(o.act || ''), d = o.data || {}, q = []; efDrop(e.id);
    /* 07.11 Э5 (§3.4): материалы дня — из ev_mat (mat_id) или «+ Быстрый материал» (quick); «+10 мин» у заявки; «Показать итог зрителям» у опроса */
    if (/^(lead|banner|poll)$/.test(act) && (+o.mat_id || o.quick)) { await ef2Ensure(env); const r5 = await ef5Show(env, e, W, act, o, sec, sess, now); return json(req, r5, r5.ok ? 200 : 400) }
    if (act === 'lead_more' || act === 'poll_show') { const r5 = await ef5Tweak(env, e, W, act, sec, now); return json(req, r5, r5.ok ? 200 : 400) }
    if (/^(lead|banner|poll)_off$/.test(act) || act === 'end') { await ef2Ensure(env); q.push(env.DB.prepare('UPDATE ev_mat_log SET at_off=?, sec_off=? WHERE efir_id=? AND at_off IS NULL' + (act === 'end' ? '' : ' AND kind=?')).bind(...[now, sec, e.id].concat(act === 'end' ? [] : [act.replace('_off', '')]))) }
    /* старт: сдвиг записи — от первого сигнала OBS (или первого входа ведущего в комнату) до «Начать эфир» (§3.4), только при первом старте */
    if (act === 'start') { if (e.kind === 'auto') return json(req, { ok: false, err: 'Автовебинар идёт по расписанию' }, 400); await efPlanStartNow(env, e.id); const sg = cfg.signal || {}, off = sg.first_on && sg.first_on < now ? Math.round((now - sg.first_on) / 1000) : 0;
      q.push(env.DB.prepare("UPDATE efir SET status='live', at_live=COALESCE(at_live, ?), upd=?, cfg=CASE WHEN at_live IS NULL THEN json_set(COALESCE(cfg,'{}'), '$.rec_offset', ?) ELSE cfg END WHERE id=?").bind(now, now, off, e.id)) }
    else if (act === 'end') q.push(env.DB.prepare("UPDATE efir SET status='done', at_end=?, upd=? WHERE id=?").bind(now, now, e.id), env.DB.prepare("UPDATE efir_hand SET st='done' WHERE efir_id=? AND st IN ('wait','stage')").bind(e.id));
    else if (/^(lead|banner|poll|screen)(_off)?$/.test(act)) { if (/^lead/.test(act) && efNoSales(e)) return json(req, { ok: false, err: 'В эфирах кураторов заявок нет' }, 400);
      const data = act === 'lead' ? { title: bStr(d.title || (cfg.lead || {}).title || 'Хочешь на обучение?', 100), sub: bStr(d.sub != null ? d.sub : (cfg.lead || {}).sub || 'Оставь заявку — менеджер свяжется с тобой', 160), btn: bStr(d.btn || (cfg.lead || {}).btn || 'Оставить заявку', 40), timer: Math.min(180, +(d.timer != null ? d.timer : (cfg.lead || {}).timer) | 0), hide: [0, 3, 5, 10, 15, 30].includes(+d.hide) ? +d.hide : 0 }
        : act === 'banner' ? { title: bStr(d.title, 100), sub: bStr(d.sub, 160), url: /^https:\/\//.test(d.url || '') ? bStr(d.url, 400) : null, btn: bStr(d.btn, 40) || null }
        : act === 'poll' ? { q: bStr(d.q, 200), opts: (Array.isArray(d.opts) ? d.opts : String(d.opts || '').split('/')).map(x => bStr(x, 60)).filter(Boolean).slice(0, 6) }
        : act === 'screen' ? { mid: +d.mid || null, text: bStr(d.text, 400), name: bStr(d.name, 60) } : {};
       if (act === 'poll' && (!data.q || data.opts.length < 2)) return json(req, { ok: false, err: 'Вопрос и хотя бы 2 варианта через /' }, 400);
      q.push(env.DB.prepare('INSERT INTO efir_ev (efir_id, sess, sec, kind, data, at) VALUES (?,?,?,?,?,?)').bind(e.id, sess, sec, act, JSON.stringify(data), now)) }
    else return json(req, { ok: false, err: 'Неизвестное действие' }, 400);
    await env.DB.batch(q); await logIt(env, 'efir-' + act, W.uid, e.id + ' ' + sec);
    if (act === 'end' && e.status === 'live') { try { await efReport(env, Object.assign({}, e, { at_end: now })) } catch (x) { await logIt(env, 'efir-report-err', 0, String(x && x.message || x).slice(0, 200)) } }
    /* трансляция школы: «Начать» — включить приём потока; «Завершить» — закрыть поток (запись подтянет крон) и снова включить событие для следующего эфира */
    let kin_warn = null; if ((act === 'start' || act === 'end') && env.KINESCOPE_KEY) { const K = await kinGet(env, e.host_cid); if (K && K.id && kinIsMine(K, e)) {
      if (act === 'start') { const rf = await kinRecEnsure(env, K); if (!rf) kin_warn = 'Kinescope: не удалось включить сохранение записи — напиши Роману до начала эфира'; const r = await kinCall(env, 'PUT', '/v2/live/events/' + K.id + '/enable'); if (!r.ok && r.st !== 400 && r.st !== 409 && r.st !== 422) kin_warn = r.err }
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
    const X5 = u.searchParams.get('v') === '2' || W.modr ? await efPultX(env, e, W, S, now) : null; /* 07.11 Э5: новый пульт 3.1–3.7 */
    return json(req, Object.assign({ ok: true, now, sec, state: S.st, status: e.status, sess, efir: efPub(e, now, { full: true }), msgs: (ms.results || []).reverse().map(m => Object.assign(efMsgPub(m), { k: m.k })), qs: (qs.results || []).map(m => Object.assign(efMsgPub(m), { k: m.k })),
      hands: (hd.results || []).map(h => ({ k: h.k, name: h.name, st: h.st, at: h.at })), works: (wk.results || []).map(w => ({ id: w.id, name: w.name, text: w.text || '', file: w.file_id, mime: w.mime || null, at: w.at, ans: w.ans })), leads: ld.results || [], viewers: n, regs: ((rg.results || [])[0] || {}).n || 0,
      lead: A.lead || null, banner: A.banner || null, poll, screen: A.screen || null, no_sales: efNoSales(e), stage_url: cfg.stage ? await efStageUrl(env, e, cfg) : null }, X5 || {}, W.modr ? { leads: [], works: [], regs: 0, efir: Object.assign(efPub(e, now), { video: null }) } : {})) }
  /* сообщение ведущего/модератора: всем (в автовебинаре — всем зрителям сеанса) или лично (to — id сообщения зрителя) */
  if (path === '/efir/host/msg' && req.method === 'POST') { const text = bStr(o.text, 1000); if (!text) return json(req, { ok: false, err: 'Пустое сообщение' }, 400);
    const to = +o.to ? await env.DB.prepare('SELECT id, k, sess, sec FROM efir_msg WHERE id=? AND efir_id=?').bind(+o.to, e.id).first() : null, ss = to ? to.sess : sess, personal = !!(to && !o.all);
    const r = await env.DB.prepare('INSERT INTO efir_msg (efir_id, sess, k, uid, name, role, kind, text, sec, at, vis, to_k, reply_to) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *').bind(e.id, ss, W.k, W.uid, e.kind === 'auto' ? 'Модератор' : await efName(env, W), W.adm || e.host_cid === W.cid ? 'host' : 'mod', 'msg', text, to && to.sec != null ? to.sec + 1 : sec, now, personal ? 'mod' : 'all', personal ? to.k : null, to ? to.id : null).first();
    if (to) await env.DB.prepare('UPDATE efir_msg SET ans=1 WHERE id=?').bind(to.id).run();
    if (o.pin && !personal) { await env.DB.prepare("UPDATE efir SET cfg=json_set(COALESCE(cfg,'{}'), '$.pin', json(?)) WHERE id=?").bind(JSON.stringify({ mid: r.id, text: bStr(text, 300), name: r.name }), e.id).run(); efDrop(e.id) } /* 07.11 Э5 */
    let added = 0; if (o.scen && W.adm && cfg.scen && to) { added = await efScenAdd(env, cfg.scen, { sec: (to.sec || 0) + 20, t: 'msg', role: 'mod', name: 'Модератор', text }) }
    return json(req, { ok: true, msg: efMsgPub(r), scen: added }) }
  if (path === '/efir/host/q' && req.method === 'POST') { if (o.act === 'unpin') { await env.DB.prepare("UPDATE efir SET cfg=json_remove(COALESCE(cfg,'{}'), '$.pin') WHERE id=?").bind(e.id).run(); efDrop(e.id); return json(req, { ok: true }) } /* 07.11 Э5 */
    const m = await env.DB.prepare('SELECT * FROM efir_msg WHERE id=? AND efir_id=?').bind(+o.mid, e.id).first(); if (!m) return json(req, { ok: false, err: 'Сообщение не найдено' }, 404);
    if (o.act === 'pin') { await env.DB.prepare("UPDATE efir SET cfg=json_set(COALESCE(cfg,'{}'), '$.pin', json(?)) WHERE id=?").bind(JSON.stringify({ mid: m.id, text: bStr(m.text, 300), name: m.name || '' }), e.id).run(); efDrop(e.id); return json(req, { ok: true }) }
    if (o.act === 'hide') { await env.DB.prepare("UPDATE efir_msg SET vis='mod' WHERE id=?").bind(m.id).run(); return json(req, { ok: true }) }
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
  if (path === '/efir/host/lead' && req.method === 'POST') { const st = ['new', 'mgr', 'done', 'no'].includes(o.st) ? o.st : 'mgr'; await ef2Ensure(env); await env.DB.prepare('UPDATE efir_lead SET st=?, mgr_st=? WHERE id=? AND efir_id=?').bind(st, EF5_ST[st] || 'call', +o.lid, e.id).run(); return json(req, { ok: true, st }) }
  /* 07.11 Э5 (§3.4): «заказ не создался — повторить» */
  if (path === '/efir/host/lead/retry' && req.method === 'POST') { await ef2Ensure(env); const L = await env.DB.prepare('SELECT * FROM efir_lead WHERE id=? AND efir_id=?').bind(+o.lid, e.id).first(); if (!L) return json(req, { ok: false, err: 'Заявка не найдена' }, 404);
    if (L.order_num) return json(req, { ok: true, num: L.order_num }); if (!L.email) return json(req, { ok: false, err: 'В заявке нет почты — заказ в GetCourse без неё не создать' }, 400);
    const r = await efLeadOrder(env, e, Object.assign({}, L, { tries: 0 })); return json(req, r.ok ? { ok: true, num: r.num } : { ok: false, err: 'GetCourse не ответил — повторим сами через 5 минут' }, r.ok ? 200 : 502) }
  /* 07.11 Э5 (3.4 «Онлайн»): кто на странице за 90 с — имя, пометка, минуты; модератору — без пометки «заявка» и без лички (§0.3) */
  if (path === '/efir/host/online') { await ef2Ensure(env); const L = await qAll(env.DB.prepare('SELECT s.k, s.min, s.first, r.name FROM efir_seen s LEFT JOIN efir_reg r ON r.efir_id=s.efir_id AND r.k=s.k WHERE s.efir_id=? AND s.sess=0 AND s.last>? ORDER BY s.min DESC, s.first LIMIT 500').bind(e.id, now - 9e4));
    const uids = L.filter(x => x.k[0] === 'u').map(x => +x.k.slice(1)), chats = L.filter(x => x.k[0] === 't').map(x => x.k.slice(1)), SN = {}, TN = {}, LD = new Set(), BN = {};
    for (let i = 0; i < uids.length; i += 90) for (const r of await qAll(env.DB.prepare('SELECT uid, name, tg_chat FROM student WHERE uid IN (' + uids.slice(i, i + 90).map(() => '?').join(',') + ')').bind(...uids.slice(i, i + 90)))) SN[r.uid] = r;
    for (let i = 0; i < chats.length; i += 90) for (const r of await qAll(env.DB.prepare('SELECT chat, name, username FROM tg_user WHERE chat IN (' + chats.slice(i, i + 90).map(() => '?').join(',') + ')').bind(...chats.slice(i, i + 90)))) TN[r.chat] = r;
    if (!W.modr) for (const r of await qAll(env.DB.prepare('SELECT DISTINCT k FROM efir_lead WHERE efir_id=? UNION SELECT DISTINCT k FROM ev_form WHERE efir_id=?').bind(e.id, e.id))) LD.add(r.k);
    for (const r of await qAll(env.DB.prepare('SELECT k, kind FROM efir_ban WHERE efir_id=?').bind(e.id))) BN[r.k] = BN[r.k] === 'kick' ? 'kick' : r.kind;
    return json(req, { ok: true, n: L.length, people: L.map(x => { const u0 = x.k[0] === 'u' ? SN[+x.k.slice(1)] : null, t0 = x.k[0] === 't' ? TN[x.k.slice(1)] : null, nm = x.name || (u0 && u0.name) || (t0 && t0.name) || '';
      return { k: x.k, name: nm || ('Гость ' + x.k.replace(/\D/g, '').slice(-4)), mark: LD.has(x.k) ? 'lead' : x.k[0] === 'u' ? 'stu' : '', min: x.min | 0, dm: W.modr ? 0 : (x.k[0] === 't' || (u0 && u0.tg_chat) ? 1 : 0), ban: BN[x.k] || null } }) }) }
  /* 07.11 Э5: «Запретить писать в чат» (mute), «Убрать из эфира» (kick) — по k, chat и uid до конца эфира и записи */
  if (path === '/efir/host/ban' && req.method === 'POST') { await ef2Ensure(env); const k = String(o.k || ''), kind = o.kind === 'kick' ? 'kick' : 'mute'; if (!/^[utw][\w.-]{1,40}$/.test(k)) return json(req, { ok: false, err: 'Зритель не найден' }, 400);
    if (o.on === 0 || o.on === '0') await env.DB.prepare('DELETE FROM efir_ban WHERE efir_id=? AND k=? AND kind=?').bind(e.id, k, kind).run();
    else { const chat = await efKeyChat(env, k); await env.DB.prepare('INSERT OR REPLACE INTO efir_ban (efir_id, k, chat, uid, kind, by, at) VALUES (?,?,?,?,?,?,?)').bind(e.id, k, chat, k[0] === 'u' ? +k.slice(1) : null, kind, String(W.uid || W.me), now).run() }
    await logIt(env, 'efir-ban', W.uid, e.id + ' ' + kind + ' ' + k + (o.on === 0 || o.on === '0' ? ' off' : '')); return json(req, { ok: true }) }
  /* 07.11 Э5: «Написать в личку бота» — только админ и ведущий (модератору 403, §0.3) */
  if (path === '/efir/host/dm' && req.method === 'POST') { if (W.modr) return json(req, { ok: false, err: 'Модератору личка бота закрыта' }, 403); const k = String(o.k || ''), text = bStr(o.text, 1000); if (!text) return json(req, { ok: false, err: 'Напиши сообщение' }, 400);
    const chat = /^[ut]/.test(k) ? await efKeyChat(env, k) : null; if (!chat) return json(req, { ok: false, err: 'У этого зрителя нет Telegram — написать нельзя' }, 400);
    const j = await tgSend(env, chat, th(text)).catch(() => null); await logIt(env, 'efir-dm', W.uid, e.id + ' ' + k); return json(req, j && j.ok ? { ok: true } : { ok: false, err: 'Telegram не принял сообщение — возможно, бот заблокирован' }) }
  /* статистика: регистрации, пришли, досмотрели, заявки, удержание (по 5 мин из интервалов присутствия), вопросы; у автовебинара — по сеансам и версиям сценария */
  if (path === '/efir/host/stats') { const [rg, sn, ld, qn, pt] = await env.DB.batch([env.DB.prepare('SELECT COUNT(*) n, SUM(CASE WHEN sess>0 THEN 1 ELSE 0 END) a FROM efir_reg WHERE efir_id=?').bind(e.id),
      env.DB.prepare('SELECT k, sess, t0, scen, min, first, last, maxsec, rec_max, rec_done FROM efir_seen WHERE efir_id=?').bind(e.id), env.DB.prepare('SELECT sess, COUNT(*) n FROM efir_lead WHERE efir_id=? GROUP BY sess').bind(e.id),
      env.DB.prepare("SELECT kind, COUNT(*) n FROM efir_msg WHERE efir_id=? AND role='stu' GROUP BY kind").bind(e.id), env.DB.prepare('SELECT kind, COUNT(*) n, SUM(pts) p FROM efir_pts WHERE efir_id=? GROUP BY kind').bind(e.id)]);
    const SN = (sn.results || []).filter(x => x.sess >= 0), RC = (sn.results || []).filter(x => x.sess === -1), D = e.kind !== 'auto' && e.at_live && e.at_end && e.at_end > e.at_live ? Math.max(300, Math.round((e.at_end - e.at_live) / 1000)) : (e.dur || 60) * 60 /* 04.11: прошедший эфир — шкала по фактической длительности */, B = Math.ceil(D / 300), ret = new Array(B).fill(0);
    for (const x of SN) { const a = Math.max(0, Math.floor(((x.first || 0) - (x.t0 || x.first || 0)) / 1000)), b = Math.max(a, x.maxsec || Math.floor(((x.last || 0) - (x.t0 || x.first || 0)) / 1000)); for (let i = Math.floor(a / 300); i <= Math.min(B - 1, Math.floor(b / 300)); i++) ret[i]++ }
    const came = new Set(SN.map(x => x.k)).size, done = SN.filter(x => (x.maxsec || 0) >= D * 0.8).length, leads = (ld.results || []).reduce((s, x) => s + x.n, 0), Q = {}; for (const x of qn.results || []) Q[x.kind] = x.n;
    let lsec = null; if (e.kind === 'auto') { const sc = await efScen(env, cfg.scen); const l = sc && sc.items.find(x => x.t === 'lead'); lsec = l ? l.sec : null } else { const l = await env.DB.prepare("SELECT MIN(sec) s FROM efir_ev WHERE efir_id=? AND kind='lead'").bind(e.id).first(); lsec = l && l.s }
    const out = { ok: true, efir: efPub(e, now), regs: ((rg.results || [])[0] || {}).n || 0, came, avg_min: SN.length ? Math.round(SN.reduce((s, x) => s + (x.min || 0), 0) / SN.length) : 0, done, to_lead: lsec != null ? SN.filter(x => (x.maxsec || 0) >= lsec).length : null, lead_sec: lsec, leads,
      msgs: Q.msg || 0, qs: Q.q || 0, works: Q.work || 0, rec_views: RC.length, rec_done: RC.filter(x => x.rec_done).length, retention: ret.map((n, i) => ({ min: i * 5, n })), pts: pt.results || [] };
    /* 04.11 (Роман): список, кто был на эфире и кто смотрел запись — имя, минуты в эфире, досмотр записи */
    { const V = {}; for (const x of sn.results || []) { const v = V[x.k] = V[x.k] || { k: x.k, min: 0, first: null, live: 0, rec: 0, rec_done: 0 };
        if (x.sess >= 0) { v.live = 1; v.min = Math.max(v.min, x.min || 0); if (x.first && (!v.first || x.first < v.first)) v.first = x.first } else { v.rec = Math.max(v.rec, x.rec_max || 0); if (x.rec_done) v.rec_done = 1; if (!v.first && x.first) v.first = x.first } }
      const L = Object.values(V); let D2 = null; try { D2 = await loadData(env) } catch (x) {} const byU = {}; for (const r of (D2 && D2.rows) || []) if (r.uid != null) byU[+r.uid] = r;
      const uids = L.filter(v => v.k[0] === 'u').map(v => +v.k.slice(1)), chats = L.filter(v => v.k[0] === 't').map(v => v.k.slice(1)), SNm = {}, TNm = {};
      if (uids.length) for (const r of await qAll(env.DB.prepare('SELECT uid, name, curator FROM student WHERE uid IN (' + uids.slice(0, 300).map(() => '?').join(',') + ')').bind(...uids.slice(0, 300)))) SNm[r.uid] = r;
      if (chats.length) for (const r of await qAll(env.DB.prepare('SELECT chat, username, name FROM tg_user WHERE chat IN (' + chats.slice(0, 300).map(() => '?').join(',') + ')').bind(...chats.slice(0, 300)))) TNm[r.chat] = r;
      out.visitors = L.map(v => { const u = v.k[0] === 'u' ? +v.k.slice(1) : null, r = u ? byU[u] : null, st = u ? SNm[u] : null, t = !u ? TNm[v.k.slice(1)] : null;
        return { uid: u, name: (r && r.name) || (st && st.name) || (t && (t.name || (t.username ? '@' + t.username : ''))) || (u ? 'id ' + u : 'Гость'), staff: u ? isStaffUid(env, u) : false, cur: st && st.curator || null, place: r && r.place || null, live: v.live, min: v.min, rec: v.rec, rec_done: v.rec_done, first: v.first } })
        .sort((a2, b2) => (b2.live - a2.live) || (b2.min - a2.min) || (b2.rec - a2.rec)).slice(0, 300) }
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
/* 04.11 (Роман): сцена — комната Kinescope Speak (своя на каждый эфир, создаётся при первом обращении; kv speak:<id>). Ведущий держит окно Speak в OBS — гость попадает в трансляцию.
   Нет ключа / API не дал комнату — запасной Jitsi, как раньше. Ошибку запоминаем на 10 минут, чтобы не долбить API на каждом опросе. */
const SPK = {};
/* владелец комнат: env.SPEAK_OWNER или kv speak_owner — uuid пользователя Kinescope из GET /v1/users (аккаунт Романа) */
async function spkOwner(env) { if (env.SPEAK_OWNER) return env.SPEAK_OWNER; const k = await kvGet(env, 'speak_owner'); if (k) return k;
  try { const r = await fetch(KIN_API + '/v1/users', { headers: { Authorization: 'Bearer ' + env.KINESCOPE_KEY } }); const j = await r.json(); const L = (j && j.data) || []; const o = Array.isArray(L) && L.length && L[0].id; if (o) { await kvPut(env, 'speak_owner', o); return o } } catch (e) {} return undefined }
async function efSpeak(env, e, force) { if (!env.KINESCOPE_KEY) return null; if (!force && SPK[e.id]) return SPK[e.id]; const kk = 'speak:' + e.id, kv = await kvGet(env, kk);
  if (!force && kv && kv.link) return SPK[e.id] = kv.link; if (!force && kv && kv.err && msNow() - kv.at < 10 * 6e4) return null;
  const r = await fetch(KIN_API + '/v1/speak/rooms', { method: 'POST', headers: { Authorization: 'Bearer ' + env.KINESCOPE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: ('Эфир · ' + String(e.title || e.id)).slice(0, 90), type: 'permanent_meeting', owner_id: await spkOwner(env), waiting_room: false }) });
  const t = await r.text(); let j = null; try { j = JSON.parse(t) } catch (x) {} const d = j && (j.data || j), link = d && (d.link || (d.code ? 'https://speak.kinescope.io/' + d.code : null));
  if (!r.ok || !link || !/^https:\/\//.test(link)) { await kvPut(env, kk, { err: r.status, msg: String(t).slice(0, 300), at: msNow() }); return force ? { err: r.status, msg: String(t).slice(0, 300) } : null }
  await kvPut(env, kk, { id: d.id || null, link, at: msNow() }); return SPK[e.id] = link }
const efStageUrl = async (env, e, cfg) => cfg.stage_url || (await efSpeak(env, e).catch(() => null)) || ('https://meet.jit.si/OduvanovSchool-efir' + e.id + '-' + (await hmacHex(env, 'stage|' + e.id)).slice(0, 10));
const efEditCfg = e => { const c = efJ(e.cfg, {}); return { stage: c.stage || 0, stage_url: c.stage_url || '', work: c.work === 0 ? 0 : 1, label: c.label || 0, lead: c.lead || null, sched: c.sched || null, scen: c.scen || null, uids: c.uids || [], rec_days: c.rec_days || 0, room: c.room ? 1 : 0 } };
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
  /* 07.11 Эфиры Э0 (§6.4 Nav): счётчик новых заявок в меню раздела. До Э5 (колонка mgr_st ещё не заполнена) — по старому efir_lead.st='new' */
  if (path === '/efir/leads/count') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); await ef2Ensure(env);
    const r = await env.DB.prepare("SELECT COUNT(*) n FROM efir_lead WHERE COALESCE(mgr_st, st)='new' AND COALESCE(pay_st,'')<>'paid' AND NOT (order_num IS NULL AND order_err IS NOT NULL)").first(); /* 07.11 Э6: как вкладка «Новые» в 5.2 — без оплаченных и ошибок заказа */ return json(req, { ok: true, n: (r && r.n) || 0 }) }
  /* 07.11 Э6 (5.2): новая лента заявок (v=2) и выгрузка CSV; без v — старый ответ для старого экрана заявок */
  if (path === '/efir/leads' && req.method === 'GET' && u.searchParams.get('v') === '2') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); await ef2Ensure(env); return json(req, await ef6Leads(env, u), 200, { 'Cache-Control': 'no-store' }) }
  if (path === '/efir/leads.csv') { if (!W.adm) return json(req, { ok: false, err: 'Только админ' }, 403); await ef2Ensure(env); const csv = await ef6LeadsCsv(env, u), nm = 'zayavki-' + msk(new Date(msNow())).toISOString().slice(0, 10) + '.csv';
    await logIt(env, 'efir-leads-csv', W.uid || 0, String(u.searchParams.get('ev') || 'all'));
    if (u.searchParams.get('json')) return json(req, { ok: true, name: nm, csv }, 200, { 'Cache-Control': 'no-store' });
    return new Response(csv, { headers: Object.assign({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + nm + '"', 'Cache-Control': 'no-store' }, cors(req)) }) }
  if (path === '/efir/leads') { if (req.method === 'POST') { const c = { chats: (Array.isArray(o.chats) ? o.chats : String(o.chats || '').split(/[\s,;]+/)).map(x => String(x).trim()).filter(x => /^-?\d{3,20}$/.test(x)).slice(0, 5) }; await kvPut(env, 'efir_leads', c); return json(req, { ok: true, cfg: c }) }
    return json(req, { ok: true, cfg: (await kvGet(env, 'efir_leads')) || {}, leads: await qAll(env.DB.prepare('SELECT l.*, e.title FROM efir_lead l LEFT JOIN efir e ON e.id=l.efir_id ORDER BY l.id DESC LIMIT 200')) }) }
  return json(req, { ok: false, err: 'not found' }, 404) }
const EFIR_SCEN_API = ['/efir/scen', '/efir/mod', '/efir/leads', '/efir/leads/count', '/efir/leads.csv'];

/* ---------- эфиры в боте: /start e<id> (запись, в т.ч. не-учеников), напоминания за сутки / за час / при старте (cron, учитывает «Уведомления» → Эфиры) ---------- */
async function efLink(env, e, k) { return k[0] === 't' ? 'https://romanoduvanov.github.io/otzyvy/gc/efir.html?id=' + e.id + '&r=' + await efGuestTok(env, k.slice(1)) : maLink(env, 'e' + e.id) }
async function efStart(env, chat, id, from) { await efirEnsure(env); if (from) await saveTgUser(env, from); const e = await efGet(env, id), now = msNow();
  if (e && efJ(e.cfg, {}).ev) return evStart(env, chat, +efJ(e.cfg, {}).ev, from);
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
  for (const r of regs) { if (!B.ok(1) || out.sent >= 25) break; const e = E.find(x => x.id === r.efir_id), at = e.kind === 'auto' ? r.sess : e.start; if (!at) continue; if (efJ(e.cfg, {}).ev) continue; /* 06.11: эфиры мероприятий напоминает воронка мероприятия */
    if (e.kind !== 'auto' && e.kind !== 'open' && Object.keys(efJ(e.cfg, {}).bcp || {}).length && r.uid) continue; /* 06.11: ученикам напоминают рассылки эфира (efPlanSync) */ const left = at - now, rem = r.rem || '';
    const ph = left <= 5 * 6e4 && left > -30 * 6e4 ? 's' : left > 0 && left <= 70 * 6e4 ? 'h' : left >= 23 * 36e5 && left <= 25 * 36e5 ? 'd' : ''; if (!ph || rem.includes(ph)) continue;
    const nrem = rem + (ph === 's' ? 'dhs' : ph === 'h' ? 'dh' : 'd'); marks.push(env.DB.prepare('UPDATE efir_reg SET rem=? WHERE efir_id=? AND k=?').bind([...new Set(nrem)].join(''), r.efir_id, r.k));
    let nf = NOTIF_DEF; try { nf = Object.assign({}, NOTIF_DEF, JSON.parse(r.nf || '{}')) } catch (x) {} if (r.uid && !nf.efir) continue;
    const chat = r.k[0] === 't' ? r.k.slice(1) : (r.tg_chat || r.chat); if (!chat) continue; const h = efHost(e);
    const t = ph === 's' ? '🔴 <b>' + nbt('Эфир начинается') + '</b>\n«' + th(e.title) + '» · ' + th(h.name) + '\n' + nbt('Заходи — ' + (e.kind === 'auto' ? 'смотри с самого начала.' : 'чат и вопросы уже открыты.'))
      : ph === 'h' ? '⏰ <b>' + nbt('Через час эфир') + '</b>\n«' + th(e.title) + '» · ' + efHM(at) + NB + 'МСК' + (e.kind !== 'auto' && efJ(e.cfg, {}).work !== 0 && r.uid ? '\n' + nbt('Можно прислать работу на разбор прямо на странице эфира.') : '')
      : '📅 <b>' + nbt('Завтра эфир') + '</b>\n«' + th(e.title) + '» · ' + efWhen(at) + '\n' + th(h.name);
    B.use(1); const j = await tgSend(env, chat, t, [[{ text: ph === 's' ? '▶ Открыть эфир' : 'Страница эфира', url: await efLink(env, e, r.k) }]]); if (j && j.ok) out.sent++ }
  if (marks.length) await env.DB.batch(marks); return out }

/* ===== 06.11 (Роман): «Мероприятие» открытых эфиров — один эфир или марафон из нескольких дней. Одна регистрация на всё (бот /start v<id> или сайт по имени),
   воронка бота (шаги: сразу после регистрации, перед каждым эфиром, в момент старта, после эфира — всем / кто был / кто не пришёл, через N дней после),
   у шага свой текст, кнопки и картинка. Заявка в эфире — форма (имя, телефон, почта, Telegram) → «Заявки» в пульте + заказ в GetCourse на продукт мероприятия, без уведомлений менеджерам.
   Напоминания эфиров мероприятия шлёт только воронка (efirJob их пропускает). ===== */
const EV_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS efir_event (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, about TEXT, cover TEXT, offer TEXT, funnel TEXT, del INTEGER DEFAULT 0, created INTEGER, upd INTEGER)',
  'CREATE TABLE IF NOT EXISTS ev_reg (ev_id INTEGER NOT NULL, k TEXT NOT NULL, uid INTEGER, chat TEXT, name TEXT, src TEXT, at INTEGER, PRIMARY KEY (ev_id, k))',
  'CREATE INDEX IF NOT EXISTS ev_reg_at ON ev_reg (ev_id, at)',
  'CREATE TABLE IF NOT EXISTS ev_sent (ev_id INTEGER NOT NULL, step TEXT NOT NULL, efir_id INTEGER NOT NULL DEFAULT 0, k TEXT NOT NULL, ok INTEGER, at INTEGER, PRIMARY KEY (ev_id, step, efir_id, k))'];
let EV_OK = false;
async function evEnsure(env) { await efirEnsure(env); if (EV_OK) return; await env.DB.batch(EV_SCHEMA.map(s => env.DB.prepare(s))); EV_OK = true }
/* ===== 07.11 «Эфиры 2.0», этап Э0 (docs/plan/efiry-tz.md v6 §2): новые таблицы и колонки — лениво, как efirEnsure/evEnsure. Старые колонки не удаляем.
   Вызывается только из новых маршрутов (/efir/host/me, /efir/host/ui2, /efir/leads/count) и маршрутов следующих этапов — поведение существующих не меняется.
   Миграция Э0: у каждого мероприятия — метки «Основная» ('') и «Сайт» (site) в ev_src (INSERT OR IGNORE — повторный запуск ничего не портит; test зарезервирован). ===== */
const EF2_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS ev_src (ev_id INTEGER NOT NULL, code TEXT NOT NULL, title TEXT, at INTEGER, PRIMARY KEY (ev_id, code))',
  'CREATE TABLE IF NOT EXISTS ev_mat (id INTEGER PRIMARY KEY AUTOINCREMENT, ev_id INTEGER NOT NULL, kind TEXT, data TEXT, days TEXT, ord INTEGER DEFAULT 0, del INTEGER DEFAULT 0, at INTEGER)',
  'CREATE INDEX IF NOT EXISTS ev_mat_ev ON ev_mat (ev_id, del, ord)',
  'CREATE TABLE IF NOT EXISTS ev_mat_log (id INTEGER PRIMARY KEY AUTOINCREMENT, efir_id INTEGER NOT NULL, mat_id INTEGER, kind TEXT, sec_on INTEGER, sec_off INTEGER, at_on INTEGER, at_off INTEGER, clicks INTEGER DEFAULT 0, leads INTEGER DEFAULT 0)',
  'CREATE INDEX IF NOT EXISTS ev_mat_log_e ON ev_mat_log (efir_id, mat_id)',
  'CREATE TABLE IF NOT EXISTS ev_mat_click (log_id INTEGER NOT NULL, k TEXT NOT NULL, PRIMARY KEY (log_id, k))',
  "CREATE TABLE IF NOT EXISTS ev_form (id INTEGER PRIMARY KEY AUTOINCREMENT, ev_id INTEGER NOT NULL, efir_id INTEGER, k TEXT, uid INTEGER, chat TEXT, name TEXT, phone TEXT, email TEXT, tg TEXT, answers TEXT, sec INTEGER, src TEXT, row_ok INTEGER DEFAULT 0, row_n INTEGER, sheet_st TEXT, st TEXT DEFAULT 'new', test INTEGER DEFAULT 0, outside INTEGER DEFAULT 0, at INTEGER, upd INTEGER)",
  'CREATE INDEX IF NOT EXISTS ev_form_ev ON ev_form (ev_id, at)',
  'CREATE TABLE IF NOT EXISTS ev_form_q (id INTEGER PRIMARY KEY AUTOINCREMENT, ev_id INTEGER NOT NULL, form_id INTEGER, sheet TEXT, payload TEXT, tries INTEGER DEFAULT 0, next_at INTEGER, err TEXT)',
  'CREATE INDEX IF NOT EXISTS ev_form_q_n ON ev_form_q (next_at)',
  "CREATE TABLE IF NOT EXISTS ev_bc (id INTEGER PRIMARY KEY AUTOINCREMENT, ev_id INTEGER NOT NULL, who TEXT, text TEXT, img TEXT, btns TEXT, at_plan INTEGER, at_sent INTEGER, n INTEGER DEFAULT 0, ok INTEGER DEFAULT 0, st TEXT DEFAULT 'plan')",
  'CREATE INDEX IF NOT EXISTS ev_bc_ev ON ev_bc (ev_id, st)',
  'CREATE TABLE IF NOT EXISTS ev_prod (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, price INTEGER, code TEXT, del INTEGER DEFAULT 0, at INTEGER)',
  'CREATE TABLE IF NOT EXISTS efir_ban (efir_id INTEGER NOT NULL, k TEXT NOT NULL, chat TEXT, uid INTEGER, kind TEXT NOT NULL, by TEXT, at INTEGER, PRIMARY KEY (efir_id, k, kind))',
  'CREATE TABLE IF NOT EXISTS efir_rev (efir_id INTEGER NOT NULL, mid INTEGER NOT NULL, at_on INTEGER, at_off INTEGER, sec_on INTEGER, PRIMARY KEY (efir_id, mid))',
  'CREATE TABLE IF NOT EXISTS efir_wait (efir_id INTEGER NOT NULL, k TEXT NOT NULL, first INTEGER, last INTEGER, PRIMARY KEY (efir_id, k))',
  'CREATE TABLE IF NOT EXISTS efir_pult (efir_id INTEGER NOT NULL, uid INTEGER NOT NULL, name TEXT, role TEXT, last INTEGER, PRIMARY KEY (efir_id, uid))',
  'CREATE TABLE IF NOT EXISTS bot_state (chat TEXT PRIMARY KEY, kind TEXT, ev_id INTEGER, step TEXT, src TEXT, at INTEGER)',
  /* §3.7: очередь сообщений бота (заполняется после Э0.П — включения Paid; до этого не используется) */
  "CREATE TABLE IF NOT EXISTS tg_q (id INTEGER PRIMARY KEY AUTOINCREMENT, job TEXT NOT NULL, pri INTEGER DEFAULT 2, chat TEXT, k TEXT NOT NULL, ev_id INTEGER, efir_id INTEGER, st TEXT DEFAULT 'q', tries INTEGER DEFAULT 0, next_at INTEGER, err TEXT, at INTEGER, sent_at INTEGER, UNIQUE (job, k))",
  'CREATE INDEX IF NOT EXISTS tg_q_st ON tg_q (st, pri, next_at)'];
/* новые колонки старых таблиц (§2.1, §2.2 «Дополнения»): добавляются, если их ещё нет; значения старых строк — миграциями своих этапов (§8, §10) */
const EF2_COLS = {
  efir_event: ['type TEXT', 'status TEXT', 'host TEXT', 'fmt TEXT', 'dur INTEGER', 'short TEXT', 'reg TEXT', 'sale TEXT', 'access TEXT', 'rec TEXT', 'steps TEXT', 'named INTEGER'], /* named — Э2: заголовок мастера «Новый марафон», пока не ушли с шага 1 */
  ev_reg: ['phone TEXT', 'email TEXT', 'src_code TEXT', 'gc_ok INTEGER', 'gc_uid INTEGER', 'test INTEGER DEFAULT 0'],
  efir_lead: ['phone TEXT', 'email TEXT', 'tg TEXT', 'order_id TEXT', 'order_num TEXT', 'order_err TEXT', 'pay_st TEXT', 'src TEXT', 'mat_id INTEGER', 'note TEXT', 'mgr_st TEXT', 'tries INTEGER DEFAULT 0', 'next_at INTEGER', 'ip TEXT', 'pay_sum REAL', 'pay_at INTEGER'], /* 07.11 Э6: сумма и время сверки оплаты (5.1, 5.2) */ /* 07.11 Э5: ip — хеш IP гостя (лимит §3.4) */
  efir_msg: ['title TEXT', 'note TEXT'],
  efir_pollv: ['opts TEXT'],
  bot_state: ['phone TEXT', 'test INTEGER DEFAULT 0'],
  ev_form: ['ip TEXT'],
  ev_bc: ['fail INTEGER DEFAULT 0', 'by_uid INTEGER', 'upd INTEGER'] }; /* 07.11 Э4: разовые 2.9 — неудачные отправки, кто создал */ /* 07.11 Э3: хеш IP анкеты гостя (защита от накрутки §3.4), стирается через 2 дня */ /* 07.11 Э1: телефон между шагами «номер» → «почта» и пометка тестовой регистрации */
let EF2_OK = false;
async function ef2Ensure(env) { await evEnsure(env); if (EF2_OK) return;
  await env.DB.batch(EF2_SCHEMA.map(s => env.DB.prepare(s)));
  const T = Object.keys(EF2_COLS), info = await env.DB.batch(T.map(t => env.DB.prepare('PRAGMA table_info(' + t + ')')));
  for (let i = 0; i < T.length; i++) { const have = new Set(((info[i] && info[i].results) || []).map(c => c.name));
    for (const c of EF2_COLS[T[i]]) if (!have.has(c.split(' ')[0])) await env.DB.prepare('ALTER TABLE ' + T[i] + ' ADD COLUMN ' + c).run().catch(e => { if (!/duplicate column/i.test(String(e && e.message))) throw e }) }
  const now = msNow();
  await env.DB.batch(['CREATE INDEX IF NOT EXISTS ev_reg_chat ON ev_reg (chat)', 'CREATE INDEX IF NOT EXISTS ev_reg_gc ON ev_reg (gc_ok, at) WHERE email IS NOT NULL',
    'CREATE INDEX IF NOT EXISTS efir_lead_ek ON efir_lead (efir_id, k)', 'CREATE INDEX IF NOT EXISTS efir_lead_rt ON efir_lead (next_at) WHERE next_at IS NOT NULL', 'CREATE INDEX IF NOT EXISTS efir_seen_l ON efir_seen (efir_id, sess, last)', 'CREATE INDEX IF NOT EXISTS efir_wait_l ON efir_wait (efir_id, last)'].map(q => env.DB.prepare(q))); /* 07.11 Э5: заявки по зрителю, повтор заказов, онлайн и ожидание за 90 с */
  await efLeadMigrate(env).catch(x => logIt(env, 'efir-lead-mig-err', 0, String(x && x.message || x).slice(0, 200))); /* 07.11 Э5: старые заявки → новые колонки (лениво, старые колонки не трогаем) */ /* 07.11 Э1: «знакомый» по chat, повтор GetCourse */
  await env.DB.batch([env.DB.prepare("INSERT OR IGNORE INTO ev_src (ev_id, code, title, at) SELECT id, '', 'Основная', ? FROM efir_event").bind(now),
    env.DB.prepare("INSERT OR IGNORE INTO ev_src (ev_id, code, title, at) SELECT id, 'site', 'Сайт', ? FROM efir_event").bind(now)]);
  EF2_OK = true }
/* флаг нового раздела (§8): kv efir_ui2 — список uid (сначала админы и efir_testers); пусто — у всех старые экраны */
async function efUi2(env, uid) { const L = await kvGet(env, 'efir_ui2'); return !!uid && Array.isArray(L) && L.map(String).includes(String(uid)) }
const EV_TRIG = ['reg', 'before', 'start', 'after', 'days'];
const evFunnelDef = () => [
  { id: 'r0', on: 'reg', min: 0, text: '✅ {имя}, ты записан на «{мероприятие}»!\n\n{расписание}\n\nНапомню перед эфиром — просто жди сообщение здесь.', btns: [{ t: 'Страница эфира', u: '{эфир}' }] },
  { id: 'b1', on: 'before', min: 1440, text: '📅 Завтра в {время} — эфир «{эфир_тема}». Поставь напоминание, чтобы не пропустить.', btns: [{ t: 'Страница эфира', u: '{эфир}' }] },
  { id: 'b2', on: 'before', min: 60, text: '⏰ Через час, в {время}, — эфир «{эфир_тема}». Приходи, будет полезно!', btns: [{ t: 'Страница эфира', u: '{эфир}' }] },
  { id: 's0', on: 'start', min: 0, text: '🔴 Начинаем! Эфир «{эфир_тема}» уже идёт — заходи.', btns: [{ t: '▶ Открыть эфир', u: '{эфир}' }] }];
function evSteps(ev) { const f = efJ(ev && ev.funnel, null); return (Array.isArray(f) ? f : evFunnelDef()).filter(s => s && EV_TRIG.includes(s.on)) }
/* 07.11 Э4 (§6.4 2.5, 2.5а, §10): у шага ещё title (заголовок в ленте), off (выключен), off_mode/off0 (выключен режимом «Без продаж», прежнее вкл/выкл), std (из готового набора, не правили),
   who у «после марафона» — nolead | noform | formopen; id шагов не меняются (ev_sent) */
const EV_WHO = ['all', 'came', 'miss', 'nolead', 'noform', 'formopen'];
function evClean(steps) { return (Array.isArray(steps) ? steps : []).slice(0, 30).map((s, i) => { const on = EV_TRIG.includes(s.on) ? s.on : 'reg', o = { id: /^[a-z0-9]{1,12}$/.test(String(s.id || '')) ? String(s.id) : 'x' + Date.now().toString(36).slice(-5) + i, on,
  min: Math.max(0, Math.min(60 * 24 * 60, +s.min | 0)), who: (on === 'days' ? EV_WHO : ['all', 'came', 'miss']).includes(s.who) ? s.who : 'all', text: bStr(String(s.text || ''), 3500), img: /^https:\/\/[^\s"'<>]+$/.test(s.img || '') ? bStr(s.img, 400) : null,
  btns: (Array.isArray(s.btns) ? s.btns : []).map(b => ({ t: bStr(b && b.t, 40), u: bStr(b && b.u, 500) })).filter(b => b.t && (/^https:\/\//.test(b.u) || /^\{(эфир|мероприятие)\}$/.test(b.u))).slice(0, 5) };
  if (bStr(s.title, 60)) o.title = bStr(s.title, 60); if (s.off) o.off = 1; if (s.off_mode) { o.off_mode = 1; o.off0 = s.off0 ? 1 : 0 } if (s.std) o.std = 1; return o }).filter(s => s.text.trim()) }
const evOn = ev => evSteps(ev).filter(s => !s.off); /* включённые шаги — их и шлёт бот */
async function evGet(env, id) { return +id ? env.DB.prepare('SELECT * FROM efir_event WHERE id=? AND del=0').bind(+id).first() : null }
async function evEfirs(env, id) { return qAll(env.DB.prepare("SELECT * FROM efir WHERE del=0 AND kind='open' AND status NOT IN ('draft','cancel') AND CAST(json_extract(cfg, '$.ev') AS INTEGER)=? ORDER BY start").bind(+id)) }
const evLink = id => 'https://oduvanovschool.pro/efir?ev=' + id;
/* запись на мероприятие: ev_reg + запись на каждый его эфир (для «Мои напоминания», статистики «кто зарегистрирован») */
async function evRegister(env, ev, W, x) { x = x || {}; await ef2Ensure(env); const now = msNow(), E = await evEfirs(env, ev.id);
  /* 07.11 Э1 (ТЗ §2.2, §2.4, §4.7, §4.10): телефон, почта, метка (src_code: из бота — код ссылки, с сайта — 'site', из приложения — '' = «Основная»), test — `_test` или мероприятие в draft/test;
     тестовые не в счётчиках: в efir_reg (счётчики эфира, сводка) не пишутся. gc_ok: 1 — в GetCourse, 0 — нет почты, NULL — ждёт импорта, −N — N неудачных попыток */
  const test = x.test || ev.status === 'test' || ev.status === 'draft' ? 1 : 0, code = x.src_code != null ? String(x.src_code) : x.src === 'web' ? 'site' : '', em = x.email || null;
  const r = await env.DB.prepare('INSERT INTO ev_reg (ev_id, k, uid, chat, name, src, at, phone, email, src_code, gc_ok, test) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(ev_id, k) DO UPDATE SET chat=COALESCE(excluded.chat, ev_reg.chat), uid=COALESCE(excluded.uid, ev_reg.uid), phone=COALESCE(excluded.phone, ev_reg.phone), email=COALESCE(excluded.email, ev_reg.email) RETURNING at')
    .bind(ev.id, W.k, W.uid || null, x.chat || W.chat || null, bStr(x.name || '', 60) || null, bStr(x.src || 'app', 20), now, x.phone || null, em, bStr(code, 24), em ? null : 0, test).first();
  const q = test ? [] : E.filter(e => !['done', 'rec'].includes(e.status)).map(e => env.DB.prepare("INSERT INTO efir_reg (efir_id, k, uid, chat, name, sess, src, at, rem) VALUES (?,?,?,?,?,0,?,?,'dhs') ON CONFLICT(efir_id, k) DO UPDATE SET chat=COALESCE(excluded.chat, efir_reg.chat)").bind(e.id, W.k, W.uid || null, x.chat || W.chat || null, bStr(x.name || '', 60) || null, bStr(x.src || 'app', 20), now));
  if (q.length) await env.DB.batch(q); await logIt(env, 'ev-reg', W.uid || 0, ev.id + ' ' + W.k + ' ' + (x.src || '') + (code ? ' ' + code : '') + (test ? ' test' : '') + (x.phone ? ' tel' : '') + (em ? ' mail' : '')); /* в лог — только есть ли телефон/почта, не они сами */
  return { fresh: !!(r && r.at === now), E } }
/* подстановки: {имя} {мероприятие} {эфир_тема} {время} {расписание}; кнопка {эфир} — личная ссылка на нужный эфир, {мероприятие} — страница мероприятия */
function evNext(E, now) { return E.find(e => e.status === 'live') || E.find(e => e.status === 'plan' && (e.start || 0) > now - 3 * 36e5) || E[E.length - 1] || null }
async function evRender(env, ev, E, e, s, R) { const now = msNow(), nm = firstName(R.name) || 'привет';
  const sch = E.map(x => '• ' + efWhen(x.start) + ' — ' + x.title).join('\n') || '';
  const txt = String(s.text || '').replace(/\{имя\}/g, nm).replace(/\{мероприятие\}/g, ev.title || '').replace(/\{эфир_тема\}/g, e ? e.title : ev.title || '').replace(/\{время\}/g, e && e.start ? efHM(e.start) + NB + 'МСК' : '').replace(/\{дата\}/g, e && e.start ? efWhen(e.start) : '').replace(/\{расписание\}/g, sch);
  const kb = []; for (const b of s.btns || []) { let u = b.u; if (u === '{эфир}') u = e ? await efLink(env, e, R.k) : evLink(ev.id); else if (u === '{мероприятие}') { const n0 = evNext(E, now); u = n0 ? await efLink(env, n0, R.k) : evLink(ev.id) } /* 07.11 Э4 (§6.4 2.5а): «Страница марафона» — личная ссылка в комнату ближайшего или идущего дня */ if (/^https:\/\//.test(u)) kb.push([{ text: b.t, url: u }]) }
  return { text: th(txt), kb: kb.length ? kb : undefined } }
async function evSend(env, chat, m, img) { if (img) { const cap = m.text.length <= 1000; const j = await tg(env, 'sendPhoto', { chat_id: chat, photo: img, ...(cap ? { caption: m.text, parse_mode: 'HTML', ...(m.kb ? { reply_markup: { inline_keyboard: m.kb } } : {}) } : {}) }); if (cap || !(j && j.ok)) return cap ? j : tgSend(env, chat, m.text, m.kb) }
  return tgSend(env, chat, m.text, m.kb) }
/* раз в минуту: какие шаги «созрели». Окна узкие — не перебираем всех зарегистрированных без нужды (D1) */
async function evTick(env, only) { await evEnsure(env); const now = msNow(), out = { sent: 0, fail: 0 }, LIM = only ? 10 : 30;
  const EVS = only ? [only.ev] : await qAll(env.DB.prepare('SELECT * FROM efir_event WHERE del=0 AND created>?').bind(now - 180 * 864e5));
  for (const ev of EVS) { if (out.sent + out.fail >= LIM) break; const steps = evOn(ev); if (!steps.length) continue; const E = await evEfirs(env, ev.id);
    const jobs = []; for (const s of steps) { const m = (s.min | 0) * 6e4;
      if (s.on === 'reg') jobs.push({ s, e: null, sql: 'r.at<=? AND r.at>?', b: [now - m, now - m - 6 * 36e5] });
      else if (s.on === 'before') for (const e of E) { const due = (e.start || 0) - m; if (e.status === 'plan' && due <= now && now < due + 20 * 6e4 && e.start > now) jobs.push({ s, e }) }
      else if (s.on === 'start') for (const e of E) { if (e.status === 'live' && now - (e.at_live || e.start || 0) < 30 * 6e4) jobs.push({ s, e }) }
      else if (s.on === 'after') for (const e of E) { const due = (e.at_end || 0) + m; if (['done', 'rec'].includes(e.status) && e.at_end && due <= now && now < due + 6 * 36e5) jobs.push({ s, e }) }
      else if (s.on === 'days') { if (!E.length || E.some(e => !['done', 'rec'].includes(e.status))) continue; const last = Math.max(...E.map(e => e.at_end || e.start || 0)), due = last + m; if (due <= now && now < due + 6 * 36e5) jobs.push({ s, e: null }) } }
    for (const J of jobs) { if (out.sent + out.fail >= LIM) break; const eid = J.e ? J.e.id : 0, ids = J.e ? [J.e.id] : E.map(x => x.id);
      const came = ids.length ? '(SELECT COUNT(*) FROM efir_seen z WHERE z.k=r.k AND z.efir_id IN (' + ids.join(',') + '))' : '0';
      const idl = ids.length ? ids.join(',') : '0', who = J.s.on === 'after' || J.s.on === 'days' ? (J.s.who === 'came' ? ' AND ' + came + '>0' : J.s.who === 'miss' ? ' AND ' + came + '=0'
        /* 07.11 Э4: фильтры дожима по режиму продаж (§6.4 2.5а) */
        : J.s.on === 'days' && J.s.who === 'nolead' ? ' AND NOT EXISTS (SELECT 1 FROM efir_lead l WHERE l.k=r.k AND l.efir_id IN (' + idl + '))'
        : J.s.on === 'days' && J.s.who === 'noform' ? ' AND NOT EXISTS (SELECT 1 FROM ev_form f WHERE f.ev_id=r.ev_id AND f.k=r.k)'
        : J.s.on === 'days' && J.s.who === 'formopen' ? " AND EXISTS (SELECT 1 FROM efir_ev z2 WHERE z2.kind='fopen' AND z2.data=r.k AND z2.efir_id IN (" + idl + ')) AND NOT EXISTS (SELECT 1 FROM ev_form f WHERE f.ev_id=r.ev_id AND f.k=r.k)' : '') : '';
      const R = await qAll(env.DB.prepare('SELECT r.*, s.tg_chat FROM ev_reg r LEFT JOIN student s ON s.uid=r.uid WHERE r.ev_id=?' + (only ? ' AND r.k=?' : '') + (J.sql ? ' AND ' + J.sql : '') + who + ' AND NOT EXISTS (SELECT 1 FROM ev_sent x WHERE x.ev_id=r.ev_id AND x.step=? AND x.efir_id=? AND x.k=r.k) LIMIT ?')
        .bind(ev.id, ...(only ? [only.k] : []), ...(J.b || []), J.s.id, eid, LIM - out.sent - out.fail));
      for (const r of R) { const chat = r.chat || r.tg_chat || (r.k[0] === 't' ? r.k.slice(1) : null);
        const ins = await env.DB.prepare('INSERT OR IGNORE INTO ev_sent (ev_id, step, efir_id, k, ok, at) VALUES (?,?,?,?,?,?)').bind(ev.id, J.s.id, eid, r.k, chat ? 1 : 0, now).run(); if (!ins.meta || !ins.meta.changes || !chat) continue;
        const e = J.e || evNext(E, now), m = await evRender(env, ev, E, e, J.s, r), j = await evSend(env, chat, m, J.s.img).catch(() => null); if (j && j.ok) out.sent++; else out.fail++ } } }
  if (!only && out.sent + out.fail < LIM) await ev4BcTick(env, out, LIM); /* 07.11 Э4: разовые 2.9 — старой очередью до Paid (§0.1.8, §3.7.6) */
  if (out.sent || out.fail) await logIt(env, 'ev-tick', 0, JSON.stringify(out)); return out }
/* ===== 07.11 «Эфиры 2.0», этап Э1 (docs/plan/efiry-tz.md v6 §4): регистрация через бота с телефоном, почтой и метками.
   /start v<id>[_<код>] (EV_START_RE), /start e<id> эфира мероприятия → evStart. Мероприятие без настроек `reg` (все старые) — как раньше: одно сообщение, без телефона и почты.
   С `reg` (новые мероприятия, EV_REG_NEW): приветствие + согласие (§4.4) → «Поделиться номером» (request_contact, только свой контакт) → почта (проверка опечаток, «Пропустить» при skip_email)
   → ev_reg (phone, email, src_code, test) → шаг воронки `reg`. Знакомый (ученик или уже давал телефон) шаги пропускает. Состояние диалога — bot_state.
   Статусы: draft / test — только команде и efir_testers (запись test=1), `_test` — test=1. GetCourse: почта есть — gcImport users с телефоном и группой reg.gc_group, сразу и повтором в фоне (evGcTick).
   Телефон и почта — только в D1 и GetCourse; в лог — маской (mPhone, mMail, mPII). ===== */
const EV_START_RE = /^v(\d{1,9})(?:_([a-z0-9]{1,24}))?$/;
const EV_REG_NEW = { phone: 1, email: 1, skip_email: 0 }; /* у нового мероприятия (доска M3: телефон — да, почта — да, «можно пропустить» — нет); тексты — по умолчанию, evRegCfg */
const EV_PRIVACY = 'https://oduvanovroman.getcourse.ru/privacypolicy', EV_BTN = '📱 Поделиться номером';
/* настройки регистрации с текстами по умолчанию (дословно с доски M3); null — регистрация по-старому */
function evRegCfg(ev, E) { const R = efJ(ev && ev.reg, null); if (!R || typeof R !== 'object') return null;
  const mar = (ev.type || ((E || []).length > 1 ? 'mar' : 'web')) === 'mar', g = R.greet || {}, a = R.ask_email || {}, phone = R.phone === 0 || R.phone === false ? 0 : 1;
  return { phone, email: R.email === 0 || R.email === false ? 0 : 1, skip_email: R.skip_email ? 1 : 0,
    greet: { text: bStr(g.text, 1500) || 'Привет! Это запись на бесплатный ' + (mar ? 'марафон' : 'вебинар') + ' «' + ev.title + '».' + (phone ? ' Поделись номером — так мы не потеряем тебя, если Telegram глючит.' : ''), btn: bStr(g.btn, 40) || EV_BTN },
    ask_email: { text: bStr(a.text, 1000) || 'Спасибо! Теперь напиши почту — туда придёт подарок и записи эфиров.', err: bStr(a.err, 500) || 'Похоже, в почте опечатка — проверь и пришли ещё раз' },
    gc_group: bStr(R.gc_group, 200) || (mar ? 'Марафон: ' : 'Вебинар: ') + ev.title } }
async function evPrivacy(env) { const v = await kvGet(env, 'privacy_url').catch(() => null); return typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v) ? v : EV_PRIVACY }
/* §4.4: строка согласия в конце приветствия (не редактируется) */
const evGreetText = (R, url) => nbt(th(R.greet.text)) + '\n\n' + nbt(R.phone ? 'Нажимая «Поделиться номером», ты соглашаешься с' : 'Продолжая, ты соглашаешься с') + NB + '<a href="' + th(url) + '">политикой обработки персональных данных</a>.';
const evMsg = (env, chat, text, markup) => tg(env, 'sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) });
const evKbPhone = R => ({ keyboard: [[{ text: R.greet.btn, request_contact: true }]], resize_keyboard: true, one_time_keyboard: true });
const evKbEmail = (ev, R) => R.skip_email ? { inline_keyboard: [[{ text: 'Пропустить', callback_data: 'evskip:' + ev.id }]] } : { remove_keyboard: true };
/* почта: формат + частые опечатки (mail,ru · gmail.co · yandex.ru. · пробелы) → null */
const EV_MAIL_TYPO = /^(gmail\.(co|cm|con|cpm|cim|om|comm|ru)|g(mai|mal|amil|mial|nail|maill|mali|mil)\.com|(mail|yandex|ya|inbox|list|bk|rambler)\.(ry|tu|ri|rj|ru\.ru|con|cm|co)|(maill|mial|mai|meil|mali)\.ru|(yandx|yanex|yande|jandex|yndex|yadex)\.ru|(icloud|outlook|hotmail|yahoo)\.(co|con|cm))$/;
function evEmail(s) { s = String(s || '').trim(); if (!s || s.length > 120 || /[\s,;]/.test(s)) return null; s = s.toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(s) || /\.\.|^\.|\.@|@-/.test(s)) return null;
  const d = s.split('@')[1]; return EV_MAIL_TYPO.test(d) || /\.(con|cpm|cim|comm|ry|rj)$/.test(d) ? null : s }
const evPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.length >= 10 && d.length <= 15 ? '+' + d : null };
const mPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d ? '+' + d.slice(0, 1) + '***' + d.slice(-2) : '-' };
const mMail = e => { const [a, d] = String(e || '').split('@'); return d ? (a || '').slice(0, 1) + '***@' + d : '-' };
const mPII = s => String(s || '').replace(/[^\s@"'<>,;:()]+@[^\s@"'<>,;:()]+/g, m => mMail(m)).replace(/\+?\d[\d\s()-]{8,}\d/g, m => mPhone(m));
async function evWho(env, chat) { const st = await env.DB.prepare('SELECT uid FROM student WHERE tg_chat=?').bind(chat).first(); return st ? { me: 'student', uid: st.uid, k: 'u' + st.uid } : { me: 'guest', chat, k: 't' + chat } }
/* команда для draft / test: админы бота, кураторы, сотрудники, kv efir_testers (chat или uid) */
async function evTeam(env, chat, uid) { const T = await kvGet(env, 'efir_testers').catch(() => null);
  if (Array.isArray(T) && T.map(String).some(v => v === String(chat) || (uid && v === String(uid)))) return true; if (uid && isStaffUid(env, uid)) return true;
  return !!((await env.DB.prepare('SELECT chat FROM tg_admin WHERE chat=?').bind(String(chat)).first().catch(() => null)) || (await env.DB.prepare('SELECT cid FROM cur_tg WHERE tg_id=?').bind(String(chat)).first().catch(() => null))) }
/* код метки из ссылки: известный (ev_src), 'site', 'test'; неизвестный — «Основная» ('') */
async function evSrcOk(env, evId, code) { if (!code) return ''; if (code === 'site' || code === 'test') return code;
  const r = await env.DB.prepare('SELECT code FROM ev_src WHERE ev_id=? AND code=?').bind(evId, code).first().catch(() => null); return r ? code : '' }
async function evStateSet(env, chat, evId, step, src, test, phone) { await env.DB.prepare("INSERT INTO bot_state (chat, kind, ev_id, step, src, at, phone, test) VALUES (?,'evreg',?,?,?,?,?,?) ON CONFLICT(chat) DO UPDATE SET kind=excluded.kind, ev_id=excluded.ev_id, step=excluded.step, src=excluded.src, at=excluded.at, phone=excluded.phone, test=excluded.test")
  .bind(String(chat), evId, step, src || '', msNow(), phone || null, test ? 1 : 0).run() }
const evStateDel = (env, chat) => env.DB.prepare('DELETE FROM bot_state WHERE chat=?').bind(String(chat)).run().catch(() => null);
/* повторный /start записанного (§4.9): «Ты уже записан» + ближайший эфир; идёт — сразу «▶ Смотреть эфир» */
async function evAlready(env, chat, ev, E, W) { const e = evNext(E, msNow()), live = !!(e && e.status === 'live');
  return tgSend(env, chat, (live ? '🔴 <b>' + nbt('Эфир уже идёт!') + '</b>' : '✅ <b>' + nbt('Ты уже записан') + '</b>') + '\n«' + th(ev.title) + '»' + (!live && e && e.status === 'plan' && e.start ? '\nБлижайший эфир: ' + efWhen(e.start) + (E.length > 1 ? NB + '— ' + th(e.title) : '') : ''),
    e ? [[{ text: live ? '▶ Смотреть эфир' : 'Страница эфира', url: await efLink(env, e, W.k) }]] : undefined) }
/* регистрация из бота: /start v<id>[_<код>] (и /start e<id> для эфира мероприятия) */
async function evStart(env, chat, id, from, code) { await ef2Ensure(env); if (from) await saveTgUser(env, from); const ev = await evGet(env, id); if (!ev) return tgSend(env, chat, 'Это мероприятие не найдено или уже закончилось.');
  const W = await evWho(env, chat), status = ev.status || 'reg', src = await evSrcOk(env, ev.id, String(code || '')), test = src === 'test' || status === 'draft' || status === 'test' ? 1 : 0;
  if ((status === 'draft' || status === 'test') && !(await evTeam(env, chat, W.uid))) return tgSend(env, chat, 'Регистрация ещё не' + NB + 'открыта.');
  const name = [from && from.first_name, from && from.last_name].filter(Boolean).join(' '), E = await evEfirs(env, ev.id), R = evRegCfg(ev, E);
  if (!R) { /* старое мероприятие (без настроек регистрации) — ровно как до Э1; добавились только метка и test в ev_reg */
    const nm = efShort(name), x = await evRegister(env, ev, W, { chat, name: name || nm, src: 'bot', src_code: src, test });
    const steps = evOn(ev), now = msNow(), e = evNext(x.E, now);
    if (!x.fresh || !steps.some(s => s.on === 'reg' && !(s.min | 0))) { /* уже записан или нет приветствия в воронке — короткое подтверждение со ссылкой */
      return tgSend(env, chat, '✅ <b>' + nbt(e && e.status === 'live' ? 'Эфир уже идёт!' : 'Ты записан') + '</b>\n«' + th(ev.title) + '»' + (e && e.status !== 'live' && e.start ? '\n' + efWhen(e.start) : ''), e ? [[{ text: e.status === 'live' ? '▶ Открыть эфир' : 'Страница эфира', url: await efLink(env, e, W.k) }]] : undefined) }
    return evTick(env, { ev, k: W.k }) }
  if (await env.DB.prepare('SELECT at FROM ev_reg WHERE ev_id=? AND k=?').bind(ev.id, W.k).first()) { await evStateDel(env, chat); return evAlready(env, chat, ev, E, W) }
  /* §4.3 знакомый: ученик (почта — из GetCourse, gc_name) или уже давал телефон в боте — шаги телефона и почты пропускаются */
  let known = null;
  if (W.uid) { const g = await env.DB.prepare('SELECT email FROM gc_name WHERE uid=?').bind(W.uid).first().catch(() => null); known = { phone: null, email: (g && evEmail(g.email)) || null } }
  else { const p = await env.DB.prepare('SELECT phone, email FROM ev_reg WHERE chat=? AND phone IS NOT NULL ORDER BY at DESC LIMIT 1').bind(String(chat)).first().catch(() => null); if (p) known = { phone: p.phone, email: p.email || null } }
  if (known) return evRegDone(env, ev, W, { chat, name, src_code: src, test, phone: known.phone, email: known.email });
  const url = await evPrivacy(env);
  if (R.phone) { await evStateSet(env, chat, ev.id, 'phone', src, test, null); return evMsg(env, chat, evGreetText(R, url), evKbPhone(R)) }
  await evMsg(env, chat, evGreetText(R, url)); /* §4.5: без телефона — приветствие без клавиатуры и сразу почта (или «записан») */
  if (R.email) { await evStateSet(env, chat, ev.id, 'email', src, test, null); return evMsg(env, chat, nbt(th(R.ask_email.text)), evKbEmail(ev, R)) }
  return evRegDone(env, ev, W, { chat, name, src_code: src, test }) }
/* §4.7: записан — ev_reg, bot_state удаляется, шаг `reg` воронки (как раньше); затем GetCourse (§4.8) — ошибка регистрации не мешает */
async function evRegDone(env, ev, W, x) { await evStateDel(env, x.chat);
  const r = await evRegister(env, ev, W, { chat: x.chat, name: x.name || efShort(''), src: 'bot', src_code: x.src_code, test: x.test, phone: x.phone || null, email: x.email || null });
  const steps = evOn(ev), e = evNext(r.E, msNow()); let j;
  if (!r.fresh) j = await evAlready(env, x.chat, ev, r.E, W);
  else if (steps.some(s => s.on === 'reg' && !(s.min | 0))) j = await evTick(env, { ev, k: W.k });
  else j = await tgSend(env, x.chat, '✅ <b>' + nbt(e && e.status === 'live' ? 'Эфир уже идёт!' : 'Ты записан') + '</b>\n«' + th(ev.title) + '»' + (e && e.status !== 'live' && e.start ? '\n' + efWhen(e.start) : ''), e ? [[{ text: e.status === 'live' ? '▶ Смотреть эфир' : 'Страница эфира', url: await efLink(env, e, W.k) }]] : undefined);
  if (r.fresh && x.email) await evGcImport(env, ev, { k: W.k, uid: W.uid || null, phone: x.phone, email: x.email }).catch(() => null);
  return j }
/* шаги диалога (bot_state): контакт на шаге phone, почта на шаге email. Команды (/…) не перехватываем */
async function evRegMsg(env, m, chat, text) { if (!m.contact && (!text || text[0] === '/')) return false;
  let S = null; try { S = await env.DB.prepare("SELECT * FROM bot_state WHERE chat=? AND kind='evreg'").bind(chat).first() } catch (e) { return false } if (!S) return false;
  if (msNow() - (S.at || 0) > 7 * 864e5) { await evStateDel(env, chat); return false }
  await ef2Ensure(env); const ev = await evGet(env, S.ev_id), E = ev ? await evEfirs(env, ev.id) : [], R = ev && evRegCfg(ev, E); if (!R) { await evStateDel(env, chat); return false }
  const W = await evWho(env, chat); if (await env.DB.prepare('SELECT at FROM ev_reg WHERE ev_id=? AND k=?').bind(ev.id, W.k).first()) { await evStateDel(env, chat); await evAlready(env, chat, ev, E, W); return true }
  const x = { chat, name: [m.from && m.from.first_name, m.from && m.from.last_name].filter(Boolean).join(' '), src_code: S.src || '', test: S.test ? 1 : 0 };
  const again = () => evMsg(env, chat, nbt('Нажми кнопку «' + th(R.greet.btn) + '» внизу экрана — Telegram сам подставит номер.'), evKbPhone(R));
  if (S.step === 'phone') {
    if (!m.contact) { await again(); return true }
    if (!m.from || String(m.contact.user_id || '') !== String(m.from.id)) { await logIt(env, 'ev-reg-alien', 0, ev.id + ' ' + chat); await evMsg(env, chat, nbt('Это чужой контакт. Нужен твой номер — нажми «' + th(R.greet.btn) + '» внизу экрана.'), evKbPhone(R)); return true }
    const phone = evPhone(m.contact.phone_number); if (!phone) { await again(); return true }
    if (R.email) { await evStateSet(env, chat, ev.id, 'email', S.src, S.test, phone); await evMsg(env, chat, nbt(th(R.ask_email.text)), evKbEmail(ev, R)); return true }
    await evRegDone(env, ev, W, Object.assign(x, { phone })); return true }
  if (S.step === 'email') {
    if (m.contact) { await evMsg(env, chat, nbt(th(R.ask_email.text)), evKbEmail(ev, R)); return true }
    if (R.skip_email && /^пропустить$/i.test(text)) { await evRegDone(env, ev, W, Object.assign(x, { phone: S.phone })); return true }
    const em = evEmail(text); if (!em) { await evMsg(env, chat, nbt(th(R.ask_email.err)), evKbEmail(ev, R)); return true }
    await evRegDone(env, ev, W, Object.assign(x, { phone: S.phone, email: em })); return true }
  await evStateDel(env, chat); return false }
/* кнопка «Пропустить» под вопросом о почте (callback evskip:<ev>) */
async function evSkip(env, q) { const chat = String((q.message && q.message.chat && q.message.chat.id) || (q.from && q.from.id)), id = +String(q.data).split(':')[1];
  let S = null; try { S = await env.DB.prepare("SELECT * FROM bot_state WHERE chat=? AND kind='evreg' AND ev_id=? AND step='email'").bind(chat, id).first() } catch (e) {}
  await tg(env, 'answerCallbackQuery', { callback_query_id: q.id }); if (!S) return;
  await ef2Ensure(env); const ev = await evGet(env, id), E = ev ? await evEfirs(env, ev.id) : [], R = ev && evRegCfg(ev, E); if (!R || !R.skip_email) return;
  if (q.message) await tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => null);
  return evRegDone(env, ev, await evWho(env, chat), { chat, name: [q.from && q.from.first_name, q.from && q.from.last_name].filter(Boolean).join(' '), src_code: S.src || '', test: S.test ? 1 : 0, phone: S.phone }) }
/* §4.8 GetCourse: один пользователь за запрос — почта, телефон, группа reg.gc_group (по умолчанию «Марафон: …» / «Вебинар: …», запоминается при первом импорте).
   Имя не передаём: refresh_if_exists=1 перезаписал бы имя у тех, кто уже есть в GetCourse. Успех — gc_ok=1, gc_uid; ошибка — gc_ok −1, −2, … (повтор — evGcTick) */
async function evGcImport(env, ev, r) { if (!r.email) return { ok: false, skip: 1 };
  const R = efJ(ev.reg, null); let grp = R && bStr(R.gc_group, 200);
  if (!grp) { const E = await evEfirs(env, ev.id); grp = ((ev.type || (E.length > 1 ? 'mar' : 'web')) === 'mar' ? 'Марафон: ' : 'Вебинар: ') + ev.title;
    if (R && typeof R === 'object') { R.gc_group = grp; ev.reg = JSON.stringify(R); await env.DB.prepare('UPDATE efir_event SET reg=? WHERE id=?').bind(ev.reg, ev.id).run().catch(() => null) } }
  const user = { email: r.email, group_name: [grp] }; if (r.phone) user.phone = r.phone;
  let j = null, err = ''; try { j = await gcImport(env, 'users', { user, system: { refresh_if_exists: 1 } }) } catch (e) { err = String((e && e.message) || e) }
  const X = (j && j.result) || {}, ok = !!j && (j.success === true || j.success === 'true') && !X.error && X.success !== false && X.success !== 'false';
  if (ok) { await env.DB.prepare('UPDATE ev_reg SET gc_ok=1, gc_uid=? WHERE ev_id=? AND k=?').bind(+X.user_id || null, ev.id, r.k).run(); return { ok: true, uid: +X.user_id || null } }
  err = mPII(err || X.error_message || (j && j.error_message) || 'ошибка');
  await env.DB.prepare('UPDATE ev_reg SET gc_ok=CASE WHEN COALESCE(gc_ok,0)<0 THEN gc_ok-1 ELSE -1 END WHERE ev_id=? AND k=?').bind(ev.id, r.k).run();
  await logIt(env, 'ev-gc-err', r.uid || 0, ev.id + ' ' + r.k + ' ' + mMail(r.email) + ' ' + err.slice(0, 200)); return { ok: false, err } }
/* фон (§3.1, до Paid — тик раз в минуту и cron, ≤ 2 импорта за запуск): почта есть, в GetCourse ещё не ушло. Повтор после N неудач — через 2^N мин от регистрации, до 12 попыток, 3 дня */
async function evGcTick(env, B, lim) { B = B || budget(2); if (!env.GC_KEY_W) return { skip: 'nokey' }; await ef2Ensure(env); const now = msNow(), out = { ok: 0, fail: 0 }, EV = {};
  const L = await qAll(env.DB.prepare('SELECT ev_id, k, uid, phone, email, gc_ok, at FROM ev_reg WHERE email IS NOT NULL AND (gc_ok IS NULL OR (gc_ok<0 AND gc_ok>-12)) AND at>? AND at<? ORDER BY at LIMIT 40').bind(now - 3 * 864e5, now - 6e4));
  for (const r of L.filter(r => r.gc_ok == null || now - r.at >= Math.pow(2, -r.gc_ok) * 6e4).slice(0, lim || 2)) { if (!B.ok(1)) break;
    const ev = r.ev_id in EV ? EV[r.ev_id] : (EV[r.ev_id] = await evGet(env, r.ev_id)); if (!ev) continue; B.use(1);
    const x = await evGcImport(env, ev, r).catch(() => ({ ok: false })); if (x.ok) out.ok++; else out.fail++ }
  if (out.ok || out.fail) await logIt(env, 'ev-gc', 0, JSON.stringify(out)); return out }
/* ===== метки (ev_src): записались / пришли / заявки по src_code — для 2.3 и 5.1 (экраны — Э2, Э6). Тестовые (test=1) не считаются ===== */
async function evSrcStats(env, ev) { return memo(env, 'evsrc:' + ev.id, 30, async () => { const E = await evEfirs(env, ev.id), ids = E.map(e => +e.id).join(',');
  const [S, C, T] = await env.DB.batch([env.DB.prepare("SELECT code, title, at FROM ev_src WHERE ev_id=? AND code<>'test' ORDER BY code<>'', at, code").bind(ev.id),
    env.DB.prepare("SELECT COALESCE(r.src_code,'') c, COUNT(*) regs" + (ids ? ', SUM(CASE WHEN EXISTS (SELECT 1 FROM efir_seen z WHERE z.k=r.k AND z.efir_id IN (' + ids + ')) THEN 1 ELSE 0 END) came, SUM(CASE WHEN EXISTS (SELECT 1 FROM efir_lead l WHERE l.k=r.k AND l.efir_id IN (' + ids + ')) THEN 1 ELSE 0 END) leads' : ', 0 came, 0 leads') + " FROM ev_reg r WHERE r.ev_id=? AND COALESCE(r.test,0)=0 GROUP BY COALESCE(r.src_code,'')").bind(ev.id),
    env.DB.prepare('SELECT COUNT(*) n FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=1').bind(ev.id)]);
  const by = {}; for (const c of C.results || []) by[c.c] = c; const L = (S.results || []).slice(); if (!L.some(s => s.code === '')) L.unshift({ code: '', title: 'Основная' });
  for (const c in by) if (!L.some(s => s.code === c)) L.push({ code: c, title: c }); /* метка удалена или не из ev_src — всё равно видна */
  const link = c => 'https://t.me/' + BOT(env) + '?start=v' + ev.id + (c ? '_' + c : '');
  return { src: L.map(s => ({ code: s.code, title: s.title || (s.code || 'Основная'), link: link(s.code), regs: (by[s.code] || {}).regs | 0, came: (by[s.code] || {}).came | 0, leads: (by[s.code] || {}).leads | 0 })), test: (((T.results || [])[0] || {}).n) | 0 } }) }
const EV_TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const evCode = t => String(t || '').toLowerCase().replace(/[а-яё]/g, c => EV_TR[c]).replace(/[^a-z0-9]/g, '').slice(0, 24);
async function evSrcAdd(env, ev, o) { const title = bStr(o.title, 60); if (!title) return { ok: false, err: 'Напиши название метки' };
  const own = o.code != null && String(o.code).trim() !== ''; let code = own ? String(o.code).trim().toLowerCase() : evCode(title) || 'm';
  if (!/^[a-z0-9]{1,24}$/.test(code)) return { ok: false, err: 'Придумай код латиницей: буквы a–z и' + NB + 'цифры, до' + NB + '24' + NB + 'символов' };
  if (code === 'test') return { ok: false, err: 'Код «test» занят: это «Пройти регистрацию самому»' };
  const has = async c => !!(await env.DB.prepare('SELECT 1 x FROM ev_src WHERE ev_id=? AND code=?').bind(ev.id, c).first());
  if (await has(code)) { if (own) return { ok: false, err: 'Метка с' + NB + 'таким кодом уже есть' }; let n = 2; while (n < 100 && await has(code.slice(0, 22) + n)) n++; code = code.slice(0, 22) + n }
  await env.DB.prepare('INSERT INTO ev_src (ev_id, code, title, at) VALUES (?,?,?,?)').bind(ev.id, code, title, msNow()).run(); await memoClear(env, 'evsrc:' + ev.id);
  return { ok: true, code, title, link: 'https://t.me/' + BOT(env) + '?start=v' + ev.id + '_' + code } }
/* настройки регистрации и статус мероприятия (§2.1 reg, §2.4). Экран — Э2; в Э1 — для проверки на тестовом мероприятии. reg: null — регистрация по-старому */
async function evRegSave(env, ev, o, W) { const set = [], b = [];
  if ('reg' in o) { const R = o.reg;
    if (R === null) set.push('reg=NULL');
    else if (R && typeof R === 'object') { const c = { phone: R.phone ? 1 : 0, email: R.email ? 1 : 0, skip_email: R.skip_email ? 1 : 0 }, g = R.greet || {}, a = R.ask_email || {};
      if (bStr(g.text, 1500) || bStr(g.btn, 40)) c.greet = { text: bStr(g.text, 1500) || undefined, btn: bStr(g.btn, 40) || undefined };
      if (bStr(a.text, 1000) || bStr(a.err, 500)) c.ask_email = { text: bStr(a.text, 1000) || undefined, err: bStr(a.err, 500) || undefined };
      if (bStr(R.gc_group, 200)) c.gc_group = bStr(R.gc_group, 200); set.push('reg=?'); b.push(JSON.stringify(c)) }
    else return { ok: false, err: 'Не понял настройки регистрации' } }
  if (o.status != null && String(o.status) !== (ev.status || 'reg')) { const to = String(o.status), from = ev.status;
    /* §2.4: draft → test / reg, test → reg / draft; reg → draft нельзя. Мероприятие без статуса (старое или созданное в старом пульте) можно увести в draft / test, пока нет настоящих регистраций */
    const real = from ? 0 : (((await env.DB.prepare('SELECT COUNT(*) n FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0').bind(ev.id).first()) || {}).n | 0);
    const OK = from === 'draft' ? ['test', 'reg'] : from === 'test' ? ['reg', 'draft'] : !from && !real ? ['draft', 'test', 'reg'] : [];
    if (!OK.includes(to)) return { ok: false, err: (from || 'reg') === 'reg' ? 'Регистрация уже идёт — в' + NB + 'черновик не' + NB + 'вернуть' : 'Так статус не' + NB + 'меняется' };
    set.push('status=?'); b.push(to) }
  if (!set.length) return { ok: false, err: 'Нечего сохранять' };
  await env.DB.prepare('UPDATE efir_event SET ' + set.join(', ') + ', upd=? WHERE id=?').bind(...b, msNow(), ev.id).run(); await logIt(env, 'ev-regcfg', W.uid, ev.id + ' ' + set.map(x => x.split('=')[0]).join(',') + (o.status ? ' ' + o.status : ''));
  const nv = await evGet(env, ev.id); return { ok: true, status: nv.status || 'reg', reg: evRegCfg(nv, await evEfirs(env, ev.id)) } }
/* рассылка участникам мероприятия (пульт → мероприятие, и «Рассылки»): кому — все / были / не пришли (на конкретном эфире или на любом), пачками по 25 */
async function evBroadcast(env, ev, o) { const E = await evEfirs(env, ev.id), ids = +o.efir ? [+o.efir] : E.map(x => x.id), off = Math.max(0, +o.off | 0);
  const came = ids.length ? '(SELECT COUNT(*) FROM efir_seen z WHERE z.k=r.k AND z.efir_id IN (' + ids.map(Number).join(',') + '))' : '0', who = o.who === 'came' ? ' AND ' + came + '>0' : o.who === 'miss' ? ' AND ' + came + '=0' : '';
  const tot = await env.DB.prepare('SELECT COUNT(*) n FROM ev_reg r LEFT JOIN student s ON s.uid=r.uid WHERE r.ev_id=? AND COALESCE(r.chat, s.tg_chat) IS NOT NULL' + who).bind(ev.id).first();
  const R = await qAll(env.DB.prepare('SELECT r.*, s.tg_chat FROM ev_reg r LEFT JOIN student s ON s.uid=r.uid WHERE r.ev_id=? AND COALESCE(r.chat, s.tg_chat) IS NOT NULL' + who + ' ORDER BY r.at LIMIT 25 OFFSET ?').bind(ev.id, off));
  const s = { text: o.text, btns: evClean([{ on: 'reg', text: 'x', btns: o.btns }])[0].btns }, img = /^https:\/\//.test(o.img || '') ? o.img : null; let sent = 0, fail = 0;
  for (const r of R) { const e = evNext(E, msNow()), m = await evRender(env, ev, E, +o.efir ? E.find(x => x.id === +o.efir) || e : e, s, r), j = await evSend(env, r.chat || r.tg_chat, m, img).catch(() => null); if (j && j.ok) sent++; else fail++ }
  if (!off) await logIt(env, 'ev-bc', 0, ev.id + ' ' + (o.who || 'all') + ' ' + ((tot && tot.n) || 0));
  return { ok: true, sent, fail, total: (tot && tot.n) || 0, next: off + R.length < ((tot && tot.n) || 0) ? off + R.length : null } }
/* пульт: мероприятия (только админ) */
async function evHostApi(env, req, path, u, o, W) { await ef2Ensure(env); const now = msNow(); if (!W.adm) return json(req, { ok: false, err: 'Мероприятия настраивает Роман' }, 403);
  await ev2Migrate(env); /* 07.11 Э2: §10 type / status / sale, offer → ev_prod (лениво) */
  /* 07.11 Э2: списки 1.1 / 1.2 (?type=web|mar), новый черновик, автосохранение мастера (v:2) — старые вызовы без type / v работают как раньше */
  if (path === '/efir/host/events' && u.searchParams.get('type')) return json(req, await ev2List(env, u.searchParams.get('type')));
  if (path === '/efir/host/event/new' && req.method === 'POST') return json(req, await ev2New(env, o.type, W));
  if (path === '/efir/host/event/save' && req.method === 'POST' && +o.v === 2) { const ev = await evGet(env, o.id || o.ev); if (!ev) return json(req, { ok: false, err: 'Мероприятие не найдено' }, 404);
    const r = await ev2Save(env, ev, o, W); return json(req, r, r.conflict ? 409 : 200) }
  if (path === '/efir/host/events') { const L = await qAll(env.DB.prepare('SELECT * FROM efir_event WHERE del=0 ORDER BY id DESC LIMIT 60')), out = [];
    for (const ev of L) { const [E, n] = await Promise.all([evEfirs(env, ev.id), env.DB.prepare('SELECT COUNT(*) n, SUM(CASE WHEN chat IS NOT NULL OR uid IS NOT NULL THEN 1 ELSE 0 END) tg FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0').bind(ev.id).first()]);
      out.push({ id: ev.id, title: ev.title, about: ev.about || '', cover: ev.cover || null, offer: efJ(ev.offer, null), funnel: evSteps(ev), link: evLink(ev.id), bot: 'https://t.me/' + BOT(env) + '?start=v' + ev.id, regs: (n && n.n) || 0, tg: (n && n.tg) || 0,
        efirs: E.map(e => ({ id: e.id, title: e.title, start: e.start, status: e.status })) }) }
    return json(req, { ok: true, events: out, def: evFunnelDef() }) }
  if (path === '/efir/host/event/save' && req.method === 'POST') { const title = bStr(o.title, 140); if (!title) return json(req, { ok: false, err: 'Напиши название мероприятия' }, 400);
    const of = o.offer && bStr(o.offer.title, 200) ? { title: bStr(o.offer.title, 200), price: Math.max(0, +o.offer.price | 0), code: bStr(o.offer.code, 60) || null } : null;
    let fn = o.funnel != null ? evClean(o.funnel) : null; if (fn && +o.id) { const old0 = await evGet(env, o.id), OS = old0 ? evSteps(old0) : []; fn = fn.map(x => { const y = OS.find(z => z.id === x.id); if (!y) return x; for (const k of ['title', 'off', 'off_mode', 'off0']) if (y[k] != null && x[k] == null) x[k] = y[k]; if (EV_WHO.indexOf(y.who) > 2 && x.who === 'all') x.who = y.who; return x }) } /* 07.11 Э4: старый пульт не знает title/off/фильтров дожима — сохраняем их по id шага */
    fn = fn ? JSON.stringify(fn) : null;
    const cover = /^https:\/\/[^\s"'<>]+$/.test(o.cover || '') ? bStr(o.cover, 400) : null;
    if (+o.id) { const old = await evGet(env, o.id); if (!old) return json(req, { ok: false, err: 'Мероприятие не найдено' }, 404);
      await env.DB.prepare('UPDATE efir_event SET title=?, about=?, cover=?, offer=?, funnel=COALESCE(?, funnel), upd=? WHERE id=?').bind(title, bStr(o.about, 1500), cover, of ? JSON.stringify(of) : null, fn, now, old.id).run(); return json(req, { ok: true, id: old.id }) }
    const r = await env.DB.prepare('INSERT INTO efir_event (title, about, cover, offer, funnel, created, upd, reg) VALUES (?,?,?,?,?,?,?,?) RETURNING id').bind(title, bStr(o.about, 1500), cover, of ? JSON.stringify(of) : null, fn || JSON.stringify(evFunnelDef()), now, now, JSON.stringify(EV_REG_NEW)).first();
    /* 07.11 Э1: у нового мероприятия — регистрация с телефоном и почтой (§4, тексты по умолчанию — evRegCfg) и метки «Основная» / «Сайт» (§2.2) */
    await env.DB.batch([env.DB.prepare("INSERT OR IGNORE INTO ev_src (ev_id, code, title, at) VALUES (?, '', 'Основная', ?)").bind(r.id, now), env.DB.prepare("INSERT OR IGNORE INTO ev_src (ev_id, code, title, at) VALUES (?, 'site', 'Сайт', ?)").bind(r.id, now)]);
    await logIt(env, 'ev-new', W.uid, r.id + ' ' + title); return json(req, { ok: true, id: r.id }) }
  const ev = await evGet(env, o.ev || u.searchParams.get('ev') || o.id || u.searchParams.get('id')); if (!ev) return json(req, { ok: false, err: 'Мероприятие не найдено' }, 404);
  /* 07.11 Э2: мастер (§3.2) — мероприятие целиком, дни, проверка, запуск, дубль, метки (POST — создать) */
  if (path === '/efir/host/event/get') return json(req, await ev2Get(env, ev));
  if (path === '/efir/host/event/stats') return json(req, await ef6Stats(env, ev, +u.searchParams.get('day') || 0), 200, { 'Cache-Control': 'no-store' }); /* 07.11 Э6: итоги 5.1 */
  if (path === '/efir/host/event/days' && req.method === 'POST') { const r = await ev2DaysSave(env, ev, o, W); return json(req, r, r.conflict ? 409 : 200) }
  if (path === '/efir/host/event/check') return json(req, await ev2Check(env, ev));
  /* 07.11 Э3 (§3.2, §5): шаг 6 — скрипт таблицы, проверка таблицы и Google Формы, состояние подключения, вопросы прошлых мероприятий */
  if (path === '/efir/host/event/form/script') { const t = await ev3Script(env, ev, new URL(req.url).origin); await logIt(env, 'ev-gas', W.uid, String(ev.id)); return json(req, { ok: true, text: t }) }
  if (path === '/efir/host/event/form/check' && req.method === 'POST') { if (o.upd != null && +o.upd && (ev.upd || 0) > +o.upd) return json(req, { ok: false, conflict: 1, err: 'Изменено в другой вкладке — обнови' }, 409); return json(req, o.what === 'gform' ? await ev3CheckForm(env, ev, o, W) : await ev3CheckSheet(env, ev, o, W)) }
  if (path === '/efir/host/event/form') return json(req, await ev3State(env, ev));
  if (path === '/efir/host/event/qs') return json(req, await ev3PastQs(env, ev));
  if (path === '/efir/host/event/launch' && req.method === 'POST') return json(req, await ev2Launch(env, ev, o, W));
  if (path === '/efir/host/event/dup' && req.method === 'POST') return json(req, await ev2Dup(env, ev, W));
  if (path === '/efir/host/event/src' && req.method === 'POST') return json(req, await evSrcAdd(env, ev, o));
  if (path === '/efir/host/event/del' && req.method === 'POST' && o.v2 && ev2Status(ev) !== 'draft') { const n = await env.DB.prepare('SELECT COUNT(*) n FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0').bind(ev.id).first();
    if ((n && n.n) | 0) return json(req, { ok: false, err: 'Есть регистрации — удалить нельзя, можно только дублировать' }, 400) }
  if (path === '/efir/host/event/del' && req.method === 'POST') { const E = await evEfirs(env, ev.id); if (E.some(e => e.status === 'live')) return json(req, { ok: false, err: 'Сейчас идёт эфир этого мероприятия' }, 400);
    await env.DB.prepare('UPDATE efir_event SET del=1, upd=? WHERE id=?').bind(now, ev.id).run(); return json(req, { ok: true }) }
  if (path === '/efir/host/event/src') return json(req, Object.assign({ ok: true, bot: 'https://t.me/' + BOT(env) + '?start=v' + ev.id }, await evSrcStats(env, ev))); /* 07.11 Э1: метки — записались / пришли / заявки (для 2.3 и 5.1) */
  if (path === '/efir/host/event/src/add' && req.method === 'POST') return json(req, await evSrcAdd(env, ev, o));
  if (path === '/efir/host/event/reg' && req.method === 'POST') return json(req, await evRegSave(env, ev, o, W)); /* 07.11 Э1: настройки регистрации и статус (экран 2.3/2.8 — в Э2) */
  if (path === '/efir/host/event/regs') { const E = await evEfirs(env, ev.id), ids = E.map(x => x.id);
    const R = await qAll(env.DB.prepare('SELECT r.k, r.uid, r.name, r.src, r.src_code, r.test, r.at, (r.chat IS NOT NULL OR s.tg_chat IS NOT NULL) tg' + (ids.length ? ', (SELECT COUNT(DISTINCT efir_id) FROM efir_seen z WHERE z.k=r.k AND z.efir_id IN (' + ids.join(',') + ')) came' : ', 0 came') + ' FROM ev_reg r LEFT JOIN student s ON s.uid=r.uid WHERE r.ev_id=? ORDER BY r.at DESC LIMIT 500').bind(ev.id));
    return json(req, { ok: true, regs: R.map(r => ({ name: r.name || (r.uid ? 'Ученик ' + r.uid : 'Гость'), src: r.src, code: r.src_code || '', test: r.test ? 1 : 0, at: r.at, tg: !!r.tg, came: r.came | 0, student: !!r.uid })), efirs: E.length }) }
  /* 07.11 Э4: материалы (2.4), шаг 5 — сколько уже отправлено (ev_sent), разовые 2.9 (v:2: число получателей, «Прислать себе», отправить, запланировать, изменить, отменить, журнал) */
  if (path === '/efir/host/event/mat') return json(req, req.method === 'POST' ? await ev4MatPost(env, ev, o, W) : await ev4Mats(env, ev));
  if (path === '/efir/host/event/sent') return json(req, await ev4Sent(env, ev));
  if (path === '/efir/host/event/bc' && req.method === 'GET') return json(req, await ev4BcGet(env, ev));
  if (path === '/efir/host/event/bc' && req.method === 'POST' && +o.v === 2) return json(req, await ev4BcPost(env, ev, o, W, new URL(req.url).origin));
  if (path === '/efir/host/event/bc' && req.method === 'POST') { if (!String(o.text || '').trim()) return json(req, { ok: false, err: 'Напиши текст сообщения' }, 400); return json(req, await evBroadcast(env, ev, o)) }
  if (path === '/efir/host/event/test' && req.method === 'POST') return json(req, await ev4Self(env, ev, o, W, new URL(req.url).origin)); /* 07.11 Э4: «Прислать себе» — только в свой Telegram (без «первого админа»), all:1 — все включённые шаги */
  return json(req, { ok: false, err: 'path' }, 404) }

/* ===== 07.11 «Эфиры 2.0», этап Э2 (docs/plan/efiry-tz.md v6 §2.1, §2.4, §3.2, §6.4 1.1–2.8б, §10): списки, «Создать» и мастер мероприятия (шаги 1, 2, 3, 7, 8).
   Дни мероприятия — эфиры kind='open' с cfg.ev (как раньше) и cfg.ord (позиция дня). У черновика дни в статусе efir.status='draft' (их не видят старые экраны, бот, рассылки
   и evEfirs); при запуске (draft → test / reg) — 'plan'. Готовность шагов ev.steps {1..8: d|o|t} считает сервер при каждом сохранении (§3.2).
   Миграция Э2 (§10, лениво, без потери данных): type по числу эфиров, status='reg', sale.mode = offer ? sell : none, offer → ev_prod (sale.offer_id). Старые колонки не трогаем. ===== */
const EV2_MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const ev2Pl = (n, a, b, c) => { n = Math.abs(n | 0) % 100; const k = n % 10; return n > 10 && n < 20 ? c : k > 1 && k < 5 ? b : k === 1 ? a : c };
const ev2Host = h => CURATORS.some(c => c.id === h) ? h : 'admin';
const ev2HostName = h => h === 'admin' ? 'Роман Одуванов' : ((CURATORS.find(c => c.id === h) || {}).full || 'Роман Одуванов');
const ev2HostShort = h => h === 'admin' ? 'Роман' : ((CURATORS.find(c => c.id === h) || {}).name || 'Роман');
const ev2Cover = v => { v = String(v || ''); return /^\/efir\/cover\?id=\d{1,9}$/.test(v) || /^https:\/\/[^\s"'<>]{5,400}$/.test(v) ? v : null };
let EV2_MIG = 0;
/* §10: старые мероприятия → type / status / sale; offer → справочник ev_prod. Повторный запуск ничего не меняет (только строки с NULL) */
async function ev2Migrate(env) { if (EV2_MIG && Date.now() - EV2_MIG < 6e5) return; EV2_MIG = Date.now(); const now = msNow();
  await env.DB.batch([
    env.DB.prepare("UPDATE efir_event SET type=CASE WHEN (SELECT COUNT(*) FROM efir f WHERE f.del=0 AND f.kind='open' AND CAST(json_extract(f.cfg, '$.ev') AS INTEGER)=efir_event.id)>1 THEN 'mar' ELSE 'web' END WHERE type IS NULL"),
    env.DB.prepare("UPDATE efir_event SET status='reg' WHERE status IS NULL"),
    env.DB.prepare("UPDATE efir_event SET named=1 WHERE named IS NULL"),
    env.DB.prepare("UPDATE efir_event SET sale=json_object('mode', 'none') WHERE sale IS NULL AND (offer IS NULL OR offer='' OR offer='null')")]);
  const L = await qAll(env.DB.prepare("SELECT id, offer FROM efir_event WHERE sale IS NULL AND offer IS NOT NULL LIMIT 200"));
  for (const ev of L) { const of = efJ(ev.offer, null); let pid = null;
    if (of && bStr(of.title, 200)) { const t = bStr(of.title, 200), p = Math.max(0, +of.price | 0), c = bStr(of.code, 60) || null;
      const ex = await env.DB.prepare('SELECT id FROM ev_prod WHERE del=0 AND title=? AND COALESCE(price,0)=? AND COALESCE(code,\'\')=?').bind(t, p, c || '').first();
      pid = ex ? ex.id : (await env.DB.prepare('INSERT INTO ev_prod (title, price, code, del, at) VALUES (?,?,?,0,?) RETURNING id').bind(t, p, c, now).first()).id }
    await env.DB.prepare('UPDATE efir_event SET sale=? WHERE id=? AND sale IS NULL').bind(JSON.stringify(pid ? { mode: 'sell', offer_id: pid } : { mode: 'none' }), ev.id).run() } }
/* дни мероприятия, включая черновые (status='draft'), по позиции */
async function ev2Days(env, id) { return qAll(env.DB.prepare("SELECT * FROM efir WHERE del=0 AND kind='open' AND status<>'cancel' AND CAST(json_extract(cfg, '$.ev') AS INTEGER)=? ORDER BY COALESCE(json_extract(cfg, '$.ord'), 999), COALESCE(start, 0), id").bind(+id)) }
const ev2Type = (ev, D) => ev.type === 'mar' || ev.type === 'web' || ev.type === 'auto' ? ev.type : ((D || []).length > 1 ? 'mar' : 'web');
const ev2Status = ev => ['draft', 'test', 'reg', 'done'].includes(ev.status) ? ev.status : 'reg';
const ev2Sale = ev => { const S = efJ(ev.sale, null); if (S && typeof S === 'object' && ['sell', 'form', 'none'].includes(S.mode)) return S; return efJ(ev.offer, null) ? { mode: 'sell', legacy: 1 } : (S && typeof S === 'object' ? S : null) };
const ev2Acc = ev => { const A = efJ(ev.access, null) || {}; return { who: A.who === 'stream' ? 'stream' : 'open', streams: (Array.isArray(A.streams) ? A.streams : []).map(x => bStr(x, 60)).filter(Boolean).slice(0, 30), tariffs: (Array.isArray(A.tariffs) ? A.tariffs : []).map(x => bStr(x, 60)).filter(Boolean).slice(0, 30) } };
const ev2Rec = ev => { const R = efJ(ev.rec, null) || {}; return { days: [1, 3, 7, 0, -1, 14, 30].includes(+R.days) && R.days != null ? +R.days : 1, after: R.after === 'closed' ? 'closed' : 'lead', chat: R.chat === 0 ? 0 : 1, pts: R.pts === 0 ? 0 : 1 } };
const ev2DayPub = (e, now) => { const c = efJ(e.cfg, {}); return { id: e.id, title: e.title || '', short: c.short || '', start: e.start || null, dur: e.dur || null, status: e.status, hide: c.hide ? 1 : 0, at_live: e.at_live || null, at_end: e.at_end || null, past: !!(e.start && e.start < now && e.status !== 'draft' && e.status !== 'plan') || ['done', 'rec'].includes(e.status) } };
/* §3.2 «Готовность шагов»; шаг 6 (Э3): режим выбран; «Продаём» — продукт; «Анкеты» — своя форма: таблица проверена, Google Форма: форма проверена и скрипт в её таблице ответов подключён */
const ev3Ready = S => !!S && (S.mode === 'none' || (S.mode === 'sell' && !!(S.offer_id || S.legacy)) || (S.mode === 'form' && !!(S.sheet && S.sheet.ok_at) && ((S.form && S.form.src) !== 'gform' || !!(S.sheet.form && S.form.gform && S.form.gform.checked_at))));
/* §3.2 «Готовность шагов» */
async function ev2Calc(env, ev, D) { D = D || await ev2Days(env, ev.id); const R = efJ(ev.reg, null) || {}, S = ev2Sale(ev), F = evSteps(ev), st = ev2Status(ev);
  const m = await env.DB.prepare('SELECT COUNT(*) n FROM ev_mat WHERE ev_id=? AND del=0').bind(ev.id).first(), vis = D.filter(e => !efJ(e.cfg, {}).hide);
  const mats = ((m && m.n) | 0) + (D.some(e => efJ(e.cfg, {}).lead) ? 1 : 0), g = R.greet || {}, a = R.ask_email || {};
  return { 1: bStr(ev.title, 140) && ev2Host(ev.host || 'admin') && (ev.fmt === 'obs' || ev.fmt === 'room') ? 'd' : 't',
    2: vis.length && vis.every(e => bStr(e.title, 140) && e.start) ? 'd' : 't',
    3: bStr(g.text, 1500) && (R.email === 0 || bStr(a.text, 1000)) ? 'd' : 't',
    4: mats ? 'd' : 'o',
    5: F.length && F.filter(s => !s.off).every(s => String(s.text || '').trim()) ? 'd' : 't',
    6: ev3Ready(S) ? 'd' : 't',
    7: ev.access || ev.rec ? 'd' : 't',
    8: st === 'reg' || st === 'done' ? 'd' : 't' } }
async function ev2SaveSteps(env, ev, D) { const s = await ev2Calc(env, ev, D); ev.steps = JSON.stringify(s); await env.DB.prepare('UPDATE efir_event SET steps=? WHERE id=?').bind(ev.steps, ev.id).run(); return s }
/* «Основное: …», «3 дня: 11, 12, 13 ноября в 19:00» — тексты чек-листа 2.8 (§6.4) */
function ev2DaysText(D, type) { const vis = D.filter(e => !efJ(e.cfg, {}).hide && e.start); if (!vis.length) return type === 'web' ? 'Дата: не указана' : 'Дни: не указаны';
  const P = vis.map(e => { const d = msk(new Date(e.start)); return { d: d.getUTCDate(), m: d.getUTCMonth(), hm: efHM(e.start) } }), one = P.every(p => p.hm === P[0].hm);
  if (type === 'web') return 'Дата: ' + P[0].d + ' ' + MONTHS[P[0].m] + ' в ' + P[0].hm;
  const G = []; for (const p of P) { const g = G[G.length - 1]; if (g && g.m === p.m) g.d.push(p.d); else G.push({ m: p.m, d: [p.d] }) }
  return P.length + ' ' + ev2Pl(P.length, 'день', 'дня', 'дней') + ': ' + G.map(g => g.d.join(', ') + ' ' + MONTHS[g.m]).join(', ') + (one ? ' в ' + P[0].hm : ' в разное время') }
const ev2When = s => s.on === 'reg' ? (s.min ? 'через ' + s.min + ' мин' : 'сразу') : s.on === 'before' ? (s.min % 1440 === 0 ? 'за ' + s.min / 1440 + ' ' + ev2Pl(s.min / 1440, 'день', 'дня', 'дней') : s.min % 60 === 0 ? 'за ' + (s.min / 60 === 1 ? '1 час' : s.min / 60 + ' ' + ev2Pl(s.min / 60, 'час', 'часа', 'часов')) : 'за ' + s.min + ' ' + ev2Pl(s.min, 'минуту', 'минуты', 'минут')) : s.on === 'start' ? 'в момент старта' : 'через ' + s.min + ' мин';
async function ev2Check(env, ev) { const D = await ev2Days(env, ev.id), type = ev2Type(ev, D), steps = await ev2Calc(env, ev, D), R = efJ(ev.reg, null) || {}, S = ev2Sale(ev), F = evSteps(ev), A = ev2Acc(ev), RC = ev2Rec(ev);
  const must = [], may = [], rows = [], host = ev2Host(ev.host || 'admin'), fmt = ev.fmt === 'room' ? 'room' : 'obs', vis = D.filter(e => !efJ(e.cfg, {}).hide);
  if (steps[1] !== 'd') must.push({ step: 1, text: 'Основное: ' + (!bStr(ev.title, 140) ? 'не указано название' : 'не выбран формат эфира') });
  if (steps[2] !== 'd') { const lab = type === 'web' ? 'Дата и время' : 'Дни марафона'; if (!vis.length) must.push({ step: 2, text: lab + ': нет ни одного дня' });
    vis.forEach((e, i) => { const w = !bStr(e.title, 140) ? 'не указана тема' : !e.start ? 'не указаны дата и время' : ''; if (!w) return; must.push({ step: 2, text: type === 'web' ? lab + ': ' + w.replace('тема', 'тема вебинара') : lab + ': у дня ' + (i + 1) + ' ' + w }) }) }
  if (steps[3] !== 'd') must.push({ step: 3, text: 'Регистрация в боте: ' + (!(R.greet && bStr(R.greet.text, 1500)) ? 'не заполнен текст приветствия' : 'не заполнен вопрос про почту') });
  if (steps[4] !== 'd') may.push({ step: 4, text: 'Материалы эфира не добавлены — в пульте нечего будет показать', fix: 'Добавить' });
  if (steps[5] !== 'd') { const s = F.find(x => !x.off && !String(x.text || '').trim()); must.push({ step: 5, text: s ? 'Бот: не заполнен текст сообщения «' + (s.title || ev2When(s)) + '»' : 'Бот: нет ни одного сообщения' }) }
  if (steps[6] !== 'd') must.push({ step: 6, text: !S || !S.mode ? 'Продажи: не выбран режим — «Продаём», «Собираем анкеты» или «Без продаж»' : S.mode === 'sell' ? 'Продажи: выбран «Продаём», но не указан продукт' : 'Продажи: выбраны «Анкеты», но таблица не подключена' });
  if (S && S.mode === 'sell' && R.email === 0) must.push({ step: 3, text: 'Для заказа в GetCourse нужна почта — включи „Спрашивать почту“ на шаге 3' });
  let obs = true; if (fmt === 'obs') { const K = await kinGet(env, host); obs = !!(K && K.id); if (!obs) must.push({ step: 0, set: 1, text: 'OBS: ключ трансляции не подключён · ведёт ' + ev2HostShort(host) }) }
  if (steps[7] !== 'd') may.push({ step: 7, text: 'Доступ и запись не проверены — по умолчанию все по ссылке, запись 24 часа', fix: 'Открыть' });
  /* строки «✓ …» (2.8) */
  const ph = R.phone === 0 ? 0 : 1, em = R.email === 0 ? 0 : 1;
  const mt = await qAll(env.DB.prepare('SELECT kind, COUNT(*) n FROM ev_mat WHERE ev_id=? AND del=0 GROUP BY kind').bind(ev.id)), mn = k => ((mt.find(x => x.kind === k) || {}).n) | 0;
  const ml = []; if (mn('lead') || D.some(e => efJ(e.cfg, {}).lead)) ml.push(S && S.mode === 'form' ? 'анкета' : 'кнопка заявки');
  if (mn('banner')) ml.push(mn('banner') + ' ' + ev2Pl(mn('banner'), 'баннер', 'баннера', 'баннеров')); if (mn('poll')) ml.push(mn('poll') + ' ' + ev2Pl(mn('poll'), 'опрос', 'опроса', 'опросов'));
  const off = F.filter(s => s.off).length; let prod = null; if (S && S.mode === 'sell' && S.offer_id) prod = await env.DB.prepare('SELECT title, price FROM ev_prod WHERE id=?').bind(+S.offer_id).first();
  if (!prod && S && S.mode === 'sell') { const of = efJ(ev.offer, null); if (of && of.title) prod = { title: of.title, price: of.price } }
  const rub = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, NB) + NB + '₽', recT = { 1: '24 часа', 3: '3 дня', 7: '7 дней', 0: 'всегда', '-1': 'не показывается', 14: '14 дней', 30: '30 дней' }[RC.days];
  rows.push({ step: 1, ok: steps[1] === 'd', text: 'Основное: ' + ['название', ev.cover ? 'обложка' : '', 'ведущий'].filter(Boolean).join(', ') });
  rows.push({ step: 2, ok: steps[2] === 'd', text: ev2DaysText(D, type) });
  rows.push({ step: 3, ok: steps[3] === 'd', text: 'Регистрация в боте: ' + (ph && em ? 'телефон + почта' : ph ? 'только телефон' : em ? 'только почта' : 'без контактов') + ', приветствие настроено' });
  rows.push({ step: 4, ok: steps[4] === 'd', text: 'Материалы: ' + (ml.length ? ml.join(', ') : 'нет') });
  rows.push({ step: 5, ok: steps[5] === 'd', text: 'Бот: ' + F.length + ' ' + ev2Pl(F.length, 'сообщение', 'сообщения', 'сообщений') + (off ? ', ' + off + ' ' + ev2Pl(off, 'выключено', 'выключено', 'выключено') : '') });
  rows.push({ step: 6, ok: steps[6] === 'd', text: !S || !S.mode ? 'Продажи: режим не выбран' : S.mode === 'sell' ? 'Продажи: «Продаём»' + (prod ? ' · ' + prod.title + ', ' + rub(prod.price) : '') : S.mode === 'form' ? 'Продажи: анкеты · ' + ((S.form && S.form.src) === 'gform' ? 'Google Форма' : 'своя форма') + (S.sheet && S.sheet.ok_at ? ' · таблица подключена' : '') : 'Продажи: без продаж — кнопки заявки не будет' });
  rows.push({ step: 7, ok: steps[7] === 'd', text: 'Доступ: ' + (A.who === 'stream' ? 'ученики ' + (A.streams.concat(A.tariffs).join(' · ') || 'потока') : 'все по ссылке') + ' · запись ' + recT });
  rows.push(fmt === 'room' ? { step: 0, ok: true, text: 'Видеовстреча: комната создастся при первом входе ведущего' } : { step: 0, set: 1, ok: obs, text: obs ? 'OBS: ключ трансляции подключён · ведёт ' + ev2HostShort(host) : 'OBS: ключ трансляции не подключён · ведёт ' + ev2HostShort(host) });
  return { ok: true, must, may, rows, steps, status: ev2Status(ev) } }
/* одно мероприятие для мастера */
async function ev2Get(env, ev) { const now = msNow(), D = await ev2Days(env, ev.id), type = ev2Type(ev, D), steps = await ev2SaveSteps(env, ev, D); /* пересчёт: материалы и бот могли поменять в старом пульте */
  const R = evRegCfg(ev, D) || evRegCfg(Object.assign({}, ev, { reg: JSON.stringify(EV_REG_NEW), type }), D), raw = efJ(ev.reg, null) || {};
  const n = await env.DB.prepare('SELECT COUNT(*) n FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0').bind(ev.id).first(), S = ev2Sale(ev);
  const seen = D.length ? await qAll(env.DB.prepare('SELECT efir_id, COUNT(DISTINCT k) n FROM efir_seen WHERE sess=0 AND efir_id IN (' + D.map(e => +e.id).join(',') + ') GROUP BY efir_id')) : [];
  const host = ev2Host(ev.host || (D[0] && D[0].host_cid) || 'admin'), S3 = ev3Sale(ev, type);
  return { ok: true, now, ev: { id: ev.id, type, status: ev2Status(ev), title: ev.title || '', short: ev.short || '', about: ev.about || '', cover: ev.cover || null, host, host_name: ev2HostName(host),
    fmt: ev.fmt === 'room' ? 'room' : 'obs', dur: +ev.dur || (D[0] && D[0].dur) || 90, named: ev.named ? 1 : 0, upd: ev.upd || 0, steps,
    reg: { phone: R.phone, email: R.email, skip_email: R.skip_email, greet: R.greet, ask_email: R.ask_email, gc_group: R.gc_group, saved: raw.greet && raw.greet.text ? 1 : 0 },
    sale: ev3Pub(S3), prod: await ev3Prod(env, S3, ev), live: D.some(e => e.status === 'live') ? 1 : 0, lead_title: await ev3LeadTitle(env, ev, D), report_to: await ev3ReportTo(env), access: ev2Acc(ev), rec: ev2Rec(ev), saved7: ev.access || ev.rec ? 1 : 0,
    bot: 'https://t.me/' + BOT(env) + '?start=v' + ev.id, regs: (n && n.n) | 0, funnel: evSteps(ev), cf_plan: (await kvGet(env, 'cf_plan').catch(() => null)) === 'paid' ? 'paid' : 'free' },
    days: D.map(e => Object.assign(ev2DayPub(e, now), { seen: ((seen.find(x => x.efir_id === e.id) || {}).n) | 0 })),
    hosts: [{ id: 'admin', name: 'Роман Одуванов' }].concat(CURATORS.map(c => ({ id: c.id, name: c.full }))), privacy: await evPrivacy(env) } }
/* новый черновик (§3.2 event/new): метки «Основная» и «Сайт», у марафона 2 дня, у вебинара 1 эфир; дни — в статусе draft без даты */
async function ev2New(env, type, W) { const now = msNow(), t = type === 'mar' ? 'mar' : 'web';
  const r = await env.DB.prepare("INSERT INTO efir_event (title, about, cover, offer, funnel, created, upd, reg, type, status, host, fmt, dur, short, named) VALUES ('', '', NULL, NULL, ?, ?, ?, ?, ?, 'draft', 'admin', 'obs', 90, '', 0) RETURNING id")
    .bind(JSON.stringify(ev4SetNew(t)), now, now, JSON.stringify(EV_REG_NEW), t).first(); /* 07.11 Э4: готовый набор шага 5 (std) */
  const q = [env.DB.prepare("INSERT OR IGNORE INTO ev_src (ev_id, code, title, at) VALUES (?, '', 'Основная', ?)").bind(r.id, now), env.DB.prepare("INSERT OR IGNORE INTO ev_src (ev_id, code, title, at) VALUES (?, 'site', 'Сайт', ?)").bind(r.id, now)];
  for (let i = 0; i < (t === 'mar' ? 2 : 1); i++) q.push(env.DB.prepare("INSERT INTO efir (title, about, host_cid, host_uid, host_name, start, dur, kind, tariff, status, cfg, chapters, created, upd) VALUES ('', '', 'admin', ?, 'Роман Одуванов', NULL, 90, 'open', 'open', 'draft', ?, '[]', ?, ?)").bind(efAdminUid(env), JSON.stringify({ ev: r.id, ord: i }), now, now));
  await env.DB.batch(q); const ev = await evGet(env, r.id); await ev2SaveSteps(env, ev); await logIt(env, 'ev-new2', W.uid, r.id + ' ' + t); return { ok: true, id: r.id } }
/* шаги 1, 3, 7: изменения полей (автосохранение 800 мс). upd — защита от правки в двух вкладках */
async function ev2Save(env, ev, o, W) { const now = msNow(); if (o.upd != null && +o.upd && (ev.upd || 0) > +o.upd) return { ok: false, conflict: 1, err: 'Изменено в другой вкладке — обнови' };
  const set = [], b = [], D = await ev2Days(env, ev.id), st = ev2Status(ev), dq = []; let prod3 = null;
  const put = (c, v) => { const i = set.indexOf(c + '=?'); if (i >= 0) b[i] = v; else { set.push(c + '=?'); b.push(v) } ev[c] = v };
  if ('title' in o) { const t = bStr(o.title, 140); put('title', t) }
  if ('short' in o) put('short', bStr(o.short, 24));
  if ('about' in o) put('about', bStr(o.about, 1500));
  if ('cover' in o) put('cover', o.cover ? ev2Cover(o.cover) : null);
  if ('host' in o) put('host', ev2Host(o.host));
  if ('fmt' in o) put('fmt', o.fmt === 'room' ? 'room' : 'obs');
  if ('dur' in o) put('dur', Math.min(600, Math.max(10, +o.dur | 0 || 90)));
  if (o.named) put('named', 1);
  if (o.type === 'mar' && ev2Type(ev, D) === 'web') put('type', 'mar');
  if ('reg' in o && o.reg && typeof o.reg === 'object') { const R = o.reg, old = efJ(ev.reg, null) || {}, c = { phone: R.phone === 0 || R.phone === false ? 0 : 1, email: R.email === 0 || R.email === false ? 0 : 1, skip_email: R.skip_email ? 1 : 0 },
      g = R.greet || {}, a = R.ask_email || {};
    c.greet = { text: bStr(g.text, 1500) || undefined, btn: bStr(g.btn, 40) || undefined }; c.ask_email = { text: bStr(a.text, 1000) || undefined, err: bStr(a.err, 500) || undefined };
    if (old.gc_group) c.gc_group = old.gc_group; put('reg', JSON.stringify(c)) }
  if ('funnel' in o && Array.isArray(o.funnel)) { const F = evClean(o.funnel); if (!F.length) return { ok: false, err: 'Нужно хотя бы одно сообщение с текстом' }; put('funnel', JSON.stringify(F)) } /* 07.11 Э4: шаг 5 */
  const mode0 = (ev2Sale(ev) || {}).mode || null;
  if ('sale' in o && o.sale && typeof o.sale === 'object') { const r = await ev3SaleSave(env, ev, o.sale, D, W); if (r.err) return { ok: false, err: r.err }; put('sale', r.json); if (r.offer !== undefined) put('offer', r.offer); if (r.prod) prod3 = r.prod } /* 07.11 Э3: шаг 6 */
  if ('sale' in o) { const mode1 = (ev2Sale(ev) || {}).mode || null, fm = mode1 !== mode0 ? ev4FunMode(evSteps(ev), mode0, mode1, ev2Type(ev, D)) : null; if (fm) put('funnel', JSON.stringify(fm)) } /* 07.11 Э4: дожим по режиму (§6.4 2.5) */
  if ('access' in o && o.access) { const A = ev2Acc({ access: JSON.stringify(o.access) }); put('access', JSON.stringify(A)) }
  if ('rec' in o && o.rec) { const R = ev2Rec({ rec: JSON.stringify(o.rec) }); if (![1, 3, 7, 0, -1].includes(R.days) && R.days !== ev2Rec(ev).days) R.days = 1; put('rec', JSON.stringify(R)) }
  if (!set.length) return { ok: false, err: 'Нечего сохранять' };
  await env.DB.prepare('UPDATE efir_event SET ' + set.join(', ') + ', upd=? WHERE id=?').bind(...b, now, ev.id).run(); ev.upd = now;
  /* в дни: ведущий, длительность, доступ, запись; у вебинара — тема и коротко дня = мероприятия */
  const type = ev2Type(ev, D), A = ev2Acc(ev), RC = ev2Rec(ev);
  for (const e of D) { if (['done', 'rec'].includes(e.status) && !('access' in o) && !('rec' in o)) continue; const c = efJ(e.cfg, {}), s2 = [], b2 = [];
    if ('host' in o && !['live', 'done', 'rec'].includes(e.status)) { const h = ev2Host(ev.host), hc = CURATORS.find(x => x.id === h); s2.push('host_cid=?', 'host_uid=?', 'host_name=?'); b2.push(h, hc ? hc.uid : efAdminUid(env), ev2HostName(h)) }
    if ('dur' in o && !['live', 'done', 'rec'].includes(e.status)) { s2.push('dur=?'); b2.push(ev.dur) }
    if (type === 'web' && ('title' in o || 'short' in o)) { if ('title' in o) { s2.push('title=?'); b2.push(ev.title) } if ('short' in o) c.short = ev.short || undefined }
    if ('access' in o) { s2.push('tariff=?'); b2.push(A.who === 'stream' ? 'sel' : 'open'); if (A.who === 'stream') c.access = { streams: A.streams, tariffs: A.tariffs }; else delete c.access }
    if ('rec' in o) { if (RC.days === -1) { c.rec_hide = 1; c.rec_days = 0 } else { delete c.rec_hide; c.rec_days = RC.days } }
    if ('fmt' in o) c.fmt = ev.fmt;
    if ('cover' in o) { s2.push('cover=?'); b2.push(ev.cover && /^https:/.test(ev.cover) ? ev.cover : null) }
    s2.push('cfg=?', 'upd=?'); b2.push(JSON.stringify(c), now); dq.push(env.DB.prepare('UPDATE efir SET ' + s2.join(', ') + ' WHERE id=?').bind(...b2, e.id)) }
  if (dq.length) await env.DB.batch(dq);
  const steps = await ev2SaveSteps(env, ev); await logIt(env, 'ev-save2', W.uid, ev.id + ' ' + set.map(x => x.split('=')[0]).join(','));
  return Object.assign({ ok: true, upd: now, steps }, prod3 ? { prod: prod3 } : {}) }
/* шаг 2: дни [{id?, title, short, start, del?, hide?}] — 2–7 дней у марафона, 1 у вебинара. Удалить — только будущий день без зрителей; прошедший — скрыть */
async function ev2DaysSave(env, ev, o, W) { const now = msNow(); if (o.upd != null && +o.upd && (ev.upd || 0) > +o.upd) return { ok: false, conflict: 1, err: 'Изменено в другой вкладке — обнови' };
  const D = await ev2Days(env, ev.id), type = ev2Type(ev, D), L = Array.isArray(o.days) ? o.days.slice(0, 10) : null; if (!L) return { ok: false, err: 'Нет дней' };
  const keep = L.filter(d => !d.del), max = type === 'web' ? 1 : 7, min = type === 'web' ? 1 : 2;
  if (keep.length > max) return { ok: false, err: type === 'web' ? 'У вебинара один эфир — сделай марафон' : 'В марафоне не больше 7 дней' };
  if (keep.length < min) return { ok: false, err: 'В марафоне минимум 2 дня' };
  const byId = {}; for (const e of D) byId[e.id] = e; const q = [], moved = [];
  for (const d of L.filter(d => d.del && byId[+d.id])) { const e = byId[+d.id], seen = await env.DB.prepare('SELECT COUNT(*) n FROM efir_seen WHERE efir_id=?').bind(e.id).first();
    if (['live', 'done', 'rec'].includes(e.status) || (e.start && e.start < now) || ((seen && seen.n) | 0)) return { ok: false, err: 'Прошедший день не удалить — только скрыть' };
    q.push(env.DB.prepare('UPDATE efir SET del=1, upd=? WHERE id=?').bind(now, e.id)) }
  const h = ev2Host(ev.host || 'admin'), hc = CURATORS.find(x => x.id === h), dst = ev2Status(ev) === 'draft' ? 'draft' : 'plan', A = ev2Acc(ev), RC = ev2Rec(ev);
  keep.forEach((d, i) => { const title = type === 'web' ? bStr(ev.title, 140) : bStr(d.title, 140), start = +d.start > 0 ? +d.start : null, e = byId[+d.id];
    if (e) { const c = efJ(e.cfg, {}); c.ord = i; c.short = type === 'web' ? (ev.short || undefined) : (bStr(d.short, 24) || undefined); if ('hide' in d) { if (d.hide) c.hide = 1; else delete c.hide }
      if (['live', 'done', 'rec'].includes(e.status)) { q.push(env.DB.prepare('UPDATE efir SET title=?, cfg=?, upd=? WHERE id=?').bind(title || e.title, JSON.stringify(c), now, e.id)); return }
      if (start && e.start && start !== e.start && e.start - now < 864e5 && e.start > now) moved.push(e.id);
      q.push(env.DB.prepare('UPDATE efir SET title=?, start=?, cfg=?, upd=? WHERE id=?').bind(title, start, JSON.stringify(c), now, e.id));
      if (e.start !== start) q.push(env.DB.prepare("UPDATE efir_reg SET rem='' WHERE efir_id=? AND sess=0").bind(e.id)) }
    else { const c = { ev: ev.id, ord: i }; if (bStr(d.short, 24)) c.short = bStr(d.short, 24); if (A.who === 'stream') c.access = { streams: A.streams, tariffs: A.tariffs }; c.rec_days = RC.days === -1 ? 0 : RC.days; if (ev.fmt) c.fmt = ev.fmt;
      q.push(env.DB.prepare("INSERT INTO efir (title, about, host_cid, host_uid, host_name, start, dur, kind, tariff, status, cfg, chapters, created, upd) VALUES (?, '', ?, ?, ?, ?, ?, 'open', ?, ?, ?, '[]', ?, ?)")
        .bind(title, h, hc ? hc.uid : efAdminUid(env), ev2HostName(h), start, +ev.dur || 90, A.who === 'stream' ? 'sel' : 'open', dst, JSON.stringify(c), now, now)) } });
  q.push(env.DB.prepare('UPDATE efir_event SET upd=? WHERE id=?').bind(now, ev.id)); await env.DB.batch(q); ev.upd = now;
  /* новые дни запущенного мероприятия — записавшиеся записываются и на них */
  if (dst === 'plan') { const E = await evEfirs(env, ev.id), R = await qAll(env.DB.prepare('SELECT k, uid, chat, name, src FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0 LIMIT 3000').bind(ev.id)), add = [];
    for (const e of E.filter(x => x.status === 'plan')) for (const r of R) add.push(env.DB.prepare("INSERT OR IGNORE INTO efir_reg (efir_id, k, uid, chat, name, sess, src, at, rem) VALUES (?,?,?,?,?,0,?,?,'dhs')").bind(e.id, r.k, r.uid || null, r.chat || null, r.name || null, r.src || 'app', now));
    for (let i = 0; i < add.length; i += 90) await env.DB.batch(add.slice(i, i + 90)) }
  const D2 = await ev2Days(env, ev.id), steps = await ev2SaveSteps(env, ev, D2); await logIt(env, 'ev-days2', W.uid, ev.id + ' ' + keep.length);
  return { ok: true, upd: now, steps, days: D2.map(e => ev2DayPub(e, now)), moved } }
/* §2.4 переходы статуса: draft → test | reg, test → reg | draft; reg → draft нельзя */
async function ev2Launch(env, ev, o, W) { const to = String(o.mode || ''), from = ev2Status(ev), now = msNow();
  const OK = from === 'draft' ? ['test', 'reg'] : from === 'test' ? ['reg', 'draft'] : [];
  if (!OK.includes(to)) return { ok: false, err: from === 'reg' || from === 'done' ? 'Регистрация уже идёт — в' + NB + 'черновик не' + NB + 'вернуть' : 'Так статус не' + NB + 'меняется' };
  if (to !== 'draft') { const C = await ev2Check(env, ev); if (C.must.length) return { ok: false, err: 'Запуску мешают ' + C.must.length + ' ' + ev2Pl(C.must.length, 'шаг', 'шага', 'шагов'), must: C.must } }
  const q = [env.DB.prepare('UPDATE efir_event SET status=?, upd=? WHERE id=?').bind(to, now, ev.id)];
  if (to === 'draft') q.push(env.DB.prepare("UPDATE efir SET status='draft', upd=? WHERE del=0 AND kind='open' AND status='plan' AND CAST(json_extract(cfg, '$.ev') AS INTEGER)=?").bind(now, ev.id));
  else q.push(env.DB.prepare("UPDATE efir SET status='plan', upd=? WHERE del=0 AND kind='open' AND status='draft' AND CAST(json_extract(cfg, '$.ev') AS INTEGER)=?").bind(now, ev.id));
  await env.DB.batch(q); ev.status = to; const steps = await ev2SaveSteps(env, ev); await logIt(env, 'ev-launch', W.uid, ev.id + ' ' + from + '→' + to);
  return { ok: true, status: to, steps } }
/* «Дублировать» (1.1, 1.2): копия настроек, дней без дат, материалов и меток — черновиком */
async function ev2Dup(env, ev, W) { const now = msNow(), D = await ev2Days(env, ev.id), type = ev2Type(ev, D);
  const r = await env.DB.prepare("INSERT INTO efir_event (title, about, cover, offer, funnel, created, upd, reg, type, status, host, fmt, dur, short, sale, access, rec, named) VALUES (?,?,?,?,?,?,?,?,?, 'draft', ?,?,?,?,?,?,?, 1) RETURNING id")
    .bind(bStr((ev.title || '') + ' (копия)', 140), ev.about || '', ev.cover || null, ev.offer || null, ev.funnel || null, now, now, ev.reg || JSON.stringify(EV_REG_NEW), type, ev.host || 'admin', ev.fmt || 'obs', ev.dur || 90, ev.short || '', ev.sale ? ev3DupSale(ev) : null, ev.access || null, ev.rec || null).first();
  const q = [env.DB.prepare("INSERT OR IGNORE INTO ev_src (ev_id, code, title, at) SELECT ?, code, title, ? FROM ev_src WHERE ev_id=?").bind(r.id, now, ev.id),
    env.DB.prepare("INSERT OR IGNORE INTO ev_src (ev_id, code, title, at) VALUES (?, '', 'Основная', ?)").bind(r.id, now), env.DB.prepare("INSERT OR IGNORE INTO ev_src (ev_id, code, title, at) VALUES (?, 'site', 'Сайт', ?)").bind(r.id, now),
    env.DB.prepare('INSERT INTO ev_mat (ev_id, kind, data, days, ord, del, at) SELECT ?, kind, data, days, ord, 0, ? FROM ev_mat WHERE ev_id=? AND del=0').bind(r.id, now, ev.id)];
  D.filter(e => !efJ(e.cfg, {}).hide).forEach((e, i) => { const c0 = efJ(e.cfg, {}), c = { ev: r.id, ord: i }; for (const k of ['short', 'access', 'rec_days', 'rec_hide', 'fmt', 'lead']) if (c0[k] != null) c[k] = c0[k];
    q.push(env.DB.prepare("INSERT INTO efir (title, about, host_cid, host_uid, host_name, start, dur, kind, tariff, status, cfg, chapters, created, upd) VALUES (?, ?, ?, ?, ?, NULL, ?, 'open', ?, 'draft', ?, '[]', ?, ?)")
      .bind(e.title || '', e.about || '', e.host_cid || 'admin', e.host_uid || efAdminUid(env), e.host_name || 'Роман Одуванов', e.dur || 90, e.tariff || 'open', JSON.stringify(c), now, now)) });
  await env.DB.batch(q); const nv = await evGet(env, r.id); await ev2SaveSteps(env, nv); await logIt(env, 'ev-dup', W.uid, ev.id + '→' + r.id); return { ok: true, id: r.id } }
/* списки 1.1 / 1.2: мероприятия своего типа (+ в 1.1 эфиры Романа для учеников без мероприятия), счётчики одним набором запросов */
async function ev2List(env, type) { const now = msNow(), t = type === 'mar' ? 'mar' : 'web';
  const EVS = await qAll(env.DB.prepare("SELECT * FROM efir_event WHERE del=0 AND COALESCE(type,'')<>'auto' ORDER BY id DESC LIMIT 200")), ids = EVS.map(e => +e.id);
  const DA = ids.length ? await qAll(env.DB.prepare("SELECT id, title, start, dur, status, cfg, host_cid, host_name, at_live, at_end, CAST(json_extract(cfg, '$.ev') AS INTEGER) ev FROM efir WHERE del=0 AND kind='open' AND status<>'cancel' AND CAST(json_extract(cfg, '$.ev') AS INTEGER) IN (" + ids.join(',') + ') ORDER BY COALESCE(json_extract(cfg, \'$.ord\'), 999), COALESCE(start, 0), id')) : [];
  const byEv = {}; for (const d of DA) (byEv[d.ev] = byEv[d.ev] || []).push(d);
  const mine = EVS.filter(ev => ev2Type(ev, byEv[ev.id]) === t), EF = t === 'web' ? await qAll(env.DB.prepare("SELECT id, kind, title, start, dur, status, cfg, tariff, host_cid, host_name, at_live, at_end FROM efir WHERE del=0 AND status<>'cancel' AND COALESCE(host_cid,'admin') IN ('admin','') AND ((kind='live' AND json_extract(cfg, '$.ev') IS NULL) OR (kind='open' AND status<>'draft' AND (json_extract(cfg, '$.ev') IS NULL OR NOT EXISTS (SELECT 1 FROM efir_event v WHERE v.del=0 AND v.id=CAST(json_extract(efir.cfg, '$.ev') AS INTEGER))))) ORDER BY start DESC LIMIT 200")) : []; /* 07.11 Э4 (долг Э2, §6.4 1.1, §10): эфиры Романа для учеников и открытые эфиры без мероприятия */
  const evIds = mine.map(e => +e.id), dayIds = [].concat(...mine.map(e => (byEv[e.id] || []).map(d => +d.id))), efIds = EF.map(e => +e.id), allEf = dayIds.concat(efIds);
  const Q = []; if (evIds.length) Q.push(env.DB.prepare('SELECT ev_id, COUNT(*) n FROM ev_reg WHERE COALESCE(test,0)=0 AND ev_id IN (' + evIds.join(',') + ') GROUP BY ev_id'),
    env.DB.prepare('SELECT ev_id, COUNT(*) n FROM ev_form WHERE COALESCE(test,0)=0 AND ev_id IN (' + evIds.join(',') + ') GROUP BY ev_id'));
  if (allEf.length) Q.push(env.DB.prepare('SELECT efir_id, k, MAX(last) last FROM efir_seen WHERE sess=0 AND efir_id IN (' + allEf.join(',') + ') GROUP BY efir_id, k'),
    env.DB.prepare('SELECT efir_id, k, COUNT(*) n FROM efir_lead WHERE efir_id IN (' + allEf.join(',') + ') GROUP BY efir_id, k'),
    env.DB.prepare('SELECT efir_id, COUNT(*) n FROM efir_reg WHERE efir_id IN (' + allEf.join(',') + ') GROUP BY efir_id'));
  const RS = Q.length ? await env.DB.batch(Q) : [], res = i => (RS[i] && RS[i].results) || [];
  const RG = {}, FM = {}, SN = {}, LD = {}, ER = {}, ON = {}; let i0 = 0;
  if (evIds.length) { for (const x of res(0)) RG[x.ev_id] = x.n; for (const x of res(1)) FM[x.ev_id] = x.n; i0 = 2 }
  if (allEf.length) { for (const x of res(i0)) { (SN[x.efir_id] = SN[x.efir_id] || new Set()).add(x.k); if (x.last > now - 9e4) ON[x.efir_id] = (ON[x.efir_id] || 0) + 1 } for (const x of res(i0 + 1)) (LD[x.efir_id] = LD[x.efir_id] || []).push(x); for (const x of res(i0 + 2)) ER[x.efir_id] = x.n }
  const hasRec = await env.DB.prepare("SELECT COUNT(*) n FROM efir WHERE del=0 AND kind IN ('open','live') AND status IN ('done','rec') AND rec IS NOT NULL AND rec<>'' AND rec<>'null'").first();
  const sig = c => c.signal ? (c.signal.at_on && (!c.signal.at_off || c.signal.at_on > c.signal.at_off) ? 'on' : 'off') : null;
  /* §2.4: reg → done сам — все дни прошли (done/rec) или скрыты, через 1 ч после конца последнего */
  const fin = mine.filter(ev => ev2Status(ev) === 'reg' && (byEv[ev.id] || []).length && (byEv[ev.id] || []).every(d => ['done', 'rec'].includes(d.status) || efJ(d.cfg, {}).hide) && Math.max(...(byEv[ev.id] || []).map(d => d.at_end || d.start || 0)) + 36e5 < now);
  if (fin.length) { await env.DB.batch(fin.map(ev => env.DB.prepare("UPDATE efir_event SET status='done', upd=? WHERE id=? AND status='reg'").bind(now, ev.id))); for (const ev of fin) { ev.status = 'done'; ev.steps = null } }
  const items = [];
  for (const ev of mine) { const D = byEv[ev.id] || [], vis = D.filter(d => !efJ(d.cfg, {}).hide), S = ev2Sale(ev), A = ev2Acc(ev), st = ev2Status(ev), steps = efJ(ev.steps, null) || await ev2SaveSteps(env, ev);
    const came = new Set(); let leads = 0; for (const d of D) { for (const k of SN[d.id] || []) came.add(k); leads += (LD[d.id] || []).reduce((s, x) => s + x.n, 0) }
    const host = ev2Host(ev.host || (D[0] && D[0].host_cid) || 'admin'), live = D.find(d => d.status === 'live');
    items.push({ k: 'ev', id: ev.id, type: t, status: st, title: ev.title || '', short: ev.short || '', host_name: ev2HostShort(host), fmt: ev.fmt === 'room' ? 'room' : (D[0] && efJ(D[0].cfg, {}).room ? 'room' : 'obs'),
      access: { who: A.who, streams: A.streams }, regs: RG[ev.id] | 0, came: came.size, leads, forms: FM[ev.id] | 0, pays: null, mode: S ? S.mode || null : null, steps,
      ready: Object.keys(steps).filter(k => steps[k] === 'd').length, bot: 'https://t.me/' + BOT(env) + '?start=v' + ev.id,
      days: vis.map(d => ({ id: d.id, title: d.title || '', short: efJ(d.cfg, {}).short || '', start: d.start || null, status: d.status })),
      live: live ? { efir_id: live.id, at_live: live.at_live || live.start, online: ON[live.id] | 0, leads: (LD[live.id] || []).reduce((s, x) => s + x.n, 0), sig: sig(efJ(live.cfg, {})) } : null }) }
  for (const e of EF) { const c = efJ(e.cfg, {}), acc = c.access || null;
    items.push({ k: 'efir', id: e.id, efir_id: e.id, status: e.status === 'draft' ? 'draft' : ['done', 'rec'].includes(e.status) ? 'done' : 'reg', day_status: e.status, title: e.title || '', short: c.short || '', host_name: ev2HostShort(e.host_cid || 'admin'), fmt: c.room ? 'room' : 'obs',
      access: e.kind === 'open' || e.tariff === 'open' ? { who: 'open', streams: [] } : { who: 'stream', streams: acc && acc.streams ? acc.streams : [], all: e.tariff === 'all' ? 1 : 0 }, kind: e.kind, regs: null, came: (SN[e.id] || new Set()).size, leads: (LD[e.id] || []).reduce((s, x) => s + x.n, 0), mode: null, steps: null, ready: null, start: e.start || null,
      link: 'https://oduvanovroman.getcourse.ru/teach/control/stream?fs=efir&e=' + e.id, regn: ER[e.id] | 0,
      days: [{ id: e.id, title: e.title || '', short: c.short || '', start: e.start || null, status: e.status }],
      live: e.status === 'live' ? { efir_id: e.id, at_live: e.at_live || e.start, online: ON[e.id] | 0, leads: (LD[e.id] || []).reduce((s, x) => s + x.n, 0), sig: sig(c) } : null }) }
  return { ok: true, now, type: t, items, rec_ok: ((hasRec && hasRec.n) | 0) > 0 ? 1 : 0 } }
/* ===== 07.11 «Эфиры 2.0», этап Э4 (docs/plan/efiry-tz.md v6 §2.2 ev_mat / ev_bc, §3.2, §3.7.6, §6.4 2.4–2.5а, 2.9, §10): материалы, бот (шаг 5), после запуска — разовые сообщения.
   Материалы — ev_mat (kind lead | banner | poll, data JSON, days JSON — id дней, [] = все дни); показывает их пульт Э5 (ev_mat_log). Шаги бота — efir_event.funnel (evClean), id не меняются.
   Разовые — ev_bc; до Paid их отправляет evTick старой очередью (до 30 сообщений за тик вместе с шагами воронки), учёт — ev_sent со step 'bc<id>' (повторов нет). ===== */
const EV4_HIDE = { lead: [0, 5, 10, 15, 30], banner: [0, 5, 15] }, EV4_SEG = ['all', 'came_day', 'miss_day', 'never', 'leads', 'forms'];
const ev4Url = u => /^https:\/\/[^\s"'<>]{4,500}$/.test(String(u || '')) ? String(u) : '';
const ev4Img = (u, origin) => { u = String(u || ''); if (/^\/efir\/cover\?id=\d{1,9}$/.test(u)) return origin ? origin + u : u; return ev4Url(u) || null };
function ev4MatData(kind, d) { d = d && typeof d === 'object' ? d : {}; const sh = bStr(d.short, 24) || undefined;
  if (kind === 'lead') return { title: bStr(d.title, 140), short: sh, sub: bStr(d.sub, 200), btn: bStr(d.btn, 40), hide: EV4_HIDE.lead.includes(+d.hide) ? +d.hide : 15, tg: d.tg === 0 ? 0 : 1 };
  if (kind === 'banner') return { title: bStr(d.title, 140), short: sh, sub: bStr(d.sub, 200), btn: bStr(d.btn, 40) || 'Открыть', url: ev4Url(d.url), ulab: bStr(d.ulab, 80) || undefined, hide: EV4_HIDE.banner.includes(+d.hide) ? +d.hide : 0, img: ev4Img(d.img) || undefined };
  return { q: bStr(d.q, 200), short: sh, opts: (Array.isArray(d.opts) ? d.opts : []).map(x => bStr(x, 80)).filter(Boolean).slice(0, 6), show_res: d.show_res === 0 ? 0 : 1, multi: d.multi ? 1 : 0 } }
function ev4MatErr(kind, d) { if (kind === 'lead') return !d.title ? 'Напиши заголовок блока' : !d.btn ? 'Напиши текст кнопки' : '';
  if (kind === 'banner') return !d.title ? 'Напиши заголовок' : !d.url ? 'Вставь ссылку — она начинается с https://' : '';
  return !d.q ? 'Напиши вопрос' : d.opts.length < 2 ? 'Нужно хотя бы 2 варианта' : '' }
/* список материалов; shown — сейчас показан в идущем эфире (его нельзя удалить: «сначала убери в пульте») */
async function ev4Mats(env, ev) { const L = await qAll(env.DB.prepare('SELECT id, kind, data, days, ord FROM ev_mat WHERE ev_id=? AND del=0 ORDER BY ord, id').bind(ev.id)), ids = L.map(m => +m.id);
  const on = ids.length ? await qAll(env.DB.prepare("SELECT l.mat_id FROM ev_mat_log l JOIN efir e ON e.id=l.efir_id WHERE l.at_off IS NULL AND e.status='live' AND l.mat_id IN (" + ids.join(',') + ')')) : [];
  return { ok: true, mats: L.map(m => ({ id: m.id, kind: m.kind, data: efJ(m.data, {}), days: efJ(m.days, []) || [], ord: m.ord | 0, shown: on.some(x => +x.mat_id === +m.id) ? 1 : 0 })) } }
/* POST /efir/host/event/mat {ev, act: save|del|dup|ord, id?, kind, data, days[]}; правка действует со следующего показа (пульт берёт данные при показе) */
async function ev4MatPost(env, ev, o, W) { const now = msNow(), act = String(o.act || 'save'); let id = +o.id || 0;
  const one = id ? await env.DB.prepare('SELECT * FROM ev_mat WHERE id=? AND ev_id=? AND del=0').bind(id, ev.id).first() : null; if (id && !one) return { ok: false, err: 'Материал не найден — обнови страницу' };
  const mx = async () => (((await env.DB.prepare('SELECT MAX(ord) m FROM ev_mat WHERE ev_id=? AND del=0').bind(ev.id).first()) || {}).m | 0) + 1;
  if (act === 'del') { if (!one) return { ok: false, err: 'Материал не найден' }; const M = await ev4Mats(env, ev); if ((M.mats.find(m => m.id === id) || {}).shown) return { ok: false, err: 'Материал сейчас показан — сначала убери в пульте' };
    await env.DB.prepare('UPDATE ev_mat SET del=1, at=? WHERE id=?').bind(now, id).run() }
  else if (act === 'dup') { if (!one) return { ok: false, err: 'Материал не найден' }; const d = efJ(one.data, {}); if (d.title) d.title = bStr(d.title + ' (копия)', 140); else if (d.q) d.q = bStr(d.q + ' (копия)', 200);
    id = (await env.DB.prepare('INSERT INTO ev_mat (ev_id, kind, data, days, ord, del, at) VALUES (?,?,?,?,?,0,?) RETURNING id').bind(ev.id, one.kind, JSON.stringify(d), one.days || '[]', await mx(), now).first()).id }
  else if (act === 'ord') { const L = (Array.isArray(o.ids) ? o.ids : []).map(Number).filter(Boolean).slice(0, 60); if (L.length) await env.DB.batch(L.map((x, i) => env.DB.prepare('UPDATE ev_mat SET ord=? WHERE id=? AND ev_id=?').bind(i + 1, x, ev.id))) }
  else { const kind = one ? one.kind : String(o.kind || ''); if (!['lead', 'banner', 'poll'].includes(kind)) return { ok: false, err: 'Неизвестный материал' };
    if (kind === 'lead' && (ev2Sale(ev) || {}).mode === 'none' && !one) return { ok: false, err: 'Продаж нет — кнопка заявки не покажется. Включи продажи на шаге 6' };
    const d = ev4MatData(kind, o.data), er = ev4MatErr(kind, d); if (er) return { ok: false, err: er };
    const D = (await ev2Days(env, ev.id)).filter(e => !efJ(e.cfg, {}).hide), want = Array.isArray(o.days) ? o.days.map(Number) : null, dd = want ? want.filter(x => D.some(e => +e.id === x)) : [];
    if (want && !dd.length && D.length) return { ok: false, err: 'Отметь хотя бы один день' };
    const days = !want || dd.length >= D.length ? [] : dd;
    if (one) await env.DB.prepare('UPDATE ev_mat SET data=?, days=?, at=? WHERE id=?').bind(JSON.stringify(d), JSON.stringify(days), now, id).run();
    else id = (await env.DB.prepare('INSERT INTO ev_mat (ev_id, kind, data, days, ord, del, at) VALUES (?,?,?,?,?,0,?) RETURNING id').bind(ev.id, kind, JSON.stringify(d), JSON.stringify(days), await mx(), now).first()).id }
  await logIt(env, 'ev-mat', W.uid || 0, ev.id + ' ' + act + ' ' + (id || ''));
  const steps = await ev2SaveSteps(env, ev); return Object.assign(await ev4Mats(env, ev), { id, steps }) }
/* шаг 5: сколько уже отправлено по каждому шагу и дню (ev_sent, ok=1) — для «Уже отправлено…» в 2.5а */
async function ev4Sent(env, ev) { const L = await qAll(env.DB.prepare("SELECT step, efir_id, COUNT(*) n FROM ev_sent WHERE ev_id=? AND ok=1 AND step NOT LIKE 'bc%' GROUP BY step, efir_id").bind(ev.id)); return { ok: true, sent: L.map(x => ({ step: x.step, efir_id: x.efir_id | 0, n: x.n | 0 })) } }
/* готовый набор шага 5 для нового мероприятия (std — «готовый набор включён», пока шаг не правили) и дожим по режиму продаж (§6.4 2.5; тексты — §12.1) */
function ev4Days(mode, t) { const mar = t !== 'web', nm = mar ? 'марафона' : 'вебинара', pg = { t: mar ? 'Страница марафона' : 'Страница вебинара', u: '{мероприятие}' };
  if (mode === 'form') return [
    { id: 'd1', on: 'days', min: 1440, who: 'noform', title: 'Остались вопросы?', text: '{имя}, остались вопросы после ' + nm + '? Заполни короткую анкету — менеджер напишет и ответит лично.', btns: [{ t: 'Заполнить анкету', u: '{мероприятие}' }], std: 1 },
    { id: 'd2', on: 'days', min: 180, who: 'formopen', title: 'Ты не дозаполнил анкету', text: '{имя}, ты начал заполнять анкету, но не отправил. Это займёт минуту — менеджер ответит лично.', btns: [{ t: 'Дозаполнить анкету', u: '{мероприятие}' }], std: 1 }];
  return [{ id: 'd1', on: 'days', min: 1440, who: 'nolead', title: 'Места заканчиваются', text: '{имя}, места на поток заканчиваются. Если остались вопросы — оставь заявку на странице ' + nm + ', менеджер свяжется и всё расскажет.', btns: [pg], std: 1 },
    { id: 'd2', on: 'days', min: 4320, who: 'nolead', title: 'Последний шанс', off: 1, text: '{имя}, сегодня последний день, когда можно попасть на поток на условиях ' + nm + '.', btns: [pg], std: 1 }] }
function ev4SetNew(t) { const T = { r0: 'Приветствие и расписание', b1: 'Завтра эфир', b2: 'Через час', s0: 'Начинаем' };
  return evFunnelDef().map(s => Object.assign(s, { title: T[s.id], std: 1 })).concat([
    { id: 'a1', on: 'after', min: 60, who: 'came', title: 'Спасибо, что был', text: '{имя}, спасибо, что был на эфире «{эфир_тема}»! Запись уже доступна — пересмотри, если что-то пропустил.', btns: [{ t: 'Смотреть запись', u: '{эфир}' }], std: 1 },
    { id: 'a2', on: 'after', min: 60, who: 'miss', title: 'Ты пропустил', text: '{имя}, эфир «{эфир_тема}» уже прошёл — запись доступна, посмотри, пока она открыта.', btns: [{ t: 'Смотреть запись', u: '{эфир}' }], std: 1 }], ev4Days('sell', t)) }
/* смена режима продаж (§6.4 2.5): «Без продаж» — все шаги «после марафона» выключаются (off_mode, прежнее вкл/выкл — off0), возврат — восстанавливается;
   готовый дожим (std, не правили) меняется на набор режима «Анкеты» / «Продаём»; id шагов (d1, d2) те же */
function ev4FunMode(F0, from, to, t) { let ch = 0; const F = F0.map(s => Object.assign({}, s));
  for (const s of F) { if (s.on !== 'days') continue;
    if (to === 'none' && !s.off_mode) { s.off0 = s.off ? 1 : 0; s.off = 1; s.off_mode = 1; ch = 1 }
    else if (to !== 'none' && s.off_mode) { if (s.off0) s.off = 1; else delete s.off; delete s.off_mode; delete s.off0; ch = 1 } }
  const DY = F.filter(s => s.on === 'days'), want = to === 'form' ? 'noform' : 'nolead';
  if ((to === 'sell' || to === 'form') && DY.length && DY.every(s => s.std) && !DY.some(s => s.who === want)) return F.filter(s => s.on !== 'days').concat(ev4Days(to, t));
  return ch ? F : null }
/* «Прислать себе» — только в свой Telegram (ученик-аккаунт админа или строка tg_admin админа); all:1 — все включённые шаги цепочки по порядку */
async function ev4Chat(env, W) { const me = W.uid ? await env.DB.prepare('SELECT tg_chat FROM student WHERE uid=?').bind(W.uid).first().catch(() => null) : null; if (me && me.tg_chat) return String(me.tg_chat);
  if (W.uid && +W.uid === efAdminUid(env)) { const A = await qAll(env.DB.prepare('SELECT chat, name FROM tg_admin')).catch(() => []), r = A.find(x => /^роман/i.test(String(x.name || '').trim())); if (r) return String(r.chat) }
  return null }
async function ev4Self(env, ev, o, W, origin) { const chat = await ev4Chat(env, W); if (!chat) return { ok: false, err: 'Не нашёл твой Telegram — открой бота школы и нажми «Старт»' };
  const E = await evEfirs(env, ev.id), now = msNow(), L = o.all ? evOn(ev) : [Object.assign({}, o.step || {}, { img: ev4Img((o.step || {}).img, origin) })], steps = evClean(L).slice(0, 12);
  if (!steps.length) return { ok: false, err: 'Пустое сообщение — напиши текст' }; let n = 0, err = '';
  for (const s of steps) { const e = +o.efir ? E.find(x => x.id === +o.efir) : s.on === 'reg' || s.on === 'days' ? evNext(E, now) : (E.find(x => !['done', 'rec'].includes(x.status)) || E[E.length - 1]);
    const j = await evSend(env, chat, await evRender(env, ev, E, e || null, s, { k: 'u' + (W.uid || 0), name: W.name || 'Роман' }), s.img).catch(() => null); if (j && j.ok) n++; else err = (j && j.description) || 'ошибка' }
  await logIt(env, 'ev-self', W.uid || 0, ev.id + ' ' + n + '/' + steps.length);
  return n ? { ok: true, n } : { ok: false, err: 'Telegram не принял сообщение: ' + err } }
/* сегменты разовых (2.9): кому — все записавшиеся (не тест, есть Telegram) / был на дне / не пришёл на день / не был ни разу / оставил заявку / заполнил анкету */
function ev4Seg(E, who) { const idl = E.length ? E.map(e => +e.id).join(',') : '0', f = +who.efir_id || 0, seen = x => 'EXISTS (SELECT 1 FROM efir_seen z WHERE z.k=r.k AND z.sess=0 AND z.efir_id' + x + ')';
  const w = who.seg === 'came_day' ? ' AND ' + seen('=' + f) : who.seg === 'miss_day' ? ' AND NOT ' + seen('=' + f) : who.seg === 'never' ? ' AND NOT ' + seen(' IN (' + idl + ')')
    : who.seg === 'leads' ? ' AND EXISTS (SELECT 1 FROM efir_lead l WHERE l.k=r.k AND l.efir_id IN (' + idl + '))' : who.seg === 'forms' ? ' AND EXISTS (SELECT 1 FROM ev_form fm WHERE fm.ev_id=r.ev_id AND fm.k=r.k AND COALESCE(fm.test,0)=0)' : '';
  return ' FROM ev_reg r LEFT JOIN student s ON s.uid=r.uid WHERE r.ev_id=? AND COALESCE(r.test,0)=0 AND COALESCE(r.chat, s.tg_chat, CASE WHEN substr(r.k,1,1)=\'t\' THEN substr(r.k,2) END) IS NOT NULL' + w }
const ev4BcPub = b => ({ id: b.id, who: efJ(b.who, {}), text: b.text || '', img: b.img || null, btns: efJ(b.btns, []) || [], at_plan: b.at_plan || null, at_sent: b.at_sent || null, n: b.n | 0, ok: b.ok | 0, fail: b.fail | 0, st: b.st || 'plan' });
async function ev4BcGet(env, ev) { await ef2Ensure(env); const E = await evEfirs(env, ev.id), seg = s => env.DB.prepare('SELECT COUNT(*) n' + ev4Seg(E, s)).bind(ev.id);
  const Q = [seg({ seg: 'all' }), seg({ seg: 'never' }), seg({ seg: 'leads' }), seg({ seg: 'forms' })].concat(E.map(e => seg({ seg: 'came_day', efir_id: e.id }))), R = await env.DB.batch(Q), n = i => ((((R[i] || {}).results || [])[0] || {}).n) | 0;
  const L = await qAll(env.DB.prepare("SELECT * FROM ev_bc WHERE ev_id=? AND st<>'del' ORDER BY COALESCE(at_sent, at_plan) DESC, id DESC LIMIT 50").bind(ev.id));
  return { ok: true, now: msNow(), plan: (await kvGet(env, 'cf_plan').catch(() => null)) === 'paid' ? 'paid' : 'free', mode: (ev2Sale(ev) || {}).mode || null,
    counts: { all: n(0), never: n(1), leads: n(2), forms: n(3), days: E.map((e, i) => ({ id: e.id, came: n(4 + i), miss: Math.max(0, n(0) - n(4 + i)) })) }, list: L.map(ev4BcPub) } }
/* POST /efir/host/event/bc {v:2, act: self|send|plan|edit|cancel, id?, who:{seg, efir_id}, text, img, btns, at} */
async function ev4BcPost(env, ev, o, W, origin) { await ef2Ensure(env); const now = msNow(), act = String(o.act || ''), E = await evEfirs(env, ev.id);
  const who = { seg: EV4_SEG.includes((o.who || {}).seg) ? o.who.seg : 'all' }; if (who.seg === 'came_day' || who.seg === 'miss_day') { const f = +(o.who || {}).efir_id || 0; if (!E.some(e => e.id === f)) return { ok: false, err: 'Выбери день' }; who.efir_id = f }
  const text = bStr(String(o.text || ''), 3500), img = ev4Img(o.img, origin), btns = evClean([{ on: 'reg', text: 'x', btns: o.btns }])[0].btns;
  if (act === 'self') return ev4Self(env, ev, { step: { on: 'reg', text, btns, img }, efir: who.efir_id }, W, origin);
  if (act === 'cancel' || act === 'edit') { const b = await env.DB.prepare('SELECT * FROM ev_bc WHERE id=? AND ev_id=?').bind(+o.id || 0, ev.id).first(); if (!b) return { ok: false, err: 'Рассылка не найдена' };
    if (b.st !== 'plan' || (b.at_plan || 0) <= now) return { ok: false, err: 'Рассылка уже отправляется — изменить нельзя' };
    if (act === 'cancel') { await env.DB.prepare("UPDATE ev_bc SET st='cancel', upd=? WHERE id=? AND st='plan'").bind(now, b.id).run(); await logIt(env, 'ev-bc2', W.uid || 0, ev.id + ' cancel ' + b.id); return ev4BcGet(env, ev) } }
  if (act !== 'send' && act !== 'plan' && act !== 'edit') return { ok: false, err: 'Неизвестное действие' };
  if (!text.trim()) return { ok: false, err: 'Напиши текст сообщения' };
  const at = act === 'send' ? now : +o.at || 0; if (act !== 'send' && (at < now + 6e4 || at > now + 60 * 864e5)) return { ok: false, err: 'Выбери время в будущем — не раньше чем через минуту' };
  const c = await env.DB.prepare('SELECT COUNT(*) n' + ev4Seg(E, who)).bind(ev.id).first(), n = (c && c.n) | 0; if (!n) return { ok: false, err: 'В этом сегменте пока никого нет — некому отправлять' };
  if (act === 'edit') await env.DB.prepare("UPDATE ev_bc SET who=?, text=?, img=?, btns=?, at_plan=?, n=?, upd=? WHERE id=? AND st='plan'").bind(JSON.stringify(who), text, img, JSON.stringify(btns), at, n, now, +o.id).run();
  else await env.DB.prepare("INSERT INTO ev_bc (ev_id, who, text, img, btns, at_plan, at_sent, n, ok, st, fail, by_uid, upd) VALUES (?,?,?,?,?,?,NULL,?,0,'plan',0,?,?)").bind(ev.id, JSON.stringify(who), text, img, JSON.stringify(btns), at, n, W.uid || null, now).run();
  await logIt(env, 'ev-bc2', W.uid || 0, ev.id + ' ' + act + ' ' + who.seg + (who.efir_id ? ':' + who.efir_id : '') + ' ' + n);
  return ev4BcGet(env, ev) }
/* отправка разовых старой очередью (Free, §3.7.6): созревшие ev_bc → по 30 за тик вместе с шагами воронки; n — получателей на старте, ok / fail — итог; «дошло N%» = ok / n */
async function ev4BcTick(env, out, LIM) { await ef2Ensure(env); const now = msNow(); let BC = [];
  try { BC = await qAll(env.DB.prepare("SELECT * FROM ev_bc WHERE st IN ('plan','run') AND COALESCE(at_plan,0)<=? ORDER BY at_plan, id LIMIT 3").bind(now)) } catch (e) { return }
  for (const b of BC) { if (out.sent + out.fail >= LIM) break; const ev = await evGet(env, b.ev_id); if (!ev) { await env.DB.prepare("UPDATE ev_bc SET st='cancel' WHERE id=?").bind(b.id).run(); continue }
    const who = efJ(b.who, {}), E = await evEfirs(env, ev.id), W = ev4Seg(E, who);
    if (b.st === 'plan') { const c = await env.DB.prepare('SELECT COUNT(*) n' + W).bind(ev.id).first(); await env.DB.prepare("UPDATE ev_bc SET st='run', n=? WHERE id=? AND st='plan'").bind((c && c.n) | 0, b.id).run() }
    const rem = LIM - out.sent - out.fail, R = await qAll(env.DB.prepare('SELECT r.*, s.tg_chat' + W + ' AND NOT EXISTS (SELECT 1 FROM ev_sent x WHERE x.ev_id=r.ev_id AND x.step=? AND x.efir_id=0 AND x.k=r.k) ORDER BY r.at LIMIT ?').bind(ev.id, 'bc' + b.id, rem));
    const s = { text: b.text, btns: efJ(b.btns, []) || [] }, e0 = who.efir_id ? E.find(x => x.id === +who.efir_id) : null; let ok = 0, fail = 0;
    for (const r of R) { const chat = r.chat || r.tg_chat || (r.k[0] === 't' ? r.k.slice(1) : null), ins = await env.DB.prepare('INSERT OR IGNORE INTO ev_sent (ev_id, step, efir_id, k, ok, at) VALUES (?,?,0,?,1,?)').bind(ev.id, 'bc' + b.id, r.k, now).run();
      if (!ins.meta || !ins.meta.changes) continue; const j = chat ? await evSend(env, chat, await evRender(env, ev, E, e0 || evNext(E, now), s, r), b.img).catch(() => null) : null; if (j && j.ok) ok++; else fail++ }
    out.sent += ok; out.fail += fail; const done = R.length < rem ? 1 : 0;
    await env.DB.prepare("UPDATE ev_bc SET ok=COALESCE(ok,0)+?, fail=COALESCE(fail,0)+?, st=CASE WHEN ?=1 THEN 'sent' ELSE st END, at_sent=CASE WHEN ?=1 THEN ? ELSE at_sent END WHERE id=?").bind(ok, fail, done, done, now, b.id).run();
    if (done) await logIt(env, 'ev-bc2', 0, ev.id + ' sent ' + b.id) } }
/* потоки и тарифы для «Ученики потока» (2.7): уникальные значения из рейтинга (data.json) */
async function ev2Streams(env) { let D = null; try { D = await loadData(env) } catch (e) {} const S = new Set(), T = new Set();
  for (const r of (D && D.rows) || []) { if (r.stream) S.add(String(r.stream)); if (r.tar) T.add(String(r.tar)) } if (D && D.stream) S.add(String(D.stream));
  return { ok: true, streams: [...S].sort(), tariffs: [...T].sort() } }
/* §6.4 2.7: «Ученики потока» — ученик подходит, если его поток в streams и (тарифы пусты или его тариф в tariffs); поток и тариф — из рейтинга (data.json) */
async function ev2CanAcc(env, A, W) { if (!W || !W.uid) return false; let D = null; try { D = await loadData(env) } catch (e) { return false }
  const r = ((D && D.rows) || []).find(x => x.uid != null && +x.uid === +W.uid); if (!r) return false; const st = String(r.stream || D.stream || ''), S = A.streams || [], T = A.tariffs || [];
  return (!S.length || S.includes(st)) && (!T.length || T.includes(String(r.tar || ''))) }
/* справочник продуктов ev_prod (§3.2): GET — список, POST {id?, title, price, code} — сохранить, {id, del:1} — удалить */
async function ev2Prod(env, req, o, W) { const now = msNow();
  if (req.method === 'POST') { if (o.del && +o.id) { await env.DB.prepare('UPDATE ev_prod SET del=1, at=? WHERE id=?').bind(now, +o.id).run(); return { ok: true } }
    const t = bStr(o.title, 200); if (!t) return { ok: false, err: 'Напиши название продукта' }; const p = Math.max(0, Math.min(1e8, +String(o.price || 0).replace(/\D/g, '') | 0)), c = bStr(o.code, 60) || null;
    if (+o.id) { await env.DB.prepare('UPDATE ev_prod SET title=?, price=?, code=?, at=? WHERE id=?').bind(t, p, c, now, +o.id).run(); return { ok: true, id: +o.id } }
    const r = await env.DB.prepare('INSERT INTO ev_prod (title, price, code, del, at) VALUES (?,?,?,0,?) RETURNING id').bind(t, p, c, now).first(); await logIt(env, 'ev-prod', W.uid, r.id + ' ' + t); return { ok: true, id: r.id } }
  return { ok: true, prods: await qAll(env.DB.prepare('SELECT id, title, price, code FROM ev_prod WHERE del=0 ORDER BY at DESC LIMIT 200')) } }
/* ===== 07.11 «Эфиры 2.0», этап Э3 (docs/plan/efiry-tz.md v6 §2.1 sale, §3.2, §5, §6.4 2.6–2.6в): режимы продаж, продукт из справочника, анкеты (своя форма / Google Форма),
   скрипт Google Таблицы (server/gas/efiry.gs — GAS_SRC ниже, копия 1:1; server/test_efir_form.js сверяет), очередь записи ev_form_q, статусы менеджеров, защита анкет от накрутки.
   Токен скрипта (sale.token, 32 hex) — секрет мероприятия: наружу — только в тексте скрипта для админа, в логи не пишется. Персональные данные анкет — только в D1 (ev_form) и в таблице заказчика. ===== */
const GAS_SRC = "/* OduvanovSchool · Эфиры: анкеты и заявки → эта Google Таблица (ТЗ docs/plan/efiry-tz.md §5.1).\n   Один скрипт на таблицу. Вставить: «Расширения» → «Apps Script» → заменить всё этим текстом → «Развернуть» → «Новое развёртывание» →\n   «Веб-приложение», запуск от моего имени, доступ «Все» → ссылку развёртывания (…/exec) вставить на шаге 6 мастера.\n   Ключей Google Cloud не нужно. Скрипт отвечает только тому, кто знает код мероприятия (TOKEN). Наружу отдаёт только то, что пишет сам. */\nvar EV_ID = '{{EV_ID}}';\nvar TOKEN = '{{TOKEN}}';\nvar HOOK = '{{HOOK}}';\nvar BASE = ['дата и время', 'эфир · день', 'минута эфира', 'имя', 'телефон', 'почта', 'Telegram', 'откуда пришёл (UTM)', 'сколько смотрел'];\nvar STATUS = 'статус менеджера';\nvar KEY = 'k';\n\nfunction out_(x) { return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON) }\nfunction same_(a, b) { a = String(a || ''); b = String(b || ''); if (!a || a.length !== b.length) return false; var x = 0; for (var i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0 }\n\nfunction doGet() { return out_({ ok: false }) }\n\nfunction doPost(e) {\n  var o = {};\n  try { o = JSON.parse((e && e.postData && e.postData.contents) || '{}') } catch (x) { return out_({ ok: false }) }\n  if (!same_(o.token, TOKEN)) return out_({ ok: false });\n  var lock = LockService.getScriptLock();\n  try { lock.waitLock(20000) } catch (x) { return out_({ ok: false, err: 'busy' }) }\n  try {\n    if (o.op === 'rows') return out_(rows_(o));\n    if (o.op === 'test') return out_(test_(o));\n    if (o.op === 'status') return out_(status_(o));\n    return out_({ ok: false, err: 'op' });\n  } catch (x) {\n    return out_({ ok: false, err: String(x && x.message || x).slice(0, 200) });\n  } finally { lock.releaseLock() }\n}\n\n/* лист с заголовками: базовые колонки, по колонке на вопрос, «статус менеджера», скрытая последняя k */\nfunction sheet_(name, qs) {\n  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);\n  if (!sh) {\n    sh = ss.insertSheet(name);\n    var head = BASE.concat(qs || []).concat([STATUS, KEY]);\n    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');\n    sh.setFrozenRows(1); sh.hideColumns(head.length);\n    return sh;\n  }\n  var H = head_(sh), st = H.indexOf(STATUS);\n  (qs || []).forEach(function (q) {\n    if (H.indexOf(q) >= 0) return;\n    var at = st >= 0 ? st + 1 : H.length + 1;\n    sh.insertColumnBefore(at); sh.getRange(1, at).setValue(q).setFontWeight('bold');\n    H = head_(sh); st = H.indexOf(STATUS);\n  });\n  if (H.indexOf(STATUS) < 0) { sh.getRange(1, H.length + 1).setValue(STATUS).setFontWeight('bold'); H = head_(sh) }\n  if (H.indexOf(KEY) < 0) { sh.getRange(1, H.length + 1).setValue(KEY); sh.hideColumns(H.length + 1) }\n  return sh;\n}\nfunction head_(sh) { var n = sh.getLastColumn(); return n ? sh.getRange(1, 1, 1, n).getValues()[0].map(function (x) { return String(x) }) : [] }\n\n/* пачка до 100 строк {sheet, qs:[вопросы], rows:[{k, at, day, min, name, phone, email, tg, src, watched, a:{вопрос: ответ}}]}; тот же k — обновить строку */\nfunction rows_(o) {\n  var L = (o.rows || []).slice(0, 100), sh = sheet_(o.sheet === 'Заявки' ? 'Заявки' : 'Анкеты', o.qs || []), H = head_(sh), kc = H.indexOf(KEY) + 1, out = [];\n  var last = sh.getLastRow(), K = last > 1 ? sh.getRange(2, kc, last - 1, 1).getValues().map(function (r) { return String(r[0]) }) : [];\n  L.forEach(function (r) {\n    var v = H.map(function (h, i) {\n      var b = BASE.indexOf(h);\n      if (b === 0) return r.at || ''; if (b === 1) return r.day || ''; if (b === 2) return r.min == null ? '' : r.min; if (b === 3) return r.name || '';\n      if (b === 4) return r.phone ? \"'\" + r.phone : ''; if (b === 5) return r.email || ''; if (b === 6) return r.tg || ''; if (b === 7) return r.src || ''; if (b === 8) return r.watched || '';\n      if (h === STATUS) return null; if (h === KEY) return r.k || '';\n      var a = (r.a || {})[h]; return a == null ? '' : Array.isArray(a) ? a.join(', ') : a;\n    });\n    var at = r.k ? K.indexOf(String(r.k)) : -1, row;\n    if (at >= 0) { row = at + 2; v.forEach(function (x, i) { if (x !== null) sh.getRange(row, i + 1).setValue(x) }) }\n    else { row = sh.getLastRow() + 1; sh.getRange(row, 1, 1, v.length).setValues([v.map(function (x) { return x === null ? '' : x })]); K.push(String(r.k || '')) }\n    out.push({ k: r.k, row: row });\n  });\n  return { ok: true, rows: out };\n}\n\n/* проверка: таблица не привязана к форме — тестовая строка «тест»; привязана — только ставим триггер onFormSubmit (если его ещё нет) */\nfunction test_(o) {\n  var ss = SpreadsheetApp.getActiveSpreadsheet(), form = '';\n  try { form = ss.getFormUrl() || '' } catch (x) {}\n  if (form) {\n    var have = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'onFormSubmit' });\n    if (!have) ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit().create();\n    return { ok: true, title: ss.getName(), sheet: '', url: ss.getUrl(), form: true, trigger: true };\n  }\n  var name = o.sheet === 'Заявки' ? 'Заявки' : 'Анкеты', sh = sheet_(name, o.qs || []);\n  rows_({ sheet: name, qs: o.qs || [], rows: [{ k: 'test', at: Utilities.formatDate(new Date(), 'Europe/Moscow', 'dd.MM.yyyy HH:mm'), day: 'тест', name: 'тест' }] });\n  return { ok: true, title: ss.getName(), sheet: name, url: ss.getUrl() + '#gid=' + sh.getSheetId(), form: false, trigger: false };\n}\n\n/* статусы менеджеров: {sheet, ks:[k]} — по скрытой колонке k; {sheet, rows:[номер строки]} — для таблицы ответов формы (колонка «статус…») */\nfunction status_(o) {\n  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = o.sheet ? ss.getSheetByName(o.sheet) : null, st = {}, rn = {};\n  if (!sh) return { ok: true, st: st, rn: rn };\n  var H = head_(sh), sc = -1, kc = H.indexOf(KEY), last = sh.getLastRow();\n  H.forEach(function (h, i) { if (sc < 0 && /^статус/i.test(String(h).trim())) sc = i });\n  if (sc < 0 || last < 2) return { ok: true, st: st, rn: rn };\n  var V = sh.getRange(2, 1, last - 1, H.length).getValues(), want = {};\n  (o.ks || []).forEach(function (k) { want[String(k)] = 1 });\n  V.forEach(function (r, i) { if (kc >= 0 && want[String(r[kc])]) st[String(r[kc])] = String(r[sc]) });\n  (o.rows || []).forEach(function (n) { n = +n; if (n >= 2 && n - 2 < V.length) rn[n] = String(V[n - 2][sc]) });\n  return { ok: true, st: st, rn: rn };\n}\n\n/* ответ в Google Форме → нам сразу (устанавливаемый триггер ставит op:\"test\") */\nfunction onFormSubmit(e) {\n  var row = 0, sheet = '';\n  try { row = e.range.getRow(); sheet = e.range.getSheet().getName() } catch (x) {}\n  UrlFetchApp.fetch(HOOK, { method: 'post', contentType: 'application/json', muteHttpExceptions: true,\n    payload: JSON.stringify({ token: TOKEN, ev: EV_ID, named: e.namedValues || {}, values: e.values || [], row: row, sheet: sheet, ts: Date.now() }) });\n}\n";
const EV3_KIND = ['one', 'many', 'text', 'num'], EV3_FREQ = ['req', 'opt', 'off'];
const ev3Hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const ev3Lc = s => String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const ev3Digits = s => String(s || '').replace(/\D/g, '');
/* sale целиком с умолчаниями (§2.1): контакты — имя и телефон обязательно, почта по желанию, Telegram берём из бота сами (доска M6b) */
function ev3Sale(ev, type) { const S0 = ev2Sale(ev) || {}, S = JSON.parse(JSON.stringify(S0)), t = type || ev.type, F = S.form && typeof S.form === 'object' ? S.form : {}, G = F.gform && typeof F.gform === 'object' ? F.gform : {}, fl = F.fields || {};
  return { mode: ['sell', 'form', 'none'].includes(S.mode) ? S.mode : null, offer_id: +S.offer_id || null, legacy: S.legacy ? 1 : 0, order_st: S.order_st === 'work' ? 'work' : 'new',
    comment: typeof S.comment === 'string' ? S.comment : (t === 'web' ? 'Заявка с вебинара «{марафон}», на {минута}-й минуте' : 'Заявка с марафона «{марафон}», день {день}, на {минута}-й минуте'),
    report: S.report === 0 ? 0 : 1, copy_sheet: S.copy_sheet ? 1 : 0,
    form: { src: F.src === 'gform' ? 'gform' : 'own', fields: { name: EV3_FREQ.includes(fl.name) ? fl.name : 'req', phone: EV3_FREQ.includes(fl.phone) ? fl.phone : 'req', email: EV3_FREQ.includes(fl.email) ? fl.email : 'opt', tg: EV3_FREQ.includes(fl.tg) ? fl.tg : 'off' },
      questions: Array.isArray(F.questions) ? F.questions : [], one_per_person: F.one_per_person === 0 ? 0 : 1, dup: F.dup === 0 ? 0 : 1,
      gform: { url: G.url || '', link: G.link || '', title: G.title || '', n: +G.n || 0, accepting: G.accepting === 0 ? 0 : 1, login: G.login ? 1 : 0, open: G.login ? 'tab' : (G.open === 'tab' ? 'tab' : 'inside'), questions: Array.isArray(G.questions) ? G.questions : [], map: G.map && typeof G.map === 'object' ? G.map : {}, test_at: +G.test_at || 0, checked_at: +G.checked_at || 0 } },
    sheet: S.sheet && typeof S.sheet === 'object' ? { exec: S.sheet.exec || '', url: S.sheet.url || '', title: S.sheet.title || '', sheet: S.sheet.sheet || '', ok_at: +S.sheet.ok_at || 0, form: S.sheet.form ? 1 : 0, last_err: S.sheet.last_err || '', fails: +S.sheet.fails || 0, fsheet: S.sheet.fsheet || '' } : null,
    token: /^[0-9a-f]{32}$/.test(S.token || '') ? S.token : '' } }
/* то, что видит мастер (без токена) */
function ev3Pub(S) { const P = JSON.parse(JSON.stringify(S)); delete P.token; delete P.legacy; return P }
const ev3SaleJson = S => { const P = JSON.parse(JSON.stringify(S)); if (!P.legacy) delete P.legacy; return JSON.stringify(P) };
async function ev3Prod(env, S, ev) { let p = S.offer_id ? await env.DB.prepare('SELECT id, title, price, code FROM ev_prod WHERE id=?').bind(+S.offer_id).first() : null;
  if (!p && S.mode === 'sell') { const of = efJ(ev.offer, null); if (of && of.title) p = { id: null, title: of.title, price: +of.price || 0, code: of.code || '' } } return p || null }
/* мастер: изменения sale (POST /efir/host/event/save {sale:{…}}); sheet, token, адрес и вопросы Google Формы меняет только «Проверить» */
async function ev3SaleSave(env, ev, p, D, W) { const type = ev2Type(ev, D), S = ev3Sale(ev, type), now = msNow(), out = {};
  if ('mode' in p) { const m = ['sell', 'form', 'none'].includes(p.mode) ? p.mode : null; if (m !== S.mode && D.some(e => e.status === 'live')) return { err: 'Нельзя сменить во время эфира — только между днями' }; S.mode = m }
  if (p.offer && typeof p.offer === 'object') { const t = bStr(p.offer.title, 200), pr = Math.max(0, Math.min(1e8, +String(p.offer.price == null ? 0 : p.offer.price).replace(/\D/g, '') | 0)), c = bStr(p.offer.code, 60) || null;
    if (!t) { S.offer_id = null; S.legacy = 0; out.offer = null }
    else { /* справочник: тот же продукт — берём его; выбранный правят и он нигде больше не используется — правим; иначе — новый продукт (сохраняется при первом сохранении) */
      const ex = await env.DB.prepare("SELECT id FROM ev_prod WHERE del=0 AND title=? AND COALESCE(price,0)=? AND COALESCE(code,'')=? ORDER BY id LIMIT 1").bind(t, pr, c || '').first();
      let id = ex ? ex.id : 0; const cur = +p.offer.id || 0;
      if (!id && cur) { const used = await env.DB.prepare("SELECT COUNT(*) n FROM efir_event WHERE del=0 AND id<>? AND CAST(json_extract(sale, '$.offer_id') AS INTEGER)=?").bind(ev.id, cur).first(), own = await env.DB.prepare('SELECT id FROM ev_prod WHERE id=? AND del=0').bind(cur).first();
        if (own && !((used && used.n) | 0)) { await env.DB.prepare('UPDATE ev_prod SET title=?, price=?, code=?, at=? WHERE id=?').bind(t, pr, c, now, cur).run(); id = cur } }
      if (!id) { id = (await env.DB.prepare('INSERT INTO ev_prod (title, price, code, del, at) VALUES (?,?,?,0,?) RETURNING id').bind(t, pr, c, now).first()).id; await logIt(env, 'ev-prod', W.uid, id + ' ' + t) }
      S.offer_id = id; S.legacy = 0; out.offer = JSON.stringify({ title: t, price: pr, code: c }); out.prod = { id, title: t, price: pr, code: c || '' } } }
  if ('order_st' in p) S.order_st = p.order_st === 'work' ? 'work' : 'new';
  if ('comment' in p) S.comment = bStr(p.comment, 500);
  if ('report' in p) S.report = p.report ? 1 : 0;
  if ('copy_sheet' in p) S.copy_sheet = p.copy_sheet ? 1 : 0;
  const F = p.form && typeof p.form === 'object' ? p.form : null;
  if (F) { const f = S.form;
    if ('src' in F) f.src = F.src === 'gform' ? 'gform' : 'own';
    if (F.fields && typeof F.fields === 'object') for (const k of ['name', 'phone', 'email', 'tg']) if (EV3_FREQ.includes(F.fields[k])) f.fields[k] = F.fields[k];
    if (Array.isArray(F.questions)) { const seen = new Set(); f.questions = F.questions.slice(0, 6).map(q => { q = q && typeof q === 'object' ? q : {}; let id = /^q[a-z0-9]{1,12}$/.test(String(q.id || '')) ? String(q.id) : 'q' + ev3Hex(4); while (seen.has(id)) id = 'q' + ev3Hex(4); seen.add(id);
      const kind = EV3_KIND.includes(q.kind) ? q.kind : 'one'; return { id, t: bStr(q.t, 200), kind, opts: kind === 'one' || kind === 'many' ? (Array.isArray(q.opts) ? q.opts : []).map(x => bStr(x, 80)).filter(Boolean).slice(0, 10) : [], req: q.req === 0 || q.req === false ? 0 : 1 } }).filter(q => q.t) }
    if ('one_per_person' in F) f.one_per_person = F.one_per_person ? 1 : 0;
    if ('dup' in F) f.dup = F.dup ? 1 : 0;
    const G = F.gform && typeof F.gform === 'object' ? F.gform : null;
    if (G) { if ('open' in G) f.gform.open = f.gform.login ? 'tab' : (G.open === 'tab' ? 'tab' : 'inside');
      if (G.map && typeof G.map === 'object') for (const k of ['name', 'phone', 'email', 'mark']) if (k in G.map) { const v = G.map[k], q = v && f.gform.questions.find(x => String(x.entry) === String(v.entry || v));
        if (q) f.gform.map[k] = { entry: String(q.entry), title: q.title }; else f.gform.map[k] = null } } } /* null — «не подставлять» (повторная проверка формы не угадывает заново) */
  out.json = ev3SaleJson(S); out.S = S; return out }
/* текст скрипта для «Скопировать скрипт»: код мероприятия и токен уже подставлены; токен создаётся при первом запросе */
async function ev3Token(env, ev) { const S = ev3Sale(ev); if (S.token) return S; S.token = ev3Hex(16); ev.sale = ev3SaleJson(S); await env.DB.prepare('UPDATE efir_event SET sale=? WHERE id=?').bind(ev.sale, ev.id).run(); return S }
async function ev3Script(env, ev, origin) { const S = await ev3Token(env, ev); return GAS_SRC.replace('{{EV_ID}}', String(ev.id)).replace('{{TOKEN}}', S.token).replace('{{HOOK}}', origin + '/efir/form/hook') }
const EV3_EXEC = /^https:\/\/script\.google\.com\/(?:a\/[A-Za-z0-9.-]{1,80}\/)?macros\/s\/[A-Za-z0-9_-]{20,120}\/exec$/;
/* запрос к скрипту таблицы (Apps Script отвечает 302 на script.googleusercontent.com — fetch идёт следом сам) */
async function ev3Gas(env, exec, body) { if (!EV3_EXEC.test(exec)) return { bad: 'url' };
  let r; try { r = await fetch(exec, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', signal: AbortSignal.timeout ? AbortSignal.timeout(25000) : undefined }) } catch (e) { return { bad: 'net' } }
  const t = await r.text().catch(() => ''); let j = null; try { j = JSON.parse(t) } catch (e) {} if (!j || typeof j !== 'object') return { bad: 'html', st: r.status }; return { j } }
const EV3_ERR = { url: 'Это не ссылка развёртывания: она начинается с https://script.google.com/macros/s/ и заканчивается на /exec', net: 'Скрипт не ответил — проверь ссылку и попробуй ещё раз',
  html: 'Скрипт не пустил нас — при развёртывании выбери «Веб-приложение», запуск от моего имени, доступ «Все»', token: 'Скрипт ответил, но код марафона не совпал — скопируй скрипт заново кнопкой «Скопировать скрипт»',
  form: 'Эта таблица не связана с формой — в форме открой «Ответы» → «Связать с Таблицами» и вставь скрипт в эту таблицу ответов' };
/* «Проверить» ссылку развёртывания (2.6б, 2.6в шаг 3, копия заявок 2.6): op:test — тестовая строка или триггер формы */
async function ev3CheckSheet(env, ev, o, W) { const D = await ev2Days(env, ev.id), S0 = await ev3Token(env, ev), S = ev3Sale(ev), exec = String(o.exec || '').trim().replace(/\?.*$/, ''), now = msNow();
  const sheet = S.mode === 'sell' ? 'Заявки' : 'Анкеты', qs = S.mode === 'form' && S.form.src === 'own' ? S.form.questions.map(q => q.t) : [];
  const r = await ev3Gas(env, exec, { token: S0.token, op: 'test', sheet, qs }); let err = r.bad ? EV3_ERR[r.bad] : !r.j.ok ? EV3_ERR.token : '';
  if (!err && S.mode === 'form' && S.form.src === 'gform' && !r.j.form) err = EV3_ERR.form;
  if (err) { const sh = S.sheet || { exec: '', url: '', title: '', sheet: '', ok_at: 0, form: 0, fails: 0 }; sh.last_err = err; if (r.j && r.j.ok && !r.j.form) Object.assign(sh, { exec, url: bStr(r.j.url, 400), title: bStr(r.j.title, 200), sheet: bStr(r.j.sheet, 100), ok_at: now, form: 0 }); S.sheet = sh;
    await env.DB.prepare('UPDATE efir_event SET sale=?, upd=? WHERE id=?').bind(ev3SaleJson(S), now, ev.id).run(); ev.sale = ev3SaleJson(S); ev.upd = now; const steps = await ev2SaveSteps(env, ev, D);
    await logIt(env, 'ev-sheet-err', W.uid, ev.id + ' ' + (r.bad || 'ok:' + (r.j && r.j.ok) + ' form:' + (r.j && r.j.form))); return { ok: false, err, sheet: ev3Pub(S).sheet, steps, upd: now } }
  S.sheet = { exec, url: bStr(r.j.url, 400), title: bStr(r.j.title, 200), sheet: bStr(r.j.sheet, 100), ok_at: now, form: r.j.form ? 1 : 0, last_err: '', fails: 0, fsheet: (S.sheet && S.sheet.fsheet) || '' };
  ev.sale = ev3SaleJson(S); ev.upd = now; await env.DB.prepare('UPDATE efir_event SET sale=?, upd=? WHERE id=?').bind(ev.sale, now, ev.id).run(); const steps = await ev2SaveSteps(env, ev, D);
  await logIt(env, 'ev-sheet-ok', W.uid, ev.id + ' form:' + (r.j.form ? 1 : 0)); return { ok: true, sheet: ev3Pub(S).sheet, steps, upd: now } }
/* «Проверить» Google Форму (2.6в): название, вопросы с entry, принимает ли ответы, открыта ли всем (вход Google — ошибка §5.2) */
function ev3FormUrl(u) { u = String(u || '').trim(); let m = u.match(/^https:\/\/forms\.gle\/([A-Za-z0-9_-]{4,40})\/?$/); if (m) return 'https://forms.gle/' + m[1];
  m = u.match(/^https:\/\/docs\.google\.com\/forms\/(?:u\/\d\/)?d\/(e\/)?([A-Za-z0-9_-]{10,120})(?:\/[a-z]*)?\/?(?:[?#].*)?$/); return m ? 'https://docs.google.com/forms/d/' + (m[1] || '') + m[2] + '/viewform' : '' }
function ev3FormParse(html) { const m = String(html).match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/); if (!m) return null; let d; try { d = JSON.parse(m[1]) } catch (e) { return null }
  const it = (d[1] && d[1][1]) || [], Q = [], T = { 0: 'text', 1: 'text', 2: 'one', 3: 'one', 4: 'many', 5: 'one', 9: 'text', 10: 'text' }; let pages = 1;
  for (const x of it) { if (!Array.isArray(x)) continue; if (x[3] === 8) pages++; const e = Array.isArray(x[4]) && x[4][0]; if (!e || e[0] == null) continue; Q.push({ title: bStr(x[1], 200) || 'Вопрос без названия', entry: String(e[0]), kind: T[x[3]] || 'text' }) }
  return { title: bStr((d[1] && d[1][8]) || d[3] || '', 200), questions: Q.slice(0, 60), pages } }
async function ev3CheckForm(env, ev, o, W) { const D = await ev2Days(env, ev.id), S = ev3Sale(ev), now = msNow(); let url = ev3FormUrl(o.url);
  const fail = async (err, x) => { S.form.gform = Object.assign(S.form.gform, x || {}, { checked_at: 0 }); ev.sale = ev3SaleJson(S); ev.upd = now; await env.DB.prepare('UPDATE efir_event SET sale=?, upd=? WHERE id=?').bind(ev.sale, now, ev.id).run();
    const steps = await ev2SaveSteps(env, ev, D); return { ok: false, err, gform: ev3Pub(S).form.gform, steps, upd: now } };
  if (!url) return fail('Это не ссылка на Google Форму — скопируй её в форме: «Отправить» → значок ссылки', { url: '', link: bStr(o.url, 400), title: '', questions: [], n: 0 });
  const lnk = { link: bStr(o.url, 400) };
  let html = '', login = 0, closed = 0, cur = url;
  for (let i = 0; i < 5; i++) { let r; try { r = await fetch(cur, { redirect: 'manual', headers: { 'Accept-Language': 'ru' }, signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined }) } catch (e) { return { ok: false, err: 'Google не ответил — попробуй ещё раз' } }
    if (r.status >= 300 && r.status < 400) { const loc = new URL(r.headers.get('Location') || '', cur); if (/(^|\.)accounts\.google\.com$/.test(loc.hostname)) { login = 1; break }
      if (!/^(docs\.google\.com|forms\.gle)$/.test(loc.hostname)) return { ok: false, err: 'Ссылка ведёт не на Google Форму' }; cur = loc.href; continue }
    if (r.status === 404) return fail('Форма не найдена — проверь ссылку', Object.assign({ url, title: '', questions: [], n: 0 }, lnk)); html = await r.text(); if (/\/closedform/.test(cur)) closed = 1; break }
  const P = login ? null : ev3FormParse(html);
  if (login || (!P && /accounts\.google\.com\/(ServiceLogin|v3\/signin)/.test(html))) return fail('Форма просит вход в Google — в настройках формы сними «Только для пользователей…»', Object.assign({ url: cur.replace(/\?.*$/, ''), login: 1, open: 'tab', title: '', questions: [], n: 0 }, lnk));
  if (!P) return fail(closed ? 'Форма не принимает ответы — включи «Принимать ответы» во вкладке «Ответы»' : 'Не получилось прочитать форму — проверь, что ссылка открывается без входа', Object.assign({ url: cur.replace(/\?.*$/, ''), accepting: closed ? 0 : 1, title: '', questions: [], n: 0 }, lnk));
  const G = S.form.gform, warn = [], old = G.map || {}, map = {};
  /* сопоставление: вопрос переименовали — находим по entry и предупреждаем; пустые — угадываем по названию */
  for (const k of ['name', 'phone', 'email', 'mark']) { const m0 = old[k]; if (m0 === null) { map[k] = null; continue } if (!m0) continue; const q = P.questions.find(x => x.entry === String(m0.entry)) || P.questions.find(x => ev3Lc(x.title) === ev3Lc(m0.title));
    if (!q) { warn.push('Вопрос «' + m0.title + '» пропал из формы — проверь сопоставление'); continue } if (ev3Lc(q.title) !== ev3Lc(m0.title)) warn.push('Вопрос «' + m0.title + '» переименован — проверь сопоставление'); map[k] = { entry: q.entry, title: q.title } }
  const guess = { name: /(имя|зовут|фио|name)/, phone: /(телефон|номер|phone|whatsapp)/, email: /(почт|e-?mail)/, mark: /(откуда|метк|источник|узнал)/ };
  for (const k of Object.keys(guess)) if (!map[k] && !(k in old)) { const q = P.questions.find(x => guess[k].test(ev3Lc(x.title)) && !Object.values(map).some(m => m.entry === x.entry)); if (q) map[k] = { entry: q.entry, title: q.title } }
  S.form.gform = Object.assign(G, { link: bStr(o.url, 400), url: cur.replace(/\?.*$/, '').replace(/\/(formResponse|closedform)$/, '/viewform'), title: P.title, n: P.questions.length, pages: P.pages, accepting: closed ? 0 : 1, login: 0, open: !G.login && G.open === 'tab' ? 'tab' : 'inside', questions: P.questions, map, checked_at: now });
  ev.sale = ev3SaleJson(S); ev.upd = now; await env.DB.prepare('UPDATE efir_event SET sale=?, upd=? WHERE id=?').bind(ev.sale, now, ev.id).run(); const steps = await ev2SaveSteps(env, ev, D);
  await logIt(env, 'ev-gform', W.uid, ev.id + ' ' + P.questions.length); return { ok: true, gform: ev3Pub(S).form.gform, warn, steps, upd: now } }
/* состояние для опроса мастера 2.6в (ждём тестовый ответ) и счётчики «открыли · заполнили» */
async function ev3State(env, ev) { const S = ev3Sale(ev), D = await ev2Days(env, ev.id), ids = D.map(e => +e.id);
  const [f, op] = await env.DB.batch([env.DB.prepare('SELECT COUNT(*) n, SUM(CASE WHEN row_ok=1 THEN 1 ELSE 0 END) ok FROM ev_form WHERE ev_id=? AND COALESCE(test,0)=0 AND COALESCE(outside,0)=0').bind(ev.id),
    env.DB.prepare("SELECT COUNT(DISTINCT data) n FROM efir_ev WHERE kind='fopen' AND efir_id IN (" + (ids.length ? ids.join(',') : '0') + ')')]);
  const P = ev3Pub(S); return { ok: true, sheet: P.sheet, gform: P.form.gform, forms: ((f.results || [])[0] || {}).n | 0, in_sheet: ((f.results || [])[0] || {}).ok | 0, opened: ((op.results || [])[0] || {}).n | 0, upd: ev.upd || 0 } }
/* «Взять вопросы из прошлого марафона» (2.6б): мероприятия с вопросами своей анкеты, новые сверху */
async function ev3PastQs(env, ev) { const L = await qAll(env.DB.prepare("SELECT id, title, type, created, sale FROM efir_event WHERE del=0 AND id<>? AND sale LIKE '%\"questions\":[{%' ORDER BY created DESC, id DESC LIMIT 40").bind(ev.id));
  return { ok: true, events: L.map(x => { const S = ev3Sale(x); return { id: x.id, title: x.title || 'Без названия', type: x.type || 'mar', questions: S.form.questions } }).filter(x => x.questions.length) } }

/* «Кому приходит сводка» (2.6): kv efir_report_to (chat) — по умолчанию все админы бота; имена — из tg_admin */
async function ev3ReportTo(env) { const A = await qAll(env.DB.prepare('SELECT chat, name FROM tg_admin')), L = await kvGet(env, 'efir_report_to').catch(() => null), C = Array.isArray(L) && L.length ? L.map(String) : A.map(x => String(x.chat));
  return A.filter(x => C.includes(String(x.chat))).map(x => bStr(x.name, 60) || 'Админ') }
/* «Дублировать»: настройки продаж копируются, подключение таблицы и токен — нет (у копии своя таблица и свой скрипт) */
function ev3DupSale(ev) { const S = ev3Sale(ev); S.sheet = null; S.token = ''; S.form.gform.test_at = 0; return ev3SaleJson(S) }
/* ---------- зритель: своя анкета, открытие формы, ответы Google Формы (§3.4 защита, §5.2) ---------- */
function ev3Status(s) { const t = ev3Lc(s); if (!t) return null; if (/не дозвон|не отвеча/.test(t)) return 'noans'; if (/купил|оплатил|оплата/.test(t)) return 'buy'; if (/связал|написал/.test(t)) return 'call'; if (/отказ|(^|\s)нет($|\s|\.)/.test(t)) return 'no'; return null }
const ev3Mark = (ev, D, e, sec) => (ev.short || ev.title || '') + ' · день ' + (Math.max(0, D.findIndex(x => x.id === e.id)) + 1) + (sec != null ? ' · ' + Math.floor(sec / 60) + '-я мин' : '');
const ev3At = ms => { const d = msk(new Date(ms)); return String(d.getUTCDate()).padStart(2, '0') + '.' + String(d.getUTCMonth() + 1).padStart(2, '0') + '.' + d.getUTCFullYear() + ' ' + efHM(ms) };
/* подстановка контактов (§6.4 4.4): последняя анкета / заявка этого k → регистрация в боте → почта ученика → username Telegram */
async function ev3Prefill(env, ev, W) { const out = { name: '', phone: '', email: '', tg: '' }; if (!W.k || W.web) return out;
  const f = await env.DB.prepare('SELECT name, phone, email, tg FROM ev_form WHERE ev_id=? AND k=? ORDER BY id DESC LIMIT 1').bind(ev.id, W.k).first().catch(() => null), l = f ? null : await env.DB.prepare('SELECT name, phone, email, tg FROM efir_lead WHERE k=? ORDER BY id DESC LIMIT 1').bind(W.k).first().catch(() => null);
  for (const s of [f, l]) if (s) for (const k of Object.keys(out)) if (!out[k] && s[k]) out[k] = String(s[k]);
  const r = await env.DB.prepare('SELECT name, phone, email, chat FROM ev_reg WHERE ev_id=? AND k=?').bind(ev.id, W.k).first().catch(() => null); if (r) for (const k of ['name', 'phone', 'email']) if (!out[k] && r[k]) out[k] = String(r[k]);
  if (!out.email && W.uid) { const g = await env.DB.prepare('SELECT email FROM gc_name WHERE uid=?').bind(W.uid).first().catch(() => null); if (g && g.email) out.email = String(g.email) }
  if (!out.name) out.name = await efName(env, W).catch(() => '') || '';
  const chat = W.chat || (r && r.chat); if (!out.tg && chat) { const u = await env.DB.prepare('SELECT username FROM tg_user WHERE chat=?').bind(String(chat)).first().catch(() => null); if (u && u.username) out.tg = '@' + u.username }
  return out }
async function ev3LeadTitle(env, ev, D) { const m = await env.DB.prepare("SELECT data FROM ev_mat WHERE ev_id=? AND kind='lead' AND del=0 ORDER BY ord, id LIMIT 1").bind(ev.id).first().catch(() => null), d = m ? efJ(m.data, {}) : null;
  if (d && d.title) return bStr(d.title, 120); for (const e of D || []) { const L = efJ(e.cfg, {}).lead; if (L && L.title) return bStr(L.title, 120) } return '' }
/* строка для таблицы (лист «Анкеты»): дата, эфир · день, минута, контакты, метка, сколько смотрел, ответы по вопросам */
async function ev3Row(env, ev, e, F, S) { const D = await ev2Days(env, ev.id), r = F.k ? await env.DB.prepare('SELECT src_code FROM ev_reg WHERE ev_id=? AND k=?').bind(ev.id, F.k).first().catch(() => null) : null;
  const src = r ? (r.src_code ? ((await env.DB.prepare('SELECT title FROM ev_src WHERE ev_id=? AND code=?').bind(ev.id, r.src_code).first().catch(() => null)) || {}).title || r.src_code : 'Основная') : '';
  const sn = F.k && e ? await env.DB.prepare('SELECT MAX(min) m FROM efir_seen WHERE efir_id=? AND k=?').bind(e.id, F.k).first().catch(() => null) : null, A = efJ(F.answers, {}), a = {};
  for (const q of S.form.questions) { const v = A[q.id]; if (v != null && v !== '') a[q.t] = Array.isArray(v) ? v.join(', ') : String(v) }
  return { k: F.k || ('f' + F.id), at: ev3At(F.at), day: e ? ev3Mark(ev, D, e) : '', min: F.sec != null ? Math.floor(F.sec / 60) : null, name: F.name || '', phone: F.phone || '', email: F.email || '', tg: F.tg || '', src, watched: sn && sn.m ? sn.m + ' мин' : '', a } }
async function ev3Queue(env, evId, formId, sheet, row) { const q = await env.DB.prepare('SELECT id FROM ev_form_q WHERE ev_id=? AND form_id=? AND sheet=?').bind(evId, formId, sheet).first();
  if (q) await env.DB.prepare('UPDATE ev_form_q SET payload=?, next_at=MIN(COALESCE(next_at, ?), ?) WHERE id=?').bind(JSON.stringify(row), msNow(), msNow(), q.id).run();
  else await env.DB.prepare('INSERT INTO ev_form_q (ev_id, form_id, sheet, payload, tries, next_at, err) VALUES (?,?,?,?,0,?,NULL)').bind(evId, formId, sheet, JSON.stringify(row), msNow()).run() }
const EV3_OPEN = e => e.status === 'live' || ((e.status === 'done' || e.status === 'rec') && e.at_end && msNow() - e.at_end < 864e5);
async function ev3Flood(env, e, ip, now) { const [a, b] = await env.DB.batch([env.DB.prepare('SELECT COUNT(*) n FROM ev_form WHERE efir_id=? AND ip=? AND at>?').bind(e.id, ip, now - 6e5), env.DB.prepare('SELECT COUNT(*) n FROM ev_form WHERE efir_id=? AND ip=?').bind(e.id, ip)]);
  return (((a.results || [])[0] || {}).n | 0) >= 3 || (((b.results || [])[0] || {}).n | 0) >= 30 }
async function efFormApi(env, req, path, u, o, W, e, now) { await ef2Ensure(env); const evId = +efJ(e.cfg, {}).ev, ev = evId ? await evGet(env, evId) : null; if (!ev) return json(req, { ok: false, err: 'В этом эфире анкеты нет' }, 400);
  const D = await ev2Days(env, ev.id), S = ev3Sale(ev, ev2Type(ev, D)); if (S.mode !== 'form') return json(req, { ok: false, err: 'В этом эфире анкеты нет' }, 400);
  if (path === '/efir/form' && req.method === 'GET') { const P = await ev3Prefill(env, ev, W), f = W.k ? await env.DB.prepare('SELECT id, answers, at FROM ev_form WHERE ev_id=? AND k=?' + (S.form.one_per_person ? '' : ' AND efir_id=' + (+e.id)) + ' ORDER BY id DESC LIMIT 1').bind(ev.id, W.k).first() : null;
    let gf = null; if (S.form.src === 'gform' && S.form.gform.url) { const G = S.form.gform, q = new URLSearchParams(); q.set('usp', 'pp_url'); if (G.open !== 'tab') q.set('embedded', 'true');
      const sec = e.status === 'live' && e.at_live ? Math.floor((now - e.at_live) / 1000) : null, val = { name: P.name, phone: P.phone, email: P.email, mark: ev3Mark(ev, D, e, sec) };
      for (const k of Object.keys(val)) { const m = G.map[k]; if (m && m.entry && val[k]) q.set('entry.' + m.entry, val[k]) } gf = { url: G.url + '?' + q.toString(), open: G.open, login: G.login } }
    return json(req, { ok: true, src: S.form.src, title: await ev3LeadTitle(env, ev, D) || 'Анкета', fields: S.form.fields, questions: S.form.src === 'own' ? S.form.questions : [], gform: gf, prefill: P, done: f ? 1 : 0, answers: f && S.form.src === 'own' ? efJ(f.answers, {}) : null, open: EV3_OPEN(e) ? 1 : 0 }) }
  if (W.ro) return json(req, { ok: false, err: 'Режим просмотра — только чтение' }, 403);
  if (path === '/efir/form/open' && req.method === 'POST') { if (W.k && EV3_OPEN(e)) { const ex = await env.DB.prepare("SELECT id FROM efir_ev WHERE efir_id=? AND kind='fopen' AND data=? LIMIT 1").bind(e.id, W.k).first();
      if (!ex) await env.DB.prepare("INSERT INTO efir_ev (efir_id, sess, sec, kind, data, at) VALUES (?, 0, ?, 'fopen', ?, ?)").bind(e.id, e.at_live ? Math.floor((now - e.at_live) / 1000) : null, W.k, now).run() } return json(req, { ok: true }) }
  if (path !== '/efir/form' || req.method !== 'POST') return json(req, { ok: false, err: 'not found' }, 404);
  if (S.form.src !== 'own') return json(req, { ok: false, err: 'Эта анкета заполняется в Google Форме' }, 400);
  if (!EV3_OPEN(e)) return json(req, { ok: false, err: 'Анкета принимается во время эфира и сутки после него' }, 400);
  const fl = S.form.fields, ph = String(o.phone || '').replace(/[^\d+]/g, '').slice(0, 20), em = String(o.email || '').trim().toLowerCase().slice(0, 120), nm = bStr(String(o.name || '').replace(/\s+/g, ' '), 80), tgn = bStr(String(o.tg || '').trim().replace(/^https?:\/\/t\.me\//, '@'), 40);
  if (fl.name === 'req' && nm.length < 2) return json(req, { ok: false, err: 'Напиши имя' }, 400);
  if (fl.phone !== 'off' && (ph || fl.phone === 'req') && ev3Digits(ph).length < 10) return json(req, { ok: false, err: 'Проверь телефон' }, 400);
  if (fl.email !== 'off' && (em || fl.email === 'req') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return json(req, { ok: false, err: 'Проверь почту' }, 400);
  if (fl.tg === 'req' && !tgn) return json(req, { ok: false, err: 'Напиши Telegram' }, 400);
  const A0 = o.answers && typeof o.answers === 'object' ? o.answers : {}, A = {};
  for (const q of S.form.questions) { let v = A0[q.id];
    if (q.kind === 'one') v = q.opts.includes(String(v)) ? String(v) : ''; else if (q.kind === 'many') v = (Array.isArray(v) ? v : []).map(String).filter(x => q.opts.includes(x));
    else if (q.kind === 'num') { v = bStr(v, 40); if (v && !/^[\d+\-() ]+$/.test(v)) return json(req, { ok: false, err: 'В ответе «' + q.t + '» — только цифры' }, 400) } else v = bStr(v, 1000);
    if (q.req && (!v || (Array.isArray(v) && !v.length))) return json(req, { ok: false, err: 'Ответь на вопрос «' + q.t + '»' }, 400); if (v && (!Array.isArray(v) || v.length)) A[q.id] = v }
  /* защита от накрутки (§3.4): гость без бота — не больше 3 анкет с одного IP за 10 мин и 30 за эфир; ученики и записавшиеся через бота — без лимита */
  const reg = W.k ? await env.DB.prepare('SELECT chat FROM ev_reg WHERE ev_id=? AND k=?').bind(ev.id, W.k).first() : null, free = !!W.uid || !!W.staff || !!(reg && (reg.chat || W.chat)); let ip = null;
  if (!free) { ip = (await hmacHex(env, 'efip|' + (req.headers.get('CF-Connecting-IP') || ''))).slice(0, 24);
    if (await ev3Flood(env, e, ip, now)) { await logIt(env, 'efir-flood', 0, e.id + ' form ' + ip.slice(0, 8)); return json(req, { ok: false, err: 'Слишком много заявок — попробуй позже' }, 429) } }
  const sec = e.status === 'live' && e.at_live ? Math.max(0, Math.floor((now - e.at_live) / 1000)) : null, test = ev2Status(ev) === 'test' || ev2Status(ev) === 'draft' ? 1 : 0, chat = W.chat || (reg && reg.chat) || null;
  const ex = W.k ? await env.DB.prepare('SELECT id, sec, at FROM ev_form WHERE ev_id=? AND k=?' + (S.form.one_per_person ? '' : ' AND efir_id=? AND at>?') + ' ORDER BY id DESC LIMIT 1').bind(...(S.form.one_per_person ? [ev.id, W.k] : [ev.id, W.k, e.id, now - 6 * 36e5])).first() : null;
  let id; if (ex) { id = ex.id; await env.DB.prepare('UPDATE ev_form SET name=?, phone=?, email=?, tg=?, answers=?, row_ok=0, upd=? WHERE id=?').bind(nm, ph || null, em || null, tgn || null, JSON.stringify(A), now, id).run() }
  else id = (await env.DB.prepare("INSERT INTO ev_form (ev_id, efir_id, k, uid, chat, name, phone, email, tg, answers, sec, src, row_ok, st, test, outside, at, upd, ip) VALUES (?,?,?,?,?,?,?,?,?,?,?,'own',0,'new',?,0,?,?,?) RETURNING id")
    .bind(ev.id, e.id, W.k || null, W.uid || null, chat, nm, ph || null, em || null, tgn || null, JSON.stringify(A), sec, test, now, now, ip).first()).id;
  const F = { id, k: W.k, name: nm, phone: ph, email: em, tg: tgn, answers: JSON.stringify(A), sec: ex ? ex.sec : sec, at: ex ? ex.at : now };
  await ev3Queue(env, ev.id, id, 'Анкеты', await ev3Row(env, ev, e, F, S)); await logIt(env, 'ev-form', W.uid, ev.id + ' ' + id + (ex ? ' upd' : ''));
  return json(req, { ok: true, id, upd: ex ? 1 : 0, msg: '✓ Анкета получена' }) }
/* ответ Google Формы от скрипта таблицы (onFormSubmit): по токену → мероприятие; ответы по сопоставлению (заголовок вопроса); привязка к зрителю по телефону / почте */
async function efFormHook(env, req, o) { await ef2Ensure(env); const ev = await evGet(env, o.ev); if (!ev) return json(req, { ok: false }, 404); const S = ev3Sale(ev), now = msNow();
  if (!S.token || !same(String(o.token || ''), S.token)) { await logIt(env, 'ev-hook-bad', 0, String(ev.id)); return json(req, { ok: false }, 403) }
  const N = o.named && typeof o.named === 'object' ? o.named : {}, G = S.form.gform, val = k => { const m = G.map[k]; if (!m) return ''; let key = Object.keys(N).find(x => ev3Lc(x) === ev3Lc(m.title)); const v = key ? N[key] : ''; return bStr(Array.isArray(v) ? v.join(', ') : v, 200) };
  const ph = val('phone').replace(/[^\d+]/g, '').slice(0, 20), em = val('email').toLowerCase(), nm = val('name'), d10 = ev3Digits(ph).slice(-10);
  let who = null; if (d10.length === 10 || em) { const L = await qAll(env.DB.prepare('SELECT k, uid, chat, name, phone, email FROM ev_reg WHERE ev_id=? AND (lower(email)=? OR phone LIKE ?) LIMIT 20').bind(ev.id, em || '-', d10.length === 10 ? '%' + d10 : '-'));
    who = L.find(r => d10.length === 10 && ev3Digits(r.phone).slice(-10) === d10) || L.find(r => em && String(r.email || '').toLowerCase() === em) || null }
  const D = await ev2Days(env, ev.id), live = D.find(e => e.status === 'live'), sec = live && live.at_live ? Math.floor((now - live.at_live) / 1000) : null;
  const test = !G.test_at || ['draft', 'test'].includes(ev2Status(ev)) ? 1 : 0, ans = {}; for (const k of Object.keys(N).slice(0, 60)) { const v = N[k]; ans[bStr(k, 200)] = bStr(Array.isArray(v) ? v.join(', ') : v, 1000) }
  const ex = who && S.form.one_per_person ? await env.DB.prepare("SELECT id FROM ev_form WHERE ev_id=? AND k=? AND src='gform' ORDER BY id DESC LIMIT 1").bind(ev.id, who.k).first() : null;
  if (ex) await env.DB.prepare('UPDATE ev_form SET name=?, phone=?, email=?, answers=?, row_n=?, row_ok=1, upd=? WHERE id=?').bind(nm || who.name || '', ph || null, em || null, JSON.stringify(ans), +o.row || null, now, ex.id).run();
  else await env.DB.prepare("INSERT INTO ev_form (ev_id, efir_id, k, uid, chat, name, phone, email, tg, answers, sec, src, row_ok, row_n, st, test, outside, at, upd) VALUES (?,?,?,?,?,?,?,?,NULL,?,?,'gform',1,?,'new',?,?,?,?)")
    .bind(ev.id, live ? live.id : null, who ? who.k : null, who ? who.uid : null, who ? who.chat : null, nm || (who && who.name) || '', ph || null, em || null, JSON.stringify(ans), sec, +o.row || null, test, live ? 0 : 1, now, now).run();
  if (!G.test_at) await env.DB.prepare("UPDATE efir_event SET sale=json_set(sale, '$.form.gform.test_at', ?) WHERE id=?").bind(now, ev.id).run().catch(() => null);
  if (o.sheet && S.sheet && S.sheet.fsheet !== bStr(o.sheet, 100)) await env.DB.prepare("UPDATE efir_event SET sale=json_set(sale, '$.sheet.fsheet', ?) WHERE id=?").bind(bStr(o.sheet, 100), ev.id).run().catch(() => null);
  await logIt(env, 'ev-hook', 0, ev.id + (who ? ' k' : ' ?') + (test ? ' test' : '') + (live ? '' : ' outside')); return json(req, { ok: true }) }

/* ---------- фон: очередь ev_form_q → op:"rows" пачками; статусы менеджеров op:"status" (§3.1, §5.2) ---------- */
async function evFormTick(env, B, lim) { B = B || budget(3); await ef2Ensure(env); const now = msNow(), out = { ok: 0, fail: 0 }; if (lim == null) lim = (await kvGet(env, 'cf_plan').catch(() => null)) === 'paid' ? 10 : 3;
  const Q = await qAll(env.DB.prepare('SELECT * FROM ev_form_q WHERE COALESCE(next_at, 0)<=? ORDER BY next_at, id LIMIT 300').bind(now)); if (!Q.length) return out;
  const G = {}; for (const q of Q) { const k = q.ev_id + '|' + q.sheet; (G[k] = G[k] || []).push(q) }
  for (const k of Object.keys(G).slice(0, lim)) { if (!B.ok(1)) break; const L = G[k].slice(0, 100), ev = await evGet(env, L[0].ev_id), ids = L.map(q => q.id).join(',');
    if (!ev) { await env.DB.prepare('DELETE FROM ev_form_q WHERE id IN (' + ids + ')').run(); continue }
    const S = ev3Sale(ev); if (!S.sheet || !S.sheet.exec || !S.token) { await env.DB.prepare('UPDATE ev_form_q SET next_at=?, err=? WHERE id IN (' + ids + ')').bind(now + 5 * 6e4, 'таблица не подключена').run(); continue }
    B.use(1); const r = await ev3Gas(env, S.sheet.exec, { token: S.token, op: 'rows', sheet: L[0].sheet, qs: L[0].sheet === 'Анкеты' ? S.form.questions.map(q => q.t) : [], rows: L.map(q => efJ(q.payload, {})) });
    if (r.j && r.j.ok) { const R = Array.isArray(r.j.rows) ? r.j.rows : [], st = [];
      for (const q of L) { if (q.form_id > 0) { const x = R.find(y => String(y.k) === String(efJ(q.payload, {}).k)); st.push(env.DB.prepare('UPDATE ev_form SET row_ok=1, row_n=COALESCE(?, row_n) WHERE id=?').bind(x ? +x.row || null : null, q.form_id)) } }
      st.push(env.DB.prepare('DELETE FROM ev_form_q WHERE id IN (' + ids + ')')); if (S.sheet.fails || S.sheet.last_err) st.push(env.DB.prepare("UPDATE efir_event SET sale=json_set(sale, '$.sheet.fails', 0, '$.sheet.last_err', '') WHERE id=?").bind(ev.id));
      await env.DB.batch(st); out.ok += L.length }
    else { const err = r.bad ? EV3_ERR[r.bad] : EV3_ERR.token; out.fail += L.length;
      await env.DB.batch([env.DB.prepare('UPDATE ev_form_q SET tries=tries+1, next_at=?, err=? WHERE id IN (' + ids + ')').bind(now + 5 * 6e4, err.slice(0, 200)),
        env.DB.prepare("UPDATE efir_event SET sale=json_set(sale, '$.sheet.fails', COALESCE(json_extract(sale, '$.sheet.fails'), 0) + 1, '$.sheet.last_err', ?) WHERE id=?").bind(err, ev.id)]);
      await logIt(env, 'ev-sheet-q-err', 0, ev.id + ' ' + (r.bad || 'ok:false') + ' ' + L.length) } }
  return out }
async function evFormStatus(env, B, lim) { B = B || budget(3); await ef2Ensure(env); const now = msNow(), out = { ev: 0, st: 0 }; if (lim == null) lim = (await kvGet(env, 'cf_plan').catch(() => null)) === 'paid' ? 10 : 3;
  await env.DB.prepare('UPDATE ev_form SET ip=NULL WHERE ip IS NOT NULL AND at<?').bind(now - 2 * 864e5).run().catch(() => null); /* IP (хеш) — только на время эфира */
  const E = await qAll(env.DB.prepare("SELECT id, sale, status FROM efir_event WHERE del=0 AND json_extract(sale, '$.mode')='form' AND COALESCE(json_extract(sale, '$.sheet.ok_at'), 0)>0 AND COALESCE(status, 'reg')<>'draft' ORDER BY COALESCE(json_extract(sale, '$.sheet.st_at'), 0) LIMIT ?").bind(lim));
  for (const ev of E) { const S = ev3Sale(ev); await env.DB.prepare("UPDATE efir_event SET sale=json_set(sale, '$.sheet.st_at', ?) WHERE id=?").bind(now, ev.id).run();
    if (!S.form.dup) await env.DB.prepare('DELETE FROM ev_form WHERE ev_id=? AND row_ok=1 AND upd<?').bind(ev.id, now - 30 * 864e5).run(); /* dup=0: ev_form — буфер до записи в таблицу и ещё 30 дней */
    const F = await qAll(env.DB.prepare('SELECT id, k, row_n, src FROM ev_form WHERE ev_id=? AND row_ok=1 AND COALESCE(test,0)=0 ORDER BY id DESC LIMIT 500').bind(ev.id)); if (!F.length || !B.ok(1)) continue; B.use(1);
    const gf = S.form.src === 'gform', body = gf ? { token: S.token, op: 'status', sheet: S.sheet.fsheet || '', rows: F.filter(f => f.row_n).map(f => f.row_n) } : { token: S.token, op: 'status', sheet: 'Анкеты', ks: F.filter(f => f.k).map(f => f.k) };
    if (gf && !body.sheet) continue; const r = await ev3Gas(env, S.sheet.exec, body); out.ev++; if (!r.j || !r.j.ok) continue; const st = [];
    for (const f of F) { const v = gf ? (r.j.rn || {})[f.row_n] : (r.j.st || {})[f.k]; if (v == null) continue; const t = bStr(v, 100); st.push(env.DB.prepare('UPDATE ev_form SET sheet_st=?, st=COALESCE(?, st) WHERE id=?').bind(t || null, ev3Status(t), f.id)) }
    if (st.length) { await env.DB.batch(st); out.st += st.length } }
  return out }
/* ===== 07.11 «Эфиры 2.0», этап Э6 (docs/plan/efiry-tz.md §3.5, §6.4 5.1 / 5.2 / 5.2б / 5.6): итоги, заявки, карточка человека, сводка после эфира, сверка оплат =====
   Итоги 5.1: GET /efir/host/event/stats?id=&day= (memo 30 с). Заявки 5.2: GET /efir/leads?v=2&ev=&p=&st=&q=&pg= — заявки ∪ анкеты (при dup=1), по 50; GET /efir/leads.csv (UTF-8 с BOM, «;» — Excel с русскими настройками).
   Карточка 5.2б: GET/POST /efir/host/person. Сводка 5.6: efReport — строки по доске Tg. Оплаты: ef6PayMatch — сразу после каждой синхронизации pay (syncPay: cron :25, дозабор :45, и /pay после оплаты)
   и лениво при открытии итогов и заявок, если pay_synced сменился. Подпись на экране — «данные на ЧЧ:ММ» (время pay_synced). */
const EF6_ST = { new: ['новая', ''], call: ['связались', 'pb'], noans: ['не дозвонились', 'py'], buy: ['купил', 'pgr'], no: ['отказ', 'pr'] };
const EF6_OLD = { new: 'new', call: 'mgr', noans: 'mgr', buy: 'done', no: 'no' }; /* в старую колонку st — старый экран заявок видит то же */
const ef6Mode = ev => { const S = ev2Sale(ev) || {}; return S.legacy ? 'sell' : (['sell', 'form', 'none'].includes(S.mode) ? S.mode : 'none') };
const ef6Pct = (a, b) => { if (!b || !a) return '0'; const p = a / b * 100; return p < 10 ? String(Math.round(p * 10) / 10).replace('.', ',') : String(Math.round(p)) };
const ef6Num = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
const ef6Dur = m => { m = Math.max(0, Math.round(m)); return m < 60 ? m + NB + 'мин' : Math.floor(m / 60) + NB + 'ч' + (m % 60 ? ' ' + (m % 60) + NB + 'мин' : '') };
const ef6Phone = p => { const d = String(p || '').replace(/\D/g, ''); if (d.length === 11 && /^[78]/.test(d)) return '+7 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9); return p ? String(p) : '' };
const ef6DayDur = (e, now) => Math.max(1, e.at_live && e.at_end && e.at_end > e.at_live ? Math.round((e.at_end - e.at_live) / 6e4) : (e.at_live && e.status === 'live' ? Math.round(((now || msNow()) - e.at_live) / 6e4) : (+e.dur || 60)));
const ef6Ph = a => a.length ? a.map(() => '?').join(',') : 'NULL';
const ef6One = r => ((r && r.results) || [])[0] || {};
const ef6HM = iso => { const t = Date.parse(iso || ''); if (!isFinite(t)) return ''; const d = msk(new Date(t)); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') };
const EF6_MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const ef6Day = ms => { const d = msk(new Date(ms)); return d.getUTCDate() + NB + EF6_MON[d.getUTCMonth()] };
/* сверка оплат: заявка оплачена, если в pay есть «Получен» по номеру/id заказа или по почте заявки в течение 30 дней после неё. Только D1, без подзапросов наружу */
async function ef6PayMatch(env) { const syn = await kvGet(env, 'pay_synced').catch(() => null); if (!syn) return { skip: 'nopay' };
  const cond = "p.status='Получен' AND p.sum>0 AND (p.deal=CAST(efir_lead.order_num AS INTEGER) OR p.deal=CAST(efir_lead.order_id AS INTEGER) OR (COALESCE(efir_lead.email,'')<>'' AND lower(p.email)=lower(efir_lead.email) AND p.day>=date(efir_lead.at/1000, 'unixepoch', '+3 hours') AND p.day<=date(efir_lead.at/1000, 'unixepoch', '+3 hours', '+30 days')))";
  const r = await env.DB.prepare("UPDATE efir_lead SET pay_st='paid', pay_sum=(SELECT SUM(p.sum) FROM pay p WHERE " + cond + "), pay_at=? WHERE COALESCE(pay_st,'')<>'paid' AND at>? AND EXISTS (SELECT 1 FROM pay p WHERE " + cond + ")").bind(msNow(), msNow() - 180 * 864e5).run();
  await kvPut(env, 'efir_paym', syn); const n = (r && r.meta && r.meta.changes) | 0; if (n) await logIt(env, 'efir-paym', 0, n + ' · ' + syn); return { n, at: syn } }
async function ef6PayLazy(env) { const syn = await kvGet(env, 'pay_synced').catch(() => null); if (!syn) return null;
  if ((await kvGet(env, 'efir_paym').catch(() => null)) !== syn) await ef6PayMatch(env).catch(e => logIt(env, 'efir-paym-err', 0, String(e && e.message || e).slice(0, 200))); return syn }
/* 5.1 итоги мероприятия: весь марафон (прошедшие + идущий день) или один день */
async function ef6Stats(env, ev, dayN) { const syn = await ef6PayLazy(env).catch(() => null);
  return memo(env, 'ef6st:' + ev.id + ':' + (dayN | 0), 30, async () => { const now = msNow(), D = (await ev2Days(env, ev.id)).filter(x => !efJ(x.cfg, {}).hide), type = ev2Type(ev, D), mode = ef6Mode(ev);
    const days = D.map((e, i) => ({ n: i + 1, id: e.id, title: e.title || '', short: efJ(e.cfg, {}).short || '', status: e.status, start: e.start || 0, at_live: e.at_live || 0, at_end: e.at_end || 0, dur: ef6DayDur(e, now) }));
    const past = days.filter(d => d.at_live), sel = dayN ? past.filter(d => d.n === +dayN) : past, ids = sel.map(d => d.id), ph = ef6Ph(ids), allIds = past.map(d => d.id);
    const out = { ok: true, ev: { id: ev.id, title: ev.title || '', short: ev.short || '', type, mode, status: ev2Status(ev) }, days, day: dayN | 0, past: past.length, live: sel.some(d => d.status === 'live') ? 1 : 0, now, pay_at: ef6HM(syn) };
    out.regs = ef6One(await env.DB.prepare('SELECT COUNT(*) n FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0').bind(ev.id).all()).n | 0;
    if (!ids.length) { out.empty = 1; return out }
    /* первый показ заявки каждого дня — для «Досидели до заявки» (efir_seen.first ≤ показ ≤ last) */
    const LA = await qAll(env.DB.prepare("SELECT efir_id, MIN(at_on) a FROM ev_mat_log WHERE kind='lead' AND efir_id IN (" + ph + ') GROUP BY efir_id').bind(...ids)), LAt = {}; for (const x of LA) LAt[x.efir_id] = x.a;
    for (const x of await qAll(env.DB.prepare("SELECT efir_id, MIN(at) a FROM efir_ev WHERE kind='lead' AND efir_id IN (" + ph + ') GROUP BY efir_id').bind(...ids))) if (!LAt[x.efir_id]) LAt[x.efir_id] = x.a;
    const toL = Object.keys(LAt).map(id => '(s.efir_id=' + (+id) + ' AND s.first<=' + (+LAt[id]) + ' AND s.last>=' + (+LAt[id]) + ')').join(' OR ');
    const doneQ = sel.map(d => '(s.efir_id=' + (+d.id) + ' AND s.min>=' + Math.ceil(d.dur * 0.8) + ')').join(' OR ');
    const [sn, mul, tl, dn, ld, pd, fm, fo, fb] = await env.DB.batch([
      env.DB.prepare('SELECT COUNT(DISTINCT k) n, AVG(min) a FROM efir_seen s WHERE sess=0 AND efir_id IN (' + ph + ')').bind(...ids),
      env.DB.prepare('SELECT COUNT(*) n FROM (SELECT k FROM efir_seen WHERE sess=0 AND efir_id IN (' + ef6Ph(allIds) + ') GROUP BY k HAVING COUNT(DISTINCT efir_id)>=?)').bind(...allIds, allIds.length),
      env.DB.prepare('SELECT COUNT(DISTINCT k) n FROM efir_seen s WHERE sess=0 AND (' + (toL || '0') + ')'),
      env.DB.prepare('SELECT COUNT(DISTINCT k) n FROM efir_seen s WHERE sess=0 AND (' + (doneQ || '0') + ')'),
      env.DB.prepare('SELECT COUNT(*) n FROM efir_lead WHERE efir_id IN (' + ph + ')').bind(...ids),
      env.DB.prepare("SELECT COUNT(*) n, SUM(pay_sum) s FROM efir_lead WHERE pay_st='paid' AND efir_id IN (" + ph + ')').bind(...ids),
      env.DB.prepare('SELECT COUNT(*) n FROM ev_form WHERE COALESCE(test,0)=0 AND COALESCE(outside,0)=0 AND efir_id IN (' + ph + ')').bind(...ids),
      env.DB.prepare("SELECT COUNT(DISTINCT data) n FROM efir_ev WHERE kind='fopen' AND efir_id IN (" + ph + ')').bind(...ids),
      env.DB.prepare("SELECT COUNT(*) n FROM ev_form WHERE COALESCE(test,0)=0 AND st='buy' AND efir_id IN (" + ph + ')').bind(...ids)]);
    Object.assign(out, { came: ef6One(sn).n | 0, avg: Math.round(ef6One(sn).a || 0), multi: !dayN && allIds.length >= 2 ? ef6One(mul).n | 0 : null, multi_n: allIds.length, to_lead: toL ? ef6One(tl).n | 0 : null, done: ef6One(dn).n | 0,
      leads: ef6One(ld).n | 0, paid: ef6One(pd).n | 0, paid_sum: Math.round(ef6One(pd).s || 0), forms: ef6One(fm).n | 0, opened: ef6One(fo).n | 0, bought: ef6One(fb).n | 0 });
    /* онлайн поминутно: выбранный день или последний прошедший / идущий; отметки — баннер и кнопка заявки (без продаж — только баннер) */
    const gd = dayN ? sel[0] : past[past.length - 1], vc = await qAll(env.DB.prepare("SELECT sec, data FROM efir_ev WHERE efir_id=? AND kind='vc' ORDER BY sec").bind(gd.id)), P = [];
    for (const x of vc) { const i = Math.max(0, Math.floor((+x.sec || 0) / 60)); if (i > 600) continue; P[i] = Math.max(P[i] || 0, +(efJ(x.data, {}).n || 0)) } for (let i = 0; i < P.length; i++) if (P[i] == null) P[i] = i ? P[i - 1] : 0;
    const MK = await qAll(env.DB.prepare("SELECT kind, MIN(sec_on) sec FROM ev_mat_log WHERE efir_id=? AND kind IN ('banner','lead') GROUP BY mat_id, kind ORDER BY sec").bind(gd.id));
    out.online = { n: gd.n, sec: Math.max(gd.dur * 60, P.length * 60), pts: P, marks: MK.filter(m => m.sec != null && (m.kind === 'banner' || mode !== 'none')).map(m => ({ kind: m.kind, sec: +m.sec })) };
    /* откуда записались: метки ev_src — записались (за всё время), пришли (в выбранные дни), заявки (анкеты при «Анкетах», пришедшие при «Без продаж» не нужны — колонки нет) */
    const [S0, C0, L0] = await env.DB.batch([env.DB.prepare("SELECT code, title FROM ev_src WHERE ev_id=? AND code<>'test' ORDER BY code<>'', at, code").bind(ev.id),
      env.DB.prepare("SELECT COALESCE(r.src_code,'') c, COUNT(*) regs, SUM(CASE WHEN EXISTS (SELECT 1 FROM efir_seen z WHERE z.k=r.k AND z.sess=0 AND z.efir_id IN (" + ph + ')) THEN 1 ELSE 0 END) came FROM ev_reg r WHERE r.ev_id=? AND COALESCE(r.test,0)=0 GROUP BY 1').bind(...ids, ev.id),
      mode === 'form' ? env.DB.prepare("SELECT COALESCE(r.src_code,'') c, COUNT(*) n FROM ev_form f LEFT JOIN ev_reg r ON r.ev_id=f.ev_id AND r.k=f.k WHERE COALESCE(f.test,0)=0 AND COALESCE(f.outside,0)=0 AND f.efir_id IN (" + ph + ') GROUP BY 1').bind(...ids)
        : env.DB.prepare("SELECT COALESCE(src,'') c, COUNT(*) n FROM efir_lead WHERE efir_id IN (" + ph + ') GROUP BY 1').bind(...ids)]);
    const by = {}; for (const x of C0.results || []) by[x.c] = { regs: x.regs | 0, came: x.came | 0, leads: 0 }; for (const x of L0.results || []) (by[x.c] = by[x.c] || { regs: 0, came: 0, leads: 0 }).leads = x.n | 0;
    const SL = (S0.results || []).slice(); if (!SL.some(s => s.code === '')) SL.unshift({ code: '', title: 'Основная' }); for (const c in by) if (!SL.some(s => s.code === c)) SL.push({ code: c, title: c });
    out.src = SL.map(s => Object.assign({ code: s.code, title: s.code ? (s.title || s.code) : 'Основная ссылка' }, by[s.code] || { regs: 0, came: 0, leads: 0 })).filter(s => s.regs || s.came || s.leads || s.code === '' || s.code === 'site')
      .sort((a, b) => b.regs - a.regs || b.came - a.came);
    /* материалы: что показывали, сколько висело, нажали, заявки */
    const ML = await qAll(env.DB.prepare('SELECT g.efir_id, g.mat_id, g.kind, g.sec_on, g.at_on, g.at_off, g.clicks, g.leads, m.data FROM ev_mat_log g LEFT JOIN ev_mat m ON m.id=g.mat_id WHERE g.efir_id IN (' + ph + ') ORDER BY CASE g.kind WHEN \'lead\' THEN 0 WHEN \'banner\' THEN 1 ELSE 2 END, g.at_on').bind(...ids)); /* как на доске: сначала кнопки заявки, потом баннеры и опросы */
    out.mats = ML.map(g => { const d = efJ(g.data, {}), dd = days.find(x => x.id === g.efir_id) || {}; return { kind: g.kind, title: d.short || d.title || d.q || '', day: dd.n || 0, min: Math.floor((+g.sec_on || 0) / 60), dur: Math.max(1, Math.round(((g.at_off || now) - (g.at_on || now)) / 6e4)), clicks: g.clicks | 0, leads: g.kind === 'lead' ? g.leads | 0 : null } });
    return out }) }

/* 5.2 заявки: строки лентой (заявки efir_lead ∪ анкеты ev_form при dup=1), фильтры и счётчики вкладок; CSV — те же строки без страниц */
const EF6_PER = ['today', '7', '30', 'all'];
async function ef6Rows(env, u) { await ef6PayLazy(env).catch(() => null); const now = msNow(), evq = +u.searchParams.get('ev') || 0, per = EF6_PER.includes(u.searchParams.get('p')) ? u.searchParams.get('p') : '30';
  const t0 = per === 'all' ? 0 : per === 'today' ? (() => { const d = msk(new Date(now)); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - 3 * 36e5 })() : now - (+per) * 864e5;
  const EV = await qAll(env.DB.prepare('SELECT id, title, short, type, status, sale, offer FROM efir_event WHERE del=0 ORDER BY id DESC')), EVm = {}; for (const v of EV) EVm[v.id] = v;
  if (evq && EVm[evq] && ef6Mode(EVm[evq]) === 'none') return { none: EVm[evq] };
  const evF = evq ? ' AND CAST(json_extract(e.cfg, \'$.ev\') AS INTEGER)=' + evq : '', evF2 = evq ? ' AND f.ev_id=' + evq : '';
  const L = await qAll(env.DB.prepare("SELECT 'l' t, l.id, l.efir_id, l.k, l.uid, l.chat, l.name, l.phone, l.email, l.tg, l.sec, l.at, l.order_id, l.order_num, l.order_err, l.pay_st, l.pay_sum, l.mgr_st, l.st st0, l.note, NULL sheet_st, NULL row_n, NULL fst, 0 outside, CAST(json_extract(e.cfg, '$.ev') AS INTEGER) ev_id, e.title etitle, e.kind ekind, e.cfg ecfg FROM efir_lead l LEFT JOIN efir e ON e.id=l.efir_id WHERE l.at>=?" + evF + ' ORDER BY l.at DESC LIMIT 5000').bind(t0));
  const F = (await qAll(env.DB.prepare("SELECT 'f' t, f.id, f.efir_id, f.k, f.uid, f.chat, f.name, f.phone, f.email, f.tg, f.sec, f.at, NULL order_id, NULL order_num, NULL order_err, NULL pay_st, NULL pay_sum, NULL mgr_st, NULL st0, NULL note, f.sheet_st, f.row_n, f.st fst, COALESCE(f.outside,0) outside, f.ev_id, e.title etitle, e.kind ekind, e.cfg ecfg FROM ev_form f LEFT JOIN efir e ON e.id=f.efir_id WHERE COALESCE(f.test,0)=0 AND f.at>=?" + evF2 + ' ORDER BY f.at DESC LIMIT 5000').bind(t0)))
    .filter(f => { const v = EVm[f.ev_id]; return v && ev3Sale(v).form.dup !== 0 });
  const R = L.concat(F).sort((a, b) => b.at - a.at), q = String(u.searchParams.get('q') || '').trim().toLowerCase().replace(/ё/g, 'е'), qd = q.replace(/\D/g, '');
  const R2 = q ? R.filter(r => String(r.name || '').toLowerCase().replace(/ё/g, 'е').includes(q) || String(r.email || '').toLowerCase().includes(q) || String(r.tg || '').toLowerCase().includes(q) || (qd.length >= 3 && String(r.phone || '').replace(/\D/g, '').includes(qd))) : R;
  for (const r of R2) { r.err = r.t === 'l' && !r.order_num && !!r.order_err; r.paid = r.t === 'l' && r.pay_st === 'paid'; r.mst = r.t === 'l' ? (EF6_ST[r.mgr_st] ? r.mgr_st : (EF5_ST[r.st0] || 'new')) : (EF6_ST[r.fst] && r.fst !== 'new' ? r.fst : null) }
  const tab = { all: () => true, 'new': r => r.t === 'l' && !r.paid && !r.err && r.mst === 'new', paid: r => r.paid, form: r => r.t === 'f', err: r => r.err };
  const n = {}; for (const k in tab) n[k] = R2.filter(tab[k]).length;
  const evs = EV.filter(v => ef6Mode(v) !== 'none' && ev2Status(v) !== 'draft').map(v => ({ id: v.id, title: v.title || ('Мероприятие ' + v.id), mode: ef6Mode(v) }));
  return { rows: R2, n, tab, evs, EVm, evq, per } }
/* одна строка ленты — как на доске Leads: «Откуда», «Заказ», статус */
async function ef6Shape(env, rows, EVm) { const DAYS = {}, out = [];
  for (const id of [...new Set(rows.map(r => r.ev_id).filter(Boolean))]) DAYS[id] = (await ev2Days(env, id)).filter(x => !efJ(x.cfg, {}).hide).map(x => x.id);
  const SEEN = {}; if (rows.length) { const E = [...new Set(rows.map(r => r.efir_id).filter(Boolean))], K = [...new Set(rows.map(r => r.k).filter(Boolean))];
    if (E.length && K.length) for (let i = 0; i < K.length; i += 80) for (const s of await qAll(env.DB.prepare('SELECT efir_id, k, min FROM efir_seen WHERE sess=0 AND efir_id IN (' + ef6Ph(E) + ') AND k IN (' + ef6Ph(K.slice(i, i + 80)) + ')').bind(...E, ...K.slice(i, i + 80)))) SEEN[s.efir_id + '|' + s.k] = s.min | 0 }
  for (const r of rows) { const v = EVm[r.ev_id], ty = v ? ev2Type(v, DAYS[r.ev_id]) : null, mn = r.sec != null ? ' · ' + Math.floor(r.sec / 60) + '-я мин' : '';
    const from = r.ekind === 'auto' || ty === 'auto' ? 'Автовебинар' + mn : ty === 'mar' ? 'Марафон, день ' + (Math.max(0, (DAYS[r.ev_id] || []).indexOf(r.efir_id)) + 1) + mn : ty === 'web' ? 'Вебинар «' + (v.short || v.title || '') + '»' + mn : 'Эфир «' + (efJ(r.ecfg, {}).short || r.etitle || '') + '»' + mn;
    const S = v ? ev3Sale(v) : null, sh = S && S.sheet && S.sheet.url ? S.sheet.url : '';
    const st = r.paid ? ['оплачено', 'pgr'] : r.err ? ['ошибка', 'pr'] : r.t === 'l' ? EF6_ST[r.mst] : r.mst ? EF6_ST[r.mst] : r.sheet_st ? [String(r.sheet_st), ''] : EF6_ST.new;
    out.push({ id: (r.t === 'l' ? 'l' : 'f') + r.id, kind: r.t === 'l' ? 'lead' : 'form', k: r.k || '', name: r.name || 'Без имени', phone: ef6Phone(r.phone), email: r.email || '', tg: r.tg || '', from, outside: r.outside ? 1 : 0,
      min: SEEN[r.efir_id + '|' + r.k] != null ? SEEN[r.efir_id + '|' + r.k] : null, order: r.t === 'l' && r.order_num ? { num: String(r.order_num), url: r.order_id ? 'https://oduvanovroman.getcourse.ru/sales/control/deal/update/id/' + r.order_id : '' } : null,
      err: r.err ? 1 : 0, form_url: r.t === 'f' && sh && r.row_n ? sh + (/#gid=/.test(sh) ? '&' : '#') + 'range=A' + r.row_n : '', st: { t: st[0], c: st[1] }, at: r.at, efir_id: r.efir_id, note: r.note || '', pay_sum: r.pay_sum || 0 }) }
  return out }
async function ef6Leads(env, u) { const X = await ef6Rows(env, u); if (X.none) return { ok: true, none: { id: X.none.id, title: X.none.title, type: ev2Type(X.none, []) }, rows: [], n: { all: 0, new: 0, paid: 0, form: 0, err: 0 }, evs: [] };
  const st = X.tab[u.searchParams.get('st')] ? u.searchParams.get('st') : 'all', R = X.rows.filter(X.tab[st]), pages = Math.max(1, Math.ceil(R.length / 50)), pg = Math.min(pages, Math.max(1, +u.searchParams.get('pg') || 1));
  return { ok: true, rows: await ef6Shape(env, R.slice((pg - 1) * 50, pg * 50), X.EVm), n: X.n, total: R.length, pg, pages, evs: X.evs, ev: X.evq || 0, p: X.per, st } }
/* ячейка CSV: «;», кавычки и переводы строк — в кавычках; текст зрителя, начинающийся с = + - @, — с апострофом (Excel не примет его за формулу) */
const ef6Csv = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s };
/* телефон для Excel: российский — «8 900 123-45-67» (с «+» Excel считает ячейку формулой), остальные — цифрами; Telegram — ссылкой t.me/… */
const ef6CsvPh = p => { const d = String(p || '').replace(/\D/g, ''); if (d.length === 11 && /^[78]/.test(d)) return '8 ' + d.slice(1, 4) + ' ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9); return d };
const ef6CsvTg = t => /^@[\w]{3,40}$/.test(t || '') ? 't.me/' + t.slice(1) : (t || '');
async function ef6LeadsCsv(env, u) { const X = await ef6Rows(env, u); const st = X.tab[u.searchParams.get('st')] ? u.searchParams.get('st') : 'all', R = X.none ? [] : await ef6Shape(env, X.rows.filter(X.tab[st]).slice(0, 5000), X.EVm);
  const head = ['Дата (МСК)', 'Имя', 'Телефон', 'Почта', 'Telegram', 'Откуда', 'Смотрел, мин', 'Заказ', 'Статус', 'Заметка'];
  const dt = ms => { const d = msk(new Date(ms)); return d.toISOString().slice(0, 16).replace('T', ' ') };
  const lines = [head].concat(R.map(r => [dt(r.at), r.name, ef6CsvPh(r.phone), r.email, ef6CsvTg(r.tg), r.from, r.min == null ? '' : r.min, r.order ? '№ ' + r.order.num : r.kind === 'form' ? 'анкета' : r.err ? 'не создан' : '', r.st.t, r.note]));
  return '﻿' + lines.map(l => l.map(ef6Csv).join(';')).join('\r\n') + '\r\n' }

/* 5.2б карточка человека: эфиры мероприятия с минутами и минутой заявки, до 10 сообщений, заказ, статус, заметка */
async function ef6Person(env, k, id, now) { await ef6PayLazy(env).catch(() => null);
  let L = null, Fm = null; if (/^l\d+$/.test(id || '')) L = await env.DB.prepare('SELECT * FROM efir_lead WHERE id=?').bind(+id.slice(1)).first(); else if (/^f\d+$/.test(id || '')) Fm = await env.DB.prepare('SELECT * FROM ev_form WHERE id=?').bind(+id.slice(1)).first();
  if (!L && !Fm && k) L = await env.DB.prepare('SELECT * FROM efir_lead WHERE k=? ORDER BY at DESC LIMIT 1').bind(k).first(); if (!L && !Fm && k) Fm = await env.DB.prepare('SELECT * FROM ev_form WHERE k=? AND COALESCE(test,0)=0 ORDER BY at DESC LIMIT 1').bind(k).first();
  const R = L || Fm; if (!R) return { ok: false, err: 'Заявка не найдена' }; k = R.k || k || '';
  const e = await efGet(env, R.efir_id), evId = Fm ? Fm.ev_id : e ? +efJ(e.cfg, {}).ev || 0 : 0, ev = evId ? await evGet(env, evId) : null, D = ev ? (await ev2Days(env, ev.id)).filter(x => !efJ(x.cfg, {}).hide || x.id === R.efir_id) : (e ? [e] : []), type = ev ? ev2Type(ev, D) : null, ids = D.map(x => x.id);
  const [sn, ms, lds, rg] = await env.DB.batch([env.DB.prepare('SELECT efir_id, min FROM efir_seen WHERE sess=0 AND k=? AND efir_id IN (' + ef6Ph(ids) + ')').bind(k, ...ids),
    env.DB.prepare("SELECT text FROM efir_msg WHERE k=? AND role='stu' AND kind IN ('msg','q') AND del=0 AND efir_id IN (" + ef6Ph(ids) + ') ORDER BY id LIMIT 10').bind(k, ...ids),
    env.DB.prepare('SELECT efir_id, MIN(sec) sec FROM efir_lead WHERE k=? AND efir_id IN (' + ef6Ph(ids) + ') GROUP BY efir_id').bind(k, ...ids),
    env.DB.prepare('SELECT r.at, r.src_code, r.gc_uid, s.title FROM ev_reg r LEFT JOIN ev_src s ON s.ev_id=r.ev_id AND s.code=COALESCE(r.src_code,\'\') WHERE r.ev_id=? AND r.k=?').bind(evId, k)]);
  const SN = {}, LS = {}; for (const x of sn.results || []) SN[x.efir_id] = x.min | 0; for (const x of lds.results || []) LS[x.efir_id] = x.sec;
  const reg = ef6One(rg), uid = k[0] === 'u' ? +k.slice(1) : (R.uid || 0), stu = uid ? await env.DB.prepare('SELECT uid FROM student WHERE uid=?').bind(uid).first().catch(() => null) : null;
  const sub = [stu ? 'ученик' : 'не ученик'].concat(reg.at ? ['запись ' + ef6Day(reg.at) + ' по ' + (reg.src_code ? 'ссылке «' + (reg.title || reg.src_code) + '»' : 'основной ссылке')] : []).join(' · ');
  const efirs = D.map((x, i) => { const c = efJ(x.cfg, {}), t = type === 'mar' ? 'День ' + (i + 1) + ' · ' + (c.short || x.title || '') : (ev ? (ev.short || ev.title) : (c.short || x.title || '')), fut = !x.at_live && x.status !== 'live' && x.status !== 'done' && x.status !== 'rec';
    return { id: x.id, title: t, min: SN[x.id] != null ? SN[x.id] : null, lead: LS[x.id] != null ? Math.floor(LS[x.id] / 60) : null, fut: fut ? 1 : 0 } });
  const tg = String(R.tg || ''), un = /^@[\w]{3,40}$/.test(tg) ? tg.slice(1) : null, chat = R.chat || (k ? await efKeyChat(env, k).catch(() => null) : null), gcu = uid || reg.gc_uid || 0;
  const out = { ok: true, id: (L ? 'l' : 'f') + R.id, kind: L ? 'lead' : 'form', k, efir_id: R.efir_id, name: R.name || 'Без имени', sub, contacts: [ef6Phone(R.phone), R.email, R.tg].filter(Boolean).join(' · '),
    tg_url: un ? 'https://t.me/' + un : '', dm: !un && chat ? 1 : 0, gc_url: gcu ? 'https://oduvanovroman.getcourse.ru/user/control/user/update/id/' + gcu : '', efirs, chat: (ms.results || []).map(x => String(x.text || '').slice(0, 300)), mode: ev ? ef6Mode(ev) : 'sell' };
  if (L) { const S = ev ? ev3Sale(ev) : null, of = S ? await ev3Prod(env, S, ev).catch(() => null) : null;
    Object.assign(out, { mgr_st: EF6_ST[L.mgr_st] ? L.mgr_st : (EF5_ST[L.st] || 'new'), note: L.note || '', order: L.order_num ? { num: String(L.order_num), url: L.order_id ? 'https://oduvanovroman.getcourse.ru/sales/control/deal/update/id/' + L.order_id : '', pay: L.pay_st === 'paid' ? 'paid' : L.pay_st === 'no' ? 'no' : 'new', prod: of && of.title ? { title: of.title, price: +of.price || 0 } : null } : null, order_err: !L.order_num && L.order_err ? 1 : 0 }) }
  else { const S = ev ? ev3Sale(ev) : null, Q = S ? (S.form.src === 'gform' ? S.form.gform.questions : S.form.questions) || [] : [], A = efJ(Fm.answers, {}) || {}, sh = S && S.sheet && S.sheet.url ? S.sheet.url : '';
    Object.assign(out, { answers: Object.keys(A).map(q => { const qq = Q.find(x => String(x.id) === String(q) || x.t === q || x.title === q); return { q: (qq && (qq.t || qq.title)) || q, a: Array.isArray(A[q]) ? A[q].join(', ') : String(A[q]) } }).slice(0, 20),
      sheet_st: Fm.sheet_st || '', st: Fm.st || 'new', sheet_url: sh ? sh + (Fm.row_n ? (/#gid=/.test(sh) ? '&' : '#') + 'range=A' + Fm.row_n : '') : '' }) }
  return out }
async function ef6PersonSave(env, o, W) { const id = String(o.id || ''); if (/^f\d+$/.test(id)) return { ok: false, err: 'Статус анкеты ведут в Google Таблице — правь там', st: 400 };
  const L = /^l\d+$/.test(id) ? await env.DB.prepare('SELECT id FROM efir_lead WHERE id=?').bind(+id.slice(1)).first() : (o.k ? await env.DB.prepare('SELECT id FROM efir_lead WHERE k=? ORDER BY at DESC LIMIT 1').bind(String(o.k)).first() : null);
  if (!L) return { ok: false, err: 'Заявка не найдена', st: 404 }; const q = [];
  if (o.mgr_st != null) { if (!EF6_ST[o.mgr_st]) return { ok: false, err: 'Неизвестный статус', st: 400 }; q.push(env.DB.prepare('UPDATE efir_lead SET mgr_st=?, st=? WHERE id=?').bind(o.mgr_st, EF6_OLD[o.mgr_st], L.id)) }
  if (o.note != null) q.push(env.DB.prepare('UPDATE efir_lead SET note=? WHERE id=?').bind(bStr(o.note, 2000) || null, L.id));
  if (!q.length) return { ok: false, err: 'Нечего сохранять', st: 400 }; await env.DB.batch(q); await logIt(env, 'efir-person', W.uid || 0, L.id + (o.mgr_st != null ? ' ' + o.mgr_st : '') + (o.note != null ? ' note' : '')); return { ok: true } }

/* 5.6 сводка после «Завершить эфир» (доска Tg; одна на эфир, получатели — 5.5). Тексты — в нейтральной форме, числа — с неразрывными пробелами */
async function ef6Report(env, e, I) { const id = e.id, dur = ef6DayDur(e), mode = I ? I.mode : (efNoSales(e) ? 'none' : 'sell'), cur = efNoSales(e);
  const [rg, sn, ms, qs, ld, wk, vc, fm, fo] = await env.DB.batch([I ? env.DB.prepare('SELECT COUNT(*) n FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0').bind(I.ev.id) : env.DB.prepare('SELECT COUNT(*) n FROM efir_reg WHERE efir_id=?').bind(id),
    env.DB.prepare('SELECT COUNT(DISTINCT k) n, AVG(min) a FROM efir_seen WHERE efir_id=? AND sess=0').bind(id), env.DB.prepare("SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND kind='msg' AND role='stu' AND del=0").bind(id),
    env.DB.prepare("SELECT COUNT(*) n FROM efir_msg WHERE efir_id=? AND kind='q' AND del=0").bind(id), env.DB.prepare('SELECT COUNT(*) n FROM efir_lead WHERE efir_id=?').bind(id),
    env.DB.prepare("SELECT COUNT(*) n, SUM(CASE WHEN ans=1 THEN 1 ELSE 0 END) a FROM efir_msg WHERE efir_id=? AND kind='work' AND del=0").bind(id), env.DB.prepare("SELECT sec, data FROM efir_ev WHERE efir_id=? AND kind='vc'").bind(id),
    env.DB.prepare('SELECT COUNT(*) n FROM ev_form WHERE efir_id=? AND COALESCE(test,0)=0 AND COALESCE(outside,0)=0').bind(id), env.DB.prepare("SELECT COUNT(DISTINCT data) n FROM efir_ev WHERE efir_id=? AND kind='fopen'").bind(id)]);
  let peak = 0, pmin = 0; for (const x of vc.results || []) { const n = +(efJ(x.data, {}).n || 0); if (n > peak) { peak = n; pmin = Math.floor((+x.sec || 0) / 60) } }
  const came = ef6One(sn).n | 0, avg = Math.round(ef6One(sn).a || 0), b = s => '<b>' + s + '</b>', L = [];
  const head = cur ? '📊 ' + b('Эфир завершён') + ' · «' + th(e.title) + '» · ' + ef6Dur(dur) : '📊 ' + b('Эфир завершён') + '\n«' + th(I ? I.ev.title : e.title) + '»' + (I && I.type === 'mar' && I.of > 1 ? ' · День ' + I.n : '') + ' · ' + ef6Dur(dur);
  if (I) { const prev = I.i > 0 ? I.D[I.i - 1] : null, from = prev ? (prev.at_end || (prev.start || 0) + (+prev.dur || 60) * 6e4) : (e.at_end || msNow()) - 864e5;
    const add = ef6One(await env.DB.prepare('SELECT COUNT(*) n FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0 AND at>?').bind(I.ev.id, from).all()).n | 0;
    L.push('Записались: ' + b(ef6Num(ef6One(rg).n)) + (add ? ' (+' + ef6Num(add) + ' за день)' : '')) }
  L.push('Пришли: ' + b(ef6Num(came)) + (peak ? ' · пик онлайн ' + ef6Num(peak) + ' на ' + pmin + '-й мин' : ''));
  L.push('Среднее время: ' + b(avg + NB + 'мин') + (came ? ' (' + ef6Pct(avg, dur) + '% эфира)' : ''));
  if (!cur && mode !== 'none') { const la = await env.DB.prepare("SELECT MIN(at_on) a FROM ev_mat_log WHERE efir_id=? AND kind='lead'").bind(id).first().catch(() => null), la2 = la && la.a ? la.a : ((await env.DB.prepare("SELECT MIN(at) a FROM efir_ev WHERE efir_id=? AND kind='lead'").bind(id).first()) || {}).a;
    if (la2) L.push('Досидели до заявки: ' + ef6Num(ef6One(await env.DB.prepare('SELECT COUNT(DISTINCT k) n FROM efir_seen WHERE efir_id=? AND sess=0 AND first<=? AND last>=?').bind(id, la2, la2).all()).n)) }
  L.push('Сообщений: ' + ef6Num(ef6One(ms).n) + ' · вопросов: ' + ef6Num(ef6One(qs).n));
  if (cur) { const W2 = ef6One(wk); if (W2.n) L.push('Работ разобрано: ' + (W2.a | 0) + ' из ' + (W2.n | 0)) }
  else if (mode === 'sell') { const n = ef6One(ld).n | 0; L.push('Заявок: ' + b(ef6Num(n)) + (came ? ' (' + ef6Pct(n, came) + '% пришедших)' : '')) }
  else if (mode === 'form') L.push('Анкет: ' + b(ef6Num(ef6One(fm).n)) + ' из ' + ef6Num(ef6One(fo).n) + ' открывших');
  /* опрос дня: последний показанный — «Опрос «<короткое>»: N% — <вариант со строчной>» */
  const pv = await env.DB.prepare("SELECT id, data FROM efir_ev WHERE efir_id=? AND kind='poll' ORDER BY id DESC LIMIT 1").bind(id).first().catch(() => null);
  if (pv) { const d = efJ(pv.data, {}), V = await qAll(env.DB.prepare('SELECT opt, COUNT(*) n FROM efir_pollv WHERE ev=? GROUP BY opt ORDER BY n DESC').bind('e' + pv.id)), tot = V.reduce((s, x) => s + x.n, 0);
    let ttl = d.q || ''; if (d.mat_id) { const m = await env.DB.prepare('SELECT data FROM ev_mat WHERE id=?').bind(+d.mat_id).first().catch(() => null); const md = m ? efJ(m.data, {}) : {}; ttl = md.short || ttl }
    if (tot && V[0] && (d.opts || [])[V[0].opt] != null) { const o1 = String(d.opts[V[0].opt]); L.push('Опрос «' + th(ttl) + '»: ' + Math.round(V[0].n / tot * 100) + '% — ' + th(o1.charAt(0).toLowerCase() + o1.slice(1))) } }
  let best = '';
  if (I) { const all = I.D.filter(x => x.at_live || x.id === id).map(x => x.id), ph = ef6Ph(all);
    const Q = mode === 'form' ? "SELECT COALESCE(r.src_code,'') c, COUNT(*) n FROM ev_form f LEFT JOIN ev_reg r ON r.ev_id=f.ev_id AND r.k=f.k WHERE COALESCE(f.test,0)=0 AND COALESCE(f.outside,0)=0 AND f.efir_id IN (" + ph + ') GROUP BY 1'
      : mode === 'sell' ? "SELECT COALESCE(src,'') c, COUNT(*) n FROM efir_lead WHERE efir_id IN (" + ph + ') GROUP BY 1'
      : "SELECT COALESCE(r.src_code,'') c, COUNT(DISTINCT s.k) n FROM efir_seen s JOIN ev_reg r ON r.ev_id=? AND r.k=s.k AND COALESCE(r.test,0)=0 WHERE s.sess=0 AND s.efir_id IN (" + ph + ') GROUP BY 1';
    const [A1, R1, T1] = await env.DB.batch([mode === 'none' ? env.DB.prepare(Q).bind(I.ev.id, ...all) : env.DB.prepare(Q).bind(...all), env.DB.prepare("SELECT COALESCE(src_code,'') c, COUNT(*) n FROM ev_reg WHERE ev_id=? AND COALESCE(test,0)=0 GROUP BY 1").bind(I.ev.id), env.DB.prepare('SELECT code, title FROM ev_src WHERE ev_id=?').bind(I.ev.id)]);
    const RG = {}; for (const x of R1.results || []) RG[x.c] = x.n | 0; const T = {}; for (const x of T1.results || []) T[x.code] = x.title;
    const top = (A1.results || []).filter(x => x.n > 0).sort((a, b2) => b2.n - a.n || (RG[b2.c] || 0) - (RG[a.c] || 0))[0];
    if (top) { const w = mode === 'form' ? plrS(top.n, 'анкета', 'анкеты', 'анкет') : mode === 'sell' ? plrS(top.n, 'заявка', 'заявки', 'заявок') : plrS(top.n, 'пришедший', 'пришедших', 'пришедших');
      best = 'Лучший источник: ' + th(top.c ? (T[top.c] || top.c) : 'Основная ссылка') + ' (' + ef6Num(top.n) + NB + w + ' за ' + (I.type === 'mar' ? 'марафон' : 'вебинар') + ')' } }
  const text = head + '\n\n' + L.join('\n') + (best ? '\n\n' + best : ''), SITE6 = 'https://oduvanovroman.getcourse.ru/teach/control/stream?fs=efir&h=';
  const btns = I ? [[{ text: 'Подробные итоги', url: SITE6 + encodeURIComponent('#host/ev/' + I.ev.id + '/stats/' + I.n) }]].concat(mode === 'none' ? [] : [[{ text: 'Заявки этого эфира', url: SITE6 + encodeURIComponent('#host/leads?ev=' + I.ev.id) }]]) : null;
  return { text, btns, came, leads: ef6One(ld).n | 0 } }
/* 06.11 (Роман): вместо уведомления о каждой заявке — одна сводка после «Завершить эфир». 07.11 Э5: выключается в 5.5 (kv efir_report=0); Э6: и галочкой «Сводка» на шаге 6 (sale.report=0) */
async function efReport(env, e) { const id = e.id;
  if ((await kvGet(env, 'efir_report').catch(() => null)) === 0) { await logIt(env, 'efir-report-off', 0, String(id)); return }
  await ef2Ensure(env); const I = await efEvInfo(env, e).catch(() => null); if (I && ev3Sale(I.ev).report === 0) { await logIt(env, 'efir-report-off', 0, id + ' sale'); return }
  const r = await ef6Report(env, e, I); let n = 0;
  for (const x of await efRepTo(env)) { try { const j = await tgSend(env, x.chat, r.text, r.btns); if (j && j.ok) n++ } catch (e2) {} } await logIt(env, 'efir-report', 0, id + ' ' + r.came + ' ' + r.leads + ' → ' + n) }
