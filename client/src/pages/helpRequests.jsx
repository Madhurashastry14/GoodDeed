import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  HeartHandshake,
  MapPin,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Tag,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { getItemRequests } from "../services/api";
import {
  REQUEST_CATEGORIES,
  REQUEST_URGENCIES,
  categoryLabel,
  urgencyLabel,
} from "../constants/itemRequests";
import "../styles/itemRequests.css";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

function formatDate(value) {
  if (!value) return "";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function HelpRequests() {
  const { isAuthenticated } = useAuth();

  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getItemRequests({
          search: search.trim(),
          city: city.trim(),
          category,
          urgency,
          sort,
          page,
          limit: 9,
        });

        if (active) {
          setRequests(Array.isArray(data.requests) ? data.requests : []);
          setPagination(data.pagination ?? null);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load item requests");
          setRequests([]);
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
  }, [search, city, category, urgency, sort, page]);

  return (
    <>
      <Navbar />

      <main className="ir-page">
        <section className="ir-hero">
          <div className="ir-container ir-hero-inner">
            <div>
              <span className="ir-eyebrow">VERIFIED COMMUNITY REQUESTS</span>

              <h1>
                Essential items, <span>requested with dignity.</span>
              </h1>

              <p>
                Every request below was reviewed by a GoodDeed reviewer before
                it appeared here. Offer to fulfill one directly, and coordinate
                a safe handover with the requester.
              </p>
            </div>

            <Link
              to={isAuthenticated ? "/help-requests/new" : "/login"}
              className="ir-primary-btn"
            >
              <Plus size={17} />
              Create request
            </Link>
          </div>
        </section>

        <section className="ir-list-section">
          <div className="ir-container">
            <div className="ir-filters">
              <div className="ir-input">
                <Search size={18} />
                <input
                  type="search"
                  aria-label="Search item requests"
                  placeholder="Search requests..."
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                />
              </div>

              <div className="ir-input">
                <MapPin size={18} />
                <input
                  type="search"
                  aria-label="Filter by city"
                  placeholder="City"
                  value={city}
                  onChange={(event) => { setCity(event.target.value); setPage(1); }}
                />
              </div>

              <select
                className="ir-select"
                aria-label="Filter by category"
                value={category}
                onChange={(event) => { setCategory(event.target.value); setPage(1); }}
              >
                <option value="">All categories</option>
                {REQUEST_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="ir-select"
                aria-label="Filter by urgency"
                value={urgency}
                onChange={(event) => { setUrgency(event.target.value); setPage(1); }}
              >
                <option value="">Any urgency</option>
                {REQUEST_URGENCIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                className="ir-select"
                aria-label="Sort requests"
                value={sort}
                onChange={(event) => { setSort(event.target.value); setPage(1); }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ir-results-heading">
              <h2>Verified requests</h2>
              <p>
                {loading
                  ? "Loading..."
                  : `${pagination?.total ?? requests.length} request${
                      (pagination?.total ?? requests.length) === 1 ? "" : "s"
                    }`}
              </p>
            </div>

            {error && (
              <p className="ir-error" role="alert">
                {error}
              </p>
            )}

            {!loading && !error && requests.length === 0 && (
              <div className="ir-empty">
                <HeartHandshake size={38} />
                <h3>No verified requests found</h3>
                <p>
                  Try a different search or filter. New requests appear here
                  once a reviewer approves them.
                </p>

                <Link to={isAuthenticated ? "/help-requests/new" : "/login"}>
                  Create a request
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}

            {requests.length > 0 && (
              <div className="ir-grid">
                {requests.map((request) => (
                  <article className="ir-card" key={request.id}>
                    <div className="ir-card-top">
                      <span className="ir-verified">
                        <ShieldCheck size={14} />
                        Verified
                      </span>
                      <span className={`ir-urgency urgency-${request.urgency}`}>
                        {urgencyLabel(request.urgency)} urgency
                      </span>
                    </div>

                    <h3>
                      <Link to={`/help-requests/${request.id}`}>
                        {request.title}
                      </Link>
                    </h3>

                    <p className="ir-card-description">{request.description}</p>

                    <div className="ir-card-tags">
                      <span>
                        <Tag size={12} />
                        {categoryLabel(request.category)}
                      </span>
                      <span>
                        <Package size={12} />
                        Qty {request.quantity}
                      </span>
                    </div>

                    <div className="ir-card-meta">
                      <span>
                        <MapPin size={13} />
                        {request.city}
                      </span>
                      <span>
                        <CalendarDays size={13} />
                        {formatDate(request.created_at)}
                      </span>
                    </div>

                    <Link
                      to={`/help-requests/${request.id}`}
                      className="ir-card-link"
                    >
                      View details
                      <ArrowRight size={15} />
                    </Link>
                  </article>
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <nav className="ir-pagination" aria-label="Request pages">
                <button
                  type="button"
                  disabled={loading || page <= 1}
                  onClick={() => setPage((value) => Math.max(value - 1, 1))}
                >
                  Previous
                </button>

                <span>
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={loading || page >= pagination.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
