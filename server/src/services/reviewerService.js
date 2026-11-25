const pool = require("../config/db");

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

/**
 * Platform reviewer access is a platform-level capability. It is stored in its
 * own table so organization owner/admin roles never imply reviewer access.
 */
async function isReviewer(userId) {
  if (!isUuid(userId)) {
    return false;
  }

  const result = await pool.query(
    `SELECT 1 FROM platform_reviewers WHERE user_id = $1`,
    [userId],
  );

  return result.rows.length > 0;
}

async function listReviewers() {
  const result = await pool.query(
    `SELECT r.user_id, u.name, u.email, r.granted_by, r.granted_at
     FROM platform_reviewers r
     JOIN users u ON u.id = r.user_id
     ORDER BY r.granted_at ASC`,
  );

  return result.rows;
}

async function grantReviewer(userId, grantedBy = null) {
  if (!isUuid(userId)) {
    const error = new Error("A valid user ID is required");
    error.statusCode = 400;
    throw error;
  }

  const user = await pool.query(`SELECT id FROM users WHERE id = $1`, [userId]);

  if (user.rows.length === 0) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO platform_reviewers (user_id, granted_by)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE
       SET granted_by = COALESCE(EXCLUDED.granted_by, platform_reviewers.granted_by)
     RETURNING user_id, granted_by, granted_at`,
    [userId, isUuid(grantedBy) ? grantedBy : null],
  );

  return result.rows[0];
}

async function revokeReviewer(userId) {
  const result = await pool.query(
    `DELETE FROM platform_reviewers WHERE user_id = $1 RETURNING user_id`,
    [userId],
  );

  return result.rows.length > 0;
}

module.exports = {
  isReviewer,
  listReviewers,
  grantReviewer,
  revokeReviewer,
};
