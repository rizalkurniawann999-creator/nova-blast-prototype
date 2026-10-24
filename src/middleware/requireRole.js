const { query } = require("../db");

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: "Silakan login terlebih dahulu." });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    const user = query("SELECT role FROM users WHERE id = ?", [req.session.userId])[0];
    if (!user || !roles.includes(user.role)) return res.status(403).json({ error: "Akses ditolak untuk role ini." });
    next();
  };
}
module.exports = { requireAuth, requireRole };
