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
  PackageCheck,
  UserRound,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { useConfirm, useToast } from "../context/notificationContext";
import {
  offerStatusLabel,
  requestStatusLabel,
  urgencyLabel,
} from "../constants/itemRequests";
import {
  cancelItemReservation,
  cancelItemRequestOffer,
  confirmItemHandover,
  confirmItemRequestHandover,
  getMyApplications,
  getMyClaims,
  getMyItemRequestOffers,
  getMyItemRequests,
  getMyItems,
  reopenItemRequest,
  submitItemRequest,
  withdrawApplication,
  withdrawItemClaim,
  withdrawItemRequestOffer,
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
  { id: "item-requests", label: "My item requests" },
  { id: "fulfillment-offers", label: "My fulfillment offers" },
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

  const [itemRequests, setItemRequests] = useState([]);
  const [itemRequestsLoading, setItemRequestsLoading] = useState(true);
  const [itemRequestsError, setItemRequestsError] = useState("");
  const [requestBusyId, setRequestBusyId] = useState("");
  const requestActionInFlight = useRef(false);

  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState("");
  const [offerBusyId, setOfferBusyId] = useState("");
  const offerActionInFlight = useRef(false);

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

  useEffect(() => {
    if (authLoading || !accessToken) return;

    let active = true;

    async function loadItemRequests() {
      try {
        const data = await getMyItemRequests(accessToken);

        if (active) {
          setItemRequests(
            Array.isArray(data.requests) ? data.requests : [],
          );
        }
      } catch (err) {
        if (active) {
          setItemRequestsError(err.message || "Failed to load your item requests");
        }
      } finally {
        if (active) {
          setItemRequestsLoading(false);
        }
      }
    }

    loadItemRequests();

    return () => {
      active = false;
    };
  }, [accessToken, authLoading]);

  useEffect(() => {
    if (authLoading || !accessToken) return;

    let active = true;

    async function loadOffers() {
      try {
        const data = await getMyItemRequestOffers(accessToken);

        if (active) {
          setOffers(Array.isArray(data.offers) ? data.offers : []);
        }
      } catch (err) {
        if (active) {
          setOffersError(err.message || "Failed to load your fulfillment offers");
        }
      } finally {
        if (active) {
          setOffersLoading(false);
        }
      }
    }

    loadOffers();

    return () => {
      active = false;
    };
  }, [accessToken, authLoading]);

  async function refreshItemRequests() {
    const data = await getMyItemRequests(accessToken);
    setItemRequests(Array.isArray(data.requests) ? data.requests : []);
  }

  async function refreshOffers() {
    const data = await getMyItemRequestOffers(accessToken);
    setOffers(Array.isArray(data.offers) ? data.offers : []);
  }

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

  async function handleSubmitRequest(itemRequest) {
    if (!accessToken || requestActionInFlight.current) return;

    requestActionInFlight.current = true;

    try {
      const confirmed = await confirm({
        title: "Submit this request for review?",
        message: `Submit "${itemRequest.title}" to a platform reviewer? You will not be able to edit it while the review is in progress.`,
        confirmLabel: "Submit for review",
      });

      if (!confirmed) return;

      setRequestBusyId(itemRequest.id);
      setItemRequestsError("");

      await submitItemRequest(itemRequest.id, accessToken);
      toast.success("Request submitted for verification.");
      await refreshItemRequests();
    } catch (err) {
      const text = err.message || "Unable to submit the request";
      setItemRequestsError(text);
      toast.error(text);
    } finally {
      requestActionInFlight.current = false;
      setRequestBusyId("");
    }
  }

  async function handleReopenRequest(itemRequest) {
    if (!accessToken || requestActionInFlight.current) return;

    requestActionInFlight.current = true;

    try {
      const confirmed = await confirm({
        title: "Reopen this request?",
        message: `Reopen "${itemRequest.title}" as a draft so you can update it, then submit it for review again?`,
        confirmLabel: "Reopen as draft",
      });

      if (!confirmed) return;

      setRequestBusyId(itemRequest.id);
      setItemRequestsError("");

      await reopenItemRequest(itemRequest.id, accessToken);
      toast.success("Request reopened as a draft.");
      await refreshItemRequests();
    } catch (err) {
      const text = err.message || "Unable to reopen the request";
      setItemRequestsError(text);
      toast.error(text);
    } finally {
      requestActionInFlight.current = false;
      setRequestBusyId("");
    }
  }

  async function handleWithdrawOffer(offer) {
    if (!accessToken || offerActionInFlight.current) return;

    offerActionInFlight.current = true;

    try {
      const confirmed = await confirm({
        title: "Withdraw your offer?",
        message: `Withdraw your offer to fulfill "${offer.request_title}"? The requester will no longer see it.`,
        confirmLabel: "Withdraw offer",
        cancelLabel: "Keep offer",
        tone: "danger",
      });

      if (!confirmed) return;

      setOfferBusyId(offer.id);
      setOffersError("");

      await withdrawItemRequestOffer(offer.id, accessToken);
      toast.success("Offer withdrawn.");
      await refreshOffers();
    } catch (err) {
      const text = err.message || "Unable to withdraw the offer";
      setOffersError(text);
      toast.error(text);
    } finally {
      offerActionInFlight.current = false;
      setOfferBusyId("");
    }
  }

  async function handleCancelOffer(offer) {
    if (!accessToken || offerActionInFlight.current) return;

    offerActionInFlight.current = true;

    try {
      const confirmed = await confirm({
        title: "Cancel this reservation?",
        message: `Cancel the accepted offer for "${offer.request_title}"? The request becomes open again so another donor can help. This cannot be undone.`,
        confirmLabel: "Cancel reservation",
        cancelLabel: "Keep reservation",
        tone: "danger",
      });

      if (!confirmed) return;

      setOfferBusyId(offer.id);
      setOffersError("");

      await cancelItemRequestOffer(offer.id, accessToken);
      toast.success("Reservation cancelled. The request is open again.");
      await refreshOffers();
    } catch (err) {
      const text = err.message || "Unable to cancel the reservation";
      setOffersError(text);
      toast.error(text);
    } finally {
      offerActionInFlight.current = false;
      setOfferBusyId("");
    }
  }

  async function handleConfirmOfferHandover(offer) {
    if (!accessToken || offerActionInFlight.current) return;

    offerActionInFlight.current = true;

    try {
      const confirmed = await confirm({
        title: "Confirm handover?",
        message: `Confirm that you handed "${offer.request_title}" to the requester? Once both parties confirm, the request is fulfilled and cannot be undone.`,
        confirmLabel: "Confirm handover",
        cancelLabel: "Not yet",
      });

      if (!confirmed) return;

      setOfferBusyId(offer.id);
      setOffersError("");

      const data = await confirmItemRequestHandover(offer.id, accessToken);

      toast.success(
        data.offer?.status === "completed"
          ? "Fulfillment completed. Thank you for confirming."
          : "Handover confirmed. Waiting for the requester.",
      );
      await refreshOffers();
    } catch (err) {
      const text = err.message || "Unable to confirm handover";
      setOffersError(text);
      toast.error(text);
    } finally {
      offerActionInFlight.current = false;
      setOfferBusyId("");
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

          {activeTab === "item-requests" && (
            <section
              className="my-act-section"
              role="tabpanel"
              id="my-act-panel-item-requests"
              aria-labelledby="my-act-tab-item-requests"
            >
              <div className="my-act-heading">
                <div>
                  <span className="my-act-eyebrow">VERIFIED REQUESTS</span>
                  <h2>My item requests</h2>
                </div>

                <ClipboardList size={24} />
              </div>

              {itemRequestsError && (
                <p className="my-act-error" role="alert">
                  {itemRequestsError}
                </p>
              )}

              {itemRequestsLoading && (
                <p className="my-act-status">Loading your item requests...</p>
              )}

              {!itemRequestsLoading &&
                !itemRequestsError &&
                itemRequests.length === 0 && (
                  <div className="my-act-empty">
                    <ClipboardList size={35} />
                    <h3>No item requests yet</h3>
                    <p>
                      Ask for an essential item, track its verification, and
                      coordinate fulfillment with a verified donor.
                    </p>

                    <Link to="/help-requests/new">
                      Create a request
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                )}

              {!itemRequestsLoading && itemRequests.length > 0 && (
                <div className="my-act-list">
                  {itemRequests.map((itemRequest) => {
                    const canEdit = ["draft", "changes_requested"].includes(
                      itemRequest.status,
                    );
                    const busy = requestBusyId === itemRequest.id;

                    return (
                      <article className="my-act-card" key={itemRequest.id}>
                        <div className="my-act-card-main">
                          <div className="my-act-card-top">
                            <span className="my-act-badge-group">
                              <span className="my-act-badge-label">Request</span>
                              <span
                                className={`my-act-status-badge status-${itemRequest.status}`}
                              >
                                {requestStatusLabel(itemRequest.status)}
                              </span>
                            </span>

                            <span className="my-act-badge-group">
                              <span className="my-act-badge-label">Offers</span>
                              <span className="my-act-count-badge">
                                {itemRequest.pending_offer_count} pending /{" "}
                                {itemRequest.offer_count} total
                              </span>
                            </span>
                          </div>

                          <h3>{itemRequest.title}</h3>

                          <div className="my-act-meta">
                            <span>
                              <MapPin size={14} />
                              {itemRequest.city}
                            </span>
                            <span>
                              <CalendarDays size={14} />
                              Created: {formatDate(itemRequest.created_at)}
                            </span>
                            <span>
                              Quantity: {itemRequest.quantity}
                            </span>
                            <span>
                              Urgency: {urgencyLabel(itemRequest.urgency)}
                            </span>
                          </div>

                          {itemRequest.selected_donor_name && (
                            <p className="my-act-recipient">
                              <UserRound size={13} />
                              Selected donor:{" "}
                              <strong>
                                {itemRequest.selected_organization_name
                                  ? `${itemRequest.selected_organization_name} (${itemRequest.selected_donor_name})`
                                  : itemRequest.selected_donor_name}
                              </strong>
                            </p>
                          )}

                          {itemRequest.status === "reserved" &&
                            itemRequest.handover_state && (
                              <p className="my-act-handover-note">
                                {itemRequest.handover_state === "completed"
                                  ? "Both parties confirmed the handover."
                                  : itemRequest.handover_state ===
                                      "donor_confirmed"
                                    ? "The donor confirmed the handover. Your confirmation will complete the request."
                                    : itemRequest.handover_state ===
                                        "requester_confirmed"
                                      ? "You confirmed the handover. Waiting for the donor."
                                      : "Coordinate a public handover with the donor, then both of you confirm."}
                              </p>
                            )}

                          {itemRequest.latest_review_notes &&
                            ["changes_requested", "rejected"].includes(
                              itemRequest.status,
                            ) && (
                              <p className="my-act-handover-note">
                                Reviewer feedback:{" "}
                                {itemRequest.latest_review_notes}
                              </p>
                            )}

                          {itemRequest.status === "fulfilled" &&
                            itemRequest.fulfilled_at && (
                              <p className="my-act-completed">
                                <CheckCircle2 size={14} />
                                Fulfilled on {formatDate(itemRequest.fulfilled_at)}
                              </p>
                            )}
                        </div>

                        <div className="my-act-card-actions">
                          <Link
                            to={`/help-requests/${itemRequest.id}`}
                            className="my-act-view"
                          >
                            View request
                            <ArrowRight size={15} />
                          </Link>

                          {canEdit && (
                            <Link
                              to={`/help-requests/${itemRequest.id}/edit`}
                              className="my-act-manage"
                            >
                              Edit request
                            </Link>
                          )}

                          {itemRequest.status === "draft" && (
                            <button
                              type="button"
                              className="my-act-confirm"
                              disabled={busy}
                              onClick={() => handleSubmitRequest(itemRequest)}
                            >
                              {busy ? "Submitting..." : "Submit for review"}
                            </button>
                          )}

                          {itemRequest.status === "changes_requested" && (
                            <button
                              type="button"
                              className="my-act-confirm"
                              disabled={busy}
                              onClick={() => handleReopenRequest(itemRequest)}
                            >
                              {busy ? "Reopening..." : "Reopen as draft"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "fulfillment-offers" && (
            <section
              className="my-act-section"
              role="tabpanel"
              id="my-act-panel-fulfillment-offers"
              aria-labelledby="my-act-tab-fulfillment-offers"
            >
              <div className="my-act-heading">
                <div>
                  <span className="my-act-eyebrow">DONOR COMMITMENTS</span>
                  <h2>My fulfillment offers</h2>
                </div>

                <PackageCheck size={24} />
              </div>

              {offersError && (
                <p className="my-act-error" role="alert">
                  {offersError}
                </p>
              )}

              {offersLoading && (
                <p className="my-act-status">Loading your offers...</p>
              )}

              {!offersLoading && !offersError && offers.length === 0 && (
                <div className="my-act-empty">
                  <PackageCheck size={35} />
                  <h3>No fulfillment offers yet</h3>
                  <p>
                    Offer to provide an item that someone has requested. Your
                    offer stays private to the requester until they select you.
                  </p>

                  <Link to="/help-requests">
                    Browse verified requests
                    <ArrowRight size={15} />
                  </Link>
                </div>
              )}

              {!offersLoading && offers.length > 0 && (
                <div className="my-act-list">
                  {offers.map((offer) => {
                    const busy = offerBusyId === offer.id;

                    return (
                      <article className="my-act-card" key={offer.id}>
                        <div className="my-act-card-main">
                          <div className="my-act-card-top">
                            <span className="my-act-badge-group">
                              <span className="my-act-badge-label">Offer</span>
                              <span
                                className={`my-act-status-badge status-${offer.status}`}
                              >
                                {offerStatusLabel(offer.status)}
                              </span>
                            </span>

                            <span className="my-act-badge-group">
                              <span className="my-act-badge-label">Request</span>
                              <span
                                className={`my-act-item-badge item-${offer.request_status}`}
                              >
                                {requestStatusLabel(offer.request_status)}
                              </span>
                            </span>
                          </div>

                          <h3>{offer.request_title}</h3>

                          <span className="my-act-org">
                            <UserRound size={14} />
                            Requester: {offer.requester_name}
                          </span>

                          <div className="my-act-meta">
                            <span>
                              <MapPin size={14} />
                              {offer.request_city || "Location not specified"}
                            </span>
                            <span>
                              <CalendarDays size={14} />
                              Offered: {formatDateTime(offer.created_at)}
                            </span>
                            {offer.completed_at && (
                              <span>
                                <CheckCircle2 size={14} />
                                Completed: {formatDate(offer.completed_at)}
                              </span>
                            )}
                          </div>

                          {offer.status === "pending" && (
                            <p className="my-act-handover-note">
                              Waiting for the requester to review offers. You can
                              withdraw your offer until it is accepted.
                            </p>
                          )}

                          {offer.status === "accepted" && (
                            <p className="my-act-handover-note">
                              {offer.my_confirmed_at && !offer.other_confirmed_at
                                ? "You confirmed the handover. Waiting for the requester."
                                : !offer.my_confirmed_at &&
                                    offer.other_confirmed_at
                                  ? "The requester confirmed the handover. Your confirmation will complete the request."
                                  : "You were selected. Coordinate a public handover with the requester, then both of you confirm."}
                            </p>
                          )}
                        </div>

                        <div className="my-act-card-actions">
                          <Link
                            to={`/help-requests/${offer.request_id}`}
                            className="my-act-view"
                          >
                            View request
                            <ArrowRight size={15} />
                          </Link>

                          {offer.can_withdraw && (
                            <button
                              type="button"
                              className="my-act-withdraw"
                              disabled={busy}
                              onClick={() => handleWithdrawOffer(offer)}
                            >
                              {busy ? "Withdrawing..." : "Withdraw offer"}
                            </button>
                          )}

                          {offer.can_cancel && (
                            <button
                              type="button"
                              className="my-act-withdraw"
                              disabled={busy}
                              onClick={() => handleCancelOffer(offer)}
                            >
                              {busy ? "Cancelling..." : "Cancel reservation"}
                            </button>
                          )}

                          {offer.can_confirm && (
                            <button
                              type="button"
                              className="my-act-confirm"
                              disabled={busy}
                              onClick={() => handleConfirmOfferHandover(offer)}
                            >
                              {busy ? "Confirming..." : "Confirm handover"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </>
  );
}
