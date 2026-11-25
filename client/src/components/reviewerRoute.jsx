import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import Navbar from "./navbar";
import { useAuth } from "../context/authContext";
import { getReviewerAccess } from "../services/api";
import "../styles/itemRequests.css";

/**
 * Complements backend authorization. The server still checks reviewer rights
 * on every review endpoint; this guard only avoids showing a dead page.
 */
export default function ReviewerRoute({ children }) {
  const { isAuthenticated, accessToken, loading } = useAuth();
  const location = useLocation();
  const [state, setState] = useState("checking");

  useEffect(() => {
    if (loading || !isAuthenticated || !accessToken) return;

    let cancelled = false;

    (async () => {
      try {
        const data = await getReviewerAccess(accessToken);

        if (!cancelled) {
          setState(data.is_reviewer ? "allowed" : "denied");
        }
      } catch {
        if (!cancelled) {
          setState("denied");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, accessToken]);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
        <p>Loading GoodDeed...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (state === "checking") {
    return (
      <>
        <Navbar />
        <main className="ir-page">
          <div className="ir-detail-container">
            <p className="ir-form-status">Checking reviewer access...</p>
          </div>
        </main>
      </>
    );
  }

  if (state === "denied") {
    return (
      <>
        <Navbar />
        <main className="ir-page">
          <div className="ir-detail-container">
            <div className="ir-empty">
              <ShieldAlert size={38} />
              <h3>Reviewer access required</h3>
              <p>
                This area is limited to authorized GoodDeed platform reviewers.
                Organization ownership does not grant reviewer access.
              </p>
              <Link to="/help-requests">Browse help requests</Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return children;
}
