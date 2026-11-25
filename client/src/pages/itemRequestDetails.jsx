import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  MapPin,
  Package,
  Pencil,
  ShieldCheck,
  Tag,
  XCircle,
} from "lucide-react";

import Navbar from "../components/navbar";
import ItemRequestFulfillment from "../components/itemRequestFulfillment";
import { useAuth } from "../context/authContext";
import { useConfirm, useToast } from "../context/notificationContext";
import {
  categoryLabel,
  requestStatusLabel,
  urgencyLabel,
} from "../constants/itemRequests";
import {
  cancelItemRequest,
  getItemRequestById,
  submitItemRequest,
} from "../services/api";
import "../styles/itemRequests.css";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

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

const PROGRESS_STEPS = [
  { key: "created", label: "Request created" },
  { key: "submitted", label: "Submitted for verification" },
  { key: "reviewed", label: "Reviewed by a GoodDeed reviewer" },
  { key: "published", label: "Approved and publicly listed" },
  { key: "reserved", label: "Donor selected and handover in progress" },
  { key: "fulfilled", label: "Handover confirmed by both parties" },
];

function completedSteps(status) {
  const reached = new Set(["created"]);

  if (status !== "draft") reached.add("submitted");

  if (["open", "reserved", "fulfilled"].includes(status)) {
    reached.add("reviewed");
    reached.add("published");
  }

  if (["reserved", "fulfilled"].includes(status)) reached.add("reserved");
  if (status === "fulfilled") reached.add("fulfilled");

  return reached;
}

