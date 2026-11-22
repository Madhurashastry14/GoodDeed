import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Pencil,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { getOpportunityById, updateOpportunity } from "../services/api";

import "../styles/createOpportunity.css";

function toLocalInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const pad = (part) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditOpportunity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, loading: authLoading } = useAuth();

  const [form, setForm] = useState(null);
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function loadOpportunity() {
      setLoading(true);
      setError("");
      setOpportunity(null);
      setForm(null);

      try {
        if (!accessToken) {
          throw new Error("Please log in to edit this opportunity.");
        }

        const data = await getOpportunityById(id, accessToken);
        const result = data.opportunity ?? data;

        if (!result || !result.id) {
          throw new Error("Opportunity not found.");
        }

        if (!result.is_owner) {
          throw new Error(
            "Only the organization owner can edit this opportunity.",
          );
        }

        if (!["draft", "published"].includes(result.status)) {
          throw new Error(
            "Completed or cancelled opportunities cannot be edited.",
          );
        }

        if (active) {
          setOpportunity(result);
          setForm({
            title: result.title || "",
            description: result.description || "",
            city: result.city || "",
            startsAt: toLocalInput(result.starts_at),
            endsAt: toLocalInput(result.ends_at),
            capacity:
              result.capacity === null || result.capacity === undefined
                ? ""
                : String(result.capacity),
          });
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load opportunity.");
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

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!accessToken || !opportunity) {
      setError("You are not authorized to edit this opportunity.");
      return;
    }

    const title = form.title.trim();
    const description = form.description.trim();
    const city = form.city.trim();

    if (!title || !description || !city) {
      setError("Please complete all required fields.");
      return;
    }

    const start = new Date(form.startsAt);
    const end = new Date(form.endsAt);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      setError("Enter valid start and end times.");
      return;
    }

    if (end <= start) {
      setError("End time must be later than start time.");
      return;
    }

    const capacity = form.capacity.trim() === "" ? null : Number(form.capacity);

    if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
      setError("Capacity must be a positive whole number.");
      return;
    }

    setSaving(true);

    try {
      await updateOpportunity(
        id,
        {
          title,
          description,
          city,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          capacity,
        },
        accessToken,
      );

      navigate(`/opportunities/${id}`, {
        state: {
          message: "Opportunity updated successfully.",
        },
      });
    } catch (err) {
      setError(err.message || "Unable to update opportunity.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="create-opp-page">
        <div className="create-opp-container">
          <Link to={`/opportunities/${id}`} className="create-opp-back">
            <ArrowLeft size={17} />
            Back to opportunity
          </Link>

          <header className="create-opp-header">
            <div className="create-opp-icon">
              <Pencil size={26} />
            </div>

            <span className="create-opp-eyebrow">REFINE YOUR OPPORTUNITY</span>

            <h1>Edit volunteer opportunity</h1>

            <p>
              Update the details below. Published opportunities remain visible
              to volunteers after saving.
            </p>
          </header>

          <section className="create-opp-card">
            {loading ? (
              <p>Loading opportunity...</p>
            ) : !opportunity || !form ? (
              <div className="create-opp-empty">
                <h2>Unable to edit opportunity</h2>
                <p role="alert">{error || "Opportunity not found."}</p>

                <Link to={`/opportunities/${id}`}>Back to opportunity</Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="create-opp-error" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="create-opp-field">
                    <label>Organization</label>

                    <div className="create-opp-org-name">
                      {opportunity.organization_name}
                    </div>
                  </div>

                  <div className="create-opp-field">
                    <label htmlFor="title">Opportunity title *</label>

                    <input
                      id="title"
                      name="title"
                      type="text"
                      maxLength={200}
                      value={form.title}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="create-opp-field">
                    <label htmlFor="description">Description *</label>

                    <textarea
                      id="description"
                      name="description"
                      rows={5}
                      value={form.description}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="create-opp-field">
                    <label htmlFor="city">
                      <MapPin size={15} />
                      City *
                    </label>

                    <input
                      id="city"
                      name="city"
                      type="text"
                      maxLength={100}
                      value={form.city}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="create-opp-grid">
                    <div className="create-opp-field">
                      <label htmlFor="startsAt">
                        <CalendarDays size={15} />
                        Start date & time *
                      </label>

                      <input
                        id="startsAt"
                        name="startsAt"
                        type="datetime-local"
                        value={form.startsAt}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="create-opp-field">
                      <label htmlFor="endsAt">
                        <CalendarDays size={15} />
                        End date & time *
                      </label>

                      <input
                        id="endsAt"
                        name="endsAt"
                        type="datetime-local"
                        value={form.endsAt}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="create-opp-field">
                    <label htmlFor="capacity">
                      <Users size={15} />
                      Volunteer capacity
                    </label>

                    <input
                      id="capacity"
                      name="capacity"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Leave blank for unlimited"
                      value={form.capacity}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="create-opp-actions">
                    <Link to={`/opportunities/${id}`}>Cancel</Link>

                    <button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
