import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, MapPin, Search, ArrowRight, Plus } from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { getOrganizations } from "../services/api";
import "../styles/organizations.css";

export default function Organizations() {
  const { isAuthenticated } = useAuth();

  const [organizations, setOrganizations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrganizations() {
      try {
        const data = await getOrganizations();

        const results = data.organization;
        if (!Array.isArray(results)) {
          throw new Error("Unexpected API response");
        }

        if (active) setOrganizations(results);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrganizations();

    return () => {
      active = false;
    };
  }, []);

  const filtered = organizations.filter((org) => {
    const query = search.toLowerCase();

    return (
      org.name?.toLowerCase().includes(query) ||
      org.city?.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Navbar />

      <main className="org-page">
        <section className="org-hero">
          <div className="org-container">
            <span className="org-eyebrow">PEOPLE MAKING A DIFFERENCE</span>

            <h1>
              Find your <span>community.</span>
            </h1>

            <p>
              Discover organizations doing meaningful work. Connect with people
              who share your values and make a positive impact together.
            </p>

            {isAuthenticated && (
              <Link to="/organizations/new" className="org-create-btn">
                <Plus size={18} />
                Create an organization
              </Link>
            )}
          </div>
        </section>

        <section className="org-list-section">
          <div className="org-container">
            <div className="org-section-heading">
              <div>
                <span className="org-eyebrow">EXPLORE ORGANIZATIONS</span>
                <h2>Organizations on GoodDeed</h2>
              </div>

              <div className="org-search">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Search by name or city..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loading && <p className="org-status">Loading organizations...</p>}

            {error && (
              <div className="org-error" role="alert">
                {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="org-empty">
                <Building2 size={35} />
                <h3>
                  {search
                    ? "No matching organizations"
                    : "No organizations yet"}
                </h3>
                <p>
                  {search
                    ? "Try a different name or city."
                    : "Organizations will appear here once created."}
                </p>
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <div className="org-grid">
                {filtered.map((org) => (
                  <article className="org-card" key={org.id}>
                    <div className="org-card-icon">
                      <Building2 size={26} />
                    </div>

                    <div className="org-card-content">
                      <h3>{org.name}</h3>

                      <p className="org-card-description">
                        {org.description || "Community organization"}
                      </p>

                      <div className="org-card-meta">
                        <MapPin size={15} />
                        {org.city}
                      </div>

                      <Link
                        to={`/organizations/${org.id}`}
                        className="org-card-link"
                      >
                        View organization
                        <ArrowRight size={17} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
