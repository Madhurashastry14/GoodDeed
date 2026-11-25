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

| Method | Endpoint                  | Access                     | Description                              |
| ------ | ------------------------- | -------------------------- | ---------------------------------------- |
| GET    | `/users/profile`          | Authenticated              | Retrieve the current user's profile      |
| PATCH  | `/users/profile`          | Authenticated              | Update the current user's profile        |
| GET    | `/users/:id`              | Public profile fields only | View a user's public profile             |
| PATCH  | `/users/profile/password` | Authenticated              | Change the account password              |
| DELETE | `/users/profile`          | Authenticated              | Request account deactivation or deletion |

Profile fields may include name, bio, city, interests, and other explicitly public information.

Sensitive account information must not be exposed through public profile endpoints.

## 5. Organizations and NGOs

| Method | Endpoint                                | Access        | Description                              |
| ------ | --------------------------------------- | ------------- | ---------------------------------------- |
| GET    | `/organizations`                        | Public        | List organizations                       |
| POST   | `/organizations`                        | Authenticated | Create an organization                   |
| GET    | `/organizations/mine`                   | Authenticated | List the current user's organizations    |
| GET    | `/organizations/:id`                    | Public        | Retrieve organization details            |
| GET    | `/organizations/:id/dashboard`          | Owner         | Owner dashboard statistics               |
| GET    | `/organizations/:id/members`            | Public        | List organization members                |
| PATCH  | `/organizations/:id`                    | Owner         | Update organization details              |
| DELETE | `/organizations/:id`                    | owner         | Delete a organizations                   |
| POST   | `/organizations/:id/verification`       | Owner         | Submit verification information          |
| GET    | `/admin/organizations/pending`          | Admin         | List organizations awaiting verification |
| PATCH  | `/admin/organizations/:id/verification` | Admin         | Approve or reject verification           |

\*Verify implementation and response behavior.

### 5.1 Organization Owner Dashboard

**Status: Implemented.**

`GET /organizations/:id/dashboard` returns summary statistics for one
organization. It requires authentication and is restricted to the
organization **owner**; admins, members, and unrelated users receive `403`.

The response is a single JSON object:

```json
{
  "organization": { "id": "...", "name": "...", "city": "..." },
  "statistics": {
    "total_opportunities": 0,
    "draft_opportunities": 0,
    "published_opportunities": 0,
    "completed_opportunities": 0,
    "cancelled_opportunities": 0,
    "pending_applications": 0,
    "accepted_applications": 0,
    "unique_accepted_volunteers": 0,
    "upcoming_published_opportunities": 0
  },
  "upcoming_opportunities": [],
  "pending_application_opportunities": []
}
```

Metric definitions:

- `total_opportunities` counts every opportunity owned by the organization,
  across all statuses.
- `upcoming_published_opportunities` counts `published` opportunities whose
  `starts_at` is in the future.
- `pending_applications` counts applications with status `pending` across the
  organization's opportunities.
- `accepted_applications` counts accepted application **records**. A volunteer
  accepted for two opportunities contributes two.
- `unique_accepted_volunteers` counts distinct users with at least one accepted
  application. The same volunteer accepted for two opportunities contributes
  one. This is the "total accepted volunteers" figure.

`upcoming_opportunities` lists future `published` opportunities ordered by
start time, with `accepted_count` and `pending_application_count` per
opportunity. `pending_application_opportunities` groups opportunities that
currently have pending applications, with `pending_application_count`. Neither
list exposes volunteer names, emails, or other personal data.

## 6. Organization Membership

| Method | Endpoint                             | Access               | Description          |
| ------ | ------------------------------------ | -------------------- | -------------------- |
| POST   | `/organizations/:id/members`         | Owner                | Add an existing user |
| DELETE | `/organizations/:id/members/:userId` | Owner                | Remove a member      |
| POST   | `/organizations/:id/invitations`     | Owner                | Invite a user        |
| GET    | `/organizations/:id/invitations`     | Owner/admin          | List invitations     |
| POST   | `/invitations/:token/accept`         | Authenticated invite | Accept an invitation |

## 7. Volunteer Opportunities

**Status: Implemented.**

