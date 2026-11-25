import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardCheck,
  MapPin,
  Package,
  ShieldCheck,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { useToast } from "../context/notificationContext";
import {
  REQUEST_CATEGORIES,
  REQUEST_URGENCIES,
} from "../constants/itemRequests";
import {
  createItemRequest,
  getItemRequestById,
  submitItemRequest,
  updateItemRequest,
} from "../services/api";
import "../styles/itemRequests.css";

const emptyForm = {
  title: "",
  description: "",
  category: "food",
  quantity: "1",
  city: "",
  reason: "",
  urgency: "normal",
};

export default function ItemRequestForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { accessToken, loading: authLoading } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    if (authLoading) return;

    let active = true;

    async function loadRequest() {
      setLoading(true);
      setError("");

      try {
        if (!accessToken) {
          throw new Error("Please log in to edit this request.");
        }

        const data = await getItemRequestById(id, accessToken);

        if (!data.viewer?.is_requester) {
          throw new Error("Only the requester can edit this request.");
        }

        if (!data.permissions?.can_edit) {
          throw new Error(
            "This request can no longer be edited in its current status.",
          );
        }

        if (active) {
          const request = data.request;
          setStatus(request.status);
          setFeedback(data.feedback ?? null);
          setForm({
            title: request.title,
            description: request.description,
            category: request.category,
            quantity: String(request.quantity),
            city: request.city,
            reason: request.reason ?? "",
            urgency: request.urgency,
          });
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load the request.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRequest();

    return () => {
      active = false;
    };
  }, [id, isEdit, accessToken, authLoading]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function validate() {
    const title = form.title.trim();
    const description = form.description.trim();
    const city = form.city.trim();
    const reason = form.reason.trim();
    const quantity = Number(form.quantity);

    if (title.length < 3) {
      return "Title must be at least 3 characters.";
    }

    if (description.length < 10) {
      return "Description must be at least 10 characters.";
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return "Quantity must be a positive whole number.";
    }

    if (!city) {
      return "Please enter the city for this request.";
    }

    if (reason.length < 10) {
      return "Please explain your reason for requesting the item.";
    }

    return "";
  }

  async function handleSave(submitForVerification) {
    setError("");

    if (!accessToken) {
      setError("Please log in to continue.");
      return;
    }

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      quantity: Number(form.quantity),
      city: form.city.trim(),
      reason: form.reason.trim(),
      urgency: form.urgency,
    };

    try {
      let requestId = id;

      if (isEdit) {
        const data = await updateItemRequest(id, payload, accessToken);

        if (data.reverification_required) {
          toast.success("Changes saved. The request is back in review.");
          navigate(`/help-requests/${id}`);
          return;
        }

        if (submitForVerification) {
          await submitItemRequest(id, accessToken);
          toast.success("Request submitted for verification.");
        } else {
          toast.success("Draft updated.");
        }
      } else {
        const data = await createItemRequest(payload, accessToken);
        requestId = data.request.id;

        if (submitForVerification) {
          await submitItemRequest(requestId, accessToken);
          toast.success("Request submitted for verification.");
        } else {
          toast.success("Draft saved.");
        }
      }

      navigate(`/help-requests/${requestId}`);
    } catch (err) {
      const message = err.message || "Unable to save the request.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const editingApproved = status === "open";

  return (
    <>
      <Navbar />

      <main className="ir-form-page">
        <div className="ir-form-container">
          <Link
            to={isEdit ? `/help-requests/${id}` : "/help-requests"}
            className="ir-back"
          >
            <ArrowLeft size={17} />
            {isEdit ? "Back to request" : "Back to help requests"}
          </Link>

          <header className="ir-form-header">
            <span className="ir-eyebrow">
              {isEdit ? "UPDATE YOUR REQUEST" : "ASK FOR WHAT YOU NEED"}
            </span>

            <h1>{isEdit ? "Edit your request" : "Create an item request"}</h1>

            <p>
              Requests are reviewed by a GoodDeed platform reviewer before they
              appear publicly. Only verified requests can receive fulfillment
              offers. Your reason is shared only with reviewers.
            </p>
          </header>

          <section className="ir-form-card">
            {loading ? (
              <p className="ir-form-status">Loading request...</p>
            ) : (
              <>
                <div className="ir-form-notice">
                  <ShieldCheck size={16} />
                  <span>
                    A reviewer checks every request by hand. Approval does not
                    verify your identity or financial circumstances, and it does
                    not guarantee fulfillment.
                  </span>
                </div>

                {feedback && (
                  <div className="ir-feedback-box">
                    <strong>
                      Reviewer feedback (
                      {feedback.decision === "rejected"
                        ? "not approved"
                        : "changes requested"}
                      )
                    </strong>
                    {feedback.review_notes}
                  </div>
                )}

                {editingApproved && (
                  <div className="ir-form-notice">
                    <ClipboardCheck size={16} />
                    <span>
                      This request is approved and public. Saving changes removes
                      it from public discovery and sends it back for
                      verification.
                    </span>
                  </div>
                )}

                {error && (
                  <div className="ir-form-error" role="alert">
                    {error}
                  </div>
                )}

                {isEdit && error && !form.title ? (
                  <div className="ir-form-actions">
                    <Link to="/my-activities">Go to My Activities</Link>
                  </div>
                ) : (
                  <form onSubmit={(event) => event.preventDefault()}>
                    <div className="ir-form-field">
                      <label htmlFor="title">Item title *</label>
                      <input
                        id="title"
                        name="title"
                        type="text"
                        maxLength={200}
                        placeholder="e.g. Winter coats for two children"
                        value={form.title}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="ir-form-field">
                      <label htmlFor="description">Public description *</label>
                      <textarea
                        id="description"
                        name="description"
                        rows={5}
                        maxLength={5000}
                        placeholder="Describe what you need and anything a donor should know..."
                        value={form.description}
                        onChange={handleChange}
                        required
                      />
                      <small>
                        At least 10 characters. Do not include phone numbers,
                        email addresses, or home addresses.
                      </small>
                    </div>

                    <div className="ir-form-grid">
                      <div className="ir-form-field">
                        <label htmlFor="category">Category *</label>
                        <select
                          id="category"
                          name="category"
                          value={form.category}
                          onChange={handleChange}
                        >
                          {REQUEST_CATEGORIES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="ir-form-field">
                        <label htmlFor="quantity">
                          <Package size={14} />
                          Quantity *
                        </label>
                        <input
                          id="quantity"
                          name="quantity"
                          type="number"
                          min="1"
                          max="1000"
                          step="1"
                          value={form.quantity}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="ir-form-grid">
                      <div className="ir-form-field">
                        <label htmlFor="city">
                          <MapPin size={14} />
                          City *
                        </label>
                        <input
                          id="city"
                          name="city"
                          type="text"
                          maxLength={100}
                          placeholder="e.g. Pune"
                          value={form.city}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="ir-form-field">
                        <label htmlFor="urgency">Urgency *</label>
                        <select
                          id="urgency"
                          name="urgency"
                          value={form.urgency}
                          onChange={handleChange}
                        >
                          {REQUEST_URGENCIES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <small>
                          Urgency is what you report; it is not independently
                          verified.
                        </small>
                      </div>
                    </div>

                    <div className="ir-form-field">
                      <label htmlFor="reason">Reason for requesting *</label>
                      <textarea
                        id="reason"
                        name="reason"
                        rows={4}
                        maxLength={3000}
                        placeholder="Explain your situation so a reviewer can assess the request..."
                        value={form.reason}
                        onChange={handleChange}
                        required
                      />
                      <small>
                        At least 10 characters. This is never shown publicly.
                      </small>
                    </div>

                    <div className="ir-form-actions">
                      <Link to={isEdit ? `/help-requests/${id}` : "/help-requests"}>
                        Cancel
                      </Link>

                      {!editingApproved && (
                        <button
                          type="button"
                          className="ir-btn ir-btn-secondary"
                          disabled={saving}
                          onClick={() => handleSave(false)}
                        >
                          {saving ? "Saving..." : "Save draft"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="ir-btn ir-btn-primary"
                        disabled={saving}
                        onClick={() => handleSave(true)}
                      >
                        {saving
                          ? "Submitting..."
                          : editingApproved
                            ? "Save and resubmit"
                            : "Submit for verification"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
