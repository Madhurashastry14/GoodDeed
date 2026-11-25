const pool = require("../config/db");
const reviewerService = require("./reviewerService");

const CATEGORIES = [
  "food",
  "clothing",
  "household",
  "hygiene",
  "school_supplies",
  "baby_care",
  "other",
];

const URGENCIES = ["low", "normal", "high"];

const SORTS = ["newest", "oldest"];

const EDITABLE_STATUSES = ["draft", "changes_requested", "open"];

const CANCELLABLE_STATUSES = [
  "draft",
  "pending_verification",
  "changes_requested",
  "open",
];

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requiredText(value, field, { min = 1, max = 255 } = {}) {
  if (typeof value !== "string") {
    throw httpError(400, `${field} is required`);
  }

  const trimmed = value.trim();

  if (trimmed.length < min) {
    throw httpError(400, `${field} must be at least ${min} characters`);
  }

  if (trimmed.length > max) {
    throw httpError(400, `${field} must be ${max} characters or fewer`);
  }

  return trimmed;
}

function validateCategory(value) {
  const category = requiredText(value, "Category", { max: 50 }).toLowerCase();

  if (!CATEGORIES.includes(category)) {
    throw httpError(400, "Choose a valid category");
  }

  return category;
}

function validateUrgency(value) {
  const urgency = requiredText(value, "Urgency", { max: 20 }).toLowerCase();

  if (!URGENCIES.includes(urgency)) {
    throw httpError(400, "Choose a valid urgency");
  }

  return urgency;
}

function validateQuantity(value) {
  const quantity =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw httpError(400, "Quantity must be a positive whole number");
  }

  if (quantity > 1000) {
    throw httpError(400, "Quantity must be 1000 or fewer");
  }

  return quantity;
}

function validateRequestPayload(payload = {}) {
  return {
    title: requiredText(payload.title, "Title", { min: 3, max: 200 }),
    description: requiredText(payload.description, "Description", {
      min: 10,
      max: 5000,
    }),
    category: validateCategory(payload.category),
    quantity: validateQuantity(payload.quantity),
    city: requiredText(payload.city, "City", { max: 100 }),
    reason: requiredText(payload.reason, "Reason", { min: 10, max: 3000 }),
    urgency: validateUrgency(payload.urgency ?? "normal"),
  };
}

function validateFilters(filters = {}) {
  const page = Number.parseInt(filters.page, 10);
  const limit = Number.parseInt(filters.limit, 10);
  const sort = filters.sort ? String(filters.sort).toLowerCase() : "newest";

  if (filters.sort && !SORTS.includes(sort)) {
    throw httpError(400, "Sort must be newest or oldest");
  }

  return {
    search:
      filters.search === undefined || filters.search === null
        ? null
        : requiredText(filters.search, "Search", { max: 100 }),
    city:
      filters.city === undefined || filters.city === null || filters.city === ""
        ? null
        : requiredText(filters.city, "City", { max: 100 }),
    category:
      filters.category === undefined ||
      filters.category === null ||
      filters.category === ""
        ? null
        : validateCategory(filters.category),
    urgency:
      filters.urgency === undefined ||
      filters.urgency === null ||
      filters.urgency === ""
        ? null
        : validateUrgency(filters.urgency),
    sort,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit:
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 12,
  };
}

const REQUEST_FIELDS = `id, requester_id, title, description, category, quantity,
  city, reason, urgency, status, submitted_at, verified_at,
  fulfilled_at, created_at, updated_at`;

const REQUEST_COLUMNS = REQUEST_FIELDS.replace(/\s+/g, " ")
  .split(",")
  .map((column) => `r.${column.trim()}`)
  .join(", ");

async function lockRequest(client, requestId) {
  const result = await client.query(
    `SELECT ${REQUEST_COLUMNS}
     FROM item_requests r
     WHERE r.id = $1
     FOR UPDATE`,
    [requestId],
  );

  if (result.rows.length === 0) {
    throw httpError(404, "Item request not found");
  }

  return result.rows[0];
}

function assertOwner(request, userId) {
  if (request.requester_id !== userId) {
    throw httpError(403, "You can only manage your own item requests");
  }
}

async function createItemRequest(requesterId, payload) {
  const request = validateRequestPayload(payload);

  const result = await pool.query(
    `INSERT INTO item_requests (
       requester_id, title, description, category, quantity, city,
       reason, urgency, status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
     RETURNING ${REQUEST_FIELDS}`,
    [
      requesterId,
      request.title,
      request.description,
      request.category,
      request.quantity,
      request.city,
      request.reason,
      request.urgency,
    ],
  );

  return result.rows[0];
}

