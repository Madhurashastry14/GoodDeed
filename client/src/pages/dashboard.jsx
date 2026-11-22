import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  HandHeart,
  Gift,
  HeartHandshake,
  Users,
  Package,
  UserRound,
  MapPin,
  Sparkles,
  ClipboardList,
  Plus,
} from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import "../styles/dashboard.css";
import { getMyOrganizations } from "../services/api";

const actions = [
  {
    title: "Find volunteer opportunities",
    description: "Give your time to causes that matter to you.",
    icon: HandHeart,
    path: "/opportunities",
    color: "green",
    comingSoon: true,
  },
  {
    title: "Share free items",
    description: "Give useful things a second life.",
    icon: Gift,
    path: "/items",
    color: "orange",
    comingSoon: true,
  },
  {
    title: "Help someone",
    description: "Support people in your community.",
    icon: HeartHandshake,
    path: "/help-requests",
    color: "pink",
    comingSoon: true,
  },
  {
    title: "Explore organizations",
    description: "Connect with people making a difference.",
    icon: Building2,
    path: "/organizations",
    color: "blue",
    comingSoon: false,
  },
];

export default function Dashboard() {
  const { user, accessToken, loading: authLoading } = useAuth();

  const firstName = user?.name?.trim()?.split(" ")[0] || "there";

  const [organizations, setOrganizations] = useState([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationsError, setOrganizationsError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!accessToken) {
      setOrganizationsLoading(false);
      setOrganizationsError("Please log in to view your organizations.");
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
  }, [accessToken, authLoading]);

  return (
    <>
      <Navbar />

      <main className="dashboard-page">
        <div className="dashboard-container">
          <section className="dashboard-welcome">
            <div className="dashboard-welcome-content">
              <span className="dashboard-eyebrow">
                <Sparkles size={15} />
                YOUR COMMUNITY STARTS HERE
              </span>

              <h1>
                Hello, {firstName}! <span>Ready to do some good?</span>
              </h1>

              <p>
                Every small action can make a difference. Discover meaningful
                ways to connect, contribute, and support your community.
              </p>

              <div className="dashboard-welcome-actions">
                <Link to="/organizations" className="dashboard-primary-btn">
                  Explore organizations
                  <ArrowRight size={18} />
                </Link>

                {organizations.some((org) =>
                  ["owner", "admin"].includes(org.role?.toLowerCase()),
                ) && (
                  <Link
                    to="/opportunities/new"
                    className="dashboard-create-opp"
                  >
                    <Plus size={18} />
                    Create Opportunity
                  </Link>
                )}
              </div>
            </div>

            <div className="dashboard-welcome-visual">
              <div className="dashboard-visual-circle">
                <HeartHandshake size={85} strokeWidth={1.3} />
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <div>
                <span className="dashboard-section-label">
                  MAKE A DIFFERENCE
                </span>
                <h2>What would you like to do today?</h2>
                <p>Find your own way to make a positive impact.</p>
              </div>
            </div>

            <div className="dashboard-actions-grid">
              {actions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    to={action.path}
                    className="dashboard-action-card"
                    key={action.path}
                  >
                    <div className={`dashboard-action-icon ${action.color}`}>
                      <Icon size={25} />
                    </div>

                    {action.comingSoon && (
                      <span className="dashboard-coming-soon">Coming soon</span>
                    )}

                    <h3>{action.title}</h3>
                    <p>{action.description}</p>

                    <span className="dashboard-card-link">
                      {action.comingSoon ? "Learn more" : "Explore now"}
                      <ArrowRight size={16} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="dashboard-bottom-grid">
            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-section-label">YOUR JOURNEY</span>
                  <h2>My activities</h2>
                </div>

                <ClipboardList size={22} />
              </div>

              <div className="dashboard-empty">
                <div className="dashboard-empty-icon">
                  <ClipboardList size={29} />
                </div>

                <h3>Your journey is just beginning</h3>

                <p>
                  Your volunteering applications, item sharing, and community
                  activities will appear here when these features become
                  available.
                </p>

                <Link to="/my-activities">
                  View activities <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="dashboard-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-section-label">GET CONNECTED</span>
                  <h2>My organizations</h2>
                </div>

                <Building2 size={22} />
              </div>

              {organizationsLoading ? (
                <div className="dashboard-empty">
                  <p>Loading your organizations...</p>
                </div>
              ) : organizationsError ? (
                <div className="dashboard-empty">
                  <p role="alert">{organizationsError}</p>
                </div>
              ) : organizations.length === 0 ? (
                <div className="dashboard-empty">
                  <div className="dashboard-empty-icon">
                    <Users size={29} />
                  </div>

                  <h3>Find your people</h3>

                  <p>
                    You're not part of any organizations yet. Explore
                    communities or create your own.
                  </p>

                  <Link to="/organizations">
                    Explore organizations <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <div className="dashboard-org-content">
                  <div className="dashboard-org-summary">
                    <p>
                      You're connected with{" "}
                      <strong>{organizations.length}</strong>{" "}
                      {organizations.length === 1
                        ? "organization"
                        : "organizations"}
                      .
                    </p>
                  </div>

                  <div className="dashboard-org-list">
                    {organizations.slice(0, 3).map((org) => (
                      <Link
                        to={`/organizations/${org.id}`}
                        key={org.id}
                        className="dashboard-org-item"
                      >
                        <div className="dashboard-org-avatar">
                          {org.name?.charAt(0).toUpperCase() || "O"}
                        </div>

                        <div className="dashboard-org-info">
                          <strong>{org.name}</strong>
                          <span>{org.city}</span>
                        </div>

                        {org.role && (
                          <span className="dashboard-org-role">{org.role}</span>
                        )}

                        <ArrowRight size={16} />
                      </Link>
                    ))}
                  </div>

                  <Link
                    to="/my-organizations"
                    className="dashboard-org-view-all"
                  >
                    View all organizations
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-profile-banner">
            <div className="dashboard-profile-icon">
              <UserRound size={25} />
            </div>

            <div>
              <h3>Make your GoodDeed profile yours.</h3>
              <p>Add your city, interests, and a little about yourself.</p>
            </div>

            <Link to="/profile">
              My profile <ArrowRight size={17} />
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
