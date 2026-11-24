const pool = require("../config/db");

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeMessage(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw httpError(400, "Claim message must be text");
  }

  const trimmed = value.trim();

  if (trimmed.length > 1000) {
    throw httpError(400, "Claim message must be 1000 characters or fewer");
  }

  return trimmed || null;
}

// Every claim mutation locks the item first and then the claim to keep a
// consistent lock order and avoid deadlocks between accept/cancel/confirm.
async function lockClaimWithItem(client, claimId) {
  const lookup = await client.query(
    `SELECT id, item_id FROM item_claims WHERE id = $1`,
    [claimId],
  );

  if (lookup.rows.length === 0) {
    throw httpError(404, "Claim not found");
  }

  const itemId = lookup.rows[0].item_id;

  const itemResult = await client.query(
    `SELECT id, donor_id, title, status
     FROM items
     WHERE id = $1
     FOR UPDATE`,
    [itemId],
  );

  if (itemResult.rows.length === 0) {
    throw httpError(404, "Item not found");
  }

  const claimResult = await client.query(
    `SELECT
       id, item_id, claimant_id, message, status,
       handover_note, handover_location, handover_at,
       accepted_at, donor_confirmed_at, recipient_confirmed_at,
       completed_at, cancelled_at, created_at, updated_at
     FROM item_claims
     WHERE id = $1
     FOR UPDATE`,
    [claimId],
  );

  if (claimResult.rows.length === 0) {
    throw httpError(404, "Claim not found");
  }

  return { item: itemResult.rows[0], claim: claimResult.rows[0] };
}

async function createClaim(itemId, claimantId, payload = {}) {
  const message = normalizeMessage(payload.message);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const itemResult = await client.query(
      `SELECT id, donor_id, status
       FROM items
       WHERE id = $1
       FOR UPDATE`,
      [itemId],
    );

    if (itemResult.rows.length === 0) {
      throw httpError(404, "Item not found");
    }

    const item = itemResult.rows[0];

    if (item.donor_id === claimantId) {
      throw httpError(403, "You cannot request your own item");
    }

    if (item.status !== "available") {
      throw httpError(
        409,
        item.status === "reserved"
          ? "This item is currently reserved and cannot receive new claims"
          : "This item is no longer available",
      );
    }

    const existing = await client.query(
      `SELECT id
       FROM item_claims
       WHERE item_id = $1
         AND claimant_id = $2
         AND status IN ('pending', 'accepted')`,
      [itemId, claimantId],
    );

    if (existing.rows.length > 0) {
      throw httpError(409, "You already have an active claim for this item");
    }

    const inserted = await client.query(
      `INSERT INTO item_claims (item_id, claimant_id, message, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING
         id, item_id, claimant_id, message, status,
         accepted_at, donor_confirmed_at, recipient_confirmed_at,
         completed_at, created_at, updated_at`,
      [itemId, claimantId, message],
    );

    await client.query("COMMIT");

    return inserted.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw httpError(409, "You already have an active claim for this item");
    }

    throw error;
  } finally {
    client.release();
  }
}

async function getReceivedClaims(itemId, userId) {
  const itemResult = await pool.query(
    `SELECT id, donor_id, title, status
     FROM items
     WHERE id = $1`,
    [itemId],
  );

  if (itemResult.rows.length === 0) {
    throw httpError(404, "Item not found");
  }

  const item = itemResult.rows[0];

  if (item.donor_id !== userId) {
    throw httpError(403, "Only the listing owner can view received claims");
  }

  const claims = await pool.query(
    `SELECT
       c.id,
       c.item_id,
       c.claimant_id,
       c.message,
       c.status,
       c.handover_note,
       c.handover_location,
       c.handover_at,
       c.accepted_at,
       c.donor_confirmed_at,
       c.recipient_confirmed_at,
       c.completed_at,
       c.cancelled_at,
       c.created_at,
       c.updated_at,
       claimant.name AS claimant_name,
       claimant_profile.city AS claimant_city
     FROM item_claims c
     JOIN users claimant ON claimant.id = c.claimant_id
     LEFT JOIN profiles claimant_profile
       ON claimant_profile.user_id = c.claimant_id
     WHERE c.item_id = $1
     ORDER BY c.created_at ASC, c.id ASC`,
    [itemId],
  );

  return {
    item: {
      id: item.id,
      title: item.title,
      status: item.status,
      pending_claim_count: claims.rows.filter(
        (claim) => claim.status === "pending",
      ).length,
    },
    claims: claims.rows,
  };
}

