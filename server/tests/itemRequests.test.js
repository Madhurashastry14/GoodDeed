const path = require("path");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("crypto");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const jwt = require("jsonwebtoken");
const pool = require("../src/config/db");

const API_URL = "http://localhost:3000/api";

const createdUserIds = [];
const createdRequestIds = [];
const createdOrganizationIds = [];

let requester;
let requesterTwo;
let donorOne;
let donorTwo;
let donorThree;
let outsider;
let reviewer;
let orgOwner;
let orgMember;
let organization;

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

async function createDraft(token, overrides = {}) {
  const title = overrides.title || uniqueTitle("Requested item");

  const response = await api("/item-requests", {
    method: "POST",
    token,
    body: {
      title,
      description:
        "We need this essential item to cover our household's basic needs.",
      category: "food",
      quantity: 2,
      city: "Request Test City",
      reason:
        "Our household budget cannot cover this item and we need it this week.",
      urgency: "normal",
      ...overrides,
      title,
    },
  });

  assert.equal(response.status, 201, JSON.stringify(response.data));
  createdRequestIds.push(response.data.request.id);

  return response.data.request;
}

async function submitRequest(id, token = tokenFor(requester)) {
  const response = await api(`/item-requests/${id}/submit`, {
    method: "PATCH",
    token,
  });

  assert.equal(response.status, 200, JSON.stringify(response.data));

  return response.data.request;
}

async function approveRequest(id) {
  const response = await api(`/admin/item-requests/${id}/approve`, {
    method: "PATCH",
    token: tokenFor(reviewer),
    body: {},
  });

  assert.equal(response.status, 200, JSON.stringify(response.data));

  return response.data.request;
}

async function createApprovedRequest(overrides = {}) {
  const draft = await createDraft(tokenFor(requester), overrides);

  await submitRequest(draft.id);
  const approved = await approveRequest(draft.id);

  assert.equal(approved.status, "open");
  assert.ok(approved.verified_at);

  return approved;
}

async function createOffer(requestId, token, message, organizationId) {
  return api(`/item-requests/${requestId}/offers`, {
    method: "POST",
    token,
    body: {
      message,
      ...(organizationId ? { organizationId } : {}),
    },
  });
}

function offerMessage(label) {
  return `${label}: I can provide the full requested quantity this week.`;
}

before(async () => {
  const health = await fetch(`${API_URL}/health`);

  assert.equal(health.status, 200, "API server must be running on port 3000");

  requester = await createUser("RequestRequester");
  requesterTwo = await createUser("RequestRequesterTwo");
  donorOne = await createUser("RequestDonorOne");
  donorTwo = await createUser("RequestDonorTwo");
  donorThree = await createUser("RequestDonorThree");
  outsider = await createUser("RequestOutsider");
  reviewer = await createUser("RequestReviewer");
  orgOwner = await createUser("RequestOrgOwner");
  orgMember = await createUser("RequestOrgMember");

  await pool.query("INSERT INTO platform_reviewers (user_id) VALUES ($1)", [
    reviewer,
  ]);

  const orgResult = await pool.query(
    `INSERT INTO organizations (name, city, created_by, verification_status)
     VALUES ($1, $2, $3, 'verified')
     RETURNING id`,
    [uniqueTitle("Helper Org"), "Request Test City", orgOwner],
  );

  organization = orgResult.rows[0].id;
  createdOrganizationIds.push(organization);

  await pool.query(
    `INSERT INTO organization_members (organization_id, user_id, role)
     VALUES ($1, $2, 'owner'), ($1, $3, 'member')`,
    [organization, orgOwner, orgMember],
  );
});

