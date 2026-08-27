(() => {
  let city = '全部';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const getItems = () => Array.isArray(window.FUNBOX_GYRO?.items) ? window.FUNBOX_GYRO.items : [];

  // 將抽選資料「以門市為單位」分組：同一間店的所有抽選商品都放在同一張卡片。
  function groupStores(items) {
    const map = new Map();
    for (const x of items) {
      const key = `${x.city || '未分類'}|||${x.store || 'Funbox 門市'}`;
      if (!map.has(key)) map.set(key, { city: x.city || '未分類', store: x.store || 'Funbox 門市', products: [] });
      const group = map.get(key);
      const productKey = `${x.product || '陀螺抽選商品'}|||${x.url || ''}`;
      if (!group.products.some(p => `${p.product || ''}|||${p.url || ''}` === productKey)) {
        group.products.push({ product: x.product || '陀螺抽選商品', date: x.date || '抽選中', url: x.url || '' });
      }
    }
    return [...map.values()];
  }

  function render() {
    const items = getItems();
    const stores = groupStores(items);
    const q = ($('gyroSearch').value || '').trim().toLowerCase();
    const cities = ['全部', ...new Set(stores.map(x => x.city).filter(Boolean))];
    if (!cities.includes(city)) city = '全部';

    const cityStores = c => c === '全部' ? stores.length : stores.filter(x => x.city === c).length;
    $('gyroCityTabs').innerHTML = cities.map(c => `<button class="city-tab ${c===city?'active':''}" data-city="${esc(c)}">${esc(c)}<span class="num">${cityStores(c)}</span></button>`).join('');
    $('gyroCityTabs').querySelectorAll('button').forEach(b => b.onclick = () => { city = b.dataset.city; render(); });

    const list = stores.filter(x => {
      const cityOK = city === '全部' || x.city === city;
      const text = `${x.city} ${x.store} ${x.products.map(p => p.product).join(' ')}`.toLowerCase();
      return cityOK && (!q || text.includes(q));
    });

    $('gyroCount').textContent = list.length;
    $('gyroCountLabel').textContent = '間門市';
    $('gyroUpdated').textContent = `來源 ${window.FUNBOX_GYRO?.updated || '—'}`;
    $('navGyroCount').textContent = stores.length;
    $('heroSub').textContent = `陀螺抽選 ${stores.length} 間門市`;

    $('gyroGrid').innerHTML = list.length ? list.map(x => `
      <article class="gyro-store">
        <div class="gyro-store-head">
          <div>
            <span class="gyro-city">${esc(x.city)}</span>
            <h3>${esc(x.store)}</h3>
          </div>
          <span class="gyro-product-count">${x.products.length} 項抽選</span>
        </div>
        <div class="gyro-products">
          ${x.products.map(p => {
            const link = p.url
              ? `<a class="gyro-draw" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">抽獎 <b>↗</b></a>`
              : `<span class="gyro-draw disabled">待補連結</span>`;
            return `<div class="gyro-product"><div class="gyro-product-info"><strong>${esc(p.product)}</strong><span>${esc(p.date)}</span></div>${link}</div>`;
          }).join('')}
        </div>
      </article>
    `).join('') : '<div class="empty">目前沒有符合條件的抽選門市。</div>';
  }

  window.renderGyro = render;
  document.addEventListener('DOMContentLoaded', () => {
    $('gyroSearch').addEventListener('input', render);
    render();
  });
})();
