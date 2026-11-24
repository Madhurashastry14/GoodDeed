const API_URL = "http://localhost:3000/api/auth";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}

export function registerUser(userData) {
  return request("/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export function loginUser(credentials) {
  return request("/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function refreshToken() {
  return request("/refresh", {
    method: "POST",
  });
}

export function logoutUser() {
  return request("/logout", {
    method: "POST",
  });
}

const ORGANIZATIONS_URL = "http://localhost:3000/api/organizations";

export async function getOrganizations() {
  const response = await fetch(ORGANIZATIONS_URL);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch organizations");
  }

  return data;
}

export async function getOrganizationById(id) {
  const response = await fetch(`${ORGANIZATIONS_URL}/${id}`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch organization");
  }

  return data;
}

export async function getOrganizationMembers(id) {
  const response = await fetch(`${ORGANIZATIONS_URL}/${id}/members`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch members");
  }

  return data;
}

export async function createOrganization(organizationData, accessToken) {
  const response = await fetch("http://localhost:3000/api/organizations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
    body: JSON.stringify(organizationData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to create organization");
  }

  return data;
}

export async function getMyOrganizations(accessToken) {
  const response = await fetch("http://localhost:3000/api/organizations/mine", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch your organizations");
  }

  return data;
}

export async function getOrganizationDashboard(organizationId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/organizations/${organizationId}/dashboard`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch organization dashboard");
  }

  return data;
}

export async function getMyProfile(accessToken) {
  const response = await fetch("http://localhost:3000/api/users/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to load profile");
  }

  return data;
}

export async function updateMyProfile(profileData, accessToken) {
  const response = await fetch("http://localhost:3000/api/users/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
    body: JSON.stringify(profileData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to update profile");
  }

  return data;
}

export async function updateOrganization(id, organizationData, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/organizations/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
      body: JSON.stringify(organizationData),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to update organization");
  }

  return data;
}

export async function deleteOrganization(id, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/organizations/${id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  // DELETE may return 204 No Content.
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || "Failed to delete organization");
  }

  return data;
}

export async function addOrganizationMember(
  organizationId,
  userId,
  accessToken,
) {
  const response = await fetch(
    `http://localhost:3000/api/organizations/${organizationId}/members`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
      body: JSON.stringify({ userId }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to add member");
  }

  return data;
}

export async function removeOrganizationMember(
  organizationId,
  userId,
  accessToken,
) {
  const response = await fetch(
    `http://localhost:3000/api/organizations/${organizationId}/members/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to remove member");
  }

  return data;
}

export async function getOrganizationOpportunities(
  organizationId,
  accessToken,
) {
  const response = await fetch(
    `http://localhost:3000/api/opportunities/organization/${organizationId}`,
    {
      method: "GET",
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch opportunities");
  }

  return data;
}

export async function getPublicOpportunities(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  const response = await fetch(
    `http://localhost:3000/api/opportunities${query ? `?${query}` : ""}`,
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch opportunities");
  }

  return data;
}

export async function getOpportunityById(opportunityId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/opportunities/${opportunityId}`,
    {
      method: "GET",
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch opportunity");
  }

  return data;
}

export async function updateOpportunity(
  opportunityId,
  opportunityData,
  accessToken,
) {
  const response = await fetch(
    `http://localhost:3000/api/opportunities/${opportunityId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
      body: JSON.stringify(opportunityData),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to update opportunity");
  }

  return data;
}

export async function publishOpportunity(opportunityId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/opportunities/${opportunityId}/publish`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to publish opportunity");
  }

  return data;
}

export async function cancelOpportunity(opportunityId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/opportunities/${opportunityId}/cancel`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to cancel opportunity");
  }

  return data;
}

export async function completeOpportunity(opportunityId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/opportunities/${opportunityId}/complete`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to complete opportunity");
  }

  return data;
}

export async function deleteOpportunity(opportunityId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/opportunities/${opportunityId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  // DELETE returns 204 No Content on success.
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || "Failed to delete opportunity");
  }

  return data;
}

export async function createOpportunity(opportunityData, accessToken) {
  const response = await fetch("http://localhost:3000/api/opportunities", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    credentials: "include",
    body: JSON.stringify(opportunityData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to create opportunity");
  }

  return data;
}

export async function applyToOpportunity(opportunityId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/opportunities/${opportunityId}/applications`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to submit application");
  }

  return data;
}