after(async () => {
  const requestIds = createdRequestIds.filter(Boolean);

  if (requestIds.length > 0) {
    await pool.query(
      "DELETE FROM item_request_reviews WHERE request_id = ANY($1::uuid[])",
      [requestIds],
    );
    await pool.query(
      "DELETE FROM item_request_offers WHERE request_id = ANY($1::uuid[])",
      [requestIds],
    );
    await pool.query("DELETE FROM item_requests WHERE id = ANY($1::uuid[])", [
      requestIds,
    ]);
  }

  const organizationIds = createdOrganizationIds.filter(Boolean);

  if (organizationIds.length > 0) {
    await pool.query(
      "DELETE FROM organization_members WHERE organization_id = ANY($1::uuid[])",
      [organizationIds],
    );
    await pool.query(
      "DELETE FROM organizations WHERE id = ANY($1::uuid[])",
      [organizationIds],
    );
  }

  const userIds = createdUserIds.filter(Boolean);

  if (userIds.length > 0) {
    await pool.query("DELETE FROM platform_reviewers WHERE user_id = ANY($1::uuid[])", [
      userIds,
    ]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  }

  await pool.end();
});

test("creates a draft request and keeps it out of public discovery", async () => {
  const request = await createDraft(tokenFor(requester));

  assert.equal(request.status, "draft");
  assert.equal(request.verified_at, null);
  assert.equal(request.quantity, 2);
  assert.equal(request.submitted_at, null);

  const search = await api(
    `/item-requests?search=${encodeURIComponent(request.title)}`,
  );

  assert.equal(search.status, 200);
  assert.equal(search.data.pagination.total, 0);
});

test("rejects invalid request payloads", async () => {
  const base = {
    title: uniqueTitle("Invalid request"),
    description: "A sufficiently long description for validation checks.",
    category: "food",
    quantity: 1,
    city: "Request Test City",
    reason: "A sufficiently long reason for the validation checks.",
    urgency: "normal",
  };

  const cases = [
    { ...base, title: "ab" },
    { ...base, description: "short" },
    { ...base, category: "toys" },
    { ...base, quantity: 0 },
    { ...base, quantity: 1.5 },
    { ...base, quantity: 1001 },
    { ...base, city: "   " },
    { ...base, reason: "short" },
    { ...base, urgency: "urgent" },
  ];

  for (const body of cases) {
    const response = await api("/item-requests", {
      method: "POST",
      token: tokenFor(requester),
      body,
    });

    assert.equal(response.status, 400, JSON.stringify(body));
    assert.ok(response.data.error);
  }
});

test("requester sees private reason and draft permissions while anonymous users get 404", async () => {
  const draft = await createDraft(tokenFor(requester));

  const mine = await api(`/item-requests/${draft.id}`, {
    token: tokenFor(requester),
  });

  assert.equal(mine.status, 200);
  assert.equal(mine.data.request.reason, draft.reason);
  assert.equal(mine.data.permissions.can_edit, true);
  assert.equal(mine.data.permissions.can_submit, true);
  assert.equal(mine.data.permissions.can_cancel, true);
  assert.equal(mine.data.permissions.can_offer, false);

  const anonymous = await api(`/item-requests/${draft.id}`);

  assert.equal(anonymous.status, 404);
});

test("submitting a draft moves it into the reviewer queue", async () => {
  const draft = await createDraft(tokenFor(requester));
  const submitted = await submitRequest(draft.id);

  assert.equal(submitted.status, "pending_verification");
  assert.ok(submitted.submitted_at);
  assert.equal(submitted.verified_at, null);

  const queue = await api("/admin/item-requests/pending?limit=50", {
    token: tokenFor(reviewer),
  });

  assert.equal(queue.status, 200);
  assert.ok(queue.data.requests.some((item) => item.id === draft.id));

  const anonymousQueue = await api("/admin/item-requests/pending");
  assert.equal(anonymousQueue.status, 401);
});

test("non-reviewers cannot read the queue or record decisions", async () => {
  const draft = await createDraft(tokenFor(requester));

  await submitRequest(draft.id);

  const queue = await api("/admin/item-requests/pending", {
    token: tokenFor(outsider),
  });

  assert.equal(queue.status, 403);

  const decide = await api(`/admin/item-requests/${draft.id}/approve`, {
    method: "PATCH",
    token: tokenFor(outsider),
    body: {},
  });

  assert.equal(decide.status, 403);

  const access = await api("/admin/item-requests/access", {
    token: tokenFor(outsider),
  });

  assert.equal(access.status, 200);
  assert.equal(access.data.is_reviewer, false);

  const reviewerAccess = await api("/admin/item-requests/access", {
    token: tokenFor(reviewer),
  });

  assert.equal(reviewerAccess.data.is_reviewer, true);
});

test("reviewer approves a pending request and publishes it", async () => {
  const draft = await createDraft(tokenFor(requester));

  await submitRequest(draft.id);

  const detail = await api(`/admin/item-requests/${draft.id}`, {
    token: tokenFor(reviewer),
  });

  assert.equal(detail.status, 200);
  assert.equal(detail.data.permissions.can_review, true);
  assert.equal(detail.data.permissions.is_own_request, false);
  assert.equal(detail.data.request.reason, draft.reason);

  const approved = await approveRequest(draft.id);

  assert.equal(approved.status, "open");
  assert.ok(approved.verified_at);

  const queue = await api("/admin/item-requests/pending?limit=50", {
    token: tokenFor(reviewer),
  });

  assert.ok(!queue.data.requests.some((item) => item.id === draft.id));
});

test("public discovery exposes approved requests without private fields", async () => {
  const approved = await createApprovedRequest({
    title: uniqueTitle("Discovery published"),
    city: `Discovery-${randomUUID().slice(0, 8)}`,
  });

  const list = await api(
    `/item-requests?search=${encodeURIComponent(approved.title)}`,
  );

  assert.equal(list.status, 200);
  assert.equal(list.data.requests.length, 1);

  const row = list.data.requests[0];

  assert.equal(row.id, approved.id);
  assert.equal(row.status, "open");
  assert.ok(row.requester_name);
  assert.equal("reason" in row, false);

  const detail = await api(`/item-requests/${approved.id}`);

  assert.equal(detail.status, 200);
  assert.equal("reason" in detail.data.request, false);
  assert.equal("offers" in detail.data, false);
  assert.equal("review_history" in detail.data, false);
  assert.equal(detail.data.request.is_verified, true);

  const anonymousOffers = await api(`/item-requests/${approved.id}/offers`);

  assert.equal(anonymousOffers.status, 401);
});

test("reviewers cannot review their own request", async () => {
  const reviewerToken = tokenFor(reviewer);
  const own = await createDraft(reviewerToken);

  await submitRequest(own.id, reviewerToken);

  const detail = await api(`/admin/item-requests/${own.id}`, {
    token: reviewerToken,
  });

  assert.equal(detail.status, 200);
  assert.equal(detail.data.permissions.is_own_request, true);
  assert.equal(detail.data.permissions.can_review, false);

  const decision = await api(`/admin/item-requests/${own.id}/approve`, {
    method: "PATCH",
    token: reviewerToken,
    body: {},
  });

  assert.equal(decision.status, 403);
  assert.match(decision.data.error, /own item requests/i);

  const stillPending = await api("/admin/item-requests/pending?limit=50", {
    token: reviewerToken,
  });

  assert.ok(stillPending.data.requests.some((item) => item.id === own.id));
});

test("rejection requires notes, records history, and only shows feedback to the requester", async () => {
  const draft = await createDraft(tokenFor(requester));

  await submitRequest(draft.id);

  const withoutNotes = await api(`/admin/item-requests/${draft.id}/reject`, {
    method: "PATCH",
    token: tokenFor(reviewer),
    body: {},
  });

  assert.equal(withoutNotes.status, 400);

  const shortNotes = await api(`/admin/item-requests/${draft.id}/reject`, {
    method: "PATCH",
    token: tokenFor(reviewer),
    body: { reviewNotes: "too short" },
  });

  assert.equal(shortNotes.status, 400);

  const notes = "Please provide more detail about the requested quantity.";

  const rejected = await api(`/admin/item-requests/${draft.id}/reject`, {
    method: "PATCH",
    token: tokenFor(reviewer),
    body: { reviewNotes: notes },
  });

  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.request.status, "rejected");
  assert.equal(rejected.data.review.decision, "rejected");
  assert.equal(rejected.data.review.review_notes, notes);

  const mine = await api(`/item-requests/${draft.id}`, {
    token: tokenFor(requester),
  });

  assert.equal(mine.data.request.status, "rejected");
  assert.equal(mine.data.feedback.review_notes, notes);
  assert.equal(mine.data.review_history.length, 1);

  const anonymous = await api(`/item-requests/${draft.id}`);
  assert.equal(anonymous.status, 404);

  const list = await api(
    `/item-requests?search=${encodeURIComponent(draft.title)}`,
  );

  assert.equal(list.data.pagination.total, 0);
});

