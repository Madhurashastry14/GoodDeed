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
let applicantOne;
let applicantTwo;
let organizationId;
let draftOpportunityId;
let applyOpportunityId;
let applicantApplicationId;

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
      organizationId,
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

before(async () => {
  const health = await fetch(`${API_URL}/health`);

  assert.equal(health.status, 200, "API server must be running on port 3000");

  owner = await createUser("Owner");
  admin = await createUser("Admin");
  member = await createUser("Member");
  outsider = await createUser("Outsider");
  applicantOne = await createUser("ApplicantOne");
  applicantTwo = await createUser("ApplicantTwo");

  organizationId = randomUUID();

  await pool.query(
    `INSERT INTO organizations (id, name, description, city, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [organizationId, `Test Org ${organizationId}`, "Test", "Test City", owner],
  );

  await pool.query(
    `INSERT INTO organization_members (organization_id, user_id, role)
     VALUES ($1, $2, 'owner'), ($1, $3, 'admin'), ($1, $4, 'member')`,
    [organizationId, owner, admin, member],
  );

  const created = await api("/opportunities", {
    method: "POST",
    token: tokenFor(owner),
    body: {
      organizationId,
      title: "Draft cleanup",
      description: "Help clean the park",
      city: "Test City",
      startsAt: futureIso(48),
      endsAt: futureIso(52),
      capacity: 10,
    },
  });

  assert.equal(created.status, 201, JSON.stringify(created.data));
  draftOpportunityId = created.data.opportunity.id;
});

after(async () => {
  await pool.query(
    `DELETE FROM applications
     WHERE opportunity_id IN (
       SELECT id FROM opportunities WHERE organization_id = $1
     )`,
    [organizationId],
  );
  await pool.query("DELETE FROM opportunities WHERE organization_id = $1", [
    organizationId,
  ]);
  await pool.query("DELETE FROM organization_members WHERE organization_id = $1", [
    organizationId,
  ]);
  await pool.query("DELETE FROM organizations WHERE id = $1", [organizationId]);
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
    [owner, admin, member, outsider, applicantOne, applicantTwo],
  ]);
  await pool.end();
});

test("owner sees draft opportunities", async () => {
  const response = await api(`/opportunities/organization/${organizationId}`, {
    token: tokenFor(owner),
  });

  assert.equal(response.status, 200);
  assert.ok(
    response.data.opportunities.some((o) => o.id === draftOpportunityId),
    "owner should see the draft",
  );
});

test("admin does not see draft opportunities", async () => {
  const response = await api(`/opportunities/organization/${organizationId}`, {
    token: tokenFor(admin),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data.opportunities, []);
});

test("member does not see draft opportunities", async () => {
  const response = await api(`/opportunities/organization/${organizationId}`, {
    token: tokenFor(member),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.data.opportunities, []);
});

test("public visitor does not see draft opportunities", async () => {
  const response = await api(`/opportunities/organization/${organizationId}`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.data.opportunities, []);
});

test("admin cannot create an opportunity", async () => {
  const response = await api("/opportunities", {
    method: "POST",
    token: tokenFor(admin),
    body: {
      organizationId,
      title: "Admin attempt",
      description: "Should fail",
      city: "Test City",
      startsAt: futureIso(48),
      endsAt: futureIso(52),
      capacity: 5,
    },
  });

  assert.equal(response.status, 403);
});

test("member cannot create an opportunity", async () => {
  const response = await api("/opportunities", {
    method: "POST",
    token: tokenFor(member),
    body: {
      organizationId,
      title: "Member attempt",
      description: "Should fail",
      city: "Test City",
      startsAt: futureIso(48),
      endsAt: futureIso(52),
      capacity: 5,
    },
  });

  assert.equal(response.status, 403);
});

test("outsider cannot create an opportunity", async () => {
  const response = await api("/opportunities", {
    method: "POST",
    token: tokenFor(outsider),
    body: {
      organizationId,
      title: "Outsider attempt",
      description: "Should fail",
      city: "Test City",
      startsAt: futureIso(48),
      endsAt: futureIso(52),
      capacity: 5,
    },
  });

  assert.equal(response.status, 403);
});

test("owner can view draft opportunity details", async () => {
  const response = await api(`/opportunities/${draftOpportunityId}`, {
    token: tokenFor(owner),
  });

  assert.equal(response.status, 200);
  assert.equal(response.data.opportunity.id, draftOpportunityId);
  assert.equal(response.data.opportunity.is_owner, true);
  assert.ok(response.data.opportunity.organization_name);
});

test("admin cannot view draft opportunity details", async () => {
  const response = await api(`/opportunities/${draftOpportunityId}`, {
    token: tokenFor(admin),
  });

  assert.equal(response.status, 404);
});

test("public visitor cannot view draft opportunity details", async () => {
  const response = await api(`/opportunities/${draftOpportunityId}`);

  assert.equal(response.status, 404);
});

test("owner can edit a draft opportunity", async () => {
  const response = await api(`/opportunities/${draftOpportunityId}`, {
    method: "PATCH",
    token: tokenFor(owner),
    body: {
      title: "Updated cleanup",
      capacity: 12,
    },
  });

  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.opportunity.title, "Updated cleanup");
  assert.equal(response.data.opportunity.capacity, 12);
  assert.equal(response.data.opportunity.status, "draft");
});

test("admin cannot edit an opportunity", async () => {
  const response = await api(`/opportunities/${draftOpportunityId}`, {
    method: "PATCH",
    token: tokenFor(admin),
    body: { title: "Admin edit" },
  });

  assert.equal(response.status, 403);
});

test("PATCH cannot change status", async () => {
  const response = await api(`/opportunities/${draftOpportunityId}`, {
    method: "PATCH",
    token: tokenFor(owner),
    body: { status: "published" },
  });

  assert.equal(response.status, 400);
});

test("admin cannot publish an opportunity", async () => {
  const response = await api(
    `/opportunities/${draftOpportunityId}/publish`,
    {
      method: "PATCH",
      token: tokenFor(admin),
    },
  );

  assert.equal(response.status, 403);
});

test("owner can publish a draft opportunity", async () => {
  const response = await api(
    `/opportunities/${draftOpportunityId}/publish`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.opportunity.status, "published");
});

test("published opportunity is visible to the public", async () => {
  const response = await api(`/opportunities/${draftOpportunityId}`);

  assert.equal(response.status, 200);
  assert.equal(response.data.opportunity.status, "published");
  assert.equal(response.data.opportunity.is_owner, false);
});

test("publishing a published opportunity is rejected", async () => {
  const response = await api(
    `/opportunities/${draftOpportunityId}/publish`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(response.status, 409);
});

test("publishing a draft whose start time has passed is rejected", async () => {
  const pastDraftId = await insertOpportunity({
    status: "draft",
    startHours: -4,
    endHours: 4,
  });

  const response = await api(`/opportunities/${pastDraftId}/publish`, {
    method: "PATCH",
    token: tokenFor(owner),
  });

  assert.equal(response.status, 409);
});

test("admin cannot cancel an opportunity", async () => {
  const response = await api(
    `/opportunities/${draftOpportunityId}/cancel`,
    {
      method: "PATCH",
      token: tokenFor(admin),
    },
  );

  assert.equal(response.status, 403);
});

test("owner can cancel a published opportunity", async () => {
  const response = await api(
    `/opportunities/${draftOpportunityId}/cancel`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.data.opportunity.status, "cancelled");
});

test("cancelled opportunity is hidden from the public", async () => {
  const response = await api(`/opportunities/${draftOpportunityId}`);

  assert.equal(response.status, 404);
});

test("cancelling a cancelled opportunity is rejected", async () => {
  const response = await api(
    `/opportunities/${draftOpportunityId}/cancel`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(response.status, 409);
});

test("completing a future published opportunity is rejected", async () => {
  const futureId = await insertOpportunity({
    status: "published",
    startHours: 4,
    endHours: 8,
  });

  const response = await api(`/opportunities/${futureId}/complete`, {
    method: "PATCH",
    token: tokenFor(owner),
  });

  assert.equal(response.status, 409);
});

test("owner can complete a published opportunity after it ends", async () => {
  const pastId = await insertOpportunity({
    status: "published",
    startHours: -8,
    endHours: -4,
  });

  const response = await api(`/opportunities/${pastId}/complete`, {
    method: "PATCH",
    token: tokenFor(owner),
  });

  assert.equal(response.status, 200);
  assert.equal(response.data.opportunity.status, "completed");
});

test("non-draft opportunities cannot be deleted", async () => {
  const publishedId = await insertOpportunity({ status: "published" });

  const response = await api(`/opportunities/${publishedId}`, {
    method: "DELETE",
    token: tokenFor(owner),
  });

  assert.equal(response.status, 409);
});

test("admin cannot delete a draft opportunity", async () => {
  const draftId = await insertOpportunity({ status: "draft" });

  const response = await api(`/opportunities/${draftId}`, {
    method: "DELETE",
    token: tokenFor(admin),
  });

  assert.equal(response.status, 403);
});

test("owner can delete a draft opportunity", async () => {
  const draftId = await insertOpportunity({ status: "draft" });

  const deleted = await api(`/opportunities/${draftId}`, {
    method: "DELETE",
    token: tokenFor(owner),
  });

  assert.equal(deleted.status, 204);

  const response = await api(`/opportunities/${draftId}`, {
    token: tokenFor(owner),
  });

  assert.equal(response.status, 404);
});

test("public listing includes only published opportunities", async () => {
  const publishedId = await insertOpportunity({
    status: "published",
    title: "Beach Cleanup Alpha",
    city: "Alpha City",
  });
  const draftId = await insertOpportunity({
    status: "draft",
    title: "Beach Cleanup Alpha Draft",
    city: "Alpha City",
  });
  const cancelledId = await insertOpportunity({
    status: "cancelled",
    title: "Beach Cleanup Alpha Cancelled",
    city: "Alpha City",
  });
  const completedId = await insertOpportunity({
    status: "completed",
    title: "Beach Cleanup Alpha Completed",
    city: "Alpha City",
  });

  const response = await api(
    "/opportunities?search=Beach Cleanup Alpha&limit=50",
  );

  assert.equal(response.status, 200);

  const ids = response.data.opportunities.map((item) => item.id);

  assert.ok(ids.includes(publishedId));
  assert.ok(!ids.includes(draftId));
  assert.ok(!ids.includes(cancelledId));
  assert.ok(!ids.includes(completedId));
});

test("public listing can filter by city", async () => {
  const response = await api("/opportunities?city=Alpha City&limit=50");

  assert.equal(response.status, 200);
  assert.ok(
    response.data.opportunities.every(
      (item) => item.city.toLowerCase() === "alpha city",
    ),
  );
});

test("public listing can filter to upcoming opportunities", async () => {
  const pastId = await insertOpportunity({
    status: "published",
    title: "Beach Beta Past",
    startHours: -8,
    endHours: -4,
  });
  const futureId = await insertOpportunity({
    status: "published",
    title: "Beach Beta Future",
    startHours: 24,
    endHours: 28,
  });

  const response = await api(
    "/opportunities?search=Beach Beta&upcoming=true&limit=50",
  );

  assert.equal(response.status, 200);

  const ids = response.data.opportunities.map((item) => item.id);

  assert.ok(ids.includes(futureId));
  assert.ok(!ids.includes(pastId));
});

test("public listing can sort by start date", async () => {
  const response = await api(
    "/opportunities?search=Beach Beta&sort=start_desc&limit=50",
  );

  assert.equal(response.status, 200);
  assert.equal(response.data.opportunities.length, 2);

  const [first, second] = response.data.opportunities;

  assert.ok(new Date(first.starts_at) > new Date(second.starts_at));
});

test("public listing supports pagination", async () => {
  for (let index = 0; index < 3; index += 1) {
    await insertOpportunity({
      status: "published",
      title: `Page Gamma ${index}`,
      startHours: 24 + index,
      endHours: 28 + index,
    });
  }

  const firstPage = await api(
    "/opportunities?search=Page Gamma&limit=2&page=1",
  );
  const secondPage = await api(
    "/opportunities?search=Page Gamma&limit=2&page=2",
  );

  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.data.total, 3);
  assert.equal(firstPage.data.opportunities.length, 2);
  assert.equal(secondPage.data.opportunities.length, 1);
});

test("public listing rejects invalid filters", async () => {
  const badSort = await api("/opportunities?sort=invalid");
  const badLimit = await api("/opportunities?limit=999");

  assert.equal(badSort.status, 400);
  assert.equal(badLimit.status, 400);
});

test("applicant can apply to a published opportunity", async () => {
  const opportunityId = await insertOpportunity({
    status: "published",
    title: "Apply Alpha",
    capacity: 2,
  });

  const response = await api(`/opportunities/${opportunityId}/applications`, {
    method: "POST",
    token: tokenFor(applicantOne),
  });

  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.application.status, "pending");

  applyOpportunityId = opportunityId;
  applicantApplicationId = response.data.application.id;
});

test("duplicate applications are rejected", async () => {
  const response = await api(
    `/opportunities/${applyOpportunityId}/applications`,
    {
      method: "POST",
      token: tokenFor(applicantOne),
    },
  );

  assert.equal(response.status, 409);
});

test("organization owner cannot apply to their own opportunity", async () => {
  const response = await api(
    `/opportunities/${applyOpportunityId}/applications`,
    {
      method: "POST",
      token: tokenFor(owner),
    },
  );

  assert.equal(response.status, 403);
});

test("applications are closed for draft opportunities", async () => {
  const draftId = await insertOpportunity({ status: "draft" });

  const response = await api(`/opportunities/${draftId}/applications`, {
    method: "POST",
    token: tokenFor(applicantOne),
  });

  assert.equal(response.status, 409);
});

test("users only see their own applications", async () => {
  const mine = await api("/opportunity-applications/mine", {
    token: tokenFor(applicantOne),
  });
  const other = await api("/opportunity-applications/mine", {
    token: tokenFor(applicantTwo),
  });

  assert.equal(mine.status, 200);
  assert.ok(
    mine.data.applications.some(
      (application) => application.id === applicantApplicationId,
    ),
  );
  assert.deepEqual(other.data.applications, []);
});

test("non-owner cannot view opportunity applicants", async () => {
  const response = await api(
    `/opportunities/${applyOpportunityId}/applications`,
    {
      token: tokenFor(applicantTwo),
    },
  );

  assert.equal(response.status, 403);
});

test("owner can view opportunity applicants", async () => {
  const response = await api(
    `/opportunities/${applyOpportunityId}/applications`,
    {
      token: tokenFor(owner),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.data.opportunity.accepted_count, 0);
  assert.equal(response.data.opportunity.remaining_capacity, 2);
  assert.ok(
    response.data.applications.some(
      (application) =>
        application.id === applicantApplicationId &&
        application.applicant_name === "ApplicantOne",
    ),
  );
});

test("owner can accept a pending application", async () => {
  const response = await api(
    `/opportunity-applications/${applicantApplicationId}/accept`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(response.status, 200, JSON.stringify(response.data));
  assert.equal(response.data.application.status, "accepted");

  const applicants = await api(
    `/opportunities/${applyOpportunityId}/applications`,
    {
      token: tokenFor(owner),
    },
  );

  assert.equal(applicants.data.opportunity.accepted_count, 1);
  assert.equal(applicants.data.opportunity.remaining_capacity, 1);
});

test("accepting an already accepted application is rejected", async () => {
  const response = await api(
    `/opportunity-applications/${applicantApplicationId}/accept`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(response.status, 409);
});

test("accepting applicants cannot exceed capacity", async () => {
  const opportunityId = await insertOpportunity({
    status: "published",
    title: "Apply Capacity",
    capacity: 1,
  });

  const first = await api(`/opportunities/${opportunityId}/applications`, {
    method: "POST",
    token: tokenFor(applicantOne),
  });
  const second = await api(`/opportunities/${opportunityId}/applications`, {
    method: "POST",
    token: tokenFor(applicantTwo),
  });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const accepted = await api(
    `/opportunity-applications/${first.data.application.id}/accept`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(accepted.status, 200);

  const overCapacity = await api(
    `/opportunity-applications/${second.data.application.id}/accept`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(overCapacity.status, 409);

  const rejected = await api(
    `/opportunity-applications/${second.data.application.id}/reject`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.application.status, "rejected");

  const withdrawn = await api(
    `/opportunity-applications/${first.data.application.id}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(applicantOne),
    },
  );

  assert.equal(withdrawn.status, 200);
  assert.equal(withdrawn.data.application.status, "withdrawn");

  const applicants = await api(
    `/opportunities/${opportunityId}/applications`,
    {
      token: tokenFor(owner),
    },
  );

  assert.equal(applicants.data.opportunity.accepted_count, 0);
});

