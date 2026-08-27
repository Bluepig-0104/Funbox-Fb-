(() => {
  const SOURCE='https://uxux11.github.io/funbox-line/';
  const CACHE='funbox-gyro-source-cache-v6';
  const INTERVAL=10*60*1000;
  const PROXY=u=>`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`;
  const $=id=>document.getElementById(id);
  const clean=s=>String(s||'').replace(/\u00a0/g,' ').replace(/[\t\r\n]+/g,' ').replace(/\s{2,}/g,' ').trim();
  const isDraw=u=>/^(https?:\/\/)?(?:liff\.line\.me|lin\.ee)\//i.test(u||'');
  const urlOf=(href)=>{try{return new URL(href,SOURCE).href}catch{return ''}};
  const cityRe=/^(台北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|台南市|高雄市|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)$/;
  const CITY_NAMES=['台北市','新北市','桃園市','新竹市','新竹縣','苗栗縣','台中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','台南市','高雄市','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','金門縣','連江縣'];
  const norm=v=>String(v||'').toLowerCase().replace(/fun\s*box|funbox|來玩聚|玩聚|門市|店/g,'').replace(/[\s\-—_:：()（）\[\]【】]/g,'').trim();
  function resolveCity(store, rawCity=''){
    if(CITY_NAMES.includes(rawCity)) return rawCity;
    const direct=CITY_NAMES.find(c=>String(store||'').includes(c));
    if(direct) return direct;
    const target=norm(store), stores=Array.isArray(window.FUNBOX_STORES)?window.FUNBOX_STORES:[];
    if(!target) return rawCity||'未分類';
    const exact=stores.find(s=>norm(s.name)===target);
    if(exact?.city) return exact.city;
    const candidates=stores.map(s=>({city:s.city,name:norm(s.name)})).filter(s=>s.name&&(target.includes(s.name)||s.name.includes(target)));
    if(candidates.length===1) return candidates[0].city;
    if(candidates.length>1){candidates.sort((a,b)=>b.name.length-a.name.length);return candidates[0].city||rawCity||'未分類';}
    return rawCity||'未分類';
  }
  const storeRe=/^(?:Fun\s*box|Funbox|來玩聚)(?:[\s\-—_:：]*).{1,80}$/i;
  const dateRe=/(\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}(?:\s+\d{1,2}:\d{2})?(?:\s*[~～至\-]\s*\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}(?:\s+\d{1,2}:\d{2})?)?)/;

  function textOf(el){return clean(el?.textContent||'');}
  function candidates(doc){
    const all=[...doc.querySelectorAll('*')];
    return all.map((el,i)=>({el,i,text:textOf(el)})).filter(x=>x.text && x.text.length<=100 && storeRe.test(x.text));
  }
  function nearestStoreHeading(anchor, stores){
    let best=null;
    for(const s of stores){
      if(s.i < anchor._idx && (!best || s.i>best.i)) best=s;
    }
    return best;
  }
  function nearestCity(anchor, cities){
    let best=null; for(const c of cities){ if(c.i<anchor._idx && (!best||c.i>best.i)) best=c; }
    return best?.text || '未分類';
  }
  function productFromAnchor(a, storeText, date){
    const bad=/^(抽獎|抽選|抽選中|立即抽獎|點擊抽獎)$/i;
    // Most source rows place product text beside the 抽獎 link. Prefer the smallest ancestor containing one draw link.
    let el=a;
    for(let d=0;d<7&&el;d++,el=el.parentElement){
      const links=[...el.querySelectorAll('a[href]')].filter(x=>isDraw(urlOf(x.getAttribute('href'))));
      if(links.length===1){
        const raw=clean(el.textContent).replace(clean(a.textContent),' ');
        const parts=raw.split(/\s*\n\s*|\s{2,}/).map(clean).filter(x=>x&&!bad.test(x));
        if(parts.length) return parts.sort((a,b)=>b.length-a.length)[0];
        let t=raw.replace(/抽獎/g,'').trim(); if(t&&!bad.test(t)) return t;
      }
    }
    // Fallback: walk previous siblings looking for a short non-label text block.
    let node=a.previousElementSibling;
    for(let i=0;i<8&&node;i++,node=node.previousElementSibling){
      let t=clean(node.textContent);
      t=t.replace(dateRe,'').replace(/抽選開始時間\s*[:：]?/g,'').trim();
      if(t&&!bad.test(t)&&t!==storeText&&t.length<=180) return t;
    }
    return '陀螺抽選商品';
  }
  function parse(html){
    const doc=new DOMParser().parseFromString(html,'text/html');
    const all=[...doc.querySelectorAll('*')]; const idx=new Map(all.map((el,i)=>[el,i]));
    const stores=candidates(doc); const cities=all.map((el,i)=>({el,i,text:textOf(el)})).filter(x=>cityRe.test(x.text));
    const anchors=[...doc.querySelectorAll('a[href]')].map(a=>{a._idx=idx.get(a)||0;return a}).filter(a=>isDraw(urlOf(a.getAttribute('href'))));
    const items=[]; const seen=new Set();
    for(const a of anchors){
      const sh=nearestStoreHeading(a,stores); if(!sh) continue;
      const store=sh.text; const city=resolveCity(store,nearestCity(sh,cities));
      // Date: search the nearest previous text node/element after the city/store heading.
      let date='抽選中';
      for(let j=sh.i;j<a._idx;j++){
        const t=textOf(all[j]); const m=t.match(/抽選開始時間\s*[:：]?\s*([0-9]{4}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{1,2}(?:\s+[0-9]{1,2}:\d{2})?(?:\s*[~～至\-]\s*[0-9]{4}[\/\.\-][0-9]{1,2}[\/\.\-][0-9]{1,2}(?:\s+[0-9]{1,2}:\d{2})?)?)/);
        if(m){date=m[1];break;}
      }
      const url=urlOf(a.getAttribute('href')); const product=productFromAnchor(a,store,date);
      const key=`${store}|${product}|${url}`; if(seen.has(key)) continue; seen.add(key);
      items.push({city,store,product,date,url});
    }
    return items;
  }
  async function get(url,proxy=false){const r=await fetch(proxy?PROXY(url):url,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text();}
  function status(t,c=''){const e=$('gyroSyncStatus');if(e){e.textContent=t;e.className=`gyro-sync-status ${c}`.trim();}}
  function apply(data,live){window.setGyroData(data);localStorage.setItem(CACHE,JSON.stringify(data));const d=new Date(data.syncedAt||Date.now());$('gyroUpdated').textContent=`${live?'已同步':'快取資料'} · ${d.toLocaleString('zh-TW',{hour12:false})}`;status(live?'● 已自動同步':'○ 使用上次同步資料',live?'ok':'cached');}
  function cache(){try{const d=JSON.parse(localStorage.getItem(CACHE)||'null');if(d?.items?.length){apply(d,false);return true}}catch{}return false}
  async function sync(){status('↻ 正在同步抽選資料…','loading');try{let html;try{html=await get(SOURCE)}catch{html=await get(SOURCE,true)}const items=parse(html);if(!items.length)throw new Error('來源頁沒有解析到抽選資料');apply({source:SOURCE,syncedAt:Date.now(),items},true)}catch(e){if(!cache())status('⚠ 暫時無法同步抽選資料','error');console.warn('[gyro-sync]',e)}}
  document.addEventListener('DOMContentLoaded',()=>{cache();setTimeout(sync,300);setInterval(sync,INTERVAL);$('gyroSyncBtn')?.addEventListener('click',sync);});
})();
