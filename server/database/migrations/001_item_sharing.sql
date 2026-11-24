-- 001_item_sharing.sql
-- Free-item sharing listings and item claim / handover workflow.
-- Safe to apply once to an existing database; does not modify existing tables.

CREATE TABLE IF NOT EXISTS items (
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

CREATE INDEX IF NOT EXISTS idx_items_discovery
ON items (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_items_donor
ON items (donor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS item_claims (
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

CREATE INDEX IF NOT EXISTS idx_item_claims_item
ON item_claims (item_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_item_claims_claimant
ON item_claims (claimant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_item_claims_status
ON item_claims (status);

-- A user may have only one pending or accepted claim per item.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_claim_per_user_item
ON item_claims (item_id, claimant_id)
WHERE status IN ('pending', 'accepted');

-- Only one claimant may be the selected recipient for an item at a time.
CREATE UNIQUE INDEX IF NOT EXISTS one_accepted_claim_per_item
ON item_claims (item_id)
WHERE status = 'accepted';
