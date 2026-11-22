import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  HeartHandshake,
  ChevronDown,
  Menu,
  X,
  UserRound,
  LayoutDashboard,
  LogOut,
  Building2,
  HandHeart,
  Gift,
  Heart,
  Users,
  Package,
  ClipboardList,
} from "lucide-react";

import { useAuth } from "../context/authContext";
import "../styles/navbar.css";

const exploreLinks = [
  { label: "Volunteer Opportunities", path: "/opportunities", icon: HandHeart },
  { label: "Free Items", path: "/items", icon: Gift },
  { label: "Help Requests", path: "/help-requests", icon: Heart },
  { label: "Community Projects", path: "/projects", icon: Users },
  { label: "Material Campaigns", path: "/campaigns", icon: Package },
];

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function closeMenus() {
    setMobileOpen(false);
    setExploreOpen(false);
    setProfileOpen(false);
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logout();
      closeMenus();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      closeMenus();
      navigate("/", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="gd-navbar">
      <div className="gd-nav-inner">
        <Link to="/" className="gd-logo" onClick={closeMenus}>
          <span className="gd-logo-icon">
            <HeartHandshake size={21} />
          </span>
          <span>GoodDeed</span>
        </Link>

        <nav
          className={`gd-nav-links ${mobileOpen ? "gd-nav-open" : ""}`}
          aria-label="Main navigation"
        >
          {isAuthenticated && (
            <NavLink
              to="/dashboard"
              onClick={closeMenus}
              className="gd-nav-link"
            >
              Home
            </NavLink>
          )}

          <div className="gd-dropdown">
            <button
              type="button"
              className="gd-nav-link gd-dropdown-trigger"
              onClick={() => {
                setExploreOpen(!exploreOpen);
                setProfileOpen(false);
              }}
              aria-expanded={exploreOpen}
            >
              Explore <ChevronDown size={15} />
            </button>

            {exploreOpen && (
              <div className="gd-dropdown-menu gd-explore-menu">
                {exploreLinks.map(({ label, path, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className="gd-dropdown-item"
                    onClick={closeMenus}
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                    {path !== "/opportunities" && (
                      <span className="gd-soon">Soon</span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <NavLink
            to="/organizations"
            onClick={closeMenus}
            className="gd-nav-link"
          >
            Organizations
          </NavLink>

          {isAuthenticated ? (
            <NavLink
              to="/my-activities"
              onClick={closeMenus}
              className="gd-nav-link"
            >
              My Activities
            </NavLink>
          ) : (
            <Link
              to="/#how-it-works"
              onClick={closeMenus}
              className="gd-nav-link"
            >
              How it works
            </Link>
          )}
        </nav>

        <div className="gd-nav-actions">
          {isAuthenticated ? (
            <div className="gd-dropdown gd-profile-dropdown">
              <button
                type="button"
                className="gd-avatar"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setExploreOpen(false);
                }}
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
              >
                {user?.name?.trim()?.charAt(0)?.toUpperCase() || (
                  <UserRound size={19} />
                )}
              </button>

              {profileOpen && (
                <div className="gd-dropdown-menu gd-profile-menu">
                  <div className="gd-profile-info">
                    <strong>{user?.name || "GoodDeed Member"}</strong>
                    <small>{user?.email || ""}</small>
                  </div>

                  <Link
                    to="/dashboard"
                    className="gd-dropdown-item"
                    onClick={closeMenus}
                  >
                    <LayoutDashboard size={17} />
                    Dashboard
                  </Link>

                  <Link
                    to="/profile"
                    className="gd-dropdown-item"
                    onClick={closeMenus}
                  >
                    <UserRound size={17} />
                    My Profile
                  </Link>

                  <Link
                    to="/my-organizations"
                    className="gd-dropdown-item"
                    onClick={closeMenus}
                  >
                    <Building2 size={17} />
                    My Organizations
                  </Link>

                  <button
                    type="button"
                    className="gd-dropdown-item gd-logout"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    <LogOut size={17} />
                    {loggingOut ? "Logging out..." : "Log out"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="gd-login">
                Log in
              </Link>
              <Link to="/register" className="gd-join">
                Join GoodDeed
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="gd-mobile-toggle"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => {
            setMobileOpen(!mobileOpen);
            setExploreOpen(false);
          }}
        >
          {mobileOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
    </header>
  );
}
