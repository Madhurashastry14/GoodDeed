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
