const path = require("path");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("crypto");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const jwt = require("jsonwebtoken");
const pool = require("../src/config/db");

const API_URL = "http://localhost:3000/api";
const createdItemIds = [];
const createdUserIds = [];

let donor;
let claimantOne;
let claimantTwo;
let claimantThree;
let outsider;
let itemA;
let itemB;
let itemC;
let itemD;
let itemRace;
let itemConfirmRace;

function tokenFor(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "15m" });
}

async function api(pathname, { method = "GET", token, body } = {}) {
  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_URL}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { status: response.status, data };
}

async function createUser(name) {
  const id = randomUUID();

  await pool.query(
    `INSERT INTO users (id, name, email, password_hash)
     VALUES ($1, $2, $3, $4)`,
    [id, name, `${name.toLowerCase()}-${id}@example.test`, "not-used"],
  );

  createdUserIds.push(id);

  return id;
}

function uniqueTitle(label) {
  return `${label} ${randomUUID().slice(0, 8)}`;
}

async function createItem(token, overrides = {}) {
  const title = overrides.title || uniqueTitle("Workflow item");

  const response = await api("/items", {
    method: "POST",
    token,
    body: {
      title,
      description:
        "A free item created by the automated claim workflow tests.",
      category: "household",
      condition: "good",
      city: "Claim Test City",
      ...overrides,
      title,
    },
  });

  assert.equal(response.status, 201, JSON.stringify(response.data));
  createdItemIds.push(response.data.item.id);

  return response.data.item.id;
}

async function createClaim(itemId, token, message) {
  return api(`/items/${itemId}/claims`, {
    method: "POST",
    token,
    body: message === undefined ? {} : { message },
  });
}

before(async () => {
  const health = await fetch(`${API_URL}/health`);

  assert.equal(health.status, 200, "API server must be running on port 3000");

  donor = await createUser("ClaimDonor");
  claimantOne = await createUser("ClaimOne");
  claimantTwo = await createUser("ClaimTwo");
  claimantThree = await createUser("ClaimThree");
  outsider = await createUser("ClaimOutsider");

  itemA = await createItem(tokenFor(donor), {
    title: uniqueTitle("Lifecycle bicycle"),
  });
  itemB = await createItem(tokenFor(donor), {
    title: uniqueTitle("Cancelable bookshelf"),
  });
  itemC = await createItem(tokenFor(donor), {
    title: uniqueTitle("Withdrawable lamp"),
  });
  itemD = await createItem(tokenFor(donor), {
    title: uniqueTitle("Accepted armchair"),
  });
  itemRace = await createItem(tokenFor(donor), {
    title: uniqueTitle("Race condition table"),
  });
  itemConfirmRace = await createItem(tokenFor(donor), {
    title: uniqueTitle("Confirmation race chair"),
  });
});

after(async () => {
  const ids = createdItemIds.filter(Boolean);

  if (ids.length > 0) {
    await pool.query(
      "DELETE FROM item_claims WHERE item_id = ANY($1::uuid[])",
      [ids],
    );
    await pool.query("DELETE FROM items WHERE id = ANY($1::uuid[])", [ids]);
  }

  const userIds = createdUserIds.filter(Boolean);

  if (userIds.length > 0) {
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  }

  await pool.end();
});

test("public discovery lists available items and hides closed items", async () => {
  const search = uniqueTitle("Discovery");
  const visible = await createItem(tokenFor(donor), { title: `${search} visible` });
  const closed = await createItem(tokenFor(donor), { title: `${search} closed` });

  const closedResponse = await api(`/items/${closed}/close`, {
    method: "PATCH",
    token: tokenFor(donor),
  });

  assert.equal(closedResponse.status, 200);
  assert.equal(closedResponse.data.item.status, "closed");

  const response = await api(
    `/items?search=${encodeURIComponent(search)}`,
  );

  assert.equal(response.status, 200);

  const ids = response.data.items.map((item) => item.id);

  assert.ok(ids.includes(visible));
  assert.ok(!ids.includes(closed));
});

