const pool = require("../config/db");

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getMembershipRole(client, organizationId, userId) {
  const result = await client.query(
    `SELECT role
     FROM organization_members
     WHERE organization_id = $1 AND user_id = $2`,
    [organizationId, userId],
  );

  return result.rows[0]?.role ?? null;
}

async function createApplication(opportunityId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const opportunityResult = await client.query(
      `SELECT id, organization_id, status, starts_at, capacity
       FROM opportunities
       WHERE id = $1
       FOR UPDATE`,
      [opportunityId],
    );

    if (opportunityResult.rows.length === 0) {
      throw httpError(404, "Opportunity not found");
    }

    const opportunity = opportunityResult.rows[0];

    if (opportunity.status !== "published") {
      throw httpError(
        409,
        "Applications are only open for published opportunities",
      );
    }

    if (new Date(opportunity.starts_at) <= new Date()) {
      throw httpError(
        409,
        "Applications are closed because the opportunity has started",
      );
    }

    const role = await getMembershipRole(
      client,
      opportunity.organization_id,
      userId,
    );

    if (role === "owner") {
      throw httpError(
        403,
        "Organization owners cannot apply to their own opportunities",
      );
    }

    const existing = await client.query(
      `SELECT id
       FROM applications
       WHERE opportunity_id = $1 AND user_id = $2`,
      [opportunityId, userId],
    );

    if (existing.rows.length > 0) {
      throw httpError(409, "You have already applied to this opportunity");
    }

    if (opportunity.capacity !== null) {
      const accepted = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM applications
         WHERE opportunity_id = $1 AND status = 'accepted'`,
        [opportunityId],
      );

      if (accepted.rows[0].count >= opportunity.capacity) {
        throw httpError(409, "This opportunity is full");
      }
    }

    const inserted = await client.query(
      `INSERT INTO applications (opportunity_id, user_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, opportunity_id, user_id, status, applied_at, updated_at`,
      [opportunityId, userId],
    );

    await client.query("COMMIT");

    return inserted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw httpError(409, "You have already applied to this opportunity");
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getMyApplications(userId) {
  const result = await pool.query(
    `SELECT
       a.id,
       a.status,
       a.applied_at,
       a.updated_at,
       o.id AS opportunity_id,
       o.title AS opportunity_title,
       o.city,
       o.starts_at,
       o.ends_at,
       o.status AS opportunity_status,
       (a.status IN ('pending', 'accepted') AND o.starts_at > NOW())
         AS can_withdraw,
       org.id AS organization_id,
       org.name AS organization_name
     FROM applications a
     JOIN opportunities o ON o.id = a.opportunity_id
     JOIN organizations org ON org.id = o.organization_id
     WHERE a.user_id = $1
     ORDER BY a.applied_at DESC`,
    [userId],
  );

  return result.rows;
}

async function getOpportunityApplications(opportunityId, userId) {
  const client = await pool.connect();

  try {
    const opportunityResult = await client.query(
      `SELECT
         o.id,
         o.organization_id,
         o.title,
         o.status,
         o.capacity,
         o.starts_at,
         o.ends_at,
         org.name AS organization_name,
         COALESCE(
           (
             SELECT COUNT(*)::int
             FROM applications a
             WHERE a.opportunity_id = o.id AND a.status = 'accepted'
           ),
           0
         ) AS accepted_count
       FROM opportunities o
       JOIN organizations org ON org.id = o.organization_id
       WHERE o.id = $1`,
      [opportunityId],
    );

    if (opportunityResult.rows.length === 0) {
      throw httpError(404, "Opportunity not found");
    }

    const opportunity = opportunityResult.rows[0];
    const role = await getMembershipRole(
      client,
      opportunity.organization_id,
      userId,
    );

    if (role !== "owner") {
      throw httpError(
        403,
        "Only the organization owner can view applicants",
      );
    }

    const applications = await client.query(
      `SELECT
         a.id,
         a.status,
         a.applied_at,
         a.updated_at,
         u.id AS user_id,
         u.name AS applicant_name
       FROM applications a
       JOIN users u ON u.id = a.user_id
       WHERE a.opportunity_id = $1
       ORDER BY a.applied_at ASC`,
      [opportunityId],
    );

    const remaining =
      opportunity.capacity === null
        ? null
        : Math.max(opportunity.capacity - opportunity.accepted_count, 0);

    return {
      opportunity: {
        ...opportunity,
        remaining_capacity: remaining,
      },
      applications: applications.rows,
    };
  } finally {
    client.release();
  }
}

async function acceptApplication(applicationId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const applicationResult = await client.query(
      `SELECT id, opportunity_id, user_id, status
       FROM applications
       WHERE id = $1`,
      [applicationId],
    );

    if (applicationResult.rows.length === 0) {
      throw httpError(404, "Application not found");
    }

    const application = applicationResult.rows[0];

    const opportunityResult = await client.query(
      `SELECT id, organization_id, status, capacity
       FROM opportunities
       WHERE id = $1
       FOR UPDATE`,
      [application.opportunity_id],
    );

    const opportunity = opportunityResult.rows[0];

    const role = await getMembershipRole(
      client,
      opportunity.organization_id,
      userId,
    );

    if (role !== "owner") {
      throw httpError(
        403,
        "Only the organization owner can accept applicants",
      );
    }

    if (application.status !== "pending") {
      throw httpError(
        409,
        "Only pending applications can be accepted",
      );
    }

    if (opportunity.status !== "published") {
      throw httpError(
        409,
        "Applicants can only be accepted for published opportunities",
      );
    }

    if (opportunity.capacity !== null) {
      const accepted = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM applications
         WHERE opportunity_id = $1 AND status = 'accepted'`,
        [application.opportunity_id],
      );

      if (accepted.rows[0].count >= opportunity.capacity) {
        throw httpError(409, "This opportunity is full");
      }
    }

    const updated = await client.query(
      `UPDATE applications
       SET status = 'accepted', updated_at = NOW()
       WHERE id = $1
       RETURNING id, opportunity_id, user_id, status, applied_at, updated_at`,
      [applicationId],
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

async function rejectApplication(applicationId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const applicationResult = await client.query(
      `SELECT a.id, a.opportunity_id, a.status, o.organization_id
       FROM applications a
       JOIN opportunities o ON o.id = a.opportunity_id
       WHERE a.id = $1`,
      [applicationId],
    );

    if (applicationResult.rows.length === 0) {
      throw httpError(404, "Application not found");
    }

    const application = applicationResult.rows[0];

    const role = await getMembershipRole(
      client,
      application.organization_id,
      userId,
    );

    if (role !== "owner") {
      throw httpError(
        403,
        "Only the organization owner can reject applicants",
      );
    }

    if (application.status !== "pending") {
      throw httpError(
        409,
        "Only pending applications can be rejected",
      );
    }

    const updated = await client.query(
      `UPDATE applications
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1
       RETURNING id, opportunity_id, user_id, status, applied_at, updated_at`,
      [applicationId],
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

async function withdrawApplication(applicationId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const applicationResult = await client.query(
      `SELECT a.id, a.user_id, a.status, o.starts_at
       FROM applications a
       JOIN opportunities o ON o.id = a.opportunity_id
       WHERE a.id = $1`,
      [applicationId],
    );

    if (applicationResult.rows.length === 0) {
      throw httpError(404, "Application not found");
    }

    const application = applicationResult.rows[0];

    if (application.user_id !== userId) {
      throw httpError(
        403,
        "You can only withdraw your own application",
      );
    }

    if (!["pending", "accepted"].includes(application.status)) {
      throw httpError(
        409,
        "Only pending or accepted applications can be withdrawn",
      );
    }

    if (new Date(application.starts_at) <= new Date()) {
      throw httpError(
        409,
        "Applications cannot be withdrawn after the opportunity has started",
      );
    }

    const updated = await client.query(
      `UPDATE applications
       SET status = 'withdrawn', updated_at = NOW()
       WHERE id = $1
       RETURNING id, opportunity_id, user_id, status, applied_at, updated_at`,
      [applicationId],
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

module.exports = {
  createApplication,
  getMyApplications,
  getOpportunityApplications,
  acceptApplication,
  rejectApplication,
  withdrawApplication,
};
