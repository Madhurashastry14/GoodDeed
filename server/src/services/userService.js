const pool = require("../config/db");

async function getProfile(userId) {
  const result = await pool.query(
    "SELECT p.bio, p.city,p.interests FROM profile p JOIN users u on p.user_id=u.id WHERE u.id=$1",
    [userId],
  );

  return result.rows;
}

module.exports = { getProfile };
