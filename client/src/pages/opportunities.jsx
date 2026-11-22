import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  HandHeart,
  MapPin,
  Search,
  Users,
} from "lucide-react";

import Navbar from "../components/navbar";
import { getPublicOpportunities } from "../services/api";
import "../styles/opportunities.css";

const PAGE_SIZE = 9;

function formatDate(value) {
  if (!value) return "Date not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date not specified";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [upcoming, setUpcoming] = useState(false);
  const [sort, setSort] = useState("start_asc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getPublicOpportunities({
          search: search.trim(),
          city: city.trim(),
          upcoming: upcoming ? "true" : "false",
          sort,
          page,
          limit: PAGE_SIZE,
        });

        if (active) {
          setOpportunities(
            Array.isArray(data.opportunities) ? data.opportunities : [],
          );
          setTotal(Number(data.total) || 0);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load opportunities");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, city, upcoming, sort, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function updateCity(value) {
    setCity(value);
    setPage(1);
  }

  return (
    <>
      <Navbar />

      <main className="opps-page">
        <section className="opps-hero">
          <div className="opps-container">
            <span className="opps-eyebrow">VOLUNTEER WITH PURPOSE</span>

            <h1>
              Find your next <span>good deed.</span>
            </h1>

            <p>
              Discover published volunteer opportunities from organizations in
              your community. Choose a cause, show up, and make a difference.
            </p>
          </div>
        </section>

        <section className="opps-list-section">
          <div className="opps-container">
            <div className="opps-filters">
              <div className="opps-search">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Search opportunities..."
                  value={search}
                  onChange={(event) => updateSearch(event.target.value)}
                />
              </div>

              <div className="opps-search">
                <MapPin size={18} />
                <input
                  type="search"
                  placeholder="Filter by city..."
                  value={city}
                  onChange={(event) => updateCity(event.target.value)}
                />
              </div>

              <label className="opps-checkbox">
                <input
                  type="checkbox"
                  checked={upcoming}
                  onChange={(event) => {
                    setUpcoming(event.target.checked);
                    setPage(1);
                  }}
                />
                Upcoming only
              </label>

              <select
                className="opps-sort"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
              >
                <option value="start_asc">Starting soonest</option>
                <option value="start_desc">Starting latest</option>
              </select>
            </div>

            <div className="opps-results-heading">
              <div>
                <span className="opps-eyebrow">EXPLORE OPPORTUNITIES</span>
                <h2>Volunteer opportunities</h2>
              </div>

              {!loading && !error && (
                <p>
                  {total} {total === 1 ? "opportunity" : "opportunities"}
                </p>
              )}
            </div>

            {loading && (
              <p className="opps-status">Loading opportunities...</p>
            )}

            {!loading && error && (
              <div className="opps-error" role="alert">
                {error}
              </div>
            )}

            {!loading && !error && opportunities.length === 0 && (
              <div className="opps-empty">
                <HandHeart size={35} />
                <h3>No opportunities found</h3>
                <p>
                  {search || city || upcoming
                    ? "Try adjusting your search or filters."
                    : "Published opportunities will appear here once organizations add them."}
                </p>
              </div>
            )}

            {!loading && !error && opportunities.length > 0 && (
              <div className="opps-grid">
                {opportunities.map((opportunity) => {
                  const accepted = Number(opportunity.accepted_count) || 0;
                  const remaining =
                    opportunity.capacity === null
                      ? null
                      : Math.max(opportunity.capacity - accepted, 0);

                  return (
                    <article className="opps-card" key={opportunity.id}>
                      <div className="opps-card-icon">
                        <HandHeart size={24} />
                      </div>

                      <div className="opps-card-content">
                        <span className="opps-card-org">
                          <Building2 size={14} />
                          {opportunity.organization_name}
                        </span>

                        <h3>{opportunity.title}</h3>

                        <p className="opps-card-description">
                          {opportunity.description}
                        </p>

                        <div className="opps-card-meta">
                          <span>
                            <MapPin size={14} />
                            {opportunity.city || "Location not specified"}
                          </span>

                          <span>
                            <CalendarDays size={14} />
                            {formatDate(opportunity.starts_at)}
                          </span>

                          <span>
                            <Users size={14} />
                            {opportunity.capacity === null
                              ? "Capacity not specified"
                              : `${remaining} of ${opportunity.capacity} spots left`}
                          </span>
                        </div>

                        <Link
                          to={`/opportunities/${opportunity.id}`}
                          className="opps-card-link"
                        >
                          View opportunity
                          <ArrowRight size={17} />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {!loading && !error && totalPages > 1 && (
              <div className="opps-pagination">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(current + 1, totalPages))
                  }
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