async function getPublicItemRequests(rawFilters = {}) {
  const filters = validateFilters(rawFilters);
  const values = [];
  const conditions = ["r.status = 'open'", "r.verified_at IS NOT NULL"];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(
      `(r.title ILIKE $${values.length} OR r.description ILIKE $${values.length})`,
    );
  }

  if (filters.category) {
    values.push(filters.category);
    conditions.push(`r.category = $${values.length}`);
  }

  if (filters.city) {
    values.push(`%${filters.city}%`);
    conditions.push(`r.city ILIKE $${values.length}`);
  }

  if (filters.urgency) {
    values.push(filters.urgency);
    conditions.push(`r.urgency = $${values.length}`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const count = await pool.query(
    `SELECT COUNT(*)::int AS total FROM item_requests r ${where}`,
    values,
  );

  const offset = (filters.page - 1) * filters.limit;
  const direction = filters.sort === "oldest" ? "ASC" : "DESC";

  const rows = await pool.query(
    `SELECT
       r.id, r.title, r.description, r.category, r.quantity, r.city,
       r.urgency, r.status, r.verified_at, r.created_at,
       u.name AS requester_name
     FROM item_requests r
     JOIN users u ON u.id = r.requester_id
     ${where}
     ORDER BY r.created_at ${direction}, r.id ${direction}
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, filters.limit, offset],
  );

  const total = count.rows[0].total;

  return {
    requests: rows.rows,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / filters.limit),
    },
  };
}

async function getLatestReview(requestId) {
  const result = await pool.query(
    `SELECT
       rev.id, rev.decision, rev.review_notes, rev.created_at,
       reviewer.name AS reviewer_name
     FROM item_request_reviews rev
     JOIN users reviewer ON reviewer.id = rev.reviewer_id
     WHERE rev.request_id = $1
     ORDER BY rev.created_at DESC, rev.id DESC
     LIMIT 1`,
    [requestId],
  );

  return result.rows[0] ?? null;
}

async function getOffersForRequest(requestId, viewerId, isRequester, isReviewer) {
  const result = await pool.query(
    `SELECT
       o.id, o.request_id, o.donor_id, o.organization_id, o.message, o.status,
       o.handover_note, o.handover_location, o.handover_at,
       o.accepted_at, o.donor_confirmed_at, o.requester_confirmed_at,
       o.completed_at, o.cancelled_at, o.created_at, o.updated_at,
       donor.name AS donor_name,
       donor_profile.city AS donor_city,
       org.name AS organization_name
     FROM item_request_offers o
     JOIN users donor ON donor.id = o.donor_id
     LEFT JOIN profiles donor_profile ON donor_profile.user_id = o.donor_id
     LEFT JOIN organizations org ON org.id = o.organization_id
     WHERE o.request_id = $1
     ORDER BY o.created_at ASC, o.id ASC`,
    [requestId],
  );

  // Handover coordination is only meaningful to the two parties of the
  // accepted/completed offer. Everyone else sees the offer without it.
  return result.rows.map((offer) => {
    const isOfferDonor = offer.donor_id === viewerId;
    const canSeeHandover =
      ["accepted", "completed"].includes(offer.status) &&
      (isRequester || isOfferDonor);

    if (canSeeHandover) {
      return offer;
    }

    return {
      ...offer,
      handover_note: null,
      handover_location: null,
      handover_at: null,
    };
  });
}

async function getItemRequestDetail(requestId, viewerId = null) {
  const result = await pool.query(
    `SELECT
       ${REQUEST_COLUMNS},
       u.name AS requester_name
     FROM item_requests r
     JOIN users u ON u.id = r.requester_id
     WHERE r.id = $1`,
    [requestId],
  );

  if (result.rows.length === 0) {
    throw httpError(404, "Item request not found");
  }

  const raw = result.rows[0];
  const isRequester = Boolean(viewerId) && raw.requester_id === viewerId;
  const isReviewer = viewerId
    ? await reviewerService.isReviewer(viewerId)
    : false;

  const activeOffer = await pool.query(
    `SELECT id, donor_id, organization_id, status
     FROM item_request_offers
     WHERE request_id = $1 AND status IN ('accepted', 'pending')
     ORDER BY CASE WHEN status = 'accepted' THEN 0 ELSE 1 END, created_at ASC`,
    [requestId],
  );

  const isParticipant = activeOffer.rows.some(
    (offer) => offer.donor_id === viewerId,
  );

  const isPubliclyVisible =
    raw.status === "open" && raw.verified_at !== null;

  if (!isPubliclyVisible && !isRequester && !isReviewer && !isParticipant) {
    throw httpError(404, "Item request not found");
  }

  const request = {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    quantity: raw.quantity,
    city: raw.city,
    urgency: raw.urgency,
    status: raw.status,
    submitted_at: raw.submitted_at,
    verified_at: raw.verified_at,
    fulfilled_at: raw.fulfilled_at,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    is_verified: raw.verified_at !== null,
    requester_id: raw.requester_id,
    requester_name: raw.requester_name,
  };

  // The reason for requesting is never public. Only the requester and
  // authorized reviewers can read it.
  if (isRequester || isReviewer) {
    request.reason = raw.reason;
  }

  const myOffers = viewerId
    ? await pool.query(
        `SELECT
           id, status, message, organization_id, accepted_at,
           donor_confirmed_at, requester_confirmed_at, completed_at,
           cancelled_at, handover_note, handover_location, handover_at,
           created_at, updated_at
         FROM item_request_offers
         WHERE request_id = $1 AND donor_id = $2
         ORDER BY created_at DESC, id DESC`,
        [requestId, viewerId],
      )
    : { rows: [] };

  const myActiveOffer = myOffers.rows.find((offer) =>
    ["pending", "accepted"].includes(offer.status),
  );

  const detail = {
    request,
    viewer: {
      is_requester: isRequester,
      is_reviewer: isReviewer,
      is_participant: isParticipant,
    },
    permissions: {
      can_edit:
        isRequester &&
        EDITABLE_STATUSES.includes(raw.status) &&
        !activeOffer.rows.some((offer) => offer.status === "accepted"),
      can_submit: isRequester && raw.status === "draft",
      can_reopen_changes:
        isRequester && raw.status === "changes_requested",
      can_cancel:
        isRequester && CANCELLABLE_STATUSES.includes(raw.status),
      can_offer:
        Boolean(viewerId) &&
        !isRequester &&
        raw.status === "open" &&
        raw.verified_at !== null &&
        !myActiveOffer,
      has_active_offer: Boolean(myActiveOffer),
    },
  };

  if (viewerId) {
    detail.my_offers = myOffers.rows;
  }

  if (isRequester || isReviewer) {
    detail.offers = await getOffersForRequest(
      requestId,
      viewerId,
      isRequester,
      isReviewer,
    );
    detail.review_history = (
      await pool.query(
        `SELECT
           rev.id, rev.decision, rev.review_notes, rev.created_at,
           reviewer.name AS reviewer_name
         FROM item_request_reviews rev
         JOIN users reviewer ON reviewer.id = rev.reviewer_id
         WHERE rev.request_id = $1
         ORDER BY rev.created_at DESC, rev.id DESC`,
        [requestId],
      )
    ).rows;
  } else if (isParticipant) {
    detail.review_history = [];
  }

  // Review feedback is only shared with the requester (and reviewers).
  if (isRequester) {
    const latest = await getLatestReview(requestId);
    detail.feedback =
      latest && ["rejected", "changes_requested"].includes(latest.decision)
        ? latest
        : null;
  }

  return detail;
}

async function getMyItemRequests(userId) {
  const result = await pool.query(
    `SELECT
       r.id, r.title, r.description, r.category, r.quantity, r.city,
       r.urgency, r.status, r.submitted_at, r.verified_at, r.fulfilled_at,
       r.created_at, r.updated_at,
       COALESCE(stats.offer_count, 0)::int AS offer_count,
       COALESCE(stats.pending_offer_count, 0)::int AS pending_offer_count,
       accepted.id AS accepted_offer_id,
       accepted.donor_name AS selected_donor_name,
       accepted.organization_name AS selected_organization_name,
       accepted.handover_state,
       latest.decision AS latest_review_decision,
       latest.review_notes AS latest_review_notes,
       latest.created_at AS latest_review_at
     FROM item_requests r
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) AS offer_count,
         COUNT(*) FILTER (WHERE o.status = 'pending') AS pending_offer_count
       FROM item_request_offers o
       WHERE o.request_id = r.id
     ) stats ON TRUE
     LEFT JOIN LATERAL (
       SELECT
         o.id,
         donor.name AS donor_name,
         org.name AS organization_name,
         CASE
           WHEN o.status = 'completed' THEN 'completed'
           WHEN o.donor_confirmed_at IS NOT NULL
             AND o.requester_confirmed_at IS NOT NULL THEN 'completed'
           WHEN o.donor_confirmed_at IS NOT NULL THEN 'donor_confirmed'
           WHEN o.requester_confirmed_at IS NOT NULL THEN 'requester_confirmed'
           ELSE 'awaiting_confirmation'
         END AS handover_state
       FROM item_request_offers o
       JOIN users donor ON donor.id = o.donor_id
       LEFT JOIN organizations org ON org.id = o.organization_id
       WHERE o.request_id = r.id AND o.status IN ('accepted', 'completed')
       ORDER BY o.updated_at DESC
       LIMIT 1
     ) accepted ON TRUE
     LEFT JOIN LATERAL (
       SELECT rev.decision, rev.review_notes, rev.created_at
       FROM item_request_reviews rev
       WHERE rev.request_id = r.id
       ORDER BY rev.created_at DESC, rev.id DESC
       LIMIT 1
     ) latest ON TRUE
     WHERE r.requester_id = $1
     ORDER BY r.created_at DESC, r.id DESC`,
    [userId],
  );

  return result.rows;
}

async function updateItemRequest(requestId, userId, payload = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const current = await lockRequest(client, requestId);
    assertOwner(current, userId);

    if (!EDITABLE_STATUSES.includes(current.status)) {
      throw httpError(
        409,
        "Only draft, changes requested, or open requests can be edited",
      );
    }

    if (current.status === "open") {
      const accepted = await client.query(
        `SELECT 1 FROM item_request_offers
         WHERE request_id = $1 AND status = 'accepted'`,
        [requestId],
      );

      if (accepted.rows.length > 0) {
        throw httpError(
          409,
          "This request has an accepted fulfillment offer and cannot be edited",
        );
      }
    }

    const merged = validateRequestPayload({
      title: payload.title ?? current.title,
      description: payload.description ?? current.description,
      category: payload.category ?? current.category,
      quantity: payload.quantity ?? current.quantity,
      city: payload.city ?? current.city,
      reason: payload.reason ?? current.reason,
      urgency: payload.urgency ?? current.urgency,
    });

    // An approved request that changes must leave public discovery and be
    // verified again. Draft/change-requested edits stay in draft.
    const nextStatus = current.status === "open" ? "pending_verification" : "draft";
    const resubmitted = nextStatus === "pending_verification";

    const updated = await client.query(
      `UPDATE item_requests
       SET title = $2,
           description = $3,
           category = $4,
           quantity = $5,
           city = $6,
           reason = $7,
           urgency = $8,
           status = $9,
           verified_at = CASE WHEN $10 THEN NULL ELSE verified_at END,
           submitted_at = CASE WHEN $10 THEN NOW() ELSE submitted_at END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${REQUEST_FIELDS}`,
      [
        requestId,
        merged.title,
        merged.description,
        merged.category,
        merged.quantity,
        merged.city,
        merged.reason,
        merged.urgency,
        nextStatus,
        resubmitted,
      ],
    );

    await client.query("COMMIT");

    return { request: updated.rows[0], reverification_required: resubmitted };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function submitItemRequest(requestId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const current = await lockRequest(client, requestId);
    assertOwner(current, userId);

    if (current.status !== "draft") {
      throw httpError(
        409,
        "Only draft requests can be submitted for verification",
      );
    }

    // Validate the stored values so a request can never reach the review
    // queue with incomplete data.
    validateRequestPayload(current);

    const updated = await client.query(
      `UPDATE item_requests
       SET status = 'pending_verification',
           submitted_at = NOW(),
           verified_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${REQUEST_FIELDS}`,
      [requestId],
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

async function reopenItemRequest(requestId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const current = await lockRequest(client, requestId);
    assertOwner(current, userId);

    if (current.status !== "changes_requested") {
      throw httpError(
        409,
        "Only requests with changes requested can be reopened for editing",
      );
    }

    const updated = await client.query(
      `UPDATE item_requests
       SET status = 'draft', updated_at = NOW()
       WHERE id = $1
       RETURNING ${REQUEST_FIELDS}`,
      [requestId],
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

async function cancelItemRequest(requestId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const current = await lockRequest(client, requestId);
    assertOwner(current, userId);

    if (current.status === "reserved") {
      throw httpError(
        409,
        "Cancel the accepted fulfillment reservation before cancelling this request",
      );
    }

    if (!CANCELLABLE_STATUSES.includes(current.status)) {
      throw httpError(
        409,
        `A ${current.status.replace("_", " ")} request can no longer be cancelled`,
      );
    }

    await client.query(
      `UPDATE item_request_offers
       SET status = 'rejected', updated_at = NOW()
       WHERE request_id = $1 AND status = 'pending'`,
      [requestId],
    );

    const updated = await client.query(
      `UPDATE item_requests
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING ${REQUEST_FIELDS}`,
      [requestId],
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
  CATEGORIES,
  URGENCIES,
  createItemRequest,
  getPublicItemRequests,
  getItemRequestDetail,
  getMyItemRequests,
  updateItemRequest,
  submitItemRequest,
  reopenItemRequest,
  cancelItemRequest,
  validateRequestPayload,
  httpError,
};
