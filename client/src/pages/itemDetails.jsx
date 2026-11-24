import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Gift,
  HandHeart,
  MapPin,
  MessageSquare,
  Pencil,
  Tag,
  UserRound,
  X,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { useConfirm, useToast } from "../context/notificationContext";
import {
  acceptItemClaim,
  createItemClaim,
  getItemById,
  getReceivedClaims,
  rejectItemClaim,
  withdrawItemClaim,
} from "../services/api";
import { categoryLabel, conditionLabel } from "../constants/items";
import "../styles/itemDetails.css";

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatDateTime(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not recorded";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ItemDetails() {
  const { id } = useParams();
  const { accessToken, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [claims, setClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsError, setClaimsError] = useState("");
  const [claimBusyId, setClaimBusyId] = useState("");

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const requestInFlight = useRef(false);
  const requestInputRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function loadItem() {
      setLoading(true);
      setError("");

      try {
        const result = await getItemById(id, accessToken || undefined);

        if (active) {
          setData(result);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load this item");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadItem();

    return () => {
      active = false;
    };
  }, [id, accessToken, authLoading]);

  const isOwner = Boolean(data?.viewer?.is_owner);

  useEffect(() => {
    if (!isOwner || !accessToken) {
      return;
    }

    let active = true;

    async function loadClaims() {
      setClaimsLoading(true);
      setClaimsError("");

      try {
        const result = await getReceivedClaims(id, accessToken);

        if (active) {
          setClaims(Array.isArray(result.claims) ? result.claims : []);
        }
      } catch (err) {
        if (active) {
          setClaimsError(err.message || "Failed to load received requests");
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
  }, [id, accessToken, isOwner]);

  useEffect(() => {
    if (!requestOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !requesting) {
        setRequestOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    requestInputRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestOpen, requesting]);

  async function refresh() {
    const result = await getItemById(id, accessToken || undefined);
    setData(result);

    if (result.viewer.is_owner && accessToken) {
      const claimsResult = await getReceivedClaims(id, accessToken);
      setClaims(
        Array.isArray(claimsResult.claims) ? claimsResult.claims : [],
      );
    }
  }

  function handleManageClaims() {
    document
      .getElementById("received-claims")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleRequest(event) {
    event.preventDefault();

    if (!accessToken || requestInFlight.current) return;

    requestInFlight.current = true;
    setRequesting(true);

    try {
      await createItemClaim(id, requestMessage, accessToken);
      toast.success(
        "Request sent. The donor will review your request and respond.",
      );
      setRequestOpen(false);
      setRequestMessage("");
      await refresh();
    } catch (err) {
      toast.error(err.message || "Unable to send your request");
    } finally {
      requestInFlight.current = false;
      setRequesting(false);
    }
  }

  async function handleWithdraw() {
    const claim = data?.viewer?.my_active_claim;

    if (!claim || !accessToken || withdrawing) return;

    const confirmed = await confirm({
      title: "Withdraw your request?",
      message: `Withdraw your request for "${data.item.title}"? You can send a new request later if the item is still available.`,
      confirmLabel: "Withdraw request",
      cancelLabel: "Keep request",
      tone: "danger",
    });

    if (!confirmed) return;

    setWithdrawing(true);

    try {
      await withdrawItemClaim(claim.id, accessToken);
      toast.success("Your request has been withdrawn.");
      await refresh();
    } catch (err) {
      toast.error(err.message || "Unable to withdraw your request");
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleAccept(claim) {
    if (!accessToken || claimBusyId) return;

    const confirmed = await confirm({
      title: "Accept this request?",
      message: `Choose ${claim.claimant_name} as the recipient for "${data.item.title}"? The item will be reserved and other requests will remain on hold.`,
      confirmLabel: "Accept recipient",
      cancelLabel: "Cancel",
      tone: "primary",
    });

    if (!confirmed) return;

    setClaimBusyId(claim.id);
    setClaimsError("");

    try {
      await acceptItemClaim(claim.id, accessToken);
      toast.success(`${claim.claimant_name} is now the selected recipient.`);
      await refresh();
    } catch (err) {
      const message = err.message || "Unable to accept this request";
      setClaimsError(message);
      toast.error(message);
    } finally {
      setClaimBusyId("");
    }
  }

  async function handleReject(claim) {
    if (!accessToken || claimBusyId) return;

    const confirmed = await confirm({
      title: "Reject this request?",
      message: `Reject ${claim.claimant_name}'s request for "${data.item.title}"? The request will remain in the claim history.`,
      confirmLabel: "Reject request",
      cancelLabel: "Keep request",
      tone: "danger",
    });

    if (!confirmed) return;

    setClaimBusyId(claim.id);
    setClaimsError("");

    try {
      await rejectItemClaim(claim.id, accessToken);
      toast.success("Request rejected.");
      await refresh();
    } catch (err) {
      const message = err.message || "Unable to reject this request";
      setClaimsError(message);
      toast.error(message);
    } finally {
      setClaimBusyId("");
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="item-detail-status">Loading item...</main>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Navbar />
        <main className="item-detail-status">
          <AlertCircle size={34} />
          <h1>Unable to load this item</h1>
          <p role="alert">{error || "Item not found."}</p>
          <Link to="/items">Browse free items</Link>
        </main>
      </>
    );
  }

  const { item, viewer, reservation } = data;
  const isParticipant = Boolean(
    reservation && (viewer.is_owner || viewer.is_recipient),
  );
  const hasAcceptedClaim = Boolean(
    claims.some((claim) => claim.status === "accepted"),
  );
  const activeClaim = viewer.my_active_claim;
  const latestClaim = viewer.my_latest_claim;

  return (
    <>
      <Navbar />

      <main className="item-detail-page">
        <div className="item-detail-container">
          <Link to="/items" className="item-detail-back">
            <ArrowLeft size={17} />
            Back to free items
          </Link>

          <section className="item-detail-hero">
            <div className="item-detail-image">
              {item.image_url ? (
                <img src={item.image_url} alt={item.title} />
              ) : (
                <span className="item-detail-placeholder">
                  <Gift size={42} />
                  No photo provided
                </span>
              )}
            </div>

            <div className="item-detail-hero-content">
              <div className="item-detail-badges">
                <span className="item-detail-eyebrow">FREE ITEM</span>
                <span
                  className={`item-detail-status-badge status-${item.status}`}
                >
                  {item.status}
                </span>
              </div>

              <h1>{item.title}</h1>

              <div className="item-detail-meta">
                <span>
                  <Tag size={15} />
                  {categoryLabel(item.category)}
                </span>
                <span>{conditionLabel(item.condition)}</span>
                <span>
                  <MapPin size={15} />
                  {item.city}
                </span>
                <span>
                  <UserRound size={15} />
                  Listed by {item.donor_name}
                </span>
              </div>

              <div className="item-detail-actions">
                {viewer.is_owner ? (
                  <>
                    {item.status === "available" && (
                      <Link
                        to={`/items/${item.id}/edit`}
                        className="item-detail-secondary"
                      >
                        <Pencil size={15} />
                        Edit item
                      </Link>
                    )}

                    <button
                      type="button"
                      className="item-detail-primary"
                      onClick={handleManageClaims}
                    >
                      <MessageSquare size={16} />
                      Manage claims
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <div className="item-detail-grid">
            <section className="item-detail-card">
              <h2>About this item</h2>
              <p className="item-detail-description">{item.description}</p>
            </section>

            <section className="item-detail-card">
              <h2>Item details</h2>

              <div className="item-detail-info">
                <div>
                  <span>Category</span>
                  <strong>{categoryLabel(item.category)}</strong>
                </div>
                <div>
                  <span>Condition</span>
                  <strong>{conditionLabel(item.condition)}</strong>
                </div>
                <div>
                  <span>City</span>
                  <strong>{item.city}</strong>
                </div>
                <div>
                  <span>Listed</span>
                  <strong>{formatDate(item.created_at)}</strong>
                </div>
                <div>
                  <span>Donor</span>
                  <strong>{item.donor_name}</strong>
                </div>
                <div>
                  <span>Donor city</span>
                  <strong>{item.donor_city || item.city}</strong>
                </div>
              </div>
            </section>

            <section className="item-action-card">
              <div className="item-action-heading">
                <HandHeart size={22} />
                <div>
                  <span className="item-detail-eyebrow">
                    {item.status === "available"
                      ? "REQUEST THIS ITEM"
                      : "ITEM STATUS"}
                  </span>
                  <h2>
                    {item.status === "available"
                      ? "Is this what you need?"
                      : item.status === "reserved"
                        ? "Reserved"
                        : item.status === "donated"
                          ? "Donated"
                          : "Closed"}
                  </h2>
                </div>
              </div>

              {item.status === "available" && (
                <>
                  {!viewer.authenticated && (
                    <>
                      <p className="item-action-text">
                        Log in to send a request to the donor. Your contact
                        information is not shared automatically.
                      </p>
                      <Link to="/login" className="item-action-primary">
                        Log in to request
                      </Link>
                    </>
                  )}

                  {viewer.authenticated && viewer.is_owner && (
                    <p className="item-action-text">
                      You listed this item. Review received requests to choose a
                      recipient.
                    </p>
                  )}

                  {viewer.authenticated &&
                    !viewer.is_owner &&
                    activeClaim?.status === "pending" && (
                      <>
                        <p className="item-action-text">
                          Your request is pending. The donor has not selected a
                          recipient yet.
                        </p>
                        <button
                          type="button"
                          className="item-action-secondary"
                          onClick={handleWithdraw}
                          disabled={withdrawing}
                        >
                          {withdrawing ? "Withdrawing..." : "Withdraw request"}
                        </button>
                      </>
                    )}

                  {viewer.authenticated &&
                    !viewer.is_owner &&
                    !activeClaim &&
                    viewer.can_claim && (
                      <>
                        {latestClaim &&
                          ["rejected", "withdrawn", "cancelled"].includes(
                            latestClaim.status,
                          ) && (
                            <p className="item-action-note">
                              Your previous request was {latestClaim.status}. You
                              can request this item again.
                            </p>
                          )}

                        <p className="item-action-text">
                          Send the donor an optional message. They will review
                          all requests before choosing a recipient.
                        </p>

                        <button
                          type="button"
                          className="item-action-primary"
                          onClick={() => setRequestOpen(true)}
                        >
                          Request item
                        </button>
                      </>
                    )}
                </>
              )}

              {item.status === "reserved" && (
                <>
                  {isParticipant ? (
                    <p className="item-action-text">
                      This item is reserved for{" "}
                      <strong>{reservation.claimant_name}</strong>. Coordinate a
                      safe public handover below.
                    </p>
                  ) : (
                    <p className="item-action-text">
                      This item is currently reserved by another community
                      member. New requests are not being accepted.
                    </p>
                  )}
                </>
              )}

              {item.status === "donated" && (
                <p className="item-action-text">
                  This item has been donated successfully.
                  {isParticipant
                    ? ` Handover completed on ${formatDate(reservation.completed_at)}.`
                    : " It is no longer available."}
                </p>
              )}

              {item.status === "closed" && (
                <p className="item-action-text">
                  This listing has been closed by the donor and is no longer
                  available.
                </p>
              )}
            </section>

            {isParticipant && item.status === "reserved" && (
              <section className="item-reservation-card">
                <div className="item-reservation-heading">
                  <span className="item-detail-eyebrow">RESERVATION</span>
                  <h2>Handover coordination</h2>
                </div>

                <p className="item-action-text">
                  The donor and selected recipient can see these details. Prefer
                  a public meeting place and avoid sharing private addresses.
                </p>

                <div className="item-reservation-summary">
                  <div>
                    <span>Recipient</span>
                    <strong>{reservation.claimant_name}</strong>
                  </div>
                  <div>
                    <span>Accepted</span>
                    <strong>{formatDateTime(reservation.accepted_at)}</strong>
                  </div>
                  <div>
                    <span>Donor confirmed</span>
                    <strong>
                      {reservation.donor_confirmed ? "Yes" : "Not yet"}
                    </strong>
                  </div>
                  <div>
                    <span>Recipient confirmed</span>
                    <strong>
                      {reservation.recipient_confirmed ? "Yes" : "Not yet"}
                    </strong>
                  </div>
                </div>
              </section>
            )}

            {isParticipant &&
              item.status === "donated" &&
              reservation?.completed_at && (
                <section className="item-reservation-card">
                  <div className="item-reservation-heading">
                    <span className="item-detail-eyebrow">DONATION COMPLETE</span>
                    <h2>Thank you for completing this handover</h2>
                  </div>

                  <p className="item-action-text">
                    {item.title} was handed over to{" "}
                    {reservation.claimant_name} on{" "}
                    {formatDateTime(reservation.completed_at)}.
                  </p>
                </section>
              )}

            {viewer.is_owner && (
              <section className="item-claims-panel" id="received-claims">
                <div className="item-claims-heading">
                  <div>
                    <span className="item-detail-eyebrow">
                      RECEIVED REQUESTS
                    </span>
                    <h2>Manage claims</h2>
                  </div>

                  <span className="item-claims-count">
                    {claims.length} total
                  </span>
                </div>

                {claimsError && (
                  <p className="item-claims-error" role="alert">
                    {claimsError}
                  </p>
                )}

                {claimsLoading && (
                  <p className="item-action-text">Loading requests...</p>
                )}

                {!claimsLoading && claims.length === 0 && (
                  <div className="item-claims-empty">
                    <MessageSquare size={30} />
                    <p>
                      No requests yet. When someone asks for this item, their
                      request will appear here.
                    </p>
                  </div>
                )}

                {!claimsLoading && claims.length > 0 && (
                  <div className="item-claims-list">
                    {claims.map((claim) => {
                      const isPending = claim.status === "pending";
                      const canAct =
                        isPending &&
                        item.status === "available" &&
                        !hasAcceptedClaim;

                      return (
                        <article
                          className={`item-claim claim-${claim.status}`}
                          key={claim.id}
                        >
                          <div className="item-claim-top">
                            <div>
                              <h3>{claim.claimant_name}</h3>
                              <span className="item-claim-location">
                                <MapPin size={12} />
                                {claim.claimant_city || "City not specified"}
                              </span>
                            </div>

                            <span
                              className={`item-claim-status status-${claim.status}`}
                            >
                              {claim.status}
                            </span>
                          </div>

                          {claim.message ? (
                            <p className="item-claim-message">
                              “{claim.message}”
                            </p>
                          ) : (
                            <p className="item-claim-message item-claim-muted">
                              No message provided.
                            </p>
                          )}

                          <div className="item-claim-footer">
                            <span className="item-claim-date">
                              <CalendarDays size={12} />
                              Requested {formatDateTime(claim.created_at)}
                            </span>

                            <div className="item-claim-actions">
                              {claim.status === "accepted" && (
                                <span className="item-claim-selected">
                                  <CheckCircle2 size={14} />
                                  Selected recipient
                                </span>
                              )}

                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    className="item-claim-accept"
                                    disabled={!canAct || claimBusyId === claim.id}
                                    title={
                                      canAct
                                        ? undefined
                                        : item.status !== "available"
                                          ? "The item is no longer available"
                                          : "Another recipient has already been selected"
                                    }
                                    onClick={() => handleAccept(claim)}
                                  >
                                    {claimBusyId === claim.id
                                      ? "Working..."
                                      : "Accept"}
                                  </button>

                                  <button
                                    type="button"
                                    className="item-claim-reject"
                                    disabled={claimBusyId === claim.id}
                                    onClick={() => handleReject(claim)}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {hasAcceptedClaim && item.status === "reserved" && (
                  <p className="item-claims-hold">
                    Other pending requests are on hold while this item is
                    reserved.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>

        {requestOpen && (
          <div
            className="item-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !requesting) {
                setRequestOpen(false);
              }
            }}
          >
            <div
              className="item-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="item-request-title"
            >
              <div className="item-modal-header">
                <div>
                  <span className="item-detail-eyebrow">REQUEST ITEM</span>
                  <h2 id="item-request-title">{item.title}</h2>
                </div>

                <button
                  type="button"
                  className="item-modal-close"
                  aria-label="Close request form"
                  onClick={() => setRequestOpen(false)}
                  disabled={requesting}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRequest}>
                <label htmlFor="claim-message">
                  Message to the donor (optional)
                </label>

                <textarea
                  id="claim-message"
                  ref={requestInputRef}
                  rows={4}
                  maxLength={1000}
                  placeholder="Share why you would like the item, or how you can collect it. Do not include private contact details."
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                />

                <small>{requestMessage.length}/1000 characters</small>

                <div className="item-modal-actions">
                  <button
                    type="button"
                    className="item-modal-cancel"
                    onClick={() => setRequestOpen(false)}
                    disabled={requesting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="item-modal-submit"
                    disabled={requesting}
                  >
                    {requesting ? "Sending..." : "Send request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
