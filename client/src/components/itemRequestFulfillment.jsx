import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  HandHeart,
  MapPin,
  Send,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import { useConfirm, useToast } from "../context/notificationContext";
import { offerStatusLabel } from "../constants/itemRequests";
import {
  acceptItemRequestOffer,
  cancelItemRequestOffer,
  confirmItemRequestHandover,
  createItemRequestOffer,
  getMyOrganizations,
  rejectItemRequestOffer,
  updateItemRequestHandover,
  withdrawItemRequestOffer,
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

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function HandoverPanel({ offer, request, isRequester, accessToken, onRefresh }) {
  const toast = useToast();
  const confirm = useConfirm();
  const noteRef = useRef(null);
  const locationRef = useRef(null);
  const timeRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const isCompleted = offer.status === "completed";
  const myConfirmed = isRequester
    ? offer.requester_confirmed_at
    : offer.donor_confirmed_at;
  const otherConfirmed = isRequester
    ? offer.donor_confirmed_at
    : offer.requester_confirmed_at;
  const canCancel = !isCompleted && !offer.donor_confirmed_at && !offer.requester_confirmed_at;

  async function handleSaveDetails(event) {
    event.preventDefault();

    if (!accessToken || saving) return;

    const timeValue = timeRef.current?.value;

    let handoverAt = null;

    if (timeValue) {
      const parsed = new Date(timeValue);

      if (Number.isNaN(parsed.getTime())) {
        toast.error("Enter a valid handover time.");
        return;
      }

      handoverAt = parsed.toISOString();
    }

    setSaving(true);

    try {
      await updateItemRequestHandover(
        offer.id,
        {
          handoverNote: noteRef.current?.value.trim() || null,
          handoverLocation: locationRef.current?.value.trim() || null,
          handoverAt,
        },
        accessToken,
      );

      toast.success("Handover details saved.");
      await onRefresh();
    } catch (err) {
      toast.error(err.message || "Unable to save handover details.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!accessToken || confirming) return;

    const confirmed = await confirm({
      title: "Confirm handover?",
      message: isRequester
        ? `Confirm that you received "${request.title}" from the donor? Once both parties confirm, the request is fulfilled and cannot be undone.`
        : `Confirm that you handed "${request.title}" to the requester? Once both parties confirm, the request is fulfilled and cannot be undone.`,
      confirmLabel: "Confirm handover",
    });

    if (!confirmed) return;

    setConfirming(true);

    try {
      const data = await confirmItemRequestHandover(offer.id, accessToken);

      toast.success(
        data.offer.status === "completed"
          ? "Fulfillment completed. Thank you for confirming."
          : "Handover confirmed. Waiting for the other party.",
      );

      await onRefresh();
    } catch (err) {
      toast.error(err.message || "Unable to confirm handover.");
    } finally {
      setConfirming(false);
    }
  }

  async function handleCancel() {
    if (!accessToken) return;

    const confirmed = await confirm({
      title: "Cancel this reservation?",
      message:
        "The request returns to verified discovery so another donor can offer. This cannot be undone.",
      confirmLabel: "Cancel reservation",
      tone: "danger",
    });

    if (!confirmed) return;

    setSaving(true);

    try {
      await cancelItemRequestOffer(offer.id, accessToken);
      toast.success("Reservation cancelled. The request is open again.");
      await onRefresh();
    } catch (err) {
      toast.error(err.message || "Unable to cancel the reservation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ir-panel" id="handover">
      <h2>
        <ShieldCheck size={17} />
        {isCompleted ? "Completed handover" : "Handover coordination"}
      </h2>

      <p className="ir-muted">
        Only you and the other party can see these details. This is not a live
        chat. Meet in a safe public place and do not share more personal
        information than necessary.
      </p>

      {isCompleted ? (
        <div className="ir-private-note">
          <strong>Completed</strong>
          Handover finished on {formatDateTime(offer.completed_at)}.
          <div style={{ marginTop: 6 }}>
            Donor confirmed: {formatDateTime(offer.donor_confirmed_at)}
            <br />
            Requester confirmed: {formatDateTime(offer.requester_confirmed_at)}
          </div>
        </div>
      ) : (
        <>
          <div className="ir-private-note">
            <strong>Current agreement</strong>
            Location: {offer.handover_location || "Not recorded"}
            <br />
            Time: {formatDateTime(offer.handover_at)}
            <br />
            Note: {offer.handover_note || "Not recorded"}
          </div>

          <form
            className="ir-handover-form"
            onSubmit={handleSaveDetails}
            key={`${offer.id}|${offer.handover_note ?? ""}|${
              offer.handover_location ?? ""
            }|${offer.handover_at ?? ""}`}
          >
            <div>
              <label htmlFor="ir-handover-location">
                <MapPin size={12} /> Public meeting place
              </label>
              <input
                id="ir-handover-location"
                ref={locationRef}
                type="text"
                maxLength={200}
                defaultValue={offer.handover_location ?? ""}
                placeholder="e.g. Community centre front desk"
              />
            </div>

            <div>
              <label htmlFor="ir-handover-time">Proposed time</label>
              <input
                id="ir-handover-time"
                ref={timeRef}
                type="datetime-local"
                defaultValue={toDateTimeLocal(offer.handover_at)}
              />
            </div>

            <div>
              <label htmlFor="ir-handover-note">Coordination note</label>
              <textarea
                id="ir-handover-note"
                ref={noteRef}
                rows={2}
                maxLength={1000}
                defaultValue={offer.handover_note ?? ""}
                placeholder="Anything the other party should know"
              />
            </div>

            <div>
              <button
                type="submit"
                className="ir-btn ir-btn-secondary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save handover details"}
              </button>
            </div>
          </form>

          <div className="ir-confirm-grid">
            <div className={`ir-confirm ${offer.donor_confirmed_at ? "confirmed" : ""}`}>
              <strong>Donor confirmation</strong>
              {offer.donor_confirmed_at
                ? `Confirmed ${formatDateTime(offer.donor_confirmed_at)}`
                : "Not confirmed yet"}
            </div>

            <div
              className={`ir-confirm ${
                offer.requester_confirmed_at ? "confirmed" : ""
              }`}
            >
              <strong>Requester confirmation</strong>
              {offer.requester_confirmed_at
                ? `Confirmed ${formatDateTime(offer.requester_confirmed_at)}`
                : "Not confirmed yet"}
            </div>
          </div>

          <div className="ir-review-actions">
            {!myConfirmed && (
              <button
                type="button"
                className="ir-btn ir-btn-primary"
                disabled={confirming}
                onClick={handleConfirm}
              >
                <CheckCircle2 size={15} />
                {confirming ? "Confirming..." : "Confirm handover"}
              </button>
            )}

            {myConfirmed && !otherConfirmed && (
              <p className="ir-muted">
                You confirmed this handover. Waiting for the other party.
              </p>
            )}

            {canCancel && (
              <button
                type="button"
                className="ir-btn ir-btn-danger"
                disabled={saving}
                onClick={handleCancel}
              >
                Cancel reservation
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default function ItemRequestFulfillment({
  detail,
  accessToken,
  onRefresh,
}) {
  const toast = useToast();
  const confirm = useConfirm();

  const { request, viewer, permissions } = detail;
  const isRequester = viewer.is_requester;

  const [message, setMessage] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [busyOfferId, setBusyOfferId] = useState("");

  const canOffer = permissions.can_offer;
  const myOffers = detail.my_offers ?? [];
  const pendingOffer = myOffers.find((offer) => offer.status === "pending");
  const acceptedOffer =
    myOffers.find((offer) => ["accepted", "completed"].includes(offer.status)) ??
    (isRequester
      ? (detail.offers ?? []).find((offer) =>
          ["accepted", "completed"].includes(offer.status),
        )
      : null);

  useEffect(() => {
    if (!canOffer || !accessToken) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getMyOrganizations(accessToken);
        const owned = (data.organizations ?? []).filter(
          (organization) => organization.role === "owner",
        );

        if (!cancelled) {
          setOrganizations(owned);
        }
      } catch {
        if (!cancelled) {
          setOrganizations([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canOffer, accessToken]);

  async function handleOffer(event) {
    event.preventDefault();

    if (!accessToken || submitting) return;

    if (message.trim().length < 10) {
      toast.error("Please write at least 10 characters about how you can help.");
      return;
    }

    setSubmitting(true);

    try {
      await createItemRequestOffer(
        request.id,
        { message: message.trim(), organizationId: organizationId || null },
        accessToken,
      );

      setMessage("");
      toast.success("Fulfillment offer submitted.");
      await onRefresh();
    } catch (err) {
      toast.error(err.message || "Unable to submit the offer.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(offer) {
    const confirmed = await confirm({
      title: "Withdraw your offer?",
      message: "The requester will no longer see this offer.",
      confirmLabel: "Withdraw offer",
      tone: "danger",
    });

    if (!confirmed) return;

    setBusyOfferId(offer.id);

    try {
      await withdrawItemRequestOffer(offer.id, accessToken);
      toast.success("Offer withdrawn.");
      await onRefresh();
    } catch (err) {
      toast.error(err.message || "Unable to withdraw the offer.");
    } finally {
      setBusyOfferId("");
    }
  }

  async function handleAccept(offer) {
    const confirmed = await confirm({
      title: "Select this donor?",
      message: `Accept ${offer.donor_name}'s offer? The request becomes reserved and other offers stay pending until the handover is confirmed or the reservation is cancelled.`,
      confirmLabel: "Select donor",
    });

    if (!confirmed) return;

    setBusyOfferId(offer.id);

    try {
      await acceptItemRequestOffer(offer.id, accessToken);
      toast.success("Donor selected. Coordinate the handover privately.");
      await onRefresh();
    } catch (err) {
      toast.error(err.message || "Unable to accept the offer.");
    } finally {
      setBusyOfferId("");
    }
  }

  async function handleReject(offer) {
    const confirmed = await confirm({
      title: "Reject this offer?",
      message: `Reject ${offer.donor_name}'s offer? The offer stays in history.`,
      confirmLabel: "Reject offer",
      tone: "danger",
    });

    if (!confirmed) return;

    setBusyOfferId(offer.id);

    try {
      await rejectItemRequestOffer(offer.id, accessToken);
      toast.success("Offer rejected.");
      await onRefresh();
    } catch (err) {
      toast.error(err.message || "Unable to reject the offer.");
    } finally {
      setBusyOfferId("");
    }
  }

  const showOffersSection = isRequester && (detail.offers?.length ?? 0) > 0;
  const showAcceptedForRequester =
    isRequester && acceptedOffer && acceptedOffer.status !== "completed";

  return (
    <>
      {canOffer && (
        <section className="ir-panel">
          <h2>
            <HandHeart size={17} />
            Offer to help
          </h2>

          <p className="ir-muted">
            This fulfills the full requested quantity of {request.quantity}.
            GoodDeed does not handle payments. Only the requester sees your
            offer and your display name.
          </p>

          <form onSubmit={handleOffer} className="ir-handover-form">
            <div>
              <label htmlFor="ir-offer-message">Your message *</label>
              <textarea
                id="ir-offer-message"
                rows={4}
                maxLength={1000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Explain how you can provide the item and when."
                required
              />
            </div>

            {organizations.length > 0 && (
              <div>
                <label htmlFor="ir-offer-organization">Offer as</label>
                <select
                  id="ir-offer-organization"
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                >
                  <option value="">Myself (individual)</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name} (organization owner)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="ir-btn ir-btn-primary"
                disabled={submitting}
              >
                <Send size={15} />
                {submitting ? "Submitting..." : "Submit offer"}
              </button>
            </div>
          </form>
        </section>
      )}

      {!isRequester && pendingOffer && (
        <section className="ir-panel">
          <h2>Your offer</h2>
          <p className="ir-muted">
            Your offer is pending. The requester will select one donor. You can
            withdraw it until it is accepted.
          </p>

          <div className="ir-offer">
            <div className="ir-offer-head">
              <strong>{offerStatusLabel(pendingOffer.status)}</strong>
              <span className="ir-muted">
                {formatDateTime(pendingOffer.created_at)}
              </span>
            </div>
            <p>{pendingOffer.message}</p>
            <div className="ir-offer-actions">
              <button
                type="button"
                className="ir-btn ir-btn-danger"
                disabled={busyOfferId === pendingOffer.id}
                onClick={() => handleWithdraw(pendingOffer)}
              >
                Withdraw offer
              </button>
            </div>
          </div>
        </section>
      )}

      {!isRequester && !pendingOffer && !acceptedOffer && (
        <section className="ir-panel">
          <h2>Fulfillment</h2>
          <p className="ir-muted">
            {request.status === "open"
              ? "You have not offered to fulfill this request. You can submit one offer while it is open."
              : "This request is not open for new offers."}
          </p>
        </section>
      )}

      {showOffersSection && (
        <section className="ir-panel" id="offers">
          <h2>Fulfillment offers ({detail.offers.length})</h2>

          {detail.offers.map((offer) => (
            <div className="ir-offer" key={offer.id}>
              <div className="ir-offer-head">
                <strong>
                  {offer.organization_name ? (
                    <>
                      <Building2 size={13} /> {offer.organization_name}
                    </>
                  ) : (
                    <>
                      <UserRound size={13} /> {offer.donor_name}
                    </>
                  )}
                </strong>

                <span className={`ir-badge status-${offer.status}`}>
                  {offerStatusLabel(offer.status)}
                </span>
              </div>

              <div className="ir-offer-meta">
                <span>Offered by {offer.donor_name}</span>
                {offer.donor_city && <span>{offer.donor_city}</span>}
                <span>{formatDateTime(offer.created_at)}</span>
              </div>

              <p>{offer.message}</p>

              {offer.status === "pending" && (
                <div className="ir-offer-actions">
                  <button
                    type="button"
                    className="ir-btn ir-btn-primary"
                    disabled={busyOfferId === offer.id}
                    onClick={() => handleAccept(offer)}
                  >
                    <CheckCircle2 size={14} />
                    Select donor
                  </button>

                  <button
                    type="button"
                    className="ir-btn ir-btn-danger"
                    disabled={busyOfferId === offer.id}
                    onClick={() => handleReject(offer)}
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </div>
              )}

              {offer.status === "accepted" && (
                <p className="ir-muted">
                  Selected donor. Handover confirmed: donor{" "}
                  {offer.donor_confirmed_at ? "yes" : "no"}, requester{" "}
                  {offer.requester_confirmed_at ? "yes" : "no"}.
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {showAcceptedForRequester && (
        <HandoverPanel
          offer={acceptedOffer}
          request={request}
          isRequester
          accessToken={accessToken}
          onRefresh={onRefresh}
        />
      )}

      {!isRequester && acceptedOffer && (
        <HandoverPanel
          offer={acceptedOffer}
          request={request}
          isRequester={false}
          accessToken={accessToken}
          onRefresh={onRefresh}
        />
      )}

      {!isRequester && !canOffer && !pendingOffer && !acceptedOffer && (
        <p className="ir-muted" style={{ marginTop: 12 }}>
          Only the selected donor and the requester can access handover
          coordination.
        </p>
      )}
    </>
  );
}
