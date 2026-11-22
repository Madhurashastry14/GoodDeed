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
let organizationId;
let draftOpportunityId;

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

before(async () => {
  const health = await fetch(`${API_URL}/health`);

  assert.equal(health.status, 200, "API server must be running on port 3000");

  owner = await createUser("Owner");
  admin = await createUser("Admin");
  member = await createUser("Member");
  outsider = await createUser("Outsider");

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
  await pool.query("DELETE FROM applications WHERE opportunity_id = $1", [
    draftOpportunityId,
  ]);
  await pool.query("DELETE FROM opportunities WHERE organization_id = $1", [
    organizationId,
  ]);
  await pool.query("DELETE FROM organization_members WHERE organization_id = $1", [
    organizationId,
  ]);
  await pool.query("DELETE FROM organizations WHERE id = $1", [organizationId]);
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
    [owner, admin, member, outsider],
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
