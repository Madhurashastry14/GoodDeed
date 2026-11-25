-- 002_item_requests.sql
-- Verified item requests, append-only verification reviews, and fulfillment
-- offers with handover state.
-- Safe to apply once to an existing database; does not modify existing tables.

CREATE TABLE IF NOT EXISTS platform_reviewers (
    user_id UUID PRIMARY KEY
        REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_requests (
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

CREATE INDEX IF NOT EXISTS idx_item_requests_discovery
ON item_requests (status, created_at DESC)
WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_item_requests_requester
ON item_requests (requester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_item_requests_city
ON item_requests (city)
WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_item_requests_review_queue
ON item_requests (submitted_at ASC)
WHERE status = 'pending_verification';

CREATE TABLE IF NOT EXISTS item_request_reviews (
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
    CHECK (decision = 'approved' OR review_notes IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_item_request_reviews_request
ON item_request_reviews (request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_item_request_reviews_reviewer
ON item_request_reviews (reviewer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS item_request_offers (
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

CREATE INDEX IF NOT EXISTS idx_item_request_offers_request
ON item_request_offers (request_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_item_request_offers_donor
ON item_request_offers (donor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_item_request_offers_organization
ON item_request_offers (organization_id)
WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_item_request_offers_status
ON item_request_offers (status);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_offer_per_donor_request
ON item_request_offers (request_id, donor_id)
WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS one_active_org_offer_per_request
ON item_request_offers (request_id, organization_id)
WHERE status = 'pending' AND organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS one_accepted_offer_per_request
ON item_request_offers (request_id)
WHERE status = 'accepted';
