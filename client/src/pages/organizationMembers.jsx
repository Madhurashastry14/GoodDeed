import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserRound,
  Trash2,
  ShieldCheck,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";

import {
  getOrganizationById,
  getOrganizationMembers,
  getMyOrganizations,
  addOrganizationMember,
  removeOrganizationMember,
} from "../services/api";

import "../styles/organizationMembers.css";

export default function OrganizationMembers() {
  const { id } = useParams();
  const { accessToken, loading: authLoading } = useAuth();

  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [isOwner, setIsOwner] = useState(false);

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function refreshMembers() {
    const data = await getOrganizationMembers(id);
    const result = Array.isArray(data) ? data : data.members;

    if (!Array.isArray(result)) {
      throw new Error("Unexpected members response");
    }

    setMembers(result);
  }

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function loadPage() {
      setLoading(true);
      setError("");
      setIsOwner(false);

      try {
        const detailsPromise = getOrganizationById(id);
        const membersPromise = getOrganizationMembers(id);

        const ownershipPromise = accessToken
          ? getMyOrganizations(accessToken)
          : Promise.resolve(null);

        const [details, membersData, mine] = await Promise.all([
          detailsPromise,
          membersPromise,
          ownershipPromise,
        ]);

        const raw = details.organization ?? details;
        const org = Array.isArray(raw) ? raw[0] : raw;

        if (!org?.id) {
          throw new Error("Organization not found");
        }

        const memberList = Array.isArray(membersData)
          ? membersData
          : membersData.members;

        if (!Array.isArray(memberList)) {
          throw new Error("Unexpected members response");
        }

        const myOrganizations = mine
          ? Array.isArray(mine)
            ? mine
            : (mine.organizations ?? mine.organization)
          : [];

        const owner =
          Array.isArray(myOrganizations) &&
          myOrganizations.some(
            (item) =>
              String(item.id) === String(id) &&
              item.role?.toLowerCase() === "owner",
          );

        if (active) {
          setOrganization(org);
          setMembers(memberList);
          setIsOwner(owner);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load members");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [id, accessToken, authLoading]);

  async function handleAddMember(event) {
    event.preventDefault();

    const trimmedId = userId.trim();

    if (!trimmedId || !isOwner || !accessToken) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await addOrganizationMember(id, trimmedId, accessToken);
      await refreshMembers();

      setUserId("");
      setSuccess("Member added successfully.");
    } catch (err) {
      setError(err.message || "Unable to add member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMember(member) {
    if (!isOwner || !accessToken || removingId) return;

    const memberId = member.user_id ?? member.userId;

    if (!memberId) {
      setError("Member user ID is missing from the API response.");
      return;
    }

    if (member.role?.toLowerCase() === "owner") {
      setError("The organization owner cannot be removed here.");
      return;
    }

    const confirmed = window.confirm(
      `Remove ${member.name ?? member.user_name ?? "this member"} from the organization?`,
    );

    if (!confirmed) return;

    setRemovingId(memberId);
    setError("");
    setSuccess("");

    try {
      await removeOrganizationMember(id, memberId, accessToken);

      await refreshMembers();
      setSuccess("Member removed successfully.");
    } catch (err) {
      setError(err.message || "Unable to remove member.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <Navbar />

      <main className="org-members-page">
        <div className="org-members-container">
          <Link to={`/organizations/${id}`} className="org-members-back">
            <ArrowLeft size={17} />
            Back to organization
          </Link>

          <header className="org-members-header">
            <span className="org-members-eyebrow">ORGANIZATION MANAGEMENT</span>

            <h1>Manage members</h1>

            <p>
              {organization?.name
                ? `Manage the people connected with ${organization.name}.`
                : "View and manage organization members."}
            </p>
          </header>

          {loading ? (
            <div className="org-members-card">Loading members...</div>
          ) : !organization ? (
            <div className="org-members-alert error" role="alert">
              {error || "Organization not found."}
            </div>
          ) : (
            <>
              {error && (
                <div className="org-members-alert error" role="alert">
                  {error}
                </div>
              )}

              {success && (
                <div className="org-members-alert success" role="status">
                  {success}
                </div>
              )}

              <section className="org-members-card">
                <div className="org-members-card-header">
                  <div>
                    <h2>Organization members</h2>
                    <p>
                      {members.length}{" "}
                      {members.length === 1 ? "member" : "members"}
                    </p>
                  </div>

                  <Users size={24} />
                </div>

                {members.length === 0 ? (
                  <p className="org-members-empty">No members to display.</p>
                ) : (
                  <div className="org-members-list">
                    {members.map((member) => {
                      const memberId = member.user_id ?? member.userId;

                      const isMemberOwner =
                        member.role?.toLowerCase() === "owner";

                      return (
                        <div
                          className="org-members-item"
                          key={memberId ?? member.id}
                        >
                          <div className="org-members-avatar">
                            <UserRound size={21} />
                          </div>

                          <div className="org-members-person">
                            <strong>
                              {member.name ?? member.user_name ?? "Member"}
                            </strong>

                            <span>
                              {member.email ??
                                memberId ??
                                "Organization member"}
                            </span>
                          </div>

                          <span
                            className={`org-members-role ${
                              isMemberOwner ? "owner" : ""
                            }`}
                          >
                            {isMemberOwner && <ShieldCheck size={13} />}
                            {member.role ?? "member"}
                          </span>

                          {isOwner && !isMemberOwner && memberId && (
                            <button
                              type="button"
                              className="org-members-remove"
                              onClick={() => handleRemoveMember(member)}
                              disabled={removingId !== null}
                              title="Remove member"
                              aria-label={`Remove ${member.name ?? "member"}`}
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {isOwner && (
                <section className="org-members-card">
                  <div className="org-members-card-header">
                    <div>
                      <h2>Add a member</h2>
                      <p>Add an existing GoodDeed user using their user ID.</p>
                    </div>

                    <UserPlus size={24} />
                  </div>

                  <form onSubmit={handleAddMember} className="org-members-form">
                    <label htmlFor="member-user-id">User ID</label>

                    <div className="org-members-form-row">
                      <input
                        id="member-user-id"
                        type="text"
                        value={userId}
                        onChange={(event) => setUserId(event.target.value)}
                        placeholder="Enter existing user ID"
                        required
                      />

                      <button type="submit" disabled={saving || !userId.trim()}>
                        <UserPlus size={17} />
                        {saving ? "Adding..." : "Add member"}
                      </button>
                    </div>

                    <p className="org-members-hint">
                      The user must already have a GoodDeed account.
                    </p>
                  </form>
                </section>
              )}

              {!isOwner && (
                <p className="org-members-readonly">
                  Only the organization owner can add or remove members.
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
