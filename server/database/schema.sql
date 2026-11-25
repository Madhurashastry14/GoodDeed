--initial Database Schema

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'deactivated')),
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (name = TRIM(name) AND name <> ''),
    CHECK (email = LOWER(TRIM(email)) AND email <> ''),
    CHECK (phone IS NULL OR phone = TRIM(phone))
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (expires_at > created_at)
);

CREATE INDEX idx_refresh_tokens_user
ON refresh_tokens (user_id);

CREATE INDEX idx_refresh_tokens_expiry
ON refresh_tokens (expires_at);

-- User Profiles
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    city VARCHAR(100),
    interests TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (city IS NULL OR (city = TRIM(city) AND city <> ''))
);

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    city VARCHAR(100) NOT NULL,
    website TEXT,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            verification_status IN (
                'pending', 'verified', 'rejected', 'suspended'
            )
        ),
    created_by UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (name = TRIM(name) AND name <> ''),
    CHECK (city = TRIM(city) AND city <> '')
);

-- Organization Memberships
CREATE TABLE organization_members (
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    role VARCHAR(20) NOT NULL DEFAULT 'member'
        CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (organization_id, user_id)
);

CREATE UNIQUE INDEX one_owner_per_organization
ON organization_members (organization_id)
WHERE role = 'owner';

CREATE INDEX idx_organization_members_user
ON organization_members (user_id);

-- Volunteer Opportunities
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES organizations(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (
            status IN ('draft', 'published', 'cancelled', 'completed')
        ),
    created_by UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (title = TRIM(title) AND title <> ''),
    CHECK (city = TRIM(city) AND city <> ''),
    CHECK (ends_at > starts_at)
);

CREATE INDEX idx_opportunities_organization
ON opportunities (organization_id);

CREATE INDEX idx_opportunities_city_start
ON opportunities (city, starts_at)
WHERE status = 'published';

-- Volunteer Applications
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL
        REFERENCES opportunities(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending', 'accepted', 'rejected',
                'waitlisted', 'withdrawn', 'attended', 'absent'
            )
        ),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (opportunity_id, user_id)
);

CREATE INDEX idx_applications_user_date
ON applications (user_id, applied_at DESC);

-- Free Item Sharing: item listings
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    condition VARCHAR(30) NOT NULL,
    city VARCHAR(100) NOT NULL,
    image_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'reserved', 'donated', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (title = TRIM(title) AND title <> ''),
    CHECK (description = TRIM(description) AND description <> ''),
    CHECK (category = TRIM(category) AND category <> ''),
    CHECK (condition = TRIM(condition) AND condition <> ''),
    CHECK (city = TRIM(city) AND city <> ''),
    CHECK (image_url IS NULL OR image_url ~* '^https?://[^[:space:]]+$')
);

CREATE INDEX idx_items_discovery
ON items (status, created_at DESC);

CREATE INDEX idx_items_donor
ON items (donor_id, created_at DESC);

-- Free Item Sharing: claims, reservation, and handover state
CREATE TABLE item_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    claimant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    message VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending', 'accepted', 'rejected',
                'withdrawn', 'cancelled', 'completed'
            )
        ),
    handover_note VARCHAR(1000),
    handover_location VARCHAR(200),
    handover_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    donor_confirmed_at TIMESTAMPTZ,
    recipient_confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (message IS NULL OR (message = TRIM(message) AND message <> '')),
    CHECK (
        handover_note IS NULL
        OR (handover_note = TRIM(handover_note) AND handover_note <> '')
    ),
    CHECK (
        handover_location IS NULL
        OR (handover_location = TRIM(handover_location) AND handover_location <> '')
    ),
    CHECK (
        status NOT IN ('accepted', 'cancelled', 'completed')
        OR accepted_at IS NOT NULL
    ),
    CHECK (
        status <> 'completed'
        OR (
            completed_at IS NOT NULL
            AND donor_confirmed_at IS NOT NULL
            AND recipient_confirmed_at IS NOT NULL
        )
    )
);

CREATE INDEX idx_item_claims_item
ON item_claims (item_id, created_at ASC);

CREATE INDEX idx_item_claims_claimant
ON item_claims (claimant_id, created_at DESC);

CREATE INDEX idx_item_claims_status
ON item_claims (status);

CREATE UNIQUE INDEX one_active_claim_per_user_item
ON item_claims (item_id, claimant_id)
WHERE status IN ('pending', 'accepted');

CREATE UNIQUE INDEX one_accepted_claim_per_item
ON item_claims (item_id)
WHERE status = 'accepted';

