const pool = require("../config/db");
const bcrypt = require("bcrypt");
async function createUser(name, email, password) {
  const exsisting = await pool.query("SELECT id FROM users WHERE email=$1", [
    email,
  ]);
  if (exsisting.rows.length > 0) {
    const error = new Error("User already exist");
    error.statuscode = 409;
    throw error;
  }
  const passswordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    "INSERT INTO users(name,email,password_hash) VALUES ($1,$2,$3)",
    [name, email, passswordHash],
  );
  return result.rows[0];
}

module.exports = { createUser };
