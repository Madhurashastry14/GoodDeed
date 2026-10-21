const crypto = require("crypto");
const pool = require("../config/db");
function generateRefreshToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function saveRefreshToken(userId, token) {
  const tokenHash = hashRefreshToken(token);
  const result = await pool.query(
    "INSERT INTO refresh_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,NOW()+INTERVAL '7 DAYS') RETURNING id, expires_at",
    [userId, tokenHash],
  );

  return result.rows[0];
}

async function findValidRefreshToken(token) {
  const tokenHash = hashRefreshToken(token);

  const result = await pool.query(
    "SELECT id,user_id FROM refresh_tokens WHERE token_hash=$1 AND expires_at > NOW()",
    [tokenHash],
  );

  return result.rows[0];
}

async function revokeRefreshToken(token) {
  const tokenHash = hashRefreshToken(token);

  const result = await pool.query(
    "DELETE FROM refresh_tokens WHERE token_hash=$1",
    [tokenHash],
  );
}

module.exports = {
  generateRefreshToken,
  hashRefreshToken,
  saveRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
};