test("applicants can only withdraw their own applications", async () => {
  const applied = await api(
    `/opportunities/${applyOpportunityId}/applications`,
    {
      method: "POST",
      token: tokenFor(applicantTwo),
    },
  );

  assert.equal(applied.status, 201);

  const applicationId = applied.data.application.id;

  const notOwner = await api(
    `/opportunity-applications/${applicationId}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(applicantOne),
    },
  );

  assert.equal(notOwner.status, 403);

  const nonOwnerAccept = await api(
    `/opportunity-applications/${applicationId}/accept`,
    {
      method: "PATCH",
      token: tokenFor(applicantTwo),
    },
  );

  assert.equal(nonOwnerAccept.status, 403);

  const withdrawn = await api(
    `/opportunity-applications/${applicationId}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(applicantTwo),
    },
  );

  assert.equal(withdrawn.status, 200);
});

test("applications cannot be withdrawn after the opportunity starts", async () => {
  const pastId = await insertOpportunity({
    status: "published",
    startHours: -8,
    endHours: -4,
  });

  const applicationId = await insertApplication({
    opportunityId: pastId,
    userId: applicantOne,
  });

  const response = await api(
    `/opportunity-applications/${applicationId}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(applicantOne),
    },
  );

  assert.equal(response.status, 409);
});

test("organization opportunity listing validates the organization", async () => {
  const missing = await api(
    `/opportunities/organization/${randomUUID()}`,
  );
  const malformed = await api("/opportunities/organization/not-a-uuid");

  assert.equal(missing.status, 404);
  assert.equal(malformed.status, 400);
});

test("my applications include withdraw eligibility", async () => {
  const response = await api("/opportunity-applications/mine", {
    token: tokenFor(applicantOne),
  });

  assert.equal(response.status, 200);

  const application = response.data.applications.find(
    (item) => item.id === applicantApplicationId,
  );

  assert.ok(application);
  assert.equal(application.can_withdraw, true);
});

test("admin cannot view opportunity applicants", async () => {
  const response = await api(
    `/opportunities/${applyOpportunityId}/applications`,
    {
      token: tokenFor(admin),
    },
  );

  assert.equal(response.status, 403);
});

test("applications are rejected when accepted capacity is full", async () => {
  const opportunityId = await insertOpportunity({
    status: "published",
    title: "Apply Full",
    capacity: 1,
  });

  const application = await api(
    `/opportunities/${opportunityId}/applications`,
    {
      method: "POST",
      token: tokenFor(applicantOne),
    },
  );

  assert.equal(application.status, 201);

  const accepted = await api(
    `/opportunity-applications/${application.data.application.id}/accept`,
    {
      method: "PATCH",
      token: tokenFor(owner),
    },
  );

  assert.equal(accepted.status, 200);

  const full = await api(
    `/opportunities/${opportunityId}/applications`,
    {
      method: "POST",
      token: tokenFor(outsider),
    },
  );

  assert.equal(full.status, 409);
});

test("withdrawn applications cannot be submitted again", async () => {
  const opportunityId = await insertOpportunity({
    status: "published",
    title: "Apply Withdraw Again",
  });

  const applied = await api(
    `/opportunities/${opportunityId}/applications`,
    {
      method: "POST",
      token: tokenFor(applicantOne),
    },
  );

  const withdrawn = await api(
    `/opportunity-applications/${applied.data.application.id}/withdraw`,
    {
      method: "PATCH",
      token: tokenFor(applicantOne),
    },
  );

  assert.equal(withdrawn.status, 200);

  const reapply = await api(
    `/opportunities/${opportunityId}/applications`,
    {
      method: "POST",
      token: tokenFor(applicantOne),
    },
  );

  assert.equal(reapply.status, 409);
});

test("concurrent accepts cannot exceed capacity", async () => {
  const opportunityId = await insertOpportunity({
    status: "published",
    title: "Apply Race",
    capacity: 1,
  });

  const first = await api(
    `/opportunities/${opportunityId}/applications`,
    {
      method: "POST",
      token: tokenFor(applicantOne),
    },
  );
  const second = await api(
    `/opportunities/${opportunityId}/applications`,
    {
      method: "POST",
      token: tokenFor(applicantTwo),
    },
  );

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const results = await Promise.all([
    api(
      `/opportunity-applications/${first.data.application.id}/accept`,
      {
        method: "PATCH",
        token: tokenFor(owner),
      },
    ),
    api(
      `/opportunity-applications/${second.data.application.id}/accept`,
      {
        method: "PATCH",
        token: tokenFor(owner),
      },
    ),
  ]);

  const statuses = results.map((result) => result.status).sort();

  assert.deepEqual(statuses, [200, 409]);

  const accepted = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM applications
     WHERE opportunity_id = $1 AND status = 'accepted'`,
    [opportunityId],
  );

  assert.equal(accepted.rows[0].count, 1);
});