test("claim submission requires authentication and valid identifiers", async () => {
  const unauthenticated = await createClaim(itemA, null);

  assert.equal(unauthenticated.status, 401);

  const malformed = await api("/items/not-a-uuid/claims", {
    method: "POST",
    token: tokenFor(claimantOne),
    body: {},
  });

  assert.equal(malformed.status, 400);

  const missing = await createClaim(randomUUID(), tokenFor(claimantOne));

  assert.equal(missing.status, 404);
});

test("a donor cannot claim their own item", async () => {
  const response = await createClaim(itemA, tokenFor(donor));

  assert.equal(response.status, 403);
});

test("claim messages longer than 1000 characters are rejected", async () => {
  const response = await createClaim(
    itemA,
    tokenFor(claimantOne),
    "x".repeat(1001),
  );

  assert.equal(response.status, 400);
});

test("a claimant can request an available item", async () => {
  const response = await createClaim(
    itemA,
    tokenFor(claimantOne),
    "I can collect it this weekend.",
  );

  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.claim.status, "pending");
  assert.equal(response.data.claim.item_id, itemA);

  const item = await api(`/items/${itemA}`, {
    token: tokenFor(claimantOne),
  });

  assert.equal(item.data.item.status, "available");
  assert.equal(item.data.viewer.my_active_claim.status, "pending");
});

test("duplicate active claims for the same item are rejected", async () => {
  const response = await createClaim(itemA, tokenFor(claimantOne));

  assert.equal(response.status, 409);
});

test("only the listing owner can view received claims", async () => {
  const claimantAttempt = await api(`/items/${itemA}/claims`, {
    token: tokenFor(claimantOne),
  });
  const outsiderAttempt = await api(`/items/${itemA}/claims`, {
    token: tokenFor(outsider),
  });
  const ownerResponse = await api(`/items/${itemA}/claims`, {
    token: tokenFor(donor),
  });

  assert.equal(claimantAttempt.status, 403);
  assert.equal(outsiderAttempt.status, 403);
  assert.equal(ownerResponse.status, 200);

  const claim = ownerResponse.data.claims[0];

  assert.ok(claim);
  assert.equal(claim.claimant_name, "ClaimOne");
  assert.equal(claim.message, "I can collect it this weekend.");
  assert.equal(claim.status, "pending");
  assert.ok(claim.created_at);
  assert.ok(!("email" in claim));
  assert.ok(!("phone" in claim));
  assert.ok(!("password_hash" in claim));
  assert.equal(ownerResponse.data.item.pending_claim_count, 1);
});

test("a claimant sees their own claim with item and donor context", async () => {
  const response = await api("/item-claims/me", {
    token: tokenFor(claimantOne),
  });

  assert.equal(response.status, 200);

  const claim = response.data.claims.find((entry) => entry.item_id === itemA);

  assert.ok(claim);
  assert.ok(claim.item_title.startsWith("Lifecycle bicycle"));
  assert.equal(claim.item_city, "Claim Test City");
  assert.equal(claim.donor_name, "ClaimDonor");
  assert.equal(claim.status, "pending");
  assert.equal(claim.item_status, "available");
  assert.equal(claim.can_withdraw, true);
  assert.equal(claim.can_cancel, false);
});

test("claim detail is restricted to the donor and claimant", async () => {
  const claims = await api(`/items/${itemA}/claims`, {
    token: tokenFor(donor),
  });
  const claimId = claims.data.claims[0].id;

  const outsiderAttempt = await api(`/item-claims/${claimId}`, {
    token: tokenFor(outsider),
  });
  const claimantResponse = await api(`/item-claims/${claimId}`, {
    token: tokenFor(claimantOne),
  });
  const donorResponse = await api(`/item-claims/${claimId}`, {
    token: tokenFor(donor),
  });

  assert.equal(outsiderAttempt.status, 403);
  assert.equal(claimantResponse.status, 200);
  assert.equal(donorResponse.status, 200);
});

test("a non-owner cannot accept a claim", async () => {
  const claims = await api(`/items/${itemA}/claims`, {
    token: tokenFor(donor),
  });
  const claimId = claims.data.claims[0].id;

  const response = await api(`/item-claims/${claimId}/accept`, {
    method: "PATCH",
    token: tokenFor(claimantOne),
  });

  assert.equal(response.status, 403);
});

