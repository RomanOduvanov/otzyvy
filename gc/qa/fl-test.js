/* 30.10: первый вход нового ученика (ссылка из письма) — страница профиля GetCourse с формой «Здравствуйте, … Дополните информацию о себе».
   По макету docs/mockups/pervyy-vhod: шаги сверху, слева круг-фото + «Что дальше» (бот, Модуль 00), справа форма в две колонки (телефон, город, дата рождения + Telegram),
   галочка оферты над кнопкой, «Пропустить». Форма остаётся формой GetCourse (тот же узел, его же отправка) — меняем вид, подписи и порядок.
   Telegram GetCourse не хранит — пишем на наш сервер (/chat/tgname), куратор видит его в шапке чата. После «Сохранить» — экран «Готово». */
(function () {
  if (window.__fsFl) return; window.__fsFl = 1;
  var NB = '\u00a0', DONE = 'fsflDone', M00 = '/teach/control/stream/view/id/935917159', COVER = 'https://romanoduvanov.github.io/otzyvy/gc/covers/m00.jpg';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) };
  var nb = function (s) { return String(s).replace(/ (?=[^ ]{1,3}( |$))/g, NB) };
  var IC = {
    ok: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    tg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M21.4 4.3 2.9 11.4c-1.3.5-1.2 1.3-.2 1.6l4.7 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.4l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.6c.3-1.3-.5-1.9-1.4-1.5zM8.4 14.1l9.9-6.3c.5-.3.9-.1.5.2l-8.2 7.4-.3 3.4-1.9-4.7z"/></svg>',
    arr: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };
  function css() { if (document.getElementById('fsFlCss')) return; var s = document.createElement('style'); s.id = 'fsFlCss';
    var F = '"Inter Tight",system-ui,-apple-system,sans-serif', R = 'html.fsfl-on ';
    s.textContent =
      /* страница GetCourse под нашим экраном — прячем; форма переезжает к нам */
      R + '.xdget-myProfileSystemPage .layout-fixwidth>:not(#fsfl),' + R + '.eco-nr,' + R + '.eco-chip,' + R + 'body .global-controls,' + R + 'body .global-controls.eco-gc,' + R + '.xdget-userCompleteForm>.xdget-header,' + R + '.xdget-userCompleteForm>.xdget-html,' + R + '.xdget-userCompleteForm .xdget-form-field-profile_image{display:none!important}'
      + '#fsfl{--s2:#16161b;--s3:#1f1f26;--line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.14);--mut:rgba(255,255,255,.64);--dim:rgba(255,255,255,.44);--vio:#c38bff;color:#fff;font:400 15px/1.45 ' + F + ';max-width:1120px;margin:28px 0 48px;-webkit-font-smoothing:antialiased}'
      + '#fsfl *{box-sizing:border-box;font-family:' + F + '!important}'
      + '#fsfl a{text-decoration:none}#fsfl a.fl-row,#fsfl a.fl-row b{color:#fff!important}#fsfl a.fl-row:hover b{color:#d9b8ff!important}'
      + '#fsfl .fl-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}'
      + '#fsfl .fl-k{font-size:14px;font-weight:500;color:var(--vio)}'
      + '#fsfl .fl-h1{font-size:52px;line-height:1.05;font-weight:600;letter-spacing:-.035em;margin:6px 0 0;color:#fff}'
      + '#fsfl .fl-set{font-size:14px;color:var(--mut);margin-top:14px;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}#fsfl .fl-set:hover{color:#fff}'
      + '#fsfl .c{background:var(--s2);border:1px solid var(--line);border-radius:28px;padding:24px;min-width:0}'
      + '#fsfl .fl-steps{margin-top:18px;padding:16px 20px;border-radius:24px;display:flex;gap:14px 22px;flex-wrap:wrap;align-items:center}'
      + '#fsfl .fl-st{display:flex;gap:10px;align-items:center;font-size:14px;color:var(--mut);white-space:nowrap}#fsfl .fl-st.on{color:#fff;font-weight:500}'
      + '#fsfl .fl-st i{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;flex:none;font:600 13px/1 ' + F + ';font-style:normal;background:var(--s3);color:var(--mut)}'
      + '#fsfl .fl-st.ok i{background:rgba(74,222,128,.15);color:#4ade80}#fsfl .fl-st.on i{background:#c38bff;color:#1a0b2e}'
      + '#fsfl .fl-sep{flex:0 0 24px;height:1px;background:var(--line2)}'
      + '#fsfl .fl-grid{display:grid;grid-template-columns:320px minmax(0,1fr);grid-template-areas:"me form" "next form";gap:20px;margin-top:20px;align-items:start}'
      + '#fsfl .fl-me{grid-area:me;display:grid;justify-items:center;text-align:center;gap:10px;padding:28px 22px}'
      + '#fsfl .fl-next{grid-area:next;display:grid;gap:14px}#fsfl .fl-formc{grid-area:form;padding:32px}'
      + '#fsfl .fl-av{width:132px;height:132px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#2b2b31,#151518) center/cover;border:1.5px dashed rgba(195,139,255,.5);display:grid;place-items:center;color:#c38bff;cursor:pointer;padding:0;font:inherit;position:relative;overflow:hidden}'
      + '#fsfl .fl-av span{display:grid;justify-items:center;gap:2px;font-size:12px;line-height:1.3}#fsfl .fl-av.has{border:0}#fsfl .fl-av.has span{display:none}#fsfl .fl-av:focus-visible{outline:2px solid #c38bff;outline-offset:3px}'
      + '#fsfl .fl-nm{font-size:22px;font-weight:600;margin-top:4px;letter-spacing:-.01em}#fsfl .fl-in{font-size:13px;line-height:1.5;color:var(--dim)}'
      + '#fsfl .fl-hr{width:100%;height:1px;background:var(--line);margin:6px 0}#fsfl .fl-note{font-size:13px;line-height:1.5;color:var(--mut)}'
      + '#fsfl .fl-k2{font-size:14px;font-weight:500;color:var(--dim)}'
      + '#fsfl .fl-row{display:flex;gap:12px;align-items:center;min-width:0;color:#fff}#fsfl .fl-row b{display:block;font-weight:500}#fsfl .fl-row small{display:block;font-size:13px;color:var(--dim)}'
      + '#fsfl .fl-ic{width:44px;height:44px;border-radius:14px;background:rgba(96,165,250,.14);color:#60a5fa;display:grid;place-items:center;flex:none}'
      + '#fsfl .fl-cov{width:88px;height:56px;border-radius:12px;flex:none;background:#1f1f26 center/cover}'
      + '#fsfl .fl-b2{height:44px;border-radius:12px;border:1px solid var(--line2);background:var(--s3);color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:600;cursor:pointer}#fsfl .fl-b2:hover{background:#2a2a33}'
      + '#fsfl .fl-b2.done{background:rgba(74,222,128,.12);border-color:transparent;color:#4ade80;cursor:default}'
      + '#fsfl .fl-line{height:1px;background:var(--line)}'
      + '#fsfl .fl-hi{font-size:32px;line-height:1.15;font-weight:600;letter-spacing:-.02em}#fsfl .fl-sub{font-size:15px;line-height:1.5;color:var(--mut);margin-top:6px}'
      /* форма GetCourse */
      + '#fsfl form.xdget-userCompleteForm{display:grid!important;grid-template-columns:1fr 1fr;gap:16px;margin:22px 0 0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;color:#fff!important;max-width:none!important;width:auto!important}'
      + '#fsfl form.xdget-userCompleteForm>*{grid-column:1/-1;margin:0!important}'
      + '#fsfl form .xdget-userFormField,#fsfl form .fl-tg{grid-column:auto!important}'
      + '#fsfl form .form-field{display:grid;gap:8px;align-content:start;margin:0!important;padding:0!important}'
      + '#fsfl form .field-label{display:block!important;margin:0!important;font-size:14px!important;font-weight:400!important;line-height:1.42857!important;color:var(--mut)!important}#fsfl form .required-sign{display:none!important}'
      + '#fsfl form input.form-control,#fsfl .fl-tg input{height:52px!important;min-height:52px!important;border-radius:14px!important;border:1px solid var(--line2)!important;background:#0b0b0d!important;color:#fff!important;-webkit-text-fill-color:#fff!important;padding:0 16px!important;font-size:16px!important;box-shadow:none!important;width:100%!important;outline:0}'
      + '#fsfl form input.form-control:focus,#fsfl .fl-tg input:focus{border-color:#c38bff!important;box-shadow:0 0 0 3px rgba(195,139,255,.18)!important}'
      + '#fsfl input::placeholder{color:var(--dim)!important;-webkit-text-fill-color:var(--dim)!important;opacity:1}'
      + '#fsfl input:-webkit-autofill{-webkit-box-shadow:0 0 0 1000px #0b0b0d inset!important;-webkit-text-fill-color:#fff!important;caret-color:#fff}'
      + '#fsfl .fl-hint{font-size:12.5px;color:var(--dim)}#fsfl .fl-err{font-size:12.5px;color:#f87171}'
      + '#fsfl .bad input.form-control,#fsfl .fl-tg.bad input,#fsfl .bad input.form-control:focus,#fsfl .fl-tg.bad input:focus{border-color:#f87171!important;box-shadow:0 0 0 3px rgba(248,113,113,.16)!important}#fsfl .bad .fl-hint{display:none}'
      + '#fsfl .fl-tg{display:grid;gap:8px;align-content:start}#fsfl .fl-tg label{display:block;font-size:14px!important;font-weight:400!important;line-height:1.42857!important;color:var(--mut)!important;margin:0!important}'
      + '#fsfl form .global-confirm-checkbox-block{margin-top:6px!important;padding:0!important}'
      + '#fsfl form .global-confirm-checkbox-block label{display:flex!important;gap:12px;align-items:flex-start;font-size:14px!important;line-height:1.45;color:rgba(255,255,255,.75)!important;margin:0!important;cursor:pointer;font-weight:400!important}'
      + '#fsfl form .global-confirm-checkbox{-webkit-appearance:none!important;appearance:none!important;flex:none;width:22px!important;height:22px!important;margin:0!important;border-radius:7px!important;border:1.5px solid rgba(255,255,255,.28)!important;background:#0b0b0d no-repeat center/14px!important;cursor:pointer;position:static!important;opacity:1!important}'
      + '#fsfl form .global-confirm-checkbox:checked{background-color:#c38bff!important;border-color:#c38bff!important;background-image:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m5 12.5 4.5 4.5L19 7.5%27 fill=%27none%27 stroke=%27%23fff%27 stroke-width=%273%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E")!important}'
      + '#fsfl form .global-confirm-checkbox-block.bad .global-confirm-checkbox{border-color:#f87171!important}'
      + '#fsfl form .global-confirm-checkbox-block .checkbox-text{margin:0!important;padding:0!important}#fsfl form .global-confirm-checkbox-block a{color:#d77fff!important}#fsfl form .fl-ofe{margin:6px 0 0 34px}'
      + '#fsfl form .form-buttons{margin-top:4px!important;padding:0!important;text-align:center}'
      + '#fsfl form .form-buttons .btn{display:flex!important;align-items:center;justify-content:center;width:100%!important;height:56px!important;border:0!important;border-radius:16px!important;background:linear-gradient(180deg,#fef8ff,#fccbff)!important;color:#602364!important;font-size:16px!important;font-weight:600!important;text-transform:none!important;letter-spacing:0!important;box-shadow:none!important;padding:0 20px!important}'
      + '#fsfl form .form-buttons .btn:hover{filter:brightness(1.03)}'
      + '#fsfl .fl-skip{display:inline-flex;align-items:center;gap:6px;margin-top:14px;color:#d77fff;font-size:14px;font-weight:500}'
      + '#fsfl form .error-message{border:0!important;background:rgba(248,113,113,.12)!important;color:#fca5a5!important;border-radius:12px!important;font-size:14px}'
      + '#fsfl form .login-block,#fsfl form .remind-block{color:#fff}'
      /* «Готово» */
      + '#fsfl .fl-done{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:20px;margin-top:20px;align-items:start}#fsfl .fl-dr{display:grid;gap:20px}#fsfl .fl-dc{padding:48px 32px!important;min-height:100%;align-content:center}#fsfl .fl-dc{display:grid;justify-items:center;text-align:center;gap:8px;padding:32px 24px}'
      + '#fsfl .fl-ck{width:64px;height:64px;border-radius:50%;background:rgba(74,222,128,.15);color:#4ade80;display:grid;place-items:center;margin-bottom:8px}#fsfl .fl-ck svg{width:30px;height:30px}'
      + '#fsfl .fl-btn{height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364;font-size:16px;font-weight:600}'
      + '@media(max-width:900px){#fsfl .fl-done{grid-template-columns:minmax(0,1fr)}#fsfl .fl-dc{padding:32px 24px!important}#fsfl .fl-grid{grid-template-columns:minmax(0,1fr);grid-template-areas:"me" "form" "next"}#fsfl .fl-h1{font-size:40px}}'
      + '@media(max-width:600px){#fsfl{margin-top:12px}#fsfl .fl-h1{font-size:28px;letter-spacing:-.02em}#fsfl .fl-k{font-size:13px}#fsfl .fl-set{display:none}#fsfl .c{border-radius:24px;padding:20px 18px}#fsfl .fl-formc{padding:24px 18px}'
      + '#fsfl .fl-steps{padding:10px 14px;gap:8px;flex-wrap:nowrap;overflow:hidden}#fsfl .fl-st{font-size:14px;gap:6px}#fsfl .fl-st i{width:22px;height:22px;font-size:11px}#fsfl .fl-st:not(.ok) i{display:none}#fsfl .fl-st .l{display:none}#fsfl .fl-st .s{display:inline!important}'
      + '#fsfl .fl-sep{flex:0 0 auto;width:auto;height:auto;background:none;color:var(--dim)}#fsfl .fl-sep:before{content:"→"}'
      + '#fsfl .fl-me{padding:22px 18px}#fsfl .fl-av{width:96px;height:96px}#fsfl .fl-me .fl-hr,#fsfl .fl-me .fl-note{display:none}'
      + '#fsfl .fl-hi{font-size:26px}#fsfl form.xdget-userCompleteForm{grid-template-columns:minmax(0,1fr)}}';
    (document.head || document.documentElement).appendChild(s) }

  function steps(at) { var L = [['Почта подтверждена', 'Почта'], ['Расскажи о' + NB + 'себе', 'О' + NB + 'себе'], ['Подключи бота', 'Бот'], ['Первый урок', 'Урок']];
    return '<div class="c fl-steps" aria-label="Шаги">' + L.map(function (x, i) { var n = i + 1, cl = n < at ? 'ok' : n === at ? 'on' : '';
      return (i ? '<span class="fl-sep" aria-hidden="true"></span>' : '') + '<div class="fl-st ' + cl + '"><i>' + (n < at ? IC.ok : n) + '</i><span class="l">' + x[0] + '</span><span class="s" style="display:none">' + x[1] + '</span></div>' }).join('') + '</div>' }
  function next(me) { var tgOk = me && me.tg_ok, link = me && me.tg_link;
    return '<div class="c fl-next"><div class="fl-k2">Что' + NB + 'дальше</div>'
      + '<div class="fl-row"><span class="fl-ic">' + IC.tg + '</span><div style="min-width:0"><b>Подключи Telegram-бот</b><small>Ответы куратора и' + NB + 'напоминания</small></div></div>'
      + (tgOk ? '<span class="fl-b2 done">' + IC.ok + 'Бот подключён</span>' : '<a class="fl-b2" data-bot href="' + esc(link || 'https://t.me/oduvanov_school_bot') + '" target="_blank" rel="noopener">Подключить бота</a>')
      + '<div class="fl-line"></div>'
      + '<a class="fl-row" href="' + M00 + '"><span class="fl-cov" style="background-image:url(' + COVER + ')"></span><div style="min-width:0"><b>Модуль 00 · Старт</b><small>Уроки, баллы и' + NB + 'рейтинг · 12' + NB + 'мин</small></div></a></div>' }

  function info() { var nmEl = document.querySelector('.xdget-profileTitle'), inf = document.querySelector('.xdget-myProfileSystemPage .xdget-profileInfo'), img = document.querySelector('.xdget-myProfileSystemPage .xdget-profileAvatar img');
    var t = inf ? inf.innerHTML.split(/<br\s*\/?>/i).map(function (x) { return x.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }) : [], from = '', reg = '';
    t.forEach(function (x) { var m = x.match(/^Откуда:\s*(.+)$/); if (m) from = m[1]; m = x.match(/^Регистрация:\s*(.+)$/); if (m) reg = m[1] });
    var since = !reg || /(секунд|минут|час)/.test(reg) ? 'в' + NB + 'школе с' + NB + 'сегодняшнего дня' : 'в' + NB + 'школе: ' + reg;
    return { name: nmEl ? nmEl.textContent.replace(/\s+/g, ' ').trim() : '', line: [from, since].filter(Boolean).join(' · '), img: img && !/default_profile/.test(img.getAttribute('src') || '') ? img.src : '' } }
  function first(form) { var f = form.querySelector('input[name=first_name]'), h = form.querySelector('.xdget-header'); var n = f && f.value.trim(); if (!n && h) n = h.textContent.replace(/^\s*Здравствуйте,?\s*/, '').trim(); return (n || '').split(' ')[0] }

  function getMe() { try { return window.FS_CALL && window.ecoK && window.ecoK.U ? window.FS_CALL('/me?u=' + window.ecoK.U).then(function (r) { return r.json() }).catch(function () { return null }) : Promise.resolve(null) } catch (e) { return Promise.resolve(null) } }
  function api(p, b) { try { return window.ecoK && window.ecoK.api ? window.ecoK.api('student', p, b) : Promise.resolve(null) } catch (e) { return Promise.resolve(null) } }

  function mountDone(root, I) { var nm = (I.name || '').split(' ')[0];
    root.innerHTML = '<div class="fl-k">Добро пожаловать в' + NB + 'OduvanovSchool</div><div class="fl-h1">' + esc(I.name || 'Профиль') + '</div>' + steps(3)
      + '<div class="fl-done"><div class="c fl-dc"><span class="fl-ck">' + IC.ok + '</span><div class="fl-hi">Готово' + (nm ? ', ' + esc(nm) : '') + '!</div><div class="fl-sub">Профиль сохранён. Осталось два' + NB + 'шага&nbsp;— и' + NB + 'ты в' + NB + 'потоке.</div></div>'
      + '<div class="fl-dr"><div data-next>' + next(null) + '</div><a class="fl-btn" href="' + M00 + '">Начать первый урок' + IC.arr + '</a></div></div>';
    try { window.scrollTo(0, 0) } catch (e) {}
    getMe().then(function (me) { var n = root.querySelector('[data-next]'); if (me && n) n.innerHTML = next(me) }) }

  function mount(form) { var page = document.querySelector('.xdget-myProfileSystemPage .layout-fixwidth'); if (!page) return false;
    css(); var I = info(), root = document.createElement('div'); root.id = 'fsfl'; page.insertBefore(root, page.firstChild); document.documentElement.classList.add('fsfl-on');
    var fn = first(form);
    root.innerHTML = '<div class="fl-top"><div><div class="fl-k">Добро пожаловать в' + NB + 'OduvanovSchool</div><div class="fl-h1">' + esc(I.name || 'Профиль') + '</div></div><a class="fl-set" href="#" data-set>Все' + NB + 'настройки профиля' + IC.arr + '</a></div>'
      + steps(2) + '<div class="fl-grid">'
      + '<div class="c fl-me"><button type="button" class="fl-av' + (I.img ? ' has' : '') + '"' + (I.img ? ' style="background-image:url(' + esc(I.img) + ')"' : '') + ' aria-label="Добавить фото"><span>' + IC.plus + 'Добавить<br>фото</span></button>'
      + '<div class="fl-nm">' + esc(I.name) + '</div><div class="fl-in">' + esc(I.line) + '</div><div class="fl-hr"></div><div class="fl-note">Фото увидят куратор и' + NB + 'одногруппники в' + NB + 'рейтинге потока</div></div>'
      + '<div class="c fl-formc"><div class="fl-hi">Привет' + (fn ? ', ' + esc(fn) : '') + '!</div><div class="fl-sub">Расскажи немного о' + NB + 'себе&nbsp;— так' + NB + 'куратору проще помочь. Это' + NB + 'минута, можно заполнить и' + NB + 'позже.</div><div data-f></div>'
      + '<div style="text-align:center"><a class="fl-skip" href="/teach/control/stream" data-skip>Пропустить и' + NB + 'перейти к' + NB + 'обучению' + IC.arr + '</a></div></div>'
      + '<div data-next style="grid-area:next">' + next(null) + '</div></div>';
    root.querySelector('[data-f]').appendChild(form);
    getMe().then(function (me) { var n = root.querySelector('[data-next]'); if (me && n) n.innerHTML = next(me) });
    root.querySelector('[data-set]').addEventListener('click', function (e) { e.preventDefault(); var u = window.ecoK && window.ecoK.U; location.href = u ? '/pl/' + u + '#settings' : '/user/my/profile' });

    /* поля: подписи, подсказки, плейсхолдеры, автозаполнение */
    var H = { phone: ['Телефон', '+7 999 123-45-67', 'Для' + NB + 'связи с' + NB + 'куратором, без' + NB + 'рекламы', 'tel'], city: ['Город', 'Например, Москва', '', 'address-level2'], birthday: ['Дата рождения', 'дд.мм.гггг', 'Поздравим с' + NB + 'днём рождения', 'bday'],
      country: ['Страна', 'Например, Россия', '', 'country-name'], first_name: ['Имя', 'Как тебя зовут', '', 'given-name'], last_name: ['Фамилия', '', '', 'family-name'] };
    Object.keys(H).forEach(function (k) { var inp = form.querySelector('input[name=' + k + ']'); if (!inp) return; var h = H[k], ff = inp.closest('.form-field'), lab = ff && ff.querySelector('.label-value');
      if (lab) lab.textContent = h[0]; if (h[1]) inp.setAttribute('placeholder', h[1]); inp.setAttribute('autocomplete', k === 'birthday' ? 'off' : h[3]); if (k === 'phone') inp.setAttribute('inputmode', 'tel');
      if (h[2] && ff && !ff.querySelector('.fl-hint')) { var d = document.createElement('span'); d.className = 'fl-hint'; d.innerHTML = h[2]; ff.appendChild(d) } });
    /* дата рождения: вводится с клавиатуры (точки ставим сами), календарь GetCourse не всплывает и не стирает набранное */
    var bdi = form.querySelector('input[name=birthday]');
    if (bdi) { try { var dp = window.jQuery && jQuery(bdi).data('datepicker'); if (dp && dp.o) { dp.o.showOnFocus = false; dp.o.forceParse = false } } catch (e) {}
      bdi.setAttribute('inputmode', 'numeric'); bdi.setAttribute('maxlength', '10');
      bdi.addEventListener('input', function () { var d = bdi.value.replace(/\D/g, '').slice(0, 8), v = d.slice(0, 2) + (d.length > 2 ? '.' + d.slice(2, 4) : '') + (d.length > 4 ? '.' + d.slice(4) : ''); if (v !== bdi.value) bdi.value = v });
      bdi.addEventListener('blur', function () { var v = bdi.value.trim(); if (!v) return; try { if (window.jQuery && jQuery(bdi).data('datepicker')) { jQuery(bdi).datepicker('update', v); bdi.value = v } } catch (e) {} }) }
    /* Telegram — наше поле, после даты рождения (или перед галочкой) */
    var tg = document.createElement('div'); tg.className = 'fl-tg'; tg.innerHTML = '<label for="flTg">Telegram</label><input id="flTg" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="@username" maxlength="40"><span class="fl-hint">Чтобы' + NB + 'куратор мог написать</span>';
    var bd = form.querySelector('.xdget-form-field-birthday') || form.querySelector('.xdget-userFormField:last-of-type'); if (bd && bd.parentNode === form) form.insertBefore(tg, bd.nextSibling); else form.insertBefore(tg, form.querySelector('.form-buttons'));
    api('/chat/tgname').then(function (j) { var i = tg.querySelector('input'); if (j && j.ok && j.tg && !i.value) i.value = '@' + j.tg });
    /* фото: круг слева открывает загрузку GetCourse; превью — сразу из файла */
    var av = root.querySelector('.fl-av'); av.addEventListener('click', function () { var fi = form.querySelector('.xdget-form-field-profile_image input[type=file]'); if (fi) fi.click() });
    form.addEventListener('change', function (e) { var t = e.target; if (!t || t.type !== 'file' || !t.files || !t.files[0] || !/^image\//.test(t.files[0].type)) return; var r = new FileReader(); r.onload = function () { av.style.backgroundImage = 'url(' + r.result + ')'; av.classList.add('has') }; r.readAsDataURL(t.files[0]) }, true);
    var skip = root.querySelector('[data-skip]'); skip.addEventListener('click', function () { try { sessionStorage.setItem('fsflSkip', '1') } catch (e) {} });
    tidy(form); var mo = new MutationObserver(function () { mo.disconnect(); tidy(form); watch(); mo.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] }) }); var watch = function () { if (form.style.display === 'none' || !document.body.contains(form)) finish() };
    mo.observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    var k = 0, iv = setInterval(function () { tidy(form); if (++k > 30) clearInterval(iv) }, 400);

    /* проверка перед отправкой: телефон, галочка, Telegram; потом — отправка GetCourse */
    var pass = false;
    function err(el, txt) { var host = el.closest('.form-field') || el.closest('.fl-tg') || el.closest('.global-confirm-checkbox-block'); if (!host) return; host.classList.toggle('bad', !!txt); var e = host.querySelector('.fl-err');
      if (!txt) { if (e) e.remove(); return } if (!e) { e = document.createElement('span'); e.className = 'fl-err' + (host.classList.contains('global-confirm-checkbox-block') ? ' fl-ofe' : ''); host.appendChild(e) } e.innerHTML = txt }
    form.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.form-buttons .btn'); if (!b) return; if (pass) { pass = false; return }
      if (b.__wait) { e.preventDefault(); e.stopImmediatePropagation(); return }
      var bad = false, ph = form.querySelector('input[name=phone]'), cb = form.querySelector('.global-confirm-checkbox'), ti = tg.querySelector('input');
      if (ph) { var dg = ph.value.replace(/\D/g, ''); var m = ph.value.trim() && dg.length < 10 ? 'Не' + NB + 'хватает цифр&nbsp;— проверь номер' : ''; err(ph, m); bad = bad || !!m }
      var bi = form.querySelector('input[name=birthday]'); if (bi) { var bv = bi.value.trim(), bm = bv.match(/^(\d{2})\.(\d{2})\.(\d{4})$/), bad2 = '';
        if (bv) { var yy = bm ? +bm[3] : 0, dt = bm ? new Date(yy, +bm[2] - 1, +bm[1]) : null; if (!bm || dt.getMonth() !== +bm[2] - 1 || yy < 1940 || yy > new Date().getFullYear() - 5) bad2 = 'Проверь дату: дд.мм.гггг, например' + NB + '14.03.1998' }
        err(bi, bad2); bad = bad || !!bad2 }
      var tv = ti.value.trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, ''); var tm = tv && !/^[A-Za-z0-9_]{5,32}$/.test(tv) ? 'Ник латиницей, от' + NB + '5' + NB + 'символов, например' + NB + '@ivan_design' : ''; err(ti, tm); bad = bad || !!tm;
      if (cb && !cb.checked) { err(cb, 'Отметь согласие, чтобы сохранить'); bad = true } else if (cb) err(cb, '');
      if (bad) { e.preventDefault(); e.stopImmediatePropagation(); var f1 = form.querySelector('.bad input'); if (f1) f1.focus(); return }
      try { sessionStorage.setItem(DONE, '1') } catch (x) {}
      if (!tv) return;
      /* сначала Telegram на наш сервер (до 2,5 с), потом — та же кнопка GetCourse */
      e.preventDefault(); e.stopImmediatePropagation(); b.__wait = 1; var fired = false, go = function () { if (fired) return; fired = true; b.__wait = 0; pass = true; b.click() };
      setTimeout(go, 2500); api('/chat/tgname', { tg: tv }).then(go, go) }, true);
    form.addEventListener('input', function (e) { var t = e.target; if (t && t.closest && (t.closest('.bad'))) err(t, '') }, true);
    form.addEventListener('change', function (e) { var t = e.target; if (t && t.classList && t.classList.contains('global-confirm-checkbox') && t.checked) err(t, '') }, true);
    function finish() { if (root.__done) return; root.__done = 1; try { sessionStorage.removeItem(DONE) } catch (e) {} mountDone(root, I) }
    return true }

  /* порядок внизу: поля → Telegram → галочка оферты → кнопка; подписи оферты; почта из автозаполнения не в своём поле */
  function tidy(form) { var tg = form.querySelector('.fl-tg'), cb = form.querySelector('.global-confirm-checkbox-block'), bt = form.querySelector('.form-buttons');
    var bd = form.querySelector('.xdget-form-field-birthday'); if (tg && bd && tg.previousElementSibling !== bd) form.insertBefore(tg, bd.nextSibling);
    if (cb && bt && cb.nextElementSibling !== bt) form.insertBefore(cb, bt);
    if (cb && !cb.__fl) { var tx = cb.querySelector('.checkbox-text'), a = tx && tx.querySelector('a'); if (tx) { var h = a ? a.getAttribute('href') : '/legal'; tx.innerHTML = 'Я' + NB + 'согласен с' + NB + 'условиями <a href="' + esc(h) + '" target="_blank" rel="noopener">оферты</a> и' + NB + '<a href="' + esc(h) + '" target="_blank" rel="noopener">политики конфиденциальности</a>'; cb.__fl = 1 } }
    var b = bt && bt.querySelector('.btn'); if (b && b.textContent.trim() !== 'Сохранить и начать обучение') b.textContent = 'Сохранить и начать обучение';
    form.querySelectorAll('input.form-control:not([name=email])').forEach(function (inp) { if (/@/.test(inp.value || '') && inp.name !== 'email') { inp.value = ''; inp.dispatchEvent(new Event('input', { bubbles: true })) } }) }

  var tries = 0;
  function run() { if (document.getElementById('fsfl')) return true; if (!document.body || !document.body.classList.contains('page-profile-my') && !/^\/pl\/my\b/.test(location.pathname)) return tries > 3;
    var form = document.querySelector('.xdget-myProfileSystemPage .xdget-userCompleteForm');
    var flag = false; try { flag = sessionStorage.getItem(DONE) === '1' } catch (e) {}
    if (flag && (!form || form.style.display === 'none' || !form.querySelector('input.form-control'))) { var page = document.querySelector('.xdget-myProfileSystemPage .layout-fixwidth'); if (!page) return false; if (!form && tries < 6) return false;
      css(); var I = info(), root = document.createElement('div'); root.id = 'fsfl'; page.insertBefore(root, page.firstChild); document.documentElement.classList.add('fsfl-on'); try { sessionStorage.removeItem(DONE) } catch (e) {} mountDone(root, I); return true }
    if (!form || !form.querySelector('input.form-control') || getComputedStyle(form).display === 'none') return false;
    if (flag) { /* сохранили не всё — GetCourse снова показал форму; экран «Готово», а не форма */ var page2 = document.querySelector('.xdget-myProfileSystemPage .layout-fixwidth'); css(); var I2 = info(), r2 = document.createElement('div'); r2.id = 'fsfl'; page2.insertBefore(r2, page2.firstChild); document.documentElement.classList.add('fsfl-on'); try { sessionStorage.removeItem(DONE) } catch (e) {} mountDone(r2, I2); return true }
    return mount(form) }
  function loop() { if (!run() && ++tries < 40) setTimeout(loop, 300) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loop); else loop();
})();
