/* 28.10: загрузчик кожи оплаты для страниц-форм GetCourse (/prodlenie-*, /povyshenie-premium-amazon). У этих CMS-страниц свой шаблон без eco.js,
   поэтому в каждую вставлен HTML-блок <script src="https://romanoduvanov.github.io/otzyvy/gc/paypage.js"></script>. Имя файла постоянное — при новом payskin
   менять здесь PAYSKIN (scripts/publish_pages.sh --payskin делает это сам). Работает только в окне Telegram (?tg=1 / #tgWebAppVersion / метка вкладки) и на ширине ≤767. */
(function () { try {
  var PAYSKIN = '22b3bc4f', R = document.documentElement, on = /[?&]tg=1\b/.test(location.search) || /tgWebAppVersion=/.test(location.hash);
  try { if (on) sessionStorage.setItem('ecoTg', '1'); else on = sessionStorage.getItem('ecoTg') === '1' } catch (e) {}
  if (!on || innerWidth > 767 || window.__payskin || document.getElementById('ecoPayskin')) return;
  R.classList.add('eco-tg');
  var SA = (location.search.match(/[?&]tgsa=(\d+)/) || [])[1]; try { if (SA != null) sessionStorage.setItem('ecoSA', SA); else SA = sessionStorage.getItem('ecoSA') } catch (e) {}
  if (SA != null) R.style.setProperty('--eco-sat', SA + 'px');
  R.style.setProperty('--eco-tb', 'calc(max(env(safe-area-inset-bottom, 0px), calc(var(--tg-safe-area-inset-bottom, 0px) + var(--tg-content-safe-area-inset-bottom, 0px))) + 8px)'); /* полоса «домой» — как в eco.js: в полноэкранном Telegram env() бывает 0, отступ даёт Telegram (--tg-safe-area-inset-bottom) */ /* вкладок приложения на этих страницах нет — кнопка оплаты у нижнего края */
  if (!window.Telegram) { var t = document.createElement('script'); t.src = 'https://telegram.org/js/telegram-web-app.js'; (document.head || R).appendChild(t) }
  var s = document.createElement('script'); s.id = 'ecoPayskin'; s.src = 'https://romanoduvanov.github.io/otzyvy/gc/payskin-' + PAYSKIN + '.js'; (document.head || R).appendChild(s)
} catch (e) {} })();
