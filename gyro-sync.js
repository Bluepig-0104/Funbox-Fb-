/*
 * 陀螺抽選自動同步
 * 來源： https://uxux11.github.io/funbox-line/
 * 優先直接抓取；若來源網站沒有允許跨網域，改用 CORS proxy。
 * 同步成功後會寫入 localStorage，因此來源暫時失效時網站仍可顯示上次資料。
 */
(() => {
  const SOURCE = 'https://uxux11.github.io/funbox-line/';
  const CACHE_KEY = 'funbox-gyro-cache-v3';
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
    return String(s || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function cityFromStore(store) {
    if (!store) return '未分類';
    if (store.city) return store.city;
    return '未分類';
  }

  // 你的主網站 data.js 已經有完整的 77 間門市資料。
  // 這裡用它來辨識「來源頁上的門市」，而不是從整段 HTML 猜門市名稱。
  function getKnownStores() {
    const rows = Array.isArray(window.FUNBOX_STORES) ? window.FUNBOX_STORES : [];
    return rows.map(x => ({
      name: clean(x.name),
      city: x.city || '未分類',
      aliases: [
        clean(x.name),
        clean(x.name).replace(/^Funbox\s*/i, ''),
        clean(x.name).replace(/^Funbox\s*/i, '').replace(/\s+/g, '')
      ].filter(Boolean)
    }));
  }

  function textHasStore(text, store) {
    const t = clean(text).replace(/\s+/g, '');
    return store.aliases.some(a => t.includes(a.replace(/\s+/g, '')));
  }

  function findStoreForAnchor(anchor, knownStores) {
    // 只在「含有這個抽選按鈕」的最小容器中找門市，避免把整個 body 當成一間店。
    let el = anchor;
    let best = null;
    for (let depth = 0; depth < 9 && el; depth++, el = el.parentElement) {
      const text = clean(el.textContent);
      if (!text || text.length > 2500) continue;
      const drawCount = [...el.querySelectorAll('a[href]')]
        .filter(a => isDrawUrl(normalizeUrl(a.getAttribute('href')))).length;
      if (!drawCount) continue;
      const match = knownStores.find(s => textHasStore(text, s));
      if (match) {
        best = { store: match, container: el };
        // 已經找到只包含少量抽選按鈕的區塊，優先使用它。
        if (drawCount <= 8) break;
      }
    }
    return best;
  }

  function findRow(anchor, storeContainer) {
    let el = anchor;
    for (let depth = 0; depth < 8 && el && el !== storeContainer; depth++, el = el.parentElement) {
      const links = [...el.querySelectorAll('a[href]')]
        .filter(a => isDrawUrl(normalizeUrl(a.getAttribute('href'))));
      if (links.length === 1 && clean(el.textContent).length <= 700) return el;
    }
    return anchor.parentElement || anchor;
  }

  function findDate(text) {
    const t = clean(text);
    const patterns = [
      /(?:抽選開始時間|抽選開始|抽選期間|抽選日期|日期|期間)\s*[:：]?\s*(\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}(?:\s+\d{1,2}:\d{2})?(?:\s*[~～至\-]\s*\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}(?:\s+\d{1,2}:\d{2})?)?)/,
      /(\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}(?:\s+\d{1,2}:\d{2})?(?:\s*[~～至\-]\s*\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}(?:\s+\d{1,2}:\d{2})?)?)/,
      /(\d{1,2}[\/\.\-]\d{1,2}(?:\s+\d{1,2}:\d{2})?(?:\s*[~～至\-]\s*\d{1,2}[\/\.\-]\d{1,2})?)/
    ];
    for (const re of patterns) {
      const m = t.match(re);
      if (m) return m[1];
    }
    return '抽選中';
  }

  function cleanProductText(text, store, city) {
    let t = clean(text);
    if (!t) return '';
    for (const alias of store?.aliases || []) {
      if (alias) t = t.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
    }
    if (city) t = t.replace(new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
    t = t
      .replace(/抽獎\s*[↗→]?/gi, ' ')
      .replace(/抽選開始時間|抽選開始|抽選期間|抽選日期|抽選中|抽選/g, ' ')
      .replace(/(?:\d{4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,2}|\d{1,2}[\/\.\-]\d{1,2})(?:\s+\d{1,2}:\d{2})?/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/加入好友|官方帳號|LINE/gi, ' ')
      .replace(/[|•·]+/g, ' ');
    return clean(t);
  }

  function extractProduct(anchor, row, store) {
    const candidates = [];

    // 優先讀語意明確的標題/文字元素。
    row.querySelectorAll('h1,h2,h3,h4,h5,strong,b,p,[class*="title"],[class*="name"],[class*="product"]').forEach(el => {
      if (el === anchor || el.contains(anchor)) return;
      const t = cleanProductText(el.textContent, store, cityFromStore(store));
      if (t.length >= 2 && t.length <= 160) candidates.push(t);
    });

    // 再讀 row 內的直接文字節點，避免把整張門市卡片內容塞進商品名稱。
    const walker = row.ownerDocument.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    const texts = [];
    let node;
    while ((node = walker.nextNode())) {
      if (anchor.contains(node)) continue;
      const t = cleanProductText(node.nodeValue, store, cityFromStore(store));
      if (t.length >= 2 && t.length <= 160) texts.push(t);
    }
    candidates.push(...texts);

    const bad = /^(抽選中|抽選|抽獎|開始時間|日期|期間|門市|商品|Funbox)$/i;
    const unique = [...new Set(candidates.map(clean).filter(x => !bad.test(x)))];
    // 排除明顯的單字/版面殘片，例如截圖中出現的 X-。
    const meaningful = unique.filter(x => !/^[A-Za-z]{1,2}[-_]?$/i.test(x));
    return meaningful.sort((a,b) => b.length - a.length)[0] || '陀螺抽選商品';
  }

  function parse(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const knownStores = getKnownStores();
    const anchors = [...doc.querySelectorAll('a[href]')]
      .filter(a => isDrawUrl(normalizeUrl(a.getAttribute('href'))));

    const items = [];
    const seen = new Set();

    for (const a of anchors) {
      const url = normalizeUrl(a.getAttribute('href'));
      if (!url) continue;

      const found = findStoreForAnchor(a, knownStores);
      if (!found) continue; // 無法確認門市就不要亂歸到「Funbox 門市」

      const { store, container } = found;
      const row = findRow(a, container);
      const product = extractProduct(a, row, store);
      const date = findDate(clean(row.textContent));
      const key = `${store.city}|${store.name}|${product}|${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        city: cityFromStore(store),
        store: store.name,
        product,
        date,
        url
      });
    }

    return items;
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
