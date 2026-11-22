const pool = require("../config/db");

async function createOpportunity({
  organizationId,
  title,
  description,
  city,
  startsAt,
  endsAt,
  capacity,
  userId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Check whether the organization exists.
    const organization = await client.query(
      "SELECT id FROM organizations WHERE id = $1",
      [organizationId],
    );

    if (organization.rows.length === 0) {
      const error = new Error("Organization not found");
      error.statusCode = 404;
      throw error;
    }

    const membership = await client.query(
      `SELECT role
       FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId],
    );

    if (
      membership.rows.length === 0 ||
      !["owner"].includes(membership.rows[0].role)
    ) {
      const error = new Error(
        "You are not allowed to create opportunities for this organization",
      );
      error.statusCode = 403;
      throw error;
    }

    const result = await client.query(
      `INSERT INTO opportunities (
        organization_id,
        title,
        description,
        city,
        starts_at,
        ends_at,
        capacity,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        organization_id,
        title,
        description,
        city,
        starts_at,
        ends_at,
        capacity,
        status,
        created_by,
        created_at`,
      [
        organizationId,
        title,
        description,
        city,
        startsAt,
        endsAt,
        capacity,
        userId,
      ],
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getOrganizationOpportunities(organizationId, userId = null) {
  const pool = require("../config/db");

  let canManage = false;

  // Check whether the user is an owner or admin
  if (userId) {
    const membership = await pool.query(
      `SELECT role
       FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId],
    );

    canManage = ["owner", "admin"].includes(membership.rows[0]?.role);
  }

  // Managers can see drafts; everyone else sees published only
  const result = await pool.query(
    `SELECT
       id,
       organization_id,
       title,
       description,
       city,
       starts_at,
       ends_at,
       capacity,
       status,
       created_at
     FROM opportunities
     WHERE organization_id = $1
       AND ($2::boolean = TRUE OR status = 'published')
     ORDER BY created_at DESC`,
    [organizationId, canManage],
  );

  return result.rows;
}

module.exports = {
  createOpportunity,
  getOrganizationOpportunities,
};
