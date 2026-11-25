const pool = require("../config/db");
const reviewerService = require("./reviewerService");
const itemRequestService = require("./itemRequestService");

const DECISIONS = {
  approve: "approved",
  reject: "rejected",
  "request-changes": "changes_requested",
};

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeNotes(value, { required }) {
  if (value === undefined || value === null) {
    if (required) {
      throw httpError(400, "Review notes are required for this decision");
    }

    return null;
  }

  if (typeof value !== "string") {
    throw httpError(400, "Review notes must be text");
  }

  const trimmed = value.trim();

  if (required && trimmed.length < 10) {
    throw httpError(
      400,
      "Review notes must be at least 10 characters for this decision",
    );
  }

  if (trimmed.length > 3000) {
    throw httpError(400, "Review notes must be 3000 characters or fewer");
  }

  return trimmed || null;
}

async function getReviewerAccess(userId) {
  return { is_reviewer: await reviewerService.isReviewer(userId) };
}

async function getPendingQueue(filters = {}) {
  const page = Math.max(Number.parseInt(filters.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(filters.limit, 10) || 20, 1),
    50,
  );
  const offset = (page - 1) * limit;

  const count = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM item_requests
     WHERE status = 'pending_verification'`,
  );

  const result = await pool.query(
    `SELECT
       r.id, r.title, r.description, r.category, r.quantity, r.city,
       r.urgency, r.status, r.submitted_at, r.created_at,
       u.name AS requester_name,
       u.id AS requester_id
     FROM item_requests r
     JOIN users u ON u.id = r.requester_id
     WHERE r.status = 'pending_verification'
     ORDER BY r.submitted_at ASC, r.id ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  const total = count.rows[0].total;

  return {
    requests: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

async function getReviewDetail(requestId, reviewerId) {
  const detail = await itemRequestService.getItemRequestDetail(
    requestId,
    reviewerId,
  );

  const isReviewer = await reviewerService.isReviewer(reviewerId);
  const isOwnRequest = detail.request.requester_id === reviewerId;

  detail.permissions.can_review =
    isReviewer && !isOwnRequest && detail.request.status === "pending_verification";
  detail.permissions.is_own_request = isOwnRequest;

  return detail;
}

async function reviewRequest(requestId, reviewerId, action, payload = {}) {
  const decision = DECISIONS[action];

  if (!decision) {
    throw httpError(400, "Unknown review decision");
  }

  const notes = normalizeNotes(
    payload.reviewNotes ?? payload.review_notes,
    { required: decision !== "approved" },
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // The request row is the single serialization point for reviews. Two
    // reviewers racing on the same request cannot both see pending status.
    const locked = await client.query(
      `SELECT id, requester_id, status
       FROM item_requests
       WHERE id = $1
       FOR UPDATE`,
      [requestId],
    );

    if (locked.rows.length === 0) {
      throw httpError(404, "Item request not found");
    }

    const request = locked.rows[0];

    if (request.requester_id === reviewerId) {
      throw httpError(403, "Reviewers cannot review their own item requests");
    }

    if (request.status !== "pending_verification") {
      throw httpError(
        409,
        "This item request is no longer awaiting verification",
      );
    }

    const review = await client.query(
      `INSERT INTO item_request_reviews (
         request_id, reviewer_id, decision, review_notes
       )
       VALUES ($1, $2, $3, $4)
       RETURNING id, request_id, reviewer_id, decision, review_notes, created_at`,
      [requestId, reviewerId, decision, notes],
    );

    const statusByDecision = {
      approved: "open",
      rejected: "rejected",
      changes_requested: "changes_requested",
    };

    const updated = await client.query(
      `UPDATE item_requests
       SET status = $2::text,
           verified_at = CASE WHEN $2::text = 'open' THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING
         id, requester_id, title, description, category, quantity, city,
         reason, urgency, status, submitted_at, verified_at, fulfilled_at,
         created_at, updated_at`,
      [requestId, statusByDecision[decision]],
    );

    await client.query("COMMIT");

    return { review: review.rows[0], request: updated.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getReviewerAccess,
  getPendingQueue,
  getReviewDetail,
  reviewRequest,
};
