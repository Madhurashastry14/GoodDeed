# GoodDeed API Documentation

**Tagline:** Small actions, real impact.

**Base URL:** `http://localhost:3000/api`

**Backend:** Node.js, Express.js, PostgreSQL

## 1. Overview

GoodDeed is a community-impact platform that connects individuals, NGOs, and communities through volunteering, free-item sharing, help requests, and community initiatives.

This document defines the API endpoints, authentication requirements, request formats, and intended behavior.

**Status convention**

- **Implemented:** Exists in the backend; verify with tests.
- **Planned:** Intended for a future implementation.

## 2. General Conventions

- Request and response bodies use JSON.
- Resource identifiers use UUIDs.
- Protected endpoints require `Authorization: Bearer <access_token>`.
- Refresh tokens use HTTP-only cookies if configured by the authentication implementation.
- Clients must not supply trusted identity or authorization roles directly; the backend determines them from authentication and database records.
- Error responses follow this format:

```json
{
  "error": "Description of the error"
}
```

## 3. Authentication

| Method | Endpoint         | Access        | Description                                 |
| ------ | ---------------- | ------------- | ------------------------------------------- |
| POST   | `/auth/register` | Public        | Register a user                             |
| POST   | `/auth/login`    | Public        | Authenticate a user                         |
| POST   | `/auth/refresh`  | Refresh token | Refresh access credentials                  |
| POST   | `/auth/logout`   | Authenticated | Log out and handle refresh-token revocation |

\*Verify each endpoint against the current implementation.

## 4. User Profiles

**Status: Planned unless already implemented.**

| Method | Endpoint             | Access                     | Description                              |
| ------ | -------------------- | -------------------------- | ---------------------------------------- |
| GET    | `/users/me`          | Authenticated              | Retrieve the current user's profile      |
| PATCH  | `/users/me`          | Authenticated              | Update the current user's profile        |
| GET    | `/users/:id`         | Public profile fields only | View a user's public profile             |
| PATCH  | `/users/me/password` | Authenticated              | Change the account password              |
| DELETE | `/users/me`          | Authenticated              | Request account deactivation or deletion |

Profile fields may include name, bio, city, interests, and other explicitly public information.

Sensitive account information must not be exposed through public profile endpoints.

## 5. Organizations and NGOs

| Method | Endpoint                                | Access        | Description                              |
| ------ | --------------------------------------- | ------------- | ---------------------------------------- |
| GET    | `/organizations`                        | Public        | List organizations                       |
| POST   | `/organizations`                        | Authenticated | Create an organization                   |
| GET    | `/organizations/mine`                   | Authenticated | List the current user's organizations    |
| GET    | `/organizations/:id`                    | Public        | Retrieve organization details            |
| GET    | `/organizations/:id/members`            | Public        | List organization members                |
| PATCH  | `/organizations/:id`                    | Owner/admin   | Update organization details              |
| POST   | `/organizations/:id/verification`       | Owner/admin   | Submit verification information          |
| GET    | `/admin/organizations/pending`          | Admin         | List organizations awaiting verification |
| PATCH  | `/admin/organizations/:id/verification` | Admin         | Approve or reject verification           |

\*Verify implementation and response behavior.

## 6. Organization Membership

| Method | Endpoint                             | Access                | Status      | Description            |
| ------ | ------------------------------------ | --------------------- | ----------- | ---------------------- |
| POST   | `/organizations/:id/members`         | Owner/admin           | In progress | Add an existing user   |
| PATCH  | `/organizations/:id/members/:userId` | Owner                 | In progress | Change a member's role |
| DELETE | `/organizations/:id/members/:userId` | Owner/admin           | In progress | Remove a member        |
| POST   | `/organizations/:id/invitations`     | Owner/admin           | Planned     | Invite a user          |
| GET    | `/organizations/:id/invitations`     | Owner/admin           | Planned     | List invitations       |
| POST   | `/invitations/:token/accept`         | Authenticated invitee | Planned     | Accept an invitation   |

## 7. Volunteer Opportunities

