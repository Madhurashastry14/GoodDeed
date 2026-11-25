const pool = require("../config/db");

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeMessage(value) {
  if (typeof value !== "string") {
    throw httpError(400, "Offer message is required");
  }

  const trimmed = value.trim();

  if (trimmed.length < 10) {
    throw httpError(400, "Offer message must be at least 10 characters");
  }

  if (trimmed.length > 1000) {
    throw httpError(400, "Offer message must be 1000 characters or fewer");
  }

  return trimmed;
}

function optionalHandoverText(value, field, max) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw httpError(400, `${field} must be text`);
  }

  const trimmed = value.trim();

  if (trimmed.length > max) {
    throw httpError(400, `${field} must be ${max} characters or fewer`);
  }

  return trimmed || null;
}

function normalizeHandoverAt(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw httpError(400, "Handover time must be a valid date");
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw httpError(400, "Handover time must be a valid date");
  }

  return date.toISOString();
}

const OFFER_FIELDS = `id, request_id, donor_id, organization_id, message,
  status, handover_note, handover_location, handover_at, accepted_at,
  donor_confirmed_at, requester_confirmed_at, completed_at, cancelled_at,
  created_at, updated_at`;

const HANDOVER_STATE = `CASE
  WHEN o.status = 'completed' THEN 'completed'
  WHEN o.status = 'cancelled' THEN 'cancelled'
  WHEN o.status <> 'accepted' THEN 'not_started'
  WHEN o.donor_confirmed_at IS NOT NULL AND o.requester_confirmed_at IS NOT NULL
    THEN 'completed'
  WHEN o.donor_confirmed_at IS NOT NULL THEN 'donor_confirmed'
  WHEN o.requester_confirmed_at IS NOT NULL THEN 'requester_confirmed'
  ELSE 'awaiting_confirmation'
END`;

// Consistent lock order across every offer mutation: request first, offer
// second. This serializes accept/cancel/confirm races for one request.
async function lockOfferWithRequest(client, offerId) {
  const lookup = await client.query(
    `SELECT id, request_id FROM item_request_offers WHERE id = $1`,
    [offerId],
  );

  if (lookup.rows.length === 0) {
    throw httpError(404, "Fulfillment offer not found");
  }

  const requestId = lookup.rows[0].request_id;

  const requestResult = await client.query(
    `SELECT id, requester_id, title, quantity, status, verified_at
     FROM item_requests
     WHERE id = $1
     FOR UPDATE`,
    [requestId],
  );

  if (requestResult.rows.length === 0) {
    throw httpError(404, "Item request not found");
  }

  const offerResult = await client.query(
    `SELECT ${OFFER_FIELDS}
     FROM item_request_offers
     WHERE id = $1
     FOR UPDATE`,
    [offerId],
  );

  if (offerResult.rows.length === 0) {
    throw httpError(404, "Fulfillment offer not found");
  }

  return {
    request: requestResult.rows[0],
    offer: offerResult.rows[0],
  };
}

async function assertOrganizationOwner(client, organizationId, userId) {
  if (!UUID_REGEX.test(organizationId)) {
    throw httpError(400, "Valid organization ID is required");
  }

  const result = await client.query(
    `SELECT o.name
     FROM organizations o
     JOIN organization_members m
       ON m.organization_id = o.id
      AND m.user_id = $2
      AND m.role = 'owner'
     WHERE o.id = $1`,
    [organizationId, userId],
  );

  if (result.rows.length === 0) {
    throw httpError(
      403,
      "Only the organization owner can offer on behalf of the organization",
    );
  }

  return result.rows[0].name;
}

