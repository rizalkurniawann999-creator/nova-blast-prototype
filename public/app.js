const $ = (s) => document.querySelector(s);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
  return data;
}
function loginPage() {
  const form = $("#login-form");
  if (!form) return;
  document.querySelectorAll(".demo-account").forEach(btn => btn.addEventListener("click", () => {
    form.username.value = btn.dataset.user;
    form.password.value = btn.dataset.pass;
  }));
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const error = $("#login-error");
    error.textContent = "";
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify({
        username: form.username.value, password: form.password.value
      })});
      location.href = "/dashboard.html";
    } catch (err) { error.textContent = err.message; }
    finally { submit.disabled = false; }
  });
  api("/api/me").then(() => location.href = "/dashboard.html").catch(() => {});
}
const menus = {
  user: [
    ["overview","◫","Dashboard"],["devices","▣","Device demo"],["withdrawal","↗","Withdrawal"],["referral","♧","Affiliate referral"],["profile","◉","Profil"]
  ],
  admin: [
    ["overview","◫","Dashboard"],["servers","▦","Multi server"],["templates","▤","Template settings"],["users","♙","User management"],["logs","≋","Activity logs"],["settings","⚙","Settings"]
  ],
  boss: [
    ["overview","◫","Dashboard"],["servers","▦","Multi server"],["templates","▤","Template & kategori"],["users","♙","Manajemen user"],["logs","≋","Laporan aktivitas"],["settings","⚙","Settings"]
  ]
};
let currentUser = null;
let currentPage = "overview";
async function dashboardPage() {
  if (!$("#content")) return;
  try {
    const data = await api("/api/me");
    currentUser = data.user;
    $("#top-name").textContent = currentUser.displayName;
    $("#top-role").textContent = currentUser.role.toUpperCase();
    $("#avatar").textContent = currentUser.displayName.slice(0,1).toUpperCase();
    renderNav();
    await renderPage("overview");
  } catch { location.href = "/"; }
  $("#logout-btn").addEventListener("click", async () => {
    try { await api("/api/logout", { method: "POST", body: "{}" }); } finally { location.href = "/"; }
  });
  $("#menu-toggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
}
function renderNav() {
  $("#nav-menu").innerHTML = menus[currentUser.role].map(([key,icon,label]) =>
    `<a href="#" class="nav-link ${key===currentPage?"active":""}" data-page="${key}"><span class="nav-icon">${icon}</span>${label}</a>`
  ).join("");
  $("#nav-menu").querySelectorAll("[data-page]").forEach(a => a.addEventListener("click", async e => {
    e.preventDefault(); await renderPage(a.dataset.page); $("#sidebar").classList.remove("open");
  }));
}
async function renderPage(page) {
  currentPage = page; renderNav();
  const titles = {overview:"Dashboard",devices:"Device demo",withdrawal:"Withdrawal",referral:"Affiliate referral",profile:"Profil",servers:"Multi server",templates:"Template settings",users:"Manajemen user",logs:"Activity logs",settings:"Settings"};
  $("#page-title").textContent = titles[page] || "Dashboard";
  $("#page-eyebrow").textContent = currentUser.role.toUpperCase() + " PANEL";
  const content = $("#content");
  content.innerHTML = '<div class="loading">Memuat data…</div>';
  try {
    if (page === "overview") content.innerHTML = await overviewHTML();
    else if (page === "servers") content.innerHTML = await serversHTML();
    else if (page === "users") content.innerHTML = await usersHTML();
    else if (page === "templates") content.innerHTML = await templatesHTML();
    else if (page === "logs") content.innerHTML = await logsHTML();
    else if (page === "devices") content.innerHTML = devicesHTML();
    else if (page === "withdrawal") content.innerHTML = withdrawalHTML();
    else if (page === "referral") content.innerHTML = referralHTML();
    else if (page === "profile") content.innerHTML = profileHTML();
    else if (page === "settings") content.innerHTML = settingsHTML();
    wirePage(page);
  } catch (err) { content.innerHTML = `<div class="notice">Gagal memuat: ${esc(err.message)}</div>`; }
}
async function overviewHTML() {
  const [summary, servers] = await Promise.all([api("/api/summary"), api("/api/vps")]);
  const countRole = role => (summary.userCounts.find(x => x.role === role)?.total || 0);
  const serverRows = servers.servers.slice(0,4).map(s => `<div class="server-row"><div><span class="server-name">${esc(s.label)}</span><span class="server-region">${esc(s.region)}</span></div><div><div class="meter-label"><span>CPU</span><span>${s.cpu_pct}%</span></div><div class="meter"><span style="width:${s.cpu_pct}%"></span></div></div><span class="pill ${esc(s.status)}">${esc(s.status)}</span></div>`).join("");
  const stats = currentUser.role === "user" ? [
    ["Device demo","2","Perangkat contoh","▣"],["Job simulasi",summary.demoMessages,"Tidak mengirim pesan","↗"],["Referral","0","Referral demo","♧"],["Saldo demo","Rp0","Tidak bernilai uang","◈"]
  ] : [
    ["Total akun",countRole("user")+countRole("admin")+countRole("boss"),"Semua role","♙"],["User",countRole("user"),"Akun demo","♧"],["Job simulasi",summary.demoMessages,"Tidak mengirim pesan","↗"],["Server demo",servers.servers.length,"Data simulasi","▦"]
  ];
  return `<div class="section-heading"><div><h2>Ringkasan sistem</h2><p>Halo ${esc(currentUser.displayName)}, ini ringkasan workspace demo lu.</p></div><span class="pill online">● Sistem lokal</span></div>
  <div class="grid stats-grid">${stats.map(s=>`<article class="stat-card"><div class="stat-top"><span>${s[0]}</span><span class="stat-icon">${s[3]}</span></div><div class="stat-value">${esc(s[1])}</div><div class="stat-note">${s[2]}</div></article>`).join("")}</div>
  <div class="grid content-grid"><article class="panel-card"><h3>Status server simulasi</h3><p class="sub">Contoh CPU dan status; bukan metrik VPS nyata.</p><div class="server-list">${serverRows}</div><button class="btn ghost" data-go="servers">Lihat semua server →</button></article>
  <article class="panel-card"><h3>Aksi cepat</h3><p class="sub">Fitur yang tersedia di prototype.</p><div class="grid">${(currentUser.role==="user"?[["devices","▣","Device demo","Lihat perangkat contoh"],["withdrawal","↗","Withdrawal","Simulasi permintaan"],["referral","♧","Referral","Lihat kode demo"]]:[["servers","▦","Multi server","Lihat 6 VPS simulasi"],["templates","▤","Template","Kelola template demo"],["logs","≋","Activity logs","Audit aktivitas"]]).map(a=>`<button class="action-tile" data-go="${a[0]}"><span class="stat-icon">${a[1]}</span><span><strong>${a[2]}</strong><small>${a[3]}</small></span></button>`).join("")}</div></article></div>
  <article class="panel-card"><h3>Buat job simulasi</h3><p class="sub">Menguji alur pencatatan saja. Tidak mengirim pesan ke nomor mana pun.</p><form id="job-form"><div class="form-row"><div class="field"><label>Nama job demo</label><input name="detail" maxlength="120" value="Tes alur demo" required></div><div class="field"><label>&nbsp;</label><button class="btn primary" type="submit">Buat job simulasi</button></div></div><p id="job-result" class="muted"></p></form></article>`;
}
async function serversHTML() {
  const {servers,simulated}=await api("/api/vps");
  return `<div class="section-heading"><div><h2>Multi server</h2><p>6 VPS virtual untuk ilustrasi distribusi beban.</p></div><span class="pill">SIMULATED: ${simulated}</span></div>
  <div class="grid server-grid">${servers.map(s=>`<article class="server-card"><div class="server-card-head"><h3>${esc(s.label)}</h3><span class="pill ${esc(s.status)}">${esc(s.status)}</span></div><p class="region">⌖ ${esc(s.region)} • Server demo</p><div class="server-metric"><div class="meter-label"><span>CPU usage</span><strong>${s.cpu_pct}%</strong></div><div class="meter"><span style="width:${s.cpu_pct}%"></span></div></div><div class="server-metric"><div class="meter-label"><span>RAM usage</span><strong>${s.ram_pct}%</strong></div><div class="meter"><span style="width:${s.ram_pct}%"></span></div></div><div class="server-card-foot"><span>Antrean demo</span><strong>${s.queued_jobs} job</strong></div></article>`).join("")}</div>
  <div class="notice" style="margin-top:16px">Status, CPU, RAM, dan antrean di halaman ini adalah fixture statis untuk pengujian UI. Ini tidak terhubung ke VPS nyata dan belum melakukan load balancing.</div>`;
}
async function usersHTML() {
  const {users}=await api("/api/users");
  return `<div class="section-heading"><div><h2>Manajemen user</h2><p>Daftar akun demo. Pembuatan akun baru belum diaktifkan.</p></div><span class="pill">${users.length} akun</span></div><article class="panel-card table-wrap"><table><thead><tr><th>ID</th><th>Username</th><th>Nama</th><th>Role</th><th>Dibuat</th></tr></thead><tbody>${users.map(u=>`<tr><td>#${u.id}</td><td>${esc(u.username)}</td><td>${esc(u.display_name)}</td><td><span class="pill">${esc(u.role)}</span></td><td>${esc(u.created_at)}</td></tr>`).join("")}</tbody></table></article>`;
}
async function templatesHTML() {
  const {templates}=await api("/api/templates");
  return `<div class="section-heading"><div><h2>Template & kategori</h2><p>Template teks untuk preview lokal saja.</p></div></div>
  <div class="grid content-grid"><article class="panel-card"><h3>Template tersimpan</h3><p class="sub">${templates.length} template demo</p><div class="template-list">${templates.map(t=>`<div class="template-item"><span class="pill">${esc(t.category)}</span><p><strong>${esc(t.name)}</strong></p><p>${esc(t.body)}</p></div>`).join("")}</div></article>
  <article class="panel-card"><h3>Tambah template</h3><p class="sub">Admin dan bos dapat menambahkan template.</p><form id="template-form"><div class="field"><label>Nama</label><input name="name" required maxlength="80"></div><div class="field"><label>Kategori</label><input name="category" maxlength="60" value="Umum"></div><div class="field"><label>Isi template</label><textarea name="body" required maxlength="1000"></textarea></div><button class="btn primary" type="submit">Simpan template</button><p id="template-result" class="muted"></p></form></article></div>`;
}
async function logsHTML() {
  const {logs}=await api("/api/activity");
  return `<div class="section-heading"><div><h2>Activity logs</h2><p>Jejak aktivitas demo terbaru.</p></div></div><article class="panel-card table-wrap"><table><thead><tr><th>Waktu</th><th>Username</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>${logs.map(l=>`<tr><td>${esc(l.created_at)}</td><td>${esc(l.username||"system")}</td><td>${esc(l.action)}</td><td>${esc(l.detail)}</td></tr>`).join("") || "<tr><td colspan='4'>Belum ada aktivitas.</td></tr>"}</tbody></table></article>`;
}
function devicesHTML(){return `<div class="section-heading"><div><h2>Device WhatsApp demo</h2><p>UI ilustrasi, belum tersambung ke WhatsApp.</p></div></div><div class="grid content-grid"><article class="panel-card"><span class="pill online">DEMO CONNECTED</span><h3 style="margin-top:16px">Device contoh #01</h3><p class="sub">Nomor disamarkan • Tidak ada sesi WhatsApp sungguhan</p><div class="notice">Pairing QR, nomor telepon, dan pengiriman dinonaktifkan di prototype ini.</div></article><article class="panel-card"><h3>Tambah perangkat</h3><p class="sub">Simulasi saja.</p><button class="btn primary" id="fake-device">Tambah device demo</button><p id="device-result" class="muted" style="margin-top:12px"></p></article></div>`}
function withdrawalHTML(){return `<div class="section-heading"><div><h2>Withdrawal</h2><p>Form demonstrasi tanpa uang atau transaksi nyata.</p></div></div><article class="panel-card" style="max-width:650px"><div class="notice">Saldo demo tidak memiliki nilai uang. Jangan masukkan PIN, rekening, atau data keuangan asli.</div><form id="withdraw-form" style="margin-top:18px"><div class="field"><label>Nominal demo (angka bebas)</label><input name="amount" type="number" min="1" max="1000000" required placeholder="Contoh: 50000"></div><div class="field"><label>Catatan</label><input name="note" maxlength="100" placeholder="Permintaan simulasi"></div><button class="btn primary" type="submit">Simulasikan permintaan</button><p id="withdraw-result" class="muted" style="margin-top:12px"></p></form></article>`}
function referralHTML(){return `<div class="section-heading"><div><h2>Affiliate referral</h2><p>Contoh tampilan program referral.</p></div></div><div class="grid stats-grid"><article class="stat-card"><div class="stat-top">Kode referral</div><div class="stat-value" style="font-size:22px">NOVA-DEMO</div><div class="stat-note">Kode statis untuk preview</div></article><article class="stat-card"><div class="stat-top">Referral terdaftar</div><div class="stat-value">0</div><div class="stat-note">Data contoh</div></article></div><div class="notice">Belum ada tautan referral aktif, komisi, atau pencatatan pembayaran.</div>`}
function profileHTML(){return `<div class="section-heading"><div><h2>Profil</h2><p>Informasi akun yang sedang login.</p></div></div><article class="panel-card" style="max-width:600px"><div class="field"><label>Nama tampilan</label><input value="${esc(currentUser.displayName)}" disabled></div><div class="field"><label>Username</label><input value="${esc(currentUser.username)}" disabled></div><div class="field"><label>Role</label><input value="${esc(currentUser.role)}" disabled></div><div class="notice">Pengubahan profil belum diaktifkan di tahap awal.</div></article>`}
function settingsHTML(){return `<div class="section-heading"><div><h2>Settings</h2><p>Konfigurasi prototype.</p></div></div><article class="panel-card"><h3>Mode aplikasi</h3><p class="sub">Local demo • SQLite WASM • Express session</p><div class="notice">OTP email, pengaturan referral, PIN withdrawal, Telegram bot, integrasi WhatsApp, serta koneksi VPS nyata belum diaktifkan. Tahap ini fokus pada navigasi, role access, dan data simulasi.</div></article>`}
function wirePage(page) {
  document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>renderPage(btn.dataset.go)));
  const job=$("#job-form");
  if(job) job.addEventListener("submit",async e=>{e.preventDefault();const result=$("#job-result");try{const data=await api("/api/demo-job",{method:"POST",body:JSON.stringify({detail:job.detail.value})});result.textContent=data.message;}catch(err){result.textContent=err.message;}});
  const tf=$("#template-form");
  if(tf) tf.addEventListener("submit",async e=>{e.preventDefault();const result=$("#template-result");try{await api("/api/templates",{method:"POST",body:JSON.stringify({name:tf.name.value,category:tf.category.value,body:tf.body.value})});result.textContent="Template tersimpan.";await renderPage("templates");}catch(err){result.textContent=err.message;}});
  const wf=$("#withdraw-form");
  if(wf) wf.addEventListener("submit",e=>{e.preventDefault();$("#withdraw-result").textContent=`Permintaan demo sebesar ${Number(wf.amount.value).toLocaleString("id-ID")} tercatat hanya di tampilan. Belum ada transaksi nyata.`;});
  const fd=$("#fake-device");
  if(fd) fd.addEventListener("click",()=>$("#device-result").textContent="Device demo baru berhasil disimulasikan (tidak tersimpan dan tidak tersambung ke WhatsApp).");
}
loginPage();
dashboardPage();
  
