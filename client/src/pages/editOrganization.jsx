import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Globe,
  AlignLeft,
  Save,
  Trash2,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import {
  getOrganizationById,
  getMyOrganizations,
  updateOrganization,
  deleteOrganization,
} from "../services/api";

import "../styles/editOrganization.css";

export default function EditOrganization() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    name: "",
    city: "",
    description: "",
    website: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function loadOrganization() {
      setLoading(true);
      setError("");

      if (!accessToken) {
        setError("Please log in to manage this organization.");
        setLoading(false);
        return;
      }

      try {
        const [details, mine] = await Promise.all([
          getOrganizationById(id),
          getMyOrganizations(accessToken),
        ]);

        const organization = details.organization ?? details;

        const myOrganizations = Array.isArray(mine)
          ? mine
          : (mine.organization ?? mine.organizations);

        if (!Array.isArray(myOrganizations)) {
          throw new Error("Unexpected membership response");
        }

        const membership = myOrganizations.find(
          (org) => String(org.id) === String(id),
        );

        if (!membership || membership.role?.toLowerCase() !== "owner") {
          if (active) {
            setIsOwner(false);
            setError("Only the organization owner can edit its details.");
          }
          return;
        }

        if (active) {
          setIsOwner(true);
          setForm({
            name: organization.name ?? "",
            city: organization.city ?? "",
            description: organization.description ?? "",
            website: organization.website ?? "",
          });
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load organization");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrganization();

    return () => {
      active = false;
    };
  }, [id, accessToken, authLoading]);

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
    setSuccess("");

    if (!isOwner || !accessToken) return;

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

    setSaving(true);

    try {
      await updateOrganization(
        id,
        {
          name,
          city,
          description: description || null,
          website: website || null,
        },
        accessToken,
      );

      setSuccess("Organization updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update organization.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isOwner || !accessToken || deleting) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this organization? This action cannot be undone.",
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      await deleteOrganization(id, accessToken);
      navigate("/my-organizations", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to delete organization.");
      setDeleting(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="edit-org-page">
        <div className="edit-org-container">
          <Link to={`/organizations/${id}`} className="edit-org-back">
            <ArrowLeft size={17} />
            Back to organization
          </Link>

          <div className="edit-org-heading">
            <span className="edit-org-eyebrow">ORGANIZATION MANAGEMENT</span>
            <h1>Edit organization</h1>
            <p>
              Update your organization's information and manage its presence on
              GoodDeed.
            </p>
          </div>

          {loading ? (
            <div className="edit-org-state">Loading organization...</div>
          ) : !isOwner ? (
            <div className="edit-org-error" role="alert">
              {error || "You don't have permission to edit this organization."}
            </div>
          ) : (
            <>
              <section className="edit-org-card">
                <div className="edit-org-card-heading">
                  <Building2 size={23} />
                  <div>
                    <h2>Organization details</h2>
                    <p>Keep your information accurate and up to date.</p>
                  </div>
                </div>

                {error && (
                  <div className="edit-org-error" role="alert">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="edit-org-success" role="status">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="edit-org-field">
                    <label htmlFor="edit-org-name">
                      <Building2 size={16} />
                      Organization name *
                    </label>
                    <input
                      id="edit-org-name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      maxLength={150}
                      required
                    />
                  </div>

                  <div className="edit-org-field">
                    <label htmlFor="edit-org-city">
                      <MapPin size={16} />
                      City *
                    </label>
                    <input
                      id="edit-org-city"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="edit-org-field">
                    <label htmlFor="edit-org-description">
                      <AlignLeft size={16} />
                      Description
                    </label>
                    <textarea
                      id="edit-org-description"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      rows={5}
                    />
                  </div>

                  <div className="edit-org-field">
                    <label htmlFor="edit-org-website">
                      <Globe size={16} />
                      Website
                    </label>
                    <input
                      id="edit-org-website"
                      name="website"
                      type="url"
                      placeholder="https://example.org"
                      value={form.website}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="edit-org-actions">
                    <Link to={`/organizations/${id}`}>Cancel</Link>

                    <button
                      type="submit"
                      disabled={saving || deleting}
                      className="edit-org-save"
                    >
                      <Save size={17} />
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="edit-org-danger">
                <div>
                  <h2>Delete organization</h2>
                  <p>
                    Permanently delete this organization. This action cannot be
                    undone.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="edit-org-delete"
                >
                  <Trash2 size={17} />
                  {deleting ? "Deleting..." : "Delete organization"}
                </button>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
