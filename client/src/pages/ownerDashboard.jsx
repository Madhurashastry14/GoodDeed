import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Clock,
  FileText,
  Globe,
  Layers,
  MapPin,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { useToast } from "../context/notificationContext";
import { getOrganizationDashboard } from "../services/api";
import "../styles/ownerDashboard.css";

function formatDateTime(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

const SUMMARY_TONES = ["green", "blue", "amber", "amber", "green", "slate"];

export default function OwnerDashboard() {
  const { id } = useParams();
  const { accessToken, loading: authLoading } = useAuth();
  const toast = useToast();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      if (!accessToken) {
        if (active) {
          setLoading(false);
          setError("Please log in to view this dashboard.");
        }

        return;
      }

      try {
        const data = await getOrganizationDashboard(id, accessToken);

        if (active) {
          setDashboard(data);
        }
      } catch (err) {
        const message = err.message || "Failed to load the owner dashboard";

        if (active) {
          setError(message);
          toast.error(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [id, accessToken, authLoading, toast, reloadKey]);

  if (loading || authLoading) {
    return (
      <>
        <Navbar />
        <main className="odash-status">Loading owner dashboard...</main>
      </>
    );
  }

  if (error || !dashboard) {
    return (
      <>
        <Navbar />
        <main className="odash-status">
          <h2>Unable to load owner dashboard</h2>
          <p>{error || "Dashboard not found"}</p>

          <div className="odash-status-actions">
            <button
              type="button"
              className="odash-status-retry"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Try again
            </button>

            <Link to={`/organizations/${id}`}>Back to organization</Link>
          </div>
        </main>
      </>
    );
  }

  const { organization, statistics: stats } = dashboard;
  const upcoming = dashboard.upcoming_opportunities ?? [];
  const pending = dashboard.pending_application_opportunities ?? [];

  const summaryCards = [
    {
      label: "Total opportunities",
      value: stats.total_opportunities,
      icon: Layers,
    },
    {
      label: "Published opportunities",
      value: stats.published_opportunities,
      icon: Globe,
    },
    {
      label: "Draft opportunities",
      value: stats.draft_opportunities,
      icon: FileText,
    },
    {
      label: "Pending applications",
      value: stats.pending_applications,
      icon: Clock,
    },
    {
      label: "Accepted applications",
      value: stats.accepted_applications,
      icon: UserCheck,
      detail: `${pluralize(
        stats.unique_accepted_volunteers,
        "unique volunteer",
      )} across all opportunities`,
    },
    {
      label: "Completed opportunities",
      value: stats.completed_opportunities,
      icon: CheckCircle,
    },
  ];

  const reviewPath =
    pending.length > 0
      ? `/opportunities/${pending[0].id}`
      : `/organizations/${id}`;

  return (
    <>
      <Navbar />

      <main className="odash-page">
        <div className="odash-container">
          <Link to={`/organizations/${id}`} className="odash-back">
            <ArrowLeft size={17} />
            Back to organization
          </Link>

          <section className="odash-hero">
            <div className="odash-hero-copy">
              <span className="odash-eyebrow">ORGANIZATION OWNER</span>

              <h1>{organization.name}</h1>

              <p>
                <MapPin size={15} />
                {organization.city || "Location not specified"} · Track
                opportunities, volunteers, and applications.
              </p>
            </div>

            <Link
              to={`/organizations/${id}/opportunities/new`}
              className="odash-primary"
            >
              <Plus size={17} />
              Create opportunity
            </Link>
          </section>

          <section
            className="odash-stats-grid"
            aria-label="Organization statistics"
          >
            {summaryCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <article className="odash-stat-card" key={card.label}>
                  <div
                    className={`odash-stat-icon odash-stat-icon--${
                      SUMMARY_TONES[index]
                    }`}
                  >
                    <Icon size={21} />
                  </div>

                  <div>
                    <span className="odash-stat-value">{card.value ?? 0}</span>
                    <span className="odash-stat-label">{card.label}</span>

                    {card.detail && (
                      <span className="odash-stat-detail">{card.detail}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          <div className="odash-main-grid">
            <section className="odash-panel">
              <div className="odash-panel-heading">
                <div>
                  <span className="odash-panel-label">COMING UP</span>
                  <h2>Upcoming opportunities</h2>

                  {stats.upcoming_published_opportunities > 0 && (
                    <p>
                      {pluralize(
                        stats.upcoming_published_opportunities,
                        "published opportunity",
                        "published opportunities",
                      )}{" "}
                      still ahead.
                    </p>
                  )}
                </div>

                <CalendarDays size={23} />
              </div>

              {upcoming.length === 0 ? (
                <div className="odash-empty">
                  <CalendarDays size={28} />
                  <h3>No upcoming opportunities</h3>
                  <p>
                    Publish an opportunity with a future start date to see it
                    here.
                  </p>

                  <Link to={`/organizations/${id}/opportunities/new`}>
                    Create an opportunity <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <div className="odash-upcoming-list">
                  {upcoming.map((opportunity) => (
                    <article
                      className="odash-upcoming-item"
                      key={opportunity.id}
                    >
                      <div className="odash-upcoming-main">
                        <span className="odash-upcoming-date">
                          <CalendarDays size={14} />
                          {formatDateTime(opportunity.starts_at)}
                        </span>

                        <h3>{opportunity.title}</h3>

                        <div className="odash-upcoming-meta">
                          <span>
                            <MapPin size={14} />
                            {opportunity.city || "Location not specified"}
                          </span>

                          <span>
                            <Users size={14} />
                            Capacity:{" "}
                            {opportunity.capacity ?? "Not specified"}
                          </span>

                          <span>
                            <UserCheck size={14} />
                            {pluralize(
                              opportunity.accepted_count ?? 0,
                              "accepted volunteer",
                            )}
                          </span>
                        </div>
                      </div>

                      <Link
                        to={`/opportunities/${opportunity.id}`}
                        className="odash-item-link"
                      >
                        View details
                        <ArrowRight size={15} />
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="odash-panel">
              <div className="odash-panel-heading">
                <div>
                  <span className="odash-panel-label">NEEDS ATTENTION</span>
                  <h2>Pending applications</h2>

                  {stats.pending_applications > 0 && (
                    <p>
                      {pluralize(
                        stats.pending_applications,
                        "application waiting",
                        "applications waiting",
                      )}{" "}
                      for review.
                    </p>
                  )}
                </div>

                <ClipboardList size={23} />
              </div>

              {pending.length === 0 ? (
                <div className="odash-empty">
                  <CheckCircle size={28} />
                  <h3>No pending applications</h3>
                  <p>
                    Applications waiting for a decision will appear here.
                  </p>
                </div>
              ) : (
                <div className="odash-pending-list">
                  {pending.map((opportunity) => (
                    <article
                      className="odash-pending-item"
                      key={opportunity.id}
                    >
                      <div>
                        <h3>{opportunity.title}</h3>

                        <span>
                          <Clock size={14} />
                          {pluralize(
                            opportunity.pending_application_count,
                            "pending application",
                          )}{" "}
                          · Starts {formatDateTime(opportunity.starts_at)}
                        </span>
                      </div>

                      <Link
                        to={`/opportunities/${opportunity.id}`}
                        className="odash-item-link"
                      >
                        Review applicants
                        <ArrowRight size={15} />
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="odash-quick-section">
            <div className="odash-panel-heading">
              <div>
                <span className="odash-panel-label">MANAGE</span>
                <h2>Quick actions</h2>
              </div>
            </div>

            <div className="odash-quick-grid">
              <Link
                to={`/organizations/${id}/opportunities/new`}
                className="odash-quick-card"
              >
                <span className="odash-quick-icon">
                  <Plus size={20} />
                </span>
                <div>
                  <strong>Create opportunity</strong>
                  <span>Start a new draft for this organization.</span>
                </div>
                <ArrowRight size={17} />
              </Link>

              <Link
                to={`/organizations/${id}`}
                className="odash-quick-card"
              >
                <span className="odash-quick-icon">
                  <Layers size={20} />
                </span>
                <div>
                  <strong>View all opportunities</strong>
                  <span>Manage drafts, published, and past events.</span>
                </div>
                <ArrowRight size={17} />
              </Link>

              <Link to={reviewPath} className="odash-quick-card">
                <span className="odash-quick-icon">
                  <UserCheck size={20} />
                </span>
                <div>
                  <strong>Review applications</strong>
                  <span>Accept or reject volunteer applicants.</span>
                </div>
                <ArrowRight size={17} />
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
