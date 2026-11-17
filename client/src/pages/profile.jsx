import { useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  FileText,
  Pencil,
  Save,
  X,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { getMyProfile, updateMyProfile } from "../services/authService";

import "../styles/profile.css";

const emptyProfile = {
  name: "",
  email: "",
  phone: "",
  city: "",
  bio: "",
};

export default function Profile() {
  const { accessToken } = useAuth();

  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationsError, setOrganizationsError] = useState("");

  useEffect(() => {
    if (!accessToken) {
      setOrganizationsLoading(false);
      return;
    }

    let active = true;

    async function loadOrganizations() {
      setOrganizationsLoading(true);
      setOrganizationsError("");

      try {
        const data = await getMyOrganizations(accessToken);

        const results = Array.isArray(data)
          ? data
          : (data.organization ?? data.organizations);

        if (!Array.isArray(results)) {
          throw new Error("Unexpected organizations response");
        }

        if (active) {
          setOrganizations(results);
        }
      } catch (err) {
        if (active) {
          setOrganizationsError(err.message);
        }
      } finally {
        if (active) {
          setOrganizationsLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      active = false;
    };
  }, [accessToken]);

  const [profile, setProfile] = useState(emptyProfile);
  const [form, setForm] = useState(emptyProfile);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!accessToken) return;

    let active = true;

    async function loadProfile() {
      try {
        const data = await getMyProfile(accessToken);
        const raw = Array.isArray(data.profile)
          ? data.profile[0]
          : (data.profile ?? data.user ?? data);
        const normalized = {
          name: raw.name ?? raw.full_name ?? "",
          email: raw.email ?? "",
          phone: raw.phone ?? "",
          city: raw.city ?? "",
          bio: raw.bio ?? "",
        };

        if (active) {
          setProfile(normalized);
          setForm(normalized);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [accessToken]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function cancelEditing() {
    setForm(profile);
    setEditing(false);
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Name cannot be empty.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        bio: form.bio.trim() || null,
      };

      await updateMyProfile(payload, accessToken);

      setProfile({
        ...form,
        ...payload,
        phone: payload.phone ?? "",
        city: payload.city ?? "",
        bio: payload.bio ?? "",
      });

      setEditing(false);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  const initials = profile.name
    ? profile.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <>
      <Navbar />

      <main className="profile-page">
        <div className="profile-container">
          <div className="profile-heading">
            <span className="profile-eyebrow">YOUR ACCOUNT</span>

            <h1>My Profile</h1>

            <p>
              Keep your information up to date and manage how you appear on
              GoodDeed.
            </p>
          </div>

          {loading ? (
            <div className="profile-state">Loading your profile...</div>
          ) : (
            <div className="profile-layout">
              <aside className="profile-sidebar">
                <div className="profile-avatar">{initials}</div>

                <h2>{profile.name || "GoodDeed Member"}</h2>

                <p>{profile.email}</p>
              </aside>

              <section className="profile-card">
                <div className="profile-card-header">
                  <div>
                    <h2>Personal Information</h2>
                    <p>Your basic account and contact details.</p>
                  </div>

                  {!editing && (
                    <button
                      type="button"
                      className="profile-edit-btn"
                      onClick={() => {
                        setEditing(true);
                        setSuccess("");
                      }}
                    >
                      <Pencil size={16} />
                      Edit profile
                    </button>
                  )}
                </div>

                {error && (
                  <div className="profile-error" role="alert">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="profile-success" role="status">
                    <CheckCircle2 size={17} />
                    {success}
                  </div>
                )}

                <form onSubmit={handleSave}>
                  <div className="profile-fields">
                    <ProfileField
                      label="Full name"
                      icon={<UserRound size={17} />}
                      name="name"
                      value={editing ? form.name : profile.name}
                      editing={editing}
                      onChange={handleChange}
                      required
                    />

                    <ProfileField
                      label="Email address"
                      icon={<Mail size={17} />}
                      name="email"
                      value={profile.email}
                      editing={false}
                    />

                    <ProfileField
                      label="Phone number"
                      icon={<Phone size={17} />}
                      name="phone"
                      value={editing ? form.phone : profile.phone}
                      editing={editing}
                      onChange={handleChange}
                    />

                    <ProfileField
                      label="City"
                      icon={<MapPin size={17} />}
                      name="city"
                      value={editing ? form.city : profile.city}
                      editing={editing}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="profile-bio-field">
                    <label>
                      <FileText size={17} />
                      About me
                    </label>

                    {editing ? (
                      <textarea
                        name="bio"
                        value={form.bio}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Tell your community a little about yourself..."
                      />
                    ) : (
                      <p>{profile.bio || "You haven't added a bio yet."}</p>
                    )}
                  </div>

                  {editing && (
                    <div className="profile-actions">
                      <button
                        type="button"
                        className="profile-cancel-btn"
                        onClick={cancelEditing}
                        disabled={saving}
                      >
                        <X size={17} />
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="profile-save-btn"
                        disabled={saving}
                      >
                        <Save size={17} />
                        {saving ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  )}
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ProfileField({
  label,
  icon,
  name,
  value,
  editing,
  onChange,
  required = false,
}) {
  return (
    <div className="profile-field">
      <label htmlFor={`profile-${name}`}>
        {icon}
        {label}
      </label>

      {editing ? (
        <input
          id={`profile-${name}`}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
        />
      ) : (
        <div className="profile-field-value">{value || "Not provided"}</div>
      )}
    </div>
  );
}
