import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Search,
  ArrowRight,
  Plus,
  Users,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { getMyOrganizations } from "../services/authService";
import "../styles/myOrganizations.css";

export default function MyOrganizations() {
  const { accessToken, loading: authLoading } = useAuth();

  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!accessToken) {
      setLoading(false);
      setError("Your session has expired. Please log in again.");
      return;
    }

    let active = true;

    async function loadOrganizations() {
      setLoading(true);
      setError("");

      try {
        const data = await getMyOrganizations(accessToken);

        // Supports the existing API's singular organization key.
        const results = Array.isArray(data)
          ? data
          : (data.organization ?? data.organizations);

        if (!Array.isArray(results)) {
          console.error("Unexpected response:", data);
          throw new Error("Unexpected API response");
        }

        if (active) {
          setOrganizations(results);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load organizations");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      active = false;
    };
  }, [accessToken, authLoading]);

  const filtered = organizations.filter((org) => {
    const query = search.trim().toLowerCase();

    return (
      org.name?.toLowerCase().includes(query) ||
      org.city?.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Navbar />

      <main className="my-org-page">
        <div className="my-org-container">
          <div className="my-org-top">
            <div>
              <span className="my-org-eyebrow">YOUR COMMUNITY</span>

              <h1>My Organizations</h1>

              <p>
                Manage your organizations and stay connected with the
                communities you're part of.
              </p>
            </div>

            <Link to="/organizations/new" className="my-org-create">
              <Plus size={18} />
              Create organization
            </Link>
          </div>

          <div className="my-org-toolbar">
            <div className="my-org-toolbar-title">
              <Building2 size={20} />
              <h2>Your organizations</h2>
              {!loading && !error && (
                <span className="my-org-count">{organizations.length}</span>
              )}
            </div>

            <div className="my-org-search">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search your organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading && (
            <div className="my-org-state">Loading your organizations...</div>
          )}

          {!loading && error && (
            <div className="my-org-error" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="my-org-empty">
              <div className="my-org-empty-icon">
                <Users size={30} />
              </div>

              <h3>
                {search
                  ? "No matching organizations"
                  : "You're not part of any organizations yet"}
              </h3>

              <p>
                {search
                  ? "Try searching with a different name or city."
                  : "Create an organization to bring people together and start making an impact."}
              </p>

              {!search && (
                <Link to="/organizations/new" className="my-org-empty-btn">
                  <Plus size={17} />
                  Create your first organization
                </Link>
              )}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="my-org-grid">
              {filtered.map((org) => (
                <article className="my-org-card" key={org.id}>
                  <div className="my-org-card-top">
                    <div className="my-org-card-icon">
                      <Building2 size={24} />
                    </div>

                    {org.role && (
                      <span className="my-org-role">{org.role}</span>
                    )}
                  </div>

                  <h3>{org.name}</h3>

                  <p className="my-org-description">
                    {org.description || "A community organization on GoodDeed."}
                  </p>

                  <div className="my-org-location">
                    <MapPin size={15} />
                    <span>{org.city}</span>
                  </div>

                  <Link
                    to={`/organizations/${org.id}`}
                    className="my-org-card-link"
                  >
                    View organization
                    <ArrowRight size={17} />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
