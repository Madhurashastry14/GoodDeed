const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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

async function getUser(email, password) {
  const result = await pool.query("SELECT * FROM users WHERE email=$1", [
    email,
  ]);
  if (result.rows.length === 0) {
    const error = new Error("User not found");
    error.statuscode = 404;
    throw error;
  }
  const user = result.rows[0];
  const passwordCheck = await bcrypt.compare(password, user.password_hash);

  if (!passwordCheck) {
    const error = new Error("Invalid password");
    error.statuscode = 401;
    throw error;
  }
  const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    accessToken,
  };
}

module.exports = { createUser, getUser };
