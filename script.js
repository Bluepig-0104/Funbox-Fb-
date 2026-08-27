const stores = window.FUNBOX_STORES || [];
const STORAGE_KEY = "funbox-line-done-v1";
let currentBrand = "全部";
let currentCity = "全部";
let view = "all";
let done = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
const $ = s => document.querySelector(s);

const brands = ["全部", "Funbox", "來玩聚"];
const brandCount = brand => brand === "全部" ? stores.length : stores.filter(x => x.brand === brand).length;
const brandStores = () => currentBrand === "全部" ? stores : stores.filter(x => x.brand === currentBrand);
const cities = () => {
  const set = new Set(brandStores().map(x => x.city).filter(Boolean));
  return ["全部", ...[...set].sort((a,b) => a.localeCompare(b, "zh-Hant"))];
};

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify([...done])); }

function initBrandTabs(){
  $("#brandTabs").innerHTML = brands.map(b =>
    `<button class="brand-tab ${b===currentBrand?"active":""}" data-brand="${b}">${b}<span class="num">${brandCount(b)}</span></button>`
  ).join("");
  document.querySelectorAll("#brandTabs button").forEach(b => b.onclick = () => {
    currentBrand = b.dataset.brand;
    currentCity = "全部";
    initBrandTabs(); initCityTabs(); render();
  });
}

function initCityTabs(){
  const list = cities();
  if (!list.includes(currentCity)) currentCity = "全部";
  $("#cityTabs").innerHTML = list.map(c => {
    const n = c === "全部" ? brandStores().length : brandStores().filter(x => x.city === c).length;
    return `<button class="city-tab ${c===currentCity?"active":""}" data-city="${c}">${c}<span class="num">${n}</span></button>`;
  }).join("");
  document.querySelectorAll("#cityTabs button").forEach(b => b.onclick = () => {
    currentCity = b.dataset.city; initCityTabs(); render();
  });
}

function initViews(){
  document.querySelectorAll("#viewTabs .view").forEach(b => {
    b.classList.toggle("active", b.dataset.view === view);
    b.onclick = () => { view = b.dataset.view; initViews(); render(); };
  });
}

function getList(){
  const q = $("#search").value.trim().toLowerCase();
  return stores.filter(s => {
    const brandOK = currentBrand === "全部" || s.brand === currentBrand;
    const cityOK = currentCity === "全部" || s.city === currentCity;
    const searchOK = !q || (s.name+" "+s.lineId+" "+s.city+" "+s.brand).toLowerCase().includes(q);
    const isDone = done.has(s.lineId);
    const viewOK = view === "all" || (view === "done" && isDone) || (view === "todo" && !isDone);
    return brandOK && cityOK && searchOK && viewOK;
  });
}

function render(){
  const list = getList();
  const completed = done.size;
  $("#doneCount").textContent = completed;
  $("#heroTotal").textContent = stores.length;
  $("#progressBar").style.width = `${Math.min(100, completed/stores.length*100)}%`;
  $("#resultText").textContent = `目前顯示 ${list.length} 間`;
  $("#grid").innerHTML = list.length ? list.map((s,i) => {
    const isDone = done.has(s.lineId);
    return `<article class="card ${isDone?"done":""}">
      ${isDone?'<span class="done-badge">✓ 已加入</span>':""}
      <div class="region">${esc(s.brand)} / ${esc(s.city)} / STORE ${String(i+1).padStart(2,"0")}</div>
      <h3>${esc(s.name)}</h3><div class="lineid">${esc(s.lineId)}</div>
      <a href="https://line.me/R/ti/p/${encodeURIComponent(s.lineId)}" target="_blank" rel="noopener" data-line="${esc(s.lineId)}">
        ${isDone?"✓ 已加入 LINE":"＋ 加入 LINE"} <b>${isDone?"✓":"↗"}</b>
      </a>
    </article>`;
  }).join("") : `<div class="empty">${view==="done"?"目前還沒有已加入的門市。":"找不到符合條件的門市。"}</div>`;
  document.querySelectorAll(".card a[data-line]").forEach(a => a.addEventListener("click", () => {
    done.add(a.dataset.line); save(); setTimeout(render,120);
  }));
}
function esc(v){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

$("#search").addEventListener("input", render);
$("#clearDone").addEventListener("click", () => {
  if(!done.size)return;
  if(confirm(`確定要清除 ${done.size} 間已加入的紀錄嗎？`)){done.clear();save();render();}
});

$("#heroTotal").textContent = stores.length;
initBrandTabs(); initCityTabs(); initViews(); render();


const gyroData = [
 {brand:"Funbox",store:"測試店家（範例）",city:"台北市",product:"BEYBLADE X 陀螺",date:"8/28 - 8/29",status:"🟢 抽選中",line:"",fb:""}
];
function renderGyro(){
 const el=document.querySelector("#gyroGrid");
 if(!el)return;
 el.innerHTML=gyroData.map(g=>`<article class="card">
 <div class="region">${g.brand} / ${g.city}</div>
 <h3>🌀 ${g.store}</h3>
 <div class="lineid">${g.product}</div>
 <p>日期：${g.date}</p><p>狀態：${g.status}</p>
 <a href="${g.line||'#'}" target="_blank">LINE VOOM ↗</a>
 <a href="${g.fb||'#'}" target="_blank">Facebook ↗</a>
 </article>`).join("");
}
renderGyro();
