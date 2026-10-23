(function(){
var host=document.getElementById('fs-side');if(!host)return;
var css='.fsl{font-family:"Inter Tight",Inter,system-ui,sans-serif;color:#fff;display:grid;gap:16px}'+
'.fsl-c{background:#161616;border-radius:24px;padding:22px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}'+
'.fsl-c h4{margin:0 0 4px!important;font-size:22px!important;font-weight:500!important;letter-spacing:-.02em;color:#fff!important}'+
'.fsl-s{font-size:13px;color:rgba(255,255,255,.5);margin-bottom:10px}'+
'.fsl-i{display:flex;gap:14px;align-items:baseline;padding:12px 0;border-top:1px solid rgba(255,255,255,.06)}'+
'.fsl-i b{flex:none;width:92px;color:#d77fff;font-weight:600;font-size:14px}.fsl-i span{font-size:15px;line-height:1.35}'+
'.fsl-i.now b{color:#1a0b2e;background:#c38bff;border-radius:99px;padding:2px 8px;width:auto;font-size:12px}';
var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
var M=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
fetch('https://romanoduvanov.github.io/otzyvy/gc/reyting-7993b0/data.json',{cache:'no-store'}).then(function(r){return r.json()}).then(function(D){
  var now=new Date(),items=[];(D.schedule||[]).forEach(function(s){var t=new Date(s.at);if(t>now-48*36e5)items.push({t:t,n:s.name})});
  items=items.slice(0,4);if(!items.length)return;
  var h='<div class="fsl-c"><h4>Ближайшие открытия</h4><div class="fsl-s">Поток AI-креатор 2.0 · первые 48 часов — x2 к баллам</div>'+
    items.map(function(i){var live=i.t<=now;var d=live?'идёт x2':i.t.getDate()+' '+M[i.t.getMonth()]+', '+('0'+i.t.getHours()).slice(-2)+':'+('0'+i.t.getMinutes()).slice(-2);
      return'<div class="fsl-i'+(live?' now':'')+'"><b>'+d+'</b><span>'+i.n.replace(/[<>&]/g,'')+'</span></div>'}).join('')+'</div>';
  var w=document.createElement('div');w.innerHTML=h;host.insertBefore(w.firstElementChild,host.firstChild);
}).catch(function(){});
})();
