import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Users,
  UserRound,
  Pencil,
  Plus,
  CalendarDays,
  Clock,
} from "lucide-react";

import Navbar from "../components/navbar";
import {
  getOrganizationById,
  getOrganizationMembers,
  getMyOrganizations,
  getOrganizationOpportunities,
} from "../services/api";
import { useAuth } from "../context/authContext";
import "../styles/organizationDetails.css";

const OPPORTUNITY_STATUSES = [
  "draft",
  "published",
  "cancelled",
  "completed",
];

function formatOpportunityDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function OrganizationDetails() {
  const { id } = useParams();
  const { accessToken, loading: authLoading } = useAuth();

  const [isOwner, setIsOwner] = useState(false);
  const [canCreateOpportunity, setCanCreateOpportunity] = useState(false);

  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [opportunities, setOpportunities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true);

  const [error, setError] = useState("");
  const [membersError, setMembersError] = useState("");
  const [opportunitiesError, setOpportunitiesError] = useState("");

  // Fetch organization details
  useEffect(() => {
    let active = true;

    async function loadDetails() {
      setLoading(true);
      setError("");
      setOrganization(null);

      try {
        const data = await getOrganizationById(id);

        const raw = data.organization ?? data;
        const org = Array.isArray(raw) ? raw[0] : raw;

        if (!org || !org.id) {
          throw new Error("Organization not found");
        }

        if (active) {
          setOrganization(org);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load organization");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      active = false;
    };
  }, [id]);

  // Fetch organization members
  useEffect(() => {
    let active = true;

    async function loadMembers() {
      setMembersLoading(true);
      setMembers([]);
      setMembersError("");

      try {
        const data = await getOrganizationMembers(id);

        const result = Array.isArray(data) ? data : data.members;

        if (!Array.isArray(result)) {
          throw new Error("Unexpected members response");
        }

        if (active) {
          setMembers(result);
        }
      } catch (err) {
        if (active) {
          setMembersError(err.message || "Failed to load members");
        }
      } finally {
        if (active) {
          setMembersLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      active = false;
    };
  }, [id]);

  // Fetch organization opportunities (published, plus drafts for owners/admins)
  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function loadOpportunities() {
      setOpportunitiesLoading(true);
      setOpportunities([]);
      setOpportunitiesError("");

      try {
        const data = await getOrganizationOpportunities(id, accessToken);

        const result = Array.isArray(data) ? data : data.opportunities;

        if (!Array.isArray(result)) {
          throw new Error("Unexpected opportunities response");
        }

        if (active) {
          setOpportunities(result);
        }
      } catch (err) {
        if (active) {
          setOpportunitiesError(err.message || "Failed to load opportunities");
        }
      } finally {
        if (active) {
          setOpportunitiesLoading(false);
        }
      }
    }

    loadOpportunities();

    return () => {
      active = false;
    };
  }, [id, accessToken, authLoading]);

  // Check the logged-in user's organization role
  useEffect(() => {
    if (authLoading) return;

    let active = true;

    setIsOwner(false);
    setCanCreateOpportunity(false);

    if (!accessToken) {
      return;
    }

    async function checkPermissions() {
      try {
        const data = await getMyOrganizations(accessToken);

        const organizations = Array.isArray(data)
          ? data
          : (data.organization ?? data.organizations);

        if (!Array.isArray(organizations)) {
          throw new Error("Unexpected organizations response");
        }

        const membership = organizations.find(
          (org) => String(org.id) === String(id),
        );

        const role = membership?.role?.toLowerCase();

        if (active) {
          setIsOwner(role === "owner");

          setCanCreateOpportunity(role === "owner");
        }
      } catch (err) {
        console.error("Unable to check organization permissions:", err);

        if (active) {
          setIsOwner(false);
          setCanCreateOpportunity(false);
        }
      }
    }

    checkPermissions();

    return () => {
      active = false;
    };
  }, [id, accessToken, authLoading]);

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <main className="org-detail-status">Loading organization...</main>
      </>
    );
  }

  // Error state
  if (error || !organization) {
    return (
      <>
        <Navbar />

        <main className="org-detail-status">
          <h2>Unable to load organization</h2>

          <p>{error || "Organization not found"}</p>

          <Link to="/organizations">Back to organizations</Link>
        </main>
      </>
    );
  }

  // Normalize website URLs
  const website = organization.website?.trim() || "";

  let websiteUrl = null;

  if (website) {
    try {
      const normalized = /^https?:\/\//i.test(website)
        ? website
        : `https://${website}`;

      const parsed = new URL(normalized);

      if (
        ["http:", "https:"].includes(parsed.protocol) &&
        parsed.hostname.includes(".")
      ) {
        websiteUrl = parsed.href;
      }
    } catch {
      websiteUrl = null;
    }
  }

  return (
    <>
      <Navbar />

      <main className="org-detail-page">
        <div className="org-detail-container">
          {/* Back navigation */}
          <Link to="/organizations" className="org-back-link">
            <ArrowLeft size={17} />
            All organizations
          </Link>

          {/* Organization header */}
          <section className="org-detail-hero">
            <div className="org-detail-logo">
              <Building2 size={40} />
            </div>

            <div className="org-detail-heading">
              <span className="org-detail-eyebrow">COMMUNITY ORGANIZATION</span>

              <h1>{organization.name}</h1>

              <div className="org-detail-meta">
                <span>
                  <MapPin size={17} />
                  {organization.city || "Location not specified"}
                </span>
              </div>
            </div>

            <div className="org-detail-actions">
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="org-website-btn"
                >
                  <Globe size={17} />
                  Visit website
                </a>
              )}

              {/* Owner-only actions */}
              {canCreateOpportunity && (
                <Link
                  to={`/organizations/${id}/opportunities/new`}
                  className="org-create-opp-btn"
                >
                  <Plus size={17} />
                  Create Opportunity
                </Link>
              )}

              {/* Owner-only actions */}
              {isOwner && (
                <Link to={`/organizations/${id}/edit`} className="org-edit-btn">
                  <Pencil size={16} />
                  Edit organization
                </Link>
              )}

              {/* Members */}
              <Link
                to={`/organizations/${id}/members`}
                className="org-edit-btn"
              >
                <Users size={16} />
                {isOwner ? "Manage members" : "View members"}
              </Link>
            </div>
          </section>

          {/* Organization content */}
          <div className="org-detail-grid">
            {/* About */}
            <section className="org-detail-card">
              <h2>About this organization</h2>

              <p className="org-about-text">
                {organization.description ||
                  "This organization has not added a description yet."}
              </p>
            </section>

            {/* Members */}
            <section className="org-detail-card">
              <div className="org-members-heading">
                <div>
                  <h2>Members</h2>

                  {!membersLoading && !membersError && (
                    <p>
                      {members.length}{" "}
                      {members.length === 1 ? "member" : "members"}
                    </p>
                  )}
                </div>

                <Users size={23} />
              </div>

              {membersLoading && (
                <p className="org-no-members">Loading members...</p>
              )}

              {!membersLoading && membersError && (
                <p className="org-members-error" role="alert">
                  Unable to load members: {membersError}
                </p>
              )}

              {!membersLoading && !membersError && members.length === 0 && (
                <p className="org-no-members">No members to display.</p>
              )}

              {!membersLoading &&
                !membersError &&
                members.map((member) => (
                  <div className="org-member" key={member.user_id ?? member.id}>
                    <div className="org-member-avatar">
                      <UserRound size={19} />
                    </div>

                    <div>
                      <strong>
                        {member.name ?? member.user_name ?? "Member"}
                      </strong>

                      <span>{member.role ?? "member"}</span>
                    </div>
                  </div>
                ))}
            </section>
          </div>

          {/* Opportunities */}
          <section className="org-opportunities-section">
            <div className="org-opportunities-heading">
              <div>
                <h2>Opportunities</h2>

                {!opportunitiesLoading && !opportunitiesError && (
                  <p>
                    {opportunities.length}{" "}
                    {opportunities.length === 1
                      ? "opportunity"
                      : "opportunities"}
                  </p>
                )}
              </div>

              <CalendarDays size={23} />
            </div>

            {opportunitiesLoading && (
              <p className="org-opportunities-state">
                Loading opportunities...
              </p>
            )}

            {!opportunitiesLoading && opportunitiesError && (
              <p
                className="org-opportunities-state org-opportunities-error"
                role="alert"
              >
                Unable to load opportunities: {opportunitiesError}
              </p>
            )}

            {!opportunitiesLoading &&
              !opportunitiesError &&
              opportunities.length === 0 && (
                <p className="org-opportunities-state">
                  No opportunities available yet
                </p>
              )}

            {!opportunitiesLoading &&
              !opportunitiesError &&
              opportunities.length > 0 && (
                <div className="org-opportunities-grid">
                  {opportunities.map((opportunity) => {
                    const status = String(
                      opportunity.status || "draft",
                    ).toLowerCase();

                    return (
                      <article className="org-opp-card" key={opportunity.id}>
                        <div className="org-opp-card-head">
                          <h3>{opportunity.title || "Untitled opportunity"}</h3>

                          <span
                            className={`org-opp-status org-opp-status--${
                              OPPORTUNITY_STATUSES.includes(status)
                                ? status
                                : "default"
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        <p className="org-opp-description">
                          {opportunity.description ||
                            "No description provided."}
                        </p>

                        <div className="org-opp-meta">
                          <span>
                            <MapPin size={15} />
                            {opportunity.city || "Location not specified"}
                          </span>

                          <span>
                            <Users size={15} />
                            Volunteer capacity:{" "}
                            {opportunity.capacity ?? "Not specified"}
                          </span>

                          <span>
                            <CalendarDays size={15} />
                            Starts:{" "}
                            {formatOpportunityDate(opportunity.starts_at)}
                          </span>

                          <span>
                            <Clock size={15} />
                            Ends: {formatOpportunityDate(opportunity.ends_at)}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
          </section>
        </div>
      </main>
    </>
  );
}