export async function getMyApplications(accessToken) {
  const response = await fetch(
    "http://localhost:3000/api/opportunity-applications/mine",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch applications");
  }

  return data;
}

export async function getOpportunityApplications(opportunityId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/opportunities/${opportunityId}/applications`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch applicants");
  }

  return data;
}

export async function acceptApplication(applicationId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/opportunity-applications/${applicationId}/accept`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to accept application");
  }

  return data;
}

export async function rejectApplication(applicationId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/opportunity-applications/${applicationId}/reject`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to reject application");
  }

  return data;
}

export async function withdrawApplication(applicationId, accessToken) {
  const response = await fetch(
    `http://localhost:3000/api/opportunity-applications/${applicationId}/withdraw`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to withdraw application");
  }

  return data;
}

/* ------------------------------------------------------------------ */
/* Free item sharing and item claims                                  */
/* ------------------------------------------------------------------ */

const API_BASE = "http://localhost:3000/api";
const ITEMS_URL = `${API_BASE}/items`;
const ITEM_CLAIMS_URL = `${API_BASE}/item-claims`;

async function itemRequest(url, { method = "GET", accessToken, body } = {}) {
  const headers = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // DELETE returns 204 No Content on success.
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

export function getItems(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();

  return itemRequest(`${ITEMS_URL}${query ? `?${query}` : ""}`);
}

export function getMyItems(accessToken) {
  return itemRequest(`${ITEMS_URL}/mine`, { accessToken });
}

export function getItemById(itemId, accessToken) {
  return itemRequest(`${ITEMS_URL}/${itemId}`, { accessToken });
}

export function createItem(itemData, accessToken) {
  return itemRequest(ITEMS_URL, {
    method: "POST",
    accessToken,
    body: itemData,
  });
}

export function updateItem(itemId, itemData, accessToken) {
  return itemRequest(`${ITEMS_URL}/${itemId}`, {
    method: "PATCH",
    accessToken,
    body: itemData,
  });
}

export function closeItem(itemId, accessToken) {
  return itemRequest(`${ITEMS_URL}/${itemId}/close`, {
    method: "PATCH",
    accessToken,
  });
}

export function removeItem(itemId, accessToken) {
  return itemRequest(`${ITEMS_URL}/${itemId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function createItemClaim(itemId, message, accessToken) {
  return itemRequest(`${ITEMS_URL}/${itemId}/claims`, {
    method: "POST",
    accessToken,
    body: { message: message?.trim() || null },
  });
}

export function getReceivedClaims(itemId, accessToken) {
  return itemRequest(`${ITEMS_URL}/${itemId}/claims`, { accessToken });
}

export function getMyClaims(accessToken) {
  return itemRequest(`${ITEM_CLAIMS_URL}/me`, { accessToken });
}

export function getItemClaim(claimId, accessToken) {
  return itemRequest(`${ITEM_CLAIMS_URL}/${claimId}`, { accessToken });
}

export function acceptItemClaim(claimId, accessToken) {
  return itemRequest(`${ITEM_CLAIMS_URL}/${claimId}/accept`, {
    method: "PATCH",
    accessToken,
  });
}

export function rejectItemClaim(claimId, accessToken) {
  return itemRequest(`${ITEM_CLAIMS_URL}/${claimId}/reject`, {
    method: "PATCH",
    accessToken,
  });
}

export function withdrawItemClaim(claimId, accessToken) {
  return itemRequest(`${ITEM_CLAIMS_URL}/${claimId}/withdraw`, {
    method: "PATCH",
    accessToken,
  });
}

export function cancelItemReservation(claimId, accessToken) {
  return itemRequest(`${ITEM_CLAIMS_URL}/${claimId}/cancel`, {
    method: "PATCH",
    accessToken,
  });
}

export function updateItemHandover(claimId, details, accessToken) {
  return itemRequest(`${ITEM_CLAIMS_URL}/${claimId}/handover`, {
    method: "PATCH",
    accessToken,
    body: details,
  });
}

export function confirmItemHandover(claimId, accessToken) {
  return itemRequest(`${ITEM_CLAIMS_URL}/${claimId}/confirm-handover`, {
    method: "PATCH",
    accessToken,
  });
}
