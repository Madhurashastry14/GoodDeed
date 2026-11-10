const pool = require("../config/db");

async function getProfile(userId) {
  const result = await pool.query(
    "SELECT u.id,u.name,u.email,p.bio, p.city,p.interests FROM profiles p RIGHT JOIN users u on p.user_id=u.id WHERE u.id=$1",
    [userId],
  );

  return result.rows;
}

async function getPublicProfile(userId) {
  const result = await pool.query(
    "SELECT u.id,u.name,p.bio, p.city,p.interests FROM profiles p RIGHT JOIN users u on p.user_id=u.id WHERE u.id=$1",
    [userId],
  );
  return result.rows;
}

async function patchProfile(userId, data) {
  const { bio, city, interests } = data;
  const result = await pool.query(
    "UPDATE profiles SET bio = COALESCE($1,bio), city = COALESCE($2,city), interests = COALESCE($3,interests) WHERE user_id=$4 RETURNING user_id, bio,city,interests",
    [bio ?? null, city ?? null, interests ?? null, userId],
  );
  return result.rows[0];
}

module.exports = { getProfile, getPublicProfile, patchProfile };
