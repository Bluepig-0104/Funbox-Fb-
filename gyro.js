(() => {
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let selectedCity = '全部';
  let lastData = { items: [] };

  function getData(){ return Array.isArray(window.FUNBOX_GYRO?.items) ? window.FUNBOX_GYRO.items : []; }
  function groupStores(items){
    const map = new Map();
    for(const item of items){
      const store = (item.store || '未命名門市').trim();
      const city = (item.city || '未分類').trim();
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
