import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  MapPin,
  MessageSquareWarning,
  Package,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { useConfirm, useToast } from "../context/notificationContext";
import {
  categoryLabel,
  requestStatusLabel,
  urgencyLabel,
} from "../constants/itemRequests";
import {
  approveItemRequest,
  getPendingItemRequests,
  getReviewItemRequest,
  rejectItemRequest,
  requestItemRequestChanges,
} from "../services/api";
import "../styles/itemRequests.css";

function formatDateTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminItemRequests() {
  const { accessToken } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getPendingItemRequests(accessToken);

        if (!cancelled) {
          setQueue(Array.isArray(data.requests) ? data.requests : []);
          setQueueError("");
        }
      } catch (err) {
        if (!cancelled) {
          setQueueError(err.message || "Unable to load the review queue.");
        }
      } finally {
        if (!cancelled) {
          setQueueLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !selectedId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await getReviewItemRequest(selectedId, accessToken);

        if (!cancelled) {
          setDetail(data);
          setDetailError("");
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setDetailError(err.message || "Unable to load this request.");
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, selectedId]);

  async function reloadQueue() {
    const data = await getPendingItemRequests(accessToken);
    const requests = Array.isArray(data.requests) ? data.requests : [];

    setQueue(requests);
    setQueueError("");

    return requests;
  }

  function selectRequest(requestId) {
    setSelectedId(requestId);
    setDetail(null);
    setDetailError("");
    setNotes("");
    setDetailLoading(Boolean(requestId));
  }

  async function decide(action) {
    if (!selectedId || busy) return;

    const trimmedNotes = notes.trim();

    if (action !== "approve" && trimmedNotes.length < 10) {
      toast.error("Please write at least 10 characters of feedback.");
      return;
    }

    const confirmation = await confirm({
      title:
        action === "approve"
          ? "Approve this request?"
          : action === "reject"
            ? "Reject this request?"
            : "Request changes?",
      message:
        action === "approve"
          ? "The request becomes publicly discoverable and can receive fulfillment offers."
          : action === "reject"
            ? "The requester will see your feedback. Rejected requests stay in history and cannot be resubmitted."
            : "The requester will see your feedback and can revise the request before resubmitting.",
      confirmLabel:
        action === "approve"
          ? "Approve request"
          : action === "reject"
            ? "Reject request"
            : "Request changes",
      tone: action === "reject" ? "danger" : undefined,
    });

    if (!confirmation) return;

    setBusy(true);

    try {
      if (action === "approve") {
        await approveItemRequest(selectedId, accessToken);
        toast.success("Request approved and published.");
      } else if (action === "reject") {
        await rejectItemRequest(selectedId, trimmedNotes, accessToken);
        toast.success("Request rejected. Feedback recorded.");
      } else {
        await requestItemRequestChanges(selectedId, trimmedNotes, accessToken);
        toast.success("Changes requested from the requester.");
      }

      setNotes("");
      const requests = await reloadQueue();
      selectRequest(requests[0]?.id ?? null);
    } catch (err) {
      const message = err.message || "Unable to record the review decision.";
      toast.error(message);

      // A conflicting review may have changed the queue; refresh it.
      try {
        await reloadQueue();
      } catch {
        // Keep the original error visible.
      }
    } finally {
      setBusy(false);
    }
  }

  const canReview = Boolean(detail?.permissions?.can_review);
  const notesTooShort = notes.trim().length < 10;

  return (
    <>
      <Navbar />

      <main className="ir-page">
        <div className="ir-detail-container">
          <Link to="/dashboard" className="ir-back">
            <ArrowLeft size={17} />
            Back to dashboard
          </Link>

          <header className="ir-form-header">
            <span className="ir-eyebrow">PLATFORM REVIEWERS</span>
            <h1>Item request review queue</h1>
            <p>
              Review each request by hand. Approving publishes it to verified
              discovery; rejecting or requesting changes records your feedback
              permanently. You cannot review your own requests.
            </p>
          </header>

          {queueError && (
            <p className="ir-error" role="alert">
              {queueError}
            </p>
          )}

          {queueLoading ? (
            <p className="ir-form-status">Loading review queue...</p>
          ) : queue.length === 0 ? (
            <div className="ir-empty">
              <CheckCircle2 size={38} />
              <h3>Queue is clear</h3>
              <p>
                No requests are waiting for verification right now. New
                submissions will appear here automatically.
              </p>
              <Link to="/help-requests">Browse verified requests</Link>
            </div>
          ) : (
            <div className="ir-review-layout">
              <section className="ir-panel">
                <h2>
                  <ClipboardList size={17} />
                  Pending ({queue.length})
                </h2>

                {queue.map((request) => (
                  <button
                    type="button"
                    key={request.id}
                    className={`ir-review-item ${
                      selectedId === request.id ? "active" : ""
                    }`}
                    onClick={() => selectRequest(request.id)}
                  >
                    <strong>{request.title}</strong>
                    <span>
                      {request.requester_name} · {request.city}
                    </span>
                    <span>Submitted {formatDateTime(request.submitted_at)}</span>
                  </button>
                ))}
              </section>

              <section className="ir-panel">
                {!selectedId ? (
                  <div className="ir-empty" style={{ border: 0 }}>
                    <ShieldCheck size={34} />
                    <h3>Select a request</h3>
                    <p>
                      Choose a pending request to read the reason and record a
                      decision.
                    </p>
                  </div>
                ) : detailLoading ? (
                  <p className="ir-form-status">Loading request...</p>
                ) : detailError ? (
                  <p className="ir-error" role="alert">
                    {detailError}
                  </p>
                ) : detail ? (
                  <>
                    <div className="ir-badges" style={{ marginBottom: 14 }}>
                      <span className={`ir-badge status-${detail.request.status}`}>
                        {requestStatusLabel(detail.request.status)}
                      </span>
                      <span
                        className={`ir-badge urgency-${detail.request.urgency}`}
                      >
                        {urgencyLabel(detail.request.urgency)} urgency
                      </span>
                    </div>

                    <h2>{detail.request.title}</h2>

                    <p className="ir-description">
                      {detail.request.description}
                    </p>

                    <dl className="ir-detail-list" style={{ marginTop: 20 }}>
                      <div>
                        <dt>Requester</dt>
                        <dd>{detail.request.requester_name}</dd>
                      </div>
                      <div>
                        <dt>Category</dt>
                        <dd>{categoryLabel(detail.request.category)}</dd>
                      </div>
                      <div>
                        <dt>Quantity</dt>
                        <dd>
                          <Package size={13} /> {detail.request.quantity}
                        </dd>
                      </div>
                      <div>
                        <dt>City</dt>
                        <dd>
                          <MapPin size={13} /> {detail.request.city}
                        </dd>
                      </div>
                    </dl>

                    <div className="ir-private-note">
                      <strong>Private reason (not shown publicly)</strong>
                      {detail.request.reason}
                    </div>

                    {detail.review_history?.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <h3>Previous reviews</h3>
                        <ul className="ir-history">
                          {detail.review_history.map((review) => (
                            <li key={review.id}>
                              <strong>{review.decision}</strong> by{" "}
                              {review.reviewer_name} on{" "}
                              {formatDateTime(review.created_at)}
                              {review.review_notes && (
                                <div>{review.review_notes}</div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {detail.permissions?.is_own_request ? (
                      <p className="ir-error" role="alert" style={{ marginTop: 20 }}>
                        You cannot review your own request. Another reviewer must
                        decide it.
                      </p>
                    ) : canReview ? (
                      <div style={{ marginTop: 20 }}>
                        <label
                          htmlFor="review-notes"
                          style={{
                            display: "block",
                            marginBottom: 7,
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: 0.4,
                            textTransform: "uppercase",
                            color: "#4f6453",
                          }}
                        >
                          Review notes
                        </label>
                        <textarea
                          id="review-notes"
                          className="ir-notes"
                          rows={4}
                          maxLength={3000}
                          placeholder="Required when rejecting or requesting changes. Be specific and respectful."
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                        />
                        <p className="ir-muted" style={{ marginTop: 6 }}>
                          Rejections and change requests need at least 10
                          characters. The requester sees these notes as feedback.
                        </p>

                        <div className="ir-review-actions">
                          <button
                            type="button"
                            className="ir-btn ir-btn-primary"
                            disabled={busy}
                            onClick={() => decide("approve")}
                          >
                            <CheckCircle2 size={15} />
                            Approve
                          </button>

                          <button
                            type="button"
                            className="ir-btn ir-btn-secondary"
                            disabled={busy || notesTooShort}
                            onClick={() => decide("request-changes")}
                          >
                            <MessageSquareWarning size={15} />
                            Request changes
                          </button>

                          <button
                            type="button"
                            className="ir-btn ir-btn-danger"
                            disabled={busy || notesTooShort}
                            onClick={() => decide("reject")}
                          >
                            <XCircle size={15} />
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="ir-muted" style={{ marginTop: 20 }}>
                        This request is not awaiting a decision.
                      </p>
                    )}
                  </>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
