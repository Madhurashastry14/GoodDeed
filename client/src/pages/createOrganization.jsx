import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  Globe,
  AlignLeft,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { createOrganization } from "../services/api";
import "../styles/createOrganization.css";

export default function CreateOrganization() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [form, setForm] = useState({
    name: "",
    city: "",
    description: "",
    website: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const name = form.name.trim();
    const city = form.city.trim();
    const description = form.description.trim();
    const website = form.website.trim();

    if (!name || !city) {
      setError("Organization name and city are required.");
      return;
    }

    if (website) {
      try {
        const url = new URL(website);

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        setError("Enter a valid website URL starting with https://");
        return;
      }
    }

    if (!accessToken) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    setLoading(true);

    try {
      const data = await createOrganization(
        {
          name,
          city,
          description: description || null,
          website: website || null,
        },
        accessToken,
      );

      // Support the backend's organization response.
      const organization = data.organization ?? data;

      if (organization?.id) {
        navigate(`/organizations/${organization.id}`, {
          replace: true,
        });
      } else {
        navigate("/organizations", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="create-org-page">
        <div className="create-org-container">
          <Link to="/organizations" className="create-org-back">
            <ArrowLeft size={17} />
            Back to organizations
          </Link>

          <div className="create-org-heading">
            <span className="create-org-eyebrow">BUILD YOUR COMMUNITY</span>

            <h1>Create an organization</h1>

            <p>
              Bring people together around a shared purpose. Start by telling us
              a little about your organization.
            </p>
          </div>

          <div className="create-org-layout">
            <section className="create-org-card">
              <div className="create-org-card-heading">
                <div className="create-org-card-icon">
                  <Building2 size={22} />
                </div>

                <div>
                  <h2>Organization details</h2>
                  <p>Fields marked * are required.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="create-org-error" role="alert">
                    {error}
                  </div>
                )}

                <div className="create-org-field">
                  <label htmlFor="org-name">Organization name *</label>

                  <div className="create-org-input-wrap">
                    <Building2 size={18} />

                    <input
                      id="org-name"
                      name="name"
                      type="text"
                      placeholder="e.g. Helping Hands Foundation"
                      value={form.name}
                      onChange={handleChange}
                      maxLength={150}
                      required
                    />
                  </div>
                </div>

                <div className="create-org-field">
                  <label htmlFor="org-city">City *</label>

                  <div className="create-org-input-wrap">
                    <MapPin size={18} />

                    <input
                      id="org-city"
                      name="city"
                      type="text"
                      placeholder="e.g. Mangalore"
                      value={form.city}
                      onChange={handleChange}
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div className="create-org-field">
                  <label htmlFor="org-description">Description</label>

                  <div className="create-org-input-wrap create-org-textarea-wrap">
                    <AlignLeft size={18} />

                    <textarea
                      id="org-description"
                      name="description"
                      placeholder="Tell people about your mission, goals, and the community you serve..."
                      value={form.description}
                      onChange={handleChange}
                      rows={5}
                    />
                  </div>
                </div>

                <div className="create-org-field">
                  <label htmlFor="org-website">
                    Website
                    <span className="create-org-optional">(optional)</span>
                  </label>

                  <div className="create-org-input-wrap">
                    <Globe size={18} />

                    <input
                      id="org-website"
                      name="website"
                      type="url"
                      placeholder="https://example.org"
                      value={form.website}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="create-org-actions">
                  <Link to="/organizations" className="create-org-cancel">
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    className="create-org-submit"
                    disabled={loading}
                  >
                    {loading ? "Creating..." : "Create organization"}

                    {!loading && <ArrowRight size={18} />}
                  </button>
                </div>
              </form>
            </section>

            <aside className="create-org-info">
              <div className="create-org-info-icon">
                <Building2 size={28} />
              </div>

              <h3>Every impact starts somewhere.</h3>

              <p>
                Creating an organization gives your community a dedicated space
                on GoodDeed.
              </p>

              <div className="create-org-info-divider" />

              <h4>What happens next?</h4>

              <p>
                Your organization will be saved to GoodDeed, where people can
                discover its details.
              </p>

              <p>
                As its owner, you'll be able to manage it through the
                organization features we're building.
              </p>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
