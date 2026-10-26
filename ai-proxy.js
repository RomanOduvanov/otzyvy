/* oduvanov-ai — посредник к Anthropic API. Закреплён в регионе США (placement.region), чтобы
   запросы не уходили из дата-центров в странах, где Anthropic недоступен (напр. HKG → 403).
   Принимает только POST /v1/messages от нашего сервера oduvanov-api (заголовок CF-Worker). */
const OK_ORIGIN = 'romanoduvanov52.workers.dev';
const err = (s, m) => new Response(JSON.stringify({ type: 'error', error: { type: 'proxy', message: m } }), { status: s, headers: { 'content-type': 'application/json' } });
export default {
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname === '/health') return new Response(JSON.stringify({ ok: true, colo: req.cf && req.cf.colo }), { headers: { 'content-type': 'application/json' } });
    if (req.method !== 'POST' || u.pathname !== '/v1/messages') return err(404, 'not found');
    const from = req.headers.get('cf-worker') || '';
    if (from !== OK_ORIGIN) return err(403, 'proxy: origin ' + (from || 'none'));
    const h = new Headers();
    for (const k of ['content-type', 'x-api-key', 'anthropic-version', 'anthropic-beta']) { const v = req.headers.get(k); if (v) h.set(k, v); }
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: h, body: req.body });
    const out = new Headers(r.headers); out.set('x-proxy-colo', (req.cf && req.cf.colo) || '?');
    return new Response(r.body, { status: r.status, headers: out });
  }
};
