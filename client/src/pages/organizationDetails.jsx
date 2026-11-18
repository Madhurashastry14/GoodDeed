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
} from "lucide-react";

import Navbar from "../components/navbar";
import {
  getOrganizationById,
  getOrganizationMembers,
  getMyOrganizations,
} from "../services/api";
import { useAuth } from "../context/authContext";
import "../styles/organizationDetails.css";

export default function OrganizationDetails() {
  const { id } = useParams();
  const { accessToken, loading: authLoading } = useAuth();

  const [isOwner, setIsOwner] = useState(false);

  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [error, setError] = useState("");
  const [membersError, setMembersError] = useState("");

  // Fetch organization details
  useEffect(() => {
    let active = true;

    async function loadDetails() {
      setLoading(true);
      setError("");
      setOrganization(null);

      try {
        const data = await getOrganizationById(id);

        // Backend returns:
        // { organization: [{ id, name, city, ... }] }
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

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function checkOwnership() {
      setIsOwner(false);

      if (!accessToken) return;

      try {
        const data = await getMyOrganizations(accessToken);

        const organizations = Array.isArray(data)
          ? data
          : (data.organization ?? data.organizations);

        if (!Array.isArray(organizations)) {
          throw new Error("Unexpected organizations response");
        }

        const owned = organizations.some(
          (org) =>
            String(org.id) === String(id) &&
            org.role?.toLowerCase() === "owner",
        );

        if (active) {
          setIsOwner(owned);
        }
      } catch (err) {
        console.error("Unable to check organization ownership:", err);
        if (active) setIsOwner(false);
      }
    }

    checkOwnership();

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

              {isOwner && (
                <Link to={`/organizations/${id}/edit`} className="org-edit-btn">
                  <Pencil size={16} />
                  Edit organization
                </Link>
              )}
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
        </div>
      </main>
    </>
  );
}