test("the owner can accept one claim and the item becomes reserved", async () => {
  const second = await createClaim(itemA, tokenFor(claimantTwo));

  assert.equal(second.status, 201);

  const claims = await api(`/items/${itemA}/claims`, {
    token: tokenFor(donor),
  });
  const firstClaim = claims.data.claims.find(
    (claim) => claim.claimant_id === claimantOne,
  );

  const accepted = await api(`/item-claims/${firstClaim.id}/accept`, {
    method: "PATCH",
    token: tokenFor(donor),
  });

  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));
  assert.equal(accepted.data.claim.status, "accepted");
  assert.ok(accepted.data.claim.accepted_at);

  const details = await api(`/items/${itemA}`, {
    token: tokenFor(donor),
  });

  assert.equal(details.data.item.status, "reserved");
  assert.equal(details.data.reservation.status, "accepted");
  assert.equal(details.data.reservation.claimant_name, "ClaimOne");
  assert.equal(details.data.reservation.my_role, "donor");
});

test("a second claim cannot be accepted for the same item", async () => {
  const claims = await api(`/items/${itemA}/claims`, {
    token: tokenFor(donor),
  });
  const secondClaim = claims.data.claims.find(
    (claim) => claim.claimant_id === claimantTwo,
  );

  const response = await api(`/item-claims/${secondClaim.id}/accept`, {
    method: "PATCH",
    token: tokenFor(donor),
  });

  assert.equal(response.status, 409);
});

test("reserved items cannot receive new claims", async () => {
  const response = await createClaim(itemA, tokenFor(claimantThree));

  assert.equal(response.status, 409);
});

test("reservation details are hidden from non-participants", async () => {
  const publicView = await api(`/items/${itemA}`);
  const outsiderView = await api(`/items/${itemA}`, {
    token: tokenFor(outsider),
  });
  const recipientView = await api(`/items/${itemA}`, {
    token: tokenFor(claimantOne),
  });

  assert.equal(publicView.data.reservation, null);
  assert.equal(outsiderView.data.reservation, null);
  assert.equal(recipientView.data.viewer.is_recipient, true);
  assert.equal(recipientView.data.reservation.my_role, "recipient");
});

test("reserved items cannot be edited or deleted by the owner", async () => {
  const edited = await api(`/items/${itemA}`, {
    method: "PATCH",
    token: tokenFor(donor),
    body: { title: "Attempted edit" },
  });
  const deleted = await api(`/items/${itemA}`, {
    method: "DELETE",
    token: tokenFor(donor),
  });

  assert.equal(edited.status, 409);
  assert.equal(deleted.status, 409);
});

test("only participants can update handover details", async () => {
  const claims = await api(`/items/${itemA}/claims`, {
    token: tokenFor(donor),
  });
  const acceptedClaim = claims.data.claims.find(
    (claim) => claim.status === "accepted",
  );

  const outsiderAttempt = await api(
    `/item-claims/${acceptedClaim.id}/handover`,
    {
      method: "PATCH",
      token: tokenFor(outsider),
      body: { handoverLocation: "Outside" },
    },
  );

  assert.equal(outsiderAttempt.status, 403);

  const invalidDate = await api(`/item-claims/${acceptedClaim.id}/handover`, {
    method: "PATCH",
    token: tokenFor(donor),
    body: { handoverAt: "not-a-date" },
  });

  assert.equal(invalidDate.status, 400);

  const handoverAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const updated = await api(`/item-claims/${acceptedClaim.id}/handover`, {
    method: "PATCH",
    token: tokenFor(donor),
    body: {
      handoverLocation: "Central Library entrance",
      handoverAt,
      handoverNote: "Look for the green tote bag.",
    },
  });

  assert.equal(updated.status, 200, JSON.stringify(updated.data));
  assert.equal(updated.data.claim.handover_location, "Central Library entrance");
  assert.equal(updated.data.claim.handover_note, "Look for the green tote bag.");
  assert.equal(
    new Date(updated.data.claim.handover_at).toISOString(),
    handoverAt,
  );

  const recipientView = await api(`/item-claims/${acceptedClaim.id}`, {
    token: tokenFor(claimantOne),
  });

  assert.equal(recipientView.status, 200);
  assert.equal(
    recipientView.data.claim.handover_location,
    "Central Library entrance",
  );
});