async function createOffer(requestId, donorId, payload = {}) {
  const message = normalizeMessage(payload.message);
  const organizationId =
    payload.organizationId ?? payload.organization_id ?? null;

  if (organizationId !== null && organizationId !== undefined) {
    if (typeof organizationId !== "string" || !UUID_REGEX.test(organizationId)) {
      throw httpError(400, "Valid organization ID is required");
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const requestResult = await client.query(
      `SELECT id, requester_id, title, status, verified_at
       FROM item_requests
       WHERE id = $1
       FOR UPDATE`,
      [requestId],
    );

    if (requestResult.rows.length === 0) {
      throw httpError(404, "Item request not found");
    }

    const request = requestResult.rows[0];

    if (request.requester_id === donorId) {
      throw httpError(403, "You cannot fulfill your own item request");
    }

    if (request.status !== "open" || request.verified_at === null) {
      throw httpError(
        409,
        request.status === "reserved"
          ? "This request is already reserved by another donor"
          : "Only verified, open requests can receive fulfillment offers",
      );
    }

    let organizationName = null;

    if (organizationId) {
      organizationName = await assertOrganizationOwner(
        client,
        organizationId,
        donorId,
      );
    }

    const existing = await client.query(
      `SELECT id FROM item_request_offers
       WHERE request_id = $1
         AND status = 'pending'
         AND (
           donor_id = $2
           OR ($3::uuid IS NOT NULL AND organization_id = $3::uuid)
         )`,
      [requestId, donorId, organizationId],
    );

    if (existing.rows.length > 0) {
      throw httpError(
        409,
        "You already have an active offer for this item request",
      );
    }

    const inserted = await client.query(
      `INSERT INTO item_request_offers (
         request_id, donor_id, organization_id, message, status
       )
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING ${OFFER_FIELDS}`,
      [requestId, donorId, organizationId ?? null, message],
    );

    await client.query("COMMIT");

    return {
      ...inserted.rows[0],
      organization_name: organizationName,
    };
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw httpError(
        409,
        "You already have an active offer for this item request",
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getReceivedOffers(requestId, userId) {
  const requestResult = await pool.query(
    `SELECT id, requester_id, title, quantity, status, verified_at
     FROM item_requests
     WHERE id = $1`,
    [requestId],
  );

  if (requestResult.rows.length === 0) {
    throw httpError(404, "Item request not found");
  }

  const request = requestResult.rows[0];

  if (request.requester_id !== userId) {
    throw httpError(403, "Only the requester can view offers for this request");
  }

  const offers = await pool.query(
    `SELECT
       o.id, o.request_id, o.donor_id, o.organization_id, o.message,
       o.status, o.handover_note, o.handover_location, o.handover_at,
       o.accepted_at, o.donor_confirmed_at, o.requester_confirmed_at,
       o.completed_at, o.cancelled_at, o.created_at, o.updated_at,
       donor.name AS donor_name,
       donor_profile.city AS donor_city,
       org.name AS organization_name,
       ${HANDOVER_STATE} AS handover_state
     FROM item_request_offers o
     JOIN users donor ON donor.id = o.donor_id
     LEFT JOIN profiles donor_profile ON donor_profile.user_id = o.donor_id
     LEFT JOIN organizations org ON org.id = o.organization_id
     WHERE o.request_id = $1
     ORDER BY o.created_at ASC, o.id ASC`,
    [requestId],
  );

  return {
    request: {
      id: request.id,
      title: request.title,
      quantity: request.quantity,
      status: request.status,
      pending_offer_count: offers.rows.filter((o) => o.status === "pending")
        .length,
    },
    offers: offers.rows,
  };
}

async function getMyOffers(userId) {
  const result = await pool.query(
    `SELECT
       o.id, o.request_id, o.organization_id, o.message, o.status,
       o.handover_note, o.handover_location, o.handover_at, o.accepted_at,
       o.donor_confirmed_at, o.requester_confirmed_at, o.completed_at,
       o.cancelled_at, o.created_at, o.updated_at,
       r.title AS request_title,
       r.status AS request_status,
       r.category, r.quantity, r.city AS request_city, r.urgency,
       requester.id AS requester_id,
       requester.name AS requester_name,
       requester_profile.city AS requester_city,
       org.name AS organization_name,
       (o.status = 'pending') AS can_withdraw,
       (
         o.status = 'accepted'
         AND r.status = 'reserved'
         AND o.donor_confirmed_at IS NULL
         AND o.requester_confirmed_at IS NULL
       ) AS can_cancel,
       (
         o.status = 'accepted'
         AND r.status = 'reserved'
         AND o.donor_confirmed_at IS NULL
       ) AS can_confirm,
       o.donor_confirmed_at AS my_confirmed_at,
       o.requester_confirmed_at AS other_confirmed_at,
       ${HANDOVER_STATE} AS handover_state
     FROM item_request_offers o
     JOIN item_requests r ON r.id = o.request_id
     JOIN users requester ON requester.id = r.requester_id
     LEFT JOIN profiles requester_profile
       ON requester_profile.user_id = r.requester_id
     LEFT JOIN organizations org ON org.id = o.organization_id
     WHERE o.donor_id = $1
     ORDER BY o.created_at DESC, o.id DESC`,
    [userId],
  );

  return result.rows;
}

async function acceptOffer(offerId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { request, offer } = await lockOfferWithRequest(client, offerId);

    if (request.requester_id !== userId) {
      throw httpError(403, "Only the requester can accept a fulfillment offer");
    }

    if (offer.status !== "pending") {
      throw httpError(409, "Only pending offers can be accepted");
    }

    if (request.status !== "open") {
      throw httpError(
        409,
        request.status === "reserved"
          ? "This request already has an accepted fulfillment offer"
          : "Only open requests can accept offers",
      );
    }

    const accepted = await client.query(
      `UPDATE item_request_offers
       SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${OFFER_FIELDS}`,
      [offerId],
    );

    await client.query(
      `UPDATE item_requests
       SET status = 'reserved', updated_at = NOW()
       WHERE id = $1`,
      [request.id],
    );

    await client.query("COMMIT");

    return accepted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw httpError(
        409,
        "This request already has an accepted fulfillment offer",
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

async function rejectOffer(offerId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { request, offer } = await lockOfferWithRequest(client, offerId);

    if (request.requester_id !== userId) {
      throw httpError(403, "Only the requester can reject a fulfillment offer");
    }

    if (offer.status !== "pending") {
      throw httpError(409, "Only pending offers can be rejected");
    }

    const updated = await client.query(
      `UPDATE item_request_offers
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1
       RETURNING ${OFFER_FIELDS}`,
      [offerId],
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

async function withdrawOffer(offerId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { offer } = await lockOfferWithRequest(client, offerId);

    if (offer.donor_id !== userId) {
      throw httpError(403, "You can only withdraw your own offer");
    }

    if (offer.status !== "pending") {
      throw httpError(
        409,
        "Only pending offers can be withdrawn. Use reservation cancellation for an accepted offer.",
      );
    }

    const updated = await client.query(
      `UPDATE item_request_offers
       SET status = 'withdrawn', updated_at = NOW()
       WHERE id = $1
       RETURNING ${OFFER_FIELDS}`,
      [offerId],
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

async function cancelReservation(offerId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { request, offer } = await lockOfferWithRequest(client, offerId);

    const isRequester = request.requester_id === userId;
    const isDonor = offer.donor_id === userId;

    if (!isRequester && !isDonor) {
      throw httpError(
        403,
        "Only the requester or selected donor can cancel this reservation",
      );
    }

    if (offer.status !== "accepted") {
      throw httpError(409, "Only an accepted reservation can be cancelled");
    }

    if (request.status !== "reserved") {
      throw httpError(409, "This request is not currently reserved");
    }

    if (offer.donor_confirmed_at || offer.requester_confirmed_at) {
      throw httpError(
        409,
        "Handover has already been confirmed by one party, so the reservation cannot be cancelled",
      );
    }

    const updated = await client.query(
      `UPDATE item_request_offers
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${OFFER_FIELDS}`,
      [offerId],
    );

    await client.query(
      `UPDATE item_requests
       SET status = 'open', updated_at = NOW()
       WHERE id = $1`,
      [request.id],
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

async function updateHandover(offerId, userId, payload = {}) {
  const noteValue =
    payload.handoverNote !== undefined
      ? payload.handoverNote
      : payload.handover_note;
  const locationValue =
    payload.handoverLocation !== undefined
      ? payload.handoverLocation
      : payload.handover_location;
  const atValue =
    payload.handoverAt !== undefined ? payload.handoverAt : payload.handover_at;

  const note = optionalHandoverText(noteValue, "Handover note", 1000);
  const location = optionalHandoverText(
    locationValue,
    "Handover location",
    200,
  );
  const at = normalizeHandoverAt(atValue);

  if (note === undefined && location === undefined && at === undefined) {
    throw httpError(400, "No handover details were provided");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { request, offer } = await lockOfferWithRequest(client, offerId);

    const isRequester = request.requester_id === userId;
    const isDonor = offer.donor_id === userId;

    if (!isRequester && !isDonor) {
      throw httpError(
        403,
        "Only the requester or selected donor can update handover details",
      );
    }

    if (offer.status !== "accepted" || request.status !== "reserved") {
      throw httpError(
        409,
        "Handover details can only be updated for an active reservation",
      );
    }

    const updates = [];
    const values = [];

    if (note !== undefined) {
      updates.push(`handover_note = $${values.length + 1}`);
      values.push(note);
    }

    if (location !== undefined) {
      updates.push(`handover_location = $${values.length + 1}`);
      values.push(location);
    }

    if (at !== undefined) {
      updates.push(`handover_at = $${values.length + 1}`);
      values.push(at);
    }

    values.push(offerId);

    const updated = await client.query(
      `UPDATE item_request_offers
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING ${OFFER_FIELDS}`,
      values,
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

async function confirmHandover(offerId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { request, offer } = await lockOfferWithRequest(client, offerId);

    const isRequester = request.requester_id === userId;
    const isDonor = offer.donor_id === userId;

    if (!isRequester && !isDonor) {
      throw httpError(
        403,
        "Only the requester or selected donor can confirm handover",
      );
    }

    // Repeated confirmation is idempotent and creates no new side effects.
    if (offer.status === "completed") {
      await client.query("COMMIT");
      return offer;
    }

    if (offer.status !== "accepted" || request.status !== "reserved") {
      throw httpError(
        409,
        "Only an active reservation can confirm handover",
      );
    }

    const confirmed = await client.query(
      `UPDATE item_request_offers
       SET
         donor_confirmed_at = CASE
           WHEN $2 THEN COALESCE(donor_confirmed_at, NOW())
           ELSE donor_confirmed_at
         END,
         requester_confirmed_at = CASE
           WHEN $3 THEN COALESCE(requester_confirmed_at, NOW())
           ELSE requester_confirmed_at
         END,
         updated_at = NOW()
       WHERE id = $1
       RETURNING ${OFFER_FIELDS}`,
      [offerId, isDonor, isRequester],
    );

    let updated = confirmed.rows[0];

    if (updated.donor_confirmed_at && updated.requester_confirmed_at) {
      await client.query(
        `UPDATE item_request_offers
         SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [offerId],
      );

      await client.query(
        `UPDATE item_requests
         SET status = 'fulfilled', fulfilled_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [request.id],
      );

      await client.query(
        `UPDATE item_request_offers
         SET status = 'rejected', updated_at = NOW()
         WHERE request_id = $1 AND status = 'pending'`,
        [request.id],
      );

      const completed = await client.query(
        `SELECT ${OFFER_FIELDS} FROM item_request_offers WHERE id = $1`,
        [offerId],
      );

      updated = completed.rows[0];
    }

    await client.query("COMMIT");

    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createOffer,
  getReceivedOffers,
  getMyOffers,
  acceptOffer,
  rejectOffer,
  withdrawOffer,
  cancelReservation,
  updateHandover,
  confirmHandover,
  lockOfferWithRequest,
};