async function getMyClaims(userId) {
  const result = await pool.query(
    `SELECT
       c.id,
       c.status,
       c.message,
       c.created_at,
       c.updated_at,
       c.accepted_at,
       c.donor_confirmed_at,
       c.recipient_confirmed_at,
       c.completed_at,
       c.cancelled_at,
       c.handover_note,
       c.handover_location,
       c.handover_at,
       i.id AS item_id,
       i.title AS item_title,
       i.image_url AS item_image_url,
       i.city AS item_city,
       i.status AS item_status,
       donor.id AS donor_id,
       donor.name AS donor_name,
       (c.status = 'pending') AS can_withdraw,
       (
         c.status = 'accepted'
         AND i.status = 'reserved'
         AND c.donor_confirmed_at IS NULL
         AND c.recipient_confirmed_at IS NULL
       ) AS can_cancel,
       (
         c.status = 'accepted'
         AND i.status = 'reserved'
         AND c.recipient_confirmed_at IS NULL
       ) AS can_confirm,
       c.recipient_confirmed_at AS my_confirmed_at,
       c.donor_confirmed_at AS other_confirmed_at
     FROM item_claims c
     JOIN items i ON i.id = c.item_id
     JOIN users donor ON donor.id = i.donor_id
     WHERE c.claimant_id = $1
     ORDER BY c.created_at DESC, c.id DESC`,
    [userId],
  );

  return result.rows;
}