test("request changes requires notes and the requester can reopen and resubmit", async () => {
  const draft = await createDraft(tokenFor(requester));

  await submitRequest(draft.id);

  const missing = await api(
    `/admin/item-requests/${draft.id}/request-changes`,
    {
      method: "PATCH",
      token: tokenFor(reviewer),
      body: {},
    },
  );

  assert.equal(missing.status, 400);

  const notes = "Please explain who will use each of the requested units.";

  const changes = await api(
    `/admin/item-requests/${draft.id}/request-changes`,
    {
      method: "PATCH",
      token: tokenFor(reviewer),
      body: { reviewNotes: notes },
    },
  );

  assert.equal(changes.status, 200);
  assert.equal(changes.data.request.status, "changes_requested");

  const reopened = await api(`/item-requests/${draft.id}/reopen`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  assert.equal(reopened.status, 200);
  assert.equal(reopened.data.request.status, "draft");

  const resubmitted = await submitRequest(draft.id);

  assert.equal(resubmitted.status, "pending_verification");

  const detail = await api(`/admin/item-requests/${draft.id}`, {
    token: tokenFor(reviewer),
  });

  assert.equal(detail.data.permissions.can_review, true);
  assert.equal(detail.data.review_history.length, 1);
});

test("only the requester can edit, submit, reopen, or cancel a request", async () => {
  const draft = await createDraft(tokenFor(requester));

  const edit = await api(`/item-requests/${draft.id}`, {
    method: "PATCH",
    token: tokenFor(outsider),
    body: { title: uniqueTitle("Hijacked") },
  });

  assert.equal(edit.status, 403);

  const submit = await api(`/item-requests/${draft.id}/submit`, {
    method: "PATCH",
    token: tokenFor(outsider),
  });

  assert.equal(submit.status, 403);

  const cancel = await api(`/item-requests/${draft.id}/cancel`, {
    method: "PATCH",
    token: tokenFor(outsider),
  });

  assert.equal(cancel.status, 403);

  await submitRequest(draft.id);

  const changes = await api(
    `/admin/item-requests/${draft.id}/request-changes`,
    {
      method: "PATCH",
      token: tokenFor(reviewer),
      body: { reviewNotes: "Please clarify the delivery location." },
    },
  );

  assert.equal(changes.status, 200);

  const reopen = await api(`/item-requests/${draft.id}/reopen`, {
    method: "PATCH",
    token: tokenFor(outsider),
  });

  assert.equal(reopen.status, 403);

  const stillChanges = await api(`/item-requests/${draft.id}`, {
    token: tokenFor(requester),
  });

  assert.equal(stillChanges.data.request.status, "changes_requested");
});

test("requests under verification cannot be edited", async () => {
  const draft = await createDraft(tokenFor(requester));

  await submitRequest(draft.id);

  const edit = await api(`/item-requests/${draft.id}`, {
    method: "PATCH",
    token: tokenFor(requester),
    body: { description: "Updated while a reviewer is still deciding." },
  });

  assert.equal(edit.status, 409);
});

test("editing an approved request withdraws it from discovery and requires reverification", async () => {
  const approved = await createApprovedRequest({
    title: uniqueTitle("Material change"),
  });

  const edited = await api(`/item-requests/${approved.id}`, {
    method: "PATCH",
    token: tokenFor(requester),
    body: { quantity: 4 },
  });

  assert.equal(edited.status, 200);
  assert.equal(edited.data.reverification_required, true);
  assert.equal(edited.data.request.status, "pending_verification");
  assert.equal(edited.data.request.verified_at, null);
  assert.equal(edited.data.request.quantity, 4);

  const list = await api(
    `/item-requests?search=${encodeURIComponent(approved.title)}`,
  );

  assert.equal(list.data.pagination.total, 0);
});

test("editing a draft keeps it in draft without reverification", async () => {
  const draft = await createDraft(tokenFor(requester));

  const edited = await api(`/item-requests/${draft.id}`, {
    method: "PATCH",
    token: tokenFor(requester),
    body: { description: "Updated draft description with more detail." },
  });

  assert.equal(edited.status, 200);
  assert.equal(edited.data.reverification_required, false);
  assert.equal(edited.data.request.status, "draft");
});

test("cancelling a request preserves history and rejects pending offers", async () => {
  const approved = await createApprovedRequest();

  const offer = await createOffer(
    approved.id,
    tokenFor(donorOne),
    offerMessage("Cancellation"),
  );

  assert.equal(offer.status, 201);

  const cancelled = await api(`/item-requests/${approved.id}/cancel`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.request.status, "cancelled");

  const offers = await api(`/item-requests/${approved.id}/offers`, {
    token: tokenFor(requester),
  });

  assert.equal(offers.status, 200);
  assert.equal(offers.data.offers.length, 1);
  assert.equal(offers.data.offers[0].status, "rejected");

  const draft = await createDraft(tokenFor(requester));

  await submitRequest(draft.id);

  const cancelledPending = await api(`/item-requests/${draft.id}/cancel`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  assert.equal(cancelledPending.status, 200);
  assert.equal(cancelledPending.data.request.status, "cancelled");
});

test("discovery filters, sorting, and pagination work", async () => {
  const city = `Filter-${randomUUID().slice(0, 8)}`;
  const prefix = uniqueTitle("Filter request");

  const first = await createApprovedRequest({
    title: `${prefix} one`,
    city,
    category: "food",
    urgency: "high",
  });

  await new Promise((resolve) => setTimeout(resolve, 15));

  const second = await createApprovedRequest({
    title: `${prefix} two`,
    city,
    category: "clothing",
    urgency: "low",
  });

  await new Promise((resolve) => setTimeout(resolve, 15));

  const third = await createApprovedRequest({
    title: `${prefix} three`,
    city,
    category: "household",
    urgency: "normal",
  });

  const bySearch = await api(
    `/item-requests?search=${encodeURIComponent(prefix)}&sort=oldest&limit=50`,
  );

  assert.equal(bySearch.status, 200);
  assert.equal(bySearch.data.pagination.total, 3);
  assert.deepEqual(
    bySearch.data.requests.map((item) => item.id),
    [first.id, second.id, third.id],
  );

  const byCategory = await api(
    `/item-requests?search=${encodeURIComponent(prefix)}&category=food`,
  );

  assert.equal(byCategory.data.pagination.total, 1);
  assert.equal(byCategory.data.requests[0].id, first.id);

  const byUrgency = await api(
    `/item-requests?search=${encodeURIComponent(prefix)}&urgency=high`,
  );

  assert.equal(byUrgency.data.pagination.total, 1);
  assert.equal(byUrgency.data.requests[0].id, first.id);

  const byCity = await api(`/item-requests?city=${encodeURIComponent(city)}`);

  assert.equal(byCity.data.pagination.total, 3);

  const page = await api(
    `/item-requests?search=${encodeURIComponent(
      prefix,
    )}&sort=oldest&limit=1&page=2`,
  );

  assert.equal(page.data.requests.length, 1);
  assert.equal(page.data.requests[0].id, second.id);
  assert.equal(page.data.pagination.page, 2);
  assert.equal(page.data.pagination.limit, 1);
  assert.equal(page.data.pagination.total, 3);
  assert.equal(page.data.pagination.totalPages, 3);

  const invalid = await api("/item-requests?category=toys");
  assert.equal(invalid.status, 400);

  const invalidSort = await api("/item-requests?sort=sideways");
  assert.equal(invalidSort.status, 400);
});

test("draft, pending, rejected, and cancelled requests stay out of discovery", async () => {
  const draft = await createDraft(tokenFor(requester));

  const draftList = await api(
    `/item-requests?search=${encodeURIComponent(draft.title)}`,
  );
  assert.equal(draftList.data.pagination.total, 0);

  const pending = await createDraft(tokenFor(requester));
  await submitRequest(pending.id);

  const pendingList = await api(
    `/item-requests?search=${encodeURIComponent(pending.title)}`,
  );
  assert.equal(pendingList.data.pagination.total, 0);

  const rejected = await createDraft(tokenFor(requester));
  await submitRequest(rejected.id);

  const rejection = await api(`/admin/item-requests/${rejected.id}/reject`, {
    method: "PATCH",
    token: tokenFor(reviewer),
    body: { reviewNotes: "This request cannot be verified as written." },
  });

  assert.equal(rejection.status, 200);

  const rejectedList = await api(
    `/item-requests?search=${encodeURIComponent(rejected.title)}`,
  );
  assert.equal(rejectedList.data.pagination.total, 0);

  const cancelled = await createApprovedRequest();
  const cancel = await api(`/item-requests/${cancelled.id}/cancel`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  assert.equal(cancel.status, 200);

  const cancelledList = await api(
    `/item-requests?search=${encodeURIComponent(cancelled.title)}`,
  );
  assert.equal(cancelledList.data.pagination.total, 0);
});

test("requesters cannot offer to fulfill their own request", async () => {
  const approved = await createApprovedRequest();

  const response = await createOffer(
    approved.id,
    tokenFor(requester),
    offerMessage("Self fulfillment"),
  );

  assert.equal(response.status, 403);
  assert.match(response.data.error, /your own/i);
});

test("offers are only accepted on verified, open requests", async () => {
  const draft = await createDraft(tokenFor(requester));
  const draftOffer = await createOffer(
    draft.id,
    tokenFor(donorOne),
    offerMessage("Draft"),
  );

  assert.equal(draftOffer.status, 409);

  const pending = await createDraft(tokenFor(requester));
  await submitRequest(pending.id);

  const pendingOffer = await createOffer(
    pending.id,
    tokenFor(donorTwo),
    offerMessage("Pending"),
  );

  assert.equal(pendingOffer.status, 409);
});

test("offer messages are required and between 10 and 1000 characters", async () => {
  const approved = await createApprovedRequest();

  const missing = await createOffer(approved.id, tokenFor(donorOne), undefined);
  assert.equal(missing.status, 400);

  const tooShort = await createOffer(approved.id, tokenFor(donorOne), "short");
  assert.equal(tooShort.status, 400);

  const tooLong = await createOffer(
    approved.id,
    tokenFor(donorOne),
    "x".repeat(1001),
  );
  assert.equal(tooLong.status, 400);

  const valid = await createOffer(
    approved.id,
    tokenFor(donorOne),
    "x".repeat(1000),
  );
  assert.equal(valid.status, 201);
  assert.equal(valid.data.offer.status, "pending");
});

test("donors submit one active offer and only the requester sees them", async () => {
  const approved = await createApprovedRequest();

  const first = await createOffer(
    approved.id,
    tokenFor(donorOne),
    offerMessage("First donor"),
  );

  assert.equal(first.status, 201);
  assert.equal(first.data.offer.status, "pending");

  const duplicate = await createOffer(
    approved.id,
    tokenFor(donorOne),
    offerMessage("Duplicate"),
  );

  assert.equal(duplicate.status, 409);

  const second = await createOffer(
    approved.id,
    tokenFor(donorTwo),
    offerMessage("Second donor"),
  );

  assert.equal(second.status, 201);

  const received = await api(`/item-requests/${approved.id}/offers`, {
    token: tokenFor(requester),
  });

  assert.equal(received.status, 200);
  assert.equal(received.data.offers.length, 2);
  assert.equal(received.data.request.pending_offer_count, 2);
  assert.ok(received.data.offers.every((offer) => offer.donor_name));

  const donorView = await api(`/item-requests/${approved.id}/offers`, {
    token: tokenFor(donorOne),
  });

  assert.equal(donorView.status, 403);

  const outsiderView = await api(`/item-requests/${approved.id}/offers`, {
    token: tokenFor(outsider),
  });

  assert.equal(outsiderView.status, 403);

  const mine = await api("/item-request-offers/me", {
    token: tokenFor(donorOne),
  });

  assert.equal(mine.status, 200);

  const mineForRequest = mine.data.offers.filter(
    (offer) => offer.request_id === approved.id,
  );

  assert.equal(mineForRequest.length, 1);
  assert.equal(mineForRequest[0].status, "pending");
  assert.equal(mineForRequest[0].can_withdraw, true);
  assert.equal(mineForRequest[0].request_title, approved.title);
});

test("only the organization owner can offer on behalf of an organization", async () => {
  const approved = await createApprovedRequest();

  const memberAttempt = await createOffer(
    approved.id,
    tokenFor(orgMember),
    offerMessage("Organization member"),
    organization,
  );

  assert.equal(memberAttempt.status, 403);

  const ownerAttempt = await createOffer(
    approved.id,
    tokenFor(orgOwner),
    offerMessage("Organization owner"),
    organization,
  );

  assert.equal(ownerAttempt.status, 201);
  assert.equal(ownerAttempt.data.offer.organization_id, organization);
  assert.ok(ownerAttempt.data.offer.organization_name);

  const received = await api(`/item-requests/${approved.id}/offers`, {
    token: tokenFor(requester),
  });

  assert.equal(received.data.offers.length, 1);
  assert.equal(received.data.offers[0].organization_id, organization);
  assert.equal(
    received.data.offers[0].organization_name,
    ownerAttempt.data.offer.organization_name,
  );

  const statuses = await api("/item-request-offers/me", {
    token: tokenFor(orgOwner),
  });

  assert.equal(statuses.data.offers.length, 1);
  assert.ok(statuses.data.offers[0].organization_name);
});

test("requesters reject offers and donors withdraw their own offers", async () => {
  const approved = await createApprovedRequest();

  const one = await createOffer(
    approved.id,
    tokenFor(donorOne),
    offerMessage("Rejectable"),
  );
  const two = await createOffer(
    approved.id,
    tokenFor(donorTwo),
    offerMessage("Withdrawable"),
  );
  const three = await createOffer(
    approved.id,
    tokenFor(donorThree),
    offerMessage("Protected"),
  );

  assert.equal(one.status, 201);
  assert.equal(two.status, 201);
  assert.equal(three.status, 201);

  const rejected = await api(`/item-request-offers/${one.data.offer.id}/reject`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.offer.status, "rejected");

  const withdrawn = await api(
    `/item-request-offers/${two.data.offer.id}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(donorTwo),
    },
  );

  assert.equal(withdrawn.status, 200);
  assert.equal(withdrawn.data.offer.status, "withdrawn");

  const wrongReject = await api(
    `/item-request-offers/${three.data.offer.id}/reject`,
    {
      method: "PATCH",
      token: tokenFor(donorOne),
    },
  );

  assert.equal(wrongReject.status, 403);

  const wrongWithdraw = await api(
    `/item-request-offers/${three.data.offer.id}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(outsider),
    },
  );

  assert.equal(wrongWithdraw.status, 403);

  const received = await api(`/item-requests/${approved.id}/offers`, {
    token: tokenFor(requester),
  });

  const byId = new Map(
    received.data.offers.map((offer) => [offer.id, offer.status]),
  );

  assert.equal(byId.get(one.data.offer.id), "rejected");
  assert.equal(byId.get(two.data.offer.id), "withdrawn");
  assert.equal(byId.get(three.data.offer.id), "pending");
});

test("accepting one offer reserves the request and blocks other offers", async () => {
  const approved = await createApprovedRequest();

  const one = await createOffer(
    approved.id,
    tokenFor(donorOne),
    offerMessage("Selected"),
  );
  const two = await createOffer(
    approved.id,
    tokenFor(donorTwo),
    offerMessage("Not selected"),
  );

  const accepted = await api(`/item-request-offers/${one.data.offer.id}/accept`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  assert.equal(accepted.status, 200);
  assert.equal(accepted.data.offer.status, "accepted");
  assert.ok(accepted.data.offer.accepted_at);

  const detail = await api(`/item-requests/${approved.id}`, {
    token: tokenFor(requester),
  });

  assert.equal(detail.data.request.status, "reserved");
  assert.equal(detail.data.permissions.can_edit, false);

  const competing = await createOffer(
    approved.id,
    tokenFor(donorThree),
    offerMessage("Too late"),
  );

  assert.equal(competing.status, 409);

  const secondAccept = await api(
    `/item-request-offers/${two.data.offer.id}/accept`,
    {
      method: "PATCH",
      token: tokenFor(requester),
    },
  );

  assert.equal(secondAccept.status, 409);

  const repeatAccept = await api(
    `/item-request-offers/${one.data.offer.id}/accept`,
    {
      method: "PATCH",
      token: tokenFor(requester),
    },
  );

  assert.equal(repeatAccept.status, 409);
});

test("cancelling a reservation reopens the request and keeps offer history", async () => {
  const approved = await createApprovedRequest();

  const offer = await createOffer(
    approved.id,
    tokenFor(donorOne),
    offerMessage("Cancellable"),
  );

  const accepted = await api(`/item-request-offers/${offer.data.offer.id}/accept`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  assert.equal(accepted.status, 200);

  const cancelled = await api(
    `/item-request-offers/${offer.data.offer.id}/cancel`,
    {
      method: "PATCH",
      token: tokenFor(requester),
    },
  );

  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.offer.status, "cancelled");

  const reopened = await api(`/item-requests/${approved.id}`, {
    token: tokenFor(requester),
  });

  assert.equal(reopened.data.request.status, "open");
  assert.ok(reopened.data.request.verified_at);

  const again = await createOffer(
    approved.id,
    tokenFor(donorOne),
    offerMessage("Second attempt"),
  );

  assert.equal(again.status, 201);

  const history = await api(`/item-requests/${approved.id}/offers`, {
    token: tokenFor(requester),
  });

  assert.equal(history.data.offers.length, 2);
  assert.deepEqual(
    history.data.offers.map((item) => item.status).sort(),
    ["cancelled", "pending"],
  );
});

test("handover details are private to the reservation parties", async () => {
  const approved = await createApprovedRequest();

  const offer = await createOffer(
    approved.id,
    tokenFor(donorOne),
    offerMessage("Handover"),
  );
  const otherOffer = await createOffer(
    approved.id,
    tokenFor(donorTwo),
    offerMessage("Bystander"),
  );

  const accepted = await api(`/item-request-offers/${offer.data.offer.id}/accept`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  assert.equal(accepted.status, 200);

  const outsiderAttempt = await api(
    `/item-request-offers/${offer.data.offer.id}/handover`,
    {
      method: "PATCH",
      token: tokenFor(outsider),
      body: { handoverLocation: "Wrong place" },
    },
  );

  assert.equal(outsiderAttempt.status, 403);

  const handoverAt = new Date(Date.now() + 86400000).toISOString();

  const updated = await api(
    `/item-request-offers/${offer.data.offer.id}/handover`,
    {
      method: "PATCH",
      token: tokenFor(requester),
      body: {
        handoverLocation: "Community centre front desk",
        handoverNote: "Ask for the volunteer coordinator.",
        handoverAt,
      },
    },
  );

  assert.equal(updated.status, 200);
  assert.equal(
    updated.data.offer.handover_location,
    "Community centre front desk",
  );

  const donorDetail = await api(`/item-requests/${approved.id}`, {
    token: tokenFor(donorOne),
  });

  assert.equal(donorDetail.status, 200);
  assert.equal(donorDetail.data.my_offers.length, 1);
  assert.equal(
    donorDetail.data.my_offers[0].handover_location,
    "Community centre front desk",
  );
  assert.equal("offers" in donorDetail.data, false);

  const bystanderDetail = await api(`/item-requests/${approved.id}`, {
    token: tokenFor(donorTwo),
  });

  assert.equal(bystanderDetail.status, 200);
  assert.equal("offers" in bystanderDetail.data, false);
  assert.equal(
    bystanderDetail.data.my_offers[0].id,
    otherOffer.data.offer.id,
  );
  assert.equal(bystanderDetail.data.my_offers[0].handover_location, null);
});

test("both parties must confirm and the second confirmation fulfills the request", async () => {
  const approved = await createApprovedRequest();

  const offer = await createOffer(
    approved.id,
    tokenFor(donorOne),
    offerMessage("Completion"),
  );
  const pending = await createOffer(
    approved.id,
    tokenFor(donorTwo),
    offerMessage("Waiting"),
  );

  const accepted = await api(`/item-request-offers/${offer.data.offer.id}/accept`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  assert.equal(accepted.status, 200);

  const donorConfirm = await api(
    `/item-request-offers/${offer.data.offer.id}/confirm-handover`,
    {
      method: "PATCH",
      token: tokenFor(donorOne),
    },
  );

  assert.equal(donorConfirm.status, 200);
  assert.equal(donorConfirm.data.offer.status, "accepted");
  assert.ok(donorConfirm.data.offer.donor_confirmed_at);
  assert.equal(donorConfirm.data.offer.requester_confirmed_at, null);

  const stillReserved = await api(`/item-requests/${approved.id}`, {
    token: tokenFor(requester),
  });

  assert.equal(stillReserved.data.request.status, "reserved");

  const requesterConfirm = await api(
    `/item-request-offers/${offer.data.offer.id}/confirm-handover`,
    {
      method: "PATCH",
      token: tokenFor(requester),
    },
  );

  assert.equal(requesterConfirm.status, 200);
  assert.equal(requesterConfirm.data.offer.status, "completed");
  assert.ok(requesterConfirm.data.offer.requester_confirmed_at);
  assert.ok(requesterConfirm.data.offer.completed_at);

  const fulfilled = await api(`/item-requests/${approved.id}`, {
    token: tokenFor(requester),
  });

  assert.equal(fulfilled.data.request.status, "fulfilled");
  assert.ok(fulfilled.data.request.fulfilled_at);

  const received = await api(`/item-requests/${approved.id}/offers`, {
    token: tokenFor(requester),
  });

  const statuses = new Map(
    received.data.offers.map((item) => [item.id, item.status]),
  );

  assert.equal(statuses.get(offer.data.offer.id), "completed");
  assert.equal(statuses.get(pending.data.offer.id), "rejected");

  const repeat = await api(
    `/item-request-offers/${offer.data.offer.id}/confirm-handover`,
    {
      method: "PATCH",
      token: tokenFor(donorOne),
    },
  );

  assert.equal(repeat.status, 200);
  assert.equal(repeat.data.offer.status, "completed");
});

test("a confirmed handover freezes the reservation and blocks stored cancel paths", async () => {
  const approved = await createApprovedRequest();

  const offer = await createOffer(
    approved.id,
    tokenFor(donorOne),
    offerMessage("Frozen"),
  );

  await api(`/item-request-offers/${offer.data.offer.id}/accept`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  const donorConfirm = await api(
    `/item-request-offers/${offer.data.offer.id}/confirm-handover`,
    {
      method: "PATCH",
      token: tokenFor(donorOne),
    },
  );

  assert.equal(donorConfirm.status, 200);

  const cancelReservation = await api(
    `/item-request-offers/${offer.data.offer.id}/cancel`,
    {
      method: "PATCH",
      token: tokenFor(requester),
    },
  );

  assert.equal(cancelReservation.status, 409);

  const cancelRequest = await api(`/item-requests/${approved.id}/cancel`, {
    method: "PATCH",
    token: tokenFor(requester),
  });

  assert.equal(cancelRequest.status, 409);

  const withdrawAccepted = await api(
    `/item-request-offers/${offer.data.offer.id}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(donorOne),
    },
  );

  assert.equal(withdrawAccepted.status, 409);

  const complete = await api(
    `/item-request-offers/${offer.data.offer.id}/confirm-handover`,
    {
      method: "PATCH",
      token: tokenFor(requester),
    },
  );

  assert.equal(complete.status, 200);
  assert.equal(complete.data.offer.status, "completed");
});

test("concurrent offers and concurrent acceptances keep one consistent outcome", async () => {
  const approved = await createApprovedRequest();

  const offers = await Promise.all([
    createOffer(approved.id, tokenFor(donorOne), offerMessage("Race one")),
    createOffer(approved.id, tokenFor(donorTwo), offerMessage("Race two")),
  ]);

  assert.deepEqual(
    offers.map((response) => response.status),
    [201, 201],
  );

  const accepts = await Promise.all(
    offers.map((response) =>
      api(`/item-request-offers/${response.data.offer.id}/accept`, {
        method: "PATCH",
        token: tokenFor(requester),
      }),
    ),
  );

  assert.deepEqual(
    accepts.map((response) => response.status).sort(),
    [200, 409],
  );

  const reserved = await pool.query(
    `SELECT status FROM item_requests WHERE id = $1`,
    [approved.id],
  );

  assert.equal(reserved.rows[0].status, "reserved");

  const acceptedCount = await pool.query(
    `SELECT COUNT(*)::int AS total FROM item_request_offers
     WHERE request_id = $1 AND status = 'accepted'`,
    [approved.id],
  );

  assert.equal(acceptedCount.rows[0].total, 1);

  const raced = await createApprovedRequest();
  const duplicateMessage = offerMessage("Duplicate race");

  const duplicates = await Promise.all([
    createOffer(raced.id, tokenFor(donorThree), duplicateMessage),
    createOffer(raced.id, tokenFor(donorThree), duplicateMessage),
  ]);

  assert.deepEqual(
    duplicates.map((response) => response.status).sort(),
    [201, 409],
  );

  const pendingCount = await pool.query(
    `SELECT COUNT(*)::int AS total FROM item_request_offers
     WHERE request_id = $1 AND status = 'pending'`,
    [raced.id],
  );

  assert.equal(pendingCount.rows[0].total, 1);
});