| Method | Endpoint                                 | Access          | Description                                       |
| ------ | ---------------------------------------- | --------------- | ------------------------------------------------- |
| GET    | `/opportunities`                         | Public          | Discover published opportunities                  |
| GET    | `/opportunities/:id`                     | Public / owner  | View details; drafts are owner-only               |
| GET    | `/opportunities/organization/:id`        | Public / owner  | List an organization's opportunities              |
| POST   | `/opportunities`                         | Owner           | Create an opportunity as a draft                  |
| PATCH  | `/opportunities/:id`                     | Owner           | Edit a draft or published opportunity             |
| PATCH  | `/opportunities/:id/publish`             | Owner           | Publish a draft                                   |
| PATCH  | `/opportunities/:id/cancel`              | Owner           | Cancel a draft or published opportunity           |
| PATCH  | `/opportunities/:id/complete`            | Owner           | Complete a published opportunity after it ends    |
| DELETE | `/opportunities/:id`                     | Owner           | Delete a draft opportunity                        |

Only the organization **owner** can manage opportunities. Organization admins and members cannot create, edit, publish, cancel, complete, delete, or view draft opportunities.

Lifecycle: `draft → published → completed`, plus `draft → cancelled` and `published → cancelled`. Completed and cancelled opportunities are read-only. Publishing requires a future start time.

`GET /opportunities` accepts optional query parameters:

- `search` — matches opportunity title, description, or organization name.
- `city` — case-insensitive exact city match.
- `upcoming=true` — only opportunities that have not started.
- `sort=start_asc|start_desc` — defaults to `start_asc`.
- `page` and `limit` — pagination; `limit` is 1–50 and defaults to 9.

The public listing returns only `published` opportunities. Drafts, cancelled opportunities, and completed opportunities are never returned publicly.

## 8. Volunteer Applications

**Status: Implemented.**

| Method | Endpoint                                       | Access     | Description                              |
| ------ | ---------------------------------------------- | ---------- | ---------------------------------------- |
| POST   | `/opportunities/:id/applications`              | Auth       | Apply for a published opportunity        |
| GET    | `/opportunity-applications/mine`               | Auth       | View the current user's applications     |
| GET    | `/opportunities/:id/applications`              | Owner      | View applicants and capacity summary     |
| PATCH  | `/opportunity-applications/:id/accept`         | Owner      | Accept a pending application             |
| PATCH  | `/opportunity-applications/:id/reject`         | Owner      | Reject a pending application             |
| PATCH  | `/opportunity-applications/:id/withdraw`       | Applicant  | Withdraw a pending or accepted application |

Applications can only be submitted for published opportunities that have not started. Organization owners cannot apply to their own organization's opportunities, and duplicate applications are rejected.

Application statuses used by this module: `pending`, `accepted`, `rejected`, `withdrawn`. Capacity is based on the number of **accepted** applications; pending applications may exceed capacity, but acceptance is transactional and can never exceed it. Withdrawing an accepted application releases its capacity. Applications cannot be withdrawn after the opportunity starts.

## 9. Free-Item Sharing

**Status: Implemented.**

| Method | Endpoint             | Access        | Description                              |
| ------ | -------------------- | ------------- | ---------------------------------------- |
| GET    | `/items`             | Public        | Browse available and reserved items      |
| GET    | `/items/mine`        | Authenticated | View the current user's listings         |
| GET    | `/items/:id`         | Public        | View item details and permitted actions  |
| POST   | `/items`             | Authenticated | List an item for free                    |
| PATCH  | `/items/:id`         | Item owner    | Update an available item listing         |
| PATCH  | `/items/:id/close`   | Item owner    | Close an available listing               |
| DELETE | `/items/:id`         | Item owner    | Delete a listing with no claim history   |

Item listings include a title, description, category, condition, city, image URL, and status. Categories are `furniture`, `electronics`, `clothing`, `books`, `household`, `sports`, `toys`, and `other`; conditions are `new`, `like_new`, `good`, and `fair`.

Item statuses are `available`, `reserved`, `donated`, and `closed`. Public discovery returns only `available` and `reserved` listings, with available items first, and supports `search`, `city`, and `category` filters. Status changes are managed only through claims and handover actions; `PATCH` rejects a client-supplied status. Reserved and donated items are read-only, and listings with any claim history cannot be deleted.

Items are offered for free; this feature does not process monetary payments.

## 10. Item Claims and Handover

**Status: Implemented.**