-- Verified Item Requests: platform reviewers
-- Reviewer access is granted out of band (database credentials / trusted CLI)
-- and is deliberately separate from organization membership roles.
CREATE TABLE platform_reviewers (
    user_id UUID PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verified Item Requests: requests
CREATE TABLE item_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    city VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    urgency VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (urgency IN ('low', 'normal', 'high')),
    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft', 'pending_verification', 'changes_requested',
                'rejected', 'open', 'reserved', 'fulfilled', 'cancelled'
            )
        ),
    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (title = TRIM(title) AND title <> ''),
    CHECK (description = TRIM(description) AND description <> ''),
    CHECK (category = TRIM(category) AND category <> ''),
    CHECK (city = TRIM(city) AND city <> ''),
    CHECK (reason = TRIM(reason) AND reason <> ''),
    CHECK (quantity > 0 AND quantity <= 1000),
    CHECK (status <> 'pending_verification' OR submitted_at IS NOT NULL),
    CHECK (status <> 'fulfilled' OR fulfilled_at IS NOT NULL)
);

CREATE INDEX idx_item_requests_discovery
ON item_requests (status, created_at DESC)
WHERE status = 'open';

CREATE INDEX idx_item_requests_requester
ON item_requests (requester_id, created_at DESC);

CREATE INDEX idx_item_requests_city
ON item_requests (city)
WHERE status = 'open';

CREATE INDEX idx_item_requests_review_queue
ON item_requests (submitted_at ASC)
WHERE status = 'pending_verification';

-- Verified Item Requests: append-only verification history
CREATE TABLE item_request_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL
        REFERENCES item_requests(id) ON DELETE RESTRICT,
    reviewer_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    decision VARCHAR(20) NOT NULL
        CHECK (decision IN ('approved', 'rejected', 'changes_requested')),
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        review_notes IS NULL
        OR (review_notes = TRIM(review_notes) AND review_notes <> '')
    ),
    -- Rejections and change requests must carry a meaningful explanation.
    CHECK (decision = 'approved' OR review_notes IS NOT NULL)
);

CREATE INDEX idx_item_request_reviews_request
ON item_request_reviews (request_id, created_at DESC);

CREATE INDEX idx_item_request_reviews_reviewer
ON item_request_reviews (reviewer_id, created_at DESC);

-- Verified Item Requests: fulfillment offers and handover state
CREATE TABLE item_request_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL
        REFERENCES item_requests(id) ON DELETE RESTRICT,
    donor_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID
        REFERENCES organizations(id) ON DELETE RESTRICT,
    message VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending', 'accepted', 'rejected',
                'withdrawn', 'cancelled', 'completed'
            )
        ),
    handover_note VARCHAR(1000),
    handover_location VARCHAR(200),
    handover_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    donor_confirmed_at TIMESTAMPTZ,
    requester_confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (message = TRIM(message) AND message <> ''),
    CHECK (
        handover_note IS NULL
        OR (handover_note = TRIM(handover_note) AND handover_note <> '')
    ),
    CHECK (
        handover_location IS NULL
        OR (handover_location = TRIM(handover_location) AND handover_location <> '')
    ),
    CHECK (
        status NOT IN ('accepted', 'cancelled', 'completed')
        OR accepted_at IS NOT NULL
    ),
    CHECK (
        status <> 'completed'
        OR (
            completed_at IS NOT NULL
            AND donor_confirmed_at IS NOT NULL
            AND requester_confirmed_at IS NOT NULL
        )
    )
);

CREATE INDEX idx_item_request_offers_request
ON item_request_offers (request_id, created_at ASC);

CREATE INDEX idx_item_request_offers_donor
ON item_request_offers (donor_id, created_at DESC);

CREATE INDEX idx_item_request_offers_organization
ON item_request_offers (organization_id)
WHERE organization_id IS NOT NULL;

CREATE INDEX idx_item_request_offers_status
ON item_request_offers (status);

-- A user may hold only one pending offer per request.
CREATE UNIQUE INDEX one_active_offer_per_donor_request
ON item_request_offers (request_id, donor_id)
WHERE status = 'pending';

-- An organization may hold only one pending offer per request.
CREATE UNIQUE INDEX one_active_org_offer_per_request
ON item_request_offers (request_id, organization_id)
WHERE status = 'pending' AND organization_id IS NOT NULL;

-- Only one offer may be the accepted fulfillment for a request.
CREATE UNIQUE INDEX one_accepted_offer_per_request
ON item_request_offers (request_id)
WHERE status = 'accepted';