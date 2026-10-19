const DATA_PATH = "data/penjualan_umkm.csv";
let allRows = [];
let trendChart = null;
let categoryChart = null;
const palette = ["#4e7fbd", "#9bb9e8", "#8c80d8", "#5db5c2", "#e6b36f", "#6aa98f"];

const money = value => new Intl.NumberFormat("id-ID", {style:"currency", currency:"IDR", maximumFractionDigits:0}).format(value || 0);
const number = value => new Intl.NumberFormat("id-ID", {maximumFractionDigits:0}).format(value || 0);
const percent = value => `${(value || 0).toLocaleString("id-ID",{maximumFractionDigits:1})}%`;
const sum = (rows, key) => rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
const average = (rows, key) => rows.length ? sum(rows,key)/rows.length : 0;
const monthNames = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function parseRows(rows) {
  return rows.filter(r => r.tanggal && r.produk).map(r => ({
    ...r,
    tanggal: new Date(`${r.tanggal}T00:00:00`),
    jumlah: Number(r.jumlah), harga_satuan: Number(r.harga_satuan),
    modal_satuan: Number(r.modal_satuan), diskon: Number(r.diskon),
    biaya_operasional: Number(r.biaya_operasional), pendapatan: Number(r.pendapatan),
    keuntungan: Number(r.keuntungan)
  })).filter(r => !Number.isNaN(r.tanggal.getTime()));
}

function initFilters(rows) {
  const fill = (id, values, label) => {
    const el = document.getElementById(id);
    [...new Set(values)].sort().forEach(v => {
      const option = document.createElement("option");
      option.value = v; option.textContent = v; el.appendChild(option);
    });
  };
  fill("periodFilter", allRows.map(r => r.tanggal.getFullYear()), "Tahun");
  fill("categoryFilter", allRows.map(r => r.kategori), "Kategori");
  fill("channelFilter", allRows.map(r => r.channel), "Saluran");
  ["periodFilter","categoryFilter","channelFilter"].forEach(id => document.getElementById(id).addEventListener("change", renderDashboard));
  document.getElementById("resetFilters").addEventListener("click", () => {
    ["periodFilter","categoryFilter","channelFilter"].forEach(id => document.getElementById(id).value = "all");
    renderDashboard();
    showToast("Filter berhasil diatur ulang");
  });
}

function filteredRows() {
  const year = document.getElementById("periodFilter").value;
  const category = document.getElementById("categoryFilter").value;
  const channel = document.getElementById("channelFilter").value;
  return allRows.filter(r =>
    (year === "all" || String(r.tanggal.getFullYear()) === year) &&
    (category === "all" || r.kategori === category) &&
    (channel === "all" || r.channel === channel)
  );
}

function renderDashboard() {
  const rows = filteredRows();
  document.getElementById("recordCount").textContent = `${number(rows.length)} transaksi`;
  const revenue = sum(rows,"pendapatan"), profit = sum(rows,"keuntungan");
  const gross = rows.reduce((a,r) => a + r.jumlah*r.harga_satuan, 0);
  const discounts = sum(rows,"diskon");
  document.getElementById("revenueMetric").textContent = money(revenue);
  document.getElementById("profitMetric").textContent = money(profit);
  document.getElementById("unitsMetric").textContent = number(sum(rows,"jumlah"));
  document.getElementById("discountMetric").textContent = percent(gross ? discounts/gross*100 : 0);
  document.getElementById("profitMargin").textContent = percent(revenue ? profit/revenue*100 : 0);
  renderTrend(rows);
  renderCategories(rows);
  renderRanking(rows);
  renderInsights(rows);
}

