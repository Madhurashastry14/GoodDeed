const pool = require("../config/db");
const bcrypt = require("bcrypt");
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

async function patchPassword(userId, currentPassword, newPassword) {
  const client = await pool.connect();

  try {
    const currectPasswordCheck = await client.query(
      "SELECT password_hash FROM users WHERE id=$1",
      [userId],
    );

    if (currectPasswordCheck.length === 0) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      currectPasswordCheck.rows[0].password_hash,
    );

    if (!isCurrentPasswordValid) {
      const error = new Error("Current password is incorrect");
      error.statusCode = 401;
      throw error;
    }

    const newPasswordHassh = await bcrypt.hash(newPassword, 10);

    await client.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
      newPasswordHassh,
      userId,
    ]);

    await client.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
      userId,
    ]);

    await client.query("COMMIT");

    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { getProfile, getPublicProfile, patchProfile, patchPassword };
