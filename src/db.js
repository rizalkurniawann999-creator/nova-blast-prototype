const fs = require("fs");
const path = require("path");
const initSqlJs = require("sql.js");
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "app.db");
let db;

function saveDb() {
  if (!db) return;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
}
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally { stmt.free(); }
}
function run(sql, params = []) {
  db.run(sql, params);
}
async function initDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  const SQL = await initSqlJs();
  db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user','admin','boss')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS vps_demo (
      id INTEGER PRIMARY KEY,
      label TEXT NOT NULL,
      region TEXT NOT NULL,
      status TEXT NOT NULL,
      cpu_pct INTEGER NOT NULL,
      ram_pct INTEGER NOT NULL,
      queued_jobs INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS demo_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_by INTEGER NOT NULL,
      detail TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );
  `);

  const existing = query("SELECT COUNT(*) AS total FROM users")[0].total;
  if (!existing) {
    const accounts = [
      ["user_demo", "DemoUser123!", "User Demo", "user"],
      ["admin_demo", "DemoAdmin123!", "Admin Demo", "admin"],
      ["boss_demo", "DemoBoss123!", "Bos Demo", "boss"]
    ];
    for (const [username, password, displayName, role] of accounts) {
      const hash = await bcrypt.hash(password, 10);
      run("INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)", [username, hash, displayName, role]);
    }

    const servers = [
      [1, "DEMO-VPS-01", "Jakarta", "online", 24, 48, 3],
      [2, "DEMO-VPS-02", "Singapore", "online", 41, 57, 8],
      [3, "DEMO-VPS-03", "Tokyo", "online", 17, 39, 1],
      [4, "DEMO-VPS-04", "Frankfurt", "maintenance", 0, 0, 0],
      [5, "DEMO-VPS-05", "Jakarta", "online", 63, 72, 12],
      [6, "DEMO-VPS-06", "Singapore", "offline", 0, 0, 0]
    ];
    for (const server of servers) run(
      "INSERT INTO vps_demo (id, label, region, status, cpu_pct, ram_pct, queued_jobs) VALUES (?, ?, ?, ?, ?, ?, ?)", server
    );

    run("INSERT INTO templates (name, category, body) VALUES (?, ?, ?)", ["Demo welcome", "Umum", "Halo {{nama}}, ini hanya template demonstrasi."]);
    run("INSERT INTO templates (name, category, body) VALUES (?, ?, ?)", ["Info layanan", "Informasi", "Ini contoh isi template untuk preview lokal."]);
    saveDb();
  }
}
module.exports = { initDb, query, run, saveDb };
  
