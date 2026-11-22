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
  Clock,
  MapPin,
  Users,
} from "lucide-react";

import Navbar from "../components/navbar";
import OpportunityOwnerActions from "../components/opportunityOwnerActions";
import { useAuth } from "../context/authContext";
import { getOpportunityById } from "../services/api";
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
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