test("donor confirmation alone does not complete the donation", async () => {
  const claims = await api(`/items/${itemA}/claims`, {
    token: tokenFor(donor),
  });
  const acceptedClaim = claims.data.claims.find(
    (claim) => claim.status === "accepted",
  );

  const confirmed = await api(
    `/item-claims/${acceptedClaim.id}/confirm-handover`,
    {
      method: "PATCH",
      token: tokenFor(donor),
    },
  );

  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.data.claim.status, "accepted");
  assert.ok(confirmed.data.claim.donor_confirmed_at);
  assert.equal(confirmed.data.claim.recipient_confirmed_at, null);
  assert.equal(confirmed.data.claim.completed_at, null);

  const repeated = await api(
    `/item-claims/${acceptedClaim.id}/confirm-handover`,
    {
      method: "PATCH",
      token: tokenFor(donor),
    },
  );

  assert.equal(repeated.status, 200);
  assert.equal(
    repeated.data.claim.donor_confirmed_at,
    confirmed.data.claim.donor_confirmed_at,
  );
  assert.equal(repeated.data.claim.status, "accepted");

  const item = await api(`/items/${itemA}`, {
    token: tokenFor(donor),
  });

  assert.equal(item.data.item.status, "reserved");
});

test("a reservation cannot be cancelled after a confirmation", async () => {
  const claims = await api(`/items/${itemA}/claims`, {
    token: tokenFor(donor),
  });
  const acceptedClaim = claims.data.claims.find(
    (claim) => claim.status === "accepted",
  );

  const response = await api(`/item-claims/${acceptedClaim.id}/cancel`, {
    method: "PATCH",
    token: tokenFor(claimantOne),
  });

  assert.equal(response.status, 409);
});

test("both confirmations complete the donation and preserve history", async () => {
  const claims = await api(`/items/${itemA}/claims`, {
    token: tokenFor(donor),
  });
  const acceptedClaim = claims.data.claims.find(
    (claim) => claim.status === "accepted",
  );

  const completed = await api(
    `/item-claims/${acceptedClaim.id}/confirm-handover`,
    {
      method: "PATCH",
      token: tokenFor(claimantOne),
    },
  );

  assert.equal(completed.status, 200, JSON.stringify(completed.data));
  assert.equal(completed.data.claim.status, "completed");
  assert.ok(completed.data.claim.recipient_confirmed_at);
  assert.ok(completed.data.claim.completed_at);

  const repeated = await api(
    `/item-claims/${acceptedClaim.id}/confirm-handover`,
    {
      method: "PATCH",
      token: tokenFor(claimantOne),
    },
  );

  assert.equal(repeated.status, 200);
  assert.equal(repeated.data.claim.status, "completed");

  const item = await api(`/items/${itemA}`, {
    token: tokenFor(donor),
  });

  assert.equal(item.data.item.status, "donated");

  const received = await api(`/items/${itemA}/claims`, {
    token: tokenFor(donor),
  });
  const secondClaim = received.data.claims.find(
    (claim) => claim.claimant_id === claimantTwo,
  );

  assert.equal(secondClaim.status, "rejected");
  assert.ok(
    received.data.claims.some(
      (claim) =>
        claim.claimant_id === claimantOne && claim.status === "completed",
    ),
  );

  const deletion = await api(`/items/${itemA}`, {
    method: "DELETE",
    token: tokenFor(donor),
  });

  assert.equal(deletion.status, 409);

  const mine = await api("/items/mine", {
    token: tokenFor(donor),
  });
  const listed = mine.data.items.find((entry) => entry.id === itemA);

  assert.equal(listed.status, "donated");
  assert.equal(listed.recipient_name, "ClaimOne");
  assert.ok(listed.completed_at);
  assert.ok(listed.donor_confirmed_at);
  assert.ok(listed.recipient_confirmed_at);
});

