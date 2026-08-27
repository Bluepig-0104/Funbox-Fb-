(() => {
  const SOURCE_URL = 'https://uxux11.github.io/funbox-line/';
  const CACHE_KEY = 'funbox-gyro-cache-v2';
  let items = [];
  let city = '全部';

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function normalize(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function parseSource(doc) {
    const heading = [...doc.querySelectorAll('h1,h2,h3,h4')].find(el => /抽選已更新|最新抽選連結/.test(el.textContent || ''));
    if (!heading) return [];
    const root = heading.closest('section, main, body') || doc.body;
    const cityRe = /^(台北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|台中市|彰化縣|雲林縣|嘉義市|台南市|高雄市|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣)$/;
    const storeRe = /^(Fun ?box|Funbox|funbox|來玩聚)/i;
    const anchors = [...root.querySelectorAll('a[href]')].filter(a => /抽獎/.test(normalize(a.textContent)) && /lin\.ee|liff\.line\.me/.test(a.href));
    const elements = [];
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.nodeType === Node.TEXT_NODE) {
        const t = normalize(n.textContent);
        if (t) elements.push({type:'text', text:t, node:n});
      } else if (n.tagName === 'A' && /抽獎/.test(normalize(n.textContent)) && /lin\.ee|liff\.line\.me/.test(n.href)) {
        elements.push({type:'anchor', text:normalize(n.textContent), node:n});
      }
    }
    const idx = new Map(elements.map((x,i)=>[x.node,i]));
    const out=[];
    for (const a of anchors) {
      const ai=idx.get(a);
      if (ai == null) continue;
      let city='', store='', date='', product='';
      let productCount=0;
      for(let i=ai-1;i>=0 && ai-i<120;i--){
        const x=elements[i];
        if(x.type!=='text') continue;
        const t=x.text;
        if(!city && cityRe.test(t)) { city=t; continue; }
        if(!date && (/抽選日期|抽選時間|20\d{2}\/\d{1,2}\/\d{1,2}/.test(t))) { date=t; continue; }
        if(!store && storeRe.test(t) && t.length<60) { store=t; continue; }
        if(!product && t.length>2 && t.length<100 && !/下面為最新抽選連結|抽選已更新|抽選時間|抽選日期/.test(t)) {
          product=t.replace(/\s*抽獎\s*$/,'').trim();
          productCount++;
        }
        if(city && store && product) break;
      }
      if(city && store && product) out.push({city,store,product,date,url:a.href});
    }
    return dedupe(out);
  }

  function dedupe(arr) { const seen=new Set(); return arr.filter(x=>{const k=[x.store,x.product,x.url].join('|'); if(seen.has(k)) return false; seen.add(k); return true;}); }

  async function load() {
    $('gyroGrid').innerHTML='<div class="gyro-loading"><span>🌀</span> 正在同步最新抽選…</div>';
    try {
      const res = await fetch(SOURCE_URL + '?_gyro=' + Date.now(), {cache:'no-store'});
      if (!res.ok) throw new Error('HTTP '+res.status);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      items = parseSource(doc);
      if (!items.length) throw new Error('找不到抽選資料');
      localStorage.setItem(CACHE_KEY, JSON.stringify({at:Date.now(),items}));
      render();
    } catch (e) {
      try { const cache=JSON.parse(localStorage.getItem(CACHE_KEY)||'null'); items=cache?.items||[]; } catch {}
      if (items.length) render(true); else $('gyroGrid').innerHTML='<div class="empty">目前無法同步抽選資料。請稍後再試。</div>';
    }
  }

  function render(fromCache=false) {
    const q=normalize($('gyroSearch').value).toLowerCase();
    const cities=['全部',...new Set(items.map(x=>x.city).filter(Boolean))];
    $('gyroCityTabs').innerHTML=cities.map(c=>`<button class="city-tab ${c===city?'active':''}" data-city="${esc(c)}">${esc(c)}<span class="num">${c==='全部'?items.length:items.filter(x=>x.city===c).length}</span></button>`).join('');
    $('gyroCityTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{city=b.dataset.city;render(fromCache)});
    const list=items.filter(x=>(city==='全部'||x.city===city)&&(!q||`${x.city} ${x.store} ${x.product}`.toLowerCase().includes(q)));
    $('gyroCount').textContent=list.length;
    $('gyroUpdated').textContent=fromCache?'使用上次同步資料':'已同步最新資料';
    $('gyroGrid').innerHTML=list.length?list.map(x=>`<article class="gyro-item"><div class="gyro-item-top"><span class="gyro-city">${esc(x.city)}</span><span class="gyro-date">${esc(x.date||'抽選中')}</span></div><h3>${esc(x.store)}</h3><div class="gyro-products"><div class="gyro-product"><div><strong>${esc(x.product)}</strong></div><a class="gyro-draw" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">抽獎 <b>↗</b></a></div></div></article>`).join(''):'<div class="empty">找不到符合條件的抽選商品。</div>';
  }

  $('gyroSearch').addEventListener('input',()=>render(false));
  $('gyroRefresh').addEventListener('click',load);
  load();
})();
