require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const { initDb, query, run, saveDb } = require("./src/db");
const { requireAuth, requireRole } = require("./src/middleware/requireRole");
const auth = require("./src/auth");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

app.use(session({
  name: "nova.sid",
  secret: process.env.SESSION_SECRET || "dev-only-change-this-secret-before-real-deployment",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 4
  }
}));

app.use(express.static(path.join(__dirname, "public")));

function safeUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, role: user.role, displayName: user.display_name };
}

app.get("/api/health", (_req, res) => res.json({ ok: true, mode: "local-demo" }));

app.get("/api/me", requireAuth, (req, res) => {
  const user = query("SELECT id, username, role, display_name FROM users WHERE id = ?", [req.session.userId])[0];
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Sesi tidak valid." });
  }
  res.json({ user: safeUser(user) });
});

app.post("/api/login", async (req, res) => {
  const username = String(req.body.username || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!username || !password || username.length > 80 || password.length > 200) {
    return res.status(400).json({ error: "Username dan password wajib diisi." });
  }
  const user = query("SELECT * FROM users WHERE username = ?", [username])[0];
  if (!user || !(await auth.verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: "Username atau password salah." });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Gagal membuat sesi." });
    req.session.userId = user.id;
    res.json({ user: safeUser(user) });
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie("nova.sid");
    if (err) return res.status(500).json({ error: "Gagal logout." });
    res.json({ ok: true });
  });
});

app.get("/api/summary", requireAuth, (req, res) => {
  const counts = query("SELECT role, COUNT(*) AS total FROM users GROUP BY role");
  const logs = query("SELECT action, detail, created_at FROM activity_logs ORDER BY id DESC LIMIT 8");
  res.json({
    userCounts: counts,
    demoMessages: query("SELECT COUNT(*) AS total FROM demo_jobs")[0].total,
    recentActivity: logs
  });
});

app.get("/api/vps", requireAuth, (req, res) => {
  // Values are illustrative fixtures, not measurements of real machines.
  const servers = query("SELECT id, label, region, status, cpu_pct, ram_pct, queued_jobs FROM vps_demo ORDER BY id");
  res.json({ simulated: true, servers });
});

app.get("/api/users", requireAuth, requireRole("admin", "boss"), (req, res) => {
  const users = query("SELECT id, username, display_name, role, created_at FROM users ORDER BY id");
  res.json({ users });
});

app.post("/api/demo-job", requireAuth, (req, res) => {
  const detail = String(req.body.detail || "Demo job").slice(0, 120);
  run("INSERT INTO demo_jobs (created_by, detail, status) VALUES (?, ?, ?)", [req.session.userId, detail, "simulated"]);
  run("INSERT INTO activity_logs (user_id, action, detail) VALUES (?, ?, ?)", [req.session.userId, "demo_job_created", detail]);
  saveDb();
  res.status(201).json({ ok: true, message: "Job simulasi dibuat. Tidak ada pesan yang dikirim." });
});

app.get("/api/activity", requireAuth, requireRole("admin", "boss"), (_req, res) => {
  res.json({ logs: query(
    "SELECT activity_logs.id, users.username, activity_logs.action, activity_logs.detail, activity_logs.created_at FROM activity_logs LEFT JOIN users ON users.id = activity_logs.user_id ORDER BY activity_logs.id DESC LIMIT 100"
  ) });
});

app.get("/api/templates", requireAuth, (req, res) => {
  const templates = query("SELECT id, name, category, body FROM templates ORDER BY id");
  res.json({ templates });
});

app.post("/api/templates", requireAuth, requireRole("admin", "boss"), (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  const category = String(req.body.category || "Umum").trim().slice(0, 60);
  const body = String(req.body.body || "").trim().slice(0, 1000);
  if (!name || !body) return res.status(400).json({ error: "Nama dan isi template wajib diisi." });
  run("INSERT INTO templates (name, category, body) VALUES (?, ?, ?)", [name, category, body]);
  run("INSERT INTO activity_logs (user_id, action, detail) VALUES (?, ?, ?)", [req.session.userId, "template_created", name]);
  saveDb();
  res.status(201).json({ ok: true });
});

app.get("/api/role-info", requireAuth, (req, res) => {
  const user = query("SELECT role FROM users WHERE id = ?", [req.session.userId])[0];
  const descriptions = {
    user: "Dashboard pengguna: perangkat demo, referral, profil, dan job simulasi.",
    admin: "Panel admin: manajemen pengguna, template, aktivitas, dan VPS simulasi.",
    boss: "Panel bos: ringkasan sistem, kategori, template, dan laporan."
  };
  res.json({ role: user.role, description: descriptions[user.role] || "Role belum dikenali." });
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Endpoint tidak ditemukan." }));

initDb().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NOVA demo running at http://127.0.0.1:${PORT}`);
    console.log("Demo accounts: user_demo / DemoUser123!, admin_demo / DemoAdmin123!, boss_demo / DemoBoss123!");
    if (!process.env.SESSION_SECRET) console.warn("WARNING: set SESSION_SECRET in .env before using beyond local demo.");
  });
}).catch((err) => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});