test("cancelling a reservation returns the item to available and keeps history", async () => {
  const firstClaim = await createClaim(itemB, tokenFor(claimantOne));

  assert.equal(firstClaim.status, 201);

  const accepted = await api(
    `/item-claims/${firstClaim.data.claim.id}/accept`,
    {
      method: "PATCH",
      token: tokenFor(donor),
    },
  );

  assert.equal(accepted.status, 200);

  const cancelled = await api(
    `/item-claims/${firstClaim.data.claim.id}/cancel`,
    {
      method: "PATCH",
      token: tokenFor(claimantOne),
    },
  );

  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.data));
  assert.equal(cancelled.data.claim.status, "cancelled");
  assert.ok(cancelled.data.claim.cancelled_at);

  const item = await api(`/items/${itemB}`, {
    token: tokenFor(donor),
  });

  assert.equal(item.data.item.status, "available");

  const again = await createClaim(itemB, tokenFor(claimantOne));

  assert.equal(again.status, 201);
  assert.notEqual(again.data.claim.id, firstClaim.data.claim.id);

  const received = await api(`/items/${itemB}/claims`, {
    token: tokenFor(donor),
  });
  const ownHistory = received.data.claims.filter(
    (claim) => claim.claimant_id === claimantOne,
  );

  assert.equal(ownHistory.length, 2);
  assert.deepEqual(
    ownHistory.map((claim) => claim.status).sort(),
    ["cancelled", "pending"],
  );

  const withdrawn = await api(
    `/item-claims/${again.data.claim.id}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(claimantOne),
    },
  );

  assert.equal(withdrawn.status, 200);

  const finalHistory = await api(`/items/${itemB}/claims`, {
    token: tokenFor(donor),
  });

  assert.equal(
    finalHistory.data.claims.filter(
      (claim) => claim.claimant_id === claimantOne,
    ).length,
    2,
  );
});

test("pending claims can be withdrawn or rejected but not both", async () => {
  const withdrawnClaim = await createClaim(itemC, tokenFor(claimantOne));

  assert.equal(withdrawnClaim.status, 201);

  const withdrawn = await api(
    `/item-claims/${withdrawnClaim.data.claim.id}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(claimantOne),
    },
  );

  assert.equal(withdrawn.status, 200);
  assert.equal(withdrawn.data.claim.status, "withdrawn");

  const repeatedWithdraw = await api(
    `/item-claims/${withdrawnClaim.data.claim.id}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(claimantOne),
    },
  );

  assert.equal(repeatedWithdraw.status, 409);

  const rejectedClaim = await createClaim(itemC, tokenFor(claimantTwo));

  assert.equal(rejectedClaim.status, 201);

  const rejected = await api(
    `/item-claims/${rejectedClaim.data.claim.id}/reject`,
    {
      method: "PATCH",
      token: tokenFor(donor),
    },
  );

  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.claim.status, "rejected");

  const withdrawRejected = await api(
    `/item-claims/${rejectedClaim.data.claim.id}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(claimantTwo),
    },
  );

  assert.equal(withdrawRejected.status, 409);
});

