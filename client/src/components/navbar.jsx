import { HeartHandshake, Menu, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/authContext";

export default function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <nav className="navbar page-container">
        <a className="brand" href="/">
          <span className="brand-icon">
            <HeartHandshake size={19} strokeWidth={2.3} />
          </span>
          <span>GoodDeed</span>
        </a>

        <button
          className="mobile-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={`nav-content ${menuOpen ? "nav-open" : ""}`}>
          <div className="nav-links">
            <a href="/explore">Discover</a>
            <a href="/#how-it-works">How it works</a>
            <a href="/organizations">For organizations</a>
          </div>

          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                <span className="nav-username">
                  Hi, {user?.name?.split(" ")[0]}
                </span>

                <a href="/dashboard" className="btn btn-primary nav-join">
                  Dashboard
                </a>
              </>
            ) : (
              <>
                <a href="/login" className="login-link">
                  Log in
                </a>

                <a href="/register" className="btn btn-primary nav-join">
                  Join GoodDeed
                </a>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
