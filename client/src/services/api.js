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