| Method | Endpoint                              | Access                  | Description                              |
| ------ | ------------------------------------- | ----------------------- | ---------------------------------------- |
| POST   | `/items/:id/claims`                   | Authenticated           | Request an available item                |
| GET    | `/items/:id/claims`                   | Item owner              | View requests and claimant display data  |
| GET    | `/item-claims/me`                     | Authenticated           | View the current user's claim history    |
| GET    | `/item-claims/:id`                    | Donor or claimant       | View one claim                           |
| PATCH  | `/item-claims/:id/accept`             | Item owner              | Select the recipient and reserve item    |
| PATCH  | `/item-claims/:id/reject`             | Item owner              | Reject a pending claim                   |
| PATCH  | `/item-claims/:id/withdraw`           | Claimant                | Withdraw a pending claim                 |
| PATCH  | `/item-claims/:id/cancel`             | Donor or recipient      | Cancel an accepted reservation           |
| PATCH  | `/item-claims/:id/handover`           | Donor or recipient      | Update handover time, place, and note    |
| PATCH  | `/item-claims/:id/confirm-handover`   | Donor or recipient      | Confirm handover independently           |

Claim statuses are `pending`, `accepted`, `rejected`, `withdrawn`, `cancelled`, and `completed`. A claimant cannot request their own listing, cannot hold more than one active claim per item, and cannot claim an item that is not `available`. Only the listing owner can accept or reject claims, and only one claim can be accepted per item.

Accepting a claim sets it to `accepted` and the item to `reserved`. Accept, cancel, and confirmation operations use transactions with a consistent item-then-claim row lock order. Cancelling a reservation requires an accepted claim on a reserved item with no handover confirmation from either party, returns the item to `available`, and keeps the cancelled claim as history.

Handover details (note, public meeting location, and time) are visible only to the donor and selected recipient. Both parties confirm independently; the first confirmation records that party's timestamp without completing the donation. When both confirmations exist, the claim becomes `completed`, the item becomes `donated`, remaining pending claims are rejected, and the completion timestamp is recorded. Repeated confirmations are idempotent. Completed donations cannot be reopened or deleted. Claimant display data exposes only public profile fields and never private contact details.

## 11. Verified Item Requests and Fulfillment

**Status: Implemented.**

Verified item requests let a person ask for an essential item and receive it from a verified donor. Requests are reviewed by a platform reviewer before they appear publicly, and fulfillment is coordinated privately between the requester and the selected donor.

### 11.1 Requests

| Method | Endpoint                       | Access                        | Description                                         |
| ------ | ------------------------------ | ----------------------------- | --------------------------------------------------- |
| GET    | `/item-requests`               | Public                        | Discover approved, verified requests                |
| GET    | `/item-requests/me`            | Authenticated                 | View the current user's requests and offer counts   |
| POST   | `/item-requests`               | Authenticated                 | Create a request draft                              |
| GET    | `/item-requests/:id`           | Public or authorized users    | View request details within visibility rules        |
| PATCH  | `/item-requests/:id`           | Requester                     | Update an editable request                          |
| PATCH  | `/item-requests/:id/submit`    | Requester                     | Submit a draft for verification                     |
| PATCH  | `/item-requests/:id/reopen`    | Requester                     | Reopen a changes-requested request as a draft       |
| PATCH  | `/item-requests/:id/cancel`    | Requester                     | Cancel a request that is not reserved               |

Request statuses are `draft`, `pending_verification`, `changes_requested`, `rejected`, `open`, `reserved`, `fulfilled`, and `cancelled`. Categories are `food`, `clothing`, `household`, `hygiene`, `school_supplies`, `baby_care`, and `other`; urgency is `low`, `normal`, or `high`. Quantities are whole numbers from 1 to 1000. Fulfillment always covers the full requested quantity; there is no partial fulfillment.

Public discovery returns only requests whose status is `open` and whose `verified_at` timestamp is set. It supports `search`, `city`, `category`, `urgency`, `sort` (`newest` or `oldest`), `page`, and `limit` (maximum 50). The reason for requesting and all review notes are never included in public discovery. Draft, pending, changes-requested, rejected, cancelled, reserved, and fulfilled requests are not public.

