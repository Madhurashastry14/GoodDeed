import { useState } from "react";
import { Link } from "react-router-dom";
import { Ban, CheckCircle, Pencil, Send, Trash2 } from "lucide-react";

import {
  cancelOpportunity,
  completeOpportunity,
  deleteOpportunity,
  publishOpportunity,
} from "../services/api";
import { useConfirm, useToast } from "../context/notificationContext";
import "../styles/opportunityOwnerActions.css";

export default function OpportunityOwnerActions({
  opportunity,
  accessToken,
  onUpdated,
  onDeleted,
  isOwner,
  compact = false,
}) {
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  const canManage = isOwner ?? opportunity?.is_owner;

  if (!canManage) {
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
    const confirmed = await confirm(confirmation);

    if (!confirmed) return;

    setBusyAction(action);
    setError("");

    try {
      const data = await request();

      if (action === "delete") {
        toast.success("Draft opportunity deleted.");
        onDeleted?.(opportunity);
      } else {
        const messages = {
          publish: "Opportunity published successfully.",
          complete: "Opportunity marked as completed.",
          cancel: "Opportunity cancelled successfully.",
        };

        toast.success(messages[action] ?? "Opportunity updated successfully.");
        onUpdated?.(data.opportunity ?? data);
      }
    } catch (err) {
      const message = err.message || "Unable to update opportunity";

      setError(message);
      toast.error(message);
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
              {
                title: "Publish opportunity?",
                message: `Publish "${opportunity.title}"? It will become visible to everyone.`,
                confirmLabel: "Publish",
                tone: "primary",
              },
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
              {
                title: "Mark opportunity as completed?",
                message: `Mark "${opportunity.title}" as completed? This cannot be undone.`,
                confirmLabel: "Mark completed",
                tone: "primary",
              },
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
              {
                title: "Cancel opportunity?",
                message: `Cancel "${opportunity.title}"? This cannot be undone. Existing applications will be preserved.`,
                confirmLabel: "Cancel opportunity",
                cancelLabel: "Keep opportunity",
                tone: "danger",
              },
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
              {
                title: "Delete draft opportunity?",
                message: `Delete draft "${opportunity.title}"? This cannot be undone.`,
                confirmLabel: "Delete draft",
                cancelLabel: "Keep draft",
                tone: "danger",
              },
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