function renderTrend(rows) {
  const grouped = Array.from({length:12},(_,i)=>({month:i,revenue:0,profit:0}));
  rows.forEach(r=>{const m=r.tanggal.getMonth();grouped[m].revenue+=r.pendapatan;grouped[m].profit+=r.keuntungan;});
  const ctx = document.getElementById("trendChart");
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx,{type:"line",data:{labels:grouped.map(x=>monthNames[x.month]),datasets:[
    {label:"Pendapatan",data:grouped.map(x=>x.revenue),borderColor:"#4e7fbd",backgroundColor:"rgba(78,127,189,.10)",fill:true,tension:.36,borderWidth:2.5,pointRadius:2.5,pointHoverRadius:5},
    {label:"Keuntungan",data:grouped.map(x=>x.profit),borderColor:"#8c80d8",backgroundColor:"rgba(140,128,216,.04)",fill:false,tension:.36,borderWidth:2.5,pointRadius:2.5,pointHoverRadius:5}
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{position:"bottom",labels:{usePointStyle:true,boxWidth:7,boxHeight:7,padding:18,color:"#8290a4",font:{family:"DM Sans",size:10}}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${money(c.raw)}`}}},scales:{x:{grid:{display:false},ticks:{color:"#9aa7b8",font:{size:10}},border:{display:false}},y:{grid:{color:"#eef2f7"},ticks:{color:"#9aa7b8",font:{size:9},callback:v=>shortMoney(v)},border:{display:false}}}}});
}
function shortMoney(v){if(Math.abs(v)>=1e6)return `Rp${(v/1e6).toLocaleString("id-ID",{maximumFractionDigits:1})} jt`;if(Math.abs(v)>=1e3)return `${(v/1e3).toLocaleString("id-ID",{maximumFractionDigits:0})} rb`;return v;}
function renderCategories(rows) {
  const grouped={};rows.forEach(r=>grouped[r.kategori]=(grouped[r.kategori]||0)+r.keuntungan);
  const entries=Object.entries(grouped).sort((a,b)=>b[1]-a[1]);
  if(categoryChart)categoryChart.destroy();
  categoryChart=new Chart(document.getElementById("categoryChart"),{type:"doughnut",data:{labels:entries.map(e=>e[0]),datasets:[{data:entries.map(e=>Math.max(0,e[1])),backgroundColor:palette,borderWidth:3,borderColor:"#fff",hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:"70%",plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}}}});
  document.getElementById("categoryLegend").innerHTML=entries.map((e,i)=>`<div class="legend-row"><span class="legend-dot" style="background:${palette[i%palette.length]}"></span><span>${escapeHtml(e[0])}</span></div>`).join("") || '<div class="empty-state">Tidak ada data.</div>';
}
function renderRanking(rows) {
  const totals={};rows.forEach(r=>totals[r.produk]=(totals[r.produk]||0)+r.keuntungan);
  const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,5), max=Math.max(1,...entries.map(e=>e[1]));
  document.getElementById("productRanking").innerHTML=entries.length?entries.map(([name,val],i)=>`<div class="ranking-item"><span class="rank-index">${String(i+1).padStart(2,"0")}</span><div class="rank-info"><strong>${escapeHtml(name)}</strong><div class="rank-track"><div class="rank-fill" style="width:${Math.max(0,val)/max*100}%"></div></div></div><span class="rank-value">${money(val)}</span></div>`).join(""):'<div class="empty-state">Tidak ada data untuk filter ini.</div>';
}
function renderInsights(rows) {
  const items=[];
  if(!rows.length){document.getElementById("insightList").innerHTML='<div class="empty-state">Tidak ada data untuk filter yang dipilih.</div>';return;}
  const gross=rows.reduce((a,r)=>a+r.jumlah*r.harga_satuan,0), discount=sum(rows,"diskon");
  const discountPct=gross?discount/gross*100:0, revenue=sum(rows,"pendapatan"), profit=sum(rows,"keuntungan");
  const cost=sum(rows,"biaya_operasional"), margin=revenue?profit/revenue*100:0;
  items.push({icon:"％",title:"Tekanan dari diskon",body:`Diskon rata-rata setara ${percent(discountPct)} dari omzet kotor. Periksa apakah kenaikan volume mampu menutup pengurangan margin.`});
  items.push({icon:"↗",title:"Margin keuntungan",body:`Margin pada data terpilih sebesar ${percent(margin)}. Bandingkan margin per produk, bukan hanya total pendapatan.`});
  items.push({icon:"⌁",title:"Biaya operasional",body:`Biaya operasional tercatat ${money(cost)}. Tinjau biaya rutin dan biaya per transaksi untuk mencari ruang efisiensi.`});
  const monthly=Array.from({length:12},()=>({rev:0,prof:0}));
  rows.forEach(r=>{monthly[r.tanggal.getMonth()].rev+=r.pendapatan;monthly[r.tanggal.getMonth()].prof+=r.keuntungan;});
  const active=monthly.filter(m=>m.rev>0);
  if(active.length>=2){const first=active[0],last=active[active.length-1];const change=first.prof?((last.prof-first.prof)/Math.abs(first.prof))*100:0;
    items.push({icon:"⌁",title:"Perubahan antarbulan",body:`Keuntungan bulan aktif pertama dan terakhir berubah ${percent(change)}. Perubahan ini bersifat deskriptif; gunakan data lebih panjang untuk menyimpulkan tren.`});}
  document.getElementById("insightList").innerHTML=items.map(i=>`<div class="insight-item"><span class="insight-marker">${i.icon}</span><div><strong>${i.title}</strong><p>${i.body}</p></div></div>`).join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showToast(message){const t=document.getElementById("toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}
async function loadData(){
  try{
    const response=await fetch(DATA_PATH);
    if(!response.ok)throw new Error("File CSV tidak ditemukan.");
    const csv=await response.text();
    const parsed=Papa.parse(csv,{header:true,skipEmptyLines:true});
    if(parsed.errors.length)console.warn("Peringatan parsing CSV:",parsed.errors);
    allRows=parseRows(parsed.data);
    if(!allRows.length)throw new Error("Dataset kosong atau format kolom tidak sesuai.");
    initFilters(allRows);renderDashboard();
  }catch(error){
    console.error(error);
    document.getElementById("recordCount").textContent="Data belum terbaca";
    document.querySelectorAll(".metric-card>strong").forEach(el=>el.textContent="—");
    document.getElementById("productRanking").innerHTML='<div class="empty-state">Gagal memuat CSV. Jalankan website melalui server lokal, bukan membuka file langsung.</div>';
    document.getElementById("insightList").innerHTML='<div class="empty-state">Periksa file data/penjualan_umkm.csv dan petunjuk pada README.</div>';
  }
}
document.addEventListener("DOMContentLoaded",loadData);
