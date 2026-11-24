import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Gift,
  HandHeart,
  MapPin,
  UserRound,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { useConfirm, useToast } from "../context/notificationContext";
import {
  cancelItemReservation,
  confirmItemHandover,
  getMyApplications,
  getMyClaims,
  getMyItems,
  withdrawApplication,
  withdrawItemClaim,
} from "../services/api";
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

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

const TABS = [
  { id: "applications", label: "Volunteer applications" },
  { id: "donations", label: "My donations" },
  { id: "claims", label: "My claims" },
];

const DONATION_FILTERS = [
  { value: "all", label: "All listings" },
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "donated", label: "Donated" },
  { value: "closed", label: "Closed" },
];

export default function MyActivities() {
  const { accessToken, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("applications");

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const withdrawInFlight = useRef(false);

  const [donations, setDonations] = useState([]);
  const [donationsLoading, setDonationsLoading] = useState(true);
  const [donationsError, setDonationsError] = useState("");
  const [donationFilter, setDonationFilter] = useState("all");

  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsError, setClaimsError] = useState("");
  const [claimBusyId, setClaimBusyId] = useState("");
  const claimActionInFlight = useRef(false);

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

  useEffect(() => {
    if (authLoading || !accessToken) return;

    let active = true;

    async function loadDonations() {
      try {
        const data = await getMyItems(accessToken);

        if (active) {
          setDonations(Array.isArray(data.items) ? data.items : []);
        }
      } catch (err) {
        if (active) {
          setDonationsError(err.message || "Failed to load your items");
        }
      } finally {
        if (active) {
          setDonationsLoading(false);
        }
      }
    }

    loadDonations();

    return () => {
      active = false;
    };
  }, [accessToken, authLoading]);

  useEffect(() => {
    if (authLoading || !accessToken) return;

    let active = true;

    async function loadClaims() {
      try {
        const data = await getMyClaims(accessToken);

        if (active) {
          setClaims(Array.isArray(data.claims) ? data.claims : []);
        }
      } catch (err) {
        if (active) {
          setClaimsError(err.message || "Failed to load your item claims");
        }
      } finally {
        if (active) {
          setClaimsLoading(false);
        }
      }
    }

    loadClaims();

    return () => {
      active = false;
    };
  }, [accessToken, authLoading]);

  async function refreshClaims() {
    const data = await getMyClaims(accessToken);
    setClaims(Array.isArray(data.claims) ? data.claims : []);
  }

  async function refreshDonations() {
    const data = await getMyItems(accessToken);
    setDonations(Array.isArray(data.items) ? data.items : []);
  }

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

  async function handleClaimWithdraw(claim) {
    if (!accessToken || claimActionInFlight.current) return;

    claimActionInFlight.current = true;

    try {
      const confirmed = await confirm({
        title: "Withdraw your request?",
        message: `Withdraw your request for "${claim.item_title}"? You can send a new request later if the item is still available.`,
        confirmLabel: "Withdraw request",
        cancelLabel: "Keep request",
        tone: "danger",
      });

      if (!confirmed) return;

      setClaimBusyId(claim.id);
      setClaimsError("");

      await withdrawItemClaim(claim.id, accessToken);
      toast.success("Request withdrawn.");
      await refreshClaims();
    } catch (err) {
      const text = err.message || "Unable to withdraw request";
      setClaimsError(text);
      toast.error(text);
    } finally {
      claimActionInFlight.current = false;
      setClaimBusyId("");
    }
  }

  async function handleCancelReservation(claim) {
    if (!accessToken || claimActionInFlight.current) return;

    claimActionInFlight.current = true;

    try {
      const confirmed = await confirm({
        title: "Cancel this reservation?",
        message: `Cancel the reservation for "${claim.item_title}"? The item will become available again and other requests can be considered.`,
        confirmLabel: "Cancel reservation",
        cancelLabel: "Keep reservation",
        tone: "danger",
      });

      if (!confirmed) return;

      setClaimBusyId(claim.id);
      setClaimsError("");

      await cancelItemReservation(claim.id, accessToken);
      toast.success("Reservation cancelled. The item is available again.");
      await Promise.all([refreshClaims(), refreshDonations()]);
    } catch (err) {
      const text = err.message || "Unable to cancel reservation";
      setClaimsError(text);
      toast.error(text);
    } finally {
      claimActionInFlight.current = false;
      setClaimBusyId("");
    }
  }

  async function handleConfirmHandover(claim) {
    if (!accessToken || claimActionInFlight.current) return;

    claimActionInFlight.current = true;

    try {
      const confirmed = await confirm({
        title: "Confirm handover?",
        message: `Confirm that you received "${claim.item_title}" from ${claim.donor_name}? Once both parties confirm, the donation is complete and cannot be undone.`,
        confirmLabel: "Confirm handover",
        cancelLabel: "Not yet",
        tone: "primary",
      });

      if (!confirmed) return;

      setClaimBusyId(claim.id);
      setClaimsError("");

      const data = await confirmItemHandover(claim.id, accessToken);

      toast.success(
        data.claim?.status === "completed"
          ? "Donation completed. Thank you for confirming."
          : "Handover confirmed. Waiting for the donor.",
      );
      await Promise.all([refreshClaims(), refreshDonations()]);
    } catch (err) {
      const text = err.message || "Unable to confirm handover";
      setClaimsError(text);
      toast.error(text);
    } finally {
      claimActionInFlight.current = false;
      setClaimBusyId("");
    }
  }

  const visibleDonations =
    donationFilter === "all"
      ? donations
      : donations.filter((item) => item.status === donationFilter);

  return (
    <>
      <Navbar />

      <main className="my-act-page">
        <div className="my-act-container">
          <section className="my-act-hero">
            <span className="my-act-eyebrow">YOUR JOURNEY</span>

            <h1>My activities</h1>

            <p>
              Track the volunteer opportunities you have applied for, the items
              you share, and the items you have requested.
            </p>
          </section>

          <nav className="my-act-tabs" role="tablist" aria-label="My activities">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`my-act-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`my-act-panel-${tab.id}`}
                className={`my-act-tab ${
                  activeTab === tab.id ? "active" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === "applications" && (
            <section
              className="my-act-section"
              role="tabpanel"
              id="my-act-panel-applications"
              aria-labelledby="my-act-tab-applications"
            >
              <div className="my-act-heading">
                <div>
                  <span className="my-act-eyebrow">
                    VOLUNTEER APPLICATIONS
                  </span>
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
                            <span className="my-act-badge-label">
                              Application
                            </span>

                            <span
                              className={`my-act-status-badge status-${application.status}`}
                            >
                              {application.status}
                            </span>
                          </span>

                          <span className="my-act-badge-group">
                            <span className="my-act-badge-label">
                              Opportunity
                            </span>

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
          )}

          {activeTab === "donations" && (
            <section
              className="my-act-section"
              role="tabpanel"
              id="my-act-panel-donations"
              aria-labelledby="my-act-tab-donations"
            >
              <div className="my-act-heading">
                <div>
                  <span className="my-act-eyebrow">ITEM SHARING</span>
                  <h2>My donations</h2>
                </div>

                <Gift size={24} />
              </div>

              <div className="my-act-toolbar">
                <label className="my-act-filter">
                  <span>Filter by status</span>
                  <select
                    value={donationFilter}
                    onChange={(event) =>
                      setDonationFilter(event.target.value)
                    }
                  >
                    {DONATION_FILTERS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {donationsError && (
                <p className="my-act-error" role="alert">
                  {donationsError}
                </p>
              )}

              {donationsLoading && (
                <p className="my-act-status">Loading your item listings...</p>
              )}

              {!donationsLoading &&
                !donationsError &&
                visibleDonations.length === 0 && (
                  <div className="my-act-empty">
                    <Gift size={35} />
                    <h3>
                      {donations.length === 0
                        ? "No items listed yet"
                        : "No listings match this filter"}
                    </h3>
                    <p>
                      {donations.length === 0
                        ? "When you offer an item for free, it will appear here with its requests and handover status."
                        : "Choose a different status to see your other listings."}
                    </p>

                    <Link to="/items/new">
                      List a free item
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                )}

              {!donationsLoading && visibleDonations.length > 0 && (
                <div className="my-act-list">
                  {visibleDonations.map((item) => (
                    <article className="my-act-card" key={item.id}>
                      <div className="my-act-card-main my-act-with-thumb">
                        <div className="my-act-thumb">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} />
                          ) : (
                            <Gift size={22} />
                          )}
                        </div>

                        <div className="my-act-thumb-content">
                          <div className="my-act-card-top">
                            <span className="my-act-badge-group">
                              <span className="my-act-badge-label">Item</span>
                              <span
                                className={`my-act-item-badge item-${item.status}`}
                              >
                                {item.status}
                              </span>
                            </span>

                            <span className="my-act-badge-group">
                              <span className="my-act-badge-label">Requests</span>
                              <span className="my-act-count-badge">
                                {item.pending_claim_count} pending
                              </span>
                            </span>
                          </div>

                          <h3>{item.title}</h3>

                          <div className="my-act-meta">
                            <span>
                              <MapPin size={14} />
                              {item.city}
                            </span>
                            <span>
                              <CalendarDays size={14} />
                              Listed: {formatDate(item.created_at)}
                            </span>
                          </div>

                          {item.recipient_name && (
                            <p className="my-act-recipient">
                              <UserRound size={13} />
                              Recipient: <strong>{item.recipient_name}</strong>
                            </p>
                          )}

                          {item.status === "reserved" && (
                            <div className="my-act-confirmations">
                              <span
                                className={
                                  item.donor_confirmed_at ? "confirmed" : ""
                                }
                              >
                                {item.donor_confirmed_at ? "✓" : "○"} Donor
                                confirmed
                              </span>
                              <span
                                className={
                                  item.recipient_confirmed_at ? "confirmed" : ""
                                }
                              >
                                {item.recipient_confirmed_at ? "✓" : "○"}{" "}
                                Recipient confirmed
                              </span>
                            </div>
                          )}

                          {item.status === "donated" && item.completed_at && (
                            <p className="my-act-completed">
                              <CheckCircle2 size={14} />
                              Donated on {formatDate(item.completed_at)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="my-act-card-actions">
                        <Link to={`/items/${item.id}`} className="my-act-view">
                          View item
                          <ArrowRight size={15} />
                        </Link>

                        <Link
                          to={`/items/${item.id}#received-claims`}
                          className="my-act-manage"
                        >
                          Manage claims
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "claims" && (
            <section
              className="my-act-section"
              role="tabpanel"
              id="my-act-panel-claims"
              aria-labelledby="my-act-tab-claims"
            >
              <div className="my-act-heading">
                <div>
                  <span className="my-act-eyebrow">ITEM REQUESTS</span>
                  <h2>My claims</h2>
                </div>

                <HandHeart size={24} />
              </div>

              {claimsError && (
                <p className="my-act-error" role="alert">
                  {claimsError}
                </p>
              )}

              {claimsLoading && (
                <p className="my-act-status">Loading your item requests...</p>
              )}

              {!claimsLoading && !claimsError && claims.length === 0 && (
                <div className="my-act-empty">
                  <HandHeart size={35} />
                  <h3>No item requests yet</h3>
                  <p>
                    When you request a free item, its status and handover
                    details will appear here.
                  </p>

                  <Link to="/items">
                    Browse free items
                    <ArrowRight size={15} />
                  </Link>
                </div>
              )}

              {!claimsLoading && claims.length > 0 && (
                <div className="my-act-list">
                  {claims.map((claim) => (
                    <article className="my-act-card" key={claim.id}>
                      <div className="my-act-card-main my-act-with-thumb">
                        <div className="my-act-thumb">
                          {claim.item_image_url ? (
                            <img
                              src={claim.item_image_url}
                              alt={claim.item_title}
                            />
                          ) : (
                            <Gift size={22} />
                          )}
                        </div>

                        <div className="my-act-thumb-content">
                          <div className="my-act-card-top">
                            <span className="my-act-badge-group">
                              <span className="my-act-badge-label">Claim</span>
                              <span
                                className={`my-act-status-badge status-${claim.status}`}
                              >
                                {claim.status}
                              </span>
                            </span>

                            <span className="my-act-badge-group">
                              <span className="my-act-badge-label">Item</span>
                              <span
                                className={`my-act-item-badge item-${claim.item_status}`}
                              >
                                {claim.item_status}
                              </span>
                            </span>
                          </div>

                          <h3>{claim.item_title}</h3>

                          <span className="my-act-org">
                            <UserRound size={14} />
                            Donor: {claim.donor_name}
                          </span>

                          <div className="my-act-meta">
                            <span>
                              <MapPin size={14} />
                              {claim.item_city || "Location not specified"}
                            </span>
                            <span>
                              <CalendarDays size={14} />
                              Requested: {formatDateTime(claim.created_at)}
                            </span>
                            {claim.completed_at && (
                              <span>
                                <CheckCircle2 size={14} />
                                Completed: {formatDate(claim.completed_at)}
                              </span>
                            )}
                          </div>

                          {claim.status === "accepted" && (
                            <p className="my-act-handover-note">
                              {claim.my_confirmed_at && !claim.other_confirmed_at
                                ? "You confirmed the handover. Waiting for the donor."
                                : !claim.my_confirmed_at &&
                                    claim.other_confirmed_at
                                  ? "The donor confirmed the handover. Your confirmation will complete the donation."
                                  : "Coordinate a public handover with the donor, then both of you confirm."}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="my-act-card-actions">
                        <Link
                          to={`/items/${claim.item_id}`}
                          className="my-act-view"
                        >
                          View item
                          <ArrowRight size={15} />
                        </Link>

                        {claim.can_withdraw && (
                          <button
                            type="button"
                            className="my-act-withdraw"
                            disabled={claimBusyId === claim.id}
                            onClick={() => handleClaimWithdraw(claim)}
                          >
                            {claimBusyId === claim.id
                              ? "Withdrawing..."
                              : "Withdraw"}
                          </button>
                        )}

                        {claim.can_cancel && (
                          <button
                            type="button"
                            className="my-act-withdraw"
                            disabled={claimBusyId === claim.id}
                            onClick={() => handleCancelReservation(claim)}
                          >
                            {claimBusyId === claim.id
                              ? "Cancelling..."
                              : "Cancel reservation"}
                          </button>
                        )}

                        {claim.can_confirm && (
                          <button
                            type="button"
                            className="my-act-confirm"
                            disabled={claimBusyId === claim.id}
                            onClick={() => handleConfirmHandover(claim)}
                          >
                            {claimBusyId === claim.id
                              ? "Confirming..."
                              : "Confirm handover"}
                          </button>
                        )}
                      </div>
                    </article>
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
