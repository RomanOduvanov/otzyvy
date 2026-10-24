/* Фиолетовый стиль: «Актуальные события» — модули потока по дате открытия, уроки раскрываются.
   Работает только на /teach/control/schedule; уроки берутся из тренинга самого ученика, поэтому
   видны только доступные ему модули. */
(function () {
  try { sessionStorage.removeItem('fsNoticeOff') } catch (e) {}
  /* уведомления GetCourse: помечаем тип (письмо / остальное) для иконки — на всех страницах */
  var nt = 0, ni = setInterval(function () { [].forEach.call(document.querySelectorAll('.notice-top-panel:not([data-fs-kind])'), function (el) {
    el.setAttribute('data-fs-kind', /почт|e-?mail/i.test(el.textContent) ? 'email' : 'info'); }); if (++nt > 40) clearInterval(ni) }, 500);
  document.addEventListener('click', function (e) { var c = e.target.closest && e.target.closest('.notice-top-panel .close-link'); if (!c) return;
    var p = c.closest('.notice-top-panel'), t = p.textContent.replace(/\s+/g, ' ').trim();
    [].forEach.call(document.querySelectorAll('.notice-top-panel'), function (el) { if (el.textContent.replace(/\s+/g, ' ').trim() === t) el.style.setProperty('display', 'none', 'important') }) }, true);
  /* иконка вкладки OduvanovSchool */
  (function () { var B = 'https://romanoduvanov.github.io/otzyvy/gc/brand/'; var put = function () { var h = document.head; if (!h) return;
    [].forEach.call(h.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]'), function (l) { l.remove() });
    [['icon', 'image/svg+xml', 'favicon.svg', ''], ['icon', 'image/png', 'favicon-32.png', '32x32'], ['apple-touch-icon', 'image/png', 'apple-touch-icon.png', '180x180']].forEach(function (a) {
      var l = document.createElement('link'); l.rel = a[0]; l.type = a[1]; l.href = B + a[2] + '?v=3'; if (a[3]) l.sizes = a[3]; h.appendChild(l) }) };
    put(); document.addEventListener('DOMContentLoaded', put) })();
  /* статус ученика в рейтинге: подсветка аватарки в сайдбаре и профиль на странице /pl/<id> */
  (function () {
    var RT = 'https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/';
    function sha(u) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode('gc2:' + u)).then(function (b) { return [].map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2) }).join('').slice(0, 16) }) }
    function rows() { try { var c = JSON.parse(sessionStorage.getItem('fsRt') || 'null'); if (c && Date.now() - c.ts < 9e5) return Promise.resolve(c.r) } catch (e) {}
      return fetch(RT + 'data.json', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (D) { var r = D.rows.map(function (x) { return [x.h, x.place, x.pts, x.week] });
        try { sessionStorage.setItem('fsRt', JSON.stringify({ ts: Date.now(), r: r })) } catch (e) {} return r }) }
    function status(R, h) { var me = R.filter(function (x) { return x[0] === h })[0]; if (!me) return '';
      if (me[1] <= 3 && me[2] > 0) return 't' + me[1];
      var hot = R.filter(function (x) { return !(x[1] <= 3 && x[2] > 0) && x[3] >= 200 }).sort(function (a, b) { return b[3] - a[3] }).slice(0, 7);
      return hot.some(function (x) { return x[0] === h }) ? 'hot' : '' }
    var uid = window.accountUserId, pm = location.pathname.match(/^\/pl\/(\d+)\/?$/);
    if (!uid && !pm) return;
    var SC = {}; try { SC = JSON.parse(localStorage.getItem('fsSt') || '{}') } catch (e) {}
    var setC = function (pre, s) { var H = document.documentElement; ['t1', 't2', 't3', 'hot'].forEach(function (x) { H.classList.toggle(pre + x, x === s) }) };
    if (uid && SC[uid]) setC('fs-st-', SC[uid]); if (pm && SC[pm[1]]) setC('fs-pst-', SC[pm[1]]);
    rows().then(function (R) {
      if (uid) sha(uid).then(function (h) { var s = status(R, h); setC('fs-st-', s); SC[uid] = s; try { localStorage.setItem('fsSt', JSON.stringify(SC)) } catch (e) {} });
      if (pm) sha(pm[1]).then(function (h) { var s = status(R, h); setC('fs-pst-', s); SC[pm[1]] = s; try { localStorage.setItem('fsSt', JSON.stringify(SC)) } catch (e) {} });
    }).catch(function () {});
    /* левая карточка профиля: строки «Откуда / Регистрация» и единый блок кнопок */
    if (pm) { var tidy = function () { var c = document.querySelector('.xdget-userProfileSystemPage .col-md-3'); if (!c) return false; if (c.classList.contains('fs-tidy')) return true;
        var inf = c.querySelector('.xdget-profileInfo'); if (inf) { var rowsH = inf.innerHTML.split(/<br\s*\/?>/i).map(function (x) { var t = x.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); if (!t) return ''; var m = t.match(/^([^:]{1,30}):\s*(.+)$/);
          return m ? '<div class="fs-ir"><span>' + m[1] + '</span><b>' + m[2] + '</b></div>' : '<div class="fs-ir"><b>' + t + '</b></div>' }).join(''); inf.innerHTML = rowsH }
        var acts = document.createElement('div'); acts.className = 'fs-acts'; var lk = c.querySelector('.xdget-profileLike'); if (lk) acts.appendChild(lk); c.appendChild(acts);
        c.classList.add('fs-tidy'); return true };
      if (!tidy()) document.addEventListener('DOMContentLoaded', tidy) }
    /* «Мой профиль» в меню ведёт на оформленный профиль /pl/<id>; настройки — кнопкой оттуда */
    if (uid) document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a[href*="/user/my/profile"]'); if (!a || e.metaKey || e.ctrlKey) return;
      e.preventDefault(); e.stopPropagation(); var inMenu = a.closest('.main-menu');
      if (pm && String(uid) === pm[1] && !inMenu && window.fsOpenSettings) { window.fsOpenSettings(); return }
      location.href = '/pl/' + uid + (inMenu ? '' : '#settings') }, true);
    if (pm && String(uid) === pm[1]) { var addBtn = function () { var c = document.querySelector('.xdget-userProfileSystemPage .col-md-3'); if (!c || c.querySelector('.fs-set')) return !!c;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'fs-set'; b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg><span>Настройки</span>'; b.onclick = function () { window.fsOpenSettings() }; (c.querySelector('.fs-acts') || c).appendChild(b); return true };
      if (!addBtn()) document.addEventListener('DOMContentLoaded', addBtn);

      /* ===== настройки профиля в нашем стиле (вместо стандартной страницы «Мой профиль») ===== */
      window.fsOpenSettings = function () { var ov = document.getElementById('fsd');
        if (!ov) { ov = document.createElement('div'); ov.id = 'fsd'; ov.className = 'fsd'; ov.innerHTML = '<div class="fsd-p" role="dialog" aria-modal="true" aria-label="Настройки профиля"><div class="fsd-h"><b>Настройки профиля</b><button type="button" class="fsd-x" aria-label="Закрыть">×</button></div><div class="fsd-b"><div class="fsd-load"><i></i><i></i><i></i><i></i></div></div><div class="fsd-f"><span class="fsd-s"></span><button type="button" class="fsd-save" disabled>Сохранить</button></div></div>';
          document.body.appendChild(ov); ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.fsd-x')) close() });
          document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('on')) close() }) }
        function close() { ov.classList.remove('on'); document.documentElement.style.overflow = ''; if (location.hash === '#settings') history.replaceState(null, '', location.pathname) }
        requestAnimationFrame(function () { ov.classList.add('on') }); document.documentElement.style.overflow = 'hidden'; load(ov) };
      function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
      function getForm() { return fetch('/user/my/profile', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.text() }).then(function (t) {
        var d = new DOMParser().parseFromString(t, 'text/html'); var f = [].filter.call(d.forms, function (x) { return x.querySelector('[name="User[first_name]"]') })[0]; return { d: d, f: f, t: t } }) }
      function load(ov) { var body = ov.querySelector('.fsd-b'), save = ov.querySelector('.fsd-save'), st = ov.querySelector('.fsd-s');
        getForm().then(function (g) { if (!g.f) throw 0; var f = g.f, v = function (n) { var e = f.querySelector('[name="' + n + '"]:not([type=hidden])') || f.querySelector('[name="' + n + '"]'); return e ? e.value : '' };
          var em = (g.t.match(/<strong>E-mail<\/strong>:\s*([^<\s]+)/) || [])[1] || '', ok = /title="Эл\. адрес подтвержден"/.test(g.t), hasPw = /Сменить пароль/.test(g.t);
          var cb = f.querySelector('input[type=checkbox][name^="mailingCategories"]'), sub = v('User[subscribe_status]'), tr = v('UserMessenger[main_transport_id]');
          var bd = v('User[birthday]'), bdIso = /^(\d{2})\.(\d{2})\.(\d{4})$/.test(bd) ? bd.replace(/^(\d{2})\.(\d{2})\.(\d{4})$/, '$3-$2-$1') : '';
          var g2 = v('User[gender]'), lang = v('User[language]');
          var fld = function (k, label, val, type, ph) { return '<label class="fsd-fl"><span>' + label + '</span><input data-k="' + k + '" type="' + (type || 'text') + '" value="' + esc(val) + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '></label>' };
          var seg = function (k, val, opts) { return '<div class="fsd-seg" data-k="' + k + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '"' + (o[0] === val ? ' class="on"' : '') + '>' + o[1] + '</button>' }).join('') + '</div>' };
          body.innerHTML =
            '<section><h4>Аватар</h4><div class="fsd-ava"><div class="fsd-av" style="background-image:url(' + esc((document.querySelector('.xdget-profileAvatar img') || {}).src || '') + ')"></div><div><b>Фото профиля</b><span>Его видят в сайдбаре, чатах и рейтинге потока</span><button type="button" class="fsd-btn2 fsd-avbtn">Загрузить новое фото</button></div></div></section>' +
            '<section><h4>Основное</h4><div class="fsd-g2">' + fld('User[first_name]', 'Имя', v('User[first_name]')) + fld('User[last_name]', 'Фамилия', v('User[last_name]')) +
              '<label class="fsd-fl"><span>День рождения</span><input data-k="bd" type="date" value="' + bdIso + '" max="' + new Date().toISOString().slice(0, 10) + '"></label>' + fld('User[phone]', 'Телефон', v('User[phone]'), 'tel', '+7 900 000-00-00') +
              fld('User[country]', 'Страна', v('User[country]')) + fld('User[city]', 'Город', v('User[city]')) + '</div>' +
              '<div class="fsd-fl"><span>Пол</span>' + seg('User[gender]', g2, [['', 'Не указан'], ['male', 'Мужской'], ['female', 'Женский']]) + '</div>' +
              '<label class="fsd-fl"><span>О себе</span><textarea data-k="user_content" rows="3" placeholder="Пара слов о тебе: чем занимаешься, к чему идёшь">' + esc(v('user_content')) + '</textarea></label></section>' +
            '<section><h4>Почта и вход</h4><div class="fsd-mail"><div><b>' + esc(em) + '</b><span class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓ Почта подтверждена' : 'Почта не подтверждена — без этого можно пропустить важные письма') + '</span></div>' + (ok ? '' : '<button type="button" class="fsd-btn2 fsd-conf">Отправить письмо</button>') + '</div>' +
              '<details class="fsd-pw"><summary>' + (hasPw ? 'Сменить пароль' : 'Установить пароль') + '</summary><div class="fsd-g2">' + (hasPw ? '<label class="fsd-fl"><span>Текущий пароль</span><input data-k="ChangePasswordForm[primaryPassword]" type="password" autocomplete="current-password"></label>' : '') +
              '<label class="fsd-fl"><span>Новый пароль</span><input data-k="ChangePasswordForm[password]" type="password" autocomplete="new-password"></label><label class="fsd-fl"><span>Повтори пароль</span><input data-k="ChangePasswordForm[confirmPassword]" type="password" autocomplete="new-password"></label></div></details></section>' +
            '<section><h4>Уведомления</h4><div class="fsd-fl"><span>Какие письма получать</span>' + seg('User[subscribe_status]', sub, [['all', 'Все сообщения'], ['no_mailings', 'Только уведомления'], ['disabled', 'Ничего']]) + '</div>' +
              (cb ? '<label class="fsd-ck"><input type="checkbox" data-k="mc"' + (cb.checked ? ' checked' : '') + '><i></i><span>Общие рассылки школы — анонсы, эфиры, полезное</span></label>' : '') +
              '<div class="fsd-fl"><span>Куда присылать сообщения</span>' + seg('UserMessenger[main_transport_id]', tr || '0', [['0', 'Автоматически'], ['3', 'Telegram']]) + '</div>' +
              '<div class="fsd-fl"><span>Язык интерфейса</span>' + seg('User[language]', lang, [['', 'По умолчанию'], ['ru', 'Русский'], ['en', 'English']]) + '</div>' +
              '<a class="fsd-lnk" href="/pl/notifications/settings/my">Тонкая настройка уведомлений <i>→</i></a></section>';
          body.querySelectorAll('.fsd-seg').forEach(function (s) { s.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; s.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b) }); dirty() }) });
          body.addEventListener('input', dirty); body.addEventListener('change', dirty);
          var av = body.querySelector('.fsd-avbtn'); if (av) av.onclick = function () { var i = document.querySelector('.fs-ava-in'); if (i) i.click() };
          var cf = body.querySelector('.fsd-conf'); if (cf) cf.onclick = function () { cf.disabled = true; cf.textContent = 'Отправляем…';
            fetch('/user/my/sendConfirmEmail', { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'user_id=' + uid })
              .then(function (r) { return r.json().catch(function () { return {} }) }).then(function (r) { cf.textContent = 'Письмо отправлено ✓'; say((r && r.text) || 'Письмо отправлено — проверь почту и папку «Спам»') })
              .catch(function () { cf.disabled = false; cf.textContent = 'Отправить письмо'; say('Не получилось отправить письмо, попробуй ещё раз', 1) }) };
          function dirty() { save.disabled = false; st.textContent = ''; st.className = 'fsd-s' }
          function say(t, bad) { st.textContent = t; st.className = 'fsd-s on' + (bad ? ' bad' : '') }
          save.onclick = function () { save.disabled = true; save.textContent = 'Сохраняем…';
            var np = body.querySelector('[data-k="ChangePasswordForm[password]"]'), np2 = body.querySelector('[data-k="ChangePasswordForm[confirmPassword]"]');
            if (np && np.value && np.value !== np2.value) { save.disabled = false; save.textContent = 'Сохранить'; say('Пароли не совпадают', 1); return }
            getForm().then(function (g) { var fd = new FormData(g.f);
              ['ChangePasswordForm[primaryPassword]', 'ChangePasswordForm[password]', 'ChangePasswordForm[confirmPassword]'].forEach(function (k) { fd.delete(k) });
              body.querySelectorAll('input[data-k^="User"],input[data-k^="Change"],textarea[data-k]').forEach(function (e) { if (/^ChangePassword/.test(e.dataset.k) && !(np && np.value)) return; fd.set(e.dataset.k, e.value) });
              var bdv = body.querySelector('[data-k="bd"]').value; fd.set('User[birthday]', bdv ? bdv.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1') : '');
              body.querySelectorAll('.fsd-seg').forEach(function (s) { var b = s.querySelector('button.on'); if (b) fd.set(s.dataset.k, b.dataset.v) });
              var mc = body.querySelector('[data-k="mc"]'); if (mc) { fd.delete('mailingCategories[0]'); fd.append('mailingCategories[0]', '0'); if (mc.checked) fd.append('mailingCategories[0]', '1') }
              fd.delete('User[profile_image]'); fd.append('User[profile_image]', ''); fd.append('save', 'Сохранить');
              return fetch('/user/my/profile', { method: 'POST', body: fd, credentials: 'same-origin' }) }).then(function (r) { return r.text() }).then(function (t) {
                var d = new DOMParser().parseFromString(t, 'text/html'), errs = [].map.call(d.querySelectorAll('.errorSummary li,.errorMessage,.help-block-error,.alert-danger'), function (e) { return e.textContent.trim() }).filter(Boolean);
                save.textContent = 'Сохранить';
                if (errs.length) { save.disabled = false; say(errs.filter(function (x, i, a) { return a.indexOf(x) === i }).slice(0, 2).join(' · '), 1); return }
                say('Сохранено ✓'); body.querySelectorAll('input[type=password]').forEach(function (e) { e.value = '' });
                var nm = (body.querySelector('[data-k="User[first_name]"]').value + ' ' + body.querySelector('[data-k="User[last_name]"]').value).trim(), h = document.querySelector('.xdget-profileTitle'); if (nm && h) h.textContent = nm;
                try { sessionStorage.removeItem('fsRt') } catch (e) {} }).catch(function () { save.disabled = false; save.textContent = 'Сохранить'; say('Не получилось сохранить, попробуй ещё раз', 1) }) };
        }).catch(function () { body.innerHTML = '<p class="fsd-err">Не удалось загрузить настройки. Обнови страницу и попробуй ещё раз.</p>' }) }
      if (location.hash === '#settings') { var tryOpen = function () { if (document.body) window.fsOpenSettings(); else setTimeout(tryOpen, 50) }; setTimeout(tryOpen, 400) }
      /* смена аватарки прямо на странице: квадратная обрезка 600×600 и отправка формы «Мой профиль» */
      var addAva = function () { var box = document.querySelector('.xdget-profileAvatar'); if (!box || box.querySelector('.fs-ava-up')) return !!box;
        var lab = document.createElement('label'); lab.className = 'fs-ava-up'; lab.title = 'Загрузить фото';
        lab.innerHTML = '<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" class="fs-ava-in"><span class="fs-ava-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span><span class="fs-ava-t">Загрузить фото</span><span class="fs-ava-h">или перетащи сюда · JPG, PNG до 15 МБ</span>';
        box.appendChild(lab);
        box.classList.add('fs-ava-box'); if (box.querySelector('img.user-default-profile-image')) box.classList.add('fs-ava-empty');
        var msg = document.createElement('div'); msg.className = 'fs-ava-msg'; box.parentNode.insertBefore(msg, box.nextSibling);
        var say = function (t, bad) { msg.textContent = t; msg.className = 'fs-ava-msg on' + (bad ? ' bad' : ''); clearTimeout(say.t); say.t = setTimeout(function () { msg.className = 'fs-ava-msg' }, 4000) };
        ['dragenter', 'dragover'].forEach(function (ev) { box.addEventListener(ev, function (e) { e.preventDefault(); box.classList.add('drag') }) });
        ['dragleave', 'drop'].forEach(function (ev) { box.addEventListener(ev, function (e) { e.preventDefault(); box.classList.remove('drag') }) });
        box.addEventListener('drop', function (e) { var fl = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (fl) go(fl) });
        lab.querySelector('input').addEventListener('change', function () { var fl = this.files && this.files[0]; this.value = ''; if (fl) go(fl) });
        function go(file) {
          if (!/^image\//.test(file.type)) { say('Это не картинка — выбери JPG, PNG или WEBP', 1); return }
          if (file.size > 15 * 1024 * 1024) { say('Файл больше 15 МБ — выбери фото поменьше', 1); return }
          var o0 = box.querySelector('img'), prev = o0 && o0.getAttribute('src'), wasEmpty = box.classList.contains('fs-ava-empty');
          box.classList.add('busy'); lab.querySelector('.fs-ava-t').textContent = 'Загружаем…';
          var fail = function (m) { box.classList.remove('busy'); if (o0 && prev) o0.src = prev; if (wasEmpty) box.classList.add('fs-ava-empty'); lab.querySelector('.fs-ava-t').textContent = 'Загрузить фото';
            say(m || 'Не получилось загрузить фото. Попробуй ещё раз или загрузи в «Настройках профиля»', 1) };
          var img = new Image(), url = URL.createObjectURL(file);
          img.onload = function () { var s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 600;
            c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 600, 600); URL.revokeObjectURL(url);
            if (o0) { o0.src = c.toDataURL('image/jpeg', .85); box.classList.remove('fs-ava-empty') }
            c.toBlob(function (blob) { if (!blob) return fail();
              fetch('/user/my/profile', { credentials: 'same-origin' }).then(function (r) { return r.text() }).then(function (t) {
                var f = [].filter.call(new DOMParser().parseFromString(t, 'text/html').forms, function (x) { return x.querySelector('[name="User[first_name]"]') })[0]; if (!f) throw 0;
                var fd = new FormData(f); fd.delete('User[profile_image]'); fd.append('User[profile_image]', ''); fd.append('User[profile_image]', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
                ['ChangePasswordForm[primaryPassword]', 'ChangePasswordForm[password]', 'ChangePasswordForm[confirmPassword]'].forEach(function (k) { fd.delete(k) });
                var sb = f.querySelector('[type=submit][name]'); if (sb && !fd.has(sb.name)) fd.append(sb.name, sb.value || '1');
                return fetch(f.getAttribute('action') || '/user/my/profile', { method: 'POST', body: fd, credentials: 'same-origin' }) })
              .then(function (r) { if (!r.ok) throw 0; return fetch(location.pathname, { credentials: 'same-origin', cache: 'no-store' }) }).then(function (r) { return r.text() })
              .then(function (t) { var n = new DOMParser().parseFromString(t, 'text/html').querySelector('.xdget-profileAvatar img'), o = box.querySelector('img');
                if (!n || /default_profile/.test(n.getAttribute('src'))) return fail();
                if (o) { o.src = n.getAttribute('src') + (n.getAttribute('src').indexOf('?') < 0 ? '?' : '&') + 'v=' + Date.now(); o.classList.remove('user-default-profile-image') }
                box.classList.remove('busy'); box.classList.add('done'); setTimeout(function () { box.classList.remove('done') }, 1600); lab.querySelector('.fs-ava-t').textContent = 'Сменить фото'; say('Фото обновлено — его увидят в сайдбаре, чатах и рейтинге');
                try { sessionStorage.removeItem('fsRt') } catch (e) {} })
              .catch(function () { fail() }) }, 'image/jpeg', .9) };
          img.onerror = function () { fail('Не удалось открыть картинку — попробуй JPG или PNG') }; img.src = url }
        if (!box.classList.contains('fs-ava-empty')) lab.querySelector('.fs-ava-t').textContent = 'Сменить фото'; return true };
      if (!addAva()) document.addEventListener('DOMContentLoaded', addAva) }
    if (pm) { var ins = function () { if (document.querySelector('iframe.fs-prof')) return true; var col = document.querySelector('.xdget-userProfileSystemPage .col-md-9') || document.querySelector('.xdget-userProfileSystemPage .xdget-row'); if (!col) return false;
        var f = document.createElement('iframe'); f.className = 'fs-prof'; f.title = 'Профиль на курсе'; f.src = RT + 'profile.html#u=' + pm[1] + (String(uid) === pm[1] ? '&me=1' : '');
        f.style.cssText = 'width:100%;height:0;border:0;display:block;background:transparent'; col.classList.remove('empty');
        var sk = document.createElement('div'); sk.className = 'fs-prof-sk'; sk.innerHTML = '<div class="sk-hd"><i class="sk-av"></i><div><i class="sk-l w40"></i><i class="sk-l w60 big"></i><i class="sk-l w50"></i></div></div><div class="sk-st"><i></i><i></i><i></i><i></i><i></i></div><i class="sk-l w100 bar"></i><div class="sk-gr"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="sk-gr three"><i></i><i></i><i></i></div>';
        col.appendChild(sk); col.appendChild(f); setTimeout(function () { if (sk.parentNode && !f.classList.contains('on')) sk.remove() }, 12000); return true };
      if (!ins()) document.addEventListener('DOMContentLoaded', ins);
      window.addEventListener('message', function (e) { if (e.origin !== 'https://romanoduvanov.github.io' || !e.data || e.data.fsProfH === undefined) return;
        [].forEach.call(document.querySelectorAll('iframe.fs-prof'), function (f) { f.style.setProperty('height', Math.ceil(e.data.fsProfH) + 'px', 'important');
          var sk = f.parentNode && f.parentNode.querySelector('.fs-prof-sk'); if (sk) sk.remove(); if (e.data.fsProfH > 0) f.classList.add('on') }) }) }
  })();
  /* высота виджета «Актуальные события + кейсы» в списке тренингов */
  window.addEventListener('message', function (e) { if (e.origin !== 'https://romanoduvanov.github.io' || !e.data || !e.data.fsSchedH) return;
    [].forEach.call(document.querySelectorAll('iframe.fs-sched'), function (f) { f.style.setProperty('height', Math.ceil(e.data.fsSchedH) + 'px', 'important') }) });
  if (!/^\/(pl\/)?teach\/control\/schedule/.test(location.pathname)) return;
  var ROOT = 935917158, SKIP = {935952152: 1};
  var MON = {'янв':0,'фев':1,'мар':2,'апр':3,'мая':4,'май':4,'июн':5,'июл':6,'авг':7,'сен':8,'окт':9,'ноя':10,'дек':11};
  var MS = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'], WD = ['вс','пн','вт','ср','чт','пт','сб'];
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function pd(s){var m=/(\d{1,2})\s+([А-Яа-я]{3})\S*\s+(\d{1,2}):(\d{2})/.exec(s||'');if(!m)return null;var now=new Date();
    var d=new Date(now.getFullYear(),MON[m[2].toLowerCase()],+m[1],+m[3],+m[4]);if(d-now>200*864e5)d.setFullYear(d.getFullYear()-1);if(now-d>200*864e5)d.setFullYear(d.getFullYear()+1);return d}
  function get(u){return fetch(u,{credentials:'same-origin'}).then(function(r){return r.ok?r.text():''}).then(function(t){return new DOMParser().parseFromString(t,'text/html')})}
  function walk(id,name,parts){return get('/teach/control/stream/view/id/'+id).then(function(d){
    var ls=[].slice.call(d.querySelectorAll('ul.lesson-list>li[data-lesson-id]')).map(function(li){var t=li.querySelector('.title');
      return {id:li.getAttribute('data-lesson-id'),t:((t&&t.childNodes[0]&&t.childNodes[0].textContent)||'').replace(/\s+/g,' ').trim(),d:pd((li.querySelector('.lesson-date')||{}).textContent)}});
    if(ls.length)parts.push({name:name,lessons:ls});
    var rows=[].slice.call(d.querySelectorAll('.stream-table tr.training-row'));
    return rows.reduce(function(p,tr){return p.then(function(){var st=tr.querySelector('.stream-title');return walk(tr.getAttribute('data-training-id'),(name?name+' · ':'')+(st?st.textContent.trim():''),parts)})},Promise.resolve())})}
  function when(d){return d.getDate()+' '+MS[d.getMonth()]}
  function hm(d){return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
  function tag(at){var now=new Date(),h=(now-at)/36e5;
    if(h>=0&&h<48)return '<span class="fs-sch-t x2">x2 ещё '+Math.max(1,Math.ceil(48-h))+' ч</span>';
    if(h>=48)return '<span class="fs-sch-t open">Открыт</span>';
    var days=Math.ceil(-h/24);return '<span class="fs-sch-t soon">'+(days<=1?'Завтра':'Через '+days+' '+(days%10==1&&days%100!=11?'день':days%10>=2&&days%10<=4&&(days%100<10||days%100>=20)?'дня':'дней'))+'</span>'}
  function render(box,mods){var now=new Date();
    mods=mods.filter(function(m){return m.at}).sort(function(a,b){return a.at-b.at});
    var openIdx=mods.findIndex(function(m){var h=(now-m.at)/36e5;return h<48});
    box.innerHTML='<div class="fs-sch-note">Уроки модуля открываются в указанное время. В первые 48 часов после открытия — x2 к баллам в рейтинге.</div>'+mods.map(function(m,i){var h=(now-m.at)/36e5;
      var n=m.parts.reduce(function(s,p){return s+p.lessons.length},0);
      var cls='fs-sch-m'+(h>=0&&h<48?' now':h>=48?' past':'')+(i===openIdx||(openIdx<0&&i===mods.length-1)?' open':'');
      return '<div class="'+cls+'"><div class="fs-sch-h" role="button" tabindex="0"><div class="fs-sch-d"><b>'+when(m.at)+'</b><span>'+WD[m.at.getDay()]+', '+hm(m.at)+'</span></div>'+
        '<div class="fs-sch-n"><b>'+esc(m.name)+'</b><span>'+n+' '+(n%10==1&&n%100!=11?'урок':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'урока':'уроков')+'</span></div>'+tag(m.at)+
        '<div class="fs-sch-c"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></div></div>'+
        '<div class="fs-sch-b">'+m.parts.map(function(p){var pa=p.lessons.map(function(l){return l.d}).filter(Boolean).sort(function(a,b){return a-b})[0];
          return '<div class="fs-sch-p">'+(p.name||pa?'<div><span>'+esc(p.name||'Уроки')+'</span>'+(pa?'<span>'+when(pa)+', '+hm(pa)+'</span>':'')+'</div>':'')+
            '<ol>'+p.lessons.map(function(l){return '<li><a href="/pl/teach/control/lesson/view?id='+l.id+'">'+esc(l.t)+'</a></li>'}).join('')+'</ol></div>'}).join('')+'</div></div>'}).join('');
    [].forEach.call(box.querySelectorAll('.fs-sch-h'),function(h){function t(){h.parentNode.classList.toggle('open')}h.addEventListener('click',t);h.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();t()}})})}
  function start(){var c=document.querySelector('.standard-page-content');if(!c||c.querySelector('.fs-sch'))return;
    var tbl=c.querySelector('table');if(tbl)tbl.style.display='none';
    var box=document.createElement('div');box.className='fs-sch';box.innerHTML='<div class="fs-sch-load"></div><div class="fs-sch-load"></div><div class="fs-sch-load"></div>';
    (tbl?tbl.parentNode.insertBefore(box,tbl):c.appendChild(box));
    var KEY='fsSch1';try{var c0=JSON.parse(sessionStorage.getItem(KEY)||'null');if(c0&&Date.now()-c0.ts<6e5){render(box,c0.m.map(function(m){m.at=new Date(m.at);m.parts.forEach(function(p){p.lessons.forEach(function(l){l.d=l.d?new Date(l.d):null})});return m}));return}}catch(e){}
    get('/teach/control/stream/view/id/'+ROOT).then(function(d){
      var mods=[].slice.call(d.querySelectorAll('.stream-table tr.training-row')).filter(function(tr){return !SKIP[tr.getAttribute('data-training-id')]}).map(function(tr){var st=tr.querySelector('.stream-title');return {id:tr.getAttribute('data-training-id'),name:st?st.textContent.replace(/\s+/g,' ').trim():'',parts:[]}});
      return Promise.all(mods.map(function(m){return walk(m.id,'',m.parts)})).then(function(){
        mods.forEach(function(m){var ds=[];m.parts.forEach(function(p){p.lessons.forEach(function(l){if(l.d)ds.push(l.d)})});m.at=ds.length?new Date(Math.min.apply(null,ds)):null});
        try{sessionStorage.setItem(KEY,JSON.stringify({ts:Date.now(),m:mods}))}catch(e){}
        render(box,mods)})}).catch(function(){box.remove();if(tbl)tbl.style.display=''})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
