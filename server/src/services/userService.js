const pool = require("../config/db");

async function getProfile(userId) {
  const result = await pool.query(
    "SELECT u.id,u.name,u.email,p.bio, p.city,p.interests FROM profile p RIGHT JOIN users u on p.user_id=u.id WHERE u.id=$1",
    [userId],
  );

  return result.rows;
}

module.exports = { getProfile };