Editing an `open` request is a material change: it clears `verified_at`, moves the request to `pending_verification`, and removes it from discovery until a reviewer approves it again. Draft and changes-requested edits remain drafts. Requests pending verification, reserved, fulfilled, rejected, or cancelled cannot be edited. Cancelling a request rejects its pending offers.

### 11.2 Fulfillment Offers

| Method | Endpoint                                  | Access                     | Description                                  |
| ------ | ----------------------------------------- | -------------------------- | -------------------------------------------- |
| GET    | `/item-requests/:id/offers`               | Requester                  | View offers received for a request           |
| POST   | `/item-requests/:id/offers`               | Authenticated non-requester| Offer to fulfill the full request            |
| GET    | `/item-request-offers/me`                 | Authenticated              | View the current user's offers and history   |
| PATCH  | `/item-request-offers/:id/accept`         | Requester                  | Select a donor and reserve the request       |
| PATCH  | `/item-request-offers/:id/reject`         | Requester                  | Reject a pending offer                       |
| PATCH  | `/item-request-offers/:id/withdraw`       | Offer donor                | Withdraw a pending offer                     |
| PATCH  | `/item-request-offers/:id/cancel`         | Requester or selected donor| Cancel an accepted reservation               |
| PATCH  | `/item-request-offers/:id/handover`       | Requester or selected donor| Update handover location, time, and note     |
| PATCH  | `/item-request-offers/:id/confirm-handover` | Requester or selected donor | Confirm handover independently             |

Offer statuses are `pending`, `accepted`, `rejected`, `withdrawn`, `cancelled`, and `completed`. An offer message is required and must be between 10 and 1000 characters. A user cannot offer on their own request, cannot hold more than one active offer per request, and can only offer while the request is verified and `open`. Only the requester sees received offers.

A user acting for an organization must be that organization's `owner`; organization membership alone is insufficient. Both the donating user and the organization are recorded on the offer.

Accepting one offer sets it to `accepted` and the request to `reserved`; other offers stay `pending` but can no longer be accepted, and new offers are blocked. A request can never have more than one accepted offer. Offer mutations use transactions with a consistent request-then-offer row lock order.

Handover details are visible only to the requester and the selected donor and are hidden from everyone else. Both parties confirm independently. The first confirmation records that party's timestamp without completing the request. When both confirmations exist, the offer becomes `completed`, the request becomes `fulfilled` with a fulfillment timestamp, and remaining pending offers are rejected. Repeated confirmations are idempotent. Once either party confirms, the reservation can no longer be cancelled. Completed and cancelled offers remain as history; there are no hard deletes.

### 11.3 Review Authorization

Request review is a separate, platform-level responsibility. It is never granted by organization ownership or administration.

| Method | Endpoint                                    | Access           | Description                              |
| ------ | ------------------------------------------- | ---------------- | ---------------------------------------- |
| GET    | `/admin/item-requests/access`               | Authenticated    | Check whether the user is a reviewer     |
| GET    | `/admin/item-requests/pending`              | Platform reviewer| View the verification queue              |
| GET    | `/admin/item-requests/:id`                  | Platform reviewer| View a request with review permissions   |
| PATCH  | `/admin/item-requests/:id/approve`          | Platform reviewer| Approve and publish the request          |
| PATCH  | `/admin/item-requests/:id/reject`           | Platform reviewer| Reject with required review notes        |
| PATCH  | `/admin/item-requests/:id/request-changes`  | Platform reviewer| Request changes with required notes      |

Reviewer rights are stored in `platform_reviewers` and checked from the database on every protected request, so revocation takes effect immediately. Self-review is forbidden: a reviewer can never decide on their own request. Rejections and change requests require review notes of at least 10 characters; those notes are shown to the requester as feedback but are never public. Approving sets `open` and records `verified_at`. Rejecting sets `rejected`; requesting changes sets `changes_requested`, which the requester can reopen as a draft. Every decision is appended to `item_request_reviews` and never overwritten.

Reviewers are provisioned out of band with database credentials, never through the HTTP API:

```bash
node scripts/grant-reviewer.js <email-or-uuid> [--granted-by <email-or-uuid>]
node scripts/grant-reviewer.js <email-or-uuid> --revoke
node scripts/grant-reviewer.js --list
```

This feature does not process payments, handle sensitive documents, or provide real-time chat. Handover coordination is a private record, not a messaging channel.

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