test("accepted claims cannot be withdrawn, only cancelled", async () => {
  const claim = await createClaim(itemD, tokenFor(claimantOne));

  assert.equal(claim.status, 201);

  const accepted = await api(`/item-claims/${claim.data.claim.id}/accept`, {
    method: "PATCH",
    token: tokenFor(donor),
  });

  assert.equal(accepted.status, 200);

  const withdraw = await api(
    `/item-claims/${claim.data.claim.id}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(claimantOne),
    },
  );

  assert.equal(withdraw.status, 409);

  const cancel = await api(`/item-claims/${claim.data.claim.id}/cancel`, {
    method: "PATCH",
    token: tokenFor(donor),
  });

  assert.equal(cancel.status, 200);
  assert.equal(cancel.data.claim.status, "cancelled");
});

test("only the owner can close a listing and closed items reject claims", async () => {
  const item = await createItem(tokenFor(donor), {
    title: uniqueTitle("Closing item"),
  });

  const outsiderClose = await api(`/items/${item}/close`, {
    method: "PATCH",
    token: tokenFor(outsider),
  });

  assert.equal(outsiderClose.status, 403);

  const closed = await api(`/items/${item}/close`, {
    method: "PATCH",
    token: tokenFor(donor),
  });

  assert.equal(closed.status, 200);
  assert.equal(closed.data.item.status, "closed");

  const claim = await createClaim(item, tokenFor(claimantOne));

  assert.equal(claim.status, 409);
});

test("an item without claim history can be deleted by its owner", async () => {
  const item = await createItem(tokenFor(donor), {
    title: uniqueTitle("Deletable item"),
  });

  const deleted = await api(`/items/${item}`, {
    method: "DELETE",
    token: tokenFor(donor),
  });

  assert.equal(deleted.status, 204);

  const response = await api(`/items/${item}`);

  assert.equal(response.status, 404);
});

test("invalid claim identifiers are rejected", async () => {
  const malformed = await api("/item-claims/not-a-uuid/accept", {
    method: "PATCH",
    token: tokenFor(donor),
  });
  const missing = await api(`/item-claims/${randomUUID()}/accept`, {
    method: "PATCH",
    token: tokenFor(donor),
  });

  assert.equal(malformed.status, 400);
  assert.equal(missing.status, 404);
});

test("concurrent accepts select exactly one recipient", async () => {
  const first = await createClaim(itemRace, tokenFor(claimantOne));
  const second = await createClaim(itemRace, tokenFor(claimantTwo));

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const results = await Promise.all([
    api(`/item-claims/${first.data.claim.id}/accept`, {
      method: "PATCH",
      token: tokenFor(donor),
    }),
    api(`/item-claims/${second.data.claim.id}/accept`, {
      method: "PATCH",
      token: tokenFor(donor),
    }),
  ]);

  const statuses = results.map((result) => result.status).sort();

  assert.deepEqual(statuses, [200, 409]);

  const accepted = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM item_claims
     WHERE item_id = $1 AND status = 'accepted'`,
    [itemRace],
  );

  assert.equal(accepted.rows[0].count, 1);

  const item = await api(`/items/${itemRace}`, {
    token: tokenFor(donor),
  });

  assert.equal(item.data.item.status, "reserved");
});

test("concurrent confirmations complete the donation exactly once", async () => {
  const first = await createClaim(itemConfirmRace, tokenFor(claimantOne));
  const second = await createClaim(itemConfirmRace, tokenFor(claimantTwo));

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const accepted = await api(
    `/item-claims/${first.data.claim.id}/accept`,
    {
      method: "PATCH",
      token: tokenFor(donor),
    },
  );

  assert.equal(accepted.status, 200);

  const results = await Promise.all([
    api(`/item-claims/${first.data.claim.id}/confirm-handover`, {
      method: "PATCH",
      token: tokenFor(donor),
    }),
    api(`/item-claims/${first.data.claim.id}/confirm-handover`, {
      method: "PATCH",
      token: tokenFor(claimantOne),
    }),
  ]);

  assert.deepEqual(
    results.map((result) => result.status),
    [200, 200],
  );

  const claim = await api(`/item-claims/${first.data.claim.id}`, {
    token: tokenFor(donor),
  });

  assert.equal(claim.data.claim.status, "completed");
  assert.ok(claim.data.claim.completed_at);

  const item = await api(`/items/${itemConfirmRace}`, {
    token: tokenFor(donor),
  });

  assert.equal(item.data.item.status, "donated");

  const received = await api(`/items/${itemConfirmRace}/claims`, {
    token: tokenFor(donor),
  });

  assert.equal(
    received.data.claims.find(
      (entry) => entry.id === second.data.claim.id,
    ).status,
    "rejected",
  );

  const completed = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM item_claims
     WHERE item_id = $1 AND status = 'completed'`,
    [itemConfirmRace],
  );

  assert.equal(completed.rows[0].count, 1);
});

test("public discovery excludes donated items", async () => {
  const response = await api("/items?search=Lifecycle");

  assert.equal(response.status, 200);
  assert.ok(!response.data.items.some((item) => item.id === itemA));
});

test("my claims preserve completed history and remove available actions", async () => {
  const response = await api("/item-claims/me", {
    token: tokenFor(claimantOne),
  });

  assert.equal(response.status, 200);

  const completed = response.data.claims.find(
    (claim) => claim.item_id === itemA,
  );

  assert.ok(completed);
  assert.equal(completed.status, "completed");
  assert.equal(completed.item_status, "donated");
  assert.ok(completed.completed_at);
  assert.equal(completed.can_withdraw, false);
  assert.equal(completed.can_cancel, false);
  assert.equal(completed.can_confirm, false);
  assert.ok(completed.my_confirmed_at);
  assert.ok(completed.other_confirmed_at);
});
