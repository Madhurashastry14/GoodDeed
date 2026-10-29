const pool = require("../config/db");

async function createOrganization({
  name,
  description,
  city,
  website,
  userId,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const organizationResult = await client.query(
      "INSERT INTO organizations(name,description,city,website,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,description,city,website,verification_status,created_by,created_at ",
      [name, description || null, city, website || null, userId],
    );

    const organization = organizationResult.rows[0];
    await client.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'owner')",
      [organization.id, userId],
    );

    await client.query("COMMIT");
    return organization;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getOrganization() {
  const result = await pool.query(
    "SELECT id,name,description,city,website,created_at FROM organizations ORDER BY created_at",
  );
  return result.rows;
}

async function getOrganizationById(userId) {
  const result = await pool.query(
    "SELECT id,name,description,city,website,created_at FROM organizations WHERE id=$1",
    [userId],
  );
  return result.rows;
}

async function getMyOrganizations(userId) {
  const result = await pool.query(
    `SELECT o.id, o.name,o.description, o.city,o.website, o.verification_status, om.role
     FROM organizations o
     JOIN organization_members om
       ON om.organization_id = o.id
     WHERE om.user_id = $1
     ORDER BY o.created_at DESC`,
    [userId],
  );

  return result.rows;
}

async function getOrganizationMembers(organizationId) {
  const result = await pool.query(
    "SELECT u.id, u.name, om.role, u.created_at FROM organization_members om JOIN users u ON u.id=om.user_id WHERE om.organization_id=$1",
    [organizationId],
  );

  return result.rows;
}

module.exports = {
  createOrganization,
  getOrganization,
  getOrganizationById,
  getMyOrganizations,
  getOrganizationMembers,
};
