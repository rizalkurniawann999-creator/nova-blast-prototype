const bcrypt = require("bcryptjs");
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
module.exports = { verifyPassword };
