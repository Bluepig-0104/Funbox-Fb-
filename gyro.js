(() => {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let selectedCity = '全部';
  let lastData = { items: [] };

  const CITY_NAMES=['台北市','新北市','桃園市','新竹市','新竹縣','苗栗縣','台中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','台南市','高雄市','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','金門縣','連江縣'];
  const norm=v=>String(v||'').toLowerCase().replace(/fun\s*box|funbox|來玩聚|玩聚|門市|店/g,'').replace(/[\s\-—_:：()（）\[\]【】]/g,'').trim();
  function resolveCity(item){
    const raw=String(item?.city||'').trim();
    if(CITY_NAMES.includes(raw)) return raw;
    const text=`${item?.store||''} ${item?.product||''}`;
    const direct=CITY_NAMES.find(c=>text.includes(c));
    if(direct) return direct;
    const target=norm(item?.store);
    const stores=Array.isArray(window.FUNBOX_STORES)?window.FUNBOX_STORES:[];
    if(!target) return raw||'未分類';
    const exact=stores.find(s=>norm(s.name)===target);
    if(exact?.city) return exact.city;
    const candidates=stores.map(s=>({city:s.city,name:norm(s.name)})).filter(s=>s.name&&(target.includes(s.name)||s.name.includes(target)));
    if(candidates.length===1) return candidates[0].city;
    if(candidates.length>1){
      candidates.sort((a,b)=>b.name.length-a.name.length);
      const top=candidates[0];
      const tied=candidates.filter(x=>x.name.length===top.name.length&&x.city!==top.city);
      if(!tied.length) return top.city;
    }
    return raw||'未分類';
  }

  function getData(){ return Array.isArray(window.FUNBOX_GYRO?.items) ? window.FUNBOX_GYRO.items : []; }
  function groupStores(items){
    const map = new Map();
    for(const item of items){
      const store = (item.store || '未命名門市').trim();
      const city = resolveCity(item);
      const key = `${city}|||${store}`;
      if(!map.has(key)) map.set(key,{city,store,products:[]});
      const g=map.get(key);
      const pKey=`${item.product||''}|||${item.url||''}`;
      if(!g.products.some(p=>`${p.product}|||${p.url}`===pKey)) g.products.push({product:item.product||'陀螺抽選商品',date:item.date||'抽選中',url:item.url||''});
    }
    return [...map.values()];
  }
  function render(){
    const stores=groupStores(getData());
    const q=($('gyroSearch')?.value||'').trim().toLowerCase();
    const cities=['全部',...new Set(stores.map(s=>s.city).filter(Boolean))];
    if(!cities.includes(selectedCity)) selectedCity='全部';
    $('gyroCityTabs').innerHTML=cities.map(c=>`<button class="gyro-city-tab ${c===selectedCity?'active':''}" data-city="${esc(c)}">${esc(c)} <b>${stores.filter(s=>c==='全部'||s.city===c).length}</b></button>`).join('');
    $('gyroCityTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{selectedCity=b.dataset.city;render();});

    const list=stores.filter(s=>{
      const cityOK=selectedCity==='全部'||s.city===selectedCity;
      const text=`${s.city} ${s.store} ${s.products.map(p=>p.product).join(' ')}`.toLowerCase();
      return cityOK && (!q||text.includes(q));
    });
    $('gyroStoreCount').textContent=list.length;

    const byCity=new Map();
    for(const s of list){
      if(!byCity.has(s.city)) byCity.set(s.city,[]);
      byCity.get(s.city).push(s);
    }

    const card=s=>`<article class="gyro-store-card">
      <header><div><h3>${esc(s.store)}</h3></div><strong>${s.products.length} 項抽選</strong></header>
      <div class="gyro-products">${s.products.map(p=>`<div class="gyro-product-row"><div><b>${esc(p.product)}</b><small>${esc(p.date)}</small></div>${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">抽獎 <em>↗</em></a>`:`<span class="gyro-no-link">無連結</span>`}</div>`).join('')}</div>
    </article>`;

    $('gyroGrid').innerHTML=list.length
      ? [...byCity.entries()].map(([city,cityStores])=>`<section class="gyro-city-group"><div class="gyro-city-group-head"><h3>${esc(city)}</h3><span>${cityStores.length} 間門市</span></div><div class="gyro-store-grid">${cityStores.map(card).join('')}</div></section>`).join('')
      : '<div class="gyro-empty">目前沒有符合條件的抽選門市。</div>';
  }
  window.renderGyro=render;
  window.setGyroData=data=>{ lastData=data||{items:[]}; window.FUNBOX_GYRO=lastData; render(); };
  document.addEventListener('DOMContentLoaded',()=>{ $('gyroSearch').addEventListener('input',render); render(); });
})();