**Status: Planned unless already implemented.**

| Method | Endpoint                           | Access                   | Description                          |
| ------ | ---------------------------------- | ------------------------ | ------------------------------------ |
| GET    | `/opportunities`                   | Public                   | Discover published opportunities     |
| GET    | `/opportunities/:id`               | Public                   | View opportunity details             |
| POST   | `/organizations/:id/opportunities` | Organization owner/admin | Create an opportunity                |
| PATCH  | `/opportunities/:id`               | Organization owner/admin | Update an opportunity                |
| DELETE | `/opportunities/:id`               | Organization owner/admin | Cancel or remove an opportunity      |
| GET    | `/organizations/:id/opportunities` | Public                   | List an organization's opportunities |

Opportunity information may include title, description, location, schedule, capacity, required skills, and status.

Only authorized organization members should manage opportunities belonging to their organization.

## 8. Volunteer Applications

**Status: Planned unless already implemented.**

| Method | Endpoint                          | Access                   | Description                              |
| ------ | --------------------------------- | ------------------------ | ---------------------------------------- |
| POST   | `/opportunities/:id/applications` | Authenticated            | Apply for an opportunity                 |
| GET    | `/applications/mine`              | Authenticated            | View the current user's applications     |
| GET    | `/opportunities/:id/applications` | Organization owner/admin | View applications                        |
| PATCH  | `/applications/:id/status`        | Organization owner/admin | Accept, reject, or waitlist an applicant |
| DELETE | `/applications/:id`               | Application owner        | Withdraw an application                  |

Application statuses may include `pending`, `accepted`, `rejected`, `waitlisted`, `withdrawn`, `attended`, and `absent`.

The backend must enforce capacity limits, prevent duplicate applications, and validate status transitions.

## 9. Free-Item Sharing

**Status: Planned.**

| Method | Endpoint              | Access        | Description                      |
| ------ | --------------------- | ------------- | -------------------------------- |
| GET    | `/items`              | Public        | Browse available items           |
| GET    | `/items/:id`          | Public        | View item details                |
| POST   | `/items`              | Authenticated | List an item for free            |
| PATCH  | `/items/:id`          | Item owner    | Update an item listing           |
| DELETE | `/items/:id`          | Item owner    | Remove an item listing           |
| POST   | `/items/:id/requests` | Authenticated | Request an item                  |
| GET    | `/items/mine`         | Authenticated | View the current user's listings |

Item listings may include title, description, category, condition, quantity, city, and availability status.

Items are offered for free; this feature does not process monetary payments.

## 10. Item Requests and Handover

**Status: Planned.**

| Method | Endpoint                      | Access                  | Description                      |
| ------ | ----------------------------- | ----------------------- | -------------------------------- |
| GET    | `/item-requests/mine`         | Authenticated           | View the current user's requests |
| GET    | `/items/:id/requests`         | Item owner              | View requests for an item        |
| PATCH  | `/item-requests/:id/status`   | Item owner              | Accept or reject a request       |
| PATCH  | `/item-requests/:id/handover` | Authorized participants | Update handover status           |
| PATCH  | `/item-requests/:id/receipt`  | Authorized participants | Confirm receipt                  |

The backend should validate available quantities, prevent over-allocation, and maintain an auditable handover status.

## 11. Help Requests

**Status: Planned.**

| Method | Endpoint                       | Access                           | Description                     |
| ------ | ------------------------------ | -------------------------------- | ------------------------------- |
| GET    | `/help-requests`               | Public, subject to privacy rules | Discover approved help requests |
| GET    | `/help-requests/:id`           | Public or authorized users       | View request details            |
| POST   | `/help-requests`               | Authenticated                    | Create a help request           |
| PATCH  | `/help-requests/:id`           | Request owner or moderator       | Update a request                |
| DELETE | `/help-requests/:id`           | Request owner or moderator       | Remove a request                |
| POST   | `/help-requests/:id/responses` | Authenticated                    | Offer help                      |
| PATCH  | `/help-responses/:id/status`   | Request owner                    | Accept or decline an offer      |