async function rejectClaim(claimId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { item, claim } = await lockClaimWithItem(client, claimId);

    if (item.donor_id !== userId) {
      throw httpError(403, "Only the listing owner can reject claims");
    }

    if (claim.status !== "pending") {
      throw httpError(409, "Only pending claims can be rejected");
    }

    const updated = await client.query(
      `UPDATE item_claims
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1
       RETURNING
         id, item_id, claimant_id, message, status,
         accepted_at, donor_confirmed_at, recipient_confirmed_at,
         completed_at, created_at, updated_at`,
      [claimId],
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

async function withdrawClaim(claimId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { claim } = await lockClaimWithItem(client, claimId);

    if (claim.claimant_id !== userId) {
      throw httpError(403, "You can only withdraw your own claim");
    }

    if (claim.status !== "pending") {
      throw httpError(
        409,
        "Only pending claims can be withdrawn. Use reservation cancellation for an accepted claim.",
      );
    }

    const updated = await client.query(
      `UPDATE item_claims
       SET status = 'withdrawn', updated_at = NOW()
       WHERE id = $1
       RETURNING
         id, item_id, claimant_id, message, status,
         accepted_at, donor_confirmed_at, recipient_confirmed_at,
         completed_at, created_at, updated_at`,
      [claimId],
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

async function acceptClaim(claimId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { item, claim } = await lockClaimWithItem(client, claimId);

    if (item.donor_id !== userId) {
      throw httpError(403, "Only the listing owner can accept claims");
    }

    if (claim.status !== "pending") {
      throw httpError(409, "Only pending claims can be accepted");
    }

    if (item.status !== "available") {
      throw httpError(
        409,
        item.status === "reserved"
          ? "This item already has a selected recipient"
          : "This item is no longer available",
      );
    }

    const accepted = await client.query(
      `SELECT id FROM item_claims WHERE item_id = $1 AND status = 'accepted'`,
      [item.id],
    );

    if (accepted.rows.length > 0) {
      throw httpError(409, "This item already has a selected recipient");
    }

    const updated = await client.query(
      `UPDATE item_claims
       SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING
         id, item_id, claimant_id, message, status, accepted_at,
         handover_note, handover_location, handover_at,
         donor_confirmed_at, recipient_confirmed_at,
         completed_at, cancelled_at, created_at, updated_at`,
      [claimId],
    );

    await client.query(
      `UPDATE items SET status = 'reserved', updated_at = NOW() WHERE id = $1`,
      [item.id],
    );

    await client.query("COMMIT");

    return updated.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      throw httpError(409, "This item already has a selected recipient");
    }

    throw error;
  } finally {
    client.release();
  }
}

async function cancelReservation(claimId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { item, claim } = await lockClaimWithItem(client, claimId);

    const isDonor = item.donor_id === userId;
    const isRecipient = claim.claimant_id === userId;

    if (!isDonor && !isRecipient) {
      throw httpError(
        403,
        "Only the donor or selected recipient can cancel this reservation",
      );
    }

    if (claim.status !== "accepted") {
      throw httpError(
        409,
        "Only an accepted reservation can be cancelled",
      );
    }

    if (item.status !== "reserved") {
      throw httpError(409, "This item is not currently reserved");
    }

    if (claim.donor_confirmed_at || claim.recipient_confirmed_at) {
      throw httpError(
        409,
        "Handover has already been confirmed by one party, so the reservation cannot be cancelled",
      );
    }

    const updated = await client.query(
      `UPDATE item_claims
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING
         id, item_id, claimant_id, message, status, accepted_at,
         handover_note, handover_location, handover_at,
         donor_confirmed_at, recipient_confirmed_at,
         completed_at, cancelled_at, created_at, updated_at`,
      [claimId],
    );

    await client.query(
      `UPDATE items SET status = 'available', updated_at = NOW() WHERE id = $1`,
      [item.id],
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

async function updateHandover(claimId, userId, payload = {}) {
  const noteValue =
    payload.handoverNote !== undefined
      ? payload.handoverNote
      : payload.handover_note;
  const locationValue =
    payload.handoverLocation !== undefined
      ? payload.handoverLocation
      : payload.handover_location;
  const atValue =
    payload.handoverAt !== undefined
      ? payload.handoverAt
      : payload.handover_at;

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

    const { item, claim } = await lockClaimWithItem(client, claimId);

    const isDonor = item.donor_id === userId;
    const isRecipient = claim.claimant_id === userId;

    if (!isDonor && !isRecipient) {
      throw httpError(
        403,
        "Only the donor or selected recipient can update handover details",
      );
    }

    if (claim.status !== "accepted") {
      throw httpError(
        409,
        "Handover details can only be updated for an active reservation",
      );
    }

    if (item.status !== "reserved") {
      throw httpError(409, "This item is not currently reserved");
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

    values.push(claimId);

    const updated = await client.query(
      `UPDATE item_claims
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING
         id, item_id, claimant_id, message, status, accepted_at,
         handover_note, handover_location, handover_at,
         donor_confirmed_at, recipient_confirmed_at,
         completed_at, cancelled_at, created_at, updated_at`,
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

async function getClaimById(claimId, userId) {
  const result = await pool.query(
    `SELECT
       c.id,
       c.item_id,
       c.claimant_id,
       c.message,
       c.status,
       c.handover_note,
       c.handover_location,
       c.handover_at,
       c.accepted_at,
       c.donor_confirmed_at,
       c.recipient_confirmed_at,
       c.completed_at,
       c.cancelled_at,
       c.created_at,
       c.updated_at,
       i.donor_id,
       i.title AS item_title,
       i.image_url AS item_image_url,
       i.city AS item_city,
       i.status AS item_status,
       donor.name AS donor_name,
       claimant.name AS claimant_name,
       claimant_profile.city AS claimant_city
     FROM item_claims c
     JOIN items i ON i.id = c.item_id
     JOIN users donor ON donor.id = i.donor_id
     JOIN users claimant ON claimant.id = c.claimant_id
     LEFT JOIN profiles claimant_profile
       ON claimant_profile.user_id = c.claimant_id
     WHERE c.id = $1`,
    [claimId],
  );

  if (result.rows.length === 0) {
    throw httpError(404, "Claim not found");
  }

  const claim = result.rows[0];

  if (claim.donor_id !== userId && claim.claimant_id !== userId) {
    throw httpError(403, "You are not a participant in this claim");
  }

  return {
    ...claim,
    my_role: claim.donor_id === userId ? "donor" : "recipient",
    my_confirmed_at:
      claim.donor_id === userId
        ? claim.donor_confirmed_at
        : claim.recipient_confirmed_at,
    other_confirmed_at:
      claim.donor_id === userId
        ? claim.recipient_confirmed_at
        : claim.donor_confirmed_at,
  };
}

async function confirmHandover(claimId, userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { item, claim } = await lockClaimWithItem(client, claimId);

    const isDonor = item.donor_id === userId;
    const isRecipient = claim.claimant_id === userId;

    if (!isDonor && !isRecipient) {
      throw httpError(
        403,
        "Only the donor or selected recipient can confirm handover",
      );
    }

    // Repeated confirmation is idempotent and creates no new side effects.
    if (claim.status === "completed") {
      await client.query("COMMIT");
      return claim;
    }

    if (claim.status !== "accepted") {
      throw httpError(409, "Only an accepted claim can confirm handover");
    }

    if (item.status !== "reserved") {
      throw httpError(409, "This item is not currently reserved");
    }

    const confirmed = await client.query(
      `UPDATE item_claims
       SET
         donor_confirmed_at = CASE
           WHEN $2 THEN COALESCE(donor_confirmed_at, NOW())
           ELSE donor_confirmed_at
         END,
         recipient_confirmed_at = CASE
           WHEN $3 THEN COALESCE(recipient_confirmed_at, NOW())
           ELSE recipient_confirmed_at
         END,
         updated_at = NOW()
       WHERE id = $1
       RETURNING
         id, item_id, claimant_id, message, status, accepted_at,
         handover_note, handover_location, handover_at,
         donor_confirmed_at, recipient_confirmed_at,
         completed_at, cancelled_at, created_at, updated_at`,
      [claimId, isDonor, isRecipient],
    );

    let updated = confirmed.rows[0];

    if (updated.donor_confirmed_at && updated.recipient_confirmed_at) {
      await client.query(
        `UPDATE item_claims
         SET status = 'completed', completed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [claimId],
      );

      await client.query(
        `UPDATE items SET status = 'donated', updated_at = NOW() WHERE id = $1`,
        [item.id],
      );

      await client.query(
        `UPDATE item_claims
         SET status = 'rejected', updated_at = NOW()
         WHERE item_id = $1 AND status = 'pending'`,
        [item.id],
      );

      const completed = await client.query(
        `SELECT
           id, item_id, claimant_id, message, status, accepted_at,
           handover_note, handover_location, handover_at,
           donor_confirmed_at, recipient_confirmed_at,
           completed_at, cancelled_at, created_at, updated_at
         FROM item_claims
         WHERE id = $1`,
        [claimId],
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
  createClaim,
  getReceivedClaims,
  getMyClaims,
  rejectClaim,
  withdrawClaim,
  acceptClaim,
  cancelReservation,
  updateHandover,
  getClaimById,
  confirmHandover,
  lockClaimWithItem,
};
