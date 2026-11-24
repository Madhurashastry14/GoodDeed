const pool = require("../config/db");

const CATEGORIES = [
  "furniture",
  "electronics",
  "clothing",
  "books",
  "household",
  "sports",
  "toys",
  "other",
];

const CONDITIONS = ["new", "like_new", "good", "fair"];

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

function optionalText(value, field, max) {
  if (value === undefined || value === null) {
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

function validateCategory(value) {
  const category = requiredText(value, "Category", { max: 50 }).toLowerCase();

  if (!CATEGORIES.includes(category)) {
    throw httpError(400, "Choose a valid category");
  }

  return category;
}

function validateCondition(value) {
  const condition = requiredText(value, "Condition", { max: 30 }).toLowerCase();

  if (!CONDITIONS.includes(condition)) {
    throw httpError(400, "Choose a valid condition");
  }

  return condition;
}

function validateImageUrl(value) {
  const imageUrl = optionalText(value, "Image URL", 2000);

  if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
    throw httpError(400, "Image URL must start with http:// or https://");
  }

  return imageUrl;
}

function validateItemPayload(payload = {}) {
  return {
    title: requiredText(payload.title, "Title", { min: 3, max: 200 }),
    description: requiredText(payload.description, "Description", {
      min: 10,
      max: 5000,
    }),
    category: validateCategory(payload.category),
    condition: validateCondition(payload.condition),
    city: requiredText(payload.city, "City", { max: 100 }),
    imageUrl: validateImageUrl(payload.imageUrl ?? payload.image_url),
  };
}

async function createItem(donorId, payload) {
  const item = validateItemPayload(payload);

  const result = await pool.query(
    `INSERT INTO items (
       donor_id, title, description, category, condition, city, image_url
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING
       id, donor_id, title, description, category, condition, city,
       image_url, status, created_at, updated_at`,
    [
      donorId,
      item.title,
      item.description,
      item.category,
      item.condition,
      item.city,
      item.imageUrl,
    ],
  );

  return result.rows[0];
}

async function getItems(filters = {}) {
  const search = optionalText(filters.search, "Search", 100);
  const city = optionalText(filters.city, "City", 100);
  const category =
    filters.category === undefined || filters.category === null || filters.category === ""
      ? null
      : validateCategory(filters.category);

  const result = await pool.query(
    `SELECT
       i.id,
       i.title,
       i.description,
       i.category,
       i.condition,
       i.city,
       i.image_url,
       i.status,
       i.created_at,
       i.updated_at,
       u.name AS donor_name
     FROM items i
     JOIN users u ON u.id = i.donor_id
     WHERE i.status IN ('available', 'reserved')
       AND ($1::text IS NULL OR i.category = $1)
       AND ($2::text IS NULL OR LOWER(i.city) = LOWER($2))
       AND (
         $3::text IS NULL
         OR i.title ILIKE '%' || $3 || '%'
         OR i.description ILIKE '%' || $3 || '%'
       )
     ORDER BY
       CASE i.status WHEN 'available' THEN 0 ELSE 1 END,
       i.created_at DESC
     LIMIT 100`,
    [category, city, search],
  );

  return result.rows;
}

async function getMyItems(donorId) {
  const result = await pool.query(
    `SELECT
       i.id,
       i.title,
       i.description,
       i.category,
       i.condition,
       i.city,
       i.image_url,
       i.status,
       i.created_at,
       i.updated_at,
       COALESCE(
         (
           SELECT COUNT(*)::int
           FROM item_claims c
           WHERE c.item_id = i.id AND c.status = 'pending'
         ),
         0
       ) AS pending_claim_count,
       accepted.id AS accepted_claim_id,
       accepted.claimant_id AS recipient_id,
       recipient.name AS recipient_name,
       accepted.accepted_at,
       accepted.donor_confirmed_at,
       accepted.recipient_confirmed_at,
       accepted.completed_at
     FROM items i
     LEFT JOIN item_claims accepted
       ON accepted.item_id = i.id AND accepted.status = 'accepted'
     LEFT JOIN users recipient ON recipient.id = accepted.claimant_id
     WHERE i.donor_id = $1
     ORDER BY i.created_at DESC`,
    [donorId],
  );

  return result.rows;
}

async function getItemById(itemId, viewerId) {
  const itemResult = await pool.query(
    `SELECT
       i.id,
       i.donor_id,
       i.title,
       i.description,
       i.category,
       i.condition,
       i.city,
       i.image_url,
       i.status,
       i.created_at,
       i.updated_at,
       donor.name AS donor_name,
       donor_profile.city AS donor_city
     FROM items i
     JOIN users donor ON donor.id = i.donor_id
     LEFT JOIN profiles donor_profile ON donor_profile.user_id = i.donor_id
     WHERE i.id = $1`,
    [itemId],
  );

  if (itemResult.rows.length === 0) {
    throw httpError(404, "Item not found");
  }

  const item = itemResult.rows[0];
  const isOwner = viewerId === item.donor_id;

  let myActiveClaim = null;
  let myLatestClaim = null;

  if (viewerId) {
    const claims = await pool.query(
      `SELECT id, status, created_at, accepted_at, completed_at
       FROM item_claims
       WHERE item_id = $1 AND claimant_id = $2
       ORDER BY created_at DESC`,
      [itemId, viewerId],
    );

    myLatestClaim = claims.rows[0] ?? null;
    myActiveClaim =
      claims.rows.find(
        (claim) => claim.status === "pending" || claim.status === "accepted",
      ) ?? null;
  }

  const reservationResult = await pool.query(
    `SELECT
       c.id,
       c.claimant_id,
       c.status,
       c.message,
       c.handover_note,
       c.handover_location,
       c.handover_at,
       c.accepted_at,
       c.donor_confirmed_at,
       c.recipient_confirmed_at,
       c.completed_at,
       claimant.name AS claimant_name,
       claimant_profile.city AS claimant_city
     FROM item_claims c
     JOIN users claimant ON claimant.id = c.claimant_id
     LEFT JOIN profiles claimant_profile ON claimant_profile.user_id = c.claimant_id
     WHERE c.item_id = $1 AND c.status IN ('accepted', 'completed')
     ORDER BY
       CASE c.status WHEN 'accepted' THEN 0 ELSE 1 END,
       c.completed_at DESC NULLS LAST
     LIMIT 1`,
    [itemId],
  );

  const reservationRow = reservationResult.rows[0] ?? null;
  const isRecipient =
    Boolean(viewerId) && reservationRow?.claimant_id === viewerId;

  let reservation = null;

  if (reservationRow && (isOwner || isRecipient)) {
    reservation = {
      claim_id: reservationRow.id,
      status: reservationRow.status,
      my_role: isOwner ? "donor" : "recipient",
      claimant_name: reservationRow.claimant_name,
      claimant_city: reservationRow.claimant_city,
      handover_note: reservationRow.handover_note,
      handover_location: reservationRow.handover_location,
      handover_at: reservationRow.handover_at,
      accepted_at: reservationRow.accepted_at,
      donor_confirmed_at: reservationRow.donor_confirmed_at,
      recipient_confirmed_at: reservationRow.recipient_confirmed_at,
      completed_at: reservationRow.completed_at,
      donor_confirmed: Boolean(reservationRow.donor_confirmed_at),
      recipient_confirmed: Boolean(reservationRow.recipient_confirmed_at),
      both_confirmed: Boolean(
        reservationRow.donor_confirmed_at && reservationRow.recipient_confirmed_at,
      ),
    };
  }

  const canClaim =
    Boolean(viewerId) &&
    !isOwner &&
    item.status === "available" &&
    !myActiveClaim;

  return {
    item: {
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      condition: item.condition,
      city: item.city,
      image_url: item.image_url,
      status: item.status,
      created_at: item.created_at,
      updated_at: item.updated_at,
      donor_name: item.donor_name,
      donor_city: item.donor_city,
    },
    viewer: {
      authenticated: Boolean(viewerId),
      is_owner: isOwner,
      is_recipient: isRecipient,
      can_claim: canClaim,
      my_active_claim: myActiveClaim,
      my_latest_claim: myLatestClaim,
    },
    reservation,
  };
}

async function updateItem(itemId, donorId, payload = {}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const locked = await client.query(
      `SELECT id, donor_id, status
       FROM items
       WHERE id = $1
       FOR UPDATE`,
      [itemId],
    );

    if (locked.rows.length === 0) {
      throw httpError(404, "Item not found");
    }

    const item = locked.rows[0];

    if (item.donor_id !== donorId) {
      throw httpError(403, "Only the listing owner can update this item");
    }

    if (item.status !== "available") {
      throw httpError(
        409,
        "Only available items can be edited. Reserved, donated, and closed items are read-only.",
      );
    }

    if (payload.status !== undefined) {
      throw httpError(
        400,
        "Item status is managed through reservation and handover actions",
      );
    }

    const updates = [];
    const values = [];

    if (payload.title !== undefined) {
      updates.push(`title = $${values.length + 1}`);
      values.push(requiredText(payload.title, "Title", { min: 3, max: 200 }));
    }

    if (payload.description !== undefined) {
      updates.push(`description = $${values.length + 1}`);
      values.push(
        requiredText(payload.description, "Description", {
          min: 10,
          max: 5000,
        }),
      );
    }

    if (payload.category !== undefined) {
      updates.push(`category = $${values.length + 1}`);
      values.push(validateCategory(payload.category));
    }

    if (payload.condition !== undefined) {
      updates.push(`condition = $${values.length + 1}`);
      values.push(validateCondition(payload.condition));
    }

    if (payload.city !== undefined) {
      updates.push(`city = $${values.length + 1}`);
      values.push(requiredText(payload.city, "City", { max: 100 }));
    }

    if (payload.imageUrl !== undefined || payload.image_url !== undefined) {
      updates.push(`image_url = $${values.length + 1}`);
      values.push(validateImageUrl(payload.imageUrl ?? payload.image_url));
    }

    if (updates.length === 0) {
      throw httpError(400, "No valid fields were provided");
    }

    values.push(itemId);

    const updated = await client.query(
      `UPDATE items
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING
         id, donor_id, title, description, category, condition, city,
         image_url, status, created_at, updated_at`,
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

async function closeItem(itemId, donorId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const locked = await client.query(
      `SELECT id, donor_id, status
       FROM items
       WHERE id = $1
       FOR UPDATE`,
      [itemId],
    );

    if (locked.rows.length === 0) {
      throw httpError(404, "Item not found");
    }

    const item = locked.rows[0];

    if (item.donor_id !== donorId) {
      throw httpError(403, "Only the listing owner can close this item");
    }

    if (item.status !== "available") {
      throw httpError(409, "Only available items can be closed");
    }

    const updated = await client.query(
      `UPDATE items
       SET status = 'closed', updated_at = NOW()
       WHERE id = $1
       RETURNING
         id, donor_id, title, description, category, condition, city,
         image_url, status, created_at, updated_at`,
      [itemId],
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

async function deleteItem(itemId, donorId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const locked = await client.query(
      `SELECT id, donor_id, status
       FROM items
       WHERE id = $1
       FOR UPDATE`,
      [itemId],
    );

    if (locked.rows.length === 0) {
      throw httpError(404, "Item not found");
    }

    const item = locked.rows[0];

    if (item.donor_id !== donorId) {
      throw httpError(403, "Only the listing owner can delete this item");
    }

    const claims = await client.query(
      `SELECT 1 FROM item_claims WHERE item_id = $1 LIMIT 1`,
      [itemId],
    );

    if (claims.rows.length > 0) {
      throw httpError(
        409,
        "Items with claim history cannot be deleted. Close the listing instead.",
      );
    }

    if (item.status === "reserved" || item.status === "donated") {
      throw httpError(
        409,
        "Reserved and donated items cannot be deleted",
      );
    }

    await client.query(`DELETE FROM items WHERE id = $1`, [itemId]);
    await client.query("COMMIT");

    return { id: itemId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  CATEGORIES,
  CONDITIONS,
  createItem,
  getItems,
  getMyItems,
  getItemById,
  updateItem,
  closeItem,
  deleteItem,
};
