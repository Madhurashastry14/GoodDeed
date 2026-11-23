import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  MapPin,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { useConfirm, useToast } from "../context/notificationContext";
import { getMyApplications, withdrawApplication } from "../services/api";
import "../styles/myActivities.css";

function formatDateTime(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MyActivities() {
  const { accessToken, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const withdrawInFlight = useRef(false);

  useEffect(() => {
    if (authLoading || !accessToken) return;

    let active = true;

    async function loadApplications() {
      try {
        const data = await getMyApplications(accessToken);

        if (active) {
          setApplications(
            Array.isArray(data.applications) ? data.applications : [],
          );
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load your applications");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadApplications();

    return () => {
      active = false;
    };
  }, [accessToken, authLoading]);

  async function handleWithdraw(application) {
    if (!accessToken || withdrawInFlight.current) return;

    withdrawInFlight.current = true;

    try {
      const confirmed = await confirm({
        title: "Withdraw application?",
        message: `Withdraw your application for "${application.opportunity_title}"?`,
        confirmLabel: "Withdraw application",
        cancelLabel: "Keep application",
        tone: "danger",
      });

      if (!confirmed) return;

      setBusyId(application.id);
      setError("");
      setMessage("");

      const data = await withdrawApplication(application.id, accessToken);

      setApplications((previous) =>
        previous.map((item) =>
          item.id === application.id
            ? { ...item, ...data.application, can_withdraw: false }
            : item,
        ),
      );
      setMessage("Your application has been withdrawn.");
      toast.success("Application withdrawn successfully.");

      // Refresh from the server so the list reflects the stored status.
      try {
        const refreshed = await getMyApplications(accessToken);

        setApplications(
          Array.isArray(refreshed.applications) ? refreshed.applications : [],
        );
      } catch {
        // Keep the optimistic update if the refresh fails.
      }
    } catch (err) {
      const message = err.message || "Unable to withdraw application";

      setError(message);
      toast.error(message);
    } finally {
      withdrawInFlight.current = false;
      setBusyId("");
    }
  }

  return (
    <>
      <Navbar />

      <main className="my-act-page">
        <div className="my-act-container">
          <section className="my-act-hero">
            <span className="my-act-eyebrow">YOUR JOURNEY</span>

            <h1>My activities</h1>

            <p>
              Track the volunteer opportunities you have applied for and manage
              your applications.
            </p>
          </section>

          <section className="my-act-section">
            <div className="my-act-heading">
              <div>
                <span className="my-act-eyebrow">VOLUNTEER APPLICATIONS</span>
                <h2>My applications</h2>
              </div>

              <ClipboardList size={24} />
            </div>

            {message && (
              <p className="my-act-success" role="status">
                {message}
              </p>
            )}

            {error && (
              <p className="my-act-error" role="alert">
                {error}
              </p>
            )}

            {loading && (
              <p className="my-act-status">Loading your applications...</p>
            )}

            {!loading && applications.length === 0 && (
              <div className="my-act-empty">
                <ClipboardList size={35} />
                <h3>No applications yet</h3>
                <p>
                  When you apply for a volunteer opportunity, it will appear
                  here.
                </p>

                <Link to="/opportunities">
                  Browse opportunities
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}

            {!loading && applications.length > 0 && (
              <div className="my-act-list">
                {applications.map((application) => (
                  <article className="my-act-card" key={application.id}>
                    <div className="my-act-card-main">
                      <div className="my-act-card-top">
                        <span className="my-act-badge-group">
                          <span className="my-act-badge-label">Application</span>

                          <span
                            className={`my-act-status-badge status-${application.status}`}
                          >
                            {application.status}
                          </span>
                        </span>

                        <span className="my-act-badge-group">
                          <span className="my-act-badge-label">Opportunity</span>

                          <span
                            className={`my-act-opp-badge opp-${application.opportunity_status}`}
                          >
                            {application.opportunity_status}
                          </span>
                        </span>
                      </div>

                      <h3>{application.opportunity_title}</h3>

                      <span className="my-act-org">
                        <Building2 size={14} />
                        {application.organization_name}
                      </span>

                      <div className="my-act-meta">
                        <span>
                          <MapPin size={14} />
                          {application.city || "Location not specified"}
                        </span>

                        <span>
                          <CalendarDays size={14} />
                          Starts: {formatDateTime(application.starts_at)}
                        </span>

                        <span>
                          Applied: {formatDateTime(application.applied_at)}
                        </span>
                      </div>
                    </div>

                    <div className="my-act-card-actions">
                      {application.opportunity_status === "published" ? (
                        <Link
                          to={`/opportunities/${application.opportunity_id}`}
                          className="my-act-view"
                        >
                          View opportunity
                          <ArrowRight size={15} />
                        </Link>
                      ) : (
                        <Link
                          to={`/organizations/${application.organization_id}`}
                          className="my-act-view"
                        >
                          View organization
                          <ArrowRight size={15} />
                        </Link>
                      )}

                      {application.can_withdraw && (
                        <button
                          type="button"
                          className="my-act-withdraw"
                          disabled={busyId === application.id}
                          onClick={() => handleWithdraw(application)}
                        >
                          {busyId === application.id
                            ? "Withdrawing..."
                            : "Withdraw"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
