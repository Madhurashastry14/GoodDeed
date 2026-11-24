import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Gift,
  MapPin,
  Plus,
  Search,
  Tag,
  UserRound,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { getItems } from "../services/api";
import {
  ITEM_CATEGORIES,
  categoryLabel,
  conditionLabel,
} from "../constants/items";
import "../styles/items.css";

export default function Items() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const data = await getItems({
          search: search.trim(),
          city: city.trim(),
          category,
        });

        if (active) {
          setItems(Array.isArray(data.items) ? data.items : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load items");
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
  }, [search, city, category]);

  return (
    <>
      <Navbar />

      <main className="items-page">
        <section className="items-hero">
          <div className="items-container items-hero-inner">
            <div>
              <span className="items-eyebrow">SHARE MORE, WASTE LESS</span>

              <h1>
                Free items, <span>shared with care.</span>
              </h1>

              <p>
                Browse useful things offered by people in your community. Found
                something you need? Send the donor a request.
              </p>
            </div>

            <Link
              to={isAuthenticated ? "/items/new" : "/login"}
              className="items-list-btn"
            >
              <Plus size={17} />
              List an item
            </Link>
          </div>
        </section>

        <section className="items-list-section">
          <div className="items-container">
            <div className="items-filters">
              <div className="items-search">
                <Search size={18} />
                <input
                  type="search"
                  aria-label="Search items"
                  placeholder="Search items..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="items-search">
                <MapPin size={18} />
                <input
                  type="search"
                  aria-label="Filter by city"
                  placeholder="City"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </div>

              <select
                className="items-select"
                aria-label="Filter by category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="">All categories</option>
                {ITEM_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="items-results-heading">
              <h2>Available items</h2>
              <p>
                {loading
                  ? "Loading..."
                  : `${items.length} item${items.length === 1 ? "" : "s"}`}
              </p>
            </div>

            {error && (
              <p className="items-error" role="alert">
                {error}
              </p>
            )}

            {!loading && !error && items.length === 0 && (
              <div className="items-empty">
                <Gift size={38} />
                <h3>No items found</h3>
                <p>
                  Try a different search, or be the first to offer something
                  useful to your community.
                </p>

                <Link to={isAuthenticated ? "/items/new" : "/login"}>
                  List an item
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}

            {items.length > 0 && (
              <div className="items-grid">
                {items.map((item) => (
                  <article className="items-card" key={item.id}>
                    <Link
                      to={`/items/${item.id}`}
                      className="items-card-image"
                      aria-label={`View ${item.title}`}
                    >
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.title} />
                      ) : (
                        <span className="items-card-placeholder">
                          <Gift size={30} />
                          No photo
                        </span>
                      )}

                      <span
                        className={`items-status status-${item.status}`}
                      >
                        {item.status}
                      </span>
                    </Link>

                    <div className="items-card-body">
                      <div className="items-card-tags">
                        <span>
                          <Tag size={12} />
                          {categoryLabel(item.category)}
                        </span>
                        <span>{conditionLabel(item.condition)}</span>
                      </div>

                      <h3>
                        <Link to={`/items/${item.id}`}>{item.title}</Link>
                      </h3>

                      <p className="items-card-description">
                        {item.description}
                      </p>

                      <div className="items-card-meta">
                        <span>
                          <MapPin size={13} />
                          {item.city}
                        </span>
                        <span>
                          <UserRound size={13} />
                          {item.donor_name}
                        </span>
                      </div>

                      <Link
                        to={`/items/${item.id}`}
                        className="items-card-link"
                      >
                        View item
                        <ArrowRight size={15} />
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
