(function(){
var BASE='https://romanoduvanov.github.io/otzyvy/gc/';
var DATA=BASE+'reyting-7993b0/data.json', PAGE=BASE+'reyting-7993b0/';
function el(h){var d=document.createElement('div');d.innerHTML=h;return d.firstElementChild}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fmt(n){return Number(n).toLocaleString('ru-RU')}
var css='.fsw{font-family:"Inter Tight",Inter,system-ui,sans-serif;color:#fff;margin:4px 0 28px;display:grid;gap:16px}'+
'.fsw-acc{display:flex;align-items:center;gap:12px;background:#161616;border-radius:18px;padding:14px 20px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);font-size:15px;color:rgba(255,255,255,.7)}'+
'.fsw-acc b{color:#fff;font-weight:600}.fsw-acc i{width:10px;height:10px;border-radius:50%;background:#c38bff;flex:none}'+
'.fsw-g{display:grid;grid-template-columns:1.5fr 1fr;gap:16px}'+
'.fsw-me{background:#161616;border-radius:28px;padding:24px;display:grid;grid-template-columns:150px 1fr;gap:22px;align-items:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}'+
'.fsw-aw{width:150px;aspect-ratio:1;background:center/cover;-webkit-mask:radial-gradient(closest-side,#000 62%,transparent);mask:radial-gradient(closest-side,#000 62%,transparent)}'+
'.fsw-l{font-size:13px;color:rgba(255,255,255,.55)}.fsw-r{font-size:32px;font-weight:500;letter-spacing:-.03em;line-height:1.1;margin:2px 0}'+
'.fsw-n{display:flex;gap:22px;margin:12px 0;flex-wrap:wrap}.fsw-n div{font-size:13px;color:rgba(255,255,255,.55)}.fsw-n b{display:block;font-size:26px;font-weight:500;color:#fff}.fsw-n small{font-size:15px;color:rgba(255,255,255,.55)}'+
'.fsw-bar{height:5px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden}.fsw-bar i{display:block;height:100%;background:linear-gradient(90deg,#9657e8,#d77fff)}'+
'.fsw-nx{font-size:13px;color:rgba(255,255,255,.55);margin-top:8px}.fsw-nx b{color:#d77fff;font-weight:500}'+
'.fsw-md{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.fsw-md span{font-size:12px;padding:6px 10px;border-radius:99px;background:rgba(195,139,255,.16);color:#d77fff}'+
'.fsw-x2{background:linear-gradient(115deg,#6724ad,#9657e8 60%,#c38bff);border-radius:28px;padding:24px;display:flex;flex-direction:column;justify-content:space-between;gap:14px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}'+
'.fsw-x2 .t{font-size:24px;font-weight:500;letter-spacing:-.02em}.fsw-x2 p{font-size:14px;line-height:1.45;color:rgba(255,255,255,.85);margin:6px 0 0}'+
'.fsw-tm{display:flex;gap:8px}.fsw-tm div{background:rgba(0,1,6,.35);border-radius:12px;padding:8px 12px;font-size:12px;color:rgba(255,255,255,.75)}.fsw-tm b{display:block;font-size:22px;font-weight:500;color:#fff}'+
'.fsw-btn{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(180deg,#fef8ff,#fccbff);color:#602364!important;font-weight:600;font-size:15px;border-radius:12px;padding:12px 18px;text-decoration:none!important;align-self:flex-start;margin-top:14px}'+
'.fsw-left{float:right;font-size:13px;padding:4px 10px;border-radius:99px;background:rgba(195,139,255,.16);color:#d77fff;font-weight:500}.fsw-left.done{background:#c38bff;color:#1a0b2e}'+
'@media(max-width:760px){.fsw-g{grid-template-columns:1fr}.fsw-me{grid-template-columns:1fr}.fsw-aw{width:110px}}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var host=document.getElementById('fs-dash');if(!host)return;
var old=document.querySelector('.xdget-html a[href*="reyting-7993b0"]');if(old)old.style.display='none';
var box=el('<div class="fsw"></div>');host.appendChild(box);
// 1) срок доступа: из «Мои покупки» ученика
fetch('/sales/control/userProduct/my',{credentials:'include'}).then(function(r){return r.text()}).then(function(h){
  var t=new DOMParser().parseFromString(h,'text/html').body.innerText.replace(/\s+/g,' ');
  var i=t.search(/с 0 до PRO 2\.0/);if(i<0)return;var seg=t.slice(i,i+400),txt='';
  var m=seg.match(/до\s+(\d{1,2}[.\s][\d.а-яА-Я\s]{2,14}\d{4})/);
  if(/не ограничен|бессрочн/i.test(seg))txt='Доступ к курсу: <b>бессрочный</b>';else if(m)txt='Доступ к курсу открыт до <b>'+esc(m[1])+'</b>';
  if(txt)box.insertBefore(el('<div class="fsw-acc"><i></i><span>'+txt+'</span></div>'),box.firstChild);
}).catch(function(){});
// 2) дашборд рейтинга
var uid=window.accountUserId;
function sha(s){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(function(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return('0'+x.toString(16)).slice(-2)}).join('').slice(0,16)})}
Promise.all([fetch(DATA,{cache:'no-store'}).then(function(r){return r.json()}),uid?sha('gc2:'+uid):Promise.resolve('')]).then(function(a){
  var D=a[0],h=a[1],r=null;for(var i=0;i<D.rows.length;i++)if(D.rows[i].h===h)r=D.rows[i];
  var g=el('<div class="fsw-g"></div>');
  if(r){var k=0;for(var j=0;j<D.ranks.length;j++)if(D.ranks[j][0]===r.rank)k=j;var nx=D.ranks[k+1],lo=D.ranks[k][1],hi=nx?nx[1]:lo,pc=nx?Math.min(100,Math.round(100*(r.pts-lo)/(hi-lo))):100;
    g.appendChild(el('<div class="fsw-me"><div class="fsw-aw" style="background-image:url('+BASE+'awards/'+D.ranks[k][2]+'.jpg)"></div><div><div class="fsw-l">Твоё звание · награда — '+esc(D.ranks[k][3])+'</div><div class="fsw-r">'+esc(r.rank)+'</div>'+
      '<div class="fsw-n"><div><b>'+fmt(r.pts)+'</b>баллов</div><div><b>'+r.place+'<small> из '+D.n+'</small></b>место</div><div><b>'+r.ontime+'%</b>в срок x2</div></div>'+
      '<div class="fsw-bar"><i style="width:'+pc+'%"></i></div><div class="fsw-nx">'+(nx?'До звания <b>'+esc(nx[0])+'</b> — ещё '+fmt(Math.max(0,hi-r.pts))+' баллов':'Ты на вершине лестницы')+'</div>'+
      (r.medals.length?'<div class="fsw-md">'+r.medals.map(function(m){return'<span>'+esc(m)+'</span>'}).join('')+'</div>':'')+
      '<a class="fsw-btn" href="'+PAGE+'" target="_blank" rel="noopener">Весь рейтинг потока →</a></div></div>'))}
  else g.appendChild(el('<div class="fsw-me"><div class="fsw-aw" style="background-image:url('+BASE+'awards/r6.jpg)"></div><div><div class="fsw-l">Карьерная лестница потока</div><div class="fsw-r">От Новичка до Дизайнера-миллионера</div><div class="fsw-nx">Баллы за уроки, анкеты и домашки, x2 за скорость. Твоё место появится после ближайшего обновления рейтинга.</div><a class="fsw-btn" href="'+PAGE+'" target="_blank" rel="noopener">Открыть рейтинг →</a></div></div>'));
  var X=D.x2;var x=el('<div class="fsw-x2"><div><div class="t">'+esc(X?X.title:'x2 за скорость')+'</div><p>'+esc(X?X.text:'Первые 48 часов после открытия модуля — x2 за уроки и анкеты, 72 часа — x2 за домашки.')+'</p></div><div class="fsw-tm"></div></div>');g.appendChild(x);
  if(X){var tm=x.querySelector('.fsw-tm');var tick=function(){var ms=new Date(X.until)-new Date();var hh=Math.max(0,Math.floor(ms/36e5)),mm=Math.max(0,Math.floor(ms%36e5/6e4));tm.innerHTML='<div><b>'+hh+'</b>час.</div><div><b>'+mm+'</b>мин.</div><div><b>×2</b>к баллам</div>'};tick();setInterval(tick,30000)}
  box.appendChild(g);
}).catch(function(){});
// 3) сколько уроков осталось в каждом модуле
function count(id,depth){return fetch('/teach/control/stream/view/id/'+id,{credentials:'include'}).then(function(r){return r.text()}).then(function(h){
  var d=new DOMParser().parseFromString(h,'text/html'),tot=0,done=0,ps=[];
  d.querySelectorAll('ul.lesson-list>li[data-lesson-id]').forEach(function(li){tot++;if(li.classList.contains('lesson-list_watched')||li.classList.contains('user-state-accomplished')||li.querySelector('.lesson-list__video-watched'))done++});
  if(depth<3)d.querySelectorAll('.stream-table tr.training-row').forEach(function(tr){ps.push(count(tr.getAttribute('data-training-id'),depth+1))});
  return Promise.all(ps).then(function(a){a.forEach(function(x){tot+=x[0];done+=x[1]});return[tot,done]})})}
document.querySelectorAll('.stream-table tr.training-row').forEach(function(tr){
  var a=tr.querySelector('td>a');if(!a)return;var b=a.querySelector('div b')||a.querySelector('div');
  count(tr.getAttribute('data-training-id'),0).then(function(c){if(!c[0]||!b)return;var left=c[0]-c[1];
    var s=el('<span class="fsw-left'+(left?'':' done')+'">'+(left?'осталось '+left+' из '+c[0]:'всё пройдено ✓')+'</span>');b.parentNode.insertBefore(s,b)}).catch(function(){})});
})();
