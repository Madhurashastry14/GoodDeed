const path = require("path");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("crypto");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const jwt = require("jsonwebtoken");
const pool = require("../src/config/db");

const API_URL = "http://localhost:3000/api";

let owner;
let admin;
let member;
let outsider;
let volunteerA;
let volunteerB;
let emptyOwner;

let organizationId;
let emptyOrganizationId;

let draftId;
let upcomingOneId;
let upcomingTwoId;
let completedId;
let cancelledId;
let pendingApplicationId;

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

  return id;
}

function futureIso(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

async function insertOpportunity({
  organization = organizationId,
  title,
  status = "draft",
  startHours = 24,
  endHours = 28,
  capacity = 5,
  city = "Test City",
} = {}) {
  const id = randomUUID();

  await pool.query(
    `INSERT INTO opportunities (
       id, organization_id, title, description, city,
       starts_at, ends_at, capacity, status, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      organization,
      title || `Fixture ${id}`,
      "Fixture description",
      city,
      futureIso(startHours),
      futureIso(endHours),
      capacity,
      status,
      owner,
    ],
  );

  return id;
}

async function insertApplication({
  opportunityId,
  userId,
  status = "pending",
}) {
  const id = randomUUID();

  await pool.query(
    `INSERT INTO applications (id, opportunity_id, user_id, status)
     VALUES ($1, $2, $3, $4)`,
    [id, opportunityId, userId, status],
  );

  return id;
}

async function getDashboard(token = tokenFor(owner)) {
  return api(`/organizations/${organizationId}/dashboard`, { token });
}

before(async () => {
  const health = await fetch(`${API_URL}/health`);

  assert.equal(health.status, 200, "API server must be running on port 3000");

  owner = await createUser("DashboardOwner");
  admin = await createUser("DashboardAdmin");
  member = await createUser("DashboardMember");
  outsider = await createUser("DashboardOutsider");
  volunteerA = await createUser("DashboardVolunteerA");
  volunteerB = await createUser("DashboardVolunteerB");
  emptyOwner = await createUser("DashboardEmptyOwner");

  organizationId = randomUUID();
  emptyOrganizationId = randomUUID();

  await pool.query(
    `INSERT INTO organizations (id, name, description, city, created_by)
     VALUES
       ($1, $2, $3, $4, $5),
       ($6, $7, $8, $9, $10)`,
    [
      organizationId,
      `Dashboard Org ${organizationId}`,
      "Dashboard test organization",
      "Test City",
      owner,
      emptyOrganizationId,
      `Empty Dashboard Org ${emptyOrganizationId}`,
      "Organization without opportunities",
      "Empty City",
      emptyOwner,
    ],
  );

  await pool.query(
    `INSERT INTO organization_members (organization_id, user_id, role)
     VALUES
       ($1, $2, 'owner'),
       ($1, $3, 'admin'),
       ($1, $4, 'member'),
       ($5, $6, 'owner')`,
    [organizationId, owner, admin, member, emptyOrganizationId, emptyOwner],
  );

  draftId = await insertOpportunity({
    title: "Dashboard Draft",
    status: "draft",
    startHours: 24,
    endHours: 28,
  });

  upcomingOneId = await insertOpportunity({
    title: "Dashboard Upcoming One",
    status: "published",
    startHours: 24,
    endHours: 28,
  });

  upcomingTwoId = await insertOpportunity({
    title: "Dashboard Upcoming Two",
    status: "published",
    startHours: 72,
    endHours: 76,
    capacity: 10,
  });

  completedId = await insertOpportunity({
    title: "Dashboard Completed",
    status: "completed",
    startHours: -48,
    endHours: -44,
  });

  cancelledId = await insertOpportunity({
    title: "Dashboard Cancelled",
    status: "cancelled",
    startHours: 48,
    endHours: 52,
  });

  pendingApplicationId = await insertApplication({
    opportunityId: upcomingOneId,
    userId: volunteerA,
    status: "pending",
  });

  await insertApplication({
    opportunityId: upcomingOneId,
    userId: volunteerB,
    status: "accepted",
  });

  await insertApplication({
    opportunityId: upcomingTwoId,
    userId: volunteerA,
    status: "accepted",
  });

  await insertApplication({
    opportunityId: draftId,
    userId: volunteerA,
    status: "rejected",
  });
});

after(async () => {
  await pool.query(
    `DELETE FROM applications
     WHERE opportunity_id IN (
       SELECT id FROM opportunities WHERE organization_id = ANY($1::uuid[])
     )`,
    [[organizationId, emptyOrganizationId]],
  );
  await pool.query(
    "DELETE FROM opportunities WHERE organization_id = ANY($1::uuid[])",
    [[organizationId, emptyOrganizationId]],
  );
  await pool.query(
    "DELETE FROM organization_members WHERE organization_id = ANY($1::uuid[])",
    [[organizationId, emptyOrganizationId]],
  );
  await pool.query(
    "DELETE FROM organizations WHERE id = ANY($1::uuid[])",
    [[organizationId, emptyOrganizationId]],
  );
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
    [owner, admin, member, outsider, volunteerA, volunteerB, emptyOwner],
  ]);
  await pool.end();
});

test("owner receives dashboard statistics from actual records", async () => {
  const response = await getDashboard();

  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.organization.id, organizationId);

  const stats = response.data.statistics;

  assert.equal(stats.total_opportunities, 5);
  assert.equal(stats.draft_opportunities, 1);
  assert.equal(stats.published_opportunities, 2);
  assert.equal(stats.completed_opportunities, 1);
  assert.equal(stats.cancelled_opportunities, 1);
  assert.equal(stats.pending_applications, 1);
  assert.equal(stats.accepted_applications, 2);
  assert.equal(stats.unique_accepted_volunteers, 2);
  assert.equal(stats.upcoming_published_opportunities, 2);

  // Summary statistics must not expose volunteer identities.
  assert.ok(!JSON.stringify(response.data).includes("@example.test"));
});

test("upcoming opportunities include only future published opportunities", async () => {
  const response = await getDashboard();

  const ids = response.data.upcoming_opportunities.map((item) => item.id);

  assert.deepEqual(ids, [upcomingOneId, upcomingTwoId]);
  assert.ok(!ids.includes(completedId));
  assert.ok(!ids.includes(cancelledId));
  assert.ok(!ids.includes(draftId));

  const first = response.data.upcoming_opportunities[0];

  assert.equal(first.title, "Dashboard Upcoming One");
  assert.equal(first.city, "Test City");
  assert.equal(first.capacity, 5);
  assert.equal(first.accepted_count, 1);
  assert.equal(first.pending_application_count, 1);
  assert.ok(first.starts_at);
});

test("pending application opportunities are grouped by opportunity", async () => {
  const response = await getDashboard();
  const pending = response.data.pending_application_opportunities;

  assert.equal(pending.length, 1);
  assert.equal(pending[0].id, upcomingOneId);
  assert.equal(pending[0].title, "Dashboard Upcoming One");
  assert.equal(pending[0].pending_application_count, 1);
});

test("unauthenticated users cannot access the dashboard", async () => {
  const response = await api(`/organizations/${organizationId}/dashboard`);

  assert.equal(response.status, 401);
});

test("admin, member, and unrelated users receive 403", async () => {
  for (const userId of [admin, member, outsider]) {
    const response = await getDashboard(tokenFor(userId));

    assert.equal(
      response.status,
      403,
      `expected 403 for user ${userId}, got ${response.status}`,
    );
  }
});

test("dashboard validates the organization id", async () => {
  const malformed = await api("/organizations/not-a-uuid/dashboard", {
    token: tokenFor(owner),
  });
  const randomOrg = await api(`/organizations/${randomUUID()}/dashboard`, {
    token: tokenFor(owner),
  });

  assert.equal(malformed.status, 400);
  assert.equal(randomOrg.status, 404);
});

test("organization with no opportunities returns zero values", async () => {
  const response = await api(
    `/organizations/${emptyOrganizationId}/dashboard`,
    { token: tokenFor(emptyOwner) },
  );

  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.deepEqual(response.data.statistics, {
    total_opportunities: 0,
    draft_opportunities: 0,
    published_opportunities: 0,
    completed_opportunities: 0,
    cancelled_opportunities: 0,
    pending_applications: 0,
    accepted_applications: 0,
    unique_accepted_volunteers: 0,
    upcoming_published_opportunities: 0,
  });
  assert.deepEqual(response.data.upcoming_opportunities, []);
  assert.deepEqual(response.data.pending_application_opportunities, []);
});

test("statistics update after accepting and rejecting applications", async () => {
  const accepted = await api(
    `/opportunity-applications/${pendingApplicationId}/accept`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(accepted.status, 200, JSON.stringify(accepted.data));

  let response = await getDashboard();

  assert.equal(response.data.statistics.pending_applications, 0);
  assert.equal(response.data.statistics.accepted_applications, 3);
  assert.equal(response.data.statistics.unique_accepted_volunteers, 2);
  assert.deepEqual(response.data.pending_application_opportunities, []);
  assert.equal(
    response.data.upcoming_opportunities[0].accepted_count,
    2,
  );

  const applied = await api(
    `/opportunities/${upcomingTwoId}/applications`,
    {
      method: "POST",
      token: tokenFor(member),
    },
  );

  assert.equal(applied.status, 201, JSON.stringify(applied.data));

  response = await getDashboard();
  assert.equal(response.data.statistics.pending_applications, 1);

  const rejected = await api(
    `/opportunity-applications/${applied.data.application.id}/reject`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(rejected.status, 200, JSON.stringify(rejected.data));

  response = await getDashboard();
  assert.equal(response.data.statistics.pending_applications, 0);
  assert.equal(response.data.statistics.accepted_applications, 3);
});

test("opportunity counts update after publishing and cancelling", async () => {
  const published = await api(`/opportunities/${draftId}/publish`, {
    method: "PATCH",
    token: tokenFor(owner),
  });

  assert.equal(published.status, 200, JSON.stringify(published.data));

  let response = await getDashboard();

  assert.equal(response.data.statistics.draft_opportunities, 0);
  assert.equal(response.data.statistics.published_opportunities, 3);
  assert.equal(response.data.statistics.upcoming_published_opportunities, 3);

  const cancelled = await api(`/opportunities/${upcomingTwoId}/cancel`, {
    method: "PATCH",
    token: tokenFor(owner),
  });

  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.data));

  response = await getDashboard();

  assert.equal(response.data.statistics.published_opportunities, 2);
  assert.equal(response.data.statistics.cancelled_opportunities, 2);
  assert.equal(response.data.statistics.upcoming_published_opportunities, 2);
  assert.ok(
    !response.data.upcoming_opportunities.some(
      (item) => item.id === upcomingTwoId,
    ),
  );
});

test("completed counts update when a finished opportunity is completed", async () => {
  const pastPublishedId = await insertOpportunity({
    title: "Dashboard Past Published",
    status: "published",
    startHours: -8,
    endHours: -4,
  });

  let response = await getDashboard();

  assert.equal(response.data.statistics.total_opportunities, 6);
  assert.equal(response.data.statistics.published_opportunities, 3);
  assert.equal(response.data.statistics.completed_opportunities, 1);
  assert.ok(
    !response.data.upcoming_opportunities.some(
      (item) => item.id === pastPublishedId,
    ),
  );

  const completed = await api(`/opportunities/${pastPublishedId}/complete`, {
    method: "PATCH",
    token: tokenFor(owner),
  });

  assert.equal(completed.status, 200, JSON.stringify(completed.data));

  response = await getDashboard();

  assert.equal(response.data.statistics.published_opportunities, 2);
  assert.equal(response.data.statistics.completed_opportunities, 2);
  assert.equal(response.data.statistics.upcoming_published_opportunities, 2);
});
