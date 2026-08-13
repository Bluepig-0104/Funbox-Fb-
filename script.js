
const stores=window.FUNBOX_STORES||[];
let brand="全部",region="全部";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function render(){
 const q=$("#search").value.trim().toLowerCase();
 const list=stores.filter(s=>(brand==="全部"||s.brand===brand)&&(region==="全部"||s.region===region)&&(!q||(s.name+s.lineId).toLowerCase().includes(q)));
 $("#total").textContent=list.length;
 $("#grid").innerHTML=list.length?list.map(s=>`
 <article class="card">
   <div class="top"><span class="brand ${s.brand==="Funbox"?"fun":"lai"}">${s.brand}</span><span class="region">${s.region}</span></div>
   <h2>${s.name}</h2><div class="id">${s.lineId}</div>
   <div class="links">
    <a class="primary" target="_blank" rel="noopener" href="${s.lineUrl}">LINE</a>
    <a class="${s.facebookUrl?"":"disabled"}" target="_blank" rel="noopener" href="${s.facebookUrl||"#"}">Facebook</a>
   </div>
 </article>`).join(""):`<div class="empty">找不到符合條件的門市。</div>`;
}
$$("[data-brand]").forEach(b=>b.onclick=()=>{$$("[data-brand]").forEach(x=>x.classList.remove("active"));b.classList.add("active");brand=b.dataset.brand;render()});
$$("[data-region]").forEach(b=>b.onclick=()=>{$$("[data-region]").forEach(x=>x.classList.remove("active"));b.classList.add("active");region=b.dataset.region;render()});
$("#search").oninput=render;
$$(".tab").forEach(t=>t.onclick=()=>{ $$(".tab").forEach(x=>x.classList.remove("active"));t.classList.add("active"); const v=t.dataset.view; $("#storeView").classList.toggle("hidden",v!=="stores");$("#activityView").classList.toggle("hidden",v!=="activities");});
function loadActivities(){
 fetch("activities.json",{cache:"no-store"}).then(r=>r.json()).then(items=>{
   $("#newCount").textContent=items.filter(x=>x.status==="new").length;
   $("#activityBadge").textContent=items.length;
   $("#activities").innerHTML=items.length?items.map(x=>`<article class="activity"><b>${x.brand}｜${x.store}</b><div>${x.title||"疑似抽選活動"}</div><div class="meta">${x.publishedAt||""}　${x.source||""}</div>${x.url?`<p><a href="${x.url}" target="_blank" rel="noopener">查看原文 →</a></p>`:""}</article>`).join(""):`<div class="empty">目前沒有活動資料。監控器接上來源後會自動出現在這裡。</div>`;
 }).catch(()=>{});
}
render();loadActivities();
