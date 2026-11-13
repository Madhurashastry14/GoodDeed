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

async function patchOrganizationInfo(organizationId, roleId, info) {
  const { name, description, city, website } = info;
  const role = await pool.query(
    "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2",
    [organizationId, roleId],
  );

  if (role.rows.length === 0 || role.rows[0].role !== "owner") {
    const error = new Error(
      "You are not allowed to update organization details",
    );
    error.statusCode = 403;
    throw error;
  }
  const updateResult = await pool.query(
    "UPDATE organizations SET name=COALESCE($1,name), description=COALESCE($2,description), city=COALESCE($3,city),website=COALESCE($4,website) WHERE id=$5 RETURNING id,name,description,city,website,verification_status,created_at",
    [
      name ?? null,
      description ?? null,
      city ?? null,
      website ?? null,
      organizationId,
    ],
  );

  return updateResult.rows[0];
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

//add existing user as member of a organization
async function addOrganizationMember(organizationId, userId, roleId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const role = await client.query(
      "SELECT role FROM organization_members where organization_id=$1 AND user_id=$2",
      [organizationId, roleId],
    );

    if (
      role.rows.length === 0 ||
      !["owner", "admin"].includes(role.rows[0].role)
    ) {
      const error = new Error("You can not add member");
      error.statuscode = 403;
      throw error;
    }

    const user = await client.query("SELECT * FROM users WHERE id = $1", [
      userId,
    ]);

    if (!user.rows.length) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const isExisting = await client.query(
      "SELECT * FROM organization_members WHERE organization_id=$1 AND user_id=$2",
      [organizationId, userId],
    );

    if (isExisting.rows.length) {
      const error = new Error("Member already exist");
      error.statusCode = 409;
      throw error;
    }

    const result = await client.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'member') RETURNING organization_id,user_id,role",
      [organizationId, userId],
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

async function removeMemberFromOrganization(organizationId, roleId, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const role = await client.query(
      "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2",
      [organizationId, roleId],
    );

    if (!["owner"].includes(role.rows[0].role)) {
      const error = new Error("You can not remove a member");
      error.statusCode = 403;
      throw error;
    }

    const user = await client.query(
      "SELECT user_id from organization_members WHERE organization_id=$1 AND user_id=$2",
      [organizationId, userId],
    );

    if (!user.rows.length) {
      const error = new Error("Member not found");
      error.statusCode = 404;
      throw error;
    }

    const removedMember = await client.query(
      "DELETE FROM organization_members WHERE organization_id=$1 AND user_id=$2 RETURNING *",
      [organizationId, userId],
    );

    await client.query("COMMIT");
    return removedMember.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteOrganization(organizationId, roleId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const organization = await client.query(
      "SELECT id FROM organizations WHERE id=$1",
      [organizationId],
    );

    if (organization.rows.length === 0) {
      const error = new Error("Organization does not exists");
      error.statusCode = 404;
      throw error;
    }

    const role = await client.query(
      "SELECT * FROM organization_members WHERE organization_id=$1 AND user_id=$2",
      [organizationId, roleId],
    );

    if (role.rows[0].role !== "owner") {
      const error = new Error("You are not allowed to delete the organization");
      error.statusCode = 403;
      throw error;
    }
    const deletedOrganization = await client.query(
      "DELETE FROM organizations WHERE id=$1",
      [organizationId],
    );

    await client.query("COMMIT");
    return deletedOrganization.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createOrganization,
  patchOrganizationInfo,
  getOrganization,
  getOrganizationById,
  getMyOrganizations,
  getOrganizationMembers,
  addOrganizationMember,
  removeMemberFromOrganization,
  deleteOrganization,
};
