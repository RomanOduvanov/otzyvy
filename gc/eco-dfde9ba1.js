/* OduvanovSchool · eco.js — новые страницы экосистемы внутри кабинета GetCourse (отдельно от layout.js, чтобы чаты не перетирали друг друга).
   Подключается в шаблоне 101699 отдельной строкой после layout-*.js.
   Сейчас: «Пульт куратора» — /teach/control/stream?fs=pult (для кураторов и Романа это стартовая страница кабинета).
   Пульт рисует сервер oduvanov-api (/app?embed=1) во фрейме: вход подтверждается через Telegram-бота, данные учеников наружу не отдаются. */
(function () {
  if (window.top !== window || window.__eco) return; window.__eco = 1;
  var API = 'https://oduvanov-api.romanoduvanov52.workers.dev';
  var STAFF = { 504950432: 'Антон', 510261529: 'Кирилл', 499631257: 'Роман' }; /* кураторы и Роман (uid GetCourse) */
  var U = +window.accountUserId || 0, path = location.pathname.replace(/\/+$/, '');
  var isPult = path === '/teach/control/stream' && /[?&]fs=pult\b/.test(location.search);
  if (!STAFF[U]) return;
  var R = document.documentElement;
  /* стартовая страница: первый заход в «Мои тренинги» за сессию → пульт */
  if (path === '/teach/control/stream' && !isPult && !/[?&]fs=/.test(location.search)) {
    var seen = ''; try { seen = sessionStorage.getItem('ecoPultSeen') || '' } catch (e) {}
    if (!seen) { try { sessionStorage.setItem('ecoPultSeen', '1') } catch (e) {} location.replace('/teach/control/stream?fs=pult'); return }
  }
  var css = document.createElement('style');
  css.textContent = '.eco-chip{position:fixed;right:18px;bottom:18px;z-index:9990;display:inline-flex;align-items:center;gap:8px;height:44px;padding:0 18px;border-radius:14px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font:600 14px "Inter Tight",Inter,sans-serif;text-decoration:none!important;box-shadow:0 16px 40px -12px rgba(215,127,255,.6),inset 0 0 0 1px rgba(255,255,255,.6)}'
    + 'html.eco-pult .gc-main-content>*:not(#ecoPult):not(.fs-foot){display:none!important}'
    + '#ecoPult{max-width:1280px;margin:0 auto;padding:8px 24px 0}#ecoPult iframe{display:block;width:100%;border:0;min-height:900px;background:transparent;color-scheme:dark}'
    + '#ecoPult .eco-back{display:inline-flex;margin:8px 0 0;color:#d77fff;font:500 14px "Inter Tight",Inter,sans-serif;text-decoration:none}'
    + '@media (max-width:760px){#ecoPult{padding:4px 12px 0}.eco-chip{right:12px;bottom:12px}}';
  (document.head || R).appendChild(css);
  function chip() { if (R.classList.contains('fs-adm') || isPult || document.querySelector('.eco-chip')) return; var a = document.createElement('a'); a.className = 'eco-chip'; a.href = '/teach/control/stream?fs=pult';
    a.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>' + (U === 499631257 ? 'Кураторы' : 'Пульт куратора'); document.body.appendChild(a) }
  function mount() {
    var mc = document.querySelector('.gc-main-content'); if (!mc) return false; if (document.getElementById('ecoPult')) return true;
    R.classList.add('eco-pult'); document.title = (U === 499631257 ? 'Кураторы' : 'Пульт куратора') + ' · OduvanovSchool';
    var box = document.createElement('div'); box.id = 'ecoPult';
    box.innerHTML = '<a class="eco-back" href="/teach/control/stream">← Мои тренинги</a><iframe title="Пульт куратора" src="' + API + '/app?embed=1&gc=' + U + '" allow="clipboard-write"></iframe>';
    mc.insertBefore(box, mc.firstChild);
    window.addEventListener('message', function (e) { if (e.origin !== API || !e.data || !e.data.ecoH) return; box.querySelector('iframe').style.height = Math.max(600, +e.data.ecoH) + 'px' });
    return true }
  function go() { if (isPult) { if (!mount()) { var n = 0, iv = setInterval(function () { if (mount() || ++n > 40) clearInterval(iv) }, 150) } } else chip() }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
