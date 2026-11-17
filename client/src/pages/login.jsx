import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HeartHandshake, ArrowRight, Eye, EyeOff } from "lucide-react";
import { loginUser } from "../services/authService";
import { useAuth } from "../context/authContext";
import "../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.email.trim()) {
      return setError("Please enter your email address.");
    }

    if (!form.password) {
      return setError("Please enter your password.");
    }

    setLoading(true);

    try {
      await login(form.email.trim().toLowerCase(), form.password);

      navigate(location.state?.from || "/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Link to="/" className="auth-brand">
        <span className="auth-brand-icon">
          <HeartHandshake size={21} />
        </span>
        GoodDeed
      </Link>

      <section className="auth-card">
        <span className="auth-eyebrow">WELCOME BACK</span>
        <h1>Good to see you again.</h1>
        <p className="auth-subtitle">Log in to continue making a difference.</p>

        {location.state?.message && (
          <div className="auth-success" role="status">
            {location.state.message}
          </div>
        )}

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Logging in..." : "Log in"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="auth-switch">
          New to GoodDeed? <Link to="/register">Create an account</Link>
        </p>
      </section>

      <p className="auth-footer">
        © {new Date().getFullYear()} GoodDeed. Small actions, real impact.
      </p>
    </main>
  );
}
