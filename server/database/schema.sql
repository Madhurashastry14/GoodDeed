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