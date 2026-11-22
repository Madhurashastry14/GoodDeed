import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle,
  Clock,
  MapPin,
  Send,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import Navbar from "../components/navbar";
import OpportunityOwnerActions from "../components/opportunityOwnerActions";
import { useAuth } from "../context/authContext";
import {
  acceptApplication,
  applyToOpportunity,
  getMyApplications,
  getOpportunityApplications,
  getOpportunityById,
  rejectApplication,
  withdrawApplication,
} from "../services/api";
import "../styles/opportunityDetails.css";

const STATUSES = ["draft", "published", "cancelled", "completed"];

function formatDateTime(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function OpportunityDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { accessToken, loading: authLoading } = useAuth();

  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message] = useState(location.state?.message || "");

  const [myApplication, setMyApplication] = useState(null);
  const [applicationLoaded, setApplicationLoaded] = useState(false);
  const [applicationBusy, setApplicationBusy] = useState(false);
  const [applicationError, setApplicationError] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");

  const [applicants, setApplicants] = useState([]);
  const [applicantSummary, setApplicantSummary] = useState(null);
  const [applicantsLoading, setApplicantsLoading] = useState(true);
  const [applicantsError, setApplicantsError] = useState("");
  const [applicantMessage, setApplicantMessage] = useState("");
  const [applicantBusy, setApplicantBusy] = useState("");

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function loadOpportunity() {
      setLoading(true);
      setError("");
      setOpportunity(null);

      try {
        const data = await getOpportunityById(id, accessToken);
        const result = data.opportunity ?? data;

        if (!result || !result.id) {
          throw new Error("Opportunity not found");
        }

        if (active) {
          setOpportunity(result);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load opportunity");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOpportunity();

    return () => {
      active = false;
    };
  }, [id, accessToken, authLoading]);

  useEffect(() => {
    if (authLoading || !accessToken) return;

    let active = true;

    async function loadMyApplication() {
      try {
        const data = await getMyApplications(accessToken);
        const found = (data.applications || []).find(
          (application) => application.opportunity_id === id,
        );

        if (active) {
          setMyApplication(found ?? null);
        }
      } catch (err) {
        if (active) {
          setApplicationError(err.message || "Failed to load application");
        }
      } finally {
        if (active) {
          setApplicationLoaded(true);
        }
      }
    }

    loadMyApplication();

    return () => {
      active = false;
    };
  }, [id, accessToken, authLoading]);

  useEffect(() => {
    if (authLoading || !accessToken || !opportunity?.is_owner) return;

    let active = true;

    async function loadApplicants() {
      try {
        const data = await getOpportunityApplications(
          opportunity.id,
          accessToken,
        );

        if (active) {
          setApplicants(
            Array.isArray(data.applications) ? data.applications : [],
          );
          setApplicantSummary(data.opportunity ?? null);
        }
      } catch (err) {
        if (active) {
          setApplicantsError(err.message || "Failed to load applicants");
        }
      } finally {
        if (active) {
          setApplicantsLoading(false);
        }
      }
    }

    loadApplicants();

    return () => {
      active = false;
    };
  }, [opportunity?.id, opportunity?.is_owner, accessToken, authLoading]);

  async function handleApply() {
    if (!accessToken || !opportunity) return;

    if (!window.confirm(`Apply to "${opportunity.title}"?`)) return;

    setApplicationBusy(true);
    setApplicationError("");
    setApplicationMessage("");

    try {
      const data = await applyToOpportunity(opportunity.id, accessToken);

      setMyApplication({
        ...data.application,
        opportunity_id: opportunity.id,
      });
      setApplicationMessage("Your application has been submitted.");
    } catch (err) {
      setApplicationError(err.message || "Unable to submit application");
    } finally {
      setApplicationBusy(false);
    }
  }

  async function handleWithdraw() {
    if (!accessToken || !myApplication) return;

    if (!window.confirm("Withdraw your application for this opportunity?")) {
      return;
    }

    const wasAccepted = myApplication.status === "accepted";

    setApplicationBusy(true);
    setApplicationError("");
    setApplicationMessage("");

    try {
      const data = await withdrawApplication(myApplication.id, accessToken);

      setMyApplication((previous) => ({
        ...previous,
        ...data.application,
      }));

      if (wasAccepted) {
        setOpportunity((previous) => ({
          ...previous,
          accepted_count: Math.max(
            (Number(previous.accepted_count) || 0) - 1,
            0,
          ),
        }));
      }

      setApplicationMessage("Your application has been withdrawn.");
    } catch (err) {
      setApplicationError(err.message || "Unable to withdraw application");
    } finally {
      setApplicationBusy(false);
    }
  }

  async function handleApplicantAction(application, action) {
    if (!accessToken || !opportunity) return;

    const label = action === "accept" ? "Accept" : "Reject";

    if (
      !window.confirm(
        `${label} ${application.applicant_name}'s application?`,
      )
    ) {
      return;
    }

    setApplicantBusy(`${action}-${application.id}`);
    setApplicantsError("");
    setApplicantMessage("");

    try {
      const request =
        action === "accept" ? acceptApplication : rejectApplication;

      await request(application.id, accessToken);

      const refreshed = await getOpportunityApplications(
        opportunity.id,
        accessToken,
      );

      setApplicants(
        Array.isArray(refreshed.applications)
          ? refreshed.applications
          : [],
      );
      setApplicantSummary(refreshed.opportunity ?? null);
      setOpportunity((previous) => ({
        ...previous,
        accepted_count: refreshed.opportunity?.accepted_count ?? 0,
      }));
      setApplicantMessage(
        `Application ${action === "accept" ? "accepted" : "rejected"}.`,
      );
    } catch (err) {
      setApplicantsError(err.message || "Unable to update application");
    } finally {
      setApplicantBusy("");
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="opp-detail-status">Loading opportunity...</main>
      </>
    );
  }

  if (error || !opportunity) {
    return (
      <>
        <Navbar />
        <main className="opp-detail-status">
          <h2>Unable to load opportunity</h2>
          <p>{error || "Opportunity not found"}</p>
          <Link to="/opportunities">Browse opportunities</Link>
        </main>
      </>
    );
  }

  const status = STATUSES.includes(opportunity.status)
    ? opportunity.status
    : "draft";

  const capacity = opportunity.capacity;
  const accepted = Number(opportunity.accepted_count) || 0;
  const remaining = capacity === null ? null : Math.max(capacity - accepted, 0);

  return (
    <>
      <Navbar />

      <main className="opp-detail-page">
        <div className="opp-detail-container">
          <Link
            to={`/organizations/${opportunity.organization_id}`}
            className="opp-detail-back"
          >
            <ArrowLeft size={17} />
            Back to organization
          </Link>

          {message && (
            <div className="opp-detail-notice" role="status">
              {message}
            </div>
          )}

          <section className="opp-detail-hero">
            <div className="opp-detail-hero-content">
              <div className="opp-detail-badges">
                <span className="opp-detail-eyebrow">
                  VOLUNTEER OPPORTUNITY
                </span>

                <span className={`opp-detail-status-badge status-${status}`}>
                  {status}
                </span>
              </div>

              <h1>{opportunity.title}</h1>

              <Link
                to={`/organizations/${opportunity.organization_id}`}
                className="opp-detail-org"
              >
                <Building2 size={17} />
                {opportunity.organization_name}
              </Link>

              <div className="opp-detail-meta">
                <span>
                  <MapPin size={16} />
                  {opportunity.city || "Location not specified"}
                </span>
              </div>
            </div>

            {opportunity.is_owner && (
              <div className="opp-detail-actions">
                <OpportunityOwnerActions
                  opportunity={opportunity}
                  accessToken={accessToken}
                  onUpdated={(updated) =>
                    setOpportunity((previous) => ({
                      ...previous,
                      ...updated,
                    }))
                  }
                  onDeleted={() =>
                    navigate(
                      `/organizations/${opportunity.organization_id}`,
                      {
                        state: {
                          message: "Draft opportunity deleted.",
                        },
                      },
                    )
                  }
                />
              </div>
            )}
          </section>

          <div className="opp-detail-grid">
            <section className="opp-detail-card">
              <h2>About this opportunity</h2>

              <p className="opp-detail-description">
                {opportunity.description ||
                  "This opportunity has not added a description yet."}
              </p>
            </section>

            <section className="opp-detail-card">
              <h2>Details</h2>

              <div className="opp-detail-info">
                <div>
                  <CalendarDays size={17} />
                  <div>
                    <span>Starts</span>
                    <strong>{formatDateTime(opportunity.starts_at)}</strong>
                  </div>
                </div>

                <div>
                  <Clock size={17} />
                  <div>
                    <span>Ends</span>
                    <strong>{formatDateTime(opportunity.ends_at)}</strong>
                  </div>
                </div>

                <div>
                  <Users size={17} />
                  <div>
                    <span>Volunteer capacity</span>
                    <strong>
                      {capacity === null ? "Not specified" : capacity}
                    </strong>
                  </div>
                </div>

                <div>
                  <Users size={17} />
                  <div>
                    <span>Accepted volunteers</span>
                    <strong>
                      {accepted}
                      {remaining === null
                        ? ""
                        : ` · ${remaining} spot${remaining === 1 ? "" : "s"} left`}
                    </strong>
                  </div>
                </div>

                <div>
                  <Send size={17} />
                  <div>
                    <span>Applications</span>
                    <strong>
                      {status !== "published"
                        ? "Not open"
                        : opportunity.applications_open
                          ? "Open"
                          : "Closed"}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {!opportunity.is_owner && (
            <section className="opp-action-card">
              <div className="opp-action-heading">
                <div>
                  <span className="opp-detail-eyebrow">GET INVOLVED</span>
                  <h2>Volunteer application</h2>
                </div>

                <Send size={22} />
              </div>

              {applicationMessage && (
                <p className="opp-action-success" role="status">
                  {applicationMessage}
                </p>
              )}

              {applicationError && (
                <p className="opp-action-error" role="alert">
                  {applicationError}
                </p>
              )}

              {!accessToken ? (
                <p className="opp-action-text">
                  <Link
                    to="/login"
                    state={{ from: location.pathname }}
                    className="opp-action-link"
                  >
                    Log in
                  </Link>{" "}
                  to apply for this opportunity.
                </p>
              ) : !applicationLoaded ? (
                <p className="opp-action-text">Checking your application...</p>
              ) : myApplication ? (
                <div className="opp-my-application">
                  <p>
                    Your application status:{" "}
                    <span
                      className={`opp-app-status status-${myApplication.status}`}
                    >
                      {myApplication.status}
                    </span>
                  </p>

                  {myApplication.status === "accepted" && (
                    <p className="opp-action-text">
                      You are confirmed for this opportunity. We look forward to
                      seeing you there.
                    </p>
                  )}

                  {["pending", "accepted"].includes(myApplication.status) &&
                    opportunity.applications_open && (
                      <button
                        type="button"
                        className="opp-secondary-btn"
                        onClick={handleWithdraw}
                        disabled={applicationBusy}
                      >
                        {applicationBusy
                          ? "Withdrawing..."
                          : "Withdraw application"}
                      </button>
                    )}
                </div>
              ) : !opportunity.applications_open ? (
                <p className="opp-action-text">
                  Applications are closed for this opportunity.
                </p>
              ) : capacity !== null && accepted >= capacity ? (
                <p className="opp-action-text">
                  This opportunity is full. Check back later for openings.
                </p>
              ) : (
                <div className="opp-apply-row">
                  <p className="opp-action-text">
                    Applications are open.{" "}
                    {remaining === null
                      ? "Volunteer capacity is not limited."
                      : `${remaining} spot${remaining === 1 ? "" : "s"} remaining.`}
                  </p>

                  <button
                    type="button"
                    className="opp-apply-btn"
                    onClick={handleApply}
                    disabled={applicationBusy}
                  >
                    {applicationBusy ? "Applying..." : "Apply to volunteer"}
                  </button>
                </div>
              )}
            </section>
          )}

          {opportunity.is_owner && (
            <section className="opp-action-card">
              <div className="opp-action-heading">
                <div>
                  <span className="opp-detail-eyebrow">
                    MANAGE VOLUNTEERS
                  </span>
                  <h2>Applicants</h2>
                </div>

                <UserRound size={22} />
              </div>

              {applicantMessage && (
                <p className="opp-action-success" role="status">
                  {applicantMessage}
                </p>
              )}

              {applicantsError && (
                <p className="opp-action-error" role="alert">
                  {applicantsError}
                </p>
              )}

              {applicantSummary && (
                <p className="opp-applicants-summary">
                  {applicantSummary.accepted_count} accepted ·{" "}
                  {applicantSummary.remaining_capacity === null
                    ? "Unlimited capacity"
                    : `${applicantSummary.remaining_capacity} of ${applicantSummary.capacity} spots remaining`}
                </p>
              )}

              {applicantsLoading ? (
                <p className="opp-action-text">Loading applicants...</p>
              ) : applicants.length === 0 ? (
                <p className="opp-action-text">
                  No volunteer applications yet.
                </p>
              ) : (
                <div className="opp-applicant-list">
                  {applicants.map((application) => (
                    <div
                      className="opp-applicant-row"
                      key={application.id}
                    >
                      <div className="opp-applicant-person">
                        <div className="opp-applicant-avatar">
                          <UserRound size={18} />
                        </div>

                        <div>
                          <strong>
                            {application.applicant_name || "Volunteer"}
                          </strong>
                          <span>
                            Applied {formatDateTime(application.applied_at)}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`opp-app-status status-${application.status}`}
                      >
                        {application.status}
                      </span>

                      {opportunity.status === "published" &&
                        application.status === "pending" && (
                          <div className="opp-applicant-actions">
                            <button
                              type="button"
                              className="opp-app-accept"
                              disabled={Boolean(applicantBusy)}
                              onClick={() =>
                                handleApplicantAction(application, "accept")
                              }
                            >
                              <CheckCircle size={14} />
                              {applicantBusy === `accept-${application.id}`
                                ? "Accepting..."
                                : "Accept"}
                            </button>

                            <button
                              type="button"
                              className="opp-app-reject"
                              disabled={Boolean(applicantBusy)}
                              onClick={() =>
                                handleApplicantAction(application, "reject")
                              }
                            >
                              <XCircle size={14} />
                              {applicantBusy === `reject-${application.id}`
                                ? "Rejecting..."
                                : "Reject"}
                            </button>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </>
  );
}
