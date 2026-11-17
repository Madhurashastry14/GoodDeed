import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Users,
  UserRound,
} from "lucide-react";

import Navbar from "../components/navbar";
import {
  //   getOrganizationById,
  getOrganizationMembers,
} from "../services/authService";

import "../styles/organizationDetails.css";

export default function OrganizationDetails() {
  const { id } = useParams();

  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [membersError, setMembersError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDetails() {
      setLoading(true);
      setError("");
      setMembersError("");

      try {
        const data = await getOrganizationById(id);
        const org = data.organization ?? data;

        if (!org || !org.id) {
          throw new Error("Unexpected organization response");
        }

        if (active) setOrganization(org);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetails();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      setMembers([]);
      setMembersError("");

      try {
        const data = await getOrganizationMembers(id);
        const result = Array.isArray(data) ? data : data.members;

        if (!Array.isArray(result)) {
          throw new Error("Unexpected members response");
        }

        if (active) setMembers(result);
      } catch (err) {
        if (active) setMembersError(err.message);
      }
    }

    loadMembers();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="org-detail-status">Loading organization...</main>
      </>
    );
  }

  if (error || !organization) {
    return (
      <>
        <Navbar />
        <main className="org-detail-status">
          <h2>Unable to load organization</h2>
          <p>{error}</p>
          <Link to="/organizations">Back to organizations</Link>
        </main>
      </>
    );
  }

  const website = organization.website;
  const validWebsite =
    typeof website === "string" && /^https?:\/\//i.test(website);

  return (
    <>
      <Navbar />

      <main className="org-detail-page">
        <div className="org-detail-container">
          <Link to="/organizations" className="org-back-link">
            <ArrowLeft size={17} />
            All organizations
          </Link>

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
                  {organization.city}
                </span>
              </div>
            </div>

            {validWebsite && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="org-website-btn"
              >
                <Globe size={17} />
                Visit website
              </a>
            )}
          </section>

          <div className="org-detail-grid">
            <section className="org-detail-card">
              <h2>About this organization</h2>

              <p className="org-about-text">
                {organization.description ||
                  "This organization has not added a description yet."}
              </p>
            </section>

            <section className="org-detail-card">
              <div className="org-members-heading">
                <div>
                  <h2>Members</h2>
                  {!membersError && (
                    <p>
                      {members.length}{" "}
                      {members.length === 1 ? "member" : "members"}
                    </p>
                  )}
                </div>

                <Users size={23} />
              </div>

              {membersError && (
                <p className="org-members-error">
                  Unable to load members: {membersError}
                </p>
              )}

              {!membersError && members.length === 0 && (
                <p className="org-no-members">No members to display.</p>
              )}

              {!membersError &&
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