export default function ItemRequestDetails() {
  const { id } = useParams();
  const { accessToken, loading: authLoading } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getItemRequestById(id, accessToken);

        if (!cancelled) {
          setDetail(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setDetail(null);
          setError(err.message || "Failed to load this item request.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, accessToken, authLoading]);

  async function refreshDetail() {
    try {
      const data = await getItemRequestById(id, accessToken);
      setDetail(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load this item request.");
    }
  }

  async function handleSubmit() {
    const confirmed = await confirm({
      title: "Submit for verification?",
      message:
        "A GoodDeed reviewer will check this request by hand. You cannot edit it while it is being reviewed.",
      confirmLabel: "Submit request",
    });

    if (!confirmed) return;

    setBusy(true);

    try {
      await submitItemRequest(id, accessToken);
      toast.success("Request submitted for verification.");
      await refreshDetail();
    } catch (err) {
      toast.error(err.message || "Unable to submit the request.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    const confirmed = await confirm({
      title: "Cancel this request?",
      message:
        "The request will be closed and removed from public discovery. Review and fulfillment history is kept.",
      confirmLabel: "Cancel request",
      tone: "danger",
    });

    if (!confirmed) return;

    setBusy(true);

    try {
      await cancelItemRequest(id, accessToken);
      toast.success("Request cancelled.");
      await refreshDetail();
    } catch (err) {
      toast.error(err.message || "Unable to cancel the request.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || authLoading) {
    return (
      <>
        <Navbar />
        <main className="ir-page">
          <div className="ir-detail-container">
            <p className="ir-form-status">Loading request...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !detail) {
    return (
      <>
        <Navbar />
        <main className="ir-page">
          <div className="ir-detail-container">
            <Link to="/help-requests" className="ir-back">
              <ArrowLeft size={17} />
              Back to help requests
            </Link>

            <div className="ir-empty">
              <ClipboardList size={38} />
              <h3>Request unavailable</h3>
              <p>
                {error ||
                  "This request is private, no longer public, or does not exist."}
              </p>
              <Link to="/help-requests">Browse verified requests</Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  const { request, viewer, permissions, feedback, review_history } = detail;
  const reached = completedSteps(request.status);
  const isRequester = viewer.is_requester;

  return (
    <>
      <Navbar />

      <main className="ir-page">
        <div className="ir-detail-container">
          <Link to="/help-requests" className="ir-back">
            <ArrowLeft size={17} />
            Back to help requests
          </Link>

          <header className="ir-detail-head">
            <div>
              <div className="ir-badges">
                {request.is_verified ? (
                  <span className="ir-badge status-open">
                    <ShieldCheck size={13} />
                    Verified
                  </span>
                ) : (
                  <span className="ir-badge status-pending_verification">
                    Not yet verified
                  </span>
                )}

                <span className={`ir-badge status-${request.status}`}>
                  {requestStatusLabel(request.status)}
                </span>

                <span className={`ir-badge urgency-${request.urgency}`}>
                  {urgencyLabel(request.urgency)} urgency
                </span>
              </div>

              <h1>{request.title}</h1>

              <p className="ir-muted">
                Requested by {request.requester_name} ·{" "}
                {formatDate(request.created_at)}
              </p>
            </div>

            {isRequester && (
              <div className="ir-side-actions">
                {permissions.can_edit && (
                  <Link
                    to={`/help-requests/${request.id}/edit`}
                    className="ir-btn ir-btn-secondary"
                  >
                    <Pencil size={15} />
                    Edit request
                  </Link>
                )}

                {permissions.can_submit && (
                  <button
                    type="button"
                    className="ir-btn ir-btn-primary"
                    disabled={busy}
                    onClick={handleSubmit}
                  >
                    <ClipboardCheck size={15} />
                    Submit for verification
                  </button>
                )}

                {permissions.can_cancel && (
                  <button
                    type="button"
                    className="ir-btn ir-btn-danger"
                    disabled={busy}
                    onClick={handleCancel}
                  >
                    <XCircle size={15} />
                    Cancel request
                  </button>
                )}
              </div>
            )}
          </header>

          <div className="ir-detail-grid">
            <div>
              {feedback && (
                <div className="ir-feedback-box">
                  <strong>
                    Reviewer feedback (
                    {feedback.decision === "rejected"
                      ? "not approved"
                      : "changes requested"}
                    , {formatDate(feedback.created_at)})
                  </strong>
                  {feedback.review_notes}
                  {feedback.decision === "changes_requested" && (
                    <p style={{ margin: "10px 0 0" }}>
                      Edit the request to address the feedback, then resubmit it
                      for verification.
                    </p>
                  )}
                </div>
              )}

              <section className="ir-panel">
                <h2>
                  <Tag size={17} />
                  Request details
                </h2>

                <p className="ir-description">{request.description}</p>

                <dl className="ir-detail-list" style={{ marginTop: 22 }}>
                  <div>
                    <dt>Category</dt>
                    <dd>{categoryLabel(request.category)}</dd>
                  </div>
                  <div>
                    <dt>Quantity requested</dt>
                    <dd>{request.quantity}</dd>
                  </div>
                  <div>
                    <dt>City</dt>
                    <dd>
                      <MapPin size={13} /> {request.city}
                    </dd>
                  </div>
                  <div>
                    <dt>Urgency (self-reported)</dt>
                    <dd>{urgencyLabel(request.urgency)}</dd>
                  </div>
                  <div>
                    <dt>Requested</dt>
                    <dd>
                      <CalendarDays size={13} />{" "}
                      {formatDate(request.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt>Fulfillment quantity</dt>
                    <dd>
                      <Package size={13} /> {request.quantity} (in full)
                    </dd>
                  </div>
                </dl>

                {isRequester && request.reason && (
                  <div className="ir-private-note">
                    <strong>Your private reason (reviewers only)</strong>
                    {request.reason}
                  </div>
                )}
              </section>

              {isRequester && (
                <section className="ir-panel" id="verification">
                  <h2>
                    <ShieldCheck size={17} />
                    Verification progress
                  </h2>

                  <ul className="ir-steps">
                    {PROGRESS_STEPS.map((step, index) => (
                      <li
                        key={step.key}
                        className={reached.has(step.key) ? "done" : ""}
                      >
                        <span>{reached.has(step.key) ? "✓" : index + 1}</span>
                        {step.label}
                      </li>
                    ))}
                  </ul>

                  {review_history?.length > 0 && (
                    <div style={{ marginTop: 22 }}>
                      <h3>Review history</h3>
                      <ul className="ir-history">
                        {review_history.map((review) => (
                          <li key={review.id}>
                            <strong>
                              {review.decision === "approved"
                                ? "Approved"
                                : review.decision === "rejected"
                                  ? "Rejected"
                                  : "Changes requested"}
                            </strong>{" "}
                            by {review.reviewer_name} on{" "}
                            {formatDateTime(review.created_at)}
                            {review.review_notes && (
                              <div>{review.review_notes}</div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

              <ItemRequestFulfillment
                detail={detail}
                accessToken={accessToken}
                onRefresh={refreshDetail}
              />

              <section className="ir-panel">
                <h2>
                  <ClipboardList size={17} />
                  Safety and privacy
                </h2>
                <p className="ir-muted">
                  GoodDeed does not publish phone numbers, email addresses, or
                  home addresses. Arrange handovers in a safe public place and
                  share contact details only with the person you are meeting.
                  Verification is a human review of the request, not a background
                  or financial check.
                </p>
              </section>
            </div>

            <aside>
              <section className="ir-panel">
                <h2>Request status</h2>

                <dl className="ir-detail-list" style={{ gridTemplateColumns: "1fr" }}>
                  <div>
                    <dt>Current status</dt>
                    <dd>{requestStatusLabel(request.status)}</dd>
                  </div>
                  <div>
                    <dt>Verification</dt>
                    <dd>
                      {request.is_verified
                        ? `Verified ${formatDate(request.verified_at)}`
                        : "Awaiting verification"}
                    </dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDate(request.submitted_at)}</dd>
                  </div>
                  {request.fulfilled_at && (
                    <div>
                      <dt>Fulfilled</dt>
                      <dd>{formatDate(request.fulfilled_at)}</dd>
                    </div>
                  )}
                </dl>

                {viewer.is_reviewer && (
                  <div style={{ marginTop: 18 }}>
                    <Link
                      to="/admin/item-requests"
                      className="ir-btn ir-btn-secondary"
                    >
                      Open reviewer dashboard
                    </Link>
                  </div>
                )}
              </section>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
