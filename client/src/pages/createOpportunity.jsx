import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  title: "",
  description: "",
  city: "",
  startsAt: "",
  endsAt: "",
  capacity: "",
};

export default function CreateOpportunity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, loading: authLoading } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function loadOrganization() {
      setLoading(true);
      setError("");
      setOrganization(null);

      try {
        if (!accessToken) {
          throw new Error("Please log in to create an opportunity.");
        }

        const data = await getMyOrganizations(accessToken);

        const list = Array.isArray(data)
          ? data
          : (data.organizations ?? data.organization);

        if (!Array.isArray(list)) {
          throw new Error("Unexpected organizations response.");
        }

        const selectedOrganization = list.find(
          (org) =>
            String(org.id) === String(id) &&
            ["owner", "admin"].includes(org.role?.toLowerCase()),
        );

        if (!selectedOrganization) {
          throw new Error(
            "You do not have permission to create opportunities for this organization.",
          );
        }

        if (active) {
          setOrganization(selectedOrganization);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load organization.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrganization();

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

    if (!accessToken || !organization) {
      setError("You are not authorized to create this opportunity.");
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
          organizationId: organization.id,
          title,
          description,
          city,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          capacity,
        },
        accessToken,
      );

      navigate(`/organizations/${id}`, {
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
          <Link to={`/organizations/${id}`} className="create-opp-back">
            <ArrowLeft size={17} />
            Back to organization
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
              <p>Loading organization...</p>
            ) : !organization ? (
              <div className="create-opp-empty">
                <h2>Unable to create opportunity</h2>
                <p role="alert">{error || "Organization not found."}</p>

                <Link to={`/organizations/${id}`}>Back to organization</Link>
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
                      {organization.name}
                    </div>
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
                    <Link to={`/organizations/${id}`}>Cancel</Link>

                    <button type="submit" disabled={saving}>
                      {saving ? "Creating..." : "Create opportunity"}
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