Sensitive requests must be moderated where appropriate. Public responses must not reveal private contact details or sensitive personal information.

## 12. Community Projects

**Status: Planned.**

| Method | Endpoint                   | Access                                                | Description                 |
| ------ | -------------------------- | ----------------------------------------------------- | --------------------------- |
| GET    | `/projects`                | Public                                                | Discover community projects |
| GET    | `/projects/:id`            | Public                                                | View project details        |
| POST   | `/projects`                | Authenticated organization member or approved creator | Create a project            |
| PATCH  | `/projects/:id`            | Project manager                                       | Update a project            |
| POST   | `/projects/:id/join`       | Authenticated                                         | Join a project              |
| DELETE | `/projects/:id/members/me` | Authenticated project member                          | Leave a project             |

Projects may contain goals, location, schedule, progress, participants, and required resources.

## 13. Material Donation Campaigns

**Status: Planned.**

| Method | Endpoint                       | Access                      | Description                         |
| ------ | ------------------------------ | --------------------------- | ----------------------------------- |
| GET    | `/campaigns`                   | Public                      | Browse campaigns                    |
| GET    | `/campaigns/:id`               | Public                      | View campaign details               |
| POST   | `/organizations/:id/campaigns` | Organization owner/admin    | Create a material donation campaign |
| PATCH  | `/campaigns/:id`               | Campaign manager            | Update a campaign                   |
| POST   | `/campaigns/:id/pledges`       | Authenticated               | Pledge goods or materials           |
| GET    | `/campaigns/:id/pledges`       | Authorized campaign manager | View pledges                        |
| PATCH  | `/pledges/:id/status`          | Authorized campaign manager | Update fulfilment status            |

Campaigns track requested goods and material contributions. Monetary donations are outside the initial scope.

## 14. Search and Discovery

**Status: Planned.**

| Method | Endpoint                      | Access | Description                      |
| ------ | ----------------------------- | ------ | -------------------------------- |
| GET    | `/search`                     | Public | Search approved public resources |
| GET    | `/opportunities?city=:city`   | Public | Filter opportunities by city     |
| GET    | `/opportunities?skill=:skill` | Public | Filter by required skill         |
| GET    | `/organizations?city=:city`   | Public | Filter organizations by city     |
| GET    | `/items?category=:category`   | Public | Filter item listings by category |

Supported filters, pagination, and sorting must be documented as they are implemented.

## 15. Reports and Moderation

**Status: Planned.**

| Method | Endpoint                  | Access          | Description                  |
| ------ | ------------------------- | --------------- | ---------------------------- |
| POST   | `/reports`                | Authenticated   | Report content or a user     |
| GET    | `/admin/reports`          | Admin/moderator | List reports                 |
| PATCH  | `/admin/reports/:id`      | Admin/moderator | Review and resolve a report  |
| PATCH  | `/admin/users/:id/status` | Admin           | Suspend or reactivate a user |

Moderation actions must be authorized and auditable. Sensitive operations should record the acting user and outcome.

## 16. Common HTTP Status Codes

| Status                      | Meaning                            |
| --------------------------- | ---------------------------------- |
| `200 OK`                    | Request succeeded                  |
| `201 Created`               | Resource created                   |
| `400 Bad Request`           | Invalid input                      |
| `401 Unauthorized`          | Authentication required or invalid |
| `403 Forbidden`             | Insufficient permissions           |
| `404 Not Found`             | Resource not found                 |
| `409 Conflict`              | Duplicate or conflicting operation |
| `500 Internal Server Error` | Unexpected server error            |
| `503 Service Unavailable`   | Required service unavailable       |

## 17. Security Rules

- Verify access tokens on protected endpoints.
- Enforce permissions in the backend, never only in the frontend.
- Never expose password hashes, refresh-token values, or other secrets.
- Validate user input, UUIDs, and resource ownership.
- Use parameterized SQL queries.
- Prevent unauthorized role escalation.
- Keep public profile and membership responses limited to approved fields.
- Apply rate limiting and appropriate protections to authentication endpoints before production deployment.
