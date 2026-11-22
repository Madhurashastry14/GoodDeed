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

  // Only the organization owner can see unpublished opportunities.
  if (userId) {
    const membership = await pool.query(
      `SELECT role
       FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId],
    );

    canManage = membership.rows[0]?.role === "owner";
  }

  // Owners can see drafts; everyone else sees published only
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
       created_at,
       (ends_at <= NOW()) AS can_complete
     FROM opportunities
     WHERE organization_id = $1
       AND ($2::boolean = TRUE OR status = 'published')
     ORDER BY created_at DESC`,
    [organizationId, canManage],
  );

  return result.rows;
}

async function getPublicOpportunities({
  search = null,
  city = null,
  upcoming = false,
  sort = "start_asc",
  page = 1,
  limit = 9,
} = {}) {
  const orderBy =
    sort === "start_desc" ? "o.starts_at DESC" : "o.starts_at ASC";

  const offset = (page - 1) * limit;

  const result = await pool.query(
    `SELECT
       o.id,
       o.organization_id,
       o.title,
       o.description,
       o.city,
       o.starts_at,
       o.ends_at,
       o.capacity,
       o.status,
       o.created_at,
       org.name AS organization_name,
       org.city AS organization_city,
       COALESCE(
         (
           SELECT COUNT(*)::int
           FROM applications a
           WHERE a.opportunity_id = o.id AND a.status = 'accepted'
         ),
         0
       ) AS accepted_count,
       COUNT(*) OVER()::int AS total_count
     FROM opportunities o
     JOIN organizations org ON org.id = o.organization_id
     WHERE o.status = 'published'
       AND (
         $1::text IS NULL
         OR o.title ILIKE '%' || $1 || '%'
         OR o.description ILIKE '%' || $1 || '%'
         OR org.name ILIKE '%' || $1 || '%'
       )
       AND ($2::text IS NULL OR LOWER(o.city) = LOWER($2))
       AND ($3::boolean = FALSE OR o.starts_at >= NOW())
     ORDER BY ${orderBy}
     LIMIT $4 OFFSET $5`,
    [search, city, upcoming, limit, offset],
  );

  const total = result.rows[0]?.total_count ?? 0;

  const opportunities = result.rows.map(({ total_count, ...row }) => row);

  return { opportunities, total, page, limit };
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getOpportunityById(opportunityId, userId = null) {
  const result = await pool.query(
    `SELECT
       o.id,
       o.organization_id,
       o.title,
       o.description,
       o.city,
       o.starts_at,
       o.ends_at,
       o.capacity,
       o.status,
       o.created_by,
       o.created_at,
       o.updated_at,
       (o.ends_at <= NOW()) AS can_complete,
       (o.status = 'published' AND o.starts_at > NOW()) AS applications_open,
       org.name AS organization_name,
       org.city AS organization_city,
       COALESCE(
         (
           SELECT COUNT(*)::int
           FROM applications a
           WHERE a.opportunity_id = o.id AND a.status = 'accepted'
         ),
         0
       ) AS accepted_count,
       EXISTS (
         SELECT 1
         FROM organization_members om
         WHERE om.organization_id = o.organization_id
           AND om.user_id = $2::uuid
           AND om.role = 'owner'
       ) AS is_owner
     FROM opportunities o
     JOIN organizations org ON org.id = o.organization_id
     WHERE o.id = $1`,
    [opportunityId, userId],
  );

  const opportunity = result.rows[0];

  if (!opportunity) {
    return null;
  }

  // Unpublished opportunities are only visible to the organization owner.
  if (opportunity.status !== "published" && !opportunity.is_owner) {
    return null;
  }

  return opportunity;
}

async function updateOpportunity(opportunityId, userId, updates) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const opportunityResult = await client.query(
      "SELECT * FROM opportunities WHERE id = $1 FOR UPDATE",
      [opportunityId],
    );

    if (opportunityResult.rows.length === 0) {
      throw httpError(404, "Opportunity not found");
    }

    const opportunity = opportunityResult.rows[0];

    const membership = await client.query(
      `SELECT role
       FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [opportunity.organization_id, userId],
    );

    if (membership.rows[0]?.role !== "owner") {
      throw httpError(403, "Only the organization owner can edit opportunities");
    }

    if (!["draft", "published"].includes(opportunity.status)) {
      throw httpError(
        409,
        "Only draft or published opportunities can be edited",
      );
    }

    const acceptedResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM applications
       WHERE opportunity_id = $1 AND status = 'accepted'`,
      [opportunityId],
    );

    const acceptedCount = acceptedResult.rows[0].count;

    const title = updates.title?.trim() ?? opportunity.title;
    const description = updates.description?.trim() ?? opportunity.description;
    const city = updates.city?.trim() ?? opportunity.city;
    const startsAt = updates.startsAt
      ? new Date(updates.startsAt)
      : opportunity.starts_at;
    const endsAt = updates.endsAt
      ? new Date(updates.endsAt)
      : opportunity.ends_at;
    const capacity =
      updates.capacity === undefined ? opportunity.capacity : updates.capacity;

    if (!title || !description || !city) {
      throw httpError(400, "Title, description, and city are required");
    }

    if (endsAt <= startsAt) {
      throw httpError(400, "End time must be later than start time");
    }

    if (acceptedCount > 0 && startsAt <= new Date()) {
      throw httpError(
        409,
        "Start time cannot be moved into the past after volunteers are accepted",
      );
    }

    if (capacity !== null && capacity < acceptedCount) {
      throw httpError(
        409,
        "Capacity cannot be less than the number of accepted volunteers",
      );
    }

    const updated = await client.query(
      `UPDATE opportunities
       SET title = $1,
           description = $2,
           city = $3,
           starts_at = $4,
           ends_at = $5,
           capacity = $6,
           updated_at = NOW()
       WHERE id = $7
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
         created_at,
         updated_at`,
      [title, description, city, startsAt, endsAt, capacity, opportunityId],
    );

    await client.query("COMMIT");

    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function publishOpportunity(opportunityId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT * FROM opportunities WHERE id = $1 FOR UPDATE",
      [opportunityId],
    );

    if (result.rows.length === 0) {
      throw httpError(404, "Opportunity not found");
    }

    const opportunity = result.rows[0];

    const membership = await client.query(
      `SELECT role
       FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [opportunity.organization_id, userId],
    );

    if (membership.rows[0]?.role !== "owner") {
      throw httpError(
        403,
        "Only the organization owner can publish opportunities",
      );
    }

    if (opportunity.status !== "draft") {
      throw httpError(409, "Only draft opportunities can be published");
    }

    if (
      !opportunity.title?.trim() ||
      !opportunity.description?.trim() ||
      !opportunity.city?.trim()
    ) {
      throw httpError(
        400,
        "Title, description, and city are required before publishing",
      );
    }

    if (new Date(opportunity.starts_at) <= new Date()) {
      throw httpError(409, "Start time must be in the future to publish");
    }

    if (new Date(opportunity.ends_at) <= new Date(opportunity.starts_at)) {
      throw httpError(409, "End time must be later than start time");
    }

    const updated = await client.query(
      `UPDATE opportunities
       SET status = 'published', updated_at = NOW()
       WHERE id = $1
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
         created_at,
         updated_at`,
      [opportunityId],
    );

    await client.query("COMMIT");

    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function cancelOpportunity(opportunityId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT * FROM opportunities WHERE id = $1 FOR UPDATE",
      [opportunityId],
    );

    if (result.rows.length === 0) {
      throw httpError(404, "Opportunity not found");
    }

    const opportunity = result.rows[0];

    const membership = await client.query(
      `SELECT role
       FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [opportunity.organization_id, userId],
    );

    if (membership.rows[0]?.role !== "owner") {
      throw httpError(
        403,
        "Only the organization owner can cancel opportunities",
      );
    }

    if (!["draft", "published"].includes(opportunity.status)) {
      throw httpError(
        409,
        "Only draft or published opportunities can be cancelled",
      );
    }

    const updated = await client.query(
      `UPDATE opportunities
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
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
         created_at,
         updated_at`,
      [opportunityId],
    );

    await client.query("COMMIT");

    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function completeOpportunity(opportunityId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT * FROM opportunities WHERE id = $1 FOR UPDATE",
      [opportunityId],
    );

    if (result.rows.length === 0) {
      throw httpError(404, "Opportunity not found");
    }

    const opportunity = result.rows[0];

    const membership = await client.query(
      `SELECT role
       FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [opportunity.organization_id, userId],
    );

    if (membership.rows[0]?.role !== "owner") {
      throw httpError(
        403,
        "Only the organization owner can complete opportunities",
      );
    }

    if (opportunity.status !== "published") {
      throw httpError(409, "Only published opportunities can be completed");
    }

    if (new Date(opportunity.ends_at) > new Date()) {
      throw httpError(
        409,
        "The scheduled end time must have passed before completing",
      );
    }

    const updated = await client.query(
      `UPDATE opportunities
       SET status = 'completed', updated_at = NOW()
       WHERE id = $1
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
         created_at,
         updated_at`,
      [opportunityId],
    );

    await client.query("COMMIT");

    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteOpportunity(opportunityId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT * FROM opportunities WHERE id = $1 FOR UPDATE",
      [opportunityId],
    );

    if (result.rows.length === 0) {
      throw httpError(404, "Opportunity not found");
    }

    const opportunity = result.rows[0];

    const membership = await client.query(
      `SELECT role
       FROM organization_members
       WHERE organization_id = $1 AND user_id = $2`,
      [opportunity.organization_id, userId],
    );

    if (membership.rows[0]?.role !== "owner") {
      throw httpError(
        403,
        "Only the organization owner can delete opportunities",
      );
    }

    if (opportunity.status !== "draft") {
      throw httpError(409, "Only draft opportunities can be deleted");
    }

    const applications = await client.query(
      "SELECT 1 FROM applications WHERE opportunity_id = $1 LIMIT 1",
      [opportunityId],
    );

    if (applications.rows.length > 0) {
      throw httpError(
        409,
        "Cannot delete an opportunity that has volunteer applications",
      );
    }

    await client.query("DELETE FROM opportunities WHERE id = $1", [
      opportunityId,
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

module.exports = {
  createOpportunity,
  getOrganizationOpportunities,
  getPublicOpportunities,
  getOpportunityById,
  updateOpportunity,
  publishOpportunity,
  cancelOpportunity,
  completeOpportunity,
  deleteOpportunity,
};
