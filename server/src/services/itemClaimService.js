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

module.exports = {
  createClaim,
  getReceivedClaims,
  getMyClaims,
  rejectClaim,
  withdrawClaim,
  lockClaimWithItem,
};
