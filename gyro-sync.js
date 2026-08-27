/*
 * 陀螺抽選自動同步
 * 來源： https://uxux11.github.io/funbox-line/
 * 優先直接抓取；若來源網站沒有允許跨網域，改用 CORS proxy。
 * 同步成功後會寫入 localStorage，因此來源暫時失效時網站仍可顯示上次資料。
 */
(() => {
  const SOURCE = 'https://uxux11.github.io/funbox-line/';
  const CACHE_KEY = 'funbox-gyro-cache-v2';
  const SYNC_KEY = 'funbox-gyro-last-sync';
  const INTERVAL = 10 * 60 * 1000;
  const PROXY = url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const cities = ['台北市','新北市','桃園市','新竹市','新竹縣','苗栗縣','台中市','彰化縣','南投縣','雲林縣','嘉義市','嘉義縣','台南市','高雄市','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','金門縣','連江縣'];

  const $ = id => document.getElementById(id);
  const setStatus = (text, cls='') => {
    const el = $('gyroSyncStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `sync-status ${cls}`.trim();
  };

  function normalizeUrl(href) {
    try { return new URL(href, SOURCE).href; } catch { return ''; }
  }
  function isDrawUrl(url) {
    return /(^https?:\/\/)?(liff\.line\.me|lin\.ee)\//i.test(url);
  }
  function clean(s) {
    return String(s || '').replace(/\s+/g,' ').replace(/[|•·]+/g,' ').trim();
  }
  function findCity(text) {
    const hit = cities.find(c => text.includes(c));
    if (hit) return hit;
    const short = ['台北','新北','桃園','新竹','苗栗','台中','彰化','南投','雲林','嘉義','台南','高雄','屏東','宜蘭','花蓮','台東'];
    const s = short.find(c => text.includes(c));
    return s ? s + (s==='台北'?'市':s==='新北'?'市':s==='桃園'?'市':s==='新竹'?'市':s==='台中'?'市':s==='嘉義'?'市':s==='台南'?'市':s==='高雄'?'市':'縣') : '';
  }
  function findDate(text) {
    const m = text.match(/(?:抽選|抽籤|日期|期間)?\s*(\d{1,4}[\/.\-]\d{1,2}(?:[\/.\-]\d{1,2})?(?:\s*[~～至]\s*\d{1,4}[\/.\-]\d{1,2}(?:[\/.\-]\d{1,2})?)?)/);
    if (m) return m[1];
    const m2 = text.match(/(\d{1,2}\/\d{1,2}(?:\s*[-~～]\s*\d{1,2}\/\d{1,2})?)/);
    return m2 ? m2[1] : '抽選中';
  }
  function nearestContext(a) {
    let el = a;
    let best = '';
    for (let i=0;i<7 && el;i++,el=el.parentElement) {
      const t = clean(el.textContent);
      if (t && t.length > best.length && t.length < 700) best = t;
      if (el.matches && el.matches('article,li,section,[class*="card"],[class*="item"],[class*="store"]')) {
        if (t.length < 1200) return t;
      }
    }
    return best;
  }
  function extractProduct(context, anchorText) {
    let t = clean(context.replace(anchorText,''));
    t = t.replace(/抽獎\s*[↗→]?/gi,'').replace(/加入好友|LINE|lin\.ee|liff\.line\.me/gi,'');
    t = t.replace(/(?:抽選|抽籤)?\s*\d{1,4}[\/.\-]\d{1,2}(?:[\/.\-]\d{1,2})?(?:\s*[~～至-]\s*\d{1,4}[\/.\-]\d{1,2}(?:[\/.\-]\d{1,2})?)?/g,'');
    const parts = t.split(/(?=[\u4e00-\u9fffA-Za-z0-9])/).map(clean).filter(Boolean);
    const bad = /^(台北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|台南市|高雄市|屏東縣|宜蘭縣|花蓮縣|台東縣|抽選|抽籤|門市|店|商品)$/;
    const candidates = parts.filter(x => !bad.test(x) && x.length >= 2);
    return candidates.slice(-2).join(' ') || '陀螺抽選商品';
  }
  function extractStore(context, city) {
    const lines = context.split(/\s{2,}|(?=台北市|新北市|桃園市|新竹市|新竹縣|苗栗縣|台中市|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|台南市|高雄市|屏東縣|宜蘭縣|花蓮縣|台東縣)/).map(clean).filter(Boolean);
    const cityIdx = city ? lines.findIndex(x => x.includes(city)) : -1;
    const pool = lines.filter(x => !/抽獎|加入好友|抽選日期|抽選期間/.test(x));
    if (cityIdx >= 0 && lines[cityIdx+1]) return lines[cityIdx+1].slice(0,80);
    return pool.find(x => /店|SOGO|Lalaport|遠百|巨城|三井|百貨|購物中心|站/.test(x))?.slice(0,80) || pool[0]?.slice(0,80) || 'Funbox 門市';
  }
  function parse(html) {
    const doc = new DOMParser().parseFromString(html,'text/html');
    const anchors = [...doc.querySelectorAll('a[href]')].filter(a => isDrawUrl(normalizeUrl(a.getAttribute('href'))));
    const items = [];
    const seen = new Set();
    for (const a of anchors) {
      const url = normalizeUrl(a.getAttribute('href'));
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const ctx = nearestContext(a);
      const city = findCity(ctx) || '未分類';
      const product = extractProduct(ctx, clean(a.textContent));
      const store = extractStore(ctx, city);
      items.push({city,store,product,date:findDate(ctx),url});
    }
    // 若頁面有重複按鈕，依網址去重；並清掉明顯不是抽選入口的 LINE 連結。
    return items.filter(x => x.url && (x.product !== '陀螺抽選商品' || x.store !== 'Funbox 門市'));
  }

  async function fetchHtml(url) {
    const r = await fetch(url, {cache:'no-store', mode:'cors'});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  }
  async function fetchWithFallback() {
    try { return await fetchHtml(SOURCE); }
    catch (e) { return await fetchHtml(PROXY(SOURCE)); }
  }

  function apply(data, source='cache') {
    if (!data || !Array.isArray(data.items) || !data.items.length) return false;
    window.FUNBOX_GYRO = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(SYNC_KEY, String(Date.now()));
    if (typeof window.renderGyro === 'function') window.renderGyro();
    const when = new Date(data.syncedAt || Date.now());
    setStatus(`${source === 'live' ? '● 已自動同步' : '○ 使用上次資料'} · ${when.toLocaleString('zh-TW',{hour12:false})}`, source === 'live' ? 'ok' : 'cached');
    return true;
  }

  function loadCache() {
    try { const data = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return apply(data,'cache'); }
    catch { return false; }
  }

  async function sync() {
    setStatus('↻ 正在同步抽選資料…','loading');
    try {
      const html = await fetchWithFallback();
      const items = parse(html);
      if (!items.length) throw new Error('找不到抽選商品連結');
      const data = {updated:new Date().toISOString().slice(0,10), syncedAt:Date.now(), source:SOURCE, items};
      apply(data,'live');
    } catch (e) {
      if (!loadCache()) setStatus('⚠ 無法同步，請稍後再試','error');
      else setStatus(`○ 自動同步失敗，保留上次資料 · ${e.message}`,'cached');
      console.warn('[gyro-sync]', e);
    }
  }

  window.FUNBOX_GYRO_SYNC = {sync, source:SOURCE};
  document.addEventListener('DOMContentLoaded', () => {
    loadCache();
    setTimeout(sync, 250);
    setInterval(sync, INTERVAL);
    const btn = $('gyroSyncBtn');
    if (btn) btn.addEventListener('click', sync);
  });
})();
