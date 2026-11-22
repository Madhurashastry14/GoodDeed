import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  HandHeart,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { createOpportunity, getMyOrganizations } from "../services/api";

import "../styles/createOpportunity.css";

const initialForm = {
  organizationId: "",
  title: "",
  description: "",
  city: "",
  startsAt: "",
  endsAt: "",
  capacity: "",
};

export default function CreateOpportunity() {
  const navigate = useNavigate();
  const { accessToken, loading: authLoading } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function loadOrganizations() {
      setLoading(true);

      try {
        if (!accessToken) {
          throw new Error("Please log in to create an opportunity.");
        }

        const data = await getMyOrganizations(accessToken);

        const list = Array.isArray(data)
          ? data
          : (data.organizations ?? data.organization);

        if (!Array.isArray(list)) {
          throw new Error("Unexpected organizations response");
        }

        const manageable = list.filter((org) =>
          ["owner", "admin"].includes(org.role?.toLowerCase()),
        );

        if (active) {
          setOrganizations(manageable);
          setForm((previous) => ({
            ...previous,
            organizationId: manageable[0]?.id ?? "",
          }));
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load organizations.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrganizations();

    return () => {
      active = false;
    };
  }, [accessToken, authLoading]);

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

    if (!accessToken) {
      setError("Please log in first.");
      return;
    }

    if (!form.organizationId) {
      setError("Select an organization.");
      return;
    }

    const start = new Date(form.startsAt);
    const end = new Date(form.endsAt);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      setError("Enter valid start and end times.");
      return;
    }

    if (start <= new Date()) {
      setError("The opportunity must start in the future.");
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
      await createOpportunity(
        {
          organizationId: form.organizationId,
          title: form.title.trim(),
          description: form.description.trim(),
          city: form.city.trim(),
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          capacity,
        },
        accessToken,
      );

      navigate("/dashboard", {
        state: {
          message: "Opportunity created as a draft.",
        },
      });
    } catch (err) {
      setError(err.message || "Unable to create opportunity.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="create-opp-page">
        <div className="create-opp-container">
          <Link to="/dashboard" className="create-opp-back">
            <ArrowLeft size={17} />
            Back to dashboard
          </Link>

          <header className="create-opp-header">
            <div className="create-opp-icon">
              <HandHeart size={27} />
            </div>

            <span className="create-opp-eyebrow">MAKE AN IMPACT</span>

            <h1>Create a volunteer opportunity</h1>
            <p>
              Bring people together for a meaningful cause. Your opportunity
              will be saved as a draft.
            </p>
          </header>

          <section className="create-opp-card">
            {loading ? (
              <p>Loading your organizations...</p>
            ) : (
              <>
                {error && (
                  <div className="create-opp-error" role="alert">
                    {error}
                  </div>
                )}

                {organizations.length === 0 ? (
                  <div className="create-opp-empty">
                    <h2>No eligible organizations</h2>
                    <p>
                      You must be an owner or admin of an organization to create
                      opportunities.
                    </p>
                    <Link to="/organizations/new">Create an organization</Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="create-opp-field">
                      <label htmlFor="organizationId">Organization *</label>

                      <select
                        id="organizationId"
                        name="organizationId"
                        value={form.organizationId}
                        onChange={handleChange}
                        required
                      >
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="create-opp-field">
                      <label htmlFor="title">Opportunity title *</label>

                      <input
                        id="title"
                        name="title"
                        type="text"
                        maxLength={200}
                        placeholder="e.g. Beach Cleanup Drive"
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
                        placeholder="Describe the volunteer work and responsibilities..."
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
                        placeholder="e.g. Mangalore"
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

                      <small>
                        Optional. Maximum number of volunteers who can
                        participate.
                      </small>
                    </div>

                    <div className="create-opp-actions">
                      <Link to="/dashboard">Cancel</Link>

                      <button type="submit" disabled={saving}>
                        {saving ? "Creating..." : "Create opportunity"}
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
