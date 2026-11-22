import { useState } from "react";
import { Link } from "react-router-dom";
import { Ban, CheckCircle, Pencil, Send, Trash2 } from "lucide-react";

import {
  cancelOpportunity,
  completeOpportunity,
  deleteOpportunity,
  publishOpportunity,
} from "../services/api";
import "../styles/opportunityOwnerActions.css";

export default function OpportunityOwnerActions({
  opportunity,
  accessToken,
  onUpdated,
  onDeleted,
  compact = false,
}) {
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");

  if (!opportunity?.is_owner) {
    return null;
  }

  const status = opportunity.status;
  const canEdit = ["draft", "published"].includes(status);
  const canPublish = status === "draft";
  const canCancel = ["draft", "published"].includes(status);
  const canComplete =
    status === "published" && Boolean(opportunity.can_complete);
  const canDelete = status === "draft";

  const hasActions = canEdit || canPublish || canCancel || canComplete || canDelete;

  if (!hasActions) {
    return null;
  }

  async function runAction(action, confirmation, request) {
    if (!window.confirm(confirmation)) return;

    setBusyAction(action);
    setError("");

    try {
      const data = await request();

      if (action === "delete") {
        onDeleted?.(opportunity);
      } else {
        onUpdated?.(data.opportunity ?? data);
      }
    } catch (err) {
      setError(err.message || "Unable to update opportunity");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className={`opp-owner-actions ${compact ? "opp-owner-actions-compact" : ""}`}>
      {canEdit && (
        <Link
          to={`/opportunities/${opportunity.id}/edit`}
          className="opp-owner-btn"
        >
          <Pencil size={14} />
          Edit
        </Link>
      )}

      {canPublish && (
        <button
          type="button"
          className="opp-owner-btn opp-owner-btn-primary"
          disabled={Boolean(busyAction)}
          onClick={() =>
            runAction(
              "publish",
              `Publish "${opportunity.title}"? It will become visible to everyone.`,
              () => publishOpportunity(opportunity.id, accessToken),
            )
          }
        >
          <Send size={14} />
          {busyAction === "publish" ? "Publishing..." : "Publish"}
        </button>
      )}

      {canComplete && (
        <button
          type="button"
          className="opp-owner-btn opp-owner-btn-primary"
          disabled={Boolean(busyAction)}
          onClick={() =>
            runAction(
              "complete",
              `Mark "${opportunity.title}" as completed? This cannot be undone.`,
              () => completeOpportunity(opportunity.id, accessToken),
            )
          }
        >
          <CheckCircle size={14} />
          {busyAction === "complete" ? "Completing..." : "Mark completed"}
        </button>
      )}

      {canCancel && (
        <button
          type="button"
          className="opp-owner-btn opp-owner-btn-danger"
          disabled={Boolean(busyAction)}
          onClick={() =>
            runAction(
              "cancel",
              `Cancel "${opportunity.title}"? This cannot be undone.`,
              () => cancelOpportunity(opportunity.id, accessToken),
            )
          }
        >
          <Ban size={14} />
          {busyAction === "cancel" ? "Cancelling..." : "Cancel"}
        </button>
      )}

      {canDelete && (
        <button
          type="button"
          className="opp-owner-btn opp-owner-btn-danger"
          disabled={Boolean(busyAction)}
          onClick={() =>
            runAction(
              "delete",
              `Delete draft "${opportunity.title}"? This cannot be undone.`,
              () => deleteOpportunity(opportunity.id, accessToken),
            )
          }
        >
          <Trash2 size={14} />
          {busyAction === "delete" ? "Deleting..." : "Delete"}
        </button>
      )}

      {error && (
        <p className="opp-owner-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
